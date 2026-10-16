// components/pictures/SearchTreeRenderer.js
//
// #217: the Search Tree picture type (ReduxISU/Redux#771), Redux's PICTURE-TYPES.md "Search Tree
// and Game Tree". A second view of a backtracking or branch-and-bound solver (3SAT, Traveling
// Salesperson, Graph Coloring, 3-Dimensional Matching, N-Queens): the choices it made, as a tree
// that grows step by step. Each node is a decision (x1=T, a city, a queen's square); a branch
// the solver cut without exploring is dashed red with the bound or clash that cut it under it, a
// branch it explored and backed out of is solid red, queued nodes wait dashed grey, and the
// answer's path turns green (kept so far, Committed, while a branch and bound may still beat it).
//
// The payload holds only the problem and the instance: the tree comes from the solver's steps,
// so each frame holds the whole tree as it stands after that step (`nodes`, parents first; each
// with its `parent`, `label`, `kind`, `state`, and maybe a `bound`, a best-first `order` or, for
// a fold, how many nodes it `hidden`), what the step is about (`focus`) and the counts so far
// (`total`, `cut`). Redux folds a big tree itself (past about `maxLeaves` leaves: "3 cut",
// "+7 more"), so a frame is never much wider than a dozen leaves.
//
// Before Run there is no tree to draw: the picture says the tree grows once the solver runs.
// Layout is searchTreeLayout.js's pure function of the run's frames, one drawing box for the
// whole run, so a node is the same size at every step and the zoom holds still while stepping;
// zoomed in, a step's node out of view brings the view to the path from the root down to it
// (DiagramZoom.js's `follow`). The tree opens at fit, like every picture; one too wide to read
// there (on a phone, or a wide one on a desktop) zooms in past its text's design size
// (READABLE_SCALE). Hovering, focusing or tapping a node traces its path from the root,
// everything else faded by color.
//
// #250: nothing here can be dragged. The tree is drawn again from every step's own nodes, so a
// node moved by hand would not stay put as the tree grows around it.

import Box from "@mui/material/Box";
import { useMemo, useState } from "react";
import { paletteVars } from "../theme";
import DiagramZoom from "./DiagramZoom";
import { Badge, FAINT_EDGE, FAINT_FILTER, MONO, TRACE_COLOR } from "./graphPieces";
import { pictureStateStyle } from "./pictureStates";
import {
  edgePath,
  layoutSearchTree,
  layoutTree,
  NODE_HEIGHT,
  NOTE_LEADING,
  NOTE_OFFSET,
  NOTE_SIZE,
} from "./searchTreeLayout";

/**
 * The scale (CSS px per drawing unit) the tree's text reads at: its design size, so a label is
 * 11.5 to 12.5 px and a note 10.5 px. A tree that fits only smaller (a wide one on a phone) can
 * still be zoomed in to this scale and past it.
 */
const READABLE_SCALE = 1;

/** The margin around the node and the path the view frames, in drawing units. */
const FRAME_MARGIN = 12;

/** The dash of a branch cut without exploring (and of the node that stands for several). */
const CUT_DASH = "4 4";

/** What a node's kind says, for its label. */
const KIND_TEXT = {
  queued: "queued, not explored yet",
  explored: "explored",
  pruned: "cut without exploring",
  failed: "explored and backed out of",
  solution: "a solution",
  skipped: "skipped",
  hidden: "a step not kept",
};

function plural(count, word, many = `${word}s`) {
  return `${count} ${count === 1 ? word : many}`;
}

/** How a node's box looks: its state's colors, dashed when it was cut or stands for others. */
function nodeBoxLook(node) {
  const style = pictureStateStyle(node.state);
  const strong = node.state === "ElementHighlight" || node.state === "Rejected";
  let dash = style.dash;
  if (node.kind === "pruned" || node.kind === "cut") dash = CUT_DASH;
  if (node.kind === "more" || node.kind === "hidden") dash = "2 3";
  const fold = node.kind === "more" || node.kind === "hidden";
  return {
    fill: fold ? paletteVars.surface.main : style.fill,
    line: style.line,
    ink: fold ? paletteVars.text.secondary : style.ink,
    dash,
    width: node.state === "Background" ? 1.5 : strong ? 3 : 2.2,
    bold: node.state === "Solution" || node.state === "Committed" || node.state === "Rejected",
  };
}

