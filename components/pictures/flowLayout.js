// components/pictures/flowLayout.js
//
// #206: where the Flow Network picture puts its pieces. A pure function of the payload: no
// randomness, no DOM, no React, so the same network always lands in the same place, before Run
// and at every step. Redux does the columns itself (each node's `layer`, its hop distance from
// the source, the source first and the sink last, and its `row` in the column), so this only
// turns those into positions and edge shapes, as Redux's design mockup draws them
// (Documentation/Visualizations/mockups/flow.js, `layout()` and `arc()`), not from its parser or
// solver.
//
// The columns are spread evenly across the canvas, the source's at the left edge and the sink's
// at the right; a column's nodes are stacked DY apart and centred. An edge is a straight line,
// bowed when the opposite edge is drawn too or when the straight line would pass through
// another node. Each edge also has its backward arc ready (bowed further, from its head back to
// its tail), drawn when an augmenting path sends flow back against the edge.

import { outlineDistance } from "./graphLayout";

/** A node's radius, in viewBox units (the mockup's NR). */
export const FLOW_RADIUS = 21;

/** The canvas width, and the space between rows of a column. */
const WIDTH = 700;
const DY = 110;

/** An arrowhead's length, in viewBox units. */
const ARROW = 9;

function round(value) {
  return Math.round(value * 10) / 10;
}

/** A node's drawn width: a circle for up to 3 characters, a pill for longer names. */
export function flowNodeWidth(label) {
  const text = String(label ?? "");
  return text.length > 3 ? text.length * 8 + 24 : FLOW_RADIUS * 2;
}

/** The distance from point p to the segment a-b. */
function segmentDistance(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** A point on the quadratic from a through control to b, at t. */
function quadraticAt(a, control, b, t) {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * control.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * control.y + t * t * b.y,
  };
}

/** How close an edge from a to b bowed by `offset` comes to any of `nodes`. */
function clearance(nodes, a, b, offset) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const control = {
    x: (a.x + b.x) / 2 + (dy / length) * offset * 2,
    y: (a.y + b.y) / 2 + (-dx / length) * offset * 2,
  };
  let nearest = Number.POSITIVE_INFINITY;
  for (let step = 1; step < 20; step += 1) {
    const point = quadraticAt(a, control, b, step / 20);
    for (const node of nodes)
      nearest = Math.min(nearest, Math.hypot(node.x - point.x, node.y - point.y));
  }
  return nearest;
}

/**
 * The box around the nodes (with their source / sink tags), the edge labels and the backward
 * arcs' labels, with a margin, inside the mockup's canvas: the canvas is at least 300 high, and
 * its empty top and bottom would only shrink a one-row network.
 */
function cropBox(nodes, edges, height) {
  const margin = 24;
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
  for (const node of nodes) {
    take(
      node.x - node.width / 2,
      node.y - FLOW_RADIUS,
      node.x + node.width / 2,
      node.y + FLOW_RADIUS + 22,
    );
  }
  for (const edge of edges) {
    for (const point of [edge.label, edge.back.label]) {
      take(point.x - 40, point.y - 12, point.x + 40, point.y + 12);
    }
  }
  if (!Number.isFinite(left)) return { minX: 0, minY: 0, width: WIDTH, height };
  const minX = Math.max(0, left - margin);
  const minY = Math.max(0, top - margin);
  return {
    minX,
    minY,
    width: Math.min(WIDTH, right + margin) - minX,
    height: Math.min(height, bottom + margin) - minY,
  };
}

/**
 * An arc from a to b bowed by `offset` to the left of travel (straight when 0), its ends trimmed
 * to the node outlines, with its arrowhead at b and the point for its label (nearer a, as the
 * mockup puts it, so the labels of an opposite pair don't meet in the middle).
 */
function arc(a, b, widthA, widthB, offset) {
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
  const gapA = outlineDistance(fromA.x, fromA.y, widthA, FLOW_RADIUS);
  const gapB = outlineDistance(fromB.x, fromB.y, widthB, FLOW_RADIUS) + 2;
  const start = { x: a.x + (fromA.x / lengthA) * gapA, y: a.y + (fromA.y / lengthA) * gapA };
  const tip = { x: b.x + (fromB.x / lengthB) * gapB, y: b.y + (fromB.y / lengthB) * gapB };
  // The arrowhead points along the last stretch, its tip on the outline.
  const into = { x: tip.x - control.x, y: tip.y - control.y };
  const intoLength = Math.hypot(into.x, into.y) || 1;
  const tx = into.x / intoLength;
  const ty = into.y / intoLength;
  const back = { x: tip.x - tx * ARROW, y: tip.y - ty * ARROW };
  const side = { x: -ty * (ARROW * 0.5), y: tx * (ARROW * 0.5) };
  const end = { x: tip.x - tx * ARROW * 0.6, y: tip.y - ty * ARROW * 0.6 };
  const path = offset
    ? `M${round(start.x)},${round(start.y)} Q${round(control.x)},${round(control.y)} ${round(end.x)},${round(end.y)}`
    : `M${round(start.x)},${round(start.y)} L${round(end.x)},${round(end.y)}`;
  return {
    path,
    arrow: `${round(tip.x)},${round(tip.y)} ${round(back.x + side.x)},${round(back.y + side.y)} ${round(back.x - side.x)},${round(back.y - side.y)}`,
    label: {
      x: 0.49 * start.x + 0.42 * control.x + 0.09 * tip.x,
      y: 0.49 * start.y + 0.42 * control.y + 0.09 * tip.y,
    },
  };
}

