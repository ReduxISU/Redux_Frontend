// components/ProblemCatalogCard.js
//
// T12 (#16) — one card in the Home page grid: problem name, status icon, and
// rows of derived tag badges (Complexity Class, Problem Type, plus the
// always-visible labeled Solvers/Visualizations sections added by T58/#133).
//
// A small monitor icon sits next to the title whenever hasRenderableVisualization()
// (StatusIcon.js) is true -- ported directly from Redux_GUI's own Browse card
// (components/widgets/ProblemCard.js's `hasRenderableVisualization` prop and its
// `Monitor` icon), after Convex Hull's card was found showing a green "fully
// catalogued" status despite having no real visualization to show. Presence-only,
// matching Redux_GUI's pattern exactly: nothing renders here when false, rather than
// a second "absent" icon competing for attention next to StatusIcon's own complete/
// incomplete glyph.
//
// The whole card is a link to the problem's detail page -- but only when the
// problem is complete. #6 item 4 (2026-08-31) ratifies that an incomplete
// problem's detail page must not be reachable at all, so #16's 2026-08-31
// comment requires an incomplete card to render as genuinely non-interactive:
// not a link, not a tab stop, visibly distinct -- not a link that swallows
// the click. isProblemComplete() (components/StatusIcon.js) is the one place
// that predicate lives; this file imports it rather than re-deriving "has a
// solver/visualization/verifier" on its own.
//
// T25 (#34): the link target is `/${encodeURIComponent(problem.name)}`, not
// `/${problem.slug}` -- the real backend has no slug concept, and T26
// (#35)'s pages/[problem].js resolves its route param against the real
// problem's display name (Next.js decodes the segment automatically before
// the match, so no manual decoding is needed on that end either). `slug`
// itself is kept, but only as the id-safe basis for this card's own
// `key`/`id` (see toCardProblem in pages/index.js), never for routing.
//
// No visual reference exists for the non-interactive treatment: both Home
// mockups predate the 2026-08-31 amendment that introduced the rule. The
// choice made here (reduced opacity + dashed border, so the difference
// doesn't rely on color alone) is recorded as a decision comment on #16, not
// assumed silently -- see this task's handback summary.
//
// Badge rows read `problem.tags.<facetKey>` directly (data/fixtures.js's
// documented shape contract: already-derived option keys, not raw backend
// values) and look up each key's label in data/taxonomy.js -- no label text
// is written in this file (#16 done-when). Complexity Class renders whatever
// deriveComplexityClasses() (data/taxonomy.js) already produced into that
// array -- 2 or 3 badges on one row is expected, not special-cased (#6 item
// 7, 2026-09-01 follow-up, supersedes the original quantum-slot rule).
//
// #70: BASE_BADGE_FACET_KEYS (complexityClass/problemType) always render,
// same as before. Any OTHER taxonomy facet gets its own row added on top,
// but only once `matchedTags` says a filter for it is active -- pages/
// index.js only ever shows problems matching every active facet selection
// (matchesSelectedFacets), so a card that's on screen at all already has a
// tag for that facet worth showing. Rows use the same TagRow/Chip-variant
// treatment either way, so an added row looks exactly like a default one
// whose filter is selected (issue body).
//
// T58 (#133): solverType and visualizationType are no longer part of the
// generic unlabeled base row. Each gets its own always-visible, captioned
// section instead ("Solvers" / "Visualizations", LABELED_FACET_ROWS below),
// matching Redux_GUI's equivalent card (components/widgets/ProblemCard.js
// in that sibling repo, which shows the exact same two labeled sections
// with the same empty-state wording). Kept out of `extraFacetKeys` too, so
// an active filter on either facet never produces a second, duplicate row
// alongside the one that's already always there.
//
// T57 (#132): every chip -- base row, labeled section, or filter-triggered
// extra row -- takes the same optional `onTagClick(facetKey, optionKey)`
// callback and renders through MUI Chip's own `clickable`/`onClick` props,
// so Tab+Enter/Space activates it exactly like a mouse click would, with no
// bespoke keyboard handling here.

import CheckIcon from "@mui/icons-material/Check";
import MonitorIcon from "@mui/icons-material/Monitor";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { TAXONOMY, optionLabel } from "../data/taxonomy";
import StatusIcon, { hasRenderableVisualization, isProblemComplete } from "./StatusIcon";

const EMPTY_SET = new Set();

