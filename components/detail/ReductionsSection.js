// components/detail/ReductionsSection.js
//
// T16e (#25) — the most complex-looking panel in the mockup, and deliberately
// the most scoped-down. Reduces-to/reduces-from lists and cost badges are
// real declared data (data/fixtures.js's `reductions` shape aligns well with
// the backend); the source/target instance diagrams are still static
// placeholders (real diagram rendering is T53, once T48-T50 land) — no
// draggable/editable nodes (v1 scope).
//
// The step-scrubber row is real now (T47/#110), via the shared StepScrubber
// component. A reduction is structurally a 2-frame case, not a UI limitation
// to work around: `POST /ProblemProvider/visualizeReduction` always returns
// an empty steps list (`AdditionalControllers/ProblemProvider.cs:312`), so
// there is only ever a source-shape base frame and a reduced/solved frame,
// never intermediate steps (INTERACTIVE_LAYER_DESIGN.md §1.3) — so this
// section always passes `frameCount={2}` rather than deriving a count from
// data that will never carry more than that.
//
// The source/target canvas cards are likewise static placeholders (no real
// diagram-rendering exists yet) rather than an attempt to actually draw a
// graph — selecting a different "Reduces to" row still updates which target
// problem the placeholder card and cost badge describe, which is the real
// interactive behavior the issue's done-when asks for.

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { TAXONOMY } from "../../data/taxonomy";
import { getFacetAccentColor, thinScrollbarSx } from "../theme";
import SectionShell from "./SectionShell";
import StepScrubber from "./StepScrubber";

// #71: fixed list height so a problem with many declared reduction targets
// scrolls inside the list instead of stretching the section indefinitely.
const REDUCES_TO_MAX_HEIGHT = 220;

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
  const [currentStep, setCurrentStep] = useState(0);
  const [fromExpanded, setFromExpanded] = useState(true);

  const hasTo = to.length > 0;
  const hasFrom = from.length > 0;
  const hasAny = hasTo || hasFrom;
  const selected = hasTo ? to[Math.min(selectedIndex, to.length - 1)] : null;

  // Selecting a different reduction target starts its base/reduced toggle
  // over rather than carrying a step index across to an unrelated pair.
  // Render-time state adjustment (React's documented pattern for this, not
  // a useEffect) so it doesn't cost an extra committed render.
  const [stepResetKey, setStepResetKey] = useState(selectedIndex);
  if (stepResetKey !== selectedIndex) {
    setStepResetKey(selectedIndex);
    setCurrentStep(0);
  }

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

      {hasTo && (
        <Box sx={{ mb: 2 }}>
          <StepScrubber
            idPrefix="reductions-scrubber"
            frameCount={2}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            frameNoun="Frame"
          />
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 1, fontStyle: "italic" }}>
            A reduction is a single mapping, not a stepped process — this toggles between the source
            instance and the reduced instance, with no intermediate steps.
          </Typography>
        </Box>
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
            role="listbox"
            aria-label="Reduces to"
            sx={{
              maxHeight: REDUCES_TO_MAX_HEIGHT,
              overflowY: "auto",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1.5,
              ...thinScrollbarSx,
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
                  role="option"
                  aria-selected={isSelected}
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
                    border: "none",
                    borderLeft: "3px solid",
                    borderLeftColor: isSelected ? "primary.main" : "transparent",
                    backgroundColor: isSelected
                      ? alpha(theme.palette.primary.main, 0.12)
                      : "transparent",
                    "&:hover": {
                      backgroundColor: isSelected
                        ? alpha(theme.palette.primary.main, 0.12)
                        : alpha(theme.palette.common.white, 0.04),
                    },
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
