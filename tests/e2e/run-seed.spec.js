// tests/e2e/run-seed.spec.js
//
// #295 (ReduxISU/Redux#932): a randomized solver's run reports the seed it ran with, and the
// Result panel shows it with the answer ("Seed: 4242") with Run again with this seed, which asks
// for the same run with `seed` set and puts the seed in the command bar's Seed box. The Seed box
// shows only for a randomized solver (one declaring the "Stochastic" type), between the Solver
// dropdown's info button and Run: blank sends no seed, so Redux picks a new one each time, and a
// number is sent as `seed`. Nothing shows when the run reports no seed (a solver that isn't
// randomized, or a backend older than #932), and the seed goes once the instance or the solver
// changes. Solve's answer is the run's own answer (visualizeRun's `answer`), so it is the run the
// steps show, and Run asks once; ProblemProvider/solve answers only without one (no
// visualizeRun, or a run that timed out). Solve mode only: Reduce mode sends no seed yet.
//
// CI's backend has no seeds yet, so every compute request is answered here from the 3SAT runs
// in tests/e2e/run-payloads.js, with a seed added. The catalog comes from the real backend;
// allInfo is only edited so PPZ declares "Stochastic" and the backtracking solver doesn't,
// whatever the backend says.

import { expect, test } from "./fixtures";
import { gotoProblemDetail, openPanel, selectSolverByName } from "./helpers";
import { SAT3_BACKTRACKING_ONE_RUN, SAT3_PPZ_ONE_RUN } from "./run-payloads";

const PROBLEM = "3SAT";
const SEED = 4242;
const RUN_REQUEST = /\/api\/redux\/ProblemProvider\/visualizeRun\?/;
const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve\?/;
const ALL_INFO_REQUEST = /\/api\/redux\/Navigation\/Batch\/allInfo/;

const SEED_LINE = "#workbench-result-seed";
const RERUN = `${SEED_LINE}-rerun`;
const SEED_INPUT = "#workbench-seed";
const RUN = "#workbench-run";

/** Makes PPZ randomized and the backtracking solver not, in allInfo's answer. */
async function pinSolverTypes(page) {
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
}

/** Answers the default picture (and a one-picture Run) from `run`'s capture. */
async function answerPictures(page, run) {
  await page.route(VISUALIZE_REQUEST, (route) => {
    const visualization = new URL(route.request().url()).searchParams.get("visualization");
    const picture =
      run.pictures.find((entry) => entry.visualization === visualization) ?? run.pictures[0];
    return route.fulfill({
      json: { type: picture.type, payload: picture.payload, frames: picture.frames },
    });
  });
}

/**
 * Answers the 3SAT compute requests: visualizeRun with `run` (its seed, when it has one, is the
 * one asked for, else `seed`), the default picture from the capture, and solve with the run's
 * answer. Returns the `seed` parameter of every visualizeRun asked for (null: none).
 */
async function answerSat3(page, run, seed) {
  const seeds = [];
  await page.route(RUN_REQUEST, (route) => {
    const asked = new URL(route.request().url()).searchParams.get("seed");
    seeds.push(asked);
    const json = seed === null ? run : { ...run, seed: asked === null ? seed : Number(asked) };
    return route.fulfill({ json });
  });
  await answerPictures(page, SAT3_BACKTRACKING_ONE_RUN);
  await page.route(SOLVE_REQUEST, (route) => route.fulfill({ json: run.answer }));
  return seeds;
}

async function openSat3(page, run, seed, solverName) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await pinSolverTypes(page);
  const seeds = await answerSat3(page, run, seed);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await selectSolverByName(page, solverName, { expect });
  return seeds;
}

