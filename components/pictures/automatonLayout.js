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

/** How many points along an arrow the collision checks look at. */
const SAMPLES = 24;

/** The loop directions tried, in order (degrees, 0 = right, -90 = up): up first, as the mockup. */
const LOOP_ANGLES = [-90, 90, 0, 180, -45, -135, 45, 135];

/** A label's box: its pill, padded so two labels never touch. */
function labelBox(label, text, pad = 3) {
  const half = (text.length * 8 + 12) / 2;
  return {
    x1: label.x - half - pad,
    y1: label.y - 10 - pad,
    x2: label.x + half + pad,
    y2: label.y + 10 + pad,
  };
}

function boxesMeet(a, b) {
  return a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
}

function inBox(point, box) {
  return point.x > box.x1 && point.x < box.x2 && point.y > box.y1 && point.y < box.y2;
}

/** True when a box meets a state's body (a circle, or a pill), grown by `pad`. */
function boxMeetsState(box, state, pad) {
  const half = Math.max(state.width / 2 - STATE_RADIUS, 0);
  const left = state.x - half;
  const right = state.x + half;
  // A point of the body's centre segment nearest the box, then the box's point nearest it.
  let x = Math.min(Math.max(box.x1, left), right);
  if (right < box.x1) x = right;
  else if (left > box.x2) x = left;
  const nearX = Math.min(Math.max(x, box.x1), box.x2);
  const nearY = Math.min(Math.max(state.y, box.y1), box.y2);
  return Math.hypot(nearX - x, nearY - state.y) < STATE_RADIUS + pad;
}

function pointInState(point, state, pad) {
  const half = Math.max(state.width / 2 - STATE_RADIUS, 0);
  const segX = Math.min(Math.max(point.x, state.x - half), state.x + half);
  return Math.hypot(point.x - segX, point.y - state.y) < STATE_RADIUS + pad;
}

