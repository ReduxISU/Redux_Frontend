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
//     of this component (the Reductions section's side-by-side panes, T53/#116).
//
// The layout is a one-shot force simulation, ticked synchronously to convergence and
// thrown away -- a static starting arrangement, not a persistent physics timer. Dragging a
// node (T54, below) only ever overrides that starting position; it never restarts or
// re-ticks the simulation.
//
// T54 (#125): structural editing (add/remove/rename a node; add/remove an edge) is direct
// manipulation on the canvas itself -- drag a node to move it, drag from a node's outer
// ring to rubber-band a new edge onto another node, right-click a node/edge/empty canvas
// for add/rename/delete -- modeled on SARE_2026's AutomatonCanvas.tsx (issue #124's porting
// notes), replacing the side-panel form T51 originally shipped. This is **mouse-only**, by
// a deliberate, recorded decision (ai_documentation/INTERACTIVE_LAYER_DESIGN.md §3.1): the
// shared instance textarea in the Solvers section already gives keyboard-only users a way
// to edit this same underlying data, so the diagram doesn't duplicate that path. Node/edge
// position and curvature overrides are pure client-side view state (never serialized --
// INTERACTIVE_LAYER_DESIGN.md §2.3 is unchanged by this task); only the five structural ops
// (`addNode`/`removeNode`/`renameNode`/`addEdge`/`removeEdge`) reach `onGraphEdit`.
//
// Edge curvature and self-loop geometry live in ./graphGeometry.js (also ported from
// SARE_2026, see that file's header) -- shared by both the read-only and editable render
// paths, so a bidirectional pair (A->B and B->A both present) always renders as two visibly
// distinct arcs rather than one overlapping line, whether or not editing is active.
//
// **Edge edits preview locally but are not sent to Run.** See
// data/instanceSerializers.js's `serializeGraphInstance` doc comment for the full
// reasoning: a node id is a simple literal token this project can locate in instance text
// with confidence; an edge is not, across all 24 `graph` instances (DFA/NFA's weighted
// transition symbols are the concrete counterexample). VisualizationsSection.js's own
// summary to the user says this plainly when an edge edit is pending, rather than sending
// a guess to the backend.

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { getVisualizationColor } from "../../theme";
import {
  computeEdgePath,
  computeSelfLoopPath,
  distanceBetween,
  effectiveCurvature,
} from "./graphGeometry";

const NODE_RADIUS = 15;
const INNER_DRAG_RADIUS_RATIO = 0.6; // inside this fraction of the ring: move; outside: create edge
const EDGE_HANDLE_HIT_RADIUS = 8;
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

function computeViewBox(nodes) {
  if (nodes.length === 0) {
    return `0 0 ${LAYOUT_WIDTH} ${LAYOUT_HEIGHT}`;
  }
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const minX = Math.min(...xs) - LAYOUT_PADDING;
  const maxX = Math.max(...xs) + LAYOUT_PADDING;
  const minY = Math.min(...ys) - LAYOUT_PADDING;
  const maxY = Math.max(...ys) + LAYOUT_PADDING;
  return `${minX} ${minY} ${Math.max(maxX - minX, 1)} ${Math.max(maxY - minY, 1)}`;
}

