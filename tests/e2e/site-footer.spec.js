// tests/e2e/site-footer.spec.js
//
// #303: every page ends in the same footer, the ISU Computer Science logo centered under the
// page, at every width; the banner no longer carries the logo. The footer is an ordinary block
// at the end of the page (not fixed or sticky), and on a phone it never makes the page scroll
// sideways.

import { expect, test } from "./fixtures";
import { skipStartupSplash } from "./helpers";

const PAGES = [
  { name: "Home", path: "/" },
  { name: "Help", path: "/help" },
  { name: "About Us", path: "/aboutus" },
  { name: "a problem page", path: "/3SAT" },
];

for (const width of [1280, 320]) {
  for (const { name, path } of PAGES) {
    test(`${name} at ${width} px ends in the footer with the ISU logo centered, and the banner has none`, async ({
      page,
    }) => {
      await skipStartupSplash(page);
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      const footer = page.locator("#site-footer");
      await expect(footer).toHaveCount(1);
      await expect(page.locator("header[data-site-banner]")).toBeVisible();
      await expect(page.locator("header[data-site-banner] img")).toHaveCount(0);

      // Only the logo, one image for the theme shown.
      await expect(footer.locator("img:visible")).toHaveCount(1);
      await expect(footer.locator("img:visible")).toHaveAttribute(
        "alt",
        "Idaho State University, Computer Science",
      );
      await expect(footer).toHaveText("");

      // An ordinary block: neither fixed nor sticky, at the very end of the page.
      expect(await footer.evaluate((element) => getComputedStyle(element).position)).toBe("static");
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toBeInViewport();
      const { pageBottom, footerBottom, logoCenter, footerCenter, overflow } = await page.evaluate(
        () => {
          const box = document.getElementById("site-footer").getBoundingClientRect();
          const logo = document
            .querySelector("#site-footer img:not([hidden])")
            .closest("span")
            .parentElement.getBoundingClientRect();
          return {
            pageBottom: document.documentElement.scrollHeight,
            footerBottom: box.bottom + window.scrollY,
            logoCenter: logo.x + logo.width / 2,
            footerCenter: box.x + box.width / 2,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        },
      );
      expect(Math.abs(pageBottom - footerBottom)).toBeLessThan(2);
      expect(Math.abs(logoCenter - footerCenter)).toBeLessThan(2);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}
