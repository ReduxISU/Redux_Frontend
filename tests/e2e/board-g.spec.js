// tests/e2e/board-g.spec.js
//
// #303 stage 1: the problem page as Board G, one centered column under a sticky banner. Top to
// bottom: the title with its (i) card, the instance editor (always visible), the picture with
// the Showing line, the Picture menu, zoom and Full screen on one header row, the algorithm's
// steps, the task bar (Solve / Reduce / Verify, the task's menus, its main button) and the
// results. Full screen shows only the picture and the steps. A randomized solver's Seed box sits
// between the Algorithm dropdown's (i) and Solve, and a result's action sits at the far right of
// its row. The (i) card after the title stays inside the window, below the sticky banner, and a
// phone-width page never scrolls sideways.
//
// Stage 2 (Reduce) is at the end of this file.
//
// The catalog comes from the real backend, with allInfo edited so PPZ declares "Stochastic"
// and the backtracking solver doesn't (as tests/e2e/run-seed.spec.js does); every compute
// request is answered from the 3SAT backtracking run in tests/e2e/run-payloads.js (a capture
// with steps), with a seed added.

import { expect, test } from "./fixtures";
import { gotoProblemDetail, selectSolverByName } from "./helpers";
import { SAT_TO_3SAT_VIEW } from "./reduction-payloads";
import { SAT3_BACKTRACKING_ONE_RUN, SAT3_PPZ_ONE_RUN } from "./run-payloads";

const PROBLEM = "3SAT";
const SEED = 4242;
const ALL_INFO_REQUEST = /\/api\/redux\/Navigation\/Batch\/allInfo/;
const RUN_REQUEST = /\/api\/redux\/ProblemProvider\/visualizeRun\?/;
const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve\?/;

const RUN_CAPTURE = SAT3_BACKTRACKING_ONE_RUN;
const RUN = "#workbench-run";
const RESULTS = "#workbench-results";

async function openSat3(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route(ALL_INFO_REQUEST, async (route) => {
    const response = await route.fetch();
    const info = await response.json();
    if (info[SAT3_PPZ_ONE_RUN.solver]) {
      info[SAT3_PPZ_ONE_RUN.solver].solverType = "Stochastic";
      info[SAT3_PPZ_ONE_RUN.solver].solverTypes = ["Stochastic"];
    }
    if (info[SAT3_BACKTRACKING_ONE_RUN.solver]) {
      info[SAT3_BACKTRACKING_ONE_RUN.solver].solverType = "Backtracking";
      info[SAT3_BACKTRACKING_ONE_RUN.solver].solverTypes = ["Backtracking"];
    }
    await route.fulfill({ response, json: info });
  });
  await page.route(RUN_REQUEST, (route) => route.fulfill({ json: { ...RUN_CAPTURE, seed: SEED } }));
  await page.route(VISUALIZE_REQUEST, (route) => {
    const visualization = new URL(route.request().url()).searchParams.get("visualization");
    const pictures = SAT3_BACKTRACKING_ONE_RUN.pictures;
    const picture = pictures.find((entry) => entry.visualization === visualization) ?? pictures[0];
    return route.fulfill({
      json: { type: picture.type, payload: picture.payload, frames: picture.frames },
    });
  });
  await page.route(SOLVE_REQUEST, (route) => route.fulfill({ json: RUN_CAPTURE.answer }));
  await gotoProblemDetail(page, PROBLEM, { expect });
  await selectSolverByName(page, SAT3_PPZ_ONE_RUN.solverName, { expect });
}

async function solve(page) {
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-result-answer")).toHaveText(RUN_CAPTURE.answer);
  await expect(page.locator("#workbench-steps-slider")).toBeVisible();
}

async function boxOf(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`${selector} has no box`);
  return box;
}

/** Whether two boxes share a line: each one's vertical middle falls inside the other. */
function sameLine(a, b) {
  const middle = (box) => box.y + box.height / 2;
  return (
    middle(a) > b.y && middle(a) < b.y + b.height && middle(b) > a.y && middle(b) < a.y + a.height
  );
}

