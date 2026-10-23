// tests/e2e/picture-renderers.spec.js
//
// #199: the format=frames rendering foundation. The renderer is picked by the response's
// picture `type`; a type with no renderer here falls back to the old flat-list request and
// renderer; the step controls walk a format=frames run's frames, with each step's caption.
//
// Pinned to DFA Acceptance: it has two visualizations (the Table and the Automaton) and a fast
// solver. Since #204 draws the Automaton, the foundation's tests answer its frames request as a
// picture type nothing here draws (UNDRAWN_TYPE), to keep testing the fallback. The catalog
// comes from the real backend like the rest of the suite; every picture and solve request is
// answered here from payloads captured off the live API (tests/e2e/picture-payloads.js), so
// CI needs no backend that serves format=frames. Catalog answers are only edited to set or
// remove a visualization's `pictureType`, which decides whether the frames request is made.
//
// #201: the Graph renderer, below the foundation's tests, on one small captured run per shape.
// Before Run the picture is the plain instance (no step's states or annotations); a diagram
// always opens fitted to its width, and zooms and pans (DiagramZoom.js).
// #203: the Bipartite Graph renderer (Set Cover, Exact Cover, Hitting Set and SAT's factor
// graph) at the end, with the same plain picture before Run and the same fit and zoom.
// #205: the Layered Graph renderer (Topological Sort, the feedback sets, SCC and shortest
// paths) after it, the same way.
// #204: the Automaton renderer (DFA, NFA) after that: the Garbage state, the NFA's all-branches
// steps and the One path picker, the tape, the same plain picture before Run and fit.
// #206: the Flow Network renderer (Minimum S-T Cut) after that: flow / capacity on every edge,
// the augmenting paths and back arcs, and the cut's S and T sides.
// #202: the Grouped Graph renderer (SAT and 3SAT's clause graph) after that, with the same
// plain picture before Run and the same fit and zoom.
// #207: the Packing renderer (Partition, Subset Sum, Knapsack, Bin Packing) after that: the item
// pool, each container's lines as rows to scale, every step's placement and totals, no text that
// meets another, and on a phone a drawing as narrow as its box, so its text is not shrunk.
// #217: the Search Tree renderer (backtracking and branch-and-bound runs) last: the tree as each
// step leaves it, folds, the answer's path, one box for the whole run, opening at fit like every
// picture, zooming in to readable text on a phone, and stepping that keeps the step in view.
// #208: the Board renderer (Sudoku, N-Queens) after it: every square, clue, queen and ruled-out
// square as each step leaves them, Hints, the trace of a square's row, column and box (or a
// queen's lines of attack), and on a phone a board drawn at its own size, its text not shrunk.
// #212: the Geometry renderer (Convex Hull) after that: the points to scale on real axes, each
// merge's hulls and chain, the answer's numbered corners, labels that meet nothing, and on a
// phone a plot drawn at its own size.
// #211: the Schedule renderer (Job Sequencing, Pump Scheduling) after that: each job's run and
// deadline, each pump's hours, the forward pass's band, the replay's tank line and costs, the
// budget, texts that meet no other text, line or mark, and on a phone a picture at its own size.
// #213: the Tripartite Matching renderer (3-Dimensional Matching) after that: the three columns
// of names, each triple's line and list row, the ×2 badges, the Blocked and Committed triples,
// the trace, texts that meet nothing, and on a phone the list under the columns.
// #214: the Code Tree renderer (Lossless Data Compression) after that: every character, each
// step's merges, states and codes on one layout for the whole run, the tidy tree, the text strip,
// the trace, texts that meet nothing, and on a phone a tree on its side at its own size.
// #210: the Quantum Circuit renderer (the quantum-algorithm problems) after that: every qubit
// and gate, each step's column, outcome bars by amplitude sign, the measured read, a classical
// solver's oracle calls, Shor's note, the trace, texts that meet nothing, and on a phone a small
// circuit at its own size.

import {
  LDC_CODE_TREE_FRAMES,
  LDC_ONE_CODE_TREE_FRAMES,
  LDC_SMALL_CODE_TREE_FRAMES,
} from "./code-tree-payloads";
import { expect, test } from "./fixtures";
import { gotoProblemDetail, openPanel } from "./helpers";
import {
  ARC_SET_LAYERED_FRAMES,
  BIN_PACKING_FFD_SHORT_PACKING_FRAMES,
  BIN_PACKING_PACKING_FRAMES,
  CLIQUE_COVER_GRAPH_FRAMES,
  CLIQUE_FAILED_GRAPH_FRAMES,
  CLIQUE_GRAPH_FRAMES,
  CONVEX_HULL_GEOMETRY_FRAMES,
  CONVEX_HULL_SMALL_GEOMETRY_FRAMES,
  CONVEX_HULL_WIDE_GEOMETRY_FRAMES,
  DFA_ABC_GARBAGE_AUTOMATON_FRAMES,
  DFA_AUTOMATON_FRAMES,
  DFA_AUTOMATON_LIST,
  DFA_GARBAGE_AUTOMATON_FRAMES,
  DFA_TABLE_FRAMES,
  DIRECTED_HAMILTONIAN_GRAPH_FRAMES,
  DM3_BACKTRACKING_TRIPARTITE_FRAMES,
  DM3_NONE_TRIPARTITE_FRAMES,
  DM3_SEARCH_TREE_FRAMES,
  DM3_TRIPARTITE_FRAMES,
  DM3_WIDE_TRIPARTITE_FRAMES,
  EXACT_COVER_BIPARTITE_FRAMES,
  GRAPH_COLORING_FAILED_SEARCH_TREE_FRAMES,
  GRAPH_COLORING_SEARCH_TREE_FRAMES,
  HITTING_SET_BIPARTITE_FRAMES,
  ILP_TABLE_FRAMES_WITH_BLANK,
  KNAPSACK_OVER_PACKING_FRAMES,
  KNAPSACK_PACKING_FRAMES,
  LARGE_GRAPH_FRAMES,
  MAX_CUT_GRAPH_FRAMES,
  MIN_CUT_BACKWARD_FLOW_FRAMES,
  MIN_CUT_BOWED_FLOW_FRAMES,
  MIN_CUT_FLOW_FRAMES,
  MIN_CUT_NO_PATH_FLOW_FRAMES,
  MIN_CUT_PARALLEL_FLOW_FRAMES,
  N_QUEENS_BOARD_FRAMES,
  N_QUEENS_CONSTRUCTIVE_BOARD_FRAMES,
  N_QUEENS_NONE_BOARD_FRAMES,
  N_QUEENS_SEARCH_TREE_FRAMES,
  NFA_BACKTRACK_REJECTED_AUTOMATON_FRAMES,
  NFA_DEFAULT_AUTOMATON_FRAMES,
  NFA_SUBSET_AUTOMATON_FRAMES,
  NODE_SET_LAYERED_FRAMES,
  PARTITION_ODD_PACKING_FRAMES,
  PARTITION_PACKING_FRAMES,
  SAT3_CLAUSE_GRAPH_FRAMES,
  SAT3_FACTOR_GRAPH_FRAMES,
  SAT3_FAILED_CLAUSE_GRAPH_FRAMES,
  SAT3_SEARCH_TREE_FRAMES,
  SAT3_UNSAT_SEARCH_TREE_FRAMES,
  SCC_LAYERED_FRAMES,
  SET_COVER_BIPARTITE_FRAMES,
  SET_COVER_FAILED_BIPARTITE_FRAMES,
  SPSP_LAYERED_FRAMES,
  SSSP_PARALLEL_LAYERED_FRAMES,
  SSSP_UNREACHABLE_LAYERED_FRAMES,
  STEINER_GRAPH_FRAMES,
  SUBSET_SUM_APPROX_MISS_PACKING_FRAMES,
  SUBSET_SUM_APPROX_PACKING_FRAMES,
  SUBSET_SUM_CLIPPED_PACKING_FRAMES,
  SUBSET_SUM_PACKING_FRAMES,
  SUDOKU_BOARD_FRAMES,
  SUDOKU_CLASH_BOARD_FRAMES,
  SUDOKU_SHORT_BOARD_FRAMES,
  TOPOLOGICAL_SORT_CYCLE_LAYERED_FRAMES,
  TOPOLOGICAL_SORT_LAYERED_FRAMES,
  TSP_4CITY_SEARCH_TREE_FRAMES,
  TSP_GREEDY_BEATEN_SEARCH_TREE_FRAMES,
  TSP_SEARCH_TREE_FRAMES,
} from "./picture-payloads";
import {
  BV_CLASSICAL_QUANTUM_FRAMES,
  BV_QUANTUM_FRAMES,
  DEUTSCH_CLASSICAL_QUANTUM_FRAMES,
  DEUTSCH_JOZSA_QUANTUM_FRAMES,
  DEUTSCH_QUANTUM_FRAMES,
  GROVER_MISS_QUANTUM_FRAMES,
  GROVER_QUANTUM_FRAMES,
  SHOR_NO_CIRCUIT_QUANTUM_FRAMES,
  SHOR_QUANTUM_FRAMES,
  SHOR_TRIAL_DIVISION_QUANTUM_FRAMES,
  SIMON_QUANTUM_FRAMES,
  UNSTRUCTURED_CLASSICAL_QUANTUM_FRAMES,
} from "./quantum-payloads";
import {
  JOB_SEQUENCING_NONE_SCHEDULE_FRAMES,
  JOB_SEQUENCING_SCHEDULE_FRAMES,
  JOB_SEQUENCING_SMALL_SCHEDULE_FRAMES,
  PUMP_CM_FRACTIONAL_SCHEDULE_FRAMES,
  PUMP_CM_NONE_SCHEDULE_FRAMES,
  PUMP_CM_ROUNDED_SCHEDULE_FRAMES,
  PUMP_CM_SCHEDULE_FRAMES,
  PUMP_EM_SCHEDULE_FRAMES,
} from "./schedule-payloads";

const PROBLEM = "DFA Acceptance";
const TABLE_VIZ = "DFATableVisualization";
const AUTOMATON_VIZ = "DFAVisualization";

/** A picture type no renderer here draws, for the fallback tests. */
const UNDRAWN_TYPE = "NotDrawnHere";
const UNDRAWN_FRAMES = { ...DFA_AUTOMATON_FRAMES, type: UNDRAWN_TYPE };

const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve/;
const ALL_INFO_REQUEST = /\/api\/redux\/Navigation\/Batch\/allInfo/;

const PICTURE = "#workbench-source-picture";
const TABLE_PREFIX = "#workbench-source-frames-table";
const CAPTION = "#workbench-source-frames-caption";

/**
 * Sets each named visualization's `pictureType` in allInfo (`undefined` removes the field, as
 * a backend older than it would send).
 */
async function setPictureTypes(page, types) {
  await page.route(ALL_INFO_REQUEST, async (route) => {
    const response = await route.fetch();
    const info = await response.json();
    for (const [className, pictureType] of Object.entries(types)) {
      if (!info[className]) continue;
      if (pictureType === undefined) delete info[className].pictureType;
      else info[className].pictureType = pictureType;
    }
    await route.fulfill({ response, json: info });
  });
}

/**
 * Answers every visualize request from the captures, keyed by visualization and format, and
 * records each one asked for as `${visualization} ${format}`.
 */
async function answerPictures(page, { tableFrames = DFA_TABLE_FRAMES } = {}) {
  const asked = [];
  await page.route(VISUALIZE_REQUEST, (route) => {
    const url = new URL(route.request().url());
    const visualization = url.searchParams.get("visualization");
    const format = url.searchParams.get("format") ?? "list";
    asked.push(`${visualization} ${format}`);
    let json;
    if (visualization === TABLE_VIZ) {
      // The table only ever needs its frames answer; a list request for it would be a bug.
      json = format === "frames" ? tableFrames : [];
    } else {
      json = format === "frames" ? UNDRAWN_FRAMES : DFA_AUTOMATON_LIST;
    }
    return route.fulfill({ json });
  });
  await page.route(SOLVE_REQUEST, (route) => route.fulfill({ json: "1,2" }));
  return asked;
}

async function chooseVisualization(page, name) {
  await page.locator("#workbench-source-type-button").click();
  await page.locator("#workbench-source-type-listbox").getByRole("option", { name }).click();
}

test("a picture type with a renderer is drawn from format=frames, and one without falls back to the old list", async ({
  page,
}) => {
  // As on a backend older than pictureType: the frames request is always tried first.
  await setPictureTypes(page, { [TABLE_VIZ]: undefined, [AUTOMATON_VIZ]: undefined });
  const asked = await answerPictures(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  // The Table type has a renderer: one frames request, drawn by it.
  const picture = page.locator(PICTURE);
  await expect(picture).toHaveAttribute("data-picture-kind", "picture");
  await expect(picture).toHaveAttribute("data-picture-type", "Table");
  await expect(page.locator(`${TABLE_PREFIX}-table`)).toHaveAttribute("data-table-shape", "trace");
  // Before Run it is the plain picture. This capture has no payload.blank (a backend older than
  // it), so the first step's cell text stands in, but none of its states.
  await expect(picture.locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(page.locator(`${TABLE_PREFIX}-r0`)).toHaveAttribute("data-state", "Background");
  await expect(page.locator(`${TABLE_PREFIX}-r0c3`)).toHaveText("1");
  await expect(page.locator(`${TABLE_PREFIX}-r0c3`)).not.toHaveAttribute("data-changed", /./);
  // The caption counts only the row drawn, not the trace's length ("1 of 2 rows" would give it away).
  await expect(page.locator(`${TABLE_PREFIX}-table-caption`)).toHaveText(/: 1 row$/);
  expect(asked).toEqual([`${TABLE_VIZ} frames`]);

  // A type with no renderer: the frames answer is set aside, the list is asked for, and the
  // old renderer draws it.
  await chooseVisualization(page, "Deterministic Finite Automata Visualization");
  await expect(picture).toHaveAttribute("data-picture-kind", "frame");
  expect(asked).toEqual([
    `${TABLE_VIZ} frames`,
    `${AUTOMATON_VIZ} frames`,
    `${AUTOMATON_VIZ} list`,
  ]);
});

test("before Run a table draws the payload's blank, not the first step's work", async ({
  page,
}) => {
  // An ILP-like capture whose payload carries the blank: x is "?", the coefficients and bounds
  // are there, and no totals. Its first frame is the brute force's first try, with totals.
  const capture = ILP_TABLE_FRAMES_WITH_BLANK;
  await setPictureTypes(page, { [TABLE_VIZ]: "Table" });
  await answerPictures(page, { tableFrames: capture });
  await gotoProblemDetail(page, PROBLEM, { expect });
  const picture = page.locator(PICTURE);
  await expect(picture).toHaveAttribute("data-picture-type", "Table");
  await expect(page.locator(`${TABLE_PREFIX}-table`)).toHaveAttribute("data-table-shape", "matrix");
  await expect(picture.locator("[data-plain]")).toHaveAttribute("data-plain", "true");

  const cell = (id) => page.locator(`${TABLE_PREFIX}-${id}`);
  // x is not tried yet.
  await expect(cell("r0c0")).toHaveText("?");
  await expect(cell("r0c1")).toHaveText("?");
  // The coefficients and the bounds are the instance's.
  await expect(cell("r1c0")).toHaveText("1");
  await expect(cell("r1c1")).toHaveText("-1");
  await expect(cell("r1c3")).toHaveText("-1");
  await expect(cell("r2c3")).toHaveText("1");
  // No totals or verdicts: the first frame has them (row 1 adds up to 0, and does not hold).
  expect(capture.frames[0].values[1][2]).toBe("0");
  for (const id of ["r1c2", "r1c4", "r2c2", "r2c4"]) await expect(cell(id)).toHaveText("");
  // Nothing marked: no states, no underlines.
  await expect(picture.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(picture.locator("[data-changed]")).toHaveCount(0);

  // Run opens on the last frame; its first frame is the first try, with its totals.
  await page.locator("#workbench-run").click();
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames.at(-1).caption);
  await toFirstStep(page);
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[0].caption);
  // (A highlighted cell also says its state, for screen readers.)
  await expect(cell("r0c0")).toHaveText(/^0(\s|$)/);
  await expect(cell("r1c2")).toHaveText(/^0(\s|$)/);
});

test("when pictureType already names a type with no renderer, only the old list is asked for", async ({
  page,
}) => {
  await setPictureTypes(page, { [TABLE_VIZ]: "Table", [AUTOMATON_VIZ]: UNDRAWN_TYPE });
  const asked = await answerPictures(page);
  await page.goto(
    `/${encodeURIComponent(PROBLEM)}?viz=${encodeURIComponent("Deterministic Finite Automata Visualization")}`,
  );
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-kind", "frame", {
    timeout: 20_000,
  });
  expect(asked).toEqual([`${AUTOMATON_VIZ} list`]);
});

test("the step controls walk a format=frames run, with each step's caption and states", async ({
  page,
}) => {
  await setPictureTypes(page, { [TABLE_VIZ]: "Table" });
  const asked = await answerPictures(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "Table");
  // Before Run there is no run to caption.
  await expect(page.locator(CAPTION)).toHaveCount(0);

  await page.locator("#workbench-run").click();
  // The run's picture asks for the chosen solver's frames.
  await expect.poll(() => asked.at(-1)).toBe(`${TABLE_VIZ} frames`);

  const [first, second, last] = DFA_TABLE_FRAMES.frames;
  const caption = page.locator(`${CAPTION}-text`);
  // A run opens on its last step: the finished result, with its verdict.
  await expect(page.locator("#workbench-steps-position")).toHaveText("Step 3 of 3");
  await expect(caption).toHaveText(last.caption);
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: yes");
  // The slider goes back through the steps.
  await toFirstStep(page);
  await expect(caption).toHaveText(first.caption);
  await expect(page.locator(`${TABLE_PREFIX}-r1`)).toHaveCount(0);

  await page.locator("#workbench-steps-next").click();
  await expect(caption).toHaveText(second.caption);
  await expect(page.locator(`${TABLE_PREFIX}-r1`)).toHaveAttribute(
    "data-state",
    "ElementHighlight",
  );
  await expect(page.locator(`${TABLE_PREFIX}-r0`)).toHaveAttribute("data-state", "Background");
  await expect(page.locator(`${TABLE_PREFIX}-r1c3`)).toHaveAttribute("data-changed", "true");

  await page.locator("#workbench-steps-next").click();
  await expect(caption).toHaveText(last.caption);
  await expect(page.locator(CAPTION)).toHaveAttribute("data-event", "Done");
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: yes");
  await expect(page.locator(`${TABLE_PREFIX}-r1`)).toHaveAttribute("data-state", "Solution");

  // The key lists the states the whole run uses, in the state table's words.
  const legend = page.locator("#workbench-legend-body");
  await expect(legend).toContainText("Highlighted (looked at now)");
  await expect(legend).toContainText("Solution (answer)");

  await page.locator("#workbench-steps-previous").click();
  await expect(caption).toHaveText(second.caption);
});

test("a run opens on its last step, Play there replays from step 1, and the slider goes back", async ({
  page,
}) => {
  await setPictureTypes(page, { [TABLE_VIZ]: "Table" });
  await answerPictures(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "Table");
  // Before Run the picture is the plain one, with no steps.
  await expect(page.locator("#workbench-steps-position")).toHaveCount(0);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");

  await page.locator("#workbench-run").click();
  const position = page.locator("#workbench-steps-position");
  const caption = page.locator(`${CAPTION}-text`);
  const frames = DFA_TABLE_FRAMES.frames;
  await expect(position).toHaveText(`Step ${frames.length} of ${frames.length}`);
  await expect(caption).toHaveText(frames.at(-1).caption);
  await expect(page.locator("#workbench-steps-next")).toBeDisabled();

  // The slider walks back a step at a time.
  await page.locator("#workbench-steps-slider input").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(position).toHaveText(`Step ${frames.length - 1} of ${frames.length}`);
  await expect(caption).toHaveText(frames.at(-2).caption);
  await page.keyboard.press("End");
  await expect(position).toHaveText(`Step ${frames.length} of ${frames.length}`);

  // Play on the last step replays the run from step 1, and goes on from there.
  await page.locator("#workbench-steps-play-pause").click();
  await expect(position).toHaveText(`Step 1 of ${frames.length}`);
  await expect(caption).toHaveText(frames[0].caption);
  await expect(position).toHaveText(`Step 2 of ${frames.length}`);
  await expect(position).toHaveText(`Step ${frames.length} of ${frames.length}`);
  await expect(page.locator("#workbench-steps-play-pause")).toHaveAttribute("aria-label", "Play");

  // Play from any other step goes on from there.
  await page.locator("#workbench-steps-previous").click();
  await expect(position).toHaveText(`Step ${frames.length - 1} of ${frames.length}`);
  await page.locator("#workbench-steps-play-pause").click();
  await expect(position).toHaveText(`Step ${frames.length} of ${frames.length}`);
});

test("Committed draws apart from Solution, dashed, and has its own Legend entry", async ({
  page,
}) => {
  // Redux does not send Committed yet, so this run is made by hand from the captured one: the
  // first row is kept so far (Committed) while the second is the confirmed answer (Solution).
  const done = DFA_TABLE_FRAMES.frames.at(-1);
  const handMade = {
    ...DFA_TABLE_FRAMES,
    frames: [
      {
        ...done,
        rows: { r0: { state: "Committed" }, r1: { state: "Solution" } },
      },
    ],
  };
  // No color transitions, so the colors read below are the step's own (see openPicture).
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setPictureTypes(page, { [TABLE_VIZ]: "Table" });
  await answerPictures(page, { tableFrames: handMade });
  await gotoProblemDetail(page, PROBLEM, { expect });
  // States are a run's, so they show once it runs (before Run the picture is plain).
  await page.locator("#workbench-run").click();
  await expect(page.locator(CAPTION)).toBeVisible();

  const committed = page.locator(`${TABLE_PREFIX}-r0`);
  await expect(committed).toHaveAttribute("data-state", "Committed");
  await expect(page.locator(`${TABLE_PREFIX}-r1`)).toHaveAttribute("data-state", "Solution");
  const cellStyle = (row) =>
    page.locator(`${TABLE_PREFIX}-${row}c1`).evaluate((cell) => {
      const style = getComputedStyle(cell);
      return {
        fill: style.backgroundColor,
        line: style.borderTopStyle,
        lineColor: style.borderTopColor,
      };
    });
  const kept = await cellStyle("r0");
  const answer = await cellStyle("r1");
  expect(kept.line).toBe("dashed");
  expect(answer.line).toBe("solid");
  expect(kept.fill).not.toBe(answer.fill);
  expect(kept.lineColor).not.toBe(answer.lineColor);

  const legend = page.locator("#workbench-legend-body");
  await expect(legend).toContainText("Committed (kept so far)");
  await expect(legend).toContainText("Solution (answer)");
});

// --- #201: the Graph renderer ---------------------------------------------------------------
//
// Each Graph problem's page is opened with every picture request answered by one captured run
// (tests/e2e/picture-payloads.js), so the default picture and the run are both that capture.
// The catalog (and so the problem's own visualization and solvers) comes from the real backend
// as everywhere else; the capture decides what is drawn.

const GRAPH = "#workbench-source-frames-graph";

/** Answers every visualize request with `capture`, and every solve request with a stub. */
async function answerWith(page, capture) {
  await page.route(VISUALIZE_REQUEST, (route) => route.fulfill({ json: capture }));
  await page.route(SOLVE_REQUEST, (route) => route.fulfill({ json: "stub" }));
}

/**
 * Opens `problem` with its pictures answered by `capture`, and waits for the picture. Reduced
 * motion switches the pictures' color transitions off, so a color read straight after a step
 * changes is the step's own, not one partway through the fade.
 */
async function openPicture(page, problem, capture) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await answerWith(page, capture);
  await gotoProblemDetail(page, problem, { expect });
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", capture.type, {
    timeout: 20_000,
  });
}

/**
 * Presses Run and goes to frame `index` (0-based). A run opens on its last frame, the finished
 * result; this goes back to the first (the slider's Home key) and steps forward from there.
 */
async function runToFrame(page, capture, index) {
  await page.locator("#workbench-run").click();
  const count = capture.frames.length;
  await expect(page.locator("#workbench-steps-position")).toHaveText(`Step ${count} of ${count}`);
  await toFirstStep(page);
  for (let step = 0; step < index; step += 1) {
    await page.locator("#workbench-steps-next").click();
  }
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
}

/** Goes back to step 1 with the step slider's Home key. */
async function toFirstStep(page) {
  await page.locator("#workbench-steps-slider input").focus();
  await page.keyboard.press("Home");
  await expect(page.locator("#workbench-steps-position")).toHaveText(/^Step 1 of /);
}

const graphNode = (page, id) => page.locator(`${GRAPH}-graph [data-node-id="${id}"]`);
const graphEdge = (page, id) => page.locator(`${GRAPH}-graph [data-edge-id="${id}"]`);
const legendBody = (page) => page.locator("#workbench-legend-body");

test("Graph: the subset shape draws Committed apart from the answer, and every node is labelled", async ({
  page,
}) => {
  const capture = CLIQUE_GRAPH_FRAMES;
  await openPicture(page, "Clique", capture);
  await expect(page.locator(`${GRAPH}-graph`)).toHaveAttribute("data-graph-shape", "subset");
  await expect(page.locator(`${GRAPH}-graph`)).toHaveAttribute("data-graph-layout", "force");
  const nodes = page.locator(`${GRAPH}-graph [data-node-id]`);
  await expect(nodes).toHaveCount(capture.payload.nodes.length);
  await expect(page.locator(`${GRAPH}-graph [data-edge-id]`)).toHaveCount(
    capture.payload.edges.length,
  );
  for (const node of await nodes.all()) {
    await expect(node).toHaveAttribute("aria-label", /^Node \S+, .*(joined to|no edges)/);
    await expect(node).toHaveAttribute("tabindex", "0");
  }

  // Frame 3: 1 and the edge 1-2 are kept so far, 2 is the node being added.
  await runToFrame(page, capture, 2);
  await expect(graphNode(page, "1")).toHaveAttribute("data-state", "Committed");
  await expect(graphNode(page, "2")).toHaveAttribute("data-state", "ElementHighlight");
  await expect(graphEdge(page, "1-2")).toHaveAttribute("data-state", "Committed");
  await expect(graphNode(page, "1")).toHaveAttribute("aria-label", /Committed \(kept so far\)/);
  const committedBody = graphNode(page, "1").locator("[data-body]");
  await expect(committedBody).toHaveAttribute("stroke-dasharray", "6 3");
  await expect(graphEdge(page, "1-2").locator("path")).toHaveAttribute("stroke-dasharray", "6 3");
  const kept = await committedBody.evaluate((el) => getComputedStyle(el).fill);

  // The last frame: the confirmed answer, drawn solid and in another green.
  await page.locator("#workbench-steps-next").click();
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(CAPTION)).toHaveAttribute("data-event", "Done");
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: yes");
  for (const id of ["1", "2", "3"]) {
    await expect(graphNode(page, id)).toHaveAttribute("data-state", "Solution");
  }
  await expect(graphNode(page, "4")).toHaveAttribute("data-state", "Background");
  const answerBody = graphNode(page, "1").locator("[data-body]");
  await expect(answerBody).not.toHaveAttribute("stroke-dasharray", /./);
  expect(await answerBody.evaluate((el) => getComputedStyle(el).fill)).not.toBe(kept);

  await expect(legendBody(page)).toContainText("Committed (kept so far)");
  await expect(legendBody(page)).toContainText("Solution (answer)");
  await expect(legendBody(page)).toContainText("Rejected (failed or ruled out)");
});

test("Graph: a failed run shows missing edges as dashed Rejected phantoms and ends on no", async ({
  page,
}) => {
  const capture = CLIQUE_FAILED_GRAPH_FRAMES;
  await openPicture(page, "Clique", capture);
  await runToFrame(page, capture, 0);
  const phantom = page.locator(`${GRAPH}-graph [data-phantom="1|3"]`);
  await expect(phantom).toHaveAttribute("data-state", "Rejected");
  await expect(phantom.locator("path")).toHaveAttribute("stroke-dasharray", "6 5");
  await expect(graphNode(page, "2")).toHaveAttribute("data-state", "ElementHighlight");
  await expect(legendBody(page)).toContainText("Missing edge");

  for (let step = 1; step < capture.frames.length; step += 1) {
    await page.locator("#workbench-steps-next").click();
  }
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: no");
  await expect(page.locator(`${GRAPH}-graph [data-phantom]`)).toHaveCount(0);
  // A run that found nothing never turns anything green.
  await expect(page.locator(`${GRAPH}-graph [data-state="Solution"]`)).toHaveCount(0);
});

test("Graph: Steiner terminals get a double outline and a Legend entry", async ({ page }) => {
  await openPicture(page, "Steiner Tree", STEINER_GRAPH_FRAMES);
  await expect(page.locator(`${GRAPH}-graph`)).toHaveAttribute("data-graph-shape", "edges");
  for (const id of ["1", "3"]) {
    await expect(graphNode(page, id)).toHaveAttribute("data-terminal", "true");
    await expect(graphNode(page, id)).toHaveAttribute("aria-label", /terminal/);
  }
  await expect(graphNode(page, "2")).not.toHaveAttribute("data-terminal", /./);
  await expect(legendBody(page)).toContainText("Terminal");
});

test("Graph: the cut shape colors the two sides, shows the weights and keeps the crossing edges", async ({
  page,
}) => {
  const capture = MAX_CUT_GRAPH_FRAMES;
  await openPicture(page, "Max Cut", capture);
  await expect(page.locator(`${GRAPH}-graph`)).toHaveAttribute("data-graph-shape", "cut");
  await expect(page.locator(`${GRAPH}-graph [data-weight]`)).toHaveCount(
    capture.payload.edges.length,
  );

  const last = capture.frames.length - 1;
  await runToFrame(page, capture, last);
  const fills = {};
  for (const [id, side] of Object.entries(capture.frames[last].groups)) {
    await expect(graphNode(page, id)).toHaveAttribute("data-group", String(side));
    await expect(graphNode(page, id)).toHaveAttribute(
      "aria-label",
      side === 0 ? /S side/ : /T side/,
    );
    fills[side] = await graphNode(page, id)
      .locator("[data-body]")
      .evaluate((el) => getComputedStyle(el).fill);
  }
  expect(fills[0]).not.toBe(fills[1]);
  for (const [id, entry] of Object.entries(capture.frames[last].edges)) {
    await expect(graphEdge(page, id)).toHaveAttribute("data-state", entry.state);
  }
  await expect(legendBody(page)).toContainText("S side");
  await expect(legendBody(page)).toContainText("T side");
});

test("Graph: the groups shape keeps each node's group color under its state, with missing edges", async ({
  page,
}) => {
  const capture = CLIQUE_COVER_GRAPH_FRAMES;
  await openPicture(page, "Clique Cover", capture);
  await runToFrame(page, capture, 1);
  // Node 1 is in group 1 on its own, nodes 2 to 4 in group 0, where 2 and 3 aren't joined.
  await expect(graphNode(page, "1")).toHaveAttribute("data-group", "1");
  await expect(graphNode(page, "3")).toHaveAttribute("data-group", "0");
  await expect(graphNode(page, "3")).toHaveAttribute("data-state", "Rejected");
  const body = (id) =>
    graphNode(page, id)
      .locator("[data-body]")
      .evaluate((el) => ({ fill: getComputedStyle(el).fill, line: getComputedStyle(el).stroke }));
  const clashing = await body("3");
  const calm = await body("4");
  // The same group, so the same fill; the clash shows in the outline.
  expect(clashing.fill).toBe(calm.fill);
  expect(clashing.line).not.toBe(calm.line);
  await expect(page.locator(`${GRAPH}-graph [data-phantom="2|3"]`)).toHaveCount(1);
  await expect(legendBody(page)).toContainText("Clique 1");
  await expect(legendBody(page)).toContainText("Missing edge");
  // A try that leaves node 1 in no group (Redux #890) names it and marks it Rejected.
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(
    "Try {2,3,4},{}: node 1 is in no clique.",
  );
  await expect(graphNode(page, "1")).toHaveAttribute("data-state", "Rejected");
  await expect(graphNode(page, "3")).toHaveAttribute("data-state", "Background");
});

test("Graph: a directed tour draws arrows, order badges and both edges of an opposite pair", async ({
  page,
}) => {
  const capture = DIRECTED_HAMILTONIAN_GRAPH_FRAMES;
  await openPicture(page, "Directed Hamiltonian Cycle", capture);
  await expect(page.locator(`${GRAPH}-graph`)).toHaveAttribute("data-graph-layout", "circle");
  await expect(page.locator(`${GRAPH}-graph [data-edge-id] polygon`)).toHaveCount(
    capture.payload.edges.length,
  );
  // 1>2 and 2>1 are bowed apart, so neither hides the other.
  expect(await graphEdge(page, "1>2").locator("path").getAttribute("d")).toContain("Q");
  expect(await graphEdge(page, "2>1").locator("path").getAttribute("d")).toContain("Q");

  const last = capture.frames.length - 1;
  await runToFrame(page, capture, last);
  const order = capture.frames[last].order;
  for (const [index, id] of order.slice(0, -1).entries()) {
    await expect(graphNode(page, id)).toHaveAttribute("data-order", String(index + 1));
  }
  await expect(page.locator(`${GRAPH}-graph [data-badge="order"]`)).toHaveCount(order.length - 1);
  await expect(legendBody(page)).toContainText("Order (position in the tour)");
  await expect(legendBody(page)).toContainText("Arrow");
});

test("Graph: hovering, focusing or tapping a node traces its edges and fades the rest by color", async ({
  page,
}) => {
  await openPicture(page, "Clique", CLIQUE_GRAPH_FRAMES);
  await graphNode(page, "4").hover();
  await expect(graphEdge(page, "3-4")).toHaveAttribute("data-traced", "trace");
  await expect(graphEdge(page, "1-2")).toHaveAttribute("data-traced", "faint");
  await expect(graphNode(page, "1")).toHaveAttribute("data-traced", "faint");
  await expect(graphNode(page, "3")).toHaveAttribute("data-traced", "trace");
  // Faded by color, never by opacity.
  const faded = await graphNode(page, "1").evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    filter: getComputedStyle(el).filter,
  }));
  expect(faded.opacity).toBe("1");
  expect(faded.filter).toContain("grayscale");

  await page.mouse.move(0, 0);
  await expect(graphEdge(page, "1-2")).not.toHaveAttribute("data-traced", /./);

  // Keyboard: focus traces too, and Enter pins the trace.
  await graphNode(page, "1").focus();
  await expect(graphEdge(page, "1-2")).toHaveAttribute("data-traced", "trace");
  await page.keyboard.press("Enter");
  await expect(graphNode(page, "1")).toHaveAttribute("aria-pressed", "true");
});

test("Graph: the layout is deterministic and the Force / Circle switch overrides it", async ({
  page,
}) => {
  await openPicture(page, "Clique", CLIQUE_GRAPH_FRAMES);
  const where = () =>
    graphNode(page, "1")
      .locator("[data-body]")
      .evaluate((el) => [el.getAttribute("cx"), el.getAttribute("cy")].join(","));
  const first = await where();
  await page.reload();
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "Graph", {
    timeout: 20_000,
  });
  expect(await where()).toBe(first);

  await page.locator(`${GRAPH}-layout-circle`).click();
  await expect(page.locator(`${GRAPH}-graph`)).toHaveAttribute("data-graph-layout", "circle");
  await expect(page.locator(`${GRAPH}-layout-circle`)).toHaveAttribute("aria-pressed", "true");
  expect(await where()).not.toBe(first);
});

for (const scheme of ["light", "dark"]) {
  for (const width of [390, 1080, 1280]) {
    test(`Graph: draws at ${width} px in the ${scheme} theme without widening the page`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      await openPicture(page, "Clique", CLIQUE_GRAPH_FRAMES);
      const svg = page.locator(`${GRAPH}-svg`);
      await expect(svg).toBeVisible();
      const box = await svg.boundingBox();
      expect(box.width).toBeGreaterThan(250);
      expect(box.height).toBeGreaterThan(150);
      // The whole graph fits the width it has, at every width: nothing scrolls sideways.
      await expectFits(page, `${GRAPH}-svg`);
      await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "1.00");
      // Every node is Background in the plain picture: a dark label on the light canvas, a
      // light one on the dark.
      const ink = await graphNode(page, "1")
        .locator("text")
        .first()
        .evaluate((el) => getComputedStyle(el).fill);
      const [r, g, b] = ink.match(/\d+/g).map(Number);
      expect((r + g + b) / 3 > 128).toBe(scheme === "dark");
      // The zoom buttons' text follows the theme too (dark on light, light on dark).
      const buttonInk = await page
        .locator(`${GRAPH}-zoom-in`)
        .evaluate((el) => getComputedStyle(el).color);
      const [br, bg, bb] = buttonInk.match(/\d+/g).map(Number);
      expect((br + bg + bb) / 3 > 128).toBe(scheme === "dark");
    });
  }
}

/**
 * The diagram `selector` names fits: the page doesn't scroll sideways, and the diagram is no
 * wider than the box it sits in.
 */
async function expectFits(page, selector) {
  const sizes = await page.locator(selector).evaluate((svg) => ({
    page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    svg: svg.getBoundingClientRect().width,
    box: svg.parentElement.getBoundingClientRect().width,
    boxScrolls: svg.parentElement.scrollWidth > svg.parentElement.clientWidth,
  }));
  expect(sizes.page).toBeLessThanOrEqual(0);
  expect(sizes.svg).toBeLessThanOrEqual(sizes.box + 0.5);
  expect(sizes.boxScrolls).toBe(false);
}

/** Each node's (or literal's) drawn centre, by id, in viewBox units. */
function nodeCentres(page, scope) {
  return page.locator(`${scope} [data-node-id]`).evaluateAll((nodes) =>
    Object.fromEntries(
      nodes.map((node) => {
        const body = node.querySelector("circle, rect");
        const box = body.getBBox();
        return [
          node.getAttribute("data-node-id"),
          `${box.x + box.width / 2},${box.y + box.height / 2}`,
        ];
      }),
    ),
  );
}

test("Graph: before Run the picture is the plain instance, with no step's states or annotations", async ({
  page,
}) => {
  // The cut's first step already has sides and Committed edges; none of it shows before Run.
  const capture = MAX_CUT_GRAPH_FRAMES;
  await openPicture(page, "Max Cut", capture);
  const graph = page.locator(`${GRAPH}-graph`);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(graph.locator("[data-node-id]")).toHaveCount(capture.payload.nodes.length);
  await expect(graph.locator("[data-edge-id]")).toHaveCount(capture.payload.edges.length);
  await expect(graph.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(graph.locator("[data-group]")).toHaveCount(0);
  await expect(graph.locator("[data-phantom]")).toHaveCount(0);
  await expect(page.locator(CAPTION)).toHaveCount(0);
  // The weights are the instance's, so they show.
  await expect(graph.locator("[data-weight]")).toHaveCount(capture.payload.edges.length);
  // The key has nothing only a run draws: no sides, no Committed.
  await expect(legendBody(page)).not.toContainText("S side");
  await expect(legendBody(page)).not.toContainText("Committed");

  // After Run, step 1 is drawn over the very same layout.
  const before = await nodeCentres(page, `${GRAPH}-graph`);
  await runToFrame(page, capture, 0);
  await expect(page.locator(PICTURE).locator("[data-frame-index]")).toHaveAttribute(
    "data-frame-index",
    "0",
  );
  await expect(graphNode(page, "1")).toHaveAttribute("data-group", "0");
  await expect(graphEdge(page, "1-2")).toHaveAttribute("data-state", "Committed");
  expect(await nodeCentres(page, `${GRAPH}-graph`)).toEqual(before);
});

test("Graph: a tour's plain picture has no order badges, and step 1 keeps every node in place", async ({
  page,
}) => {
  const capture = DIRECTED_HAMILTONIAN_GRAPH_FRAMES;
  await openPicture(page, "Directed Hamiltonian Cycle", capture);
  const graph = page.locator(`${GRAPH}-graph`);
  await expect(graph.locator("[data-badge]")).toHaveCount(0);
  await expect(graph.locator("[data-order]")).toHaveCount(0);
  await expect(graph.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  // Arrows are the graph's own, so they show.
  await expect(graph.locator("[data-edge-id] polygon")).toHaveCount(capture.payload.edges.length);
  const before = await nodeCentres(page, `${GRAPH}-graph`);
  await runToFrame(page, capture, 0);
  await expect(graph.locator('[data-badge="order"]')).toHaveCount(
    new Set(capture.frames[0].order).size,
  );
  expect(await nodeCentres(page, `${GRAPH}-graph`)).toEqual(before);
});

// --- Zoom and pan (DiagramZoom.js) ----------------------------------------------------------

const zoomOf = (page) => page.locator(`${GRAPH}-zoom`).getAttribute("data-zoom");
const viewBoxOf = (page) => page.locator(`${GRAPH}-svg`).getAttribute("viewBox");

/**
 * The fitted viewBox once the picture area has been measured and has stopped changing (the
 * area is measured after it first draws, and the fitted window takes its shape).
 */
async function settledViewBox(page) {
  await page.locator(`${GRAPH}-svg`).scrollIntoViewIfNeeded();
  let last = null;
  await expect
    .poll(async () => {
      const now = await viewBoxOf(page);
      const same = now === last;
      last = now;
      return same;
    })
    .toBe(true);
  return last;
}

/** Drags across the middle of `selector` with the mouse (scrolled into view first). */
async function dragAcross(page, selector, dx, dy) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  const box = await page.locator(selector).boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 4 });
  await page.mouse.move(x + dx, y + dy, { steps: 4 });
  await page.mouse.up();
}

test("Graph: a graph of 16 nodes still fits a 390 px phone whole, with nothing to scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPicture(page, "Clique", LARGE_GRAPH_FRAMES);
  await expect(page.locator(`${GRAPH}-graph [data-node-id]`)).toHaveCount(16);
  await expectFits(page, `${GRAPH}-svg`);
  await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "1.00");
});

test("Graph: the zoom buttons zoom in and out, and Fit goes back to the whole graph", async ({
  page,
}) => {
  await openPicture(page, "Clique", CLIQUE_GRAPH_FRAMES);
  const fit = await settledViewBox(page);
  // At fit there is nothing to zoom out of or reset.
  await expect(page.locator(`${GRAPH}-zoom-out`)).toBeDisabled();
  await expect(page.locator(`${GRAPH}-zoom-reset`)).toBeDisabled();
  await expect(page.locator(`${GRAPH}-zoom-in`)).toHaveAttribute("aria-label", "Zoom in");

  await page.locator(`${GRAPH}-zoom-in`).click();
  await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "1.50");
  expect(await viewBoxOf(page)).not.toBe(fit);
  // Keyboard: the buttons are plain buttons in the tab order.
  await page.locator(`${GRAPH}-zoom-in`).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "2.25");
  await page.locator(`${GRAPH}-zoom-in`).click();
  await page.locator(`${GRAPH}-zoom-in`).click();
  // Clamped at 4x (2.25 x 1.5 x 1.5 would be 5.06).
  await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "4.00");
  await expect(page.locator(`${GRAPH}-zoom-in`)).toBeDisabled();
  await page.locator(`${GRAPH}-zoom-out`).click();
  await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "2.67");

  await page.locator(`${GRAPH}-zoom-reset`).click();
  await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "1.00");
  expect(await viewBoxOf(page)).toBe(fit);
  await expectFits(page, `${GRAPH}-svg`);
});

test("Graph: Ctrl + wheel zooms the diagram, and a plain wheel still scrolls the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await openPicture(page, "Clique", CLIQUE_GRAPH_FRAMES);
  const box = await page.locator(`${GRAPH}-svg`).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  const scrolled = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrolled);
  expect(await zoomOf(page)).toBe("1.00");

  const svgBox = await page.locator(`${GRAPH}-svg`).boundingBox();
  await page.mouse.move(svgBox.x + svgBox.width / 2, svgBox.y + svgBox.height / 2);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -200);
  await page.keyboard.up("Control");
  await expect.poll(async () => Number(await zoomOf(page))).toBeGreaterThan(1.2);
});

test("Graph: zoom is kept while stepping and goes back to fit when the layout changes", async ({
  page,
}) => {
  const capture = CLIQUE_GRAPH_FRAMES;
  await openPicture(page, "Clique", capture);
  await runToFrame(page, capture, 0);
  await page.locator(`${GRAPH}-zoom-in`).click();
  await dragAcross(page, `${GRAPH}-svg`, -60, 0);
  const zoomed = await viewBoxOf(page);
  expect(await zoomOf(page)).toBe("1.50");

  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[1].caption);
  expect(await zoomOf(page)).toBe("1.50");
  expect(await viewBoxOf(page)).toBe(zoomed);

  await page.locator(`${GRAPH}-layout-circle`).click();
  await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "1.00");
});

test("Graph: a drag pans only when zoomed in; at fit it leaves the diagram where it is", async ({
  page,
}) => {
  await openPicture(page, "Clique", CLIQUE_GRAPH_FRAMES);
  const fit = await settledViewBox(page);
  await dragAcross(page, `${GRAPH}-svg`, -80, -40);
  expect(await viewBoxOf(page)).toBe(fit);
  // At fit a touch drag belongs to the page (it scrolls); zoomed, it is the diagram's.
  const touchAction = () =>
    page.locator(`${GRAPH}-svg`).evaluate((svg) => getComputedStyle(svg).touchAction);
  expect(await touchAction()).toBe("pan-x pan-y");

  await page.locator(`${GRAPH}-zoom-in`).click();
  await page.locator(`${GRAPH}-zoom-in`).click();
  const before = await viewBoxOf(page);
  expect(await touchAction()).toBe("none");
  await dragAcross(page, `${GRAPH}-svg`, -80, -40);
  const after = await viewBoxOf(page);
  expect(after).not.toBe(before);
  // Dragged left and up, the window moves right and down, but never off the drawing.
  const [fx, fy, fw, fh] = fit.split(" ").map(Number);
  const [x, y, w, h] = after.split(" ").map(Number);
  expect(x).toBeGreaterThanOrEqual(fx - 0.01);
  expect(y).toBeGreaterThanOrEqual(fy - 0.01);
  expect(x + w).toBeLessThanOrEqual(fx + fw + 0.01);
  expect(y + h).toBeLessThanOrEqual(fy + fh + 0.01);
  // Dragging on past the edge stops at it.
  for (let drag = 0; drag < 6; drag += 1) await dragAcross(page, `${GRAPH}-svg`, -300, -150);
  const [ex, ey] = (await viewBoxOf(page)).split(" ").map(Number);
  expect(ex).toBeCloseTo(fx + fw - w, 1);
  expect(ey).toBeCloseTo(fy + fh - h, 1);
});

test("Graph: on a phone a tap still traces a node after zooming, and focus brings a node into view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPicture(page, "Clique", LARGE_GRAPH_FRAMES);
  // (A phone opens the Details panel as a sheet over the picture; close it first.)
  await page.locator("#workbench-panel-close").click();
  for (let press = 0; press < 3; press += 1) await page.locator(`${GRAPH}-zoom-in`).click();
  await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "3.38");

  // Zoomed in on the middle, node 1 (top of the circle) is out of the window. Focusing it pans
  // it into view, and tracing follows the focus.
  const inWindow = (id) =>
    graphNode(page, id).evaluate((node) => {
      const svg = node.ownerSVGElement;
      const view = svg.viewBox.baseVal;
      const box = node.getBBox();
      return (
        box.x >= view.x - 0.01 &&
        box.y >= view.y - 0.01 &&
        box.x + box.width <= view.x + view.width + 0.01 &&
        box.y + box.height <= view.y + view.height + 0.01
      );
    });
  expect(await inWindow("1")).toBe(false);
  await graphNode(page, "1").focus();
  await expect.poll(() => inWindow("1")).toBe(true);
  await expect(graphNode(page, "1")).toHaveAttribute("data-traced", "trace");
  await graphNode(page, "1").blur();

  // A tap on the zoomed node pins its trace, and its hit area grew with the zoom.
  const target = await graphNode(page, "1").locator("[data-body]").boundingBox();
  expect(target.width).toBeGreaterThanOrEqual(24);
  await graphNode(page, "1").click();
  await expect(graphNode(page, "1")).toHaveAttribute("aria-pressed", "true");
  await expect(graphEdge(page, "1-2")).toHaveAttribute("data-traced", "trace");
  await expectFits(page, `${GRAPH}-svg`);
});

test("Graph: a two-finger pinch zooms on a touch screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPicture(page, "Clique", CLIQUE_GRAPH_FRAMES);
  await page.locator("#workbench-panel-close").click();
  await page.locator(`${GRAPH}-svg`).scrollIntoViewIfNeeded();
  const box = await page.locator(`${GRAPH}-svg`).boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // Raw touches through the DevTools protocol: Playwright has no multi-touch gesture.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
  const touches = (spread) => [
    { x: cx - spread, y: cy, id: 0 },
    { x: cx + spread, y: cy, id: 1 },
  ];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: touches(20) });
  for (const spread of [30, 40, 50, 60]) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: touches(spread) });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  // The fingers spread to three times their distance: 3x, within the 4x limit.
  await expect.poll(async () => Number(await zoomOf(page))).toBeGreaterThan(2.5);
  expect(Number(await zoomOf(page))).toBeLessThanOrEqual(4);
});

// --- The picture area (DiagramZoom.js) -------------------------------------------------------

/** The picture box's width inside its padding, and the svg's place on screen. */
function areaSizes(page, svgSelector) {
  return page.locator(svgSelector).evaluate((svg) => {
    const picture = document.querySelector("#workbench-source-picture");
    const style = getComputedStyle(picture);
    const content =
      picture.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const rect = svg.getBoundingClientRect();
    const view = svg.viewBox.baseVal;
    return {
      content,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      bottom: rect.bottom,
      viewport: window.innerHeight,
      viewAspect: view.width / view.height,
    };
  });
}

/** Scrolls the page so the picture box's top is at the top of the screen. */
async function scrollPictureToTop(page) {
  await page
    .locator(PICTURE)
    .evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY));
}

for (const [width, height] of [
  [1280, 800],
  [1920, 1080],
]) {
  test(`Graph: at ${width}x${height} the picture fills the pane's width and fits the screen's height`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await openPicture(page, "Clique", CLIQUE_GRAPH_FRAMES);
    const svg = `${GRAPH}-svg`;
    await expect(page.locator(svg)).toBeVisible();
    await expect
      .poll(async () => {
        const sizes = await areaSizes(page, svg);
        return Math.abs(sizes.width - sizes.content);
      })
      .toBeLessThanOrEqual(2);
    await scrollPictureToTop(page);
    const sizes = await areaSizes(page, svg);
    expect(sizes.bottom).toBeLessThanOrEqual(sizes.viewport);
    expect(sizes.height).toBeGreaterThanOrEqual(200);
    // The window onto the drawing has the area's shape, at fit and zoomed: no clipped column.
    expect(sizes.viewAspect).toBeCloseTo(sizes.width / sizes.height, 2);
    await page.locator(`${GRAPH}-zoom-in`).click();
    await page.locator(`${GRAPH}-zoom-in`).click();
    const zoomed = await areaSizes(page, svg);
    expect(zoomed.width).toBeCloseTo(sizes.width, 0);
    expect(zoomed.viewAspect).toBeCloseTo(zoomed.width / zoomed.height, 2);
  });
}

test("Graph: zoomed in, a pan reaches both the drawing's left and right edges", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openPicture(page, "Clique", CLIQUE_GRAPH_FRAMES);
  for (let press = 0; press < 3; press += 1) await page.locator(`${GRAPH}-zoom-in`).click();
  // The outermost nodes' left and right edges, and whether the window shows them.
  const edges = () =>
    page.locator(`${GRAPH}-svg`).evaluate((svg) => {
      const view = svg.viewBox.baseVal;
      const boxes = [...svg.querySelectorAll("[data-node-id] [data-body]")].map((body) =>
        body.getBBox(),
      );
      const left = Math.min(...boxes.map((box) => box.x));
      const right = Math.max(...boxes.map((box) => box.x + box.width));
      return {
        leftShown: view.x <= left + 0.01,
        rightShown: view.x + view.width >= right - 0.01,
      };
    });
  expect(await edges()).toEqual({ leftShown: false, rightShown: false });
  for (let drag = 0; drag < 5; drag += 1) await dragAcross(page, `${GRAPH}-svg`, 300, 0);
  expect((await edges()).leftShown).toBe(true);
  for (let drag = 0; drag < 10; drag += 1) await dragAcross(page, `${GRAPH}-svg`, -300, 0);
  expect((await edges()).rightShown).toBe(true);
});

// --- #203: the Bipartite Graph renderer (set problems, and SAT's factor graph) --------------

const BIPARTITE = "#workbench-source-frames-bipartitegraph";

/**
 * Each bipartite capture with the problem page it is opened on and that problem's default
 * visualization, which allInfo is made to name BipartiteGraph so the test doesn't depend on the
 * backend the catalog comes from (3SAT's default picture is the clause graph; its factor graph
 * is a second visualization).
 */
const BIPARTITE_CASES = [
  {
    problem: "Set Cover",
    viz: "SetCoverDefaultVisualization",
    capture: SET_COVER_BIPARTITE_FRAMES,
  },
  {
    problem: "Exact Cover",
    viz: "ExactCoverDefaultVisualization",
    capture: EXACT_COVER_BIPARTITE_FRAMES,
  },
  {
    // ReduxISU/Redux#742 renamed Hitting Set to Karp's Exact Hitting Set.
    problem: "Exact Hitting Set",
    viz: "HittingSetDefaultVisualization",
    capture: HITTING_SET_BIPARTITE_FRAMES,
  },
  { problem: "3SAT", viz: "Sat3DefaultVisualization", capture: SAT3_FACTOR_GRAPH_FRAMES },
];

async function openBipartite(page, { problem, viz, capture }) {
  await setPictureTypes(page, { [viz]: "BipartiteGraph" });
  await openPicture(page, problem, capture);
  await expect(page.locator(`${BIPARTITE}-graph`)).toBeVisible();
}

const bipartiteNode = (page, id) => page.locator(`${BIPARTITE}-graph [data-node-id="${id}"]`);
const bipartiteEdge = (page, id) => page.locator(`${BIPARTITE}-graph [data-edge-id="${id}"]`);

/** Frame `index`'s states, checked piece by piece against the picture (absent = Background). */
async function expectBipartiteStates(page, capture, index) {
  const frame = capture.frames[index];
  for (const node of [...capture.payload.elements, ...capture.payload.sets]) {
    await expect(bipartiteNode(page, node.id)).toHaveAttribute(
      "data-state",
      frame.nodes[node.id]?.state ?? "Background",
    );
  }
  for (const edge of capture.payload.edges) {
    await expect(bipartiteEdge(page, edge.id)).toHaveAttribute(
      "data-state",
      frame.edges[edge.id]?.state ?? "Background",
    );
  }
}

for (const testCase of BIPARTITE_CASES) {
  test(`Bipartite Graph: ${testCase.problem} draws both columns, every membership and the picked side`, async ({
    page,
  }) => {
    const { payload } = testCase.capture;
    await openBipartite(page, testCase);
    const graph = page.locator(`${BIPARTITE}-graph`);
    await expect(graph).toHaveAttribute("data-pick-side", payload.pickSide);
    await expect(graph.locator('[data-side="left"]')).toHaveCount(payload.elements.length);
    await expect(graph.locator('[data-side="right"]')).toHaveCount(payload.sets.length);
    await expect(graph.locator("[data-edge-id]")).toHaveCount(payload.edges.length);
    // One header marks the column the answer picks from (the factor graph's assigned variables).
    const picked = graph.locator("[data-picked-head]");
    await expect(picked).toHaveCount(1);
    await expect(picked).toHaveText(payload.pickSide === "assignment" ? /ASSIGNED/ : /PICKED/);
    // Every node says what it is, and can be reached by keyboard.
    const named =
      payload.pickSide === "assignment"
        ? /^(Variable \S+, (true|false|not assigned yet)|Clause C\d+: )/
        : /^(Element \S+|Set S\d+ \{)/;
    for (const piece of await graph.locator("[data-focusable]").all()) {
      await expect(piece).toHaveAttribute("aria-label", named);
      await expect(piece).toHaveAttribute("tabindex", "0");
    }
  });
}

test("Bipartite Graph: before Run the picture is the plain instance, and step 1 keeps it in place", async ({
  page,
}) => {
  // The brute force's first step already tries S1, covers 1-3 and rejects 4 and 5.
  const capture = SET_COVER_BIPARTITE_FRAMES;
  await openBipartite(page, BIPARTITE_CASES[0]);
  const graph = page.locator(`${BIPARTITE}-graph`);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(graph.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(graph.locator("[data-hits]")).toHaveCount(0);
  await expect(graph.locator("[data-badge]")).toHaveCount(0);
  await expect(page.locator(CAPTION)).toHaveCount(0);
  // The member lists are the instance's, so they show.
  await expect(bipartiteNode(page, "S1")).toContainText("{1,2,3}");
  await expect(legendBody(page)).not.toContainText("×N");

  const before = await nodeCentres(page, `${BIPARTITE}-graph`);
  await runToFrame(page, capture, 0);
  await expectBipartiteStates(page, capture, 0);
  expect(await nodeCentres(page, `${BIPARTITE}-graph`)).toEqual(before);
});

test("Bipartite Graph: the factor graph's plain picture has no values or counts, and step 1 keeps it in place", async ({
  page,
}) => {
  const capture = SAT3_FACTOR_GRAPH_FRAMES;
  await openBipartite(page, BIPARTITE_CASES[3]);
  const graph = page.locator(`${BIPARTITE}-graph`);
  await expect(graph.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(graph.locator('[data-value]:not([data-value="unassigned"])')).toHaveCount(0);
  await expect(graph.locator("[data-value-text]")).toHaveCount(0);
  await expect(graph.locator("[data-hits-pill]")).toHaveCount(0);
  // The dashed ¬x edges are the formula's own, so they show, and the Legend says what they are.
  await expect(legendBody(page)).toContainText("Dashed edge (the clause has ¬x)");
  await expect(legendBody(page)).not.toContainText("T / F");

  const before = await nodeCentres(page, `${BIPARTITE}-graph`);
  await runToFrame(page, capture, 0);
  await expect(bipartiteNode(page, "v:x1")).toHaveAttribute("data-value", "true");
  expect(await nodeCentres(page, `${BIPARTITE}-graph`)).toEqual(before);
});

test("Bipartite Graph: the steps walk the brute force's tries, the ×2 hits and the confirmed answer", async ({
  page,
}) => {
  const capture = SET_COVER_BIPARTITE_FRAMES;
  await openBipartite(page, BIPARTITE_CASES[0]);
  // Frame 5 tries {S1,S2}: 2 is in both, and 5 is in neither.
  await runToFrame(page, capture, 4);
  await expectBipartiteStates(page, capture, 4);
  await expect(bipartiteNode(page, "e:2")).toHaveAttribute("data-hits", "2");
  await expect(bipartiteNode(page, "e:2").locator('[data-badge="hits"]')).toHaveText("×2");
  await expect(bipartiteNode(page, "e:2")).toHaveAttribute("aria-label", /hit by 2 picked sets/);
  await expect(bipartiteNode(page, "e:1").locator("[data-badge]")).toHaveCount(0);
  await expect(bipartiteNode(page, "e:5")).toHaveAttribute(
    "aria-label",
    /Rejected \(failed or ruled out\)/,
  );
  await expect(legendBody(page)).toContainText("×N (hit by N picked sets)");

  for (let index = 5; index < capture.frames.length; index += 1) {
    await page.locator("#workbench-steps-next").click();
    await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
    await expectBipartiteStates(page, capture, index);
  }
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: yes");
  await expect(bipartiteNode(page, "S1")).toHaveAttribute("data-state", "Solution");
  await expect(bipartiteNode(page, "S4")).toHaveAttribute("data-state", "Solution");
  await expect(bipartiteNode(page, "S2")).toHaveAttribute("data-state", "Background");
});

test("Bipartite Graph: Exact Cover shows Blocked sets, a Committed set and the answer", async ({
  page,
}) => {
  const capture = EXACT_COVER_BIPARTITE_FRAMES;
  await openBipartite(page, BIPARTITE_CASES[1]);
  await runToFrame(page, capture, 1);
  await expectBipartiteStates(page, capture, 1);
  await expect(bipartiteNode(page, "S1")).toHaveAttribute("data-state", "Committed");
  await expect(bipartiteNode(page, "S2")).toHaveAttribute("data-state", "Blocked");
  await expect(bipartiteNode(page, "e:4")).toHaveAttribute("data-state", "Rejected");
  // Blocked and Committed are told apart by their dashes as well as their colors.
  const dash = (id) =>
    bipartiteNode(page, id).locator("[data-body]").getAttribute("stroke-dasharray");
  expect(await dash("S1")).toBeTruthy();
  expect(await dash("S2")).toBeTruthy();
  expect(await dash("S1")).not.toBe(await dash("S2"));
  const legend = legendBody(page);
  await expect(legend).toContainText("Blocked (can't be picked)");
  await expect(legend).toContainText("Committed (kept so far)");
  for (let index = 2; index < capture.frames.length; index += 1) {
    await page.locator("#workbench-steps-next").click();
    await expectBipartiteStates(page, capture, index);
  }
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: yes");
});

test("Bipartite Graph: Hitting Set picks elements, and its answer blocks the rest", async ({
  page,
}) => {
  const capture = HITTING_SET_BIPARTITE_FRAMES;
  await openBipartite(page, BIPARTITE_CASES[2]);
  await expect(page.locator(`${BIPARTITE}-graph [data-picked-head]`)).toHaveText(/PICKED/);
  await runToFrame(page, capture, capture.frames.length - 1);
  await expectBipartiteStates(page, capture, capture.frames.length - 1);
  await expect(bipartiteNode(page, "e:1")).toHaveAttribute("data-state", "Solution");
  await expect(bipartiteNode(page, "e:3")).toHaveAttribute("data-state", "Blocked");
  await expect(bipartiteNode(page, "S2")).toHaveAttribute("aria-label", /hit by 1 picked element/);
});

test("Bipartite Graph: a Set Cover with an element in no set ends on no, with nothing as the answer", async ({
  page,
}) => {
  const capture = SET_COVER_FAILED_BIPARTITE_FRAMES;
  await openBipartite(page, { ...BIPARTITE_CASES[0], capture });
  await expect(bipartiteNode(page, "e:5")).toHaveAttribute("aria-label", /in no set$/);
  await runToFrame(page, capture, 0);
  await expect(bipartiteNode(page, "e:5")).toHaveAttribute("data-state", "Rejected");
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: no");
  await expect(page.locator(`${BIPARTITE}-graph [data-state="Solution"]`)).toHaveCount(0);
});

test("Bipartite Graph: the factor graph draws ¬x dashed, a repeated variable twice, T / F and n true", async ({
  page,
}) => {
  const capture = SAT3_FACTOR_GRAPH_FRAMES;
  await openBipartite(page, BIPARTITE_CASES[3]);
  // C2 is (¬x1 ∨ x3 ∨ x1): x1 twice, so two edges between the same two nodes, both visible.
  await expect(bipartiteNode(page, "c1")).toHaveAttribute(
    "aria-label",
    /^Clause C2: ¬x1 ∨ x3 ∨ x1/,
  );
  const first = await bipartiteEdge(page, "c1-0").getAttribute("d");
  const second = await bipartiteEdge(page, "c1-2").getAttribute("d");
  expect(first).not.toBe(second);
  await expect(bipartiteEdge(page, "c1-0")).toHaveAttribute("data-positive", "false");
  await expect(bipartiteEdge(page, "c1-0")).toHaveAttribute("stroke-dasharray", "5 4");
  await expect(bipartiteEdge(page, "c1-2")).toHaveAttribute("data-positive", "true");

  // Frame 5: x1 = True is kept so far, x2 = True is being tried.
  await runToFrame(page, capture, 4);
  await expectBipartiteStates(page, capture, 4);
  await expect(bipartiteNode(page, "v:x1")).toHaveAttribute("data-state", "Committed");
  await expect(bipartiteNode(page, "v:x1").locator("[data-value-text]")).toHaveText("T");
  await expect(bipartiteNode(page, "v:x3")).toHaveAttribute("data-value", "unassigned");
  await expect(bipartiteNode(page, "c0").locator("[data-hits-pill]")).toHaveText("1 true");
  await expect(bipartiteEdge(page, "c0-1")).toHaveAttribute("data-state", "False");

  // The answer: x3 = False, every clause Covered, C3 with two true literals.
  await page.locator("#workbench-steps-next").click();
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: yes");
  await expectBipartiteStates(page, capture, capture.frames.length - 1);
  await expect(bipartiteNode(page, "v:x3").locator("[data-value-text]")).toHaveText("F");
  await expect(bipartiteNode(page, "c2").locator("[data-hits-pill]")).toHaveText("2 true");
  const legend = legendBody(page);
  await expect(legend).toContainText("False (assigned false)");
  await expect(legend).toContainText("T / F (the variable's value so far)");
  await expect(legend).toContainText("n true (how many of the clause's literals are true)");
});

test("Bipartite Graph: hovering, focusing or tapping a node traces its edges and fades the rest by color", async ({
  page,
}) => {
  await openBipartite(page, BIPARTITE_CASES[0]);
  await bipartiteNode(page, "S1").hover();
  for (const id of ["e:1~S1", "e:2~S1", "e:3~S1"]) {
    await expect(bipartiteEdge(page, id)).toHaveAttribute("data-traced", "trace");
  }
  await expect(bipartiteEdge(page, "e:2~S2")).toHaveAttribute("data-traced", "faint");
  await expect(bipartiteNode(page, "e:1")).toHaveAttribute("data-traced", "trace");
  await expect(bipartiteNode(page, "e:5")).toHaveAttribute("data-traced", "faint");
  const faded = await bipartiteNode(page, "e:5").evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    filter: getComputedStyle(el).filter,
  }));
  expect(faded.opacity).toBe("1");
  expect(faded.filter).toContain("grayscale");

  // Keyboard: focusing an element traces it; Enter pins it.
  await page.mouse.move(0, 0);
  await bipartiteNode(page, "e:4").focus();
  await expect(bipartiteEdge(page, "e:4~S2")).toHaveAttribute("data-traced", "trace");
  await expect(bipartiteNode(page, "S1")).toHaveAttribute("data-traced", "faint");
  await page.keyboard.press("Enter");
  await expect(bipartiteNode(page, "e:4")).toHaveAttribute("aria-pressed", "true");
  await expect(bipartiteNode(page, "e:4")).toHaveAttribute("aria-label", /in S2, S3, S4$/);
});

test("Bipartite Graph: on a phone a tap traces a node, also after zooming in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openBipartite(page, BIPARTITE_CASES[3]);
  await page.locator("#workbench-panel-close").click();
  await expectFits(page, `${BIPARTITE}-svg`);
  await page.locator(`${BIPARTITE}-zoom-in`).click();
  await expect(page.locator(`${BIPARTITE}-zoom`)).toHaveAttribute("data-zoom", "1.50");
  await bipartiteNode(page, "v:x2").focus();
  await bipartiteNode(page, "v:x2").blur();
  await bipartiteNode(page, "v:x2").click();
  await expect(bipartiteNode(page, "v:x2")).toHaveAttribute("aria-pressed", "true");
  await expect(bipartiteEdge(page, "c0-1")).toHaveAttribute("data-traced", "trace");
  await expectFits(page, `${BIPARTITE}-svg`);
});

for (const scheme of ["light", "dark"]) {
  for (const width of [390, 1280]) {
    test(`Bipartite Graph: draws at ${width} px in the ${scheme} theme without widening the page`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      await openBipartite(page, BIPARTITE_CASES[0]);
      const svg = page.locator(`${BIPARTITE}-svg`);
      await expect(svg).toBeVisible();
      expect((await svg.boundingBox()).width).toBeGreaterThan(250);
      await expectFits(page, `${BIPARTITE}-svg`);
      await expect(page.locator(`${BIPARTITE}-zoom`)).toHaveAttribute("data-zoom", "1.00");
      // The column headers follow the theme: no dark-on-dark, no light-on-white.
      const ink = await page
        .locator(`${BIPARTITE}-graph [data-layer="heads"] text`)
        .first()
        .evaluate((el) => getComputedStyle(el).fill);
      const [r, g, b] = ink.match(/\d+/g).map(Number);
      expect((r + g + b) / 3 > 128).toBe(scheme === "dark");
    });
  }
}

for (const [width, height] of [
  [1280, 800],
  [1920, 1080],
]) {
  test(`Bipartite Graph: at ${width}x${height} the picture fills the pane and fits the screen`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await openBipartite(page, BIPARTITE_CASES[0]);
    const svg = `${BIPARTITE}-svg`;
    await expect(page.locator(svg)).toBeVisible();
    await expect
      .poll(async () => {
        const sizes = await areaSizes(page, svg);
        return Math.abs(sizes.width - sizes.content);
      })
      .toBeLessThanOrEqual(2);
    await scrollPictureToTop(page);
    const sizes = await areaSizes(page, svg);
    expect(sizes.bottom).toBeLessThanOrEqual(sizes.viewport);
    expect(sizes.viewAspect).toBeCloseTo(sizes.width / sizes.height, 2);
    await page.locator(`${BIPARTITE}-zoom-in`).click();
    await page.locator(`${BIPARTITE}-zoom-in`).click();
    const zoomed = await areaSizes(page, svg);
    expect(zoomed.viewAspect).toBeCloseTo(zoomed.width / zoomed.height, 2);
  });
}

// --- #205: the Layered Graph renderer (directed graphs in ranks) ------------------------------

const LAYERED = "#workbench-source-frames-layeredgraph";

/**
 * Each layered capture with the problem page it is opened on and the visualizations allInfo is
 * made to name LayeredGraph (so the test doesn't depend on the backend the catalog comes from).
 */
const LAYERED_CASES = {
  topo: {
    problem: "Topological Sort",
    viz: ["TopologicalSortDefaultVisualization"],
    capture: TOPOLOGICAL_SORT_LAYERED_FRAMES,
  },
  cycle: {
    problem: "Topological Sort",
    viz: ["TopologicalSortDefaultVisualization"],
    capture: TOPOLOGICAL_SORT_CYCLE_LAYERED_FRAMES,
  },
  arcSet: {
    problem: "Feedback Arc Set",
    viz: ["ArcSetDefaultVisualization"],
    capture: ARC_SET_LAYERED_FRAMES,
  },
  nodeSet: {
    problem: "Feedback Node Set",
    viz: ["NodeSetDefaultVisualization"],
    capture: NODE_SET_LAYERED_FRAMES,
  },
  // Strongly Connected Components is newer than the backend CI's catalog comes from
  // (ghcr.io/reduxisu/redux:latest has no such problem page yet), so its capture is drawn on
  // another directed-graph problem's page: the picture is the capture's, whatever the page.
  scc: {
    problem: "Topological Sort",
    viz: ["TopologicalSortDefaultVisualization", "SCCVisualization"],
    capture: SCC_LAYERED_FRAMES,
  },
  sssp: {
    problem: "Single Source Shortest Path Problem",
    viz: ["SSSPVisualization", "SSSPTableVisualization"],
    capture: SSSP_UNREACHABLE_LAYERED_FRAMES,
  },
  ssspParallel: {
    problem: "Single Source Shortest Path Problem",
    viz: ["SSSPVisualization", "SSSPTableVisualization"],
    capture: SSSP_PARALLEL_LAYERED_FRAMES,
  },
  spsp: {
    problem: "Single Pair Shortest Path Problem",
    viz: ["SPSPVisualization", "SPSPTableVisualization"],
    capture: SPSP_LAYERED_FRAMES,
  },
};

async function openLayered(page, { problem, viz, capture }) {
  await setPictureTypes(page, Object.fromEntries(viz.map((name) => [name, "LayeredGraph"])));
  await openPicture(page, problem, capture);
  await expect(page.locator(`${LAYERED}-graph`)).toBeVisible();
}

const layeredNode = (page, id) => page.locator(`${LAYERED}-graph [data-node-id="${id}"]`);
const layeredEdge = (page, id) => page.locator(`${LAYERED}-graph [data-edge-id="${id}"]`);

/** Frame `index`'s states, checked piece by piece against the picture (absent = Background). */
async function expectLayeredStates(page, capture, index) {
  const frame = capture.frames[index];
  for (const node of capture.payload.nodes) {
    await expect(layeredNode(page, node.id)).toHaveAttribute(
      "data-state",
      frame.nodes[node.id]?.state ?? "Background",
    );
  }
  for (const edge of capture.payload.edges) {
    await expect(layeredEdge(page, edge.id)).toHaveAttribute(
      "data-state",
      frame.edges[edge.id]?.state ?? "Background",
    );
  }
}

/** Each node's drawn centre, by id, in viewBox units, grouped by its column (x). */
function layeredColumns(page) {
  return page.locator(`${LAYERED}-graph [data-node-id]`).evaluateAll((nodes) => {
    const columns = new Map();
    for (const node of nodes) {
      const box = node.querySelector("[data-body]").getBBox();
      const x = Math.round(box.x + box.width / 2);
      if (!columns.has(x)) columns.set(x, []);
      columns.get(x).push(node.getAttribute("data-node-id"));
    }
    return [...columns.entries()].sort((a, b) => a[0] - b[0]).map(([, ids]) => ids.sort());
  });
}

for (const [key, testCase] of Object.entries(LAYERED_CASES)) {
  test(`Layered Graph: the ${testCase.capture.payload.rule} capture (${key}) draws every node in its layer, every edge and every step`, async ({
    page,
  }) => {
    const { capture } = testCase;
    const { payload } = capture;
    await openLayered(page, testCase);
    const graph = page.locator(`${LAYERED}-graph`);
    await expect(graph).toHaveAttribute("data-graph-shape", payload.shape);
    await expect(graph.locator("[data-node-id]")).toHaveCount(payload.nodes.length);
    await expect(graph.locator("[data-edge-id]")).toHaveCount(payload.edges.length);
    await expect(graph.locator("[data-back]")).toHaveCount(
      payload.edges.filter((edge) => edge.back).length,
    );
    // One column per layer, left to right, holding that layer's nodes.
    expect(await layeredColumns(page)).toEqual(payload.layers.map((ids) => [...ids].sort()));
    // Directed: an arrowhead on every edge.
    await expect(graph.locator("[data-edge-id] polygon")).toHaveCount(
      payload.directed ? payload.edges.length : 0,
    );
    // Every node says what it is, and can be reached by keyboard.
    for (const piece of await graph.locator("[data-focusable]").all()) {
      await expect(piece).toHaveAttribute("aria-label", /^Node \S+, /);
      await expect(piece).toHaveAttribute("tabindex", "0");
    }
    // The step controls walk every frame's states.
    await runToFrame(page, capture, 0);
    await expectLayeredStates(page, capture, 0);
    for (let index = 1; index < capture.frames.length; index += 1) {
      await page.locator("#workbench-steps-next").click();
      await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
      await expectLayeredStates(page, capture, index);
    }
    await expect(page.locator(`${CAPTION}-verdict`)).toHaveText(
      capture.frames.at(-1).ok ? "Verdict: yes" : "Verdict: no",
    );
  });
}

test("Layered Graph: before Run the picture is the plain graph, and step 1 keeps it in place", async ({
  page,
}) => {
  // Kahn's first step already marks 1 ready; SCC's and SSSP's add finish numbers, colors and
  // distances. None of it shows before Run.
  const capture = TOPOLOGICAL_SORT_LAYERED_FRAMES;
  await openLayered(page, LAYERED_CASES.topo);
  const graph = page.locator(`${LAYERED}-graph`);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(graph.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(graph.locator("[data-badge]")).toHaveCount(0);
  await expect(page.locator(CAPTION)).toHaveCount(0);
  await expect(legendBody(page)).not.toContainText("Order (position in the order)");
  await expect(legendBody(page)).toContainText("Arrow (the edge's direction)");

  const before = await nodeCentres(page, `${LAYERED}-graph`);
  await runToFrame(page, capture, 0);
  await expect(layeredNode(page, "1")).toHaveAttribute("data-state", "Covered");
  expect(await nodeCentres(page, `${LAYERED}-graph`)).toEqual(before);
});

test("Layered Graph: the plain shortest-path picture names the source and target but shows no distances", async ({
  page,
}) => {
  const capture = SPSP_LAYERED_FRAMES;
  await openLayered(page, LAYERED_CASES.spsp);
  const graph = page.locator(`${LAYERED}-graph`);
  await expect(graph.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(graph.locator("[data-distance]")).toHaveCount(0);
  await expect(layeredNode(page, "1").locator('[data-tag="source"]')).toHaveText("source");
  await expect(layeredNode(page, "5").locator('[data-tag="target"]')).toHaveText("target");
  // The weights are the instance's, so they show.
  await expect(graph.locator("[data-weight]")).toHaveCount(capture.payload.edges.length);
  const before = await nodeCentres(page, `${LAYERED}-graph`);
  await runToFrame(page, capture, 0);
  await expect(layeredNode(page, "1").locator("[data-distance]")).toHaveText("d = 0");
  await expect(layeredNode(page, "5").locator("[data-distance]")).toHaveText("∞");
  expect(await nodeCentres(page, `${LAYERED}-graph`)).toEqual(before);
  // Settling the target (Redux #892): only the path so far is Solution, the rest of the tree
  // Committed, and the target highlighted.
  await runToFrame(page, capture, 5);
  for (const id of ["1", "3"]) {
    await expect(layeredNode(page, id)).toHaveAttribute("data-state", "Solution");
  }
  for (const id of ["2", "4"]) {
    await expect(layeredNode(page, id)).toHaveAttribute("data-state", "Committed");
  }
  await expect(layeredNode(page, "5")).toHaveAttribute("data-state", "ElementHighlight");
  await expect(layeredEdge(page, "3>5")).toHaveAttribute("data-state", "Solution");
  await expect(layeredEdge(page, "2>4")).toHaveAttribute("data-state", "Committed");
});

test("Layered Graph: Topological Sort shows ready, Committed and placed nodes with order badges", async ({
  page,
}) => {
  const capture = TOPOLOGICAL_SORT_LAYERED_FRAMES;
  await openLayered(page, LAYERED_CASES.topo);
  await runToFrame(page, capture, 3);
  await expect(layeredNode(page, "1")).toHaveAttribute("data-state", "Committed");
  await expect(layeredNode(page, "1")).toHaveAttribute("data-order", "1");
  await expect(layeredNode(page, "3")).toHaveAttribute("data-order", "3");
  await expect(layeredNode(page, "3").locator('[data-badge="order"]')).toHaveText("3");
  await expect(layeredNode(page, "4")).toHaveAttribute("data-state", "Covered");
  await expect(layeredNode(page, "2")).toHaveAttribute("aria-label", /placed 2nd/);
  await expect(layeredEdge(page, "1>2")).toHaveAttribute("data-state", "Committed");
  await expect(legendBody(page)).toContainText("Order (position in the order)");
  await expect(legendBody(page)).toContainText("Committed (kept so far)");
});

test("Layered Graph: a cycle's back edge runs under the rows, and the stuck nodes end Rejected", async ({
  page,
}) => {
  const capture = TOPOLOGICAL_SORT_CYCLE_LAYERED_FRAMES;
  await openLayered(page, LAYERED_CASES.cycle);
  // 4>2 points backward: it leaves 4's bottom and dips below every node.
  const below = await page.locator(`${LAYERED}-svg`).evaluate((svg) => {
    const edge = svg.querySelector('[data-edge-id="4>2"] path').getBBox();
    const bodies = [...svg.querySelectorAll("[data-node-id] [data-body]")].map((b) => b.getBBox());
    return edge.y + edge.height > Math.max(...bodies.map((b) => b.y + b.height));
  });
  expect(below).toBe(true);
  await expect(legendBody(page)).toContainText("Back edge (points backward, closing a cycle");
  await runToFrame(page, capture, capture.frames.length - 1);
  for (const id of ["2", "3", "4", "5"]) {
    await expect(layeredNode(page, id)).toHaveAttribute("data-state", "Rejected");
  }
  await expect(layeredEdge(page, "4>2")).toHaveAttribute("data-state", "Rejected");
  await expect(page.locator(`${LAYERED}-graph [data-state="Solution"]`)).toHaveCount(0);
});

test("Layered Graph: Feedback Arc Set draws the removed edge dashed, Feedback Node Set its node's edges Untraveled", async ({
  page,
}) => {
  const arcs = ARC_SET_LAYERED_FRAMES;
  await openLayered(page, LAYERED_CASES.arcSet);
  await runToFrame(page, arcs, arcs.frames.length - 1);
  await expect(layeredEdge(page, "2>3")).toHaveAttribute("data-state", "Solution");
  await expect(layeredEdge(page, "2>3")).toHaveAttribute("data-removed", "true");
  await expect(layeredEdge(page, "2>3").locator("path")).toHaveAttribute("stroke-dasharray", "6 5");
  await expect(layeredEdge(page, "1>2")).not.toHaveAttribute("data-removed", /./);
  await expect(legendBody(page)).toContainText("Dashed edge (removed by the candidate)");

  const nodes = NODE_SET_LAYERED_FRAMES;
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await openLayered(page, LAYERED_CASES.nodeSet);
  await runToFrame(page, nodes, nodes.frames.length - 1);
  await expect(layeredNode(page, "2")).toHaveAttribute("data-state", "Solution");
  for (const id of ["1>2", "2>3", "5>2"]) {
    await expect(layeredEdge(page, id)).toHaveAttribute("data-state", "Untraveled");
  }
  await expect(layeredEdge(page, "2>3")).not.toHaveAttribute("data-removed", /./);
});

test("Layered Graph: SCC numbers the first pass's finish order and colors the components", async ({
  page,
}) => {
  const capture = SCC_LAYERED_FRAMES;
  await openLayered(page, LAYERED_CASES.scc);
  await runToFrame(page, capture, 9);
  await expect(layeredNode(page, "5")).toHaveAttribute("data-finish", "1");
  await expect(layeredNode(page, "5").locator('[data-tag="finish"]')).toHaveText("#1");
  await expect(layeredNode(page, "1")).toHaveAttribute("aria-label", /finished 5th/);
  await page.locator("#workbench-steps-next").click();
  await page.locator("#workbench-steps-next").click();
  await expect(layeredNode(page, "1")).toHaveAttribute("data-group", "0");
  await expect(layeredNode(page, "3")).toHaveAttribute("data-group", "0");
  for (let index = 12; index < capture.frames.length; index += 1) {
    await page.locator("#workbench-steps-next").click();
  }
  await expect(layeredNode(page, "4")).toHaveAttribute("data-group", "1");
  await expect(layeredNode(page, "4")).toHaveAttribute("aria-label", /component 2/);
  await expect(layeredEdge(page, "5>4")).toHaveAttribute("data-state", "Solution");
  const legend = legendBody(page);
  await expect(legend).toContainText("Component 1");
  await expect(legend).toContainText("Component 2");
  await expect(legend).toContainText("#n (finish order in the first pass)");
});

test("Layered Graph: shortest paths show distances, ∞ for the unreached, and merged parallel weights", async ({
  page,
}) => {
  const capture = SSSP_UNREACHABLE_LAYERED_FRAMES;
  await openLayered(page, LAYERED_CASES.sssp);
  await runToFrame(page, capture, capture.frames.length - 1);
  await expect(layeredNode(page, "4")).toHaveAttribute("data-dist", "8");
  await expect(layeredNode(page, "4").locator("[data-distance]")).toHaveText("d = 8");
  await expect(layeredNode(page, "5")).toHaveAttribute("data-dist", "∞");
  await expect(layeredNode(page, "5")).toHaveAttribute("data-state", "Untraveled");
  await expect(layeredNode(page, "5")).toHaveAttribute("aria-label", /not reached yet/);
  await expect(legendBody(page)).toContainText("d = n (best distance known so far");
  await expect(legendBody(page)).toContainText("Untraveled (never reached)");

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await openLayered(page, LAYERED_CASES.ssspParallel);
  // 1>2 was listed twice (5 and 2): one edge, both weights on its tag.
  await expect(page.locator(`${LAYERED}-graph [data-weight="5,2"]`)).toHaveCount(1);
  // 1>3 skips a layer, so it is bowed around 2.
  await expect(layeredEdge(page, "1>3").locator("path")).toHaveAttribute("d", /Q/);
  await expect(layeredEdge(page, "1>2").locator("path")).toHaveAttribute("d", /L/);
});

test("Layered Graph: hovering, focusing or tapping a node traces its edges and fades the rest by color", async ({
  page,
}) => {
  await openLayered(page, LAYERED_CASES.topo);
  await layeredNode(page, "3").hover();
  for (const id of ["1>3", "3>4", "3>6"]) {
    await expect(layeredEdge(page, id)).toHaveAttribute("data-traced", "trace");
  }
  await expect(layeredEdge(page, "4>5")).toHaveAttribute("data-traced", "faint");
  await expect(layeredNode(page, "6")).toHaveAttribute("data-traced", "trace");
  await expect(layeredNode(page, "5")).toHaveAttribute("data-traced", "faint");
  const faded = await layeredNode(page, "5").evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    filter: getComputedStyle(el).filter,
  }));
  expect(faded.opacity).toBe("1");
  expect(faded.filter).toContain("grayscale");

  await page.mouse.move(0, 0);
  await layeredNode(page, "4").focus();
  await expect(layeredEdge(page, "4>5")).toHaveAttribute("data-traced", "trace");
  await expect(layeredNode(page, "6")).toHaveAttribute("data-traced", "faint");
  await page.keyboard.press("Enter");
  await expect(layeredNode(page, "4")).toHaveAttribute("aria-pressed", "true");
  await expect(layeredNode(page, "4")).toHaveAttribute("aria-label", /edges to 5, from 2, 3$/);
});

test("Layered Graph: on a phone a tap traces a node, also after zooming in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openLayered(page, LAYERED_CASES.sssp);
  await page.locator("#workbench-panel-close").click();
  await expectFits(page, `${LAYERED}-svg`);
  await page.locator(`${LAYERED}-zoom-in`).click();
  await expect(page.locator(`${LAYERED}-zoom`)).toHaveAttribute("data-zoom", "1.50");
  await layeredNode(page, "3").focus();
  await layeredNode(page, "3").blur();
  await layeredNode(page, "3").click();
  await expect(layeredNode(page, "3")).toHaveAttribute("aria-pressed", "true");
  await expect(layeredEdge(page, "3>2")).toHaveAttribute("data-traced", "trace");
  await expectFits(page, `${LAYERED}-svg`);
});

for (const scheme of ["light", "dark"]) {
  for (const width of [390, 1280]) {
    test(`Layered Graph: draws at ${width} px in the ${scheme} theme without widening the page`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      await openLayered(page, LAYERED_CASES.spsp);
      const svg = page.locator(`${LAYERED}-svg`);
      await expect(svg).toBeVisible();
      expect((await svg.boundingBox()).width).toBeGreaterThan(250);
      await expectFits(page, `${LAYERED}-svg`);
      await expect(page.locator(`${LAYERED}-zoom`)).toHaveAttribute("data-zoom", "1.00");
      // The source tag follows the theme: no dark-on-dark, no light-on-white.
      const ink = await layeredNode(page, "1")
        .locator('[data-tag="source"]')
        .evaluate((el) => getComputedStyle(el).fill);
      const [r, g, b] = ink.match(/\d+/g).map(Number);
      expect((r + g + b) / 3 > 128).toBe(scheme === "dark");
    });
  }
}

for (const [width, height] of [
  [1280, 800],
  [1920, 1080],
]) {
  test(`Layered Graph: at ${width}x${height} the picture fills the pane and fits the screen`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await openLayered(page, LAYERED_CASES.topo);
    const svg = `${LAYERED}-svg`;
    await expect(page.locator(svg)).toBeVisible();
    await expect
      .poll(async () => {
        const sizes = await areaSizes(page, svg);
        return Math.abs(sizes.width - sizes.content);
      })
      .toBeLessThanOrEqual(2);
    await scrollPictureToTop(page);
    const sizes = await areaSizes(page, svg);
    expect(sizes.bottom).toBeLessThanOrEqual(sizes.viewport);
    expect(sizes.viewAspect).toBeCloseTo(sizes.width / sizes.height, 2);
    await page.locator(`${LAYERED}-zoom-in`).click();
    await page.locator(`${LAYERED}-zoom-in`).click();
    const zoomed = await areaSizes(page, svg);
    expect(zoomed.viewAspect).toBeCloseTo(zoomed.width / zoomed.height, 2);
  });
}

// --- #204: the Automaton renderer (DFA, NFA) ---------------------------------------------------

const AUTOMATON = "#workbench-source-frames-automaton";

/**
 * Each automaton capture with the problem page it is opened on and the visualizations allInfo is
 * made to name Automaton (the page's first visualization is its table, so both are, and every
 * picture request is answered with the capture).
 */
const AUTOMATON_CASES = {
  dfa: {
    problem: "DFA Acceptance",
    viz: ["DFAVisualization", "DFATableVisualization"],
    capture: DFA_AUTOMATON_FRAMES,
  },
  garbage: {
    problem: "DFA Acceptance",
    viz: ["DFAVisualization", "DFATableVisualization"],
    capture: DFA_GARBAGE_AUTOMATON_FRAMES,
  },
  abc: {
    problem: "DFA Acceptance",
    viz: ["DFAVisualization", "DFATableVisualization"],
    capture: DFA_ABC_GARBAGE_AUTOMATON_FRAMES,
  },
  subset: {
    problem: "NFA Acceptance",
    viz: ["NFAVisualization", "NFATableVisualization"],
    capture: NFA_SUBSET_AUTOMATON_FRAMES,
  },
  backtrack: {
    problem: "NFA Acceptance",
    viz: ["NFAVisualization", "NFATableVisualization"],
    capture: NFA_BACKTRACK_REJECTED_AUTOMATON_FRAMES,
  },
  nfaDefault: {
    problem: "NFA Acceptance",
    viz: ["NFAVisualization", "NFATableVisualization"],
    capture: NFA_DEFAULT_AUTOMATON_FRAMES,
  },
};

async function openAutomaton(page, { problem, viz, capture }) {
  await setPictureTypes(page, Object.fromEntries(viz.map((name) => [name, "Automaton"])));
  await openPicture(page, problem, capture);
  await expect(page.locator(`${AUTOMATON}-graph`)).toBeVisible();
}

const automatonState = (page, id) => page.locator(`${AUTOMATON}-graph [data-node-id="${id}"]`);
const automatonArrow = (page, id) => page.locator(`${AUTOMATON}-graph [data-edge-id="${id}"]`);
const tape = (page) => page.locator(`${AUTOMATON}-tape`);

/** Frame `frame`'s states, checked piece by piece against the picture (absent = Background). */
async function expectAutomatonStates(page, payload, frame) {
  const ids = payload.states.map((state) => state.id);
  if (payload.garbage) ids.push(payload.garbage.id);
  for (const id of ids) {
    await expect(automatonState(page, id)).toHaveAttribute(
      "data-state",
      frame.nodes[id]?.state ?? "Background",
    );
    if (frame.active.includes(id)) {
      await expect(automatonState(page, id)).toHaveAttribute("data-active", "true");
    } else {
      await expect(automatonState(page, id)).not.toHaveAttribute("data-active", /./);
    }
  }
  for (const transition of payload.transitions) {
    await expect(automatonArrow(page, transition.id)).toHaveAttribute(
      "data-state",
      frame.edges[transition.id]?.state ?? "Background",
    );
  }
  await expect(tape(page)).toHaveAttribute("data-position", String(frame.position));
}

for (const [key, testCase] of Object.entries(AUTOMATON_CASES)) {
  test(`Automaton: the ${key} capture draws every state, arrow and step`, async ({ page }) => {
    const { capture } = testCase;
    const { payload } = capture;
    await openAutomaton(page, testCase);
    const graph = page.locator(`${AUTOMATON}-graph`);
    await expect(graph).toHaveAttribute("data-automaton-kind", payload.kind);
    // Every state is focusable, Garbage too (#250: the arrow keys move it).
    await expect(graph.locator("[data-focusable]")).toHaveCount(
      payload.states.length + (payload.garbage ? 1 : 0),
    );
    await expect(graph.locator("[data-edge-id]")).toHaveCount(payload.transitions.length);
    await expect(graph.locator("[data-garbage]")).toHaveCount(payload.garbage ? 1 : 0);
    // Accept states get a double ring, the start state an entry arrow.
    await expect(graph.locator("[data-accept-ring]")).toHaveCount(payload.accepting.length);
    await expect(graph.locator("[data-start-arrow]")).toHaveCount(1);
    await expect(automatonState(page, payload.start)).toHaveAttribute("data-start", "true");
    // ε-moves are dashed; every arrow has an arrowhead and its symbols.
    await expect(graph.locator("[data-epsilon]")).toHaveCount(
      payload.transitions.filter((transition) => transition.epsilon).length,
    );
    await expect(graph.locator("[data-edge-id] polygon")).toHaveCount(payload.transitions.length);
    await expect(graph.locator("[data-arrow-label]")).toHaveCount(payload.transitions.length);
    // One tape cell per input symbol, and the end cell.
    await expect(tape(page).locator("[data-tape-cell]")).toHaveCount(payload.input.length);
    await expect(tape(page).locator("[data-tape-end]")).toHaveCount(1);
    // Every state says what it is, and can be reached by keyboard.
    for (const piece of await graph.locator("[data-focusable]:not([data-garbage])").all()) {
      await expect(piece).toHaveAttribute("aria-label", /^State \S+, .*(on .* to |no moves out)/);
      await expect(piece).toHaveAttribute("tabindex", "0");
    }
    // The step controls walk every frame's states, active states and read position.
    await runToFrame(page, capture, 0);
    await expectAutomatonStates(page, payload, capture.frames[0]);
    for (let index = 1; index < capture.frames.length; index += 1) {
      await page.locator("#workbench-steps-next").click();
      await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
      await expectAutomatonStates(page, payload, capture.frames[index]);
    }
    const last = capture.frames.at(-1);
    await expect(page.locator(`${CAPTION}-verdict`)).toHaveText(
      last.ok ? "Verdict: yes" : "Verdict: no",
    );
    await expect(tape(page).locator("[data-tape-end]")).toHaveAttribute(
      "data-verdict",
      last.ok ? "accept" : "reject",
    );
    // A run that found nothing never turns anything green.
    if (!last.ok) {
      await expect(graph.locator('[data-state="Solution"]')).toHaveCount(0);
    }
  });
}

test("Automaton: before Run the picture is the plain machine, and step 1 keeps it in place", async ({
  page,
}) => {
  const capture = NFA_SUBSET_AUTOMATON_FRAMES;
  await openAutomaton(page, AUTOMATON_CASES.subset);
  const graph = page.locator(`${AUTOMATON}-graph`);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(graph.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(graph.locator("[data-active]")).toHaveCount(0);
  await expect(page.locator(CAPTION)).toHaveCount(0);
  // No read position and no verdict: nothing has run.
  await expect(tape(page)).not.toHaveAttribute("data-position", /./);
  await expect(tape(page).locator("[data-head], [data-read], [data-just]")).toHaveCount(0);
  await expect(tape(page).locator("[data-tape-end]")).toHaveText("end");
  // The path picker only follows a run's steps, so it shows once there is one.
  await expect(page.locator(`${AUTOMATON}-view`)).toHaveCount(0);
  // The machine's own marks are there: the entry arrow, the double ring and the dashed ε-move.
  await expect(graph.locator("[data-start-arrow]")).toHaveCount(1);
  await expect(graph.locator("[data-accept-ring]")).toHaveCount(1);
  await expect(automatonArrow(page, "q:0>q:1").locator("path")).toHaveAttribute(
    "stroke-dasharray",
    "5 4",
  );
  await expect(legendBody(page)).toContainText("Entry arrow (the start state)");
  await expect(legendBody(page)).toContainText("Double ring (an accept state)");
  await expect(legendBody(page)).toContainText("Dashed arrow (an ε-move");
  await expect(legendBody(page)).not.toContainText("Highlighted");

  const before = await nodeCentres(page, `${AUTOMATON}-graph`);
  await runToFrame(page, capture, 0);
  await expect(automatonState(page, "q:0")).toHaveAttribute("data-state", "ElementHighlight");
  expect(await nodeCentres(page, `${AUTOMATON}-graph`)).toEqual(before);
  // The tape's head is on the first symbol.
  await expect(tape(page).locator('[data-tape-cell="0"]')).toHaveAttribute("data-head", "true");
});

test("Automaton: a DFA's missing moves lead to a separate red Garbage state the run falls into", async ({
  page,
}) => {
  const capture = DFA_GARBAGE_AUTOMATON_FRAMES;
  await openAutomaton(page, AUTOMATON_CASES.garbage);
  const garbage = page.locator(`${AUTOMATON}-graph [data-garbage]`);
  await expect(garbage).toHaveAttribute("data-node-id", "garbage");
  await expect(garbage).toContainText("Garbage");
  await expect(garbage).toHaveAttribute("aria-label", /missing moves: 1 on b; 2 on a; 3 on b/);
  await expect(automatonState(page, "q:3")).toHaveAttribute("aria-label", /no move on b/);
  // Drawn in red even before Run (a thin dashed red outline and red text on the neutral
  // fill), with no arrow into it and no fall.
  const body = garbage.locator("[data-body]");
  const fallArrow = page.locator(`${AUTOMATON}-graph [data-fall-arrow]`);
  const look = () =>
    body.evaluate((el) => {
      const style = getComputedStyle(el);
      return { fill: style.fill, stroke: style.stroke, width: el.getAttribute("stroke-width") };
    });
  await expect(garbage).toHaveAttribute("data-look", "idle");
  await expect(body).toHaveAttribute("stroke-dasharray", "5 3");
  const idle = await look();
  for (const transition of capture.payload.transitions) {
    expect(transition.b).not.toBe("garbage");
  }
  await expect(fallArrow).toHaveCount(0);
  await expect(legendBody(page)).toContainText("Garbage (where every missing move leads");

  // Frame 3: still in 3, Garbage idle, and 3 is ringed as the current state.
  await runToFrame(page, capture, 2);
  await expect(garbage).toHaveAttribute("data-look", "idle");
  await expect(fallArrow).toHaveCount(0);
  await expect(automatonState(page, "q:3").locator("[data-current]")).toHaveCount(1);
  await expect(garbage.locator("[data-current]")).toHaveCount(0);

  // Frame 4: 3 has no move on b, so the run falls into Garbage. Garbage takes the Rejected
  // style and the current-state ring; a dashed red arrow labelled b runs from 3 into it, 3 is
  // marked as where it fell from, and the tape marks the b it got stuck on.
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[3].caption);
  await expect(garbage).toHaveAttribute("data-state", "Rejected");
  await expect(garbage).toHaveAttribute("data-active", "true");
  await expect(garbage).toHaveAttribute("data-look", "entered");
  await expect(garbage.locator("[data-current]")).toHaveCount(1);
  await expect(body).not.toHaveAttribute("stroke-dasharray", /./);
  const entered = await look();
  expect(entered.fill).not.toBe(idle.fill);
  expect(entered.stroke).toBe(idle.stroke);
  expect(Number(entered.width)).toBeGreaterThan(Number(idle.width));
  await expect(fallArrow).toHaveCount(1);
  await expect(fallArrow).toHaveAttribute("data-from", "q:3");
  await expect(fallArrow.locator('[data-arrow-label="b"]')).toHaveCount(1);
  await expect(fallArrow.locator("path")).toHaveAttribute("stroke-dasharray", "6 4");
  await expect(automatonState(page, "q:3")).toHaveAttribute("data-fell-from", "true");
  await expect(automatonState(page, "q:3")).toHaveAttribute("aria-label", /fell into Garbage on b/);
  await expect(automatonState(page, "q:3").locator("[data-current]")).toHaveCount(0);
  await expect(garbage).toHaveAttribute("aria-label", /the machine is here, fell in from 3 on b/);
  await expect(tape(page).locator('[data-tape-cell="2"]')).toHaveAttribute("data-stuck", "true");
  await expect(legendBody(page)).toContainText("Dashed red arrow (the missing move that fell");
  // The fall draws nothing new into the layout: every state stays where it was.
  const positions = await nodeCentres(page, `${AUTOMATON}-graph`);

  // Done: still in Garbage, so the fall stays on screen.
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: no");
  await expect(tape(page).locator("[data-tape-end]")).toHaveText("reject");
  await expect(fallArrow).toHaveCount(1);
  await expect(tape(page).locator('[data-tape-cell="2"]')).toHaveAttribute("data-stuck", "true");
  expect(await nodeCentres(page, `${AUTOMATON}-graph`)).toEqual(positions);

  // Back to the start: Garbage is idle again and the fall is gone.
  await page.locator("#workbench-steps-previous").click();
  await page.locator("#workbench-steps-previous").click();
  await expect(garbage).toHaveAttribute("data-look", "idle");
  await expect(fallArrow).toHaveCount(0);
  await page.locator("#workbench-steps-next").click();
  await page.locator("#workbench-steps-next").click();
  // Hovering a state with a missing move traces Garbage too; one without fades it.
  await automatonState(page, "q:2").hover();
  await expect(garbage).toHaveAttribute("data-traced", "trace");
  await expect(automatonArrow(page, "q:2>q:3")).toHaveAttribute("data-traced", "trace");
  await expect(automatonArrow(page, "q:1>q:2")).toHaveAttribute("data-traced", "faint");
});

test("Automaton: a symbol outside the alphabet is a missing move that falls into Garbage", async ({
  page,
}) => {
  // The DFA default on abc: the machine is complete, but c is not in the alphabet, so 2 has no
  // move on it. The payload's Garbage lists only that move; the alphabet stays a, b.
  const capture = DFA_ABC_GARBAGE_AUTOMATON_FRAMES;
  expect(capture.payload.alphabet).toEqual(["a", "b"]);
  expect(capture.payload.garbage.missing).toEqual([{ state: "q:2", symbol: "c" }]);
  await openAutomaton(page, AUTOMATON_CASES.abc);
  const garbage = page.locator(`${AUTOMATON}-graph [data-garbage]`);
  const fallArrow = page.locator(`${AUTOMATON}-graph [data-fall-arrow]`);
  await expect(garbage).toHaveAttribute("aria-label", /missing moves: 2 on c/);
  await expect(garbage).toHaveAttribute("data-look", "idle");

  // Frame 3: b read, still in 2; nothing has fallen yet.
  await runToFrame(page, capture, 2);
  await expect(fallArrow).toHaveCount(0);
  await expect(automatonState(page, "q:2").locator("[data-current]")).toHaveCount(1);

  // Frame 4: c, so the run falls from 2 into Garbage along a dashed red arrow labelled c, and
  // the tape marks the c it got stuck on as outside the alphabet. 2 is not left Rejected.
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[3].caption);
  await expect(garbage).toHaveAttribute("data-state", "Rejected");
  await expect(garbage).toHaveAttribute("data-active", "true");
  await expect(garbage).toHaveAttribute("data-look", "entered");
  await expect(fallArrow).toHaveCount(1);
  await expect(fallArrow).toHaveAttribute("data-from", "q:2");
  await expect(fallArrow.locator('[data-arrow-label="c"]')).toHaveCount(1);
  await expect(fallArrow.locator("path")).toHaveAttribute("stroke-dasharray", "6 4");
  // Garbage sits below 2 with 3 in between, so the arrow bends around 3, and its c is not hidden
  // behind any state.
  await expect(fallArrow).toHaveAttribute("data-bent", "true");
  const labelBox = await fallArrow.locator('[data-arrow-label="c"]').boundingBox();
  for (const id of ["q:1", "q:2", "q:3"]) {
    const box = await automatonState(page, id).boundingBox();
    const overlaps =
      labelBox.x < box.x + box.width &&
      box.x < labelBox.x + labelBox.width &&
      labelBox.y < box.y + box.height &&
      box.y < labelBox.y + labelBox.height;
    expect(overlaps, `the fall's label overlaps ${id}`).toBe(false);
  }
  await expect(automatonState(page, "q:2")).toHaveAttribute("data-fell-from", "true");
  await expect(automatonState(page, "q:2")).toHaveAttribute(
    "aria-label",
    /fell into Garbage on c, which is not in the alphabet/,
  );
  await expect(automatonState(page, "q:2")).not.toHaveAttribute("data-state", "Rejected");
  const cell = tape(page).locator('[data-tape-cell="2"]');
  await expect(cell).toHaveText("c");
  await expect(cell).toHaveAttribute("data-stuck", "true");
  await expect(cell).toHaveAttribute("data-outside-alphabet", "true");
  await expect(tape(page)).toHaveAttribute(
    "aria-label",
    /c: it is not in the alphabet, so no move/,
  );

  // Done: rejected in Garbage, the fall still on screen.
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: no");
  await expect(tape(page).locator("[data-tape-end]")).toHaveText("reject");
  await expect(garbage).toHaveAttribute("data-state", "Rejected");
  await expect(fallArrow).toHaveCount(1);
  await expect(cell).toHaveAttribute("data-stuck", "true");
});

test("Automaton: a symbol outside the alphabet falls into Garbage even where missing does not list it", async ({
  page,
}) => {
  // A payload whose Garbage does not list the move the run misses: the symbol is outside the
  // alphabet, so no state has a move on it, and the fall is still drawn from 2 on c.
  const base = DFA_ABC_GARBAGE_AUTOMATON_FRAMES;
  const capture = {
    ...base,
    payload: { ...base.payload, garbage: { ...base.payload.garbage, missing: [] } },
  };
  await openAutomaton(page, { ...AUTOMATON_CASES.abc, capture });
  await runToFrame(page, capture, 3);
  const fallArrow = page.locator(`${AUTOMATON}-graph [data-fall-arrow]`);
  await expect(fallArrow).toHaveCount(1);
  await expect(fallArrow).toHaveAttribute("data-from", "q:2");
  await expect(fallArrow.locator('[data-arrow-label="c"]')).toHaveCount(1);
  await expect(tape(page).locator('[data-tape-cell="2"]')).toHaveAttribute(
    "data-outside-alphabet",
    "true",
  );
});

test("Automaton: an NFA's steps show every active state at once by default", async ({ page }) => {
  const capture = NFA_SUBSET_AUTOMATON_FRAMES;
  await openAutomaton(page, AUTOMATON_CASES.subset);
  await runToFrame(page, capture, 1);
  await expect(page.locator(`${AUTOMATON}-graph`)).toHaveAttribute("data-run-view", "all");
  await expect(page.locator(`${AUTOMATON}-view-all`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(`${AUTOMATON}-graph [data-active]`)).toHaveCount(3);
  for (const id of ["q:0", "q:1", "q:2"]) {
    await expect(automatonState(page, id)).toHaveAttribute("data-state", "ElementHighlight");
  }
  // The symbol just read is marked, and the head sits on the next one.
  await expect(tape(page).locator('[data-tape-cell="0"]')).toHaveAttribute("data-just", "true");
  await expect(tape(page).locator('[data-tape-cell="1"]')).toHaveAttribute("data-head", "true");
  await expect(tape(page)).toHaveAttribute(
    "aria-label",
    /1 symbol read; the head is on the 2nd, a/,
  );
  await expect(page.locator(`${AUTOMATON}-path`)).toHaveCount(0);
});

test("Automaton: One path follows a single run picked from the dropdown, and All branches goes back", async ({
  page,
}) => {
  const capture = NFA_SUBSET_AUTOMATON_FRAMES;
  const { paths } = capture.payload;
  await openAutomaton(page, AUTOMATON_CASES.subset);
  await runToFrame(page, capture, 2);

  await page.locator(`${AUTOMATON}-view-one`).click();
  const picker = page.locator(`${AUTOMATON}-path`);
  await expect(picker).toBeVisible();
  await expect(picker.locator("option")).toHaveText(paths.map((path) => path.label));
  await expect(picker).toHaveValue(paths[0].id);
  await expect(page.locator(`${AUTOMATON}-graph`)).toHaveAttribute("data-run-view", paths[0].id);
  // The steps switch to the path's own frames, opening on its last (the path's result).
  const position = page.locator("#workbench-steps-position");
  const ends = `Step ${paths[0].frames.length} of ${paths[0].frames.length}`;
  await expect(position).toHaveText(ends);
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(paths[0].frames.at(-1).caption);
  await toFirstStep(page);
  for (const [index, frame] of paths[0].frames.entries()) {
    if (index > 0) await page.locator("#workbench-steps-next").click();
    await expect(page.locator(`${CAPTION}-text`)).toHaveText(frame.caption);
    await expectAutomatonStates(page, capture.payload, frame);
  }
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: yes");
  await expect(page.locator(`${AUTOMATON}-graph [data-active]`)).toHaveCount(1);

  // A path that dies: its last state is Rejected and ringed as where the run is, the states it
  // never reached Untraveled, and the tape marks the symbol it had no move for.
  const dies = paths.find((path) => path.outcome === "dies");
  await picker.selectOption(dies.id);
  await expect(position).toHaveText(`Step ${dies.frames.length} of ${dies.frames.length}`);
  const dead = dies.frames.at(-1);
  await expectAutomatonStates(page, capture.payload, dead);
  await expect(automatonState(page, dead.active[0]).locator("[data-current]")).toHaveCount(1);
  await expect(tape(page).locator(`[data-tape-cell="${dead.position}"]`)).toHaveAttribute(
    "data-stuck",
    "true",
  );
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: no");
  await expect(page.locator(`${AUTOMATON}-graph [data-state="Solution"]`)).toHaveCount(0);
  await expect(legendBody(page)).toContainText("Untraveled (never reached)");

  await page.locator(`${AUTOMATON}-view-all`).click();
  await expect(picker).toHaveCount(0);
  await expect(position).toHaveText(`Step ${capture.frames.length} of ${capture.frames.length}`);
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames.at(-1).caption);
});

test("Automaton: a rejected run with no state left says so, and marks the active states while it runs", async ({
  page,
}) => {
  const capture = NFA_BACKTRACK_REJECTED_AUTOMATON_FRAMES;
  await openAutomaton(page, AUTOMATON_CASES.backtrack);
  await runToFrame(page, capture, 0);
  await expect(page.locator(`${AUTOMATON}-graph [data-current]`)).toHaveCount(
    capture.frames[0].active.length,
  );
  await expect(page.locator(`${AUTOMATON}-dead`)).toHaveCount(0);
  for (let index = 1; index < capture.frames.length; index += 1) {
    await page.locator("#workbench-steps-next").click();
  }
  // The Done step has no active state: nothing is ringed, so a line says why.
  expect(capture.frames.at(-1).active).toEqual([]);
  await expect(page.locator(`${AUTOMATON}-graph [data-current]`)).toHaveCount(0);
  await expect(page.locator(`${AUTOMATON}-dead`)).toHaveText(
    "No state is left: every branch of the run died or ended outside an accept state.",
  );
  await expect(tape(page).locator("[data-tape-end]")).toHaveText("reject");
});

test("Automaton: a DFA has one run, so it offers no path picker", async ({ page }) => {
  const capture = DFA_AUTOMATON_FRAMES;
  await openAutomaton(page, AUTOMATON_CASES.dfa);
  await runToFrame(page, capture, 0);
  await expect(page.locator(`${AUTOMATON}-view`)).toHaveCount(0);
  await expect(page.locator(`${AUTOMATON}-graph`)).not.toHaveAttribute("data-run-view", /./);
});

test("Automaton: hovering, focusing or tapping a state traces its moves and fades the rest by color", async ({
  page,
}) => {
  await openAutomaton(page, AUTOMATON_CASES.subset);
  await automatonState(page, "q:0").hover();
  for (const id of ["q:0>q:1", "q:0>q:0"]) {
    await expect(automatonArrow(page, id)).toHaveAttribute("data-traced", "trace");
  }
  await expect(automatonArrow(page, "q:1>q:2")).toHaveAttribute("data-traced", "faint");
  await expect(automatonState(page, "q:1")).toHaveAttribute("data-traced", "trace");
  await expect(automatonState(page, "q:3")).toHaveAttribute("data-traced", "faint");
  const faded = await automatonState(page, "q:3").evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    filter: getComputedStyle(el).filter,
  }));
  expect(faded.opacity).toBe("1");
  expect(faded.filter).toContain("grayscale");

  await page.mouse.move(0, 0);
  await automatonState(page, "q:1").focus();
  await expect(automatonArrow(page, "q:1>q:2")).toHaveAttribute("data-traced", "trace");
  await expect(automatonArrow(page, "q:0>q:1")).toHaveAttribute("data-traced", "faint");
  await page.keyboard.press("Enter");
  await expect(automatonState(page, "q:1")).toHaveAttribute("aria-pressed", "true");
  await expect(automatonState(page, "q:1")).toHaveAttribute(
    "aria-label",
    "State 1, on a to 2, from 0 on ε",
  );
  await expect(automatonState(page, "q:0")).toHaveAttribute(
    "aria-label",
    "State 0, start, on ε to 1; on a, b to 0",
  );
  await expect(automatonState(page, "q:3")).toHaveAttribute(
    "aria-label",
    "State 3, accepting, no moves out, from 2 on b",
  );
});

test("Automaton: on a phone a tap traces a state, also after zooming in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openAutomaton(page, AUTOMATON_CASES.nfaDefault);
  await page.locator("#workbench-panel-close").click();
  await expectFits(page, `${AUTOMATON}-svg`);
  await page.locator(`${AUTOMATON}-zoom-in`).click();
  await expect(page.locator(`${AUTOMATON}-zoom`)).toHaveAttribute("data-zoom", "1.50");
  await automatonState(page, "q:3").focus();
  await automatonState(page, "q:3").blur();
  await automatonState(page, "q:3").click();
  await expect(automatonState(page, "q:3")).toHaveAttribute("aria-pressed", "true");
  await expect(automatonArrow(page, "q:3>q:2")).toHaveAttribute("data-traced", "trace");
  await expectFits(page, `${AUTOMATON}-svg`);
});

for (const scheme of ["light", "dark"]) {
  for (const width of [390, 1280]) {
    test(`Automaton: draws at ${width} px in the ${scheme} theme without widening the page`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      await openAutomaton(page, AUTOMATON_CASES.garbage);
      const svg = page.locator(`${AUTOMATON}-svg`);
      await expect(svg).toBeVisible();
      expect((await svg.boundingBox()).width).toBeGreaterThan(250);
      await expectFits(page, `${AUTOMATON}-svg`);
      const tapeBox = await tape(page).boundingBox();
      expect(tapeBox.x + tapeBox.width).toBeLessThanOrEqual(width);
      await expect(page.locator(`${AUTOMATON}-zoom`)).toHaveAttribute("data-zoom", "1.00");
      // The entry arrow follows the theme: no dark-on-dark, no light-on-white.
      const ink = await page
        .locator(`${AUTOMATON}-graph [data-start-arrow] polygon`)
        .evaluate((el) => getComputedStyle(el).fill);
      const [r, g, b] = ink.match(/\d+/g).map(Number);
      expect((r + g + b) / 3 > 128).toBe(scheme === "dark");
    });
  }
}

for (const [width, height] of [
  [1280, 800],
  [1920, 1080],
]) {
  test(`Automaton: at ${width}x${height} the picture fills the pane and fits the screen`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await openAutomaton(page, AUTOMATON_CASES.nfaDefault);
    const svg = `${AUTOMATON}-svg`;
    await expect(page.locator(svg)).toBeVisible();
    await expect
      .poll(async () => {
        const sizes = await areaSizes(page, svg);
        return Math.abs(sizes.width - sizes.content);
      })
      .toBeLessThanOrEqual(2);
    await scrollPictureToTop(page);
    const sizes = await areaSizes(page, svg);
    expect(sizes.bottom).toBeLessThanOrEqual(sizes.viewport);
    expect(sizes.viewAspect).toBeCloseTo(sizes.width / sizes.height, 2);
  });
}

// --- #206: the Flow Network renderer (Minimum S-T Cut) -----------------------------------------

const FLOW = "#workbench-source-frames-flownetwork";

/** Each flow capture, opened on the Minimum S-T Cut page with its pictures answered by it. */
const FLOW_CASES = {
  default: MIN_CUT_FLOW_FRAMES,
  backward: MIN_CUT_BACKWARD_FLOW_FRAMES,
  bowed: MIN_CUT_BOWED_FLOW_FRAMES,
  parallel: MIN_CUT_PARALLEL_FLOW_FRAMES,
  noPath: MIN_CUT_NO_PATH_FLOW_FRAMES,
};

async function openFlow(page, capture) {
  await setPictureTypes(page, { MinSTCutVisualization: "FlowNetwork" });
  await openPicture(page, "Minimum S-T Cut", capture);
  await expect(page.locator(`${FLOW}-graph`)).toBeVisible();
}

const flowNode = (page, id) => page.locator(`${FLOW}-graph [data-node-id="${id}"]`);
const flowEdge = (page, id) => page.locator(`${FLOW}-graph [data-edge-id="${id}"]`);
const flowSummary = (page) => page.locator(`${FLOW}-summary`);

/** Each node's drawn centre x, by id, grouped into columns left to right. */
function flowColumns(page) {
  return page.locator(`${FLOW}-graph [data-node-id]`).evaluateAll((nodes) => {
    const columns = new Map();
    for (const node of nodes) {
      const box = node.querySelector("[data-body]").getBBox();
      const x = Math.round(box.x + box.width / 2);
      if (!columns.has(x)) columns.set(x, []);
      columns.get(x).push(node.getAttribute("data-node-id"));
    }
    return [...columns.entries()].sort((a, b) => a[0] - b[0]).map(([, ids]) => ids.sort());
  });
}

/** Frame `index`'s states, flows and sides, checked piece by piece against the picture. */
async function expectFlowFrame(page, capture, index) {
  const frame = capture.frames[index];
  for (const node of capture.payload.nodes) {
    await expect(flowNode(page, node.id)).toHaveAttribute(
      "data-state",
      frame.nodes[node.id]?.state ?? "Background",
    );
    if (frame.groups) {
      await expect(flowNode(page, node.id)).toHaveAttribute(
        "data-group",
        String(frame.groups[node.id]),
      );
    } else {
      await expect(flowNode(page, node.id)).not.toHaveAttribute("data-group", /./);
    }
  }
  for (const edge of capture.payload.edges) {
    const drawn = flowEdge(page, edge.id);
    await expect(drawn).toHaveAttribute("data-state", frame.edges[edge.id]?.state ?? "Background");
    await expect(drawn).toHaveAttribute("data-flow", String(frame.flow[edge.id]));
    const text = `${frame.flow[edge.id]}/${edge.capacity}${edge.label ? ` (${edge.label})` : ""}`;
    await expect(
      page.locator(`${FLOW}-graph [data-flow-label][data-for="${edge.id}"]`),
    ).toHaveAttribute("data-flow-label", text);
  }
  await expect(flowSummary(page)).toHaveAttribute("data-value", String(frame.value));
  await expect(flowSummary(page)).toContainText(`Flow value: ${frame.value}.`);
}

for (const [key, capture] of Object.entries(FLOW_CASES)) {
  test(`Flow Network: the ${key} capture draws every node in its column, every edge and every step`, async ({
    page,
  }) => {
    const { payload } = capture;
    await openFlow(page, capture);
    const graph = page.locator(`${FLOW}-graph`);
    await expect(graph.locator("[data-node-id]")).toHaveCount(payload.nodes.length);
    await expect(graph.locator("[data-edge-id]")).toHaveCount(payload.edges.length);
    await expect(graph.locator("[data-edge-id] polygon")).toHaveCount(payload.edges.length);
    // One column per layer, the source alone on the left and the sink alone on the right.
    const columns = await flowColumns(page);
    expect(columns).toEqual(payload.layers.map((ids) => [...ids].sort()));
    expect(columns[0]).toEqual([payload.source]);
    expect(columns.at(-1)).toEqual([payload.sink]);
    await expect(flowNode(page, payload.source).locator('[data-tag="source"]')).toHaveText(
      "source",
    );
    await expect(flowNode(page, payload.sink).locator('[data-tag="sink"]')).toHaveText("sink");
    // Before Run each edge shows its capacity (or the capacities it merges).
    for (const edge of payload.edges) {
      await expect(
        graph.locator(`[data-flow-label="${edge.label ?? String(edge.capacity)}"]`).first(),
      ).toBeVisible();
    }
    for (const piece of await graph.locator("[data-focusable]").all()) {
      await expect(piece).toHaveAttribute("aria-label", /^Node \S+, .*(edges to|no edges out)/);
      await expect(piece).toHaveAttribute("tabindex", "0");
    }
    // The step controls walk every frame's states, flows and, at the end, the cut's sides.
    await runToFrame(page, capture, 0);
    await expectFlowFrame(page, capture, 0);
    for (let index = 1; index < capture.frames.length; index += 1) {
      await page.locator("#workbench-steps-next").click();
      await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
      await expectFlowFrame(page, capture, index);
    }
    const last = capture.frames.at(-1);
    await expect(page.locator(`${CAPTION}-verdict`)).toHaveText(
      last.ok ? "Verdict: yes" : "Verdict: no",
    );
    await expect(graph.locator("[data-cut]")).toHaveCount(last.cut?.length ?? 0);
  });
}

test("Flow Network: before Run the picture is the plain network, and step 1 keeps it in place", async ({
  page,
}) => {
  const capture = MIN_CUT_FLOW_FRAMES;
  await openFlow(page, capture);
  const graph = page.locator(`${FLOW}-graph`);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(graph.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(graph.locator("[data-group]")).toHaveCount(0);
  await expect(graph.locator("[data-flow]")).toHaveCount(0);
  await expect(graph.locator("[data-back-arc]")).toHaveCount(0);
  await expect(flowSummary(page)).toHaveCount(0);
  await expect(page.locator(CAPTION)).toHaveCount(0);
  await expect(page.locator(`${FLOW}-residual`)).toHaveCount(0);
  // The capacities are the instance's, so they show; no flow yet.
  await expect(graph.locator('[data-flow-label="10"]')).toHaveCount(1);
  await expect(graph.locator('[data-flow-label*="/"]')).toHaveCount(0);
  await expect(legendBody(page)).toContainText("c (an edge's capacity)");
  await expect(legendBody(page)).not.toContainText("S side");

  const before = await nodeCentres(page, `${FLOW}-graph`);
  await runToFrame(page, capture, 0);
  await expect(graph.locator('[data-flow-label="0/10"]')).toHaveCount(1);
  expect(await nodeCentres(page, `${FLOW}-graph`)).toEqual(before);
  // The answer's side colors don't move anything either.
  for (let index = 1; index < capture.frames.length; index += 1) {
    await page.locator("#workbench-steps-next").click();
  }
  await expect(flowNode(page, "1")).toHaveAttribute("data-group", "0");
  expect(await nodeCentres(page, `${FLOW}-graph`)).toEqual(before);
});

test("Flow Network: each step highlights its augmenting path, full edges are Covered and get thicker", async ({
  page,
}) => {
  const capture = MIN_CUT_FLOW_FRAMES;
  await openFlow(page, capture);
  await runToFrame(page, capture, 2);
  for (const id of ["1>3", "3>4"]) {
    await expect(flowEdge(page, id)).toHaveAttribute("data-state", "ElementHighlight");
  }
  await expect(flowEdge(page, "2>4")).toHaveAttribute("data-state", "Covered");
  await expect(flowNode(page, "3")).toHaveAttribute("data-state", "ElementHighlight");
  const width = (id) =>
    flowEdge(page, id)
      .locator("path")
      .evaluate((el) => Number(el.getAttribute("stroke-width")));
  // 1>2 carries 3 of 10, 2>4 is full: the full one is drawn thicker.
  expect(await width("2>4")).toBeGreaterThan(await width("1>2"));
  await expect(legendBody(page)).toContainText("f/c (the flow an edge carries / its capacity");
  await expect(legendBody(page)).toContainText("Covered (rule met)");
});

test("Flow Network: the answer colors the S and T sides, draws the cut and adds it up", async ({
  page,
}) => {
  const capture = MIN_CUT_FLOW_FRAMES;
  await openFlow(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  for (const id of ["1>3", "2>4"]) {
    await expect(flowEdge(page, id)).toHaveAttribute("data-state", "Solution");
    await expect(flowEdge(page, id)).toHaveAttribute("data-cut", "true");
  }
  await expect(flowNode(page, "1")).toHaveAttribute("aria-label", /S side/);
  await expect(flowNode(page, "4")).toHaveAttribute("aria-label", /T side/);
  const fill = (id) =>
    flowNode(page, id)
      .locator("[data-body]")
      .evaluate((el) => getComputedStyle(el).fill);
  expect(await fill("1")).toBe(await fill("2"));
  expect(await fill("1")).not.toBe(await fill("3"));
  await expect(flowSummary(page)).toHaveText(
    "Flow value: 5. S = {1, 2}, T = {3, 4}. Cut: 1→3, 2→4, capacity 5, equal to the maximum flow.",
  );
  await expect(legendBody(page)).toContainText("S side");
  await expect(legendBody(page)).toContainText("T side");
  await expect(legendBody(page)).toContainText("Solution (answer)");
});

test("Flow Network: a path that takes flow back draws a dashed back arc, and the residual switch shows them all", async ({
  page,
}) => {
  const capture = MIN_CUT_BACKWARD_FLOW_FRAMES;
  await openFlow(page, capture);
  await runToFrame(page, capture, 2);
  const back = page.locator(`${FLOW}-graph [data-back-arc]`);
  await expect(back).toHaveCount(1);
  await expect(back).toHaveAttribute("data-back-arc", "a>b");
  await expect(back).toHaveAttribute("data-used", "true");
  await expect(back.locator("path")).toHaveAttribute("stroke-dasharray", "5 4");
  await expect(back.locator('[data-back-label="↶1"]')).toHaveCount(1);
  await expect(legendBody(page)).toContainText("Dashed back arc (the path takes back flow");

  // The residual view: a back arc on every edge that carries flow.
  await page.locator(`${FLOW}-residual-on`).click();
  const carrying = Object.values(capture.frames[2].flow).filter((units) => units > 0).length;
  await expect(back).toHaveCount(carrying + 1);
  await page.locator(`${FLOW}-residual-off`).click();
  await expect(back).toHaveCount(1);
  await page.locator("#workbench-steps-next").click();
  await expect(back).toHaveCount(0);
});

test("Flow Network: parallel edges show every listed capacity, and an edge from T back to S ends Untraveled", async ({
  page,
}) => {
  const capture = MIN_CUT_PARALLEL_FLOW_FRAMES;
  await openFlow(page, capture);
  await expect(page.locator(`${FLOW}-graph [data-flow-label="2,5"]`)).toHaveCount(1);
  await runToFrame(page, capture, capture.frames.length - 1);
  await expect(page.locator(`${FLOW}-graph [data-flow-label="4/7 (2,5)"]`)).toHaveCount(1);
  await expect(flowEdge(page, "3>1")).toHaveAttribute("data-state", "Untraveled");
  await expect(legendBody(page)).toContainText("Untraveled (never reached)");
});

test("Flow Network: an edge that would cross a node is bowed around it, on the side that clears it", async ({
  page,
}) => {
  await openFlow(page, MIN_CUT_BOWED_FLOW_FRAMES);
  const clear = await page.locator(`${FLOW}-svg`).evaluate((svg) => {
    const path = svg.querySelector('[data-edge-id="b>t"] path');
    const c = svg.querySelector('[data-node-id="c"] [data-body]').getBBox();
    const centre = { x: c.x + c.width / 2, y: c.y + c.height / 2 };
    let nearest = Number.POSITIVE_INFINITY;
    const length = path.getTotalLength();
    for (let step = 0; step <= 50; step += 1) {
      const point = path.getPointAtLength((length * step) / 50);
      nearest = Math.min(nearest, Math.hypot(point.x - centre.x, point.y - centre.y));
    }
    return { d: path.getAttribute("d"), nearest, radius: c.width / 2 };
  });
  expect(clear.d).toContain("Q");
  expect(clear.nearest).toBeGreaterThan(clear.radius + 8);
});

test("Flow Network: hovering, focusing or tapping a node traces its edges and fades the rest by color", async ({
  page,
}) => {
  await openFlow(page, MIN_CUT_FLOW_FRAMES);
  await flowNode(page, "2").hover();
  for (const id of ["1>2", "2>4"]) {
    await expect(flowEdge(page, id)).toHaveAttribute("data-traced", "trace");
  }
  await expect(flowEdge(page, "1>3")).toHaveAttribute("data-traced", "faint");
  await expect(flowNode(page, "4")).toHaveAttribute("data-traced", "trace");
  await expect(flowNode(page, "3")).toHaveAttribute("data-traced", "faint");
  const faded = await flowNode(page, "3").evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    filter: getComputedStyle(el).filter,
  }));
  expect(faded.opacity).toBe("1");
  expect(faded.filter).toContain("grayscale");

  await page.mouse.move(0, 0);
  await flowNode(page, "3").focus();
  await expect(flowEdge(page, "3>4")).toHaveAttribute("data-traced", "trace");
  await expect(flowEdge(page, "1>2")).toHaveAttribute("data-traced", "faint");
  await page.keyboard.press("Enter");
  await expect(flowNode(page, "3")).toHaveAttribute("aria-pressed", "true");
  await expect(flowNode(page, "3")).toHaveAttribute(
    "aria-label",
    "Node 3, edges to 4 (capacity 5), from 1 (capacity 2)",
  );
  await expect(flowNode(page, "1")).toHaveAttribute(
    "aria-label",
    "Node 1, source, edges to 2 (capacity 10), 3 (capacity 2)",
  );
});

test("Flow Network: on a phone a tap traces a node, also after zooming in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openFlow(page, MIN_CUT_BACKWARD_FLOW_FRAMES);
  await page.locator("#workbench-panel-close").click();
  await expectFits(page, `${FLOW}-svg`);
  await page.locator(`${FLOW}-zoom-in`).click();
  await expect(page.locator(`${FLOW}-zoom`)).toHaveAttribute("data-zoom", "1.50");
  await flowNode(page, "b").focus();
  await flowNode(page, "b").blur();
  await flowNode(page, "b").click();
  await expect(flowNode(page, "b")).toHaveAttribute("aria-pressed", "true");
  await expect(flowEdge(page, "b>t")).toHaveAttribute("data-traced", "trace");
  await expectFits(page, `${FLOW}-svg`);
});

for (const scheme of ["light", "dark"]) {
  for (const width of [390, 1280]) {
    test(`Flow Network: draws at ${width} px in the ${scheme} theme without widening the page`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      await openFlow(page, MIN_CUT_FLOW_FRAMES);
      const svg = page.locator(`${FLOW}-svg`);
      await expect(svg).toBeVisible();
      expect((await svg.boundingBox()).width).toBeGreaterThan(250);
      await expectFits(page, `${FLOW}-svg`);
      await expect(page.locator(`${FLOW}-zoom`)).toHaveAttribute("data-zoom", "1.00");
      // The source tag follows the theme: no dark-on-dark, no light-on-white.
      const ink = await flowNode(page, "1")
        .locator('[data-tag="source"]')
        .evaluate((el) => getComputedStyle(el).fill);
      const [r, g, b] = ink.match(/\d+/g).map(Number);
      expect((r + g + b) / 3 > 128).toBe(scheme === "dark");
    });
  }
}

for (const [width, height] of [
  [1280, 800],
  [1920, 1080],
]) {
  test(`Flow Network: at ${width}x${height} the picture fills the pane and fits the screen`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await openFlow(page, MIN_CUT_BACKWARD_FLOW_FRAMES);
    const svg = `${FLOW}-svg`;
    await expect(page.locator(svg)).toBeVisible();
    await expect
      .poll(async () => {
        const sizes = await areaSizes(page, svg);
        return Math.abs(sizes.width - sizes.content);
      })
      .toBeLessThanOrEqual(2);
    await scrollPictureToTop(page);
    const sizes = await areaSizes(page, svg);
    expect(sizes.bottom).toBeLessThanOrEqual(sizes.viewport);
    expect(sizes.viewAspect).toBeCloseTo(sizes.width / sizes.height, 2);
  });
}

/**
 * Every place where a diagram's edge labels collide, read off the drawn SVG: two labels' boxes
 * meeting, a label on a state's (node's) body, or another edge's line running through a label.
 * Labels and edges pair up by order (`[data-layer="labels"] > g` and `[data-layer="edges"] > g`
 * are drawn in the same order), so an edge's own line through its label doesn't count.
 * @returns {Promise<string[]>} One line per collision; empty when the picture is clear.
 */
function labelCollisions(page, scope) {
  return page.locator(scope).evaluate((root) => {
    const labels = [...root.querySelectorAll('[data-layer="labels"] > g')].map((g) => {
      const box = g.querySelector("rect").getBBox();
      return {
        name: g.textContent,
        x1: box.x,
        y1: box.y,
        x2: box.x + box.width,
        y2: box.y + box.height,
      };
    });
    const edges = [...root.querySelectorAll('[data-layer="edges"] > g')];
    const lines = [
      ...edges.map((g, index) => ({
        path: g.querySelector("path"),
        owner: index,
        name: g.dataset.edgeId,
      })),
      ...[...root.querySelectorAll("[data-start-arrow] path")].map((path) => ({
        path,
        owner: -1,
        name: "entry arrow",
      })),
    ];
    const bodies = [...root.querySelectorAll("[data-node-id] [data-body]")].map((body) => ({
      body,
      name: body.closest("[data-node-id]").dataset.nodeId,
    }));
    const meets = (a, b) => a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
    const found = [];
    labels.forEach((label, i) => {
      labels.forEach((other, j) => {
        if (j > i && meets(label, other))
          found.push(`label ${i} "${label.name}" meets label ${j} "${other.name}"`);
      });
      for (const { body, name } of bodies) {
        if (body.tagName === "circle") {
          const cx = body.cx.baseVal.value;
          const cy = body.cy.baseVal.value;
          const r = body.r.baseVal.value;
          const nx = Math.min(Math.max(cx, label.x1), label.x2);
          const ny = Math.min(Math.max(cy, label.y1), label.y2);
          if (Math.hypot(nx - cx, ny - cy) < r)
            found.push(`label ${i} "${label.name}" on state ${name}`);
        } else {
          const b = body.getBBox();
          if (meets(label, { x1: b.x, y1: b.y, x2: b.x + b.width, y2: b.y + b.height })) {
            found.push(`label ${i} "${label.name}" on ${name}`);
          }
        }
      }
      const inner = { x1: label.x1 + 1, y1: label.y1 + 1, x2: label.x2 - 1, y2: label.y2 - 1 };
      for (const { path, owner, name } of lines) {
        if (owner === i) continue;
        const length = path.getTotalLength();
        for (let at = 0; at <= length; at += 2) {
          const point = path.getPointAtLength(at);
          if (
            point.x > inner.x1 &&
            point.x < inner.x2 &&
            point.y > inner.y1 &&
            point.y < inner.y2
          ) {
            found.push(`line ${name} runs through label ${i} "${label.name}"`);
            break;
          }
        }
      }
    });
    return found;
  });
}

for (const [key, testCase] of Object.entries(AUTOMATON_CASES)) {
  test(`Automaton: the ${key} capture's arrow labels clear each other, every state and every other arrow`, async ({
    page,
  }) => {
    await openAutomaton(page, testCase);
    await expect(page.locator(`${AUTOMATON}-graph [data-layer="labels"] > g`)).toHaveCount(
      testCase.capture.payload.transitions.length,
    );
    expect(await labelCollisions(page, `${AUTOMATON}-svg`)).toEqual([]);
  });
}

for (const [key, capture] of Object.entries(FLOW_CASES)) {
  test(`Flow Network: the ${key} capture's edge labels clear each other, every node and every other edge`, async ({
    page,
  }) => {
    await openFlow(page, capture);
    await expect(page.locator(`${FLOW}-graph [data-layer="labels"] > g`)).toHaveCount(
      capture.payload.edges.length,
    );
    expect(await labelCollisions(page, `${FLOW}-svg`)).toEqual([]);
    // During the run too: the labels grow to "flow/capacity".
    await runToFrame(page, capture, capture.frames.length - 1);
    expect(await labelCollisions(page, `${FLOW}-svg`)).toEqual([]);
  });
}

// --- #202: the Grouped Graph renderer (the clause graph) -----------------------------------

const CLAUSES = "#workbench-source-frames-groupedgraph";

const literal = (page, id) => page.locator(`${CLAUSES}-graph [data-node-id="${id}"]`);
const clause = (page, id) => page.locator(`${CLAUSES}-graph [data-clause-id="${id}"]`);
const variableChip = (page, id) => page.locator(`${CLAUSES}-graph [data-variable-id="${id}"]`);

test("Grouped Graph: one cluster per clause, its literals, complement edges and a chip per variable", async ({
  page,
}) => {
  const capture = SAT3_CLAUSE_GRAPH_FRAMES;
  await openPicture(page, "3SAT", capture);
  const { payload } = capture;
  await expect(page.locator(`${CLAUSES}-graph [data-clause-id]`)).toHaveCount(
    payload.groups.length,
  );
  await expect(page.locator(`${CLAUSES}-graph [data-node-id]`)).toHaveCount(payload.nodes.length);
  await expect(page.locator(`${CLAUSES}-graph [data-edge-kind="complement"]`)).toHaveCount(
    payload.edges.length,
  );
  await expect(page.locator(`${CLAUSES}-graph [data-variable-id]`)).toHaveCount(
    payload.variables.length,
  );
  // Every focusable piece says what it is.
  for (const piece of await page.locator(`${CLAUSES}-graph [data-focusable]`).all()) {
    await expect(piece).toHaveAttribute("aria-label", /^(Literal \S+ in C\d+|Variable \S+: )/);
    await expect(piece).toHaveAttribute("tabindex", "0");
  }

  // The Edges switch adds the edges inside each clause (the 3SAT to Independent Set graph).
  await page.locator(`${CLAUSES}-edges-all`).click();
  await expect(page.locator(`${CLAUSES}-edges-all`)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(`${CLAUSES}-graph [data-edge-kind="clause"]`)).toHaveCount(
    payload.clauseEdges.length,
  );
  await page.locator(`${CLAUSES}-edges-complements`).click();
  await expect(page.locator(`${CLAUSES}-graph [data-edge-kind="clause"]`)).toHaveCount(0);
});

test("Grouped Graph: before Run the clause graph is the plain formula, and step 1 keeps it in place", async ({
  page,
}) => {
  // The first step already tries x1 (a ring, a T chip); none of it shows before Run.
  const capture = SAT3_CLAUSE_GRAPH_FRAMES;
  await openPicture(page, "3SAT", capture);
  const graph = page.locator(`${CLAUSES}-graph`);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(graph.locator("[data-node-id]")).toHaveCount(capture.payload.nodes.length);
  await expect(graph.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(graph.locator("[data-tried]")).toHaveCount(0);
  await expect(graph.locator('[data-variable-id]:not([data-value="unassigned"])')).toHaveCount(0);
  await expect(page.locator(CAPTION)).toHaveCount(0);
  await expect(legendBody(page)).not.toContainText("Ring (the variable being tried)");

  const before = await nodeCentres(page, `${CLAUSES}-graph`);
  await runToFrame(page, capture, 0);
  await expect(variableChip(page, "v:x1")).toHaveAttribute("data-tried", "true");
  expect(await nodeCentres(page, `${CLAUSES}-graph`)).toEqual(before);
});

test("Grouped Graph: the steps show False literals, Covered clauses, Committed true literals and the answer", async ({
  page,
}) => {
  const capture = SAT3_CLAUSE_GRAPH_FRAMES;
  await openPicture(page, "3SAT", capture);

  // Frame 5: x1 = True is kept so far, x2 is being tried.
  await runToFrame(page, capture, 4);
  await expect(literal(page, "c0-0")).toHaveAttribute("data-state", "Committed");
  await expect(literal(page, "c0-0")).toHaveAttribute("aria-label", /Committed \(kept so far\)/);
  await expect(literal(page, "c1-0")).toHaveAttribute("data-state", "False");
  await expect(literal(page, "c2-0")).toHaveAttribute("data-tried", "true");
  await expect(clause(page, "c0")).toHaveAttribute("data-state", "Covered");
  await expect(variableChip(page, "v:x1")).toHaveAttribute("data-value", "true");
  await expect(variableChip(page, "v:x2")).toHaveAttribute("data-tried", "true");
  await expect(variableChip(page, "v:x3")).toHaveAttribute("data-value", "unassigned");
  await expect(variableChip(page, "v:x3")).toHaveAttribute("aria-label", /not assigned yet/);

  // The last frame: one true literal per clause, confirmed.
  await page.locator("#workbench-steps-next").click();
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: yes");
  const done = capture.frames.at(-1);
  for (const [id, entry] of Object.entries(done.nodes)) {
    await expect(literal(page, id)).toHaveAttribute("data-state", entry.state);
  }
  for (const group of capture.payload.groups) {
    await expect(clause(page, group.id)).toHaveAttribute("data-state", "Covered");
  }
  await expect(variableChip(page, "v:x3")).toHaveAttribute("data-value", "false");

  const legend = legendBody(page);
  await expect(legend).toContainText("False (assigned false)");
  await expect(legend).toContainText("Committed (kept so far)");
  await expect(legend).toContainText("Complement edge");
  await expect(legend).toContainText("Ring (the variable being tried)");
});

test("Grouped Graph: an unsatisfiable formula shows the failing clause Rejected and ends on no", async ({
  page,
}) => {
  const capture = SAT3_FAILED_CLAUSE_GRAPH_FRAMES;
  await openPicture(page, "3SAT", capture);
  await runToFrame(page, capture, 1);
  await expect(clause(page, "c1")).toHaveAttribute("data-state", "Rejected");
  await expect(literal(page, "c1-0")).toHaveAttribute("data-state", "Rejected");
  await expect(clause(page, "c0")).toHaveAttribute("data-state", "Covered");
  for (let step = 2; step < capture.frames.length; step += 1) {
    await page.locator("#workbench-steps-next").click();
  }
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: no");
  await expect(page.locator(`${CLAUSES}-graph [data-state="Solution"]`)).toHaveCount(0);
});

test("Grouped Graph: hovering a literal or focusing a variable traces that variable everywhere", async ({
  page,
}) => {
  await openPicture(page, "3SAT", SAT3_CLAUSE_GRAPH_FRAMES);
  await literal(page, "c0-0").hover();
  // x1 appears in all three clauses; its literals are traced and the others fade by color.
  for (const id of ["c0-0", "c1-0", "c1-2", "c2-2"]) {
    await expect(literal(page, id)).toHaveAttribute("data-traced", "trace");
  }
  await expect(literal(page, "c0-1")).toHaveAttribute("data-traced", "faint");
  const faded = await literal(page, "c0-1").evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    filter: getComputedStyle(el).filter,
  }));
  expect(faded.opacity).toBe("1");
  expect(faded.filter).toContain("grayscale");
  await expect(page.locator(`${CLAUSES}-graph [data-edge-id="c0-0~c1-0"]`)).toHaveAttribute(
    "data-traced",
    "trace",
  );

  await page.mouse.move(0, 0);
  await variableChip(page, "v:x2").focus();
  await expect(literal(page, "c0-1")).toHaveAttribute("data-traced", "trace");
  await expect(literal(page, "c0-0")).toHaveAttribute("data-traced", "faint");
  await page.keyboard.press("Enter");
  await expect(variableChip(page, "v:x2")).toHaveAttribute("aria-pressed", "true");
});

for (const scheme of ["light", "dark"]) {
  for (const width of [390, 1080, 1280]) {
    test(`Grouped Graph: draws at ${width} px in the ${scheme} theme without widening the page`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      await openPicture(page, "3SAT", SAT3_CLAUSE_GRAPH_FRAMES);
      const svg = page.locator(`${CLAUSES}-svg`);
      await expect(svg).toBeVisible();
      const box = await svg.boundingBox();
      expect(box.width).toBeGreaterThan(250);
      // The whole formula fits the width it has, at every width: nothing scrolls sideways.
      await expectFits(page, `${CLAUSES}-svg`);
      await expect(page.locator(`${CLAUSES}-zoom`)).toHaveAttribute("data-zoom", "1.00");
      // An unassigned variable's chip text follows the theme.
      const ink = await variableChip(page, "v:x3")
        .locator("text")
        .evaluate((el) => getComputedStyle(el).fill);
      const [r, g, b] = ink.match(/\d+/g).map(Number);
      expect((r + g + b) / 3 > 128).toBe(scheme === "dark");
    });
  }
}

test("Grouped Graph: the clause graph zooms like a graph, and a tap still traces when zoomed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPicture(page, "3SAT", SAT3_CLAUSE_GRAPH_FRAMES);
  await page.locator("#workbench-panel-close").click();
  const zoom = page.locator(`${CLAUSES}-zoom`);
  await page.locator(`${CLAUSES}-zoom-in`).click();
  await expect(zoom).toHaveAttribute("data-zoom", "1.50");
  // The Edges switch changes what is drawn, not where, so the zoom stays.
  await page.locator(`${CLAUSES}-edges-all`).click();
  await expect(zoom).toHaveAttribute("data-zoom", "1.50");
  await page.locator(`${CLAUSES}-edges-complements`).click();

  // Focusing a literal brings it into view; tapping it traces its variable.
  await literal(page, "c0-0").focus();
  await literal(page, "c0-0").blur();
  await literal(page, "c0-0").click();
  await expect(literal(page, "c0-0")).toHaveAttribute("aria-pressed", "true");
  await expect(literal(page, "c1-0")).toHaveAttribute("data-traced", "trace");
  await expectFits(page, `${CLAUSES}-svg`);

  await page.locator(`${CLAUSES}-zoom-reset`).click();
  await expect(zoom).toHaveAttribute("data-zoom", "1.00");
});

for (const [width, height] of [
  [1280, 800],
  [1920, 1080],
]) {
  test(`Grouped Graph: at ${width}x${height} the clause graph fills the pane and, zoomed, isn't clipped to a column`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await openPicture(page, "3SAT", SAT3_CLAUSE_GRAPH_FRAMES);
    const svg = `${CLAUSES}-svg`;
    await expect(page.locator(svg)).toBeVisible();
    await expect
      .poll(async () => {
        const sizes = await areaSizes(page, svg);
        return Math.abs(sizes.width - sizes.content);
      })
      .toBeLessThanOrEqual(2);
    await scrollPictureToTop(page);
    const sizes = await areaSizes(page, svg);
    expect(sizes.bottom).toBeLessThanOrEqual(sizes.viewport);
    await page.locator(`${CLAUSES}-zoom-in`).click();
    await page.locator(`${CLAUSES}-zoom-in`).click();
    const zoomed = await areaSizes(page, svg);
    expect(zoomed.viewAspect).toBeCloseTo(zoomed.width / zoomed.height, 2);
  });
}

// --- #207: the Packing renderer (Partition, Subset Sum, Knapsack, Bin Packing) ---------------

const PACKING = "#workbench-source-frames-packing";

/**
 * Each packing capture. Only Partition has a visualization in the catalog CI's backend serves
 * (ghcr.io/reduxisu/redux:latest has none for Subset Sum, Knapsack or Bin Packing yet), so every
 * capture is drawn on the Partition page: the picture is the capture's, whatever the page.
 */
const PACKING_CASES = {
  partition: PARTITION_PACKING_FRAMES,
  partitionOdd: PARTITION_ODD_PACKING_FRAMES,
  subsetSum: SUBSET_SUM_PACKING_FRAMES,
  subsetSumApprox: SUBSET_SUM_APPROX_PACKING_FRAMES,
  subsetSumApproxMiss: SUBSET_SUM_APPROX_MISS_PACKING_FRAMES,
  subsetSumClipped: SUBSET_SUM_CLIPPED_PACKING_FRAMES,
  knapsack: KNAPSACK_PACKING_FRAMES,
  knapsackOver: KNAPSACK_OVER_PACKING_FRAMES,
  binPacking: BIN_PACKING_PACKING_FRAMES,
  binPackingShort: BIN_PACKING_FFD_SHORT_PACKING_FRAMES,
};

/** Sets every visualization's picture type in allInfo, so any problem page asks for frames. */
async function setEveryPictureType(page, pictureType) {
  await page.route(ALL_INFO_REQUEST, async (route) => {
    const response = await route.fetch();
    const info = await response.json();
    for (const entry of Object.values(info)) {
      if (entry && typeof entry === "object" && "visualizationName" in entry) {
        entry.pictureType = pictureType;
      }
    }
    await route.fulfill({ response, json: info });
  });
}

async function openPacking(page, capture) {
  await setEveryPictureType(page, "Packing");
  await openPicture(page, "Partition", capture);
  await expect(page.locator(`${PACKING}-packing`)).toBeVisible();
}

const packingItem = (page, id) => page.locator(`${PACKING}-packing [data-item-id="${id}"]`);
const packingRows = (page, container) =>
  page.locator(`${PACKING}-packing [data-container-id="${container}"]`);

/** The rows each container is drawn as: one per line it has (a knapsack's weight and value). */
function rowsOf(container) {
  return ["target", "limit", "atLeast"].filter((key) => typeof container[key] === "number");
}

/** Frame `index`'s states, placement and totals, checked piece by piece against the picture. */
async function expectPackingFrame(page, capture, index) {
  const frame = capture.frames[index];
  const { items, containers } = capture.payload;
  for (const [position, item] of items.entries()) {
    const drawn = packingItem(page, item.id);
    await expect(drawn).toHaveAttribute("data-state", frame.items[item.id]?.state ?? "Background");
    await expect(drawn).toHaveAttribute("data-container", String(frame.assign[position]));
  }
  for (const [position, container] of containers.entries()) {
    const rows = packingRows(page, container.id);
    await expect(rows).toHaveCount(rowsOf(container).length);
    for (const row of await rows.all()) {
      const measure = await row.getAttribute("data-measure");
      await expect(row).toHaveAttribute(
        "data-state",
        frame.containers[container.id]?.state ?? "Background",
      );
      await expect(row).toHaveAttribute("data-total", String(frame.totals[position][measure]));
      // One piece for each item placed in the container, in instance order.
      const placed = items.filter((_, i) => frame.assign[i] === position).map((item) => item.id);
      expect(
        await row
          .locator("[data-piece-for]")
          .evaluateAll((pieces) => pieces.map((piece) => piece.getAttribute("data-piece-for"))),
      ).toEqual(placed);
    }
  }
}

for (const [key, capture] of Object.entries(PACKING_CASES)) {
  test(`Packing: the ${key} capture draws every item and container, and every step's placement`, async ({
    page,
  }) => {
    // Every step of the run, checked piece by piece.
    test.slow();
    const { payload } = capture;
    await openPacking(page, capture);
    const packing = page.locator(`${PACKING}-packing`);
    await expect(packing).toHaveAttribute("data-packing-rule", payload.rule);
    await expect(packing.locator("[data-item-id]")).toHaveCount(payload.items.length);
    for (const item of payload.items) {
      await expect(packingItem(page, item.id)).toContainText(item.label);
    }
    const rowCount = payload.containers.reduce((sum, box) => sum + rowsOf(box).length, 0);
    await expect(packing.locator("[data-row-id]")).toHaveCount(rowCount);
    for (const piece of await packing.locator("[data-focusable]").all()) {
      await expect(piece).toHaveAttribute("aria-label", /^(Item |\S)/);
      await expect(piece).toHaveAttribute("tabindex", "0");
    }
    // Nothing here can be dragged (#250 leaves the packing alone).
    await expect(page.locator(`${PACKING}-layout-reset`)).toHaveCount(0);
    await expect(page.locator(`${PACKING}-svg`)).not.toHaveAttribute("data-editable", /./);

    await runToFrame(page, capture, 0);
    await expectPackingFrame(page, capture, 0);
    for (let index = 1; index < capture.frames.length; index += 1) {
      await page.locator("#workbench-steps-next").click();
      await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
      await expectPackingFrame(page, capture, index);
    }
    const last = capture.frames.at(-1);
    await expect(page.locator(`${CAPTION}-verdict`)).toHaveText(
      last.ok ? "Verdict: yes" : "Verdict: no",
    );
  });
}

/** Each item tile's drawn box, by id, in viewBox units. */
function tileBoxes(page) {
  return page.locator(`${PACKING}-packing [data-item-id]`).evaluateAll((items) =>
    Object.fromEntries(
      items.map((item) => {
        const box = item.querySelector("[data-body]").getBBox();
        return [item.getAttribute("data-item-id"), `${box.x},${box.y},${box.width}`];
      }),
    ),
  );
}

test("Packing: before Run the picture is the plain instance, and step 1 keeps every tile in place", async ({
  page,
}) => {
  const capture = PARTITION_PACKING_FRAMES;
  await openPacking(page, capture);
  const packing = page.locator(`${PACKING}-packing`);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(packing.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(packing.locator("[data-group]")).toHaveCount(0);
  await expect(packing.locator("[data-container]")).toHaveCount(0);
  await expect(packing.locator("[data-piece-for]")).toHaveCount(0);
  await expect(packing.locator("[data-total]")).toHaveCount(0);
  await expect(packing.locator("[data-beam]")).toHaveAttribute("data-tilt", "0.0");
  await expect(page.locator(CAPTION)).toHaveCount(0);
  // The lines are the instance's, so they show: half the total on both sides.
  await expect(packing.locator('[data-line-label="half = 5"]')).toHaveCount(2);
  await expect(packing.locator('[data-row-sub=""]').first()).toHaveText("needs 5");

  const before = await tileBoxes(page);
  await runToFrame(page, capture, 0);
  await expect(packing.locator("[data-piece-for]").first()).toBeVisible();
  expect(await tileBoxes(page)).toEqual(before);
  for (let index = 1; index < capture.frames.length; index += 1) {
    await page.locator("#workbench-steps-next").click();
  }
  expect(await tileBoxes(page)).toEqual(before);
});

test("Packing: Partition colors each item by its side, and the beam tips toward the heavier side", async ({
  page,
}) => {
  const capture = PARTITION_PACKING_FRAMES;
  await openPacking(page, capture);
  await runToFrame(page, capture, 0);
  const frame = capture.frames[0];
  // The first try puts only 1 on S1: S1 holds less, so the beam tips down on S2's side.
  for (const [position, item] of capture.payload.items.entries()) {
    await expect(packingItem(page, item.id)).toHaveAttribute(
      "data-group",
      String(frame.assign[position]),
    );
  }
  const beam = page.locator(`${PACKING}-packing [data-beam]`);
  const [s1, s2] = frame.totals.map((total) => total.size);
  expect(s1).toBeLessThan(s2);
  expect(Number(await beam.getAttribute("data-tilt"))).toBeGreaterThan(0);
  await expect(beam.locator('[data-beam-side="0"]')).toHaveText(`S1 ${s1}`);
  // Both sides miss half while a split is judged: Rejected, with ✗.
  await expect(packingRows(page, "C1")).toHaveAttribute("data-state", "Rejected");
  await expect(packingRows(page, "C1").locator("[data-readout]")).toHaveText(`${s1} ✗`);

  // The answer: both sides Covered at 5, ✓, the beam level, every item green.
  await page.locator("#workbench-steps-slider input").focus();
  await page.keyboard.press("End");
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: yes");
  for (const id of ["C1", "C2"]) {
    await expect(packingRows(page, id)).toHaveAttribute("data-state", "Covered");
    await expect(packingRows(page, id)).toHaveAttribute("data-verdict", "met");
    await expect(packingRows(page, id).locator("[data-readout]")).toHaveText("5 ✓");
  }
  await expect(beam).toHaveAttribute("data-tilt", "0.0");
  await expect(
    page.locator(`${PACKING}-packing [data-item-id]:not([data-state="Solution"])`),
  ).toHaveCount(0);
  await expect(legendBody(page)).toContainText("S1 (items on this side)");
  await expect(legendBody(page)).toContainText("S2 (items on this side)");
  await expect(legendBody(page)).toContainText(
    "Dashed line (the number a total must reach or stay within)",
  );
});

test("Packing: Knapsack draws a Weight row and a Value row, and a try past W turns its piece red", async ({
  page,
}) => {
  const capture = KNAPSACK_OVER_PACKING_FRAMES;
  await openPacking(page, capture);
  const rows = packingRows(page, "C1");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toHaveAttribute("data-measure", "size");
  await expect(rows.nth(0)).toHaveAttribute("data-line-kind", "limit");
  await expect(rows.nth(0).locator("[data-row-label]")).toContainText("Weight");
  await expect(rows.nth(0).locator("[data-line-label]")).toHaveText("W = 50");
  await expect(rows.nth(1)).toHaveAttribute("data-measure", "value");
  await expect(rows.nth(1).locator("[data-row-label]")).toContainText("Value");
  await expect(rows.nth(1).locator("[data-line-label]")).toHaveText("V = 250");
  await expect(page.locator(`${PACKING}-packing [data-heading="containers"]`)).toHaveText(
    "THE KNAPSACK",
  );

  // The try of all three items weighs 60: the piece that runs past W is red, the weight is ✗ and
  // the value (280, at least 250) is ✓.
  const index = capture.frames.findIndex((frame) => frame.totals[0].size > 50);
  expect(capture.frames[index].totals[0]).toEqual({ size: 60, value: 280 });
  await runToFrame(page, capture, index);
  await expect(rows.nth(0)).toHaveAttribute("data-state", "Rejected");
  await expect(rows.nth(0).locator("[data-readout]")).toHaveText("60 ✗");
  await expect(rows.nth(1).locator("[data-readout]")).toHaveText("280 ✓");
  await expect(rows.nth(0).locator('[data-piece-for="I3"]')).toHaveAttribute("data-over", "true");
  await expect(rows.nth(0).locator('[data-piece-for="I1"]')).not.toHaveAttribute("data-over", /./);
  await expect(rows.nth(1).locator("[data-over]")).toHaveCount(0);
  await expect(legendBody(page)).toContainText("Red piece (past the limit)");
  // The run finds nothing: the last frame places nothing and says no.
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: no");
  await expect(page.locator(`${PACKING}-packing [data-piece-for]`)).toHaveCount(0);
});

test("Packing: Bin Packing's bins share one scale, and a full bin is as long as its capacity", async ({
  page,
}) => {
  const capture = BIN_PACKING_PACKING_FRAMES;
  await openPacking(page, capture);
  await expect(page.locator(`${PACKING}-packing [data-heading="containers"]`)).toHaveText(
    "BINS · CAPACITY 10, AT MOST 3",
  );
  await runToFrame(page, capture, capture.frames.length - 1);
  // Every bin holds 10 at the end: each row's pieces end exactly at its line.
  for (const id of ["C1", "C2", "C3"]) {
    const row = packingRows(page, id);
    await expect(row).toHaveAttribute("data-verdict", "met");
    const ends = await row.evaluate((element) => {
      const pieces = [...element.querySelectorAll("[data-piece-for] rect")].map((rect) =>
        rect.getBBox(),
      );
      const last = pieces.at(-1);
      const line = element.querySelector("[data-line]").getBBox();
      const track = element.querySelector("[data-track]").getBBox();
      return { end: last.x + last.width, line: line.x + line.width / 2, track: track.width };
    });
    expect(ends.end).toBeCloseTo(ends.line, 0);
    expect(ends.track).toBeCloseTo(ends.line - 20, 0);
  }
  // Each bin's items take that bin's color.
  const last = capture.frames.at(-1);
  for (const [position, item] of capture.payload.items.entries()) {
    await expect(packingItem(page, item.id)).toHaveAttribute(
      "data-group",
      String(last.assign[position]),
    );
  }
  await expect(legendBody(page)).toContainText("Bin 3 (items in this bin)");
});

test("Packing: the approximation keeps its best sum so far Committed, with the number it adds in focus", async ({
  page,
}) => {
  const capture = SUBSET_SUM_APPROX_PACKING_FRAMES;
  await openPacking(page, capture);
  // Adding 12: the best sum so far, 1 + 7, is Committed, and 12 is the number looked at.
  await runToFrame(page, capture, 2);
  await expect(packingItem(page, "I1")).toHaveAttribute("data-state", "Committed");
  await expect(packingItem(page, "I2")).toHaveAttribute("data-state", "Committed");
  await expect(packingItem(page, "I3")).toHaveAttribute("data-state", "ElementHighlight");
  await expect(packingItem(page, "I4")).toHaveAttribute("data-state", "Background");
  // The row is not judged before the run ends: no Rejected, no tick or cross.
  const row = packingRows(page, "C1");
  await expect(row).toHaveAttribute("data-state", "Background");
  await expect(row.locator("[data-readout]")).toHaveText("20");
  await expect(page.locator(`${PACKING}-packing [data-state="Rejected"]`)).toHaveCount(0);
  await expect(legendBody(page)).toContainText("Committed (kept so far)");
});

test("Packing: a number the approximation looks at but keeps out reads as not in the container", async ({
  page,
}) => {
  const capture = SUBSET_SUM_APPROX_MISS_PACKING_FRAMES;
  await openPacking(page, capture);
  // Adding 1001: trimming keeps the best sum at 1000, so 1001 is in focus but not in Chosen.
  await runToFrame(page, capture, 1);
  await expect(packingItem(page, "I2")).toHaveAttribute("data-state", "ElementHighlight");
  await expect(packingItem(page, "I2")).toHaveAttribute("data-container", "-1");
  await expect(packingItem(page, "I2")).toHaveAttribute(
    "aria-label",
    "Item 1001, size 1001, not in Chosen, Highlighted (looked at now)",
  );
  await expect(packingRows(page, "C1").locator("[data-piece-for]")).toHaveCount(1);
  await expect(packingRows(page, "C1").locator("[data-readout]")).toHaveText("1000");
  // The run ends on no, with nothing placed.
  await page.locator("#workbench-steps-next").click();
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames.at(-1).caption);
  await expect(page.locator(`${PACKING}-packing [data-piece-for]`)).toHaveCount(0);
  await expect(packingItem(page, "I2")).toHaveAttribute("aria-label", /left out/);
});

test("Packing: First Fit Decreasing marks the item no bin has room for, and ends on no", async ({
  page,
}) => {
  const capture = BIN_PACKING_FFD_SHORT_PACKING_FRAMES;
  await openPacking(page, capture);
  const index = capture.frames.findIndex((frame) =>
    Object.values(frame.items).some((entry) => entry.state === "Rejected"),
  );
  await runToFrame(page, capture, index);
  const [id] = Object.entries(capture.frames[index].items).find(
    ([, entry]) => entry.state === "Rejected",
  );
  await expect(packingItem(page, id)).toHaveAttribute("data-state", "Rejected");
  await expect(packingItem(page, id)).toHaveAttribute("data-container", "-1");
  await expect(packingItem(page, id)).toHaveAttribute("aria-label", /left out, Rejected/);
});

test("Packing: a try longer than the track is cut at its end, with nothing drawn past it", async ({
  page,
}) => {
  const capture = SUBSET_SUM_CLIPPED_PACKING_FRAMES;
  await openPacking(page, capture);
  const index = capture.frames.findIndex((frame) => frame.totals[0].size === 22);
  await runToFrame(page, capture, index);
  const row = packingRows(page, "C1");
  await expect(row.locator("[data-clipped]")).toHaveCount(1);
  const fits = await row.evaluate((element) => {
    const track = element.querySelector("[data-track]").getBBox();
    return [...element.querySelectorAll("[data-piece-for] rect")].every((rect) => {
      const box = rect.getBBox();
      return box.x >= track.x - 0.5 && box.x + box.width <= track.x + track.width + 0.5;
    });
  });
  expect(fits).toBe(true);
  await expect(row.locator("[data-readout]")).toHaveText("22 ✗");
});

test("Packing: hovering, focusing or tapping an item traces it, and a container traces its items", async ({
  page,
}) => {
  const capture = PARTITION_PACKING_FRAMES;
  await openPacking(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  const last = capture.frames.at(-1);
  await packingItem(page, "I1").hover();
  await expect(packingItem(page, "I1")).toHaveAttribute("data-traced", "trace");
  await expect(packingItem(page, "I2")).toHaveAttribute("data-traced", "faint");
  const side = last.assign[0];
  await expect(packingRows(page, `C${side + 1}`)).toHaveAttribute("data-traced", "trace");
  await expect(packingRows(page, `C${2 - side}`)).toHaveAttribute("data-traced", "faint");
  const faded = await packingItem(page, "I2").evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    filter: getComputedStyle(el).filter,
  }));
  expect(faded.opacity).toBe("1");
  expect(faded.filter).toContain("grayscale");

  // A container traces the items in it, and the rest fade.
  await page.mouse.move(0, 0);
  await packingRows(page, "C2").focus();
  for (const [position, item] of capture.payload.items.entries()) {
    await expect(packingItem(page, item.id)).toHaveAttribute(
      "data-traced",
      last.assign[position] === 1 ? "trace" : "faint",
    );
  }
  await page.keyboard.press("Enter");
  await expect(packingRows(page, "C2")).toHaveAttribute("aria-pressed", "true");
  await expect(packingRows(page, "C2")).toHaveAttribute(
    "aria-label",
    /^S2: needs 5, holds .+, total 5, line met, Covered \(rule met\)$/,
  );
  await expect(packingItem(page, "I1")).toHaveAttribute(
    "aria-label",
    `Item 3, size 3, in S${side + 1}, Solution (answer)`,
  );
});

test("Packing: on a phone a tap traces an item, also after zooming in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openPacking(page, KNAPSACK_PACKING_FRAMES);
  await page.locator("#workbench-panel-close").click();
  await expectFits(page, `${PACKING}-svg`);
  await page.locator(`${PACKING}-zoom-in`).click();
  await expect(page.locator(`${PACKING}-zoom`)).toHaveAttribute("data-zoom", "1.50");
  await packingItem(page, "I2").focus();
  await packingItem(page, "I2").blur();
  await packingItem(page, "I2").click();
  await expect(packingItem(page, "I2")).toHaveAttribute("aria-pressed", "true");
  await expect(packingItem(page, "I1")).toHaveAttribute("data-traced", "faint");
  await expectFits(page, `${PACKING}-svg`);
});

for (const scheme of ["light", "dark"]) {
  for (const width of [390, 1080, 1280]) {
    test(`Packing: draws at ${width} px in the ${scheme} theme without widening the page`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      await openPacking(page, KNAPSACK_PACKING_FRAMES);
      const svg = page.locator(`${PACKING}-svg`);
      await expect(svg).toBeVisible();
      expect((await svg.boundingBox()).width).toBeGreaterThan(250);
      await expectFits(page, `${PACKING}-svg`);
      await expect(page.locator(`${PACKING}-zoom`)).toHaveAttribute("data-zoom", "1.00");
      // The line labels follow the theme: no dark-on-dark, no light-on-white.
      const ink = await page
        .locator(`${PACKING}-packing [data-line-label]`)
        .first()
        .evaluate((el) => getComputedStyle(el).fill);
      const [r, g, b] = ink.match(/\d+/g).map(Number);
      expect((r + g + b) / 3 > 128).toBe(scheme === "dark");
    });
  }
}

/**
 * Every place where two texts of the packing picture meet, read off the screen (so a tipped beam
 * label counts where it is drawn), and every piece or tile whose number spills out of its box.
 * @returns {Promise<string[]>} One line per collision; empty when the picture is clear.
 */
function packingTextCollisions(page) {
  return page.locator(`${PACKING}-svg`).evaluate((svg) => {
    const found = [];
    const texts = [...svg.querySelectorAll("text")].filter((text) => text.textContent.trim());
    const boxes = texts.map((text) => ({ text, box: text.getBoundingClientRect() }));
    const meets = (a, b) =>
      a.left < b.right - 0.5 &&
      b.left < a.right - 0.5 &&
      a.top < b.bottom - 0.5 &&
      b.top < a.bottom - 0.5;
    boxes.forEach((a, i) => {
      boxes.forEach((b, j) => {
        if (j > i && meets(a.box, b.box)) {
          found.push(`"${a.text.textContent}" meets "${b.text.textContent}"`);
        }
      });
    });
    for (const group of svg.querySelectorAll("[data-piece-for], [data-item-id]")) {
      const rect = group.querySelector("rect").getBoundingClientRect();
      for (const text of group.querySelectorAll("text")) {
        const box = text.getBoundingClientRect();
        if (box.left < rect.left - 0.5 || box.right > rect.right + 0.5) {
          found.push(`"${text.textContent}" spills out of its box`);
        }
      }
    }
    return found;
  });
}

for (const [key, capture] of Object.entries(PACKING_CASES)) {
  for (const width of [1280, 390, 320]) {
    test(`Packing: the ${key} capture's texts never meet at ${width} px, before Run and at every step`, async ({
      page,
    }) => {
      // Every step of the run, checked piece by piece; on a phone the drawing is narrower.
      test.slow();
      await page.setViewportSize({ width, height: 900 });
      await openPacking(page, capture);
      // On a phone the problem's panel covers the steps until it is closed.
      if (width < 600) await page.locator("#workbench-panel-close").click();
      expect(await packingTextCollisions(page)).toEqual([]);
      await runToFrame(page, capture, 0);
      expect(await packingTextCollisions(page)).toEqual([]);
      for (let index = 1; index < capture.frames.length; index += 1) {
        await page.locator("#workbench-steps-next").click();
        await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
        expect(await packingTextCollisions(page)).toEqual([]);
      }
    });
  }
}

/**
 * The smallest text of the packing picture as drawn on screen, in CSS px (its font size times
 * the diagram's scale), with the text it belongs to.
 */
function packingSmallestText(page) {
  return page.locator(`${PACKING}-svg`).evaluate((svg) => {
    const scale = svg.getScreenCTM().a;
    return [...svg.querySelectorAll("text, tspan")]
      .filter((text) => text.textContent.trim())
      .map((text) => ({
        text: text.textContent,
        px: Number.parseFloat(getComputedStyle(text).fontSize) * scale,
      }))
      .reduce((smallest, text) => (text.px < smallest.px ? text : smallest));
  });
}

/** The smallest a packing label may be drawn on a 390 px phone, in CSS px. */
const PHONE_TEXT_PX = 11;

for (const key of ["partition", "knapsack", "binPacking"]) {
  test(`Packing: on a 390 px phone the ${key} picture is drawn at its own size, every label at least ${PHONE_TEXT_PX} px`, async ({
    page,
  }) => {
    const capture = PACKING_CASES[key];
    await page.setViewportSize({ width: 390, height: 900 });
    await openPacking(page, capture);
    await page.locator("#workbench-panel-close").click();
    // The drawing takes the box's width (narrower than its 480), so fit draws it 1:1, whole.
    const drawn = await page.locator(`${PACKING}-packing`).getAttribute("data-drawing-width");
    expect(Number(drawn)).toBeLessThan(480);
    await expect(page.locator(`${PACKING}-zoom`)).toHaveAttribute("data-zoom", "1.00");
    await expectFits(page, `${PACKING}-svg`);
    const before = await packingSmallestText(page);
    expect(before.px, `"${before.text}" is ${before.px} px`).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
    await runToFrame(page, capture, Math.floor(capture.frames.length / 2));
    const during = await packingSmallestText(page);
    expect(during.px, `"${during.text}" is ${during.px} px`).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
    // Every row and the whole pool are inside the picture area, with nothing to scroll to.
    const inside = await page.locator(`${PACKING}-svg`).evaluate((svg) => {
      const area = svg.getBoundingClientRect();
      return [...svg.querySelectorAll("[data-row-id], [data-item-id]")].every((piece) => {
        const box = piece.getBoundingClientRect();
        return (
          box.left >= area.left - 0.5 &&
          box.right <= area.right + 0.5 &&
          box.top >= area.top - 0.5 &&
          box.bottom <= area.bottom + 0.5
        );
      });
    });
    expect(inside).toBe(true);
  });
}

test("Packing: on a 320 px phone a heading too long for the line wraps at its comma", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openPacking(page, BIN_PACKING_PACKING_FRAMES);
  const heading = page.locator(`${PACKING}-packing [data-heading="containers"]`);
  await expect(heading).toHaveText("BINS · CAPACITY 10, AT MOST 3");
  await expect(heading.locator("tspan")).toHaveText(["BINS · CAPACITY 10,", "AT MOST 3"]);
  await expect(page.locator(`${PACKING}-zoom`)).toHaveAttribute("data-zoom", "1.00");
  expect((await packingSmallestText(page)).px).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
});

test("Packing: a wide screen still draws the picture 480 wide, as large as its box allows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPacking(page, BIN_PACKING_PACKING_FRAMES);
  await expect(page.locator(`${PACKING}-packing`)).toHaveAttribute("data-drawing-width", "480");
  const smallest = await packingSmallestText(page);
  expect(smallest.px).toBeGreaterThan(PHONE_TEXT_PX);
});

// --- #217: the Search Tree renderer (backtracking and branch-and-bound runs) ----------------

const TREE = "#workbench-source-frames-searchtree";

/**
 * Each search tree capture. The catalog CI's backend serves has no Search Tree visualizations
 * yet, so every capture is drawn on the 3SAT page (its clause graph's visualization made to name
 * SearchTree): the picture is the capture's, whatever the page.
 */
const TREE_CASES = {
  sat3: SAT3_SEARCH_TREE_FRAMES,
  sat3Unsat: SAT3_UNSAT_SEARCH_TREE_FRAMES,
  tsp: TSP_SEARCH_TREE_FRAMES,
  tspGreedyBeaten: TSP_GREEDY_BEATEN_SEARCH_TREE_FRAMES,
  tsp4City: TSP_4CITY_SEARCH_TREE_FRAMES,
  coloring: GRAPH_COLORING_SEARCH_TREE_FRAMES,
  coloringFailed: GRAPH_COLORING_FAILED_SEARCH_TREE_FRAMES,
  queens: N_QUEENS_SEARCH_TREE_FRAMES,
  dm3: DM3_SEARCH_TREE_FRAMES,
};

async function openTree(page, capture) {
  await setEveryPictureType(page, "SearchTree");
  await openPicture(page, "3SAT", capture);
  await expect(page.locator(`${TREE}-tree`)).toBeVisible();
}

const treeNode = (page, id) => page.locator(`${TREE}-tree [data-node-id="${id}"]`);
const treeEdge = (page, id) => page.locator(`${TREE}-tree [data-edge-into="${id}"]`);

/** Frame `index`'s tree, checked node by node against the picture. */
async function expectTreeFrame(page, capture, index) {
  const frame = capture.frames[index];
  const tree = page.locator(`${TREE}-tree`);
  await expect(tree.locator("[data-node-id]")).toHaveCount(frame.nodes.length);
  await expect(tree.locator("[data-edge-into]")).toHaveCount(
    frame.nodes.filter((node) => node.parent !== null).length,
  );
  for (const node of frame.nodes) {
    const drawn = treeNode(page, node.id);
    await expect(drawn).toHaveAttribute("data-state", node.state);
    await expect(drawn).toHaveAttribute("data-kind", node.kind);
    await expect(drawn.locator("[data-label]")).toHaveText(node.label);
  }
  await expect(tree.locator("[data-focus]")).toHaveCount(frame.focus.length);
  for (const id of frame.focus) {
    await expect(treeNode(page, id)).toHaveAttribute("data-focus", "true");
  }
  const summary = page.locator(`${TREE}-summary`);
  await expect(summary).toHaveAttribute("data-total", String(frame.total));
  await expect(summary).toHaveAttribute("data-cut", String(frame.cut));
}

for (const [key, capture] of Object.entries(TREE_CASES)) {
  test(`Search Tree: the ${key} capture grows its tree step by step, every node as Redux sends it`, async ({
    page,
  }) => {
    // Every step of the run, checked piece by piece.
    test.slow();
    await openTree(page, capture);
    // Before Run there is no tree: the picture says it grows once the solver runs.
    await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute(
      "data-plain",
      "true",
    );
    await expect(page.locator(`${TREE}-waiting`)).toContainText(
      `The search tree of this ${capture.payload.problem} instance grows from the solver's choices, step by step.`,
    );
    await expect(page.locator(`${TREE}-svg`)).toHaveCount(0);
    // Nothing here can be dragged (#250 leaves the tree alone).
    await expect(page.locator(`${TREE}-layout-reset`)).toHaveCount(0);

    await runToFrame(page, capture, 0);
    await expectTreeFrame(page, capture, 0);
    for (let index = 1; index < capture.frames.length; index += 1) {
      await page.locator("#workbench-steps-next").click();
      await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
      await expectTreeFrame(page, capture, index);
    }
    const last = capture.frames.at(-1);
    await expect(page.locator(`${CAPTION}-verdict`)).toHaveText(
      last.ok ? "Verdict: yes" : "Verdict: no",
    );
    for (const piece of await page.locator(`${TREE}-tree [data-focusable]`).all()) {
      await expect(piece).toHaveAttribute("tabindex", "0");
      await expect(piece).toHaveAttribute("aria-label", /./);
    }
  });
}

/** Each drawn node's box, by id, in viewBox units. */
function treeBoxes(page) {
  return page.locator(`${TREE}-tree [data-node-id]`).evaluateAll((nodes) =>
    Object.fromEntries(
      nodes.map((node) => {
        const box = node.querySelector("[data-body]").getBBox();
        return [
          node.getAttribute("data-node-id"),
          { x: box.x, y: box.y, width: box.width, height: box.height },
        ];
      }),
    ),
  );
}

test("Search Tree: each level is a row, and a parent sits centred over its first and last child", async ({
  page,
}) => {
  const capture = GRAPH_COLORING_SEARCH_TREE_FRAMES;
  await openTree(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  const frame = capture.frames.at(-1);
  const boxes = await treeBoxes(page);
  const centre = (id) => boxes[id].x + boxes[id].width / 2;
  for (const node of frame.nodes) {
    const children = frame.nodes.filter((child) => child.parent === node.id);
    if (!children.length) continue;
    for (const child of children) expect(boxes[child.id].y).toBeGreaterThan(boxes[node.id].y);
    // Siblings left to right in the order Redux made them, and the parent over their middle.
    const xs = children.map((child) => centre(child.id));
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
    expect(centre(node.id)).toBeCloseTo((xs[0] + xs.at(-1)) / 2, 0);
  }
  // No two nodes on a row meet.
  const ids = Object.keys(boxes);
  for (const [i, a] of ids.entries()) {
    for (const b of ids.slice(i + 1)) {
      const p = boxes[a];
      const q = boxes[b];
      const meet =
        p.x < q.x + q.width && q.x < p.x + p.width && p.y < q.y + q.height && q.y < p.y + p.height;
      expect(meet, `${a} meets ${b}`).toBe(false);
    }
  }
});

test("Search Tree: the whole run shares one box, so the view and a node's size hold still while it grows", async ({
  page,
}) => {
  const capture = N_QUEENS_SEARCH_TREE_FRAMES;
  await openTree(page, capture);
  await runToFrame(page, capture, 0);
  // The tree opens at fit, and the window holds still while it grows.
  await expect(page.locator(`${TREE}-zoom`)).toHaveAttribute("data-zoom", "1.00");
  const viewBox = await page.locator(`${TREE}-svg`).getAttribute("viewBox");
  const first = await treeBoxes(page);
  // A step later the tree has changed shape (Redux folded a branch), but the box is the same.
  for (let index = 1; index < capture.frames.length; index += 1) {
    await page.locator("#workbench-steps-next").click();
    await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
    expect(await page.locator(`${TREE}-svg`).getAttribute("viewBox")).toBe(viewBox);
  }
  const last = await treeBoxes(page);
  expect(last.n0.height).toBe(first.n0.height);
  expect(last.n0.width).toBe(first.n0.width);
  await expect(page.locator(`${TREE}-zoom`)).toHaveAttribute("data-zoom", "1.00");
});

test("Search Tree: folds stand for the nodes Redux hid, and say how many", async ({ page }) => {
  const capture = N_QUEENS_SEARCH_TREE_FRAMES;
  await openTree(page, capture);
  await runToFrame(page, capture, 0);
  const frame = capture.frames[0];
  const more = frame.nodes.find((node) => node.kind === "more");
  const cut = frame.nodes.find((node) => node.kind === "cut");
  await expect(treeNode(page, more.id)).toHaveAttribute("data-hidden", String(more.hidden));
  await expect(treeNode(page, more.id)).toHaveAttribute(
    "aria-label",
    new RegExp(`^\\+${more.hidden} more, path .*, ${more.hidden} finished nodes folded away`),
  );
  await expect(treeNode(page, cut.id)).toHaveAttribute(
    "aria-label",
    new RegExp(`^${cut.hidden} cut, path .*, ${cut.hidden} branches cut`),
  );
  // A cut branch is dashed red, a fold of finished ones dotted grey.
  await expect(treeEdge(page, cut.id)).toHaveAttribute("stroke-dasharray", "4 4");
  await expect(treeEdge(page, more.id)).toHaveAttribute("stroke-dasharray", "2 3");
  await expect(legendBody(page)).toContainText("+k more (a finished branch folded away)");
  await expect(legendBody(page)).toContainText("k cut (that many cut branches drawn as one)");
});

test("Search Tree: the answer's path turns green, and best-first nodes show when they left the queue", async ({
  page,
}) => {
  const capture = SAT3_SEARCH_TREE_FRAMES;
  await openTree(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  for (const id of ["n0", "n1", "n3"]) {
    await expect(treeNode(page, id)).toHaveAttribute("data-state", "Solution");
  }
  for (const id of ["n1", "n3"]) {
    await expect(treeEdge(page, id)).not.toHaveAttribute("stroke-dasharray", /./);
  }
  // The answer's leaf says why it is one, and each queued node how many clauses it leaves.
  await expect(treeNode(page, "n3").locator("[data-note]")).toHaveAttribute("data-note", "x3 free");
  await expect(treeNode(page, "n2").locator("[data-note]")).toHaveAttribute(
    "data-note",
    "1 clause left",
  );
  // Best-first: the order each node left the queue, and the one still queued waits dashed.
  await expect(treeNode(page, "n0").locator('[data-badge="order"]')).toHaveText("1");
  await expect(treeNode(page, "n1").locator('[data-badge="order"]')).toHaveText("2");
  await expect(treeNode(page, "n2")).toHaveAttribute("data-kind", "queued");
  await expect(treeNode(page, "n2")).toHaveAttribute("data-state", "Untraveled");
  await expect(legendBody(page)).toContainText("Order (when the node left the queue)");
});

test("Search Tree: a branch explored and backed out of is solid red, and a run that finds nothing says no", async ({
  page,
}) => {
  const failed = GRAPH_COLORING_FAILED_SEARCH_TREE_FRAMES;
  await openTree(page, failed);
  await runToFrame(page, failed, failed.frames.length - 1);
  const node = failed.frames.at(-1).nodes.find((candidate) => candidate.kind === "failed");
  await expect(treeNode(page, node.id)).toHaveAttribute("data-state", "Rejected");
  await expect(treeEdge(page, node.id)).not.toHaveAttribute("stroke-dasharray", /./);
  await expect(legendBody(page)).toContainText("Solid red branch (explored, then backed out of)");
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: no");
  await expect(page.locator(`${TREE}-tree [data-state="Solution"]`)).toHaveCount(0);
});

test("Search Tree: a bound or clash is noted under its node, on two lines when it is long", async ({
  page,
}) => {
  const capture = TSP_SEARCH_TREE_FRAMES;
  await openTree(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  const note = treeNode(page, "n3").locator("[data-note]");
  await expect(note).toHaveAttribute("data-note", "lb 7450 ≥ 6830");
  await expect(note.locator("tspan")).toHaveText(["lb 7450", "≥ 6830"]);
  await expect(treeNode(page, "n3")).toHaveAttribute(
    "aria-label",
    "Denver, path New York → Denver, cut without exploring, Rejected (failed or ruled out), lb 7450 ≥ 6830",
  );
  await expect(legendBody(page)).toContainText(
    "Note under a node (the bound or clash that decided it)",
  );
  await expect(legendBody(page)).toContainText(
    "Dashed red branch (cut without exploring, by a bound or a clash)",
  );
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: yes");
});

test("Search Tree: TSP's greedy tour is a leaf under the root, and the answer's path when nothing beats it", async ({
  page,
}) => {
  const capture = TSP_SEARCH_TREE_FRAMES;
  await openTree(page, capture);
  // The first step: the root is explored first, and the greedy tour is the step's node.
  await runToFrame(page, capture, 0);
  await expect(treeNode(page, "n0").locator('[data-badge="order"]')).toHaveText("1");
  await expect(treeNode(page, "n1")).toHaveAttribute("data-focus", "true");
  await expect(treeNode(page, "n1").locator("[data-label]")).toHaveText("greedy tour");
  await expect(treeNode(page, "n1").locator("[data-note]")).toHaveAttribute(
    "data-note",
    "tour 6830",
  );
  // The search never beats it: the answer's path is the root and the greedy tour.
  await page.locator("#workbench-steps-slider input").focus();
  await page.keyboard.press("End");
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames.at(-1).caption);
  await expect(page.locator(`${TREE}-tree [data-state="Solution"]`)).toHaveCount(2);
  for (const id of ["n0", "n1"]) {
    await expect(treeNode(page, id)).toHaveAttribute("data-state", "Solution");
  }
  await expect(treeEdge(page, "n1")).not.toHaveAttribute("stroke-dasharray", /./);
  // The label fits its node.
  const fits = await treeNode(page, "n1").evaluate((node) => {
    const body = node.querySelector("[data-body]").getBoundingClientRect();
    const label = node.querySelector("[data-label]").getBoundingClientRect();
    return label.left >= body.left - 0.5 && label.right <= body.right + 0.5;
  });
  expect(fits).toBe(true);
});

test("Search Tree: when the search beats TSP's greedy tour, the answer's path runs down the tree", async ({
  page,
}) => {
  const capture = TSP_GREEDY_BEATEN_SEARCH_TREE_FRAMES;
  await openTree(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  for (const id of ["n0", "n3", "n9", "n12", "n14"]) {
    await expect(treeNode(page, id)).toHaveAttribute("data-state", "Solution");
  }
  await expect(treeNode(page, "n14").locator("[data-note]")).toHaveAttribute(
    "data-note",
    "tour 27",
  );
  // The greedy tour it beat stays a leaf, no longer the answer.
  await expect(treeNode(page, "n1")).toHaveAttribute("data-state", "Covered");
  await expect(treeNode(page, "n1").locator("[data-note]")).toHaveAttribute("data-note", "tour 31");
});

test("Search Tree: hovering, focusing or tapping a node traces its path from the root", async ({
  page,
}) => {
  const capture = TSP_SEARCH_TREE_FRAMES;
  await openTree(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  await treeNode(page, "n12").hover();
  for (const id of ["n0", "n5", "n9", "n12"]) {
    await expect(treeNode(page, id)).toHaveAttribute("data-traced", "trace");
  }
  for (const id of ["n5", "n9", "n12"]) {
    await expect(treeEdge(page, id)).toHaveAttribute("data-traced", "trace");
  }
  await expect(treeNode(page, "n2")).toHaveAttribute("data-traced", "faint");
  await expect(treeEdge(page, "n2")).toHaveAttribute("data-traced", "faint");
  const faded = await treeNode(page, "n2").evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    filter: getComputedStyle(el).filter,
  }));
  expect(faded.opacity).toBe("1");
  expect(faded.filter).toContain("grayscale");

  await page.mouse.move(0, 0);
  await treeNode(page, "n7").focus();
  await expect(treeNode(page, "n2")).toHaveAttribute("data-traced", "trace");
  await expect(treeNode(page, "n5")).toHaveAttribute("data-traced", "faint");
  await page.keyboard.press("Enter");
  await expect(treeNode(page, "n7")).toHaveAttribute("aria-pressed", "true");
  await expect(treeNode(page, "n2")).toHaveAttribute(
    "aria-label",
    "Chicago, path New York → Chicago, explored, Covered (rule met), lb 5470, left the queue 2, 3 children",
  );
});

for (const scheme of ["light", "dark"]) {
  for (const width of [390, 1080, 1280]) {
    test(`Search Tree: draws at ${width} px in the ${scheme} theme without widening the page`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await openTree(page, TSP_SEARCH_TREE_FRAMES);
      await runToFrame(page, TSP_SEARCH_TREE_FRAMES, TSP_SEARCH_TREE_FRAMES.frames.length - 1);
      await page.setViewportSize({ width, height: 900 });
      const svg = page.locator(`${TREE}-svg`);
      await expect(svg).toBeVisible();
      expect((await svg.boundingBox()).width).toBeGreaterThan(250);
      await expectFits(page, `${TREE}-svg`);
      // The notes follow the theme: no dark-on-dark, no light-on-white.
      const ink = await treeNode(page, "n0")
        .locator("[data-note]")
        .evaluate((el) => getComputedStyle(el).fill);
      const [r, g, b] = ink.match(/\d+/g).map(Number);
      expect((r + g + b) / 3 > 128).toBe(scheme === "dark");
    });
  }
}

/**
 * Every place where two texts of the tree meet, or a text spills out of its node or crosses a
 * node it doesn't belong to, or an edge runs through a text other than its own ends' labels.
 * @returns {Promise<string[]>} One line per collision; empty when the picture is clear.
 */
function treeCollisions(page) {
  return page.locator(`${TREE}-svg`).evaluate((svg) => {
    const found = [];
    const texts = [
      ...svg.querySelectorAll("[data-node-id] [data-label], [data-node-id] [data-note]"),
    ].map((text) => ({
      name: `${text.closest("[data-node-id]").dataset.nodeId} "${text.textContent}"`,
      owner: text.closest("[data-node-id]").dataset.nodeId,
      box: text.getBBox(),
    }));
    const bodies = [...svg.querySelectorAll("[data-node-id] [data-body]")].map((body) => ({
      owner: body.closest("[data-node-id]").dataset.nodeId,
      box: body.getBBox(),
    }));
    const meets = (a, b) =>
      a.x < b.x + b.width - 0.5 &&
      b.x < a.x + a.width - 0.5 &&
      a.y < b.y + b.height - 0.5 &&
      b.y < a.y + a.height - 0.5;
    texts.forEach((a, i) => {
      texts.forEach((b, j) => {
        if (j > i && meets(a.box, b.box)) found.push(`${a.name} meets ${b.name}`);
      });
      for (const body of bodies) {
        if (body.owner !== a.owner && meets(a.box, body.box)) {
          found.push(`${a.name} on node ${body.owner}`);
        }
      }
    });
    for (const body of bodies) {
      const label = texts.find((text) => text.owner === body.owner);
      if (
        label &&
        (label.box.x < body.box.x - 0.5 ||
          label.box.x + label.box.width > body.box.x + body.box.width + 0.5)
      ) {
        found.push(`${label.name} spills out of its node`);
      }
    }
    for (const path of svg.querySelectorAll("[data-edge-into]")) {
      const child = path.dataset.edgeInto;
      const length = path.getTotalLength();
      for (const text of texts) {
        if (text.owner === child) continue;
        const inner = {
          x: text.box.x + 1,
          y: text.box.y + 1,
          width: text.box.width - 2,
          height: text.box.height - 2,
        };
        for (let at = 0; at <= length; at += 2) {
          const point = path.getPointAtLength(at);
          if (
            point.x > inner.x &&
            point.x < inner.x + inner.width &&
            point.y > inner.y &&
            point.y < inner.y + inner.height
          ) {
            found.push(`edge into ${child} runs through ${text.name}`);
            break;
          }
        }
      }
    }
    return found;
  });
}

for (const [key, capture] of Object.entries(TREE_CASES)) {
  test(`Search Tree: the ${key} capture's labels and notes never meet, at every step`, async ({
    page,
  }) => {
    // Every step of the run, checked piece by piece.
    test.slow();
    await openTree(page, capture);
    await runToFrame(page, capture, 0);
    expect(await treeCollisions(page)).toEqual([]);
    for (let index = 1; index < capture.frames.length; index += 1) {
      await page.locator("#workbench-steps-next").click();
      await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
      expect(await treeCollisions(page)).toEqual([]);
    }
  });
}

/**
 * The smallest label and the smallest note of the tree as drawn on screen, in CSS px (font size
 * times the diagram's scale), with the text each belongs to.
 */
function treeSmallestText(page) {
  return page.locator(`${TREE}-svg`).evaluate((svg) => {
    const scale = svg.getScreenCTM().a;
    const smallest = (selector) =>
      [...svg.querySelectorAll(selector)]
        .map((text) => ({
          text: text.textContent,
          px: Number.parseFloat(getComputedStyle(text).fontSize) * scale,
        }))
        .reduce((least, text) => (text.px < least.px ? text : least), { text: "", px: Infinity });
    return { label: smallest("[data-label]"), note: smallest("[data-note]") };
  });
}

/** The smallest a tree's label and note may be drawn on a phone, in CSS px. */
const TREE_LABEL_PX = 11;
const TREE_NOTE_PX = 10;

/** Whether node `id`'s box is wholly inside the picture area on screen. */
function treeNodeInView(page, id) {
  return page.locator(`${TREE}-svg`).evaluate((svg, nodeId) => {
    const node = svg.querySelector(`[data-node-id="${nodeId}"] [data-body]`);
    const a = node.getBoundingClientRect();
    const b = svg.getBoundingClientRect();
    return (
      a.left >= b.left - 1 &&
      a.right <= b.right + 1 &&
      a.top >= b.top - 1 &&
      a.bottom <= b.bottom + 1
    );
  }, id);
}

/** The node a frame's view follows: its step's, or else the end of the answer's path. */
function followedNode(frame) {
  const [focus] = frame.focus;
  if (focus !== undefined) return focus;
  const answer = frame.nodes.findLast(
    (node) => node.state === "Solution" || node.state === "Committed",
  );
  return (answer ?? frame.nodes[0]).id;
}

/** The tree's zoom, as DiagramZoom.js reports it. */
const treeZoom = async (page) =>
  Number(await page.locator(`${TREE}-zoom`).getAttribute("data-zoom"));

/** Whether the tree's smallest label and note read at TREE_LABEL_PX and TREE_NOTE_PX. */
async function treeReadable(page) {
  const smallest = await treeSmallestText(page);
  return smallest.label.px >= TREE_LABEL_PX && smallest.note.px >= TREE_NOTE_PX;
}

/** Presses + until the tree's text is readable (treeReadable) or + is disabled. */
async function zoomTreeToReadable(page) {
  const zoomIn = page.locator(`${TREE}-zoom-in`);
  for (let press = 0; press < 12; press += 1) {
    if (await treeReadable(page)) return;
    if (await zoomIn.isDisabled()) return;
    const before = await treeZoom(page);
    await zoomIn.click();
    await expect.poll(() => treeZoom(page)).toBeGreaterThan(before);
  }
}

for (const width of [390, 1280]) {
  test(`Search Tree: at ${width} px every capture opens at fit, on Run and on its last step`, async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width, height: 844 });
    for (const capture of Object.values(TREE_CASES)) {
      await openTree(page, capture);
      if (width < 600) await page.locator("#workbench-panel-close").click();
      await page.locator("#workbench-run").click();
      const count = capture.frames.length;
      await expect(page.locator("#workbench-steps-position")).toHaveText(
        `Step ${count} of ${count}`,
      );
      await expect(page.locator(`${TREE}-zoom`)).toHaveAttribute("data-zoom", "1.00");
      await expect(page.locator(`${TREE}-zoom-reset`)).toBeDisabled();
      await expect(page.locator(`${TREE}-zoom-out`)).toBeDisabled();
      await expectFits(page, `${TREE}-svg`);
    }
  });
}

for (const key of ["sat3", "tsp", "queens"]) {
  test(`Search Tree: on a 390 px phone the ${key} tree zooms in to readable text, and stepping keeps the step in view`, async ({
    page,
  }) => {
    const capture = TREE_CASES[key];
    await page.setViewportSize({ width: 390, height: 844 });
    await openTree(page, capture);
    await page.locator("#workbench-panel-close").click();
    await runToFrame(page, capture, capture.frames.length - 1);
    await expect(page.locator(`${TREE}-zoom`)).toHaveAttribute("data-zoom", "1.00");
    // + reaches the text's full size, however wide the tree.
    await zoomTreeToReadable(page);
    const zoomed = await treeSmallestText(page);
    expect(zoomed.label.px, `"${zoomed.label.text}"`).toBeGreaterThanOrEqual(TREE_LABEL_PX);
    expect(zoomed.note.px, `"${zoomed.note.text}"`).toBeGreaterThanOrEqual(TREE_NOTE_PX);
    await expectFits(page, `${TREE}-svg`);
    // Zoomed in, each step's node is brought into view, at the same readable size.
    for (let index = capture.frames.length - 2; index >= capture.frames.length - 6; index -= 1) {
      if (index < 0) break;
      await page.locator("#workbench-steps-previous").click();
      await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
      await expect.poll(() => treeNodeInView(page, followedNode(capture.frames[index]))).toBe(true);
    }
    const stepped = await treeSmallestText(page);
    expect(stepped.label.px).toBeGreaterThanOrEqual(TREE_LABEL_PX);
    expect(stepped.note.px).toBeGreaterThanOrEqual(TREE_NOTE_PX);
    // Back at step 1, following its node frames the path down to it: where the window can hold
    // the path from the root, the root is in view too.
    await toFirstStep(page);
    const first = followedNode(capture.frames[0]);
    await expect.poll(() => treeNodeInView(page, first)).toBe(true);
    const framing = await page.locator(`${TREE}-svg`).evaluate((svg, nodeId) => {
      const rect = (id) =>
        svg.querySelector(`[data-node-id="${id}"] [data-body]`).getBoundingClientRect();
      const area = svg.getBoundingClientRect();
      const root = svg.querySelector("[data-node-id] [data-body]").getBoundingClientRect();
      const node = rect(nodeId);
      return {
        pathFits:
          Math.max(root.right, node.right) - Math.min(root.left, node.left) <= area.width &&
          Math.max(root.bottom, node.bottom) - Math.min(root.top, node.top) <= area.height,
        rootInView:
          root.left >= area.left - 1 &&
          root.right <= area.right + 1 &&
          root.top >= area.top - 1 &&
          root.bottom <= area.bottom + 1,
      };
    }, first);
    if (framing.pathFits) expect(framing.rootInView).toBe(true);
    await page.locator(`${TREE}-zoom-reset`).click();
    await expect(page.locator(`${TREE}-zoom`)).toHaveAttribute("data-zoom", "1.00");
  });
}

test("Search Tree: Ctrl + wheel also zooms a wide tree on a phone in to readable text", async ({
  page,
}) => {
  const capture = TSP_SEARCH_TREE_FRAMES;
  await page.setViewportSize({ width: 390, height: 844 });
  await openTree(page, capture);
  await page.locator("#workbench-panel-close").click();
  await runToFrame(page, capture, capture.frames.length - 1);
  const svg = page.locator(`${TREE}-svg`);
  await svg.scrollIntoViewIfNeeded();
  const box = await svg.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.down("Control");
  for (let turn = 0; turn < 12; turn += 1) {
    if (await treeReadable(page)) break;
    await page.mouse.wheel(0, -200);
  }
  await page.keyboard.up("Control");
  await expect.poll(() => treeReadable(page)).toBe(true);
});

test("Search Tree: on a desktop a wide tree opens at fit, and + zooms it in to readable text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const capture = TSP_GREEDY_BEATEN_SEARCH_TREE_FRAMES;
  await openTree(page, capture);
  await page.locator("#workbench-run").click();
  await expect(page.locator(`${TREE}-zoom`)).toHaveAttribute("data-zoom", "1.00");
  await zoomTreeToReadable(page);
  const smallest = await treeSmallestText(page);
  expect(smallest.label.px).toBeGreaterThanOrEqual(TREE_LABEL_PX);
  expect(smallest.note.px).toBeGreaterThanOrEqual(TREE_NOTE_PX);
  await page.locator(`${TREE}-zoom-reset`).click();
  await expect(page.locator(`${TREE}-zoom`)).toHaveAttribute("data-zoom", "1.00");
});

test("Search Tree: a short note like 2 clauses left stays on one line", async ({ page }) => {
  const capture = SAT3_UNSAT_SEARCH_TREE_FRAMES;
  await openTree(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  const notes = page.locator(`${TREE}-tree [data-note="2 clauses left"]`);
  expect(await notes.count()).toBeGreaterThan(0);
  for (const note of await notes.all()) {
    await expect(note.locator("tspan")).toHaveText(["2 clauses left"]);
  }
  for (const note of await page.locator(`${TREE}-tree [data-note="1 clause left"]`).all()) {
    await expect(note.locator("tspan")).toHaveText(["1 clause left"]);
  }
});

for (const width of [390, 320]) {
  test(`Search Tree: at ${width} px every capture's finished tree has no labels or notes meeting`, async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width, height: 844 });
    for (const capture of Object.values(TREE_CASES)) {
      await openTree(page, capture);
      await page.locator("#workbench-panel-close").click();
      await runToFrame(page, capture, capture.frames.length - 1);
      expect(await treeCollisions(page)).toEqual([]);
      await expectFits(page, `${TREE}-svg`);
    }
  });
}

// --- #208: the Board renderer (Sudoku, N-Queens) --------------------------------------------

const BOARD = "#workbench-source-frames-board";

/**
 * Each board capture. The catalog CI's backend serves has no Board visualizations yet, so every
 * capture is drawn on the 3SAT page (its visualization made to name Board): the picture is the
 * capture's, whatever the page.
 */
const BOARD_CASES = {
  sudokuShort: SUDOKU_SHORT_BOARD_FRAMES,
  sudokuClash: SUDOKU_CLASH_BOARD_FRAMES,
  sudoku: SUDOKU_BOARD_FRAMES,
  queens: N_QUEENS_BOARD_FRAMES,
  queensNone: N_QUEENS_NONE_BOARD_FRAMES,
  queensConstructive: N_QUEENS_CONSTRUCTIVE_BOARD_FRAMES,
};

async function openBoard(page, capture) {
  await setEveryPictureType(page, "Board");
  await openPicture(page, "3SAT", capture);
  await expect(page.locator(`${BOARD}-board`)).toBeVisible();
}

const boardSquare = (page, id) => page.locator(`${BOARD}-board [data-square-id="${id}"]`);

/** Frame `index`'s squares, pieces and links, checked square by square against the picture. */
async function expectBoardFrame(page, capture, index) {
  const frame = capture.frames[index];
  const board = page.locator(`${BOARD}-board`);
  const drawn = await board
    .locator("[data-square-id]")
    .evaluateAll((squares) =>
      Object.fromEntries(
        squares.map((square) => [
          square.getAttribute("data-square-id"),
          [
            square.getAttribute("data-state"),
            square.getAttribute("data-value"),
            square.getAttribute("data-piece"),
            square.getAttribute("data-focus"),
          ],
        ]),
      ),
    );
  const { size } = capture.payload;
  const pieces = new Map(frame.pieces.map((piece) => [piece.id, piece.kind]));
  const focus = new Set(frame.focus);
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const id = `r${r}c${c}`;
      expect(drawn[id], id).toEqual([
        frame.cells[id]?.state ?? "Background",
        capture.payload.game === "queens" ? null : (frame.values[id] ?? null),
        pieces.get(id) ?? null,
        focus.has(id) ? "true" : null,
      ]);
    }
  }
  await expect(board.locator("[data-piece-id]")).toHaveCount(frame.pieces.length);
  const links = await board
    .locator("[data-link-from]")
    .evaluateAll((all) =>
      all.map(
        (link) => `${link.getAttribute("data-link-from")}>${link.getAttribute("data-link-to")}`,
      ),
    );
  expect(links).toEqual(frame.links.map((link) => `${link.from}>${link.to}`));
}

for (const [key, capture] of Object.entries(BOARD_CASES)) {
  test(`Board: the ${key} capture draws every square and every step's values, pieces and links`, async ({
    page,
  }) => {
    // Every step of the run, checked square by square.
    test.slow();
    const { payload } = capture;
    await openBoard(page, capture);
    const board = page.locator(`${BOARD}-board`);
    await expect(board).toHaveAttribute("data-game", payload.game);
    await expect(board.locator("[data-square-id]")).toHaveCount(payload.size * payload.size);
    await expect(board.locator("[data-axis]")).toHaveCount(2 * payload.size);
    await expect(board.locator("[data-axis]").first()).toHaveText(String(payload.labelsFrom));
    // Nothing here can be dragged (#250 leaves the board alone).
    await expect(page.locator(`${BOARD}-layout-reset`)).toHaveCount(0);
    await expect(page.locator(`${BOARD}-svg`)).not.toHaveAttribute("data-editable", /./);

    await runToFrame(page, capture, 0);
    await expectBoardFrame(page, capture, 0);
    for (let index = 1; index < capture.frames.length; index += 1) {
      await page.locator("#workbench-steps-next").click();
      await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
      await expectBoardFrame(page, capture, index);
    }
    const last = capture.frames.at(-1);
    await expect(page.locator(`${CAPTION}-verdict`)).toHaveText(
      last.ok ? "Verdict: yes" : "Verdict: no",
    );
    for (const piece of await board.locator("[data-focusable]").all()) {
      await expect(piece).toHaveAttribute("tabindex", "0");
      await expect(piece).toHaveAttribute("aria-label", /^Row \d+, column \d+, /);
    }
  });
}

/** Each square's drawn box, by id, in viewBox units. */
function squareBoxes(page) {
  return page.locator(`${BOARD}-board [data-square-id]`).evaluateAll((squares) =>
    Object.fromEntries(
      squares.map((square) => {
        const box = square.querySelector("[data-body]").getBBox();
        return [square.getAttribute("data-square-id"), `${box.x},${box.y},${box.width}`];
      }),
    ),
  );
}

test("Board: before Run the Sudoku is its clues alone, and step 1 keeps every square in place", async ({
  page,
}) => {
  const capture = SUDOKU_SHORT_BOARD_FRAMES;
  await openBoard(page, capture);
  const board = page.locator(`${BOARD}-board`);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(board.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(board.locator("[data-value]")).toHaveCount(capture.payload.clues.length);
  for (const clue of capture.payload.clues) {
    const square = boardSquare(page, clue.id);
    await expect(square).toHaveAttribute("data-clue", "true");
    await expect(square).toHaveAttribute("data-value", clue.value);
    await expect(square.locator("[data-text]")).toHaveAttribute("font-weight", "700");
  }
  await expect(board.locator("[data-link-from]")).toHaveCount(0);
  const before = await squareBoxes(page);
  await runToFrame(page, capture, 0);
  expect(await squareBoxes(page)).toEqual(before);
});

test("Board: a chessboard before Run is empty, with its labels counted from 0", async ({
  page,
}) => {
  const capture = N_QUEENS_BOARD_FRAMES;
  await openBoard(page, capture);
  const board = page.locator(`${BOARD}-board`);
  await expect(board.locator("[data-piece-id]")).toHaveCount(0);
  await expect(board.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(board.locator("[data-axis]").first()).toHaveText("0");
  await expect(boardSquare(page, "r0c0")).toHaveAttribute("aria-label", "Row 0, column 0, empty");
  const before = await squareBoxes(page);
  await runToFrame(page, capture, 0);
  expect(await squareBoxes(page)).toEqual(before);
});

test("Board: clashing clues are Rejected and joined by a dashed link", async ({ page }) => {
  const capture = SUDOKU_CLASH_BOARD_FRAMES;
  await openBoard(page, capture);
  const index = capture.frames.findIndex((frame) => frame.links.length > 0);
  expect(index).toBeGreaterThanOrEqual(0);
  await runToFrame(page, capture, index);
  const link = capture.frames[index].links[0];
  await expect(boardSquare(page, link.from)).toHaveAttribute("data-state", "Rejected");
  const drawn = page.locator(`${BOARD}-board [data-link-from="${link.from}"]`);
  await expect(drawn.locator("line")).toHaveAttribute("stroke-dasharray", "5 4");
  // A clash's square holds a digit, so it gets no cross over it.
  await expect(drawn.locator("[data-cross]")).toHaveCount(0);
  await expect(legendBody(page)).toContainText(
    "Dashed line (a clash: both squares hold the same digit)",
  );
});

test("Board: a queen's ruled-out squares get a cross and a link back to the queen", async ({
  page,
}) => {
  const capture = N_QUEENS_BOARD_FRAMES;
  await openBoard(page, capture);
  const index = capture.frames.findIndex((frame) => frame.links.length > 0);
  expect(index).toBeGreaterThanOrEqual(0);
  await runToFrame(page, capture, index);
  for (const link of capture.frames[index].links) {
    const drawn = page.locator(
      `${BOARD}-board [data-link-from="${link.from}"][data-link-to="${link.to}"]`,
    );
    await expect(drawn.locator("[data-cross]")).toHaveCount(1);
    await expect(boardSquare(page, link.from)).toHaveAttribute("data-state", "Rejected");
  }
  await expect(legendBody(page)).toContainText("Crown (a queen on the board)");
});

test("Board: Committed queens turn Solution only on the confirmed answer", async ({ page }) => {
  const capture = N_QUEENS_BOARD_FRAMES;
  await openBoard(page, capture);
  const committed = capture.frames.findIndex((frame) =>
    Object.values(frame.cells).some((cell) => cell.state === "Committed"),
  );
  expect(committed).toBeGreaterThanOrEqual(0);
  await runToFrame(page, capture, committed);
  const square = page.locator(`${BOARD}-board [data-state="Committed"]`).first();
  // Committed's outline is dashed, Solution's is not.
  await expect(square.locator("rect").nth(1)).toHaveAttribute("stroke-dasharray", /\d/);
  const last = capture.frames.at(-1);
  await page.locator("#workbench-steps-slider input").focus();
  await page.keyboard.press("End");
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(last.caption);
  for (const piece of last.pieces) {
    await expect(boardSquare(page, piece.id)).toHaveAttribute("data-state", "Solution");
  }
  await expect(legendBody(page)).toContainText("Committed (kept so far)");
  await expect(legendBody(page)).toContainText("Solution (answer)");
});

test("Board: Hints shades every square a placed queen attacks", async ({ page }) => {
  const capture = N_QUEENS_BOARD_FRAMES;
  await openBoard(page, capture);
  await runToFrame(page, capture, 0);
  const board = page.locator(`${BOARD}-board`);
  await expect(board.locator("[data-attacked]")).toHaveCount(0);
  await page.locator(`${BOARD}-hints-on`).click();
  await expect(page.locator(`${BOARD}-hints-on`)).toHaveAttribute("aria-pressed", "true");
  const { size } = capture.payload;
  const queens = capture.frames[0].pieces;
  let expected = 0;
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const onQueen = queens.some((q) => q.r === r && q.c === c);
      const attacked = queens.some(
        (q) => q.r === r || q.c === c || Math.abs(q.r - r) === Math.abs(q.c - c),
      );
      if (!onQueen && attacked) expected += 1;
    }
  }
  await expect(board.locator("[data-attacked]")).toHaveCount(expected);
  await page.locator(`${BOARD}-hints-off`).click();
  await expect(board.locator("[data-attacked]")).toHaveCount(0);
});

test("Board: hovering, focusing or tapping a square traces its row, column and box, and fades the rest by color", async ({
  page,
}) => {
  const capture = SUDOKU_BOARD_FRAMES;
  await openBoard(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  await boardSquare(page, "r4c4").hover();
  await expect(boardSquare(page, "r4c4")).toHaveAttribute("data-traced", "trace");
  await expect(boardSquare(page, "r4c0")).toHaveAttribute("data-traced", "trace");
  await expect(boardSquare(page, "r0c4")).toHaveAttribute("data-traced", "trace");
  await expect(boardSquare(page, "r3c5")).toHaveAttribute("data-traced", "trace");
  await expect(boardSquare(page, "r0c0")).toHaveAttribute("data-traced", "faint");
  const faded = await boardSquare(page, "r0c0").evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    filter: getComputedStyle(el).filter,
  }));
  expect(faded.opacity).toBe("1");
  expect(faded.filter).toContain("grayscale");
  await expect(page.locator(`${BOARD}-board [data-trace-ring="r4c4"]`)).toHaveCount(1);

  await page.mouse.move(0, 0);
  await boardSquare(page, "r0c0").focus();
  await expect(boardSquare(page, "r0c8")).toHaveAttribute("data-traced", "trace");
  await expect(boardSquare(page, "r4c4")).toHaveAttribute("data-traced", "faint");
  await page.keyboard.press("Enter");
  await expect(boardSquare(page, "r0c0")).toHaveAttribute("aria-pressed", "true");
});

test("Board: tracing a chessboard square draws a queen's lines of attack from it", async ({
  page,
}) => {
  const capture = N_QUEENS_BOARD_FRAMES;
  await openBoard(page, capture);
  await boardSquare(page, "r1c1").hover();
  // From (1, 1) on a 4 by 4 board every one of the eight directions has a square.
  await expect(page.locator(`${BOARD}-board [data-ray]`)).toHaveCount(8);
  await expect(boardSquare(page, "r3c3")).toHaveAttribute("data-traced", "trace");
  await expect(boardSquare(page, "r0c3")).toHaveAttribute("data-traced", "faint");
  await boardSquare(page, "r0c0").hover();
  await expect(page.locator(`${BOARD}-board [data-ray]`)).toHaveCount(3);
});

test("Board: on a phone a tap traces a square, also after zooming in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openBoard(page, SUDOKU_BOARD_FRAMES);
  await page.locator("#workbench-panel-close").click();
  await expectFits(page, `${BOARD}-svg`);
  await page.locator(`${BOARD}-zoom-in`).click();
  await expect(page.locator(`${BOARD}-zoom`)).toHaveAttribute("data-zoom", "1.50");
  await boardSquare(page, "r4c4").focus();
  await boardSquare(page, "r4c4").blur();
  await boardSquare(page, "r4c4").click();
  await expect(boardSquare(page, "r4c4")).toHaveAttribute("aria-pressed", "true");
  await expect(boardSquare(page, "r0c0")).toHaveAttribute("data-traced", "faint");
  await expectFits(page, `${BOARD}-svg`);
});

for (const scheme of ["light", "dark"]) {
  for (const width of [390, 1080, 1280]) {
    test(`Board: draws at ${width} px in the ${scheme} theme without widening the page`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      await openBoard(page, SUDOKU_BOARD_FRAMES);
      const svg = page.locator(`${BOARD}-svg`);
      await expect(svg).toBeVisible();
      expect((await svg.boundingBox()).width).toBeGreaterThan(250);
      await expectFits(page, `${BOARD}-svg`);
      await expect(page.locator(`${BOARD}-zoom`)).toHaveAttribute("data-zoom", "1.00");
      // The clues and the labels follow the theme: no dark-on-dark, no light-on-white.
      for (const selector of ['[data-clue="true"] [data-text]', "[data-axis]"]) {
        const ink = await page
          .locator(`${BOARD}-board ${selector}`)
          .first()
          .evaluate((el) => getComputedStyle(el).fill);
        const [r, g, b] = ink.match(/\d+/g).map(Number);
        expect((r + g + b) / 3 > 128, selector).toBe(scheme === "dark");
      }
    });
  }
}

/**
 * Every place where two texts of `svg` meet, read off the screen, and every square whose text
 * spills out of it.
 * @returns {Promise<string[]>} One line per collision; empty when the picture is clear.
 */
function svgTextCollisions(page, svgSelector, boxSelector) {
  return page.locator(svgSelector).evaluate((svg, boxes) => {
    const found = [];
    const texts = [...svg.querySelectorAll("text")].filter((text) => text.textContent.trim());
    const rects = texts.map((text) => ({ text, box: text.getBoundingClientRect() }));
    const meets = (a, b) =>
      a.left < b.right - 0.5 &&
      b.left < a.right - 0.5 &&
      a.top < b.bottom - 0.5 &&
      b.top < a.bottom - 0.5;
    rects.forEach((a, i) => {
      rects.forEach((b, j) => {
        if (j > i && meets(a.box, b.box)) {
          found.push(`"${a.text.textContent}" meets "${b.text.textContent}"`);
        }
      });
    });
    if (boxes) {
      for (const group of svg.querySelectorAll(boxes)) {
        const rect = group.querySelector("[data-body]").getBoundingClientRect();
        for (const text of group.querySelectorAll("text")) {
          const box = text.getBoundingClientRect();
          if (
            box.left < rect.left - 0.5 ||
            box.right > rect.right + 0.5 ||
            box.top < rect.top - 0.5 ||
            box.bottom > rect.bottom + 0.5
          ) {
            found.push(`"${text.textContent}" spills out of its square`);
          }
        }
      }
    }
    return found;
  }, boxSelector);
}

/** The smallest text of `svg` as drawn on screen, in CSS px, with the text it belongs to. */
function smallestText(page, svgSelector) {
  return page.locator(svgSelector).evaluate((svg) => {
    const scale = svg.getScreenCTM().a;
    return [...svg.querySelectorAll("text, tspan")]
      .filter((text) => text.textContent.trim())
      .map((text) => ({
        text: text.textContent,
        px: Number.parseFloat(getComputedStyle(text).fontSize) * scale,
      }))
      .reduce((smallest, text) => (text.px < smallest.px ? text : smallest));
  });
}

for (const [key, capture] of Object.entries(BOARD_CASES)) {
  for (const width of [1280, 390, 320]) {
    test(`Board: the ${key} capture's texts never meet at ${width} px, before Run and at every step`, async ({
      page,
    }) => {
      test.slow();
      await page.setViewportSize({ width, height: 900 });
      await openBoard(page, capture);
      if (width < 600) await page.locator("#workbench-panel-close").click();
      const clear = () => svgTextCollisions(page, `${BOARD}-svg`, "[data-square-id]");
      expect(await clear()).toEqual([]);
      await runToFrame(page, capture, 0);
      expect(await clear()).toEqual([]);
      for (let index = 1; index < capture.frames.length; index += 1) {
        await page.locator("#workbench-steps-next").click();
        await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
        expect(await clear()).toEqual([]);
      }
    });
  }
}

for (const key of ["sudoku", "queensConstructive"]) {
  test(`Board: on a 390 px phone the ${key} board is drawn at its own size, every label at least ${PHONE_TEXT_PX} px`, async ({
    page,
  }) => {
    const capture = BOARD_CASES[key];
    await page.setViewportSize({ width: 390, height: 900 });
    await openBoard(page, capture);
    await page.locator("#workbench-panel-close").click();
    await expect(page.locator(`${BOARD}-zoom`)).toHaveAttribute("data-zoom", "1.00");
    await expectFits(page, `${BOARD}-svg`);
    const before = await smallestText(page, `${BOARD}-svg`);
    expect(before.px, `"${before.text}" is ${before.px} px`).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
    await runToFrame(page, capture, Math.floor(capture.frames.length / 2));
    const during = await smallestText(page, `${BOARD}-svg`);
    expect(during.px, `"${during.text}" is ${during.px} px`).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
    // The whole board is inside the picture area, with nothing to scroll to.
    const inside = await page.locator(`${BOARD}-svg`).evaluate((svg) => {
      const area = svg.getBoundingClientRect();
      return [...svg.querySelectorAll("[data-square-id]")].every((square) => {
        const box = square.getBoundingClientRect();
        return (
          box.left >= area.left - 0.5 &&
          box.right <= area.right + 0.5 &&
          box.top >= area.top - 0.5 &&
          box.bottom <= area.bottom + 0.5
        );
      });
    });
    expect(inside).toBe(true);
  });
}

// --- #212: the Geometry renderer (Convex Hull) ----------------------------------------------

const GEOMETRY = "#workbench-source-frames-geometry";

/**
 * Each geometry capture. The catalog CI's backend serves has no Geometry visualization yet, so
 * every capture is drawn on the 3SAT page (its visualization made to name Geometry): the picture
 * is the capture's, whatever the page.
 */
const GEOMETRY_CASES = {
  hull: CONVEX_HULL_GEOMETRY_FRAMES,
  small: CONVEX_HULL_SMALL_GEOMETRY_FRAMES,
  wide: CONVEX_HULL_WIDE_GEOMETRY_FRAMES,
};

async function openGeometry(page, capture) {
  await setEveryPictureType(page, "Geometry");
  await openPicture(page, "3SAT", capture);
  await expect(page.locator(`${GEOMETRY}-geometry`)).toBeVisible();
}

const geometryPoint = (page, id) => page.locator(`${GEOMETRY}-geometry [data-point-id="${id}"]`);

/** Frame `index`'s points, hulls, chain and answer, checked against the picture. */
async function expectGeometryFrame(page, capture, index) {
  const frame = capture.frames[index];
  const picture = page.locator(`${GEOMETRY}-geometry`);
  const drawn = await picture
    .locator("[data-point-id]")
    .evaluateAll((points) =>
      Object.fromEntries(
        points.map((point) => [
          point.getAttribute("data-point-id"),
          [point.getAttribute("data-state"), point.getAttribute("data-order")],
        ]),
      ),
    );
  for (const point of capture.payload.points) {
    const order = frame.hull.indexOf(point.id);
    expect(drawn[point.id], point.id).toEqual([
      frame.points[point.id]?.state ?? "Background",
      order >= 0 ? String(order + 1) : null,
    ]);
  }
  const pieces = await picture
    .locator("[data-piece-role]")
    .evaluateAll((all) =>
      all.map(
        (piece) =>
          `${piece.getAttribute("data-piece-role")}:${piece.getAttribute("data-piece-points")}`,
      ),
    );
  expect(pieces).toEqual(frame.pieces.map((piece) => `${piece.role}:${piece.points.join(" ")}`));
  if (frame.chain.length >= 2) {
    await expect(picture.locator("[data-chain]")).toHaveAttribute(
      "data-chain",
      frame.chain.join(" "),
    );
  } else {
    await expect(picture.locator("[data-chain]")).toHaveCount(0);
  }
  await expect(picture.locator("[data-hull]")).toHaveCount(frame.hull.length >= 2 ? 1 : 0);
  await expect(picture.locator("[data-badge]")).toHaveCount(frame.hull.length);
}

for (const [key, capture] of Object.entries(GEOMETRY_CASES)) {
  test(`Geometry: the ${key} capture draws every point to scale and every step's hulls`, async ({
    page,
  }) => {
    test.slow();
    const { payload } = capture;
    await openGeometry(page, capture);
    const picture = page.locator(`${GEOMETRY}-geometry`);
    await expect(picture.locator("[data-point-id]")).toHaveCount(payload.points.length);
    for (const point of payload.points) {
      await expect(geometryPoint(page, point.id).locator("[data-label]")).toHaveText(point.id);
    }
    // Nothing here can be dragged (#250 leaves the points alone).
    await expect(page.locator(`${GEOMETRY}-layout-reset`)).toHaveCount(0);
    await expect(page.locator(`${GEOMETRY}-svg`)).not.toHaveAttribute("data-editable", /./);

    await runToFrame(page, capture, 0);
    await expectGeometryFrame(page, capture, 0);
    for (let index = 1; index < capture.frames.length; index += 1) {
      await page.locator("#workbench-steps-next").click();
      await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
      await expectGeometryFrame(page, capture, index);
    }
    const last = capture.frames.at(-1);
    await expect(page.locator(`${CAPTION}-verdict`)).toHaveText(
      last.ok ? "Verdict: yes" : "Verdict: no",
    );
    for (const piece of await picture.locator("[data-focusable]").all()) {
      await expect(piece).toHaveAttribute("tabindex", "0");
      await expect(piece).toHaveAttribute("aria-label", /^P\d+ at \(/);
    }
  });
}

/** Each point's drawn centre, by id, in viewBox units. */
function pointCentres(page) {
  return page.locator(`${GEOMETRY}-geometry [data-point-id]`).evaluateAll((points) =>
    Object.fromEntries(
      points.map((point) => {
        const dot = point.querySelector("[data-body]");
        return [
          point.getAttribute("data-point-id"),
          { x: Number(dot.getAttribute("cx")), y: Number(dot.getAttribute("cy")) },
        ];
      }),
    ),
  );
}

/**
 * Every place where a Geometry point's label or order badge meets a drawn line (a hull's edge,
 * the chain, a popped point's dashed line or a bold axis) or another point's dot, read off the
 * screen. A line is its centre line; a label is its text's box, a badge its circle.
 * @returns {Promise<string[]>} One line per collision; empty when every label is clear.
 */
function geometryLineCollisions(page) {
  return page.locator(`${GEOMETRY}-svg`).evaluate((svg) => {
    const found = [];
    const toScreen = (element, x, y) => {
      const point = svg.createSVGPoint();
      point.x = x;
      point.y = y;
      return point.matrixTransform(element.getScreenCTM());
    };
    const segments = [];
    const addPath = (element, closed) => {
      const corners = element
        .getAttribute("points")
        .trim()
        .split(/\s+/)
        .map((pair) => pair.split(",").map(Number))
        .map(([x, y]) => toScreen(element, x, y));
      const name = element.getAttribute("data-piece-role")
        ? `the ${element.getAttribute("data-piece-role")} hull`
        : element.hasAttribute("data-hull")
          ? "the hull"
          : "the chain";
      const count = closed ? corners.length : corners.length - 1;
      for (let i = 0; i < count; i += 1) {
        segments.push({ name, a: corners[i], b: corners[(i + 1) % corners.length] });
      }
    };
    for (const polygon of svg.querySelectorAll('[data-layer="hulls"] polygon')) {
      addPath(polygon, true);
    }
    for (const polyline of svg.querySelectorAll('[data-layer="hulls"] polyline')) {
      addPath(polyline, false);
    }
    for (const line of svg.querySelectorAll('[data-layer="hulls"] line, [data-axis-line]')) {
      const value = (name) => Number(line.getAttribute(name));
      segments.push({
        name: line.hasAttribute("data-popped")
          ? `the popped line to ${line.getAttribute("data-popped")}`
          : `the ${line.getAttribute("data-axis-line")} axis`,
        a: toScreen(line, value("x1"), value("y1")),
        b: toScreen(line, value("x2"), value("y2")),
      });
    }
    // Whether the segment a-b passes through the box (shrunk half a pixel): Liang-Barsky.
    const crosses = ({ a, b }, box) => {
      const left = box.left + 0.5;
      const right = box.right - 0.5;
      const top = box.top + 0.5;
      const bottom = box.bottom - 0.5;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      let t0 = 0;
      let t1 = 1;
      for (const [p, q] of [
        [-dx, a.x - left],
        [dx, right - a.x],
        [-dy, a.y - top],
        [dy, bottom - a.y],
      ]) {
        if (p === 0) {
          if (q < 0) return false;
        } else {
          const t = q / p;
          if (p < 0) t0 = Math.max(t0, t);
          else t1 = Math.min(t1, t);
          if (t0 > t1) return false;
        }
      }
      return true;
    };
    // How far the segment a-b passes from (x, y).
    const distance = ({ a, b }, x, y) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = dx * dx + dy * dy;
      const t = length ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length)) : 0;
      return Math.hypot(a.x + t * dx - x, a.y + t * dy - y);
    };
    const meets = (a, b) =>
      a.left < b.right - 0.5 &&
      b.left < a.right - 0.5 &&
      a.top < b.bottom - 0.5 &&
      b.top < a.bottom - 0.5;
    const groups = [...svg.querySelectorAll("[data-point-id]")];
    const dots = groups.map((group) => ({
      id: group.getAttribute("data-point-id"),
      box: group.querySelector("[data-body]").getBoundingClientRect(),
    }));
    for (const group of groups) {
      const id = group.getAttribute("data-point-id");
      const label = group.querySelector("[data-label]").getBoundingClientRect();
      for (const segment of segments) {
        if (crosses(segment, label)) found.push(`"${id}" is crossed by ${segment.name}`);
      }
      for (const dot of dots) {
        if (dot.id !== id && meets(dot.box, label)) found.push(`"${id}" meets ${dot.id}'s dot`);
      }
      const badge = group.querySelector("[data-badge] circle");
      if (badge) {
        const box = badge.getBoundingClientRect();
        const x = (box.left + box.right) / 2;
        const y = (box.top + box.bottom) / 2;
        const r = (box.right - box.left) / 2;
        for (const segment of segments) {
          if (distance(segment, x, y) < r - 0.5) {
            found.push(`${id}'s badge is crossed by ${segment.name}`);
          }
        }
        for (const dot of dots) {
          if (dot.id !== id && meets(dot.box, box))
            found.push(`${id}'s badge meets ${dot.id}'s dot`);
        }
      }
    }
    return found;
  });
}

test("Geometry: the points are drawn to scale, one scale for both axes, y up", async ({ page }) => {
  const capture = CONVEX_HULL_GEOMETRY_FRAMES;
  await openGeometry(page, capture);
  const centres = await pointCentres(page);
  const points = capture.payload.points;
  const [a, b] = [points[0], points[1]];
  const scaleX = (centres[b.id].x - centres[a.id].x) / (b.x - a.x);
  for (const point of points) {
    expect(centres[point.id].x - centres[a.id].x).toBeCloseTo((point.x - a.x) * scaleX, 0);
    // The same scale for y, and y grows upward.
    expect(centres[a.id].y - centres[point.id].y).toBeCloseTo((point.y - a.y) * scaleX, 0);
  }
  // The axes' numbers are outside the plot, and the lines at 0 are drawn heavier.
  await expect(page.locator(`${GEOMETRY}-geometry [data-tick="x"]`).first()).toBeVisible();
  await expect(page.locator(`${GEOMETRY}-geometry [data-tick="y"]`).first()).toBeVisible();
  await expect(page.locator(`${GEOMETRY}-geometry [data-axis-line="x"]`)).toHaveCount(1);
  await expect(page.locator(`${GEOMETRY}-geometry [data-axis-line="y"]`)).toHaveCount(1);
});

test("Geometry: before Run the picture is the plain points, and step 1 keeps every point in place", async ({
  page,
}) => {
  const capture = CONVEX_HULL_GEOMETRY_FRAMES;
  await openGeometry(page, capture);
  const picture = page.locator(`${GEOMETRY}-geometry`);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(picture.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(
    picture.locator("[data-piece-role], [data-chain], [data-hull], [data-badge]"),
  ).toHaveCount(0);
  const before = await pointCentres(page);
  await runToFrame(page, capture, 0);
  expect(await pointCentres(page)).toEqual(before);
});

test("Geometry: a merge colors its left and right hulls, and walks its chain", async ({ page }) => {
  const capture = CONVEX_HULL_GEOMETRY_FRAMES;
  await openGeometry(page, capture);
  const index = capture.frames.findIndex(
    (frame) => frame.chain.length >= 2 && frame.pieces.some((piece) => piece.role === "left"),
  );
  expect(index).toBeGreaterThanOrEqual(0);
  await runToFrame(page, capture, index);
  const frame = capture.frames[index];
  const left = frame.pieces.find((piece) => piece.role === "left");
  const right = frame.pieces.find((piece) => piece.role === "right");
  await expect(geometryPoint(page, left.points[0])).toHaveAttribute("data-group", "0");
  await expect(geometryPoint(page, right.points[0])).toHaveAttribute("data-group", "2");
  await expect(legendBody(page)).toContainText("Left hull (being merged)");
  await expect(legendBody(page)).toContainText("Right hull (being merged)");
  await expect(legendBody(page)).toContainText("Blue line (the chain the merge has walked)");
});

test("Geometry: the answer's corners are green and numbered in order, the rest Covered", async ({
  page,
}) => {
  const capture = CONVEX_HULL_GEOMETRY_FRAMES;
  await openGeometry(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  const last = capture.frames.at(-1);
  expect(last.ok).toBe(true);
  for (const [position, id] of last.hull.entries()) {
    await expect(geometryPoint(page, id)).toHaveAttribute("data-state", "Solution");
    await expect(geometryPoint(page, id).locator("[data-badge]")).toHaveText(String(position + 1));
  }
  for (const point of capture.payload.points.filter((p) => !last.hull.includes(p.id))) {
    await expect(geometryPoint(page, point.id)).toHaveAttribute("data-state", "Covered");
  }
  await expect(page.locator(`${GEOMETRY}-geometry [data-hull]`)).toHaveAttribute("data-ok", "true");
  await expect(legendBody(page)).toContainText(
    "Numbered badge (the corner's place in the answer's order)",
  );
});

test("Geometry: hovering, focusing or tapping a point traces it, with its coordinates", async ({
  page,
}) => {
  const capture = CONVEX_HULL_GEOMETRY_FRAMES;
  await openGeometry(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  const [first, second] = capture.payload.points;
  await geometryPoint(page, first.id).hover();
  await expect(geometryPoint(page, first.id)).toHaveAttribute("data-traced", "trace");
  await expect(geometryPoint(page, second.id)).toHaveAttribute("data-traced", "faint");
  const faded = await geometryPoint(page, second.id).evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    filter: getComputedStyle(el).filter,
  }));
  expect(faded.opacity).toBe("1");
  expect(faded.filter).toContain("grayscale");
  const round = (value) => String(Number(value.toFixed(3)));
  await expect(page.locator(`${GEOMETRY}-geometry [data-tip]`)).toHaveText(
    `${first.id} (${round(first.x)}, ${round(first.y)})`,
  );
  await page.mouse.move(0, 0);
  await geometryPoint(page, second.id).focus();
  await expect(geometryPoint(page, second.id)).toHaveAttribute("data-traced", "trace");
  await page.keyboard.press("Enter");
  await expect(geometryPoint(page, second.id)).toHaveAttribute("aria-pressed", "true");
});

test("Geometry: on a phone a tap traces a point, also after zooming in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const capture = CONVEX_HULL_GEOMETRY_FRAMES;
  await openGeometry(page, capture);
  await page.locator("#workbench-panel-close").click();
  await expectFits(page, `${GEOMETRY}-svg`);
  await page.locator(`${GEOMETRY}-zoom-in`).click();
  await expect(page.locator(`${GEOMETRY}-zoom`)).toHaveAttribute("data-zoom", "1.50");
  const [first, second] = capture.payload.points;
  await geometryPoint(page, first.id).focus();
  await geometryPoint(page, first.id).blur();
  await geometryPoint(page, first.id).click();
  await expect(geometryPoint(page, first.id)).toHaveAttribute("aria-pressed", "true");
  await expect(geometryPoint(page, second.id)).toHaveAttribute("data-traced", "faint");
  await expectFits(page, `${GEOMETRY}-svg`);
});

for (const scheme of ["light", "dark"]) {
  for (const width of [390, 1080, 1280]) {
    test(`Geometry: draws at ${width} px in the ${scheme} theme without widening the page`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      await openGeometry(page, CONVEX_HULL_GEOMETRY_FRAMES);
      const svg = page.locator(`${GEOMETRY}-svg`);
      await expect(svg).toBeVisible();
      expect((await svg.boundingBox()).width).toBeGreaterThan(250);
      await expectFits(page, `${GEOMETRY}-svg`);
      await expect(page.locator(`${GEOMETRY}-zoom`)).toHaveAttribute("data-zoom", "1.00");
      // The numbers and the labels follow the theme: no dark-on-dark, no light-on-white.
      for (const selector of ["[data-tick]", "[data-label]"]) {
        const ink = await page
          .locator(`${GEOMETRY}-geometry ${selector}`)
          .first()
          .evaluate((el) => getComputedStyle(el).fill);
        const [r, g, b] = ink.match(/\d+/g).map(Number);
        expect((r + g + b) / 3 > 128, selector).toBe(scheme === "dark");
      }
    });
  }
}

for (const [key, capture] of Object.entries(GEOMETRY_CASES)) {
  for (const width of [1280, 390, 320]) {
    test(`Geometry: the ${key} capture's texts never meet each other, a line or a dot at ${width} px, before Run and at every step`, async ({
      page,
    }) => {
      test.slow();
      await page.setViewportSize({ width, height: 900 });
      await openGeometry(page, capture);
      if (width < 600) await page.locator("#workbench-panel-close").click();
      const clear = async () => [
        ...(await svgTextCollisions(page, `${GEOMETRY}-svg`, null)),
        ...(await geometryLineCollisions(page)),
      ];
      expect(await clear()).toEqual([]);
      await runToFrame(page, capture, 0);
      expect(await clear()).toEqual([]);
      for (let index = 1; index < capture.frames.length; index += 1) {
        await page.locator("#workbench-steps-next").click();
        await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
        expect(await clear()).toEqual([]);
      }
    });
  }
}

for (const key of ["hull", "wide"]) {
  test(`Geometry: on a 390 px phone the ${key} plot is drawn at its own size, every label at least ${PHONE_TEXT_PX} px`, async ({
    page,
  }) => {
    const capture = GEOMETRY_CASES[key];
    await page.setViewportSize({ width: 390, height: 900 });
    await openGeometry(page, capture);
    await page.locator("#workbench-panel-close").click();
    const drawn = await page.locator(`${GEOMETRY}-geometry`).getAttribute("data-drawing-width");
    expect(Number(drawn)).toBeLessThan(680);
    await expect(page.locator(`${GEOMETRY}-zoom`)).toHaveAttribute("data-zoom", "1.00");
    await expectFits(page, `${GEOMETRY}-svg`);
    const before = await smallestText(page, `${GEOMETRY}-svg`);
    expect(before.px, `"${before.text}" is ${before.px} px`).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
    await runToFrame(page, capture, capture.frames.length - 1);
    const after = await smallestText(page, `${GEOMETRY}-svg`);
    expect(after.px, `"${after.text}" is ${after.px} px`).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
  });
}

// --- #211: the Schedule renderer (Job Sequencing, Pump Scheduling) ------------------------------

const SCHEDULE = "#workbench-source-frames-schedule";

/**
 * Each schedule capture. Every capture is drawn on the 3SAT page (its visualization made to name
 * Schedule), as CI's backend may serve no Schedule visualization yet: the picture is the
 * capture's, whatever the page.
 */
const JOB_CASES = {
  jobs: JOB_SEQUENCING_SCHEDULE_FRAMES,
  jobsSmall: JOB_SEQUENCING_SMALL_SCHEDULE_FRAMES,
  jobsNone: JOB_SEQUENCING_NONE_SCHEDULE_FRAMES,
};
const PUMP_CASES = {
  pumpCm: PUMP_CM_SCHEDULE_FRAMES,
  pumpEm: PUMP_EM_SCHEDULE_FRAMES,
  pumpFractional: PUMP_CM_FRACTIONAL_SCHEDULE_FRAMES,
  pumpRounded: PUMP_CM_ROUNDED_SCHEDULE_FRAMES,
  pumpNone: PUMP_CM_NONE_SCHEDULE_FRAMES,
};
const SCHEDULE_CASES = { ...JOB_CASES, ...PUMP_CASES };

async function openSchedule(page, capture) {
  await setEveryPictureType(page, "Schedule");
  await openPicture(page, "3SAT", capture);
  await expect(page.locator(`${SCHEDULE}-schedule`)).toBeVisible();
}

const scheduleJob = (page, id) => page.locator(`${SCHEDULE}-schedule [data-job-id="${id}"]`);
const scheduleHour = (page, id) => page.locator(`${SCHEDULE}-schedule [data-hour-id="${id}"]`);
const scheduleHourHit = (page, id) => page.locator(`${SCHEDULE}-schedule [data-hour-hit="${id}"]`);

/** Goes to frame `index` (0-based) of a run already started, with the step slider's keys. */
async function toFrame(page, capture, index) {
  await page.locator("#workbench-steps-slider input").focus();
  await page.keyboard.press("Home");
  for (let step = 0; step < index; step += 1) await page.keyboard.press("ArrowRight");
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
}

/** Frame `index`'s jobs (state, start, end, late), checked job by job against the picture. */
async function expectJobsFrame(page, capture, index) {
  const frame = capture.frames[index];
  const drawn = await page
    .locator(`${SCHEDULE}-schedule [data-job-id]`)
    .evaluateAll((jobs) =>
      Object.fromEntries(
        jobs.map((job) => [
          job.getAttribute("data-job-id"),
          [
            job.getAttribute("data-state"),
            job.getAttribute("data-start"),
            job.getAttribute("data-end"),
            job.getAttribute("data-late"),
          ],
        ]),
      ),
    );
  const runs = new Map(frame.runs.map((run) => [run.job, run]));
  for (const job of capture.payload.jobs) {
    const run = runs.get(job.id);
    expect(drawn[job.id], job.id).toEqual([
      frame.jobs[job.id]?.state ?? "Background",
      run ? String(run.start) : null,
      run ? String(run.end) : null,
      run ? String(run.late) : null,
    ]);
  }
  await expect(page.locator(`${SCHEDULE}-schedule [data-late-part]`)).toHaveCount(
    frame.runs.filter((run) => run.late && run.end > Math.max(run.start, 0)).length,
  );
}

/**
 * Frame `index`'s pumps, hours, band, tank line and costs, checked cell by cell against the
 * picture.
 */
async function expectPumpsFrame(page, capture, index) {
  const frame = capture.frames[index];
  const picture = page.locator(`${SCHEDULE}-schedule`);
  const cells = await picture
    .locator("[data-cell-id]")
    .evaluateAll((all) =>
      Object.fromEntries(
        all.map((cell) => [
          cell.getAttribute("data-cell-id"),
          [cell.getAttribute("data-on"), cell.getAttribute("data-state")],
        ]),
      ),
    );
  const hours = await picture
    .locator("[data-hour-id]")
    .evaluateAll((all) =>
      Object.fromEntries(
        all.map((hour) => [
          hour.getAttribute("data-hour-id"),
          [hour.getAttribute("data-state"), hour.getAttribute("data-shown")],
        ]),
      ),
    );
  const { payload } = capture;
  for (const [h, hour] of payload.hours.entries()) {
    const run = frame.schedule[h];
    expect(hours[hour.id], hour.id).toEqual([
      frame.hours[hour.id]?.state ?? "Background",
      run ? String(h <= frame.upTo) : null,
    ]);
    for (const pump of payload.pumps) {
      const id = `${pump.id}${hour.id}`;
      expect(cells[id], id).toEqual([
        String(run?.on.includes(pump.id) ?? false),
        frame.cells[id]?.state ?? "Background",
      ]);
    }
  }
  const shown = frame.schedule.slice(0, frame.upTo + 1);
  await expect(picture.locator("[data-band]")).toHaveCount(
    !frame.schedule.length && frame.reached.length ? 1 : 0,
  );
  if (shown.length) {
    await expect(picture.locator("[data-tank-line]")).toHaveAttribute(
      "data-tank-line",
      String(shown.length),
    );
  } else {
    await expect(picture.locator("[data-tank-line]")).toHaveCount(0);
  }
  await expect(picture.locator("[data-startup]")).toHaveCount(
    shown.reduce((sum, hour) => sum + hour.starts.length, 0),
  );
  await expect(picture.locator("[data-cost]")).toHaveCount(
    shown.filter((hour) => hour.energy > 0).length,
  );
  const { capacity, minimum } = payload.tank;
  await expect(picture.locator("[data-tank-outside]")).toHaveCount(
    shown.filter((hour) => hour.level < minimum || hour.level > capacity).length,
  );
  await expect(picture.locator("[data-focus-hour]")).toHaveCount(
    frame.focus.filter((id) => payload.hours.some((hour) => hour.id === id)).length,
  );
}

for (const [key, capture] of Object.entries(SCHEDULE_CASES)) {
  test(`Schedule: the ${key} capture draws every row and every step as Redux sends it`, async ({
    page,
  }) => {
    // Every step of the run (a sample of the default Job Sequencing's 152), checked piece by
    // piece.
    test.slow();
    const { payload } = capture;
    const jobs = payload.rule === "jobSequencing";
    await openSchedule(page, capture);
    const picture = page.locator(`${SCHEDULE}-schedule`);
    await expect(picture).toHaveAttribute("data-rule", payload.rule);
    if (jobs) {
      await expect(picture.locator("[data-job-id]")).toHaveCount(payload.jobs.length);
      for (const job of payload.jobs) {
        await expect(scheduleJob(page, job.id).locator("[data-label]")).toHaveText(job.label);
        await expect(scheduleJob(page, job.id).locator("[data-deadline]")).toHaveAttribute(
          "data-deadline",
          String(job.deadline),
        );
        await expect(scheduleJob(page, job.id).locator("[data-penalty]")).toHaveText(
          String(job.penalty),
        );
      }
    } else {
      await expect(picture.locator("[data-pump-id]")).toHaveCount(payload.pumps.length);
      await expect(picture.locator("[data-cell-id]")).toHaveCount(24 * payload.pumps.length);
      await expect(picture.locator("[data-peak]")).toHaveCount(
        payload.hours.filter((hour) => hour.peak).length,
      );
      for (const pump of payload.pumps) {
        await expect(picture.locator(`[data-pump-id="${pump.id}"] [data-label]`)).toHaveText(
          pump.name,
        );
      }
    }
    // Nothing here can be dragged (#250 leaves a schedule's time axis alone).
    await expect(page.locator(`${SCHEDULE}-layout-reset`)).toHaveCount(0);
    await expect(page.locator(`${SCHEDULE}-svg`)).not.toHaveAttribute("data-editable", /./);

    const expectFrame = jobs ? expectJobsFrame : expectPumpsFrame;
    const count = capture.frames.length;
    if (count > 60) {
      // Too long to walk: Run opens on the last frame; then the first and the middle.
      await page.locator("#workbench-run").click();
      await expect(page.locator("#workbench-steps-position")).toHaveText(
        `Step ${count} of ${count}`,
      );
      await expectFrame(page, capture, count - 1);
      await expect(page.locator(`${CAPTION}-verdict`)).toHaveText(
        capture.frames.at(-1).ok ? "Verdict: yes" : "Verdict: no",
      );
      for (const index of [0, Math.floor(count / 2)]) {
        await toFrame(page, capture, index);
        await expectFrame(page, capture, index);
      }
    } else {
      await runToFrame(page, capture, 0);
      await expectFrame(page, capture, 0);
      for (let index = 1; index < count; index += 1) {
        await page.locator("#workbench-steps-next").click();
        await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
        await expectFrame(page, capture, index);
      }
      await expect(page.locator(`${CAPTION}-verdict`)).toHaveText(
        capture.frames.at(-1).ok ? "Verdict: yes" : "Verdict: no",
      );
    }
    for (const piece of await picture.locator("[data-focusable]").all()) {
      await expect(piece).toHaveAttribute("tabindex", "0");
      await expect(piece).toHaveAttribute("aria-label", jobs ? /^Job \d+: takes / : /^Hour \d+ \(/);
    }
  });
}

/** Each job's row and each pump's cells, drawn boxes by id, in viewBox units. */
function scheduleBoxes(page) {
  return page
    .locator(`${SCHEDULE}-schedule [data-job-id], ${SCHEDULE}-schedule [data-cell-id]`)
    .evaluateAll((all) =>
      Object.fromEntries(
        all.map((piece) => {
          const box = piece.getBBox();
          const id = piece.getAttribute("data-job-id") ?? piece.getAttribute("data-cell-id");
          return [id, `${box.x},${box.y},${box.height}`];
        }),
      ),
    );
}

test("Schedule: before Run the jobs are their deadlines alone, and step 1 keeps every row in place", async ({
  page,
}) => {
  const capture = JOB_SEQUENCING_SMALL_SCHEDULE_FRAMES;
  await openSchedule(page, capture);
  const picture = page.locator(`${SCHEDULE}-schedule`);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(picture.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(picture.locator("[data-run], [data-late-part]")).toHaveCount(0);
  await expect(picture.locator("[data-deadline]")).toHaveCount(capture.payload.jobs.length);
  // The axis runs to the payload's span.
  await expect(picture.locator("[data-tick]").filter({ hasText: /^0$/ })).toHaveCount(1);
  const before = await page
    .locator(`${SCHEDULE}-schedule [data-job-id] [data-label]`)
    .evaluateAll((labels) => labels.map((label) => label.getAttribute("y")));
  await runToFrame(page, capture, 0);
  expect(
    await page
      .locator(`${SCHEDULE}-schedule [data-job-id] [data-label]`)
      .evaluateAll((labels) => labels.map((label) => label.getAttribute("y"))),
  ).toEqual(before);
});

test("Schedule: before Run the pumps are all off with no tank line, and step 1 keeps every cell in place", async ({
  page,
}) => {
  const capture = PUMP_CM_SCHEDULE_FRAMES;
  await openSchedule(page, capture);
  const picture = page.locator(`${SCHEDULE}-schedule`);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(picture.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(picture.locator('[data-on="true"]')).toHaveCount(0);
  await expect(
    picture.locator(
      "[data-band], [data-tank-line], [data-cost], [data-startup], [data-budget-line]",
    ),
  ).toHaveCount(0);
  // The tank's start, and its capacity marked on the axis.
  await expect(picture.locator("[data-tank-start]")).toHaveCount(1);
  await expect(picture.locator('[data-mark="capacity"]')).toHaveText("10,000");
  const before = await scheduleBoxes(page);
  await runToFrame(page, capture, 0);
  expect(await scheduleBoxes(page)).toEqual(before);
});

test("Schedule: a late job's bar turns solid red past its deadline, and its penalty counts", async ({
  page,
}) => {
  const capture = JOB_SEQUENCING_SMALL_SCHEDULE_FRAMES;
  await openSchedule(page, capture);
  await runToFrame(page, capture, 0);
  const frame = capture.frames[0];
  const late = frame.runs.filter((run) => run.late);
  expect(late.length).toBeGreaterThan(0);
  for (const run of late) {
    await expect(scheduleJob(page, run.job)).toHaveAttribute("data-state", "Rejected");
    await expect(scheduleJob(page, run.job).locator("[data-late-part]")).toHaveCount(1);
    await expect(scheduleJob(page, run.job).locator("[data-penalty]")).toHaveAttribute(
      "font-weight",
      "700",
    );
  }
  await expect(page.locator(`${SCHEDULE}-readout`)).toHaveText(
    `Late penalty ${frame.penalty} (K = ${capture.payload.k}). Hover or tap a job to read it.`,
  );
  await expect(legendBody(page)).toContainText(
    "Tick (the job's deadline; red once the job runs past it)",
  );
  await expect(legendBody(page)).toContainText(
    "Solid red end (the part after the deadline: the job is late and its penalty counts)",
  );
  // The answer keeps its late job Rejected among the Solution ones.
  await toFrame(page, capture, capture.frames.length - 1);
  const last = capture.frames.at(-1);
  for (const run of last.runs) {
    await expect(scheduleJob(page, run.job)).toHaveAttribute(
      "data-state",
      run.late ? "Rejected" : "Solution",
    );
  }
});

test("Schedule: the forward pass grows its band hour by hour, and the replay draws the hours one at a time", async ({
  page,
}) => {
  const capture = PUMP_CM_SCHEDULE_FRAMES;
  await openSchedule(page, capture);
  const picture = page.locator(`${SCHEDULE}-schedule`);
  await runToFrame(page, capture, 3);
  await expect(picture.locator("[data-band]")).toHaveAttribute("data-band", "4");
  await expect(scheduleHour(page, "t3")).toHaveAttribute("data-state", "ElementHighlight");
  await expect(picture.locator('[data-focus-hour="t3"]')).toHaveCount(1);
  await expect(legendBody(page)).toContainText(
    "Band (the tank levels the forward pass can still reach)",
  );
  // A replay step: the hours after it are faded by color and have no tank level or cost yet.
  const replay = capture.frames.findIndex((frame) => frame.schedule.length && frame.upTo === 5);
  expect(replay).toBeGreaterThan(0);
  await toFrame(page, capture, replay);
  await expect(picture.locator("[data-band]")).toHaveCount(0);
  await expect(picture.locator("[data-tank-line]")).toHaveAttribute("data-tank-line", "6");
  await expect(scheduleHour(page, "t9")).toHaveAttribute("data-shown", "false");
  const faded = await scheduleHour(page, "t9").evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    filter: getComputedStyle(el).filter,
  }));
  expect(faded.opacity).toBe("1");
  expect(faded.filter).toContain("grayscale");
  await expect(picture.locator('[data-cell-id="P1t9"]')).toHaveAttribute("data-state", "Committed");
  // Hour 0 starts two pumps: a corner mark each, and a startup cap on its cost.
  await expect(picture.locator("[data-startup]")).toHaveCount(2);
  await expect(picture.locator('[data-startup-cost="t0"]')).toHaveCount(1);
  await expect(page.locator(`${SCHEDULE}-readout`)).toHaveText(
    "Hours 0 to 5: $11.36. Hover or tap an hour to read it.",
  );
  // The answer: every hour drawn, the pumps that run Solution.
  await toFrame(page, capture, capture.frames.length - 1);
  await expect(picture.locator('[data-cell-id="P1t0"]')).toHaveAttribute("data-state", "Solution");
  await expect(picture.locator('[data-shown="false"]')).toHaveCount(0);
  await expect(page.locator(`${SCHEDULE}-readout`)).toHaveText(
    "Total $32.12. Hover or tap an hour to read it.",
  );
  for (const text of [
    "Shaded hour (peak tariff: power costs more)",
    "Dashed line (the tank's capacity)",
    "Tank line (gallons at the end of each hour)",
    "Corner mark and bar cap (a pump starts and pays its startup cost)",
  ]) {
    await expect(legendBody(page)).toContainText(text);
  }
});

test("Schedule: Emergency Resilience marks its minimum and charts the share of its budget spent", async ({
  page,
}) => {
  const capture = PUMP_EM_SCHEDULE_FRAMES;
  await openSchedule(page, capture);
  const picture = page.locator(`${SCHEDULE}-schedule`);
  await expect(picture.locator('[data-mark="minimum"]')).toHaveText("2,000");
  await expect(picture.locator('[data-limit="minimum"]')).toHaveCount(1);
  await page.locator("#workbench-run").click();
  const count = capture.frames.length;
  await expect(page.locator("#workbench-steps-position")).toHaveText(`Step ${count} of ${count}`);
  await expect(picture.locator("[data-budget-line]")).toHaveAttribute("data-budget-line", "24");
  for (const text of ["0%", "50%", "100%"]) {
    await expect(
      picture.locator("[data-tick]").filter({ hasText: new RegExp(`^${text}$`) }),
    ).toHaveCount(1);
  }
  await expect(page.locator(`${SCHEDULE}-readout`)).toHaveText(
    "Total $55.55 of a $55.86 budget. Hover or tap an hour to read it.",
  );
  await expect(legendBody(page)).toContainText("Red dashed line (the tank's minimum)");
  await expect(legendBody(page)).toContainText(
    "Violet line, right axis (the share of the budget spent so far)",
  );
});

test("Schedule: fractional gallons read as the instance wrote them, and a day ending at exactly 0 stays within the limits", async ({
  page,
}) => {
  const capture = PUMP_CM_FRACTIONAL_SCHEDULE_FRAMES;
  await openSchedule(page, capture);
  const picture = page.locator(`${SCHEDULE}-schedule`);
  await expect(picture.locator("[data-demand]").first()).toHaveText("0.3");
  await expect(picture.locator('[data-pump-id="P1"]')).toContainText("0.1 gph");
  await expect(picture.locator('[data-mark="capacity"]')).toHaveText("2.5");
  await page.locator("#workbench-run").click();
  const last = capture.frames.at(-1);
  expect(last.schedule.at(-1).level).toBe(0);
  await expect(picture.locator("[data-tank-outside]")).toHaveCount(0);
  await expect(picture.locator('[data-hour-id][data-state="Rejected"]')).toHaveCount(0);
  await scheduleHourHit(page, "t23").hover();
  await expect(page.locator(`${SCHEDULE}-readout`)).toHaveText(
    "Hour 23 (23:00, $0.06/kWh): demand 0.3 gal; no pump on; in 0, tank 0 gal; cost $0.00",
  );
});

test("Schedule: a schedule that drains the tank shows its hours Rejected, with a red dot at each level", async ({
  page,
}) => {
  const capture = PUMP_CM_ROUNDED_SCHEDULE_FRAMES;
  await openSchedule(page, capture);
  const picture = page.locator(`${SCHEDULE}-schedule`);
  await page.locator("#workbench-run").click();
  const last = capture.frames.at(-1);
  const rejected = Object.keys(last.hours).filter((id) => last.hours[id].state === "Rejected");
  expect(rejected.length).toBeGreaterThan(0);
  await expect(picture.locator('[data-hour-id][data-state="Rejected"]')).toHaveCount(
    rejected.length,
  );
  await expect(picture.locator("[data-hour-tint]")).toHaveCount(rejected.length);
  await expect(picture.locator("[data-tank-outside]")).toHaveCount(rejected.length);
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: no");
  // The tank's scale reaches down to the lowest level, so the line stays on the chart.
  const lowest = Math.min(...last.schedule.map((hour) => hour.level));
  const scale = picture.locator('[data-layer="tank"]');
  expect(Number(await scale.getAttribute("data-low"))).toBeLessThanOrEqual(lowest);
  await expect(picture.locator("[data-tick]").filter({ hasText: /^-5$/ })).toHaveCount(1);
  await expect(legendBody(page)).toContainText(
    "Red dot (the tank leaves its limits at the end of that hour)",
  );
});

test("Schedule: a forward pass where no state survives ends with its last hour Rejected, and no", async ({
  page,
}) => {
  const capture = PUMP_CM_NONE_SCHEDULE_FRAMES;
  await openSchedule(page, capture);
  const picture = page.locator(`${SCHEDULE}-schedule`);
  const dead = capture.frames.findIndex((frame) => frame.event === "Reject");
  await runToFrame(page, capture, dead);
  const hour = capture.frames[dead].focus[0];
  await expect(scheduleHour(page, hour)).toHaveAttribute("data-state", "Rejected");
  await expect(picture.locator(`[data-focus-hour="${hour}"] rect`).first()).toHaveAttribute(
    "stroke",
    /rejected/,
  );
  await expect(picture.locator("[data-band]")).toHaveAttribute(
    "data-band",
    String(capture.frames[dead].reached.length),
  );
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: no");
  await expect(picture.locator("[data-tank-line]")).toHaveCount(0);
});

test("Schedule: hovering, focusing or tapping a job traces it and reads it out, the rest fading by color", async ({
  page,
}) => {
  const capture = JOB_SEQUENCING_SMALL_SCHEDULE_FRAMES;
  await openSchedule(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  await scheduleJob(page, "J2").hover();
  await expect(scheduleJob(page, "J2")).toHaveAttribute("data-traced", "trace");
  await expect(scheduleJob(page, "J0")).toHaveAttribute("data-traced", "faint");
  const faded = await scheduleJob(page, "J0").evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    filter: getComputedStyle(el).filter,
  }));
  expect(faded.opacity).toBe("1");
  expect(faded.filter).toContain("grayscale");
  await expect(page.locator(`${SCHEDULE}-readout`)).toHaveText(
    "Job 2: takes 4, due 4, penalty 6; runs 3 to 7, late",
  );
  await page.mouse.move(0, 0);
  await scheduleJob(page, "J1").focus();
  await expect(scheduleJob(page, "J1")).toHaveAttribute("data-traced", "trace");
  await page.keyboard.press("Enter");
  await expect(scheduleJob(page, "J1")).toHaveAttribute("aria-pressed", "true");
});

test("Schedule: hovering, focusing or tapping an hour traces its column and reads it out", async ({
  page,
}) => {
  const capture = PUMP_CM_SCHEDULE_FRAMES;
  await openSchedule(page, capture);
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-steps-position")).toHaveText(/^Step 50 of 50$/);
  await scheduleHourHit(page, "t9").hover();
  await expect(scheduleHour(page, "t9")).toHaveAttribute("data-traced", "trace");
  await expect(scheduleHour(page, "t3")).toHaveAttribute("data-traced", "faint");
  await expect(page.locator(`${SCHEDULE}-schedule [data-trace-hour="t9"]`)).toHaveCount(1);
  await expect(page.locator(`${SCHEDULE}-readout`)).toHaveText(
    "Hour 9 (09:00, peak, $0.12/kWh): demand 1,000 gal; PumpA and PumpB on; in 550, tank 3,700 gal; cost $1.62",
  );
  await page.mouse.move(0, 0);
  await scheduleHourHit(page, "t2").focus();
  await expect(scheduleHour(page, "t2")).toHaveAttribute("data-traced", "trace");
  await page.keyboard.press("Enter");
  await expect(scheduleHourHit(page, "t2")).toHaveAttribute("aria-pressed", "true");
});

test("Schedule: on a phone a tap traces an hour, also after zooming in", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const capture = PUMP_EM_SCHEDULE_FRAMES;
  await openSchedule(page, capture);
  await page.locator("#workbench-panel-close").click();
  await expectFits(page, `${SCHEDULE}-svg`);
  await page.locator(`${SCHEDULE}-zoom-in`).click();
  await expect(page.locator(`${SCHEDULE}-zoom`)).toHaveAttribute("data-zoom", "1.50");
  await scheduleHourHit(page, "t12").focus();
  await scheduleHourHit(page, "t12").blur();
  await scheduleHourHit(page, "t12").click();
  await expect(scheduleHourHit(page, "t12")).toHaveAttribute("aria-pressed", "true");
  await expect(scheduleHour(page, "t0")).toHaveAttribute("data-traced", "faint");
  await expectFits(page, `${SCHEDULE}-svg`);
});

for (const scheme of ["light", "dark"]) {
  for (const width of [390, 1080, 1280]) {
    test(`Schedule: draws at ${width} px in the ${scheme} theme without widening the page`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      for (const capture of [PUMP_EM_SCHEDULE_FRAMES, JOB_SEQUENCING_SCHEDULE_FRAMES]) {
        await openSchedule(page, capture);
        const svg = page.locator(`${SCHEDULE}-svg`);
        await expect(svg).toBeVisible();
        expect((await svg.boundingBox()).width).toBeGreaterThan(250);
        await expectFits(page, `${SCHEDULE}-svg`);
        await expect(page.locator(`${SCHEDULE}-zoom`)).toHaveAttribute("data-zoom", "1.00");
        // The labels and the numbers follow the theme: no dark-on-dark, no light-on-white.
        for (const selector of ["[data-label]", "[data-tick]", "[data-head]"]) {
          const ink = await page
            .locator(`${SCHEDULE}-schedule ${selector}`)
            .first()
            .evaluate((el) => getComputedStyle(el).fill);
          const [r, g, b] = ink.match(/\d+/g).map(Number);
          expect((r + g + b) / 3 > 128, selector).toBe(scheme === "dark");
        }
      }
    });
  }
}

/**
 * Every place where a text of `svg` meets a line or a marker drawn in it, read off the screen.
 * A line is the centre line of a <line>, a <polyline>, a <polygon>, an M / L <path> or the
 * outline of a <rect> drawn with no fill; a marker is a filled <circle>, <rect> or <path> (a bar,
 * a cell, a dot, a startup mark, a badge) outside its own text's group, so a piece's body and
 * its own label never count. Transparent hit areas and the tints behind a picture
 * (`[data-layer="shade"]`) are neither.
 * @returns {Promise<string[]>} One line per collision; empty when every text is clear.
 */
function drawnCollisions(page, svgSelector) {
  return page.locator(svgSelector).evaluate((svg) => {
    const found = [];
    const toScreen = (element, x, y) => {
      const point = svg.createSVGPoint();
      point.x = x;
      point.y = y;
      return point.matrixTransform(element.getScreenCTM());
    };
    const filled = (element) => {
      const fill = element.getAttribute("fill");
      return fill !== null && fill !== "none" && fill !== "transparent";
    };
    const stroked = (element) => {
      const stroke = element.getAttribute("stroke");
      return stroke !== null && stroke !== "none" && stroke !== "transparent";
    };
    const nameOf = (element) =>
      `${element.tagName}${[...element.attributes]
        .filter((attribute) => attribute.name.startsWith("data-"))
        .map((attribute) => `[${attribute.name}${attribute.value ? `=${attribute.value}` : ""}]`)
        .join("")}`;
    const inShade = (element) => element.closest('[data-layer="shade"]') !== null;
    const segments = [];
    const addPoints = (element, list, closed) => {
      const corners = list.map(([x, y]) => toScreen(element, x, y));
      const count = closed ? corners.length : corners.length - 1;
      for (let i = 0; i < count; i += 1) {
        segments.push({ element, a: corners[i], b: corners[(i + 1) % corners.length] });
      }
    };
    for (const element of svg.querySelectorAll("line, polyline, polygon, path, rect")) {
      if (inShade(element) || !stroked(element)) continue;
      const value = (name) => Number(element.getAttribute(name));
      if (element.tagName === "line") {
        addPoints(
          element,
          [
            [value("x1"), value("y1")],
            [value("x2"), value("y2")],
          ],
          false,
        );
      } else if (element.tagName === "polyline" || element.tagName === "polygon") {
        const list = element
          .getAttribute("points")
          .trim()
          .split(/\s+/)
          .map((pair) => pair.split(",").map(Number));
        addPoints(element, list, element.tagName === "polygon");
      } else if (element.tagName === "path" && !filled(element)) {
        // Each M starts a new run of L segments.
        const runs = [];
        for (const [, command, args] of element
          .getAttribute("d")
          .matchAll(/([MLml])\s*([-\d.,\s]+)/g)) {
          const [x, y] = args
            .trim()
            .split(/[\s,]+/)
            .map(Number);
          if (command === "M" || command === "m" || !runs.length) runs.push([]);
          runs.at(-1).push([x, y]);
        }
        for (const run of runs) addPoints(element, run, false);
      } else if (element.tagName === "rect" && !filled(element)) {
        const x = value("x");
        const y = value("y");
        const w = value("width");
        const h = value("height");
        addPoints(
          element,
          [
            [x, y],
            [x + w, y],
            [x + w, y + h],
            [x, y + h],
          ],
          true,
        );
      }
    }
    const markers = [...svg.querySelectorAll("circle, rect, path")].filter(
      (element) => filled(element) && !inShade(element),
    );
    // Whether the segment a-b passes through the box (shrunk half a pixel): Liang-Barsky.
    const crosses = ({ a, b }, box) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      let t0 = 0;
      let t1 = 1;
      for (const [p, q] of [
        [-dx, a.x - (box.left + 0.5)],
        [dx, box.right - 0.5 - a.x],
        [-dy, a.y - (box.top + 0.5)],
        [dy, box.bottom - 0.5 - a.y],
      ]) {
        if (p === 0) {
          if (q < 0) return false;
        } else {
          const t = q / p;
          if (p < 0) t0 = Math.max(t0, t);
          else t1 = Math.min(t1, t);
          if (t0 > t1) return false;
        }
      }
      return true;
    };
    const meets = (a, b) =>
      a.left < b.right - 0.5 &&
      b.left < a.right - 0.5 &&
      a.top < b.bottom - 0.5 &&
      b.top < a.bottom - 0.5;
    for (const text of svg.querySelectorAll("text")) {
      if (!text.textContent.trim()) continue;
      const box = text.getBoundingClientRect();
      const own = text.parentElement;
      for (const segment of segments) {
        if (!own.contains(segment.element) && crosses(segment, box)) {
          found.push(`"${text.textContent}" is crossed by ${nameOf(segment.element)}`);
        }
      }
      for (const marker of markers) {
        if (marker.parentElement.contains(text)) continue;
        if (meets(marker.getBoundingClientRect(), box)) {
          found.push(`"${text.textContent}" meets ${nameOf(marker)}`);
        }
      }
    }
    return found;
  });
}

for (const [key, capture] of Object.entries(SCHEDULE_CASES)) {
  for (const width of [1280, 390, 320]) {
    test(`Schedule: the ${key} capture's texts never meet each other, a line or a mark at ${width} px, before Run and at every step`, async ({
      page,
    }) => {
      test.slow();
      await page.setViewportSize({ width, height: 900 });
      await openSchedule(page, capture);
      if (width < 600) await page.locator("#workbench-panel-close").click();
      const clear = async () => [
        ...(await svgTextCollisions(page, `${SCHEDULE}-svg`, null)),
        ...(await drawnCollisions(page, `${SCHEDULE}-svg`)),
      ];
      expect(await clear()).toEqual([]);
      const count = capture.frames.length;
      if (count > 60) {
        // Too long to walk: the first, the middle and the last frames.
        await page.locator("#workbench-run").click();
        await expect(page.locator("#workbench-steps-position")).toHaveText(
          `Step ${count} of ${count}`,
        );
        expect(await clear()).toEqual([]);
        for (const index of [0, Math.floor(count / 2)]) {
          await toFrame(page, capture, index);
          expect(await clear()).toEqual([]);
        }
        return;
      }
      await runToFrame(page, capture, 0);
      expect(await clear()).toEqual([]);
      for (let index = 1; index < count; index += 1) {
        await page.locator("#workbench-steps-next").click();
        await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
        expect(await clear()).toEqual([]);
      }
    });
  }
}

for (const key of ["jobs", "pumpCm", "pumpEm", "pumpFractional"]) {
  test(`Schedule: on a 390 px phone the ${key} picture is drawn at its own size, every label at least ${PHONE_TEXT_PX} px`, async ({
    page,
  }) => {
    const capture = SCHEDULE_CASES[key];
    await page.setViewportSize({ width: 390, height: 900 });
    await openSchedule(page, capture);
    await page.locator("#workbench-panel-close").click();
    const drawn = await page.locator(`${SCHEDULE}-schedule`).getAttribute("data-drawing-width");
    expect(Number(drawn)).toBeLessThan(760);
    await expect(page.locator(`${SCHEDULE}-zoom`)).toHaveAttribute("data-zoom", "1.00");
    await expectFits(page, `${SCHEDULE}-svg`);
    const before = await smallestText(page, `${SCHEDULE}-svg`);
    expect(before.px, `"${before.text}" is ${before.px} px`).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
    await page.locator("#workbench-run").click();
    const count = capture.frames.length;
    await expect(page.locator("#workbench-steps-position")).toHaveText(`Step ${count} of ${count}`);
    const after = await smallestText(page, `${SCHEDULE}-svg`);
    expect(after.px, `"${after.text}" is ${after.px} px`).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
  });
}

// --- #213: the Tripartite Matching renderer (3-Dimensional Matching) ----------------------------

const TRIPARTITE = "#workbench-source-frames-tripartitematching";

/**
 * Each 3-Dimensional Matching capture. Every capture is drawn on the 3SAT page (its
 * visualization made to name TripartiteMatching), as CI's backend may serve no Tripartite
 * Matching visualization yet: the picture is the capture's, whatever the page.
 */
const TRIPARTITE_CASES = {
  bruteForce: DM3_TRIPARTITE_FRAMES,
  backtracking: DM3_BACKTRACKING_TRIPARTITE_FRAMES,
  wide: DM3_WIDE_TRIPARTITE_FRAMES,
  none: DM3_NONE_TRIPARTITE_FRAMES,
};

async function openTripartite(page, capture) {
  await setEveryPictureType(page, "TripartiteMatching");
  await openPicture(page, "3SAT", capture);
  await expect(page.locator(`${TRIPARTITE}-tripartite`)).toBeVisible();
}

const tripartiteElement = (page, id) =>
  page.locator(`${TRIPARTITE}-tripartite [data-element-id="${id}"]`);
const tripartiteRow = (page, id) =>
  page.locator(`${TRIPARTITE}-tripartite [data-triple-id="${id}"]`);
const tripartiteLine = (page, id) =>
  page.locator(`${TRIPARTITE}-tripartite [data-triple-line="${id}"]`);

/** Every name of a payload, X then Y then Z. */
const namesOf = (payload) => [...payload.x, ...payload.y, ...payload.z];

/** Frame `index`'s names, triples, badges and choices, checked one by one against the picture. */
async function expectTripartiteFrame(page, capture, index) {
  const frame = capture.frames[index];
  const picture = page.locator(`${TRIPARTITE}-tripartite`);
  const elements = await picture
    .locator("[data-element-id]")
    .evaluateAll((all) =>
      Object.fromEntries(
        all.map((element) => [
          element.getAttribute("data-element-id"),
          [
            element.getAttribute("data-state"),
            element.querySelector("[data-repeat]")?.getAttribute("data-repeat") ?? null,
          ],
        ]),
      ),
    );
  for (const element of namesOf(capture.payload)) {
    expect(elements[element.id], element.id).toEqual([
      frame.elements[element.id]?.state ?? "Background",
      frame.repeats[element.id] ? String(frame.repeats[element.id]) : null,
    ]);
  }
  const triples = await picture.locator("[data-triple-id]").evaluateAll((all) =>
    Object.fromEntries(
      all.map((row) => {
        const id = row.getAttribute("data-triple-id");
        const line = row.ownerSVGElement.querySelector(`[data-triple-line="${id}"]`);
        return [
          id,
          [row.getAttribute("data-state"), line.getAttribute("data-state"), row.dataset.chosen],
        ];
      }),
    ),
  );
  const chosen = new Set(frame.chosen);
  for (const triple of capture.payload.triples) {
    const state = frame.triples[triple.id]?.state ?? "Background";
    expect(triples[triple.id], triple.id).toEqual([
      state,
      state,
      chosen.has(triple.id) ? "true" : undefined,
    ]);
  }
}

for (const [key, capture] of Object.entries(TRIPARTITE_CASES)) {
  test(`Tripartite Matching: the ${key} capture draws every name and triple, and every step`, async ({
    page,
  }) => {
    test.slow();
    const { payload } = capture;
    await openTripartite(page, capture);
    const picture = page.locator(`${TRIPARTITE}-tripartite`);
    await expect(picture.locator("[data-element-id]")).toHaveCount(namesOf(payload).length);
    await expect(picture.locator("[data-triple-id]")).toHaveCount(payload.triples.length);
    await expect(picture.locator("[data-triple-line]")).toHaveCount(payload.triples.length);
    for (const element of namesOf(payload)) {
      await expect(tripartiteElement(page, element.id).locator("[data-label]")).toHaveText(
        element.name,
      );
    }
    const names = new Map(namesOf(payload).map((element) => [element.id, element.name]));
    for (const triple of payload.triples) {
      await expect(tripartiteRow(page, triple.id).locator("[data-names]")).toHaveText(
        [triple.x, triple.y, triple.z].map((id) => names.get(id)).join(" · "),
      );
    }

    await runToFrame(page, capture, 0);
    await expectTripartiteFrame(page, capture, 0);
    for (let index = 1; index < capture.frames.length; index += 1) {
      await page.locator("#workbench-steps-next").click();
      await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
      await expectTripartiteFrame(page, capture, index);
    }
    const last = capture.frames.at(-1);
    await expect(page.locator(`${CAPTION}-verdict`)).toHaveText(
      last.ok ? "Verdict: yes" : "Verdict: no",
    );
    for (const piece of await picture.locator("[data-focusable]").all()) {
      await expect(piece).toHaveAttribute("tabindex", "0");
      await expect(piece).toHaveAttribute("aria-label", /^(T\d+: |\S+ in [XYZ], )/);
    }
  });
}

/** Each name's pill and each list row, drawn boxes by id, in viewBox units. */
function tripartiteBoxes(page) {
  return page
    .locator(
      `${TRIPARTITE}-tripartite [data-element-id], ${TRIPARTITE}-tripartite [data-triple-id]`,
    )
    .evaluateAll((all) =>
      Object.fromEntries(
        all.map((piece) => {
          const box = piece.querySelector("[data-body]").getBBox();
          const id = piece.getAttribute("data-element-id") ?? piece.getAttribute("data-triple-id");
          return [id, `${box.x},${box.y},${box.width},${box.height}`];
        }),
      ),
    );
}

test("Tripartite Matching: before Run the picture is the plain instance, and step 1 keeps it in place", async ({
  page,
}) => {
  const capture = DM3_TRIPARTITE_FRAMES;
  await openTripartite(page, capture);
  const picture = page.locator(`${TRIPARTITE}-tripartite`);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(picture.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(picture.locator("[data-repeat], [data-chosen]")).toHaveCount(0);
  // Wide enough at 1280 px for the list to sit beside the columns.
  await expect(picture).toHaveAttribute("data-wide", "true");
  const before = await tripartiteBoxes(page);
  await runToFrame(page, capture, 0);
  expect(await tripartiteBoxes(page)).toEqual(before);
});

test("Tripartite Matching: a name used three times is Rejected with a ×3 badge, and the triples sharing a name are Blocked", async ({
  page,
}) => {
  const capture = DM3_TRIPARTITE_FRAMES;
  await openTripartite(page, capture);
  const index = capture.frames.findIndex((frame) =>
    Object.values(frame.repeats).some((count) => count === 3),
  );
  expect(index).toBeGreaterThanOrEqual(0);
  await runToFrame(page, capture, index);
  const frame = capture.frames[index];
  const [id] = Object.entries(frame.repeats).find(([, count]) => count === 3);
  await expect(tripartiteElement(page, id)).toHaveAttribute("data-state", "Rejected");
  await expect(tripartiteElement(page, id).locator("[data-repeat]")).toHaveText("×3");
  const blocked = Object.keys(frame.triples).filter((t) => frame.triples[t].state === "Blocked");
  expect(blocked.length).toBeGreaterThan(0);
  for (const triple of blocked) {
    await expect(tripartiteLine(page, triple)).toHaveAttribute("stroke-dasharray", "4 4");
  }
  await expect(legendBody(page)).toContainText("×2 badge (how many chosen triples use the name)");
  await expect(legendBody(page)).toContainText(
    "Line (a triple of M, through one name of each of X, Y and Z)",
  );
  await expect(legendBody(page)).toContainText("Blocked (can't be picked)");
});

test("Tripartite Matching: backtracking keeps its choices Committed, and the answer turns them Solution", async ({
  page,
}) => {
  const capture = DM3_BACKTRACKING_TRIPARTITE_FRAMES;
  await openTripartite(page, capture);
  const index = capture.frames.findIndex((frame) =>
    Object.values(frame.triples).some((triple) => triple.state === "Committed"),
  );
  await runToFrame(page, capture, index);
  const [committed] = Object.entries(capture.frames[index].triples).find(
    ([, triple]) => triple.state === "Committed",
  );
  await expect(tripartiteLine(page, committed)).toHaveAttribute("stroke-dasharray", "8 4");
  await expect(tripartiteRow(page, committed)).toHaveAttribute("data-chosen", "true");
  await toFrame(page, capture, capture.frames.length - 1);
  for (const id of capture.frames.at(-1).chosen) {
    await expect(tripartiteRow(page, id)).toHaveAttribute("data-state", "Solution");
    await expect(tripartiteLine(page, id)).toHaveAttribute("data-state", "Solution");
  }
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: yes");
});

test("Tripartite Matching: hovering, focusing or tapping a name traces its triples, the rest fading by color", async ({
  page,
}) => {
  const capture = DM3_TRIPARTITE_FRAMES;
  await openTripartite(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  // Paul (x1) is in T1 and T2: T1's names and T2's stay, the rest fade.
  await tripartiteElement(page, "x1").hover();
  await expect(tripartiteElement(page, "x1")).toHaveAttribute("data-traced", "trace");
  for (const id of ["y1", "z1", "y2", "z3"]) {
    await expect(tripartiteElement(page, id)).toHaveAttribute("data-traced", "trace");
  }
  await expect(tripartiteElement(page, "x2")).toHaveAttribute("data-traced", "faint");
  await expect(tripartiteLine(page, "T1")).toHaveAttribute("data-traced", "trace");
  await expect(tripartiteLine(page, "T3")).toHaveAttribute("data-traced", "faint");
  await expect(tripartiteRow(page, "T4")).toHaveAttribute("data-traced", "faint");
  const faded = await tripartiteElement(page, "x2").evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    filter: getComputedStyle(el).filter,
  }));
  expect(faded.opacity).toBe("1");
  expect(faded.filter).toContain("grayscale");
  // A list row traces its three names.
  await page.mouse.move(0, 0);
  await tripartiteRow(page, "T6").hover();
  for (const id of ["x3", "y3", "z1"]) {
    await expect(tripartiteElement(page, id)).toHaveAttribute("data-traced", "trace");
  }
  await expect(tripartiteElement(page, "x1")).toHaveAttribute("data-traced", "faint");
  await page.mouse.move(0, 0);
  await tripartiteRow(page, "T2").focus();
  await expect(tripartiteRow(page, "T2")).toHaveAttribute("data-traced", "trace");
  await page.keyboard.press("Enter");
  await expect(tripartiteRow(page, "T2")).toHaveAttribute("aria-pressed", "true");
});

test("Tripartite Matching: on a phone the list goes under the columns, and a tap traces a name after zooming in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const capture = DM3_WIDE_TRIPARTITE_FRAMES;
  await openTripartite(page, capture);
  await page.locator("#workbench-panel-close").click();
  await expect(page.locator(`${TRIPARTITE}-tripartite`)).toHaveAttribute("data-wide", "false");
  await expectFits(page, `${TRIPARTITE}-svg`);
  await page.locator(`${TRIPARTITE}-zoom-in`).click();
  await expect(page.locator(`${TRIPARTITE}-zoom`)).toHaveAttribute("data-zoom", "1.50");
  await tripartiteElement(page, "y3").focus();
  await tripartiteElement(page, "y3").blur();
  await tripartiteElement(page, "y3").click();
  await expect(tripartiteElement(page, "y3")).toHaveAttribute("aria-pressed", "true");
  await expect(tripartiteElement(page, "x1")).toHaveAttribute("data-traced", "faint");
  await expectFits(page, `${TRIPARTITE}-svg`);
});

for (const scheme of ["light", "dark"]) {
  for (const width of [390, 1080, 1280]) {
    test(`Tripartite Matching: draws at ${width} px in the ${scheme} theme without widening the page`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      await openTripartite(page, DM3_TRIPARTITE_FRAMES);
      const svg = page.locator(`${TRIPARTITE}-svg`);
      await expect(svg).toBeVisible();
      expect((await svg.boundingBox()).width).toBeGreaterThan(250);
      await expectFits(page, `${TRIPARTITE}-svg`);
      await expect(page.locator(`${TRIPARTITE}-zoom`)).toHaveAttribute("data-zoom", "1.00");
      // The names, the heads and the list follow the theme: no dark-on-dark, no light-on-white.
      for (const selector of ["[data-label]", "[data-head]", "[data-names]"]) {
        const ink = await page
          .locator(`${TRIPARTITE}-tripartite ${selector}`)
          .first()
          .evaluate((el) => getComputedStyle(el).fill);
        const [r, g, b] = ink.match(/\d+/g).map(Number);
        expect((r + g + b) / 3 > 128, selector).toBe(scheme === "dark");
      }
    });
  }
}

for (const [key, capture] of Object.entries(TRIPARTITE_CASES)) {
  for (const width of [1280, 390, 320]) {
    test(`Tripartite Matching: the ${key} capture's texts never meet each other, a line or a badge at ${width} px, before Run and at every step`, async ({
      page,
    }) => {
      test.slow();
      await page.setViewportSize({ width, height: 900 });
      await openTripartite(page, capture);
      if (width < 600) await page.locator("#workbench-panel-close").click();
      const clear = async () => [
        ...(await svgTextCollisions(page, `${TRIPARTITE}-svg`, null)),
        ...(await drawnCollisions(page, `${TRIPARTITE}-svg`)),
      ];
      expect(await clear()).toEqual([]);
      await runToFrame(page, capture, 0);
      expect(await clear()).toEqual([]);
      for (let index = 1; index < capture.frames.length; index += 1) {
        await page.locator("#workbench-steps-next").click();
        await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
        expect(await clear()).toEqual([]);
      }
    });
  }
}

for (const key of ["bruteForce", "wide"]) {
  test(`Tripartite Matching: on a 390 px phone the ${key} picture is drawn at its own size, every label at least ${PHONE_TEXT_PX} px`, async ({
    page,
  }) => {
    const capture = TRIPARTITE_CASES[key];
    await page.setViewportSize({ width: 390, height: 900 });
    await openTripartite(page, capture);
    await page.locator("#workbench-panel-close").click();
    const drawn = await page.locator(`${TRIPARTITE}-tripartite`).getAttribute("data-drawing-width");
    expect(Number(drawn)).toBeLessThan(790);
    await expect(page.locator(`${TRIPARTITE}-zoom`)).toHaveAttribute("data-zoom", "1.00");
    await expectFits(page, `${TRIPARTITE}-svg`);
    const before = await smallestText(page, `${TRIPARTITE}-svg`);
    expect(before.px, `"${before.text}" is ${before.px} px`).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
    await runToFrame(page, capture, capture.frames.length - 1);
    const after = await smallestText(page, `${TRIPARTITE}-svg`);
    expect(after.px, `"${after.text}" is ${after.px} px`).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
  });
}

// --- #214: the Code Tree renderer (Lossless Data Compression) ----------------------------------

const CODE_TREE = "#workbench-source-frames-codetree";

/**
 * Each Lossless Data Compression capture. Every capture is drawn on the 3SAT page (its
 * visualization made to name CodeTree), as CI's backend may serve no Code Tree visualization
 * yet: the picture is the capture's, whatever the page.
 */
const CODE_TREE_CASES = {
  default: LDC_CODE_TREE_FRAMES,
  small: LDC_SMALL_CODE_TREE_FRAMES,
  one: LDC_ONE_CODE_TREE_FRAMES,
};

async function openCodeTree(page, capture) {
  await setEveryPictureType(page, "CodeTree");
  await openPicture(page, "3SAT", capture);
  await expect(page.locator(`${CODE_TREE}-codetree`)).toBeVisible();
}

const treePiece = (page, id) => page.locator(`${CODE_TREE}-codetree [data-node-id="${id}"]`);
const treeEdgeOf = (page, id) => page.locator(`${CODE_TREE}-codetree [data-edge-id="${id}"]`);

/** Frame `index`'s merges, node and edge states and codes, checked one by one. */
async function expectCodeTreeFrame(page, capture, index) {
  const frame = capture.frames[index];
  const picture = page.locator(`${CODE_TREE}-codetree`);
  const nodes = await picture
    .locator("[data-node-id]")
    .evaluateAll((all) =>
      Object.fromEntries(
        all.map((node) => [
          node.getAttribute("data-node-id"),
          [node.getAttribute("data-state"), node.getAttribute("data-code")],
        ]),
      ),
    );
  const expected = {};
  for (const symbol of capture.payload.symbols) {
    expected[symbol.id] = [
      frame.nodes[symbol.id]?.state ?? "Background",
      frame.codes[symbol.id] ?? null,
    ];
  }
  for (const merge of frame.merged) {
    expected[merge.id] = [frame.nodes[merge.id]?.state ?? "Background", null];
  }
  expect(nodes).toEqual(expected);
  const edges = await picture
    .locator("[data-edge-id]")
    .evaluateAll((all) =>
      Object.fromEntries(
        all.map((edge) => [edge.getAttribute("data-edge-id"), edge.getAttribute("data-state")]),
      ),
    );
  const expectedEdges = {};
  for (const merge of frame.merged) {
    for (const bit of ["0", "1"]) {
      const id = `${merge.id}.${bit}`;
      expectedEdges[id] = frame.edges[id]?.state ?? "Background";
    }
  }
  expect(edges).toEqual(expectedEdges);
  for (const merge of frame.merged) {
    await expect(treePiece(page, merge.id).locator("[data-label]")).toHaveText(
      String(merge.weight),
    );
  }
  await expect(page.locator(`${CODE_TREE}-strip`)).toHaveAttribute(
    "data-encoded",
    frame.bits === undefined ? "false" : "true",
  );
}

for (const [key, capture] of Object.entries(CODE_TREE_CASES)) {
  test(`Code Tree: the ${key} capture draws every character, and every step's merges, states and codes`, async ({
    page,
  }) => {
    test.slow();
    const { payload } = capture;
    await openCodeTree(page, capture);
    const picture = page.locator(`${CODE_TREE}-codetree`);
    await expect(picture.locator("[data-leaf]")).toHaveCount(payload.symbols.length);
    for (const symbol of payload.symbols) {
      await expect(treePiece(page, symbol.id).locator("[data-label]")).toHaveText(symbol.label);
      await expect(treePiece(page, symbol.id).locator("[data-count]")).toHaveText(
        String(symbol.count),
      );
    }
    await expect(page.locator(`${CODE_TREE}-strip li[data-cell]`)).toHaveCount(payload.text.length);

    await runToFrame(page, capture, 0);
    await expectCodeTreeFrame(page, capture, 0);
    for (let index = 1; index < capture.frames.length; index += 1) {
      await page.locator("#workbench-steps-next").click();
      await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
      await expectCodeTreeFrame(page, capture, index);
    }
    const last = capture.frames.at(-1);
    await expect(page.locator(`${CAPTION}-verdict`)).toHaveText(
      last.ok ? "Verdict: yes" : "Verdict: no",
    );
    await expect(page.locator(`${CODE_TREE}-strip-head`)).toHaveText(
      `ENCODED · ${last.bits} ${last.bits === 1 ? "BIT" : "BITS"}`,
    );
    await expect(page.locator(`${CODE_TREE}-summary`)).toHaveText(
      `${last.bits} bits vs ${8 * payload.text.length} at 8 bits each`,
    );
    for (const piece of await picture.locator("[data-focusable]").all()) {
      await expect(piece).toHaveAttribute("tabindex", "0");
      await expect(piece).toHaveAttribute("aria-label", /^(Character \S+, appears|Merged tree n)/);
    }
  });
}

/** Each node's drawn box by id, in viewBox units. */
function codeTreeBoxes(page) {
  return page.locator(`${CODE_TREE}-codetree [data-node-id]`).evaluateAll((all) =>
    Object.fromEntries(
      all.map((node) => {
        const box = node.querySelector("[data-body]").getBBox();
        return [node.getAttribute("data-node-id"), [box.x, box.y, box.width, box.height]];
      }),
    ),
  );
}

test("Code Tree: before Run the characters stand alone in character order, and the run's steps never move a node", async ({
  page,
}) => {
  const capture = LDC_CODE_TREE_FRAMES;
  await openCodeTree(page, capture);
  const picture = page.locator(`${CODE_TREE}-codetree`);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(picture.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(picture.locator("[data-edge-id], [data-code-text]")).toHaveCount(0);
  await expect(picture.locator("[data-node-id]")).toHaveCount(capture.payload.symbols.length);
  const plain = await codeTreeBoxes(page);
  const order = capture.payload.symbols.map((symbol) => plain[symbol.id][0]);
  expect(order).toEqual([...order].sort((a, b) => a - b));
  await expect(page.locator(`${CODE_TREE}-strip-head`)).toHaveText("INPUT · 70 CHARACTERS");
  await expect(page.locator(`${CODE_TREE}-summary`)).toHaveText("19 one-node trees to merge");

  // One layout for the whole run: a node drawn at one step is in the same place at every other.
  await page.locator("#workbench-run").click();
  const count = capture.frames.length;
  await expect(page.locator("#workbench-steps-position")).toHaveText(`Step ${count} of ${count}`);
  const finished = await codeTreeBoxes(page);
  expect(Object.keys(finished)).toHaveLength(capture.payload.symbols.length + 18);
  for (const index of [0, 5, 12]) {
    await toFrame(page, capture, index);
    const boxes = await codeTreeBoxes(page);
    for (const [id, box] of Object.entries(boxes)) expect(box, id).toEqual(finished[id]);
  }
  await expect(page.locator(`${CODE_TREE}-summary`)).toHaveText("7 trees left to merge");
});

test("Code Tree: the tree hangs tidily, each merged node centred over its children, 0 to the left and 1 to the right", async ({
  page,
}) => {
  const capture = LDC_CODE_TREE_FRAMES;
  await openCodeTree(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  const picture = page.locator(`${CODE_TREE}-codetree`);
  await expect(picture).toHaveAttribute("data-orientation", "down");
  const boxes = await codeTreeBoxes(page);
  const centre = (id) => ({
    x: boxes[id][0] + boxes[id][2] / 2,
    y: boxes[id][1] + boxes[id][3] / 2,
  });
  const leafY = centre("c1").y;
  for (const symbol of capture.payload.symbols) expect(centre(symbol.id).y).toBeCloseTo(leafY, 1);
  for (const merge of capture.frames.at(-1).merged) {
    const parent = centre(merge.id);
    const left = centre(merge.left);
    const right = centre(merge.right);
    expect(parent.x).toBeCloseTo((left.x + right.x) / 2, 1);
    expect(parent.y).toBeLessThan(Math.min(left.y, right.y));
    expect(left.x).toBeLessThan(right.x);
    await expect(treeEdgeOf(page, `${merge.id}.0`).locator("[data-bit]")).toHaveText("0");
    await expect(treeEdgeOf(page, `${merge.id}.1`).locator("[data-bit]")).toHaveText("1");
  }
  // Each code is the path from the root: e (c5) is 1100, written under its leaf.
  await expect(treePiece(page, "c5")).toHaveAttribute("data-code", "1100");
  await expect(treePiece(page, "c5").locator("[data-code-text]")).toHaveText("1100");
});

test("Code Tree: a merge highlights its trees and their new parent, merges kept so far are Committed, and the finished tree turns Solution", async ({
  page,
}) => {
  const capture = LDC_CODE_TREE_FRAMES;
  await openCodeTree(page, capture);
  await runToFrame(page, capture, 2);
  // Step 3 merges c (c3) and d (c4) into n2; n1 (r and x) is kept so far.
  for (const id of ["c3", "c4", "n2"]) {
    await expect(treePiece(page, id)).toHaveAttribute("data-state", "ElementHighlight");
    await expect(treePiece(page, id)).toHaveAttribute("data-focus", "true");
  }
  await expect(treePiece(page, "n1")).toHaveAttribute("data-state", "Committed");
  await expect(treePiece(page, "n1").locator("circle")).toHaveAttribute("stroke-dasharray", "6 3");
  await expect(treeEdgeOf(page, "n1.0").locator("line")).toHaveAttribute("stroke-dasharray", "6 3");
  await expect(treePiece(page, "n3")).toHaveCount(0);
  await expect(legendBody(page)).toContainText("Committed (kept so far)");
  await expect(legendBody(page)).toContainText(
    "0 / 1 on an edge (going left adds 0 to a code, going right adds 1)",
  );
  await expect(legendBody(page)).toContainText(
    "Circle (a merged tree; its number is how many characters it holds)",
  );
  await expect(legendBody(page)).toContainText(
    "Code (a character's bits, read from the root down to it)",
  );
  await toFrame(page, capture, capture.frames.length - 1);
  await expect(
    page.locator(`${CODE_TREE}-codetree [data-node-id]:not([data-state="Solution"])`),
  ).toHaveCount(0);
  await expect(page.locator(`${CODE_TREE}-strip [data-cell-code]`).first()).toHaveText("01100");
});

test("Code Tree: a text of one character has no merge, and its code is 0", async ({ page }) => {
  const capture = LDC_ONE_CODE_TREE_FRAMES;
  await openCodeTree(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  await expect(page.locator(`${CODE_TREE}-codetree [data-edge-id]`)).toHaveCount(0);
  await expect(treePiece(page, "c1")).toHaveAttribute("data-state", "Solution");
  await expect(treePiece(page, "c1").locator("[data-code-text]")).toHaveText("0");
  await expect(page.locator(`${CODE_TREE}-strip [data-cell-code]`)).toHaveText([
    "0",
    "0",
    "0",
    "0",
  ]);
  await expect(page.locator(`${CODE_TREE}-strip-head`)).toHaveText("ENCODED · 4 BITS");
});

test("Code Tree: hovering, focusing or tapping a node traces its path to the root and the tree under it, the rest fading by color", async ({
  page,
}) => {
  const capture = LDC_CODE_TREE_FRAMES;
  await openCodeTree(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  // e (c5) hangs under n10, n15, n17 and the root n18.
  await treePiece(page, "c5").hover();
  for (const id of ["c5", "n10", "n15", "n17", "n18"]) {
    await expect(treePiece(page, id)).toHaveAttribute("data-traced", "trace");
  }
  await expect(treePiece(page, "c9")).toHaveAttribute("data-traced", "faint");
  await expect(treeEdgeOf(page, "n10.0")).toHaveAttribute("data-traced", "trace");
  await expect(treeEdgeOf(page, "n10.1")).toHaveAttribute("data-traced", "faint");
  const faded = await treePiece(page, "c9").evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    filter: getComputedStyle(el).filter,
  }));
  expect(faded.opacity).toBe("1");
  expect(faded.filter).toContain("grayscale");
  // Every e in the text is traced too.
  const cells = page.locator(`${CODE_TREE}-strip li[data-cell="c5"]`);
  await expect(cells).toHaveCount(5);
  for (const cell of await cells.all()) await expect(cell).toHaveAttribute("data-traced", "trace");
  // A merged node traces the tree under it as well.
  await page.mouse.move(0, 0);
  await treePiece(page, "n10").hover();
  for (const id of ["c5", "c9", "n10", "n18"]) {
    await expect(treePiece(page, id)).toHaveAttribute("data-traced", "trace");
  }
  await expect(treePiece(page, "n11")).toHaveAttribute("data-traced", "faint");
  // A character in the text traces its leaf.
  await page.mouse.move(0, 0);
  await page.locator(`${CODE_TREE}-strip li[data-cell="c12"]`).first().hover();
  await expect(treePiece(page, "c12")).toHaveAttribute("data-traced", "trace");
  await page.mouse.move(0, 0);
  await treePiece(page, "n14").focus();
  await expect(treePiece(page, "n14")).toHaveAttribute("data-traced", "trace");
  await page.keyboard.press("Enter");
  await expect(treePiece(page, "n14")).toHaveAttribute("aria-pressed", "true");
});

test("Code Tree: on a phone the tree lies on its side, and a tap traces a node after zooming in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const capture = LDC_CODE_TREE_FRAMES;
  await openCodeTree(page, capture);
  await page.locator("#workbench-panel-close").click();
  await runToFrame(page, capture, capture.frames.length - 1);
  const picture = page.locator(`${CODE_TREE}-codetree`);
  await expect(picture).toHaveAttribute("data-orientation", "side");
  await expectFits(page, `${CODE_TREE}-svg`);
  // The leaves stand in one column, each merged node left of its children.
  const boxes = await codeTreeBoxes(page);
  const leafX = boxes.c1[0];
  for (const symbol of capture.payload.symbols) expect(boxes[symbol.id][0]).toBeCloseTo(leafX, 1);
  for (const merge of capture.frames.at(-1).merged) {
    expect(boxes[merge.id][0]).toBeLessThan(Math.min(boxes[merge.left][0], boxes[merge.right][0]));
  }
  await page.locator(`${CODE_TREE}-zoom-in`).click();
  await expect(page.locator(`${CODE_TREE}-zoom`)).toHaveAttribute("data-zoom", "1.50");
  await treePiece(page, "c5").focus();
  await treePiece(page, "c5").blur();
  await treePiece(page, "c5").click();
  await expect(treePiece(page, "c5")).toHaveAttribute("aria-pressed", "true");
  await expect(treePiece(page, "c9")).toHaveAttribute("data-traced", "faint");
  await expectFits(page, `${CODE_TREE}-svg`);
});

for (const scheme of ["light", "dark"]) {
  for (const width of [390, 1080, 1280]) {
    test(`Code Tree: draws at ${width} px in the ${scheme} theme without widening the page`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      const capture = LDC_CODE_TREE_FRAMES;
      await openCodeTree(page, capture);
      if (width < 600) await page.locator("#workbench-panel-close").click();
      await runToFrame(page, capture, capture.frames.length - 1);
      const svg = page.locator(`${CODE_TREE}-svg`);
      await expect(svg).toBeVisible();
      expect((await svg.boundingBox()).width).toBeGreaterThan(250);
      await expectFits(page, `${CODE_TREE}-svg`);
      await expect(page.locator(`${CODE_TREE}-zoom`)).toHaveAttribute("data-zoom", "1.00");
      // The heading and the bits follow the theme: no dark-on-dark, no light-on-white. (A
      // node's label is drawn on its state's fill.)
      for (const selector of ["[data-head]", "[data-bit]"]) {
        const ink = await page
          .locator(`${CODE_TREE}-codetree ${selector}`)
          .first()
          .evaluate((el) => getComputedStyle(el).fill);
        const [r, g, b] = ink.match(/\d+/g).map(Number);
        expect((r + g + b) / 3 > 128, selector).toBe(scheme === "dark");
      }
      const cell = await page
        .locator(`${CODE_TREE}-strip li[data-cell] span`)
        .first()
        .evaluate((el) => getComputedStyle(el).color);
      const [r, g, b] = cell.match(/\d+/g).map(Number);
      expect((r + g + b) / 3 > 128, "strip").toBe(scheme === "dark");
    });
  }
}

for (const [key, capture] of Object.entries(CODE_TREE_CASES)) {
  for (const width of [1280, 390, 320]) {
    test(`Code Tree: the ${key} capture's texts never meet each other, a line or a node at ${width} px, before Run and at every step`, async ({
      page,
    }) => {
      test.slow();
      await page.setViewportSize({ width, height: 900 });
      await openCodeTree(page, capture);
      if (width < 600) await page.locator("#workbench-panel-close").click();
      const clear = async () => [
        ...(await svgTextCollisions(page, `${CODE_TREE}-svg`, null)),
        ...(await drawnCollisions(page, `${CODE_TREE}-svg`)),
      ];
      expect(await clear()).toEqual([]);
      await runToFrame(page, capture, 0);
      expect(await clear()).toEqual([]);
      for (let index = 1; index < capture.frames.length; index += 1) {
        await page.locator("#workbench-steps-next").click();
        await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
        expect(await clear()).toEqual([]);
      }
    });
  }
}

for (const key of ["default", "small"]) {
  test(`Code Tree: on a 390 px phone the ${key} tree is drawn at its own size, every label at least ${PHONE_TEXT_PX} px`, async ({
    page,
  }) => {
    const capture = CODE_TREE_CASES[key];
    await page.setViewportSize({ width: 390, height: 900 });
    await openCodeTree(page, capture);
    await page.locator("#workbench-panel-close").click();
    const drawn = await page.locator(`${CODE_TREE}-codetree`).getAttribute("data-drawing-width");
    expect(Number(drawn)).toBeLessThan(400);
    await expect(page.locator(`${CODE_TREE}-zoom`)).toHaveAttribute("data-zoom", "1.00");
    await expectFits(page, `${CODE_TREE}-svg`);
    const before = await smallestText(page, `${CODE_TREE}-svg`);
    expect(before.px, `"${before.text}" is ${before.px} px`).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
    await runToFrame(page, capture, capture.frames.length - 1);
    const after = await smallestText(page, `${CODE_TREE}-svg`);
    expect(after.px, `"${after.text}" is ${after.px} px`).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
    // The text strip under the tree lists every character's code at its own size too.
    const strip = await page
      .locator(`${CODE_TREE}-strip [data-cell-code]`)
      .first()
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
    expect(strip).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
  });
}

// --- #210: the Quantum Circuit renderer (Deutsch, Deutsch-Jozsa, Bernstein-Vazirani, Simon,
// Unstructured Search, Prime Factorization) --------------------------------------------------------

const QUANTUM = "#workbench-source-frames-quantumcircuit";

/**
 * Each quantum capture. Every capture is drawn on the 3SAT page (its visualization made to name
 * QuantumCircuit), as CI's backend may serve no Quantum Circuit visualization yet and has no
 * quantum server: the picture is the capture's, whatever the page.
 */
const QUANTUM_CASES = {
  bernsteinVazirani: BV_QUANTUM_FRAMES,
  bernsteinVaziraniClassical: BV_CLASSICAL_QUANTUM_FRAMES,
  deutsch: DEUTSCH_QUANTUM_FRAMES,
  deutschClassical: DEUTSCH_CLASSICAL_QUANTUM_FRAMES,
  deutschJozsa: DEUTSCH_JOZSA_QUANTUM_FRAMES,
  simon: SIMON_QUANTUM_FRAMES,
  grover: GROVER_QUANTUM_FRAMES,
  groverMiss: GROVER_MISS_QUANTUM_FRAMES,
  unstructuredClassical: UNSTRUCTURED_CLASSICAL_QUANTUM_FRAMES,
  shor: SHOR_QUANTUM_FRAMES,
  shorTrialDivision: SHOR_TRIAL_DIVISION_QUANTUM_FRAMES,
  noCircuit: SHOR_NO_CIRCUIT_QUANTUM_FRAMES,
};

async function openQuantum(page, capture) {
  await setEveryPictureType(page, "QuantumCircuit");
  await openPicture(page, "3SAT", capture);
  await expect(page.locator(`${QUANTUM}-quantum`)).toBeVisible();
}

const quantumGate = (page, id) => page.locator(`${QUANTUM}-quantum [data-gate-id="${id}"]`);
const quantumWire = (page, id) => page.locator(`${QUANTUM}-quantum [data-qubit-id="${id}"]`);
const quantumBar = (page, outcome) =>
  page.locator(`${QUANTUM}-quantum [data-outcome="${outcome}"]`);

/** Frame `index`'s columns, gates, qubits, bars, calls and answer, checked one by one. */
async function expectQuantumFrame(page, capture, index) {
  const frame = capture.frames[index];
  const { payload } = capture;
  const picture = page.locator(`${QUANTUM}-quantum`);
  const drawn = await picture.evaluate((root) => ({
    columns: Object.fromEntries(
      [...root.querySelectorAll("[data-column-id]")].map((el) => [
        el.getAttribute("data-column-id"),
        [el.getAttribute("data-state"), el.getAttribute("data-future")],
      ]),
    ),
    gates: Object.fromEntries(
      [...root.querySelectorAll("[data-gate-id]")].map((el) => [
        el.getAttribute("data-gate-id"),
        el.getAttribute("data-state"),
      ]),
    ),
    qubits: Object.fromEntries(
      [...root.querySelectorAll("[data-qubit-id]")].map((el) => [
        el.getAttribute("data-qubit-id"),
        el.getAttribute("data-state"),
      ]),
    ),
    bars: Object.fromEntries(
      [...root.querySelectorAll("[data-outcome]")]
        .filter((el) => el.hasAttribute("data-probability"))
        .map((el) => [
          el.getAttribute("data-outcome"),
          Number(el.getAttribute("data-probability")),
        ]),
    ),
    calls: root.querySelectorAll("[data-query]").length,
    result: root.querySelector("[data-result]")?.getAttribute("data-result") ?? null,
  }));
  const columns = {};
  const gates = {};
  payload.columns.forEach((column, c) => {
    const state = frame.columns[column.id]?.state ?? "Background";
    columns[column.id] = [state, c >= frame.applied ? "true" : null];
    for (const gate of column.gates) gates[gate.id] = frame.gates[gate.id]?.state ?? state;
  });
  expect(drawn.columns).toEqual(columns);
  expect(drawn.gates).toEqual(gates);
  expect(drawn.qubits).toEqual(
    Object.fromEntries(
      payload.qubits.map((q) => [q.id, frame.qubits[q.id]?.state ?? "Background"]),
    ),
  );
  const bars = {};
  for (const bar of frame.bars ?? []) {
    if (bar.outcome < 2 ** payload.measure.length) bars[bar.outcome] = bar.probability;
  }
  if (frame.bars) {
    for (let outcome = 0; outcome < 2 ** payload.measure.length; outcome += 1) {
      bars[outcome] ??= 0;
    }
  }
  expect(drawn.bars).toEqual(bars);
  expect(drawn.calls).toBe(frame.queries.length);
  expect(drawn.result).toBe(frame.result ?? null);
  if (Number.isInteger(frame.outcome) && payload.measure.length) {
    const read = frame.qubits[payload.qubits[payload.measure[0]].id]?.state;
    if (read) await expect(quantumBar(page, frame.outcome)).toHaveAttribute("data-read", read);
    const bits = frame.outcome.toString(2).padStart(payload.measure.length, "0");
    for (const [i, k] of payload.measure.entries()) {
      await expect(quantumWire(page, payload.qubits[k].id).locator("[data-bit-out]")).toHaveText(
        bits[i],
      );
    }
  }
}

/** Every picture state a frame names, as pictureStates.js statesInFrames finds them. */
function quantumFrameStates(value, found = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) quantumFrameStates(item, found);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "state" && typeof child === "string") found.add(child);
      else quantumFrameStates(child, found);
    }
  }
  return found;
}

/**
 * The Legend lists only what the step on screen draws (#210): frame `index`'s states, and the
 * dashed gate only while a gate still to come is drawn dashed.
 */
async function expectQuantumLegend(page, capture, index) {
  const keys = await legendBody(page)
    .locator("[data-legend-key]")
    .evaluateAll((all) => all.map((el) => el.getAttribute("data-legend-key")));
  const states = keys.filter((key) => key.startsWith("state-")).map((key) => key.slice(6));
  expect(states.sort(), `step ${index + 1}'s states`).toEqual(
    [...quantumFrameStates(capture.frames[index])].sort(),
  );
  const dashed = await page
    .locator(`${QUANTUM}-quantum [data-future="true"] [data-gate-id][data-state="Background"]`)
    .count();
  expect(keys.includes("note-future"), `step ${index + 1}'s dashed gate`).toBe(dashed > 0);
}

for (const [key, capture] of Object.entries(QUANTUM_CASES)) {
  test(`Quantum Circuit: the ${key} capture draws every qubit and gate, and every step's states, bars, calls and answer`, async ({
    page,
  }) => {
    test.slow();
    const { payload } = capture;
    await openQuantum(page, capture);
    const picture = page.locator(`${QUANTUM}-quantum`);
    await expect(picture.locator("[data-qubit-id]")).toHaveCount(payload.qubits.length);
    await expect(picture.locator("[data-gate-id]")).toHaveCount(
      payload.columns.reduce((sum, column) => sum + column.gates.length, 0),
    );
    for (const qubit of payload.qubits) {
      await expect(quantumWire(page, qubit.id).locator("[data-label]")).toHaveText(qubit.name);
    }
    await expect(picture.locator("[data-outcome]")).toHaveCount(
      payload.simulated ? 2 ** payload.measure.length : 0,
    );
    if (payload.note) await expect(picture.locator("[data-note]")).toHaveText(payload.note);

    await runToFrame(page, capture, 0);
    await expectQuantumFrame(page, capture, 0);
    await expectQuantumLegend(page, capture, 0);
    for (let index = 1; index < capture.frames.length; index += 1) {
      await page.locator("#workbench-steps-next").click();
      await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
      await expectQuantumFrame(page, capture, index);
      await expectQuantumLegend(page, capture, index);
    }
    const last = capture.frames.at(-1);
    await expect(page.locator(`${CAPTION}-verdict`)).toHaveText(
      last.ok ? "Verdict: yes" : "Verdict: no",
    );
    for (const piece of await picture.locator("[data-focusable]").all()) {
      await expect(piece).toHaveAttribute("tabindex", "0");
      await expect(piece).toHaveAttribute("aria-label", /^(Qubit |Outcome |\S.* on \S)/);
    }
  });
}

/** Each gate's and wire's drawn box by id, in viewBox units. */
function quantumBoxes(page) {
  return page
    .locator(`${QUANTUM}-quantum [data-gate-id], ${QUANTUM}-quantum [data-qubit-id]`)
    .evaluateAll((all) =>
      Object.fromEntries(
        all.map((piece) => {
          const box = piece.getBBox();
          const id = piece.getAttribute("data-gate-id") ?? piece.getAttribute("data-qubit-id");
          return [id, [box.x, box.y, box.width, box.height].map((v) => Math.round(v * 10) / 10)];
        }),
      ),
    );
}

test("Quantum Circuit: before Run the circuit is the plain instance, and step 1 keeps it in place", async ({
  page,
}) => {
  const capture = BV_QUANTUM_FRAMES;
  await openQuantum(page, capture);
  const picture = page.locator(`${QUANTUM}-quantum`);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(picture.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(picture.locator("[data-future], [data-bar], [data-bit-out]")).toHaveCount(0);
  await expect(picture.locator("[data-chart-empty]")).toHaveText("Bars appear once a column runs.");
  await expect(page.locator(`${QUANTUM}-summary`)).toHaveText("4 qubits, 5 columns");
  // Nothing is still to come before Run, so the Legend has no dashed gate.
  await expect(legendBody(page).locator('[data-legend-key="note-future"]')).toHaveCount(0);
  const before = await quantumBoxes(page);
  await runToFrame(page, capture, 0);
  expect(await quantumBoxes(page)).toEqual(before);
  await expect(page.locator(`${QUANTUM}-summary`)).toHaveText("1 of 5 columns run");
});

test("Quantum Circuit: the oracle flips signs, the last gates leave one outcome, and its read turns Solution", async ({
  page,
}) => {
  const capture = BV_QUANTUM_FRAMES;
  await openQuantum(page, capture);
  await runToFrame(page, capture, 2);
  // Step 3 runs the oracle: half the outcomes' amplitudes turn negative, drawn in another color.
  await expect(quantumGate(page, "g2_0")).toHaveAttribute("data-state", "ElementHighlight");
  await expect(quantumGate(page, "g2_0")).toHaveAttribute("data-oracle", "true");
  await expect(quantumGate(page, "g3_0")).toHaveAttribute("data-state", "Background");
  await expect(page.locator(`${QUANTUM}-quantum [data-column-id="t3"]`)).toHaveAttribute(
    "data-future",
    "true",
  );
  await expect(quantumGate(page, "g3_0").locator("[data-body]")).toHaveAttribute(
    "stroke-dasharray",
    "3 2",
  );
  const fills = await page
    .locator(`${QUANTUM}-quantum [data-outcome] [data-bar]`)
    .evaluateAll((bars) => bars.map((bar) => bar.getAttribute("fill")));
  expect(new Set(fills).size).toBe(2);
  await expect(quantumBar(page, 1)).toHaveAttribute("data-sign", "-1");
  await expect(quantumBar(page, 0)).toHaveAttribute("data-sign", "1");
  for (const text of [
    "Oracle (the black box holding the function f)",
    "Blue bar (an outcome's probability; its amplitude is positive)",
    "Orange bar (the same, with a negative amplitude)",
    "Dashed grey gate (its column has not run)",
  ]) {
    await expect(legendBody(page)).toContainText(text);
  }
  await toFrame(page, capture, capture.frames.length - 1);
  await expect(quantumBar(page, 5)).toHaveAttribute("data-probability", "1");
  await expect(quantumBar(page, 5)).toHaveAttribute("data-read", "Solution");
  await expect(quantumBar(page, 5).locator("[data-outcome-label]")).toHaveText("101");
  for (const id of ["q0", "q1", "q2"]) {
    await expect(quantumWire(page, id)).toHaveAttribute("data-state", "Solution");
  }
  await expect(quantumWire(page, "q3")).toHaveAttribute("data-state", "Background");
  await expect(page.locator(`${QUANTUM}-quantum [data-result]`)).toHaveText("(1,0,1)");
});

test("Quantum Circuit: Grover's search finds the one marked item in 1 round, and the read turns Solution", async ({
  page,
}) => {
  // quantumsolver #23: floor(pi/4 * sqrt(4)) = 1 round leaves the marked item at 100%, so a
  // 2-qubit search can no longer miss; Redux #902: "1 round", not "1 rounds".
  const capture = GROVER_QUANTUM_FRAMES;
  await openQuantum(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(
    "Item 1 is marked, found with 1 round of Grover's algorithm.",
  );
  await expect(quantumBar(page, 1)).toHaveAttribute("data-probability", "1");
  await expect(quantumBar(page, 1)).toHaveAttribute("data-read", "Solution");
  for (const id of ["q0", "q1"]) {
    await expect(quantumWire(page, id)).toHaveAttribute("data-state", "Solution");
  }
  await expect(page.locator(`${QUANTUM}-quantum [data-result]`)).toHaveText("1");
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: yes");
});

test("Quantum Circuit: a Grover measurement that misses the marked items reads Rejected, and the run ends on no", async ({
  page,
}) => {
  const capture = GROVER_MISS_QUANTUM_FRAMES;
  await openQuantum(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  const { outcome } = capture.frames.at(-1);
  // Two of four items marked: one round leaves every item at 25%, and the quantum server read
  // an unmarked one.
  for (const item of [0, 1, 2, 3]) {
    await expect(quantumBar(page, item)).toHaveAttribute("data-probability", "0.25");
  }
  await expect(quantumBar(page, outcome)).toHaveAttribute("data-read", "Rejected");
  for (const id of ["q0", "q1"]) {
    await expect(quantumWire(page, id)).toHaveAttribute("data-state", "Rejected");
  }
  await expect(quantumGate(page, "g3_0")).toHaveAttribute("data-state", "Rejected");
  await expect(page.locator(`${CAPTION}-verdict`)).toHaveText("Verdict: no");
  // Redux #906: the miss gives the simulated chance a run finds a marked item, not "usually".
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(
    "Item 0 is not marked: the measurement missed. A run finds a marked item about 50% of the time.",
  );
  // Redux #907: the Measure step names the four-way tie, not item 0.
  await toFrame(page, capture, 3);
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(
    "Measure: every item is equally likely (25% each).",
  );
});

test("Quantum Circuit: a classical solver's oracle calls are listed, and its circuit ends Untraveled", async ({
  page,
}) => {
  const capture = BV_CLASSICAL_QUANTUM_FRAMES;
  await openQuantum(page, capture);
  await runToFrame(page, capture, 1);
  const calls = page.locator(`${QUANTUM}-quantum [data-query]`);
  await expect(calls).toHaveText(["f(100) = 1", "f(010) = 0"]);
  await expect(calls.nth(1)).toHaveAttribute("data-latest", "true");
  await expect(quantumGate(page, "g2_0")).toHaveAttribute("data-state", "ElementHighlight");
  await expect(page.locator(`${QUANTUM}-quantum [data-chart-empty]`)).toHaveText(
    "A classical solver: no column runs.",
  );
  await expect(page.locator(`${QUANTUM}-summary`)).toHaveText("2 oracle calls");
  await expect(legendBody(page)).toContainText("f(x) = y (an oracle call made classically)");
  await toFrame(page, capture, capture.frames.length - 1);
  for (const column of capture.payload.columns) {
    await expect(
      page.locator(`${QUANTUM}-quantum [data-column-id="${column.id}"]`),
    ).toHaveAttribute("data-state", "Untraveled");
  }
  await expect(page.locator(`${QUANTUM}-quantum [data-result]`)).toHaveText("(1,0,1)");
  // Simon's oracle answers with numbers.
  await openQuantum(page, SIMON_QUANTUM_FRAMES);
  await runToFrame(page, SIMON_QUANTUM_FRAMES, 2);
  await expect(page.locator(`${QUANTUM}-quantum [data-query]`)).toHaveText([
    "f(000) = 5",
    "f(001) = 6",
    "f(010) = 5",
  ]);
});

test("Quantum Circuit: Shor's circuit is drawn with its note and no chart, and a number with no circuit shows only its note", async ({
  page,
}) => {
  await openQuantum(page, SHOR_QUANTUM_FRAMES);
  const picture = page.locator(`${QUANTUM}-quantum`);
  await expect(picture.locator("[data-qubit-id]")).toHaveCount(12);
  await expect(picture.locator("[data-stage]")).toHaveCount(4);
  await expect(picture.locator("[data-outcome]")).toHaveCount(0);
  await expect(picture.locator("[data-note]")).toHaveText(SHOR_QUANTUM_FRAMES.payload.note);
  // The controlled multipliers are boxes over the work qubits, each with its control dot.
  await expect(quantumGate(page, "g2_8")).toHaveAttribute(
    "aria-label",
    /^×2 on w0, w1, w2, w3, controlled by c7/,
  );
  // Redux #903: the run goes column by column, each multiplier's caption naming its own power.
  await runToFrame(page, SHOR_QUANTUM_FRAMES, 3);
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(
    "If c7 is 1, multiply the work register by 2^1 mod 15 = 2.",
  );
  await expect(picture.locator('[data-column-id="t2"]')).toHaveAttribute(
    "data-state",
    "ElementHighlight",
  );
  await expect(picture.locator('[data-column-id="t3"]')).toHaveAttribute("data-future", "true");
  await expect(page.locator(`${QUANTUM}-summary`)).toHaveText("3 of 12 columns run");
  await expect(legendBody(page)).toContainText("Highlighted (looked at now)");
  await expect(legendBody(page)).toContainText("Dashed grey gate (its column has not run)");
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(
    "If c6 is 1, multiply the work register by 2^2 mod 15 = 4.",
  );
  await expect(picture.locator('[data-column-id="t3"]')).toHaveAttribute(
    "data-state",
    "ElementHighlight",
  );
  await expect(picture.locator('[data-column-id="t3"]')).not.toHaveAttribute("data-future");
  await expect(page.locator(`${QUANTUM}-summary`)).toHaveText("4 of 12 columns run");
  // Its Done draws the circuit as run: no column Untraveled or still to come.
  await toFrame(page, SHOR_QUANTUM_FRAMES, SHOR_QUANTUM_FRAMES.frames.length - 1);
  await expect(picture.locator("[data-result]")).toHaveText("(3,5)");
  await expect(page.locator(`${QUANTUM}-summary`)).toHaveText("12 of 12 columns run");
  await expect(picture.locator("[data-column-id]")).toHaveCount(12);
  await expect(picture.locator('[data-state="Untraveled"], [data-future]')).toHaveCount(0);
  // Its Legend lists only what the Done draws: nothing highlighted, nothing still to come.
  await expect(legendBody(page)).not.toContainText("Highlighted");
  await expect(legendBody(page)).not.toContainText("Dashed grey gate");

  await openQuantum(page, SHOR_NO_CIRCUIT_QUANTUM_FRAMES);
  await expect(picture.locator("[data-qubit-id], [data-gate-id], [data-outcome]")).toHaveCount(0);
  await expect(picture.locator("[data-note]")).toHaveText(
    "No quantum circuit is needed for 12: the classical checks factor it completely.",
  );
  await runToFrame(page, SHOR_NO_CIRCUIT_QUANTUM_FRAMES, 1);
  await expect(picture.locator("[data-result]")).toHaveText("(2,2)");
});

test("Quantum Circuit: a quantum server's counts are written under each outcome", async ({
  page,
}) => {
  // Today's quantum server sends no counts; Redux passes them on when one does.
  const capture = structuredClone(GROVER_QUANTUM_FRAMES);
  capture.frames.at(-1).counts = { "01": 1000, 10: 24 };
  await openQuantum(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  await expect(quantumBar(page, 1).locator("[data-count]")).toHaveText("×1000");
  await expect(quantumBar(page, 2).locator("[data-count]")).toHaveText("×24");
  await expect(quantumBar(page, 0).locator("[data-count]")).toHaveText("×0");
  await expect(quantumBar(page, 1)).toHaveAttribute("aria-label", /came up 1000 times/);
});

test("Quantum Circuit: hovering, focusing or tapping a qubit, a gate or a bar traces what it touches, the rest fading by color", async ({
  page,
}) => {
  const capture = BV_QUANTUM_FRAMES;
  await openQuantum(page, capture);
  await runToFrame(page, capture, capture.frames.length - 1);
  // x0 (q0): its H gates, the oracle and its meter stay; y's X fades.
  await quantumWire(page, "q0").locator("[data-label]").hover();
  for (const id of ["g1_0", "g2_0", "g3_0", "g4_0"]) {
    await expect(quantumGate(page, id)).toHaveAttribute("data-traced", "trace");
  }
  await expect(quantumGate(page, "g0_3")).toHaveAttribute("data-traced", "faint");
  await expect(quantumWire(page, "q1")).toHaveAttribute("data-traced", "faint");
  const faded = await quantumGate(page, "g0_3").evaluate((el) => ({
    opacity: getComputedStyle(el).opacity,
    filter: getComputedStyle(el).filter,
  }));
  expect(faded.opacity).toBe("1");
  expect(faded.filter).toContain("grayscale");
  // The oracle touches every wire.
  await page.mouse.move(0, 0);
  await quantumGate(page, "g2_0").hover();
  for (const id of ["q0", "q1", "q2", "q3"]) {
    await expect(quantumWire(page, id)).toHaveAttribute("data-traced", "trace");
  }
  // A bar traces the measured wires.
  await page.mouse.move(0, 0);
  await quantumBar(page, 5).hover();
  for (const id of ["q0", "q1", "q2"]) {
    await expect(quantumWire(page, id)).toHaveAttribute("data-traced", "trace");
  }
  await expect(quantumWire(page, "q3")).toHaveAttribute("data-traced", "faint");
  await expect(quantumBar(page, 4)).toHaveAttribute("data-traced", "faint");
  await page.mouse.move(0, 0);
  await quantumGate(page, "g0_3").focus();
  await expect(quantumGate(page, "g0_3")).toHaveAttribute("data-traced", "trace");
  await page.keyboard.press("Enter");
  await expect(quantumGate(page, "g0_3")).toHaveAttribute("aria-pressed", "true");
});

test("Quantum Circuit: on a phone a tap traces a gate after zooming in, and Shor's wide circuit zooms in to readable text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await openQuantum(page, BV_QUANTUM_FRAMES);
  await page.locator("#workbench-panel-close").click();
  await expectFits(page, `${QUANTUM}-svg`);
  await page.locator(`${QUANTUM}-zoom-in`).click();
  await expect(page.locator(`${QUANTUM}-zoom`)).toHaveAttribute("data-zoom", "1.50");
  await quantumGate(page, "g2_0").focus();
  await quantumGate(page, "g2_0").blur();
  await quantumGate(page, "g2_0").click();
  await expect(quantumGate(page, "g2_0")).toHaveAttribute("aria-pressed", "true");
  await expect(quantumWire(page, "q3")).toHaveAttribute("data-traced", "trace");
  await expect(quantumGate(page, "g0_3")).toHaveAttribute("data-traced", "faint");
  await expectFits(page, `${QUANTUM}-svg`);

  await openQuantum(page, SHOR_QUANTUM_FRAMES);
  await page.locator("#workbench-panel-close").click();
  await expect(page.locator(`${QUANTUM}-zoom`)).toHaveAttribute("data-zoom", "1.00");
  await expectFits(page, `${QUANTUM}-svg`);
  const atFit = await smallestText(page, `${QUANTUM}-svg`);
  expect(atFit.px).toBeLessThan(PHONE_TEXT_PX);
  for (let press = 0; press < 4; press += 1) {
    if ((await smallestText(page, `${QUANTUM}-svg`)).px >= PHONE_TEXT_PX) break;
    await page.locator(`${QUANTUM}-zoom-in`).click();
  }
  const zoomed = await smallestText(page, `${QUANTUM}-svg`);
  expect(zoomed.px).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
});

for (const scheme of ["light", "dark"]) {
  for (const width of [390, 1080, 1280]) {
    test(`Quantum Circuit: draws at ${width} px in the ${scheme} theme without widening the page`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width, height: 900 });
      const capture = BV_QUANTUM_FRAMES;
      await openQuantum(page, capture);
      if (width < 600) await page.locator("#workbench-panel-close").click();
      await runToFrame(page, capture, 2);
      const svg = page.locator(`${QUANTUM}-svg`);
      await expect(svg).toBeVisible();
      expect((await svg.boundingBox()).width).toBeGreaterThan(250);
      await expectFits(page, `${QUANTUM}-svg`);
      await expect(page.locator(`${QUANTUM}-zoom`)).toHaveAttribute("data-zoom", "1.00");
      // The names, the chart's title and its ticks follow the theme: no dark-on-dark, no
      // light-on-white.
      for (const selector of ["[data-label]", "[data-head]", "[data-tick]", "[data-role]"]) {
        const ink = await page
          .locator(`${QUANTUM}-quantum ${selector}`)
          .first()
          .evaluate((el) => getComputedStyle(el).fill);
        const [r, g, b] = ink.match(/\d+/g).map(Number);
        expect((r + g + b) / 3 > 128, selector).toBe(scheme === "dark");
      }
    });
  }
}

const QUANTUM_COLLISION_CASES = [
  "bernsteinVazirani",
  "bernsteinVaziraniClassical",
  "simon",
  "grover",
  "groverMiss",
  "shor",
  "noCircuit",
];

for (const key of QUANTUM_COLLISION_CASES) {
  const capture = QUANTUM_CASES[key];
  for (const width of [1280, 390, 320]) {
    test(`Quantum Circuit: the ${key} capture's texts never meet each other, a line or a gate at ${width} px, before Run and at every step`, async ({
      page,
    }) => {
      test.slow();
      await page.setViewportSize({ width, height: 900 });
      await openQuantum(page, capture);
      if (width < 600) await page.locator("#workbench-panel-close").click();
      const clear = async () => [
        ...(await svgTextCollisions(page, `${QUANTUM}-svg`, null)),
        ...(await drawnCollisions(page, `${QUANTUM}-svg`)),
      ];
      expect(await clear()).toEqual([]);
      await runToFrame(page, capture, 0);
      expect(await clear()).toEqual([]);
      for (let index = 1; index < capture.frames.length; index += 1) {
        await page.locator("#workbench-steps-next").click();
        await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
        expect(await clear()).toEqual([]);
      }
    });
  }
}

for (const key of ["bernsteinVazirani", "deutsch", "simon", "grover"]) {
  test(`Quantum Circuit: on a 390 px phone the ${key} circuit is drawn at its own size, every label at least ${PHONE_TEXT_PX} px`, async ({
    page,
  }) => {
    const capture = QUANTUM_CASES[key];
    await page.setViewportSize({ width: 390, height: 900 });
    await openQuantum(page, capture);
    await page.locator("#workbench-panel-close").click();
    const drawn = await page.locator(`${QUANTUM}-quantum`).getAttribute("data-drawing-width");
    expect(Number(drawn)).toBeLessThan(400);
    await expect(page.locator(`${QUANTUM}-zoom`)).toHaveAttribute("data-zoom", "1.00");
    await expectFits(page, `${QUANTUM}-svg`);
    const before = await smallestText(page, `${QUANTUM}-svg`);
    expect(before.px, `"${before.text}" is ${before.px} px`).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
    await runToFrame(page, capture, capture.frames.length - 1);
    const after = await smallestText(page, `${QUANTUM}-svg`);
    expect(after.px, `"${after.text}" is ${after.px} px`).toBeGreaterThanOrEqual(PHONE_TEXT_PX);
  });
}

// --- Every renderer opens at fit -------------------------------------------------------------
//
// Each registered picture type (components/pictures/registry.js), drawn from one capture on the
// 3SAT page, opens at fit at a phone's and a desktop's width: before Run (where it draws the
// plain instance) and after it. The Table is text with no zoom, and fits its box's width.

/** One capture per registered picture type. */
const FIT_CASES = {
  Automaton: DFA_AUTOMATON_FRAMES,
  BipartiteGraph: SET_COVER_BIPARTITE_FRAMES,
  Board: N_QUEENS_CONSTRUCTIVE_BOARD_FRAMES,
  CodeTree: LDC_CODE_TREE_FRAMES,
  FlowNetwork: MIN_CUT_FLOW_FRAMES,
  Geometry: CONVEX_HULL_GEOMETRY_FRAMES,
  Graph: CLIQUE_GRAPH_FRAMES,
  GroupedGraph: SAT3_CLAUSE_GRAPH_FRAMES,
  LayeredGraph: TOPOLOGICAL_SORT_LAYERED_FRAMES,
  Packing: PARTITION_PACKING_FRAMES,
  QuantumCircuit: BV_QUANTUM_FRAMES,
  Schedule: PUMP_EM_SCHEDULE_FRAMES,
  SearchTree: TSP_SEARCH_TREE_FRAMES,
  Table: DFA_TABLE_FRAMES,
  TripartiteMatching: DM3_TRIPARTITE_FRAMES,
};

for (const width of [390, 1280]) {
  test(`Every picture type opens at fit at ${width} px, before Run and after it`, async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width, height: 844 });
    for (const [type, capture] of Object.entries(FIT_CASES)) {
      await setEveryPictureType(page, type);
      await openPicture(page, "3SAT", capture);
      if (width < 600) await page.locator("#workbench-panel-close").click();
      const prefix = `#workbench-source-frames-${type.toLowerCase()}`;
      const atFit = async (when) => {
        if (type === "Table") {
          await expect(page.locator(`${prefix}-zoom`), `${type} ${when}`).toHaveCount(0);
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          expect(overflow, `${type} ${when}`).toBeLessThanOrEqual(0);
          return;
        }
        // The Search Tree has nothing to draw before Run.
        if (type === "SearchTree" && when === "before Run") return;
        await expect(page.locator(`${prefix}-zoom`), `${type} ${when}`).toHaveAttribute(
          "data-zoom",
          "1.00",
        );
        await expect(page.locator(`${prefix}-zoom-reset`), `${type} ${when}`).toBeDisabled();
        await expectFits(page, `${prefix}-svg`);
      };
      await atFit("before Run");
      await page.locator("#workbench-run").click();
      const count = capture.frames.length;
      await expect(page.locator("#workbench-steps-position")).toHaveText(
        `Step ${count} of ${count}`,
      );
      await atFit("after Run");
    }
  });
}

// --- #250: moving nodes and bending edges by hand -------------------------------------------
//
// Every node-link picture (Graph, Grouped Graph, Bipartite Graph, Layered Graph, Automaton,
// Flow Network) lets the reader drag its nodes and bend its edges (diagramEdits.js, with the
// gestures in DiagramZoom.js), within each type's own limits. The changes stay while the steps
// play and after Run, and go back to the layout on Reset layout or a new instance.

/** A piece's body: its own circle or rect (data-body), or its first one (a clause's circle). */
const bodyOf = (piece) => piece.locator("[data-body], circle, rect").first();

/** A piece's body centre, in drawing units. */
function drawnCentre(piece) {
  return bodyOf(piece).evaluate((el) => {
    const box = el.getBBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
}

/** A piece's body centre on screen, in CSS px (scrolled into view first). */
async function screenCentre(piece) {
  await piece.scrollIntoViewIfNeeded();
  const box = await bodyOf(piece).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Drags with the mouse from `from` (screen px) by (dx, dy), in small steps. */
async function mouseDragFrom(page, from, dx, dy) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 5 });
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 5 });
  await page.mouse.up();
}

/** Drags `piece` by its body's middle. */
async function mouseDrag(page, piece, dx, dy) {
  await mouseDragFrom(page, await screenCentre(piece), dx, dy);
}

/** A path's `d` and its first and last points, in drawing units. */
function pathEnds(path) {
  return path.evaluate((el) => {
    const d = el.getAttribute("d");
    const numbers = d.match(/-?\d+(\.\d+)?/g).map(Number);
    return {
      d,
      start: { x: numbers[0], y: numbers[1] },
      end: { x: numbers[numbers.length - 2], y: numbers[numbers.length - 1] },
    };
  });
}

const distance = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

/** Every piece's body centre in `scope`, by id, in drawing units. */
function centresOf(page, scope) {
  return page.locator(`${scope} [data-node-id]`).evaluateAll((nodes) =>
    Object.fromEntries(
      nodes.map((node) => {
        const box = node.querySelector("[data-body], circle, rect").getBBox();
        return [
          node.getAttribute("data-node-id"),
          { x: box.x + box.width / 2, y: box.y + box.height / 2 },
        ];
      }),
    ),
  );
}

/** The screen point `share` of the way along a path (CSS px). */
async function pointAlong(path, share) {
  await path.scrollIntoViewIfNeeded();
  return path.evaluate((el, part) => {
    const point = el.getPointAtLength(el.getTotalLength() * part);
    const ctm = el.getScreenCTM();
    return {
      x: ctm.a * point.x + ctm.c * point.y + ctm.e,
      y: ctm.b * point.x + ctm.d * point.y + ctm.f,
    };
  }, share);
}

/** A tap that wobbles under the drag threshold (2 px): still a tap. */
async function wobblyClick(page, piece) {
  const at = await screenCentre(piece);
  await page.mouse.move(at.x, at.y);
  await page.mouse.down();
  await page.mouse.move(at.x + 2, at.y + 1);
  await page.mouse.up();
}

/** The Automaton's state radius, in drawing units (automatonLayout.js STATE_RADIUS). */
const STATE_RADIUS_UNITS = 26;

test("Drag: a Graph node moves with its edges, a tap still traces, and Reset layout puts it back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPicture(page, "Clique", CLIQUE_GRAPH_FRAMES);
  const reset = page.locator(`${GRAPH}-layout-reset`);
  await expect(reset).toBeDisabled();
  await expect(reset).toHaveAttribute("aria-label", /Reset layout/);
  const before = await centresOf(page, `${GRAPH}-graph`);
  const edgePath = graphEdge(page, "1-2").locator("path");
  const edgeBefore = await pathEnds(edgePath);

  await mouseDrag(page, graphNode(page, "1"), 90, 60);
  const moved = await drawnCentre(graphNode(page, "1"));
  expect(moved.x - before["1"].x).toBeGreaterThan(20);
  expect(moved.y - before["1"].y).toBeGreaterThan(10);
  // The edge leaves the node where it is now, at its outline.
  const edgeAfter = await pathEnds(edgePath);
  expect(edgeAfter.d).not.toBe(edgeBefore.d);
  expect(distance(edgeAfter.start, moved)).toBeLessThan(25);
  // The other nodes stay; a drag is not a tap, so nothing is pinned.
  const after = await centresOf(page, `${GRAPH}-graph`);
  for (const id of ["2", "3", "4"]) expect(after[id]).toEqual(before[id]);
  await expect(graphNode(page, "1")).toHaveAttribute("aria-pressed", "false");
  await expect(reset).toBeEnabled();

  // A press that wobbles a pixel or two is still a tap: it pins and traces.
  await wobblyClick(page, graphNode(page, "2"));
  await expect(graphNode(page, "2")).toHaveAttribute("aria-pressed", "true");
  await expect(graphEdge(page, "2-3")).toHaveAttribute("data-traced", "trace");
  expect((await centresOf(page, `${GRAPH}-graph`))["2"]).toEqual(before["2"]);

  await reset.click();
  expect(await centresOf(page, `${GRAPH}-graph`)).toEqual(before);
  expect((await pathEnds(edgePath)).d).toBe(edgeBefore.d);
  await expect(reset).toBeDisabled();
});

test("Drag: bending a Graph edge moves its weight; the edits survive Run and the steps", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const capture = MAX_CUT_GRAPH_FRAMES;
  await openPicture(page, "Max Cut", capture);
  const scope = `${GRAPH}-graph`;
  const edgePath = graphEdge(page, "1-2").locator("path");
  const weight = page.locator(`${scope} [data-layer="weights"] [data-drag-edge="1-2"]`);
  const straight = await pathEnds(edgePath);
  expect(straight.d).toContain("L");
  const weightBefore = await screenCentre(weight);

  // Drag the weight sideways: the edge bows through it, and the weight rides along.
  await mouseDragFrom(page, weightBefore, 0, 50);
  const bent = await pathEnds(edgePath);
  expect(bent.d).toContain("Q");
  const weightAfter = await screenCentre(weight);
  expect(distance(weightAfter, weightBefore)).toBeGreaterThan(20);
  // Dragging the edge's line itself (a third of the way along, clear of the weight) bends it too.
  const line = page.locator(`${scope} [data-layer="edge-handles"] [data-drag-edge="1-2"]`);
  await mouseDragFrom(page, await pointAlong(line, 0.3), 0, -100);
  expect((await pathEnds(edgePath)).d).not.toBe(bent.d);
  await mouseDrag(page, graphNode(page, "3"), -60, 40);
  const edited = await centresOf(page, scope);
  const editedPath = (await pathEnds(edgePath)).d;

  // Run, and every step, keep the hand-made layout.
  await runToFrame(page, capture, 0);
  expect(await centresOf(page, scope)).toEqual(edited);
  expect((await pathEnds(edgePath)).d).toBe(editedPath);
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[1].caption);
  expect(await centresOf(page, scope)).toEqual(edited);
  expect((await pathEnds(edgePath)).d).toBe(editedPath);
});

test("Drag: the Force / Circle switch and a new instance put the automatic layout back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPicture(page, "Clique", CLIQUE_GRAPH_FRAMES);
  const scope = `${GRAPH}-graph`;
  const force = await centresOf(page, scope);
  await mouseDrag(page, graphNode(page, "4"), -80, -40);
  expect(await centresOf(page, scope)).not.toEqual(force);
  await page.locator(`${GRAPH}-layout-circle`).click();
  await page.locator(`${GRAPH}-layout-force`).click();
  expect(await centresOf(page, scope)).toEqual(force);
  await expect(page.locator(`${GRAPH}-layout-reset`)).toBeDisabled();

  // A new instance (here the same graph, written with a trailing space) starts afresh.
  await mouseDrag(page, graphNode(page, "4"), -80, -40);
  await expect(page.locator(`${GRAPH}-layout-reset`)).toBeEnabled();
  await openPanel(page, "instance", { expect });
  const input = page.locator("#workbench-instance-full-instance");
  await input.fill(`${await input.inputValue()} `);
  await expect(page.locator(`${GRAPH}-layout-reset`)).toBeDisabled();
  await expect.poll(() => centresOf(page, scope)).toEqual(force);
});

test("Drag: the arrow keys move a focused node, Shift further, and say so", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPicture(page, "Clique", CLIQUE_GRAPH_FRAMES);
  const node = graphNode(page, "1");
  const start = await drawnCentre(node);
  await node.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(async () => (await drawnCentre(node)).x - start.x).toBeCloseTo(10, 1);
  await expect(page.locator(`${GRAPH}-moved`)).toHaveText("Moved Node 1 right.");
  await page.keyboard.press("Shift+ArrowLeft");
  await expect.poll(async () => (await drawnCentre(node)).x - start.x).toBeCloseTo(-40, 1);
  expect((await drawnCentre(node)).y).toBeCloseTo(start.y, 1);
  // Enter still pins the node.
  await page.keyboard.press("Enter");
  await expect(node).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(`${GRAPH}-layout-reset`)).toBeEnabled();
});

test("Drag: zoomed in, a node follows the pointer through the zoomed view, and empty space still pans", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPicture(page, "Clique", CLIQUE_GRAPH_FRAMES);
  await page.locator(`${GRAPH}-zoom-in`).click();
  await page.locator(`${GRAPH}-zoom-in`).click();
  await expect(page.locator(`${GRAPH}-zoom`)).toHaveAttribute("data-zoom", "2.25");
  const node = graphNode(page, "3");
  const from = await screenCentre(node);
  const drawnBefore = await drawnCentre(node);
  const viewBox = await viewBoxOf(page);
  // Towards the middle of the picture, so nothing stops it.
  const svgBox = await page.locator(`${GRAPH}-svg`).boundingBox();
  const dx = from.x < svgBox.x + svgBox.width / 2 ? 45 : -45;
  const dy = from.y < svgBox.y + svgBox.height / 2 ? 30 : -30;
  await mouseDragFrom(page, from, dx, dy);
  // The node is still under the pointer: drawing units are screen px over the zoomed scale.
  const to = await screenCentre(node);
  expect(Math.abs(to.x - from.x - dx)).toBeLessThan(2);
  expect(Math.abs(to.y - from.y - dy)).toBeLessThan(2);
  const scale = await page.locator(`${GRAPH}-svg`).evaluate((svg) => svg.getScreenCTM().a);
  const drawnAfter = await drawnCentre(node);
  expect(Math.abs(drawnAfter.x - drawnBefore.x - dx / scale)).toBeLessThan(1);
  // Dragging the node did not pan.
  expect(await viewBoxOf(page)).toBe(viewBox);

  // A drag on empty space pans, and moves no node.
  const empty = await page.locator(`${GRAPH}-svg`).evaluate((svg) => {
    const rect = svg.getBoundingClientRect();
    for (let y = rect.top + 10; y < rect.bottom - 10; y += 12) {
      for (let x = rect.left + 10; x < rect.right - 10; x += 12) {
        if (document.elementFromPoint(x, y) === svg) return { x, y };
      }
    }
    return null;
  });
  expect(empty).not.toBeNull();
  const centres = await centresOf(page, `${GRAPH}-graph`);
  await mouseDragFrom(page, empty, 40, 0);
  expect(await viewBoxOf(page)).not.toBe(viewBox);
  expect(await centresOf(page, `${GRAPH}-graph`)).toEqual(centres);
});

test("Drag: on a touch screen a swipe at fit scrolls the page, and a long press then a drag moves the node", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await openPicture(page, "Clique", CLIQUE_GRAPH_FRAMES);
  await page.locator("#workbench-panel-close").click();
  await expectFits(page, `${GRAPH}-svg`);
  const node = graphNode(page, "2");
  const before = await centresOf(page, `${GRAPH}-graph`);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 2 });
  const touch = (type, touchPoints) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints });

  // A quick swipe over the node: the page scrolls, and the node stays where it was. (The finger
  // moves down, so the page scrolls up, when there is room above; up otherwise.)
  const at = await screenCentre(node);
  const scrollBefore = await page.evaluate(() => window.scrollY);
  const down = scrollBefore > 150 ? 1 : -1;
  await touch("touchStart", [{ x: at.x, y: at.y, id: 0 }]);
  for (let step = 1; step <= 6; step += 1) {
    await touch("touchMove", [{ x: at.x, y: at.y + down * step * 20, id: 0 }]);
  }
  await touch("touchEnd", []);
  await expect
    .poll(async () => down * (scrollBefore - (await page.evaluate(() => window.scrollY))))
    .toBeGreaterThan(20);
  expect(await centresOf(page, `${GRAPH}-graph`)).toEqual(before);
  await expect(page.locator(`${GRAPH}-layout-reset`)).toBeDisabled();

  // A long press arms the node (a dashed outline); the drag after it moves the node, not the page.
  const held = await screenCentre(node);
  const scrollHeld = await page.evaluate(() => window.scrollY);
  await touch("touchStart", [{ x: held.x, y: held.y, id: 0 }]);
  await expect(page.locator(`${GRAPH}-graph [data-drag-armed]`)).toHaveAttribute(
    "data-node-id",
    "2",
  );
  for (let step = 1; step <= 6; step += 1) {
    await touch("touchMove", [{ x: held.x + step * 8, y: held.y + step * 6, id: 0 }]);
  }
  await touch("touchEnd", []);
  await expect(page.locator(`${GRAPH}-graph [data-drag-armed]`)).toHaveCount(0);
  const moved = await drawnCentre(node);
  expect(distance(moved, before["2"])).toBeGreaterThan(15);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollHeld);
  await expect(node).toHaveAttribute("aria-pressed", "false");
});

test("Drag: an Automaton state moves with its arrows, Garbage moves too, and the fall arrow follows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const capture = DFA_GARBAGE_AUTOMATON_FRAMES;
  await openAutomaton(page, AUTOMATON_CASES.garbage);
  const scope = `${AUTOMATON}-graph`;
  const before = await centresOf(page, scope);
  const entry = page.locator(`${scope} [data-start-arrow] path`);
  const entryBefore = await pathEnds(entry);
  const arrowPath = automatonArrow(page, "q:1>q:2").locator("path");

  // The start state moves freely; its entry arrow and its arrows go with it.
  await mouseDrag(page, automatonState(page, "q:1"), 40, 70);
  const moved = await drawnCentre(automatonState(page, "q:1"));
  expect(moved.x - before["q:1"].x).toBeGreaterThan(10);
  expect(moved.y - before["q:1"].y).toBeGreaterThan(20);
  const entryAfter = await pathEnds(entry);
  expect(entryAfter.d).not.toBe(entryBefore.d);
  expect(Math.abs(entryAfter.end.y - moved.y)).toBeLessThan(1);
  expect(distance((await pathEnds(arrowPath)).start, moved)).toBeLessThan(STATE_RADIUS_UNITS + 4);

  // Garbage moves like any state.
  await mouseDrag(page, automatonState(page, "garbage"), -120, 0);
  const garbage = await drawnCentre(automatonState(page, "garbage"));
  expect(before.garbage.x - garbage.x).toBeGreaterThan(30);

  // Garbage takes focus like a state, and the arrow keys move it the same steps.
  const garbageNode = automatonState(page, "garbage");
  await expect(garbageNode).toHaveAttribute("tabindex", "0");
  await expect(garbageNode).toHaveAttribute("aria-label", /^Garbage state, /);
  await garbageNode.focus();
  await page.keyboard.press("ArrowUp");
  // The focus ring shows on it, as on a state.
  expect(await garbageNode.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
  await expect.poll(async () => (await drawnCentre(garbageNode)).y).toBeCloseTo(garbage.y - 10, 1);
  await expect(page.locator(`${AUTOMATON}-moved`)).toHaveText("Moved Garbage state up.");
  await page.keyboard.press("Shift+ArrowRight");
  await expect.poll(async () => (await drawnCentre(garbageNode)).x).toBeCloseTo(garbage.x + 50, 1);
  // Its idle look is kept.
  await expect(garbageNode).toHaveAttribute("data-look", "idle");
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => drawnCentre(garbageNode)).toEqual(garbage);

  // A tap still traces (and a second tap lets go).
  await wobblyClick(page, automatonState(page, "q:2"));
  await expect(automatonState(page, "q:2")).toHaveAttribute("aria-pressed", "true");
  await automatonState(page, "q:2").click();

  // Another visualization (drawn from the same capture here) starts from the layout again, and
  // switching back finds this one's moves as they were left (#252); Reset layout clears them.
  const edited = await centresOf(page, scope);
  const listbox = page.locator("#workbench-source-type-listbox");
  await page.locator("#workbench-source-type-button").click();
  await listbox.locator('[role="option"][aria-selected="false"]').first().click();
  await expect(page.locator(`${AUTOMATON}-layout-reset`)).toBeDisabled();
  await expect.poll(() => centresOf(page, scope)).toEqual(before);
  await page.locator("#workbench-source-type-button").click();
  await listbox.locator('[role="option"][aria-selected="false"]').first().click();
  await expect(page.locator(`${AUTOMATON}-layout-reset`)).toBeEnabled();
  await expect.poll(() => centresOf(page, scope)).toEqual(edited);
  await page.locator(`${AUTOMATON}-layout-reset`).click();
  await expect(page.locator(`${AUTOMATON}-layout-reset`)).toBeDisabled();
  await mouseDrag(page, automatonState(page, "garbage"), -120, 0);
  const garbageMoved = await drawnCentre(automatonState(page, "garbage"));
  expect(distance(garbageMoved, garbage)).toBeLessThan(1);

  // The run falls into Garbage from q:3: the fall arrow runs from where both are now.
  await runToFrame(page, capture, 3);
  const fall = page.locator(`${scope} [data-fall-arrow] path`);
  await expect(fall).toBeVisible();
  const fallEnds = await pathEnds(fall);
  const from = await drawnCentre(automatonState(page, "q:3"));
  expect(distance(fallEnds.start, from)).toBeLessThan(STATE_RADIUS_UNITS + 12);
  expect(distance(fallEnds.end, garbage)).toBeLessThan(80);
  expect(await drawnCentre(automatonState(page, "garbage"))).toEqual(garbage);
});

test("Drag: bending an Automaton arrow moves its label, and dragging a loop turns it around its state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openAutomaton(page, AUTOMATON_CASES.garbage);
  const scope = `${AUTOMATON}-graph`;
  const label = page.locator(`${scope} [data-layer="labels"] [data-drag-edge="q:1>q:2"]`);
  const path = automatonArrow(page, "q:1>q:2").locator("path");
  const before = await pathEnds(path);
  const labelBefore = await screenCentre(label);
  await mouseDragFrom(page, labelBefore, 0, -60);
  expect((await pathEnds(path)).d).not.toBe(before.d);
  const labelAfter = await screenCentre(label);
  expect(labelBefore.y - labelAfter.y).toBeGreaterThan(25);

  // The loop on q:3: drag its label round to the state's other side.
  const state = await drawnCentre(automatonState(page, "q:3"));
  const loopLabel = page.locator(`${scope} [data-layer="labels"] [data-drag-edge="q:3>q:3"]`);
  const loopPath = automatonArrow(page, "q:3>q:3").locator("path");
  const loopBefore = await pathEnds(loopPath);
  const labelDrawn = () =>
    loopLabel.locator("rect").evaluate((el) => {
      const box = el.getBBox();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
  const sideBefore = await labelDrawn();
  const stateOnScreen = await screenCentre(automatonState(page, "q:3"));
  const grab = await screenCentre(loopLabel);
  await mouseDragFrom(page, grab, 2 * (stateOnScreen.x - grab.x), 2 * (stateOnScreen.y - grab.y));
  expect((await pathEnds(loopPath)).d).not.toBe(loopBefore.d);
  // The label is now on the far side: its direction from the state points the other way.
  const sideAfter = await labelDrawn();
  const dot =
    (sideBefore.x - state.x) * (sideAfter.x - state.x) +
    (sideBefore.y - state.y) * (sideAfter.y - state.y);
  expect(dot).toBeLessThan(0);
  // Turning a loop doesn't move its state.
  expect(await drawnCentre(automatonState(page, "q:3"))).toEqual(state);
});

test("Drag: a Bipartite node only moves up and down its own column", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openBipartite(page, BIPARTITE_CASES[0]);
  const scope = `${BIPARTITE}-graph`;
  const before = await centresOf(page, scope);
  const edge = bipartiteEdge(page, "e:2~S1");
  await mouseDrag(page, bipartiteNode(page, "e:2"), 120, 70);
  const element = await drawnCentre(bipartiteNode(page, "e:2"));
  expect(element.x).toBeCloseTo(before["e:2"].x, 1);
  expect(element.y - before["e:2"].y).toBeGreaterThan(20);
  expect(Math.abs((await pathEnds(edge)).start.y - element.y)).toBeLessThan(1);

  await mouseDrag(page, bipartiteNode(page, "S1"), -200, 60);
  const set = await drawnCentre(bipartiteNode(page, "S1"));
  expect(set.x).toBeCloseTo(before.S1.x, 1);
  expect(set.y - before.S1.y).toBeGreaterThan(20);
  expect(Math.abs((await pathEnds(edge)).end.y - set.y)).toBeLessThan(1);
  // The elements and the sets are still on their own sides.
  const after = await centresOf(page, scope);
  for (const id of ["e:1", "e:2", "e:3", "e:4", "e:5"]) {
    expect(after[id].x).toBeLessThan(after.S1.x);
  }

  await wobblyClick(page, bipartiteNode(page, "S2"));
  await expect(bipartiteNode(page, "S2")).toHaveAttribute("aria-pressed", "true");
});

test("Drag: a Layered node only moves within its layer, and its edges follow", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openLayered(page, LAYERED_CASES.topo);
  const scope = `${LAYERED}-graph`;
  const before = await centresOf(page, scope);
  const into = layeredEdge(page, "1>3").locator("path");
  const intoBefore = await pathEnds(into);
  await mouseDrag(page, layeredNode(page, "3"), 150, 60);
  const moved = await drawnCentre(layeredNode(page, "3"));
  expect(moved.x).toBeCloseTo(before["3"].x, 1);
  expect(moved.y - before["3"].y).toBeGreaterThan(20);
  expect((await pathEnds(into)).d).not.toBe(intoBefore.d);
  // The arrow keys keep to the layer too.
  await layeredNode(page, "3").focus();
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("ArrowUp");
  await expect
    .poll(async () => (await drawnCentre(layeredNode(page, "3"))).y)
    .toBeCloseTo(moved.y - 10, 1);
  expect((await drawnCentre(layeredNode(page, "3"))).x).toBeCloseTo(before["3"].x, 1);

  await wobblyClick(page, layeredNode(page, "2"));
  await expect(layeredNode(page, "2")).toHaveAttribute("aria-pressed", "true");
});

test("Drag: a Flow Network's source stays leftmost and its sink rightmost", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openFlow(page, FLOW_CASES.default);
  const scope = `${FLOW}-graph`;
  const before = await centresOf(page, scope);
  // The source dragged far right stops at the leftmost other node.
  await mouseDrag(page, flowNode(page, "1"), 600, 0);
  let now = await centresOf(page, scope);
  for (const id of ["2", "3", "4"]) expect(now["1"].x).toBeLessThanOrEqual(now[id].x + 0.5);
  expect(now["1"].x).toBeGreaterThan(before["1"].x);
  // The sink dragged far left stops at the rightmost other node.
  await mouseDrag(page, flowNode(page, "4"), -700, 0);
  now = await centresOf(page, scope);
  for (const id of ["1", "2", "3"]) expect(now["4"].x).toBeGreaterThanOrEqual(now[id].x - 0.5);
  // A middle node moves freely in between, and its edges follow.
  const edge = flowEdge(page, "2>4").locator("path");
  await mouseDrag(page, flowNode(page, "2"), 30, 80);
  const middle = await drawnCentre(flowNode(page, "2"));
  expect(middle.y - now["2"].y).toBeGreaterThan(20);
  expect(distance((await pathEnds(edge)).start, middle)).toBeLessThan(30);

  await wobblyClick(page, flowNode(page, "3"));
  await expect(flowNode(page, "3")).toHaveAttribute("aria-pressed", "true");
});

test("Drag: a clause moves with its literals, and a literal stays inside its clause", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openPicture(page, "3SAT", SAT3_CLAUSE_GRAPH_FRAMES);
  const scope = `${CLAUSES}-graph`;
  const before = await centresOf(page, scope);
  const hull = clause(page, "c0").locator("circle");
  const hullBefore = await drawnCentre(clause(page, "c0"));
  // Grab the clause by its circle, away from its literals (near its rim).
  const box = await hull.boundingBox();
  await mouseDragFrom(page, { x: box.x + box.width / 2, y: box.y + 6 }, 70, 50);
  const hullAfter = await drawnCentre(clause(page, "c0"));
  const shift = { x: hullAfter.x - hullBefore.x, y: hullAfter.y - hullBefore.y };
  expect(Math.hypot(shift.x, shift.y)).toBeGreaterThan(20);
  const after = await centresOf(page, scope);
  for (const id of ["c0-0", "c0-1", "c0-2"]) {
    expect(after[id].x - before[id].x).toBeCloseTo(shift.x, 1);
    expect(after[id].y - before[id].y).toBeCloseTo(shift.y, 1);
  }
  for (const id of ["c1-0", "c2-0"]) expect(after[id]).toEqual(before[id]);

  // A literal dragged far away stops at its clause's circle.
  await mouseDrag(page, literal(page, "c0-1"), 400, 300);
  const radius = await hull.evaluate((el) => Number(el.getAttribute("r")));
  const literalAt = await drawnCentre(literal(page, "c0-1"));
  const centre = await drawnCentre(clause(page, "c0"));
  expect(distance(literalAt, centre)).toBeLessThanOrEqual(radius - 17 + 0.5);
  expect(distance(literalAt, after["c0-1"])).toBeGreaterThan(5);

  await wobblyClick(page, literal(page, "c1-0"));
  await expect(literal(page, "c1-0")).toHaveAttribute("aria-pressed", "true");
});

test("Drag: a Tripartite name only moves up and down its own column, and its triples follow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openTripartite(page, DM3_TRIPARTITE_FRAMES);
  const austin = tripartiteElement(page, "y2");
  const before = await drawnCentre(austin);
  const line = tripartiteLine(page, "T2");
  const d = await line.getAttribute("d");
  await mouseDrag(page, austin, 120, 40);
  const moved = await drawnCentre(austin);
  expect(moved.x).toBeCloseTo(before.x, 1);
  expect(moved.y - before.y).toBeGreaterThan(20);
  // T2's line (Paul, Austin, Jake) now meets Austin where it is.
  const ys = (await line.getAttribute("d")).match(/-?[\d.]+,-?[\d.]+/g).map((pair) => {
    const [, y] = pair.split(",").map(Number);
    return y;
  });
  expect(ys.some((y) => Math.abs(y - moved.y) < 10)).toBe(true);
  expect(await line.getAttribute("d")).not.toEqual(d);
  // Never above the first row, however far it is dragged.
  await mouseDrag(page, austin, 0, -400);
  const top = await drawnCentre(tripartiteElement(page, "y1"));
  expect((await drawnCentre(austin)).y).toBeGreaterThanOrEqual(top.y - 0.5);
  await page.locator(`${TRIPARTITE}-layout-reset`).click();
  expect(await drawnCentre(austin)).toEqual(before);
  await expect(line).toHaveAttribute("d", d);
});
