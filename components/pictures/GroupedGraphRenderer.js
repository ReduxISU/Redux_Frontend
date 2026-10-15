// components/pictures/GroupedGraphRenderer.js
//
// #202: the Grouped Graph picture type (ReduxISU/Redux#664), the clause graph of SAT and 3SAT
// (Redux's PICTURE-TYPES.md, "Grouped Graph"). One node per literal occurrence, grouped into one
// cluster per clause, the clusters on a ring; edges join a literal to its complement in another
// clause, so a satisfying assignment shows as one true literal in every cluster. Under the ring,
// one chip per variable says what it is assigned so far.
//
// The payload holds the clauses (`groups`, with their members), the literals (`nodes`, each
// naming its variable and clause), the variables, the complement edges (`edges`) and the edges
// inside each clause (`clauseEdges`, shown with the Edges switch: with them the picture is the
// 3SAT to Independent Set graph). Each frame holds the literal states (`nodes`), the clause
// states (`groups`), the assignment so far, and the focus (the variable being tried).
//
// Hovering, focusing or tapping a literal or a variable chip traces that variable everywhere it
// appears. The node and edge looks are the Graph renderer's (graphPieces.js), and the diagram
// opens fitted to its box and zooms and pans with DiagramZoom.js, as the Graph's does.

import Box from "@mui/material/Box";
import { useMemo, useState } from "react";
import { LITERAL_RADIUS, layoutClauseGraph } from "./clauseGraphLayout";
import DiagramZoom from "./DiagramZoom";
import {
  edgeLook,
  FAINT_EDGE,
  FAINT_FILTER,
  MONO,
  NodeLabel,
  nodeLook,
  PictureToggle,
  TRACE_COLOR,
} from "./graphPieces";
import { pictureStateStyle, stateOf } from "./pictureStates";

/** A literal's (and a variable chip's) label size, in viewBox units. */
const LABEL_SIZE = 12.5;

const EDGE_CHOICES = [
  { value: "complements", label: "Complement pairs" },
  { value: "all", label: "Add clause edges" },
];