// Row order per the issue body. Each row's Chip-variant family is now just
// its own facetKey (theme.js's per-facet chip variants, #70) -- so a facet
// outside this base list can reuse the exact same TagRow with no extra
// mapping.
const BASE_BADGE_FACET_KEYS = ["complexityClass", "problemType"];

// T58 (#133): the two always-visible labeled rows, in display order. Label
// and empty-state text are UI copy (a section caption and a "nothing here"
// placeholder), not a taxonomy option/facet display name, so they're kept
// here rather than added to data/taxonomy.js -- same precedent as
// FacetSidebar.js's own hardcoded "No values available" placeholder.
const LABELED_FACET_ROWS = [
  { facetKey: "solverType", label: "Solvers", emptyLabel: "No solvers" },
  { facetKey: "visualizationType", label: "Visualizations", emptyLabel: "No visualizations" },
];
const LABELED_FACET_KEYS = LABELED_FACET_ROWS.map((row) => row.facetKey);

// optionLabel() moved to data/taxonomy.js so useCatalogFilters.js's search
// (tag-name matching, not just problem-name matching) can read the exact
// same label a chip on this card actually shows, rather than keeping two
// copies of the same lookup that could drift apart.

// data/taxonomy.js's own shape-contract note (see pages/index.js's header
// comment): every facet except computationalModel stores its problem-level
// tag as an array even when `multiValued: false`. Normalizing here rather
// than special-casing computationalModel lets every facet, base or added,
// go through one TagRow.
function tagValueAsArray(tagValue) {
  if (Array.isArray(tagValue)) {
    return tagValue;
  }
  return tagValue == null ? [] : [tagValue];
}

// T57 (#132): `onTagClick` is optional -- omitted, every chip renders exactly
// as before (non-clickable). Passed, each chip becomes a real MUI `Chip`
// button (`clickable` + `onClick`, not a bare `onClick` on a non-interactive
// element) so it's reachable by Tab and activatable with Enter/Space for
// free. `idPrefix` gives every chip a globally unique id (ground rule 4) --
// the same optionKey can appear on many cards at once, so the id has to
// include the owning card, not just the facet/option pair.
function TagRow({ facetKey, tagKeys, matchedKeys, idPrefix, onTagClick }) {
  if (!tagKeys || tagKeys.length === 0) {
    return null;
  }
  const clickable = typeof onTagClick === "function";
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
      {tagKeys.map((optionKey) => {
        const matched = matchedKeys.has(optionKey);
        return (
          <Chip
            key={optionKey}
            id={`${idPrefix}-tag-${facetKey}-${optionKey}`}
            size="small"
            variant={matched ? `${facetKey}Filled` : `${facetKey}Outlined`}
            icon={matched ? <CheckIcon /> : undefined}
            label={optionLabel(facetKey, optionKey)}
            clickable={clickable}
            onClick={
              clickable
                ? (event) => {
                    // The card itself is a Link when the problem is complete
                    // (see the component below) -- stop the click from also
                    // bubbling into a full-card navigation.
                    event.preventDefault();
                    event.stopPropagation();
                    onTagClick(facetKey, optionKey);
                  }
                : undefined
            }
          />
        );
      })}
    </Box>
  );
}

