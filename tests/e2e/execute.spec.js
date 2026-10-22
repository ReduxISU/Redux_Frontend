// tests/e2e/execute.spec.js
//
// #279 stage 2 (board F): the Workspace's Execute section. Solve mode's one row (Solve and its
// chip); Reduce building only; one run at a time; Cancel keeping the last result; a timed-out or
// failed run with Try again; the answers carried across filling in by themselves, with Check it,
// "Not available for this reduction", and the agree line; and the tags inside the solver menus.
// #279 (one Solve in Reduce mode): Solve via reduction running the chain (Reduce, Solve the
// target, map the answer back) and showing each step in order, a failed step stopping the ones
// after it, Solve directly beside it, and no answer of an earlier choice left on screen.
//
// The catalog comes from the real backend, like the rest of the suite. Every compute request is
// answered here, for the reasons workbench.spec.js gives (these tests are about the page's state,
// and the proxy allows only 10 compute requests a minute). The fixture already answers
// visualizeRun and reductionView 404, so Solve asks for one picture and Reduce builds with
// ProblemProvider/reduce.

import { expect, test } from "./fixtures";
import { gotoProblemDetail, showPane, startWithPanesExpanded } from "./helpers";

// #279 (Workspace tweaks): Execute and Verify start collapsed for a new viewer. These tests use
// what the open panes hold, so each starts as a viewer who saved them open.
test.beforeEach(async ({ page }) => {
  await startWithPanesExpanded(page);
});

const PROBLEM = "3SAT";
const ANSWER = "(x1:True,x2:False,x3:True)";
const OTHER_ANSWER = "(x1:False,x2:True,x3:True)";
const TARGET_INSTANCE = "(({x1_0,x2_1,x3_2},{{x1_0,x2_1},{x2_1,x3_2},{x1_0,x3_2}}),3)";
const TARGET_ANSWER = "{x1_0,x2_1,x3_2}";
const MAPPED_FORWARD = "{x1_0,x3_1,x2_2}";
const MAPPED_BACK = "(x1:True,x2:True,x3:True)";

const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve\?/;
const REDUCE_REQUEST = /\/api\/redux\/ProblemProvider\/reduce\?/;
const MAP_REQUEST = /\/api\/redux\/ProblemProvider\/mapSolution\?/;
const MAP_BACK_REQUEST = /\/api\/redux\/ProblemProvider\/mapSolutionBack\?/;
const VERIFY_REQUEST = /\/api\/redux\/ProblemProvider\/verify\?/;

const TIME = /\d+\.\d\d s/;

function satFrame(color) {
  return {
    clauses: [
      {
        id: "0",
        literals: [
          { id: "0-0", literal: "x1", color },
          { id: "0-1", literal: "!x2", color: "Background" },
          { id: "0-2", literal: "x3", color: "Background" },
        ],
      },
    ],
  };
}

/** A promise a route can wait on, and the function that releases it. */
function gate() {
  let open;
  const opened = new Promise((resolve) => {
    open = resolve;
  });
  return { opened, open };
}

/**
 * Answers every compute request. Each answer is read from `answers` on every request, so a test
 * can change one between runs: `source(url)` and `target(url)` answer solve requests for a 3SAT
 * and a Clique solver (a route.fulfill options object, or a promise of one), `forward` and
 * `back` the two maps. `calls` counts the solve requests per side.
 */
async function answerCompute(page) {
  const calls = { source: 0, target: 0, reduce: 0, forward: 0, back: 0 };
  // The compute requests in the order they were asked, by name.
  const order = [];
  const answers = {
    source: () => ({ json: ANSWER }),
    target: () => ({ json: TARGET_ANSWER }),
    reduce: () => ({ json: { reductionTo: { instance: TARGET_INSTANCE } } }),
    forward: () => ({ json: MAPPED_FORWARD }),
    back: () => ({ json: MAPPED_BACK }),
  };
  await page.route(VISUALIZE_REQUEST, (route) => {
    const visualization = new URL(route.request().url()).searchParams.get("visualization") ?? "";
    // The 3SAT picture as the old flat list; the Clique target gets none (it says so).
    return route.fulfill({
      json: /sat/i.test(visualization)
        ? [satFrame("Background"), satFrame("ElementHighlight"), satFrame("Solution")]
        : [],
    });
  });
  await page.route(SOLVE_REQUEST, async (route) => {
    const solver = new URL(route.request().url()).searchParams.get("solver") ?? "";
    const side = /clique|carraghan|chiba/i.test(solver) ? "target" : "source";
    calls[side] += 1;
    order.push(side);
    const answer = await answers[side]();
    return route.fulfill(answer).catch(() => {});
  });
  await page.route(REDUCE_REQUEST, (route) => {
    calls.reduce += 1;
    order.push("reduce");
    return route.fulfill(answers.reduce());
  });
  await page.route(MAP_REQUEST, (route) => {
    calls.forward += 1;
    order.push("forward");
    return route.fulfill(answers.forward());
  });
  await page.route(MAP_BACK_REQUEST, (route) => {
    calls.back += 1;
    order.push("back");
    return route.fulfill(answers.back());
  });
  await page.route(VERIFY_REQUEST, (route) => route.fulfill({ json: "True" }));
  return { calls, answers, order };
}

