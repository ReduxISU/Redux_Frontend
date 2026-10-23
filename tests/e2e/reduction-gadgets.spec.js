// tests/e2e/reduction-gadgets.spec.js
//
// #239: gadget marks on every picture type, and the Reduction View's gadget follow-ups.
//   - Every renderer draws a gadget's pieces itself (components/pictures/gadgetRings.js): a ring
//     around a node or a box, a band under an edge, in the gadget gold, never by opacity.
//   - The Plain / Color switch: Plain marks a gadget while it is pointed at; Color gives every
//     gadget its own color on both sides all the time, kept for the viewer, listed in the Legend.
//   - During Build the caption lists the gadgets the step made, in plain words, and the bound a
//     step sets (Clique's K).
//   - A dashed "Rule says no" line is a piece: pointing at it (or tapping, or focusing it) names
//     the edge rule that left the pair unjoined.
//   - The Gadgets rows (under the pictures) say each gadget in plain words.
//   - The gadget gold and the orange hover trace look clearly different in both themes.
//   - A picture other than the default (SAT's Factor Graph) shares the default's ids, so links
//     work there; a Search Tree draws none of them and says so, and its pane fits the tree so far.
//
// The catalog comes from the real backend, like the rest of the suite. CI's backend has no
// Reduction View, so its answers are captures from a local build (./reduction-payloads.js and
// ./reduction-gadget-payloads.js), or, for the every-picture-type test, a view put together here
// from each picture type's own captured run (./picture-payloads.js and the others), drawn on both
// sides of the view.

import { LDC_SMALL_CODE_TREE_FRAMES } from "./code-tree-payloads";
import { expect, test } from "./fixtures";
import { SAT_TO_3SAT_FORMULA_VIEW, SAT3_FORMULA_FRAMES } from "./formula-payloads";
import { showPane } from "./helpers";
import { EXACT_COVER_RECURSIVE_NESTED_FRAMES } from "./nested-set-payloads";
import {
  CLIQUE_GRAPH_FRAMES,
  CONVEX_HULL_SMALL_GEOMETRY_FRAMES,
  DFA_AUTOMATON_FRAMES,
  DM3_TRIPARTITE_FRAMES,
  EXACT_COVER_BIPARTITE_FRAMES,
  MIN_CUT_FLOW_FRAMES,
  N_QUEENS_BOARD_FRAMES,
  SAT3_CLAUSE_GRAPH_FRAMES,
  SAT3_SEARCH_TREE_FRAMES,
  SUBSET_SUM_PACKING_FRAMES,
  TOPOLOGICAL_SORT_LAYERED_FRAMES,
} from "./picture-payloads";
import { DEUTSCH_JOZSA_QUANTUM_FRAMES } from "./quantum-payloads";
import {
  EXACT_COVER_TO_SUBSET_SUM_VIEW,
  SAT3_TO_CLIQUE_RULES_VIEW,
  SAT3_TO_ILP_VIEW,
} from "./reduction-gadget-payloads";
import {
  SAT_TO_3SAT_FACTOR_GRAPH_VIEW,
  SAT_TO_3SAT_SEARCH_TREE_VIEW,
  SAT_TO_3SAT_VIEW,
  SAT3_TO_CLIQUE_VIEW,
} from "./reduction-payloads";
import { JOB_SEQUENCING_SMALL_SCHEDULE_FRAMES } from "./schedule-payloads";
import { ILP_TABLE_FRAMES } from "./table-payloads";

const REDUCTION_VIEW_REQUEST = /\/api\/redux\/ProblemProvider\/reductionView\?/;
const VIEW = "#workbench-reduction";
const pane = (page, side) => page.locator(`${VIEW}-${side}`);
const rings = (page, side) => pane(page, side).locator("[data-gadget-ring]");
const readout = (page) => page.locator(`${VIEW}-link`);
const marksButton = (page, mode) => page.locator(`${VIEW}-marks-${mode}`);
const gadgetRow = (page, index) => page.locator(`#workbench-gadgets-row-${index}`);

