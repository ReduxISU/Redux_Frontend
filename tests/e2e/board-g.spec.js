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
// The catalog comes from the real backend, with allInfo edited so PPZ declares "Stochastic"
// and the backtracking solver doesn't (as tests/e2e/run-seed.spec.js does); every compute
// request is answered from the 3SAT backtracking run in tests/e2e/run-payloads.js (a capture
// with steps), with a seed added.

import { expect, test } from "./fixtures";
import { gotoProblemDetail, selectSolverByName } from "./helpers";
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
