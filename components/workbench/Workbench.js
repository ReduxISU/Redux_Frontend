// components/workbench/Workbench.js
//
// #229 stage 1 (stage 2 added the tagged dropdowns and info cards, components/workbench/
// TaggedSelect.js and infoCards.js): the problem page as a workbench with the picture at the
// center. Replaced the old page's five draggable sections (components/ProblemDetailLayout.js);
// the drag-to-reorder is dropped on purpose.
//
// #279 stage 1 (board F) replaced #229's rail and one-panel-at-a-time side panel. Top to bottom:
//   - a bar of five toggles (./PaneToggles.js): Details, Instance, Visualization, Execute,
//     Verify, and Reset layout. They show and hide the parts below; hooks/useWorkbenchLayout.js
//     keeps which are shown (and whether Details and Instance are expanded) in this browser;
//   - the Details pane: collapsed, its Input -> Output line; Show all for the rest;
//   - the Instance pane: collapsed, the instance as one editable line; Show all for the rest;
//   - the one Workspace pane (./Workspace.js) with three sections: Visualization (the pictures,
//     steps, Legend, and Gadgets), Execute (Mode, the dropdowns and the run buttons, each run's status, and
//     the result that was the Result panel's) and Verify (./panels/VerifyBox.js). Hiding all
//     three hides the Workspace. Hidden parts stay on the page, so nothing typed is lost.
//
// What this component owns, and why here:
//   - The one instance value. Every part of the page reads it, and editing it anywhere
//     resets the picture to the base instance: a run's picture and result are tagged with
//     the instance they ran on and only shown while that is still the instance (derived,
//     not an effect, so there is no moment where a stale picture shows).
//   - The runs (hooks/useComputeRequest.js), #279 stage 2: Solve (the solver's answer and the
//     run's picture), Reduce (builds the target instance, and solves nothing), and Solve
//     <target> (the target's solver on the instance Reduce built). Solve <source> in Reduce
//     mode is the same Solve as Solve mode's, with the same result. One run at a time: while
//     one is going, every other run button is disabled ("Another run is going").
//   - The answers carried across a reduction (#279 stage 2): once the target is solved its answer
//     is mapped back to the source (ProblemProvider/mapSolutionBack), and once the source is
//     solved its answer is mapped into the target (ProblemProvider/mapSolution). Mapping runs in
//     polynomial time, so neither takes a button. A reduction that can't map answers one way
//     (no backward map, or a mapSolution stub that answers "", ReduxISU/Redux#823) says "Not
//     available" there, remembered for the page.
//   - When answers and pictures change: an answer appears only after a button press, an instance
//     edit retires every answer (the chips say "Changed"), and changing the solver, target,
//     reduction or mode leaves the pictures on the last run.
//   - The default picture before a run (hooks/useDefaultPicture.js), which is also how an
//     unreadable instance is found before anyone presses Solve.
//   - Which gadget the pictures highlight (#229 stage 4): the Gadgets rows (under the pictures) say
//     which one is hovered or focused, and both pictures draw its pieces. The gadgets come
//     with ProblemProvider/reduce's answer (lib/gadgets.js), so they cost no extra request.
//   - Which format the picture comes in (#199): the run's picture and the default picture are
//     asked for through lib/pictureRequest.js, so a picture type with a format=frames renderer
//     (components/pictures/registry.js) is drawn by it, with the step controls walking its
//     frames and each step's caption under it, and every other type keeps its old renderer.
//   - One run, every picture (#252): Solve asks ProblemProvider/visualizeRun for the solver's run
//     and every picture of it (lib/pictureRequest.js), so switching the Visualization Type after
//     Solve asks for nothing and stays on the same moment of the run (lib/runSteps.js). A picture
//     the run can't draw shows the instance with a note saying why. On a backend without
//     visualizeRun, and for a visualization only the old flat list draws, Solve asks for the one
//     chosen picture as before, and switching shows the instance until the next Solve.
//   - The Reduction View (#215): Reduce first asks ProblemProvider/reductionView
//     (lib/reductionView.js) for the whole reduction in one answer: the target built step by
//     step, solved, and its answer mapped back, with both pictures and the gadgets that link
//     them. The step controls walk its phases and the two pictures draw side by side
//     (components/pictures/ReductionView.js). #279 stage 2: Reduce shows only its Build phase,
//     since Reduce answers nothing; Solve <target> asks for the view again with the chosen
//     target solver and shows all three phases. A backend without the view (404 or 405,
//     remembered for the page), a reduction it can't show (400), or a failure gets
//     ProblemProvider/reduce instead, and the target is drawn as the default picture of the
//     instance it built.
//     Each side's Visualization Type dropdown stays in the view (ReduxISU/Redux#912), listing the
//     pictures the view can draw for that side (lib/reductionView.js viewPictureWorkable).
//     Choosing one asks Redux for the view again with that picture, on the same phase and step;
//     the choice is kept for the page's life (the source's is the Visualization Type the Solve
//     panes use), and a source picture picked before Reduce is used when the view can draw it. The
//     dropdown shows what Redux says it drew, so a backend that ignores the choice (older than
//     #912) gets a fixed dropdown naming the default.
//   - What the Visualization section says and draws (#279 stage 3): the Showing lines (Problem
//     and Algorithm in Solve mode; the Reduction, and each picture's own Problem and Algorithm, in
//     Reduce mode, where a side's own solver wins over an answer carried across), the placeholder
//     target before a build, Algorithm Steps opening by itself once a run gives it steps (unless
//     the viewer closed it, hooks/useWorkbenchLayout.js), and a solved source showing its answer
//     in Reduce mode while no Reduction View is on screen.
//   - The URL: `?instance=`, `?solver=` and `?viz=` round-trip the way the old sections did
//     (#150), so links and playlists that name a solver or visualization still open on it.
//     The old `?step=` is dropped: before Run there are no steps to point at.

import Box from "@mui/material/Box";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import useGadgetColorMode from "../../hooks/useGadgetColorMode";
import useWorkbenchLayout, { WORKSPACE_SECTIONS } from "../../hooks/useWorkbenchLayout";
import {
  agreeLine,
  answerFound,
  answerText,
  noAnswerClaim,
  solverGuarantee,
} from "../../lib/answers";
import { gadgetColorMap, highlightIdsOn, normalizeGadgets } from "../../lib/gadgets";
import { drawsFromRun, requestPicture, requestRunPictures } from "../../lib/pictureRequest";
import {
  hasSkippedPairs,
  paneFrame,
  pieceNamer,
  reductionViewWorth,
  requestReductionViewOrNull,
  samePlaceIn,
  viewPictureWorkable,
} from "../../lib/reductionView";
import {
  REDUX_API_BASE_URL,
  ReduxRequestError,
  requestMappedSolution,
  requestMappedSolutionBack,
  requestReduction,
  requestSolvedInstance,
} from "../../lib/redux";
import { frameAtPosition, framePosition, RUN_END } from "../../lib/runSteps";
import { GADGET_PALETTE } from "../pictures/gadgetRings";
import { pictureStateStyle, statesInFrames } from "../pictures/pictureStates";
import { pictureAnnotations, pictureLegendFrames, pictureRuns } from "../pictures/registry";
import { paletteVars } from "../theme";
import CollapsiblePane from "./CollapsiblePane";
import CommandBar from "./CommandBar";
import {
  reductionCard,
  reductionTags,
  solverCard,
  solverRunTags,
  targetCard,
  visualizationCard,
  visualizationTags,
} from "./infoCards";
import PaneToggles, { PANE_LABELS } from "./PaneToggles";
import DetailsPanel, { DetailsSummary } from "./panels/DetailsPanel";
import GadgetsSection from "./panels/GadgetsSection";
import InstancePanel from "./panels/InstancePanel";
import ReduceCells from "./panels/ReduceCells";
import ResultPanel from "./panels/ResultPanel";
import VerifyBox from "./panels/VerifyBox";
import { formatSeconds, runChip, runFailure } from "./RunParts";
import VisualizationPane from "./VisualizationPane";
import Workspace, { WorkspaceSection } from "./Workspace";

