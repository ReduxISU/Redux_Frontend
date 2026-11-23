// tests/e2e/report-bug.spec.js
//
// #325: the banner's Report a bug link, on every page and at every width. It opens a new
// Redux_Frontend issue in a new tab, filled in with the page the visitor is on and their browser,
// with headings for what happened, what they expected and the steps. GitHub is never reached:
// the new tab's request is answered here.

import { expect, test } from "./fixtures";
import { skipStartupSplash } from "./helpers";

const NEW_ISSUE = "https://github.com/ReduxISU/Redux_Frontend/issues/new";

for (const width of [1280, 360]) {
  test(`at ${width} px the banner has Report a bug, opening a filled-in issue in a new tab`, async ({
    page,
    context,
  }) => {
    await context.route("https://github.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<title>New issue</title>" }),
    );
    await skipStartupSplash(page);
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/help?from=test");
    const link = page.locator("#navbar-report-bug");
    await expect(link).toBeVisible();
    await expect(link).toHaveAccessibleName("Report a bug (opens GitHub in a new tab)");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    if (width >= 600) await expect(link).toHaveText("Report a bug");

    // Keyboard: Tab reaches it, and focusing it fills in this page.
    await link.focus();
    const href = new URL(await link.getAttribute("href"));
    expect(`${href.origin}${href.pathname}`).toBe(NEW_ISSUE);
    expect(href.searchParams.get("title")).toBe("Bug on /help");
    const body = href.searchParams.get("body");
    expect(body).toContain(`Page: ${page.url()}`);
    expect(body).toContain(`Browser: ${await page.evaluate(() => navigator.userAgent)}`);
    for (const heading of ["### What happened", "### What you expected", "### Steps"]) {
      expect(body).toContain(heading);
    }

    const [tab] = await Promise.all([context.waitForEvent("page"), link.click()]);
    await tab.waitForLoadState();
    expect(tab.url().startsWith(`${NEW_ISSUE}?title=`)).toBe(true);
    // The site stays open where it was.
    expect(new URL(page.url()).pathname).toBe("/help");
  });
}

test("on a problem page it names that page, with its address", async ({ page }) => {
  await skipStartupSplash(page);
  await page.goto(`/${encodeURIComponent("Exact Cover")}`);
  await expect(page.getByRole("heading", { level: 1, name: "Exact Cover" })).toBeVisible({
    timeout: 20_000,
  });
  const link = page.locator("#navbar-report-bug");
  await link.hover();
  const href = new URL(await link.getAttribute("href"));
  expect(href.searchParams.get("title")).toBe("Bug on /Exact Cover");
  expect(href.searchParams.get("body")).toContain(`Page: ${page.url()}`);
});
