// components/pictures/tripartiteLayout.js
//
// #213: where the Tripartite Matching picture puts everything. A pure function of the payload
// and the width of the box it is drawn in: no randomness, no DOM, no React, so the same instance
// always lands in the same place, before Run and at every step. Ported from Redux's design
// mockup (Documentation/Visualizations/mockups/misc.js, the 3-Dimensional Matching `draw()`),
// not from its parser or solvers.
//
// X, Y and Z are three columns of name pills, each column as wide as its longest name and
// centred on the tallest; M's triples are listed with their names, beside the columns when the
// drawing is wide enough and under them when it is not (in as many list columns as fit). Each
// triple is a line through its three names: from its X pill's right edge to its Y pill's left
// edge, and on from the Y pill's right edge to its Z pill's left edge, each triple a little
// above or below the others (its lane) so two triples through the same names stay apart. So a
// line runs only between two columns, and never over a name or the list.
//
// A name's ×2 badge (used twice) sits at its pill's top right, inside its column, where no line
// reaches. The drawing is as wide as its box (between MIN_WIDTH and WIDTH), so on a phone its
// text is drawn at its own size, not shrunk to fit.

/** The drawing's width at most (and before the box is measured) and at least. */
export const WIDTH = 790;
export const MIN_WIDTH = 260;

/** The text sizes, and a character's width at each (the monospace font's 0.62 em). */
export const NAME_SIZE = 12.5;
export const LIST_SIZE = 12;
export const HEAD_SIZE = 11;
const CHAR = 0.62;

/** A name pill's height, its narrowest, and the distance between two names' centres. */
export const PILL_HEIGHT = 28;
const MIN_PILL = 48;
const ROW = 46;

/** A row of the triple list: its height, and its padding round its text. */
export const LIST_ROW = 22;
const LIST_PAD = 6;

/**
 * The margin at the drawing's edges, and the gaps between columns (at least, at least on a
 * phone, and at most).
 */
const PAD = 12;
const MIN_GAP = 28;
const TIGHT_GAP = 18;
const MAX_GAP = 150;
/** The gap between the columns and the list beside them. */
const LIST_GAP = 32;

/** Where the heads sit, and where the first names start. */
const HEAD_Y = 14;
const TOP = 34;

/** How far apart neighbouring triples' lanes are at most, and how far they spread in all. */
const LANE = 3;
const LANE_SPREAD = 18;

/** The ×2 badge's radius, and how far its centre sits in from the pill's right and above it. */
export const BADGE_RADIUS = 9;
const BADGE_IN = 10;
const BADGE_UP = 18;

function round(value) {
  return Math.round(value * 100) / 100;
}

function textWidth(text, size) {
  return String(text).length * size * CHAR;
}

/** A triple's names as the list writes them: "Paul · Madison · Chloe". */
export function tripleNames(names) {
  return names.join(" · ");
}

/**
 * A triple's line through its three names' pills (at their current places), `lane` above or
 * below their centres: two segments, X to Y and Y to Z.
 * @returns {string} An SVG path.
 */
export function triplePath(x, y, z, lane) {
  const segment = (from, to) =>
    `M${round(from.x + from.width / 2)},${round(from.y + lane)} L${round(to.x - to.width / 2)},${round(to.y + lane)}`;
  return `${segment(x, y)} ${segment(y, z)}`;
}

/** A name's ×2 badge's centre, at its pill's top right. */
export function badgeAt(element) {
  return { x: round(element.x + element.width / 2 - BADGE_IN), y: round(element.y - BADGE_UP) };
}

/**
 * The Tripartite Matching picture's layout.
 * @param {Object} payload The Tripartite Matching payload (`x`, `y`, `z`: `[{id, name}]`,
 *   `triples: [{id, x, y, z}]`).
 * @param {number|null} [width] The width of the box it is drawn in, in CSS px (WIDTH until it is
 *   measured).
 * @returns {{minX: number, minY: number, width: number, height: number, wide: boolean,
 *   columns: Array<{key: string, head: string, x: number, width: number}>,
 *   elements: Array<{id: string, name: string, column: number, x: number, y: number,
 *     width: number}>,
 *   triples: Array<{id: string, x: string, y: string, z: string, names: string[],
 *     lane: number, row: {x: number, y: number, width: number, idX: number, namesX: number}}>,
 *   list: {x: number, headY: number}, top: number, bottom: number, headY: number}}
 */
