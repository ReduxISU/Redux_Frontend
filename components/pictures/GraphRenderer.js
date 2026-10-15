// components/pictures/GraphRenderer.js
//
// #201: the Graph picture type (ReduxISU/Redux#663). One renderer for every plain graph
// problem, in the five shapes Redux sends (Redux's PICTURE-TYPES.md, "Graph"):
//   - subset (Clique, Vertex Cover, Minimum Vertex Cover, Independent Set, Dominating Set):
//     chosen nodes, covered or rejected edges, and a Clique's missing edges as phantoms;
//   - edges (Minimum Spanning Tree, Steiner Tree): chosen edges, Steiner terminals with a double
//     outline;
//   - cut (Cut, Weighted Cut, Max Cut, Minimum Cut): the two sides as group colors, crossing
//     edges kept;
//   - groups (Graph Coloring, Clique Cover): nodes take their group's color (never green), a
//     Clique Cover's missing edges as phantoms;
//   - tour (Hamiltonian Cycle, Directed Hamiltonian Cycle, Traveling Salesperson, Minimum TSP):
//     order badges, arrows on a directed graph, a hop with no edge as a phantom.
//
// The payload holds the graph (nodes, edges with their weights, the layout, the shape); each
// frame holds the states (`nodes`, `edges`: an id that is absent is Background), the phantoms,
// and the shape's annotations (`groups`, `order`). Edge ids are unique and every edge names
// both its ends, so no id is ever split.
//
// Layout is graphLayout.js's pure function (force or circle, as the payload says, with a
// Force / Circle switch to override it). Hovering, focusing or tapping a node traces it: its
// edges in the trace color, everything not touching it faded by color. The diagram opens fitted
// to its box and zooms and pans with DiagramZoom.js.

import Box from "@mui/material/Box";
import { useMemo, useState } from "react";
import DiagramZoom from "./DiagramZoom";
import { layoutGraph, NODE_RADIUS, nodeWidth } from "./graphLayout";
import {
  Badge,
  edgeGeometry,
  edgeLook,
  FAINT_EDGE,
  FAINT_FILTER,
  groupColors,
  NodeBody,
  NodeLabel,
  nodeLook,
  ordinal,
  PictureToggle,
  Ring,
  TRACE_COLOR,
  WeightTag,
} from "./graphPieces";
import { pictureStateStyle, stateOf } from "./pictureStates";

const LAYOUTS = [
  { value: "force", label: "Force" },
  { value: "circle", label: "Circle" },
];

/** What a group is called, per shape and rule, for labels and the Legend. */
export function groupName(payload, index) {
  if (payload?.shape === "cut") return index === 0 ? "S side" : "T side";
  if (payload?.rule === "cliqueCover") return `Clique ${index + 1}`;
  return `Color ${index + 1}`;
}

/** The static graph a payload describes, ready to draw. */
function readGraph(payload) {
  const nodes = (Array.isArray(payload?.nodes) ? payload.nodes : []).filter(
    (node) => typeof node?.id === "string",
  );
  const ids = new Set(nodes.map((node) => node.id));
  const edges = (Array.isArray(payload?.edges) ? payload.edges : []).filter(
    (edge) => typeof edge?.id === "string" && ids.has(edge.a) && ids.has(edge.b),
  );
  const directed = payload?.subtype === "directed";
  const pairs = new Set(edges.map((edge) => `${edge.a}\u0000${edge.b}`));
  const labels = new Map(nodes.map((node) => [node.id, String(node.label ?? node.id)]));
  const widths = new Map(nodes.map((node) => [node.id, nodeWidth(labels.get(node.id))]));
  const neighbours = new Map(nodes.map((node) => [node.id, []]));
  for (const edge of edges) {
    neighbours.get(edge.a).push(edge.b);
    if (edge.a !== edge.b) neighbours.get(edge.b).push(edge.a);
  }
  return {
    nodes,
    edges: edges.map((edge) => ({
      ...edge,
      // One of a directed pair a>b and b>a: bow both, to opposite sides, so neither hides.
      bend: directed && pairs.has(`${edge.b}\u0000${edge.a}`) ? 1 : 0,
      tag: edge.label ?? (typeof edge.weight === "number" ? formatWeight(edge.weight) : null),
    })),
    directed,
    labels,
    widths,
    neighbours,
  };
}

function formatWeight(weight) {
  return Number.isInteger(weight) ? String(weight) : String(Math.round(weight * 100) / 100);
}

/**
 * Each node's first position in the tour (`order`), and how many times it appears beyond once
 * (a closed tour's final return to its start is not a repeat).
 */
