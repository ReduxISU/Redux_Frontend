// tests/e2e/aboutus-contributor-dialog.spec.js
//
// The About Us contributor dialog's "Other Contributions" section: a contributor's pull requests
// outside the code-credited lists, grouped by area. The backend fills the profile's
// `otherContributions` only at release time, so both the directory and the profile are answered
// here rather than by whatever backend is behind the suite.

import { expect, test } from "./fixtures";

const NAME = "Test Contributor";
const DIRECTORY = /\/api\/redux\/Navigation\/ContributorProfile\/directory$/;
const PROFILE = /\/api\/redux\/Navigation\/ContributorProfile\/Test%20Contributor$/;

const pr = (repo, number, title) => ({
  repo,
  number,
  title,
  url: `https://github.com/ReduxISU/${repo}/pull/${number}`,
});

const BASE_PROFILE = {
  name: NAME,
  email: "Not specified",
  education: "Not specified",
  major: "Not specified",
  bio: "Not specified",
  totalContributions: 1,
  problemsContributed: ["Clique"],
  solversCreated: [],
  reductionsCreated: [],
  verifiersContributed: [],
  visualizationsCreated: [],
  legacyContributions: ["An old problem"],
};

const OTHER = [
  {
    area: "Tests",
    pullRequests: Array.from({ length: 7 }, (_, index) =>
      pr("Redux", 900 - index, `Test ${index}`),
    ),
  },
  { area: "CI and build tooling", pullRequests: [pr("Redux", 880, "Move CI to rbs")] },
];

async function openDialog(page, profile) {
  await page.route(DIRECTORY, (route) =>
    route.fulfill({ json: [{ name: NAME, githubUsername: "" }] }),
  );
  await page.route(PROFILE, (route) => route.fulfill({ json: profile }));
  await page.goto("/aboutus");
  await page.locator("#contributor-test-contributor-open").click();
  await expect(page.getByRole("dialog")).toContainText("Clique");
}

const section = (page) => page.locator("#contributor-dialog-other-contributions");

test("lists other PRs by area, five at a time, before Past Contributions", async ({ page }) => {
  await openDialog(page, { ...BASE_PROFILE, otherContributions: OTHER });

  await expect(section(page)).toContainText("Other Contributions");
  await expect(section(page)).toContainText("Tests (7 PRs)");
  await expect(section(page)).toContainText("CI and build tooling (1 PR)");

  const link = section(page).getByRole("link", { name: "Redux #880: Move CI to rbs" });
  await expect(link).toHaveAttribute("href", "https://github.com/ReduxISU/Redux/pull/880");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");

  const testsLinks = section(page).locator("ul").first().getByRole("link");
  await expect(testsLinks).toHaveCount(5);
  const toggle = page.locator("#contributor-dialog-other-contributions-0-toggle");
  await expect(toggle).toHaveText("Show all 7");
  await toggle.click();
  await expect(testsLinks).toHaveCount(7);
  await expect(toggle).toHaveText("Show fewer");
  await toggle.click();
  await expect(testsLinks).toHaveCount(5);
  // The one-PR area has nothing to expand.
  await expect(page.locator("#contributor-dialog-other-contributions-1-toggle")).toHaveCount(0);

  // Current work first, the caveated historical list last.
  const text = await page.getByRole("dialog").innerText();
  expect(text.indexOf("Other Contributions")).toBeLessThan(text.indexOf("Past Contributions"));
});

for (const [label, otherContributions] of [
  ["missing", undefined],
  ["null", null],
  ["empty", []],
]) {
  test(`shows nothing when otherContributions is ${label}`, async ({ page }) => {
    await openDialog(page, { ...BASE_PROFILE, otherContributions });
    await expect(page.getByRole("dialog")).toContainText("Past Contributions");
    await expect(section(page)).toHaveCount(0);
  });
}
