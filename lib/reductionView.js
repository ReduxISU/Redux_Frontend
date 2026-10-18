// lib/reductionView.js
//
// #215: reading Redux's Reduction View (ProblemProvider/reductionView, ReduxISU/Redux#660) for
// the workbench's Reduce mode, and the pure parts of drawing it:
//
//   - Asking for it, with a fallback. A backend older than the endpoint answers 404 or 405;
//     that is remembered for the rest of the page's life, as lib/pictureRequest.js does for
//     visualizeRun (#252), so only the first Run pays for finding out. A reduction the backend
//     cannot show this way (no construction steps, no backward map, or no frames picture on
//     one of its problems) answers 400 naming what is missing; that is remembered for that
//     reduction. Any other failure falls back for that one Run, so the older requests report
//     it the way Reduce always has (an unreadable instance, for one). In every case the caller
//     gets null and runs Reduce as it did before.
//   - Each pane's frame. A view frame carries both pictures' states (`source`, `target`) under
//     one envelope (`phase`, `event`, `caption`, `step`, `ok`, and a focus per side); a pane is
//     drawn by the renderer its picture type already has (components/pictures/registry.js),
//     so its frame is that side's states with the envelope put back.
//   - What the target has not built yet. A build frame shows the first `builtNodes` nodes and
//     `builtEdges` edges of `target.buildOrder`; the rest stay where the layout puts them, out
//     of sight, so nothing moves while the steps build the picture.
//   - Gadget links. Every gadget names source ids and target ids that are the pictures' own
//     piece ids, so pointing at a piece on one side finds the gadgets that name it and every
//     piece they name, on both sides.

import { hasPictureRenderer } from "../components/pictures/registry";
import { normalizeGadgets } from "./gadgets";
import { REDUX_API_BASE_URL, ReduxRequestError, requestReductionView } from "./redux";

/** The three phases, in order, with the words the phase bar and the caption use. */
export const REDUCTION_PHASES = [
  { key: "build", label: "Build", about: "The reduction builds the target, piece by piece." },
  { key: "solve", label: "Solve", about: "A solver for the target runs on what was built." },
  {
    key: "map",
    label: "Map back",
    about: "The target's answer is turned into an answer for your instance.",
  },
];
const PHASE_KEYS = new Set(REDUCTION_PHASES.map((phase) => phase.key));

/**
 * What a step's event reads as in each phase. A build step that adds nothing (a Reject) is a
 * pair or a node the rule leaves alone, not something thrown out; a map step that leaves a
 * piece out of the answer is a Reject too.
 */
const EVENT_WORDS = {
  build: { Try: "Trying", Accept: "Built", Reject: "Nothing added", Backtrack: "Backed up" },
  solve: {
    Try: "Trying",
    Accept: "Kept",
    Reject: "Thrown out",
    Backtrack: "Backed up",
    Done: "Done",
  },
  map: {
    Try: "Reading",
    Accept: "Mapped",
    Reject: "Left out",
    Backtrack: "Backed up",
    Done: "Done",
  },
};

/** The word a step's event reads as in its phase, or "" for an event Redux adds later. */
export function eventWord(phase, event) {
  return EVENT_WORDS[phase]?.[event] ?? "";
}

// Set once the backend has said it has no ProblemProvider/reductionView.
let viewRouteMissing = false;
// Reductions the backend said it cannot show as a Reduction View, by class name.
const unviewable = new Set();
// The 400 answers that mean "this reduction has no Reduction View", not "this input is bad".
const CANNOT_VIEW = new Set([
  "no_build_steps",
  "no_backward_map",
  "no_source_picture",
  "no_target_picture",
  "unknown_reduction",
]);

/** Whether a Run in Reduce mode asks for `reduction`'s Reduction View first. */
export function reductionViewWorth(reduction) {
  return Boolean(reduction) && !viewRouteMissing && !unviewable.has(reduction);
}

/**
 * Asks for a reduction's Reduction View.
 * @param {Object} options
 * @param {string} options.reduction The reduction class name.
 * @param {string} options.instance The source instance.
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<ReturnType<typeof normalizeReductionView>>} The view, or null when Reduce
 *   should run the older requests instead (see this file's header).
 * @throws an AbortError when cancelled, and a ReduxRequestError for a failure the older
 *   requests would meet too (rate limited, or no backend at all).
 */
