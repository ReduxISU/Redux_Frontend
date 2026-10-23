// tests/e2e/names.spec.js
//
// #279 (Names). People see each problem by Redux's display name, `problemName` from
// Navigation/Batch/allInfo ("Clique", "Vertex Cover", "3SAT"), exactly as Redux writes it:
// never its key (CLIQUE, VERTEXCOVER, SAT3) and never re-cased into all caps. The key still
// finds a problem: in a route, in Compare's query, and in every search and problem picker.
//
// Every expected name is read from the live backend's own allInfo, never written in by hand,
// so the specs hold on ghcr.io/reduxisu/redux:latest and on a newer local Redux alike. The few
// problems named below (Vertex Cover, 3SAT, Clique) are on both.

import { expect, test } from "./fixtures";
import {
  chooseReduceTarget,
  gotoHomeAndWaitForLoad,
  gotoProblemDetail,
  showPane,
  skipStartupSplash,
  startWithPanesExpanded,
} from "./helpers";

// #279 (Workspace tweaks): Execute and Verify start collapsed for a new viewer. These tests use
// what the open panes hold, so each starts as a viewer who saved them open.
test.beforeEach(async ({ page }) => {
  await startWithPanesExpanded(page);
});

/** Redux's key -> display name map, read the way the site reads it. */
async function readDisplayNames(request) {
  const [keys, info] = await Promise.all([
    request.get("/api/redux/Navigation/Batch/allProblems").then((response) => response.json()),
    request.get("/api/redux/Navigation/Batch/allInfo").then((response) => response.json()),
  ]);
  return new Map(keys.map((key) => [key, info[key]?.problemName || key]));
}

/** What the reader sees: the rendered text, after any CSS text-transform. */
const seenText = (locator) => locator.evaluate((element) => element.innerText.trim());

test("the catalog cards show each problem's display name as Redux writes it, and link by it", async ({
  page,
  request,
}) => {
  const names = await readDisplayNames(request);
  const displayNames = new Set(names.values());
  // Keys that differ from their display name, so a card showing one is a card showing the key.
  const keysOnly = [...names].filter(([key, name]) => key !== name).map(([key]) => key);

  await gotoHomeAndWaitForLoad(page, { expect });
  const cards = page.locator('[id^="problem-card-"][aria-label]');
  await expect(cards.first()).toBeVisible();

  const headings = await cards.locator("h3").evaluateAll((elements) =>
    elements.map((element) => ({
      text: element.textContent.trim(),
      seen: element.innerText.trim(),
      transform: getComputedStyle(element).textTransform,
    })),
  );
  expect(headings.length).toBe(await cards.count());
  for (const heading of headings) {
    expect(displayNames.has(heading.text), `"${heading.text}" is a display name`).toBe(true);
    expect(keysOnly).not.toContain(heading.text);
    // Not shouted: the card shows the name in Redux's own case.
    expect(heading.transform).toBe("none");
    expect(heading.seen).toBe(heading.text);
  }

  // Vertex Cover reads "Vertex Cover" (not VERTEXCOVER or VERTEX COVER), and its link is the
  // route the problem page resolves.
  const vertexCover = page.locator('a[id^="problem-card-"][aria-label="Vertex Cover"]');
  await expect(vertexCover).toHaveAttribute("href", "/Vertex%20Cover");
  expect(await seenText(vertexCover.locator("h3"))).toBe("Vertex Cover");
  // An acronym stays one: 3SAT is 3SAT, as Redux names it.
  expect(await seenText(page.locator('[id^="problem-card-"][aria-label="3SAT"] h3'))).toBe("3SAT");
});

test("the Home search finds a problem by its display name or by its key", async ({ page }) => {
  await gotoHomeAndWaitForLoad(page, { expect });
  const search = page.locator("#search-bar-input");
  const card = (name) => page.locator(`[id^="problem-card-"][aria-label="${name}"]`);

  await search.fill("Vertex Cover");
  await expect(card("Vertex Cover")).toBeVisible();

  // Typed as the key, in any case: the card still shows the display name.
  await search.fill("vertexcover");
  await expect(card("Vertex Cover")).toBeVisible();
  await search.fill("SAT3");
  await expect(card("3SAT")).toBeVisible();
  await expect(page.locator('[id^="problem-card-"][aria-label="SAT3"]')).toHaveCount(0);
});

test("the problem page names its problem by display name: heading, tab title and Verify strip", async ({
  page,
}) => {
  await skipStartupSplash(page);
  await gotoProblemDetail(page, "Vertex Cover", { expect });

  await expect(page).toHaveTitle("Vertex Cover · Redux");
  // #279: the picture's heading names the problem (the Problem line is gone).
  await expect(page.locator("#workbench-source-frame-title")).toHaveText("Vertex Cover");
  await showPane(page, "verify", { expect });
  const strip = page.locator("#workbench-verify-source-toggle");
  await expect(strip).toBeVisible();
  // Read as rendered, so an upper-casing style would show here.
  expect(await seenText(strip.locator("span").first())).toBe("Verify Vertex Cover");
});

test("a route that names the problem by its key opens the same page, titled by display name", async ({
  page,
}) => {
  await skipStartupSplash(page);
  await page.goto("/VERTEXCOVER");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vertex Cover", {
    timeout: 20_000,
  });
  await expect(page).toHaveTitle("Vertex Cover · Redux");
});

test("Reduce mode's target menu and its picture headings use display names", async ({
  page,
  request,
}) => {
  const names = await readDisplayNames(request);
  const displayNames = new Set(names.values());

  await skipStartupSplash(page);
  await gotoProblemDetail(page, "3SAT", { expect });
  await page.locator("#workbench-mode-reduce").click();

  await page.locator("#workbench-target-button").click();
  const options = page.locator("#workbench-target-listbox").getByRole("option");
  await expect(options.first()).toBeVisible();
  const targets = await options.evaluateAll((elements) =>
    elements.map((element) => element.querySelector("[id$='-name']")?.textContent?.trim() ?? ""),
  );
  await page.keyboard.press("Escape");
  for (const target of targets.filter(Boolean)) {
    expect(displayNames.has(target), `"${target}" is a display name`).toBe(true);
  }

  const target = await chooseReduceTarget(page, /^Clique$/, { expect });
  expect(target).toBe("Clique");
  await expect(page.locator("#workbench-source-frame-title")).toHaveText("Source: 3SAT");
  await expect(page.locator("#workbench-target-frame-title")).toHaveText("Target: Clique");
});

test("Compare names its columns by display name, even when its URL uses keys", async ({ page }) => {
  await skipStartupSplash(page);
  await page.goto("/compare?problems=SAT3,CLIQUE");
  await expect(page.locator("main")).toContainText("3SAT vs. Clique", { timeout: 20_000 });
  await expect(page.locator("#compare-column-3sat-detail-link")).toHaveAttribute("href", "/3SAT");
  await expect(page.locator("#compare-column-clique-detail-link")).toHaveAttribute(
    "href",
    "/Clique",
  );
  await expect(page).toHaveTitle("3SAT vs. Clique · Compare · Redux");
});

test("the Reduction Graph's path finder finds a problem by its key", async ({ page }) => {
  await skipStartupSplash(page);
  await page.goto("/reduction-graph");
  const source = page.locator("#reduction-path-source-input");
  await expect(source).toBeEnabled({ timeout: 20_000 });
  await source.fill("SAT3");
  await expect(page.getByRole("option", { name: "3SAT", exact: true })).toBeVisible();
  await source.fill("vertexcover");
  await expect(page.getByRole("option", { name: "Vertex Cover", exact: true })).toBeVisible();
});
