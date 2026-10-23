// tests/e2e/workbench.spec.js
//
// #229 stage 1, reworked for #279 stage 1 (board F): the problem page's layout. The bar of
// toggles (every part shown at first, each toggle hiding and showing its pane or Workspace
// section, hiding all three sections hiding the Workspace, Reset layout), Details and Instance
// collapsed to one line with Show all / Show less, typed text and the layout surviving hiding and
// a reload, the result showing in Execute after Run, an instance edit resetting the picture, the
// Instance error dot, Reduce mode's To / Using / target picture, the sides stacking by the
// Workspace's width, the no-visualization fallback, and the phone layout.
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
import { expandPane, gotoProblemDetail, showPane } from "./helpers";

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

const LAYOUT_KEYS = ["details", "instance", "visualization", "execute", "verify"];
const REGIONS = {
  details: "#workbench-details-pane",
  instance: "#workbench-instance-pane",
  visualization: "#workbench-section-visualization",
  execute: "#workbench-section-execute",
  verify: "#workbench-section-verify",
};
const toggle = (page, key) => page.locator(`#workbench-toggle-${key}`);
const borderStyle = (locator) =>
  locator.evaluate((element) => getComputedStyle(element).borderTopStyle);

test("every pane is shown at first, each toggle hides and shows its part, and Reset layout shows everything", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  for (const key of LAYOUT_KEYS) {
    await expect(toggle(page, key)).toHaveAttribute("aria-expanded", "true");
    await expect(toggle(page, key)).toHaveAttribute("aria-controls", REGIONS[key].slice(1));
    await expect(page.locator(REGIONS[key])).toBeVisible();
    // Shown is told by a solid border, hidden by a dashed one, not by color alone.
    expect(await borderStyle(toggle(page, key))).toBe("solid");
  }
  // The three sections are regions of the one Workspace, named by their small headings, in order.
  await expect(page.locator("#workbench-workspace")).toBeVisible();
  await expect(page.locator("#workbench-workspace").getByRole("region")).toHaveCount(3);
  await expect(page.getByRole("region", { name: "Visualization" })).toHaveId(
    "workbench-section-visualization",
  );
  const headings = await page.locator("#workbench-workspace h3").allTextContents();
  expect(headings.filter((text) => ["Visualization", "Execute", "Verify"].includes(text))).toEqual([
    "Visualization",
    "Execute",
    "Verify",
  ]);

  // Each toggle hides its own part and nothing else.
  await toggle(page, "details").click();
  await expect(toggle(page, "details")).toHaveAttribute("aria-expanded", "false");
  expect(await borderStyle(toggle(page, "details"))).toBe("dashed");
  await expect(page.locator(REGIONS.details)).toBeHidden();
  await expect(page.locator(REGIONS.instance)).toBeVisible();
  await toggle(page, "details").click();
  await expect(page.locator(REGIONS.details)).toBeVisible();

  // Hiding the sections one at a time keeps the Workspace until the last one goes.
  await toggle(page, "visualization").click();
  await toggle(page, "execute").click();
  await expect(page.locator(REGIONS.visualization)).toBeHidden();
  await expect(page.locator(REGIONS.execute)).toBeHidden();
  await expect(page.locator("#workbench-workspace")).toBeVisible();
  await expect(page.locator(REGIONS.verify)).toBeVisible();
  await toggle(page, "verify").click();
  await expect(page.locator("#workbench-workspace")).toBeHidden();

  // With every part hidden, the page says how to get them back.
  await expect(page.locator("#workbench-all-hidden")).toHaveCount(0);
  await toggle(page, "details").click();
  await toggle(page, "instance").click();
  await expect(page.locator("#workbench-all-hidden")).toBeVisible();

  await page.locator("#workbench-layout-reset").click();
  for (const key of LAYOUT_KEYS) {
    await expect(toggle(page, key)).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(REGIONS[key])).toBeVisible();
  }
  await expect(page.locator("#workbench-all-hidden")).toHaveCount(0);
});

