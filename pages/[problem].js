// pages/[problem].js
//
// T19 (#28) — Detail shell: NavBar, Breadcrumb, the problem H1, its
// one-line description, a complexity + problem type badge row, a hairline
// divider, then ProblemDetailLayout (T18/#27)'s five draggable sections.
//
// Route sits at the top level (`/{slug}`, not `/catalog/{slug}`) per
// ARCHITECTURE.md's Directory / Route Structure section — this project's
// only job is the catalog.
//
// T26 (#35) real-data wiring: the route segment is the problem's real
// display name (e.g. "3SAT" resolves against Navigation/Batch/allInfo's
// `problemName` field via useProblemDetail), not a fixture-only `slug` --
// the real backend has no slug concept (confirmed: no field on IProblem
// resembles one). Next.js decodes the route segment automatically, so a
// name with spaces or punctuation arrives here already readable; nothing
// further needs decoding. ProblemCatalogCard's own link generation
// (currently `/${problem.slug}` against fixture data) is T25's concern, not
// this page's -- until T25 lands, Home's card links and this resolution
// step are built from two different data sources, a known transient gap
// (see this task's handback summary).
//
// No getStaticProps/getStaticPaths. useRouter().query.problem resolves once
// the router is ready; useProblemDetail then fetches client-side.
//
// Per #6 item 4 / components/StatusIcon.js's isProblemComplete(): an
// "incomplete" (grey-status) problem's detail page is unreachable by
// direct URL, not just hidden from the card grid (TASKLIST.md's T13 entry:
// "the detail page is not accessible (by URL either)"). So a name that
// resolves to a real but incomplete problem renders the same not-found
// state as an unknown name, rather than a half-declared page.
//
// T29 (#38): a backend error used to fold into that same not-found state
// (see this file's earlier revision) -- as of this task it doesn't. A
// fetch failure and "this name genuinely isn't a real problem" are
// different situations (one says try again later, the other says check the
// URL), and #5's site-wide banner decision applies here exactly as it does
// on Home: BackendUnreachable below renders ErrorBanner instead of
// asserting a "not found" claim the page has no actual basis for while the
// backend is unreachable. Checked before the not-found branch so a real
// fetch failure never gets misreported as "no such problem."

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/router";
import Breadcrumb from "../components/Breadcrumb";
import ErrorBanner from "../components/ErrorBanner";
import NavBar from "../components/NavBar";
import ProblemDetailLayout from "../components/ProblemDetailLayout";
import { isProblemComplete } from "../components/StatusIcon";
import { TAXONOMY } from "../data/taxonomy";
import { useProblemDetail } from "../hooks/useProblemDetail";
import { REDUX_API_BASE_URL } from "../lib/redux";

// Badge row order per the mockup (NP-Complete, NP, Boolean Logic): complexity
// badges first, then problem type. Chip variant is keyed straight off
// facetKey (`${facetKey}Outlined`), same as ProblemCatalogCard's TagRow
// (components/theme.js registers one outlined/filled pair per facet.key) so
// the colors match the card the visitor clicked through from — but always
// outlined here, since a detail page has no "matched active filter" concept.
const BADGE_FACET_KEYS = ["complexityClass", "problemType"];

const TAXONOMY_BY_KEY = new Map(TAXONOMY.map((facet) => [facet.key, facet]));

function optionLabel(facetKey, optionKey) {
  const option = TAXONOMY_BY_KEY.get(facetKey)?.options.find((candidate) => {
    return candidate.key === optionKey;
  });
  return option?.label ?? optionKey;
}

// T29 (#38): `loading` renders a thin indeterminate bar under NavBar --
// this page's own longstanding "render just the chrome rather than guessing"
// choice (see the ProblemDetail component below) already avoids showing any
// wrong content while a fetch is in flight; this only adds a quiet signal
// that something's happening, without changing what that choice guesses.
function PageShell({ children, loading = false }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NavBar />
      {loading && <LinearProgress aria-label="Loading problem" />}
      {children}
    </Box>
  );
}

// T29 (#38): distinct from NotFound -- see this file's header comment for
// why a fetch failure doesn't get folded into "no such problem" any more.
function BackendUnreachable() {
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
        <ErrorBanner />
      </Box>
    </PageShell>
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
  const { problem: routeProblemName } = router.query;

  const { problem, loading, error } = useProblemDetail(
    REDUX_API_BASE_URL,
    typeof routeProblemName === "string" ? routeProblemName : null,
  );

  // Before the router hydrates, `query` is empty on every route, and while
  // useProblemDetail's fetch is still in flight — render just the chrome
  // rather than guessing in either case, so a fast unknown-name flash never
  // briefly shows the not-found state for a name that's actually valid, and
  // the page never briefly shows a wrong/empty detail view either.
  if (!router.isReady || loading) {
    // `loading={router.isReady}`: this branch is only reached when the
    // router isn't ready yet OR the fetch is in flight -- passing
    // router.isReady through means the progress bar shows in exactly the
    // second case (a real fetch actually happening), not during the
    // pre-hydration moment where nothing's known well enough yet to say
    // "loading" truthfully.
    return <PageShell loading={router.isReady} />;
  }

  // T29 (#38): checked before the not-found branch -- see this file's
  // header comment for why a fetch failure isn't "no such problem."
  if (error) {
    return <BackendUnreachable />;
  }

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
            {BADGE_FACET_KEYS.flatMap((facetKey) =>
              (problem.tags[facetKey] ?? []).map((optionKey) => (
                <Chip
                  key={`${facetKey}-${optionKey}`}
                  size="small"
                  variant={`${facetKey}Outlined`}
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
