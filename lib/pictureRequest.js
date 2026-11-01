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
//
// #252: `requestRunPictures` asks for one solver run and every picture of it
// (ProblemProvider/visualizeRun, ReduxISU/Redux#895), so the workbench can switch pictures after
// Run without asking again. A backend older than that endpoint answers 404 or 405; that is
// remembered for the rest of the page's life, so only the first Run pays for finding out.

import { hasPictureRenderer } from "../components/pictures/registry";
import {
  REDUX_API_BASE_URL,
  ReduxRequestError,
  requestVisualizedInstance,
  requestVisualizedRun,
} from "./redux";

// Set once the backend has said it has no ProblemProvider/visualizeRun.
let runRouteMissing = false;

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

/**
 * @typedef {{
 *   answer: unknown,
 *   solverName: string|null,
 *   pictures: Object<string, Picture>,
 *   unavailable: Object<string, {reason: string, detail: string}>,
 * }} RunPictures
 *   `pictures` and `unavailable` are keyed by visualization class name. Only pictures this site
 *   has a renderer for are in `pictures`; one it can't draw is in `unavailable` with reason
 *   "no_renderer".
 */

/**
 * Whether one run's pictures (`requestRunPictures`) can draw `visualization`: its picture type
 * has a renderer here, or the catalog doesn't say (a backend older than `pictureType`, which
 * also lacks visualizeRun, so asking finds that out once).
 * @param {{pictureType?: string|null}|null} visualization
 */
export function drawsFromRun(visualization) {
  if (!visualization || runRouteMissing) return false;
  const { pictureType } = visualization;
  return pictureType === undefined || hasPictureRenderer(pictureType);
}

/**
 * Runs `solver` once and gets every picture of the run (ProblemProvider/visualizeRun).
 * @param {Object} options
 * @param {string} options.instance The instance text.
 * @param {string} options.solver The solver class name.
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<RunPictures|null>} null when the backend has no visualizeRun (404 or 405).
 * @throws {ReduxRequestError} if the request fails any other way.
 */
export async function requestRunPictures({ instance, solver, signal }) {
  if (runRouteMissing) return null;
  let response;
  try {
    response = await requestVisualizedRun(REDUX_API_BASE_URL, solver, instance, signal);
  } catch (error) {
    if (error instanceof ReduxRequestError && (error.status === 404 || error.status === 405)) {
      runRouteMissing = true;
      return null;
    }
    throw error;
  }
  const pictures = {};
  const unavailable = {};
  for (const picture of Array.isArray(response?.pictures) ? response.pictures : []) {
    if (typeof picture?.visualization !== "string") continue;
    if (hasPictureRenderer(picture.type) && Array.isArray(picture.frames)) {
      pictures[picture.visualization] = {
        format: "frames",
        type: picture.type,
        payload: picture.payload ?? null,
        frames: picture.frames,
      };
    } else {
      unavailable[picture.visualization] = { reason: "no_renderer", detail: "" };
    }
  }
  for (const gap of Array.isArray(response?.unavailable) ? response.unavailable : []) {
    if (typeof gap?.visualization !== "string") continue;
    unavailable[gap.visualization] = {
      reason: typeof gap.reason === "string" ? gap.reason : "",
      detail: typeof gap.detail === "string" ? gap.detail : "",
    };
  }
  return {
    answer: response?.answer ?? null,
    solverName: typeof response?.solverName === "string" ? response.solverName : null,
    pictures,
    unavailable,
  };
}
