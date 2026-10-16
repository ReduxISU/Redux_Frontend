// tests/e2e/picture-payloads.js
//
// #199: ProblemProvider/visualize answers captured from a local build of the full Redux backend
// (local/viz-integration) on 2026-10-14, so tests/e2e/picture-renderers.spec.js can answer the
// picture requests itself and CI needs no backend that serves format=frames.
// DFA Acceptance: the problem's default instance, 3 frames with the DFASolver. The Graph
// pictures (#201), the Bipartite Graph pictures (#203), the Layered Graph pictures (#205), the
// Automaton pictures (#204), the Flow Network pictures (#206) and the Grouped Graph pictures
// (#202) follow at the end, each with its instance and solver. The Packing pictures (#207) and
// the Search Tree pictures (#217) come last, captured the same way on 2026-10-16 (Subset Sum's
// FastApproximation, and the TSP and 3SAT trees, again after Redux #897-#900).

/** format=frames for DFATableVisualization: picture type Table (has a renderer). */
export const DFA_TABLE_FRAMES = {
  type: "Table",
  payload: {
    kind: "table",
    shape: "trace",
    columns: [
      {
        id: "c0",
        label: "Step",
        key: "step",
      },
      {
        id: "c1",
        label: "Read",
        key: "read",
      },
      {
        id: "c2",
        label: "From",
        key: "from",
      },
      {
        id: "c3",
        label: "To",
        key: "to",
      },
      {
        id: "c4",
        label: "Accepting?",
        key: "accepting",
      },
    ],
    rows: [
      {
        id: "r0",
      },
      {
        id: "r1",
      },
    ],
  },
  frames: [
    {
      event: "Try",
      caption: "Start in 1.",
      focus: ["r0"],
      values: [["0", "—", "—", "1", "no"]],
      rows: {
        r0: {
          state: "ElementHighlight",
        },
      },
      cells: {},
      changed: ["r0c3"],
    },
    {
      event: "Try",
      caption: "Read 'a': move from 1 to 2.",
      focus: ["r1"],
      values: [
        ["0", "—", "—", "1", "no"],
        ["1", "a", "1", "2", "yes"],
      ],
      rows: {
        r1: {
          state: "ElementHighlight",
        },
      },
      cells: {},
      changed: ["r1c3"],
    },
    {
      event: "Done",
      caption: "The input is used up in 2, an accept state, so the DFA accepts.",
      focus: [],
      values: [
        ["0", "—", "—", "1", "no"],
        ["1", "a", "1", "2", "yes"],
      ],
      rows: {
        r1: {
          state: "Solution",
        },
      },
      cells: {},
      changed: [],
      ok: true,
    },
  ],
};

/** format=frames for DFAVisualization: picture type Automaton (#204 draws it). */
export const DFA_AUTOMATON_FRAMES = {
  type: "Automaton",
  payload: {
    kind: "dfa",
    layout: "layered",
    states: [
      {
        id: "q:1",
        label: "1",
        layer: 0,
      },
      {
        id: "q:2",
        label: "2",
        layer: 1,
      },
      {
        id: "q:3",
        label: "3",
        layer: 1,
      },
    ],
    start: "q:1",
    accepting: ["q:2"],
    alphabet: ["a", "b"],
    transitions: [
      {
        id: "q:1>q:2",
        a: "q:1",
        b: "q:2",
        label: "a",
        symbols: ["a"],
        epsilon: false,
      },
      {
        id: "q:1>q:3",
        a: "q:1",
        b: "q:3",
        label: "b",
        symbols: ["b"],
        epsilon: false,
      },
      {
        id: "q:2>q:2",
        a: "q:2",
        b: "q:2",
        label: "a,b",
        symbols: ["a", "b"],
        epsilon: false,
      },
      {
        id: "q:3>q:2",
        a: "q:3",
        b: "q:2",
        label: "a",
        symbols: ["a"],
        epsilon: false,
      },
      {
        id: "q:3>q:3",
        a: "q:3",
        b: "q:3",
        label: "b",
        symbols: ["b"],
        epsilon: false,
      },
    ],
    input: ["a"],
  },
  frames: [
    {
      event: "Try",
      caption: "Start in 1.",
      focus: ["q:1"],
      position: 0,
      active: ["q:1"],
      nodes: {
        "q:1": {
          state: "ElementHighlight",
        },
      },
      edges: {},
    },
    {
      event: "Try",
      caption: "Read 'a': move from 1 to 2.",
      focus: ["q:1>q:2"],
      position: 1,
      active: ["q:2"],
      nodes: {
        "q:2": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:1>q:2": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Done",
      caption: "The input is used up in 2, an accept state, so the DFA accepts.",
      focus: [],
      position: 1,
      active: ["q:2"],
      nodes: {
        "q:2": {
          state: "Solution",
        },
        "q:3": {
          state: "Untraveled",
        },
      },
      edges: {},
      ok: true,
    },
  ],
};

/** The old flat list for DFAVisualization (no format parameter). */
export const DFA_AUTOMATON_LIST = [
  {
    kind: "graph",
    nodes: [
      {
        initial: "true",
        accept_state: "",
        name: "1",
        color: "",
        outline: "",
        delay: "",
        dashed: "",
        additional: "",
        id: "1",
      },
      {
        initial: "",
        accept_state: "true",
        name: "2",
        color: "",
        outline: "",
        delay: "",
        dashed: "",
        additional: "",
        id: "2",
      },
      {
        initial: "",
        accept_state: "",
        name: "3",
        color: "",
        outline: "",
        delay: "",
        dashed: "",
        additional: "",
        id: "3",
      },
    ],
    links: [
      {
        source: "1",
        target: "2",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "a",
        weighted: true,
        directed: true,
        id: "1-2",
      },
      {
        source: "1",
        target: "3",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "b",
        weighted: true,
        directed: true,
        id: "1-3",
      },
      {
        source: "2",
        target: "2",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "a,b",
        weighted: true,
        directed: true,
        id: "2-2",
      },
      {
        source: "3",
        target: "2",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "a",
        weighted: true,
        directed: true,
        id: "3-2",
      },
      {
        source: "3",
        target: "3",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "b",
        weighted: true,
        directed: true,
        id: "3-3",
      },
    ],
  },
  {
    kind: "graph",
    nodes: [
      {
        initial: "true",
        accept_state: "",
        name: "1",
        color: "green",
        outline: "",
        delay: "",
        dashed: "",
        additional: "",
        id: "1",
      },
      {
        initial: "",
        accept_state: "true",
        name: "2",
        color: "white",
        outline: "",
        delay: "",
        dashed: "",
        additional: "",
        id: "2",
      },
      {
        initial: "",
        accept_state: "",
        name: "3",
        color: "white",
        outline: "",
        delay: "",
        dashed: "",
        additional: "",
        id: "3",
      },
    ],
    links: [
      {
        source: "1",
        target: "2",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "a",
        weighted: true,
        directed: true,
        id: "1-2",
      },
      {
        source: "1",
        target: "3",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "b",
        weighted: true,
        directed: true,
        id: "1-3",
      },
      {
        source: "2",
        target: "2",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "a,b",
        weighted: true,
        directed: true,
        id: "2-2",
      },
      {
        source: "3",
        target: "2",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "a",
        weighted: true,
        directed: true,
        id: "3-2",
      },
      {
        source: "3",
        target: "3",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "b",
        weighted: true,
        directed: true,
        id: "3-3",
      },
    ],
  },
  {
    kind: "graph",
    nodes: [
      {
        initial: "true",
        accept_state: "",
        name: "1",
        color: "white",
        outline: "",
        delay: "",
        dashed: "",
        additional: "",
        id: "1",
      },
      {
        initial: "",
        accept_state: "true",
        name: "2",
        color: "green",
        outline: "",
        delay: "",
        dashed: "",
        additional: "",
        id: "2",
      },
      {
        initial: "",
        accept_state: "",
        name: "3",
        color: "white",
        outline: "",
        delay: "",
        dashed: "",
        additional: "",
        id: "3",
      },
    ],
    links: [
      {
        source: "1",
        target: "2",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "a",
        weighted: true,
        directed: true,
        id: "1-2",
      },
      {
        source: "1",
        target: "3",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "b",
        weighted: true,
        directed: true,
        id: "1-3",
      },
      {
        source: "2",
        target: "2",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "a,b",
        weighted: true,
        directed: true,
        id: "2-2",
      },
      {
        source: "3",
        target: "2",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "a",
        weighted: true,
        directed: true,
        id: "3-2",
      },
      {
        source: "3",
        target: "3",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "b",
        weighted: true,
        directed: true,
        id: "3-3",
      },
    ],
  },
  {
    kind: "graph",
    nodes: [
      {
        initial: "true",
        accept_state: "",
        name: "1",
        color: "white",
        outline: "",
        delay: "",
        dashed: "",
        additional: "",
        id: "1",
      },
      {
        initial: "",
        accept_state: "true",
        name: "2",
        color: "green",
        outline: "",
        delay: "",
        dashed: "",
        additional: "",
        id: "2",
      },
      {
        initial: "",
        accept_state: "",
        name: "3",
        color: "white",
        outline: "",
        delay: "",
        dashed: "",
        additional: "",
        id: "3",
      },
    ],
    links: [
      {
        source: "1",
        target: "2",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "a",
        weighted: true,
        directed: true,
        id: "1-2",
      },
      {
        source: "1",
        target: "3",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "b",
        weighted: true,
        directed: true,
        id: "1-3",
      },
      {
        source: "2",
        target: "2",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "a,b",
        weighted: true,
        directed: true,
        id: "2-2",
      },
      {
        source: "3",
        target: "2",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "a",
        weighted: true,
        directed: true,
        id: "3-2",
      },
      {
        source: "3",
        target: "3",
        attribute1: "",
        attribute2: "",
        color: "",
        dashed: "",
        delay: "",
        weight: "b",
        weighted: true,
        directed: true,
        id: "3-3",
      },
    ],
  },
];

// #201: Graph pictures, one small instance per shape, captured the same way on 2026-10-14
// (POST /ProblemProvider/visualize?visualization=<name>&format=frames&solver=<name>).

/** format=frames, Clique, instance (({1,2,3,4},{{1,2},{1,3},{2,3},{3,4}}),3), CarraghanPardalos (branch and bound): subset shape; Committed nodes and edges, then the confirmed answer. */
export const CLIQUE_GRAPH_FRAMES = {
  type: "Graph",
  payload: {
    kind: "graph",
    subtype: "undirected",
    layout: "force",
    nodes: [
      {
        id: "1",
        label: "1",
      },
      {
        id: "2",
        label: "2",
      },
      {
        id: "3",
        label: "3",
      },
      {
        id: "4",
        label: "4",
      },
    ],
    edges: [
      {
        id: "1-2",
        a: "1",
        b: "2",
      },
      {
        id: "1-3",
        a: "1",
        b: "3",
      },
      {
        id: "2-3",
        a: "2",
        b: "3",
      },
      {
        id: "3-4",
        a: "3",
        b: "4",
      },
    ],
    shape: "subset",
    rule: "clique",
    k: 3,
  },
  frames: [
    {
      event: "Reject",
      caption: "Skip 4: with it only 2 vertices could ever join, but the clique needs 3.",
      focus: ["4"],
      nodes: {
        4: {
          state: "Rejected",
        },
      },
      edges: {},
      phantoms: [],
    },
    {
      event: "Accept",
      caption: "Add 1 to the clique. 2 vertices are joined to every member so far.",
      focus: ["1"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
      },
      edges: {},
      phantoms: [],
    },
    {
      event: "Accept",
      caption: "Add 2 to the clique. 1 vertices are joined to every member so far.",
      focus: ["2"],
      nodes: {
        1: {
          state: "Committed",
        },
        2: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1-2": {
          state: "Committed",
        },
      },
      phantoms: [],
    },
    {
      event: "Accept",
      caption: "Add 3 to the clique. 0 vertices are joined to every member so far.",
      focus: ["3"],
      nodes: {
        1: {
          state: "Solution",
        },
        2: {
          state: "Solution",
        },
        3: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1-2": {
          state: "Solution",
        },
        "1-3": {
          state: "Solution",
        },
        "2-3": {
          state: "Solution",
        },
      },
      phantoms: [],
    },
    {
      event: "Done",
      caption: "{1,2,3} is a clique of size 3.",
      focus: [],
      nodes: {
        1: {
          state: "Solution",
        },
        2: {
          state: "Solution",
        },
        3: {
          state: "Solution",
        },
      },
      edges: {
        "1-2": {
          state: "Solution",
        },
        "1-3": {
          state: "Solution",
        },
        "2-3": {
          state: "Solution",
        },
      },
      phantoms: [],
      ok: true,
    },
  ],
};

/** format=frames, Clique, instance (({1,2,3,4},{{1,2},{2,3},{3,4}}),3), CliqueBruteForce: a run that finds nothing; each candidate shows its missing edges as Rejected phantoms, and the Done has ok: false. */
export const CLIQUE_FAILED_GRAPH_FRAMES = {
  type: "Graph",
  payload: {
    kind: "graph",
    subtype: "undirected",
    layout: "force",
    nodes: [
      {
        id: "1",
        label: "1",
      },
      {
        id: "2",
        label: "2",
      },
      {
        id: "3",
        label: "3",
      },
      {
        id: "4",
        label: "4",
      },
    ],
    edges: [
      {
        id: "1-2",
        a: "1",
        b: "2",
      },
      {
        id: "2-3",
        a: "2",
        b: "3",
      },
      {
        id: "3-4",
        a: "3",
        b: "4",
      },
    ],
    shape: "subset",
    rule: "clique",
    k: 3,
  },
  frames: [
    {
      event: "Reject",
      caption: "Try {1,2,3}: 1 and 3 aren't joined.",
      focus: ["1", "2", "3"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
        2: {
          state: "ElementHighlight",
        },
        3: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1-2": {
          state: "ElementHighlight",
        },
        "2-3": {
          state: "ElementHighlight",
        },
      },
      phantoms: [
        {
          a: "1",
          b: "3",
          state: "Rejected",
        },
      ],
    },
    {
      event: "Reject",
      caption: "Try {1,2,4}: 1 and 4 aren't joined.",
      focus: ["1", "2", "4"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
        2: {
          state: "ElementHighlight",
        },
        4: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1-2": {
          state: "ElementHighlight",
        },
      },
      phantoms: [
        {
          a: "1",
          b: "4",
          state: "Rejected",
        },
        {
          a: "2",
          b: "4",
          state: "Rejected",
        },
      ],
    },
    {
      event: "Reject",
      caption: "Try {1,3,4}: 1 and 3 aren't joined.",
      focus: ["1", "3", "4"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
        3: {
          state: "ElementHighlight",
        },
        4: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "3-4": {
          state: "ElementHighlight",
        },
      },
      phantoms: [
        {
          a: "1",
          b: "3",
          state: "Rejected",
        },
        {
          a: "1",
          b: "4",
          state: "Rejected",
        },
      ],
    },
    {
      event: "Reject",
      caption: "Try {2,3,4}: 2 and 4 aren't joined.",
      focus: ["2", "3", "4"],
      nodes: {
        2: {
          state: "ElementHighlight",
        },
        3: {
          state: "ElementHighlight",
        },
        4: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "2-3": {
          state: "ElementHighlight",
        },
        "3-4": {
          state: "ElementHighlight",
        },
      },
      phantoms: [
        {
          a: "2",
          b: "4",
          state: "Rejected",
        },
      ],
    },
    {
      event: "Done",
      caption: "Checked all 4 candidate sets. None is a clique of size 3.",
      focus: [],
      nodes: {},
      edges: {},
      phantoms: [],
      ok: false,
    },
  ],
};

/** format=frames, Steiner Tree, instance (({1,2,3,4},{{1,2},{2,3},{3,4},{1,4}}),{1,3},2), SteinerTreeBruteForce: edges shape; nodes 1 and 3 are terminals. */
export const STEINER_GRAPH_FRAMES = {
  type: "Graph",
  payload: {
    kind: "graph",
    subtype: "undirected",
    layout: "force",
    nodes: [
      {
        id: "1",
        label: "1",
        terminal: true,
      },
      {
        id: "2",
        label: "2",
      },
      {
        id: "3",
        label: "3",
        terminal: true,
      },
      {
        id: "4",
        label: "4",
      },
    ],
    edges: [
      {
        id: "1-2",
        a: "1",
        b: "2",
      },
      {
        id: "2-3",
        a: "2",
        b: "3",
      },
      {
        id: "3-4",
        a: "3",
        b: "4",
      },
      {
        id: "1-4",
        a: "1",
        b: "4",
      },
    ],
    shape: "edges",
    rule: "steinerTree",
    k: 2,
  },
  frames: [
    {
      event: "Reject",
      caption: "Try edges 1-2: terminal 3 isn't reached.",
      focus: ["3"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
        2: {
          state: "ElementHighlight",
        },
        3: {
          state: "Rejected",
        },
      },
      edges: {
        "1-2": {
          state: "ElementHighlight",
        },
      },
      phantoms: [],
    },
    {
      event: "Reject",
      caption: "Try edges 2-3: terminal 1 isn't reached.",
      focus: ["1"],
      nodes: {
        1: {
          state: "Rejected",
        },
        2: {
          state: "ElementHighlight",
        },
        3: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "2-3": {
          state: "ElementHighlight",
        },
      },
      phantoms: [],
    },
    {
      event: "Reject",
      caption: "Try edges 3-4: terminal 1 isn't reached.",
      focus: ["1"],
      nodes: {
        1: {
          state: "Rejected",
        },
        3: {
          state: "ElementHighlight",
        },
        4: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "3-4": {
          state: "ElementHighlight",
        },
      },
      phantoms: [],
    },
    {
      event: "Reject",
      caption: "Try edges 1-4: terminal 3 isn't reached.",
      focus: ["3"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
        3: {
          state: "Rejected",
        },
        4: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1-4": {
          state: "ElementHighlight",
        },
      },
      phantoms: [],
    },
    {
      event: "Accept",
      caption: "Try edges 1-2, 2-3. They connect every terminal.",
      focus: ["1-2", "2-3"],
      nodes: {
        1: {
          state: "Covered",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "Covered",
        },
      },
      edges: {
        "1-2": {
          state: "ElementHighlight",
        },
        "2-3": {
          state: "ElementHighlight",
        },
      },
      phantoms: [],
    },
    {
      event: "Done",
      caption: "2 edges connect every terminal, found after 5 tries.",
      focus: [],
      nodes: {
        1: {
          state: "Covered",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "Covered",
        },
      },
      edges: {
        "1-2": {
          state: "Solution",
        },
        "2-3": {
          state: "Solution",
        },
      },
      phantoms: [],
      ok: true,
    },
  ],
};

/** format=frames, Max Cut, instance ({1,2,3,4},{({1,2},3),({2,3},1),({3,4},2),({1,4},2)}), MaxCutSolver: cut shape; the two sides as groups, weighted edges. */
export const MAX_CUT_GRAPH_FRAMES = {
  type: "Graph",
  payload: {
    kind: "graph",
    subtype: "undirected",
    layout: "force",
    nodes: [
      {
        id: "1",
        label: "1",
      },
      {
        id: "2",
        label: "2",
      },
      {
        id: "3",
        label: "3",
      },
      {
        id: "4",
        label: "4",
      },
    ],
    edges: [
      {
        id: "1-2",
        a: "1",
        b: "2",
        weight: 3,
      },
      {
        id: "2-3",
        a: "2",
        b: "3",
        weight: 1,
      },
      {
        id: "3-4",
        a: "3",
        b: "4",
        weight: 2,
      },
      {
        id: "1-4",
        a: "1",
        b: "4",
        weight: 2,
      },
    ],
    shape: "cut",
    rule: "maxCut",
  },
  frames: [
    {
      event: "Accept",
      caption: "Put {1} against {2,3,4}: the crossing edges weigh 5, the most so far.",
      focus: [],
      nodes: {},
      edges: {
        "1-2": {
          state: "Committed",
        },
        "1-4": {
          state: "Committed",
        },
      },
      phantoms: [],
      groups: {
        1: 0,
        2: 1,
        3: 1,
        4: 1,
      },
    },
    {
      event: "Accept",
      caption: "Put {1,3} against {2,4}: the crossing edges weigh 8, the most so far.",
      focus: [],
      nodes: {},
      edges: {
        "1-2": {
          state: "Solution",
        },
        "1-4": {
          state: "Solution",
        },
        "2-3": {
          state: "Solution",
        },
        "3-4": {
          state: "Solution",
        },
      },
      phantoms: [],
      groups: {
        1: 0,
        2: 1,
        3: 0,
        4: 1,
      },
    },
    {
      event: "Done",
      caption:
        "The heaviest cut weighs 8: {1,3} against {2,4}, after trying all 14 choices of the S side.",
      focus: [],
      nodes: {},
      edges: {
        "1-2": {
          state: "Solution",
        },
        "1-4": {
          state: "Solution",
        },
        "2-3": {
          state: "Solution",
        },
        "3-4": {
          state: "Solution",
        },
      },
      phantoms: [],
      ok: true,
      groups: {
        1: 0,
        2: 1,
        3: 0,
        4: 1,
      },
    },
  ],
};

/** format=frames, Clique Cover, instance (({1,2,3,4},{{1,2},{3,4}}),2), CliqueCoverBruteForce: groups shape; missing edges inside a group as Rejected phantoms. */
export const CLIQUE_COVER_GRAPH_FRAMES = {
  type: "Graph",
  payload: {
    kind: "graph",
    subtype: "undirected",
    layout: "force",
    nodes: [
      {
        id: "1",
        label: "1",
      },
      {
        id: "2",
        label: "2",
      },
      {
        id: "3",
        label: "3",
      },
      {
        id: "4",
        label: "4",
      },
    ],
    edges: [
      {
        id: "1-2",
        a: "1",
        b: "2",
      },
      {
        id: "3-4",
        a: "3",
        b: "4",
      },
    ],
    shape: "groups",
    rule: "cliqueCover",
    k: 2,
  },
  frames: [
    {
      event: "Reject",
      caption: "Try {1,2,3,4},{}: 1 and 3 are in one group but aren't joined.",
      focus: ["1", "3"],
      nodes: {
        1: {
          state: "Rejected",
        },
        3: {
          state: "Rejected",
        },
      },
      edges: {
        "1-2": {
          state: "ElementHighlight",
        },
        "3-4": {
          state: "ElementHighlight",
        },
      },
      phantoms: [
        {
          a: "1",
          b: "3",
          state: "Rejected",
        },
        {
          a: "1",
          b: "4",
          state: "Rejected",
        },
        {
          a: "2",
          b: "3",
          state: "Rejected",
        },
        {
          a: "2",
          b: "4",
          state: "Rejected",
        },
      ],
      groups: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
      },
    },
    {
      event: "Reject",
      caption: "Try {2,3,4},{1}: 2 and 3 are in one group but aren't joined.",
      focus: ["2", "3"],
      nodes: {
        2: {
          state: "Rejected",
        },
        3: {
          state: "Rejected",
        },
      },
      edges: {
        "3-4": {
          state: "ElementHighlight",
        },
      },
      phantoms: [
        {
          a: "2",
          b: "3",
          state: "Rejected",
        },
        {
          a: "2",
          b: "4",
          state: "Rejected",
        },
      ],
      groups: {
        1: 1,
        2: 0,
        3: 0,
        4: 0,
      },
    },
    {
      event: "Reject",
      caption: "Try {2,3,4},{}: 2 and 3 are in one group but aren't joined.",
      focus: ["2", "3"],
      nodes: {
        2: {
          state: "Rejected",
        },
        3: {
          state: "Rejected",
        },
      },
      edges: {
        "3-4": {
          state: "ElementHighlight",
        },
      },
      phantoms: [
        {
          a: "2",
          b: "3",
          state: "Rejected",
        },
        {
          a: "2",
          b: "4",
          state: "Rejected",
        },
      ],
      groups: {
        2: 0,
        3: 0,
        4: 0,
      },
    },
    {
      event: "Reject",
      caption: "Try {1,3,4},{2}: 1 and 3 are in one group but aren't joined.",
      focus: ["1", "3"],
      nodes: {
        1: {
          state: "Rejected",
        },
        3: {
          state: "Rejected",
        },
      },
      edges: {
        "3-4": {
          state: "ElementHighlight",
        },
      },
      phantoms: [
        {
          a: "1",
          b: "3",
          state: "Rejected",
        },
        {
          a: "1",
          b: "4",
          state: "Rejected",
        },
      ],
      groups: {
        1: 0,
        2: 1,
        3: 0,
        4: 0,
      },
    },
    {
      event: "Accept",
      caption: "Try {3,4},{1,2}. Every group is a clique.",
      focus: [],
      nodes: {},
      edges: {
        "1-2": {
          state: "Solution",
        },
        "3-4": {
          state: "Solution",
        },
      },
      phantoms: [],
      groups: {
        1: 1,
        2: 1,
        3: 0,
        4: 0,
      },
    },
    {
      event: "Done",
      caption: "{3,4},{1,2} covers the nodes with cliques, found after 5 tries.",
      focus: [],
      nodes: {},
      edges: {
        "1-2": {
          state: "Solution",
        },
        "3-4": {
          state: "Solution",
        },
      },
      phantoms: [],
      ok: true,
      groups: {
        1: 1,
        2: 1,
        3: 0,
        4: 0,
      },
    },
  ],
};

/** format=frames, Directed Hamiltonian Cycle, instance ({1,2,3,4},{(1,2),(2,1),(2,3),(3,4),(4,1)}), DirectedHamiltonianBruteForce: tour shape on a directed graph (circle layout, order badges, a pair of opposite edges). */
export const DIRECTED_HAMILTONIAN_GRAPH_FRAMES = {
  type: "Graph",
  payload: {
    kind: "graph",
    subtype: "directed",
    layout: "circle",
    nodes: [
      {
        id: "1",
        label: "1",
      },
      {
        id: "2",
        label: "2",
      },
      {
        id: "3",
        label: "3",
      },
      {
        id: "4",
        label: "4",
      },
    ],
    edges: [
      {
        id: "1>2",
        a: "1",
        b: "2",
      },
      {
        id: "2>1",
        a: "2",
        b: "1",
      },
      {
        id: "2>3",
        a: "2",
        b: "3",
      },
      {
        id: "3>4",
        a: "3",
        b: "4",
      },
      {
        id: "4>1",
        a: "4",
        b: "1",
      },
    ],
    shape: "tour",
    rule: "hamiltonianCycle",
  },
  frames: [
    {
      event: "Try",
      caption: "Start the tour at 1.",
      focus: ["1"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
      },
      edges: {},
      phantoms: [],
      order: ["1"],
    },
    {
      event: "Accept",
      caption: "Go 1 → 2: the path is 1 → 2.",
      focus: ["2", "1>2"],
      nodes: {
        1: {
          state: "Covered",
        },
        2: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1>2": {
          state: "ElementHighlight",
        },
      },
      phantoms: [],
      order: ["1", "2"],
    },
    {
      event: "Accept",
      caption: "Go 2 → 3: the path is 1 → 2 → 3.",
      focus: ["3", "2>3"],
      nodes: {
        1: {
          state: "Covered",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1>2": {
          state: "Committed",
        },
        "2>3": {
          state: "ElementHighlight",
        },
      },
      phantoms: [],
      order: ["1", "2", "3"],
    },
    {
      event: "Accept",
      caption:
        "Close the tour 4 → 1: every node is visited once, so 1 → 2 → 3 → 4 → 1 is a Hamiltonian cycle.",
      focus: ["4", "1"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
        2: {
          state: "Solution",
        },
        3: {
          state: "Solution",
        },
        4: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1>2": {
          state: "Solution",
        },
        "2>3": {
          state: "Solution",
        },
        "3>4": {
          state: "Solution",
        },
        "4>1": {
          state: "Solution",
        },
      },
      phantoms: [],
      order: ["1", "2", "3", "4", "1"],
    },
    {
      event: "Done",
      caption: "Found the Hamiltonian cycle 1 → 2 → 3 → 4 → 1 after checking 1 complete tour.",
      focus: [],
      nodes: {
        1: {
          state: "Solution",
        },
        2: {
          state: "Solution",
        },
        3: {
          state: "Solution",
        },
        4: {
          state: "Solution",
        },
      },
      edges: {
        "1>2": {
          state: "Solution",
        },
        "2>3": {
          state: "Solution",
        },
        "3>4": {
          state: "Solution",
        },
        "4>1": {
          state: "Solution",
        },
      },
      phantoms: [],
      ok: true,
      order: ["1", "2", "3", "4", "1"],
    },
  ],
};

// #202: Grouped Graph (clause graph) pictures, captured the same way on 2026-10-14.