function segmentsCross(p1, p2, q1, q2) {
  const side = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = side(q1, q2, p1);
  const d2 = side(q1, q2, p2);
  const d3 = side(p1, p2, q1);
  const d4 = side(p1, p2, q2);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/**
 * True when two arrows cross away from the states: arrows that share a state meet at its
 * outline anyway, so the stretches within a little of any state don't count.
 */
function crosses(points, others, states) {
  const free = (point) => !states.some((state) => pointInState(point, state, 10));
  for (let i = 1; i < points.length; i += 1) {
    if (!free(points[i - 1]) || !free(points[i])) continue;
    for (let j = 1; j < others.length; j += 1) {
      if (!free(others[j - 1]) || !free(others[j])) continue;
      if (segmentsCross(points[i - 1], points[i], others[j - 1], others[j])) return true;
    }
  }
  return false;
}

/** A straight or bowed arrow from a to b (`offset` bows it to the left of travel). */
function lineShape(a, b, widthA, widthB, offset) {
  const R = STATE_RADIUS;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = dy / length;
  const ny = -dx / length;
  const control = {
    x: (a.x + b.x) / 2 + nx * offset * 2,
    y: (a.y + b.y) / 2 + ny * offset * 2,
  };
  const fromA = { x: control.x - a.x, y: control.y - a.y };
  const fromB = { x: control.x - b.x, y: control.y - b.y };
  const lengthA = Math.hypot(fromA.x, fromA.y) || 1;
  const lengthB = Math.hypot(fromB.x, fromB.y) || 1;
  const gapA = outlineDistance(fromA.x, fromA.y, widthA, R);
  const gapB = outlineDistance(fromB.x, fromB.y, widthB, R) + 1;
  const start = { x: a.x + (fromA.x / lengthA) * gapA, y: a.y + (fromA.y / lengthA) * gapA };
  const end = { x: b.x + (fromB.x / lengthB) * gapB, y: b.y + (fromB.y / lengthB) * gapB };
  const points = [];
  for (let step = 0; step <= SAMPLES; step += 1) {
    const t = step / SAMPLES;
    const u = 1 - t;
    points.push({
      x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
      y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
    });
  }
  return {
    loop: false,
    offset,
    end,
    into: { x: end.x - control.x, y: end.y - control.y },
    path: offset
      ? (to) =>
          `M${round(start.x)},${round(start.y)} Q${round(control.x)},${round(control.y)} ${round(to.x)},${round(to.y)}`
      : (to) => `M${round(start.x)},${round(start.y)} L${round(to.x)},${round(to.y)}`,
    // The curve's midpoint.
    label: {
      x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x,
      y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y,
    },
    points,
  };
}

/**
 * A loop on a state, on the side `angle` points to: the mockup's loop over the state's top,
 * turned to that side. It leaves and re-enters the outline either side of that direction.
 */
function loopShape(a, width, angle) {
  const R = STATE_RADIUS;
  const radians = (angle * Math.PI) / 180;
  const d = { x: Math.cos(radians), y: Math.sin(radians) };
  const p = { x: -d.y, y: d.x };
  const spread = R * Math.sin(0.45);
  const outline = outlineDistance(d.x, d.y, width, R);
  const pill = width > 2 * R;
  const rise = pill && Math.abs(d.y) > 0.99 ? R : outline - (R - R * Math.cos(0.45));
  const at = (along, side) => ({
    x: a.x + d.x * along + p.x * side,
    y: a.y + d.y * along + p.y * side,
  });
  const start = at(rise, -spread);
  const end = at(rise, spread);
  const c1 = at(outline + 60, -42);
  const c2 = at(outline + 60, 42);
  const points = [];
  for (let step = 0; step <= SAMPLES; step += 1) {
    const t = step / SAMPLES;
    const u = 1 - t;
    points.push({
      x: u ** 3 * start.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t ** 3 * end.x,
      y: u ** 3 * start.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t ** 3 * end.y,
    });
  }
  return {
    loop: true,
    angle,
    end,
    into: { x: end.x - c2.x, y: end.y - c2.y },
    path: (to) =>
      `M${round(start.x)},${round(start.y)} C${round(c1.x)},${round(c1.y)} ${round(c2.x)},${round(c2.y)} ${round(to.x)},${round(to.y)}`,
    label: at(outline + 46, 0),
    points,
  };
}

/**
 * Every arrow's shape, chosen so the picture stays readable: each arrow starts as the mockup
 * draws it (straight; bowed when one of an opposite pair, when it skips layers or when it joins
 * far-apart states of one layer; a loop over its state's top), and then, a few rounds over in
 * payload order, each arrow takes whichever of its shapes collides least with everything else:
 *   - a loop tries each side of its state (up first), and prefers the side with the most room;
 *   - any other arrow tries its mockup bow, then bigger bows either side (one of an opposite
 *     pair stays on its own side, so the pair stays apart).
 * A collision is a label box meeting another label, a state, Garbage, the entry arrow or
 * another arrow's line, an arrow running through a state or another arrow's label, or a label
 * leaving the canvas; an arrow crossing another away from the states, or running close by a
 * state it doesn't join, costs a little too. A shape the mockup would draw wins any tie, then the smaller bend. A pure
 * function of the payload, so positions match before Run and at every step.
 */
function placeArrows({
  transitions,
  placed,
  positions,
  widths,
  layers,
  garbage,
  start,
  width,
  height,
}) {
  const pairs = new Set(transitions.map((transition) => `${transition.a}\u0000${transition.b}`));
  const texts = transitions.map((transition) => arrowText(transition));
  const obstacles = [];
  if (garbage) {
    obstacles.push({
      x1: garbage.x - garbage.width / 2,
      y1: garbage.y - GARBAGE_HEIGHT / 2,
      x2: garbage.x + garbage.width / 2,
      y2: garbage.y + 41,
    });
  }
  if (start) obstacles.push(start.box);

  const candidates = transitions.map((transition) => {
    const a = positions.get(transition.a);
    const b = positions.get(transition.b);
    if (transition.a === transition.b) {
      return LOOP_ANGLES.map((angle, rank) => ({
        shape: loopShape(a, widths.get(transition.a), angle),
        bias: rank * 0.01,
      }));
    }
    const pair = pairs.has(`${transition.b}\u0000${transition.a}`);
    const span = Math.abs(layers.get(transition.b) - layers.get(transition.a));
    let base = pair ? 24 : 0;
    if (span > 1 || (span === 0 && Math.abs(b.y - a.y) > DY * 1.5)) {
      base = Math.max(base, 30 + 14 * span);
    }
    const offsets = [base];
    for (const step of [24, 40, 60, 85, 115]) {
      for (const sign of pair ? [1] : [1, -1]) {
        const offset = sign * Math.max(step, base > 0 ? base + step - 24 : step);
        if (!offsets.includes(offset)) offsets.push(offset);
      }
    }
    return offsets.map((offset) => ({
      shape: lineShape(a, b, widths.get(transition.a), widths.get(transition.b), offset),
      bias: Math.abs(offset - base) / 100,
    }));
  });

  const chosen = candidates.map((list) => list[0].shape);

  const cost = (index, shape) => {
    const transition = transitions[index];
    const box = labelBox(shape.label, texts[index]);
    let total = 0;
    if (box.x1 < 0 || box.y1 < 0 || box.x2 > width || box.y2 > height) total += 10;
    for (const state of placed) {
      if (boxMeetsState(box, state, 3)) total += 10;
      if (state.id === transition.a || state.id === transition.b) continue;
      if (shape.points.some((point) => pointInState(point, state, 4))) total += 6;
      // Crowding: a loop or a bow that runs close by another state.
      else if (shape.points.some((point) => pointInState(point, state, 16))) total += 2;
    }
    for (const obstacle of obstacles) {
      if (boxesMeet(box, obstacle)) total += 10;
      if (shape.points.some((point) => inBox(point, obstacle))) total += 6;
    }
    if (shape.loop) {
      // A loop points away from its neighbours: the closer its label comes to another state or
      // to another arrow, the more it costs, so it takes the side with the most room.
      let room = Number.POSITIVE_INFINITY;
      for (const state of placed) {
        if (state.id === transition.a) continue;
        room = Math.min(room, Math.hypot(state.x - shape.label.x, state.y - shape.label.y));
      }
      chosen.forEach((other, j) => {
        if (j === index) return;
        for (const point of other.points) {
          room = Math.min(room, Math.hypot(point.x - shape.label.x, point.y - shape.label.y) + 40);
        }
      });
      total += Math.max(0, 130 - room) / 40;
    }
    chosen.forEach((other, j) => {
      if (j === index) return;
      const otherBox = labelBox(other.label, texts[j]);
      if (boxesMeet(box, otherBox)) total += 10;
      if (other.points.some((point) => inBox(point, box))) total += 4;
      if (shape.points.some((point) => inBox(point, otherBox))) total += 4;
      if (crosses(shape.points, other.points, placed)) total += 2;
    });
    return total;
  };

  for (let round = 0; round < 4; round += 1) {
    let changed = false;
    candidates.forEach((list, index) => {
      let best = chosen[index];
      let bestScore = Number.POSITIVE_INFINITY;
      for (const { shape, bias } of list) {
        const score = cost(index, shape) + bias;
        if (score < bestScore - 1e-9) {
          best = shape;
          bestScore = score;
        }
      }
      if (best !== chosen[index]) {
        chosen[index] = best;
        changed = true;
      }
    });
    if (!changed) break;
  }
  return chosen;
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
    for (const point of arrow.points ?? []) take(point.x, point.y, point.x, point.y);
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
      box: { x1: from.x, y1: tip.y - 6, x2: tip.x, y2: tip.y + 6 },
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

  const transitions = (Array.isArray(payload?.transitions) ? payload.transitions : []).filter(
    (transition) =>
      typeof transition?.id === "string" && ids.has(transition.a) && ids.has(transition.b),
  );
  const shaped = placeArrows({
    transitions,
    placed,
    positions,
    widths,
    layers,
    garbage,
    start,
    width,
    height,
  });
  const arrows = transitions.map((transition, index) => {
    const shape = shaped[index];
    const arrow = arrowAt(shape.end, shape.into.x, shape.into.y);
    const symbols = Array.isArray(transition.symbols) ? transition.symbols.map(String) : [];
    return {
      id: transition.id,
      a: transition.a,
      b: transition.b,
      loop: shape.loop,
      epsilon: transition.epsilon === true,
      path: shape.path(arrow.lineEnd),
      arrow: arrow.points,
      label: shape.label,
      text: arrowText(transition),
      symbols,
      points: shape.points,
    };
  });

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
