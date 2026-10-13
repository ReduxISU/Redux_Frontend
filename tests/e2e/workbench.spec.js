// tests/e2e/workbench.spec.js
//
// #229 stage 1: the problem page's workbench layout. Rail panel switching (one panel at a
// time, pressing the open one closes it, Details open first), the Result dot after Run, an
// instance edit resetting the picture, the Instance error dot, Reduce mode's To / Using /
// target picture, the no-visualization fallback, and the phone layout (bottom tabs and a
// bottom sheet).
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

const railButton = (page, key) => page.locator(`#workbench-rail-${key}`);

test("Details is open first, one panel opens at a time, and pressing the open one closes it", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  const panel = page.locator("#workbench-panel");
  const heading = page.locator("#workbench-panel-heading");

  await expect(railButton(page, "details")).toHaveAttribute("aria-expanded", "true");
  await expect(railButton(page, "instance")).toHaveAttribute("aria-expanded", "false");
  await expect(railButton(page, "result")).toHaveAttribute("aria-expanded", "false");
  await expect(heading).toHaveText("Details");
  await expect(page.locator("#workbench-panel-details")).toBeVisible();

  await railButton(page, "instance").click();
  await expect(railButton(page, "instance")).toHaveAttribute("aria-expanded", "true");
  await expect(railButton(page, "details")).toHaveAttribute("aria-expanded", "false");
  await expect(heading).toHaveText("Instance");
  await expect(page.locator("#workbench-panel-details")).toBeHidden();
  await expect(page.locator("#workbench-instance-full-instance")).toBeVisible();

  await railButton(page, "result").click();
  await expect(railButton(page, "result")).toHaveAttribute("aria-expanded", "true");
  await expect(railButton(page, "instance")).toHaveAttribute("aria-expanded", "false");
  await expect(heading).toHaveText("Result & Verify");

  // Pressing the open panel's own button again closes it, leaving no panel at all.
  await railButton(page, "result").click();
  for (const key of ["details", "instance", "result"]) {
    await expect(railButton(page, key)).toHaveAttribute("aria-expanded", "false");
  }
  await expect(panel).toBeHidden();

  // The panel's Close button does the same, and Escape inside the panel too.
  await railButton(page, "details").click();
  await expect(panel).toBeVisible();
  await page.locator("#workbench-panel-close").click();
  await expect(panel).toBeHidden();
  await railButton(page, "details").click();
  await page.locator("#workbench-panel-close").press("Escape");
  await expect(panel).toBeHidden();
  await expect(railButton(page, "details")).toBeFocused();
});

test("Edit opens the Instance panel with the instance ready to edit", async ({ page }) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  const barText = ((await page.locator("#workbench-instance-text").textContent()) ?? "").trim();
  await page.locator("#workbench-edit-instance").click();
  await expect(railButton(page, "instance")).toHaveAttribute("aria-expanded", "true");
  const box = page.locator("#workbench-instance-full-instance");
  await expect(box).toBeFocused();
  await expect(box).toHaveValue(barText);
});

test("after Run, Result gets a dot instead of opening, and opening Result clears it", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  const solverName = ((await page.locator("#workbench-solver-value").textContent()) ?? "").trim();
  const showing = page.locator("#workbench-showing");
  await expect(showing).toHaveText(NOT_RUN);
  await expect(page.locator("#workbench-rail-result-dot")).toHaveCount(0);

  await page.locator("#workbench-run").click();

  await expect(showing).toHaveText(solverName);
  const dot = page.locator("#workbench-rail-result-dot");
  await expect(dot).toBeVisible();
  await expect(dot).toHaveAttribute("aria-label", "New result");
  // The Details panel stays open: the result does not take over the page.
  await expect(page.locator("#workbench-panel-heading")).toHaveText("Details");
  await expect(railButton(page, "result")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#workbench-run")).toHaveText("Run solve again");

  await railButton(page, "result").click();
  await expect(dot).toHaveCount(0);
  await expect(page.locator("#workbench-result-answer")).toHaveText(ANSWER);

  // Closing Result again does not bring the dot back: it was seen.
  await railButton(page, "result").click();
  await expect(dot).toHaveCount(0);
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
  // The run's picture has steps to play; the base picture has none.
  await expect(page.locator("#workbench-steps-position")).toContainText("Step 1 of 3");

  await openPanel(page, "instance", { expect });
  const edited = "(x1 | x2 | !x3)";
  await page.locator("#workbench-instance-full-instance").fill(edited);

  await expect(showing).toHaveText(NOT_RUN);
  await expect(page.locator("#workbench-steps-position")).toHaveCount(0);
  await expect(page.locator("#workbench-instance-text")).toHaveText(edited);
  await expect(page.locator("#workbench-note")).toContainText(
    "The instance changed, so the picture is back to the base instance.",
  );
  // The base picture of the edited instance is drawn once the typing pauses.
  await expect(page.locator("#workbench-source-picture")).toHaveAttribute(
    "data-picture-kind",
    "frame",
  );

  // The Result panel says its answer is for the old instance.
  await openPanel(page, "result", { expect });
  await expect(page.locator("#workbench-panel-result")).toContainText(
    "The instance changed since this run.",
  );
});

