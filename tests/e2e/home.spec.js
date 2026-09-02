// tests/e2e/home.spec.js
//
// T30 (#39). Covers the issue's Home-page bullets: renders cards, search
// narrows results, a filter narrows results and updates counts, filters
// across two categories narrow rather than widen, and chips + "Clear all."
//
// Every count used below is read off the live page (helpers.js), never
// written as a literal -- the done-when is explicit that a test asserting a
// specific catalog size breaks the day someone adds a problem.

import { expect, test } from "./fixtures";
import {
  expandFacetGroup,
  gotoHomeAndWaitForLoad,
  pickNarrowingOption,
  readFacetOptions,
  readResultCount,
} from "./helpers";

test("the Home page renders cards", async ({ page }) => {
  await gotoHomeAndWaitForLoad(page, { expect });

  // Matches whichever id the error banner currently has -- `main` has
  // `catalog-error-banner` as of this task; T29 (#38, a sibling branch off
  // the same `main` this task also branched from) renames it to the shared
  // `backend-error-banner` once it merges. Checking for its absence under
  // either name means this assertion doesn't need updating either way.
  await expect(page.locator("#backend-error-banner, #catalog-error-banner")).toHaveCount(0);
  await expect(page.locator('[id^="problem-card-"]').first()).toBeVisible();
});

test("search narrows the results to the searched-for problem", async ({ page }) => {
  await gotoHomeAndWaitForLoad(page, { expect });

  const initialCount = await readResultCount(page);
  const firstCard = page.locator('a[id^="problem-card-"]').first();
  const problemName = await firstCard.getAttribute("aria-label");
  expect(problemName).toBeTruthy();

  await page.locator("#search-bar-input").fill(problemName);

  await expect(page.locator("#home-result-count")).not.toContainText("Loading");
  const narrowedCount = await readResultCount(page);
  expect(narrowedCount).toBeGreaterThan(0);
  expect(narrowedCount).toBeLessThanOrEqual(initialCount);
  await expect(page.locator(`[id^="problem-card-"][aria-label="${problemName}"]`)).toBeVisible();
});

test("ticking a filter narrows the results and updates the count", async ({ page }) => {
  await gotoHomeAndWaitForLoad(page, { expect });

  const catalogSize = await readResultCount(page);
  const options = await readFacetOptions(page);
  const option = pickNarrowingOption(options, catalogSize);

  await expandFacetGroup(page, option.facetKey);
  await page.locator(`#${option.id}`).check();

  await expect(page.locator("#home-result-count")).toContainText(String(option.count));
  const narrowedCount = await readResultCount(page);
  expect(narrowedCount).toBe(option.count);
  expect(narrowedCount).toBeLessThan(catalogSize);
});

test("filters across two categories narrow rather than widen", async ({ page }) => {
  await gotoHomeAndWaitForLoad(page, { expect });

  const catalogSize = await readResultCount(page);
  const options = await readFacetOptions(page);
  const first = pickNarrowingOption(options, catalogSize);

  await expandFacetGroup(page, first.facetKey);
  await page.locator(`#${first.id}`).check();
  await expect(page.locator("#home-result-count")).toContainText(String(first.count));
  const afterFirst = await readResultCount(page);
  expect(afterFirst).toBe(first.count);

  // Facet option counts are computed against the full index regardless of
  // which filters are already active (hooks/useCatalogFilters.js's own
  // header comment), so `options` read before checking the first box is
  // still valid for picking the second one.
  const second = pickNarrowingOption(options, catalogSize, { excludeFacetKey: first.facetKey });
  await expandFacetGroup(page, second.facetKey);
  await page.locator(`#${second.id}`).check();
  await expect(page.locator(`#${second.id}`)).toBeChecked();

  // AND-across-facets: adding a second category's filter must never
  // increase the result count past what the first filter alone produced --
  // it may legitimately stay the same (every problem matching the first
  // filter also happens to match the second) rather than strictly
  // decreasing, so this only asserts non-increase, never inequality.
  const afterBoth = await readResultCount(page);
  expect(afterBoth).toBeLessThanOrEqual(afterFirst);
  expect(afterBoth).toBeLessThanOrEqual(second.count);
});

test("chips appear for active filters, and Clear all empties everything", async ({ page }) => {
  await gotoHomeAndWaitForLoad(page, { expect });

  const catalogSize = await readResultCount(page);
  const options = await readFacetOptions(page);
  const option = pickNarrowingOption(options, catalogSize);

  await expandFacetGroup(page, option.facetKey);
  await page.locator(`#${option.id}`).check();

  const removeButton = page.locator(
    `#active-filter-chip-${option.facetKey}-${option.optionKey}-remove`,
  );
  await expect(removeButton).toBeVisible();

  await page.locator("#active-filter-chips-clear-all").click();

  await expect(removeButton).toHaveCount(0);
  await expect(page.locator(`#${option.id}`)).not.toBeChecked();
  await expect(page.locator("#home-result-count")).toContainText(String(catalogSize));
});
