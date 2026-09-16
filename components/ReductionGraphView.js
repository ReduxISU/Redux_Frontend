// components/ReductionGraphView.js
//
// #136 (T61) -- the catalog-wide reduction-network graph: every catalogued problem as a
// node, every reduction between problems as a directed edge, matching Karp's
// "Reducibility Among Combinatorial Problems" (the project's own stated inspiration, see
// pages/aboutus.js). Layout/library decision recorded as a comment on #136: d3-force
// (already a dependency) with the same one-shot tick-to-convergence pattern
// components/detail/visualizations/GraphRenderer.js already establishes for the
// per-problem `graph` visualization type (ai_documentation/VISUALIZATION_TYPE_CONTRACTS.md
// §4.1) -- run the simulation, tick it a fixed number of times synchronously, throw it
// away. No persistent physics timer, no direct DOM/d3.select access: this is pure
// data-in/{x,y}-out layout math, and everything on screen is plain React-owned SVG.
//
// This is a different domain from GraphRenderer (the whole catalog's reductions, not one
// problem's own visualization frame), so it is a new component rather than a reuse of
// GraphRenderer itself -- but edge geometry (curvature for a bidirectional pair, self-loop
// handling) is shared from ./detail/visualizations/graphGeometry.js so the two graphs stay
// visually consistent if either kind of edge ever shows up here.
//
// Verified against the real production catalog (2026-09-15, Navigation/Batch/allProblems +
// Navigation/Reductions): 49 problems, only 19 reduction edges touching 20 of them (29
// problems currently have no reduction at all, in either direction). That is sparse enough
// that the one-shot force layout reads clearly with room to spare -- no hairball at this
// scale -- and today's data has no bidirectional pair (A->B and B->A both present) or
// self-loop, though the shared geometry helpers handle both defensively anyway.

import { useTheme } from "@mui/material/styles";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";
import { useRouter } from "next/router";
import { useId, useMemo, useState } from "react";
import {
  computeEdgePath,
  computeSelfLoopPath,
  distanceBetween,
  effectiveCurvature,
} from "./detail/visualizations/graphGeometry";
import { getFacetAccentColor } from "./theme";

const NODE_RADIUS = 15;
const LAYOUT_WIDTH = 1200;
const LAYOUT_HEIGHT = 900;
const LAYOUT_PADDING = 90; // generous -- labels render below/around nodes, not just the node circles themselves
const SIMULATION_TICKS = 300;
const MAX_LABEL_LINE_CHARS = 14;

