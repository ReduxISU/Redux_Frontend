// components/pictures/TripartiteRenderer.js
//
// #213: the Tripartite Matching picture type (ReduxISU/Redux#675), Redux's PICTURE-TYPES.md
// "Tripartite Matching": 3-Dimensional Matching's three sets X, Y and Z as three columns of
// names, and each triple of M as a line through its three names, listed beside (or under) them.
//
// The payload holds the names (`x1`, `y1`, `z1`... by position, so a name in two sets is two
// elements) and the triples (`T1`... by position in M); each frame holds the triples chosen
// (`chosen`), how many times the chosen triples use each name they use more than once
// (`repeats`, drawn as a ×2 badge), and the states of the names (`elements`) and the triples
// (`triples`): an id that is absent is Background. A name used once is Covered, one used twice
// Rejected; a triple that shares a name with a chosen one is Blocked, drawn dashed and grey.
// A triple's state is its line's color and width and its list row's fill.
//
// Layout is tripartiteLayout.js's pure function of the payload and the box's width. Hovering,
// focusing or tapping a name traces it: its triples and their names stay, in the trace color,
// and the rest fade by color; a triple (its list row, or its line) traces its three names. The
// diagram opens fitted to its box and zooms and pans with DiagramZoom.js; on a phone it is laid
// out at the box's width, so its text keeps its size.
//
// #250: a name can be dragged up or down its own column (or moved with the arrow keys), to pull
// apart lines that cross, as a Bipartite Graph's nodes can; its triples' lines follow. It stays
// in its column, between the first and the last row: which set a name is in is the instance.
// The list does not move. Reset layout puts the names back.
//
// #239: a gadget's pieces (`highlightIds`, `gadgetColors`; gadgetRings.js) are marked: a name gets
// a ring outside its pill, and a triple a ring around its list row and a band under its line.

import Box from "@mui/material/Box";
import { useMemo, useRef, useState } from "react";
import { paletteVars } from "../theme";
import DiagramZoom from "./DiagramZoom";
import { makeEditor, nodeDragProps, useDiagramEdits } from "./diagramEdits";
import { GadgetRect, GadgetUnderlay, useGadgetMarks } from "./gadgetRings";
import { edgeLook, FAINT_EDGE, FAINT_FILTER, MONO, nodeLook, TRACE_COLOR } from "./graphPieces";
import { pictureStateStyle, stateOf } from "./pictureStates";
import {
  BADGE_RADIUS,
  badgeAt,
  HEAD_SIZE,
  LIST_ROW,
  LIST_SIZE,
  layoutTripartite,
  NAME_SIZE,
  PILL_HEIGHT,
  tripleNames,
  triplePath,
} from "./tripartiteLayout";
import { useBoxWidth } from "./useBoxWidth";

/** A triple's line in a state: the edge look, a Blocked line dashed in the dim grey. */
function tripleLook(state) {
  if (state === "Blocked") return { line: paletteVars.viz.dim, width: 1.6, dash: "4 4" };
  if (state === "Committed") return { ...edgeLook(state), width: 3.4, dash: "8 4" };
  if (state === "Background") return edgeLook(state);
  return { ...edgeLook(state), width: state === "Rejected" ? 3 : 3.4 };
}

