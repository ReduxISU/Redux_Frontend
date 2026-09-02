// components/ErrorBanner.js
//
// T29 (#38) — the visible, non-dismissible banner #5 settled on for an
// unreachable backend (ARCHITECTURE.md's "Decided 2026-08-31 (#5)" note).
// Home (T25/#34) already had this inline; pulled out here so
// pages/[problem].js can show the identical banner rather than folding a
// backend error into its "not found" state, which is what it did before
// this task (see that file's own header comment).
//
// One shared `id` rather than a per-page one: only one banner is ever
// mounted on a page at a time, and a future Playwright spec (T30/#39) can
// target "the error banner" the same way regardless of which page it's on.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export const BACKEND_UNREACHABLE_MESSAGE =
  "Couldn't reach the Redux backend. The catalog can't load right now.";

export default function ErrorBanner({ message = BACKEND_UNREACHABLE_MESSAGE }) {
  return (
    <Box
      id="backend-error-banner"
      role="alert"
      sx={{ px: 2, py: 1.5, borderRadius: 2, bgcolor: "error.dark" }}
    >
      <Typography variant="body2" sx={{ color: "error.contrastText" }}>
        {message}
      </Typography>
    </Box>
  );
}
