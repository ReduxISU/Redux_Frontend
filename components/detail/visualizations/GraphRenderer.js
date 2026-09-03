// components/detail/visualizations/GraphRenderer.js
//
// T48 (#111) -- the `graph` universal type's renderer
// (ai_documentation/VISUALIZATION_TYPE_CONTRACTS.md §3.1), covering 24 of 48 declared
// visualization instances, the largest single group. Ported from Redux_GUI's
// StandardGraphSvgReact, with the bugs T40 found fixed rather than carried over:
//
//   - `weight` is always rendered as plain label text next to the link, never parsed as
//     a number. DFA/NFA send transition symbols here ("a,b"), not numeric weights, and
//     the old renderer fed it straight into `d3.scaleLinear()` -- exactly the defect
//     §3.1's "malformed vs. valid" note calls out as a bug to fix in the port, not a
//     contract violation to reject.
//   - No `d3.selectAll`/`d3.select` against `document` or a hardcoded id (§4.1). This
//     renderer only uses d3-force's simulation, a pure data computation with no DOM
//     access at all -- layout math in, `{x, y}` positions out. Everything on screen is
//     plain React-owned SVG, so nothing here can collide between two mounted instances
//     of this component (the Reductions section's side-by-side panes, once T53 wires
//     them to real data).
//
// The layout is a one-shot force simulation, ticked synchronously to convergence and
// thrown away -- this is a *static* render (T48's own scope: "static (non-interactive)
// rendering only"). No drag, no persistent simulation timer, no re-layout on a render
// that didn't get a new frame.
//
// T51 (#114): structural editing (add/remove/relabel a node; add/remove an edge -- see
// this component's own scope note below) is gated behind the `editable` prop. Rather than
// embedding forms inside the SVG (no natural text-flow to hang a labelled input off, and
// every hover target here is already a small circle), edit controls render in a separate
// panel below the diagram -- a real, focusable, aria-labelled list of node/edge rows plus
// add forms, the same keyboard-reachable pattern T52 established for
// BooleanSatisfiabilityRenderer. The SVG itself stays exactly as before when not editable.
//
// Node/gate position dragging is out of scope everywhere in this contract
// (INTERACTIVE_LAYER_DESIGN.md §2.3: no position field exists on any type this project's
// force-directed layout is computed fresh, not read from data) -- nothing here changes
// that.
//
// **Edge edits preview locally but are not sent to Run.** See
// data/instanceSerializers.js's `serializeGraphInstance` doc comment for the full
// reasoning: a node id is a simple literal token this project can locate in instance text
// with confidence; an edge is not, across all 24 `graph` instances (DFA/NFA's weighted
// transition symbols are the concrete counterexample). VisualizationsSection.js's own
// summary to the user says this plainly when an edge edit is pending, rather than sending
// a guess to the backend.

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";
import { useId, useMemo, useState } from "react";
import { getVisualizationColor } from "../../theme";

const NODE_RADIUS = 15;
const LAYOUT_WIDTH = 640;
const LAYOUT_HEIGHT = 380;
const LAYOUT_PADDING = NODE_RADIUS * 2;
const SIMULATION_TICKS = 300;
const DEFAULT_STROKE = getVisualizationColor("");

function isTruthyFlag(value) {
  return value === "true" || value === true;
}

// d3-force mutates whatever objects it is given (adding x/y/vx/vy, and rewriting each
// link's source/target from an id string to a node object reference) -- clone first so
// the frame this component was handed (owned by the caller, and shared with the
// contract-violation canary) is never mutated out from under it.
function layoutGraph(nodes, links) {
  const simNodes = nodes.map((node) => ({ ...node }));
  const simLinks = links.map((link) => ({ ...link }));

  const simulation = forceSimulation(simNodes)
    .force(
      "link",
      forceLink(simLinks)
        .id((node) => node.id)
        .distance(90),
    )
    .force("charge", forceManyBody().strength(-220))
    .force("center", forceCenter(LAYOUT_WIDTH / 2, LAYOUT_HEIGHT / 2))
    .force("collide", forceCollide(NODE_RADIUS * 1.8))
    .stop();

  for (let i = 0; i < SIMULATION_TICKS; i += 1) {
    simulation.tick();
  }

  return { simNodes, simLinks };
}

