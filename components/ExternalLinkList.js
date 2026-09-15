// components/ExternalLinkList.js
//
// A vertical stack of bordered rows, each an external link. Shared by Help's "Access
// Redux Content"/"Learn More" sections and Contribute's "Helpful Links" section --
// three lists across two pages, all wanting the same look, so this exists rather than
// three near-identical `.map()` blocks.

import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";

/**
 * @param {Object} props
 * @param {string} props.idPrefix Makes every row's `id` unique across the page
 *   (`${idPrefix}-link-${index}`), per ground rule 4 (every interactive element gets a
 *   unique id).
 * @param {Array<{label: string, url: string}>} props.links
 * @param {React.ReactNode} [props.trailingItem] An extra, non-link row appended after
 *   the links (Help's "C# Library import (instructions coming soon)" placeholder).
 */
export default function ExternalLinkList({ idPrefix, links, trailingItem }) {
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      {links.map((link, index) => (
        <Box
          key={link.url}
          sx={{
            px: 2,
            py: 1.25,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Link
            id={`${idPrefix}-link-${index}`}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{ color: "primary.light", fontWeight: 600, fontSize: "0.875rem" }}
          >
            {link.label}
          </Link>
        </Box>
      ))}
      {trailingItem && (
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {trailingItem}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
