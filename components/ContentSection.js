// components/ContentSection.js
//
// Shared frame for a static content section on About Us, Help and Contribute: a
// rounded panel with a hairline border (the same Paper treatment as
// components/detail/SectionShell.js and components/ProblemCatalogCard.js) and a real
// <h2> title, per theme.js's typography-scale comment ("section title -> h2").
//
// Collapsible is opt-in (`collapsible` + `sectionKey`), used by About Us so its long
// Contributors section can be closed, and scrolls within its own bounded height when
// open instead of stretching the page. Help and Contribute pass neither prop, so they
// keep the exact plain, always-open rendering this component always had. Mirrors
// SectionShell.js's accordion pattern (h2-wrapped toggle button, chevron,
// aria-expanded/aria-controls, body kept mounted and hidden via display:none rather
// than unmounted while collapsed, so a section's own state doesn't reset just because
// its panel closed) without the drag grip, which is a Problem Detail reordering
// feature this static page has no use for. thinScrollbarSx (theme.js) applied to the
// scrolling body -- the same treatment every other vertical-scroll region in this app
// already uses (pages/index.js's sidebar/drawer, ProblemGrid.js, the detail page's
// Solvers/Visualizations/Reductions rails); this was the one place that had been
// missed when it was first built.

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { thinScrollbarSx } from "./theme";

const SECTION_PADDING = { xs: 2.5, sm: 3 };

/**
 * @param {Object} props
 * @param {string} props.title Section heading text ("Welcome to Redux", "Learn more").
 * @param {React.ReactNode} props.children The section body.
 * @param {boolean} [props.collapsible] Opt into the collapsible, scrollable rendering.
 *   Omitted (or false), this renders exactly as it always has: a plain, always-open
 *   panel with no chevron and no height limit.
 * @param {string} [props.sectionKey] Required when `collapsible` is true. Derives
 *   `section-${sectionKey}-toggle`/`-body` so multiple sections on one page never
 *   collide (same convention as SectionShell.js).
 * @param {boolean} [props.defaultExpanded] Only meaningful when `collapsible` is true.
 *   Defaults to true so a first-time visitor still sees every section open, the same
 *   as before collapsibility existed, and only has to close the ones they don't want.
 */
export default function ContentSection({
  title,
  children,
  collapsible = false,
  sectionKey,
  defaultExpanded = true,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!collapsible) {
    return (
      <Paper sx={{ borderRadius: 3, p: SECTION_PADDING }}>
        <Typography component="h2" variant="h2" sx={{ mb: 2 }}>
          {title}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>{children}</Box>
      </Paper>
    );
  }

  const toggleId = `section-${sectionKey}-toggle`;
  const bodyId = `section-${sectionKey}-body`;

  return (
    <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Typography component="h2" variant="h2" sx={{ m: 0 }}>
        <Box
          id={toggleId}
          component="button"
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((prev) => !prev)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            width: "100%",
            border: "none",
            background: "none",
            p: SECTION_PADDING,
            cursor: "pointer",
            color: "inherit",
            font: "inherit",
            textAlign: "left",
          }}
        >
          <ChevronRightIcon
            aria-hidden="true"
            fontSize="small"
            sx={{
              color: "text.secondary",
              flexShrink: 0,
              transform: expanded ? "rotate(90deg)" : "none",
              transition: "transform 0.15s ease",
            }}
          />
          <Box component="span">{title}</Box>
        </Box>
      </Typography>

      <Box
        id={bodyId}
        sx={{
          display: expanded ? "block" : "none",
          maxHeight: 480,
          overflowY: "auto",
          px: SECTION_PADDING,
          pb: SECTION_PADDING,
          ...thinScrollbarSx,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>{children}</Box>
      </Box>
    </Paper>
  );
}
