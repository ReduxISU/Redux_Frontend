// tests/e2e/reduction-gadget-payloads.js
//
// #239: more ProblemProvider/reductionView answers for tests/e2e/reduction-gadgets.spec.js, captured on
// 2026-10-19 from a local build of Redux (local/viz-integration), whose views name edge rules, bounds
// and or-gadgets. CI's backend has no Reduction View, so the spec answers the request with these.
// Kept apart from ./reduction-payloads.js so each file stays well under Biome's 1 MiB limit.

/** 3SAT to Clique as SAT3_TO_CLIQUE_VIEW (reduction-payloads.js), recaptured now that Redux names the edge rules: each build step that joins two clauses lists an edgeRule gadget per pair, the pairs it leaves unjoined among them (named by their two nodes), and the last build step sets the bound K = 3 (frame.bound) with a bound gadget. The whole run, 32 frames. */
export const SAT3_TO_CLIQUE_RULES_VIEW = {
  type: "Reduction",
  kind: "reduction",
  reduction: "SipserReduceToCliqueStandard",
  reductionName: "Sipser's Clique Reduction",
  solver: "Clique Brute Force",
  source: {
    problem: "3SAT",
    instance: "(x1 | !x2 | x3) & (!x1 | x3 | x1) & (x2 | !x3 | !x1)",
    picture: {
      type: "GroupedGraph",
      payload: {
        kind: "groupedGraph",
        layout: "ring",
        shape: "assignment",
        rule: "satisfiability",
        groups: [
          {
            id: "c0",
            label: "C1",
            members: ["c0-0", "c0-1", "c0-2"],
          },
          {
            id: "c1",
            label: "C2",
            members: ["c1-0", "c1-1", "c1-2"],
          },
          {
            id: "c2",
            label: "C3",
            members: ["c2-0", "c2-1", "c2-2"],
          },
        ],
        nodes: [
          {
            id: "c0-0",
            label: "x1",
            variable: "v:x1",
            positive: true,
            group: "c0",
          },
          {
            id: "c0-1",
            label: "¬x2",
            variable: "v:x2",
            positive: false,
            group: "c0",
          },
          {
            id: "c0-2",
            label: "x3",
            variable: "v:x3",
            positive: true,
            group: "c0",
          },
          {
            id: "c1-0",
            label: "¬x1",
            variable: "v:x1",
            positive: false,
            group: "c1",
          },
          {
            id: "c1-1",
            label: "x3",
            variable: "v:x3",
            positive: true,
            group: "c1",
          },
          {
            id: "c1-2",
            label: "x1",
            variable: "v:x1",
            positive: true,
            group: "c1",
          },
          {
            id: "c2-0",
            label: "x2",
            variable: "v:x2",
            positive: true,
            group: "c2",
          },
          {
            id: "c2-1",
            label: "¬x3",
            variable: "v:x3",
            positive: false,
            group: "c2",
          },
          {
            id: "c2-2",
            label: "¬x1",
            variable: "v:x1",
            positive: false,
            group: "c2",
          },
        ],
        variables: [
          {
            id: "v:x1",
            label: "x1",
          },
          {
            id: "v:x2",
            label: "x2",
          },
          {
            id: "v:x3",
            label: "x3",
          },
        ],
        edges: [
          {
            id: "c0-0~c1-0",
            a: "c0-0",
            b: "c1-0",
          },
          {
            id: "c0-0~c2-2",
            a: "c0-0",
            b: "c2-2",
          },
          {
            id: "c0-1~c2-0",
            a: "c0-1",
            b: "c2-0",
          },
          {
            id: "c0-2~c2-1",
            a: "c0-2",
            b: "c2-1",
          },
          {
            id: "c1-1~c2-1",
            a: "c1-1",
            b: "c2-1",
          },
          {
            id: "c1-2~c2-2",
            a: "c1-2",
            b: "c2-2",
          },
        ],
        clauseEdges: [
          {
            id: "c0-0~c0-1",
            a: "c0-0",
            b: "c0-1",
          },
          {
            id: "c0-0~c0-2",
            a: "c0-0",
            b: "c0-2",
          },
          {
            id: "c0-1~c0-2",
            a: "c0-1",
            b: "c0-2",
          },
          {
            id: "c1-0~c1-1",
            a: "c1-0",
            b: "c1-1",
          },
          {
            id: "c1-0~c1-2",
            a: "c1-0",
            b: "c1-2",
          },
          {
            id: "c1-1~c1-2",
            a: "c1-1",
            b: "c1-2",
          },
          {
            id: "c2-0~c2-1",
            a: "c2-0",
            b: "c2-1",
          },
          {
            id: "c2-0~c2-2",
            a: "c2-0",
            b: "c2-2",
          },
          {
            id: "c2-1~c2-2",
            a: "c2-1",
            b: "c2-2",
          },
        ],
      },
    },
    visualization: "Sat3DefaultVisualization",
  },
  target: {
    problem: "Clique",
    instance:
      "(({x1_0,!x2_0,x3_0,!x1_1,x3_1,x1_1,x2_2,!x3_2,!x1_2},{{x1_0,x3_1},{x1_0,x1_1},{x1_0,x2_2},{x1_0,!x3_2},{!x2_0,!x1_1},{!x2_0,x3_1},{!x2_0,x1_1},{!x2_0,!x3_2},{!x2_0,!x1_2},{x3_0,!x1_1},{x3_0,x3_1},{x3_0,x1_1},{x3_0,x2_2},{x3_0,!x1_2},{!x1_1,!x2_0},{!x1_1,x3_0},{!x1_1,x2_2},{!x1_1,!x3_2},{!x1_1,!x1_2},{x3_1,x1_0},{x3_1,!x2_0},{x3_1,x3_0},{x3_1,x2_2},{x3_1,!x1_2},{x1_1,x1_0},{x1_1,!x2_0},{x1_1,x3_0},{x1_1,x2_2},{x1_1,!x3_2},{x2_2,x1_0},{x2_2,x3_0},{x2_2,!x1_1},{x2_2,x3_1},{x2_2,x1_1},{!x3_2,x1_0},{!x3_2,!x2_0},{!x3_2,!x1_1},{!x3_2,x1_1},{!x1_2,!x2_0},{!x1_2,x3_0},{!x1_2,!x1_1},{!x1_2,x3_1}}),3)",
    picture: {
      type: "Graph",
      payload: {
        kind: "graph",
        subtype: "undirected",
        layout: "force",
        nodes: [
          {
            id: "x1_0",
            label: "x1_0",
          },
          {
            id: "!x2_0",
            label: "!x2_0",
          },
          {
            id: "x3_0",
            label: "x3_0",
          },
          {
            id: "!x1_1",
            label: "!x1_1",
          },
          {
            id: "x3_1",
            label: "x3_1",
          },
          {
            id: "x1_1",
            label: "x1_1",
          },
          {
            id: "x2_2",
            label: "x2_2",
          },
          {
            id: "!x3_2",
            label: "!x3_2",
          },
          {
            id: "!x1_2",
            label: "!x1_2",
          },
        ],
        edges: [
          {
            id: "x1_0-x3_1",
            a: "x1_0",
            b: "x3_1",
          },
          {
            id: "x1_0-x1_1",
            a: "x1_0",
            b: "x1_1",
          },
          {
            id: "x1_0-x2_2",
            a: "x1_0",
            b: "x2_2",
          },
          {
            id: "!x3_2-x1_0",
            a: "!x3_2",
            b: "x1_0",
          },
          {
            id: "!x1_1-!x2_0",
            a: "!x1_1",
            b: "!x2_0",
          },
          {
            id: "!x2_0-x3_1",
            a: "!x2_0",
            b: "x3_1",
          },
          {
            id: "!x2_0-x1_1",
            a: "!x2_0",
            b: "x1_1",
          },
          {
            id: "!x2_0-!x3_2",
            a: "!x2_0",
            b: "!x3_2",
          },
          {
            id: "!x1_2-!x2_0",
            a: "!x1_2",
            b: "!x2_0",
          },
          {
            id: "!x1_1-x3_0",
            a: "!x1_1",
            b: "x3_0",
          },
          {
            id: "x3_0-x3_1",
            a: "x3_0",
            b: "x3_1",
          },
          {
            id: "x1_1-x3_0",
            a: "x1_1",
            b: "x3_0",
          },
          {
            id: "x2_2-x3_0",
            a: "x2_2",
            b: "x3_0",
          },
          {
            id: "!x1_2-x3_0",
            a: "!x1_2",
            b: "x3_0",
          },
          {
            id: "!x1_1-x2_2",
            a: "!x1_1",
            b: "x2_2",
          },
          {
            id: "!x1_1-!x3_2",
            a: "!x1_1",
            b: "!x3_2",
          },
          {
            id: "!x1_1-!x1_2",
            a: "!x1_1",
            b: "!x1_2",
          },
          {
            id: "x2_2-x3_1",
            a: "x2_2",
            b: "x3_1",
          },
          {
            id: "!x1_2-x3_1",
            a: "!x1_2",
            b: "x3_1",
          },
          {
            id: "x1_1-x2_2",
            a: "x1_1",
            b: "x2_2",
          },
          {
            id: "!x3_2-x1_1",
            a: "!x3_2",
            b: "x1_1",
          },
        ],
        shape: "subset",
        rule: "clique",
        k: 3,
      },
    },
    buildOrder: {
      nodes: ["x1_0", "!x2_0", "x3_0", "!x1_1", "x3_1", "x1_1", "x2_2", "!x3_2", "!x1_2"],
      edges: [
        "!x1_1-!x2_0",
        "!x1_1-x3_0",
        "!x2_0-x1_1",
        "!x2_0-x3_1",
        "x1_0-x1_1",
        "x1_0-x3_1",
        "x1_1-x3_0",
        "x3_0-x3_1",
        "!x1_2-!x2_0",
        "!x1_2-x3_0",
        "!x2_0-!x3_2",
        "!x3_2-x1_0",
        "x1_0-x2_2",
        "x2_2-x3_0",
        "!x1_1-!x1_2",
        "!x1_1-!x3_2",
        "!x1_1-x2_2",
        "!x1_2-x3_1",
        "!x3_2-x1_1",
        "x1_1-x2_2",
        "x2_2-x3_1",
      ],
    },
    buildReveal: "pieces",
    visualization: "CliqueDefaultVisualization",
  },
  gadgets: [
    {
      gadgetKind: "element",
      sourceIds: ["c0-0"],
      targetIds: ["x1_0"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c0-1"],
      targetIds: ["!x2_0"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c0-2"],
      targetIds: ["x3_0"],
    },
    {
      gadgetKind: "group",
      sourceIds: ["c0"],
      targetIds: ["x1_0", "!x2_0", "x3_0"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c1-0"],
      targetIds: ["!x1_1"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c1-1"],
      targetIds: ["x3_1"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c1-2"],
      targetIds: ["x1_1"],
    },
    {
      gadgetKind: "group",
      sourceIds: ["c1"],
      targetIds: ["!x1_1", "x3_1", "x1_1"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c2-0"],
      targetIds: ["x2_2"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c2-1"],
      targetIds: ["!x3_2"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c2-2"],
      targetIds: ["!x1_2"],
    },
    {
      gadgetKind: "group",
      sourceIds: ["c2"],
      targetIds: ["x2_2", "!x3_2", "!x1_2"],
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0"],
      targetIds: ["x1_0", "!x2_0", "x3_0"],
      note: "Nodes from the same clause, C1, are never joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c1"],
      targetIds: ["!x1_1", "x3_1", "x1_1"],
      note: "Nodes from the same clause, C2, are never joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c2"],
      targetIds: ["x2_2", "!x3_2", "!x1_2"],
      note: "Nodes from the same clause, C3, are never joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-1", "c1-0"],
      targetIds: ["!x1_1-!x2_0"],
      note: "!x2_0 and !x1_1 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-2", "c1-0"],
      targetIds: ["!x1_1-x3_0"],
      note: "x3_0 and !x1_1 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-1", "c1-2"],
      targetIds: ["!x2_0-x1_1"],
      note: "!x2_0 and x1_1 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-1", "c1-1"],
      targetIds: ["!x2_0-x3_1"],
      note: "!x2_0 and x3_1 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-0", "c1-2"],
      targetIds: ["x1_0-x1_1"],
      note: "x1_0 and x1_1 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-0", "c1-1"],
      targetIds: ["x1_0-x3_1"],
      note: "x1_0 and x3_1 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-2", "c1-2"],
      targetIds: ["x1_1-x3_0"],
      note: "x3_0 and x1_1 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-2", "c1-1"],
      targetIds: ["x3_0-x3_1"],
      note: "x3_0 and x3_1 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-0", "c1-0"],
      targetIds: ["x1_0", "!x1_1"],
      note: "x1_0 and !x1_1 contradict each other, so they are not joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-1", "c2-2"],
      targetIds: ["!x1_2-!x2_0"],
      note: "!x2_0 and !x1_2 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-2", "c2-2"],
      targetIds: ["!x1_2-x3_0"],
      note: "x3_0 and !x1_2 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-1", "c2-1"],
      targetIds: ["!x2_0-!x3_2"],
      note: "!x2_0 and !x3_2 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-0", "c2-1"],
      targetIds: ["!x3_2-x1_0"],
      note: "x1_0 and !x3_2 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-0", "c2-0"],
      targetIds: ["x1_0-x2_2"],
      note: "x1_0 and x2_2 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-2", "c2-0"],
      targetIds: ["x2_2-x3_0"],
      note: "x3_0 and x2_2 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-0", "c2-2"],
      targetIds: ["x1_0", "!x1_2"],
      note: "x1_0 and !x1_2 contradict each other, so they are not joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-1", "c2-0"],
      targetIds: ["!x2_0", "x2_2"],
      note: "!x2_0 and x2_2 contradict each other, so they are not joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c0-2", "c2-1"],
      targetIds: ["x3_0", "!x3_2"],
      note: "x3_0 and !x3_2 contradict each other, so they are not joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c1-0", "c2-2"],
      targetIds: ["!x1_1-!x1_2"],
      note: "!x1_1 and !x1_2 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c1-0", "c2-1"],
      targetIds: ["!x1_1-!x3_2"],
      note: "!x1_1 and !x3_2 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c1-0", "c2-0"],
      targetIds: ["!x1_1-x2_2"],
      note: "!x1_1 and x2_2 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c1-1", "c2-2"],
      targetIds: ["!x1_2-x3_1"],
      note: "x3_1 and !x1_2 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c1-2", "c2-1"],
      targetIds: ["!x3_2-x1_1"],
      note: "x1_1 and !x3_2 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c1-2", "c2-0"],
      targetIds: ["x1_1-x2_2"],
      note: "x1_1 and x2_2 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c1-1", "c2-0"],
      targetIds: ["x2_2-x3_1"],
      note: "x3_1 and x2_2 are from different clauses and do not contradict each other, so they are joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c1-2", "c2-2"],
      targetIds: ["x1_1", "!x1_2"],
      note: "x1_1 and !x1_2 contradict each other, so they are not joined.",
    },
    {
      gadgetKind: "edgeRule",
      sourceIds: ["c1-1", "c2-1"],
      targetIds: ["x3_1", "!x3_2"],
      note: "x3_1 and !x3_2 contradict each other, so they are not joined.",
    },
    {
      gadgetKind: "bound",
      sourceIds: ["c0", "c1", "c2"],
      targetIds: [],
      note: "K = 3, the number of clauses",
    },
  ],
  frames: [
    {
      phase: "build",
      event: "Accept",
      caption:
        "Clause C1 (x1 | !x2 | x3) becomes nodes x1_0, !x2_0, x3_0, with no edges between them.",
      step: 0,
      sourceFocus: ["c0", "c0-0", "c0-1", "c0-2"],
      targetFocus: ["x1_0", "!x2_0", "x3_0"],
      source: {
        nodes: {
          "c0-0": {
            state: "ElementHighlight",
          },
          "c0-1": {
            state: "ElementHighlight",
          },
          "c0-2": {
            state: "ElementHighlight",
          },
        },
        groups: {
          c0: {
            state: "ElementHighlight",
          },
        },
        assignment: {},
      },
      target: {
        nodes: {
          "!x2_0": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
          x3_0: {
            state: "ElementHighlight",
          },
        },
        edges: {},
        phantoms: [],
        builtNodes: 3,
        builtEdges: 0,
      },
      gadgets: [0, 1, 2, 3, 12],
    },
    {
      phase: "build",
      event: "Accept",
      caption:
        "Clause C2 (!x1 | x3 | x1) becomes nodes !x1_1, x3_1, x1_1, with no edges between them.",
      step: 1,
      sourceFocus: ["c1", "c1-0", "c1-1", "c1-2"],
      targetFocus: ["!x1_1", "x3_1", "x1_1"],
      source: {
        nodes: {
          "c1-0": {
            state: "ElementHighlight",
          },
          "c1-1": {
            state: "ElementHighlight",
          },
          "c1-2": {
            state: "ElementHighlight",
          },
        },
        groups: {
          c1: {
            state: "ElementHighlight",
          },
        },
        assignment: {},
      },
      target: {
        nodes: {
          "!x1_1": {
            state: "ElementHighlight",
          },
          x1_1: {
            state: "ElementHighlight",
          },
          x3_1: {
            state: "ElementHighlight",
          },
        },
        edges: {},
        phantoms: [],
        builtNodes: 6,
        builtEdges: 0,
      },
      gadgets: [4, 5, 6, 7, 13],
    },
    {
      phase: "build",
      event: "Accept",
      caption:
        "Clause C3 (x2 | !x3 | !x1) becomes nodes x2_2, !x3_2, !x1_2, with no edges between them.",
      step: 2,
      sourceFocus: ["c2", "c2-0", "c2-1", "c2-2"],
      targetFocus: ["x2_2", "!x3_2", "!x1_2"],
      source: {
        nodes: {
          "c2-0": {
            state: "ElementHighlight",
          },
          "c2-1": {
            state: "ElementHighlight",
          },
          "c2-2": {
            state: "ElementHighlight",
          },
        },
        groups: {
          c2: {
            state: "ElementHighlight",
          },
        },
        assignment: {},
      },
      target: {
        nodes: {
          "!x1_2": {
            state: "ElementHighlight",
          },
          "!x3_2": {
            state: "ElementHighlight",
          },
          x2_2: {
            state: "ElementHighlight",
          },
        },
        edges: {},
        phantoms: [],
        builtNodes: 9,
        builtEdges: 0,
      },
      gadgets: [8, 9, 10, 11, 14],
    },
    {
      phase: "build",
      event: "Accept",
      caption: "Join clauses C1 and C2: 8 edges. x1_0 and !x1_1 contradict each other, so no edge.",
      step: 3,
      sourceFocus: ["c0", "c1"],
      targetFocus: [
        "x1_0",
        "!x2_0",
        "x3_0",
        "!x1_1",
        "x3_1",
        "x1_1",
        "!x1_1-!x2_0",
        "!x1_1-x3_0",
        "!x2_0-x1_1",
        "!x2_0-x3_1",
        "x1_0-x1_1",
        "x1_0-x3_1",
        "x1_1-x3_0",
        "x3_0-x3_1",
      ],
      source: {
        nodes: {},
        groups: {
          c0: {
            state: "ElementHighlight",
          },
          c1: {
            state: "ElementHighlight",
          },
        },
        assignment: {},
      },
      target: {
        nodes: {
          "!x1_1": {
            state: "ElementHighlight",
          },
          "!x2_0": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
          x1_1: {
            state: "ElementHighlight",
          },
          x3_0: {
            state: "ElementHighlight",
          },
          x3_1: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "!x1_1-!x2_0": {
            state: "ElementHighlight",
          },
          "!x1_1-x3_0": {
            state: "ElementHighlight",
          },
          "!x2_0-x1_1": {
            state: "ElementHighlight",
          },
          "!x2_0-x3_1": {
            state: "ElementHighlight",
          },
          "x1_0-x1_1": {
            state: "ElementHighlight",
          },
          "x1_0-x3_1": {
            state: "ElementHighlight",
          },
          "x1_1-x3_0": {
            state: "ElementHighlight",
          },
          "x3_0-x3_1": {
            state: "ElementHighlight",
          },
        },
        phantoms: [],
        builtNodes: 9,
        builtEdges: 8,
        skipped: [
          {
            id: "!x1_1-x1_0",
            a: "!x1_1",
            b: "x1_0",
          },
        ],
      },
      gadgets: [15, 16, 17, 18, 19, 20, 21, 22, 23],
    },
    {
      phase: "build",
      event: "Accept",
      caption:
        "Join clauses C1 and C3: 6 edges. x1_0 and !x1_2 contradict each other, so no edge. !x2_0 and x2_2 contradict each other, so no edge. x3_0 and !x3_2 contradict each other, so no edge.",
      step: 4,
      sourceFocus: ["c0", "c2"],
      targetFocus: [
        "x1_0",
        "!x2_0",
        "x3_0",
        "x2_2",
        "!x3_2",
        "!x1_2",
        "!x1_2-!x2_0",
        "!x1_2-x3_0",
        "!x2_0-!x3_2",
        "!x3_2-x1_0",
        "x1_0-x2_2",
        "x2_2-x3_0",
      ],
      source: {
        nodes: {},
        groups: {
          c0: {
            state: "ElementHighlight",
          },
          c2: {
            state: "ElementHighlight",
          },
        },
        assignment: {},
      },
      target: {
        nodes: {
          "!x1_2": {
            state: "ElementHighlight",
          },
          "!x2_0": {
            state: "ElementHighlight",
          },
          "!x3_2": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
          x2_2: {
            state: "ElementHighlight",
          },
          x3_0: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "!x1_2-!x2_0": {
            state: "ElementHighlight",
          },
          "!x1_2-x3_0": {
            state: "ElementHighlight",
          },
          "!x2_0-!x3_2": {
            state: "ElementHighlight",
          },
          "!x3_2-x1_0": {
            state: "ElementHighlight",
          },
          "x1_0-x2_2": {
            state: "ElementHighlight",
          },
          "x2_2-x3_0": {
            state: "ElementHighlight",
          },
        },
        phantoms: [],
        builtNodes: 9,
        builtEdges: 14,
        skipped: [
          {
            id: "!x1_2-x1_0",
            a: "!x1_2",
            b: "x1_0",
          },
          {
            id: "!x2_0-x2_2",
            a: "!x2_0",
            b: "x2_2",
          },
          {
            id: "!x3_2-x3_0",
            a: "!x3_2",
            b: "x3_0",
          },
        ],
      },
      gadgets: [24, 25, 26, 27, 28, 29, 30, 31, 32],
    },
    {
      phase: "build",
      event: "Accept",
      caption:
        "Join clauses C2 and C3: 7 edges. x3_1 and !x3_2 contradict each other, so no edge. x1_1 and !x1_2 contradict each other, so no edge.",
      step: 5,
      sourceFocus: ["c1", "c2"],
      targetFocus: [
        "!x1_1",
        "x3_1",
        "x1_1",
        "x2_2",
        "!x3_2",
        "!x1_2",
        "!x1_1-!x1_2",
        "!x1_1-!x3_2",
        "!x1_1-x2_2",
        "!x1_2-x3_1",
        "!x3_2-x1_1",
        "x1_1-x2_2",
        "x2_2-x3_1",
      ],
      source: {
        nodes: {},
        groups: {
          c1: {
            state: "ElementHighlight",
          },
          c2: {
            state: "ElementHighlight",
          },
        },
        assignment: {},
      },
      target: {
        nodes: {
          "!x1_1": {
            state: "ElementHighlight",
          },
          "!x1_2": {
            state: "ElementHighlight",
          },
          "!x3_2": {
            state: "ElementHighlight",
          },
          x1_1: {
            state: "ElementHighlight",
          },
          x2_2: {
            state: "ElementHighlight",
          },
          x3_1: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "!x1_1-!x1_2": {
            state: "ElementHighlight",
          },
          "!x1_1-!x3_2": {
            state: "ElementHighlight",
          },
          "!x1_1-x2_2": {
            state: "ElementHighlight",
          },
          "!x1_2-x3_1": {
            state: "ElementHighlight",
          },
          "!x3_2-x1_1": {
            state: "ElementHighlight",
          },
          "x1_1-x2_2": {
            state: "ElementHighlight",
          },
          "x2_2-x3_1": {
            state: "ElementHighlight",
          },
        },
        phantoms: [],
        builtNodes: 9,
        builtEdges: 21,
        skipped: [
          {
            id: "!x1_2-x1_1",
            a: "!x1_2",
            b: "x1_1",
          },
          {
            id: "!x3_2-x3_1",
            a: "!x3_2",
            b: "x3_1",
          },
        ],
      },
      gadgets: [33, 34, 35, 36, 37, 38, 39, 40, 41],
    },
    {
      phase: "build",
      event: "Accept",
      caption:
        "K = 3, one node per clause: a clique of 3 nodes has to take one node from every clause.",
      step: 6,
      sourceFocus: ["c0", "c1", "c2"],
      targetFocus: [],
      source: {
        nodes: {},
        groups: {
          c0: {
            state: "ElementHighlight",
          },
          c1: {
            state: "ElementHighlight",
          },
          c2: {
            state: "ElementHighlight",
          },
        },
        assignment: {},
      },
      target: {
        nodes: {},
        edges: {},
        phantoms: [],
        builtNodes: 9,
        builtEdges: 21,
      },
      bound: 3,
      gadgets: [42],
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,!x2_0,x3_0}: !x2_0 and x1_0 aren't joined.",
      step: 0,
      sourceFocus: [],
      targetFocus: ["x1_0", "!x2_0", "x3_0"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          "!x2_0": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
          x3_0: {
            state: "ElementHighlight",
          },
        },
        edges: {},
        phantoms: [
          {
            a: "!x2_0",
            b: "x1_0",
            state: "Rejected",
          },
          {
            a: "!x2_0",
            b: "x3_0",
            state: "Rejected",
          },
          {
            a: "x1_0",
            b: "x3_0",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,!x2_0,!x1_1}: !x1_1 and x1_0 aren't joined.",
      step: 1,
      sourceFocus: [],
      targetFocus: ["x1_0", "!x2_0", "!x1_1"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          "!x1_1": {
            state: "ElementHighlight",
          },
          "!x2_0": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "!x1_1-!x2_0": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "!x1_1",
            b: "x1_0",
            state: "Rejected",
          },
          {
            a: "!x2_0",
            b: "x1_0",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,!x2_0,x3_1}: !x2_0 and x1_0 aren't joined.",
      step: 2,
      sourceFocus: [],
      targetFocus: ["x1_0", "!x2_0", "x3_1"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          "!x2_0": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
          x3_1: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "!x2_0-x3_1": {
            state: "ElementHighlight",
          },
          "x1_0-x3_1": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "!x2_0",
            b: "x1_0",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,!x2_0,x1_1}: !x2_0 and x1_0 aren't joined.",
      step: 3,
      sourceFocus: [],
      targetFocus: ["x1_0", "!x2_0", "x1_1"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          "!x2_0": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
          x1_1: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "!x2_0-x1_1": {
            state: "ElementHighlight",
          },
          "x1_0-x1_1": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "!x2_0",
            b: "x1_0",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,!x2_0,x2_2}: !x2_0 and x1_0 aren't joined.",
      step: 4,
      sourceFocus: [],
      targetFocus: ["x1_0", "!x2_0", "x2_2"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          "!x2_0": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
          x2_2: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "x1_0-x2_2": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "!x2_0",
            b: "x1_0",
            state: "Rejected",
          },
          {
            a: "!x2_0",
            b: "x2_2",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,!x2_0,!x3_2}: !x2_0 and x1_0 aren't joined.",
      step: 5,
      sourceFocus: [],
      targetFocus: ["x1_0", "!x2_0", "!x3_2"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          "!x2_0": {
            state: "ElementHighlight",
          },
          "!x3_2": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "!x2_0-!x3_2": {
            state: "ElementHighlight",
          },
          "!x3_2-x1_0": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "!x2_0",
            b: "x1_0",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,!x2_0,!x1_2}: !x1_2 and x1_0 aren't joined.",
      step: 6,
      sourceFocus: [],
      targetFocus: ["x1_0", "!x2_0", "!x1_2"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          "!x1_2": {
            state: "ElementHighlight",
          },
          "!x2_0": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "!x1_2-!x2_0": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "!x1_2",
            b: "x1_0",
            state: "Rejected",
          },
          {
            a: "!x2_0",
            b: "x1_0",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,x3_0,!x1_1}: !x1_1 and x1_0 aren't joined.",
      step: 7,
      sourceFocus: [],
      targetFocus: ["x1_0", "x3_0", "!x1_1"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          "!x1_1": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
          x3_0: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "!x1_1-x3_0": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "!x1_1",
            b: "x1_0",
            state: "Rejected",
          },
          {
            a: "x1_0",
            b: "x3_0",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,x3_0,x3_1}: x1_0 and x3_0 aren't joined.",
      step: 8,
      sourceFocus: [],
      targetFocus: ["x1_0", "x3_0", "x3_1"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          x1_0: {
            state: "ElementHighlight",
          },
          x3_0: {
            state: "ElementHighlight",
          },
          x3_1: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "x1_0-x3_1": {
            state: "ElementHighlight",
          },
          "x3_0-x3_1": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "x1_0",
            b: "x3_0",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,x3_0,x1_1}: x1_0 and x3_0 aren't joined.",
      step: 9,
      sourceFocus: [],
      targetFocus: ["x1_0", "x3_0", "x1_1"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          x1_0: {
            state: "ElementHighlight",
          },
          x1_1: {
            state: "ElementHighlight",
          },
          x3_0: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "x1_0-x1_1": {
            state: "ElementHighlight",
          },
          "x1_1-x3_0": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "x1_0",
            b: "x3_0",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,x3_0,x2_2}: x1_0 and x3_0 aren't joined.",
      step: 10,
      sourceFocus: [],
      targetFocus: ["x1_0", "x3_0", "x2_2"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          x1_0: {
            state: "ElementHighlight",
          },
          x2_2: {
            state: "ElementHighlight",
          },
          x3_0: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "x1_0-x2_2": {
            state: "ElementHighlight",
          },
          "x2_2-x3_0": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "x1_0",
            b: "x3_0",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,x3_0,!x3_2}: !x3_2 and x3_0 aren't joined.",
      step: 11,
      sourceFocus: [],
      targetFocus: ["x1_0", "x3_0", "!x3_2"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          "!x3_2": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
          x3_0: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "!x3_2-x1_0": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "!x3_2",
            b: "x3_0",
            state: "Rejected",
          },
          {
            a: "x1_0",
            b: "x3_0",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,x3_0,!x1_2}: !x1_2 and x1_0 aren't joined.",
      step: 12,
      sourceFocus: [],
      targetFocus: ["x1_0", "x3_0", "!x1_2"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          "!x1_2": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
          x3_0: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "!x1_2-x3_0": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "!x1_2",
            b: "x1_0",
            state: "Rejected",
          },
          {
            a: "x1_0",
            b: "x3_0",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,!x1_1,x3_1}: !x1_1 and x1_0 aren't joined.",
      step: 13,
      sourceFocus: [],
      targetFocus: ["x1_0", "!x1_1", "x3_1"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          "!x1_1": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
          x3_1: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "x1_0-x3_1": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "!x1_1",
            b: "x1_0",
            state: "Rejected",
          },
          {
            a: "!x1_1",
            b: "x3_1",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,!x1_1,x1_1}: !x1_1 and x1_0 aren't joined.",
      step: 14,
      sourceFocus: [],
      targetFocus: ["x1_0", "!x1_1", "x1_1"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          "!x1_1": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
          x1_1: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "x1_0-x1_1": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "!x1_1",
            b: "x1_0",
            state: "Rejected",
          },
          {
            a: "!x1_1",
            b: "x1_1",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,!x1_1,x2_2}: !x1_1 and x1_0 aren't joined.",
      step: 15,
      sourceFocus: [],
      targetFocus: ["x1_0", "!x1_1", "x2_2"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          "!x1_1": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
          x2_2: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "!x1_1-x2_2": {
            state: "ElementHighlight",
          },
          "x1_0-x2_2": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "!x1_1",
            b: "x1_0",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,!x1_1,!x3_2}: !x1_1 and x1_0 aren't joined.",
      step: 16,
      sourceFocus: [],
      targetFocus: ["x1_0", "!x1_1", "!x3_2"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          "!x1_1": {
            state: "ElementHighlight",
          },
          "!x3_2": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "!x1_1-!x3_2": {
            state: "ElementHighlight",
          },
          "!x3_2-x1_0": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "!x1_1",
            b: "x1_0",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,!x1_1,!x1_2}: !x1_1 and x1_0 aren't joined.",
      step: 17,
      sourceFocus: [],
      targetFocus: ["x1_0", "!x1_1", "!x1_2"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          "!x1_1": {
            state: "ElementHighlight",
          },
          "!x1_2": {
            state: "ElementHighlight",
          },
          x1_0: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "!x1_1-!x1_2": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "!x1_1",
            b: "x1_0",
            state: "Rejected",
          },
          {
            a: "!x1_2",
            b: "x1_0",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {x1_0,x3_1,x1_1}: x1_1 and x3_1 aren't joined.",
      step: 18,
      sourceFocus: [],
      targetFocus: ["x1_0", "x3_1", "x1_1"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          x1_0: {
            state: "ElementHighlight",
          },
          x1_1: {
            state: "ElementHighlight",
          },
          x3_1: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "x1_0-x1_1": {
            state: "ElementHighlight",
          },
          "x1_0-x3_1": {
            state: "ElementHighlight",
          },
        },
        phantoms: [
          {
            a: "x1_1",
            b: "x3_1",
            state: "Rejected",
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Accept",
      caption: "Try {x1_0,x3_1,x2_2}. Every pair is joined.",
      step: 19,
      sourceFocus: [],
      targetFocus: ["x1_0", "x3_1", "x2_2"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          x1_0: {
            state: "ElementHighlight",
          },
          x2_2: {
            state: "ElementHighlight",
          },
          x3_1: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "x1_0-x2_2": {
            state: "Solution",
          },
          "x1_0-x3_1": {
            state: "Solution",
          },
          "x2_2-x3_1": {
            state: "Solution",
          },
        },
        phantoms: [],
      },
    },
    {
      phase: "solve",
      event: "Accept",
      caption: "{x1_0,x3_1,x2_2} is a clique, found after 20 tries.",
      step: 20,
      sourceFocus: [],
      targetFocus: [],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        nodes: {
          x1_0: {
            state: "Solution",
          },
          x2_2: {
            state: "Solution",
          },
          x3_1: {
            state: "Solution",
          },
        },
        edges: {
          "x1_0-x2_2": {
            state: "Solution",
          },
          "x1_0-x3_1": {
            state: "Solution",
          },
          "x2_2-x3_1": {
            state: "Solution",
          },
        },
        phantoms: [],
      },
    },
    {
      phase: "map",
      event: "Accept",
      caption: "Node x1_0 is in the clique, so x1 = True.",
      step: 0,
      sourceFocus: ["c0-0"],
      targetFocus: ["x1_0"],
      source: {
        nodes: {
          "c0-0": {
            state: "ElementHighlight",
          },
          "c1-0": {
            state: "False",
          },
          "c1-2": {
            state: "Committed",
          },
          "c2-2": {
            state: "False",
          },
        },
        groups: {
          c0: {
            state: "Covered",
          },
          c1: {
            state: "Covered",
          },
        },
        assignment: {
          "v:x1": true,
        },
      },
      target: {
        nodes: {
          x1_0: {
            state: "ElementHighlight",
          },
          x2_2: {
            state: "Solution",
          },
          x3_1: {
            state: "Solution",
          },
        },
        edges: {
          "x1_0-x2_2": {
            state: "Solution",
          },
          "x1_0-x3_1": {
            state: "Solution",
          },
          "x2_2-x3_1": {
            state: "Solution",
          },
        },
        phantoms: [],
      },
    },
    {
      phase: "map",
      event: "Accept",
      caption: "Node x3_1 is in the clique, so x3 = True.",
      step: 1,
      sourceFocus: ["c1-1"],
      targetFocus: ["x3_1"],
      source: {
        nodes: {
          "c0-0": {
            state: "Committed",
          },
          "c0-2": {
            state: "Committed",
          },
          "c1-0": {
            state: "False",
          },
          "c1-1": {
            state: "ElementHighlight",
          },
          "c1-2": {
            state: "Committed",
          },
          "c2-1": {
            state: "False",
          },
          "c2-2": {
            state: "False",
          },
        },
        groups: {
          c0: {
            state: "Covered",
          },
          c1: {
            state: "Covered",
          },
        },
        assignment: {
          "v:x1": true,
          "v:x3": true,
        },
      },
      target: {
        nodes: {
          x1_0: {
            state: "Solution",
          },
          x2_2: {
            state: "Solution",
          },
          x3_1: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "x1_0-x2_2": {
            state: "Solution",
          },
          "x1_0-x3_1": {
            state: "Solution",
          },
          "x2_2-x3_1": {
            state: "Solution",
          },
        },
        phantoms: [],
      },
    },
    {
      phase: "map",
      event: "Accept",
      caption: "Node x2_2 is in the clique, so x2 = True.",
      step: 2,
      sourceFocus: ["c2-0"],
      targetFocus: ["x2_2"],
      source: {
        nodes: {
          "c0-0": {
            state: "Solution",
          },
          "c0-1": {
            state: "False",
          },
          "c0-2": {
            state: "Solution",
          },
          "c1-0": {
            state: "False",
          },
          "c1-1": {
            state: "Solution",
          },
          "c1-2": {
            state: "Solution",
          },
          "c2-0": {
            state: "ElementHighlight",
          },
          "c2-1": {
            state: "False",
          },
          "c2-2": {
            state: "False",
          },
        },
        groups: {
          c0: {
            state: "Covered",
          },
          c1: {
            state: "Covered",
          },
          c2: {
            state: "Covered",
          },
        },
        assignment: {
          "v:x1": true,
          "v:x2": true,
          "v:x3": true,
        },
      },
      target: {
        nodes: {
          x1_0: {
            state: "Solution",
          },
          x2_2: {
            state: "ElementHighlight",
          },
          x3_1: {
            state: "Solution",
          },
        },
        edges: {
          "x1_0-x2_2": {
            state: "Solution",
          },
          "x1_0-x3_1": {
            state: "Solution",
          },
          "x2_2-x3_1": {
            state: "Solution",
          },
        },
        phantoms: [],
      },
    },
    {
      phase: "map",
      event: "Done",
      caption: "(x1:True,x2:True,x3:True) is a valid 3SAT answer.",
      step: 3,
      ok: true,
      sourceFocus: [],
      targetFocus: [],
      source: {
        nodes: {
          "c0-0": {
            state: "Solution",
          },
          "c0-1": {
            state: "False",
          },
          "c0-2": {
            state: "Solution",
          },
          "c1-0": {
            state: "False",
          },
          "c1-1": {
            state: "Solution",
          },
          "c1-2": {
            state: "Solution",
          },
          "c2-0": {
            state: "Solution",
          },
          "c2-1": {
            state: "False",
          },
          "c2-2": {
            state: "False",
          },
        },
        groups: {
          c0: {
            state: "Covered",
          },
          c1: {
            state: "Covered",
          },
          c2: {
            state: "Covered",
          },
        },
        assignment: {
          "v:x1": true,
          "v:x2": true,
          "v:x3": true,
        },
      },
      target: {
        nodes: {
          x1_0: {
            state: "Solution",
          },
          x2_2: {
            state: "Solution",
          },
          x3_1: {
            state: "Solution",
          },
        },
        edges: {
          "x1_0-x2_2": {
            state: "Solution",
          },
          "x1_0-x3_1": {
            state: "Solution",
          },
          "x2_2-x3_1": {
            state: "Solution",
          },
        },
        phantoms: [],
      },
    },
  ],
};

