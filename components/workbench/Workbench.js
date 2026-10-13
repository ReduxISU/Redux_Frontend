// components/workbench/Workbench.js
//
// #229 stage 1: the problem page as a workbench with the picture at the center. A rail of
// panel buttons on the left (Details, Instance, Result), one panel open at a time beside the
// picture, the command bar above the picture and the picture pane under it. Replaces the old
// page's five draggable sections (components/ProblemDetailLayout.js, retired here); the
// drag-to-reorder and section layout are dropped on purpose by #229.
//
// What this component owns, and why here:
//   - The one instance value. Every part of the page reads it, and editing it anywhere
//     resets the picture to the base instance: a run's picture and result are tagged with
//     the instance they ran on and only shown while that is still the instance (derived,
//     not an effect, so there is no moment where a stale picture shows).
//   - The three compute requests behind Run (hooks/useComputeRequest.js): the solver's
//     answer and the run's picture in Solve mode, and the reduction in Reduce mode. A
//     reduction needs an answer for the source instance (ProblemProvider/visualizeReduction
//     takes a `solution`), so Reduce runs the chosen solver first and carries its answer
//     across, as the old Reductions section did.
//   - The default picture before Run (hooks/useDefaultPicture.js), which is also how an
//     unreadable instance is found before anyone presses Run.
//   - The URL: `?instance=`, `?solver=` and `?viz=` round-trip the way the old sections did
//     (#150), so links and playlists that name a solver or visualization still open on it.
//     The old `?step=` is dropped: before Run there are no steps to point at.

import Box from "@mui/material/Box";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { VISUALIZATION_TYPE_MAP } from "../../data/visualizationTypes";
import {
  COMPUTE_CANCELLED,
  COMPUTE_DONE,
  COMPUTE_FAILED,
  COMPUTE_RUNNING,
  useComputeRequest,
} from "../../hooks/useComputeRequest";
import { useDefaultPicture } from "../../hooks/useDefaultPicture";
import { useFrameEdits } from "../../hooks/useFrameEdits";
import {
  REDUX_API_BASE_URL,
  requestReducedInstance,
  requestSolvedInstance,
  requestVisualizedInstance,
} from "../../lib/redux";
import ComputeStatus from "../detail/ComputeStatus";
import CommandBar from "./CommandBar";
import { COMPACT_MEDIA, cardSx, PANEL_WIDTH } from "./layout";
import DetailsPanel from "./panels/DetailsPanel";
import InstancePanel from "./panels/InstancePanel";
import ResultPanel from "./panels/ResultPanel";
import Rail from "./Rail";
import VisualizationPane from "./VisualizationPane";

const ID = "workbench";
const PANEL_ID = `${ID}-panel`;
const PANEL_TITLES = { details: "Details", instance: "Instance", result: "Result & Verify" };
const INSTANCE_URL_DEBOUNCE_MS = 400;
const NOT_RUN_TEXT = "Not run yet. Showing the default picture of the instance.";
const ARROW = "→";

function findIndexByName(items, name) {
  if (typeof name !== "string" || !name) return 0;
  const index = items.findIndex((item) => item.name === name);
  return index === -1 ? 0 : index;
}

function asCertificate(output) {
  if (typeof output === "string") return output;
  return output === null || output === undefined ? "" : JSON.stringify(output);
}

