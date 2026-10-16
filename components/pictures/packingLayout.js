// components/pictures/packingLayout.js
//
// #207: where the Packing picture puts its pieces. A pure function of the payload: no
// randomness, no DOM, no React, so the same instance always lands in the same place, before Run
// and at every step. Ported from Redux's design mockup (Documentation/Visualizations/mockups/
// packing.js, `draw()` and `rowsFor()`), not from its parser or solvers.
//
// Items sit in a pool at the top, as tiles that wrap. Below, each container's lines are drawn
// as rows to scale: a track the items fill left to right, and a dashed line at the number the
// total is held to. A container gets one row per line it has: a target (Partition's half,
// Subset Sum's T), a limit (Knapsack's W, Bin Packing's C) or a goal on the values (Knapsack's
// V), so the knapsack has a Weight row and a Value row. Partition's two sides and Bin Packing's
// bins share one scale, so equal totals are equal lengths. A row's scale covers everything a
// run can put in it (the total of the instance) unless that would squash its line into a
// corner; then it stops a little past the line, and anything longer is cut at the track's end.
//
// The rows' label, the total read out and the line's label are on three lines (over the track,
// at its right end, and under it), so no text can meet another however long the numbers get.
// Partition also gets a balance beam under its sides that tips toward the heavier one.

/** The drawing's width, and its margin. */
const WIDTH = 480;
const PAD = 20;

/** The tracks' left end and length. */
const TRACK_X = PAD;
const TRACK_WIDTH = WIDTH - 2 * PAD;

/** An item tile's height, the gap between tiles, and a character's width at the tile's size. */
const TILE_HEIGHT = 30;
const TILE_GAP = 8;
const TILE_CHAR = 8.4;

/** A row: its label line, the track, and the line's label under it. */
const ROW_HEIGHT = 84;
export const TRACK_HEIGHT = 30;

/** A row's scale stops this far past its line when the instance's total would squash it. */
const SQUASH = 2.5;
const PAST_LINE = 1.25;

/** Partition's balance beam: its half-length and how far it tips at most, in degrees. */
const BEAM = 120;
const MAX_TILT = 14;

function round(value) {
  return Math.round(value * 10) / 10;
}

/** A number as the picture writes it: whole, or to two places (Partition's half can end in .5). */
export function formatAmount(value) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

/** About how wide `text` is at the picture's monospace sizes, in drawing units. */
export function textWidth(text, size = 12.5) {
  return String(text).length * size * 0.62;
}

/**
 * The rows a container is drawn as, one per line it has.
 * @returns {Array<{measure: "size"|"value", kind: "target"|"limit"|"atLeast", line: number,
 *   label: string, sub: string, lineLabel: string}>}
 */
function containerRows(container, rule, split) {
  const rows = [];
  const name = String(container.label ?? container.id);
  const target = typeof container.target === "number" ? container.target : null;
  const limit = typeof container.limit === "number" ? container.limit : null;
  const atLeast = typeof container.atLeast === "number" ? container.atLeast : null;
  if (target !== null) {
    const symbol = rule === "partition" ? "half" : "T";
    rows.push({
      measure: "size",
      kind: "target",
      line: target,
      label: name,
      sub: `needs ${formatAmount(target)}`,
      lineLabel: `${symbol} = ${formatAmount(target)}`,
    });
  }
  if (limit !== null) {
    const symbol = rule === "binPacking" ? "C" : "W";
    rows.push({
      measure: "size",
      kind: "limit",
      line: limit,
      label: split ? "Weight" : name,
      sub:
        rule === "binPacking" ? `holds ${formatAmount(limit)}` : `at most ${formatAmount(limit)}`,
      lineLabel: `${symbol} = ${formatAmount(limit)}`,
    });
  }
  if (atLeast !== null) {
    rows.push({
      measure: "value",
      kind: "atLeast",
      line: atLeast,
      label: split ? "Value" : name,
      sub: `at least ${formatAmount(atLeast)}`,
      lineLabel: `V = ${formatAmount(atLeast)}`,
    });
  }
  return rows;
}

