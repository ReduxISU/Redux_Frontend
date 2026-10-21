// components/workbench/PictureFrame.js
//
// #279 stage 3 (board F): the frame every picture on the problem page sits in, Solve mode's one
// picture and Reduce mode's two alike. Top to bottom:
//   - the caption: the picture's name ("3SAT", "Source · 3SAT", "Target · Clique"), its
//     Visualization Type dropdown, the zoom buttons (−, + and Fit) and Full screen;
//   - in Reduce mode, what the picture shows: "Problem:" and "Algorithm:" (who produced the
//     answer it shows, or that nothing has yet);
//   - the picture itself, about 62% of the window's height (clamped 360 to 680 px), so a tall
//     picture no longer runs down the page on a wide screen and two frames side by side share
//     their top and bottom lines;
//   - a note under the picture, when the picture has one.
// Stacked, in a Workspace 960px wide or less, that height is a minimum: a tall picture on a phone
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
// subgrid, so their captions, Problem / Algorithm lines, pictures and notes line up row by row
// whatever each one's caption holds. When the Workspace is 960px wide or less they stack, source
// first (#279 stage 1).

import Box from "@mui/material/Box";
import { createContext, useEffect, useState } from "react";
import { WORKSPACE_NARROW } from "./layout";

/** A picture's height: about 62% of the window's, never under 360 px or over 680 px. */
export const PICTURE_HEIGHT = "clamp(360px, 62vh, 680px)";

/**
 * Set inside a frame's picture: `{slot}`, the caption's element the zoom buttons are drawn into
 * (null until it mounts). Null outside a frame, where DiagramZoom keeps its own toolbar.
 */
export const PictureToolsContext = createContext(null);

/** The grid two frames sit on, side by side; stacked, source first, in a narrow Workspace. */
export const pictureGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  columnGap: "16px",
  rowGap: 0,
  [WORKSPACE_NARROW]: { display: "flex", flexDirection: "column", gap: 2 },
};

const captionLabelSx = {
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "text.secondary",
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
 * "Problem:" and "Algorithm:" under a frame's caption (Reduce mode).
 * @param {{id: string, problem: string, algorithm: string}} props
 */
export function ShowingPair({ id, problem, algorithm }) {
  return (
    <Box
      component="dl"
      id={id}
      sx={{
        m: 0,
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr)",
        columnGap: 2,
        rowGap: 0.25,
        fontSize: "0.875rem",
        "& dt": { color: "text.secondary" },
        "& dd": { m: 0, fontWeight: 600, color: "text.primary", overflowWrap: "anywhere" },
      }}
    >
      <dt>Problem:</dt>
      <dd id={`${id}-problem`}>{problem}</dd>
      <dt>Algorithm:</dt>
      <dd id={`${id}-algorithm`}>{algorithm}</dd>
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.id The frame's id; its parts derive from it (`-caption`, `-view`,
 *   `-fullscreen`, `-showing`, `-note`).
 * @param {string} props.title The picture's name, at the caption's left.
 * @param {string} [props.titleId] An id for the title (a heading another element points at).
 * @param {import("react").ReactNode} [props.typeControl] The Visualization Type dropdown.
 * @param {{problem: string, algorithm: string}|null} [props.showing] What the picture shows, under
 *   the caption (Reduce mode).
 * @param {string|null} [props.fullScreenTitle] Said in the caption while in full screen, where the
 *   Showing line above the pictures is out of sight.
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
  typeControl = null,
  showing = null,
  fullScreenTitle = null,
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

  const gridSx = inGrid
    ? {
        display: "grid",
        gridTemplateRows: "subgrid",
        gridRow: "span 4",
        rowGap: 1,
        [WORKSPACE_NARROW]: { display: "flex", flexDirection: "column", gap: 1 },
      }
    : { display: "flex", flexDirection: "column", gap: 1 };

  return (
    <Box
      component="figure"
      id={id}
      data-full-screen={on ? "true" : "false"}
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
        component="figcaption"
        id={`${id}-caption`}
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: 1,
          minWidth: 0,
        }}
      >
        <Box
          component="span"
          id={titleId}
          sx={{
            ...captionLabelSx,
            // The name has its own line, so the dropdown and the tools share the next one and
            // two frames side by side wrap alike.
            flexBasis: on && fullScreenTitle ? "auto" : "100%",
            minWidth: 0,
            overflowWrap: "anywhere",
          }}
        >
          {title}
        </Box>
        {on && fullScreenTitle && (
          <Box
            component="span"
            id={`${id}-full-screen-title`}
            sx={{ flex: "1 1 60%", fontWeight: 700, color: "text.primary" }}
          >
            {fullScreenTitle}
          </Box>
        )}
        {typeControl}
        <Box component="span" sx={{ flex: "1 1 0", minWidth: 0 }} />
        {tools && (
          <>
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
          </>
        )}
      </Box>
      {showing ? (
        <ShowingPair id={`${id}-showing`} {...showing} />
      ) : inGrid && !on ? (
        <Box aria-hidden="true" />
      ) : null}
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
          p: 2,
          // Stacked (a Workspace 960px wide or less, phones and tablets) no two frames need to
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
