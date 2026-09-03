// components/detail/visualizations/graphGeometry.js
//
// T54 (#125) -- pure edge/curvature path math for GraphRenderer.js's SVG rendering, ported
// from SARE_2026's AutomatonCanvas.tsx/GraphCanvas.tsx (see issue #124's porting notes)
// rather than re-derived: straight edges offset their endpoints along the unit vector by
// node radius so arrowheads land exactly on the node boundary; curved edges compute a
// control point from midpoint + perpendicular * offset, with start/end angles taken from
// the *tangent* to the control point (not the straight line between centers) so an
// arrowhead still lands cleanly on the boundary when curved; a bidirectional pair (A->B and
// B->A both present) is auto-assigned symmetric opposite curvature so the two edges render
// as visibly distinct arcs instead of overlapping into one line -- the straight-line-only
// renderer T48 shipped had exactly this overlap bug, fixed here as part of pulling in this
// math anyway. No React/DOM dependency -- every function here is plain math over
// {x, y} points, shared by GraphRenderer's read-only and editable rendering paths alike.

export function distanceBetween(ax, ay, bx, by) {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}

/**
 * Straight or quadratic-curved path between two node centers, offset so both ends land on
 * the node boundary (not the center) regardless of curvature.
 *
 * @param {{x: number, y: number}} source
 * @param {{x: number, y: number}} target
 * @param {number} radius Node radius (both nodes assumed the same size).
 * @param {number} curvature Signed perpendicular offset, in the same units as x/y. Under
 *   0.5 in magnitude renders as a straight line.
 * @returns {{path: string, labelX: number, labelY: number, handleX: number, handleY: number}}
 */
export function computeEdgePath(source, target, radius, curvature) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = distanceBetween(source.x, source.y, target.x, target.y) || 1;

  if (Math.abs(curvature) < 0.5) {
    const ux = dx / distance;
    const uy = dy / distance;
    const startX = source.x + ux * radius;
    const startY = source.y + uy * radius;
    const endX = target.x - ux * radius;
    const endY = target.y - uy * radius;
    return {
      path: `M ${startX} ${startY} L ${endX} ${endY}`,
      labelX: (startX + endX) / 2,
      labelY: (startY + endY) / 2,
      handleX: (startX + endX) / 2,
      handleY: (startY + endY) / 2,
    };
  }

  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;
  const nx = -dy / distance;
  const ny = dx / distance;
  const controlX = midX + nx * curvature;
  const controlY = midY + ny * curvature;

  const startAngle = Math.atan2(controlY - source.y, controlX - source.x);
  const startX = source.x + radius * Math.cos(startAngle);
  const startY = source.y + radius * Math.sin(startAngle);

  const endAngle = Math.atan2(target.y - controlY, target.x - controlX);
  const endX = target.x - radius * Math.cos(endAngle);
  const endY = target.y - radius * Math.sin(endAngle);

  // Quadratic bezier midpoint at t=0.5, used for both the label and the drag handle.
  const midpointX = 0.25 * startX + 0.5 * controlX + 0.25 * endX;
  const midpointY = 0.25 * startY + 0.5 * controlY + 0.25 * endY;

  return {
    path: `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`,
    labelX: midpointX,
    labelY: midpointY,
    handleX: midpointX,
    handleY: midpointY,
  };
}

/**
 * Self-loop path: a fixed bezier hump above the node, sized off its radius.
 *
 * @param {{x: number, y: number}} node
 * @param {number} radius
 */
export function computeSelfLoopPath(node, radius) {
  const startX = node.x - radius * 0.55;
  const startY = node.y - radius;
  const endX = node.x + radius * 0.55;
  const endY = node.y - radius;
  const control1X = node.x - radius * 1.6;
  const control1Y = node.y - radius * 3.1;
  const control2X = node.x + radius * 1.6;
  const control2Y = node.y - radius * 3.1;
  return {
    path: `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`,
    labelX: node.x,
    labelY: node.y - radius * 3.6,
  };
}

/**
 * Default curvature magnitude for an auto-detected bidirectional pair (A->B and B->A both
 * present), scaled off node radius and edge length -- only applied when neither edge has an
 * explicit drag-set override.
 */
export function defaultReverseCurvature(radius, distance) {
  return Math.max(radius * 1.4, distance * 0.15);
}

/**
 * Resolves the curvature to actually render for one link: an explicit drag-set override
 * takes precedence; otherwise a bidirectional pair gets automatic opposite curvature;
 * otherwise the edge is straight.
 *
 * @param {{source: {id: string}, target: {id: string}}} link
 * @param {Array<{source: {id: string}, target: {id: string}}>} allLinks
 * @param {Record<string, number>} curvatureOverrides Keyed by `${sourceId}@@${targetId}`.
 * @param {number} radius
 * @param {number} distance
 */
export function effectiveCurvature(link, allLinks, curvatureOverrides, radius, distance) {
  const key = `${link.source.id}@@${link.target.id}`;
  if (key in curvatureOverrides) return curvatureOverrides[key];
  const hasReverse = allLinks.some(
    (other) => other.source.id === link.target.id && other.target.id === link.source.id,
  );
  return hasReverse ? defaultReverseCurvature(radius, distance) : 0;
}
