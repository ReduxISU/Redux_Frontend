// tests/e2e/workspace-sections.spec.js
//
// #279 (Workspace tweaks): Visualization, Execute and Verify are panes of their own, like Details
// and Instance (no Workspace card or title), each with the same title, frame and Show all / Show
// less, and each collapses on its own. Every pane starts collapsed but Visualization, unless the
// viewer saved a layout. Collapsed, Visualization keeps each picture's problem with its live
// Visualization Type dropdown; Execute and Verify keep their top controls, live, on the title's
// line, like Instance's field (the director's asks, Oct 21):
//   - Execute: the Mode switch, then Solve mode's Solver, Solve and its chip, or Reduce mode's
//     Target (with its complexity class tag), Reduction, Reduce and the build's chip; none of
//     Reduce mode's cells or results. Switching the mode there swaps them, and Verify's;
//   - Verify: the verifier dropdown (the problem's verifiers, as Redux lists them), the
//     certificate field, Check (and Enter in the field), and a chip with the verdict and its time;
//     in Reduce mode first a Problem to verify choice, whose target waits for Reduce.
// A collapsed control is the expanded one (or, for Visualization's dropdowns, on the same state),
// so what is picked or typed shows both ways. What a pane holds survives collapsing, the layout
// remembers it through a reload until Reset layout, Check it opens a collapsed Verify, and
// Algorithm Steps opening by itself after a run never opens a collapsed Visualization. Collapsed,
// every pane's line starts at one x. The toggles are a pane too ("Panes"), not collapsible, and
// each picture's Visualization Type dropdown grows up to its view controls.
//
// The catalog comes from the real backend, like the rest of the suite; every compute request is
// answered here (see workbench.spec.js for why).

import { expect, test } from "./fixtures";
import { chooseReduceTarget, gotoProblemDetail, showPane } from "./helpers";

const PROBLEM = "3SAT";
const ANSWER = "(x1:True,x2:False,x3:True)";
const WRONG = "(x1:False,x2:True,x3:False)";
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
// The collapsed Visualization pane's line: each side's problem and its Visualization Type.
const SUMMARY = "#workbench-section-visualization-summary";
const PANES = {
  toggles: "#workbench-toggles-pane",
  details: "#workbench-details-pane",
  instance: "#workbench-instance-pane",
  visualization: "#workbench-section-visualization",
  execute: "#workbench-section-execute",
  verify: "#workbench-section-verify",
};
const TITLES = {
  toggles: "#workbench-toggles-heading",
  details: "#workbench-details-pane-heading",
  instance: "#workbench-instance-pane-heading",
  visualization: "#workbench-section-visualization-heading",
  execute: "#workbench-section-execute-heading",
  verify: "#workbench-section-verify-heading",
};

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

/** Picks the option matching `pattern` from one of the page's tagged dropdowns. */
async function pick(page, id, pattern) {
  await page.locator(`#${id}-button`).click();
  await page
    .locator(`#${id}-listbox`)
    .getByRole("option")
    .filter({ has: page.locator('[id$="-name"]', { hasText: pattern }) })
    .first()
    .click();
  await expect(page.locator(`#${id}-value`)).toHaveText(pattern);
}

/** The option labels of one of the page's tagged dropdowns. */
async function optionsOf(page, id) {
  await page.locator(`#${id}-button`).click();
  const labels = await page
    .locator(`#${id}-listbox`)
    .locator('[role="option"] [id$="-name"]')
    .allTextContents();
  await page.keyboard.press("Escape");
  await expect(page.locator(`#${id}-listbox`)).toBeHidden();
  return labels;
}

