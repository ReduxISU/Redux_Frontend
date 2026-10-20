// components/pictures/formulaLayout.js
//
// #270: where the Formula picture puts its pieces. A pure function of the payload and the width
// it is drawn at: no randomness, no DOM, no React, so the same formula always lands in the same
// place, before Run and at every step. Ported from Redux's design mockup
// (Documentation/Visualizations/mockups/formula.js, `layout`), not from its parser or solvers.
//
// The formula as it is written: one box per clause, its literals as pills joined by ∨, the
// boxes joined by ∧. Clauses pack left to right; a clause that doesn't fit the line starts the
// next one, with the ∧ leading it, and a single clause wider than the line wraps at its ∨s
// inside a taller box (the next row of pills starts with its ∨). The clause name sits above its
// box. Under the formula, a strip with a chip per variable wraps the same way.
//
// A name of letters then digits (x10, Bar7) is drawn as its letters with the digits as a real
// subscript at SUB_SCALE of the label size; any other name (a, foo_2) is drawn plain. The labels
// are monospace, so a label's width is its characters times CHAR_WIDTH (at the 15 px literal
// size), with a subscript's digits counted at SUB_SCALE.

/** A monospace character's width at the literal size, in drawing units. */
export const CHAR_WIDTH = 9;
/** A literal's label size, and a variable chip's. */
export const LITERAL_SIZE = 15;
export const VARIABLE_SIZE = 14;
/** A subscript's size, as a share of its label's (Redux's spec: a real subscript, at least 75%). */
export const SUB_SCALE = 0.78;
/** How far a subscript sits below its label's middle, as a share of the label size. */
export const SUB_SHIFT = 0.32;

const PILL_HEIGHT = 30;
const PAD = 9;
const BOX_HEIGHT = PILL_HEIGHT + 2 * PAD;
const OR_WIDTH = 24;
const AND_WIDTH = 34;
// Room for a clause name above its box, clear of a gadget ring round the box (#270).
const LABEL_HEIGHT = 22;
const ROW_GAP = 16;
const CHIP_WIDTH = 66;
const CHIP_HEIGHT = 30;
const MARGIN = 12;
const TOP = 34;

/** The widest the formula is laid out, and the narrowest (a phone's box). */
export const MAX_WIDTH = 800;
export const MIN_WIDTH = 320;

/**
 * A name split into the letters drawn plain and the digits drawn as a subscript: `x10` is
 * {base: "x", sub: "10"}; a name that is not letters then digits (`a`, `foo_2`) has no subscript.
 */
export function splitName(name) {
  const match = /^([A-Za-z]+)(\d+)$/.exec(String(name));
  return match ? { base: match[1], sub: match[2] } : { base: String(name), sub: "" };
}

/** A label's drawn width at `size`: ¬ if negated, the base letters, then the subscript's digits. */
export function labelWidth(negated, name, size = LITERAL_SIZE) {
  const parts = splitName(name);
  return (
    (((negated ? 1 : 0) + parts.base.length + parts.sub.length * SUB_SCALE) * CHAR_WIDTH * size) /
    LITERAL_SIZE
  );
}

/** How far the False strike reaches from a literal label's left edge: its ¬ and letters only. */
export function strikeWidth(negated, name) {
  return ((negated ? 1 : 0) + splitName(name).base.length) * CHAR_WIDTH * 0.9;
}

function pillWidth(negated, name) {
  return Math.max(34, labelWidth(negated, name) + 18);
}

/** A literal's variable name, from its label ("¬x2" -> "x2"). */
function literalName(node) {
  const label = String(node.label ?? "");
  return node.positive === false ? label.replace(/^[¬!~]\s*/, "") : label;
}

/**
 * The Formula's layout.
 *
 * @param {Object} payload The Formula payload (`groups`, `nodes`, `variables`).
 * @param {number} [width] The width to lay out at (the picture's box), clamped to
 *   MIN_WIDTH..MAX_WIDTH.
 * @returns {{minX: number, minY: number, width: number, height: number, headY: number,
 *   stripY: number,
 *   clauses: Array<{id: string, label: string, x: number, y: number, w: number, h: number,
 *     members: string[]}>,
 *   literals: Map<string, {id: string, label: string, variable: string, group: string,
 *     negated: boolean, name: string, x: number, y: number, w: number, h: number}>,
 *   ands: Array<{x: number, y: number, after: string}>,
 *   ors: Array<{x: number, y: number, clause: string}>,
 *   variables: Array<{id: string, label: string, x: number, y: number, w: number, h: number}>}}
 */
