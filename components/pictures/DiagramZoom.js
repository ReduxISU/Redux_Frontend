// components/pictures/DiagramZoom.js
//
// #201, #202: zoom and pan for every SVG picture renderer.
//
// The picture area fills the width of its box. Its height follows the drawing's shape at that
// width, but never more than the screen can show below the toolbar (and never under
// MIN_AREA_HEIGHT), so the whole picture is on screen at once and nothing scrolls sideways. The
// fitted window onto the drawing takes the AREA's shape: the drawing's box is padded on its
// short side, so the drawing is as large as the area allows, centred, and zooming and panning
// use the whole area (nothing is clipped to a narrower column). A small drawing on a wide screen
// is not blown up past MAX_FIT_SCALE.
//
// A reader who wants a closer look zooms in:
//   - the +, - and Fit buttons above the diagram (keyboard reachable, labelled);
//   - Ctrl (Cmd on a Mac) + mouse wheel, or a trackpad pinch, zooming at the pointer. A plain
//     wheel is left alone, so it still scrolls the page;
//   - a two-finger pinch on a touch screen.
// Once zoomed in past fit, a drag pans. At fit a one-finger drag is the browser's: it scrolls
// the page (touch-action allows panning there and only switches to "none" while zoomed), so the
// picture never traps scrolling. Zoom runs from fit to MAX_ZOOM, and the pan is clamped so the
// window never leaves the drawing.
//
// Zoom is the SVG's viewBox: the window onto the drawing shrinks, and the <svg> stays the same
// size on the page. So every piece's hit area, focus ring and hover / tap trace scales with it,
// with no transform to undo. Focusing a piece that is out of the window pans it into view.
//
// The view is kept while the steps play and goes back to fit when `resetOn` changes (the
// renderer passes its payload, so a new instance, visualization or run, and its layout).
// Hand-written rather than d3-zoom: d3-force is the only d3 package here, and this needs a
// fraction of d3-zoom.
//
// #250: a renderer that passes an `editor` (diagramEdits.js) lets the reader rearrange its
// picture by hand. A piece marked `data-drag-node` moves when dragged, and one marked
// `data-drag-edge` (an edge, its label, a loop) bends; a press that moves less than
// DRAG_THRESHOLD is still a tap, so it traces or pins as before, and a drag on empty space still
// pans. The pointer is turned into drawing units through the <svg>'s screen matrix, so a drag
// works the same zoomed in. A moved node is kept inside the picture area (the fitted window),
// and the renderer's editor applies its picture type's own limits. On a touch screen a quick
// swipe stays the page's (it scrolls, at fit), and a finger held still for LONG_PRESS_MS arms
// the piece (a dashed outline, and a short buzz where the phone can) before a drag moves it. The
// arrow keys move a focused node (Shift for bigger steps), and the Reset layout button beside
// Fit puts every piece back where the layout put it.
//
// #217: a renderer may also pass `follow`, the box of the piece a step is about (a search tree's
// node), and the box of what leads to it (`path`: the tree's path from the root down to that
// node). Zoomed in, a new step whose piece is out of the window pans the window to frame its
// path, so a reader stepping through a big picture on a phone zooms once and keeps the step in
// view. At fit everything is in view, so it does nothing there: every picture opens at fit.
// With `readableScale` too, zooming in goes on past MAX_ZOOM times fit when that is not enough
// to reach the scale the picture's text reads at (a wide search tree on a phone).
//
// #279 stage 3: inside the problem page's picture frame (components/workbench/PictureFrame.js,
// found through PictureToolsContext) the zoom buttons are drawn into the frame's caption, beside
// Full screen, and the picture area fills the frame's height (its `data-zoom-area` mark lets the
// frame grow every box between them) rather than following the drawing's shape. Outside a frame
// nothing changes.

import Box from "@mui/material/Box";
import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COMPACT_MEDIA, WORKSPACE_NARROW } from "../workbench/layout";
import { PictureToolsContext } from "../workbench/PictureFrame";
import DiagramSvg from "./DiagramSvg";
import { visuallyHiddenSx } from "./pictureSx";

/** The furthest a diagram zooms in, as a multiple of fit. */
export const MAX_ZOOM = 4;

/**
 * The largest a drawing is drawn at fit, in CSS px per drawing unit: twice its design size, so
 * a four-node graph on a 1920 px screen gets node circles about 76 px across, not 200.
 */
