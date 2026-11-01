// components/pictures/boardLayout.js
//
// #208: where the Board picture puts its squares. A pure function of the payload (and the width
// of the box it is drawn in): no randomness, no DOM, no React, so the same board always lands in
// the same place, before Run and at every step. Ported from Redux's design mockup
// (Documentation/Visualizations/mockups/board.js, `geometry()` and `draw()`), not from its
// parser or solvers.
//
// The board is a grid of `size` by `size` squares, with the row numbers down its left and the
// column numbers along its top, counted from `labelsFrom` (Sudoku's R1C1 from 1, N-Queens' from 0
// as its certificate counts). Square (r, c) is `r{r}c{c}`, as Redux names it.
//
// A square is drawn at the mockup's size (Sudoku 84, 54 or 36 by the grid's size; a chessboard
// up to 76, smaller as it grows) unless the box is narrower: then the squares shrink to fit its
// width, down to MIN_CELL, so on a phone the board is drawn at its own size and its labels at
// their full 11.5 px rather than shrunk to fit. Only a board too big for that (a 30-queen board
// on a phone) is drawn wider than its box and fitted by the zoom, as every picture is.

/** The row labels' column and the column labels' row, and the margins right and below. */
const LEFT = 34;
const TOP = 30;
const RIGHT = 16;
const BOTTOM = 16;

/** The smallest a square gets to fit a narrow box. */
export const MIN_CELL = 24;

/** The row and column labels' size, in drawing units. */
export const AXIS_SIZE = 11.5;

/** The board's side at most, in squares (a larger size is drawn as this many). */
const MAX_SIZE = 64;

/** A square's side at its design size, by the game and the board's size (the mockup's). */
function designCell(game, size) {
  if (game === "sudoku") return size <= 4 ? 84 : size <= 9 ? 54 : 36;
  return Math.max(40, Math.min(76, Math.floor(520 / size)));
}

/** A whole number from `value`, or `fallback` when it isn't one. */
function whole(value, fallback) {
  return Number.isInteger(value) ? value : fallback;
}

/**
 * The size a square's text is drawn at: half the square, smaller for a longer value (a 16 by 16
 * Sudoku's "16") so it stays inside its square.
 */
export function valueSize(cell, text) {
  const length = Math.max(1, String(text).length);
  return Math.round(Math.min(cell * 0.5, (cell - 8) / (length * 0.62)) * 10) / 10;
}

/**
 * The Board picture's layout.
 *
 * @param {Object} payload The Board payload (`game`, `size`, `box`, `labelsFrom`, `clues`).
 * @param {number|null} [width] The width of the box it is drawn in, in CSS px (none until it is
 *   measured: the board is then drawn at its design size).
 * @returns {{minX: number, minY: number, width: number, height: number, game: string,
 *   size: number, box: number|null, labelsFrom: number, cell: number, left: number, top: number,
 *   squares: Array<{id: string, r: number, c: number, x: number, y: number, dark: boolean}>,
 *   rowLabels: Array<{text: string, x: number, y: number}>,
 *   columnLabels: Array<{text: string, x: number, y: number}>,
 *   clues: Map<string, string>}}
 */
export function layoutBoard(payload, width = null) {
  const game = payload?.game === "queens" ? "queens" : "sudoku";
  const size = Math.max(0, Math.min(MAX_SIZE, whole(payload?.size, 0)));
  const box = whole(payload?.box, 0) > 0 ? payload.box : null;
  const labelsFrom = whole(payload?.labelsFrom, game === "sudoku" ? 1 : 0);
  const design = size ? designCell(game, size) : MIN_CELL;
  const room = width > 0 ? Math.floor((width - LEFT - RIGHT) / Math.max(1, size)) : design;
  const cell = Math.max(MIN_CELL, Math.min(design, room));

  const squares = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      squares.push({
        id: `r${r}c${c}`,
        r,
        c,
        x: LEFT + c * cell,
        y: TOP + r * cell,
        // A chessboard's dark squares; a Sudoku has none.
        dark: game === "queens" && (r + c) % 2 === 1,
      });
    }
  }
  const rowLabels = [];
  const columnLabels = [];
  for (let i = 0; i < size; i += 1) {
    const text = String(labelsFrom + i);
    rowLabels.push({ text, x: LEFT - 14, y: TOP + i * cell + cell / 2 });
    columnLabels.push({ text, x: LEFT + i * cell + cell / 2, y: TOP - 13 });
  }
  const clues = new Map();
  for (const clue of Array.isArray(payload?.clues) ? payload.clues : []) {
    if (
      typeof clue?.id === "string" &&
      whole(clue.r, -1) >= 0 &&
      clue.r < size &&
      whole(clue.c, -1) >= 0 &&
      clue.c < size
    ) {
      clues.set(clue.id, String(clue.value ?? ""));
    }
  }

  return {
    minX: 0,
    minY: 0,
    width: LEFT + size * cell + RIGHT,
    height: TOP + size * cell + BOTTOM,
    game,
    size,
    box,
    labelsFrom,
    cell,
    left: LEFT,
    top: TOP,
    squares,
    rowLabels,
    columnLabels,
    clues,
  };
}

/** The (row, column) of a square id `r{r}c{c}`, or null for anything else. */
export function parseSquareId(id) {
  const match = /^r(\d+)c(\d+)$/.exec(String(id));
  return match ? { r: Number(match[1]), c: Number(match[2]) } : null;
}

/** A square's centre. */
export function squareCentre(layout, r, c) {
  return {
    x: layout.left + c * layout.cell + layout.cell / 2,
    y: layout.top + r * layout.cell + layout.cell / 2,
  };
}

/**
 * The squares a square shares a unit with: a Sudoku square's row, column and box; a chessboard
 * square's row, column and both diagonals (where a queen on it attacks). The square itself is in.
 * @returns {Set<string>}
 */
export function squaresSeenFrom(layout, r, c) {
  const seen = new Set();
  const { size, game, box } = layout;
  for (let i = 0; i < size; i += 1) {
    seen.add(`r${r}c${i}`);
    seen.add(`r${i}c${c}`);
  }
  if (game === "sudoku" && box) {
    const top = Math.floor(r / box) * box;
    const left = Math.floor(c / box) * box;
    for (let i = top; i < Math.min(size, top + box); i += 1) {
      for (let j = left; j < Math.min(size, left + box); j += 1) seen.add(`r${i}c${j}`);
    }
  }
  if (game === "queens") {
    for (let k = -size; k <= size; k += 1) {
      if (r + k >= 0 && r + k < size && c + k >= 0 && c + k < size) seen.add(`r${r + k}c${c + k}`);
      if (r + k >= 0 && r + k < size && c - k >= 0 && c - k < size) seen.add(`r${r + k}c${c - k}`);
    }
  }
  return seen;
}

/**
 * The ends of a queen's eight lines of attack from square (r, c), each the last square on the
 * board in its direction (none for a direction with no square).
 * @returns {Array<{r: number, c: number}>}
 */
export function attackEnds(size, r, c) {
  const ends = [];
  for (const [dr, dc] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    let k = 0;
    while (
      r + dr * (k + 1) >= 0 &&
      r + dr * (k + 1) < size &&
      c + dc * (k + 1) >= 0 &&
      c + dc * (k + 1) < size
    ) {
      k += 1;
    }
    if (k > 0) ends.push({ r: r + dr * k, c: c + dc * k });
  }
  return ends;
}