async function openSolve(page) {
  await gotoProblemDetail(page, PROBLEM, { expect });
  await showPane(page, "execute", { expect });
}

/** Switches to Reduce mode with Clique as the target. */
async function openReduce(page) {
  await openSolve(page);
  await page.locator("#workbench-mode-reduce").click();
  const current = ((await page.locator("#workbench-target-value").textContent()) ?? "").trim();
  if (!/^clique$/i.test(current)) {
    await page.locator("#workbench-target-button").click();
    await page
      .locator("#workbench-target-listbox")
      .getByRole("option")
      // By its name: each option also wears its tags.
      .filter({ has: page.locator('[id$="-name"]', { hasText: /^clique$/i }) })
      .first()
      .click();
  }
  await expect(page.locator("#workbench-target-value")).toHaveText(/^clique$/i);
}

const run = (page) => page.locator("#workbench-run");
const chip = (page) => page.locator("#workbench-run-chip");
const sourceRun = (page) => page.locator("#workbench-source-cell-run");
const chainRun = (page) => page.locator("#workbench-chain-run");
const step = (page, key) => page.locator(`#workbench-chain-${key}`);

test("Solve mode: Solve, its chip with the time, and Changed after an instance edit", async ({
  page,
}) => {
  await answerCompute(page);
  await openSolve(page);

  await expect(run(page)).toHaveText("Solve");
  await expect(chip(page)).toHaveCount(0);
  await run(page).click();
  await expect(chip(page)).toHaveText(new RegExp(`^Answer found · ${TIME.source}$`));
  await expect(chip(page)).toHaveAttribute("data-tone", "ok");
  await expect(page.locator("#workbench-result-verdict")).toHaveText("Answer found");
  await expect(page.locator("#workbench-result-answer")).toHaveText(ANSWER);
  await expect(page.locator("#workbench-result")).toContainText("(round trip)");

  await showPane(page, "instance", { expect });
  await page.locator("#workbench-instance-full-instance").fill("(x1 | x2 | !x3)");
  await expect(chip(page)).toHaveText("Changed · run again");
  await expect(page.locator("#workbench-result-answer")).toHaveCount(0);
  await expect(page.locator("#workbench-result-changed")).toContainText("Press Solve");
});

test("Reduce builds the target and solves nothing", async ({ page }) => {
  const { calls } = await answerCompute(page);
  await openReduce(page);

  await expect(run(page)).toHaveText("Reduce");
  // Solve via reduction builds for itself, so it doesn't wait for Reduce.
  await expect(chainRun(page)).toBeEnabled();
  await expect(step(page, "reduce")).toHaveAttribute("data-state", "waiting");
  await expect(page.locator("#workbench-back-text")).toHaveText(
    "Maps the Clique answer step 2 finds back to 3SAT.",
  );

  await run(page).click();
  await expect(chip(page)).toHaveText(new RegExp(`^Built · ${TIME.source}$`));
  await expect(page.locator("#workbench-result-built")).toContainText("Built the Clique instance");
  await expect(page.locator("#workbench-result-target-instance")).toHaveText(TARGET_INSTANCE);
  expect(calls.reduce).toBe(1);
  expect(calls.source + calls.target).toBe(0);

  // Nothing is answered until a Solve button is pressed; the chain's first step is the build.
  await expect(step(page, "reduce")).toHaveAttribute("data-state", "done");
  await expect(step(page, "reduce")).toContainText("Built the Clique instance");
  await expect(step(page, "solve")).toHaveAttribute("data-state", "waiting");
  await expect(page.locator("#workbench-back-text")).toHaveText(
    "Maps the Clique answer step 2 finds back to 3SAT.",
  );
  await expect(page.locator("#workbench-forward-text")).toHaveText(
    "Press Solve directly to see this direction.",
  );
  await expect(page.locator("#workbench-cells-agree")).toHaveCount(0);
  expect(calls.source + calls.target + calls.forward + calls.back).toBe(0);
});

