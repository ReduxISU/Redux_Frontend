// components/detail/SolversSection.js
//
// T16c (#23) — the Solvers section of a Problem Detail page: a "paste an
// instance" block (format description + pre-filled input), a left rail of
// declared solvers, and a right detail pane with a canned Run.
//
// T37 (#95): Run is live. It calls `requestSolvedInstance()` with the
// selected solver's class name and the shared instance, and the answer
// replaces the declared runtime/result rows underneath. Before this task it
// was a real `disabled` button producing nothing, per ground rule 5, and
// this is the task that lifts that for the Solvers section.
//
// T48 (#111): the Run button no longer performs the solve directly. It
// invokes the shared Run action (`onRunRequest`, owned by
// ProblemDetailLayout.js -- see that file's header) instead, and an effect
// here reacts to `runToken` changing by performing the same solve it always
// did. The visible behavior of pressing this button is unchanged; what
// changed is that Visualizations' own Run affordance now bumps the same
// token, so a solve and a `/visualize` call happen together no matter which
// section's button was pressed (INTERACTIVE_LAYER_DESIGN.md §2.1.1).
//
// Three things that took more care than the call itself:
//
//   - Staleness. A brute-force solver can run for the full 60 seconds the
//     proxy allows, and the solver rail is right there to click during it.
//     Selecting a different solver clears the run, and the result is also
//     tagged with the solver and the instance it came from, so an answer
//     can never be shown next to a solver that did not produce it.
//   - The declared display path stays. A problem whose data carries a
//     runtime and a result still shows them before anything has been run
//     (#95: "do not remove the declared-data display path").
//   - Runtime. The Redux API returns the solved instance and nothing else:
//     no runtime figure at all. So a live result shows the round trip this
//     browser measured, labelled as exactly that, rather than presenting a
//     network-inclusive number as if it were the solver's own running time.
//
// T35 (#93): the instance box is real and editable now. It pre-fills with
// the problem's declared `defaultInstance` (a required backend field; all
// 50 problems supply a runnable one) and its value is owned by
// components/ProblemDetailLayout.js, not by this section, because the
// Verifier section shows the same single value. See that file's header for
// why.
//
// The format block above the box shows the problem's `instanceFormat`,
// prose with an embedded example. Only 18 of the 50 problems declare one
// today, so the block says so plainly for the rest rather than inventing
// format text. That never disables the box: the instance itself is always
// available even when the prose describing it is not. (This replaces an
// older note here claiming no instance field existed anywhere in the data
// at all, which was wrong, see #92.)
//
// T28 (#37): the solver-list-plus-detail-pane split stacks below `md`
// (900px), same breakpoint components/detail/VisualizationsSection.js's
// identically-shaped rail/pane split uses. The rail's fixed width only
// applies at `md` and up; stacked, it's full width.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useRef, useState } from "react";
import { TAXONOMY } from "../../data/taxonomy";
import {
  COMPUTE_CANCELLED,
  COMPUTE_DONE,
  COMPUTE_FAILED,
  COMPUTE_RUNNING,
  useComputeRequest,
} from "../../hooks/useComputeRequest";
import { REDUX_API_BASE_URL, requestSolvedInstance } from "../../lib/redux";
import { getFacetAccentColor, thinScrollbarSx } from "../theme";
import ComputeStatus from "./ComputeStatus";
import SectionShell from "./SectionShell";

// #71: fixed rail height so a problem with many declared solvers scrolls
// inside the rail instead of stretching the section indefinitely.
const RAIL_MAX_HEIGHT = 320;

const TAXONOMY_BY_KEY = new Map(TAXONOMY.map((facet) => [facet.key, facet]));

function optionLabel(facetKey, optionKey) {
  const option = TAXONOMY_BY_KEY.get(facetKey)?.options.find(
    (candidate) => candidate.key === optionKey,
  );
  return option?.label ?? optionKey;
}

