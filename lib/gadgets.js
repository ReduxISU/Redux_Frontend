// lib/gadgets.js
//
// #229 stage 4: reading a reduction's gadgets and matching them to the pictures on screen.
//
// Where they come from: ProblemProvider/reduce answers with the whole reduction object, and a
// Redux backend that has the gadget work (ReduxISU/Redux, GadgetKind) includes `gadgets` on
// it: `{ gadgetKind, sourceIds, targetIds, note?, reductionFromIds, reductionToIds, ... }`.
// The workbench already asks for that object for the target instance's text, so gadgets cost
// no extra request. A backend without `gadgetKind` (upstream CSharpAPI as of 2026-10-13 sends
// only the legacy color and id lists, and only for some reductions) gives an empty list here,
// and the Gadgets section stays hidden.
//
// Which ids to highlight: `sourceIds` / `targetIds` are the stable ids Redux's newer picture
// payloads use (3SAT clause "c0", literal "c0-1", sets "S1", elements "e:1", items "I1"). The
// workbench draws the older frames from ProblemProvider/visualize and visualizeReduction. Older
// backends gave those frames different ids (3SAT "0" and "0-1"), matching only the legacy
// `reductionFromIds` / `reductionToIds`; newer ones use the stable ids there too. Some gadgets
// still name pieces the older frames don't draw (3SAT variables "v:x", whose legacy ids are
// their occurrences). So for each picture the stable ids are used when the picture has any of
// them, and the legacy ids otherwise. Graph node names and edge ids ("a-b") are the same in both.

import { GADGET_KINDS, OTHER_GADGET_KIND } from "../data/gadgetKinds";

const KNOWN_KINDS = new Set(GADGET_KINDS.map((entry) => entry.kind));

function stringList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

/**
 * @param {unknown} raw The reduction's `gadgets` field as the backend sent it.
 * @returns {{index: number, kind: string, sourceIds: string[], targetIds: string[],
 *   legacySourceIds: string[], legacyTargetIds: string[], note: string}[]} Only gadgets with a
 *   `gadgetKind` and id lists; anything else (an older backend's legacy-only entries) is left
 *   out. `index` is the gadget's position in that filtered list, for ids and keys.
 */
export function normalizeGadgets(raw) {
  if (!Array.isArray(raw)) return [];
  const gadgets = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    if (typeof entry.gadgetKind !== "string" || !entry.gadgetKind) continue;
    if (!Array.isArray(entry.sourceIds) || !Array.isArray(entry.targetIds)) continue;
    gadgets.push({
      index: gadgets.length,
      kind: entry.gadgetKind,
      sourceIds: stringList(entry.sourceIds),
      targetIds: stringList(entry.targetIds),
      legacySourceIds: stringList(entry.reductionFromIds),
      legacyTargetIds: stringList(entry.reductionToIds),
      note: typeof entry.note === "string" ? entry.note : "",
    });
  }
  return gadgets;
}

/**
 * Groups gadgets by kind, in data/gadgetKinds.js's order, leaving out empty groups. Kinds the
 * data file does not list go into one "Other" group at the end.
 */
export function groupGadgets(gadgets) {
  const groups = [...GADGET_KINDS, OTHER_GADGET_KIND].map((entry) => ({ ...entry, rows: [] }));
  const byKind = new Map(groups.map((group) => [group.kind, group]));
  for (const gadget of gadgets) {
    const group = KNOWN_KINDS.has(gadget.kind)
      ? byKind.get(gadget.kind)
      : byKind.get(OTHER_GADGET_KIND.kind);
    group.rows.push(gadget);
  }
  return groups.filter((group) => group.rows.length > 0);
}

/**
 * Every id a frame names: graph nodes (id and name) and links (id, and both "a-b" orders),
 * 3SAT clauses and literals, and any other `id` field the payload carries.
 */
export function frameIds(frame) {
  const ids = new Set();
  if (!frame || typeof frame !== "object") return ids;
  if (Array.isArray(frame.nodes)) {
    for (const node of frame.nodes) {
      if (typeof node?.id === "string") ids.add(node.id);
      if (typeof node?.name === "string") ids.add(node.name);
    }
  }
  if (Array.isArray(frame.links)) {
    for (const link of frame.links) {
      if (typeof link?.id === "string") ids.add(link.id);
      const source = typeof link?.source === "string" ? link.source : link?.source?.id;
      const target = typeof link?.target === "string" ? link.target : link?.target?.id;
      if (source && target) {
        ids.add(`${source}-${target}`);
        ids.add(`${target}-${source}`);
      }
    }
  }
  // Everything else (3SAT clauses and literals, set trees): walk the payload for `id`s.
  const stack = [frame];
  let budget = 5000;
  while (stack.length > 0 && budget > 0) {
    budget -= 1;
    const value = stack.pop();
    if (Array.isArray(value)) {
      for (const item of value) if (item && typeof item === "object") stack.push(item);
    } else if (value && typeof value === "object") {
      if (typeof value.id === "string") ids.add(value.id);
      for (const child of Object.values(value)) {
        if (child && typeof child === "object") stack.push(child);
      }
    }
  }
  return ids;
}