const ID = "workbench";
// #279: the id of what each rail toggle shows.
const LAYOUT_REGIONS = {
  details: `${ID}-details-pane`,
  instance: `${ID}-instance-pane`,
  visualization: `${ID}-section-visualization`,
  execute: `${ID}-section-execute`,
  verify: `${ID}-section-verify`,
};
const INSTANCE_URL_DEBOUNCE_MS = 400;
const NOT_RUN_TEXT = "Not run yet (default picture)";
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

/**
 * #279 stage 2: a Reduction View cut to its Build phase. Reduce answers nothing, so the view it
 * shows stops where the target is built; Solve <target> brings the Solve and Map back phases.
 * Null when the view has no Build frames.
 */
function buildPhaseOnly(view) {
  if (!view) return null;
  const frames = view.frames.filter((frame) => frame.phase === "build");
  return frames.length > 0 ? { ...view, frames } : null;
}

/** A 404 or 405 (a backend without the endpoint), or a 400 with one of `codes`. */
function declined(error, codes) {
  if (!(error instanceof ReduxRequestError)) return false;
  if (error.status === 404 || error.status === 405) return true;
  return error.status === 400 && codes.includes(error.payload?.error);
}

/**
 * Starts `perform` once for each new set of `args`, for the answers carried across a reduction:
 * they fill in by themselves once their inputs exist (#279 stage 2). The result is only read
 * while it is for the current args.
 * @param {Object|null} args What the conversion is of; null while its inputs don't exist.
 * @param {(args: Object, signal: AbortSignal) => Promise<unknown>} perform A module-level
 *   function, so it depends on nothing but `args`.
 */
function useConversion(args, perform) {
  const request = useComputeRequest({ subject: "certificate" });
  const key = args === null ? null : JSON.stringify(args);
  const [startedFor, setStartedFor] = useState(null);
  const { start } = request;
  const run = useCallback(
    (forKey) => {
      setStartedFor(forKey);
      start(async (signal) => ({ key: forKey, value: await perform(JSON.parse(forKey), signal) }));
    },
    [start, perform],
  );
  useEffect(() => {
    if (key === null || key === startedFor) return undefined;
    const timeoutId = setTimeout(() => run(key), 0);
    return () => clearTimeout(timeoutId);
  }, [key, startedFor, run]);
  const kept = request.kept?.result;
  const mine = key !== null && startedFor === key;
  return {
    value: kept && kept.key === key ? kept.value : undefined,
    loading: mine && request.isRunning,
    startedAt: request.startedAt,
    failure: mine ? runFailure(request) : null,
    retry: () => {
      if (key !== null) run(key);
    },
  };
}

/** Maps a target answer back to the source; "unavailable" when the reduction can't. */
async function mapBack({ reduction, instance, answer }, signal) {
  try {
    const mapped = await requestMappedSolutionBack(
      REDUX_API_BASE_URL,
      reduction,
      instance,
      answer,
      signal,
    );
    return { certificate: answerText(mapped) };
  } catch (error) {
    if (!declined(error, ["no_backward_map"])) throw error;
    return { unavailable: true };
  }
}