// T58 (#133): one always-visible, captioned facet section -- "Solvers" or
// "Visualizations" -- with the same italic empty-state convention already
// used elsewhere on this card (see ProblemGrid.js/FacetSidebar.js) rather
// than TagRow's own "render nothing" behavior, which would leave a silent
// gap instead of a placeholder.
function LabeledFacetSection({
  facetKey,
  label,
  emptyLabel,
  tagKeys,
  matchedKeys,
  idPrefix,
  onTagClick,
}) {
  return (
    <Box>
      <Typography
        variant="overline"
        component="p"
        sx={{ color: "text.primary", display: "block", mb: 0.5 }}
      >
        {label}
      </Typography>
      {tagKeys.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
          {emptyLabel}
        </Typography>
      ) : (
        <TagRow
          facetKey={facetKey}
          tagKeys={tagKeys}
          matchedKeys={matchedKeys}
          idPrefix={idPrefix}
          onTagClick={onTagClick}
        />
      )}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.problem A data/fixtures.js-shaped FixtureProblem
 *   (name, slug, tags.<facetKey>[]).
 * @param {Object} [props.matchedTags] `{ [facetKey]: Set<optionKey> }` --
 *   which of this card's own tags match the currently active filters, in the
 *   same `Set`-valued shape FacetSidebar's `selected` prop already uses --
 *   now for every taxonomy facet, not just the three rendered by default
 *   (#70), since a non-empty set for any other facet is also what triggers
 *   this card to add that facet's own row. The card only ever reads this
 *   prop; it never looks at filter state itself (issue body, "The
 *   matched-tag treatment"), which keeps it reusable and easy to test.
 * @param {(facetKey: string, optionKey: string) => void} [props.onTagClick]
 *   T57 (#132): called when any chip on this card is clicked -- base row,
 *   labeled Solvers/Visualizations section, or a filter-triggered extra row
 *   alike. The caller (pages/index.js) is expected to toggle that option in
 *   its own facet-selection state, the same state FacetSidebar's checkboxes
 *   already write to; this component never touches that state itself, it
 *   only reports the click. Omit to render every chip non-interactive, same
 *   as before this task.
 */
export default function ProblemCatalogCard({ problem, matchedTags = {}, onTagClick }) {
  const complete = isProblemComplete(problem);
  const idPrefix = `problem-card-${problem.slug}`;

  // #70: a facet outside the base row / labeled sections gets a row added
  // only once a filter for it is active (a non-empty matched set) -- every
  // card on screen already matches every active facet selection (pages/
  // index.js's matchesSelectedFacets), so there's always a real tag to show.
  // T58 (#133): solverType/visualizationType are excluded here too -- they
  // already have their own always-visible labeled section below, so an
  // active filter on either must never add a second, duplicate row.
  const extraFacetKeys = TAXONOMY.map((facet) => facet.key).filter(
    (facetKey) =>
      !BASE_BADGE_FACET_KEYS.includes(facetKey) &&
      !LABELED_FACET_KEYS.includes(facetKey) &&
      (matchedTags[facetKey]?.size ?? 0) > 0,
  );

  return (
    <Paper
      id={`problem-card-${problem.slug}`}
      aria-label={problem.name}
      {...(complete
        ? { component: Link, href: `/${encodeURIComponent(problem.name)}` }
        : { component: "div" })}
      sx={{
        display: "block",
        p: 2,
        borderRadius: 3,
        color: "inherit",
        textDecoration: "none",
        cursor: complete ? "pointer" : "default",
        opacity: complete ? 1 : 0.55,
        borderStyle: complete ? "solid" : "dashed",
        transition: "border-color 0.15s ease",
        "&:hover": complete ? { borderColor: "primary.light" } : undefined,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1.5 }}>
        <Typography
          component="h3"
          variant="h2"
          sx={{
            flexGrow: 1,
            display: "-webkit-box",
            overflow: "hidden",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            minHeight: "calc(1.3em * 2)",
            fontSize: "1.0625rem",
            lineHeight: 1.3,
            textTransform: "uppercase",
          }}
        >
          {problem.name}
        </Typography>
        {hasRenderableVisualization(problem) ? (
          <MonitorIcon
            titleAccess="Has a renderable visualization"
            fontSize="small"
            sx={{ color: "text.secondary", flexShrink: 0 }}
          />
        ) : null}
        <StatusIcon problem={problem} />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {BASE_BADGE_FACET_KEYS.map((facetKey) => (
          <TagRow
            key={facetKey}
            facetKey={facetKey}
            tagKeys={tagValueAsArray(problem.tags?.[facetKey])}
            matchedKeys={matchedTags[facetKey] ?? EMPTY_SET}
            idPrefix={idPrefix}
            onTagClick={onTagClick}
          />
        ))}
        {extraFacetKeys.map((facetKey) => (
          <TagRow
            key={facetKey}
            facetKey={facetKey}
            tagKeys={tagValueAsArray(problem.tags?.[facetKey])}
            matchedKeys={matchedTags[facetKey] ?? EMPTY_SET}
            idPrefix={idPrefix}
            onTagClick={onTagClick}
          />
        ))}
        {LABELED_FACET_ROWS.map(({ facetKey, label, emptyLabel }) => (
          <LabeledFacetSection
            key={facetKey}
            facetKey={facetKey}
            label={label}
            emptyLabel={emptyLabel}
            tagKeys={tagValueAsArray(problem.tags?.[facetKey])}
            matchedKeys={matchedTags[facetKey] ?? EMPTY_SET}
            idPrefix={idPrefix}
            onTagClick={onTagClick}
          />
        ))}
      </Box>
    </Paper>
  );
}
