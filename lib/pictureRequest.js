// lib/pictureRequest.js
//
// #199: asks Redux for a picture, in whichever format this site can draw it in.
//
//   1. Ask for `format=frames`, with the chosen solver. Redux answers
//      `{type, payload, frames}`, and `type` names the picture type.
//   2. If a renderer is registered for that type (components/pictures/registry.js), that is
//      the picture.
//   3. Otherwise ask again without `format=frames`, for the old flat list of frames, and draw
//      it with the renderer the visualization had before (VisualizationCanvas.js).
//
// The visualization's `pictureType` (from Navigation/Batch/allInfo, ReduxISU/Redux#841) says
// up front what step 1 would answer, so when it names a type with no renderer here (or is null:
// a visualization with no frames picture), step 1 is skipped. Every compute request counts
// toward the proxy's 10 a minute, so asking twice when the answer is known would halve a
// visitor's budget for nothing. A backend older than the field leaves it out (undefined), and
// then step 1 always runs. A backend older than `format=frames` ignores the parameter and
// answers with the flat list straight away, which is used as is.

import { hasPictureRenderer } from "../components/pictures/registry";
import { REDUX_API_BASE_URL, requestVisualizedInstance } from "./redux";

/**
 * @typedef {{format: "frames", type: string, payload: Object|null, frames: Object[]}
 *   | {format: "list", frames: Object[]}} Picture
 *   "frames": drawn by components/pictures/PictureCanvas.js. "list": the old flat frame array,
 *   drawn by components/detail/visualizations/VisualizationCanvas.js.
 */

/**
 * @param {Object} options
 * @param {{className: string, pictureType?: string|null}} options.visualization
 * @param {string} options.instance The instance text.
 * @param {string} [options.solver] The solver class name whose run to draw.
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Picture>}
 * @throws {ReduxRequestError} if a request fails.
 */
export async function requestPicture({ visualization, instance, solver, signal }) {
  const { className, pictureType } = visualization;
  const knownWithoutRenderer = pictureType !== undefined && !hasPictureRenderer(pictureType);

  if (!knownWithoutRenderer) {
    const response = await requestVisualizedInstance(
      REDUX_API_BASE_URL,
      className,
      instance,
      signal,
      solver,
      "frames",
    );
    if (Array.isArray(response)) return { format: "list", frames: response };
    if (hasPictureRenderer(response?.type) && Array.isArray(response.frames)) {
      return {
        format: "frames",
        type: response.type,
        payload: response.payload ?? null,
        frames: response.frames,
      };
    }
  }

  const frames = await requestVisualizedInstance(
    REDUX_API_BASE_URL,
    className,
    instance,
    signal,
    solver,
  );
  return { format: "list", frames: Array.isArray(frames) ? frames : [] };
}
