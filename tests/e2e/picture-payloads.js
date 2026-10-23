// tests/e2e/picture-payloads.js
//
// #199: ProblemProvider/visualize answers captured from a local build of the full Redux backend
// (local/viz-integration) on 2026-10-14, so tests/e2e/picture-renderers.spec.js can answer the
// picture requests itself and CI needs no backend that serves format=frames.
// DFA Acceptance: the problem's default instance, 3 frames with the DFASolver. The Graph
// pictures (#201) and the Bipartite Graph pictures (#203) follow at the end, each with its
// instance and solver.

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

/** format=frames for DFAVisualization: picture type Automaton (no renderer here yet). */
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
