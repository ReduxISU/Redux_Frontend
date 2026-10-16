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

import { expect, test } from "./fixtures";
import { gotoProblemDetail } from "./helpers";
import {
  ARC_SET_LAYERED_FRAMES,
  CLIQUE_COVER_GRAPH_FRAMES,
  CLIQUE_FAILED_GRAPH_FRAMES,
  CLIQUE_GRAPH_FRAMES,
  DFA_ABC_GARBAGE_AUTOMATON_FRAMES,
  DFA_AUTOMATON_FRAMES,
  DFA_AUTOMATON_LIST,
  DFA_GARBAGE_AUTOMATON_FRAMES,
  DFA_TABLE_FRAMES,
  DIRECTED_HAMILTONIAN_GRAPH_FRAMES,
  EXACT_COVER_BIPARTITE_FRAMES,
  HITTING_SET_BIPARTITE_FRAMES,
  ILP_TABLE_FRAMES_WITH_BLANK,
  LARGE_GRAPH_FRAMES,
  MAX_CUT_GRAPH_FRAMES,
  NFA_BACKTRACK_REJECTED_AUTOMATON_FRAMES,
  NFA_DEFAULT_AUTOMATON_FRAMES,
  NFA_SUBSET_AUTOMATON_FRAMES,
  NODE_SET_LAYERED_FRAMES,
  SAT3_FACTOR_GRAPH_FRAMES,
  SCC_LAYERED_FRAMES,
  SET_COVER_BIPARTITE_FRAMES,
  SET_COVER_FAILED_BIPARTITE_FRAMES,
  SPSP_LAYERED_FRAMES,
  SSSP_PARALLEL_LAYERED_FRAMES,
  SSSP_UNREACHABLE_LAYERED_FRAMES,
  STEINER_GRAPH_FRAMES,
  TOPOLOGICAL_SORT_CYCLE_LAYERED_FRAMES,
  TOPOLOGICAL_SORT_LAYERED_FRAMES,
} from "./picture-payloads";

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

  // Run draws the first frame: the first try, with its totals.
  await page.locator("#workbench-run").click();
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
  await expect(caption).toHaveText(first.caption);
  await expect(page.locator("#workbench-steps-position")).toHaveText("Step 1 of 3");
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

/** Presses Run and steps forward to frame `index` (0-based). */
async function runToFrame(page, capture, index) {
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-steps-position")).toHaveText(
    `Step 1 of ${capture.frames.length}`,
  );
  for (let step = 0; step < index; step += 1) {
    await page.locator("#workbench-steps-next").click();
  }
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[index].caption);
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
    problem: "Hitting Set",
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
    await expect(graph.locator("[data-focusable]")).toHaveCount(payload.states.length);
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
    for (const piece of await graph.locator("[data-focusable]").all()) {
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
  // The steps start over on the path's own frames.
  const position = page.locator("#workbench-steps-position");
  await expect(position).toHaveText(`Step 1 of ${paths[0].frames.length}`);
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
  await expect(position).toHaveText(`Step 1 of ${dies.frames.length}`);
  for (let index = 1; index < dies.frames.length; index += 1) {
    await page.locator("#workbench-steps-next").click();
  }
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
  await expect(position).toHaveText(`Step 1 of ${capture.frames.length}`);
  await expect(page.locator(`${CAPTION}-text`)).toHaveText(capture.frames[0].caption);
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