// The pieces' id attributes, as lib/reductionView.js PIECE_ID_ATTRIBUTES lists them.
const PIECE_SELECTOR = [
  "data-node-id",
  "data-edge-id",
  "data-clause-id",
  "data-variable-id",
  "data-item-id",
  "data-piece-for",
  "data-container-id",
  "data-element-id",
  "data-triple-id",
  "data-square-id",
  "data-piece-id",
  "data-point-id",
  "data-job-id",
  "data-pump-id",
  "data-cell-id",
  "data-row-id",
  "data-column-id",
  "data-qubit-id",
  "data-gate-id",
  "data-phantom-id",
]
  .map((name) => `[${name}]`)
  .join(",");

/** Opens 3SAT on its Clique target in Reduce mode (the page any captured view is drawn on). */
async function openReduce(page, instance = SAT3_TO_CLIQUE_VIEW.source.instance) {
  await page.goto(`/3SAT?instance=${encodeURIComponent(instance)}`);
  await expect(page.getByRole("heading", { level: 1, name: "3SAT" })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator("#workbench-mode-reduce").click();
  const target = /^Clique(?!\s*Cover)/;
  const current = ((await page.locator("#workbench-target-value").textContent()) ?? "").trim();
  if (!target.test(current)) {
    await page.locator("#workbench-target-button").click();
    await page
      .locator("#workbench-target-listbox")
      .getByRole("option")
      .filter({ hasText: target })
      .first()
      .click();
  }
  await expect(page.locator("#workbench-target-value")).toHaveText(target);
}

/** Answers reductionView with `answer()` (read on every request), opens the page and runs it. */
async function openView(page, answer) {
  await page.route(REDUCTION_VIEW_REQUEST, (route) => route.fulfill({ json: answer() }));
  await openReduce(page);
  await page.locator("#workbench-run").click();
  await expect(page.locator(VIEW)).toBeVisible();
  // The pointer off the pictures, so nothing is hovered by where Run's button was.
  await page.mouse.move(1, 1);
}

/** The step controls to `index` (0-based), by the slider's keyboard. */
async function toStep(page, index) {
  const slider = page.locator('#workbench-steps-slider input[type="range"]');
  await slider.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < index; i += 1) await page.keyboard.press("ArrowRight");
  await expect(page.locator(VIEW)).toHaveAttribute("data-frame-index", String(index));
}

/** A CSS color ("rgb(r, g, b)") as [r, g, b]. */
function rgb(color) {
  return color
    .match(/\d+(\.\d+)?/g)
    .slice(0, 3)
    .map(Number);
}

