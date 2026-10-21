// components/pictures/ReductionView.js
//
// #215: the Reduction View. The instance you gave on the left, the instance the reduction builds
// on the right (stacked, source first, when the Workspace is 960px wide or less: #279), each
// drawn by the renderer its picture type already has (./registry.js), so every picture type
// works on either side. One
// list of frames walks three phases, Build, Solve and Map back (the design mockup's Reduction
// tab and ReduxISU/Redux's PICTURE-TYPES.md, "Reduction"); the shared step controls under the
// picture walk it, and ReductionPhaseBar above them names the phase and jumps to one.
//
// What this file adds on top of the two pictures, all through the `data-*-id` attributes every
// renderer already marks its pieces with (lib/reductionView.js PIECE_ID_ATTRIBUTES), so no
// renderer knows about the view:
//   - During Build, the target pieces not built yet are hidden in place (`visibility: hidden`),
//     so the layout is the finished target's from the first step and nothing moves.
//   - Gadget links. Hovering, focusing or tapping a piece on either side marks every piece the
//     gadgets that name it name, on both sides, in the gadget gold (`viz.gadget`, the color the
//     Result panel's Gadgets rows use), and fades the rest by color (grayscale, the renderers' own
//     trace fade), never by opacity. A tap pins the link until the same piece is tapped again,
//     empty space is tapped, or Escape is pressed. A Gadgets row hovered in the Result panel
//     draws its gadget the same way. A line under the pictures says what is linked, in words, so
//     the link is not told by color alone and a screen reader hears it.
//   - Each side's Visualization Type dropdown (ReduxISU/Redux#912) at the pane's top right, as in
//     the two-pane layout. Choosing another picture asks Redux again (components/workbench/
//     Workbench.js); while it does, both panes say so instead of showing the old pictures. A
//     target picture that lacks the pieces the build adds (buildReveal "whole") is shown whole
//     during Build, with a line saying so.
//
// The build and fade marks are data attributes set on the renderers' own elements after React
// draws them (and again whenever a renderer adds elements of its own, through a
// MutationObserver), styled by this component's stylesheet. React never sets those attributes, so
// it never clears them.
//
// #239: the gadget marks themselves are drawn by the renderers (gadgetRings.js), from the
// `highlightIds` and `gadgetColors` each pane passes down: a ring around a node or a box, a band
// under an edge. A Plain / Color switch beside the line under the pictures picks how:
//   - Plain marks the linked pieces in the gadget gold while something is pointed at.
//   - Color gives every gadget its own color (lib/gadgets.js gadgetColorMap, cycling
//     GADGET_PALETTE) on both sides all the time, so a piece and what it became match by eye;
//     pointing still fades what is not linked.
// The choice is kept for the viewer (hooks/useGadgetColorMode.js). During Build the caption lists
// the gadgets the step made, in plain words, and the step's bound when it sets one. A dashed
// "Rule says no" line is a piece too (lib/reductionView.js gives it to its edge rule). A picture
// that draws none of the pieces a side's gadgets name (a Search Tree) says links can't be shown.
//
// #279 stage 3 (board F): each side is a picture frame (components/workbench/PictureFrame.js):
// "Source · <problem>" and "Target · <problem>" with the Visualization Type, the zoom buttons
// and Full screen in its caption, then the side's "Problem:" and "Algorithm:" lines, then the
// picture at the frames' shared height, so the two pictures share their top and bottom lines.
// The phase bar is the Algorithm Steps timeline, Build ── Solve ── Map back.

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { GADGET_EMPTY_SIDE, GADGET_KINDS, OTHER_GADGET_KIND } from "../../data/gadgetKinds";
import { describeGadget, gadgetColorMap, gadgetIdName } from "../../lib/gadgets";
import {
  eventWord,
  linkedPieces,
  PIECE_SELECTOR,
  paneFrame,
  phaseStarts,
  pieceIdOf,
  pieceNamer,
  placeInPhase,
  REDUCTION_PHASES,
  sideLinkable,
  unbuiltIds,
} from "../../lib/reductionView";
import { paletteVars } from "../theme";
import PictureFrame, { pictureGridSx } from "../workbench/PictureFrame";
import { GADGET_PALETTE } from "./gadgetRings";
import { FAINT_FILTER, PictureToggle } from "./graphPieces";
import PictureCanvas from "./PictureCanvas";

