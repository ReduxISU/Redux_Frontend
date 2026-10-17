// components/pictures/codeTreeLayout.js
//
// #214: where the Code Tree picture puts everything. A pure function of the payload, the run's
// frames and the width of the box it is drawn in: no randomness, no DOM, no React, so the same
// run always lands in the same place. Ported from Redux's design mockup
// (Documentation/Visualizations/mockups/misc.js, the Lossless Data Compression `draw()`), not
// from its parser or solver: Redux sends each merge in the frames, so this only places them.
//
// The payload holds only the text's characters (the leaves), so the tree's shape comes from the
// run: the frame with the most merges (the last, in a finished run) gives the finished tree, and
// every frame of the run is drawn on that one layout, its merges so far shown and the rest left
// out. So a node never moves while the steps play. Before Run there is no tree yet: the leaves
// stand in character order, where a run with no merge (a text of one character) keeps them too.
//
// The tree is tidy: the leaves are evenly spaced in the order the tree reads them (left to
// right, bit 0 before bit 1), each merged node sits at its height above the leaves (a leaf is
// 0, a node one more than its taller child) and centred between its two children, so no edge
// crosses another or a node. On a box wide enough the tree hangs down from its root, as the
// mockup draws it, with each code written downwards under its leaf; on a narrower one (a phone)
// it lies on its side, the root at the left and the leaves in a column at the right with each
// code beside its leaf, so its text keeps its own size instead of being shrunk to fit the
// width. A leaf is as wide as its character's label (`U+000D` for a control character).

/** The drawing's width at most (and before the box is measured) and at least. */
export const WIDTH = 760;
export const MIN_WIDTH = 260;

/** The text sizes, and a character's width at each (the monospace font's 0.62 em). */
export const LABEL_SIZE = 12.5;
export const SMALL_SIZE = 11;
export const WEIGHT_SIZE = 11.5;
export const HEAD_SIZE = 11;
const CHAR = 0.62;

/** A merged node's circle radius at least, hanging down and on its side. */
const MIN_RADIUS = 15;
const SIDE_MIN_RADIUS = 13;

/** Hanging down: a leaf's height, the room between two leaves, the rows' spacing. */
const DOWN_LEAF_HEIGHT = 38;
const DOWN_SLOT_GAP = 10;
const DOWN_MIN_SLOT = 42;
const DOWN_LEVEL = 52;
/** The gap under a leaf before its code, and the spacing of the code's digits. */
const CODE_GAP = 14;
export const CODE_LEADING = 12;

/**
 * On its side: a leaf's height, the rows' spacing, and the step between levels (at least, so a
 * 0 or 1 fits between a node and its child, and at most).
 */
const SIDE_LEAF_HEIGHT = 26;
const SIDE_ROW = 32;
const SIDE_MIN_STEP = 36;
const SIDE_MAX_STEP = 90;
/** The gap between a leaf and its code beside it. */
const SIDE_CODE_GAP = 6;

/** The margin at the drawing's edges, and where the heading sits and the tree starts. */
const PAD = 10;
const HEAD_Y = 12;
const TOP = 46;

/**
 * Hanging down only when the box is at least this share of the hanging tree's width: below it
 * the tree is shrunk too far to read, so it lies on its side.
 */
const DOWN_MIN_SHARE = 0.75;

/**
 * Where the 0 / 1 on an edge sits: hanging down, beside the edge's middle (BIT_OFFSET across
 * it); on its side, where the edge leaves its node's circle (SIDE_BIT_ALONG past the circle,
 * SIDE_BIT_OFFSET across), as the step between levels leaves no more room near a leaf.
 */
const BIT_OFFSET = 9;
/** Half a 0 or 1's box (one 11 px character), with a pixel to spare. */
const BIT_HALF_WIDTH = 4.5;
const BIT_HALF_HEIGHT = 8;
const SIDE_BIT_ALONG = 9;
const SIDE_BIT_OFFSET = 8;

function round(value) {
  return Math.round(value * 100) / 100;
}

export function textWidth(text, size) {
  return String(text).length * size * CHAR;
}

/**
 * The finished tree the run builds: the merges of its frame with the most merges, each child a
 * leaf or an earlier merge and used once (a merge that is not is left out).
 * @param {Set<string>} leaves The leaf ids.
 * @param {Object[]} frames The run's frames.
 * @returns {Array<{id: string, weight: number, left: string, right: string}>}
 */
