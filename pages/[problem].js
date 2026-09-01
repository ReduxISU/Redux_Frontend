// pages/[problem].js
//
// T19 (#28) — Detail shell: NavBar, Breadcrumb, the problem H1, its
// one-line description, a complexity + problem type badge row, a hairline
// divider, then ProblemDetailLayout (T18/#27)'s five draggable sections.
//
// Route sits at the top level (`/{slug}`, not `/catalog/{slug}`) per
// ARCHITECTURE.md's Directory / Route Structure section — this project's
// only job is the catalog. Resolves against data/fixtures.js's `slug`
// field, not the raw display name: ProblemCatalogCard already links to
// `/${problem.slug}` (e.g. "/3-sat"), so matching on slug is what makes a
// card's own link actually land here.
//
// No getStaticProps/getStaticPaths — same plain-fixture-import pattern as
// pages/index.js. useRouter().query.problem resolves once the router is
// ready; nothing here fetches data server-side (T26 is the real-data
// wiring task; this page stays a one-line swap away from it per T09's
// fixture-shape contract).
//
// Per #6 item 4 / components/StatusIcon.js's isProblemComplete(): an
// "incomplete" (grey-status) problem's detail page is unreachable by
// direct URL, not just hidden from the card grid (TASKLIST.md's T13 entry:
// "the detail page is not accessible (by URL either)"). So a slug that
// resolves to a real but incomplete fixture renders the same not-found
// state as an unknown slug, rather than a half-declared page.

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/router";
import Breadcrumb from "../components/Breadcrumb";
import NavBar from "../components/NavBar";
import ProblemDetailLayout from "../components/ProblemDetailLayout";
import { isProblemComplete } from "../components/StatusIcon";
import { getFixtureProblemBySlug } from "../data/fixtures";
import { TAXONOMY } from "../data/taxonomy";

// Badge row order per the mockup (NP-Complete, NP, Boolean Logic): complexity
// badges first, then problem type. Same chip-family naming as
// ProblemCatalogCard's BADGE_ROWS (components/theme.js's BADGE_FAMILIES) so
// the colors match the card the visitor clicked through from — but always
// outlined here, since a detail page has no "matched active filter" concept.
const BADGE_ROWS = [
  { facetKey: "complexityClass", chipFamily: "complexity" },
  { facetKey: "problemType", chipFamily: "problemType" },
];

const TAXONOMY_BY_KEY = new Map(TAXONOMY.map((facet) => [facet.key, facet]));

function optionLabel(facetKey, optionKey) {
  const option = TAXONOMY_BY_KEY.get(facetKey)?.options.find((candidate) => {
    return candidate.key === optionKey;
  });
  return option?.label ?? optionKey;
}

function PageShell({ children }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NavBar />
      {children}
    </Box>
  );
}

function NotFound() {
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
          Problem not found
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 480 }}>
          There&rsquo;s no catalogued problem at this address. It may not exist, or its details
          aren&rsquo;t fully declared yet.
        </Typography>
        <Box
          id="not-found-home-link"
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

export default function ProblemDetail() {
  const router = useRouter();
  const { problem: slug } = router.query;

  // Before the router hydrates, `query` is empty on every route — render
  // just the chrome rather than guessing, so a fast unknown-slug flash never
  // briefly shows the not-found state for a slug that's actually valid.
  if (!router.isReady) {
    return <PageShell />;
  }

  const problem = typeof slug === "string" ? getFixtureProblemBySlug(slug) : null;

  if (!problem || !isProblemComplete(problem)) {
    return <NotFound />;
  }

  return (
    <PageShell>
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          px: { xs: 3, sm: 5 },
          py: 4,
        }}
      >
        <Box>
          <Breadcrumb problemName={problem.name} />
          <Typography variant="h1" component="h1">
            {problem.name}
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mt: 0.5 }}>
            {problem.oneLiner}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1.5 }}>
            {BADGE_ROWS.flatMap(({ facetKey, chipFamily }) =>
              (problem.tags[facetKey] ?? []).map((optionKey) => (
                <Chip
                  key={`${facetKey}-${optionKey}`}
                  size="small"
                  variant={`${chipFamily}Outlined`}
                  label={optionLabel(facetKey, optionKey)}
                />
              )),
            )}
          </Box>
        </Box>

        <Box sx={{ borderBottom: "1px solid", borderColor: "divider" }} />

        <ProblemDetailLayout problem={problem} />
      </Box>
    </PageShell>
  );
}
