// tests/unit/infoCards.test.mjs
//
// #299: the workbench's dropdown tags and info cards (components/workbench/infoCards.js) show
// every tag in a solver's, reduction's and target problem's lists.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  NOT_DECLARED,
  problemCard,
  reductionCard,
  reductionTags,
  solverCard,
  solverListTags,
  solverTags,
  sourceFileUrl,
  targetCard,
  verifierCard,
  visualizationCard,
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

  test("the open list tags every solver type, then the bucket", () => {
    assert.deepEqual(
      solverListTags(solver).map((tag) => tag.label),
      ["Greedy", "Approximation", "Polynomial"],
    );
  });

  test("tags every solver type and not the bucket", () => {
    assert.deepEqual(
      solverTags(solver).map((tag) => tag.label),
      ["Greedy", "Approximation"],
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

describe("verifier", () => {
  test("its card names the certificate format and the authors, or says they are not declared", () => {
    const verifier = {
      name: "3SAT Solution Verifier",
      certificateDescription: "Checks that every clause has a true literal.",
      certificateFormat: "Comma-separated variable:Boolean pairs.",
      credits: { contributors: ["Kaden Marchetti", "Ada Lovelace"] },
    };
    const card = verifierCard(verifier);
    assert.equal(card.kind, "Verifier");
    assert.equal(card.title, "3SAT Solution Verifier");
    assert.equal(fact(card, "Certificate"), "Comma-separated variable:Boolean pairs.");
    assert.equal(fact(card, "Authors"), "Kaden Marchetti, Ada Lovelace");
    const bare = verifierCard({ name: "V", certificateFormat: "" });
    assert.equal(fact(bare, "Certificate"), NOT_DECLARED);
    assert.equal(fact(bare, "Authors"), NOT_DECLARED);
  });
});

describe("source, code and authors", () => {
  const credits = {
    source: "Karp, Richard M. Reducibility among combinatorial problems. 1972.",
    sourceLink: "https://example.org/karp.pdf",
    sourceFile: "Problems/NPComplete/NPC_SAT3/Solvers/Sat3BacktrackingSolver.cs",
    contributors: ["David Lindeman", "Kaden Marchetti"],
  };

  function factOf(card, label) {
    return card.facts.find((candidate) => candidate.label === label);
  }

  test("every card ends with them", () => {
    const cards = [
      problemCard({ name: "3SAT", credits }),
      solverCard({ name: "S", description: "", credits }),
      targetCard("Clique", { credits }),
      reductionCard({ name: "R", target: "Clique", credits }, "3SAT"),
      visualizationCard({ name: "V", credits }, "source"),
      verifierCard({ name: "V", credits }),
    ];
    for (const card of cards) {
      assert.deepEqual(
        card.facts.slice(-3).map((candidate) => candidate.label),
        ["Source", "Code", "Authors"],
        card.kind,
      );
    }
  });

  test("Source links its sourceLink, Code links the file on GitHub", () => {
    const card = solverCard({ name: "S", description: "", credits });
    assert.deepEqual(factOf(card, "Source"), {
      label: "Source",
      value: credits.source,
      clamp: 3,
      href: "https://example.org/karp.pdf",
    });
    const code = factOf(card, "Code");
    assert.equal(code.value, "Sat3BacktrackingSolver.cs");
    assert.equal(code.note, "Problems/NPComplete/NPC_SAT3/Solvers");
    assert.equal(code.href, sourceFileUrl(credits.sourceFile));
    assert.equal(
      code.href,
      "https://github.com/ReduxISU/Redux/blob/HEAD/Problems/NPComplete/NPC_SAT3/Solvers/Sat3BacktrackingSolver.cs",
    );
    assert.equal(fact(card, "Authors"), "David Lindeman, Kaden Marchetti");
  });

  test("a citation without a link is plain text, and nothing declared reads Not declared", () => {
    const unlinked = solverCard({ name: "S", description: "", credits: { source: "Sipser" } });
    assert.equal(factOf(unlinked, "Source").href, undefined);
    const bare = solverCard({ name: "S", description: "" });
    assert.equal(fact(bare, "Source"), NOT_DECLARED);
    assert.equal(fact(bare, "Code"), NOT_DECLARED);
    assert.equal(factOf(bare, "Code").href, undefined);
    assert.equal(fact(bare, "Authors"), NOT_DECLARED);
  });
});
