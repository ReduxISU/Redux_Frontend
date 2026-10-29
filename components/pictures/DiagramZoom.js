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
// Zoom is the SVG's viewBox: the window onto the drawing shrinks (or, zoomed out, grows), and
// the <svg> stays the same size on the page. So every piece's hit area, focus ring and hover /
// tap trace scales with it, with no transform to undo. Focusing a piece that is out of the
// window pans it into view. Hand-written rather than d3-zoom: d3-force is the only d3 package
// here, and this needs a fraction of d3-zoom.
//
// #303 stage 3 (Board G's view model, the same on every picture on every page):
//   - Wheel. Ctrl (Cmd on a Mac) + wheel, or a trackpad pinch (which the browser sends as one),
//     zooms at the pointer: the drawing's point under it stays still. In full screen a plain
//     wheel zooms too, since there is no page to scroll. In normal view a plain wheel is left to
//     the page, so it still scrolls, and a hint ("Hold Ctrl and scroll to zoom") shows over the
//     picture for a moment so the reader learns the gesture.
//   - Range. From MIN_ZOOM (a quarter of fit, the mockup's floor) to MAX_ZOOM times fit (or the
//     renderer's readable scale, below). Every picture still opens at fit.
//   - Pan, at any zoom, fit included, but clamped (clampView): on each axis at least a quarter
//     of the drawing, and never less than KEEP_PX on screen, stays in the window, so the picture
//     can't be lost off the edge. (Board G's mockup doesn't clamp at all; a lost picture with
//     only Reset to bring it back was the reason to add one. Clamping the window inside the
//     drawing, as before, would make pan at fit impossible.)
//   - Mouse (and pen). A left drag on a movable piece moves it straight away; a left drag on
//     the background, or a right drag anywhere, pans. The context menu is kept off the picture
//     so the right drag can work. The middle button is the browser's.
//   - Touch. Two fingers pinch to zoom and move together to pan, worked out from where the
//     pinch started (not added up move by move), so moves the browser skips lose nothing. A
//     finger held still on a movable piece for LONG_PRESS_MS lifts it (a shadow and a slight
//     scale, and a short buzz where the phone can) and the drag after it moves it. One finger
//     pans in full screen; in normal view it is the page's (it scrolls), so the picture never
//     traps the page: touch-action is pan-y in normal view and none in full screen, and the
//     native touchmove listener cancels the browser's scroll only once a gesture belongs to the
//     picture (a pinch, a lifted piece, a full-screen pan). Rejected: one finger panning a
//     zoomed picture in normal view (the old rule) -- on a phone the picture is most of the
//     screen, so a zoomed picture made the page hard to scroll past.
//   - Keyboard. The picture itself is focusable: the arrow keys pan, + and - zoom, 0 resets.
//     On a focused movable piece the arrow keys move the piece instead (#250).
//   - One Reset button, in place of the old Fit and Reset layout: it puts the zoom, the pan and
//     every moved piece back. It is enabled, and drawn as the soft orange (active) button, only
//     when something differs from the default; otherwise it is disabled and neutral. Its label
//     says the zoom percent. Rejected: keeping Fit and Reset layout apart -- two buttons that
//     each undid half of a change the reader made in one gesture vocabulary.
//   - A short help line under the picture says the gestures for the pointer in use (coarse or
//     fine, and full screen or not), with the move clause only when the picture has movable
//     pieces.
//
// The view is kept while the steps play and goes back to fit when `resetOn` changes (the
// renderer passes its payload, so a new instance, visualization or run, and its layout).
//
// #250: a renderer that passes an `editor` (diagramEdits.js) lets the reader rearrange its
// picture by hand. A piece marked `data-drag-node` moves when dragged, and one marked
// `data-drag-edge` (an edge, its label, a loop) bends; a press that moves less than
// DRAG_THRESHOLD is still a tap, so it traces or pins as before. The pointer is turned into
// drawing units through the <svg>'s screen matrix, so a drag works the same at any zoom. A
// moved node is kept inside the picture area (the fitted window), and the renderer's editor
// applies its picture type's own limits. The arrow keys move a focused node (Shift for bigger
// steps). The moves are kept while the steps play (diagramEdits.js) and go back with Reset.
//
// #217: a renderer may also pass `follow`, the box of the piece a step is about (a search tree's
// node), and the box of what leads to it (`path`: the tree's path from the root down to that
// node). Away from the default view, a new step whose piece is out of the window, or whose path
// the window could hold but cuts, pans the window to frame its path, so a reader stepping
// through a big picture on a phone zooms once and keeps the step in view. At the default view
// everything is in view, so it does nothing there, and it never changes the reader's zoom.
// With `readableScale` too, zooming in goes on past MAX_ZOOM times fit when that is not enough
// to reach the scale the picture's text reads at (a wide search tree on a phone).

