// tests/e2e/workspace-sections.spec.js
//
// #279 (Workspace tweaks): the Workspace's Visualization, Execute and Verify sections each have the
// Show all / Show less button the Details and Instance panes have. Each collapses on its own to a
// one-line summary: Visualization the pictures' problems and Visualization Types, Execute the mode,
// the algorithm and the latest run's chip, Verify each side's latest verdict. What a section holds
// survives collapsing, the layout remembers it through a reload until Reset layout, Check it opens
// a collapsed Verify, and Algorithm Steps opening by itself after a run never opens a collapsed
// Visualization. Collapsed, every pane's and section's one line starts at one x, Instance's field on
// its title's line.
//
// The catalog comes from the real backend, like the rest of the suite; every compute request is
// answered here (see workbench.spec.js for why).

import { expect, test } from "./fixtures";
import { chooseReduceTarget, gotoProblemDetail, showPane } from "./helpers";

const PROBLEM = "3SAT";
const ANSWER = "(x1:True,x2:False,x3:True)";
const TARGET_INSTANCE = "(({a,b,c},{{a,b},{b,c},{a,c}}),3)";
const TARGET_ANSWER = "{a,b,c}";
const MAPPED = "{a,b,c}";
const MAPPED_BACK = "(x1:True,x2:True,x3:True)";

const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve\?/;
const REDUCE_REQUEST = /\/api\/redux\/ProblemProvider\/reduce\?/;
const REDUCTION_VIEW_REQUEST = /\/api\/redux\/ProblemProvider\/reductionView\?/;
const MAP_REQUEST = /\/api\/redux\/ProblemProvider\/mapSolution\?/;
const MAP_BACK_REQUEST = /\/api\/redux\/ProblemProvider\/mapSolutionBack\?/;
const VERIFY_REQUEST = /\/api\/redux\/ProblemProvider\/verify\?/;

const SECTIONS = ["visualization", "execute", "verify"];
const section = (page, key) => page.locator(`#workbench-section-${key}`);
const expand = (page, key) => page.locator(`#workbench-section-${key}-expand`);
const body = (page, key) => page.locator(`#workbench-section-${key}-body`);
const summary = (page, key) => page.locator(`#workbench-section-${key}-summary`);

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

/** Answers every compute request; the verifier accepts ANSWER, MAPPED and MAPPED_BACK. */
async function answerCompute(page) {
  await page.route(VISUALIZE_REQUEST, (route) => {
    const visualization = new URL(route.request().url()).searchParams.get("visualization") ?? "";
    return route.fulfill({
      json: /sat/i.test(visualization)
        ? [satFrame("Background"), satFrame("ElementHighlight"), satFrame("Solution")]
        : [],
    });
  });
  await page.route(SOLVE_REQUEST, (route) => {
    const solver = new URL(route.request().url()).searchParams.get("solver") ?? "";
    const target = /clique|carraghan|chiba/i.test(solver);
    return route.fulfill({ json: target ? TARGET_ANSWER : ANSWER });
  });
  // A backend without the Reduction View: Reduce builds through ProblemProvider/reduce.
  await page.route(REDUCTION_VIEW_REQUEST, (route) => route.fulfill({ status: 404, json: {} }));
  await page.route(REDUCE_REQUEST, (route) =>
    route.fulfill({ json: { reductionTo: { instance: TARGET_INSTANCE } } }),
  );
  await page.route(MAP_REQUEST, (route) => route.fulfill({ json: MAPPED }));
  await page.route(MAP_BACK_REQUEST, (route) => route.fulfill({ json: MAPPED_BACK }));
  await page.route(VERIFY_REQUEST, (route) => {
    const body = route.request().postDataJSON();
    const valid = [ANSWER, MAPPED, MAPPED_BACK].includes(body.certificate);
    return route.fulfill({ json: valid ? "True" : "False" });
  });
}

const textOf = async (locator) => ((await locator.textContent()) ?? "").trim();

async function setExpanded(page, key, expanded) {
  const button = expand(page, key);
  if ((await button.getAttribute("aria-expanded")) !== String(expanded)) await button.click();
  await expect(button).toHaveAttribute("aria-expanded", String(expanded));
}