/** Maps a source answer into the target; "unavailable" when the reduction can't. */
async function mapForward({ reduction, instance, answer }, signal) {
  const mapped = answerText(
    await requestMappedSolution(REDUX_API_BASE_URL, reduction, instance, answer, signal),
  );
  // A mapSolution stub answers "" for every answer (ReduxISU/Redux#823).
  return mapped.trim() === "" ? { unavailable: true } : { certificate: mapped };
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
  // #239: the pictures the view can't draw are listed after the rest, greyed, saying why.
  const unworkable = all
    .filter((visualization) => !workable.includes(visualization))
    .map((visualization) => ({
      ...option(visualization),
      disabled: true,
      reason:
        which === "source" && visualization.pictureType === "SearchTree"
          ? "Grows from a solver's steps, and this side runs no solver."
          : "The Reduction View can't draw this picture yet.",
    }));
  return { options: [...workable.map(option), ...unworkable], value, onChange: onPick };
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

/**
 * A solve's chip: found (green) or not, with its round-trip time. A "no" is red only from an
 * exact solver; from any other it proves nothing, so it stays neutral.
 */
function answerChip(kept) {
  const time = formatSeconds(kept.elapsedMs);
  const label = `${time}, round trip`;
  if (answerFound(kept.result.output)) {
    return { tone: "ok", text: `Answer found · ${time}`, label: `Answer found, ${label}` };
  }
  return {
    tone: kept.result.guarantee === "exact" ? "err" : "neutral",
    text: `No answer found · ${time}`,
    label: `No answer found, ${label}`,
  };
}

const ANOTHER_RUN = "Another run is going";

// A live region's text is spoken, not shown: what it says is on screen already.
const visuallyHiddenSx = {
  position: "absolute",
  width: "1px",
  height: "1px",
  p: 0,
  m: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

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

  // --- Selections and layout ------------------------------------------------------------
  const layout = useWorkbenchLayout();
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
  const [currentStep, setCurrentStep] = useState(0);
  const [serializeError, setSerializeError] = useState(null);
  const [lastRun, setLastRun] = useState(null);
  // The gadget row being hovered or focused, by the run it belongs to: `{runId, index}`.
  const [gadgetHighlight, setGadgetHighlight] = useState(null);
  // #239: the Reduction View's gadget marks, Plain or Color, kept for this viewer.
  const [gadgetMarkMode, setGadgetMarkMode] = useGadgetColorMode();
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
  // #279 stage 2: Solve <target>, on the instance the last Reduce built.
  const targetRun = useComputeRequest({ subject: "instance" });
  // #912: asking for the Reduction View again with another picture on one side. Its own
  // request, so a slower answer to an earlier pick never lands over a later one.
  const viewSwitch = useComputeRequest({ subject: "instance" });

  // #279 stage 2: each run's last result stays through a later Cancel ("Cancelled keeps the last
  // result"); the pictures stay on it while another run of the same kind goes or fails, and the
  // answers show while the run isn't going or failed.
  const settled = (request) => !request.isRunning && request.status !== COMPUTE_FAILED;
  const solveKept = solveRun.kept?.result ?? null;
  const solveResult = settled(solveRun) ? solveKept : null;
  const pictureResult = pictureRun.kept?.result ?? null;
  // The last build, while it is of this instance. Changing the Target or Reduction leaves the
  // pictures and the cells on it until the next Reduce (its chip says "Changed").
  const buildKept = reduceRun.kept?.result ?? null;
  const reduceResult = buildKept && buildKept.instance === instance ? buildKept : null;
  const reduceCurrent = Boolean(reduceResult);
  const buildShown = reduceCurrent && settled(reduceRun);
  const buildMatchesChoice = reduceResult?.reductionClassName === selectedReduction?.className;
  // The target's last solve, while it is of the build on screen.
  const targetKept = targetRun.kept?.result ?? null;
  const targetSolved =
    reduceCurrent && targetKept && targetKept.buildRunId === reduceResult.runId ? targetKept : null;
  const targetResult = targetSolved && settled(targetRun) ? targetSolved : null;

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
  // #215: the current build's Reduction View, when Redux sent one: Build only after Reduce, all
  // three phases once the target is solved (#279 stage 2); #912: drawn with the pictures last
  // picked for it, once Redux has sent that view.
  const [switchedView, setSwitchedView] = useState(null);
  const [switchNote, setSwitchNote] = useState(null);
  const [switchPending, setSwitchPending] = useState(null);
  const baseView = targetSolved?.view ?? reduceResult?.view ?? null;
  const switchedCurrent =
    reduceCurrent && Boolean(switchedView) && switchedView.runId === reduceResult.runId;
  const reduceView =
    mode === "reduce" && reduceCurrent
      ? ((switchedCurrent ? switchedView.view : baseView) ?? null)
      : null;
  const switching =
    Boolean(reduceView) && viewSwitch.isRunning && switchPending?.runId === reduceResult.runId;

  // --- Verify (#229 stage 3) --------------------------------------------------------------
  // The target side is the reduction's target problem, checked against the instance the
  // reduction built; it has an instance (and so unlocks) only while that build is current.
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

  // --- Answers carried across (#279 stage 2) ----------------------------------------------
  // The reductions found unable to map answers one way, by class name, for the page's life.
  const [noBackMap, setNoBackMap] = useState(() => new Set());
  const [noForwardMap, setNoForwardMap] = useState(() => new Set());
  const backReduction = reduceResult?.reductionClassName ?? null;
  const targetAnswer = targetResult ? answerText(targetResult.output) : "";
  const backMap = useConversion(
    targetResult && answerFound(targetResult.output) && !noBackMap.has(backReduction)
      ? { reduction: backReduction, instance: reduceResult.instance, answer: targetAnswer }
      : null,
    mapBack,
  );
  const sourceAnswer = solveCurrent ? answerText(solveResult.output) : "";
  const forwardMap = useConversion(
    reduceCurrent &&
      solveCurrent &&
      answerFound(solveResult.output) &&
      !noForwardMap.has(backReduction)
      ? { reduction: backReduction, instance, answer: sourceAnswer }
      : null,
    mapForward,
  );
  // A reduction found unable to map one way is remembered, so that cell says so from then on.
  if (backMap.value?.unavailable && !noBackMap.has(backReduction)) {
    setNoBackMap(new Set(noBackMap).add(backReduction));
  }
  if (forwardMap.value?.unavailable && !noForwardMap.has(backReduction)) {
    setNoForwardMap(new Set(noForwardMap).add(backReduction));
  }

  // Which of the picture's other runs the steps follow (#204: an NFA's one path), by id; null
  // is the run's own frames.
  const [runView, setRunView] = useState(null);

  // Where in the run the pictures are (lib/runSteps.js), kept across switching the
  // Visualization Type (#252). Only read on a switch; the step controls move currentStep.
  const [runPosition, setRunPosition] = useState(RUN_END);

  // A new run's picture opens on its last step (the finished result), on its own frames.
  const [stepsFor, setStepsFor] = useState(pictureResult);
  if (stepsFor !== pictureResult) {
    const landed = pictureResult;
    setStepsFor(landed);
    setCurrentStep(
      openingStep(
        landed?.run ? landed.run.pictures[selectedViz?.className]?.frames : landed?.frames,
      ),
    );
    setRunView(null);
    setRunPosition(RUN_END);
  }

  // #215: where the Reduction View's steps are. #274: a new view opens on its last step, as a
  // solve opens on its finished result: the end of Build after Reduce, the end of Map back after
  // Solve <target> (#279 stage 2); the step controls and the phase buttons still go back.
  const [reduceStep, setReduceStep] = useState(0);
  const [reduceStepsFor, setReduceStepsFor] = useState(baseView);
  if (reduceStepsFor !== baseView) {
    setReduceStepsFor(baseView);
    setReduceStep(openingStep(baseView?.frames));
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

  // --- Default picture and on-picture edits ---------------------------------------------
  const defaultPicture = useDefaultPicture({
    visualization: selectedViz,
    instance,
    enabled: !(mode === "solve" && runPictureCurrent),
  });
  const showingRunPicture = mode === "solve" && runPictureCurrent;
  // #279 stage 2: the target picture after a Reduce that drew no Reduction View.
  const targetPicture = useDefaultPicture({
    visualization: reduceCurrent ? reduceResult.targetVisualization : null,
    instance: reduceCurrent ? (reduceResult.targetInstance ?? "") : "",
    enabled: mode === "reduce" && reduceCurrent && !reduceResult.view,
  });
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
  const runParseFailure =
    lastRun?.instance === instance
      ? [solveRun, pictureRun, reduceRun].find(
          (request) =>
            request.status === COMPUTE_FAILED && request.failure?.code === "instance_parse_error",
        )?.failure
      : null;
  const instanceError = defaultPicture.instanceError ?? runParseFailure ?? null;

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
    const solved = targetSolved;
    let source = sourceViewPicture;
    let target = targetViewPicture(
      reductions.find((reduction) => reduction.className === run.reductionClassName),
    );
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
        // #279 stage 2: once the target is solved, the view shows that solver's run; before,
        // only its Build phase.
        solver: solved?.solverClassName ?? null,
        signal,
      });
      return {
        view: solved ? view : buildPhaseOnly(view),
        runId: run.runId,
        fromFrames,
        fromIndex,
      };
    });
  }

  // #279 stage 2: one run at a time. While one is going, every other run button is disabled.
  const solving = solveRun.isRunning || pictureRun.isRunning;
  const isRunning = solving || reduceRun.isRunning || targetRun.isRunning;
  const hasInstance = instance.trim() !== "";
  const canSolve = Boolean(selectedSolver?.className);
  const canReduce = Boolean(selectedReduction?.className);
  const instanceBlocked = !hasInstance || Boolean(instanceError);
  const solveDisabled = instanceBlocked || isRunning || !canSolve;
  const reduceDisabled = instanceBlocked || isRunning || !canReduce;

  // The instance a run sends: the instance, or the picture's edits written into it first.
  function instanceToRun() {
    setSerializeError(null);
    const serialized = edits.serialize();
    if (!serialized) return instance;
    if ("error" in serialized) {
      setSerializeError(serialized.error);
      return null;
    }
    setInstance(serialized.instanceText);
    return serialized.instanceText;
  }

  function beginRun(runMode, runInstance) {
    runIdRef.current += 1;
    const runId = runIdRef.current;
    setLastRun({ id: runId, mode: runMode, instance: runInstance });
    return runId;
  }

  /** Solve: Solve mode's button and Reduce mode's "Solve <source>", the same run. */
  function handleSolve() {
    if (solveDisabled) return;
    const runInstance = instanceToRun();
    if (runInstance === null) return;
    const runId = beginRun("solve", runInstance);
    const solver = selectedSolver;
    const visualization = selectedViz;
    solveRun.start(async (signal) => {
      const output = await requestSolvedInstance(
        REDUX_API_BASE_URL,
        solver.className,
        runInstance,
        signal,
      );
      return {
        output,
        solverName: solver.name,
        guarantee: solverGuarantee(solver),
        instance: runInstance,
        runId,
      };
    });
    if (!visualization) return;
    const oneRun = drawsFromRun(visualization);
    pictureRun.start(async (signal) => {
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
    });
  }

  function cancelSolve() {
    solveRun.cancel();
    pictureRun.cancel();
  }

  /** Reduce: builds the target instance, and solves nothing (#279 stage 2). */
  function handleReduce() {
    if (reduceDisabled) return;
    const runInstance = instanceToRun();
    if (runInstance === null) return;
    const runId = beginRun("reduce", runInstance);
    const reduction = selectedReduction;
    const pictures = {
      sourceVisualization: sourceViewPicture,
      targetVisualization: targetViewPicture(reduction),
    };
    // A new build draws with the pictures picked so far; a switch still on its way is dropped.
    viewSwitch.reset();
    setSwitchNote(null);
    let succeeded = false;
    const finished = reduceRun.start(async (signal) => {
      const ran = {
        reductionClassName: reduction.className,
        reductionName: reduction.name,
        targetName: reduction.target,
        targetVisualization: reduction.targetVisualization,
        targetVerifier: reduction.targetVerifier ?? null,
        targetSolvers: reduction.targetSolvers ?? [],
        pictures,
        instance: runInstance,
        runId,
      };
      // #215: the Reduction View, when the backend has it for this reduction, cut to its Build
      // phase. It carries the target instance and the gadgets too.
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
          view: buildPhaseOnly(view),
          reductionName: view.reductionName || reduction.name,
          targetInstance: view.target.instance,
          gadgets: view.gadgets,
        };
      }
      // Without the view, ProblemProvider/reduce builds the target; the same answer carries the
      // reduction's gadgets on a backend that has them (#229 stage 4).
      const built = await requestReduction(
        REDUX_API_BASE_URL,
        reduction.className,
        runInstance,
        signal,
      );
      succeeded = true;
      return {
        ...ran,
        view: null,
        targetInstance:
          typeof built?.reductionTo?.instance === "string" ? built.reductionTo.instance : null,
        gadgets: normalizeGadgets(built?.gadgets),
      };
    });
    // After a build, Verify checks against the target it built (the mockup's default), when
    // the target problem has a verifier to check with. A new build retires the last target
    // solve, which was of the build before.
    const checkTargetAfter = Boolean(reduction.targetVerifier);
    finished.then(() => {
      if (!succeeded || runIdRef.current !== runId) return;
      targetRun.reset();
      if (checkTargetAfter) verify.setCheckOn(CHECK_TARGET);
    });
  }

  // --- Solve <target> (#279 stage 2) -------------------------------------------------------
  // The target's solver is kept per target problem, the first one until another is picked.
  const [targetSolverPicks, setTargetSolverPicks] = useState({});
  const cellTargetName = reduceResult?.targetName ?? selectedReduction?.target ?? targetName ?? "";
  const cellTargetSolvers = reduceCurrent
    ? reduceResult.targetSolvers
    : (selectedReduction?.targetSolvers ?? []);
  const targetSolverIndex = Math.min(
    targetSolverPicks[cellTargetName] ?? 0,
    Math.max(cellTargetSolvers.length - 1, 0),
  );
  const targetSolver = cellTargetSolvers[targetSolverIndex] ?? null;
  let targetHint = "";
  if (!reduceCurrent) {
    targetHint = `Reduce first: Solve ${cellTargetName} works on the built instance.`;
  } else if (!targetSolver) {
    targetHint = `${cellTargetName} has no solver declared yet, so there is nothing to solve it with.`;
  } else if (!targetSolver.className) {
    targetHint = "This solver cannot be run: the catalog did not say which backend solver it is.";
  } else if (reduceResult.targetInstance === null) {
    targetHint = `Redux did not send the ${cellTargetName} instance it built, so there is nothing to solve.`;
  } else if (isRunning) {
    targetHint = ANOTHER_RUN;
  }
  const targetDisabled = Boolean(targetHint);

  function handleSolveTarget() {
    if (targetDisabled) return;
    const build = reduceResult;
    const solver = targetSolver;
    // The view is asked for again with this solver, drawn with the pictures on screen.
    const pictures = switchedCurrent
      ? {
          sourceVisualization: switchedView.view.source.visualization ?? null,
          targetVisualization: switchedView.view.target.visualization ?? null,
        }
      : build.pictures;
    viewSwitch.reset();
    setSwitchedView(null);
    setSwitchNote(null);
    targetRun.start(async (signal) => {
      // Both at once: the answer, and the Reduction View with this solver's run. A view that
      // can't draw this solver (or doesn't come back) leaves the picture on the build.
      const viewRequest = build.view
        ? requestReductionViewOrNull({
            reduction: build.reductionClassName,
            instance: build.instance,
            ...pictures,
            solver: solver.className,
            signal,
          }).catch((error) => {
            if (error?.name === "AbortError") throw error;
            return null;
          })
        : Promise.resolve(null);
      // The solve below may throw first; this keeps the view request from also surfacing as an
      // unhandled rejection. Awaiting it later still sees the result.
      viewRequest.catch(() => {});
      const output = await requestSolvedInstance(
        REDUX_API_BASE_URL,
        solver.className,
        build.targetInstance,
        signal,
      );
      const view = await viewRequest;
      return {
        output,
        solverName: solver.name,
        solverClassName: solver.className,
        guarantee: solverGuarantee(solver),
        buildRunId: build.runId,
        view,
        viewMissed: Boolean(build.view) && !view,
      };
    });
  }

  // --- Check it -----------------------------------------------------------------------------
  // #279: the check happens in the Verify section, so it is shown if it was hidden. Stage 4
  // gives each side its own Verify strip.
  function checkIn(side, certificate) {
    layout.show("verify");
    verify.check(certificate, side);
  }

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
  const runLabel = mode === "solve" ? "Solve" : "Reduce";

  let modeNote = "";
  if (mode === "solve") {
    if (solvers.length === 0) modeNote = "No solvers are declared for this problem yet.";
    else if (!canSolve)
      modeNote = "This solver cannot be run: the catalog did not say which backend solver it is.";
  } else if (reductions.length === 0) {
    modeNote = `No reductions from ${problem.name} are declared yet.`;
  } else {
    modeNote = `Reduce builds the ${selectedReduction?.target ?? "target"} instance from this one and solves nothing. Solve each side in its cell below.`;
  }

  // #279 stage 3: the Showing lines. Solve mode says the problem and what drew the picture;
  // Reduce mode says the reduction, and each picture says its own Problem and Algorithm.
  let showing;
  let showingIsError = false;
  if (mode === "solve") {
    let algorithm;
    if (solving) {
      algorithm = `Running ${selectedSolver?.name ?? "the solver"}. The picture updates when it finishes.`;
    } else if (showingRunPicture) {
      algorithm = pictureResult.solverName;
    } else if (solveCurrent) {
      algorithm = selectedViz
        ? `${solveResult.solverName} (the picture shows the instance before solving)`
        : solveResult.solverName;
    } else {
      algorithm = selectedViz ? NOT_RUN_TEXT : "Not run yet";
    }
    if (instanceError) {
      // Nothing can be drawn from an unreadable instance, so don't claim a default picture.
      algorithm = `The instance has errors. ${algorithm === NOT_RUN_TEXT ? "Not run yet." : algorithm}`;
      showingIsError = true;
    }
    showing = { problem: problem.name, algorithm };
  } else {
    showing = {
      reduction: reduceCurrent
        ? reduceResult.reductionName
        : (selectedReduction?.name ?? `No reductions from ${problem.name} are declared yet`),
    };
  }

  // #279 stage 3: in Reduce mode with no Reduction View on screen, a solved source shows its
  // answer: the run's last step, with no steps to walk (Algorithm Steps walks the reduction).
  const answeredSource = mode === "reduce" && !reduceView && runPictureCurrent;
  const answeredFrames = answeredSource ? runPicture.frames : [];

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
  } else if (answeredSource && answeredFrames.length > 0) {
    const last = answeredFrames.length - 1;
    sourceContent =
      runPicture.format === "frames"
        ? {
            kind: "picture",
            type: runPicture.type,
            payload: runPicture.payload,
            layoutKey: `${instance} ${selectedViz.className}`,
            frame: answeredFrames[last],
            frameIndex: last,
            frameCount: answeredFrames.length,
            frames: answeredFrames,
            name: selectedViz.name,
            showCaption: false,
          }
        : {
            kind: "frame",
            frame: answeredFrames[last],
            backendType: selectedViz.backendType,
            name: selectedViz.name,
          };
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
      // #279 stage 2: without a Reduction View, the target is the default picture of the
      // instance Reduce built (the build solved nothing, so there is no answer to draw).
      const builtTarget = reduceResult.targetName;
      if (targetPicture.picture) {
        content = {
          kind: "picture",
          type: targetPicture.picture.type,
          payload: targetPicture.picture.payload,
          layoutKey: `${reduceResult.targetInstance}\u0000${targetViz?.className}`,
          frame: targetPicture.picture.frame,
          frameIndex: null,
          frameCount: 0,
          name: targetViz?.name ?? builtTarget,
          showCaption: false,
        };
      } else if (targetPicture.frame) {
        content = {
          kind: "frame",
          frame: targetPicture.frame,
          backendType: targetViz?.backendType,
          name: targetViz?.name ?? builtTarget,
        };
      } else if (reduceResult.targetInstance === null) {
        content = {
          kind: "message",
          text: `Redux did not send the ${builtTarget} instance it built, so it can't be drawn.`,
        };
      } else if (!targetViz) {
        content = {
          kind: "message",
          text: `${builtTarget} has no visualization this site can draw yet.`,
        };
      } else if (targetPicture.status === "failed") {
        content = {
          kind: "message",
          tone: "error",
          text: `${targetPicture.failure.headline}. ${targetPicture.failure.detail}`,
          action: {
            id: `${ID}-target-picture-retry`,
            label: "Try again",
            onClick: targetPicture.retry,
          },
        };
      } else if (targetPicture.status === "done") {
        content = { kind: "message", text: "Redux returned no picture for this instance." };
      } else {
        content = { kind: "loading", text: `Drawing the ${builtTarget} instance.` };
      }
    } else if (reduceRun.isRunning) {
      content = { kind: "loading", text: `Building the ${targetLabel} instance.` };
    } else if (reduceRun.status === COMPUTE_FAILED && lastRun?.instance === instance) {
      content = {
        kind: "message",
        tone: "error",
        text: "The reduction did not build. The reason is shown under Reduce, in Execute.",
      };
    } else {
      // #279 stage 3: a placeholder frame the source picture's size, until Reduce builds it.
      content = {
        kind: "placeholder",
        text: `Not built yet. Press Reduce to build the ${targetLabel} instance from this one.`,
      };
    }
    // #912: before a Reduce that draws a Reduction View, the target's picture can be picked
    // here too, from the ones the view can draw; Reduce draws the target with it.
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
      title: `Target · ${reduceCurrent ? reduceResult.targetName : targetLabel}`,
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
  // #239: a format=frames picture (the default picture before a Reduction View, or on a backend
  // without one) is marked the same way, through its payload's ids.
  if (activeGadget && sourceContent.kind === "picture") {
    sourceContent = {
      ...sourceContent,
      highlightIds: highlightIdsOn(
        sourceContent.payload,
        activeGadget.sourceIds,
        activeGadget.legacySourceIds,
      ),
    };
  }
  if (activeGadget && target?.content.kind === "picture") {
    target = {
      ...target,
      content: {
        ...target.content,
        highlightIds: highlightIdsOn(
          target.content.payload,
          activeGadget.targetIds,
          activeGadget.legacyTargetIds,
        ),
      },
    };
  }
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

  // #239: the Gadgets rows name pieces the way the pictures label them, and in the Reduction
  // View's Color mode carry each gadget's color.
  let gadgetNamers = null;
  if (reduceView) {
    gadgetNamers = {
      source: pieceNamer(reduceView.source.payload),
      target: pieceNamer(reduceView.target.payload),
    };
  } else if (sourceContent.kind === "picture") {
    gadgetNamers = { source: pieceNamer(sourceContent.payload), target: null };
  }
  const gadgetRowColors =
    reduceView && gadgetMarkMode === "color"
      ? gadgetColorMap(reduceView.gadgets, GADGET_PALETTE).byGadget
      : null;

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
  const runForMode = mode === "solve" ? solveKept : buildKept;
  let note = null;
  if (serializeError) {
    note = { text: serializeError, tone: "error" };
  } else if (edits.hasPendingEdit && !showingRunPicture) {
    note = {
      text: edits.previewOnly
        ? "This picture has edits that preview here but can't be sent to a run yet for this visualization type."
        : `This picture has edits that are not in the instance yet. Press ${runLabel} to send them.`,
      tone: "warning",
    };
  } else if (instanceError) {
    // The error itself is shown under the instance field (or under the run buttons while the Instance pane
    // is hidden).
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
        answerText(pictureResult.run.answer),
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
    if (switchNote && !switching) note = { text: switchNote, tone: "warning" };
    else if (targetSolved?.viewMissed && !switchedCurrent) {
      note = {
        text: `The Reduction View can't show ${targetSolved.solverName}'s run, so the picture stays on the build. Its answer is in Execute.`,
        tone: "muted",
      };
    } else note = null;
  } else if (mode === "reduce" && reduceCurrent) {
    note = {
      text: `The target picture is the ${reduceResult.targetName} instance the reduction built.`,
      tone: "muted",
    };
  } else if (answeredSource) {
    note = {
      text: `The ${problem.name} picture shows ${pictureResult.solverName}'s answer. Press Reduce to build the target.`,
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
      // #239: Color mode's colors, and that they repeat past the palette's size.
      if (gadgetMarkMode === "color") {
        const used = new Set(gadgetColorMap(reduceView.gadgets, GADGET_PALETTE).byGadget.values());
        GADGET_PALETTE.filter((color) => used.has(color)).forEach((color, index) => {
          entries.push({
            key: `gadget-color-${index}`,
            text:
              index === 0
                ? `Gadget colors (Color mode: each gadget's pieces share a color on both sides${
                    used.size >= GADGET_PALETTE.length
                      ? `; with more than ${GADGET_PALETTE.length} gadgets the colors repeat`
                      : ""
                  })`
                : `Gadget color ${index + 1}`,
            swatch: { kind: "ring", color },
          });
        });
      }
    }
    legendAnnotations = entries;
  } else if (sourceContent.kind === "picture") {
    const ran = showingRunPicture || answeredSource;
    const frames = pictureLegendFrames(
      sourceContent.type,
      sourceContent.frame,
      showingRunPicture ? runFrames : answeredSource ? answeredFrames : null,
    );
    legendStates = statesInFrames(frames);
    legendAnnotations = pictureAnnotations(sourceContent.type, sourceContent.payload, frames, {
      plain: !ran,
    });
  }

  // --- The Execute section (#279 stage 2) -----------------------------------------------------
  const sourceName = problem.name;
  const solverName =
    lastRun?.mode === "solve"
      ? (solveKept?.solverName ?? selectedSolver?.name)
      : selectedSolver?.name;

  // What each run's live region says, spoken when it changes (the chips and boxes are what is
  // read). A failure's details are in its box.
  function announce(request, { running, done, failed }) {
    if (request.status === COMPUTE_RUNNING) return `${running} This can take up to a minute.`;
    if (request.status === COMPUTE_DONE && request.kept)
      return `${done} Took ${formatSeconds(request.kept.elapsedMs)}.`;
    if (request.status === COMPUTE_FAILED) return `${failed} ${request.failure?.headline ?? ""}`;
    if (request.status === COMPUTE_CANCELLED) return "Run cancelled. The last result is kept.";
    return "";
  }
  const solveAnnouncement = announce(solveRun, {
    running: `Running ${solverName}.`,
    done: `${solveKept?.solverName ?? solverName} finished.`,
    failed: `${solverName} did not run.`,
  });
  const reduceAnnouncement = announce(reduceRun, {
    running: `Building the ${selectedReduction?.target ?? "target"} instance.`,
    done: `Built the ${buildKept?.targetName ?? "target"} instance.`,
    failed: "The reduction did not build.",
  });
  const targetAnnouncement = announce(targetRun, {
    running: `Solving ${cellTargetName} with ${targetSolver?.name ?? "its solver"}.`,
    done: `${targetKept?.solverName ?? "The solver"} finished.`,
    failed: `Solving ${cellTargetName} did not finish.`,
  });

  // The Solver dropdown, in Solve mode's row and the source cell: one choice for both.
  const solverSelect =
    solvers.length > 0
      ? {
          value: String(solverIndex),
          options: solvers.map((solver, index) => ({
            value: String(index),
            label: solver.name,
            tags: solverRunTags(solver),
            card: solverCard(solver),
          })),
          onChange: (value) => setSolverIndex(Number(value)),
        }
      : null;

  const solveFailure = runFailure(solveRun);
  // The solve's chip and its result line, shared by Solve mode's row and the source cell.
  const solveChip = runChip(solving ? { ...solveRun, isRunning: true } : solveRun, {
    current: solveCurrent,
    done: answerChip,
  });
  const solveBusy = solving
    ? {
        text: `Solving ${sourceName} with ${selectedSolver?.name ?? "the solver"}`,
        startedAt: solveRun.startedAt || pictureRun.startedAt,
      }
    : null;
  const solveStale = !solving && Boolean(solveKept) && !solveCurrent && !solveFailure;
  const solveHint = !solving && isRunning ? ANOTHER_RUN : "";

  let topRun;
  if (mode === "solve") {
    topRun = {
      label: "Solve",
      onRun: handleSolve,
      disabled: solveDisabled,
      hint: solveHint,
      running: solving,
      onCancel: cancelSolve,
      chip: solveChip,
      busy: solveBusy,
      failure: solveFailure,
      onRetry: handleSolve,
    };
  } else {
    topRun = {
      label: "Reduce",
      onRun: handleReduce,
      disabled: reduceDisabled,
      hint: !reduceRun.isRunning && isRunning ? ANOTHER_RUN : "",
      running: reduceRun.isRunning,
      onCancel: reduceRun.cancel,
      chip: runChip(reduceRun, {
        current: reduceCurrent && buildMatchesChoice,
        done: (kept) => ({
          tone: "ok",
          text: `Built · ${formatSeconds(kept.elapsedMs)}`,
          label: `Built, ${formatSeconds(kept.elapsedMs)}, round trip`,
        }),
        changed: "Changed · build again",
      }),
      busy: reduceRun.isRunning
        ? {
            text: `Building the ${selectedReduction?.target ?? "target"} instance with ${selectedReduction?.name ?? "the reduction"}`,
            startedAt: reduceRun.startedAt,
          }
        : null,
      failure: runFailure(reduceRun),
      onRetry: handleReduce,
    };
  }

  const status = (
    <>
      {/* #279: the Instance pane shows the error under the field while it is shown. */}
      {instanceError && !layout.shown.instance && (
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
      {mode === "solve" && pictureRun.status === COMPUTE_FAILED && !solveFailure && (
        <Box
          id={`${ID}-solve-picture-failure`}
          sx={{ fontSize: "0.8125rem", color: "text.secondary" }}
        >
          The picture did not come back: {pictureRun.failure?.headline ?? ""}. The answer is below.
        </Box>
      )}
      {/* Spoken when they change; what they say is also on screen. */}
      {[
        ["solve", solveAnnouncement],
        ["reduce", reduceAnnouncement],
        ["target", targetAnnouncement],
      ].map(([key, text]) => (
        <Box
          key={key}
          id={`${ID}-${key}-status`}
          role="status"
          aria-live="polite"
          sx={visuallyHiddenSx}
        >
          {text}
        </Box>
      ))}
    </>
  );

  // Reduce mode's cells and results row (./panels/ReduceCells.js).
  let reduceCells = null;
  if (mode === "reduce" && reductions.length > 0) {
    const targetLabel = cellTargetName || "the target";
    const sourceCell = {
      id: `${ID}-source-cell`,
      label: `${sourceName} solver`,
      select: solverSelect,
      run: {
        label: `Solve ${sourceName}`,
        onRun: handleSolve,
        disabled: solveDisabled,
        hint: solveHint,
        running: solving,
        onCancel: cancelSolve,
        chip: solveChip,
      },
      busy: solveBusy,
      failure: solveFailure,
      onRetry: handleSolve,
      result:
        solveCurrent && solveRun.kept
          ? {
              found: answerFound(solveResult.output),
              verdict: answerFound(solveResult.output)
                ? `${solveResult.solverName} found a ${sourceName} answer`
                : `${solveResult.solverName} found no ${sourceName} answer`,
              answer: sourceAnswer,
              elapsedMs: solveRun.kept.elapsedMs,
            }
          : null,
      changed: solveStale
        ? `The instance changed after the last solve. Press Solve ${sourceName} to run it again.`
        : null,
    };

    const targetCell = {
      id: `${ID}-target-cell`,
      label: `${targetLabel} solver`,
      select:
        cellTargetSolvers.length > 0
          ? {
              value: String(targetSolverIndex),
              options: cellTargetSolvers.map((solver, index) => ({
                value: String(index),
                label: solver.name,
                tags: solverRunTags(solver),
                card: solverCard(solver),
              })),
              onChange: (value) =>
                setTargetSolverPicks((picks) => ({ ...picks, [cellTargetName]: Number(value) })),
            }
          : null,
      run: {
        label: `Solve ${targetLabel}`,
        onRun: handleSolveTarget,
        disabled: targetDisabled,
        hint: targetRun.isRunning ? "" : targetHint,
        running: targetRun.isRunning,
        onCancel: targetRun.cancel,
        chip: reduceCurrent
          ? runChip(targetRun, { current: Boolean(targetSolved), done: answerChip })
          : null,
      },
      busy: targetRun.isRunning
        ? {
            text: `Solving ${targetLabel} with ${targetSolver?.name ?? "its solver"}`,
            startedAt: targetRun.startedAt,
          }
        : null,
      failure: reduceCurrent ? runFailure(targetRun) : null,
      onRetry: handleSolveTarget,
      result: targetResult
        ? {
            found: answerFound(targetResult.output),
            verdict: answerFound(targetResult.output)
              ? `${targetResult.solverName} found a ${targetLabel} answer`
              : `${targetResult.solverName} found no ${targetLabel} answer`,
            answer: targetAnswer,
            elapsedMs: targetRun.kept.elapsedMs,
          }
        : null,
      changed:
        !targetRun.isRunning && buildKept && !reduceCurrent && targetKept
          ? `The instance changed after the last solve. Reduce, then press Solve ${targetLabel} to run it again.`
          : null,
    };

    // The two directions of the reduction, each under the side it gives an answer for.
    const reduction = backReduction ?? selectedReduction?.className;
    const back = {
      id: `${ID}-back`,
      heading: `${targetLabel} answer ${ARROW} back to ${sourceName}`,
      direction: `If f(x) has a ${targetLabel} answer, x is a yes-instance of ${sourceName}.`,
    };
    if (noBackMap.has(reduction)) back.state = "na";
    else if (!reduceCurrent) {
      back.state = "waiting";
      back.text = `Reduce first, then solve ${targetLabel} to see this direction.`;
    } else if (!targetResult) {
      back.state = "waiting";
      back.text = `Solve ${targetLabel} to see this direction.`;
    } else if (!answerFound(targetResult.output)) {
      const claim = noAnswerClaim(
        targetLabel,
        sourceName,
        targetResult.guarantee,
        targetResult.solverName,
      );
      back.state = "none";
      back.text = claim.text;
      back.proves = claim.proves;
    } else if (backMap.failure) {
      back.state = "failed";
      back.failure = backMap.failure;
      back.onRetry = backMap.retry;
    } else if (backMap.value?.unavailable) {
      back.state = "na";
    } else if (backMap.value) {
      back.state = "answer";
      back.answer = backMap.value.certificate;
      back.onCheck = () => checkIn(CHECK_SOURCE, backMap.value.certificate);
    } else {
      back.state = "loading";
      back.text = `Mapping the ${targetLabel} answer back to ${sourceName}`;
      back.startedAt = backMap.startedAt;
    }

    const forward = {
      id: `${ID}-forward`,
      heading: `Your ${sourceName} answer ${ARROW} into ${targetLabel}`,
      direction: `If x is a yes-instance of ${sourceName}, f(x) has a ${targetLabel} answer.`,
    };
    if (noForwardMap.has(reduction)) forward.state = "na";
    else if (!reduceCurrent) {
      forward.state = "waiting";
      forward.text = `Reduce first to build the ${targetLabel} instance.`;
    } else if (!solveCurrent) {
      forward.state = "waiting";
      forward.text = `Solve ${sourceName} above to see this direction.`;
    } else if (!answerFound(solveResult.output)) {
      const claim = noAnswerClaim(
        sourceName,
        targetLabel,
        solveResult.guarantee,
        solveResult.solverName,
      );
      forward.state = "none";
      forward.text = claim.text;
      forward.proves = claim.proves;
    } else if (forwardMap.failure) {
      forward.state = "failed";
      forward.failure = forwardMap.failure;
      forward.onRetry = forwardMap.retry;
    } else if (forwardMap.value?.unavailable) {
      forward.state = "na";
    } else if (forwardMap.value) {
      forward.state = "answer";
      forward.answer = forwardMap.value.certificate;
      forward.onCheck = verify.targetLocked
        ? null
        : () => checkIn(CHECK_TARGET, forwardMap.value.certificate);
    } else {
      forward.state = "loading";
      forward.text = `Mapping your ${sourceName} answer into ${targetLabel}`;
      forward.startedAt = forwardMap.startedAt;
    }

    const agree =
      reduceCurrent && targetResult && solveCurrent
        ? agreeLine(
            { found: answerFound(solveResult.output), guarantee: solveResult.guarantee },
            { found: answerFound(targetResult.output), guarantee: targetResult.guarantee },
          )
        : null;

    reduceCells = { source: sourceCell, target: targetCell, back, forward, agree };
  }

  let targetLockReason = "";
  if (mode === "reduce" && reduceTargetName) {
    if (reduceRun.isRunning) targetLockReason = `Building the ${reduceTargetName} instance.`;
    else if (reduceCurrent && !reduceResult.targetInstance)
      targetLockReason = `Redux did not send the ${reduceTargetName} instance it built, so there is nothing to check against.`;
    else
      targetLockReason = `Reduce first: checking against ${reduceTargetName} needs the target instance it builds.`;
  }

  // --- Toggle dots -------------------------------------------------------------------------
  // #279: only the Instance toggle has one, while the instance has errors. #229's "New result"
  // dot is gone: the result now shows in Execute, right under the run buttons.
  const dots = {
    instance: instanceError ? { label: "The instance has errors", color: "status.err" } : null,
  };
  const workspaceShown = WORKSPACE_SECTIONS.filter((key) => layout.shown[key]);

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
      colorMode: gadgetMarkMode,
      onColorMode: setGadgetMarkMode,
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

  // --- The pictures' own Showing lines and Algorithm Steps (#279 stage 3) -------------------
  // Reduce mode: each picture names what produced the answer it shows. Its own solver wins over
  // an answer carried across from the other side.
  let sourceShowing = null;
  let targetShowing = null;
  if (mode === "reduce") {
    const builtTargetName = reduceCurrent ? reduceResult.targetName : cellTargetName;
    let sourceAlgorithm = "Not run yet";
    if (solveCurrent) sourceAlgorithm = solveResult.solverName;
    else if (reduceCurrent && backMap.value?.certificate)
      sourceAlgorithm = `Mapped back from ${reduceResult.targetName}`;
    let targetAlgorithm = "Not built yet";
    if (reduceCurrent) {
      if (targetResult) targetAlgorithm = targetResult.solverName;
      else if (forwardMap.value?.certificate) targetAlgorithm = `Carried from ${problem.name}`;
      else targetAlgorithm = "Built, not solved";
    }
    sourceShowing = { problem: problem.name, algorithm: sourceAlgorithm };
    targetShowing = { problem: builtTargetName || "the target", algorithm: targetAlgorithm };
  }

  const steps = showingRunPicture
    ? { frameCount: runFrames.length, currentStep, onStepChange: setCurrentStep }
    : reduceView && !switching
      ? {
          frameCount: reduceView.frames.length,
          currentStep: Math.min(reduceStep, reduceView.frames.length - 1),
          onStepChange: setReduceStep,
        }
      : null;
  // Algorithm Steps is closed until a run gives it steps, then opens by itself, unless the viewer
  // opened or closed it (kept until Reset layout).
  const hasSteps = Boolean(steps) && (Boolean(reduceView) || steps.frameCount > 1);
  const stepsOpen = layout.stepsOpen ?? hasSteps;
  let stepsEmpty;
  if (mode === "solve") {
    stepsEmpty =
      showingRunPicture && runFrames.length <= 1
        ? "This run recorded no steps."
        : "No steps yet. Press Solve to step through the solver's run.";
  } else if (reduceCurrent && !reduceView) {
    stepsEmpty = "Redux sent no steps for this reduction, so there is nothing to step through.";
  } else {
    stepsEmpty = `No steps yet. Press Reduce to build the ${cellTargetName || "target"} instance step by step.`;
  }
  const solveTargetHint = `Press Solve ${cellTargetName || "the target"} to reach this phase.`;
  const algorithmSteps = {
    open: stepsOpen,
    onToggle: () => layout.setStepsOpen(!stepsOpen),
    emptyText: steps && hasSteps ? "" : stepsEmpty,
    phaseHints: {
      solve: solveTargetHint,
      map:
        targetSolved && !answerFound(targetSolved.output)
          ? `${targetSolved.solverName} found no answer, so there is none to map back.`
          : targetSolved
            ? "Not available for this reduction."
            : solveTargetHint,
    },
  };

  const gadgetsProps =
    reduceGadgets.length > 0
      ? {
          runId: reduceResult.runId,
          gadgets: reduceGadgets,
          sourceFrame: sourceContent.kind === "frame" ? sourceContent.frame : null,
          targetFrame: target?.content.kind === "frame" ? target.content.frame : null,
          namers: gadgetNamers,
          colors: gadgetRowColors,
          activeIndex: activeGadget ? gadgetHighlight.index : null,
          onHighlight: handleGadgetHighlight,
        }
      : null;

  return (
    <Box id={ID} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <PaneToggles
        idPrefix={ID}
        shown={layout.shown}
        controls={LAYOUT_REGIONS}
        onToggle={layout.toggle}
        onReset={layout.reset}
        dots={dots}
      />

      {!Object.values(layout.shown).some(Boolean) && (
        <Box
          component="p"
          id={`${ID}-all-hidden`}
          sx={{
            m: 0,
            p: 2,
            border: "1px dashed",
            borderColor: "border.main",
            borderRadius: "12px",
            color: "text.secondary",
          }}
        >
          Every pane is hidden. Press a name in the bar above to show it, or Reset layout.
        </Box>
      )}

      <CollapsiblePane
        id={LAYOUT_REGIONS.details}
        expandId={`${ID}-details-expand`}
        bodyId={`${ID}-details-body`}
        title={PANE_LABELS.details}
        hidden={!layout.shown.details}
        expanded={layout.expanded.details}
        onExpandedChange={(expanded) => layout.setExpanded("details", expanded)}
        summary={<DetailsSummary id={`${ID}-details-summary`} problem={problem} />}
      >
        {layout.expanded.details ? <DetailsPanel problem={problem} /> : null}
      </CollapsiblePane>

      <CollapsiblePane
        id={LAYOUT_REGIONS.instance}
        expandId={`${ID}-instance-expand`}
        bodyId={`${ID}-instance-body`}
        title={PANE_LABELS.instance}
        hidden={!layout.shown.instance}
        expanded={layout.expanded.instance}
        onExpandedChange={(expanded) => layout.setExpanded("instance", expanded)}
      >
        <InstancePanel
          idPrefix={`${ID}-instance`}
          problem={problem}
          instance={instance}
          onInstanceChange={setInstance}
          instanceError={instanceError}
          expanded={layout.expanded.instance}
        />
      </CollapsiblePane>

      <Workspace id={`${ID}-workspace`} hidden={workspaceShown.length === 0}>
        <WorkspaceSection
          id={LAYOUT_REGIONS.visualization}
          title={PANE_LABELS.visualization}
          hidden={!layout.shown.visualization}
          first={workspaceShown[0] === "visualization"}
        >
          <VisualizationPane
            idPrefix={ID}
            showing={showing}
            showingIsError={showingIsError}
            verdict={verdictLine}
            source={{
              title: mode === "solve" ? problem.name : `Source · ${problem.name}`,
              type: vizTypeControl,
              content: sourceContent,
              showing: sourceShowing,
              fullScreenTitle:
                mode === "solve"
                  ? showing.algorithm
                  : `${problem.name} · ${sourceShowing.algorithm}`,
            }}
            target={
              target && {
                ...target,
                showing: targetShowing,
                fullScreenTitle: `${targetShowing.problem} · ${targetShowing.algorithm}`,
              }
            }
            steps={steps}
            algorithmSteps={algorithmSteps}
            reduction={reductionPane}
            note={note}
            legendFrames={legendFrames}
            legendStates={legendStates}
            legendAnnotations={legendAnnotations}
          />
          {/* Gadgets (#229 stage 4) belong with the pictures: what the reduction built for each
              piece of the source. Reduce mode, after a run that lists some. */}
          {gadgetsProps && (
            <GadgetsSection
              key={gadgetsProps.runId}
              idPrefix={`${ID}-gadgets`}
              gadgets={gadgetsProps.gadgets}
              sourceFrame={gadgetsProps.sourceFrame}
              targetFrame={gadgetsProps.targetFrame}
              namers={gadgetsProps.namers}
              colors={gadgetsProps.colors}
              activeIndex={gadgetsProps.activeIndex}
              onHighlight={gadgetsProps.onHighlight}
            />
          )}
        </WorkspaceSection>

        <WorkspaceSection
          id={LAYOUT_REGIONS.execute}
          title={PANE_LABELS.execute}
          hidden={!layout.shown.execute}
          first={workspaceShown[0] === "execute"}
        >
          <CommandBar
            idPrefix={ID}
            mode={mode}
            onModeChange={setMode}
            solver={solverSelect}
            target={
              targets.length > 0
                ? {
                    value: targetName ?? targets[0],
                    // #279 stage 2: the Target dropdown has no tags inside; its card stays.
                    options: targets.map((name) => ({
                      value: name,
                      label: name,
                      tags: [],
                      card: targetCard(
                        name,
                        reductions.find((reduction) => reduction.target === name)?.targetProblem,
                      ),
                    })),
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
            run={topRun}
            status={status}
          >
            <ResultPanel
              idPrefix={`${ID}-result`}
              mode={mode}
              solve={
                solveCurrent && solveRun.kept
                  ? {
                      found: answerFound(solveResult.output),
                      answer: sourceAnswer,
                      elapsedMs: solveRun.kept.elapsedMs,
                    }
                  : null
              }
              solveChanged={solveStale}
              onCheckAnswer={() => checkIn(CHECK_SOURCE, sourceAnswer)}
              built={
                buildShown
                  ? {
                      targetName: reduceResult.targetName,
                      reductionName: reduceResult.reductionName,
                      elapsedMs: reduceRun.kept.elapsedMs,
                      targetInstance: reduceResult.targetInstance,
                    }
                  : null
              }
              buildChanged={!reduceRun.isRunning && Boolean(buildKept) && !reduceCurrent}
            />
            <ReduceCells idPrefix={`${ID}-cells`} cells={reduceCells} />
          </CommandBar>
        </WorkspaceSection>

        <WorkspaceSection
          id={LAYOUT_REGIONS.verify}
          title={PANE_LABELS.verify}
          hidden={!layout.shown.verify}
          first={workspaceShown[0] === "verify"}
        >
          <VerifyBox
            idPrefix={`${ID}-verify`}
            mode={mode}
            verify={verify}
            sourceName={problem.name}
            targetName={reduceTargetName}
            targetLockReason={targetLockReason}
          />
        </WorkspaceSection>
      </Workspace>
    </Box>
  );
}
