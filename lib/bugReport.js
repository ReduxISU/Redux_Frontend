// lib/bugReport.js
//
// #325: the banner's Report a bug link (components/NavBar.js). It opens a new Redux_Frontend
// issue on GitHub, filled in with the page the visitor was on and their browser, and headings for
// what happened, what they expected and the steps. This file builds that address, so the unit
// tests can check its encoding and length without a browser.

/** Where a new Redux_Frontend issue is opened. */
export const NEW_ISSUE_URL = "https://github.com/ReduxISU/Redux_Frontend/issues/new";

/**
 * The longest Report a bug address, in characters. GitHub answers 414 (URI Too Long) somewhere
 * past 8 KB, and a problem page's own address can carry a long instance (lib/permalink.js allows
 * up to 8000 characters), so the page address in the report is cut short to keep the whole
 * link at or under this, with room to spare.
 */
export const MAX_BUG_REPORT_URL_LENGTH = 6000;

/** The most characters of the page's path the issue's title names. */
const TITLE_PATH_MAX = 80;

const CUT_MARK = "...";

function readablePath(pageUrl) {
  try {
    const { pathname } = new URL(pageUrl);
    return decodeURIComponent(pathname);
  } catch {
    return "";
  }
}

/** The issue's title: "Bug on /Exact Cover", or "Bug report" for a page with no path to name. */
export function bugReportTitle(pageUrl) {
  const path = readablePath(pageUrl);
  if (!path || path === "/") return path === "/" ? "Bug on the problem list" : "Bug report";
  const short =
    path.length > TITLE_PATH_MAX
      ? `${path.slice(0, TITLE_PATH_MAX - CUT_MARK.length)}${CUT_MARK}`
      : path;
  return `Bug on ${short}`;
}

/** The issue's body: the page and browser, then the three headings to fill in. */
export function bugReportBody(pageUrl, userAgent) {
  return [
    `Page: ${pageUrl || "(unknown)"}`,
    `Browser: ${userAgent || "(unknown)"}`,
    "",
    "### What happened",
    "",
    "",
    "### What you expected",
    "",
    "",
    "### Steps",
    "",
    "1. ",
    "",
  ].join("\n");
}

function issueUrl(title, body) {
  return `${NEW_ISSUE_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

/**
 * The address that opens a new issue about `pageUrl`. When it would be longer than `limit`, the
 * page address in the body is cut short (ending in "...") until it fits; the title, the browser
 * and the headings always stay.
 * @param {{pageUrl: string, userAgent: string, limit?: number}} options
 * @returns {string}
 */
export function bugReportUrl({ pageUrl, userAgent, limit = MAX_BUG_REPORT_URL_LENGTH }) {
  const title = bugReportTitle(pageUrl);
  // A user agent is short, but one is never allowed to crowd out the rest.
  const agent = (userAgent ?? "").slice(0, 512);
  const full = issueUrl(title, bugReportBody(pageUrl, agent));
  if (full.length <= limit) return full;
  let keep = pageUrl.length;
  let url = full;
  while (keep > 0 && url.length > limit) {
    // Shrink by about the excess (each kept character encodes to 1 to 9), at least one.
    keep = Math.max(0, keep - Math.max(1, Math.ceil((url.length - limit) / 3)));
    url = issueUrl(title, bugReportBody(`${pageUrl.slice(0, keep)}${CUT_MARK}`, agent));
  }
  return url;
}
