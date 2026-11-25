// tests/e2e/share.spec.js
//
// #324: the problem page's Share button, with #176 (the reduction in the link), #174 (an
// instance too long for a link is left out of the address, and the page says so) and #177
// (opening a link never starts a compute request by itself; only the main button does).
// ReduxISU/Redux#844: a view too long for a link is saved as a short link (`?share={id}`), and
// opening one restores the view. The Redux server's ShareLinks endpoints are answered here
// (page.route), so no database is needed.
//
// The catalog comes from the backend behind the suite, like the rest of it. Exact Cover is used
// for its direct reduction to Subset Sum; a backend without that reduction skips the Reduce tests.

import { expect, test } from "./fixtures";
import { skipStartupSplash } from "./helpers";

const PROBLEM = "Exact Cover";
const INSTANCE = "({1,2,3},{{1},{2,3},{1,2}})";
// 9000 characters: over the 8000 a link may have, before any encoding.
const LONG_INSTANCE = `({1},{${"{1},".repeat(2250)}{1}})`;
const SHARE_ID = "abc123XYZ0";
const SHARE_LINKS = "**/api/redux/ShareLinks**";
const SAVE_REQUEST = /\/api\/redux\/ShareLinks$/;
const OPEN_REQUEST = /\/api\/redux\/ShareLinks\/([^/?]+)$/;

/**
 * Answers the ShareLinks endpoints: `save` for a POST, `open` for a GET of an id; each is
 * `{status, json}`. Returns the bodies POSTed and the ids asked for.
 */
async function answerShareLinks(page, { save, open } = {}) {
  const saved = [];
  const opened = [];
  await page.route(SHARE_LINKS, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && SAVE_REQUEST.test(path)) {
      saved.push(request.postDataJSON());
      await route.fulfill(save ?? { status: 503, json: { error: "short_links_unavailable" } });
      return;
    }
    const match = request.method() === "GET" ? path.match(OPEN_REQUEST) : null;
    if (match) {
      opened.push(match[1]);
      await route.fulfill(open ?? { status: 404, json: { error: "share_not_found" } });
      return;
    }
    await route.fallback();
  });
  return { saved, opened };
}

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

/**
 * Counts the default-picture requests in flight. The workbench gives up on one still in flight
 * when the instance changes, and the suite's fixture counts such a request as a failure, so a
 * test that types a new instance waits for `settled()` first (and before it ends).
 */
function trackPictures(page) {
  const pending = new Set();
  const isPicture = (request) => request.url().includes("/ProblemProvider/visualize?");
  page.on("request", (request) => {
    if (isPicture(request)) pending.add(request);
  });
  page.on("requestfinished", (request) => pending.delete(request));
  page.on("requestfailed", (request) => pending.delete(request));
  return {
    /** Resolves once no picture request is in flight. */
    settled: () => expect.poll(() => pending.size, { timeout: 20_000 }).toBe(0),
  };
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
  // Browsers only offer navigator.clipboard on secure pages (https or localhost). CI serves the
  // app from another container over plain http, so every page here gets a stand-in clipboard
  // that keeps what is written and gives it back.
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      let text = "";
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value) => {
            text = value;
          },
          readText: async () => text,
        },
      });
    });
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

  test("a short instance never asks for a short link (#844)", async ({ page }) => {
    const { saved } = await answerShareLinks(page);
    await openProblem(page, `?instance=${encodeURIComponent(INSTANCE)}`);
    await page.locator("#problem-share-button").click();
    await expect(page.locator("#problem-share-status")).toHaveText("Link copied.");
    const copied = new URL(await page.evaluate(() => navigator.clipboard.readText()));
    expect(copied.searchParams.get("instance")).toBe(INSTANCE);
    expect(copied.searchParams.has("share")).toBe(false);
    expect(saved).toEqual([]);
  });

  test("an instance too long for a link is saved as a short link (#844)", async ({ page }) => {
    const { saved } = await answerShareLinks(page, {
      save: {
        status: 201,
        json: {
          id: SHARE_ID,
          createdAt: "2026-11-25T00:00:00Z",
          expiresAt: "2027-05-24T00:00:00Z",
        },
      },
    });
    // The default picture is waited for before typing and after, so that typing doesn't cut a
    // request short and the test doesn't end in the middle of one.
    const pictures = trackPictures(page);
    await openProblem(page);
    await expect(page.locator("#workbench-instance-full-instance")).not.toHaveValue("");
    await page.waitForTimeout(500);
    await pictures.settled();
    await page.locator("#workbench-instance-full-instance").fill(LONG_INSTANCE);
    await expect(page.locator("#workbench-instance-link-note")).toHaveText(
      "This instance is too long to include in the page's address, so the address leaves it out. Share saves it in a short link instead.",
    );

    await page.locator("#problem-share-button").click();
    await expect(page.locator("#problem-share-status")).toHaveText(
      "Link copied. It is a saved link that lasts about 6 months.",
    );
    const copied = new URL(await page.evaluate(() => navigator.clipboard.readText()));
    expect(copied.origin).toBe(new URL(page.url()).origin);
    expect(copied.pathname).toBe(`/${encodeURIComponent(PROBLEM)}`);
    expect([...copied.searchParams.keys()]).toEqual(["share"]);
    expect(copied.searchParams.get("share")).toBe(SHARE_ID);
    // The whole view went to the server, the instance with it.
    expect(saved).toEqual([{ view: { problem: PROBLEM, instance: LONG_INSTANCE } }]);
    // The long instance's picture is asked for after a pause in typing; let it finish.
    await page.waitForTimeout(1_200);
    await pictures.settled();
  });

  test("when saving fails, the link leaves the instance out and says why (#174, #844)", async ({
    page,
  }) => {
    page.allowNetworkFailures();
    await answerShareLinks(page, {
      save: {
        status: 503,
        json: { error: "short_links_unavailable", message: "No database on this server." },
      },
    });
    await openProblem(page);
    const note = page.locator("#workbench-instance-link-note");
    await expect(note).toHaveCount(0);
    await page.locator("#workbench-instance-full-instance").fill(LONG_INSTANCE);
    await expect(note).toBeVisible();
    // The address leaves it out.
    await page.waitForTimeout(800);
    expect(new URL(page.url()).searchParams.has("instance")).toBe(false);
    expect(page.url().length).toBeLessThan(8000);

    await page.locator("#problem-share-button").click();
    await expect(page.locator("#problem-share-status")).toHaveText(
      "Link copied. The instance is too long for a link, so the link leaves it out and opens on the default instance. A short link couldn't be made: this server can't save links right now.",
    );
    const copied = new URL(await page.evaluate(() => navigator.clipboard.readText()));
    expect(copied.searchParams.has("instance")).toBe(false);
    expect(copied.searchParams.has("share")).toBe(false);

    // A short instance again: back in the address, the note gone.
    await page.locator("#workbench-instance-full-instance").fill(INSTANCE);
    await expect(note).toHaveCount(0);
    await expect.poll(() => new URL(page.url()).searchParams.get("instance")).toBe(INSTANCE);
  });
});

