// components/pictures/LayeredGraphRenderer.js
//
// #205: the Layered Graph picture type (ReduxISU/Redux#667), Redux's PICTURE-TYPES.md "Layered
// Graph". A directed graph drawn left to right in ranks, so most edges point forward; an edge
// that points backward closes a cycle and runs as a curve under the rows. One renderer for the
// four shapes Redux sends:
//   - order (Topological Sort): order badges on the placed nodes;
//   - removedSet (Feedback Arc Set, Feedback Node Set): what the answer removes; a removed edge
//     is drawn dashed, a removed node's edges Untraveled, a cycle that survives Rejected;
//   - groups (Strongly Connected Components): each component in its group color, and the first
//     pass's finish numbers (#1, #2, ...) over the nodes;
//   - distances (Single Source / Single Pair Shortest Path): each node's best known distance
//     under it (∞ until reached), the source and target named over theirs.
//
// The payload holds the graph with Redux's own ranking (each node's `layer` and `row`, and each
// edge's `back`), the weights, and the source and target; each frame holds the states (`nodes`,
// `edges`: an id that is absent is Background) and its shape's annotations (`order`; `groups`
// and `finish`; `dist` and `pred`).
//
// Layout is layeredLayout.js's pure function of the payload. Hovering, focusing or tapping a
// node traces it: its edges in the trace color, everything not touching it faded by color. The
// diagram opens fitted to its box and zooms and pans with DiagramZoom.js.
//
// #250: the reader can move a node up and down within its layer (its layer's x stays, so the
// left-to-right order holds), bend any edge (a back edge runs deeper or shallower under the
// rows) and turn a loop around its node (diagramEdits.js).
//
// #239: a gadget's pieces (`highlightIds`, `gadgetColors`; gadgetRings.js) are marked: a node
// gets a ring outside its body, and an edge (a loop too) a band under its line.

import Box from "@mui/material/Box";
import { useMemo, useState } from "react";
import { paletteVars } from "../theme";
import DiagramZoom from "./DiagramZoom";
import {
  angleTowards,
  EdgeHandles,
  editedPositions,
  makeEditor,
  nodeDragProps,
  offsetAlongNormal,
  useDiagramEdits,
} from "./diagramEdits";
import { GadgetUnderlay, useGadgetMarks } from "./gadgetRings";
import { NODE_RADIUS } from "./graphLayout";
import {
  Badge,
  edgeLook,
  FAINT_EDGE,
  FAINT_FILTER,
  GadgetNodeRing,
  groupColors,
  MONO,
  NodeBody,
  NodeLabel,
  nodeLook,
  ordinal,
  TRACE_COLOR,
  WeightTag,
} from "./graphPieces";
import { layoutLayered, shapeLayeredEdges } from "./layeredLayout";
import { pictureStateStyle, stateOf } from "./pictureStates";

/** The states in which a Feedback Arc Set edge is one the candidate removes. */
const REMOVED_STATES = new Set(["ElementHighlight", "Committed", "Solution"]);

/** A removed edge's dash (Feedback Arc Set). */
const REMOVED_DASH = "6 5";

