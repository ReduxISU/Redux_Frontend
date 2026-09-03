/**
 * Same-origin proxy to the Redux backend. Keeps `REDUX_BASE_URL` server-side so the
 * browser only ever talks to `/api/redux/`.
 *
 * T36 (#94) added the resource controls below: timeout, body cap, rate limit, endpoint
 * allowlist. They live here rather than in the client because this is the only layer
 * this repo actually controls. A client-side `AbortController` stops the browser
 * waiting, but it does not stop the backend computing and it does not free this
 * request. Live Run (T37) and live Verify (T38) let a public page trigger
 * arbitrary-complexity solves on demand, including exponential and factorial solvers,
 * so the bounds have to be enforced server-side.
 */

/**
 * How long we wait on the backend before giving up, in milliseconds.
 *
 * Two bounds, because the two kinds of traffic are nothing alike:
 *
 * - Read endpoints are the catalog batch calls. They are lookups and should be quick.
 *   15s is deliberately below the 20s the end-to-end suite waits for Home to settle
 *   (`tests/e2e/helpers.js`), so a hung backend surfaces as the "couldn't reach Redux"
 *   banner inside that window rather than hanging the page until the test itself gives
 *   up.
 * - Compute endpoints (`solve`, `verify`) run a real algorithm, so they get 60s. Long
 *   enough for a genuine solve on a small instance, short enough that a runaway one
 *   releases the socket instead of being held open indefinitely.
 *
 * Recorded as a decision on #94.
 */
const READ_TIMEOUT_MS = 15_000;
const COMPUTE_TIMEOUT_MS = 60_000;

/**
 * Largest request body we will accept, in bytes. Instances and certificates are text;
 * 1 MiB is far more than any of them need, and still bounds what a single request can
 * make this process hold in memory.
 */
const MAX_REQUEST_BODY_BYTES = 1024 * 1024;

/**
 * Non-GET rate limit: at most `RATE_LIMIT_MAX_REQUESTS` per client per
 * `RATE_LIMIT_WINDOW_MS`. Sized for a person clicking Run or Verify and trying a few
 * solvers, not for scripted traffic.
 *
 * Reads are not rate-limited. They are cheap lookups, they are already cached per page
 * load in `lib/redux/index.js`, and limiting them would throttle ordinary catalog
 * browsing for no benefit.
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;

/**
 * Rate-limit counters, held in this process's memory only.
 *
 * Being blunt about what that means, because the honest description matters more than
 * the feature: this is NOT a distributed rate limit. Counters are per Node process,
 * they reset on restart or redeploy, and running more than one instance of this app
 * multiplies the effective limit by the number of instances. It raises the cost of
 * casually hammering the compute endpoints from a browser. It is not a defence against
 * a determined or distributed attacker, and nothing downstream should assume it is. A
 * real limit belongs in shared storage, or in front of the app.
 */
const rateLimitBuckets = new Map();

/**
 * Endpoints this frontend actually uses, and the methods each accepts. Anything else on
 * the backend origin is refused.
 *
 * The surface is small and known (`lib/redux/index.js` is the only current caller for
 * everything except `ProblemProvider/visualize`), so an allowlist costs almost nothing
 * here and means a stray path cannot reach an endpoint nobody meant to expose. Adding a
 * backend call means adding it to this map too.
 *
 * `ProblemProvider/visualize` (T44, #103) is allowed ahead of any caller existing in
 * `lib/redux/index.js`. That is a deliberate exception to "the list holds what the site
 * actually uses": Track B's design tasks (T41, #99; T42, #100) need to see real
 * visualization payloads through this app's own proxy, and nothing can render one while
 * the proxy 404s the request first. `ProblemProvider/visualizeReduction` has the same
 * compute profile and is deliberately NOT added yet -- see the comment below.
 *
 * Keys are paths relative to `REDUX_BASE_URL`, matched exactly and case-sensitively.
 * Query strings are not part of the match.
 */
