// pages/index.js
//
// T14 (#18) — the real Home page: NavBar, an H1 + problem-count subtitle,
// full-width search, and a two-column body (FacetSidebar left, result count
// + ProblemGrid right). Filter state (search text + per-facet selected
// option sets) lives here and flows down to FacetSidebar, ActiveFilterChips
// and ProblemGrid's matchedTags together (issue body: "Filter state lives
// here and flows down").
//
// Reads data/fixtures.js's FIXTURE_PROBLEMS directly -- Shell-phase sample
// data (12 problems), not the real ~59-problem backend catalog. Every count
// shown (subtitle, result count, sidebar option counts) is computed from it
// rather than hardcoded, so nothing here needs to change once T25 swaps
// this for the real useCatalogIndex() data.
//
// Filtering: AND across facets, OR within a facet's own selected options,
// search substring-ANDed in on top. Matching is driven by each tag's actual
// runtime shape (Array.isArray), not data/taxonomy.js's `multiValued` flag:
// that file's own shape-contract comment documents that solverComplexity,
// reductionType, reductionCost and visualizationType are all stored as
// arrays at the problem level (aggregated across a problem's several
// solver/reduction/visualization instances) despite being `multiValued:
// false` -- only computationalModel is truly a bare string. Keying off
// `multiValued` instead would silently break OR-matching for those four
// facets. See this task's handback summary.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import ActiveFilterChips from "../components/ActiveFilterChips";
import FacetSidebar from "../components/FacetSidebar";
import NavBar from "../components/NavBar";
import ProblemGrid from "../components/ProblemGrid";
import SearchBar from "../components/SearchBar";
import { thinScrollbarSx } from "../components/theme";
import { FIXTURE_PROBLEMS } from "../data/fixtures";
import { TAXONOMY } from "../data/taxonomy";

// The three facets ProblemCatalogCard actually renders badges for -- the
// only keys its own `matchedTags` prop needs (components/ProblemCatalogCard.js
// BADGE_ROWS). Slicing these out of `selected` keeps the prop's meaning
// ("what should highlight on a card") distinct from the sidebar's full
// 8-facet selection state, even though a card ignores any extra key it
// doesn't render anyway.
const CARD_BADGE_FACETS = ["complexityClass", "solverType", "problemType"];

// #68: 280 was too narrow -- the longest option labels ("Algebra and Number
// Theory", "Logical/Functional Models") wrapped to a second line against
// their checkbox + count. Widened so every option renders on one line.
const SIDEBAR_WIDTH = 340;

function buildEmptySelection() {
  const selection = {};
  for (const facet of TAXONOMY) {
    selection[facet.key] = new Set();
  }
  return selection;
}

// A problem matches a facet's active selection if ANY selected option is
// present in its tag value for that facet -- whether that tag value is one
// array (OR across the array) or a single string (plain equality). A facet
// with nothing selected imposes no constraint.
function matchesSelectedFacets(problem, selected) {
  for (const facet of TAXONOMY) {
    const selectedOptions = selected[facet.key];
    if (!selectedOptions || selectedOptions.size === 0) {
      continue;
    }
    const tagValue = problem.tags[facet.key];
    const matches = Array.isArray(tagValue)
      ? tagValue.some((optionKey) => selectedOptions.has(optionKey))
      : selectedOptions.has(tagValue);
    if (!matches) {
      return false;
    }
  }
  return true;
}

// Sidebar option counts, computed once against the full fixture set rather
// than the currently-filtered results -- "how many problems if I add this
// filter," the common faceted-search convention. TASKLIST.md's T14 entry
// doesn't settle this either way; see this task's handback summary.
function buildFacetOptions(problems) {
  const facetOptions = {};
  for (const facet of TAXONOMY) {
    facetOptions[facet.key] = facet.options.map((option) => {
      const count = problems.filter((problem) => {
        const tagValue = problem.tags[facet.key];
        return Array.isArray(tagValue) ? tagValue.includes(option.key) : tagValue === option.key;
      }).length;
      return { key: option.key, label: option.label, count };
    });
  }
  return facetOptions;
}

function formatResultCount(count, filtersActive) {
  const noun = count === 1 ? "problem" : "problems";
  if (!filtersActive) {
    return `${count} ${noun}`;
  }
  const verb = count === 1 ? "matches" : "match";
  return `${count} ${noun} ${verb} your filters`;
}

export default function Home() {
  const [selected, setSelected] = useState(buildEmptySelection);
  const [searchValue, setSearchValue] = useState("");

  const facetOptions = useMemo(() => buildFacetOptions(FIXTURE_PROBLEMS), []);

  const filtersActive =
    searchValue.trim().length > 0 || Object.values(selected).some((options) => options.size > 0);

  const filteredProblems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return FIXTURE_PROBLEMS.filter((problem) => {
      if (query && !problem.name.toLowerCase().includes(query)) {
        return false;
      }
      return matchesSelectedFacets(problem, selected);
    });
  }, [selected, searchValue]);

  const matchedTags = useMemo(() => {
    const tags = {};
    for (const facetKey of CARD_BADGE_FACETS) {
      tags[facetKey] = selected[facetKey] ?? new Set();
    }
    return tags;
  }, [selected]);

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
            {FIXTURE_PROBLEMS.length} catalogued problems across complexity classes, solvers, and
            visualizations.
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
            />
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {formatResultCount(filteredProblems.length, filtersActive)}
            </Typography>
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ProblemGrid problems={filteredProblems} matchedTags={matchedTags} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
