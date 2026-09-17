// pages/playlists/index.js
//
// #151 -- small nice-to-have: lists every hand-authored playlist (data/playlists.js)
// as a title + description, each linking to its own page (pages/playlists/[slug].js).
// A shared playlist link goes straight to a slug and never needs this page, but
// without it there's no way to discover a playlist from inside the app at all.
//
// #165 -- also hosts the self-service "Create a playlist" flow
// (components/PlaylistCreator.js) below the hand-authored list, and, below
// that, this browser's own "My playlists" -- a per-browser localStorage
// shortcut list (lib/playlistQuery.js) to playlists this browser has created,
// since a self-service playlist has no other registry anywhere (its whole
// state lives in the link). Submitting the form encodes the playlist
// (buildCustomPlaylistQueryValue), records it locally (addMyPlaylist), and
// navigates straight to pages/playlists/custom.js, which is where the
// visitor actually sees and can copy their new shareable link.
//
// `myPlaylists` reads through useSyncExternalStore rather than a mount
// effect + setState -- see lib/playlistQuery.js's own header for why: this
// page has no getServerSideProps/getStaticProps, so it's prerendered once at
// build time with no window/localStorage available, and useSyncExternalStore
// is what lets the client's real stored list take over after hydration
// without a mismatch between the two.

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSyncExternalStore } from "react";
import NavBar from "../../components/NavBar";
import PlaylistCreator from "../../components/PlaylistCreator";
import { PLAYLISTS } from "../../data/playlists";
import { useCatalogIndex } from "../../hooks/useCatalogIndex";
import {
  addMyPlaylist,
  buildCustomPlaylistQueryValue,
  getMyPlaylistsServerSnapshot,
  getMyPlaylistsSnapshot,
  removeMyPlaylist,
  subscribeMyPlaylists,
} from "../../lib/playlistQuery";
import { REDUX_API_BASE_URL } from "../../lib/redux";

export default function PlaylistIndex() {
  const router = useRouter();
  const { index, loading } = useCatalogIndex(REDUX_API_BASE_URL);
  const myPlaylists = useSyncExternalStore(
    subscribeMyPlaylists,
    getMyPlaylistsSnapshot,
    getMyPlaylistsServerSnapshot,
  );

  const problemNames = Array.from(index.keys()).sort((a, b) => a.localeCompare(b));

  const handleCreate = (playlist) => {
    const query = buildCustomPlaylistQueryValue(playlist);
    addMyPlaylist({ title: playlist.title, query });
    router.push(`/playlists/custom?p=${query}`);
  };

  const handleRemove = (query) => {
    removeMyPlaylist(query);
  };

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

        <PlaylistCreator problemNames={problemNames} loading={loading} onCreate={handleCreate} />

        {myPlaylists.length > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="h2" component="h2" sx={{ fontSize: "1.125rem" }}>
              My playlists
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Playlists you&rsquo;ve created on this browser. This list is local to this browser
              only -- it isn&rsquo;t how anyone else opens your link, and removing an entry here
              only forgets the shortcut, not the playlist itself.
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {myPlaylists.map((entry, index) => (
                <Box
                  key={entry.query}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Box
                    id={`my-playlist-link-${index}`}
                    component={Link}
                    href={`/playlists/custom?p=${entry.query}`}
                    sx={{ flex: 1, minWidth: 0, color: "primary.main", fontWeight: 600 }}
                  >
                    {entry.title}
                  </Box>
                  <IconButton
                    id={`my-playlist-remove-${index}`}
                    aria-label={`Remove ${entry.title} from My playlists`}
                    size="small"
                    onClick={() => handleRemove(entry.query)}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
