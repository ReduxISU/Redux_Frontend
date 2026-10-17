// components/pictures/tableLayout.js
//
// #209: where the Table picture puts everything. A pure function of the payload, the width of the
// box it is drawn in and the run's frames: no randomness, no DOM, no React, so the same instance
// always lands in the same place, at every step. Ported from Redux's design mockup
// (Documentation/Visualizations/mockups/table.js, `drawED` and the HTML tables), not from its
// parsers or solvers.
//
// Two layouts, by the payload's `shape`:
//   - grid (Edit Distance): the dynamic-programming grid of square cells, y's letters across the
//     top and x's down the side, each axis named ("TARGET y", "SOURCE x"). The cells are as large
//     as the box allows between MIN_CELL and MAX_CELL, so on a phone the numbers keep their size.
//   - trace and matrix (DFA, NFA, SSSP, SPSP; 0-1 ILP): a table with a header row, a row label
//     column when the rows have labels, and one column per payload column, each as wide as the
//     widest text any frame (and the blank) writes in it. On a narrow box the padding and the text
//     tighten (TIERS) before the table is drawn wider than its box; a wider one opens at Fit and
//     zooms in to its text's own size.
//
// Every column is sized from the whole run, and every row the payload lists keeps its place while
// the steps walk, so nothing moves while stepping: a trace's rows appear in their own slots. Before
// Run only the blank's rows are laid out (a trace's start row): reserving the others would give
// away how long the run is.
//
// The drawing is at least as wide as its box (up to MAX_WIDTH), with the table centred in it, so at
// Fit its text is drawn at its own size, not blown up past it on a wide screen.

/** The drawing's width at most (and before the box is measured) and at least. */
export const MAX_WIDTH = 760;
const MIN_WIDTH = 200;

/** A character's width in the monospace font, in em (generous, so text never outgrows a cell). */
const CHAR = 0.62;

/** The headings' size and letter spacing (in em). */
export const HEAD_SIZE = 11;
export const HEAD_SPACING = 0.05;

/** The margin at the drawing's edges. */
const PAD = 8;

/** A table's header and body row heights. */
export const HEAD_ROW = 30;
export const ROW = 30;

/** A pill's height and a matrix chip's height and least width (the x row's 0, 1 and ?). */
export const PILL_HEIGHT = 20;
export const CHIP_HEIGHT = 22;
const CHIP_MIN = 26;

/**
 * The text size, cell padding and pill padding a table tries, roomiest first: the first whose
 * table fits the box is used, else the tightest.
 */
const TIERS = [
  { font: 13, pad: 12, pill: 8 },
  { font: 12, pad: 8, pill: 6 },
  { font: 12, pad: 5, pill: 4 },
  { font: 12, pad: 3, pill: 3 },
  { font: 11, pad: 3, pill: 3 },
];

/** A pill's text size for a table's text size: a size smaller, but never under 11. */
export function pillSize(font) {
  return Math.max(11, font - 1);
}

/** The columns whose values are drawn as pills (a verdict or a settled mark). */
export const PILL_KEYS = new Set(["accepting", "holds", "settled"]);

/** Edit Distance: a cell's side at most and at least, and the bands for the axes. */
const MAX_CELL = 44;
// At least room for a step's arrow between two neighbours' numbers.
const MIN_CELL = 30;
const SIDE_BAND = 20;
const TOP_BAND = 22;
const LETTER_BAND = 24;

function round(value) {
  return Math.round(value * 100) / 100;
}

/** How wide `text` is at `size`, in drawing units (by code point: ε and → are one each). */
export function textWidth(text, size) {
  return [...String(text ?? "")].length * size * CHAR;
}

/** How wide a heading is (capitals, spaced out). */
export function headWidth(text) {
  return [...String(text ?? "")].length * HEAD_SIZE * (CHAR + HEAD_SPACING);
}

/** A cell id ("r2c3") as its row and column, or null. */
export function cellAt(id) {
  const match = /^r(\d+)c(\d+)$/.exec(typeof id === "string" ? id : "");
  return match ? { row: Number(match[1]), column: Number(match[2]) } : null;
}

/** An axis name as the mockup writes it: "source x" -> "SOURCE x". */
export function axisText(text) {
  const words = String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const last = words.length > 1 && words.at(-1).length === 1 ? words.pop() : null;
  return `${words.join(" ").toUpperCase()}${last ? ` ${last}` : ""}`;
}

/** True for a value that reads as a number (∞ too), so its column is right-aligned. */
function numeric(text) {
  return /^(-?\d+(\.\d+)?|∞|-∞)$/.test(String(text).trim());
}

/** The drawing's width for a box `width` wide. */
function targetWidth(width) {
  return Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width || MAX_WIDTH)));
}

/** Every value matrix the layout is sized from: the blank's and every frame's. */
function valueSets(payload, frames) {
  const sets = [];
  if (Array.isArray(payload?.blank?.values)) sets.push(payload.blank.values);
  for (const frame of Array.isArray(frames) ? frames : []) {
    if (Array.isArray(frame?.values)) sets.push(frame.values);
  }
  return sets;
}

