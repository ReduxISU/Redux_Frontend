// tests/e2e/run-seed.spec.js
//
// #295 (ReduxISU/Redux#932): a randomized solver's run reports the seed it ran with, and the
// Execute pane shows it with the result ("Seed: 4242") with Run again with this seed, which asks
// for the same run with `seed` set. A plain Solve sends no seed, so Redux picks a new one each
// time. Nothing shows when the run reports no seed (a solver that isn't randomized, or a backend
// older than #932), and the seed goes once the instance or the solver changes. In Reduce mode the
// Solve via reduction step's Reduction View carries the seed the same way, and Solve directly
// shows Solve's. Solve's answer line is the run's own answer (visualizeRun's `answer`), so it is
// the run the steps show, and Solve asks once; ProblemProvider/solve answers only without one (no
// visualizeRun, or a run that timed out).
//
// CI's backend has no seeds yet, so every compute request is answered here: the 3SAT runs from
// tests/e2e/run-payloads.js and the Reduction View from tests/e2e/reduction-payloads.js, each
// with a seed added. The catalog comes from the real backend.

import { expect, test } from "./fixtures";
import {
  chooseReduceTarget,
  gotoProblemDetail,
  selectSolverByName,
  showPane,
  startWithPanesExpanded,
} from "./helpers";
import { SAT3_TO_CLIQUE_VIEW } from "./reduction-payloads";
import { SAT3_BACKTRACKING_ONE_RUN, SAT3_PPZ_ONE_RUN } from "./run-payloads";

test.beforeEach(async ({ page }) => {
  await startWithPanesExpanded(page);
});

const PROBLEM = "3SAT";
const SEED = 4242;
const RUN_REQUEST = /\/api\/redux\/ProblemProvider\/visualizeRun\?/;
const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve\?/;
const REDUCTION_VIEW_REQUEST = /\/api\/redux\/ProblemProvider\/reductionView\?/;

const SEED_LINE = "#workbench-result-seed";
const RERUN = `${SEED_LINE}-rerun`;

/**
 * Answers the 3SAT compute requests: visualizeRun with `run` (its seed, when it has one, is the
 * one asked for, else `seed`), the default picture from the backtracking capture, and solve with
 * the run's answer. Returns the `seed` parameter of every visualizeRun asked for (null: none).
 */
async function answerSat3(page, run, seed) {
  const seeds = [];
  await page.route(RUN_REQUEST, (route) => {
    const asked = new URL(route.request().url()).searchParams.get("seed");
    seeds.push(asked);
    const json = seed === null ? run : { ...run, seed: asked === null ? seed : Number(asked) };
    return route.fulfill({ json });
  });
  await page.route(VISUALIZE_REQUEST, (route) => {
    const visualization = new URL(route.request().url()).searchParams.get("visualization");
    const picture =
      SAT3_BACKTRACKING_ONE_RUN.pictures.find((entry) => entry.visualization === visualization) ??
      SAT3_BACKTRACKING_ONE_RUN.pictures[0];
    return route.fulfill({
      json: { type: picture.type, payload: picture.payload, frames: picture.frames },
    });
  });
  await page.route(SOLVE_REQUEST, (route) => route.fulfill({ json: run.answer }));
  return seeds;
}

async function openSat3(page, run, seed, solverName) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const seeds = await answerSat3(page, run, seed);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await selectSolverByName(page, solverName, { expect });
  return seeds;
}

test("a randomized solver's run shows its seed, and Run again with this seed asks for that seed", async ({
  page,
}) => {
  const seeds = await openSat3(page, SAT3_PPZ_ONE_RUN, SEED, SAT3_PPZ_ONE_RUN.solverName);
  await expect(page.locator(SEED_LINE)).toHaveCount(0);

  // A plain Solve sends no seed; Redux picks one and says which.
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-result-answer")).toHaveText(SAT3_PPZ_ONE_RUN.answer);
  await expect(page.locator(SEED_LINE)).toHaveText(`Seed: ${SEED}`);
  await expect(page.locator(`${SEED_LINE}-value`)).toHaveText(String(SEED));
  await expect(page.locator(RERUN)).toHaveText("Run again with this seed");
  await expect(page.locator(RERUN)).toBeEnabled();
  expect(seeds).toEqual([null]);

  // Run again with this seed asks for the same run.
  await page.locator(RERUN).click();
  await expect.poll(() => seeds.length).toBe(2);
  expect(seeds[1]).toBe(String(SEED));
  await expect(page.locator(SEED_LINE)).toHaveText(`Seed: ${SEED}`);

  // Solve again picks a new seed: it sends none.
  await page.locator("#workbench-run").click();
  await expect.poll(() => seeds.length).toBe(3);
  expect(seeds[2]).toBeNull();
  await expect(page.locator(SEED_LINE)).toBeVisible();

  // Another solver, and the seed (which was that solver's) goes.
  await selectSolverByName(page, SAT3_BACKTRACKING_ONE_RUN.solverName, { expect });
  await expect(page.locator(SEED_LINE)).toHaveCount(0);
  await selectSolverByName(page, SAT3_PPZ_ONE_RUN.solverName, { expect });
  await expect(page.locator(SEED_LINE)).toBeVisible();

  // Another instance, and the seed goes with the rest of the result.
  await showPane(page, "instance", { expect });
  await page.locator("#workbench-instance-full-instance").fill("(x1 | x2 | x3)");
  await expect(page.locator(SEED_LINE)).toHaveCount(0);
  await expect(page.locator(RERUN)).toHaveCount(0);
});