const ARROW = "↦";
const TIMELINE_RULE = "──";
const GADGET_RING = paletteVars.viz.gadget;

/** The Plain / Color switch's choices (#239). */
const MARK_MODES = [
  { value: "plain", label: "Plain" },
  { value: "color", label: "Color" },
];

/** How many of a step's gadgets the caption lists before "and n more". */
const STEP_GADGET_LIMIT = 4;

const LINKS_UNAVAILABLE =
  "Gadget links can't be shown on this picture: it doesn't draw the pieces the gadgets name.";

const KIND_LABELS = new Map(
  [...GADGET_KINDS, OTHER_GADGET_KIND].map((entry) => [entry.kind, entry.label]),
);

/** Lowercase singular of a gadget kind's group label ("Edge rules" reads "edge rule"). */
function kindWord(kind) {
  const label = KIND_LABELS.get(kind) ?? OTHER_GADGET_KIND.label;
  return label.replace(/s$/, "").toLowerCase();
}

function setMark(element, name, value) {
  if (value === null) {
    if (element.hasAttribute(name)) element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) {
    element.setAttribute(name, value);
  }
}

/**
 * Marks a pane's pieces: `data-rv-built="no"` on the ones not built yet, and, while a link is
 * shown, `data-rv-link` "hot" on the linked ones and "faint" on the rest (dashed missing lines
 * included). A faded piece that holds
 * a linked one (a clause around its literals) is left unfaded, so the linked one keeps its colors.
 * The pane itself gets the counts, for the tests and for anyone reading the DOM.
 */
function markPieces(root, hidden, hot) {
  if (!root) return;
  let hotCount = 0;
  let hiddenCount = 0;
  const pieces = root.querySelectorAll(PIECE_SELECTOR);
  for (const element of pieces) {
    const id = pieceIdOf(element);
    const isHidden = hidden.has(id);
    if (isHidden) hiddenCount += 1;
    setMark(element, "data-rv-built", isHidden ? "no" : null);
    let link = null;
    if (hot && !isHidden) {
      link = hot.has(id) ? "hot" : "faint";
      if (link === "hot") hotCount += 1;
    }
    setMark(element, "data-rv-link", link);
  }
  // A picture's dashed "missing" lines without an id of their own (two ends) fade with the rest
  // while a link is shown. ("Rule says no" lines have ids, #239, and are pieces above.)
  for (const element of root.querySelectorAll("[data-phantom]:not([data-phantom-id])")) {
    setMark(element, "data-rv-link", hot ? "faint" : null);
  }
  // A gadget mark a renderer draws beside its piece rather than inside it (a band under an
  // edge drawn as a bare path) follows its piece: hidden while the piece is, faded with it.
  for (const element of root.querySelectorAll("[data-gadget-ring]")) {
    if (element.parentElement?.closest(PIECE_SELECTOR)) continue;
    const id = element.getAttribute("data-gadget-ring");
    const isHidden = hidden.has(id);
    setMark(element, "data-rv-built", isHidden ? "no" : null);
    setMark(element, "data-rv-link", hot && !isHidden && !hot.has(id) ? "faint" : null);
  }
  if (hot) {
    for (const element of root.querySelectorAll('[data-rv-link="hot"]')) {
      let holder = element.parentElement?.closest('[data-rv-link="faint"]');
      while (holder && root.contains(holder)) {
        holder.removeAttribute("data-rv-link");
        holder = holder.parentElement?.closest('[data-rv-link="faint"]');
      }
    }
  }
  root.setAttribute("data-hidden-count", String(hiddenCount));
  root.setAttribute("data-linked-count", hot ? String(hotCount) : "0");
}

