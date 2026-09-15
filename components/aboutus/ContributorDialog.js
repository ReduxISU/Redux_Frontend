// components/aboutus/ContributorDialog.js
//
// The contributor detail dialog: personal info, GitHub activity, and every
// problem/solver/reduction/verifier/visualization they are credited on. Ported from
// Redux_GUI's pages/aboutus/index.js contributor popup (ProfileField, ContributionList,
// GithubActivitySection, LegacyContributionsList), rebuilt as its own component here
// rather than four inline helper functions inside the page, and restyled against this
// app's theme tokens (text.secondary, divider, primary.light) instead of Redux_GUI's
// own textColors(mode)/hardcoded #F47C20.

import CloseIcon from "@mui/icons-material/Close";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { thinScrollbarSx } from "../theme";

// Only renders when there is an actual value -- avoids "Not specified" clutter for a
// field (bio, education, ...) a contributor has not filled in. The backend answers
// "Not specified" for a genuinely missing field (see ReduxISU/Redux's
// ContributorProfileController), which this treats the same as an empty string.
function ProfileField({ label, value }) {
  if (!value || value === "Not specified") return null;
  return (
    <Typography variant="body2" sx={{ mb: 0.5 }}>
      <Box component="span" sx={{ fontWeight: 700 }}>
        {label}:
      </Box>{" "}
      {value}
    </Typography>
  );
}

// A category of code credit ("Problems", "Solvers", ...): a count, then a bulleted
// list of names. Renders nothing when the contributor has none in this category,
// rather than a "0" line for every category on every profile.
function ContributionList({ label, items }) {
  if (!items || items.length === 0) return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {label}: {items.length}
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 3, color: "text.secondary" }}>
        {items.map((item) => (
          <Typography component="li" variant="body2" key={item}>
            {item}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

const REPO_STAT_FIELDS = [
  { key: "commits", label: "commits" },
  { key: "prsOpened", label: "PRs opened" },
  { key: "prsMerged", label: "PRs merged" },
  { key: "reviews", label: "reviews" },
];

// Renders as "100 commits, 14 PRs opened, 79 PRs merged, 31 reviews", dropping any
// field that is zero or missing.
function formatRepoStats(stats) {
  if (!stats) return [];
  return REPO_STAT_FIELDS.map(({ key, label }) => {
    const value = stats[key] ?? 0;
    return value > 0 ? `${value} ${label}` : null;
  }).filter(Boolean);
}

// The whole section, including its own heading, collapses to nothing when neither
// repo has any non-zero stats -- covers contributors with no linked GitHub account as
// well as stub entries with nothing computed yet.
function GithubActivitySection({ reduxStats, reduxGuiStats }) {
  const rows = [
    { label: "Redux", parts: formatRepoStats(reduxStats) },
    { label: "Redux GUI", parts: formatRepoStats(reduxGuiStats) },
  ].filter(({ parts }) => parts.length > 0);

  if (rows.length === 0) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
        GitHub Activity
      </Typography>
      {rows.map(({ label, parts }) => (
        <Typography key={label} variant="body2" sx={{ color: "text.secondary" }}>
          {label}: {parts.join(", ")}
        </Typography>
      ))}
    </Box>
  );
}

// Real historical work with no live class left to verify against (a deleted problem).
// Visually distinct (a caption line explaining why) so it does not read as equivalent
// to the code-verified categories above.
function LegacyContributionsList({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        Past Contributions
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
        Historical work no longer reflected in the current codebase.
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 3, color: "text.secondary" }}>
        {items.map((item) => (
          <Typography component="li" variant="body2" key={item}>
            {item}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string|null} props.contributorName Selected contributor's display name, used
 *   for the title and avatar alt text while `profile` is still loading.
 * @param {{image: string, github: string}|undefined} props.githubProfile From the
 *   directory fetch -- present only when this contributor has a linked GitHub account.
 * @param {Object|null} props.profile Full profile from useContributorProfile, or
 *   `null` while loading or on failure.
 * @param {boolean} props.loading
 * @param {Error|null} props.error
 */
export default function ContributorDialog({
  open,
  onClose,
  contributorName,
  githubProfile,
  profile,
  loading,
  error,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {githubProfile && (
          <Avatar
            src={githubProfile.image}
            alt={contributorName}
            sx={{ width: 48, height: 48, border: "2px solid", borderColor: "primary.main" }}
          />
        )}
        <Box component="span" sx={{ flex: 1 }}>
          {contributorName}
        </Box>
        <IconButton id="contributor-dialog-close" aria-label="Close" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: "divider", ...thinScrollbarSx }}>
        {loading ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Loading...
          </Typography>
        ) : error ? (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Couldn&apos;t load this contributor&apos;s profile right now.
          </Typography>
        ) : profile ? (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              Personal Information
            </Typography>
            <ProfileField label="Email" value={profile.email} />
            <ProfileField label="Education" value={profile.education} />
            <ProfileField label="Major" value={profile.major} />
            {profile.bio && profile.bio !== "Not specified" && (
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                {profile.bio}
              </Typography>
            )}

            {githubProfile && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                <Box component="span" sx={{ fontWeight: 700 }}>
                  GitHub:
                </Box>{" "}
                <Link
                  id="contributor-dialog-github-link"
                  href={githubProfile.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ color: "primary.light", fontWeight: 600 }}
                >
                  {githubProfile.github.replace("https://", "")}
                </Link>
              </Typography>
            )}

            <GithubActivitySection
              reduxStats={profile.reduxStats}
              reduxGuiStats={profile.reduxGuiStats}
            />

            <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
              Contributions
            </Typography>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              <Box component="span" sx={{ fontWeight: 700 }}>
                Total:
              </Box>{" "}
              {profile.totalContributions ?? 0}
            </Typography>

            <ContributionList label="Problems" items={profile.problemsContributed} />
            <ContributionList label="Solvers" items={profile.solversCreated} />
            <ContributionList label="Reductions" items={profile.reductionsCreated} />
            <ContributionList label="Verifiers" items={profile.verifiersContributed} />
            <ContributionList label="Visualizations" items={profile.visualizationsCreated} />

            <LegacyContributionsList items={profile.legacyContributions} />
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No profile data found.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
