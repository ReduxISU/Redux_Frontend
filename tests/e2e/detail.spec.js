// tests/e2e/detail.spec.js
//
// T30 (#39) covered the old detail page (sections collapsing, keyboard reordering, Reset to
// default, the shared instance between Solvers and Verifier). #229 replaced that page with
// the workbench, so those tests went with it; what is left here is the part that never
// depended on the layout, reaching a problem page from its card, plus the workbench's own
// basics on whichever problem the live catalog puts first.
//
// Never names a specific problem -- every test opens whichever problem the live catalog
// happens to put first (helpers.js's gotoFirstProblemDetail), same "don't hardcode catalog
// contents" reasoning as home.spec.js. The workbench's behaviour on a pinned problem with
// mocked compute is tests/e2e/workbench.spec.js.

import { expect, test } from "./fixtures";
import { gotoFirstProblemDetail } from "./helpers";

test("clicking a card reaches its detail page", async ({ page }) => {
  const { name } = await gotoFirstProblemDetail(page, { expect });

  expect(new URL(page.url()).pathname).toBe(`/${encodeURIComponent(name)}`);
  // #229: no breadcrumb; the site banner handles going back.
  await expect(page.locator('nav[aria-label="Breadcrumb"]')).toHaveCount(0);
  await expect(page.locator("#workbench")).toBeVisible();
});

test("the workbench opens with the instance in its always-visible editor", async ({ page }) => {
  await gotoFirstProblemDetail(page, { expect });

  // #303: no rail or panels; the problem's details are the title's (i) card.
  await expect(page.locator("#workbench-rail")).toHaveCount(0);
  await expect(page.locator("#problem-info-button")).toBeVisible();

  // Every problem declares a runnable default instance today, and the editor shows it.
  const instanceText = await page.locator("#workbench-instance-full-instance").inputValue();
  expect(instanceText.trim()).not.toBe("");
  await expect(page.locator("#workbench-run")).toBeVisible();
  await expect(page.locator("#workbench-pane")).toBeVisible();
});
