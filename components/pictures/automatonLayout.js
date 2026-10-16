// components/pictures/automatonLayout.js
//
// #204: where the Automaton picture (DFA, NFA) puts its pieces. A pure function of the payload:
// no randomness, no DOM, no React, so the same machine always lands in the same place, before
// Run and at every step, whichever path the steps follow. Redux layers the states itself (each
// state's `layer` is its moves from the start state; states the start can't reach share the
// layer after the last), so this only turns those into positions and arrow shapes, as Redux's
// design mockup draws them (Documentation/Visualizations/mockups/automaton.js, `draw()`), not
// from its parser or simulator.
//
// Layers run left to right DX apart; a layer's states are stacked DY apart, in payload order,
// centred on the tallest layer. An arrow is a straight line, bowed when the opposite arrow is
// drawn too, when it skips layers, or when it joins two far-apart states of one layer. A loop is
// an arc over its state. The start state gets an entry arrow from the left. A DFA with a missing
// move gets its Garbage state at the bottom right, apart from the rest, with no arrows into it.

import { outlineDistance } from "./graphLayout";

/** A state's radius, in viewBox units (bigger than a graph node: the mockup's R). */
export const STATE_RADIUS = 26;

/** Space between layers, left to right, and between the states of a layer. */
const DX = 170;
const DY = 120;

/** An arrowhead's length, in viewBox units. */
const ARROW = 10;

/** The Garbage state's height. */
export const GARBAGE_HEIGHT = 38;

function round(value) {
  return Math.round(value * 10) / 10;
}

/** A state's drawn width: a circle for up to 4 characters, a pill for longer names. */
export function stateWidth(label) {
  const text = String(label ?? "");
  return text.length > 4 ? text.length * 9 + 24 : STATE_RADIUS * 2;
}

/**
 * An arrowhead with its tip at `tip`, pointing along (dx, dy), and where the line under it
 * should stop so its end doesn't poke out of the tip.
 */
function arrowAt(tip, dx, dy) {
  const length = Math.hypot(dx, dy) || 1;
  const tx = dx / length;
  const ty = dy / length;
  const back = { x: tip.x - tx * ARROW, y: tip.y - ty * ARROW };
  const side = { x: -ty * (ARROW * 0.5), y: tx * (ARROW * 0.5) };
  return {
    points: `${round(tip.x)},${round(tip.y)} ${round(back.x + side.x)},${round(back.y + side.y)} ${round(back.x - side.x)},${round(back.y - side.y)}`,
    lineEnd: { x: tip.x - tx * ARROW * 0.6, y: tip.y - ty * ARROW * 0.6 },
  };
}

/** What an arrow's label reads: its symbols, comma separated (an arrow stands for them all). */
export function arrowText(transition) {
  if (Array.isArray(transition?.symbols) && transition.symbols.length > 0) {
    return transition.symbols.map(String).join(", ");
  }
  return String(transition?.label ?? "");
}

/**
 * The box around everything drawn (states, loops, arrow labels, the entry arrow, Garbage and its
 * note), with a margin: the mockup's canvas is at least 640 wide, and its empty sides would only
 * shrink a small machine on a phone. Never larger than that canvas.
 */
function cropBox(states, arrows, start, garbage, width, height) {
  const margin = 20;
  const R = STATE_RADIUS;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  const take = (x1, y1, x2, y2) => {
    left = Math.min(left, x1);
    top = Math.min(top, y1);
    right = Math.max(right, x2);
    bottom = Math.max(bottom, y2);
  };
  for (const state of states) {
    take(state.x - state.width / 2, state.y - R, state.x + state.width / 2, state.y + R);
  }
  for (const arrow of arrows) {
    const half = (arrow.text.length * 8 + 12) / 2;
    take(arrow.label.x - half, arrow.label.y - 10, arrow.label.x + half, arrow.label.y + 10);
  }
  if (start) {
    const first = states.find((state) => state.start);
    take(first.x - first.width / 2 - 44, first.y - 6, first.x, first.y + 6);
  }
  if (garbage) {
    take(
      garbage.x - Math.max(garbage.width, 110) / 2,
      garbage.y - GARBAGE_HEIGHT / 2,
      garbage.x + Math.max(garbage.width, 110) / 2,
      garbage.y + 41,
    );
  }
  if (!Number.isFinite(left)) return { minX: 0, minY: 0, width, height };
  const minX = Math.max(0, left - margin);
  const minY = Math.max(0, top - margin);
  return {
    minX,
    minY,
    width: Math.min(width, right + margin) - minX,
    height: Math.min(height, bottom + margin) - minY,
  };
}

