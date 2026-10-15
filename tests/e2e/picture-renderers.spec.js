// tests/e2e/picture-renderers.spec.js
//
// #199: the format=frames rendering foundation. The renderer is picked by the response's
// picture `type`; a type with no renderer here falls back to the old flat-list request and
// renderer; the step controls walk a format=frames run's frames, with each step's caption.
//
// Pinned to DFA Acceptance: it has one visualization whose picture type has a renderer
// (the Table) and one whose type does not yet (the Automaton), and a fast solver. The catalog
// comes from the real backend like the rest of the suite; every picture and solve request is
// answered here from payloads captured off the live API (tests/e2e/picture-payloads.js), so
// CI needs no backend that serves format=frames. Catalog answers are only edited to set or
// remove a visualization's `pictureType`, which decides whether the frames request is made.
//
// #201: the Graph renderer, below the foundation's tests, on one small captured run per shape.
// Before Run the picture is the plain instance (no step's states or annotations); a diagram
// always opens fitted to its width, and zooms and pans (DiagramZoom.js).

import { expect, test } from "./fixtures";
import { gotoProblemDetail } from "./helpers";
import {
  CLIQUE_COVER_GRAPH_FRAMES,
  CLIQUE_FAILED_GRAPH_FRAMES,
  CLIQUE_GRAPH_FRAMES,
  DFA_AUTOMATON_FRAMES,
  DFA_AUTOMATON_LIST,
  DFA_TABLE_FRAMES,
  DIRECTED_HAMILTONIAN_GRAPH_FRAMES,
  LARGE_GRAPH_FRAMES,
  MAX_CUT_GRAPH_FRAMES,
  STEINER_GRAPH_FRAMES,
} from "./picture-payloads";

const PROBLEM = "DFA Acceptance";
const TABLE_VIZ = "DFATableVisualization";
const AUTOMATON_VIZ = "DFAVisualization";

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
      json = format === "frames" ? DFA_AUTOMATON_FRAMES : DFA_AUTOMATON_LIST;
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
  // Before Run it is the plain picture: the first step's cell text, but none of its states.
  await expect(picture.locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(page.locator(`${TABLE_PREFIX}-r0`)).toHaveAttribute("data-state", "Background");
  await expect(page.locator(`${TABLE_PREFIX}-r0c3`)).toHaveText("1");
  await expect(page.locator(`${TABLE_PREFIX}-r0c3`)).not.toHaveAttribute("data-changed", /./);
  expect(asked).toEqual([`${TABLE_VIZ} frames`]);

  // The Automaton type has none yet: the frames answer is set aside, the list is asked for,
  // and the old renderer draws it.
  await chooseVisualization(page, "Deterministic Finite Automata Visualization");
  await expect(picture).toHaveAttribute("data-picture-kind", "frame");
  expect(asked).toEqual([
    `${TABLE_VIZ} frames`,
    `${AUTOMATON_VIZ} frames`,
    `${AUTOMATON_VIZ} list`,
  ]);
});

test("when pictureType already names a type with no renderer, only the old list is asked for", async ({
  page,
}) => {
  await setPictureTypes(page, { [TABLE_VIZ]: "Table", [AUTOMATON_VIZ]: "Automaton" });
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
  const fit = await viewBoxOf(page);
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
  const fit = await viewBoxOf(page);
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
