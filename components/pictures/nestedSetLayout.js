// components/pictures/nestedSetLayout.js
//
// #271: where the Nested Set picture puts its pieces. Pure functions of the payload (and, for the
// set list, the box's width): no randomness, no DOM, no React, so the same instance always lands
// in the same place, before Run and at every step. Ported from Redux's design mockup
// (Documentation/Visualizations/mockups/nestedset.js, `order`, `hull`, `regionPath`,
// `distToHull`, `regions` and `list`), not from its parser or solvers.
//
// Regions: every element of U is a dot on a circle, in the order that keeps each set's elements
// next to each other (every order is tried for up to 9 elements, the first staying put; a
// barycentre sweep beyond that; ties keep the first order found). Every set is the convex hull
// of its dots grown by a padding: straight edges joined by arcs (one dot is a circle, two a
// capsule). Small sets get the smallest padding, and two sets that share an element never share
// one, so their outlines stay apart where they overlap. Each set's name sits on its region's edge
// (or, for a set nested in others, inside it), at the first candidate clear of every dot, 6
// units from every name placed, and off every other region's outline.
//
// The regions are drawn only when they read: at most 12 elements and 8 sets, no element in more
// than 4 overlapping sets, every region clear of every dot outside it, and a free spot for every
// name. Otherwise `regionsLayout` says why, and the picture is the set list: U on top, then one
// row per set with its elements written out as chips.

/** A dot's radius. */
export const DOT = 16;

/** When the regions stop reading and the set list is drawn instead (Redux's spec). */
export const LIMITS = { elements: 12, sets: 8, perElement: 4, clearance: 4 };

const LABEL_GAP = 6;
const PAD0 = DOT + 9;
const PADSTEP = 12;

/** The narrowest the regions picture is drawn (room for its heading on one line). */
export const REGIONS_MIN_WIDTH = 400;
/** The set list's widest and narrowest. */
export const LIST_MAX_WIDTH = 760;
export const LIST_MIN_WIDTH = 340;

/** The order of the elements round the circle, as indices into `payload.elements`. */
function circleOrder(elements, sets) {
  const n = elements.length;
  const index = new Map(elements.map((element, i) => [element.id, i]));
  const members = sets.map((set) => set.members.map((id) => index.get(id)));
  const cost = (perm) => {
    const at = new Array(n);
    perm.forEach((element, place) => {
      at[element] = place;
    });
    let total = 0;
    for (const set of members) {
      if (set.length < 2) continue;
      const on = new Array(n).fill(false);
      for (const element of set) on[at[element]] = true;
      let runs = 0;
      for (let place = 0; place < n; place += 1)
        if (on[place] && !on[(place + n - 1) % n]) runs += 1;
      total += (Math.max(1, runs) - 1) * 1000;
      const places = set.map((element) => at[element]).sort((a, b) => a - b);
      let gap = 0;
      for (let k = 0; k < places.length; k += 1) {
        gap = Math.max(gap, (places[(k + 1) % places.length] - places[k] + n) % n || n);
      }
      total += n - gap;
    }
    return total;
  };
  if (n <= 9) {
    let best = null;
    let bestCost = Number.POSITIVE_INFINITY;
    const rest = elements.map((_, i) => i).slice(1);
    const perm = [0];
    const used = new Array(n).fill(false);
    const walk = () => {
      if (perm.length === n) {
        const c = cost(perm);
        if (c < bestCost) {
          bestCost = c;
          best = perm.slice();
        }
        return;
      }
      for (const element of rest) {
        if (used[element]) continue;
        used[element] = true;
        perm.push(element);
        walk();
        perm.pop();
        used[element] = false;
      }
    };
    walk();
    return best;
  }
  let perm = elements.map((_, i) => i);
  for (let round = 0; round < 4; round += 1) {
    const at = new Map(perm.map((element, place) => [element, place]));
    const barycentre = (element) => {
      const own = members.filter((set) => set.includes(element));
      return own.length
        ? own.reduce(
            (sum, set) => sum + set.reduce((s, other) => s + at.get(other), 0) / set.length,
            0,
          ) / own.length
        : at.get(element);
    };
    perm = perm.slice().sort((a, b) => barycentre(a) - barycentre(b) || a - b);
  }
  return perm;
}

