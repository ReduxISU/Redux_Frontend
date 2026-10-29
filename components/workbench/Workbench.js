// components/workbench/Workbench.js
//
// #229 stage 1 (stage 2 added the tagged dropdowns and info cards, components/workbench/
// TaggedSelect.js and infoCards.js): the problem page as a workbench with the picture at the
// center. Replaced the old page's five draggable sections (components/ProblemDetailLayout.js).
//
// #303 stage 1 (Board G): one centered column, one card, top to bottom:
//   1. the instance editor, always visible (./panels/InstancePanel.js);
//   2. the picture pane (./VisualizationPane.js): the Showing line, the Picture menu, zoom and
//      Full screen on one header row, the picture, then the algorithm's steps;
//   3. the task bar (./CommandBar.js): the Solve / Reduce / Verify tabs, the task's menus and
//      its main button;
//   4. the results, listed under the bar (./panels/ResultPanel.js).
// #229's rail and its Details / Instance / Result panels are gone: the problem's details moved
// to the (i) card after the title (pages/[problem].js), the instance to the editor, and the
// result to the list. Full screen shows only the picture(s) and the steps (Escape or Exit full
// screen leaves it). Verify is its own tab; Solve's "Check it in Verify" opens it and checks
// the answer there.
//
// #303 stage 2: Reduce is a Reduce -> Solve -> Verify stepper (CommandBar.js), each stage with
// its own menus. Reduce builds the target (the Reduction View's Build frames, or the older
// requests), Solve runs a target Algorithm on what was built and maps its answer back to this
// instance (handleSolveTarget), and Verify checks both answers (stage 4, below).
// The two pictures sit side by side with an arrow between them (PaneGrid.js), each with its own
// header, Picture menu, zoom and Full screen; Full screen beside the Showing line shows both.
// The results under the bar are tagged by stage.
//
// #303 stage 4: Verify. The Verify tab checks a certificate against this instance with the
// chosen Verifier (Check is its main button), and Reduce's Verify stage checks the target's
// answer against the instance the reduction built and the answer mapped back against this one,
// both prefilled from the Solve stage and editable, then says whether the two checks agree. The
// results are one list of rows in every task (./panels/ResultPanel.js), each fact said once.
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
//   - A randomized solver's seed (#295, ReduxISU/Redux#932), Solve mode only for now: its run
//     (visualizeRun, or a frames picture) reports the seed it ran with, shown in the Result
//     results as "Seed 12345 made this run". For a randomized solver (one declaring the
//     "Stochastic" type) the command bar has a Seed box: blank lets Redux pick a new seed each
//     Run, a number (the reported seed, pasted in) repeats that run exactly. The box keeps its
//     text for the page's life and is not in the URL; it is ignored while hidden. The seed
//     shows only while the run is of this instance and the solver picked now; a solver with no
//     seed, or a backend older than #932, shows none.
//     Solve's answer is visualizeRun's own `answer` when it has one, so the answer and the steps
//     are one run (and Run makes one request, not two); ProblemProvider/solve answers only when
//     visualizeRun can't. #303 stage 2: Reduce's Solve stage has the Seed box too, for a
//     randomized target Algorithm; it goes on the Reduction View request, which reports the seed.
//   - The URL: `?instance=`, `?solver=` and `?viz=` round-trip the way the old sections did
//     (#150), so links and playlists that name a solver or visualization still open on it.
//     The old `?step=` is dropped: before Run there are no steps to point at.

import Box from "@mui/material/Box";
import { useRouter } from "next/router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { VISUALIZATION_TYPE_MAP } from "../../data/visualizationTypes";
import { canCheck, useCertificateCheck, verdictMatches } from "../../hooks/useCertificateCheck";
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
import { gadgetColorMap, highlightIdsOn, normalizeGadgets } from "../../lib/gadgets";
import { drawsFromRun, requestPicture, requestRunPictures } from "../../lib/pictureRequest";
import {
  buildOnlyView,
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
  requestMappedSolution,
  requestMappedSolutionBack,
  requestReducedInstance,
  requestReduction,
  requestSolvedInstance,
} from "../../lib/redux";
import { isRandomizedSolver, MAX_SEED, parseSeed } from "../../lib/runSeed";
import { frameAtPosition, framePosition, RUN_END } from "../../lib/runSteps";
import ComputeStatus from "../detail/ComputeStatus";
import { GADGET_PALETTE } from "../pictures/gadgetRings";
import { pictureStateStyle, statesInFrames } from "../pictures/pictureStates";
import { pictureAnnotations, pictureLegendFrames, pictureRuns } from "../pictures/registry";
import { PictureFullScreen } from "../pictures/zoomControlsSlot";
import { paletteVars } from "../theme";
import CommandBar from "./CommandBar";
import {
  reductionCard,
  reductionTags,
  solverCard,
  solverListTags,
  solverTags,
  targetCard,
  targetTags,
  verifierCard,
  visualizationCard,
  visualizationTags,
} from "./infoCards";
import { COMPACT_MEDIA, PHONE_MEDIA, secondaryButtonSx } from "./layout";
import InstancePanel from "./panels/InstancePanel";
import ResultPanel, { SeedText } from "./panels/ResultPanel";
import { ReduceVerifySide, unreadableFailure, VerifyTaskRow } from "./panels/VerifyBox";
import VisualizationPane from "./VisualizationPane";

const ID = "workbench";
const INSTANCE_URL_DEBOUNCE_MS = 400;
const NOT_RUN_TEXT = "Not run yet. Showing the default picture of the instance.";
const ARROW = "→";

