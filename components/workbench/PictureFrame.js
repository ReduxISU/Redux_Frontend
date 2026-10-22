// components/workbench/PictureFrame.js
//
// #279 stage 3 (board F): the frame every picture on the problem page sits in, Solve mode's one
// picture and Reduce mode's two alike. #279 (Workspace tweaks) made each frame its own outlined
// section. Top to bottom:
//   - its heading: the picture's problem ("3SAT" in Solve mode, "Source: 3SAT" and
//     "Target: Clique" in Reduce mode), then, quieter and after a dot, what the picture shows
//     when that adds something ("3SAT Backtracking steps", "answer mapped back from Clique");
//     a plain picture says nothing more. The heading sits outside the picture;
//   - one row of controls: the Visualization Type dropdown, the zoom buttons (−, + and Fit, and
//     Reset layout where the picture has one) and Full screen;
//   - the picture itself, about 62% of the window's height (clamped 360 to 680 px), so a tall
//     picture no longer runs down the page on a wide screen and two frames side by side share
//     their top and bottom lines;
//   - a note under the picture, when the picture has one.
// The old "Problem:" and "Algorithm:" lines are gone: Execute names the algorithm.
// Stacked, in a Visualization pane 960px wide or less, that height is a minimum: a tall picture on a phone
// grows to its own shape (up to the screen's height), as before, so its text stays readable.
//
// The zoom buttons are DiagramZoom's own (components/pictures/DiagramZoom.js): a renderer's
// DiagramZoom finds this frame through PictureToolsContext, draws its buttons into the caption
// (a portal) and fills the picture's height instead of following the drawing's shape. So there
// is one zoom and pan, with Ctrl or Cmd + wheel and pinch zooming and a plain wheel scrolling the
// page, as before. A picture drawn by an older renderer has no zoom buttons.
//
// Full screen lays the frame over the whole window, with the step timeline (`timeline`, the
// Algorithm Steps controls) at its bottom; "Exit full screen" or Escape puts it back. Nothing in a
// picture can be selected as text (user-select: none), so a drag pans rather than painting a
// highlight.
//
// Two frames side by side (`inGrid`) sit on pictureGridSx, each spanning its four rows as a
// subgrid, so their headings, control rows, pictures and notes line up row by row whatever each
// one's row holds. When the Visualization pane is 960px wide or less they stack, source
// first (#279 stage 1).

import Box from "@mui/material/Box";
import { createContext, useEffect, useState } from "react";
import { COMPACT_MEDIA, WORKSPACE_NARROW } from "./layout";

/** A picture's height: about 62% of the window's, never under 360 px or over 680 px. */
export const PICTURE_HEIGHT = "clamp(360px, 62vh, 680px)";

/** The picture's own inner padding, inside its filled box. */
const VIEW_PADDING = 16;

/** A frame's section padding on phones and tablets, inside its 1 px outline. */
const SECTION_COMPACT_PADDING = 8;

/**
 * The picture's side padding on phones and tablets: its own less what the frame's section
 * (outline and padding) takes, so the picture is exactly as wide as before frames were outlined
 * and the pictures sized for a phone's width (Table, Quantum Circuit, Tripartite Matching,
 * Packing) still draw their text at its own size.
 */
const VIEW_COMPACT_SIDE_PADDING = VIEW_PADDING - SECTION_COMPACT_PADDING - 1;

/**
 * Set inside a frame's picture: `{slot}`, the caption's element the zoom buttons are drawn into
 * (null until it mounts). Null outside a frame, where DiagramZoom keeps its own toolbar.
 */
export const PictureToolsContext = createContext(null);

/** The grid two frames sit on, side by side; stacked, source first, in a narrow pane. */
export const pictureGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  columnGap: "16px",
  rowGap: 0,
  [WORKSPACE_NARROW]: { display: "flex", flexDirection: "column", gap: 2 },
};

