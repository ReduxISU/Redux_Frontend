// tests/e2e/run-steps.spec.js
//
// #252: lib/runSteps.js on its own, with no page: where each frame sits in the run, and which
// frame keeps a place in the run when the Visualization Type changes. This repo has no unit
// runner, so these run under Playwright like the rest of the suite.

import { expect, test } from "@playwright/test";
import { frameAtPosition, framePosition, framePositions, RUN_END } from "../../lib/runSteps";

const frames = (...steps) => steps.map((step) => ({ step }));

test("numbered frames sit at their step; null frames after every step come after the run", () => {
  expect(framePositions(frames(0, 1, 2))).toEqual([0, 1, 2]);
  expect(framePositions(frames(0, 1, 2, null))).toEqual([0, 1, 2, RUN_END]);
  // An answer-alone picture (one frame, no step) is the end of the run.
  expect(framePositions(frames(null))).toEqual([RUN_END]);
  // Between steps: just after the step before it. Before every step: before the first.
  expect(framePositions(frames(null, 0, null, 3))).toEqual([-0.5, 0, 0.5, 3]);
  // A frame with no `step` at all counts as null.
  expect(framePositions([{}, { step: 1 }])).toEqual([-0.5, 1]);
  expect(framePositions(undefined)).toEqual([]);
  expect(framePosition(frames(0, 1), 1)).toBe(1);
  expect(framePosition(frames(0, 1), 5)).toBeNull();
});

test("a picture opens on its last frame at or before the kept place, else its first", () => {
  // The same step.
  expect(frameAtPosition(frames(0, 1, 2), 1)).toBe(1);
  // The nearest step before a missing one.
  expect(frameAtPosition(frames(0, 2, 4), 3)).toBe(1);
  // Right after Run (the end): the last frame, a solved frame included.
  expect(frameAtPosition(frames(0, 1, 2), RUN_END)).toBe(2);
  expect(frameAtPosition(frames(0, 1, 2, null), RUN_END)).toBe(3);
  // A solved frame is after the last step, so the last step's place doesn't reach it.
  expect(frameAtPosition(frames(0, 1, 2, null), 2)).toBe(2);
  // Every frame later than the place: the first.
  expect(frameAtPosition(frames(3, 4), 1)).toBe(0);
  expect(frameAtPosition(frames(null), 1)).toBe(0);
  expect(frameAtPosition([], 1)).toBe(0);
});
