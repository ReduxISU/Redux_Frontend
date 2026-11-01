// lib/runSteps.js
//
// #252: lining up the pictures of one run by the solver step each frame was drawn from, so
// switching the Visualization Type after Run lands on the same moment of the run.
//
// Every frame of a ProblemProvider/visualizeRun picture carries `step` (ReduxISU/Redux#895): the
// 0-based index of the solver step it was drawn from, or null for a frame the picture added
// itself. A frame's place in the run (its position) is:
//   - its `step`, when it has one;
//   - for a null frame after every numbered frame (the solved or stopped frame a picture adds
//     at the end, or every frame of a picture that drew no step at all, like an answer-alone
//     picture): Infinity, after the last step of the run;
//   - for a null frame between numbered frames: just after the step before it (step + 0.5);
//   - for a null frame before every numbered frame: -0.5, before the first step.
// A picture opens on its last frame whose position is at or before the position being kept,
// or on its first frame when every frame comes later.

/** Where the run is right after Run: its end (runs open on their last frame, #250). */
export const RUN_END = Infinity;

/**
 * Each frame's place in the run (see the header).
 * @param {Object[]} frames A run picture's frames.
 * @returns {number[]}
 */
export function framePositions(frames) {
  const list = Array.isArray(frames) ? frames : [];
  const numbered = (frame) => typeof frame?.step === "number" && Number.isFinite(frame.step);
  let lastNumbered = -1;
  list.forEach((frame, index) => {
    if (numbered(frame)) lastNumbered = index;
  });
  let before = null;
  return list.map((frame, index) => {
    if (numbered(frame)) {
      before = frame.step;
      return frame.step;
    }
    if (index > lastNumbered) return RUN_END;
    return before === null ? -0.5 : before + 0.5;
  });
}

/**
 * The place in the run that frame `index` shows.
 * @param {Object[]} frames
 * @param {number} index
 * @returns {number|null} null when there is no such frame.
 */
export function framePosition(frames, index) {
  const positions = framePositions(frames);
  return index >= 0 && index < positions.length ? positions[index] : null;
}

/**
 * The frame to open a picture on to keep `position`: the last one at or before it, else the
 * first.
 * @param {Object[]} frames
 * @param {number} position
 * @returns {number} A frame index (0 for no frames).
 */
export function frameAtPosition(frames, position) {
  const positions = framePositions(frames);
  let found = 0;
  positions.forEach((value, index) => {
    if (value <= position) found = index;
  });
  return found;
}