/** How an edge looks in a state here: Untraveled and Covered edges stay thin. */
function layeredEdgeLook(state) {
  const look = edgeLook(state);
  if (state === "Untraveled") return { ...look, width: 1.6 };
  if (state === "Covered") return { ...look, width: 2 };
  return look;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Layered Graph payload.
 * @param {Object} props.frame The frame to draw.
 * @param {string|null} [props.layoutKey] The instance and visualization drawn (#250).
 * @param {string[]} [props.highlightIds] Gadget piece ids to mark (#239).
 * @param {Object<string, string>} [props.gadgetColors] Color mode's marks, by piece id (#239).
 */
export default function LayeredGraphRenderer({
  idPrefix,
  name,
  payload,
  frame,
  layoutKey = null,
  highlightIds,
  gadgetColors,
}) {
  const gadgetOf = useGadgetMarks(highlightIds, gadgetColors);
  const layout = useMemo(() => layoutLayered(payload), [payload]);
  const labels = useMemo(
    () => new Map(layout.nodes.map((node) => [node.id, node.label])),
    [layout],
  );
  const links = useMemo(() => {
    const map = new Map(layout.nodes.map((node) => [node.id, { out: [], in: [] }]));
    for (const edge of layout.edges) {
      map.get(edge.a).out.push(edge.b);
      map.get(edge.b).in.push(edge.a);
    }
    return map;
  }, [layout]);
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  // (A node from an earlier payload, after the instance changed, traces nothing.)
  const pointedAt = hover ?? pinned;
  const traced = pointedAt !== null && labels.has(pointedAt) ? pointedAt : null;
  const near = traced ? new Set([traced, ...links.get(traced).out, ...links.get(traced).in]) : null;

  const shape = payload?.shape ?? "";
  const arcSet = payload?.rule === "feedbackArcSet";
  const orderOf = new Map(
    (Array.isArray(frame?.order) ? frame.order : []).map((id, index) => [id, index + 1]),
  );
  const finishOf = new Map(
    (Array.isArray(frame?.finish) ? frame.finish : []).map((id, index) => [id, index + 1]),
  );
  const groups = frame?.groups && typeof frame.groups === "object" ? frame.groups : null;
  const dist = frame?.dist && typeof frame.dist === "object" ? frame.dist : null;
  const fixedTags = new Map();
  if (typeof payload?.source === "string") fixedTags.set(payload.source, "source");
  if (typeof payload?.target === "string") fixedTags.set(payload.target, "target");

  // The reader's moves: a node keeps its layer's x; the edges are reshaped from where it is.
  const edits = useDiagramEdits([layoutKey ?? payload]);
  const pos = editedPositions(layout.positions, edits.nodes);
  const nodes = layout.nodes.map((node) => ({ ...node, y: pos.get(node.id).y }));
  const edges = shapeLayeredEdges(layout.graph, pos, edits.bends, edits.loops);
  const editor = makeEditor({
    edits,
    nodeAt: (id) => pos.get(id) ?? null,
    moveNode: (id, point) => {
      const base = layout.positions.get(id);
      if (base) edits.setNode(id, { x: base.x, y: point.y });
    },
    dragEdge: (id, point) => {
      const spec = layout.graph.specs.find((candidate) => candidate.id === id);
      const a = pos.get(spec?.a);
      const b = pos.get(spec?.b);
      if (!a || !b) return;
      if (spec.loop) {
        edits.setLoop(id, angleTowards(a, point));
      } else if (spec.back) {
        // Run under the rows so the curve's middle (where its weight sits) is at the pointer.
        const ends = a.y + b.y + 2 * NODE_RADIUS + 1;
        edits.setBend(id, (8 * point.y - ends) / 6 - spec.under);
      } else {
        // The layout bows to the right of travel, the opposite of offsetAlongNormal's side.
        edits.setBend(id, -offsetAlongNormal(a, b, point) - spec.offset);
      }
    },
  });

  const touches = (edge) => edge.a === traced || edge.b === traced;
  const label = `${name}: a ${layout.directed ? "directed " : ""}graph of ${plural(layout.nodes.length, "node")} and ${plural(layout.edges.length, "edge")} in ${plural(layout.layerCount, "layer")}, left to right.`;

  return (
    <Box
      id={`${idPrefix}-graph`}
      data-graph-shape={shape}
      data-graph-rule={payload?.rule ?? ""}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <DiagramZoom
        idPrefix={idPrefix}
        label={label}
        drawing={layout}
        resetOn={[payload]}
        editor={editor}
      >
        <g data-layer="edges">
          {edges.map((edge) => {
            const state = stateOf(frame?.edges, edge.id);
            const faint = traced !== null && !touches(edge);
            const removed = arcSet && REMOVED_STATES.has(state);
            let look = layeredEdgeLook(state);
            if (removed) look = { ...look, width: 2.6, dash: REMOVED_DASH };
            if (traced !== null) {
              look = faint ? FAINT_EDGE : { ...look, line: TRACE_COLOR, width: 2.6 };
            }
            return (
              <g
                key={edge.id}
                data-edge-id={edge.id}
                data-state={state}
                data-back={edge.back ? "true" : undefined}
                data-removed={removed ? "true" : undefined}
                data-traced={traced ? (faint ? "faint" : "trace") : undefined}
              >
                <GadgetUnderlay
                  id={edge.id}
                  color={gadgetOf(edge.id)}
                  d={edge.path}
                  width={look.width}
                />
                <path
                  d={edge.path}
                  fill="none"
                  stroke={look.line}
                  strokeWidth={look.width}
                  strokeDasharray={look.dash}
                  strokeLinecap="round"
                />
                {edge.arrow && <polygon points={edge.arrow} fill={look.line} />}
              </g>
            );
          })}
        </g>
        <EdgeHandles edges={edges.map((edge) => ({ id: edge.id, d: edge.path }))} />
        <g data-layer="weights">
          {edges.map((edge) =>
            edge.tag === null ? null : (
              <WeightTag
                key={edge.id}
                dragId={edge.id}
                x={edge.label.x}
                y={edge.label.y}
                text={edge.tag}
                state={stateOf(frame?.edges, edge.id)}
                faint={traced !== null && !touches(edge)}
              />
            ),
          )}
        </g>
        <g data-layer="nodes">
          {nodes.map((node) => {
            const state = stateOf(frame?.nodes, node.id);
            const group = Number.isInteger(groups?.[node.id]) ? groups[node.id] : undefined;
            const look = nodeLook(state, group);
            const faint = near !== null && !near.has(node.id);
            const isTraced = traced === node.id;
            const position = orderOf.get(node.id);
            const finish = finishOf.get(node.id);
            const fixed = fixedTags.get(node.id);
            const tag = finish !== undefined ? `#${finish}` : fixed;
            const hasDistance = dist !== null && Object.hasOwn(dist, node.id);
            const distance = hasDistance ? dist[node.id] : undefined;
            const reached = typeof distance === "number";

            const parts = [`Node ${node.label}`];
            if (fixed) parts.push(fixed);
            if (state !== "Background") parts.push(pictureStateStyle(state).legend);
            if (group !== undefined) parts.push(`component ${group + 1}`);
            if (position !== undefined) parts.push(`placed ${ordinal(position)}`);
            if (finish !== undefined) parts.push(`finished ${ordinal(finish)}`);
            if (hasDistance) parts.push(reached ? `distance ${distance}` : "not reached yet");
            const { out, in: into } = links.get(node.id);
            parts.push(
              out.length
                ? `edges to ${out.map((id) => labels.get(id)).join(", ")}`
                : "no edges out",
            );
            if (into.length) parts.push(`from ${into.map((id) => labels.get(id)).join(", ")}`);

            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={node.id}
                data-node-id={node.id}
                {...nodeDragProps(node.id)}
                data-state={state}
                data-group={group}
                data-order={position}
                data-finish={finish}
                data-dist={hasDistance ? (reached ? distance : "∞") : undefined}
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
                <NodeBody
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  look={
                    isTraced
                      ? { ...look, line: TRACE_COLOR, strokeWidth: 3, dash: undefined }
                      : look
                  }
                />
                <GadgetNodeRing
                  id={node.id}
                  color={gadgetOf(node.id)}
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  gap={4}
                />
                <NodeLabel
                  x={node.x}
                  y={node.y}
                  text={node.label}
                  color={look.ink}
                  bold={look.bold}
                />
                {tag && (
                  <text
                    x={node.x}
                    y={node.y - NODE_RADIUS - 9}
                    data-tag={finish !== undefined ? "finish" : fixed}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={paletteVars.text.secondary}
                    fontFamily={MONO}
                    fontSize={10.5}
                    fontWeight={700}
                    pointerEvents="none"
                  >
                    {tag}
                  </text>
                )}
                {hasDistance && (
                  <text
                    x={node.x}
                    y={node.y + NODE_RADIUS + 13}
                    data-distance=""
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={reached ? paletteVars.text.primary : paletteVars.text.secondary}
                    fontFamily={MONO}
                    fontSize={11.5}
                    fontWeight={reached ? 700 : 400}
                    pointerEvents="none"
                  >
                    {reached ? `d = ${distance}` : "∞"}
                  </text>
                )}
                {position !== undefined && (
                  <Badge
                    x={node.x + node.width / 2 - 2}
                    y={node.y - NODE_RADIUS + 2}
                    text={position}
                    testId="order"
                  />
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
 * The Legend's entries for what a Layered Graph draws besides states: back edges and arrows
 * (from the graph), and order badges, component colors, finish numbers, distances and removed
 * edges (each only when the run has them).
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function layeredAnnotations(payload, frames) {
  const entries = [];
  const list = Array.isArray(frames) ? frames.filter(Boolean) : [];
  if (payload?.rule === "feedbackArcSet") {
    const removes = list.some(
      (frame) =>
        frame.edges &&
        typeof frame.edges === "object" &&
        Object.values(frame.edges).some((entry) => REMOVED_STATES.has(entry?.state)),
    );
    if (removes) {
      entries.push({
        key: "removed-edge",
        text: "Dashed edge (removed by the candidate)",
        swatch: { kind: "line", color: pictureStateStyle("Solution").line, dash: REMOVED_DASH },
      });
    }
  }
  if (list.some((frame) => Array.isArray(frame.order) && frame.order.length > 0)) {
    entries.push({
      key: "order",
      text: "Order (position in the order)",
      swatch: { kind: "badge" },
    });
  }
  const used = new Set();
  for (const frame of list) {
    if (frame.groups && typeof frame.groups === "object") {
      for (const value of Object.values(frame.groups)) {
        if (Number.isInteger(value)) used.add(value);
      }
    }
  }
  for (const index of [...used].sort((a, b) => a - b)) {
    const colors = groupColors(index);
    entries.push({
      key: `group-${index}`,
      text: `Component ${index + 1}`,
      swatch: { kind: "fill", fill: colors.fill, line: colors.line },
    });
  }
  if (list.some((frame) => Array.isArray(frame.finish) && frame.finish.length > 0)) {
    entries.push({
      key: "finish",
      text: "#n (finish order in the first pass)",
      swatch: { kind: "text", text: "#1" },
    });
  }
  if (list.some((frame) => frame.dist && typeof frame.dist === "object")) {
    entries.push({
      key: "distance",
      text: "d = n (best distance known so far; ∞ not reached yet)",
      swatch: { kind: "text", text: "d" },
    });
  }
  if ((payload?.edges ?? []).some((edge) => edge?.back === true)) {
    entries.push({
      key: "back-edge",
      text: "Back edge (points backward, closing a cycle; drawn under the rows)",
      swatch: { kind: "line", color: edgeLook("Background").line },
    });
  }
  if (payload?.directed !== false) {
    entries.push({ key: "arrow", text: "Arrow (the edge's direction)", swatch: { kind: "arrow" } });
  }
  return entries;
}