const ALLOWED_ENDPOINTS = new Map([
  ["Navigation/Batch/allProblems", ["GET", "HEAD"]],
  ["Navigation/Batch/allSolvers", ["GET", "HEAD"]],
  ["Navigation/Batch/allVerifiers", ["GET", "HEAD"]],
  ["Navigation/Batch/allVisualizations", ["GET", "HEAD"]],
  ["Navigation/Batch/allVisualizationTypes", ["GET", "HEAD"]],
  ["Navigation/Batch/allInfo", ["GET", "HEAD"]],
  ["Navigation/Reductions", ["GET", "HEAD"]],
  ["ProblemProvider/solve", ["POST"]],
  ["ProblemProvider/verify", ["POST"]],
  ["ProblemProvider/visualize", ["POST"]],
  // ProblemProvider/visualizeReduction is NOT here. It has the same compute profile as
  // `visualize` above, but nothing calls it yet. Add it, and its COMPUTE_ENDPOINTS entry
  // below, in whichever task first wires the Reductions section against live data --
  // not before, per this allowlist's own principle that it holds what the site actually
  // uses. (T44, #103)
]);

/** Endpoints that run an algorithm rather than returning a stored lookup. */
const COMPUTE_ENDPOINTS = new Set([
  "ProblemProvider/solve",
  "ProblemProvider/verify",
  "ProblemProvider/visualize",
]);

export const config = {
  api: { bodyParser: false },
};

/**
 * Identifies the caller for rate-limiting purposes.
 *
 * `x-forwarded-for` is trusted here because this app is expected to run behind a
 * reverse proxy that sets it. That header is client-supplied, so it is spoofable if the
 * app is ever exposed directly, which would let one caller present as many. That is an
 * accepted limitation of an in-process limiter, consistent with the note on
 * `rateLimitBuckets` above: keying on the socket address instead would lump every
 * client behind the reverse proxy into one shared bucket, which breaks the normal
 * deployment in order to harden an abnormal one.
 */
function clientKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = raw?.split(",")[0]?.trim();
  return first || req.socket?.remoteAddress || "unknown";
}

/**
 * Fixed-window request counter for `key`.
 * @returns `{ allowed: boolean, retryAfterSeconds: number }`.
 */