/** CIE76 delta E between two "rgb(...)" colors (scripts/check-contrast.mjs measures the same). */
function deltaE(a, b) {
  const lab = (color) => {
    const [r, g, bl] = rgb(color).map((value) => {
      const s = value / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    const x = (r * 0.4124 + g * 0.3576 + bl * 0.1805) / 0.95047;
    const y = r * 0.2126 + g * 0.7152 + bl * 0.0722;
    const z = (r * 0.0193 + g * 0.1192 + bl * 0.9505) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
  };
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** The computed stroke (or, for an HTML piece, outline) color of every mark on one side. */
function ringColors(page, side) {
  return rings(page, side).evaluateAll((marks) =>
    marks.map((mark) => {
      const style = getComputedStyle(mark);
      return mark instanceof SVGElement ? style.stroke : style.outlineColor;
    }),
  );
}

// --- Every picture type -------------------------------------------------------------------------

/**
 * One captured run per picture type. The view built from it draws the run on both sides, its
 * last few steps as the Solve phase.
 */
const PICTURES = {
  Graph: CLIQUE_GRAPH_FRAMES,
  GroupedGraph: SAT3_CLAUSE_GRAPH_FRAMES,
  Formula: SAT3_FORMULA_FRAMES,
  BipartiteGraph: EXACT_COVER_BIPARTITE_FRAMES,
  NestedSet: EXACT_COVER_RECURSIVE_NESTED_FRAMES,
  TripartiteMatching: DM3_TRIPARTITE_FRAMES,
  LayeredGraph: TOPOLOGICAL_SORT_LAYERED_FRAMES,
  FlowNetwork: MIN_CUT_FLOW_FRAMES,
  Automaton: DFA_AUTOMATON_FRAMES,
  Board: N_QUEENS_BOARD_FRAMES,
  Geometry: CONVEX_HULL_SMALL_GEOMETRY_FRAMES,
  Packing: SUBSET_SUM_PACKING_FRAMES,
  Schedule: JOB_SEQUENCING_SMALL_SCHEDULE_FRAMES,
  Table: ILP_TABLE_FRAMES,
  SearchTree: SAT3_SEARCH_TREE_FRAMES,
  CodeTree: LDC_SMALL_CODE_TREE_FRAMES,
  QuantumCircuit: DEUTSCH_JOZSA_QUANTUM_FRAMES,
};

/**
 * A Reduction View that draws `capture` on both sides, with one element gadget for each id in
 * `ids` (the same id on both sides), or none.
 */
function viewOf(capture, ids) {
  const side = (problem) => ({
    problem,
    instance: "",
    picture: { type: capture.type, payload: capture.payload },
  });
  const frames = capture.frames.slice(-3).map((frame, index) => ({
    phase: "solve",
    event: frame.event ?? "Try",
    caption: frame.caption ?? `Step ${index + 1}`,
    step: index,
    sourceFocus: [],
    targetFocus: [],
    source: frame,
    target: frame,
  }));
  return {
    type: "Reduction",
    kind: "reduction",
    reduction: "SipserReduceToCliqueStandard",
    reductionName: "A test view",
    solver: "",
    source: side("Source"),
    target: { ...side("Target"), buildOrder: { nodes: [], edges: [] } },
    gadgets: ids.map((id) => ({ gadgetKind: "element", sourceIds: [id], targetIds: [id] })),
    frames,
  };
}

/** The ids of every piece drawn on one side (pieces hidden from view left out). */
function drawnPieceIds(page, side) {
  return pane(page, side).evaluate((root, selector) => {
    const ids = new Set();
    const names = selector.map((part) => part.slice(1, -1));
    for (const element of root.querySelectorAll(selector.join(","))) {
      const box = element.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      // The piece's id as lib/reductionView.js pieceIdOf reads it: the first attribute listed.
      const name = names.find((candidate) => element.getAttribute(candidate));
      if (name) ids.add(element.getAttribute(name));
    }
    return [...ids].sort();
  }, PIECE_SELECTOR.split(","));
}

for (const [type, capture] of Object.entries(PICTURES)) {
  test(`${type}: a gadget's pieces are marked by the renderer itself, Plain from a Gadgets row and Color all the time`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    // First a view with no gadgets, to read which pieces the renderer draws; then one gadget per
    // drawn piece.
    let ids = [];
    await openView(page, () => viewOf(capture, ids));
    await toStep(page, 2);
    ids = await drawnPieceIds(page, "source");
    expect(ids.length, `${type} draws pieces with ids`).toBeGreaterThan(0);
    await page.locator("#workbench-run").click();
    await expect(page.locator(`${VIEW}-marks-row`)).toBeVisible();
    await page.mouse.move(1, 1);
    await toStep(page, 2);

    // Plain: nothing is marked until a Gadgets row is pointed at; then its piece, in the gold,
    // on both sides.
    await expect(rings(page, "source")).toHaveCount(0);
    await showPane(page, "visualization", { expect });
    await page.locator("#workbench-gadgets-toggle").click();
    const row = gadgetRow(page, 0);
    await row.scrollIntoViewIfNeeded();
    await row.hover();
    for (const side of ["source", "target"]) {
      await expect(
        pane(page, side).locator(`[data-gadget-ring="${ids[0]}"]`).filter({ visible: true }),
      ).not.toHaveCount(0);
      const marked = await rings(page, side).evaluateAll((marks) =>
        marks.map((mark) => mark.getAttribute("data-gadget-ring")),
      );
      expect(new Set(marked), `${type} ${side}`).toEqual(new Set([ids[0]]));
    }
    const gold = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--mui-palette-viz-gadget)";
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    });
    for (const color of await ringColors(page, "source")) expect(color).toBe(gold);
    // Never by opacity.
    const opacities = await rings(page, "source").evaluateAll((marks) =>
      marks.map((mark) => Number(getComputedStyle(mark).opacity)),
    );
    expect(Math.min(...opacities)).toBe(1);
    await page.mouse.move(1, 1);

    // Color: every drawn piece has a mark of its own id, on both sides, in a palette color.
    await marksButton(page, "color").click();
    await expect(marksButton(page, "color")).toHaveAttribute("aria-pressed", "true");
    for (const side of ["source", "target"]) {
      const marked = new Set(
        await rings(page, side).evaluateAll((marks) =>
          marks.map((mark) => mark.getAttribute("data-gadget-ring")),
        ),
      );
      const unmarked = (await drawnPieceIds(page, side)).filter((id) => !marked.has(id));
      expect(unmarked, `${type} ${side}: pieces without a mark`).toEqual([]);
    }
  });
}