function LinkMark({ link, idPrefix, highlighted, editable }) {
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

  const geo = isSelfLoop
    ? computeSelfLoopPath(source, NODE_RADIUS)
    : computeEdgePath(source, target, NODE_RADIUS, link.curvature ?? 0);

  return (
    <g>
      {editable && (
        <path
          d={geo.path}
          fill="none"
          stroke="transparent"
          strokeWidth={16}
          style={{ cursor: "context-menu" }}
          onContextMenu={link.onContextMenu}
        />
      )}
      <path
        d={geo.path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        markerEnd={markerEnd}
        style={{ pointerEvents: "none" }}
      />
      {link.weight && (
        <text
          x={geo.labelX}
          y={geo.labelY - (isSelfLoop ? 0 : 4)}
          textAnchor="middle"
          fontSize={10}
          fill={DEFAULT_STROKE}
          style={{ pointerEvents: "none" }}
        >
          {link.weight}
        </text>
      )}
      {editable && !isSelfLoop && (
        <circle
          cx={geo.handleX}
          cy={geo.handleY}
          r={4}
          fill="rgba(255,255,255,0.15)"
          stroke={DEFAULT_STROKE}
          strokeWidth={1}
          style={{ cursor: "grab" }}
        />
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

// Fixed-position floating popup, positioned at the screen point a right-click or drag-end
// happened -- SARE_2026's AutomatonCanvas.tsx menu pattern (issue #124). Lives as a sibling
// of the <svg> in the DOM, not inside it, so a click inside the menu never reaches the
// canvas's own mousedown/contextmenu handlers.
function FloatingMenu({ menuRef, x, y, children }) {
  return (
    <Paper
      ref={menuRef}
      elevation={8}
      sx={{
        position: "fixed",
        left: x + 4,
        top: y + 4,
        p: 1.5,
        zIndex: 20,
        minWidth: 200,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      {children}
    </Paper>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id this component renders, so two
 *   mounted instances (Reductions' side-by-side panes) never collide (§4.1).
 * @param {string} [props.instanceName] Human-readable visualization name, folded into
 *   the accessible summary when given.
 * @param {{nodes: Array, links: Array}} props.frame One already-validated `graph` frame.
 * @param {boolean} [props.editable] T54 (#125): true only when this frame is the base
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
  const svgRef = useRef(null);
  const menuRef = useRef(null);

  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [positionOverride, setPositionOverride] = useState({});
  const [curvatureOverride, setCurvatureOverride] = useState({});
  const [drag, setDrag] = useState({ kind: "none" });
  const [rubber, setRubber] = useState(null);
  const [menu, setMenu] = useState(null); // {kind, x, y, ...} | null -- screen-space x/y
  const [menuValue, setMenuValue] = useState("");
  const [menuError, setMenuError] = useState("");

  // Layout is a one-shot simulation keyed only on the frame's own structure -- dragging
  // (which only ever writes positionOverride/curvatureOverride) never re-triggers it.
  const { simNodes, simLinks } = useMemo(() => layoutGraph(frame.nodes, frame.links), [frame]);

  const displayNodes = useMemo(
    () => simNodes.map((node) => ({ ...node, ...(positionOverride[node.id] ?? {}) })),
    [simNodes, positionOverride],
  );
  const nodeById = useMemo(
    () => new Map(displayNodes.map((node) => [node.id, node])),
    [displayNodes],
  );
  // d3-force rewrote each link's source/target into references to the *pre-override* node
  // objects -- remap to the display copies so a dragged node's edges track its new position.
  const displayLinks = useMemo(
    () =>
      simLinks
        .map((link) => ({
          ...link,
          source: nodeById.get(link.source.id),
          target: nodeById.get(link.target.id),
        }))
        .filter((link) => link.source && link.target),
    [simLinks, nodeById],
  );

  const viewBox = useMemo(() => computeViewBox(displayNodes), [displayNodes]);

  const closeMenu = useCallback(() => {
    setMenu(null);
    setMenuValue("");
    setMenuError("");
  }, []);

  // Outside click / Escape closes whatever menu is open -- reads only this component's own
  // menuRef, not a hardcoded global selector (§4.1).
  useEffect(() => {
    if (!menu) return undefined;
    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeMenu();
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") closeMenu();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menu, closeMenu]);

  const svgPoint = useCallback((event) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const transformed = point.matrixTransform(matrix.inverse());
    return { x: transformed.x, y: transformed.y };
  }, []);

  const handleSvgMouseDown = useCallback(
    (event) => {
      if (!editable || event.button !== 0) return;
      const { x, y } = svgPoint(event);

      for (const node of displayNodes) {
        const r = distanceBetween(x, y, node.x, node.y);
        if (r <= NODE_RADIUS) {
          event.preventDefault();
          if (r <= NODE_RADIUS * INNER_DRAG_RADIUS_RATIO) {
            setDrag({ kind: "moveNode", id: node.id, offsetX: x - node.x, offsetY: y - node.y });
          } else {
            setDrag({ kind: "createEdge", sourceId: node.id });
            setRubber({ x, y });
          }
          return;
        }
      }

      for (const link of displayLinks) {
        if (link.source.id === link.target.id) continue; // self-loops have no curvature handle
        const distance =
          distanceBetween(link.source.x, link.source.y, link.target.x, link.target.y) || 1;
        const curvature = effectiveCurvature(
          link,
          displayLinks,
          curvatureOverride,
          NODE_RADIUS,
          distance,
        );
        const geo = computeEdgePath(link.source, link.target, NODE_RADIUS, curvature);
        if (distanceBetween(x, y, geo.handleX, geo.handleY) <= EDGE_HANDLE_HIT_RADIUS) {
          event.preventDefault();
          setDrag({ kind: "adjustCurvature", linkKey: `${link.source.id}@@${link.target.id}` });
          return;
        }
      }
    },
    [editable, svgPoint, displayNodes, displayLinks, curvatureOverride],
  );

  const handleSvgMouseMove = useCallback(
    (event) => {
      if (drag.kind === "none") return;
      const { x, y } = svgPoint(event);

      if (drag.kind === "moveNode") {
        setPositionOverride((current) => ({
          ...current,
          [drag.id]: { x: x - drag.offsetX, y: y - drag.offsetY },
        }));
      } else if (drag.kind === "createEdge") {
        setRubber({ x, y });
      } else if (drag.kind === "adjustCurvature") {
        const [sourceId, targetId] = drag.linkKey.split("@@");
        const source = nodeById.get(sourceId);
        const target = nodeById.get(targetId);
        if (!source || !target) return;
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = distanceBetween(source.x, source.y, target.x, target.y) || 1;
        const nx = -dy / distance;
        const ny = dx / distance;
        const curvature = (x - midX) * nx + (y - midY) * ny;
        setCurvatureOverride((current) => ({ ...current, [drag.linkKey]: curvature }));
      }
    },
    [drag, svgPoint, nodeById],
  );

  const handleSvgMouseUp = useCallback(
    (event) => {
      if (drag.kind === "createEdge") {
        const { x, y } = svgPoint(event);
        const target = displayNodes.find(
          (node) => distanceBetween(x, y, node.x, node.y) <= NODE_RADIUS,
        );
        if (target && target.id !== drag.sourceId) {
          onGraphEdit?.({ type: "addEdge", source: drag.sourceId, target: target.id });
        }
        setRubber(null);
      }
      if (drag.kind !== "none") setDrag({ kind: "none" });
    },
    [drag, svgPoint, displayNodes, onGraphEdit],
  );

  const handleSvgContextMenu = useCallback(
    (event) => {
      if (!editable) return;
      event.preventDefault();
      const { x, y } = svgPoint(event);

      const node = displayNodes.find(
        (candidate) => distanceBetween(x, y, candidate.x, candidate.y) <= NODE_RADIUS,
      );
      if (node) {
        setMenu({ kind: "editNode", id: node.id, x: event.clientX, y: event.clientY });
        setMenuValue(node.id);
        setMenuError("");
        return;
      }

      for (const link of displayLinks) {
        if (link.source.id === link.target.id) continue;
        const distance =
          distanceBetween(link.source.x, link.source.y, link.target.x, link.target.y) || 1;
        const curvature = effectiveCurvature(
          link,
          displayLinks,
          curvatureOverride,
          NODE_RADIUS,
          distance,
        );
        const geo = computeEdgePath(link.source, link.target, NODE_RADIUS, curvature);
        if (distanceBetween(x, y, geo.handleX, geo.handleY) <= 16) {
          setMenu({
            kind: "editEdge",
            id: link.id,
            source: link.source.id,
            target: link.target.id,
            x: event.clientX,
            y: event.clientY,
          });
          setMenuError("");
          return;
        }
      }

      setMenu({ kind: "createNode", x: event.clientX, y: event.clientY });
      setMenuValue("");
      setMenuError("");
    },
    [editable, svgPoint, displayNodes, displayLinks, curvatureOverride],
  );

  function submitCreateNode() {
    const trimmed = menuValue.trim();
    if (!trimmed) {
      setMenuError("Name is required");
      return;
    }
    if (frame.nodes.some((node) => node.id === trimmed)) {
      setMenuError("Name already used");
      return;
    }
    onGraphEdit?.({ type: "addNode", id: trimmed });
    closeMenu();
  }

  function submitRenameNode() {
    if (menu?.kind !== "editNode") return;
    const trimmed = menuValue.trim();
    if (!trimmed) {
      setMenuError("Name is required");
      return;
    }
    if (trimmed !== menu.id && frame.nodes.some((node) => node.id === trimmed)) {
      setMenuError("Name already used");
      return;
    }
    if (trimmed !== menu.id) {
      onGraphEdit?.({ type: "renameNode", from: menu.id, to: trimmed });
    }
    closeMenu();
  }

  function submitDeleteNode() {
    if (menu?.kind !== "editNode") return;
    onGraphEdit?.({ type: "removeNode", id: menu.id });
    closeMenu();
  }

  function submitDeleteEdge() {
    if (menu?.kind !== "editEdge") return;
    onGraphEdit?.({ type: "removeEdge", id: menu.id });
    closeMenu();
  }

  const nodeCount = displayNodes.length;
  const linkCount = displayLinks.length;
  const summaryBody = `graph with ${nodeCount} node${nodeCount === 1 ? "" : "s"} and ${linkCount} link${linkCount === 1 ? "" : "s"}`;
  const summary = instanceName ? `${instanceName}: ${summaryBody}` : summaryBody;

  const svg = (
    <svg
      ref={svgRef}
      id={scopeId}
      role="img"
      aria-label={summary}
      viewBox={viewBox}
      width="100%"
      height="100%"
      style={{ display: "block", cursor: drag.kind === "moveNode" ? "grabbing" : "default" }}
      onMouseDown={handleSvgMouseDown}
      onMouseMove={handleSvgMouseMove}
      onMouseUp={handleSvgMouseUp}
      onMouseLeave={handleSvgMouseUp}
      onContextMenu={handleSvgContextMenu}
    >
      <title>{summary}</title>
      <defs>
        <marker
          id={`${scopeId}-arrow`}
          markerWidth={8}
          markerHeight={6}
          refX={8}
          refY={3}
          orient="auto-start-reverse"
        >
          <path d="M0,0 L0,6 L8,3 Z" fill={DEFAULT_STROKE} />
        </marker>
      </defs>
      <g>
        {displayLinks.map((link) => {
          const distance =
            distanceBetween(link.source.x, link.source.y, link.target.x, link.target.y) || 1;
          const curvature =
            link.source.id === link.target.id
              ? 0
              : effectiveCurvature(link, displayLinks, curvatureOverride, NODE_RADIUS, distance);
          return (
            <LinkMark
              key={link.id}
              link={{
                ...link,
                curvature,
                onContextMenu: (event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setMenu({
                    kind: "editEdge",
                    id: link.id,
                    source: link.source.id,
                    target: link.target.id,
                    x: event.clientX,
                    y: event.clientY,
                  });
                  setMenuError("");
                },
              }}
              idPrefix={scopeId}
              editable={editable}
              highlighted={
                hoveredNodeId != null &&
                (link.source?.id === hoveredNodeId || link.target?.id === hoveredNodeId)
              }
            />
          );
        })}
        {drag.kind === "createEdge" &&
          rubber &&
          (() => {
            const source = nodeById.get(drag.sourceId);
            if (!source) return null;
            return (
              <line
                x1={source.x}
                y1={source.y}
                x2={rubber.x}
                y2={rubber.y}
                stroke={DEFAULT_STROKE}
                strokeWidth={1.5}
                strokeDasharray="5,3"
                style={{ pointerEvents: "none" }}
              />
            );
          })()}
      </g>
      <g>
        {displayNodes.map((node) => (
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
      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
        Drag a node to move it, or drag from its outer edge onto another node to connect them.
        Right-click a node, a connection, or empty space to add, rename, or delete.
      </Typography>

      {menu?.kind === "createNode" && (
        <FloatingMenu menuRef={menuRef} x={menu.x} y={menu.y}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
            New node
          </Typography>
          <TextField
            id={`${scopeId}-new-node`}
            size="small"
            autoFocus
            label="Name"
            value={menuValue}
            onChange={(event) => setMenuValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submitCreateNode()}
          />
          {menuError && (
            <Typography variant="caption" color="error">
              {menuError}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" variant="contained" onClick={submitCreateNode}>
              Add
            </Button>
            <Button size="small" onClick={closeMenu}>
              Cancel
            </Button>
          </Box>
        </FloatingMenu>
      )}

      {menu?.kind === "editNode" && (
        <FloatingMenu menuRef={menuRef} x={menu.x} y={menu.y}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
            Edit node
          </Typography>
          <TextField
            id={`${scopeId}-edit-node`}
            size="small"
            autoFocus
            label="Name"
            value={menuValue}
            onChange={(event) => setMenuValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submitRenameNode()}
          />
          {menuError && (
            <Typography variant="caption" color="error">
              {menuError}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" variant="contained" onClick={submitRenameNode}>
              Save
            </Button>
            <Button size="small" color="error" onClick={submitDeleteNode}>
              Delete
            </Button>
            <Button size="small" onClick={closeMenu}>
              Cancel
            </Button>
          </Box>
        </FloatingMenu>
      )}

      {menu?.kind === "editEdge" && (
        <FloatingMenu menuRef={menuRef} x={menu.x} y={menu.y}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
            {menu.source} {"->"} {menu.target}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" color="error" variant="contained" onClick={submitDeleteEdge}>
              Delete
            </Button>
            <Button size="small" onClick={closeMenu}>
              Cancel
            </Button>
          </Box>
        </FloatingMenu>
      )}
    </Box>
  );
}
