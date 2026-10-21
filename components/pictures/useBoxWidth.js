// components/pictures/useBoxWidth.js
//
// #207, #208, #212: the width of the box a picture is drawn in, for a picture whose layout takes
// it (Packing, Board, Geometry), so on a phone the drawing is laid out at its own size, not
// shrunk to fit with its text.

import { useEffect, useState } from "react";

/** The width of the box `ref` is on, in CSS px, kept current; null until it is measured. */
export function useBoxWidth(ref) {
  const [width, setWidth] = useState(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    // Whole pixels, rounded down: a layout never wider than its box, so a box of 307.7 px
    // (clientWidth says 308) still draws the picture at its own size, not a hair under it.
    const measure = () => setWidth(Math.floor(element.getBoundingClientRect().width) || null);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}