async function horizontalOverflow(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

test("the page is one centered column: title, instance, picture, steps, task bar, results", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await openSat3(page);
  await solve(page);

  const order = [
    "h1",
    "#workbench-instance-full-instance",
    "#workbench-picture-header",
    "#workbench-source-picture",
    "#workbench-steps-slider",
    "#workbench-tasks",
    RESULTS,
  ];
  let previous = null;
  for (const selector of order) {
    const box = await boxOf(page, selector);
    if (previous)
      expect(box.y, `${selector} comes after ${previous.selector}`).toBeGreaterThan(previous.y);
    previous = { selector, y: box.y };
  }

  // The column is centered in a wide window, and the workspace holds everything but the title.
  const card = await boxOf(page, "#workbench");
  expect(Math.abs(card.x - (1920 - (card.x + card.width)))).toBeLessThan(2);
  await expect(page.locator("#workbench-rail")).toHaveCount(0);
  await expect(page.locator("#workbench-instance-full-instance")).toBeVisible();
  await expect(page.locator("#workbench-instance-full-instance")).toBeEditable();
});

test("the banner stays at the top of the window while the page scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await openSat3(page);
  await page.locator(RUN).scrollIntoViewIfNeeded();
  const banner = await boxOf(page, "header[data-site-banner]");
  expect(Math.abs(banner.y)).toBeLessThan(1);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test("in Solve the Showing line sits on the Picture menu's row, with zoom and Full screen on the same line", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openSat3(page);
  await solve(page);

  const showing = await boxOf(page, "#workbench-showing");
  const picture = await boxOf(page, "#workbench-source-type-button");
  const zoomIn = await boxOf(page, '#workbench-zoom-slot [aria-label="Zoom in"]');
  const full = await boxOf(page, "#workbench-full-screen");
  expect(sameLine(showing, picture)).toBe(true);
  expect(sameLine(picture, zoomIn)).toBe(true);
  expect(sameLine(zoomIn, full)).toBe(true);
  // Left to right: Showing, Picture, zoom, Full screen.
  expect(showing.x).toBeLessThan(picture.x);
  expect(picture.x).toBeLessThan(zoomIn.x);
  expect(zoomIn.x).toBeLessThan(full.x);
  // The zoom buttons left the picture: none are drawn above it any more.
  await expect(page.locator('#workbench-source-picture [aria-label="Zoom in"]')).toHaveCount(0);
});

test("full screen shows only the picture and the steps, and Escape leaves it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openSat3(page);
  await solve(page);

  const fullButton = page.locator("#workbench-full-screen");
  await expect(fullButton).toHaveAttribute("aria-pressed", "false");
  await fullButton.click();
  await expect(page.locator("#workbench")).toHaveAttribute("data-full-screen", "true");
  await expect(page.locator("#workbench-full-exit")).toBeFocused();
  await expect(fullButton).toHaveAttribute("aria-pressed", "true");

  // Covers the window, banner included.
  const card = await boxOf(page, "#workbench");
  expect(card.x).toBe(0);
  expect(card.y).toBe(0);
  expect(card.width).toBe(1280);

  await expect(page.locator("#workbench-source-picture")).toBeVisible();
  await expect(page.locator("#workbench-steps-slider")).toBeVisible();
  for (const hidden of [
    "#workbench-instance-full-instance",
    "#workbench-command-bar",
    RESULTS,
    "#workbench-legend-body",
    "#workbench-note",
  ]) {
    await expect(page.locator(hidden)).toBeHidden();
  }

  await page.keyboard.press("Escape");
  await expect(page.locator("#workbench")).not.toHaveAttribute("data-full-screen", "true");
  await expect(fullButton).toBeFocused();
  await expect(page.locator("#workbench-command-bar")).toBeVisible();
  await expect(page.locator(RESULTS)).toBeVisible();
});

test("a randomized solver's Seed box sits between the Algorithm (i) and Solve, and goes for one that isn't", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openSat3(page);

  const info = await boxOf(page, "#workbench-solver-info-button");
  const dropdown = await boxOf(page, "#workbench-solver-button");
  const seed = await boxOf(page, "#workbench-seed");
  const run = await boxOf(page, RUN);
  expect(dropdown.x + dropdown.width).toBeLessThanOrEqual(info.x + 1);
  expect(info.x + info.width).toBeLessThanOrEqual(seed.x);
  expect(seed.x + seed.width).toBeLessThanOrEqual(run.x);
  expect(sameLine(dropdown, seed)).toBe(true);
  expect(sameLine(seed, run)).toBe(true);
  await expect(page.locator(RUN)).toHaveText("Solve");

  await selectSolverByName(page, SAT3_BACKTRACKING_ONE_RUN.solverName, { expect });
  await expect(page.locator("#workbench-seed")).toHaveCount(0);
});

