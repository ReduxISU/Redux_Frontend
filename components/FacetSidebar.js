// components/FacetSidebar.js
//
// T11 (#15) — the filter panel down the left side of the Home page: one
// collapsible checkbox group per data/taxonomy.js facet marked
// `sidebar: true`, plus a full-width "Clear filters" button.
//
// Port of Redux_GUI's components/widgets/FacetFilterGroup.js. That source
// is genuinely minimal — {label, options, selected, onChange} and nothing
// else — so everything beyond a bare checkbox list (collapse/expand, the
// chevron, the collapsed-selection badge, the internal scroll cap, group
// dividers, "Clear filters", and derived ids) is new work added here, per
// the issue body and TASKLIST.md's T11 entry. Kept as a single file, one
// module-private group primitive plus the sidebar, matching
// ARCHITECTURE.md's file tree (which lists FacetSidebar.js only).
//
// Prop shape (T24/#33, which computes real counts, hasn't started — this
// component only consumes the shape, never data/fixtures.js directly):
//   facetOptions: { [facetKey]: [{ key, label, count }] }
//   selected:     { [facetKey]: Set<optionKey> }
//   onChange(facetKey, nextSelectedSet)
//   onClearFilters()
//
// T29 (#38): `loading` (default false) swaps each option's real `count` for
// a skeleton bar. Every facet's own option list is static (data/taxonomy.js,
// not the backend) so the checkboxes and labels themselves render
// immediately either way -- only the per-option counts are backend-derived
// and start at 0 for everything while useCatalogIndex's index Map is still
// empty. Rendering those real zeros during the fetch would be exactly the
// "loading state briefly shows a wrong count" bug T29's done-when warns
// about (every option would flash "(0)" and then jump to its real count),
// so this replaces the count text with a placeholder of about the same
// width instead of a number that's about to be wrong.

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { TAXONOMY } from "../data/taxonomy";
import { getFacetAccentColor } from "./theme";

function FacetFilterGroup({ facet, options, selected, onChange, loading }) {
  const [expanded, setExpanded] = useState(true);
  const toggleId = `facet-${facet.key}-toggle`;
  const listId = `facet-${facet.key}-options`;
  const selectedCount = selected.size;
  const accentColor = getFacetAccentColor(facet.accentColor);

  const toggleOption = (optionKey) => {
    const next = new Set(selected);
    if (next.has(optionKey)) {
      next.delete(optionKey);
    } else {
      next.add(optionKey);
    }
    onChange(next);
  };

  // Decorative elements (chevron, dot, label text, badge) are all
  // aria-hidden; the button carries one explicit aria-label instead of
  // relying on concatenated child text, so a collapsed group with
  // selections reads unambiguously (e.g. "Visualization Type, 1 selected").
  const accessibleName =
    !expanded && selectedCount > 0 ? `${facet.label}, ${selectedCount} selected` : facet.label;

  return (
    <Box>
      <Box
        id={toggleId}
        component="button"
        type="button"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-label={accessibleName}
        onClick={() => setExpanded((prev) => !prev)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          width: "100%",
          border: "none",
          background: "none",
          p: 0,
          py: 1.25,
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
        <Box
          aria-hidden="true"
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: accentColor,
            flexShrink: 0,
          }}
        />
        <Typography
          aria-hidden="true"
          variant="overline"
          component="span"
          sx={{ color: "text.primary", flexGrow: 1 }}
        >
          {facet.label}
        </Typography>
        {!expanded && selectedCount > 0 && (
          <Box
            aria-hidden="true"
            sx={{
              minWidth: 18,
              height: 18,
              px: 0.5,
              borderRadius: 999,
              fontSize: "0.6875rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#FFFFFF",
              backgroundColor: accentColor,
            }}
          >
            {selectedCount}
          </Box>
        )}
      </Box>

      <FormGroup
        id={listId}
        sx={{
          display: expanded ? "flex" : "none",
          // MUI's FormGroup defaults to `flexWrap: "wrap"` (Root style, see
          // node_modules/@mui/material/FormGroup/FormGroup.js). Combined
          // with `flexDirection: "column"` (also the default), a long list
          // wrapped into a second flex *column* rather than growing
          // downward — reported in #68 as options "starting on the next
          // column after going out of view." Forced to `nowrap` so a group
          // always grows straight down the page instead of sideways; per
          // #68's revised direction there's no per-group height cap or
          // internal scroll any more; the whole panel scrolls as one
          // (see the sidebar's own overflowY in pages/index.js).
          flexWrap: "nowrap",
          pl: 3,
        }}
      >
        {options.length === 0 ? (
          <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
            No values available
          </Typography>
        ) : (
          options.map(({ key: optionKey, label: optionLabel, count }) => {
            const optionId = `facet-${facet.key}-option-${optionKey}`;
            return (
              <FormControlLabel
                key={optionKey}
                sx={{ mx: 0, opacity: !loading && count === 0 ? 0.5 : 1 }}
                control={
                  <Checkbox
                    id={optionId}
                    value={optionKey}
                    size="small"
                    checked={selected.has(optionKey)}
                    onChange={() => toggleOption(optionKey)}
                    // T30 (#39): a machine-readable count, so a Playwright
                    // spec can pick "an option with a nonzero count" without
                    // parsing it back out of the rendered "(N)" label text --
                    // the done-when wants tests keyed to stable attributes,
                    // not text scraping, and the label's own wording is
                    // free to change without breaking that.
                    slotProps={{ input: { "data-count": count } }}
                  />
                }
                label={
                  <Typography variant="body2" component="span">
                    {optionLabel}{" "}
                    {loading ? (
                      <Skeleton
                        component="span"
                        variant="text"
                        width={22}
                        sx={{ display: "inline-block", verticalAlign: "middle" }}
                      />
                    ) : (
                      <Box component="span" sx={{ color: "text.secondary" }}>
                        ({count})
                      </Box>
                    )}
                  </Typography>
                }
              />
            );
          })
        )}
      </FormGroup>
    </Box>
  );
}

export default function FacetSidebar({
  facetOptions = {},
  selected = {},
  onChange,
  onClearFilters,
  loading = false,
}) {
  const sidebarFacets = TAXONOMY.filter((facet) => facet.sidebar);

  return (
    <Box
      component="nav"
      aria-label="Filter problems"
      sx={{ display: "flex", flexDirection: "column" }}
    >
      {sidebarFacets.map((facet, index) => (
        <Box key={facet.key}>
          {index > 0 && <Divider />}
          <FacetFilterGroup
            facet={facet}
            options={facetOptions[facet.key] ?? []}
            selected={selected[facet.key] ?? new Set()}
            onChange={(next) => onChange(facet.key, next)}
            loading={loading}
          />
        </Box>
      ))}
      <Divider sx={{ mt: 1, mb: 2 }} />
      <Button
        id="facet-sidebar-clear-filters"
        variant="outlined"
        fullWidth
        onClick={onClearFilters}
      >
        Clear filters
      </Button>
    </Box>
  );
}
