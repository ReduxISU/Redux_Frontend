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
import {
  answerViewCertificates,
  gotoProblemDetail,
  selectSolverByName,
  touchInstance,
  VIEW_MAPPED_ANSWER,
  VIEW_TARGET_ANSWER,
} from "./helpers";
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

/** `editInfo` changes allInfo before the page reads it. */
async function openSat3(page, { editInfo } = {}) {
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
    editInfo?.(info);
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
  // #305: the button that went in is the one way out, focused and saying so in words.
  await expect(fullButton).toBeFocused();
  await expect(fullButton).toHaveAttribute("aria-pressed", "true");
  await expect(fullButton).toHaveText("Exit full screen");
  await expect(page.locator("#workbench-full-exit")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Exit full screen", exact: true })).toHaveCount(1);

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

test("Check it in Verify sits at the far right of the answer's row and opens the Verify tab", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openSat3(page);
  await solve(page);

  // One row for the answer (its sentence, the answer to copy, the action at the far right),
  // then the seed's row.
  const rows = await page
    .locator("#workbench-result-rows > li")
    .evaluateAll((items) => items.map((item) => [item.id, item.dataset.tone]));
  expect(rows).toEqual([
    ["workbench-result-rows-answer", "ok"],
    ["workbench-result-rows-seed", "info"],
  ]);
  const answerRow = await boxOf(page, "#workbench-result-rows-answer");
  const action = await boxOf(page, "#workbench-result-verify-answer");
  await expect(page.locator("#workbench-result-verify-answer")).toHaveText("Check it in Verify");
  expect(Math.abs(answerRow.x + answerRow.width - (action.x + action.width))).toBeLessThan(16);
  expect(sameLine(answerRow, action)).toBe(true);
  await expect(page.locator("#workbench-result-rows-answer")).toContainText("round trip");

  await page.locator("#workbench-result-verify-answer").click();
  await expect(page.locator("#workbench-mode-verify")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#workbench-verify-certificate")).toHaveValue(RUN_CAPTURE.answer);
  // Verify's main button is Check, and its verdict is a row in the results.
  await expect(page.locator(RUN)).toHaveText("Check");
  await expect(page.locator("#workbench-result-rows-verdict")).toBeVisible();
});

test("Verify's task bar: the Verifier menu with its (i), Check where Solve is, the answer and its format under them", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openSat3(page);
  const solveButton = await boxOf(page, RUN);
  await page.locator("#workbench-mode-verify").click();

  // A dropdown even with one verifier, listing the backend's verifiers, with its info card.
  const menu = page.locator("#workbench-verifier-button");
  await expect(menu).toBeEnabled();
  await expect(page.locator("#workbench-verifier-info-button")).toBeVisible();
  await menu.click();
  const options = page.locator("#workbench-verifier-listbox").getByRole("option");
  expect(await options.count()).toBeGreaterThanOrEqual(1);
  await expect(options.first()).toContainText("Verifier");
  await page.keyboard.press("Escape");

  const tabs = await boxOf(page, "#workbench-tasks");
  const dropdown = await boxOf(page, "#workbench-verifier-button");
  const info = await boxOf(page, "#workbench-verifier-info-button");
  const check = await boxOf(page, RUN);
  await expect(page.locator(RUN)).toHaveText("Check");
  expect(dropdown.x).toBeGreaterThanOrEqual(tabs.x + tabs.width);
  expect(info.x + info.width).toBeLessThanOrEqual(check.x);
  expect(sameLine(dropdown, check)).toBe(true);
  // Check is the main button, the same size Solve is in Solve.
  expect(Math.round(check.height)).toBe(Math.round(solveButton.height));

  // The answer to check, on the row under them, with the verifier's format under it.
  const field = await boxOf(page, "#workbench-verify-certificate");
  expect(field.y).toBeGreaterThan(check.y + check.height);
  await expect(page.getByLabel("Answer to check")).toHaveCount(1);
  await expect(page.locator("#workbench-verify-certificate-hint")).toContainText("Format:");
  await expect(page.locator("#workbench-verify-certificate")).toHaveAttribute(
    "aria-describedby",
    "workbench-verify-certificate-hint",
  );
});

test("the Verifier menu lists every verifier the problem has, and Check uses the one picked", async ({
  page,
}) => {
  // No problem in Redux declares two verifiers yet, so this one gets a second.
  const second = { className: "SAT3ClauseByClauseVerifier", name: "Clause by Clause Verifier" };
  await page.route(/\/api\/redux\/Navigation\/Batch\/allVerifiers/, async (route) => {
    const response = await route.fetch();
    const verifiers = await response.json();
    verifiers.SAT3 = [...verifiers.SAT3, second.className];
    await route.fulfill({ response, json: verifiers });
  });
  await openSat3(page, {
    editInfo: (info) => {
      info[second.className] = {
        verifierName: second.name,
        verifierDefinition: "Checks the clauses one at a time.",
        contributors: [],
      };
    },
  });
  const used = [];
  await page.route(/\/api\/redux\/ProblemProvider\/verify/, (route) => {
    used.push(new URL(route.request().url()).searchParams.get("verifier"));
    return route.fulfill({ json: "True" });
  });
  await page.locator("#workbench-mode-verify").click();
  await page.locator("#workbench-verify-certificate").fill(RUN_CAPTURE.answer);

  // The first is chosen; Check asks it.
  await expect(page.locator("#workbench-verifier-value")).toContainText("3SAT Solution Verifier");
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-result-rows-verdict")).toHaveAttribute("data-tone", "ok");

  // Both are listed by name; picking the second makes Check ask that one.
  await page.locator("#workbench-verifier-button").click();
  const options = page.locator("#workbench-verifier-listbox").getByRole("option");
  await expect(options).toHaveCount(2);
  await expect(options.nth(0)).toContainText("3SAT Solution Verifier");
  await expect(options.nth(1)).toContainText(second.name);
  await options.nth(1).click();
  await expect(page.locator("#workbench-verifier-value")).toContainText(second.name);
  await expect(page.locator("#workbench-result-rows-verdict")).toHaveCount(0);
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-result-rows-verdict")).toContainText(second.name);
  expect(used).toEqual(["SAT3Verifier", second.className]);
});

test("Verify: a passing and a failing answer each get a row in its tone", async ({ page }) => {
  await openSat3(page);
  const verdicts = [];
  await page.route(/\/api\/redux\/ProblemProvider\/verify/, (route) => {
    const body = route.request().postDataJSON();
    verdicts.push(body.certificate);
    return route.fulfill({ json: body.certificate === RUN_CAPTURE.answer ? "True" : "False" });
  });
  await page.locator("#workbench-mode-verify").click();
  const row = page.locator("#workbench-result-rows-verdict");

  await page.locator("#workbench-verify-certificate").fill(RUN_CAPTURE.answer);
  await page.locator(RUN).click();
  await expect(row).toHaveAttribute("data-tone", "ok");
  await expect(row).toContainText("Valid:");
  await expect(row).toContainText("accepts this answer");

  await page.locator("#workbench-verify-certificate").fill("(x1:False,x2:False,x3:False)");
  await expect(row).toHaveCount(0);
  await page.locator(RUN).click();
  await expect(row).toHaveAttribute("data-tone", "err");
  await expect(row).toContainText("Not valid:");
  await expect(row).toContainText("rejects this answer");
  expect(verdicts).toEqual([RUN_CAPTURE.answer, "(x1:False,x2:False,x3:False)"]);
});

test("Check it in Verify round trip: Solve's answer is checked in Verify, and Solve still shows it", async ({
  page,
}) => {
  await openSat3(page);
  const verdicts = [];
  await page.route(/\/api\/redux\/ProblemProvider\/verify/, (route) => {
    verdicts.push(route.request().postDataJSON().certificate);
    return route.fulfill({ json: "True" });
  });
  await solve(page);
  await page.locator("#workbench-result-verify-answer").click();
  await expect(page.locator("#workbench-mode-verify")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#workbench-verify-certificate")).toHaveValue(RUN_CAPTURE.answer);
  await expect(page.locator("#workbench-result-rows-verdict")).toHaveAttribute("data-tone", "ok");
  expect(verdicts).toEqual([RUN_CAPTURE.answer]);
  // The answer and its verdict stay with their tabs.
  await page.locator("#workbench-mode-solve").click();
  await expect(page.locator("#workbench-result-answer")).toHaveText(RUN_CAPTURE.answer);
  await expect(page.locator("#workbench-result-rows-verdict")).toHaveCount(0);
  await page.locator("#workbench-mode-verify").click();
  await expect(page.locator("#workbench-result-rows-verdict")).toHaveAttribute("data-tone", "ok");
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
    await expect(page.locator("header[data-site-banner] img")).toHaveCount(0);
    await expect(page.locator("#site-footer img:visible")).toHaveCount(1);
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

async function openSatReduce(page, { width = 1280, seeded = true } = {}) {
  const asked = [];
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width, height: 1000 });
  await answerViewCertificates(page);
  await page.route(REDUCTION_VIEW_REQUEST, (route) => {
    const url = new URL(route.request().url());
    asked.push(url);
    const seed = url.searchParams.get("seed");
    return route.fulfill({
      json:
        url.searchParams.get("solver") && seeded
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
  await expect(page.locator("#workbench-verify-target")).toHaveCount(0);
  await expect(page.locator(RUN)).toHaveText("Reduce");
  await expect(page.locator("#workbench-result-rows-reduce-next")).toHaveAttribute(
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
  // Verify's two checks and Check both: the Solve stage's menus are gone.
  await expect(page.locator("#workbench-target-solver-button")).toHaveCount(0);
  await expect(page.locator(RUN)).toHaveText("Check both");
  await expect(page.locator("#workbench-verify-target-verifier-button")).toBeVisible();
  await expect(page.locator("#workbench-verify-source-verifier-button")).toBeVisible();

  // The results, tagged by stage in the stepper's order, with the answer mapped back.
  // (This route answers every Solve with a seed, so Solve has its seed row too; the seeded
  // run's certificates come from visualizeRun, which this suite answers 404, so they stay
  // the view's captions.)
  const rows = await page
    .locator("#workbench-result-rows > li")
    .evaluateAll((items) => items.map((item) => [item.id, item.dataset.stage]));
  expect(rows).toEqual([
    ["workbench-result-rows-reduce-done", "reduce"],
    ["workbench-result-rows-solve-answer", "solve"],
    ["workbench-result-rows-solve-mapped", "solve"],
    ["workbench-result-rows-solve-seed", "solve"],
    ["workbench-result-rows-verify-next", "verify"],
  ]);
  await expect(page.locator("#workbench-result-rows-solve-mapped")).toContainText(
    `Mapped back to SAT: ${SAT_TO_3SAT_VIEW.frames.at(-1).caption}`,
  );
  await expect(page.locator("#workbench-result-target-instance")).toHaveText(
    SAT_TO_3SAT_VIEW.target.instance,
  );

  // The stepper goes back to an earlier stage's menus. #303: the build is done, so Reduce says
  // Reduced until the instance changes; a new Reduce then starts again from Solve.
  await stage(page, "reduce").click();
  await expect(stage(page, "reduce")).toHaveAttribute("aria-current", "step");
  await expect(page.locator(RUN)).toHaveText("Reduced");
  await expect(page.locator(RUN)).toHaveAttribute("aria-disabled", "true");
  await touchInstance(page);
  await expect(stage(page, "reduce")).toHaveAttribute("aria-current", "step");
  await expect(page.locator(RUN)).toHaveText("Reduce");
  await page.locator(RUN).click();
  await expect(stage(page, "solve")).toHaveAttribute("aria-current", "step");
  await expect(stage(page, "verify")).toBeDisabled();
  await expect(page.locator("#workbench-result-rows-solve-next")).toBeVisible();
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
  const seedRow = page.locator("#workbench-result-rows-solve-seed");
  await expect(seedRow).toContainText("Seed 31 made this run.");
  await expect(seedRow.locator("button")).toHaveCount(0);

  // #303: that run is done: with its seed in the box, Solve says Solved. Blank, a new run can
  // differ, so it is Solve through 3SAT again; the seed typed in again locks it again.
  const before = asked.length;
  await stage(page, "solve").click();
  await expect(page.locator(RUN)).toHaveText("Solved");
  await expect(page.locator(RUN)).toHaveAttribute("aria-disabled", "true");
  await page.locator("#workbench-seed").fill("");
  await expect(page.locator(RUN)).toHaveText("Solve through 3SAT");
  await expect(page.locator(RUN)).toBeEnabled();
  await page.locator("#workbench-seed").fill("31");
  await expect(page.locator(RUN)).toHaveText("Solved");
  // Another seed is another run.
  await page.locator("#workbench-seed").fill("32");
  await page.locator(RUN).click();
  await expect.poll(() => asked.length).toBe(before + 1);
  await expect(stage(page, "verify")).toHaveAttribute("aria-current", "step");
  expect(asked.at(-1).searchParams.get("seed")).toBe("32");
  await expect(seedRow).toContainText("Seed 32 made this run.");

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
  // #305: that pane's button is the one way out.
  await expect(page.getByRole("button", { name: "Exit full screen", exact: true })).toHaveCount(1);
  await page.locator("#workbench-source-full-screen").click();
  await expect(page.locator("#workbench")).not.toHaveAttribute("data-full-screen", "true");

  // Both pictures with the arrow, and the steps.
  await page.locator("#workbench-full-screen").click();
  await expect(page.locator("#workbench")).toHaveAttribute("data-full-screen-on", "all");
  await expect(page.locator("#workbench-full-title")).toHaveText("SAT → 3SAT");
  await expect(page.locator("#workbench-reduction-source")).toBeVisible();
  await expect(page.locator("#workbench-reduction-target")).toBeVisible();
  await expect(page.locator("#workbench-reduction-panes-arrow")).toBeVisible();
  await expect(page.locator("#workbench-steps-slider")).toBeVisible();
  for (const hidden of hiddenInFull) await expect(page.locator(hidden)).toBeHidden();
  await expect(page.getByRole("button", { name: "Exit full screen", exact: true })).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("#workbench-full-screen")).toBeFocused();
});

test("#305: on a phone every full screen has one Exit full screen button, labelled and on screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const exits = page.getByRole("button", { name: "Exit full screen", exact: true });
  /** Goes in with `id`, finds the one way out on screen, and leaves with it. */
  async function oneWayOut(id) {
    await page.locator(id).click();
    await expect(page.locator("#workbench")).toHaveAttribute("data-full-screen", "true");
    await expect(exits).toHaveCount(1);
    const exit = page.locator(id);
    await expect(exit).toHaveAttribute("aria-label", "Exit full screen");
    await expect(exit).toHaveText("Exit full screen");
    await expect(exit).toBeInViewport();
    const box = await boxOf(page, id);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    await exit.click();
    await expect(page.locator("#workbench")).not.toHaveAttribute("data-full-screen", "true");
  }

  // Solve, then Verify: the one picture.
  await openSat3(page);
  await solve(page);
  await oneWayOut("#workbench-full-screen");
  await page.locator("#workbench-mode-verify").click();
  await oneWayOut("#workbench-full-screen");

  // Reduce: both pictures, then each pane alone.
  await openSatReduce(page, { width: 390 });
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-reduction")).toBeVisible();
  await oneWayOut("#workbench-full-screen");
  await oneWayOut("#workbench-source-full-screen");
  await oneWayOut("#workbench-target-full-screen");
});

test("Reduce's Verify stage checks both answers, prefilled from Solve, and says whether they agree", async ({
  page,
}) => {
  await openSatReduce(page, { seeded: false });
  const calls = [];
  await page.route(/\/api\/redux\/ProblemProvider\/verify/, (route) => {
    const url = new URL(route.request().url());
    const body = route.request().postDataJSON();
    calls.push({ verifier: url.searchParams.get("verifier"), ...body });
    const valid = [VIEW_TARGET_ANSWER, VIEW_MAPPED_ANSWER].includes(body.certificate);
    return route.fulfill({ json: valid ? "True" : "False" });
  });
  await page.locator(RUN).click();
  await expect(stage(page, "solve")).toHaveAttribute("aria-current", "step");
  await page.locator(RUN).click();
  await expect(stage(page, "verify")).toHaveAttribute("aria-current", "step");

  // Each side: its Verifier menu, its answer prefilled from the Solve stage, and Check.
  const targetBox = page.locator("#workbench-verify-target-certificate");
  const sourceBox = page.locator("#workbench-verify-source-certificate");
  await expect(targetBox).toHaveValue(VIEW_TARGET_ANSWER);
  await expect(sourceBox).toHaveValue(VIEW_MAPPED_ANSWER);
  await expect(page.locator("#workbench-verify-target-verifier-info-button")).toBeVisible();
  await expect(page.locator("#workbench-verify-source-verifier-info-button")).toBeVisible();
  await expect(page.locator("#workbench-verify-target-check")).toBeEnabled();
  await expect(page.locator("#workbench-verify-source-check")).toBeEnabled();

  // Check both runs both checks: the target's answer against the built instance, the mapped-back
  // one against this instance, each a Verify row, then the row saying they agree.
  await page.locator(RUN).click();
  const targetRow = page.locator("#workbench-result-rows-verify-target");
  const sourceRow = page.locator("#workbench-result-rows-verify-source");
  const agree = page.locator("#workbench-result-rows-verify-agree");
  await expect(targetRow).toHaveAttribute("data-tone", "ok");
  await expect(sourceRow).toHaveAttribute("data-tone", "ok");
  await expect(agree).toHaveAttribute("data-tone", "ok");
  await expect(agree).toContainText("Both checks pass");
  for (const row of [targetRow, sourceRow, agree]) {
    await expect(row).toHaveAttribute("data-stage", "verify");
  }
  expect(calls).toHaveLength(2);
  const targetCall = calls.find((call) => call.certificate === VIEW_TARGET_ANSWER);
  const sourceCall = calls.find((call) => call.certificate === VIEW_MAPPED_ANSWER);
  expect(targetCall.problemInstance).toBe(SAT_TO_3SAT_VIEW.target.instance);
  expect(sourceCall.problemInstance).toBe(SAT_TO_3SAT_VIEW.source.instance);
  expect(targetCall.verifier).not.toBe(sourceCall.verifier);
  await expect(stage(page, "verify")).toHaveAttribute("data-stage-state", "done");

  // An edited answer is checked as typed, and a failing one makes the checks disagree.
  await sourceBox.fill("(x1:False)");
  await expect(sourceRow).toHaveCount(0);
  await page.locator("#workbench-verify-source-check").click();
  await expect(sourceRow).toHaveAttribute("data-tone", "err");
  await expect(agree).toHaveAttribute("data-tone", "err");
  await expect(agree).toContainText("The checks disagree");

  // Nothing is said twice: the mapped-back answer appears once in the results.
  const results = (await page.locator(RESULTS).textContent()) ?? "";
  expect(results.split(VIEW_MAPPED_ANSWER)).toHaveLength(2);
  expect(results.split(VIEW_TARGET_ANSWER)).toHaveLength(2);
  expect(results).not.toContain("finished in");
  await expect(page.locator("#workbench-result-map")).toHaveCount(0);
});

test("at 390 px the results, in every task, never scroll sideways", async ({ page }) => {
  await openSatReduce(page, { width: 390, seeded: false });
  await page.route(/\/api\/redux\/ProblemProvider\/verify/, (route) =>
    route.fulfill({ json: "True" }),
  );
  await page.locator(RUN).click();
  await expect(stage(page, "solve")).toHaveAttribute("aria-current", "step");
  await page.locator(RUN).click();
  await expect(stage(page, "verify")).toHaveAttribute("aria-current", "step");
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-result-rows-verify-agree")).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  const results = await boxOf(page, RESULTS);
  expect(results.x + results.width).toBeLessThanOrEqual(390);

  await page.locator("#workbench-mode-verify").click();
  await page.locator("#workbench-verify-certificate").fill("(x1:True,x2:False)");
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-result-rows-verdict")).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

// --- #303 follow-ups: Reduce's panes ----------------------------------------------------------

/** Opens 3SAT's Reduce on 0-1 Integer Linear Programming, with Redux's own Reduction View. */
async function openSatToIlp(page, width) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width, height: 1000 });
  await page.route(REDUCTION_VIEW_REQUEST, (route) => route.continue());
  await gotoProblemDetail(page, PROBLEM, { expect });
  await page.locator("#workbench-mode-reduce").click();
  await page.locator("#workbench-target-button").click();
  await page
    .locator("#workbench-target-listbox")
    .getByRole("option")
    .filter({ hasText: /^0-1 Integer Linear Programming/ })
    .first()
    .click();
}

/**
 * The two panes' picture areas, where each picture's zoom box sits in its area, and the
 * picture's card (the area's child): its height and its border.
 */
function pictureAreas(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('[id$="-picture-area"]')].map((area) => {
      const box = area.getBoundingClientRect();
      const zoom = area.querySelector("[data-zoom]")?.getBoundingClientRect() ?? null;
      const card = area.firstElementChild;
      const style = getComputedStyle(card);
      return {
        id: area.id,
        top: box.top,
        height: box.height,
        above: zoom ? zoom.top - box.top : null,
        below: zoom ? box.bottom - zoom.bottom : null,
        card: {
          id: card.id,
          height: card.getBoundingClientRect().height,
          border: style.borderTopWidth,
          borderStyle: style.borderTopStyle,
          borderColor: style.borderTopColor,
          background: style.backgroundColor,
          visible: card.getBoundingClientRect().height > 0 && style.visibility !== "hidden",
        },
      };
    }),
  );
}

/** Both cards are one height, filling their areas, with a hairline border unlike their fill. */
function expectEqualCards(source, target) {
  for (const pane of [source, target]) {
    expect(pane.card.visible).toBe(true);
    expect(Math.abs(pane.card.height - pane.height)).toBeLessThanOrEqual(1);
    expect(pane.card.border).toBe("1px");
    expect(pane.card.borderStyle).toBe("solid");
    expect(pane.card.borderColor).not.toBe(pane.card.background);
  }
  expect(Math.abs(source.card.height - target.card.height)).toBeLessThanOrEqual(1);
}

test("at 1280 px Reduce's two picture areas are the same height, before and after Reduce and on full screen, a shorter picture centered", async ({
  page,
}) => {
  await openSatToIlp(page, 1280);
  let [source, target] = await pictureAreas(page);
  expect(source.id).toBe("workbench-source-picture-area");
  expect(target.id).toBe("workbench-target-picture-area");
  expect(Math.abs(source.height - target.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(source.top - target.top)).toBeLessThanOrEqual(1);
  expect(source.card.id).toBe("workbench-source-picture");
  expect(target.card.id).toBe("workbench-target-picture");
  expectEqualCards(source, target);

  await page.locator(RUN).click();
  const targetZoom = page.locator("#workbench-reduction-target-picture-area [data-zoom]");
  await expect(targetZoom).toBeVisible({ timeout: 20_000 });
  for (const full of [false, true]) {
    if (full) {
      await page.locator("#workbench-full-screen").click();
      await expect(page.locator("#workbench-full-screen")).toHaveAttribute("aria-pressed", "true");
    }
    [source, target] = await pictureAreas(page);
    expect(source.id).toBe("workbench-reduction-source-picture-area");
    expect(Math.abs(source.height - target.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(source.top - target.top)).toBeLessThanOrEqual(1);
    // The cards themselves, which the reader sees, are the same height and framed.
    expect(source.card.id).toBe("workbench-reduction-source");
    expect(target.card.id).toBe("workbench-reduction-target");
    expectEqualCards(source, target);
    // The table is shorter than the clause graph: it sits in the middle of its area (its
    // caption and hint above the zoom box), not at the top.
    expect(target.above).toBeGreaterThan(60);
    expect(target.below).toBeGreaterThan(60);
  }

  // In the dark theme the card's fill is darker than the workspace, so its edge is the fill's
  // edge too: both cards' fills are still one height, framed.
  await page.emulateMedia({ colorScheme: "dark" });
  [source, target] = await pictureAreas(page);
  expectEqualCards(source, target);
  const workspace = await page
    .locator("#workbench")
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(source.card.background).not.toBe(workspace);
  expect(target.card.background).toBe(source.card.background);
});

test("at 800 px Reduce's panes stack, each picture at its own height", async ({ page }) => {
  await openSatToIlp(page, 800);
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-reduction-target-picture-area [data-zoom]")).toBeVisible({
    timeout: 20_000,
  });
  const [source, target] = await pictureAreas(page);
  expect(target.top).toBeGreaterThan(source.top + source.height);
  expect(Math.abs(source.height - target.height)).toBeGreaterThan(50);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test("Reduce's Picture menus are dropdowns naming each picture and its type, never a class name, even with one picture", async ({
  page,
}) => {
  await openSatToIlp(page, 1280);
  const menu = (side) => page.locator(`#workbench-${side}-type-button`);
  const optionsOf = async (side) => {
    await menu(side).click();
    const listbox = page.locator(`#workbench-${side}-type-listbox`);
    await expect(listbox).toBeVisible();
    const texts = await listbox
      .getByRole("option")
      .evaluateAll((options) => options.map((option) => option.innerText.replace(/\s+/g, " ")));
    await page.keyboard.press("Escape");
    await expect(listbox).toBeHidden();
    return texts;
  };
  const noClassNames = (texts) => {
    for (const text of texts) expect(text).not.toMatch(/\b[A-Z][a-z]+[A-Z]\w*Visualization\b/);
  };

  // Before Reduce: the source's menu opens on its one picture, with its type's tag.
  await expect(menu("source")).toBeEnabled();
  let options = await optionsOf("source");
  expect(options).toEqual(["3SAT Visualization Grouped Graph"]);

  // After Reduce, both sides. Redux's catalog lists no picture for 0-1 Integer Linear
  // Programming, so its picture is named after the problem, with the Table tag Redux sent.
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-reduction-target-picture-area [data-zoom]")).toBeVisible({
    timeout: 20_000,
  });
  for (const side of ["source", "target"]) await expect(menu(side)).toBeEnabled();
  await expect(page.locator("#workbench-target-type-value")).toContainText(
    "0-1 Integer Linear Programming Visualization",
  );
  options = await optionsOf("source");
  noClassNames(options);
  expect(options[0]).toBe("3SAT Visualization Grouped Graph");
  options = await optionsOf("target");
  noClassNames(options);
  expect(options).toEqual(["0-1 Integer Linear Programming Visualization Table"]);

  // Picking the picture already drawn asks Redux for nothing.
  let asked = 0;
  page.on("request", (request) => {
    if (REDUCTION_VIEW_REQUEST.test(request.url())) asked += 1;
  });
  await menu("target").click();
  await page.locator("#workbench-target-type-listbox").getByRole("option").first().click();
  await expect(page.locator("#workbench-target-type-listbox")).toBeHidden();
  expect(asked).toBe(0);
  await expect(page.locator("#workbench-reduction-target-picture-area [data-zoom]")).toBeVisible();
});

// --- #303 follow-ups: Board G's order, and what it does not show at the bottom ---------------

const topOf = async (page, selector) => (await boxOf(page, selector)).y;
const bottomOf = async (page, selector) => {
  const box = await boxOf(page, selector);
  return box.y + box.height;
};

test("Solve keeps Board G's order: the picture, the Legend, then the steps, the step's caption on their Step N of M line", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openSat3(page);
  await solve(page);
  const caption = page.locator("#workbench-step-text [aria-live]");
  await expect(caption).toHaveCount(1);
  await expect(caption).toContainText("Verdict:");
  expect(await topOf(page, "#workbench-legend-toggle")).toBeGreaterThan(
    await bottomOf(page, "#workbench-source-picture"),
  );
  expect(await topOf(page, "#workbench-steps-slider")).toBeGreaterThan(
    await bottomOf(page, "#workbench-legend-body"),
  );
  // #303: the caption is on the step bar's last line, after "Step N of M:".
  await expect(page.locator("#workbench-steps-bar #workbench-step-text")).toBeVisible();
  expect(await topOf(page, "#workbench-steps-line")).toBeGreaterThan(
    await bottomOf(page, "#workbench-steps-slider"),
  );
  expect(await topOf(page, "#workbench-command-bar")).toBeGreaterThan(
    await bottomOf(page, "#workbench-steps-bar"),
  );
});

