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
// than a hunt through this file.
//
// T28 (#37): 1 column below `sm` (600px), 2 from `sm` up through `md`
// (600-1199px, which covers both the 768px and 1024px reference widths --
// at 1024 the sidebar is back to its fixed 340px column per pages/index.js,
// so 2 columns fit the remaining width better than 3 would), 3 at `lg`
// (1200px) and up.
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
//
// T29 (#38): `loading` (default false) swaps the grid for a fixed number of
// skeleton cards in the same grid container instead of the `emptyMessage`
// text -- the issue's own "Loading" done-when asks for something that
// "shouldn't cause the layout to jump when the real content arrives," and a
// centered text line replaced by a full card grid is exactly that kind of
// jump. The skeleton count doesn't try to match the real eventual result
// count (unknowable before the fetch resolves); it only has to reserve
// roughly the right shape.

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import ProblemCatalogCard from "./ProblemCatalogCard";
import { thinScrollbarSx } from "./theme";

const COLUMN_COUNT_BY_BREAKPOINT = { xs: 1, sm: 2, lg: 3 };
const SKELETON_CARD_COUNT = 6;

const gridContainerSx = {
  height: "100%",
  overflowY: "auto",
  display: "grid",
  gridTemplateColumns: Object.fromEntries(
    Object.entries(COLUMN_COUNT_BY_BREAKPOINT).map(([breakpoint, count]) => [
      breakpoint,
      `repeat(${count}, minmax(0, 1fr))`,
    ]),
  ),
  alignItems: "start",
  // #69: row gap trimmed independently of column gap -- the issue is
  // specifically about vertical space between cards, not horizontal.
  rowGap: 1.25,
  columnGap: 2,
  pb: 1,
  pr: 1,
  ...thinScrollbarSx,
};

// Same Paper shape/padding as ProblemCatalogCard (title + three tag rows),
// so swapping this out for the real card once it arrives doesn't shift the
// row's height.
function SkeletonCard() {
  return (
    <Paper sx={{ p: 2, borderRadius: 3 }}>
      <Skeleton variant="text" width="70%" height={28} sx={{ mb: 1.5 }} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Skeleton variant="rounded" width="45%" height={22} />
        <Skeleton variant="rounded" width="60%" height={22} />
        <Skeleton variant="rounded" width="50%" height={22} />
      </Box>
    </Paper>
  );
}

/**
 * @param {Object} props
 * @param {Array} props.problems Data/fixtures.js-shaped FixtureProblem
 *   objects to render, already filtered and searched by the caller -- this
 *   component only lays them out, it never filters.
 * @param {Object} [props.matchedTags] `{ [facetKey]: Set<optionKey> }`,
 *   forwarded to every card unchanged (ProblemCatalogCard's own prop).
 * @param {string} [props.emptyMessage] Shown in place of the grid when
 *   `problems` is empty and not loading (ground rule 6: an empty grid, not
 *   a crash).
 * @param {boolean} [props.loading] Shows skeleton cards instead of
 *   `emptyMessage` while the catalog is still being fetched.
 */
export default function ProblemGrid({
  problems,
  matchedTags = {},
  emptyMessage = "No problems match your filters.",
  loading = false,
}) {
  if (loading) {
    return (
      <Box sx={gridContainerSx} aria-hidden="true">
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
          <SkeletonCard key={index} />
        ))}
      </Box>
    );
  }

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
    <Box sx={gridContainerSx}>
      {problems.map((problem) => (
        <ProblemCatalogCard key={problem.slug} problem={problem} matchedTags={matchedTags} />
      ))}
    </Box>
  );
}
