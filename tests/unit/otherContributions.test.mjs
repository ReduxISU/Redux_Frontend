// tests/unit/otherContributions.test.mjs
//
// The contributor dialog's "Other Contributions" section (components/aboutus/otherContributions.js):
// the profile's `otherContributions` field, which the backend fills only at release time.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  areaHeading,
  needsToggle,
  normalizeOtherContributions,
  PR_PREVIEW_LIMIT,
  prCountLabel,
  pullRequestLabel,
  toggleLabel,
  visiblePullRequests,
} from "../../components/aboutus/otherContributions.js";

const pr = (number, title = `PR ${number}`, repo = "Redux") => ({
  repo,
  number,
  title,
  url: `https://github.com/ReduxISU/${repo}/pull/${number}`,
});

describe("normalizeOtherContributions", () => {
  test("missing, null, empty or non-array input shows nothing", () => {
    assert.deepEqual(normalizeOtherContributions(undefined), []);
    assert.deepEqual(normalizeOtherContributions(null), []);
    assert.deepEqual(normalizeOtherContributions([]), []);
    assert.deepEqual(normalizeOtherContributions({}), []);
    assert.deepEqual(normalizeOtherContributions("Not specified"), []);
  });

  test("keeps the backend's area order and PR order", () => {
    const input = [
      { area: "Tests", pullRequests: [pr(12), pr(3)] },
      { area: "CI and build tooling", pullRequests: [pr(880, "Move CI to rbs")] },
    ];
    assert.deepEqual(normalizeOtherContributions(input), input);
  });

  test("drops areas with no usable pull requests", () => {
    const input = [
      { area: "Tests", pullRequests: [] },
      { area: "Documentation" },
      { area: "Redux_GUI interface", pullRequests: [pr(5, "x", "Redux_GUI")] },
      { pullRequests: [pr(6)] },
      null,
    ];
    assert.deepEqual(
      normalizeOtherContributions(input).map((entry) => entry.area),
      ["Redux_GUI interface"],
    );
  });

  test("drops pull requests missing a repo, number or url, and blanks a missing title", () => {
    const input = [
      {
        area: "Tests",
        pullRequests: [
          { repo: "Redux", number: 1, url: "" },
          { repo: "", number: 2, url: "https://x" },
          { repo: "Redux", number: "3", url: "https://x" },
          null,
          { repo: "Redux", number: 4, url: "https://github.com/ReduxISU/Redux/pull/4" },
        ],
      },
    ];
    assert.deepEqual(normalizeOtherContributions(input)[0].pullRequests, [
      { repo: "Redux", number: 4, title: "", url: "https://github.com/ReduxISU/Redux/pull/4" },
    ]);
  });
});

describe("labels", () => {
  test("the PR count is singular for one", () => {
    assert.equal(prCountLabel(1), "1 PR");
    assert.equal(prCountLabel(4), "4 PRs");
    assert.equal(areaHeading("CI and build tooling", 4), "CI and build tooling (4 PRs)");
    assert.equal(areaHeading("Documentation", 1), "Documentation (1 PR)");
  });

  test("a PR reads repo, number and title", () => {
    assert.equal(pullRequestLabel(pr(880, "Move CI to rbs")), "Redux #880: Move CI to rbs");
    assert.equal(pullRequestLabel(pr(7, "", "Redux_Frontend")), "Redux_Frontend #7");
  });

  test("the toggle offers every PR, then fewer", () => {
    assert.equal(toggleLabel(12, false), "Show all 12");
    assert.equal(toggleLabel(12, true), "Show fewer");
  });
});

describe("slicing", () => {
  const many = Array.from({ length: 12 }, (_, index) => pr(100 - index));

  test("shows the first five until expanded", () => {
    assert.equal(PR_PREVIEW_LIMIT, 5);
    assert.deepEqual(visiblePullRequests(many, false), many.slice(0, 5));
    assert.deepEqual(visiblePullRequests(many, true), many);
  });

  test("only an area over the limit gets the toggle", () => {
    assert.equal(needsToggle(many), true);
    assert.equal(needsToggle(many.slice(0, 5)), false);
    assert.equal(needsToggle(many.slice(0, 6)), true);
  });
});
