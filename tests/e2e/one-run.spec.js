// tests/e2e/one-run.spec.js
//
// #252: one Run, every picture. Run asks ProblemProvider/visualizeRun (ReduxISU/Redux#895) once
// for the solver's run and every picture of it, so switching the Visualization Type afterwards
// asks for nothing and opens the new picture on the frame drawn from the same solver step, or
// the nearest one before it (lib/runSteps.js). A picture the run can't draw shows the instance
// with a note saying why; a new Run or a new instance starts fresh; moved nodes stay with their
// picture; and a backend without visualizeRun (404 or 405) gets the one-picture requests as
// before.
//
// Pinned to DFA Acceptance, like tests/e2e/picture-renderers.spec.js: it has two pictures with
// renderers (the Table, first, and the Automaton) and a fast solver. The catalog comes from the
// real backend; allInfo is only edited to give both visualizations their picture type, and
// every compute request is answered here from the capture in tests/e2e/run-payloads.js, so CI
// needs no backend with visualizeRun. Some tests edit the capture (named where they do) to get
// steps a three-step run doesn't have.
//
// #217: 3SAT's Search Tree at the end: the step kept when switching from the clause graph after a
// backtracking run, and the note when the run's solver is one the tree can't draw.

import { expect, test } from "./fixtures";
import { gotoProblemDetail, openPanel, selectSolverByName } from "./helpers";
import { DFA_ONE_RUN, SAT3_BACKTRACKING_ONE_RUN, SAT3_PPZ_ONE_RUN } from "./run-payloads";

const PROBLEM = "DFA Acceptance";
const TABLE_VIZ = "DFATableVisualization";
const AUTOMATON_VIZ = "DFAVisualization";
const TABLE_NAME = "Deterministic Finite Automata Table Visualization";
const AUTOMATON_NAME = "Deterministic Finite Automata Visualization";

const RUN_REQUEST = /\/api\/redux\/ProblemProvider\/visualizeRun\?/;
const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve/;
const ALL_INFO_REQUEST = /\/api\/redux\/Navigation\/Batch\/allInfo/;

const PICTURE = "#workbench-source-picture";
const CAPTION = "#workbench-source-frames-caption-text";
const POSITION = "#workbench-steps-position";
const NOTE = "#workbench-note";
const AUTOMATON = "#workbench-source-frames-automaton";

/** The captured picture of `visualization` in a one-run answer. */
function pictureOf(run, visualization) {
  return run.pictures.find((picture) => picture.visualization === visualization);
}

/** A copy of `run` with `visualization`'s frames replaced. */
function withFrames(run, visualization, frames) {
  return {
    ...run,
    pictures: run.pictures.map((picture) =>
      picture.visualization === visualization ? { ...picture, frames } : picture,
    ),
  };
}

/**
 * Answers allInfo with both visualizations' picture types, the picture and solve requests from
 * the capture, and visualizeRun with `run` (a status number answers that status instead).
 * Records every compute request asked for: `run`, or `${visualization} ${format}`.
 */
async function answerCompute(page, { run = DFA_ONE_RUN } = {}) {
  await page.route(ALL_INFO_REQUEST, async (route) => {
    const response = await route.fetch();
    const info = await response.json();
    if (info[TABLE_VIZ]) info[TABLE_VIZ].pictureType = "Table";
    if (info[AUTOMATON_VIZ]) info[AUTOMATON_VIZ].pictureType = "Automaton";
    await route.fulfill({ response, json: info });
  });
  const asked = [];
  await page.route(RUN_REQUEST, (route) => {
    asked.push("run");
    if (typeof run === "number") return route.fulfill({ status: run, json: { error: "missing" } });
    return route.fulfill({ json: run });
  });
  await page.route(VISUALIZE_REQUEST, (route) => {
    const url = new URL(route.request().url());
    const visualization = url.searchParams.get("visualization");
    asked.push(`${visualization} ${url.searchParams.get("format") ?? "list"}`);
    const { type, payload, frames } = pictureOf(DFA_ONE_RUN, visualization);
    return route.fulfill({ json: { type, payload, frames } });
  });
  await page.route(SOLVE_REQUEST, (route) => route.fulfill({ json: DFA_ONE_RUN.answer }));
  return asked;
}