/** The heading over the containers, in the instance's own terms. */
function containersHeading(payload, containers) {
  const rule = payload?.rule;
  if (rule === "binPacking") {
    const capacity = containers[0]?.limit;
    const bins = typeof payload.maxBins === "number" ? payload.maxBins : containers.length;
    return typeof capacity === "number"
      ? `BINS · CAPACITY ${formatAmount(capacity)}, AT MOST ${bins}`
      : "BINS";
  }
  if (rule === "knapsack") return "THE KNAPSACK";
  if (rule === "partition") return "TWO SIDES THAT MUST MATCH";
  if (rule === "subsetSum") return "CHOSEN ITEMS";
  return "CONTAINERS";
}

/**
 * The Packing picture's layout.
 *
 * @param {Object} payload The Packing payload.
 * @returns {{minX: number, minY: number, width: number, height: number, rule: string,
 *   grouped: boolean, poolHeading: string, containersHeading: string, containersY: number,
 *   items: Array<{id: string, index: number, label: string, size: number, value: number|null,
 *     x: number, y: number, width: number, height: number}>,
 *   containers: Array<{id: string, index: number, label: string}>,
 *   rows: Array<{key: string, container: string, containerIndex: number, measure: string,
 *     kind: string, line: number, label: string, sub: string, lineLabel: string, y: number,
 *     trackY: number, trackWidth: number, scale: number, domain: number, lineX: number,
 *     lineLabelX: number}>,
 *   beam: {x: number, y: number, half: number}|null, trackX: number, trackEnd: number}}
 */
export function layoutPacking(payload) {
  const rule = typeof payload?.rule === "string" ? payload.rule : "";
  const items = (Array.isArray(payload?.items) ? payload.items : [])
    .filter((item) => typeof item?.id === "string")
    .map((item, index) => ({
      id: item.id,
      index,
      label: String(item.label ?? item.size ?? item.id),
      size: typeof item.size === "number" ? item.size : 0,
      value: typeof item.value === "number" ? item.value : null,
    }));
  const containers = (Array.isArray(payload?.containers) ? payload.containers : [])
    .filter((container) => typeof container?.id === "string")
    .map((container, index) => ({ ...container, index }));
  // Partition's sides and Bin Packing's bins take group colors (from `assign`, an annotation).
  const grouped = rule === "partition" || rule === "binPacking";

  // The pool: tiles left to right, wrapping at the drawing's edge.
  const poolTop = 36;
  let x = PAD;
  let y = poolTop;
  const tiles = items.map((item) => {
    const width = Math.max(38, Math.ceil(item.label.length * TILE_CHAR + 20));
    if (x > PAD && x + width > WIDTH - PAD) {
      x = PAD;
      y += TILE_HEIGHT + TILE_GAP;
    }
    const tile = { ...item, x, y, width, height: TILE_HEIGHT };
    x += width + TILE_GAP;
    return tile;
  });
  const poolBottom = items.length ? y + TILE_HEIGHT : poolTop;

  // The rows, with their scales. Rows of the same measure and kind in different containers
  // (Partition's two sides, Bin Packing's bins) share the widest scale.
  const totals = {
    size: items.reduce((sum, item) => sum + Math.max(0, item.size), 0),
    value: items.reduce((sum, item) => sum + Math.max(0, item.value ?? 0), 0),
  };
  const largest = {
    size: Math.max(0, ...items.map((item) => item.size)),
    value: Math.max(0, ...items.map((item) => item.value ?? 0)),
  };
  const raw = containers.flatMap((container) =>
    containerRows(
      container,
      rule,
      typeof container.limit === "number" && container.atLeast != null,
    ).map((row, index) => ({
      ...row,
      container: container.id,
      containerIndex: container.index,
      index,
    })),
  );
  const domainOf = (row) => {
    const line = Math.max(row.line, 0);
    const total = totals[row.measure];
    if (line > 0 && total > SQUASH * line) {
      return Math.max(line * PAST_LINE, largest[row.measure] * 1.05);
    }
    return Math.max(line * 1.04, total, 1);
  };
  const shared = new Map();
  for (const row of raw) {
    const key = `${row.measure}:${row.kind}`;
    shared.set(key, Math.max(shared.get(key) ?? 0, domainOf(row)));
  }
  const containersY = poolBottom + 40;
  const rows = raw.map((row, index) => {
    const domain = grouped ? shared.get(`${row.measure}:${row.kind}`) : domainOf(row);
    const scale = TRACK_WIDTH / domain;
    const top = containersY + 16 + index * ROW_HEIGHT;
    const lineX = TRACK_X + row.line * scale;
    const halfLabel = textWidth(row.lineLabel, 12) / 2 + 2;
    return {
      ...row,
      key: `${row.container}:${row.index}`,
      y: top,
      trackY: top + 22,
      // A limit's track is the container itself, so it stops at the limit; a target's (or a
      // goal's) runs the whole length, the line marking the number to reach.
      trackWidth: row.kind === "limit" ? Math.min(TRACK_WIDTH, row.line * scale) : TRACK_WIDTH,
      scale,
      domain,
      lineX: round(lineX),
      lineLabelX: round(
        Math.min(Math.max(lineX, TRACK_X + halfLabel), TRACK_X + TRACK_WIDTH - halfLabel),
      ),
    };
  });
  let bottom = containersY + 16 + rows.length * ROW_HEIGHT;
  let beam = null;
  if (rule === "partition" && containers.length === 2) {
    beam = { x: WIDTH / 2, y: bottom + 50, half: BEAM };
    bottom += 90;
  }

  return {
    minX: 0,
    minY: 0,
    width: WIDTH,
    height: bottom + 8,
    rule,
    grouped,
    poolHeading: rule === "knapsack" ? "ITEMS · (WEIGHT, VALUE)" : "ITEMS",
    containersHeading: containersHeading(payload, containers),
    containersY,
    items: tiles,
    containers: containers.map(({ id, index, label }) => ({
      id,
      index,
      label: String(label ?? id),
    })),
    rows,
    beam,
    trackX: TRACK_X,
    trackEnd: TRACK_X + TRACK_WIDTH,
  };
}

