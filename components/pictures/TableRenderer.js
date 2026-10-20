// components/pictures/TableRenderer.js
//
// #209: the Table picture type (ReduxISU/Redux#671), Redux's PICTURE-TYPES.md "Table and Trace
// Table". One renderer draws the three shapes Redux sends:
//   - grid (Edit Distance): the dynamic-programming grid, x's letters down the side and y's across
//     the top. The cell being worked out is ElementHighlight, with arrows from the three cells it
//     read (solid from the one whose value it took, dashed from the others); the trace back keeps
//     the cheapest path (Committed, then green on the answer), joined by arrows in the order the
//     grid was filled. Once the path is the answer, the edits it spells out are written under the
//     picture, letter by letter.
//   - matrix (0-1 ILP): the assignment x on top as chips (? not tried, 0, 1), one row per
//     constraint with its coefficients, its total, its bound and whether it holds. A coefficient
//     whose variable is 1 is shaded: it is what the row adds up.
//   - trace (DFA, NFA, SSSP, SPSP, the "step table" next to the problem's own picture): one row
//     per step (or per node), each in its own slot, appearing as the run reaches it. A verdict
//     column (Accepting?, Settled) is drawn as pills, and a cost not settled yet is in italics.
//
// The payload holds what never changes (columns, rows, the title, the grid's axis names, and
// `blank`: the instance with nothing worked out, drawn before Run); each frame holds the cell text
// (`values[i][j]`, null for an empty cell), the states of whole rows and single cells (a cell's
// own state shows over its row's), the cells changed this step (underlined: an annotation, not a
// state) and, for a grid, the arrows.
//
// Layout is tableLayout.js's pure function of the payload, the box's width and the run's frames,
// so no row or column moves while the steps walk. Hovering, focusing or tapping a cell (grid) or
// a row traces it back to what it came from: the cells an Edit Distance cell was worked out from;
// the row an automaton step continues; the rows along a node's shortest path; the x's and
// coefficients a constraint's total adds up. It is outlined in the trace color and read out above
// the picture, and the rest fades by color. The picture opens at Fit and zooms with DiagramZoom.js;
// on a phone the table tightens to its box first, so its text keeps its size, and a table too wide
// for that zooms in to readable text.
//
// #250: nothing here can be dragged. A row's place is its step (or the instance's order), and a
// column's is the payload's; a cell of the grid is a pair of prefixes. Moving any of them would
// only misstate the table.
//
// #239: a gadget's pieces (`highlightIds`, `gadgetColors`; gadgetRings.js) are ringed just inside
// their own box, so the ring covers no neighbour and no text: a cell (`data-cell-id`) inside the
// cell, a row (`data-row-id`) inside its whole band, and a column (`data-column-id`) inside its
// header cell.

import Box from "@mui/material/Box";
import { useMemo, useRef, useState } from "react";
import { paletteVars } from "../theme";
import DiagramZoom from "./DiagramZoom";
import { GadgetRect, useGadgetMarks } from "./gadgetRings";
import { FAINT_FILTER, MONO, TRACE_COLOR } from "./graphPieces";
import { pictureStateStyle, stateOf } from "./pictureStates";
import {
  CHIP_HEIGHT,
  cellAt,
  HEAD_ROW,
  HEAD_SIZE,
  HEAD_SPACING,
  layoutTable,
  PILL_HEIGHT,
  pillSize,
  ROW,
  textWidth,
  widestTexts,
} from "./tableLayout";
import { useBoxWidth } from "./useBoxWidth";

/** The scale (CSS px per drawing unit) the table's text reads at: its design size. */
const READABLE_SCALE = 1;

/** The margin around the row or cell a zoomed-in view keeps in sight, in drawing units. */
const FRAME_MARGIN = 10;

/** The dash of a step's dashed arrows and of a source cell read but not taken. */
const READ_DASH = "4 3";

/** `color` mixed into `base`, `percent` of it: a tint, never a see-through color. */
function tint(color, percent, base = paletteVars.surface.input) {
  return `color-mix(in srgb, ${color} ${percent}%, ${base})`;
}

/** A heading as the table writes it: capitals, except a variable's name (x1). */
function headText(label) {
  return /^[a-z]\d*$/i.test(label) ? label : label.toUpperCase();
}

/** The trace props for a focusable piece that traces `id`. */
function useTrace() {
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  const toggle = (id) => setPinned((current) => (current === id ? null : id));
  const traceProps = (id) => ({
    "data-focusable": "",
    tabIndex: 0,
    role: "button",
    "aria-pressed": pinned === id,
    onPointerEnter: (event) => {
      if (event.pointerType === "mouse") setHover(id);
    },
    onPointerLeave: (event) => {
      if (event.pointerType === "mouse") setHover(null);
    },
    onFocus: () => setHover(id),
    onBlur: () => setHover(null),
    onClick: () => toggle(id),
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle(id);
      }
    },
  });
  return { traced: hover ?? pinned, traceProps };
}

/** A heading in the picture, spaced out in small capitals. */
function Head({ x, y, text, anchor, ...rest }) {
  return (
    <text
      x={x}
      y={y}
      data-head=""
      textAnchor={anchor}
      dominantBaseline="central"
      fill={paletteVars.text.secondary}
      fontFamily={MONO}
      fontSize={HEAD_SIZE}
      fontWeight={600}
      letterSpacing={`${HEAD_SPACING}em`}
      pointerEvents="none"
      {...rest}
    >
      {text}
    </text>
  );
}

/** An arrow from (x1, y1) to (x2, y2) with a filled head at the end. */
function Arrow({ x1, y1, x2, y2, color, width, dash, ...rest }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  // A short arrow gets a smaller head, so the head never reaches back past the arrow's start.
  const head = Math.min(7, length * 0.6);
  const baseX = x2 - ux * head;
  const baseY = y2 - uy * head;
  const r = (value) => Math.round(value * 100) / 100;
  return (
    <g pointerEvents="none" {...rest}>
      <line
        x1={r(x1)}
        y1={r(y1)}
        x2={r(baseX)}
        y2={r(baseY)}
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dash}
      />
      <path
        d={`M${r(x2)} ${r(y2)} L${r(baseX - uy * 4)} ${r(baseY + ux * 4)} L${r(baseX + uy * 4)} ${r(baseY - ux * 4)} Z`}
        fill={color}
      />
    </g>
  );
}

