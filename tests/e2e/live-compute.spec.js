// tests/e2e/live-compute.spec.js
//
// T39 (#97). End-to-end coverage for the two controls T37 (#95) turned on:
// Run and Verify. Everything else in this suite reads the catalog (or answers
// compute requests itself, tests/e2e/workbench.spec.js); this is the only
// file that makes the real backend compute something.
//
// #229 moved both controls onto the workbench: Run is in the command bar and
// its answer is in the Result panel, and Verify is the Verify box at the
// bottom of that panel. The tests below are the same checks pointed at the
// new places.
//
// -----------------------------------------------------------------------
// Why this file pins a problem and a solver, when the rest of the suite
// deliberately does not
// -----------------------------------------------------------------------
// tests/e2e/home.spec.js and tests/e2e/detail.spec.js go out of their way
// never to name a problem: they use whichever one the live catalog puts
// first, so adding a problem never breaks them. That rule is right for
// reading the catalog and wrong for running it.
//
// The catalog's solvers are not interchangeable. Most of them are brute
// force, and the ones behind Clique, Subset Sum, TSP and friends are
// exponential or factorial. The Solver dropdown starts on position 0,
// so a test that just pressed Run would be running whatever the backend
// happened to list first for whatever problem happened to sort first, and
// CI's runtime would swing with the catalog. This issue's own done-when
// says so: no test here may depend on which solver the catalog returns
// first, and the pinned choice has to be commented.
//
// --- Decision: the pinned pair is Topological Sort / Kahn's Algorithm ----
// Recorded on #97. Checked against the live API on 2026-09-02:
//
//   - Topological Sort declares exactly one solver, one verifier and one
//     visualization, so its detail page is "complete" and reachable by URL
//     (components/StatusIcon.js's isProblemComplete gate).
//   - Kahn's Algorithm is O(V * E), declared complexity bucket Polynomial.
//     Nothing here can degrade into an exponential search the way a brute
//     force over a slightly larger instance would.
//   - Its declared instance is six vertices and six edges, and a real solve
//     through the deployed backend answered in about a quarter of a second.
//   - Its verifier answers True for a correct ordering and False for a
//     wrong one, so both verdict branches are reachable without contriving
//     anything.
//
// The pinned instance is asserted rather than assumed. If the backend ever
// changes what Topological Sort declares, the assertion in
// "Verify reports Redux's rejection" fails with a message saying exactly
// that, instead of the rejected-certificate test quietly turning into a
// different test.
//
// -----------------------------------------------------------------------
// Why the failure cases are forced at the proxy layer
// -----------------------------------------------------------------------
// #97: "Prefer forcing these at the proxy layer over waiting on real slow
// computation." An honest timeout test would have to occupy CI for the full
// 60 seconds T36 (#94) allows a compute request, and an honest
// backend-is-down test would need the backend actually taken away mid-run.
// Both of those are slow, and the second is not available inside `rbs
// integration-test` at all. So the failure tests intercept this app's own
// same-origin proxy route and return the exact status bodies
// pages/api/redux/[...path].js itself returns (502 for an unreachable
// upstream, 504 for its own compute timeout), which is the same thing
// tests/e2e/network-resilience.spec.js already does for the catalog reads.
// What is under test is the app's reaction to those statuses, and that is
// exactly what this reproduces.

import { expect, test } from "./fixtures";
import { gotoProblemDetail, openPanel, selectSolverByName } from "./helpers";

const PINNED_PROBLEM = "Topological Sort";
const PINNED_SOLVER = "Kahn's Algorithm";

// The instance Topological Sort declares (`defaultInstance` on allInfo),
// which the workbench starts with. Six vertices, six edges.
const PINNED_INSTANCE = "({1,2,3,4,5,6},{(1,2),(1,3),(2,4),(3,4),(4,5),(3,6)})";

// A permutation of every vertex in the instance above, in an order that
// violates its very first edge (1 must come before 2). Well formed, so it
// reaches the backend's own check rather than being rejected as garbage,
// and reliably wrong, so the verdict is False rather than True.
const WRONG_CERTIFICATE = "{6,5,4,3,2,1}";