// d3-force mutates whatever objects it is given (adding x/y/vx/vy, rewriting each link's
// source/target from an id string to a node object reference) -- clone first, matching
// GraphRenderer.js's layoutGraph so the frame this component was handed is never mutated
// out from under its caller.
function layoutGraph(nodes, links) {
  const simNodes = nodes.map((node) => ({ ...node }));
  const simLinks = links.map((link) => ({ ...link }));

  const simulation = forceSimulation(simNodes)
    .force(
      "link",
      forceLink(simLinks)
        .id((node) => node.id)
        .distance(150),
    )
    .force("charge", forceManyBody().strength(-260))
    .force("center", forceCenter(LAYOUT_WIDTH / 2, LAYOUT_HEIGHT / 2))
    .force("collide", forceCollide(70))
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

// Greedy word-wrap so a long problem name ("Pump Scheduling Emergency Resilience", 36
// chars, the longest in the real catalog) renders as several short lines under its node
// rather than one long line that overlaps its neighbors.
function wrapLabel(name) {
  const words = name.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > MAX_LABEL_LINE_CHARS) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function edgeTooltip(link) {
  const parts = [link.className];
  if (link.cost) parts.push(`${link.cost} cost`);
  if (link.reductionType) parts.push(link.reductionType);
  return `${link.source.id ?? link.source} → ${link.target.id ?? link.target}: ${parts.join(", ")}`;
}

function ReductionEdge({ link, idPrefix, stroke, highlighted, allLinks, curvatureOverride }) {
  const source = link.source;
  const target = link.target;
  if (!source || !target || source.x === undefined || target.x === undefined) {
    return null;
  }

  const isSelfLoop = source.id === target.id;
  const distance = distanceBetween(source.x, source.y, target.x, target.y) || 1;
  const curvature = isSelfLoop
    ? 0
    : effectiveCurvature(link, allLinks, curvatureOverride, NODE_RADIUS, distance);
  const geo = isSelfLoop
    ? computeSelfLoopPath(source, NODE_RADIUS)
    : computeEdgePath(source, target, NODE_RADIUS, curvature);

  return (
    <path
      d={geo.path}
      fill="none"
      stroke={stroke}
      strokeWidth={highlighted ? 2.5 : 1.25}
      strokeOpacity={highlighted ? 0.95 : 0.55}
      markerEnd={`url(#${idPrefix}-arrow)`}
    >
      <title>{edgeTooltip(link)}</title>
    </path>
  );
}

function ReductionNode({ node, isolated, highlighted, accent, textColor, mutedTextColor, onOpen }) {
  const lines = useMemo(() => wrapLabel(node.id), [node.id]);
  const labelStartY = NODE_RADIUS + 12;
  const lineHeight = 11;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      tabIndex={0}
      role="link"
      aria-label={`Open ${node.id} detail page`}
      style={{ cursor: "pointer", outline: "none" }}
      onClick={() => onOpen(node.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(node.id);
        }
      }}
      onMouseEnter={() => node.onEnter?.()}
      onMouseLeave={() => node.onLeave?.()}
      onFocus={() => node.onEnter?.()}
      onBlur={() => node.onLeave?.()}
    >
      <circle
        r={NODE_RADIUS}
        fill="#17140F"
        stroke={accent}
        strokeWidth={highlighted ? 3 : 1.5}
        opacity={isolated ? 0.55 : 1}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={9}
        fill={textColor}
        style={{ pointerEvents: "none" }}
      >
        {node.id
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 3)
          .toUpperCase()}
      </text>
      {lines.map((line, index) => (
        <text
          key={line}
          x={0}
          y={labelStartY + index * lineHeight}
          textAnchor="middle"
          fontSize={9.5}
          fontWeight={highlighted ? 700 : 500}
          fill={highlighted ? textColor : mutedTextColor}
          style={{ pointerEvents: "none" }}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

/**
 * @param {Object} props
 * @param {string[]} props.problemNames Every catalogued problem's display name -- one node
 *   per entry, including a problem with no reduction in either direction.
 * @param {Object} props.reductionGraphByName `{ [fromName]: { [toName]: edge[] } }`, e.g.
 *   `hooks/useCatalogIndex.js`'s `reductionGraphByName` (already re-keyed from the raw
 *   backend problem codes to display names).
 */
export default function ReductionGraphView({ problemNames, reductionGraphByName }) {
  const idPrefix = useId().replace(/:/g, "");
  const router = useRouter();
  const theme = useTheme();
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const nodeAccent = getFacetAccentColor("blue");
  const edgeAccent = getFacetAccentColor("violet");

  const { nodes, links } = useMemo(() => {
    const builtNodes = problemNames.map((name) => ({ id: name }));
    const builtLinks = [];
    for (const [fromName, toMap] of Object.entries(reductionGraphByName ?? {})) {
      for (const [toName, edges] of Object.entries(toMap)) {
        edges.forEach((edge, index) => {
          builtLinks.push({
            id: `${fromName}->${toName}#${index}`,
            source: fromName,
            target: toName,
            directed: true,
            className: edge.className,
            cost: edge.cost,
            reductionType: edge.reductionType,
          });
        });
      }
    }
    return { nodes: builtNodes, links: builtLinks };
  }, [problemNames, reductionGraphByName]);

  const degreeById = useMemo(() => {
    const degree = new Map();
    for (const link of links) {
      degree.set(link.source, (degree.get(link.source) ?? 0) + 1);
      degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
    }
    return degree;
  }, [links]);

  // Layout is a one-shot simulation keyed only on the graph's own structure, per this
  // component's header decision -- never re-run on hover or navigation.
  const { simNodes, simLinks } = useMemo(() => layoutGraph(nodes, links), [nodes, links]);

  const nodeById = useMemo(() => new Map(simNodes.map((node) => [node.id, node])), [simNodes]);
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

  const viewBox = useMemo(() => computeViewBox(simNodes), [simNodes]);

  const handleOpen = (problemName) => {
    router.push(`/${encodeURIComponent(problemName)}`);
  };

  const nodeCount = simNodes.length;
  const linkCount = displayLinks.length;
  const summary = `Reduction graph with ${nodeCount} problem${nodeCount === 1 ? "" : "s"} and ${linkCount} reduction${linkCount === 1 ? "" : "s"}`;

  return (
    <svg
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
          id={`${idPrefix}-arrow`}
          markerWidth={8}
          markerHeight={6}
          refX={8}
          refY={3}
          orient="auto-start-reverse"
        >
          <path d="M0,0 L0,6 L8,3 Z" fill={edgeAccent} />
        </marker>
      </defs>
      <g>
        {displayLinks.map((link) => (
          <ReductionEdge
            key={link.id}
            link={link}
            idPrefix={idPrefix}
            stroke={edgeAccent}
            allLinks={displayLinks}
            curvatureOverride={{}}
            highlighted={
              hoveredNodeId != null &&
              (link.source.id === hoveredNodeId || link.target.id === hoveredNodeId)
            }
          />
        ))}
      </g>
      <g>
        {simNodes.map((node) => (
          <ReductionNode
            key={node.id}
            node={{
              ...node,
              onEnter: () => setHoveredNodeId(node.id),
              onLeave: () => setHoveredNodeId((current) => (current === node.id ? null : current)),
            }}
            isolated={!degreeById.has(node.id)}
            highlighted={node.id === hoveredNodeId}
            accent={nodeAccent}
            textColor={theme.palette.text.primary}
            mutedTextColor={theme.palette.text.secondary}
            onOpen={handleOpen}
          />
        ))}
      </g>
    </svg>
  );
}