/**
 * One side of the view: its title and its picture, drawn by the picture type's own renderer,
 * with the build and link marks on top.
 */
function ReductionPane({
  idPrefix,
  which,
  title,
  typeControl,
  loading,
  note,
  type,
  payload,
  name,
  frame,
  frames,
  frameIndex,
  hidden,
  hot,
  gadgetColors,
  onPoint,
  showing,
  fullScreenTitle,
  timeline,
}) {
  const ref = useRef(null);
  // The renderer draws the marks (#239): the linked pieces while a link is shown.
  const highlightIds = useMemo(() => (hot ? [...hot] : undefined), [hot]);
  const marks = useRef({ hidden, hot });

  // After every draw, and whenever a renderer adds elements of its own between draws.
  useLayoutEffect(() => {
    marks.current = { hidden, hot };
    markPieces(ref.current, hidden, hot);
  });
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof MutationObserver === "undefined") return undefined;
    const observer = new MutationObserver(() =>
      markPieces(root, marks.current.hidden, marks.current.hot),
    );
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const pieceAt = (target) => {
    const element = target instanceof Element ? target.closest(PIECE_SELECTOR) : null;
    if (!element || !ref.current?.contains(element)) return null;
    if (element.getAttribute("data-rv-built") === "no") return null;
    return pieceIdOf(element);
  };

  return (
    <PictureFrame
      id={`${idPrefix}-frame`}
      title={title}
      titleId={`${idPrefix}-title`}
      typeControl={typeControl}
      showing={showing}
      fullScreenTitle={fullScreenTitle}
      note={note && !loading ? note : null}
      noteId={`${idPrefix}-note`}
      inGrid
      timeline={timeline}
      align={loading ? "center" : "stretch"}
    >
      {loading ? (
        <Box
          id={idPrefix}
          data-pane={which}
          data-loading="true"
          role="status"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.5,
            color: "text.secondary",
          }}
        >
          <CircularProgress size={18} aria-hidden="true" />
          {loading}
        </Box>
      ) : (
        <Box
          ref={ref}
          id={idPrefix}
          data-pane={which}
          data-picture-type={type}
          onPointerOver={(event) => {
            if (event.pointerType === "mouse") onPoint(which, pieceAt(event.target), "hover");
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") onPoint(which, null, "hover");
          }}
          onFocus={(event) => onPoint(which, pieceAt(event.target), "focus")}
          onBlur={() => onPoint(which, null, "focus")}
          onClick={(event) => onPoint(which, pieceAt(event.target), "tap")}
          onKeyDown={(event) => {
            if (event.key === "Escape") onPoint(which, null, "clear");
          }}
          sx={{
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            "& [data-rv-built='no']": { visibility: "hidden" },
            "& [data-rv-link='faint']": {
              filter: `${FAINT_FILTER} !important`,
            },
          }}
        >
          <PictureCanvas
            idPrefix={`${idPrefix}-frames`}
            name={name}
            type={type}
            payload={payload}
            frame={frame}
            frameIndex={frameIndex}
            frameCount={frames.length}
            frames={frames}
            showCaption={false}
            highlightIds={highlightIds}
            gadgetColors={gadgetColors}
            boxSoFar
          />
        </Box>
      )}
    </PictureFrame>
  );
}

/**
 * The Algorithm Steps timeline of a reduction run (#279 stage 3): Build ── Solve ── Map back.
 * The current step's phase is marked; each label jumps to its phase's first step; a phase with no
 * steps yet is greyed (dashed) and can't be pressed, its `hints` entry saying why.
 * @param {Object} props
 * @param {string} props.idPrefix
 * @param {Object[]} props.frames The view's frames.
 * @param {number} props.frameIndex The step on screen.
 * @param {(index: number) => void} props.onStepChange
 * @param {{[phase: string]: string}} [props.hints] Why a phase has no steps yet.
 */
