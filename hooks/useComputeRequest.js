// hooks/useComputeRequest.js
//
// T37 (#95): the shared plumbing behind live Run (Solvers) and live Verify
// (Verifier). One hook rather than two copies: #95 folded the two tasks
// together precisely because the request handling, the loading state, the
// aria-live announcement, the cancel behaviour and the error copy are the
// same for both, and the only real difference is what each section does
// with the answer.
//
// What it owns:
//
//   - The four states a request can be in, and only ever one at a time per
//     section ("one run at a time", #95). Starting a new request aborts the
//     one before it.
//   - Staleness. Every request gets a sequence number, and a response whose
//     number is no longer the current one is dropped instead of rendered.
//     That is what stops a slow solve landing in the pane after the visitor
//     has switched to a different solver.
//   - Cancel, via AbortController. Be accurate about what that means: it
//     stops this browser waiting, and it stops a stale answer arriving. It
//     does NOT stop the backend computing. The proxy's 60s compute timeout
//     (T36/#94, pages/api/redux/[...path].js) is the only thing that
//     actually bounds the work, and the copy below says so.
//   - Turning a failure into copy a person can act on. T36 made the failure
//     cases distinguishable on purpose (502 unreachable, 504 timeout, 413
//     too big, 429 rate-limited) and the Redux API distinguishes its own
//     rejections further still, so collapsing all of it into one "something
//     went wrong" would throw that away.

import { useCallback, useRef, useState } from "react";
import { ReduxRequestError } from "../lib/redux";

/** Nothing has been run yet, or the last result was cleared. */
export const COMPUTE_IDLE = "idle";
/** A request is in flight. */
export const COMPUTE_RUNNING = "running";
/** A request came back and its value is in `result`. */
export const COMPUTE_DONE = "done";
/** A request failed and `failure` describes why. */
export const COMPUTE_FAILED = "failed";
/** The visitor pressed Cancel. */
export const COMPUTE_CANCELLED = "cancelled";

// The proxy's own limits, repeated here only so the copy can name real
// numbers. Kept as named constants so the two places stay easy to compare
// if pages/api/redux/[...path].js ever changes them.
const PROXY_COMPUTE_TIMEOUT_SECONDS = 60;
const PROXY_BODY_LIMIT_LABEL = "1 MB";
const PROXY_RATE_LIMIT_PER_MINUTE = 10;

function isAbort(error) {
  return error?.name === "AbortError";
}

/**
 * Turns a thrown request failure into a headline and an explanation.
 *
 * Every branch here corresponds to a case the layers underneath genuinely
 * distinguish, so the copy can say something true and specific rather than
 * hedging. `expected` is carried separately from `detail` because the Redux
 * API supplies the format it wanted as its own field, and showing it next
 * to the complaint is the single most useful thing on a rejected input.
 *
 * @param {Error} error
 * @param {string} subject What was being sent, for the copy: "instance" or
 *   "certificate".
 * @returns {{headline: string, detail: string, expected?: string}}
 */