/** format=frames, 3SAT, the problem default (x1 | !x2 | x3) & (!x1 | x3 | x1) & (x2 | !x3 | !x1), Sat3BacktrackingSolver: clause graph with False literals, Covered clauses, Committed true literals and the confirmed answer. */
export const SAT3_CLAUSE_GRAPH_FRAMES = {
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
  frames: [
    {
      event: "Try",
      caption: "Try x1 = True.",
      focus: ["v:x1"],
      nodes: {
        "c0-0": {
          state: "ElementHighlight",
        },
        "c1-0": {
          state: "False",
        },
        "c1-2": {
          state: "ElementHighlight",
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
    {
      event: "Accept",
      caption: "Keep x1 = True: no clause has every literal false yet, so this branch is queued.",
      focus: ["v:x1"],
      nodes: {
        "c0-0": {
          state: "ElementHighlight",
        },
        "c1-0": {
          state: "False",
        },
        "c1-2": {
          state: "ElementHighlight",
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
    {
      event: "Try",
      caption: "Try x1 = False.",
      focus: ["v:x1"],
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
    {
      event: "Accept",
      caption: "Keep x1 = False: no clause has every literal false yet, so this branch is queued.",
      focus: ["v:x1"],
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
    {
      event: "Try",
      caption: "Try x2 = True after x1 = True.",
      focus: ["v:x2"],
      nodes: {
        "c0-0": {
          state: "Committed",
        },
        "c0-1": {
          state: "False",
        },
        "c1-0": {
          state: "False",
        },
        "c1-2": {
          state: "Committed",
        },
        "c2-0": {
          state: "ElementHighlight",
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
      },
    },
    {
      event: "Accept",
      caption: "Keep x2 = True: every clause now has a true literal.",
      focus: ["v:x2"],
      nodes: {
        "c0-0": {
          state: "Solution",
        },
        "c0-1": {
          state: "False",
        },
        "c1-0": {
          state: "False",
        },
        "c1-2": {
          state: "Solution",
        },
        "c2-0": {
          state: "ElementHighlight",
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
      },
    },
    {
      event: "Done",
      caption: "Every clause has a true literal under x1 = True, x2 = True, x3 = False.",
      focus: [],
      nodes: {
        "c0-0": {
          state: "Solution",
        },
        "c0-1": {
          state: "False",
        },
        "c0-2": {
          state: "False",
        },
        "c1-0": {
          state: "False",
        },
        "c1-1": {
          state: "False",
        },
        "c1-2": {
          state: "Solution",
        },
        "c2-0": {
          state: "Solution",
        },
        "c2-1": {
          state: "Solution",
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
        "v:x3": false,
      },
      ok: true,
    },
  ],
};

/** format=frames, 3SAT, instance (x1 | x1 | x1) & (!x1 | !x1 | !x1), Sat3BacktrackingSolver: an unsatisfiable formula; each branch leaves a clause Rejected, and the Done has ok: false. */
export const SAT3_FAILED_CLAUSE_GRAPH_FRAMES = {
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
        label: "x1",
        variable: "v:x1",
        positive: true,
        group: "c0",
      },
      {
        id: "c0-2",
        label: "x1",
        variable: "v:x1",
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
        label: "¬x1",
        variable: "v:x1",
        positive: false,
        group: "c1",
      },
      {
        id: "c1-2",
        label: "¬x1",
        variable: "v:x1",
        positive: false,
        group: "c1",
      },
    ],
    variables: [
      {
        id: "v:x1",
        label: "x1",
      },
    ],
    edges: [
      {
        id: "c0-0~c1-0",
        a: "c0-0",
        b: "c1-0",
      },
      {
        id: "c0-0~c1-1",
        a: "c0-0",
        b: "c1-1",
      },
      {
        id: "c0-0~c1-2",
        a: "c0-0",
        b: "c1-2",
      },
      {
        id: "c0-1~c1-0",
        a: "c0-1",
        b: "c1-0",
      },
      {
        id: "c0-1~c1-1",
        a: "c0-1",
        b: "c1-1",
      },
      {
        id: "c0-1~c1-2",
        a: "c0-1",
        b: "c1-2",
      },
      {
        id: "c0-2~c1-0",
        a: "c0-2",
        b: "c1-0",
      },
      {
        id: "c0-2~c1-1",
        a: "c0-2",
        b: "c1-1",
      },
      {
        id: "c0-2~c1-2",
        a: "c0-2",
        b: "c1-2",
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
    ],
  },
  frames: [
    {
      event: "Try",
      caption: "Try x1 = True.",
      focus: ["v:x1"],
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
        "c1-0": {
          state: "Rejected",
        },
        "c1-1": {
          state: "Rejected",
        },
        "c1-2": {
          state: "Rejected",
        },
      },
      groups: {
        c0: {
          state: "Covered",
        },
        c1: {
          state: "Rejected",
        },
      },
      assignment: {
        "v:x1": true,
      },
    },
    {
      event: "Reject",
      caption: "x1 = True fails: clause C2 (!x1 | !x1 | !x1) has no true literal left.",
      focus: ["v:x1", "c1"],
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
        "c1-0": {
          state: "Rejected",
        },
        "c1-1": {
          state: "Rejected",
        },
        "c1-2": {
          state: "Rejected",
        },
      },
      groups: {
        c0: {
          state: "Covered",
        },
        c1: {
          state: "Rejected",
        },
      },
      assignment: {
        "v:x1": true,
      },
    },
    {
      event: "Try",
      caption: "Try x1 = False.",
      focus: ["v:x1"],
      nodes: {
        "c0-0": {
          state: "Rejected",
        },
        "c0-1": {
          state: "Rejected",
        },
        "c0-2": {
          state: "Rejected",
        },
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
        c0: {
          state: "Rejected",
        },
        c1: {
          state: "Covered",
        },
      },
      assignment: {
        "v:x1": false,
      },
    },
    {
      event: "Reject",
      caption: "x1 = False fails: clause C1 (x1 | x1 | x1) has no true literal left.",
      focus: ["v:x1", "c0"],
      nodes: {
        "c0-0": {
          state: "Rejected",
        },
        "c0-1": {
          state: "Rejected",
        },
        "c0-2": {
          state: "Rejected",
        },
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
        c0: {
          state: "Rejected",
        },
        c1: {
          state: "Covered",
        },
      },
      assignment: {
        "v:x1": false,
      },
    },
    {
      event: "Done",
      caption: "Every branch was rejected, so there is no solution.",
      focus: [],
      nodes: {},
      groups: {},
      assignment: {},
      ok: false,
    },
  ],
};

/**
 * Not captured: a Graph made here, big enough that it can't fit a phone at a readable size
 * (16 nodes on a circle, each joined to the next two), so its diagram has to scroll sideways at
 * 390 px. One frame, highlighting node 1. The shape and field names are the captures' own.
 */
export const LARGE_GRAPH_FRAMES = (() => {
  const count = 16;
  const ids = Array.from({ length: count }, (_, i) => String(i + 1));
  const edges = [];
  for (let i = 0; i < count; i += 1) {
    for (const step of [1, 2]) {
      const a = ids[i];
      const b = ids[(i + step) % count];
      edges.push({ id: `${a}-${b}`, a, b });
    }
  }
  return {
    type: "Graph",
    payload: {
      kind: "graph",
      subtype: "undirected",
      layout: "circle",
      nodes: ids.map((id) => ({ id, label: id })),
      edges,
      shape: "subset",
      rule: "clique",
      k: 3,
    },
    frames: [
      {
        event: "Try",
        caption: "Try 1.",
        focus: ["1"],
        nodes: { 1: { state: "ElementHighlight" } },
        edges: {},
        phantoms: [],
      },
    ],
  };
})();

/**
 * format=frames for IntProgrammingVisualization (0-1 Integer Linear Programming), instance
 * `(1 -1),(0 1)<=(-1 1)` with the brute force, captured on 2026-10-15 from a local build that
 * sends the payload's `blank` (the instance with nothing tried: x is "?", no totals). Its first
 * frame is the first try, with totals, which must not show before Run.
 */
export const ILP_TABLE_FRAMES_WITH_BLANK = {
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
        label: "Total",
        key: "total",
      },
      {
        id: "c3",
        label: "Bound",
        key: "bound",
      },
      {
        id: "c4",
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
    ],
    blank: {
      values: [
        ["?", "?", null, null, null],
        ["1", "-1", null, "-1", null],
        ["0", "1", null, "1", null],
      ],
    },
  },
  frames: [
    {
      event: "Reject",
      caption: "Try (0 0): row 1 adds up to 0, over its bound -1.",
      focus: ["r1"],
      values: [
        ["0", "0", null, null, null],
        ["1", "-1", "0", "-1", "no"],
        ["0", "1", "0", "1", "yes"],
      ],
      rows: {
        r1: {
          state: "Rejected",
        },
        r2: {
          state: "Covered",
        },
      },
      cells: {
        r0c0: {
          state: "ElementHighlight",
        },
        r0c1: {
          state: "ElementHighlight",
        },
      },
      changed: [],
    },
    {
      event: "Reject",
      caption: "Try (1 0): row 1 adds up to 1, over its bound -1.",
      focus: ["r1"],
      values: [
        ["1", "0", null, null, null],
        ["1", "-1", "1", "-1", "no"],
        ["0", "1", "0", "1", "yes"],
      ],
      rows: {
        r1: {
          state: "Rejected",
        },
        r2: {
          state: "Covered",
        },
      },
      cells: {
        r0c0: {
          state: "ElementHighlight",
        },
        r0c1: {
          state: "ElementHighlight",
        },
      },
      changed: [],
    },
    {
      event: "Accept",
      caption: "Try (0 1): every row stays within its bound.",
      focus: [],
      values: [
        ["0", "1", null, null, null],
        ["1", "-1", "-1", "-1", "yes"],
        ["0", "1", "1", "1", "yes"],
      ],
      rows: {
        r1: {
          state: "Solution",
        },
        r2: {
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
      },
      changed: [],
    },
    {
      event: "Done",
      caption: "(0 1) satisfies every row, found on try 3 of 4.",
      focus: [],
      values: [
        ["0", "1", null, null, null],
        ["1", "-1", "-1", "-1", "yes"],
        ["0", "1", "1", "1", "yes"],
      ],
      rows: {
        r1: {
          state: "Solution",
        },
        r2: {
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
      },
      changed: [],
      ok: true,
    },
  ],
};

// #203: Bipartite Graph pictures (Set Cover, Exact Cover, Hitting Set, and SAT's factor graph),
// captured the same way on 2026-10-15 from the published local build of local/viz-integration.

/** format=frames, Set Cover, the problem default ({1,2,3,4,5},{{1,2,3},{2,4},{3,4},{4,5}},3), SetCoverBruteForce: whole candidates tried, uncovered elements Rejected, ×2 hits, then the confirmed answer {S1,S4}. */
export const SET_COVER_BIPARTITE_FRAMES = {
  type: "BipartiteGraph",
  payload: {
    kind: "bipartiteGraph",
    layout: "columns",
    pickSide: "sets",
    rule: "atLeastOnce",
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
      {
        id: "e:5",
        label: "5",
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
        members: ["e:2", "e:4"],
      },
      {
        id: "S3",
        label: "S3",
        members: ["e:3", "e:4"],
      },
      {
        id: "S4",
        label: "S4",
        members: ["e:4", "e:5"],
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
        id: "e:4~S2",
        a: "e:4",
        b: "S2",
      },
      {
        id: "e:3~S3",
        a: "e:3",
        b: "S3",
      },
      {
        id: "e:4~S3",
        a: "e:4",
        b: "S3",
      },
      {
        id: "e:4~S4",
        a: "e:4",
        b: "S4",
      },
      {
        id: "e:5~S4",
        a: "e:5",
        b: "S4",
      },
    ],
    k: 3,
  },
  frames: [
    {
      event: "Reject",
      caption: "Try {S1}: 4 and 5 aren't covered.",
      focus: ["S1"],
      nodes: {
        S1: {
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
          state: "Rejected",
        },
        "e:5": {
          state: "Rejected",
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
      hits: {
        "e:1": 1,
        "e:2": 1,
        "e:3": 1,
      },
    },
    {
      event: "Reject",
      caption: "Try {S2}: 1, 3 and 5 aren't covered.",
      focus: ["S2"],
      nodes: {
        S2: {
          state: "ElementHighlight",
        },
        "e:1": {
          state: "Rejected",
        },
        "e:2": {
          state: "Covered",
        },
        "e:3": {
          state: "Rejected",
        },
        "e:4": {
          state: "Covered",
        },
        "e:5": {
          state: "Rejected",
        },
      },
      edges: {
        "e:2~S2": {
          state: "ElementHighlight",
        },
        "e:4~S2": {
          state: "ElementHighlight",
        },
      },
      hits: {
        "e:2": 1,
        "e:4": 1,
      },
    },
    {
      event: "Reject",
      caption: "Try {S3}: 1, 2 and 5 aren't covered.",
      focus: ["S3"],
      nodes: {
        S3: {
          state: "ElementHighlight",
        },
        "e:1": {
          state: "Rejected",
        },
        "e:2": {
          state: "Rejected",
        },
        "e:3": {
          state: "Covered",
        },
        "e:4": {
          state: "Covered",
        },
        "e:5": {
          state: "Rejected",
        },
      },
      edges: {
        "e:3~S3": {
          state: "ElementHighlight",
        },
        "e:4~S3": {
          state: "ElementHighlight",
        },
      },
      hits: {
        "e:3": 1,
        "e:4": 1,
      },
    },
    {
      event: "Reject",
      caption: "Try {S4}: 1, 2 and 3 aren't covered.",
      focus: ["S4"],
      nodes: {
        S4: {
          state: "ElementHighlight",
        },
        "e:1": {
          state: "Rejected",
        },
        "e:2": {
          state: "Rejected",
        },
        "e:3": {
          state: "Rejected",
        },
        "e:4": {
          state: "Covered",
        },
        "e:5": {
          state: "Covered",
        },
      },
      edges: {
        "e:4~S4": {
          state: "ElementHighlight",
        },
        "e:5~S4": {
          state: "ElementHighlight",
        },
      },
      hits: {
        "e:4": 1,
        "e:5": 1,
      },
    },
    {
      event: "Reject",
      caption: "Try {S1,S2}: 5 isn't covered.",
      focus: ["S1", "S2"],
      nodes: {
        S1: {
          state: "ElementHighlight",
        },
        S2: {
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
        "e:5": {
          state: "Rejected",
        },
      },
      edges: {
        "e:1~S1": {
          state: "ElementHighlight",
        },
        "e:2~S1": {
          state: "ElementHighlight",
        },
        "e:2~S2": {
          state: "ElementHighlight",
        },
        "e:3~S1": {
          state: "ElementHighlight",
        },
        "e:4~S2": {
          state: "ElementHighlight",
        },
      },
      hits: {
        "e:1": 1,
        "e:2": 2,
        "e:3": 1,
        "e:4": 1,
      },
    },
    {
      event: "Reject",
      caption: "Try {S1,S3}: 5 isn't covered.",
      focus: ["S1", "S3"],
      nodes: {
        S1: {
          state: "ElementHighlight",
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
        "e:5": {
          state: "Rejected",
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
        "e:3~S3": {
          state: "ElementHighlight",
        },
        "e:4~S3": {
          state: "ElementHighlight",
        },
      },
      hits: {
        "e:1": 1,
        "e:2": 1,
        "e:3": 2,
        "e:4": 1,
      },
    },
    {
      event: "Accept",
      caption: "Try {S1,S4}. It covers every element.",
      focus: ["S1", "S4"],
      nodes: {
        S1: {
          state: "ElementHighlight",
        },
        S4: {
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
        "e:5": {
          state: "Covered",
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
        "e:4~S4": {
          state: "ElementHighlight",
        },
        "e:5~S4": {
          state: "ElementHighlight",
        },
      },
      hits: {
        "e:1": 1,
        "e:2": 1,
        "e:3": 1,
        "e:4": 1,
        "e:5": 1,
      },
    },
    {
      event: "Done",
      caption:
        "{S1,S4} covers U with 2 sets, found after 7 tries. Smaller combinations were tried first, so no cover uses fewer sets.",
      focus: [],
      nodes: {
        S1: {
          state: "Solution",
        },
        S4: {
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
        "e:5": {
          state: "Covered",
        },
      },
      edges: {
        "e:1~S1": {
          state: "Solution",
        },
        "e:2~S1": {
          state: "Solution",
        },
        "e:3~S1": {
          state: "Solution",
        },
        "e:4~S4": {
          state: "Solution",
        },
        "e:5~S4": {
          state: "Solution",
        },
      },
      hits: {
        "e:1": 1,
        "e:2": 1,
        "e:3": 1,
        "e:4": 1,
        "e:5": 1,
      },
      ok: true,
    },
  ],
};

/** format=frames, Set Cover, ({1,2,3,4,5},{{1,2},{2,3},{4}},3) (5 is in no set), HeuristicSolver: the uncovered element Rejected, then a Done that is not ok. */
export const SET_COVER_FAILED_BIPARTITE_FRAMES = {
  type: "BipartiteGraph",
  payload: {
    kind: "bipartiteGraph",
    layout: "columns",
    pickSide: "sets",
    rule: "atLeastOnce",
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
      {
        id: "e:5",
        label: "5",
      },
    ],
    sets: [
      {
        id: "S1",
        label: "S1",
        members: ["e:1", "e:2"],
      },
      {
        id: "S2",
        label: "S2",
        members: ["e:2", "e:3"],
      },
      {
        id: "S3",
        label: "S3",
        members: ["e:4"],
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
    ],
    k: 3,
  },
  frames: [
    {
      event: "Reject",
      caption: "No set contains 5, so no cover exists.",
      focus: ["e:5"],
      nodes: {
        "e:5": {
          state: "Rejected",
        },
      },
      edges: {},
      hits: {},
    },
    {
      event: "Done",
      caption: "Every branch was undone. No cover of at most K = 3 sets exists.",
      focus: [],
      nodes: {},
      edges: {},
      hits: {},
      ok: false,
    },
  ],
};

/** format=frames, Exact Cover, the problem default ({1,2,3,4},{{1,2,3},{2,3},{4,1}}), ExactCoverRecursive: Blocked sets, a Committed set, a Backtrack, then the answer {S2,S3}. */
export const EXACT_COVER_BIPARTITE_FRAMES = {
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
  frames: [
    {
      event: "Accept",
      caption: "Take S1 {1,2,3}: it shares no element with the sets taken.",
      focus: ["S1"],
      nodes: {
        S1: {
          state: "ElementHighlight",
        },
        S2: {
          state: "Blocked",
        },
        S3: {
          state: "Blocked",
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
      hits: {
        "e:1": 1,
        "e:2": 1,
        "e:3": 1,
      },
    },
    {
      event: "Reject",
      caption: "Every set left overlaps the sets taken, and 4 is still not covered, so undo.",
      focus: ["e:4"],
      nodes: {
        S1: {
          state: "Committed",
        },
        S2: {
          state: "Blocked",
        },
        S3: {
          state: "Blocked",
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
          state: "Rejected",
        },
      },
      edges: {
        "e:1~S1": {
          state: "Committed",
        },
        "e:2~S1": {
          state: "Committed",
        },
        "e:3~S1": {
          state: "Committed",
        },
      },
      hits: {
        "e:1": 1,
        "e:2": 1,
        "e:3": 1,
      },
    },
    {
      event: "Backtrack",
      caption: "Undo S1: no exact cover follows from it.",
      focus: ["S1"],
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
    {
      event: "Accept",
      caption: "Take S2 {2,3}: it shares no element with the sets taken.",
      focus: ["S2"],
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
    {
      event: "Accept",
      caption: "Take S3 {4,1}: it shares no element with the sets taken.",
      focus: ["S3"],
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
    {
      event: "Done",
      caption: "Every element is covered by exactly one chosen set: {S2,S3}.",
      focus: [],
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
      ok: true,
    },
  ],
};

/** format=frames, Hitting Set, the problem default ({1,2,3,4},{{1,3},{2,3,4},{1,4}}), HittingSetBruteForce: the answer picks elements (pickSide elements), sets hit exactly once. */
export const HITTING_SET_BIPARTITE_FRAMES = {
  type: "BipartiteGraph",
  payload: {
    kind: "bipartiteGraph",
    layout: "columns",
    pickSide: "elements",
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
        members: ["e:1", "e:3"],
      },
      {
        id: "S2",
        label: "S2",
        members: ["e:2", "e:3", "e:4"],
      },
      {
        id: "S3",
        label: "S3",
        members: ["e:1", "e:4"],
      },
    ],
    edges: [
      {
        id: "e:1~S1",
        a: "e:1",
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
        id: "e:4~S2",
        a: "e:4",
        b: "S2",
      },
      {
        id: "e:1~S3",
        a: "e:1",
        b: "S3",
      },
      {
        id: "e:4~S3",
        a: "e:4",
        b: "S3",
      },
    ],
  },
  frames: [
    {
      event: "Reject",
      caption: "Try {}: S1, S2 and S3 aren't hit.",
      focus: [],
      nodes: {},
      edges: {},
      hits: {},
    },
    {
      event: "Reject",
      caption: "Try {1}: S2 isn't hit.",
      focus: ["e:1"],
      nodes: {
        S1: {
          state: "Covered",
        },
        S2: {
          state: "Rejected",
        },
        S3: {
          state: "Covered",
        },
        "e:1": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "e:1~S1": {
          state: "ElementHighlight",
        },
        "e:1~S3": {
          state: "ElementHighlight",
        },
      },
      hits: {
        S1: 1,
        S3: 1,
      },
    },
    {
      event: "Reject",
      caption: "Try {2}: S1 and S3 aren't hit.",
      focus: ["e:2"],
      nodes: {
        S1: {
          state: "Rejected",
        },
        S2: {
          state: "Covered",
        },
        S3: {
          state: "Rejected",
        },
        "e:2": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "e:2~S2": {
          state: "ElementHighlight",
        },
      },
      hits: {
        S2: 1,
      },
    },
    {
      event: "Accept",
      caption: "Try {1,2}. It hits every set exactly once.",
      focus: ["e:1", "e:2"],
      nodes: {
        S1: {
          state: "Covered",
        },
        S2: {
          state: "Covered",
        },
        S3: {
          state: "Covered",
        },
        "e:1": {
          state: "ElementHighlight",
        },
        "e:2": {
          state: "ElementHighlight",
        },
        "e:3": {
          state: "Blocked",
        },
        "e:4": {
          state: "Blocked",
        },
      },
      edges: {
        "e:1~S1": {
          state: "ElementHighlight",
        },
        "e:1~S3": {
          state: "ElementHighlight",
        },
        "e:2~S2": {
          state: "ElementHighlight",
        },
      },
      hits: {
        S1: 1,
        S2: 1,
        S3: 1,
      },
    },
    {
      event: "Done",
      caption: "{1,2} hits every set exactly once, found after 4 tries.",
      focus: [],
      nodes: {
        S1: {
          state: "Covered",
        },
        S2: {
          state: "Covered",
        },
        S3: {
          state: "Covered",
        },
        "e:1": {
          state: "Solution",
        },
        "e:2": {
          state: "Solution",
        },
        "e:3": {
          state: "Blocked",
        },
        "e:4": {
          state: "Blocked",
        },
      },
      edges: {
        "e:1~S1": {
          state: "Solution",
        },
        "e:1~S3": {
          state: "Solution",
        },
        "e:2~S2": {
          state: "Solution",
        },
      },
      hits: {
        S1: 1,
        S2: 1,
        S3: 1,
      },
      ok: true,
    },
  ],
};

/** format=frames, 3SAT, the problem default (x1  */
export const SAT3_FACTOR_GRAPH_FRAMES = {
  type: "BipartiteGraph",
  payload: {
    kind: "bipartiteGraph",
    layout: "columns",
    pickSide: "assignment",
    rule: "satisfiability",
    elements: [
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
    sets: [
      {
        id: "c0",
        label: "C1",
        members: ["v:x1", "v:x2", "v:x3"],
      },
      {
        id: "c1",
        label: "C2",
        members: ["v:x1", "v:x3"],
      },
      {
        id: "c2",
        label: "C3",
        members: ["v:x2", "v:x3", "v:x1"],
      },
    ],
    edges: [
      {
        id: "c0-0",
        a: "v:x1",
        b: "c0",
        positive: true,
      },
      {
        id: "c0-1",
        a: "v:x2",
        b: "c0",
        positive: false,
      },
      {
        id: "c0-2",
        a: "v:x3",
        b: "c0",
        positive: true,
      },
      {
        id: "c1-0",
        a: "v:x1",
        b: "c1",
        positive: false,
      },
      {
        id: "c1-1",
        a: "v:x3",
        b: "c1",
        positive: true,
      },
      {
        id: "c1-2",
        a: "v:x1",
        b: "c1",
        positive: true,
      },
      {
        id: "c2-0",
        a: "v:x2",
        b: "c2",
        positive: true,
      },
      {
        id: "c2-1",
        a: "v:x3",
        b: "c2",
        positive: false,
      },
      {
        id: "c2-2",
        a: "v:x1",
        b: "c2",
        positive: false,
      },
    ],
  },
  frames: [
    {
      event: "Try",
      caption: "Try x1 = True.",
      focus: ["v:x1"],
      nodes: {
        c0: {
          state: "Covered",
        },
        c1: {
          state: "Covered",
        },
        "v:x1": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "c0-0": {
          state: "ElementHighlight",
        },
        "c1-0": {
          state: "False",
        },
        "c1-2": {
          state: "ElementHighlight",
        },
        "c2-2": {
          state: "False",
        },
      },
      hits: {
        c0: 1,
        c1: 1,
      },
      assignment: {
        "v:x1": true,
      },
    },
    {
      event: "Accept",
      caption: "Keep x1 = True: no clause has every literal false yet, so this branch is queued.",
      focus: ["v:x1"],
      nodes: {
        c0: {
          state: "Covered",
        },
        c1: {
          state: "Covered",
        },
        "v:x1": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "c0-0": {
          state: "ElementHighlight",
        },
        "c1-0": {
          state: "False",
        },
        "c1-2": {
          state: "ElementHighlight",
        },
        "c2-2": {
          state: "False",
        },
      },
      hits: {
        c0: 1,
        c1: 1,
      },
      assignment: {
        "v:x1": true,
      },
    },
    {
      event: "Try",
      caption: "Try x1 = False.",
      focus: ["v:x1"],
      nodes: {
        c1: {
          state: "Covered",
        },
        c2: {
          state: "Covered",
        },
        "v:x1": {
          state: "ElementHighlight",
        },
      },
      edges: {
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
      hits: {
        c1: 1,
        c2: 1,
      },
      assignment: {
        "v:x1": false,
      },
    },
    {
      event: "Accept",
      caption: "Keep x1 = False: no clause has every literal false yet, so this branch is queued.",
      focus: ["v:x1"],
      nodes: {
        c1: {
          state: "Covered",
        },
        c2: {
          state: "Covered",
        },
        "v:x1": {
          state: "ElementHighlight",
        },
      },
      edges: {
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
      hits: {
        c1: 1,
        c2: 1,
      },
      assignment: {
        "v:x1": false,
      },
    },
    {
      event: "Try",
      caption: "Try x2 = True after x1 = True.",
      focus: ["v:x2"],
      nodes: {
        c0: {
          state: "Covered",
        },
        c1: {
          state: "Covered",
        },
        c2: {
          state: "Covered",
        },
        "v:x1": {
          state: "Committed",
        },
        "v:x2": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "c0-0": {
          state: "Committed",
        },
        "c0-1": {
          state: "False",
        },
        "c1-0": {
          state: "False",
        },
        "c1-2": {
          state: "Committed",
        },
        "c2-0": {
          state: "ElementHighlight",
        },
        "c2-2": {
          state: "False",
        },
      },
      hits: {
        c0: 1,
        c1: 1,
        c2: 1,
      },
      assignment: {
        "v:x1": true,
        "v:x2": true,
      },
    },
    {
      event: "Accept",
      caption: "Keep x2 = True: every clause now has a true literal.",
      focus: ["v:x2"],
      nodes: {
        c0: {
          state: "Covered",
        },
        c1: {
          state: "Covered",
        },
        c2: {
          state: "Covered",
        },
        "v:x1": {
          state: "Solution",
        },
        "v:x2": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "c0-0": {
          state: "Solution",
        },
        "c0-1": {
          state: "False",
        },
        "c1-0": {
          state: "False",
        },
        "c1-2": {
          state: "Solution",
        },
        "c2-0": {
          state: "ElementHighlight",
        },
        "c2-2": {
          state: "False",
        },
      },
      hits: {
        c0: 1,
        c1: 1,
        c2: 1,
      },
      assignment: {
        "v:x1": true,
        "v:x2": true,
      },
    },
    {
      event: "Done",
      caption: "Every clause has a true literal under x1 = True, x2 = True, x3 = False.",
      focus: [],
      nodes: {
        c0: {
          state: "Covered",
        },
        c1: {
          state: "Covered",
        },
        c2: {
          state: "Covered",
        },
        "v:x1": {
          state: "Solution",
        },
        "v:x2": {
          state: "Solution",
        },
        "v:x3": {
          state: "False",
        },
      },
      edges: {
        "c0-0": {
          state: "Solution",
        },
        "c0-1": {
          state: "False",
        },
        "c0-2": {
          state: "False",
        },
        "c1-0": {
          state: "False",
        },
        "c1-1": {
          state: "False",
        },
        "c1-2": {
          state: "Solution",
        },
        "c2-0": {
          state: "Solution",
        },
        "c2-1": {
          state: "Solution",
        },
        "c2-2": {
          state: "False",
        },
      },
      hits: {
        c0: 1,
        c1: 1,
        c2: 2,
      },
      assignment: {
        "v:x1": true,
        "v:x2": true,
        "v:x3": false,
      },
      ok: true,
    },
  ],
};

// #205: Layered Graph pictures (Topological Sort, Feedback Arc Set, Feedback Node Set, Strongly
// Connected Components, Single Source and Single Pair Shortest Path), captured the same way on
// 2026-10-15 from the published local build of local/viz-integration.

/** format=frames, Topological Sort, the problem default ({1,2,3,4,5,6},{(1,2),(1,3),(2,4),(3,4),(4,5),(3,6)}), KahnsAlgorithm: order shape; ready nodes Covered, placed nodes Committed with order badges, then the answer. */
export const TOPOLOGICAL_SORT_LAYERED_FRAMES = {
  type: "LayeredGraph",
  payload: {
    kind: "layeredGraph",
    layout: "ranked",
    shape: "order",
    rule: "topologicalSort",
    directed: true,
    weighted: false,
    nodes: [
      {
        id: "1",
        label: "1",
        layer: 0,
        row: 0,
      },
      {
        id: "2",
        label: "2",
        layer: 1,
        row: 0,
      },
      {
        id: "3",
        label: "3",
        layer: 1,
        row: 1,
      },
      {
        id: "4",
        label: "4",
        layer: 2,
        row: 0,
      },
      {
        id: "5",
        label: "5",
        layer: 3,
        row: 0,
      },
      {
        id: "6",
        label: "6",
        layer: 2,
        row: 1,
      },
    ],
    edges: [
      {
        id: "1>2",
        a: "1",
        b: "2",
        back: false,
      },
      {
        id: "1>3",
        a: "1",
        b: "3",
        back: false,
      },
      {
        id: "2>4",
        a: "2",
        b: "4",
        back: false,
      },
      {
        id: "3>4",
        a: "3",
        b: "4",
        back: false,
      },
      {
        id: "4>5",
        a: "4",
        b: "5",
        back: false,
      },
      {
        id: "3>6",
        a: "3",
        b: "6",
        back: false,
      },
    ],
    layers: [["1"], ["2", "3"], ["4", "6"], ["5"]],
  },
  frames: [
    {
      event: "Try",
      caption: "Ready to place (no incoming edges): 1.",
      focus: [],
      nodes: {
        1: {
          state: "Covered",
        },
      },
      edges: {},
      order: [],
    },
    {
      event: "Accept",
      caption: "Place 1 at position 1. That frees 2 and 3. Ready: 2 and 3.",
      focus: ["1"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "Covered",
        },
      },
      edges: {
        "1>2": {
          state: "Covered",
        },
        "1>3": {
          state: "Covered",
        },
      },
      order: ["1"],
    },
    {
      event: "Accept",
      caption: "Place 2 at position 2. Ready: 3.",
      focus: ["2"],
      nodes: {
        1: {
          state: "Committed",
        },
        2: {
          state: "ElementHighlight",
        },
        3: {
          state: "Covered",
        },
      },
      edges: {
        "1>2": {
          state: "Committed",
        },
        "1>3": {
          state: "Covered",
        },
        "2>4": {
          state: "Covered",
        },
      },
      order: ["1", "2"],
    },
    {
      event: "Accept",
      caption: "Place 3 at position 3. That frees 4 and 6. Ready: 4 and 6.",
      focus: ["3"],
      nodes: {
        1: {
          state: "Committed",
        },
        2: {
          state: "Committed",
        },
        3: {
          state: "ElementHighlight",
        },
        4: {
          state: "Covered",
        },
        6: {
          state: "Covered",
        },
      },
      edges: {
        "1>2": {
          state: "Committed",
        },
        "1>3": {
          state: "Committed",
        },
        "2>4": {
          state: "Covered",
        },
        "3>4": {
          state: "Covered",
        },
        "3>6": {
          state: "Covered",
        },
      },
      order: ["1", "2", "3"],
    },
    {
      event: "Accept",
      caption: "Place 4 at position 4. That frees 5. Ready: 6 and 5.",
      focus: ["4"],
      nodes: {
        1: {
          state: "Committed",
        },
        2: {
          state: "Committed",
        },
        3: {
          state: "Committed",
        },
        4: {
          state: "ElementHighlight",
        },
        5: {
          state: "Covered",
        },
        6: {
          state: "Covered",
        },
      },
      edges: {
        "1>2": {
          state: "Committed",
        },
        "1>3": {
          state: "Committed",
        },
        "2>4": {
          state: "Committed",
        },
        "3>4": {
          state: "Committed",
        },
        "3>6": {
          state: "Covered",
        },
        "4>5": {
          state: "Covered",
        },
      },
      order: ["1", "2", "3", "4"],
    },
    {
      event: "Accept",
      caption: "Place 6 at position 5. Ready: 5.",
      focus: ["6"],
      nodes: {
        1: {
          state: "Committed",
        },
        2: {
          state: "Committed",
        },
        3: {
          state: "Committed",
        },
        4: {
          state: "Committed",
        },
        5: {
          state: "Covered",
        },
        6: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1>2": {
          state: "Committed",
        },
        "1>3": {
          state: "Committed",
        },
        "2>4": {
          state: "Committed",
        },
        "3>4": {
          state: "Committed",
        },
        "3>6": {
          state: "Committed",
        },
        "4>5": {
          state: "Covered",
        },
      },
      order: ["1", "2", "3", "4", "6"],
    },
    {
      event: "Accept",
      caption: "Place 5 at position 6.",
      focus: ["5"],
      nodes: {
        1: {
          state: "Solution",
        },
        2: {
          state: "Solution",
        },
        3: {
          state: "Solution",
        },
        4: {
          state: "Solution",
        },
        5: {
          state: "ElementHighlight",
        },
        6: {
          state: "Solution",
        },
      },
      edges: {
        "1>2": {
          state: "Solution",
        },
        "1>3": {
          state: "Solution",
        },
        "2>4": {
          state: "Solution",
        },
        "3>4": {
          state: "Solution",
        },
        "3>6": {
          state: "Solution",
        },
        "4>5": {
          state: "Solution",
        },
      },
      order: ["1", "2", "3", "4", "6", "5"],
    },
    {
      event: "Done",
      caption: "Every node is placed and every edge points forward: 1, 2, 3, 4, 6, 5.",
      focus: [],
      nodes: {
        1: {
          state: "Solution",
        },
        2: {
          state: "Solution",
        },
        3: {
          state: "Solution",
        },
        4: {
          state: "Solution",
        },
        5: {
          state: "Solution",
        },
        6: {
          state: "Solution",
        },
      },
      edges: {
        "1>2": {
          state: "Solution",
        },
        "1>3": {
          state: "Solution",
        },
        "2>4": {
          state: "Solution",
        },
        "3>4": {
          state: "Solution",
        },
        "3>6": {
          state: "Solution",
        },
        "4>5": {
          state: "Solution",
        },
      },
      order: ["1", "2", "3", "4", "6", "5"],
      ok: true,
    },
  ],
};

/** format=frames, Topological Sort, ({1,2,3,4,5},{(1,2),(2,3),(3,4),(4,2),(3,5)}) (a cycle 2, 3, 4), KahnsAlgorithm: the back edge 4>2 under the rows, the stuck nodes and the cycle Rejected, a Done that is not ok. */
export const TOPOLOGICAL_SORT_CYCLE_LAYERED_FRAMES = {
  type: "LayeredGraph",
  payload: {
    kind: "layeredGraph",
    layout: "ranked",
    shape: "order",
    rule: "topologicalSort",
    directed: true,
    weighted: false,
    nodes: [
      {
        id: "1",
        label: "1",
        layer: 0,
        row: 0,
      },
      {
        id: "2",
        label: "2",
        layer: 1,
        row: 0,
      },
      {
        id: "3",
        label: "3",
        layer: 2,
        row: 0,
      },
      {
        id: "4",
        label: "4",
        layer: 3,
        row: 0,
      },
      {
        id: "5",
        label: "5",
        layer: 3,
        row: 1,
      },
    ],
    edges: [
      {
        id: "1>2",
        a: "1",
        b: "2",
        back: false,
      },
      {
        id: "2>3",
        a: "2",
        b: "3",
        back: false,
      },
      {
        id: "3>4",
        a: "3",
        b: "4",
        back: false,
      },
      {
        id: "4>2",
        a: "4",
        b: "2",
        back: true,
      },
      {
        id: "3>5",
        a: "3",
        b: "5",
        back: false,
      },
    ],
    layers: [["1"], ["2"], ["3"], ["4", "5"]],
  },
  frames: [
    {
      event: "Try",
      caption: "Ready to place (no incoming edges): 1.",
      focus: [],
      nodes: {
        1: {
          state: "Covered",
        },
      },
      edges: {},
      order: [],
    },
    {
      event: "Accept",
      caption: "Place 1 at position 1.",
      focus: ["1"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1>2": {
          state: "Covered",
        },
      },
      order: ["1"],
    },
    {
      event: "Reject",
      caption: "2, 3, 4 and 5 never lose their last incoming edge, because of a cycle.",
      focus: ["2", "3", "4", "5"],
      nodes: {
        1: {
          state: "Committed",
        },
        2: {
          state: "Rejected",
        },
        3: {
          state: "Rejected",
        },
        4: {
          state: "Rejected",
        },
        5: {
          state: "Rejected",
        },
      },
      edges: {
        "1>2": {
          state: "Covered",
        },
      },
      order: ["1"],
    },
    {
      event: "Done",
      caption: "The graph has a cycle, so no topological order exists.",
      focus: [],
      nodes: {
        2: {
          state: "Rejected",
        },
        3: {
          state: "Rejected",
        },
        4: {
          state: "Rejected",
        },
        5: {
          state: "Rejected",
        },
      },
      edges: {
        "2>3": {
          state: "Rejected",
        },
        "3>4": {
          state: "Rejected",
        },
        "4>2": {
          state: "Rejected",
        },
      },
      order: [],
      ok: false,
    },
  ],
};

/** format=frames, Feedback Arc Set, the problem default (({1,2,3,4,5},{(1,2),(2,3),(3,1),(4,5),(5,2),(3,4)}),1), ArcSetBruteForce: removedSet shape; surviving cycles Rejected, the removed edge dashed. */
export const ARC_SET_LAYERED_FRAMES = {
  type: "LayeredGraph",
  payload: {
    kind: "layeredGraph",
    layout: "ranked",
    shape: "removedSet",
    rule: "feedbackArcSet",
    directed: true,
    weighted: false,
    nodes: [
      {
        id: "1",
        label: "1",
        layer: 0,
        row: 0,
      },
      {
        id: "2",
        label: "2",
        layer: 1,
        row: 0,
      },
      {
        id: "3",
        label: "3",
        layer: 2,
        row: 0,
      },
      {
        id: "4",
        label: "4",
        layer: 3,
        row: 0,
      },
      {
        id: "5",
        label: "5",
        layer: 4,
        row: 0,
      },
    ],
    edges: [
      {
        id: "1>2",
        a: "1",
        b: "2",
        back: false,
      },
      {
        id: "2>3",
        a: "2",
        b: "3",
        back: false,
      },
      {
        id: "3>1",
        a: "3",
        b: "1",
        back: true,
      },
      {
        id: "4>5",
        a: "4",
        b: "5",
        back: false,
      },
      {
        id: "5>2",
        a: "5",
        b: "2",
        back: true,
      },
      {
        id: "3>4",
        a: "3",
        b: "4",
        back: false,
      },
    ],
    layers: [["1"], ["2"], ["3"], ["4"], ["5"]],
    k: 1,
  },
  frames: [
    {
      event: "Reject",
      caption: "Try removing nothing: the cycle 1 → 2 → 3 → 1 is there.",
      focus: [],
      nodes: {},
      edges: {
        "1>2": {
          state: "Rejected",
        },
        "2>3": {
          state: "Rejected",
        },
        "3>1": {
          state: "Rejected",
        },
      },
    },
    {
      event: "Reject",
      caption: "Try removing {(1,2)}: the cycle 2 → 3 → 4 → 5 → 2 is still there.",
      focus: ["1>2"],
      nodes: {},
      edges: {
        "1>2": {
          state: "ElementHighlight",
        },
        "2>3": {
          state: "Rejected",
        },
        "3>4": {
          state: "Rejected",
        },
        "4>5": {
          state: "Rejected",
        },
        "5>2": {
          state: "Rejected",
        },
      },
    },
    {
      event: "Accept",
      caption: "Try removing {(2,3)}. No cycle is left.",
      focus: ["2>3"],
      nodes: {},
      edges: {
        "2>3": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Done",
      caption: "Removing {(2,3)} leaves no cycle, within K = 1. Found after 3 tries.",
      focus: [],
      nodes: {},
      edges: {
        "2>3": {
          state: "Solution",
        },
      },
      ok: true,
    },
  ],
};

/** format=frames, Feedback Node Set, the problem default (({1,2,3,4,5},{(1,2),(2,3),(3,1),(4,5),(5,2),(3,4)}),1), NodeSetBruteForce: removedSet shape; a removed node's edges Untraveled. */
export const NODE_SET_LAYERED_FRAMES = {
  type: "LayeredGraph",
  payload: {
    kind: "layeredGraph",
    layout: "ranked",
    shape: "removedSet",
    rule: "feedbackNodeSet",
    directed: true,
    weighted: false,
    nodes: [
      {
        id: "1",
        label: "1",
        layer: 0,
        row: 0,
      },
      {
        id: "2",
        label: "2",
        layer: 1,
        row: 0,
      },
      {
        id: "3",
        label: "3",
        layer: 2,
        row: 0,
      },
      {
        id: "4",
        label: "4",
        layer: 3,
        row: 0,
      },
      {
        id: "5",
        label: "5",
        layer: 4,
        row: 0,
      },
    ],
    edges: [
      {
        id: "1>2",
        a: "1",
        b: "2",
        back: false,
      },
      {
        id: "2>3",
        a: "2",
        b: "3",
        back: false,
      },
      {
        id: "3>1",
        a: "3",
        b: "1",
        back: true,
      },
      {
        id: "4>5",
        a: "4",
        b: "5",
        back: false,
      },
      {
        id: "5>2",
        a: "5",
        b: "2",
        back: true,
      },
      {
        id: "3>4",
        a: "3",
        b: "4",
        back: false,
      },
    ],
    layers: [["1"], ["2"], ["3"], ["4"], ["5"]],
    k: 1,
  },
  frames: [
    {
      event: "Reject",
      caption: "Try removing nothing: the cycle 1 → 2 → 3 → 1 is there.",
      focus: [],
      nodes: {},
      edges: {
        "1>2": {
          state: "Rejected",
        },
        "2>3": {
          state: "Rejected",
        },
        "3>1": {
          state: "Rejected",
        },
      },
    },
    {
      event: "Reject",
      caption: "Try removing {1}: the cycle 2 → 3 → 4 → 5 → 2 is still there.",
      focus: ["1"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1>2": {
          state: "Untraveled",
        },
        "2>3": {
          state: "Rejected",
        },
        "3>1": {
          state: "Untraveled",
        },
        "3>4": {
          state: "Rejected",
        },
        "4>5": {
          state: "Rejected",
        },
        "5>2": {
          state: "Rejected",
        },
      },
    },
    {
      event: "Accept",
      caption: "Try removing {2}. No cycle is left.",
      focus: ["2"],
      nodes: {
        2: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1>2": {
          state: "Untraveled",
        },
        "2>3": {
          state: "Untraveled",
        },
        "5>2": {
          state: "Untraveled",
        },
      },
    },
    {
      event: "Done",
      caption: "Removing {2} leaves no cycle, within K = 1. Found after 3 tries.",
      focus: [],
      nodes: {
        2: {
          state: "Solution",
        },
      },
      edges: {
        "1>2": {
          state: "Untraveled",
        },
        "2>3": {
          state: "Untraveled",
        },
        "5>2": {
          state: "Untraveled",
        },
      },
      ok: true,
    },
  ],
};

/** format=frames, Strongly Connected Components, the problem default ({1,2,3,4,5},{(1,2),(2,3),(3,1),(3,4),(4,5),(5,4)}), KosarajuSolver: groups shape; pass 1 Covered with finish numbers, pass 2 component colors. */
export const SCC_LAYERED_FRAMES = {
  type: "LayeredGraph",
  payload: {
    kind: "layeredGraph",
    layout: "ranked",
    shape: "groups",
    rule: "stronglyConnectedComponents",
    directed: true,
    weighted: false,
    nodes: [
      {
        id: "1",
        label: "1",
        layer: 0,
        row: 0,
      },
      {
        id: "2",
        label: "2",
        layer: 1,
        row: 0,
      },
      {
        id: "3",
        label: "3",
        layer: 2,
        row: 0,
      },
      {
        id: "4",
        label: "4",
        layer: 3,
        row: 0,
      },
      {
        id: "5",
        label: "5",
        layer: 4,
        row: 0,
      },
    ],
    edges: [
      {
        id: "1>2",
        a: "1",
        b: "2",
        back: false,
      },
      {
        id: "2>3",
        a: "2",
        b: "3",
        back: false,
      },
      {
        id: "3>1",
        a: "3",
        b: "1",
        back: true,
      },
      {
        id: "3>4",
        a: "3",
        b: "4",
        back: false,
      },
      {
        id: "4>5",
        a: "4",
        b: "5",
        back: false,
      },
      {
        id: "5>4",
        a: "5",
        b: "4",
        back: true,
      },
    ],
    layers: [["1"], ["2"], ["3"], ["4"], ["5"]],
  },
  frames: [
    {
      event: "Try",
      caption: "Pass 1: visit 1.",
      focus: ["1"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
      },
      edges: {},
      groups: {},
      finish: [],
    },
    {
      event: "Try",
      caption: "Pass 1: visit 2.",
      focus: ["2"],
      nodes: {
        1: {
          state: "Covered",
        },
        2: {
          state: "ElementHighlight",
        },
      },
      edges: {},
      groups: {},
      finish: [],
    },
    {
      event: "Try",
      caption: "Pass 1: visit 3.",
      focus: ["3"],
      nodes: {
        1: {
          state: "Covered",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "ElementHighlight",
        },
      },
      edges: {},
      groups: {},
      finish: [],
    },
    {
      event: "Try",
      caption: "Pass 1: visit 4.",
      focus: ["4"],
      nodes: {
        1: {
          state: "Covered",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "Covered",
        },
        4: {
          state: "ElementHighlight",
        },
      },
      edges: {},
      groups: {},
      finish: [],
    },
    {
      event: "Try",
      caption: "Pass 1: visit 5.",
      focus: ["5"],
      nodes: {
        1: {
          state: "Covered",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "Covered",
        },
        4: {
          state: "Covered",
        },
        5: {
          state: "ElementHighlight",
        },
      },
      edges: {},
      groups: {},
      finish: [],
    },
    {
      event: "Try",
      caption: "Pass 1: 5 is finished (number 1).",
      focus: ["5"],
      nodes: {
        1: {
          state: "Covered",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "Covered",
        },
        4: {
          state: "Covered",
        },
        5: {
          state: "ElementHighlight",
        },
      },
      edges: {},
      groups: {},
      finish: ["5"],
    },
    {
      event: "Try",
      caption: "Pass 1: 4 is finished (number 2).",
      focus: ["4"],
      nodes: {
        1: {
          state: "Covered",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "Covered",
        },
        4: {
          state: "ElementHighlight",
        },
        5: {
          state: "Covered",
        },
      },
      edges: {},
      groups: {},
      finish: ["5", "4"],
    },
    {
      event: "Try",
      caption: "Pass 1: 3 is finished (number 3).",
      focus: ["3"],
      nodes: {
        1: {
          state: "Covered",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "ElementHighlight",
        },
        4: {
          state: "Covered",
        },
        5: {
          state: "Covered",
        },
      },
      edges: {},
      groups: {},
      finish: ["5", "4", "3"],
    },
    {
      event: "Try",
      caption: "Pass 1: 2 is finished (number 4).",
      focus: ["2"],
      nodes: {
        1: {
          state: "Covered",
        },
        2: {
          state: "ElementHighlight",
        },
        3: {
          state: "Covered",
        },
        4: {
          state: "Covered",
        },
        5: {
          state: "Covered",
        },
      },
      edges: {},
      groups: {},
      finish: ["5", "4", "3", "2"],
    },
    {
      event: "Try",
      caption: "Pass 1: 1 is finished (number 5).",
      focus: ["1"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "Covered",
        },
        4: {
          state: "Covered",
        },
        5: {
          state: "Covered",
        },
      },
      edges: {},
      groups: {},
      finish: ["5", "4", "3", "2", "1"],
    },
    {
      event: "Accept",
      caption: "Pass 2: 1 has the highest finish number left, so it starts component 1.",
      focus: ["1"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "Covered",
        },
        4: {
          state: "Covered",
        },
        5: {
          state: "Covered",
        },
      },
      edges: {},
      groups: {
        1: 0,
      },
      finish: ["5", "4", "3", "2", "1"],
    },
    {
      event: "Accept",
      caption: "Pass 2: follow the edge 3 → 1 backward, so 3 joins component 1.",
      focus: ["3", "3>1"],
      nodes: {
        2: {
          state: "Covered",
        },
        3: {
          state: "ElementHighlight",
        },
        4: {
          state: "Covered",
        },
        5: {
          state: "Covered",
        },
      },
      edges: {
        "3>1": {
          state: "ElementHighlight",
        },
      },
      groups: {
        1: 0,
        3: 0,
      },
      finish: ["5", "4", "3", "2", "1"],
    },
    {
      event: "Accept",
      caption: "Pass 2: follow the edge 2 → 3 backward, so 2 joins component 1.",
      focus: ["2", "2>3"],
      nodes: {
        2: {
          state: "ElementHighlight",
        },
        4: {
          state: "Covered",
        },
        5: {
          state: "Covered",
        },
      },
      edges: {
        "1>2": {
          state: "Committed",
        },
        "2>3": {
          state: "ElementHighlight",
        },
        "3>1": {
          state: "Committed",
        },
      },
      groups: {
        1: 0,
        2: 0,
        3: 0,
      },
      finish: ["5", "4", "3", "2", "1"],
    },
    {
      event: "Accept",
      caption: "Pass 2: 4 has the highest finish number left, so it starts component 2.",
      focus: ["4"],
      nodes: {
        4: {
          state: "ElementHighlight",
        },
        5: {
          state: "Covered",
        },
      },
      edges: {
        "1>2": {
          state: "Committed",
        },
        "2>3": {
          state: "Committed",
        },
        "3>1": {
          state: "Committed",
        },
      },
      groups: {
        1: 0,
        2: 0,
        3: 0,
        4: 1,
      },
      finish: ["5", "4", "3", "2", "1"],
    },
    {
      event: "Accept",
      caption: "Pass 2: follow the edge 5 → 4 backward, so 5 joins component 2.",
      focus: ["5", "5>4"],
      nodes: {
        5: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1>2": {
          state: "Solution",
        },
        "2>3": {
          state: "Solution",
        },
        "3>1": {
          state: "Solution",
        },
        "4>5": {
          state: "Solution",
        },
        "5>4": {
          state: "ElementHighlight",
        },
      },
      groups: {
        1: 0,
        2: 0,
        3: 0,
        4: 1,
        5: 1,
      },
      finish: ["5", "4", "3", "2", "1"],
    },
    {
      event: "Done",
      caption: "2 strongly connected components: {1,2,3}, {4,5}.",
      focus: [],
      nodes: {},
      edges: {
        "1>2": {
          state: "Solution",
        },
        "2>3": {
          state: "Solution",
        },
        "3>1": {
          state: "Solution",
        },
        "4>5": {
          state: "Solution",
        },
        "5>4": {
          state: "Solution",
        },
      },
      groups: {
        1: 0,
        2: 0,
        3: 0,
        4: 1,
        5: 1,
      },
      finish: ["5", "4", "3", "2", "1"],
      ok: true,
    },
  ],
};

/** format=frames, Single Source Shortest Path, ({1,2,3,4,5,6},{((1,2),4),((1,3),2),((3,2),1),((2,4),5),((3,4),8),((6,5),1)},1), SSSPSolver: distances shape; d = n under each node, ∞ until reached, 5 and 6 Untraveled at the end. */
export const SSSP_UNREACHABLE_LAYERED_FRAMES = {
  type: "LayeredGraph",
  payload: {
    kind: "layeredGraph",
    layout: "ranked",
    shape: "distances",
    rule: "singleSourceShortestPath",
    directed: true,
    weighted: true,
    nodes: [
      {
        id: "1",
        label: "1",
        layer: 0,
        row: 0,
      },
      {
        id: "2",
        label: "2",
        layer: 2,
        row: 0,
      },
      {
        id: "3",
        label: "3",
        layer: 1,
        row: 0,
      },
      {
        id: "4",
        label: "4",
        layer: 3,
        row: 0,
      },
      {
        id: "5",
        label: "5",
        layer: 1,
        row: 1,
      },
      {
        id: "6",
        label: "6",
        layer: 0,
        row: 1,
      },
    ],
    edges: [
      {
        id: "1>2",
        a: "1",
        b: "2",
        back: false,
        weight: 4,
      },
      {
        id: "1>3",
        a: "1",
        b: "3",
        back: false,
        weight: 2,
      },
      {
        id: "3>2",
        a: "3",
        b: "2",
        back: false,
        weight: 1,
      },
      {
        id: "2>4",
        a: "2",
        b: "4",
        back: false,
        weight: 5,
      },
      {
        id: "3>4",
        a: "3",
        b: "4",
        back: false,
        weight: 8,
      },
      {
        id: "6>5",
        a: "6",
        b: "5",
        back: false,
        weight: 1,
      },
    ],
    layers: [["1", "6"], ["3", "5"], ["2"], ["4"]],
    source: "1",
  },
  frames: [
    {
      event: "Try",
      caption: "Start at 1 with distance 0. Every other node starts at ∞.",
      focus: ["1"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
      },
      edges: {},
      dist: {
        1: 0,
        2: null,
        3: null,
        4: null,
        5: null,
        6: null,
      },
      pred: {},
    },
    {
      event: "Accept",
      caption: "Settle 1 at distance 0. Shorter routes found: 2: ∞ → 4, 3: ∞ → 2.",
      focus: ["1", "1>2", "1>3"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "Covered",
        },
      },
      edges: {
        "1>2": {
          state: "ElementHighlight",
        },
        "1>3": {
          state: "ElementHighlight",
        },
      },
      dist: {
        1: 0,
        2: 4,
        3: 2,
        4: null,
        5: null,
        6: null,
      },
      pred: {
        2: "1",
        3: "1",
      },
    },
    {
      event: "Accept",
      caption: "Settle 3 at distance 2. Shorter routes found: 2: 4 → 3, 4: ∞ → 10.",
      focus: ["3", "3>2", "3>4"],
      nodes: {
        1: {
          state: "Committed",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "ElementHighlight",
        },
        4: {
          state: "Covered",
        },
      },
      edges: {
        "1>3": {
          state: "Committed",
        },
        "3>2": {
          state: "ElementHighlight",
        },
        "3>4": {
          state: "ElementHighlight",
        },
      },
      dist: {
        1: 0,
        2: 3,
        3: 2,
        4: 10,
        5: null,
        6: null,
      },
      pred: {
        2: "3",
        3: "1",
        4: "3",
      },
    },
    {
      event: "Accept",
      caption: "Settle 2 at distance 3. Shorter routes found: 4: 10 → 8.",
      focus: ["2", "2>4"],
      nodes: {
        1: {
          state: "Committed",
        },
        2: {
          state: "ElementHighlight",
        },
        3: {
          state: "Committed",
        },
        4: {
          state: "Covered",
        },
      },
      edges: {
        "1>3": {
          state: "Committed",
        },
        "2>4": {
          state: "ElementHighlight",
        },
        "3>2": {
          state: "Committed",
        },
      },
      dist: {
        1: 0,
        2: 3,
        3: 2,
        4: 8,
        5: null,
        6: null,
      },
      pred: {
        2: "3",
        3: "1",
        4: "2",
      },
    },
    {
      event: "Accept",
      caption: "Settle 4 at distance 8. No shorter routes from here.",
      focus: ["4"],
      nodes: {
        1: {
          state: "Solution",
        },
        2: {
          state: "Solution",
        },
        3: {
          state: "Solution",
        },
        4: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1>3": {
          state: "Solution",
        },
        "2>4": {
          state: "Solution",
        },
        "3>2": {
          state: "Solution",
        },
      },
      dist: {
        1: 0,
        2: 3,
        3: 2,
        4: 8,
        5: null,
        6: null,
      },
      pred: {
        2: "3",
        3: "1",
        4: "2",
      },
    },
    {
      event: "Done",
      caption:
        "Every node that can be reached is settled; the shortest paths from 1 form a tree. 5 and 6 can't be reached.",
      focus: [],
      nodes: {
        1: {
          state: "Solution",
        },
        2: {
          state: "Solution",
        },
        3: {
          state: "Solution",
        },
        4: {
          state: "Solution",
        },
        5: {
          state: "Untraveled",
        },
        6: {
          state: "Untraveled",
        },
      },
      edges: {
        "1>3": {
          state: "Solution",
        },
        "2>4": {
          state: "Solution",
        },
        "3>2": {
          state: "Solution",
        },
      },
      dist: {
        1: 0,
        2: 3,
        3: 2,
        4: 8,
        5: null,
        6: null,
      },
      pred: {
        2: "3",
        3: "1",
        4: "2",
      },
      ok: true,
    },
  ],
};

/** format=frames, Single Pair Shortest Path, the problem default ({1,2,3,4,5},{((1,2),4),((1,3),2),((2,3),1),((3,5),7),((2,4),3),((4,5),9)},1,5), SPSPSolver: source and target tags, weights, only the path 1, 3, 5 as the answer. */
export const SPSP_LAYERED_FRAMES = {
  type: "LayeredGraph",
  payload: {
    kind: "layeredGraph",
    layout: "ranked",
    shape: "distances",
    rule: "singlePairShortestPath",
    directed: true,
    weighted: true,
    nodes: [
      {
        id: "1",
        label: "1",
        layer: 0,
        row: 0,
      },
      {
        id: "2",
        label: "2",
        layer: 1,
        row: 0,
      },
      {
        id: "3",
        label: "3",
        layer: 2,
        row: 0,
      },
      {
        id: "4",
        label: "4",
        layer: 2,
        row: 1,
      },
      {
        id: "5",
        label: "5",
        layer: 3,
        row: 0,
      },
    ],
    edges: [
      {
        id: "1>2",
        a: "1",
        b: "2",
        back: false,
        weight: 4,
      },
      {
        id: "1>3",
        a: "1",
        b: "3",
        back: false,
        weight: 2,
      },
      {
        id: "2>3",
        a: "2",
        b: "3",
        back: false,
        weight: 1,
      },
      {
        id: "3>5",
        a: "3",
        b: "5",
        back: false,
        weight: 7,
      },
      {
        id: "2>4",
        a: "2",
        b: "4",
        back: false,
        weight: 3,
      },
      {
        id: "4>5",
        a: "4",
        b: "5",
        back: false,
        weight: 9,
      },
    ],
    layers: [["1"], ["2"], ["3", "4"], ["5"]],
    source: "1",
    target: "5",
  },
  frames: [
    {
      event: "Try",
      caption: "Start at 1 with distance 0. Every other node starts at ∞.",
      focus: ["1"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
      },
      edges: {},
      dist: {
        1: 0,
        2: null,
        3: null,
        4: null,
        5: null,
      },
      pred: {},
    },
    {
      event: "Accept",
      caption: "Settle 1 at distance 0. Shorter routes found: 2: ∞ → 4, 3: ∞ → 2.",
      focus: ["1", "1>2", "1>3"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "Covered",
        },
      },
      edges: {
        "1>2": {
          state: "ElementHighlight",
        },
        "1>3": {
          state: "ElementHighlight",
        },
      },
      dist: {
        1: 0,
        2: 4,
        3: 2,
        4: null,
        5: null,
      },
      pred: {
        2: "1",
        3: "1",
      },
    },
    {
      event: "Accept",
      caption: "Settle 3 at distance 2. Shorter routes found: 5: ∞ → 9.",
      focus: ["3", "3>5"],
      nodes: {
        1: {
          state: "Committed",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "ElementHighlight",
        },
        5: {
          state: "Covered",
        },
      },
      edges: {
        "1>2": {
          state: "Covered",
        },
        "1>3": {
          state: "Committed",
        },
        "3>5": {
          state: "ElementHighlight",
        },
      },
      dist: {
        1: 0,
        2: 4,
        3: 2,
        4: null,
        5: 9,
      },
      pred: {
        2: "1",
        3: "1",
        5: "3",
      },
    },
    {
      event: "Accept",
      caption: "Settle 2 at distance 4. Shorter routes found: 4: ∞ → 7.",
      focus: ["2", "2>4"],
      nodes: {
        1: {
          state: "Committed",
        },
        2: {
          state: "ElementHighlight",
        },
        3: {
          state: "Committed",
        },
        4: {
          state: "Covered",
        },
        5: {
          state: "Covered",
        },
      },
      edges: {
        "1>2": {
          state: "Committed",
        },
        "1>3": {
          state: "Committed",
        },
        "2>4": {
          state: "ElementHighlight",
        },
        "3>5": {
          state: "Covered",
        },
      },
      dist: {
        1: 0,
        2: 4,
        3: 2,
        4: 7,
        5: 9,
      },
      pred: {
        2: "1",
        3: "1",
        4: "2",
        5: "3",
      },
    },
    {
      event: "Accept",
      caption: "Settle 4 at distance 7. No shorter routes from here.",
      focus: ["4", "4>5"],
      nodes: {
        1: {
          state: "Committed",
        },
        2: {
          state: "Committed",
        },
        3: {
          state: "Committed",
        },
        4: {
          state: "ElementHighlight",
        },
        5: {
          state: "Covered",
        },
      },
      edges: {
        "1>2": {
          state: "Committed",
        },
        "1>3": {
          state: "Committed",
        },
        "2>4": {
          state: "Committed",
        },
        "3>5": {
          state: "Covered",
        },
        "4>5": {
          state: "ElementHighlight",
        },
      },
      dist: {
        1: 0,
        2: 4,
        3: 2,
        4: 7,
        5: 9,
      },
      pred: {
        2: "1",
        3: "1",
        4: "2",
        5: "3",
      },
    },
    {
      event: "Accept",
      caption: "Settle 5 at distance 9. It is the target, so the search stops.",
      focus: ["5"],
      nodes: {
        1: {
          state: "Solution",
        },
        2: {
          state: "Solution",
        },
        3: {
          state: "Solution",
        },
        4: {
          state: "Solution",
        },
        5: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1>2": {
          state: "Solution",
        },
        "1>3": {
          state: "Solution",
        },
        "2>4": {
          state: "Solution",
        },
        "3>5": {
          state: "Solution",
        },
      },
      dist: {
        1: 0,
        2: 4,
        3: 2,
        4: 7,
        5: 9,
      },
      pred: {
        2: "1",
        3: "1",
        4: "2",
        5: "3",
      },
    },
    {
      event: "Done",
      caption: "The shortest path is 1 → 3 → 5, with total 9.",
      focus: [],
      nodes: {
        1: {
          state: "Solution",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "Solution",
        },
        4: {
          state: "Covered",
        },
        5: {
          state: "Solution",
        },
      },
      edges: {
        "1>3": {
          state: "Solution",
        },
        "3>5": {
          state: "Solution",
        },
      },
      dist: {
        1: 0,
        2: 4,
        3: 2,
        4: 7,
        5: 9,
      },
      pred: {
        2: "1",
        3: "1",
        4: "2",
        5: "3",
      },
      ok: true,
    },
  ],
};

/** format=frames, Single Source Shortest Path, ({1,2,3},{((1,2),5),((1,2),2),((2,3),1),((1,3),9)},1), SSSPSolver: parallel edges 1 to 2 merged into one edge labelled 5,2 (the lighter one counts), and an edge that skips a layer bowed. */
export const SSSP_PARALLEL_LAYERED_FRAMES = {
  type: "LayeredGraph",
  payload: {
    kind: "layeredGraph",
    layout: "ranked",
    shape: "distances",
    rule: "singleSourceShortestPath",
    directed: true,
    weighted: true,
    nodes: [
      {
        id: "1",
        label: "1",
        layer: 0,
        row: 0,
      },
      {
        id: "2",
        label: "2",
        layer: 1,
        row: 0,
      },
      {
        id: "3",
        label: "3",
        layer: 2,
        row: 0,
      },
    ],
    edges: [
      {
        id: "1>2",
        a: "1",
        b: "2",
        back: false,
        weight: 2,
        label: "5,2",
      },
      {
        id: "2>3",
        a: "2",
        b: "3",
        back: false,
        weight: 1,
      },
      {
        id: "1>3",
        a: "1",
        b: "3",
        back: false,
        weight: 9,
      },
    ],
    layers: [["1"], ["2"], ["3"]],
    source: "1",
  },
  frames: [
    {
      event: "Try",
      caption: "Start at 1 with distance 0. Every other node starts at ∞.",
      focus: ["1"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
      },
      edges: {},
      dist: {
        1: 0,
        2: null,
        3: null,
      },
      pred: {},
    },
    {
      event: "Accept",
      caption: "Settle 1 at distance 0. Shorter routes found: 2: ∞ → 5, 2: 5 → 2, 3: ∞ → 9.",
      focus: ["1", "1>2", "1>3"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
        2: {
          state: "Covered",
        },
        3: {
          state: "Covered",
        },
      },
      edges: {
        "1>2": {
          state: "ElementHighlight",
        },
        "1>3": {
          state: "ElementHighlight",
        },
      },
      dist: {
        1: 0,
        2: 2,
        3: 9,
      },
      pred: {
        2: "1",
        3: "1",
      },
    },
    {
      event: "Accept",
      caption: "Settle 2 at distance 2. Shorter routes found: 3: 9 → 3.",
      focus: ["2", "2>3"],
      nodes: {
        1: {
          state: "Committed",
        },
        2: {
          state: "ElementHighlight",
        },
        3: {
          state: "Covered",
        },
      },
      edges: {
        "1>2": {
          state: "Committed",
        },
        "2>3": {
          state: "ElementHighlight",
        },
      },
      dist: {
        1: 0,
        2: 2,
        3: 3,
      },
      pred: {
        2: "1",
        3: "2",
      },
    },
    {
      event: "Accept",
      caption: "Settle 3 at distance 3. No shorter routes from here.",
      focus: ["3"],
      nodes: {
        1: {
          state: "Solution",
        },
        2: {
          state: "Solution",
        },
        3: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1>2": {
          state: "Solution",
        },
        "2>3": {
          state: "Solution",
        },
      },
      dist: {
        1: 0,
        2: 2,
        3: 3,
      },
      pred: {
        2: "1",
        3: "2",
      },
    },
    {
      event: "Done",
      caption: "Every node that can be reached is settled; the shortest paths from 1 form a tree.",
      focus: [],
      nodes: {
        1: {
          state: "Solution",
        },
        2: {
          state: "Solution",
        },
        3: {
          state: "Solution",
        },
      },
      edges: {
        "1>2": {
          state: "Solution",
        },
        "2>3": {
          state: "Solution",
        },
      },
      dist: {
        1: 0,
        2: 2,
        3: 3,
      },
      pred: {
        2: "1",
        3: "2",
      },
      ok: true,
    },
  ],
};

// #204: Automaton pictures (DFA and NFA), captured the same way on 2026-10-15 from the published
// local build of local/viz-integration. (DFA_AUTOMATON_FRAMES above is the DFA default, DFASolver.)

// DFA Acceptance, DFASolver, instance (({1,2,3},{a,b},{(1,a,2),(2,b,3),(3,a,3)},1,{3}),abb): 1 has
// no move on b, 2 none on a, 3 none on b, so the payload has a Garbage state, and the run falls
// into it on the last b.
export const DFA_GARBAGE_AUTOMATON_FRAMES = {
  type: "Automaton",
  payload: {
    kind: "dfa",
    layout: "layered",
    states: [
      {
        id: "q:1",
        label: "1",
        layer: 0,
      },
      {
        id: "q:2",
        label: "2",
        layer: 1,
      },
      {
        id: "q:3",
        label: "3",
        layer: 2,
      },
    ],
    start: "q:1",
    accepting: ["q:3"],
    alphabet: ["a", "b"],
    transitions: [
      {
        id: "q:1>q:2",
        a: "q:1",
        b: "q:2",
        label: "a",
        symbols: ["a"],
        epsilon: false,
      },
      {
        id: "q:2>q:3",
        a: "q:2",
        b: "q:3",
        label: "b",
        symbols: ["b"],
        epsilon: false,
      },
      {
        id: "q:3>q:3",
        a: "q:3",
        b: "q:3",
        label: "a",
        symbols: ["a"],
        epsilon: false,
      },
    ],
    input: ["a", "b", "b"],
    garbage: {
      id: "garbage",
      label: "Garbage",
      missing: [
        {
          state: "q:1",
          symbol: "b",
        },
        {
          state: "q:2",
          symbol: "a",
        },
        {
          state: "q:3",
          symbol: "b",
        },
      ],
    },
  },
  frames: [
    {
      event: "Try",
      caption: "Start in 1.",
      focus: ["q:1"],
      position: 0,
      active: ["q:1"],
      nodes: {
        "q:1": {
          state: "ElementHighlight",
        },
      },
      edges: {},
    },
    {
      event: "Try",
      caption: "Read 'a': move from 1 to 2.",
      focus: ["q:1>q:2"],
      position: 1,
      active: ["q:2"],
      nodes: {
        "q:2": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:1>q:2": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Try",
      caption: "Read 'b': move from 2 to 3.",
      focus: ["q:2>q:3"],
      position: 2,
      active: ["q:3"],
      nodes: {
        "q:3": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:2>q:3": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Reject",
      caption: "3 has no move on 'b', so the DFA falls into the Garbage state and stays there.",
      focus: ["garbage"],
      position: 2,
      active: ["garbage"],
      nodes: {
        garbage: {
          state: "Rejected",
        },
      },
      edges: {},
    },
    {
      event: "Done",
      caption: "Rejected: 3 has no move on 'b', so the run ends in the Garbage state.",
      focus: [],
      position: 2,
      active: ["garbage"],
      nodes: {
        garbage: {
          state: "Rejected",
        },
      },
      edges: {},
      ok: false,
    },
  ],
};

// DFA Acceptance, DFASolver, the DFA default instance on abc:
// (({1,2,3},{a,b},{(1,a,2),(1,b,3),(2,a,2),(2,b,2),(3,a,2),(3,b,3)},1,{2}),abc). The machine is
// complete, but c is not in the alphabet: 2 has no move on it, so the payload has a Garbage state
// whose only missing move is (2, c), and the run falls into it on the c. Captured on 2026-10-15
// from the published local build of local/viz-integration.
export const DFA_ABC_GARBAGE_AUTOMATON_FRAMES = {
  type: "Automaton",
  payload: {
    kind: "dfa",
    layout: "layered",
    states: [
      {
        id: "q:1",
        label: "1",
        layer: 0,
      },
      {
        id: "q:2",
        label: "2",
        layer: 1,
      },
      {
        id: "q:3",
        label: "3",
        layer: 1,
      },
    ],
    start: "q:1",
    accepting: ["q:2"],
    alphabet: ["a", "b"],
    transitions: [
      {
        id: "q:1>q:2",
        a: "q:1",
        b: "q:2",
        label: "a",
        symbols: ["a"],
        epsilon: false,
      },
      {
        id: "q:1>q:3",
        a: "q:1",
        b: "q:3",
        label: "b",
        symbols: ["b"],
        epsilon: false,
      },
      {
        id: "q:2>q:2",
        a: "q:2",
        b: "q:2",
        label: "a,b",
        symbols: ["a", "b"],
        epsilon: false,
      },
      {
        id: "q:3>q:2",
        a: "q:3",
        b: "q:2",
        label: "a",
        symbols: ["a"],
        epsilon: false,
      },
      {
        id: "q:3>q:3",
        a: "q:3",
        b: "q:3",
        label: "b",
        symbols: ["b"],
        epsilon: false,
      },
    ],
    input: ["a", "b", "c"],
    garbage: {
      id: "garbage",
      label: "Garbage",
      missing: [
        {
          state: "q:2",
          symbol: "c",
        },
      ],
    },
  },
  frames: [
    {
      event: "Try",
      caption: "Start in 1.",
      focus: ["q:1"],
      position: 0,
      active: ["q:1"],
      nodes: {
        "q:1": {
          state: "ElementHighlight",
        },
      },
      edges: {},
    },
    {
      event: "Try",
      caption: "Read 'a': move from 1 to 2.",
      focus: ["q:1>q:2"],
      position: 1,
      active: ["q:2"],
      nodes: {
        "q:2": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:1>q:2": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Try",
      caption: "Read 'b': move from 2 to 2.",
      focus: ["q:2>q:2"],
      position: 2,
      active: ["q:2"],
      nodes: {
        "q:2": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:2>q:2": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Reject",
      caption:
        "'c' is not in the alphabet, so 2 has no move on it, and the DFA falls into the Garbage state and stays there.",
      focus: ["garbage"],
      position: 2,
      active: ["garbage"],
      nodes: {
        garbage: {
          state: "Rejected",
        },
      },
      edges: {},
    },
    {
      event: "Done",
      caption:
        "Rejected: 'c' is not in the alphabet, so 2 has no move on it and the run ends in the Garbage state.",
      focus: [],
      position: 2,
      active: ["garbage"],
      nodes: {
        garbage: {
          state: "Rejected",
        },
        "q:3": {
          state: "Untraveled",
        },
      },
      edges: {},
      ok: false,
    },
  ],
};

// NFA Acceptance, NFASubsetSolver (every active state at once), instance
// (({0,1,2,3},{a,b},{(0,ε,1),(0,a,0),(0,b,0),(1,a,2),(2,b,3)},0,{3}),aab): an ε-move from 0 to 1;
// accepted, with four paths for the picker.
export const NFA_SUBSET_AUTOMATON_FRAMES = {
  type: "Automaton",
  payload: {
    kind: "nfa",
    layout: "layered",
    states: [
      {
        id: "q:0",
        label: "0",
        layer: 0,
      },
      {
        id: "q:1",
        label: "1",
        layer: 1,
      },
      {
        id: "q:2",
        label: "2",
        layer: 2,
      },
      {
        id: "q:3",
        label: "3",
        layer: 3,
      },
    ],
    start: "q:0",
    accepting: ["q:3"],
    alphabet: ["a", "b"],
    transitions: [
      {
        id: "q:0>q:1",
        a: "q:0",
        b: "q:1",
        label: "ε",
        symbols: ["ε"],
        epsilon: true,
      },
      {
        id: "q:0>q:0",
        a: "q:0",
        b: "q:0",
        label: "a,b",
        symbols: ["a", "b"],
        epsilon: false,
      },
      {
        id: "q:1>q:2",
        a: "q:1",
        b: "q:2",
        label: "a",
        symbols: ["a"],
        epsilon: false,
      },
      {
        id: "q:2>q:3",
        a: "q:2",
        b: "q:3",
        label: "b",
        symbols: ["b"],
        epsilon: false,
      },
    ],
    input: ["a", "a", "b"],
    paths: [
      {
        id: "p1",
        label: "Path 1: 0 → 0 ⇢ 1 → 2 → 3, accepts",
        accepted: true,
        outcome: "accepts",
        frames: [
          {
            event: "Try",
            caption: "Start in 0.",
            focus: ["q:0"],
            position: 0,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {},
          },
          {
            event: "Try",
            caption: "Read 'a': move from 0 to 0.",
            focus: ["q:0>q:0"],
            position: 1,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:0": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Take an ε-move from 0 to 1.",
            focus: ["q:0>q:1"],
            position: 1,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:1": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'a': move from 1 to 2.",
            focus: ["q:1>q:2"],
            position: 2,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:1>q:2": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'b': move from 2 to 3.",
            focus: ["q:2>q:3"],
            position: 3,
            active: ["q:3"],
            nodes: {
              "q:3": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:2>q:3": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Done",
            caption: "This path ends in 3, an accept state. Accepted.",
            focus: [],
            position: 3,
            active: ["q:3"],
            nodes: {
              "q:3": {
                state: "Solution",
              },
            },
            edges: {},
            ok: true,
          },
        ],
      },
      {
        id: "p2",
        label: "Path 2: 0 ⇢ 1 → 2, dies at symbol 2",
        accepted: false,
        outcome: "dies",
        frames: [
          {
            event: "Try",
            caption: "Start in 0.",
            focus: ["q:0"],
            position: 0,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {},
          },
          {
            event: "Try",
            caption: "Take an ε-move from 0 to 1.",
            focus: ["q:0>q:1"],
            position: 0,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:1": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'a': move from 1 to 2.",
            focus: ["q:1>q:2"],
            position: 1,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:1>q:2": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Done",
            caption: "No 'a' move from 2, so this path dies. Rejected.",
            focus: [],
            position: 1,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "Rejected",
              },
              "q:3": {
                state: "Untraveled",
              },
            },
            edges: {},
            ok: false,
          },
        ],
      },
      {
        id: "p3",
        label: "Path 3: 0 → 0 → 0 ⇢ 1, dies at symbol 3",
        accepted: false,
        outcome: "dies",
        frames: [
          {
            event: "Try",
            caption: "Start in 0.",
            focus: ["q:0"],
            position: 0,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {},
          },
          {
            event: "Try",
            caption: "Read 'a': move from 0 to 0.",
            focus: ["q:0>q:0"],
            position: 1,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:0": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'a': move from 0 to 0.",
            focus: ["q:0>q:0"],
            position: 2,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:0": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Take an ε-move from 0 to 1.",
            focus: ["q:0>q:1"],
            position: 2,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:1": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Done",
            caption: "No 'b' move from 1, so this path dies. Rejected.",
            focus: [],
            position: 2,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "Rejected",
              },
              "q:2": {
                state: "Untraveled",
              },
              "q:3": {
                state: "Untraveled",
              },
            },
            edges: {},
            ok: false,
          },
        ],
      },
      {
        id: "p4",
        label: "Path 4: 0 → 0 → 0 → 0 ⇢ 1, rejects",
        accepted: false,
        outcome: "rejects",
        frames: [
          {
            event: "Try",
            caption: "Start in 0.",
            focus: ["q:0"],
            position: 0,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {},
          },
          {
            event: "Try",
            caption: "Read 'a': move from 0 to 0.",
            focus: ["q:0>q:0"],
            position: 1,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:0": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'a': move from 0 to 0.",
            focus: ["q:0>q:0"],
            position: 2,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:0": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'b': move from 0 to 0.",
            focus: ["q:0>q:0"],
            position: 3,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:0": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Take an ε-move from 0 to 1.",
            focus: ["q:0>q:1"],
            position: 3,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:1": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Done",
            caption: "This path ends in 1, which is not an accept state. Rejected.",
            focus: [],
            position: 3,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "Rejected",
              },
              "q:2": {
                state: "Untraveled",
              },
              "q:3": {
                state: "Untraveled",
              },
            },
            edges: {},
            ok: false,
          },
        ],
      },
    ],
    pathsTruncated: false,
  },
  frames: [
    {
      event: "Try",
      caption: "Start in 0, and follow ε to 1. The active states are {0, 1}.",
      focus: ["q:0", "q:0>q:1"],
      position: 0,
      active: ["q:0", "q:1"],
      nodes: {
        "q:0": {
          state: "ElementHighlight",
        },
        "q:1": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:1": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Try",
      caption: "Read 'a'. The active states are now {0, 2, 1}, including ε moves.",
      focus: ["q:0>q:0", "q:1>q:2", "q:0>q:1"],
      position: 1,
      active: ["q:0", "q:1", "q:2"],
      nodes: {
        "q:0": {
          state: "ElementHighlight",
        },
        "q:1": {
          state: "ElementHighlight",
        },
        "q:2": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:0": {
          state: "ElementHighlight",
        },
        "q:0>q:1": {
          state: "ElementHighlight",
        },
        "q:1>q:2": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Try",
      caption: "Read 'a'. The active states are now {0, 2, 1}, including ε moves.",
      focus: ["q:0>q:0", "q:1>q:2", "q:0>q:1"],
      position: 2,
      active: ["q:0", "q:1", "q:2"],
      nodes: {
        "q:0": {
          state: "ElementHighlight",
        },
        "q:1": {
          state: "ElementHighlight",
        },
        "q:2": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:0": {
          state: "ElementHighlight",
        },
        "q:0>q:1": {
          state: "ElementHighlight",
        },
        "q:1>q:2": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Try",
      caption: "Read 'b'. The active states are now {0, 3, 1}, including ε moves.",
      focus: ["q:0>q:0", "q:2>q:3", "q:0>q:1"],
      position: 3,
      active: ["q:0", "q:1", "q:3"],
      nodes: {
        "q:0": {
          state: "ElementHighlight",
        },
        "q:1": {
          state: "ElementHighlight",
        },
        "q:3": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:0": {
          state: "ElementHighlight",
        },
        "q:0>q:1": {
          state: "ElementHighlight",
        },
        "q:2>q:3": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Accept",
      caption:
        "The input is used up with {0, 3, 1} active; 3 is an accept state, so a run accepts.",
      focus: ["q:3"],
      position: 3,
      active: ["q:3"],
      nodes: {
        "q:3": {
          state: "Solution",
        },
      },
      edges: {},
    },
    {
      event: "Done",
      caption: "Accepted: a run ends in an accept state.",
      focus: [],
      position: 3,
      active: ["q:3"],
      nodes: {
        "q:3": {
          state: "Solution",
        },
      },
      edges: {},
      ok: true,
    },
  ],
};

// NFA Acceptance, NFASolver (backtracking, one branch at a time), the same machine on aba:
// rejected; its Done frame has no active state.
export const NFA_BACKTRACK_REJECTED_AUTOMATON_FRAMES = {
  type: "Automaton",
  payload: {
    kind: "nfa",
    layout: "layered",
    states: [
      {
        id: "q:0",
        label: "0",
        layer: 0,
      },
      {
        id: "q:1",
        label: "1",
        layer: 1,
      },
      {
        id: "q:2",
        label: "2",
        layer: 2,
      },
      {
        id: "q:3",
        label: "3",
        layer: 3,
      },
    ],
    start: "q:0",
    accepting: ["q:3"],
    alphabet: ["a", "b"],
    transitions: [
      {
        id: "q:0>q:1",
        a: "q:0",
        b: "q:1",
        label: "ε",
        symbols: ["ε"],
        epsilon: true,
      },
      {
        id: "q:0>q:0",
        a: "q:0",
        b: "q:0",
        label: "a,b",
        symbols: ["a", "b"],
        epsilon: false,
      },
      {
        id: "q:1>q:2",
        a: "q:1",
        b: "q:2",
        label: "a",
        symbols: ["a"],
        epsilon: false,
      },
      {
        id: "q:2>q:3",
        a: "q:2",
        b: "q:3",
        label: "b",
        symbols: ["b"],
        epsilon: false,
      },
    ],
    input: ["a", "b", "a"],
    paths: [
      {
        id: "p1",
        label: "Path 1: 0 ⇢ 1 → 2 → 3, dies at symbol 3",
        accepted: false,
        outcome: "dies",
        frames: [
          {
            event: "Try",
            caption: "Start in 0.",
            focus: ["q:0"],
            position: 0,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {},
          },
          {
            event: "Try",
            caption: "Take an ε-move from 0 to 1.",
            focus: ["q:0>q:1"],
            position: 0,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:1": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'a': move from 1 to 2.",
            focus: ["q:1>q:2"],
            position: 1,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:1>q:2": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'b': move from 2 to 3.",
            focus: ["q:2>q:3"],
            position: 2,
            active: ["q:3"],
            nodes: {
              "q:3": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:2>q:3": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Done",
            caption: "No 'a' move from 3, so this path dies. Rejected.",
            focus: [],
            position: 2,
            active: ["q:3"],
            nodes: {
              "q:3": {
                state: "Rejected",
              },
            },
            edges: {},
            ok: false,
          },
        ],
      },
      {
        id: "p2",
        label: "Path 2: 0 → 0 ⇢ 1, dies at symbol 2",
        accepted: false,
        outcome: "dies",
        frames: [
          {
            event: "Try",
            caption: "Start in 0.",
            focus: ["q:0"],
            position: 0,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {},
          },
          {
            event: "Try",
            caption: "Read 'a': move from 0 to 0.",
            focus: ["q:0>q:0"],
            position: 1,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:0": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Take an ε-move from 0 to 1.",
            focus: ["q:0>q:1"],
            position: 1,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:1": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Done",
            caption: "No 'b' move from 1, so this path dies. Rejected.",
            focus: [],
            position: 1,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "Rejected",
              },
              "q:2": {
                state: "Untraveled",
              },
              "q:3": {
                state: "Untraveled",
              },
            },
            edges: {},
            ok: false,
          },
        ],
      },
      {
        id: "p3",
        label: "Path 3: 0 → 0 → 0 ⇢ 1 → 2, rejects",
        accepted: false,
        outcome: "rejects",
        frames: [
          {
            event: "Try",
            caption: "Start in 0.",
            focus: ["q:0"],
            position: 0,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {},
          },
          {
            event: "Try",
            caption: "Read 'a': move from 0 to 0.",
            focus: ["q:0>q:0"],
            position: 1,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:0": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'b': move from 0 to 0.",
            focus: ["q:0>q:0"],
            position: 2,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:0": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Take an ε-move from 0 to 1.",
            focus: ["q:0>q:1"],
            position: 2,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:1": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'a': move from 1 to 2.",
            focus: ["q:1>q:2"],
            position: 3,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:1>q:2": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Done",
            caption: "This path ends in 2, which is not an accept state. Rejected.",
            focus: [],
            position: 3,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "Rejected",
              },
              "q:3": {
                state: "Untraveled",
              },
            },
            edges: {},
            ok: false,
          },
        ],
      },
      {
        id: "p4",
        label: "Path 4: 0 → 0 → 0 → 0 ⇢ 1, rejects",
        accepted: false,
        outcome: "rejects",
        frames: [
          {
            event: "Try",
            caption: "Start in 0.",
            focus: ["q:0"],
            position: 0,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {},
          },
          {
            event: "Try",
            caption: "Read 'a': move from 0 to 0.",
            focus: ["q:0>q:0"],
            position: 1,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:0": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'b': move from 0 to 0.",
            focus: ["q:0>q:0"],
            position: 2,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:0": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'a': move from 0 to 0.",
            focus: ["q:0>q:0"],
            position: 3,
            active: ["q:0"],
            nodes: {
              "q:0": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:0": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Take an ε-move from 0 to 1.",
            focus: ["q:0>q:1"],
            position: 3,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:0>q:1": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Done",
            caption: "This path ends in 1, which is not an accept state. Rejected.",
            focus: [],
            position: 3,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "Rejected",
              },
              "q:2": {
                state: "Untraveled",
              },
              "q:3": {
                state: "Untraveled",
              },
            },
            edges: {},
            ok: false,
          },
        ],
      },
    ],
    pathsTruncated: false,
  },
  frames: [
    {
      event: "Try",
      caption: "Start in 0.",
      focus: ["q:0"],
      position: 0,
      active: ["q:0"],
      nodes: {
        "q:0": {
          state: "ElementHighlight",
        },
      },
      edges: {},
    },
    {
      event: "Try",
      caption: "Take an ε-move from 0 to 1.",
      focus: ["q:0>q:1"],
      position: 0,
      active: ["q:1"],
      nodes: {
        "q:1": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:1": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Try",
      caption: "Read 'a': move from 1 to 2.",
      focus: ["q:1>q:2"],
      position: 1,
      active: ["q:2"],
      nodes: {
        "q:2": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:1>q:2": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Try",
      caption: "Read 'b': move from 2 to 3.",
      focus: ["q:2>q:3"],
      position: 2,
      active: ["q:3"],
      nodes: {
        "q:3": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:2>q:3": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Reject",
      caption: "3 has no move on 'a': this run is a dead end.",
      focus: ["q:3"],
      position: 2,
      active: ["q:3"],
      nodes: {
        "q:3": {
          state: "Rejected",
        },
      },
      edges: {},
    },
    {
      event: "Backtrack",
      caption: "Back out of 3 to 2 to try another move.",
      focus: ["q:2>q:3"],
      position: 1,
      active: ["q:2"],
      nodes: {
        "q:2": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:2>q:3": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Backtrack",
      caption: "Back out of 2 to 1 to try another move.",
      focus: ["q:1>q:2"],
      position: 0,
      active: ["q:1"],
      nodes: {
        "q:1": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:1>q:2": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Backtrack",
      caption: "Back out of 1 to 0 to try another move.",
      focus: ["q:0>q:1"],
      position: 0,
      active: ["q:0"],
      nodes: {
        "q:0": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:1": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Try",
      caption: "Read 'a': move from 0 to 0.",
      focus: ["q:0>q:0"],
      position: 1,
      active: ["q:0"],
      nodes: {
        "q:0": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:0": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Try",
      caption: "Take an ε-move from 0 to 1.",
      focus: ["q:0>q:1"],
      position: 1,
      active: ["q:1"],
      nodes: {
        "q:1": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:1": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Reject",
      caption: "1 has no move on 'b': this run is a dead end.",
      focus: ["q:1"],
      position: 1,
      active: ["q:1"],
      nodes: {
        "q:1": {
          state: "Rejected",
        },
      },
      edges: {},
    },
    {
      event: "Backtrack",
      caption: "Back out of 1 to 0 to try another move.",
      focus: ["q:0>q:1"],
      position: 1,
      active: ["q:0"],
      nodes: {
        "q:0": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:1": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Try",
      caption: "Read 'b': move from 0 to 0.",
      focus: ["q:0>q:0"],
      position: 2,
      active: ["q:0"],
      nodes: {
        "q:0": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:0": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Try",
      caption: "Take an ε-move from 0 to 1.",
      focus: ["q:0>q:1"],
      position: 2,
      active: ["q:1"],
      nodes: {
        "q:1": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:1": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Try",
      caption: "Read 'a': move from 1 to 2.",
      focus: ["q:1>q:2"],
      position: 3,
      active: ["q:2"],
      nodes: {
        "q:2": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:1>q:2": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Reject",
      caption: "The input is used up in 2, which is not an accept state: this run is a dead end.",
      focus: ["q:2"],
      position: 3,
      active: ["q:2"],
      nodes: {
        "q:2": {
          state: "Rejected",
        },
      },
      edges: {},
    },
    {
      event: "Backtrack",
      caption: "Back out of 2 to 1 to try another move.",
      focus: ["q:1>q:2"],
      position: 2,
      active: ["q:1"],
      nodes: {
        "q:1": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:1>q:2": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Backtrack",
      caption: "Back out of 1 to 0 to try another move.",
      focus: ["q:0>q:1"],
      position: 2,
      active: ["q:0"],
      nodes: {
        "q:0": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:1": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Try",
      caption: "Read 'a': move from 0 to 0.",
      focus: ["q:0>q:0"],
      position: 3,
      active: ["q:0"],
      nodes: {
        "q:0": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:0": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Try",
      caption: "Take an ε-move from 0 to 1.",
      focus: ["q:0>q:1"],
      position: 3,
      active: ["q:1"],
      nodes: {
        "q:1": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:1": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Reject",
      caption: "The input is used up in 1, which is not an accept state: this run is a dead end.",
      focus: ["q:1"],
      position: 3,
      active: ["q:1"],
      nodes: {
        "q:1": {
          state: "Rejected",
        },
      },
      edges: {},
    },
    {
      event: "Backtrack",
      caption: "Back out of 1 to 0 to try another move.",
      focus: ["q:0>q:1"],
      position: 3,
      active: ["q:0"],
      nodes: {
        "q:0": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:1": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Backtrack",
      caption: "Back out of 0 to 0 to try another move.",
      focus: ["q:0>q:0"],
      position: 2,
      active: ["q:0"],
      nodes: {
        "q:0": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:0": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Backtrack",
      caption: "Back out of 0 to 0 to try another move.",
      focus: ["q:0>q:0"],
      position: 1,
      active: ["q:0"],
      nodes: {
        "q:0": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:0": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Backtrack",
      caption: "Back out of 0 to 0 to try another move.",
      focus: ["q:0>q:0"],
      position: 0,
      active: ["q:0"],
      nodes: {
        "q:0": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:0>q:0": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Done",
      caption: "Rejected: no run accepts the input.",
      focus: [],
      position: 3,
      active: [],
      nodes: {},
      edges: {},
      ok: false,
    },
  ],
};

// NFA Acceptance, NFASubsetSolver, the problem default instance
// (({1,2,3},{a,b},{(1,a,2),(1,ε,2),(1,b,3),(2,a,2),(2,ε,3),(2,b,2),(3,a,2),(3,b,3)},1,{2}),a): an
// arrow that reads a and ε (1>2), loops, opposite arrows, and six paths.
export const NFA_DEFAULT_AUTOMATON_FRAMES = {
  type: "Automaton",
  payload: {
    kind: "nfa",
    layout: "layered",
    states: [
      {
        id: "q:1",
        label: "1",
        layer: 0,
      },
      {
        id: "q:2",
        label: "2",
        layer: 1,
      },
      {
        id: "q:3",
        label: "3",
        layer: 1,
      },
    ],
    start: "q:1",
    accepting: ["q:2"],
    alphabet: ["a", "b"],
    transitions: [
      {
        id: "q:1>q:2",
        a: "q:1",
        b: "q:2",
        label: "a,ε",
        symbols: ["a", "ε"],
        epsilon: false,
      },
      {
        id: "q:1>q:3",
        a: "q:1",
        b: "q:3",
        label: "b",
        symbols: ["b"],
        epsilon: false,
      },
      {
        id: "q:2>q:2",
        a: "q:2",
        b: "q:2",
        label: "a,b",
        symbols: ["a", "b"],
        epsilon: false,
      },
      {
        id: "q:2>q:3",
        a: "q:2",
        b: "q:3",
        label: "ε",
        symbols: ["ε"],
        epsilon: true,
      },
      {
        id: "q:3>q:2",
        a: "q:3",
        b: "q:2",
        label: "a",
        symbols: ["a"],
        epsilon: false,
      },
      {
        id: "q:3>q:3",
        a: "q:3",
        b: "q:3",
        label: "b",
        symbols: ["b"],
        epsilon: false,
      },
    ],
    input: ["a"],
    paths: [
      {
        id: "p1",
        label: "Path 1: 1 ⇢ 2 ⇢ 3 → 2, accepts",
        accepted: true,
        outcome: "accepts",
        frames: [
          {
            event: "Try",
            caption: "Start in 1.",
            focus: ["q:1"],
            position: 0,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "ElementHighlight",
              },
            },
            edges: {},
          },
          {
            event: "Try",
            caption: "Take an ε-move from 1 to 2.",
            focus: ["q:1>q:2"],
            position: 0,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:1>q:2": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Take an ε-move from 2 to 3.",
            focus: ["q:2>q:3"],
            position: 0,
            active: ["q:3"],
            nodes: {
              "q:3": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:2>q:3": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'a': move from 3 to 2.",
            focus: ["q:3>q:2"],
            position: 1,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:3>q:2": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Done",
            caption: "This path ends in 2, an accept state. Accepted.",
            focus: [],
            position: 1,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "Solution",
              },
            },
            edges: {},
            ok: true,
          },
        ],
      },
      {
        id: "p2",
        label: "Path 2: 1 ⇢ 2 → 2, accepts",
        accepted: true,
        outcome: "accepts",
        frames: [
          {
            event: "Try",
            caption: "Start in 1.",
            focus: ["q:1"],
            position: 0,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "ElementHighlight",
              },
            },
            edges: {},
          },
          {
            event: "Try",
            caption: "Take an ε-move from 1 to 2.",
            focus: ["q:1>q:2"],
            position: 0,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:1>q:2": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'a': move from 2 to 2.",
            focus: ["q:2>q:2"],
            position: 1,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:2>q:2": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Done",
            caption: "This path ends in 2, an accept state. Accepted.",
            focus: [],
            position: 1,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "Solution",
              },
              "q:3": {
                state: "Untraveled",
              },
            },
            edges: {},
            ok: true,
          },
        ],
      },
      {
        id: "p3",
        label: "Path 3: 1 → 2, accepts",
        accepted: true,
        outcome: "accepts",
        frames: [
          {
            event: "Try",
            caption: "Start in 1.",
            focus: ["q:1"],
            position: 0,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "ElementHighlight",
              },
            },
            edges: {},
          },
          {
            event: "Try",
            caption: "Read 'a': move from 1 to 2.",
            focus: ["q:1>q:2"],
            position: 1,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:1>q:2": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Done",
            caption: "This path ends in 2, an accept state. Accepted.",
            focus: [],
            position: 1,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "Solution",
              },
              "q:3": {
                state: "Untraveled",
              },
            },
            edges: {},
            ok: true,
          },
        ],
      },
      {
        id: "p4",
        label: "Path 4: 1 ⇢ 2 ⇢ 3 → 2 ⇢ 3, rejects",
        accepted: false,
        outcome: "rejects",
        frames: [
          {
            event: "Try",
            caption: "Start in 1.",
            focus: ["q:1"],
            position: 0,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "ElementHighlight",
              },
            },
            edges: {},
          },
          {
            event: "Try",
            caption: "Take an ε-move from 1 to 2.",
            focus: ["q:1>q:2"],
            position: 0,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:1>q:2": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Take an ε-move from 2 to 3.",
            focus: ["q:2>q:3"],
            position: 0,
            active: ["q:3"],
            nodes: {
              "q:3": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:2>q:3": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'a': move from 3 to 2.",
            focus: ["q:3>q:2"],
            position: 1,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:3>q:2": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Take an ε-move from 2 to 3.",
            focus: ["q:2>q:3"],
            position: 1,
            active: ["q:3"],
            nodes: {
              "q:3": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:2>q:3": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Done",
            caption: "This path ends in 3, which is not an accept state. Rejected.",
            focus: [],
            position: 1,
            active: ["q:3"],
            nodes: {
              "q:3": {
                state: "Rejected",
              },
            },
            edges: {},
            ok: false,
          },
        ],
      },
      {
        id: "p5",
        label: "Path 5: 1 ⇢ 2 → 2 ⇢ 3, rejects",
        accepted: false,
        outcome: "rejects",
        frames: [
          {
            event: "Try",
            caption: "Start in 1.",
            focus: ["q:1"],
            position: 0,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "ElementHighlight",
              },
            },
            edges: {},
          },
          {
            event: "Try",
            caption: "Take an ε-move from 1 to 2.",
            focus: ["q:1>q:2"],
            position: 0,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:1>q:2": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Read 'a': move from 2 to 2.",
            focus: ["q:2>q:2"],
            position: 1,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:2>q:2": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Take an ε-move from 2 to 3.",
            focus: ["q:2>q:3"],
            position: 1,
            active: ["q:3"],
            nodes: {
              "q:3": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:2>q:3": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Done",
            caption: "This path ends in 3, which is not an accept state. Rejected.",
            focus: [],
            position: 1,
            active: ["q:3"],
            nodes: {
              "q:3": {
                state: "Rejected",
              },
            },
            edges: {},
            ok: false,
          },
        ],
      },
      {
        id: "p6",
        label: "Path 6: 1 → 2 ⇢ 3, rejects",
        accepted: false,
        outcome: "rejects",
        frames: [
          {
            event: "Try",
            caption: "Start in 1.",
            focus: ["q:1"],
            position: 0,
            active: ["q:1"],
            nodes: {
              "q:1": {
                state: "ElementHighlight",
              },
            },
            edges: {},
          },
          {
            event: "Try",
            caption: "Read 'a': move from 1 to 2.",
            focus: ["q:1>q:2"],
            position: 1,
            active: ["q:2"],
            nodes: {
              "q:2": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:1>q:2": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Try",
            caption: "Take an ε-move from 2 to 3.",
            focus: ["q:2>q:3"],
            position: 1,
            active: ["q:3"],
            nodes: {
              "q:3": {
                state: "ElementHighlight",
              },
            },
            edges: {
              "q:2>q:3": {
                state: "ElementHighlight",
              },
            },
          },
          {
            event: "Done",
            caption: "This path ends in 3, which is not an accept state. Rejected.",
            focus: [],
            position: 1,
            active: ["q:3"],
            nodes: {
              "q:3": {
                state: "Rejected",
              },
            },
            edges: {},
            ok: false,
          },
        ],
      },
    ],
    pathsTruncated: false,
  },
  frames: [
    {
      event: "Try",
      caption: "Start in 1, and follow ε to 2 and 3. The active states are {1, 2, 3}.",
      focus: ["q:1", "q:1>q:2", "q:2>q:3"],
      position: 0,
      active: ["q:1", "q:2", "q:3"],
      nodes: {
        "q:1": {
          state: "ElementHighlight",
        },
        "q:2": {
          state: "ElementHighlight",
        },
        "q:3": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:1>q:2": {
          state: "ElementHighlight",
        },
        "q:2>q:3": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Try",
      caption: "Read 'a'. The active states are now {2, 3}, including ε moves.",
      focus: ["q:1>q:2", "q:2>q:2", "q:3>q:2", "q:2>q:3"],
      position: 1,
      active: ["q:2", "q:3"],
      nodes: {
        "q:2": {
          state: "ElementHighlight",
        },
        "q:3": {
          state: "ElementHighlight",
        },
      },
      edges: {
        "q:1>q:2": {
          state: "ElementHighlight",
        },
        "q:2>q:2": {
          state: "ElementHighlight",
        },
        "q:2>q:3": {
          state: "ElementHighlight",
        },
        "q:3>q:2": {
          state: "ElementHighlight",
        },
      },
    },
    {
      event: "Accept",
      caption: "The input is used up with {2, 3} active; 2 is an accept state, so a run accepts.",
      focus: ["q:2"],
      position: 1,
      active: ["q:2"],
      nodes: {
        "q:2": {
          state: "Solution",
        },
      },
      edges: {},
    },
    {
      event: "Done",
      caption: "Accepted: a run ends in an accept state.",
      focus: [],
      position: 1,
      active: ["q:2"],
      nodes: {
        "q:2": {
          state: "Solution",
        },
      },
      edges: {},
      ok: true,
    },
  ],
};

// #206: Flow Network pictures (Minimum S-T Cut, MinSTCutSolver: Edmonds-Karp), captured the same
// way on 2026-10-15 from the published local build of local/viz-integration.

// The problem default instance ({1,2,3,4},{((1,2),10),((1,3),2),((2,4),3),((3,4),5)},1,4): two
// augmenting paths, then the cut S = {1,2}.
export const MIN_CUT_FLOW_FRAMES = {
  type: "FlowNetwork",
  payload: {
    kind: "flowNetwork",
    layout: "sourceToSink",
    rule: "minimumSTCut",
    source: "1",
    sink: "4",
    nodes: [
      {
        id: "1",
        label: "1",
        layer: 0,
        row: 0,
      },
      {
        id: "2",
        label: "2",
        layer: 1,
        row: 0,
      },
      {
        id: "3",
        label: "3",
        layer: 1,
        row: 1,
      },
      {
        id: "4",
        label: "4",
        layer: 2,
        row: 0,
      },
    ],
    edges: [
      {
        id: "1>2",
        a: "1",
        b: "2",
        capacity: 10,
      },
      {
        id: "1>3",
        a: "1",
        b: "3",
        capacity: 2,
      },
      {
        id: "2>4",
        a: "2",
        b: "4",
        capacity: 3,
      },
      {
        id: "3>4",
        a: "3",
        b: "4",
        capacity: 5,
      },
    ],
    layers: [["1"], ["2", "3"], ["4"]],
  },
  frames: [
    {
      event: "Try",
      caption:
        "No flow yet. Each step finds a path from 1 to 4 with room left and pushes as much as it can.",
      focus: [],
      nodes: {},
      edges: {},
      flow: {
        "1>2": 0,
        "1>3": 0,
        "2>4": 0,
        "3>4": 0,
      },
      value: 0,
      path: [],
    },
    {
      event: "Accept",
      caption: "Path 1: push 3 along 1 → 2 → 4. 2 → 4 is now full. Flow is now 3.",
      focus: ["1", "1>2", "2", "2>4", "4"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
        2: {
          state: "ElementHighlight",
        },
        4: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1>2": {
          state: "ElementHighlight",
        },
        "2>4": {
          state: "ElementHighlight",
        },
      },
      flow: {
        "1>2": 3,
        "1>3": 0,
        "2>4": 3,
        "3>4": 0,
      },
      value: 3,
      path: [
        {
          edge: "1>2",
          forward: true,
          units: 3,
        },
        {
          edge: "2>4",
          forward: true,
          units: 3,
        },
      ],
    },
    {
      event: "Accept",
      caption: "Path 2: push 2 along 1 → 3 → 4. 1 → 3 is now full. Flow is now 5.",
      focus: ["1", "1>3", "3", "3>4", "4"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
        3: {
          state: "ElementHighlight",
        },
        4: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1>3": {
          state: "ElementHighlight",
        },
        "2>4": {
          state: "Covered",
        },
        "3>4": {
          state: "ElementHighlight",
        },
      },
      flow: {
        "1>2": 3,
        "1>3": 2,
        "2>4": 3,
        "3>4": 2,
      },
      value: 5,
      path: [
        {
          edge: "1>3",
          forward: true,
          units: 2,
        },
        {
          edge: "3>4",
          forward: true,
          units: 2,
        },
      ],
    },
    {
      event: "Done",
      caption:
        "No augmenting path is left. The nodes still reachable from 1 form S = {1,2}. The 2 edges from S to T are full and add up to 5, equal to the maximum flow.",
      focus: [],
      nodes: {},
      edges: {
        "1>3": {
          state: "Solution",
        },
        "2>4": {
          state: "Solution",
        },
      },
      flow: {
        "1>2": 3,
        "1>3": 2,
        "2>4": 3,
        "3>4": 2,
      },
      value: 5,
      path: [],
      groups: {
        1: 0,
        2: 0,
        3: 1,
        4: 1,
      },
      cut: ["1>3", "2>4"],
      ok: true,
    },
  ],
};

// ({s,a,b,c,d,t},{((s,a),1),((s,c),1),((a,b),1),((a,d),1),((c,b),1),((b,t),1),((d,t),1)},s,t): the
// second path runs backward over a>b, taking back the flow the first sent there.
export const MIN_CUT_BACKWARD_FLOW_FRAMES = {
  type: "FlowNetwork",
  payload: {
    kind: "flowNetwork",
    layout: "sourceToSink",
    rule: "minimumSTCut",
    source: "s",
    sink: "t",
    nodes: [
      {
        id: "s",
        label: "s",
        layer: 0,
        row: 0,
      },
      {
        id: "a",
        label: "a",
        layer: 1,
        row: 0,
      },
      {
        id: "b",
        label: "b",
        layer: 2,
        row: 0,
      },
      {
        id: "c",
        label: "c",
        layer: 1,
        row: 1,
      },
      {
        id: "d",
        label: "d",
        layer: 2,
        row: 1,
      },
      {
        id: "t",
        label: "t",
        layer: 3,
        row: 0,
      },
    ],
    edges: [
      {
        id: "s>a",
        a: "s",
        b: "a",
        capacity: 1,
      },
      {
        id: "s>c",
        a: "s",
        b: "c",
        capacity: 1,
      },
      {
        id: "a>b",
        a: "a",
        b: "b",
        capacity: 1,
      },
      {
        id: "a>d",
        a: "a",
        b: "d",
        capacity: 1,
      },
      {
        id: "c>b",
        a: "c",
        b: "b",
        capacity: 1,
      },
      {
        id: "b>t",
        a: "b",
        b: "t",
        capacity: 1,
      },
      {
        id: "d>t",
        a: "d",
        b: "t",
        capacity: 1,
      },
    ],
    layers: [["s"], ["a", "c"], ["b", "d"], ["t"]],
  },
  frames: [
    {
      event: "Try",
      caption:
        "No flow yet. Each step finds a path from s to t with room left and pushes as much as it can.",
      focus: [],
      nodes: {},
      edges: {},
      flow: {
        "a>b": 0,
        "a>d": 0,
        "b>t": 0,
        "c>b": 0,
        "d>t": 0,
        "s>a": 0,
        "s>c": 0,
      },
      value: 0,
      path: [],
    },
    {
      event: "Accept",
      caption:
        "Path 1: push 1 along s → a → b → t. s → a, a → b and b → t are now full. Flow is now 1.",
      focus: ["s", "s>a", "a", "a>b", "b", "b>t", "t"],
      nodes: {
        a: {
          state: "ElementHighlight",
        },
        b: {
          state: "ElementHighlight",
        },
        s: {
          state: "ElementHighlight",
        },
        t: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "a>b": {
          state: "ElementHighlight",
        },
        "b>t": {
          state: "ElementHighlight",
        },
        "s>a": {
          state: "ElementHighlight",
        },
      },
      flow: {
        "a>b": 1,
        "a>d": 0,
        "b>t": 1,
        "c>b": 0,
        "d>t": 0,
        "s>a": 1,
        "s>c": 0,
      },
      value: 1,
      path: [
        {
          edge: "s>a",
          forward: true,
          units: 1,
        },
        {
          edge: "a>b",
          forward: true,
          units: 1,
        },
        {
          edge: "b>t",
          forward: true,
          units: 1,
        },
      ],
    },
    {
      event: "Accept",
      caption:
        "Path 2: push 1 along s → c → b ⇠ a → d → t. It runs backward over a → b, taking back flow sent there earlier. s → c, c → b, a → d and d → t are now full. Flow is now 2.",
      focus: ["s", "s>c", "c", "c>b", "b", "a>b", "a", "a>d", "d", "d>t", "t"],
      nodes: {
        a: {
          state: "ElementHighlight",
        },
        b: {
          state: "ElementHighlight",
        },
        c: {
          state: "ElementHighlight",
        },
        d: {
          state: "ElementHighlight",
        },
        s: {
          state: "ElementHighlight",
        },
        t: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "a>b": {
          state: "ElementHighlight",
        },
        "a>d": {
          state: "ElementHighlight",
        },
        "b>t": {
          state: "Covered",
        },
        "c>b": {
          state: "ElementHighlight",
        },
        "d>t": {
          state: "ElementHighlight",
        },
        "s>a": {
          state: "Covered",
        },
        "s>c": {
          state: "ElementHighlight",
        },
      },
      flow: {
        "a>b": 0,
        "a>d": 1,
        "b>t": 1,
        "c>b": 1,
        "d>t": 1,
        "s>a": 1,
        "s>c": 1,
      },
      value: 2,
      path: [
        {
          edge: "s>c",
          forward: true,
          units: 1,
        },
        {
          edge: "c>b",
          forward: true,
          units: 1,
        },
        {
          edge: "a>b",
          forward: false,
          units: 1,
        },
        {
          edge: "a>d",
          forward: true,
          units: 1,
        },
        {
          edge: "d>t",
          forward: true,
          units: 1,
        },
      ],
    },
    {
      event: "Done",
      caption:
        "No augmenting path is left. The nodes still reachable from s form S = {s}. The 2 edges from S to T are full and add up to 2, equal to the maximum flow.",
      focus: [],
      nodes: {},
      edges: {
        "s>a": {
          state: "Solution",
        },
        "s>c": {
          state: "Solution",
        },
      },
      flow: {
        "a>b": 0,
        "a>d": 1,
        "b>t": 1,
        "c>b": 1,
        "d>t": 1,
        "s>a": 1,
        "s>c": 1,
      },
      value: 2,
      path: [],
      groups: {
        a: 1,
        b: 1,
        c: 1,
        d: 1,
        s: 0,
        t: 1,
      },
      cut: ["s>a", "s>c"],
      ok: true,
    },
  ],
};

// ({s,a,b,c,t},{((s,a),4),((s,b),4),((a,c),3),((b,c),3),((a,b),1),((c,t),5),((b,t),2)},s,t): the
// cut is not the smallest edge; b>t runs past c, so it is bowed around it.
export const MIN_CUT_BOWED_FLOW_FRAMES = {
  type: "FlowNetwork",
  payload: {
    kind: "flowNetwork",
    layout: "sourceToSink",
    rule: "minimumSTCut",
    source: "s",
    sink: "t",
    nodes: [
      {
        id: "s",
        label: "s",
        layer: 0,
        row: 0,
      },
      {
        id: "a",
        label: "a",
        layer: 1,
        row: 0,
      },
      {
        id: "b",
        label: "b",
        layer: 1,
        row: 1,
      },
      {
        id: "c",
        label: "c",
        layer: 2,
        row: 0,
      },
      {
        id: "t",
        label: "t",
        layer: 3,
        row: 0,
      },
    ],
    edges: [
      {
        id: "s>a",
        a: "s",
        b: "a",
        capacity: 4,
      },
      {
        id: "s>b",
        a: "s",
        b: "b",
        capacity: 4,
      },
      {
        id: "a>c",
        a: "a",
        b: "c",
        capacity: 3,
      },
      {
        id: "b>c",
        a: "b",
        b: "c",
        capacity: 3,
      },
      {
        id: "a>b",
        a: "a",
        b: "b",
        capacity: 1,
      },
      {
        id: "c>t",
        a: "c",
        b: "t",
        capacity: 5,
      },
      {
        id: "b>t",
        a: "b",
        b: "t",
        capacity: 2,
      },
    ],
    layers: [["s"], ["a", "b"], ["c"], ["t"]],
  },
  frames: [
    {
      event: "Try",
      caption:
        "No flow yet. Each step finds a path from s to t with room left and pushes as much as it can.",
      focus: [],
      nodes: {},
      edges: {},
      flow: {
        "a>b": 0,
        "a>c": 0,
        "b>c": 0,
        "b>t": 0,
        "c>t": 0,
        "s>a": 0,
        "s>b": 0,
      },
      value: 0,
      path: [],
    },
    {
      event: "Accept",
      caption: "Path 1: push 2 along s → b → t. b → t is now full. Flow is now 2.",
      focus: ["s", "s>b", "b", "b>t", "t"],
      nodes: {
        b: {
          state: "ElementHighlight",
        },
        s: {
          state: "ElementHighlight",
        },
        t: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "b>t": {
          state: "ElementHighlight",
        },
        "s>b": {
          state: "ElementHighlight",
        },
      },
      flow: {
        "a>b": 0,
        "a>c": 0,
        "b>c": 0,
        "b>t": 2,
        "c>t": 0,
        "s>a": 0,
        "s>b": 2,
      },
      value: 2,
      path: [
        {
          edge: "s>b",
          forward: true,
          units: 2,
        },
        {
          edge: "b>t",
          forward: true,
          units: 2,
        },
      ],
    },
    {
      event: "Accept",
      caption: "Path 2: push 3 along s → a → c → t. a → c is now full. Flow is now 5.",
      focus: ["s", "s>a", "a", "a>c", "c", "c>t", "t"],
      nodes: {
        a: {
          state: "ElementHighlight",
        },
        c: {
          state: "ElementHighlight",
        },
        s: {
          state: "ElementHighlight",
        },
        t: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "a>c": {
          state: "ElementHighlight",
        },
        "b>t": {
          state: "Covered",
        },
        "c>t": {
          state: "ElementHighlight",
        },
        "s>a": {
          state: "ElementHighlight",
        },
      },
      flow: {
        "a>b": 0,
        "a>c": 3,
        "b>c": 0,
        "b>t": 2,
        "c>t": 3,
        "s>a": 3,
        "s>b": 2,
      },
      value: 5,
      path: [
        {
          edge: "s>a",
          forward: true,
          units: 3,
        },
        {
          edge: "a>c",
          forward: true,
          units: 3,
        },
        {
          edge: "c>t",
          forward: true,
          units: 3,
        },
      ],
    },
    {
      event: "Accept",
      caption: "Path 3: push 2 along s → b → c → t. s → b and c → t are now full. Flow is now 7.",
      focus: ["s", "s>b", "b", "b>c", "c", "c>t", "t"],
      nodes: {
        b: {
          state: "ElementHighlight",
        },
        c: {
          state: "ElementHighlight",
        },
        s: {
          state: "ElementHighlight",
        },
        t: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "a>c": {
          state: "Covered",
        },
        "b>c": {
          state: "ElementHighlight",
        },
        "b>t": {
          state: "Covered",
        },
        "c>t": {
          state: "ElementHighlight",
        },
        "s>b": {
          state: "ElementHighlight",
        },
      },
      flow: {
        "a>b": 0,
        "a>c": 3,
        "b>c": 2,
        "b>t": 2,
        "c>t": 5,
        "s>a": 3,
        "s>b": 4,
      },
      value: 7,
      path: [
        {
          edge: "s>b",
          forward: true,
          units: 2,
        },
        {
          edge: "b>c",
          forward: true,
          units: 2,
        },
        {
          edge: "c>t",
          forward: true,
          units: 2,
        },
      ],
    },
    {
      event: "Done",
      caption:
        "No augmenting path is left. The nodes still reachable from s form S = {s,a,b,c}. The 2 edges from S to T are full and add up to 7, equal to the maximum flow.",
      focus: [],
      nodes: {},
      edges: {
        "b>t": {
          state: "Solution",
        },
        "c>t": {
          state: "Solution",
        },
      },
      flow: {
        "a>b": 0,
        "a>c": 3,
        "b>c": 2,
        "b>t": 2,
        "c>t": 5,
        "s>a": 3,
        "s>b": 4,
      },
      value: 7,
      path: [],
      groups: {
        a: 0,
        b: 0,
        c: 0,
        s: 0,
        t: 1,
      },
      cut: ["c>t", "b>t"],
      ok: true,
    },
  ],
};

// ({1,2,3},{((1,2),2),((1,2),5),((2,3),4),((3,1),1)},1,3): 1>2 listed twice (one edge of capacity
// 7, label 2,5), and 3>1 runs from T back to S, so it ends Untraveled.
export const MIN_CUT_PARALLEL_FLOW_FRAMES = {
  type: "FlowNetwork",
  payload: {
    kind: "flowNetwork",
    layout: "sourceToSink",
    rule: "minimumSTCut",
    source: "1",
    sink: "3",
    nodes: [
      {
        id: "1",
        label: "1",
        layer: 0,
        row: 0,
      },
      {
        id: "2",
        label: "2",
        layer: 1,
        row: 0,
      },
      {
        id: "3",
        label: "3",
        layer: 2,
        row: 0,
      },
    ],
    edges: [
      {
        id: "1>2",
        a: "1",
        b: "2",
        capacity: 7,
        label: "2,5",
      },
      {
        id: "2>3",
        a: "2",
        b: "3",
        capacity: 4,
      },
      {
        id: "3>1",
        a: "3",
        b: "1",
        capacity: 1,
      },
    ],
    layers: [["1"], ["2"], ["3"]],
  },
  frames: [
    {
      event: "Try",
      caption:
        "No flow yet. Each step finds a path from 1 to 3 with room left and pushes as much as it can.",
      focus: [],
      nodes: {},
      edges: {},
      flow: {
        "1>2": 0,
        "2>3": 0,
        "3>1": 0,
      },
      value: 0,
      path: [],
    },
    {
      event: "Accept",
      caption: "Path 1: push 4 along 1 → 2 → 3. 2 → 3 is now full. Flow is now 4.",
      focus: ["1", "1>2", "2", "2>3", "3"],
      nodes: {
        1: {
          state: "ElementHighlight",
        },
        2: {
          state: "ElementHighlight",
        },
        3: {
          state: "ElementHighlight",
        },
      },
      edges: {
        "1>2": {
          state: "ElementHighlight",
        },
        "2>3": {
          state: "ElementHighlight",
        },
      },
      flow: {
        "1>2": 4,
        "2>3": 4,
        "3>1": 0,
      },
      value: 4,
      path: [
        {
          edge: "1>2",
          forward: true,
          units: 4,
        },
        {
          edge: "2>3",
          forward: true,
          units: 4,
        },
      ],
    },
    {
      event: "Done",
      caption:
        "No augmenting path is left. The nodes still reachable from 1 form S = {1,2}. The only edge from S to T is full, and its capacity, 4, equals the maximum flow.",
      focus: [],
      nodes: {},
      edges: {
        "2>3": {
          state: "Solution",
        },
        "3>1": {
          state: "Untraveled",
        },
      },
      flow: {
        "1>2": 4,
        "2>3": 4,
        "3>1": 0,
      },
      value: 4,
      path: [],
      groups: {
        1: 0,
        2: 0,
        3: 1,
      },
      cut: ["2>3"],
      ok: true,
    },
  ],
};

// ({1,2,3,4},{((1,2),3),((3,4),2)},1,4): no path from 1 to 4, so the flow and the cut are 0 with no
// cut edges.
export const MIN_CUT_NO_PATH_FLOW_FRAMES = {
  type: "FlowNetwork",
  payload: {
    kind: "flowNetwork",
    layout: "sourceToSink",
    rule: "minimumSTCut",
    source: "1",
    sink: "4",
    nodes: [
      {
        id: "1",
        label: "1",
        layer: 0,
        row: 0,
      },
      {
        id: "2",
        label: "2",
        layer: 1,
        row: 0,
      },
      {
        id: "3",
        label: "3",
        layer: 1,
        row: 1,
      },
      {
        id: "4",
        label: "4",
        layer: 2,
        row: 0,
      },
    ],
    edges: [
      {
        id: "1>2",
        a: "1",
        b: "2",
        capacity: 3,
      },
      {
        id: "3>4",
        a: "3",
        b: "4",
        capacity: 2,
      },
    ],
    layers: [["1"], ["2", "3"], ["4"]],
  },
  frames: [
    {
      event: "Try",
      caption:
        "No flow yet. Each step finds a path from 1 to 4 with room left and pushes as much as it can.",
      focus: [],
      nodes: {},
      edges: {},
      flow: {
        "1>2": 0,
        "3>4": 0,
      },
      value: 0,
      path: [],
    },
    {
      event: "Done",
      caption:
        "There is no path from 1 to 4 with room, so the maximum flow and the minimum cut are both 0.",
      focus: [],
      nodes: {},
      edges: {},
      flow: {
        "1>2": 0,
        "3>4": 0,
      },
      value: 0,
      path: [],
      groups: {
        1: 0,
        2: 0,
        3: 1,
        4: 1,
      },
      cut: [],
      ok: true,
    },
  ],
};

/** format=frames, Partition, {3,1,1,2,2,1}, PartitionBruteForce: partition rule; every placed item highlighted while a split is tried, the sides Rejected until both hit 5, then the answer with S1 and S2 Covered. */
export const PARTITION_PACKING_FRAMES = {
  type: "Packing",
  payload: {
    kind: "packing",
    rule: "partition",
    items: [
      { id: "I1", label: "3", size: 3 },
      { id: "I2", label: "1", size: 1 },
      { id: "I3", label: "1", size: 1 },
      { id: "I4", label: "2", size: 2 },
      { id: "I5", label: "2", size: 2 },
      { id: "I6", label: "1", size: 1 },
    ],
    containers: [
      { id: "C1", label: "S1", target: 5 },
      { id: "C2", label: "S2", target: 5 },
    ],
    total: 10,
  },
  frames: [
    {
      event: "Reject",
      caption: "Try S1 = {1}: 1 against 9, off by 8.",
      focus: ["I2"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
        I4: { state: "ElementHighlight" },
        I5: { state: "ElementHighlight" },
        I6: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" }, C2: { state: "Rejected" } },
      assign: [1, 0, 1, 1, 1, 1],
      totals: [{ size: 1 }, { size: 9 }],
      step: 0,
    },
    {
      event: "Reject",
      caption: "Try S1 = {3,1}: 4 against 6, off by 2.",
      focus: ["I1", "I2"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
        I4: { state: "ElementHighlight" },
        I5: { state: "ElementHighlight" },
        I6: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" }, C2: { state: "Rejected" } },
      assign: [0, 0, 1, 1, 1, 1],
      totals: [{ size: 4 }, { size: 6 }],
      step: 1,
    },
    {
      event: "Reject",
      caption: "Try S1 = {1}: 1 against 9, off by 8.",
      focus: ["I3"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
        I4: { state: "ElementHighlight" },
        I5: { state: "ElementHighlight" },
        I6: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" }, C2: { state: "Rejected" } },
      assign: [1, 1, 0, 1, 1, 1],
      totals: [{ size: 1 }, { size: 9 }],
      step: 2,
    },
    {
      event: "Reject",
      caption: "Try S1 = {3,1}: 4 against 6, off by 2.",
      focus: ["I1", "I3"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
        I4: { state: "ElementHighlight" },
        I5: { state: "ElementHighlight" },
        I6: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" }, C2: { state: "Rejected" } },
      assign: [0, 1, 0, 1, 1, 1],
      totals: [{ size: 4 }, { size: 6 }],
      step: 3,
    },
    {
      event: "Reject",
      caption: "Try S1 = {1,1}: 2 against 8, off by 6.",
      focus: ["I2", "I3"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
        I4: { state: "ElementHighlight" },
        I5: { state: "ElementHighlight" },
        I6: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" }, C2: { state: "Rejected" } },
      assign: [1, 0, 0, 1, 1, 1],
      totals: [{ size: 2 }, { size: 8 }],
      step: 4,
    },
    {
      event: "Accept",
      caption: "Try S1 = {3,1,1}: 5 against 5. Equal.",
      focus: ["I1", "I2", "I3"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
        I4: { state: "Solution" },
        I5: { state: "Solution" },
        I6: { state: "Solution" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "Covered" } },
      assign: [0, 0, 0, 1, 1, 1],
      totals: [{ size: 5 }, { size: 5 }],
      step: 5,
    },
    {
      event: "Done",
      caption: "Both sides add up to 5, found after 6 splits.",
      focus: [],
      items: {
        I1: { state: "Solution" },
        I2: { state: "Solution" },
        I3: { state: "Solution" },
        I4: { state: "Solution" },
        I5: { state: "Solution" },
        I6: { state: "Solution" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "Covered" } },
      assign: [0, 0, 0, 1, 1, 1],
      totals: [{ size: 5 }, { size: 5 }],
      step: 6,
      ok: true,
    },
  ],
};

/** format=frames, Partition, {3,5,7} (an odd total, 15), PartitionBruteForce: every split fails, a Done that is not ok with nothing placed. */
export const PARTITION_ODD_PACKING_FRAMES = {
  type: "Packing",
  payload: {
    kind: "packing",
    rule: "partition",
    items: [
      { id: "I1", label: "3", size: 3 },
      { id: "I2", label: "5", size: 5 },
      { id: "I3", label: "7", size: 7 },
    ],
    containers: [
      { id: "C1", label: "S1", target: 7.5 },
      { id: "C2", label: "S2", target: 7.5 },
    ],
    total: 15,
  },
  frames: [
    {
      event: "Reject",
      caption: "Try S1 = {5}: 5 against 10, off by 5.",
      focus: ["I2"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" }, C2: { state: "Rejected" } },
      assign: [1, 0, 1],
      totals: [{ size: 5 }, { size: 10 }],
      step: 0,
    },
    {
      event: "Reject",
      caption: "Try S1 = {3,5}: 8 against 7, off by 1.",
      focus: ["I1", "I2"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" }, C2: { state: "Rejected" } },
      assign: [0, 0, 1],
      totals: [{ size: 8 }, { size: 7 }],
      step: 1,
    },
    {
      event: "Reject",
      caption: "Try S1 = {7}: 7 against 8, off by 1.",
      focus: ["I3"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" }, C2: { state: "Rejected" } },
      assign: [1, 1, 0],
      totals: [{ size: 7 }, { size: 8 }],
      step: 2,
    },
    {
      event: "Reject",
      caption: "Try S1 = {3,7}: 10 against 5, off by 5.",
      focus: ["I1", "I3"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" }, C2: { state: "Rejected" } },
      assign: [0, 1, 0],
      totals: [{ size: 10 }, { size: 5 }],
      step: 3,
    },
    {
      event: "Reject",
      caption: "Try S1 = {5,7}: 12 against 3, off by 9.",
      focus: ["I2", "I3"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" }, C2: { state: "Rejected" } },
      assign: [1, 0, 0],
      totals: [{ size: 12 }, { size: 3 }],
      step: 4,
    },
    {
      event: "Reject",
      caption: "Try S1 = {3,5,7}: 15 against 0, off by 15.",
      focus: ["I1", "I2", "I3"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" }, C2: { state: "Rejected" } },
      assign: [0, 0, 0],
      totals: [{ size: 15 }, { size: 0 }],
      step: 5,
    },
    {
      event: "Reject",
      caption: "Try S1 = {}: 0 against 15, off by 15.",
      focus: [],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" }, C2: { state: "Rejected" } },
      assign: [1, 1, 1],
      totals: [{ size: 0 }, { size: 15 }],
      step: 6,
    },
    {
      event: "Reject",
      caption: "Try S1 = {3}: 3 against 12, off by 9.",
      focus: ["I1"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" }, C2: { state: "Rejected" } },
      assign: [0, 1, 1],
      totals: [{ size: 3 }, { size: 12 }],
      step: 7,
    },
    {
      event: "Done",
      caption: "The total is odd (15), so no split can balance. Checked all 8 splits.",
      focus: [],
      items: {},
      containers: {},
      assign: [-1, -1, -1],
      totals: [{ size: 0 }, { size: 0 }],
      step: 8,
      ok: false,
    },
  ],
};

/** format=frames, Subset Sum, the problem default ({1,7,12,15},28), SubsetSumBruteForce: subsetSum rule; the tries, then {1,12,15} as the answer and 7 Untraveled. */
export const SUBSET_SUM_PACKING_FRAMES = {
  type: "Packing",
  payload: {
    kind: "packing",
    rule: "subsetSum",
    items: [
      { id: "I1", label: "1", size: 1 },
      { id: "I2", label: "7", size: 7 },
      { id: "I3", label: "12", size: 12 },
      { id: "I4", label: "15", size: 15 },
    ],
    containers: [{ id: "C1", label: "Chosen", target: 28 }],
    total: 35,
  },
  frames: [
    {
      event: "Reject",
      caption: "Try {1}: 1, not 28.",
      focus: ["I1"],
      items: { I1: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [0, -1, -1, -1],
      totals: [{ size: 1 }],
      step: 0,
    },
    {
      event: "Reject",
      caption: "Try {7}: 7, not 28.",
      focus: ["I2"],
      items: { I2: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [-1, 0, -1, -1],
      totals: [{ size: 7 }],
      step: 1,
    },
    {
      event: "Reject",
      caption: "Try {1,7}: 1 + 7 = 8, not 28.",
      focus: ["I1", "I2"],
      items: { I1: { state: "ElementHighlight" }, I2: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [0, 0, -1, -1],
      totals: [{ size: 8 }],
      step: 2,
    },
    {
      event: "Reject",
      caption: "Try {12}: 12, not 28.",
      focus: ["I3"],
      items: { I3: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [-1, -1, 0, -1],
      totals: [{ size: 12 }],
      step: 3,
    },
    {
      event: "Reject",
      caption: "Try {1,12}: 1 + 12 = 13, not 28.",
      focus: ["I1", "I3"],
      items: { I1: { state: "ElementHighlight" }, I3: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [0, -1, 0, -1],
      totals: [{ size: 13 }],
      step: 4,
    },
    {
      event: "Reject",
      caption: "Try {7,12}: 7 + 12 = 19, not 28.",
      focus: ["I2", "I3"],
      items: { I2: { state: "ElementHighlight" }, I3: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [-1, 0, 0, -1],
      totals: [{ size: 19 }],
      step: 5,
    },
    {
      event: "Reject",
      caption: "Try {1,7,12}: 1 + 7 + 12 = 20, not 28.",
      focus: ["I1", "I2", "I3"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" } },
      assign: [0, 0, 0, -1],
      totals: [{ size: 20 }],
      step: 6,
    },
    {
      event: "Reject",
      caption: "Try {15}: 15, not 28.",
      focus: ["I4"],
      items: { I4: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [-1, -1, -1, 0],
      totals: [{ size: 15 }],
      step: 7,
    },
    {
      event: "Reject",
      caption: "Try {1,15}: 1 + 15 = 16, not 28.",
      focus: ["I1", "I4"],
      items: { I1: { state: "ElementHighlight" }, I4: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [0, -1, -1, 0],
      totals: [{ size: 16 }],
      step: 8,
    },
    {
      event: "Reject",
      caption: "Try {7,15}: 7 + 15 = 22, not 28.",
      focus: ["I2", "I4"],
      items: { I2: { state: "ElementHighlight" }, I4: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [-1, 0, -1, 0],
      totals: [{ size: 22 }],
      step: 9,
    },
    {
      event: "Reject",
      caption: "Try {1,7,15}: 1 + 7 + 15 = 23, not 28.",
      focus: ["I1", "I2", "I4"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I4: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" } },
      assign: [0, 0, -1, 0],
      totals: [{ size: 23 }],
      step: 10,
    },
    {
      event: "Reject",
      caption: "Try {12,15}: 12 + 15 = 27, not 28.",
      focus: ["I3", "I4"],
      items: { I3: { state: "ElementHighlight" }, I4: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [-1, -1, 0, 0],
      totals: [{ size: 27 }],
      step: 11,
    },
    {
      event: "Accept",
      caption: "Try {1,12,15}: 1 + 12 + 15 = 28. That's T.",
      focus: ["I1", "I3", "I4"],
      items: {
        I1: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
        I4: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Covered" } },
      assign: [0, -1, 0, 0],
      totals: [{ size: 28 }],
      step: 12,
    },
    {
      event: "Done",
      caption: "{1,12,15} adds up to exactly 28, found after 13 subsets.",
      focus: [],
      items: {
        I1: { state: "Solution" },
        I2: { state: "Untraveled" },
        I3: { state: "Solution" },
        I4: { state: "Solution" },
      },
      containers: { C1: { state: "Covered" } },
      assign: [0, -1, 0, 0],
      totals: [{ size: 28 }],
      step: 13,
      ok: true,
    },
  ],
};

/** format=frames, Subset Sum, the problem default ({1,7,12,15},28), FastApproximation (recaptured after Redux #897-#900): one step per item, the best sum so far Committed and the number just added in focus. */
export const SUBSET_SUM_APPROX_PACKING_FRAMES = {
  type: "Packing",
  payload: {
    kind: "packing",
    rule: "subsetSum",
    items: [
      { id: "I1", label: "1", size: 1 },
      { id: "I2", label: "7", size: 7 },
      { id: "I3", label: "12", size: 12 },
      { id: "I4", label: "15", size: 15 },
    ],
    containers: [{ id: "C1", label: "Chosen", target: 28 }],
    total: 35,
  },
  frames: [
    {
      event: "Try",
      caption: "Add 1 to every sum kept so far that stays within 28. 2 sums kept. Best so far: 1.",
      focus: ["I1"],
      items: { I1: { state: "ElementHighlight" } },
      containers: {},
      assign: [0, -1, -1, -1],
      totals: [{ size: 1 }],
      step: 0,
    },
    {
      event: "Try",
      caption: "Add 7 to every sum kept so far that stays within 28. 4 sums kept. Best so far: 8.",
      focus: ["I2"],
      items: { I1: { state: "Committed" }, I2: { state: "ElementHighlight" } },
      containers: {},
      assign: [0, 0, -1, -1],
      totals: [{ size: 8 }],
      step: 1,
    },
    {
      event: "Try",
      caption:
        "Add 12 to every sum kept so far that stays within 28. 8 sums kept. Best so far: 20.",
      focus: ["I3"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "ElementHighlight" },
      },
      containers: {},
      assign: [0, 0, 0, -1],
      totals: [{ size: 20 }],
      step: 2,
    },
    {
      event: "Try",
      caption:
        "Add 15 to every sum kept so far that stays within 28. 14 sums kept. Best so far: 28.",
      focus: ["I4"],
      items: {
        I1: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Covered" } },
      assign: [0, -1, 0, 0],
      totals: [{ size: 28 }],
      step: 3,
    },
    {
      event: "Done",
      caption: "The best sum kept is exactly 28: {1,12,15}.",
      focus: [],
      items: {
        I1: { state: "Solution" },
        I2: { state: "Untraveled" },
        I3: { state: "Solution" },
        I4: { state: "Solution" },
      },
      containers: { C1: { state: "Covered" } },
      assign: [0, -1, 0, 0],
      totals: [{ size: 28 }],
      step: 4,
      ok: true,
    },
  ],
};

/** format=frames, Subset Sum, ({20,1,2},3), SubsetSumBruteForce: the tries {20,1} and {20,2} run past the track's end, so the row's last piece is cut there. */
export const SUBSET_SUM_CLIPPED_PACKING_FRAMES = {
  type: "Packing",
  payload: {
    kind: "packing",
    rule: "subsetSum",
    items: [
      { id: "I1", label: "20", size: 20 },
      { id: "I2", label: "1", size: 1 },
      { id: "I3", label: "2", size: 2 },
    ],
    containers: [{ id: "C1", label: "Chosen", target: 3 }],
    total: 23,
  },
  frames: [
    {
      event: "Reject",
      caption: "Try {20}: 20, not 3.",
      focus: ["I1"],
      items: { I1: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [0, -1, -1],
      totals: [{ size: 20 }],
      step: 0,
    },
    {
      event: "Reject",
      caption: "Try {1}: 1, not 3.",
      focus: ["I2"],
      items: { I2: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [-1, 0, -1],
      totals: [{ size: 1 }],
      step: 1,
    },
    {
      event: "Reject",
      caption: "Try {20,1}: 20 + 1 = 21, not 3.",
      focus: ["I1", "I2"],
      items: { I1: { state: "ElementHighlight" }, I2: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [0, 0, -1],
      totals: [{ size: 21 }],
      step: 2,
    },
    {
      event: "Reject",
      caption: "Try {2}: 2, not 3.",
      focus: ["I3"],
      items: { I3: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [-1, -1, 0],
      totals: [{ size: 2 }],
      step: 3,
    },
    {
      event: "Reject",
      caption: "Try {20,2}: 20 + 2 = 22, not 3.",
      focus: ["I1", "I3"],
      items: { I1: { state: "ElementHighlight" }, I3: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [0, -1, 0],
      totals: [{ size: 22 }],
      step: 4,
    },
    {
      event: "Accept",
      caption: "Try {1,2}: 1 + 2 = 3. That's T.",
      focus: ["I2", "I3"],
      items: { I2: { state: "ElementHighlight" }, I3: { state: "ElementHighlight" } },
      containers: { C1: { state: "Covered" } },
      assign: [-1, 0, 0],
      totals: [{ size: 3 }],
      step: 5,
    },
    {
      event: "Done",
      caption: "{1,2} adds up to exactly 3, found after 6 subsets.",
      focus: [],
      items: { I1: { state: "Untraveled" }, I2: { state: "Solution" }, I3: { state: "Solution" } },
      containers: { C1: { state: "Covered" } },
      assign: [-1, 0, 0],
      totals: [{ size: 3 }],
      step: 6,
      ok: true,
    },
  ],
};

/** format=frames, Subset Sum, ({1000,1001,5},1006), FastApproximation (Redux #897-#900): trimming keeps the best sum at 1000, so the numbers in focus after the first stay out of it, and the run ends on no. */
export const SUBSET_SUM_APPROX_MISS_PACKING_FRAMES = {
  type: "Packing",
  payload: {
    kind: "packing",
    rule: "subsetSum",
    items: [
      { id: "I1", label: "1000", size: 1000 },
      { id: "I2", label: "1001", size: 1001 },
      { id: "I3", label: "5", size: 5 },
    ],
    containers: [{ id: "C1", label: "Chosen", target: 1006 }],
    total: 2006,
  },
  frames: [
    {
      event: "Try",
      caption:
        "Add 1000 to every sum kept so far that stays within 1006. 2 sums kept. Best so far: 1000.",
      focus: ["I1"],
      items: { I1: { state: "ElementHighlight" } },
      containers: {},
      assign: [0, -1, -1],
      totals: [{ size: 1000 }],
      step: 0,
    },
    {
      event: "Try",
      caption:
        "Add 1001 to every sum kept so far that stays within 1006. 2 sums kept, 1 trimmed as too close to another. Best so far: 1000.",
      focus: ["I2"],
      items: { I1: { state: "Committed" }, I2: { state: "ElementHighlight" } },
      containers: {},
      assign: [0, -1, -1],
      totals: [{ size: 1000 }],
      step: 1,
    },
    {
      event: "Try",
      caption:
        "Add 5 to every sum kept so far that stays within 1006. 3 sums kept, 1 trimmed as too close to another. Best so far: 1000.",
      focus: ["I3"],
      items: { I1: { state: "Committed" }, I3: { state: "ElementHighlight" } },
      containers: {},
      assign: [0, -1, -1],
      totals: [{ size: 1000 }],
      step: 2,
    },
    {
      event: "Done",
      caption:
        "The best sum kept is 1000, not 1006, so the approximation answers no, even if an exact subset exists.",
      focus: [],
      items: {},
      containers: {},
      assign: [-1, -1, -1],
      totals: [{ size: 0 }],
      step: 3,
      ok: false,
    },
  ],
};

/** format=frames, Knapsack, the problem default ({(10,60),(20,100),(30,120)},50,220), KnapsackBruteForce: knapsack rule; one container with a weight limit and a value goal, drawn as a Weight row and a Value row. */
export const KNAPSACK_PACKING_FRAMES = {
  type: "Packing",
  payload: {
    kind: "packing",
    rule: "knapsack",
    items: [
      { id: "I1", label: "(10,60)", size: 10, value: 60 },
      { id: "I2", label: "(20,100)", size: 20, value: 100 },
      { id: "I3", label: "(30,120)", size: 30, value: 120 },
    ],
    containers: [{ id: "C1", label: "Knapsack", limit: 50, atLeast: 220 }],
    total: 60,
  },
  frames: [
    {
      event: "Reject",
      caption: "Try {}: weight 0, value 0, short of 220.",
      focus: [],
      items: {},
      containers: {},
      assign: [-1, -1, -1],
      totals: [{ size: 0, value: 0 }],
      step: 0,
    },
    {
      event: "Reject",
      caption: "Try {(10,60)}: weight 10, value 60, short of 220.",
      focus: ["I1"],
      items: { I1: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [0, -1, -1],
      totals: [{ size: 10, value: 60 }],
      step: 1,
    },
    {
      event: "Reject",
      caption: "Try {(20,100)}: weight 20, value 100, short of 220.",
      focus: ["I2"],
      items: { I2: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [-1, 0, -1],
      totals: [{ size: 20, value: 100 }],
      step: 2,
    },
    {
      event: "Reject",
      caption: "Try {(10,60),(20,100)}: weight 30, value 160, short of 220.",
      focus: ["I1", "I2"],
      items: { I1: { state: "ElementHighlight" }, I2: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [0, 0, -1],
      totals: [{ size: 30, value: 160 }],
      step: 3,
    },
    {
      event: "Reject",
      caption: "Try {(30,120)}: weight 30, value 120, short of 220.",
      focus: ["I3"],
      items: { I3: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [-1, -1, 0],
      totals: [{ size: 30, value: 120 }],
      step: 4,
    },
    {
      event: "Reject",
      caption: "Try {(10,60),(30,120)}: weight 40, value 180, short of 220.",
      focus: ["I1", "I3"],
      items: { I1: { state: "ElementHighlight" }, I3: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [0, -1, 0],
      totals: [{ size: 40, value: 180 }],
      step: 5,
    },
    {
      event: "Accept",
      caption: "Try {(20,100),(30,120)}: weight 50, value 220. It works.",
      focus: ["I2", "I3"],
      items: { I2: { state: "ElementHighlight" }, I3: { state: "ElementHighlight" } },
      containers: { C1: { state: "Covered" } },
      assign: [-1, 0, 0],
      totals: [{ size: 50, value: 220 }],
      step: 6,
    },
    {
      event: "Done",
      caption: "{(20,100),(30,120)} fits in 50 and is worth at least 220, found after 7 sets.",
      focus: [],
      items: { I1: { state: "Untraveled" }, I2: { state: "Solution" }, I3: { state: "Solution" } },
      containers: { C1: { state: "Covered" } },
      assign: [-1, 0, 0],
      totals: [{ size: 50, value: 220 }],
      step: 7,
      ok: true,
    },
  ],
};

/** format=frames, Knapsack, ({(10,60),(20,100),(30,120)},50,250), KnapsackBruteForce: no set is worth 250 within 50; the try of all three weighs 60, over W, and the run ends on no. */
export const KNAPSACK_OVER_PACKING_FRAMES = {
  type: "Packing",
  payload: {
    kind: "packing",
    rule: "knapsack",
    items: [
      { id: "I1", label: "(10,60)", size: 10, value: 60 },
      { id: "I2", label: "(20,100)", size: 20, value: 100 },
      { id: "I3", label: "(30,120)", size: 30, value: 120 },
    ],
    containers: [{ id: "C1", label: "Knapsack", limit: 50, atLeast: 250 }],
    total: 60,
  },
  frames: [
    {
      event: "Reject",
      caption: "Try {}: weight 0, value 0, short of 250.",
      focus: [],
      items: {},
      containers: {},
      assign: [-1, -1, -1],
      totals: [{ size: 0, value: 0 }],
      step: 0,
    },
    {
      event: "Reject",
      caption: "Try {(10,60)}: weight 10, value 60, short of 250.",
      focus: ["I1"],
      items: { I1: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [0, -1, -1],
      totals: [{ size: 10, value: 60 }],
      step: 1,
    },
    {
      event: "Reject",
      caption: "Try {(20,100)}: weight 20, value 100, short of 250.",
      focus: ["I2"],
      items: { I2: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [-1, 0, -1],
      totals: [{ size: 20, value: 100 }],
      step: 2,
    },
    {
      event: "Reject",
      caption: "Try {(10,60),(20,100)}: weight 30, value 160, short of 250.",
      focus: ["I1", "I2"],
      items: { I1: { state: "ElementHighlight" }, I2: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [0, 0, -1],
      totals: [{ size: 30, value: 160 }],
      step: 3,
    },
    {
      event: "Reject",
      caption: "Try {(30,120)}: weight 30, value 120, short of 250.",
      focus: ["I3"],
      items: { I3: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [-1, -1, 0],
      totals: [{ size: 30, value: 120 }],
      step: 4,
    },
    {
      event: "Reject",
      caption: "Try {(10,60),(30,120)}: weight 40, value 180, short of 250.",
      focus: ["I1", "I3"],
      items: { I1: { state: "ElementHighlight" }, I3: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [0, -1, 0],
      totals: [{ size: 40, value: 180 }],
      step: 5,
    },
    {
      event: "Reject",
      caption: "Try {(20,100),(30,120)}: weight 50, value 220, short of 250.",
      focus: ["I2", "I3"],
      items: { I2: { state: "ElementHighlight" }, I3: { state: "ElementHighlight" } },
      containers: { C1: { state: "Rejected" } },
      assign: [-1, 0, 0],
      totals: [{ size: 50, value: 220 }],
      step: 6,
    },
    {
      event: "Reject",
      caption: "Try {(10,60),(20,100),(30,120)}: weight 60 is over 50.",
      focus: ["I1", "I2", "I3"],
      items: {
        I1: { state: "ElementHighlight" },
        I2: { state: "ElementHighlight" },
        I3: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Rejected" } },
      assign: [0, 0, 0],
      totals: [{ size: 60, value: 280 }],
      step: 7,
    },
    {
      event: "Done",
      caption: "Checked all 8 sets. None is worth 250 within weight 50.",
      focus: [],
      items: {},
      containers: {},
      assign: [-1, -1, -1],
      totals: [{ size: 0, value: 0 }],
      step: 8,
      ok: false,
    },
  ],
};

/** format=frames, Bin Packing, the problem default ((4,7,3,6,2,8),10,3), BinPackingBruteForce: binPacking rule; items Committed as they are packed, backed out of, and the answer in three full bins. */
export const BIN_PACKING_PACKING_FRAMES = {
  type: "Packing",
  payload: {
    kind: "packing",
    rule: "binPacking",
    items: [
      { id: "I1", label: "4", size: 4 },
      { id: "I2", label: "7", size: 7 },
      { id: "I3", label: "3", size: 3 },
      { id: "I4", label: "6", size: 6 },
      { id: "I5", label: "2", size: 2 },
      { id: "I6", label: "8", size: 8 },
    ],
    containers: [
      { id: "C1", label: "Bin 1", limit: 10 },
      { id: "C2", label: "Bin 2", limit: 10 },
      { id: "C3", label: "Bin 3", limit: 10 },
    ],
    total: 30,
    maxBins: 3,
  },
  frames: [
    {
      event: "Accept",
      caption: "Put 4 in bin 1: 4 of 10 used.",
      focus: ["I1", "C1"],
      items: { I1: { state: "ElementHighlight" } },
      containers: { C1: { state: "ElementHighlight" } },
      assign: [0, -1, -1, -1, -1, -1],
      totals: [{ size: 4 }, { size: 0 }, { size: 0 }],
      step: 0,
    },
    {
      event: "Accept",
      caption: "Put 7 in bin 2: 7 of 10 used.",
      focus: ["I2", "C2"],
      items: { I1: { state: "Committed" }, I2: { state: "ElementHighlight" } },
      containers: { C1: { state: "Covered" }, C2: { state: "ElementHighlight" } },
      assign: [0, 1, -1, -1, -1, -1],
      totals: [{ size: 4 }, { size: 7 }, { size: 0 }],
      step: 1,
    },
    {
      event: "Accept",
      caption: "Put 3 in bin 1: 7 of 10 used.",
      focus: ["I3", "C1"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "ElementHighlight" }, C2: { state: "Covered" } },
      assign: [0, 1, 0, -1, -1, -1],
      totals: [{ size: 7 }, { size: 7 }, { size: 0 }],
      step: 2,
    },
    {
      event: "Accept",
      caption: "Put 6 in bin 3: 6 of 10 used.",
      focus: ["I4", "C3"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "ElementHighlight" },
      },
      containers: {
        C1: { state: "Covered" },
        C2: { state: "Covered" },
        C3: { state: "ElementHighlight" },
      },
      assign: [0, 1, 0, 2, -1, -1],
      totals: [{ size: 7 }, { size: 7 }, { size: 6 }],
      step: 3,
    },
    {
      event: "Accept",
      caption: "Put 2 in bin 1: 9 of 10 used.",
      focus: ["I5", "C1"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Committed" },
        I5: { state: "ElementHighlight" },
      },
      containers: {
        C1: { state: "ElementHighlight" },
        C2: { state: "Covered" },
        C3: { state: "Covered" },
      },
      assign: [0, 1, 0, 2, 0, -1],
      totals: [{ size: 9 }, { size: 7 }, { size: 6 }],
      step: 4,
    },
    {
      event: "Reject",
      caption: "No bin has room for 8, so take back the last choice.",
      focus: ["I6"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Committed" },
        I5: { state: "Committed" },
        I6: { state: "Rejected" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "Covered" }, C3: { state: "Covered" } },
      assign: [0, 1, 0, 2, 0, -1],
      totals: [{ size: 9 }, { size: 7 }, { size: 6 }],
      step: 5,
    },
    {
      event: "Backtrack",
      caption: "Take 2 back out of bin 1 and try the next bin.",
      focus: ["I5"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Committed" },
        I5: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "Covered" }, C3: { state: "Covered" } },
      assign: [0, 1, 0, 2, -1, -1],
      totals: [{ size: 7 }, { size: 7 }, { size: 6 }],
      step: 6,
    },
    {
      event: "Accept",
      caption: "Put 2 in bin 2: 9 of 10 used.",
      focus: ["I5", "C2"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Committed" },
        I5: { state: "ElementHighlight" },
      },
      containers: {
        C1: { state: "Covered" },
        C2: { state: "ElementHighlight" },
        C3: { state: "Covered" },
      },
      assign: [0, 1, 0, 2, 1, -1],
      totals: [{ size: 7 }, { size: 9 }, { size: 6 }],
      step: 7,
    },
    {
      event: "Reject",
      caption: "No bin has room for 8, so take back the last choice.",
      focus: ["I6"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Committed" },
        I5: { state: "Committed" },
        I6: { state: "Rejected" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "Covered" }, C3: { state: "Covered" } },
      assign: [0, 1, 0, 2, 1, -1],
      totals: [{ size: 7 }, { size: 9 }, { size: 6 }],
      step: 8,
    },
    {
      event: "Backtrack",
      caption: "Take 2 back out of bin 2 and try the next bin.",
      focus: ["I5"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Committed" },
        I5: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "Covered" }, C3: { state: "Covered" } },
      assign: [0, 1, 0, 2, -1, -1],
      totals: [{ size: 7 }, { size: 7 }, { size: 6 }],
      step: 9,
    },
    {
      event: "Accept",
      caption: "Put 2 in bin 3: 8 of 10 used.",
      focus: ["I5", "C3"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Committed" },
        I5: { state: "ElementHighlight" },
      },
      containers: {
        C1: { state: "Covered" },
        C2: { state: "Covered" },
        C3: { state: "ElementHighlight" },
      },
      assign: [0, 1, 0, 2, 2, -1],
      totals: [{ size: 7 }, { size: 7 }, { size: 8 }],
      step: 10,
    },
    {
      event: "Reject",
      caption: "No bin has room for 8, so take back the last choice.",
      focus: ["I6"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Committed" },
        I5: { state: "Committed" },
        I6: { state: "Rejected" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "Covered" }, C3: { state: "Covered" } },
      assign: [0, 1, 0, 2, 2, -1],
      totals: [{ size: 7 }, { size: 7 }, { size: 8 }],
      step: 11,
    },
    {
      event: "Backtrack",
      caption: "Take 2 back out of bin 3 and try the next bin.",
      focus: ["I5"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Committed" },
        I5: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "Covered" }, C3: { state: "Covered" } },
      assign: [0, 1, 0, 2, -1, -1],
      totals: [{ size: 7 }, { size: 7 }, { size: 6 }],
      step: 12,
    },
    {
      event: "Reject",
      caption:
        "Every bin with room for 2 leaves no room for the items after it, so take back the last choice.",
      focus: ["I5"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Committed" },
        I5: { state: "Rejected" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "Covered" }, C3: { state: "Covered" } },
      assign: [0, 1, 0, 2, -1, -1],
      totals: [{ size: 7 }, { size: 7 }, { size: 6 }],
      step: 13,
    },
    {
      event: "Backtrack",
      caption: "Take 6 back out of bin 3 and try the next bin.",
      focus: ["I4"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "Covered" } },
      assign: [0, 1, 0, -1, -1, -1],
      totals: [{ size: 7 }, { size: 7 }, { size: 0 }],
      step: 14,
    },
    {
      event: "Reject",
      caption:
        "Every bin with room for 6 leaves no room for the items after it, so take back the last choice.",
      focus: ["I4"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Rejected" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "Covered" } },
      assign: [0, 1, 0, -1, -1, -1],
      totals: [{ size: 7 }, { size: 7 }, { size: 0 }],
      step: 15,
    },
    {
      event: "Backtrack",
      caption: "Take 3 back out of bin 1 and try the next bin.",
      focus: ["I3"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "Covered" } },
      assign: [0, 1, -1, -1, -1, -1],
      totals: [{ size: 4 }, { size: 7 }, { size: 0 }],
      step: 16,
    },
    {
      event: "Accept",
      caption: "Put 3 in bin 2: 10 of 10 used.",
      focus: ["I3", "C2"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "ElementHighlight" } },
      assign: [0, 1, 1, -1, -1, -1],
      totals: [{ size: 4 }, { size: 10 }, { size: 0 }],
      step: 17,
    },
    {
      event: "Accept",
      caption: "Put 6 in bin 1: 10 of 10 used.",
      focus: ["I4", "C1"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "ElementHighlight" }, C2: { state: "Covered" } },
      assign: [0, 1, 1, 0, -1, -1],
      totals: [{ size: 10 }, { size: 10 }, { size: 0 }],
      step: 18,
    },
    {
      event: "Accept",
      caption: "Put 2 in bin 3: 2 of 10 used.",
      focus: ["I5", "C3"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Committed" },
        I5: { state: "ElementHighlight" },
      },
      containers: {
        C1: { state: "Covered" },
        C2: { state: "Covered" },
        C3: { state: "ElementHighlight" },
      },
      assign: [0, 1, 1, 0, 2, -1],
      totals: [{ size: 10 }, { size: 10 }, { size: 2 }],
      step: 19,
    },
    {
      event: "Accept",
      caption: "Put 8 in bin 3: 10 of 10 used.",
      focus: ["I6", "C3"],
      items: {
        I1: { state: "Solution" },
        I2: { state: "Solution" },
        I3: { state: "Solution" },
        I4: { state: "Solution" },
        I5: { state: "Solution" },
        I6: { state: "ElementHighlight" },
      },
      containers: {
        C1: { state: "Covered" },
        C2: { state: "Covered" },
        C3: { state: "ElementHighlight" },
      },
      assign: [0, 1, 1, 0, 2, 2],
      totals: [{ size: 10 }, { size: 10 }, { size: 10 }],
      step: 20,
    },
    {
      event: "Done",
      caption: "All 6 items fit in 3 bins of 10, within K = 3.",
      focus: [],
      items: {
        I1: { state: "Solution" },
        I2: { state: "Solution" },
        I3: { state: "Solution" },
        I4: { state: "Solution" },
        I5: { state: "Solution" },
        I6: { state: "Solution" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "Covered" }, C3: { state: "Covered" } },
      assign: [0, 1, 1, 0, 2, 2],
      totals: [{ size: 10 }, { size: 10 }, { size: 10 }],
      step: 21,
      ok: true,
    },
  ],
};

/** format=frames, Bin Packing, ((3,3,3,3,2,2,2,2),10,2), BinPackingFFD: First Fit Decreasing runs out of bins (a 2 no bin has room for, Rejected) and ends on no. */
export const BIN_PACKING_FFD_SHORT_PACKING_FRAMES = {
  type: "Packing",
  payload: {
    kind: "packing",
    rule: "binPacking",
    items: [
      { id: "I1", label: "3", size: 3 },
      { id: "I2", label: "3", size: 3 },
      { id: "I3", label: "3", size: 3 },
      { id: "I4", label: "3", size: 3 },
      { id: "I5", label: "2", size: 2 },
      { id: "I6", label: "2", size: 2 },
      { id: "I7", label: "2", size: 2 },
      { id: "I8", label: "2", size: 2 },
    ],
    containers: [
      { id: "C1", label: "Bin 1", limit: 10 },
      { id: "C2", label: "Bin 2", limit: 10 },
    ],
    total: 20,
    maxBins: 2,
  },
  frames: [
    {
      event: "Try",
      caption: "Sort largest first: 3, 3, 3, 3, 2, 2, 2, 2. Each goes in the first bin with room.",
      focus: [],
      items: {},
      containers: {},
      assign: [-1, -1, -1, -1, -1, -1, -1, -1],
      totals: [{ size: 0 }, { size: 0 }],
      step: 0,
    },
    {
      event: "Accept",
      caption: "3 goes in bin 1: 3 of 10 used.",
      focus: ["I1", "C1"],
      items: { I1: { state: "ElementHighlight" } },
      containers: { C1: { state: "ElementHighlight" } },
      assign: [0, -1, -1, -1, -1, -1, -1, -1],
      totals: [{ size: 3 }, { size: 0 }],
      step: 1,
    },
    {
      event: "Accept",
      caption: "3 fits in bin 1: 6 of 10 used.",
      focus: ["I2", "C1"],
      items: { I1: { state: "Committed" }, I2: { state: "ElementHighlight" } },
      containers: { C1: { state: "ElementHighlight" } },
      assign: [0, 0, -1, -1, -1, -1, -1, -1],
      totals: [{ size: 6 }, { size: 0 }],
      step: 2,
    },
    {
      event: "Accept",
      caption: "3 fits in bin 1: 9 of 10 used.",
      focus: ["I3", "C1"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "ElementHighlight" } },
      assign: [0, 0, 0, -1, -1, -1, -1, -1],
      totals: [{ size: 9 }, { size: 0 }],
      step: 3,
    },
    {
      event: "Accept",
      caption: "No open bin has room for 3, so open bin 2: 3 of 10 used.",
      focus: ["I4", "C2"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "ElementHighlight" } },
      assign: [0, 0, 0, 1, -1, -1, -1, -1],
      totals: [{ size: 9 }, { size: 3 }],
      step: 4,
    },
    {
      event: "Accept",
      caption: "2 doesn't fit in bin 1, so it goes in bin 2: 5 of 10 used.",
      focus: ["I5", "C2"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Committed" },
        I5: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "ElementHighlight" } },
      assign: [0, 0, 0, 1, 1, -1, -1, -1],
      totals: [{ size: 9 }, { size: 5 }],
      step: 5,
    },
    {
      event: "Accept",
      caption: "2 doesn't fit in bin 1, so it goes in bin 2: 7 of 10 used.",
      focus: ["I6", "C2"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Committed" },
        I5: { state: "Committed" },
        I6: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "ElementHighlight" } },
      assign: [0, 0, 0, 1, 1, 1, -1, -1],
      totals: [{ size: 9 }, { size: 7 }],
      step: 6,
    },
    {
      event: "Accept",
      caption: "2 doesn't fit in bin 1, so it goes in bin 2: 9 of 10 used.",
      focus: ["I7", "C2"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Committed" },
        I5: { state: "Committed" },
        I6: { state: "Committed" },
        I7: { state: "ElementHighlight" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "ElementHighlight" } },
      assign: [0, 0, 0, 1, 1, 1, 1, -1],
      totals: [{ size: 9 }, { size: 9 }],
      step: 7,
    },
    {
      event: "Reject",
      caption:
        "No open bin has room for 2, and opening another would need 3 bins, more than K = 2.",
      focus: ["I8"],
      items: {
        I1: { state: "Committed" },
        I2: { state: "Committed" },
        I3: { state: "Committed" },
        I4: { state: "Committed" },
        I5: { state: "Committed" },
        I6: { state: "Committed" },
        I7: { state: "Committed" },
        I8: { state: "Rejected" },
      },
      containers: { C1: { state: "Covered" }, C2: { state: "Covered" } },
      assign: [0, 0, 0, 1, 1, 1, 1, -1],
      totals: [{ size: 9 }, { size: 9 }],
      step: 8,
    },
    {
      event: "Done",
      caption:
        "First Fit Decreasing needs more than 2 bins. It is a heuristic, so the brute force may still find a packing.",
      focus: [],
      items: {},
      containers: {},
      assign: [-1, -1, -1, -1, -1, -1, -1, -1],
      totals: [{ size: 0 }, { size: 0 }],
      step: 9,
      ok: false,
    },
  ],
};

/** format=frames, 3SAT, the problem default ((x1 | !x2 | x3) & (!x1 | x3 | x1) & (x2 | !x3 | !x1)), Sat3BacktrackingSolver: a best-first search, so queued nodes and order badges; the path start, x1=T, x2=T turns green. */
export const SAT3_SEARCH_TREE_FRAMES = {
  type: "SearchTree",
  payload: {
    kind: "searchTree",
    problem: "3SAT",
    instance: "(x1 | !x2 | x3) & (!x1 | x3 | x1) & (x2 | !x3 | !x1)",
    maxLeaves: 12,
  },
  frames: [
    {
      event: "Try",
      caption: "Try x1 = True.",
      focus: ["n1"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered", order: 1 },
        { id: "n1", parent: "n0", label: "x1=T", kind: "explored", state: "ElementHighlight" },
      ],
      total: 2,
      cut: 0,
      step: 0,
    },
    {
      event: "Accept",
      caption: "Keep x1 = True: no clause has every literal false yet, so this branch is queued.",
      focus: ["n1"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered", order: 1 },
        {
          id: "n1",
          parent: "n0",
          label: "x1=T",
          kind: "queued",
          state: "ElementHighlight",
          bound: "priority -1",
        },
      ],
      total: 2,
      cut: 0,
      step: 1,
    },
    {
      event: "Try",
      caption: "Try x1 = False.",
      focus: ["n2"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered", order: 1 },
        {
          id: "n1",
          parent: "n0",
          label: "x1=T",
          kind: "queued",
          state: "Untraveled",
          bound: "priority -1",
        },
        { id: "n2", parent: "n0", label: "x1=F", kind: "explored", state: "ElementHighlight" },
      ],
      total: 3,
      cut: 0,
      step: 2,
    },
    {
      event: "Accept",
      caption: "Keep x1 = False: no clause has every literal false yet, so this branch is queued.",
      focus: ["n2"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered", order: 1 },
        {
          id: "n1",
          parent: "n0",
          label: "x1=T",
          kind: "queued",
          state: "Untraveled",
          bound: "priority -1",
        },
        {
          id: "n2",
          parent: "n0",
          label: "x1=F",
          kind: "queued",
          state: "ElementHighlight",
          bound: "priority -1",
        },
      ],
      total: 3,
      cut: 0,
      step: 3,
    },
    {
      event: "Try",
      caption: "Try x2 = True after x1 = True.",
      focus: ["n3"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered", order: 1 },
        {
          id: "n1",
          parent: "n0",
          label: "x1=T",
          kind: "explored",
          state: "Covered",
          bound: "priority -1",
          order: 2,
        },
        { id: "n3", parent: "n1", label: "x2=T", kind: "explored", state: "ElementHighlight" },
        {
          id: "n2",
          parent: "n0",
          label: "x1=F",
          kind: "queued",
          state: "Untraveled",
          bound: "priority -1",
        },
      ],
      total: 4,
      cut: 0,
      step: 4,
    },
    {
      event: "Accept",
      caption: "Keep x2 = True: every clause now has a true literal.",
      focus: ["n3"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Solution", order: 1 },
        {
          id: "n1",
          parent: "n0",
          label: "x1=T",
          kind: "explored",
          state: "Solution",
          bound: "priority -1",
          order: 2,
        },
        { id: "n3", parent: "n1", label: "x2=T", kind: "solution", state: "ElementHighlight" },
        {
          id: "n2",
          parent: "n0",
          label: "x1=F",
          kind: "queued",
          state: "Untraveled",
          bound: "priority -1",
        },
      ],
      total: 4,
      cut: 0,
      step: 5,
    },
    {
      event: "Done",
      caption: "Every clause has a true literal under x1 = True, x2 = True, x3 = False.",
      focus: [],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Solution", order: 1 },
        {
          id: "n1",
          parent: "n0",
          label: "x1=T",
          kind: "explored",
          state: "Solution",
          bound: "priority -1",
          order: 2,
        },
        { id: "n3", parent: "n1", label: "x2=T", kind: "solution", state: "Solution" },
        {
          id: "n2",
          parent: "n0",
          label: "x1=F",
          kind: "queued",
          state: "Untraveled",
          bound: "priority -1",
        },
      ],
      total: 4,
      cut: 0,
      step: 6,
      ok: true,
    },
  ],
};

/** format=frames, 3SAT, (x1 | x1 | x1) & (!x1 | !x1 | !x1), Sat3BacktrackingSolver: every branch cut by a clause it makes false, a Done that is not ok. */
export const SAT3_UNSAT_SEARCH_TREE_FRAMES = {
  type: "SearchTree",
  payload: {
    kind: "searchTree",
    problem: "3SAT",
    instance: "(x1 | x1 | x1) & (!x1 | !x1 | !x1)",
    maxLeaves: 12,
  },
  frames: [
    {
      event: "Try",
      caption: "Try x1 = True.",
      focus: ["n1"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered", order: 1 },
        { id: "n1", parent: "n0", label: "x1=T", kind: "explored", state: "ElementHighlight" },
      ],
      total: 2,
      cut: 0,
      step: 0,
    },
    {
      event: "Reject",
      caption: "x1 = True fails: clause C2 (!x1 | !x1 | !x1) has no true literal left.",
      focus: ["n1"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered", order: 1 },
        {
          id: "n1",
          parent: "n0",
          label: "x1=T",
          kind: "pruned",
          state: "Rejected",
          bound: "C2 false",
        },
      ],
      total: 2,
      cut: 1,
      step: 1,
    },
    {
      event: "Try",
      caption: "Try x1 = False.",
      focus: ["n2"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered", order: 1 },
        {
          id: "n1",
          parent: "n0",
          label: "x1=T",
          kind: "pruned",
          state: "Rejected",
          bound: "C2 false",
        },
        { id: "n2", parent: "n0", label: "x1=F", kind: "explored", state: "ElementHighlight" },
      ],
      total: 3,
      cut: 1,
      step: 2,
    },
    {
      event: "Reject",
      caption: "x1 = False fails: clause C1 (x1 | x1 | x1) has no true literal left.",
      focus: ["n2"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered", order: 1 },
        {
          id: "n1",
          parent: "n0",
          label: "x1=T",
          kind: "pruned",
          state: "Rejected",
          bound: "C2 false",
        },
        {
          id: "n2",
          parent: "n0",
          label: "x1=F",
          kind: "pruned",
          state: "Rejected",
          bound: "C1 false",
        },
      ],
      total: 3,
      cut: 2,
      step: 3,
    },
    {
      event: "Done",
      caption: "Every branch was rejected, so there is no solution.",
      focus: [],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered", order: 1 },
        {
          id: "n1",
          parent: "n0",
          label: "x1=T",
          kind: "pruned",
          state: "Rejected",
          bound: "C2 false",
        },
        {
          id: "n2",
          parent: "n0",
          label: "x1=F",
          kind: "pruned",
          state: "Rejected",
          bound: "C1 false",
        },
      ],
      total: 3,
      cut: 2,
      step: 4,
      ok: false,
    },
  ],
};

/** format=frames, Traveling Salesperson, the problem default (five cities, K = 8000), TSPBranchAndBound: lower bounds under every node, the branches whose bound can't beat the greedy tour cut. The answer is that greedy tour, found before the search, so no node of the tree is its path. */
export const TSP_SEARCH_TREE_FRAMES = {
  type: "SearchTree",
  payload: {
    kind: "searchTree",
    problem: "Traveling Salesperson",
    instance:
      "(({New York,Chicago,Denver,Los Angeles,Miami},{({New York,Chicago},790),({New York,Denver},1770),({New York,Los Angeles},2450),({New York,Miami},1280),({Chicago,Denver},1000),({Chicago,Los Angeles},2015),({Chicago,Miami},1370),({Denver,Los Angeles},1015),({Denver,Miami},2060),({Los Angeles,Miami},2745)}),8000)",
    maxLeaves: 12,
  },
  frames: [
    {
      event: "Accept",
      caption:
        "Start from the greedy tour New York → Chicago → Denver → Los Angeles → Miami → New York: total 6830, the best so far.",
      focus: ["n0"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "queued",
          state: "ElementHighlight",
          bound: "lb 5380",
        },
      ],
      total: 1,
      cut: 0,
      step: 0,
    },
    {
      event: "Try",
      caption: "Expand the path New York: lower bound 5380.",
      focus: ["n0"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "ElementHighlight",
          bound: "lb 5380",
          order: 1,
        },
      ],
      total: 1,
      cut: 0,
      step: 1,
    },
    {
      event: "Accept",
      caption: "Branch New York → Chicago (weight 790, path cost 790): lower bound 5470, queued.",
      focus: ["n1"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "queued",
          state: "ElementHighlight",
          bound: "lb 5470",
        },
      ],
      total: 2,
      cut: 0,
      step: 2,
    },
    {
      event: "Reject",
      caption:
        "Skip Denver after New York: the lower bound 7450 is no better than the best tour so far (6830).",
      focus: ["n2"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "queued",
          state: "Untraveled",
          bound: "lb 5470",
        },
        {
          id: "n2",
          parent: "n0",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
      ],
      total: 3,
      cut: 1,
      step: 3,
    },
    {
      event: "Reject",
      caption:
        "Skip Los Angeles after New York: the lower bound 7115 is no better than the best tour so far (6830).",
      focus: ["n3"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "queued",
          state: "Untraveled",
          bound: "lb 5470",
        },
        {
          id: "n2",
          parent: "n0",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n3",
          parent: "n0",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
      ],
      total: 4,
      cut: 2,
      step: 4,
    },
    {
      event: "Accept",
      caption: "Branch New York → Miami (weight 1280, path cost 1280): lower bound 5470, queued.",
      focus: ["n4"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "queued",
          state: "Untraveled",
          bound: "lb 5470",
        },
        {
          id: "n2",
          parent: "n0",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n3",
          parent: "n0",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n4",
          parent: "n0",
          label: "Miami",
          kind: "queued",
          state: "ElementHighlight",
          bound: "lb 5470",
        },
      ],
      total: 5,
      cut: 2,
      step: 5,
    },
    {
      event: "Try",
      caption: "Expand the path New York → Chicago: lower bound 5470.",
      focus: ["n1"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "explored",
          state: "ElementHighlight",
          bound: "lb 5470",
          order: 2,
        },
        {
          id: "n2",
          parent: "n0",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n3",
          parent: "n0",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n4",
          parent: "n0",
          label: "Miami",
          kind: "queued",
          state: "Untraveled",
          bound: "lb 5470",
        },
      ],
      total: 5,
      cut: 2,
      step: 6,
    },
    {
      event: "Reject",
      caption:
        "Skip Denver after Chicago: the lower bound 6830 is no better than the best tour so far (6830).",
      focus: ["n5"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 2,
        },
        {
          id: "n5",
          parent: "n1",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
        {
          id: "n2",
          parent: "n0",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n3",
          parent: "n0",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n4",
          parent: "n0",
          label: "Miami",
          kind: "queued",
          state: "Untraveled",
          bound: "lb 5470",
        },
      ],
      total: 6,
      cut: 3,
      step: 7,
    },
    {
      event: "Reject",
      caption:
        "Skip Los Angeles after Chicago: the lower bound 7160 is no better than the best tour so far (6830).",
      focus: ["n6"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 2,
        },
        {
          id: "n5",
          parent: "n1",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
        {
          id: "n6",
          parent: "n1",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
        {
          id: "n2",
          parent: "n0",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n3",
          parent: "n0",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n4",
          parent: "n0",
          label: "Miami",
          kind: "queued",
          state: "Untraveled",
          bound: "lb 5470",
        },
      ],
      total: 7,
      cut: 4,
      step: 8,
    },
    {
      event: "Reject",
      caption:
        "Skip Miami after Chicago: the lower bound 7020 is no better than the best tour so far (6830).",
      focus: ["n7"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 2,
        },
        {
          id: "n5",
          parent: "n1",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
        {
          id: "n6",
          parent: "n1",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
        {
          id: "n7",
          parent: "n1",
          label: "Miami",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7020 ≥ 6830",
        },
        {
          id: "n2",
          parent: "n0",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n3",
          parent: "n0",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n4",
          parent: "n0",
          label: "Miami",
          kind: "queued",
          state: "Untraveled",
          bound: "lb 5470",
        },
      ],
      total: 8,
      cut: 5,
      step: 9,
    },
    {
      event: "Try",
      caption: "Expand the path New York → Miami: lower bound 5470.",
      focus: ["n4"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 2,
        },
        {
          id: "n5",
          parent: "n1",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
        {
          id: "n6",
          parent: "n1",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
        {
          id: "n7",
          parent: "n1",
          label: "Miami",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7020 ≥ 6830",
        },
        {
          id: "n2",
          parent: "n0",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n3",
          parent: "n0",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n4",
          parent: "n0",
          label: "Miami",
          kind: "explored",
          state: "ElementHighlight",
          bound: "lb 5470",
          order: 3,
        },
      ],
      total: 8,
      cut: 5,
      step: 10,
    },
    {
      event: "Accept",
      caption: "Branch Miami → Chicago (weight 1370, path cost 2650): lower bound 6450, queued.",
      focus: ["n8"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 2,
        },
        {
          id: "n5",
          parent: "n1",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
        {
          id: "n6",
          parent: "n1",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
        {
          id: "n7",
          parent: "n1",
          label: "Miami",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7020 ≥ 6830",
        },
        {
          id: "n2",
          parent: "n0",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n3",
          parent: "n0",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n4",
          parent: "n0",
          label: "Miami",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 3,
        },
        {
          id: "n8",
          parent: "n4",
          label: "Chicago",
          kind: "queued",
          state: "ElementHighlight",
          bound: "lb 6450",
        },
      ],
      total: 9,
      cut: 5,
      step: 11,
    },
    {
      event: "Reject",
      caption:
        "Skip Denver after Miami: the lower bound 7160 is no better than the best tour so far (6830).",
      focus: ["n9"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 2,
        },
        {
          id: "n5",
          parent: "n1",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
        {
          id: "n6",
          parent: "n1",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
        {
          id: "n7",
          parent: "n1",
          label: "Miami",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7020 ≥ 6830",
        },
        {
          id: "n2",
          parent: "n0",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n3",
          parent: "n0",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n4",
          parent: "n0",
          label: "Miami",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 3,
        },
        {
          id: "n8",
          parent: "n4",
          label: "Chicago",
          kind: "queued",
          state: "Untraveled",
          bound: "lb 6450",
        },
        {
          id: "n9",
          parent: "n4",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
      ],
      total: 10,
      cut: 6,
      step: 12,
    },
    {
      event: "Reject",
      caption:
        "Skip Los Angeles after Miami: the lower bound 6830 is no better than the best tour so far (6830).",
      focus: ["n10"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 2,
        },
        {
          id: "n5",
          parent: "n1",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
        {
          id: "n6",
          parent: "n1",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
        {
          id: "n7",
          parent: "n1",
          label: "Miami",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7020 ≥ 6830",
        },
        {
          id: "n2",
          parent: "n0",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n3",
          parent: "n0",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n4",
          parent: "n0",
          label: "Miami",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 3,
        },
        {
          id: "n8",
          parent: "n4",
          label: "Chicago",
          kind: "queued",
          state: "Untraveled",
          bound: "lb 6450",
        },
        {
          id: "n9",
          parent: "n4",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
        {
          id: "n10",
          parent: "n4",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
      ],
      total: 11,
      cut: 7,
      step: 13,
    },
    {
      event: "Try",
      caption: "Expand the path New York → Miami → Chicago: lower bound 6450.",
      focus: ["n8"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 2,
        },
        {
          id: "n5",
          parent: "n1",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
        {
          id: "n6",
          parent: "n1",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
        {
          id: "n7",
          parent: "n1",
          label: "Miami",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7020 ≥ 6830",
        },
        {
          id: "n2",
          parent: "n0",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n3",
          parent: "n0",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n4",
          parent: "n0",
          label: "Miami",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 3,
        },
        {
          id: "n8",
          parent: "n4",
          label: "Chicago",
          kind: "explored",
          state: "ElementHighlight",
          bound: "lb 6450",
          order: 4,
        },
        {
          id: "n9",
          parent: "n4",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
        {
          id: "n10",
          parent: "n4",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
      ],
      total: 11,
      cut: 7,
      step: 14,
    },
    {
      event: "Reject",
      caption:
        "Skip Denver after Chicago: the lower bound 7115 is no better than the best tour so far (6830).",
      focus: ["n11"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 2,
        },
        {
          id: "n5",
          parent: "n1",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
        {
          id: "n6",
          parent: "n1",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
        {
          id: "n7",
          parent: "n1",
          label: "Miami",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7020 ≥ 6830",
        },
        {
          id: "n2",
          parent: "n0",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n3",
          parent: "n0",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n4",
          parent: "n0",
          label: "Miami",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 3,
        },
        {
          id: "n8",
          parent: "n4",
          label: "Chicago",
          kind: "explored",
          state: "Covered",
          bound: "lb 6450",
          order: 4,
        },
        {
          id: "n11",
          parent: "n8",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n9",
          parent: "n4",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
        {
          id: "n10",
          parent: "n4",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
      ],
      total: 12,
      cut: 8,
      step: 15,
    },
    {
      event: "Reject",
      caption:
        "Skip Los Angeles after Chicago: the lower bound 7450 is no better than the best tour so far (6830).",
      focus: ["n12"],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 2,
        },
        {
          id: "n5",
          parent: "n1",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
        {
          id: "n6",
          parent: "n1",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
        {
          id: "n7",
          parent: "n1",
          label: "Miami",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7020 ≥ 6830",
        },
        {
          id: "n2",
          parent: "n0",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n3",
          parent: "n0",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n4",
          parent: "n0",
          label: "Miami",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 3,
        },
        {
          id: "n8",
          parent: "n4",
          label: "Chicago",
          kind: "explored",
          state: "Covered",
          bound: "lb 6450",
          order: 4,
        },
        {
          id: "n11",
          parent: "n8",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n12",
          parent: "n8",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n9",
          parent: "n4",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
        {
          id: "n10",
          parent: "n4",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
      ],
      total: 13,
      cut: 9,
      step: 16,
    },
    {
      event: "Done",
      caption:
        "The cheapest tour is New York → Chicago → Denver → Los Angeles → Miami → New York, total 6830, within K = 8000.",
      focus: [],
      nodes: [
        {
          id: "n0",
          parent: null,
          label: "New York",
          kind: "explored",
          state: "Covered",
          bound: "lb 5380",
          order: 1,
        },
        {
          id: "n1",
          parent: "n0",
          label: "Chicago",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 2,
        },
        {
          id: "n5",
          parent: "n1",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
        {
          id: "n6",
          parent: "n1",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
        {
          id: "n7",
          parent: "n1",
          label: "Miami",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7020 ≥ 6830",
        },
        {
          id: "n2",
          parent: "n0",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n3",
          parent: "n0",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n4",
          parent: "n0",
          label: "Miami",
          kind: "explored",
          state: "Covered",
          bound: "lb 5470",
          order: 3,
        },
        {
          id: "n8",
          parent: "n4",
          label: "Chicago",
          kind: "explored",
          state: "Covered",
          bound: "lb 6450",
          order: 4,
        },
        {
          id: "n11",
          parent: "n8",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7115 ≥ 6830",
        },
        {
          id: "n12",
          parent: "n8",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7450 ≥ 6830",
        },
        {
          id: "n9",
          parent: "n4",
          label: "Denver",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 7160 ≥ 6830",
        },
        {
          id: "n10",
          parent: "n4",
          label: "Los Angeles",
          kind: "pruned",
          state: "Rejected",
          bound: "lb 6830 ≥ 6830",
        },
      ],
      total: 13,
      cut: 9,
      step: 17,
      ok: true,
    },
  ],
};

/** format=frames, Graph Coloring, the problem default (nine nodes, K = 3), GraphColoringBacktracking: the clash under each cut color, cut siblings folded into one "2 cut" node once the tree is wide, and the answer's path from start to i=2. */
export const GRAPH_COLORING_SEARCH_TREE_FRAMES = {
  type: "SearchTree",
  payload: {
    kind: "searchTree",
    problem: "Graph Coloring",
    instance:
      "(({a,b,c,d,e,f,g,h,i},{{a,b},{b,c},{a,c},{d,a},{d,e},{a,e},{a,f},{f,g},{g,a},{a,h},{h,i},{i,a}}),3)",
    maxLeaves: 12,
  },
  frames: [
    {
      event: "Accept",
      caption: "Color node a with color 0: no neighbour is colored yet.",
      focus: ["n1"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "ElementHighlight" },
      ],
      total: 2,
      cut: 0,
      step: 0,
    },
    {
      event: "Reject",
      caption: "Color 0 for node b clashes: its neighbour a already has color 0.",
      focus: ["n2"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
      ],
      total: 3,
      cut: 1,
      step: 1,
    },
    {
      event: "Accept",
      caption: "Color node b with color 1: neighbour a uses color 0.",
      focus: ["n3"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "ElementHighlight" },
      ],
      total: 4,
      cut: 1,
      step: 2,
    },
    {
      event: "Reject",
      caption: "Color 0 for node c clashes: its neighbour a already has color 0.",
      focus: ["n4"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
      ],
      total: 5,
      cut: 2,
      step: 3,
    },
    {
      event: "Reject",
      caption: "Color 1 for node c clashes: its neighbour b already has color 1.",
      focus: ["n5"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
      ],
      total: 6,
      cut: 3,
      step: 4,
    },
    {
      event: "Accept",
      caption: "Color node c with color 2: neighbours a and b use colors 0 and 1.",
      focus: ["n6"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "ElementHighlight" },
      ],
      total: 7,
      cut: 3,
      step: 5,
    },
    {
      event: "Reject",
      caption: "Color 0 for node d clashes: its neighbour a already has color 0.",
      focus: ["n7"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Covered" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
      ],
      total: 8,
      cut: 4,
      step: 6,
    },
    {
      event: "Accept",
      caption: "Color node d with color 1: neighbour a uses color 0.",
      focus: ["n8"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Covered" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n8", parent: "n6", label: "d=1", kind: "explored", state: "ElementHighlight" },
      ],
      total: 9,
      cut: 4,
      step: 7,
    },
    {
      event: "Reject",
      caption: "Color 0 for node e clashes: its neighbour a already has color 0.",
      focus: ["n9"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Covered" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n8", parent: "n6", label: "d=1", kind: "explored", state: "Covered" },
        {
          id: "n9",
          parent: "n8",
          label: "e=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
      ],
      total: 10,
      cut: 5,
      step: 8,
    },
    {
      event: "Reject",
      caption: "Color 1 for node e clashes: its neighbour d already has color 1.",
      focus: ["n10"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Covered" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n8", parent: "n6", label: "d=1", kind: "explored", state: "Covered" },
        {
          id: "n9",
          parent: "n8",
          label: "e=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n10",
          parent: "n8",
          label: "e=1",
          kind: "pruned",
          state: "Rejected",
          bound: "d has 1",
        },
      ],
      total: 11,
      cut: 6,
      step: 9,
    },
    {
      event: "Accept",
      caption: "Color node e with color 2: neighbours a and d use colors 0 and 1.",
      focus: ["n11"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Covered" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n8", parent: "n6", label: "d=1", kind: "explored", state: "Covered" },
        {
          id: "n9",
          parent: "n8",
          label: "e=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n10",
          parent: "n8",
          label: "e=1",
          kind: "pruned",
          state: "Rejected",
          bound: "d has 1",
        },
        { id: "n11", parent: "n8", label: "e=2", kind: "explored", state: "ElementHighlight" },
      ],
      total: 12,
      cut: 6,
      step: 10,
    },
    {
      event: "Reject",
      caption: "Color 0 for node f clashes: its neighbour a already has color 0.",
      focus: ["n12"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Covered" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n8", parent: "n6", label: "d=1", kind: "explored", state: "Covered" },
        {
          id: "n9",
          parent: "n8",
          label: "e=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n10",
          parent: "n8",
          label: "e=1",
          kind: "pruned",
          state: "Rejected",
          bound: "d has 1",
        },
        { id: "n11", parent: "n8", label: "e=2", kind: "explored", state: "Covered" },
        {
          id: "n12",
          parent: "n11",
          label: "f=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
      ],
      total: 13,
      cut: 7,
      step: 11,
    },
    {
      event: "Accept",
      caption: "Color node f with color 1: neighbour a uses color 0.",
      focus: ["n13"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Covered" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n8", parent: "n6", label: "d=1", kind: "explored", state: "Covered" },
        {
          id: "n9",
          parent: "n8",
          label: "e=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n10",
          parent: "n8",
          label: "e=1",
          kind: "pruned",
          state: "Rejected",
          bound: "d has 1",
        },
        { id: "n11", parent: "n8", label: "e=2", kind: "explored", state: "Covered" },
        {
          id: "n12",
          parent: "n11",
          label: "f=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n13", parent: "n11", label: "f=1", kind: "explored", state: "ElementHighlight" },
      ],
      total: 14,
      cut: 7,
      step: 12,
    },
    {
      event: "Reject",
      caption: "Color 0 for node g clashes: its neighbour a already has color 0.",
      focus: ["n14"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Covered" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n8", parent: "n6", label: "d=1", kind: "explored", state: "Covered" },
        {
          id: "n9",
          parent: "n8",
          label: "e=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n10",
          parent: "n8",
          label: "e=1",
          kind: "pruned",
          state: "Rejected",
          bound: "d has 1",
        },
        { id: "n11", parent: "n8", label: "e=2", kind: "explored", state: "Covered" },
        {
          id: "n12",
          parent: "n11",
          label: "f=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n13", parent: "n11", label: "f=1", kind: "explored", state: "Covered" },
        {
          id: "n14",
          parent: "n13",
          label: "g=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
      ],
      total: 15,
      cut: 8,
      step: 13,
    },
    {
      event: "Reject",
      caption: "Color 1 for node g clashes: its neighbour f already has color 1.",
      focus: ["n15"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Covered" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n8", parent: "n6", label: "d=1", kind: "explored", state: "Covered" },
        {
          id: "n9",
          parent: "n8",
          label: "e=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n10",
          parent: "n8",
          label: "e=1",
          kind: "pruned",
          state: "Rejected",
          bound: "d has 1",
        },
        { id: "n11", parent: "n8", label: "e=2", kind: "explored", state: "Covered" },
        {
          id: "n12",
          parent: "n11",
          label: "f=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n13", parent: "n11", label: "f=1", kind: "explored", state: "Covered" },
        {
          id: "n14",
          parent: "n13",
          label: "g=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n15",
          parent: "n13",
          label: "g=1",
          kind: "pruned",
          state: "Rejected",
          bound: "f has 1",
        },
      ],
      total: 16,
      cut: 9,
      step: 14,
    },
    {
      event: "Accept",
      caption: "Color node g with color 2: neighbours a and f use colors 0 and 1.",
      focus: ["n16"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Covered" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n8", parent: "n6", label: "d=1", kind: "explored", state: "Covered" },
        {
          id: "n9",
          parent: "n8",
          label: "e=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n10",
          parent: "n8",
          label: "e=1",
          kind: "pruned",
          state: "Rejected",
          bound: "d has 1",
        },
        { id: "n11", parent: "n8", label: "e=2", kind: "explored", state: "Covered" },
        {
          id: "n12",
          parent: "n11",
          label: "f=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n13", parent: "n11", label: "f=1", kind: "explored", state: "Covered" },
        {
          id: "n14",
          parent: "n13",
          label: "g=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n15",
          parent: "n13",
          label: "g=1",
          kind: "pruned",
          state: "Rejected",
          bound: "f has 1",
        },
        { id: "n16", parent: "n13", label: "g=2", kind: "explored", state: "ElementHighlight" },
      ],
      total: 17,
      cut: 9,
      step: 15,
    },
    {
      event: "Reject",
      caption: "Color 0 for node h clashes: its neighbour a already has color 0.",
      focus: ["n17"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Covered" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n8", parent: "n6", label: "d=1", kind: "explored", state: "Covered" },
        {
          id: "n9",
          parent: "n8",
          label: "e=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n10",
          parent: "n8",
          label: "e=1",
          kind: "pruned",
          state: "Rejected",
          bound: "d has 1",
        },
        { id: "n11", parent: "n8", label: "e=2", kind: "explored", state: "Covered" },
        {
          id: "n12",
          parent: "n11",
          label: "f=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n13", parent: "n11", label: "f=1", kind: "explored", state: "Covered" },
        {
          id: "n14",
          parent: "n13",
          label: "g=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n15",
          parent: "n13",
          label: "g=1",
          kind: "pruned",
          state: "Rejected",
          bound: "f has 1",
        },
        { id: "n16", parent: "n13", label: "g=2", kind: "explored", state: "Covered" },
        {
          id: "n17",
          parent: "n16",
          label: "h=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
      ],
      total: 18,
      cut: 10,
      step: 16,
    },
    {
      event: "Accept",
      caption: "Color node h with color 1: neighbour a uses color 0.",
      focus: ["n18"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Covered" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n8", parent: "n6", label: "d=1", kind: "explored", state: "Covered" },
        {
          id: "n9",
          parent: "n8",
          label: "e=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n10",
          parent: "n8",
          label: "e=1",
          kind: "pruned",
          state: "Rejected",
          bound: "d has 1",
        },
        { id: "n11", parent: "n8", label: "e=2", kind: "explored", state: "Covered" },
        {
          id: "n12",
          parent: "n11",
          label: "f=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n13", parent: "n11", label: "f=1", kind: "explored", state: "Covered" },
        {
          id: "n14",
          parent: "n13",
          label: "g=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n15",
          parent: "n13",
          label: "g=1",
          kind: "pruned",
          state: "Rejected",
          bound: "f has 1",
        },
        { id: "n16", parent: "n13", label: "g=2", kind: "explored", state: "Covered" },
        {
          id: "n17",
          parent: "n16",
          label: "h=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n18", parent: "n16", label: "h=1", kind: "explored", state: "ElementHighlight" },
      ],
      total: 19,
      cut: 10,
      step: 17,
    },
    {
      event: "Reject",
      caption: "Color 0 for node i clashes: its neighbour a already has color 0.",
      focus: ["n19"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Covered" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n8", parent: "n6", label: "d=1", kind: "explored", state: "Covered" },
        {
          id: "n9",
          parent: "n8",
          label: "e=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n10",
          parent: "n8",
          label: "e=1",
          kind: "pruned",
          state: "Rejected",
          bound: "d has 1",
        },
        { id: "n11", parent: "n8", label: "e=2", kind: "explored", state: "Covered" },
        {
          id: "n12",
          parent: "n11",
          label: "f=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n13", parent: "n11", label: "f=1", kind: "explored", state: "Covered" },
        {
          id: "n14",
          parent: "n13",
          label: "g=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n15",
          parent: "n13",
          label: "g=1",
          kind: "pruned",
          state: "Rejected",
          bound: "f has 1",
        },
        { id: "n16", parent: "n13", label: "g=2", kind: "explored", state: "Covered" },
        {
          id: "n17",
          parent: "n16",
          label: "h=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n18", parent: "n16", label: "h=1", kind: "explored", state: "Covered" },
        {
          id: "n19",
          parent: "n18",
          label: "i=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
      ],
      total: 20,
      cut: 11,
      step: 18,
    },
    {
      event: "Reject",
      caption: "Color 1 for node i clashes: its neighbour h already has color 1.",
      focus: ["n20"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "c=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "c=1",
          kind: "pruned",
          state: "Rejected",
          bound: "b has 1",
        },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Covered" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n8", parent: "n6", label: "d=1", kind: "explored", state: "Covered" },
        {
          id: "n9",
          parent: "n8",
          label: "e=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n10",
          parent: "n8",
          label: "e=1",
          kind: "pruned",
          state: "Rejected",
          bound: "d has 1",
        },
        { id: "n11", parent: "n8", label: "e=2", kind: "explored", state: "Covered" },
        {
          id: "n12",
          parent: "n11",
          label: "f=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n13", parent: "n11", label: "f=1", kind: "explored", state: "Covered" },
        {
          id: "n14",
          parent: "n13",
          label: "g=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n15",
          parent: "n13",
          label: "g=1",
          kind: "pruned",
          state: "Rejected",
          bound: "f has 1",
        },
        { id: "n16", parent: "n13", label: "g=2", kind: "explored", state: "Covered" },
        {
          id: "n17",
          parent: "n16",
          label: "h=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n18", parent: "n16", label: "h=1", kind: "explored", state: "Covered" },
        {
          id: "n19",
          parent: "n18",
          label: "i=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        {
          id: "n20",
          parent: "n18",
          label: "i=1",
          kind: "pruned",
          state: "Rejected",
          bound: "h has 1",
        },
      ],
      total: 21,
      cut: 12,
      step: 19,
    },
    {
      event: "Accept",
      caption: "Color node i with color 2: neighbours a and h use colors 0 and 1.",
      focus: ["n21"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Solution" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Solution" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Solution" },
        { id: "n3.cut", parent: "n3", label: "2 cut", kind: "cut", state: "Rejected", hidden: 2 },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Solution" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n8", parent: "n6", label: "d=1", kind: "explored", state: "Solution" },
        { id: "n8.cut", parent: "n8", label: "2 cut", kind: "cut", state: "Rejected", hidden: 2 },
        { id: "n11", parent: "n8", label: "e=2", kind: "explored", state: "Solution" },
        {
          id: "n12",
          parent: "n11",
          label: "f=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n13", parent: "n11", label: "f=1", kind: "explored", state: "Solution" },
        { id: "n13.cut", parent: "n13", label: "2 cut", kind: "cut", state: "Rejected", hidden: 2 },
        { id: "n16", parent: "n13", label: "g=2", kind: "explored", state: "Solution" },
        {
          id: "n17",
          parent: "n16",
          label: "h=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n18", parent: "n16", label: "h=1", kind: "explored", state: "Solution" },
        { id: "n18.cut", parent: "n18", label: "2 cut", kind: "cut", state: "Rejected", hidden: 2 },
        { id: "n21", parent: "n18", label: "i=2", kind: "solution", state: "ElementHighlight" },
      ],
      total: 22,
      cut: 12,
      step: 20,
    },
    {
      event: "Done",
      caption:
        "Every node is colored with 3 colors, within K = 3, and no edge joins two nodes of one color. Found after 9 colors given.",
      focus: [],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Solution" },
        { id: "n1", parent: "n0", label: "a=0", kind: "explored", state: "Solution" },
        {
          id: "n2",
          parent: "n1",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n3", parent: "n1", label: "b=1", kind: "explored", state: "Solution" },
        { id: "n3.cut", parent: "n3", label: "2 cut", kind: "cut", state: "Rejected", hidden: 2 },
        { id: "n6", parent: "n3", label: "c=2", kind: "explored", state: "Solution" },
        {
          id: "n7",
          parent: "n6",
          label: "d=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n8", parent: "n6", label: "d=1", kind: "explored", state: "Solution" },
        { id: "n8.cut", parent: "n8", label: "2 cut", kind: "cut", state: "Rejected", hidden: 2 },
        { id: "n11", parent: "n8", label: "e=2", kind: "explored", state: "Solution" },
        {
          id: "n12",
          parent: "n11",
          label: "f=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n13", parent: "n11", label: "f=1", kind: "explored", state: "Solution" },
        { id: "n13.cut", parent: "n13", label: "2 cut", kind: "cut", state: "Rejected", hidden: 2 },
        { id: "n16", parent: "n13", label: "g=2", kind: "explored", state: "Solution" },
        {
          id: "n17",
          parent: "n16",
          label: "h=0",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 0",
        },
        { id: "n18", parent: "n16", label: "h=1", kind: "explored", state: "Solution" },
        { id: "n18.cut", parent: "n18", label: "2 cut", kind: "cut", state: "Rejected", hidden: 2 },
        { id: "n21", parent: "n18", label: "i=2", kind: "solution", state: "Solution" },
      ],
      total: 22,
      cut: 12,
      step: 21,
      ok: true,
    },
  ],
};

/** format=frames, Graph Coloring, (({a,b,c,d},{{a,b},{b,c},{c,a},{c,d}}),2) (a triangle, so no 2-coloring), GraphColoringBacktracking: explored branches backed out of (failed, solid red) and a Done that is not ok. */
export const GRAPH_COLORING_FAILED_SEARCH_TREE_FRAMES = {
  type: "SearchTree",
  payload: {
    kind: "searchTree",
    problem: "Graph Coloring",
    instance: "(({a,b,c,d},{{a,b},{b,c},{c,a},{c,d}}),2)",
    maxLeaves: 12,
  },
  frames: [
    {
      event: "Accept",
      caption: "Color node c with color 0: no neighbour is colored yet.",
      focus: ["n1"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "c=0", kind: "explored", state: "ElementHighlight" },
      ],
      total: 2,
      cut: 0,
      step: 0,
    },
    {
      event: "Reject",
      caption: "Color 0 for node a clashes: its neighbour c already has color 0.",
      focus: ["n2"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "c=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "a=0",
          kind: "pruned",
          state: "Rejected",
          bound: "c has 0",
        },
      ],
      total: 3,
      cut: 1,
      step: 1,
    },
    {
      event: "Accept",
      caption: "Color node a with color 1: neighbour c uses color 0.",
      focus: ["n3"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "c=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "a=0",
          kind: "pruned",
          state: "Rejected",
          bound: "c has 0",
        },
        { id: "n3", parent: "n1", label: "a=1", kind: "explored", state: "ElementHighlight" },
      ],
      total: 4,
      cut: 1,
      step: 2,
    },
    {
      event: "Reject",
      caption: "Color 0 for node b clashes: its neighbour c already has color 0.",
      focus: ["n4"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "c=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "a=0",
          kind: "pruned",
          state: "Rejected",
          bound: "c has 0",
        },
        { id: "n3", parent: "n1", label: "a=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "c has 0",
        },
      ],
      total: 5,
      cut: 2,
      step: 3,
    },
    {
      event: "Reject",
      caption: "Color 1 for node b clashes: its neighbour a already has color 1.",
      focus: ["n5"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "c=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "a=0",
          kind: "pruned",
          state: "Rejected",
          bound: "c has 0",
        },
        { id: "n3", parent: "n1", label: "a=1", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "c has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "b=1",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 1",
        },
      ],
      total: 6,
      cut: 3,
      step: 4,
    },
    {
      event: "Backtrack",
      caption: "The nodes after a can't all be colored with a in color 1, so take that color back.",
      focus: ["n3"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "c=0", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "a=0",
          kind: "pruned",
          state: "Rejected",
          bound: "c has 0",
        },
        { id: "n3", parent: "n1", label: "a=1", kind: "failed", state: "Rejected" },
        {
          id: "n4",
          parent: "n3",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "c has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "b=1",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 1",
        },
      ],
      total: 6,
      cut: 3,
      step: 5,
    },
    {
      event: "Backtrack",
      caption: "The nodes after c can't all be colored with c in color 0, so take that color back.",
      focus: ["n1"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "c=0", kind: "failed", state: "Rejected" },
        {
          id: "n2",
          parent: "n1",
          label: "a=0",
          kind: "pruned",
          state: "Rejected",
          bound: "c has 0",
        },
        { id: "n3", parent: "n1", label: "a=1", kind: "failed", state: "Rejected" },
        {
          id: "n4",
          parent: "n3",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "c has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "b=1",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 1",
        },
      ],
      total: 6,
      cut: 3,
      step: 6,
    },
    {
      event: "Done",
      caption:
        "Every way of coloring the nodes runs into a clash. No coloring with 2 colors exists.",
      focus: [],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "c=0", kind: "failed", state: "Rejected" },
        {
          id: "n2",
          parent: "n1",
          label: "a=0",
          kind: "pruned",
          state: "Rejected",
          bound: "c has 0",
        },
        { id: "n3", parent: "n1", label: "a=1", kind: "failed", state: "Rejected" },
        {
          id: "n4",
          parent: "n3",
          label: "b=0",
          kind: "pruned",
          state: "Rejected",
          bound: "c has 0",
        },
        {
          id: "n5",
          parent: "n3",
          label: "b=1",
          kind: "pruned",
          state: "Rejected",
          bound: "a has 1",
        },
      ],
      total: 6,
      cut: 3,
      step: 7,
      ok: false,
    },
  ],
};

/** format=frames, N-Queens, 6, NQueensBacktracking: the last 17 of the run's 57 frames (steps 40 to 56). Finished branches fold into "+36 more", the tree shrinks when the solver backs out of a whole branch, and the run ends on the answer's path. */
export const N_QUEENS_SEARCH_TREE_FRAMES = {
  type: "SearchTree",
  payload: { kind: "searchTree", problem: "N-Queens", instance: "6", maxLeaves: 12 },
  frames: [
    {
      event: "Reject",
      caption: "Row 4: every column is attacked, so back up and move the queen in row 3.",
      focus: ["n121"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "explored", state: "Covered" },
        { id: "n1.cut", parent: "n1", label: "2 cut", kind: "cut", state: "Rejected", hidden: 2 },
        { id: "n4", parent: "n1", label: "(1,2)", kind: "failed", state: "Rejected" },
        {
          id: "n4.more",
          parent: "n4",
          label: "+36 more",
          kind: "more",
          state: "Background",
          hidden: 36,
        },
        { id: "n41", parent: "n1", label: "(1,3)", kind: "failed", state: "Rejected" },
        {
          id: "n41.more",
          parent: "n41",
          label: "+36 more",
          kind: "more",
          state: "Background",
          hidden: 36,
        },
        { id: "n78", parent: "n1", label: "(1,4)", kind: "failed", state: "Rejected" },
        { id: "n78.cut", parent: "n78", label: "5 cut", kind: "cut", state: "Rejected", hidden: 5 },
        { id: "n80", parent: "n78", label: "(2,1)", kind: "failed", state: "Rejected" },
        { id: "n80.cut", parent: "n80", label: "5 cut", kind: "cut", state: "Rejected", hidden: 5 },
        { id: "n86", parent: "n80", label: "(3,5)", kind: "failed", state: "Rejected" },
        { id: "n86.cut", parent: "n86", label: "5 cut", kind: "cut", state: "Rejected", hidden: 5 },
        { id: "n89", parent: "n86", label: "(4,2)", kind: "failed", state: "Rejected" },
        { id: "n89.cut", parent: "n89", label: "6 cut", kind: "cut", state: "Rejected", hidden: 6 },
        { id: "n103", parent: "n1", label: "(1,5)", kind: "explored", state: "Covered" },
        {
          id: "n103.cut",
          parent: "n103",
          label: "2 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 2,
        },
        { id: "n105", parent: "n103", label: "(2,1)", kind: "failed", state: "Rejected" },
        {
          id: "n105.cut",
          parent: "n105",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n110", parent: "n105", label: "(3,4)", kind: "failed", state: "Rejected" },
        {
          id: "n110.cut",
          parent: "n110",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
        { id: "n119", parent: "n103", label: "(2,3)", kind: "explored", state: "Covered" },
        {
          id: "n120",
          parent: "n119",
          label: "(3,0)",
          kind: "pruned",
          state: "Rejected",
          bound: "hit by (0,0)",
        },
        { id: "n121", parent: "n119", label: "(3,1)", kind: "failed", state: "Rejected" },
        {
          id: "n121.cut",
          parent: "n121",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
      ],
      total: 128,
      cut: 105,
      step: 40,
    },
    {
      event: "Reject",
      caption:
        "Row 3: the rest of the row is attacked too, so back up and move the queen in row 2.",
      focus: ["n119"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "explored", state: "Covered" },
        { id: "n1.cut", parent: "n1", label: "2 cut", kind: "cut", state: "Rejected", hidden: 2 },
        { id: "n4", parent: "n1", label: "(1,2)", kind: "failed", state: "Rejected" },
        {
          id: "n4.more",
          parent: "n4",
          label: "+36 more",
          kind: "more",
          state: "Background",
          hidden: 36,
        },
        { id: "n41", parent: "n1", label: "(1,3)", kind: "failed", state: "Rejected" },
        {
          id: "n41.more",
          parent: "n41",
          label: "+36 more",
          kind: "more",
          state: "Background",
          hidden: 36,
        },
        { id: "n78", parent: "n1", label: "(1,4)", kind: "failed", state: "Rejected" },
        { id: "n78.cut", parent: "n78", label: "5 cut", kind: "cut", state: "Rejected", hidden: 5 },
        { id: "n80", parent: "n78", label: "(2,1)", kind: "failed", state: "Rejected" },
        { id: "n80.cut", parent: "n80", label: "5 cut", kind: "cut", state: "Rejected", hidden: 5 },
        { id: "n86", parent: "n80", label: "(3,5)", kind: "failed", state: "Rejected" },
        { id: "n86.cut", parent: "n86", label: "5 cut", kind: "cut", state: "Rejected", hidden: 5 },
        { id: "n89", parent: "n86", label: "(4,2)", kind: "failed", state: "Rejected" },
        { id: "n89.cut", parent: "n89", label: "6 cut", kind: "cut", state: "Rejected", hidden: 6 },
        { id: "n103", parent: "n1", label: "(1,5)", kind: "explored", state: "Covered" },
        {
          id: "n103.cut",
          parent: "n103",
          label: "2 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 2,
        },
        { id: "n105", parent: "n103", label: "(2,1)", kind: "failed", state: "Rejected" },
        {
          id: "n105.cut",
          parent: "n105",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n110", parent: "n105", label: "(3,4)", kind: "failed", state: "Rejected" },
        {
          id: "n110.cut",
          parent: "n110",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
        { id: "n119", parent: "n103", label: "(2,3)", kind: "failed", state: "Rejected" },
        {
          id: "n119.cut",
          parent: "n119",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n121", parent: "n119", label: "(3,1)", kind: "failed", state: "Rejected" },
        {
          id: "n121.cut",
          parent: "n121",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
      ],
      total: 132,
      cut: 109,
      step: 41,
    },
    {
      event: "Reject",
      caption:
        "Row 2: the rest of the row is attacked too, so back up and move the queen in row 1.",
      focus: ["n103"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "explored", state: "Covered" },
        { id: "n1.cut", parent: "n1", label: "2 cut", kind: "cut", state: "Rejected", hidden: 2 },
        { id: "n4", parent: "n1", label: "(1,2)", kind: "failed", state: "Rejected" },
        {
          id: "n4.more",
          parent: "n4",
          label: "+36 more",
          kind: "more",
          state: "Background",
          hidden: 36,
        },
        { id: "n41", parent: "n1", label: "(1,3)", kind: "failed", state: "Rejected" },
        {
          id: "n41.more",
          parent: "n41",
          label: "+36 more",
          kind: "more",
          state: "Background",
          hidden: 36,
        },
        { id: "n78", parent: "n1", label: "(1,4)", kind: "failed", state: "Rejected" },
        { id: "n78.cut", parent: "n78", label: "5 cut", kind: "cut", state: "Rejected", hidden: 5 },
        { id: "n80", parent: "n78", label: "(2,1)", kind: "failed", state: "Rejected" },
        { id: "n80.cut", parent: "n80", label: "5 cut", kind: "cut", state: "Rejected", hidden: 5 },
        { id: "n86", parent: "n80", label: "(3,5)", kind: "failed", state: "Rejected" },
        { id: "n86.cut", parent: "n86", label: "5 cut", kind: "cut", state: "Rejected", hidden: 5 },
        { id: "n89", parent: "n86", label: "(4,2)", kind: "failed", state: "Rejected" },
        { id: "n89.cut", parent: "n89", label: "6 cut", kind: "cut", state: "Rejected", hidden: 6 },
        { id: "n103", parent: "n1", label: "(1,5)", kind: "failed", state: "Rejected" },
        {
          id: "n103.cut",
          parent: "n103",
          label: "4 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 4,
        },
        { id: "n105", parent: "n103", label: "(2,1)", kind: "failed", state: "Rejected" },
        {
          id: "n105.cut",
          parent: "n105",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n110", parent: "n105", label: "(3,4)", kind: "failed", state: "Rejected" },
        {
          id: "n110.cut",
          parent: "n110",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
        { id: "n119", parent: "n103", label: "(2,3)", kind: "failed", state: "Rejected" },
        {
          id: "n119.cut",
          parent: "n119",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n121", parent: "n119", label: "(3,1)", kind: "failed", state: "Rejected" },
        {
          id: "n121.cut",
          parent: "n121",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
      ],
      total: 134,
      cut: 111,
      step: 42,
    },
    {
      event: "Reject",
      caption:
        "Row 1: its queen was already in the last column, so back up and move the queen in row 0.",
      focus: ["n1"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "failed", state: "Rejected" },
        { id: "n1.cut", parent: "n1", label: "2 cut", kind: "cut", state: "Rejected", hidden: 2 },
        { id: "n4", parent: "n1", label: "(1,2)", kind: "failed", state: "Rejected" },
        {
          id: "n4.more",
          parent: "n4",
          label: "+36 more",
          kind: "more",
          state: "Background",
          hidden: 36,
        },
        { id: "n41", parent: "n1", label: "(1,3)", kind: "failed", state: "Rejected" },
        {
          id: "n41.more",
          parent: "n41",
          label: "+36 more",
          kind: "more",
          state: "Background",
          hidden: 36,
        },
        { id: "n78", parent: "n1", label: "(1,4)", kind: "failed", state: "Rejected" },
        { id: "n78.cut", parent: "n78", label: "5 cut", kind: "cut", state: "Rejected", hidden: 5 },
        { id: "n80", parent: "n78", label: "(2,1)", kind: "failed", state: "Rejected" },
        { id: "n80.cut", parent: "n80", label: "5 cut", kind: "cut", state: "Rejected", hidden: 5 },
        { id: "n86", parent: "n80", label: "(3,5)", kind: "failed", state: "Rejected" },
        { id: "n86.cut", parent: "n86", label: "5 cut", kind: "cut", state: "Rejected", hidden: 5 },
        { id: "n89", parent: "n86", label: "(4,2)", kind: "failed", state: "Rejected" },
        { id: "n89.cut", parent: "n89", label: "6 cut", kind: "cut", state: "Rejected", hidden: 6 },
        { id: "n103", parent: "n1", label: "(1,5)", kind: "failed", state: "Rejected" },
        {
          id: "n103.cut",
          parent: "n103",
          label: "4 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 4,
        },
        { id: "n105", parent: "n103", label: "(2,1)", kind: "failed", state: "Rejected" },
        {
          id: "n105.cut",
          parent: "n105",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n110", parent: "n105", label: "(3,4)", kind: "failed", state: "Rejected" },
        {
          id: "n110.cut",
          parent: "n110",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
        { id: "n119", parent: "n103", label: "(2,3)", kind: "failed", state: "Rejected" },
        {
          id: "n119.cut",
          parent: "n119",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n121", parent: "n119", label: "(3,1)", kind: "failed", state: "Rejected" },
        {
          id: "n121.cut",
          parent: "n121",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
      ],
      total: 134,
      cut: 111,
      step: 43,
    },
    {
      event: "Try",
      caption: "Back in row 0: move the queen on to column 1.",
      focus: ["n134"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "failed", state: "Rejected" },
        {
          id: "n1.more",
          parent: "n1",
          label: "+132 more",
          kind: "more",
          state: "Background",
          hidden: 132,
        },
        { id: "n134", parent: "n0", label: "(0,1)", kind: "explored", state: "ElementHighlight" },
      ],
      total: 135,
      cut: 111,
      step: 44,
    },
    {
      event: "Try",
      caption:
        "Row 1: columns 0, 1 and 2 are attacked (0 diagonally by the queen at (0,1)). Place the queen at column 3.",
      focus: ["n138"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "failed", state: "Rejected" },
        {
          id: "n1.more",
          parent: "n1",
          label: "+132 more",
          kind: "more",
          state: "Background",
          hidden: 132,
        },
        { id: "n134", parent: "n0", label: "(0,1)", kind: "explored", state: "Covered" },
        {
          id: "n134.cut",
          parent: "n134",
          label: "3 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 3,
        },
        { id: "n138", parent: "n134", label: "(1,3)", kind: "explored", state: "ElementHighlight" },
      ],
      total: 139,
      cut: 114,
      step: 45,
    },
    {
      event: "Try",
      caption: "Row 2: column 0 is safe. Place the queen there.",
      focus: ["n139"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "failed", state: "Rejected" },
        {
          id: "n1.more",
          parent: "n1",
          label: "+132 more",
          kind: "more",
          state: "Background",
          hidden: 132,
        },
        { id: "n134", parent: "n0", label: "(0,1)", kind: "explored", state: "Covered" },
        {
          id: "n134.cut",
          parent: "n134",
          label: "3 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 3,
        },
        { id: "n138", parent: "n134", label: "(1,3)", kind: "explored", state: "Covered" },
        { id: "n139", parent: "n138", label: "(2,0)", kind: "explored", state: "ElementHighlight" },
      ],
      total: 140,
      cut: 114,
      step: 46,
    },
    {
      event: "Try",
      caption:
        "Row 3: columns 0 and 1 are attacked (0 along its column by the queen at (2,0)). Place the queen at column 2.",
      focus: ["n142"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "failed", state: "Rejected" },
        {
          id: "n1.more",
          parent: "n1",
          label: "+132 more",
          kind: "more",
          state: "Background",
          hidden: 132,
        },
        { id: "n134", parent: "n0", label: "(0,1)", kind: "explored", state: "Covered" },
        {
          id: "n134.cut",
          parent: "n134",
          label: "3 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 3,
        },
        { id: "n138", parent: "n134", label: "(1,3)", kind: "explored", state: "Covered" },
        { id: "n139", parent: "n138", label: "(2,0)", kind: "explored", state: "Covered" },
        {
          id: "n139.cut",
          parent: "n139",
          label: "2 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 2,
        },
        { id: "n142", parent: "n139", label: "(3,2)", kind: "explored", state: "ElementHighlight" },
      ],
      total: 143,
      cut: 116,
      step: 47,
    },
    {
      event: "Try",
      caption:
        "Row 4: columns 0, 1, 2 and 3 are attacked (0 diagonally by the queen at (1,3)). Place the queen at column 4.",
      focus: ["n147"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "failed", state: "Rejected" },
        {
          id: "n1.more",
          parent: "n1",
          label: "+132 more",
          kind: "more",
          state: "Background",
          hidden: 132,
        },
        { id: "n134", parent: "n0", label: "(0,1)", kind: "explored", state: "Covered" },
        {
          id: "n134.cut",
          parent: "n134",
          label: "3 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 3,
        },
        { id: "n138", parent: "n134", label: "(1,3)", kind: "explored", state: "Covered" },
        { id: "n139", parent: "n138", label: "(2,0)", kind: "explored", state: "Covered" },
        {
          id: "n139.cut",
          parent: "n139",
          label: "2 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 2,
        },
        { id: "n142", parent: "n139", label: "(3,2)", kind: "explored", state: "Covered" },
        {
          id: "n142.cut",
          parent: "n142",
          label: "4 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 4,
        },
        { id: "n147", parent: "n142", label: "(4,4)", kind: "explored", state: "ElementHighlight" },
      ],
      total: 148,
      cut: 120,
      step: 48,
    },
    {
      event: "Reject",
      caption: "Row 5: every column is attacked, so back up and move the queen in row 4.",
      focus: ["n147"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "failed", state: "Rejected" },
        {
          id: "n1.more",
          parent: "n1",
          label: "+132 more",
          kind: "more",
          state: "Background",
          hidden: 132,
        },
        { id: "n134", parent: "n0", label: "(0,1)", kind: "explored", state: "Covered" },
        {
          id: "n134.cut",
          parent: "n134",
          label: "3 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 3,
        },
        { id: "n138", parent: "n134", label: "(1,3)", kind: "explored", state: "Covered" },
        { id: "n139", parent: "n138", label: "(2,0)", kind: "explored", state: "Covered" },
        {
          id: "n139.cut",
          parent: "n139",
          label: "2 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 2,
        },
        { id: "n142", parent: "n139", label: "(3,2)", kind: "explored", state: "Covered" },
        {
          id: "n142.cut",
          parent: "n142",
          label: "4 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 4,
        },
        { id: "n147", parent: "n142", label: "(4,4)", kind: "failed", state: "Rejected" },
        {
          id: "n147.cut",
          parent: "n147",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
      ],
      total: 154,
      cut: 126,
      step: 49,
    },
    {
      event: "Reject",
      caption:
        "Row 4: the rest of the row is attacked too, so back up and move the queen in row 3.",
      focus: ["n142"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "failed", state: "Rejected" },
        {
          id: "n1.more",
          parent: "n1",
          label: "+132 more",
          kind: "more",
          state: "Background",
          hidden: 132,
        },
        { id: "n134", parent: "n0", label: "(0,1)", kind: "explored", state: "Covered" },
        {
          id: "n134.cut",
          parent: "n134",
          label: "3 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 3,
        },
        { id: "n138", parent: "n134", label: "(1,3)", kind: "explored", state: "Covered" },
        { id: "n139", parent: "n138", label: "(2,0)", kind: "explored", state: "Covered" },
        {
          id: "n139.cut",
          parent: "n139",
          label: "2 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 2,
        },
        { id: "n142", parent: "n139", label: "(3,2)", kind: "failed", state: "Rejected" },
        {
          id: "n142.cut",
          parent: "n142",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n147", parent: "n142", label: "(4,4)", kind: "failed", state: "Rejected" },
        {
          id: "n147.cut",
          parent: "n147",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
      ],
      total: 155,
      cut: 127,
      step: 50,
    },
    {
      event: "Reject",
      caption:
        "Row 3: the rest of the row is attacked too, so back up and move the queen in row 2.",
      focus: ["n139"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "failed", state: "Rejected" },
        {
          id: "n1.more",
          parent: "n1",
          label: "+132 more",
          kind: "more",
          state: "Background",
          hidden: 132,
        },
        { id: "n134", parent: "n0", label: "(0,1)", kind: "explored", state: "Covered" },
        {
          id: "n134.cut",
          parent: "n134",
          label: "3 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 3,
        },
        { id: "n138", parent: "n134", label: "(1,3)", kind: "explored", state: "Covered" },
        { id: "n139", parent: "n138", label: "(2,0)", kind: "failed", state: "Rejected" },
        {
          id: "n139.cut",
          parent: "n139",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n142", parent: "n139", label: "(3,2)", kind: "failed", state: "Rejected" },
        {
          id: "n142.cut",
          parent: "n142",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n147", parent: "n142", label: "(4,4)", kind: "failed", state: "Rejected" },
        {
          id: "n147.cut",
          parent: "n147",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
      ],
      total: 158,
      cut: 130,
      step: 51,
    },
    {
      event: "Try",
      caption:
        "Back in row 2: columns 1, 2, 3 and 4 are attacked (1 along its column by the queen at (0,1)), so move the queen on to column 5.",
      focus: ["n162"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "failed", state: "Rejected" },
        {
          id: "n1.more",
          parent: "n1",
          label: "+132 more",
          kind: "more",
          state: "Background",
          hidden: 132,
        },
        { id: "n134", parent: "n0", label: "(0,1)", kind: "explored", state: "Covered" },
        {
          id: "n134.cut",
          parent: "n134",
          label: "3 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 3,
        },
        { id: "n138", parent: "n134", label: "(1,3)", kind: "explored", state: "Covered" },
        { id: "n139", parent: "n138", label: "(2,0)", kind: "failed", state: "Rejected" },
        {
          id: "n139.cut",
          parent: "n139",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n142", parent: "n139", label: "(3,2)", kind: "failed", state: "Rejected" },
        {
          id: "n142.cut",
          parent: "n142",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n147", parent: "n142", label: "(4,4)", kind: "failed", state: "Rejected" },
        {
          id: "n147.cut",
          parent: "n147",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
        {
          id: "n138.cut",
          parent: "n138",
          label: "4 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 4,
        },
        { id: "n162", parent: "n138", label: "(2,5)", kind: "explored", state: "ElementHighlight" },
      ],
      total: 163,
      cut: 134,
      step: 52,
    },
    {
      event: "Try",
      caption: "Row 3: column 0 is safe. Place the queen there.",
      focus: ["n163"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "failed", state: "Rejected" },
        {
          id: "n1.more",
          parent: "n1",
          label: "+132 more",
          kind: "more",
          state: "Background",
          hidden: 132,
        },
        { id: "n134", parent: "n0", label: "(0,1)", kind: "explored", state: "Covered" },
        {
          id: "n134.cut",
          parent: "n134",
          label: "3 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 3,
        },
        { id: "n138", parent: "n134", label: "(1,3)", kind: "explored", state: "Covered" },
        { id: "n139", parent: "n138", label: "(2,0)", kind: "failed", state: "Rejected" },
        {
          id: "n139.cut",
          parent: "n139",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n142", parent: "n139", label: "(3,2)", kind: "failed", state: "Rejected" },
        {
          id: "n142.cut",
          parent: "n142",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n147", parent: "n142", label: "(4,4)", kind: "failed", state: "Rejected" },
        {
          id: "n147.cut",
          parent: "n147",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
        {
          id: "n138.cut",
          parent: "n138",
          label: "4 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 4,
        },
        { id: "n162", parent: "n138", label: "(2,5)", kind: "explored", state: "Covered" },
        { id: "n163", parent: "n162", label: "(3,0)", kind: "explored", state: "ElementHighlight" },
      ],
      total: 164,
      cut: 134,
      step: 53,
    },
    {
      event: "Try",
      caption:
        "Row 4: columns 0 and 1 are attacked (0 diagonally by the queen at (1,3)). Place the queen at column 2.",
      focus: ["n166"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "failed", state: "Rejected" },
        {
          id: "n1.more",
          parent: "n1",
          label: "+132 more",
          kind: "more",
          state: "Background",
          hidden: 132,
        },
        { id: "n134", parent: "n0", label: "(0,1)", kind: "explored", state: "Covered" },
        {
          id: "n134.cut",
          parent: "n134",
          label: "3 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 3,
        },
        { id: "n138", parent: "n134", label: "(1,3)", kind: "explored", state: "Covered" },
        { id: "n139", parent: "n138", label: "(2,0)", kind: "failed", state: "Rejected" },
        {
          id: "n139.cut",
          parent: "n139",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n142", parent: "n139", label: "(3,2)", kind: "failed", state: "Rejected" },
        {
          id: "n142.cut",
          parent: "n142",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n147", parent: "n142", label: "(4,4)", kind: "failed", state: "Rejected" },
        {
          id: "n147.cut",
          parent: "n147",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
        {
          id: "n138.cut",
          parent: "n138",
          label: "4 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 4,
        },
        { id: "n162", parent: "n138", label: "(2,5)", kind: "explored", state: "Covered" },
        { id: "n163", parent: "n162", label: "(3,0)", kind: "explored", state: "Covered" },
        {
          id: "n163.cut",
          parent: "n163",
          label: "2 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 2,
        },
        { id: "n166", parent: "n163", label: "(4,2)", kind: "explored", state: "ElementHighlight" },
      ],
      total: 167,
      cut: 136,
      step: 54,
    },
    {
      event: "Try",
      caption:
        "Row 5: columns 0, 1, 2 and 3 are attacked (0 along its column by the queen at (3,0)). Place the queen at column 4.",
      focus: ["n171"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "failed", state: "Rejected" },
        {
          id: "n1.more",
          parent: "n1",
          label: "+132 more",
          kind: "more",
          state: "Background",
          hidden: 132,
        },
        { id: "n134", parent: "n0", label: "(0,1)", kind: "explored", state: "Covered" },
        {
          id: "n134.cut",
          parent: "n134",
          label: "3 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 3,
        },
        { id: "n138", parent: "n134", label: "(1,3)", kind: "explored", state: "Covered" },
        { id: "n139", parent: "n138", label: "(2,0)", kind: "failed", state: "Rejected" },
        {
          id: "n139.cut",
          parent: "n139",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n142", parent: "n139", label: "(3,2)", kind: "failed", state: "Rejected" },
        {
          id: "n142.cut",
          parent: "n142",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n147", parent: "n142", label: "(4,4)", kind: "failed", state: "Rejected" },
        {
          id: "n147.cut",
          parent: "n147",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
        {
          id: "n138.cut",
          parent: "n138",
          label: "4 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 4,
        },
        { id: "n162", parent: "n138", label: "(2,5)", kind: "explored", state: "Covered" },
        { id: "n163", parent: "n162", label: "(3,0)", kind: "explored", state: "Covered" },
        {
          id: "n163.cut",
          parent: "n163",
          label: "2 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 2,
        },
        { id: "n166", parent: "n163", label: "(4,2)", kind: "explored", state: "Covered" },
        {
          id: "n166.cut",
          parent: "n166",
          label: "4 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 4,
        },
        { id: "n171", parent: "n166", label: "(5,4)", kind: "solution", state: "ElementHighlight" },
      ],
      total: 172,
      cut: 140,
      step: 55,
    },
    {
      event: "Done",
      caption:
        "All 6 queens are placed and none attacks another: {(0,1),(1,3),(2,5),(3,0),(4,2),(5,4)}. Found after 31 placements.",
      focus: [],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Solution" },
        { id: "n1", parent: "n0", label: "(0,0)", kind: "failed", state: "Rejected" },
        {
          id: "n1.more",
          parent: "n1",
          label: "+132 more",
          kind: "more",
          state: "Background",
          hidden: 132,
        },
        { id: "n134", parent: "n0", label: "(0,1)", kind: "explored", state: "Solution" },
        {
          id: "n134.cut",
          parent: "n134",
          label: "3 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 3,
        },
        { id: "n138", parent: "n134", label: "(1,3)", kind: "explored", state: "Solution" },
        { id: "n139", parent: "n138", label: "(2,0)", kind: "failed", state: "Rejected" },
        {
          id: "n139.cut",
          parent: "n139",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n142", parent: "n139", label: "(3,2)", kind: "failed", state: "Rejected" },
        {
          id: "n142.cut",
          parent: "n142",
          label: "5 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 5,
        },
        { id: "n147", parent: "n142", label: "(4,4)", kind: "failed", state: "Rejected" },
        {
          id: "n147.cut",
          parent: "n147",
          label: "6 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 6,
        },
        {
          id: "n138.cut",
          parent: "n138",
          label: "4 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 4,
        },
        { id: "n162", parent: "n138", label: "(2,5)", kind: "explored", state: "Solution" },
        { id: "n163", parent: "n162", label: "(3,0)", kind: "explored", state: "Solution" },
        {
          id: "n163.cut",
          parent: "n163",
          label: "2 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 2,
        },
        { id: "n166", parent: "n163", label: "(4,2)", kind: "explored", state: "Solution" },
        {
          id: "n166.cut",
          parent: "n166",
          label: "4 cut",
          kind: "cut",
          state: "Rejected",
          hidden: 4,
        },
        { id: "n171", parent: "n166", label: "(5,4)", kind: "solution", state: "Solution" },
      ],
      total: 172,
      cut: 140,
      step: 56,
      ok: true,
    },
  ],
};

/** format=frames, 3-Dimensional Matching, the problem default, ThreeDimensionalMatchingBacktracking: a triple cut by the element it shares with one already chosen, named under it. */
export const DM3_SEARCH_TREE_FRAMES = {
  type: "SearchTree",
  payload: {
    kind: "searchTree",
    problem: "3-Dimensional Matching",
    instance:
      "{Paul,Sally,Dave}{Madison,Austin,Bob}{Chloe,Frank,Jake}{Paul,Madison,Chloe}{Paul,Austin,Jake}{Sally,Bob,Chloe}{Sally,Madison,Frank}{Dave,Austin,Chloe}{Dave,Bob,Chloe}",
    maxLeaves: 12,
  },
  frames: [
    {
      event: "Accept",
      caption:
        "Frank has one triple left that use no element twice. Choose T4 (Sally, Madison, Frank).",
      focus: ["n1"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "T4", kind: "explored", state: "ElementHighlight" },
      ],
      total: 2,
      cut: 0,
      step: 0,
    },
    {
      event: "Reject",
      caption: "T1 (Paul, Madison, Chloe) would use Madison twice: T4 already uses it.",
      focus: ["n2"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "T4", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "T1",
          kind: "pruned",
          state: "Rejected",
          bound: "Madison used by T4",
        },
      ],
      total: 3,
      cut: 1,
      step: 1,
    },
    {
      event: "Accept",
      caption:
        "Paul has one triple left that use no element twice. Choose T2 (Paul, Austin, Jake).",
      focus: ["n3"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "T4", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "T1",
          kind: "pruned",
          state: "Rejected",
          bound: "Madison used by T4",
        },
        { id: "n3", parent: "n1", label: "T2", kind: "explored", state: "ElementHighlight" },
      ],
      total: 4,
      cut: 1,
      step: 2,
    },
    {
      event: "Reject",
      caption: "T5 (Dave, Austin, Chloe) would use Austin twice: T2 already uses it.",
      focus: ["n4"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Covered" },
        { id: "n1", parent: "n0", label: "T4", kind: "explored", state: "Covered" },
        {
          id: "n2",
          parent: "n1",
          label: "T1",
          kind: "pruned",
          state: "Rejected",
          bound: "Madison used by T4",
        },
        { id: "n3", parent: "n1", label: "T2", kind: "explored", state: "Covered" },
        {
          id: "n4",
          parent: "n3",
          label: "T5",
          kind: "pruned",
          state: "Rejected",
          bound: "Austin used by T2",
        },
      ],
      total: 5,
      cut: 2,
      step: 3,
    },
    {
      event: "Accept",
      caption: "Dave has one triple left that use no element twice. Choose T6 (Dave, Bob, Chloe).",
      focus: ["n5"],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Solution" },
        { id: "n1", parent: "n0", label: "T4", kind: "explored", state: "Solution" },
        {
          id: "n2",
          parent: "n1",
          label: "T1",
          kind: "pruned",
          state: "Rejected",
          bound: "Madison used by T4",
        },
        { id: "n3", parent: "n1", label: "T2", kind: "explored", state: "Solution" },
        {
          id: "n4",
          parent: "n3",
          label: "T5",
          kind: "pruned",
          state: "Rejected",
          bound: "Austin used by T2",
        },
        { id: "n5", parent: "n3", label: "T6", kind: "solution", state: "ElementHighlight" },
      ],
      total: 6,
      cut: 2,
      step: 4,
    },
    {
      event: "Done",
      caption:
        "T2 (Paul, Austin, Jake), T4 (Sally, Madison, Frank) and T6 (Dave, Bob, Chloe) use every element of X, Y and Z exactly once. Found after 3 choices.",
      focus: [],
      nodes: [
        { id: "n0", parent: null, label: "start", kind: "explored", state: "Solution" },
        { id: "n1", parent: "n0", label: "T4", kind: "explored", state: "Solution" },
        {
          id: "n2",
          parent: "n1",
          label: "T1",
          kind: "pruned",
          state: "Rejected",
          bound: "Madison used by T4",
        },
        { id: "n3", parent: "n1", label: "T2", kind: "explored", state: "Solution" },
        {
          id: "n4",
          parent: "n3",
          label: "T5",
          kind: "pruned",
          state: "Rejected",
          bound: "Austin used by T2",
        },
        { id: "n5", parent: "n3", label: "T6", kind: "solution", state: "Solution" },
      ],
      total: 6,
      cut: 2,
      step: 5,
      ok: true,
    },
  ],
};
