// components/pictures/BipartiteGraphRenderer.js
//
// #203: the Bipartite Graph picture type (ReduxISU/Redux#665), Redux's PICTURE-TYPES.md
// "Bipartite Graph". Elements on the left, sets on the right, an edge for every membership. The
// certificate picks from one column (the header marks it ● PICKED) and constrains the other:
//   - Set Cover (`pickSide: "sets"`, `rule: "atLeastOnce"`): pick sets, cover every element;
//   - Exact Cover (`sets`, `exactlyOnce`): pick sets, cover every element exactly once;
//   - Hitting Set (`elements`, `exactlyOnce`): pick elements, hit every set exactly once.
// The SAT factor graph (SAT, 3SAT) is the same type with `pickSide: "assignment"`: variables on
// the left with their T / F value, clauses on the right, one edge per literal, dashed for ¬x.
//
// The payload holds the two columns and the edges; each frame holds the states (`nodes`,
// `edges`: an id that is absent is Background), `hits` (how many picks hit each constraint:
// an annotation, drawn as a ×N badge when above 1, or a clause's "n true" pill) and, for the
// factor graph, the `assignment` so far.
//
// Layout is bipartiteLayout.js's pure function of the payload. Hovering, focusing or tapping a
// node traces it: its edges in the trace color, its neighbours as they are, everything else
// faded by color. The diagram opens fitted to its box and zooms and pans with DiagramZoom.js.
//
// #250: the reader can drag a node up or down its own column (never across: the elements stay
// on one side and the sets on the other) and bend any edge (diagramEdits.js).

import Box from "@mui/material/Box";
import { Fragment, useMemo, useState } from "react";
import { paletteVars } from "../theme";
import { bipartiteEdge, ELEMENT_RADIUS, layoutBipartite, TOP_LIMIT } from "./bipartiteLayout";
import DiagramZoom from "./DiagramZoom";
import {
  EdgeHandle,
  editedPositions,
  makeEditor,
  nodeDragProps,
  offsetAlongNormal,
  useDiagramEdits,
} from "./diagramEdits";
import {
  Badge,
  edgeLook,
  FAINT_EDGE,
  FAINT_FILTER,
  MONO,
  nodeLook,
  TRACE_COLOR,
} from "./graphPieces";
import { pictureStateStyle, stateOf } from "./pictureStates";

/** A negated literal's edge (the factor graph): dashed whatever its state. */
const NEGATED_DASH = "5 4";