test("Reduce mode has one primary Solve via reduction and a secondary Solve directly", async ({
  page,
}) => {
  await answerCompute(page);
  await openReduce(page);
  await expect(chainRun(page)).toHaveText("Solve via reduction");
  await expect(sourceRun(page)).toHaveText("Solve directly");
  // No Solve button per side any more.
  await expect(page.locator("#workbench-target-cell-run")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Solve (3SAT|Clique)$/ })).toHaveCount(0);
  // The primary fill, and the quieter outlined button beside it.
  const fill = (locator) =>
    locator.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(await fill(chainRun(page))).not.toBe(await fill(sourceRun(page)));
});

test("Solve via reduction builds, solves the target and maps its answer back, showing each step in order", async ({
  page,
}) => {
  const { calls, order } = await answerCompute(page);
  await openReduce(page);

  // No Reduce first: the chain builds for itself.
  await chainRun(page).click();
  await expect(step(page, "solve-result-answer")).toHaveText(TARGET_ANSWER);
  await expect(page.locator("#workbench-back-answer")).toHaveText(MAPPED_BACK);
  expect(order).toEqual(["reduce", "target", "back"]);
  // Each step says what it gave, in order: the build, the target's answer, the answer mapped back.
  const steps = page.locator("#workbench-chain-steps > li");
  await expect(steps).toHaveCount(3);
  await expect(steps.nth(0)).toHaveAttribute("id", "workbench-chain-reduce");
  await expect(steps.nth(0)).toHaveAttribute("data-state", "done");
  await expect(steps.nth(0)).toContainText("Built the Clique instance");
  await expect(steps.nth(1)).toHaveAttribute("id", "workbench-chain-solve");
  await expect(steps.nth(1)).toHaveAttribute("data-state", "done");
  await expect(steps.nth(2)).toHaveAttribute("id", "workbench-back");
  await expect(steps.nth(2)).toHaveAttribute("data-state", "answer");
  await expect(page.locator("#workbench-chain-run-chip")).toHaveText(/^Answer found/);
  // The build is the Reduce row's too.
  await expect(chip(page)).toHaveText(/^Built/);
  await expect(page.locator("#workbench-result-target-instance")).toHaveText(TARGET_INSTANCE);
  // Solve directly hasn't run, so nothing went forward and nothing is compared.
  expect(calls.source + calls.forward).toBe(0);
  await expect(page.locator("#workbench-cells-agree")).toHaveCount(0);

  // Again on the same build: no new build, the target solved again and its answer mapped back.
  await chainRun(page).click();
  await expect.poll(() => calls.target).toBe(2);
  await expect(page.locator("#workbench-back-answer")).toHaveText(MAPPED_BACK);
  expect(calls.reduce).toBe(1);

  // Solve directly, for comparison: the 3SAT answer goes into Clique with no button.
  await sourceRun(page).click();
  await expect(page.locator("#workbench-source-cell-run-chip")).toHaveText(/^Answer found/);
  await expect(page.locator("#workbench-source-cell-result-answer")).toHaveText(ANSWER);
  await expect(page.locator("#workbench-forward-answer")).toHaveText(MAPPED_FORWARD);
  await expect(page.locator("#workbench-cells-agree")).toHaveText("Same answer on both sides.");
  await expect(page.locator("#workbench-cells-agree")).toHaveAttribute("data-tone", "ok");

  // Check it puts the answer into Verify and checks it there.
  await page.locator("#workbench-forward-check").click();
  await expect(page.locator("#workbench-verify-target-certificate")).toHaveValue(MAPPED_FORWARD);
  await page.locator("#workbench-back-check").click();
  await expect(page.locator("#workbench-verify-source-certificate")).toHaveValue(MAPPED_BACK);

  // Solve directly is Solve mode's solve: the same answer, with no new request.
  await page.locator("#workbench-mode-solve").click();
  await expect(page.locator("#workbench-result-answer")).toHaveText(ANSWER);
  expect(calls.source).toBe(1);
});

