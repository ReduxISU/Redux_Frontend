// components/pictures/TableRenderer.js
//
// #199: the Table picture type (Redux #671), the first renderer on the format=frames
// foundation. One renderer draws all three shapes Redux sends:
//   - trace (DFA, NFA, SSSP, SPSP): rows are added as the run reaches them, so a frame can
//     show fewer rows than the payload lists;
//   - grid (Edit Distance): a dynamic-programming table with row and column letters, and
//     arrows from the cells a fill read to the cell it filled;
//   - matrix (0-1 ILP): one row per constraint, with its total against its bound.
//
// The payload holds what never changes (columns, rows, a title, the grid's axis names); each
// frame holds the cell text (`values[i][j]`, null for an empty cell), the states of whole
// rows and single cells (a cell's own state shows over its row's), the cells that changed
// this step (underlined: an annotation, not a state) and, for a grid, the arrows.
//
// A real <table> rather than an SVG with role="img": the picture is text, and a table keeps
// every cell readable and navigable by a screen reader. Each stated row or cell also spells
// its state out in hidden text, so the state is never carried by color alone.

import Box from "@mui/material/Box";
import { pictureStateStyle, stateOf } from "./pictureStates";
import { pictureFocusSx, pictureMotionSx, visuallyHiddenSx } from "./pictureSx";

const MONO = '"JetBrains Mono", "Fira Code", Consolas, monospace';

const cellId = (rowIndex, columnIndex) => `r${rowIndex}c${columnIndex}`;

/** A cell's fill and text in the given state. */
function fillSx(state) {
  if (state === "Background") return {};
  const style = pictureStateStyle(state);
  return {
    backgroundColor: style.fill,
    color: style.ink,
    fontWeight: state === "Solution" || state === "Rejected" ? 700 : undefined,
  };
}

/**
 * The line in the state's color, a second cue next to the fill (dashed for the faded states).
 * A stated row draws one outline around the whole row (top and bottom on every cell, the sides
 * on its first and last); a cell with a state of its own draws it inside its own edges.
 */
function lineSx(state, { row, first, last } = {}) {
  if (state === "Background") return {};
  const style = pictureStateStyle(state);
  const edge = `2px ${style.dash ? "dashed" : "solid"} ${style.line}`;
  if (row) {
    return {
      borderTop: edge,
      borderBottom: edge,
      ...(first ? { borderLeft: edge } : {}),
      ...(last ? { borderRight: edge } : {}),
    };
  }
  return { outline: edge, outlineOffset: "-3px" };
}

/**
 * The cells a grid frame's arrows read from: `best` for the one whose value the fill took.
 * @returns {Map<string, "best"|"read">}
 */
function arrowSources(frame) {
  const sources = new Map();
  for (const arrow of frame.arrows ?? []) {
    if (typeof arrow?.from !== "string") continue;
    if (arrow.best || !sources.has(arrow.from))
      sources.set(arrow.from, arrow.best ? "best" : "read");
  }
  return sources;
}

function stateNote(state) {
  return state === "Background" ? null : (
    <Box component="span" sx={visuallyHiddenSx}>
      {` (${pictureStateStyle(state).legend})`}
    </Box>
  );
}

/**
 * The Table's plain frame, for its default picture before Run (registry.js plainFrame()). Unlike
 * the graphs, a table keeps its cell text in the frames, so an empty frame would draw no rows at
 * all. The backend sends the instance's base picture as `payload.blank` (its cells with nothing
 * worked out, `values[i][j]` as in a frame, no states): that is drawn when present, so no
 * solver's work shows before Run (an ILP's first try and its totals, say). A backend older than
 * `blank` gets the first step's cell text instead, without its row and cell states, underlines
 * or arrows.
 * @returns {{values: Array<Array<string|null>>}}
 */
