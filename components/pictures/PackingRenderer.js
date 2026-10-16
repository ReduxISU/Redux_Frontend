// components/pictures/PackingRenderer.js
//
// #207: the Packing picture type (ReduxISU/Redux#669), Redux's PICTURE-TYPES.md "Packing". Every
// number problem that asks which items go where so a total hits its mark, one drawing for all:
//   - partition (Partition): two sides, S1 and S2, each needing half the total;
//   - subsetSum (Subset Sum): one container, Chosen, needing exactly T;
//   - knapsack (Knapsack): one knapsack, its weights at most W and its values at least V;
//   - binPacking (Bin Packing): up to K bins, each holding at most C.
//
// The payload holds the items (size, and a knapsack item's value) and the containers with their
// lines (`target`, `limit`, `atLeast`); each frame holds the states (`items`, `containers`: an id
// that is absent is Background), which container each item is in (`assign`, -1 for none) and
// each container's totals. Partition's sides and Bin Packing's bins color their items by
// container (an annotation, not a state): the item's state then shows as its outline, as a
// colored graph node's does.
//
// Layout is packingLayout.js's pure function of the payload: items in a pool at the top, each
// container's lines as rows to scale below. Hovering, focusing or tapping an item traces it (its
// tile and its piece in a row, in the trace color, everything else faded by color); a container
// traces the items in it. The diagram opens fitted to its box and zooms and pans with
// DiagramZoom.js. The layout takes the box's width (up to its own 480), so on a phone the picture
// is drawn at its own size, its text at 11.5 to 14 px, rather than shrunk to fit.
//
// #250: nothing here can be dragged. The pool is the instance's order and the rows are drawn to
// scale from each frame's placement, so a moved piece would only say something the solver
// didn't.

import Box from "@mui/material/Box";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { paletteVars } from "../theme";
import DiagramZoom from "./DiagramZoom";
import { FAINT_FILTER, groupColors, MONO, nodeLook, TRACE_COLOR } from "./graphPieces";
import {
  beamTilt,
  formatAmount,
  HEADING_LINE,
  HEADING_SIZE,
  HEADING_SPACING,
  layoutPacking,
  rowSegments,
  TRACK_HEIGHT,
  textWidth,
} from "./packingLayout";
import { pictureStateStyle, stateOf } from "./pictureStates";

/** The dashed line a row's total is held to, and its dash. */
const LINE_DASH = "5 4";

/** How wide a cut piece must be to hold its » (and the room it keeps for it). */
const CUT_ROOM = 16;

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** A heading over the pool or the rows, a line per `lines` entry. */
function Heading({ id, lines, y }) {
  return (
    <text
      x={20}
      y={y}
      data-heading={id}
      fill={paletteVars.text.secondary}
      fontFamily={MONO}
      fontSize={HEADING_SIZE}
      fontWeight={700}
      letterSpacing={`${HEADING_SPACING}em`}
    >
      {lines.map((line, index) => (
        // A space ends every line but the last, so the heading still reads as one sentence.
        <tspan key={line} x={20} dy={index ? HEADING_LINE : 0}>
          {index < lines.length - 1 ? `${line} ` : line}
        </tspan>
      ))}
    </text>
  );
}

