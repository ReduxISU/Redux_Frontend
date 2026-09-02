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
//
// T30 (#39): `id="home-subtitle"`/`id="home-result-count"` added to the two
// dynamic-text Typography elements below so tests/e2e/home.spec.js can read
// the real, currently-displayed counts (never a hardcoded one, per that
// issue's done-when) instead of scraping for a number inside less specific
// text.

import CloseIcon from "@mui/icons-material/Close";
import TuneIcon from "@mui/icons-material/Tune";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useMemo, useState } from "react";
import ActiveFilterChips from "../components/ActiveFilterChips";
import ErrorBanner from "../components/ErrorBanner";
import FacetSidebar from "../components/FacetSidebar";
import NavBar from "../components/NavBar";
import ProblemGrid from "../components/ProblemGrid";
import SearchBar from "../components/SearchBar";
import StartupSplash from "../components/StartupSplash";
import { thinScrollbarSx } from "../components/theme";
import { TAXONOMY } from "../data/taxonomy";
import { useCatalogFilters } from "../hooks/useCatalogFilters";
import { useCatalogIndex } from "../hooks/useCatalogIndex";

// #68: 280 was too narrow -- the longest option labels ("Algebra and Number
// Theory", "Logical/Functional Models") wrapped to a second line against
// their checkbox + count. Widened so every option renders on one line.
const SIDEBAR_WIDTH = 340;

// T28 (#37): below this width the sidebar can't hold a fixed 340px column
// next to a usable results area (at 768px, 340px + even a single comfortable
// card column doesn't fit), so it moves behind a "Filters" drawer instead --
// same breakpoint components/detail/OverviewSection.js already uses to
// stack its two side-by-side cards, kept consistent rather than picking a
// second, unrelated number. `md` is MUI's 900px default.
//
// This has to be a real JS media query (useMediaQuery below), not just a
// CSS `display` toggle: FacetSidebar's checkbox/toggle ids are static
// (`facet-${key}-option-${key}`, ground rule 4), so mounting both the fixed
// column and the drawer's copy at once -- one merely hidden with
// `display: none` -- would put two elements with the same id in the DOM
// simultaneously, invalid HTML and exactly the kind of collision that rule
// exists to prevent. Gating which one actually *mounts* keeps it to one.
const SIDEBAR_BREAKPOINT = "md";

// MUI's Drawer (built on Modal) already provides everything the "narrow
// widths" issue asks of it: Escape closes it, focus is trapped inside while
// open, and focus returns to the trigger button on close -- so none of that
// is custom code here, just configuration.
const FILTERS_DRAWER_ID = "home-filters-drawer";

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
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  const theme = useTheme();
  // Defaults to `false` (narrow) on the server and on first client render,
  // matching Next.js SSR having no real viewport to measure -- see the
  // SIDEBAR_BREAKPOINT comment above for why this has to gate mounting
  // rather than just CSS visibility.
  const isWideLayout = useMediaQuery(theme.breakpoints.up(SIDEBAR_BREAKPOINT));

  const { index, completeness, loading, error } = useCatalogIndex(API_BASE_URL);
  const { results, facetOptions, matchedTags } = useCatalogFilters(index, {
    selected,
    searchValue,
  });

  const activeFilterCount = Object.values(selected).reduce((sum, options) => sum + options.size, 0);
  const filtersActive = searchValue.trim().length > 0 || activeFilterCount > 0;

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
      {/* T43 (#65): the startup animation. Mounted alongside the real page
          rather than in place of it -- everything below renders and loads
          normally underneath while the overlay plays on top, so a visitor
          using a screen reader (the overlay is aria-hidden), a visitor who
          has asked for reduced motion, and a return visit within the same
          session all get Home exactly as they would if this component
          weren't here. `ready` is the catalog fetch settling, either way:
          see the component's own header for why that, and not a probe of
          /api/health, is the backend signal it fades on. */}
      <StartupSplash ready={!loading} />
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
          <Typography id="home-subtitle" variant="body1" sx={{ color: "text.secondary", mt: 0.5 }}>
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

        {/* T28 (#37): the drawer trigger only exists below SIDEBAR_BREAKPOINT
            -- above it the fixed sidebar column is already visible, so a
            button that opens a drawer holding a second copy of it would be
            redundant chrome with nothing to do. */}
        {!isWideLayout && (
          <Box>
            <Button
              id="home-filters-drawer-trigger"
              variant="outlined"
              startIcon={<TuneIcon fontSize="small" />}
              aria-haspopup="dialog"
              aria-controls={FILTERS_DRAWER_ID}
              aria-expanded={filtersDrawerOpen}
              onClick={() => setFiltersDrawerOpen(true)}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
          </Box>
        )}

        <Drawer
          anchor="left"
          open={filtersDrawerOpen && !isWideLayout}
          onClose={() => setFiltersDrawerOpen(false)}
          slotProps={{
            paper: {
              id: FILTERS_DRAWER_ID,
              role: "dialog",
              "aria-modal": true,
              "aria-label": "Filter problems",
              sx: {
                width: { xs: "85vw", sm: 360 },
                maxWidth: 360,
                p: 2.5,
                overflowY: "auto",
                ...thinScrollbarSx,
              },
            },
          }}
        >
          <Box
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}
          >
            <Typography variant="h2" component="h2" sx={{ fontSize: "1.0625rem" }}>
              Filters
            </Typography>
            <IconButton
              id="home-filters-drawer-close"
              aria-label="Close filters"
              onClick={() => setFiltersDrawerOpen(false)}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <FacetSidebar
            facetOptions={facetOptions}
            selected={selected}
            onChange={handleFacetChange}
            onClearFilters={handleClearAll}
            loading={loading}
          />
        </Drawer>

        <Box sx={{ flex: 1, minHeight: 0, display: "flex", gap: 4 }}>
          {/* #68: the one scrollbar for the whole filter panel -- expanded
              facet groups render every option in full (FacetSidebar no
              longer caps/scrolls internally), so this is the only way the
              sidebar scrolls.
              T28 (#37): only mounted at/above SIDEBAR_BREAKPOINT -- the
              Drawer above is the narrow-width equivalent, and only one of
              the two is ever mounted at a time (see isWideLayout's comment),
              so there's never two copies of the same filter controls (and
              their duplicate ids) in the DOM together. */}
          {isWideLayout && (
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
          )}

          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography id="home-result-count" variant="body2" sx={{ color: "text.secondary" }}>
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
