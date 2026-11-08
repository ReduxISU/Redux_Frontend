// tests/unit/reductionChain.test.mjs
//
// Chains of reductions in Reduce mode (lib/reductionChain.js): the routes found in the reduction
// graph, their To dropdown labels, the play order one step control walks over every hop, and the
// plain words for a chain that did not run.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  chainEnding,
  chainFailure,
  chainRouteLabel,
  chainTimeline,
  chainTitle,
  findChains,
  hopStart,
  joinWords,
  timelineIndexOf,
} from "../../lib/reductionChain.js";
import {
  EXACT_COVER_TO_PARTITION_CHAIN,
  EXACT_COVER_TO_WEIGHTED_CUT_CHAIN,
} from "../e2e/chain-payloads.js";

const NAMES = {
  EXACTCOVER: "Exact Cover",
  SUBSETSUM: "Subset Sum",
  PARTITION: "Partition",
  KNAPSACK: "Knapsack",
  WEIGHTEDCUT: "Weighted Cut",
  CLIQUE: "Clique",
  VERTEXCOVER: "Vertex Cover",
  SETCOVER: "Set Cover",
};
const nameOf = (code) => NAMES[code] ?? code;

// The part of Navigation/Reductions these chains use, in the backend's order.
const GRAPH = {
  EXACTCOVER: {
    SUBSETSUM: [
      { className: "KarpExactCoverToSubsetSum", reductionName: "Karp's Subset Sum Reduction" },
    ],
  },
  SUBSETSUM: {
    PARTITION: [
      { className: "SubsetSumToPartitionReduction", reductionName: "Partition Reduction" },
    ],
    KNAPSACK: [{ className: "FengReduction" }],
  },
  PARTITION: {
    WEIGHTEDCUT: [{ className: "WEIGHTEDCUTReduction", reductionName: "Weighted Cut Reduction" }],
  },
  CLIQUE: { VERTEXCOVER: [{ className: "sipserReductionVertexCover" }] },
  VERTEXCOVER: {
    SETCOVER: [{ className: "KarpVertexCoverToSetCover" }, { className: "SecondSetCover" }],
    CLIQUE: [{ className: "BackToClique" }],
  },
  SETCOVER: {},
};

/** Hops with frames of the given phases, by their first letters ("bbsm"). */
function hops(...phaseLists) {
  const word = { b: "build", s: "solve", h: "handoff", m: "map" };
  return phaseLists.map((letters) => ({
    frames: [...letters].map((letter) => ({ phase: word[letter] })),
  }));
}

describe("findChains", () => {
  test("lists only the problems two or more steps away, with the route", () => {
    const chains = findChains(GRAPH, "EXACTCOVER", nameOf);
    assert.deepEqual(
      chains.map((chain) => [chain.target, chain.hops.map((hop) => hop.className)]),
      [
        ["Partition", ["KarpExactCoverToSubsetSum", "SubsetSumToPartitionReduction"]],
        ["Knapsack", ["KarpExactCoverToSubsetSum", "FengReduction"]],
        [
          "Weighted Cut",
          ["KarpExactCoverToSubsetSum", "SubsetSumToPartitionReduction", "WEIGHTEDCUTReduction"],
        ],
      ],
    );
    const [partition] = chains;
    assert.deepEqual(partition.hops[1], {
      className: "SubsetSumToPartitionReduction",
      name: "Partition Reduction",
      fromCode: "SUBSETSUM",
      from: "Subset Sum",
      toCode: "PARTITION",
      to: "Partition",
    });
    // No reduction name on the edge: the class name stands in.
    assert.equal(chains[1].hops[1].name, "FengReduction");
  });

  test("takes each step's first reduction and never comes back to the first problem", () => {
    const chains = findChains(GRAPH, "CLIQUE", nameOf);
    assert.deepEqual(
      chains.map((chain) => chain.target),
      ["Set Cover"],
    );
    assert.equal(chains[0].hops[1].className, "KarpVertexCoverToSetCover");
  });

  test("stops at the most steps asked for", () => {
    assert.deepEqual(
      findChains(GRAPH, "EXACTCOVER", nameOf, 2).map((chain) => chain.target),
      ["Partition", "Knapsack"],
    );
  });

  test("skips steps with no reduction, and a graph that is not there", () => {
    assert.deepEqual(findChains({ A: { B: [] }, B: { C: [{ className: "BC" }] } }, "A"), []);
    assert.deepEqual(findChains(null, "A"), []);
    assert.deepEqual(findChains(GRAPH, "SETCOVER"), []);
  });
});

