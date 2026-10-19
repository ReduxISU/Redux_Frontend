// components/workbench/Workbench.js
//
// #229 stage 1 (stage 2 added the tagged dropdowns and info cards, components/workbench/
// TaggedSelect.js and infoCards.js): the problem page as a workbench with the picture at the center. A rail of
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
//   - Which gadget the pictures highlight (#229 stage 4): the Result panel's Gadgets rows say
//     which one is hovered or focused, and both pictures draw its pieces. The gadgets come
//     with ProblemProvider/reduce's answer (lib/gadgets.js), so they cost no extra request.
//   - Which format the picture comes in (#199): the run's picture and the default picture are
//     asked for through lib/pictureRequest.js, so a picture type with a format=frames renderer
//     (components/pictures/registry.js) is drawn by it, with the step controls walking its
//     frames and each step's caption under it, and every other type keeps its old renderer.
//   - One run, every picture (#252): Run asks ProblemProvider/visualizeRun for the solver's run
//     and every picture of it (lib/pictureRequest.js), so switching the Visualization Type after
//     Run asks for nothing and stays on the same moment of the run (lib/runSteps.js). A picture
//     the run can't draw shows the instance with a note saying why. On a backend without
//     visualizeRun, and for a visualization only the old flat list draws, Run asks for the one
//     chosen picture as before, and switching shows the instance until the next Run.
//   - The Reduction View (#215): Run in Reduce mode first asks ProblemProvider/reductionView
//     (lib/reductionView.js) for the whole reduction in one answer: the target built step by
//     step, solved, and its answer mapped back, with both pictures and the gadgets that link
//     them. The step controls walk its three phases and the two pictures draw side by side
//     (components/pictures/ReductionView.js). A backend without it (404 or 405, remembered for
//     the page), a reduction it can't show (400), or a failure gets the older requests below,
//     so Reduce keeps working as it did.
//     Each side's Visualization Type dropdown stays in the view (ReduxISU/Redux#912), listing the
//     pictures the view can draw for that side (lib/reductionView.js viewPictureWorkable).
//     Choosing one asks Redux for the view again with that picture, on the same phase and step;
//     the choice is kept for the page's life (the source's is the Visualization Type the Solve
//     panes use), and a source picture picked before Run is used when the view can draw it. The
//     dropdown shows what Redux says it drew, so a backend that ignores the choice (older than
//     #912) gets a fixed dropdown naming the default.
//   - The URL: `?instance=`, `?solver=` and `?viz=` round-trip the way the old sections did
//     (#150), so links and playlists that name a solver or visualization still open on it.
//     The old `?step=` is dropped: before Run there are no steps to point at.

import Box from "@mui/material/Box";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { VISUALIZATION_TYPE_MAP } from "../../data/visualizationTypes";
import { CHECK_SOURCE, CHECK_TARGET, useCertificateCheck } from "../../hooks/useCertificateCheck";
import {
  COMPUTE_CANCELLED,
  COMPUTE_DONE,
  COMPUTE_FAILED,
  COMPUTE_RUNNING,
  useComputeRequest,
} from "../../hooks/useComputeRequest";
import { useDefaultPicture } from "../../hooks/useDefaultPicture";
import { useFrameEdits } from "../../hooks/useFrameEdits";
import { highlightIdsOn, normalizeGadgets } from "../../lib/gadgets";
import { drawsFromRun, requestPicture, requestRunPictures } from "../../lib/pictureRequest";
import {
  hasSkippedPairs,
  paneFrame,
  reductionViewWorth,
  requestReductionViewOrNull,
  samePlaceIn,
  viewPictureWorkable,
} from "../../lib/reductionView";
import {
  REDUX_API_BASE_URL,
  requestMappedSolution,
  requestReducedInstance,
  requestReduction,
  requestSolvedInstance,
} from "../../lib/redux";
import { frameAtPosition, framePosition, RUN_END } from "../../lib/runSteps";
import ComputeStatus from "../detail/ComputeStatus";
import { pictureStateStyle, statesInFrames } from "../pictures/pictureStates";
import { pictureAnnotations, pictureLegendFrames, pictureRuns } from "../pictures/registry";
import { paletteVars } from "../theme";
import CommandBar from "./CommandBar";
import {
  reductionCard,
  reductionTags,
  solverCard,
  solverTags,
  targetCard,
  targetTags,
  visualizationCard,
  visualizationTags,
} from "./infoCards";
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

// #229 stage 3: drawing a certificate on the picture. Before any Run, Check is meant to draw
// the certificate right away; after a Run, a well-formed but invalid one offers "Show where it
// fails". No Redux endpoint draws a given certificate yet: ProblemProvider/visualize only draws
// a solver's own answer, and ProblemProvider/verify answers a bare True or False with nothing
// about which parts fail. So the verdict, the button and its Back flow are built, the button
// stays disabled with this reason, and the picture is left as it is. Flip this (and fetch the
// frame) once the backend can draw a certificate. Faking it here per picture type would mean
// re-implementing every verifier in the browser.
const CERTIFICATE_DRAWING_SUPPORTED = false;
const CERTIFICATE_DRAWING_REASON = "Redux can't draw a certificate on this picture yet.";

