// pages/index.js
//
// T14 (#18) — the real Home page: NavBar, an H1 + problem-count subtitle,
// full-width search, and a two-column body (FacetSidebar left, result count
// + ProblemGrid right). Filter state (search text + per-facet selected
// option sets) lives here and flows down to FacetSidebar, ActiveFilterChips
// and ProblemGrid's matchedTags together (issue body: "Filter state lives
// here and flows down").
//
// T25 (#34): reads the real backend via useCatalogIndex() (T23/#32) +
// useCatalogFilters() (T24/#33) instead of data/fixtures.js's sample set.
// Filtering/counting logic itself now lives in useCatalogFilters -- this
// file only assembles filter state, the loading/error/empty presentation
// (#5's settled banner decision, quoted below), and the card-shaped objects
// ProblemGrid/ProblemCatalogCard need that useCatalogFilters's plain
// `{name, tags}` results don't carry (see toCardProblem below).
//
// T29 (#38): the loading/error/empty presentation this file's own header
// above already called out is where this task's work lands. Three states
// this page can be in, distinctly worded rather than any of them collapsing
// into another:
//   - loading:  subtitle/result-count text says so (never a number that's
//               about to change), FacetSidebar's counts and ProblemGrid's
//               cards both render as skeletons instead of real-looking-but-
//               about-to-be-wrong content (see those components' own T29
//               comments).
//   - error:    the backend is unreachable -- ErrorBanner (#5), and the
//               subtitle/result-count/grid all say so too, rather than
//               reading like a real "0 results" state once loading flips to
//               false with an empty index.
//   - empty:    backend reachable, genuinely zero problems either in the
//               whole catalog or matching the active filters -- two
//               different messages (buildGridEmptyMessage below), since
//               "no problems in the catalog" and "no problems match your
//               filters" are different situations a visitor shouldn't have
//               to guess between.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import ActiveFilterChips from "../components/ActiveFilterChips";
import ErrorBanner from "../components/ErrorBanner";
import FacetSidebar from "../components/FacetSidebar";
import NavBar from "../components/NavBar";
import ProblemGrid from "../components/ProblemGrid";
import SearchBar from "../components/SearchBar";
import { thinScrollbarSx } from "../components/theme";
import { TAXONOMY } from "../data/taxonomy";
import { useCatalogFilters } from "../hooks/useCatalogFilters";
import { useCatalogIndex } from "../hooks/useCatalogIndex";

// #68: 280 was too narrow -- the longest option labels ("Algebra and Number
// Theory", "Logical/Functional Models") wrapped to a second line against
// their checkbox + count. Widened so every option renders on one line.
const SIDEBAR_WIDTH = 340;

// Same-origin proxy base lib/redux/index.js's own JSDoc documents (keeps
// the real backend origin server-side, pages/api/redux/[...path].js).
const API_BASE_URL = "/api/redux/";

function buildEmptySelection() {
  const selection = {};
  for (const facet of TAXONOMY) {
    selection[facet.key] = new Set();
  }
  return selection;
}

function formatResultCount(count, filtersActive) {
  const noun = count === 1 ? "problem" : "problems";
  if (!filtersActive) {
    return `${count} ${noun}`;
  }
  const verb = count === 1 ? "matches" : "match";
  return `${count} ${noun} ${verb} your filters`;
}

// Home's H1 subtitle. Distinct wording per state (see this file's T29
// comment above) -- in particular, never a bare "0 catalogued problems"
// while `error` is set, which would read as a real empty-catalog result
// rather than the connectivity failure ErrorBanner is already explaining a
// few lines below it.
function buildSubtitleText({ loading, error, catalogSize }) {
  if (loading) {
    return "Loading the problem catalog…";
  }
  if (error) {
    return "The catalog can't load right now.";
  }
  return `${catalogSize} catalogued problems across complexity classes, solvers, and visualizations.`;
}

// The small result-count line directly above the grid. Same reasoning as
// buildSubtitleText -- `error` gets its own wording rather than falling
// through to formatResultCount(0, ...), which would read as "0 problems
// match your filters" even when no filters are active and the real problem
// is that nothing loaded at all.
function buildResultCountText({ loading, error, count, filtersActive }) {
  if (loading) {
    return "Loading…";
  }
  if (error) {
    return "Can't show results right now.";
  }
  return formatResultCount(count, filtersActive);
}

