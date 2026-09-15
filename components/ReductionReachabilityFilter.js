// components/ReductionReachabilityFilter.js
//
// T59 (#134) — the reduction-reachability filter: pick a source problem and
// a mode (one direct reduction hop, or the full transitive closure), and the
// results narrow to only the problems reachable from that source through the
// reduction graph. The actual graph traversal (reachableOneHop/
// reachableAnyHops, ported from Redux_GUI's
// components/hooks/ProblemFilters/useProblemFilters.js) lives in
// hooks/useCatalogFilters.js — this component is only the picker + mode
// toggle, no traversal logic of its own. It is a controlled pair of
// (source, mode) values, same pattern SearchBar.js's value/onChange already
// uses, so pages/index.js can reset it via "Clear all".
//
// A singleton on the page — one instance, like SearchBar — so its ids are
// static literals rather than derived per-instance, same precedent
// SearchBar.js's own header documents for the same reason (ground rule 4 is
// about never hardcoding a literal id inside a REUSABLE component; this one,
// like SearchBar, is never rendered twice on the same page).
//
// Moved into FacetSidebar (rendered just above "Clear filters"), per direct
// project-owner instruction — it started out inline above the search bar's
// own "Filtering by" row, but reads more naturally as another filter control
// next to the facet checkboxes than as a second search input. That move is
// also why this stacks vertically now rather than flowing inline: the
// picker + toggle group used to sit in the wide main-content column (room
// for both side by side); FacetSidebar's column is a fixed 340px (or the
// narrow-width Drawer's ~320px), too narrow for both on one line without
// the toggle group's labels clipping.

import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

const SOURCE_INPUT_ID = "reachability-source-input";
const MODE_GROUP_ID = "reachability-mode-group";
const ONE_HOP_ID = "reachability-mode-one-hop";
const ANY_HOPS_ID = "reachability-mode-any-hops";

/**
 * @param {Object} props
 * @param {string[]} props.problemNames Every real problem name currently in
 *   the catalog index (useCatalogIndex()'s `index` keys), used as the
 *   picker's option list.
 * @param {string|null} props.source Selected source problem name, or null
 *   when no reachability filter is active.
 * @param {"oneHop"|"anyHops"} props.mode
 * @param {(next: string|null) => void} props.onSourceChange
 * @param {(next: "oneHop"|"anyHops") => void} props.onModeChange
 * @param {boolean} [props.loading] Disables the picker while the catalog is
 *   still loading, matching FacetSidebar's own `loading` treatment — there
 *   is nothing real to pick yet.
 */
export default function ReductionReachabilityFilter({
  problemNames,
  source,
  mode,
  onSourceChange,
  onModeChange,
  loading = false,
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Autocomplete
        id={SOURCE_INPUT_ID}
        options={problemNames}
        value={source}
        onChange={(_event, next) => onSourceChange(next)}
        disabled={loading}
        size="small"
        sx={{ width: "100%" }}
        renderInput={(params) => (
          <TextField {...params} label="Reachable from" placeholder="Pick a source problem" />
        )}
      />
      <ToggleButtonGroup
        id={MODE_GROUP_ID}
        value={mode}
        exclusive
        size="small"
        fullWidth
        disabled={loading || !source}
        onChange={(_event, next) => {
          // MUI passes `null` when the already-selected button is clicked
          // again — ignored, so the mode toggle behaves like a real radio
          // pair (always exactly one selection) rather than becoming
          // deselectable.
          if (next) onModeChange(next);
        }}
        aria-label="Reduction reachability mode"
      >
        <ToggleButton id={ONE_HOP_ID} value="oneHop" aria-label="One hop">
          One hop
        </ToggleButton>
        <ToggleButton id={ANY_HOPS_ID} value="anyHops" aria-label="Any hops">
          Any hops
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}