export const MAX_FIT_SCALE = 2;

/** The shortest the picture area gets, in CSS px. */
const MIN_AREA_HEIGHT = 200;

/**
 * The tallest the picture area gets: the screen's height less room for the toolbar above it and
 * a margin below (and, on a phone or tablet, the bottom tab bar), so with the picture scrolled
 * to its top its bottom edge is on screen.
 */
const AREA_MAX_HEIGHT = "calc(100dvh - 96px)";
const AREA_MAX_HEIGHT_COMPACT = "calc(100dvh - 168px)";

/**
 * The fitted window onto `drawing` for an area `area` CSS px in size: the drawing's box grown on
 * its short side to the area's shape (and grown both ways when the area would draw it larger
 * than MAX_FIT_SCALE), centred on the drawing. The drawing's own box until the area is measured.
 */
function fitBox(drawing, area) {
  if (!area || area.width <= 0 || area.height <= 0) return drawing;
  const scale = Math.min(area.width / drawing.width, area.height / drawing.height, MAX_FIT_SCALE);
  const width = area.width / scale;
  const height = area.height / scale;
  return {
    minX: drawing.minX + drawing.width / 2 - width / 2,
    minY: drawing.minY + drawing.height / 2 - height / 2,
    width,
    height,
  };
}

/**
 * How far past a renderer's `readableScale` a picture too small to read at fit can zoom in
 * (#217), when that is further than MAX_ZOOM times fit.
 */
const READABLE_MAX_ZOOM = 2;

/** How much one press of + or - zooms. */
const BUTTON_STEP = 1.5;

/** How far (CSS px) a press moves before it counts as a pan or a drag, so a tap stays a tap. */
const DRAG_THRESHOLD = 4;

/** How long (ms) a finger rests on a piece before a drag moves it instead of scrolling. */
export const LONG_PRESS_MS = 400;

/** How far (drawing units) one arrow key press moves a node; with Shift, KEY_STEP_BIG. */
export const KEY_STEP = 10;
export const KEY_STEP_BIG = 50;

const ARROW_KEYS = {
  ArrowLeft: { x: -1, y: 0, word: "left" },
  ArrowRight: { x: 1, y: 0, word: "right" },
  ArrowUp: { x: 0, y: -1, word: "up" },
  ArrowDown: { x: 0, y: 1, word: "down" },
};

/** The drawing's point under the screen point (x, y), through the current (zoomed) viewBox. */
function drawingPoint(svg, x, y) {
  const ctm = svg?.getScreenCTM();
  if (!ctm) return null;
  const inverse = ctm.inverse();
  return {
    x: inverse.a * x + inverse.c * y + inverse.e,
    y: inverse.b * x + inverse.d * y + inverse.f,
  };
}

/** How far a piece reaches past its centre `at` on each side, in drawing units. */
function extentsOf(piece, at) {
  const box = piece?.getBBox?.();
  if (!box || !at) return { left: 0, right: 0, top: 0, bottom: 0 };
  return {
    left: Math.max(0, at.x - box.x),
    right: Math.max(0, box.x + box.width - at.x),
    top: Math.max(0, at.y - box.y),
    bottom: Math.max(0, box.y + box.height - at.y),
  };
}

const NO_EXTENTS = { left: 0, right: 0, top: 0, bottom: 0 };

/** A piece centred at `point`, kept inside the window `area` (the fitted viewBox). */
function keepInside(point, extents, area) {
  const inset = 4;
  const fit = (value, low, high) => (low <= high ? clamp(value, low, high) : (low + high) / 2);
  return {
    x: fit(
      point.x,
      area.minX + extents.left + inset,
      area.minX + area.width - extents.right - inset,
    ),
    y: fit(
      point.y,
      area.minY + extents.top + inset,
      area.minY + area.height - extents.bottom - inset,
    ),
  };
}

/** What a piece is called, for the "moved" announcement: its label up to the first comma. */
function pieceName(piece) {
  const label = piece.getAttribute("aria-label") ?? "";
  return label.split(",")[0] || "the node";
}

/** Fit: the whole drawing. `x`, `y` are the window's offset into the drawing, in its units. */
const FIT = { k: 1, x: 0, y: 0 };

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

