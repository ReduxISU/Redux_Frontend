// components/detail/ReductionsSection.js
//
// T16e (#25) — the most complex-looking panel in the mockup, and deliberately
// the most scoped-down. Reduces-to/reduces-from lists and cost badges are
// real declared data (data/fixtures.js's `reductions` shape aligns well with
// the backend); the source/target instance diagrams are static placeholders
// only — no live step-scrubber, no draggable/editable nodes (v1 scope).
//
// Gap, deliberately not papered over: unlike VisualizationsSection's
// per-instance `stepLabel`/`stepNarration`, data/fixtures.js's `reductions`
// shape (`{ to: [{target, cost, type}], from: [{source, cost, type}] }`) has
// no step/narration field at all, for any problem. The mockup's "step 2/5"
// counter and "Step 2: clause C2 (...) becomes cover-edge (...)" narration
// were hand-drawn for 3-SAT specifically and were never added to the T09
// fixture contract. Rather than fabricate problem-specific narration text
// that has no backing data, the scrubber below renders as inert chrome with
// a plain, honest "not available yet" note instead of a real step count.
//
// The source/target canvas cards are likewise static placeholders (no real
// diagram-rendering exists yet) rather than an attempt to actually draw a
// graph — selecting a different "Reduces to" row still updates which target
// problem the placeholder card and cost badge describe, which is the real
// interactive behavior the issue's done-when asks for.

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { TAXONOMY } from "../../data/taxonomy";
import { getFacetAccentColor } from "../theme";
import SectionShell from "./SectionShell";

const REDUCTION_COST_FACET = TAXONOMY.find((facet) => facet.key === "reductionCost");
const REDUCTION_COST_LABELS = new Map(
  REDUCTION_COST_FACET.options.map((option) => [option.key, option.label]),
);
const REDUCTION_COST_ACCENT = getFacetAccentColor(REDUCTION_COST_FACET.accentColor);

function costLabel(costKey) {
  return REDUCTION_COST_LABELS.get(costKey) ?? costKey;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function CostBadge({ costKey }) {
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        flexShrink: 0,
        px: 1,
        py: 0.25,
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 700,
        color: REDUCTION_COST_ACCENT,
        backgroundColor: alpha(REDUCTION_COST_ACCENT, 0.12),
        border: `1px solid ${alpha(REDUCTION_COST_ACCENT, 0.55)}`,
      }}
    >
      {costLabel(costKey)}
    </Box>
  );
}

function CanvasCard({ title }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, borderRadius: 2, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <Typography variant="overline" sx={{ color: "text.secondary" }}>
        {title}
      </Typography>
      <Box
        sx={{
          height: 140,
          borderRadius: 1,
          border: "1px dashed",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Static preview — live diagrams are a later phase.
        </Typography>
      </Box>
    </Paper>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.problem A data/fixtures.js-shaped FixtureProblem.
 * @param {{attributes: Object, listeners: Object}} [props.dragHandleProps]
 *   Forwarded straight through to SectionShell — see T18 (#27).
 */
export default function ReductionsSection({ problem, dragHandleProps }) {
  const { to, from } = problem.reductions;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fromExpanded, setFromExpanded] = useState(true);

  const hasTo = to.length > 0;
  const hasFrom = from.length > 0;
  const hasAny = hasTo || hasFrom;
  const selected = hasTo ? to[Math.min(selectedIndex, to.length - 1)] : null;

  const total = to.length + from.length;
  const summary = `${total} reduction${total === 1 ? "" : "s"}`;

  const fromToggleId = "reductions-from-toggle";
  const fromBodyId = "reductions-from-body";

  return (
    <SectionShell
      sectionKey="reductions"
      title="Reductions"
      summary={summary}
      dragHandleProps={dragHandleProps}
    >
      {!hasAny && (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No reductions declared for this problem.
        </Typography>
      )}

      {hasAny && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <IconButton size="small" disabled aria-label="Previous step">
            <SkipPreviousIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" disabled aria-label="Play">
            <PlayArrowIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" disabled aria-label="Next step">
            <SkipNextIcon fontSize="small" />
          </IconButton>
          <Box sx={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: "divider" }} />
        </Box>
      )}
      {hasAny && (
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2, fontStyle: "italic" }}>
          Step-by-step reduction narration isn&apos;t available yet for this problem.
        </Typography>
      )}

      {hasTo && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}>
          <CanvasCard title={`${problem.name.toUpperCase()} INSTANCE — SOURCE`} />
          <Box
            sx={(theme) => ({
              alignSelf: "center",
              px: 1.5,
              py: 0.5,
              borderRadius: 999,
              backgroundColor: alpha(theme.palette.primary.main, 0.15),
              color: "primary.light",
              fontSize: "0.8125rem",
              fontWeight: 700,
            })}
          >
            ↓ {costLabel(selected.cost)} reduction
          </Box>
          <CanvasCard title={`${selected.target.toUpperCase()} INSTANCE — REDUCED`} />

          <Typography variant="overline" sx={{ color: "text.secondary", mt: 1 }}>
            Reduces to
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.75,
              maxHeight: 220,
              overflowY: "auto",
            }}
          >
            {to.map((reduction, index) => {
              const isSelected = index === selectedIndex;
              return (
                <Box
                  key={reduction.target}
                  id={`reduction-to-${slugify(reduction.target)}`}
                  component="button"
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedIndex(index)}
                  sx={(theme) => ({
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    font: "inherit",
                    color: "inherit",
                    px: 1.5,
                    py: 1,
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: isSelected ? "primary.main" : "divider",
                    backgroundColor: isSelected
                      ? alpha(theme.palette.primary.main, 0.12)
                      : "transparent",
                  })}
                >
                  <Typography variant="body2">
                    {reduction.target.toUpperCase()}
                    {isSelected && (
                      <Box component="span" sx={{ color: "text.secondary", fontWeight: 400 }}>
                        {" "}
                        (shown above)
                      </Box>
                    )}
                  </Typography>
                  <CostBadge costKey={reduction.cost} />
                </Box>
              );
            })}
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Selectable — click to render an entry above.
          </Typography>
        </Box>
      )}

      {hasFrom && (
        <Box>
          <Box
            id={fromToggleId}
            component="button"
            type="button"
            aria-expanded={fromExpanded}
            aria-controls={fromBodyId}
            onClick={() => setFromExpanded((prev) => !prev)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              border: "none",
              background: "none",
              p: 0,
              cursor: "pointer",
              color: "inherit",
              font: "inherit",
            }}
          >
            <ChevronRightIcon
              aria-hidden="true"
              fontSize="small"
              sx={{
                color: "text.secondary",
                transform: fromExpanded ? "rotate(90deg)" : "none",
                transition: "transform 0.15s ease",
              }}
            />
            <Typography variant="overline" sx={{ color: "text.secondary" }}>
              Reduces from ({from.length})
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
              informational — not selectable
            </Typography>
          </Box>

          <Box
            id={fromBodyId}
            sx={{
              display: fromExpanded ? "flex" : "none",
              flexDirection: "column",
              gap: 0.75,
              mt: 1,
            }}
          >
            {from.map((reduction) => (
              <Box
                key={reduction.source}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2">{reduction.source.toUpperCase()}</Typography>
                <CostBadge costKey={reduction.cost} />
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </SectionShell>
  );
}
