// hooks/useCatalogFilters.js
//
// T24 (issue #33). The filtering/counting logic behind the Home page's
// sidebar + search + grid, extracted into a reusable hook so it can run
// against useCatalogIndex()'s real `Map<problemName, tags>` (T23/#32)
// instead of pages/index.js's current inline copy against
// data/fixtures.js's FIXTURE_PROBLEMS array. T25 (#34) is the task that
// actually swaps pages/index.js over to this hook; this file only has to
// produce the same results the inline logic already does, against the
// index-Map shape instead of the fixture-array shape.
//
// Port of Redux_GUI's useProblemFilters.js + facetOptions.js
// (`buildFacetOptions`), extended from that project's 4 facets to this
// project's full 8-facet data/taxonomy.js set — same pattern pages/index.js's
// own header comment already documents:
//
// Filtering: AND across facets, OR within a facet's own selected options,
// search substring-ANDed in on top. Matching is driven by each tag's actual
// runtime shape (Array.isArray), not data/taxonomy.js's `multiValued` flag:
// solverComplexity, reductionType, reductionCost and visualizationType are
// all stored as arrays at the problem level (aggregated across a problem's
// several solver/reduction/visualization instances) despite being
// `multiValued: false` — only computationalModel is truly a bare string.
// Keying off `multiValued` instead would silently break OR-matching for
// those four facets.
//
// Facet option counts are computed against the FULL index, not the
// currently-filtered results — "how many problems if I add this filter,"
// the same choice pages/index.js's own buildFacetOptions already made (its
// header comment flags that TASKLIST.md's T14 entry doesn't settle this
// either way).
//
// `matchedTags` is exposed as `selected` itself, unchanged: #70's decision
// (recorded on ProblemCatalogCard.js) is that a card on screen already
// matches every active facet selection, so there's no need to compute a
// narrower per-card intersection — every selected option is a "matched tag"
// for every visible card.
//
// This hook does not know about `slug` — useCatalogIndex()'s Map is keyed
// by `problemName` only (T23/#32), so `results` here is `{ name, tags }`
// pairs, not full fixture-shaped problem objects. Reconciling that with
// whatever route/slug metadata the real catalog needs is T25's job, not
// this hook's.
//
// --- T59 (#134): reduction-reachability filter -----------------------------
// Redux_GUI's Browse page has a filter this facet system can't express: pick
// a source problem and narrow the results to only what's reachable from it
// via the reduction graph, either one direct hop or the full transitive
// closure. That is graph traversal, not a facet membership test, so it is
// applied as its own extra predicate in the filter pipeline below rather than
// forced into the facet shape.
//
// reachableOneHop/reachableAnyHops are a direct port of Redux_GUI's
// components/hooks/ProblemFilters/useProblemFilters.js (lines 9-21) —
// unchanged traversal logic, only the graph's shape at the call site differs
// (see useCatalogIndex.js's buildReductionGraphByName: this project passes a
// `{ [fromName]: { [toName]: edge[] } }` map keyed by display name, since
// that's what this hook's `index` and `results` are already keyed by, where
// Redux_GUI's own graph is keyed the same way for its own problem index).
// Both functions only follow the graph's own edge direction (a reduction
// FROM the source problem), matching what Redux_GUI's live filter already
// does — see this task's handback summary for why "to/from" in the issue's
// done-when doesn't change that.

import { useMemo } from "react";
import { buildOptionsFromBackendNames, optionLabel, TAXONOMY } from "../data/taxonomy";

// Facet keys backed by a real backend enum (one of the six
// Navigation/*Types-and-friends endpoints, via hooks/useEnumCatalog.js).
// computationalModel and visualizationType have no backend equivalent at
// all (data/taxonomy.js's own facet comments) and are deliberately left out
// -- they always use their hardcoded `options` array, unconditionally, per
// this task's own instructions.
//
// The value each key maps to is the matching property name on
// useEnumCatalog()'s return value, so buildFacetOptions can look the live
// array up generically instead of a six-way if/else.
const BACKEND_BACKED_FACET_ENUM_KEYS = {
  problemType: "problemType",
  complexityClass: "complexityClass",
  reductionType: "reductionType",
  reductionCost: "reductionCost",
  solverType: "solverType",
  solverComplexity: "solverComplexityBucket",
};

/**
 * Problems directly reachable from `source` via a single reduction edge.
 * @param {Object} graph `{ [fromName]: { [toName]: edge[] } }`.
 * @param {string|null} source
 * @returns {Set<string>|null} `null` when there is no source (no filter).
 */
function reachableOneHop(graph, source) {
  if (!source) return null;
  return new Set(Object.keys(graph?.[source] ?? {}));
}

/**
 * Every problem transitively reachable from `source` via any number of
 * reduction edges, source excluded. A plain BFS over the already-fetched
 * graph, same as Redux_GUI's client-side mirror of the backend's
 * `ReductionGraphData.ReachableFrom`.
 * @param {Object} graph `{ [fromName]: { [toName]: edge[] } }`.
 * @param {string|null} source
 * @returns {Set<string>|null} `null` when there is no source (no filter).
 */
