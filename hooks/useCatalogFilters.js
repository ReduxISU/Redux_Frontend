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

import { useMemo } from "react";
import { TAXONOMY, optionLabel } from "../data/taxonomy";

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

// Per-option counts across the whole index (not just the filtered results —
// see file header). Every option gets an entry, including ones with count 0
// (issue done-when: "Counts render for every option including (0)"). Uses
// the same optionSatisfiesSelection expansion matchesSelectedFacets does —
// a single-option Set here — so "NP (n)" always names exactly how many
// results checking that box actually returns, never fewer.
function buildFacetOptions(index) {
  const facetOptions = {};
  for (const facet of TAXONOMY) {
    facetOptions[facet.key] = facet.options.map((option) => {
      const asSelection = new Set([option.key]);
      let count = 0;
      for (const tags of index.values()) {
        const tagValues = tagValueAsArray(tags[facet.key]);
        if (tagValues.some((optionKey) => optionSatisfiesSelection(facet.key, optionKey, asSelection))) {
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
 * @returns {{
 *   results: Array<{name: string, tags: Object}>,
 *   facetOptions: Object,
 *   matchedTags: Object,
 * }}
 *   `results` — problems passing both the search term and every active facet
 *   selection, in the index's own iteration order.
 *   `facetOptions` — `{ [facetKey]: [{key, label, count}] }`, counted against
 *   the full index per option, ready for FacetSidebar's `facetOptions` prop.
 *   `matchedTags` — `selected` passed through unchanged, ready for
 *   ProblemCatalogCard's `matchedTags` prop (see file header).
 */
export function useCatalogFilters(index, { selected = {}, searchValue = "" } = {}) {
  const facetOptions = useMemo(() => buildFacetOptions(index), [index]);

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
      matched.push({ name, tags });
    }
    return matched;
  }, [index, selected, searchValue]);

  return { results, facetOptions, matchedTags: selected };
}