test("the step bar is the mockup's: five buttons, the slider, Speed, and one Step N of M: line", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openSat3(page);
  await solve(page);
  const bar = page.locator("#workbench-steps-bar");
  const buttons = bar.locator("#workbench-steps-buttons button");
  expect(await buttons.evaluateAll((all) => all.map((b) => b.getAttribute("aria-label")))).toEqual([
    "First step",
    "Previous step",
    "Play",
    "Next step",
    "Last step",
  ]);
  await expect(bar.getByRole("slider", { name: "Step" })).toBeVisible();
  await expect(bar.locator("#workbench-steps-speed-label")).toHaveText("Speed");
  const position = page.locator("#workbench-steps-position");
  const total = Number(/of (\d+)/.exec(await position.textContent())[1]);
  expect(total).toBeGreaterThan(2);
  const at = async (n) => expect(position).toHaveText(`Step ${n} of ${total}`);
  const first = page.locator("#workbench-steps-first");
  const previous = page.locator("#workbench-steps-previous");
  const next = page.locator("#workbench-steps-next");
  const last = page.locator("#workbench-steps-last");

  // A solve opens on its last step: Next and Last are off there.
  await at(total);
  await expect(next).toBeDisabled();
  await expect(last).toBeDisabled();
  // First jumps to step 1, where First and Previous are off.
  await first.click();
  await at(1);
  await expect(first).toBeDisabled();
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  // Next and Previous move one step; Last jumps to the end.
  await next.click();
  await at(2);
  await next.click();
  await at(3);
  await previous.click();
  await at(2);
  await last.click();
  await at(total);

  // One line: "Step N of M:" in bold, then the step's description.
  const line = page.locator("#workbench-steps-line");
  await expect(line).toHaveAttribute("aria-live", "polite");
  await expect(line).toContainText(new RegExp(`^Step ${total} of ${total}:\\s*\\S`));
  await expect(line.locator("strong")).toHaveText(`Step ${total} of ${total}:`);
  await expect(line.locator("#workbench-step-text")).toContainText("Verdict:");
  // One box in the well, with a hairline border, every button a 44px target.
  const style = await bar.evaluate((element) => {
    const css = getComputedStyle(element);
    return { border: css.borderTopWidth, radius: css.borderTopLeftRadius };
  });
  expect(style).toEqual({ border: "1px", radius: "12px" });
  for (const id of ["first", "previous", "play-pause", "next", "last"]) {
    const box = await boxOf(page, `#workbench-steps-${id}`);
    expect(box.height).toBeGreaterThanOrEqual(40);
    const hit = await page.locator(`#workbench-steps-${id}`).evaluate((element) => {
      const before = getComputedStyle(element, "::before");
      return element.getBoundingClientRect().height - 2 * Number.parseFloat(before.top);
    });
    expect(hit).toBeGreaterThanOrEqual(44);
  }
});

