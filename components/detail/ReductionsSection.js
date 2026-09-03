// components/detail/ReductionsSection.js
//
// T16e (#25) — the most complex-looking panel in the mockup, and deliberately
// the most scoped-down. Reduces-to/reduces-from lists and cost badges are
// real declared data (data/fixtures.js's `reductions` shape aligns well with
// the backend); the source/target instance diagrams were static placeholders
// until T53.
//
// T53 (#116): the source/target canvas is real now, via
// `POST /ProblemProvider/visualizeReduction` (`requestReducedInstance`,
// lib/redux/index.js) — reusing the same VisualizationCanvas/renderer dispatch
// T48-T50 built for the Visualizations section, per
// ai_documentation/INTERACTIVE_LAYER_DESIGN.md §2.5's source/target asymmetry:
//
// - The scrubber's two frames (T47/#110) are not "step 1 of a process" the way
//   Visualizations' are -- `visualizeReduction` always returns exactly 2 frames, and per
//   §1.3 they're two DIFFERENT problems' shapes, not a before/after of one: frame 0 is the
//   source instance's own base rendering (this problem's own first declared visualization,
//   the same one Visualizations would use), frame 1 is the reduced instance's rendering (the
//   target problem's own first declared visualization, resolved server-side by
//   `hooks/useProblemDetail.js`'s `buildReductions` and carried as `targetVisualization` on
//   each `to` entry -- `Navigation/Reductions` itself names no visualization for either
//   side, and VISUALIZATION_TYPE_CONTRACTS.md §5 already rejected resolving a universal
//   type by inspecting a frame's own shape instead of a real backend-declared type). So the
//   scrubber here toggles which problem's instance is shown, not which step of one instance
//   -- StepScrubber.js's own header already documents this exact split.
// - Only frame 0 (source) is ever editable, using the exact same per-type edit apparatus
//   VisualizationsSection.js uses (data/frameEditOps.js's shared op-appliers,
//   data/instanceSerializers.js's shared serializers) -- §2.3's "editable only applies to
//   frames[0]" rule and §2.5's source/target asymmetry turn out to be the same rule once
//   frame 0 is defined as "the source instance."
// - `visualizeReduction` requires a certificate for the source instance
//   (INTERACTIVE_LAYER_DESIGN.md §1.3), which only a completed Solvers run can produce --
//   `certificate` arrives as a prop from ProblemDetailLayout.js (T53, see that file's
//   header), and this section renders a "nothing to render yet" state until one exists for
//   the current instance, rather than erroring.
// - The source pane's Run button bumps the same shared `runToken` Solvers/Visualizations
//   use (§2.1.1). Because producing a fresh certificate is itself asynchronous (a `/solve`
//   call Solvers' own effect performs), this section can't fetch the reduction the moment
//   `runToken` changes -- it also watches `certificate` itself and fetches as soon as one
//   lands that matches the current instance, whichever of the three sections' Run buttons
//   triggered it.

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyCircuitOp,
  applyGraphOp,
  cloneCircuitForEdit,
  cloneGraphForEdit,
  SAT3_MAX_LITERALS_PER_CLAUSE,
} from "../../data/frameEditOps";
import {
  serializeBooleanSatisfiabilityInstance,
  serializeGraphInstance,
  serializeRecursiveSetInstance,
} from "../../data/instanceSerializers";
import { TAXONOMY } from "../../data/taxonomy";
import { VISUALIZATION_TYPE_MAP } from "../../data/visualizationTypes";
import {
  COMPUTE_CANCELLED,
  COMPUTE_DONE,
  COMPUTE_FAILED,
  COMPUTE_RUNNING,
  useComputeRequest,
} from "../../hooks/useComputeRequest";
import { REDUX_API_BASE_URL, requestReducedInstance } from "../../lib/redux";
import { getFacetAccentColor, thinScrollbarSx } from "../theme";
import ComputeStatus from "./ComputeStatus";
import SectionShell from "./SectionShell";
import StepScrubber from "./StepScrubber";
import VisualizationCanvas from "./visualizations/VisualizationCanvas";