export async function requestReductionViewOrNull({ reduction, instance, signal }) {
  if (!reductionViewWorth(reduction)) return null;
  let response;
  try {
    response = await requestReductionView(REDUX_API_BASE_URL, reduction, instance, signal);
  } catch (error) {
    if (!(error instanceof ReduxRequestError)) throw error;
    if (error.status === 404 || error.status === 405) {
      viewRouteMissing = true;
      return null;
    }
    if (error.status === 400 && CANNOT_VIEW.has(error.payload?.error)) {
      unviewable.add(reduction);
      return null;
    }
    // A bad instance (400) or a server-side failure (500, such as a solver answer the backward
    // map can't read): the older requests say what is wrong, as Reduce always has.
    if (error.status === 400 || error.status >= 500) return null;
    throw error;
  }
  return normalizeReductionView(response);
}

function idList(value) {
  return Array.isArray(value) ? value.filter((id) => typeof id === "string") : [];
}

function side(raw) {
  const type = raw?.picture?.type;
  if (!hasPictureRenderer(type)) return null;
  return {
    problem: typeof raw.problem === "string" ? raw.problem : "",
    instance: typeof raw.instance === "string" ? raw.instance : null,
    type,
    payload: raw.picture.payload ?? null,
  };
}

/**
 * The parts of a Reduction View answer this site draws, or null when it can't draw them (not
 * a Reduction View, no frames, or a side whose picture type has no renderer here).
 * @param {unknown} raw The answer as Redux sent it.
 * @returns {{reduction: string, reductionName: string, solverName: string,
 *   source: {problem: string, instance: string|null, type: string, payload: Object|null},
 *   target: {problem: string, instance: string|null, type: string, payload: Object|null,
 *     buildOrder: {nodes: string[], edges: string[]}},
 *   gadgets: ReturnType<typeof normalizeGadgets>, frames: Object[]}|null}
 */
export function normalizeReductionView(raw) {
  if (!raw || typeof raw !== "object" || raw.type !== "Reduction") return null;
  const source = side(raw.source);
  const target = side(raw.target);
  const frames = (Array.isArray(raw.frames) ? raw.frames : []).filter(
    (frame) =>
      frame &&
      PHASE_KEYS.has(frame.phase) &&
      frame.source &&
      typeof frame.source === "object" &&
      frame.target &&
      typeof frame.target === "object",
  );
  if (!source || !target || frames.length === 0) return null;
  return {
    reduction: typeof raw.reduction === "string" ? raw.reduction : "",
    reductionName: typeof raw.reductionName === "string" ? raw.reductionName : "",
    solverName: typeof raw.solver === "string" ? raw.solver : "",
    source,
    target: {
      ...target,
      buildOrder: {
        nodes: idList(raw.target.buildOrder?.nodes),
        edges: idList(raw.target.buildOrder?.edges),
      },
    },
    gadgets: normalizeGadgets(raw.gadgets),
    frames,
  };
}

/**
 * One pane's frame, for the renderer of that side's picture type: the side's states with the
 * view frame's envelope put back (its focus is the side's own). The target's build counts and
 * skipped pairs are the view's, not the picture's, so they are left out; a Graph target draws
 * the skipped pairs as its dashed "missing" lines (`phantoms`) in the Blocked state.
 * @param {Object} frame A view frame.
 * @param {"source"|"target"} which The side.
 * @param {string} type That side's picture type.
 */
export function paneFrame(frame, which, type) {
  const { builtNodes: _nodes, builtEdges: _edges, skipped, ...states } = frame[which] ?? {};
  const pane = {
    ...states,
    event: frame.event,
    caption: frame.caption,
    step: frame.step ?? null,
    focus: idList(which === "source" ? frame.sourceFocus : frame.targetFocus),
  };
  if (typeof frame.ok === "boolean") pane.ok = frame.ok;
  if (type === "Graph" && Array.isArray(skipped) && skipped.length > 0) {
    pane.phantoms = skipped
      .filter((pair) => typeof pair?.a === "string" && typeof pair?.b === "string")
      .map((pair) => ({ a: pair.a, b: pair.b, state: "Blocked" }));
  }
  return pane;
}

/** Whether any build frame says a rule left a pair of the target unjoined. */
export function hasSkippedPairs(view) {
  return view.frames.some(
    (frame) => Array.isArray(frame.target?.skipped) && frame.target.skipped.length > 0,
  );
}

/**
 * The target pieces a frame has not built yet: during Build, every node and edge of
 * `buildOrder` past the frame's counts. Empty in the other phases (the target is complete).
 * @returns {Set<string>}
 */
export function unbuiltIds(view, frame) {
  const hidden = new Set();
  if (frame?.phase !== "build") return hidden;
  const { nodes, edges } = view.target.buildOrder;
  const builtNodes = Number.isInteger(frame.target?.builtNodes)
    ? frame.target.builtNodes
    : nodes.length;
  const builtEdges = Number.isInteger(frame.target?.builtEdges)
    ? frame.target.builtEdges
    : edges.length;
  for (const id of nodes.slice(builtNodes)) hidden.add(id);
  for (const id of edges.slice(builtEdges)) hidden.add(id);
  return hidden;
}

