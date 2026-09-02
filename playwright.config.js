// playwright.config.js
//
// T30 (#39). Playwright, `@playwright/test`, and the Chromium install step
// (`.devcontainer/post-create.sh`) all predate this file -- this is what
// gives `npm run test:e2e` (already wired up in package.json) something to
// actually run.
//
// PLAYWRIGHT_BASE_URL / RBS_BASE_URL let this point at an already-running
// instance instead of starting its own dev server. T32 (#41) wires
// `rbs.toml`'s `[integration]` section to run `npm run test:e2e` against a
// container `rbs integration-test` already built and started -- `rbs` hands
// that container's address to the test command as `RBS_BASE_URL` (Redux_
// Build_System's own docs/onboarding.md), not a Playwright-specific name,
// so this reads that directly rather than the `[integration].command` string
// needing to rename it into `PLAYWRIGHT_BASE_URL` itself. That renaming was
// tried first and dropped: `command` is a plain string `rbs` runs through
// whatever shell the host has, and `VAR=value cmd` (the POSIX way to do it)
// silently isn't valid on Windows -- reading RBS_BASE_URL here instead needs
// no shell-specific syntax in rbs.toml at all. PLAYWRIGHT_BASE_URL is kept
// too, for pointing this at some other already-running instance by hand
// without going through rbs.
// Either way, `webServer` below is skipped entirely rather than fighting the
// already-running instance for port 3000. With neither set (the plain local
// case), `npm run test:e2e` starts `next dev` itself and waits for it to
// answer `/api/health` (pages/api/health.js) before any spec runs.

import { defineConfig, devices } from "@playwright/test";

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.RBS_BASE_URL;
const baseURL = externalBaseURL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: externalBaseURL
    ? undefined
    : {
        command: "npm run dev",
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
