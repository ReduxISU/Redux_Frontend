// tests/e2e/detail.spec.js
//
// T30 (#39). Covers the issue's Problem Detail bullets: clicking a card
// reaches the detail page, sections collapse/expand, sections can be
// reordered with the keyboard, and "Reset to default" restores the order.
//
// Never names a specific problem -- every test opens whichever problem the
// live catalog happens to put first (helpers.js's gotoFirstProblemDetail),
// same "don't hardcode catalog contents" reasoning as home.spec.js.

import { expect, test } from "./fixtures";
import { gotoFirstProblemDetail, reorderFirstSectionWithKeyboard } from "./helpers";

// The five section titles in their default order (components/
// ProblemDetailLayout.js's own SECTIONS constant) -- fixed application
// structure, not catalog-derived data, so asserting this literal text is
// not the kind of hardcoding this issue's done-when warns against (that's
// about problem counts, which do change as the catalog grows; this list
// doesn't).
const DEFAULT_LAYOUT_STATUS =
  "Drag any section by its grip to reorder. Click a chevron to expand. Current layout: " +
  "Overview, Visualizations, Solvers, Verifier, Reductions.";

test("clicking a card reaches its detail page", async ({ page }) => {
  const { name } = await gotoFirstProblemDetail(page, { expect });

  expect(new URL(page.url()).pathname).toBe(`/${encodeURIComponent(name)}`);
  await expect(page.locator('nav[aria-label="Breadcrumb"]')).toContainText(name);
});

test("sections collapse and expand", async ({ page }) => {
  await gotoFirstProblemDetail(page, { expect });

  const toggle = page.locator("#section-overview-toggle");
  const body = page.locator("#section-overview-body");

  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(body).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(body).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(body).toBeVisible();
});

test("sections can be reordered using the keyboard", async ({ page }) => {
  await gotoFirstProblemDetail(page, { expect });

  const status = page.locator("#detail-layout-status");
  await expect(status).toHaveText(DEFAULT_LAYOUT_STATUS);

  await reorderFirstSectionWithKeyboard(page);

  await expect(status).not.toHaveText(DEFAULT_LAYOUT_STATUS);
});

test("Reset to default restores the canonical section order", async ({ page }) => {
  await gotoFirstProblemDetail(page, { expect });

  const status = page.locator("#detail-layout-status");
  await reorderFirstSectionWithKeyboard(page);
  await expect(status).not.toHaveText(DEFAULT_LAYOUT_STATUS);

  await page.locator("#detail-layout-reset").click();

  await expect(status).toHaveText(DEFAULT_LAYOUT_STATUS);
});
