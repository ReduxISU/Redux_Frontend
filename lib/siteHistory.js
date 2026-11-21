// lib/siteHistory.js
//
// #327: whether the page on screen was reached from another page of this site, so the problem
// page's Back control (components/BackButton.js) knows whether going back in history stays on the
// site. pages/_app.js tells this module about every client-side route change; a change that only
// rewrites the query (the workbench's address keeping up with its state, a shallow replace) is
// not a new page. A full page load from this site counts too, through the referrer.

let pagesVisited = 0;
let lastPath = null;

/** The path of a URL or route, without its query or hash. */
export function pathOf(url) {
  if (typeof url !== "string") return "";
  return url.split(/[?#]/)[0];
}

/**
 * Notes that the page at `url` is on screen. Returns how many pages of the site this visit has
 * moved through before it (0 on the page the visit started on).
 * @param {string} url
 */
export function noteRoute(url) {
  const path = pathOf(url);
  if (lastPath !== null && path !== lastPath) pagesVisited += 1;
  lastPath = path;
  return pagesVisited;
}

/** For the unit tests: forget every page noted. */
export function resetSiteHistory() {
  pagesVisited = 0;
  lastPath = null;
}

/**
 * Whether going back in history would land on a page of this site: an earlier page was shown in
 * this visit, or this page was opened from one (a same-origin referrer).
 * @param {{referrer?: string, origin?: string}} [page] `document.referrer`, `location.origin`.
 */
export function cameFromSite({ referrer = "", origin = "" } = {}) {
  if (pagesVisited > 0) return true;
  if (!referrer || !origin) return false;
  try {
    return new URL(referrer).origin === origin;
  } catch {
    return false;
  }
}
