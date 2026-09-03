// components/detail/VisualizationsSection.js
//
// T16b (#22) — the Visualizations detail-page section: a left rail of the
// problem's declared visualizations (name + type badge), and a right pane
// with a canvas, its caption, and step-scrubber chrome.
//
// T48 (#111): the canvas is real now, for the `graph` universal type (24 of
// 48 declared instances, the largest group -- ai_documentation/
// VISUALIZATION_TYPE_CONTRACTS.md §3.1). Structural editing is still out of
// scope (T51, gated on T46) -- rendering is read-only, and the earlier "Drag
// nodes to reposition / Right-click to add" hint text is gone rather than
// left pointing at an interaction that doesn't exist: it was harmless over
// a static placeholder box, but would be actively misleading under a real,
// rendered diagram nothing responds to.
//
// Per INTERACTIVE_LAYER_DESIGN.md §0/§2.1/§2.1.1: this section shares
// `instanceValue`/`onInstanceChange` with Solvers and Verifier (T35/#93) and
// reacts to the shared Run trigger `runToken`/`onRunRequest` (owned by
// components/ProblemDetailLayout.js) the same way Solvers does. Frames are
// not refetched on every instance edit -- only on Run -- and a staleness
// banner shows when the instance has changed since the frames currently
// shown were fetched, the same `instanceChangedSinceRun` pattern
// components/detail/SolversSection.js already established.
//
// T47 (#110): step playback (play/pause/step/speed/scrub bar) is the shared
// StepScrubber component, now driven by the real frame count a completed
// run returns rather than a fallback of 1.
//
// T51 (#114): structural editing for the `graph`, `recursiveSet` and
// `quantumCircuit` universal types (wave 2). Per INTERACTIVE_LAYER_DESIGN.md
// §2.3, editing only ever applies to the base frame (frames[0]) -- the
// `editedGraph`/`editedRecursiveData`/`editedCircuit` state below is
// local-preview-only, seeded from the fetched base frame as soon as it's
// available (so an edit panel's rows have stable identity from the start,
// not just after the first edit) and cleared whenever the selected
// visualization changes or a fresh Run replaces the frames (§2.1.2:
// "editing previews locally; Run reconciles through the real backend round
// trip"). Pressing Run serializes any pending edit into the shared instance
// text (only `graph` node edits and `recursiveSet` are actually sendable --
// see data/instanceSerializers.js's header for `quantumCircuit`'s open gap,
// and this file's own handleRunClick for why `graph` edge edits stay
// preview-only) via `onInstanceChange` *before* triggering the shared Run
// action, exactly the same sequencing T52 (#115) established for
// `booleanSatisfiability` on its own branch.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  serializeGraphInstance,
  serializeRecursiveSetInstance,
} from "../../data/instanceSerializers";
import { TAXONOMY, UNCLASSIFIED } from "../../data/taxonomy";
import { VISUALIZATION_TYPE_MAP } from "../../data/visualizationTypes";
import {
  COMPUTE_CANCELLED,
  COMPUTE_DONE,
  COMPUTE_FAILED,
  COMPUTE_RUNNING,
  useComputeRequest,
} from "../../hooks/useComputeRequest";
import { REDUX_API_BASE_URL, requestVisualizedInstance } from "../../lib/redux";
import { getFacetAccentColor, thinScrollbarSx } from "../theme";
import ComputeStatus from "./ComputeStatus";
import SectionShell from "./SectionShell";
import StepScrubber from "./StepScrubber";
import VisualizationCanvas from "./visualizations/VisualizationCanvas";

const VISUALIZATION_TYPE_FACET = TAXONOMY.find((facet) => facet.key === "visualizationType");

// Ids assigned to a newly-added edge/gate within one editing session only need to be
// unique within that session (React keys, DOM ids) -- a module-level counter is enough.
let editIdCounter = 0;
function nextEditId(prefix) {
  editIdCounter += 1;
  return `${prefix}-${editIdCounter}`;
}

