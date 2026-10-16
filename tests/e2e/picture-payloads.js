// tests/e2e/picture-payloads.js
//
// #199: ProblemProvider/visualize answers captured from a local build of the full Redux backend
// (local/viz-integration) on 2026-10-14, so tests/e2e/picture-renderers.spec.js can answer the
// picture requests itself and CI needs no backend that serves format=frames.
// DFA Acceptance: the problem's default instance, 3 frames with the DFASolver. The Graph
// pictures (#201), the Bipartite Graph pictures (#203), the Layered Graph pictures (#205), the
// Automaton pictures (#204), the Flow Network pictures (#206) and the Grouped Graph pictures
// (#202) follow at the end, each with its instance and solver.

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
