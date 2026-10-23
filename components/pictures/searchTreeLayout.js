// components/pictures/searchTreeLayout.js
//
// #217: where the Search Tree picture puts its nodes. Pure functions of the frames: no
// randomness, no DOM, no React, so the same run always lands in the same place. Ported from
// Redux's design mockup (Documentation/Visualizations/mockups/searchtree.js, `draw()`'s layout),
// not from its solvers: Redux sends each frame's tree already built and folded, so this only
// places it.
//
// A frame's tree is laid out level by level: each node's depth sets its row, leaves go left to
// right, and a parent sits centred over its first and last child. A leaf takes as much room as
// its label or its note (the bound or clash that decided it) needs, whichever is wider, so no
// two labels or notes on a row can meet; a parent with a note sends its edges out from under it.
//
// The tree grows as the run goes on (and shrinks again when Redux folds a finished branch into
// "+k more"), so one frame's size would change the scale at every step. Instead the whole run
// shares one drawing box, the largest any frame needs, and each frame's tree is centred in it:
// a node is drawn the same size at every step, and the zoom and pan hold still while stepping.

/** A node's height, the rows' spacing, and the room over the root for an order badge. */
export const NODE_HEIGHT = 26;
const ROW = 80;
const TOP = 34;

/** The gap between two leaves' room, and the drawing's margin. */
const GAP = 12;
const PAD = 20;

/** The narrowest drawing box (so a two-node tree isn't blown up). */
const MIN_WIDTH = 480;
const MIN_HEIGHT = 160;

/**
 * A note is one line up to NOTE_LINE characters (`2 clauses left`). A bound longer than
 * BOUND_LINE that compares two numbers is broken before its comparison (`lb 7450` over
 * `≥ 6830`), so it is no wider than its node; any other note longer than NOTE_LINE is broken at
 * the space nearest its middle. A line still longer than NOTE_LINE is cut, with an ellipsis (the
 * whole note is in the node's label).
 */
const NOTE_LINE = 16;
const BOUND_LINE = 12;
const COMPARISON = /^(.*\S) ([≥≤<>=≠] .*)$/;

/** The note's first line under a node, the gap between its lines, and its font size. */
export const NOTE_OFFSET = NODE_HEIGHT / 2 + 11;
export const NOTE_LEADING = 12;
export const NOTE_SIZE = 10.5;