function cloneGraphForEdit(frame) {
  return {
    nodes: frame.nodes.map((node) => ({ ...node, _key: node.id })),
    links: frame.links.map((link) => ({ ...link, _key: link.id })),
  };
}

// Applies one GraphRenderer edit descriptor to a cloned {nodes, links} structure.
// Referential integrity for node removal/rename (an edge can't be left dangling, per
// T46's finding that SPADE itself won't catch this) is handled locally here the same way
// data/spadeInstanceText.js's `removeLeafEverywhere`/`renameLeafEverywhere` handle it in
// the text -- the two are independent implementations of the same rule, one over the
// in-memory structure for the local preview, one over the parsed text for Run.
function applyGraphOp(current, op) {
  switch (op.type) {
    case "addNode": {
      if (current.nodes.some((node) => node.id === op.id)) return current;
      return {
        ...current,
        nodes: [
          ...current.nodes,
          {
            id: op.id,
            name: op.id,
            color: "",
            outline: "",
            delay: "",
            dashed: "",
            additional: "",
            _key: op.id,
          },
        ],
      };
    }
    case "removeNode":
      return {
        nodes: current.nodes.filter((node) => node.id !== op.id),
        links: current.links.filter((link) => link.source !== op.id && link.target !== op.id),
      };
    case "renameNode": {
      if (op.from === op.to || current.nodes.some((node) => node.id === op.to)) return current;
      return {
        nodes: current.nodes.map((node) =>
          node.id === op.from ? { ...node, id: op.to, name: op.to } : node,
        ),
        links: current.links.map((link) => ({
          ...link,
          source: link.source === op.from ? op.to : link.source,
          target: link.target === op.from ? op.to : link.target,
        })),
      };
    }
    case "addEdge": {
      if (op.source === op.target) return current;
      const alreadyExists = current.links.some(
        (link) =>
          (link.source === op.source && link.target === op.target) ||
          (link.source === op.target && link.target === op.source),
      );
      if (alreadyExists) return current;
      return {
        ...current,
        links: [
          ...current.links,
          {
            id: nextEditId("edge"),
            _key: nextEditId("edge-key"),
            source: op.source,
            target: op.target,
            color: "",
            dashed: "",
            delay: "",
            weight: "",
            weighted: false,
            directed: false,
            attribute1: "",
            attribute2: "",
          },
        ],
      };
    }
    case "removeEdge":
      return { ...current, links: current.links.filter((link) => link.id !== op.id) };
    default:
      return current;
  }
}

function cloneCircuitForEdit(d3) {
  return {
    qubits: [...d3.qubits],
    classical: [...(d3.classical ?? [])],
    gates: (d3.gates ?? []).map((gate) => ({ ...gate, targets: [...gate.targets] })),
    overlays: d3.overlays ?? [],
    metadata: d3.metadata ?? null,
  };
}

// Local-preview-only (data/instanceSerializers.js has no `quantumCircuit` serializer --
// see that file's header) -- so unlike `applyGraphOp`, nothing here needs to track a
// separate op log for Run.
function applyCircuitOp(current, op) {
  switch (op.type) {
    case "addQubit":
      if (current.qubits.includes(op.id)) return current;
      return { ...current, qubits: [...current.qubits, op.id] };
    case "removeQubit":
      return {
        ...current,
        qubits: current.qubits.filter((qubit) => qubit !== op.id),
        gates: current.gates.filter((gate) => !gate.targets.includes(op.id)),
      };
    case "renameQubit": {
      if (op.from === op.to || current.qubits.includes(op.to)) return current;
      return {
        ...current,
        qubits: current.qubits.map((qubit) => (qubit === op.from ? op.to : qubit)),
        gates: current.gates.map((gate) => ({
          ...gate,
          targets: gate.targets.map((target) => (target === op.from ? op.to : target)),
        })),
      };
    }
    case "addGate": {
      const maxTime = current.gates.reduce((max, gate) => Math.max(max, gate.time ?? 0), -1);
      return {
        ...current,
        gates: [
          ...current.gates,
          {
            id: nextEditId("gate"),
            type: op.gateType,
            targets: [op.target],
            classical: null,
            params: null,
            label: null,
            time: maxTime + 1,
          },
        ],
      };
    }
    case "removeGate":
      return { ...current, gates: current.gates.filter((gate) => gate.id !== op.id) };
    case "relabelGate":
      return {
        ...current,
        gates: current.gates.map((gate) =>
          gate.id === op.id ? { ...gate, type: op.gateType } : gate,
        ),
      };
    default:
      return current;
  }
}