// Deliberately not the theme.js `solverComplexityOutlined`/`Filled` Chip
// variant (#70) -- this badge is a static declared-complexity label on the
// Problem Detail page, not a filterable card tag, so it stays the same
// plain-pill pattern components/ActiveFilterChips.js already uses for its
// facet-colored chips.
function ComplexityBucketBadge({ bucketKey }) {
  const facet = TAXONOMY_BY_KEY.get("solverComplexity");
  const accentColor = getFacetAccentColor(facet?.accentColor);
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1.25,
        py: 0.375,
        borderRadius: 999,
        color: accentColor,
        backgroundColor: alpha(accentColor, 0.12),
        border: `1px solid ${alpha(accentColor, 0.55)}`,
        fontSize: "0.8125rem",
        fontWeight: 700,
      }}
    >
      {optionLabel("solverComplexity", bucketKey)}
    </Box>
  );
}

const INSTANCE_TEXTAREA_ID = "solvers-instance-input";

// One prefix for every id ComputeStatus renders inside this section, so the
// Solvers status region and the Verifier's can never collide (ground rule
// 4).
const RUN_ID_PREFIX = "solvers-run";

// The API returns the solved instance as a bare JSON string, but a future
// solver returning something structured should still render rather than
// print "[object Object]".
function formatSolverOutput(value) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return JSON.stringify(value, null, 2);
}

