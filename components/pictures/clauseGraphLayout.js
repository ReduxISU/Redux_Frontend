// components/pictures/clauseGraphLayout.js
//
// #202: where the clause graph (the Grouped Graph picture) puts its pieces. A pure function of
// the payload: no randomness, no DOM, no React, so the same formula always lands in the same
// place. Ported from the clause graph's ring in Redux's design mockup
// (Documentation/Visualizations/mockups/design.src.html, as the reference viewer's
// adapters/groupedgraph.js reads it), not from its parser or solvers.

/** Literal radius in the clause graph, in viewBox units. */
export const LITERAL_RADIUS = 17;

/** The narrowest the clause graph's viewBox gets. */
const MIN_WIDTH = 480;

/**
 * The clause graph (Grouped Graph): one cluster per group (clause) on a ring, its members
 * (literal occurrences) on a small circle inside it, and the variables' strip under the ring.
 *
 * @param {Object} payload The Grouped Graph payload.
 * @returns {{minX: number, minY: number, width: number, height: number, cx: number, cy: number,
 *   groups: Array<{id: string, label: string, x: number, y: number, angle: number,
 *     hull: number, members: string[]}>,
 *   positions: Map<string, {x: number, y: number, group: string}>,
 *   variables: Array<{id: string, label: string, x: number, y: number, width: number,
 *     height: number}>}}
 */
export function layoutClauseGraph(payload) {
  const groups = Array.isArray(payload?.groups) ? payload.groups : [];
  const variables = Array.isArray(payload?.variables) ? payload.variables : [];
  const n = groups.length;
  const r = LITERAL_RADIUS;
  const ring = n <= 1 ? 0 : Math.min(228 * Math.max(1, n / 12), Math.max(150, n * 30));
  const maxMembers = Math.max(1, ...groups.map((g) => (g.members ?? []).length));
  const hullMax = (maxMembers <= 1 ? 0 : (r + 7) / Math.sin(Math.PI / maxMembers)) + r + 10;
  // The design's 640-wide canvas centred at (320, 320), grown only when the ring needs room
  // (its labels sit 16 past each hull).
  const half = Math.max(320, ring + hullMax + 34);
  const cx = half;
  const cy = half;

  const positions = new Map();
  const placed = groups.map((group, gi) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * gi) / Math.max(1, n);
    const x = cx + ring * Math.cos(angle);
    const y = cy + ring * Math.sin(angle);
    const members = Array.isArray(group.members) ? group.members : [];
    const k = members.length;
    const inner = k <= 1 ? 0 : (r + 7) / Math.sin(Math.PI / k);
    members.forEach((id, li) => {
      const a = angle + Math.PI + (2 * Math.PI * li) / k;
      positions.set(id, {
        x: x + inner * Math.cos(a),
        y: y + inner * Math.sin(a),
        group: group.id,
      });
    });
    return {
      id: group.id,
      label: group.label ?? group.id,
      x,
      y,
      angle,
      hull: inner + r + 10,
      members,
    };
  });

  // Crop to the clusters and their labels (which sit 16 past each hull), but never narrower
  // than MIN_WIDTH, so a one- or two-clause formula is not blown up to fill the pane.
  const margin = 30;
  let minX = Math.min(...placed.map((g) => g.x - g.hull - margin), cx - MIN_WIDTH / 2);
  let maxX = Math.max(...placed.map((g) => g.x + g.hull + margin), cx + MIN_WIDTH / 2);
  const minY = placed.length ? Math.min(...placed.map((g) => g.y - g.hull - margin)) : cy - 40;
  const maxY = placed.length ? Math.max(...placed.map((g) => g.y + g.hull + margin)) : cy + 40;

  // The assignment strip: one chip per variable, wrapped into rows under the ring.
  const chipWidth = 78;
  const chipHeight = 30;
  const gap = 8;
  const columns = Math.max(1, Math.floor((maxX - minX - 20 + gap) / (chipWidth + gap)));
  const rows = Math.ceil(variables.length / columns);
  const stripTop = maxY + 4;
  const chips = variables.map((variable, i) => {
    const column = i % columns;
    const row = Math.floor(i / columns);
    const inRow = Math.min(columns, variables.length - row * columns);
    const rowWidth = inRow * chipWidth + (inRow - 1) * gap;
    return {
      id: variable.id,
      label: variable.label ?? variable.id,
      x: cx - rowWidth / 2 + column * (chipWidth + gap),
      y: stripTop + row * (chipHeight + gap),
      width: chipWidth,
      height: chipHeight,
    };
  });
  minX = Math.min(minX, ...chips.map((chip) => chip.x - 10));
  maxX = Math.max(maxX, ...chips.map((chip) => chip.x + chip.width + 10));
  const bottom = chips.length ? stripTop + rows * (chipHeight + gap) + 4 : maxY;
  return {
    minX,
    minY,
    width: maxX - minX,
    height: bottom - minY,
    cx,
    cy,
    groups: placed,
    positions,
    variables: chips,
  };
}
