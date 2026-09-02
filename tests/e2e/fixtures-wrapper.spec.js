// tests/e2e/fixtures-wrapper.spec.js
//
// T30 (#39) done-when: "the fixtures wrapper fails on silent network
// errors, and there's a test proving it does." Every other spec relies on
// tests/e2e/fixtures.js's `test` catching a request that fails without any
// assertion in the test noticing -- this file is the proof that reliance is
// warranted, not just an assumption.
//
// Marked `test.fail()`: this test is SUPPOSED to fail, because the wrapper
// is supposed to catch the silent 500 below and throw. Playwright reports
// an expected failure as a pass for the overall run (`npm run test:e2e`
// still exits 0), and flips to a real failure only if this test
// unexpectedly *passes* -- which is exactly what would happen if the
// wrapper in fixtures.js ever stopped doing its job. That's the proof: a
// working wrapper keeps this file green; a broken one turns it red.

import { expect, test } from "./fixtures";

test.describe("the fixtures wrapper", () => {
  test("fails a test when an API request fails without being asserted on", async ({ page }) => {
    test.fail();

    // Deliberately do NOT call page.allowNetworkFailures() -- that's the
    // whole point here, unlike every other test that breaks the network on
    // purpose (tests/e2e/network-resilience.spec.js).
    await page.route("**/api/redux/**", (route) =>
      route.fulfill({ status: 500, body: "manufactured failure for this test" }),
    );

    await page.goto("/");
    // The catalog fetch this manufactured 500 breaks happens client-side
    // after the initial page load (a useEffect, not part of navigation), so
    // page.goto() resolving is not enough -- without waiting for it to
    // actually settle, this test function would return (and the wrapper's
    // teardown would run) before the 500 the route above manufactures has
    // even happened, and there would be nothing to catch. Once it settles,
    // this waits for the *page* to say something's wrong (the loading text
    // clearing) -- deliberately not written as an assertion of its own,
    // since the point of this test is that nothing here needs to notice the
    // failure for the wrapper to still catch it.
    await expect(page.locator("#home-result-count")).not.toContainText("Loading", {
      timeout: 20_000,
    });
  });
});
