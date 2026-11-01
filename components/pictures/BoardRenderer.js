// components/pictures/BoardRenderer.js
//
// #208: the Board picture type (ReduxISU/Redux#670), Redux's PICTURE-TYPES.md "Board". Puzzles
// that live on a grid of squares, one drawing for all:
//   - sudoku (Sudoku): digits in squares, the clues bold on grey, thick lines round the boxes;
//   - queens (N-Queens): a chessboard with queens on it.
//
// The payload holds the game, the board's size, the box size (Sudoku), where the row and column
// labels start and the clues; each frame holds the text of every square that holds text
// (`values`, the clues included), the pieces on the board (`pieces`), the squares' states
// (`cells`: an id that is absent is Background) and, from each square a step ruled out, a link
// to the square that rules it out (`links`). Before Run the picture is the clues alone.
//
// Layout is boardLayout.js's pure function of the payload and the box's width: the squares at
// the mockup's size, smaller on a box too narrow for them, so on a phone the board is drawn at
// its own size and its labels are not shrunk. A square's state is its fill and an outline inside
// it (dashed for Committed); its digit or queen takes the state's ink, so it reads on the fill.
// Hovering, focusing or tapping a square traces it: its row, column and box (a chessboard
// square's row, column and diagonals, with a queen's lines of attack drawn from it) are tinted in
// the trace color and the rest fade by color. On a chessboard a Hints switch shades every square
// a placed queen attacks. The diagram opens fitted to its box and zooms and pans with
// DiagramZoom.js.
//
// #250: nothing here can be dragged. A square's place is its row and column, which is the
// instance itself, so a moved square would only draw a different board.
//
// #239: a gadget's squares (`highlightIds`, `gadgetColors`; gadgetRings.js) get a ring just
// inside the square (inside the state outline, so it never spills onto a neighbour). A queen's
// id is its square's, so the square's ring marks it too.

import Box from "@mui/material/Box";
import { useMemo, useRef, useState } from "react";
import { paletteVars } from "../theme";
import {
  AXIS_SIZE,
  attackEnds,
  layoutBoard,
  parseSquareId,
  squareCentre,
  squaresSeenFrom,
  valueSize,
} from "./boardLayout";
import DiagramZoom from "./DiagramZoom";
import { GadgetRect, useGadgetMarks } from "./gadgetRings";
import { FAINT_FILTER, MONO, PictureToggle, TRACE_COLOR } from "./graphPieces";
import { pictureStateStyle, stateOf } from "./pictureStates";
import { useBoxWidth } from "./useBoxWidth";

/** The dashes of a link from a ruled-out square, and of a queen's line of attack. */
const LINK_DASH = "5 4";
const RAY_DASH = "3 4";

/** How much of the trace color tints a traced square, and a Hints square a queen attacks. */
const TRACE_TINT = 24;
const ATTACK_TINT = 14;

const HINTS = [
  { value: "off", label: "Hints off" },
  { value: "on", label: "Hints on" },
];

/** `color` mixed into the canvas, `percent` of it: a tint, never a see-through color. */
function tint(color, percent) {
  return `color-mix(in srgb, ${color} ${percent}%, ${paletteVars.surface.input})`;
}

/** A queen (a crown), centred on (x, y), `size` across. */
function Queen({ x, y, size, fill, stroke }) {
  const k = size / 40;
  return (
    <g
      transform={`translate(${x - 20 * k},${y - 20 * k}) scale(${k})`}
      fill={fill}
      stroke={stroke}
      strokeWidth={1.2 / k}
      data-queen=""
    >
      <path d="M7 31 L5 14 L13 22 L20 9 L27 22 L35 14 L33 31 Z M7 33 H33 V36 H7 Z" />
      <circle cx={5} cy={12} r={2.6} />
      <circle cx={20} cy={7} r={2.6} />
      <circle cx={35} cy={12} r={2.6} />
    </g>
  );
}

/** Every square a queen in `pieces` attacks (Hints), the queens' own squares left out. */
function attackedSquares(layout, pieces) {
  const attacked = new Set();
  for (const piece of pieces) {
    for (const id of squaresSeenFrom(layout, piece.r, piece.c)) attacked.add(id);
  }
  for (const piece of pieces) attacked.delete(piece.id);
  return attacked;
}

