// pages/playlists/[slug].js
//
// #151 -- the playlist's own page: looks up the slug in data/playlists.js and shows
// its title, description, and ordered problem list, each linking to that problem's
// detail page with `?playlist=<slug>` appended so pages/[problem].js's own
// components/PlaylistRail.js (rendered below its Breadcrumb) can carry the visitor
// through the rest of the playlist in order.
//
// Purely local data -- no backend fetch -- so unlike pages/[problem].js there's no
// loading/BackendUnreachable state to distinguish, just "known slug" or "not found."
// The not-found copy below matches that file's own tone (a plain explanation plus a
// link back to Home) without reusing its component, since that one is keyed to "no
// such problem," not "no such playlist."
//
// No getStaticProps/getStaticPaths: the playlist list is small, hand-authored data
// already baked into the bundle, and useRouter().query.slug resolves once the
// router is ready, same reasoning pages/[problem].js's own header records.
//
// Each step's link also carries its optional `solver`/`visualization` selection
// (buildPlaylistStepQuerySuffix, lib/playlistQuery.js), same as pages/[problem].js's
// own Previous/Next rail does -- both are just "get to this step's problem page,"
// so both need to pass the same params along.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/router";
import NavBar from "../../components/NavBar";
import { PLAYLISTS } from "../../data/playlists";
import { buildPlaylistStepQuerySuffix } from "../../lib/playlistQuery";

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
          There&rsquo;s no playlist at this address. Check the link an instructor shared, or browse
          the catalog directly.
        </Typography>
        <Box
          id="playlist-not-found-home-link"
          component={Link}
          href="/"
          sx={{ color: "primary.main", fontWeight: 600, mt: 1 }}
        >
          Back to Home
        </Box>
      </Box>
    </PageShell>
  );
}

export default function PlaylistDetail() {
  const router = useRouter();
  const { slug: routeSlug } = router.query;

  // Same reasoning as pages/[problem].js: `query` is empty on every route before
  // the router hydrates, so render just the chrome rather than guessing "not found"
  // for a slug that's actually valid.
  if (!router.isReady) {
    return <PageShell />;
  }

  const playlist = PLAYLISTS.find((candidate) => candidate.slug === routeSlug);

  if (!playlist) {
    return <NotFound />;
  }

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
            id="playlist-detail-home-link"
            component={Link}
            href="/"
            sx={{ color: "text.secondary", fontSize: "0.9375rem" }}
          >
            Home
          </Box>
          <Typography variant="h1" component="h1" sx={{ mt: 1 }}>
            {playlist.title}
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mt: 0.5 }}>
            {playlist.description}
          </Typography>
        </Box>

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
              key={entry.name}
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
                  id={`playlist-problem-link-${index}`}
                  component={Link}
                  href={`/${encodeURIComponent(entry.name)}?playlist=${encodeURIComponent(playlist.slug)}${buildPlaylistStepQuerySuffix(entry)}`}
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
    </PageShell>
  );
}
