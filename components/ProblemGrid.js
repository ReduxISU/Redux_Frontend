// components/ProblemGrid.js
//
// T17 (#26) — the grid ProblemCatalogCard sits in on the Home page.
//
// Real CSS Grid (not flex-wrap): a shared row/column track keeps every
// card's top edge aligned to the same row regardless of how many tag rows a
// given card happens to render (#26 done-when: "rows line up even when
// cards have different numbers of tag rows"). `alignItems: "start"` keeps
// each card at its own intrinsic height rather than CSS Grid's default
// stretch behavior, which would pad a shorter card's background down to
// match its tallest row-mate -- the Home mockup shows cards of visibly
// different heights sitting in the same row, not stretched to match.
//
// Column count is a named constant, not a literal repeated across
// properties, so T28 (#37) -- which owns the narrow-width breakpoints and
// whether/how this becomes responsive -- has one place to change rather
// than a hunt through this file. Phase 1 is desktop-only; going to 2 and
// then 1 column at narrower widths is explicitly T28's call, not this
// task's, so no breakpoint object is added here.
//
// Owns its own vertical scroll (`overflowY: "auto"`) rather than leaving it
// to an ancestor, because the mockup's results column scrolls independently
// while the sidebar stays put (visible scrollbar sits at the grid's own
// right edge, not the page's). This only takes effect once the Home page
// (T14/#18) gives this component a bounded height to scroll within (e.g.
// `flex: 1` inside a fixed-height row below the nav/search chrome) -- that
// outer layout is #18's job, not this component's.
//
// "Doesn't trap keyboard focus" (#26 done-when) needs no extra code: plain
// `overflow: auto` never removes an element from tab order, and browsers
// already auto-scroll a newly focused element into view.
//
// Empty-state wording is a placeholder -- the issue says to "coordinate the
// exact wording with T29 (#38)", which hasn't been built yet -- so it's
// exposed as an overridable `emptyMessage` prop rather than hardcoded, so
// T29 can supply the final copy without editing this file.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ProblemCatalogCard from "./ProblemCatalogCard";
import { thinScrollbarSx } from "./theme";

const DESKTOP_COLUMN_COUNT = 3;

/**
 * @param {Object} props
 * @param {Array} props.problems Data/fixtures.js-shaped FixtureProblem
 *   objects to render, already filtered and searched by the caller -- this
 *   component only lays them out, it never filters.
 * @param {Object} [props.matchedTags] `{ [facetKey]: Set<optionKey> }`,
 *   forwarded to every card unchanged (ProblemCatalogCard's own prop).
 * @param {string} [props.emptyMessage] Shown in place of the grid when
 *   `problems` is empty (ground rule 6: an empty grid, not a crash).
 */
export default function ProblemGrid({
  problems,
  matchedTags = {},
  emptyMessage = "No problems match your filters.",
}) {
  if (problems.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100%",
        overflowY: "auto",
        display: "grid",
        gridTemplateColumns: `repeat(${DESKTOP_COLUMN_COUNT}, minmax(0, 1fr))`,
        alignItems: "start",
        // #69: row gap trimmed independently of column gap -- the issue is
        // specifically about vertical space between cards, not horizontal.
        rowGap: 1.25,
        columnGap: 2,
        pb: 1,
        pr: 1,
        ...thinScrollbarSx,
      }}
    >
      {problems.map((problem) => (
        <ProblemCatalogCard key={problem.slug} problem={problem} matchedTags={matchedTags} />
      ))}
    </Box>
  );
}
