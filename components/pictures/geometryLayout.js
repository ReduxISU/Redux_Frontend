// components/pictures/geometryLayout.js
//
// #212: where the Geometry picture puts its points. A pure function of the payload (and the
// width of the box it is drawn in): no randomness, no DOM, no React, so the same points always
// land in the same place, before Run and at every step. Ported from Redux's design mockup
// (Documentation/Visualizations/mockups/misc.js, the Convex Hull `draw()`), not from its parser
// or solvers.
//
// The points are drawn to scale on real axes, x to the right and y up, with one scale for both
// so a square stays square. The plot is framed by a grid at a round step, its numbers outside
// the plot (the y axis's down its left, the x axis's along its bottom), so a point's label can
// never meet one. The step is the roundest that keeps the x axis's numbers apart at the
// drawing's width.
//
// Each point's label (P1, P2, ...) goes beside it where it meets no other label, no point, no
// corner badge and no line the run ever draws (a hull's edge, the merge's chain, a popped
// point's dashed line, or a bold axis): the first of eight places round the point that is clear
// (right and above, then right and below, and so on), else in the first clear gap round it
// (every 15 degrees, near first, then further out), and the least crowded place if none is
// clear. The lines are every frame's at once, so a label holds still while the steps walk (it
// may move once, when Run brings the lines). Each corner of an answer first keeps a spot for
// its order badge (above left unless something is in the way there), so a badge never covers
// a label or sits on a line.
//
// The drawing is as wide as its box (between MIN_WIDTH and WIDTH), so on a phone its text is
// drawn at its own size, not shrunk to fit.

/** The drawing's width at most (and before the box is measured) and at least. */
export const WIDTH = 680;
export const MIN_WIDTH = 260;

/** The plot's height at most and at least. */
const MAX_PLOT_HEIGHT = 500;
const MIN_PLOT_HEIGHT = 220;

/** The margins round the plot (the left and bottom ones hold the axes' numbers). */
const PAD_TOP = 14;
const PAD_RIGHT = 14;
const PAD_BOTTOM = 30;
const AXIS_GAP = 8;

/** How far inside the plot's edge the outermost points sit, so their labels fit. */
const INSET = 34;

/** A point's dot radius, and its order badge's. */
export const DOT_RADIUS = 6;
export const BADGE_RADIUS = 9.5;
const BADGE_OFFSET = 12;

/** The text sizes, and a character's width at each (the monospace font's 0.62 em). */
export const TICK_SIZE = 11;
export const LABEL_SIZE = 11.5;
const CHAR = 0.62;
const LABEL_HEIGHT = 13;

/**
 * How far a label or a badge keeps from a line's centre (half the thickest line, and a little),
 * and how much a line crossing a place counts against it, per unit of its length inside, beside
 * an overlap's area.
 */
const LINE_PAD = 2;
const LINE_WEIGHT = 10;

/** How far apart the x axis's numbers keep at least, in drawing units. */
const TICK_GAP = 14;

function round(value) {
  return Math.round(value * 100) / 100;
}

/** A number as the picture writes it: up to three decimals, no trailing zeros. */
export function formatCoordinate(value) {
  return String(Number(Number(value).toFixed(3)));
}

/** A tick's number at `step`'s precision. */
function tickText(value, decimals) {
  const text = Number(value.toFixed(decimals)).toString();
  return text === "-0" ? "0" : text;
}

/** The round steps (1, 2, 5 times a power of ten) from about `rough` up. */
function* niceSteps(rough) {
  let power = 10 ** Math.floor(Math.log10(rough));
  for (;;) {
    for (const factor of [1, 2, 5]) {
      if (factor * power >= rough * 0.999) yield factor * power;
    }
    power *= 10;
  }
}

/** The ticks from `low` to `high` at `step`. */
function ticksOf(low, high, step) {
  const ticks = [];
  for (let k = Math.ceil(low / step - 1e-9); k * step <= high + 1e-9; k += 1) ticks.push(k * step);
  return ticks;
}

/** How much two boxes overlap, as an area. */
function overlapArea(a, b) {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * How long a stretch of the segment ({x1, y1, x2, y2}) runs inside the box, grown by `pad` on
 * every side (0 when it misses): Liang-Barsky clipping.
 */
function lengthInside(segment, box, pad) {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [
    [-dx, segment.x1 - (box.x0 - pad)],
    [dx, box.x1 + pad - segment.x1],
    [-dy, segment.y1 - (box.y0 - pad)],
    [dy, box.y1 + pad - segment.y1],
  ]) {
    if (p === 0) {
      if (q < 0) return 0;
    } else {
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
      if (t0 >= t1) return 0;
    }
  }
  return (t1 - t0) * Math.hypot(dx, dy);
}