/** A clause hull's look in a state: the state's tint and line, or the plain canvas outline. */
function hullLook(state) {
  if (state === "Background") {
    const style = pictureStateStyle("Background");
    return { fill: "none", line: style.line, width: 1.5, dash: undefined, text: style.text };
  }
  // A clause has no "answer" fill of its own: Solution reads as Covered (it is met).
  const style = pictureStateStyle(state === "Solution" ? "Covered" : state);
  return {
    fill: style.fill,
    line: style.line,
    width: state === "Covered" || state === "Solution" ? 2 : 2.5,
    dash: style.dash,
    text: style.text,
  };
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Grouped Graph payload.
 * @param {Object} props.frame The frame to draw.
 */
export default function GroupedGraphRenderer({ idPrefix, name, payload, frame }) {
  const layout = useMemo(() => layoutClauseGraph(payload), [payload]);
  const literals = useMemo(
    () =>
      (Array.isArray(payload?.nodes) ? payload.nodes : []).filter(
        (node) => typeof node?.id === "string",
      ),
    [payload],
  );
  const literalById = useMemo(() => new Map(literals.map((node) => [node.id, node])), [literals]);
  const [edgeChoice, setEdgeChoice] = useState("complements");
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  // (A variable from an earlier payload, after the formula changed, traces nothing.)
  const pointedAt = hover ?? pinned;
  const traced = layout.variables.some((variable) => variable.id === pointedAt) ? pointedAt : null;

  const focus = new Set(Array.isArray(frame?.focus) ? frame.focus : []);
  const assignment =
    frame?.assignment && typeof frame.assignment === "object" ? frame.assignment : {};
  const groupLabels = new Map(layout.groups.map((group) => [group.id, group.label]));
  const variableLabels = new Map(layout.variables.map((variable) => [variable.id, variable.label]));
  const pos = layout.positions;

  const edgeSets = [
    { kind: "complement", edges: Array.isArray(payload?.edges) ? payload.edges : [] },
    ...(edgeChoice === "all"
      ? [{ kind: "clause", edges: Array.isArray(payload?.clauseEdges) ? payload.clauseEdges : [] }]
      : []),
  ];

  const tracePress = (variable) => setPinned((current) => (current === variable ? null : variable));
  const traceHandlers = (variable) => ({
    onPointerEnter: (event) => {
      if (event.pointerType === "mouse") setHover(variable);
    },
    onPointerLeave: (event) => {
      if (event.pointerType === "mouse") setHover(null);
    },
    onFocus: () => setHover(variable),
    onBlur: () => setHover(null),
    onClick: () => tracePress(variable),
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        tracePress(variable);
      }
    },
  });

  const label = `${name}: a clause graph of ${layout.groups.length} clause${layout.groups.length === 1 ? "" : "s"} and ${layout.variables.length} variable${layout.variables.length === 1 ? "" : "s"}.`;

  return (
    <Box
      id={`${idPrefix}-graph`}
      data-graph-shape={payload?.shape ?? ""}
      data-edges={edgeChoice}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <DiagramZoom
        idPrefix={idPrefix}
        label={label}
        drawing={layout}
        resetOn={[payload]}
        toolbar={
          <PictureToggle
            id={`${idPrefix}-edges`}
            label="Edges"
            options={EDGE_CHOICES}
            value={edgeChoice}
            onChange={setEdgeChoice}
          />
        }
      >
        <g data-layer="clauses">
          {layout.groups.map((group, index) => {
            const state = stateOf(frame?.groups, group.id);
            const look = hullLook(state);
            const labelDistance = group.hull + 16;
            return (
              <g
                key={group.id}
                id={`${idPrefix}-clause-${index}`}
                data-clause-id={group.id}
                data-state={state}
              >
                <circle
                  cx={group.x}
                  cy={group.y}
                  r={group.hull}
                  fill={look.fill}
                  stroke={look.line}
                  strokeWidth={look.width}
                  strokeDasharray={look.dash}
                />
                <text
                  x={group.x + labelDistance * Math.cos(group.angle)}
                  y={group.y + labelDistance * Math.sin(group.angle)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={look.text}
                  fontFamily={MONO}
                  fontSize={13}
                  fontWeight={state === "Background" ? 500 : 700}
                >
                  {group.label}
                </text>
              </g>
            );
          })}
        </g>
        <g data-layer="edges">
          {edgeSets.map(({ kind, edges }) =>
            edges.map((edge) => {
              const a = pos.get(edge?.a);
              const b = pos.get(edge?.b);
              if (!a || !b) return null;
              const variable = literalById.get(edge.a)?.variable;
              const faint = traced !== null && variable !== traced;
              let line = edgeLook("Background").line;
              let width = 1.3;
              let dash = kind === "clause" ? "3 3" : undefined;
              if (traced !== null) {
                if (faint) {
                  line = FAINT_EDGE.line;
                  dash = FAINT_EDGE.dash;
                } else {
                  line = TRACE_COLOR;
                  width = 2.4;
                }
              }
              let d;
              if (kind === "complement") {
                // Bowed halfway towards the ring's centre, as the design draws them.
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2;
                const qx = mx + (layout.cx - mx) * 0.5;
                const qy = my + (layout.cy - my) * 0.5;
                d = `M${a.x},${a.y} Q${qx},${qy} ${b.x},${b.y}`;
              } else {
                d = `M${a.x},${a.y} L${b.x},${b.y}`;
              }
              return (
                <path
                  key={`${kind}-${edge.id}`}
                  data-edge-id={edge.id}
                  data-edge-kind={kind}
                  data-traced={traced ? (faint ? "faint" : "trace") : undefined}
                  d={d}
                  fill="none"
                  stroke={line}
                  strokeWidth={width}
                  strokeDasharray={dash}
                />
              );
            }),
          )}
        </g>
        <g data-layer="literals">
          {literals.map((literal, index) => {
            const p = pos.get(literal.id);
            if (!p) return null;
            const state = stateOf(frame?.nodes, literal.id);
            const look = nodeLook(state);
            const tried = focus.has(literal.variable);
            const faint = traced !== null && literal.variable !== traced;
            const isTraced = traced !== null && literal.variable === traced;
            const clause = groupLabels.get(literal.group) ?? literal.group;
            const parts = [`Literal ${literal.label} in ${clause}`];
            if (state !== "Background") parts.push(pictureStateStyle(state).legend);
            if (tried) parts.push("its variable is being tried");
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={literal.id}
                id={`${idPrefix}-literal-${index}`}
                data-node-id={literal.id}
                data-variable={literal.variable}
                data-state={state}
                data-tried={tried ? "true" : undefined}
                data-traced={traced ? (faint ? "faint" : "trace") : undefined}
                data-focusable=""
                tabIndex={0}
                role="button"
                aria-pressed={pinned === literal.variable}
                aria-label={parts.join(", ")}
                style={faint ? { filter: FAINT_FILTER } : undefined}
                {...traceHandlers(literal.variable)}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={LITERAL_RADIUS}
                  fill={look.fill}
                  stroke={look.line}
                  strokeWidth={look.strokeWidth}
                  strokeDasharray={look.dash}
                />
                {(tried || isTraced) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={LITERAL_RADIUS + 4.5}
                    fill="none"
                    stroke={isTraced ? TRACE_COLOR : pictureStateStyle("ElementHighlight").line}
                    strokeWidth={2.4}
                    pointerEvents="none"
                  />
                )}
                <NodeLabel
                  x={p.x}
                  y={p.y}
                  text={literal.label}
                  color={look.ink}
                  bold={look.bold}
                  size={LABEL_SIZE}
                />
              </g>
            );
          })}
        </g>
        <g data-layer="variables">
          {layout.variables.map((variable, index) => {
            const value = assignment[variable.id];
            const assigned = typeof value === "boolean";
            const tried = focus.has(variable.id);
            const faint = traced !== null && traced !== variable.id;
            const isTraced = traced === variable.id;
            const falseStyle = pictureStateStyle("False");
            const plain = pictureStateStyle("Background");
            const fill = assigned && !value ? falseStyle.fill : "none";
            const ink = assigned && !value ? falseStyle.ink : plain.text;
            let line = assigned && !value ? falseStyle.line : plain.line;
            let width = assigned && value ? 2.4 : 1.4;
            if (tried) {
              line = pictureStateStyle("ElementHighlight").line;
              width = 3;
            }
            if (isTraced) {
              line = TRACE_COLOR;
              width = 3;
            }
            const valueText = assigned ? (value ? "T" : "F") : "-";
            const spoken = assigned ? (value ? "true" : "false") : "not assigned yet";
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={variable.id}
                id={`${idPrefix}-variable-${index}`}
                data-variable-id={variable.id}
                data-value={assigned ? String(value) : "unassigned"}
                data-tried={tried ? "true" : undefined}
                data-focusable=""
                tabIndex={0}
                role="button"
                aria-pressed={pinned === variable.id}
                aria-label={`Variable ${variableLabels.get(variable.id)}: ${spoken}${tried ? ", being tried" : ""}`}
                style={faint ? { filter: FAINT_FILTER } : undefined}
                {...traceHandlers(variable.id)}
              >
                <rect
                  x={variable.x}
                  y={variable.y}
                  width={variable.width}
                  height={variable.height}
                  rx={7}
                  fill={fill}
                  stroke={line}
                  strokeWidth={width}
                />
                <NodeLabel
                  x={variable.x + variable.width / 2}
                  y={variable.y + variable.height / 2}
                  text={`${variable.label} ${valueText}`}
                  color={ink}
                  bold={assigned && value}
                  size={LABEL_SIZE}
                />
              </g>
            );
          })}
        </g>
      </DiagramZoom>
    </Box>
  );
}

/**
 * The Legend's entries for what a clause graph draws besides states: complement edges, and the
 * ring on the variable a step tries.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function groupedGraphAnnotations(payload, frames) {
  const entries = [];
  if (Array.isArray(payload?.edges) && payload.edges.length > 0) {
    entries.push({
      key: "complement-edge",
      text: "Complement edge (x and ¬x in different clauses)",
      swatch: { kind: "line", color: edgeLook("Background").line },
    });
  }
  const variables = new Set((payload?.variables ?? []).map((variable) => variable?.id));
  const tries = (frames ?? []).some(
    (frame) => Array.isArray(frame?.focus) && frame.focus.some((id) => variables.has(id)),
  );
  if (tries) {
    entries.push({
      key: "tried-variable",
      text: "Ring (the variable being tried)",
      swatch: { kind: "ring", color: pictureStateStyle("ElementHighlight").line },
    });
  }
  return entries;
}
