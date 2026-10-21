// tests/e2e/result-verify.spec.js
//
// #229 stage 3: the Result & Verify panel. Verify before any Run, Verify This Answer, Check
// keeping the solved picture and its current step, the "Show where it fails" button after a
// Run (and its absence for a valid certificate), an unreadable certificate showing only its
// error, Reduce mode's Check-against lock (target locked until the reduction has built the
// target instance), the target instance in the result (Execute), and (#279 stage 2) a solved
// source answer carried into the target by itself.
//
// The catalog comes from the real backend, like the rest of the suite. Every compute request
// (solve, visualize, visualizeReduction, reduce, mapSolution, verify) is answered here, for the
// same two reasons workbench.spec.js gives: these tests are about the page's state, and the
// proxy allows only 10 compute requests a minute.
//
// Drawing a certificate on the picture: no Redux endpoint does that yet, so the workbench
// shows the verdict, keeps the picture as it is, and keeps "Show where it fails" disabled with
// its reason (components/workbench/Workbench.js, CERTIFICATE_DRAWING_SUPPORTED). The tests
// below pin that fallback; the Back half of the toggle can only be tested once the backend can
// draw a certificate.

import { expect, test } from "./fixtures";
import { gotoProblemDetail, showPane } from "./helpers";

const PROBLEM = "3SAT";
const NOT_RUN = "Not run yet (default picture)";
const ANSWER = "(x1:True,x2:False,x3:True)";
const WRONG = "(x1:False,x2:True,x3:False)";
const UNREADABLE = "x1 maybe";
const TARGET_INSTANCE = "(({a,b,c},{{a,b},{b,c},{a,c}}),3)";
const MAPPED = "{a,b,c}";
const DRAWING_REASON = "Redux can't draw a certificate on this picture yet.";

const VISUALIZE_REQUEST = /\/api\/redux\/ProblemProvider\/visualize\?/;
const VISUALIZE_REDUCTION_REQUEST = /\/api\/redux\/ProblemProvider\/visualizeReduction/;
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve/;
const REDUCE_REQUEST = /\/api\/redux\/ProblemProvider\/reduce\?/;
const MAP_REQUEST = /\/api\/redux\/ProblemProvider\/mapSolution/;
const VERIFY_REQUEST = /\/api\/redux\/ProblemProvider\/verify/;

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

/**
 * Answers every compute request. `verify` records each verify request's verifier and body;
 * the verdict is True for ANSWER and MAPPED, a 400 certificate_parse_error for UNREADABLE and
 * False for anything else.
 */
async function answerCompute(page) {
  const verifyCalls = [];
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
    route.fulfill({ json: { reductionTo: { instance: TARGET_INSTANCE } } }),
  );
  await page.route(MAP_REQUEST, (route) => route.fulfill({ json: MAPPED }));
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
    const valid = body.certificate === ANSWER || body.certificate === MAPPED;
    return route.fulfill({ json: valid ? "True" : "False" });
  });
  return verifyCalls;
}

const certificateBox = (page) => page.locator("#workbench-verify-certificate");
const checkButton = (page) => page.locator("#workbench-verify-check");
const verdict = (page) => page.locator("#workbench-verdict");
const overlayButton = (page) => page.locator("#workbench-verdict-overlay");

async function check(page, certificate) {
  await certificateBox(page).fill(certificate);
  await checkButton(page).click();
}

test("Verify works before any Run and leaves the default picture as it is", async ({ page }) => {
  const verifyCalls = await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await showPane(page, "execute", { expect });

  await expect(page.locator("#workbench-result-answer")).toHaveCount(0);
  await expect(page.locator("#workbench-verify-verifier-name")).not.toBeEmpty();
  await expect(page.locator("#workbench-verify-format")).not.toBeEmpty();
  // Solve mode has no Check-against switch.
  await expect(page.locator("#workbench-verify-check-on-source")).toHaveCount(0);

  await check(page, ANSWER);
  await expect(verdict(page)).toHaveText(
    `Verifier: your certificate on the ${PROBLEM} instance is valid`,
  );
  await expect(page.locator("#workbench-verify-verdict")).toContainText("Valid certificate");
  expect(verifyCalls.at(-1).certificate).toBe(ANSWER);

  // Nothing ran, so the Showing text is unchanged, and the picture says why the certificate
  // is not drawn on it. A verdict before a Run never offers the overlay button.
  await expect(page.locator("#workbench-showing-algorithm")).toHaveText(NOT_RUN);
  await expect(page.locator("#workbench-note")).toContainText(DRAWING_REASON);
  await expect(page.locator("#workbench-source-picture")).toHaveAttribute(
    "data-picture-kind",
    "frame",
  );
  await expect(overlayButton(page)).toHaveCount(0);

  await check(page, WRONG);
  await expect(verdict(page)).toHaveText(
    `Verifier: your certificate on the ${PROBLEM} instance is not valid`,
  );
  await expect(verdict(page)).toHaveAttribute("data-valid", "false");

  // An instance edit retires the verdict.
  await showPane(page, "instance", { expect });
  await page.locator("#workbench-instance-full-instance").fill("(x1 | x2 | !x3)");
  await expect(verdict(page)).toHaveCount(0);
});

