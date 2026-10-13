// tests/e2e/theme.spec.js
//
// #156: the light and dark themes. Covers the nav toggle (switches the theme, survives a reload),
// following the system setting when nothing is saved, the ISU logo swapping with the theme, and
// the toggle's id and accessible name. Runs on /help, which needs no backend, so these pass with
// or without one.

import { expect, test } from "./fixtures";

const PAGE = "/help";
const html = (page) => page.locator("html");
const toggle = (page) => page.locator("#navbar-theme-toggle");

for (const scheme of ["dark", "light"]) {
  test(`with no saved choice the page follows a ${scheme} system setting`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(PAGE);
    await expect(html(page)).toHaveAttribute("data-theme", scheme);
  });
}

test("the toggle switches the theme and the choice survives a reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(PAGE);
  await expect(html(page)).toHaveAttribute("data-theme", "dark");
  const darkBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await toggle(page).click();
  await expect(html(page)).toHaveAttribute("data-theme", "light");
  const lightBackground = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(lightBackground).not.toBe(darkBackground);

  // The saved choice wins over the (still dark) system setting after a reload.
  await page.reload();
  await expect(html(page)).toHaveAttribute("data-theme", "light");

  await toggle(page).click();
  await expect(html(page)).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(html(page)).toHaveAttribute("data-theme", "dark");
});

test("the ISU logo swaps with the theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(PAGE);

  const darkLogo = page.locator("#navbar-isu-logo-dark");
  const lightLogo = page.locator("#navbar-isu-logo-light");
  await expect(darkLogo).toBeVisible();
  await expect(lightLogo).toBeHidden();
  await expect(darkLogo).toHaveAttribute("alt", "Idaho State University, Computer Science");
  expect(await darkLogo.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);

  await toggle(page).click();
  await expect(lightLogo).toBeVisible();
  await expect(darkLogo).toBeHidden();
  expect(await lightLogo.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
});

test("the toggle has a unique id and names the theme it switches to", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(PAGE);

  await expect(page.locator("#navbar-theme-toggle")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Switch to the light theme" })).toHaveAttribute(
    "id",
    "navbar-theme-toggle",
  );

  await toggle(page).click();
  await expect(page.getByRole("button", { name: "Switch to the dark theme" })).toHaveAttribute(
    "id",
    "navbar-theme-toggle",
  );
  await expect(page.getByRole("button", { name: "Switch to the light theme" })).toHaveCount(0);
});

test("the toggle stays usable at phone width, at least 44px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(PAGE);

  // boundingBox() does not wait, and under a busy parallel run the toggle can still be
  // mounting when the page's load event fires.
  await expect(toggle(page)).toBeVisible();
  const box = await toggle(page).boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator("#navbar-menu-button")).toBeVisible();

  await toggle(page).click();
  await expect(html(page)).toHaveAttribute("data-theme", "dark");
});
