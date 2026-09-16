// pages/compare.js
//
// #149 — "Problem comparison view": 2-3 problems side by side, each in its
// own ComparisonColumn (Overview, Solvers, Verifier), so a visitor can
// answer "why is CLIQUE harder than SPSP" without flipping between two
// separate detail pages (issue body).
//
// The selected problems live in the URL (`?problems=A,B,C`, encoded by
// lib/compareQuery.js), not in page state passed down from Home — the issue
// asks for this page to be "itself linkable/shareable," and pages/index.js's
// own "Compare (N)" bar already builds exactly that URL. That also means
// this page works from a cold load / a pasted link with no Home visit at
// all, same as pages/[problem].js already does for a single problem.
//
// Always calls useProblemDetail() exactly MAX_COMPARE_PROBLEMS (3) times,
// never a variable number keyed off `names.length` — React's rules of hooks
// don't allow a hook call count that changes across renders, and the number
// of names in the URL can change (a visitor edits the query string, or
// pages/index.js's bar links here with 2 vs. 3). Slots beyond `names.length`
// pass `null`, which useProblemDetail's own header already documents as a
// safe no-op (`problem` stays `null`, `loading` becomes `false`, no fetch)
// rather than a case this page needs to special-case itself.
//
// Edge cases (issue body's "Handle the edge cases plainly"):
//   - Fewer than 2 names (nothing shared, a stray `/compare` visit, or a
//     hand-edited URL with 0-1 names) -> NothingToCompare, not a blank page.
//   - An unknown name -> that one column says so (ComparisonColumn's own
//     "No catalogued problem named ... was found"); the other column(s)
//     still render normally, this page never fails all-or-nothing over one
//     bad name.
//   - Still loading -> that column shows a progress bar in place of its
//     sections (ComparisonColumn), same "render just this column's chrome
//     rather than guessing" idea pages/[problem].js uses for the whole page.
//   - A hand-edited URL naming more than MAX_COMPARE_PROBLEMS ->
//     parseCompareNames silently caps it at 3 rather than growing a fourth
//     column or erroring.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo } from "react";
import ComparisonColumn from "../components/ComparisonColumn";
import NavBar from "../components/NavBar";
import { optionLabel } from "../data/taxonomy";
import { useProblemDetail } from "../hooks/useProblemDetail";
import { MIN_COMPARE_PROBLEMS, parseCompareNames } from "../lib/compareQuery";
import { REDUX_API_BASE_URL } from "../lib/redux";

function PageShell({ children }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NavBar />
      {children}
    </Box>
  );
}

function NothingToCompare() {
  return (
    <PageShell>
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          px: 3,
          textAlign: "center",
        }}
      >
        <Typography variant="h1" component="h1">
          Nothing to compare yet
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 480 }}>
          Pick at least two problems on Home (their &ldquo;Compare&rdquo; checkbox) to see them side
          by side here.
        </Typography>
        <Box
          id="compare-nothing-home-link"
          component={Link}
          href="/"
          sx={{ color: "primary.main", fontWeight: 600, mt: 1 }}
        >
          Back to Home
        </Box>
      </Box>
    </PageShell>
  );
}

// #149's optional nice-to-have (issue body: "highlight any direct reduction
// edge between the compared problems"). Reads each loaded column's own
// `problem.reductions.to`/`.from` -- already built by useProblemDetail
// against every problem's REAL reduction edges, so this only has to check
// whether the OTHER end of an edge is also one of the compared names, not
// fetch or re-derive anything.
function formatReductionNote(direction, otherName, edge) {
  const parts = [];
  if (edge.cost) parts.push(optionLabel("reductionCost", edge.cost));
  if (edge.type) parts.push(optionLabel("reductionType", edge.type));
  const detail = parts.length > 0 ? ` (${parts.join(", ")})` : "";
  return direction === "to"
    ? `Reduces to ${otherName}${detail}`
    : `Reduces from ${otherName}${detail}`;
}

/**
 * @param {{name: string, problem: Object|null}[]} loadedColumns Columns
 *   whose fetch has actually resolved to a real problem -- loading/error/
 *   not-found columns contribute no edges and are excluded by the caller.
 * @returns {Map<string, string[]>} problem name -> plain-text notes.
 */
function buildRelatedNotes(loadedColumns) {
  const notesByName = new Map();
  for (const column of loadedColumns) {
    const notes = [];
    for (const other of loadedColumns) {
      if (other.name === column.name) continue;
      for (const edge of column.problem.reductions?.to ?? []) {
        if (edge.target === other.name) notes.push(formatReductionNote("to", other.name, edge));
      }
      for (const edge of column.problem.reductions?.from ?? []) {
        if (edge.source === other.name) notes.push(formatReductionNote("from", other.name, edge));
      }
    }
    notesByName.set(column.name, notes);
  }
  return notesByName;
}

export default function ComparePage() {
  const router = useRouter();
  const rawProblems = router.query.problems;
  const names = useMemo(
    () => parseCompareNames(typeof rawProblems === "string" ? rawProblems : undefined),
    [rawProblems],
  );

  const [nameA = null, nameB = null, nameC = null] = names;
  const columnA = useProblemDetail(REDUX_API_BASE_URL, nameA);
  const columnB = useProblemDetail(REDUX_API_BASE_URL, nameB);
  const columnC = useProblemDetail(REDUX_API_BASE_URL, nameC);

  const columns = [
    { name: nameA, ...columnA },
    { name: nameB, ...columnB },
    { name: nameC, ...columnC },
  ].filter((column) => column.name);

  // Not memoized: at most 3 columns, so the cross-check below is a handful
  // of comparisons -- cheap enough that recomputing it every render is
  // simpler than a useMemo whose only real inputs (each column's `problem`)
  // already change on the same renders that would invalidate it anyway.
  const relatedNotesByName = buildRelatedNotes(columns.filter((column) => column.problem));

  // Before the router hydrates, `query` is empty on every route -- render
  // just the chrome rather than guessing "nothing to compare" for a URL
  // that, once ready, would have named two real problems. Same reasoning as
  // pages/[problem].js's own `!router.isReady` check.
  if (!router.isReady) {
    return <PageShell />;
  }

  if (names.length < MIN_COMPARE_PROBLEMS) {
    return <NothingToCompare />;
  }

  return (
    <PageShell>
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          px: { xs: 3, sm: 5 },
          py: 4,
        }}
      >
        <Box>
          <Typography variant="h1" component="h1">
            Compare Problems
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mt: 0.5 }}>
            {names.join(" vs. ")}
          </Typography>
        </Box>

        {/* T28's own `md` breakpoint (900px) -- same one
            components/detail/SolversSection.js's rail/pane split and
            pages/index.js's sidebar-to-drawer collapse both already use, so
            this page picks up the one responsive convention this project
            has rather than a new number (issue instruction: "check
            SolversSection.js's header comment for the pattern this project
            already uses, and follow the same breakpoint"). */}
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3 }}>
          {columns.map((column) => (
            <ComparisonColumn
              key={column.name}
              problemName={column.name}
              problem={column.problem}
              loading={column.loading}
              error={column.error}
              relatedNotes={relatedNotesByName.get(column.name) ?? []}
            />
          ))}
        </Box>
      </Box>
    </PageShell>
  );
}
