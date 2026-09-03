/**
 * Functionality for interacting with the backend Redux API.
 *
 * Ported from Redux_GUI's `components/redux/index.js` on 2026-09-02. Left behind on
 * purpose: `requestGadgetMap`/`processReductions`/`composeMappings`, `makeIdsUnique`,
 * `remapIdsDeep`, and every single-item (non-batch) request helper — this catalog only
 * needs the batch endpoints plus the two deferred solve/verify requests. Porting the
 * gadget-map plumbing would mean maintaining code nobody here uses.
 *
 * Error handling (#5): Redux_GUI's version of this file quietly swallows every network
 * error — catches it, logs to the console, and returns `undefined` — so a broken backend
 * renders as an empty page with no explanation. Issue #5 decided against repeating that:
 * this module lets failures propagate (reject) instead of swallowing them, so a caller
 * (the data hooks built in T23/T24) can catch them and drive the "Couldn't reach the
 * Redux backend" banner. Do not reintroduce a try/catch that turns a failure into
 * `undefined` here.
 *
 * T37 (#95) added two things live Run and live Verify need and the read endpoints did
 * not: failures now reject with a `ReduxRequestError` carrying the HTTP status and the
 * parsed response body, so a caller can tell "the backend is down" (502) from "this took
 * too long" (504) from "Redux rejected your instance" (400) instead of all three
 * arriving as the same opaque message; and the two compute requests accept an
 * `AbortSignal` so the browser can stop waiting on a long solve.
 */

/**
 * Base URL of the same-origin proxy every request in this app goes through
 * (`pages/api/redux/[...path].js`). Exported so the detail-page sections that make live
 * Run/Verify calls use the same value the data hooks' callers do, rather than each
 * repeating the literal.
 */
export const REDUX_API_BASE_URL = "/api/redux/";

/**
 * A failed request, carrying enough of the response for a caller to write accurate copy.
 *
 * `status` is the HTTP status (0 when the request never got a response at all, e.g. the
 * browser is offline). `payload` is the parsed JSON body when there was one, which for
 * this app is either the proxy's own `{ error }` shape (T36/#94) or the Redux API's
 * `{ error, problem, expected, received, detail }` shape for a rejected instance or
 * certificate. `retryAfterSeconds` is filled in for a 429 from the proxy's `Retry-After`
 * header.
 */
export class ReduxRequestError extends Error {
  constructor(
    message,
    { status = 0, statusText = "", payload = null, retryAfterSeconds = 0 } = {},
  ) {
    super(message);
    this.name = "ReduxRequestError";
    this.status = status;
    this.statusText = statusText;
    this.payload = payload;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Reads a failed response's body without letting the read itself throw: an error
 * response is not guaranteed to be JSON (a proxy or load balancer in front of the app
 * can return HTML), and losing the real status to a JSON parse error would be worse
 * than losing the body.
 *
 * A body that is not JSON is deliberately returned as `null`. It is almost always an
 * error page from something between this app and Redux, and putting raw HTML in front of
 * a visitor is worse than saying nothing: the HTTP status on its own is more honest and
 * more useful. Callers fall back to describing the status.
 */
async function readErrorPayload(resp) {
  try {
    const text = await resp.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Turns a non-ok response into a `ReduxRequestError`. Shared by both request helpers so
 * a read failure and a compute failure carry the same fields.
 */
async function requestError(resp, failMsg) {
  const payload = await readErrorPayload(resp);
  const headerRetryAfter = Number.parseInt(resp.headers.get("Retry-After") ?? "", 10);
  const retryAfterSeconds = Number.isFinite(headerRetryAfter)
    ? headerRetryAfter
    : (payload?.retryAfterSeconds ?? 0);
  return new ReduxRequestError(`${failMsg()}: ${resp.status} (${resp.statusText})`, {
    status: resp.status,
    statusText: resp.statusText,
    payload,
    retryAfterSeconds,
  });
}

/**
 * @param url Full request URL.
 * @param failMsg Lazily-evaluated description of the request, used in the thrown error.
 * @returns the parsed JSON body of the response.
 * @throws if the request fails (network error) or the response is not `ok`.
 */
async function fetchJson(url, failMsg) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw await requestError(resp, failMsg);
  }
  return await resp.json();
}

/**
 * @param url Full request URL.
 * @param body Request payload, sent as JSON.
 * @param failMsg Lazily-evaluated description of the request, used in the thrown error.
 * @param signal Optional `AbortSignal`. Aborting rejects with the browser's own
 * `AbortError`, which callers check for by name rather than treating as a failure.
 * @returns the parsed JSON body of the response.
 * @throws {ReduxRequestError} if the response is not `ok`; whatever `fetch` throws if the
 * request never got a response at all.
 */
async function fetchPostJson(url, body, failMsg, signal) {
  const resp = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    signal,
  });
  if (!resp.ok) {
    throw await requestError(resp, failMsg);
  }
  return await resp.json();
}