/**
 * The longest text each column holds over the blank and `frames` (one string per column). The
 * plain frame keeps it (TableRenderer.js's tablePlainFrame), so a table drawn before Run is laid
 * out at the widths the run will need.
 * @returns {string[]}
 */
export function widestTexts(payload, frames) {
  const columns = Array.isArray(payload?.columns) ? payload.columns : [];
  const widest = columns.map(() => "");
  for (const values of valueSets(payload, frames)) {
    for (const row of values) {
      if (!Array.isArray(row)) continue;
      row.forEach((text, c) => {
        if (c < widest.length && text != null && [...String(text)].length > [...widest[c]].length) {
          widest[c] = String(text);
        }
      });
    }
  }
  return widest;
}

/**
 * The Table picture's layout: the grid's or the table's, by the payload's shape.
 * @param {Object} payload The Table payload.
 * @param {Object} [options]
 * @param {number|null} [options.width] The box's width in CSS px (MAX_WIDTH until measured).
 * @param {Object[]} [options.frames] The run's frames (none before Run).
 * @param {number|null} [options.shownRows] Before Run, how many rows the plain frame draws; null
 *   during a run (every row the payload lists keeps its slot).
 * @param {string[]} [options.widest] The longest text per column, when the frames are not at hand
 *   (the plain frame's).
 */
export function layoutTable(
  payload,
  { width = MAX_WIDTH, frames = [], shownRows = null, widest = null } = {},
) {
  return payload?.shape === "grid"
    ? layoutGrid(payload, width)
    : layoutRows(payload, width, frames, shownRows, widest);
}

// ---- Grid (Edit Distance) ------------------------------------------------------------------

/**
 * @returns {{kind: "grid", minX: number, minY: number, width: number, height: number,
 *   cell: number, valueSize: number, ox: number, oy: number, gridWidth: number,
 *   gridHeight: number, gap: number,
 *   columns: Array<{id: string, label: string, x: number, cx: number}>,
 *   rows: Array<{id: string, label: string, y: number, cy: number}>,
 *   columnAxis: {text: string, x: number, y: number}|null,
 *   rowAxis: {text: string, x: number, y: number}|null}}
 */
function layoutGrid(payload, width) {
  const columns = Array.isArray(payload?.columns) ? payload.columns : [];
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const n = Math.max(1, columns.length);
  const target = targetWidth(width);
  const ox = PAD + SIDE_BAND + LETTER_BAND;
  const oy = PAD + TOP_BAND + LETTER_BAND;
  const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor((target - ox - PAD) / n)));
  const valueSize = round(Math.max(12, Math.min(15, cell * 0.36)));
  const gridWidth = columns.length * cell;
  const gridHeight = rows.length * cell;
  const columnAxis = payload?.columnAxis ? axisText(payload.columnAxis) : "";
  const rowAxis = payload?.rowAxis ? axisText(payload.rowAxis) : "";
  // The side name is written up the side, centred on the grid: a short grid makes room for it.
  const sideHalf = headWidth(rowAxis) / 2;
  const natural = Math.ceil(
    Math.max(ox + gridWidth + PAD, ox + gridWidth / 2 + headWidth(columnAxis) / 2 + PAD),
  );
  const height = Math.ceil(Math.max(oy + gridHeight + PAD, oy + gridHeight / 2 + sideHalf + PAD));
  const drawingWidth = Math.max(natural, target);
  return {
    kind: "grid",
    minX: round(-(drawingWidth - natural) / 2),
    minY: 0,
    width: drawingWidth,
    height,
    cell,
    valueSize,
    ox,
    oy,
    gridWidth,
    gridHeight,
    // How far an arrow stops short of a cell's centre, so it clears the cell's number (two
    // digits), even on the diagonal.
    gap: round(Math.max(cell * 0.3, valueSize * 0.88)),
    columns: columns.map((column, j) => ({
      id: column.id,
      label: typeof column.label === "string" ? column.label : column.id,
      x: ox + j * cell,
      cx: round(ox + j * cell + cell / 2),
    })),
    rows: rows.map((row, i) => ({
      id: row.id,
      label: typeof row.label === "string" ? row.label : row.id,
      y: oy + i * cell,
      cy: round(oy + i * cell + cell / 2),
    })),
    letterX: round(ox - LETTER_BAND / 2),
    letterY: round(oy - LETTER_BAND / 2),
    columnAxis: columnAxis
      ? { text: columnAxis, x: round(ox + gridWidth / 2), y: round(PAD + TOP_BAND / 2) }
      : null,
    rowAxis: rowAxis
      ? { text: rowAxis, x: round(PAD + SIDE_BAND / 2), y: round(oy + gridHeight / 2) }
      : null,
  };
}

// ---- Trace and matrix tables ---------------------------------------------------------------

