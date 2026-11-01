// components/pictures/graphPieces.js
//
// #201, #202: the drawing pieces the Graph and Grouped Graph renderers share: how a node or an
// edge looks in a picture state, node bodies and labels, order badges, weight tags, arrowheads,
// the hover/tap trace, and the toggle buttons above a picture. Every color is a theme variable
// from pictureStates.js (states) or themeTokens.js `viz` (edges, groups), so both themes work
// with no code here. Fading is by color (grayscale and a dashed line), never by opacity.

import Box from "@mui/material/Box";
import { paletteVars } from "../theme";
import { NODE_RADIUS, outlineDistance } from "./graphLayout";
import { pictureStateStyle } from "./pictureStates";

export const MONO = '"JetBrains Mono", "Fira Code", Consolas, monospace';

/** The hover/tap trace: the focus ring's color, so "what you point at" reads the same everywhere. */
export const TRACE_COLOR = paletteVars.brand.line;

/** Group (cut side, color class, clique) `index`'s colors; six, then they repeat. */
export function groupColors(index) {
  const families = paletteVars.viz.group;
  return families[`g${((index % 6) + 6) % 6}`];
}

/**
 * How a node (or a literal) looks: its state's fill, outline and label colors, or, for a node
 * with a group, the group's fill and label with the state's outline (so a Rejected node in a
 * coloring still shows its color, outlined in red).
 * @param {string} state A picture state name.
 * @param {number|undefined} group The node's group index, if it has one.
 */
export function nodeLook(state, group) {
  const style = pictureStateStyle(state);
  const strong = state === "ElementHighlight" || state === "Rejected";
  const strokeWidth = state === "Background" ? 1.8 : strong ? 3 : 2.4;
  if (group !== undefined) {
    const colors = groupColors(group);
    return {
      fill: colors.fill,
      ink: colors.ink,
      line: state === "Background" ? colors.line : style.line,
      dash: style.dash,
      strokeWidth: state === "Background" ? 1.8 : 3.2,
      bold: true,
    };
  }
  return {
    fill: style.fill,
    ink: style.ink,
    line: style.line,
    dash: style.dash,
    strokeWidth,
    bold: state === "Solution" || state === "Committed" || state === "Rejected",
  };
}

/** How an edge looks in a state. Background edges are the plain edge grey. */
export function edgeLook(state) {
  if (state === "Background") {
    return { line: paletteVars.viz.edge, width: 1.6, dash: undefined };
  }
  const style = pictureStateStyle(state);
  const width = state === "Covered" ? 2.2 : 3.2;
  return { line: style.line, width, dash: style.dash };
}

/** The faded look of a piece the hover trace leaves out: grey, never transparent. */
export const FAINT_FILTER = "grayscale(1)";
export const FAINT_EDGE = { line: paletteVars.viz.dim, width: 1.4, dash: "3 3" };

/**
 * A node body: a circle for a short label, a pill for a long one, with an optional outer ring
 * (a Steiner terminal's double outline, or the trace ring).
 */
export function NodeBody({ x, y, width, look, ringColor, ringDash }) {
  const pill = width > NODE_RADIUS * 2;
  const common = {
    fill: look.fill,
    stroke: look.line,
    strokeWidth: look.strokeWidth,
    strokeDasharray: look.dash,
  };
  const ring = ringColor && (
    <Ring x={x} y={y} width={width} gap={5} color={ringColor} dash={ringDash} />
  );
  if (pill) {
    return (
      <>
        <rect
          x={x - width / 2}
          y={y - NODE_RADIUS}
          width={width}
          height={NODE_RADIUS * 2}
          rx={NODE_RADIUS}
          data-body=""
          {...common}
        />
        {ring}
      </>
    );
  }
  return (
    <>
      <circle cx={x} cy={y} r={NODE_RADIUS} data-body="" {...common} />
      {ring}
    </>
  );
}

/** An outline `gap` units outside a node body. */
export function Ring({ x, y, width, gap, color, dash, strokeWidth = 1.8 }) {
  const pill = width > NODE_RADIUS * 2;
  const r = NODE_RADIUS + gap;
  if (pill) {
    return (
      <rect
        x={x - width / 2 - gap}
        y={y - r}
        width={width + 2 * gap}
        height={2 * r}
        rx={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        pointerEvents="none"
      />
    );
  }
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={dash}
      pointerEvents="none"
    />
  );
}

/** A label centred on (x, y). */
export function NodeLabel({ x, y, text, color, bold, size = 13 }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill={color}
      fontFamily={MONO}
      fontSize={size}
      fontWeight={bold ? 700 : 400}
      pointerEvents="none"
    >
      {text}
    </text>
  );
}

/** A small round badge (a tour position, a repeat count) at a node's top right. */
export function Badge({ x, y, text, testId }) {
  const wide = String(text).length > 2;
  const r = 9;
  const w = wide ? String(text).length * 6.4 + 8 : 2 * r;
  return (
    <g data-badge={testId} pointerEvents="none">
      <rect
        x={x - w / 2}
        y={y - r}
        width={w}
        height={2 * r}
        rx={r}
        fill={paletteVars.text.primary}
        stroke={paletteVars.surface.input}
        strokeWidth={1.5}
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={paletteVars.surface.input}
        fontFamily={MONO}
        fontSize={10.5}
        fontWeight={700}
      >
        {text}
      </text>
    </g>
  );
}

/**
 * A weight (or a parallel edge's list of weights) on a pill at (x, y). A chosen edge's tag
 * takes the edge's state color, so the answer's weights stand out.
 */
