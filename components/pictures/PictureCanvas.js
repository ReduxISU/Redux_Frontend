// components/pictures/PictureCanvas.js
//
// #199: draws one frame of a format=frames picture with the renderer registered for its
// picture type (./registry.js).
//
// #279: the step's caption (what the solver did at this step, in Redux's own words, with the
// step's event and, on the last step, the run's verdict) is FrameCaption, below. It used to sit
// under the renderer, inside the picture's box, where a picture that fills its box (on a phone,
// in full screen) drew over it. Now the Visualization pane draws it with the step controls, in
// Algorithm Steps and under the picture in full screen (components/workbench/VisualizationPane.js),
// never inside the picture.

import Box from "@mui/material/Box";
import { hasPictureRenderer, PICTURE_RENDERERS } from "./registry";

// Redux's StepEvent names, as a reader would say them.
const EVENT_TEXT = {
  Try: "Trying",
  Accept: "Kept",
  Reject: "Thrown out",
  Backtrack: "Backed up",
  Done: "Done",
};

/** Whether `frame` has a caption to show: a run's step with Redux's sentence for it. */
export function hasFrameCaption(frame) {
  return typeof frame?.caption === "string" && frame.caption !== "";
}

/**
 * The step's caption: its event, Redux's sentence and, at the end, the verdict.
 * @param {{id: string, frame: Object, live?: "polite"|"off"}} props `live` is "off" for the copy
 *   a full-screen picture covers, so a screen reader hears the step once.
 */
export function FrameCaption({ id, frame, live = "polite" }) {
  const event = EVENT_TEXT[frame.event] ?? null;
  const verdict =
    typeof frame.ok === "boolean" ? (frame.ok ? "Verdict: yes" : "Verdict: no") : null;
  return (
    <Box
      id={id}
      aria-live={live}
      data-event={frame.event ?? ""}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: "4px 10px",
        fontSize: "0.875rem",
        color: "text.primary",
      }}
    >
      {event && (
        <Box
          component="span"
          sx={{
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "text.secondary",
          }}
        >
          {event}
        </Box>
      )}
      <Box component="span" id={`${id}-text`}>
        {frame.caption}
      </Box>
      {verdict && (
        <Box
          component="span"
          id={`${id}-verdict`}
          sx={{ fontWeight: 700, color: frame.ok ? "success.light" : "error.light" }}
        >
          {verdict}
        </Box>
      )}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name.
 * @param {string} props.type The response's picture type.
 * @param {Object|null} props.payload The response's static part.
 * @param {string} [props.layoutKey] Names the instance and visualization drawn: a node-link
 *   picture keeps the reader's moved nodes and bent edges while it stays the same (#250).
 * @param {Object|null} props.frame The frame to draw.
 * @param {number|null} props.frameIndex Which frame it is, or null for the plain frame of the
 *   default picture before Run (registry.js plainFrame(): every piece in Background).
 * @param {number} props.frameCount How many frames the response has.
 * @param {Object[]|null} [props.frames] Every frame the steps walk (during a run; none before
 *   Run), for a picture whose layout spans the whole run (#217).
 * @param {string[]} [props.highlightIds] Gadget piece ids to mark in the gadget gold (#239).
 * @param {Object<string, string>} [props.gadgetColors] Color mode's marks: a color per piece id
 *   (#239; components/pictures/gadgetRings.js).
 * @param {boolean} [props.boxSoFar] A picture whose layout spans the run (the Search Tree) sizes
 *   its box to the steps so far, not the whole run (#239; the Reduction View sets it).
 * @param {{options: Array<{id: string, label: string, accepted?: boolean}>,
 *   value: string|null, onChange: Function}|null} [props.runs] The other runs the steps can
 *   follow (registry.js pictureRuns; #204), during a run only.
 */
export default function PictureCanvas({
  idPrefix,
  name,
  type,
  payload,
  layoutKey,
  frame,
  frameIndex,
  frameCount,
  frames = null,
  highlightIds,
  gadgetColors,
  boxSoFar = false,
  runs = null,
}) {
  // Read straight off the module's table (not through a function) so React sees one stable
  // component per type.
  const Renderer = hasPictureRenderer(type) ? PICTURE_RENDERERS[type] : null;
  if (!Renderer || !frame) {
    return (
      <Box id={`${idPrefix}-empty`} sx={{ color: "text.secondary", textAlign: "center" }}>
        {Renderer ? "No picture for this step." : `This site can't draw ${type} pictures yet.`}
      </Box>
    );
  }
  return (
    <Box
      id={idPrefix}
      data-picture-type={type}
      data-frame-index={frameIndex ?? undefined}
      data-plain={frameIndex === null ? "true" : undefined}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}
    >
      <Renderer
        idPrefix={`${idPrefix}-${type.toLowerCase()}`}
        name={name}
        payload={payload}
        layoutKey={layoutKey ?? null}
        frame={frame}
        frameIndex={frameIndex}
        frameCount={frameCount}
        frames={frames ?? []}
        highlightIds={highlightIds}
        gadgetColors={gadgetColors}
        boxSoFar={boxSoFar}
        runs={runs}
      />
    </Box>
  );
}
