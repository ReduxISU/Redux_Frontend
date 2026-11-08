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
  chainSummaryCaption,
  chainSummaryView,
  chainTimeline,
  chainTitle,
  composeChainGadgets,
  findChains,
  hopStart,
  joinWords,
  revealScroll,
  routeFades,
  routeStops,
  startsLeadingTo,
  stopLabel,
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
      { hop: 2, frame: 0, summary: true },
    ]);
    assert.equal(hopStart(timeline, 1), 2);
    // The Start and end stop is found like a hop, by the index after the last.
    assert.equal(hopStart(timeline, 2), 11);
    assert.equal(timelineIndexOf(timeline, 2, 0), 11);
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
        [3, 0],
      ],
    );
    assert.equal(timeline.at(-1).summary, true);
  });

  test("a stopped solve: each earlier hop still hands back (a Reject) and ends on one Done", () => {
    const stopped = hops("bbhm", "bbhm", "bbsm");
    const timeline = chainTimeline(stopped);
    assert.equal(timeline.length, 13);
    assert.deepEqual(timeline.slice(-5), [
      { hop: 1, frame: 2 },
      { hop: 1, frame: 3 },
      { hop: 0, frame: 2 },
      { hop: 0, frame: 3 },
      { hop: 3, frame: 0, summary: true },
    ]);
  });

  test("the captured Exact Cover to Partition chain plays every frame once, then Start and end", () => {
    const capture = EXACT_COVER_TO_PARTITION_CHAIN.hops;
    const withSummary = chainTimeline(capture);
    assert.deepEqual(withSummary.at(-1), { hop: 2, frame: 0, summary: true });
    const timeline = withSummary.slice(0, -1);
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
      .filter((entry) => !entry.summary)
      .map(({ hop, frame }) => [hop, capture[hop].frames[frame].phase])
      .filter(([, phase]) => phase === "handoff")
      .map(([hop]) => hop);
    assert.deepEqual(handoffs, [1, 0]);
  });
});

describe("composeChainGadgets", () => {
  const gadget = (sourceIds, targetIds, kind = "element") => ({ kind, sourceIds, targetIds });

  test("follows each first-problem piece through every hop to the last problem", () => {
    const composed = composeChainGadgets([
      [gadget(["S1"], ["I1"]), gadget(["S2"], ["I2"])],
      [gadget(["I1"], ["P1"]), gadget(["I2"], ["P2"])],
    ]);
    assert.deepEqual(
      composed.map((link) => [link.kind, link.sourceIds, link.targetIds]),
      [
        ["element", ["S1"], ["P1"]],
        ["element", ["S2"], ["P2"]],
      ],
    );
    assert.deepEqual(
      composed.map((link) => link.index),
      [0, 1],
    );
  });

  test("fans out: one piece leading to several becomes a group", () => {
    const composed = composeChainGadgets([
      [gadget(["a"], ["e1", "e2"], "group")],
      [gadget(["e1"], ["x1"]), gadget(["e2"], ["x2", "x3"])],
    ]);
    assert.deepEqual(composed, [
      {
        index: 0,
        kind: "group",
        sourceIds: ["a"],
        targetIds: ["x1", "x2", "x3"],
        legacySourceIds: [],
        legacyTargetIds: [],
        note: "",
      },
    ]);
  });

  test("a broken path just stops, and a gadget with no ids on one side links nothing", () => {
    const composed = composeChainGadgets([
      [gadget(["a"], ["m1"]), gadget(["b"], ["m2"]), gadget([], ["m3"], "bound")],
      [gadget(["m1"], ["z1"]), gadget(["m3"], ["z3"]), gadget(["m2"], [])],
    ]);
    assert.deepEqual(
      composed.map((link) => [link.sourceIds, link.targetIds]),
      [[["a"], ["z1"]]],
    );
    assert.deepEqual(composeChainGadgets([]), []);
  });

  test("a path through a bound is a bound", () => {
    const composed = composeChainGadgets([
      [gadget(["e1", "e2"], ["T"], "bound")],
      [gadget(["T"], ["P1"], "palette"), gadget(["T"], ["T", "T2"], "bound")],
    ]);
    assert.deepEqual(
      composed.map((link) => [link.kind, link.sourceIds, link.targetIds]),
      [
        ["bound", ["e1"], ["P1", "T", "T2"]],
        ["bound", ["e2"], ["P1", "T", "T2"]],
      ],
    );
  });

  test("three hops, and the reverse: every first-problem piece leading to a last-problem one", () => {
    const composed = composeChainGadgets([
      [gadget(["a"], ["m1"]), gadget(["b"], ["m1", "m2"])],
      [gadget(["m1"], ["n1"]), gadget(["m2"], ["n2"])],
      [gadget(["n1"], ["z"]), gadget(["n2"], ["z", "y"])],
    ]);
    assert.deepEqual(startsLeadingTo(composed, "z"), ["a", "b"]);
    assert.deepEqual(startsLeadingTo(composed, "y"), ["b"]);
    assert.deepEqual(startsLeadingTo(composed, "nowhere"), []);
  });

  test("the captured chains link through their middle problems", () => {
    const twoHops = composeChainGadgets(
      EXACT_COVER_TO_PARTITION_CHAIN.hops.map((hop) => hop.gadgets),
    );
    assert.ok(twoHops.length > 0);
    const threeHops = composeChainGadgets(
      EXACT_COVER_TO_WEIGHTED_CUT_CHAIN.hops.map((hop) => hop.gadgets),
    );
    assert.ok(threeHops.length > 0);
    // Every composed link ends on pieces the last problem's picture draws ids for.
    const lastIds = JSON.stringify(EXACT_COVER_TO_PARTITION_CHAIN.hops[1].target.picture.payload);
    for (const link of twoHops) {
      for (const id of link.targetIds) assert.ok(lastIds.includes(`"${id}"`), id);
    }
  });
});

