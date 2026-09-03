// components/detail/VisualizationsSection.js
//
// T16b (#22) — the Visualizations detail-page section: a left rail of the
// problem's declared visualizations (name + type badge), and a right pane
// with a canvas, its caption, and step-scrubber chrome.
//
// T48 (#111): the canvas is real now, for the `graph` universal type (24 of
// 48 declared instances, the largest group -- ai_documentation/
// VISUALIZATION_TYPE_CONTRACTS.md §3.1). Structural editing is still out of
// scope (T51, gated on T46) -- rendering is read-only, and the earlier "Drag
// nodes to reposition / Right-click to add" hint text is gone rather than
// left pointing at an interaction that doesn't exist: it was harmless over
// a static placeholder box, but would be actively misleading under a real,
// rendered diagram nothing responds to.
//
// Per INTERACTIVE_LAYER_DESIGN.md §0/§2.1/§2.1.1: this section shares
// `instanceValue`/`onInstanceChange` with Solvers and Verifier (T35/#93) and
// reacts to the shared Run trigger `runToken`/`onRunRequest` (owned by
// components/ProblemDetailLayout.js) the same way Solvers does. Frames are
// not refetched on every instance edit -- only on Run -- and a staleness
// banner shows when the instance has changed since the frames currently
// shown were fetched, the same `instanceChangedSinceRun` pattern
// components/detail/SolversSection.js already established.
//
// T47 (#110): step playback (play/pause/step/speed/scrub bar) is the shared
// StepScrubber component, now driven by the real frame count a completed
// run returns rather than a fallback of 1.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useRef, useState } from "react";
import { TAXONOMY, UNCLASSIFIED } from "../../data/taxonomy";
import {
  COMPUTE_CANCELLED,
  COMPUTE_DONE,
  COMPUTE_FAILED,
  COMPUTE_RUNNING,
  useComputeRequest,
} from "../../hooks/useComputeRequest";
import { REDUX_API_BASE_URL, requestVisualizedInstance } from "../../lib/redux";
import { getFacetAccentColor, thinScrollbarSx } from "../theme";
import ComputeStatus from "./ComputeStatus";
import SectionShell from "./SectionShell";
import StepScrubber from "./StepScrubber";
import VisualizationCanvas from "./visualizations/VisualizationCanvas";

const VISUALIZATION_TYPE_FACET = TAXONOMY.find((facet) => facet.key === "visualizationType");

// #71: fixed rail height so a problem with many declared visualizations
// scrolls inside the rail instead of stretching the section indefinitely.
const RAIL_MAX_HEIGHT = 320;

// One prefix for every id ComputeStatus renders inside this section, so it
// can never collide with Solvers' own (ground rule 4).
const RUN_ID_PREFIX = "visualizations-run";

function formatSeconds(milliseconds) {
  return `${(milliseconds / 1000).toFixed(2)}s`;
}

// Falls back to the raw key (or the UNCLASSIFIED sentinel itself, e.g.
// 3-SAT's "Assignment Table" -- a real, documented taxonomy gap, see
// data/fixtures.js's file header) rather than crashing on an unmapped type.
function visualizationTypeLabel(typeKey) {
  if (!typeKey || typeKey === UNCLASSIFIED) {
    return UNCLASSIFIED;
  }
  const option = VISUALIZATION_TYPE_FACET.options.find((candidate) => candidate.key === typeKey);
  return option?.label ?? typeKey;
}