/**
 * How the edge into a node looks. Only what the step is about, the answer's path and what
 * failed are colored; an explored branch stays the plain edge grey, so green means the answer.
 */
function edgeLookInto(node) {
  const plain = { line: paletteVars.viz.edge, width: 1.6, dash: undefined };
  switch (node.state) {
    case "Solution":
      return { line: pictureStateStyle("Solution").line, width: 3.2, dash: undefined };
    case "Committed":
      return { line: pictureStateStyle("Committed").line, width: 3, dash: "8 4" };
    case "ElementHighlight":
      return { line: pictureStateStyle("ElementHighlight").line, width: 2.6, dash: undefined };
    case "Rejected":
      return {
        line: pictureStateStyle("Rejected").line,
        width: 2,
        dash: node.kind === "failed" ? undefined : CUT_DASH,
      };
    case "Untraveled":
      return { ...plain, dash: pictureStateStyle("Untraveled").dash };
    default:
      return node.kind === "more" || node.kind === "hidden" ? { ...plain, dash: "2 3" } : plain;
  }
}

/** The box around `nodes` (each with its note), with FRAME_MARGIN on every side. */
function frameOf(nodes) {
  const left = Math.min(...nodes.map((node) => node.x - node.room / 2));
  const right = Math.max(...nodes.map((node) => node.x + node.room / 2));
  const top = Math.min(...nodes.map((node) => node.y - NODE_HEIGHT / 2));
  const bottom = Math.max(...nodes.map((node) => node.y + NODE_HEIGHT / 2 + node.noteDepth));
  return {
    x: left - FRAME_MARGIN,
    y: top - FRAME_MARGIN,
    width: right - left + 2 * FRAME_MARGIN,
    height: bottom - top + 2 * FRAME_MARGIN,
  };
}