describe("route labels", () => {
  const [partition, , weightedCut] = findChains(GRAPH, "EXACTCOVER", nameOf);

  test("name the problems the chain goes through and how many steps it takes", () => {
    assert.equal(chainRouteLabel(partition), "Partition — via Subset Sum (2 steps)");
    assert.equal(
      chainRouteLabel(weightedCut),
      "Weighted Cut — via Subset Sum and Partition (3 steps)",
    );
  });

  test("the title names every problem in order", () => {
    assert.equal(chainTitle(weightedCut), "Exact Cover → Subset Sum → Partition → Weighted Cut");
  });

  test("joinWords", () => {
    assert.equal(joinWords([]), "");
    assert.equal(joinWords(["a"]), "a");
    assert.equal(joinWords(["a", "b"]), "a and b");
    assert.equal(joinWords(["a", "b", "c"]), "a, b and c");
  });
});

describe("chainTimeline", () => {
  test("two hops: both builds, the last hop's solve and map, then the first's handoff and map", () => {
    const timeline = chainTimeline(hops("bbhmm", "bbbssm"));
    assert.deepEqual(timeline, [
      { hop: 0, frame: 0 },
      { hop: 0, frame: 1 },
      { hop: 1, frame: 0 },
      { hop: 1, frame: 1 },
      { hop: 1, frame: 2 },
      { hop: 1, frame: 3 },
      { hop: 1, frame: 4 },
      { hop: 1, frame: 5 },
      { hop: 0, frame: 2 },
      { hop: 0, frame: 3 },
      { hop: 0, frame: 4 },
    ]);
    assert.equal(hopStart(timeline, 1), 2);
    assert.equal(timelineIndexOf(timeline, 0, 2), 8);
    assert.equal(timelineIndexOf(timeline, 0, 9), -1);
  });

  test("three hops carry the answer back from the last hop to the first", () => {
    const timeline = chainTimeline(hops("bhm", "bhm", "bsm"));
    assert.deepEqual(
      timeline.map(({ hop, frame }) => [hop, frame]),
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [2, 1],
        [2, 2],
        [1, 1],
        [1, 2],
        [0, 1],
        [0, 2],
      ],
    );
  });

  test("a stopped solve: each earlier hop still hands back (a Reject) and ends on one Done", () => {
    const stopped = hops("bbhm", "bbhm", "bbsm");
    const timeline = chainTimeline(stopped);
    assert.equal(timeline.length, 12);
    assert.deepEqual(timeline.slice(-4), [
      { hop: 1, frame: 2 },
      { hop: 1, frame: 3 },
      { hop: 0, frame: 2 },
      { hop: 0, frame: 3 },
    ]);
  });

  test("the captured Exact Cover to Partition chain plays every frame once, ending on hop 1's Done", () => {
    const capture = EXACT_COVER_TO_PARTITION_CHAIN.hops;
    const timeline = chainTimeline(capture);
    const total = capture.reduce((sum, hop) => sum + hop.frames.length, 0);
    assert.equal(timeline.length, total);
    assert.equal(new Set(timeline.map(({ hop, frame }) => `${hop}:${frame}`)).size, total);
    const phases = timeline.map(
      ({ hop, frame }) => `${hop + 1}${capture[hop].frames[frame].phase[0]}`,
    );
    assert.equal(
      phases.join(" "),
      [
        ..."1b 1b 1b 1b".split(" "),
        ...Array(6).fill("2b"),
        ...Array(12).fill("2s"),
        ...Array(5).fill("2m"),
        "1h",
        ...Array(4).fill("1m"),
      ].join(" "),
    );
    const last = timeline.at(-1);
    assert.equal(capture[last.hop].frames[last.frame].event, "Done");
    assert.equal(capture[last.hop].frames[last.frame].ok, true);
  });

  test("the captured three-hop chain hands back twice", () => {
    const capture = EXACT_COVER_TO_WEIGHTED_CUT_CHAIN.hops;
    const handoffs = chainTimeline(capture)
      .map(({ hop, frame }) => [hop, capture[hop].frames[frame].phase])
      .filter(([, phase]) => phase === "handoff")
      .map(([hop]) => hop);
    assert.deepEqual(handoffs, [1, 0]);
  });
});

