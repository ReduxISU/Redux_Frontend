// components/pictures/layeredLayout.js
//
// #205: where the Layered Graph picture puts its pieces. A pure function of the payload: no
// randomness, no DOM, no React, so the same graph always lands in the same place, before Run and
// at every step. Redux does the ranking itself (each node's `layer` and `row`, and which edges
// point `back`), so this only turns those into positions and edge shapes, as Redux's design
// mockup draws them (Documentation/Visualizations/mockups/layered.js, `layout()` and
// `edgeGeom()`), not from its parser or solvers.
//
// Layers run left to right DX apart; a layer's nodes are stacked DY apart and centred on the
// tallest layer. A forward edge is a straight line, bowed when it skips layers (so it clears the
// nodes between) or when the opposite edge is drawn too. A back edge leaves its tail's bottom,
// runs under the rows and comes up into its head. A loop is a small arc over its node.

import { NODE_RADIUS, nodeWidth, outlineDistance } from "./graphLayout";

/** Space between layers, left to right, and between rows of a layer. */
const DX = 150;
const DY = 84;

/** The top of the rows: room above them for finish numbers and source / target tags. */
const TOP = 70;

/** An arrowhead's length, in viewBox units. */
const ARROW = 10;

function round(value) {
  return Math.round(value * 10) / 10;
}

