// components/workbench/PaneGrid.js
//
// #303 stage 2 (Board G): Reduce's two pictures, the source on the left and the target on the
// right with an arrow between them. Each pane has its own header: a label row ("PROBLEM 3SAT ·
// STATUS not built yet") and a controls row (the Picture menu, the picture's zoom buttons and
// Full screen for that pane), then the picture, then a note under it. The header rows line up
// across the two panes: the grid has four shared rows and each pane is a subgrid spanning them
// (the mockup's `g-fig4`), so a label that wraps on one side pushes both sides' controls down
// together. The picture row is shared too, so the two picture areas are always the same height
// (`${id}-picture-area`), and the picture's card (./layout.js pictureCardSx, a hairline border
// the reader can see) fills its area, so the two cards are visibly one height, a shorter picture
// centered in its card. At 900 px and narrower the
// panes stack, source first, with the arrow turned to point down between them, each picture at
// its own height.
//
// Used by VisualizationPane.js before a Reduction View arrives (the default picture and the
// target's placeholder, or the older reduction's two frames) and by the Reduction View itself
// (../pictures/ReductionView.js), so both look the same. Each pane hands its controls row to
// the picture's DiagramZoom (../pictures/zoomControlsSlot.js), so the zoom buttons sit beside
// that pane's Picture menu.

import Box from "@mui/material/Box";
import { useContext, useState } from "react";
import { PictureFullScreen, ZoomControlsSlot } from "../pictures/zoomControlsSlot";
import { PANES_STACK_MEDIA, secondaryButtonSx } from "./layout";

const ARROW_PATH = "M2 12h30M24 4l8 8-8 8";

/** One pane's four rows on full screen: label, controls, picture, note. */
const FULL_PANE_ROWS = "auto auto minmax(280px, 1fr) auto";

/**
 * Full screen on and off (#303): the four-corners icon, a 44px target. `text` adds the words
 * beside the icon (Reduce's both-pictures button, as the mockup has it). #305: while on, every
 * one says "Exit full screen" in words too, since it is full screen's only way out (with Escape).
 * @param {{id: string, on: boolean, onToggle: () => void, label?: string, text?: boolean}} props
 *   `label` is the button's accessible name while it is off.
 */