/** The pieces of a frame that stand on the board. */
function piecesOf(frame, size) {
  return (Array.isArray(frame?.pieces) ? frame.pieces : []).filter(
    (piece) =>
      typeof piece?.id === "string" &&
      Number.isInteger(piece.r) &&
      Number.isInteger(piece.c) &&
      piece.r >= 0 &&
      piece.r < size &&
      piece.c >= 0 &&
      piece.c < size,
  );
}

/** The links of a frame whose two ends are squares of the board. */
function linksOf(frame, size) {
  const onBoard = (id) => {
    const at = parseSquareId(id);
    return at !== null && at.r < size && at.c < size;
  };
  return (Array.isArray(frame?.links) ? frame.links : []).filter(
    (link) => onBoard(link?.from) && onBoard(link?.to),
  );
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Board payload.
 * @param {Object} props.frame The frame to draw.
 * @param {string[]} [props.highlightIds] Gadget piece ids to mark (#239).
 * @param {Object<string, string>} [props.gadgetColors] Color mode's marks, by piece id (#239).
 */
export default function BoardRenderer({
  idPrefix,
  name,
  payload,
  frame,
  highlightIds,
  gadgetColors,
}) {
  const gadgetOf = useGadgetMarks(highlightIds, gadgetColors);
  const boxRef = useRef(null);
  const boxWidth = useBoxWidth(boxRef);
  const layout = useMemo(() => layoutBoard(payload, boxWidth), [payload, boxWidth]);
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  const [hints, setHints] = useState("off");
  const queens = layout.game === "queens";

  // What the frame puts on the board. Before Run (no values) that is the clues alone.
  const values =
    frame?.values && typeof frame.values === "object"
      ? frame.values
      : Object.fromEntries(layout.clues);
  const pieces = piecesOf(frame, layout.size);
  const pieceAt = new Map(pieces.map((piece) => [piece.id, piece]));
  const links = linksOf(frame, layout.size);
  const focus = new Set(Array.isArray(frame?.focus) ? frame.focus : []);
  const attacked = queens && hints === "on" ? attackedSquares(layout, pieces) : new Set();

  // What is traced: a square, and the squares it shares a unit with. (An id from an earlier
  // payload, after the instance changed, traces nothing.)
  const pointedAt = parseSquareId(hover ?? pinned);
  const traced =
    pointedAt && pointedAt.r < layout.size && pointedAt.c < layout.size ? pointedAt : null;
  const near = traced ? squaresSeenFrom(layout, traced.r, traced.c) : null;
  const tracedId = traced ? `r${traced.r}c${traced.c}` : null;

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

  const { cell } = layout;
  const boardSize = layout.size * cell;
  const right = layout.left + boardSize;
  const bottom = layout.top + boardSize;
  const label = queens
    ? `${name}: a ${layout.size} by ${layout.size} chessboard with ${pieces.length} ${pieces.length === 1 ? "queen" : "queens"}.`
    : `${name}: a ${layout.size} by ${layout.size} Sudoku grid with ${layout.clues.size} ${layout.clues.size === 1 ? "clue" : "clues"}.`;
  const rejected = pictureStateStyle("Rejected");

  // The grid's lines: thin between every square, thick round each Sudoku box and the board.
  const thin = [];
  for (let i = 1; i < layout.size; i += 1) {
    if (!queens && layout.box && i % layout.box === 0) continue;
    const at = i * cell;
    thin.push(
      `M${layout.left} ${layout.top + at}H${right}M${layout.left + at} ${layout.top}V${bottom}`,
    );
  }
  const thick = [];
  if (!queens && layout.box) {
    for (let i = layout.box; i < layout.size; i += layout.box) {
      const at = i * cell;
      thick.push(
        `M${layout.left} ${layout.top + at}H${right}M${layout.left + at} ${layout.top}V${bottom}`,
      );
    }
  }

  return (
    <Box
      ref={boxRef}
      id={`${idPrefix}-board`}
      data-game={layout.game}
      data-size={layout.size}
      data-cell={cell}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <DiagramZoom
        idPrefix={idPrefix}
        label={label}
        drawing={layout}
        resetOn={[payload, layout.cell]}
        toolbar={
          queens ? (
            <PictureToggle
              id={`${idPrefix}-hints`}
              label="Hints: shade every square a queen attacks"
              options={HINTS}
              value={hints}
              onChange={setHints}
            />
          ) : null
        }
      >
        <g data-layer="squares">
          {layout.squares.map((square) => {
            const state = stateOf(frame?.cells, square.id);
            const style = pictureStateStyle(state);
            const stated = state !== "Background";
            const clue = layout.clues.has(square.id);
            const value = values[square.id];
            const text = !queens && typeof value === "string" ? value : "";
            const piece = pieceAt.get(square.id);
            const inUnit = near !== null && near.has(square.id);
            const faint = near !== null && !inUnit;
            let fill = paletteVars.surface.input;
            if (stated) fill = style.fill;
            else if (inUnit) fill = tint(TRACE_COLOR, TRACE_TINT);
            else if (attacked.has(square.id)) fill = tint(rejected.line, ATTACK_TINT);
            else if (clue) fill = paletteVars.surface.raised;
            else if (square.dark) fill = paletteVars.surface.raised2;
            let ink = paletteVars.text.primary;
            if (stated) ink = style.ink;
            else if (!clue) ink = paletteVars.text.secondary;
            const row = layout.labelsFrom + square.r;
            const column = layout.labelsFrom + square.c;
            const parts = [`Row ${row}, column ${column}`];
            if (piece) parts.push(piece.kind === "queen" ? "a queen" : `a ${piece.kind}`);
            else if (text) parts.push(clue ? `clue ${text}` : `holds ${text}`);
            else parts.push("empty");
            if (attacked.has(square.id)) parts.push("attacked");
            if (stated) parts.push(style.legend);
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={square.id}
                data-square-id={square.id}
                data-state={state}
                data-clue={clue ? "true" : undefined}
                data-value={text || undefined}
                data-piece={piece ? piece.kind : undefined}
                data-focus={focus.has(square.id) ? "true" : undefined}
                data-attacked={attacked.has(square.id) ? "true" : undefined}
                data-traced={near ? (faint ? "faint" : "trace") : undefined}
                aria-label={parts.join(", ")}
                style={faint ? { filter: FAINT_FILTER } : undefined}
                {...traceProps(square.id)}
              >
                <rect
                  x={square.x}
                  y={square.y}
                  width={cell}
                  height={cell}
                  data-body=""
                  style={{ fill }}
                />
                {/* A stated square's outline, inside it so the grid's lines don't cover it. */}
                {stated && (
                  <rect
                    x={square.x + 2.5}
                    y={square.y + 2.5}
                    width={cell - 5}
                    height={cell - 5}
                    rx={3}
                    fill="none"
                    stroke={style.line}
                    strokeWidth={state === "Committed" ? 2 : 2.6}
                    strokeDasharray={style.dash}
                    pointerEvents="none"
                  />
                )}
                <GadgetRect
                  id={square.id}
                  color={gadgetOf(square.id)}
                  x={square.x}
                  y={square.y}
                  width={cell}
                  height={cell}
                  // rx + gap: corners rounded 2 units, like the state outline's.
                  rx={8.5}
                  gap={-6.5}
                />
                {text && (
                  <text
                    x={square.x + cell / 2}
                    y={square.y + cell / 2 + 1}
                    data-text=""
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={ink}
                    fontFamily={MONO}
                    fontSize={valueSize(cell, text)}
                    fontWeight={clue || state === "Rejected" ? 700 : stated ? 600 : 400}
                    pointerEvents="none"
                  >
                    {text}
                  </text>
                )}
              </g>
            );
          })}
        </g>
        <g data-layer="lines" pointerEvents="none" fill="none">
          <path d={thin.join("")} stroke={paletteVars.viz.edge} strokeWidth={1} />
          <path d={thick.join("")} stroke={paletteVars.text.primary} strokeWidth={2.2} />
          <rect
            x={layout.left}
            y={layout.top}
            width={boardSize}
            height={boardSize}
            stroke={paletteVars.text.primary}
            strokeWidth={2.2}
          />
        </g>
        <g data-layer="links" pointerEvents="none">
          {links.map((link) => {
            const from = parseSquareId(link.from);
            const to = parseSquareId(link.to);
            const a = squareCentre(layout, from.r, from.c);
            const b = squareCentre(layout, to.r, to.c);
            const color = pictureStateStyle(link.state ?? "Rejected").line;
            // A ruled-out square with nothing on it (a square a queen attacks) gets a cross.
            const empty = !pieceAt.has(link.from) && !values[link.from];
            const d = cell * 0.2;
            return (
              <g key={`${link.from}>${link.to}`} data-link-from={link.from} data-link-to={link.to}>
                <line
                  x1={b.x}
                  y1={b.y}
                  x2={a.x}
                  y2={a.y}
                  stroke={color}
                  strokeWidth={2.2}
                  strokeDasharray={LINK_DASH}
                />
                {empty && (
                  <path
                    d={`M${a.x - d} ${a.y - d}L${a.x + d} ${a.y + d}M${a.x - d} ${a.y + d}L${a.x + d} ${a.y - d}`}
                    data-cross=""
                    stroke={color}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                  />
                )}
              </g>
            );
          })}
        </g>
        <g data-layer="pieces" pointerEvents="none">
          {pieces.map((piece) => {
            const state = stateOf(frame?.cells, piece.id);
            const centre = squareCentre(layout, piece.r, piece.c);
            const faint = near !== null && !near.has(piece.id);
            const square = layout.squares[piece.r * layout.size + piece.c];
            return (
              <g
                key={piece.id}
                data-piece-id={piece.id}
                data-state={state}
                style={faint ? { filter: FAINT_FILTER } : undefined}
              >
                <Queen
                  x={centre.x}
                  y={centre.y}
                  size={cell * 0.78}
                  fill={
                    state === "Background" ? paletteVars.text.primary : pictureStateStyle(state).ink
                  }
                  stroke={
                    state === "Background"
                      ? square.dark
                        ? paletteVars.surface.raised2
                        : paletteVars.surface.input
                      : pictureStateStyle(state).fill
                  }
                />
              </g>
            );
          })}
        </g>
        {traced && (
          <g data-layer="trace" pointerEvents="none">
            {queens &&
              attackEnds(layout.size, traced.r, traced.c).map((end) => {
                const a = squareCentre(layout, traced.r, traced.c);
                const b = squareCentre(layout, end.r, end.c);
                return (
                  <line
                    key={`${end.r},${end.c}`}
                    data-ray=""
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={TRACE_COLOR}
                    strokeWidth={1.6}
                    strokeDasharray={RAY_DASH}
                  />
                );
              })}
            <rect
              x={layout.left + traced.c * cell + 2}
              y={layout.top + traced.r * cell + 2}
              width={cell - 4}
              height={cell - 4}
              rx={3}
              data-trace-ring={tracedId}
              fill="none"
              stroke={TRACE_COLOR}
              strokeWidth={3}
            />
          </g>
        )}
        <g data-layer="labels" pointerEvents="none">
          {[...layout.rowLabels, ...layout.columnLabels].map((axis, index) => (
            <text
              // biome-ignore lint/suspicious/noArrayIndexKey: the labels are a fixed list.
              key={index}
              x={axis.x}
              y={axis.y}
              data-axis=""
              textAnchor="middle"
              dominantBaseline="central"
              fill={paletteVars.text.secondary}
              fontFamily={MONO}
              fontSize={AXIS_SIZE}
            >
              {axis.text}
            </text>
          ))}
        </g>
      </DiagramZoom>
    </Box>
  );
}

/**
 * The Legend's entries for what a Board picture draws besides states: Sudoku's clues, a link
 * from a ruled-out square to the square that rules it out (with a cross on an empty square), a
 * queen, and the squares Hints shades.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function boardAnnotations(payload, frames) {
  const entries = [];
  const list = Array.isArray(frames) ? frames.filter(Boolean) : [];
  const queens = payload?.game === "queens";
  if (!queens && Array.isArray(payload?.clues) && payload.clues.length) {
    entries.push({
      key: "clue",
      text: "Bold digit on grey (a clue, given by the instance)",
      swatch: { kind: "fill", fill: paletteVars.surface.raised, line: paletteVars.text.primary },
    });
  }
  if (queens && list.some((frame) => Array.isArray(frame.pieces) && frame.pieces.length)) {
    entries.push({
      key: "queen",
      text: "Crown (a queen on the board)",
      swatch: { kind: "text", text: "♛" },
    });
  }
  if (list.some((frame) => Array.isArray(frame.links) && frame.links.length)) {
    entries.push({
      key: "link",
      text: queens
        ? "Dashed line and cross (a square ruled out by the queen it leads to)"
        : "Dashed line (a clash: both squares hold the same digit)",
      swatch: { kind: "line", color: pictureStateStyle("Rejected").line, dash: LINK_DASH },
    });
  }
  if (queens) {
    entries.push({
      key: "attacked",
      text: "Red tint (a square a queen attacks, with Hints on)",
      swatch: {
        kind: "fill",
        fill: tint(pictureStateStyle("Rejected").line, ATTACK_TINT),
        line: pictureStateStyle("Rejected").line,
      },
    });
  }
  return entries;
}
