// components/pictures/pictureSx.js
//
// #199: style pieces every picture renderer shares, so focus and motion behave the same in
// every picture type.

import { paletteVars } from "../theme";

/**
 * #303 (Board G): the color a picture is drawn on, for every fill, knock-out and halo that has
 * to match it (a "Background" piece, a label's backing, the gap a line leaves around text). The
 * picture's card (../workbench/layout.js pictureCardSx) is the mockup's off-white well and sets
 * `--picture-canvas` to it, so each renderer reads the one value the card shows and the two
 * can't drift. Outside a card (a Legend swatch, a picture drawn elsewhere) it is the input white
 * every picture was drawn on before.
 */
export const PICTURE_CANVAS = `var(--picture-canvas, ${paletteVars.surface.input})`;

/** A visible focus ring for anything focusable inside a picture (and the picture itself). */
export const pictureFocusSx = {
  outline: "none",
  "&:focus-visible": {
    outline: "2px solid",
    outlineColor: "brand.line",
    outlineOffset: "2px",
  },
};

/**
 * State changes fade between steps, except for someone who asked for reduced motion: then
 * every transition and animation inside the picture is switched off.
 */
export const pictureMotionSx = {
  "& *": {
    transitionDuration: "150ms",
    transitionProperty: "background-color, color, fill, stroke",
  },
  "@media (prefers-reduced-motion: reduce)": {
    "& *": { transition: "none !important", animation: "none !important" },
  },
};

/** Text for screen readers only (a piece's state, spelled out). */
export const visuallyHiddenSx = {
  position: "absolute",
  width: "1px",
  height: "1px",
  p: 0,
  m: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};