/**
 * The Table's plain frame, for its default picture before Run (registry.js plainFrame()). Unlike
 * the graphs, a table keeps its cell text in the frames, so an empty frame would draw no rows at
 * all. The backend sends the instance's base picture as `payload.blank` (its cells with nothing
 * worked out, `values[i][j]` as in a frame, no states): that is drawn when present, so no
 * solver's work shows before Run (an ILP's first try and its totals, say). A backend older than
 * `blank` gets the first step's cell text instead, without its row and cell states, underlines
 * or arrows. `widest` keeps the longest text each column holds over the default run, so the table
 * is laid out before Run at the widths its run will need, and does not move when Run starts.
 * @returns {{values: Array<Array<string|null>>, widest: string[]}}
 */
export function tablePlainFrame(payload, frames) {
  const blank = payload?.blank?.values;
  const first = frames?.[0]?.values;
  const values = Array.isArray(blank) ? blank : Array.isArray(first) ? first : [];
  return { values, widest: widestTexts(payload, frames) };
}

/** The ids a frame focuses on: rows ("r2") and cells ("r2c3"). */
function focusIds(frame) {
  return Array.isArray(frame?.focus) ? frame.focus.filter((id) => typeof id === "string") : [];
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the caption.
 * @param {number|null} [props.frameIndex] The frame shown, or null for the plain frame before Run.
 * @param {{shape?: string, columns: Array<{id: string, label: string, key?: string}>,
 *   rows: Array<{id: string, label?: string}>, title?: string, rowAxis?: string,
 *   columnAxis?: string, blank?: {values: Array<Array<string|null>>}}} props.payload
 * @param {{values?: Array<Array<string|null>>, rows?: Object, cells?: Object,
 *   changed?: string[], arrows?: Array<{from: string, to: string, best: boolean}>,
 *   focus?: string[], widest?: string[]}} props.frame
 * @param {Object[]} [props.frames] Every frame of the run (one layout for all of them).
 * @param {string[]} [props.highlightIds] Gadget piece ids to mark (#239).
 * @param {Object<string, string>} [props.gadgetColors] Color mode's marks, by piece id (#239).
 */
export default function TableRenderer({
  idPrefix,
  name,
  payload,
  frame,
  frameIndex,
  frames = [],
  highlightIds,
  gadgetColors,
}) {
  const gadgetOf = useGadgetMarks(highlightIds, gadgetColors);
  const boxRef = useRef(null);
  const boxWidth = useBoxWidth(boxRef);
  const plain = frameIndex === null || frameIndex === undefined;
  const values = Array.isArray(frame?.values) ? frame.values : [];
  const alone = plain || frames.length ? null : frame;
  const layout = useMemo(
    () =>
      layoutTable(payload, {
        width: boxWidth ?? undefined,
        frames: plain ? [] : alone ? [alone] : frames,
        shownRows: plain ? values.length : null,
        widest: plain ? (frame?.widest ?? null) : null,
      }),
    [payload, boxWidth, plain, alone, frames, values.length, frame?.widest],
  );
  const { traced, traceProps } = useTrace();
  const step = plain ? { values } : (frame ?? {});
  const drawing =
    layout.kind === "grid"
      ? gridDrawing({ layout, step, traced, traceProps, idPrefix, name, gadgetOf })
      : rowsDrawing({
          layout,
          payload,
          step,
          traced,
          traceProps,
          idPrefix,
          name,
          plain,
          gadgetOf,
        });

  // Zoomed in, a step keeps the row or cell it is about in view.
  const focusBoxes = focusIds(step)
    .map((id) => drawing.boxOf(id))
    .filter(Boolean);
  let follow = null;
  if (focusBoxes.length) {
    const x0 = Math.min(...focusBoxes.map((b) => b.x)) - FRAME_MARGIN;
    const y0 = Math.min(...focusBoxes.map((b) => b.y)) - FRAME_MARGIN;
    const x1 = Math.max(...focusBoxes.map((b) => b.x + b.width)) + FRAME_MARGIN;
    const y1 = Math.max(...focusBoxes.map((b) => b.y + b.height)) + FRAME_MARGIN;
    const box = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    follow = { key: `${frameIndex}:${focusIds(step).join(",")}`, ...box, path: box };
  }

  // The caption: the payload's title, or how many rows are drawn. Before Run only the rows drawn
  // are counted: "1 of 2 rows" would give away how long the run's trace is. A matrix's first row
  // is its x, not a constraint, so it isn't counted.
  const skipped = payload?.shape === "matrix" ? 1 : 0;
  const rowCount = Math.max(0, (Array.isArray(payload?.rows) ? payload.rows.length : 0) - skipped);
  const shownCount = Math.max(0, Math.min(values.length - skipped, rowCount));
  const grid = payload?.shape === "grid";
  const word = (list) =>
    (Array.isArray(list) ? list.slice(1) : []).map((p) => p.label ?? "").join("");
  const caption =
    payload?.title ||
    (grid
      ? `${name}: "${word(payload.rows)}" to "${word(payload.columns)}"`
      : plain
        ? `${name}: ${shownCount} row${shownCount === 1 ? "" : "s"}`
        : `${name}: ${shownCount < rowCount ? `${shownCount} of ${rowCount}` : rowCount} row${
            rowCount === 1 ? "" : "s"
          }`);

  return (
    <Box
      ref={boxRef}
      id={`${idPrefix}-table`}
      data-table-shape={payload?.shape ?? ""}
      data-drawing-width={layout.width}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <Box
        id={`${idPrefix}-readout`}
        aria-live="polite"
        data-traced={drawing.readout.traced ? "true" : undefined}
        sx={{
          fontFamily: MONO,
          fontSize: "0.8125rem",
          lineHeight: 1.45,
          minHeight: "2.9em",
          color: drawing.readout.traced ? "text.primary" : "text.secondary",
        }}
      >
        {drawing.readout.text}
      </Box>
      <DiagramZoom
        idPrefix={idPrefix}
        label={`${caption}. ${drawing.label}`}
        drawing={layout}
        resetOn={[payload, layout.width, layout.height]}
        follow={follow}
        readableScale={READABLE_SCALE}
        toolbar={
          <Box
            id={`${idPrefix}-table-caption`}
            sx={{ fontSize: "0.8125rem", fontWeight: 700, color: "text.primary" }}
          >
            {caption}
          </Box>
        }
      >
        {drawing.content}
      </DiagramZoom>
      {drawing.after}
    </Box>
  );
}

// ---- Grid (Edit Distance) ------------------------------------------------------------------

/** The edit a step of the cheapest path makes, from cell `a` to the next cell `b`. */
function editOf(a, b, rowLetter, columnLetter) {
  const down = b.row - a.row;
  const across = b.column - a.column;
  if (down === 1 && across === 1) {
    const x = rowLetter(b.row);
    const y = columnLetter(b.column);
    return { op: x === y ? "keep" : "sub", x, y };
  }
  if (down === 1 && across === 0) return { op: "del", x: rowLetter(b.row), y: null };
  if (down === 0 && across === 1) return { op: "ins", x: null, y: columnLetter(b.column) };
  return null;
}

/** "a", "a and b", "a, b and c". */
function andList(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function gridDrawing({ layout, step, traced, traceProps, idPrefix, name, gadgetOf }) {
  const { rows, columns, cell } = layout;
  const values = Array.isArray(step.values) ? step.values : [];
  const valueAt = (i, j) => {
    const value = values[i]?.[j];
    return value === null || value === undefined ? null : String(value);
  };
  const rowLetter = (i) => rows[i]?.label ?? "";
  const columnLetter = (j) => columns[j]?.label ?? "";
  const highlight = pictureStateStyle("ElementHighlight");
  const changed = new Set(Array.isArray(step.changed) ? step.changed : []);
  const cellState = (i, j) => stateOf(step.cells, `r${i}c${j}`);

  // The step's arrows: the cells it read, and the one whose value it took.
  const arrows = (Array.isArray(step.arrows) ? step.arrows : [])
    .map((arrow) => ({ from: cellAt(arrow?.from), to: cellAt(arrow?.to), best: !!arrow?.best }))
    .filter((arrow) => arrow.from && arrow.to);
  const read = new Map();
  for (const arrow of arrows) {
    const id = `r${arrow.from.row}c${arrow.from.column}`;
    if (arrow.best || !read.has(id)) read.set(id, arrow.best ? "best" : "read");
  }

  // The trace back's path: the kept and confirmed cells, plus the cell it is at, in the order the
  // grid was filled. Only cells next to each other are joined.
  const pathCells = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = 0; j < columns.length; j += 1) {
      const state = cellState(i, j);
      if (state === "Committed" || state === "Solution")
        pathCells.push({ row: i, column: j, state });
    }
  }
  if (pathCells.length) {
    for (const id of focusIds(step)) {
      const at = cellAt(id);
      if (at && cellState(at.row, at.column) === "ElementHighlight") {
        pathCells.push({ ...at, state: "ElementHighlight" });
      }
    }
    pathCells.sort((a, b) => a.row - b.row || a.column - b.column);
  }
  const pathLinks = [];
  for (let k = 1; k < pathCells.length; k += 1) {
    const a = pathCells[k - 1];
    const b = pathCells[k];
    const down = b.row - a.row;
    const across = b.column - a.column;
    if (down >= 0 && down <= 1 && across >= 0 && across <= 1 && down + across > 0) {
      pathLinks.push({ a, b });
    }
  }
  // The answer's edits, once the confirmed path runs from (0, 0) to the far corner.
  const confirmed = pathCells.filter((c) => c.state === "Solution");
  const complete =
    confirmed.length === pathCells.length &&
    confirmed.length > 0 &&
    confirmed[0].row === 0 &&
    confirmed[0].column === 0 &&
    confirmed.at(-1).row === rows.length - 1 &&
    confirmed.at(-1).column === columns.length - 1 &&
    pathLinks.length === confirmed.length - 1;
  const edits = complete
    ? pathLinks.map(({ a, b }) => editOf(a, b, rowLetter, columnLetter)).filter(Boolean)
    : null;

  // The cell the step is about: its row and column letters are highlighted.
  const current = focusIds(step)
    .map(cellAt)
    .find((at) => at && cellState(at.row, at.column) === "ElementHighlight");

  // What the traced cell was worked out from.
  const tracedAt = cellAt(traced);
  let sources = null;
  let readout;
  if (tracedAt && tracedAt.row < rows.length && tracedAt.column < columns.length) {
    const { row: i, column: j } = tracedAt;
    const v = valueAt(i, j);
    const here = `Cell (${i},${j})${v !== null ? ` = ${v}` : ""}`;
    const at = (r, c) => `(${r},${c})`;
    const num = (r, c) => {
      const text = valueAt(r, c);
      return text !== null && Number.isFinite(Number(text)) ? Number(text) : null;
    };
    sources = new Map();
    let text;
    if (i === 0 && j === 0) {
      text = `${here}: the empty string is already the empty string.`;
    } else if (i === 0) {
      sources.set(`r0c${j - 1}`, "best");
      text = `${here}: insert '${columnLetter(j)}' after ${at(0, j - 1)}, one more insertion.`;
    } else if (j === 0) {
      sources.set(`r${i - 1}c0`, "best");
      text = `${here}: delete '${rowLetter(i)}' after ${at(i - 1, 0)}, one more deletion.`;
    } else {
      const x = rowLetter(i);
      const y = columnLetter(j);
      const diag = num(i - 1, j - 1);
      const up = num(i - 1, j);
      const left = num(i, j - 1);
      const value = num(i, j);
      if (x === y) {
        sources.set(`r${i - 1}c${j - 1}`, "best");
        text = `${here}: '${x}' = '${y}', so it copies ${at(i - 1, j - 1)}${diag !== null ? ` (${diag})` : ""}.`;
      } else {
        const options = [
          {
            id: `r${i - 1}c${j - 1}`,
            word: `replace '${x}' with '${y}'`,
            from: diag,
            cell: at(i - 1, j - 1),
          },
          { id: `r${i - 1}c${j}`, word: `delete '${x}'`, from: up, cell: at(i - 1, j) },
          { id: `r${i}c${j - 1}`, word: `insert '${y}'`, from: left, cell: at(i, j - 1) },
        ];
        const taken =
          value !== null ? options.find((o) => o.from !== null && o.from + 1 === value) : null;
        for (const option of options) sources.set(option.id, option === taken ? "best" : "read");
        const costs = options
          .map((o) => `${o.word} ${o.from !== null ? `1 + ${o.from}` : "?"}`)
          .join(", ");
        text =
          value === null
            ? `${here}: not worked out yet. It will take the cheapest of ${costs}.`
            : `${here}: '${x}' ≠ '${y}', so the cheapest of ${costs}${taken ? `: ${taken.word.split(" ")[0]}, from ${taken.cell}` : ""}.`;
      }
    }
    readout = { traced: true, text };
  } else if (edits) {
    const count = (op) => edits.filter((e) => e.op === op).length;
    const parts = [
      [count("sub"), "replacement"],
      [count("del"), "deletion"],
      [count("ins"), "insertion"],
    ]
      .filter(([c]) => c)
      .map(([c, w]) => `${c} ${w}${c === 1 ? "" : "s"}`);
    readout = {
      traced: false,
      text: `The green path is one cheapest way: ${parts.length ? andList(parts) : "no edits at all"}. Hover or tap a cell to see what it was worked out from.`,
    };
  } else {
    readout = {
      traced: false,
      text: "Each cell is the cost of turning a prefix of x into a prefix of y. Hover or tap a cell to see what it was worked out from.",
    };
  }
  const near = sources ? new Set([traced, ...sources.keys()]) : null;

  const boxOf = (id) => {
    const at = cellAt(id);
    if (!at || at.row >= rows.length || at.column >= columns.length) return null;
    return { x: columns[at.column].x, y: rows[at.row].y, width: cell, height: cell };
  };
  const centre = ({ row, column }) => ({ x: columns[column].cx, y: rows[row].cy });
  const shortened = (a, b) => {
    const p = centre(a);
    const q = centre(b);
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const length = Math.hypot(dx, dy) || 1;
    return {
      x1: p.x + (dx / length) * layout.gap,
      y1: p.y + (dy / length) * layout.gap,
      x2: q.x - (dx / length) * (layout.gap + 2),
      y2: q.y - (dy / length) * (layout.gap + 2),
    };
  };

  const content = (
    <>
      <g data-layer="axes" pointerEvents="none">
        {layout.columnAxis && (
          <Head
            x={layout.columnAxis.x}
            y={layout.columnAxis.y}
            text={layout.columnAxis.text}
            anchor="middle"
            data-axis="column"
          />
        )}
        {layout.rowAxis && (
          <Head
            x={layout.rowAxis.x}
            y={layout.rowAxis.y}
            text={layout.rowAxis.text}
            anchor="middle"
            data-axis="row"
            transform={`rotate(-90 ${layout.rowAxis.x} ${layout.rowAxis.y})`}
          />
        )}
        {columns.map((column, j) => {
          const empty = j === 0 && column.label === "ε";
          const now = current?.column === j;
          return (
            <text
              key={column.id}
              x={column.cx}
              y={layout.letterY}
              data-letter={`column-${j}`}
              data-current={now ? "true" : undefined}
              textAnchor="middle"
              dominantBaseline="central"
              fill={
                now ? highlight.text : empty ? paletteVars.text.secondary : paletteVars.text.primary
              }
              fontFamily={MONO}
              fontSize={layout.valueSize}
              fontWeight={empty ? 400 : 600}
            >
              {column.label}
            </text>
          );
        })}
        {rows.map((row, i) => {
          const empty = i === 0 && row.label === "ε";
          const now = current?.row === i;
          return (
            <text
              key={row.id}
              x={layout.letterX}
              y={row.cy}
              data-letter={`row-${i}`}
              data-current={now ? "true" : undefined}
              textAnchor="middle"
              dominantBaseline="central"
              fill={
                now ? highlight.text : empty ? paletteVars.text.secondary : paletteVars.text.primary
              }
              fontFamily={MONO}
              fontSize={layout.valueSize}
              fontWeight={empty ? 400 : 600}
            >
              {row.label}
            </text>
          );
        })}
      </g>
      <g data-layer="cells">
        {rows.map((row, i) =>
          columns.map((column, j) => {
            const id = `r${i}c${j}`;
            const state = cellState(i, j);
            const style = pictureStateStyle(state);
            const base = i === 0 || j === 0;
            const value = valueAt(i, j);
            const source = read.get(id);
            const isTraced = traced === id;
            const faint = near !== null && !near.has(id);
            let fill = base ? paletteVars.surface.main : paletteVars.surface.input;
            let line = paletteVars.viz.dim;
            let width = 1;
            let dash;
            let ink = base ? paletteVars.text.secondary : paletteVars.text.primary;
            if (state !== "Background") {
              fill = style.fill;
              line = style.line;
              ink = style.ink;
              width = state === "ElementHighlight" ? 2.6 : 2.2;
              dash = style.dash;
            } else if (source) {
              line = highlight.line;
              width = source === "best" ? 2.6 : 1.6;
              dash = source === "best" ? undefined : READ_DASH;
            }
            const parts = [`Cell (${i},${j})`, `${rowLetter(i)} by ${columnLetter(j)}`];
            parts.push(value !== null ? `value ${value}` : "not worked out yet");
            if (state !== "Background") parts.push(style.legend);
            if (source)
              parts.push(source === "best" ? "the value this step took" : "read this step");
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={id}
                id={`${idPrefix}-${id}`}
                data-cell-id={id}
                data-state={state}
                data-changed={changed.has(id) ? "true" : undefined}
                data-arrow={source}
                data-traced={near ? (faint ? "faint" : "trace") : undefined}
                aria-label={parts.join(", ")}
                style={faint ? { filter: FAINT_FILTER } : undefined}
                {...traceProps(id)}
              >
                <rect
                  x={column.x + 1}
                  y={row.y + 1}
                  width={cell - 2}
                  height={cell - 2}
                  rx={5}
                  data-body=""
                  fill={isTraced ? tint(TRACE_COLOR, 14, fill) : fill}
                  stroke={line}
                  strokeWidth={width}
                  strokeDasharray={dash}
                />
                <GadgetRect
                  id={id}
                  color={gadgetOf(id)}
                  x={column.x + 1}
                  y={row.y + 1}
                  width={cell - 2}
                  height={cell - 2}
                  rx={5}
                  gap={-3}
                />
                {changed.has(id) && state === "Background" && (
                  <rect
                    x={column.x + cell * 0.25}
                    y={row.y + cell - 6}
                    width={cell * 0.5}
                    height={2.5}
                    data-underline=""
                    fill={highlight.line}
                  />
                )}
                {value !== null && (
                  <text
                    x={column.cx}
                    y={row.cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={ink}
                    fontFamily={MONO}
                    fontSize={layout.valueSize}
                    fontWeight={state !== "Background" || changed.has(id) ? 700 : 400}
                    pointerEvents="none"
                  >
                    {value}
                  </text>
                )}
              </g>
            );
          }),
        )}
      </g>
      <g data-layer="arrows" pointerEvents="none">
        {arrows.map((arrow) => {
          const ends = shortened(arrow.from, arrow.to);
          const fromId = `r${arrow.from.row}c${arrow.from.column}`;
          return (
            <Arrow
              key={`${fromId}-${arrow.to.row}-${arrow.to.column}`}
              {...ends}
              data-step-arrow={fromId}
              data-best={arrow.best ? "true" : "false"}
              color={highlight.line}
              width={2.2}
              dash={arrow.best ? undefined : READ_DASH}
              style={near ? { filter: FAINT_FILTER } : undefined}
            />
          );
        })}
        {pathLinks.map(({ a, b }) => {
          const now = a.state === "ElementHighlight" || b.state === "ElementHighlight";
          const done = a.state === "Solution" && b.state === "Solution";
          const style = pictureStateStyle(
            now ? "ElementHighlight" : done ? "Solution" : "Committed",
          );
          return (
            <Arrow
              key={`p${a.row}-${a.column}`}
              {...shortened(a, b)}
              data-path-arrow={`r${a.row}c${a.column}`}
              // On the answer's filled cells the arrow is in the cells' own ink, so it shows.
              color={done && !now ? style.ink : style.line}
              width={2.6}
              dash={done || now ? undefined : style.dash}
              style={near ? { filter: FAINT_FILTER } : undefined}
            />
          );
        })}
      </g>
      {sources && (
        <g data-layer="trace" pointerEvents="none">
          {[...sources].map(([id, kind]) => {
            const box = boxOf(id);
            return box ? (
              <rect
                key={id}
                data-trace-source={id}
                data-kind={kind}
                x={box.x + 3}
                y={box.y + 3}
                width={box.width - 6}
                height={box.height - 6}
                rx={4}
                fill="none"
                stroke={TRACE_COLOR}
                strokeWidth={kind === "best" ? 2.6 : 1.8}
                strokeDasharray={kind === "best" ? undefined : READ_DASH}
              />
            ) : null;
          })}
          {boxOf(traced) && (
            <rect
              data-trace-cell={traced}
              x={boxOf(traced).x - 1}
              y={boxOf(traced).y - 1}
              width={cell + 2}
              height={cell + 2}
              rx={6}
              fill="none"
              stroke={TRACE_COLOR}
              strokeWidth={3}
            />
          )}
        </g>
      )}
    </>
  );

  const after = <EditStrip idPrefix={idPrefix} edits={edits} />;
  const xText = rows
    .slice(1)
    .map((row) => row.label)
    .join("");
  const yText = columns
    .slice(1)
    .map((column) => column.label)
    .join("");
  const label = `${name}: a grid of ${rows.length} by ${columns.length} cells, turning "${xText}" into "${yText}".`;
  return { content, readout, label, boxOf, after };
}

/** The edits the answer's path spells out, x over the edits over y, letter by letter. */
function EditStrip({ idPrefix, edits }) {
  const replace = pictureStateStyle("ElementHighlight");
  const change = pictureStateStyle("Rejected");
  const box = (key, text, look) => (
    <Box
      component="span"
      key={key}
      sx={{
        width: "1.9em",
        height: "1.9em",
        flex: "none",
        display: "grid",
        placeItems: "center",
        borderRadius: "5px",
        ...look,
      }}
    >
      {text}
    </Box>
  );
  const looks = {
    keep: { color: "text.secondary" },
    sub: { backgroundColor: replace.fill, color: replace.ink },
    del: { backgroundColor: change.fill, color: change.ink },
    ins: { backgroundColor: change.fill, color: change.ink },
  };
  const line = (label, cells, key) => (
    <Box key={key} sx={{ display: "flex", gap: "2px", alignItems: "center" }}>
      <Box
        component="span"
        sx={{
          width: 52,
          flex: "none",
          fontSize: "0.6875rem",
          letterSpacing: "0.05em",
          color: "text.secondary",
        }}
      >
        {label}
      </Box>
      {cells}
    </Box>
  );
  return (
    <Box
      id={`${idPrefix}-edits`}
      data-edits={edits ? edits.map((e) => e.op).join(" ") : ""}
      sx={{
        fontFamily: MONO,
        fontSize: "0.9375rem",
        color: "text.primary",
        minHeight: "6.6em",
        display: "grid",
        alignContent: "start",
        gap: "3px",
        overflowX: "auto",
      }}
    >
      {edits ? (
        <>
          {line(
            "x",
            edits.map((e, k) =>
              box(`x${k}`, e.x ?? "–", e.x === null ? { color: "text.secondary" } : looks[e.op]),
            ),
            "x",
          )}
          {line(
            "EDIT",
            edits.map((e, k) =>
              box(`o${k}`, { keep: "·", sub: "R", del: "D", ins: "I" }[e.op], {
                ...looks[e.op],
                fontSize: "0.6875rem",
                fontWeight: 700,
              }),
            ),
            "op",
          )}
          {line(
            "y",
            edits.map((e, k) =>
              box(`y${k}`, e.y ?? "–", e.y === null ? { color: "text.secondary" } : looks[e.op]),
            ),
            "y",
          )}
          <Box component="span" sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.5 }}>
            R replace · D delete from x · I insert from y · a dot keeps the letter
          </Box>
        </>
      ) : (
        <Box
          component="span"
          data-edits-empty=""
          sx={{ fontSize: "0.8125rem", color: "text.secondary" }}
        >
          The edits are spelled out here once the trace back confirms the cheapest path.
        </Box>
      )}
    </Box>
  );
}