export function describeComputeFailure(error, subject = "instance") {
  if (!(error instanceof ReduxRequestError)) {
    // fetch itself rejected, so there was never a response: the browser
    // could not reach this app's own server. Distinct from a 502, which
    // means this app's server was reached and Redux behind it was not.
    return {
      headline: "The request could not be sent",
      detail:
        "Your browser could not reach this site's server, so nothing was asked of Redux. Check your connection and try again.",
    };
  }

  const payload = error.payload ?? {};
  const apiError = typeof payload.error === "string" ? payload.error : "";
  const apiDetail = typeof payload.detail === "string" ? payload.detail : "";
  const expected =
    typeof payload.expected === "string" && payload.expected ? payload.expected : undefined;

  switch (error.status) {
    case 502:
      return {
        headline: "Couldn't reach the Redux backend",
        detail:
          "This site's server is running, but the Redux API behind it did not answer. It may be down or restarting. Try again in a moment.",
      };
    case 504:
      return {
        headline: "This took too long",
        detail: `Redux did not finish within ${PROXY_COMPUTE_TIMEOUT_SECONDS} seconds, so the request was given up on. A smaller instance, or a faster solver if this problem declares one, will usually come back in time.`,
      };
    case 413:
      return {
        headline: "Too much text to send",
        detail: `The request came to more than ${PROXY_BODY_LIMIT_LABEL}, which is the most this site will forward to Redux. Shorten the ${subject} and try again.`,
      };
    case 429: {
      const wait = error.retryAfterSeconds > 0 ? `${error.retryAfterSeconds} seconds` : "a moment";
      return {
        headline: "Too many runs in a row",
        detail: `This site accepts ${PROXY_RATE_LIMIT_PER_MINUTE} runs a minute so one visitor cannot tie up the backend. Wait ${wait} and try again.`,
      };
    }
    default:
      break;
  }

  if (apiError === "instance_parse_error") {
    return {
      headline: "Redux could not read this instance",
      detail: apiDetail || "The instance is not in the format this problem expects.",
      expected,
    };
  }

  if (apiError === "certificate_parse_error") {
    return {
      headline: "Redux could not read this certificate",
      detail: apiDetail || "The certificate is not in the format this problem expects.",
      expected,
    };
  }

  if (apiError === "unknown_solver" || apiError === "unknown_verifier") {
    return {
      headline: "Redux does not recognise that choice",
      detail:
        "The catalog offered something the backend no longer has. Reload the page to pick up the current list.",
    };
  }

  if (error.status >= 400 && error.status < 500) {
    return {
      headline: `Redux rejected this ${subject}`,
      detail:
        apiDetail || apiError || `The backend answered ${error.status} without explaining why.`,
      expected,
    };
  }

  return {
    headline: "Redux ran into a problem",
    detail:
      apiDetail ||
      apiError ||
      `The backend answered ${error.status}${error.statusText ? ` (${error.statusText})` : ""}.`,
  };
}

/**
 * @param {Object} [options]
 * @param {string} [options.subject] "instance" or "certificate", used in the
 *   failure copy. See `describeComputeFailure`.
 * @returns {{
 *   status: string,
 *   result: unknown,
 *   failure: {headline: string, detail: string, expected?: string}|null,
 *   elapsedMs: number,
 *   isRunning: boolean,
 *   start: (perform: (signal: AbortSignal) => Promise<unknown>) => Promise<void>,
 *   cancel: () => void,
 *   reset: () => void,
 * }}
 */
export function useComputeRequest({ subject = "instance" } = {}) {
  const [status, setStatus] = useState(COMPUTE_IDLE);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Bumped on every start, cancel and reset. A settled request compares the
  // number it was given against this one and stays quiet if they differ,
  // which is what makes a stale response impossible to render.
  const requestIdRef = useRef(0);
  const controllerRef = useRef(null);

  const abortInFlight = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const start = useCallback(
    async (perform) => {
      requestIdRef.current += 1;
      const requestId = requestIdRef.current;

      abortInFlight();
      const controller = new AbortController();
      controllerRef.current = controller;

      setStatus(COMPUTE_RUNNING);
      setResult(null);
      setFailure(null);
      setElapsedMs(0);

      const startedAt = Date.now();
      try {
        const value = await perform(controller.signal);
        if (requestIdRef.current !== requestId) return;
        setElapsedMs(Date.now() - startedAt);
        setResult(value);
        setStatus(COMPUTE_DONE);
      } catch (error) {
        if (requestIdRef.current !== requestId) return;
        // A cancelled request has already had its state set by `cancel`.
        // Landing on COMPUTE_FAILED here would overwrite that with an error
        // the visitor caused on purpose.
        if (isAbort(error)) return;
        setElapsedMs(Date.now() - startedAt);
        setFailure(describeComputeFailure(error, subject));
        setStatus(COMPUTE_FAILED);
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    },
    [abortInFlight, subject],
  );

  const cancel = useCallback(() => {
    requestIdRef.current += 1;
    abortInFlight();
    setStatus(COMPUTE_CANCELLED);
    setResult(null);
    setFailure(null);
  }, [abortInFlight]);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    abortInFlight();
    setStatus(COMPUTE_IDLE);
    setResult(null);
    setFailure(null);
    setElapsedMs(0);
  }, [abortInFlight]);

  return {
    status,
    result,
    failure,
    elapsedMs,
    isRunning: status === COMPUTE_RUNNING,
    start,
    cancel,
    reset,
  };
}