export function FullScreenButton({ id, on, onToggle, label = "Full screen", text = false }) {
  const name = on ? "Exit full screen" : label;
  const words = text || on;
  return (
    <Box
      id={id}
      component="button"
      type="button"
      aria-label={name}
      aria-pressed={on}
      onClick={onToggle}
      sx={{
        ...secondaryButtonSx,
        ...(words ? { px: 1.5, gap: 1 } : { width: 44, px: 0 }),
        flex: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d={
            on ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" : "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
          }
        />
      </svg>
      {words && (
        <Box component="span" aria-hidden="true" sx={{ whiteSpace: "nowrap" }}>
          {on ? "Exit full screen" : "Full screen"}
        </Box>
      )}
    </Box>
  );
}

/**
 * A pane's label row: "PROBLEM 3SAT  ANSWER mapped back from Clique", each part a small
 * uppercase key and its value, wrapping as a unit.
 * @param {{id: string, parts: Array<{k: string, v: string}>}} props
 */
function PaneLabel({ id, parts }) {
  return (
    <Box
      component="h3"
      id={id}
      sx={{
        m: 0,
        minWidth: 0,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: "2px 12px",
        fontSize: "0.875rem",
        fontWeight: 700,
        color: "text.primary",
      }}
    >
      {parts.map((part, index) => (
        <Box
          component="span"
          key={part.k}
          data-part={part.k}
          sx={{ display: "inline-flex", alignItems: "baseline", gap: "6px", minWidth: 0 }}
        >
          <Box
            component="span"
            sx={{
              fontSize: "0.6875rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "text.secondary",
            }}
          >
            {part.k}
          </Box>{" "}
          <Box component="span" sx={{ overflowWrap: "anywhere" }}>
            {part.v}
          </Box>
          {index < parts.length - 1 ? " " : null}
        </Box>
      ))}
    </Box>
  );
}

/**
 * One pane: label row, controls row, the picture, a note. A subgrid of PaneGrid's four rows.
 * @param {Object} props
 * @param {string} props.id The pane's id prefix: the section is `${id}-pane`, its label
 *   `${id}-title`, its controls row `${id}-controls` and its zoom slot `${id}-zoom-slot`.
 * @param {"source"|"target"} props.which Which side, for the grid column.
 * @param {Array<{k: string, v: string}>} props.parts The label row.
 * @param {import("react").ReactNode} [props.typeControl] The Picture menu.
 * @param {{id: string, on: boolean, onToggle: () => void}|null} [props.full] The pane's own
 *   Full screen button.
 * @param {boolean} [props.hidden] Hidden while the other pane is full screen (kept mounted, so
 *   its zoom and its moved pieces survive).
 * @param {import("react").ReactNode} [props.note] Said under the picture.
 * @param {import("react").ReactNode} props.children The picture.
 */
export function PaneSection({
  id,
  which,
  parts,
  typeControl = null,
  full = null,
  hidden = false,
  note = null,
  children,
}) {
  const [zoomSlot, setZoomSlot] = useState(null);
  const pictureFull = useContext(PictureFullScreen);
  const column = which === "source" ? 1 : 3;
  return (
    <Box
      component="section"
      id={`${id}-pane`}
      data-pane-side={which}
      aria-labelledby={`${id}-title`}
      sx={{
        display: hidden ? "none" : "grid",
        gridTemplateRows: "subgrid",
        gridColumn: column,
        gridRow: "1 / span 4",
        rowGap: "10px",
        minWidth: 0,
        [PANES_STACK_MEDIA]: { gridColumn: 1, gridRow: "auto / span 4" },
      }}
    >
      <Box sx={{ minWidth: 0, alignSelf: "end" }}>
        <PaneLabel id={`${id}-title`} parts={parts} />
      </Box>
      <Box
        id={`${id}-controls`}
        sx={{
          display: "flex",
          flexWrap: "wrap",
          // Top edges, so each pane's Picture menu starts at the same height even when one
          // pane's controls wrap to a second line.
          alignItems: "flex-start",
          gap: "6px 8px",
          minWidth: 0,
        }}
      >
        {typeControl}
        <Box
          ref={setZoomSlot}
          id={`${id}-zoom-slot`}
          sx={{
            display: "flex",
            flex: "none",
            alignItems: "center",
            whiteSpace: "nowrap",
            "&:empty": { display: "none" },
          }}
        />
        {full && (
          <FullScreenButton
            id={full.id}
            on={full.on}
            onToggle={full.onToggle}
            label="Full screen: this picture"
          />
        )}
      </Box>
      {/* The picture row is shared, so both pictures' areas are the taller one's height, and
          the picture's card stretches to fill its area (its `flex`), a shorter picture in the
          middle of its card. Stacked, each keeps its own height. */}
      <Box
        id={`${id}-picture-area`}
        sx={{
          minWidth: 0,
          alignSelf: "stretch",
          display: "flex",
          flexDirection: "column",
          [PANES_STACK_MEDIA]: { display: pictureFull ? "flex" : "block" },
        }}
      >
        <ZoomControlsSlot.Provider value={zoomSlot}>{children}</ZoomControlsSlot.Provider>
      </Box>
      <Box
        id={`${id}-pane-note`}
        sx={{ minWidth: 0, fontSize: "0.8125rem", color: "text.secondary" }}
      >
        {note}
      </Box>
    </Box>
  );
}

/**
 * The two panes and the arrow between them.
 * @param {Object} props
 * @param {string} props.id The grid's id.
 * @param {"source"|"target"|null} [props.only] The pane on full screen alone: the grid is one
 *   column and the arrow goes.
 * @param {import("react").ReactNode} props.source A PaneSection.
 * @param {import("react").ReactNode} props.target A PaneSection.
 */
export function PaneGrid({ id, only = null, source, target }) {
  const pictureFull = useContext(PictureFullScreen);
  return (
    <Box
      id={id}
      data-only={only ?? undefined}
      data-pane-grid="true"
      sx={{
        display: "grid",
        gridTemplateColumns: only ? "minmax(0, 1fr)" : "minmax(0, 1fr) auto minmax(0, 1fr)",
        columnGap: "16px",
        rowGap: "10px",
        alignItems: "start",
        minWidth: 0,
        // A pane alone takes the one column.
        "& > section": only ? { gridColumn: 1 } : {},
        [PANES_STACK_MEDIA]: { gridTemplateColumns: "minmax(0, 1fr)" },
        // On full screen the picture rows share what the labels and controls leave.
        ...(pictureFull
          ? {
              flex: "1 1 auto",
              gridTemplateRows: FULL_PANE_ROWS,
              [PANES_STACK_MEDIA]: {
                gridTemplateColumns: "minmax(0, 1fr)",
                gridTemplateRows: only
                  ? FULL_PANE_ROWS
                  : `${FULL_PANE_ROWS} auto ${FULL_PANE_ROWS}`,
              },
            }
          : {}),
      }}
    >
      {source}
      <Box
        id={`${id}-arrow`}
        aria-hidden="true"
        sx={{
          display: only ? "none" : "flex",
          gridColumn: 2,
          gridRow: "1 / span 4",
          alignSelf: "center",
          justifySelf: "center",
          alignItems: "center",
          justifyContent: "center",
          color: "text.secondary",
          [PANES_STACK_MEDIA]: {
            gridColumn: 1,
            gridRow: "auto",
            transform: "rotate(90deg)",
            my: "-4px",
          },
        }}
      >
        <svg
          width="36"
          height="24"
          viewBox="0 0 36 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={ARROW_PATH} />
        </svg>
      </Box>
      {target}
    </Box>
  );
}
