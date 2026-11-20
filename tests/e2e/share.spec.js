// tests/e2e/share.spec.js
//
// #324: the problem page's Share button, with #176 (the reduction in the link), #174 (an
// instance too long for a link is left out, and the page says so) and #177 (opening a link never
// starts a compute request by itself; only the main button does).
//
// The catalog comes from the backend behind the suite, like the rest of it. Exact Cover is used
// for its direct reduction to Subset Sum; a backend without that reduction skips the Reduce tests.

import { expect, test } from "./fixtures";
import { skipStartupSplash } from "./helpers";

const PROBLEM = "Exact Cover";
const INSTANCE = "({1,2,3},{{1},{2,3},{1,2}})";

// Every request that runs a solver or builds a reduction. The default picture's
// `visualize?visualization=` (no solver) only draws the instance, so it is allowed.
const COMPUTE_PATHS = [
  "solve",
  "verify",
  "visualizeRun",
  "visualizeReduction",
  "reductionView",
  "reductionChainView",
  "reduce",
  "mapSolution",
  "mapSolutionBack",
];

/** Records every compute request the page makes (a solver run, a reduction). */
function recordCompute(page) {
  const seen = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    const match = url.pathname.match(/\/api\/redux\/ProblemProvider\/([^/?]+)$/);
    if (!match) return;
    const endpoint = match[1];
    const solving = endpoint === "visualize" && url.searchParams.has("solver");
    if (COMPUTE_PATHS.includes(endpoint) || solving) seen.push(`${endpoint}${url.search}`);
  });
  return seen;
}

async function openProblem(page, query = "") {
  await skipStartupSplash(page);
  await page.goto(`/${encodeURIComponent(PROBLEM)}${query}`);
  await expect(page.getByRole("heading", { level: 1, name: PROBLEM })).toBeVisible({
    timeout: 20_000,
  });
}

/** Skips when the backend's catalog has no Exact Cover -> Subset Sum. */
async function needsSubsetSum(page) {
  const response = await page.request.get("/api/redux/Navigation/Reductions");
  const graph = response.ok() ? await response.json() : {};
  test.skip(!graph.EXACTCOVER?.SUBSETSUM, "This backend has no Exact Cover -> Subset Sum.");
}

