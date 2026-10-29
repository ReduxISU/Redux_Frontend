// components/pictures/secondarySlots.js
//
// #303 (Board G polish): where a picture's extras go, so the page keeps the mockup's order.
// Like ./zoomControlsSlot.js, each is an element a picture renders into with a portal, so the
// pieces keep their ids, labels and behavior wherever they sit:
//
//   - StepTextSlot: the step's caption (what happened at this step, and the verdict at the end).
//     The workbench's picture pane puts it under the step controls, as Board G does; with no slot
//     (a picture outside the workbench) the caption stays under the picture.
//   - SecondarySlots: what Board G does not show and the workbench keeps at the bottom of the
//     page, under the results, in a collapsible section: the Reduction View's Gadgets controls
//     (the Plain / Color switch and the "Point at a piece" readout, in the Gadgets section). With
//     no slot they stay beside the pictures. (The phase buttons used to wait in a Phases section
//     here too; they now sit above the step controls, ../workbench/VisualizationPane.js.)

import { createContext } from "react";
import { createPortal } from "react-dom";

/** The element the step's caption renders into, or null to keep it under the picture. */
export const StepTextSlot = createContext(null);

/**
 * `{bottom, gadgets}`: `bottom` is true in the workbench, which keeps these pieces at the bottom
 * of the page; `gadgets` is the Gadgets section's element (null while the section is not there,
 * and then the piece is not shown). Outside the workbench `bottom` is false and each piece stays
 * beside the pictures.
 */
export const SecondarySlots = createContext({ bottom: false, gadgets: null });

/** `children` in the bottom slot `slot` in the workbench (nothing without one), else in place. */
export function AtBottom({ slots, slot, children }) {
  if (!slots.bottom) return children;
  return slot ? createPortal(children, slot) : null;
}

/** `children` in `slot` when there is one, else where it is. */
export function InSlot({ slot, children }) {
  return slot ? createPortal(children, slot) : children;
}