export function finishedMerges(leaves, frames) {
  let most = [];
  for (const frame of Array.isArray(frames) ? frames : []) {
    const merged = Array.isArray(frame?.merged) ? frame.merged : [];
    if (merged.length >= most.length) most = merged;
  }
  const known = new Set(leaves);
  const used = new Set();
  const kept = [];
  for (const merge of most) {
    const { id, left, right } = merge ?? {};
    if (typeof id !== "string" || known.has(id) || left === right) continue;
    if (!known.has(left) || !known.has(right) || used.has(left) || used.has(right)) continue;
    kept.push({ id, weight: Number(merge.weight) || 0, left, right });
    known.add(id);
    used.add(left);
    used.add(right);
  }
  return kept;
}

/** Whether two boxes ({left, right, top, bottom}) overlap. */
function overlaps(a, b) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** Whether the segment (x1, y1)-(x2, y2) passes through the box (Liang-Barsky). */
function crosses({ x1, y1, x2, y2 }, box) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [
    [-dx, x1 - box.left],
    [dx, box.right - x1],
    [-dy, y1 - box.top],
    [dy, box.bottom - y1],
  ]) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 > t1) return false;
    }
  }
  return true;
}

/**
 * Where an edge from `from` (a circle of radius `radius`) to `to` (a circle, or a leaf's box)
 * starts and ends: on their outlines, so it never runs over a node's text.
 */
function edgeEnds(from, to, radius) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const reach = to.leaf
    ? Math.min(
        Math.abs(ux) > 1e-9 ? to.width / 2 / Math.abs(ux) : Number.POSITIVE_INFINITY,
        Math.abs(uy) > 1e-9 ? to.height / 2 / Math.abs(uy) : Number.POSITIVE_INFINITY,
      )
    : radius;
  return {
    x1: round(from.x + ux * radius),
    y1: round(from.y + uy * radius),
    x2: round(to.x - ux * reach),
    y2: round(to.y - uy * reach),
    ux,
    uy,
  };
}

/**
 * The Code Tree picture's layout.
 * @param {Object} payload The Code Tree payload (`text`, `symbols: [{id, code, label, count}]`).
 * @param {Object[]} [frames] The run's frames (none before Run).
 * @param {number|null} [width] The width of the box it is drawn in, in CSS px (WIDTH until it is
 *   measured).
 * @returns {{minX: number, minY: number, width: number, height: number,
 *   orientation: "down"|"side", codesBeside: boolean, radius: number, headY: number,
 *   leaves: Array<{id: string, label: string, count: number, x: number, y: number,
 *     width: number, height: number, leaf: true, code: {x: number, y: number}}>,
 *   merged: Array<{id: string, weight: number, left: string, right: string, x: number,
 *     y: number, level: number}>,
 *   edges: Array<{id: string, parent: string, child: string, bit: string, x1: number,
 *     y1: number, x2: number, y2: number, bitX: number, bitY: number}>}}
 */