test("a randomized solver's run shows its seed, and Run again with this seed asks for that seed", async ({
  page,
}) => {
  const seeds = await openSat3(page, SAT3_PPZ_ONE_RUN, SEED, SAT3_PPZ_ONE_RUN.solverName);
  await openPanel(page, "result", { expect });
  await expect(page.locator(SEED_LINE)).toHaveCount(0);

  // A plain Run sends no seed; Redux picks one and says which.
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-result-answer")).toHaveText(SAT3_PPZ_ONE_RUN.answer);
  await expect(page.locator(SEED_LINE)).toHaveText(`Seed: ${SEED}`);
  await expect(page.locator(`${SEED_LINE}-value`)).toHaveText(String(SEED));
  await expect(page.locator(RERUN)).toHaveText("Run again with this seed");
  await expect(page.locator(RERUN)).toBeEnabled();
  expect(seeds).toEqual([null]);

  // Run again with this seed asks for the same run, and puts the seed in the Seed box.
  await page.locator(RERUN).click();
  await expect.poll(() => seeds.length).toBe(2);
  expect(seeds[1]).toBe(String(SEED));
  await expect(page.locator(SEED_INPUT)).toHaveValue(String(SEED));
  await expect(page.locator(SEED_LINE)).toHaveText(`Seed: ${SEED}`);

  // With the box cleared, Run picks a new seed again: it sends none.
  await page.locator(SEED_INPUT).fill("");
  await page.locator(RUN).click();
  await expect.poll(() => seeds.length).toBe(3);
  expect(seeds[2]).toBeNull();
  await expect(page.locator(SEED_LINE)).toBeVisible();

  // Another solver, and the seed (which was that solver's) goes.
  await selectSolverByName(page, SAT3_BACKTRACKING_ONE_RUN.solverName, { expect });
  await expect(page.locator(SEED_LINE)).toHaveCount(0);
  await selectSolverByName(page, SAT3_PPZ_ONE_RUN.solverName, { expect });
  await expect(page.locator(SEED_LINE)).toBeVisible();

  // Another instance, and the seed goes with the rest of the result.
  await openPanel(page, "instance", { expect });
  await page.locator("#workbench-instance-full-instance").fill("(x1 | x2 | x3)");
  await openPanel(page, "result", { expect });
  await expect(page.locator(SEED_LINE)).toHaveCount(0);
  await expect(page.locator(RERUN)).toHaveCount(0);
});

test("a run that reports no seed shows neither the seed nor Run again with this seed", async ({
  page,
}) => {
  const seeds = await openSat3(page, SAT3_PPZ_ONE_RUN, null, SAT3_PPZ_ONE_RUN.solverName);
  await page.locator(RUN).click();
  await openPanel(page, "result", { expect });
  await expect(page.locator("#workbench-result-answer")).toHaveText(SAT3_PPZ_ONE_RUN.answer);
  await expect(page.locator(SEED_LINE)).toHaveCount(0);
  await expect(page.locator(RERUN)).toHaveCount(0);
  expect(seeds).toEqual([null]);
});

test("the Seed box is hidden for a solver that isn't randomized", async ({ page }) => {
  await openSat3(page, SAT3_BACKTRACKING_ONE_RUN, null, SAT3_BACKTRACKING_ONE_RUN.solverName);
  await expect(page.locator(RUN)).toBeVisible();
  await expect(page.locator(SEED_INPUT)).toHaveCount(0);
});

test("the Seed box shows for a randomized solver, between the info button and Run", async ({
  page,
}) => {
  // Wide enough that the Solver dropdown, the Seed box and Run share one row; narrower, Run
  // wraps onto its own line, still after the Seed box.
  await page.setViewportSize({ width: 1600, height: 900 });
  await openSat3(page, SAT3_PPZ_ONE_RUN, SEED, SAT3_PPZ_ONE_RUN.solverName);
  const input = page.locator(SEED_INPUT);
  await expect(input).toBeVisible();
  await expect(input).toHaveAttribute("placeholder", "Random");
  await expect(input).toHaveAttribute("inputmode", "numeric");
  await expect(page.getByLabel("Seed", { exact: true })).toHaveCount(1);
  await expect(page.locator(`${SEED_INPUT}-hint`)).toHaveText(
    "Leave blank for a new random run; a number repeats that run exactly.",
  );
  await expect(input).toHaveAttribute("aria-describedby", "workbench-seed-hint");

  const info = await page.locator("#workbench-solver-info-button").boundingBox();
  const seed = await input.boundingBox();
  const run = await page.locator(RUN).boundingBox();
  expect(seed.x).toBeGreaterThanOrEqual(info.x + info.width);
  expect(seed.x + seed.width).toBeLessThanOrEqual(run.x);
  expect(seed.width).toBeGreaterThanOrEqual(120);
  expect(seed.width).toBeLessThanOrEqual(140);
  expect(Math.round(seed.height)).toBe(Math.round(run.height));

  // Digits only.
  await input.fill("12a3");
  await expect(input).toHaveValue("123");

  // Another mode, and it goes; back to Solve, and it keeps its text.
  await page.locator("#workbench-mode-reduce").click();
  await expect(input).toHaveCount(0);
  await page.locator("#workbench-mode-solve").click();
  await expect(input).toHaveValue("123");
});