const toolButtonSx = {
  minHeight: 36,
  display: "inline-flex",
  alignItems: "center",
  gap: 0.75,
  px: 1.25,
  border: "1px solid",
  borderColor: "border.main",
  borderRadius: "8px",
  backgroundColor: "surface.input",
  color: "text.primary",
  fontFamily: "inherit",
  fontSize: "0.8125rem",
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
  "&:hover": { backgroundColor: "surface.raised" },
  "&:focus-visible": { outline: "2px solid", outlineColor: "brand.line", outlineOffset: "2px" },
};

function FullScreenIcon({ exit }) {
  return (
    <Box
      component="svg"
      aria-hidden="true"
      viewBox="0 0 24 24"
      sx={{ width: 16, height: 16, fill: "none", stroke: "currentColor", strokeWidth: 2 }}
    >
      <path
        d={
          exit ? "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" : "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
        }
      />
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.id The frame's id; its parts derive from it (`-heading`, `-status`,
 *   `-caption` (the controls row), `-view`, `-fullscreen`, `-note`).
 * @param {string} props.title The picture's problem ("Source: 3SAT"), the heading.
 * @param {string} [props.titleId] An id for the title's text.
 * @param {string|null} [props.status] What the picture shows, after the title, when that adds
 *   something ("3SAT Backtracking steps").
 * @param {import("react").ReactNode} [props.typeControl] The Visualization Type dropdown.
 * @param {import("react").ReactNode} [props.note] A line under the picture.
 * @param {string} [props.noteId] The note's id, when not `${id}-note`.
 * @param {boolean} [props.inGrid] One of two frames on pictureGridSx.
 * @param {boolean} [props.tools] False for a frame with no picture in it yet (the target before a
 *   build): no zoom slot and no Full screen.
 * @param {import("react").ReactNode} [props.timeline] The step controls shown at the bottom of
 *   the frame in full screen.
 * @param {"center"|"stretch"} [props.align] How the picture's content sits: a picture fills the
 *   frame (stretch); a message is centred.
 * @param {import("react").ReactNode} props.children The picture.
 */
export default function PictureFrame({
  id,
  title,
  titleId,
  status = null,
  typeControl = null,
  note = null,
  noteId,
  inGrid = false,
  tools = true,
  timeline = null,
  align = "stretch",
  children,
}) {
  const [fullScreen, setFullScreen] = useState(false);
  const [slot, setSlot] = useState(null);
  const on = fullScreen && tools;

  // Escape leaves full screen (unless something inside already used it, an open dropdown), and
  // the page behind does not scroll while the frame covers it.
  useEffect(() => {
    if (!on) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape" && !event.defaultPrevented) setFullScreen(false);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [on]);

  // Each frame is its own outlined section, so two side by side read as two.
  const sectionSx = {
    border: "1px solid",
    borderColor: "border.soft",
    borderRadius: "12px",
    p: 2,
    // Phones and tablets keep the room for the picture: the picture's own padding gives back
    // what this takes (VIEW_COMPACT_SIDE_PADDING).
    [COMPACT_MEDIA]: { p: `${SECTION_COMPACT_PADDING}px` },
    boxSizing: "border-box",
  };
  const gridSx = inGrid
    ? {
        ...sectionSx,
        display: "grid",
        gridTemplateRows: "subgrid",
        gridRow: "span 4",
        rowGap: 1,
        [WORKSPACE_NARROW]: { display: "flex", flexDirection: "column", gap: 1 },
      }
    : { ...sectionSx, display: "flex", flexDirection: "column", gap: 1 };
  const headingId = `${id}-heading`;

  return (
    <Box
      component="figure"
      id={id}
      data-full-screen={on ? "true" : "false"}
      aria-labelledby={on ? undefined : headingId}
      aria-label={on ? `${title}, full screen` : undefined}
      sx={{
        m: 0,
        minWidth: 0,
        ...(on
          ? {
              position: "fixed",
              inset: 0,
              zIndex: 1250,
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
              p: 2,
              boxSizing: "border-box",
              backgroundColor: "surface.main",
              overflow: "auto",
            }
          : gridSx),
      }}
    >
      <Box
        component="h3"
        id={headingId}
        data-status={status ?? ""}
        sx={{
          m: 0,
          minWidth: 0,
          fontSize: "0.9375rem",
          fontWeight: 700,
          color: "text.primary",
          overflowWrap: "anywhere",
        }}
      >
        <Box component="span" id={titleId ?? `${id}-title`}>
          {title}
        </Box>
        {status && (
          <Box component="span" sx={{ fontWeight: 500, color: "text.secondary" }}>
            {" · "}
            <Box component="span" id={`${id}-status`}>
              {status}
            </Box>
          </Box>
        )}
      </Box>
      <Box
        id={`${id}-caption`}
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: 1,
          minWidth: 0,
        }}
      >
        {typeControl}
        {tools && (
          // The view controls keep their size at the row's right; the dropdown grows up to them.
          <Box
            component="span"
            id={`${id}-view-controls`}
            sx={{
              ml: "auto",
              flex: "0 0 auto",
              // On its own line on a narrow phone, the controls wrap within it.
              maxWidth: "100%",
              display: "inline-flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 1,
              minWidth: 0,
            }}
          >
            <Box
              ref={setSlot}
              component="span"
              id={`${id}-tools`}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                "&:empty": { display: "none" },
              }}
            />
            <Box
              component="button"
              type="button"
              id={`${id}-fullscreen`}
              aria-pressed={on}
              onClick={() => setFullScreen((current) => !current)}
              sx={toolButtonSx}
            >
              <FullScreenIcon exit={on} />
              {on ? "Exit full screen" : "Full screen"}
            </Box>
          </Box>
        )}
      </Box>
      <Box
        id={`${id}-view`}
        data-picture-view=""
        aria-describedby={on ? `${id}-escape` : undefined}
        sx={{
          position: "relative",
          minWidth: 0,
          minHeight: 0,
          height: on ? "auto" : PICTURE_HEIGHT,
          flex: on ? "1 1 auto" : "none",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: align === "center" ? "center" : "stretch",
          overflow: "auto",
          // A frame with no picture yet (the target before a build) is drawn dashed and empty.
          backgroundColor: tools ? "surface.input" : "transparent",
          border: tools ? "none" : "1px dashed",
          borderColor: "border.main",
          borderRadius: "10px",
          p: `${VIEW_PADDING}px`,
          // Inside a frame's outlined section on a phone or tablet (not in full screen, which has
          // no section), the sides give back the section's outline and padding.
          ...(on ? {} : { [COMPACT_MEDIA]: { px: `${VIEW_COMPACT_SIDE_PADDING}px` } }),
          // Stacked (a pane 960px wide or less, phones and tablets) no two frames need to
          // line up, so a tall picture grows past the height rather than shrinking its text
          // below reading size; every frame is still at least that high.
          [WORKSPACE_NARROW]: on ? {} : { height: "auto", minHeight: PICTURE_HEIGHT },
          boxSizing: "border-box",
          // No text selection inside a picture: a drag pans it instead of painting a highlight.
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          // Every box between the frame and the zoom area grows with it, so the picture fills
          // the frame's height (DiagramZoom marks its area).
          "& *:has([data-zoom-area])": {
            flex: "1 1 auto",
            minHeight: 0,
          },
        }}
      >
        <PictureToolsContext.Provider value={tools ? { slot } : null}>
          {children}
        </PictureToolsContext.Provider>
      </Box>
      {on && (
        <Box component="span" id={`${id}-escape`} sx={{ display: "none" }}>
          Escape leaves full screen.
        </Box>
      )}
      {note ? (
        <Box id={noteId ?? `${id}-note`} sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
          {note}
        </Box>
      ) : inGrid && !on ? (
        <Box aria-hidden="true" />
      ) : null}
      {on && timeline}
    </Box>
  );
}