export function layoutCodeTree(payload, frames = [], width = WIDTH) {
  const target = Math.round(Math.max(MIN_WIDTH, width || WIDTH));
  const symbols = (Array.isArray(payload?.symbols) ? payload.symbols : []).filter(
    (symbol) => typeof symbol?.id === "string",
  );
  const leafIds = new Set(symbols.map((symbol) => symbol.id));
  const merges = finishedMerges(leafIds, frames);
  const byId = new Map(merges.map((merge) => [merge.id, merge]));
  const childOf = new Set(merges.flatMap((merge) => [merge.left, merge.right]));

  // How tall each node stands (a leaf 0), and its first leaf in character order.
  const order = new Map(symbols.map((symbol, i) => [symbol.id, i]));
  const level = new Map(symbols.map((symbol) => [symbol.id, 0]));
  const first = new Map(order);
  for (const merge of merges) {
    level.set(merge.id, 1 + Math.max(level.get(merge.left), level.get(merge.right)));
    first.set(merge.id, Math.min(first.get(merge.left), first.get(merge.right)));
  }
  // The trees (one, when the run finished), by their first character, and the leaves in the
  // order the trees read them.
  const roots = [...level.keys()]
    .filter((id) => !childOf.has(id))
    .sort((a, b) => first.get(a) - first.get(b));
  const inOrder = [];
  const walk = (id) => {
    const merge = byId.get(id);
    if (!merge) {
      inOrder.push(id);
      return;
    }
    walk(merge.left);
    walk(merge.right);
  };
  for (const root of roots) walk(root);
  const top = Math.max(0, ...roots.map((root) => level.get(root)));

  // The longest code the run writes, to keep room for it at every step.
  let longest = 0;
  for (const frame of Array.isArray(frames) ? frames : []) {
    for (const code of Object.values(frame?.codes ?? {})) {
      longest = Math.max(longest, String(code).length);
    }
  }

  const symbolOf = new Map(symbols.map((symbol) => [symbol.id, symbol]));
  const labelOf = (id) => String(symbolOf.get(id).label ?? id);
  const countOf = (id) => Number(symbolOf.get(id).count) || 0;
  const weightRadius = Math.ceil(
    textWidth(Math.max(0, ...merges.map((m) => m.weight)), WEIGHT_SIZE) / 2 + 5,
  );

  const downLeaf = Math.ceil(
    Math.max(
      32,
      ...inOrder.map((id) =>
        Math.max(textWidth(labelOf(id), LABEL_SIZE), textWidth(countOf(id), SMALL_SIZE)),
      ),
    ) + (inOrder.some((id) => labelOf(id).length > 2) ? 10 : 0),
  );
  const slot = Math.max(DOWN_MIN_SLOT, downLeaf + DOWN_SLOT_GAP);
  const downWidth = inOrder.length * slot + 2 * PAD;
  const orientation = target >= downWidth * DOWN_MIN_SHARE ? "down" : "side";
  const radius = Math.max(orientation === "down" ? MIN_RADIUS : SIDE_MIN_RADIUS, weightRadius);
  // Each code under (or beside) its leaf: always hanging down; on its side only when the box
  // has room for it, as on a phone it would leave the tree too little (the strip under the
  // picture lists every character's code either way).
  let codesBeside = orientation === "down";

  const place = new Map();
  let drawingWidth;
  let height;
  if (orientation === "down") {
    drawingWidth = Math.max(target, downWidth);
    const left = (drawingWidth - inOrder.length * slot) / 2 + slot / 2;
    const leafY = TOP + DOWN_LEAF_HEIGHT / 2 + top * DOWN_LEVEL;
    const codeY = round(leafY + DOWN_LEAF_HEIGHT / 2 + CODE_GAP);
    inOrder.forEach((id, i) => {
      const x = round(left + i * slot);
      place.set(id, {
        x,
        y: leafY,
        width: downLeaf,
        height: DOWN_LEAF_HEIGHT,
        code: { x, y: codeY },
      });
    });
    height = Math.ceil(
      leafY + DOWN_LEAF_HEIGHT / 2 + (longest ? CODE_GAP + (longest - 1) * CODE_LEADING + 8 : 0),
    );
  } else {
    const sideLeaf = Math.ceil(
      Math.max(
        36,
        ...inOrder.map(
          (id) => 20 + textWidth(labelOf(id), LABEL_SIZE) + textWidth(countOf(id), SMALL_SIZE),
        ),
      ),
    );
    const fixed = 2 * PAD + sideLeaf;
    const stepFor = (room) =>
      top ? Math.min(SIDE_MAX_STEP, Math.max(SIDE_MIN_STEP, room / top)) : SIDE_MIN_STEP;
    let codeWidth = longest ? SIDE_CODE_GAP + textWidth("0".repeat(longest), SMALL_SIZE) : 0;
    codesBeside = longest > 0 && (!top || (target - fixed - codeWidth) / top >= SIDE_MIN_STEP);
    if (!codesBeside) codeWidth = 0;
    const step = stepFor(target - fixed - codeWidth);
    const x0 = PAD + radius;
    const leafX = round(x0 + top * step - radius + sideLeaf / 2);
    inOrder.forEach((id, i) => {
      const y = round(TOP + SIDE_LEAF_HEIGHT / 2 + i * SIDE_ROW);
      place.set(id, {
        x: leafX,
        y,
        width: sideLeaf,
        height: SIDE_LEAF_HEIGHT,
        code: { x: round(leafX + sideLeaf / 2 + SIDE_CODE_GAP), y },
      });
    });
    drawingWidth = Math.max(
      target,
      Math.ceil(x0 + top * step - radius + sideLeaf + codeWidth + PAD),
    );
    height = Math.ceil(TOP + Math.max(1, inOrder.length) * SIDE_ROW + PAD);
    // A merged node's column: its height, counted from the root's at the left.
    for (const merge of merges) {
      place.set(merge.id, { x: round(x0 + (top - level.get(merge.id)) * step) });
    }
  }

  // Each merged node centred between its children (children are placed first: merges come in
  // the order they were made).
  for (const merge of merges) {
    const a = place.get(merge.left);
    const b = place.get(merge.right);
    const at = place.get(merge.id) ?? {};
    if (orientation === "down") {
      at.x = round((a.x + b.x) / 2);
      // Every level's row on one line: a merged node's circle centred where a leaf's box is.
      at.y = round(TOP + DOWN_LEAF_HEIGHT / 2 + (top - level.get(merge.id)) * DOWN_LEVEL);
    } else {
      at.y = round((a.y + b.y) / 2);
    }
    place.set(merge.id, at);
  }
  const leaves = inOrder.map((id) => ({
    id,
    label: labelOf(id),
    count: countOf(id),
    leaf: true,
    ...place.get(id),
  }));
  const nodeOf = new Map(leaves.map((leaf) => [leaf.id, leaf]));
  const laidMerged = merges.map((merge) => {
    const at = place.get(merge.id);
    const node = { ...merge, x: at.x, y: at.y, level: level.get(merge.id) };
    nodeOf.set(merge.id, node);
    return node;
  });
  const lines = laidMerged.flatMap((merge) =>
    [
      [merge.left, "0"],
      [merge.right, "1"],
    ].map(([child, bit]) => ({
      id: `${merge.id}.${bit}`,
      parent: merge.id,
      child,
      bit,
      ...edgeEnds(merge, nodeOf.get(child), radius),
    })),
  );
  // Every box a 0 or 1 must keep clear of: each node (a circle by its square) and each code.
  const boxes = [
    ...laidMerged.map((node) => ({
      left: node.x - radius,
      right: node.x + radius,
      top: node.y - radius,
      bottom: node.y + radius,
    })),
    ...leaves.map((leaf) => ({
      left: leaf.x - leaf.width / 2,
      right: leaf.x + leaf.width / 2,
      top: leaf.y - leaf.height / 2,
      bottom:
        orientation === "down" && longest
          ? leaf.code.y + (longest - 1) * CODE_LEADING + 8
          : leaf.y + leaf.height / 2,
    })),
  ];
  const edges = lines.map((line) => {
    // The 0 or 1 on the side of its edge away from the edge's sibling (lying on its side the
    // tree is a mirror image of the hanging one, so the sides swap), at the first place along
    // the edge where it meets no node, code or other edge: hanging down from the middle out, on
    // its side from where the edge leaves its node's circle.
    const outward = (line.bit === "0") === (orientation === "down") ? 1 : -1;
    const nx = -line.uy * outward;
    const ny = line.ux * outward;
    const length = Math.hypot(line.x2 - line.x1, line.y2 - line.y1);
    const along =
      orientation === "down"
        ? [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8].map((share) => share * length)
        : [SIDE_BIT_ALONG, 4, 14, 20, 26, 32].filter((d) => d < length);
    const others = lines.filter((other) => other !== line);
    let best = null;
    for (const offset of orientation === "down"
      ? [BIT_OFFSET, BIT_OFFSET + 4]
      : [SIDE_BIT_OFFSET, SIDE_BIT_OFFSET + 3]) {
      for (const d of along) {
        const x = line.x1 + line.ux * d + nx * offset;
        const y = line.y1 + line.uy * d + ny * offset;
        best ??= { x, y };
        const box = {
          left: x - BIT_HALF_WIDTH,
          right: x + BIT_HALF_WIDTH,
          top: y - BIT_HALF_HEIGHT,
          bottom: y + BIT_HALF_HEIGHT,
        };
        if (boxes.some((other) => overlaps(box, other))) continue;
        if (others.some((other) => crosses(other, box))) continue;
        best = { x, y, clear: true };
        break;
      }
      if (best?.clear) break;
    }
    return {
      id: line.id,
      parent: line.parent,
      child: line.child,
      bit: line.bit,
      x1: line.x1,
      y1: line.y1,
      x2: line.x2,
      y2: line.y2,
      bitX: round(best?.x ?? line.x1),
      bitY: round(best?.y ?? line.y1),
    };
  });
  return {
    minX: 0,
    minY: 0,
    width: drawingWidth,
    height: Math.max(height, TOP + 40),
    orientation,
    codesBeside,
    radius,
    headY: HEAD_Y,
    leaves,
    merged: laidMerged,
    edges,
  };
}
