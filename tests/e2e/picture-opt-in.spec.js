// tests/e2e/picture-opt-in.spec.js
//
// #279: Redux answers with its picture-type views only when the client asks with
// includePictures=true. Without it, it answers what Redux_GUI saw before the visualization
// redesign: the listings leave the Formula and Nested Set views out, and a problem's default
// visualization, a reduction's visualization and the reported visualization types fall back to
// the old ones. This app draws the new views, so every request it sends Redux carries the
// parameter (lib/redux/index.js withPictures). A backend older than the opt-in ignores it, so
// these tests check what is sent, not what comes back.
//
// The compute requests are answered here (the proxy allows only 10 a minute); the fixture
// answers visualizeRun and reductionView 404, so Reduce builds with ProblemProvider/reduce.

import { expect, test } from "./fixtures";
import { chooseReduceTarget, gotoProblemDetail, showPane, skipStartupSplash } from "./helpers";

const REDUX = /\/api\/redux\/(.+?)(?:\?|$)/;
const PROFILE = /^Navigation\/ContributorProfile\/(?!directory$)/;

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
  const answers = [
    [/ProblemProvider\/visualize\?/, []],
    [/ProblemProvider\/solve\?/, "(x1:True,x2:False,x3:True)"],
    [
      /ProblemProvider\/reduce\?/,
      { reductionTo: { instance: "(({a,b,c},{{a,b},{b,c},{a,c}}),3)" } },
    ],
    [/ProblemProvider\/mapSolution\?/, "{a,b,c}"],
    [/ProblemProvider\/verify\?/, "True"],
  ];
  for (const [pattern, json] of answers) {
    await page.route(pattern, (route) => route.fulfill({ json }));
  }
}

test("every request the problem page sends Redux asks for the picture views", async ({ page }) => {
  const asked = recordRequests(page);
  await answerCompute(page);
  await gotoProblemDetail(page, "3SAT", { expect });
  // Solve, Check, then Reduce and Solve 3SAT (which maps its answer into the target).
  await page.locator("#workbench-run").click();
  await showPane(page, "verify", { expect });
  await page.locator("#workbench-verify-source-certificate").fill("(x1:True,x2:False,x3:True)");
  await page.locator("#workbench-verify-source-check").click();
  await expect(page.locator("#workbench-verify-source-verdict")).toBeVisible();
  await page.locator("#workbench-mode-reduce").click();
  await chooseReduceTarget(page, /^Clique(?!\s*Cover)/, { expect });
  await page.locator("#workbench-run").click();
  await expect(page.locator("#workbench-run-chip")).toHaveText(/^Built/);
  await showPane(page, "execute", { expect });
  await page.locator("#workbench-source-cell-run").click();
  await expect(page.locator("#workbench-forward-answer")).toHaveText("{a,b,c}");

  const endpoints = new Set(asked.map((entry) => entry.endpoint));
  for (const endpoint of [
    "Navigation/Batch/allInfo",
    "Navigation/Batch/allVisualizations",
    "Navigation/Batch/allVisualizationTypes",
    "ProblemProvider/solve",
    "ProblemProvider/verify",
    "ProblemProvider/reduce",
    "ProblemProvider/reductionView",
    "ProblemProvider/mapSolution",
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