/** Holds every request matching `pattern` until the returned function is called. */
async function holdRequests(page, pattern, json) {
  let release;
  const released = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(pattern, async (route) => {
    await released;
    await route.fulfill({ json });
  });
  return () => release();
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TIME = "\\d+\\.\\d\\d s";

test("Visualization, Execute and Verify have Show all and Show less like Details and Instance, start collapsed but Visualization, and collapse on their own", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  // A viewer with no saved layout: every pane collapsed but Visualization.
  const defaults = {
    details: false,
    instance: false,
    visualization: true,
    execute: false,
    verify: false,
  };
  for (const [key, expanded] of Object.entries(defaults)) {
    const button = page.locator(
      SECTIONS.includes(key) ? `#workbench-section-${key}-expand` : `#workbench-${key}-expand`,
    );
    await expect(button, key).toHaveAttribute("aria-expanded", String(expanded));
    await expect(button, key).toHaveText(expanded ? "Show less" : "Show all");
  }
  for (const key of SECTIONS) {
    const button = expand(page, key);
    // The same button as Details and Instance: what it controls, at the right of the title.
    await expect(button).toHaveAttribute("aria-controls", `workbench-section-${key}-body`);
    expect(await button.evaluate((element) => element.tagName)).toBe("BUTTON");
    const heading = await page.locator(`#workbench-section-${key}-heading`).boundingBox();
    const box = await button.boundingBox();
    expect(box.x).toBeGreaterThan(heading.x + heading.width);
    expect(box.y).toBeLessThan(heading.y + heading.height);
  }
  await expect(summary(page, "visualization")).toHaveCount(0);
  await expect(body(page, "visualization")).toBeVisible();
  // Execute and Verify start on their title's line: the top controls, not the rest.
  await expect(page.locator("#workbench-run")).toBeVisible();
  await expect(page.locator("#workbench-controls-more")).toBeHidden();
  await expect(page.locator("#workbench-verify-source-certificate")).toBeVisible();
  await expect(page.locator("#workbench-verify-source-toggle")).toBeHidden();

  // Opened, they hold everything.
  await setExpanded(page, "execute", true);
  await setExpanded(page, "verify", true);
  // What is under the row may be empty before a run, so its own `hidden` tells.
  await expect(page.locator("#workbench-controls-more")).toHaveJSProperty("hidden", false);
  await expect(page.locator("#workbench-verify-source-toggle")).toBeVisible();

  // Visualization collapses to its pictures' problems, each with its Visualization Type dropdown.
  const type = await textOf(page.locator("#workbench-source-type-value"));
  await expand(page, "visualization").click();
  await expect(expand(page, "visualization")).toHaveText("Show all");
  await expect(expand(page, "visualization")).toHaveAttribute("aria-expanded", "false");
  await expect(body(page, "visualization")).toBeHidden();
  await expect(page.locator(`${SUMMARY}-source-problem`)).toHaveText(PROBLEM);
  await expect(page.locator(`${SUMMARY}-source-type-value`)).toHaveText(type);
  await expect(page.locator(`${SUMMARY}-target-problem`)).toHaveCount(0);
  // The others are still open: each collapses on its own.
  // What is under the row may be empty before a run, so its own `hidden` tells.
  await expect(page.locator("#workbench-controls-more")).toHaveJSProperty("hidden", false);
  await expect(page.locator("#workbench-verify-source-toggle")).toBeVisible();
  // Keyboard: Enter on the button opens it again.
  await expand(page, "visualization").focus();
  await page.keyboard.press("Enter");
  await expect(body(page, "visualization")).toBeVisible();

  // Execute and Verify have no summary: their top controls stay, and the rest is hidden.
  await setExpanded(page, "execute", false);
  await expect(summary(page, "execute")).toHaveCount(0);
  await expect(page.locator("#workbench-solver-button")).toBeVisible();
  await expect(page.locator("#workbench-run")).toHaveText("Solve");
  await expect(page.locator("#workbench-controls-more")).toBeHidden();
  const field = page.locator("#workbench-verify-source-certificate");
  await field.fill(ANSWER);
  await setExpanded(page, "verify", false);
  await expect(summary(page, "verify")).toHaveCount(0);
  await expect(field).toBeVisible();
  await expect(field).toHaveValue(ANSWER);
  await expect(page.locator("#workbench-verify-source-toggle")).toBeHidden();
  await expect(page.locator("#workbench-verify-source-use-answer")).toBeHidden();

  // A reload remembers the viewer's layout over the defaults; Reset layout goes back to them.
  await setExpanded(page, "visualization", false);
  await setExpanded(page, "execute", true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: PROBLEM })).toBeVisible({
    timeout: 20_000,
  });
  await expect(expand(page, "visualization")).toHaveAttribute("aria-expanded", "false");
  await expect(expand(page, "execute")).toHaveAttribute("aria-expanded", "true");
  await expect(expand(page, "verify")).toHaveAttribute("aria-expanded", "false");
  await expect(summary(page, "visualization")).toBeVisible();
  // What is under the row may be empty before a run, so its own `hidden` tells.
  await expect(page.locator("#workbench-controls-more")).toHaveJSProperty("hidden", false);
  await expect(page.locator("#workbench-verify-source-certificate")).toBeVisible();
  await page.locator("#workbench-layout-reset").click();
  for (const key of SECTIONS) {
    await expect(expand(page, key)).toHaveAttribute(
      "aria-expanded",
      String(key === "visualization"),
    );
  }
  await expect(body(page, "visualization")).toBeVisible();
  await expect(page.locator("#workbench-controls-more")).toBeHidden();
});

test("Visualization, Execute and Verify are panes like Details and Instance: the same frame, gaps and title, and no Workspace", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await expect(page.locator("#workbench-workspace")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Workspace", exact: true })).toHaveCount(0);

  const frame = (selector) =>
    page.locator(selector).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        border: `${style.borderTopWidth} ${style.borderTopStyle} ${style.borderTopColor}`,
        radius: style.borderTopLeftRadius,
        background: style.backgroundColor,
        padding: `${style.paddingLeft} ${style.paddingRight}`,
      };
    });
  const title = (selector) =>
    page.locator(selector).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        tag: element.tagName,
        size: style.fontSize,
        weight: style.fontWeight,
        color: style.color,
        transform: style.textTransform,
        spacing: style.letterSpacing,
        minWidth: style.minWidth,
      };
    });
  const details = await frame(PANES.details);
  const detailsTitle = await title(TITLES.details);
  expect(detailsTitle.tag).toBe("H2");
  for (const key of Object.keys(PANES)) {
    expect(await frame(PANES[key]), key).toEqual(details);
    expect(await title(TITLES[key]), key).toEqual(detailsTitle);
    await expect(
      page.getByRole("region", { name: await textOf(page.locator(TITLES[key])) }),
    ).toHaveId(PANES[key].slice(1));
  }

  // One pane after another, the same gap between each.
  const boxes = [];
  for (const selector of Object.values(PANES))
    boxes.push(await page.locator(selector).boundingBox());
  const gaps = boxes.slice(1).map((box, index) => box.y - (boxes[index].y + boxes[index].height));
  for (const gap of gaps) expect(Math.abs(gap - gaps[0])).toBeLessThan(1);
  expect(gaps[0]).toBeGreaterThan(0);
  // Full width, each.
  for (const box of boxes) expect(Math.abs(box.width - boxes[1].width)).toBeLessThan(1);
});

