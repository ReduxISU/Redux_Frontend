// lib/compareQuery.js
//
// #149 — shared name<->URL encoding for the problem comparison feature
// (pages/compare.js's reader, pages/index.js's "Compare (N)" bar). The
// comparison set is a plain array of real problem display names (the same
// names ProblemCatalogCard already links with — see that file's own T25/#34
// comment: the real backend has no slug concept), joined with "," and
// encoded as a single query value so the whole thing round-trips through
// encodeURIComponent/decodeURIComponent as one unit. A name containing a
// literal comma would break the split below, but no catalogued problem name
// does; encoding each name separately would just relocate the same edge
// case rather than remove it.
//
// Capped at MAX_COMPARE_PROBLEMS in both directions: pages/index.js's toggle
// handler never grows the set past it, and parseCompareNames below caps a
// hand-edited/shared URL the same way rather than trusting its shape.

export const MAX_COMPARE_PROBLEMS = 3;
export const MIN_COMPARE_PROBLEMS = 2;

/**
 * @param {string[]} names Real problem display names, expected already
 *   capped at MAX_COMPARE_PROBLEMS.
 * @returns {string} The `/compare` query value (no leading `?problems=`).
 */
export function buildCompareQueryValue(names) {
  return encodeURIComponent(names.join(","));
}

/**
 * Inverse of buildCompareQueryValue — also doubles as the parser for a
 * hand-typed or shared URL, so it trims blank/duplicate entries and caps at
 * MAX_COMPARE_PROBLEMS instead of assuming the query string is well-formed.
 * @param {string|undefined} rawValue `router.query.problems` — Next.js has
 *   already decoded it once by the time a page sees it.
 * @returns {string[]}
 */
export function parseCompareNames(rawValue) {
  if (typeof rawValue !== "string") return [];
  const seen = new Set();
  const names = [];
  for (const part of rawValue.split(",")) {
    const name = part.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
    if (names.length === MAX_COMPARE_PROBLEMS) break;
  }
  return names;
}