test("a step that fails says which, with Redux's message and hint, and the steps after it don't run", async ({
  page,
}) => {
  // These answers fail on purpose.
  page.allowNetworkFailures();
  const { answers, calls } = await answerCompute(page);
  await openReduce(page);

  // Step 1, the build.
  answers.reduce = () => ({
    status: 500,
    json: { error: "reduction_failed", detail: "The reduction threw." },
  });
  await chainRun(page).click();
  await expect(step(page, "reduce")).toHaveAttribute("data-state", "failed");
  await expect(step(page, "reduce-failure")).toContainText(
    "Step 1 didn't finish, so the steps after it didn't run.",
  );
  await expect(step(page, "reduce-failure")).toContainText("The reduction threw.");
  await expect(page.locator("#workbench-chain-run-chip")).toHaveText("Failed");
  await expect(step(page, "solve")).toHaveAttribute("data-state", "waiting");
  expect(calls.target + calls.back).toBe(0);
  // Its failure shows once, in the chain, not under the Reduce row too.
  await expect(page.locator("#workbench-run-failure")).toHaveCount(0);

  // Step 2, the target's solve: Try again builds, then fails solving, with Redux's hint.
  answers.reduce = () => ({ json: { reductionTo: { instance: TARGET_INSTANCE } } });
  answers.target = () => ({
    status: 503,
    json: {
      error: "solver_unavailable",
      detail: "The quantum service did not answer.",
      hint: "CliqueBruteForce (Brute Force) runs without the quantum service; or try again later.",
    },
  });
  await step(page, "reduce-failure-retry").click();
  await expect(step(page, "solve")).toHaveAttribute("data-state", "failed");
  await expect(step(page, "reduce")).toHaveAttribute("data-state", "done");
  const failure = step(page, "solve-failure");
  await expect(failure).toContainText("Step 2 didn't finish, so the steps after it didn't run.");
  await expect(failure).toContainText("The quantum service did not answer.");
  await expect(failure).toContainText("CliqueBruteForce (Brute Force) runs without the quantum");
  await expect(page.locator("#workbench-back")).toHaveAttribute("data-state", "waiting");
  expect(calls.back).toBe(0);

  // Step 3, the map back.
  answers.target = () => ({ json: TARGET_ANSWER });
  answers.back = () => ({ status: 500, json: { error: "boom", detail: "Mapping broke." } });
  await step(page, "solve-failure-retry").click();
  await expect(step(page, "solve-result-answer")).toHaveText(TARGET_ANSWER);
  await expect(page.locator("#workbench-back")).toHaveAttribute("data-state", "failed");
  await expect(page.locator("#workbench-back-failure")).toContainText("Step 3 didn't finish.");
  await expect(page.locator("#workbench-back-failure")).toContainText("Mapping broke.");
  expect(calls.reduce).toBe(2);
});

