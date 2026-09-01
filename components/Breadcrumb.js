// components/Breadcrumb.js
//
// T08 (#12) — the "Home / {Problem}" line that sits above the problem
// title on a detail page. "Home" links back to the catalog; the problem
// name is plain text, not a link, because it's the page already showing.
//
// Detail-page-only placement is a consuming-page concern (T19's
// pages/[problem].js), not something this component enforces itself.

import Box from "@mui/material/Box";
import Link from "next/link";

export default function Breadcrumb({ problemName }) {
  return (
    <Box
      component="nav"
      aria-label="Breadcrumb"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        fontSize: "0.9375rem",
        color: "text.secondary",
        mb: 1,
      }}
    >
      <Box id="breadcrumb-home-link" component={Link} href="/" sx={{ color: "inherit" }}>
        Home
      </Box>
      <Box component="span" aria-hidden="true">
        /
      </Box>
      <Box component="span" sx={{ color: "text.primary" }}>
        {problemName}
      </Box>
    </Box>
  );
}
