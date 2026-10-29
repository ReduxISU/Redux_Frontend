// components/detail/StepScrubber.js
//
// #229: now used by the workbench's picture pane (components/workbench/VisualizationPane.js);
// the two sections named below were replaced by it.
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
// #303 (Board G): laid out as the mockup's step bar, one box in the well color (`surface.well`)
// with a hairline border: five buttons (First step, Previous step, Play / Pause as the soft brand
// button, Next step, Last step), the slider ("Step"), "Speed" and its dropdown, then one line
// under them: "Step N of M:" in bold and the step's description (on a phone, the description on
// its own line under it). The description is rendered by
// the picture into `textRef`'s element (../pictures/secondarySlots.js StepTextSlot), so this file
// never knows what a step says. The buttons are 40px squares, as the mockup draws them, each
// with an invisible 44px hit area around it (`::before`) so a finger still lands on it.
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

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Slider from "@mui/material/Slider";
import { useEffect, useState } from "react";
import { PHONE_MEDIA } from "../workbench/layout";

// Milliseconds between frames while playing at 1x. SPEED_OPTIONS' `factor`
// multiplies this, so 2x plays twice as fast (half the delay) and 0.5x half
// as fast (double the delay); #303 adds 0.25x (four times the delay) and 4x
// (a quarter of it).
const BASE_STEP_MS = 900;
const SPEED_OPTIONS = [
  { value: "0.25", factor: 4, label: "0.25x" },
  { value: "0.5", factor: 2, label: "0.5x" },
  { value: "1", factor: 1, label: "1x" },
  { value: "2", factor: 0.5, label: "2x" },
  { value: "4", factor: 0.25, label: "4x" },
];
const DEFAULT_SPEED_VALUE = "1";
const DEFAULT_SPEED = SPEED_OPTIONS.find((option) => option.value === DEFAULT_SPEED_VALUE);

// #303: the mockup's step bar icons (24-unit boxes, drawn 16px).
const ICON_PATHS = {
  first: "M6 5v14M18 6l-8 6 8 6z",
  previous: "M15 6l-6 6 6 6",
  next: "M9 6l6 6-6 6",
  last: "M18 5v14M6 6l8 6-8 6z",
};

/** A stroked step bar icon. */
function StrokeIcon({ d }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

/** Play (a triangle) or Pause (two bars), filled. */
function PlayIcon({ playing }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      {playing ? (
        <>
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </>
      ) : (
        <path d="M7 5v14l12-7z" />
      )}
    </svg>
  );
}

// #303: a step bar button, 40px as drawn, its hit area 44px (the `::before`).
const stepButtonSx = {
  position: "relative",
  width: 40,
  height: 40,
  flex: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  p: 0,
  borderRadius: "8px",
  border: "1px solid",
  borderColor: "border.strong",
  backgroundColor: "surface.main",
  color: "text.primary",
  fontFamily: "inherit",
  cursor: "pointer",
  "&::before": { content: '""', position: "absolute", inset: "-2px" },
  "&:hover:not(:disabled)": { backgroundColor: "surface.raised" },
  "&:disabled": { cursor: "not-allowed", color: "text.disabled", borderColor: "border.soft" },
};

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
 * @param {import("react").Ref} [props.textRef] #303: the element the step's description is
 *   rendered into, after "Step N of M:" (its id is `${idPrefix}-text`).
 * @param {string} [props.textId] The description element's id, when the caller names it.
 */