// The workbench's own ids (components/workbench/*): the command bar's Run and
// its status region, the Result panel's answer, and its Verify box.
const RUN_BUTTON = "#workbench-run";
const RUN_STATUS = "#workbench-solve-status";
const RUN_CANCEL = "#workbench-solve-cancel-button";
const RUN_FAILURE = "#workbench-solve-failure";
const RUN_OUTPUT = "#workbench-result-answer";
const INSTANCE_INPUT = "#workbench-instance-full-instance";
const CERTIFICATE_INPUT = "#workbench-result-verify-certificate";
const VERIFY_BUTTON = "#workbench-result-verify-check";
const VERIFY_STATUS = "#workbench-result-verify-check-status";
const VERIFY_FAILURE = "#workbench-result-verify-check-failure";
const VERDICT_BANNER = "#workbench-result-verify-verdict";

// Regexes rather than Playwright glob strings: both compute requests carry
// a query string (`?solver=...`, `?verifier=...`) and a glob's `*` does not
// match reliably across one.
const SOLVE_REQUEST = /\/api\/redux\/ProblemProvider\/solve/;
const VERIFY_REQUEST = /\/api\/redux\/ProblemProvider\/verify/;
const ALL_INFO_REQUEST = /\/api\/redux\/Navigation\/Batch\/allInfo/;

// How long the first test holds the real solve response back so the loading
// state is observable. Kahn's Algorithm on this instance answers in a
// fraction of a second, which is good for CI and useless for asserting that
// a spinner and an announcement appeared: without this, the running state
// can be over before Playwright's first poll. The answer that finally
// renders is still the backend's own.
const HELD_RESPONSE_MS = 2000;

/**
 * Replies to one route with the JSON body pages/api/redux/[...path].js
 * itself produces for the given failure, and nothing else.
 */
function failWith(page, requestPattern, status, body) {
  return page.route(requestPattern, (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }),
  );
}

test("Run sends the declared instance to the pinned solver and renders Redux's real answer", async ({
  page,
}) => {
  await page.route(SOLVE_REQUEST, async (route) => {
    const response = await route.fetch();
    const body = await response.body();
    await new Promise((resolve) => setTimeout(resolve, HELD_RESPONSE_MS));
    await route.fulfill({ response, body });
  });

  await gotoProblemDetail(page, PINNED_PROBLEM, { expect });
  await selectSolverByName(page, PINNED_SOLVER, { expect });

  await expect(page.locator("#workbench-instance-text")).toHaveText(PINNED_INSTANCE);

  // The live region is mounted and empty before anything runs, which is the
  // reliable way to have a screen reader announce the change that follows
  // (components/detail/ComputeStatus.js's own header explains why).
  const status = page.locator(RUN_STATUS);
  await expect(status).toHaveText("");

  await page.locator(RUN_BUTTON).click();

  // The loading state, and the fact that it is announced rather than only
  // drawn: this is the first feedback either control has ever given a
  // screen-reader user.
  await expect(status).toHaveText(`Running ${PINNED_SOLVER}. This can take up to a minute.`);
  await expect(page.locator(RUN_CANCEL)).toBeVisible();
  await expect(page.locator(RUN_BUTTON)).toBeDisabled();

  await expect(status).toContainText(`${PINNED_SOLVER} finished in`, { timeout: 30_000 });
  await expect(page.locator(RUN_CANCEL)).toHaveCount(0);

  // #229: the answer lands in the Result panel, which Run does not open by itself.
  await openPanel(page, "result", { expect });
  const output = page.locator(RUN_OUTPUT);
  await expect(output).toBeVisible();
  await expect(output).not.toHaveText("");
  await expect(output).not.toContainText(/undefined|NaN|\[object Object\]/);
});