function formatWeight(weight) {
  return Number.isInteger(weight) ? String(weight) : String(Math.round(weight * 100) / 100);
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

/**
 * The Layered Graph's layout.
 *
 * @param {Object} payload The Layered Graph payload.
 * @returns {{minX: number, minY: number, width: number, height: number, directed: boolean,
 *   nodes: Array<{id: string, label: string, layer: number, row: number, x: number, y: number,
 *     width: number}>,
 *   edges: Array<{id: string, a: string, b: string, back: boolean, loop: boolean, path: string,
 *     arrow: string|null, label: {x: number, y: number}, tag: string|null}>,
 *   positions: Map<string, {x: number, y: number}>, layerCount: number}}
 */
export function layoutLayered(payload) {
  const directed = payload?.directed !== false;
  const nodes = (Array.isArray(payload?.nodes) ? payload.nodes : []).filter(
    (node) => typeof node?.id === "string",
  );
  const ids = new Set(nodes.map((node) => node.id));
  const layerOf = (node) => (Number.isInteger(node.layer) && node.layer >= 0 ? node.layer : 0);
  const layerCount = nodes.length ? Math.max(...nodes.map(layerOf)) + 1 : 0;
  // How many nodes each layer holds: the payload's `layers`, or counted from the nodes.
  const counts = Array.from({ length: layerCount }, (_, layer) =>
    Array.isArray(payload?.layers?.[layer])
      ? payload.layers[layer].length
      : nodes.filter((node) => layerOf(node) === layer).length,
  );
  const lastLayer = Math.max(0, layerCount - 1);
  const rows = Math.max(1, ...counts);
  const rowsHeight = rows * DY;
  const bottom = TOP + rowsHeight;

  const edges = (Array.isArray(payload?.edges) ? payload.edges : []).filter(
    (edge) => typeof edge?.id === "string" && ids.has(edge.a) && ids.has(edge.b),
  );
  const backCount = edges.filter((edge) => edge.back === true).length;
  const width = Math.max(640, 200 + lastLayer * DX);
  const height = TOP + rowsHeight + 40 + (backCount ? 30 + 14 * Math.min(backCount, 4) : 0);
  const left = (width - lastLayer * DX) / 2;

  const positions = new Map();
  const placed = nodes.map((node) => {
    const layer = layerOf(node);
    const row = Number.isInteger(node.row) ? node.row : 0;
    const count = counts[layer] || 1;
    const x = left + layer * DX;
    const y = TOP + rowsHeight / 2 + (row - (count - 1) / 2) * DY;
    const label = String(node.label ?? node.id);
    positions.set(node.id, { x, y });
    return { id: node.id, label, layer, row, x, y, width: nodeWidth(label) };
  });
  const widths = new Map(placed.map((node) => [node.id, node.width]));
  const layers = new Map(placed.map((node) => [node.id, node.layer]));
  const pairs = new Set(
    edges.filter((edge) => !edge.back).map((edge) => `${edge.a}\u0000${edge.b}`),
  );

  let backIndex = 0;
  const shaped = edges.map((edge) => {
    const a = positions.get(edge.a);
    const b = positions.get(edge.b);
    const loop = edge.a === edge.b;
    const back = edge.back === true;
    const tag =
      typeof edge.label === "string"
        ? edge.label
        : typeof edge.weight === "number"
          ? formatWeight(edge.weight)
          : null;
    const index = back ? backIndex++ : 0;
    let start;
    let end;
    let label;
    let into;
    let shape;
    if (loop) {
      // A small arc over the node, leaving and entering its top.
      const top = a.y - NODE_RADIUS;
      start = { x: a.x - 9, y: top + 2 };
      end = { x: a.x + 9, y: top + 2 };
      const c1 = { x: a.x - 34, y: top - 46 };
      const c2 = { x: a.x + 34, y: top - 46 };
      into = { x: end.x - c2.x, y: end.y - c2.y };
      shape = (to) =>
        `M${round(start.x)},${round(start.y)} C${round(c1.x)},${round(c1.y)} ${round(c2.x)},${round(c2.y)} ${round(to.x)},${round(to.y)}`;
      label = { x: a.x, y: top - 34 };
    } else if (back) {
      // Out of the tail's bottom, under the rows, and up into the head.
      const under = bottom + 18 + 14 * (index % 4);
      start = { x: a.x, y: a.y + NODE_RADIUS };
      end = { x: b.x, y: b.y + NODE_RADIUS + 1 };
      const c1 = { x: a.x, y: under };
      const c2 = { x: b.x, y: under };
      into = { x: end.x - c2.x, y: end.y - c2.y };
      shape = (to) =>
        `M${round(start.x)},${round(start.y)} C${round(c1.x)},${round(c1.y)} ${round(c2.x)},${round(c2.y)} ${round(to.x)},${round(to.y)}`;
      // The curve's midpoint.
      label = { x: (a.x + b.x) / 2, y: (start.y + 6 * under + end.y) / 8 };
    } else {
      // Straight, or bowed when the opposite edge is drawn too or the edge skips layers.
      const pair = directed && pairs.has(`${edge.b}\u0000${edge.a}`);
      const span = Math.abs(layers.get(edge.b) - layers.get(edge.a));
      let offset = pair ? 18 : 0;
      if (span > 1) offset = Math.max(offset, 22 + 10 * span);
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
      const gapA = outlineDistance(fromA.x, fromA.y, widths.get(edge.a));
      const gapB = outlineDistance(fromB.x, fromB.y, widths.get(edge.b)) + 1;
      start = { x: a.x + (fromA.x / lengthA) * gapA, y: a.y + (fromA.y / lengthA) * gapA };
      end = { x: b.x + (fromB.x / lengthB) * gapB, y: b.y + (fromB.y / lengthB) * gapB };
      into = { x: end.x - control.x, y: end.y - control.y };
      shape = offset
        ? (to) =>
            `M${round(start.x)},${round(start.y)} Q${round(control.x)},${round(control.y)} ${round(to.x)},${round(to.y)}`
        : (to) => `M${round(start.x)},${round(start.y)} L${round(to.x)},${round(to.y)}`;
      label = {
        x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x,
        y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y,
      };
    }
    const arrow = directed ? arrowAt(end, into.x, into.y) : null;
    return {
      id: edge.id,
      a: edge.a,
      b: edge.b,
      back,
      loop,
      path: shape(arrow ? arrow.lineEnd : end),
      arrow: arrow ? arrow.points : null,
      label,
      tag,
    };
  });

  return {
    minX: 0,
    minY: 0,
    width,
    height,
    directed,
    nodes: placed,
    edges: shaped,
    positions,
    layerCount,
  };
}