/**
 * The ids of one side of a gadget that are drawn on `frame`: the stable ids when the picture
 * has any of them, else the legacy ids (see this file's header). Empty when neither matches,
 * which is what a picture this frontend cannot highlight gets.
 */
export function highlightIdsOn(frame, stableIds, legacyIds) {
  if (!frame) return [];
  const ids = frameIds(frame);
  const stable = stableIds.filter((id) => ids.has(id));
  if (stable.length > 0) return stable;
  return legacyIds.filter((id) => ids.has(id));
}

const SAT_CLAUSE = /^c(\d+)$/;
const SAT_LITERAL = /^c(\d+)-(\d+)$/;
const SAT_VARIABLE = /^v:(.+)$/;

/**
 * A readable name for a stable id. Redux documents one naming convention for formulas
 * (Interfaces/JSON_Objects/Gadget.cs): clause i is "c{i}", its j-th literal "c{i}-{j}",
 * variable v is "v:{name}". Those read as "C1", "C1 literal 2 (!x2)" and "x1", counting from 1
 * the way the picture labels clauses. Every other id (graph node names, edge ids) is already
 * what the picture shows and is returned as it is.
 *
 * @param {string} id A stable id.
 * @param {Object|null} sourceFrame The source picture, to name a literal's text when it is a
 *   3SAT frame.
 */
export function describeGadgetId(id, sourceFrame) {
  const clause = SAT_CLAUSE.exec(id);
  if (clause) return `C${Number(clause[1]) + 1}`;
  const literal = SAT_LITERAL.exec(id);
  if (literal) {
    const clauseIndex = Number(literal[1]);
    const literalIndex = Number(literal[2]);
    const text = sourceFrame?.clauses?.[clauseIndex]?.literals?.[literalIndex]?.literal;
    const base = `C${clauseIndex + 1} literal ${literalIndex + 1}`;
    return typeof text === "string" && text ? `${base} (${text})` : base;
  }
  const variable = SAT_VARIABLE.exec(id);
  if (variable) return variable[1];
  return id;
}

// --- #239: Color mode, and gadgets in plain words ----------------------------------------------

/**
 * The kinds Color mode colors, most specific first: a piece several gadgets name takes the
 * color of the first of these kinds that names it. A bound (built from the whole instance) and
 * an edge rule (which names pairs all over the target) stay plain; pointing at them still marks
 * them in the gadget gold.
 */
const COLORED_KINDS = ["element", "orGadget", "group", "palette"];

/**
 * Color mode's colors: each gadget of a COLORED_KINDS kind gets the next of `palette`'s colors
 * (cycling), and its pieces on both sides take it, so a source piece and what it became match by
 * eye. An element gadget whose piece already has a color (a source literal two element gadgets
 * name) keeps that color for its other pieces, so one piece is never split across two colors.
 * A group, or-gadget or palette whose target pieces all have a color already (3SAT to Clique's
 * clause, whose nodes each came from one literal) gets none, so its source piece stays plain
 * rather than wearing a color that matches nothing on the other side. An element gadget built
 * from a group's source piece alone (a new variable made for a clause) takes the group's color.
 * @param {ReturnType<typeof normalizeGadgets>} gadgets
 * @param {string[]} palette The colors to cycle (components/pictures/gadgetRings.js
 *   GADGET_PALETTE).
 * @returns {{source: Object<string, string>, target: Object<string, string>,
 *   byGadget: Map<number, string>}} Each side's color by piece id, and each colored gadget's
 *   color by its index.
 */