function TypeBadge({ typeKey }) {
  const accentColor = getFacetAccentColor(VISUALIZATION_TYPE_FACET.accentColor);
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        px: 1,
        py: 0.25,
        borderRadius: 999,
        fontSize: "0.75rem",
        fontWeight: 600,
        color: accentColor,
        backgroundColor: alpha(accentColor, 0.12),
        border: `1px solid ${alpha(accentColor, 0.55)}`,
      }}
    >
      {visualizationTypeLabel(typeKey)}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.problem A data/fixtures.js-shaped FixtureProblem.
 * @param {string} [props.instanceValue] The shared problem instance, owned by
 *   components/ProblemDetailLayout.js (T35/#93).
 * @param {(next: string) => void} [props.onInstanceChange] Called with the new
 *   text whenever the visitor edits the instance elsewhere (Solvers' box) --
 *   this section reads the value but does not render its own copy of the box.
 * @param {number} [props.runToken] The shared Run trigger (T48/#111). A change
 *   in value, not the value itself, means Run was pressed somewhere.
 * @param {() => void} [props.onRunRequest] Bumps `runToken`. Called by this
 *   section's own Run button instead of fetching directly.
 * @param {{attributes: Object, listeners: Object}} [props.dragHandleProps]
 *   Forwarded straight through to SectionShell — see T18 (#27).
 */
export default function VisualizationsSection({
  problem,
  instanceValue = "",
  runToken,
  onRunRequest,
  dragHandleProps,
}) {
  const visualizations = problem.visualizations ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const selected = visualizations[selectedIndex];
  const noun = visualizations.length === 1 ? "visualization" : "visualizations";

  const visualize = useComputeRequest({ subject: "instance" });

  const trimmedInstance = instanceValue.trim();
  const canRun = Boolean(selected?.className) && trimmedInstance !== "";

  // A rendered frame set is only ever shown next to the visualization that
  // produced it -- same guard components/detail/SolversSection.js uses for
  // its own liveResult, and for the same reason: the rail is not the only
  // thing that can change which visualization `selected` points at.
  const liveFrames =
    visualize.status === COMPUTE_DONE &&
    visualize.result?.visualizationClassName === selected?.className
      ? visualize.result
      : null;
  const instanceChangedSinceRun = Boolean(liveFrames) && liveFrames.instance !== instanceValue;

  function handleSelectVisualization(index) {
    if (index === selectedIndex) return;
    // Drops any in-flight request and clears the pane, so nothing from the
    // previous visualization survives the switch.
    visualize.reset();
    setSelectedIndex(index);
  }

  const { start: startVisualize } = visualize;
  const handleRun = useCallback(() => {
    if (!canRun) return;
    const visualization = selected;
    const instanceAtRun = instanceValue;
    startVisualize(async (signal) => {
      const frames = await requestVisualizedInstance(
        REDUX_API_BASE_URL,
        visualization.className,
        instanceAtRun,
        signal,
      );
      return {
        frames: Array.isArray(frames) ? frames : [],
        visualizationClassName: visualization.className,
        visualizationName: visualization.name,
        instance: instanceAtRun,
      };
    });
  }, [canRun, selected, instanceValue, startVisualize]);

  // Reacts to the shared Run trigger (T48/#111) rather than fetching inline
  // in the button's onClick -- see components/ProblemDetailLayout.js and
  // components/detail/SolversSection.js, which does the identical thing.
  const previousRunTokenRef = useRef(runToken);
  useEffect(() => {
    if (runToken === undefined || runToken === previousRunTokenRef.current) return;
    previousRunTokenRef.current = runToken;
    handleRun();
  }, [runToken, handleRun]);

  // Two independent render-time step resets (React's documented "adjust
  // state" pattern, not a useEffect): selecting a different visualization
  // starts its playback over, and so does a freshly-completed run replacing
  // the frames currently shown -- both can leave a stale `currentStep`
  // pointing past the end of a differently-sized frames[].
  const [stepResetKey, setStepResetKey] = useState(selectedIndex);
  if (stepResetKey !== selectedIndex) {
    setStepResetKey(selectedIndex);
    setCurrentStep(0);
  }
  const [lastVisualizeResult, setLastVisualizeResult] = useState(visualize.result);
  if (lastVisualizeResult !== visualize.result) {
    setLastVisualizeResult(visualize.result);
    setCurrentStep(0);
  }

  const frameCount = liveFrames?.frames?.length ?? 1;
  const currentFrame = liveFrames?.frames?.[currentStep] ?? null;

  const visualizationName = selected?.name ?? "this visualization";
  let announcement = "";
  if (visualize.status === COMPUTE_RUNNING) {
    announcement = `Rendering ${visualizationName}. This can take up to a minute.`;
  } else if (visualize.status === COMPUTE_DONE) {
    announcement = `${visualizationName} rendered in ${formatSeconds(visualize.elapsedMs)}.`;
  } else if (visualize.status === COMPUTE_FAILED) {
    announcement = `${visualizationName} did not render. ${visualize.failure?.headline ?? ""}`;
  } else if (visualize.status === COMPUTE_CANCELLED) {
    announcement = "Run cancelled.";
  }

  return (
    <SectionShell
      sectionKey="visualizations"
      title="Visualizations"
      summary={`${visualizations.length} ${noun}`}
      dragHandleProps={dragHandleProps}
    >
      {visualizations.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No visualizations declared for this problem.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2 }}>
          <Box
            component="ul"
            role="listbox"
            aria-label="Visualizations"
            sx={{
              listStyle: "none",
              m: 0,
              p: 0,
              width: { xs: "100%", md: 220 },
              flexShrink: 0,
              maxHeight: RAIL_MAX_HEIGHT,
              overflowY: "auto",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              ...thinScrollbarSx,
            }}
          >
            {visualizations.map((visualization, index) => {
              const isSelected = index === selectedIndex;
              const entryId = `visualizations-rail-entry-${index}`;
              return (
                <Box component="li" key={entryId} sx={{ listStyle: "none" }}>
                  <Box
                    id={entryId}
                    component="button"
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectVisualization(index)}
                    sx={(theme) => ({
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 0.5,
                      width: "100%",
                      p: 1,
                      border: "none",
                      borderLeft: "3px solid",
                      borderLeftColor: isSelected ? "primary.main" : "transparent",
                      backgroundColor: isSelected
                        ? alpha(theme.palette.primary.main, 0.1)
                        : "transparent",
                      "&:hover": {
                        backgroundColor: isSelected
                          ? alpha(theme.palette.primary.main, 0.1)
                          : alpha(theme.palette.common.white, 0.04),
                      },
                      color: "inherit",
                      font: "inherit",
                      textAlign: "left",
                      cursor: "pointer",
                    })}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: isSelected ? "text.primary" : "text.secondary",
                      }}
                    >
                      {visualization.name}
                    </Typography>
                    <TypeBadge typeKey={visualization.type} />
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Button
                id="visualizations-run-button"
                variant="outlined"
                size="small"
                disabled={!canRun || visualize.isRunning}
                onClick={() => (onRunRequest ? onRunRequest() : handleRun())}
              >
                Run
              </Button>
              {!canRun && (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {selected.className
                    ? "Add a problem instance above to render this visualization."
                    : "This visualization cannot be run: the catalog did not say which backend visualization it is."}
                </Typography>
              )}
            </Box>

            <StepScrubber
              idPrefix="visualizations-scrubber"
              frameCount={frameCount}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
            />

            <ComputeStatus
              idPrefix={RUN_ID_PREFIX}
              status={visualize.status}
              announcement={announcement}
              failure={visualize.failure}
              onCancel={visualize.cancel}
              busyLabel={`Rendering ${visualizationName}`}
            />

            {liveFrames ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Box
                  sx={{
                    minHeight: 260,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <VisualizationCanvas
                    idPrefix="visualizations-canvas"
                    instanceName={selected.name}
                    backendType={selected.backendType}
                    frame={currentFrame}
                  />
                </Box>
                {instanceChangedSinceRun && (
                  <Typography variant="body2" sx={{ color: "warning.light" }}>
                    The instance has been edited since this ran. Run again to visualize the instance
                    currently in the box.
                  </Typography>
                )}
              </Box>
            ) : (
              visualize.status !== COMPUTE_RUNNING &&
              visualize.status !== COMPUTE_FAILED && (
                <Box
                  sx={{
                    minHeight: 260,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    color: "text.secondary",
                  }}
                >
                  <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                    Not yet run.
                  </Typography>
                </Box>
              )
            )}

            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {selected.caption}
            </Typography>

            {selected.stepNarration && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {selected.stepNarration}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </SectionShell>
  );
}