test("on a phone the step bar wraps with no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSat3(page);
  await solve(page);
  await page.locator("#workbench-steps-first").click();
  await page.locator("#workbench-steps-next").click();
  for (const id of ["bar", "last", "slider", "speed", "line"]) {
    const box = await boxOf(page, `#workbench-steps-${id}`);
    expect(box.x + box.width, id).toBeLessThanOrEqual(390);
  }
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

test("Reduce keeps Board G's order, the phases above the steps, and the Gadgets switch and its link line wait in a closed section at the bottom", async ({
  page,
}) => {
  await openSatReduce(page);
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-reduction")).toBeVisible();

  // Under the pictures: the Legend, the phases, the steps and the caption; nothing of the
  // Gadgets.
  const pane = page.locator("#workbench-pane");
  for (const piece of ["marks-row", "link"]) {
    await expect(pane.locator(`#workbench-reduction-${piece}`)).toHaveCount(0);
  }
  expect(await topOf(page, "#workbench-legend-toggle")).toBeGreaterThan(
    await bottomOf(page, "#workbench-reduction-panes"),
  );
  // The phases, always shown, sit right above the step controls; no Phases section is left.
  await expect(pane.locator("#workbench-phases")).toBeVisible();
  await expect(page.locator("#workbench-result-phases")).toHaveCount(0);
  expect(await topOf(page, "#workbench-phases")).toBeGreaterThan(
    await bottomOf(page, "#workbench-legend-body"),
  );
  expect(await topOf(page, "#workbench-steps-slider")).toBeGreaterThan(
    await bottomOf(page, "#workbench-phases"),
  );
  await expect(page.locator("#workbench-step-text #workbench-reduction-caption")).toBeVisible();

  // At the bottom, under the results: Gadgets (n), closed.
  const gadgets = page.locator("#workbench-result-gadgets");
  await expect(page.locator("#workbench-result-gadgets-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.locator("#workbench-result-gadgets-count")).toHaveText(
    `(${SAT_TO_3SAT_VIEW.gadgets.length})`,
  );
  expect(await topOf(page, "#workbench-result-gadgets")).toBeGreaterThan(
    await bottomOf(page, "#workbench-result-rows"),
  );

  // Opened, Gadgets starts with the Plain / Color switch and the link line, which still work:
  // pointing at a source piece says what it became, and Color marks both sides.
  await page.locator("#workbench-result-gadgets-toggle").click();
  await expect(gadgets.locator("#workbench-reduction-marks-row")).toBeVisible();
  const link = gadgets.locator("#workbench-reduction-link");
  await expect(link).toContainText("Point at a piece");
  await page.locator("#workbench-reduction-source [data-node-id]").first().hover();
  await expect(link).toHaveAttribute("data-linked", "true");
  await page.locator("#workbench-reduction-marks-color").click();
  await expect(page.locator("#workbench-reduction-marks-row")).toHaveAttribute(
    "data-gadget-marks",
    "color",
  );
  await page.locator("#workbench-reduction-marks-plain").click();

  // The phase buttons are 44px targets, the step's phase marked.
  const build = pane.locator("#workbench-phases-build");
  expect((await boxOf(page, "#workbench-phases-build")).height).toBeGreaterThanOrEqual(44);
  await expect(build).toHaveAttribute("aria-current", "step");
});

test("the marked phase follows the step as it moves, and a phase button jumps to its phase", async ({
  page,
}) => {
  await openSatReduce(page);
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-reduction")).toBeVisible();
  // Solve through 3SAT, so every phase has steps.
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-phases-map")).toBeEnabled();
  const bar = page.locator("#workbench-phases");
  const marked = bar.locator('[aria-current="step"]');
  const firstOf = (phase) => SAT_TO_3SAT_VIEW.frames.findIndex((frame) => frame.phase === phase);

  // A phase button jumps to its phase's first step, and is the one marked.
  await page.locator("#workbench-phases-build").click();
  await expect(marked).toHaveCount(1);
  await expect(marked).toHaveAttribute("data-phase", "build");
  await expect(bar).toHaveAttribute("data-current-phase", "build");
  await expect(page.locator("#workbench-steps-position")).toContainText("Step 1 of");
  // Stepping forward across Build's end moves the mark to Solve, and back moves it back.
  for (let step = 0; step < firstOf("solve"); step += 1) {
    await page.locator("#workbench-steps-next").click();
  }
  await expect(marked).toHaveAttribute("data-phase", "solve");
  await page.locator("#workbench-steps-previous").click();
  await expect(marked).toHaveAttribute("data-phase", "build");
  // Scrubbing to the end marks Map back.
  await page.locator("#workbench-steps-slider input").focus();
  await page.keyboard.press("End");
  await expect(marked).toHaveAttribute("data-phase", "map");
  // The marked phase looks different from the others (its fill), not by aria alone.
  const fill = (id) =>
    page.locator(id).evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(await fill("#workbench-phases-map")).not.toBe(await fill("#workbench-phases-build"));
});

test("on a phone the phases wrap above the steps, with no sideways scroll", async ({ page }) => {
  await openSatReduce(page, { width: 390 });
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-reduction")).toBeVisible();
  await expect(page.locator("#workbench-phases")).toBeVisible();
  for (const phase of ["build", "solve", "map"]) {
    const box = await boxOf(page, `#workbench-phases-${phase}`);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(await topOf(page, "#workbench-steps-slider")).toBeGreaterThan(
    await bottomOf(page, "#workbench-phases"),
  );
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

// --- #303: a done button is inactive until an input changes --------------------------------------
// The owner's rule: a button that is enabled but can't change the result is disabled; one that
// can (a randomized solver with the Seed box blank) stays enabled. A done button says what is
// done, is aria-disabled (still focusable, described), and its clicks do nothing.

const BACKTRACKING = SAT3_BACKTRACKING_ONE_RUN.solverName;

/** Counts the requests matching `pattern` from now on. */
function countRequests(page, pattern) {
  const counter = { count: 0 };
  page.on("request", (request) => {
    if (pattern.test(request.url())) counter.count += 1;
  });
  return counter;
}

async function expectDone(locator, label, description) {
  await expect(locator).toHaveText(label);
  await expect(locator).toHaveAttribute("aria-disabled", "true");
  // Still focusable and explained: not the disabled attribute.
  await expect(locator).not.toHaveAttribute("disabled");
  await expect(locator).toHaveAccessibleDescription(description);
  await locator.focus();
  await expect(locator).toBeFocused();
}

async function expectAction(locator, label) {
  await expect(locator).toHaveText(label);
  await expect(locator).not.toHaveAttribute("aria-disabled");
  await expect(locator).toBeEnabled();
}

test("Solve says Solved once done, and is Solve again after an instance edit or another Algorithm", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openSat3(page);
  await selectSolverByName(page, BACKTRACKING, { expect });
  const runs = countRequests(page, RUN_REQUEST);
  await expectAction(page.locator(RUN), "Solve");
  await solve(page);
  await expectDone(
    page.locator(RUN),
    "Solved",
    /Change the instance or the Algorithm to solve again/,
  );
  // A click, or Enter on the focused button, asks for nothing.
  await page.locator(RUN).click({ force: true });
  await page.keyboard.press("Enter");
  expect(runs.count).toBe(1);

  // An instance edit (the result's "instance changed" row) makes Solve an action again.
  await touchInstance(page);
  await expect(page.locator("#workbench-result-changed")).toBeVisible();
  await expectAction(page.locator(RUN), "Solve");
  await solve(page);
  await expect(page.locator(RUN)).toHaveText("Solved");
  expect(runs.count).toBe(2);

  // Another Algorithm, even with the run's reported seed typed in, is another run.
  await selectSolverByName(page, SAT3_PPZ_ONE_RUN.solverName, { expect });
  await page.locator("#workbench-seed").fill(String(SEED));
  await expectAction(page.locator(RUN), "Solve");
  // Back to the Algorithm that ran: its result is still the one on screen, so it is done.
  await selectSolverByName(page, BACKTRACKING, { expect });
  await expect(page.locator(RUN)).toHaveText("Solved");
});

test("a randomized solver stays Solve with the Seed box blank, and locks once a typed seed has run", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openSat3(page);
  const runs = countRequests(page, RUN_REQUEST);
  // PPZ declares Stochastic: blank, every run picks a new seed, so Solve can change the result.
  await solve(page);
  await expectAction(page.locator(RUN), "Solve");
  await page.locator(RUN).click();
  await expect.poll(() => runs.count).toBe(2);
  await expectAction(page.locator(RUN), "Solve");

  // A typed seed repeats its run exactly: done once it ran, until the seed changes.
  await page.locator("#workbench-seed").fill("77");
  await expectAction(page.locator(RUN), "Solve");
  await page.locator(RUN).click();
  await expect.poll(() => runs.count).toBe(3);
  await expectDone(
    page.locator(RUN),
    "Solved",
    /Change the instance, the Algorithm or the Seed to solve again/,
  );
  await page.locator("#workbench-seed").fill("78");
  await expectAction(page.locator(RUN), "Solve");
  await page.locator("#workbench-seed").fill("");
  await expectAction(page.locator(RUN), "Solve");
});

test("Verify's Check says Checked once done, and is Check again when the answer is edited", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await openSat3(page);
  const checks = [];
  await page.route(/\/api\/redux\/ProblemProvider\/verify/, (route) => {
    const body = route.request().postDataJSON();
    checks.push(body.certificate);
    return route.fulfill({ json: body.certificate === RUN_CAPTURE.answer ? "True" : "False" });
  });
  await page.locator("#workbench-mode-verify").click();
  const box = page.locator("#workbench-verify-certificate");
  await box.fill(RUN_CAPTURE.answer);
  await expectAction(page.locator(RUN), "Check");
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-result-rows-verdict")).toHaveAttribute("data-tone", "ok");
  await expectDone(
    page.locator(RUN),
    "Checked",
    /Change the answer, the verifier or the instance to check again/,
  );
  await page.locator(RUN).click({ force: true });
  expect(checks).toHaveLength(1);

  await box.fill("(x1:False,x2:False,x3:False)");
  await expectAction(page.locator(RUN), "Check");
  await page.locator(RUN).click();
  await expect(page.locator(RUN)).toHaveText("Checked");
  expect(checks).toHaveLength(2);
  // Another instance retires the verdict, and Check is an action again.
  await touchInstance(page);
  await expectAction(page.locator(RUN), "Check");
});

test("Reduce's stages say Reduced, Solved and Checked once done, and are their actions again after an instance edit", async ({
  page,
}) => {
  await openSatReduce(page, { seeded: false });
  await page.route(/\/api\/redux\/ProblemProvider\/verify/, (route) => {
    const body = route.request().postDataJSON();
    const valid = [VIEW_TARGET_ANSWER, VIEW_MAPPED_ANSWER].includes(body.certificate);
    return route.fulfill({ json: valid ? "True" : "False" });
  });
  await page.locator(RUN).click();
  await expect(stage(page, "solve")).toHaveAttribute("aria-current", "step");
  await stage(page, "reduce").click();
  await expectDone(
    page.locator(RUN),
    "Reduced",
    /Change the instance, Reduce to or the Reduction to build again/,
  );

  await stage(page, "solve").click();
  await expectAction(page.locator(RUN), "Solve through 3SAT");
  await page.locator(RUN).click();
  await expect(stage(page, "verify")).toHaveAttribute("aria-current", "step");
  await stage(page, "solve").click();
  await expectDone(page.locator(RUN), "Solved", /Change the instance or the Algorithm/);

  // Verify: Check both checks both sides; then each side's Check and Check both are done.
  await stage(page, "verify").click();
  const targetCheck = page.locator("#workbench-verify-target-check");
  const sourceCheck = page.locator("#workbench-verify-source-check");
  await expectAction(page.locator(RUN), "Check both");
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-result-rows-verify-agree")).toHaveAttribute(
    "data-tone",
    "ok",
  );
  await expectDone(page.locator(RUN), "Checked", /check again/);
  await expectDone(targetCheck, "Checked", /Change the 3SAT answer, the verifier/);
  await expectDone(sourceCheck, "Checked", /Change the SAT answer, the verifier/);

  // An edited answer makes its own side's Check, and Check both, actions again.
  await page.locator("#workbench-verify-source-certificate").fill("(x1:False)");
  await expectAction(sourceCheck, "Check");
  await expect(targetCheck).toHaveText("Checked");
  await expectAction(page.locator(RUN), "Check both");

  // An instance edit undoes the build: the stepper is back on Reduce, an action again.
  await touchInstance(page);
  await expect(stage(page, "reduce")).toHaveAttribute("aria-current", "step");
  await expectAction(page.locator(RUN), "Reduce");
});