// --- Plain and Color ----------------------------------------------------------------------------

for (const scheme of ["light", "dark"]) {
  test(`Plain and Color in the ${scheme} theme: Color marks every gadget on both sides in matching colors, and is remembered`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1280, height: 1000 });
    await openView(page, () => SAT_TO_3SAT_VIEW);
    await page.locator(`${VIEW}-marks-row`).scrollIntoViewIfNeeded();
    await expect(marksButton(page, "plain")).toHaveAttribute("aria-pressed", "true");
    await expect(rings(page, "source")).toHaveCount(0);

    await marksButton(page, "color").click();
    await expect(page.locator(`${VIEW}-marks-row`)).toHaveAttribute("data-gadget-marks", "color");
    // A literal of C1 and the literal it became share a color, on both sides.
    const literal = (side, id) =>
      pane(page, side).locator(`[data-node-id="${id}"] [data-gadget-ring="${id}"]`);
    await expect(literal("source", "c0-2")).toHaveCount(1);
    const sourceColor = await literal("source", "c0-2").evaluate((m) => getComputedStyle(m).stroke);
    // c0-2 (¬x2 in C1) became c4-0, the first literal of C5.
    const targetColor = await literal("target", "c4-0").evaluate((m) => getComputedStyle(m).stroke);
    expect(targetColor).toBe(sourceColor);
    // The colors stand on the canvas: at least 3:1, read from the picture's own background.
    const canvas = await pane(page, "source").evaluate(
      (root) => getComputedStyle(root).backgroundColor,
    );
    const lum = (color) => {
      const [r, g, b] = rgb(color).map((value) => {
        const s = value / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (const color of new Set(await ringColors(page, "source"))) {
      const [hi, lo] = [lum(color), lum(canvas)].sort((x, y) => y - x);
      expect((hi + 0.05) / (lo + 0.05), `${color} on ${canvas}`).toBeGreaterThanOrEqual(3);
    }
    // More gadgets than colors: the Legend lists the colors and says they repeat.
    await expect(page.locator("#workbench-legend-body")).toContainText("the colors repeat");

    // Kept for the next visit.
    await page.reload();
    await page.locator("#workbench-mode-reduce").click();
    await page.locator("#workbench-run").click();
    await expect(page.locator(VIEW)).toBeVisible();
    await expect(page.locator(`${VIEW}-marks-row`)).toHaveAttribute("data-gadget-marks", "color");
    await expect(rings(page, "target").first()).toBeVisible();

    await marksButton(page, "plain").click();
    await expect(rings(page, "target")).toHaveCount(0);
  });
}

// --- Per-step gadgets and the bound -------------------------------------------------------------

test("each build step lists the gadgets it made in plain words, and the step that sets Clique's K shows it", async ({
  page,
}) => {
  const view = SAT3_TO_CLIQUE_RULES_VIEW;
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openView(page, () => view);
  const list = page.locator(`${VIEW}-caption-gadgets`);

  // Step 1 makes C1's three nodes: three element gadgets, the group, and the rule that keeps
  // them apart.
  await toStep(page, 0);
  await expect(list).toHaveAttribute("data-gadget-count", String(view.frames[0].gadgets.length));
  await expect(list).toContainText(`This step made ${view.frames[0].gadgets.length} gadgets`);
  await expect(list).toContainText("Element: x1 in C1 becomes x1_0.");
  await expect(list).toContainText("and 1 more");
  await expect(list).not.toContainText("c0-0");

  // The last build step sets the bound.
  const boundStep = view.frames.findIndex((frame) => frame.bound !== undefined);
  await toStep(page, boundStep);
  await expect(page.locator(`${VIEW}-caption-gadgets-bound`)).toHaveText(
    `Bound: ${view.frames[boundStep].bound}`,
  );
  await expect(list).toContainText("K = 3, the number of clauses");

  // Solve lists none.
  await page.locator("#workbench-phases-solve").click();
  await expect(list).toHaveCount(0);
});

// --- "Rule says no" ---------------------------------------------------------------------------

