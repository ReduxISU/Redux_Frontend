// components/pictures/PieceTooltip.js
//
// #303: what a hovered, focused or tapped piece says about itself (an Edit Distance cell's
// working, a job's deadline and lateness), in a small card beside that piece, so the words sit
// with the piece they describe instead of on a fixed line above the picture. The card follows the
// piece while the picture zooms or pans, opens below it (above when there is no room below) and
// stays inside the picture's box. It is read at the page's text size: the zoom only changes the
// drawing.
//
// Screen readers get the same words from a polite live region that keeps the old readout's id
// (`${idPrefix}-readout`, data-traced), so they hear them without the card.

import Box from "@mui/material/Box";
import { useLayoutEffect, useRef } from "react";

const GAP = 8;
const EDGE = 4;

/** The visually hidden style: read out, not shown. */
const SR_ONLY = {
  position: "absolute",
  width: 1,
  height: 1,
  p: 0,
  m: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/**
 * @param {Object} props
 * @param {string} props.idPrefix The card is `${idPrefix}-tooltip`, the live region
 *   `${idPrefix}-readout`.
 * @param {import("react").RefObject<HTMLElement>} props.containerRef The picture's box: it must
 *   be positioned (relative), and the card is placed inside it.
 * @param {string|null} props.anchor A selector for the piece inside the container, or null when
 *   no piece is traced.
 * @param {string} props.text What the piece says; empty hides the card.
 */
export default function PieceTooltip({ idPrefix, containerRef, anchor, text }) {
  const cardRef = useRef(null);
  const shown = Boolean(anchor && text);

  // The card is placed straight on its element every animation frame while shown (the piece
  // moves when the picture zooms or pans), so placing it never re-renders the picture.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!shown || !card) return undefined;
    let frame = 0;
    const measure = () => {
      const container = containerRef.current;
      const piece = container?.querySelector(anchor);
      if (!container || !piece) {
        card.style.visibility = "hidden";
      } else {
        const box = container.getBoundingClientRect();
        const at = piece.getBoundingClientRect();
        const width = card.offsetWidth;
        const height = card.offsetHeight;
        const center = at.left - box.left + at.width / 2;
        const left = Math.min(Math.max(center - width / 2, EDGE), box.width - width - EDGE);
        const below = at.bottom - box.top + GAP;
        const above = at.top - box.top - GAP - height;
        const top = below + height <= box.height || above < 0 ? Math.min(below, box.height) : above;
        card.style.left = `${left}px`;
        card.style.top = `${top}px`;
        card.style.visibility = "visible";
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [shown, anchor, text, containerRef]);

  return (
    <>
      <Box
        id={`${idPrefix}-readout`}
        aria-live="polite"
        data-traced={shown ? "true" : undefined}
        sx={SR_ONLY}
      >
        {shown ? text : ""}
      </Box>
      <Box
        ref={cardRef}
        id={`${idPrefix}-tooltip`}
        aria-hidden="true"
        hidden={!shown}
        sx={{
          position: "absolute",
          zIndex: 5,
          left: 0,
          top: 0,
          visibility: "hidden",
          display: shown ? "block" : "none",
          width: "max-content",
          maxWidth: "min(340px, calc(100% - 8px))",
          boxSizing: "border-box",
          px: 1.25,
          py: 0.75,
          borderRadius: "8px",
          border: "1px solid",
          borderColor: "border.strong",
          backgroundColor: "surface.main",
          boxShadow: 4,
          color: "text.primary",
          fontSize: "0.8125rem",
          lineHeight: 1.45,
          pointerEvents: "none",
          overflowWrap: "anywhere",
        }}
      >
        {text}
      </Box>
    </>
  );
}