/**
 * The Automaton's layout.
 *
 * @param {Object} payload The Automaton payload.
 * @returns {{minX: number, minY: number, width: number, height: number, layerCount: number,
 *   states: Array<{id: string, label: string, layer: number, x: number, y: number,
 *     width: number, start: boolean, accepting: boolean}>,
 *   arrows: Array<{id: string, a: string, b: string, loop: boolean, epsilon: boolean,
 *     path: string, arrow: string, label: {x: number, y: number}, text: string,
 *     symbols: string[]}>,
 *   start: {path: string, arrow: string}|null,
 *   garbage: {id: string, label: string, x: number, y: number, width: number,
 *     missing: Array<{state: string, symbol: string}>}|null,
 *   positions: Map<string, {x: number, y: number}>}}
 */
export function layoutAutomaton(payload) {
  const accepting = new Set(Array.isArray(payload?.accepting) ? payload.accepting : []);
  const states = (Array.isArray(payload?.states) ? payload.states : []).filter(
    (state) => typeof state?.id === "string",
  );
  const ids = new Set(states.map((state) => state.id));
  const layerOf = (state) => (Number.isInteger(state.layer) && state.layer >= 0 ? state.layer : 0);
  const layerCount = states.length ? Math.max(...states.map(layerOf)) + 1 : 1;
  const columns = Array.from({ length: layerCount }, () => []);
  for (const state of states) columns[layerOf(state)].push(state.id);
  const maxRows = Math.max(1, ...columns.map((column) => column.length));

  const garbagePayload =
    payload?.garbage && typeof payload.garbage.id === "string" ? payload.garbage : null;
  const contentWidth = 110 + (layerCount - 1) * DX + 80;
  const width = Math.max(contentWidth, 640);
  const left = (width - contentWidth) / 2;
  const rowsHeight = Math.max(250, maxRows * DY + 150);
  const height = rowsHeight + (garbagePayload ? 90 : 0);

  const positions = new Map();
  const placed = states.map((state) => {
    const layer = layerOf(state);
    const column = columns[layer];
    const row = column.indexOf(state.id);
    const x = left + 110 + layer * DX;
    const y = rowsHeight / 2 + 20 + (row - (column.length - 1) / 2) * DY;
    const label = String(state.label ?? state.id);
    positions.set(state.id, { x, y });
    return {
      id: state.id,
      label,
      layer,
      x,
      y,
      width: stateWidth(label),
      start: state.id === payload?.start,
      accepting: accepting.has(state.id),
    };
  });
  const widths = new Map(placed.map((state) => [state.id, state.width]));
  const layers = new Map(placed.map((state) => [state.id, state.layer]));

  const transitions = (Array.isArray(payload?.transitions) ? payload.transitions : []).filter(
    (transition) =>
      typeof transition?.id === "string" && ids.has(transition.a) && ids.has(transition.b),
  );
  const pairs = new Set(transitions.map((transition) => `${transition.a}\u0000${transition.b}`));
  const R = STATE_RADIUS;

  const arrows = transitions.map((transition) => {
    const a = positions.get(transition.a);
    const b = positions.get(transition.b);
    const loop = transition.a === transition.b;
    let start;
    let end;
    let into;
    let shape;
    let label;
    if (loop) {
      // An arc over the state, leaving and entering its top either side of the middle.
      const pill = widths.get(transition.a) > 2 * R;
      const spread = R * Math.sin(0.45);
      const rise = pill ? R : R * Math.cos(0.45);
      start = { x: a.x - spread, y: a.y - rise };
      end = { x: a.x + spread, y: a.y - rise };
      const c1 = { x: a.x - 42, y: a.y - R - 60 };
      const c2 = { x: a.x + 42, y: a.y - R - 60 };
      into = { x: end.x - c2.x, y: end.y - c2.y };
      shape = (to) =>
        `M${round(start.x)},${round(start.y)} C${round(c1.x)},${round(c1.y)} ${round(c2.x)},${round(c2.y)} ${round(to.x)},${round(to.y)}`;
      label = { x: a.x, y: a.y - R - 46 };
    } else {
      // Straight, or bowed: one of an opposite pair, an arrow that skips layers, or one joining
      // two far-apart states of the same layer (so it clears the states between them).
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy) || 1;
      const nx = dy / length;
      const ny = -dx / length;
      const span = Math.abs(layers.get(transition.b) - layers.get(transition.a));
      let offset = pairs.has(`${transition.b}\u0000${transition.a}`) ? 24 : 0;
      if (span > 1 || (span === 0 && Math.abs(dy) > DY * 1.5)) {
        offset = Math.max(offset, 30 + 14 * span);
      }
      const control = {
        x: (a.x + b.x) / 2 + nx * offset * 2,
        y: (a.y + b.y) / 2 + ny * offset * 2,
      };
      const fromA = { x: control.x - a.x, y: control.y - a.y };
      const fromB = { x: control.x - b.x, y: control.y - b.y };
      const lengthA = Math.hypot(fromA.x, fromA.y) || 1;
      const lengthB = Math.hypot(fromB.x, fromB.y) || 1;
      const gapA = outlineDistance(fromA.x, fromA.y, widths.get(transition.a), R);
      const gapB = outlineDistance(fromB.x, fromB.y, widths.get(transition.b), R) + 1;
      start = { x: a.x + (fromA.x / lengthA) * gapA, y: a.y + (fromA.y / lengthA) * gapA };
      end = { x: b.x + (fromB.x / lengthB) * gapB, y: b.y + (fromB.y / lengthB) * gapB };
      into = { x: end.x - control.x, y: end.y - control.y };
      shape = offset
        ? (to) =>
            `M${round(start.x)},${round(start.y)} Q${round(control.x)},${round(control.y)} ${round(to.x)},${round(to.y)}`
        : (to) => `M${round(start.x)},${round(start.y)} L${round(to.x)},${round(to.y)}`;
      // The curve's midpoint.
      label = {
        x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x,
        y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y,
      };
    }
    const arrow = arrowAt(end, into.x, into.y);
    const symbols = Array.isArray(transition.symbols) ? transition.symbols.map(String) : [];
    return {
      id: transition.id,
      a: transition.a,
      b: transition.b,
      loop,
      epsilon: transition.epsilon === true,
      path: shape(arrow.lineEnd),
      arrow: arrow.points,
      label,
      text: arrowText(transition),
      symbols,
    };
  });

  // The entry arrow into the start state, from the left.
  const first = placed.find((state) => state.start) ?? null;
  let start = null;
  if (first) {
    const tip = { x: first.x - first.width / 2 - 1, y: first.y };
    const from = { x: tip.x - 41, y: tip.y };
    const arrow = arrowAt(tip, 1, 0);
    start = {
      path: `M${round(from.x)},${round(from.y)} L${round(arrow.lineEnd.x)},${round(arrow.lineEnd.y)}`,
      arrow: arrow.points,
    };
  }

  // The Garbage state, apart at the bottom right with no arrows into it.
  let garbage = null;
  if (garbagePayload) {
    const label = String(garbagePayload.label ?? "Garbage");
    garbage = {
      id: garbagePayload.id,
      label,
      x: Math.max(left + contentWidth - 80, left + 160),
      y: height - 52,
      width: Math.max(96, label.length * 8 + 28),
      missing: (Array.isArray(garbagePayload.missing) ? garbagePayload.missing : []).filter(
        (move) => typeof move?.state === "string",
      ),
    };
  }

  return {
    ...cropBox(placed, arrows, start, garbage, width, height),
    layerCount,
    states: placed,
    arrows,
    start,
    garbage,
    positions,
  };
}