test("Reduce mode never shows an answer of an earlier choice: the instance, the target's solver, or Solve directly's", async ({
  page,
}) => {
  const { calls } = await answerCompute(page);
  await openReduce(page);
  await chainRun(page).click();
  await expect(page.locator("#workbench-back-answer")).toHaveText(MAPPED_BACK);
  await sourceRun(page).click();
  await expect(page.locator("#workbench-source-cell-result-answer")).toHaveText(ANSWER);

  // Another target solver: the target's answer and what came of it go, saying why.
  const targetSolvers = page.locator("#workbench-chain-solver-listbox").getByRole("option");
  await page.locator("#workbench-chain-solver-button").click();
  if ((await targetSolvers.count()) > 1) {
    await targetSolvers.nth(1).click();
    await expect(step(page, "solve-result")).toHaveCount(0);
    await expect(page.locator("#workbench-back")).toHaveAttribute("data-state", "waiting");
    await expect(page.locator("#workbench-chain-changed")).toHaveText(
      /^You picked another target, reduction or solver after the last run/,
    );
    await expect(page.locator("#workbench-chain-run-chip")).toHaveText("Changed · run again");
    await expect(page.locator("#workbench-cells-agree")).toHaveCount(0);
    // Run again: the same build, solved with the new solver.
    await chainRun(page).click();
    await expect(page.locator("#workbench-back-answer")).toHaveText(MAPPED_BACK);
    expect(calls.reduce).toBe(1);
  } else {
    await page.keyboard.press("Escape");
  }

  // Solve directly's solver changed: its answer goes, and so does what it carried across.
  const sourceSolvers = page.locator("#workbench-source-cell-solver-listbox").getByRole("option");
  await page.locator("#workbench-source-cell-solver-button").click();
  if ((await sourceSolvers.count()) > 1) {
    await sourceSolvers.nth(1).click();
    await expect(page.locator("#workbench-source-cell-result")).toHaveCount(0);
    await expect(page.locator("#workbench-source-cell-changed")).toHaveText(
      /^You picked another solver after the last solve/,
    );
    await expect(page.locator("#workbench-forward")).toHaveAttribute("data-state", "waiting");
    await expect(page.locator("#workbench-cells-agree")).toHaveCount(0);
  } else {
    await page.keyboard.press("Escape");
  }

  // An instance edit: every answer goes; the chain says the instance changed.
  await showPane(page, "instance", { expect });
  await page.locator("#workbench-instance-full-instance").fill("(x1 | x2 | !x3)");
  await expect(step(page, "solve-result")).toHaveCount(0);
  await expect(step(page, "reduce")).toHaveAttribute("data-state", "waiting");
  await expect(page.locator("#workbench-back")).toHaveAttribute("data-state", "waiting");
  await expect(page.locator("#workbench-back-answer")).toHaveCount(0);
  await expect(page.locator("#workbench-chain-changed")).toHaveText(
    "The instance changed after the last run. Press Solve via reduction to run it again.",
  );
  await expect(page.locator("#workbench-source-cell-result")).toHaveCount(0);
  await expect(page.locator("#workbench-forward-answer")).toHaveCount(0);

  // Pressing it again builds the new instance first.
  await chainRun(page).click();
  await expect(page.locator("#workbench-back-answer")).toHaveText(MAPPED_BACK);
  expect(calls.reduce).toBe(2);
});

test("one run at a time: the other run buttons wait, and Cancel keeps the last result", async ({
  page,
}) => {
  // Cancel aborts the request in flight on purpose.
  page.allowNetworkFailures();
  const { answers } = await answerCompute(page);
  await openReduce(page);
  await run(page).click();
  await expect(chip(page)).toHaveText(/^Built/);
  await sourceRun(page).click();
  await expect(page.locator("#workbench-source-cell-result-answer")).toHaveText(ANSWER);

  const held = gate();
  answers.source = async () => {
    await held.opened;
    return { json: OTHER_ANSWER };
  };
  await sourceRun(page).click();
  await expect(sourceRun(page)).toHaveCount(0);
  await expect(page.locator("#workbench-source-cell-run-cancel")).toBeVisible();
  await expect(page.locator("#workbench-source-cell-run-chip")).toHaveText(
    /^Running\.\.\. \d:\d\d$/,
  );
  await expect(page.locator("#workbench-source-cell-busy")).toContainText("Solving 3SAT with");
  await expect(chainRun(page)).toBeDisabled();
  await expect(page.locator("#workbench-chain-run-hint")).toHaveText("Another run is going");
  await expect(run(page)).toBeDisabled();
  await expect(page.locator("#workbench-run-hint")).toHaveText("Another run is going");

  await page.locator("#workbench-source-cell-run-cancel").click();
  await expect(page.locator("#workbench-source-cell-run-chip")).toHaveText("Cancelled");
  await expect(page.locator("#workbench-source-cell-failure")).toHaveAttribute(
    "data-kind",
    "cancelled",
  );
  await expect(page.locator("#workbench-source-cell-failure")).toContainText(
    "The last result is kept.",
  );
  await expect(page.locator("#workbench-source-cell-result-answer")).toHaveText(ANSWER);
  await expect(chainRun(page)).toBeEnabled();
  held.open();
});

