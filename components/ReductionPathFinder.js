// components/ReductionPathFinder.js
//
// #148 -- the weighted shortest-path finder for the reduction graph page: pick a source
// and target problem and see the cheapest reduction chain between them, with each hop's
// ReductionCost and reduction class name shown alongside. This turns
// pages/reduction-graph.js from "browse the network" into "ask it a question", the
// project-owner's own framing on the issue -- the reachability filter
// (ReductionReachabilityFilter.js, T59/#134) already answers "what's reachable from X",
// this answers "what's the cheapest way from X to Y".
//
// Two MUI Autocompletes (source, target) rather than one -- same Autocomplete +
// thinScrollbarSx listbox pattern ReductionReachabilityFilter.js already established for
// picking a problem out of the full catalog list, just wired to a pair of selections
// instead of one. A singleton on pages/reduction-graph.js, like that component is on
// FacetSidebar, so its ids below are static literals rather than derived per-instance --
// same precedent that component's own header documents (ground rule 4 is about never
// hardcoding a literal id inside a REUSABLE component; this one is never rendered twice
// on the same page either).
//
// The lookup itself goes through useComputeRequest (hooks/useComputeRequest.js, T37/#95).
// That hook was built for a user-triggered live Run/Verify, but its state machine --
// exactly one in-flight request at a time, staleness by request id, AbortSignal-based
// cancellation, and describeComputeFailure's real failure copy -- is exactly what "pick
// two problems, ask the backend" needs too, and reusing it means a visitor gets the same
// accessible ComputeStatus treatment (spinner, live-region announcement, Cancel, real
// error text) every other live backend call in this app already gives them, instead of a
// second bespoke loading/error shape.
//
// found:false is not a failure -- the backend answered fine, there is just no reduction
// chain between the two problems (or they're the same problem, or the name is unknown).
// It is read out of `result.found` on COMPUTE_DONE, never routed through
// useComputeRequest's failure branch, so "no path found" reads as a plain fact instead of
// an error banner (issue done-when: "no blank/broken state").

import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { alpha } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";
import {
  COMPUTE_CANCELLED,
  COMPUTE_DONE,
  COMPUTE_FAILED,
  COMPUTE_RUNNING,
  useComputeRequest,
} from "../hooks/useComputeRequest";
import { REDUX_API_BASE_URL, requestReductionPath } from "../lib/redux";
import ComputeStatus from "./detail/ComputeStatus";
import { getFacetAccentColor, thinScrollbarSx } from "./theme";

const SOURCE_INPUT_ID = "reduction-path-source-input";
const TARGET_INPUT_ID = "reduction-path-target-input";
const HOP_LIST_ID = "reduction-path-hop-list";
const STATUS_ID_PREFIX = "reduction-path-lookup";

// Wire values (Interfaces/ReductionCost.cs) -> display copy. "HigherPolynomial" is the
// one wire value that doesn't already read as English on its own.
const COST_LABELS = {
  Linear: "Linear",
  Quadratic: "Quadratic",
  Cubic: "Cubic",
  HigherPolynomial: "Higher polynomial",
  Unclassified: "Unclassified",
};

function costLabel(cost) {
  return COST_LABELS[cost] ?? cost;
}

/**
 * @param {Object} props
 * @param {string[]} props.problemNames Every real problem name currently in the catalog
 *   index (useCatalogIndex()'s `index` keys) -- the same option list
 *   ReductionReachabilityFilter.js and ReductionGraphView.js already use.
 * @param {boolean} [props.loading] Disables both pickers while the catalog is still
 *   loading, matching ReductionReachabilityFilter's own `loading` treatment -- there is
 *   nothing real to pick yet.
 * @param {string|null} props.source Selected source problem name, or null.
 * @param {string|null} props.target Selected target problem name, or null.
 * @param {(next: string|null) => void} props.onSourceChange
 * @param {(next: string|null) => void} props.onTargetChange
 * @param {(result: {found: boolean, nodes: string[], hops: Array<Object>}|null) => void} props.onPathChange
 *   Called with the path lookup's settled result whenever it changes, including back to
 *   `null` when the selection is cleared, incomplete, or source === target -- so the
 *   caller (pages/reduction-graph.js) can pass it straight to ReductionGraphView's
 *   `pathNodeNames`/`pathHops` props for highlighting.
 */