/** The convex hull of `points` (fewer than 3 points come back as they are, sorted). */
export function hull(points) {
  const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  const upper = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop();
    lower.push(p);
  }
  for (const p of pts.slice().reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** The padded hull's outline as an SVG path: offset straight edges joined by arcs. */
export function regionPath(points, pad) {
  if (points.length === 1) {
    const p = points[0];
    return `M${p.x - pad},${p.y} a${pad},${pad} 0 1,0 ${2 * pad},0 a${pad},${pad} 0 1,0 ${-2 * pad},0Z`;
  }
  let h = hull(points);
  // Clockwise on screen (y down), so every corner arc turns the same way and normals point out.
  const area = h.reduce((sum, p, i) => {
    const q = h[(i + 1) % h.length];
    return sum + p.x * q.y - q.x * p.y;
  }, 0);
  if (h.length > 2 && area < 0) h = h.slice().reverse();
  const m = h.length;
  const segments = [];
  for (let i = 0; i < m; i += 1) {
    const a = h[i];
    const b = h[(i + 1) % m];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = dy / length;
    const ny = -dx / length;
    segments.push({
      a: { x: a.x + pad * nx, y: a.y + pad * ny },
      b: { x: b.x + pad * nx, y: b.y + pad * ny },
    });
  }
  const f = (value) => value.toFixed(1);
  let d = `M${f(segments[0].a.x)},${f(segments[0].a.y)}`;
  for (let i = 0; i < m; i += 1) {
    const segment = segments[i];
    const next = segments[(i + 1) % m].a;
    d += ` L${f(segment.b.x)},${f(segment.b.y)} A${pad},${pad} 0 0,1 ${f(next.x)},${f(next.y)}`;
  }
  return `${d}Z`;
}

/** The distance from `p` to the convex hull of `points` (0 inside it). */
export function distToHull(p, points) {
  const h = hull(points);
  const toSegment = (a, b) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2));
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  };
  if (h.length === 1) return Math.hypot(p.x - h[0].x, p.y - h[0].y);
  if (h.length === 2) return toSegment(h[0], h[1]);
  const side = (sign) =>
    h.every((a, i) => {
      const b = h[(i + 1) % h.length];
      return sign * ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) >= 0;
    });
  const inside = side(1) || side(-1);
  return inside ? 0 : Math.min(...h.map((a, i) => toSegment(a, h[(i + 1) % h.length])));
}

/** The payload's elements and sets, cleaned: only string ids, members that are elements. */
export function nestedSetPieces(payload) {
  const elements = (Array.isArray(payload?.elements) ? payload.elements : [])
    .filter((element) => typeof element?.id === "string")
    .map((element) => ({ id: element.id, label: String(element.label ?? element.id) }));
  const known = new Set(elements.map((element) => element.id));
  const sets = (Array.isArray(payload?.sets) ? payload.sets : [])
    .filter((set) => typeof set?.id === "string")
    .map((set) => ({
      id: set.id,
      label: String(set.label ?? set.id),
      members: [
        ...new Set((Array.isArray(set.members) ? set.members : []).filter((id) => known.has(id))),
      ],
    }));
  return { elements, sets };
}

/**
 * The regions layout, or `{ok: false, why}` when the regions can't be drawn cleanly (then the
 * set list is used, and `why` says what failed, in Redux's spec's words).
 *
 * @param {Object} payload The Nested Set payload.
 * @param {number} [minWidth] The narrowest the drawing is (the mockup's is 640); the pieces sit
 *   in the middle of it whatever it is, and where they sit relative to each other never changes.
 * @returns {{ok: true, minX: number, minY: number, width: number, height: number, cx: number,
 *   cy: number, positions: Map<string, {x: number, y: number}>,
 *   regions: Array<{id: string, d: string, pad: number, points: Array<{x: number, y: number}>}>,
 *   labels: Array<{id: string, x: number, y: number, w: number, h: number,
 *     box: {x: number, y: number, w: number, h: number}}>} | {ok: false, why: string}}
 */
