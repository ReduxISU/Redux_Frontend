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
//      (#239; ignore them until then). Before Run, `frame` is the plain frame (plainFrame()
//      below; `{}` unless the type registers one) and `frameIndex` is null: the renderer must
//      draw the whole instance from the payload alone, every piece in Background, and place
//      it exactly where the run's steps will (a layout that is a pure function of the payload). Draw with React-owned SVG inside DiagramSvg.js (or plain
//      HTML when the picture is text, as the Table is), take every color from
//      pictureStates.js's pictureStateStyle(), and give every focusable piece an aria-label.
//   2. Add it to PICTURE_RENDERERS below under the exact `type` Redux sends.
//   3. If the picture draws annotations that are not states (group colors, order badges,
//      missing edges), export a function (payload, frames) => [{key, text, swatch}] from the
//      renderer's file and add it to PICTURE_ANNOTATIONS below, so the Legend lists them
//      (swatch kinds: components/workbench/Legend.js).
//   4. Only if the type keeps instance data in its frames rather than its payload (the Table's
//      cell text): add a function (payload, frames) => frame to PICTURE_PLAIN_FRAMES below that
//      keeps that data and drops every state and step annotation.
//   5. Capture a payload from the live API into tests/e2e/picture-payloads.js and cover it in
//      tests/e2e/picture-renderers.spec.js.
// Nothing else changes: the request, the fallback, the step controls, the caption line and the
// Legend all key off this table.

import GraphRenderer, { graphAnnotations } from "./GraphRenderer";
import TableRenderer, { tablePlainFrame } from "./TableRenderer";

/** Picture type (the response's `type`) -> its renderer. */
export const PICTURE_RENDERERS = {
  Graph: GraphRenderer,
  Table: TableRenderer,
};

/** Picture type -> the Legend entries for its annotations (see step 3 above). */
const PICTURE_ANNOTATIONS = {
  Graph: graphAnnotations,
};

/** Picture type -> the plain frame for its default picture, when not `{}` (see step 4 above). */
const PICTURE_PLAIN_FRAMES = {
  Table: tablePlainFrame,
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
