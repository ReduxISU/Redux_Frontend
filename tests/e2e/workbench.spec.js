// tests/e2e/workbench.spec.js
//
// #229 stage 1: the problem page's workbench layout. #303 (Board G) replaced the rail and its
// panels with one column (tests/e2e/board-g.spec.js covers its order): the problem's details in
// the title's (i) card, the instance editor always on screen, the result listed under the task
// bar after Run, an instance edit resetting the picture, the instance error under the editor,
// Reduce's Reduce to / Reduction / target picture, the no-visualization fallback, and the phone
// layout.
//
// The catalog comes from the real backend, like the rest of the suite. Every compute
// request (solve, visualize, visualizeReduction, reduce) is answered here instead, for two reasons:
// these tests are about the page's layout and state, not about what Redux computes (that is
// live-compute.spec.js's job), and the proxy allows only 10 compute requests a minute, which
// a suite that presses Run this often would otherwise run into.
//
// Pinned to 3SAT because its pictures are the simplest frame shape to answer with
// (booleanSatisfiability: clauses of literals) and it has reductions for Reduce mode.

import { expect, test } from "./fixtures";
import { gotoProblemDetail, openPanel } from "./helpers";

const PROBLEM = "3SAT";
const NOT_RUN = "Not run yet. Showing the default picture of the instance.";
const ANSWER = "(x1:True,x2:False,x3:True)";

// `visualize?` (with the `?`) so it never also catches `visualizeReduction`.
const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;
const VISUALIZE_REDUCTION_REQUEST = /\/api\/redux\/ProblemProvider\/visualizeReduction/;
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve/;
const REDUCE_REQUEST = /\/api\/redux\/ProblemProvider\/reduce\?/;

function satFrame(firstColor) {
  return {
    clauses: [
      {
        id: "0",
        literals: [
          { id: "0-0", literal: "x1", color: firstColor },
          { id: "0-1", literal: "!x2", color: "Background" },
          { id: "0-2", literal: "x3", color: "Background" },
        ],
      },
    ],
  };
}

/** Answers every compute request with a small, valid 3SAT result. */
async function answerCompute(page) {
  await page.route(VISUALIZE_REQUEST, (route) =>
    route.fulfill({
      json: [satFrame("Background"), satFrame("ElementHighlight"), satFrame("Solution")],
    }),
  );
  await page.route(SOLVE_REQUEST, (route) => route.fulfill({ json: ANSWER }));
  await page.route(VISUALIZE_REDUCTION_REQUEST, (route) =>
    route.fulfill({ json: [satFrame("Background"), satFrame("Solution")] }),
  );
  await page.route(REDUCE_REQUEST, (route) =>
    route.fulfill({ json: { reductionTo: { instance: "(({a,b},{{a,b}}),2)" } } }),
  );
}

test("the problem's details are in the title's (i) card, and the instance editor is always on screen", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  await expect(page.locator("#workbench-rail")).toHaveCount(0);
  await expect(page.locator("#workbench-panel")).toHaveCount(0);
  await expect(page.locator("#workbench-instance-full-instance")).toBeVisible();
  await expect(page.locator("#workbench-instance-full-instance")).not.toHaveValue("");

  const card = page.locator("#problem-info-card");
  await expect(card).toBeHidden();
  // A mouse hover opens the card on its own, and a click on an open card closes it, so a bare
  // click races the hover's render (as tagged-dropdowns.spec.js says). Hover, then wait.
  await page.locator("#problem-info-button").hover();
  await expect(card).toBeVisible();
  await expect(card).toContainText(PROBLEM);
  await expect(card).toContainText("Input");
  await expect(card).toContainText("Output");
  // Escape closes it.
  await page.locator("#problem-info-button").press("Escape");
  await expect(card).toBeHidden();
});

test("after Run, the result is listed under the task bar", async ({ page }) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  const solverName = ((await page.locator("#workbench-solver-value").textContent()) ?? "").trim();
  const showing = page.locator("#workbench-showing");
  await expect(showing).toHaveText(NOT_RUN);
  await expect(page.locator("#workbench-result-empty")).toHaveText(
    "No run yet: press Solve for an answer.",
  );
  await expect(page.locator("#workbench-run")).toHaveText("Solve");
  // #303: a randomized solver (3SAT's first, PPZ) repeats a run only with a seed typed in.
  const seed = page.locator("#workbench-seed");
  if ((await seed.count()) > 0) await seed.fill("5");

  await page.locator("#workbench-run").click();

  await expect(showing).toHaveText(solverName);
  // #303: done, Solve can't change the answer, so it says so and is inactive.
  await expect(page.locator("#workbench-run")).toHaveText("Solved");
  await expect(page.locator("#workbench-run")).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator("#workbench-result-answer")).toHaveText(ANSWER);
  const bar = await page.locator("#workbench-command-bar").boundingBox();
  const results = await page.locator("#workbench-results").boundingBox();
  expect(results.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1);
});

