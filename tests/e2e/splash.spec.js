// tests/e2e/splash.spec.js
//
// T43 (#65). The Home page's startup animation
// (components/StartupSplash.js).
//
// This is the one spec in this directory that does NOT call helpers.js's
// skipStartupSplash -- every other spec does, because the overlay would sit
// between their clicks and the page. Here it is the thing under test.
//
// What's covered is the behaviour the issue settled and that a person can't
// eyeball reliably: that the overlay takes itself down without help, that
// all three skip inputs work, that it plays once per server start and not
// on every reload or return to Home, that `prefers-reduced-motion` skips it
// outright,
// and that it never touches focus. What's deliberately NOT covered is
// whether the motion looks organic -- that's a judgment call for the
// project owner, and a test asserting on frame timing would be both flaky
// and beside the point.

import { expect, test } from "./fixtures";

const SPLASH = "#home-startup-splash";

// Long enough to cover the animation, the settle beat, the maximum hold and
// the fade with room to spare (StartupSplash.js's own STEPS, SETTLE_MS,
// MAX_HOLD_MS and FADE_MS come to about 6.9 seconds in the worst case),
// short enough that a splash which genuinely never leaves still fails the
// test rather than hanging it.
const SPLASH_LIFETIME_MS = 12_000;

// Shorter than the animation's own preset length (about 2.9 seconds), so a
// test asserting the overlay is gone inside this window is proving the skip
// did something and not just outwaiting the animation. Longer than the fade
// a skip still has to play out (FADE_MS, 900ms).
const SKIP_MS = 2_000;

/** Navigates to Home and waits for the animation to actually be running. */
async function gotoHomeAndWaitForSplash(page) {
  await page.goto("/");
  await expect(page.locator(SPLASH)).toHaveAttribute(
    "data-splash-phase",
    /playing|settling|holding/,
  );
}

test("the startup animation plays on first load and clears itself", async ({ page }) => {
  await gotoHomeAndWaitForSplash(page);

  // Decorative overlay, not a dialog: aria-hidden, and the real page is
  // mounted underneath it the whole time rather than replaced by it.
  await expect(page.locator(SPLASH)).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#navbar-wordmark-link")).toBeAttached();

  // Focus is never moved into the overlay or trapped there.
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("BODY");

  // Nothing is clicked or pressed here: it has to come down on its own.
  await expect(page.locator(SPLASH)).toHaveCount(0, { timeout: SPLASH_LIFETIME_MS });
  await expect(page.locator("#home-result-count")).not.toContainText("Loading", {
    timeout: 20_000,
  });
});

test("Escape skips the startup animation", async ({ page }) => {
  await gotoHomeAndWaitForSplash(page);
  await page.keyboard.press("Escape");
  await expect(page.locator(SPLASH)).toHaveCount(0, { timeout: SKIP_MS });
});

test("the spacebar skips the startup animation", async ({ page }) => {
  await gotoHomeAndWaitForSplash(page);
  await page.keyboard.press(" ");
  await expect(page.locator(SPLASH)).toHaveCount(0, { timeout: SKIP_MS });
});

test("clicking skips the startup animation", async ({ page }) => {
  await gotoHomeAndWaitForSplash(page);
  await page.locator(SPLASH).click();
  await expect(page.locator(SPLASH)).toHaveCount(0, { timeout: SKIP_MS });
});

test("the startup animation plays once per server start, not on every load", async ({ page }) => {
  await gotoHomeAndWaitForSplash(page);
  await page.locator(SPLASH).click();
  await expect(page.locator(SPLASH)).toHaveCount(0, { timeout: SKIP_MS });

  // The server has not restarted between these two loads, so it reports the
  // same boot id and the splash has nothing new to play for. A reload is the
  // harsher version of the "return to Home" case the issue rules out
  // replaying on (a client-side navigation back to Home wouldn't even reload
  // the app), so if the gate holds here it holds for that too.
  //
  // What this cannot cover from inside Playwright is the other half of the
  // rule: that restarting the server DOES play it again. That needs a server
  // restart between two page loads, which the e2e run has no handle on -- it
  // is pointed at an already-running instance. Verified by hand instead.
  await page.reload();
  await expect(page.locator("#home-result-count")).not.toContainText("Loading", {
    timeout: 20_000,
  });
  await expect(page.locator(SPLASH)).toHaveCount(0);
});

test.describe("with prefers-reduced-motion set", () => {
  test.use({ reducedMotion: "reduce" });

  test("the startup animation never plays", async ({ page }) => {
    await page.goto("/");

    // Waiting for the catalog first is what makes this assertion mean
    // something: by the time Home has real data on screen, an animation
    // that was going to play would long since have started.
    await expect(page.locator("#home-result-count")).not.toContainText("Loading", {
      timeout: 20_000,
    });
    await expect(page.locator(SPLASH)).toHaveCount(0);
    await expect(page.locator('[id^="problem-card-"]').first()).toBeVisible();
  });
});
