// tests/e2e/result-verify.spec.js
//
// #279 stage 4 (board F): the Workspace's Verify section, one strip per side. The source strip in
// Solve mode, source and target in Reduce mode side by side; each strip's "Certificate" label,
// field, hint and placeholder; Check before any run, valid, not valid and unreadable; Show where
// it fails (disabled, saying why: Redux's verifier only answers True or False); Use the solver's
// answer, disabled until there is an answer; each strip collapsing on its own; Check it in
// Execute filling and checking the right strip, opening it and Verify if they were hidden; the
// typed text surviving hiding; and the target strip waiting for Reduce to build its instance.
// (It held #229 stage 3's single Verify box with its Check-against switch and the verdict on the
// picture's Showing line; both are gone.)
//
// The catalog comes from the real backend, like the rest of the suite. Every compute request is
// answered here, for the reasons workbench.spec.js gives (these tests are about the page's state,
// and the proxy allows only 10 compute requests a minute). The fixture already answers
// visualizeRun and reductionView 404, so Solve asks for one picture and Reduce builds with
// ProblemProvider/reduce.

import { expect, test } from "./fixtures";
import { chooseReduceTarget, gotoProblemDetail, showPane } from "./helpers";

const PROBLEM = "3SAT";
const ANSWER = "(x1:True,x2:False,x3:True)";
const WRONG = "(x1:False,x2:True,x3:False)";
const UNREADABLE = "x1 maybe";
const TARGET_INSTANCE = "(({a,b,c},{{a,b},{b,c},{a,c}}),3)";
const TARGET_ANSWER = "{a,b,c}";
const MAPPED = "{a,b,c}";
const MAPPED_BACK = "(x1:True,x2:True,x3:True)";
const FAILURE_REASON =
  "Redux's verifier only answers valid or not valid, so it can't point at the part that fails yet.";

const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve\?/;
const REDUCE_REQUEST = /\/api\/redux\/ProblemProvider\/reduce\?/;
const MAP_REQUEST = /\/api\/redux\/ProblemProvider\/mapSolution\?/;
const MAP_BACK_REQUEST = /\/api\/redux\/ProblemProvider\/mapSolutionBack\?/;
const VERIFY_REQUEST = /\/api\/redux\/ProblemProvider\/verify\?/;

/**
 * A verdict's whole text: what it says, then (#279 Workspace tweaks) how long the check took,
 * this browser's round trip, written as Execute writes a run's time.
 */
const timed = (text) =>
  new RegExp(
    `^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} Took \\d+\\.\\d\\d s \\(round trip\\)$`,
  );

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

/**
 * Answers every compute request. `verifyCalls` records each verify request's verifier and body;
 * the verdict is True for ANSWER, MAPPED and MAPPED_BACK, a 400 certificate_parse_error for
 * UNREADABLE and False for anything else.
 */
async function answerCompute(page) {
  const verifyCalls = [];
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
  await page.route(REDUCE_REQUEST, (route) =>
    route.fulfill({ json: { reductionTo: { instance: TARGET_INSTANCE } } }),
  );
  await page.route(MAP_REQUEST, (route) => route.fulfill({ json: MAPPED }));
  await page.route(MAP_BACK_REQUEST, (route) => route.fulfill({ json: MAPPED_BACK }));
  await page.route(VERIFY_REQUEST, (route) => {
    const url = new URL(route.request().url());
    const body = route.request().postDataJSON();
    verifyCalls.push({ verifier: url.searchParams.get("verifier"), ...body });
    if (body.certificate === UNREADABLE) {
      return route.fulfill({
        status: 400,
        json: {
          error: "certificate_parse_error",
          problem: "SAT3",
          expected: "Comma-separated variable:Boolean pairs.",
          detail: "x1 has no True or False value.",
        },
      });
    }
    const valid = [ANSWER, MAPPED, MAPPED_BACK].includes(body.certificate);
    return route.fulfill({ json: valid ? "True" : "False" });
  });
  return verifyCalls;
}

/** One strip's parts, by side ("source" or "target"). */
function strip(page, side) {
  const id = `#workbench-verify-${side}`;
  return {
    root: page.locator(id),
    toggle: page.locator(`${id}-toggle`),
    body: page.locator(`${id}-body`),
    label: page.locator(`label[for="workbench-verify-${side}-certificate"]`),
    field: page.locator(`${id}-certificate`),
    hint: page.locator(`${id}-certificate-hint`),
    check: page.locator(`${id}-check`),
    checkHint: page.locator(`${id}-check-hint`),
    use: page.locator(`${id}-use-answer`),
    useHint: page.locator(`${id}-use-answer-hint`),
    verdict: page.locator(`${id}-verdict`),
    fail: page.locator(`${id}-fail`),
    failReason: page.locator(`${id}-fail-reason`),
    stale: page.locator(`${id}-stale`),
  };
}