// ---- Trace and matrix tables ---------------------------------------------------------------

/** A pill's look for a verdict column's value, in a row with no state. */
function pillTone(key, text) {
  const value = String(text).trim();
  const met = pictureStateStyle("Covered");
  const failed = pictureStateStyle("Rejected");
  if (key === "settled") {
    return value.startsWith("#")
      ? { ink: met.text, line: met.line, bold: true }
      : { ink: paletteVars.text.secondary, line: paletteVars.viz.dim, dash: "3 2" };
  }
  if (value === "yes") return { ink: met.text, line: met.line, bold: true };
  if (value === "no" && key === "holds") return { ink: failed.text, line: failed.line, bold: true };
  return { ink: paletteVars.text.secondary, line: paletteVars.viz.dim };
}

function rowsDrawing({
  layout,
  payload,
  step,
  traced,
  traceProps,
  idPrefix,
  name,
  plain,
  gadgetOf,
}) {
  const { columns, rows } = layout;
  const values = Array.isArray(step.values) ? step.values : [];
  const valueAt = (r, c) => {
    const value = values[r]?.[c];
    return value === null || value === undefined ? null : String(value);
  };
  const shown = Math.min(values.length, rows.length);
  const changed = new Set(Array.isArray(step.changed) ? step.changed : []);
  const matrix = payload?.shape === "matrix";
  const keyed = (key) => columns.find((column) => column.key === key) ?? null;
  const fromCol = keyed("from");
  const toCol = keyed("to");
  const nodeCol = keyed("node");
  const viaCol = keyed("via");
  const pathCol = keyed("path");
  const costCol = keyed("cost");
  const settledCol = keyed("settled");
  const totalCol = keyed("total");
  const boundCol = keyed("bound");
  const holdsCol = keyed("holds");
  const chips = columns.filter((column) => column.chip);
  const automaton = fromCol && toCol;
  const distance = nodeCol && pathCol;
  const rowName = (r) => rows[r]?.label ?? `Row ${r}`;
  const xOn = (column) => matrix && valueAt(0, column.index) === "1";
  const tentative = (r) =>
    distance && settledCol !== null && !String(valueAt(r, settledCol.index) ?? "").startsWith("#");

  /** What row `r` reads as, for its label and the readout. */
  const describe = (r) => {
    const v = (column) => (column ? valueAt(r, column.index) : null);
    if (automaton) {
      const stepNo = v(keyed("step")) ?? String(r);
      const symbol = v(keyed("read"));
      const accept = v(keyed("accepting")) === "yes";
      if (r === 0)
        return `Step ${stepNo}: start in ${v(toCol)}${accept ? ", an accept state" : ""}`;
      return `Step ${stepNo}: read ${symbol === "ε" ? "nothing (an ε-move)" : `'${symbol}'`}, ${v(fromCol)} → ${v(toCol)}${accept ? ", an accept state" : ""}`;
    }
    if (distance) {
      const node = v(nodeCol);
      const path = v(pathCol);
      const cost = v(costCol);
      const via = v(viaCol);
      const reached = path && path !== "—";
      const parts = [`Node ${node}: cost ${cost ?? "?"}`];
      if (via && via !== "—") parts.push(`via ${via}`);
      parts.push(reached ? `path ${path}` : "no route yet");
      if (settledCol) {
        const settled = v(settledCol);
        parts.push(settled?.startsWith("#") ? `settled ${settled}` : "not settled yet");
      }
      return parts.join(", ");
    }
    if (matrix && r === 0) {
      return `x = (${chips.map((column) => valueAt(0, column.index) ?? "?").join(" ")})`;
    }
    if (matrix) {
      const bound = boundCol ? v(boundCol) : null;
      const total = totalCol ? v(totalCol) : null;
      const holds = holdsCol ? v(holdsCol) : null;
      if (
        chips.some(
          (column) => valueAt(0, column.index) === "?" || valueAt(0, column.index) === null,
        )
      ) {
        return `${rowName(r)}: bound ${bound ?? "?"}; nothing tried yet`;
      }
      const terms = chips
        .filter(xOn)
        .map((column) => `${valueAt(r, column.index)} (${column.label})`);
      const sum = terms.length
        ? `${terms.join(" + ")} = ${total ?? "?"}`
        : `no x is 1, so ${total ?? 0}`;
      return `${rowName(r)}: ${sum}, against its bound ${bound ?? "?"}${holds ? `: ${holds === "yes" ? "holds" : holds === "no" ? "over the bound" : holds}` : ""}`;
    }
    const parts = columns.map((column) => `${column.label} ${valueAt(r, column.index) ?? "—"}`);
    return `${rows[r]?.label ? `${rows[r].label}: ` : ""}${parts.join(", ")}`;
  };

  // What the traced row comes from: rows, and the cells that carry it over.
  const tracedRow = rows.findIndex((row) => row.id === traced);
  let near = null;
  const marks = new Set();
  let readout;
  if (tracedRow >= 0 && tracedRow < shown) {
    const r = tracedRow;
    near = new Set([r]);
    let from = "";
    if (automaton && r > 0) {
      near.add(r - 1);
      marks.add(`r${r - 1}c${toCol.index}`);
      marks.add(`r${r}c${fromCol.index}`);
      from = ` It continues from step ${valueAt(r - 1, keyed("step")?.index ?? -1) ?? r - 1}, which ended in ${valueAt(r - 1, toCol.index)}.`;
    } else if (distance) {
      const path = valueAt(r, pathCol.index);
      const nodes = path && path !== "—" ? path.split("→").map((s) => s.trim()) : [];
      for (let k = 0; k < shown; k += 1) {
        if (nodes.includes(valueAt(k, nodeCol.index))) {
          near.add(k);
          marks.add(`r${k}c${nodeCol.index}`);
        }
      }
      if (viaCol) marks.add(`r${r}c${viaCol.index}`);
      if (costCol) marks.add(`r${r}c${costCol.index}`);
    } else if (matrix && r > 0) {
      near.add(0);
      for (const column of chips) {
        if (xOn(column)) {
          marks.add(`r0c${column.index}`);
          marks.add(`r${r}c${column.index}`);
        }
      }
      if (totalCol) marks.add(`r${r}c${totalCol.index}`);
    } else if (matrix) {
      for (let k = 1; k < shown; k += 1) near.add(k);
      for (const column of chips) marks.add(`r0c${column.index}`);
    }
    readout = { traced: true, text: `${describe(r)}.${from}` };
  } else {
    let text;
    if (automaton) text = "One row per step. Hover or tap a row to see the step it continues from.";
    else if (distance)
      text = "One row per node. Hover or tap a row to trace its path back to the source.";
    else if (matrix)
      text = "Hover or tap a row to see the coefficients its total adds up: the ones whose x is 1.";
    else text = "Hover or tap a row to read it.";
    readout = { traced: false, text };
  }

  const boxOf = (id) => {
    const at = cellAt(id);
    if (at) {
      const row = rows[at.row];
      const column = columns[at.column];
      return row && column ? { x: column.x, y: row.y, width: column.width, height: ROW } : null;
    }
    const row = rows.find((r) => r.id === id);
    return row
      ? { x: layout.left, y: row.y, width: layout.right - layout.left, height: ROW }
      : null;
  };

  const font = layout.font;
  /** Where a changed cell's underline runs: under its text, by the column's alignment. */
  const underSpan = (column, value, pill) => {
    const textW =
      value === null
        ? 0
        : textWidth(value, pill ? pillSize(font) : font) + (pill ? 2 * layout.pillPad : 0);
    const width = Math.min(column.width - 4, Math.max(10, textW + 4));
    const x =
      column.align === "middle"
        ? column.textX - width / 2
        : column.align === "end"
          ? column.textX - width + 2
          : column.textX - 2;
    return { x: Math.round(x * 100) / 100, width: Math.round(width * 100) / 100 };
  };
  const labelX = layout.label ? layout.label.x + (layout.columns[0]?.x - layout.label.x) / 2 : 0;
  const header = (
    <g data-layer="header" pointerEvents="none">
      <rect
        x={layout.left}
        y={layout.top}
        width={layout.right - layout.left}
        height={HEAD_ROW}
        fill={paletteVars.surface.main}
      />
      {layout.label?.head && (
        <Head
          x={labelX}
          y={layout.top + HEAD_ROW / 2}
          text={headText(layout.label.head)}
          anchor="middle"
        />
      )}
      {columns.map((column) => (
        <GadgetRect
          key={`gadget-${column.id}`}
          id={column.id}
          color={gadgetOf(column.id)}
          x={column.x}
          y={layout.top}
          width={column.width}
          height={HEAD_ROW}
          rx={3}
          gap={-3}
        />
      ))}
      {columns.map((column) => (
        <Head
          key={column.id}
          x={column.textX}
          y={layout.top + HEAD_ROW / 2}
          text={headText(column.label)}
          anchor={column.align}
          data-column-id={column.id}
        />
      ))}
      <line
        x1={layout.left}
        x2={layout.right}
        y1={layout.bodyTop}
        y2={layout.bodyTop}
        stroke={paletteVars.border.main}
        strokeWidth={1.5}
      />
    </g>
  );

  const content = (
    <>
      <rect
        data-frame=""
        x={layout.left}
        y={layout.top}
        width={layout.right - layout.left}
        height={layout.bottom - layout.top}
        rx={6}
        fill={paletteVars.surface.input}
        stroke={paletteVars.border.main}
        strokeWidth={1}
        pointerEvents="none"
      />
      {header}
      <g data-layer="lines" pointerEvents="none">
        {rows.slice(1, shown).map((row) => (
          <line
            key={row.id}
            x1={layout.left}
            x2={layout.right}
            y1={row.y}
            y2={row.y}
            stroke={paletteVars.border.soft}
          />
        ))}
      </g>
      <g data-layer="rows">
        {rows.slice(0, shown).map((row, r) => {
          const rowState = stateOf(step.rows, row.id);
          const rowStyle = pictureStateStyle(rowState);
          const stated = rowState !== "Background";
          const faint = near !== null && !near.has(r);
          const isTraced = tracedRow === r;
          const rowFill = stated ? rowStyle.fill : paletteVars.surface.input;
          const parts = [describe(r)];
          if (stated) parts.push(rowStyle.legend);
          const width = layout.right - layout.left;
          return (
            // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
            <g
              key={row.id}
              id={`${idPrefix}-${row.id}`}
              data-row-id={row.id}
              data-state={rowState}
              data-traced={near ? (faint ? "faint" : "trace") : undefined}
              aria-label={parts.join(", ")}
              style={faint ? { filter: FAINT_FILTER } : undefined}
              {...traceProps(row.id)}
            >
              <rect
                x={layout.left}
                y={row.y}
                width={width}
                height={ROW}
                data-row-fill=""
                fill={isTraced ? tint(TRACE_COLOR, 14, rowFill) : stated ? rowFill : "transparent"}
              />
              {stated && (
                <>
                  <rect
                    x={layout.left + 1}
                    y={row.y + 1}
                    width={width - 2}
                    height={ROW - 2}
                    data-row-line=""
                    fill="none"
                    stroke={rowStyle.line}
                    strokeWidth={
                      rowState === "ElementHighlight" || rowState === "Rejected" ? 2 : 1.6
                    }
                    strokeDasharray={rowStyle.dash}
                  />
                  <rect
                    x={layout.left + 1}
                    y={row.y + 1}
                    width={4}
                    height={ROW - 2}
                    data-row-bar=""
                    fill={rowStyle.line}
                  />
                </>
              )}
              {layout.label && (
                <text
                  x={labelX}
                  y={row.cy}
                  data-label=""
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={stated ? rowStyle.ink : paletteVars.text.secondary}
                  fontFamily={MONO}
                  fontSize={font}
                  fontWeight={stated ? 700 : 400}
                  pointerEvents="none"
                >
                  {row.label ?? ""}
                </text>
              )}
              {columns.map((column) => {
                const id = `r${r}c${column.index}`;
                const ownState = stateOf(step.cells, id);
                const ownStyle = pictureStateStyle(ownState);
                const value = valueAt(r, column.index);
                const isChanged = changed.has(id);
                const marked = marks.has(id);
                const chip = matrix && r === 0 && column.chip;
                const on = matrix && r > 0 && column.chip && xOn(column) && value !== null;
                const pill = column.pill && value !== null && !(matrix && r === 0);
                const state = ownState === "Background" ? rowState : ownState;
                let ink = stated ? rowStyle.ink : paletteVars.text.primary;
                if (!stated && value !== null) {
                  const muted =
                    value === "—" ||
                    value === "∞" ||
                    (matrix && r > 0 && column.chip && value === "0") ||
                    (tentative(r) && [costCol, viaCol, pathCol].includes(column));
                  if (muted) ink = paletteVars.text.secondary;
                }
                const italic =
                  tentative(r) &&
                  [costCol, viaCol, pathCol].includes(column) &&
                  value !== "∞" &&
                  value !== "—";
                let body = null;
                if (chip && value !== null) {
                  const unset = value === "?";
                  const look =
                    ownState !== "Background"
                      ? {
                          fill: ownStyle.fill,
                          line: ownStyle.line,
                          ink: ownStyle.ink,
                          dash: ownStyle.dash,
                        }
                      : {
                          fill: paletteVars.surface.input,
                          line: unset ? paletteVars.viz.dim : paletteVars.text.secondary,
                          ink: unset ? paletteVars.text.secondary : paletteVars.text.primary,
                          dash: unset ? "3 2" : undefined,
                        };
                  const w = Math.max(26, value.length * font * 0.62 + 12);
                  body = (
                    <>
                      <rect
                        x={column.textX - w / 2}
                        y={row.cy - CHIP_HEIGHT / 2}
                        width={w}
                        height={CHIP_HEIGHT}
                        rx={6}
                        data-chip={value}
                        fill={look.fill}
                        stroke={look.line}
                        strokeWidth={value === "1" ? 2.2 : 1.5}
                        strokeDasharray={look.dash}
                      />
                      <text
                        x={column.textX}
                        y={row.cy}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={look.ink}
                        fontFamily={MONO}
                        fontSize={font}
                        fontWeight={unset ? 400 : 700}
                        pointerEvents="none"
                      >
                        {value}
                      </text>
                    </>
                  );
                } else if (pill) {
                  const tone = stated
                    ? { ink: rowStyle.ink, line: rowStyle.ink, bold: true }
                    : pillTone(column.key, value);
                  const w = textWidth(value, pillSize(font)) + 2 * layout.pillPad;
                  const x0 = column.x + (column.width - Math.max(w, 0)) / 2;
                  const px = column.align === "start" ? column.textX : x0;
                  body = (
                    <>
                      <rect
                        x={px}
                        y={row.cy - PILL_HEIGHT / 2}
                        width={w}
                        height={PILL_HEIGHT}
                        rx={PILL_HEIGHT / 2}
                        data-pill={value}
                        fill={stated ? rowFill : paletteVars.surface.input}
                        stroke={tone.line}
                        strokeWidth={1.3}
                        strokeDasharray={tone.dash}
                      />
                      <text
                        x={px + w / 2}
                        y={row.cy}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={tone.ink}
                        fontFamily={MONO}
                        fontSize={pillSize(font)}
                        fontWeight={tone.bold ? 700 : 400}
                        pointerEvents="none"
                      >
                        {value}
                      </text>
                    </>
                  );
                } else if (value !== null) {
                  body = (
                    <text
                      x={column.textX}
                      y={row.cy}
                      textAnchor={column.align}
                      dominantBaseline="central"
                      fill={ownState !== "Background" ? ownStyle.ink : ink}
                      fontFamily={MONO}
                      fontSize={font}
                      fontStyle={italic ? "italic" : undefined}
                      fontWeight={isChanged || on || ownState !== "Background" ? 700 : 400}
                      pointerEvents="none"
                    >
                      {value}
                    </text>
                  );
                }
                return (
                  <g
                    key={column.id}
                    id={`${idPrefix}-${id}`}
                    data-cell-id={id}
                    data-state={state}
                    data-changed={isChanged ? "true" : undefined}
                    data-on={on ? "true" : undefined}
                    data-tentative={italic ? "true" : undefined}
                  >
                    <rect
                      x={column.x}
                      y={row.y}
                      width={column.width}
                      height={ROW}
                      data-body=""
                      fill={
                        ownState !== "Background" && !chip
                          ? ownStyle.fill
                          : on
                            ? tint(paletteVars.text.primary, 14, rowFill)
                            : "transparent"
                      }
                      stroke={ownState !== "Background" && !chip ? ownStyle.line : "none"}
                      strokeWidth={ownState !== "Background" && !chip ? 2 : 0}
                      strokeDasharray={
                        ownState !== "Background" && !chip ? ownStyle.dash : undefined
                      }
                    />
                    <GadgetRect
                      id={id}
                      color={gadgetOf(id)}
                      x={column.x}
                      y={row.y}
                      width={column.width}
                      height={ROW}
                      rx={4}
                      gap={-3}
                    />
                    {body}
                    {isChanged && (
                      <rect
                        {...underSpan(column, value, pill)}
                        y={row.y + ROW - 4.5}
                        height={2.5}
                        data-underline=""
                        fill={stated ? rowStyle.ink : pictureStateStyle("ElementHighlight").line}
                      />
                    )}
                    {marked && (
                      <rect
                        x={column.x + 2}
                        y={row.y + 2}
                        width={column.width - 4}
                        height={ROW - 4}
                        rx={4}
                        data-trace-mark={id}
                        fill="none"
                        stroke={TRACE_COLOR}
                        strokeWidth={2.2}
                      />
                    )}
                  </g>
                );
              })}
              {/* Last, so the row's cells don't cover it. */}
              <GadgetRect
                id={row.id}
                color={gadgetOf(row.id)}
                x={layout.left}
                y={row.y}
                width={width}
                height={ROW}
                rx={3}
                gap={-2}
              />
            </g>
          );
        })}
      </g>
    </>
  );
  const what = matrix
    ? `${Math.max(0, rows.length - 1)} constraints over ${chips.length} variables`
    : `${shown} of ${rows.length} rows drawn`;
  const label = `${name}: ${plain ? `${shown} ${shown === 1 ? "row" : "rows"}` : what}.`;
  return { content, readout, label, boxOf, after: null };
}