test("the toggles are a Panes pane: titled like the others, never collapsing, the buttons at the panes' tab stop, 44 px tall", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  const pane = page.locator(PANES.toggles);
  await expect(page.getByRole("region", { name: "Panes" })).toHaveId("workbench-toggles-pane");
  await expect(pane.getByRole("button", { name: /Show (all|less)/ })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Panes on this page" })).toBeVisible();
  // One row at 1440 px: the title, the five toggles and Reset layout.
  const titleBox = await page.locator(TITLES.toggles).boundingBox();
  const first = await page.locator("#workbench-toggle-details").boundingBox();
  const reset = await page.locator("#workbench-layout-reset").boundingBox();
  expect(Math.abs(first.y + first.height / 2 - (reset.y + reset.height / 2))).toBeLessThan(2);
  expect(first.y).toBeLessThan(titleBox.y + titleBox.height);
  expect(reset.height).toBeGreaterThanOrEqual(44);
  expect(first.height).toBeGreaterThanOrEqual(44);
  // The toggles start where Details' summary does.
  const detailsSummary = await page.locator("#workbench-details-summary").boundingBox();
  expect(Math.abs(first.x - detailsSummary.x)).toBeLessThanOrEqual(1);
  // Keyboard order: the toggles, then Reset layout.
  await page.locator("#workbench-toggle-details").focus();
  for (const key of ["instance", "visualization", "execute", "verify"]) {
    await page.keyboard.press("Tab");
    await expect(page.locator(`#workbench-toggle-${key}`)).toBeFocused();
  }
  await page.keyboard.press("Tab");
  await expect(page.locator("#workbench-layout-reset")).toBeFocused();

  // On a phone the title takes its line and the toggles sit two to a row under it.
  await page.setViewportSize({ width: 390, height: 844 });
  const phoneTitle = await page.locator(TITLES.toggles).boundingBox();
  const details = await page.locator("#workbench-toggle-details").boundingBox();
  const instance = await page.locator("#workbench-toggle-instance").boundingBox();
  expect(details.y).toBeGreaterThanOrEqual(phoneTitle.y + phoneTitle.height - 1);
  expect(Math.abs(details.y - instance.y)).toBeLessThan(2);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
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

test("collapsed Execute in Solve mode: the Mode switch, Solver, Solve and its chip work, and share their state with the expanded pane", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await setExpanded(page, "execute", false);
  await setExpanded(page, "verify", false);
  // The Mode switch leads the line, 44 px tall, Solve pressed.
  const solveMode = page.locator("#workbench-mode-solve");
  const reduceMode = page.locator("#workbench-mode-reduce");
  await expect(solveMode).toBeVisible();
  await expect(solveMode).toHaveAttribute("aria-pressed", "true");
  expect((await solveMode.boundingBox()).height).toBeGreaterThanOrEqual(44);
  expect((await solveMode.boundingBox()).x).toBeLessThan(
    (await page.locator("#workbench-solver-button").boundingBox()).x,
  );
  // Switching the mode collapsed swaps the line's controls, and Verify's, as expanded.
  await reduceMode.click();
  await expect(reduceMode).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#workbench-solver-button")).toHaveCount(0);
  await expect(page.locator("#workbench-target-button")).toBeVisible();
  await expect(page.locator("#workbench-reduction-button")).toBeVisible();
  await expect(page.locator("#workbench-run")).toHaveText("Reduce");
  await expect(page.locator("#workbench-verify-side")).toBeVisible();
  await expect(page.locator("#workbench-controls-more")).toBeHidden();
  await setExpanded(page, "execute", true);
  await expect(reduceMode).toHaveAttribute("aria-pressed", "true");
  await setExpanded(page, "execute", false);
  await solveMode.click();
  await expect(solveMode).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#workbench-target-button")).toHaveCount(0);
  await expect(page.locator("#workbench-solver-button")).toBeVisible();
  await expect(page.locator("#workbench-run")).toHaveText("Solve");
  await expect(page.locator("#workbench-verify-side")).toHaveCount(0);

  // Picking a solver collapsed is the pick expanded, and back.
  const solvers = await optionsOf(page, "workbench-solver");
  expect(solvers.length).toBeGreaterThan(1);
  const [first, second] = solvers.map((label) => new RegExp(`^${escapeRegExp(label.trim())}$`));
  await pick(page, "workbench-solver", second);
  await setExpanded(page, "execute", true);
  await expect(page.locator("#workbench-solver-value")).toHaveText(second);
  await pick(page, "workbench-solver", first);
  await setExpanded(page, "execute", false);
  await expect(page.locator("#workbench-solver-value")).toHaveText(first);

  // Solve, collapsed: the running chip with its clock and Cancel, then the answer with its time.
  const release = await holdRequests(page, SOLVE_REQUEST, ANSWER);
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-run-chip")).toHaveText(/^Running\.\.\. \d+:\d\d$/);
  await expect(page.locator("#workbench-run-cancel")).toBeVisible();
  // The busy line is under the row, so it stays hidden with the rest.
  await expect(page.locator("#workbench-run-busy")).toBeHidden();
  release();
  await expect(page.locator("#workbench-run-chip")).toHaveText(
    new RegExp(`^Answer found · ${TIME}$`),
  );
  await expect(page.locator("#workbench-run-chip")).toHaveAttribute("data-tone", "ok");
  await expect(page.locator("#workbench-result-solve")).toBeHidden();
  // Expanded, the same run: its chip and its result.
  const chip = await textOf(page.locator("#workbench-run-chip"));
  await setExpanded(page, "execute", true);
  await expect(page.locator("#workbench-run-chip")).toHaveText(chip);
  await expect(page.locator("#workbench-result-solve")).toBeVisible();
});

test("collapsed Execute in Reduce mode: Target, Reduction, Reduce and the build's chip, without the cells", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await page.locator("#workbench-mode-reduce").click();
  await setExpanded(page, "execute", false);
  await expect(page.locator("#workbench-mode-reduce")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#workbench-solver-button")).toHaveCount(0);

  // Target and Reduction, picked collapsed, are the picks expanded.
  const target = await chooseReduceTarget(page, /^Clique(?!\s*Cover)/, { expect });
  const reductions = await optionsOf(page, "workbench-reduction");
  expect(reductions.length).toBeGreaterThan(0);
  const reduction = await textOf(page.locator("#workbench-reduction-value"));
  await expect(page.locator("#workbench-run")).toHaveText("Reduce");
  // Reduce mode's cells and results row are for the expanded section.
  await expect(page.locator("#workbench-cells")).toBeHidden();
  await expect(page.locator("#workbench-source-cell-run")).toBeHidden();

  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-run-chip")).toHaveText(new RegExp(`^Built · ${TIME}$`));
  await expect(page.locator("#workbench-run-chip")).toHaveAttribute("data-tone", "ok");

  // The collapsed Visualization line names both sides, each with its Visualization Type.
  const sourceType = await textOf(page.locator("#workbench-source-type-value"));
  const targetType = await textOf(page.locator("#workbench-target-type-value"));
  await setExpanded(page, "visualization", false);
  await expect(page.locator(`${SUMMARY}-source-problem`)).toHaveText(PROBLEM);
  await expect(page.locator(`${SUMMARY}-source-type-value`)).toHaveText(sourceType);
  await expect(page.locator(`${SUMMARY}-target-problem`)).toHaveText(target);
  await expect(page.locator(`${SUMMARY}-target-type-value`)).toHaveText(targetType);
  // In that order: source, arrow, target.
  await expect(summary(page, "visualization")).toContainText("→");
  expect((await page.locator(`${SUMMARY}-source-type-button`).boundingBox()).x).toBeLessThan(
    (await page.locator(`${SUMMARY}-target-problem`).boundingBox()).x,
  );

  await setExpanded(page, "execute", true);
  await expect(page.locator("#workbench-mode-reduce")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#workbench-target-value")).toHaveText(target);
  await expect(page.locator("#workbench-reduction-value")).toHaveText(reduction);
  await expect(page.locator("#workbench-source-cell-run")).toBeVisible();
  // Solving a side expanded doesn't change the collapsed row's chip: it is the build's.
  await page.locator("#workbench-source-cell-run").click();
  await expect(page.locator("#workbench-source-cell-run-chip")).toHaveText(/^Answer found/);
  await setExpanded(page, "execute", false);
  await expect(page.locator("#workbench-run-chip")).toHaveText(/^Built/);
});

test("collapsed Verify in Solve mode: the verifier, the certificate, Check and Enter, and the verdict with its time, shared with the strip", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  const field = page.locator("#workbench-verify-source-certificate");
  const chip = page.locator("#workbench-verify-source-chip");
  await setExpanded(page, "verify", false);

  // The verifier dropdown lists the verifiers Redux declares for the problem (one, today).
  const declared = await (
    await page.request.get("/api/redux/Navigation/Batch/allVerifiers")
  ).json();
  const verifiers = await optionsOf(page, "workbench-verify-source-verifier");
  expect(verifiers).toHaveLength(declared.SAT3.length);
  const verifier = await textOf(page.locator("#workbench-verify-source-verifier-value"));
  expect(verifier).toBeTruthy();
  await pick(page, "workbench-verify-source-verifier", new RegExp(`^${escapeRegExp(verifier)}`));

  await expect(chip).toHaveText("Not checked");
  // Enter checks, and the chip says the verdict and how long it took.
  await field.fill(WRONG);
  await field.press("Enter");
  await expect(chip).toHaveText(new RegExp(`^Not valid · ${TIME}$`));
  await expect(chip).toHaveAttribute("data-tone", "err");
  await expect(chip).toHaveAttribute("aria-label", /^Not valid, \d+\.\d\d s, round trip$/);
  await expect(field).toHaveValue(WRONG);
  // While a check runs the chip says so.
  const release = await holdRequests(page, VERIFY_REQUEST, "True");
  await field.fill(ANSWER);
  await page.locator("#workbench-verify-source-check").click();
  await expect(chip).toHaveText(/^Checking\.\.\. \d+:\d\d$/);
  release();
  await expect(chip).toHaveText(new RegExp(`^Valid · ${TIME}$`));
  await expect(chip).toHaveAttribute("data-tone", "ok");

  // Expanded, the strip has the same text, the same verifier and the same verdict, with its time.
  await setExpanded(page, "verify", true);
  await expect(field).toHaveValue(ANSWER);
  await expect(page.locator("#workbench-verify-source-verifier-value")).toHaveText(verifier);
  await expect(page.locator("#workbench-verify-source-verdict")).toHaveAttribute(
    "data-valid",
    "true",
  );
  await expect(page.locator("#workbench-verify-source-verdict-time")).toHaveText(
    new RegExp(`^Took ${TIME} \\(round trip\\)$`),
  );
  await expect(chip).toHaveCount(0);
  // Typed expanded, shown collapsed: the verdict no longer matches the field.
  await field.fill(WRONG);
  await setExpanded(page, "verify", false);
  await expect(field).toHaveValue(WRONG);
  await expect(chip).toHaveText("Changed · check again");
});

test("collapsed Verify in Reduce mode: Problem to verify picks the side, its target waiting for Reduce", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await page.locator("#workbench-mode-reduce").click();
  const target = await chooseReduceTarget(page, /^Clique(?!\s*Cover)/, { expect });
  await setExpanded(page, "verify", false);

  const choice = page.locator("#workbench-verify-side");
  const sourceChoice = page.locator("#workbench-verify-side-source");
  const targetChoice = page.locator("#workbench-verify-side-target");
  await expect(choice).toHaveAttribute("role", "group");
  await expect(page.locator("#workbench-verify-side-label")).toHaveText("Problem to verify");
  await expect(sourceChoice).toHaveText(PROBLEM);
  await expect(sourceChoice).toHaveAttribute("aria-pressed", "true");
  await expect(targetChoice).toHaveText(target);
  // The target waits for Reduce, saying why.
  await expect(targetChoice).toBeDisabled();
  await expect(targetChoice).toHaveAttribute(
    "aria-describedby",
    "workbench-verify-side-target-reason",
  );
  await expect(page.locator("#workbench-verify-side-target-reason")).toHaveText(
    `Reduce first: a ${target} certificate is checked against the instance Reduce builds.`,
  );
  await expect(page.locator("#workbench-verify-source-certificate")).toBeVisible();
  await expect(page.locator("#workbench-verify-target-certificate")).toBeHidden();

  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-run-chip")).toHaveText(/^Built/);
  await expect(targetChoice).toBeEnabled();
  await targetChoice.click();
  await expect(targetChoice).toHaveAttribute("aria-pressed", "true");
  await expect(sourceChoice).toHaveAttribute("aria-pressed", "false");
  const field = page.locator("#workbench-verify-target-certificate");
  await expect(field).toBeVisible();
  await expect(page.locator("#workbench-verify-source-certificate")).toBeHidden();
  // The target's own verifier.
  const verifier = await textOf(page.locator("#workbench-verify-target-verifier-value"));
  expect(verifier).toMatch(/clique/i);
  await field.fill(MAPPED);
  await field.press("Enter");
  await expect(page.locator("#workbench-verify-target-chip")).toHaveText(
    new RegExp(`^Valid · ${TIME}$`),
  );

  // Expanded, the target strip holds the same text and verdict.
  await setExpanded(page, "verify", true);
  await expect(choice).toHaveCount(0);
  await expect(field).toHaveValue(MAPPED);
  await expect(page.locator("#workbench-verify-target-verdict")).toHaveAttribute(
    "data-valid",
    "true",
  );
  await setExpanded(page, "verify", false);
  await expect(targetChoice).toHaveAttribute("aria-pressed", "true");

  // An instance edit retires the build: the target waits again and the line checks the source.
  await page.locator("#workbench-instance-full-instance").fill("(x1 | x2 | !x3)");
  await expect(targetChoice).toBeDisabled();
  await expect(sourceChoice).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#workbench-verify-source-certificate")).toBeVisible();
});