/**
 * The view kept inside the zoom range (fit to the box's `maxZoom`, MAX_ZOOM unless a renderer's
 * `readableScale` needs more) and the window kept inside the drawing.
 */
function clampView(view, box) {
  const k = clamp(view.k, 1, box.maxZoom ?? MAX_ZOOM);
  return {
    k,
    x: clamp(view.x, 0, box.width - box.width / k),
    y: clamp(view.y, 0, box.height - box.height / k),
  };
}

/**
 * The view zoomed to `k`, keeping the drawing's point under the screen point (sx, sy) where it
 * is. `ctm` is the <svg>'s screen matrix at `view` (screen = a * unit + e).
 */
function zoomedAt(view, box, ctm, k, sx, sy) {
  const next = clamp(k, 1, box.maxZoom ?? MAX_ZOOM);
  const ratio = view.k / next;
  const ux = (sx - ctm.e) / ctm.a;
  const uy = (sy - ctm.f) / ctm.d;
  const left = box.minX + view.x;
  const top = box.minY + view.y;
  return clampView(
    {
      k: next,
      x: ux - (ux - left) * ratio - box.minX,
      y: uy - (uy - top) * ratio - box.minY,
    },
    box,
  );
}

/**
 * The view panned (at its zoom) to centre `piece` (a box in drawing units), or null when the
 * piece is already wholly inside the window.
 */
function viewShowing(view, box, piece) {
  const w = box.width / view.k;
  const h = box.height / view.k;
  const left = box.minX + view.x;
  const top = box.minY + view.y;
  const inside =
    piece.x >= left &&
    piece.y >= top &&
    piece.x + piece.width <= left + w &&
    piece.y + piece.height <= top + h;
  if (inside) return null;
  return clampView(
    {
      k: view.k,
      x: piece.x + piece.width / 2 - w / 2 - box.minX,
      y: piece.y + piece.height / 2 - h / 2 - box.minY,
    },
    box,
  );
}

/**
 * #217: the view at zoom `k` that frames a step: `follow`'s `path` (the tree's path from the root
 * down to the step's node) centred where the window can hold it, else as much of it as fits
 * beside `follow` itself (the node), which is always in the window. Where the window is smaller
 * than the drawing it stays on the drawing, so no empty band of the fitted box's padding shows;
 * where it is larger, the drawing is centred in it.
 */
function viewFraming(k, box, drawing, follow) {
  const path = follow.path ?? follow;
  const along = (start, size, pathStart, pathSize, pieceStart, pieceSize, window) => {
    // A window that holds the whole drawing this way shows it all, centred.
    if (window >= size) return start + size / 2 - window / 2;
    const low = Math.max(pieceStart + pieceSize - window, start);
    const high = Math.min(pieceStart, start + size - window);
    const centred = pathStart + pathSize / 2 - window / 2;
    return low <= high ? clamp(centred, low, high) : high;
  };
  const w = box.width / k;
  const h = box.height / k;
  return clampView(
    {
      k,
      x:
        along(drawing.minX, drawing.width, path.x, path.width, follow.x, follow.width, w) -
        box.minX,
      y:
        along(drawing.minY, drawing.height, path.y, path.height, follow.y, follow.height, h) -
        box.minY,
    },
    box,
  );
}

/** Whether `piece` (a box in drawing units) is wholly inside the window of `view`. */
function inWindow(view, box, piece) {
  const left = box.minX + view.x;
  const top = box.minY + view.y;
  return (
    piece.x >= left &&
    piece.y >= top &&
    piece.x + piece.width <= left + box.width / view.k &&
    piece.y + piece.height <= top + box.height / view.k
  );
}

