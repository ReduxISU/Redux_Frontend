// lib/permalink.js
//
// #324 (#174, #176): the problem page's permalink, the pure parts. The workbench keeps what the
// visitor is looking at in its address (`?instance=`, `?solver=`, `?viz=` since #150; #176 adds
// `?reduceTo=` and `?reduction=` for Reduce mode, the names Redux_GUI's dormant share link used),
// and the Share button copies that address. This file builds the query and checks its length, so
// the unit tests can load it without React or a router.
//
// #174: a big instance would make a link no server can take. When the whole link would be longer
// than MAX_PERMALINK_LENGTH, the instance is left out (the rest still opens the same solver,
// picture and reduction) and the page says so, rather than handing out a link that breaks or
// is cut short somewhere along the way. That is still what the page's own address does. Share
// (ReduxISU/Redux#844) saves such a view on the Redux server instead and copies a short
// `?share={id}` link to it (lib/shortLinks.js), falling back to the link without the instance
// only when saving fails.

/**
 * The longest link the problem page writes or shares, in characters, counting the origin, the
 * path and the encoded query. nginx, the tightest layer of a typical deployment, refuses a
 * request line over 8 KB by default (`large_client_header_buffers 4 8k`), and the request line
 * also holds the method and "HTTP/1.1"; Node (16 KB), Vercel and Cloudflare (32 KB) allow more.
 * 8000 keeps a little room under nginx's 8192 for those words. A link the length check refuses
 * leaves the instance out instead (#174); Share saves that view as a short link (#844).
 */
export const MAX_PERMALINK_LENGTH = 8000;

/** The query keys the workbench owns: written from its state, never carried over. */
export const PERMALINK_KEYS = ["instance", "solver", "viz", "step", "reduceTo", "reduction"];

/**
 * A short link's key (`?share={id}`, lib/shortLinks.js). Never carried over either: once the
 * saved view is in the address, the id would only open it again on a reload.
 */
export const SHARE_KEY = "share";

/** One `key=value` pair, encoded the way Next's router encodes a query object. */
function pair(key, value) {
  return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

/**
 * A query object as a search string ("" when empty, else starting with "?"), keys in order. An
 * array value repeats its key, as Next writes it; null and undefined are left out.
 * @param {Object<string, string|string[]|null|undefined>} query
 */
export function searchString(query) {
  const parts = [];
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined) continue;
    for (const each of Array.isArray(value) ? value : [value]) parts.push(pair(key, String(each)));
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

/**
 * The workbench's query: everything else already in the address (a playlist's `playlist` and `p`,
 * say), then the workbench's own keys, each only when it is not the default (null). The route's
 * own segment (`problem`) is not a query key and is left out, and so is a short link's `share`.
 * @param {Object} rest router.query.
 * @param {{instance?: string|null, solver?: string|null, viz?: string|null,
 *   reduceTo?: string|null, reduction?: string|null}} state
 * @returns {Object<string, string|string[]>}
 */
export function permalinkQuery(rest, state) {
  const query = {};
  for (const [key, value] of Object.entries(rest ?? {})) {
    if (key === "problem" || key === SHARE_KEY || PERMALINK_KEYS.includes(key)) continue;
    if (value !== undefined) query[key] = value;
  }
  for (const key of ["instance", "solver", "viz", "reduceTo", "reduction"]) {
    const value = state?.[key];
    if (typeof value === "string") query[key] = value;
  }
  return query;
}

/**
 * The link to share: `origin + path + query`, without the instance when the whole link would be
 * longer than `limit` (#174). The rest of the query stays, so the link still opens the same
 * solver, picture and reduction, on the problem's default instance.
 * @param {{origin?: string, path: string, query: Object, limit?: number}} options
 * @returns {{href: string, query: Object, instanceOmitted: boolean, length: number}}
 */
export function fitPermalink({ origin = "", path, query, limit = MAX_PERMALINK_LENGTH }) {
  const full = `${origin}${path}${searchString(query)}`;
  if (full.length <= limit || typeof query?.instance !== "string") {
    return { href: full, query, instanceOmitted: false, length: full.length };
  }
  const { instance: _instance, ...withoutInstance } = query;
  const href = `${origin}${path}${searchString(withoutInstance)}`;
  return { href, query: withoutInstance, instanceOmitted: true, length: href.length };
}

/** The problem page's path for a problem's display name ("/Exact%20Cover"). */
export function problemPath(name) {
  return `/${encodeURIComponent(name)}`;
}