// A second 3SAT verifier, as Redux would list it once a contributor adds one (ReduxISU/Redux#877
// discusses "valid" and "optimal" verifiers). allVerifiers sorts class names, so it comes first
// there; the problem's defaultVerifier still leads the dropdown.
const SECOND_VERIFIER = "SAT3OptimalVerifier";
const SECOND_VERIFIER_NAME = "Optimal 3SAT Verifier";

/** Adds SECOND_VERIFIER to the real catalog's allVerifiers and allInfo answers. */
async function addSecondVerifier(page) {
  await page.route(/\/api\/redux\/Navigation\/Batch\/allVerifiers/, async (route) => {
    const json = await (await route.fetch()).json();
    json.SAT3 = [SECOND_VERIFIER, ...(json.SAT3 ?? [])];
    await route.fulfill({ json });
  });
  await page.route(/\/api\/redux\/Navigation\/Batch\/allInfo/, async (route) => {
    const json = await (await route.fetch()).json();
    json[SECOND_VERIFIER] = {
      verifierName: SECOND_VERIFIER_NAME,
      verifierDefinition: "Checks that the certificate is an optimal assignment.",
      source: "",
      sourceFile: "Problems/NPComplete/NPC_SAT3/Verifiers/SAT3OptimalVerifier.cs",
      contributors: [],
      certificate: "",
    };
    await route.fulfill({ json });
  });
}