test("a dashed Rule says no line names the edge rule that left the pair unjoined, by pointer, tap and keyboard", async ({
  page,
}) => {
  const view = SAT3_TO_CLIQUE_RULES_VIEW;
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openView(page, () => view);
  const step = view.frames.findIndex((frame) => frame.target.skipped?.length > 0);
  await toStep(page, step);
  const pair = view.frames[step].target.skipped[0];
  const line = pane(page, "target").locator(`[data-phantom-id="${pair.id}"]`);
  await expect(line).toHaveAttribute("tabindex", "0");
  await expect(line).toHaveAttribute("aria-label", /Rule says no/);
  const rule = view.gadgets.find(
    (gadget) =>
      gadget.gadgetKind === "edgeRule" &&
      gadget.targetIds.length === 2 &&
      gadget.targetIds.includes(pair.a) &&
      gadget.targetIds.includes(pair.b),
  );

  // Keyboard.
  await line.focus();
  await expect(readout(page)).toHaveAttribute("data-linked", "true");
  await expect(readout(page)).toContainText("linked by an edge rule gadget");
  await expect(readout(page)).toContainText(rule.note);
  // The rule's reason names the pair, so the line doesn't list both sides again after it.
  await expect(readout(page)).not.toContainText("↦");
  await expect(line).toHaveAttribute("data-rv-link", "hot");
  await expect(line.locator(`[data-gadget-ring="${pair.id}"]`)).toHaveCount(1);
  for (const id of rule.sourceIds) {
    await expect(pane(page, "source").locator(`[data-gadget-ring="${id}"]`).first()).toBeVisible();
  }
  await line.blur();
  await expect(readout(page)).toHaveAttribute("data-linked", "false");

  // Pointer: hovering the line's wide clear stroke.
  await line.hover();
  await expect(readout(page)).toContainText(rule.note);
  await page.mouse.move(1, 1);
  await expect(readout(page)).toHaveAttribute("data-linked", "false");

  // Tap pins it.
  await line.click();
  await page.mouse.move(1, 1);
  await expect(readout(page)).toContainText(rule.note);
  await page.keyboard.press("Escape");
});

// --- The Gadgets rows' names --------------------------------------------------------------------

test("the Gadgets rows say each gadget in plain words, with the pictures' own names", async ({
  page,
}) => {
  const view = SAT3_TO_CLIQUE_RULES_VIEW;
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openView(page, () => view);
  await showPane(page, "visualization", { expect });
  await page.locator("#workbench-gadgets-toggle").click();
  const index = (kind, test) =>
    view.gadgets.findIndex((gadget) => gadget.gadgetKind === kind && test(gadget));

  // An element: the literal by its label and clause, the node by its label.
  const element = index("element", (gadget) => gadget.sourceIds[0] === "c0-1");
  await expect(gadgetRow(page, element)).toHaveAttribute("aria-label", "¬x2 in C1 becomes !x2_0.");
  await expect(gadgetRow(page, element)).not.toContainText("c0-1");
  // A group: the clause becomes its nodes.
  const group = index("group", (gadget) => gadget.sourceIds[0] === "c0");
  await expect(gadgetRow(page, group)).toHaveAttribute(
    "aria-label",
    "C1 is built as x1_0, !x2_0, x3_0.",
  );
  // An edge rule and the bound say their own reason, once.
  const rule = index("edgeRule", (gadget) => gadget.note.includes("contradict"));
  await expect(gadgetRow(page, rule)).toHaveAttribute("aria-label", view.gadgets[rule].note);
  await expect(page.locator(`#workbench-gadgets-row-${rule}-note`)).toHaveCount(0);
  const bound = index("bound", () => true);
  await page.locator("#workbench-gadgets-group-bound").scrollIntoViewIfNeeded();
  await expect(gadgetRow(page, bound)).toHaveAttribute("aria-label", view.gadgets[bound].note);
});

// --- Gold against the orange trace --------------------------------------------------------------

