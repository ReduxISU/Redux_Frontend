// playwright.config.js
//
// T30 (#39). Playwright, `@playwright/test`, and the Chromium install step
// (`.devcontainer/post-create.sh`) all predate this file -- this is what
// gives `npm run test:e2e` (already wired up in package.json) something to
// actually run.
//
// PLAYWRIGHT_BASE_URL lets this point at an already-running instance
// instead of starting its own dev server -- T32 (#41) is expected to set it
// when `rbs.toml`'s `[integration]` section runs these tests against a
// built container rather than `next dev`, so `webServer` below is skipped
// entirely in that case rather than fighting the container for port 3000.
// Locally, with no override, `npm run test:e2e` starts `next dev` itself
// and waits for it to answer `/api/health` (pages/api/health.js) before any
// spec runs.

import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

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
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
