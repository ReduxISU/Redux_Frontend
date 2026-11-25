// lib/shortLinks.js
//
// ReduxISU/Redux#844 (phase 2 of link sharing): short links. A view whose plain link is too long
// (lib/permalink.js MAX_PERMALINK_LENGTH, #174) is saved on the Redux server instead
// (`POST ShareLinks`), and the link handed out is the page's own address with `?share={id}`.
// Opening such a link reads the view back (`GET ShareLinks/{id}`) and puts it in the address, so
// the workbench restores it the same way it restores a plain link, and runs nothing by itself
// (#177). Saved links last about 6 months.
//
// The pure parts (the request body, the view to and from a query, the messages) are kept apart
// from the two requests so the unit tests can load them without a browser.

import { SHARE_KEY } from "./permalink";
import { ReduxRequestError } from "./redux/index";

/** What the page says about a saved link: how long it lasts. */
export const SAVED_LINK_TEXT = "It is a saved link that lasts about 6 months.";

/** Only letters and digits: Redux's ids are 10 of them, and anything else can't name one. */
const SHARE_ID_PATTERN = /^[A-Za-z0-9]{1,64}$/;

/** The `?share=` id in a query, or null when there is none. */
export function shareIdFrom(query) {
  const value = query?.[SHARE_KEY];
  return typeof value === "string" && value !== "" ? value : null;
}

/** Whether `id` could be a short link's id (letters and digits only). */
export function isShareId(id) {
  return typeof id === "string" && SHARE_ID_PATTERN.test(id);
}

/** Whether a query value is one the address can carry: a string, or a list of them. */
function isQueryValue(value) {
  return (
    typeof value === "string" ||
    (Array.isArray(value) && value.every((each) => typeof each === "string"))
  );
}

/**
 * The view to save: the problem, then the link's whole query (the instance, the solver, the
 * picture, the reduction, and whatever else the address holds, a playlist say), so opening it
 * gives back the same page a plain link would have.
 * @param {string} problem The problem's display name.
 * @param {Object<string, string|string[]>} query The link's query, instance included.
 */
export function viewFromLink(problem, query) {
  const view = { problem };
  for (const [key, value] of Object.entries(query ?? {})) {
    if (key === "problem" || key === SHARE_KEY || !isQueryValue(value)) continue;
    view[key] = value;
  }
  return view;
}

/** The body of `POST ShareLinks`. */
export function shareRequestBody(view) {
  return { view };
}

/**
 * The router query that opens a saved view: its problem (the route's segment) and its other
 * keys. Anything that is not a string or a list of strings is left out, as the address could
 * not hold it. Null when the view names no problem.
 * @param {Object} view The saved view, as `GET ShareLinks/{id}` gives it back.
 * @returns {Object<string, string|string[]>|null}
 */
export function queryFromView(view) {
  if (!view || typeof view !== "object" || typeof view.problem !== "string" || !view.problem) {
    return null;
  }
  return viewFromLink(view.problem, view);
}

/** The short link: the page's address (origin and path) with only `?share={id}`. */
export function shortLinkHref(base, id) {
  return `${base}?${SHARE_KEY}=${encodeURIComponent(id)}`;
}

/** "about 1 minute", "about 5 minutes", from a wait in seconds; null when unknown. */
function aboutMinutes(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `about ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

/**
 * Why a short link couldn't be made, in plain words, from what `saveShareLink` threw. The
 * status says it: 503 the server has nowhere to keep links, 413 the view is over the size it
 * keeps, 429 too many were made from this address lately; no answer at all (or the page's proxy
 * saying it couldn't get one, 502 and 504) is a server out of reach.
 * @param {{status?: number, retryAfterSeconds?: number}|Error} error
 */
export function saveFailureText(error) {
  const lead = "A short link couldn't be made:";
  const status = error?.status ?? 0;
  if (status === 503) return `${lead} this server can't save links right now.`;
  if (status === 413) return `${lead} this view is too big even to save.`;
  if (status === 429) {
    const wait = aboutMinutes(error?.retryAfterSeconds);
    return `${lead} too many links were made from here recently. Try again ${
      wait ? `in ${wait}` : "later"
    }.`;
  }
  if (status === 0 || status === 502 || status === 504) {
    return `${lead} the page couldn't reach the server.`;
  }
  return `${lead} the server couldn't save it.`;
}

/**
 * Why a `?share=` link didn't open, in plain words, from what `openShareLink` threw. 404 is an
 * unknown, expired or malformed id; 503 a server with nowhere to keep links.
 * @param {{status?: number}|Error} error
 */
export function openFailureText(error) {
  const status = error?.status ?? 0;
  if (status === 404) {
    return "This share link doesn't exist or has expired (links last about 6 months).";
  }
  if (status === 503) return "This server can't open share links right now.";
  if (status === 0 || status === 502 || status === 504) {
    return "The page couldn't reach the server to open this share link, so it opened as usual.";
  }
  return "This share link couldn't be opened, so the page opened as usual.";
}

/** The JSON body of a response, or null when it has none or it isn't JSON. */
async function readJson(resp) {
  try {
    const text = await resp.text();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/** A failed response as a ReduxRequestError, with Retry-After (header, else body) read. */
async function failure(resp, what) {
  const payload = await readJson(resp);
  const header = Number.parseInt(resp.headers.get("Retry-After") ?? "", 10);
  return new ReduxRequestError(`${what}: ${resp.status} (${resp.statusText})`, {
    status: resp.status,
    statusText: resp.statusText,
    payload,
    retryAfterSeconds: Number.isFinite(header) ? header : (payload?.retryAfterSeconds ?? 0),
  });
}

/**
 * Saves `view` on the Redux server and resolves to its id (the same view always gets the same
 * id). Rejects with a ReduxRequestError on an error answer, or with whatever `fetch` throws when
 * there is no answer at all (`saveFailureText` says either in plain words).
 * @param {string} baseUrl The Redux API's base URL (lib/redux REDUX_API_BASE_URL).
 * @param {Object} view From `viewFromLink`.
 * @returns {Promise<string>}
 */
export async function saveShareLink(baseUrl, view) {
  const resp = await fetch(`${baseUrl}ShareLinks`, {
    method: "POST",
    body: JSON.stringify(shareRequestBody(view)),
    headers: { "Content-Type": "application/json; charset=UTF-8" },
  });
  if (!resp.ok) throw await failure(resp, "SHARE LINK SAVE FAILED");
  const answer = await readJson(resp);
  if (!isShareId(answer?.id)) {
    throw new ReduxRequestError("SHARE LINK SAVE FAILED: no id", { status: resp.status });
  }
  return answer.id;
}

/**
 * Reads the view a short link saved. An id that can't be one is not asked for: it is answered
 * as Redux would, not found (404).
 * @param {string} baseUrl
 * @param {string} id
 * @returns {Promise<Object<string, string|string[]>>} The router query that opens it
 *   (`queryFromView`).
 */
export async function openShareLink(baseUrl, id) {
  if (!isShareId(id)) {
    throw new ReduxRequestError("SHARE LINK OPEN FAILED: not an id", { status: 404 });
  }
  const resp = await fetch(`${baseUrl}ShareLinks/${encodeURIComponent(id)}`);
  if (!resp.ok) throw await failure(resp, "SHARE LINK OPEN FAILED");
  const query = queryFromView((await readJson(resp))?.view);
  if (!query) {
    throw new ReduxRequestError("SHARE LINK OPEN FAILED: no view", { status: resp.status });
  }
  return query;
}