test("a certificate produced by a live Run verifies against the instance it was solved from", async ({
  page,
}) => {
  await gotoProblemDetail(page, PINNED_PROBLEM, { expect });
  await selectSolverByName(page, PINNED_SOLVER, { expect });

  await page.locator(RUN_BUTTON).click();
  await expect(page.locator(RUN_STATUS)).toContainText(`${PINNED_SOLVER} finished in`, {
    timeout: 30_000,
  });
  await openPanel(page, "result", { expect });
  const output = page.locator(RUN_OUTPUT);
  await expect(output).toBeVisible();
  const solved = ((await output.textContent()) ?? "").trim();
  expect(solved).not.toBe("");

  // The Verify box checks against the same one instance the solver ran on.
  // Topological Sort declares no example certificate, so the box starts empty
  // and Check starts disabled.
  await expect(page.locator(VERIFY_BUTTON)).toBeDisabled();
  await page.locator(CERTIFICATE_INPUT).fill(solved);
  await page.locator(VERIFY_BUTTON).click();

  const verdict = page.locator(VERDICT_BANNER);
  await expect(verdict).toBeVisible({ timeout: 30_000 });
  await expect(verdict).toContainText("Valid certificate");
  await expect(page.locator(VERIFY_STATUS)).toContainText("Certificate accepted");
});

test("Verify reports Redux's rejection of a wrong certificate rather than deciding locally", async ({
  page,
}) => {
  await gotoProblemDetail(page, PINNED_PROBLEM, { expect });

  // If this fails, the backend changed what Topological Sort declares as
  // its instance, and WRONG_CERTIFICATE above needs to be re-derived from
  // the new one. Asserting it here means that shows up as a clear failure
  // instead of the verdict below quietly meaning something different.
  await openPanel(page, "instance", { expect });
  await expect(page.locator(INSTANCE_INPUT)).toHaveValue(PINNED_INSTANCE);

  await openPanel(page, "result", { expect });
  await page.locator(CERTIFICATE_INPUT).fill(WRONG_CERTIFICATE);

  // T37 (#95) deleted the ported `isCertificateValid` regex that used to
  // sit in front of this call and answer for the backend on 48 of the 50
  // problems. Waiting for the request itself is what proves it is gone: a
  // local gate would have produced a verdict without ever asking Redux.
  const verifyRequest = page.waitForRequest(VERIFY_REQUEST);
  await page.locator(VERIFY_BUTTON).click();
  await verifyRequest;

  const verdict = page.locator(VERDICT_BANNER);
  await expect(verdict).toBeVisible({ timeout: 30_000 });
  await expect(verdict).toContainText("Not a valid certificate");
  await expect(page.locator(VERIFY_STATUS)).toContainText("Certificate rejected");
});

test("Run explains an unreachable backend instead of failing silently", async ({ page }) => {
  // A deliberately broken backend, so this opts out of the fixtures
  // wrapper's "no request fails silently" net for this test only (see
  // tests/e2e/fixtures.js's header).
  page.allowNetworkFailures();
  await failWith(page, SOLVE_REQUEST, 502, { error: "Upstream unreachable: connect ECONNREFUSED" });

  await gotoProblemDetail(page, PINNED_PROBLEM, { expect });
  await selectSolverByName(page, PINNED_SOLVER, { expect });
  await page.locator(RUN_BUTTON).click();

  const failure = page.locator(RUN_FAILURE);
  await expect(failure).toBeVisible();
  await expect(failure).toContainText("Couldn't reach the Redux backend");
  await expect(page.locator(RUN_STATUS)).toContainText(`${PINNED_SOLVER} did not run.`);

  // No half-state left behind: no answer, no Result dot, and Run is offered again.
  await expect(page.locator("#workbench-rail-result-dot")).toHaveCount(0);
  await expect(failure).not.toContainText(/undefined|NaN|\[object Object\]/);
  await openPanel(page, "result", { expect });
  await expect(page.locator(RUN_OUTPUT)).toHaveCount(0);
  await expect(page.locator(RUN_BUTTON)).toBeEnabled();
});

