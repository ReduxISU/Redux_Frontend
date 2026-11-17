// components/aboutus/otherContributions.js
//
// The pure logic behind ContributorDialog's "Other Contributions" section: a contributor's
// pull requests outside problems, solvers, verifiers, reductions and visualizations (the
// dialog's code-credited lists already cover those), grouped by area. The backend fills the
// profile's `otherContributions` field at release time, so it is often missing or empty;
// everything here then answers [] and the section renders nothing.
//
// Shape, from the backend (areas and PRs in the order it sends them, PRs newest first):
//   [{ area: "CI and build tooling",
//      pullRequests: [{ repo: "Redux", number: 880, title: "Move CI to rbs", url: "https://..." }] }]

/** How many PRs an area lists before its "Show all" toggle. */
export const PR_PREVIEW_LIMIT = 5;

function isPullRequest(pr) {
  return (
    pr != null &&
    typeof pr.url === "string" &&
    pr.url !== "" &&
    typeof pr.repo === "string" &&
    pr.repo !== "" &&
    Number.isInteger(pr.number)
  );
}

/**
 * The areas worth showing, in the backend's order: drops anything that is not an area with a
 * name and at least one usable pull request (one with a repo, number and url). Missing, null
 * or non-array input answers [].
 *
 * @param {unknown} otherContributions The profile's `otherContributions` field.
 * @returns {{area: string, pullRequests: {repo: string, number: number, title: string, url: string}[]}[]}
 */
export function normalizeOtherContributions(otherContributions) {
  if (!Array.isArray(otherContributions)) return [];
  return otherContributions
    .filter((entry) => entry && typeof entry.area === "string" && entry.area !== "")
    .map((entry) => ({
      area: entry.area,
      pullRequests: (Array.isArray(entry.pullRequests) ? entry.pullRequests : [])
        .filter(isPullRequest)
        .map((pr) => ({ ...pr, title: typeof pr.title === "string" ? pr.title : "" })),
    }))
    .filter((entry) => entry.pullRequests.length > 0);
}

/** "1 PR", "4 PRs". */
export function prCountLabel(count) {
  return `${count} ${count === 1 ? "PR" : "PRs"}`;
}

/** An area's sub-heading: "CI and build tooling (4 PRs)". */
export function areaHeading(area, count) {
  return `${area} (${prCountLabel(count)})`;
}

/** A PR link's text: "Redux #880: Move CI to rbs" (no ": " when the title is blank). */
export function pullRequestLabel(pr) {
  const base = `${pr.repo} #${pr.number}`;
  return pr.title ? `${base}: ${pr.title}` : base;
}

/** The PRs an area shows: the first PR_PREVIEW_LIMIT, or every one once expanded. */
export function visiblePullRequests(pullRequests, expanded, limit = PR_PREVIEW_LIMIT) {
  return expanded ? pullRequests : pullRequests.slice(0, limit);
}

/** Whether an area has more PRs than its preview shows, so it needs the toggle. */
export function needsToggle(pullRequests, limit = PR_PREVIEW_LIMIT) {
  return pullRequests.length > limit;
}

/** The toggle's text: "Show all 12" while collapsed, "Show fewer" once expanded. */
export function toggleLabel(count, expanded) {
  return expanded ? "Show fewer" : `Show all ${count}`;
}