/**
 * The pieces a frame puts in one row: each item placed in the row's container, in instance
 * order, end to end from the track's left end. A piece that runs past the row's limit is `over`;
 * one that runs past the track's end is cut there (`clipped`).
 * @param {Object} row A row of layoutPacking().
 * @param {Array} items The layout's items.
 * @param {number[]} assign The frame's container index per item (-1: left out).
 * @returns {Array<{id: string, x: number, width: number, amount: number, over: boolean,
 *   clipped: boolean}>}
 */
export function rowSegments(row, items, assign) {
  const pieces = [];
  if (!Array.isArray(assign)) return pieces;
  const end = TRACK_X + TRACK_WIDTH;
  let at = 0;
  for (const item of items) {
    if (assign[item.index] !== row.containerIndex) continue;
    const amount = row.measure === "value" ? (item.value ?? 0) : item.size;
    const from = TRACK_X + at * row.scale;
    at += Math.max(0, amount);
    if (from >= end) {
      pieces.push({
        id: item.id,
        x: end,
        width: 0,
        amount,
        over: row.kind === "limit",
        clipped: true,
      });
      continue;
    }
    const to = TRACK_X + at * row.scale;
    const width = Math.max(2, Math.min(to, end) - from);
    pieces.push({
      id: item.id,
      x: round(from),
      width: round(width),
      amount,
      over: row.kind === "limit" && at > row.line,
      clipped: to > end + 0.01,
    });
  }
  return pieces;
}

/**
 * How far Partition's beam tips for sides holding `a` and `b` (negative: toward S1, on the left).
 * @returns {number} Degrees, within ±MAX_TILT.
 */
export function beamTilt(a, b, total) {
  const tilt = ((b - a) / Math.max(1, total)) * 40;
  return Math.max(-MAX_TILT, Math.min(MAX_TILT, tilt));
}
