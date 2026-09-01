// components/detail/SectionShell.js
//
// T15 (#20) — the shared frame around all five Problem Detail sections
// (Overview, Visualizations, Solvers, Verifier, Reductions). Built before
// the sections themselves so all five can be worked on in parallel once it
// exists (TASKLIST.md's T15 entry).
//
// Rounded panel, hairline border, slightly lifted surface — the same
// Paper treatment as components/ProblemCatalogCard.js's cards. Header row:
// a six-dot drag grip, a chevron toggle, the section title, and an
// optional right-aligned summary (`3 visualizations`, `4 solvers`, …).
// Overview and Verifier pass no summary — the header row still has to look
// right without one (issue done-when), which is why the title element
// grows to fill the row rather than the summary being pinned with a fixed
// offset.
//
// The drag grip is a separate DOM element from the chevron button and
// carries no click handler of its own (issue body: "the single most common
// bug in this kind of component" is a grip that also toggles collapse).
// Wired up as a real @dnd-kit drag activator by T18 (#27,
// components/ProblemDetailLayout.js): that component passes an optional
// `dragHandleProps` (`{ attributes, listeners }`, straight from
// `useSortable()`), spread onto this same grip Box rather than adding a
// second grip element. With no `dragHandleProps` (e.g. any standalone
// rendering of a section outside the drag context) the grip stays the
// static, `aria-hidden` affordance it always was.
//
// Accessibility: unlike FacetSidebar's facet groups (a sidebar nav list,
// nothing on that page needs them in the heading outline), a Problem Detail
// page's five sections ARE meant to be real headings — theme.js's own
// typography-scale comment declares "section title -> h2 ('Overview',
// 'Solvers')". So the title is a genuine, non-hidden <h2> per the WAI-ARIA
// accordion pattern (heading wraps the toggle button; the button's visible
// text is its accessible name), not aria-hidden text folded into a manual
// aria-label the way FacetFilterGroup's group label is. That keeps
// "Overview", "Solvers", etc. discoverable via screen-reader heading
// navigation, which a hidden label would have silently dropped.
//
// The body stays mounted and is hidden via `display: none` rather than
// unmounted while collapsed (same choice as FacetSidebar's option list) —
// a section's own internal state (e.g. Solvers' pasted instance, T16c)
// shouldn't reset just because its panel was collapsed.

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { useState } from "react";

/**
 * @param {Object} props
 * @param {string} props.sectionKey Derives every id on this instance
 *   (`section-${sectionKey}-toggle`, `section-${sectionKey}-body`) so five
 *   sections on one Detail page never collide (issue done-when).
 * @param {string} props.title Section heading text ("Overview", "Solvers",
 *   …) — not looked up here; each section component owns its own title.
 * @param {string} [props.summary] Optional right-aligned count summary
 *   ("3 visualizations"). Omitted entirely for Overview and Verifier.
 * @param {React.ReactNode} props.children The section body, shown when
 *   expanded.
 * @param {{attributes: Object, listeners: Object}} [props.dragHandleProps]
 *   From T18's `useSortable()`, spread onto the grip so it becomes the real
 *   drag activator. Omitted, the grip stays decorative (`aria-hidden`).
 */
export default function SectionShell({ sectionKey, title, summary, children, dragHandleProps }) {
  const [expanded, setExpanded] = useState(true);
  const toggleId = `section-${sectionKey}-toggle`;
  const bodyId = `section-${sectionKey}-body`;
  const gripId = `section-${sectionKey}-grip`;

  return (
    <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.75 }}>
        <Box
          id={gripId}
          {...(dragHandleProps
            ? {
                ...dragHandleProps.attributes,
                ...dragHandleProps.listeners,
                "aria-label": `Drag to reorder the ${title} section`,
              }
            : { "aria-hidden": "true" })}
          sx={{
            display: "flex",
            alignItems: "center",
            color: "text.secondary",
            cursor: "grab",
            flexShrink: 0,
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>

        <Typography component="h2" variant="h2" sx={{ m: 0, flex: 1, minWidth: 0 }}>
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
              p: 0,
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

        {summary && (
          <Typography variant="body2" sx={{ color: "text.secondary", flexShrink: 0 }}>
            {summary}
          </Typography>
        )}
      </Box>

      <Box
        id={bodyId}
        sx={{
          display: expanded ? "block" : "none",
          px: 2,
          pb: 2,
        }}
      >
        {children}
      </Box>
    </Paper>
  );
}