test("a typed seed is sent as seed on Run", async ({ page }) => {
  const seeds = await openSat3(page, SAT3_PPZ_ONE_RUN, SEED, SAT3_PPZ_ONE_RUN.solverName);
  await page.locator(SEED_INPUT).fill("777");
  await page.locator(RUN).click();
  await expect.poll(() => seeds.length).toBe(1);
  expect(seeds[0]).toBe("777");
  await openPanel(page, "result", { expect });
  await expect(page.locator(SEED_LINE)).toHaveText("Seed: 777");
});

test("a seed too big for Redux keeps Run disabled and says why", async ({ page }) => {
  const seeds = await openSat3(page, SAT3_PPZ_ONE_RUN, SEED, SAT3_PPZ_ONE_RUN.solverName);
  await page.locator(SEED_INPUT).fill("99999999999");
  await expect(page.locator(SEED_INPUT)).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator(RUN)).toBeDisabled();
  await expect(page.locator("#workbench-command-bar")).toContainText(
    "A seed is a whole number up to 2147483647.",
  );
  await page.locator(SEED_INPUT).fill("5");
  await expect(page.locator(RUN)).toBeEnabled();
  expect(seeds).toEqual([]);
});

test("a typed seed is not sent for a solver that isn't randomized", async ({ page }) => {
  const seeds = await openSat3(page, SAT3_PPZ_ONE_RUN, SEED, SAT3_PPZ_ONE_RUN.solverName);
  await page.locator(SEED_INPUT).fill("777");
  await selectSolverByName(page, SAT3_BACKTRACKING_ONE_RUN.solverName, { expect });
  await expect(page.locator(SEED_INPUT)).toHaveCount(0);
  await page.locator(RUN).click();
  await expect.poll(() => seeds.length).toBe(1);
  expect(seeds[0]).toBeNull();
});

/** Answers visualizeRun with `run` (or `status`), and solve with OTHER; counts the solves. */
async function answerWithOtherSolve(page, { run = SAT3_PPZ_ONE_RUN, status = null } = {}) {
  const asked = { runs: 0, solves: 0 };
  await pinSolverTypes(page);
  await page.route(RUN_REQUEST, (route) => {
    asked.runs += 1;
    if (status) return route.fulfill({ status, json: { error: "missing" } });
    return route.fulfill({ json: run });
  });
  await answerPictures(page, SAT3_PPZ_ONE_RUN);
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

test("Solve's answer is the run's own answer, so it matches the steps, and Run asks only once", async ({
  page,
}) => {
  const asked = await answerWithOtherSolve(page);
  await page.locator(RUN).click();
  await openPanel(page, "result", { expect });
  await expect(page.locator("#workbench-result-answer")).toHaveText(SAT3_PPZ_ONE_RUN.answer);
  expect(asked).toEqual({ runs: 1, solves: 0 });
  // Verify This Answer checks that answer.
  await page.locator("#workbench-result-verify-answer").click();
  await expect(page.locator("#workbench-result-verify-certificate")).toHaveValue(
    SAT3_PPZ_ONE_RUN.answer,
  );
});

test("a backend without visualizeRun gets the answer from solve", async ({ page }) => {
  const asked = await answerWithOtherSolve(page, { status: 404 });
  await page.locator(RUN).click();
  await openPanel(page, "result", { expect });
  await expect(page.locator("#workbench-result-answer")).toHaveText(OTHER_ANSWER);
  expect(asked.solves).toBe(1);
});

test("a run that timed out gets its answer from solve", async ({ page }) => {
  const asked = await answerWithOtherSolve(page, {
    run: { ...SAT3_PPZ_ONE_RUN, timedOut: true, answer: null },
  });
  await page.locator(RUN).click();
  await openPanel(page, "result", { expect });
  await expect(page.locator("#workbench-result-answer")).toHaveText(OTHER_ANSWER);
  expect(asked).toEqual({ runs: 1, solves: 1 });
});