/** The first frame of each phase, by phase key (a phase with no frames is left out). */
export function phaseStarts(frames) {
  const starts = {};
  frames.forEach((frame, index) => {
    if (!(frame.phase in starts)) starts[frame.phase] = index;
  });
  return starts;
}

/** Where a frame sits in its phase: `{index, count}`, both counted in that phase's frames. */
export function placeInPhase(frames, frameIndex) {
  const phase = frames[frameIndex]?.phase;
  let index = 0;
  let count = 0;
  frames.forEach((frame, position) => {
    if (frame.phase !== phase) return;
    if (position < frameIndex) index += 1;
    count += 1;
  });
  return { index, count };
}

/**
 * The pieces linked to one piece through the gadget list: every gadget that names it on its
 * side, and every id those gadgets name, on both sides. A piece no gadget names links to
 * itself alone.
 * @param {ReturnType<typeof normalizeGadgets>} gadgets
 * @param {"source"|"target"} which The side the piece is on.
 * @param {string} id The piece's id.
 * @returns {{source: Set<string>, target: Set<string>, gadgets: number[]}} `gadgets` are the
 *   gadgets' indexes in `gadgets`.
 */
export function linkedPieces(gadgets, which, id) {
  const source = new Set();
  const target = new Set();
  const found = [];
  (which === "source" ? source : target).add(id);
  for (const gadget of gadgets) {
    const own = which === "source" ? gadget.sourceIds : gadget.targetIds;
    if (!own.includes(id)) continue;
    found.push(gadget.index);
    for (const sourceId of gadget.sourceIds) source.add(sourceId);
    for (const targetId of gadget.targetIds) target.add(targetId);
  }
  return { source, target, gadgets: found };
}

/**
 * Readable names for a picture's pieces, from its payload: every object with an `id` and a
 * `label`, a node that sits in a labelled group ("x1 in C1": a formula's literal), and an edge
 * named by its two ends. An id the payload does not label is its own name.
 * @param {Object|null} payload A picture's payload.
 * @returns {(id: string) => string}
 */
export function pieceNamer(payload) {
  const labels = new Map();
  const groupOf = new Map();
  const ends = new Map();
  const stack = [payload];
  let budget = 20000;
  while (stack.length > 0 && budget > 0) {
    budget -= 1;
    const value = stack.pop();
    if (Array.isArray(value)) {
      for (const item of value) if (item && typeof item === "object") stack.push(item);
    } else if (value && typeof value === "object") {
      if (typeof value.id === "string") {
        const label = value.label ?? value.name;
        if (typeof label === "string" || typeof label === "number") {
          if (!labels.has(value.id)) labels.set(value.id, String(label));
        }
        if (typeof value.group === "string") groupOf.set(value.id, value.group);
        if (typeof value.a === "string" && typeof value.b === "string") {
          ends.set(value.id, [value.a, value.b]);
        }
      }
      for (const child of Object.values(value)) {
        if (child && typeof child === "object") stack.push(child);
      }
    }
  }
  const nameOf = (id) => {
    const label = labels.get(id) ?? id;
    const group = groupOf.get(id);
    return group && labels.has(group) ? `${label} in ${labels.get(group)}` : label;
  };
  return (id) => {
    if (!labels.has(id) && ends.has(id)) {
      const [a, b] = ends.get(id);
      return `${labels.get(a) ?? a} to ${labels.get(b) ?? b}`;
    }
    return nameOf(id);
  };
}

/**
 * The data attributes the picture renderers mark their pieces with, each holding the piece's
 * id as the payload gives it. The Reduction View finds what is pointed at, hides what is not
 * built yet, and marks linked pieces through these alone, so no renderer has to know about it.
 */
export const PIECE_ID_ATTRIBUTES = [
  "data-node-id",
  "data-edge-id",
  "data-clause-id",
  "data-variable-id",
  "data-item-id",
  "data-piece-for",
  "data-container-id",
  "data-element-id",
  "data-triple-id",
  "data-square-id",
  "data-piece-id",
  "data-point-id",
  "data-job-id",
  "data-pump-id",
  "data-cell-id",
  "data-row-id",
  "data-column-id",
  "data-qubit-id",
  "data-gate-id",
];
export const PIECE_SELECTOR = PIECE_ID_ATTRIBUTES.map((name) => `[${name}]`).join(",");

/** The piece id an element is marked with, or null. */
export function pieceIdOf(element) {
  for (const name of PIECE_ID_ATTRIBUTES) {
    const value = element.getAttribute(name);
    if (value) return value;
  }
  return null;
}