/**
 * The step a run's picture opens on: its last frame, the finished result. The step controls
 * still go back through the steps, and Play from the last frame replays them from the first.
 * @param {Object[]|undefined} frames The run's frames.
 */
function openingStep(frames) {
  return Math.max((Array.isArray(frames) ? frames.length : 0) - 1, 0);
}

/** A reduction's target picture: the last of visualizeReduction's frames (source, then target). */
function reducedTargetFrame(result) {
  const frames = Array.isArray(result?.frames) ? result.frames : [];
  return frames.length > 1 ? frames[frames.length - 1] : null;
}

/**
 * The note under a picture the run can't draw (#252), saying why and giving the answer.
 * @param {{reason: string}} gap The run's `unavailable` entry for the visualization.
 */
function runGapNote(gap, visualizationName, solverName, answer, runLabel) {
  const answerText = answer ? `The answer: ${answer}.` : "The run stopped before an answer.";
  if (gap.reason === "shape_mismatch") {
    return `${visualizationName} can't draw the steps of ${solverName}, so it shows the instance. ${answerText}`;
  }
  if (gap.reason === "solver_mismatch") {
    return `${solverName} doesn't solve what ${visualizationName} draws, so it shows the instance. ${answerText}`;
  }
  // no_frames, no_renderer (no renderer here for its picture type), or left out of the answer:
  // only a run asked for this visualization alone can draw it.
  return `${visualizationName} isn't drawn from this run, so it shows the instance. ${answerText} Press ${runLabel} to draw a run in it.`;
}

/** What the Result panel says about a Reduction View's solve and map back. */
function viewRunFields(view) {
  const closing = view.frames[view.frames.length - 1];
  return {
    solverName: view.solverName,
    mappedBack: {
      text: closing?.caption ?? "",
      ok: typeof closing?.ok === "boolean" ? closing.ok : null,
    },
  };
}

/**
 * One side's Visualization Type dropdown in the Reduction View (ReduxISU/Redux#912). Its value
 * is the picture Redux says it drew (or the one being asked for while it draws it); a backend
 * that does not say (older than #912) always draws the side's default, so the dropdown is fixed
 * on the visualization drawing that picture type, the default first.
 * @param {"source"|"target"} which
 * @param {Object[]} all Every visualization of the side's problem, the default first.
 * @param {{visualization: string|null, type: string}} side The view's side.
 * @param {string|null} pending The picture being asked for, while it is.
 * @param {(className: string) => void} onPick
 */
function viewTypeControl(which, all, side, pending, onPick) {
  const option = (visualization) => ({
    value: visualization.className,
    label: visualization.name,
    tags: visualizationTags(visualization),
    card: visualizationCard(visualization, which),
  });
  if (!side.visualization) {
    const drawn = all.find((visualization) => visualization.pictureType === side.type) ?? all[0];
    return drawn ? { options: [option(drawn)], value: drawn.className } : null;
  }
  const value = pending ?? side.visualization;
  const workable = all.filter((visualization) => viewPictureWorkable(visualization, which));
  if (!workable.some((visualization) => visualization.className === value)) {
    const named = all.find((visualization) => visualization.className === value);
    workable.unshift(named ?? { className: value, name: value });
  }
  return { options: workable.map(option), value, onChange: onPick };
}