test("a run that reports no seed shows neither the seed nor Run again with this seed", async ({
  page,
}) => {
  const seeds = await openSat3(page, SAT3_PPZ_ONE_RUN, null, SAT3_PPZ_ONE_RUN.solverName);
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-result-answer")).toHaveText(SAT3_PPZ_ONE_RUN.answer);
  await expect(page.locator(SEED_LINE)).toHaveCount(0);
  await expect(page.locator(RERUN)).toHaveCount(0);
  expect(seeds).toEqual([null]);
});

test("in Reduce mode, Solve via reduction and Solve directly show their run's seed, and rerun with it", async ({
  page,
}) => {
  const view = SAT3_TO_CLIQUE_VIEW;
  await page.emulateMedia({ reducedMotion: "reduce" });
  const viewSeeds = [];
  await page.route(REDUCTION_VIEW_REQUEST, (route) => {
    const url = new URL(route.request().url());
    const asked = url.searchParams.get("seed");
    // The build (no solver) reports no seed; the solve phase reports the one it ran with.
    if (!url.searchParams.get("solver")) return route.fulfill({ json: view });
    viewSeeds.push(asked);
    return route.fulfill({ json: { ...view, seed: asked === null ? SEED : Number(asked) } });
  });
  await page.route(SOLVE_REQUEST, (route) => route.fulfill({ json: "{}" }));
  await page.route(RUN_REQUEST, (route) => {
    const asked = new URL(route.request().url()).searchParams.get("seed");
    return route.fulfill({
      json: { ...SAT3_PPZ_ONE_RUN, seed: asked === null ? SEED + 1 : Number(asked) },
    });
  });
  await page.goto(
    `/${encodeURIComponent(PROBLEM)}?instance=${encodeURIComponent(view.source.instance)}`,
  );
  await expect(page.getByRole("heading", { level: 1, name: PROBLEM })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator("#workbench-mode-reduce").click();
  await chooseReduceTarget(page, /^Clique$/, { expect });
  await showPane(page, "execute", { expect });

  const chainSeed = "#workbench-chain-solve-result-seed";
  await page.locator("#workbench-chain-run").click();
  await expect(page.locator("#workbench-chain-run-chip")).toHaveText(/^No answer found/);
  await expect(page.locator(chainSeed)).toHaveText(`Seed: ${SEED}`);
  expect(viewSeeds).toEqual([null]);
  await page.locator(`${chainSeed}-rerun`).click();
  await expect.poll(() => viewSeeds.length).toBe(2);
  expect(viewSeeds[1]).toBe(String(SEED));
  await expect(page.locator(chainSeed)).toHaveText(`Seed: ${SEED}`);

  // Solve directly is Solve mode's run, with its seed.
  await page.locator("#workbench-source-cell-run").click();
  await expect(page.locator("#workbench-source-cell-result-seed")).toHaveText(`Seed: ${SEED + 1}`);
});

/** Answers visualizeRun with `run` (or `status`), and solve with OTHER; counts the solves. */
async function answerWithOtherSolve(page, { run = SAT3_PPZ_ONE_RUN, status = null } = {}) {
  const asked = { runs: 0, solves: 0 };
  await page.route(RUN_REQUEST, (route) => {
    asked.runs += 1;
    if (status) return route.fulfill({ status, json: { error: "missing" } });
    return route.fulfill({ json: run });
  });
  await page.route(VISUALIZE_REQUEST, (route) => {
    const visualization = new URL(route.request().url()).searchParams.get("visualization");
    const picture =
      SAT3_PPZ_ONE_RUN.pictures.find((entry) => entry.visualization === visualization) ??
      SAT3_PPZ_ONE_RUN.pictures[0];
    return route.fulfill({
      json: { type: picture.type, payload: picture.payload, frames: picture.frames },
    });
  });
  await page.route(SOLVE_REQUEST, (route) => {
    asked.solves += 1;
    return route.fulfill({ json: OTHER_ANSWER });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gotoProblemDetail(page, PROBLEM, { expect });
  await selectSolverByName(page, SAT3_PPZ_ONE_RUN.solverName, { expect });
  return asked;
}

// A different answer than the run's, as a second draw of a randomized solver could give.
const OTHER_ANSWER = "(x1:False,x2:True,x3:True)";

test("Solve's answer is the run's own answer, so it matches the steps, and Solve asks only once", async ({
  page,
}) => {
  const asked = await answerWithOtherSolve(page);
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-result-answer")).toHaveText(SAT3_PPZ_ONE_RUN.answer);
  await expect(page.locator("#workbench-result-verdict")).toHaveText("Answer found");
  expect(asked).toEqual({ runs: 1, solves: 0 });
  // Check it checks that answer.
  await page.locator("#workbench-result-verify-answer").click();
  await expect(page.locator("#workbench-verify-source-certificate")).toHaveValue(
    SAT3_PPZ_ONE_RUN.answer,
  );
});

test("a backend without visualizeRun gets the answer from solve", async ({ page }) => {
  const asked = await answerWithOtherSolve(page, { status: 404 });
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-result-answer")).toHaveText(OTHER_ANSWER);
  expect(asked.solves).toBe(1);
});

test("a run that timed out gets its answer from solve", async ({ page }) => {
  const asked = await answerWithOtherSolve(page, {
    run: { ...SAT3_PPZ_ONE_RUN, timedOut: true, answer: null },
  });
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-result-answer")).toHaveText(OTHER_ANSWER);
  expect(asked).toEqual({ runs: 1, solves: 1 });
});