test("Details and Instance start as one line each, with Show all and Show less", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  // Details: the Input -> Output line, and the rest after Show all.
  const detailsExpand = page.locator("#workbench-details-expand");
  await expect(detailsExpand).toHaveAttribute("aria-expanded", "false");
  await expect(detailsExpand).toHaveText("Show all");
  await expect(page.locator("#workbench-details-summary")).toContainText("→");
  await expect(page.locator(REGIONS.details).getByText("Contributors")).toHaveCount(0);
  await detailsExpand.click();
  await expect(detailsExpand).toHaveText("Show less");
  await expect(page.locator("#workbench-details-summary")).toHaveCount(0);
  await expect(page.locator(REGIONS.details).getByText("Contributors")).toBeVisible();
  await detailsExpand.click();
  await expect(page.locator("#workbench-details-summary")).toBeVisible();

  // Instance: one editable line, then the same field, taller, with its label and format.
  const field = page.locator("#workbench-instance-full-instance");
  await expect(page.locator("#workbench-instance-expand")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(field).toHaveAttribute("rows", "1");
  await expect(field).toBeEditable();
  const edited = "(x1 | x2 | !x3)";
  await field.fill(edited);
  await expandPane(page, "instance", { expect });
  await expect(field).toHaveAttribute("rows", "3");
  await expect(field).toHaveValue(edited);
  await expect(page.getByLabel("Full instance")).toHaveId("workbench-instance-full-instance");
  await page.locator("#workbench-instance-expand").click();
  await expect(field).toHaveAttribute("rows", "1");
  await expect(field).toHaveValue(edited);
});

test("typed text survives hiding its pane, and the layout survives a reload", async ({ page }) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  const field = page.locator("#workbench-instance-full-instance");
  const edited = "(x1 | x2 | !x3)";
  await field.fill(edited);
  await toggle(page, "instance").click();
  await expect(field).toBeHidden();
  await showPane(page, "instance", { expect });
  await expect(field).toHaveValue(edited);

  const certificate = page.locator("#workbench-verify-certificate");
  await certificate.fill("x1 = T");
  await toggle(page, "verify").click();
  await expect(certificate).toBeHidden();
  await showPane(page, "verify", { expect });
  await expect(certificate).toHaveValue("x1 = T");

  // Which parts are shown, and Show all, are kept in this browser.
  await toggle(page, "verify").click();
  await expandPane(page, "details", { expect });
  await page.reload();
  await expect(toggle(page, "verify")).toHaveAttribute("aria-expanded", "false", {
    timeout: 20_000,
  });
  await expect(page.locator(REGIONS.verify)).toBeHidden();
  await expect(page.locator("#workbench-details-expand")).toHaveAttribute("aria-expanded", "true");
  await page.locator("#workbench-layout-reset").click();
  await expect(toggle(page, "verify")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#workbench-details-expand")).toHaveAttribute("aria-expanded", "false");
});

test("after Run, the answer shows in Execute under Run, and the layout stays as it was", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  const solverName = ((await page.locator("#workbench-solver-value").textContent()) ?? "").trim();
  const showing = page.locator("#workbench-showing");
  await expect(showing).toHaveText(NOT_RUN);
  await expect(page.locator("#workbench-result-empty")).toBeVisible();

  await page.locator("#workbench-run").click();

  await expect(showing).toHaveText(solverName);
  await expect(page.locator(REGIONS.execute).locator("#workbench-result-answer")).toHaveText(
    ANSWER,
  );
  await expect(page.locator("#workbench-run")).toHaveText("Run solve again");
  // Nothing opened, closed or got a dot: the result is right under Run.
  for (const key of LAYOUT_KEYS) {
    await expect(toggle(page, key)).toHaveAttribute("aria-expanded", "true");
  }
  await expect(page.locator("#workbench-details-expand")).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator('#workbench-toggles [id$="-dot"]')).toHaveCount(0);
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

  await showPane(page, "instance", { expect });
  const edited = "(x1 | x2 | !x3)";
  await page.locator("#workbench-instance-full-instance").fill(edited);

  await expect(showing).toHaveText(NOT_RUN);
  await expect(page.locator("#workbench-steps-position")).toHaveCount(0);
  await expect(page.locator("#workbench-instance-full-instance")).toHaveValue(edited);
  await expect(page.locator("#workbench-note")).toContainText(
    "The instance changed, so the picture is back to the base instance.",
  );
  // The base picture of the edited instance is drawn once the typing pauses.
  await expect(page.locator("#workbench-source-picture")).toHaveAttribute(
    "data-picture-kind",
    "frame",
  );

  // The result in Execute says its answer is for the old instance.
  await showPane(page, "execute", { expect });
  await expect(page.locator(REGIONS.execute)).toContainText("The instance changed since this run.");
});