/**
 * Caches the result of an async request in memory, keyed by `cacheKey`. Repeated calls
 * with the same key reuse the in-flight or resolved result instead of re-requesting.
 * Cache is per-page-load only and is cleared on refresh. Failed requests are not cached.
 * @param cacheKey Unique key identifying this request.
 * @param requestFn Function that performs the request when not cached.
 * @returns the cached or freshly-fetched result.
 * @throws whatever `requestFn` throws; the failed entry is evicted first so the next
 * call retries instead of replaying the same failure.
 */
const requestCache = new Map();

async function cachedRequest(cacheKey, requestFn) {
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey);
  }

  const promise = requestFn();
  requestCache.set(cacheKey, promise);

  try {
    return await promise;
  } catch (error) {
    requestCache.delete(cacheKey);
    throw error;
  }
}

/**
 * @param url Base URL of the Redux API (in this app, the same-origin proxy base
 * `/api/redux/` — see `pages/api/redux/[...path].js`, which keeps the real backend
 * origin server-side).
 * @returns an object mapping problem names for the given `problemType`.
 * @throws if the request fails.
 */
export function requestAllProblems(url) {
  return cachedRequest(`${url}|allProblems`, () =>
    fetchJson(`${url}Navigation/Batch/allProblems`, () => "ALL PROBLEMS REQUEST FAILED"),
  );
}

/**
 * @param url Base URL of the Redux API.
 * @returns an object mapping each problem to its available solvers.
 * @throws if the request fails.
 */
export function requestAllSolvers(url) {
  return cachedRequest(`${url}|allSolvers`, () =>
    fetchJson(`${url}Navigation/Batch/allSolvers`, () => "ALL SOLVERS REQUEST FAILED"),
  );
}

/**
 * @param url Base URL of the Redux API.
 * @returns an object mapping each problem to its available verifiers.
 * @throws if the request fails.
 */
export function requestAllVerifiers(url) {
  return cachedRequest(`${url}|allVerifiers`, () =>
    fetchJson(`${url}Navigation/Batch/allVerifiers`, () => "ALL VERIFIERS REQUEST FAILED"),
  );
}

/**
 * @param url Base URL of the Redux API.
 * @returns an object mapping each problem to its available visualizations.
 * @throws if the request fails.
 */
export function requestAllVisualizations(url) {
  return cachedRequest(`${url}|allVisualizations`, () =>
    fetchJson(
      `${url}Navigation/Batch/allVisualizations`,
      () => "ALL VISUALIZATIONS REQUEST FAILED",
    ),
  );
}

/**
 * @param url Base URL of the Redux API.
 * @returns an object containing metadata (`info`) for all interfaces (problems, solvers,
 * verifiers, visualizations).
 * @throws if the request fails.
 */
export function requestAllInfo(url) {
  return cachedRequest(`${url}|allInfo`, () =>
    fetchJson(`${url}Navigation/Batch/allInfo`, () => "ALL INFO REQUEST FAILED"),
  );
}