function computeViewBox(simNodes) {
  if (simNodes.length === 0) {
    return `0 0 ${LAYOUT_WIDTH} ${LAYOUT_HEIGHT}`;
  }
  const xs = simNodes.map((node) => node.x);
  const ys = simNodes.map((node) => node.y);
  const minX = Math.min(...xs) - LAYOUT_PADDING;
  const maxX = Math.max(...xs) + LAYOUT_PADDING;
  const minY = Math.min(...ys) - LAYOUT_PADDING;
  const maxY = Math.max(...ys) + LAYOUT_PADDING;
  return `${minX} ${minY} ${Math.max(maxX - minX, 1)} ${Math.max(maxY - minY, 1)}`;
}

function LinkMark({ link, idPrefix, highlighted }) {
  const source = link.source;
  const target = link.target;
  if (!source || !target || source.x === undefined || target.x === undefined) {
    return null;
  }

  const stroke = getVisualizationColor(link.color) || DEFAULT_STROKE;
  const strokeWidth = highlighted ? 3 : 1.5;
  const strokeDasharray = isTruthyFlag(link.dashed) ? "4 3" : undefined;
  const markerEnd = link.directed ? `url(#${idPrefix}-arrow)` : undefined;
  const isSelfLoop = source.id === target.id;

  if (isSelfLoop) {
    const loopPath = `M ${source.x - NODE_RADIUS * 0.6} ${source.y - NODE_RADIUS} C ${source.x - NODE_RADIUS * 3} ${source.y - NODE_RADIUS * 3}, ${source.x + NODE_RADIUS * 3} ${source.y - NODE_RADIUS * 3}, ${source.x + NODE_RADIUS * 0.6} ${source.y - NODE_RADIUS}`;
    return (
      <g>
        <path
          d={loopPath}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          markerEnd={markerEnd}
        />
        {link.weight && (
          <text
            x={source.x}
            y={source.y - NODE_RADIUS * 3.6}
            textAnchor="middle"
            fontSize={10}
            fill={DEFAULT_STROKE}
          >
            {link.weight}
          </text>
        )}
      </g>
    );
  }

  const midX = (source.x + target.x) / 2;
  const midY = (source.y + target.y) / 2;

  return (
    <g>
      <line
        x1={source.x}
        y1={source.y}
        x2={target.x}
        y2={target.y}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        markerEnd={markerEnd}
      />
      {link.weight && (
        <text x={midX} y={midY - 4} textAnchor="middle" fontSize={10} fill={DEFAULT_STROKE}>
          {link.weight}
        </text>
      )}
    </g>
  );
}