/** The name of a visualization among `all` by class name, or null. */
function visualizationName(all, className) {
  return all.find((visualization) => visualization.className === className)?.name ?? null;
}

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
  // The gadget row being hovered or focused, by the run it belongs to: `{runId, index}`.
  const [gadgetHighlight, setGadgetHighlight] = useState(null);
  const runIdRef = useRef(0);
  // #912: the picture each side of the Reduction View is drawn with, kept for the page's life.
  // The source's follows the Visualization Type (null) until one is picked in the view; the
  // target's is kept per target problem.
  const [sourceViewPick, setSourceViewPick] = useState(null);
  const [targetViewPicks, setTargetViewPicks] = useState({});

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
  // #912: asking for the Reduction View again with another picture on one side. Its own
  // request, so a slower answer to an earlier pick never lands over a later one.
  const viewSwitch = useComputeRequest({ subject: "instance" });

  const solveResult = solveRun.status === COMPUTE_DONE ? solveRun.result : null;
  const pictureResult = pictureRun.status === COMPUTE_DONE ? pictureRun.result : null;
  const reduceResult = reduceRun.status === COMPUTE_DONE ? reduceRun.result : null;

  // The run's picture for the chosen visualization: from one run's pictures (#252), or the one
  // picture a run asked for alone. `runGap` is the reason one run has no picture for it.
  const pictureRunCurrent = Boolean(pictureResult) && pictureResult.instance === instance;
  let runPicture = null;
  let runGap = null;
  if (pictureRunCurrent && selectedViz) {
    if (pictureResult.run) {
      runPicture = pictureResult.run.pictures[selectedViz.className] ?? null;
      if (!runPicture) {
        runGap = pictureResult.run.unavailable[selectedViz.className] ?? {
          reason: "missing",
          detail: "",
        };
      }
    } else if (pictureResult.vizClassName === selectedViz.className) {
      runPicture = pictureResult;
    }
  }
  const runPictureCurrent = Boolean(runPicture);
  const solveCurrent = Boolean(solveResult) && solveResult.instance === instance;
  const reduceCurrent =
    Boolean(reduceResult) &&
    reduceResult.instance === instance &&
    reduceResult.reductionClassName === selectedReduction?.className;
  // #215: the current reduction's Reduction View, when Redux sent one; #912: drawn with the
  // pictures last picked for it, once Redux has sent that view.
  const [switchedView, setSwitchedView] = useState(null);
  const [switchNote, setSwitchNote] = useState(null);
  const [switchPending, setSwitchPending] = useState(null);
  const switchedCurrent =
    reduceCurrent && Boolean(switchedView) && switchedView.runId === reduceResult.runId;
  const reduceView =
    mode === "reduce" && reduceCurrent
      ? ((switchedCurrent ? switchedView.view : reduceResult.view) ?? null)
      : null;
  const switching =
    Boolean(reduceView) && viewSwitch.isRunning && switchPending?.runId === reduceResult.runId;

  // --- Verify (#229 stage 3) --------------------------------------------------------------
  // The target side is the reduction's target problem, checked against the instance the
  // reduction built; it has an instance (and so unlocks) only while that run is current.
  const reduceTargetName = reduceCurrent
    ? reduceResult.targetName
    : (selectedReduction?.target ?? targetName ?? null);
  const verifyContext = `${mode}:${lastRun?.id ?? 0}`;
  const verify = useCertificateCheck({
    source: {
      name: problem.name,
      label: `${problem.name} instance`,
      verifier: problem.verifier ?? null,
      instance,
    },
    target:
      mode === "reduce" && reduceTargetName
        ? {
            name: reduceTargetName,
            label: `${reduceTargetName} target`,
            verifier: reduceCurrent
              ? reduceResult.targetVerifier
              : (selectedReduction?.targetVerifier ?? null),
            instance: reduceCurrent ? reduceResult.targetInstance : null,
          }
        : null,
    context: verifyContext,
  });

  // Which verdict (by its id) has "Show where it fails" switched on.
  const [overlayFor, setOverlayFor] = useState(null);

  // --- Map a solution across (#229 stage 3) -----------------------------------------------
  const mapRun = useComputeRequest({ subject: "certificate" });
  const [mapSolverIndex, setMapSolverIndex] = useState(solverIndex);
  const mapResult = mapRun.status === COMPUTE_DONE ? mapRun.result : null;
  const mapCurrent = Boolean(mapResult) && reduceCurrent && mapResult.runId === reduceResult.runId;

  // Which of the picture's other runs the steps follow (#204: an NFA's one path), by id; null
  // is the run's own frames.
  const [runView, setRunView] = useState(null);

  // Where in the run the pictures are (lib/runSteps.js), kept across switching the
  // Visualization Type (#252). Only read on a switch; the step controls move currentStep.
  const [runPosition, setRunPosition] = useState(RUN_END);

  // A new run's picture opens on its last step (the finished result), on its own frames.
  const [stepsFor, setStepsFor] = useState(pictureRun.result);
  if (stepsFor !== pictureRun.result) {
    const landed = pictureRun.result;
    setStepsFor(landed);
    setCurrentStep(
      openingStep(
        landed?.run ? landed.run.pictures[selectedViz?.className]?.frames : landed?.frames,
      ),
    );
    setRunView(null);
    setRunPosition(RUN_END);
  }

  // #215: where the Reduction View's steps are. A new reduction opens on its first step, the
  // start of Build, as the mockup's does.
  const [reduceStep, setReduceStep] = useState(0);
  const [reduceStepsFor, setReduceStepsFor] = useState(reduceRun.result);
  if (reduceStepsFor !== reduceRun.result) {
    setReduceStepsFor(reduceRun.result);
    setReduceStep(0);
  }
  // #912: another picture's view opens on the same phase and step as the one before it.
  const [switchLanded, setSwitchLanded] = useState(viewSwitch.result);
  if (switchLanded !== viewSwitch.result) {
    const landed = viewSwitch.result;
    setSwitchLanded(landed);
    if (landed && landed.runId === reduceResult?.runId) {
      if (landed.view) {
        setSwitchedView({ runId: landed.runId, view: landed.view });
        setReduceStep(samePlaceIn(landed.fromFrames, landed.fromIndex, landed.view.frames));
      } else {
        setSwitchNote("Redux couldn't draw that picture here, so the view keeps the one before.");
      }
    }
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
  // #204: the other runs a format=frames picture offers (an NFA's paths, registry.js
  // pictureRuns), and the frames the steps walk: the chosen one's, or the run's own.
  const otherRuns =
    showingRunPicture && runPicture.format === "frames"
      ? pictureRuns(runPicture.type, runPicture.payload)
      : [];
  const chosenRun = otherRuns.find((run) => run.id === runView) ?? null;
  const runFrames = showingRunPicture ? (chosenRun ? chosenRun.frames : runPicture.frames) : [];
  // Following another run (or all branches again) opens it on its last step too.
  function chooseRun(id) {
    setRunView(id);
    const run = otherRuns.find((candidate) => candidate.id === id);
    setCurrentStep(openingStep(run ? run.frames : runPicture?.frames));
  }

  // #252: switching the Visualization Type after one run keeps the run and the moment in it.
  // The new picture opens on the frame drawn from the same solver step, or the nearest one
  // before it (lib/runSteps.js). A picture with no steps on screen (one the run can't draw, or
  // another of the picture's runs) leaves the kept moment as it was.
  function chooseVisualization(index) {
    setVizIndex(index);
    setSourceViewPick(null);
    if (!pictureRunCurrent || !pictureResult.run) return;
    let position = runPosition;
    if (showingRunPicture && !chosenRun) {
      position = framePosition(runFrames, currentStep) ?? runPosition;
    }
    const next = pictureResult.run.pictures[visualizations[index]?.className];
    setRunPosition(position);
    setCurrentStep(next ? frameAtPosition(next.frames, position) : 0);
    setRunView(null);
  }
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

  // #912: the pictures the Reduction View is asked for: the source's Visualization Type (or the
  // one picked in the view) and the target's last pick, each only when the view can draw it.
  const sourceViewPicture =
    sourceViewPick ?? (viewPictureWorkable(selectedViz, "source") ? selectedViz.className : null);
  function targetViewPicture(reduction) {
    const pick = targetViewPicks[reduction?.target];
    return pick &&
      (reduction?.targetVisualizations ?? []).some(
        (visualization) =>
          visualization.className === pick && viewPictureWorkable(visualization, "target"),
      )
      ? pick
      : null;
  }

  /** Draws one side of the Reduction View with another picture, on the same step. */
  function chooseViewPicture(which, className) {
    if (!reduceView) return;
    const run = reduceResult;
    let source = sourceViewPicture;
    let target = targetViewPicture(selectedReduction);
    if (which === "source") {
      source = className;
      setSourceViewPick(className);
      const index = visualizations.findIndex(
        (visualization) => visualization.className === className,
      );
      if (index !== -1) setVizIndex(index);
    } else {
      target = className;
      setTargetViewPicks((picks) => ({ ...picks, [run.targetName]: className }));
    }
    const fromFrames = reduceView.frames;
    const fromIndex = Math.min(reduceStep, fromFrames.length - 1);
    setSwitchNote(null);
    setSwitchPending({ runId: run.runId, which, source, target });
    viewSwitch.start(async (signal) => {
      const view = await requestReductionViewOrNull({
        reduction: run.reductionClassName,
        instance: run.instance,
        sourceVisualization: source,
        targetVisualization: target,
        signal,
      });
      return { view, runId: run.runId, fromFrames, fromIndex };
    });
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

    // A new Run draws with the pictures picked so far; a switch still on its way is dropped.
    viewSwitch.reset();
    setSwitchNote(null);
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
      const oneRun = drawsFromRun(visualization);
      const picture = visualization
        ? pictureRun.start(async (signal) => {
            const ran = { solverName: solver.name, instance: runInstance, runId };
            // #252: one run and every picture of it, when the backend has visualizeRun.
            if (oneRun) {
              const run = await requestRunPictures({
                instance: runInstance,
                solver: solver.className,
                signal,
              });
              if (run) return { run, ...ran };
            }
            // #199: {format, frames} plus, for a format=frames picture, its type and payload.
            const picture = await requestPicture({
              visualization,
              instance: runInstance,
              solver: solver.className,
              signal,
            });
            return { ...picture, vizClassName: visualization.className, ...ran };
          })
        : Promise.resolve();
      finished = Promise.all([answer, picture]);
    } else {
      const reduction = selectedReduction;
      const pictures = {
        sourceVisualization: sourceViewPicture,
        targetVisualization: targetViewPicture(reduction),
      };
      finished = reduceRun.start(async (signal) => {
        const ran = {
          reductionClassName: reduction.className,
          reductionName: reduction.name,
          targetName: reduction.target,
          targetVisualization: reduction.targetVisualization,
          targetVerifier: reduction.targetVerifier ?? null,
          instance: runInstance,
          runId,
        };
        // #215: the Reduction View, when the backend has it for this reduction. It builds the
        // target, solves it with a solver for the target and maps the answer back, so the
        // source solver chosen above is not used.
        const view = await requestReductionViewOrNull({
          reduction: reduction.className,
          instance: runInstance,
          ...pictures,
          signal,
        });
        if (view) {
          succeeded = true;
          return {
            ...ran,
            view,
            frames: [],
            reductionName: view.reductionName || reduction.name,
            targetInstance: view.target.instance,
            gadgets: view.gadgets,
            solverClassName: null,
            certificate: null,
            ...viewRunFields(view),
          };
        }
        // The target instance's text (for the Result panel and Check against: target) comes
        // from ProblemProvider/reduce, which needs no answer, so it is asked for alongside the
        // solve. Without it the run still draws; the target side of Verify just stays locked.
        // The same answer carries the reduction's gadgets on a backend that has them (#229
        // stage 4); without them the Gadgets section stays hidden.
        const builtReduction = requestReduction(
          REDUX_API_BASE_URL,
          reduction.className,
          runInstance,
          signal,
        ).then(
          (built) => ({
            instance:
              typeof built?.reductionTo?.instance === "string" ? built.reductionTo.instance : null,
            gadgets: normalizeGadgets(built?.gadgets),
          }),
          (error) => {
            if (error?.name === "AbortError") throw error;
            return { instance: null, gadgets: [] };
          },
        );
        // The solve below may throw first; this keeps the request running alongside it from
        // also surfacing as an unhandled rejection. Awaiting it later still sees the result.
        builtReduction.catch(() => {});
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
        const built = await builtReduction;
        succeeded = true;
        return {
          ...ran,
          view: null,
          frames: Array.isArray(frames) ? frames : [],
          targetInstance: built.instance,
          gadgets: built.gadgets,
          solverName: solver.name,
          solverClassName: solver.className,
          certificate,
          mappedBack: null,
        };
      });
    }
    // After a reduction, Verify checks against the target it built (the mockup's default),
    // when the target problem has a verifier to check with.
    const checkTargetAfter = mode === "reduce" && Boolean(selectedReduction?.targetVerifier);
    finished.then(() => {
      if (!succeeded || runIdRef.current !== runId) return;
      setResultNew(true);
      if (checkTargetAfter) verify.setCheckOn(CHECK_TARGET);
    });
  }

  // --- Verify This Answer and Map a solution across ----------------------------------------
  function handleVerifyAnswer() {
    if (!solveCurrent) return;
    verify.check(asCertificate(solveResult.output), CHECK_SOURCE);
  }

  const mapSolver = solvers[mapSolverIndex] ?? null;
  const mapReuses = reduceCurrent && mapSolver?.className === reduceResult.solverClassName;
  const mapDisabled =
    !reduceCurrent || !mapSolver?.className || mapRun.isRunning || reduceRun.isRunning;

  function handleMap() {
    if (mapDisabled) return;
    const run = reduceResult;
    const solver = mapSolver;
    const reuse = mapReuses;
    mapRun.start(async (signal) => {
      const answer = reuse
        ? run.certificate
        : asCertificate(
            await requestSolvedInstance(REDUX_API_BASE_URL, solver.className, run.instance, signal),
          );
      const mapped = await requestMappedSolution(
        REDUX_API_BASE_URL,
        run.reductionClassName,
        run.instance,
        answer,
        signal,
      );
      return {
        certificate: asCertificate(mapped),
        solverName: solver.name,
        reused: reuse,
        runId: run.runId,
      };
    });
  }

  function handleVerifyMapped() {
    if (!mapCurrent || verify.targetLocked) return;
    verify.check(mapResult.certificate, CHECK_TARGET);
  }

  let mapHint = "";
  if (!reduceCurrent) {
    mapHint = reduceRun.isRunning
      ? "Waiting for the reduction to build the target instance."
      : "The instance changed. Run the reduction again to map an answer onto the new target.";
  } else if (!mapSolver) {
    mapHint = `${problem.name} has no solver to produce an answer to map.`;
  } else if (!mapSolver.className) {
    mapHint = "This solver cannot be run: the catalog did not say which backend solver it is.";
  } else if (mapReuses) {
    mapHint = `Uses ${mapSolver.name}'s answer from this run. Nothing new runs.`;
  } else {
    mapHint = `There's no ${mapSolver.name} answer from this run, so this solves the ${problem.name} instance first. That's the expensive step.`;
  }
  let mapAnnouncement = "";
  if (mapRun.status === COMPUTE_RUNNING) mapAnnouncement = "Mapping the answer across.";
  else if (mapRun.status === COMPUTE_DONE)
    mapAnnouncement = `Mapped ${mapResult.solverName}'s answer onto the target.`;
  else if (mapRun.status === COMPUTE_FAILED)
    mapAnnouncement = `The answer was not mapped. ${mapRun.failure?.headline ?? ""}`;
  else if (mapRun.status === COMPUTE_CANCELLED) mapAnnouncement = "Mapping cancelled.";

  // --- The verdict on the Showing line ------------------------------------------------------
  // A check never touches the picture's own state (the run, its current step). Its verdict
  // shows only while it still describes what is on screen: the same mode and run, and the
  // instance it was checked against. A new Run or an instance edit retires it.
  const checked = verify.verdict;
  const checkedSideInstance =
    checked?.side === CHECK_TARGET
      ? reduceCurrent
        ? reduceResult.targetInstance
        : null
      : instance;
  const verdictCurrent =
    Boolean(checked) &&
    checked.context === verifyContext &&
    checked.instance === checkedSideInstance;
  // Whether the picture holds a run's answer worth protecting (solved, or reduced).
  const pictureRan = mode === "solve" ? showingRunPicture : reduceCurrent;
  let verdictLine = null;
  if (verdictCurrent) {
    const text =
      checked.valid === null
        ? `Verifier: Redux answered "${checked.text}" for your certificate on the ${checked.label}`
        : `Verifier: your certificate on the ${checked.label} is ${checked.valid ? "valid" : "not valid"}`;
    let button = null;
    // After a Run, only a well-formed but invalid certificate offers to show where it fails;
    // a valid one gets the verdict alone (the picture already shows a correct answer). A new
    // Check is a new verdict, so it starts with the overlay off.
    if (pictureRan && checked.valid === false) {
      const on = CERTIFICATE_DRAWING_SUPPORTED && overlayFor === checked.id;
      button = {
        id: `${ID}-verdict-overlay`,
        label: on
          ? mode === "solve"
            ? "Back to the solver's answer"
            : "Back to the reduction"
          : "Show where it fails",
        pressed: on,
        disabled: !CERTIFICATE_DRAWING_SUPPORTED,
        reason: CERTIFICATE_DRAWING_SUPPORTED ? "" : CERTIFICATE_DRAWING_REASON,
        onClick: () => setOverlayFor(on ? null : checked.id),
      };
    }
    verdictLine = { id: `${ID}-verdict`, text, valid: checked.valid, button };
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
  } else if (reductionViewWorth(selectedReduction?.className)) {
    modeNote = `Run builds the ${selectedReduction.target} instance step by step, solves it, and maps its answer back to this one.`;
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
    if (reduceView?.solverName) showing += `, solved by ${reduceView.solverName}`;
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
    const frame = runFrames[currentStep] ?? null;
    if (!frame) {
      sourceContent = { kind: "message", text: "This run came back without a picture." };
    } else if (runPicture.format === "frames") {
      sourceContent = {
        kind: "picture",
        type: runPicture.type,
        payload: runPicture.payload,
        // #250: the picture's hand-made layout is kept for this instance and visualization.
        layoutKey: `${instance}\u0000${selectedViz.className}`,
        frame,
        frameIndex: currentStep,
        frameCount: runFrames.length,
        frames: runFrames,
        name: selectedViz.name,
        showCaption: true,
        runs: otherRuns.length
          ? {
              options: otherRuns.map(({ id, label, accepted }) => ({ id, label, accepted })),
              value: chosenRun ? chosenRun.id : null,
              onChange: chooseRun,
            }
          : null,
      };
    } else {
      sourceContent = {
        kind: "frame",
        frame,
        backendType: selectedViz.backendType,
        name: selectedViz.name,
      };
    }
  } else if (defaultPicture.picture) {
    sourceContent = {
      kind: "picture",
      type: defaultPicture.picture.type,
      payload: defaultPicture.picture.payload,
      layoutKey: `${instance}\u0000${selectedViz.className}`,
      // The plain frame (hooks/useDefaultPicture.js): the instance, not a step of a run.
      frame: defaultPicture.picture.frame,
      frameIndex: null,
      frameCount: 0,
      name: selectedViz.name,
      showCaption: false,
    };
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
          tags: visualizationTags(visualization),
          card: visualizationCard(visualization, "source"),
        })),
        value: String(vizIndex),
        onChange: (value) => chooseVisualization(Number(value)),
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
      const frame = reducedTargetFrame(reduceResult);
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
    // #912: before a Run that draws a Reduction View, the target's picture can be picked
    // here too, from the ones the view can draw; the Run draws the target with it.
    const viewTargets =
      !reduceCurrent && reductionViewWorth(selectedReduction?.className)
        ? (selectedReduction.targetVisualizations ?? []).filter((visualization) =>
            viewPictureWorkable(visualization, "target"),
          )
        : [];
    const targetOption = (visualization) => ({
      value: visualization.className,
      label: visualization.name,
      tags: visualizationTags(visualization),
      card: visualizationCard(visualization, "target"),
    });
    let targetType = null;
    if (viewTargets.length > 1) {
      targetType = {
        options: viewTargets.map(targetOption),
        value: targetViewPicture(selectedReduction) ?? viewTargets[0].className,
        onChange: (className) =>
          setTargetViewPicks((picks) => ({ ...picks, [selectedReduction.target]: className })),
      };
    } else if (targetViz) {
      targetType = { options: [targetOption(targetViz)], value: targetViz.className };
    }
    target = {
      title: `Target: ${targetLabel}`,
      type: targetType,
      content,
    };
  }

  // --- Gadgets (#229 stage 4) ----------------------------------------------------------------
  // Only a current reduction's gadgets, in Reduce mode. The hovered or focused row's pieces
  // are drawn on each picture that has them (lib/gadgets.js picks the ids each picture uses).
  const reduceGadgets = mode === "reduce" && reduceCurrent ? (reduceResult.gadgets ?? []) : [];
  const activeGadget =
    gadgetHighlight && reduceCurrent && gadgetHighlight.runId === reduceResult.runId
      ? (reduceGadgets[gadgetHighlight.index] ?? null)
      : null;
  if (activeGadget && sourceContent.kind === "frame") {
    sourceContent = {
      ...sourceContent,
      highlightIds: highlightIdsOn(
        sourceContent.frame,
        activeGadget.sourceIds,
        activeGadget.legacySourceIds,
      ),
    };
  }
  if (activeGadget && target?.content.kind === "frame") {
    target = {
      ...target,
      content: {
        ...target.content,
        highlightIds: highlightIdsOn(
          target.content.frame,
          activeGadget.targetIds,
          activeGadget.legacyTargetIds,
        ),
      },
    };
  }

  function handleGadgetHighlight(index, leaving) {
    if (index !== null) {
      if (reduceCurrent) setGadgetHighlight({ runId: reduceResult.runId, index });
      return;
    }
    setGadgetHighlight((current) =>
      leaving === undefined || current?.index === leaving ? null : current,
    );
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
  } else if (verdictLine && !pictureRan && checked.valid !== null && selectedViz) {
    // Before any Run the certificate would be drawn on the picture right away.
    note = {
      text: `${CERTIFICATE_DRAWING_REASON} The picture still shows the instance.`,
      tone: "muted",
    };
  } else if (mode === "solve" && runGap) {
    note = {
      text: runGapNote(
        runGap,
        selectedViz.name,
        pictureResult.run.solverName ?? pictureResult.solverName,
        asCertificate(pictureResult.run.answer),
        runLabel,
      ),
      tone: "muted",
    };
  } else if (showingRunPicture && runFrames.length <= 1) {
    note = { text: "This run recorded no steps.", tone: "muted" };
  } else if (showingRunPicture) {
    note = null;
  } else if (reduceView) {
    // The Reduction View's own caption says what each step does.
    note = switchNote && !switching ? { text: switchNote, tone: "warning" } : null;
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
  // #199: a format=frames picture's key lists the states its whole run uses, so the key does
  // not change while stepping; a Quantum Circuit's lists only the step on screen's (#210,
  // registry.js pictureLegendFrames).
  let legendStates = null;
  let legendAnnotations = null;
  if (reduceView) {
    // #215: both pictures' states and annotations over the whole view, so the key holds still
    // while stepping, and the view's own marks: the gadget link and, on a Graph target, the
    // pairs a rule leaves unjoined.
    const sides = [reduceView.source, reduceView.target];
    const panes = sides.map((side, index) =>
      reduceView.frames.map((frame) => paneFrame(frame, index === 0 ? "source" : "target", null)),
    );
    legendStates = statesInFrames(panes.flat());
    const entries = [];
    const seen = new Set();
    sides.forEach((side, index) => {
      for (const entry of pictureAnnotations(side.type, side.payload, panes[index])) {
        const key = `${entry.key}|${entry.text}`;
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({ ...entry, key: `${index === 0 ? "source" : "target"}-${entry.key}` });
      }
    });
    if (reduceView.target.type === "Graph" && hasSkippedPairs(reduceView)) {
      entries.push({
        key: "rule-says-no",
        text: "Rule says no (a pair the reduction leaves unjoined on purpose)",
        swatch: { kind: "line", color: pictureStateStyle("Blocked").line, dash: "6 5" },
      });
    }
    if (reduceView.gadgets.length > 0) {
      entries.push({
        key: "gadget-link",
        text: "Linked by a gadget (point at a piece to see what it became or came from)",
        swatch: { kind: "ring", color: paletteVars.viz.gadget },
      });
    }
    legendAnnotations = entries;
  } else if (sourceContent.kind === "picture") {
    const frames = pictureLegendFrames(
      sourceContent.type,
      sourceContent.frame,
      showingRunPicture ? runFrames : null,
    );
    legendStates = statesInFrames(frames);
    legendAnnotations = pictureAnnotations(sourceContent.type, sourceContent.payload, frames, {
      plain: !showingRunPicture,
    });
  }

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

  let targetLockReason = "";
  if (mode === "reduce" && reduceTargetName) {
    if (reduceRun.isRunning) targetLockReason = `Building the ${reduceTargetName} instance.`;
    else if (reduceCurrent && !reduceResult.targetInstance)
      targetLockReason = `Redux did not send the ${reduceTargetName} instance it built, so there is nothing to check against.`;
    else
      targetLockReason = `Run the reduction first: checking against ${reduceTargetName} needs the target instance it builds.`;
  }

  // --- Rail dots ---------------------------------------------------------------------------
  // Only a Run sets the Result dot. A Check or a mapping happens with the panel open, so
  // neither adds one.
  const accentLine = mode === "solve" ? "brand.line" : "brand.goldLine";
  const dots = {
    instance: instanceError ? { label: "The instance has errors", color: "status.err" } : null,
    result: resultNew && panel !== "result" ? { label: "New result", color: accentLine } : null,
  };

  // The picture the Result panel counts steps from: the chosen visualization's, of this run.
  const countedPicture = pictureResult?.run
    ? (pictureResult.run.pictures[selectedViz?.className] ?? null)
    : pictureResult;
  const solveSummary = solveResult
    ? {
        solverName: solveResult.solverName,
        output: solveResult.output,
        elapsedMs: solveRun.elapsedMs,
        instance: solveResult.instance,
        // An old flat list is [base, ...steps, solved]; a format=frames run is one frame per
        // step, its last one the solved picture (#199).
        stepCount:
          countedPicture && pictureResult.runId === solveResult.runId
            ? countedPicture.format === "frames"
              ? countedPicture.frames.length
              : Math.max(countedPicture.frames.length - 2, 0)
            : null,
      }
    : null;
  const reduceSummary = reduceResult
    ? {
        ...reduceResult,
        // #912: another target picture may run another solver; the panel reports the view shown.
        ...(switchedCurrent && switchedView.view ? viewRunFields(switchedView.view) : {}),
        elapsedMs: reduceRun.elapsedMs,
      }
    : null;

  // #912: the Reduction View's dropdowns, and what it says while it draws another picture.
  let reductionPane = null;
  if (reduceView) {
    const targetAll =
      reductions.find((reduction) => reduction.className === reduceResult.reductionClassName)
        ?.targetVisualizations ?? [];
    const sourceAll = problem.visualizations ?? [];
    let loading = null;
    if (switching) {
      const name =
        switchPending.which === "source"
          ? visualizationName(sourceAll, switchPending.source)
          : visualizationName(targetAll, switchPending.target);
      loading = `Drawing the reduction again with ${name ?? "the picture you chose"}.`;
    }
    reductionPane = {
      view: reduceView,
      activeGadget,
      runId: reduceResult.runId,
      loading,
      types: {
        source: viewTypeControl(
          "source",
          sourceAll,
          reduceView.source,
          switching ? switchPending.source : null,
          (className) => chooseViewPicture("source", className),
        ),
        target: viewTypeControl(
          "target",
          targetAll,
          reduceView.target,
          switching ? switchPending.target : null,
          (className) => chooseViewPicture("target", className),
        ),
      },
    };
  }

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
              onVerifyAnswer={handleVerifyAnswer}
              map={
                mode === "reduce" && reduceSummary
                  ? {
                      select:
                        solvers.length > 0
                          ? {
                              value: String(mapSolverIndex),
                              options: solvers.map((solver, index) => ({
                                value: String(index),
                                label: solver.name,
                                tags: solverTags(solver),
                                card: solverCard(solver),
                              })),
                              onChange: (value) => setMapSolverIndex(Number(value)),
                            }
                          : null,
                      onMap: handleMap,
                      disabled: mapDisabled,
                      hint: mapHint,
                      request: mapRun,
                      announcement: mapAnnouncement,
                      mapped: mapCurrent ? mapResult : null,
                      onVerifyMapped: verify.targetLocked ? null : handleVerifyMapped,
                    }
                  : null
              }
              verifyProps={{
                verify,
                sourceName: problem.name,
                targetName: reduceTargetName,
                targetLockReason,
              }}
              gadgets={
                reduceGadgets.length > 0
                  ? {
                      runId: reduceResult.runId,
                      gadgets: reduceGadgets,
                      sourceFrame: sourceContent.kind === "frame" ? sourceContent.frame : null,
                      targetFrame: reducedTargetFrame(reduceResult),
                      activeIndex: activeGadget ? gadgetHighlight.index : null,
                      onHighlight: handleGadgetHighlight,
                    }
                  : null
              }
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
                      tags: solverTags(solver),
                      card: solverCard(solver),
                    })),
                    onChange: (value) => setSolverIndex(Number(value)),
                  }
                : null
            }
            target={
              targets.length > 0
                ? {
                    value: targetName ?? targets[0],
                    options: targets.map((name) => {
                      const targetProblem = reductions.find(
                        (reduction) => reduction.target === name,
                      )?.targetProblem;
                      return {
                        value: name,
                        label: name,
                        tags: targetTags(targetProblem),
                        card: targetCard(name, targetProblem),
                      };
                    }),
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
                      tags: reductionTags(reduction),
                      card: reductionCard(reduction, problem.name),
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
            verdict={verdictLine}
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
                    frameCount: runFrames.length,
                    currentStep,
                    onStepChange: setCurrentStep,
                  }
                : reduceView && !switching
                  ? {
                      frameCount: reduceView.frames.length,
                      currentStep: Math.min(reduceStep, reduceView.frames.length - 1),
                      onStepChange: setReduceStep,
                    }
                  : null
            }
            reduction={reductionPane}
            note={note}
            legendFrames={legendFrames}
            legendStates={legendStates}
            legendAnnotations={legendAnnotations}
          />
        </Box>
      </Box>
    </Box>
  );
}
