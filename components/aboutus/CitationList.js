// components/aboutus/CitationList.js
//
// Renders a list of citations, each with whatever combination of a DOI/URL/PDF link
// it has. Shared by About Us's Publications, Awards and Theses & Dissertations
// sections, which are otherwise three near-identical blocks in Redux_GUI's version of
// this page.

import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";

const LINK_KINDS = [
  { key: "doi", label: "DOI" },
  { key: "url", label: "URL" },
  { key: "pdf", label: "PDF" },
];

/**
 * @param {Object} props
 * @param {string} props.idPrefix Makes every citation's links unique across the page.
 * @param {Array<{citation: string, doi?: string, url?: string, pdf?: string}>} props.citations
 */
export default function CitationList({ idPrefix, citations }) {
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      {citations.map((item, index) => (
        <Box
          key={item.citation}
          sx={{
            px: 2,
            py: 1.25,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
            {item.citation}{" "}
            {LINK_KINDS.map(
              ({ key, label }) =>
                item[key] && (
                  <Link
                    key={key}
                    id={`${idPrefix}-${index}-${key}`}
                    href={item[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    sx={{ color: "primary.light", fontWeight: 600, ml: 0.5 }}
                  >
                    [{label}]
                  </Link>
                ),
            )}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