import Box from "@mui/material/Box";
import { useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { COMPACT_MEDIA } from "../workbench/layout";
import DiagramSvg from "./DiagramSvg";
import { visuallyHiddenSx } from "./pictureSx";
import { PictureFullScreen, ZoomControlsSlot } from "./zoomControlsSlot";

/** The furthest a diagram zooms in, as a multiple of fit. */
export const MAX_ZOOM = 4;

/** #303: the furthest a diagram zooms out, as a multiple of fit (Board G's floor). */
export const MIN_ZOOM = 0.25;

/**
 * #303: how much of the drawing a pan keeps in the window, on each axis: KEEP_SHARE of it (or
 * all of it, when the window is smaller), and never less than KEEP_PX on screen.
 */
export const KEEP_SHARE = 0.25;
export const KEEP_PX = 48;

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

/** How much one press of + or - (the buttons or the keys) zooms. */
const BUTTON_STEP = 1.5;

/** #303: how far (CSS px) one arrow key press pans the picture (Board G's step). */
const KEY_PAN_PX = 40;

/** How far (CSS px) a press moves before it counts as a pan or a drag, so a tap stays a tap. */
const DRAG_THRESHOLD = 4;

/** How long (ms) a finger rests on a piece before a drag moves it instead (Board G's 450). */
export const LONG_PRESS_MS = 450;

/** #303: how long (ms) the "Hold Ctrl and scroll to zoom" hint stays up. */
const HINT_MS = 1600;

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
 * Where a window `size` long may start on one axis so it keeps enough of the drawing (which
 * runs from `start`, `length` long) in view: at least KEEP_SHARE of it, or KEEP_PX on screen
 * (`perPx` drawing units a CSS px), and all of it when the window is smaller than that.
 */
function panRange(start, length, size, perPx) {
  const need = Math.min(length, size, Math.max(length * KEEP_SHARE, KEEP_PX * perPx));
  return { low: start + need - size, high: start + length - need };
}

/**
 * The view kept inside the zoom range (MIN_ZOOM to the box's `maxZoom`, MAX_ZOOM unless a
 * renderer's `readableScale` needs more) and panned no further than keeps the drawing in view
 * (panRange). Close enough to fit (half a CSS px), it is fit, so Reset turns neutral again.
 */
export function clampView(view, box) {
  const k = clamp(view.k, MIN_ZOOM, box.maxZoom ?? MAX_ZOOM);
  const drawing = box.drawing ?? box;
  const w = box.width / k;
  const h = box.height / k;
  // Drawing units per CSS px at this zoom (box.scale: CSS px per unit at fit).
  const perPx = box.scale ? 1 / (box.scale * k) : 0;
  const across = panRange(drawing.minX, drawing.width, w, perPx);
  const down = panRange(drawing.minY, drawing.height, h, perPx);
  const next = {
    k,
    x: clamp(box.minX + view.x, across.low, across.high) - box.minX,
    y: clamp(box.minY + view.y, down.low, down.high) - box.minY,
  };
  const tolerance = box.scale ? 0.5 / box.scale : 1e-6;
  const atFit =
    Math.abs(next.k - 1) < 0.001 && Math.abs(next.x) < tolerance && Math.abs(next.y) < tolerance;
  return atFit ? FIT : next;
}

/** Whether `view` is the default view (fit, not panned). */
function isFit(view) {
  return view.k === 1 && view.x === 0 && view.y === 0;
}

/**
 * The view zoomed to `k`, keeping the drawing's point under the screen point (sx, sy) where it
 * is. `ctm` is the <svg>'s screen matrix at `view` (screen = a * unit + e).
 */
function zoomedAt(view, box, ctm, k, sx, sy) {
  const next = clamp(k, MIN_ZOOM, box.maxZoom ?? MAX_ZOOM);
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
  if (inWindow(view, box, piece)) return null;
  const w = box.width / view.k;
  const h = box.height / view.k;
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

/**
 * #217: whether a new step should pan the window: its piece is outside it, or its path is only
 * partly in it though the window could hold the whole path.
 */
function needsFraming(view, box, follow) {
  if (!inWindow(view, box, follow)) return true;
  const path = follow.path;
  if (!path) return false;
  const holds = path.width <= box.width / view.k && path.height <= box.height / view.k;
  return holds && !inWindow(view, box, path);
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

/**
 * #303: the gesture help under the picture, for the pointer in use: Board G's wording. `piece`
 * names what moves ("node", "state"), or null when nothing does.
 */
export function zoomHelp({ coarse, full, mac, piece }) {
  if (coarse) {
    const move = piece ? ` · press and hold a ${piece}, then drag to move it` : "";
    return `${full ? "Drag to pan" : "Two fingers to pan"} · pinch to zoom${move}`;
  }
  const move = piece ? ` · drag a ${piece} to move it` : "";
  const wheel = full ? "Scroll to zoom" : `${mac ? "⌘" : "Ctrl"} + scroll to zoom`;
  return `${wheel} · drag the background or right-drag to pan${move}`;
}

/** Whether this is a Mac (or an iPhone / iPad), whose zoom key is Cmd, not Ctrl. */
function onMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");
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

/** #303: Reset while there is something to reset: the soft orange of an active control. */
const resetActiveSx = {
  backgroundColor: "brand.soft",
  color: "brand.onSoft",
  "&:hover": { backgroundColor: "brand.softHover" },
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
 *   makeEditor); none for a picture that can't be rearranged. Reset puts its pieces back too.
 * @param {{key: string, x: number, y: number, width: number, height: number}|null}
 *   [props.follow] A box to keep in view away from the default view (#217: the node a search
 *   tree's step is about), with `path`, the box of what leads to it (the path from the root).
 *   When its key changes and the box is outside the window, or the window could hold the whole
 *   path but cuts it, the window pans to frame the path (see viewFraming); at the default view
 *   everything is in view already.
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
  const slot = useContext(ZoomControlsSlot);
  const full = useContext(PictureFullScreen);
  // The picture area's size in CSS px, measured (null until it is).
  const areaRef = useRef(null);
  const [area, setArea] = useState(null);
  useEffect(() => {
    const element = areaRef.current;
    if (!element) return undefined;
    const measure = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
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
  // #303: the pointer in use (a finger or a mouse), for the help line, and whether this is a
  // Mac. Read after the first paint, so the server's HTML and the first render agree.
  const [pointer, setPointer] = useState({ coarse: false, mac: false });
  useEffect(() => {
    const query = window.matchMedia?.("(pointer: coarse)");
    const read = () => setPointer({ coarse: Boolean(query?.matches), mac: onMac() });
    read();
    query?.addEventListener?.("change", read);
    return () => query?.removeEventListener?.("change", read);
  }, []);
  // The area's height before the screen's cap: the drawing's shape at the area's width.
  const naturalHeight = area
    ? Math.round(drawing.height * Math.min(area.width / drawing.width, MAX_FIT_SCALE))
    : null;
  const fitted = fitBox(drawing, area);
  // The fitted box, with how far it zooms in (MAX_ZOOM times fit, or further when the
  // renderer's readable scale is further off), its scale at fit and the drawing it frames
  // (clampView and zoomedAt read them).
  const fitScale = area?.width > 0 ? area.width / fitted.width : null;
  const box = {
    ...fitted,
    drawing,
    scale: fitScale,
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
  const atFit = isFit(view);
  // #217: away from the default view, a new step's piece outside the window brings the window
  // to it.
  const followKey = follow?.key ?? null;
  const [followedKey, setFollowedKey] = useState(followKey);
  if (followKey !== followedKey) {
    setFollowedKey(followKey);
    if (follow && !resetting && !atFit && needsFraming(view, box, follow)) {
      setStored(viewFraming(view.k, box, drawing, follow));
    }
  }
  const zoomed = view.k > 1.001;

  // The latest view, box and full screen, for the native listeners (set up once, below).
  const viewRef = useRef(view);
  const boxRef = useRef(box);
  const fullRef = useRef(full);
  useEffect(() => {
    viewRef.current = view;
    boxRef.current = box;
    fullRef.current = full;
  });
  const gesture = useRef({
    pointers: new Map(),
    pan: null,
    pinch: null,
    press: null,
    moved: false,
  });
  // A piece is being dragged or the picture panned (the grabbing cursor), and what a key press
  // last did.
  const [dragging, setDragging] = useState(false);
  const [panning, setPanning] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // #303: the wheel hint ("Hold Ctrl and scroll to zoom"), while it shows.
  const [hint, setHint] = useState(null);
  const hintTimer = useRef(null);

  // Once a gesture belongs to the picture (a pinch, a lifted piece, a full-screen pan), the
  // finger's moves are its, not the page's scroll. Native and not passive: only a cancelled
  // touchmove stops the browser scrolling.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onTouchMove = (event) => {
      const g = gesture.current;
      if ((g.pinch || g.press?.armed || g.pan) && event.cancelable) event.preventDefault();
    };
    svg.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => svg.removeEventListener("touchmove", onTouchMove);
  }, []);
  // A long press or a hint still waiting when the picture goes away never fires.
  useEffect(() => {
    const current = gesture.current;
    return () => {
      clearTimeout(current.press?.timer);
      clearTimeout(hintTimer.current);
    };
  }, []);

  // Ctrl / Cmd + wheel (and a trackpad pinch, which the browser sends as one) zooms; in full
  // screen a plain wheel does too. Native, because React's wheel listener is passive and can't
  // stop the browser zooming or scrolling the page. In normal view a plain wheel scrolls the
  // page, and the hint says how to zoom.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (event) => {
      if (!(event.ctrlKey || event.metaKey || fullRef.current)) {
        clearTimeout(hintTimer.current);
        setHint(`Hold ${onMac() ? "⌘" : "Ctrl"} and scroll to zoom`);
        hintTimer.current = setTimeout(() => setHint(null), HINT_MS);
        return;
      }
      event.preventDefault();
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      // Lines and pages to px, and one big notch no further than 300 px (Board G's rate).
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1;
      const delta = clamp(event.deltaY * unit, -300, 300);
      const current = viewRef.current;
      const k = current.k * Math.exp(-delta * 0.0015);
      setStored(zoomedAt(current, boxRef.current, ctm, k, event.clientX, event.clientY));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  /** Zoom by `factor` around the middle of the diagram (the buttons and the + / - keys). */
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

  /** Reset: back to fit, unpanned, and every moved piece back where the layout put it. */
  function resetAll() {
    setStored(FIT);
    if (editor?.edited) {
      editor.reset();
      setAnnouncement("View reset.");
    }
  }

  /** A finger has rested on the piece long enough: it lifts, and a drag now moves it. */
  function arm(press) {
    if (gesture.current.press !== press) return;
    press.armed = true;
    press.element.setAttribute("data-drag-armed", "");
    navigator.vibrate?.(12);
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

  /** A pan starting at screen point (x, y), from `from` (the view then), `active` once moving. */
  function startPan(x, y, from, ctm, active = false) {
    gesture.current.pan = { x, y, view: from, a: ctm.a, d: ctm.d, active };
  }

  function onPointerDown(event) {
    const g = gesture.current;
    const touch = event.pointerType === "touch";
    // The middle button (and any other) is the browser's; left and right are ours.
    if (!touch && event.button !== 0 && event.button !== 2) return;
    g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    g.moved = false;
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return;
    if (touch && g.pointers.size === 2) {
      endPress();
      const [p, q] = [...g.pointers.values()];
      const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      g.pan = null;
      // Worked out from here on every move (not move by move), so skipped moves lose nothing.
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
      return;
    }
    if (g.pointers.size > 1) return;
    // A right drag pans, over a piece or not.
    if (event.button === 2) {
      startPan(event.clientX, event.clientY, view, ctm);
      return;
    }
    const piece = editor ? event.target.closest?.("[data-drag-node], [data-drag-edge]") : null;
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
        ctm,
        // A mouse or a pen drags straight away; a finger first rests (see arm()).
        armed: !touch,
        active: false,
        timer: null,
      };
      g.press = press;
      g.pan = null;
      if (touch) press.timer = setTimeout(() => arm(press), LONG_PRESS_MS);
      return;
    }
    // One finger pans in full screen only; in normal view it scrolls the page (touch-action).
    if (!touch || full) startPan(event.clientX, event.clientY, view, ctm);
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
        MIN_ZOOM,
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
        setPanning(true);
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
      // A quick swipe: in normal view the page scrolls (the browser's); in full screen it pans.
      endPress();
      if (full) {
        startPan(press.x, press.y, press.view, press.ctm, true);
        g.moved = true;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setPanning(true);
        setStored(
          clampView(
            {
              k: press.view.k,
              x: press.view.x - dx / press.ctm.a,
              y: press.view.y - dy / press.ctm.d,
            },
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

  // The arrow keys move the focused node (Shift further); anywhere else in the picture they pan
  // it, + and - zoom and 0 resets (#303).
  function onKeyDown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const arrow = ARROW_KEYS[event.key];
    const piece = editor && arrow ? event.target.closest?.("[data-drag-node]") : null;
    if (piece) {
      event.preventDefault();
      const id = piece.getAttribute("data-drag-node");
      const at = editor.nodeAt(id);
      if (!at) return;
      const step = event.shiftKey ? KEY_STEP_BIG : KEY_STEP;
      const proposed = { x: at.x + arrow.x * step, y: at.y + arrow.y * step };
      editor.moveNode(id, keepInside(proposed, extentsOf(piece, at), box));
      setAnnouncement(`Moved ${pieceName(piece)} ${arrow.word}.`);
      return;
    }
    if (arrow) {
      const step = KEY_PAN_PX / ((box.scale ?? 1) * view.k);
      setStored(
        clampView({ k: view.k, x: view.x + arrow.x * step, y: view.y + arrow.y * step }, box),
      );
    } else if (event.key === "+" || event.key === "=") {
      zoomBy(BUTTON_STEP);
    } else if (event.key === "-" || event.key === "_") {
      zoomBy(1 / BUTTON_STEP);
    } else if (event.key === "0") {
      resetAll();
    } else {
      return;
    }
    event.preventDefault();
  }

  function onPointerEnd(event) {
    const g = gesture.current;
    if (g.press && g.press.pointerId === event.pointerId) endPress();
    g.pointers.delete(event.pointerId);
    if (g.pointers.size < 2) g.pinch = null;
    if (g.pointers.size === 0) {
      g.pan = null;
      setPanning(false);
    }
  }

  // The right button pans, and a long press on a touch screen would open the browser's menu.
  function onContextMenu(event) {
    event.preventDefault();
  }

  // A press that panned, pinched or dragged is not a tap: the node under it is not pinned.
  function onClickCapture(event) {
    if (gesture.current.moved) {
      event.stopPropagation();
      event.preventDefault();
      gesture.current.moved = false;
    }
  }

  // Tabbing to a piece outside the window brings it into view.
  function onFocus(event) {
    if (atFit) return;
    const piece = event.target.closest?.("[data-focusable]");
    if (!piece?.getBBox) return;
    const next = viewShowing(view, box, piece.getBBox());
    if (next) setStored(next);
  }

  const w = box.width / view.k;
  const h = box.height / view.k;
  const percent = Math.round(view.k * 100);
  const moved = Boolean(editor?.edited);
  const changed = !atFit || moved;
  // Panned: the window's centre is off the fitted box's (zooming at the middle keeps it).
  const tolerance = box.scale ? 0.5 / box.scale : 1e-6;
  const panned =
    Math.abs(view.x + w / 2 - box.width / 2) > tolerance ||
    Math.abs(view.y + h / 2 - box.height / 2) > tolerance;
  // What Reset would undo, for its label.
  const undo = [
    Math.abs(view.k - 1) >= 0.001 && "zoom",
    panned && "panning",
    moved && "moved pieces",
  ].filter(Boolean);
  const undoText =
    undo.length > 1
      ? `${undo.slice(0, -1).join(", ")} and ${undo[undo.length - 1]}`
      : (undo[0] ?? "the view");
  const pieceWord = editor ? (editor.piece ?? "node") : null;
  const help = zoomHelp({ coarse: pointer.coarse, full, mac: pointer.mac, piece: pieceWord });

  // #303: the Zoom group, on the workbench's header row when it gives a slot (zoomControlsSlot.js).
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
        disabled={view.k <= MIN_ZOOM + 0.001}
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
        aria-label={
          changed
            ? `Reset view: undo ${undoText} (zoom ${percent}%)`
            : `Reset view (already the default view, zoom ${percent}%)`
        }
        data-active={changed ? "true" : undefined}
        disabled={!changed}
        onClick={resetAll}
        sx={{ ...zoomButtonSx, ...(changed ? resetActiveSx : {}) }}
      >
        Reset
      </Box>
    </Box>
  );

  return (
    <Box
      id={`${idPrefix}-zoom`}
      data-zoom={view.k.toFixed(2)}
      data-panned={panned ? "true" : undefined}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}
    >
      {slot && createPortal(zoomGroup, slot)}
      {(!slot || toolbar) && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          {!slot && zoomGroup}
          {toolbar}
        </Box>
      )}
      <Box
        ref={areaRef}
        id={`${idPrefix}-area`}
        sx={{
          position: "relative",
          width: "100%",
          // Measured: the drawing's shape at this width. Before that, the same by CSS.
          height: naturalHeight ?? undefined,
          aspectRatio: naturalHeight ? undefined : `${drawing.width} / ${drawing.height}`,
          minHeight: MIN_AREA_HEIGHT,
          maxHeight: AREA_MAX_HEIGHT,
          [COMPACT_MEDIA]: { maxHeight: AREA_MAX_HEIGHT_COMPACT },
          overflow: "hidden",
        }}
      >
        <DiagramSvg
          id={`${idPrefix}-svg`}
          svgRef={svgRef}
          label={label}
          viewBox={`${box.minX + view.x} ${box.minY + view.y} ${w} ${h}`}
          interactive
          tabIndex={0}
          aria-describedby={`${idPrefix}-zoom-keys`}
          data-zoomed={zoomed ? "true" : undefined}
          data-dragging={dragging ? "true" : undefined}
          data-panning={panning ? "true" : undefined}
          data-editable={editor ? "true" : undefined}
          extraSx={{
            // In normal view a one-finger vertical swipe is the browser's (the page scrolls);
            // a pinch, a held piece and a sideways swipe are ours. In full screen every touch
            // gesture is ours.
            touchAction: full ? "none" : "pan-y",
            height: "100%",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
            cursor: "grab",
            outline: "none",
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "brand.line",
              outlineOffset: "-2px",
            },
            "& [data-drag-node], & [data-drag-edge]": { cursor: "grab" },
            "&[data-dragging], &[data-dragging] *, &[data-panning], &[data-panning] *": {
              cursor: "grabbing",
            },
            // A long press has lifted this piece: a shadow, and a node grows a little.
            "& [data-drag-armed]": { filter: "drop-shadow(0 6px 8px rgba(0, 0, 0, 0.35))" },
            "& [data-drag-node]": {
              transformBox: "fill-box",
              transformOrigin: "center",
              transition: "transform 120ms ease-out",
            },
            "& [data-drag-node][data-drag-armed]": { transform: "scale(1.12)" },
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
        {hint && (
          <Box
            role="status"
            id={`${idPrefix}-zoom-hint`}
            sx={{
              position: "absolute",
              left: "50%",
              bottom: 12,
              transform: "translateX(-50%)",
              px: 1.5,
              py: 0.75,
              borderRadius: "8px",
              backgroundColor: "surface.main",
              border: "1px solid",
              borderColor: "border.strong",
              color: "text.primary",
              fontSize: "0.8125rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {hint}
          </Box>
        )}
      </Box>
      <Box
        component="p"
        id={`${idPrefix}-zoom-help`}
        sx={{ m: 0, mt: -0.5, fontSize: "0.75rem", color: "text.secondary" }}
      >
        {help}
      </Box>
      <Box component="span" id={`${idPrefix}-zoom-keys`} sx={visuallyHiddenSx}>
        Arrow keys pan, plus and minus zoom, 0 resets.
      </Box>
      {editor && (
        <Box component="span" aria-live="polite" id={`${idPrefix}-moved`} sx={visuallyHiddenSx}>
          {announcement}
        </Box>
      )}
    </Box>
  );
}
