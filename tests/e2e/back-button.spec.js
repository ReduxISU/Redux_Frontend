// tests/e2e/back-button.spec.js
//
// #327: the problem page's Back control, above the title. Reached from another page of the site
// it goes back in history (that page comes back); opened from outside (a shared link) it goes to
// the problem list. It is a link with an accessible name, so the keyboard reaches and uses it.

import { expect, test } from "./fixtures";
import { skipStartupSplash } from "./helpers";

const PROBLEM = "Exact Cover";

async function waitForProblem(page) {
  await expect(page.getByRole("heading", { level: 1, name: PROBLEM })).toBeVisible({
    timeout: 20_000,
  });
}

test("opened from a shared link, Back goes to the problem list", async ({ page }) => {
  await skipStartupSplash(page);
  await page.goto(`/${encodeURIComponent(PROBLEM)}?instance=${encodeURIComponent("({1},{{1}})")}`);
  await waitForProblem(page);
  const back = page.locator("#problem-back");
  await expect(back).toHaveAccessibleName("Back to problems");
  await expect(back).toHaveAttribute("data-goes", "home");
  // Above the title.
  const backBox = await back.boundingBox();
  const titleBox = await page.getByRole("heading", { level: 1, name: PROBLEM }).boundingBox();
  expect(backBox.y + backBox.height).toBeLessThanOrEqual(titleBox.y + 1);
  expect(backBox.height).toBeGreaterThanOrEqual(44);

  // The keyboard: focus it and press Enter.
  await back.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("#home-result-count")).toBeVisible();
});

test("reached from another page of the site, Back goes back in history to it", async ({ page }) => {
  await skipStartupSplash(page);
  await page.goto("/help");
  // A client-side move from the site to the problem page.
  await page.evaluate((name) => window.next.router.push(`/${encodeURIComponent(name)}`), PROBLEM);
  await waitForProblem(page);
  const back = page.locator("#problem-back");
  await expect(back).toHaveAccessibleName("Back");
  await expect(back).toHaveAttribute("data-goes", "back");
  await back.click();
  await expect(page).toHaveURL(/\/help$/);
});

test("the workbench rewriting the address is not a page to go back to", async ({ page }) => {
  await skipStartupSplash(page);
  await page.goto(`/${encodeURIComponent(PROBLEM)}`);
  await waitForProblem(page);
  await page.locator("#workbench-instance-full-instance").fill("({1,2},{{1},{2}})");
  await expect.poll(() => new URL(page.url()).searchParams.get("instance")).not.toBeNull();
  await expect(page.locator("#problem-back")).toHaveAccessibleName("Back to problems");
});