function reachableAnyHops(graph, source) {
  if (!source) return null;
  const visited = new Set([source]);
  const queue = [source];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const next of Object.keys(graph?.[current] ?? {})) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  visited.delete(source);
  return visited;
}

/**
 * @param {*} tagValue Either an array of option keys or a single option-key
 *   string (only computationalModel is ever a bare string — see file header).
 * @returns {string[]}
 */
function tagValueAsArray(tagValue) {
  if (Array.isArray(tagValue)) {
    return tagValue;
  }
  return tagValue == null ? [] : [tagValue];
}

// A problem matches the free-text search term if it's a substring of the
// problem's own name, OR a substring of any tag it carries -- resolved to
// that tag's real display label (optionLabel, data/taxonomy.js), not its
// raw option key, so typing "NP" matches a problem tagged "NP-Complete" the
// same way a person reading the chip would expect, not just problems whose
// internal key happens to start with those two letters. Checked across
// every facet a problem has a tag for, not just the sidebar-visible ones,
// since the ask is "any tag", not "any filterable tag".
function matchesSearchTerm(name, tags, query) {
  if (!query) {
    return true;
  }
  if (name.toLowerCase().includes(query)) {
    return true;
  }
  for (const facetKey of Object.keys(tags)) {
    for (const optionKey of tagValueAsArray(tags[facetKey])) {
      if (optionLabel(facetKey, optionKey).toLowerCase().includes(query)) {
        return true;
      }
    }
  }
  return false;
}

// Checking "NP" in the Complexity Class facet is a browsing question ("show
// me everything in NP"), a different question from what one card's own chip
// displays (its single most specific class — see COMPLEXITY_CLASS_MAP,
// data/taxonomy.js). NP-Complete and NP-Hard problems no longer carry a
// separate "np" tag value after that display change, so without this, the
// "NP" checkbox would silently stop finding them even though they are (or,
// for NP-Hard, are treated here as) part of what a person checking "NP"
// expects to see. Direct project-owner instruction: NP-Complete and NP-Hard
// both count. Only "np" itself expands — checking "NP-Complete" or
// "NP-Hard" stays an exact match, since those are already the most specific
// label a card can carry, nothing broader should pull extra results in.
const COMPLEXITY_CLASS_NP_FILTER_EXPANSION = new Set(["np", "npComplete", "npHard"]);

function optionSatisfiesSelection(facetKey, optionKey, selectedOptions) {
  if (selectedOptions.has(optionKey)) {
    return true;
  }
  return (
    facetKey === "complexityClass" &&
    selectedOptions.has("np") &&
    COMPLEXITY_CLASS_NP_FILTER_EXPANSION.has(optionKey)
  );
}

// A problem matches a facet's active selection if ANY selected option is
// present in its tag value for that facet — whether that tag value is one
// array (OR across the array) or a single string (plain equality). A facet
// with nothing selected imposes no constraint.
function matchesSelectedFacets(tags, selected) {
  for (const facet of TAXONOMY) {
    const selectedOptions = selected[facet.key];
    if (!selectedOptions || selectedOptions.size === 0) {
      continue;
    }
    const tagValues = tagValueAsArray(tags[facet.key]);
    const matches = tagValues.some((optionKey) =>
      optionSatisfiesSelection(facet.key, optionKey, selectedOptions),
    );
    if (!matches) {
      return false;
    }
  }
  return true;
}

// The option LIST a facet offers: the live backend enum's member names
// (data/taxonomy.js's buildOptionsFromBackendNames) for one of the six
// backend-backed facets whenever useEnumCatalog() has actually resolved a
// non-empty array for it, falling back to the facet's own hardcoded
// `options` otherwise -- whether that's because the facet has no backend
// equivalent at all (computationalModel, visualizationType), the live fetch
// hasn't resolved yet, it errored, or the endpoint returned nothing. This is
// the "never regress to blank just because a fetch is in flight" rule this
// task's instructions call for; it costs nothing on facets that were never
// going to change (the fallback IS today's exact behavior).
function facetOptionList(facet, enumCatalog) {
  const enumCatalogKey = BACKEND_BACKED_FACET_ENUM_KEYS[facet.key];
  if (enumCatalogKey) {
    const backendMemberNames = enumCatalog?.[enumCatalogKey];
    if (Array.isArray(backendMemberNames) && backendMemberNames.length > 0) {
      return buildOptionsFromBackendNames(facet.key, backendMemberNames);
    }
  }
  return facet.options;
}

