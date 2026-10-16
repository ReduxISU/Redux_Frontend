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

import { expect, test } from "./fixtures";
import { gotoProblemDetail, openPanel } from "./helpers";
import { DFA_ONE_RUN } from "./run-payloads";

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