for (const scheme of ["light", "dark"]) {
  test(`the gadget gold and the orange hover trace are clearly different in the ${scheme} theme`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.setViewportSize({ width: 1280, height: 1000 });
    await openView(page, () => SAT3_TO_CLIQUE_RULES_VIEW);
    await page.locator("#workbench-phases-solve").click();
    // Hovering a Clique node draws the renderer's trace on it and the gadget gold on what the
    // node is linked to: both at once, on one picture.
    const node = pane(page, "target").locator('[data-node-id="x1_0"]');
    await node.hover();
    const trace = await node
      .locator("[data-body]")
      .evaluate((body) => getComputedStyle(body).stroke);
    const gold = await pane(page, "target")
      .locator('[data-gadget-ring="x1_0"]')
      .evaluate((mark) => getComputedStyle(mark).stroke);
    expect(trace).not.toBe(gold);
    expect(deltaE(trace, gold), `${trace} against ${gold}`).toBeGreaterThanOrEqual(30);
  });
}

// --- Other pictures -----------------------------------------------------------------------------

test("on SAT's Factor Graph target the gadgets' ids are the picture's own, so a Gadgets row marks the clause and its literals", async ({
  page,
}) => {
  const view = SAT_TO_3SAT_FACTOR_GRAPH_VIEW;
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openView(page, () => view);
  await toStep(page, 0);
  await expect(pane(page, "target")).toHaveAttribute("data-picture-type", "BipartiteGraph");
  await expect(page.locator(`${VIEW}-target-note`)).not.toContainText("can't be shown");
  await page.locator("#workbench-phases-solve").click();
  await showPane(page, "visualization", { expect });
  await page.locator("#workbench-gadgets-toggle").click();
  const group = view.gadgets.findIndex((gadget) => gadget.gadgetKind === "group");
  await gadgetRow(page, group).hover();
  // C1 was split into C1, C4 and C5: each is a clause node of the factor graph.
  for (const id of view.gadgets[group].targetIds) {
    await expect(pane(page, "target").locator(`[data-gadget-ring="${id}"]`).first()).toBeVisible();
  }
  // A literal is an edge of the factor graph.
  const literal = view.gadgets.findIndex(
    (gadget) => gadget.gadgetKind === "element" && gadget.targetIds[0] === "c0-0",
  );
  await gadgetRow(page, literal).hover();
  await expect(
    pane(page, "target")
      .locator('[data-edge-id="c0-0"] [data-gadget-ring="c0-0"], [data-gadget-ring="c0-0"]')
      .first(),
  ).toBeVisible();
});

test("a Search Tree pane says gadget links can't be shown there, and fits the tree so far without moving it", async ({
  page,
}) => {
  test.slow();
  const view = SAT_TO_3SAT_SEARCH_TREE_VIEW;
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openView(page, () => view);
  await toStep(page, 0);
  await expect(page.locator(`${VIEW}-target-note`)).toContainText(
    "Gadget links can't be shown on this picture",
  );
  await expect(page.locator(`${VIEW}-source-note`)).toHaveCount(0);

  const svg = pane(page, "target").locator('svg[id$="-svg"]');
  const height = async () => (await svg.boundingBox()).height;
  // During Build the tree is empty: the pane is short.
  const empty = await height();
  expect(empty).toBeLessThanOrEqual(260);
  // The tree grows down through Solve; the box only ever grows downwards, and a node keeps its
  // row (the renderer re-centres each step's tree across, as it always has; the box changes
  // nothing about where a node is drawn).
  const solve = view.frames.findIndex((frame) => frame.phase === "solve");
  const centres = async () =>
    svg.evaluate((element) => {
      const out = {};
      for (const node of element.querySelectorAll("[data-node-id]")) {
        const body = node.querySelector("rect:not([data-gadget-ring])");
        if (body) out[node.getAttribute("data-node-id")] = Math.round(body.getBBox().y);
      }
      return out;
    });
  let last = empty;
  let before = {};
  await toStep(page, solve);
  for (let index = solve; index < view.frames.length; index += 1) {
    if (index > solve) await page.locator("#workbench-steps-next").click();
    await expect(page.locator(VIEW)).toHaveAttribute("data-frame-index", String(index));
    const now = await height();
    expect(now, `step ${index + 1}`).toBeGreaterThanOrEqual(last - 1);
    last = now;
    const placed = await centres();
    for (const [id, centre] of Object.entries(placed)) {
      if (before[id] !== undefined) {
        expect(centre, `${id}'s row at step ${index + 1}`).toBe(before[id]);
      }
    }
    before = { ...before, ...placed };
  }
  const whole = await svg.evaluate((element) => element.viewBox.baseVal.height);
  expect(whole).toBeGreaterThan(0);
});

// --- A non-graph target, from the Gadgets rows --------------------------------------------------