export default function ReductionPathFinder({
  problemNames,
  loading = false,
  source,
  target,
  onSourceChange,
  onTargetChange,
  onPathChange,
}) {
  const lookup = useComputeRequest({ subject: "problem pair" });
  const { start, reset } = lookup;

  const samePick = Boolean(source) && Boolean(target) && source === target;

  // Runs the lookup whenever a complete, distinct pair is picked, and clears any previous
  // result the moment the pair stops being complete/distinct (one selection cleared, or
  // the same problem picked twice) -- so the graph never keeps highlighting a path for a
  // pair that's no longer actually selected.
  useEffect(() => {
    if (!source || !target || samePick) {
      reset();
      return;
    }
    start((signal) => requestReductionPath(REDUX_API_BASE_URL, source, target, signal));
  }, [source, target, samePick, start, reset]);

  useEffect(() => {
    onPathChange?.(lookup.status === COMPUTE_DONE ? lookup.result : null);
    // onPathChange intentionally excluded: pages/reduction-graph.js passes a plain
    // setState function, stable across renders, and including it here would only risk a
    // caller that forgets to memoize re-running this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup.status, lookup.result]);

  let announcement = "";
  if (lookup.status === COMPUTE_RUNNING) {
    announcement = `Finding the cheapest reduction chain from ${source} to ${target}.`;
  } else if (lookup.status === COMPUTE_FAILED) {
    announcement = `Could not look up a path. ${lookup.failure?.headline ?? ""}`;
  } else if (lookup.status === COMPUTE_CANCELLED) {
    announcement = "Path lookup cancelled.";
  } else if (lookup.status === COMPUTE_DONE && lookup.result) {
    announcement = lookup.result.found
      ? `Found the cheapest reduction chain from ${source} to ${target}: ${lookup.result.hops.length} hop${lookup.result.hops.length === 1 ? "" : "s"}.`
      : `No path found between ${source} and ${target}.`;
  }

  const pathAccent = getFacetAccentColor("green");
  const bothPicked = Boolean(source) && Boolean(target);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1.5 }}>
        <Autocomplete
          id={SOURCE_INPUT_ID}
          options={problemNames}
          value={source}
          onChange={(_event, next) => onSourceChange(next)}
          disabled={loading}
          size="small"
          sx={{ flex: 1 }}
          slotProps={{ listbox: { sx: thinScrollbarSx } }}
          renderInput={(params) => (
            <TextField {...params} label="From" placeholder="Pick a source problem" />
          )}
        />
        <Autocomplete
          id={TARGET_INPUT_ID}
          options={problemNames}
          value={target}
          onChange={(_event, next) => onTargetChange(next)}
          disabled={loading}
          size="small"
          sx={{ flex: 1 }}
          slotProps={{ listbox: { sx: thinScrollbarSx } }}
          renderInput={(params) => (
            <TextField {...params} label="To" placeholder="Pick a target problem" />
          )}
        />
      </Box>

      {bothPicked && samePick && (
        <Typography id="reduction-path-same-pick" variant="body2" sx={{ color: "text.secondary" }}>
          Pick two different problems to find a path between them.
        </Typography>
      )}

      {bothPicked && !samePick && (
        <ComputeStatus
          idPrefix={STATUS_ID_PREFIX}
          status={lookup.status}
          announcement={announcement}
          failure={lookup.failure}
          onCancel={lookup.cancel}
          busyLabel="Finding the cheapest path"
        />
      )}

      {bothPicked && !samePick && lookup.status === COMPUTE_DONE && lookup.result?.found && (
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            backgroundColor: alpha(pathAccent, 0.06),
            borderColor: alpha(pathAccent, 0.4),
          }}
        >
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Cheapest path
          </Typography>
          <Box
            id={HOP_LIST_ID}
            component="ol"
            sx={{
              listStyle: "none",
              m: 0,
              mt: 1,
              p: 0,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            {lookup.result.hops.map((hop, index) => (
              <Box
                component="li"
                key={`${hop.from}->${hop.to}->${hop.className}`}
                sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}
              >
                <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>
                  {index + 1}. {hop.from} → {hop.to}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  <Box component="span" sx={{ fontFamily: "monospace" }}>
                    {hop.className}
                  </Box>{" "}
                  — {costLabel(hop.cost)} cost
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
