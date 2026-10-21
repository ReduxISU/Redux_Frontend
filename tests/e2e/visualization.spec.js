// tests/e2e/visualization.spec.js
//
// #279 stage 3 (board F): the Workspace's Visualization section. #279 Workspace tweaks: each
// picture is its own section, top to bottom its heading ("3SAT" in Solve mode, "Source: 3SAT" and
// "Target: Clique" in Reduce mode, with what the picture shows after it only when that adds
// something: a solver's steps, or an answer mapped back), one row with the Visualization Type and
// the view controls, then the picture; Reduce mode keeps one Reduction line above them, and there
// is no Problem or Algorithm line in either mode. Also the picture frames' height (about 62% of the window, clamped 360
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
import { chooseReduceTarget, gotoProblemDetail, showPane, solveReductionTarget } from "./helpers";
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

// --- One section per picture (#279 Workspace tweaks) ---------------------------------------------

const heading = (frame) => `${frame}-heading`;
const title = (frame) => `${frame}-title`;
const status = (frame) => `${frame}-status`;

/** The frame's heading, its controls row and its picture are in that order, top to bottom. */
async function expectSectionOrder(page, frame, typeId) {
  const headingBox = await page.locator(heading(frame)).boundingBox();
  const row = page.locator(`${frame}-caption`);
  // The Visualization Type and the view controls share the one row inside the section.
  await expect(row.locator(`${typeId}-button`)).toBeVisible();
  await expect(row.locator(`${frame}-fullscreen`)).toBeVisible();
  const rowBox = await row.boundingBox();
  const viewBox = await page.locator(`${frame}-view`).boundingBox();
  expect(rowBox.y).toBeGreaterThanOrEqual(headingBox.y + headingBox.height - 1);
  expect(viewBox.y).toBeGreaterThanOrEqual(rowBox.y + rowBox.height - 1);
}

test("Solve mode: one section headed by the problem, its type and view controls, then the picture; the heading names the solver's steps only while they play", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  await expect(page.locator(title(SOURCE_FRAME))).toHaveText(PROBLEM);
  await expect(page.locator(status(SOURCE_FRAME))).toHaveCount(0);
  // No Showing block in Solve mode: no Problem, Algorithm or Reduction line.
  await expect(page.locator("#workbench-showing")).toHaveCount(0);
  await expect(page.locator("#workbench-section-visualization")).not.toContainText("Algorithm:");
  await expect(page.locator("#workbench-section-visualization")).not.toContainText("Problem:");
  await expectSectionOrder(page, SOURCE_FRAME, "#workbench-source-type");

  const solver = await valueOf(page, "#workbench-solver-value");
  await page.locator("#workbench-run").click();
  await expect(page.locator(status(SOURCE_FRAME))).toHaveText(`${solver} steps`);
  await expect(page.locator(heading(SOURCE_FRAME))).toHaveText(`${PROBLEM} · ${solver} steps`);

  // An instance edit retires the run: the picture is plain again, and so is its heading.
  await showPane(page, "instance", { expect });
  await page.locator("#workbench-instance-full-instance").fill("(x1 | x2 | !x3)");
  await expect(page.locator(status(SOURCE_FRAME))).toHaveCount(0);
  await expect(page.locator(heading(SOURCE_FRAME))).toHaveText(PROBLEM);
});