/**
 * @param url Base URL of the Redux API.
 * @returns an object mapping each visualization class name (e.g.
 * "CliqueDefaultVisualization") to its `visualizationType` wire value (e.g. "GraphD3").
 * @throws if the request fails, including when the endpoint doesn't exist yet on the
 * connected API — callers should fall back to deriving this mapping from
 * `requestAllInfo` in that case.
 */
export function requestAllVisualizationTypes(url) {
  return cachedRequest(`${url}|allVisualizationTypes`, () =>
    fetchJson(
      `${url}Navigation/Batch/allVisualizationTypes`,
      () => "ALL VISUALIZATION TYPES REQUEST FAILED",
    ),
  );
}

/**
 * @param url Base URL of the Redux API.
 * @returns the full reduction graph as an adjacency map:
 * `{ [fromProblemName]: { [toProblemName]: [{className, endpoint, inputType, outputType,
 * fromComplexity, toComplexity, cost}] } }`.
 * @throws if the request fails.
 */
export function requestReductionGraph(url) {
  return cachedRequest(`${url}|reductionGraph`, () =>
    fetchJson(`${url}Navigation/Reductions`, () => "REDUCTION GRAPH REQUEST FAILED"),
  );
}

/**
 * Runs a solver over a problem instance.
 *
 * T37 (#95) turned this on: it was ported in T21 (#30) and called nowhere until now.
 *
 * The Redux API answers with the solved instance as a bare JSON string (verified against
 * the live API on 2026-09-02: `CliqueBruteForce` over Clique's declared instance returns
 * `"{2,3,4,5}"`). It reports no runtime, so there is nothing here for a caller to show as
 * one.
 *
 * @param url Base URL of the Redux API.
 * @param solver Solver class name, e.g. `CliqueBruteForce`, the value
 * `Navigation/Batch/allSolvers` lists, not the human-readable `solverName`.
 * @param instance The problem instance to solve.
 * @param signal Optional `AbortSignal` so the caller can stop waiting. Aborting does not
 * stop the backend computing; only the proxy's own 60s compute timeout does that.
 * @returns the solved `instance` from the specified `solver`.
 * @throws {ReduxRequestError} if the request fails.
 */
export async function requestSolvedInstance(url, solver, instance, signal) {
  return await fetchPostJson(
    `${url}ProblemProvider/solve?solver=${encodeURIComponent(solver)}`,
    instance,
    () => `${solver} SOLVED INSTANCE REQUEST FAILED`,
    signal,
  );
}

/**
 * Checks a certificate against a problem instance.
 *
 * --- Decision: the local `isCertificateValid` check is gone (T37/#95) ------------------
 * This function used to run every certificate through a ported regex validator and
 * return the literal string `"Invalid Input"` without ever calling the backend if it
 * failed. That validator special-cased SAT and SAT3 and returned valid for all 48 other
 * problems in the catalog, so what it actually enforced was "no unusual punctuation",
 * not "this is a well-formed certificate". Its own comment said validation belonged in
 * the API.
 *
 * It now does. Checked against the live API on 2026-09-02: posting a malformed
 * certificate returns HTTP 400 with a body naming the problem, the format it expected,
 * what it received, and why the parse failed, for example
 * `{"error":"certificate_parse_error","problem":"Clique","expected":"Format: {K | K is
 * set} Example: {1,2,4}","detail":"certificate did not parse to a non-empty list of node
 * names"}`. That is better information than the regex could ever produce, it is correct
 * for every problem rather than two, and it stays correct as the backend's parsers
 * change. So the local gate is dropped and the backend is the single authority on
 * whether a certificate is well formed. Recorded as a decision on #95.
 *
 * The `problem` argument went with it: it existed only to pick the SAT/SAT3 branch of
 * that validator, and the backend already identifies the problem in its own error body.
 *
 * The API answers with a bare JSON string, `"True"` or `"False"` (verified against the
 * live API on the same date).
 *
 * @param url Base URL of the Redux API.
 * @param verifier Verifier class name, e.g. `CliqueVerifier`, the value
 * `Navigation/Batch/allVerifiers` lists.
 * @param instance The problem instance being verified.
 * @param certificate The candidate certificate string.
 * @param signal Optional `AbortSignal`, same caveat as `requestSolvedInstance`.
 * @returns the verifier's verdict.
 * @throws {ReduxRequestError} if the request fails, including a 400 for a certificate or
 * instance the backend could not parse.
 */
