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
//     page, under the results, in collapsible sections: the Reduction View's Gadgets controls
//     (the Plain / Color switch and the "Point at a piece" readout, in the Gadgets section) and
//     its phase buttons (in the Phases section). With no slot they stay beside the pictures.

import { createContext } from "react";
import { createPortal } from "react-dom";

/** The element the step's caption renders into, or null to keep it under the picture. */
export const StepTextSlot = createContext(null);

/**
 * `{bottom, gadgets, phases}`: `bottom` is true in the workbench, which keeps these pieces at the
 * bottom of the page; `gadgets` and `phases` are the bottom sections' elements (null while a
 * section is not there, and then the piece is not shown). Outside the workbench `bottom` is
 * false and each piece stays beside the pictures.
 */
export const SecondarySlots = createContext({ bottom: false, gadgets: null, phases: null });

/** `children` in the bottom slot `slot` in the workbench (nothing without one), else in place. */
export function AtBottom({ slots, slot, children }) {
  if (!slots.bottom) return children;
  return slot ? createPortal(children, slot) : null;
}

/** `children` in `slot` when there is one, else where it is. */
export function InSlot({ slot, children }) {
  return slot ? createPortal(children, slot) : children;
}
