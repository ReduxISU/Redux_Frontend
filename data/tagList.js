// data/tagList.js
//
// #299. The one place a backend tag LIST is read. ReduxISU/Redux#946 lets an
// item carry several tags from one category, so every API object grew a list
// beside its old single field: `problemTypes` beside `problemType`,
// `solverTypes` beside `solverType`, `reductionTypes` beside `reductionType`,
// `visualizationTypes` beside `visualizationType`, plus `problemVariants`
// (Decision / Optimization), which has no single field at all. The lists keep
// a fixed order and the single fields are deprecated stand-ins, each holding
// only the list's first entry, so reading a single field shows and filters a
// multi-tag item on just one of its tags.
//
// A backend from before #946 sends only the single field, so tagList() falls
// back to it, wrapped in a one-element list. Nothing else in the app reads a
// single tag field (the one exception is the renderer choice, which still
// keys off `visualizationType`; see hooks/useProblemDetail.js's
// buildVisualizations). Once both front ends read the lists and the backend
// drops the single fields, the fallback here is the only line to delete.
//
// Pure, no imports, so it can be unit-tested on its own (tests/unit/).

/**
 * An item's tags from one category, in the backend's own order: the list
 * field when the backend sends one, else the deprecated single field wrapped
 * in a list, else `[]`. Empty and non-string entries are dropped. Raw backend
 * member names come back unchanged ("Greedy", "Unclassified"); translating
 * them into option keys, and dropping "Unclassified", is the caller's job
 * (data/taxonomy.js's maps and backendOptionKeys()).
 *
 * @param {Object|null|undefined} item One API object: a problem's, solver's or
 *   visualization's `info` entry, or a reduction edge.
 * @param {string} listField The list field, e.g. "solverTypes".
 * @param {string} [singleField] Its deprecated single field, e.g. "solverType".
 *   Omitted for a list with no single field (`problemVariants`).
 * @returns {string[]}
 */
export function tagList(item, listField, singleField) {
  const list = item?.[listField];
  if (Array.isArray(list)) {
    return list.filter((name) => typeof name === "string" && name !== "");
  }
  const single = singleField ? item?.[singleField] : undefined;
  return typeof single === "string" && single !== "" ? [single] : [];
}