export function regionsLayout(payload, minWidth = REGIONS_MIN_WIDTH) {
  const { elements, sets } = nestedSetPieces(payload);
  const n = elements.length;
  if (n === 0) return { ok: false, why: "no elements" };
  if (n > LIMITS.elements) return { ok: false, why: `more than ${LIMITS.elements} elements` };
  if (sets.length > LIMITS.sets) return { ok: false, why: `more than ${LIMITS.sets} sets` };
  // Nesting level: small sets inside, and two sets that share an element never share a level.
  const level = new Map();
  sets
    .map((_, i) => i)
    .sort((a, b) => sets[a].members.length - sets[b].members.length || a - b)
    .forEach((i) => {
      const taken = new Set(
        sets
          .map((set, j) => [set, j])
          .filter(
            ([set, j]) => level.has(j) && set.members.some((m) => sets[i].members.includes(m)),
          )
          .map(([, j]) => level.get(j)),
      );
      let l = 1;
      while (taken.has(l)) l += 1;
      level.set(i, l);
    });
  const deepest = Math.max(1, ...level.values());
  if (deepest > LIMITS.perElement) {
    return { ok: false, why: `an element sits in more than ${LIMITS.perElement} overlapping sets` };
  }
  const perm = circleOrder(elements, sets);
  const R = Math.max(130, (48 * n) / Math.PI + 30 + 6 * deepest);
  const padMax = PAD0 + PADSTEP * (deepest - 1);
  const M = padMax + 44;
  const W = Math.max(minWidth, 2 * (R + M));
  const H = 2 * (R + M) + 20;
  const cx = W / 2;
  const cy = H / 2 + 10;
  const positions = new Map();
  perm.forEach((element, place) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * place) / n;
    positions.set(elements[element].id, {
      x: cx + (n === 1 ? 0 : R * Math.cos(angle)),
      y: cy + (n === 1 ? 0 : R * Math.sin(angle)),
    });
  });
  const regions = [];
  for (let i = 0; i < sets.length; i += 1) {
    const set = sets[i];
    const pad = PAD0 + PADSTEP * (level.get(i) - 1);
    if (!set.members.length) return { ok: false, why: `${set.label} is empty` };
    const points = set.members.map((id) => positions.get(id));
    for (const element of elements) {
      if (
        !set.members.includes(element.id) &&
        distToHull(positions.get(element.id), points) < pad + DOT + LIMITS.clearance
      ) {
        return { ok: false, why: `${set.label}'s region would run into ${element.label}` };
      }
    }
    regions.push({
      id: set.id,
      d: regionPath(points, pad),
      area: set.members.length * 1000 + pad,
      pad,
      points,
    });
  }

  // Names: candidates round the hull every 15°, the side facing away from the centre first, each
  // slid a little in or out across the edge; then, for a nested set, points inside the region.
  const dots = [...positions.values()];
  const clearOf = (p, b) =>
    Math.hypot(Math.max(b.x - p.x, 0, p.x - b.x - b.w), Math.max(b.y - p.y, 0, p.y - b.y - b.h));
  const near = (a, b, margin) =>
    a.x - margin < b.x + b.w &&
    b.x - margin < a.x + a.w &&
    a.y - margin < b.y + b.h &&
    b.y - margin < a.y + a.h;
  const samples = (b) => {
    const out = [];
    for (const fx of [0, 0.25, 0.5, 0.75, 1]) {
      for (const fy of [0, 0.5, 1]) {
        out.push({ x: b.x - 2 + fx * (b.w + 4), y: b.y - 2 + fy * (b.h + 4) });
      }
    }
    return out;
  };
  // A box crosses a region's outline when some of it is near the outline or it straddles it.
  const onOutline = (b, r) => {
    const points = samples(b);
    if (points.some((p) => Math.abs(distToHull(p, r.points) - r.pad) < 4)) return true;
    const d = points.map((p) => distToHull(p, r.points) - r.pad);
    return Math.min(...d) < 0 && Math.max(...d) > 0;
  };
  const angles = Array.from({ length: 24 }, (_, k) => (k * Math.PI) / 12);
  const labels = [];
  for (const set of sets) {
    const r = regions.find((region) => region.id === set.id);
    const c = r.points.reduce(
      (sum, p) => ({ x: sum.x + p.x / r.points.length, y: sum.y + p.y / r.points.length }),
      { x: 0, y: 0 },
    );
    let base = Math.atan2(c.y - cy, c.x - cx);
    if (Math.hypot(c.x - cx, c.y - cy) < 8) base = -Math.PI / 2;
    const gap = (a) =>
      Math.abs(((((a - base) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    const w = 12 + set.label.length * 8.5;
    const h = 22;
    const candidates = [];
    for (const a of angles.slice().sort((p, q) => gap(p) - gap(q) || p - q)) {
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      const far = r.points.reduce((best, p) =>
        p.x * ux + p.y * uy > best.x * ux + best.y * uy + 1e-9 ? p : best,
      );
      for (const t of [r.pad, r.pad + 4, r.pad - 4, r.pad + 8, r.pad - 8, r.pad + 12, r.pad + 16]) {
        candidates.push({ x: far.x + t * ux, y: far.y + t * uy });
      }
    }
    const hp = hull(r.points);
    hp.forEach((p, i) => {
      const q = hp[(i + 1) % hp.length];
      if (q !== p) {
        for (const f of [0.5, 0.35, 0.65]) {
          candidates.push({ x: p.x + f * (q.x - p.x), y: p.y + f * (q.y - p.y) });
        }
      }
    });
    candidates.push(c);
    let placed = null;
    for (const { x, y } of candidates) {
      const box = { x: x - w / 2, y: y - h / 2, w, h };
      if (box.x < 2 || box.y < 34 || box.x + w > W - 2 || box.y + h > H - 2) continue;
      if (dots.some((p) => clearOf(p, box) < DOT + 3)) continue;
      if (labels.some((label) => near(label.box, box, LABEL_GAP))) continue;
      if (regions.some((other) => other.id !== r.id && onOutline(box, other))) continue;
      // And it must be on its own region: across its edge, or inside it.
      if (!onOutline(box, r) && !samples(box).every((p) => distToHull(p, r.points) <= r.pad)) {
        continue;
      }
      placed = { id: r.id, x, y, w, h, box };
      break;
    }
    if (!placed) return { ok: false, why: `no room for ${set.label}'s label` };
    labels.push(placed);
  }
  return {
    ok: true,
    minX: 0,
    minY: 0,
    width: W,
    height: H,
    cx,
    cy,
    positions,
    // Fills under all the outlines, the biggest first, so a small region's tint shows on top.
    regions: regions.sort((a, b) => b.area - a.area),
    labels,
  };
}

/** A chip's width in the set list. */
function chipWidth(label) {
  return Math.max(2 * DOT, String(label).length * 8.4 + 16);
}

/** Where the set list's rows start: under its two heading lines. */
const LIST_TOP = 58;

/**
 * The set list: U on top, then one row per set, its elements as chips that wrap.
 * @param {Object} payload The Nested Set payload.
 * @param {number} [width] The box's width, clamped to LIST_MIN_WIDTH..LIST_MAX_WIDTH.
 * @returns {{minX: number, minY: number, width: number, height: number,
 *   rows: Array<{id: string, label: string, x: number, y: number, w: number, h: number,
 *     chips: Array<{id: string, label: string, x: number, y: number, w: number, h: number}>}>}}
 */
export function listLayout(payload, width = LIST_MAX_WIDTH) {
  const W = Math.round(Math.min(LIST_MAX_WIDTH, Math.max(LIST_MIN_WIDTH, width || LIST_MAX_WIDTH)));
  const { elements, sets } = nestedSetPieces(payload);
  const labels = new Map(elements.map((element) => [element.id, element.label]));
  const rows = [];
  const tagWidth = 64;
  let y = LIST_TOP;
  const place = (id, label, members) => {
    let x = tagWidth + 30;
    let line = 0;
    const chips = members.map((member) => {
      const w = chipWidth(labels.get(member));
      if (x + w > W - 30) {
        x = tagWidth + 30;
        line += 1;
      }
      const chip = {
        id: member,
        label: labels.get(member),
        x,
        y: y + 8 + line * 40,
        w,
        h: 2 * DOT,
      };
      x += w + 10;
      return chip;
    });
    const h = 16 + (line + 1) * 40 - 8;
    rows.push({ id, label, x: 10, y, w: W - 20, h, chips });
    y += h + 12;
  };
  place(
    "U",
    "U",
    elements.map((element) => element.id),
  );
  y += 10;
  for (const set of sets) place(set.id, set.label, set.members);
  return { minX: 0, minY: 0, width: W, height: y + 6, rows };
}
