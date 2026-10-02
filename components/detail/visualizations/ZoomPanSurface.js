// components/detail/visualizations/ZoomPanSurface.js
//
// #194 / #178 -- the one shared zoom/pan/fit mechanism for the SVG-based renderers
// (GraphRenderer, QuantumCircuitRenderer). It owns the <svg>, sized to a fixed-height box, and
// puts everything the renderer draws inside one inner <g> that carries the view transform
// (`translate(x y) scale(k)`), so a renderer keeps drawing in its own coordinates.
//
// Fit: on mount, and whenever `fitKey` changes (a new instance or visualization), the content's
// bounding box is scaled to the box with padding and centered. A resize of the box refits too,
// until the visitor has zoomed or panned -- after that their view is left alone, so a layout
// change never fights them. The "Fit view" button always returns to the fitted view.
//
// Gestures (the visualization is the only place any of this applies):
//   - mouse wheel (and trackpad pinch) zooms about the cursor, scale clamped to 0.25x-8x, and
//     never scrolls the page
//   - right-button drag pans. A right click that doesn't move still reaches the renderer's own
//     context-menu handler; a right drag swallows the context menu that follows it
//   - two-finger pinch zooms and two-finger drag pans; one finger is left alone, so a swipe
//     still scrolls the page (touch-action: pan-y)
// Left-button input is never touched, so a renderer's own drag/click handling is unchanged.
//
// A renderer that converts pointer coordinates (GraphRenderer's drag-to-edit) must use
// `contentRef.current.getScreenCTM()` rather than the <svg>'s, which includes the view transform;
// one that applies screen-pixel deltas inside the content (dnd-kit in QuantumCircuitRenderer)
// divides them by `useViewScale()`.

import CropFreeIcon from "@mui/icons-material/CropFree";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 8;
const FIT_PADDING = 24;
const MAX_FIT_SCALE = 2; // don't blow a tiny diagram up to fill the whole box
const PAN_CLICK_SLOP = 4; // px a right press may move and still count as a click
const WHEEL_ZOOM_RATE = 0.0015;

const ViewScaleContext = createContext(1);

/** The current zoom scale (1 = fitted at natural size), for pixel-delta math inside the content. */
export function useViewScale() {
  return useContext(ViewScaleContext);
}

function clampScale(scale, minScale = MIN_SCALE) {
  return Math.min(MAX_SCALE, Math.max(minScale, scale));
}

// Zooms `view` by `factor`, keeping the content point under (px, py) -- box coordinates -- fixed.
function zoomAbout(view, factor, px, py, minScale) {
  const k = clampScale(view.k * factor, minScale);
  const ratio = k / view.k;
  return { k, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio };
}

const DRAWN_SELECTOR = "circle, ellipse, rect, path, line, polyline, polygon, text";

function isInvisible(element) {
  const fill = element.getAttribute("fill");
  const stroke = element.getAttribute("stroke");
  const hasFill = fill === null || (fill !== "none" && fill !== "transparent");
  const hasStroke = stroke !== null && stroke !== "none" && stroke !== "transparent";
  return !hasFill && !hasStroke;
}

// The bounding box, in the group's own coordinates, of what is actually drawn -- skipping the
// invisible hit areas (transparent rects/paths) renderers lay down for right-click and drop
// targets, which would otherwise pull the "centered" content off to one side.
function visibleBBox(group) {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const element of group.querySelectorAll(DRAWN_SELECTOR)) {
    if (isInvisible(element)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    left = Math.min(left, rect.left);
    top = Math.min(top, rect.top);
    right = Math.max(right, rect.right);
    bottom = Math.max(bottom, rect.bottom);
  }
  const matrix = group.getScreenCTM();
  if (left === Infinity || !matrix) return null;
  const inverse = matrix.inverse();
  const a = new DOMPoint(left, top).matrixTransform(inverse);
  const b = new DOMPoint(right, bottom).matrixTransform(inverse);
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
}