/** A node's label for screen readers: its path from the root, what it is, and its state. */
function nodeAriaLabel(node, path) {
  const parts = [node.label];
  if (path.length > 1) parts.push(`path ${path.join(" → ")}`);
  if (node.kind === "more") parts.push(`${plural(node.hidden ?? 0, "finished node")} folded away`);
  else if (node.kind === "cut") parts.push(`${plural(node.hidden ?? 0, "branch", "branches")} cut`);
  else if (KIND_TEXT[node.kind]) parts.push(KIND_TEXT[node.kind]);
  if (node.state !== "Background") parts.push(pictureStateStyle(node.state).legend);
  if (node.bound) parts.push(node.bound);
  if (node.order !== null) parts.push(`left the queue ${node.order}`);
  if (node.children.length) parts.push(plural(node.children.length, "child", "children"));
  return parts.join(", ");
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Search Tree payload.
 * @param {Object} props.frame The frame to draw.
 * @param {number|null} props.frameIndex The frame shown, or null before Run.
 * @param {Object[]} [props.frames] Every frame of the run (one drawing box for all of them).
 */
export default function SearchTreeRenderer({
  idPrefix,
  name,
  payload,
  frame,
  frameIndex,
  frames = [],
}) {
  // The run's frames share one box; a frame on its own (no run passed) gets its own.
  const run = useMemo(() => layoutSearchTree(frames.length ? frames : [frame]), [frames, frame]);
  const listed = frames.length ? frames.indexOf(frame) : 0;
  const tree = listed >= 0 ? run.trees[listed] : layoutTree(frame?.nodes);
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);

  const byId = useMemo(() => new Map(tree.nodes.map((node) => [node.id, node])), [tree]);
  const pathOf = (node) => {
    const path = [];
    const seen = new Set();
    for (let at = node; at && !seen.has(at.id); at = byId.get(at.parent)) {
      seen.add(at.id);
      path.unshift(at);
    }
    return path;
  };
  // What is traced: a node and its path from the root. (A node gone from this step's tree, after
  // a fold, traces nothing.)
  const pointedAt = hover ?? pinned;
  const traced = pointedAt !== null && byId.has(pointedAt) ? byId.get(pointedAt) : null;
  const near = traced ? new Set(pathOf(traced).map((node) => node.id)) : null;

  const problem = typeof payload?.problem === "string" ? payload.problem : "";
  if (frameIndex === null || frameIndex === undefined) {
    return (
      <Box
        id={`${idPrefix}-tree`}
        data-plain-tree=""
        sx={{
          width: "100%",
          minHeight: 160,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          px: 2,
          textAlign: "center",
          color: "text.secondary",
        }}
      >
        <Box component="p" id={`${idPrefix}-waiting`} sx={{ m: 0, color: "text.primary" }}>
          {`The search tree${problem ? ` of this ${problem} instance` : ""} grows from the solver's choices, step by step.`}
        </Box>
        <Box component="p" sx={{ m: 0, fontSize: "0.875rem" }}>
          Run a backtracking or branch-and-bound solver to draw it.
        </Box>
      </Box>
    );
  }

  const focusId = Array.isArray(frame?.focus) ? frame.focus[0] : undefined;
  // The node the view keeps in sight when zoomed in: the step's, or else the end of the
  // answer's path, or else the root.
  const followed =
    (focusId !== undefined ? byId.get(focusId) : undefined) ??
    tree.nodes.findLast((node) => node.state === "Solution" || node.state === "Committed") ??
    tree.nodes[0];
  const follow = followed ? { key: `${frameIndex}:${followed.id}`, ...frameOf([followed]) } : null;
  // Zoomed in, the view frames the path from the root down to that node (as much as fits).
  if (follow) follow.path = frameOf(pathOf(followed));
  const total = Number.isInteger(frame?.total) ? frame.total : null;
  const cut = Number.isInteger(frame?.cut) ? frame.cut : null;
  const label = `${name}: ${plural(tree.nodes.length, "node")} drawn${total !== null ? `, ${total} made so far` : ""}${cut !== null ? `, ${cut} cut` : ""}.`;

  const toggle = (id) => setPinned((current) => (current === id ? null : id));

  return (
    <Box
      id={`${idPrefix}-tree`}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <DiagramZoom
        idPrefix={idPrefix}
        label={label}
        drawing={run}
        resetOn={[payload, frames]}
        follow={follow}
        readableScale={READABLE_SCALE}
        toolbar={
          total !== null ? (
            <Box
              id={`${idPrefix}-summary`}
              data-total={total}
              data-cut={cut ?? undefined}
              sx={{ fontSize: "0.8125rem", color: "text.secondary" }}
            >
              {`${plural(total, "node")} so far`}
              {cut !== null ? `, ${cut} cut without exploring` : ""}
            </Box>
          ) : null
        }
      >
        {tree.nodes.length === 0 && (
          <text
            x={run.width / 2}
            y={run.height / 2}
            data-empty-tree=""
            textAnchor="middle"
            dominantBaseline="central"
            fill={paletteVars.text.secondary}
            fontFamily={MONO}
            fontSize={13}
          >
            Nothing explored yet.
          </text>
        )}
        <g data-layer="edges">
          {tree.nodes.map((node) => {
            const parent = node.parent !== null ? byId.get(node.parent) : null;
            if (!parent) return null;
            const onPath = near !== null && near.has(node.id);
            let look = edgeLookInto(node);
            if (near !== null)
              look = onPath ? { line: TRACE_COLOR, width: 3, dash: undefined } : FAINT_EDGE;
            return (
              <path
                key={node.id}
                data-edge-into={node.id}
                data-traced={near ? (onPath ? "trace" : "faint") : undefined}
                d={edgePath(parent, node)}
                fill="none"
                stroke={look.line}
                strokeWidth={look.width}
                strokeDasharray={look.dash}
                strokeLinecap="round"
              />
            );
          })}
        </g>
        <g data-layer="nodes">
          {tree.nodes.map((node) => {
            const look = nodeBoxLook(node);
            const faint = near !== null && !near.has(node.id);
            const isTraced = traced?.id === node.id;
            const isFocus = node.id === focusId;
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={node.id}
                data-node-id={node.id}
                data-state={node.state}
                data-kind={node.kind}
                data-depth={node.depth}
                data-order={node.order ?? undefined}
                data-hidden={node.hidden ?? undefined}
                data-focus={isFocus ? "true" : undefined}
                data-traced={near ? (faint ? "faint" : "trace") : undefined}
                data-focusable=""
                tabIndex={0}
                role="button"
                aria-pressed={pinned === node.id}
                aria-label={nodeAriaLabel(
                  node,
                  pathOf(node).map((step) => step.label),
                )}
                style={faint ? { filter: FAINT_FILTER } : undefined}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") setHover(node.id);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") setHover(null);
                }}
                onFocus={() => setHover(node.id)}
                onBlur={() => setHover(null)}
                onClick={() => toggle(node.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggle(node.id);
                  }
                }}
              >
                {node.bound && <title>{node.bound}</title>}
                {/* The node's whole area, its note too, takes the pointer. */}
                <rect
                  x={node.x - node.room / 2}
                  y={node.y - NODE_HEIGHT / 2}
                  width={node.room}
                  height={NODE_HEIGHT + node.noteDepth}
                  fill="transparent"
                />
                <rect
                  x={node.x - node.width / 2}
                  y={node.y - NODE_HEIGHT / 2}
                  width={node.width}
                  height={NODE_HEIGHT}
                  rx={7}
                  data-body=""
                  fill={look.fill}
                  stroke={isTraced ? TRACE_COLOR : look.line}
                  strokeWidth={isTraced ? 3 : look.width}
                  strokeDasharray={isTraced ? undefined : look.dash}
                />
                <text
                  x={node.x}
                  y={node.y}
                  data-label=""
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={look.ink}
                  fontFamily={MONO}
                  fontSize={node.kind === "more" || node.kind === "cut" ? 11.5 : 12.5}
                  fontWeight={look.bold ? 700 : 400}
                  pointerEvents="none"
                >
                  {node.label}
                </text>
                {node.note.length > 0 && (
                  <text
                    x={node.x}
                    y={node.y + NOTE_OFFSET}
                    data-note={node.bound}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={
                      node.state === "Rejected"
                        ? pictureStateStyle("Rejected").text
                        : paletteVars.text.secondary
                    }
                    fontFamily={MONO}
                    fontSize={NOTE_SIZE}
                    pointerEvents="none"
                  >
                    {node.note.map((line, index) => (
                      <tspan key={line} x={node.x} dy={index ? NOTE_LEADING : 0}>
                        {line}
                      </tspan>
                    ))}
                  </text>
                )}
                {node.order !== null && (
                  <Badge
                    x={node.x - node.width / 2 + 2}
                    y={node.y - NODE_HEIGHT / 2 + 1}
                    text={node.order}
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
 * The Legend's entries for what a Search Tree draws besides states: cut and backed-out branches,
 * the folds, order badges and the notes under nodes (each only when the run has them).
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function searchTreeAnnotations(payload, frames) {
  const entries = [];
  const nodes = (Array.isArray(frames) ? frames : []).flatMap((frame) =>
    Array.isArray(frame?.nodes) ? frame.nodes : [],
  );
  const has = (test) => nodes.some((node) => node && test(node));
  const red = pictureStateStyle("Rejected").line;
  if (has((node) => node.kind === "pruned" || node.kind === "cut")) {
    entries.push({
      key: "cut",
      text: "Dashed red branch (cut without exploring, by a bound or a clash)",
      swatch: { kind: "line", color: red, dash: CUT_DASH },
    });
  }
  if (has((node) => node.kind === "failed")) {
    entries.push({
      key: "failed",
      text: "Solid red branch (explored, then backed out of)",
      swatch: { kind: "line", color: red },
    });
  }
  if (has((node) => node.kind === "cut")) {
    entries.push({
      key: "cut-fold",
      text: "k cut (that many cut branches drawn as one)",
      swatch: { kind: "text", text: "3 cut" },
    });
  }
  if (has((node) => node.kind === "more")) {
    entries.push({
      key: "more-fold",
      text: "+k more (a finished branch folded away)",
      swatch: { kind: "text", text: "+k" },
    });
  }
  if (has((node) => Number.isInteger(node.order))) {
    entries.push({
      key: "order",
      text: "Order (when the node left the queue)",
      swatch: { kind: "badge" },
    });
  }
  if (has((node) => typeof node.bound === "string" && node.bound)) {
    entries.push({
      key: "bound",
      text: "Note under a node (the bound or clash that decided it)",
      swatch: { kind: "text", text: "lb" },
    });
  }
  return entries;
}
