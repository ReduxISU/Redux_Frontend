// tests/e2e/workspace-sections.spec.js
//
// #279 (Workspace tweaks): the Workspace's Visualization, Execute and Verify sections each have the
// Show all / Show less button the Details and Instance panes have, and each collapses on its own.
// Collapsed, Visualization keeps a one-line summary (the pictures' problems and Visualization
// Types); Execute and Verify keep their top controls, live, on the heading's line, like Instance's
// field (the director's ask, Oct 21):
//   - Execute: Solve mode's Solver, Solve and its chip; Reduce mode's Target, Reduction, Reduce
//     and the build's chip; no Mode switch, and none of Reduce mode's cells or results;
//   - Verify: the verifier dropdown (the problem's verifiers, as Redux lists them), the
//     certificate field, Check (and Enter in the field), and a chip with the verdict and its time;
//     in Reduce mode first a Problem to verify choice, whose target waits for Reduce.
// A collapsed control is the expanded one, so what is picked or typed shows both ways. What a
// section holds survives collapsing, the layout remembers it through a reload until Reset layout,
// Check it opens a collapsed Verify, and Algorithm Steps opening by itself after a run never
// opens a collapsed Visualization. Collapsed, every pane's and section's line starts at one x.
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

test("each Workspace section has Show less and Show all, like Details and Instance, and collapses on its own", async ({
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

  // Visualization: a summary, the problem and its Visualization Type.
  const type = await textOf(page.locator("#workbench-source-type-value"));
  await expand(page, "visualization").click();
  await expect(expand(page, "visualization")).toHaveText("Show all");
  await expect(expand(page, "visualization")).toHaveAttribute("aria-expanded", "false");
  await expect(body(page, "visualization")).toBeHidden();
  await expect(summary(page, "visualization")).toHaveText(`${PROBLEM} · ${type}`);
  // The others are still open: each collapses on its own.
  await expect(page.locator("#workbench-mode-solve")).toBeVisible();
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

  // A reload remembers which are collapsed; Reset layout opens them all.
  await setExpanded(page, "visualization", false);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: PROBLEM })).toBeVisible({
    timeout: 20_000,
  });
  for (const key of SECTIONS) {
    await expect(expand(page, key)).toHaveAttribute("aria-expanded", "false");
  }
  await expect(summary(page, "visualization")).toBeVisible();
  await expect(page.locator("#workbench-run")).toBeVisible();
  await expect(page.locator("#workbench-verify-source-certificate")).toBeVisible();
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

test("collapsed Execute in Solve mode: the Solver, Solve and its chip work, with no Mode switch, and share their state with the expanded section", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await setExpanded(page, "execute", false);
  // No Mode switch: the director listed none, and Show all brings it back.
  await expect(page.locator("#workbench-mode-solve")).toBeHidden();
  await expect(page.locator("#workbench-mode-reduce")).toBeHidden();

  // Picking a solver collapsed is the pick expanded, and back.
  const solvers = await optionsOf(page, "workbench-solver");
  expect(solvers.length).toBeGreaterThan(1);
  const [first, second] = solvers.map((label) => new RegExp(`^${escapeRegExp(label.trim())}$`));
  await pick(page, "workbench-solver", second);
  await setExpanded(page, "execute", true);
  await expect(page.locator("#workbench-mode-solve")).toBeVisible();
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
  await expect(page.locator("#workbench-mode-reduce")).toBeHidden();
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

  // The Visualization summary names both sides.
  const sourceType = await textOf(page.locator("#workbench-source-type-value"));
  const targetType = await textOf(page.locator("#workbench-target-type-value"));
  await setExpanded(page, "visualization", false);
  await expect(summary(page, "visualization")).toHaveText(
    `${PROBLEM} · ${sourceType} → ${target} · ${targetType}`,
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
  const firstControls = {
    solve: ["#workbench-solver-button", "#workbench-verify-source-verifier-button"],
    reduce: ["#workbench-target-button", "#workbench-verify-side"],
  };
  const leftEdges = async (mode) => {
    const lines = [
      page.locator("#workbench-details-summary"),
      field,
      summary(page, "visualization"),
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
      // The mode switch is in Execute, collapsed by the Solve round.
      await setExpanded(page, "execute", true);
      await page.locator("#workbench-mode-reduce").click();
      await chooseReduceTarget(page, /^Clique(?!\s*Cover)/, { expect });
    }
    for (const key of SECTIONS) await setExpanded(page, key, false);

    // Instance's one-line field: on the title's line, to the right of the title, still editable.
    await onTitleLine("#workbench-instance-pane-heading", field);
    await expect(field).toBeEditable();
    // Execute's and Verify's controls: on the heading's line too, the first at the tab stop.
    await onTitleLine("#workbench-section-execute-heading", page.locator("#workbench-run"));
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
