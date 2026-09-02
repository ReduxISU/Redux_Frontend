// components/ProblemCatalogCard.js
//
// T12 (#16) — one card in the Home page grid: problem name, status icon, and
// three rows of derived tag badges (Complexity, Solver Type, Problem Type).
//
// The whole card is a link to the problem's detail page (`/${problem.slug}`,
// ARCHITECTURE.md's top-level route structure) -- but only when the problem
// is complete. #6 item 4 (2026-08-31) ratifies that an incomplete problem's
// detail page must not be reachable at all, so #16's 2026-08-31 comment
// requires an incomplete card to render as genuinely non-interactive: not a
// link, not a tab stop, visibly distinct -- not a link that swallows the
// click. isProblemComplete() (components/StatusIcon.js) is the one place
// that predicate lives; this file imports it rather than re-deriving "has a
// solver/visualization/verifier" on its own.
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
// #70: BASE_BADGE_FACET_KEYS (complexityClass/solverType/problemType) always
// render, same as before. Any OTHER taxonomy facet gets its own row added
// on top, but only once `matchedTags` says a filter for it is active --
// pages/index.js only ever shows problems matching every active facet
// selection (matchesSelectedFacets), so a card that's on screen at all
// already has a tag for that facet worth showing. Rows use the same
// TagRow/Chip-variant treatment either way, so an added row looks exactly
// like a default one whose filter is selected (issue body).

import CheckIcon from "@mui/icons-material/Check";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { TAXONOMY } from "../data/taxonomy";
import StatusIcon, { isProblemComplete } from "./StatusIcon";

const EMPTY_SET = new Set();

// Row order per the issue body. Each row's Chip-variant family is now just
// its own facetKey (theme.js's per-facet chip variants, #70) -- so a facet
// outside this base list can reuse the exact same TagRow with no extra
// mapping.
const BASE_BADGE_FACET_KEYS = ["complexityClass", "solverType", "problemType"];

const TAXONOMY_BY_KEY = new Map(TAXONOMY.map((facet) => [facet.key, facet]));

function optionLabel(facetKey, optionKey) {
  const option = TAXONOMY_BY_KEY.get(facetKey)?.options.find((candidate) => {
    return candidate.key === optionKey;
  });
  return option?.label ?? optionKey;
}

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

function TagRow({ facetKey, tagKeys, matchedKeys }) {
  if (!tagKeys || tagKeys.length === 0) {
    return null;
  }
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
      {tagKeys.map((optionKey) => {
        const matched = matchedKeys.has(optionKey);
        return (
          <Chip
            key={optionKey}
            size="small"
            variant={matched ? `${facetKey}Filled` : `${facetKey}Outlined`}
            icon={matched ? <CheckIcon /> : undefined}
            label={optionLabel(facetKey, optionKey)}
          />
        );
      })}
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
 */
export default function ProblemCatalogCard({ problem, matchedTags = {} }) {
  const complete = isProblemComplete(problem);

  // #70: a facet outside the base three gets a row added only once a filter
  // for it is active (a non-empty matched set) -- every card on screen
  // already matches every active facet selection (pages/index.js's
  // matchesSelectedFacets), so there's always a real tag to show.
  const extraFacetKeys = TAXONOMY.map((facet) => facet.key).filter(
    (facetKey) =>
      !BASE_BADGE_FACET_KEYS.includes(facetKey) && (matchedTags[facetKey]?.size ?? 0) > 0,
  );

  return (
    <Paper
      id={`problem-card-${problem.slug}`}
      aria-label={problem.name}
      {...(complete ? { component: Link, href: `/${problem.slug}` } : { component: "div" })}
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
        <StatusIcon problem={problem} />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {BASE_BADGE_FACET_KEYS.map((facetKey) => (
          <TagRow
            key={facetKey}
            facetKey={facetKey}
            tagKeys={tagValueAsArray(problem.tags?.[facetKey])}
            matchedKeys={matchedTags[facetKey] ?? EMPTY_SET}
          />
        ))}
        {extraFacetKeys.map((facetKey) => (
          <TagRow
            key={facetKey}
            facetKey={facetKey}
            tagKeys={tagValueAsArray(problem.tags?.[facetKey])}
            matchedKeys={matchedTags[facetKey] ?? EMPTY_SET}
          />
        ))}
      </Box>
    </Paper>
  );
}
