// components/detail/SolversSection.js
//
// T16c (#23) — the Solvers section of a Problem Detail page: a "paste an
// instance" block (format description + pre-filled input), a left rail of
// declared solvers, and a right detail pane with a canned Run.
//
// v1 scope (ground rule 5): Run is present but `disabled` and produces no
// live output — wiring `requestSolvedInstance()` live is explicitly out of
// v1. Where the fixture already supplies a canned runtime/result (only
// 3-SAT's DPLL entry does), that result is shown statically next to the
// disabled Run button, standing in for "the same canned result every time."
//
// Known gap, not fabricated: data/fixtures.js's FixtureProblem shape has no
// instanceFormat/example/default-instance field for any problem — the
// mockup's CNF-specific "PASTE AN INSTANCE" text was hand-drawn for 3-SAT
// and was never added to the fixture data contract (T09). Inventing
// plausible-looking format text here would fabricate data this component
// has no real source for, and wouldn't even make sense for a non-SAT
// problem like Knapsack. So this block degrades to a plain "not yet
// available" message instead — same spirit as this project's documented
// "Assignment Table" visualizationType gap. See this task's PR for the
// decision writeup.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { TAXONOMY } from "../../data/taxonomy";
import { getFacetAccentColor, thinScrollbarSx } from "../theme";
import SectionShell from "./SectionShell";

// #71: fixed rail height so a problem with many declared solvers scrolls
// inside the rail instead of stretching the section indefinitely.
const RAIL_MAX_HEIGHT = 320;

const TAXONOMY_BY_KEY = new Map(TAXONOMY.map((facet) => [facet.key, facet]));

function optionLabel(facetKey, optionKey) {
  const option = TAXONOMY_BY_KEY.get(facetKey)?.options.find(
    (candidate) => candidate.key === optionKey,
  );
  return option?.label ?? optionKey;
}

// Deliberately not the theme.js `solverComplexityOutlined`/`Filled` Chip
// variant (#70) -- this badge is a static declared-complexity label on the
// Problem Detail page, not a filterable card tag, so it stays the same
// plain-pill pattern components/ActiveFilterChips.js already uses for its
// facet-colored chips.
function ComplexityBucketBadge({ bucketKey }) {
  const facet = TAXONOMY_BY_KEY.get("solverComplexity");
  const accentColor = getFacetAccentColor(facet?.accentColor);
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1.25,
        py: 0.375,
        borderRadius: 999,
        color: accentColor,
        backgroundColor: alpha(accentColor, 0.12),
        border: `1px solid ${alpha(accentColor, 0.55)}`,
        fontSize: "0.8125rem",
        fontWeight: 700,
      }}
    >
      {optionLabel("solverComplexity", bucketKey)}
    </Box>
  );
}

const INSTANCE_TEXTAREA_ID = "solvers-instance-input";

/**
 * @param {Object} props
 * @param {Object} props.problem A data/fixtures.js-shaped FixtureProblem.
 * @param {{attributes: Object, listeners: Object}} [props.dragHandleProps]
 *   Forwarded straight through to SectionShell — see T18 (#27).
 */
export default function SolversSection({ problem, dragHandleProps }) {
  const solvers = problem.solvers ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = solvers[selectedIndex];

  const noun = solvers.length === 1 ? "solver" : "solvers";
  const summary = `${solvers.length} ${noun}`;

  return (
    <SectionShell
      sectionKey="solvers"
      title="Solvers"
      summary={summary}
      dragHandleProps={dragHandleProps}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Paste an instance — matches instanceFormat below
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
            Instance format not yet available for this problem.
          </Typography>
          <Box component="label" htmlFor={INSTANCE_TEXTAREA_ID} sx={{ display: "block", mt: 1.5 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.5 }}>
              Instance
            </Typography>
          </Box>
          <Box
            id={INSTANCE_TEXTAREA_ID}
            component="textarea"
            rows={2}
            readOnly
            placeholder="No default instance declared for this problem yet."
            sx={{
              width: "100%",
              resize: "vertical",
              backgroundColor: "background.default",
              color: "text.primary",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              p: 1,
              font: "inherit",
            }}
          />
        </Paper>

        <Box sx={{ display: "flex", gap: 2 }}>
          {solvers.length === 0 ? (
            <Typography
              variant="body2"
              sx={{ width: 260, flexShrink: 0, color: "text.secondary", fontStyle: "italic" }}
            >
              No solvers declared for this problem.
            </Typography>
          ) : (
            <Box
              component="ul"
              role="listbox"
              aria-label="Solvers"
              sx={{
                listStyle: "none",
                m: 0,
                p: 0,
                width: 260,
                flexShrink: 0,
                maxHeight: RAIL_MAX_HEIGHT,
                overflowY: "auto",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                ...thinScrollbarSx,
              }}
            >
              {solvers.map((solver, index) => {
                const solverId = `solver-${index}-toggle`;
                const isSelected = index === selectedIndex;
                return (
                  <Box component="li" key={solverId} sx={{ listStyle: "none" }}>
                    <Box
                      id={solverId}
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
                        p: 1.5,
                        cursor: "pointer",
                        textAlign: "left",
                        font: "inherit",
                        color: "inherit",
                        border: "none",
                        borderLeft: "3px solid",
                        borderLeftColor: isSelected ? "primary.main" : "transparent",
                        backgroundColor: isSelected
                          ? alpha(theme.palette.primary.main, 0.14)
                          : "transparent",
                        "&:hover": {
                          backgroundColor: isSelected
                            ? alpha(theme.palette.primary.main, 0.14)
                            : alpha(theme.palette.common.white, 0.04),
                        },
                      })}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: isSelected ? "text.primary" : "text.secondary" }}
                      >
                        {solver.name}
                      </Typography>
                      <Chip
                        size="small"
                        variant="solverTypeOutlined"
                        label={optionLabel("solverType", solver.type)}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {!selected ? (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Select a solver to see its details.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Typography variant="h2" component="h4" sx={{ fontSize: "1rem" }}>
                  {selected.name}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <ComplexityBucketBadge bucketKey={selected.complexityBucket} />
                  {selected.bigO && (
                    <Typography variant="mono" sx={{ color: "text.secondary" }}>
                      {selected.bigO}
                    </Typography>
                  )}
                </Box>
                <Button
                  id="solvers-run-button"
                  variant="contained"
                  disabled
                  sx={{ alignSelf: "flex-start" }}
                >
                  Run
                </Button>
                {selected.runtime || selected.result ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {selected.runtime && (
                      <Typography variant="body2">
                        <Box component="span" sx={{ color: "text.secondary" }}>
                          Runtime:{" "}
                        </Box>
                        {selected.runtime}
                      </Typography>
                    )}
                    {selected.result && (
                      <Typography variant="body2">
                        <Box component="span" sx={{ color: "text.secondary" }}>
                          Result:{" "}
                        </Box>
                        {selected.result.status} {selected.result.output}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                    Not yet run.
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </SectionShell>
  );
}
