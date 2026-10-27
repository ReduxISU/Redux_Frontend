// tests/unit/infoCards.test.mjs
//
// #299: the workbench's dropdown tags and info cards (components/workbench/infoCards.js) show
// every tag in a solver's, reduction's and target problem's lists.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  NOT_DECLARED,
  reductionCard,
  reductionTags,
  solverCard,
  solverTags,
  targetCard,
} from "../../components/workbench/infoCards.js";

function fact(card, label) {
  return card.facts.find((candidate) => candidate.label === label)?.value;
}

describe("solver", () => {
  const solver = {
    name: "Bin Packing First Fit Decreasing",
    description: "",
    solverTypeNames: ["Greedy", "Approximation"],
    complexityBucketName: "Polynomial",
    timeComplexity: null,
    spaceComplexity: null,
  };

  test("tags every solver type, then the bucket", () => {
    assert.deepEqual(
      solverTags(solver).map((tag) => tag.label),
      ["Greedy", "Approximation", "Polynomial"],
    );
  });

  test("the card's Type lists every solver type", () => {
    assert.equal(fact(solverCard(solver), "Type"), "Greedy, Approximation");
  });

  test("no types reads Not declared", () => {
    const unclassified = { ...solver, solverTypeNames: ["Unclassified"] };
    assert.equal(fact(solverCard(unclassified), "Type"), NOT_DECLARED);
    const missing = { ...solver, solverTypeNames: undefined };
    assert.equal(fact(solverCard(missing), "Type"), NOT_DECLARED);
  });
});

describe("reduction", () => {
  const reduction = {
    name: "Some Reduction",
    target: "Set Cover",
    reductionTypeNames: ["Restriction", "LocalReplacement"],
    costName: "Linear",
    complexityBucketName: "Polynomial",
    bigO: "",
    description: "",
  };

  test("tags and card list every reduction type", () => {
    assert.deepEqual(
      reductionTags(reduction).map((tag) => tag.label),
      ["Restriction", "Local Replacement", "Linear"],
    );
    assert.equal(
      fact(reductionCard(reduction, "Vertex Cover"), "Type"),
      "Restriction, Local Replacement",
    );
  });
});

describe("target problem", () => {
  test("shows every problem type and its variants", () => {
    const card = targetCard("Max Cut", {
      description: "",
      complexityClass: ["npHard"],
      problemType: ["networkDesign", "graphTheory"],
      problemVariant: ["decision", "optimization"],
    });
    assert.equal(fact(card, "Type"), "Network Design, Graph Theory");
    assert.equal(fact(card, "Variant"), "Decision, Optimization");
  });

  test("no variants (a backend from before #946) reads Not declared", () => {
    const card = targetCard("Max Cut", { complexityClass: ["npHard"], problemType: [] });
    assert.equal(fact(card, "Variant"), NOT_DECLARED);
    assert.equal(fact(card, "Type"), NOT_DECLARED);
  });
});