export async function requestVerifiedInstance(url, verifier, instance, certificate, signal) {
  return await fetchPostJson(
    `${url}ProblemProvider/verify?verifier=${encodeURIComponent(verifier)}`,
    { problemInstance: instance, certificate: certificate },
    () => `${verifier} VERIFIED INSTANCE REQUEST FAILED`,
    signal,
  );
}

/**
 * Renders one visualization instance's frame array for a problem instance.
 *
 * T44 (#103) put this on the proxy allowlist ahead of any caller existing here, so
 * Track B's design tasks could see real payloads through this app's own proxy. T48
 * (#111) is the first caller.
 *
 * T40 verified this directly against the live API: the response is a bare JSON array
 * of frames -- base state, then zero or more intermediate steps, then the solved state
 * (ai_documentation/VISUALIZATION_TYPE_CONTRACTS.md §2) -- never wrapped in an envelope
 * object, the same shape `requestSolvedInstance` returns a bare string rather than
 * `{ output: ... }`.
 *
 * @param {string} url Base URL of the Redux API.
 * @param {string} visualization Visualization instance class name, e.g.
 * "CliqueDefaultVisualization" -- the value `Navigation/Batch/allVisualizations` lists,
 * not the human-readable `visualizationName`.
 * @param {string} instance The problem instance to visualize.
 * @param {AbortSignal} [signal] Optional, same caveat as `requestSolvedInstance`.
 * @returns the ordered frame array.
 * @throws {ReduxRequestError} if the request fails.
 */
export async function requestVisualizedInstance(url, visualization, instance, signal) {
  return await fetchPostJson(
    `${url}ProblemProvider/visualize?visualization=${encodeURIComponent(visualization)}`,
    instance,
    () => `${visualization} VISUALIZE REQUEST FAILED`,
    signal,
  );
}

/**
 * Renders the source-then-reduced frame pair for one reduction, applied to a source
 * problem instance.
 *
 * T53 (#116) is the first caller. Checked directly against a local Redux backend: posting
 * with neither query parameter returns HTTP 400 naming `reduction` and `solution` as the
 * two required fields (matching `ai_documentation/INTERACTIVE_LAYER_DESIGN.md` §1.3's read
 * of `AdditionalControllers/ProblemProvider.cs:290-313`) -- the same query-string-plus-
 * bare-body shape `requestVisualizedInstance` above already uses, just with a second query
 * parameter. The response is the same bare JSON frame array `requestVisualizedInstance`
 * returns, always exactly 2 entries (base, then solved/reduced) per that same source.
 *
 * @param {string} url Base URL of the Redux API.
 * @param {string} reduction Reduction class name, e.g. "KarpVertexCoverToSetCover" -- the
 * `className` field `Navigation/Reductions` lists for this reduction edge.
 * @param {string} instance The source problem instance being reduced.
 * @param {string} solution A certificate for `instance`, produced by a prior `/solve`
 * call -- this endpoint has no way to derive the reduced instance without one
 * (INTERACTIVE_LAYER_DESIGN.md §1.3).
 * @param {AbortSignal} [signal] Optional, same caveat as `requestSolvedInstance`.
 * @returns the ordered frame array (source base, then reduced/solved).
 * @throws {ReduxRequestError} if the request fails.
 */
export async function requestReducedInstance(url, reduction, instance, solution, signal) {
  return await fetchPostJson(
    `${url}ProblemProvider/visualizeReduction?reduction=${encodeURIComponent(reduction)}&solution=${encodeURIComponent(solution)}`,
    instance,
    () => `${reduction} VISUALIZE REDUCTION REQUEST FAILED`,
    signal,
  );
}