function checkRateLimit(key, now) {
  // Drop windows that have already expired, so a long-running process does not
  // accumulate one entry per client address it has ever seen.
  for (const [existingKey, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(existingKey);
    }
  }

  const bucket = rateLimitBuckets.get(key);
  if (!bucket) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export default async function handler(req, res) {
  const baseUrl = process.env.REDUX_BASE_URL;
  if (!baseUrl) {
    res.status(500).json({ error: "REDUX_BASE_URL is not configured" });
    return;
  }

  const suffix = req.url.replace(/^\/api\/redux\/?/, "");
  const targetUrl = `${baseUrl.replace(/\/$/, "")}/${suffix}`;

  // Guard against SSRF: the user-controlled suffix must not be able to steer the
  // request to a host/scheme other than the configured backend. Resolve the URL
  // with the WHATWG parser and require it to stay on the backend's origin.
  let target;
  let base;
  try {
    target = new URL(targetUrl);
    base = new URL(baseUrl);
  } catch {
    res.status(400).json({ error: "Invalid request path" });
    return;
  }

  const isSameOrigin = target.origin === base.origin;
  const isAllowedScheme = target.protocol === "http:" || target.protocol === "https:";
  if (!isSameOrigin || !isAllowedScheme) {
    res.status(400).json({ error: "Refusing to proxy request outside the configured backend" });
    return;
  }

  // The origin check above still allows any path on the backend host. Pin the path too:
  // the resolved request has to stay inside REDUX_BASE_URL's own subtree, and then has
  // to name one of the endpoints this frontend uses. `new URL()` has already collapsed
  // any `..` segments by this point, so a suffix trying to climb out of the base path
  // fails the prefix test below.
  const basePath = base.pathname.endsWith("/") ? base.pathname : `${base.pathname}/`;
  if (!target.pathname.startsWith(basePath)) {
    res.status(400).json({ error: "Refusing to proxy request outside the configured backend" });
    return;
  }

  const endpoint = target.pathname.slice(basePath.length);
  const allowedMethods = ALLOWED_ENDPOINTS.get(endpoint);
  if (!allowedMethods) {
    res.status(404).json({ error: "Unknown Redux endpoint" });
    return;
  }
  if (!allowedMethods.includes(req.method)) {
    res.setHeader("Allow", allowedMethods.join(", "));
    res.status(405).json({ error: `${req.method} is not allowed on this Redux endpoint` });
    return;
  }

  const isRead = req.method === "GET" || req.method === "HEAD";

  if (!isRead) {
    const { allowed, retryAfterSeconds } = checkRateLimit(clientKey(req), Date.now());
    if (!allowed) {
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: "Too many requests. Wait a moment before running this again.",
        retryAfterSeconds,
      });
      return;
    }
  }

  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!["host", "connection", "transfer-encoding"].includes(key.toLowerCase())) {
      headers[key] = Array.isArray(value) ? value.join(", ") : value;
    }
  }

  // Do not follow redirects server-side: a compromised or misbehaving backend
  // could 3xx us toward an internal address (another SSRF path). Forward the
  // redirect response to the client and let the browser decide what to do.
  const fetchOptions = { method: req.method, headers, redirect: "manual" };

  if (!isRead) {
    // Check the running total before keeping each chunk, rather than buffering
    // everything and measuring afterwards. The point of the cap is never to hold an
    // oversized body in memory in the first place.
    //
    // `destroyOnReturn: false` is load-bearing, not a tidiness flag. A plain
    // `for await (const chunk of req)` destroys the stream when the loop breaks, and
    // destroying an IncomingMessage tears down its socket -- so the client would get a
    // connection reset instead of the 413 we are trying to send it.
    const chunks = [];
    let received = 0;
    let tooLarge = false;
    try {
      for await (const chunk of req.iterator({ destroyOnReturn: false })) {
        received += chunk.length;
        if (received > MAX_REQUEST_BODY_BYTES) {
          tooLarge = true;
          break;
        }
        chunks.push(chunk);
      }
    } catch (err) {
      res.status(400).json({ error: `Could not read request body: ${err.message}` });
      return;
    }

    if (tooLarge) {
      // Close rather than keep-alive: we deliberately stopped reading this request
      // body, so the connection can't be reused for another request. `resume()` throws
      // away whatever is still arriving instead of buffering it, which keeps memory
      // bounded while still letting the 413 reach the client.
      res.setHeader("Connection", "close");
      res.status(413).json({
        error: `Request body exceeds the ${MAX_REQUEST_BODY_BYTES} byte limit`,
      });
      req.resume();
      return;
    }

    fetchOptions.body = Buffer.concat(chunks);
  }

  // Bound how long the backend can hold this request open. The abort covers reading the
  // response body as well as getting the response headers, which is why the timer is
  // only cleared once the whole response is in hand.
  const timeoutMs = COMPUTE_ENDPOINTS.has(endpoint) ? COMPUTE_TIMEOUT_MS : READ_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  fetchOptions.signal = controller.signal;

  // #5: an unreachable backend must not throw an unhandled error. The caller
  // (lib/redux) needs a response it can turn into the "couldn't reach Redux"
  // banner, not a crashed API route.
  let upstream;
  let body;
  try {
    upstream = await fetch(target, fetchOptions);
    body = await upstream.arrayBuffer();
  } catch (err) {
    // 504 rather than 502, so the client can say "this took too long" instead of "the
    // backend is down". Two different problems, with two different things to do about
    // them, and T37/T38 need to tell them apart to write the right copy.
    if (controller.signal.aborted) {
      res.status(504).json({
        error: `Redux did not respond within ${timeoutMs / 1000}s`,
        timeoutMs,
      });
      return;
    }
    res.status(502).json({ error: `Upstream unreachable: ${err.message}` });
    return;
  } finally {
    clearTimeout(timeout);
  }

  res.status(upstream.status);
  // Node's fetch (undici) transparently decompresses a gzip/br response body before
  // upstream.arrayBuffer() above ever sees it -- so forwarding the upstream
  // content-encoding/content-length headers verbatim lies to the browser about what
  // res.end() actually sends: it claims a still-compressed body of the original
  // (compressed) byte length, which is neither. Chromium then fails every such
  // response with ERR_CONTENT_DECODING_FAILED. Dropping both lets Node recompute a
  // correct content-length for the plain body we actually send.
  for (const [key, value] of upstream.headers) {
    if (
      !["transfer-encoding", "connection", "content-encoding", "content-length"].includes(
        key.toLowerCase(),
      )
    ) {
      res.setHeader(key, value);
    }
  }

  res.end(Buffer.from(body));
}