test("Exact Cover to Subset Sum and 3SAT to 0-1 ILP: a Gadgets row marks a set's number and a literal's coefficient", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  let view = EXACT_COVER_TO_SUBSET_SUM_VIEW;
  await openView(page, () => view);
  await page.locator("#workbench-phases-solve").click();
  await showPane(page, "visualization", { expect });
  await page.locator("#workbench-gadgets-toggle").click();
  const set = view.gadgets.findIndex((gadget) => gadget.gadgetKind === "element");
  await gadgetRow(page, set).hover();
  await expect(
    pane(page, "source").locator(`[data-gadget-ring="${view.gadgets[set].sourceIds[0]}"]`).first(),
  ).toBeVisible();
  await expect(
    pane(page, "target").locator(`[data-gadget-ring="${view.gadgets[set].targetIds[0]}"]`).first(),
  ).toBeVisible();

  view = SAT3_TO_ILP_VIEW;
  await page.locator("#workbench-run").click();
  await expect(pane(page, "target")).toHaveAttribute("data-picture-type", "Table");
  await page.locator("#workbench-phases-map").click();
  await showPane(page, "visualization", { expect });
  const toggle = page.locator("#workbench-gadgets-toggle");
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  const literal = view.gadgets.findIndex(
    (gadget) => gadget.gadgetKind === "element" && gadget.sourceIds[0] === "c0-0",
  );
  await gadgetRow(page, literal).scrollIntoViewIfNeeded();
  await gadgetRow(page, literal).hover();
  await expect(
    pane(page, "target").locator(
      `[data-cell-id="${view.gadgets[literal].targetIds[0]}"] [data-gadget-ring]`,
    ),
  ).toHaveCount(1);
});

test("SAT to 3SAT drawn as formulas: Build hides each clause not built yet with its ∧ and ∨, and a source clause links the clauses it became", async ({
  page,
}) => {
  // #270: the Formula on both sides (Redux#925, captured with sourceVisualization and
  // targetVisualization set to the Formula visualizations).
  const view = SAT_TO_3SAT_FORMULA_VIEW;
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openView(page, () => view);
  for (const side of ["source", "target"]) {
    await expect(pane(page, side)).toHaveAttribute("data-picture-type", "Formula");
  }
  await expect(page.locator(`${VIEW}-target-note`)).toHaveCount(0);
  await toStep(page, 0);
  // Step 1 builds C1's chain (C1, C4, C5); C2 and C3 are not built yet, nor their ∧ and ∨.
  const target = pane(page, "target");
  const built = (id) => target.locator(`[data-clause-id="${id}"]`);
  for (const id of ["c0", "c3", "c4"]) await expect(built(id)).not.toHaveAttribute("data-rv-built");
  for (const id of ["c1", "c2"]) {
    await expect(built(id)).toHaveAttribute("data-rv-built", "no");
    await expect(built(id)).toBeHidden();
    for (const op of await target.locator(`[data-piece-for="${id}"]`).all()) {
      await expect(op).toBeHidden();
    }
    for (const literal of view.target.picture.payload.groups.find((g) => g.id === id).members) {
      await expect(target.locator(`[data-node-id="${literal}"]`)).toBeHidden();
    }
  }
  await expect(target.locator('[data-piece-for="c3"][data-connective="and"]')).toBeVisible();
  // Pointing at the source's C1 links the three clauses it became, and fades the rest by color.
  await toStep(page, view.frames.length - 1);
  await pane(page, "source")
    .locator('[data-clause-id="c0"] [data-body]')
    .hover({ position: { x: 4, y: 4 } });
  for (const id of ["c0", "c3", "c4"]) {
    await expect(built(id)).toHaveAttribute("data-rv-link", "hot");
  }
  await expect(built("c1")).toHaveAttribute("data-rv-link", "faint");
  await expect(readout(page)).not.toBeEmpty();
  // Every SAT variable keeps its id on the 3SAT side.
  await page.mouse.move(1, 1);
  await pane(page, "source").locator('[data-variable-id="v:x4"]').hover();
  await expect(target.locator('[data-variable-id="v:x4"]')).toHaveAttribute("data-rv-link", "hot");
  // The map back ends on the SAT answer, drawn green on the source.
  await expect(pane(page, "source").locator('[data-state="Solution"]').first()).toBeVisible();
});