// #71: fixed list height so a problem with many declared reduction targets
// scrolls inside the list instead of stretching the section indefinitely.
const REDUCES_TO_MAX_HEIGHT = 220;

// A reduction is structurally a 2-frame case (INTERACTIVE_LAYER_DESIGN.md §1.3) -- see this
// file's header for what the two frames actually are.
const FRAME_COUNT = 2;
const SOURCE_STEP = 0;
const REDUCED_STEP = 1;

// One prefix for every id ComputeStatus renders inside this section (ground rule 4).
const RUN_ID_PREFIX = "reductions-run";

const REDUCTION_COST_FACET = TAXONOMY.find((facet) => facet.key === "reductionCost");
const REDUCTION_COST_LABELS = new Map(
  REDUCTION_COST_FACET.options.map((option) => [option.key, option.label]),
);
const REDUCTION_COST_ACCENT = getFacetAccentColor(REDUCTION_COST_FACET.accentColor);

function costLabel(costKey) {
  return REDUCTION_COST_LABELS.get(costKey) ?? costKey;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function CostBadge({ costKey }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        flexShrink: 0,
        px: 1,
        py: 0.25,
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 700,
        color: REDUCTION_COST_ACCENT,
        backgroundColor: alpha(REDUCTION_COST_ACCENT, 0.12),
        border: `1px solid ${alpha(REDUCTION_COST_ACCENT, 0.55)}`,
      }}
    >
      {costLabel(costKey)}
    </Box>
  );
}