export function WeightTag({ x, y, text, state, faint }) {
  const value = String(text);
  const width = value.length * 7.4 + 12;
  const style = pictureStateStyle(state);
  const stated = !faint && (state === "Solution" || state === "Committed");
  return (
    <g
      data-weight={value}
      pointerEvents="none"
      style={faint ? { filter: FAINT_FILTER } : undefined}
    >
      <rect
        x={x - width / 2}
        y={y - 9}
        width={width}
        height={18}
        rx={9}
        fill={paletteVars.surface.input}
        stroke={stated ? style.line : pictureStateStyle("Background").line}
        strokeWidth={stated ? 1.6 : 1}
        strokeDasharray={stated ? style.dash : undefined}
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={stated ? style.text : pictureStateStyle("Background").text}
        fontFamily={MONO}
        fontSize={11.5}
        fontWeight={stated ? 700 : 400}
      >
        {value}
      </text>
    </g>
  );
}

/**
 * The geometry of an edge from a to b: a straight line between the two outlines, or, when
 * `bend` is set (one of a directed pair a>b, b>a), a curve bowed to one side so the pair don't
 * overlap. Returns the SVG path, the point to put a weight tag on, and, for a directed edge,
 * the arrowhead's polygon at b.
 */
export function edgeGeometry(a, b, widthA, widthB, { directed = false, bend = 0 } = {}) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  // Normal, for the bow.
  const nx = -uy;
  const ny = ux;
  const offset = bend * Math.min(36, length / 4);
  const mid = { x: (a.x + b.x) / 2 + nx * offset, y: (a.y + b.y) / 2 + ny * offset };
  // A quadratic through `mid` at t = 0.5 has its control point at 2*mid - (a+b)/2. The curve
  // leaves a and reaches b along the lines to the control point, so the ends meet the outlines
  // there (for a straight edge the control point is the midpoint).
  const control = { x: 2 * mid.x - (a.x + b.x) / 2, y: 2 * mid.y - (a.y + b.y) / 2 };
  const startDir = { x: control.x - a.x, y: control.y - a.y };
  const endDir = { x: control.x - b.x, y: control.y - b.y };
  const startLen = Math.hypot(startDir.x, startDir.y) || 1;
  const endLen = Math.hypot(endDir.x, endDir.y) || 1;
  const startGap = outlineDistance(startDir.x, startDir.y, widthA);
  const endGap = outlineDistance(endDir.x, endDir.y, widthB) + (directed ? 2 : 0);
  const start = {
    x: a.x + (startDir.x / startLen) * startGap,
    y: a.y + (startDir.y / startLen) * startGap,
  };
  const end = { x: b.x + (endDir.x / endLen) * endGap, y: b.y + (endDir.y / endLen) * endGap };
  let path;
  let label;
  if (offset === 0) {
    path = `M${round(start.x)},${round(start.y)} L${round(end.x)},${round(end.y)}`;
    label = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  } else {
    path = `M${round(start.x)},${round(start.y)} Q${round(control.x)},${round(control.y)} ${round(end.x)},${round(end.y)}`;
    label = mid;
  }
  let arrow = null;
  if (directed) {
    // The arrowhead points along the last stretch of the edge, its tip on the outline.
    const tx = -endDir.x / endLen;
    const ty = -endDir.y / endLen;
    const tip = end;
    const size = 11;
    const back = { x: tip.x - tx * size, y: tip.y - ty * size };
    const side = { x: -ty * (size * 0.5), y: tx * (size * 0.5) };
    arrow = `${round(tip.x)},${round(tip.y)} ${round(back.x + side.x)},${round(back.y + side.y)} ${round(back.x - side.x)},${round(back.y - side.y)}`;
    // Stop the line inside the arrowhead so its end doesn't poke out of the tip.
    const lineEnd = { x: tip.x - tx * size * 0.6, y: tip.y - ty * size * 0.6 };
    path =
      offset === 0
        ? `M${round(start.x)},${round(start.y)} L${round(lineEnd.x)},${round(lineEnd.y)}`
        : path.replace(/ [^ ]+$/, ` ${round(lineEnd.x)},${round(lineEnd.y)}`);
  }
  return { path, label, arrow };
}

function round(value) {
  return Math.round(value * 10) / 10;
}

/**
 * A row of toggle buttons above a picture (Force / Circle, which edges to show). Each button
 * has its own id and aria-pressed.
 * @param {{id: string, label: string, options: Array<{value: string, label: string}>,
 *   value: string, onChange: Function}} props
 */
export function PictureToggle({ id, label, options, value, onChange }) {
  return (
    <Box
      role="group"
      aria-label={label}
      id={id}
      sx={{
        display: "inline-flex",
        border: "1px solid",
        borderColor: "border.main",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {options.map((option) => {
        const pressed = option.value === value;
        return (
          <Box
            key={option.value}
            component="button"
            type="button"
            id={`${id}-${option.value}`}
            aria-pressed={pressed}
            onClick={() => onChange(option.value)}
            sx={{
              minHeight: 32,
              px: 1.5,
              border: "none",
              borderLeft: "1px solid",
              borderColor: "border.main",
              "&:first-of-type": { borderLeft: "none" },
              backgroundColor: pressed ? "surface.raised" : "transparent",
              color: "text.primary",
              fontFamily: "inherit",
              fontSize: "0.8125rem",
              fontWeight: pressed ? 700 : 400,
              cursor: "pointer",
              outline: "none",
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "brand.line",
                outlineOffset: "-2px",
              },
            }}
          >
            {option.label}
          </Box>
        );
      })}
    </Box>
  );
}

/** An ordinal for screen readers: 1st, 2nd, 3rd, 4th, 11th, 21st. */
export function ordinal(n) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th"}`;
}