/** The width of the box `ref` is on, in CSS px, kept current; null until it is measured. */
function useBoxWidth(ref) {
  const [width, setWidth] = useState(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = () => setWidth(element.clientWidth || null);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/** A frame's container index per item, or null when the frame places nothing (before Run). */
function assignOf(frame, count) {
  const assign = frame?.assign;
  return Array.isArray(assign) && assign.length === count ? assign : null;
}

/**
 * Whether a row's line is met (true), missed (false) or not judged (null), as the container's
 * state says: a Covered container meets every line, and a Rejected one misses the line its own
 * total misses (a knapsack can be within W but short of V).
 */
function rowVerdict(row, containerState, total) {
  if (containerState === "Covered" || containerState === "Solution") return true;
  if (containerState !== "Rejected" || typeof total !== "number") return null;
  if (row.kind === "limit") return total <= row.line;
  if (row.kind === "atLeast") return total >= row.line;
  return total === row.line;
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Packing payload.
 * @param {Object} props.frame The frame to draw.
 */
export default function PackingRenderer({ idPrefix, name, payload, frame }) {
  const boxRef = useRef(null);
  const boxWidth = useBoxWidth(boxRef);
  const layout = useMemo(() => layoutPacking(payload, boxWidth ?? undefined), [payload, boxWidth]);
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);

  const assign = assignOf(frame, layout.items.length);
  const totals = Array.isArray(frame?.totals) ? frame.totals : null;
  const containerOf = (item) => (assign ? assign[item.index] : -1);
  const groupOf = (item) =>
    layout.grouped && containerOf(item) >= 0 ? containerOf(item) : undefined;

  // What is traced: an item, or a container and the items in it. (Ids from an earlier payload,
  // after the instance changed, trace nothing.)
  const pointedAt = hover ?? pinned;
  const tracedItem = layout.items.find((item) => item.id === pointedAt) ?? null;
  const tracedContainer = layout.containers.find((box) => box.id === pointedAt) ?? null;
  let near = null;
  if (tracedItem) near = new Set([tracedItem.id]);
  else if (tracedContainer) {
    near = new Set(
      layout.items
        .filter((item) => containerOf(item) === tracedContainer.index)
        .map((item) => item.id),
    );
  }
  const faintItem = (id) => near !== null && !near.has(id);

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

  const containerLabel = (index) => layout.containers[index]?.label ?? `container ${index + 1}`;
  const plain = pictureStateStyle("Background");
  const label = `${name}: ${plural(layout.items.length, "item")} and ${plural(layout.containers.length, layout.rule === "binPacking" ? "bin" : "container")}.`;

  // Partition's beam: the two sides' totals.
  let tilt = 0;
  let sides = null;
  if (layout.beam && totals) {
    const a = totals[0]?.size;
    const b = totals[1]?.size;
    if (typeof a === "number" && typeof b === "number") {
      sides = [a, b];
      tilt = beamTilt(a, b, a + b);
    }
  }

  return (
    <Box
      ref={boxRef}
      id={`${idPrefix}-packing`}
      data-packing-rule={layout.rule}
      data-drawing-width={layout.width}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <DiagramZoom
        idPrefix={idPrefix}
        label={label}
        drawing={layout}
        resetOn={[payload, layout.width]}
      >
        <Heading id="items" lines={layout.poolHeading} y={22} />
        <g data-layer="items">
          {layout.items.map((item) => {
            const state = stateOf(frame?.items, item.id);
            const group = groupOf(item);
            const look = nodeLook(state, group);
            const faint = faintItem(item.id);
            const traced = near !== null && !faint;
            const where = containerOf(item);
            const parts = [`Item ${item.label}`];
            parts.push(
              item.value !== null
                ? `weight ${item.size}, value ${item.value}`
                : `size ${formatAmount(item.size)}`,
            );
            // An item looked at but kept out (a Subset Sum approximation's number that its best
            // sum doesn't use) is not "left out": the run is still deciding.
            if (assign && where >= 0) parts.push(`in ${containerLabel(where)}`);
            else if (assign && state === "ElementHighlight") {
              parts.push(
                layout.containers.length === 1 ? `not in ${containerLabel(0)}` : "in no container",
              );
            } else if (assign) parts.push("left out");
            if (state !== "Background") parts.push(pictureStateStyle(state).legend);
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={item.id}
                data-item-id={item.id}
                data-state={state}
                data-group={group}
                data-container={assign ? where : undefined}
                data-traced={near ? (faint ? "faint" : "trace") : undefined}
                aria-label={parts.join(", ")}
                style={faint ? { filter: FAINT_FILTER } : undefined}
                {...traceProps(item.id)}
              >
                <rect
                  x={item.x}
                  y={item.y}
                  width={item.width}
                  height={item.height}
                  rx={7}
                  data-body=""
                  fill={look.fill}
                  stroke={traced ? TRACE_COLOR : look.line}
                  strokeWidth={traced ? 3 : look.strokeWidth}
                  strokeDasharray={traced ? undefined : look.dash}
                />
                <text
                  x={item.x + item.width / 2}
                  y={item.y + item.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={look.ink}
                  fontFamily={MONO}
                  fontSize={13.5}
                  fontWeight={look.bold ? 700 : 400}
                  pointerEvents="none"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </g>
        <Heading id="containers" lines={layout.containersHeading} y={layout.containersY} />
        <g data-layer="rows">
          {layout.rows.map((row) => {
            const state = stateOf(frame?.containers, row.container);
            const style = pictureStateStyle(state);
            const stated = state !== "Background";
            const total = totals?.[row.containerIndex]?.[row.measure];
            const verdict = rowVerdict(row, state, total);
            const pieces = rowSegments(row, layout.items, assign);
            const faintRow =
              tracedItem !== null
                ? !pieces.some((piece) => piece.id === tracedItem.id)
                : tracedContainer !== null && tracedContainer.id !== row.container;
            const groupLine = layout.grouped ? groupColors(row.containerIndex).line : null;
            const parts = [`${row.label}: ${row.sub}`];
            if (row.label !== containerLabel(row.containerIndex)) {
              parts.unshift(containerLabel(row.containerIndex));
            }
            if (assign) {
              const inside = pieces.map(
                (piece) => layout.items.find((item) => item.id === piece.id).label,
              );
              parts.push(inside.length ? `holds ${inside.join(", ")}` : "empty");
            }
            if (typeof total === "number") parts.push(`total ${formatAmount(total)}`);
            if (verdict !== null) parts.push(verdict ? "line met" : "line missed");
            if (stated) parts.push(style.legend);
            const readout =
              typeof total === "number"
                ? `${formatAmount(total)}${verdict === null ? "" : verdict ? " ✓" : " ✗"}`
                : "";
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={row.key}
                data-row-id={row.key}
                data-container-id={row.container}
                data-measure={row.measure}
                data-line-kind={row.kind}
                data-state={state}
                data-total={typeof total === "number" ? total : undefined}
                data-verdict={verdict === null ? undefined : verdict ? "met" : "missed"}
                data-traced={near ? (faintRow ? "faint" : "trace") : undefined}
                aria-label={parts.join(", ")}
                style={faintRow ? { filter: FAINT_FILTER } : undefined}
                {...traceProps(row.container)}
              >
                <text
                  x={20}
                  y={row.y + 8}
                  data-row-label=""
                  dominantBaseline="central"
                  fill={stated ? style.text : paletteVars.text.primary}
                  fontFamily={MONO}
                  fontSize={14}
                  fontWeight={700}
                >
                  {row.label}
                  {row.noteY === null && (
                    <tspan
                      dx={8}
                      fill={paletteVars.text.secondary}
                      fontSize={12}
                      fontWeight={400}
                      data-row-sub=""
                    >
                      {row.sub}
                    </tspan>
                  )}
                </text>
                {/* Too long to share the line with the total: the note gets its own. */}
                {row.noteY !== null && (
                  <text
                    x={20}
                    y={row.noteY + 8}
                    data-row-sub=""
                    dominantBaseline="central"
                    fill={paletteVars.text.secondary}
                    fontFamily={MONO}
                    fontSize={12}
                  >
                    {row.sub}
                  </text>
                )}
                <text
                  x={layout.trackEnd}
                  y={row.y + 8}
                  data-readout={readout}
                  textAnchor="end"
                  dominantBaseline="central"
                  fill={
                    verdict === null
                      ? paletteVars.text.primary
                      : pictureStateStyle(verdict ? "Covered" : "Rejected").text
                  }
                  fontFamily={MONO}
                  fontSize={14}
                  fontWeight={700}
                >
                  {readout}
                </text>
                <rect
                  x={layout.trackX}
                  y={row.trackY}
                  width={row.trackWidth}
                  height={TRACK_HEIGHT}
                  rx={6}
                  data-track=""
                  fill={stated ? style.fill : paletteVars.surface.main}
                  stroke={stated ? style.line : (groupLine ?? plain.line)}
                  strokeWidth={stated ? 2.4 : 1.2}
                  strokeDasharray={style.dash}
                />
                {pieces.map((piece) => {
                  const item = layout.items.find((candidate) => candidate.id === piece.id);
                  const itemState = stateOf(frame?.items, item.id);
                  const over = piece.over;
                  const look = nodeLook(
                    over ? "Rejected" : itemState,
                    over ? undefined : groupOf(item),
                  );
                  const traced = tracedItem?.id === item.id;
                  const text = formatAmount(piece.amount);
                  // The piece cut at the track's end keeps room at its end for the » that says so;
                  // one too narrow for it (on a narrow drawing) has the » just past the track.
                  const cut = piece.clipped && piece.width > 0;
                  const cutInside = cut && piece.width >= CUT_ROOM;
                  const room = cutInside ? piece.width - CUT_ROOM : piece.width;
                  const fits = room >= textWidth(text, 12.5) + 6;
                  const fill = over ? pictureStateStyle("Rejected").line : look.fill;
                  const ink = over ? paletteVars.surface.input : look.ink;
                  return (
                    <Fragment key={piece.id}>
                      <g
                        data-piece-for={piece.id}
                        data-over={over ? "true" : undefined}
                        data-clipped={piece.clipped ? "true" : undefined}
                        pointerEvents="none"
                      >
                        <rect
                          x={piece.x}
                          y={row.trackY + 3}
                          width={piece.width}
                          height={24}
                          rx={4}
                          fill={fill}
                          stroke={traced ? TRACE_COLOR : over ? fill : look.line}
                          strokeWidth={traced ? 3 : 1.4}
                          strokeDasharray={traced || over ? undefined : look.dash}
                        />
                        {fits && (
                          <text
                            x={piece.x + room / 2}
                            y={row.trackY + 15}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={ink}
                            fontFamily={MONO}
                            fontSize={12.5}
                            fontWeight={700}
                          >
                            {text}
                          </text>
                        )}
                        {cutInside && (
                          <text
                            x={layout.trackEnd - 4}
                            y={row.trackY + 15}
                            data-cut=""
                            textAnchor="end"
                            dominantBaseline="central"
                            fill={ink}
                            fontFamily={MONO}
                            fontSize={12}
                            fontWeight={700}
                          >
                            »
                          </text>
                        )}
                      </g>
                      {cut && !cutInside && (
                        <text
                          x={layout.trackEnd + 3}
                          y={row.trackY + 15}
                          data-cut=""
                          dominantBaseline="central"
                          fill={paletteVars.text.primary}
                          fontFamily={MONO}
                          fontSize={12}
                          fontWeight={700}
                          pointerEvents="none"
                        >
                          »
                        </text>
                      )}
                    </Fragment>
                  );
                })}
                {/* A halo in the canvas color keeps the line readable across the pieces. */}
                <line
                  x1={row.lineX}
                  x2={row.lineX}
                  y1={row.trackY - 5}
                  y2={row.trackY + 35}
                  stroke={paletteVars.surface.input}
                  strokeWidth={4.5}
                  pointerEvents="none"
                />
                <line
                  x1={row.lineX}
                  x2={row.lineX}
                  y1={row.trackY - 5}
                  y2={row.trackY + 35}
                  data-line={row.line}
                  stroke={paletteVars.text.primary}
                  strokeWidth={1.8}
                  strokeDasharray={LINE_DASH}
                  pointerEvents="none"
                />
                <text
                  x={row.lineLabelX}
                  y={row.trackY + 48}
                  data-line-label={row.lineLabel}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={paletteVars.text.primary}
                  fontFamily={MONO}
                  fontSize={12}
                >
                  {row.lineLabel}
                </text>
              </g>
            );
          })}
        </g>
        {layout.beam && (
          <g data-beam="" data-tilt={tilt.toFixed(1)} pointerEvents="none">
            <polygon
              points={`${layout.beam.x - 12},${layout.beam.y + 24} ${layout.beam.x + 12},${layout.beam.y + 24} ${layout.beam.x},${layout.beam.y + 2}`}
              fill={plain.line}
            />
            <g transform={`rotate(${tilt.toFixed(2)} ${layout.beam.x} ${layout.beam.y})`}>
              <line
                x1={layout.beam.x - layout.beam.half}
                x2={layout.beam.x + layout.beam.half}
                y1={layout.beam.y}
                y2={layout.beam.y}
                stroke={paletteVars.text.primary}
                strokeWidth={3}
                strokeLinecap="round"
              />
              {[0, 1].map((side) => (
                <text
                  key={side}
                  x={layout.beam.x + (side ? 1 : -1) * layout.beam.half}
                  y={layout.beam.y - 12}
                  data-beam-side={side}
                  textAnchor="middle"
                  fill={paletteVars.text.primary}
                  fontFamily={MONO}
                  fontSize={12.5}
                  fontWeight={700}
                >
                  {`${containerLabel(side)}${sides ? ` ${formatAmount(sides[side])}` : ""}`}
                </text>
              ))}
            </g>
          </g>
        )}
      </DiagramZoom>
    </Box>
  );
}

/**
 * The Legend's entries for what a Packing picture draws besides states: the line a total is held
 * to and its ✓ / ✗, each side's or bin's color (only those the run uses), and a piece past a limit.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function packingAnnotations(payload, frames) {
  const entries = [];
  const list = Array.isArray(frames) ? frames.filter(Boolean) : [];
  const rule = payload?.rule;
  const containers = Array.isArray(payload?.containers) ? payload.containers : [];
  if (rule === "partition" || rule === "binPacking") {
    const used = new Set();
    for (const frame of list) {
      for (const index of Array.isArray(frame.assign) ? frame.assign : []) {
        if (Number.isInteger(index) && index >= 0) used.add(index);
      }
    }
    for (const index of [...used].sort((a, b) => a - b)) {
      const colors = groupColors(index);
      const name = containers[index]?.label ?? `Container ${index + 1}`;
      entries.push({
        key: `group-${index}`,
        text: `${name} (${rule === "partition" ? "items on this side" : "items in this bin"})`,
        swatch: { kind: "fill", fill: colors.fill, line: colors.line },
      });
    }
  }
  if (containers.length) {
    entries.push({
      key: "line",
      text: "Dashed line (the number a total must reach or stay within)",
      swatch: { kind: "line", color: paletteVars.text.primary, dash: LINE_DASH },
    });
  }
  if (list.some((frame) => frame.containers && Object.keys(frame.containers).length > 0)) {
    entries.push({
      key: "verdict",
      text: "Tick or cross (the total meets or misses its line)",
      swatch: { kind: "text", text: "✓✗" },
    });
  }
  const layout = layoutPacking(payload);
  const over = list.some((frame) =>
    layout.rows.some((row) =>
      rowSegments(row, layout.items, assignOf(frame, layout.items.length)).some(
        (piece) => piece.over,
      ),
    ),
  );
  if (over) {
    entries.push({
      key: "over",
      text: "Red piece (past the limit)",
      swatch: {
        kind: "fill",
        fill: pictureStateStyle("Rejected").line,
        line: pictureStateStyle("Rejected").line,
      },
    });
  }
  return entries;
}
