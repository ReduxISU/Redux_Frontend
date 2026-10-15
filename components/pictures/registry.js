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
//        { idPrefix, name, payload, frame, frameIndex, frameCount, highlightIds }
//      where `payload` is the response's static part, `frame` is `frames[frameIndex]`, `name`
//      is the visualization's name (for labels) and `highlightIds` are gadget piece ids
//      (#239; ignore them until then). Draw with React-owned SVG inside DiagramSvg.js (or plain
//      HTML when the picture is text, as the Table is), take every color from
//      pictureStates.js's pictureStateStyle(), and give every focusable piece an aria-label.
//   2. Add it to PICTURE_RENDERERS below under the exact `type` Redux sends.
//   3. If the picture draws annotations that are not states (group colors, order badges,
//      missing edges), export a function (payload, frames) => [{key, text, swatch}] from the
//      renderer's file and add it to PICTURE_ANNOTATIONS below, so the Legend lists them
//      (swatch kinds: components/workbench/Legend.js).
//   4. Capture a payload from the live API into tests/e2e/picture-payloads.js and cover it in
//      tests/e2e/picture-renderers.spec.js.
// Nothing else changes: the request, the fallback, the step controls, the caption line and the
// Legend all key off this table.

import GraphRenderer, { graphAnnotations } from "./GraphRenderer";
import TableRenderer from "./TableRenderer";

/** Picture type (the response's `type`) -> its renderer. */
export const PICTURE_RENDERERS = {
  Graph: GraphRenderer,
  Table: TableRenderer,
};

/** Picture type -> the Legend entries for its annotations (see step 3 above). */
const PICTURE_ANNOTATIONS = {
  Graph: graphAnnotations,
};

/**
 * The Legend entries for what a picture draws besides its states, over a run's frames.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function pictureAnnotations(type, payload, frames) {
  const annotate = Object.hasOwn(PICTURE_ANNOTATIONS, type) ? PICTURE_ANNOTATIONS[type] : null;
  return annotate ? annotate(payload, frames) : [];
}

/** True when this site draws `type` from a format=frames response. */
export function hasPictureRenderer(type) {
  return typeof type === "string" && Object.hasOwn(PICTURE_RENDERERS, type);
}