/** How an edge looks in a state here: a False edge (a false literal) stays thin. */
function bipartiteEdgeLook(state) {
  const look = edgeLook(state);
  if (state === "False" || state === "Untraveled") return { ...look, width: 1.6 };
  return { ...look, width: state === "Background" ? 1.4 : state === "Covered" ? 2.2 : 2.6 };
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Bipartite Graph payload.
 * @param {Object} props.frame The frame to draw.
 * @param {string|null} [props.layoutKey] The instance and visualization drawn (#250).
 */
export default function BipartiteGraphRenderer({
  idPrefix,
  name,
  payload,
  frame,
  layoutKey = null,
}) {
  const layout = useMemo(() => layoutBipartite(payload), [payload]);
  const neighbours = useMemo(() => {
    const map = new Map([...layout.positions.keys()].map((id) => [id, new Set()]));
    for (const edge of layout.edges) {
      map.get(edge.a).add(edge.b);
      map.get(edge.b).add(edge.a);
    }
    return map;
  }, [layout]);
  const labels = useMemo(
    () =>
      new Map([
        ...layout.elements.map((element) => [element.id, element.label]),
        ...layout.sets.map((set) => [set.id, set.label]),
      ]),
    [layout],
  );
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  // (A node from an earlier payload, after the instance changed, traces nothing.)
  const pointedAt = hover ?? pinned;
  const traced = pointedAt !== null && layout.positions.has(pointedAt) ? pointedAt : null;
  const near = traced ? new Set([traced, ...neighbours.get(traced)]) : null;

  const hits = frame?.hits && typeof frame.hits === "object" ? frame.hits : {};
  const assignment =
    frame?.assignment && typeof frame.assignment === "object" ? frame.assignment : {};
  const { assignment: factor, pickSide } = layout;
  const pickSets = pickSide === "sets";

  // The reader's moves: a node keeps its column's x and takes the y it was dragged to.
  const edits = useDiagramEdits([layoutKey ?? payload]);
  const pos = editedPositions(layout.positions, edits.nodes);
  const elements = layout.elements.map((element) => ({ ...element, y: pos.get(element.id).y }));
  const sets = layout.sets.map((set) => ({ ...set, y: pos.get(set.id).y }));
  const halves = new Map(layout.elements.map((element) => [element.id, element.half]));
  const edges = layout.edges.map((edge) => ({
    ...edge,
    ...bipartiteEdge(
      pos.get(edge.a),
      halves.get(edge.a),
      pos.get(edge.b),
      edge.repeat,
      edits.bends[edge.id] ?? 0,
    ),
  }));
  const setHalves = new Map(layout.sets.map((set) => [set.id, set.half]));
  const editor = makeEditor({
    edits,
    nodeAt: (id) => pos.get(id) ?? null,
    // Up and down its own column only, and never over the column heads.
    moveNode: (id, point) => {
      const base = layout.positions.get(id);
      if (!base) return;
      const half = setHalves.get(id) ?? ELEMENT_RADIUS;
      edits.setNode(id, { x: base.x, y: Math.max(point.y, TOP_LIMIT + half) });
    },
    dragEdge: (id, point) => {
      const edge = edges.find((candidate) => candidate.id === id);
      if (!edge) return;
      const a = { x: edge.x1, y: edge.y1 };
      const b = { x: edge.x2, y: edge.y2 };
      edits.setBend(id, offsetAlongNormal(a, b, point) - 11 * edge.repeat);
    },
  });

  const traceHandlers = (id) => {
    const press = () => setPinned((current) => (current === id ? null : id));
    return {
      onPointerEnter: (event) => {
        if (event.pointerType === "mouse") setHover(id);
      },
      onPointerLeave: (event) => {
        if (event.pointerType === "mouse") setHover(null);
      },
      onFocus: () => setHover(id),
      onBlur: () => setHover(null),
      onClick: press,
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          press();
        }
      },
    };
  };

  const listOf = (ids) => ids.map((id) => labels.get(id)).join(", ");
  const neighbourIds = (id) =>
    layout.edges
      .filter((edge) => edge.a === id || edge.b === id)
      .map((e) => (e.a === id ? e.b : e.a));

  const label = factor
    ? `${name}: a factor graph of ${plural(layout.elements.length, "variable")} and ${plural(layout.sets.length, "clause")}.`
    : `${name}: ${plural(layout.elements.length, "element")} and ${plural(layout.sets.length, "set")}, ${plural(layout.edges.length, "membership")}; the answer picks ${pickSets ? "sets" : "elements"}.`;

  return (
    <Box
      id={`${idPrefix}-graph`}
      data-pick-side={pickSide}
      data-rule={payload?.rule ?? ""}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <DiagramZoom
        idPrefix={idPrefix}
        label={label}
        drawing={layout}
        resetOn={[payload]}
        editor={editor}
      >
        <g data-layer="heads">
          {layout.heads.map((head) => (
            <text
              key={head.key}
              x={head.x}
              y={head.y}
              fill={paletteVars.text.secondary}
              fontFamily={MONO}
              fontSize={11}
              fontWeight={600}
              letterSpacing="0.08em"
              dominantBaseline="central"
            >
              {head.text}
              {head.picked && (
                <tspan fill={paletteVars.brand.line} data-picked-head="">
                  {`  ● ${head.picked}`}
                </tspan>
              )}
            </text>
          ))}
        </g>
        <g data-layer="edges">
          {edges.map((edge) => {
            const state = stateOf(frame?.edges, edge.id);
            const touches = traced !== null && (edge.a === traced || edge.b === traced);
            const faint = traced !== null && !touches;
            const base = bipartiteEdgeLook(state);
            let look = base;
            if (touches) look = { ...base, line: TRACE_COLOR, width: 2.4 };
            if (faint) look = FAINT_EDGE;
            const negated = edge.positive === false;
            return (
              <Fragment key={edge.id}>
                <path
                  data-edge-id={edge.id}
                  data-state={state}
                  data-positive={edge.positive === undefined ? undefined : String(edge.positive)}
                  data-traced={traced ? (faint ? "faint" : "trace") : undefined}
                  d={edge.path}
                  fill="none"
                  stroke={look.line}
                  strokeWidth={look.width}
                  strokeDasharray={negated && !faint ? NEGATED_DASH : look.dash}
                  strokeLinecap="round"
                />
                <EdgeHandle id={edge.id} d={edge.path} />
              </Fragment>
            );
          })}
        </g>
        <g data-layer="elements">
          {elements.map((element) => {
            const state = stateOf(frame?.nodes, element.id);
            const look = nodeLook(state);
            const faint = near !== null && !near.has(element.id);
            const isTraced = traced === element.id;
            const count = Number.isInteger(hits[element.id]) ? hits[element.id] : 0;
            const value = assignment[element.id];
            const assigned = typeof value === "boolean";
            const inSets = neighbourIds(element.id);
            const parts = [factor ? `Variable ${element.label}` : `Element ${element.label}`];
            if (factor) parts.push(assigned ? (value ? "true" : "false") : "not assigned yet");
            if (state !== "Background") parts.push(pictureStateStyle(state).legend);
            if (!factor && count > 0) parts.push(`hit by ${plural(count, "picked set")}`);
            parts.push(
              inSets.length
                ? `${factor ? "appears in" : "in"} ${listOf([...new Set(inSets)])}`
                : factor
                  ? "in no clause"
                  : "in no set",
            );
            const pill = element.half > ELEMENT_RADIUS;
            const line = isTraced ? TRACE_COLOR : look.line;
            const strokeWidth = isTraced ? 3 : look.strokeWidth;
            const dash = isTraced ? undefined : look.dash;
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={element.id}
                data-node-id={element.id}
                {...nodeDragProps(element.id)}
                data-side="left"
                data-state={state}
                data-hits={count || undefined}
                data-value={factor ? (assigned ? String(value) : "unassigned") : undefined}
                data-traced={near ? (faint ? "faint" : "trace") : undefined}
                data-focusable=""
                tabIndex={0}
                role="button"
                aria-pressed={pinned === element.id}
                aria-label={parts.join(", ")}
                style={faint ? { filter: FAINT_FILTER } : undefined}
                {...traceHandlers(element.id)}
              >
                {pill ? (
                  <rect
                    x={element.x - element.half}
                    y={element.y - ELEMENT_RADIUS}
                    width={2 * element.half}
                    height={2 * ELEMENT_RADIUS}
                    rx={ELEMENT_RADIUS}
                    data-body=""
                    fill={look.fill}
                    stroke={line}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dash}
                  />
                ) : (
                  <circle
                    cx={element.x}
                    cy={element.y}
                    r={ELEMENT_RADIUS}
                    data-body=""
                    fill={look.fill}
                    stroke={line}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dash}
                  />
                )}
                <text
                  x={element.x}
                  y={element.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={look.ink}
                  fontFamily={MONO}
                  fontSize={14}
                  fontWeight={look.bold ? 700 : 400}
                  pointerEvents="none"
                >
                  {element.label}
                </text>
                {factor && assigned && (
                  <text
                    x={element.valueX}
                    y={element.y}
                    data-value-text=""
                    textAnchor="end"
                    dominantBaseline="central"
                    fill={pictureStateStyle(value ? "Solution" : "False").text}
                    fontFamily={MONO}
                    fontSize={12}
                    fontWeight={700}
                    pointerEvents="none"
                  >
                    {value ? "T" : "F"}
                  </text>
                )}
                {!factor && count > 1 && (
                  <Badge
                    x={element.x - element.half - 4}
                    y={element.y - ELEMENT_RADIUS + 4}
                    text={`×${count}`}
                    testId="hits"
                  />
                )}
              </g>
            );
          })}
        </g>
        <g data-layer="sets">
          {sets.map((set) => {
            const state = stateOf(frame?.nodes, set.id);
            const look = nodeLook(state);
            const faint = near !== null && !near.has(set.id);
            const isTraced = traced === set.id;
            const count = Number.isInteger(hits[set.id]) ? hits[set.id] : 0;
            const members = neighbourIds(set.id);
            const parts = [
              factor ? `Clause ${set.label}: ${set.text}` : `Set ${set.label} ${set.text}`,
            ];
            if (state !== "Background") parts.push(pictureStateStyle(state).legend);
            if (factor && count > 0) parts.push(`${plural(count, "true literal")}`);
            if (!factor && count > 0) parts.push(`hit by ${plural(count, "picked element")}`);
            if (!factor && members.length === 0) parts.push("empty");
            const top = set.y - set.half;
            const firstLine = set.y - ((set.lines.length - 1) * set.lineHeight) / 2;
            const line = isTraced ? TRACE_COLOR : look.line;
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={set.id}
                data-node-id={set.id}
                {...nodeDragProps(set.id)}
                data-side="right"
                data-state={state}
                data-hits={count || undefined}
                data-traced={near ? (faint ? "faint" : "trace") : undefined}
                data-focusable=""
                tabIndex={0}
                role="button"
                aria-pressed={pinned === set.id}
                aria-label={parts.join(", ")}
                style={faint ? { filter: FAINT_FILTER } : undefined}
                {...traceHandlers(set.id)}
              >
                <rect
                  x={set.x}
                  y={top}
                  width={set.width}
                  height={2 * set.half}
                  rx={8}
                  data-body=""
                  fill={look.fill}
                  stroke={line}
                  strokeWidth={isTraced ? 3 : look.strokeWidth}
                  strokeDasharray={isTraced ? undefined : look.dash}
                />
                <text
                  x={set.labelX}
                  y={firstLine}
                  dominantBaseline="central"
                  fill={look.ink}
                  fontFamily={MONO}
                  fontSize={13}
                  fontWeight={700}
                  pointerEvents="none"
                >
                  {set.label}
                </text>
                {set.lines.map((text, index) => (
                  <text
                    // biome-ignore lint/suspicious/noArrayIndexKey: the wrapped lines are a plain list.
                    key={index}
                    x={set.textX}
                    y={firstLine + index * set.lineHeight}
                    dominantBaseline="central"
                    fill={look.ink}
                    fontFamily={MONO}
                    fontSize={12}
                    pointerEvents="none"
                  >
                    {text}
                  </text>
                ))}
                {set.lines.length > 1 && <title>{`${set.label} ${set.text}`}</title>}
                {factor && count > 0 && (
                  <g data-hits-pill={count} pointerEvents="none">
                    <rect
                      x={set.hitsX}
                      y={set.y - 10}
                      width={50}
                      height={20}
                      rx={10}
                      fill={paletteVars.surface.input}
                      stroke={pictureStateStyle("Solution").line}
                      strokeWidth={1.4}
                    />
                    <text
                      x={set.hitsX + 25}
                      y={set.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={pictureStateStyle("Solution").text}
                      fontFamily={MONO}
                      fontSize={11}
                      fontWeight={700}
                    >
                      {`${count} true`}
                    </text>
                  </g>
                )}
                {!factor && count > 1 && (
                  <Badge x={set.x + set.width + 2} y={top + 2} text={`×${count}`} testId="hits" />
                )}
              </g>
            );
          })}
        </g>
      </DiagramZoom>
    </Box>
  );
}