function plural(count, word) {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Tripartite Matching payload.
 * @param {Object} props.frame The frame to draw.
 * @param {string|null} [props.layoutKey] The instance and visualization drawn (#250).
 * @param {string[]} [props.highlightIds] Gadget piece ids to mark (#239).
 * @param {Object<string, string>} [props.gadgetColors] Color mode's marks, by piece id (#239).
 */
export default function TripartiteRenderer({
  idPrefix,
  name,
  payload,
  frame,
  layoutKey = null,
  highlightIds,
  gadgetColors,
}) {
  const gadgetOf = useGadgetMarks(highlightIds, gadgetColors);
  const boxRef = useRef(null);
  const boxWidth = useBoxWidth(boxRef);
  const layout = useMemo(
    () => layoutTripartite(payload, boxWidth ?? undefined),
    [payload, boxWidth],
  );
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);

  // The reader's moves: a name keeps its column's x and takes the y it was dragged to, between
  // the first row and the last.
  const edits = useDiagramEdits([layoutKey ?? payload]);
  const lowest = layout.top + 23;
  const highest = layout.bottom - 23;
  const elements = layout.elements.map((element) => {
    const moved = edits.nodes[element.id];
    return moved ? { ...element, y: Math.min(highest, Math.max(lowest, moved.y)) } : element;
  });
  const byId = new Map(elements.map((element) => [element.id, element]));
  const editor = makeEditor({
    edits,
    nodeAt: (id) => byId.get(id) ?? null,
    moveNode: (id, point) => {
      const element = byId.get(id);
      if (!element) return;
      edits.setNode(id, { x: element.x, y: Math.min(highest, Math.max(lowest, point.y)) });
    },
  });

  const triplesOf = useMemo(() => {
    const map = new Map(layout.elements.map((element) => [element.id, []]));
    for (const triple of layout.triples) {
      for (const id of [triple.x, triple.y, triple.z]) map.get(id)?.push(triple.id);
    }
    return map;
  }, [layout]);
  const tripleById = new Map(layout.triples.map((triple) => [triple.id, triple]));

  // What is traced: a name (its triples and their names), or a triple (its three names).
  const pointedAt = hover ?? pinned;
  let near = null;
  if (byId.has(pointedAt)) {
    near = new Set([pointedAt, ...triplesOf.get(pointedAt)]);
    for (const id of triplesOf.get(pointedAt)) {
      const triple = tripleById.get(id);
      for (const element of [triple.x, triple.y, triple.z]) near.add(element);
    }
  } else if (tripleById.has(pointedAt)) {
    const triple = tripleById.get(pointedAt);
    near = new Set([pointedAt, triple.x, triple.y, triple.z]);
  }
  const traced = near ? pointedAt : null;

  const toggle = (id) => setPinned((current) => (current === id ? null : id));
  const traceHandlers = (id) => ({
    onPointerEnter: (event) => {
      if (event.pointerType === "mouse") setHover(id);
    },
    onPointerLeave: (event) => {
      if (event.pointerType === "mouse") setHover(null);
    },
    onClick: () => toggle(id),
  });
  const traceProps = (id) => ({
    "data-focusable": "",
    tabIndex: 0,
    role: "button",
    "aria-pressed": pinned === id,
    ...traceHandlers(id),
    onFocus: () => setHover(id),
    onBlur: () => setHover(null),
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle(id);
      }
    },
  });

  const chosen = new Set(Array.isArray(frame?.chosen) ? frame.chosen : []);
  const repeats = frame?.repeats && typeof frame.repeats === "object" ? frame.repeats : {};
  const focus = new Set(Array.isArray(frame?.focus) ? frame.focus : []);
  const columnNames = ["X", "Y", "Z"];
  const sizes = layout.columns.map(
    (_, k) => layout.elements.filter((element) => element.column === k).length,
  );
  const label = `${name}: ${sizes.map((size, k) => `${size} in ${columnNames[k]}`).join(", ")}, and ${plural(layout.triples.length, "triple")}${chosen.size ? `; ${plural(chosen.size, "triple")} chosen` : ""}.`;

  return (
    <Box
      ref={boxRef}
      id={`${idPrefix}-tripartite`}
      data-drawing-width={layout.width}
      data-wide={layout.wide ? "true" : "false"}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <DiagramZoom
        idPrefix={idPrefix}
        label={label}
        drawing={layout}
        resetOn={[payload, layout.width]}
        editor={editor}
      >
        <g data-layer="heads" pointerEvents="none">
          {layout.columns.map((column) => (
            <text
              key={column.key}
              x={column.x}
              y={layout.headY}
              data-head=""
              textAnchor="middle"
              dominantBaseline="central"
              fill={paletteVars.text.secondary}
              fontFamily={MONO}
              fontSize={HEAD_SIZE}
              fontWeight={600}
              letterSpacing="0.08em"
            >
              {column.head}
            </text>
          ))}
          {layout.triples.length > 0 && (
            <text
              x={layout.list.x}
              y={layout.list.headY}
              data-head=""
              dominantBaseline="central"
              fill={paletteVars.text.secondary}
              fontFamily={MONO}
              fontSize={HEAD_SIZE}
              fontWeight={600}
              letterSpacing="0.08em"
            >
              TRIPLES · M
            </text>
          )}
        </g>
        <g data-layer="triples">
          {layout.triples.map((triple) => {
            const state = stateOf(frame?.triples, triple.id);
            const faint = near !== null && !near.has(triple.id);
            const isTraced = near !== null && !faint;
            const look = faint
              ? FAINT_EDGE
              : isTraced
                ? { line: TRACE_COLOR, width: 3, dash: undefined }
                : tripleLook(state);
            const d = triplePath(
              byId.get(triple.x),
              byId.get(triple.y),
              byId.get(triple.z),
              triple.lane,
            );
            return (
              <g key={triple.id} style={faint ? { filter: FAINT_FILTER } : undefined}>
                <GadgetUnderlay
                  id={triple.id}
                  color={gadgetOf(triple.id)}
                  d={d}
                  width={look.width}
                />
                <path
                  d={d}
                  data-triple-line={triple.id}
                  data-state={state}
                  data-traced={near ? (faint ? "faint" : "trace") : undefined}
                  fill="none"
                  stroke={look.line}
                  strokeWidth={look.width}
                  strokeDasharray={look.dash}
                  strokeLinecap="round"
                  pointerEvents="none"
                />
                {/* A wider line to point at, for a mouse or a finger. */}
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={12}
                  pointerEvents="stroke"
                  {...traceHandlers(triple.id)}
                />
              </g>
            );
          })}
        </g>
        <g data-layer="elements">
          {elements.map((element) => {
            const state = stateOf(frame?.elements, element.id);
            const look = nodeLook(state);
            const faint = near !== null && !near.has(element.id);
            const isTraced = traced === element.id;
            const count = Number(repeats[element.id]) || 0;
            const badge = badgeAt(element);
            const uses = triplesOf.get(element.id);
            const parts = [`${element.name} in ${columnNames[element.column]}`];
            parts.push(uses.length ? `in ${uses.join(", ")}` : "in no triple");
            if (count > 1) parts.push(`used ${count} times`);
            if (state !== "Background") parts.push(pictureStateStyle(state).legend);
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={element.id}
                data-element-id={element.id}
                data-state={state}
                data-focus={focus.has(element.id) ? "true" : undefined}
                data-traced={near ? (faint ? "faint" : "trace") : undefined}
                aria-label={parts.join(", ")}
                style={faint ? { filter: FAINT_FILTER } : undefined}
                {...traceProps(element.id)}
                {...nodeDragProps(element.id)}
              >
                <rect
                  x={element.x - element.width / 2}
                  y={element.y - PILL_HEIGHT / 2}
                  width={element.width}
                  height={PILL_HEIGHT}
                  rx={PILL_HEIGHT / 2}
                  data-body=""
                  fill={state === "Background" ? paletteVars.surface.input : look.fill}
                  stroke={isTraced ? TRACE_COLOR : look.line}
                  strokeWidth={isTraced ? 3 : look.strokeWidth}
                  strokeDasharray={isTraced ? undefined : look.dash}
                />
                <GadgetRect
                  id={element.id}
                  color={gadgetOf(element.id)}
                  x={element.x - element.width / 2}
                  y={element.y - PILL_HEIGHT / 2}
                  width={element.width}
                  height={PILL_HEIGHT}
                  rx={PILL_HEIGHT / 2}
                />
                <text
                  x={element.x}
                  y={element.y}
                  data-label=""
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={state === "Background" ? paletteVars.text.primary : look.ink}
                  fontFamily={MONO}
                  fontSize={NAME_SIZE}
                  fontWeight={look.bold && state !== "Background" ? 700 : 400}
                  pointerEvents="none"
                >
                  {element.name}
                </text>
                {count > 1 && (
                  <g data-repeat={count} pointerEvents="none">
                    <circle
                      cx={badge.x}
                      cy={badge.y}
                      r={BADGE_RADIUS}
                      fill={pictureStateStyle("Rejected").line}
                      stroke={paletteVars.surface.input}
                      strokeWidth={1.5}
                    />
                    <text
                      x={badge.x}
                      y={badge.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={paletteVars.surface.input}
                      fontFamily={MONO}
                      fontSize={11}
                      fontWeight={700}
                    >
                      {`×${count}`}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
        <g data-layer="list">
          {layout.triples.map((triple) => {
            const state = stateOf(frame?.triples, triple.id);
            const style = pictureStateStyle(state);
            const faint = near !== null && !near.has(triple.id);
            const isTraced = traced === triple.id;
            const solid = state === "Solution";
            const parts = [`${triple.id}: ${triple.names.join(", ")}`];
            if (chosen.has(triple.id)) parts.push("chosen");
            if (state !== "Background") parts.push(style.legend);
            const ink =
              state === "Background" || state === "Blocked"
                ? paletteVars.text.secondary
                : solid
                  ? style.ink
                  : style.text;
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={triple.id}
                data-triple-id={triple.id}
                data-state={state}
                data-chosen={chosen.has(triple.id) ? "true" : undefined}
                data-traced={near ? (faint ? "faint" : "trace") : undefined}
                aria-label={parts.join(", ")}
                style={faint ? { filter: FAINT_FILTER } : undefined}
                {...traceProps(triple.id)}
              >
                <rect
                  x={triple.row.x}
                  y={triple.row.y - (LIST_ROW - 4) / 2}
                  width={triple.row.width}
                  height={LIST_ROW - 4}
                  rx={5}
                  data-body=""
                  fill={state === "Background" ? paletteVars.surface.input : style.fill}
                  stroke={
                    isTraced ? TRACE_COLOR : state === "Background" ? "transparent" : style.line
                  }
                  strokeWidth={isTraced ? 2.4 : 1.4}
                  strokeDasharray={isTraced ? undefined : style.dash}
                />
                <GadgetRect
                  id={triple.id}
                  color={gadgetOf(triple.id)}
                  x={triple.row.x}
                  y={triple.row.y - (LIST_ROW - 4) / 2}
                  width={triple.row.width}
                  height={LIST_ROW - 4}
                  rx={5}
                  gap={2}
                />
                <text
                  x={triple.row.idX}
                  y={triple.row.y}
                  dominantBaseline="central"
                  fill={ink}
                  fontFamily={MONO}
                  fontSize={LIST_SIZE}
                  fontWeight={700}
                  pointerEvents="none"
                >
                  {triple.id}
                </text>
                <text
                  x={triple.row.namesX}
                  y={triple.row.y}
                  data-names=""
                  dominantBaseline="central"
                  fill={ink}
                  fontFamily={MONO}
                  fontSize={LIST_SIZE}
                  pointerEvents="none"
                >
                  {tripleNames(triple.names)}
                </text>
              </g>
            );
          })}
        </g>
      </DiagramZoom>
    </Box>
  );
}

/**
 * The Legend's entries for what a Tripartite Matching picture draws besides states: a triple's
 * line, and the ×2 badge of a name used more than once, when the run draws one.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function tripartiteAnnotations(_payload, frames) {
  const entries = [
    {
      key: "triple",
      text: "Line (a triple of M, through one name of each of X, Y and Z)",
      swatch: { kind: "line", color: paletteVars.viz.edge },
    },
  ];
  const list = Array.isArray(frames) ? frames.filter(Boolean) : [];
  const most = Math.max(
    0,
    ...list.flatMap((frame) => Object.values(frame.repeats ?? {}).map(Number)),
  );
  if (most > 1) {
    entries.push({
      key: "repeat",
      text: "×2 badge (how many chosen triples use the name)",
      swatch: { kind: "badge", text: `×${Math.min(most, 9)}` },
    });
  }
  return entries;
}