// ProblemGrid's empty-state message once loading has finished and the
// backend is reachable -- distinguishes a genuinely empty catalog (issue
// body: "Empty catalog... Write the wording for that state") from filters
// that happen to match nothing, since a first-time visitor with no filters
// selected seeing "no problems match your filters" would have no filters to
// blame.
function buildGridEmptyMessage({ error, filtersActive }) {
  if (error) {
    return "No problems to show right now.";
  }
  if (filtersActive) {
    return "No problems match your filters.";
  }
  return "No problems in the catalog yet.";
}

// Id-safe stand-in for the fixture-only `slug` field ProblemCatalogCard uses
// for its own `key`/`id` -- not a routing target. Card navigation itself
// targets the real problem's display name (`/${encodeURIComponent(name)}`),
// matching how T26 (#35)'s pages/[problem].js resolves the route param
// against the real backend, which has no slug concept of its own.
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// useCatalogFilters's `results` are plain `{name, tags}` pairs (T24/#33's
// own header: it doesn't know about slugs or completeness). This assembles
// the rest of what ProblemCatalogCard/StatusIcon need: an id-safe slug, and
// presence-only stand-ins for StatusIcon's solvers/visualizations/verifier
// length/null checks, sourced from useCatalogIndex's `completeness` map
// (T25/#34's addition to T23) rather than the fixture's full detail arrays,
// which the catalog-index hook never fetches.
function toCardProblem(result, completeness) {
  const flags = completeness.get(result.name) ?? {};
  return {
    name: result.name,
    slug: slugify(result.name),
    tags: result.tags,
    solvers: flags.hasSolver ? [true] : [],
    visualizations: flags.hasVisualization ? [true] : [],
    verifier: flags.hasVerifier ? {} : null,
  };
}

export default function Home() {
  const [selected, setSelected] = useState(buildEmptySelection);
  const [searchValue, setSearchValue] = useState("");

  const { index, completeness, loading, error } = useCatalogIndex(API_BASE_URL);
  const { results, facetOptions, matchedTags } = useCatalogFilters(index, {
    selected,
    searchValue,
  });

  const filtersActive =
    searchValue.trim().length > 0 || Object.values(selected).some((options) => options.size > 0);

  const problems = useMemo(
    () => results.map((result) => toCardProblem(result, completeness)),
    [results, completeness],
  );

  const handleFacetChange = (facetKey, nextSet) => {
    setSelected((prev) => ({ ...prev, [facetKey]: nextSet }));
  };

  const handleRemoveChip = (facetKey, optionKey) => {
    setSelected((prev) => {
      const next = new Set(prev[facetKey]);
      next.delete(optionKey);
      return { ...prev, [facetKey]: next };
    });
  };

  const handleClearAll = () => {
    setSelected(buildEmptySelection());
    setSearchValue("");
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <NavBar />
      <Box
        component="main"
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          px: { xs: 3, sm: 5 },
          py: 4,
        }}
      >
        <Box>
          <Typography variant="h1" component="h1">
            Home
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mt: 0.5 }}>
            {buildSubtitleText({ loading, error, catalogSize: index.size })}
          </Typography>
        </Box>

        {/* #69: search bar and the "Filtering by" row share one tight
            inner gap, separate from the outer section gap above/below this
            block. ActiveFilterChips renders null when nothing is selected
            (#19), so this Box collapses to just the search bar and no gap
            is spent on it -- the only vertical space filtering adds is the
            chips row's own height, not a second full section gap. */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          <SearchBar value={searchValue} onChange={setSearchValue} />

          <ActiveFilterChips
            selected={selected}
            onRemove={handleRemoveChip}
            onClearAll={handleClearAll}
          />
        </Box>

        {/* #5's settled decision: full width, beneath the search bar,
            above the sidebar-and-results row, not dismissible -- it clears
            itself as soon as a request succeeds. */}
        {error ? <ErrorBanner /> : null}

        <Box sx={{ flex: 1, minHeight: 0, display: "flex", gap: 4 }}>
          {/* #68: the one scrollbar for the whole filter panel -- expanded
              facet groups render every option in full (FacetSidebar no
              longer caps/scrolls internally), so this is the only way the
              sidebar scrolls. */}
          <Box
            sx={{
              width: SIDEBAR_WIDTH,
              flexShrink: 0,
              overflowY: "auto",
              pr: 1,
              ...thinScrollbarSx,
            }}
          >
            <FacetSidebar
              facetOptions={facetOptions}
              selected={selected}
              onChange={handleFacetChange}
              onClearFilters={handleClearAll}
              loading={loading}
            />
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {buildResultCountText({ loading, error, count: problems.length, filtersActive })}
            </Typography>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ProblemGrid
                problems={problems}
                matchedTags={matchedTags}
                loading={loading}
                emptyMessage={buildGridEmptyMessage({ error, filtersActive })}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