export function layoutFormula(payload, width = MAX_WIDTH) {
  const drawingWidth = Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width || MAX_WIDTH)));
  const left = MARGIN;
  const right = drawingWidth - MARGIN;
  const nodes = (Array.isArray(payload?.nodes) ? payload.nodes : []).filter(
    (node) => typeof node?.id === "string",
  );
  const literals = new Map(
    nodes.map((node) => {
      const negated = node.positive === false;
      const name = literalName(node);
      return [
        node.id,
        {
          id: node.id,
          label: String(node.label ?? node.id),
          variable: typeof node.variable === "string" ? node.variable : null,
          group: typeof node.group === "string" ? node.group : null,
          negated,
          name,
          pillWidth: pillWidth(negated, name),
          x: 0,
          y: 0,
          w: 0,
          h: 0,
        },
      ];
    }),
  );
  const groups = (Array.isArray(payload?.groups) ? payload.groups : []).filter(
    (group) => typeof group?.id === "string",
  );

  const clauses = [];
  const ands = [];
  const ors = [];
  let x = left;
  let y = TOP;
  let rowHeight = 0;
  let rowStart = true;
  groups.forEach((group, index) => {
    const members = (Array.isArray(group.members) ? group.members : [])
      .map((id) => literals.get(id))
      .filter(Boolean);
    // Pack the clause's literals into rows no wider than the line: a long clause wraps at its ∨s.
    const maxInner = right - left - 2 * PAD - AND_WIDTH;
    const rows = [[]];
    let used = 0;
    for (const member of members) {
      const need = (rows.at(-1).length ? OR_WIDTH : 0) + member.pillWidth;
      if (rows.at(-1).length && used + need > maxInner) {
        rows.push([]);
        used = 0;
      }
      used += (rows.at(-1).length ? OR_WIDTH : 0) + member.pillWidth;
      rows.at(-1).push(member);
    }
    const rowWidths = rows.map((row, k) =>
      row.reduce((sum, member, q) => sum + member.pillWidth + (q || k ? OR_WIDTH : 0), 0),
    );
    const boxWidth = 2 * PAD + Math.max(0, ...rowWidths);
    const boxHeight = BOX_HEIGHT + (rows.length - 1) * (PILL_HEIGHT + 8);
    const need = (index ? AND_WIDTH : 0) + boxWidth;
    if (!rowStart && x + need > right) {
      y += rowHeight + ROW_GAP;
      x = left;
      rowHeight = 0;
      rowStart = true;
    }
    if (index) {
      ands.push({ x: x + AND_WIDTH / 2, y: y + LABEL_HEIGHT + BOX_HEIGHT / 2, after: group.id });
      x += AND_WIDTH;
    }
    const box = {
      id: group.id,
      label: String(group.label ?? group.id),
      x,
      y: y + LABEL_HEIGHT,
      w: boxWidth,
      h: boxHeight,
      members: members.map((member) => member.id),
    };
    rows.forEach((row, k) => {
      let px = x + PAD + (k ? OR_WIDTH : 0);
      const py = box.y + PAD + k * (PILL_HEIGHT + 8);
      if (k) ors.push({ x: x + PAD + OR_WIDTH / 2, y: py + PILL_HEIGHT / 2, clause: group.id });
      row.forEach((member, q) => {
        if (q) {
          ors.push({ x: px + OR_WIDTH / 2, y: py + PILL_HEIGHT / 2, clause: group.id });
          px += OR_WIDTH;
        }
        Object.assign(member, { x: px, y: py, w: member.pillWidth, h: PILL_HEIGHT });
        px += member.pillWidth;
      });
    });
    clauses.push(box);
    x += boxWidth;
    rowHeight = Math.max(rowHeight, LABEL_HEIGHT + boxHeight);
    rowStart = false;
  });

  // The assignment strip, under the formula, wrapping the same way.
  let vy = y + rowHeight + 40;
  let vx = left;
  const variables = (Array.isArray(payload?.variables) ? payload.variables : [])
    .filter((variable) => typeof variable?.id === "string")
    .map((variable) => {
      const label = String(variable.label ?? variable.id);
      const w = Math.max(
        CHIP_WIDTH,
        labelWidth(false, label, VARIABLE_SIZE) +
          (2 * CHAR_WIDTH * VARIABLE_SIZE) / LITERAL_SIZE +
          18,
      );
      if (vx + w > right) {
        vx = left;
        vy += CHIP_HEIGHT + 10;
      }
      const chip = { id: variable.id, label, x: vx, y: vy, w, h: CHIP_HEIGHT };
      vx += w + 8;
      return chip;
    });

  // A literal no clause lists stays out of the drawing (it has no place).
  for (const [id, literal] of literals) if (literal.w === 0) literals.delete(id);

  return {
    minX: 0,
    minY: 0,
    width: drawingWidth,
    height: vy + CHIP_HEIGHT + 14,
    headY: TOP - 12,
    stripY: y + rowHeight + 22,
    clauses,
    literals,
    ands,
    ors,
    variables,
  };
}

/**
 * What pointing at `id` traces (Redux's spec, "Hover"): a variable chip or a literal traces the
 * variable everywhere it appears (its chip and every literal of it); a clause traces its literals
 * and their variables. Returns null for an id the formula doesn't have.
 * @param {Object} payload The Formula payload.
 * @param {string|null} id
 * @returns {Set<string>|null}
 */
export function formulaTrace(payload, id) {
  if (typeof id !== "string") return null;
  const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  const groups = Array.isArray(payload?.groups) ? payload.groups : [];
  const variables = Array.isArray(payload?.variables) ? payload.variables : [];
  const node = nodes.find((candidate) => candidate?.id === id);
  const group = groups.find((candidate) => candidate?.id === id);
  const isVariable = variables.some((candidate) => candidate?.id === id);
  if (!node && !group && !isVariable) return null;
  const hot = new Set([id]);
  const addVariable = (variable) => {
    if (typeof variable !== "string") return;
    hot.add(variable);
    for (const other of nodes) if (other?.variable === variable) hot.add(other.id);
  };
  if (isVariable) addVariable(id);
  if (node) addVariable(node.variable);
  if (group) {
    for (const member of Array.isArray(group.members) ? group.members : []) {
      hot.add(member);
      const literal = nodes.find((candidate) => candidate?.id === member);
      if (literal?.variable) hot.add(literal.variable);
    }
  }
  return hot;
}
