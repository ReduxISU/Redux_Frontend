// tests/e2e/run-payloads.js
//
// #252: ProblemProvider/visualizeRun answers (ReduxISU/Redux#895) captured from a local build of
// the full Redux backend (local/viz-integration) on 2026-10-16, so tests/e2e/one-run.spec.js can
// answer the one-run request itself while CI's backend has no such endpoint. Every frame carries
// `step`, the solver step it was drawn from.

/**
 * DFA Acceptance: the problem's default instance with the DFASolver. Both pictures (the
 * Automaton and the Table) drawn from the one run, three frames each, steps 0 to 2. The answer
 * is the bare certificate the DFA verifier checks (ReduxISU/Redux#896).
 */
export const DFA_ONE_RUN = {
  solver: "DFASolver",
  solverName: "DFA Simulation",
  answer: "1,2",
  ok: true,
  timedOut: false,
  pictures: [
    {
      visualization: "DFAVisualization",
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
          step: 0,
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
          step: 1,
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
          step: 2,
          ok: true,
        },
      ],
    },
    {
      visualization: "DFATableVisualization",
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
        blank: {
          values: [["0", "—", "—", "1", "no"]],
        },
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
          step: 0,
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
          step: 1,
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
          step: 2,
          ok: true,
        },
      ],
    },
  ],
  unavailable: [],
};
