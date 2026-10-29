// tests/e2e/picture-opt-in.spec.js
//
// #279: Redux answers with its picture-type views only when the client asks with
// includePictures=true. Without it, it answers what Redux_GUI saw before the visualization
// redesign: the listings leave the Formula and Nested Set views (and 3SAT's Factor Graph,
// Formula and Search Tree, among others) out, and a problem's default visualization, a
// reduction's visualization and the reported visualization types fall back to the old ones.
// This app draws the new views, so every request it sends Redux carries the parameter
// (lib/redux/index.js withPictures). A backend older than the opt-in ignores it, so these tests
// check what is sent, not what comes back.
//
// #303: ported to Board G. The compute requests are answered here (the proxy allows only 10 a
// minute): Solve and Verify on 3SAT, then Reduce SAT to 3SAT through its stepper.

import { expect, test } from "./fixtures";
import {
  answerViewCertificates,
  gotoProblemDetail,
  reduceAndSolve,
  skipStartupSplash,
} from "./helpers";
import { SAT_TO_3SAT_VIEW } from "./reduction-payloads";
import { SAT3_BACKTRACKING_ONE_RUN } from "./run-payloads";

const REDUX = /\/api\/redux\/(.+?)(?:\?|$)/;
const PROFILE = /^Navigation\/ContributorProfile\/(?!directory$)/;
const RUN = "#workbench-run";

/** Records every request to Redux: its endpoint and its query. */
function recordRequests(page) {
  const asked = [];
  page.on("request", (request) => {
    const match = REDUX.exec(request.url());
    if (match) asked.push({ endpoint: match[1], url: new URL(request.url()) });
  });
  return asked;
}

async function answerCompute(page) {
  await answerViewCertificates(page);
  const answers = [
    [/ProblemProvider\/visualizeRun\?/, SAT3_BACKTRACKING_ONE_RUN],
    [/ProblemProvider\/solve\?/, SAT3_BACKTRACKING_ONE_RUN.answer],
    [/ProblemProvider\/verify\?/, "True"],
    [/ProblemProvider\/reductionView\?/, SAT_TO_3SAT_VIEW],
  ];
  for (const [pattern, json] of answers) {
    await page.route(pattern, (route) => route.fulfill({ json }));
  }
}

test("every request the problem page sends Redux asks for the picture views", async ({ page }) => {
  const asked = recordRequests(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await answerCompute(page);
  await gotoProblemDetail(page, "3SAT", { expect });
  // Solve, then Check its answer in Verify.
  await page.locator(RUN).click();
  await expect(page.locator("#workbench-result-answer")).toHaveText(
    SAT3_BACKTRACKING_ONE_RUN.answer,
  );
  await page.locator("#workbench-result-verify-answer").click();
  await expect(page.locator("#workbench-result-rows-verdict")).toBeVisible();

  // Reduce SAT to 3SAT, then Solve through 3SAT (the answer is mapped back).
  await page.goto(`/SAT?instance=${encodeURIComponent(SAT_TO_3SAT_VIEW.source.instance)}`);
  await expect(page.getByRole("heading", { level: 1, name: "SAT" })).toBeVisible({
    timeout: 20_000,
  });
  await page.locator("#workbench-mode-reduce").click();
  const current = ((await page.locator("#workbench-target-value").textContent()) ?? "").trim();
  if (!/^3SAT/.test(current)) {
    await page.locator("#workbench-target-button").click();
    await page
      .locator("#workbench-target-listbox")
      .getByRole("option")
      .filter({ hasText: /^3SAT/ })
      .first()
      .click();
  }
  await reduceAndSolve(page, { expect });

  const endpoints = new Set(asked.map((entry) => entry.endpoint));
  for (const endpoint of [
    "Navigation/Batch/allInfo",
    "Navigation/Batch/allVisualizations",
    "Navigation/Batch/allVisualizationTypes",
    "ProblemProvider/visualizeRun",
    "ProblemProvider/verify",
    "ProblemProvider/reductionView",
  ]) {
    expect(endpoints.has(endpoint), endpoint).toBe(true);
  }
  for (const entry of asked) {
    expect(entry.url.searchParams.getAll("includePictures"), entry.endpoint).toEqual(["true"]);
  }
});

test("a contributor's profile is asked for with the picture views counted", async ({ page }) => {
  const asked = recordRequests(page);
  await skipStartupSplash(page);
  await page.goto("/aboutus");
  const open = page.locator('[id^="contributor-"][id$="-open"]').first();
  await expect(open).toBeVisible({ timeout: 20_000 });
  await open.click();
  await expect.poll(() => asked.filter((entry) => PROFILE.test(entry.endpoint)).length).toBe(1);
  for (const entry of asked) {
    expect(entry.url.searchParams.get("includePictures"), entry.endpoint).toBe("true");
  }
});