test("each Workspace section has Show less and Show all, like Details and Instance, and collapses on its own to a summary line", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  for (const key of SECTIONS) {
    const button = expand(page, key);
    // The same button as Details and Instance: its label, its state and what it controls.
    await expect(button).toHaveText("Show less");
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(button).toHaveAttribute("aria-controls", `workbench-section-${key}-body`);
    expect(await button.evaluate((element) => element.tagName)).toBe("BUTTON");
    await expect(summary(page, key)).toHaveCount(0);
    // At the right of the section's heading, on its line.
    const heading = await page.locator(`#workbench-section-${key}-heading`).boundingBox();
    const box = await button.boundingBox();
    expect(box.x).toBeGreaterThan(heading.x + heading.width);
    expect(box.y).toBeLessThan(heading.y + heading.height);
  }
  await expect(page.locator("#workbench-details-expand")).toHaveText("Show all");

  // Visualization: the problem and its Visualization Type.
  const type = await textOf(page.locator("#workbench-source-type-value"));
  await expand(page, "visualization").click();
  await expect(expand(page, "visualization")).toHaveText("Show all");
  await expect(expand(page, "visualization")).toHaveAttribute("aria-expanded", "false");
  await expect(body(page, "visualization")).toBeHidden();
  await expect(summary(page, "visualization")).toHaveText(`${PROBLEM} · ${type}`);
  // The others are still open: each collapses on its own.
  await expect(body(page, "execute")).toBeVisible();
  await expect(body(page, "verify")).toBeVisible();
  // Keyboard: Enter on the button opens it again.
  await expand(page, "visualization").focus();
  await page.keyboard.press("Enter");
  await expect(body(page, "visualization")).toBeVisible();

  // Execute: the mode and the solver, then the latest run's chip with its time.
  const solver = await textOf(page.locator("#workbench-solver-value"));
  await expand(page, "execute").click();
  await expect(summary(page, "execute")).toHaveText(`Solve · ${solver} · Not run yet`);
  await expand(page, "execute").click();
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-run-chip")).toHaveText(/^Answer found/);
  await expand(page, "execute").click();
  await expect(summary(page, "execute")).toHaveText(
    new RegExp(
      `^Solve · ${solver.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} · Answer found · \\d+\\.\\d\\d s$`,
    ),
  );
  await expect(page.locator("#workbench-execute-summary-chip")).toHaveAttribute("data-tone", "ok");

  // Verify: each side's latest verdict, or Not checked; what is typed survives collapsing.
  const field = page.locator("#workbench-verify-source-certificate");
  await field.fill(ANSWER);
  await expand(page, "verify").click();
  await expect(summary(page, "verify")).toHaveText(`${PROBLEM}: Not checked`);
  await expand(page, "verify").click();
  await expect(field).toHaveValue(ANSWER);
  await page.locator("#workbench-verify-source-check").click();
  await expect(page.locator("#workbench-verify-source-verdict")).toHaveAttribute(
    "data-valid",
    "true",
  );
  await expand(page, "verify").click();
  await expect(summary(page, "verify")).toHaveText(`${PROBLEM}: Valid`);

  // A reload remembers which are collapsed; Reset layout opens them all.
  await setExpanded(page, "visualization", false);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: PROBLEM })).toBeVisible({
    timeout: 20_000,
  });
  for (const key of SECTIONS) {
    await expect(expand(page, key)).toHaveAttribute("aria-expanded", "false");
    await expect(summary(page, key)).toBeVisible();
  }
  await page.locator("#workbench-layout-reset").click();
  for (const key of SECTIONS) {
    await expect(expand(page, key)).toHaveAttribute("aria-expanded", "true");
    await expect(body(page, key)).toBeVisible();
  }
});

test("a run never opens a collapsed Visualization, though Algorithm Steps inside it opens by itself", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await setExpanded(page, "visualization", false);
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-run-chip")).toHaveText(/^Answer found/);
  await expect(expand(page, "visualization")).toHaveAttribute("aria-expanded", "false");
  await expect(body(page, "visualization")).toBeHidden();
  await setExpanded(page, "visualization", true);
  await expect(page.locator("#workbench-algorithm-steps-toggle")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
});

