// components/pictures/registry.js
//
// #199: which picture types this site draws from Redux's `format=frames` response, and with
// which renderer. The response names its picture type in `type` ("Table", "Graph", ...), and
// that is the only thing the choice is made on.
//
// A picture type that is not listed here keeps the renderer it had before the redesign: the
// picture is asked for again in the old flat-list format and drawn by
// components/detail/visualizations/VisualizationCanvas.js (lib/pictureRequest.js does that).
// So each picture type switches over on its own, the moment its renderer is added here, and
// nothing that draws today stops drawing in between (#198's rollout).
//
// Adding a renderer (phase B, #200):
//   1. Write components/pictures/<Type>Renderer.js. It receives
//        { idPrefix, name, payload, frame, frameIndex, frameCount, frames, highlightIds }
//      where `payload` is the response's static part, `frame` is `frames[frameIndex]`, `name`
//      is the visualization's name (for labels), `frames` is every frame the steps walk (empty
//      before Run; only a picture whose layout must hold still over a growing run, the Search
//      Tree's, needs it) and `highlightIds` are gadget piece ids (#239; ignore them until then).
//      Before Run, `frame` is the plain frame (plainFrame() below; `{}` unless the type
//      registers one) and `frameIndex` is null: the renderer must draw the whole instance from
//      the payload alone, every piece in Background, and place it exactly where the run's steps
//      will (a layout that is a pure function of the payload).
//      Draw with React-owned SVG inside DiagramZoom.js (DiagramSvg.js with fit, zoom and pan;
//      or plain HTML when the picture is text, as the Table is), take every color from
//      pictureStates.js's pictureStateStyle(), and give every focusable piece an aria-label.
//      A node-link picture also gets `layoutKey` (the instance and visualization drawn) and
//      lets the reader move its nodes and bend its edges (#250): keep the changes with
//      diagramEdits.js's useDiagramEdits([layoutKey ?? payload]), draw every node and edge
//      from the edited positions, mark them with nodeDragProps / edgeDragProps, and pass
//      DiagramZoom an `editor` (makeEditor) with the type's own limits.
//   2. Add it to PICTURE_RENDERERS below under the exact `type` Redux sends.
//   3. If the picture draws annotations that are not states (group colors, order badges,
//      missing edges), export a function (payload, frames, {plain}) => [{key, text, swatch}]
//      from the renderer's file and add it to PICTURE_ANNOTATIONS below, so the Legend lists
//      them (swatch kinds: components/workbench/Legend.js). `plain` is true before Run. If the
//      Legend should list only what the step on screen draws, not the whole run's, add the
//      type to LEGEND_BY_STEP below too.
//   4. Only if the type keeps instance data in its frames rather than its payload (the Table's
//      cell text): add a function (payload, frames) => frame to PICTURE_PLAIN_FRAMES below that
//      keeps that data and drops every state and step annotation.
//   5. Only if the payload carries other runs a reader can step instead of the solver's (an
//      NFA's paths, #204): add a function (payload) => [{id, label, accepted?, frames}] to
//      PICTURE_RUNS below. During a run the renderer then gets `runs` ({options, value,
//      onChange}; value null is the solver's own frames) to draw a picker with, and the step
//      controls, the caption and the Legend follow the chosen run's frames.
//   6. Capture a payload from the live API into tests/e2e/picture-payloads.js and cover it in
//      tests/e2e/picture-renderers.spec.js.
// Nothing else changes: the request, the fallback, the step controls, the caption line and the
// Legend all key off this table.

import AutomatonRenderer, { automatonAnnotations, automatonRuns } from "./AutomatonRenderer";
import BipartiteGraphRenderer, { bipartiteAnnotations } from "./BipartiteGraphRenderer";
import BoardRenderer, { boardAnnotations } from "./BoardRenderer";
import CodeTreeRenderer, { codeTreeAnnotations } from "./CodeTreeRenderer";
import FlowNetworkRenderer, { flowAnnotations } from "./FlowNetworkRenderer";
import GeometryRenderer, { geometryAnnotations } from "./GeometryRenderer";
import GraphRenderer, { graphAnnotations } from "./GraphRenderer";
import GroupedGraphRenderer, { groupedGraphAnnotations } from "./GroupedGraphRenderer";
import LayeredGraphRenderer, { layeredAnnotations } from "./LayeredGraphRenderer";
import PackingRenderer, { packingAnnotations } from "./PackingRenderer";
import QuantumRenderer, { quantumAnnotations } from "./QuantumRenderer";
import ScheduleRenderer, { scheduleAnnotations } from "./ScheduleRenderer";
import SearchTreeRenderer, { searchTreeAnnotations } from "./SearchTreeRenderer";
import TableRenderer, { tablePlainFrame } from "./TableRenderer";
import TripartiteRenderer, { tripartiteAnnotations } from "./TripartiteRenderer";