/**
 * @param {Object} props
 * @param {string} props.id Id of the <svg> (ground rule 4).
 * @param {string} props.summary Accessible summary: the svg's aria-label and <title>.
 * @param {string} props.fitKey Refit (and reset any zoom/pan) when this changes.
 * @param {React.RefObject} [props.svgRef] Receives the <svg>.
 * @param {React.RefObject} [props.contentRef] Receives the inner transformed <g>.
 * @param {Object} [props.svgProps] Extra props for the <svg> (mouse handlers, style).
 * @param {React.ReactNode} props.children The renderer's own drawing.
 */
export default function ZoomPanSurface({
  id,
  summary,
  fitKey,
  svgRef,
  contentRef,
  svgProps,
  children,
}) {
  const boxRef = useRef(null);
  const groupRef = useRef(null);
  const setGroupNode = useCallback(
    (node) => {
      groupRef.current = node;
      if (contentRef) contentRef.current = node;
    },
    [contentRef],
  );
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setViewState] = useState({ x: 0, y: 0, k: 1 });
  const viewRef = useRef(view);
  const userAdjusted = useRef(false);
  const lastFitKey = useRef(null);
  // A diagram too big to fit at 0.25x must still be able to zoom out to its fitted size.
  const minScale = useRef(MIN_SCALE);

  const setView = useCallback((next) => {
    viewRef.current = next;
    setViewState(next);
  }, []);

  const fit = useCallback(() => {
    const group = groupRef.current;
    const box = boxRef.current;
    if (!group || !box || box.clientWidth === 0 || box.clientHeight === 0) return;
    const bbox = visibleBBox(group);
    if (!bbox) {
      setView({ x: 0, y: 0, k: 1 });
      return;
    }
    const w = box.clientWidth;
    const h = box.clientHeight;
    const k = Math.min(
      MAX_FIT_SCALE,
      (w - 2 * FIT_PADDING) / Math.max(bbox.width, 1),
      (h - 2 * FIT_PADDING) / Math.max(bbox.height, 1),
    );
    const fitted = Math.min(MAX_SCALE, k);
    minScale.current = Math.min(MIN_SCALE, fitted);
    setView({
      k: fitted,
      x: w / 2 - fitted * (bbox.x + bbox.width / 2),
      y: h / 2 - fitted * (bbox.y + bbox.height / 2),
    });
  }, [setView]);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const measure = () => setSize({ w: box.clientWidth, h: box.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Fit before paint on a new fitKey; on a plain resize, refit only while the visitor hasn't
  // taken over the view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: size.w/size.h are the resize triggers
  useLayoutEffect(() => {
    if (size.w === 0 || size.h === 0) return;
    if (lastFitKey.current !== fitKey) {
      lastFitKey.current = fitKey;
      userAdjusted.current = false;
      fit();
    } else if (!userAdjusted.current) {
      fit();
    }
  }, [fitKey, size.w, size.h, fit]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;

    function boxPoint(clientX, clientY) {
      const rect = box.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }
    function apply(next) {
      userAdjusted.current = true;
      setView(next);
    }

    function handleWheel(event) {
      event.preventDefault();
      const lineScale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      const factor = Math.exp(-event.deltaY * lineScale * WHEEL_ZOOM_RATE);
      const point = boxPoint(event.clientX, event.clientY);
      apply(zoomAbout(viewRef.current, factor, point.x, point.y, minScale.current));
    }

    // Right-button pan. `moved` outlives the press so the contextmenu event that follows the
    // mouseup (Windows/Linux) can be told apart from a plain right click.
    let pan = null;
    let moved = false;
    function handleMouseDown(event) {
      if (event.button !== 2) return;
      pan = { x: event.clientX, y: event.clientY, view: viewRef.current };
      moved = false;
    }
    function handleMouseMove(event) {
      if (!pan) return;
      const dx = event.clientX - pan.x;
      const dy = event.clientY - pan.y;
      if (!moved && Math.hypot(dx, dy) < PAN_CLICK_SLOP) return;
      moved = true;
      apply({ ...pan.view, x: pan.view.x + dx, y: pan.view.y + dy });
    }
    function handleMouseUp(event) {
      if (event.button === 2) pan = null;
    }
    function swallowContextMenuAfterPan(event) {
      if (!moved) return;
      moved = false;
      event.preventDefault();
      event.stopPropagation();
    }
    function suppressNativeContextMenu(event) {
      event.preventDefault();
    }

    // Two-finger pinch/drag. Touch events (not pointer events) so preventDefault can keep the
    // browser from scrolling or zooming the page while two fingers are down.
    let gesture = null;
    function touchState(touches) {
      const a = touches[0];
      const b = touches[1];
      const mid = boxPoint((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
      return { mid, dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1 };
    }
    function handleTouchStart(event) {
      if (event.touches.length === 2) {
        gesture = { ...touchState(event.touches), view: viewRef.current };
        if (event.cancelable) event.preventDefault();
      } else {
        gesture = null;
      }
    }
    function handleTouchMove(event) {
      if (!gesture || event.touches.length !== 2) return;
      if (event.cancelable) event.preventDefault();
      const now = touchState(event.touches);
      const k = clampScale(gesture.view.k * (now.dist / gesture.dist), minScale.current);
      const ratio = k / gesture.view.k;
      apply({
        k,
        x: now.mid.x - (gesture.mid.x - gesture.view.x) * ratio,
        y: now.mid.y - (gesture.mid.y - gesture.view.y) * ratio,
      });
    }
    function handleTouchEnd(event) {
      if (event.touches.length < 2) gesture = null;
    }

    box.addEventListener("wheel", handleWheel, { passive: false });
    box.addEventListener("mousedown", handleMouseDown);
    box.addEventListener("contextmenu", swallowContextMenuAfterPan, true);
    box.addEventListener("contextmenu", suppressNativeContextMenu);
    box.addEventListener("touchstart", handleTouchStart, { passive: false });
    box.addEventListener("touchmove", handleTouchMove, { passive: false });
    box.addEventListener("touchend", handleTouchEnd);
    box.addEventListener("touchcancel", handleTouchEnd);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      box.removeEventListener("wheel", handleWheel);
      box.removeEventListener("mousedown", handleMouseDown);
      box.removeEventListener("contextmenu", swallowContextMenuAfterPan, true);
      box.removeEventListener("contextmenu", suppressNativeContextMenu);
      box.removeEventListener("touchstart", handleTouchStart);
      box.removeEventListener("touchmove", handleTouchMove);
      box.removeEventListener("touchend", handleTouchEnd);
      box.removeEventListener("touchcancel", handleTouchEnd);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setView]);

  function handleFitClick() {
    userAdjusted.current = false;
    fit();
  }

  return (
    <Box
      ref={boxRef}
      sx={{
        position: "relative",
        width: "100%",
        height: { xs: 340, md: 440 },
        overflow: "hidden",
        touchAction: "pan-y",
      }}
    >
      <svg
        ref={svgRef}
        id={id}
        role="img"
        aria-label={summary}
        viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}
        width="100%"
        height="100%"
        style={{ display: "block" }}
        {...svgProps}
      >
        <title>{summary}</title>
        <g
          ref={setGroupNode}
          transform={`translate(${view.x} ${view.y}) scale(${view.k})`}
          data-view-scale={view.k}
        >
          <ViewScaleContext.Provider value={view.k}>{children}</ViewScaleContext.Provider>
        </g>
      </svg>
      <Tooltip title="Fit view">
        <IconButton
          id={`${id}-fit-view`}
          aria-label="Fit view"
          onClick={handleFitClick}
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            width: { xs: 44, md: 32 },
            height: { xs: 44, md: 32 },
            backgroundColor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            "&:hover": { backgroundColor: "action.hover" },
          }}
        >
          <CropFreeIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
