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
 */

/**
 * @param url Full request URL.
 * @param failMsg Lazily-evaluated description of the request, used in the thrown error.
 * @returns the parsed JSON body of the response.
 * @throws if the request fails (network error) or the response is not `ok`.
 */
async function fetchJson(url, failMsg) {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`${failMsg()}: ${resp.status} (${resp.statusText})`);
  }
  return await resp.json();
}

/**
 * @param url Full request URL.
 * @param body Request payload, sent as JSON.
 * @param failMsg Lazily-evaluated description of the request, used in the thrown error.
 * @returns the parsed JSON body of the response.
 * @throws if the request fails (network error) or the response is not `ok`.
 */
async function fetchPostJson(url, body, failMsg) {
  const resp = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
  });
  if (!resp.ok) {
    throw new Error(`${failMsg()}: ${resp.status} (${resp.statusText})`);
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
 * This function is a temporary solution for validating user input until it is ported to
 * the Redux API.
 * @returns `true` if the specified verifier certificate is valid.
 */
function isCertificateValid(problem, certificate) {
  var cleanInput = certificate.replace(new RegExp(/[( )]/g), ""); // Strips spaces and ()
  cleanInput = cleanInput.replaceAll(":", "=");
  var regexFormat = /[^-.,=:!{}\w;]/; // Checks for special characters not including -.,=:!{}
  if (regexFormat.test(cleanInput) == true) {
    // Invalid characters found, warn user.
    return false;
  } else {
    var validUserInput = true;
    if (problem == "SAT" || problem == "SAT3") {
      var clauses = cleanInput.split(",");
      const regex = /[^!\w]/; // Only allow alphanumber and !
      const notBooleanRegex = /[^true$|^True$|^t$|^T$|^false$|^False$|^F$|^f$]/;
      clauses.forEach((clause) => {
        const singleClause = clause.split("=");

        if (singleClause.length !== 2 || regex.test(singleClause[0] == true)) {
          // No boolean assigned to variable.
          validUserInput = false;
          return false;
        }

        if (notBooleanRegex.test(singleClause[1] == true)) {
          // boolean is not in the form True/true/T/F...
          validUserInput = false;
          return false;
        } else {
          // Replace True/true/t with T and False/false/f with F
          singleClause[1] = singleClause[1].replace(new RegExp(/^false$|^False$|^f$/g), "F");
          singleClause[1] = singleClause[1].replace(new RegExp(/^True$|^true$|^t$/g), "T");
          validUserInput = true; // valid input
        }
      });
    }
    return validUserInput;
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
 * Not called anywhere in v1 — Solvers section shows canned Run output — but ported now
 * since it costs nothing extra and will be needed once Run goes live.
 * @param url Base URL of the Redux API.
 * @param solver Solver identifier to run.
 * @param instance The problem instance to solve.
 * @returns the solved `instance` from the specified `solver`.
 * @throws if the request fails.
 */
export async function requestSolvedInstance(url, solver, instance) {
  return await fetchPostJson(
    `${url}ProblemProvider/solve?solver=${solver}`,
    instance,
    () => `${solver} SOLVED INSTANCE REQUEST FAILED`,
  );
}

/**
 * Not called anywhere in v1 — Verifier section shows canned Verify output — but ported
 * now since it costs nothing extra and will be needed once Verify goes live.
 * @param url Base URL of the Redux API.
 * @param problem Problem identifier the certificate is being checked against.
 * @param verifier Verifier identifier to run.
 * @param instance The problem instance being verified.
 * @param certificate The candidate certificate string.
 * @returns the verified `instance` results from the specified `verifier`, or the literal
 * string `"Invalid Input"` if `certificate` fails local format validation.
 * @throws if the request fails.
 */
export async function requestVerifiedInstance(url, problem, verifier, instance, certificate) {
  // Temporary solution until certificate validation is moved to the Redux API.
  if (!isCertificateValid(problem, certificate)) {
    return "Invalid Input";
  }

  return await fetchPostJson(
    `${url}ProblemProvider/verify?verifier=${verifier}`,
    { problemInstance: instance, certificate: certificate },
    () => `${verifier} VERIFIED INSTANCE REQUEST FAILED`,
  );
}