test("an instance Redux cannot read gets a red dot on Instance and an error under the bar", async ({
  page,
}) => {
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

  const dot = page.locator("#workbench-rail-instance-dot");
  await expect(dot).toBeVisible();
  await expect(dot).toHaveAttribute("aria-label", "The instance has errors");
  await expect(page.locator("#workbench-instance-error")).toContainText(
    "Clause 2 has no literals.",
  );
  await expect(page.locator("#workbench-run")).toBeDisabled();
  await expect(page.locator("#workbench-showing")).toContainText("The instance has errors.");
  await expect(page.locator("#workbench-source-picture")).toContainText(
    "The instance has a problem, so it can't be drawn.",
  );

  // In the Instance panel the error sits under the text box instead.
  await openPanel(page, "instance", { expect });
  await expect(page.locator("#workbench-instance-error")).toHaveCount(0);
  await expect(page.locator("#workbench-instance-full-instance")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#workbench-instance-full-instance-error")).toContainText(
    "Clause 2 has no literals.",
  );
});

test("Reduce mode shows To and Using, and Run builds the target picture", async ({ page }) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  await page.locator("#workbench-mode-reduce").click();
  await expect(page.locator("#workbench-mode-reduce")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#workbench-solver-button")).toHaveCount(0);
  const target = ((await page.locator("#workbench-target-value").textContent()) ?? "").trim();
  const reduction = ((await page.locator("#workbench-reduction-value").textContent()) ?? "").trim();
  expect(target).not.toBe("");
  expect(reduction).not.toBe("");

  // The two closed dropdowns line up at one width.
  const toBox = await page.locator("#workbench-target-button").boundingBox();
  const usingBox = await page.locator("#workbench-reduction-button").boundingBox();
  expect(Math.abs(toBox.x - usingBox.x)).toBeLessThan(2);
  expect(Math.abs(toBox.width - usingBox.width)).toBeLessThan(2);

  await expect(page.locator("#workbench-target-picture")).toContainText(
    `Press Run to build the ${target} instance from this one.`,
  );
  await expect(page.locator("#workbench-run")).toHaveText("Run reduction");

  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-showing")).toHaveText(
    `${PROBLEM} → ${target} (${reduction})`,
  );
  await expect(page.locator("#workbench-target-picture")).toHaveAttribute(
    "data-picture-kind",
    "frame",
  );
  await expect(page.locator("#workbench-rail-result-dot")).toBeVisible();

  await openPanel(page, "result", { expect });
  await expect(page.locator("#workbench-result-reduce")).toContainText(reduction);
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
  await expect(page.locator("#workbench-rail-result-dot")).toBeVisible();
  await openPanel(page, "result", { expect });
  await expect(page.locator("#workbench-result-answer")).toHaveText(ANSWER);
  expect(visualizeCalls).toBe(0);
});

test("at phone width the rail is a row of bottom tabs and a panel opens as a bottom sheet", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  const rail = page.locator("#workbench-rail");
  expect(await rail.evaluate((element) => getComputedStyle(element).position)).toBe("fixed");
  const railBox = await rail.boundingBox();
  expect(railBox.y + railBox.height).toBeGreaterThan(840);
  expect(railBox.width).toBeGreaterThan(380);

  // The three buttons sit side by side.
  const detailsBox = await railButton(page, "details").boundingBox();
  const resultBox = await railButton(page, "result").boundingBox();
  expect(Math.abs(detailsBox.y - resultBox.y)).toBeLessThan(2);
  expect(resultBox.x).toBeGreaterThan(detailsBox.x);

  // Details is open as a sheet resting on the tabs, no wider than 720px.
  const panelBox = await page.locator("#workbench-panel").boundingBox();
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(railBox.y + 1);
  expect(panelBox.width).toBeLessThanOrEqual(720);

  // The command bar is not sticky, and Edit and Run sit on their own lines at the left.
  expect(
    await page
      .locator("#workbench-command-bar")
      .evaluate((element) => getComputedStyle(element).position),
  ).toBe("static");
  await railButton(page, "details").click();
  const editBox = await page.locator("#workbench-edit-instance").boundingBox();
  const runBox = await page.locator("#workbench-run").boundingBox();
  const instanceBox = await page.locator("#workbench-instance-text").boundingBox();
  expect(editBox.y).toBeGreaterThan(instanceBox.y + instanceBox.height - 1);
  expect(Math.abs(editBox.x - runBox.x)).toBeLessThan(2);
  expect(runBox.y).toBeGreaterThan(editBox.y);
});
