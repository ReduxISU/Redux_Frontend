// components/detail/VisualizationsSection.js
//
// T16b (#22) — the Visualizations detail-page section: a left rail of the
// problem's declared visualizations (name + type badge), and a right pane
// with a static canvas, its caption, and step-scrubber chrome.
//
// v1 scope (ground rule 5, as narrowed by INTERACTIVE_LAYER_DESIGN.md's
// staging plan): only the rail selection and the step-scrubber are live.
// The canvas itself is still a static rendering (real diagram rendering is
// T48-T50) and the "Drag nodes to reposition" / "Right-click to add" hint
// text stays inert chrome — no live node editing, no right-click menu. The
// scrubber row is real, though (T47/#110): play/pause/step/speed/scrub bar
// all work, via the shared StepScrubber component. `selected.frames` isn't
// populated by hooks/useProblemDetail.js yet (that's T48-T50's job), so the
// scrubber currently degrades to a real, correctly-labelled single frame
// ("Step 1 of 1") rather than faking a frame count that doesn't exist yet.
//
// Only 3-SAT's fixture entries ever carried `stepLabel`/`stepNarration` —
// every other problem's visualizations only have `{ name, type, caption }`,
// so both are rendered conditionally rather than assumed present. Neither
// field is populated by the real hook today (see hooks/useProblemDetail.js's
// buildVisualizations) — kept here so this stays a no-op regression, not a
// removal, if a future task adds narration data back.
//
// T28 (#37): the rail-plus-pane split stacks below `md` (900px) -- same
// breakpoint components/detail/OverviewSection.js already uses for its own
// two-card split, and the width pages/index.js switches the Home sidebar
// into a drawer at, kept consistent rather than picking a third number. The
// rail's fixed width only applies at `md` and up; stacked, it's full width.

import Box from "@mui/material/Box";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { TAXONOMY, UNCLASSIFIED } from "../../data/taxonomy";
import { getFacetAccentColor, thinScrollbarSx } from "../theme";
import SectionShell from "./SectionShell";
import StepScrubber from "./StepScrubber";

const VISUALIZATION_TYPE_FACET = TAXONOMY.find((facet) => facet.key === "visualizationType");

// #71: fixed rail height so a problem with many declared visualizations
// scrolls inside the rail instead of stretching the section indefinitely.
const RAIL_MAX_HEIGHT = 320;

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
  const [currentStep, setCurrentStep] = useState(0);
  const selected = visualizations[selectedIndex];
  const noun = visualizations.length === 1 ? "visualization" : "visualizations";

  // Selecting a different visualization starts its playback over rather
  // than carrying over a step index that may be out of range for it. Done
  // as a render-time state adjustment (React's documented pattern for this,
  // not a useEffect) so it doesn't cost an extra committed render.
  const [stepResetKey, setStepResetKey] = useState(selectedIndex);
  if (stepResetKey !== selectedIndex) {
    setStepResetKey(selectedIndex);
    setCurrentStep(0);
  }

  const frameCount = selected?.frames?.length ?? 1;

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
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2 }}>
          <Box
            component="ul"
            role="listbox"
            aria-label="Visualizations"
            sx={{
              listStyle: "none",
              m: 0,
              p: 0,
              width: { xs: "100%", md: 220 },
              flexShrink: 0,
              maxHeight: RAIL_MAX_HEIGHT,
              overflowY: "auto",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              ...thinScrollbarSx,
            }}
          >
            {visualizations.map((visualization, index) => {
              const isSelected = index === selectedIndex;
              const entryId = `visualizations-rail-entry-${index}`;
              return (
                <Box component="li" key={entryId} sx={{ listStyle: "none" }}>
                  <Box
                    id={entryId}
                    component="button"
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setSelectedIndex(index)}
                    sx={(theme) => ({
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 0.5,
                      width: "100%",
                      p: 1,
                      border: "none",
                      borderLeft: "3px solid",
                      borderLeftColor: isSelected ? "primary.main" : "transparent",
                      backgroundColor: isSelected
                        ? alpha(theme.palette.primary.main, 0.1)
                        : "transparent",
                      "&:hover": {
                        backgroundColor: isSelected
                          ? alpha(theme.palette.primary.main, 0.1)
                          : alpha(theme.palette.common.white, 0.04),
                      },
                      color: "inherit",
                      font: "inherit",
                      textAlign: "left",
                      cursor: "pointer",
                    })}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: isSelected ? "text.primary" : "text.secondary",
                      }}
                    >
                      {visualization.name}
                    </Typography>
                    <TypeBadge typeKey={visualization.type} />
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
            <StepScrubber
              idPrefix="visualizations-scrubber"
              frameCount={frameCount}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
            />

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