test.describe("Share", () => {
  test.beforeEach(async ({ context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  });

  test("copies a link to what is on screen and says Copied", async ({ page }) => {
    await needsSubsetSum(page);
    await openProblem(page, `?instance=${encodeURIComponent(INSTANCE)}`);
    await page.locator("#workbench-mode-reduce").click();
    await expect(page.locator("#workbench-target-value")).toHaveText(/^Subset Sum/);

    const button = page.locator("#problem-share-button");
    await expect(button).toHaveAccessibleName("Share");
    await button.click();
    await expect(button).toHaveText("Copied");
    await expect(page.locator("#problem-share-status")).toHaveText("Link copied.");

    const copied = new URL(await page.evaluate(() => navigator.clipboard.readText()));
    expect(copied.origin).toBe(new URL(page.url()).origin);
    expect(copied.pathname).toBe(`/${encodeURIComponent(PROBLEM)}`);
    expect(copied.searchParams.get("instance")).toBe(INSTANCE);
    // #176: the reduction is in the link (the target's first reduction is the default).
    expect(copied.searchParams.get("reduceTo")).toBe("Subset Sum");
    expect(copied.searchParams.has("reduction")).toBe(false);
    // Back to Share after a moment.
    await expect(button).toHaveText("Share", { timeout: 5_000 });

    // The address carries the same view.
    await expect.poll(() => new URL(page.url()).searchParams.get("reduceTo")).toBe("Subset Sum");
  });

  test("a link with the reduction opens Reduce on it, and runs nothing by itself (#177)", async ({
    page,
  }) => {
    await needsSubsetSum(page);
    const computed = recordCompute(page);
    await openProblem(
      page,
      `?instance=${encodeURIComponent(INSTANCE)}&reduceTo=${encodeURIComponent("Subset Sum")}`,
    );
    await expect(page.locator("#workbench-mode-reduce")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#workbench-target-value")).toHaveText(/^Subset Sum/);
    await expect(page.locator("#workbench-instance-full-instance")).toHaveValue(INSTANCE);
    // Give a stray request time to show up: none may.
    await page.waitForTimeout(1_500);
    expect(computed).toEqual([]);
    // Pressing the button is what runs it.
    await page.locator("#workbench-run").click();
    await expect.poll(() => computed.length).toBeGreaterThan(0);
  });

  test("a link naming a solver and an instance runs nothing until Solve is pressed (#177)", async ({
    page,
  }) => {
    await openProblem(page, `?instance=${encodeURIComponent(INSTANCE)}`);
    // The last Algorithm, picked here, so the address names it as a shared link would.
    await page.locator("#workbench-solver-button").click();
    await page.locator("#workbench-solver-listbox").getByRole("option").last().click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("solver"), { timeout: 5_000 })
      .not.toBeNull()
      .catch(() => {});
    const link = page.url();

    // Opening that link in a fresh page: nothing runs until Solve is pressed.
    const fresh = await page.context().newPage();
    const computed = recordCompute(fresh);
    await skipStartupSplash(fresh);
    await fresh.goto(link);
    await expect(fresh.getByRole("heading", { level: 1, name: PROBLEM })).toBeVisible({
      timeout: 20_000,
    });
    await expect(fresh.locator("#workbench-instance-full-instance")).toHaveValue(INSTANCE);
    await fresh.waitForTimeout(1_500);
    expect(computed).toEqual([]);
    await fresh.locator("#workbench-run").click();
    await expect.poll(() => computed.length).toBeGreaterThan(0);
    await fresh.close();
  });

  test("an instance too long for a link is left out, and the page says so (#174)", async ({
    page,
  }) => {
    await openProblem(page);
    const note = page.locator("#workbench-instance-link-note");
    await expect(note).toHaveCount(0);
    // 9000 characters: over the 8000 a link may have, before any encoding.
    const long = `({1},{${"{1},".repeat(2250)}{1}})`;
    await page.locator("#workbench-instance-full-instance").fill(long);
    await expect(note).toHaveText(
      "This instance is too long to include in a shareable link, so the page's address and Share leave it out. A shared link opens on the default instance.",
    );
    // The address leaves it out too.
    await page.waitForTimeout(800);
    expect(new URL(page.url()).searchParams.has("instance")).toBe(false);
    expect(page.url().length).toBeLessThan(8000);

    await page.locator("#problem-share-button").click();
    await expect(page.locator("#problem-share-status")).toContainText(
      "The instance is too long for a link, so the link leaves it out",
    );
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(new URL(copied).searchParams.has("instance")).toBe(false);

    // A short instance again: back in the address, the note gone.
    await page.locator("#workbench-instance-full-instance").fill(INSTANCE);
    await expect(note).toHaveCount(0);
    await expect.poll(() => new URL(page.url()).searchParams.get("instance")).toBe(INSTANCE);
  });
});

test("when the clipboard is blocked the link shows in a box to copy by hand", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("blocked")) },
      configurable: true,
    });
    document.execCommand = () => false;
  });
  await openProblem(page, `?instance=${encodeURIComponent(INSTANCE)}`);
  await page.locator("#problem-share-button").click();
  await expect(page.locator("#problem-share-status")).toHaveText(
    "This browser did not let the page copy the link. Copy it from the box below.",
  );
  const field = page.locator("#problem-share-link");
  await expect(field).toBeVisible();
  await expect(field).toHaveAccessibleName("Link to this view");
  const href = await field.inputValue();
  expect(new URL(href).searchParams.get("instance")).toBe(INSTANCE);
  // Never "Copied" when nothing was copied.
  await expect(page.locator("#problem-share-button")).toHaveText("Share");
});