/** Picture type (the response's `type`) -> its renderer. */
export const PICTURE_RENDERERS = {
  Automaton: AutomatonRenderer,
  BipartiteGraph: BipartiteGraphRenderer,
  Board: BoardRenderer,
  CodeTree: CodeTreeRenderer,
  FlowNetwork: FlowNetworkRenderer,
  Geometry: GeometryRenderer,
  Graph: GraphRenderer,
  GroupedGraph: GroupedGraphRenderer,
  LayeredGraph: LayeredGraphRenderer,
  Packing: PackingRenderer,
  QuantumCircuit: QuantumRenderer,
  Schedule: ScheduleRenderer,
  SearchTree: SearchTreeRenderer,
  Table: TableRenderer,
  TripartiteMatching: TripartiteRenderer,
};

/** Picture type -> the Legend entries for its annotations (see step 3 above). */
const PICTURE_ANNOTATIONS = {
  Automaton: automatonAnnotations,
  BipartiteGraph: bipartiteAnnotations,
  Board: boardAnnotations,
  CodeTree: codeTreeAnnotations,
  FlowNetwork: flowAnnotations,
  Geometry: geometryAnnotations,
  Graph: graphAnnotations,
  GroupedGraph: groupedGraphAnnotations,
  LayeredGraph: layeredAnnotations,
  Packing: packingAnnotations,
  QuantumCircuit: quantumAnnotations,
  Schedule: scheduleAnnotations,
  SearchTree: searchTreeAnnotations,
  TripartiteMatching: tripartiteAnnotations,
};

/**
 * Picture types whose Legend lists only what the step on screen draws (see step 3 above). The
 * rest list what any step of the run draws, so their key holds still while stepping. A Quantum
 * Circuit's run changes what it draws from end to end (highlighted columns, dashed columns still
 * to come, bars of each sign), so a whole-run key would list pieces its Done no longer draws.
 */
const LEGEND_BY_STEP = new Set(["QuantumCircuit"]);

/**
 * The frames a picture's Legend is listed from: the step on screen for a LEGEND_BY_STEP type,
 * else every frame of the run (`frames`), or the plain frame before Run.
 * @param {string} type The response's picture type.
 * @param {Object} frame The frame on screen (the plain frame before Run).
 * @param {Object[]|null} frames The run's frames, or null before Run.
 * @returns {Object[]}
 */
export function pictureLegendFrames(type, frame, frames) {
  return frames && !LEGEND_BY_STEP.has(type) ? frames : [frame];
}

/** Picture type -> the plain frame for its default picture, when not `{}` (see step 4 above). */
const PICTURE_PLAIN_FRAMES = {
  Table: tablePlainFrame,
};

/** Picture type -> the other runs its payload offers (see step 5 above). */
const PICTURE_RUNS = {
  Automaton: automatonRuns,
};

/**
 * The frame a picture is drawn with before Run (hooks/useDefaultPicture.js). Redux sends no
 * base frame (`frames[0]` is the solver's first step), so this is synthesized: an empty frame,
 * which every renderer draws as the instance with every piece in Background and no step's
 * annotations, or the type's own plain frame from PICTURE_PLAIN_FRAMES.
 * @param {string} type The response's picture type.
 * @param {Object|null} payload The response's static part.
 * @param {Object[]} frames The response's frames (only a registered type looks at them).
 * @returns {Object}
 */
export function plainFrame(type, payload, frames) {
  const make = Object.hasOwn(PICTURE_PLAIN_FRAMES, type) ? PICTURE_PLAIN_FRAMES[type] : null;
  return make ? make(payload, frames) : {};
}

/**
 * The Legend entries for what a picture draws besides its states, over the frames pictureLegendFrames
 * gives.
 * @param {string} type The response's picture type.
 * @param {Object|null} payload The response's static part.
 * @param {Object[]} frames The frames the Legend is listed from.
 * @param {{plain?: boolean}} [options] `plain`: the picture is drawn before Run.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function pictureAnnotations(type, payload, frames, { plain = false } = {}) {
  const annotate = Object.hasOwn(PICTURE_ANNOTATIONS, type) ? PICTURE_ANNOTATIONS[type] : null;
  return annotate ? annotate(payload, frames, { plain }) : [];
}

/** True when this site draws `type` from a format=frames response. */
export function hasPictureRenderer(type) {
  return typeof type === "string" && Object.hasOwn(PICTURE_RENDERERS, type);
}

/**
 * The other runs a picture's payload offers to step instead of the solver's (an NFA's paths).
 * @param {string} type The response's picture type.
 * @param {Object|null} payload The response's static part.
 * @returns {Array<{id: string, label: string, accepted?: boolean, frames: Object[]}>}
 */
export function pictureRuns(type, payload) {
  const runs = Object.hasOwn(PICTURE_RUNS, type) ? PICTURE_RUNS[type] : null;
  return runs ? runs(payload) : [];
}
