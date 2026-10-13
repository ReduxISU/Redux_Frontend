// hooks/useDefaultPicture.js
//
// #229: the workbench draws the instance before anything runs ("Not run yet. Showing the
// default picture of the instance."). The backend has no separate "just draw it" call, so
// this asks `ProblemProvider/visualize` for the chosen visualization and keeps only the
// first frame, which is the base picture of the instance (VISUALIZATION_TYPE_CONTRACTS.md
// section 2: base state, then steps, then the solved state).
//
// That call is a compute request, so it counts toward the proxy's 10-a-minute limit. Two
// things keep it from eating a visitor's Run budget:
//   - Answers are cached for the session by (visualization, instance), so switching back
//     and forth between types or problems does not ask again.
//   - Typing in the instance box waits for a pause (EDIT_DEBOUNCE_MS) before asking, so a
//     burst of keystrokes is one request, not one per key.
//
// It doubles as the instance check: when Redux cannot read the instance it answers 400
// `instance_parse_error`, which the workbench shows under the command bar and as the red
// dot on the Instance rail button.

import { useCallback, useEffect, useRef, useState } from "react";
import { REDUX_API_BASE_URL, requestVisualizedInstance } from "../lib/redux";
import {
  COMPUTE_DONE,
  COMPUTE_FAILED,
  COMPUTE_RUNNING,
  useComputeRequest,
} from "./useComputeRequest";

const EDIT_DEBOUNCE_MS = 900;

// Session cache: `${className}\u0000${instance}` -> base frame (or null for an empty frame
// list). Module scope so it survives leaving and coming back to a problem page.
const pictureCache = new Map();

function cacheKey(className, instance) {
  return `${className}\u0000${instance}`;
}

/**
 * @param {Object} options
 * @param {{className: string}|null} options.visualization The visualization to draw with.
 * @param {string} options.instance The instance text to draw.
 * @param {boolean} [options.enabled] False skips the request (for example while a run's own
 *   picture for this exact instance is already on screen).
 * @returns {{
 *   frame: Object|null,
 *   instance: string|null,
 *   status: "idle"|"running"|"done"|"failed",
 *   failure: {headline: string, detail: string, expected?: string, code?: string}|null,
 *   instanceError: {headline: string, detail: string, expected?: string}|null,
 *   retry: () => void,
 * }} `instance` is the text the frame was drawn from (needed to turn a diagram edit back
 *   into instance text).
 */
export function useDefaultPicture({ visualization, instance, enabled = true }) {
  const request = useComputeRequest({ subject: "instance" });
  const className = visualization?.className ?? null;
  const hasInstance = instance.trim() !== "";
  const key = className && hasInstance ? cacheKey(className, instance) : null;
  const cached = key !== null && pictureCache.has(key);

  const firstRequestRef = useRef(true);
  // Which (visualization, instance) the last failed request was for, so a failure is only
  // shown while that pair is still the one on screen.
  const [failedKey, setFailedKey] = useState(null);
  const { start } = request;

  const fetchPicture = useCallback(
    (requestKey, requestClassName, requestInstance) => {
      start(async (signal) => {
        try {
          const frames = await requestVisualizedInstance(
            REDUX_API_BASE_URL,
            requestClassName,
            requestInstance,
            signal,
          );
          const frame = Array.isArray(frames) && frames.length > 0 ? frames[0] : null;
          pictureCache.set(requestKey, frame);
          return { key: requestKey, frame };
        } catch (error) {
          setFailedKey(requestKey);
          throw error;
        }
      });
    },
    [start],
  );

  useEffect(() => {
    if (!key || cached || !enabled) return undefined;
    const delay = firstRequestRef.current ? 0 : EDIT_DEBOUNCE_MS;
    const timeoutId = setTimeout(() => {
      firstRequestRef.current = false;
      fetchPicture(key, className, instance);
    }, delay);
    return () => clearTimeout(timeoutId);
  }, [key, cached, enabled, className, instance, fetchPicture]);

  function retry() {
    if (key) fetchPicture(key, className, instance);
  }

  if (cached) {
    return {
      frame: pictureCache.get(key),
      instance,
      status: COMPUTE_DONE,
      failure: null,
      instanceError: null,
      retry,
    };
  }

  // A failure only counts while it is about the instance and visualization now chosen.
  const failureIsCurrent = request.status === COMPUTE_FAILED && failedKey === key && key !== null;
  const failure = failureIsCurrent ? request.failure : null;
  const isRunning = request.status === COMPUTE_RUNNING;

  return {
    frame: null,
    instance: null,
    status: isRunning ? "running" : failure ? "failed" : "idle",
    failure,
    instanceError: failure?.code === "instance_parse_error" ? failure : null,
    retry,
  };
}