test("editing the instance after a run resets the picture to the base instance", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  const solverName = ((await page.locator("#workbench-solver-value").textContent()) ?? "").trim();
  const showing = page.locator("#workbench-showing");

  await page.locator("#workbench-run").click();
  await expect(showing).toHaveText(solverName);
  // The run's picture has steps to play, and opens on its last; the base picture has none.
  await expect(page.locator("#workbench-steps-position")).toContainText("Step 3 of 3");

  await openPanel(page, "instance", { expect });
  const edited = "(x1 | x2 | !x3)";
  await page.locator("#workbench-instance-full-instance").fill(edited);

  await expect(showing).toHaveText(NOT_RUN);
  await expect(page.locator("#workbench-steps-position")).toHaveCount(0);
  await expect(page.locator("#workbench-note")).toContainText(
    "The instance changed, so the picture is back to the base instance.",
  );
  // The base picture of the edited instance is drawn once the typing pauses.
  await expect(page.locator("#workbench-source-picture")).toHaveAttribute(
    "data-picture-kind",
    "frame",
  );

  // The results say their answer is for the old instance.
  await openPanel(page, "result", { expect });
  await expect(page.locator("#workbench-results")).toContainText(
    "The instance changed since this run.",
  );
});

test("an instance Redux cannot read gets its error under the instance editor", async ({ page }) => {
  // The 400 below is the behaviour under test, not a silent failure.
  page.allowNetworkFailures();
  await page.route(VISUALIZE_REQUEST, (route) =>
    route.fulfill({
      status: 400,
      json: {
        error: "instance_parse_error",
        problem: "SAT3",
        expected: "Boolean formula in 3-CNF.",
        detail: "Clause 2 has no literals.",
      },
    }),
  );
  await gotoProblemDetail(page, PROBLEM, { expect });

  await expect(page.locator("#workbench-instance-full-instance")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#workbench-instance-full-instance-error")).toContainText(
    "Clause 2 has no literals.",
  );
  await expect(page.locator("#workbench-run")).toBeDisabled();
  await expect(page.locator("#workbench-showing")).toContainText("The instance has errors.");
  await expect(page.locator("#workbench-source-picture")).toContainText(
    "The instance has a problem, so it can't be drawn.",
  );
  // The editor is always on screen, so the error is said there once, not again by the bar.
  await expect(page.locator("#workbench-instance-error")).toHaveCount(0);
});

test("Reduce shows Reduce to and Reduction, and Reduce builds the target picture", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  // These older requests carry the Solve tab's Algorithm's answer across; a randomized one
  // (PPZ, 3SAT's first) could carry another, so then Reduce stays an action (#303).
  const randomized = (await page.locator("#workbench-seed").count()) > 0;

  await page.locator("#workbench-mode-reduce").click();
  await expect(page.locator("#workbench-mode-reduce")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#workbench-solver-button")).toHaveCount(0);
  const target = ((await page.locator("#workbench-target-value").textContent()) ?? "").trim();
  const reduction = ((await page.locator("#workbench-reduction-value").textContent()) ?? "").trim();
  expect(target).not.toBe("");
  expect(reduction).not.toBe("");

  // The two closed dropdowns sit on one row after the tabs; Reduce is on the stepper's row
  // under them (#303 stage 2).
  const toBox = await page.locator("#workbench-target-button").boundingBox();
  const usingBox = await page.locator("#workbench-reduction-button").boundingBox();
  const runBox = await page.locator("#workbench-run").boundingBox();
  const stagesBox = await page.locator("#workbench-stages").boundingBox();
  expect(Math.abs(toBox.y - usingBox.y)).toBeLessThan(2);
  expect(usingBox.x).toBeGreaterThan(toBox.x + toBox.width);
  expect(runBox.y).toBeGreaterThan(usingBox.y + usingBox.height - 1);
  expect(runBox.x).toBeGreaterThan(stagesBox.x + stagesBox.width);

  await expect(page.locator("#workbench-target-picture")).toContainText(
    `Press Reduce to build the ${target} instance from this one.`,
  );
  await expect(page.locator("#workbench-run")).toHaveText("Reduce");

  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-showing")).toHaveText(
    `${PROBLEM} → ${target} (${reduction})`,
  );
  await expect(page.locator("#workbench-target-picture")).toHaveAttribute(
    "data-picture-kind",
    "frame",
  );
  // The stepper moves on to Solve; back on Reduce, the build is done (#303: a rebuild of the
  // same instance can't change it), unless a randomized answer is carried across.
  await expect(page.locator("#workbench-run")).toHaveText(`Solve through ${target}`);
  await page.locator("#workbench-stage-reduce").click();
  if (randomized) {
    await expect(page.locator("#workbench-run")).toHaveText("Reduce");
    await expect(page.locator("#workbench-run")).toBeEnabled();
  } else {
    await expect(page.locator("#workbench-run")).toHaveText("Reduced");
    await expect(page.locator("#workbench-run")).toHaveAttribute("aria-disabled", "true");
  }

  await openPanel(page, "result", { expect });
  await expect(page.locator("#workbench-result-rows-reduce-done")).toContainText(reduction);
});