async function openDfa(page, options) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const asked = await answerCompute(page, options);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "Table", {
    timeout: 20_000,
  });
  return asked;
}

async function chooseVisualization(page, name) {
  await page.locator("#workbench-source-type-button").click();
  await page
    .locator("#workbench-source-type-listbox")
    .getByRole("option", { name, exact: true })
    .click();
}

/** Presses Run and waits for the run to open on its last frame. */
async function run(page, frameCount) {
  await page.locator("#workbench-run").click();
  await expect(page.locator(POSITION)).toHaveText(`Step ${frameCount} of ${frameCount}`);
}

const previousStep = (page) => page.locator("#workbench-steps-previous").click();

test("Run asks once for every picture, and switching keeps the step without asking again", async ({
  page,
}) => {
  const asked = await openDfa(page);
  const table = pictureOf(DFA_ONE_RUN, TABLE_VIZ).frames;
  const automaton = pictureOf(DFA_ONE_RUN, AUTOMATON_VIZ).frames;
  expect(asked).toEqual([`${TABLE_VIZ} frames`]);

  await run(page, 3);
  // One request for the run and every picture, beside the solve.
  expect(asked).toEqual([`${TABLE_VIZ} frames`, "run"]);
  await expect(page.locator(CAPTION)).toHaveText(table[2].caption);
  await previousStep(page);
  await expect(page.locator(POSITION)).toHaveText("Step 2 of 3");
  await expect(page.locator(CAPTION)).toHaveText(table[1].caption);

  // The Automaton opens on the same step of the same run, drawn from it.
  await chooseVisualization(page, AUTOMATON_NAME);
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "Automaton");
  await expect(page.locator(POSITION)).toHaveText("Step 2 of 3");
  await expect(page.locator(CAPTION)).toHaveText(automaton[1].caption);
  await expect(page.locator(`${AUTOMATON}-graph [data-node-id="q:2"]`)).toHaveAttribute(
    "data-state",
    "ElementHighlight",
  );
  await expect(page.locator("#workbench-showing")).toHaveText(DFA_ONE_RUN.solverName);

  // Back to the Table, one step earlier: still the same run, still no request.
  await previousStep(page);
  await chooseVisualization(page, TABLE_NAME);
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "Table");
  await expect(page.locator(POSITION)).toHaveText("Step 1 of 3");
  await expect(page.locator(CAPTION)).toHaveText(table[0].caption);
  expect(asked).toEqual([`${TABLE_VIZ} frames`, "run"]);
});

test("a picture missing the step opens on the nearest one before it, and an added solved frame comes last", async ({
  page,
}) => {
  // Edited capture: the Table drops its step-1 frame (steps 0 and 2), and the Automaton adds a
  // solved frame of its own after step 2 (step null), as a picture whose last step is not the
  // solved one would.
  const table = pictureOf(DFA_ONE_RUN, TABLE_VIZ).frames;
  const automaton = pictureOf(DFA_ONE_RUN, AUTOMATON_VIZ).frames;
  const solved = { ...automaton[2], caption: "Solved.", step: null };
  const edited = withFrames(
    withFrames(DFA_ONE_RUN, TABLE_VIZ, [table[0], table[2]]),
    AUTOMATON_VIZ,
    [...automaton, solved],
  );
  const asked = await openDfa(page, { run: edited });

  // Right after Run the Table is on its last step (step 2): the Automaton opens on step 2,
  // its frame before the added solved frame.
  await run(page, 2);
  await chooseVisualization(page, AUTOMATON_NAME);
  await expect(page.locator(POSITION)).toHaveText("Step 3 of 4");
  await expect(page.locator(CAPTION)).toHaveText(automaton[2].caption);

  // The added solved frame is after every step: the Table opens on its last.
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(CAPTION)).toHaveText("Solved.");
  await chooseVisualization(page, TABLE_NAME);
  await expect(page.locator(POSITION)).toHaveText("Step 2 of 2");

  // Step 1 is not in the Table: it opens on step 0, the nearest before it.
  await chooseVisualization(page, AUTOMATON_NAME);
  await expect(page.locator(POSITION)).toHaveText("Step 3 of 4");
  await previousStep(page);
  await expect(page.locator(CAPTION)).toHaveText(automaton[1].caption);
  await chooseVisualization(page, TABLE_NAME);
  await expect(page.locator(POSITION)).toHaveText("Step 1 of 2");
  await expect(page.locator(CAPTION)).toHaveText(table[0].caption);
  expect(asked.filter((request) => request === "run")).toHaveLength(1);
});

