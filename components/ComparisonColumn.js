// components/ComparisonColumn.js
//
// #149 — one problem's column on the comparison page (pages/compare.js): a
// small header (name, badges, one-liner, any direct-reduction note to
// another compared problem), then the same Overview/Solvers/Verifier
// section components pages/[problem].js uses, stacked instead of
// drag-reorderable.
//
// Deliberately NOT components/ProblemDetailLayout.js. That component owns
// two things this page can't share across columns: section drag-reorder
// (meaningless once three independent columns exist side by side -- there's
// no single "order" to persist), and a single shared problem instance
// (T35/#93's whole point there is that Solvers and Verifier are showing the
// SAME problem, so a certificate is always checked against the instance
// that was solved). Neither holds here: each column is a DIFFERENT problem,
// with its own instance format, so this component owns its own `instance`
// state instead of taking one from a parent -- see the file this
// component's caller (pages/compare.js) links to, and #149's own task
// notes, for why sharing one instance across columns would be actively
// wrong (a Set Cover instance is not a valid Clique instance).
//
// No shared Run token either (ProblemDetailLayout.js's `runToken`/
// `onRunRequest`, T48/#111): SolversSection already falls back to solving
// directly when `onRunRequest` is omitted (see that file's own Run button:
// `onClick={() => (onRunRequest ? onRunRequest() : handleRun())}`), so this
// column doesn't need to reimplement that plumbing for a feature (Run
// firing across sections in lockstep) the comparison view never asked for.
//
// Reused verbatim: OverviewSection, SolversSection, VerifierSection. Each
// already degrades gracefully on missing/incomplete data (no solvers, no
// verifier, undocumented overview) instead of crashing, which is exactly
// what an incomplete problem needs here (see ProblemCatalogCard.js's own
// #149 comment for why an incomplete problem is still comparable at all).

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useState } from "react";
import { optionLabel } from "../data/taxonomy";
import OverviewSection from "./detail/OverviewSection";
import SolversSection from "./detail/SolversSection";
import VerifierSection from "./detail/VerifierSection";
import ErrorBanner from "./ErrorBanner";
import { isProblemComplete } from "./StatusIcon";

// Same badge order pages/[problem].js's own H1 badge row uses.
const BADGE_FACET_KEYS = ["complexityClass", "problemType"];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * @param {Object} props
 * @param {string} props.problemName The real problem display name this
 *   column is for -- shown even before/instead of `problem` (loading, not
 *   found), so a visitor always knows which column is which.
 * @param {Object|null} props.problem `useProblemDetail`'s own result --
 *   `null` while loading or when `problemName` matched no real problem.
 * @param {boolean} props.loading
 * @param {Error|null} props.error
 * @param {string[]} [props.relatedNotes] #149's optional nice-to-have:
 *   plain-text notes ("Reduces to CLIQUE (Polynomial)") for any direct
 *   reduction edge between this column's problem and another problem in the
 *   same comparison -- computed by pages/compare.js, which is the only
 *   place that can see every column's data at once.
 */
export default function ComparisonColumn({
  problemName,
  problem,
  loading,
  error,
  relatedNotes = [],
}) {
  const slug = slugify(problemName);

  // Same "adjust state during render when the identity changes" pattern
  // ProblemDetailLayout.js uses for its own shared instance (see that
  // file's header) -- seeds once `problem` actually arrives (it's `null`
  // for the whole loading window), and re-seeds if this column's slot ever
  // gets reassigned to a different problem (pages/compare.js keys each
  // column by name, so in practice this only ever fires once per mount, but
  // written defensively rather than assumed).
  const [instance, setInstance] = useState("");
  const [seededFor, setSeededFor] = useState(null);
  if (problem && seededFor !== problem.name) {
    setSeededFor(problem.name);
    setInstance(problem.defaultInstance ?? "");
  }

  if (loading) {
    return (
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography variant="h2" component="h2" sx={{ fontSize: "1.25rem" }}>
          {problemName}
        </Typography>
        <LinearProgress aria-label={`Loading ${problemName}`} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography variant="h2" component="h2" sx={{ fontSize: "1.25rem" }}>
          {problemName}
        </Typography>
        <ErrorBanner />
      </Box>
    );
  }

  if (!problem) {
    return (
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography variant="h2" component="h2" sx={{ fontSize: "1.25rem" }}>
          {problemName}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
          No catalogued problem named &ldquo;{problemName}&rdquo; was found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      id={`compare-column-${slug}`}
      sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}
    >
      <Box>
        <Typography variant="h2" component="h2" sx={{ fontSize: "1.25rem" }}>
          {isProblemComplete(problem) ? (
            <Box
              id={`compare-column-${slug}-detail-link`}
              component={Link}
              href={`/${encodeURIComponent(problem.name)}`}
              sx={{ color: "inherit" }}
            >
              {problem.name}
            </Box>
          ) : (
            problem.name
          )}
        </Typography>
        {problem.oneLiner && (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
            {problem.oneLiner}
          </Typography>
        )}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}>
          {BADGE_FACET_KEYS.flatMap((facetKey) =>
            (problem.tags?.[facetKey] ?? []).map((optionKey) => (
              <Chip
                key={`${facetKey}-${optionKey}`}
                size="small"
                variant={`${facetKey}Outlined`}
                label={optionLabel(facetKey, optionKey)}
              />
            )),
          )}
        </Box>
        {relatedNotes.length > 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 1 }}>
            {relatedNotes.map((note) => (
              <Typography
                key={note}
                variant="body2"
                sx={{ color: "primary.light", fontWeight: 600 }}
              >
                {note}
              </Typography>
            ))}
          </Box>
        )}
      </Box>

      <OverviewSection problem={problem} />
      <SolversSection problem={problem} instanceValue={instance} onInstanceChange={setInstance} />
      <VerifierSection problem={problem} instanceValue={instance} onInstanceChange={setInstance} />
    </Box>
  );
}
