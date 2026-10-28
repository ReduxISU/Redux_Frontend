// tests/unit/catalogFilters.test.mjs
//
// #299: the Home sidebar's filtering and option lists (hooks/useCatalogFilters.js) with
// several tags per category, and the Problem Variant (Decision / Optimization) facet, both
// with ReduxISU/Redux#946's Navigation/ProblemVariants and without it.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildFacetOptions, matchesSelectedFacets } from "../../hooks/useCatalogFilters.js";

// Tags in useCatalogIndex()'s shape (option keys, one array per facet).
const INDEX = new Map([
  [
    "Bin Packing",
    {
      problemType: ["storageAndRetrieval"],
      problemVariant: ["optimization"],
      solverType: ["heuristic", "approximation"],
      reductionType: [],
    },
  ],
  [
    "Clique",
    {
      problemType: ["graphTheory"],
      problemVariant: ["decision"],
      solverType: ["exact"],
      reductionType: ["restriction", "componentDesign"],
    },
  ],
  [
    "Max Cut",
    {
      problemType: ["networkDesign", "graphTheory"],
      problemVariant: ["decision", "optimization"],
      solverType: ["exact"],
      reductionType: [],
    },
  ],
  // A problem from a backend with no problemVariants.
  ["Sudoku", { problemType: ["gamesAndPuzzles"], solverType: ["exact"] }],
]);

function namesMatching(selected) {
  return [...INDEX]
    .filter(([, tags]) => matchesSelectedFacets(tags, selected))
    .map(([name]) => name);
}

function optionCounts(facetOptions, facetKey) {
  return Object.fromEntries(facetOptions[facetKey].map((option) => [option.key, option.count]));
}

describe("any-tag matching", () => {
  test("an item matches when any of its tags is selected", () => {
    assert.deepEqual(namesMatching({ solverType: new Set(["approximation"]) }), ["Bin Packing"]);
    assert.deepEqual(namesMatching({ solverType: new Set(["heuristic"]) }), ["Bin Packing"]);
    assert.deepEqual(namesMatching({ reductionType: new Set(["componentDesign"]) }), ["Clique"]);
    assert.deepEqual(namesMatching({ problemType: new Set(["graphTheory"]) }), [
      "Clique",
      "Max Cut",
    ]);
  });

  test("several options in one facet are OR'd, facets are AND'd", () => {
    const selected = {
      solverType: new Set(["approximation", "exact"]),
      problemType: new Set(["graphTheory"]),
    };
    assert.deepEqual(namesMatching(selected), ["Clique", "Max Cut"]);
  });

  test("option counts count every tag of a multi-tag item", () => {
    const counts = optionCounts(buildFacetOptions(INDEX, {}), "solverType");
    assert.equal(counts.heuristic, 1);
    assert.equal(counts.approximation, 1);
    assert.equal(counts.exact, 3);
  });
});

describe("Problem Variant facet", () => {
  test("filters on Decision / Optimization, a problem with both matching either", () => {
    assert.deepEqual(namesMatching({ problemVariant: new Set(["decision"]) }), [
      "Clique",
      "Max Cut",
    ]);
    assert.deepEqual(namesMatching({ problemVariant: new Set(["optimization"]) }), [
      "Bin Packing",
      "Max Cut",
    ]);
  });

  test("a problem with no variants never matches a variant filter, and doesn't crash", () => {
    assert.ok(!namesMatching({ problemVariant: new Set(["decision"]) }).includes("Sudoku"));
    assert.ok(namesMatching({ problemVariant: new Set() }).includes("Sudoku"));
  });

  test("lists the options Navigation/ProblemVariants returns, with counts", () => {
    const facetOptions = buildFacetOptions(INDEX, {
      problemVariant: ["Decision", "Optimization"],
    });
    assert.deepEqual(facetOptions.problemVariant, [
      { key: "decision", label: "Decision", count: 2 },
      { key: "optimization", label: "Optimization", count: 2 },
    ]);
  });

  test("lists nothing on a backend without the endpoint, rather than (0) counts", () => {
    assert.deepEqual(buildFacetOptions(INDEX, {}).problemVariant, []);
    assert.deepEqual(buildFacetOptions(INDEX, { problemVariant: [] }).problemVariant, []);
    assert.deepEqual(buildFacetOptions(new Map(), {}).problemVariant, []);
  });

  test("the other facets still fall back to their own options without a live list", () => {
    const facetOptions = buildFacetOptions(INDEX, {});
    assert.ok(facetOptions.problemType.length > 0);
    assert.ok(facetOptions.solverType.length > 0);
  });
});
