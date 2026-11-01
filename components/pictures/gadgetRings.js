// components/pictures/gadgetRings.js
//
// #239: the gadget marks every picture renderer draws. A renderer gets two props for them
// (registry.js):
//   - `highlightIds`: the pieces the gadget being pointed at names (a Gadgets row hovered or
//     focused, or a piece pointed at in the Reduction View). Each is marked in the gadget gold,
//     `viz.gadget`.
//   - `gadgetColors`: `{id: color}`, the Reduction View's Color mode, where every gadget has its
//     own color from GADGET_PALETTE and its pieces keep it on both sides. A piece listed here
//     takes this color even while it is also in `highlightIds`.
// The mark is a ring a few units outside a node or a box, or a wide band under an edge, a line or
// a hull (an underlay), so it reads as "this gadget" and never hides the piece's own state
// colors. Nothing is faded by opacity: a piece's own fade (grayscale) fades its mark with it,
// because the mark is drawn inside the piece's own group.
//
// Every mark carries `data-gadget-ring` (the piece id) and `data-gadget-color`, takes no pointer
// events and is hidden from screen readers: the piece's own label and the Reduction View's line
// under the pictures say what is linked.

import { useMemo } from "react";
import { paletteVars } from "../theme";

/** The Plain mark's color: the gadget gold. */
export const GADGET_COLOR = paletteVars.viz.gadget;

/**
 * Color mode's palette (themeTokens.js `viz.gadgetPalette`): four hues none of the picture states
 * use, each at least 3:1 on the canvas in both themes. A reduction with more gadgets cycles it
 * (the Legend says so).
 */
export const GADGET_PALETTE = ["c0", "c1", "c2", "c3"].map(
  (key) => paletteVars.viz.gadgetPalette[key],
);

/** How wide a ring's line is, and how far outside the piece it sits, in drawing units. */
export const GADGET_RING_WIDTH = 3;
export const GADGET_RING_GAP = 4;
/** How far an underlay reaches past each side of the line it sits under. */
export const GADGET_UNDERLAY_SPREAD = 4;

const NO_MARKS = Object.assign(() => null, { any: false });

/**
 * A function from a piece id to its mark's color, or null for no mark.
 * @param {string[]|undefined|null} highlightIds
 * @param {Object<string, string>|undefined|null} gadgetColors
 * @returns {((id: unknown) => string|null) & {any: boolean}} `any` is false when nothing is
 *   marked, so a renderer can skip the work.
 */
export function gadgetMarker(highlightIds, gadgetColors) {
  const hot = new Set(Array.isArray(highlightIds) ? highlightIds : []);
  const colors =
    gadgetColors && typeof gadgetColors === "object" && Object.keys(gadgetColors).length > 0
      ? gadgetColors
      : null;
  if (hot.size === 0 && !colors) return NO_MARKS;
  const mark = (id) => {
    if (typeof id !== "string") return null;
    if (colors && Object.hasOwn(colors, id)) return colors[id];
    return hot.has(id) ? GADGET_COLOR : null;
  };
  mark.any = true;
  return mark;
}

/** gadgetMarker, kept while its inputs stay the same. */
export function useGadgetMarks(highlightIds, gadgetColors) {
  return useMemo(() => gadgetMarker(highlightIds, gadgetColors), [highlightIds, gadgetColors]);
}

function markProps(id, color) {
  return {
    "data-gadget-ring": id,
    "data-gadget-color": color,
    fill: "none",
    stroke: color,
    pointerEvents: "none",
    "aria-hidden": "true",
  };
}

/** A ring around a circle at (cx, cy) of radius r. */
export function GadgetCircle({ id, color, cx, cy, r, gap = GADGET_RING_GAP }) {
  if (!color) return null;
  return (
    <circle cx={cx} cy={cy} r={r + gap} strokeWidth={GADGET_RING_WIDTH} {...markProps(id, color)} />
  );
}

/** A ring around a box (x, y, width, height), its corners rounded `rx` (grown by the gap). */
export function GadgetRect({ id, color, x, y, width, height, rx = 0, gap = GADGET_RING_GAP }) {
  if (!color) return null;
  return (
    <rect
      x={x - gap}
      y={y - gap}
      width={width + 2 * gap}
      height={height + 2 * gap}
      rx={Math.max(0, rx > 0 ? rx + gap : gap)}
      strokeWidth={GADGET_RING_WIDTH}
      {...markProps(id, color)}
    />
  );
}

/**
 * A band under a line, an edge or a hull: the same path, drawn first and wider, so it shows
 * `spread` units past each side of a line `width` wide. Draw it before the piece itself.
 * `closed` paths (a hull) get round joins too.
 */
export function GadgetUnderlay({ id, color, d, width = 2, spread = GADGET_UNDERLAY_SPREAD }) {
  if (!color || !d) return null;
  return (
    <path
      d={d}
      strokeWidth={width + 2 * spread}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...markProps(id, color)}
    />
  );
}

/** A band under a polygon's outline (a hull given as points). */
export function GadgetPolygon({ id, color, points, width = 2, spread = GADGET_UNDERLAY_SPREAD }) {
  if (!color || !points) return null;
  return (
    <polygon
      points={points}
      strokeWidth={width + 2 * spread}
      strokeLinejoin="round"
      {...markProps(id, color)}
    />
  );
}

/**
 * An HTML piece's mark (a cell of an HTML strip): an outline style to spread on its element,
 * plus the data attributes, or {} when it has none.
 */
export function gadgetOutlineProps(id, color) {
  if (!color) return {};
  return {
    "data-gadget-ring": id,
    "data-gadget-color": color,
    style: { outline: `${GADGET_RING_WIDTH}px solid ${color}`, outlineOffset: "2px" },
  };
}