test.describe("Opening a short link (#844)", () => {
  test("restores the saved view and runs nothing by itself (#177)", async ({ page }) => {
    const { opened } = await answerShareLinks(page, {
      open: {
        status: 200,
        json: {
          id: SHARE_ID,
          view: { problem: PROBLEM, instance: INSTANCE },
          createdAt: "2026-11-25T00:00:00Z",
          expiresAt: "2027-05-24T00:00:00Z",
        },
      },
    });
    const computed = recordCompute(page);
    // Other keys in a short link are ignored: the saved view is what opens.
    await openProblem(page, `?share=${SHARE_ID}&instance=${encodeURIComponent("({9},{{9}})")}`);
    await expect(page.locator("#workbench-instance-full-instance")).toHaveValue(INSTANCE);
    expect(opened).toContain(SHARE_ID);
    await expect.poll(() => new URL(page.url()).searchParams.get("instance")).toBe(INSTANCE);
    expect(new URL(page.url()).searchParams.has("share")).toBe(false);
    await expect(page.locator("#problem-share-notice")).toHaveCount(0);
    // Give a stray request time to show up: none may.
    await page.waitForTimeout(1_500);
    expect(computed).toEqual([]);
    // Pressing the button is what runs it.
    await page.locator("#workbench-run").click();
    await expect.poll(() => computed.length).toBeGreaterThan(0);
  });

  test("an unknown or expired one says so and opens on the defaults", async ({ page }) => {
    page.allowNetworkFailures();
    await answerShareLinks(page, {
      open: { status: 404, json: { error: "share_not_found" } },
    });
    const computed = recordCompute(page);
    await openProblem(page, `?share=${SHARE_ID}&instance=${encodeURIComponent(INSTANCE)}`);
    await expect(page.locator("#problem-share-notice")).toHaveText(
      "This share link doesn't exist or has expired (links last about 6 months).",
    );
    // Not the instance in the address: a short link ignores its other keys.
    await expect(page.locator("#workbench-instance-full-instance")).not.toHaveValue(INSTANCE);
    expect(new URL(page.url()).searchParams.has("share")).toBe(false);
    await page.waitForTimeout(1_000);
    expect(computed).toEqual([]);
  });

  test("a server without short links says so", async ({ page }) => {
    page.allowNetworkFailures();
    await answerShareLinks(page, {
      open: { status: 503, json: { error: "short_links_unavailable" } },
    });
    await openProblem(page, `?share=${SHARE_ID}`);
    await expect(page.locator("#problem-share-notice")).toHaveText(
      "This server can't open share links right now.",
    );
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