// #229 stage 3: drawing a certificate on the picture. #303: until it is supported, "Show where
// it fails" is not shown at all (it used to show disabled with this reason). Before any Run, Check is meant to draw
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
  const option = (visualization) => {
    const shown = readableVisualization(visualization, side);
    return {
      value: shown.className,
      label: shown.name,
      tags: visualizationTags(shown),
      card: visualizationCard(shown, which),
    };
  };
  if (!side.visualization) {
    const drawn = all.find((visualization) => visualization.pictureType === side.type) ?? all[0];
    return drawn ? { options: [option(drawn)], value: drawn.className } : null;
  }
  const value = pending ?? side.visualization;
  const workable = all.filter((visualization) => viewPictureWorkable(visualization, which));
  if (!workable.some((visualization) => visualization.className === value)) {
    // A picture the catalog does not list (Redux draws it, but Navigation/Batch/allVisualizations
    // leaves it out): named after its problem, tagged with the picture type Redux says it drew.
    const named = all.find((visualization) => visualization.className === value);
    workable.unshift(named ?? { className: value, pictureType: side.type });
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

/**
 * #303: a visualization as a Picture menu shows it, never by its class name: one with no
 * declared name (allInfo's visualizationName) is called after the problem it draws, as Redux
 * names its own ("3SAT Visualization").
 * @param {Object} visualization
 * @param {{problem: string, type: string}} side The Reduction View's side it is drawn on.
 */
function readableVisualization(visualization, side) {
  const named = visualization.name && visualization.name !== visualization.className;
  return {
    ...visualization,
    name: named ? visualization.name : `${side.problem || "This problem's"} Visualization`,
    pictureType: visualization.pictureType ?? side.type,
  };
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

  // --- Selections ------------------------------------------------------------------------
  // #303: the tab on now. Verify draws what Solve draws (the instance, or Solve's run), so
  // everything below that tells Solve from Reduce reads `mode`, Verify counting as Solve.
  const [task, setTask] = useState("solve");
  const mode = task === "reduce" ? "reduce" : "solve";
  // #303: the workspace shows only the picture(s) and the steps: "all" of them, or (stage 2)
  // one of Reduce's two panes alone, "source" or "target"; null when off.
  const [fullScreen, setFullScreen] = useState(null);
  const exitRef = useRef(null);
  // The Full screen button that went in, so coming out puts focus back on it.
  const fullFromRef = useRef(null);
  // #303 stage 2: the Reduce stage whose menus the bar shows, when one was picked in the stepper
  // (null: the next stage to do). A pick that can't be reached any more is ignored.
  const [reduceStagePick, setReduceStagePick] = useState(null);
  // #303 stage 2: the target's Algorithm for Reduce's Solve step, by target problem.
  const [targetSolverPicks, setTargetSolverPicks] = useState({});
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
  // #295: the Seed box's text, kept for the page's life (not in the URL).
  const [seedText, setSeedText] = useState("");

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
  // #303 stage 2: Reduce's Solve step, solving the target the reduction built.
  const targetSolveRun = useComputeRequest({ subject: "instance" });
  const solveIdRef = useRef(0);

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
  // #303 stage 2: the target's solvers, and the one Reduce's Solve step runs: the one picked
  // for this target, or the one the Reduction View ran by default, or the first.
  const targetSolvers = selectedReduction?.targetSolvers ?? [];
  const builtView = reduceCurrent ? (reduceResult.view ?? null) : null;
  const selectedTargetSolver =
    targetSolvers.find(
      (solver) => solver.className === targetSolverPicks[selectedReduction?.target],
    ) ??
    targetSolvers.find((solver) => solver.name === builtView?.solverName) ??
    targetSolvers[0] ??
    null;
  const targetSolveResult = targetSolveRun.status === COMPUTE_DONE ? targetSolveRun.result : null;
  // The Solve step's answer counts while it is of this build and of the Algorithm picked now.
  const targetSolveCurrent =
    Boolean(targetSolveResult) &&
    reduceCurrent &&
    targetSolveResult.runId === reduceResult.runId &&
    targetSolveResult.solverClassName === (selectedTargetSolver?.className ?? null);
  const solveId = targetSolveCurrent ? targetSolveResult.solveId : null;
  const [switchedView, setSwitchedView] = useState(null);
  const [switchNote, setSwitchNote] = useState(null);
  const [switchPending, setSwitchPending] = useState(null);
  const switchedCurrent =
    reduceCurrent &&
    Boolean(switchedView) &&
    switchedView.runId === reduceResult.runId &&
    switchedView.solveId === solveId;
  // The whole view (Build, Solve, Map back) last drawn for this build: Reduce's, the Solve step's
  // (with its Algorithm), or another picture's (#912). Until Solve has drawn one, only its Build
  // frames show (lib/reductionView.js buildOnlyView).
  let wholeView = builtView;
  if (targetSolveCurrent && targetSolveResult.view) wholeView = targetSolveResult.view;
  if (switchedCurrent && switchedView.view) wholeView = switchedView.view;
  const viewSolved = targetSolveCurrent && Boolean(targetSolveResult.view);
  const buildView = useMemo(() => (wholeView ? buildOnlyView(wholeView) : null), [wholeView]);
  const reduceView = mode === "reduce" && wholeView ? (viewSolved ? wholeView : buildView) : null;
  const switching =
    Boolean(reduceView) && viewSwitch.isRunning && switchPending?.runId === reduceResult.runId;

  // --- Verify (#303 stage 4) ---------------------------------------------------------------
  // Three checks, each its own request (hooks/useCertificateCheck.js): the Verify tab's, against
  // this instance, and Reduce's Verify stage's two, the target's answer against the instance the
  // reduction built and the answer mapped back against this instance. The tab and Reduce's
  // second check share this problem's Verifier pick; the target's is kept per target problem.
  const verifiers = problem.verifiers ?? (problem.verifier ? [problem.verifier] : []);
  const [sourceVerifierPick, setSourceVerifierPick] = useState(null);
  const sourceVerifier =
    verifiers.find((verifier) => verifier.className === sourceVerifierPick) ?? verifiers[0] ?? null;
  const [targetVerifierPicks, setTargetVerifierPicks] = useState({});
  const targetVerifiers =
    selectedReduction?.targetVerifiers ??
    (selectedReduction?.targetVerifier ? [selectedReduction.targetVerifier] : []);
  const targetVerifier =
    targetVerifiers.find(
      (verifier) => verifier.className === targetVerifierPicks[selectedReduction?.target],
    ) ??
    targetVerifiers[0] ??
    null;
  const verifyCheck = useCertificateCheck();
  const targetCheck = useCertificateCheck();
  const sourceCheck = useCertificateCheck();

  // The Verify tab's certificate, kept for the page's life; its verdict counts while it is of
  // this instance, this certificate and the same mode and run (a new Run retires it).
  const [verifyCertificate, setVerifyCertificate] = useState(
    () => verifiers[0]?.exampleCertificate ?? "",
  );
  const verifyContext = `${mode}:${lastRun?.id ?? 0}`;
  const verifySpec = {
    verifier: sourceVerifier,
    instance,
    certificate: verifyCertificate,
    label: `${problem.name} instance`,
    context: verifyContext,
  };
  const verifyVerdict = verdictMatches(verifyCheck.verdict, verifySpec)
    ? verifyCheck.verdict
    : null;

  // Reduce's two certificates start as the Solve stage's answers (the target's, and the one
  // mapped back) and can be edited; a new Solve fills them again.
  const [reduceCertificates, setReduceCertificates] = useState({
    solveId: null,
    target: "",
    source: "",
  });
  const typedForSolve = solveId !== null && reduceCertificates.solveId === solveId;
  const targetCertificate = typedForSolve
    ? reduceCertificates.target
    : targetSolveCurrent
      ? (targetSolveResult.targetCertificate ?? "")
      : "";
  const mappedCertificate = typedForSolve
    ? reduceCertificates.source
    : targetSolveCurrent
      ? (targetSolveResult.mappedCertificate ?? "")
      : "";
  function setReduceCertificate(side, text) {
    setReduceCertificates({
      solveId,
      target: targetCertificate,
      source: mappedCertificate,
      [side]: text,
    });
  }
  const builtTargetName = reduceCurrent
    ? reduceResult.targetName
    : (selectedReduction?.target ?? "");
  const reduceVerifyContext = `reduce:${reduceCurrent ? reduceResult.runId : 0}:${solveId ?? 0}`;
  const targetSpec = {
    verifier: targetVerifier,
    instance: reduceCurrent ? (reduceResult.targetInstance ?? null) : null,
    certificate: targetCertificate,
    label: "instance the reduction built",
    context: reduceVerifyContext,
  };
  const sourceSpec = {
    verifier: sourceVerifier,
    instance,
    certificate: mappedCertificate,
    label: `${problem.name} instance`,
    context: reduceVerifyContext,
  };
  const targetVerdict =
    targetSolveCurrent && verdictMatches(targetCheck.verdict, targetSpec)
      ? targetCheck.verdict
      : null;
  const sourceVerdict =
    targetSolveCurrent && verdictMatches(sourceCheck.verdict, sourceSpec)
      ? sourceCheck.verdict
      : null;

  // Which verdict (by its id) has "Show where it fails" switched on.
  const [overlayFor, setOverlayFor] = useState(null);

  // --- Map a solution across (#229 stage 3) -----------------------------------------------
  // #303 stage 4: from Reduce's Verify stage, it fills the target's certificate with a source
  // answer (from the Solve tab's Algorithm) mapped onto the target.
  const mapRun = useComputeRequest({ subject: "certificate" });
  const mapResult = mapRun.status === COMPUTE_DONE ? mapRun.result : null;
  const mapCurrent =
    Boolean(mapResult) &&
    reduceCurrent &&
    mapResult.runId === reduceResult.runId &&
    mapResult.solveId === solveId;
  // A new mapped certificate goes into the target's box once, when it lands.
  const [mapLanded, setMapLanded] = useState(mapRun.result);
  if (mapLanded !== mapRun.result) {
    setMapLanded(mapRun.result);
    if (mapCurrent) {
      setReduceCertificates({
        solveId,
        target: mapResult.certificate,
        source: mappedCertificate,
      });
    }
  }

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

  // #215: where the Reduction View's steps are. #274: a new reduction opens on its last step,
  // the end of Map back, as a solve opens on its finished result; the step controls and the
  // phase buttons still go back to Build and Solve.
  // #303 stage 2: Reduce opens on Build's last step (the built target), and the Solve step's view
  // on its last, the end of Map back.
  const [reduceStep, setReduceStep] = useState(0);
  const [reduceStepsFor, setReduceStepsFor] = useState(reduceRun.result);
  if (reduceStepsFor !== reduceRun.result) {
    setReduceStepsFor(reduceRun.result);
    const landed = reduceRun.result?.view;
    setReduceStep(openingStep(landed ? buildOnlyView(landed).frames : null));
  }
  const [solveStepsFor, setSolveStepsFor] = useState(targetSolveRun.result);
  if (solveStepsFor !== targetSolveRun.result) {
    setSolveStepsFor(targetSolveRun.result);
    if (targetSolveRun.result?.view) setReduceStep(openingStep(targetSolveRun.result.view.frames));
  }
  // #912: another picture's view opens on the same phase and step as the one before it.
  const [switchLanded, setSwitchLanded] = useState(viewSwitch.result);
  if (switchLanded !== viewSwitch.result) {
    const landed = viewSwitch.result;
    setSwitchLanded(landed);
    if (landed && landed.runId === reduceResult?.runId) {
      if (landed.view) {
        setSwitchedView({ runId: landed.runId, solveId: landed.solveId, view: landed.view });
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

  // --- Full screen (#303) ----------------------------------------------------------------
  // Going in moves focus to Exit full screen and stops the page scrolling under the overlay;
  // coming out puts focus back on the Full screen button that went in.
  const wasFullRef = useRef(false);
  useLayoutEffect(() => {
    if (fullScreen) {
      exitRef.current?.focus();
    } else if (wasFullRef.current) {
      document.getElementById(fullFromRef.current ?? `${ID}-full-screen`)?.focus();
    }
    wasFullRef.current = Boolean(fullScreen);
    if (!fullScreen) return undefined;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [fullScreen]);

  /** A Full screen button: "all", or (#303 stage 2) one of Reduce's panes alone. */
  function toggleFullScreen(which) {
    setFullScreen((on) => {
      if (on === which) return null;
      if (!on)
        fullFromRef.current = which === "all" ? `${ID}-full-screen` : `${ID}-${which}-full-screen`;
      return which;
    });
  }
  // Solve and Verify draw one picture: a pane's own full screen means nothing there.
  const fullOn = mode === "solve" && fullScreen ? "all" : fullScreen;

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
    // #303 stage 2: once the Solve step has drawn its view, the new picture is of that solve.
    const solved = viewSolved ? targetSolveResult : null;
    const forSolve = solveId;
    setSwitchNote(null);
    setSwitchPending({ runId: run.runId, which, source, target });
    viewSwitch.start(async (signal) => {
      const view = await requestReductionViewOrNull({
        reduction: run.reductionClassName,
        instance: run.instance,
        sourceVisualization: source,
        targetVisualization: target,
        solver: solved?.solverClassName ?? null,
        seed: solved?.seed ?? null,
        signal,
      });
      return { view, runId: run.runId, solveId: forSolve, fromFrames, fromIndex };
    });
  }

  const isRunning =
    solveRun.isRunning || pictureRun.isRunning || reduceRun.isRunning || targetSolveRun.isRunning;
  const hasInstance = instance.trim() !== "";
  const canSolve = Boolean(selectedSolver?.className);
  const canReduce = canSolve && Boolean(selectedReduction?.className);

  // --- Reduce's stepper (#303 stage 2) ------------------------------------------------------
  // Reduce builds the target; Solve runs a target Algorithm on it and maps the answer back;
  // Verify checks certificates. A stage is reachable once the one before it is done, and the bar
  // shows the next stage to do unless another reachable one was picked. A new Reduce (or another
  // instance, target or reduction) starts again from Solve; another Algorithm, from Solve.
  const reduceReach = { reduce: true, solve: reduceCurrent, verify: targetSolveCurrent };
  const nextStage = !reduceCurrent ? "reduce" : !targetSolveCurrent ? "solve" : "verify";
  const reduceStage = reduceStagePick && reduceReach[reduceStagePick] ? reduceStagePick : nextStage;
  const reduceStages = [
    { key: "reduce", label: "Reduce", done: reduceCurrent },
    { key: "solve", label: "Solve", done: targetSolveCurrent },
    {
      key: "verify",
      label: "Verify",
      done: Boolean(targetVerdict) && (Boolean(sourceVerdict) || !mappedCertificate),
    },
  ].map((stage) => ({
    key: stage.key,
    label: stage.label,
    state: stage.done ? "done" : stage.key === nextStage ? "current" : "todo",
    reachable: reduceReach[stage.key],
  }));
  const solvingTarget = mode === "reduce" && reduceStage === "solve";

  // #295: the Seed box shows for a randomized solver in Solve mode, and (#303 stage 2) for a
  // randomized target Algorithm in Reduce's Solve stage; hidden, it is ignored.
  const seedShown =
    (mode === "solve" && isRandomizedSolver(selectedSolver)) ||
    (task === "reduce" && solvingTarget && isRandomizedSolver(selectedTargetSolver));
  const typedSeed = seedShown ? parseSeed(seedText) : null;
  const seedInvalid = Number.isNaN(typedSeed);
  // Everything that stops a Run but the Seed box's text.
  // (Verify has no Run: its Check is the Verify box's own, and so is Reduce's Verify stage.)
  let modeBlocked;
  if (mode === "solve") modeBlocked = !canSolve;
  else if (reduceStage === "solve")
    modeBlocked = !reduceCurrent || !selectedTargetSolver?.className;
  else modeBlocked = reduceStage === "verify" || !canReduce;
  const runBlocked =
    task === "verify" || !hasInstance || Boolean(instanceError) || isRunning || modeBlocked;
  const runDisabled = runBlocked || seedInvalid;
  // What stops Reduce's Solve step, whichever stage is shown.
  const targetSolveBlocked =
    !hasInstance ||
    Boolean(instanceError) ||
    isRunning ||
    !reduceCurrent ||
    !selectedTargetSolver?.className;

  /**
   * Run. A randomized solver (#295) gets the Seed box's number, or lets Redux pick one when the
   * box is blank or hidden.
   */
  function handleRun() {
    if (mode === "reduce" && reduceStage === "solve") {
      handleSolveTarget();
      return;
    }
    if (runDisabled) return;
    const runSeed = typedSeed;
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
    const solver = selectedSolver;

    // A new Run draws with the pictures picked so far; a switch still on its way is dropped.
    viewSwitch.reset();
    setSwitchNote(null);
    if (mode === "solve") {
      const visualization = selectedViz;
      const oneRun = drawsFromRun(visualization);
      // #295: the answer comes from the same run as the steps. When visualizeRun answers, its
      // `answer` is the result (one request, and the answer is the run the steps walk);
      // ProblemProvider/solve is asked only when there is no such answer: no visualization, a
      // backend without visualizeRun, a list or frames picture (neither carries the answer), a
      // failed visualizeRun, or a run that timed out.
      let shareRun = () => {};
      const sharedRun = oneRun
        ? new Promise((resolve) => {
            shareRun = resolve;
          })
        : Promise.resolve(null);
      solveRun.start(async (signal) => {
        const run = await sharedRun;
        const output =
          typeof run?.answer === "string" && !run.timedOut
            ? run.answer
            : await requestSolvedInstance(
                REDUX_API_BASE_URL,
                solver.className,
                runInstance,
                signal,
              );
        return { output, solverName: solver.name, instance: runInstance, runId };
      });
      if (visualization) {
        pictureRun.start(async (signal) => {
          const ran = {
            solverName: solver.name,
            solverClassName: solver.className,
            instance: runInstance,
            runId,
          };
          // #252: one run and every picture of it, when the backend has visualizeRun.
          if (oneRun) {
            let run = null;
            try {
              run = await requestRunPictures({
                instance: runInstance,
                solver: solver.className,
                seed: runSeed,
                signal,
              });
            } finally {
              shareRun(run);
            }
            if (run) return { run, seed: run.seed, ...ran };
          }
          // #199: {format, frames} plus, for a format=frames picture, its type and payload.
          const picture = await requestPicture({
            visualization,
            instance: runInstance,
            solver: solver.className,
            seed: runSeed,
            signal,
          });
          return {
            ...picture,
            seed: picture.seed ?? null,
            vizClassName: visualization.className,
            ...ran,
          };
        });
      }
    } else {
      // #303 stage 2: a new build starts the stepper again from Solve.
      targetSolveRun.reset();
      setReduceStagePick(null);
      const reduction = selectedReduction;
      const pictures = {
        sourceVisualization: sourceViewPicture,
        targetVisualization: targetViewPicture(reduction),
      };
      reduceRun.start(async (signal) => {
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
          return {
            ...ran,
            view,
            frames: [],
            reductionName: view.reductionName || reduction.name,
            targetInstance: view.target.instance,
            gadgets: view.gadgets,
            // #303 stage 2: the view also solved the target, but Reduce only builds it: the
            // solve and its answer mapped back are the Solve step's to show.
            solverName: null,
            solverClassName: null,
            certificate: null,
            mappedBack: null,
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
  }

  /**
   * #303 stage 2: Reduce's Solve step. Runs the target Algorithm on the target the build made and
   * maps its answer back to this instance. With a Reduction View, that is the view again with the
   * Algorithm (and a randomized one's seed), on the same pictures: its Solve and Map back phases.
   * Without one (or when the view can't run that Algorithm on its picture), ProblemProvider/solve
   * solves the target instance and ProblemProvider/mapSolutionBack maps the answer back. The
   * seed, as handleRun's.
   */
  function handleSolveTarget() {
    if (targetSolveBlocked || seedInvalid) return;
    const run = reduceResult;
    const solver = selectedTargetSolver;
    const runSeed = typedSeed;
    const shown = reduceView;
    solveIdRef.current += 1;
    const solveIdNow = solveIdRef.current;
    setReduceStagePick(null);
    viewSwitch.reset();
    setSwitchNote(null);
    targetSolveRun.start(async (signal) => {
      const ran = {
        runId: run.runId,
        solveId: solveIdNow,
        solverClassName: solver.className,
        targetName: run.targetName,
      };
      const view = run.view
        ? await requestReductionViewOrNull({
            reduction: run.reductionClassName,
            instance: run.instance,
            sourceVisualization: shown?.source.visualization ?? sourceViewPicture,
            targetVisualization:
              shown?.target.visualization ?? targetViewPicture(selectedReduction),
            solver: solver.className,
            seed: runSeed,
            signal,
          })
        : null;
      if (view) {
        const fields = viewRunFields(view);
        const solveFrames = view.frames.filter((frame) => frame.phase === "solve");
        const certificates = await viewCertificates(run, view, solver, signal);
        return {
          ...ran,
          view,
          solverName: fields.solverName || solver.name,
          seed: view.seed,
          answer: solveFrames.at(-1)?.caption ?? "",
          mappedBack: fields.mappedBack,
          mapNote: null,
          ...certificates,
        };
      }
      const targetInstance = run.targetInstance ?? run.view?.target.instance ?? null;
      if (!targetInstance) {
        throw new Error(`Redux did not send the ${run.targetName} instance it built.`);
      }
      const answer = asCertificate(
        await requestSolvedInstance(REDUX_API_BASE_URL, solver.className, targetInstance, signal),
      );
      let mappedBack = null;
      let mapNote = null;
      try {
        const mapped = asCertificate(
          await requestMappedSolutionBack(
            REDUX_API_BASE_URL,
            run.reductionClassName,
            run.instance,
            answer,
            signal,
          ),
        );
        mappedBack = { text: mapped, ok: null };
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        mapNote =
          error?.payload?.error === "no_backward_map" || error?.status === 404
            ? `This reduction can't map answers back yet, so only the ${run.targetName} side has an answer.`
            : `The answer was not mapped back: ${error?.message ?? "Redux did not answer."}`;
      }
      return {
        ...ran,
        view: null,
        solverName: solver.name,
        seed: null,
        answer,
        mappedBack,
        mapNote,
        targetCertificate: answer,
        mappedCertificate: mappedBack?.text ?? null,
      };
    });
  }

  /**
   * #303 stage 4: the certificates behind a Reduction View's Solve, for Verify to check. The view
   * says what its solver found only in captions, so the target's answer is asked for again: from
   * ProblemProvider/solve, or for a randomized solver from visualizeRun with the view's seed (the
   * same run); ProblemProvider/mapSolutionBack then maps it back. Either may be missing (null):
   * Verify's boxes then start empty, to be typed in.
   */
  async function viewCertificates(run, view, solver, signal) {
    const targetInstance = view.target.instance ?? run.targetInstance ?? null;
    const none = { targetCertificate: null, mappedCertificate: null };
    if (!targetInstance) return none;
    let targetCertificate = null;
    try {
      if (Number.isSafeInteger(view.seed)) {
        const seeded = await requestRunPictures({
          instance: targetInstance,
          solver: solver.className,
          seed: view.seed,
          signal,
        });
        if (typeof seeded?.answer === "string" && !seeded.timedOut) {
          targetCertificate = seeded.answer;
        }
      } else {
        targetCertificate = asCertificate(
          await requestSolvedInstance(REDUX_API_BASE_URL, solver.className, targetInstance, signal),
        );
      }
      if (!targetCertificate) return none;
      const mapped = asCertificate(
        await requestMappedSolutionBack(
          REDUX_API_BASE_URL,
          run.reductionClassName,
          run.instance,
          targetCertificate,
          signal,
        ),
      );
      return { targetCertificate, mappedCertificate: mapped };
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      return { targetCertificate, mappedCertificate: null };
    }
  }

  // --- Checks (#303 stage 4) ---------------------------------------------------------------
  /** The Verify tab's Check: the certificate in its box, or `certificate` put there first. */
  function handleVerifyCheck(certificate = verifyCertificate) {
    if (certificate !== verifyCertificate) setVerifyCertificate(certificate);
    verifyCheck.check({ ...verifySpec, certificate });
  }

  // #303: Check it in Verify opens the Verify tab and checks the run's answer there.
  const solveAnswer = solveCurrent ? asCertificate(solveResult.output) : "";
  function handleVerifyAnswer() {
    if (!solveAnswer) return;
    handleVerifyCheck(solveAnswer);
    setTask("verify");
  }

  const canCheckTarget = canCheck(targetSpec) && !targetCheck.request.isRunning;
  const canCheckSource = canCheck(sourceSpec) && !sourceCheck.request.isRunning;
  function checkTarget() {
    if (canCheckTarget) targetCheck.check(targetSpec);
  }
  function checkSource() {
    if (canCheckSource) sourceCheck.check(sourceSpec);
  }
  /** Reduce's Verify stage's main button: both checks, each that can run. */
  function checkBoth() {
    checkTarget();
    checkSource();
  }

  // Map a solution across, from Reduce's Verify stage: the Solve tab's Algorithm answers this
  // instance (or, on the older requests, Reduce's own answer is reused) and the answer is mapped
  // onto the target (ProblemProvider/mapSolution).
  const mapSolver = selectedSolver;
  const mapReuses = reduceCurrent && mapSolver?.className === reduceResult.solverClassName;
  const mapDisabled =
    !reduceCurrent || !mapSolver?.className || mapRun.isRunning || reduceRun.isRunning;

  function handleMap() {
    if (mapDisabled) return;
    const run = reduceResult;
    const solver = mapSolver;
    const reuse = mapReuses;
    const forSolve = solveId;
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
        solveId: forSolve,
      };
    });
  }

  let mapHint = "";
  // Once the Solve tab's Algorithm changes, the hint says what Map across would do now.
  if (mapCurrent && mapResult.solverName === mapSolver?.name) {
    mapHint = `Filled in from ${mapResult.solverName}'s ${problem.name} answer${
      mapResult.reused ? " in this run" : ", solved just now"
    }, mapped onto the ${builtTargetName} instance.`;
  } else if (!mapSolver) {
    mapHint = `${problem.name} has no algorithm to produce an answer to map.`;
  } else if (!mapSolver.className) {
    mapHint = "This algorithm cannot be run: the catalog did not say which backend solver it is.";
  } else if (mapReuses) {
    mapHint = `Uses ${mapSolver.name}'s answer from this run. Nothing new runs.`;
  } else {
    mapHint = `Solves this ${problem.name} instance with ${mapSolver.name} (the Solve tab's Algorithm) first, then maps the answer onto the ${builtTargetName} instance.`;
  }
  let mapAnnouncement = "";
  if (mapRun.status === COMPUTE_RUNNING) mapAnnouncement = "Mapping the answer across.";
  else if (mapRun.status === COMPUTE_DONE)
    mapAnnouncement = `Mapped ${mapResult.solverName}'s answer onto the target.`;
  else if (mapRun.status === COMPUTE_FAILED)
    mapAnnouncement = `The answer was not mapped. ${mapRun.failure?.headline ?? ""}`;
  else if (mapRun.status === COMPUTE_CANCELLED) mapAnnouncement = "Mapping cancelled.";

  // --- The verdict on the Showing line ------------------------------------------------------
  // The Verify tab's verdict, while it still describes what is on screen: the same mode and
  // run, instance and certificate. A check never touches the picture's own state (the run, its
  // current step); a new Run or an instance edit retires it.
  const checked = mode === "solve" ? verifyVerdict : null;
  // Whether the picture holds a run's answer worth protecting (solved, or reduced).
  const pictureRan = mode === "solve" ? showingRunPicture : reduceCurrent;
  let verdictLine = null;
  if (checked) {
    const text =
      checked.valid === null
        ? `Verifier: Redux answered "${checked.text}" for your certificate on the ${checked.label}`
        : `Verifier: your certificate on the ${checked.label} is ${checked.valid ? "valid" : "not valid"}`;
    let button = null;
    // After a Run, only a well-formed but invalid certificate offers to show where it fails;
    // a valid one gets the verdict alone (the picture already shows a correct answer). A new
    // Check is a new verdict, so it starts with the overlay off.
    if (CERTIFICATE_DRAWING_SUPPORTED && pictureRan && checked.valid === false) {
      const on = overlayFor === checked.id;
      button = {
        id: `${ID}-verdict-overlay`,
        label: on ? "Back to the solver's answer" : "Show where it fails",
        pressed: on,
        onClick: () => setOverlayFor(on ? null : checked.id),
      };
    }
    verdictLine = { id: `${ID}-verdict`, text, valid: checked.valid, button };
  }

  // --- What the command bar and picture pane show ------------------------------------------
  const solveRan = Boolean(solveResult);
  const reduceRan = Boolean(reduceResult);
  // #303: Board G's button names (stage 2: Reduce's per stage).
  const targetLabel = selectedReduction?.target ?? targetName ?? "the target";
  let runLabel;
  if (mode === "solve") runLabel = solveRan ? "Solve again" : "Solve";
  else if (reduceStage === "solve")
    runLabel = targetSolveCurrent ? "Solve again" : `Solve through ${targetLabel}`;
  else if (reduceStage === "verify")
    runLabel = targetVerdict || sourceVerdict ? "Check both again" : "Check both";
  else runLabel = reduceRan ? "Rebuild" : "Reduce";
  // #303 stage 4: Verify's main button is Check, and Reduce's Verify stage's Check both.
  let mainButton = { label: runLabel, disabled: runDisabled, onRun: handleRun };
  if (task === "verify") {
    mainButton = {
      label: "Check",
      disabled: !canCheck(verifySpec) || verifyCheck.request.isRunning,
      onRun: () => handleVerifyCheck(),
    };
  } else if (mode === "reduce" && reduceStage === "verify") {
    mainButton = {
      label: runLabel,
      disabled: !canCheckTarget && !canCheckSource,
      onRun: checkBoth,
    };
  }

  let modeNote = "";
  if (task === "verify") {
    if (!sourceVerifier) modeNote = "";
    else if (!sourceVerifier.className)
      modeNote =
        "This verifier cannot be run: the catalog did not say which backend verifier it is.";
    else if (!hasInstance)
      modeNote = "There is no instance to check against. Write one in the Instance box above.";
    else if (verifyCertificate.trim() === "")
      modeNote = "Type an answer to check, then press Check. Checking needs no solver.";
  } else if (mode === "solve") {
    if (solvers.length === 0) modeNote = "No solvers are declared for this problem yet.";
    else if (!canSolve)
      modeNote = "This solver cannot be run: the catalog did not say which backend solver it is.";
    else if (seedInvalid)
      modeNote = `A seed is a whole number up to ${MAX_SEED}. Leave it blank for a random run.`;
  } else if (reductions.length === 0) {
    modeNote = `No reductions from ${problem.name} are declared yet.`;
  } else if (reduceStage === "verify") {
    modeNote = "";
  } else if (reduceStage === "solve") {
    if (!selectedTargetSolver)
      modeNote = `${targetLabel} declares no algorithm, so its instance can't be solved here.`;
    else if (!selectedTargetSolver.className)
      modeNote =
        "This algorithm cannot be run: the catalog did not say which backend solver it is.";
    else if (seedInvalid)
      modeNote = `A seed is a whole number up to ${MAX_SEED}. Leave it blank for a random run.`;
    else
      modeNote = `Solve runs ${selectedTargetSolver.name} on the ${targetLabel} instance the reduction built, then maps its answer back to ${problem.name}.`;
  } else if (!canSolve) {
    modeNote =
      "A reduction carries a solver's answer across, and this problem has no solver to run.";
  } else if (reductionViewWorth(selectedReduction?.className)) {
    modeNote = `Reduce builds the ${selectedReduction.target} instance from this one, step by step.`;
  } else {
    modeNote = `Reduce solves the instance with ${selectedSolver.name} first, then carries the answer across.`;
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
    // #303 stage 2: only once the Solve step has solved the target.
    if (targetSolveRun.isRunning) showing += `, solving with ${selectedTargetSolver?.name}`;
    else if (targetSolveCurrent) showing += `, solved by ${targetSolveResult.solverName}`;
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
      text: "There is no instance to draw. Write one in the Instance box above.",
    };
  } else if (defaultPicture.status === "done") {
    sourceContent = { kind: "message", text: "Redux returned no picture for this instance." };
  } else if (instanceError) {
    sourceContent = {
      kind: "message",
      tone: "error",
      text: "The instance has a problem, so it can't be drawn. Fix it in the Instance box above.",
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
        text: "The reduction did not run. The reason is shown under the Reduce button.",
      };
    } else {
      content = {
        kind: "message",
        text: `Press Reduce to build the ${targetLabel} instance from this one.`,
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
    // #303 stage 2: the pane's label row says what the target is now.
    let targetState;
    if (!reduceCurrent)
      targetState = { k: "Status", v: reduceRun.isRunning ? "being built" : "not built yet" };
    else if (targetSolveCurrent) targetState = { k: "Algorithm", v: targetSolveResult.solverName };
    else if (targetSolveRun.isRunning)
      targetState = { k: "Status", v: `solving with ${selectedTargetSolver?.name}` };
    else targetState = { k: "Status", v: "built" };
    target = {
      parts: [{ k: "Problem", v: targetLabel }, targetState],
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
    // The error itself is shown under the instance editor.
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

  let targetSolveAnnouncement = "";
  const targetSolverName = selectedTargetSolver?.name ?? "the algorithm";
  if (targetSolveRun.status === COMPUTE_RUNNING) {
    targetSolveAnnouncement = `Running ${targetSolverName} on the ${targetLabel} instance. This can take up to a minute.`;
  } else if (targetSolveRun.status === COMPUTE_DONE) {
    targetSolveAnnouncement = `${targetSolveResult.solverName} finished in ${formatSeconds(targetSolveRun.elapsedMs)}.`;
  } else if (targetSolveRun.status === COMPUTE_FAILED) {
    targetSolveAnnouncement = `${targetSolverName} did not run. ${targetSolveRun.failure?.headline ?? ""}`;
  } else if (targetSolveRun.status === COMPUTE_CANCELLED) {
    targetSolveAnnouncement = "Run cancelled.";
  }

  /** What a check's live region says: running, its verdict, or why it did not check. */
  function checkAnnouncement(check) {
    const { request, verdict } = check;
    if (request.status === COMPUTE_RUNNING) return "Checking this certificate.";
    if (verdict) {
      if (verdict.valid === true)
        return `Certificate accepted. It is valid for the ${verdict.label}.`;
      if (verdict.valid === false)
        return `Certificate rejected. It is not valid for the ${verdict.label}.`;
      return `Redux answered: ${verdict.text}`;
    }
    if (request.status === COMPUTE_FAILED)
      return `The certificate was not checked. ${request.failure?.headline ?? ""}`;
    if (request.status === COMPUTE_CANCELLED) return "Check cancelled.";
    return "";
  }

  function cancelSolve() {
    solveRun.cancel();
    pictureRun.cancel();
  }

  // (The instance's own error shows under the instance editor, always on screen.)
  const status = (
    <>
      {modeNote && (
        <Box id={`${ID}-mode-note`} sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
          {modeNote}
        </Box>
      )}
      <Box sx={{ display: task === "solve" ? "block" : "none" }}>
        <ComputeStatus
          quiet
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
          quiet
          idPrefix={`${ID}-reduce`}
          status={reduceRun.status}
          announcement={reduceAnnouncement}
          failure={reduceRun.failure?.code === "instance_parse_error" ? null : reduceRun.failure}
          onCancel={reduceRun.cancel}
          busyLabel={`Running the reduction to ${selectedReduction?.target ?? "the target"}`}
        />
        <ComputeStatus
          quiet
          idPrefix={`${ID}-target-solve`}
          status={targetSolveRun.status}
          announcement={targetSolveAnnouncement}
          failure={targetSolveRun.failure}
          onCancel={targetSolveRun.cancel}
          busyLabel={`Running ${targetSolverName}`}
        />
        {[
          [targetCheck, "target-check", `Checking the ${builtTargetName} answer`],
          [sourceCheck, "source-check", `Checking the ${problem.name} answer`],
        ].map(([check, key, busyLabel]) => (
          <ComputeStatus
            key={key}
            quiet
            idPrefix={`${ID}-${key}`}
            status={check.request.status}
            announcement={checkAnnouncement(check)}
            failure={unreadableFailure(check.request) ? null : check.request.failure}
            onCancel={check.request.cancel}
            busyLabel={busyLabel}
          />
        ))}
        <ComputeStatus
          quiet
          idPrefix={`${ID}-map`}
          status={mapRun.status}
          announcement={mapAnnouncement}
          failure={mapRun.status === COMPUTE_FAILED ? mapRun.failure : null}
          onCancel={mapRun.cancel}
          busyLabel="Mapping the answer across"
        />
      </Box>
      <Box sx={{ display: task === "verify" ? "block" : "none" }}>
        <ComputeStatus
          quiet
          idPrefix={`${ID}-verify-check`}
          status={verifyCheck.request.status}
          announcement={checkAnnouncement(verifyCheck)}
          failure={unreadableFailure(verifyCheck.request) ? null : verifyCheck.request.failure}
          onCancel={verifyCheck.request.cancel}
          busyLabel="Checking this certificate"
        />
      </Box>
    </>
  );

  // #295: the seed the last Solve's run reported, while that run is of this instance and the
  // solver picked now.
  const solveSeed =
    mode === "solve" &&
    !isRunning &&
    pictureRunCurrent &&
    Number.isSafeInteger(pictureResult.seed) &&
    pictureResult.solverClassName === (selectedSolver?.className ?? null)
      ? { seed: pictureResult.seed }
      : null;

  // #303 stage 2: the Solve step's answer and its map back, once it ran.
  let solvedFields = {};
  if (targetSolveCurrent) {
    solvedFields = {
      solverName: targetSolveResult.solverName,
      mappedBack: targetSolveResult.mappedBack,
    };
    // #912: another target picture may run another solver; the results report the view shown.
    if (viewSolved && switchedCurrent) solvedFields = viewRunFields(switchedView.view);
  }

  // --- The results (#303 stage 4: Board G's one list of rows) ------------------------------
  // Each fact once: an answer in its copyable field, with the time in its sentence; the target
  // instance with the build; the verdicts as rows. The run's status lines under the bar are
  // spoken, not shown (ComputeStatus `quiet`).
  const resultRows = [];
  let resultsEmpty = "";
  /** A verdict's row: the verifier, what it was checked against, and its answer. */
  function verdictRow(key, verdict, tag, what) {
    const valid = verdict.valid;
    return {
      key,
      tag,
      tone: valid === true ? "ok" : valid === false ? "err" : "info",
      icon: valid === true ? "✓" : valid === false ? "✗" : "?",
      text:
        valid === null
          ? `${verdict.verifierName} answered "${verdict.text}" for ${what}, which is neither True nor False, so this page will not guess which it meant.`
          : `${valid ? "Valid" : "Not valid"}: ${verdict.verifierName} ${
              valid ? "accepts" : "rejects"
            } ${what} for the ${verdict.label}.`,
    };
  }

  if (task === "solve") {
    resultsEmpty = "No run yet: press Solve for an answer.";
    if (solveResult) {
      const changed = solveResult.instance !== instance;
      const answer = asCertificate(solveResult.output);
      if (changed) {
        resultRows.push({
          key: "changed",
          id: `${ID}-result-changed`,
          tone: "warn",
          icon: "!",
          text: "The instance changed since this run. Press Solve again for an answer to the new one; Check it in Verify waits for it.",
        });
      }
      resultRows.push({
        key: "answer",
        tone: "ok",
        icon: "✓",
        text: `${solveResult.solverName}'s answer, ${formatSeconds(solveRun.elapsedMs)} round trip:`,
        code: {
          id: `${ID}-result-answer`,
          text: answer || "The solver returned an empty answer.",
        },
        action: {
          id: `${ID}-result-verify-answer`,
          label: "Check it in Verify",
          disabled: !answer || changed || !sourceVerifier?.className,
          onClick: handleVerifyAnswer,
        },
      });
      if (solveSeed) {
        resultRows.push({
          key: "seed",
          tone: "info",
          icon: "#",
          text: <SeedText id={`${ID}-result-seed`} seed={solveSeed.seed} />,
        });
      }
    }
  } else if (task === "verify") {
    resultsEmpty = sourceVerifier ? "Nothing checked yet: type an answer and press Check." : "";
    if (verifyVerdict) {
      resultRows.push(verdictRow("verdict", verifyVerdict, undefined, "this answer"));
    }
  } else if (selectedReduction) {
    if (!reduceCurrent) {
      resultRows.push({
        key: "reduce-next",
        tag: "Reduce",
        tone: "info",
        icon: "1",
        text: `Reduce builds the ${targetLabel} instance from this one. Solve then runs a ${targetLabel} algorithm on it and maps the answer back to ${problem.name}, and Verify checks both answers.`,
      });
    } else {
      const builds = reduceResult.view
        ? reduceResult.view.frames.filter((frame) => frame.phase === "build").length
        : 0;
      // The older requests solve this instance first, and the build carries that answer across.
      const carried = reduceResult.solverName
        ? `, carrying ${reduceResult.solverName}'s answer across`
        : "";
      resultRows.push({
        key: "reduce-done",
        tag: "Reduce",
        tone: "ok",
        icon: "✓",
        text: `Built the ${reduceResult.targetName} instance with ${reduceResult.reductionName}${
          builds > 0 ? ` in ${builds} step${builds === 1 ? "" : "s"}` : ""
        }${carried}, ${formatSeconds(reduceRun.elapsedMs)}:`,
        code: {
          id: `${ID}-result-target-instance`,
          text:
            reduceResult.targetInstance ??
            "Redux did not send the target instance's text for this run.",
          maxHeight: 180,
        },
      });
      if (targetSolveCurrent) {
        const solved = targetSolveResult;
        const time = formatSeconds(targetSolveRun.elapsedMs);
        resultRows.push(
          solved.targetCertificate
            ? {
                key: "solve-answer",
                tag: "Solve",
                tone: "ok",
                icon: "✓",
                text: `${solvedFields.solverName} on the ${solved.targetName} instance, ${time}:`,
                code: { id: `${ID}-result-target-answer`, text: solved.targetCertificate },
              }
            : {
                key: "solve-answer",
                tag: "Solve",
                tone: "ok",
                icon: "✓",
                text: `${solvedFields.solverName} on the ${solved.targetName} instance: ${
                  solved.answer || "no answer came back"
                }${/[.!?]$/.test(solved.answer ?? "") ? "" : "."} ${time}.`,
              },
        );
        const mapped = solvedFields.mappedBack;
        if (mapped && solved.mappedCertificate) {
          resultRows.push({
            key: "solve-mapped",
            tag: "Solve",
            tone: mapped.ok === false ? "err" : "ok",
            icon: "←",
            text: `Mapped back to ${problem.name}:`,
            code: { id: `${ID}-result-mapped-back`, text: solved.mappedCertificate },
          });
        } else if (mapped) {
          resultRows.push({
            key: "solve-mapped",
            tag: "Solve",
            tone: mapped.ok === false ? "err" : "ok",
            icon: "←",
            text: `Mapped back to ${problem.name}: ${mapped.text}`,
          });
        } else {
          resultRows.push({
            key: "solve-mapped",
            tag: "Solve",
            tone: "warn",
            icon: "!",
            text:
              solved.mapNote ??
              `This reduction can't map answers back yet, so only the ${solved.targetName} side has an answer.`,
          });
        }
        if (Number.isSafeInteger(solved.seed)) {
          resultRows.push({
            key: "solve-seed",
            tag: "Solve",
            tone: "info",
            icon: "#",
            text: <SeedText id={`${ID}-result-target-seed`} seed={solved.seed} />,
          });
        }
        // Verify's two checks, then whether they agree.
        if (targetVerdict) {
          resultRows.push(
            verdictRow("verify-target", targetVerdict, "Verify", `the ${solved.targetName} answer`),
          );
        }
        if (sourceVerdict) {
          resultRows.push(
            verdictRow(
              "verify-source",
              sourceVerdict,
              "Verify",
              `the mapped-back ${problem.name} answer`,
            ),
          );
        }
        if (targetVerdict && sourceVerdict) {
          const onTarget = targetVerdict.valid;
          const onSource = sourceVerdict.valid;
          let agree = null;
          if (onTarget === true && onSource === true) {
            agree = {
              tone: "ok",
              icon: "=",
              text: "Both checks pass: the reduction carried this answer across correctly for this instance. Only a proof shows it works for every instance.",
            };
          } else if (onTarget === true && onSource === false) {
            agree = {
              tone: "err",
              icon: "≠",
              text: `The checks disagree: the ${solved.targetName} answer is valid but the one mapped back to ${problem.name} is not, so the reduction or its answer map has a bug (or an answer was edited).`,
            };
          } else if (onTarget === false && onSource === true) {
            agree = {
              tone: "warn",
              icon: "≠",
              text: `The checks disagree: the mapped-back ${problem.name} answer is valid but the ${solved.targetName} answer is not.`,
            };
          } else if (onTarget === false && onSource === false) {
            agree = { tone: "err", icon: "=", text: "Both checks reject their answers." };
          }
          if (agree) resultRows.push({ key: "verify-agree", tag: "Verify", ...agree });
        } else if (!targetVerdict && !sourceVerdict) {
          resultRows.push({
            key: "verify-next",
            tag: "Verify",
            tone: "info",
            icon: "3",
            text: `Next: Verify checks the ${solved.targetName} answer with a ${solved.targetName} verifier, and the mapped-back answer with a ${problem.name} verifier.`,
          });
        }
      } else if (!targetSolveRun.isRunning) {
        resultRows.push({
          key: "solve-next",
          tag: "Solve",
          tone: "info",
          icon: "2",
          text: selectedTargetSolver
            ? `Next: Solve through ${targetLabel} runs ${selectedTargetSolver.name} on the built instance. The ${problem.name} side gets its answer by mapping back, not by solving ${problem.name}.`
            : `${targetLabel} declares no algorithm, so the built instance can't be solved here.`,
        });
      }
    }
  } else {
    resultsEmpty = `No reductions from ${problem.name} are declared yet.`;
  }

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

  const resultPanel = (
    <ResultPanel
      idPrefix={`${ID}-result`}
      rows={resultRows}
      empty={resultsEmpty}
      gadgets={
        reduceGadgets.length > 0
          ? {
              runId: reduceResult.runId,
              gadgets: reduceGadgets,
              sourceFrame: sourceContent.kind === "frame" ? sourceContent.frame : null,
              targetFrame: reducedTargetFrame(reduceResult),
              namers: gadgetNamers,
              colors: gadgetRowColors,
              activeIndex: activeGadget ? gadgetHighlight.index : null,
              onHighlight: handleGadgetHighlight,
            }
          : null
      }
    />
  );

  // #303 stage 4: the Verifier menus, always a dropdown with its (i), even with one verifier.
  function verifierSelect(list, chosen, onPick) {
    if (!chosen) return null;
    return {
      value: chosen.className,
      options: list.map((verifier) => ({
        value: verifier.className,
        label: verifier.name,
        tags: [],
        card: verifierCard(verifier),
      })),
      onChange: onPick,
    };
  }
  const sourceVerifierSelect = verifierSelect(verifiers, sourceVerifier, setSourceVerifierPick);
  const verifyRow = sourceVerifier ? (
    <VerifyTaskRow
      idPrefix={`${ID}-verify`}
      field={{
        label: "Answer to check",
        value: verifyCertificate,
        onChange: setVerifyCertificate,
        verifier: sourceVerifier,
        unreadable: unreadableFailure(verifyCheck.request),
      }}
      useAnswer={
        solveAnswer && solveAnswer !== verifyCertificate
          ? () => handleVerifyCheck(solveAnswer)
          : null
      }
    />
  ) : null;
  const reduceVerify = targetSolveCurrent ? (
    <Box
      id={`${ID}-checks`}
      sx={{
        flex: "1 1 560px",
        minWidth: 0,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        gap: "14px 16px",
      }}
    >
      <ReduceVerifySide
        idPrefix={`${ID}-verify-target`}
        select={
          targetVerifier
            ? {
                label: `${builtTargetName} verifier`,
                ...verifierSelect(targetVerifiers, targetVerifier, (className) =>
                  setTargetVerifierPicks((picks) => ({
                    ...picks,
                    [selectedReduction.target]: className,
                  })),
                ),
              }
            : null
        }
        noVerifier={`${builtTargetName} declares no verifier, so its answer can't be checked here.`}
        field={{
          label: `${builtTargetName} answer`,
          value: targetCertificate,
          onChange: (text) => setReduceCertificate("target", text),
          verifier: targetVerifier,
          unreadable: unreadableFailure(targetCheck.request),
        }}
        onCheck={checkTarget}
        checkDisabled={!canCheckTarget}
        extra={
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Box
              id={`${ID}-map-button`}
              component="button"
              type="button"
              disabled={mapDisabled}
              aria-describedby={`${ID}-map-hint`}
              onClick={handleMap}
              sx={{ ...secondaryButtonSx, alignSelf: "flex-start" }}
            >
              Map a {problem.name} answer across
            </Box>
            <Box id={`${ID}-map-hint`} sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
              {mapHint}
            </Box>
          </Box>
        }
      />
      <ReduceVerifySide
        idPrefix={`${ID}-verify-source`}
        select={
          sourceVerifierSelect
            ? {
                label: `${problem.name} verifier, for the mapped-back answer`,
                ...sourceVerifierSelect,
              }
            : null
        }
        noVerifier={`${problem.name} declares no verifier, so the mapped-back answer can't be checked here.`}
        field={{
          label: `Mapped-back ${problem.name} answer`,
          value: mappedCertificate,
          onChange: (text) => setReduceCertificate("source", text),
          verifier: sourceVerifier,
          unreadable: unreadableFailure(sourceCheck.request),
        }}
        onCheck={checkSource}
        checkDisabled={!canCheckSource}
      />
    </Box>
  ) : null;

  // #303: what full screen hides stays mounted, so a half-typed certificate or an open
  // Legend survives going in and out.
  const hiddenInFull = fullScreen ? { display: "none" } : {};
  // What full screen is titled: the problem, or in Reduce (#303 stage 2) the reduction or one pane's problem.
  let fullTitle = problem.name;
  if (fullOn === "all" && mode === "reduce") fullTitle = `${problem.name} ${ARROW} ${targetLabel}`;
  else if (fullOn === "target") fullTitle = targetLabel;

  return (
    <Box
      id={ID}
      component="section"
      aria-label={fullScreen ? `${problem.name}, full screen` : "Workspace"}
      data-full-screen={fullScreen ? "true" : undefined}
      data-full-screen-on={fullOn ?? undefined}
      onKeyDown={(event) => {
        if (event.key === "Escape" && fullScreen && !event.defaultPrevented) {
          setFullScreen(null);
        }
      }}
      sx={{
        backgroundColor: "surface.main",
        border: "1px solid",
        borderColor: "border.soft",
        borderRadius: "18px",
        boxSizing: "border-box",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        p: "28px",
        [COMPACT_MEDIA]: { p: 2.5, gap: 2.5 },
        [PHONE_MEDIA]: { p: 1.5, gap: 2, borderRadius: "14px" },
        ...(fullScreen
          ? {
              position: "fixed",
              inset: 0,
              zIndex: "modal",
              borderRadius: 0,
              border: "none",
              overflow: "auto",
              p: "20px 28px",
              gap: 2.25,
              [COMPACT_MEDIA]: { p: 2, gap: 2 },
              [PHONE_MEDIA]: { p: 1.5, gap: 1.5, borderRadius: 0 },
            }
          : {}),
      }}
    >
      {fullScreen && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box
            component="h2"
            id={`${ID}-full-title`}
            sx={{ m: 0, fontSize: "1rem", fontWeight: 700 }}
          >
            {fullTitle}
          </Box>
          <Box
            id={`${ID}-full-exit`}
            ref={exitRef}
            component="button"
            type="button"
            onClick={() => setFullScreen(null)}
            sx={secondaryButtonSx}
          >
            Exit full screen
          </Box>
        </Box>
      )}

      <Box sx={hiddenInFull}>
        <InstancePanel
          idPrefix={`${ID}-instance`}
          problem={problem}
          instance={instance}
          onInstanceChange={setInstance}
          instanceError={instanceError}
        />
      </Box>

      {/* #303 stage 3: on full screen the pictures' wheel and one finger zoom and pan. */}
      <PictureFullScreen.Provider value={Boolean(fullScreen)}>
        <VisualizationPane
          idPrefix={ID}
          showing={showing}
          showingIsError={Boolean(instanceError)}
          verdict={verdictLine}
          source={{
            // #303 stage 2: Reduce's source pane's label row.
            parts: [
              { k: "Problem", v: problem.name },
              ...(targetSolveCurrent && solvedFields.mappedBack
                ? [
                    {
                      k: "Answer",
                      // The problem the view drew, when there is one (as its Problem part).
                      v: `mapped back from ${wholeView?.target?.problem ?? targetSolveResult.targetName}`,
                    },
                  ]
                : []),
            ],
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
          fullScreen={{ on: fullOn, onToggle: toggleFullScreen }}
        />
      </PictureFullScreen.Provider>

      <Box sx={{ display: fullScreen ? "none" : "flex", flexDirection: "column", gap: 2.5 }}>
        <CommandBar
          idPrefix={ID}
          task={task}
          onTaskChange={setTask}
          solver={
            solvers.length > 0
              ? {
                  value: String(solverIndex),
                  options: solvers.map((solver, index) => ({
                    value: String(index),
                    label: solver.name,
                    tags: solverTags(solver),
                    listTags: solverListTags(solver),
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
          seed={seedShown ? { value: seedText, onChange: setSeedText, invalid: seedInvalid } : null}
          stepper={
            reductions.length > 0
              ? {
                  stages: reduceStages,
                  shown: reduceStage,
                  onPick: setReduceStagePick,
                  busy: isRunning,
                  solver:
                    targetSolvers.length > 0
                      ? {
                          label: `${targetLabel} algorithm`,
                          value: selectedTargetSolver?.className ?? "",
                          options: targetSolvers.map((solver) => ({
                            value: solver.className,
                            label: solver.name,
                            tags: solverTags(solver),
                            listTags: solverListTags(solver),
                            card: solverCard(solver),
                          })),
                          onChange: (className) =>
                            setTargetSolverPicks((picks) => ({
                              ...picks,
                              [selectedReduction.target]: className,
                            })),
                        }
                      : null,
                  noSolver: `${targetLabel} declares no algorithm.`,
                  verify: reduceVerify,
                }
              : null
          }
          verifier={sourceVerifierSelect}
          runLabel={mainButton.label}
          runDisabled={mainButton.disabled}
          onRun={mainButton.onRun}
          verify={verifyRow}
          status={status}
        />

        <Box component="section" aria-label="Results" id={`${ID}-results`}>
          {resultPanel}
        </Box>
      </Box>
    </Box>
  );
}