describe("chainFailure", () => {
  const [, , weightedCut] = findChains(GRAPH, "EXACTCOVER", nameOf);

  test("hop_failed names the step and suggests a smaller instance", () => {
    const failure = chainFailure(
      400,
      {
        error: "hop_failed",
        hop: 3,
        reduction: "WEIGHTEDCUTReduction",
        detail:
          "the edge {1,3} weighs 117993 * 120393 = 14205531249 does not fit Weighted Cut's integers (at most 2147483647); use smaller numbers",
      },
      weightedCut,
    );
    assert.equal(failure.headline, "Step 3 (Partition → Weighted Cut) could not be built");
    assert.match(
      failure.detail,
      /^The Partition instance the chain reached there could not be turned into Weighted Cut: the edge \{1,3\}/,
    );
    assert.match(
      failure.detail,
      /use smaller numbers\. Each step makes its numbers bigger, so try a smaller Exact Cover instance\.$/,
    );
  });

  test("a step that can't be drawn or can't map back is named", () => {
    assert.equal(
      chainFailure(
        400,
        { error: "no_build_steps", hop: 2, reduction: "SubsetSumToPartitionReduction" },
        weightedCut,
      ).headline,
      "Step 2 (Subset Sum → Partition) can't be shown step by step yet",
    );
    assert.match(
      chainFailure(400, { error: "no_backward_map", hop: 1 }, weightedCut).detail,
      /^Karp's Subset Sum Reduction can't map answers back/,
    );
  });

  test("a backend without chains says it needs a newer one", () => {
    assert.equal(
      chainFailure(404, null, weightedCut).headline,
      "Chains need a newer Redux backend",
    );
    assert.equal(chainFailure(405, null, weightedCut).code, "chain_unavailable");
  });

  test("the chain's limits", () => {
    assert.equal(
      chainFailure(400, { error: "chain_too_long", hops: 7, most: 6 }, weightedCut).detail,
      "A chain can have at most 6 steps, and this one has 7.",
    );
    assert.match(
      chainFailure(400, { error: "no_path" }, weightedCut).detail,
      /from Exact Cover to Weighted Cut/,
    );
  });

  test("what the workbench already says the usual way is left to it", () => {
    assert.equal(chainFailure(400, { error: "instance_parse_error" }, weightedCut), null);
    assert.equal(chainFailure(429, { error: "server_busy" }, weightedCut), null);
  });
});

describe("chainEnding", () => {
  test("says whether the answer carried back checked out", () => {
    assert.equal(
      chainEnding({ answer: "{{1},{2,3}}", ok: true, timedOut: false }, "Exact Cover", "Partition")
        .tone,
      "ok",
    );
    assert.match(
      chainEnding({ answer: "{}", ok: false, timedOut: false }, "Exact Cover", "Partition").text,
      /did not check out/,
    );
    const stopped = chainEnding(
      { answer: null, ok: null, timedOut: true },
      "Exact Cover",
      "Partition",
    );
    assert.equal(stopped.tone, "warn");
    assert.match(stopped.text, /^The Partition solver had not finished/);
  });
});