/** How far the segment ({x1, y1, x2, y2}) passes from (x, y). */
function distanceTo(segment, x, y) {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const length = dx * dx + dy * dy;
  const t = length
    ? Math.max(0, Math.min(1, ((x - segment.x1) * dx + (y - segment.y1) * dy) / length))
    : 0;
  return Math.hypot(segment.x1 + t * dx - x, segment.y1 + t * dy - y);
}

/**
 * Every pair of points a line joins in some frame: the hulls' edges (a closed outline for three
 * corners or more), the answer's, the merge's chain and a Reject step's popped points (a line
 * from the chain's end to each), as GeometryRenderer.js draws them.
 */
function drawnPairs(frames, known) {
  const pairs = new Map();
  const join = (a, b) => {
    if (a !== b && known.has(a) && known.has(b))
      pairs.set(a < b ? `${a} ${b}` : `${b} ${a}`, [a, b]);
  };
  const outline = (ids, closed) => {
    const list = (Array.isArray(ids) ? ids : []).filter((id) => known.has(id));
    for (let i = 0; i + 1 < list.length; i += 1) join(list[i], list[i + 1]);
    if (closed && list.length >= 3) join(list.at(-1), list[0]);
  };
  for (const frame of Array.isArray(frames) ? frames : []) {
    if (!frame) continue;
    for (const piece of Array.isArray(frame.pieces) ? frame.pieces : [])
      outline(piece?.points, true);
    outline(frame.hull, true);
    const chain = (Array.isArray(frame.chain) ? frame.chain : []).filter((id) => known.has(id));
    outline(chain, false);
    if (frame.event === "Reject" && chain.length) {
      for (const id of Array.isArray(frame.focus) ? frame.focus : []) join(chain.at(-1), id);
    }
  }
  return [...pairs.values()];
}

/**
 * The spots an order badge may take round its corner, in the order it tries them: the four
 * diagonals (above left first), then straight above, left, right and below, each as far from
 * the point as a diagonal one.
 */
const BADGE_WAYS = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
  [0, -Math.SQRT2],
  [-Math.SQRT2, 0],
  [Math.SQRT2, 0],
  [0, Math.SQRT2],
];

/**
 * The places a label `w` wide may go round a point at (x, y), first choice first: right and
 * above, right and below, right, left, left and below, above, below and left and above, close
 * by; then, so a label can find the gap between the lines that leave its point, every 15
 * degrees round it (from straight right, counterclockwise on the screen), close by, then a
 * little further out each time, up to four times as far.
 */
