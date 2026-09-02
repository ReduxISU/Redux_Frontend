// tests/e2e/detail.spec.js
//
// T30 (#39). Covers the issue's Problem Detail bullets: clicking a card
// reaches the detail page, sections collapse/expand, sections can be
// reordered with the keyboard, and "Reset to default" restores the order.
//
// T35 (#93) added the last test: the Solvers and Verifier sections show one
// shared, editable problem instance.
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

  // Sections default to collapsed (components/detail/SectionShell.js).
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(body).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(body).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(body).toBeHidden();
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

// T35 (#93). Both sections render their own input bound to a single value
// owned by components/ProblemDetailLayout.js, so a certificate can never be
// checked against a different instance than the one that was solved. Reads
// whatever instance the live backend declares for this problem rather than
// asserting a literal, same reasoning as the rest of this file.
test("Solvers and Verifier share one editable problem instance", async ({ page }) => {
  await gotoFirstProblemDetail(page, { expect });

  await page.locator("#section-solvers-toggle").click();
  await page.locator("#section-verifier-toggle").click();

  const solversInstance = page.locator("#solvers-instance-input");
  const verifierInstance = page.locator("#verifier-instance-input");

  // Pre-filled from the problem's declared defaultInstance, which every
  // problem in the catalog supplies today.
  const declaredInstance = await solversInstance.inputValue();
  expect(declaredInstance).not.toBe("");
  await expect(verifierInstance).toHaveValue(declaredInstance);

  await solversInstance.fill(`${declaredInstance} edited-in-solvers`);
  await expect(verifierInstance).toHaveValue(`${declaredInstance} edited-in-solvers`);

  await verifierInstance.fill(`${declaredInstance} edited-in-verifier`);
  await expect(solversInstance).toHaveValue(`${declaredInstance} edited-in-verifier`);

  // T37 (#95) turned Run on, so it is enabled whenever there is an instance
  // to run. Emptying the box has to disable it again: a Run with nothing to
  // solve can only fail. Full coverage of the live Run and Verify paths is
  // T39 (#97); this is the one assertion this test already owned, kept
  // pointing at the current behaviour rather than the retired one.
  const runButton = page.locator("#solvers-run-button");
  await expect(runButton).toBeEnabled();
  await solversInstance.fill("");
  await expect(runButton).toBeDisabled();
});