export function tablePlainFrame(payload, frames) {
  const blank = payload?.blank?.values;
  if (Array.isArray(blank)) return { values: blank };
  const values = frames?.[0]?.values;
  return { values: Array.isArray(values) ? values : [] };
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the caption.
 * @param {{shape?: string, columns: Array<{id: string, label: string, key?: string}>,
 *   rows: Array<{id: string, label?: string}>, title?: string, rowAxis?: string,
 *   columnAxis?: string, blank?: {values: Array<Array<string|null>>}}} props.payload
 * @param {{values?: Array<Array<string|null>>, rows?: Object, cells?: Object,
 *   changed?: string[], arrows?: Array<{from: string, to: string, best: boolean}>}} props.frame
 */
export default function TableRenderer({ idPrefix, name, payload, frame }) {
  const columns = Array.isArray(payload?.columns) ? payload.columns : [];
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const values = Array.isArray(frame?.values) ? frame.values : [];
  const shownCount = Math.min(values.length, rows.length);
  const changed = new Set(frame?.changed ?? []);
  const sources = arrowSources(frame ?? {});
  const hasRowLabels = rows.some((row) => typeof row.label === "string");
  const hasAxes = Boolean(payload?.rowAxis || payload?.columnAxis);

  const caption =
    payload?.title ||
    `${name}: ${shownCount < rows.length ? `${shownCount} of ${rows.length}` : rows.length} row${
      rows.length === 1 ? "" : "s"
    }`;

  const headCellSx = {
    position: "sticky",
    top: 0,
    zIndex: 1,
    backgroundColor: "surface.raised",
    color: "text.primary",
    border: "1px solid",
    borderColor: "border.main",
    px: 1.25,
    py: 0.75,
    fontFamily: MONO,
    fontWeight: 700,
    textAlign: "center",
    whiteSpace: "nowrap",
  };
  const bodyCellSx = {
    border: "1px solid",
    borderColor: "border.main",
    px: 1.25,
    py: 0.75,
    textAlign: "center",
    whiteSpace: "nowrap",
    fontFamily: MONO,
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <Box
      id={`${idPrefix}-table`}
      role="region"
      aria-label={caption}
      tabIndex={0}
      data-picture-type="Table"
      data-table-shape={payload?.shape ?? ""}
      sx={{
        width: "100%",
        maxWidth: "100%",
        overflow: "auto",
        borderRadius: "8px",
        ...pictureFocusSx,
        ...pictureMotionSx,
      }}
    >
      <Box
        component="table"
        sx={{
          borderCollapse: "collapse",
          minWidth: "max-content",
          mx: "auto",
          fontSize: "0.875rem",
          color: "text.primary",
        }}
      >
        <Box
          component="caption"
          id={`${idPrefix}-table-caption`}
          sx={{
            captionSide: "top",
            textAlign: "left",
            pb: 1,
            fontWeight: 700,
          }}
        >
          {caption}
        </Box>
        <Box component="thead">
          {payload?.columnAxis && (
            <Box component="tr">
              {hasRowLabels && <Box component="td" sx={{ border: 0 }} />}
              <Box
                component="th"
                scope="colgroup"
                colSpan={columns.length}
                sx={{
                  ...headCellSx,
                  position: "static",
                  backgroundColor: "transparent",
                  border: 0,
                }}
              >
                {payload.columnAxis}
              </Box>
            </Box>
          )}
          <Box component="tr">
            {hasRowLabels && (
              <Box
                component="th"
                scope="col"
                sx={{ ...headCellSx, left: 0, zIndex: 2, color: "text.secondary", fontWeight: 600 }}
              >
                {hasAxes ? (payload.rowAxis ?? "") : ""}
              </Box>
            )}
            {columns.map((column) => (
              <Box
                component="th"
                key={column.id}
                id={`${idPrefix}-col-${column.id}`}
                scope="col"
                sx={headCellSx}
              >
                {column.label ?? column.id}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {rows.slice(0, shownCount).map((row, rowIndex) => {
            const rowState = stateOf(frame?.rows, row.id);
            const rowValues = Array.isArray(values[rowIndex]) ? values[rowIndex] : [];
            return (
              <Box component="tr" key={row.id} id={`${idPrefix}-${row.id}`} data-state={rowState}>
                {hasRowLabels && (
                  <Box
                    component="th"
                    scope="row"
                    sx={{
                      ...bodyCellSx,
                      position: "sticky",
                      left: 0,
                      backgroundColor: "surface.raised",
                      fontWeight: 700,
                      ...fillSx(rowState),
                      ...lineSx(rowState, { row: true, first: true }),
                    }}
                  >
                    {row.label ?? ""}
                    {stateNote(rowState)}
                  </Box>
                )}
                {columns.map((column, columnIndex) => {
                  const id = cellId(rowIndex, columnIndex);
                  const ownState = stateOf(frame?.cells, id);
                  const state = ownState === "Background" ? rowState : ownState;
                  const value = rowValues[columnIndex];
                  const source = sources.get(id);
                  const sourceLine = pictureStateStyle(
                    source === "best" ? "ElementHighlight" : "Background",
                  ).line;
                  return (
                    <Box
                      component="td"
                      key={column.id}
                      id={`${idPrefix}-${id}`}
                      headers={`${idPrefix}-col-${column.id}`}
                      data-state={state}
                      data-changed={changed.has(id) ? "true" : undefined}
                      data-arrow={source}
                      sx={{
                        ...bodyCellSx,
                        ...fillSx(state),
                        ...lineSx(rowState, {
                          row: true,
                          first: !hasRowLabels && columnIndex === 0,
                          last: columnIndex === columns.length - 1,
                        }),
                        ...lineSx(ownState),
                        ...(changed.has(id)
                          ? {
                              textDecoration: "underline",
                              textDecorationThickness: "2px",
                              textUnderlineOffset: "3px",
                            }
                          : {}),
                        ...(source
                          ? {
                              outline: `2px ${source === "best" ? "solid" : "dashed"} ${sourceLine}`,
                              outlineOffset: "-4px",
                            }
                          : {}),
                      }}
                    >
                      {value ?? ""}
                      {/* The row header says the row's state (the first cell does, in a table
                          with no row headers); a cell only adds its own. */}
                      {ownState !== "Background"
                        ? stateNote(ownState)
                        : !hasRowLabels && columnIndex === 0 && stateNote(rowState)}
                      {source && (
                        <Box component="span" sx={visuallyHiddenSx}>
                          {source === "best" ? " (the value this step took)" : " (read this step)"}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