test("Check it fills the box with the run's answer and checks it in one click", async ({
  page,
}) => {
  const verifyCalls = await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  const solverName = ((await page.locator("#workbench-solver-value").textContent()) ?? "").trim();

  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-showing-algorithm")).toHaveText(solverName);
  await showPane(page, "execute", { expect });
  await expect(page.locator("#workbench-result-answer")).toHaveText(ANSWER);

  await page.locator("#workbench-result-verify-answer").click();
  await expect(certificateBox(page)).toHaveValue(ANSWER);
  await expect(verdict(page)).toHaveText(
    `Verifier: your certificate on the ${PROBLEM} instance is valid`,
  );
  expect(verifyCalls).toHaveLength(1);
  expect(verifyCalls[0].certificate).toBe(ANSWER);
  // A valid certificate after a Run gets the verdict only: the picture already shows a
  // correct answer.
  await expect(overlayButton(page)).toHaveCount(0);
  await expect(page.locator("#workbench-showing-algorithm")).toHaveText(solverName);
});

test("Check keeps the solved picture and its current step, and a new Run retires the verdict", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  const solverName = ((await page.locator("#workbench-solver-value").textContent()) ?? "").trim();

  await page.locator("#workbench-run").click();
  const position = page.locator("#workbench-steps-position");
  // A run opens on its last step, the finished result.
  await expect(position).toContainText("Step 3 of 3");
  await page.locator("#workbench-steps-previous").click();
  await expect(position).toContainText("Step 2 of 3");

  await showPane(page, "verify", { expect });
  await check(page, WRONG);
  await expect(verdict(page)).toHaveText(
    `Verifier: your certificate on the ${PROBLEM} instance is not valid`,
  );
  // The solved picture is untouched: same Showing text, same step, still a run picture.
  await expect(page.locator("#workbench-showing-algorithm")).toHaveText(solverName);
  await expect(position).toContainText("Step 2 of 3");
  await expect(page.locator("#workbench-source-picture")).toHaveAttribute(
    "data-picture-kind",
    "frame",
  );

  // A new Run takes the verdict off the picture.
  await page.locator("#workbench-run").click();
  await expect(position).toContainText("Step 3 of 3");
  await expect(verdict(page)).toHaveCount(0);
});

test("after a Run, an invalid certificate offers Show where it fails (disabled with its reason) and a valid one does not", async ({
  page,
}) => {
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-steps-position")).toContainText("Step 3 of 3");
  await showPane(page, "verify", { expect });

  await check(page, WRONG);
  const button = overlayButton(page);
  await expect(button).toHaveText("Show where it fails");
  await expect(button).toHaveAttribute("aria-pressed", "false");
  // No Redux endpoint draws a certificate yet, so the button cannot be switched on, and says
  // why. The picture stays the solver's answer.
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute("aria-describedby", "workbench-verdict-overlay-reason");
  await expect(page.locator("#workbench-verdict-overlay-reason")).toHaveText(DRAWING_REASON);

  // A new Check starts over: a valid certificate has no button at all.
  await check(page, ANSWER);
  await expect(verdict(page)).toHaveAttribute("data-valid", "true");
  await expect(button).toHaveCount(0);
});

test("a certificate Redux cannot read shows only its error under the box", async ({ page }) => {
  // The 400 below is the behaviour under test, not a silent failure.
  page.allowNetworkFailures();
  await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });
  await showPane(page, "verify", { expect });

  await check(page, UNREADABLE);
  const error = page.locator("#workbench-verify-certificate-error");
  await expect(error).toContainText("Redux could not read this certificate.");
  await expect(error).toContainText("x1 has no True or False value.");
  await expect(certificateBox(page)).toHaveAttribute("aria-invalid", "true");
  await expect(certificateBox(page)).toHaveAttribute(
    "aria-describedby",
    "workbench-verify-certificate-error",
  );
  // Nothing else: no verdict on the picture, no banner, no second copy of the error.
  await expect(verdict(page)).toHaveCount(0);
  await expect(page.locator("#workbench-verify-verdict")).toHaveCount(0);
  await expect(page.locator("#workbench-verify-check-failure")).toHaveCount(0);
  await expect(page.locator("#workbench-showing-algorithm")).toHaveText(NOT_RUN);

  // A readable certificate clears it.
  await check(page, ANSWER);
  await expect(error).toHaveCount(0);
  await expect(verdict(page)).toBeVisible();
});

