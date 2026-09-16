// pages/playlists/index.js
//
// #151 -- small nice-to-have: lists every hand-authored playlist (data/playlists.js)
// as a title + description, each linking to its own page (pages/playlists/[slug].js).
// A shared playlist link goes straight to a slug and never needs this page, but
// without it there's no way to discover a playlist from inside the app at all.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import NavBar from "../../components/NavBar";
import { PLAYLISTS } from "../../data/playlists";

export default function PlaylistIndex() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NavBar />
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
        <Typography variant="h1" component="h1">
          Playlists
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          Curated, ordered paths through a subset of the catalog, put together by an instructor.
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {PLAYLISTS.map((playlist) => (
            <Box
              key={playlist.slug}
              sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}
            >
              <Box
                id={`playlist-index-link-${playlist.slug}`}
                component={Link}
                href={`/playlists/${playlist.slug}`}
                sx={{ color: "primary.main", fontWeight: 700 }}
              >
                {playlist.title}
              </Box>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                {playlist.description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
