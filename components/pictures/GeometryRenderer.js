// components/pictures/GeometryRenderer.js
//
// #212: the Geometry picture type (ReduxISU/Redux#674), Redux's PICTURE-TYPES.md "Geometry":
// Convex Hull's points drawn to scale on real axes, and the hull Redux's divide-and-conquer
// solver builds from them.
//
// The payload holds the points (`P1`, `P2`, ... by position, with their coordinates); each
// frame holds the hulls on the table (`pieces`, each with its corners counterclockwise and its
// role: `left` and `right` are the two being merged, `piece` a finished hull waiting), the chain
// the merge has walked so far (`chain`, drawn as a line), the answer's corners in output order
// (`hull`, the Done frame only, drawn with order badges) and the points' states (`points`: an id
// that is absent is Background). The two hulls being merged take two group colors (an
// annotation, not a state): their outlines and a tint inside, and their corners' fill, with the
// state as the corner's outline, as a colored graph node's is.
//
// Layout is geometryLayout.js's pure function of the payload and the box's width: the plot with
// its numbers outside it, each label where it meets nothing. Hovering, focusing or tapping a
// point traces it: it is ringed in the trace color with its coordinates beside it, the hulls it
// is not a corner of and the other points fade by color. The diagram opens fitted to its box and
// zooms and pans with DiagramZoom.js; on a phone it is laid out at the box's width, so its text
// keeps its size.
//
// #250: nothing here can be dragged. A point's place is its coordinates, which are the instance
// itself, so a moved point would be a different instance with a different hull.
//
// #239: a gadget's points (`highlightIds`, `gadgetColors`; gadgetRings.js) get a ring around
// the dot, outside the trace ring so both show. Hulls and chains have no ids of their own, so
// nothing names them.

import Box from "@mui/material/Box";
import { useMemo, useRef, useState } from "react";
import { paletteVars } from "../theme";
import DiagramZoom from "./DiagramZoom";
import { GadgetCircle, useGadgetMarks } from "./gadgetRings";
import {
  BADGE_RADIUS,
  DOT_RADIUS,
  formatCoordinate,
  LABEL_SIZE,
  layoutGeometry,
  TICK_SIZE,
} from "./geometryLayout";
import { FAINT_FILTER, groupColors, MONO, nodeLook, TRACE_COLOR } from "./graphPieces";
import { pictureStateStyle, stateOf } from "./pictureStates";
import { useBoxWidth } from "./useBoxWidth";

/** The group color of each role being merged: left blue, right purple (not orange, #850). */
const ROLE_GROUP = { left: 0, right: 2 };

/** A finished hull's dashed outline. */
const PIECE_DASH = "4 3";

/** How much of a merged hull's color tints its inside. */
const HULL_TINT = 14;

/** `color` mixed into the canvas, `percent` of it: a tint, never a see-through color. */
function tint(color, percent) {
  return `color-mix(in srgb, ${color} ${percent}%, ${paletteVars.surface.input})`;
}

/** The ids of a list that are points of the layout, in order. */
function known(list, byId) {
  return (Array.isArray(list) ? list : []).filter((id) => byId.has(id));
}