test("Run explains the proxy's compute timeout instead of waiting forever", async ({ page }) => {
  page.allowNetworkFailures();
  // Exactly what pages/api/redux/[...path].js returns when its own 60s
  // compute timeout (T36/#94) fires, rather than a request that really
  // takes a minute.
  await failWith(page, SOLVE_REQUEST, 504, {
    error: "Redux did not respond within 60s",
    timeoutMs: 60_000,
  });

  await gotoProblemDetail(page, PINNED_PROBLEM, { expect });
  await selectSolverByName(page, PINNED_SOLVER, { expect });
  await page.locator(RUN_BUTTON).click();

  const failure = page.locator(RUN_FAILURE);
  await expect(failure).toBeVisible();
  await expect(failure).toContainText("This took too long");
  // The copy names the real limit, so a wrong number here is a real bug.
  await expect(failure).toContainText("60 seconds");
  await openPanel(page, "result", { expect });
  await expect(page.locator(RUN_OUTPUT)).toHaveCount(0);
});

test("Verify explains an unreachable backend too", async ({ page }) => {
  page.allowNetworkFailures();
  await failWith(page, VERIFY_REQUEST, 502, {
    error: "Upstream unreachable: connect ECONNREFUSED",
  });

  await gotoProblemDetail(page, PINNED_PROBLEM, { expect });
  await openPanel(page, "result", { expect });
  await page.locator(CERTIFICATE_INPUT).fill(WRONG_CERTIFICATE);
  await page.locator(VERIFY_BUTTON).click();

  const failure = page.locator(VERIFY_FAILURE);
  await expect(failure).toBeVisible();
  await expect(failure).toContainText("Couldn't reach the Redux backend");
  await expect(page.locator(VERIFY_STATUS)).toContainText("The certificate was not checked.");

  // A failure is not a verdict: nothing may appear that reads as pass or
  // fail when the check never happened.
  await expect(page.locator(VERDICT_BANNER)).toHaveCount(0);
});

test("a problem with no declared instance keeps Run and Verify unavailable", async ({ page }) => {
  // Every one of the 50 problems declares a runnable `defaultInstance`
  // today (#92), so the degraded case has to be manufactured: this blanks
  // the field on the pinned problem in the allInfo response and leaves the
  // rest of the catalog untouched. hooks/useProblemDetail.js normalizes a
  // missing one to "", which is the state under test.
  await page.route(ALL_INFO_REQUEST, async (route) => {
    const response = await route.fetch();
    const info = await response.json();
    const code = Object.keys(info).find((key) => info[key]?.problemName === PINNED_PROBLEM);
    if (code) {
      info[code] = { ...info[code], defaultInstance: "", instance: "" };
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(info),
    });
  });

  await gotoProblemDetail(page, PINNED_PROBLEM, { expect });
  await selectSolverByName(page, PINNED_SOLVER, { expect });

  await expect(page.locator("#workbench-instance-text")).toContainText("No instance yet.");
  await openPanel(page, "instance", { expect });
  await expect(page.locator(INSTANCE_INPUT)).toHaveValue("");

  // Ground rule 5's "disabled and out of the tab order": the `disabled`
  // attribute is what removes a button from the tab order, so asserting it
  // covers both halves.
  await expect(page.locator(RUN_BUTTON)).toBeDisabled();
  await expect(page.locator("#workbench-source-picture")).toContainText(
    "There is no instance to draw.",
  );

  // Filled certificate, still no instance: this isolates the missing
  // instance as the reason Verify is unavailable rather than the empty
  // certificate box Topological Sort starts with.
  await openPanel(page, "result", { expect });
  await page.locator(CERTIFICATE_INPUT).fill(WRONG_CERTIFICATE);
  await expect(page.locator(VERIFY_BUTTON)).toBeDisabled();
  await expect(page.getByText("Check needs both an instance and a certificate.")).toBeVisible();

  // Unavailable, not enabled-and-failing: nothing was ever sent, so no
  // failure notice and no verdict should exist either.
  await expect(page.locator(RUN_FAILURE)).toHaveCount(0);
  await expect(page.locator(VERIFY_FAILURE)).toHaveCount(0);
});
