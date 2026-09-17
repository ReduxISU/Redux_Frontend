// pages/playlists/custom.js
//
// #165 -- the self-service playlist's own page: the counterpart to
// pages/playlists/[slug].js for a playlist that was built on pages/playlists/
// index.js's "Create a playlist" form rather than hand-authored in
// data/playlists.js. "custom" is a reserved slug (see data/playlists.js's own
// note); the whole playlist lives in the `p` query param instead of a lookup,
// decoded by lib/playlistQuery.js's parseCustomPlaylist -- the same encoding
// components/PlaylistCreator.js produces on submit.
//
// Purely local -- no backend fetch, no getStaticProps/getStaticPaths. Same
// reasoning as [slug].js's own header: useRouter().query resolves once the
// router is ready, and there's nothing here that could be prerendered anyway
// since the playlist itself only exists in the URL a visitor arrives with.
//
// Shows the page's own URL as the shareable link (with a copy button) rather
// than assuming the visitor arrived by pasting it in -- this page is also
// where the create form lands right after submission, and that visitor has
// not seen the link yet.
//
// Each step's link also carries its optional `solver`/`visualization` selection
// (buildPlaylistStepQuerySuffix), same as pages/playlists/[slug].js's own step
// links and pages/[problem].js's Previous/Next rail.

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import NavBar from "../../components/NavBar";
import { buildPlaylistStepQuerySuffix, parseCustomPlaylist } from "../../lib/playlistQuery";

function PageShell({ children }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NavBar />
      {children}
    </Box>
  );
}

function NotFound() {
  return (
    <PageShell>
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          px: 3,
          textAlign: "center",
        }}
      >
        <Typography variant="h1" component="h1">
          Playlist not found
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 480 }}>
          This link doesn&rsquo;t carry a playlist Redux can read. It may be incomplete, or
          corrupted in transit.
        </Typography>
        <Box
          id="custom-playlist-not-found-home-link"
          component={Link}
          href="/playlists"
          sx={{ color: "primary.main", fontWeight: 600, mt: 1 }}
        >
          Back to Playlists
        </Box>
      </Box>
    </PageShell>
  );
}

export default function CustomPlaylistDetail() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const rawPayload = typeof router.query.p === "string" ? router.query.p : undefined;

  // Same reasoning as [slug].js: `query` is empty on every route before the
  // router hydrates, so render just the chrome rather than guessing
  // "not found" for a payload that's actually valid.
  if (!router.isReady) {
    return <PageShell />;
  }

  const playlist = parseCustomPlaylist(rawPayload);

  if (!playlist) {
    return <NotFound />;
  }

  // Built from window.location rather than a fixed origin: this page has no
  // knowledge of what host it's served from (dev, a preview deploy,
  // production), and by this point router.isReady is already true, so this
  // is running on the client, past the point a mismatched SSR render could
  // occur.
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/playlists/custom?p=${encodeURIComponent(rawPayload)}`
      : "";

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      // Clipboard access can be denied or unavailable (permissions, insecure
      // context) -- the link is still shown as selectable text below, so
      // there's a fallback either way.
    }
  };

  return (
    <PageShell>
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          px: { xs: 3, sm: 5 },
          py: 4,
          maxWidth: 820,
          width: "100%",
          mx: "auto",
        }}
      >
        <Box>
          <Box
            id="custom-playlist-home-link"
            component={Link}
            href="/playlists"
            sx={{ color: "text.secondary", fontSize: "0.9375rem" }}
          >
            Playlists
          </Box>
          <Typography variant="h1" component="h1" sx={{ mt: 1 }}>
            {playlist.title}
          </Typography>
          {playlist.description && (
            <Typography variant="body1" sx={{ color: "text.secondary", mt: 0.5 }}>
              {playlist.description}
            </Typography>
          )}
        </Box>

        <Paper
          variant="outlined"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1.25,
            borderRadius: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              flex: 1,
              minWidth: 0,
              color: "text.secondary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {shareUrl}
          </Typography>
          <IconButton
            id="custom-playlist-copy-link"
            aria-label="Copy playlist link"
            size="small"
            onClick={copyShareLink}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Paper>

        <Box
          component="ol"
          sx={{
            m: 0,
            p: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          {playlist.problems.map((entry, index) => (
            <Box
              component="li"
              key={`${entry.name}-${index}`}
              sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}
            >
              <Typography
                variant="body1"
                sx={{ color: "text.secondary", fontWeight: 600, minWidth: "1.5rem" }}
              >
                {index + 1}.
              </Typography>
              <Box>
                <Box
                  id={`custom-playlist-problem-link-${index}`}
                  component={Link}
                  href={`/${encodeURIComponent(entry.name)}?playlist=custom&p=${encodeURIComponent(rawPayload)}${buildPlaylistStepQuerySuffix(entry)}`}
                  sx={{ color: "primary.main", fontWeight: 600 }}
                >
                  {entry.name}
                </Box>
                {entry.note && (
                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
                    {entry.note}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Snackbar
        open={copied}
        autoHideDuration={2500}
        onClose={() => setCopied(false)}
        message="Playlist link copied"
      />
    </PageShell>
  );
}