function formatSeconds(milliseconds) {
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

/**
 * @param {Object} props
 * @param {Object} props.problem The problem, as hooks/useProblemDetail.js builds it. The
 *   page mounts a fresh Workbench per problem (keyed by name), so nothing here carries over
 *   from one problem to the next.
 */
export default function Workbench({ problem }) {
  const router = useRouter();
  const solvers = problem.solvers ?? [];
  // Only visualizations this frontend can draw belong in the Visualization Type dropdown.
  const visualizations = useMemo(
    () =>
      (problem.visualizations ?? []).filter((v) => VISUALIZATION_TYPE_MAP[v.backendType] !== null),
    [problem.visualizations],
  );
  const reductions = problem.reductions?.to ?? [];
  const targets = [...new Set(reductions.map((reduction) => reduction.target))];

  // --- Selections and panels ------------------------------------------------------------
  const [panel, setPanel] = useState("details");
  const [mode, setMode] = useState("solve");
  const [instance, setInstance] = useState(() =>
    typeof router.query.instance === "string"
      ? router.query.instance
      : (problem.defaultInstance ?? ""),
  );
  const [solverIndex, setSolverIndex] = useState(() =>
    findIndexByName(solvers, router.query.solver),
  );
  const [vizIndex, setVizIndex] = useState(() => findIndexByName(visualizations, router.query.viz));
  const [targetName, setTargetName] = useState(targets[0] ?? null);
  const [reductionClassName, setReductionClassName] = useState(reductions[0]?.className ?? null);
  const [resultNew, setResultNew] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [serializeError, setSerializeError] = useState(null);
  const [lastRun, setLastRun] = useState(null);
  const runIdRef = useRef(0);

  const selectedSolver = solvers[solverIndex] ?? null;
  const selectedViz = visualizations[vizIndex] ?? null;
  const reductionsForTarget = reductions.filter((reduction) => reduction.target === targetName);
  const selectedReduction =
    reductionsForTarget.find((reduction) => reduction.className === reductionClassName) ??
    reductionsForTarget[0] ??
    null;

  // --- Runs ------------------------------------------------------------------------------
  const solveRun = useComputeRequest({ subject: "instance" });
  const pictureRun = useComputeRequest({ subject: "instance" });
  const reduceRun = useComputeRequest({ subject: "instance" });

  const solveResult = solveRun.status === COMPUTE_DONE ? solveRun.result : null;
  const pictureResult = pictureRun.status === COMPUTE_DONE ? pictureRun.result : null;
  const reduceResult = reduceRun.status === COMPUTE_DONE ? reduceRun.result : null;

  const runPictureCurrent =
    Boolean(pictureResult) &&
    pictureResult.instance === instance &&
    pictureResult.vizClassName === selectedViz?.className;
  const solveCurrent = Boolean(solveResult) && solveResult.instance === instance;
  const reduceCurrent =
    Boolean(reduceResult) &&
    reduceResult.instance === instance &&
    reduceResult.reductionClassName === selectedReduction?.className;

  // A new run's picture starts at its first step.
  const [stepsFor, setStepsFor] = useState(pictureRun.result);
  if (stepsFor !== pictureRun.result) {
    setStepsFor(pictureRun.result);
    setCurrentStep(0);
  }

  // The Result dot only means "a run finished while you were not looking".
  if (resultNew && panel === "result") {
    setResultNew(false);
  }

  // --- Default picture and on-picture edits ---------------------------------------------
  const defaultPicture = useDefaultPicture({
    visualization: selectedViz,
    instance,
    enabled: !(mode === "solve" && runPictureCurrent),
  });
  const showingRunPicture = mode === "solve" && runPictureCurrent;
  const edits = useFrameEdits({
    backendType: selectedViz?.backendType,
    baseFrame: showingRunPicture ? null : defaultPicture.frame,
    baseInstance: defaultPicture.instance,
    problemName: problem.name,
  });

  // --- Instance errors -------------------------------------------------------------------
  const runFailure =
    lastRun?.instance === instance
      ? [solveRun, pictureRun, reduceRun].find(
          (request) =>
            request.status === COMPUTE_FAILED && request.failure?.code === "instance_parse_error",
        )?.failure
      : null;
  const instanceError = defaultPicture.instanceError ?? runFailure ?? null;

  // --- URL sync (#150) -------------------------------------------------------------------
  const [debouncedInstance, setDebouncedInstance] = useState(instance);
  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedInstance(instance), INSTANCE_URL_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [instance]);

  const lastSyncedRef = useRef(null);
  const solverParam = solverIndex > 0 ? (solvers[solverIndex]?.name ?? null) : null;
  const vizParam = vizIndex > 0 ? (visualizations[vizIndex]?.name ?? null) : null;
  const instanceParam =
    debouncedInstance !== (problem.defaultInstance ?? "") ? debouncedInstance : null;
  useEffect(() => {
    const serialized = JSON.stringify([instanceParam, solverParam, vizParam]);
    if (lastSyncedRef.current === serialized) return;
    lastSyncedRef.current = serialized;
    const {
      instance: _instance,
      solver: _solver,
      viz: _viz,
      step: _step,
      ...restQuery
    } = router.query;
    const nextQuery = { ...restQuery };
    if (instanceParam !== null) nextQuery.instance = instanceParam;
    if (solverParam !== null) nextQuery.solver = solverParam;
    if (vizParam !== null) nextQuery.viz = vizParam;
    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
  }, [instanceParam, solverParam, vizParam, router]);

  // --- Handlers --------------------------------------------------------------------------
  function togglePanel(key) {
    setPanel((current) => (current === key ? null : key));
  }

  function closePanel() {
    const closing = panel;
    setPanel(null);
    if (closing) document.getElementById(`${ID}-rail-${closing}`)?.focus();
  }

  function openInstancePanel() {
    setPanel("instance");
    requestAnimationFrame(() => document.getElementById(`${ID}-instance-full-instance`)?.focus());
  }

  function selectTarget(name) {
    setTargetName(name);
    setReductionClassName(
      reductions.find((reduction) => reduction.target === name)?.className ?? null,
    );
  }

  const isRunning = solveRun.isRunning || pictureRun.isRunning || reduceRun.isRunning;
  const hasInstance = instance.trim() !== "";
  const canSolve = Boolean(selectedSolver?.className);
  const canReduce = canSolve && Boolean(selectedReduction?.className);
  const runDisabled =
    !hasInstance ||
    Boolean(instanceError) ||
    isRunning ||
    (mode === "solve" ? !canSolve : !canReduce);

  function handleRun() {
    if (runDisabled) return;
    setSerializeError(null);
    let runInstance = instance;
    const serialized = edits.serialize();
    if (serialized) {
      if ("error" in serialized) {
        setSerializeError(serialized.error);
        return;
      }
      runInstance = serialized.instanceText;
      setInstance(runInstance);
    }

    runIdRef.current += 1;
    const runId = runIdRef.current;
    setLastRun({ id: runId, mode, instance: runInstance });
    let succeeded = false;
    const solver = selectedSolver;

    let finished;
    if (mode === "solve") {
      const visualization = selectedViz;
      const answer = solveRun.start(async (signal) => {
        const output = await requestSolvedInstance(
          REDUX_API_BASE_URL,
          solver.className,
          runInstance,
          signal,
        );
        succeeded = true;
        return { output, solverName: solver.name, instance: runInstance, runId };
      });
      const picture = visualization
        ? pictureRun.start(async (signal) => {
            const frames = await requestVisualizedInstance(
              REDUX_API_BASE_URL,
              visualization.className,
              runInstance,
              signal,
              solver.className,
            );
            return {
              frames: Array.isArray(frames) ? frames : [],
              vizClassName: visualization.className,
              solverName: solver.name,
              instance: runInstance,
              runId,
            };
          })
        : Promise.resolve();
      finished = Promise.all([answer, picture]);
    } else {
      const reduction = selectedReduction;
      finished = reduceRun.start(async (signal) => {
        const output = await requestSolvedInstance(
          REDUX_API_BASE_URL,
          solver.className,
          runInstance,
          signal,
        );
        const certificate = asCertificate(output);
        const frames = await requestReducedInstance(
          REDUX_API_BASE_URL,
          reduction.className,
          runInstance,
          certificate,
          signal,
        );
        succeeded = true;
        return {
          frames: Array.isArray(frames) ? frames : [],
          reductionClassName: reduction.className,
          reductionName: reduction.name,
          targetName: reduction.target,
          targetVisualization: reduction.targetVisualization,
          solverName: solver.name,
          certificate,
          instance: runInstance,
        };
      });
    }
    finished.then(() => {
      if (succeeded && runIdRef.current === runId) setResultNew(true);
    });
  }

  // --- What the command bar and picture pane show ------------------------------------------
  const solveRan = Boolean(solveResult);
  const reduceRan = Boolean(reduceResult);
  const runLabel =
    mode === "solve"
      ? solveRan
        ? "Run solve again"
        : "Run solve"
      : reduceRan
        ? "Run reduction again"
        : "Run reduction";

  let modeNote = "";
  if (mode === "solve") {
    if (solvers.length === 0) modeNote = "No solvers are declared for this problem yet.";
    else if (!canSolve)
      modeNote = "This solver cannot be run: the catalog did not say which backend solver it is.";
  } else if (reductions.length === 0) {
    modeNote = `No reductions from ${problem.name} are declared yet.`;
  } else if (!canSolve) {
    modeNote =
      "A reduction carries a solver's answer across, and this problem has no solver to run.";
  } else {
    modeNote = `Run solves the instance with ${selectedSolver.name} first, then carries the answer across.`;
  }

  let showing;
  if (!selectedViz && !reduceRun.isRunning && !(mode === "reduce" && reduceCurrent)) {
    // Nothing to draw: say what ran, without claiming a picture.
    if (solveRun.isRunning) showing = `Running ${selectedSolver?.name ?? "the solver"}.`;
    else if (mode === "solve" && solveCurrent) showing = solveResult.solverName;
    else showing = "Not run yet.";
  } else if (mode === "solve") {
    if (solveRun.isRunning || pictureRun.isRunning)
      showing = `Running ${selectedSolver?.name ?? "the solver"}.`;
    else if (showingRunPicture) showing = pictureResult.solverName;
    else if (solveCurrent)
      showing = `${solveResult.solverName}. The picture shows the instance before solving.`;
    else showing = NOT_RUN_TEXT;
  } else if (reduceRun.isRunning) {
    showing = `Running the reduction to ${selectedReduction?.target ?? "the target"}.`;
  } else if (reduceCurrent) {
    showing = `${problem.name} ${ARROW} ${reduceResult.targetName} (${reduceResult.reductionName})`;
  } else {
    showing = NOT_RUN_TEXT;
  }
  if (instanceError) {
    // Nothing can be drawn from an unreadable instance, so don't claim a default picture.
    showing = `The instance has errors. ${showing === NOT_RUN_TEXT ? "Not run yet." : showing}`;
  }

  // The source (or only) picture.
  let sourceContent;
  if (!selectedViz) {
    sourceContent = {
      kind: "message",
      compact: true,
      text: "This problem has no visualization this site can draw yet.",
    };
  } else if (showingRunPicture) {
    const frame = pictureResult.frames[currentStep] ?? null;
    sourceContent = frame
      ? { kind: "frame", frame, backendType: selectedViz.backendType, name: selectedViz.name }
      : { kind: "message", text: "This run came back without a picture." };
  } else if (defaultPicture.frame) {
    sourceContent = {
      kind: "frame",
      frame: edits.displayFrame,
      backendType: selectedViz.backendType,
      name: selectedViz.name,
      edit: edits,
    };
  } else if (!hasInstance) {
    sourceContent = {
      kind: "message",
      text: "There is no instance to draw. Press Edit to write one.",
    };
  } else if (defaultPicture.status === "done") {
    sourceContent = { kind: "message", text: "Redux returned no picture for this instance." };
  } else if (instanceError) {
    sourceContent = {
      kind: "message",
      tone: "error",
      text: "The instance has a problem, so it can't be drawn. Press Edit next to the instance to fix it.",
    };
  } else if (defaultPicture.status === "failed") {
    sourceContent = {
      kind: "message",
      tone: "error",
      text: `${defaultPicture.failure.headline}. ${defaultPicture.failure.detail}`,
      action: { id: `${ID}-picture-retry`, label: "Try again", onClick: defaultPicture.retry },
    };
  } else {
    sourceContent = { kind: "loading", text: "Drawing the default picture of the instance." };
  }

  const vizTypeControl = selectedViz
    ? {
        options: visualizations.map((visualization, index) => ({
          value: String(index),
          label: visualization.name,
        })),
        value: String(vizIndex),
        onChange: (value) => setVizIndex(Number(value)),
      }
    : null;

  // The reduction's target picture (Reduce mode only).
  let target = null;
  if (mode === "reduce") {
    const targetLabel = selectedReduction?.target ?? targetName ?? "the target";
    const targetViz = reduceCurrent
      ? reduceResult.targetVisualization
      : selectedReduction?.targetVisualization;
    let content;
    if (!selectedReduction) {
      content = { kind: "message", text: `No reductions from ${problem.name} are declared yet.` };
    } else if (reduceCurrent) {
      const frame = reduceResult.frames[1] ?? null;
      content = frame
        ? {
            kind: "frame",
            frame,
            backendType: targetViz?.backendType,
            name: targetViz?.name ?? targetLabel,
          }
        : { kind: "message", text: "This reduction came back without a target picture." };
    } else if (reduceRun.isRunning) {
      content = { kind: "loading", text: `Building the ${targetLabel} instance.` };
    } else if (reduceRun.status === COMPUTE_FAILED && lastRun?.instance === instance) {
      content = {
        kind: "message",
        tone: "error",
        text: "The reduction did not run. The reason is shown under the command bar.",
      };
    } else {
      content = {
        kind: "message",
        text: `Press Run to build the ${targetLabel} instance from this one.`,
      };
    }
    target = {
      title: `Target: ${targetLabel}`,
      type: targetViz ? { options: [{ value: "0", label: targetViz.name }], value: "0" } : null,
      content,
    };
  }

  // The line under the picture when there are no steps to play.
  const runForMode = mode === "solve" ? solveResult : reduceResult;
  let note = null;
  if (serializeError) {
    note = { text: serializeError, tone: "error" };
  } else if (edits.hasPendingEdit && !showingRunPicture) {
    note = {
      text: edits.previewOnly
        ? "This picture has edits that preview here but can't be sent to Run yet for this visualization type."
        : `This picture has edits that are not in the instance yet. Press ${runLabel} to send them.`,
      tone: "warning",
    };
  } else if (instanceError) {
    // The error itself is shown under the command bar (or in the Instance panel).
    note = null;
  } else if (showingRunPicture && pictureResult.frames.length <= 1) {
    note = { text: "This run recorded no steps.", tone: "muted" };
  } else if (showingRunPicture) {
    note = null;
  } else if (mode === "reduce" && reduceCurrent) {
    note = {
      text: `The target picture is the ${reduceResult.targetName} instance the reduction built.`,
      tone: "muted",
    };
  } else if (selectedViz && runForMode && runForMode.instance !== instance) {
    note = {
      text: `The instance changed, so the picture is back to the base instance. Press ${runLabel} to animate it again.`,
      tone: "warning",
    };
  } else if (selectedViz) {
    note = {
      text: `This is the base picture of your instance. Press ${runLabel} to ${
        mode === "solve" ? "animate the solver" : "build the target"
      }.`,
      tone: "muted",
    };
  }

  const legendFrames = [
    sourceContent.kind === "frame" ? sourceContent.frame : null,
    target?.content.kind === "frame" ? target.content.frame : null,
  ];

  // --- Status under the command bar ------------------------------------------------------
  const solverName =
    lastRun?.mode === "solve"
      ? (solveResult?.solverName ?? selectedSolver?.name)
      : selectedSolver?.name;
  let solveAnnouncement = "";
  if (solveRun.status === COMPUTE_RUNNING) {
    solveAnnouncement = `Running ${solverName}. This can take up to a minute.`;
  } else if (solveRun.status === COMPUTE_DONE) {
    solveAnnouncement = `${solveResult.solverName} finished in ${formatSeconds(solveRun.elapsedMs)}.`;
  } else if (solveRun.status === COMPUTE_FAILED) {
    solveAnnouncement = `${solverName} did not run. ${solveRun.failure?.headline ?? ""}`;
  } else if (solveRun.status === COMPUTE_CANCELLED) {
    solveAnnouncement = "Run cancelled.";
  }
  let reduceAnnouncement = "";
  if (reduceRun.status === COMPUTE_RUNNING) {
    reduceAnnouncement = `Running the reduction to ${selectedReduction?.target}. This can take up to a minute.`;
  } else if (reduceRun.status === COMPUTE_DONE) {
    reduceAnnouncement = `The reduction to ${reduceResult.targetName} finished in ${formatSeconds(reduceRun.elapsedMs)}.`;
  } else if (reduceRun.status === COMPUTE_FAILED) {
    reduceAnnouncement = `The reduction did not run. ${reduceRun.failure?.headline ?? ""}`;
  } else if (reduceRun.status === COMPUTE_CANCELLED) {
    reduceAnnouncement = "Run cancelled.";
  }

  function cancelSolve() {
    solveRun.cancel();
    pictureRun.cancel();
  }

  const status = (
    <>
      {instanceError && panel !== "instance" && (
        <Box id={`${ID}-instance-error`} sx={{ fontSize: "0.8125rem", color: "error.light" }}>
          <Box component="span" sx={{ fontWeight: 700 }}>
            {instanceError.headline}.
          </Box>{" "}
          {instanceError.detail}
          {instanceError.expected && (
            <Box component="span" sx={{ display: "block", mt: 0.5 }}>
              Expected: {instanceError.expected}
            </Box>
          )}
        </Box>
      )}
      {modeNote && (
        <Box id={`${ID}-mode-note`} sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
          {modeNote}
        </Box>
      )}
      <Box sx={{ display: mode === "solve" ? "block" : "none" }}>
        <ComputeStatus
          idPrefix={`${ID}-solve`}
          status={solveRun.status}
          announcement={solveAnnouncement}
          failure={solveRun.failure?.code === "instance_parse_error" ? null : solveRun.failure}
          onCancel={cancelSolve}
          busyLabel={`Running ${solverName}`}
        />
        {pictureRun.status === COMPUTE_FAILED && solveRun.status !== COMPUTE_FAILED && (
          <ComputeStatus
            idPrefix={`${ID}-solve-picture`}
            status={COMPUTE_FAILED}
            announcement=""
            failure={{
              ...pictureRun.failure,
              headline: `The picture did not come back: ${pictureRun.failure?.headline ?? ""}`,
            }}
            onCancel={cancelSolve}
            busyLabel=""
          />
        )}
      </Box>
      <Box sx={{ display: mode === "reduce" ? "block" : "none" }}>
        <ComputeStatus
          idPrefix={`${ID}-reduce`}
          status={reduceRun.status}
          announcement={reduceAnnouncement}
          failure={reduceRun.failure?.code === "instance_parse_error" ? null : reduceRun.failure}
          onCancel={reduceRun.cancel}
          busyLabel={`Running the reduction to ${selectedReduction?.target ?? "the target"}`}
        />
      </Box>
    </>
  );

  // --- Rail dots ---------------------------------------------------------------------------
  const accentLine = mode === "solve" ? "brand.line" : "brand.goldLine";
  const dots = {
    instance: instanceError ? { label: "The instance has errors", color: "status.err" } : null,
    result: resultNew && panel !== "result" ? { label: "New result", color: accentLine } : null,
  };

  const solveSummary = solveResult
    ? {
        solverName: solveResult.solverName,
        output: solveResult.output,
        elapsedMs: solveRun.elapsedMs,
        instance: solveResult.instance,
        stepCount:
          pictureResult && pictureResult.runId === solveResult.runId
            ? Math.max(pictureResult.frames.length - 2, 0)
            : null,
      }
    : null;
  const reduceSummary = reduceResult ? { ...reduceResult, elapsedMs: reduceRun.elapsedMs } : null;

  return (
    <Box
      id={ID}
      sx={{
        display: "flex",
        alignItems: "stretch",
        gap: 2,
      }}
    >
      <Rail
        idPrefix={ID}
        openPanel={panel}
        onToggle={togglePanel}
        panelId={PANEL_ID}
        dots={dots}
        accentLine={accentLine}
      />

      <Box
        sx={{
          flex: "1 1 auto",
          minWidth: 0,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 2,
        }}
      >
        <Box
          component="section"
          id={PANEL_ID}
          aria-labelledby={`${PANEL_ID}-heading`}
          hidden={!panel}
          onKeyDown={(event) => {
            if (event.key === "Escape") closePanel();
          }}
          sx={{
            ...cardSx,
            display: panel ? "flex" : "none",
            flex: `0 0 ${PANEL_WIDTH}px`,
            minWidth: 0,
            boxSizing: "border-box",
            px: 2,
            pt: "14px",
            pb: "18px",
            flexDirection: "column",
            gap: 1.5,
            [COMPACT_MEDIA]: {
              position: "fixed",
              left: 0,
              right: 0,
              mx: "auto",
              maxWidth: 720,
              bottom: 72,
              zIndex: 19,
              maxHeight: "70vh",
              overflow: "auto",
              borderRadius: "14px 14px 0 0",
              flexBasis: "auto",
              boxShadow: 8,
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box
              component="h2"
              id={`${PANEL_ID}-heading`}
              sx={{ m: 0, fontSize: "1.125rem", fontWeight: 700 }}
            >
              {panel ? PANEL_TITLES[panel] : ""}
            </Box>
            <Box
              id={`${PANEL_ID}-close`}
              component="button"
              type="button"
              aria-label="Close panel"
              onClick={closePanel}
              sx={{
                width: 44,
                height: 44,
                flex: "none",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: "border.main",
                backgroundColor: "surface.raised",
                color: "text.primary",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: "1.25rem",
                lineHeight: 1,
              }}
            >
              <Box
                component="svg"
                aria-hidden="true"
                viewBox="0 0 14 14"
                sx={{ width: 14, height: 14 }}
              >
                <path
                  d="M3 3l8 8M11 3l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </Box>
            </Box>
          </Box>
          {/* Every panel stays mounted while hidden, so a half-typed certificate or a
              verdict survives closing and reopening the panel. */}
          <Box id={`${PANEL_ID}-details`} sx={{ display: panel === "details" ? "block" : "none" }}>
            <DetailsPanel problem={problem} />
          </Box>
          <Box
            id={`${PANEL_ID}-instance`}
            sx={{ display: panel === "instance" ? "block" : "none" }}
          >
            <InstancePanel
              idPrefix={`${ID}-instance`}
              problem={problem}
              instance={instance}
              onInstanceChange={setInstance}
              instanceError={instanceError}
            />
          </Box>
          <Box id={`${PANEL_ID}-result`} sx={{ display: panel === "result" ? "block" : "none" }}>
            <ResultPanel
              idPrefix={`${ID}-result`}
              problem={problem}
              mode={mode}
              instance={instance}
              solveResult={solveSummary}
              reduceResult={reduceSummary}
            />
          </Box>
        </Box>

        <Box
          sx={{
            flex: "999 1 560px",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <CommandBar
            idPrefix={ID}
            instance={instance}
            instanceHasError={Boolean(instanceError)}
            onEdit={openInstancePanel}
            mode={mode}
            onModeChange={setMode}
            solver={
              solvers.length > 0
                ? {
                    value: String(solverIndex),
                    options: solvers.map((solver, index) => ({
                      value: String(index),
                      label: solver.name,
                    })),
                    onChange: (value) => setSolverIndex(Number(value)),
                  }
                : null
            }
            target={
              targets.length > 0
                ? {
                    value: targetName ?? targets[0],
                    options: targets.map((name) => ({ value: name, label: name })),
                    onChange: selectTarget,
                  }
                : null
            }
            reduction={
              reductionsForTarget.length > 0
                ? {
                    value: selectedReduction.className,
                    options: reductionsForTarget.map((reduction) => ({
                      value: reduction.className,
                      label: reduction.name,
                    })),
                    onChange: setReductionClassName,
                  }
                : null
            }
            runLabel={runLabel}
            runDisabled={runDisabled}
            onRun={handleRun}
            runFill={mode === "solve" ? "brand.fill" : "brand.gold"}
            status={status}
          />

          <VisualizationPane
            idPrefix={ID}
            showing={showing}
            showingIsError={Boolean(instanceError)}
            stack={Boolean(panel)}
            source={{
              title: mode === "solve" ? `${problem.name} instance` : `Source: ${problem.name}`,
              type: vizTypeControl,
              content: sourceContent,
            }}
            target={target}
            steps={
              showingRunPicture
                ? {
                    frameCount: pictureResult.frames.length,
                    currentStep,
                    onStepChange: setCurrentStep,
                  }
                : null
            }
            note={note}
            legendFrames={legendFrames}
          />
        </Box>
      </Box>
    </Box>
  );
}
