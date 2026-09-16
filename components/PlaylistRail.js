// components/PlaylistRail.js
//
// #151 -- the "playlist rail" shown on pages/[problem].js when a visitor reaches a
// problem via a `?playlist=<slug>` link: the playlist's title, a back-to-playlist
// link, and Previous/Next through just that playlist's ordered problems, carrying
// the same `?playlist=<slug>` param forward so the rail persists as the visitor
// steps through it. Previous/Next are disabled (not wrapped around) at the ends of
// the list, per the issue's explicit requirement.
//
// A separate piece of UI from ProblemDetailLayout.js's own drag-order/collapse
// section state -- that component's header comment is explicit that state is
// scoped to its five sections and has no persistence; this rail lives outside it
// entirely and reads nothing from it.
//
// pages/[problem].js only renders this once the current problem is confirmed to
// actually be in the named playlist (a real match in `playlist.problems`, not just
// a slug that resolves) -- a stale/hand-edited link that names a real playlist but
// the wrong problem degrades to no rail at all, per the issue's explicit "degrade
// gracefully" requirement, rather than this component guessing at a fallback.

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Link from "next/link";

function playlistProblemHref(playlistSlug, problemName) {
  return `/${encodeURIComponent(problemName)}?playlist=${encodeURIComponent(playlistSlug)}`;
}

/**
 * @param {Object} props
 * @param {Object} props.playlist A data/playlists.js playlist object -- `slug`,
 *   `title`, `description`, `problems[]` (`{ name, note? }`).
 * @param {number} props.currentIndex Index of the current problem within
 *   `playlist.problems`. The caller (pages/[problem].js) is responsible for
 *   confirming this is a real match (>= 0) before rendering this component at all.
 */
export default function PlaylistRail({ playlist, currentIndex }) {
  const currentEntry = playlist.problems[currentIndex];
  const previousEntry = currentIndex > 0 ? playlist.problems[currentIndex - 1] : null;
  const nextEntry =
    currentIndex < playlist.problems.length - 1 ? playlist.problems[currentIndex + 1] : null;

  return (
    <Paper
      variant="outlined"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        px: 2,
        py: 1.5,
        mb: 2,
        borderRadius: 2,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="overline" sx={{ color: "text.secondary" }}>
          Playlist &middot; step {currentIndex + 1} of {playlist.problems.length}
        </Typography>
        <Box
          id="playlist-rail-back-link"
          component={Link}
          href={`/playlists/${playlist.slug}`}
          sx={{ display: "block", color: "text.primary", fontWeight: 700 }}
        >
          {playlist.title}
        </Box>
        {currentEntry?.note && (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
            {currentEntry.note}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
        <Button
          id="playlist-rail-previous-link"
          size="small"
          startIcon={<ArrowBackIcon fontSize="small" />}
          aria-label={previousEntry ? `Previous: ${previousEntry.name}` : "Previous"}
          {...(previousEntry
            ? { component: Link, href: playlistProblemHref(playlist.slug, previousEntry.name) }
            : { disabled: true })}
        >
          Previous
        </Button>
        <Button
          id="playlist-rail-next-link"
          size="small"
          endIcon={<ArrowForwardIcon fontSize="small" />}
          aria-label={nextEntry ? `Next: ${nextEntry.name}` : "Next"}
          {...(nextEntry
            ? { component: Link, href: playlistProblemHref(playlist.slug, nextEntry.name) }
            : { disabled: true })}
        >
          Next
        </Button>
      </Box>
    </Paper>
  );
}
