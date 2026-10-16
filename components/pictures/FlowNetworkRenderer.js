// components/pictures/FlowNetworkRenderer.js
//
// #206: the Flow Network picture type (ReduxISU/Redux#672), Redux's PICTURE-TYPES.md "Flow
// Network", used by Minimum S-T Cut. The source at the far left, the sink at the far right, every
// other node in the column of its hop distance from the source, and every edge with its flow and
// capacity ("3/10"), thicker as it fills.
//
// The steps are Edmonds-Karp's augmenting paths, one per frame: the path just used is
// highlighted, full edges are Covered, and a leg that runs backward over an edge (taking back
// flow sent earlier, `path[].forward` false) is drawn as a dashed arc from the edge's head back to
// its tail. The Residual arcs switch shows such a back arc on every edge that carries flow, so
// the reader can see where flow could still be sent back. The Done frame colors the two sides of
// the minimum cut (`groups`: 0 is the S side, 1 the T side), draws the cut edges (`cut`, from S
// to T) as the answer and the edges from T back to S Untraveled, and the summary under the
// diagram adds up the cut.
//
// The payload holds the network with Redux's own columns; each frame holds the states (`nodes`,
// `edges`: an id that is absent is Background), `flow` (every edge's units), `value` and `path`.
// Layout is flowLayout.js's pure function of the payload. Hovering, focusing or tapping a node
// traces its edges, everything not touching it faded by color. The diagram opens fitted to its
// box and zooms and pans with DiagramZoom.js.
//
// #250: the reader can move any node and bend any edge (diagramEdits.js); the source can't go
// right of any other node, nor the sink left of one, so the flow still reads left to right.

import Box from "@mui/material/Box";
import { useMemo, useState } from "react";
import { paletteVars } from "../theme";
import DiagramZoom from "./DiagramZoom";
import {
  EdgeHandles,
  editedPositions,
  makeEditor,
  nodeDragProps,
  offsetAlongNormal,
  useDiagramEdits,
} from "./diagramEdits";
import { FLOW_RADIUS, layoutFlow, shapeFlowEdges } from "./flowLayout";
import {
  edgeLook,
  FAINT_EDGE,
  FAINT_FILTER,
  groupColors,
  MONO,
  NodeLabel,
  nodeLook,
  PictureToggle,
  StatePill,
  TRACE_COLOR,
} from "./graphPieces";
import { pictureStateStyle, stateOf } from "./pictureStates";

/** A backward arc's dash. */
const BACK_DASH = "5 4";

const RESIDUAL = [
  { value: "off", label: "Flow" },
  { value: "on", label: "With residual arcs" },
];

