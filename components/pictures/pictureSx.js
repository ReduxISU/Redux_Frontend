// components/pictures/pictureSx.js
//
// #199: style pieces every picture renderer shares, so focus and motion behave the same in
// every picture type.

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