/** Exact Cover to Subset Sum (KarpExactCoverToSubsetSum), Exact Cover's default instance ({1,2,3,4},{{1,2,3},{2,3},{4,1}}): a Bipartite Graph becomes a Packing. Each set S1..S3 becomes one number (element gadgets S_i to I_i), and the target sum is a bound. The whole run, 15 frames. */
export const EXACT_COVER_TO_SUBSET_SUM_VIEW = {
  type: "Reduction",
  kind: "reduction",
  reduction: "KarpExactCoverToSubsetSum",
  reductionName: "Karp's Subset Sum Reduction",
  solver: "Subset Sum Brute Force",
  source: {
    problem: "Exact Cover",
    instance: "({1,2,3,4},{{1,2,3},{2,3},{4,1}})",
    picture: {
      type: "BipartiteGraph",
      payload: {
        kind: "bipartiteGraph",
        layout: "columns",
        pickSide: "sets",
        rule: "exactlyOnce",
        elements: [
          {
            id: "e:1",
            label: "1",
          },
          {
            id: "e:2",
            label: "2",
          },
          {
            id: "e:3",
            label: "3",
          },
          {
            id: "e:4",
            label: "4",
          },
        ],
        sets: [
          {
            id: "S1",
            label: "S1",
            members: ["e:1", "e:2", "e:3"],
          },
          {
            id: "S2",
            label: "S2",
            members: ["e:2", "e:3"],
          },
          {
            id: "S3",
            label: "S3",
            members: ["e:4", "e:1"],
          },
        ],
        edges: [
          {
            id: "e:1~S1",
            a: "e:1",
            b: "S1",
          },
          {
            id: "e:2~S1",
            a: "e:2",
            b: "S1",
          },
          {
            id: "e:3~S1",
            a: "e:3",
            b: "S1",
          },
          {
            id: "e:2~S2",
            a: "e:2",
            b: "S2",
          },
          {
            id: "e:3~S2",
            a: "e:3",
            b: "S2",
          },
          {
            id: "e:4~S3",
            a: "e:4",
            b: "S3",
          },
          {
            id: "e:1~S3",
            a: "e:1",
            b: "S3",
          },
        ],
      },
    },
    visualization: "ExactCoverDefaultVisualization",
  },
  target: {
    problem: "Subset Sum",
    instance: "({21,20,65},85)",
    picture: {
      type: "Packing",
      payload: {
        kind: "packing",
        rule: "subsetSum",
        items: [
          {
            id: "I1",
            label: "21",
            size: 21,
          },
          {
            id: "I2",
            label: "20",
            size: 20,
          },
          {
            id: "I3",
            label: "65",
            size: 65,
          },
        ],
        containers: [
          {
            id: "C1",
            label: "Chosen",
            target: 85,
          },
        ],
        total: 106,
      },
    },
    buildOrder: {
      nodes: ["I1", "I2", "I3", "C1"],
      edges: [],
    },
    buildReveal: "pieces",
    visualization: "SubsetSumVisualization",
  },
  gadgets: [
    {
      gadgetKind: "element",
      sourceIds: ["S1"],
      targetIds: ["I1"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["S2"],
      targetIds: ["I2"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["S3"],
      targetIds: ["I3"],
    },
    {
      gadgetKind: "bound",
      sourceIds: ["e:1", "e:2", "e:3", "e:4"],
      targetIds: ["C1"],
      note: "T = 85, a 1 in each of the 4 digits",
    },
  ],
  frames: [
    {
      phase: "build",
      event: "Accept",
      caption:
        "Set S1 {1,2,3} becomes the number 21: 0111 in base 4, one digit per element of X (4, 3, 2, 1 from the left), a 1 where S1 holds that element.",
      step: 0,
      sourceFocus: ["S1"],
      targetFocus: ["I1"],
      source: {
        nodes: {
          S1: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "e:1~S1": {
            state: "ElementHighlight",
          },
          "e:2~S1": {
            state: "ElementHighlight",
          },
          "e:3~S1": {
            state: "ElementHighlight",
          },
        },
        hits: {},
      },
      target: {
        items: {
          I1: {
            state: "ElementHighlight",
          },
        },
        containers: {},
        assign: [-1, -1, -1],
        totals: [
          {
            size: 0,
          },
        ],
        builtNodes: 1,
        builtEdges: 0,
      },
      gadgets: [0],
    },
    {
      phase: "build",
      event: "Accept",
      caption:
        "Set S2 {2,3} becomes the number 20: 0110 in base 4, one digit per element of X (4, 3, 2, 1 from the left), a 1 where S2 holds that element.",
      step: 1,
      sourceFocus: ["S2"],
      targetFocus: ["I2"],
      source: {
        nodes: {
          S2: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "e:2~S2": {
            state: "ElementHighlight",
          },
          "e:3~S2": {
            state: "ElementHighlight",
          },
        },
        hits: {},
      },
      target: {
        items: {
          I2: {
            state: "ElementHighlight",
          },
        },
        containers: {},
        assign: [-1, -1, -1],
        totals: [
          {
            size: 0,
          },
        ],
        builtNodes: 2,
        builtEdges: 0,
      },
      gadgets: [1],
    },
    {
      phase: "build",
      event: "Accept",
      caption:
        "Set S3 {4,1} becomes the number 65: 1001 in base 4, one digit per element of X (4, 3, 2, 1 from the left), a 1 where S3 holds that element.",
      step: 2,
      sourceFocus: ["S3"],
      targetFocus: ["I3"],
      source: {
        nodes: {
          S3: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "e:1~S3": {
            state: "ElementHighlight",
          },
          "e:4~S3": {
            state: "ElementHighlight",
          },
        },
        hits: {},
      },
      target: {
        items: {
          I3: {
            state: "ElementHighlight",
          },
        },
        containers: {},
        assign: [-1, -1, -1],
        totals: [
          {
            size: 0,
          },
        ],
        builtNodes: 3,
        builtEdges: 0,
      },
      gadgets: [2],
    },
    {
      phase: "build",
      event: "Accept",
      caption:
        "The target T is 1111 in base 4 = 85: a 1 for every element of X. At most 3 sets add to any digit and 3 < 4, so nothing carries, and numbers add up to T exactly when their sets hold every element once.",
      step: 3,
      sourceFocus: ["e:1", "e:2", "e:3", "e:4"],
      targetFocus: [],
      source: {
        nodes: {
          "e:1": {
            state: "ElementHighlight",
          },
          "e:2": {
            state: "ElementHighlight",
          },
          "e:3": {
            state: "ElementHighlight",
          },
          "e:4": {
            state: "ElementHighlight",
          },
        },
        edges: {},
        hits: {},
      },
      target: {
        items: {},
        containers: {},
        assign: [-1, -1, -1],
        totals: [
          {
            size: 0,
          },
        ],
        builtNodes: 4,
        builtEdges: 0,
      },
      bound: 85,
      gadgets: [3],
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {21}: 21, not 85.",
      step: 0,
      sourceFocus: [],
      targetFocus: ["I1"],
      source: {
        nodes: {},
        edges: {},
        hits: {},
      },
      target: {
        items: {
          I1: {
            state: "ElementHighlight",
          },
        },
        containers: {
          C1: {
            state: "Rejected",
          },
        },
        assign: [0, -1, -1],
        totals: [
          {
            size: 21,
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {20}: 20, not 85.",
      step: 1,
      sourceFocus: [],
      targetFocus: ["I2"],
      source: {
        nodes: {},
        edges: {},
        hits: {},
      },
      target: {
        items: {
          I2: {
            state: "ElementHighlight",
          },
        },
        containers: {
          C1: {
            state: "Rejected",
          },
        },
        assign: [-1, 0, -1],
        totals: [
          {
            size: 20,
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {21,20}: 21 + 20 = 41, not 85.",
      step: 2,
      sourceFocus: [],
      targetFocus: ["I1", "I2"],
      source: {
        nodes: {},
        edges: {},
        hits: {},
      },
      target: {
        items: {
          I1: {
            state: "ElementHighlight",
          },
          I2: {
            state: "ElementHighlight",
          },
        },
        containers: {
          C1: {
            state: "Rejected",
          },
        },
        assign: [0, 0, -1],
        totals: [
          {
            size: 41,
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {65}: 65, not 85.",
      step: 3,
      sourceFocus: [],
      targetFocus: ["I3"],
      source: {
        nodes: {},
        edges: {},
        hits: {},
      },
      target: {
        items: {
          I3: {
            state: "ElementHighlight",
          },
        },
        containers: {
          C1: {
            state: "Rejected",
          },
        },
        assign: [-1, -1, 0],
        totals: [
          {
            size: 65,
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {21,65}: 21 + 65 = 86, not 85.",
      step: 4,
      sourceFocus: [],
      targetFocus: ["I1", "I3"],
      source: {
        nodes: {},
        edges: {},
        hits: {},
      },
      target: {
        items: {
          I1: {
            state: "ElementHighlight",
          },
          I3: {
            state: "ElementHighlight",
          },
        },
        containers: {
          C1: {
            state: "Rejected",
          },
        },
        assign: [0, -1, 0],
        totals: [
          {
            size: 86,
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Accept",
      caption: "Try {20,65}: 20 + 65 = 85. That's T.",
      step: 5,
      sourceFocus: [],
      targetFocus: ["I2", "I3"],
      source: {
        nodes: {},
        edges: {},
        hits: {},
      },
      target: {
        items: {
          I2: {
            state: "ElementHighlight",
          },
          I3: {
            state: "ElementHighlight",
          },
        },
        containers: {
          C1: {
            state: "Covered",
          },
        },
        assign: [-1, 0, 0],
        totals: [
          {
            size: 85,
          },
        ],
      },
    },
    {
      phase: "solve",
      event: "Accept",
      caption: "{20,65} adds up to exactly 85, found after 6 subsets.",
      step: 6,
      sourceFocus: [],
      targetFocus: [],
      source: {
        nodes: {},
        edges: {},
        hits: {},
      },
      target: {
        items: {
          I1: {
            state: "Untraveled",
          },
          I2: {
            state: "Solution",
          },
          I3: {
            state: "Solution",
          },
        },
        containers: {
          C1: {
            state: "Covered",
          },
        },
        assign: [-1, 0, 0],
        totals: [
          {
            size: 85,
          },
        ],
      },
    },
    {
      phase: "map",
      event: "Reject",
      caption: "Number 21 is not in the subset, so set S1 {1,2,3} is left out of the exact cover.",
      step: 0,
      sourceFocus: ["S1"],
      targetFocus: ["I1"],
      source: {
        nodes: {
          S1: {
            state: "Rejected",
          },
        },
        edges: {
          "e:1~S1": {
            state: "Rejected",
          },
          "e:2~S1": {
            state: "Rejected",
          },
          "e:3~S1": {
            state: "Rejected",
          },
        },
        hits: {},
      },
      target: {
        items: {
          I1: {
            state: "ElementHighlight",
          },
          I2: {
            state: "Solution",
          },
          I3: {
            state: "Solution",
          },
        },
        containers: {
          C1: {
            state: "Covered",
          },
        },
        assign: [-1, 0, 0],
        totals: [
          {
            size: 85,
          },
        ],
      },
    },
    {
      phase: "map",
      event: "Accept",
      caption:
        "Number 20 is in the subset, so set S2 {2,3} is in the exact cover: 20 is S2 written in base 4.",
      step: 1,
      sourceFocus: ["S2"],
      targetFocus: ["I2"],
      source: {
        nodes: {
          S1: {
            state: "Blocked",
          },
          S2: {
            state: "ElementHighlight",
          },
          "e:2": {
            state: "Covered",
          },
          "e:3": {
            state: "Covered",
          },
        },
        edges: {
          "e:2~S2": {
            state: "ElementHighlight",
          },
          "e:3~S2": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:2": 1,
          "e:3": 1,
        },
      },
      target: {
        items: {
          I1: {
            state: "Untraveled",
          },
          I2: {
            state: "ElementHighlight",
          },
          I3: {
            state: "Solution",
          },
        },
        containers: {
          C1: {
            state: "Covered",
          },
        },
        assign: [-1, 0, 0],
        totals: [
          {
            size: 85,
          },
        ],
      },
    },
    {
      phase: "map",
      event: "Accept",
      caption:
        "Number 65 is in the subset, so set S3 {4,1} is in the exact cover: 65 is S3 written in base 4.",
      step: 2,
      sourceFocus: ["S3"],
      targetFocus: ["I3"],
      source: {
        nodes: {
          S1: {
            state: "Blocked",
          },
          S2: {
            state: "Solution",
          },
          S3: {
            state: "ElementHighlight",
          },
          "e:1": {
            state: "Covered",
          },
          "e:2": {
            state: "Covered",
          },
          "e:3": {
            state: "Covered",
          },
          "e:4": {
            state: "Covered",
          },
        },
        edges: {
          "e:1~S3": {
            state: "ElementHighlight",
          },
          "e:2~S2": {
            state: "Solution",
          },
          "e:3~S2": {
            state: "Solution",
          },
          "e:4~S3": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:1": 1,
          "e:2": 1,
          "e:3": 1,
          "e:4": 1,
        },
      },
      target: {
        items: {
          I1: {
            state: "Untraveled",
          },
          I2: {
            state: "Solution",
          },
          I3: {
            state: "ElementHighlight",
          },
        },
        containers: {
          C1: {
            state: "Covered",
          },
        },
        assign: [-1, 0, 0],
        totals: [
          {
            size: 85,
          },
        ],
      },
    },
    {
      phase: "map",
      event: "Done",
      caption: "{{2,3},{4,1}} is a valid Exact Cover answer.",
      step: 3,
      ok: true,
      sourceFocus: [],
      targetFocus: [],
      source: {
        nodes: {
          S1: {
            state: "Blocked",
          },
          S2: {
            state: "Solution",
          },
          S3: {
            state: "Solution",
          },
          "e:1": {
            state: "Covered",
          },
          "e:2": {
            state: "Covered",
          },
          "e:3": {
            state: "Covered",
          },
          "e:4": {
            state: "Covered",
          },
        },
        edges: {
          "e:1~S3": {
            state: "Solution",
          },
          "e:2~S2": {
            state: "Solution",
          },
          "e:3~S2": {
            state: "Solution",
          },
          "e:4~S3": {
            state: "Solution",
          },
        },
        hits: {
          "e:1": 1,
          "e:2": 1,
          "e:3": 1,
          "e:4": 1,
        },
      },
      target: {
        items: {
          I1: {
            state: "Untraveled",
          },
          I2: {
            state: "Solution",
          },
          I3: {
            state: "Solution",
          },
        },
        containers: {
          C1: {
            state: "Covered",
          },
        },
        assign: [-1, 0, 0],
        totals: [
          {
            size: 85,
          },
        ],
      },
    },
  ],
};

/** 3SAT to 0-1 Integer Programming (KarpIntProgStandard), 3SAT's default instance: a Grouped Graph becomes a Table (a matrix). Each variable becomes a column and its x = cell, each clause a row (an or-gadget) and each literal a coefficient cell. The whole run, 14 frames. */
export const SAT3_TO_ILP_VIEW = {
  type: "Reduction",
  kind: "reduction",
  reduction: "KarpIntProgStandard",
  reductionName: "Karp's 0-1 Integer Linear Programming Reduction",
  solver: "0-1 ILP Brute Force",
  source: {
    problem: "3SAT",
    instance: "(x1 | !x2 | x3) & (!x1 | x3 | x1) & (x2 | !x3 | !x1)",
    picture: {
      type: "GroupedGraph",
      payload: {
        kind: "groupedGraph",
        layout: "ring",
        shape: "assignment",
        rule: "satisfiability",
        groups: [
          {
            id: "c0",
            label: "C1",
            members: ["c0-0", "c0-1", "c0-2"],
          },
          {
            id: "c1",
            label: "C2",
            members: ["c1-0", "c1-1", "c1-2"],
          },
          {
            id: "c2",
            label: "C3",
            members: ["c2-0", "c2-1", "c2-2"],
          },
        ],
        nodes: [
          {
            id: "c0-0",
            label: "x1",
            variable: "v:x1",
            positive: true,
            group: "c0",
          },
          {
            id: "c0-1",
            label: "¬x2",
            variable: "v:x2",
            positive: false,
            group: "c0",
          },
          {
            id: "c0-2",
            label: "x3",
            variable: "v:x3",
            positive: true,
            group: "c0",
          },
          {
            id: "c1-0",
            label: "¬x1",
            variable: "v:x1",
            positive: false,
            group: "c1",
          },
          {
            id: "c1-1",
            label: "x3",
            variable: "v:x3",
            positive: true,
            group: "c1",
          },
          {
            id: "c1-2",
            label: "x1",
            variable: "v:x1",
            positive: true,
            group: "c1",
          },
          {
            id: "c2-0",
            label: "x2",
            variable: "v:x2",
            positive: true,
            group: "c2",
          },
          {
            id: "c2-1",
            label: "¬x3",
            variable: "v:x3",
            positive: false,
            group: "c2",
          },
          {
            id: "c2-2",
            label: "¬x1",
            variable: "v:x1",
            positive: false,
            group: "c2",
          },
        ],
        variables: [
          {
            id: "v:x1",
            label: "x1",
          },
          {
            id: "v:x2",
            label: "x2",
          },
          {
            id: "v:x3",
            label: "x3",
          },
        ],
        edges: [
          {
            id: "c0-0~c1-0",
            a: "c0-0",
            b: "c1-0",
          },
          {
            id: "c0-0~c2-2",
            a: "c0-0",
            b: "c2-2",
          },
          {
            id: "c0-1~c2-0",
            a: "c0-1",
            b: "c2-0",
          },
          {
            id: "c0-2~c2-1",
            a: "c0-2",
            b: "c2-1",
          },
          {
            id: "c1-1~c2-1",
            a: "c1-1",
            b: "c2-1",
          },
          {
            id: "c1-2~c2-2",
            a: "c1-2",
            b: "c2-2",
          },
        ],
        clauseEdges: [
          {
            id: "c0-0~c0-1",
            a: "c0-0",
            b: "c0-1",
          },
          {
            id: "c0-0~c0-2",
            a: "c0-0",
            b: "c0-2",
          },
          {
            id: "c0-1~c0-2",
            a: "c0-1",
            b: "c0-2",
          },
          {
            id: "c1-0~c1-1",
            a: "c1-0",
            b: "c1-1",
          },
          {
            id: "c1-0~c1-2",
            a: "c1-0",
            b: "c1-2",
          },
          {
            id: "c1-1~c1-2",
            a: "c1-1",
            b: "c1-2",
          },
          {
            id: "c2-0~c2-1",
            a: "c2-0",
            b: "c2-1",
          },
          {
            id: "c2-0~c2-2",
            a: "c2-0",
            b: "c2-2",
          },
          {
            id: "c2-1~c2-2",
            a: "c2-1",
            b: "c2-2",
          },
        ],
      },
    },
    visualization: "Sat3DefaultVisualization",
  },
  target: {
    problem: "0-1 Integer Linear Programming",
    instance: "(-1 1 -1),(0 0 -1),(1 -1 1)<=(0 0 1)",
    picture: {
      type: "Table",
      payload: {
        kind: "table",
        shape: "matrix",
        columns: [
          {
            id: "c0",
            label: "x1",
            key: "x1",
          },
          {
            id: "c1",
            label: "x2",
            key: "x2",
          },
          {
            id: "c2",
            label: "x3",
            key: "x3",
          },
          {
            id: "c3",
            label: "Total",
            key: "total",
          },
          {
            id: "c4",
            label: "Bound",
            key: "bound",
          },
          {
            id: "c5",
            label: "Holds?",
            key: "holds",
          },
        ],
        rows: [
          {
            id: "r0",
            label: "x =",
          },
          {
            id: "r1",
            label: "row 1",
          },
          {
            id: "r2",
            label: "row 2",
          },
          {
            id: "r3",
            label: "row 3",
          },
        ],
        blank: {
          values: [
            ["?", "?", "?", null, null, null],
            ["-1", "1", "-1", null, "0", null],
            ["0", "0", "-1", null, "0", null],
            ["1", "-1", "1", null, "1", null],
          ],
        },
      },
    },
    buildOrder: {
      nodes: ["r0", "c3", "c4", "c5", "c0", "c1", "c2", "r1", "r2", "r3"],
      edges: [],
    },
    buildReveal: "pieces",
    visualization: "IntProgrammingVisualization",
  },
  gadgets: [
    {
      gadgetKind: "element",
      sourceIds: ["v:x1", "c0-0", "c1-0", "c1-2", "c2-2"],
      targetIds: ["c0", "r0c0"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["v:x2", "c0-1", "c2-0"],
      targetIds: ["c1", "r0c1"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["v:x3", "c0-2", "c1-1", "c2-1"],
      targetIds: ["c2", "r0c2"],
    },
    {
      gadgetKind: "orGadget",
      sourceIds: ["c0", "c0-0", "c0-1", "c0-2"],
      targetIds: ["r1"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c0-0"],
      targetIds: ["r1c0"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c0-1"],
      targetIds: ["r1c1"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c0-2"],
      targetIds: ["r1c2"],
    },
    {
      gadgetKind: "bound",
      sourceIds: ["c0"],
      targetIds: ["r1c4"],
      note: "Bound 0: the number of negated literals minus 1.",
    },
    {
      gadgetKind: "orGadget",
      sourceIds: ["c1", "c1-0", "c1-1", "c1-2"],
      targetIds: ["r2"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c1-0"],
      targetIds: ["r2c0"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c1-1"],
      targetIds: ["r2c2"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c1-2"],
      targetIds: ["r2c0"],
    },
    {
      gadgetKind: "bound",
      sourceIds: ["c1"],
      targetIds: ["r2c4"],
      note: "Bound 0: the number of negated literals minus 1.",
    },
    {
      gadgetKind: "orGadget",
      sourceIds: ["c2", "c2-0", "c2-1", "c2-2"],
      targetIds: ["r3"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c2-0"],
      targetIds: ["r3c1"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c2-1"],
      targetIds: ["r3c2"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c2-2"],
      targetIds: ["r3c0"],
    },
    {
      gadgetKind: "bound",
      sourceIds: ["c2"],
      targetIds: ["r3c4"],
      note: "Bound 1: the number of negated literals minus 1.",
    },
  ],
  frames: [
    {
      phase: "build",
      event: "Accept",
      caption:
        "The 0-1 program is a table: the row x = holds one 0-1 value per variable, and each constraint row gets its total, its bound and whether it holds.",
      step: 0,
      sourceFocus: [],
      targetFocus: ["r0"],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        values: [
          ["?", "?", "?", null, null, null],
          ["-1", "1", "-1", null, "0", null],
          ["0", "0", "-1", null, "0", null],
          ["1", "-1", "1", null, "1", null],
        ],
        rows: {
          r0: {
            state: "ElementHighlight",
          },
        },
        cells: {},
        changed: [],
        builtNodes: 4,
        builtEdges: 0,
      },
    },
    {
      phase: "build",
      event: "Accept",
      caption: "Variable x1 becomes the 0-1 variable x1: 1 means x1 is True, 0 means False.",
      step: 1,
      sourceFocus: ["v:x1"],
      targetFocus: ["r0c0"],
      source: {
        nodes: {
          "c0-0": {
            state: "ElementHighlight",
          },
          "c1-0": {
            state: "ElementHighlight",
          },
          "c1-2": {
            state: "ElementHighlight",
          },
          "c2-2": {
            state: "ElementHighlight",
          },
        },
        groups: {},
        assignment: {},
      },
      target: {
        values: [
          ["?", "?", "?", null, null, null],
          ["-1", "1", "-1", null, "0", null],
          ["0", "0", "-1", null, "0", null],
          ["1", "-1", "1", null, "1", null],
        ],
        rows: {},
        cells: {
          r0c0: {
            state: "ElementHighlight",
          },
        },
        changed: [],
        builtNodes: 5,
        builtEdges: 0,
      },
      gadgets: [0],
    },
    {
      phase: "build",
      event: "Accept",
      caption: "Variable x2 becomes the 0-1 variable x2: 1 means x2 is True, 0 means False.",
      step: 2,
      sourceFocus: ["v:x2"],
      targetFocus: ["r0c1"],
      source: {
        nodes: {
          "c0-1": {
            state: "ElementHighlight",
          },
          "c2-0": {
            state: "ElementHighlight",
          },
        },
        groups: {},
        assignment: {},
      },
      target: {
        values: [
          ["?", "?", "?", null, null, null],
          ["-1", "1", "-1", null, "0", null],
          ["0", "0", "-1", null, "0", null],
          ["1", "-1", "1", null, "1", null],
        ],
        rows: {},
        cells: {
          r0c1: {
            state: "ElementHighlight",
          },
        },
        changed: [],
        builtNodes: 6,
        builtEdges: 0,
      },
      gadgets: [1],
    },
    {
      phase: "build",
      event: "Accept",
      caption: "Variable x3 becomes the 0-1 variable x3: 1 means x3 is True, 0 means False.",
      step: 3,
      sourceFocus: ["v:x3"],
      targetFocus: ["r0c2"],
      source: {
        nodes: {
          "c0-2": {
            state: "ElementHighlight",
          },
          "c1-1": {
            state: "ElementHighlight",
          },
          "c2-1": {
            state: "ElementHighlight",
          },
        },
        groups: {},
        assignment: {},
      },
      target: {
        values: [
          ["?", "?", "?", null, null, null],
          ["-1", "1", "-1", null, "0", null],
          ["0", "0", "-1", null, "0", null],
          ["1", "-1", "1", null, "1", null],
        ],
        rows: {},
        cells: {
          r0c2: {
            state: "ElementHighlight",
          },
        },
        changed: [],
        builtNodes: 7,
        builtEdges: 0,
      },
      gadgets: [2],
    },
    {
      phase: "build",
      event: "Accept",
      caption:
        "Clause C1 (x1 | !x2 | x3) becomes row 1: −x1 + x2 − x3 ≤ 0. Each plain literal counts −1 and each negated one +1, and the bound is the number of negated literals minus 1, so the row holds exactly when one of its literals is true.",
      step: 4,
      sourceFocus: ["c0", "c0-0", "c0-1", "c0-2"],
      targetFocus: ["r1"],
      source: {
        nodes: {
          "c0-0": {
            state: "ElementHighlight",
          },
          "c0-1": {
            state: "ElementHighlight",
          },
          "c0-2": {
            state: "ElementHighlight",
          },
        },
        groups: {
          c0: {
            state: "ElementHighlight",
          },
        },
        assignment: {},
      },
      target: {
        values: [
          ["?", "?", "?", null, null, null],
          ["-1", "1", "-1", null, "0", null],
          ["0", "0", "-1", null, "0", null],
          ["1", "-1", "1", null, "1", null],
        ],
        rows: {
          r1: {
            state: "ElementHighlight",
          },
        },
        cells: {},
        changed: [],
        builtNodes: 8,
        builtEdges: 0,
      },
      gadgets: [3, 4, 5, 6, 7],
    },
    {
      phase: "build",
      event: "Accept",
      caption:
        "Clause C2 (!x1 | x3 | x1) becomes row 2: −x3 ≤ 0. Each plain literal counts −1 and each negated one +1, and the bound is the number of negated literals minus 1, so the row holds exactly when one of its literals is true. A variable written both ways cancels out, so this row always holds.",
      step: 5,
      sourceFocus: ["c1", "c1-0", "c1-1", "c1-2"],
      targetFocus: ["r2"],
      source: {
        nodes: {
          "c1-0": {
            state: "ElementHighlight",
          },
          "c1-1": {
            state: "ElementHighlight",
          },
          "c1-2": {
            state: "ElementHighlight",
          },
        },
        groups: {
          c1: {
            state: "ElementHighlight",
          },
        },
        assignment: {},
      },
      target: {
        values: [
          ["?", "?", "?", null, null, null],
          ["-1", "1", "-1", null, "0", null],
          ["0", "0", "-1", null, "0", null],
          ["1", "-1", "1", null, "1", null],
        ],
        rows: {
          r2: {
            state: "ElementHighlight",
          },
        },
        cells: {},
        changed: [],
        builtNodes: 9,
        builtEdges: 0,
      },
      gadgets: [8, 9, 10, 11, 12],
    },
    {
      phase: "build",
      event: "Accept",
      caption:
        "Clause C3 (x2 | !x3 | !x1) becomes row 3: x1 − x2 + x3 ≤ 1. Each plain literal counts −1 and each negated one +1, and the bound is the number of negated literals minus 1, so the row holds exactly when one of its literals is true.",
      step: 6,
      sourceFocus: ["c2", "c2-0", "c2-1", "c2-2"],
      targetFocus: ["r3"],
      source: {
        nodes: {
          "c2-0": {
            state: "ElementHighlight",
          },
          "c2-1": {
            state: "ElementHighlight",
          },
          "c2-2": {
            state: "ElementHighlight",
          },
        },
        groups: {
          c2: {
            state: "ElementHighlight",
          },
        },
        assignment: {},
      },
      target: {
        values: [
          ["?", "?", "?", null, null, null],
          ["-1", "1", "-1", null, "0", null],
          ["0", "0", "-1", null, "0", null],
          ["1", "-1", "1", null, "1", null],
        ],
        rows: {
          r3: {
            state: "ElementHighlight",
          },
        },
        cells: {},
        changed: [],
        builtNodes: 10,
        builtEdges: 0,
      },
      gadgets: [13, 14, 15, 16, 17],
    },
    {
      phase: "build",
      event: "Accept",
      caption:
        "The 0-1 program has 3 constraints and 3 variables: some 0-1 assignment meets them all exactly when the formula can be satisfied.",
      step: 7,
      sourceFocus: [],
      targetFocus: [],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        values: [
          ["?", "?", "?", null, null, null],
          ["-1", "1", "-1", null, "0", null],
          ["0", "0", "-1", null, "0", null],
          ["1", "-1", "1", null, "1", null],
        ],
        rows: {},
        cells: {},
        changed: [],
        builtNodes: 10,
        builtEdges: 0,
      },
    },
    {
      phase: "solve",
      event: "Accept",
      caption: "Try (0 0 0): every row stays within its bound.",
      step: 0,
      sourceFocus: [],
      targetFocus: [],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        values: [
          ["0", "0", "0", null, null, null],
          ["-1", "1", "-1", "0", "0", "yes"],
          ["0", "0", "-1", "0", "0", "yes"],
          ["1", "-1", "1", "0", "1", "yes"],
        ],
        rows: {
          r1: {
            state: "Solution",
          },
          r2: {
            state: "Solution",
          },
          r3: {
            state: "Solution",
          },
        },
        cells: {
          r0c0: {
            state: "Solution",
          },
          r0c1: {
            state: "Solution",
          },
          r0c2: {
            state: "Solution",
          },
        },
        changed: [],
      },
    },
    {
      phase: "solve",
      event: "Accept",
      caption: "(0 0 0) satisfies every row, found on try 1 of 8.",
      step: 1,
      sourceFocus: [],
      targetFocus: [],
      source: {
        nodes: {},
        groups: {},
        assignment: {},
      },
      target: {
        values: [
          ["0", "0", "0", null, null, null],
          ["-1", "1", "-1", "0", "0", "yes"],
          ["0", "0", "-1", "0", "0", "yes"],
          ["1", "-1", "1", "0", "1", "yes"],
        ],
        rows: {
          r1: {
            state: "Solution",
          },
          r2: {
            state: "Solution",
          },
          r3: {
            state: "Solution",
          },
        },
        cells: {
          r0c0: {
            state: "Solution",
          },
          r0c1: {
            state: "Solution",
          },
          r0c2: {
            state: "Solution",
          },
        },
        changed: [],
      },
    },
    {
      phase: "map",
      event: "Accept",
      caption: "x1 = 0, so x1 = False.",
      step: 0,
      sourceFocus: ["v:x1", "c0-0", "c1-0", "c1-2", "c2-2"],
      targetFocus: ["r0c0"],
      source: {
        nodes: {
          "c0-0": {
            state: "False",
          },
          "c1-0": {
            state: "ElementHighlight",
          },
          "c1-2": {
            state: "False",
          },
          "c2-2": {
            state: "ElementHighlight",
          },
        },
        groups: {
          c1: {
            state: "Covered",
          },
          c2: {
            state: "Covered",
          },
        },
        assignment: {
          "v:x1": false,
        },
      },
      target: {
        values: [
          ["0", "0", "0", null, null, null],
          ["-1", "1", "-1", "0", "0", "yes"],
          ["0", "0", "-1", "0", "0", "yes"],
          ["1", "-1", "1", "0", "1", "yes"],
        ],
        rows: {
          r1: {
            state: "Solution",
          },
          r2: {
            state: "Solution",
          },
          r3: {
            state: "Solution",
          },
        },
        cells: {
          r0c0: {
            state: "ElementHighlight",
          },
          r0c1: {
            state: "Solution",
          },
          r0c2: {
            state: "Solution",
          },
        },
        changed: [],
      },
    },
    {
      phase: "map",
      event: "Accept",
      caption: "x2 = 0, so x2 = False.",
      step: 1,
      sourceFocus: ["v:x2", "c0-1", "c2-0"],
      targetFocus: ["r0c1"],
      source: {
        nodes: {
          "c0-0": {
            state: "False",
          },
          "c0-1": {
            state: "ElementHighlight",
          },
          "c1-0": {
            state: "Committed",
          },
          "c1-2": {
            state: "False",
          },
          "c2-0": {
            state: "False",
          },
          "c2-2": {
            state: "Committed",
          },
        },
        groups: {
          c0: {
            state: "Covered",
          },
          c1: {
            state: "Covered",
          },
          c2: {
            state: "Covered",
          },
        },
        assignment: {
          "v:x1": false,
          "v:x2": false,
        },
      },
      target: {
        values: [
          ["0", "0", "0", null, null, null],
          ["-1", "1", "-1", "0", "0", "yes"],
          ["0", "0", "-1", "0", "0", "yes"],
          ["1", "-1", "1", "0", "1", "yes"],
        ],
        rows: {
          r1: {
            state: "Solution",
          },
          r2: {
            state: "Solution",
          },
          r3: {
            state: "Solution",
          },
        },
        cells: {
          r0c0: {
            state: "Solution",
          },
          r0c1: {
            state: "ElementHighlight",
          },
          r0c2: {
            state: "Solution",
          },
        },
        changed: [],
      },
    },
    {
      phase: "map",
      event: "Accept",
      caption: "x3 = 0, so x3 = False.",
      step: 2,
      sourceFocus: ["v:x3", "c0-2", "c1-1", "c2-1"],
      targetFocus: ["r0c2"],
      source: {
        nodes: {
          "c0-0": {
            state: "False",
          },
          "c0-1": {
            state: "Solution",
          },
          "c0-2": {
            state: "False",
          },
          "c1-0": {
            state: "Solution",
          },
          "c1-1": {
            state: "False",
          },
          "c1-2": {
            state: "False",
          },
          "c2-0": {
            state: "False",
          },
          "c2-1": {
            state: "ElementHighlight",
          },
          "c2-2": {
            state: "Solution",
          },
        },
        groups: {
          c0: {
            state: "Covered",
          },
          c1: {
            state: "Covered",
          },
          c2: {
            state: "Covered",
          },
        },
        assignment: {
          "v:x1": false,
          "v:x2": false,
          "v:x3": false,
        },
      },
      target: {
        values: [
          ["0", "0", "0", null, null, null],
          ["-1", "1", "-1", "0", "0", "yes"],
          ["0", "0", "-1", "0", "0", "yes"],
          ["1", "-1", "1", "0", "1", "yes"],
        ],
        rows: {
          r1: {
            state: "Solution",
          },
          r2: {
            state: "Solution",
          },
          r3: {
            state: "Solution",
          },
        },
        cells: {
          r0c0: {
            state: "Solution",
          },
          r0c1: {
            state: "Solution",
          },
          r0c2: {
            state: "ElementHighlight",
          },
        },
        changed: [],
      },
    },
    {
      phase: "map",
      event: "Done",
      caption: "(x1:False,x2:False,x3:False) is a valid 3SAT answer.",
      step: 3,
      ok: true,
      sourceFocus: [],
      targetFocus: [],
      source: {
        nodes: {
          "c0-0": {
            state: "False",
          },
          "c0-1": {
            state: "Solution",
          },
          "c0-2": {
            state: "False",
          },
          "c1-0": {
            state: "Solution",
          },
          "c1-1": {
            state: "False",
          },
          "c1-2": {
            state: "False",
          },
          "c2-0": {
            state: "False",
          },
          "c2-1": {
            state: "Solution",
          },
          "c2-2": {
            state: "Solution",
          },
        },
        groups: {
          c0: {
            state: "Covered",
          },
          c1: {
            state: "Covered",
          },
          c2: {
            state: "Covered",
          },
        },
        assignment: {
          "v:x1": false,
          "v:x2": false,
          "v:x3": false,
        },
      },
      target: {
        values: [
          ["0", "0", "0", null, null, null],
          ["-1", "1", "-1", "0", "0", "yes"],
          ["0", "0", "-1", "0", "0", "yes"],
          ["1", "-1", "1", "0", "1", "yes"],
        ],
        rows: {
          r1: {
            state: "Solution",
          },
          r2: {
            state: "Solution",
          },
          r3: {
            state: "Solution",
          },
        },
        cells: {
          r0c0: {
            state: "Solution",
          },
          r0c1: {
            state: "Solution",
          },
          r0c2: {
            state: "Solution",
          },
        },
        changed: [],
      },
    },
  ],
};

/** Vertex Cover to Set Cover (KarpVertexCoverToSetCover), Vertex Cover's default instance (({a,b,c,d,e},{{a,b},{a,c},{a,e},{b,e},{c,d}}),3): a Graph becomes a Bipartite Graph. Each node becomes a set and each edge an element; the bound keeps k. The whole run, 27 frames. */
export const VERTEX_COVER_TO_SET_COVER_VIEW = {
  type: "Reduction",
  kind: "reduction",
  reduction: "KarpVertexCoverToSetCover",
  reductionName: "Karp's Set Cover Reduction",
  solver: "Set Cover Brute Force",
  source: {
    problem: "Vertex Cover",
    instance: "(({a,b,c,d,e},{{a,b},{a,c},{a,e},{b,e},{c,d}}),3)",
    picture: {
      type: "Graph",
      payload: {
        kind: "graph",
        subtype: "undirected",
        layout: "force",
        nodes: [
          {
            id: "a",
            label: "a",
          },
          {
            id: "b",
            label: "b",
          },
          {
            id: "c",
            label: "c",
          },
          {
            id: "d",
            label: "d",
          },
          {
            id: "e",
            label: "e",
          },
        ],
        edges: [
          {
            id: "a-b",
            a: "a",
            b: "b",
          },
          {
            id: "a-c",
            a: "a",
            b: "c",
          },
          {
            id: "a-e",
            a: "a",
            b: "e",
          },
          {
            id: "b-e",
            a: "b",
            b: "e",
          },
          {
            id: "c-d",
            a: "c",
            b: "d",
          },
        ],
        shape: "subset",
        rule: "vertexCover",
        k: 3,
      },
    },
    visualization: "VertexCoverDefaultVisualization",
  },
  target: {
    problem: "Set Cover",
    instance: "({a_b,a_c,a_e,b_e,c_d},{{a_b,a_c,a_e},{a_b,b_e},{a_c,c_d},{c_d},{a_e,b_e}},3)",
    picture: {
      type: "BipartiteGraph",
      payload: {
        kind: "bipartiteGraph",
        layout: "columns",
        pickSide: "sets",
        rule: "atLeastOnce",
        elements: [
          {
            id: "e:a_b",
            label: "a_b",
          },
          {
            id: "e:a_c",
            label: "a_c",
          },
          {
            id: "e:a_e",
            label: "a_e",
          },
          {
            id: "e:b_e",
            label: "b_e",
          },
          {
            id: "e:c_d",
            label: "c_d",
          },
        ],
        sets: [
          {
            id: "S1",
            label: "S1",
            members: ["e:a_b", "e:a_c", "e:a_e"],
          },
          {
            id: "S2",
            label: "S2",
            members: ["e:a_b", "e:b_e"],
          },
          {
            id: "S3",
            label: "S3",
            members: ["e:a_c", "e:c_d"],
          },
          {
            id: "S4",
            label: "S4",
            members: ["e:c_d"],
          },
          {
            id: "S5",
            label: "S5",
            members: ["e:a_e", "e:b_e"],
          },
        ],
        edges: [
          {
            id: "e:a_b~S1",
            a: "e:a_b",
            b: "S1",
          },
          {
            id: "e:a_c~S1",
            a: "e:a_c",
            b: "S1",
          },
          {
            id: "e:a_e~S1",
            a: "e:a_e",
            b: "S1",
          },
          {
            id: "e:a_b~S2",
            a: "e:a_b",
            b: "S2",
          },
          {
            id: "e:b_e~S2",
            a: "e:b_e",
            b: "S2",
          },
          {
            id: "e:a_c~S3",
            a: "e:a_c",
            b: "S3",
          },
          {
            id: "e:c_d~S3",
            a: "e:c_d",
            b: "S3",
          },
          {
            id: "e:c_d~S4",
            a: "e:c_d",
            b: "S4",
          },
          {
            id: "e:a_e~S5",
            a: "e:a_e",
            b: "S5",
          },
          {
            id: "e:b_e~S5",
            a: "e:b_e",
            b: "S5",
          },
        ],
        k: 3,
      },
    },
    buildOrder: {
      nodes: ["e:a_b", "e:a_c", "e:a_e", "S1", "e:b_e", "S2", "e:c_d", "S3", "S4", "S5"],
      edges: [
        "e:a_b~S1",
        "e:a_c~S1",
        "e:a_e~S1",
        "e:a_b~S2",
        "e:b_e~S2",
        "e:a_c~S3",
        "e:c_d~S3",
        "e:c_d~S4",
        "e:a_e~S5",
        "e:b_e~S5",
      ],
    },
    buildReveal: "pieces",
    visualization: "SetCoverDefaultVisualization",
  },
  gadgets: [
    {
      gadgetKind: "element",
      sourceIds: ["a"],
      targetIds: ["S1"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["a-b"],
      targetIds: ["e:a_b"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["a-c"],
      targetIds: ["e:a_c"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["a-e"],
      targetIds: ["e:a_e"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["b"],
      targetIds: ["S2"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["b-e"],
      targetIds: ["e:b_e"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c"],
      targetIds: ["S3"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["c-d"],
      targetIds: ["e:c_d"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["d"],
      targetIds: ["S4"],
    },
    {
      gadgetKind: "element",
      sourceIds: ["e"],
      targetIds: ["S5"],
    },
    {
      gadgetKind: "bound",
      sourceIds: [],
      targetIds: [],
      note: "K stays 3",
    },
  ],
  frames: [
    {
      phase: "build",
      event: "Accept",
      caption:
        "Node a becomes set S1, the edges it touches: {a_b,a_c,a_e}. Edges {a,b}, {a,c}, {a,e} are new, so they join the elements to cover.",
      step: 0,
      sourceFocus: ["a", "a-b", "a-c", "a-e"],
      targetFocus: ["e:a_b", "e:a_c", "e:a_e", "S1", "e:a_b~S1", "e:a_c~S1", "e:a_e~S1"],
      source: {
        nodes: {
          a: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "a-b": {
            state: "ElementHighlight",
          },
          "a-c": {
            state: "ElementHighlight",
          },
          "a-e": {
            state: "ElementHighlight",
          },
        },
        phantoms: [],
      },
      target: {
        nodes: {
          S1: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "ElementHighlight",
          },
          "e:a_c": {
            state: "ElementHighlight",
          },
          "e:a_e": {
            state: "ElementHighlight",
          },
        },
        edges: {
          "e:a_b~S1": {
            state: "ElementHighlight",
          },
          "e:a_c~S1": {
            state: "ElementHighlight",
          },
          "e:a_e~S1": {
            state: "ElementHighlight",
          },
        },
        hits: {},
        builtNodes: 4,
        builtEdges: 3,
      },
      gadgets: [0, 1, 2, 3],
    },
    {
      phase: "build",
      event: "Accept",
      caption:
        "Node b becomes set S2, the edges it touches: {a_b,b_e}. Edge {b,e} is new, so it joins the elements to cover.",
      step: 1,
      sourceFocus: ["b", "b-e"],
      targetFocus: ["e:a_b", "e:b_e", "S2", "e:a_b~S2", "e:b_e~S2"],
      source: {
        nodes: {
          b: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "b-e": {
            state: "ElementHighlight",
          },
        },
        phantoms: [],
      },
      target: {
        nodes: {
          S2: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "ElementHighlight",
          },
          "e:b_e": {
            state: "ElementHighlight",
          },
        },
        edges: {
          "e:a_b~S2": {
            state: "ElementHighlight",
          },
          "e:b_e~S2": {
            state: "ElementHighlight",
          },
        },
        hits: {},
        builtNodes: 6,
        builtEdges: 5,
      },
      gadgets: [4, 5],
    },
    {
      phase: "build",
      event: "Accept",
      caption:
        "Node c becomes set S3, the edges it touches: {a_c,c_d}. Edge {c,d} is new, so it joins the elements to cover.",
      step: 2,
      sourceFocus: ["c", "c-d"],
      targetFocus: ["e:a_c", "e:c_d", "S3", "e:a_c~S3", "e:c_d~S3"],
      source: {
        nodes: {
          c: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "c-d": {
            state: "ElementHighlight",
          },
        },
        phantoms: [],
      },
      target: {
        nodes: {
          S3: {
            state: "ElementHighlight",
          },
          "e:a_c": {
            state: "ElementHighlight",
          },
          "e:c_d": {
            state: "ElementHighlight",
          },
        },
        edges: {
          "e:a_c~S3": {
            state: "ElementHighlight",
          },
          "e:c_d~S3": {
            state: "ElementHighlight",
          },
        },
        hits: {},
        builtNodes: 8,
        builtEdges: 7,
      },
      gadgets: [6, 7],
    },
    {
      phase: "build",
      event: "Accept",
      caption: "Node d becomes set S4, the edges it touches: {c_d}.",
      step: 3,
      sourceFocus: ["d"],
      targetFocus: ["e:c_d", "S4", "e:c_d~S4"],
      source: {
        nodes: {
          d: {
            state: "ElementHighlight",
          },
        },
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S4: {
            state: "ElementHighlight",
          },
          "e:c_d": {
            state: "ElementHighlight",
          },
        },
        edges: {
          "e:c_d~S4": {
            state: "ElementHighlight",
          },
        },
        hits: {},
        builtNodes: 9,
        builtEdges: 8,
      },
      gadgets: [8],
    },
    {
      phase: "build",
      event: "Accept",
      caption: "Node e becomes set S5, the edges it touches: {a_e,b_e}.",
      step: 4,
      sourceFocus: ["e"],
      targetFocus: ["e:a_e", "e:b_e", "S5", "e:a_e~S5", "e:b_e~S5"],
      source: {
        nodes: {
          e: {
            state: "ElementHighlight",
          },
        },
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S5: {
            state: "ElementHighlight",
          },
          "e:a_e": {
            state: "ElementHighlight",
          },
          "e:b_e": {
            state: "ElementHighlight",
          },
        },
        edges: {
          "e:a_e~S5": {
            state: "ElementHighlight",
          },
          "e:b_e~S5": {
            state: "ElementHighlight",
          },
        },
        hits: {},
        builtNodes: 10,
        builtEdges: 10,
      },
      gadgets: [9],
    },
    {
      phase: "build",
      event: "Accept",
      caption:
        "K stays 3: at most 3 sets can cover every element exactly when at most 3 nodes can touch every edge.",
      step: 5,
      sourceFocus: [],
      targetFocus: [],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {},
        edges: {},
        hits: {},
        builtNodes: 10,
        builtEdges: 10,
      },
      bound: 3,
      gadgets: [10],
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {S1}: b_e and c_d aren't covered.",
      step: 0,
      sourceFocus: [],
      targetFocus: ["S1"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S1: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Covered",
          },
          "e:a_c": {
            state: "Covered",
          },
          "e:a_e": {
            state: "Covered",
          },
          "e:b_e": {
            state: "Rejected",
          },
          "e:c_d": {
            state: "Rejected",
          },
        },
        edges: {
          "e:a_b~S1": {
            state: "ElementHighlight",
          },
          "e:a_c~S1": {
            state: "ElementHighlight",
          },
          "e:a_e~S1": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_b": 1,
          "e:a_c": 1,
          "e:a_e": 1,
        },
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {S2}: a_c, a_e and c_d aren't covered.",
      step: 1,
      sourceFocus: [],
      targetFocus: ["S2"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S2: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Covered",
          },
          "e:a_c": {
            state: "Rejected",
          },
          "e:a_e": {
            state: "Rejected",
          },
          "e:b_e": {
            state: "Covered",
          },
          "e:c_d": {
            state: "Rejected",
          },
        },
        edges: {
          "e:a_b~S2": {
            state: "ElementHighlight",
          },
          "e:b_e~S2": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_b": 1,
          "e:b_e": 1,
        },
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {S3}: a_b, a_e and b_e aren't covered.",
      step: 2,
      sourceFocus: [],
      targetFocus: ["S3"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S3: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Rejected",
          },
          "e:a_c": {
            state: "Covered",
          },
          "e:a_e": {
            state: "Rejected",
          },
          "e:b_e": {
            state: "Rejected",
          },
          "e:c_d": {
            state: "Covered",
          },
        },
        edges: {
          "e:a_c~S3": {
            state: "ElementHighlight",
          },
          "e:c_d~S3": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_c": 1,
          "e:c_d": 1,
        },
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {S4}: a_b, a_c, a_e and b_e aren't covered.",
      step: 3,
      sourceFocus: [],
      targetFocus: ["S4"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S4: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Rejected",
          },
          "e:a_c": {
            state: "Rejected",
          },
          "e:a_e": {
            state: "Rejected",
          },
          "e:b_e": {
            state: "Rejected",
          },
          "e:c_d": {
            state: "Covered",
          },
        },
        edges: {
          "e:c_d~S4": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:c_d": 1,
        },
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {S5}: a_b, a_c and c_d aren't covered.",
      step: 4,
      sourceFocus: [],
      targetFocus: ["S5"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S5: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Rejected",
          },
          "e:a_c": {
            state: "Rejected",
          },
          "e:a_e": {
            state: "Covered",
          },
          "e:b_e": {
            state: "Covered",
          },
          "e:c_d": {
            state: "Rejected",
          },
        },
        edges: {
          "e:a_e~S5": {
            state: "ElementHighlight",
          },
          "e:b_e~S5": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_e": 1,
          "e:b_e": 1,
        },
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {S1,S2}: c_d isn't covered.",
      step: 5,
      sourceFocus: [],
      targetFocus: ["S1", "S2"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S1: {
            state: "ElementHighlight",
          },
          S2: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Covered",
          },
          "e:a_c": {
            state: "Covered",
          },
          "e:a_e": {
            state: "Covered",
          },
          "e:b_e": {
            state: "Covered",
          },
          "e:c_d": {
            state: "Rejected",
          },
        },
        edges: {
          "e:a_b~S1": {
            state: "ElementHighlight",
          },
          "e:a_b~S2": {
            state: "ElementHighlight",
          },
          "e:a_c~S1": {
            state: "ElementHighlight",
          },
          "e:a_e~S1": {
            state: "ElementHighlight",
          },
          "e:b_e~S2": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_b": 2,
          "e:a_c": 1,
          "e:a_e": 1,
          "e:b_e": 1,
        },
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {S1,S3}: b_e isn't covered.",
      step: 6,
      sourceFocus: [],
      targetFocus: ["S1", "S3"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S1: {
            state: "ElementHighlight",
          },
          S3: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Covered",
          },
          "e:a_c": {
            state: "Covered",
          },
          "e:a_e": {
            state: "Covered",
          },
          "e:b_e": {
            state: "Rejected",
          },
          "e:c_d": {
            state: "Covered",
          },
        },
        edges: {
          "e:a_b~S1": {
            state: "ElementHighlight",
          },
          "e:a_c~S1": {
            state: "ElementHighlight",
          },
          "e:a_c~S3": {
            state: "ElementHighlight",
          },
          "e:a_e~S1": {
            state: "ElementHighlight",
          },
          "e:c_d~S3": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_b": 1,
          "e:a_c": 2,
          "e:a_e": 1,
          "e:c_d": 1,
        },
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {S1,S4}: b_e isn't covered.",
      step: 7,
      sourceFocus: [],
      targetFocus: ["S1", "S4"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S1: {
            state: "ElementHighlight",
          },
          S4: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Covered",
          },
          "e:a_c": {
            state: "Covered",
          },
          "e:a_e": {
            state: "Covered",
          },
          "e:b_e": {
            state: "Rejected",
          },
          "e:c_d": {
            state: "Covered",
          },
        },
        edges: {
          "e:a_b~S1": {
            state: "ElementHighlight",
          },
          "e:a_c~S1": {
            state: "ElementHighlight",
          },
          "e:a_e~S1": {
            state: "ElementHighlight",
          },
          "e:c_d~S4": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_b": 1,
          "e:a_c": 1,
          "e:a_e": 1,
          "e:c_d": 1,
        },
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {S1,S5}: c_d isn't covered.",
      step: 8,
      sourceFocus: [],
      targetFocus: ["S1", "S5"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S1: {
            state: "ElementHighlight",
          },
          S5: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Covered",
          },
          "e:a_c": {
            state: "Covered",
          },
          "e:a_e": {
            state: "Covered",
          },
          "e:b_e": {
            state: "Covered",
          },
          "e:c_d": {
            state: "Rejected",
          },
        },
        edges: {
          "e:a_b~S1": {
            state: "ElementHighlight",
          },
          "e:a_c~S1": {
            state: "ElementHighlight",
          },
          "e:a_e~S1": {
            state: "ElementHighlight",
          },
          "e:a_e~S5": {
            state: "ElementHighlight",
          },
          "e:b_e~S5": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_b": 1,
          "e:a_c": 1,
          "e:a_e": 2,
          "e:b_e": 1,
        },
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {S2,S3}: a_e isn't covered.",
      step: 9,
      sourceFocus: [],
      targetFocus: ["S2", "S3"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S2: {
            state: "ElementHighlight",
          },
          S3: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Covered",
          },
          "e:a_c": {
            state: "Covered",
          },
          "e:a_e": {
            state: "Rejected",
          },
          "e:b_e": {
            state: "Covered",
          },
          "e:c_d": {
            state: "Covered",
          },
        },
        edges: {
          "e:a_b~S2": {
            state: "ElementHighlight",
          },
          "e:a_c~S3": {
            state: "ElementHighlight",
          },
          "e:b_e~S2": {
            state: "ElementHighlight",
          },
          "e:c_d~S3": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_b": 1,
          "e:a_c": 1,
          "e:b_e": 1,
          "e:c_d": 1,
        },
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {S2,S4}: a_c and a_e aren't covered.",
      step: 10,
      sourceFocus: [],
      targetFocus: ["S2", "S4"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S2: {
            state: "ElementHighlight",
          },
          S4: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Covered",
          },
          "e:a_c": {
            state: "Rejected",
          },
          "e:a_e": {
            state: "Rejected",
          },
          "e:b_e": {
            state: "Covered",
          },
          "e:c_d": {
            state: "Covered",
          },
        },
        edges: {
          "e:a_b~S2": {
            state: "ElementHighlight",
          },
          "e:b_e~S2": {
            state: "ElementHighlight",
          },
          "e:c_d~S4": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_b": 1,
          "e:b_e": 1,
          "e:c_d": 1,
        },
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {S2,S5}: a_c and c_d aren't covered.",
      step: 11,
      sourceFocus: [],
      targetFocus: ["S2", "S5"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S2: {
            state: "ElementHighlight",
          },
          S5: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Covered",
          },
          "e:a_c": {
            state: "Rejected",
          },
          "e:a_e": {
            state: "Covered",
          },
          "e:b_e": {
            state: "Covered",
          },
          "e:c_d": {
            state: "Rejected",
          },
        },
        edges: {
          "e:a_b~S2": {
            state: "ElementHighlight",
          },
          "e:a_e~S5": {
            state: "ElementHighlight",
          },
          "e:b_e~S2": {
            state: "ElementHighlight",
          },
          "e:b_e~S5": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_b": 1,
          "e:a_e": 1,
          "e:b_e": 2,
        },
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {S3,S4}: a_b, a_e and b_e aren't covered.",
      step: 12,
      sourceFocus: [],
      targetFocus: ["S3", "S4"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S3: {
            state: "ElementHighlight",
          },
          S4: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Rejected",
          },
          "e:a_c": {
            state: "Covered",
          },
          "e:a_e": {
            state: "Rejected",
          },
          "e:b_e": {
            state: "Rejected",
          },
          "e:c_d": {
            state: "Covered",
          },
        },
        edges: {
          "e:a_c~S3": {
            state: "ElementHighlight",
          },
          "e:c_d~S3": {
            state: "ElementHighlight",
          },
          "e:c_d~S4": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_c": 1,
          "e:c_d": 2,
        },
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {S3,S5}: a_b isn't covered.",
      step: 13,
      sourceFocus: [],
      targetFocus: ["S3", "S5"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S3: {
            state: "ElementHighlight",
          },
          S5: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Rejected",
          },
          "e:a_c": {
            state: "Covered",
          },
          "e:a_e": {
            state: "Covered",
          },
          "e:b_e": {
            state: "Covered",
          },
          "e:c_d": {
            state: "Covered",
          },
        },
        edges: {
          "e:a_c~S3": {
            state: "ElementHighlight",
          },
          "e:a_e~S5": {
            state: "ElementHighlight",
          },
          "e:b_e~S5": {
            state: "ElementHighlight",
          },
          "e:c_d~S3": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_c": 1,
          "e:a_e": 1,
          "e:b_e": 1,
          "e:c_d": 1,
        },
      },
    },
    {
      phase: "solve",
      event: "Reject",
      caption: "Try {S4,S5}: a_b and a_c aren't covered.",
      step: 14,
      sourceFocus: [],
      targetFocus: ["S4", "S5"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S4: {
            state: "ElementHighlight",
          },
          S5: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Rejected",
          },
          "e:a_c": {
            state: "Rejected",
          },
          "e:a_e": {
            state: "Covered",
          },
          "e:b_e": {
            state: "Covered",
          },
          "e:c_d": {
            state: "Covered",
          },
        },
        edges: {
          "e:a_e~S5": {
            state: "ElementHighlight",
          },
          "e:b_e~S5": {
            state: "ElementHighlight",
          },
          "e:c_d~S4": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_e": 1,
          "e:b_e": 1,
          "e:c_d": 1,
        },
      },
    },
    {
      phase: "solve",
      event: "Accept",
      caption: "Try {S1,S2,S3}. It covers every element.",
      step: 15,
      sourceFocus: [],
      targetFocus: ["S1", "S2", "S3"],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S1: {
            state: "ElementHighlight",
          },
          S2: {
            state: "ElementHighlight",
          },
          S3: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Covered",
          },
          "e:a_c": {
            state: "Covered",
          },
          "e:a_e": {
            state: "Covered",
          },
          "e:b_e": {
            state: "Covered",
          },
          "e:c_d": {
            state: "Covered",
          },
        },
        edges: {
          "e:a_b~S1": {
            state: "ElementHighlight",
          },
          "e:a_b~S2": {
            state: "ElementHighlight",
          },
          "e:a_c~S1": {
            state: "ElementHighlight",
          },
          "e:a_c~S3": {
            state: "ElementHighlight",
          },
          "e:a_e~S1": {
            state: "ElementHighlight",
          },
          "e:b_e~S2": {
            state: "ElementHighlight",
          },
          "e:c_d~S3": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_b": 2,
          "e:a_c": 2,
          "e:a_e": 1,
          "e:b_e": 1,
          "e:c_d": 1,
        },
      },
    },
    {
      phase: "solve",
      event: "Accept",
      caption:
        "{S1,S2,S3} covers U with 3 sets, found after 16 tries. Smaller combinations were tried first, so no cover uses fewer sets.",
      step: 16,
      sourceFocus: [],
      targetFocus: [],
      source: {
        nodes: {},
        edges: {},
        phantoms: [],
      },
      target: {
        nodes: {
          S1: {
            state: "Solution",
          },
          S2: {
            state: "Solution",
          },
          S3: {
            state: "Solution",
          },
          "e:a_b": {
            state: "Covered",
          },
          "e:a_c": {
            state: "Covered",
          },
          "e:a_e": {
            state: "Covered",
          },
          "e:b_e": {
            state: "Covered",
          },
          "e:c_d": {
            state: "Covered",
          },
        },
        edges: {
          "e:a_b~S1": {
            state: "Solution",
          },
          "e:a_b~S2": {
            state: "Solution",
          },
          "e:a_c~S1": {
            state: "Solution",
          },
          "e:a_c~S3": {
            state: "Solution",
          },
          "e:a_e~S1": {
            state: "Solution",
          },
          "e:b_e~S2": {
            state: "Solution",
          },
          "e:c_d~S3": {
            state: "Solution",
          },
        },
        hits: {
          "e:a_b": 2,
          "e:a_c": 2,
          "e:a_e": 1,
          "e:b_e": 1,
          "e:c_d": 1,
        },
      },
    },
    {
      phase: "map",
      event: "Accept",
      caption:
        "Set S1 {a_b,a_c,a_e} is in the cover. It is node a's set, the edges that touch a, so a is in the vertex cover.",
      step: 0,
      sourceFocus: ["a"],
      targetFocus: ["S1"],
      source: {
        nodes: {
          a: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "a-b": {
            state: "Covered",
          },
          "a-c": {
            state: "Covered",
          },
          "a-e": {
            state: "Covered",
          },
        },
        phantoms: [],
      },
      target: {
        nodes: {
          S1: {
            state: "ElementHighlight",
          },
          S2: {
            state: "Solution",
          },
          S3: {
            state: "Solution",
          },
          "e:a_b": {
            state: "Covered",
          },
          "e:a_c": {
            state: "Covered",
          },
          "e:a_e": {
            state: "Covered",
          },
          "e:b_e": {
            state: "Covered",
          },
          "e:c_d": {
            state: "Covered",
          },
        },
        edges: {
          "e:a_b~S1": {
            state: "ElementHighlight",
          },
          "e:a_b~S2": {
            state: "Solution",
          },
          "e:a_c~S1": {
            state: "ElementHighlight",
          },
          "e:a_c~S3": {
            state: "Solution",
          },
          "e:a_e~S1": {
            state: "ElementHighlight",
          },
          "e:b_e~S2": {
            state: "Solution",
          },
          "e:c_d~S3": {
            state: "Solution",
          },
        },
        hits: {
          "e:a_b": 2,
          "e:a_c": 2,
          "e:a_e": 1,
          "e:b_e": 1,
          "e:c_d": 1,
        },
      },
    },
    {
      phase: "map",
      event: "Accept",
      caption:
        "Set S2 {a_b,b_e} is in the cover. It is node b's set, the edges that touch b, so b is in the vertex cover.",
      step: 1,
      sourceFocus: ["b"],
      targetFocus: ["S2"],
      source: {
        nodes: {
          a: {
            state: "Committed",
          },
          b: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "a-b": {
            state: "Covered",
          },
          "a-c": {
            state: "Covered",
          },
          "a-e": {
            state: "Covered",
          },
          "b-e": {
            state: "Covered",
          },
        },
        phantoms: [],
      },
      target: {
        nodes: {
          S1: {
            state: "Solution",
          },
          S2: {
            state: "ElementHighlight",
          },
          S3: {
            state: "Solution",
          },
          "e:a_b": {
            state: "Covered",
          },
          "e:a_c": {
            state: "Covered",
          },
          "e:a_e": {
            state: "Covered",
          },
          "e:b_e": {
            state: "Covered",
          },
          "e:c_d": {
            state: "Covered",
          },
        },
        edges: {
          "e:a_b~S1": {
            state: "Solution",
          },
          "e:a_b~S2": {
            state: "ElementHighlight",
          },
          "e:a_c~S1": {
            state: "Solution",
          },
          "e:a_c~S3": {
            state: "Solution",
          },
          "e:a_e~S1": {
            state: "Solution",
          },
          "e:b_e~S2": {
            state: "ElementHighlight",
          },
          "e:c_d~S3": {
            state: "Solution",
          },
        },
        hits: {
          "e:a_b": 2,
          "e:a_c": 2,
          "e:a_e": 1,
          "e:b_e": 1,
          "e:c_d": 1,
        },
      },
    },
    {
      phase: "map",
      event: "Accept",
      caption:
        "Set S3 {a_c,c_d} is in the cover. It is node c's set, the edges that touch c, so c is in the vertex cover.",
      step: 2,
      sourceFocus: ["c"],
      targetFocus: ["S3"],
      source: {
        nodes: {
          a: {
            state: "Solution",
          },
          b: {
            state: "Solution",
          },
          c: {
            state: "ElementHighlight",
          },
        },
        edges: {
          "a-b": {
            state: "Covered",
          },
          "a-c": {
            state: "Covered",
          },
          "a-e": {
            state: "Covered",
          },
          "b-e": {
            state: "Covered",
          },
          "c-d": {
            state: "Covered",
          },
        },
        phantoms: [],
      },
      target: {
        nodes: {
          S1: {
            state: "Solution",
          },
          S2: {
            state: "Solution",
          },
          S3: {
            state: "ElementHighlight",
          },
          "e:a_b": {
            state: "Covered",
          },
          "e:a_c": {
            state: "Covered",
          },
          "e:a_e": {
            state: "Covered",
          },
          "e:b_e": {
            state: "Covered",
          },
          "e:c_d": {
            state: "Covered",
          },
        },
        edges: {
          "e:a_b~S1": {
            state: "Solution",
          },
          "e:a_b~S2": {
            state: "Solution",
          },
          "e:a_c~S1": {
            state: "Solution",
          },
          "e:a_c~S3": {
            state: "ElementHighlight",
          },
          "e:a_e~S1": {
            state: "Solution",
          },
          "e:b_e~S2": {
            state: "Solution",
          },
          "e:c_d~S3": {
            state: "ElementHighlight",
          },
        },
        hits: {
          "e:a_b": 2,
          "e:a_c": 2,
          "e:a_e": 1,
          "e:b_e": 1,
          "e:c_d": 1,
        },
      },
    },
    {
      phase: "map",
      event: "Done",
      caption: "{a,b,c} is a valid Vertex Cover answer.",
      step: 3,
      ok: true,
      sourceFocus: [],
      targetFocus: [],
      source: {
        nodes: {
          a: {
            state: "Solution",
          },
          b: {
            state: "Solution",
          },
          c: {
            state: "Solution",
          },
        },
        edges: {
          "a-b": {
            state: "Covered",
          },
          "a-c": {
            state: "Covered",
          },
          "a-e": {
            state: "Covered",
          },
          "b-e": {
            state: "Covered",
          },
          "c-d": {
            state: "Covered",
          },
        },
        phantoms: [],
      },
      target: {
        nodes: {
          S1: {
            state: "Solution",
          },
          S2: {
            state: "Solution",
          },
          S3: {
            state: "Solution",
          },
          "e:a_b": {
            state: "Covered",
          },
          "e:a_c": {
            state: "Covered",
          },
          "e:a_e": {
            state: "Covered",
          },
          "e:b_e": {
            state: "Covered",
          },
          "e:c_d": {
            state: "Covered",
          },
        },
        edges: {
          "e:a_b~S1": {
            state: "Solution",
          },
          "e:a_b~S2": {
            state: "Solution",
          },
          "e:a_c~S1": {
            state: "Solution",
          },
          "e:a_c~S3": {
            state: "Solution",
          },
          "e:a_e~S1": {
            state: "Solution",
          },
          "e:b_e~S2": {
            state: "Solution",
          },
          "e:c_d~S3": {
            state: "Solution",
          },
        },
        hits: {
          "e:a_b": 2,
          "e:a_c": 2,
          "e:a_e": 1,
          "e:b_e": 1,
          "e:c_d": 1,
        },
      },
    },
  ],
};