function formatSeconds(milliseconds) {
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

/**
 * @param {Object} props
 * @param {Object} props.problem A data/fixtures.js-shaped FixtureProblem.
 * @param {string} [props.instanceValue] The shared problem instance, owned by
 *   components/ProblemDetailLayout.js (T35/#93). The source pane renders and edits this
 *   same value.
 * @param {(next: string) => void} [props.onInstanceChange] Called with new text when the
 *   source pane's diagram edit is serialized just before Run (§2.1.2).
 * @param {number} [props.runToken] The shared Run trigger (T48/#111).
 * @param {() => void} [props.onRunRequest] Bumps `runToken`. Called by this section's own
 *   Run button instead of fetching directly.
 * @param {{value: string, instance: string}|null} [props.certificate] The certificate for
 *   `instance`, produced by Solvers' own Run (T53/#116, see ProblemDetailLayout.js's
 *   header). `null` until a solve has completed at least once. Stale (a certificate for a
 *   since-edited instance) is detected by comparing `certificate.instance` to
 *   `instanceValue`, the same pattern SolversSection.js's own `instanceChangedSinceRun`
 *   uses.
 * @param {{attributes: Object, listeners: Object}} [props.dragHandleProps]
 *   Forwarded straight through to SectionShell — see T18 (#27).
 */
export default function ReductionsSection({
  problem,
  instanceValue = "",
  onInstanceChange,
  runToken,
  onRunRequest,
  certificate,
  dragHandleProps,
}) {
  const { to, from } = problem.reductions;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(SOURCE_STEP);
  const [fromExpanded, setFromExpanded] = useState(true);

  const hasTo = to.length > 0;
  const hasFrom = from.length > 0;
  const hasAny = hasTo || hasFrom;
  const selected = hasTo ? to[Math.min(selectedIndex, to.length - 1)] : null;

  const reduce = useComputeRequest({ subject: "instance" });

  const trimmedInstance = instanceValue.trim();
  const canRun = Boolean(selected?.className) && trimmedInstance !== "";
  const hasCurrentCertificate =
    Boolean(certificate?.value) && certificate.instance === instanceValue;

  // A rendered frame pair is only ever shown next to the reduction that produced it -- same
  // guard VisualizationsSection.js/SolversSection.js use for their own live results.
  const liveFrames =
    reduce.status === COMPUTE_DONE && reduce.result?.reductionClassName === selected?.className
      ? reduce.result
      : null;
  const instanceChangedSinceRun = Boolean(liveFrames) && liveFrames.instance !== instanceValue;

  // The source pane renders as this problem's own first declared visualization would
  // (same "always take the first" convention hooks/useProblemDetail.js's buildVerifier
  // already uses) -- see this file's header for why frame 0 is the source's own shape, not
  // the reduction's.
  const sourceVisualization = problem.visualizations?.[0] ?? null;
  const sourceUniversalType = VISUALIZATION_TYPE_MAP[sourceVisualization?.backendType] ?? null;
  const isBooleanSatisfiability = sourceUniversalType === "booleanSatisfiability";
  const isGraph = sourceUniversalType === "graph";
  const isRecursiveSet = sourceUniversalType === "recursiveSet";
  const isQuantumCircuit = sourceUniversalType === "quantumCircuit";
  const isEditableType = isBooleanSatisfiability || isGraph || isRecursiveSet || isQuantumCircuit;
  const maxLiteralsPerClause =
    isBooleanSatisfiability && problem.name === "3SAT" ? SAT3_MAX_LITERALS_PER_CLAUSE : undefined;

  // Local-preview-only edit state (INTERACTIVE_LAYER_DESIGN.md §2.1.2/§2.3), source pane
  // only -- mirrors VisualizationsSection.js's identical state, kept as its own copy here
  // since the two sections can have independent pending edits open at once.
  const [editedClauses, setEditedClauses] = useState(null);
  const [editedGraph, setEditedGraph] = useState(null);
  const [graphNodeOps, setGraphNodeOps] = useState([]);
  const [graphHasEdgeEdits, setGraphHasEdgeEdits] = useState(false);
  const [editedRecursiveData, setEditedRecursiveData] = useState(null);
  const [editedCircuit, setEditedCircuit] = useState(null);
  const [serializeError, setSerializeError] = useState(null);

  const sourceFrame = liveFrames?.frames?.[SOURCE_STEP] ?? null;
  const reducedFrame = liveFrames?.frames?.[REDUCED_STEP] ?? null;

  if (isGraph && currentStep === SOURCE_STEP && sourceFrame && editedGraph === null) {
    setEditedGraph(cloneGraphForEdit(sourceFrame));
  }

  function handleClausesChange(updater) {
    setEditedClauses((current) => updater(current ?? sourceFrame?.clauses ?? []));
  }

  function applyGraphEdit(op) {
    setEditedGraph((current) => applyGraphOp(current ?? cloneGraphForEdit(sourceFrame), op));
    if (op.type === "addNode" || op.type === "removeNode" || op.type === "renameNode") {
      setGraphNodeOps((ops) => [...ops, op]);
    } else {
      setGraphHasEdgeEdits(true);
    }
  }

  function applyCircuitEdit(op) {
    setEditedCircuit((current) =>
      applyCircuitOp(current ?? cloneCircuitForEdit(sourceFrame.d3), op),
    );
  }

  function handleDataChange(updater) {
    setEditedRecursiveData((current) => updater(current ?? sourceFrame.data));
  }

  function resetEdits() {
    setEditedClauses(null);
    setEditedGraph(null);
    setGraphNodeOps([]);
    setGraphHasEdgeEdits(false);
    setEditedRecursiveData(null);
    setEditedCircuit(null);
    setSerializeError(null);
  }

  function handleSelectReduction(index) {
    if (index === selectedIndex) return;
    // Drops any in-flight request and clears the pane, so nothing from the previous
    // reduction target survives the switch.
    reduce.reset();
    setSelectedIndex(index);
    resetEdits();
  }

  const { start: startReduce } = reduce;
  const canReduceNow = canRun && hasCurrentCertificate;
  const handleReduce = useCallback(() => {
    if (!canReduceNow) return;
    const reduction = selected;
    const instanceAtRun = instanceValue;
    const solutionAtRun = certificate.value;
    startReduce(async (signal) => {
      const frames = await requestReducedInstance(
        REDUX_API_BASE_URL,
        reduction.className,
        instanceAtRun,
        solutionAtRun,
        signal,
      );
      return {
        frames: Array.isArray(frames) ? frames : [],
        reductionClassName: reduction.className,
        target: reduction.target,
        instance: instanceAtRun,
      };
    });
  }, [canReduceNow, selected, instanceValue, certificate, startReduce]);

  // The Run affordance's onClick, not `onRunRequest` directly -- a pending sendable source
  // edit must be serialized into the shared instance *before* Run fires, exactly the same
  // ordering VisualizationsSection.js's own handleRunClick uses and for the same reason
  // (onInstanceChange and onRunRequest are both setters on ProblemDetailLayout.js, batched
  // into one re-render).
  function handleRunClick() {
    setSerializeError(null);
    if (isBooleanSatisfiability && editedClauses !== null) {
      onInstanceChange?.(serializeBooleanSatisfiabilityInstance(editedClauses));
    } else if (isGraph && graphNodeOps.length > 0 && sourceFrame) {
      const baseNodeIds = sourceFrame.nodes.map((node) => node.id);
      const result = serializeGraphInstance(instanceValue, baseNodeIds, graphNodeOps);
      if ("error" in result) {
        setSerializeError(result.error);
        return;
      }
      onInstanceChange?.(result.instanceText);
    } else if (isRecursiveSet && editedRecursiveData !== null) {
      onInstanceChange?.(serializeRecursiveSetInstance(editedRecursiveData));
    }
    if (onRunRequest) {
      onRunRequest();
    } else {
      handleReduce();
    }
  }

  // Reacts to the shared Run trigger (T48/#111). A fresh certificate for the current
  // instance may not exist yet the instant this fires -- `canReduceNow` no-ops `handleReduce`
  // until one does, and the effect below picks it up once Solvers' own `/solve` resolves.
  const previousRunTokenRef = useRef(runToken);
  useEffect(() => {
    if (runToken === undefined || runToken === previousRunTokenRef.current) return;
    previousRunTokenRef.current = runToken;
    handleReduce();
  }, [runToken, handleReduce]);

  // Reacts to a certificate arriving or changing (ProblemDetailLayout.js, T53/#116) --
  // this is what actually fires the fetch when Run was pressed before Solvers' own solve
  // had resolved, and also what refreshes this pane automatically if the visitor solves
  // again from the Solvers section directly without touching this one at all.
  const previousCertificateRef = useRef(certificate);
  useEffect(() => {
    if (certificate === previousCertificateRef.current) return;
    previousCertificateRef.current = certificate;
    handleReduce();
  }, [certificate, handleReduce]);

  // Independent render-time resets (React's documented "adjust state" pattern): selecting a
  // different reduction target starts its source/reduced toggle over; a freshly-completed
  // fetch replaces the frames currently shown, which resets the step position and drops any
  // pending edit (§2.1.2).
  const [stepResetKey, setStepResetKey] = useState(selectedIndex);
  if (stepResetKey !== selectedIndex) {
    setStepResetKey(selectedIndex);
    setCurrentStep(SOURCE_STEP);
  }
  const [lastReduceResult, setLastReduceResult] = useState(reduce.result);
  if (lastReduceResult !== reduce.result) {
    setLastReduceResult(reduce.result);
    setCurrentStep(SOURCE_STEP);
    if (editedClauses !== null) setEditedClauses(null);
    if (editedGraph !== null) setEditedGraph(null);
    if (graphNodeOps.length > 0) setGraphNodeOps([]);
    if (graphHasEdgeEdits) setGraphHasEdgeEdits(false);
    if (editedRecursiveData !== null) setEditedRecursiveData(null);
    if (editedCircuit !== null) setEditedCircuit(null);
  }

  const isEditingSource = currentStep === SOURCE_STEP && isEditableType;
  const fetchedFrame = currentStep === SOURCE_STEP ? sourceFrame : reducedFrame;
  let currentFrame = fetchedFrame;
  if (isEditingSource && fetchedFrame) {
    if (isBooleanSatisfiability && editedClauses !== null) {
      currentFrame = { clauses: editedClauses };
    } else if (isGraph && editedGraph) {
      currentFrame = { nodes: editedGraph.nodes, links: editedGraph.links };
    } else if (isRecursiveSet && editedRecursiveData !== null) {
      currentFrame = { data: editedRecursiveData };
    } else if (isQuantumCircuit && editedCircuit) {
      currentFrame = { ...fetchedFrame, d3: { ...fetchedFrame.d3, ...editedCircuit } };
    }
  }

  const hasPendingEdit =
    (isBooleanSatisfiability && editedClauses !== null) ||
    (isGraph && (graphNodeOps.length > 0 || graphHasEdgeEdits)) ||
    (isRecursiveSet && editedRecursiveData !== null) ||
    (isQuantumCircuit && editedCircuit !== null);

  const currentBackendType =
    currentStep === SOURCE_STEP
      ? sourceVisualization?.backendType
      : selected?.targetVisualization?.backendType;
  const paneLabel =
    currentStep === SOURCE_STEP
      ? `${problem.name.toUpperCase()} INSTANCE — SOURCE`
      : `${(selected?.target ?? "").toUpperCase()} INSTANCE — REDUCED`;

  const targetName = selected?.target ?? "this problem";
  let announcement = "";
  if (reduce.status === COMPUTE_RUNNING) {
    announcement = `Rendering the reduction to ${targetName}. This can take up to a minute.`;
  } else if (reduce.status === COMPUTE_DONE) {
    announcement = `Reduction to ${targetName} rendered in ${formatSeconds(reduce.elapsedMs)}.`;
  } else if (reduce.status === COMPUTE_FAILED) {
    announcement = `The reduction to ${targetName} did not render. ${reduce.failure?.headline ?? ""}`;
  } else if (reduce.status === COMPUTE_CANCELLED) {
    announcement = "Run cancelled.";
  }

  const total = to.length + from.length;
  const summary = `${total} reduction${total === 1 ? "" : "s"}`;

  const fromToggleId = "reductions-from-toggle";
  const fromBodyId = "reductions-from-body";

  return (
    <SectionShell
      sectionKey="reductions"
      title="Reductions"
      summary={summary}
      dragHandleProps={dragHandleProps}
    >
      {!hasAny && (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No reductions declared for this problem.
        </Typography>
      )}

      {hasTo && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Button
              id="reductions-run-button"
              variant="outlined"
              size="small"
              disabled={!canRun || reduce.isRunning}
              onClick={handleRunClick}
            >
              Run
            </Button>
            {!canRun && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Add a problem instance above to render this reduction.
              </Typography>
            )}
          </Box>

          <StepScrubber
            idPrefix="reductions-scrubber"
            frameCount={FRAME_COUNT}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            frameNoun="Frame"
          />
          <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
            A reduction is a single mapping, not a stepped process — this toggles between the source
            instance and the {costLabel(selected.cost).toLowerCase()} reduction&apos;s result, with
            no intermediate steps.
          </Typography>

          <ComputeStatus
            idPrefix={RUN_ID_PREFIX}
            status={reduce.status}
            announcement={announcement}
            failure={reduce.failure}
            onCancel={reduce.cancel}
            busyLabel={`Rendering the reduction to ${targetName}`}
          />

          {!hasCurrentCertificate && !liveFrames && reduce.status !== COMPUTE_RUNNING && (
            <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
              Nothing to render yet. A reduction needs a solved certificate for the source instance
              first — press Run to solve it and render this reduction together.
            </Typography>
          )}

          {liveFrames ? (
            <Paper
              variant="outlined"
              sx={{ p: 2, borderRadius: 2, display: "flex", flexDirection: "column", gap: 1 }}
            >
              <Typography variant="overline" sx={{ color: "text.secondary" }}>
                {paneLabel}
              </Typography>
              <Box
                sx={{
                  minHeight: 220,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <VisualizationCanvas
                  idPrefix="reductions-canvas"
                  instanceName={currentStep === SOURCE_STEP ? problem.name : targetName}
                  backendType={currentBackendType}
                  frame={currentFrame}
                  editable={isEditingSource}
                  onClausesChange={isEditingSource ? handleClausesChange : undefined}
                  maxLiteralsPerClause={maxLiteralsPerClause}
                  onGraphEdit={isEditingSource ? applyGraphEdit : undefined}
                  onDataChange={isEditingSource ? handleDataChange : undefined}
                  onCircuitEdit={isEditingSource ? applyCircuitEdit : undefined}
                />
              </Box>
              {serializeError && (
                <Typography variant="body2" sx={{ color: "error.light" }}>
                  {serializeError}
                </Typography>
              )}
              {hasPendingEdit && (
                <Typography variant="body2" sx={{ color: "warning.light" }}>
                  {isQuantumCircuit
                    ? "This diagram has unsaved edits. They preview here but can't be sent to Run yet for this visualization type."
                    : "This diagram has unsaved edits. Press Run to send them to the backend."}
                </Typography>
              )}
              {instanceChangedSinceRun && (
                <Typography variant="body2" sx={{ color: "warning.light" }}>
                  The instance has been edited since this ran. Run again to render the reduction for
                  the instance currently in the box.
                </Typography>
              )}
            </Paper>
          ) : (
            hasCurrentCertificate &&
            reduce.status !== COMPUTE_RUNNING &&
            reduce.status !== COMPUTE_FAILED && (
              <Box
                sx={{
                  minHeight: 220,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  color: "text.secondary",
                }}
              >
                <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                  Not yet run.
                </Typography>
              </Box>
            )
          )}

          <Typography variant="overline" sx={{ color: "text.secondary", mt: 1 }}>
            Reduces to
          </Typography>
          <Box
            role="listbox"
            aria-label="Reduces to"
            sx={{
              maxHeight: REDUCES_TO_MAX_HEIGHT,
              overflowY: "auto",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1.5,
              ...thinScrollbarSx,
            }}
          >
            {to.map((reduction, index) => {
              const isSelected = index === selectedIndex;
              return (
                <Box
                  key={reduction.target}
                  id={`reduction-to-${slugify(reduction.target)}`}
                  component="button"
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectReduction(index)}
                  sx={(theme) => ({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    font: "inherit",
                    color: "inherit",
                    px: 1.5,
                    py: 1,
                    border: "none",
                    borderLeft: "3px solid",
                    borderLeftColor: isSelected ? "primary.main" : "transparent",
                    backgroundColor: isSelected
                      ? alpha(theme.palette.primary.main, 0.12)
                      : "transparent",
                    "&:hover": {
                      backgroundColor: isSelected
                        ? alpha(theme.palette.primary.main, 0.12)
                        : alpha(theme.palette.common.white, 0.04),
                    },
                  })}
                >
                  <Typography variant="body2">
                    {reduction.target.toUpperCase()}
                    {isSelected && (
                      <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
                        {" "}
                        (shown above)
                      </Box>
                    )}
                  </Typography>
                  <CostBadge costKey={reduction.cost} />
                </Box>
              );
            })}
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Selectable — click to render an entry above.
          </Typography>
        </Box>
      )}

      {hasFrom && (
        <Box>
          <Box
            id={fromToggleId}
            component="button"
            type="button"
            aria-expanded={fromExpanded}
            aria-controls={fromBodyId}
            onClick={() => setFromExpanded((prev) => !prev)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              border: "none",
              background: "none",
              p: 0,
              cursor: "pointer",
              color: "inherit",
              font: "inherit",
            }}
          >
            <ChevronRightIcon
              aria-hidden="true"
              fontSize="small"
              sx={{
                color: "text.secondary",
                transform: fromExpanded ? "rotate(90deg)" : "none",
                transition: "transform 0.15s ease",
              }}
            />
            <Typography variant="overline" sx={{ color: "text.secondary" }}>
              Reduces from ({from.length})
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
              informational — not selectable
            </Typography>
          </Box>

          <Box
            id={fromBodyId}
            sx={{
              display: fromExpanded ? "flex" : "none",
              flexDirection: "column",
              gap: 0.75,
              mt: 1,
            }}
          >
            {from.map((reduction) => (
              <Box
                key={reduction.source}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2">{reduction.source.toUpperCase()}</Typography>
                <CostBadge costKey={reduction.cost} />
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </SectionShell>
  );
}