function tourPositions(order) {
  const first = new Map();
  const extra = new Map();
  if (!Array.isArray(order)) return { first, extra };
  const closed = order.length > 1 && order[0] === order[order.length - 1];
  const visits = closed ? order.slice(0, -1) : order;
  visits.forEach((id, index) => {
    if (!first.has(id)) first.set(id, index + 1);
    else extra.set(id, (extra.get(id) ?? 1) + 1);
  });
  return { first, extra };
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Graph payload.
 * @param {Object} props.frame The frame to draw.
 */
export default function GraphRenderer({ idPrefix, name, payload, frame }) {
  const graph = useMemo(() => readGraph(payload), [payload]);
  const defaultLayout = payload?.layout === "circle" ? "circle" : "force";
  const [layoutChoice, setLayoutChoice] = useState(null);
  const layoutMode = layoutChoice ?? defaultLayout;
  const layout = useMemo(
    () =>
      layoutGraph(
        {
          nodes: graph.nodes.map((node) => node.id),
          edges: graph.edges,
          widths: graph.nodes.map((node) => graph.widths.get(node.id)),
        },
        layoutMode,
      ),
    [graph, layoutMode],
  );
  // The node being traced: hovered or focused (`hover`), or tapped (`pinned`, which stays until
  // tapped again).
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  // (A node from an earlier payload, after the problem or instance changed, traces nothing.)
  const pointedAt = hover ?? pinned;
  const traced = pointedAt !== null && graph.labels.has(pointedAt) ? pointedAt : null;
  const near = traced ? new Set([traced, ...(graph.neighbours.get(traced) ?? [])]) : null;

  const groups = frame?.groups && typeof frame.groups === "object" ? frame.groups : null;
  const { first: positionOf, extra: repeatsOf } = tourPositions(frame?.order);
  const phantoms = Array.isArray(frame?.phantoms) ? frame.phantoms : [];
  const shape = payload?.shape ?? "";
  const pos = layout.positions;

  const label = `${name}: a graph of ${graph.nodes.length} node${graph.nodes.length === 1 ? "" : "s"} and ${graph.edges.length} edge${graph.edges.length === 1 ? "" : "s"}${graph.directed ? ", directed" : ""}.`;

  const touches = (edge) => edge.a === traced || edge.b === traced;

  return (
    <Box
      id={`${idPrefix}-graph`}
      data-graph-shape={shape}
      data-graph-rule={payload?.rule ?? ""}
      data-graph-layout={layoutMode}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <DiagramZoom
        idPrefix={idPrefix}
        label={label}
        drawing={layout}
        resetOn={[payload, layoutMode]}
        toolbar={
          <PictureToggle
            id={`${idPrefix}-layout`}
            label="Layout"
            options={LAYOUTS}
            value={layoutMode}
            onChange={(value) => setLayoutChoice(value)}
          />
        }
      >
        <g data-layer="edges">
          {graph.edges.map((edge, index) => {
            const a = pos.get(edge.a);
            const b = pos.get(edge.b);
            if (!a || !b) return null;
            const state = stateOf(frame?.edges, edge.id);
            const faint = traced !== null && !touches(edge);
            const look = traced
              ? faint
                ? FAINT_EDGE
                : { ...edgeLook(state), line: TRACE_COLOR, width: 3 }
              : edgeLook(state);
            const geometry = edgeGeometry(
              a,
              b,
              graph.widths.get(edge.a),
              graph.widths.get(edge.b),
              { directed: graph.directed, bend: edge.bend },
            );
            return (
              <g
                key={edge.id}
                id={`${idPrefix}-edge-${index}`}
                data-edge-id={edge.id}
                data-state={state}
                data-traced={traced ? (faint ? "faint" : "trace") : undefined}
              >
                <path
                  d={geometry.path}
                  fill="none"
                  stroke={look.line}
                  strokeWidth={look.width}
                  strokeDasharray={look.dash}
                  strokeLinecap="round"
                />
                {geometry.arrow && <polygon points={geometry.arrow} fill={look.line} />}
              </g>
            );
          })}
        </g>
        {traced === null && (
          <g data-layer="phantoms">
            {phantoms.map((phantom, index) => {
              const a = pos.get(phantom?.a);
              const b = pos.get(phantom?.b);
              if (!a || !b) return null;
              const state = typeof phantom.state === "string" ? phantom.state : "Rejected";
              const geometry = edgeGeometry(
                a,
                b,
                graph.widths.get(phantom.a),
                graph.widths.get(phantom.b),
                { directed: graph.directed },
              );
              const line = pictureStateStyle(state).line;
              return (
                <g
                  // Phantoms have no id of their own; their ends and place in the list do.
                  // biome-ignore lint/suspicious/noArrayIndexKey: phantoms are a plain list.
                  key={`${phantom.a}|${phantom.b}|${index}`}
                  id={`${idPrefix}-phantom-${index}`}
                  data-phantom={`${phantom.a}|${phantom.b}`}
                  data-state={state}
                >
                  <path
                    d={geometry.path}
                    fill="none"
                    stroke={line}
                    strokeWidth={2.4}
                    strokeDasharray="6 5"
                  />
                  {geometry.arrow && <polygon points={geometry.arrow} fill={line} />}
                </g>
              );
            })}
          </g>
        )}
        <g data-layer="weights">
          {graph.edges.map((edge) => {
            if (edge.tag === null) return null;
            const a = pos.get(edge.a);
            const b = pos.get(edge.b);
            if (!a || !b) return null;
            const geometry = edgeGeometry(
              a,
              b,
              graph.widths.get(edge.a),
              graph.widths.get(edge.b),
              { bend: edge.bend },
            );
            return (
              <WeightTag
                key={edge.id}
                x={geometry.label.x}
                y={geometry.label.y}
                text={edge.tag}
                state={stateOf(frame?.edges, edge.id)}
                faint={traced !== null && !touches(edge)}
              />
            );
          })}
        </g>
        <g data-layer="nodes">
          {graph.nodes.map((node, index) => {
            const p = pos.get(node.id);
            if (!p) return null;
            const state = stateOf(frame?.nodes, node.id);
            const group = Number.isInteger(groups?.[node.id]) ? groups[node.id] : undefined;
            const look = nodeLook(state, group);
            const width = graph.widths.get(node.id);
            const text = graph.labels.get(node.id);
            const position = positionOf.get(node.id);
            const repeats = repeatsOf.get(node.id);
            const faint = near !== null && !near.has(node.id);
            const isTraced = traced === node.id;
            const terminal = node.terminal === true;

            const parts = [`Node ${text}`];
            if (state !== "Background") parts.push(pictureStateStyle(state).legend);
            if (group !== undefined) parts.push(groupName(payload, group));
            if (terminal) parts.push("terminal");
            if (position !== undefined) parts.push(`visited ${ordinal(position)}`);
            if (repeats) parts.push(`visited ${repeats} times`);
            const neighbours = graph.neighbours.get(node.id) ?? [];
            parts.push(
              neighbours.length
                ? `joined to ${neighbours.map((id) => graph.labels.get(id)).join(", ")}`
                : "no edges",
            );

            const badgeX = p.x + width / 2 - 2;
            const badgeY = p.y - NODE_RADIUS + 2;
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={node.id}
                id={`${idPrefix}-node-${index}`}
                data-node-id={node.id}
                data-state={state}
                data-group={group}
                data-order={position}
                data-terminal={terminal ? "true" : undefined}
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
                  x={p.x}
                  y={p.y}
                  width={width}
                  look={
                    isTraced
                      ? { ...look, line: TRACE_COLOR, strokeWidth: 3, dash: undefined }
                      : look
                  }
                />
                {terminal && (
                  <Ring
                    x={p.x}
                    y={p.y}
                    width={width}
                    gap={5}
                    color={pictureStateStyle("Background").text}
                  />
                )}
                <NodeLabel x={p.x} y={p.y} text={text} color={look.ink} bold={look.bold} />
                {position !== undefined && (
                  <Badge x={badgeX} y={badgeY} text={position} testId="order" />
                )}
                {repeats && (
                  <Badge x={p.x - width / 2 + 2} y={badgeY} text={`×${repeats}`} testId="repeat" />
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
 * The Legend's entries for what a Graph run draws besides states: missing edges, group colors,
 * tour positions, terminals and directed edges, each only when the run has it.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function graphAnnotations(payload, frames) {
  const entries = [];
  const list = Array.isArray(frames) ? frames.filter(Boolean) : [];
  if (list.some((frame) => Array.isArray(frame.phantoms) && frame.phantoms.length > 0)) {
    entries.push({
      key: "missing-edge",
      text: "Missing edge (the answer needs an edge the graph doesn't have)",
      swatch: { kind: "line", color: pictureStateStyle("Rejected").line, dash: "6 5" },
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
      text: groupName(payload, index),
      swatch: { kind: "fill", fill: colors.fill, line: colors.line },
    });
  }
  if (list.some((frame) => Array.isArray(frame.order) && frame.order.length > 0)) {
    entries.push({ key: "order", text: "Order (position in the tour)", swatch: { kind: "badge" } });
  }
  if ((payload?.nodes ?? []).some((node) => node?.terminal === true)) {
    entries.push({
      key: "terminal",
      text: "Terminal (double outline: a node the tree must reach)",
      swatch: { kind: "ring" },
    });
  }
  if (payload?.subtype === "directed") {
    entries.push({ key: "arrow", text: "Arrow (the edge's direction)", swatch: { kind: "arrow" } });
  }
  return entries;
}