/**
 * @returns {{kind: "table", minX: number, minY: number, width: number, height: number,
 *   font: number, pillPad: number, left: number, right: number, top: number, bodyTop: number,
 *   bottom: number, label: {x: number, width: number, head: string}|null,
 *   columns: Array<{id: string, index: number, label: string, key: string, x: number,
 *     width: number, align: "start"|"middle"|"end", textX: number, pill: boolean}>,
 *   rows: Array<{id: string, index: number, label: string|null, y: number, cy: number}>}}
 */
function layoutRows(payload, width, frames, shownRows, widestIn) {
  const columns = Array.isArray(payload?.columns) ? payload.columns : [];
  const payloadRows = Array.isArray(payload?.rows) ? payload.rows : [];
  const matrix = payload?.shape === "matrix";
  const sets = valueSets(payload, frames);
  const widest = widestTexts(payload, frames);
  if (Array.isArray(widestIn)) {
    widestIn.forEach((text, c) => {
      if (c < widest.length && [...String(text ?? "")].length > [...widest[c]].length) {
        widest[c] = String(text);
      }
    });
  }
  // A column of numbers (and blanks) is right-aligned; a matrix's are centred under its chips.
  const allNumeric = columns.map((_, c) =>
    sets.every((values) =>
      values.every((row) => !Array.isArray(row) || row[c] == null || numeric(row[c])),
    ),
  );
  // In a matrix, the first row (x =) is chips in the variable columns (the ones before Total).
  const chipColumns = new Set();
  if (matrix) {
    columns.forEach((column, c) => {
      if (!["total", "bound", "holds"].includes(column.key)) chipColumns.add(c);
    });
  }
  const labelled = payloadRows.some((row) => typeof row.label === "string");
  const labelHead = typeof payload?.rowAxis === "string" ? payload.rowAxis : "";
  const target = targetWidth(width);

  const measure = (tier) => {
    const valueW = (c, text) => {
      const pill = PILL_KEYS.has(columns[c]?.key);
      if (pill) return textWidth(text, pillSize(tier.font)) + 2 * tier.pill + 2;
      if (chipColumns.has(c)) return Math.max(CHIP_MIN, textWidth(text, tier.font) + 12);
      return textWidth(text, tier.font);
    };
    const columnW = columns.map((column, c) =>
      Math.ceil(
        Math.max(
          headWidth(column.label ?? column.id),
          valueW(c, widest[c]),
          chipColumns.has(c) ? CHIP_MIN : 0,
        ) +
          2 * tier.pad,
      ),
    );
    const labelW = labelled
      ? Math.ceil(
          Math.max(
            headWidth(labelHead),
            ...payloadRows.map((row) => textWidth(row.label ?? "", tier.font)),
          ) +
            2 * tier.pad,
        )
      : 0;
    return { columnW, labelW, total: labelW + columnW.reduce((sum, w) => sum + w, 0) + 4 };
  };
  let tier = TIERS.at(-1);
  let sizes = measure(tier);
  for (const candidate of TIERS) {
    const measured = measure(candidate);
    if (measured.total <= target) {
      tier = candidate;
      sizes = measured;
      break;
    }
  }

  const left = 2;
  let x = left;
  const label = labelled ? { x, width: sizes.labelW, head: labelHead } : null;
  x += sizes.labelW;
  const placed = columns.map((column, c) => {
    const w = sizes.columnW[c];
    const align = matrix ? "middle" : allNumeric[c] ? "end" : "start";
    const textX =
      align === "middle" ? x + w / 2 : align === "end" ? x + w - tier.pad : x + tier.pad;
    const out = {
      id: column.id,
      index: c,
      label: typeof column.label === "string" ? column.label : column.id,
      key: typeof column.key === "string" ? column.key : "",
      x,
      width: w,
      align,
      textX: round(textX),
      pill: PILL_KEYS.has(column.key),
      chip: chipColumns.has(c),
    };
    x += w;
    return out;
  });
  const right = x;
  const top = 2;
  const bodyTop = top + HEAD_ROW;
  const count =
    shownRows === null || shownRows === undefined
      ? payloadRows.length
      : Math.min(payloadRows.length, shownRows);
  const rows = payloadRows.slice(0, count).map((row, k) => ({
    id: row.id,
    index: k,
    label: typeof row.label === "string" ? row.label : null,
    y: bodyTop + k * ROW,
    cy: bodyTop + k * ROW + ROW / 2,
  }));
  const bottom = bodyTop + rows.length * ROW;
  const natural = right + 2;
  const drawingWidth = Math.max(natural, target);
  return {
    kind: "table",
    minX: round(-(drawingWidth - natural) / 2),
    minY: 0,
    width: drawingWidth,
    height: bottom + 2,
    font: tier.font,
    pillPad: tier.pill,
    left,
    right,
    top,
    bodyTop,
    bottom,
    label,
    columns: placed,
    rows,
  };
}