function formatSeconds(milliseconds) {
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

/**
 * @param {Object} props
 * @param {Object} props.problem A data/fixtures.js-shaped FixtureProblem.
 * @param {string} [props.instanceValue] The shared problem instance, owned
 *   by components/ProblemDetailLayout.js (T35/#93). Empty string when the
 *   problem declares no instance.
 * @param {(next: string) => void} [props.onInstanceChange] Called with the
 *   new text whenever the visitor edits the box. The Verifier section's own
 *   instance input is bound to the same value, so an edit here shows up
 *   there too.
 * @param {number} [props.runToken] The shared Run trigger (T48/#111), owned by
 *   ProblemDetailLayout.js. A change in value (not the value itself) means
 *   Run was pressed somewhere -- this section or another `usesRun` one.
 * @param {() => void} [props.onRunRequest] Bumps `runToken`. Called by this
 *   section's own Run button instead of solving directly.
 * @param {(certificate: {value: string, instance: string}) => void} [props.onCertificateChange]
 *   Called with the solved instance and the instance it was solved from every time a solve
 *   completes successfully (T53/#116). ProblemDetailLayout.js holds the one shared copy so
 *   ReductionsSection can use it as the certificate `ProblemProvider/visualizeReduction`
 *   requires -- see that file's header for why this lives here rather than being lifted
 *   into a shared Run action outright.
 * @param {{attributes: Object, listeners: Object}} [props.dragHandleProps]
 *   Forwarded straight through to SectionShell — see T18 (#27).
 */
export default function SolversSection({
  problem,
  instanceValue = "",
  onInstanceChange,
  runToken,
  onRunRequest,
  onCertificateChange,
  dragHandleProps,
}) {
  const solvers = problem.solvers ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = solvers[selectedIndex];

  const noun = solvers.length === 1 ? "solver" : "solvers";
  const summary = `${solvers.length} ${noun}`;

  const run = useComputeRequest({ subject: "instance" });

  const trimmedInstance = instanceValue.trim();
  const canRun = Boolean(selected?.className) && trimmedInstance !== "";

  // A result is only ever shown next to the solver that produced it. The
  // selection handler below already clears the run, so this is the second
  // of two guards rather than the only one -- worth having, because the
  // rail is not the only thing that can change which solver `selected`
  // points at (a problem whose solver list changes underneath this
  // component would too).
  const liveResult =
    run.status === COMPUTE_DONE && run.result?.solverClassName === selected?.className
      ? run.result
      : null;
  const instanceChangedSinceRun = Boolean(liveResult) && liveResult.instance !== instanceValue;

  function handleSelectSolver(index) {
    if (index === selectedIndex) return;
    // Drops any in-flight request and clears the pane, so nothing from the
    // previous solver survives the switch.
    run.reset();
    setSelectedIndex(index);
  }

  const { start: startRun } = run;
  const handleRun = useCallback(() => {
    if (!canRun) return;
    const solver = selected;
    const instanceAtRun = instanceValue;
    startRun(async (signal) => {
      const output = await requestSolvedInstance(
        REDUX_API_BASE_URL,
        solver.className,
        instanceAtRun,
        signal,
      );
      // T53 (#116): reported up regardless of which solver produced it -- Reductions only
      // needs *a* certificate for the current instance, not one from any particular solver.
      onCertificateChange?.({ value: output, instance: instanceAtRun });
      return {
        output,
        solverClassName: solver.className,
        solverName: solver.name,
        instance: instanceAtRun,
      };
    });
  }, [canRun, selected, instanceValue, startRun, onCertificateChange]);

  // Reacts to the shared Run trigger (T48/#111, see file header) rather than
  // performing the solve inline in the button's onClick -- that way it fires
  // the same way whether this section's own Run button was pressed or
  // another `usesRun` section's was. `previousRunTokenRef` is what makes
  // this "run on change", not "run on every render this effect happens to
  // fire in": only a token that actually differs from the last one this
  // effect acted on triggers a new solve.
  const previousRunTokenRef = useRef(runToken);
  useEffect(() => {
    if (runToken === undefined || runToken === previousRunTokenRef.current) return;
    previousRunTokenRef.current = runToken;
    handleRun();
  }, [runToken, handleRun]);

  const solverName = selected?.name ?? "this solver";
  let announcement = "";
  if (run.status === COMPUTE_RUNNING) {
    announcement = `Running ${solverName}. This can take up to a minute.`;
  } else if (run.status === COMPUTE_DONE) {
    announcement = `${solverName} finished in ${formatSeconds(run.elapsedMs)}.`;
  } else if (run.status === COMPUTE_FAILED) {
    announcement = `${solverName} did not run. ${run.failure?.headline ?? ""}`;
  } else if (run.status === COMPUTE_CANCELLED) {
    announcement = `Run cancelled.`;
  }

  return (
    <SectionShell
      sectionKey="solvers"
      title="Solvers"
      summary={summary}
      dragHandleProps={dragHandleProps}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Paste an instance
          </Typography>
          {problem.instanceFormat ? (
            // Same presentation the Verifier section gives certificateFormat
            // (a mono block in a padded panel), since these two fields are
            // the same kind of thing: prose with an embedded example.
            <Box
              component="pre"
              sx={{
                mt: 1.5,
                mb: 0,
                p: 1.5,
                borderRadius: 1,
                backgroundColor: "background.default",
                overflowX: "auto",
              }}
            >
              <Typography variant="mono" component="code" sx={{ whiteSpace: "pre-wrap" }}>
                {problem.instanceFormat}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
              Instance format not yet documented for this problem. The instance below is still the
              problem&apos;s own declared example.
            </Typography>
          )}
          <Box component="label" htmlFor={INSTANCE_TEXTAREA_ID} sx={{ display: "block", mt: 1.5 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.5 }}>
              Instance
            </Typography>
          </Box>
          <Box
            id={INSTANCE_TEXTAREA_ID}
            component="textarea"
            rows={2}
            value={instanceValue}
            onChange={(event) => onInstanceChange?.(event.target.value)}
            placeholder="No default instance declared for this problem yet."
            sx={{
              width: "100%",
              resize: "vertical",
              backgroundColor: "background.default",
              color: "text.primary",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              p: 1,
              font: "inherit",
            }}
          />
        </Paper>

        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2 }}>
          {solvers.length === 0 ? (
            <Typography
              variant="body2"
              sx={{
                width: { xs: "100%", md: 260 },
                flexShrink: 0,
                color: "text.secondary",
                fontStyle: "italic",
              }}
            >
              No solvers declared for this problem.
            </Typography>
          ) : (
            <Box
              component="ul"
              role="listbox"
              aria-label="Solvers"
              sx={{
                listStyle: "none",
                m: 0,
                p: 0,
                width: { xs: "100%", md: 260 },
                flexShrink: 0,
                maxHeight: RAIL_MAX_HEIGHT,
                overflowY: "auto",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                ...thinScrollbarSx,
              }}
            >
              {solvers.map((solver, index) => {
                const solverId = `solver-${index}-toggle`;
                const isSelected = index === selectedIndex;
                return (
                  <Box component="li" key={solverId} sx={{ listStyle: "none" }}>
                    <Box
                      id={solverId}
                      component="button"
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectSolver(index)}
                      sx={(theme) => ({
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 0.5,
                        width: "100%",
                        p: 1.5,
                        cursor: "pointer",
                        textAlign: "left",
                        font: "inherit",
                        color: "inherit",
                        border: "none",
                        borderLeft: "3px solid",
                        borderLeftColor: isSelected ? "primary.main" : "transparent",
                        backgroundColor: isSelected
                          ? alpha(theme.palette.primary.main, 0.14)
                          : "transparent",
                        "&:hover": {
                          backgroundColor: isSelected
                            ? alpha(theme.palette.primary.main, 0.14)
                            : alpha(theme.palette.common.white, 0.04),
                        },
                      })}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: isSelected ? "text.primary" : "text.secondary",
                        }}
                      >
                        {solver.name}
                      </Typography>
                      <Chip
                        size="small"
                        variant="solverTypeOutlined"
                        label={optionLabel("solverType", solver.type)}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {!selected ? (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Select a solver to see its details.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Typography variant="h2" component="h4" sx={{ fontSize: "1rem" }}>
                  {selected.name}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <ComplexityBucketBadge bucketKey={selected.complexityBucket} />
                  {selected.bigO && (
                    <Typography variant="mono" sx={{ color: "text.secondary" }}>
                      {selected.bigO}
                    </Typography>
                  )}
                </Box>
                <Button
                  id="solvers-run-button"
                  variant="contained"
                  disabled={!canRun || run.isRunning}
                  onClick={() => (onRunRequest ? onRunRequest() : handleRun())}
                  sx={{ alignSelf: "flex-start" }}
                >
                  Run
                </Button>
                {!canRun && (
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {selected.className
                      ? "Add a problem instance above to run this solver."
                      : "This solver cannot be run: the catalog did not say which backend solver it is."}
                  </Typography>
                )}

                <ComputeStatus
                  idPrefix={RUN_ID_PREFIX}
                  status={run.status}
                  announcement={announcement}
                  failure={run.failure}
                  onCancel={run.cancel}
                  busyLabel={`Running ${solverName}`}
                />

                {liveResult ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Result from {liveResult.solverName}:
                    </Typography>
                    <Box
                      id="solvers-run-output"
                      component="pre"
                      sx={{
                        m: 0,
                        p: 1.5,
                        borderRadius: 1,
                        backgroundColor: "background.default",
                        overflowX: "auto",
                      }}
                    >
                      <Typography variant="mono" component="code" sx={{ whiteSpace: "pre-wrap" }}>
                        {formatSolverOutput(liveResult.output)}
                      </Typography>
                    </Box>
                    {/* Not "Runtime": the Redux API reports no runtime for a
                        solve, so this is the browser's own measurement of the
                        whole round trip and is labelled as that rather than
                        passed off as the solver's running time (#95: "leave
                        it blank rather than fabricating a value"). */}
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Round trip: {formatSeconds(run.elapsedMs)}, network time included. Redux does
                      not report the solver&apos;s own runtime.
                    </Typography>
                    {instanceChangedSinceRun && (
                      <Typography variant="body2" sx={{ color: "warning.light" }}>
                        The instance has been edited since this ran. Run again to solve the instance
                        currently in the box.
                      </Typography>
                    )}
                  </Box>
                ) : selected.runtime || selected.result ? (
                  // The declared-data path, untouched by T37 (#95): a problem
                  // whose data carries a runtime and a result shows them
                  // until a live run replaces them.
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {selected.runtime && (
                      <Typography variant="body2">
                        <Box component="span" sx={{ color: "text.secondary" }}>
                          Runtime:{" "}
                        </Box>
                        {selected.runtime}
                      </Typography>
                    )}
                    {selected.result && (
                      <Typography variant="body2">
                        <Box component="span" sx={{ color: "text.secondary" }}>
                          Result:{" "}
                        </Box>
                        {selected.result.status} {selected.result.output}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  run.status !== COMPUTE_RUNNING &&
                  run.status !== COMPUTE_FAILED && (
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", fontStyle: "italic" }}
                    >
                      Not yet run.
                    </Typography>
                  )
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </SectionShell>
  );
}
