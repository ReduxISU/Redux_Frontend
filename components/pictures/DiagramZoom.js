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

import Box from "@mui/material/Box";
import { useEffect, useRef, useState } from "react";
import { COMPACT_MEDIA } from "../workbench/layout";
import DiagramSvg from "./DiagramSvg";

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

/** How much one press of + or - zooms. */
const BUTTON_STEP = 1.5;

/** How far (CSS px) a press moves before it counts as a pan, so a tap stays a tap. */
const DRAG_THRESHOLD = 4;

/** Fit: the whole drawing. `x`, `y` are the window's offset into the drawing, in its units. */
const FIT = { k: 1, x: 0, y: 0 };

function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}

/** The view kept inside the zoom range and the window kept inside the drawing. */
function clampView(view, box) {
  const k = clamp(view.k, 1, MAX_ZOOM);
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
  const next = clamp(k, 1, MAX_ZOOM);
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
 * @param {import("react").ReactNode} props.children The diagram's elements.
 */
export default function DiagramZoom({ idPrefix, label, drawing, resetOn, toolbar, children }) {
  const svgRef = useRef(null);
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
  // The area's height before the screen's cap: the drawing's shape at the area's width.
  const naturalHeight = area
    ? Math.round(drawing.height * Math.min(area.width / drawing.width, MAX_FIT_SCALE))
    : null;
  const box = fitBox(drawing, area);
  const [stored, setStored] = useState(FIT);
  const [storedFor, setStoredFor] = useState(resetOn);
  // React's "adjust state when a prop changes" pattern: a new instance or layout starts at fit.
  if (!sameKeys(storedFor, resetOn)) {
    setStoredFor(resetOn);
    setStored(FIT);
  }
  const view = clampView(stored, box);
  const zoomed = view.k > 1.001;

  // The latest view and box, for the native wheel listener (set up once, below).
  const viewRef = useRef(view);
  const boxRef = useRef(box);
  useEffect(() => {
    viewRef.current = view;
    boxRef.current = box;
  });
  const gesture = useRef({ pointers: new Map(), pan: null, pinch: null, moved: false });

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

  function onPointerDown(event) {
    const g = gesture.current;
    g.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    g.moved = false;
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return;
    if (event.pointerType === "touch" && g.pointers.size === 2) {
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
        MAX_ZOOM,
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

  function onPointerEnd(event) {
    const g = gesture.current;
    g.pointers.delete(event.pointerId);
    if (g.pointers.size < 2) g.pinch = null;
    if (g.pointers.size === 0) g.pan = null;
  }

  // A press that panned or pinched is not a tap: the node under it is not pinned.
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
    const bbox = piece.getBBox();
    const w = box.width / view.k;
    const h = box.height / view.k;
    const left = box.minX + view.x;
    const top = box.minY + view.y;
    const inside =
      bbox.x >= left &&
      bbox.y >= top &&
      bbox.x + bbox.width <= left + w &&
      bbox.y + bbox.height <= top + h;
    if (inside) return;
    setStored(
      clampView(
        {
          k: view.k,
          x: bbox.x + bbox.width / 2 - w / 2 - box.minX,
          y: bbox.y + bbox.height / 2 - h / 2 - box.minY,
        },
        box,
      ),
    );
  }

  const w = box.width / view.k;
  const h = box.height / view.k;
  const percent = Math.round(view.k * 100);

  return (
    <Box
      id={`${idPrefix}-zoom`}
      data-zoom={view.k.toFixed(2)}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
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
            disabled={view.k >= MAX_ZOOM - 0.001}
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
        </Box>
        {toolbar}
      </Box>
      <Box
        ref={areaRef}
        id={`${idPrefix}-area`}
        sx={{
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
          data-zoomed={zoomed ? "true" : undefined}
          extraSx={{
            // At fit the browser keeps one-finger panning (the page scrolls); a pinch is ours.
            // Zoomed in, every touch gesture is ours.
            touchAction: zoomed ? "none" : "pan-x pan-y",
            height: "100%",
            userSelect: "none",
            cursor: zoomed ? "grab" : undefined,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onClickCapture={onClickCapture}
          onFocus={onFocus}
        >
          {children}
        </DiagramSvg>
      </Box>
    </Box>
  );
}