export function ReductionPhaseBar({ idPrefix, frames, frameIndex, onStepChange, hints = {} }) {
  const starts = phaseStarts(frames);
  const current = frames[frameIndex]?.phase ?? null;
  return (
    <Box
      id={idPrefix}
      role="group"
      aria-label="Phases of the reduction run"
      sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}
    >
      {REDUCTION_PHASES.map((phase, index) => {
        const start = starts[phase.key];
        const here = phase.key === current;
        const off = start === undefined;
        return (
          <Box key={phase.key} component="span" sx={{ display: "contents" }}>
            {index > 0 && (
              <Box component="span" aria-hidden="true" sx={{ color: "text.secondary" }}>
                {TIMELINE_RULE}
              </Box>
            )}
            <Box
              component="button"
              type="button"
              id={`${idPrefix}-${phase.key}`}
              data-phase={phase.key}
              aria-current={here ? "step" : undefined}
              disabled={off}
              title={
                off ? (hints[phase.key] ?? phase.about) : `Go to the first ${phase.label} step`
              }
              onClick={() => onStepChange(start)}
              sx={{
                minHeight: 36,
                px: 1.5,
                borderRadius: "999px",
                border: "1px solid",
                borderColor: here ? "brand.line" : "border.main",
                boxShadow: here ? `inset 0 0 0 1px ${paletteVars.brand.line}` : "none",
                backgroundColor: here ? "surface.raised" : "surface.main",
                color: here ? "text.primary" : "text.secondary",
                fontFamily: "inherit",
                fontSize: "0.8125rem",
                fontWeight: here ? 700 : 500,
                cursor: "pointer",
                "&:disabled": {
                  cursor: "not-allowed",
                  borderStyle: "dashed",
                  color: "text.secondary",
                },
              }}
            >
              {phase.label}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * The gadgets a build step made (`frame.gadgets`, indexes into the view's gadgets), in plain
 * words (#239), with the step's bound when it sets one (`frame.bound`: Clique's K). In Color mode
 * each gadget carries its color.
 */
function StepGadgets({ id, frame, gadgets, describe, colors }) {
  const made = (Array.isArray(frame.gadgets) ? frame.gadgets : [])
    .map((index) => gadgets[index])
    .filter(Boolean);
  const hasBound =
    (typeof frame.bound === "number" && Number.isFinite(frame.bound)) ||
    (typeof frame.bound === "string" && frame.bound.trim() !== "");
  if (frame.phase !== "build" || (made.length === 0 && !hasBound)) return null;
  const shown = made.slice(0, STEP_GADGET_LIMIT);
  const more = made.length - shown.length;
  return (
    <Box
      id={id}
      data-gadget-count={made.length}
      sx={{
        flexBasis: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        fontSize: "0.8125rem",
      }}
    >
      {hasBound && (
        <Box id={`${id}-bound`} data-bound={String(frame.bound)}>
          <Box component="span" sx={{ fontWeight: 700 }}>
            Bound:
          </Box>{" "}
          {String(frame.bound)}
        </Box>
      )}
      {made.length > 0 && (
        <>
          <Box component="span" id={`${id}-label`} sx={{ fontWeight: 700 }}>
            {`This step made ${made.length === 1 ? "1 gadget" : `${made.length} gadgets`}:`}
          </Box>
          <Box
            component="ul"
            aria-labelledby={`${id}-label`}
            sx={{ m: 0, pl: 2.5, display: "flex", flexDirection: "column", gap: 0.25 }}
          >
            {shown.map((gadget) => {
              const color = colors?.get(gadget.index) ?? null;
              return (
                <Box
                  component="li"
                  key={gadget.index}
                  data-gadget-index={gadget.index}
                  data-gadget-color={color ?? undefined}
                  sx={{ overflowWrap: "anywhere" }}
                >
                  {color && (
                    <Box
                      component="span"
                      aria-hidden="true"
                      sx={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        mr: 0.75,
                        borderRadius: "50%",
                        border: `3px solid ${color}`,
                        boxSizing: "border-box",
                        verticalAlign: "-1px",
                      }}
                    />
                  )}
                  {`${capitalize(kindWord(gadget.kind))}: ${describe(gadget)}`}
                </Box>
              );
            })}
          </Box>
          {more > 0 && (
            <Box component="span" id={`${id}-more`} sx={{ color: "text.secondary" }}>
              {`and ${more} more (the Result panel's Gadgets list has them all).`}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

function capitalize(text) {
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : text;
}

/** The step's caption: its phase and place in it, what happened, and the verdict at the end. */
function ReductionCaption({ id, frames, frameIndex, gadgets, describe, colors }) {
  const frame = frames[frameIndex];
  if (!frame) return null;
  const phase = REDUCTION_PHASES.find((entry) => entry.key === frame.phase);
  const { index, count } = placeInPhase(frames, frameIndex);
  const word = eventWord(frame.phase, frame.event);
  const verdict =
    typeof frame.ok === "boolean" ? (frame.ok ? "Verdict: yes" : "Verdict: no") : null;
  return (
    <Box
      id={id}
      aria-live="polite"
      data-phase={frame.phase}
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
      <Box
        component="span"
        id={`${id}-phase`}
        sx={{
          fontSize: "0.75rem",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "text.secondary",
        }}
      >
        {`${phase?.label ?? frame.phase} ${index + 1} of ${count}`}
      </Box>
      {word && (
        <Box component="span" id={`${id}-event`} sx={{ fontWeight: 700 }}>
          {word}
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
      <StepGadgets
        id={`${id}-gadgets`}
        frame={frame}
        gadgets={gadgets}
        describe={describe}
        colors={colors}
      />
    </Box>
  );
}

function listNames(ids, nameOf, limit = 6) {
  const names = [...ids].map(nameOf);
  if (names.length <= limit) return names.join(", ");
  return `${names.slice(0, limit).join(", ")} and ${names.length - limit} more`;
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {ReturnType<typeof import("../../lib/reductionView").normalizeReductionView>} props.view
 * @param {number} props.frameIndex The step on screen.
 * @param {{sourceIds: string[], targetIds: string[]}|null} [props.activeGadget] The gadget a
 *   Gadgets row in the Result panel is pointing at, drawn when no piece is.
 * @param {{source?: import("react").ReactNode, target?: import("react").ReactNode}} [props.typeControls]
 *   Each side's Visualization Type dropdown, drawn at the pane's top right.
 * @param {string|null} [props.loading] Said in both panes, in place of the pictures, while
 *   another picture is being drawn (`view` is then the one before it, for the titles).
 * @param {"plain"|"color"} [props.colorMode] How gadgets are marked (#239): Plain, in the gadget
 *   gold while pointed at, or Color, each gadget in its own color all the time.
 * @param {(mode: "plain"|"color") => void} [props.onColorMode] The Plain / Color switch.
 */
export default function ReductionView({
  idPrefix,
  view,
  frameIndex,
  activeGadget = null,
  typeControls = {},
  loading = null,
  colorMode = "plain",
  onColorMode = null,
  sides = {},
  timeline = null,
}) {
  const { source, target, gadgets } = view;
  const sourceFrames = useMemo(
    () => view.frames.map((frame) => paneFrame(frame, "source", source.type)),
    [view, source.type],
  );
  const targetFrames = useMemo(
    () => view.frames.map((frame) => paneFrame(frame, "target", target.type)),
    [view, target.type],
  );
  const names = useMemo(() => {
    const sourceName = pieceNamer(source.payload);
    const targetName = pieceNamer(target.payload);
    // A "Rule says no" pair (#239) is not in the payload: it reads by its two ends.
    const pairs = new Map();
    for (const viewFrame of view.frames) {
      for (const pair of Array.isArray(viewFrame.target?.skipped) ? viewFrame.target.skipped : []) {
        if (typeof pair?.id === "string") pairs.set(pair.id, pair);
      }
    }
    return {
      source: (id) => gadgetIdName(id, sourceName, null),
      target: (id) => {
        const pair = pairs.get(id);
        if (pair) return `unjoined pair ${targetName(pair.a)}–${targetName(pair.b)}`;
        return gadgetIdName(id, targetName, null);
      },
    };
  }, [view, source.payload, target.payload]);
  const describe = (gadget) => describeGadget(gadget, names, GADGET_EMPTY_SIDE).sentence;
  // Color mode's colors (#239): by piece on each side, and by gadget for the lists.
  const colors = useMemo(
    () => (colorMode === "color" ? gadgetColorMap(gadgets, GADGET_PALETTE) : null),
    [colorMode, gadgets],
  );
  // A side whose picture draws none of its gadgets' pieces (a Search Tree) can't show links.
  const linkable = useMemo(
    () => ({ source: sideLinkable(view, "source"), target: sideLinkable(view, "target") }),
    [view],
  );
  const index = Math.min(Math.max(frameIndex, 0), view.frames.length - 1);
  const frame = view.frames[index];
  const hiddenTarget = useMemo(() => unbuiltIds(view, frame), [view, frame]);
  // A target picture without the build's pieces is shown whole while it is built (#912).
  let targetNote = null;
  if (frame.phase === "build" && target.buildReveal === "whole") {
    targetNote =
      target.type === "SearchTree"
        ? "The search tree grows when the solver runs, in Solve."
        : "This picture can't show the target piece by piece, so it shows it whole while it is built.";
  }
  const noneHidden = useMemo(() => new Set(), []);
  const linkNote = (which) => (gadgets.length > 0 && !linkable[which] ? LINKS_UNAVAILABLE : null);
  const joinNotes = (...notes) => notes.filter(Boolean).join(" ") || null;

  // What is pointed at: hovered or focused (`hover`), or tapped (`pinned`, kept until tapped
  // again). The hover wins while there is one, as the renderers' own traces do.
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  function point(which, id, how) {
    if (how === "clear") {
      setHover(null);
      setPinned(null);
    } else if (how === "tap") {
      setPinned((current) =>
        id === null || (current?.which === which && current.id === id) ? null : { which, id },
      );
    } else {
      setHover(id === null ? null : { which, id });
    }
  }
  const pointer = hover ?? pinned;

  let link = null;
  if (pointer) {
    link = { ...linkedPieces(gadgets, pointer.which, pointer.id), pointer };
  } else if (activeGadget) {
    link = {
      source: new Set(activeGadget.sourceIds),
      target: new Set(activeGadget.targetIds),
      gadgets: [activeGadget.index],
      pointer: null,
    };
  }

  let readout;
  if (link?.pointer) {
    const { which, id } = link.pointer;
    const problem = which === "source" ? source.problem : target.problem;
    const name = names[which](id);
    // "a and b (not joined)" takes the problem inside its own brackets, not a second pair.
    const pointed = name.endsWith(")")
      ? `${name.slice(0, -1)}, ${problem})`
      : `${name} (${problem})`;
    if (link.gadgets.length === 0) {
      readout = `${pointed}: no gadget names this piece.`;
    } else {
      const kinds = [...new Set(link.gadgets.map((gadgetIndex) => gadgets[gadgetIndex].kind))]
        .map(kindWord)
        .join(", ");
      const from = link.source.size ? listNames(link.source, names.source) : "the whole instance";
      const to = link.target.size ? listNames(link.target, names.target) : "the whole target";
      const count = link.gadgets.length;
      const by =
        count === 1
          ? `${/^[aeiou]/.test(kinds) ? "an" : "a"} ${kinds} gadget`
          : `${count} gadgets (${kinds})`;
      // One gadget with a reason of its own (an edge rule's, a bound's) says the reason instead of
      // listing the pointed side again: the reason already names those pieces (#239).
      const note = count === 1 ? gadgets[link.gadgets[0]].note.trim() : "";
      if (note) {
        const other = which === "source" ? link.target : link.source;
        const otherProblem = which === "source" ? target.problem : source.problem;
        const otherNames = which === "source" ? names.target : names.source;
        const to = other.size ? ` to ${otherProblem} ${listNames(other, otherNames)}` : "";
        readout = `${pointed}, linked by ${by}${to}: ${/[.!?]$/.test(note) ? note : `${note}.`}`;
      } else {
        readout = `${pointed}, linked by ${by}: ${source.problem} ${from} ${ARROW} ${target.problem} ${to}.`;
      }
    }
  } else if (link) {
    const from = link.source.size ? listNames(link.source, names.source) : "the whole instance";
    const to = link.target.size ? listNames(link.target, names.target) : "the whole target";
    readout = `Gadget: ${source.problem} ${from} ${ARROW} ${target.problem} ${to}.`;
  } else {
    readout =
      gadgets.length > 0
        ? "Point at a piece on either side, or tap it, to see what it became or came from."
        : "This reduction lists no gadgets, so its pieces are not linked across.";
  }

  return (
    <Box
      id={idPrefix}
      data-phase={frame.phase}
      data-frame-index={index}
      data-linked={link ? "true" : "false"}
      data-loading={loading ? "true" : "false"}
      data-source-visualization={source.visualization ?? ""}
      data-target-visualization={target.visualization ?? ""}
      data-build-reveal={target.buildReveal}
      sx={{ display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}
    >
      <Box sx={pictureGridSx}>
        <ReductionPane
          idPrefix={`${idPrefix}-source`}
          which="source"
          title={sides.source?.title ?? `Source · ${source.problem}`}
          showing={sides.source?.showing ?? null}
          fullScreenTitle={sides.source?.fullScreenTitle ?? null}
          timeline={timeline}
          typeControl={typeControls.source ?? null}
          loading={loading}
          type={source.type}
          payload={source.payload}
          name={source.problem}
          frame={sourceFrames[index]}
          frames={sourceFrames}
          frameIndex={index}
          note={loading ? null : linkNote("source")}
          hidden={noneHidden}
          hot={link ? link.source : null}
          gadgetColors={colors?.source}
          onPoint={point}
        />
        <ReductionPane
          idPrefix={`${idPrefix}-target`}
          which="target"
          title={sides.target?.title ?? `Target · ${target.problem}`}
          showing={sides.target?.showing ?? null}
          fullScreenTitle={sides.target?.fullScreenTitle ?? null}
          timeline={timeline}
          typeControl={typeControls.target ?? null}
          loading={loading}
          note={joinNotes(targetNote, linkNote("target"))}
          type={target.type}
          payload={target.payload}
          name={target.problem}
          frame={targetFrames[index]}
          frames={targetFrames}
          frameIndex={index}
          hidden={hiddenTarget}
          hot={link ? link.target : null}
          gadgetColors={colors?.target}
          onPoint={point}
        />
      </Box>
      {!loading && (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 12px" }}>
          {gadgets.length > 0 && onColorMode && (
            <Box
              id={`${idPrefix}-marks-row`}
              data-gadget-marks={colorMode}
              sx={{ display: "flex", alignItems: "center", gap: 1, flex: "none" }}
            >
              <Box
                component="span"
                id={`${idPrefix}-marks-label`}
                sx={{ fontSize: "0.8125rem", color: "text.secondary" }}
              >
                Gadgets
              </Box>
              <PictureToggle
                id={`${idPrefix}-marks`}
                label="Gadget marks: Plain marks one gadget while you point at it, Color gives every gadget its own color"
                options={MARK_MODES}
                value={colorMode}
                onChange={onColorMode}
              />
            </Box>
          )}
          <Box
            id={`${idPrefix}-link`}
            aria-live="polite"
            data-linked={link ? "true" : "false"}
            sx={{
              flex: "1 1 280px",
              minWidth: 0,
              fontSize: "0.8125rem",
              color: link ? "text.primary" : "text.secondary",
              borderLeft: "3px solid",
              borderColor: link ? GADGET_RING : "transparent",
              pl: 1,
            }}
          >
            {readout}
          </Box>
        </Box>
      )}
      {!loading && (
        <ReductionCaption
          id={`${idPrefix}-caption`}
          frames={view.frames}
          frameIndex={index}
          gadgets={gadgets}
          describe={describe}
          colors={colors?.byGadget ?? null}
        />
      )}
    </Box>
  );
}