for (const { reason, note } of [
  {
    reason: "shape_mismatch",
    note: `${AUTOMATON_NAME} can't draw the steps of ${DFA_ONE_RUN.solverName}, so it shows the instance. The answer: ${DFA_ONE_RUN.answer}.`,
  },
  {
    reason: "no_frames",
    note: `${AUTOMATON_NAME} isn't drawn from this run, so it shows the instance. The answer: ${DFA_ONE_RUN.answer}. Press Run solve again to draw a run in it.`,
  },
]) {
  test(`a picture the run can't draw (${reason}) shows the instance and why, and keeps the step`, async ({
    page,
  }) => {
    // Edited capture: the Automaton is in `unavailable` instead of `pictures`.
    const edited = {
      ...DFA_ONE_RUN,
      pictures: DFA_ONE_RUN.pictures.filter((picture) => picture.visualization === TABLE_VIZ),
      unavailable: [{ visualization: AUTOMATON_VIZ, reason, detail: "Not drawn." }],
    };
    await openDfa(page, { run: edited });
    await run(page, 3);
    await previousStep(page);

    await chooseVisualization(page, AUTOMATON_NAME);
    // The plain picture of the instance, not a blank one, and no steps to walk.
    await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "Automaton");
    await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute(
      "data-plain",
      "true",
    );
    await expect(page.locator(NOTE)).toHaveText(note);
    await expect(page.locator(POSITION)).toHaveCount(0);

    // Back on the Table, the run is where it was left.
    await chooseVisualization(page, TABLE_NAME);
    await expect(page.locator(POSITION)).toHaveText("Step 2 of 3");
  });
}

test("Run again and a new instance start fresh", async ({ page }) => {
  const asked = await openDfa(page);
  await run(page, 3);
  await chooseVisualization(page, AUTOMATON_NAME);
  await previousStep(page);
  await previousStep(page);
  await expect(page.locator(POSITION)).toHaveText("Step 1 of 3");

  // A new run is asked for, and opens on its last step.
  await page.locator("#workbench-run").click();
  await expect(page.locator(POSITION)).toHaveText("Step 3 of 3");
  expect(asked.filter((request) => request === "run")).toHaveLength(2);

  // A new instance drops the run: the picture is the plain instance, with no steps.
  await openPanel(page, "instance", { expect });
  const input = page.locator("#workbench-instance-full-instance");
  await input.fill(`${await input.inputValue()} `);
  await expect(page.locator(POSITION)).toHaveCount(0);
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await chooseVisualization(page, TABLE_NAME);
  await expect(page.locator(POSITION)).toHaveCount(0);
});

for (const status of [404, 405]) {
  test(`a backend without visualizeRun (${status}) gets one picture per Run, as before`, async ({
    page,
  }) => {
    const asked = await openDfa(page, { run: status });
    await run(page, 3);
    // The run route is tried once, then the chosen picture is asked for alone.
    expect(asked).toEqual([`${TABLE_VIZ} frames`, "run", `${TABLE_VIZ} frames`]);

    // Switching shows the other picture's instance until the next Run, as before #252.
    await chooseVisualization(page, AUTOMATON_NAME);
    await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "Automaton");
    await expect(page.locator(POSITION)).toHaveCount(0);
    await run(page, 3);
    await expect(page.locator(CAPTION)).toHaveText(
      pictureOf(DFA_ONE_RUN, AUTOMATON_VIZ).frames[2].caption,
    );
    // The missing route is remembered: the second Run doesn't try it again.
    expect(asked).toEqual([
      `${TABLE_VIZ} frames`,
      "run",
      `${TABLE_VIZ} frames`,
      `${AUTOMATON_VIZ} frames`,
      `${AUTOMATON_VIZ} frames`,
    ]);
  });
}

