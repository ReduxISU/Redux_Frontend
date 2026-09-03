// components/detail/StepScrubber.js
//
// T47 (#110) — the shared step-playback scrubber used by both
// VisualizationsSection.js and ReductionsSection.js. Purely a rendering/
// navigation concern (INTERACTIVE_LAYER_DESIGN.md §1): walks whatever
// frames[] array the caller owns, emitting `onStepChange` as the user
// plays, steps, or drags the scrub bar. No assumptions baked in about
// which section renders it or how many frames it has -- Visualizations'
// up-to-24-frame case (§1.2, pumpSchedule, the largest of the 48 observed
// instances) and Reductions' structurally-fixed 2-frame case (§1.3, base
// then reduced/solved, since visualizeReduction never returns intermediate
// steps) are the same `frameCount` prop, just a different number.
//
// Play/pause/step buttons are real, focusable, aria-labelled controls; the
// scrub bar is a real MUI Slider (a native range input under the hood, so
// arrow keys move it without extra wiring); frame changes announce through
// an aria-live region, matching ComputeStatus.js's existing live-Run/Verify
// pattern -- a persistent role="status" region whose *text* changes, rather
// than one that mounts at the same moment as its content (that combination
// is often missed entirely by a screen reader).
//
// Playback and speed are owned internally rather than lifted to the
// caller: the caller only needs to know the current frame (to render it)
// and how to change it, not whether a timer is currently ticking. That
// keeps both call sites down to frameCount/currentStep/onStepChange, per
// the issue's genericity requirement.

import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";

// Milliseconds between frames while playing at 1x. SPEED_OPTIONS' `factor`
// multiplies this, so 2x plays twice as fast (half the delay) and 0.5x half
// as fast (double the delay).
const BASE_STEP_MS = 900;
const SPEED_OPTIONS = [
  { value: "0.5", factor: 2, label: "0.5x" },
  { value: "1", factor: 1, label: "1x" },
  { value: "2", factor: 0.5, label: "2x" },
];
const DEFAULT_SPEED_VALUE = "1";

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id this component renders
 *   (ground rule 4: no literal ids inside a reusable component).
 * @param {number} props.frameCount Total number of frames to scrub across.
 *   Reductions passes 2 (source, reduced); Visualizations passes however
 *   many frames the selected visualization declares.
 * @param {number} props.currentStep The index of the frame currently shown,
 *   0-based, owned by the caller.
 * @param {(next: number) => void} props.onStepChange Called with the new
 *   step index on every step/scrub/play tick.
 * @param {string} [props.frameNoun] What one frame is called in the
 *   position text and the aria-live announcement. Defaults to "Step".
 */
export default function StepScrubber({
  idPrefix,
  frameCount,
  currentStep,
  onStepChange,
  frameNoun = "Step",
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedValue, setSpeedValue] = useState(DEFAULT_SPEED_VALUE);

  const hasFrames = frameCount > 0;
  const lastIndex = Math.max(frameCount - 1, 0);
  const canScrub = frameCount > 1;
  const atStart = currentStep <= 0;
  const atEnd = currentStep >= lastIndex;
  // `isPlaying` only ever records the user's own play/pause intent; whether
  // playback is actually ticking right now also depends on atEnd, which the
  // effect below can't set (it would be a setState-during-effect call for a
  // value already derivable from props+state). Deriving it here instead
  // means reaching the last frame while playing stops the timer for free
  // (the effect's own condition goes false) without an extra render to
  // flip a redundant "stopped" flag.
  const isPlayingEffective = isPlaying && canScrub && !atEnd;

  // Advances one frame after a speed-scaled delay while playing, and stops
  // itself once the last frame is reached rather than looping -- a scrubber
  // that silently jumps back to frame 0 on its own would be confusing next
  // to a position indicator that just read "Step 7 of 7".
  useEffect(() => {
    if (!isPlayingEffective) {
      return undefined;
    }
    const speed = SPEED_OPTIONS.find((option) => option.value === speedValue) ?? SPEED_OPTIONS[1];
    const timeoutId = setTimeout(() => {
      onStepChange(Math.min(currentStep + 1, lastIndex));
    }, BASE_STEP_MS * speed.factor);
    return () => clearTimeout(timeoutId);
  }, [isPlayingEffective, speedValue, currentStep, lastIndex, onStepChange]);

  function handlePlayPause() {
    if (isPlayingEffective) {
      setIsPlaying(false);
      return;
    }
    // Replaying after reaching the end restarts from the beginning instead
    // of doing nothing, which is what a press of Play would otherwise do
    // while already sitting on the last frame.
    if (atEnd) {
      onStepChange(0);
    }
    setIsPlaying(true);
  }

  function handleStepBack() {
    setIsPlaying(false);
    onStepChange(Math.max(currentStep - 1, 0));
  }

  function handleStepForward() {
    setIsPlaying(false);
    onStepChange(Math.min(currentStep + 1, lastIndex));
  }

  function handleScrub(_event, value) {
    setIsPlaying(false);
    onStepChange(Array.isArray(value) ? value[0] : value);
  }

  const positionText = hasFrames
    ? `${frameNoun} ${currentStep + 1} of ${frameCount}`
    : "No frames available";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        px: 1.5,
        py: 1,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <IconButton
          id={`${idPrefix}-previous`}
          size="small"
          disabled={!canScrub || atStart}
          onClick={handleStepBack}
          aria-label="Previous step"
        >
          <SkipPreviousIcon fontSize="small" />
        </IconButton>
        <IconButton
          id={`${idPrefix}-play-pause`}
          size="small"
          disabled={!canScrub}
          onClick={handlePlayPause}
          aria-label={isPlayingEffective ? "Pause" : "Play"}
        >
          {isPlayingEffective ? <PauseIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
        </IconButton>
        <IconButton
          id={`${idPrefix}-next`}
          size="small"
          disabled={!canScrub || atEnd}
          onClick={handleStepForward}
          aria-label="Next step"
        >
          <SkipNextIcon fontSize="small" />
        </IconButton>

        <Slider
          id={`${idPrefix}-slider`}
          aria-label="Scrub to step"
          getAriaValueText={(value) => `${frameNoun} ${value + 1} of ${frameCount}`}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${value + 1}`}
          size="small"
          min={0}
          max={lastIndex}
          step={1}
          value={currentStep}
          onChange={handleScrub}
          disabled={!canScrub}
          sx={{ flex: 1, mx: 1 }}
        />

        <Select
          id={`${idPrefix}-speed`}
          aria-label="Playback speed"
          size="small"
          value={speedValue}
          disabled={!canScrub}
          onChange={(event) => setSpeedValue(event.target.value)}
          sx={{ flexShrink: 0, minWidth: 76 }}
        >
          {SPEED_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Box id={`${idPrefix}-position`} role="status" aria-live="polite">
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {positionText}
        </Typography>
      </Box>
    </Box>
  );
}
