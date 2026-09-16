// pages/reduction-graph.js
//
// #136 (T61) -- a whole-catalog view of Redux's reduction network: every catalogued
// problem as a node, every reduction between two problems as a directed edge, in the
// spirit of Karp's "Reducibility Among Combinatorial Problems" that pages/aboutus.js
// already cites as this project's inspiration. Layout/library decision recorded as a
// comment on #136 -- see components/ReductionGraphView.js's own header for the full
// reasoning.
//
// The backend fetch lives in useCatalogIndex (client-side, inside a useEffect), the same
// hook Home already uses, so `next build`'s static analysis never needs a live backend --
// this page just reuses its already-computed `reductionGraphByName` rather than fetching
// and re-keying the raw graph a second time.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import ErrorBanner from "../components/ErrorBanner";
import NavBar from "../components/NavBar";
import ReductionGraphView from "../components/ReductionGraphView";
import { useCatalogIndex } from "../hooks/useCatalogIndex";
import { REDUX_API_BASE_URL } from "../lib/redux";

export default function ReductionGraphPage() {
  const { index, reductionGraphByName, loading, error } = useCatalogIndex(REDUX_API_BASE_URL);

  const problemNames = useMemo(
    () => Array.from(index.keys()).sort((a, b) => a.localeCompare(b)),
    [index],
  );

  const edgeCount = useMemo(
    () =>
      Object.values(reductionGraphByName ?? {}).reduce(
        (sum, toMap) =>
          sum + Object.values(toMap).reduce((inner, edges) => inner + edges.length, 0),
        0,
      ),
    [reductionGraphByName],
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <NavBar />
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          px: { xs: 2, sm: 5 },
          py: 4,
          maxWidth: 1400,
          width: "100%",
          mx: "auto",
        }}
      >
        <Typography variant="h1" component="h1">
          Reduction Graph
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 820 }}>
          Every reduction between Redux&apos;s catalogued problems, visualized as a directed graph —
          click a node to open that problem. An arrow points from the problem a reduction starts
          from to the problem it reduces to.
        </Typography>

        {error ? <ErrorBanner /> : null}

        {!error && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {loading
              ? "Loading the catalog…"
              : `${problemNames.length} problems, ${edgeCount} reductions`}
          </Typography>
        )}

        <Box
          sx={{
            flex: 1,
            minHeight: 640,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            overflow: "hidden",
          }}
        >
          {!loading && !error && problemNames.length > 0 && (
            <ReductionGraphView
              problemNames={problemNames}
              reductionGraphByName={reductionGraphByName}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
