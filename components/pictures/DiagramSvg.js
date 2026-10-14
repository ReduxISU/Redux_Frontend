// components/pictures/DiagramSvg.js
//
// #199: the shell every SVG picture renderer draws inside (phase B, #200). React owns the
// SVG: renderers return elements for it, and D3 may only be used for math (d3-force for a
// layout, d3-zoom's transform math, d3-shape's path strings), never d3.select and never a
// lookup by a global #id.
//
// Accessibility comes with the shell:
//   - A diagram with nothing to focus is role="img" with a label, so a screen reader reads it
//     as one picture.
//   - A diagram whose pieces can be focused (`interactive`) is a labelled group instead,
//     because children of role="img" are hidden from screen readers. Each focusable piece is a
//     <g tabIndex={0} aria-label="..."> marked with data-focusable, and gets the focus ring.
//   - Reduced motion switches off every transition inside it (pictureSx.js).

import Box from "@mui/material/Box";
import { pictureFocusSx, pictureMotionSx } from "./pictureSx";

/**
 * @param {Object} props
 * @param {string} props.id Unique id for the <svg>.
 * @param {string} props.label What the diagram shows, read by screen readers.
 * @param {string} props.viewBox The SVG viewBox ("0 0 width height").
 * @param {boolean} [props.interactive] True when pieces inside can be focused.
 * @param {number} [props.minWidth] Narrowest the diagram may get before its box scrolls.
 * @param {import("react").ReactNode} props.children The diagram's elements.
 */
export default function DiagramSvg({ id, label, viewBox, interactive, minWidth, children }) {
  return (
    <Box
      component="svg"
      id={id}
      viewBox={viewBox}
      role={interactive ? "group" : "img"}
      aria-roledescription={interactive ? "diagram" : undefined}
      aria-label={label}
      sx={{
        display: "block",
        width: "100%",
        height: "auto",
        minWidth: minWidth ?? undefined,
        ...pictureMotionSx,
        "& [data-focusable]": { ...pictureFocusSx, cursor: "pointer" },
      }}
    >
      {children}
    </Box>
  );
}