/**
 * The Legend's entries for what a bipartite picture draws besides states: the ×N badge on a
 * node hit more than once; for the factor graph, the dashed ¬x edges, the T / F values and the
 * "n true" pills. Each only when the run (or, for the edges, the payload) has it.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function bipartiteAnnotations(payload, frames) {
  const entries = [];
  const list = Array.isArray(frames) ? frames.filter(Boolean) : [];
  const factor = payload?.pickSide === "assignment";
  const hitCounts = list.flatMap((frame) =>
    frame.hits && typeof frame.hits === "object" ? Object.values(frame.hits) : [],
  );
  if (factor) {
    if ((payload?.edges ?? []).some((edge) => edge?.positive === false)) {
      entries.push({
        key: "negated-edge",
        text: "Dashed edge (the clause has ¬x)",
        swatch: { kind: "line", color: edgeLook("Background").line, dash: NEGATED_DASH },
      });
    }
    if (
      list.some(
        (frame) =>
          frame.assignment &&
          typeof frame.assignment === "object" &&
          Object.keys(frame.assignment).length > 0,
      )
    ) {
      entries.push({
        key: "value",
        text: "T / F (the variable's value so far)",
        swatch: { kind: "text", text: "T" },
      });
    }
    if (hitCounts.some((count) => count > 0)) {
      entries.push({
        key: "true-count",
        text: "n true (how many of the clause's literals are true)",
        swatch: { kind: "text", text: "1" },
      });
    }
  } else if (hitCounts.some((count) => count > 1)) {
    const what = payload?.pickSide === "elements" ? "picked elements" : "picked sets";
    entries.push({
      key: "hits",
      text: `×N (hit by N ${what})`,
      swatch: { kind: "badge", text: "×2" },
    });
  }
  return entries;
}
