// components/pictures/pictureStates.js
//
// #199: the one table that turns a picture state name into a style. Every picture type Redux
// serves under `format=frames` labels its pieces with the same state names (Redux's
// `PictureState`, Interfaces/Steps/Frames.cs), never with colors, so every renderer reads its
// colors from here and the Legend lists the same entries with the same wording.
//
// The colors are theme tokens (components/themeTokens.js, `viz.state`), resolved to CSS
// variables, so they follow the light / dark theme with no work in the renderers. The dash
// patterns are the second, non-color cue for the two "faded" states, so no state is told
// apart by color alone.

import { paletteVars } from "../theme";

/**
 * Every state Redux sends, in legend order. `token` names the family in themeTokens.js
 * `viz.state`; `legend` is the key's wording; `dash` is an SVG stroke-dasharray (and a
 * dashed CSS border) for the states that are drawn faded.
 */
export const PICTURE_STATES = [
  { name: "ElementHighlight", token: "elementHighlight", legend: "Highlighted (looked at now)" },
  { name: "Solution", token: "solution", legend: "Solution (answer)" },
  // Not sent by Redux yet (a backend batch adds it): pieces an incremental solver has kept so
  // far but not confirmed (queens placed so far, items packed so far). Solution is only the
  // confirmed answer.
  { name: "Committed", token: "committed", legend: "Committed (kept so far)", dash: "6 3" },
  { name: "Covered", token: "covered", legend: "Covered (rule met)" },
  { name: "Rejected", token: "rejected", legend: "Rejected (failed or ruled out)" },
  {
    name: "Blocked",
    token: "blocked",
    legend: "Blocked (can't be picked)",
    dash: "4 3",
  },
  { name: "False", token: "false", legend: "False (assigned false)" },
  { name: "Untraveled", token: "untraveled", legend: "Untraveled (never reached)", dash: "2 3" },
  { name: "Background", token: "background", legend: "Background (nothing yet)" },
];

const BY_NAME = new Map(PICTURE_STATES.map((state) => [state.name, state]));

/**
 * Which state shows when one piece has several, strongest first. Matches Redux's own
 * `GraphSubsetFrames.Rank` (Rejected > ElementHighlight > Solution > Covered > Blocked > False),
 * with Committed just under Solution (it is the answer so far, not yet confirmed; Redux has no
 * rank for it yet) and Untraveled placed just above Background as the reference viewer does (Redux ranks it
 * with Background).
 */
export const STATE_PRECEDENCE = [
  "Rejected",
  "ElementHighlight",
  "Solution",
  "Committed",
  "Covered",
  "Blocked",
  "False",
  "Untraveled",
  "Background",
];

/** True for a name Redux sends as a picture state. */
export function isPictureState(name) {
  return BY_NAME.has(name);
}

/**
 * The state of one entry in a frame's state map (`{id: {state}}`). Redux leaves Background
 * entries out, so a missing entry, or a name this table does not know, is Background.
 */
export function stateOf(map, id) {
  const name = map?.[id]?.state;
  return isPictureState(name) ? name : "Background";
}

/** The strongest of several states, by STATE_PRECEDENCE. */
export function strongestState(states) {
  let best = "Background";
  for (const state of states) {
    if (STATE_PRECEDENCE.indexOf(state) < STATE_PRECEDENCE.indexOf(best)) best = state;
  }
  return best;
}

/**
 * A state's style, as CSS variables that follow the theme.
 * @param {string} name A picture state name; an unknown one gets Background's style.
 * @returns {{name: string, line: string, fill: string, ink: string, text: string,
 *   dash: string|undefined, legend: string}}
 */
export function pictureStateStyle(name) {
  const state = BY_NAME.get(name) ?? BY_NAME.get("Background");
  const family = paletteVars.viz.state[state.token];
  return {
    name: state.name,
    line: family.line,
    fill: family.fill,
    ink: family.ink,
    text: family.text,
    dash: state.dash,
    legend: state.legend,
  };
}

/**
 * Every state name used anywhere in a run's frames, for the Legend. Redux sends a state only
 * as a `state` field (`{state: "Solution"}`; checked over every picture type on 2026-10-14),
 * so only those count: a table cell whose text happens to read "False" is not a state. Walks
 * plain JSON; bounded by the frames' own size.
 * @param {Object[]} frames
 * @returns {Set<string>}
 */
export function statesInFrames(frames) {
  const found = new Set();
  const walk = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
    } else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (key === "state" && isPictureState(child)) found.add(child);
        else walk(child);
      }
    }
  };
  for (const frame of frames ?? []) walk(frame);
  return found;
}