test("moved states stay with their picture when switching away and back", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openDfa(page);
  await run(page, 3);
  await chooseVisualization(page, AUTOMATON_NAME);
  const state = page.locator(`${AUTOMATON}-graph [data-node-id="q:1"]`);
  const centre = () =>
    state
      .locator("[data-body], circle")
      .first()
      .evaluate((el) => {
        const box = el.getBBox();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      });
  const before = await centre();
  await state.focus();
  await page.keyboard.press("Shift+ArrowDown");
  await expect.poll(async () => (await centre()).y - before.y).toBeGreaterThan(20);
  const moved = await centre();
  await expect(page.locator(`${AUTOMATON}-layout-reset`)).toBeEnabled();

  await chooseVisualization(page, TABLE_NAME);
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "Table");
  await chooseVisualization(page, AUTOMATON_NAME);
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "Automaton");
  expect(await centre()).toEqual(moved);
  await expect(page.locator(`${AUTOMATON}-layout-reset`)).toBeEnabled();

  // Reset layout still puts it back, and it stays back after another round trip.
  await page.locator(`${AUTOMATON}-layout-reset`).click();
  expect(await centre()).toEqual(before);
  await chooseVisualization(page, TABLE_NAME);
  await chooseVisualization(page, AUTOMATON_NAME);
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "Automaton");
  expect(await centre()).toEqual(before);
});

// --- #217: the Search Tree in one run ------------------------------------------------------
//
// 3SAT's Search Tree draws the steps of its backtracking solver as a tree, and only those: a
// solver it can't draw (PPZ, whose steps are untyped) leaves it `shape_mismatch`. The catalog
// CI's backend serves has no Search Tree visualization yet, so allInfo and allVisualizations are
// made to list 3SAT's (its info as the local build sends it); the run is the capture in
// tests/e2e/run-payloads.js.

const SAT3 = "3SAT";
const CLAUSES_VIZ = "Sat3DefaultVisualization";
const TREE_VIZ = "Sat3SearchTreeVisualization";
const TREE_NAME = "3SAT Search Tree";
const TREE = "#workbench-source-frames-searchtree";
const ALL_VISUALIZATIONS_REQUEST = /\/api\/redux\/Navigation\/Batch\/allVisualizations$/;
const ALL_VISUALIZATION_TYPES_REQUEST = /\/api\/redux\/Navigation\/Batch\/allVisualizationTypes$/;

/** 3SAT's Search Tree as the local build's allInfo describes it. */
const TREE_INFO = {
  visualizationName: TREE_NAME,
  visualizationDefinition:
    "The choices of 3SAT Backtracking as a tree: each level sets one variable, a red dashed node is a value that makes a clause false, and the numbers show the order in which queued branches were taken. With format=frames, the tree grows step by step and the path to the answer turns green.",
  source: "",
  sourceFile: "Problems/NPComplete/NPC_SAT3/Visualizations/Sat3SearchTreeVisualization.cs",
  contributors: ["Michael Trosper"],
  visualizationType: "BooleanSatisfiability",
  pictureType: "SearchTree",
};

/**
 * Lists 3SAT's Search Tree in the catalog (when the backend doesn't), answers visualizeRun with
 * `run` and every single-picture request from it. Records every compute request asked for.
 */
async function answerSat3(page, run) {
  await page.route(ALL_INFO_REQUEST, async (route) => {
    const response = await route.fetch();
    const info = await response.json();
    if (info[CLAUSES_VIZ]) info[CLAUSES_VIZ].pictureType = "GroupedGraph";
    info[TREE_VIZ] = { ...TREE_INFO, ...(info[TREE_VIZ] ?? {}), pictureType: "SearchTree" };
    await route.fulfill({ response, json: info });
  });
  await page.route(ALL_VISUALIZATIONS_REQUEST, async (route) => {
    const response = await route.fetch();
    const lists = await response.json();
    const sat3 = Array.isArray(lists.SAT3) ? lists.SAT3 : [];
    lists.SAT3 = sat3.includes(TREE_VIZ) ? sat3 : [...sat3, TREE_VIZ];
    await route.fulfill({ response, json: lists });
  });
  await page.route(ALL_VISUALIZATION_TYPES_REQUEST, async (route) => {
    const response = await route.fetch();
    if (!response.ok()) return route.fulfill({ response });
    const types = await response.json();
    types[TREE_VIZ] = TREE_INFO.visualizationType;
    return route.fulfill({ response, json: types });
  });
  const asked = [];
  await page.route(RUN_REQUEST, (route) => {
    asked.push("run");
    return route.fulfill({ json: run });
  });
  await page.route(VISUALIZE_REQUEST, (route) => {
    const url = new URL(route.request().url());
    const visualization = url.searchParams.get("visualization");
    asked.push(`${visualization} ${url.searchParams.get("format") ?? "list"}`);
    const picture = pictureOf(SAT3_BACKTRACKING_ONE_RUN, visualization);
    return route.fulfill({
      json: { type: picture.type, payload: picture.payload, frames: picture.frames },
    });
  });
  await page.route(SOLVE_REQUEST, (route) => route.fulfill({ json: run.answer }));
  return asked;
}