function GraphNodeMark({ node, highlighted, onEnter, onLeave }) {
  const fill = getVisualizationColor(node.color) || "#17140F";
  const stroke = getVisualizationColor(node.outline) || "#F5F1EA";
  const isAccept = isTruthyFlag(node.accept_state);
  const isInitial = isTruthyFlag(node.initial);
  const strokeDasharray = isTruthyFlag(node.dashed) ? "3 2" : undefined;

  return (
    <g
      tabIndex={0}
      role="img"
      aria-label={node.name}
      transform={`translate(${node.x}, ${node.y})`}
      style={{ cursor: "default" }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      {isInitial && (
        <path
          d={`M ${-NODE_RADIUS - 14} 0 L ${-NODE_RADIUS - 2} -5 L ${-NODE_RADIUS - 2} 5 Z`}
          fill={stroke}
        />
      )}
      {isAccept && <circle r={NODE_RADIUS + 3} fill="none" stroke={stroke} strokeWidth={1.5} />}
      <circle
        r={NODE_RADIUS}
        fill={fill}
        stroke={stroke}
        strokeWidth={highlighted ? 3 : 1.5}
        strokeDasharray={strokeDasharray}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fill="#F5F1EA"
        style={{ pointerEvents: "none" }}
      >
        {node.name}
      </text>
    </g>
  );
}

// Node/edge rows are keyed by `_key`, a stable identifier VisualizationsSection.js
// assigns once when local edit state is created (see that file's header) and never
// changes even when the node's own `id` is renamed -- keying by `node.id` directly would
// remount (and drop focus from) the very text field the user is typing a rename into,
// since React treats a changed `key` as a different element. `id` is still what's shown,
// edited, and referenced by edges; `_key` only exists for this reason.
function GraphEditPanel({ idPrefix, nodes, links, onGraphEdit }) {
  const [newNodeId, setNewNodeId] = useState("");
  const [newEdgeSource, setNewEdgeSource] = useState(nodes[0]?.id ?? "");
  const [newEdgeTarget, setNewEdgeTarget] = useState(nodes[1]?.id ?? nodes[0]?.id ?? "");

  const sourceValue = nodes.some((node) => node.id === newEdgeSource)
    ? newEdgeSource
    : (nodes[0]?.id ?? "");
  const targetValue = nodes.some((node) => node.id === newEdgeTarget)
    ? newEdgeTarget
    : (nodes[1]?.id ?? nodes[0]?.id ?? "");

  function handleAddNode(event) {
    event.preventDefault();
    const trimmed = newNodeId.trim();
    if (!trimmed || nodes.some((node) => node.id === trimmed)) return;
    onGraphEdit({ type: "addNode", id: trimmed });
    setNewNodeId("");
  }

  function handleAddEdge(event) {
    event.preventDefault();
    if (!sourceValue || !targetValue) return;
    onGraphEdit({ type: "addEdge", source: sourceValue, target: targetValue });
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        mt: 1,
        p: 1.5,
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      <Typography variant="overline" sx={{ color: "text.secondary" }}>
        Edit nodes
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {nodes.map((node) => (
          <Box key={node._key} sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
            <Box
              component="label"
              htmlFor={`${idPrefix}-node-${node._key}`}
              sx={{ display: "none" }}
            >
              Rename node {node.id}
            </Box>
            <TextField
              id={`${idPrefix}-node-${node._key}`}
              size="small"
              variant="standard"
              value={node.id}
              onChange={(event) =>
                onGraphEdit({ type: "renameNode", from: node.id, to: event.target.value })
              }
              sx={{ width: 56, "& input": { fontSize: "0.8125rem", py: 0.25 } }}
              inputProps={{ "aria-label": `Rename node ${node.id}` }}
            />
            <IconButton
              id={`${idPrefix}-node-${node._key}-remove`}
              size="small"
              aria-label={`Remove node ${node.id}`}
              onClick={() => onGraphEdit({ type: "removeNode", id: node.id })}
              sx={{ p: 0.375 }}
            >
              <CloseIcon sx={{ fontSize: "0.875rem" }} />
            </IconButton>
          </Box>
        ))}
      </Box>
      <Box
        component="form"
        onSubmit={handleAddNode}
        sx={{ display: "inline-flex", gap: 0.5, alignItems: "center" }}
      >
        <Box component="label" htmlFor={`${idPrefix}-add-node`} sx={{ display: "none" }}>
          New node id
        </Box>
        <TextField
          id={`${idPrefix}-add-node`}
          size="small"
          variant="outlined"
          placeholder="new node id"
          value={newNodeId}
          onChange={(event) => setNewNodeId(event.target.value)}
          sx={{ width: 120, "& input": { fontSize: "0.8125rem", py: 0.5 } }}
          inputProps={{ "aria-label": "New node id" }}
        />
        <IconButton
          id={`${idPrefix}-add-node-submit`}
          type="submit"
          size="small"
          disabled={!newNodeId.trim() || nodes.some((node) => node.id === newNodeId.trim())}
          aria-label="Add node"
          sx={{ p: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
        >
          <AddIcon sx={{ fontSize: "1rem" }} />
        </IconButton>
      </Box>

      <Typography variant="overline" sx={{ color: "text.secondary", mt: 1 }}>
        Edit edges
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {links.length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
            No edges.
          </Typography>
        )}
        {links.map((link) => (
          <Box key={link._key} sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
              {link.source} {link.directed ? "->" : "--"} {link.target}
            </Typography>
            <IconButton
              id={`${idPrefix}-edge-${link._key}-remove`}
              size="small"
              aria-label={`Remove edge from ${link.source} to ${link.target}`}
              onClick={() => onGraphEdit({ type: "removeEdge", id: link.id })}
              sx={{ p: 0.375 }}
            >
              <CloseIcon sx={{ fontSize: "0.875rem" }} />
            </IconButton>
          </Box>
        ))}
      </Box>
      {nodes.length > 0 && (
        <Box
          component="form"
          onSubmit={handleAddEdge}
          sx={{ display: "inline-flex", gap: 0.5, alignItems: "center" }}
        >
          <Select
            id={`${idPrefix}-add-edge-source`}
            size="small"
            value={sourceValue}
            onChange={(event) => setNewEdgeSource(event.target.value)}
            inputProps={{ "aria-label": "New edge source node" }}
            sx={{ minWidth: 72 }}
          >
            {nodes.map((node) => (
              <MenuItem key={node._key} value={node.id}>
                {node.id}
              </MenuItem>
            ))}
          </Select>
          <Typography variant="body2" aria-hidden="true">
            {"->"}
          </Typography>
          <Select
            id={`${idPrefix}-add-edge-target`}
            size="small"
            value={targetValue}
            onChange={(event) => setNewEdgeTarget(event.target.value)}
            inputProps={{ "aria-label": "New edge target node" }}
            sx={{ minWidth: 72 }}
          >
            {nodes.map((node) => (
              <MenuItem key={node._key} value={node.id}>
                {node.id}
              </MenuItem>
            ))}
          </Select>
          <IconButton
            id={`${idPrefix}-add-edge-submit`}
            type="submit"
            size="small"
            aria-label="Add edge"
            sx={{ p: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
          >
            <AddIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </Box>
      )}
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Node changes are sent to Run. Edge changes preview here but can&apos;t be sent to Run yet
        for this visualization type.
      </Typography>
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id this component renders, so two
 *   mounted instances (Reductions' side-by-side panes) never collide (§4.1).
 * @param {string} [props.instanceName] Human-readable visualization name, folded into
 *   the accessible summary when given.
 * @param {{nodes: Array, links: Array}} props.frame One already-validated `graph` frame.
 * @param {boolean} [props.editable] T51 (#114): true only when this frame is the base
 *   frame of a visualization the caller has decided is editable right now -- this
 *   component does not re-derive that gate.
 * @param {(op: Object) => void} [props.onGraphEdit] Called with one edit descriptor per
 *   structural edit -- `{type: "addNode", id}`, `{type: "removeNode", id}`,
 *   `{type: "renameNode", from, to}`, `{type: "addEdge", source, target}`, or
 *   `{type: "removeEdge", id}`. Required when `editable` is true.
 */
export default function GraphRenderer({
  idPrefix,
  instanceName,
  frame,
  editable = false,
  onGraphEdit,
}) {
  const reactId = useId().replace(/:/g, "");
  const scopeId = `${idPrefix}-${reactId}`;
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const { simNodes, simLinks } = useMemo(() => layoutGraph(frame.nodes, frame.links), [frame]);
  const viewBox = useMemo(() => computeViewBox(simNodes), [simNodes]);

  const nodeCount = simNodes.length;
  const linkCount = simLinks.length;
  const summaryBody = `graph with ${nodeCount} node${nodeCount === 1 ? "" : "s"} and ${linkCount} link${linkCount === 1 ? "" : "s"}`;
  const summary = instanceName ? `${instanceName}: ${summaryBody}` : summaryBody;

  const svg = (
    <svg
      id={scopeId}
      role="img"
      aria-label={summary}
      viewBox={viewBox}
      width="100%"
      height="100%"
      style={{ display: "block" }}
    >
      <title>{summary}</title>
      <defs>
        <marker
          id={`${scopeId}-arrow`}
          viewBox="0 0 10 10"
          refX={NODE_RADIUS + 8}
          refY={5}
          markerWidth={6}
          markerHeight={6}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={DEFAULT_STROKE} />
        </marker>
      </defs>
      <g>
        {simLinks.map((link) => (
          <LinkMark
            key={link.id}
            link={link}
            idPrefix={scopeId}
            highlighted={
              hoveredNodeId != null &&
              (link.source?.id === hoveredNodeId || link.target?.id === hoveredNodeId)
            }
          />
        ))}
      </g>
      <g>
        {simNodes.map((node) => (
          <GraphNodeMark
            key={node.id}
            node={node}
            highlighted={node.id === hoveredNodeId}
            onEnter={() => setHoveredNodeId(node.id)}
            onLeave={() => setHoveredNodeId((current) => (current === node.id ? null : current))}
          />
        ))}
      </g>
    </svg>
  );

  if (!editable) {
    return svg;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ flex: 1, minHeight: 0 }}>{svg}</Box>
      <GraphEditPanel
        idPrefix={scopeId}
        nodes={frame.nodes}
        links={frame.links}
        onGraphEdit={onGraphEdit}
      />
    </Box>
  );
}
