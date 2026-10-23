// tests/e2e/visualization.spec.js
//
// #279 stage 3 (board F): the Workspace's Visualization section. The Showing lines in both modes
// (Problem and Algorithm in Solve mode; one Reduction line, and each picture's own Problem and
// Algorithm, in Reduce mode); the picture frames' height (about 62% of the window, clamped 360
// to 680 px, two frames side by side sharing their top and bottom lines) and the placeholder
// target before a build; the picture tools (−, + and Fit in the caption, Ctrl + wheel zooming and
// a plain wheel scrolling the page, Full screen with its exit button and Escape, no text
// selection); the Algorithm Steps timeline (Build ── Solve ── Map back, the current phase marked,
// a label jumping to its phase, phases with no steps greyed, opening by itself after a run and
// staying closed once the viewer closes it, until Reset layout); and pictures drawn plain until
// an answer exists for the instance.
//
// The catalog comes from the real backend, like the rest of the suite; every compute request is
// answered here (see workbench.spec.js for why).

import { expect, test } from "./fixtures";
import { SAT3_FORMULA_FRAMES } from "./formula-payloads";
import { gotoProblemDetail, showPane, solveReductionTarget } from "./helpers";
import { SAT3_TO_CLIQUE_VIEW } from "./reduction-payloads";

const PROBLEM = "3SAT";
const ANSWER = "(x1:True,x2:False,x3:True)";
const TARGET_INSTANCE = "(({x1_0,x2_1,x3_2},{{x1_0,x2_1},{x2_1,x3_2},{x1_0,x3_2}}),3)";
const TARGET_ANSWER = "{x1_0,x2_1,x3_2}";
const MAPPED_FORWARD = "{x1_0,x3_1,x2_2}";
const MAPPED_BACK = "(x1:True,x2:True,x3:True)";

const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve\?/;
const REDUCE_REQUEST = /\/api\/redux\/ProblemProvider\/reduce\?/;
const MAP_REQUEST = /\/api\/redux\/ProblemProvider\/mapSolution\?/;
const MAP_BACK_REQUEST = /\/api\/redux\/ProblemProvider\/mapSolutionBack\?/;
const REDUCTION_VIEW_REQUEST = /\/api\/redux\/ProblemProvider\/reductionView\?/;

const SOURCE_FRAME = "#workbench-source-frame";
const TARGET_FRAME = "#workbench-target-frame";
const STEPS_TOGGLE = "#workbench-algorithm-steps-toggle";
const phase = (page, key) => page.locator(`#workbench-phases-${key}`);

/**
 * Answers every compute request: the 3SAT picture is the Formula capture (so the run has steps
 * and an answer to draw), the Clique side gets no picture, and the solves and maps answer as in
 * execute.spec.js.
 */
async function answerCompute(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route(VISUALIZE_REQUEST, (route) => {
    const visualization = new URL(route.request().url()).searchParams.get("visualization") ?? "";
    return route.fulfill({ json: /sat/i.test(visualization) ? SAT3_FORMULA_FRAMES : [] });
  });
  await page.route(SOLVE_REQUEST, (route) => {
    const solver = new URL(route.request().url()).searchParams.get("solver") ?? "";
    const target = /clique|carraghan|chiba/i.test(solver);
    return route.fulfill({ json: target ? TARGET_ANSWER : ANSWER });
  });
  await page.route(REDUCE_REQUEST, (route) =>
    route.fulfill({ json: { reductionTo: { instance: TARGET_INSTANCE } } }),
  );
  await page.route(MAP_REQUEST, (route) => route.fulfill({ json: MAPPED_FORWARD }));
  await page.route(MAP_BACK_REQUEST, (route) => route.fulfill({ json: MAPPED_BACK }));
}

/** Opens 3SAT in Reduce mode with Clique as the target. */
async function openReduce(page) {
  await gotoProblemDetail(page, PROBLEM, { expect });
  await page.locator("#workbench-mode-reduce").click();
  const current = ((await page.locator("#workbench-target-value").textContent()) ?? "").trim();
  if (!/^clique$/i.test(current)) {
    await page.locator("#workbench-target-button").click();
    await page
      .locator("#workbench-target-listbox")
      .getByRole("option")
      .filter({ hasText: /^clique$/i })
      .first()
      .click();
  }
  await expect(page.locator("#workbench-target-value")).toHaveText(/^clique$/i);
}