/**
 * The Flow Network's layout.
 *
 * @param {Object} payload The Flow Network payload.
 * @returns {{minX: number, minY: number, width: number, height: number, columnCount: number,
 *   nodes: Array<{id: string, label: string, layer: number, row: number, x: number, y: number,
 *     width: number, role: "source"|"sink"|null}>,
 *   edges: Array<{id: string, a: string, b: string, capacity: number, parts: string|null,
 *     path: string, arrow: string, label: {x: number, y: number},
 *     back: {path: string, arrow: string, label: {x: number, y: number}}}>,
 *   positions: Map<string, {x: number, y: number}>}}
 */
export function layoutFlow(payload) {
  const nodes = (Array.isArray(payload?.nodes) ? payload.nodes : []).filter(
    (node) => typeof node?.id === "string",
  );
  const ids = new Set(nodes.map((node) => node.id));
  const layerOf = (node) => (Number.isInteger(node.layer) && node.layer >= 0 ? node.layer : 0);
  const columnCount = nodes.length ? Math.max(...nodes.map(layerOf)) + 1 : 1;
  // How many nodes each column holds: the payload's `layers`, or counted from the nodes.
  const counts = Array.from({ length: columnCount }, (_, layer) =>
    Array.isArray(payload?.layers?.[layer])
      ? payload.layers[layer].length
      : nodes.filter((node) => layerOf(node) === layer).length,
  );
  const last = Math.max(1, columnCount - 1);
  const rows = Math.max(1, ...counts);
  const height = Math.max(300, rows * DY + 140);

  const positions = new Map();
  const placed = nodes.map((node) => {
    const layer = layerOf(node);
    const row = Number.isInteger(node.row) ? node.row : 0;
    const count = counts[layer] || 1;
    const x = 70 + (layer * (WIDTH - 140)) / last;
    const y = height / 2 + 6 + (row - (count - 1) / 2) * DY;
    const label = String(node.label ?? node.id);
    positions.set(node.id, { x, y });
    let role = null;
    if (node.id === payload?.source) role = "source";
    else if (node.id === payload?.sink) role = "sink";
    return { id: node.id, label, layer, row, x, y, width: flowNodeWidth(label), role };
  });
  const widths = new Map(placed.map((node) => [node.id, node.width]));

  const edges = (Array.isArray(payload?.edges) ? payload.edges : []).filter(
    (edge) => typeof edge?.id === "string" && ids.has(edge.a) && ids.has(edge.b),
  );
  const pairs = new Set(edges.map((edge) => `${edge.a}\u0000${edge.b}`));
  const shaped = edges.map((edge) => {
    const a = positions.get(edge.a);
    const b = positions.get(edge.b);
    const pair = pairs.has(`${edge.b} ${edge.a}`);
    let offset = pair ? 22 : 0;
    // A straight line through another node would hide it: bow around it. The mockup always
    // bows to the left of travel; here the side whose curve keeps further from the other nodes
    // is taken (the left on a tie, and always for one of an opposite pair, which the pair's own
    // bow keeps apart), so a bowed edge doesn't run through the node it was bowed to avoid.
    const others = placed.filter((node) => node.id !== edge.a && node.id !== edge.b);
    const blocked = others.some((node) => segmentDistance(node, a, b) < FLOW_RADIUS + 10);
    if (blocked) {
      offset = Math.max(offset, 34);
      if (!pair && clearance(others, a, b, -offset) > clearance(others, a, b, offset)) {
        offset = -offset;
      }
    }
    const forward = arc(a, b, widths.get(edge.a), widths.get(edge.b), offset);
    // The backward arc bows further, on the other side of the edge.
    const backOffset = offset < 0 ? offset - 26 : offset + 26;
    return {
      id: edge.id,
      a: edge.a,
      b: edge.b,
      capacity: Number.isFinite(edge.capacity) ? edge.capacity : 0,
      parts: typeof edge.label === "string" ? edge.label : null,
      ...forward,
      back: arc(b, a, widths.get(edge.b), widths.get(edge.a), backOffset),
    };
  });

  return {
    ...cropBox(placed, shaped, height),
    columnCount,
    nodes: placed,
    edges: shaped,
    positions,
  };
}
