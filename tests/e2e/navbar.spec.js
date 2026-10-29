// tests/e2e/navbar.spec.js
//
// #303: the banner's links read "Problems" (Home) and "Reductions" (the reduction graph), in
// the desktop row and in the phone menu, each marking the page it is on. Starts on /help, which
// needs no backend.

import { expect, test } from "./fixtures";

const LINKS = [
  { id: "navbar-home-link", name: "Problems", href: "/" },
  { id: "navbar-reduction-graph-link", name: "Reductions", href: "/reduction-graph" },
  { id: "navbar-aboutus-link", name: "About Us", href: "/aboutus" },
  { id: "navbar-help-link", name: "Help", href: "/help" },
  { id: "navbar-contribute-link", name: "Contribute", href: "/contribute" },
];

test("the desktop banner names its links Problems, Reductions, About Us, Help, Contribute", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/help");
  const banner = page.locator("header[data-site-banner]");
  for (const { id, name, href } of LINKS) {
    const link = banner.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("id", id);
    await expect(link).toHaveAttribute("href", href);
  }
  await expect(banner.getByRole("link", { name: "Home", exact: true })).toHaveCount(0);
  await expect(banner.getByRole("link", { name: "Reduction Graph", exact: true })).toHaveCount(0);
  await expect(page.locator("#navbar-help-link")).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#navbar-home-link")).not.toHaveAttribute("aria-current", "page");
});

test("the phone menu has the same names, and marks the page it is on", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/help");
  await page.locator("#navbar-menu-button").click();
  const menu = page.locator("#navbar-menu");
  for (const { id, name, href } of LINKS) {
    const item = menu.getByRole("menuitem", { name, exact: true });
    await expect(item).toHaveAttribute("id", `${id}-menu`);
    await expect(item).toHaveAttribute("href", href);
  }
  await expect(page.locator("#navbar-help-link-menu")).toHaveAttribute("aria-current", "page");

  await page.locator("#navbar-reduction-graph-link-menu").click();
  await expect(page).toHaveURL(/\/reduction-graph$/);
  await page.locator("#navbar-menu-button").click();
  await expect(page.locator("#navbar-reduction-graph-link-menu")).toHaveAttribute(
    "aria-current",
    "page",
  );
});