test("a second verifier from Redux appears in the dropdown, can be picked collapsed or expanded, and Check, Use the solver's answer and Check it send it", async ({
  page,
}) => {
  await answerCompute(page);
  await addSecondVerifier(page);
  const verifiersSent = [];
  page.on("request", (request) => {
    if (VERIFY_REQUEST.test(request.url())) {
      verifiersSent.push(new URL(request.url()).searchParams.get("verifier"));
    }
  });
  await gotoProblemDetail(page, PROBLEM, { expect });
  // Expanded Verify and Execute (they start collapsed): the strip and the result's Check it.
  await setExpanded(page, "verify", true);
  await setExpanded(page, "execute", true);
  const id = "workbench-verify-source-verifier";
  const value = page.locator(`#${id}-value`);
  const field = page.locator("#workbench-verify-source-certificate");

  // Both are listed, the problem's default verifier first and chosen.
  const names = await optionsOf(page, id);
  expect(names).toHaveLength(2);
  expect(names[1]).toBe(SECOND_VERIFIER_NAME);
  const defaultName = names[0];
  await expect(value).toHaveText(defaultName);

  // Picked expanded, shown collapsed; Enter there checks with it.
  await pick(page, id, new RegExp(`^${escapeRegExp(SECOND_VERIFIER_NAME)}$`));
  await setExpanded(page, "verify", false);
  await expect(value).toHaveText(SECOND_VERIFIER_NAME);
  await field.fill(ANSWER);
  await field.press("Enter");
  await expect(page.locator("#workbench-verify-source-chip")).toHaveText(/^Valid/);
  expect(verifiersSent.at(-1)).toBe(SECOND_VERIFIER);

  // Picked collapsed, shown expanded; the last verdict was another verifier's, so it is stale.
  await pick(page, id, new RegExp(`^${escapeRegExp(defaultName)}$`));
  await expect(page.locator("#workbench-verify-source-chip")).toHaveText("Changed · check again");
  await setExpanded(page, "verify", true);
  await expect(value).toHaveText(defaultName);
  await expect(page.locator("#workbench-verify-source-stale")).toBeVisible();
  await page.locator("#workbench-verify-source-check").click();
  await expect(page.locator("#workbench-verify-source-verdict")).toHaveAttribute(
    "data-valid",
    "true",
  );
  expect(verifiersSent.at(-1)).not.toBe(SECOND_VERIFIER);

  // Use the solver's answer and Check it use the chosen verifier too.
  await pick(page, id, new RegExp(`^${escapeRegExp(SECOND_VERIFIER_NAME)}$`));
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-run-chip")).toHaveText(/^Answer found/);
  const sent = verifiersSent.length;
  await page.locator("#workbench-verify-source-use-answer").click();
  await expect(page.locator("#workbench-verify-source-verdict")).toHaveAttribute(
    "data-valid",
    "true",
  );
  expect(verifiersSent.length).toBe(sent + 1);
  expect(verifiersSent.at(-1)).toBe(SECOND_VERIFIER);
  await setExpanded(page, "verify", false);
  await page.locator("#workbench-result-verify-answer").click();
  await expect(expand(page, "verify")).toHaveAttribute("aria-expanded", "true");
  await expect.poll(() => verifiersSent.length).toBe(sent + 2);
  expect(verifiersSent.at(-1)).toBe(SECOND_VERIFIER);
  await expect(value).toHaveText(SECOND_VERIFIER_NAME);
});