function labelPlaces(x, y, w) {
  const h = LABEL_HEIGHT;
  const d = DOT_RADIUS + 3;
  const places = [
    { x0: x + d, y0: y - d - h + 2 },
    { x0: x + d, y0: y + d - 2 },
    { x0: x + d + 2, y0: y - h / 2 },
    { x0: x - d - 2 - w, y0: y - h / 2 },
    { x0: x - d - w, y0: y + d - 2 },
    { x0: x - w / 2, y0: y - d - h - 1 },
    { x0: x - w / 2, y0: y + d + 1 },
    { x0: x - d - w, y0: y - d - h + 2 },
  ];
  for (const reach of [1, 2, 3, 4]) {
    for (let degrees = 0; degrees < 360; degrees += 15) {
      const angle = (degrees * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = -Math.sin(angle);
      // Out along the angle until the label's nearest side is `reach` steps clear of the dot.
      const out = DOT_RADIUS + 3 * reach + (w / 2) * Math.abs(cos) + (h / 2) * Math.abs(sin);
      places.push({ x0: x + cos * out - w / 2, y0: y + sin * out - h / 2 });
    }
  }
  return places.map((place) => ({ ...place, x1: place.x0 + w, y1: place.y0 + h }));
}

/**
 * The Geometry picture's layout.
 *
 * @param {Object} payload The Geometry payload (`points: [{id, x, y}]`).
 * @param {number|null} [width] The width of the box it is drawn in, in CSS px (WIDTH until it is
 *   measured); the drawing takes it, kept between MIN_WIDTH and WIDTH.
 * @param {Object[]} [frames] The run's frames (none before Run): every line they draw is kept
 *   clear of the labels, so the labels hold still over the run.
 * @returns {{minX: number, minY: number, width: number, height: number,
 *   plot: {x: number, y: number, width: number, height: number},
 *   points: Array<{id: string, index: number, x: number, y: number, px: number, py: number,
 *     label: {x: number, y: number, width: number}, badge: {x: number, y: number}}>,
 *   xTicks: Array<{value: number, text: string, at: number, axis: boolean, labelled: boolean}>,
 *   yTicks: Array<{value: number, text: string, at: number, axis: boolean, labelled: boolean}>}}
 */
export function layoutGeometry(payload, width = WIDTH, frames = []) {
  const drawingWidth = Math.round(Math.min(WIDTH, Math.max(MIN_WIDTH, width || WIDTH)));
  const raw = (Array.isArray(payload?.points) ? payload.points : []).filter(
    (point) =>
      typeof point?.id === "string" && Number.isFinite(point.x) && Number.isFinite(point.y),
  );
  const xs = raw.map((point) => point.x);
  const ys = raw.map((point) => point.y);
  const minX = raw.length ? Math.min(...xs) : 0;
  const maxX = raw.length ? Math.max(...xs) : 1;
  const minY = raw.length ? Math.min(...ys) : 0;
  const maxY = raw.length ? Math.max(...ys) : 1;
  // A spread of nothing (one point, or points in a line) still gets a unit of room.
  const spreadX = maxX - minX || Math.max(1, Math.abs(maxX));
  const spreadY = maxY - minY || Math.max(1, Math.abs(maxY));

  // The scale, from a first guess at the y axis's numbers' width, then once more with the
  // numbers the step it gives actually writes.
  let gutter = 40;
  let scale = 1;
  let step = 1;
  let decimals = 0;
  let plotWidth = 0;
  let plotHeight = 0;
  for (let pass = 0; pass < 3; pass += 1) {
    plotWidth = drawingWidth - gutter - PAD_RIGHT;
    scale = (plotWidth - 2 * INSET) / spreadX;
    plotHeight = spreadY * scale + 2 * INSET;
    if (plotHeight > MAX_PLOT_HEIGHT) {
      scale = (MAX_PLOT_HEIGHT - 2 * INSET) / spreadY;
      plotHeight = MAX_PLOT_HEIGHT;
    }
    plotHeight = Math.max(MIN_PLOT_HEIGHT, plotHeight);
    // The x range the plot shows, centred on the points.
    const shownX = plotWidth / scale;
    const shownY = plotHeight / scale;
    const lowX = (minX + maxX) / 2 - shownX / 2;
    const lowY = (minY + maxY) / 2 - shownY / 2;
    // The roundest step (from about eight lines across) whose x numbers keep apart.
    for (const candidate of niceSteps(Math.max(shownX, shownY) / 8)) {
      const places = Math.max(0, -Math.floor(Math.log10(candidate) + 1e-9));
      const widest = Math.max(
        ...ticksOf(lowX, lowX + shownX, candidate).map(
          (value) => tickText(value, places).length * TICK_SIZE * CHAR,
        ),
        1,
      );
      if (candidate * scale >= widest + TICK_GAP) {
        step = candidate;
        decimals = places;
        break;
      }
    }
    const yNumbers = ticksOf(lowY, lowY + shownY, step).map((value) => tickText(value, decimals));
    const next =
      Math.ceil(Math.max(1, ...yNumbers.map((text) => text.length)) * TICK_SIZE * CHAR) +
      AXIS_GAP +
      6;
    if (next === gutter) break;
    gutter = next;
  }

  const plot = { x: gutter, y: PAD_TOP, width: plotWidth, height: plotHeight };
  const centreX = (minX + maxX) / 2;
  const centreY = (minY + maxY) / 2;
  const toX = (value) => round(plot.x + plot.width / 2 + (value - centreX) * scale);
  const toY = (value) => round(plot.y + plot.height / 2 - (value - centreY) * scale);
  const lowX = centreX - plot.width / 2 / scale;
  const highX = centreX + plot.width / 2 / scale;
  const lowY = centreY - plot.height / 2 / scale;
  const highY = centreY + plot.height / 2 / scale;

  // The x numbers sit under the plot, centred on their line, each kept inside the drawing.
  const xTicks = ticksOf(lowX, highX, step).map((value) => {
    const text = tickText(value, decimals);
    const at = toX(value);
    const half = (text.length * TICK_SIZE * CHAR) / 2;
    return {
      value,
      text,
      at,
      axis: Math.abs(value) < step / 2,
      labelled: at - half >= 0 && at + half <= drawingWidth,
    };
  });
  // The y numbers sit left of the plot, right-aligned, each clear of the plot's top and bottom.
  const yTicks = ticksOf(lowY, highY, step).map((value) => {
    const at = toY(value);
    return {
      value,
      text: tickText(value, decimals),
      at,
      axis: Math.abs(value) < step / 2,
      labelled: at - TICK_SIZE / 2 >= 0 && at + TICK_SIZE / 2 <= plot.y + plot.height,
    };
  });

  // The points, then their badges and labels, placed one by one where nothing is in the way.
  const points = raw.map((point, index) => ({
    id: point.id,
    index,
    x: point.x,
    y: point.y,
    px: toX(point.x),
    py: toY(point.y),
  }));
  const byId = new Map(points.map((point) => [point.id, point]));
  // Every line the run draws over a label's way (the bold axes and the hulls, chains and popped
  // points' lines of every frame), in drawing units.
  const lines = [
    ...xTicks
      .filter((tick) => tick.axis)
      .map((tick) => ({ x1: tick.at, y1: plot.y, x2: tick.at, y2: plot.y + plot.height })),
    ...yTicks
      .filter((tick) => tick.axis)
      .map((tick) => ({ x1: plot.x, y1: tick.at, x2: plot.x + plot.width, y2: tick.at })),
    ...drawnPairs(frames, byId).map(([a, b]) => ({
      x1: byId.get(a).px,
      y1: byId.get(a).py,
      x2: byId.get(b).px,
      y2: byId.get(b).py,
    })),
  ];
  const blocked = points.map((point) => ({
    x0: point.px - DOT_RADIUS - 1,
    y0: point.py - DOT_RADIUS - 1,
    x1: point.px + DOT_RADIUS + 1,
    y1: point.py + DOT_RADIUS + 1,
  }));
  const inside = (box) =>
    box.x0 >= plot.x + 1 &&
    box.x1 <= plot.x + plot.width - 1 &&
    box.y0 >= plot.y + 1 &&
    box.y1 <= plot.y + plot.height - 1;
  // How much is in the way of a box: what it covers of the points, badges and labels placed so
  // far (`skip` is its own point's dot) and of the lines (each counted LINE_WEIGHT times its
  // length inside, `crossing` measuring it), and a great deal more if it leaves the plot.
  const crowding = (box, skip, crossing) =>
    blocked.reduce(
      (sum, other, index) => (index === skip ? sum : sum + overlapArea(other, box)),
      0,
    ) +
    LINE_WEIGHT * lines.reduce((sum, line) => sum + crossing(line), 0) +
    (inside(box) ? 0 : 1e6);
  // The answer's corners (in any frame) keep a spot for their order badge first: the first of
  // its ways that covers no other point, badge or line, else the least crowded. Every other
  // point gets a spot too (unreserved), so a frame drawn on its own still has somewhere to put
  // one.
  const corners = new Set(
    (Array.isArray(frames) ? frames : []).flatMap((frame) =>
      Array.isArray(frame?.hull) ? frame.hull : [],
    ),
  );
  for (const point of points) {
    const spots = BADGE_WAYS.map(([dx, dy]) => {
      const x = round(point.px + dx * BADGE_OFFSET);
      const y = round(point.py + dy * BADGE_OFFSET);
      return {
        x,
        y,
        x0: x - BADGE_RADIUS,
        y0: y - BADGE_RADIUS,
        x1: x + BADGE_RADIUS,
        y1: y + BADGE_RADIUS,
      };
    });
    const cost = (spot) =>
      crowding(spot, point.index, (line) =>
        Math.max(0, BADGE_RADIUS + LINE_PAD - distanceTo(line, spot.x, spot.y)),
      );
    const spot =
      spots.find((box) => cost(box) === 0) ??
      spots.reduce((best, box) => (cost(box) < cost(best) ? box : best));
    point.badge = { x: spot.x, y: spot.y };
    if (corners.has(point.id)) blocked.push(spot);
  }
  for (const point of points) {
    const w = point.id.length * LABEL_SIZE * CHAR + 2;
    const places = labelPlaces(point.px, point.py, w);
    const cost = (place) => crowding(place, -1, (line) => lengthInside(line, place, LINE_PAD));
    const chosen =
      places.find((place) => cost(place) === 0) ??
      places.reduce((best, place) => (cost(place) < cost(best) ? place : best));
    blocked.push(chosen);
    point.label = {
      x: round(chosen.x0 + 1),
      y: round(chosen.y0 + LABEL_HEIGHT / 2),
      width: round(w),
    };
  }

  return {
    minX: 0,
    minY: 0,
    width: drawingWidth,
    height: Math.ceil(plot.y + plot.height + PAD_BOTTOM),
    plot,
    points,
    xTicks,
    yTicks,
    tickY: plot.y + plot.height + 16,
    tickX: plot.x - AXIS_GAP,
  };
}