test("Check it in Verify sits at the far right of its row and opens the Verify tab", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openSat3(page);
  await solve(page);

  const results = await boxOf(page, RESULTS);
  const action = await boxOf(page, "#workbench-result-verify-answer");
  const seedLine = await boxOf(page, "#workbench-result-seed");
  await expect(page.locator("#workbench-result-verify-answer")).toHaveText("Check it in Verify");
  expect(Math.abs(results.x + results.width - (action.x + action.width))).toBeLessThan(2);
  expect(sameLine(seedLine, action)).toBe(true);

  await page.locator("#workbench-result-verify-answer").click();
  await expect(page.locator("#workbench-mode-verify")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#workbench-result-verify-certificate")).toHaveValue(
    RUN_CAPTURE.answer,
  );
  // Verify has no Solve button and no results list: the Verify box checks.
  await expect(page.locator(RUN)).toHaveCount(0);
  await expect(page.locator(RESULTS)).toHaveCount(0);
});

for (const width of [320, 1280]) {
  test(`at ${width} px the title's (i) card stays inside the window, clear of the banner`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await openSat3(page);
    const button = page.locator("#problem-info-button");
    const card = page.locator("#problem-info-card");

    const check = async () => {
      await expect(card).toBeVisible();
      await expect(card).toContainText(PROBLEM);
      const box = await boxOf(page, "#problem-info-card");
      const banner = await boxOf(page, "header[data-site-banner]");
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y).toBeGreaterThanOrEqual(banner.y + banner.height);
    };

    // A tap pins it open (a hover would too, with a mouse).
    await button.click();
    await check();
    await button.click();
    await expect(card).toBeHidden();

    // With the title just under the sticky banner there is no room above: it opens below.
    await page.evaluate(() => {
      const banner = document.querySelector("[data-site-banner]").getBoundingClientRect();
      const title = document.querySelector("h1").getBoundingClientRect();
      window.scrollBy(0, title.top - banner.bottom - 4);
    });
    await button.click();
    await check();
    await expect(card).toHaveAttribute("data-placement", "below");
  });
}