describe("the Start and end stop", () => {
  const problems = ["Exact Cover", "Subset Sum", "Partition"];

  test("its caption says where the answer came from and whether it checks out", () => {
    assert.equal(
      chainSummaryCaption({ answer: "{{1},{2,3}}", ok: true, timedOut: false }, problems),
      "Exact Cover's answer {{1},{2,3}} came from solving Partition and carrying the answer back through Subset Sum. It checks out: it is a valid Exact Cover answer.",
    );
    assert.match(
      chainSummaryCaption({ answer: "{}", ok: false, timedOut: false }, [
        "Exact Cover",
        "Subset Sum",
        "Partition",
        "Weighted Cut",
      ]),
      /back through Partition and Subset Sum\. It did not check out/,
    );
    assert.equal(
      chainSummaryCaption({ answer: null, ok: null, timedOut: true }, problems),
      "The Partition solver had not finished, so there is no answer to compare.",
    );
  });

  test("draws the first problem with the answer carried back beside the last problem solved", () => {
    const chain = EXACT_COVER_TO_PARTITION_CHAIN;
    const view = chainSummaryView(chain, problems);
    const [first, last] = chain.hops;
    assert.equal(view.source, first.source);
    assert.equal(view.target.picture, last.target.picture);
    assert.equal(view.frames.length, 1);
    const [frame] = view.frames;
    assert.equal(frame.phase, "summary");
    assert.deepEqual(frame.source, first.frames.filter((f) => f.phase === "map").at(-1).source);
    assert.deepEqual(frame.target, last.frames.filter((f) => f.phase === "solve").at(-1).target);
    assert.match(
      frame.caption,
      /^Exact Cover's answer \{\{1\},\{2,3\}\} came from solving Partition/,
    );
    assert.equal(
      view.gadgets.length,
      composeChainGadgets(chain.hops.map((hop) => hop.gadgets)).length,
    );
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

describe("the route header", () => {
  const route = routeStops([
    { from: "Exact Cover", to: "Subset Sum" },
    { from: "Subset Sum", to: "Partition" },
    { from: "Partition", to: "Weighted Cut" },
  ]);

  test("each stop has a full and a compact label, Start and end last", () => {
    assert.deepEqual(
      route.map((stop) => [stop.full, stop.compact]),
      [
        ["1 · Exact Cover → Subset Sum", "1 → Subset Sum"],
        ["2 · Subset Sum → Partition", "2 → Partition"],
        ["3 · Partition → Weighted Cut", "3 → Weighted Cut"],
        ["Start and end · Exact Cover ↔ Weighted Cut", "Start and end"],
      ],
    );
    assert.equal(route.at(-1).summary, true);
  });

  test("compact labels only when the route does not fit, and never on the stop on screen", () => {
    const [stop] = route;
    assert.equal(stopLabel(stop, { compact: false, current: false }), stop.full);
    assert.equal(stopLabel(stop, { compact: true, current: false }), stop.compact);
    assert.equal(stopLabel(stop, { compact: true, current: true }), stop.full);
  });

  test("fades: none when it fits, the right at the start, both in the middle, the left at the end", () => {
    assert.deepEqual(routeFades({ scrollLeft: 0, scrollWidth: 300, clientWidth: 300 }), {
      left: false,
      right: false,
    });
    assert.deepEqual(routeFades({ scrollLeft: 0, scrollWidth: 301, clientWidth: 300 }), {
      left: false,
      right: false,
    });
    assert.deepEqual(routeFades({ scrollLeft: 0, scrollWidth: 800, clientWidth: 300 }), {
      left: false,
      right: true,
    });
    assert.deepEqual(routeFades({ scrollLeft: 200, scrollWidth: 800, clientWidth: 300 }), {
      left: true,
      right: true,
    });
    assert.deepEqual(routeFades({ scrollLeft: 499.5, scrollWidth: 800, clientWidth: 300 }), {
      left: true,
      right: false,
    });
  });

  test("revealScroll brings a stop clear of the fades, or leaves the route alone", () => {
    const box = { scrollLeft: 100, clientWidth: 300, margin: 32 };
    // In view already.
    assert.equal(revealScroll({ ...box, itemLeft: 150, itemWidth: 100 }), null);
    // Off to the right: its end, plus the margin, at the right edge.
    assert.equal(revealScroll({ ...box, itemLeft: 500, itemWidth: 100 }), 332);
    // Off to the left: its start, less the margin.
    assert.equal(revealScroll({ ...box, itemLeft: 110, itemWidth: 100 }), 78);
    // Near the start: never before 0.
    assert.equal(revealScroll({ ...box, itemLeft: 10, itemWidth: 100 }), 0);
    // Wider than the room: from its start.
    assert.equal(revealScroll({ ...box, itemLeft: 400, itemWidth: 400 }), 368);
  });
});