// Per-option counts across the whole index (not just the filtered results —
// see file header). Every option gets an entry, including ones with count 0
// (issue done-when: "Counts render for every option including (0)"). Uses
// the same optionSatisfiesSelection expansion matchesSelectedFacets does —
// a single-option Set here — so "NP (n)" always names exactly how many
// results checking that box actually returns, never fewer.
function buildFacetOptions(index, enumCatalog) {
  const facetOptions = {};
  for (const facet of TAXONOMY) {
    facetOptions[facet.key] = facetOptionList(facet, enumCatalog).map((option) => {
      const asSelection = new Set([option.key]);
      let count = 0;
      for (const tags of index.values()) {
        const tagValues = tagValueAsArray(tags[facet.key]);
        if (
          tagValues.some((optionKey) => optionSatisfiesSelection(facet.key, optionKey, asSelection))
        ) {
          count += 1;
        }
      }
      return { key: option.key, label: option.label, count };
    });
  }
  return facetOptions;
}

/**
 * @param {Map<string, Object>} index `Map<problemName, tags>` —
 *   useCatalogIndex()'s (T23/#32) return shape, or an equivalent empty Map
 *   while loading/unreachable (ground rule 6: empty Map in, empty results
 *   out, never a crash).
 * @param {Object} [options]
 * @param {Object} [options.selected] `{ [facetKey]: Set<optionKey> }` — the
 *   same shape FacetSidebar's `selected` prop already uses.
 * @param {string} [options.searchValue] Free-text search term, matched as a
 *   case-insensitive substring of the problem name OR of any tag the problem
 *   carries (its real display label, e.g. "NP" matches a problem tagged
 *   "NP-Complete" — see matchesSearchTerm).
 * @param {Object} [options.reductionGraph] T59 (#134). `{ [fromName]:
 *   { [toName]: edge[] } }`, from useCatalogIndex()'s `reductionGraphByName`.
 *   Ignored when `reachabilitySource` is null.
 * @param {string|null} [options.reachabilitySource] T59 (#134). A problem
 *   name to filter reachability from, or null for no reachability filter.
 * @param {"oneHop"|"anyHops"} [options.reachabilityMode] T59 (#134). Whether
 *   reachability is a single reduction hop or the full transitive closure.
 * @param {Object} [options.enumCatalog] The live-backend-enum sidebar
 *   options work: `useEnumCatalog()`'s return value (or an equivalent empty
 *   object/loading state), supplying each backend-backed facet's live
 *   member-name array. Any facet whose array is missing, empty, or hasn't
 *   loaded yet falls back to that facet's hardcoded `options` from
 *   data/taxonomy.js — see `facetOptionList` above. computationalModel and
 *   visualizationType always use their hardcoded `options` regardless, since
 *   they have no backend equivalent at all.
 * @returns {{
 *   results: Array<{name: string, tags: Object}>,
 *   facetOptions: Object,
 *   matchedTags: Object,
 * }}
 *   `results` — problems passing the search term, every active facet
 *   selection, and the reachability filter (if any), in the index's own
 *   iteration order.
 *   `facetOptions` — `{ [facetKey]: [{key, label, count}] }`, counted against
 *   the full index per option, ready for FacetSidebar's `facetOptions` prop.
 *   `matchedTags` — `selected` passed through unchanged, ready for
 *   ProblemCatalogCard's `matchedTags` prop (see file header).
 */
export function useCatalogFilters(
  index,
  {
    selected = {},
    searchValue = "",
    reductionGraph = {},
    reachabilitySource = null,
    reachabilityMode = "oneHop",
    enumCatalog = {},
  } = {},
) {
  // Depends on each live array individually, not the `enumCatalog` object
  // itself: useEnumCatalog() (like every hook here) returns a fresh object
  // literal on every render even when none of its state has actually
  // changed, so depending on the object reference would recompute
  // facetOptions on every render of the Home page instead of only when a
  // fetch actually resolves. The arrays themselves are stable useState
  // values that only get new references when their fetch actually updates
  // them.
  const facetOptions = useMemo(
    () => buildFacetOptions(index, enumCatalog),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
    [
      index,
      enumCatalog.problemType,
      enumCatalog.complexityClass,
      enumCatalog.reductionType,
      enumCatalog.reductionCost,
      enumCatalog.solverType,
      enumCatalog.solverComplexityBucket,
    ],
  );

  const reachableSet = useMemo(() => {
    return reachabilityMode === "anyHops"
      ? reachableAnyHops(reductionGraph, reachabilitySource)
      : reachableOneHop(reductionGraph, reachabilitySource);
  }, [reductionGraph, reachabilitySource, reachabilityMode]);

  const results = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const matched = [];
    for (const [name, tags] of index.entries()) {
      if (!matchesSearchTerm(name, tags, query)) {
        continue;
      }
      if (!matchesSelectedFacets(tags, selected)) {
        continue;
      }
      // reachableSet is null whenever reachabilitySource is null (see
      // reachableOneHop/reachableAnyHops above), so this AND's in as an
      // extra predicate only while the reachability filter is active — same
      // "no active selection imposes no constraint" rule the facet loop
      // above already follows.
      if (reachableSet && !reachableSet.has(name)) {
        continue;
      }
      matched.push({ name, tags });
    }
    return matched;
  }, [index, selected, searchValue, reachableSet]);

  return { results, facetOptions, matchedTags: selected };
}
