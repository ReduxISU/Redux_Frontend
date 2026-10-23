// components/pictures/diagramEdits.js
//
// #250: moving nodes and bending edges by hand, in every node-link picture (Graph, Grouped
// Graph, Bipartite Graph, Layered Graph, Automaton, Flow Network). Each renderer still lays its
// picture out with its own pure, deterministic layout function; this keeps the reader's changes
// on top of it:
//   - `nodes`: a node's position, in drawing units, in place of the layout's (only the nodes
//     that were moved are here);
//   - `bends`: how far an edge's middle is pushed off the straight line between its ends, in
//     drawing units along the edge's normal, added to the bow the layout gave it. One number
//     per edge: the curve's single control point moves along the normal, so a bend can flip to
//     the other side, and the edge's label (at the curve's middle) rides along;
//   - `loops`: the direction a self-loop points out of its node, in degrees (0 = right, -90 =
//     up), in place of the layout's.
// Edges are never stored as shapes: every renderer recomputes them from the current positions,
// so they follow a moved node.
//
// The changes are kept while the steps play and after Run, and go back to the automatic layout
// when `resetOn` changes (the renderer passes the instance and visualization, and the Graph its
// Force / Circle choice) or on Reset layout (DiagramZoom.js's button).
//
// #252: they belong to the instance and visualization (the renderer's `layoutKey`, resetOn's
// first entry), not to the renderer on screen. Switching the Visualization Type unmounts the
// renderer, or hands it another key, so each key's changes are kept here for the page's life
// and come back when the same picture (with the same resetOn) is drawn again.
//
// The gestures themselves (drag, long-press on touch, arrow keys) are DiagramZoom.js's: a piece
// is draggable when it carries `data-drag-node` or `data-drag-edge` (see dragProps below), and
// the renderer hands DiagramZoom an `editor` (makeEditor) that says where a node is and applies
// its picture type's limits.

import { useEffect, useState } from "react";

const EMPTY = { nodes: {}, bends: {}, loops: {} };

// layoutKey -> {resetOn, edits}: each picture's changes, while it is not on screen (#252).
const keptEdits = new Map();

/** The changes kept for `resetOn`, or none (a picture with no layoutKey keeps nothing). */
function keptFor(resetOn) {
  const kept = typeof resetOn[0] === "string" ? keptEdits.get(resetOn[0]) : undefined;
  return kept && sameKeys(kept.resetOn, resetOn) ? kept.edits : EMPTY;
}

function sameKeys(a, b) {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

/**
 * The reader's changes to one picture's layout.
 * @param {Array} resetOn Back to the automatic layout when any of these changes (Object.is).
 * @returns {{nodes: Object, bends: Object, loops: Object, edited: boolean,
 *   setNode: Function, setBend: Function, setLoop: Function, reset: Function}}
 */
export function useDiagramEdits(resetOn) {
  const [edits, setEdits] = useState(() => keptFor(resetOn));
  const [editsFor, setEditsFor] = useState(resetOn);
  // React's "adjust state when a prop changes" pattern: a new instance or layout starts afresh,
  // or where it was left if it was drawn before.
  if (!sameKeys(editsFor, resetOn)) {
    setEditsFor(resetOn);
    setEdits(keptFor(resetOn));
  }
  const edited =
    Object.keys(edits.nodes).length > 0 ||
    Object.keys(edits.bends).length > 0 ||
    Object.keys(edits.loops).length > 0;
  const key = typeof editsFor[0] === "string" ? editsFor[0] : null;
  useEffect(() => {
    if (key === null) return;
    if (edited) keptEdits.set(key, { resetOn: editsFor, edits });
    else keptEdits.delete(key);
  }, [key, editsFor, edits, edited]);
  return {
    ...edits,
    edited,
    /** Puts node `id` (or several, `{id: point}`) at `point`. */
    setNode: (id, point) =>
      setEdits((current) => ({
        ...current,
        nodes: { ...current.nodes, ...(typeof id === "string" ? { [id]: point } : id) },
      })),
    setBend: (id, offset) =>
      setEdits((current) => ({ ...current, bends: { ...current.bends, [id]: offset } })),
    setLoop: (id, angle) =>
      setEdits((current) => ({ ...current, loops: { ...current.loops, [id]: angle } })),
    reset: () => setEdits(EMPTY),
  };
}

/** The layout's positions with the moved nodes in their new places (a new Map). */
export function editedPositions(base, nodes) {
  const result = new Map(base);
  for (const [id, point] of Object.entries(nodes)) {
    if (result.has(id)) result.set(id, { ...result.get(id), x: point.x, y: point.y });
  }
  return result;
}

/**
 * How far `point` is from the middle of the line a -> b, along the line's left-hand normal
 * (-dy, dx) / length: the bow that puts the curve's middle under `point`.
 */
export function offsetAlongNormal(a, b, point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  return ((point.x - mx) * -dy + (point.y - my) * dx) / length;
}

/** The direction from `centre` to `point`, in degrees (0 = right, 90 = down). */
export function angleTowards(centre, point) {
  return (Math.atan2(point.y - centre.y, point.x - centre.x) * 180) / Math.PI;
}

export function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

/**
 * What DiagramZoom needs to drag this picture's pieces.
 * @param {Object} options
 * @param {ReturnType<typeof useDiagramEdits>} options.edits
 * @param {(id: string) => {x: number, y: number}|null} options.nodeAt A node's current centre.
 * @param {(id: string, point: {x: number, y: number}) => void} options.moveNode Moves a node
 *   to `point` (already kept inside the picture area), within its picture type's limits.
 * @param {(id: string, point: {x: number, y: number}) => void} [options.dragEdge] Bends edge
 *   `id` (or turns a loop) so its middle is as near `point` as it can be.
 */
export function makeEditor({ edits, nodeAt, moveNode, dragEdge }) {
  return {
    edited: edits.edited,
    reset: edits.reset,
    nodeAt,
    moveNode,
    dragEdge: dragEdge ?? (() => {}),
  };
}

/** The attributes that make a node draggable (by DiagramZoom.js). */
export function nodeDragProps(id) {
  return { "data-drag-node": id };
}

/** The attributes that make an edge, or its label, draggable to bend it. */
export function edgeDragProps(id) {
  return { "data-drag-edge": id };
}

/**
 * A layer of edge handles, drawn just over the edges (and under labels and nodes), so an edge's
 * own group keeps only what it draws.
 * @param {{edges: Array<{id: string, d: string}>}} props
 */
export function EdgeHandles({ edges }) {
  return (
    <g data-layer="edge-handles">
      {edges.map((edge) => (
        <EdgeHandle key={edge.id} id={edge.id} d={edge.d} />
      ))}
    </g>
  );
}

/**
 * An invisible, wider copy of an edge's path to grab it by: the drawn line is 1.4 to 4 units
 * wide, too thin to hit with a finger.
 */
export function EdgeHandle({ id, d }) {
  return (
    <path
      d={d}
      data-drag-edge={id}
      data-edge-handle=""
      fill="none"
      stroke="transparent"
      strokeWidth={14}
      pointerEvents="stroke"
    />
  );
}