test("a run that timed out or failed says so, and Try again runs it again", async ({ page }) => {
  // These answers fail on purpose.
  page.allowNetworkFailures();
  const { answers, calls } = await answerCompute(page);
  await openSolve(page);

  answers.source = () => ({ status: 504, json: { error: "timeout" } });
  await run(page).click();
  await expect(chip(page)).toHaveText("Timed out");
  await expect(chip(page)).toHaveAttribute("data-tone", "warn");
  await expect(page.locator("#workbench-run-failure")).toHaveAttribute("data-kind", "timeout");
  await expect(page.locator("#workbench-run-failure")).toContainText("Stopped after 60 seconds");

  answers.source = () => ({ status: 500, json: { error: "boom", detail: "Something broke." } });
  await page.locator("#workbench-run-failure-retry").click();
  await expect(chip(page)).toHaveText("Failed");
  await expect(chip(page)).toHaveAttribute("data-tone", "err");
  await expect(page.locator("#workbench-run-failure")).toHaveAttribute("data-kind", "server");
  await expect(page.locator("#workbench-run-failure")).toContainText("Something broke.");

  answers.source = () => ({ json: ANSWER });
  await page.locator("#workbench-run-failure-retry").click();
  await expect(chip(page)).toHaveText(/^Answer found/);
  await expect(page.locator("#workbench-run-failure")).toHaveCount(0);
  expect(calls.source).toBe(3);
});

test("a reduction that can't map answers says Not available, in neutral grey", async ({ page }) => {
  const { answers, calls } = await answerCompute(page);
  // A mapSolution stub answers "" (ReduxISU/Redux#823); no backward map answers 400.
  answers.forward = () => ({ json: "" });
  answers.back = () => ({ status: 400, json: { error: "no_backward_map" } });
  await openReduce(page);
  await run(page).click();
  await expect(chip(page)).toHaveText(/^Built/);
  await sourceRun(page).click();
  await expect(page.locator("#workbench-forward")).toHaveAttribute("data-state", "na");
  await expect(page.locator("#workbench-forward-text")).toHaveText(
    /^Not available for this reduction/,
  );
  await expect(chainRun(page)).toBeEnabled();
  await chainRun(page).click();
  await expect(page.locator("#workbench-back")).toHaveAttribute("data-state", "na");
  await expect(page.locator("#workbench-back-text")).toHaveText(
    /^Not available for this reduction/,
  );
  // Remembered: a new solve doesn't ask again.
  await sourceRun(page).click();
  await expect(page.locator("#workbench-source-cell-run-chip")).toHaveText(/^Answer found/);
  expect(calls.forward).toBe(1);
  expect(calls.back).toBe(1);
});

test("a no from a solver not known to be exact proves nothing, and the sides aren't compared", async ({
  page,
}) => {
  const { answers } = await answerCompute(page);
  answers.target = () => ({ json: "{}" });
  await openReduce(page);
  await run(page).click();
  await expect(chip(page)).toHaveText(/^Built/);
  await sourceRun(page).click();
  await expect(page.locator("#workbench-forward-answer")).toHaveText(MAPPED_FORWARD);
  await chainRun(page).click();

  await expect(page.locator("#workbench-chain-run-chip")).toHaveText(/^No answer found/);
  // Redux doesn't say which solvers are exact (ReduxISU/Redux#877), so a "no" stays neutral.
  await expect(page.locator("#workbench-chain-run-chip")).toHaveAttribute("data-tone", "neutral");
  await expect(page.locator("#workbench-back")).toHaveAttribute("data-state", "none");
  await expect(page.locator("#workbench-back-text")).toContainText(
    "so this doesn't show the 3SAT instance has none",
  );
  await expect(page.locator("#workbench-cells-agree")).toHaveText(/^Can't compare/);
  await expect(page.locator("#workbench-cells-agree")).toHaveAttribute("data-tone", "neutral");
  await expect(page.locator("#workbench-cells-agree")).not.toContainText("bug");
});

test("solver menus carry tags inside their items, and the Target menu its complexity classes", async ({
  page,
}) => {
  await answerCompute(page);
  await openSolve(page);

  await page.locator("#workbench-solver-button").click();
  await expect(page.locator("#workbench-solver-option-0-tags")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.locator("#workbench-mode-reduce").click();
  await page.locator("#workbench-target-button").click();
  await expect(page.locator("#workbench-target-listbox").getByRole("option").first()).toBeVisible();
  // #279 (Workspace tweaks): the Target menu's items wear their complexity class too.
  await expect(page.locator('#workbench-target-listbox [id$="-tags"]').first()).toBeVisible();
  await page.keyboard.press("Escape");

  await page.locator("#workbench-source-cell-solver-button").click();
  await expect(page.locator("#workbench-source-cell-solver-option-0-tags")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator("#workbench-chain-solver-button").click();
  await expect(page.locator("#workbench-chain-solver-option-0-tags")).toBeVisible();
});