async function openVerify(page) {
  await gotoProblemDetail(page, PROBLEM, { expect });
  await showPane(page, "verify", { expect });
}

async function openReduce(page) {
  await openVerify(page);
  await page.locator("#workbench-mode-reduce").click();
  return chooseReduceTarget(page, /^Clique(?!\s*Cover)/, { expect });
}

test("Solve mode has one strip, Reduce mode one per side, side by side under the pictures", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await answerCompute(page);
  await openVerify(page);
  const source = strip(page, "source");
  await expect(source.root).toBeVisible();
  await expect(source.toggle).toContainText(`Verify ${PROBLEM}`);
  await expect(strip(page, "target").root).toHaveCount(0);

  const target = await openReduce(page);
  const targetStrip = strip(page, "target");
  await expect(targetStrip.toggle).toContainText(`Verify ${target}`);
  // Two columns of the shared grid: the target strip to the right of the source's, top-aligned.
  const left = await source.root.boundingBox();
  const right = await targetStrip.root.boundingBox();
  expect(right.x).toBeGreaterThan(left.x + left.width - 1);
  expect(Math.abs(right.y - left.y)).toBeLessThanOrEqual(1);
  // On the same columns as Execute's solver cells, each under its own side.
  await showPane(page, "execute", { expect });
  const sourceCell = await page.locator("#workbench-source-cell").boundingBox();
  const targetCell = await page.locator("#workbench-target-cell").boundingBox();
  expect(Math.abs(left.x - sourceCell.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(right.x - targetCell.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(right.width - targetCell.width)).toBeLessThanOrEqual(1);

  await page.locator("#workbench-mode-solve").click();
  await expect(targetStrip.root).toHaveCount(0);
});

test("each strip says Certificate above the field, and its hint and placeholder are the problem's", async ({
  page,
}) => {
  await answerCompute(page);
  const target = await openReduce(page);

  const source = strip(page, "source");
  await expect(source.label).toHaveText("Certificate");
  const example = await source.field.getAttribute("placeholder");
  expect(example).toBeTruthy();
  // The words are this page's for 3SAT; the example is Redux's own, so Redux can read it.
  await expect(source.hint).toHaveText(`A True/False value for each variable, e.g. ${example}`);
  await expect(source.field).toHaveAttribute(
    "aria-describedby",
    "workbench-verify-source-certificate-hint",
  );
  await expect(source.field).toHaveAttribute("rows", "1");
  await expect(source.field).toHaveValue("");

  const targetStrip = strip(page, "target");
  await expect(targetStrip.label).toHaveText("Certificate");
  const targetExample = await targetStrip.field.getAttribute("placeholder");
  expect(targetExample).toBeTruthy();
  await expect(targetStrip.hint).toHaveText(
    `The vertices of a clique of size k, e.g. ${targetExample}`,
  );
  expect(target).toMatch(/^Clique/);
});

test("Check needs no run: valid, not valid with Show where it fails, unreadable, and stale after an edit", async ({
  page,
}) => {
  page.allowNetworkFailures();
  const verifyCalls = await answerCompute(page);
  await openVerify(page);
  const source = strip(page, "source");

  // Check is enabled before anything is typed or run; pressing it empty asks for a certificate.
  await expect(source.check).toBeEnabled();
  await expect(source.checkHint).toHaveCount(0);
  await source.check.click();
  await expect(page.locator("#workbench-verify-source-empty")).toHaveText(
    "Type a certificate first.",
  );
  await expect(source.field).toBeFocused();
  expect(verifyCalls).toHaveLength(0);
  await source.field.fill(ANSWER);
  await expect(page.locator("#workbench-verify-source-empty")).toHaveCount(0);
  await source.check.click();
  await expect(source.verdict).toHaveText(
    timed(`Valid. Redux checked it against this ${PROBLEM} instance and accepted it.`),
  );
  await expect(source.verdict).toHaveAttribute("data-valid", "true");
  await expect(source.fail).toHaveCount(0);
  expect(verifyCalls.at(-1).certificate).toBe(ANSWER);
  // A check doesn't touch the picture: it stays plain, its heading saying nothing after the name.
  await expect(page.locator("#workbench-source-frame-status")).toHaveCount(0);

  await source.field.fill(WRONG);
  // The verdict was for the certificate before.
  await expect(source.verdict).toHaveCount(0);
  await expect(source.stale).toHaveText(
    "The certificate or the instance changed after the last check. Check again.",
  );
  await source.check.click();
  await expect(source.verdict).toHaveText(
    timed(`Not valid. Redux checked it against this ${PROBLEM} instance and rejected it.`),
  );
  await expect(source.verdict).toHaveAttribute("data-valid", "false");
  await expect(source.stale).toHaveCount(0);
  // Show where it fails: Redux can't say where yet, so it is disabled and says why.
  await expect(source.fail).toHaveText("Show where it fails");
  await expect(source.fail).toBeDisabled();
  await expect(source.fail).toHaveAttribute(
    "aria-describedby",
    "workbench-verify-source-fail-reason",
  );
  await expect(source.failReason).toHaveText(FAILURE_REASON);

  await source.field.fill(UNREADABLE);
  await source.check.click();
  await expect(source.verdict).toHaveText(
    timed("Can't check this. x1 has no True or False value."),
  );
  await expect(source.verdict).toHaveAttribute("data-tone", "unreadable");
  await expect(source.field).toHaveAttribute("aria-invalid", "true");
  await expect(source.fail).toHaveCount(0);
  await expect(page.locator("#workbench-verify-source-check-failure")).toHaveCount(0);

  // An instance edit makes the last check stale too.
  await source.field.fill(ANSWER);
  await source.check.click();
  await expect(source.verdict).toHaveAttribute("data-valid", "true");
  await showPane(page, "instance", { expect });
  await page.locator("#workbench-instance-full-instance").fill("(x1 | x2 | !x3)");
  await expect(source.verdict).toHaveCount(0);
  await expect(source.stale).toBeVisible();
});

test("Use the solver's answer is disabled until a solve gives one, then fills and checks it", async ({
  page,
}) => {
  const verifyCalls = await answerCompute(page);
  await openVerify(page);
  const source = strip(page, "source");
  await expect(source.use).toBeDisabled();
  // The reason is a tooltip and the button's description, not a line on the page.
  await expect(source.useHint).toHaveText("No answer yet. Press Solve in Execute first.");
  await expect(page.locator("#workbench-verify-source-use-answer-wrap")).toHaveAttribute(
    "title",
    "No answer yet. Press Solve in Execute first.",
  );
  await expect(page.getByText("No answer yet. Press Solve in Execute first.")).toHaveCSS(
    "position",
    "absolute",
  );
  await expect(source.use).toHaveAttribute(
    "aria-describedby",
    "workbench-verify-source-use-answer-hint",
  );

  await page.locator("#workbench-run").click();
  await expect(source.use).toBeEnabled();
  await expect(source.useHint).toHaveCount(0);
  await source.use.click();
  await expect(source.field).toHaveValue(ANSWER);
  await expect(source.verdict).toHaveAttribute("data-valid", "true");
  expect(verifyCalls.at(-1).certificate).toBe(ANSWER);
});

test("each strip collapses on its own and keeps its text, and hiding Verify keeps both", async ({
  page,
}) => {
  await answerCompute(page);
  await openReduce(page);
  const source = strip(page, "source");
  const target = strip(page, "target");
  await source.field.fill("x1 = T");
  await target.field.fill("{a}");

  await expect(source.toggle).toHaveAttribute("aria-expanded", "true");
  await expect(source.toggle).toContainText("Hide");
  await source.toggle.click();
  await expect(source.toggle).toHaveAttribute("aria-expanded", "false");
  await expect(source.toggle).toContainText("Show");
  await expect(source.field).toBeHidden();
  await expect(target.field).toBeVisible();

  await target.toggle.click();
  await expect(target.field).toBeHidden();
  await source.toggle.click();
  await expect(source.field).toHaveValue("x1 = T");
  await expect(target.field).toBeHidden();

  // Hiding the whole Verify section keeps what was typed on both sides.
  await page.locator("#workbench-toggle-verify").click();
  await expect(source.root).toBeHidden();
  await showPane(page, "verify", { expect });
  await expect(source.field).toHaveValue("x1 = T");
  await target.toggle.click();
  await expect(target.field).toHaveValue("{a}");
});

test("the target strip waits for Reduce, then checks with the target's verifier on the built instance", async ({
  page,
}) => {
  const verifyCalls = await answerCompute(page);
  const target = await openReduce(page);
  const targetStrip = strip(page, "target");
  await targetStrip.field.fill(WRONG);
  await expect(targetStrip.check).toBeDisabled();
  await expect(targetStrip.checkHint).toHaveText(
    `Reduce first: a ${target} certificate is checked against the instance Reduce builds.`,
  );
  await expect(targetStrip.useHint).toHaveText(
    `No answer yet. Reduce, then press Solve ${target} in Execute.`,
  );

  // The source strip works before the build, like in Solve mode.
  const source = strip(page, "source");
  await source.field.fill(ANSWER);
  await source.check.click();
  await expect(source.verdict).toHaveAttribute("data-valid", "true");

  await page.locator("#workbench-run").click();
  await expect(targetStrip.check).toBeEnabled();
  await targetStrip.check.click();
  await expect(targetStrip.verdict).toHaveText(
    timed(`Not valid. Redux checked it against this ${target} instance and rejected it.`),
  );
  const targetCall = verifyCalls.at(-1);
  expect(targetCall.problemInstance).toBe(TARGET_INSTANCE);
  expect(targetCall.verifier).not.toBe(verifyCalls[0].verifier);
  await expect(targetStrip.fail).toBeDisabled();
  // The source's verdict is its own, untouched by the target's check.
  await expect(source.verdict).toHaveAttribute("data-valid", "true");

  // Use the solver's answer: the source's answer carried into the target counts.
  await expect(targetStrip.useHint).toHaveText(
    `No answer yet. Press Solve ${target} in Execute first.`,
  );
  await showPane(page, "execute", { expect });
  await page.locator("#workbench-source-cell-run").click();
  await expect(page.locator("#workbench-forward-answer")).toHaveText(MAPPED);
  await expect(targetStrip.use).toBeEnabled();
  await targetStrip.use.click();
  await expect(targetStrip.field).toHaveValue(MAPPED);
  await expect(targetStrip.verdict).toHaveAttribute("data-valid", "true");
});

test("Check it fills and checks the right strip, opening it and Verify if they were hidden", async ({
  page,
}) => {
  const verifyCalls = await answerCompute(page);
  await openVerify(page);
  const source = strip(page, "source");

  // Solve mode: the answer's Check it goes to the source strip.
  await source.toggle.click();
  await page.locator("#workbench-toggle-verify").click();
  await expect(source.root).toBeHidden();
  await page.locator("#workbench-run").click();
  await showPane(page, "execute", { expect });
  await page.locator("#workbench-result-verify-answer").click();
  await expect(page.locator("#workbench-toggle-verify")).toHaveAttribute("aria-expanded", "true");
  await expect(source.toggle).toHaveAttribute("aria-expanded", "true");
  await expect(source.field).toHaveValue(ANSWER);
  await expect(source.verdict).toHaveAttribute("data-valid", "true");
  expect(verifyCalls.at(-1).certificate).toBe(ANSWER);

  // Reduce mode: the answer carried into the target goes to the target strip, and the one
  // mapped back goes to the source strip.
  await page.locator("#workbench-mode-reduce").click();
  await chooseReduceTarget(page, /^Clique(?!\s*Cover)/, { expect });
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-run-chip")).toHaveText(/^Built/);
  const target = strip(page, "target");
  await target.toggle.click();
  await page.locator("#workbench-source-cell-run").click();
  await page.locator("#workbench-forward-check").click();
  await expect(target.toggle).toHaveAttribute("aria-expanded", "true");
  await expect(target.field).toHaveValue(MAPPED);
  await expect(target.verdict).toHaveAttribute("data-valid", "true");
  expect(verifyCalls.at(-1).problemInstance).toBe(TARGET_INSTANCE);

  await page.locator("#workbench-target-cell-run").click();
  await expect(page.locator("#workbench-back-answer")).toHaveText(MAPPED_BACK);
  await page.locator("#workbench-back-check").click();
  await expect(source.field).toHaveValue(MAPPED_BACK);
  await expect(source.verdict).toHaveAttribute("data-valid", "true");
  // The target strip keeps its own certificate and verdict.
  await expect(target.field).toHaveValue(MAPPED);
});

test("at phone width the strips stack, the field grows with its text, and nothing scrolls sideways", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await answerCompute(page);
  await openReduce(page);
  const source = strip(page, "source");
  const target = strip(page, "target");
  const top = await source.root.boundingBox();
  const below = await target.root.boundingBox();
  expect(below.y).toBeGreaterThan(top.y + top.height - 1);

  const oneLine = (await source.field.boundingBox()).height;
  expect(oneLine).toBeLessThan(48);
  await source.field.fill(
    "(x1:True,x2:False,x3:True,x4:False,x5:True,x6:False,x7:True,x8:False,x9:True,x10:False)",
  );
  await expect.poll(async () => (await source.field.boundingBox()).height).toBeGreaterThan(oneLine);
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});