// #71: fixed rail height so a problem with many declared visualizations
// scrolls inside the rail instead of stretching the section indefinitely.
const RAIL_MAX_HEIGHT = 320;

// One prefix for every id ComputeStatus renders inside this section, so it
// can never collide with Solvers' own (ground rule 4).
const RUN_ID_PREFIX = "visualizations-run";

function formatSeconds(milliseconds) {
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

// Falls back to the raw key (or the UNCLASSIFIED sentinel itself, e.g.
// 3-SAT's "Assignment Table" -- a real, documented taxonomy gap, see
// data/fixtures.js's file header) rather than crashing on an unmapped type.
function visualizationTypeLabel(typeKey) {
  if (!typeKey || typeKey === UNCLASSIFIED) {
    return UNCLASSIFIED;
  }
  const option = VISUALIZATION_TYPE_FACET.options.find((candidate) => candidate.key === typeKey);
  return option?.label ?? typeKey;
}

function TypeBadge({ typeKey }) {
  const accentColor = getFacetAccentColor(VISUALIZATION_TYPE_FACET.accentColor);
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        px: 1,
        py: 0.25,
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        color: accentColor,
        backgroundColor: alpha(accentColor, 0.12),
        border: `1px solid ${alpha(accentColor, 0.55)}`,
      }}
    >
      {visualizationTypeLabel(typeKey)}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.problem A data/fixtures.js-shaped FixtureProblem.
 * @param {string} [props.instanceValue] The shared problem instance, owned by
 *   components/ProblemDetailLayout.js (T35/#93).
 * @param {(next: string) => void} [props.onInstanceChange] Called with the new
 *   text whenever the visitor edits the instance elsewhere (Solvers' box), and
 *   (T51/#114) called by this section itself, just before Run, to write a
 *   pending diagram edit's serialized text into the shared instance.
 * @param {number} [props.runToken] The shared Run trigger (T48/#111). A change
 *   in value, not the value itself, means Run was pressed somewhere.
 * @param {() => void} [props.onRunRequest] Bumps `runToken`. Called by this
 *   section's own Run button instead of fetching directly.
 * @param {{attributes: Object, listeners: Object}} [props.dragHandleProps]
 *   Forwarded straight through to SectionShell — see T18 (#27).
 */
export default function VisualizationsSection({
  problem,
  instanceValue = "",
  onInstanceChange,
  runToken,
  onRunRequest,
  dragHandleProps,
}) {
  const visualizations = problem.visualizations ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const selected = visualizations[selectedIndex];
  const noun = visualizations.length === 1 ? "visualization" : "visualizations";

  const visualize = useComputeRequest({ subject: "instance" });

  const trimmedInstance = instanceValue.trim();
  const canRun = Boolean(selected?.className) && trimmedInstance !== "";

  // A rendered frame set is only ever shown next to the visualization that
  // produced it -- same guard components/detail/SolversSection.js uses for
  // its own liveResult, and for the same reason: the rail is not the only
  // thing that can change which visualization `selected` points at.
  const liveFrames =
    visualize.status === COMPUTE_DONE &&
    visualize.result?.visualizationClassName === selected?.className
      ? visualize.result
      : null;
  const instanceChangedSinceRun = Boolean(liveFrames) && liveFrames.instance !== instanceValue;

  // T51 (#114): which universal type the selected visualization renders as, and whether
  // it's one of the three wave-2 editable types. Derived from the static backend-type map
  // alone (not `resolveVisualizationType`, which also needs a live frame) since this is
  // needed before a frame exists, to decide whether edit affordances can ever apply.
  const universalType = VISUALIZATION_TYPE_MAP[selected?.backendType] ?? null;
  const isGraph = universalType === "graph";
  const isRecursiveSet = universalType === "recursiveSet";
  const isQuantumCircuit = universalType === "quantumCircuit";
  const isEditableType = isGraph || isRecursiveSet || isQuantumCircuit;

  // Local-preview-only edit state (INTERACTIVE_LAYER_DESIGN.md §2.1.2/§2.3), one slot per
  // wave-2 type -- only the slot matching the selected visualization's type is ever
  // non-null. `graphNodeOps` is the ordered node-edit log `serializeGraphInstance` replays
  // at Run time (see that function's own doc comment for why edge edits aren't logged the
  // same way).
  const [editedGraph, setEditedGraph] = useState(null);
  const [graphNodeOps, setGraphNodeOps] = useState([]);
  const [graphHasEdgeEdits, setGraphHasEdgeEdits] = useState(false);
  const [editedRecursiveData, setEditedRecursiveData] = useState(null);
  const [editedCircuit, setEditedCircuit] = useState(null);
  const [serializeError, setSerializeError] = useState(null);

  const baseFrame = liveFrames?.frames?.[0] ?? null;

  // Seeds `editedGraph` as soon as a base `graph` frame exists, rather than waiting for
  // the first edit -- GraphRenderer's edit panel needs every row's stable `_key` from its
  // very first render, not just after something has already been changed (React's
  // documented "adjust state during render" pattern, the same one `stepResetKey`/
  // `lastVisualizeResult` below already use in this file).
  if (isGraph && currentStep === 0 && baseFrame && editedGraph === null) {
    setEditedGraph(cloneGraphForEdit(baseFrame));
  }

  function applyGraphEdit(op) {
    setEditedGraph((current) => applyGraphOp(current ?? cloneGraphForEdit(baseFrame), op));
    if (op.type === "addNode" || op.type === "removeNode" || op.type === "renameNode") {
      setGraphNodeOps((ops) => [...ops, op]);
    } else {
      setGraphHasEdgeEdits(true);
    }
  }

  function applyCircuitEdit(op) {
    setEditedCircuit((current) => applyCircuitOp(current ?? cloneCircuitForEdit(baseFrame.d3), op));
  }

  function handleDataChange(updater) {
    setEditedRecursiveData((current) => updater(current ?? baseFrame.data));
  }

  function handleSelectVisualization(index) {
    if (index === selectedIndex) return;
    // Drops any in-flight request and clears the pane, so nothing from the
    // previous visualization survives the switch.
    visualize.reset();
    setSelectedIndex(index);
    setEditedGraph(null);
    setGraphNodeOps([]);
    setGraphHasEdgeEdits(false);
    setEditedRecursiveData(null);
    setEditedCircuit(null);
    setSerializeError(null);
  }

  const { start: startVisualize } = visualize;
  const handleRun = useCallback(() => {
    if (!canRun) return;
    const visualization = selected;
    const instanceAtRun = instanceValue;
    startVisualize(async (signal) => {
      const frames = await requestVisualizedInstance(
        REDUX_API_BASE_URL,
        visualization.className,
        instanceAtRun,
        signal,
      );
      return {
        frames: Array.isArray(frames) ? frames : [],
        visualizationClassName: visualization.className,
        visualizationName: visualization.name,
        instance: instanceAtRun,
      };
    });
  }, [canRun, selected, instanceValue, startVisualize]);

  // T51 (#114): the Run affordance's onClick, not `handleRun`/`onRunRequest` directly --
  // a pending `graph` node edit or `recursiveSet` edit must be serialized into the shared
  // instance *before* Run fires (`onInstanceChange` and `onRunRequest` are both setters on
  // the same parent, ProblemDetailLayout.js, batched into one re-render, so the runToken
  // effect below sees the updated `instanceValue` by the time it fires -- the same
  // ordering T52/#115 relies on for `booleanSatisfiability`, on its own branch). A
  // `quantumCircuit` edit, or a `graph` edit that's edge-only, has nothing to serialize --
  // Run still fires, it just won't reflect that particular pending edit.
  function handleRunClick() {
    setSerializeError(null);
    if (isGraph && graphNodeOps.length > 0 && liveFrames) {
      const baseNodeIds = liveFrames.frames[0].nodes.map((node) => node.id);
      const result = serializeGraphInstance(liveFrames.instance, baseNodeIds, graphNodeOps);
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
      handleRun();
    }
  }

  // Reacts to the shared Run trigger (T48/#111) rather than fetching inline
  // in the button's onClick -- see components/ProblemDetailLayout.js and
  // components/detail/SolversSection.js, which does the identical thing.
  const previousRunTokenRef = useRef(runToken);
  useEffect(() => {
    if (runToken === undefined || runToken === previousRunTokenRef.current) return;
    previousRunTokenRef.current = runToken;
    handleRun();
  }, [runToken, handleRun]);

  // Independent render-time resets (React's documented "adjust state" pattern, not a
  // useEffect): selecting a different visualization starts its playback over (handled in
  // handleSelectVisualization above, alongside its edit-state reset); a freshly-completed
  // run replaces the frames currently shown, which both resets the step position and
  // drops any pending edit -- §2.1.2 requires Run to replace the local preview with what
  // the backend actually parsed back, not leave the pre-Run edit displayed on top of new
  // data.
  const [stepResetKey, setStepResetKey] = useState(selectedIndex);
  if (stepResetKey !== selectedIndex) {
    setStepResetKey(selectedIndex);
    setCurrentStep(0);
  }
  const [lastVisualizeResult, setLastVisualizeResult] = useState(visualize.result);
  if (lastVisualizeResult !== visualize.result) {
    setLastVisualizeResult(visualize.result);
    setCurrentStep(0);
    if (editedGraph !== null) setEditedGraph(null);
    if (graphNodeOps.length > 0) setGraphNodeOps([]);
    if (graphHasEdgeEdits) setGraphHasEdgeEdits(false);
    if (editedRecursiveData !== null) setEditedRecursiveData(null);
    if (editedCircuit !== null) setEditedCircuit(null);
  }

  const frameCount = liveFrames?.frames?.length ?? 1;
  const fetchedFrame = liveFrames?.frames?.[currentStep] ?? null;
  // T51 (#114): on the base frame (frames[0]) only, a pending local edit shows instead of
  // the fetched frame -- the diagram's own preview of an edit that hasn't been sent to the
  // backend yet (§2.1.2). Any other step is always playback-only, never edited (§2.3).
  const isEditingStep0 = currentStep === 0 && isEditableType;
  let currentFrame = fetchedFrame;
  if (isEditingStep0 && fetchedFrame) {
    if (isGraph && editedGraph) {
      currentFrame = { nodes: editedGraph.nodes, links: editedGraph.links };
    } else if (isRecursiveSet && editedRecursiveData !== null) {
      currentFrame = { data: editedRecursiveData };
    } else if (isQuantumCircuit && editedCircuit) {
      currentFrame = { ...fetchedFrame, d3: { ...fetchedFrame.d3, ...editedCircuit } };
    }
  }

  const hasPendingEdit =
    (isGraph && (graphNodeOps.length > 0 || graphHasEdgeEdits)) ||
    (isRecursiveSet && editedRecursiveData !== null) ||
    (isQuantumCircuit && editedCircuit !== null);

  const visualizationName = selected?.name ?? "this visualization";
  let announcement = "";
  if (visualize.status === COMPUTE_RUNNING) {
    announcement = `Rendering ${visualizationName}. This can take up to a minute.`;
  } else if (visualize.status === COMPUTE_DONE) {
    announcement = `${visualizationName} rendered in ${formatSeconds(visualize.elapsedMs)}.`;
  } else if (visualize.status === COMPUTE_FAILED) {
    announcement = `${visualizationName} did not render. ${visualize.failure?.headline ?? ""}`;
  } else if (visualize.status === COMPUTE_CANCELLED) {
    announcement = "Run cancelled.";
  }

  return (
    <SectionShell
      sectionKey="visualizations"
      title="Visualizations"
      summary={`${visualizations.length} ${noun}`}
      dragHandleProps={dragHandleProps}
    >
      {visualizations.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No visualizations declared for this problem.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2 }}>
          <Box
            component="ul"
            role="listbox"
            aria-label="Visualizations"
            sx={{
              listStyle: "none",
              m: 0,
              p: 0,
              width: { xs: "100%", md: 220 },
              flexShrink: 0,
              maxHeight: RAIL_MAX_HEIGHT,
              overflowY: "auto",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              ...thinScrollbarSx,
            }}
          >
            {visualizations.map((visualization, index) => {
              const isSelected = index === selectedIndex;
              const entryId = `visualizations-rail-entry-${index}`;
              return (
                <Box component="li" key={entryId} sx={{ listStyle: "none" }}>
                  <Box
                    id={entryId}
                    component="button"
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectVisualization(index)}
                    sx={(theme) => ({
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 0.5,
                      width: "100%",
                      p: 1,
                      border: "none",
                      borderLeft: "3px solid",
                      borderLeftColor: isSelected ? "primary.main" : "transparent",
                      backgroundColor: isSelected
                        ? alpha(theme.palette.primary.main, 0.1)
                        : "transparent",
                      "&:hover": {
                        backgroundColor: isSelected
                          ? alpha(theme.palette.primary.main, 0.1)
                          : alpha(theme.palette.common.white, 0.04),
                      },
                      color: "inherit",
                      font: "inherit",
                      textAlign: "left",
                      cursor: "pointer",
                    })}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: isSelected ? "text.primary" : "text.secondary",
                      }}
                    >
                      {visualization.name}
                    </Typography>
                    <TypeBadge typeKey={visualization.type} />
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Button
                id="visualizations-run-button"
                variant="outlined"
                size="small"
                disabled={!canRun || visualize.isRunning}
                onClick={handleRunClick}
              >
                Run
              </Button>
              {!canRun && (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {selected.className
                    ? "Add a problem instance above to render this visualization."
                    : "This visualization cannot be run: the catalog did not say which backend visualization it is."}
                </Typography>
              )}
            </Box>

            <StepScrubber
              idPrefix="visualizations-scrubber"
              frameCount={frameCount}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
            />

            <ComputeStatus
              idPrefix={RUN_ID_PREFIX}
              status={visualize.status}
              announcement={announcement}
              failure={visualize.failure}
              onCancel={visualize.cancel}
              busyLabel={`Rendering ${visualizationName}`}
            />

            {liveFrames ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Box
                  sx={{
                    minHeight: 260,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <VisualizationCanvas
                    idPrefix="visualizations-canvas"
                    instanceName={selected.name}
                    backendType={selected.backendType}
                    frame={currentFrame}
                    editable={isEditingStep0}
                    onGraphEdit={isEditingStep0 ? applyGraphEdit : undefined}
                    onDataChange={isEditingStep0 ? handleDataChange : undefined}
                    onCircuitEdit={isEditingStep0 ? applyCircuitEdit : undefined}
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
                    The instance has been edited since this ran. Run again to visualize the instance
                    currently in the box.
                  </Typography>
                )}
              </Box>
            ) : (
              visualize.status !== COMPUTE_RUNNING &&
              visualize.status !== COMPUTE_FAILED && (
                <Box
                  sx={{
                    minHeight: 260,
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

            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {selected.caption}
            </Typography>

            {selected.stepNarration && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {selected.stepNarration}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </SectionShell>
  );
}