/** What a cut side is called, for labels and the Legend. */
export function sideName(index) {
  return index === 0 ? "S side" : "T side";
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * How an edge looks: its state's color, and a width that grows with the share of its capacity it
 * carries (the mockup's 1.4 + 3 × flow / capacity), never thinner than its state's own.
 */
function flowEdgeLook(state, units, capacity) {
  const filled = capacity > 0 ? Math.min(1, Math.max(0, units / capacity)) : 0;
  const width = 1.4 + 3 * filled;
  if (state === "Background") {
    // An edge that carries something is drawn darker than an empty one.
    const line = units > 0 ? pictureStateStyle("Background").line : edgeLook("Background").line;
    return { line, width, dash: undefined };
  }
  const look = edgeLook(state);
  if (state === "Untraveled") return { ...look, width: 1.4 };
  if (state === "Solution") return { ...look, width: Math.max(4, width) };
  if (state === "Covered") return { ...look, width: Math.max(2.2, width) };
  return { ...look, width: Math.max(3.4, width) };
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Flow Network payload.
 * @param {Object} props.frame The frame to draw.
 * @param {number|null} props.frameIndex The step, or null before Run.
 * @param {string|null} [props.layoutKey] The instance and visualization drawn (#250).
 */
export default function FlowNetworkRenderer({
  idPrefix,
  name,
  payload,
  frame,
  frameIndex,
  layoutKey = null,
}) {
  const layout = useMemo(() => layoutFlow(payload), [payload]);
  const labels = useMemo(
    () => new Map(layout.nodes.map((node) => [node.id, node.label])),
    [layout],
  );
  const links = useMemo(() => {
    const map = new Map(layout.nodes.map((node) => [node.id, { out: [], in: [] }]));
    for (const edge of layout.edges) {
      map.get(edge.a).out.push(edge);
      map.get(edge.b).in.push(edge);
    }
    return map;
  }, [layout]);
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  const [residual, setResidual] = useState("off");
  // (A node from an earlier payload, after the instance changed, traces nothing.)
  const pointedAt = hover ?? pinned;
  const traced = pointedAt !== null && labels.has(pointedAt) ? pointedAt : null;
  const near = traced
    ? new Set([
        traced,
        ...links.get(traced).out.map((edge) => edge.b),
        ...links.get(traced).in.map((edge) => edge.a),
      ])
    : null;

  // The reader's moves, and the edges reshaped from where the nodes are now.
  const edits = useDiagramEdits([layoutKey ?? payload]);
  const pos = editedPositions(layout.positions, edits.nodes);
  const nodes = layout.nodes.map((node) => ({ ...node, ...pos.get(node.id) }));
  const edges = shapeFlowEdges(layout.graph, pos, edits.bends);
  const sourceId = layout.nodes.find((node) => node.role === "source")?.id ?? null;
  const sinkId = layout.nodes.find((node) => node.role === "sink")?.id ?? null;
  const editor = makeEditor({
    edits,
    nodeAt: (id) => pos.get(id) ?? null,
    // Free, except that the source stays leftmost and the sink rightmost.
    moveNode: (id, point) => {
      const others = nodes.filter((node) => node.id !== id).map((node) => node.x);
      let x = point.x;
      if (id === sourceId && others.length) x = Math.min(x, Math.min(...others));
      else if (id === sinkId && others.length) x = Math.max(x, Math.max(...others));
      else {
        if (sourceId !== null && pos.has(sourceId)) x = Math.max(x, pos.get(sourceId).x);
        if (sinkId !== null && pos.has(sinkId)) x = Math.min(x, pos.get(sinkId).x);
      }
      edits.setNode(id, { x, y: point.y });
    },
    dragEdge: (id, point) => {
      const spec = layout.graph.specs.find((candidate) => candidate.id === id);
      const a = pos.get(spec?.a);
      const b = pos.get(spec?.b);
      if (!a || !b) return;
      // The layout bows to the left of travel, the opposite of offsetAlongNormal's side.
      edits.setBend(id, -offsetAlongNormal(a, b, point) - spec.offset);
    },
  });

  const running = frameIndex !== null;
  const flow = running && frame?.flow && typeof frame.flow === "object" ? frame.flow : null;
  const unitsOf = (id) => (flow && Number.isFinite(flow[id]) ? flow[id] : 0);
  const done = running && frame?.event === "Done";
  const groups = frame?.groups && typeof frame.groups === "object" ? frame.groups : null;
  const cut = new Set(Array.isArray(frame?.cut) ? frame.cut : []);
  // The legs of this step's path that run backward over an edge, by edge id.
  const backLegs = new Map(
    (Array.isArray(frame?.path) ? frame.path : [])
      .filter((leg) => leg && leg.forward === false && typeof leg.edge === "string")
      .map((leg) => [leg.edge, leg.units]),
  );

  const edgeText = (edge) => {
    if (!flow) return edge.parts ?? String(edge.capacity);
    const text = `${unitsOf(edge.id)}/${edge.capacity}`;
    return edge.parts ? `${text} (${edge.parts})` : text;
  };

  const sourceLabel = labels.get(payload?.source) ?? payload?.source;
  const sinkLabel = labels.get(payload?.sink) ?? payload?.sink;
  const label = `${name}: a network of ${plural(layout.nodes.length, "node")} and ${plural(layout.edges.length, "edge")} from source ${sourceLabel} on the left to sink ${sinkLabel} on the right.`;

  // The summary under the diagram: the flow so far, and on the answer the cut and its capacity.
  let summary = null;
  if (running && flow) {
    const value = Number.isFinite(frame.value) ? frame.value : 0;
    summary = `Flow value: ${value}.`;
    if (done && groups) {
      const cutEdges = edges.filter((edge) => cut.has(edge.id));
      const capacity = cutEdges.reduce((sum, edge) => sum + edge.capacity, 0);
      const side = (index) =>
        layout.nodes
          .filter((node) => groups[node.id] === index)
          .map((node) => node.label)
          .join(", ");
      summary += ` S = {${side(0)}}, T = {${side(1)}}. Cut: ${
        cutEdges.length
          ? cutEdges.map((edge) => `${labels.get(edge.a)}→${labels.get(edge.b)}`).join(", ")
          : "no edges"
      }, capacity ${capacity}${capacity === value ? ", equal to the maximum flow" : ""}.`;
    }
  }

  const showResidual = residual === "on" && running && !done;
  const backArcs = traced
    ? []
    : edges.filter((edge) => backLegs.has(edge.id) || (showResidual && unitsOf(edge.id) > 0));

  return (
    <Box
      id={`${idPrefix}-graph`}
      data-flow-rule={payload?.rule ?? ""}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}
    >
      <DiagramZoom
        idPrefix={idPrefix}
        label={label}
        drawing={layout}
        resetOn={[payload]}
        editor={editor}
        toolbar={
          running ? (
            <PictureToggle
              id={`${idPrefix}-residual`}
              label="Show"
              options={RESIDUAL}
              value={residual}
              onChange={setResidual}
            />
          ) : null
        }
      >
        <g data-layer="edges">
          {edges.map((edge) => {
            const state = stateOf(frame?.edges, edge.id);
            const touches = edge.a === traced || edge.b === traced;
            const faint = traced !== null && !touches;
            let look = flowEdgeLook(state, unitsOf(edge.id), edge.capacity);
            if (traced !== null) {
              look = faint ? { ...FAINT_EDGE } : { ...look, line: TRACE_COLOR };
            }
            return (
              <g
                key={edge.id}
                data-edge-id={edge.id}
                data-state={state}
                data-flow={flow ? unitsOf(edge.id) : undefined}
                data-cut={cut.has(edge.id) ? "true" : undefined}
                data-traced={traced ? (faint ? "faint" : "trace") : undefined}
              >
                <path
                  d={edge.path}
                  fill="none"
                  stroke={look.line}
                  strokeWidth={look.width}
                  strokeDasharray={look.dash}
                  strokeLinecap="round"
                />
                <polygon points={edge.arrow} fill={look.line} />
              </g>
            );
          })}
        </g>
        <EdgeHandles edges={edges.map((edge) => ({ id: edge.id, d: edge.path }))} />
        <g data-layer="back-arcs">
          {backArcs.map((edge) => {
            const used = backLegs.has(edge.id);
            const color = used
              ? pictureStateStyle("ElementHighlight").line
              : paletteVars.text.secondary;
            return (
              <g
                key={edge.id}
                data-back-arc={edge.id}
                data-used={used ? "true" : undefined}
                pointerEvents="none"
              >
                <path
                  d={edge.back.path}
                  fill="none"
                  stroke={color}
                  strokeWidth={used ? 3 : 1.4}
                  strokeDasharray={BACK_DASH}
                />
                <polygon points={edge.back.arrow} fill={color} />
                <StatePill
                  x={edge.back.label.x}
                  y={edge.back.label.y}
                  text={`↶${used ? backLegs.get(edge.id) : unitsOf(edge.id)}`}
                  state={used ? "ElementHighlight" : "Background"}
                  testId="back-label"
                  charWidth={7.2}
                  size={11.5}
                />
              </g>
            );
          })}
        </g>
        <g data-layer="labels">
          {edges.map((edge) => (
            <StatePill
              key={edge.id}
              forId={edge.id}
              dragId={edge.id}
              x={edge.label.x}
              y={edge.label.y}
              text={edgeText(edge)}
              state={stateOf(frame?.edges, edge.id)}
              faint={traced !== null && edge.a !== traced && edge.b !== traced}
              traced={traced !== null && (edge.a === traced || edge.b === traced)}
              testId="flow-label"
              charWidth={7.2}
              size={11.5}
            />
          ))}
        </g>
        <g data-layer="nodes">
          {nodes.map((node) => {
            const state = stateOf(frame?.nodes, node.id);
            const group = Number.isInteger(groups?.[node.id]) ? groups[node.id] : undefined;
            const look = nodeLook(state, group);
            const faint = near !== null && !near.has(node.id);
            const isTraced = traced === node.id;
            const { out, in: into } = links.get(node.id);
            const R = FLOW_RADIUS;
            const pill = node.width > 2 * R;
            const line = isTraced ? TRACE_COLOR : look.line;
            let strokeWidth = look.strokeWidth;
            if (node.role && state === "Background" && group === undefined) strokeWidth = 2.6;
            if (isTraced) strokeWidth = 3;

            const parts = [`Node ${node.label}`];
            if (node.role) parts.push(node.role);
            if (group !== undefined) parts.push(sideName(group));
            if (state !== "Background") parts.push(pictureStateStyle(state).legend);
            const edgeWords = (edge, other) =>
              `${labels.get(other)} (${flow ? `${unitsOf(edge.id)} of ${edge.capacity}` : `capacity ${edge.capacity}`})`;
            parts.push(
              out.length
                ? `edges to ${out.map((edge) => edgeWords(edge, edge.b)).join(", ")}`
                : "no edges out",
            );
            if (into.length) {
              parts.push(`from ${into.map((edge) => edgeWords(edge, edge.a)).join(", ")}`);
            }

            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={node.id}
                data-node-id={node.id}
                {...nodeDragProps(node.id)}
                data-state={state}
                data-group={group}
                data-role={node.role ?? undefined}
                data-traced={near ? (faint ? "faint" : "trace") : undefined}
                data-focusable=""
                tabIndex={0}
                role="button"
                aria-pressed={pinned === node.id}
                aria-label={parts.join(", ")}
                style={faint ? { filter: FAINT_FILTER } : undefined}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") setHover(node.id);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") setHover(null);
                }}
                onFocus={() => setHover(node.id)}
                onBlur={() => setHover(null)}
                onClick={() => setPinned((current) => (current === node.id ? null : node.id))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setPinned((current) => (current === node.id ? null : node.id));
                  }
                }}
              >
                {pill ? (
                  <rect
                    x={node.x - node.width / 2}
                    y={node.y - R}
                    width={node.width}
                    height={2 * R}
                    rx={R}
                    data-body=""
                    fill={look.fill}
                    stroke={line}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isTraced ? undefined : look.dash}
                  />
                ) : (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={R}
                    data-body=""
                    fill={look.fill}
                    stroke={line}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isTraced ? undefined : look.dash}
                  />
                )}
                <NodeLabel
                  x={node.x}
                  y={node.y}
                  text={node.label}
                  color={look.ink}
                  bold={look.bold}
                  size={14}
                />
                {node.role && (
                  <text
                    x={node.x}
                    y={node.y + R + 14}
                    data-tag={node.role}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={paletteVars.text.secondary}
                    fontFamily={MONO}
                    fontSize={11}
                    pointerEvents="none"
                  >
                    {node.role}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </DiagramZoom>
      {summary && (
        <Box
          id={`${idPrefix}-summary`}
          data-value={frame.value}
          sx={{ fontSize: "0.875rem", color: "text.primary", fontFamily: MONO }}
        >
          {summary}
        </Box>
      )}
    </Box>
  );
}

/**
 * The Legend's entries for what a Flow Network draws besides states: flow / capacity labels and
 * widths, arrows, the source and sink, and (only when the run has them) backward arcs and the
 * two sides of the cut.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function flowAnnotations(payload, frames) {
  const entries = [];
  const list = Array.isArray(frames) ? frames.filter(Boolean) : [];
  const running = list.some((frame) => frame.flow && typeof frame.flow === "object");
  entries.push({
    key: "flow-label",
    text: running
      ? "f/c (the flow an edge carries / its capacity; thicker as it fills)"
      : "c (an edge's capacity)",
    swatch: { kind: "text", text: running ? "f/c" : "c" },
  });
  entries.push({
    key: "ends",
    text: "source, sink (where the flow starts and ends)",
    swatch: { kind: "text", text: "s" },
  });
  if (
    list.some(
      (frame) => Array.isArray(frame.path) && frame.path.some((leg) => leg?.forward === false),
    )
  ) {
    entries.push({
      key: "back-arc",
      text: "Dashed back arc (the path takes back flow sent earlier)",
      swatch: { kind: "line", color: pictureStateStyle("ElementHighlight").line, dash: BACK_DASH },
    });
  }
  const used = new Set();
  for (const frame of list) {
    if (frame.groups && typeof frame.groups === "object") {
      for (const value of Object.values(frame.groups)) {
        if (value === 0 || value === 1) used.add(value);
      }
    }
  }
  for (const index of [...used].sort((a, b) => a - b)) {
    const colors = groupColors(index);
    entries.push({
      key: `side-${index}`,
      text: index === 0 ? "S side (the source can still send flow here)" : "T side",
      swatch: { kind: "fill", fill: colors.fill, line: colors.line },
    });
  }
  entries.push({ key: "arrow", text: "Arrow (the edge's direction)", swatch: { kind: "arrow" } });
  return entries;
}