async function openSat3(page, run, solverName) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const asked = await answerSat3(page, run);
  await gotoProblemDetail(page, SAT3, { expect });
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "GroupedGraph", {
    timeout: 20_000,
  });
  await selectSolverByName(page, solverName, { expect });
  return asked;
}

test("Search Tree: after a 3SAT backtracking run, the clause graph's step opens on the same step of the tree", async ({
  page,
}) => {
  const runPictures = SAT3_BACKTRACKING_ONE_RUN;
  const asked = await openSat3(page, runPictures, "3SAT Backtracking");
  const clauses = pictureOf(runPictures, CLAUSES_VIZ).frames;
  const tree = pictureOf(runPictures, TREE_VIZ).frames;
  await run(page, clauses.length);
  // Back to step 5 of the clause graph: x2 = True is tried after x1 = True.
  await previousStep(page);
  await previousStep(page);
  await expect(page.locator(POSITION)).toHaveText(`Step 5 of ${clauses.length}`);
  await expect(page.locator(CAPTION)).toHaveText(clauses[4].caption);

  await chooseVisualization(page, TREE_NAME);
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "SearchTree");
  await expect(page.locator(POSITION)).toHaveText(`Step 5 of ${tree.length}`);
  await expect(page.locator(CAPTION)).toHaveText(tree[4].caption);
  await expect(page.locator(`${TREE}-tree [data-node-id]`)).toHaveCount(tree[4].nodes.length);
  await expect(page.locator(`${TREE}-tree [data-node-id="n3"]`)).toHaveAttribute(
    "data-focus",
    "true",
  );
  // Switched to, the tree opens at fit, like every picture.
  await expect(page.locator(`${TREE}-zoom`)).toHaveAttribute("data-zoom", "1.00");
  // Stepping on grows the tree, and going back to the clause graph keeps the step.
  await page.locator("#workbench-steps-next").click();
  await expect(page.locator(`${TREE}-tree [data-node-id="n1"]`)).toHaveAttribute(
    "data-state",
    "Solution",
  );
  await chooseVisualization(page, "3SAT Visualization");
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "GroupedGraph");
  await expect(page.locator(POSITION)).toHaveText(`Step 6 of ${clauses.length}`);
  await expect(page.locator("#workbench-source-frames-groupedgraph-zoom")).toHaveAttribute(
    "data-zoom",
    "1.00",
  );
  expect(asked.filter((request) => request === "run")).toHaveLength(1);
  await expect(page.locator(NOTE)).toHaveCount(0);
});

test("Search Tree: a 3SAT solver it can't draw leaves it waiting for a run, with the answer and why", async ({
  page,
}) => {
  const runPictures = SAT3_PPZ_ONE_RUN;
  const [gap] = runPictures.unavailable;
  expect(gap).toMatchObject({ visualization: TREE_VIZ, reason: "shape_mismatch" });
  await openSat3(page, runPictures, "PPZ Algorithm");
  // PPZ's clause graph is the answer alone: one frame, no steps to walk.
  await page.locator("#workbench-run").click();
  await expect(page.locator(CAPTION)).toHaveText(
    pictureOf(runPictures, CLAUSES_VIZ).frames[0].caption,
  );
  await chooseVisualization(page, TREE_NAME);
  await expect(page.locator(PICTURE)).toHaveAttribute("data-picture-type", "SearchTree");
  await expect(page.locator(PICTURE).locator("[data-plain]")).toHaveAttribute("data-plain", "true");
  await expect(page.locator(`${TREE}-waiting`)).toBeVisible();
  await expect(page.locator(NOTE)).toHaveText(
    `${TREE_NAME} can't draw the steps of ${runPictures.solverName}, so it shows the instance. The answer: ${runPictures.answer}.`,
  );
  await expect(page.locator(POSITION)).toHaveCount(0);
});