export default function StepScrubber({
  idPrefix,
  frameCount,
  currentStep,
  onStepChange,
  frameNoun = "Step",
  textRef,
  textId,
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
    const speed = SPEED_OPTIONS.find((option) => option.value === speedValue) ?? DEFAULT_SPEED;
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

  /** Stops playing and goes to `index`. */
  function goTo(index) {
    setIsPlaying(false);
    onStepChange(Math.min(Math.max(index, 0), lastIndex));
  }

  function handleScrub(_event, value) {
    setIsPlaying(false);
    onStepChange(Array.isArray(value) ? value[0] : value);
  }

  const positionText = hasFrames
    ? `${frameNoun} ${currentStep + 1} of ${frameCount}`
    : "No frames available";
  const descriptionId = textId ?? `${idPrefix}-text`;

  return (
    <Box
      id={`${idPrefix}-bar`}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "10px 14px",
        p: "12px 16px",
        backgroundColor: "surface.well",
        border: "1px solid",
        borderColor: "border.soft",
        borderRadius: "12px",
        minWidth: 0,
      }}
    >
      <Box
        id={`${idPrefix}-buttons`}
        role="group"
        aria-label="Step controls"
        sx={{ display: "flex", gap: "4px", flex: "none" }}
      >
        <Box
          component="button"
          type="button"
          id={`${idPrefix}-first`}
          aria-label="First step"
          disabled={!canScrub || atStart}
          onClick={() => goTo(0)}
          sx={stepButtonSx}
        >
          <StrokeIcon d={ICON_PATHS.first} />
        </Box>
        <Box
          component="button"
          type="button"
          id={`${idPrefix}-previous`}
          aria-label="Previous step"
          disabled={!canScrub || atStart}
          onClick={() => goTo(currentStep - 1)}
          sx={stepButtonSx}
        >
          <StrokeIcon d={ICON_PATHS.previous} />
        </Box>
        <Box
          component="button"
          type="button"
          id={`${idPrefix}-play-pause`}
          aria-label={isPlayingEffective ? "Pause" : "Play"}
          disabled={!canScrub}
          onClick={handlePlayPause}
          sx={{
            ...stepButtonSx,
            width: 44,
            backgroundColor: "brand.soft",
            borderColor: "brand.softLine",
            color: "brand.onSoft",
            "&:hover:not(:disabled)": { backgroundColor: "brand.softHover" },
          }}
        >
          <PlayIcon playing={isPlayingEffective} />
        </Box>
        <Box
          component="button"
          type="button"
          id={`${idPrefix}-next`}
          aria-label="Next step"
          disabled={!canScrub || atEnd}
          onClick={() => goTo(currentStep + 1)}
          sx={stepButtonSx}
        >
          <StrokeIcon d={ICON_PATHS.next} />
        </Box>
        <Box
          component="button"
          type="button"
          id={`${idPrefix}-last`}
          aria-label="Last step"
          disabled={!canScrub || atEnd}
          onClick={() => goTo(lastIndex)}
          sx={stepButtonSx}
        >
          <StrokeIcon d={ICON_PATHS.last} />
        </Box>
      </Box>

      <Slider
        id={`${idPrefix}-slider`}
        aria-label="Step"
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
        // The mockup's `flex: 1 1 200px`: on a phone the slider takes its own row.
        sx={{ flex: "1 1 200px", minWidth: 0, mx: 1, py: "13px" }}
      />

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: "none" }}>
        <Box
          component="label"
          id={`${idPrefix}-speed-label`}
          htmlFor={`${idPrefix}-speed-input`}
          sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "text.secondary" }}
        >
          Speed
        </Box>
        <Select
          id={`${idPrefix}-speed`}
          aria-label="Playback speed"
          inputProps={{ id: `${idPrefix}-speed-input` }}
          size="small"
          value={speedValue}
          disabled={!canScrub}
          onChange={(event) => setSpeedValue(event.target.value)}
          sx={{ flexShrink: 0, minWidth: 84, backgroundColor: "surface.input" }}
        >
          {SPEED_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {/* "Step N of M:" and the step's description, one line under the controls (#303: on a
          phone, the description on its own line under it, left-aligned with it). The colon goes
          when no description was rendered (a picture with no captions). */}
      <Box
        id={`${idPrefix}-line`}
        role="status"
        aria-live="polite"
        sx={{
          flex: "1 1 100%",
          minWidth: 0,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          gap: "4px 8px",
          fontSize: "0.875rem",
          color: "text.secondary",
          [`&:has(> #${descriptionId}:empty) [data-step-colon]`]: { display: "none" },
        }}
      >
        <Box component="strong" sx={{ fontWeight: 700, color: "text.primary", flex: "none" }}>
          <Box component="span" id={`${idPrefix}-position`}>
            {positionText}
          </Box>
          <span data-step-colon="">:</span>
        </Box>
        <Box
          ref={textRef}
          id={descriptionId}
          sx={{
            flex: "1 1 0",
            minWidth: "min(100%, 240px)",
            "&:empty": { display: "none" },
            // #303: on a phone the description gets its own line, under "Step N of M:".
            [PHONE_MEDIA]: { flexBasis: "100%" },
          }}
        />
      </Box>
    </Box>
  );
}
