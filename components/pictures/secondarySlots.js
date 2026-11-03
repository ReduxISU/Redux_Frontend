// components/pictures/secondarySlots.js
//
// #303 (Board G polish): where a picture's extras go, so the page keeps the mockup's order.
// Like ./zoomControlsSlot.js, each is an element a picture renders into with a portal, so the
// pieces keep their ids, labels and behavior wherever they sit:
//
//   - StepTextSlot: the step's caption (what happened at this step, and the verdict at the end).
//     The workbench's picture pane puts it under the step controls, as Board G does; with no slot
//     (a picture outside the workbench) the caption stays under the picture.
//   - StepFactSlot: a picture's facts about the run (counts, the flow value), on the step's
//     line after the caption (StepFact).
//   - ResultAnswerSlot: a picture's spelled-out answer (the Edit Distance edits), under the
//     workbench's Solve answer (AtAnswer).
//   - SecondarySlots: what Board G does not show and the workbench keeps at the bottom of the
//     page, under the results, in a collapsible section: the Reduction View's Gadgets controls
//     (the Plain / Color switch and the "Point at a piece" readout, in the Gadgets section). With
//     no slot they stay beside the pictures. (The phase buttons used to wait in a Phases section
//     here too; they now sit above the step controls, ../workbench/VisualizationPane.js.)

import Box from "@mui/material/Box";
import { createContext, useContext } from "react";
import { createPortal } from "react-dom";

/** The element the step's caption renders into, or null to keep it under the picture. */
export const StepTextSlot = createContext(null);

/**
 * The element on the step's line a picture's run facts render into (./PictureCanvas.js makes it
 * after the caption), or null where the picture has no step line of its own (before Run, a
 * Reduce pane): there the facts aren't shown.
 */
export const StepFactSlot = createContext(null);

/**
 * A picture's facts about the run so far ("12 nodes so far, 3 cut without exploring", "Flow
 * value: 4"), said on the step's line rather than as fixed-size text around the picture, which
 * doesn't zoom with it. Nothing where there is no step line.
 * @param {{id: string, children: import("react").ReactNode, data?: Object}} props `data` adds
 *   data-* attributes (tests read the numbers off them).
 */
export function StepFact({ id, children, data = {} }) {
  const slot = useContext(StepFactSlot);
  if (!slot) return null;
  return createPortal(
    <Box component="span" id={id} data-step-fact="" {...data} sx={{ display: "block" }}>
      {children}
    </Box>,
    slot,
  );
}

/**
 * Where a picture's spelled-out answer goes (the Edit Distance edits): `{inWorkbench, element}`.
 * The workbench passes the Solve answer row's element (null while there is no answer row, and
 * then nothing shows); outside it (`inWorkbench` false) the answer stays under the picture.
 */
export const ResultAnswerSlot = createContext({ inWorkbench: false, element: null });

/** `children` under the workbench's Solve answer, or in place outside the workbench. */
export function AtAnswer({ children }) {
  const { inWorkbench, element } = useContext(ResultAnswerSlot);
  if (!inWorkbench) return children;
  return element ? createPortal(children, element) : null;
}

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