export function layoutTripartite(payload, width = WIDTH) {
  const target = Math.round(Math.min(WIDTH, Math.max(MIN_WIDTH, width || WIDTH)));
  const sets = ["x", "y", "z"].map((key) =>
    (Array.isArray(payload?.[key]) ? payload[key] : []).filter(
      (element) => typeof element?.id === "string",
    ),
  );
  const nameOf = new Map(
    sets.flat().map((element) => [element.id, String(element.name ?? element.id)]),
  );
  const columnOf = new Map(sets.flatMap((set, k) => set.map((element) => [element.id, k])));
  const triples = (Array.isArray(payload?.triples) ? payload.triples : []).filter(
    (triple) =>
      typeof triple?.id === "string" &&
      columnOf.get(triple.x) === 0 &&
      columnOf.get(triple.y) === 1 &&
      columnOf.get(triple.z) === 2,
  );
  // A pill's padding round its name, and the narrowest gap between columns: closer on a box
  // too narrow for the roomy ones (a phone), so the names keep their size.
  const pillsWith = (padding) =>
    sets.map((set) =>
      Math.ceil(
        Math.max(MIN_PILL, ...set.map((e) => textWidth(nameOf.get(e.id), NAME_SIZE) + padding)),
      ),
    );
  const sum = (list) => list.reduce((total, w) => total + w, 0);
  const roomy = sum(pillsWith(22)) + 2 * MIN_GAP + 2 * PAD <= target;
  const pillWidths = pillsWith(roomy ? 22 : 14);
  const minGap = roomy ? MIN_GAP : TIGHT_GAP;
  const pills = sum(pillWidths);

  // The list's rows: each wide enough for its id and its three names.
  const idWidth = Math.max(
    textWidth("T0", LIST_SIZE),
    ...triples.map((triple) => textWidth(triple.id, LIST_SIZE)),
  );
  const namesWidth = Math.max(
    0,
    ...triples.map((triple) =>
      textWidth(tripleNames([triple.x, triple.y, triple.z].map((id) => nameOf.get(id))), LIST_SIZE),
    ),
  );
  const rowWidth = Math.ceil(idWidth + 10 + namesWidth + 2 * LIST_PAD);
  const headWidth = textWidth("TRIPLES · M", HEAD_SIZE) * 1.1;
  const listWidth = Math.max(rowWidth, headWidth);

  // Beside the columns when they keep gaps of 80 that way, else under them.
  const wide = target >= 2 * PAD + pills + 2 * 80 + LIST_GAP + listWidth;
  const columnsWidth = wide ? target - 2 * PAD - LIST_GAP - listWidth : target - 2 * PAD;
  const gap = Math.min(MAX_GAP, Math.max(minGap, (columnsWidth - pills) / 2));
  const span = pills + 2 * gap;
  // The columns centred in their room (the drawing grows when even the narrowest gaps don't fit).
  const left = PAD + Math.max(0, (columnsWidth - span) / 2);
  const columns = [];
  let at = left;
  for (let k = 0; k < 3; k += 1) {
    columns.push({
      key: ["x", "y", "z"][k],
      head: ["X", "Y", "Z"][k],
      x: round(at + pillWidths[k] / 2),
      width: pillWidths[k],
    });
    at += pillWidths[k] + gap;
  }
  const rows = Math.max(1, ...sets.map((set) => set.length));
  const elements = sets.flatMap((set, k) =>
    set.map((element, i) => ({
      id: element.id,
      name: nameOf.get(element.id),
      column: k,
      x: columns[k].x,
      y: round(TOP + ((rows - set.length) * ROW) / 2 + ROW / 2 + i * ROW),
      width: pillWidths[k],
    })),
  );
  const bottom = TOP + rows * ROW;

  // The list: one column beside the picture, or as many as fit under it.
  const listX = wide ? PAD + columnsWidth + LIST_GAP : PAD;
  const listTop = wide ? TOP : bottom + 34;
  const listColumns = wide
    ? 1
    : Math.max(1, Math.floor((target - 2 * PAD + 12) / (listWidth + 12)));
  const perColumn = Math.max(1, Math.ceil(triples.length / listColumns));
  const lane = Math.min(LANE, LANE_SPREAD / Math.max(1, triples.length - 1));
  const laidTriples = triples.map((triple, i) => {
    const column = Math.floor(i / perColumn);
    const x = listX + column * (listWidth + 12);
    const y = listTop + (i - column * perColumn) * LIST_ROW + LIST_ROW / 2;
    return {
      id: triple.id,
      x: triple.x,
      y: triple.y,
      z: triple.z,
      names: [triple.x, triple.y, triple.z].map((id) => nameOf.get(id)),
      lane: round((i - (triples.length - 1) / 2) * lane),
      row: {
        x: round(x),
        y: round(y),
        width: rowWidth,
        idX: round(x + LIST_PAD),
        namesX: round(x + LIST_PAD + idWidth + 10),
      },
    };
  });
  const listBottom = listTop + perColumn * LIST_ROW;
  const drawingWidth = Math.max(
    target,
    Math.ceil(left + span + PAD + (wide ? LIST_GAP + listWidth : 0)),
    Math.ceil(listX + listColumns * (listWidth + 12) - 12 + PAD),
  );
  return {
    minX: 0,
    minY: 0,
    width: drawingWidth,
    height: Math.ceil(Math.max(bottom, triples.length ? listBottom : 0) + 12),
    wide,
    columns,
    elements,
    triples: laidTriples,
    list: { x: round(listX), headY: wide ? HEAD_Y : listTop - 16 },
    headY: HEAD_Y,
    top: TOP,
    bottom,
  };
}
