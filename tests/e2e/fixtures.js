// tests/e2e/fixtures.js
//
// T30 (#39). Wraps Playwright's own `test` so a network request that fails
// silently -- one no assertion in the test happens to notice -- still fails
// the test. Every spec in this directory imports `test`/`expect` from here,
// never from "@playwright/test" directly (mirrors Redux_GUI's own
// tests/e2e/fixtures.js pattern, per this issue's own instruction to start
// with it).
//
// This matters more here than in a typical project: this whole app's #5
// decision exists because the sibling Redux_GUI project's fetch layer was
// found to silently swallow failed requests -- a broken backend renders a
// page that "looks fine," per that project's own TESTING.md. A test suite
// built the ordinary way, asserting only what each test author explicitly
// thought to check, would happily pass against that same kind of failure if
// this codebase ever regressed back toward it. This file is the net
// underneath every assertion in every other spec, not a substitute for
// them -- see tests/e2e/fixtures-wrapper.spec.js for a test proving the net
// actually catches something, not just that this file exists.
//
// Scoped to this app's own same-origin `/api/` calls (lib/redux/index.js's
// requests all go through pages/api/redux/[...path].js at that path), not
// every request the browser happens to make -- a missing favicon (this repo
// has no public/ directory yet) or some Next.js dev-only asset 404ing isn't
// the kind of "quiet failure" #5/this issue care about, and treating it as
// one would make this wrapper too noisy to trust.
//
// A test that deliberately breaks the network on purpose (e.g. simulating
// an unreachable backend, tests/e2e/network-resilience.spec.js) calls the
// `page.allowNetworkFailures()` escape hatch this fixture adds, opting out
// of this check for that one test -- there, a failed request is the
// expected behavior under test, not a bug.

import { test as base, expect } from "@playwright/test";

const API_PATH_PATTERN = /\/api\//;

function isApiRequest(url) {
  return API_PATH_PATTERN.test(new URL(url).pathname);
}

export const test = base.extend({
  // Playwright's own fixture convention names this second callback
  // parameter "use" -- renamed to `provideFixture` here purely to dodge a
  // false positive from eslint-plugin-react-hooks (bundled in
  // eslint-config-next), which flags any function invoking something
  // literally named `use(...)` as if it were React 19's `use()` hook.
  // Playwright doesn't care what this parameter is called; only its
  // position matters.
  page: async ({ page }, provideFixture, testInfo) => {
    const failures = [];
    let allowed = false;

    page.allowNetworkFailures = () => {
      allowed = true;
    };

    const onRequestFailed = (request) => {
      if (isApiRequest(request.url())) {
        failures.push(
          `${request.method()} ${request.url()} -- ${request.failure()?.errorText ?? "failed"}`,
        );
      }
    };

    const onResponse = (response) => {
      if (isApiRequest(response.url()) && !response.ok()) {
        failures.push(
          `${response.request().method()} ${response.url()} -- responded ${response.status()}`,
        );
      }
    };

    page.on("requestfailed", onRequestFailed);
    page.on("response", onResponse);

    await provideFixture(page);

    page.off("requestfailed", onRequestFailed);
    page.off("response", onResponse);

    if (!allowed && failures.length > 0) {
      throw new Error(
        `Network request(s) to this app's own API failed silently during "${testInfo.title}":\n${failures.join("\n")}`,
      );
    }
  },
});

export { expect };