test("Reduce mode's summaries name both sides and the reduction", async ({ page }) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await page.locator("#workbench-mode-reduce").click();
  const target = await chooseReduceTarget(page, /^Clique(?!\s*Cover)/, { expect });
  const reduction = await textOf(page.locator("#workbench-reduction-value"));
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-run-chip")).toHaveText(/^Built/);

  const sourceType = await textOf(page.locator("#workbench-source-type-value"));
  const targetType = await textOf(page.locator("#workbench-target-type-value"));
  for (const key of SECTIONS) await setExpanded(page, key, false);
  await expect(summary(page, "visualization")).toHaveText(
    `${PROBLEM} · ${sourceType} → ${target} · ${targetType}`,
  );
  await expect(summary(page, "execute")).toContainText(`Reduce · ${reduction} · `);
  await expect(page.locator("#workbench-execute-summary-chip")).toHaveText(/^Built · \d+\.\d\d s$/);
  await expect(summary(page, "verify")).toHaveText(
    `${PROBLEM}: Not checked · ${target}: Not checked`,
  );

  // The latest run's chip: solving the source after the build shows the solve's chip.
  await setExpanded(page, "execute", true);
  await page.locator("#workbench-source-cell-run").click();
  await expect(page.locator("#workbench-source-cell-run-chip")).toHaveText(/^Answer found/);
  await setExpanded(page, "execute", false);
  await expect(page.locator("#workbench-execute-summary-chip")).toHaveText(/^Answer found/);
});

test("Check it opens a collapsed Verify, as it opens a hidden one", async ({ page }) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await showPane(page, "verify", { expect });
  await setExpanded(page, "verify", false);
  await page.locator("#workbench-run").click();
  await page.locator("#workbench-result-verify-answer").click();
  await expect(expand(page, "verify")).toHaveAttribute("aria-expanded", "true");
  await expect(body(page, "verify")).toBeVisible();
  await expect(page.locator("#workbench-verify-source-certificate")).toHaveValue(ANSWER);
  await expect(page.locator("#workbench-verify-source-verdict")).toHaveAttribute(
    "data-valid",
    "true",
  );
  await expect(section(page, "verify")).toHaveAttribute("data-expanded", "true");
});

test("at phone width a collapsed section's summary wraps and nothing scrolls sideways", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await page.locator("#workbench-mode-reduce").click();
  await chooseReduceTarget(page, /^Clique(?!\s*Cover)/, { expect });
  for (const key of SECTIONS) await setExpanded(page, key, false);
  for (const key of SECTIONS) await expect(summary(page, key)).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("collapsed, Instance's field sits on its title's line, and it and every summary start at Details' x", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  const field = page.locator("#workbench-instance-full-instance");
  const leftEdges = async () => {
    const lines = [
      page.locator("#workbench-details-summary"),
      field,
      ...SECTIONS.map((key) => summary(page, key)),
    ];
    return Promise.all(lines.map(async (line) => (await line.boundingBox()).x));
  };

  for (const mode of ["solve", "reduce"]) {
    if (mode === "reduce") {
      // The mode switch is in Execute, collapsed by the Solve round.
      await setExpanded(page, "execute", true);
      await page.locator("#workbench-mode-reduce").click();
      await chooseReduceTarget(page, /^Clique(?!\s*Cover)/, { expect });
    }
    for (const key of SECTIONS) await setExpanded(page, key, false);

    // Instance's one-line field: on the title's line, to the right of the title, still editable.
    const heading = await page.locator("#workbench-instance-pane-heading").boundingBox();
    const box = await field.boundingBox();
    expect(box.x).toBeGreaterThan(heading.x + heading.width);
    expect(box.y).toBeLessThan(heading.y + heading.height);
    expect(box.y + box.height).toBeGreaterThan(heading.y);
    await expect(field).toBeEditable();

    // One tab stop: Details' summary, Instance's field and the three sections' summaries.
    const [details, ...rest] = await leftEdges();
    for (const x of rest) expect(Math.abs(x - details)).toBeLessThanOrEqual(1);
  }

  // Typed text survives Show all and Show less: it is the same field throughout.
  const edited = "(x1 | x2 | !x3)";
  await field.fill(edited);
  await page.locator("#workbench-instance-expand").click();
  await expect(field).toHaveAttribute("rows", "3");
  await expect(field).toHaveValue(edited);
  await page.locator("#workbench-instance-expand").click();
  await expect(field).toHaveAttribute("rows", "1");
  await expect(field).toHaveValue(edited);
});