test("Reduce mode: one Reduction line, then a Source and a Target section, each headed by its problem, with no Problem or Algorithm lines", async ({
  page,
}) => {
  await answerCompute(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openReduce(page);
  const reduction = await valueOf(page, "#workbench-reduction-value");
  const target = await valueOf(page, "#workbench-target-value");

  await expect(page.locator("#workbench-showing-reduction")).toHaveText(reduction);
  await expect(page.locator("#workbench-showing-problem")).toHaveCount(0);
  await expect(page.locator("#workbench-showing-algorithm")).toHaveCount(0);
  await expect(page.locator("#workbench-section-visualization")).not.toContainText("Algorithm:");
  // Each section is headed by its side and problem, by display name, and is plain so far.
  await expect(page.locator(title(SOURCE_FRAME))).toHaveText(`Source: ${PROBLEM}`);
  await expect(page.locator(title(TARGET_FRAME))).toHaveText(`Target: ${target}`);
  await expect(page.locator(status(SOURCE_FRAME))).toHaveCount(0);
  await expect(page.locator(status(TARGET_FRAME))).toHaveCount(0);
  // The placeholder still says Not built yet, in the picture, not in the heading.
  await expect(page.locator("#workbench-target-picture")).toContainText("Not built yet.");
  await expect(page.locator(heading(TARGET_FRAME))).toHaveText(`Target: ${target}`);
  await expectSectionOrder(page, SOURCE_FRAME, "#workbench-source-type");

  // Side by side the two sections share their top and bottom lines, and their headings.
  const sourceBox = await page.locator(SOURCE_FRAME).boundingBox();
  const targetBox = await page.locator(TARGET_FRAME).boundingBox();
  expect(targetBox.x).toBeGreaterThan(sourceBox.x + sourceBox.width);
  expect(Math.abs(targetBox.y - sourceBox.y)).toBeLessThan(1);
  expect(Math.abs(targetBox.y + targetBox.height - (sourceBox.y + sourceBox.height))).toBeLessThan(
    1,
  );
  const sourceHeading = await page.locator(heading(SOURCE_FRAME)).boundingBox();
  const targetHeading = await page.locator(heading(TARGET_FRAME)).boundingBox();
  expect(Math.abs(targetHeading.y - sourceHeading.y)).toBeLessThan(1);
  // Each section is outlined on its own.
  expect(
    await page
      .locator(SOURCE_FRAME)
      .evaluate((element) => getComputedStyle(element).borderTopStyle),
  ).toBe("solid");

  // A Workspace 960 px wide or less stacks them, source first.
  await page.setViewportSize({ width: 900, height: 900 });
  await expect
    .poll(async () => {
      const source = await page.locator(SOURCE_FRAME).boundingBox();
      const stacked = await page.locator(TARGET_FRAME).boundingBox();
      return stacked.y >= source.y + source.height - 1;
    })
    .toBe(true);
});

test("Reduce mode without a Reduction View: the source names its solver's steps once solved; the target stays plain, an answer carried into it included", async ({
  page,
}) => {
  await answerCompute(page);
  // A backend without the view: Reduce builds through ProblemProvider/reduce.
  await page.route(REDUCTION_VIEW_REQUEST, (route) => route.fulfill({ status: 404, json: {} }));
  await openReduce(page);
  const target = await valueOf(page, "#workbench-target-value");
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-run-chip")).toHaveText(/^Built/);
  await expect(page.locator(status(SOURCE_FRAME))).toHaveCount(0);
  await expect(page.locator(status(TARGET_FRAME))).toHaveCount(0);

  await showPane(page, "execute", { expect });
  const sourceSolver = await valueOf(page, "#workbench-source-cell-solver-value");
  await page.locator("#workbench-source-cell-run").click();
  await expect(page.locator(status(SOURCE_FRAME))).toHaveText(`${sourceSolver} steps`);
  await expect(page.locator(heading(SOURCE_FRAME))).toHaveText(
    `Source: ${PROBLEM} · ${sourceSolver} steps`,
  );
  // The source's answer is carried into the target (Execute shows it), but no picture draws it,
  // so the target's heading claims nothing.
  await expect(page.locator("#workbench-forward-answer")).toHaveText(MAPPED_FORWARD);
  await expect(page.locator(status(TARGET_FRAME))).toHaveCount(0);
  await expect(page.locator(heading(TARGET_FRAME))).toHaveText(`Target: ${target}`);

  // An instance edit retires both: plain again.
  await showPane(page, "instance", { expect });
  await page.locator("#workbench-instance-full-instance").fill("(x1 | x2 | !x3)");
  await expect(page.locator(status(SOURCE_FRAME))).toHaveCount(0);
  await expect(page.locator(heading(SOURCE_FRAME))).toHaveText(`Source: ${PROBLEM}`);
});

test("the Reduction View's headings follow the phase on screen: nothing during Build, the target solver's steps in Solve, and the answer mapped back in Map back", async ({
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
  await chooseReduceTarget(page, /^Clique$/, { expect });
  const source = "#workbench-reduction-source-frame";
  const target = "#workbench-reduction-target-frame";

  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-reduction")).toHaveAttribute("data-phase", "build");
  // The view's titles carry their own ids.
  await expect(page.locator("#workbench-reduction-source-title")).toHaveText(`Source: ${PROBLEM}`);
  await expect(page.locator("#workbench-reduction-target-title")).toHaveText("Target: Clique");
  await expect(page.locator(status(source))).toHaveCount(0);
  await expect(page.locator(status(target))).toHaveCount(0);
  await expectSectionOrder(page, source, "#workbench-source-type");
  await expectSectionOrder(page, target, "#workbench-target-type");

  await showPane(page, "execute", { expect });
  const targetSolver = await valueOf(page, "#workbench-target-cell-solver-value");
  await solveReductionTarget(page, { expect });
  // It opens on Map back's last step: the source shows the answer mapped back.
  await expect(page.locator("#workbench-reduction")).toHaveAttribute("data-phase", "map");
  await expect(page.locator(status(source))).toHaveText("answer mapped back from Clique");
  await expect(page.locator(heading(source))).toHaveText(
    `Source: ${PROBLEM} · answer mapped back from Clique`,
  );
  await expect(page.locator(status(target))).toHaveText(`${targetSolver} steps`);

  // Solve: the target plays its solver's steps; the source has no answer yet.
  await phase(page, "solve").click();
  await expect(page.locator("#workbench-reduction")).toHaveAttribute("data-phase", "solve");
  await expect(page.locator(status(target))).toHaveText(`${targetSolver} steps`);
  await expect(page.locator(heading(target))).toHaveText(`Target: Clique · ${targetSolver} steps`);
  await expect(page.locator(status(source))).toHaveCount(0);

  // Build: both plain.
  await phase(page, "build").click();
  await expect(page.locator("#workbench-reduction")).toHaveAttribute("data-phase", "build");
  await expect(page.locator(status(source))).toHaveCount(0);
  await expect(page.locator(status(target))).toHaveCount(0);
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
  // The section's heading stays at the top in full screen.
  await expect(page.locator(heading(SOURCE_FRAME))).toBeVisible();

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
  await expect(page.locator(`${SOURCE_FRAME}-status`)).toHaveCount(0);
  await expect(formula.locator('[data-strip="assignment"]')).toHaveCount(0);
  await expect(formula.locator('[data-state]:not([data-state="Background"])')).toHaveCount(0);
});