const valueOf = async (page, selector) =>
  ((await page.locator(selector).textContent()) ?? "").trim();

// --- Showing lines --------------------------------------------------------------------------------

test("Solve mode shows Problem and Algorithm: not run yet, then the solver", async ({ page }) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  await expect(page.locator("#workbench-showing-problem")).toHaveText(PROBLEM);
  await expect(page.locator("#workbench-showing-algorithm")).toHaveText(
    "Not run yet (default picture)",
  );
  await expect(page.locator("#workbench-showing-reduction")).toHaveCount(0);
  // Solve mode's one picture is named by its problem; no Problem / Algorithm block of its own.
  await expect(page.locator(`${SOURCE_FRAME}-caption`)).toContainText(PROBLEM);
  await expect(page.locator(`${SOURCE_FRAME}-showing`)).toHaveCount(0);

  const solver = await valueOf(page, "#workbench-solver-value");
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-showing-algorithm")).toHaveText(solver);
});

test("Reduce mode shows the Reduction, and each picture's Problem and Algorithm as answers arrive", async ({
  page,
}) => {
  await answerCompute(page);
  await openReduce(page);
  const reduction = await valueOf(page, "#workbench-reduction-value");
  const target = await valueOf(page, "#workbench-target-value");

  // One line for the mode: the reduction, by its display name.
  await expect(page.locator("#workbench-showing-reduction")).toHaveText(reduction);
  await expect(page.locator("#workbench-showing-problem")).toHaveCount(0);
  // Each picture names its own problem, by display name (Clique, not CLIQUE).
  await expect(page.locator(`${SOURCE_FRAME}-showing-problem`)).toHaveText(PROBLEM);
  await expect(page.locator(`${SOURCE_FRAME}-showing-algorithm`)).toHaveText("Not run yet");
  await expect(page.locator(`${TARGET_FRAME}-showing-problem`)).toHaveText(target);
  await expect(page.locator(`${TARGET_FRAME}-showing-algorithm`)).toHaveText("Not built yet");
  await expect(page.locator(`${SOURCE_FRAME}-caption`)).toContainText(`Source · ${PROBLEM}`);
  await expect(page.locator(`${TARGET_FRAME}-caption`)).toContainText(`Target · ${target}`);

  await page.locator("#workbench-run").click();
  await expect(page.locator(`${TARGET_FRAME}-showing-algorithm`)).toHaveText("Built, not solved");

  // Solving the target first: its solver names the target, and its answer mapped back names the
  // source.
  await showPane(page, "execute", { expect });
  const targetSolver = await valueOf(page, "#workbench-target-cell-solver-value");
  await page.locator("#workbench-target-cell-run").click();
  await expect(page.locator(`${TARGET_FRAME}-showing-algorithm`)).toHaveText(targetSolver);
  await expect(page.locator(`${SOURCE_FRAME}-showing-algorithm`)).toHaveText(
    `Mapped back from ${target}`,
  );

  // The source's own solver wins over an answer mapped back.
  const sourceSolver = await valueOf(page, "#workbench-source-cell-solver-value");
  await page.locator("#workbench-source-cell-run").click();
  await expect(page.locator(`${SOURCE_FRAME}-showing-algorithm`)).toHaveText(sourceSolver);
  await expect(page.locator(`${TARGET_FRAME}-showing-algorithm`)).toHaveText(targetSolver);
});

test("a source answer carried into a built target says so on the target", async ({ page }) => {
  await answerCompute(page);
  await openReduce(page);
  await page.locator("#workbench-run").click();
  await expect(page.locator(`${TARGET_FRAME}-showing-algorithm`)).toHaveText("Built, not solved");
  await showPane(page, "execute", { expect });
  await page.locator("#workbench-source-cell-run").click();
  await expect(page.locator("#workbench-forward-answer")).toHaveText(MAPPED_FORWARD);
  await expect(page.locator(`${TARGET_FRAME}-showing-algorithm`)).toHaveText(
    `Carried from ${PROBLEM}`,
  );
});

// --- Frames ---------------------------------------------------------------------------------------

