// tests/unit/tagList.test.mjs
//
// #299: data/tagList.js's tagList(), and the problem-level tags built from it
// (data/mergeSupplementalTags.js's mergeProblemInfoTags), against both backend shapes: one
// with ReduxISU/Redux#946's tag lists, and one from before it with only the single fields.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { mergeProblemInfoTags } from "../../data/mergeSupplementalTags.js";
import { tagList } from "../../data/tagList.js";

describe("tagList", () => {
  test("reads the list field, in the backend's order", () => {
    const solver = { solverType: "Greedy", solverTypes: ["Greedy", "Approximation"] };
    assert.deepEqual(tagList(solver, "solverTypes", "solverType"), ["Greedy", "Approximation"]);
  });

  test("prefers the list over the single field", () => {
    const edge = { reductionType: "Restriction", reductionTypes: ["ComponentDesign"] };
    assert.deepEqual(tagList(edge, "reductionTypes", "reductionType"), ["ComponentDesign"]);
  });

  test("falls back to the single field on a backend from before #946", () => {
    assert.deepEqual(tagList({ solverType: "BruteForce" }, "solverTypes", "solverType"), [
      "BruteForce",
    ]);
  });

  test("an empty list stays empty rather than reading the single field", () => {
    const solver = { solverType: "Unclassified", solverTypes: [] };
    assert.deepEqual(tagList(solver, "solverTypes", "solverType"), []);
  });

  test("returns [] when neither field is there", () => {
    assert.deepEqual(tagList({}, "solverTypes", "solverType"), []);
    assert.deepEqual(tagList({ solverType: "" }, "solverTypes", "solverType"), []);
    assert.deepEqual(tagList(undefined, "solverTypes", "solverType"), []);
    assert.deepEqual(tagList(null, "problemVariants"), []);
  });

  test("a list with no single field (problemVariants) has no fallback", () => {
    assert.deepEqual(tagList({ problemVariants: ["Optimization"] }, "problemVariants"), [
      "Optimization",
    ]);
    assert.deepEqual(tagList({ problemVariant: "Decision" }, "problemVariants"), []);
  });

  test("drops empty and non-string entries, keeps raw member names", () => {
    const item = { solverTypes: ["Heuristic", "", null, 3, "Unclassified"] };
    assert.deepEqual(tagList(item, "solverTypes", "solverType"), ["Heuristic", "Unclassified"]);
  });
});

describe("mergeProblemInfoTags", () => {
  test("reads every problem type and variant the backend lists", () => {
    const tags = mergeProblemInfoTags("Max Cut", {
      complexityClass: "NPHard",
      problemType: "NetworkDesign",
      problemTypes: ["NetworkDesign", "GraphTheory"],
      problemVariants: ["Decision", "Optimization"],
    });
    assert.deepEqual(tags.problemType, ["networkDesign", "graphTheory"]);
    assert.deepEqual(tags.problemVariant, ["decision", "optimization"]);
    assert.deepEqual(tags.complexityClass, ["npHard"]);
  });

  test("reads the single problemType on a backend from before #946", () => {
    const tags = mergeProblemInfoTags("Max Cut", { problemType: "GraphTheory" });
    assert.deepEqual(tags.problemType, ["graphTheory"]);
    assert.deepEqual(tags.problemVariant, []);
  });

  test("falls back to the front-end overlay when the backend has no real type", () => {
    // data/supplementalTags.js tags Max Cut "networkDesign".
    assert.deepEqual(mergeProblemInfoTags("Max Cut", {}).problemType, ["networkDesign"]);
    assert.deepEqual(
      mergeProblemInfoTags("Max Cut", { problemTypes: ["Unclassified"] }).problemType,
      ["networkDesign"],
    );
  });

  test("an unknown problem with nothing declared is Unclassified, not a crash", () => {
    const tags = mergeProblemInfoTags("No Such Problem", undefined);
    assert.deepEqual(tags.problemType, ["Unclassified"]);
    assert.deepEqual(tags.problemVariant, []);
  });

  test("drops Unclassified from the variants", () => {
    const tags = mergeProblemInfoTags("Max Cut", { problemVariants: ["Unclassified"] });
    assert.deepEqual(tags.problemVariant, []);
  });
});