test("Check it opens a collapsed Verify, as it opens a hidden one", async ({ page }) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await showPane(page, "verify", { expect });
  await setExpanded(page, "verify", false);
  // Check it is in Execute's result, in the open pane.
  await setExpanded(page, "execute", true);
  await page.locator("#workbench-run").click();
  await page.locator("#workbench-result-verify-answer").click();
  await expect(expand(page, "verify")).toHaveAttribute("aria-expanded", "true");
  await expect(body(page, "verify")).toBeVisible();
  await expect(page.locator("#workbench-verify-source-toggle")).toBeVisible();
  await expect(page.locator("#workbench-verify-source-certificate")).toHaveValue(ANSWER);
  await expect(page.locator("#workbench-verify-source-verdict")).toHaveAttribute(
    "data-valid",
    "true",
  );
  await expect(section(page, "verify")).toHaveAttribute("data-expanded", "true");
});

test("at phone width the collapsed controls wrap under their headings, 44px tall, and nothing scrolls sideways", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await page.locator("#workbench-mode-reduce").click();
  await chooseReduceTarget(page, /^Clique(?!\s*Cover)/, { expect });
  for (const key of SECTIONS) await setExpanded(page, key, false);
  await expect(summary(page, "visualization")).toBeVisible();
  const controls = [
    "#workbench-mode-solve",
    "#workbench-mode-reduce",
    `${SUMMARY}-source-type-button`,
    `${SUMMARY}-target-type-button`,
    "#workbench-target-button",
    "#workbench-reduction-button",
    "#workbench-run",
    "#workbench-verify-side-source",
    "#workbench-verify-source-verifier-button",
    "#workbench-verify-source-certificate",
    "#workbench-verify-source-check",
  ];
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  for (const selector of controls) {
    const control = page.locator(selector);
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    expect(box.height, selector).toBeGreaterThanOrEqual(44);
    expect(box.x + box.width, selector).toBeLessThanOrEqual(width);
  }
  // Under the heading, not beside it.
  for (const key of ["execute", "verify"]) {
    const heading = await page.locator(`#workbench-section-${key}-heading`).boundingBox();
    const box = await body(page, key).boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(heading.y + heading.height - 1);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("collapsed, Instance's field and Execute's and Verify's controls sit on their title's line, and every line starts at Details' x", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  const field = page.locator("#workbench-instance-full-instance");
  // The first control on each collapsed line: Execute's Mode switch, Verify's verifier or, in
  // Reduce mode, its Problem to verify.
  const firstControls = {
    solve: ["#workbench-mode-solve", "#workbench-verify-source-verifier-button"],
    reduce: ["#workbench-mode-solve", "#workbench-verify-side"],
  };
  const leftEdges = async (mode) => {
    const lines = [
      page.locator("#workbench-details-summary"),
      page.locator("#workbench-toggles"),
      field,
      summary(page, "visualization"),
      page.locator(`${SUMMARY}-source-problem`),
      body(page, "execute"),
      body(page, "verify"),
      ...firstControls[mode].map((selector) => page.locator(selector)),
    ];
    return Promise.all(lines.map(async (line) => (await line.boundingBox()).x));
  };
  /** `inner` is on `heading`'s line, to its right, the heading level with it. */
  const onTitleLine = async (headingSelector, inner) => {
    const heading = await page.locator(headingSelector).boundingBox();
    const box = await inner.boundingBox();
    expect(box.x).toBeGreaterThan(heading.x + heading.width);
    expect(box.y).toBeLessThan(heading.y + heading.height);
    expect(box.y + box.height).toBeGreaterThan(heading.y);
  };

  for (const mode of ["solve", "reduce"]) {
    if (mode === "reduce") {
      // The mode switch is on Execute's collapsed line.
      await page.locator("#workbench-mode-reduce").click();
      await chooseReduceTarget(page, /^Clique(?!\s*Cover)/, { expect });
    }
    for (const key of SECTIONS) await setExpanded(page, key, false);

    // Instance's one-line field: on the title's line, to the right of the title, still editable.
    await onTitleLine("#workbench-instance-pane-heading", field);
    await expect(field).toBeEditable();
    // Execute's and Verify's controls and Visualization's dropdowns: on the title's line too, the
    // first at the tab stop.
    await onTitleLine("#workbench-section-execute-heading", page.locator("#workbench-run"));
    await onTitleLine(
      "#workbench-section-visualization-heading",
      page.locator(`${SUMMARY}-source-type-button`),
    );
    await onTitleLine(
      "#workbench-section-verify-heading",
      page.locator("#workbench-verify-source-certificate"),
    );

    // One tab stop: Details' summary, Instance's field, Visualization's summary, and Execute's
    // and Verify's first controls.
    const [details, ...rest] = await leftEdges(mode);
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

/**
 * Whether a tagged dropdown's closed box `id` is one line: its tags (if any) level with its name,
 * the box no taller than one 44 px row.
 */
async function expectOneLine(page, id) {
  const geometry = await page.evaluate((prefix) => {
    const rect = (element) => element?.getBoundingClientRect() ?? null;
    const value = rect(document.getElementById(`${prefix}-value`));
    const tags = rect(document.getElementById(`${prefix}-tags`));
    const button = rect(document.getElementById(`${prefix}-button`));
    return { value, tags, button };
  }, id);
  expect(geometry.button.height, id).toBeLessThanOrEqual(46);
  expect(geometry.button.height, id).toBeGreaterThanOrEqual(44);
  if (geometry.tags) {
    const middle = (box) => box.top + box.height / 2;
    expect(Math.abs(middle(geometry.tags) - middle(geometry.value)), id).toBeLessThanOrEqual(2);
    expect(geometry.tags.left, id).toBeGreaterThanOrEqual(geometry.value.right - 1);
    expect(geometry.tags.right, id).toBeLessThanOrEqual(geometry.button.right);
  }
}

/** A dropdown's full name stays whole in its tooltip, its accessible name and its value text. */
async function expectFullName(page, id, name) {
  const button = page.locator(`#${id}-button`);
  await expect(button).toHaveAttribute("title", name);
  await expect(page.locator(`#${id}-value`)).toHaveText(name);
  await expect(button).toHaveAccessibleName(new RegExp(`${escapeRegExp(name)}$`));
}

for (const width of [1440, 390]) {
  test(`at ${width}px every dropdown, collapsed or expanded, is one line, a long name cut with an ellipsis and whole in its tooltip, tags beside it`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await answerCompute(page);
    await gotoProblemDetail(page, PROBLEM, { expect });
    await page.locator("#workbench-mode-reduce").click();
    // 3SAT's longest reduction name where this backend has it ("Karp's 0-1 Integer Linear
    // Programming Reduction", two tags), else Clique (CI's backend).
    await page.locator("#workbench-target-button").click();
    const options = page.locator("#workbench-target-listbox").getByRole("option");
    const longest = (await options.filter({ hasText: /0-1 Integer/ }).count()) > 0;
    await page.keyboard.press("Escape");
    await chooseReduceTarget(page, longest ? /0-1 Integer/ : /^Clique(?!\s*Cover)/, { expect });
    const reduction = await textOf(page.locator("#workbench-reduction-value"));

    // Expanded, every dropdown is one line too: Target, Reduction, each side's solver and the
    // Visualization Type (Verify's verifiers are checked expanded below).
    for (const key of SECTIONS) await setExpanded(page, key, true);
    for (const id of [
      "workbench-target",
      "workbench-reduction",
      "workbench-source-cell-solver",
      "workbench-target-cell-solver",
      "workbench-source-type",
    ]) {
      await expect(page.locator(`#${id}-button`)).toHaveAttribute("data-one-line", "true");
      await expectOneLine(page, id);
    }
    await expectFullName(page, "workbench-reduction", reduction);
    await expect(page.locator("#workbench-verify-source-verifier-button")).toBeVisible();
    await expectOneLine(page, "workbench-verify-source-verifier");

    for (const key of SECTIONS) await setExpanded(page, key, false);
    // The target's Visualization Type shows when Redux lists a picture for it (CI's backend may
    // not, for Clique, until a build).
    const targetType = `${SUMMARY.slice(1)}-target-type`;
    const hasTargetType = (await page.locator(`#${targetType}-button`).count()) > 0;
    const boxes = [
      `${SUMMARY.slice(1)}-source-type`,
      ...(hasTargetType ? [targetType] : []),
      "workbench-target",
      "workbench-reduction",
    ];
    for (const id of boxes) {
      await expect(page.locator(`#${id}-button`)).toBeVisible();
      await expect(page.locator(`#${id}-button`)).toHaveAttribute("data-one-line", "true");
      await expectOneLine(page, id);
    }
    // The reduction's name, cut on screen past ~31 characters, is whole for everyone else.
    await expectFullName(page, "workbench-reduction", reduction);
    if (longest) {
      expect(
        await page
          .locator("#workbench-reduction-value")
          .evaluate((element) => element.scrollWidth > element.clientWidth),
      ).toBe(true);
    }
    // ...and in the open list.
    await page.locator("#workbench-reduction-button").click();
    await expect(
      page
        .locator("#workbench-reduction-listbox")
        .locator('[role="option"][aria-selected="true"] [id$="-name"]'),
    ).toHaveText(reduction);
    await page.keyboard.press("Escape");
    await expect(page.locator("#workbench-reduction-button")).toBeFocused();

    // Verify's verifier, collapsed, is one line too (Solve mode, where it shows).
    await page.locator("#workbench-mode-solve").click();
    await expect(page.locator("#workbench-verify-source-verifier-button")).toBeVisible();
    await expectOneLine(page, "workbench-verify-source-verifier");
    await expectOneLine(page, "workbench-solver");
    await page.locator("#workbench-mode-reduce").click();

    // Visualization: problem, its dropdown, → target problem, its dropdown, on one line at
    // 1440; on a phone a pair may wrap, the → staying with its target.
    const parts = [
      `${SUMMARY}-source-problem`,
      `${SUMMARY}-source-type-button`,
      `${SUMMARY}-target-problem`,
      ...(hasTargetType ? [`${SUMMARY}-target-type-button`] : []),
    ];
    const tops = [];
    for (const selector of parts) {
      const box = await page.locator(selector).boundingBox();
      tops.push(box.y + box.height);
    }
    if (width === 1440) {
      for (const bottom of tops) expect(Math.abs(bottom - tops[0])).toBeLessThanOrEqual(2);
    }
    const arrow = await page
      .locator(`${SUMMARY}-target-problem`)
      .evaluate((element) => element.closest("[data-summary-pair]").textContent.startsWith("→"));
    expect(arrow).toBe(true);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("the collapsed Visualization pane's Visualization Type dropdowns are live, on the expanded pane's state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await answerCompute(page);
  // Clique: Redux lists more than one Visualization Type for it (3SAT has one on CI's backend).
  await gotoProblemDetail(page, "Clique", { expect });
  const expandedType = page.locator("#workbench-source-type-value");
  const collapsedId = "workbench-section-visualization-summary-source-type";
  const type = await textOf(expandedType);
  // A backend that lists one type for the problem gives a fixed box.
  const fixed =
    (await page.locator("#workbench-source-type-button").getAttribute("data-fixed")) === "true";
  const types = fixed ? [type] : await optionsOf(page, "workbench-source-type");
  await setExpanded(page, "visualization", false);
  await expect(page.locator(`#${collapsedId}-label`)).toHaveText("Visualization Type");
  await expect(page.locator(`#${collapsedId}-value`)).toHaveText(type);
  if (types.length < 2) {
    // One type: the box still says it, and can't open, like the expanded one.
    await expect(page.locator(`#${collapsedId}-button`)).toHaveAttribute("data-fixed", "true");
    return;
  }
  // Picked collapsed, shown expanded; picked expanded, shown collapsed.
  const [first, second] = types.map((label) => new RegExp(`^${escapeRegExp(label.trim())}$`));
  await pick(page, collapsedId, second);
  await setExpanded(page, "visualization", true);
  await expect(expandedType).toHaveText(second);
  await pick(page, "workbench-source-type", first);
  await setExpanded(page, "visualization", false);
  await expect(page.locator(`#${collapsedId}-value`)).toHaveText(first);
});

test("each picture's Visualization Type dropdown grows up to its view controls, and shrinks before they wrap", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  const gapToTools = async (prefix) => {
    const type = await page.locator(`#workbench-${prefix}-type-button`).boundingBox();
    const tools = await page.locator(`#workbench-${prefix}-frame-view-controls`).boundingBox();
    return { gap: tools.x - (type.x + type.width), sameRow: Math.abs(type.y - tools.y) < 40 };
  };
  const ellipsized = (prefix) =>
    page
      .locator(`#workbench-${prefix}-type-value`)
      .evaluate((element) => element.scrollWidth > element.clientWidth);

  // 1440 px, Solve mode: one picture, its dropdown filling the row up to a small gap before −, +
  // and Fit, wider than the shared control width, its name whole.
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator("#workbench-source-frame-view-controls")).toBeVisible();
  const solve = await gapToTools("source");
  expect(solve.sameRow).toBe(true);
  expect(solve.gap).toBeGreaterThanOrEqual(4);
  expect(solve.gap).toBeLessThanOrEqual(16);
  expect((await page.locator("#workbench-source-type-button").boundingBox()).width).toBeGreaterThan(
    256,
  );
  expect(await ellipsized("source")).toBe(false);

  // Reduce mode, side by side: each side's dropdown grows up to its own frame's controls.
  await page.locator("#workbench-mode-reduce").click();
  await chooseReduceTarget(page, /^Clique(?!\s*Cover)/, { expect });
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-target-frame-view-controls")).toBeVisible();
  for (const prefix of ["source", "target"]) {
    const side = await gapToTools(prefix);
    if (side.sameRow) {
      expect(side.gap, prefix).toBeGreaterThanOrEqual(4);
      expect(side.gap, prefix).toBeLessThanOrEqual(16);
    }
    expect(await ellipsized(prefix), prefix).toBe(false);
  }

  // A 390 px phone: nothing runs past the frame, and the page doesn't scroll sideways.
  await page.setViewportSize({ width: 390, height: 844 });
  const frame = await page.locator("#workbench-source-frame").boundingBox();
  for (const selector of ["#workbench-source-type-button", "#workbench-source-frame-fullscreen"]) {
    const box = await page.locator(selector).boundingBox();
    expect(box.x + box.width, selector).toBeLessThanOrEqual(frame.x + frame.width);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the Target dropdown shows each problem's complexity class tag, in the box and in the list, expanded and collapsed", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await page.locator("#workbench-mode-reduce").click();
  const target = await chooseReduceTarget(page, /^Clique(?!\s*Cover)/, { expect });
  for (const expanded of [true, false]) {
    await setExpanded(page, "execute", expanded);
    // Its complexity class (infoCards.js targetTags), the tag the problem page's title row shows.
    const tags = page.locator("#workbench-target-tags");
    await expect(tags).toBeVisible();
    await expect(tags).toHaveText(/NP|PSPACE|EXP|Undecidable|^P$/);
    // The name stays whole at 1440 px.
    expect(
      await page
        .locator("#workbench-target-value")
        .evaluate((element) => element.scrollWidth > element.clientWidth),
    ).toBe(false);
    // Each option in the list wears its own.
    await page.locator("#workbench-target-button").click();
    const options = page.locator("#workbench-target-listbox").getByRole("option");
    const count = await options.count();
    let tagged = 0;
    for (let index = 0; index < count; index += 1) {
      if ((await options.nth(index).locator('[id$="-tags"]').count()) > 0) tagged += 1;
    }
    expect(tagged).toBeGreaterThan(0);
    // The chosen option wears the box's tags.
    const chosen = options.filter({ has: page.locator('[id$="-name"]', { hasText: target }) });
    await expect(chosen.first().locator('[id$="-tags"]')).toHaveText(await textOf(tags));
    await page.keyboard.press("Escape");
  }
});