/**
 * The Legend's entries for what a Table picture draws besides states: the step's arrows and the
 * underline (a cell changed this step), the grid's trace-back path, the matrix's chips and shaded
 * coefficients, the verdict pills and the tentative costs, each only when the picture draws it.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function tableAnnotations(payload, frames) {
  const list = Array.isArray(frames) ? frames.filter(Boolean) : [];
  const entries = [];
  const highlight = pictureStateStyle("ElementHighlight");
  const met = pictureStateStyle("Covered");
  const columns = Array.isArray(payload?.columns) ? payload.columns : [];
  if (payload?.shape === "grid") {
    if (list.some((frame) => Array.isArray(frame.arrows) && frame.arrows.length)) {
      entries.push(
        {
          key: "best",
          text: "Solid arrow (the cell whose value this cell took)",
          swatch: { kind: "line", color: highlight.line },
        },
        {
          key: "read",
          text: "Dashed arrow (a cell it read but didn't take)",
          swatch: { kind: "line", color: highlight.line, dash: READ_DASH },
        },
      );
    }
    entries.push({
      key: "base",
      text: "Grey edge cells (row 0 and column 0: turning a prefix into the empty string)",
      swatch: {
        kind: "fill",
        fill: paletteVars.surface.main,
        line: paletteVars.viz.dim,
      },
    });
  }
  if (list.some((frame) => Array.isArray(frame.changed) && frame.changed.length)) {
    entries.push({
      key: "changed",
      text: "Underline (changed this step)",
      swatch: { kind: "line", color: highlight.line },
    });
  }
  if (payload?.shape === "matrix") {
    entries.push(
      {
        key: "chip",
        text: "Chip (a variable's value: ? not tried yet, 0 or 1)",
        swatch: { kind: "text", text: "1" },
      },
      {
        key: "on",
        text: "Shaded coefficient (its x is 1, so it counts toward the row's total)",
        swatch: {
          kind: "fill",
          fill: tint(paletteVars.text.primary, 14),
          line: tint(paletteVars.text.primary, 14),
        },
      },
    );
  }
  const keys = new Set(columns.map((column) => column.key));
  if ([...keys].some((key) => key === "accepting" || key === "holds" || key === "settled")) {
    entries.push({
      key: "pill",
      text: keys.has("settled")
        ? "Pill (#n: settled n-th, its cost is final; dashed: not yet)"
        : "Pill (the row's verdict: green yes, grey or red no)",
      swatch: { kind: "fill", fill: paletteVars.surface.input, line: met.line },
    });
  }
  if (keys.has("settled") && keys.has("cost")) {
    entries.push({
      key: "tentative",
      text: "Italic (a cost found but not settled yet: it may still drop)",
      swatch: { kind: "text", text: "4" },
    });
  }
  return entries;
}
