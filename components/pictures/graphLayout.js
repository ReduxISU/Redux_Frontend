// components/pictures/graphLayout.js
//
// #201: where the Graph picture puts its nodes. Pure functions of the payload: no randomness,
// no DOM, no React, so the same instance always lands in the same place (Redux's
// PICTURE-TYPES.md: "Layout. Deterministic"). Ported from the design mockup's math
// (Documentation/Visualizations/mockups/graphbase.js `layout()`), not from its parsers or
// solvers.

/** Node radius, in viewBox units. */
export const NODE_RADIUS = 19;

/** Width of a node drawn for `label`: a circle for up to 3 characters, a pill for longer ones. */
export function nodeWidth(label) {
  const text = String(label ?? "");
  return text.length > 3 ? text.length * 8 + 22 : NODE_RADIUS * 2;
}

/**
 * Places a graph's nodes in a W x H box.
 *   - "circle": evenly round a circle, the first node at the top, in payload order.
 *   - "force": a Fruchterman-Reingold spring layout seeded from that circle and run for a fixed
 *     number of rounds, so it is deterministic. Small graphs (2 nodes or fewer) stay on the
 *     circle.
 * The result is scaled into the box with room for the widest node, and centred.
 *
 * @param {Object} graph
 * @param {string[]} graph.nodes Node ids, in payload order.
 * @param {Array<{a: string, b: string}>} graph.edges Edges by their end ids.
 * @param {number[]} graph.widths Each node's drawn width, in the same order as `nodes`.
 * @param {"force"|"circle"} mode
 * @returns {{minX: number, minY: number, width: number, height: number,
 *   positions: Map<string, {x: number, y: number}>}} The viewBox (cropped to the drawing) and
 *   each node's centre.
 */
export function layoutGraph({ nodes, edges, widths }, mode) {
  const width = 680;
  const height = nodes.length > 9 ? 560 : 480;
  const n = nodes.length;
  const positions = new Map();
  if (n === 0) return { minX: 0, minY: 0, width, height, positions };

  const index = new Map(nodes.map((id, i) => [id, i]));
  let pos = nodes.map((_, i) => ({
    x: Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
    y: Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
  }));

  if (mode === "force" && n > 2) {
    pos = pos.map((p) => ({ x: p.x * 100, y: p.y * 100 }));
    const k = Math.sqrt((width * height) / n) * 0.42;
    let temperature = 60;
    for (let round = 0; round < 450; round += 1) {
      const push = pos.map(() => ({ x: 0, y: 0 }));
      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          const dx = pos[i].x - pos[j].x;
          const dy = pos[i].y - pos[j].y;
          const dist = Math.max(0.5, Math.hypot(dx, dy));
          const force = (k * k) / dist;
          push[i].x += (dx / dist) * force;
          push[i].y += (dy / dist) * force;
          push[j].x -= (dx / dist) * force;
          push[j].y -= (dy / dist) * force;
        }
      }
      for (const edge of edges) {
        const i = index.get(edge.a);
        const j = index.get(edge.b);
        if (i === undefined || j === undefined || i === j) continue;
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const dist = Math.max(0.5, Math.hypot(dx, dy));
        const force = (dist * dist) / k;
        push[i].x -= (dx / dist) * force;
        push[i].y -= (dy / dist) * force;
        push[j].x += (dx / dist) * force;
        push[j].y += (dy / dist) * force;
      }
      for (let i = 0; i < n; i += 1) {
        const length = Math.max(0.01, Math.hypot(push[i].x, push[i].y));
        pos[i].x += (push[i].x / length) * Math.min(length, temperature) - pos[i].x * 0.01;
        pos[i].y += (push[i].y / length) * Math.min(length, temperature) - pos[i].y * 0.01;
      }
      temperature = Math.max(0.5, temperature * 0.985);
    }
  }

  const xs = pos.map((p) => p.x);
  const ys = pos.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const padX = 40 + Math.max(...widths, NODE_RADIUS * 2) / 2;
  const padY = 50;
  const scaleX = (width - 2 * padX) / Math.max(1e-6, maxX - minX);
  const scaleY = (height - 2 * padY) / Math.max(1e-6, maxY - minY);
  const scale = Math.min(scaleX, scaleY, mode === "circle" ? Number.POSITIVE_INFINITY : 3.2);
  const offsetX = (width - (maxX - minX) * scale) / 2;
  const offsetY = (height - (maxY - minY) * scale) / 2;
  nodes.forEach((id, i) => {
    positions.set(id, {
      x: offsetX + (pos[i].x - minX) * scale,
      y: offsetY + (pos[i].y - minY) * scale,
    });
  });
  return { ...cropBox(nodes, widths, positions, width, height), positions };
}

/**
 * The viewBox around the placed nodes (with room for badges and outer rings), so a small graph
 * isn't drawn in a sea of empty canvas, but never smaller than 480 x 300.
 */
function cropBox(nodes, widths, positions, width, height) {
  const margin = 32;
  let left = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  nodes.forEach((id, i) => {
    const p = positions.get(id);
    const half = Math.max(widths[i] ?? 0, NODE_RADIUS * 2) / 2;
    left = Math.min(left, p.x - half - margin);
    right = Math.max(right, p.x + half + margin);
    top = Math.min(top, p.y - NODE_RADIUS - margin);
    bottom = Math.max(bottom, p.y + NODE_RADIUS + margin);
  });
  const grow = (low, high, least) => {
    const extra = Math.max(0, least - (high - low)) / 2;
    return [low - extra, high + extra];
  };
  [left, right] = grow(left, right, 480);
  [top, bottom] = grow(top, bottom, 300);
  return {
    minX: Math.max(0, left),
    minY: Math.max(0, top),
    width: Math.min(width, right) - Math.max(0, left),
    height: Math.min(height, bottom) - Math.max(0, top),
  };
}

/**
 * How far from a node's centre its outline is, in the direction (dx, dy): the circle's radius,
 * or where the ray leaves a pill of the given width. `radius` is the circle's (and the pill's
 * end caps'); pictures with bigger nodes (the Automaton's states) pass their own.
 */
export function outlineDistance(dx, dy, width, radius = NODE_RADIUS) {
  const half = width / 2;
  if (half <= radius + 0.01) return radius;
  const length = Math.hypot(dx, dy) || 1;
  const ux = Math.abs(dx / length);
  const uy = Math.abs(dy / length);
  // The pill is a rectangle with round ends: leave through the flat top or bottom, or the end
  // cap's circle (centred half - r in from the end).
  const toFlat = uy > 1e-6 ? radius / uy : Number.POSITIVE_INFINITY;
  if (toFlat * ux <= half - radius) return toFlat;
  const c = half - radius;
  // Solve |t*u - (c, 0)| = r for the far root.
  const b = c * ux;
  return b + Math.sqrt(Math.max(0, b * b - c * c + radius * radius));
}
