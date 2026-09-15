// components/aboutus/ContributorList.js
//
// The "Project contributors" grid: fetches the directory, renders one card per
// contributor sorted by last name, and opens ContributorDialog with their full
// profile on click. Ported from Redux_GUI's pages/aboutus/index.js (ItemContributor,
// the contributors grid, and the profile-fetch handlers), split into its own
// component here since it owns real fetch/loading/error state rather than being page
// layout.
//
// Each contributor's GitHub avatar is a separate click target from their name (an
// `<a>` nested inside a clickable element is invalid HTML, and screen readers announce
// the two purposes -- "view their GitHub profile" vs. "open their contribution
// details" -- differently), same split Redux_GUI's version already made.

import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { useContributorDirectory } from "../../hooks/useContributorDirectory";
import { useContributorProfile } from "../../hooks/useContributorProfile";
import { REDUX_API_BASE_URL } from "../../lib/redux";
import ContributorDialog from "./ContributorDialog";

function getLastName(name) {
  return name.split(" ").at(-1).toLowerCase();
}

function idSafe(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export default function ContributorList() {
  const { directory, loading, error } = useContributorDirectory(REDUX_API_BASE_URL);
  const [selectedContributor, setSelectedContributor] = useState(null);
  const {
    profile,
    loading: profileLoading,
    error: profileError,
  } = useContributorProfile(REDUX_API_BASE_URL, selectedContributor);

  // `{name -> {image, github}}`, built once per directory fetch rather than per card
  // render. Only present for a contributor who has added a GitHub username.
  const githubProfiles = useMemo(() => {
    const profiles = {};
    for (const entry of directory) {
      if (entry.githubUsername) {
        profiles[entry.name] = {
          image: `https://github.com/${entry.githubUsername}.png`,
          github: `https://github.com/${entry.githubUsername}`,
        };
      }
    }
    return profiles;
  }, [directory]);

  const sortedNames = useMemo(
    () =>
      directory
        .map((entry) => entry.name)
        .sort((a, b) => getLastName(a).localeCompare(getLastName(b))),
    [directory],
  );

  if (loading) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Loading contributors...
      </Typography>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Contributor list unavailable right now.
      </Typography>
    );
  }

  if (sortedNames.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No contributors listed yet.
      </Typography>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
          gap: 1.5,
        }}
      >
        {sortedNames.map((name) => {
          const githubProfile = githubProfiles[name];
          const rowId = idSafe(name);
          return (
            <Box
              key={name}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.75,
                py: 1.25,
                minHeight: 46,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                "&:hover": { borderColor: "primary.light" },
              }}
            >
              {githubProfile ? (
                <Link
                  id={`contributor-${rowId}-github-link`}
                  href={githubProfile.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${name}'s GitHub profile`}
                  sx={{ display: "inline-flex", flexShrink: 0 }}
                >
                  <Avatar
                    src={githubProfile.image}
                    alt={`${name}'s GitHub avatar`}
                    sx={{ width: 28, height: 28 }}
                  />
                </Link>
              ) : (
                <HelpOutlineIcon
                  fontSize="small"
                  titleAccess={`${name} has no linked GitHub profile`}
                  sx={{ color: "text.secondary", flexShrink: 0 }}
                />
              )}
              <Box
                id={`contributor-${rowId}-open`}
                component="button"
                type="button"
                onClick={() => setSelectedContributor(name)}
                sx={{
                  border: "none",
                  background: "none",
                  p: 0,
                  font: "inherit",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "text.primary",
                  "&:hover": { color: "primary.light" },
                }}
              >
                {name}
              </Box>
            </Box>
          );
        })}
      </Box>

      <ContributorDialog
        open={selectedContributor !== null}
        onClose={() => setSelectedContributor(null)}
        contributorName={selectedContributor}
        githubProfile={selectedContributor ? githubProfiles[selectedContributor] : undefined}
        profile={profile}
        loading={profileLoading}
        error={profileError}
      />
    </>
  );
}