/** A polygon's or a polyline's points attribute for ids. */
function pathOf(ids, byId) {
  return ids.map((id) => `${byId.get(id).px},${byId.get(id).py}`).join(" ");
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Geometry payload.
 * @param {Object} props.frame The frame to draw.
 * @param {Object[]} [props.frames] Every frame of the run (none before Run): their lines keep
 *   clear of the labels.
 * @param {string[]} [props.highlightIds] Gadget piece ids to mark (#239).
 * @param {Object<string, string>} [props.gadgetColors] Color mode's marks, by piece id (#239).
 */
export default function GeometryRenderer({
  idPrefix,
  name,
  payload,
  frame,
  frames = [],
  highlightIds,
  gadgetColors,
}) {
  const gadgetOf = useGadgetMarks(highlightIds, gadgetColors);
  const boxRef = useRef(null);
  const boxWidth = useBoxWidth(boxRef);
  // The labels keep clear of every line the run draws, so they hold still over its steps; a
  // frame drawn on its own (no run passed) is its own run.
  const run = frames.length ? frames : frame;
  const layout = useMemo(
    () => layoutGeometry(payload, boxWidth ?? undefined, Array.isArray(run) ? run : [run]),
    [payload, boxWidth, run],
  );
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  const byId = useMemo(() => new Map(layout.points.map((point) => [point.id, point])), [layout]);

  const pieces = (Array.isArray(frame?.pieces) ? frame.pieces : [])
    .map((piece, index) => ({
      key: `${piece?.role ?? "piece"}-${index}`,
      role: typeof piece?.role === "string" ? piece.role : "piece",
      points: known(piece?.points, byId),
    }))
    .filter((piece) => piece.points.length > 0);
  const chain = known(frame?.chain, byId);
  const hull = known(frame?.hull, byId);
  const focus = new Set(Array.isArray(frame?.focus) ? frame.focus : []);
  const done = frame?.event === "Done";
  // The group a corner of a hull being merged takes.
  const groupOf = new Map();
  for (const piece of pieces) {
    if (piece.role in ROLE_GROUP) {
      for (const id of piece.points) groupOf.set(id, ROLE_GROUP[piece.role]);
    }
  }
  // A point a Reject step pops off the chain (its focus) gets a dashed red line from the chain's
  // end: the turn that failed.
  const popped =
    frame?.event === "Reject" && chain.length
      ? [...focus].filter((id) => byId.has(id) && id !== chain.at(-1))
      : [];

  // What is traced: a point, and the hulls it is a corner of.
  const traced = byId.get(hover ?? pinned) ?? null;
  const faintPoint = (id) => traced !== null && traced.id !== id;
  const faintPiece = (ids) => traced !== null && !ids.includes(traced.id);

  const toggle = (id) => setPinned((current) => (current === id ? null : id));
  const traceProps = (id) => ({
    "data-focusable": "",
    tabIndex: 0,
    role: "button",
    "aria-pressed": pinned === id,
    onPointerEnter: (event) => {
      if (event.pointerType === "mouse") setHover(id);
    },
    onPointerLeave: (event) => {
      if (event.pointerType === "mouse") setHover(null);
    },
    onFocus: () => setHover(id),
    onBlur: () => setHover(null),
    onClick: () => toggle(id),
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle(id);
      }
    },
  });

  const { plot } = layout;
  const count = layout.points.length;
  const label = `${name}: ${count} ${count === 1 ? "point" : "points"} on the plane${hull.length ? `, a hull of ${hull.length} corners` : ""}.`;
  const solution = pictureStateStyle("Solution");
  const rejected = pictureStateStyle("Rejected");
  const highlight = pictureStateStyle("ElementHighlight");
  const hullOk = done && frame?.ok === true;

  // The traced point's coordinates, on a tag beside it that stays inside the plot.
  let tip = null;
  if (traced) {
    const text = `${traced.id} (${formatCoordinate(traced.x)}, ${formatCoordinate(traced.y)})`;
    const width = text.length * LABEL_SIZE * 0.62 + 14;
    let x = traced.px + 12;
    let y = traced.py + 10;
    if (x + width > plot.x + plot.width - 2) x = traced.px - 12 - width;
    if (x < 2) x = 2;
    if (y + 22 > plot.y + plot.height - 2) y = traced.py - 32;
    tip = { text, x, y, width };
  }

  return (
    <Box
      ref={boxRef}
      id={`${idPrefix}-geometry`}
      data-drawing-width={layout.width}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <DiagramZoom
        idPrefix={idPrefix}
        label={label}
        drawing={layout}
        resetOn={[payload, layout.width]}
      >
        <g data-layer="grid" pointerEvents="none">
          <rect
            x={plot.x}
            y={plot.y}
            width={plot.width}
            height={plot.height}
            fill={paletteVars.surface.input}
            stroke={paletteVars.border.soft}
          />
          {layout.xTicks.map((tick) => (
            <line
              key={`x${tick.text}`}
              x1={tick.at}
              x2={tick.at}
              y1={plot.y}
              y2={plot.y + plot.height}
              data-axis-line={tick.axis ? "x" : undefined}
              stroke={tick.axis ? paletteVars.border.strong : paletteVars.border.soft}
              strokeWidth={tick.axis ? 1.4 : 1}
            />
          ))}
          {layout.yTicks.map((tick) => (
            <line
              key={`y${tick.text}`}
              x1={plot.x}
              x2={plot.x + plot.width}
              y1={tick.at}
              y2={tick.at}
              data-axis-line={tick.axis ? "y" : undefined}
              stroke={tick.axis ? paletteVars.border.strong : paletteVars.border.soft}
              strokeWidth={tick.axis ? 1.4 : 1}
            />
          ))}
          {layout.xTicks
            .filter((tick) => tick.labelled)
            .map((tick) => (
              <text
                key={`xt${tick.text}`}
                x={tick.at}
                y={layout.tickY}
                data-tick="x"
                textAnchor="middle"
                dominantBaseline="central"
                fill={paletteVars.text.secondary}
                fontFamily={MONO}
                fontSize={TICK_SIZE}
              >
                {tick.text}
              </text>
            ))}
          {layout.yTicks
            .filter((tick) => tick.labelled)
            .map((tick) => (
              <text
                key={`yt${tick.text}`}
                x={layout.tickX}
                y={tick.at}
                data-tick="y"
                textAnchor="end"
                dominantBaseline="central"
                fill={paletteVars.text.secondary}
                fontFamily={MONO}
                fontSize={TICK_SIZE}
              >
                {tick.text}
              </text>
            ))}
        </g>
        <g data-layer="hulls" pointerEvents="none">
          {pieces.map((piece) => {
            const group = ROLE_GROUP[piece.role];
            const colors = group === undefined ? null : groupColors(group);
            const stroke = colors ? colors.line : paletteVars.viz.edge;
            const faint = faintPiece(piece.points);
            const common = {
              "data-piece-role": piece.role,
              "data-piece-points": piece.points.join(" "),
              stroke,
              strokeWidth: colors ? 1.8 : 1.4,
              strokeDasharray: colors ? undefined : PIECE_DASH,
              style: faint ? { filter: FAINT_FILTER } : undefined,
            };
            if (piece.points.length >= 3) {
              return (
                <polygon
                  key={piece.key}
                  points={pathOf(piece.points, byId)}
                  {...common}
                  fill={colors ? tint(colors.fill, HULL_TINT) : "none"}
                />
              );
            }
            if (piece.points.length === 2) {
              return (
                <polyline
                  key={piece.key}
                  points={pathOf(piece.points, byId)}
                  {...common}
                  fill="none"
                />
              );
            }
            // A hull of one point is the point itself.
            return <g key={piece.key} {...common} />;
          })}
          {hull.length >= 2 && (
            <polygon
              points={pathOf(hull, byId)}
              data-hull={hull.join(" ")}
              data-ok={hullOk ? "true" : "false"}
              fill={hullOk ? pictureStateStyle("Covered").fill : "none"}
              stroke={hullOk ? solution.line : rejected.line}
              strokeWidth={2.6}
              style={traced && !hull.includes(traced.id) ? { filter: FAINT_FILTER } : undefined}
            />
          )}
          {chain.length >= 2 && (
            <polyline
              points={pathOf(chain, byId)}
              data-chain={chain.join(" ")}
              fill="none"
              stroke={highlight.line}
              strokeWidth={2.6}
              strokeLinejoin="round"
            />
          )}
          {popped.map((id) => {
            const from = byId.get(chain.at(-1));
            const to = byId.get(id);
            return (
              <line
                key={id}
                data-popped={id}
                x1={from.px}
                y1={from.py}
                x2={to.px}
                y2={to.py}
                stroke={rejected.line}
                strokeWidth={2.4}
                strokeDasharray="5 4"
              />
            );
          })}
        </g>
        <g data-layer="points">
          {layout.points.map((point) => {
            const state = stateOf(frame?.points, point.id);
            const group = groupOf.get(point.id);
            const look = nodeLook(state, group);
            const faint = faintPoint(point.id);
            const order = hull.indexOf(point.id);
            const parts = [
              `${point.id} at (${formatCoordinate(point.x)}, ${formatCoordinate(point.y)})`,
            ];
            if (order >= 0) parts.push(`corner ${order + 1} of the hull`);
            else if (group !== undefined) {
              parts.push(`a corner of the ${group === 0 ? "left" : "right"} hull`);
            }
            if (chain.includes(point.id)) parts.push("on the chain");
            if (state !== "Background") parts.push(pictureStateStyle(state).legend);
            const isTraced = traced?.id === point.id;
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={point.id}
                data-point-id={point.id}
                data-state={state}
                data-group={group}
                data-focus={focus.has(point.id) ? "true" : undefined}
                data-order={order >= 0 ? order + 1 : undefined}
                data-traced={traced ? (faint ? "faint" : "trace") : undefined}
                aria-label={parts.join(", ")}
                style={faint ? { filter: FAINT_FILTER } : undefined}
                {...traceProps(point.id)}
              >
                {/* A wider target than the dot, for a finger. */}
                <circle cx={point.px} cy={point.py} r={DOT_RADIUS + 6} fill="transparent" />
                <circle
                  cx={point.px}
                  cy={point.py}
                  r={DOT_RADIUS}
                  data-body=""
                  fill={
                    state === "Background" && group === undefined
                      ? paletteVars.surface.input
                      : look.fill
                  }
                  stroke={isTraced ? TRACE_COLOR : look.line}
                  strokeWidth={isTraced ? 3 : look.strokeWidth}
                  strokeDasharray={isTraced ? undefined : look.dash}
                />
                {isTraced && (
                  <circle
                    cx={point.px}
                    cy={point.py}
                    r={DOT_RADIUS + 4}
                    fill="none"
                    stroke={TRACE_COLOR}
                    strokeWidth={1.8}
                  />
                )}
                <GadgetCircle
                  id={point.id}
                  color={gadgetOf(point.id)}
                  cx={point.px}
                  cy={point.py}
                  r={DOT_RADIUS}
                  gap={8}
                />
                <text
                  x={point.label.x}
                  y={point.label.y}
                  data-label=""
                  dominantBaseline="central"
                  fill={
                    state === "Background"
                      ? paletteVars.text.secondary
                      : pictureStateStyle(state).text
                  }
                  fontFamily={MONO}
                  fontSize={LABEL_SIZE}
                  fontWeight={state === "Background" ? 400 : 700}
                  pointerEvents="none"
                >
                  {point.id}
                </text>
                {order >= 0 && (
                  <g data-badge={order + 1} pointerEvents="none">
                    <circle
                      cx={point.badge.x}
                      cy={point.badge.y}
                      r={BADGE_RADIUS}
                      fill={paletteVars.text.primary}
                      stroke={paletteVars.surface.input}
                      strokeWidth={1.5}
                    />
                    <text
                      x={point.badge.x}
                      y={point.badge.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={paletteVars.surface.input}
                      fontFamily={MONO}
                      fontSize={11}
                      fontWeight={700}
                    >
                      {order + 1}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
        {tip && (
          <g data-tip={traced.id} pointerEvents="none">
            <rect
              x={tip.x}
              y={tip.y}
              width={tip.width}
              height={22}
              rx={6}
              fill={paletteVars.surface.input}
              stroke={TRACE_COLOR}
            />
            <text
              x={tip.x + 7}
              y={tip.y + 11}
              dominantBaseline="central"
              fill={paletteVars.text.primary}
              fontFamily={MONO}
              fontSize={LABEL_SIZE}
            >
              {tip.text}
            </text>
          </g>
        )}
      </DiagramZoom>
    </Box>
  );
}

/**
 * The Legend's entries for what a Geometry picture draws besides states: the two hulls being
 * merged, a finished hull waiting, the merge's chain, a popped point's line and the answer's
 * order badges, each only when the run draws it.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function geometryAnnotations(_payload, frames) {
  const entries = [];
  const list = Array.isArray(frames) ? frames.filter(Boolean) : [];
  const roles = new Set(
    list.flatMap((frame) =>
      (Array.isArray(frame.pieces) ? frame.pieces : []).map((piece) => piece?.role),
    ),
  );
  for (const [role, group] of Object.entries(ROLE_GROUP)) {
    if (!roles.has(role)) continue;
    const colors = groupColors(group);
    entries.push({
      key: `hull-${role}`,
      text: `${role === "left" ? "Left" : "Right"} hull (being merged)`,
      swatch: { kind: "fill", fill: colors.fill, line: colors.line },
    });
  }
  if (roles.has("piece")) {
    entries.push({
      key: "hull-piece",
      text: "Dashed outline (a finished hull waiting to be merged)",
      swatch: { kind: "line", color: paletteVars.viz.edge, dash: PIECE_DASH },
    });
  }
  if (list.some((frame) => Array.isArray(frame.chain) && frame.chain.length >= 2)) {
    entries.push({
      key: "chain",
      text: "Blue line (the chain the merge has walked)",
      swatch: { kind: "line", color: pictureStateStyle("ElementHighlight").line },
    });
  }
  if (
    list.some(
      (frame) =>
        frame.event === "Reject" &&
        Array.isArray(frame.chain) &&
        frame.chain.length &&
        (frame.focus ?? []).some((id) => id !== frame.chain.at(-1)),
    )
  ) {
    entries.push({
      key: "popped",
      text: "Dashed red line (the turn that failed: the point is taken off the chain)",
      swatch: { kind: "line", color: pictureStateStyle("Rejected").line, dash: "5 4" },
    });
  }
  if (list.some((frame) => Array.isArray(frame.hull) && frame.hull.length)) {
    entries.push({
      key: "order",
      text: "Numbered badge (the corner's place in the answer's order)",
      swatch: { kind: "badge", text: "1" },
    });
  }
  return entries;
}