/** About how wide `text` is at the picture's monospace `size`, in drawing units. */
function textWidth(text, size) {
  return String(text).length * size * 0.62;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function cut(line) {
  return line.length > NOTE_LINE ? `${line.slice(0, NOTE_LINE - 1)}…` : line;
}

/** A node's note as drawn: its bound, on one or two lines (see NOTE_LINE). */
export function noteLines(bound) {
  if (typeof bound !== "string" || !bound.trim()) return [];
  const text = bound.trim();
  const comparison = text.length > BOUND_LINE ? COMPARISON.exec(text) : null;
  if (comparison) return [cut(comparison[1]), cut(comparison[2])];
  if (text.length <= NOTE_LINE) return [text];
  let split = -1;
  for (let at = 0; at < text.length; at += 1) {
    if (
      text[at] === " " &&
      (split < 0 || Math.abs(at - text.length / 2) < Math.abs(split - text.length / 2))
    ) {
      split = at;
    }
  }
  if (split < 0) return [cut(text)];
  return [cut(text.slice(0, split)), cut(text.slice(split + 1))];
}

/** How far under a node its note reaches (0 for none), where its edges then start. */
function noteDepth(lines) {
  return lines.length ? 8 + lines.length * NOTE_LEADING : 0;
}

/** A node's box width for its label. */
export function nodeWidth(label) {
  return Math.max(40, Math.ceil(textWidth(label, 12.5) + 18));
}

/**
 * One frame's tree, laid out with its left edge at 0.
 * @param {Object[]} nodes The frame's `nodes` (parents before children).
 * @returns {{width: number, height: number,
 *   nodes: Array<{id: string, parent: string|null, label: string, kind: string, state: string,
 *     bound: string|null, note: string[], order: number|null, hidden: number|null, depth: number,
 *     x: number, y: number, width: number, room: number, noteDepth: number,
 *     children: string[]}>}}
 */
export function layoutTree(nodes) {
  const list = (Array.isArray(nodes) ? nodes : []).filter((node) => typeof node?.id === "string");
  const byId = new Map();
  for (const node of list) {
    if (byId.has(node.id)) continue;
    const label = String(node.label ?? node.id);
    const note = noteLines(node.bound);
    byId.set(node.id, {
      id: node.id,
      parent: typeof node.parent === "string" ? node.parent : null,
      label,
      kind: typeof node.kind === "string" ? node.kind : "",
      state: typeof node.state === "string" ? node.state : "Background",
      bound: typeof node.bound === "string" ? node.bound : null,
      note,
      order: Number.isInteger(node.order) ? node.order : null,
      hidden: Number.isInteger(node.hidden) ? node.hidden : null,
      width: nodeWidth(label),
      // The width its label or note needs, whichever is wider, and how far its note reaches.
      room: Math.max(nodeWidth(label), ...note.map((line) => textWidth(line, NOTE_SIZE) + 8)),
      noteDepth: noteDepth(note),
      children: [],
    });
  }
  const roots = [];
  for (const node of byId.values()) {
    const parent = node.parent !== null ? byId.get(node.parent) : null;
    if (parent && parent !== node) parent.children.push(node.id);
    else roots.push(node);
  }

  // The room each subtree needs, bottom up (a node is measured once; a cycle can't recurse).
  const span = new Map();
  const measure = (node) => {
    if (span.has(node.id)) return span.get(node.id);
    span.set(node.id, 0);
    const own = node.room + GAP;
    const kids = node.children.reduce((sum, id) => sum + measure(byId.get(id)), 0);
    const room = Math.max(own, kids);
    span.set(node.id, room);
    return room;
  };
  let maxDepth = 0;
  const placed = new Set();
  const place = (node, left, depth) => {
    if (placed.has(node.id)) return;
    placed.add(node.id);
    maxDepth = Math.max(maxDepth, depth);
    node.depth = depth;
    node.y = TOP + depth * ROW;
    const room = span.get(node.id);
    const kids = node.children.map((id) => byId.get(id));
    if (!kids.length) {
      node.x = round(left + room / 2);
      return;
    }
    const kidsRoom = kids.reduce((sum, kid) => sum + span.get(kid.id), 0);
    let at = left + (room - kidsRoom) / 2;
    for (const kid of kids) {
      place(kid, at, depth + 1);
      at += span.get(kid.id);
    }
    node.x = round((kids[0].x + kids[kids.length - 1].x) / 2);
  };
  let left = PAD;
  for (const root of roots) {
    measure(root);
    place(root, left, 0);
    left += span.get(root.id);
  }
  const drawn = [...byId.values()].filter((node) => placed.has(node.id));
  const notes = Math.max(
    0,
    ...drawn.filter((node) => node.depth === maxDepth).map((node) => noteDepth(node.note)),
  );
  return {
    width: left + PAD,
    height: drawn.length ? TOP + maxDepth * ROW + NODE_HEIGHT / 2 + notes + PAD : 0,
    nodes: drawn,
  };
}

/**
 * The edge into `child` from its parent: out of the parent's bottom (under its note, when it has
 * one), and into the child's top.
 */
export function edgePath(parent, child) {
  const fromY = parent.y + NODE_HEIGHT / 2 + noteDepth(parent.note);
  const toY = child.y - NODE_HEIGHT / 2;
  const mid = (fromY + toY) / 2;
  return `M${parent.x},${round(fromY)} C${parent.x},${round(mid)} ${child.x},${round(mid)} ${child.x},${round(toY)}`;
}

/**
 * Every frame's tree in one shared drawing box: the largest any frame needs, with each tree
 * centred across it (see the header).
 * @param {Object[]} frames The run's frames.
 * @returns {{minX: number, minY: number, width: number, height: number,
 *   trees: Array<ReturnType<typeof layoutTree>>}}
 */
export function layoutSearchTree(frames) {
  const trees = (Array.isArray(frames) ? frames : []).map((frame) => layoutTree(frame?.nodes));
  const width = Math.max(MIN_WIDTH, ...trees.map((tree) => tree.width));
  const height = Math.max(MIN_HEIGHT, ...trees.map((tree) => tree.height));
  for (const tree of trees) {
    const shift = round((width - tree.width) / 2);
    for (const node of tree.nodes) node.x = round(node.x + shift);
  }
  return { minX: 0, minY: 0, width, height, trees };
}
