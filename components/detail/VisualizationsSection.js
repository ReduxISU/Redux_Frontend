// components/detail/VisualizationsSection.js
//
// T16b (#22) — the Visualizations detail-page section: a left rail of the
// problem's declared visualizations (name + type badge), and a right pane
// with a static canvas, its caption, and step-scrubber chrome.
//
// v1 scope (ground rule 5): only the rail selection is live. The canvas
// itself is a static rendering, and the step-scrubber controls (prev/play/
// next, progress bar, step counter) plus the "Drag nodes to reposition" /
// "Right-click to add" hint text are rendered as visibly inert chrome —
// real MUI `disabled` buttons (which also removes them from tab order),
// not just dimmed-looking active ones. No live node editing, no
// right-click menu, no working scrubber.
//
// Only 3-SAT's fixture entries carry `stepLabel`/`stepNarration` — every
// other problem's visualizations only have `{ name, type, caption }`, so
// both are rendered conditionally rather than assumed present.

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { TAXONOMY, UNCLASSIFIED } from "../../data/taxonomy";
import { getFacetAccentColor } from "../theme";
import SectionShell from "./SectionShell";

const VISUALIZATION_TYPE_FACET = TAXONOMY.find((facet) => facet.key === "visualizationType");

// Falls back to the raw key (or the UNCLASSIFIED sentinel itself, e.g.
// 3-SAT's "Assignment Table" -- a real, documented taxonomy gap, see
// data/fixtures.js's file header) rather than crashing on an unmapped type.
function visualizationTypeLabel(typeKey) {
  if (!typeKey || typeKey === UNCLASSIFIED) {
    return UNCLASSIFIED;
  }
  const option = VISUALIZATION_TYPE_FACET.options.find((candidate) => candidate.key === typeKey);
  return option?.label ?? typeKey;
}

function TypeBadge({ typeKey }) {
  const accentColor = getFacetAccentColor(VISUALIZATION_TYPE_FACET.accentColor);
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        px: 1,
        py: 0.25,
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        color: accentColor,
        backgroundColor: alpha(accentColor, 0.12),
        border: `1px solid ${alpha(accentColor, 0.55)}`,
      }}
    >
      {visualizationTypeLabel(typeKey)}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.problem A data/fixtures.js-shaped FixtureProblem.
 * @param {{attributes: Object, listeners: Object}} [props.dragHandleProps]
 *   Forwarded straight through to SectionShell — see T18 (#27).
 */
export default function VisualizationsSection({ problem, dragHandleProps }) {
  const visualizations = problem.visualizations ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = visualizations[selectedIndex];
  const noun = visualizations.length === 1 ? "visualization" : "visualizations";

  return (
    <SectionShell
      sectionKey="visualizations"
      title="Visualizations"
      summary={`${visualizations.length} ${noun}`}
      dragHandleProps={dragHandleProps}
    >
      {visualizations.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No visualizations declared for this problem.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", gap: 2 }}>
          <Box
            component="ul"
            sx={{
              listStyle: "none",
              m: 0,
              p: 0,
              width: 220,
              flexShrink: 0,
              maxHeight: 360,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            {visualizations.map((visualization, index) => {
              const isSelected = index === selectedIndex;
              const entryId = `visualizations-rail-entry-${index}`;
              return (
                <Box component="li" key={entryId}>
                  <Box
                    id={entryId}
                    component="button"
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedIndex(index)}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 0.5,
                      width: "100%",
                      p: 1,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: isSelected ? "primary.main" : "divider",
                      backgroundColor: (t) =>
                        isSelected ? alpha(t.palette.primary.main, 0.1) : "transparent",
                      color: "inherit",
                      font: "inherit",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {visualization.name}
                    </Typography>
                    <TypeBadge typeKey={visualization.type} />
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <IconButton id="visualizations-scrubber-previous" size="small" disabled>
                <SkipPreviousIcon fontSize="small" />
              </IconButton>
              <IconButton id="visualizations-scrubber-play" size="small" disabled>
                <PlayArrowIcon fontSize="small" />
              </IconButton>
              <IconButton id="visualizations-scrubber-next" size="small" disabled>
                <SkipNextIcon fontSize="small" />
              </IconButton>
              <Box
                aria-hidden="true"
                sx={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: "divider", mx: 1 }}
              />
              {selected.stepLabel && (
                <Typography variant="body2" sx={{ color: "text.secondary", flexShrink: 0 }}>
                  {selected.stepLabel}
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                flex: 1,
                minHeight: 220,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                color: "text.secondary",
              }}
            >
              <Typography variant="body2">{selected.name}</Typography>
            </Box>

            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {selected.caption}
            </Typography>

            {selected.stepNarration && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {selected.stepNarration}
              </Typography>
            )}

            <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
              Drag nodes to reposition &middot; Right-click to add
            </Typography>
          </Box>
        </Box>
      )}
    </SectionShell>
  );
}