test("pictures are about 62% of the window high, clamped 360 to 680 px, and side by side share their lines", async ({
  page,
}) => {
  await answerCompute(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoProblemDetail(page, PROBLEM, { expect });
  const sourceView = page.locator(`${SOURCE_FRAME}-view`);
  await expect(sourceView).toBeVisible();
  // The Formula is wide and short, so this is the frame, not the drawing's shape.
  await expect.poll(async () => (await sourceView.boundingBox()).height).toBeCloseTo(558, 0);

  await page.setViewportSize({ width: 1440, height: 500 });
  await expect.poll(async () => (await sourceView.boundingBox()).height).toBeCloseTo(360, 0);
  await page.setViewportSize({ width: 1440, height: 1300 });
  await expect.poll(async () => (await sourceView.boundingBox()).height).toBeCloseTo(680, 0);

  // Reduce mode: the target is a placeholder frame the source's size, top and bottom aligned.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("#workbench-mode-reduce").click();
  const targetView = page.locator(`${TARGET_FRAME}-view`);
  await expect(page.locator("#workbench-target-picture")).toHaveAttribute(
    "data-picture-kind",
    "placeholder",
  );
  await expect(page.locator("#workbench-target-picture")).toContainText("Not built yet.");
  const source = await sourceView.boundingBox();
  const target = await targetView.boundingBox();
  expect(target.x).toBeGreaterThan(source.x + source.width);
  expect(Math.abs(target.y - source.y)).toBeLessThan(1);
  expect(Math.abs(target.height - source.height)).toBeLessThan(1);
  expect(source.height).toBeCloseTo(558, 0);
  // The placeholder has no picture to zoom or show full screen, and is drawn dashed.
  await expect(page.locator(`${TARGET_FRAME}-fullscreen`)).toHaveCount(0);
  expect(await targetView.evaluate((element) => getComputedStyle(element).borderTopStyle)).toBe(
    "dashed",
  );
});

// --- Picture tools --------------------------------------------------------------------------------

test("−, + and Fit sit in the caption; Ctrl + wheel zooms and a plain wheel scrolls the page", async ({
  page,
}) => {
  await answerCompute(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoProblemDetail(page, PROBLEM, { expect });
  const tools = page.locator(`${SOURCE_FRAME}-tools`);
  const zoom = page.locator(`${SOURCE_FRAME}-view [data-zoom]`);
  await expect(zoom).toHaveAttribute("data-zoom", "1.00");
  await expect(tools.getByRole("button", { name: "Zoom in" })).toBeVisible();
  await expect(tools.getByRole("button", { name: "Zoom out" })).toBeDisabled();

  await tools.getByRole("button", { name: "Zoom in" }).click();
  await expect(zoom).toHaveAttribute("data-zoom", "1.50");
  await tools.getByRole("button", { name: "Zoom out" }).click();
  await expect(zoom).toHaveAttribute("data-zoom", "1.00");
  await tools.getByRole("button", { name: "Zoom in" }).click();
  await tools.getByRole("button", { name: /^Fit the whole diagram/ }).click();
  await expect(zoom).toHaveAttribute("data-zoom", "1.00");

  // A plain wheel over the picture scrolls the page and leaves the zoom alone.
  const view = page.locator(`${SOURCE_FRAME}-view`);
  await view.scrollIntoViewIfNeeded();
  const box = await view.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  await expect(zoom).toHaveAttribute("data-zoom", "1.00");

  // Ctrl + wheel zooms the picture.
  const svg = page.locator(`${SOURCE_FRAME}-view svg[id$="-svg"]`).first();
  const svgBox = await svg.boundingBox();
  await page.mouse.move(svgBox.x + svgBox.width / 2, svgBox.y + svgBox.height / 2);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -300);
  await page.keyboard.up("Control");
  await expect.poll(async () => Number(await zoom.getAttribute("data-zoom"))).toBeGreaterThan(1.2);

  // Nothing in the picture can be selected as text.
  expect(await view.evaluate((element) => getComputedStyle(element).userSelect)).toBe("none");
});

test("Full screen covers the window with the timeline at the bottom; Exit and Escape put it back", async ({
  page,
}) => {
  await answerCompute(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await gotoProblemDetail(page, PROBLEM, { expect });
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-steps-position")).toBeVisible();

  const frame = page.locator(SOURCE_FRAME);
  const button = page.locator(`${SOURCE_FRAME}-fullscreen`);
  const inPage = await page.locator(`${SOURCE_FRAME}-view`).boundingBox();
  await expect(button).toHaveText("Full screen");
  await expect(button).toHaveAttribute("aria-pressed", "false");
  await button.click();
  await expect(frame).toHaveAttribute("data-full-screen", "true");
  await expect(button).toHaveText("Exit full screen");
  await expect(button).toHaveAttribute("aria-pressed", "true");
  const box = await frame.boundingBox();
  expect(box.x).toBeLessThanOrEqual(0.5);
  expect(box.y).toBeLessThanOrEqual(0.5);
  expect(box.width).toBeGreaterThanOrEqual(1279);
  expect(box.height).toBeGreaterThanOrEqual(799);
  // The picture grows to the window, and the step controls sit at the bottom of the frame.
  const view = await page.locator(`${SOURCE_FRAME}-view`).boundingBox();
  expect(view.height).toBeGreaterThan(inPage.height + 20);
  const steps = page.locator("#workbench-full-screen-steps-position");
  await expect(steps).toBeVisible();
  expect((await steps.boundingBox()).y).toBeGreaterThan(view.y + view.height - 1);
  await page.locator("#workbench-full-screen-steps-previous").click();
  await expect(steps).toContainText(`Step ${SAT3_FORMULA_FRAMES.frames.length - 1} of`);
  await expect(page.locator(`${SOURCE_FRAME}-full-screen-title`)).toBeVisible();

  await button.click();
  await expect(frame).toHaveAttribute("data-full-screen", "false");
  await expect(button).toHaveText("Full screen");
  await expect(page.locator("#workbench-full-screen-steps-position")).toHaveCount(0);
  // The step taken in full screen is the page's step too.
  await expect(page.locator("#workbench-steps-position")).toContainText(
    `Step ${SAT3_FORMULA_FRAMES.frames.length - 1} of`,
  );

  await button.click();
  await expect(frame).toHaveAttribute("data-full-screen", "true");
  await page.keyboard.press("Escape");
  await expect(frame).toHaveAttribute("data-full-screen", "false");
  const back = await page.locator(`${SOURCE_FRAME}-view`).boundingBox();
  expect(back.height).toBeCloseTo(Math.min(680, Math.max(360, 0.62 * 800)), 0);
});

// --- Algorithm Steps ------------------------------------------------------------------------------

test("Solve mode: Algorithm Steps stays closed until Solve gives it steps, then opens by itself", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await expect(page.locator(STEPS_TOGGLE)).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#workbench-algorithm-steps-body")).toBeHidden();
  // Legend first, then Algorithm Steps.
  const legend = await page.locator("#workbench-legend-toggle").boundingBox();
  const steps = await page.locator(STEPS_TOGGLE).boundingBox();
  expect(steps.y).toBeGreaterThan(legend.y);

  await page.locator("#workbench-run").click();
  await expect(page.locator(STEPS_TOGGLE)).toHaveAttribute("aria-expanded", "true");
  const count = SAT3_FORMULA_FRAMES.frames.length;
  await expect(page.locator("#workbench-steps-position")).toHaveText(`Step ${count} of ${count}`);
  // Solve mode has no phases.
  await expect(phase(page, "build")).toHaveCount(0);
});

test("Reduce mode: one Build ── Solve ── Map back timeline that marks the phase, jumps, and greys phases with no steps", async ({
  page,
}) => {
  const view = SAT3_TO_CLIQUE_VIEW;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route(REDUCTION_VIEW_REQUEST, (route) => route.fulfill({ json: view }));
  await page.goto(
    `/${encodeURIComponent(PROBLEM)}?instance=${encodeURIComponent(view.source.instance)}`,
  );
  await expect(page.getByRole("heading", { level: 1, name: PROBLEM })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator("#workbench-mode-reduce").click();
  const current = await valueOf(page, "#workbench-target-value");
  if (!/^clique$/i.test(current)) {
    await page.locator("#workbench-target-button").click();
    await page
      .locator("#workbench-target-listbox")
      .getByRole("option")
      .filter({ hasText: /^clique$/i })
      .first()
      .click();
  }
  await expect(page.locator(STEPS_TOGGLE)).toHaveAttribute("aria-expanded", "false");

  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-reduction")).toHaveAttribute("data-phase", "build");
  // Opened by itself, with the three labels in order and the rule between them.
  await expect(page.locator(STEPS_TOGGLE)).toHaveAttribute("aria-expanded", "true");
  const bar = page.locator("#workbench-phases");
  await expect(bar).toHaveText("Build──Solve──Map back");
  await expect(phase(page, "build")).toHaveAttribute("aria-current", "step");
  // Reduce builds only, so Solve and Map back have no steps yet: greyed and dashed.
  for (const key of ["solve", "map"]) {
    await expect(phase(page, key)).toBeDisabled();
    expect(
      await phase(page, key).evaluate((element) => getComputedStyle(element).borderTopStyle),
    ).toBe("dashed");
    await expect(phase(page, key)).toHaveAttribute("title", /^Press Solve /);
  }

  await solveReductionTarget(page, { expect });
  await expect(page.locator("#workbench-reduction")).toHaveAttribute("data-phase", "map");
  await expect(phase(page, "map")).toHaveAttribute("aria-current", "step");
  await expect(phase(page, "solve")).toBeEnabled();

  // A label jumps to its phase's first step, and the pictures follow the step's phase.
  const firstSolve = view.frames.findIndex((frame) => frame.phase === "solve");
  await phase(page, "solve").click();
  await expect(page.locator("#workbench-reduction")).toHaveAttribute(
    "data-frame-index",
    String(firstSolve),
  );
  await expect(page.locator("#workbench-reduction")).toHaveAttribute("data-phase", "solve");
  await expect(phase(page, "solve")).toHaveAttribute("aria-current", "step");
  await expect(phase(page, "build")).not.toHaveAttribute("aria-current", "step");
  await phase(page, "build").click();
  await expect(page.locator("#workbench-reduction")).toHaveAttribute("data-frame-index", "0");
  await expect(page.locator("#workbench-reduction")).toHaveAttribute("data-phase", "build");
});

test("Algorithm Steps stays closed once the viewer closes it, through runs and a reload, until Reset layout", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await page.locator("#workbench-run").click();
  await expect(page.locator(STEPS_TOGGLE)).toHaveAttribute("aria-expanded", "true");

  await page.locator(STEPS_TOGGLE).click();
  await expect(page.locator(STEPS_TOGGLE)).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#workbench-algorithm-steps-body")).toBeHidden();

  // Another run gives it steps again; it stays closed.
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-run-chip")).toHaveText(/^Answer found/);
  await expect(page.locator(STEPS_TOGGLE)).toHaveAttribute("aria-expanded", "false");

  // A reload remembers it.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: PROBLEM })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-run-chip")).toHaveText(/^Answer found/);
  await expect(page.locator(STEPS_TOGGLE)).toHaveAttribute("aria-expanded", "false");

  // Reset layout forgets it: with steps on screen it opens by itself again.
  await page.locator("#workbench-layout-reset").click();
  await expect(page.locator(STEPS_TOGGLE)).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#workbench-steps-position")).toBeVisible();
});

// --- Plain until answered --------------------------------------------------------------------------

test("a picture is plain until an answer exists for the instance, and plain again after an edit", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  const formula = page.locator("#workbench-source-frames-formula-formula");
  await expect(formula).toBeVisible({ timeout: 20_000 });
  // Before any run: no answer colors, no ✓ marks, no values strip.
  await expect(formula.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
  await expect(formula.locator("[data-clause-mark]")).toHaveCount(0);
  await expect(formula.locator('[data-strip="assignment"]')).toHaveCount(0);

  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-run-chip")).toHaveText(/^Answer found/);
  await expect(formula.locator('[data-strip="assignment"]')).toHaveCount(1);
  await expect(
    formula.locator('[data-state]:not([data-state="Background"])').first(),
  ).toBeVisible();

  // An instance edit retires the answer: the picture is drawn plain again.
  await showPane(page, "instance", { expect });
  await page.locator("#workbench-instance-full-instance").fill("(x1 | x2 | !x3)");
  await expect(page.locator("#workbench-showing-algorithm")).toHaveText(
    "Not run yet (default picture)",
  );
  await expect(formula.locator('[data-strip="assignment"]')).toHaveCount(0);
  await expect(formula.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
});