test("in Reduce mode the target side of Check against unlocks once the reduction builds the target", async ({
  page,
}) => {
  const verifyCalls = await answerCompute(page);
  await gotoProblemDetail(page, PROBLEM, { expect });

  await page.locator("#workbench-mode-reduce").click();
  const target = ((await page.locator("#workbench-target-value").textContent()) ?? "").trim();
  await showPane(page, "verify", { expect });

  const sourceSide = page.locator("#workbench-verify-check-on-source");
  const targetSide = page.locator("#workbench-verify-check-on-target");
  await expect(sourceSide).toHaveText(PROBLEM);
  await expect(sourceSide).toHaveAttribute("aria-pressed", "true");
  await expect(targetSide).toHaveText(target);
  await expect(targetSide).toBeDisabled();
  await expect(page.locator("#workbench-verify-check-on-hint")).toHaveText(
    `Reduce first: checking against ${target} needs the target instance it builds.`,
  );
  await expect(page.locator("#workbench-result-target-instance")).toHaveCount(0);

  // The source side works before the Run, like in Solve mode.
  await check(page, ANSWER);
  await expect(verdict(page)).toHaveText(
    `Verifier: your certificate on the ${PROBLEM} instance is valid`,
  );

  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-target-picture")).toHaveAttribute(
    "data-picture-kind",
    "frame",
  );
  // The run retired the earlier verdict, unlocked the target side and switched to it.
  await expect(verdict(page)).toHaveCount(0);
  await expect(targetSide).toBeEnabled();
  await expect(targetSide).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#workbench-verify-check-on-hint")).toHaveCount(0);
  await expect(page.locator(`label[for="workbench-verify-certificate"]`)).toHaveText(
    `Certificate for the ${target} target`,
  );
  await expect(page.locator("#workbench-result-target-instance")).toHaveText(TARGET_INSTANCE);

  // Checking against the target uses the target problem's verifier and the built instance.
  await check(page, WRONG);
  await expect(verdict(page)).toHaveText(
    `Verifier: your certificate on the ${target} target is not valid`,
  );
  const targetCall = verifyCalls.at(-1);
  expect(targetCall.problemInstance).toBe(TARGET_INSTANCE);
  expect(targetCall.verifier).not.toBe(verifyCalls[0].verifier);
  // The reduced picture stays, and the overlay button says it can't draw yet.
  await expect(page.locator("#workbench-target-frame-showing-problem")).toHaveText(target);
  await expect(page.locator("#workbench-target-frame-showing-algorithm")).toHaveText(
    "Built, not solved",
  );
  await expect(overlayButton(page)).toHaveText("Show where it fails");
  await expect(overlayButton(page)).toBeDisabled();

  // Back to the source side keeps each side's own certificate.
  await sourceSide.click();
  await expect(certificateBox(page)).toHaveValue(ANSWER);
  await targetSide.click();
  await expect(certificateBox(page)).toHaveValue(WRONG);

  // An instance edit locks the target side again.
  await showPane(page, "instance", { expect });
  await page.locator("#workbench-instance-full-instance").fill("(x1 | x2 | !x3)");
  await showPane(page, "verify", { expect });
  await expect(targetSide).toBeDisabled();
  await expect(sourceSide).toHaveAttribute("aria-pressed", "true");
});

test("Solve <source> in Reduce mode carries its answer into the target, and Check it checks it there", async ({
  page,
}) => {
  const verifyCalls = await answerCompute(page);
  const mapCalls = [];
  page.on("request", (request) => {
    if (MAP_REQUEST.test(request.url())) mapCalls.push(new URL(request.url()));
  });
  await gotoProblemDetail(page, PROBLEM, { expect });

  await page.locator("#workbench-mode-reduce").click();
  const target = ((await page.locator("#workbench-target-value").textContent()) ?? "").trim();
  await page.locator("#workbench-run").click();
  await showPane(page, "execute", { expect });
  await expect(page.locator("#workbench-result-reduce")).toBeVisible();
  // #279 stage 2: Reduce only builds, so nothing is mapped yet.
  expect(mapCalls).toHaveLength(0);

  await page.locator("#workbench-source-cell-run").click();
  // Mapping runs in polynomial time, so it needs no button.
  await expect(page.locator("#workbench-forward-answer")).toHaveText(MAPPED);
  expect(mapCalls).toHaveLength(1);
  expect(mapCalls[0].searchParams.get("solution")).toBe(ANSWER);

  await page.locator("#workbench-forward-check").click();
  await expect(certificateBox(page)).toHaveValue(MAPPED);
  await expect(verdict(page)).toHaveText(
    `Verifier: your certificate on the ${target} target is valid`,
  );
  expect(verifyCalls.at(-1).problemInstance).toBe(TARGET_INSTANCE);
});