for (const width of [320, 390]) {
  test(`at ${width} px the page never scrolls sideways, and the ISU logo is in the footer`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await openSat3(page);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await solve(page);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    await expect(page.locator("#navbar-menu-button")).toBeVisible();
    await expect(page.locator("header[data-site-banner] img")).toHaveCount(2);
    for (const img of await page.locator("header[data-site-banner] img").all()) {
      await expect(img).toBeHidden();
    }
    await expect(page.locator("#problem-footer")).toBeVisible();
    // Every task button is a 44px target.
    for (const task of ["solve", "reduce", "verify"]) {
      const box = await boxOf(page, `#workbench-mode-${task}`);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
}

// --- #303 stage 2: Reduce -------------------------------------------------------------------
//
// Reduce is a Reduce -> Solve -> Verify stepper whose menus belong to the stage shown, under two
// panes (source, arrow, target) whose header rows line up. reductionView is answered with the
// SAT -> 3SAT capture (./reduction-payloads.js) on SAT's page; the catalog's own 3SAT solvers fill
// the Solve stage's Algorithm menu, WalkSAT among them declaring "Stochastic".

const REDUCTION_VIEW_REQUEST = /\/api\/redux\/ProblemProvider\/reductionView\?/;
const REDUCE_SEED = 777;

async function openSatReduce(page, { width = 1280 } = {}) {
  const asked = [];
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width, height: 1000 });
  await page.route(REDUCTION_VIEW_REQUEST, (route) => {
    const url = new URL(route.request().url());
    asked.push(url);
    const seed = url.searchParams.get("seed");
    return route.fulfill({
      json: url.searchParams.get("solver")
        ? { ...SAT_TO_3SAT_VIEW, seed: seed ? Number(seed) : REDUCE_SEED }
        : SAT_TO_3SAT_VIEW,
    });
  });
  const instance = SAT_TO_3SAT_VIEW.source.instance;
  await page.goto(`/SAT?instance=${encodeURIComponent(instance)}`);
  await expect(page.getByRole("heading", { level: 1, name: "SAT" })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator("#workbench-mode-reduce").click();
  const current = ((await page.locator("#workbench-target-value").textContent()) ?? "").trim();
  if (!/^3SAT/.test(current)) {
    await page.locator("#workbench-target-button").click();
    await page
      .locator("#workbench-target-listbox")
      .getByRole("option")
      .filter({ hasText: /^3SAT/ })
      .first()
      .click();
  }
  await expect(page.locator("#workbench-target-value")).toHaveText(/^3SAT/);
  return asked;
}

const stage = (page, key) => page.locator(`#workbench-stage-${key}`);

test("Reduce's stepper runs Reduce, Solve, Verify in order, each with only its own menus", async ({
  page,
}) => {
  const asked = await openSatReduce(page);

  // The stages in order, the later two disabled until the one before them is done.
  const order = await page
    .locator("#workbench-stages button")
    .evaluateAll((buttons) => buttons.map((button) => button.id));
  expect(order).toEqual([
    "workbench-stage-reduce",
    "workbench-stage-solve",
    "workbench-stage-verify",
  ]);
  await expect(stage(page, "reduce")).toHaveAttribute("aria-current", "step");
  await expect(stage(page, "solve")).toBeDisabled();
  await expect(stage(page, "verify")).toBeDisabled();
  // Reduce's menus only.
  await expect(page.locator("#workbench-target-button")).toBeVisible();
  await expect(page.locator("#workbench-reduction-button")).toBeVisible();
  await expect(page.locator("#workbench-target-solver-button")).toHaveCount(0);
  await expect(page.locator("#workbench-result-verify")).toHaveCount(0);
  await expect(page.locator(RUN)).toHaveText("Reduce");
  await expect(page.locator("#workbench-result-stages-reduce-next")).toHaveAttribute(
    "data-stage",
    "reduce",
  );

  // Reduce builds the target: only Build's steps, nothing solved yet.
  await page.locator(RUN).click();
  await expect(stage(page, "solve")).toHaveAttribute("aria-current", "step");
  await expect(stage(page, "reduce")).toHaveAttribute("data-stage-state", "done");
  await expect(stage(page, "verify")).toBeDisabled();
  expect(asked[0].searchParams.get("solver")).toBeNull();
  const builds = SAT_TO_3SAT_VIEW.frames.filter((frame) => frame.phase === "build").length;
  await expect(page.locator("#workbench-steps-position")).toHaveText(`Step ${builds} of ${builds}`);
  await expect(page.locator("#workbench-phases-solve")).toBeDisabled();
  await expect(page.locator("#workbench-showing")).not.toContainText("solved by");
  await expect(page.locator("#workbench-reduction-target-title")).toContainText("built");
  // Solve's menus only: the target's Algorithm with its (i), and Solve through 3SAT.
  await expect(page.locator("#workbench-target-button")).toHaveCount(0);
  await expect(page.locator("#workbench-reduction-button")).toHaveCount(0);
  await expect(page.locator("#workbench-target-solver-button")).toBeVisible();
  await expect(page.locator("#workbench-target-solver-info-button")).toBeVisible();
  await expect(page.locator(RUN)).toHaveText("Solve through 3SAT");

  // Solve solves the target with the chosen Algorithm; the answer is mapped back to SAT.
  const solverName = (
    (await page.locator("#workbench-target-solver-value").textContent()) ?? ""
  ).trim();
  await page.locator(RUN).click();
  await expect(stage(page, "verify")).toHaveAttribute("aria-current", "step");
  await expect(stage(page, "solve")).toHaveAttribute("data-stage-state", "done");
  expect(asked).toHaveLength(2);
  expect(asked[1].searchParams.get("solver")).toBeTruthy();
  await expect(page.locator("#workbench-showing")).toContainText("solved by");
  const frames = SAT_TO_3SAT_VIEW.frames.length;
  await expect(page.locator("#workbench-steps-position")).toHaveText(`Step ${frames} of ${frames}`);
  await expect(page.locator("#workbench-reduction-source-title")).toContainText(
    "mapped back from 3SAT",
  );
  await expect(page.locator("#workbench-reduction-target-title")).toContainText(
    SAT_TO_3SAT_VIEW.solver,
  );
  expect(solverName).not.toBe("");
  // Verify's box only: no main button, and the Check against switch, its target side unlocked.
  await expect(page.locator("#workbench-target-solver-button")).toHaveCount(0);
  await expect(page.locator(RUN)).toHaveCount(0);
  await expect(page.locator("#workbench-result-verify-check-on-target")).toBeEnabled();

  // The results, tagged by stage in the stepper's order, with the answer mapped back.
  // (This route answers every Solve with a seed, so Solve has its seed row too.)
  const rows = await page
    .locator("#workbench-result-stages > li")
    .evaluateAll((items) => items.map((item) => [item.id, item.dataset.stage]));
  expect(rows).toEqual([
    ["workbench-result-stages-reduce-done", "reduce"],
    ["workbench-result-stages-solve-answer", "solve"],
    ["workbench-result-stages-solve-mapped", "solve"],
    ["workbench-result-stages-solve-seed", "solve"],
    ["workbench-result-stages-verify-next", "verify"],
  ]);
  await expect(page.locator("#workbench-result-stages-solve-mapped")).toContainText(
    `Mapped back to SAT: ${SAT_TO_3SAT_VIEW.frames.at(-1).caption}`,
  );
  await expect(page.locator("#workbench-result-mapped-back")).toContainText(
    SAT_TO_3SAT_VIEW.frames.at(-1).caption,
  );

  // The stepper goes back to an earlier stage's menus; a new Reduce starts again from Solve.
  await stage(page, "reduce").click();
  await expect(stage(page, "reduce")).toHaveAttribute("aria-current", "step");
  await expect(page.locator(RUN)).toHaveText("Rebuild");
  await page.locator(RUN).click();
  await expect(stage(page, "solve")).toHaveAttribute("aria-current", "step");
  await expect(stage(page, "verify")).toBeDisabled();
  await expect(page.locator("#workbench-result-stages-solve-next")).toBeVisible();
});

test("a randomized target Algorithm gets the Seed box right of its dropdown, and the seed goes on the request", async ({
  page,
}) => {
  const asked = await openSatReduce(page);
  await page.locator(RUN).click();
  await expect(stage(page, "solve")).toHaveAttribute("aria-current", "step");
  await page.locator("#workbench-target-solver-button").click();
  await page
    .locator("#workbench-target-solver-listbox")
    .getByRole("option", { name: /WalkSAT/ })
    .click();

  const dropdown = await boxOf(page, "#workbench-target-solver-button");
  const info = await boxOf(page, "#workbench-target-solver-info-button");
  const seed = await boxOf(page, "#workbench-seed");
  expect(dropdown.x + dropdown.width).toBeLessThanOrEqual(info.x + 1);
  expect(info.x + info.width).toBeLessThanOrEqual(seed.x);
  expect(sameLine(dropdown, seed)).toBe(true);

  await page.locator("#workbench-seed").fill("31");
  await page.locator(RUN).click();
  await expect(stage(page, "verify")).toHaveAttribute("aria-current", "step");
  expect(asked.at(-1).searchParams.get("solver")).toMatch(/WalkSAT/);
  expect(asked.at(-1).searchParams.get("seed")).toBe("31");
  await expect(page.locator("#workbench-result-stages-solve-seed")).toContainText("Seed 31");

  // Run again with this seed asks for the same run, from the Verify stage too.
  const before = asked.length;
  await page.locator("#workbench-result-stage-seed-rerun").click();
  await expect.poll(() => asked.length).toBe(before + 1);
  await expect(stage(page, "verify")).toHaveAttribute("aria-current", "step");
  expect(asked.at(-1).searchParams.get("seed")).toBe("31");

  // A deterministic Algorithm has no Seed box.
  await stage(page, "solve").click();
  await page.locator("#workbench-target-solver-button").click();
  await page
    .locator("#workbench-target-solver-listbox")
    .getByRole("option", { name: /Backtracking/ })
    .first()
    .click();
  await expect(page.locator("#workbench-seed")).toHaveCount(0);
});

test("at desktop width the panes sit side by side with the arrow between them, and their header rows line up", async ({
  page,
}) => {
  await openSatReduce(page);
  const check = async (prefix) => {
    const source = await boxOf(page, `${prefix}-source-pane`);
    const arrow = await boxOf(page, `${prefix}-panes-arrow`);
    const target = await boxOf(page, `${prefix}-target-pane`);
    expect(arrow.x).toBeGreaterThanOrEqual(source.x + source.width);
    expect(target.x).toBeGreaterThanOrEqual(arrow.x + arrow.width);
    expect(Math.abs(source.y - target.y)).toBeLessThanOrEqual(1);
    const sourceMenu = await boxOf(page, "#workbench-source-type-button");
    const targetMenu = await boxOf(page, "#workbench-target-type-button");
    expect(Math.abs(sourceMenu.y - targetMenu.y)).toBeLessThanOrEqual(1);
  };
  // Before Reduce (the default picture and the target's placeholder), and in the view.
  await check("#workbench");
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-reduction")).toBeVisible();
  await check("#workbench-reduction");

  // A label that wraps on one side pushes both sides' controls down together.
  await page.locator("#workbench-reduction-source-title").evaluate((title) => {
    const extra = document.createElement("span");
    extra.textContent = " a long extra label part that has to wrap onto more lines".repeat(4);
    title.append(extra);
  });
  const sourceTitle = await boxOf(page, "#workbench-reduction-source-title");
  const targetTitle = await boxOf(page, "#workbench-reduction-target-title");
  expect(sourceTitle.height).toBeGreaterThan(targetTitle.height + 10);
  const sourceMenu = await boxOf(page, "#workbench-source-type-button");
  const targetMenu = await boxOf(page, "#workbench-target-type-button");
  expect(Math.abs(sourceMenu.y - targetMenu.y)).toBeLessThanOrEqual(1);

  // The Showing line is a line of its own above the panes.
  const showing = await boxOf(page, "#workbench-showing");
  expect(showing.y + showing.height).toBeLessThanOrEqual(sourceTitle.y);
});

test("at 390 px the panes stack with the arrow pointing down between them, and nothing scrolls sideways", async ({
  page,
}) => {
  await openSatReduce(page, { width: 390 });
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-reduction")).toBeVisible();
  const source = await boxOf(page, "#workbench-reduction-source-pane");
  const arrow = await boxOf(page, "#workbench-reduction-panes-arrow");
  const target = await boxOf(page, "#workbench-reduction-target-pane");
  expect(arrow.y).toBeGreaterThanOrEqual(source.y + source.height - 1);
  expect(target.y).toBeGreaterThanOrEqual(arrow.y + arrow.height - 1);
  const turn = await page
    .locator("#workbench-reduction-panes-arrow")
    .evaluate((element) => getComputedStyle(element).transform);
  expect(turn).not.toBe("none");
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  for (const id of ["stage-reduce", "stage-solve", "stage-verify", "run"]) {
    expect((await boxOf(page, `#workbench-${id}`)).height).toBeGreaterThanOrEqual(44);
  }
});

test("each pane's Full screen shows that picture alone with the steps; Reduce's shows both with the arrow", async ({
  page,
}) => {
  await openSatReduce(page);
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-reduction")).toBeVisible();
  const hiddenInFull = [
    "#workbench-instance-full-instance",
    "#workbench-command-bar",
    RESULTS,
    "#workbench-legend-body",
  ];

  // The target pane alone.
  await page.locator("#workbench-target-full-screen").click();
  await expect(page.locator("#workbench")).toHaveAttribute("data-full-screen-on", "target");
  await expect(page.locator("#workbench-full-title")).toHaveText("3SAT");
  await expect(page.locator("#workbench-reduction-target")).toBeVisible();
  await expect(page.locator("#workbench-reduction-source")).toBeHidden();
  await expect(page.locator("#workbench-reduction-panes-arrow")).toBeHidden();
  await expect(page.locator("#workbench-steps-slider")).toBeVisible();
  for (const hidden of hiddenInFull) await expect(page.locator(hidden)).toBeHidden();
  const alone = await boxOf(page, "#workbench-reduction-target-pane");
  expect(alone.width).toBeGreaterThan(1000);
  await page.keyboard.press("Escape");
  await expect(page.locator("#workbench")).not.toHaveAttribute("data-full-screen", "true");
  await expect(page.locator("#workbench-target-full-screen")).toBeFocused();

  // The source pane alone.
  await page.locator("#workbench-source-full-screen").click();
  await expect(page.locator("#workbench-reduction-source")).toBeVisible();
  await expect(page.locator("#workbench-reduction-target")).toBeHidden();
  await page.locator("#workbench-full-exit").click();

  // Both pictures with the arrow, and the steps.
  await page.locator("#workbench-full-screen").click();
  await expect(page.locator("#workbench")).toHaveAttribute("data-full-screen-on", "all");
  await expect(page.locator("#workbench-full-title")).toHaveText("SAT → 3SAT");
  await expect(page.locator("#workbench-reduction-source")).toBeVisible();
  await expect(page.locator("#workbench-reduction-target")).toBeVisible();
  await expect(page.locator("#workbench-reduction-panes-arrow")).toBeVisible();
  await expect(page.locator("#workbench-steps-slider")).toBeVisible();
  for (const hidden of hiddenInFull) await expect(page.locator(hidden)).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(page.locator("#workbench-full-screen")).toBeFocused();
});
