// tests/e2e/network-resilience.spec.js
//
// T30 (#39). Covers the issue's last Home bullet -- "With no backend, the
// empty state appears rather than an error" -- which is really this whole
// project's #5 decision (ARCHITECTURE.md) under test: a broken backend must
// degrade to the visible banner + empty grid, never a crash or a silently
// blank page.
//
// The backend is "switched off" here by intercepting this app's own same-
// origin proxy route and returning the exact 502 pages/api/redux/[...path].js
// itself returns when the real upstream is unreachable (see that file's own
// `catch` block) -- the most realistic simulation available without an
// actually-unreachable REDUX_BASE_URL, and it exercises the same code path
// a real outage would.

import { expect, test } from "./fixtures";
import { gotoHomeAndWaitForLoad } from "./helpers";

test("with no backend reachable, the page explains itself instead of crashing", async ({
  page,
}) => {
  // This test's whole point is a deliberately broken backend -- opts out of
  // tests/e2e/fixtures.js's default "no request fails silently" check for
  // this one test (see that file's header comment).
  page.allowNetworkFailures();

  await page.route("**/api/redux/**", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: "Upstream unreachable" }),
    }),
  );

  await gotoHomeAndWaitForLoad(page, { expect });

  // Matches whichever id the error banner currently has -- see
  // home.spec.js's identical comment on this same selector.
  await expect(page.locator("#backend-error-banner, #catalog-error-banner")).toBeVisible();
  await expect(page.locator('[id^="problem-card-"]')).toHaveCount(0);

  // No crash: page chrome still renders around the banner.
  await expect(page.locator("#navbar-wordmark-link")).toBeVisible();

  // Ground rule 6 / T29's done-when in spirit: nothing anywhere prints a
  // raw JS-ism instead of real copy.
  await expect(page.locator("body")).not.toContainText(/undefined|NaN|\[object Object\]/);
});