export function gadgetColorMap(gadgets, palette) {
  const source = {};
  const target = {};
  const byGadget = new Map();
  if (!Array.isArray(gadgets) || palette.length === 0) return { source, target, byGadget };
  let next = 0;
  const fresh = () => {
    const color = palette[next % palette.length];
    next += 1;
    return color;
  };
  const paint = (gadget, color) => {
    byGadget.set(gadget.index, color);
    for (const id of gadget.sourceIds) if (!Object.hasOwn(source, id)) source[id] = color;
    for (const id of gadget.targetIds) if (!Object.hasOwn(target, id)) target[id] = color;
  };
  // The color a gadget's pieces already have: a source piece's first, then a target piece's.
  const existing = (gadget) => {
    const id = gadget.sourceIds.find((piece) => Object.hasOwn(source, piece));
    if (id !== undefined) return source[id];
    const other = gadget.targetIds.find((piece) => Object.hasOwn(target, piece));
    return other !== undefined ? target[other] : null;
  };
  const named = (gadget) => gadget.sourceIds.length > 0 || gadget.targetIds.length > 0;
  // Source pieces a group-like gadget is built from (a clause). An element gadget made from one
  // of those alone (SAT to 3SAT's new variable x5, made for clause C1) waits for that gadget's
  // color and wears it, so x5 matches C1 rather than C1 matching x5.
  const groupSources = new Set(
    gadgets
      .filter((gadget) => gadget.kind !== "element" && COLORED_KINDS.includes(gadget.kind))
      .flatMap((gadget) => gadget.sourceIds),
  );
  const waits = (gadget) =>
    gadget.sourceIds.length > 0 && gadget.sourceIds.every((id) => groupSources.has(id));
  const elements = gadgets.filter((gadget) => gadget.kind === "element" && named(gadget));
  for (const gadget of elements) {
    if (!waits(gadget)) paint(gadget, existing(gadget) ?? fresh());
  }
  for (const kind of COLORED_KINDS.slice(1)) {
    for (const gadget of gadgets) {
      if (gadget.kind !== kind || !named(gadget)) continue;
      if (
        gadget.targetIds.length > 0 &&
        gadget.targetIds.every((piece) => Object.hasOwn(target, piece))
      ) {
        continue;
      }
      paint(gadget, fresh());
    }
  }
  for (const gadget of elements) {
    if (waits(gadget)) paint(gadget, existing(gadget) ?? fresh());
  }
  return { source, target, byGadget };
}

/**
 * A readable name for one gadget id: the picture's own label when `nameOf` knows it (a Reduction
 * View's pieceNamer: "x1 in C1"), else describeGadgetId's ("C1 literal 1 (!x3)", "x1").
 * @param {string} id
 * @param {((id: string) => string)|null} nameOf
 * @param {Object|null} frame The older picture's frame, for describeGadgetId.
 */
export function gadgetIdName(id, nameOf, frame) {
  const named = nameOf ? nameOf(id) : id;
  return named !== id ? named : describeGadgetId(id, frame);
}

function nameList(names, limit = 6) {
  if (names.length <= limit) return names.join(", ");
  return `${names.slice(0, limit).join(", ")} and ${names.length - limit} more`;
}

/**
 * One gadget in plain words, from its kind, its note and its pieces' names (#239): what the
 * Result panel's Gadgets row says, instead of raw ids.
 * @param {ReturnType<typeof normalizeGadgets>[number]} gadget
 * @param {{source: (id: string) => string, target: (id: string) => string}} name Each side's
 *   names (gadgetIdName).
 * @param {{source: string, target: string}} empty What a side with no ids reads as.
 * @returns {{source: string, target: string, sentence: string, usesNote: boolean}} Each side's
 *   names, and one sentence saying what the gadget does (its note, when it has one and the kind
 *   needs it; usesNote says so, so the note is not shown twice).
 */
export function describeGadget(gadget, name, empty) {
  const sourceNames = gadget.sourceIds.map((id) => name.source(id));
  const targetNames = gadget.targetIds.map((id) => name.target(id));
  const source = sourceNames.length > 0 ? nameList(sourceNames) : empty.source;
  const target = targetNames.length > 0 ? nameList(targetNames) : empty.target;
  const note = gadget.note.trim();
  let sentence;
  let usesNote = false;
  switch (gadget.kind) {
    case "element":
      sentence = `${source} becomes ${target}.`;
      break;
    case "group":
      sentence = `${source} is built as ${target}.`;
      break;
    case "edgeRule":
      if (note) {
        sentence = note;
        usesNote = true;
      } else {
        sentence = `${source} decide${sourceNames.length === 1 ? "s" : ""} whether ${target} are joined.`;
      }
      break;
    case "bound":
      if (note) {
        sentence = note;
        usesNote = true;
      } else {
        sentence = `The target's number is set from ${source}.`;
      }
      break;
    case "palette":
      sentence = `${target} ${targetNames.length === 1 ? "is a helper" : "are helpers"} every target gets.`;
      break;
    case "orGadget":
      sentence = `${target} works only when ${source} has a true literal.`;
      break;
    default:
      sentence = `${source} goes with ${target}.`;
  }
  if (!usesNote && note && sentence === note) usesNote = true;
  return { source, target, sentence, usesNote };
}