test("a problem with nothing this site can draw falls back cleanly", async ({ page }) => {
  // Every real problem has a drawable visualization today, so this marks 3SAT's as
  // unimplemented in the catalog, which the page treats as "nothing to draw".
  const markUnimplemented = (body, read) => {
    for (const key of Object.keys(body)) {
      if (key.startsWith("Sat3") && key.endsWith("Visualization")) read(body, key);
    }
    return body;
  };
  await page.route(/\/api\/redux\/Navigation\/Batch\/allVisualizationTypes/, async (route) => {
    const response = await route.fetch();
    const body = markUnimplemented(await response.json(), (b, key) => {
      b[key] = "Unimplemented";
    });
    await route.fulfill({ response, json: body });
  });
  await page.route(/\/api\/redux\/Navigation\/Batch\/allInfo/, async (route) => {
    const response = await route.fetch();
    const body = markUnimplemented(await response.json(), (b, key) => {
      b[key] = { ...b[key], visualizationType: "Unimplemented" };
    });
    await route.fulfill({ response, json: body });
  });
  await page.route(SOLVE_REQUEST, (route) => route.fulfill({ json: ANSWER }));
  let visualizeCalls = 0;
  await page.route(VISUALIZE_REQUEST, (route) => {
    visualizeCalls += 1;
    return route.fulfill({ json: [satFrame("Background")] });
  });

  await gotoProblemDetail(page, PROBLEM, { expect });

  await expect(page.locator("#workbench-source-picture")).toContainText(
    "This problem has no visualization this site can draw yet.",
  );
  await expect(page.locator("#workbench-showing")).toHaveText("Not run yet.");
  await expect(page.locator("#workbench-source-type-button")).toHaveCount(0);
  await expect(page.locator("#workbench-legend-toggle")).toHaveCount(0);

  // Run still solves; there is just no picture to draw.
  await page.locator("#workbench-run").click();
  await openPanel(page, "result", { expect });
  await expect(page.locator("#workbench-result-answer")).toHaveText(ANSWER);
  expect(visualizeCalls).toBe(0);
});

test("at phone width the column stacks: tabs on their own row, then each menu, then Solve", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  // Nothing is fixed over the page any more: no bottom tabs, no sheet.
  await expect(page.locator("#workbench-rail")).toHaveCount(0);
  expect(
    await page
      .locator("#workbench-command-bar")
      .evaluate((element) => getComputedStyle(element).position),
  ).toBe("static");

  // The default picture grows the page above the bar once it draws, so wait for it, then read
  // every box at once.
  await expect(page.locator('figure [role="img"]').first()).toBeVisible();
  const settled = await page.evaluate(() =>
    Object.fromEntries(
      ["tasks", "solver-button", "run", "mode-solve", "mode-verify"].map((key) => {
        const rect = document.getElementById(`workbench-${key}`).getBoundingClientRect();
        return [key, { x: rect.x, y: rect.y, width: rect.width, height: rect.height }];
      }),
    ),
  );
  const { tasks, "solver-button": solver, run } = settled;
  // The tabs take the row's width, three side by side.
  const { "mode-solve": solve, "mode-verify": verify } = settled;
  expect(Math.abs(solve.y - verify.y)).toBeLessThan(2);
  expect(solver.y).toBeGreaterThan(tasks.y + tasks.height - 1);
  expect(run.y).toBeGreaterThan(solver.y + solver.height - 1);
  // Solve fills its row, a 44px target.
  expect(Math.abs(run.width - tasks.width)).toBeLessThan(2);
  expect(run.height).toBeGreaterThanOrEqual(44);
});
