// components/ActiveFilterChips.js
//
// T14b (#19) — the "FILTERING BY" row that sits between the search bar and
// the results grid on the Home page, once at least one filter is selected.
// Split out of T14 (#18) because it's a self-contained component named in
// ARCHITECTURE.md, and can be built in parallel with the rest of the Home
// page rather than after it.
//
// Absent entirely -- not an empty container -- when nothing is selected
// (issue done-when; the default Home mockup has no gap there), so this
// returns null rather than rendering a row with nothing in it.
//
// Not built on MUI Chip's own `onDelete`/`deleteIcon` plumbing: passing
// `onDelete` turns the *whole* Chip into a ButtonBase (Chip.js), which would
// make each chip two overlapping tab stops -- the chip root (reachable via
// Tab, deletes on Backspace/Delete) and any custom deleteIcon element placed
// inside it. The issue's own done-when wants one real, separately
// identifiable remove control per chip ("its own unique id and an
// accessible name that says what it removes"), not a keyboard shortcut on
// the chip as a whole, so this builds a plain pill (label + a real `<button>`
// remove control) instead of reaching for Chip here.
//
// Every chip's label text comes from data/taxonomy.js; colors come from
// components/theme.js's getFacetAccentColor(), the same helper
// FacetSidebar's group dot and selection badge already use.
//
// T59 (#134): the reduction-reachability filter (hooks/useCatalogFilters.js)
// isn't a data/taxonomy.js facet — it's graph traversal, not facet
// membership — so its chip ("Reachable from Clique") is built from the
// reachabilitySource/reachabilityMode props directly rather than from a
// TAXONOMY entry, but reuses the same Chip primitive and remove-button
// pattern every facet chip already uses. Its accent is "magenta" — defined
// in components/theme.js's FACET_ACCENT_COLORS but unused by any current
// facet since the mockup's separate Quantum Complexity Class group was
// merged into Complexity Class (#6, 2026-09-01) — so this reuses an existing
// token rather than adding a new one.

import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { TAXONOMY } from "../data/taxonomy";
import { getFacetAccentColor } from "./theme";

const TAXONOMY_BY_KEY = new Map(TAXONOMY.map((facet) => [facet.key, facet]));
const REACHABILITY_ACCENT = getFacetAccentColor("magenta");

function optionLabel(facetKey, optionKey) {
  const option = TAXONOMY_BY_KEY.get(facetKey)?.options.find((candidate) => {
    return candidate.key === optionKey;
  });
  return option?.label ?? optionKey;
}

function Chip({ label, accentColor, removeId, ariaLabel, onRemove }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        pl: 1.25,
        pr: 0.5,
        py: 0.375,
        borderRadius: 999,
        color: accentColor,
        backgroundColor: alpha(accentColor, 0.12),
        border: `1px solid ${alpha(accentColor, 0.55)}`,
        fontSize: "0.8125rem",
        fontWeight: 600,
      }}
    >
      <Box component="span">{label}</Box>
      <Box
        id={removeId}
        component="button"
        type="button"
        aria-label={ariaLabel}
        onClick={onRemove}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          background: "none",
          p: 0.25,
          borderRadius: "50%",
          color: "inherit",
          cursor: "pointer",
          lineHeight: 0,
        }}
      >
        <CloseIcon aria-hidden="true" sx={{ fontSize: "0.9375rem" }} />
      </Box>
    </Box>
  );
}

function FilterChip({ facet, optionKey, onRemove }) {
  const accentColor = getFacetAccentColor(facet.accentColor);
  const label = optionLabel(facet.key, optionKey);
  const removeId = `active-filter-chip-${facet.key}-${optionKey}-remove`;

  return (
    <Chip
      label={label}
      accentColor={accentColor}
      removeId={removeId}
      ariaLabel={`Remove ${label} filter`}
      onRemove={() => onRemove(facet.key, optionKey)}
    />
  );
}

// "Reachable from Clique" for one hop; "(any hops)" appended when the mode
// is the full transitive closure, so the chip itself says which reading is
// active rather than leaving that to the (disabled, when no source is set)
// mode toggle alone.
function reachabilityLabel(reachabilitySource, reachabilityMode) {
  return reachabilityMode === "anyHops"
    ? `Reachable from ${reachabilitySource} (any hops)`
    : `Reachable from ${reachabilitySource}`;
}

/**
 * @param {Object} props
 * @param {Object} [props.selected] `{ [facetKey]: Set<optionKey> }` -- the
 *   same shape FacetSidebar's `selected` prop already uses, so the Home page
 *   can pass one filter-state object to both.
 * @param {string|null} [props.reachabilitySource] T59 (#134). The active
 *   reduction-reachability filter's source problem name, or null when it
 *   isn't active.
 * @param {"oneHop"|"anyHops"} [props.reachabilityMode] T59 (#134).
 * @param {(facetKey: string, optionKey: string) => void} props.onRemove
 *   Called when a single facet chip's remove button is pressed.
 * @param {() => void} [props.onRemoveReachability] T59 (#134). Called when
 *   the reachability chip's remove button is pressed.
 * @param {() => void} props.onClearAll Called by the row's "Clear all"
 *   action. This component only ever touches filter selections -- clearing
 *   the search box too (issue body) is the page's responsibility.
 */
export default function ActiveFilterChips({
  selected = {},
  reachabilitySource = null,
  reachabilityMode = "oneHop",
  onRemove,
  onRemoveReachability,
  onClearAll,
}) {
  const entries = [];
  for (const facet of TAXONOMY) {
    for (const optionKey of selected[facet.key] ?? []) {
      entries.push({ facet, optionKey });
    }
  }

  if (entries.length === 0 && !reachabilitySource) {
    return null;
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
      <Typography variant="overline" component="span" sx={{ color: "text.secondary" }}>
        Filtering by
      </Typography>
      {entries.map(({ facet, optionKey }) => (
        <FilterChip
          key={`${facet.key}-${optionKey}`}
          facet={facet}
          optionKey={optionKey}
          onRemove={onRemove}
        />
      ))}
      {reachabilitySource && (
        <Chip
          label={reachabilityLabel(reachabilitySource, reachabilityMode)}
          accentColor={REACHABILITY_ACCENT}
          removeId="active-filter-chip-reachability-remove"
          ariaLabel={`Remove ${reachabilityLabel(reachabilitySource, reachabilityMode)} filter`}
          onRemove={onRemoveReachability}
        />
      )}
      <Box
        id="active-filter-chips-clear-all"
        component="button"
        type="button"
        onClick={onClearAll}
        sx={{
          border: "none",
          background: "none",
          p: 0,
          ml: 0.5,
          color: "text.secondary",
          font: "inherit",
          fontWeight: 600,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        Clear all
      </Box>
    </Box>
  );
}