function sameKeys(a, b) {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

const zoomButtonSx = {
  minWidth: 36,
  minHeight: 32,
  px: 1.25,
  border: "none",
  borderLeft: "1px solid",
  borderColor: "border.main",
  "&:first-of-type": { borderLeft: "none" },
  backgroundColor: "transparent",
  color: "text.primary",
  fontFamily: "inherit",
  fontSize: "0.8125rem",
  fontWeight: 700,
  cursor: "pointer",
  outline: "none",
  "&:disabled": { color: "text.secondary", fontWeight: 400, cursor: "default" },
  "&:focus-visible": { outline: "2px solid", outlineColor: "brand.line", outlineOffset: "-2px" },
};

/**
 * A DiagramSvg with zoom and pan, and the zoom buttons above it beside the renderer's own
 * controls (`toolbar`).
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here (`-svg`, `-zoom-in`, ...).
 * @param {string} props.label What the diagram shows, for screen readers.
 * @param {{minX: number, minY: number, width: number, height: number}} props.drawing The
 *   whole drawing's box, in its own units.
 * @param {Array} props.resetOn Back to fit when any of these changes (compared with Object.is).
 * @param {import("react").ReactNode} [props.toolbar] The renderer's controls, at the right.
 * @param {Object} [props.editor] Moving and bending pieces by hand (diagramEdits.js
 *   makeEditor), with the Reset layout button; none for a picture that can't be rearranged.
 * @param {{key: string, x: number, y: number, width: number, height: number}|null}
 *   [props.follow] A box to keep in view while zoomed in (#217: the node a search tree's step
 *   is about), with `path`, the box of what leads to it (the path from the root). When its key
 *   changes and the box is outside the zoomed window, the window pans to frame the path (see
 *   viewFraming); at fit everything is in view already.
 * @param {number|null} [props.readableScale] The scale (CSS px per drawing unit) the picture's
 *   text reads at (#217). Zooming in reaches READABLE_MAX_ZOOM times it, when that is further
 *   than MAX_ZOOM times fit. The picture still opens at fit.
 * @param {import("react").ReactNode} props.children The diagram's elements.
 */
export default function DiagramZoom({
  idPrefix,
  label,
  drawing,
  resetOn,
  toolbar,
  editor = null,
  follow = null,
  readableScale = null,
  children,
}) {
  const svgRef = useRef(null);
  // #279 stage 3: the picture frame this diagram sits in, if any.
  const frame = useContext(PictureToolsContext);
  // The picture area's size in CSS px, measured (null until it is).
  const areaRef = useRef(null);
  const [area, setArea] = useState(null);
  useEffect(() => {
    const element = areaRef.current;
    if (!element) return undefined;
    const measure = () => {
      // The exact size, fractions included, so a drawing laid out to the box's whole pixels
      // (useBoxWidth.js) fits at its own size.
      const rect = element.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      setArea((current) =>
        current && current.width === width && current.height === height
          ? current
          : { width, height },
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // The area's height before the screen's cap: the drawing's shape at the area's width.
  const naturalHeight = area
    ? Math.round(drawing.height * Math.min(area.width / drawing.width, MAX_FIT_SCALE))
    : null;
  const fitted = fitBox(drawing, area);
  // The fitted box, with how far it zooms in: MAX_ZOOM times fit, or further when the
  // renderer's readable scale is further off (clampView and zoomedAt read it).
  const fitScale = area?.width > 0 ? area.width / fitted.width : null;
  const box = {
    ...fitted,
    maxZoom:
      readableScale && fitScale
        ? Math.max(MAX_ZOOM, (readableScale * READABLE_MAX_ZOOM) / fitScale)
        : MAX_ZOOM,
  };
  const [stored, setStored] = useState(FIT);
  const [storedFor, setStoredFor] = useState(resetOn);
  // React's "adjust state when a prop changes" pattern: a new instance or layout starts at fit.
  const resetting = !sameKeys(storedFor, resetOn);
  if (resetting) {
    setStoredFor(resetOn);
    setStored(FIT);
  }
  const view = clampView(stored, box);
  // #217: a new step's piece outside the zoomed window brings the window to it.
  const followKey = follow?.key ?? null;
  const [followedKey, setFollowedKey] = useState(followKey);
  if (followKey !== followedKey) {
    setFollowedKey(followKey);
    if (follow && !resetting && view.k > 1.001 && !inWindow(view, box, follow)) {
      setStored(viewFraming(view.k, box, drawing, follow));
    }
  }
  const zoomed = view.k > 1.001;

  // The latest view and box, for the native wheel listener (set up once, below).
  const viewRef = useRef(view);
  const boxRef = useRef(box);
  useEffect(() => {
    viewRef.current = view;
    boxRef.current = box;
  });
  const gesture = useRef({
    pointers: new Map(),
    pan: null,
    pinch: null,
    press: null,
    moved: false,
  });
  // A piece is being dragged (the grabbing cursor), and what a key press last moved.
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  // Once a long press has armed a piece, the finger's moves are the drag's, not the page's
  // scroll. Native and not passive: only a cancelled touchmove stops the browser scrolling.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onTouchMove = (event) => {
      if (gesture.current.press?.armed && event.cancelable) event.preventDefault();
    };
    svg.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => svg.removeEventListener("touchmove", onTouchMove);
  }, []);
  // A long press still waiting when the picture goes away never fires.
  useEffect(() => {
    const current = gesture.current;
    return () => clearTimeout(current.press?.timer);
  }, []);

  // Ctrl / Cmd + wheel (and a trackpad pinch, which the browser sends as one) zooms. Native,
  // because React's wheel listener is passive and can't stop the browser zooming the page.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const current = viewRef.current;
      const k = current.k * Math.exp(-event.deltaY * 0.0025);
      setStored(zoomedAt(current, boxRef.current, ctm, k, event.clientX, event.clientY));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  /** Zoom by `factor` around the middle of the diagram (the buttons). */
  function zoomBy(factor) {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!ctm) return;
    const rect = svg.getBoundingClientRect();
    setStored(
      zoomedAt(
        view,
        box,
        ctm,
        view.k * factor,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      ),
    );
  }

  /** A finger has rested on the piece long enough: a drag now moves it. */
  function arm(press) {
    if (gesture.current.press !== press) return;
    press.armed = true;
    press.element.setAttribute("data-drag-armed", "");
    navigator.vibrate?.(15);
  }

  /** Ends the press on a piece: dropped, cancelled, or turned into a pan or a pinch. */
  function endPress() {
    const press = gesture.current.press;
    if (!press) return;
    clearTimeout(press.timer);
    press.element.removeAttribute("data-drag-armed");
    gesture.current.press = null;
    setDragging(false);
  }

  function onPointerDown(event) {
    const g = gesture.current;
    g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    g.moved = false;
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return;
    const piece =
      editor && g.pointers.size === 1 && (event.pointerType !== "mouse" || event.button === 0)
        ? event.target.closest?.("[data-drag-node], [data-drag-edge]")
        : null;
    if (piece) {
      const node = piece.getAttribute("data-drag-node");
      const press = {
        pointerId: event.pointerId,
        element: piece,
        kind: node !== null ? "node" : "edge",
        id: node ?? piece.getAttribute("data-drag-edge"),
        x: event.clientX,
        y: event.clientY,
        view,
        a: ctm.a,
        d: ctm.d,
        // A mouse or a pen drags straight away; a finger first rests (see arm()).
        armed: event.pointerType !== "touch",
        active: false,
        timer: null,
      };
      g.press = press;
      g.pan = null;
      if (event.pointerType === "touch") {
        press.timer = setTimeout(() => arm(press), LONG_PRESS_MS);
      }
      return;
    }
    if (event.pointerType === "touch" && g.pointers.size === 2) {
      endPress();
      const [p, q] = [...g.pointers.values()];
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      g.pan = null;
      g.pinch = {
        view,
        distance: Math.max(1, Math.hypot(p.x - q.x, p.y - q.y)),
        // The drawing's point under the fingers' midpoint, and the window's top-left on screen.
        point: { x: (mid.x - ctm.e) / ctm.a, y: (mid.y - ctm.f) / ctm.d },
        a: ctm.a,
        d: ctm.d,
        left: ctm.e + ctm.a * (box.minX + view.x),
        top: ctm.f + ctm.d * (box.minY + view.y),
      };
    } else if (
      g.pointers.size === 1 &&
      zoomed &&
      (event.pointerType !== "mouse" || event.button === 0)
    ) {
      g.pan = { x: event.clientX, y: event.clientY, view, a: ctm.a, d: ctm.d, active: false };
    }
  }

  function onPointerMove(event) {
    const g = gesture.current;
    if (!g.pointers.has(event.pointerId)) return;
    g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (g.pinch && g.pointers.size === 2) {
      const [p, q] = [...g.pointers.values()];
      const pinch = g.pinch;
      const k = clamp(
        (pinch.view.k * Math.hypot(p.x - q.x, p.y - q.y)) / pinch.distance,
        1,
        box.maxZoom,
      );
      const scale = k / pinch.view.k;
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      g.moved = true;
      setStored(
        clampView(
          {
            k,
            x: pinch.point.x - (mid.x - pinch.left) / (pinch.a * scale) - box.minX,
            y: pinch.point.y - (mid.y - pinch.top) / (pinch.d * scale) - box.minY,
          },
          box,
        ),
      );
    } else if (g.press && g.press.pointerId === event.pointerId) {
      movePress(event);
    } else if (g.pan) {
      const dx = event.clientX - g.pan.x;
      const dy = event.clientY - g.pan.y;
      if (!g.pan.active && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      if (!g.pan.active) {
        g.pan.active = true;
        g.moved = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
      setStored(
        clampView(
          { k: g.pan.view.k, x: g.pan.view.x - dx / g.pan.a, y: g.pan.view.y - dy / g.pan.d },
          box,
        ),
      );
    }
  }

  /** A pointer pressed on a piece moved: drag it, or, before a long press arms it, let go. */
  function movePress(event) {
    const g = gesture.current;
    const press = g.press;
    const svg = svgRef.current;
    const dx = event.clientX - press.x;
    const dy = event.clientY - press.y;
    const far = Math.hypot(dx, dy) >= DRAG_THRESHOLD;
    if (!press.armed) {
      if (!far) return;
      // A quick swipe: at fit the page scrolls (the browser's); zoomed in, the view pans.
      endPress();
      if (zoomed) {
        g.pan = { x: press.x, y: press.y, view: press.view, a: press.a, d: press.d, active: true };
        g.moved = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setStored(
          clampView(
            { k: press.view.k, x: press.view.x - dx / press.a, y: press.view.y - dy / press.d },
            box,
          ),
        );
      }
      return;
    }
    if (!press.active) {
      if (!far) return;
      press.active = true;
      g.moved = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      press.from = drawingPoint(svg, press.x, press.y);
      if (press.kind === "node") {
        press.origin = editor.nodeAt(press.id);
        press.extents = extentsOf(press.element, press.origin);
      }
      setDragging(true);
    }
    const point = drawingPoint(svg, event.clientX, event.clientY);
    if (!point || !press.from) return;
    if (press.kind === "node") {
      if (!press.origin) return;
      const proposed = {
        x: press.origin.x + point.x - press.from.x,
        y: press.origin.y + point.y - press.from.y,
      };
      editor.moveNode(press.id, keepInside(proposed, press.extents, box));
    } else {
      editor.dragEdge(press.id, keepInside(point, NO_EXTENTS, box));
    }
  }

  // The arrow keys move the focused node; Shift moves it further.
  function onKeyDown(event) {
    const arrow = ARROW_KEYS[event.key];
    if (!editor || !arrow || event.altKey || event.ctrlKey || event.metaKey) return;
    const piece = event.target.closest?.("[data-drag-node]");
    if (!piece) return;
    event.preventDefault();
    const id = piece.getAttribute("data-drag-node");
    const at = editor.nodeAt(id);
    if (!at) return;
    const step = event.shiftKey ? KEY_STEP_BIG : KEY_STEP;
    const proposed = { x: at.x + arrow.x * step, y: at.y + arrow.y * step };
    editor.moveNode(id, keepInside(proposed, extentsOf(piece, at), box));
    setAnnouncement(`Moved ${pieceName(piece)} ${arrow.word}.`);
  }

  function onPointerEnd(event) {
    const g = gesture.current;
    if (g.press && g.press.pointerId === event.pointerId) endPress();
    g.pointers.delete(event.pointerId);
    if (g.pointers.size < 2) g.pinch = null;
    if (g.pointers.size === 0) g.pan = null;
  }

  // A long press on a touch screen would open the browser's menu.
  function onContextMenu(event) {
    if (gesture.current.press) event.preventDefault();
  }

  // A press that panned, pinched or dragged is not a tap: the node under it is not pinned.
  function onClickCapture(event) {
    if (gesture.current.moved) {
      event.stopPropagation();
      event.preventDefault();
      gesture.current.moved = false;
    }
  }

  // Tabbing to a piece outside the zoomed window brings it into view.
  function onFocus(event) {
    if (!zoomed) return;
    const piece = event.target.closest?.("[data-focusable]");
    if (!piece?.getBBox) return;
    const next = viewShowing(view, box, piece.getBBox());
    if (next) setStored(next);
  }

  const w = box.width / view.k;
  const h = box.height / view.k;
  const percent = Math.round(view.k * 100);

  const zoomGroup = (
    <Box
      role="group"
      aria-label="Zoom"
      sx={{
        display: "inline-flex",
        border: "1px solid",
        borderColor: "border.main",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <Box
        component="button"
        type="button"
        id={`${idPrefix}-zoom-out`}
        aria-label="Zoom out"
        disabled={!zoomed}
        onClick={() => zoomBy(1 / BUTTON_STEP)}
        sx={zoomButtonSx}
      >
        −
      </Box>
      <Box
        component="button"
        type="button"
        id={`${idPrefix}-zoom-in`}
        aria-label="Zoom in"
        disabled={view.k >= box.maxZoom - 0.001}
        onClick={() => zoomBy(BUTTON_STEP)}
        sx={zoomButtonSx}
      >
        +
      </Box>
      <Box
        component="button"
        type="button"
        id={`${idPrefix}-zoom-reset`}
        aria-label={`Fit the whole diagram (now ${percent}%)`}
        disabled={!zoomed}
        onClick={() => setStored(FIT)}
        sx={zoomButtonSx}
      >
        Fit
      </Box>
      {editor && (
        <Box
          component="button"
          type="button"
          id={`${idPrefix}-layout-reset`}
          aria-label="Reset layout: put every moved node and bent edge back"
          disabled={!editor.edited}
          onClick={() => {
            editor.reset();
            setAnnouncement("Layout reset.");
          }}
          sx={zoomButtonSx}
        >
          Reset layout
        </Box>
      )}
    </Box>
  );

  return (
    <Box
      id={`${idPrefix}-zoom`}
      data-zoom={view.k.toFixed(2)}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}
    >
      {frame?.slot && createPortal(zoomGroup, frame.slot)}
      {(!frame || toolbar) && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          {!frame && zoomGroup}
          {toolbar}
        </Box>
      )}
      <Box
        ref={areaRef}
        id={`${idPrefix}-area`}
        data-zoom-area=""
        sx={{
          width: "100%",
          // Measured: the drawing's shape at this width. Before that, the same by CSS.
          height: naturalHeight ?? undefined,
          aspectRatio: naturalHeight ? undefined : `${drawing.width} / ${drawing.height}`,
          minHeight: MIN_AREA_HEIGHT,
          overflow: "hidden",
          // In a picture frame the area fills the frame's height, whatever the drawing's shape.
          ...(frame
            ? {
                flex: "1 1 auto",
                maxHeight: "none",
                // Stacked frames take the drawing's own shape, up to the screen, as outside a
                // frame (PictureFrame.js), so a step's caption never changes the picture's size.
                [WORKSPACE_NARROW]: { flex: "none", maxHeight: AREA_MAX_HEIGHT },
                [COMPACT_MEDIA]: { maxHeight: AREA_MAX_HEIGHT_COMPACT },
              }
            : {
                maxHeight: AREA_MAX_HEIGHT,
                [COMPACT_MEDIA]: { maxHeight: AREA_MAX_HEIGHT_COMPACT },
              }),
        }}
      >
        <DiagramSvg
          id={`${idPrefix}-svg`}
          svgRef={svgRef}
          label={label}
          viewBox={`${box.minX + view.x} ${box.minY + view.y} ${w} ${h}`}
          interactive
          data-zoomed={zoomed ? "true" : undefined}
          data-dragging={dragging ? "true" : undefined}
          data-editable={editor ? "true" : undefined}
          extraSx={{
            // At fit the browser keeps one-finger panning (the page scrolls); a pinch is ours.
            // Zoomed in, every touch gesture is ours.
            touchAction: zoomed ? "none" : "pan-x pan-y",
            height: "100%",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
            cursor: zoomed ? "grab" : undefined,
            "& [data-drag-node], & [data-drag-edge]": { cursor: "grab" },
            "&[data-dragging], &[data-dragging] *": { cursor: "grabbing" },
            // A long press has armed this piece: a dashed outline in the focus ring's color.
            "& [data-drag-armed]": {
              outline: "2px dashed",
              outlineColor: "brand.line",
              outlineOffset: "4px",
            },
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onClickCapture={onClickCapture}
          onContextMenu={onContextMenu}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
        >
          {children}
        </DiagramSvg>
      </Box>
      {editor && (
        <Box component="span" aria-live="polite" id={`${idPrefix}-moved`} sx={visuallyHiddenSx}>
          {announcement}
        </Box>
      )}
    </Box>
  );
}