test("an instance Redux cannot read gets a red dot on Instance and an error under the field", async ({
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

  const dot = page.locator("#workbench-toggle-instance-dot");
  await expect(dot).toBeVisible();
  await expect(dot).toHaveAttribute("aria-label", "The instance has errors");
  await expect(page.locator("#workbench-run")).toBeDisabled();
  await expect(page.locator("#workbench-showing")).toContainText("The instance has errors.");
  await expect(page.locator("#workbench-source-picture")).toContainText(
    "The instance has a problem, so it can't be drawn.",
  );

  // The error sits under the instance field, collapsed or not, while the Instance pane shows.
  await expect(page.locator("#workbench-instance-error")).toHaveCount(0);
  await expect(page.locator("#workbench-instance-full-instance")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator("#workbench-instance-full-instance-error")).toContainText(
    "Clause 2 has no literals.",
  );

  // With the Instance pane hidden, it shows under Run instead.
  await toggle(page, "instance").click();
  await expect(page.locator(REGIONS.execute).locator("#workbench-instance-error")).toContainText(
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
  await expect(page.locator("#workbench-result-reduce")).toContainText(reduction);
});

test("the source and target sit side by side, and stack by the Workspace's own width", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await page.locator("#workbench-mode-reduce").click();
  const source = page.locator("#workbench-source-picture");
  const target = page.locator("#workbench-target-picture");
  await expect(target).toBeVisible();

  // 1100 px: the Workspace is over 960 px wide, so the two sides share a row: the target to the
  // right of the source, starting before the source's picture ends. (Their tops line up exactly
  // in stage 3, when the frames share their top and bottom lines.)
  await page.setViewportSize({ width: 1100, height: 900 });
  await expect
    .poll(async () => (await target.boundingBox()).x - (await source.boundingBox()).x)
    .toBeGreaterThan(400);
  const sourceWide = await source.boundingBox();
  const targetWide = await target.boundingBox();
  expect(targetWide.x).toBeGreaterThan(sourceWide.x + sourceWide.width);
  expect(targetWide.y).toBeLessThan(sourceWide.y + sourceWide.height);

  // 990 px: the window is still wider than 960 px, but the Workspace inside the page's margins
  // isn't, so the sides stack, source first.
  await page.setViewportSize({ width: 990, height: 900 });
  const workspaceWidth = await page
    .locator("#workbench-workspace")
    .evaluate((element) => element.clientWidth);
  expect(workspaceWidth).toBeLessThanOrEqual(960);
  await expect
    .poll(async () => (await target.boundingBox()).y - (await source.boundingBox()).y)
    .toBeGreaterThan(100);
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(targetBox.y).toBeGreaterThanOrEqual(sourceBox.y + sourceBox.height);
  expect(Math.abs(sourceBox.x - targetBox.x)).toBeLessThan(2);
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
  await expect(page.locator("#workbench-result-answer")).toHaveText(ANSWER);
  expect(visualizeCalls).toBe(0);
});

test("at phone width the toggles sit two to a row and scroll with the page, and nothing covers the picture", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  const bar = page.locator("#workbench-toggles");
  expect(await bar.evaluate((element) => getComputedStyle(element).position)).toBe("static");

  // Two to a row: Details beside Instance, Visualization on the next row.
  const details = await toggle(page, "details").boundingBox();
  const instance = await toggle(page, "instance").boundingBox();
  const visualization = await toggle(page, "visualization").boundingBox();
  expect(Math.abs(details.y - instance.y)).toBeLessThan(2);
  expect(instance.x).toBeGreaterThan(details.x);
  expect(visualization.y).toBeGreaterThan(details.y + details.height - 1);
  expect(details.width).toBeGreaterThan(150);

  // Every part is shown, one under the other, and the page doesn't scroll sideways.
  for (const key of LAYOUT_KEYS) await expect(page.locator(REGIONS[key])).toBeVisible();
  const scroll = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(scroll).toBeLessThanOrEqual(0);
  const instancePane = await page.locator(REGIONS.instance).boundingBox();
  const workspace = await page.locator("#workbench-workspace").boundingBox();
  expect(workspace.y).toBeGreaterThanOrEqual(instancePane.y + instancePane.height);

  // Nothing is fixed over the picture any more: the point at its centre is the picture's own.
  const picture = page.locator("#workbench-source-picture");
  await picture.scrollIntoViewIfNeeded();
  const box = await picture.boundingBox();
  const covered = await page.evaluate(
    ([x, y]) =>
      !document
        .getElementById("workbench-source-picture")
        .contains(document.elementFromPoint(x, y)),
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  expect(covered).toBe(false);

  // Run sits on its own line at the left of Execute, as before.
  const run = await page.locator("#workbench-run").boundingBox();
  const controls = await page.locator("#workbench-controls").boundingBox();
  expect(Math.abs(run.x - controls.x)).toBeLessThan(2);
});
