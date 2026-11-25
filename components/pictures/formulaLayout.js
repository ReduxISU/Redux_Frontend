// components/pictures/formulaLayout.js
//
// #270: where the Formula picture puts its pieces. A pure function of the payload and the width
// it is drawn at: no randomness, no DOM, no React, so the same formula always lands in the same
// place, before Run and at every step. Ported from Redux's design mockup
// (Documentation/Visualizations/mockups/formula.js, `layout`), not from its parser or solvers.
//
// The formula as it is written: one box per group, its literals as pills joined by the inner
// operator, the boxes joined by the outer one. The payload's `layout` names the form (#278): "cnf"
// (clauses: ∨ inside, ∧ between), "dnf" (terms: ∧ inside, ∨ between); any other value draws the
// same boxes with CNF's symbols but claims no form (formulaForm). Groups pack left to right; a
// group that doesn't fit the line starts the next one, with the outer operator leading it, and a
// single group wider than the line wraps at its inner operators inside a taller box (the next row
// of pills starts with one). The group's name sits above its box. Under the formula, a strip with
// a chip per variable wraps the same way.
//
// A name of letters then digits (x10, Bar7) is drawn as its letters with the digits as a real
// subscript at SUB_SCALE of the label size; any other name (a, foo_2) is drawn plain. The labels
// are monospace, so a label's width is its characters times CHAR_WIDTH (at the 15 px literal
// size), with a subscript's digits counted at SUB_SCALE.
//
// #340 (ReduxISU/Redux#1057): a weighted formula (Weighted Max-SAT) gives each group a `weight`.
// Its name then reads "C1 · w 3", and its box is at least as wide as that name (with room for the
// ✓ / ✗ beside it), so a narrow clause's name never runs into the next one's. The strip's head
// gains the run's satisfied weight ("SATISFIED WEIGHT 3 OF 5"), beside ASSIGNMENT when it fits and
// on its own line under it when not. A formula with no weights is laid out exactly as before.

/** A monospace character's width at the literal size, in drawing units. */
export const CHAR_WIDTH = 9;
/** A literal's label size, and a variable chip's. */
export const LITERAL_SIZE = 15;
export const VARIABLE_SIZE = 14;
/** A subscript's size, as a share of its label's (Redux's spec: a real subscript, at least 75%). */
export const SUB_SCALE = 0.78;
/** How far a subscript sits below its label's middle, as a share of the label size. */
export const SUB_SHIFT = 0.32;

export const PILL_HEIGHT = 30;
export const PAD = 9;
export const BOX_HEIGHT = PILL_HEIGHT + 2 * PAD;
// The room an operator takes: an inner one (inside a box, drawn at 14 px) and an outer one
// (between boxes, drawn at 17 px and bold). The room belongs to the place, not the symbol: ∧ and ∨
// are drawn the same width at a size, so a DNF formula (∧ inside, ∨ between) reserves exactly the
// room a CNF one does, and its pills and boxes land in the same places (#278).
export const INNER_WIDTH = 24;
export const OUTER_WIDTH = 34;
// Room for a clause name above its box, clear of a gadget ring round the box (#270).
export const LABEL_HEIGHT = 22;
export const ROW_GAP = 16;
export const CHIP_WIDTH = 66;
export const CHIP_HEIGHT = 30;
export const MARGIN = 12;
// A group's name above its box: 11 px monospace, CHAR_WIDTH scaled to it, and the room its ✓ / ✗
// takes after it (a 5 px gap and one 12 px character), kept for every weighted name so the layout
// never moves between frames.
export const NAME_SIZE = 11;
export const NAME_CHAR = (CHAR_WIDTH * NAME_SIZE) / LITERAL_SIZE;
export const MARK_ROOM = 5 + (CHAR_WIDTH * 12) / LITERAL_SIZE;
// The strip head's characters: 11 px monospace with 0.08em letter spacing.
export const HEAD_CHAR = NAME_CHAR + 0.08 * NAME_SIZE;
// The line the satisfied weight takes when it doesn't fit beside ASSIGNMENT.
export const TOTAL_LINE = 18;
// The room above the first row: kept from when a heading sat there (#278 took it out of the
// drawing), so a formula draws exactly where it did.
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

export function pillWidth(negated, name) {
  return Math.max(34, labelWidth(negated, name) + 18);
}

/**
 * The form the payload's `layout` names, and the operator it puts inside a box and between boxes:
 * "cnf" is ∨ inside and ∧ between, "dnf" the reverse. Any other or missing value has no form
 * (`form: null`) and is drawn with CNF's operators, without the picture claiming CNF (#278).
 * @returns {{form: "cnf"|"dnf"|null, inner: "and"|"or", outer: "and"|"or"}}
 */
export function formulaForm(payload) {
  const named = typeof payload?.layout === "string" ? payload.layout.toLowerCase() : null;
  if (named === "dnf") return { form: "dnf", inner: "and", outer: "or" };
  return { form: named === "cnf" ? "cnf" : null, inner: "or", outer: "and" };
}

/** A literal's variable name, from its label ("¬x2" -> "x2"). */
export function literalName(node) {
  const label = String(node.label ?? "");
  return node.positive === false ? label.replace(/^[¬!~]\s*/, "") : label;
}

/** A number as drawn: a real minus sign (#278). */
export function formatNumber(value) {
  return typeof value === "number" && value < 0 ? `−${-value}` : String(value);
}

// Redux writes clause weights and the satisfied total as whole numbers in strings ("3", "-2") so
// no weight above 2^53 is rounded (ReduxISU/Redux#1034). They stay text here; only the formula's
// total is added up, with BigInt, so it is exact too.
const WHOLE_NUMBER = /^-?\d+$/;

/** A whole number Redux sent as a string ("3", "-2"), or null for anything else. */
export function wholeNumberOf(value) {
  return typeof value === "string" && WHOLE_NUMBER.test(value) ? value : null;
}

/** A whole number string for people to read: a real minus sign for a negative one. */
function shownWhole(value) {
  return value.startsWith("-") ? `−${value.slice(1)}` : value;
}

/** A group's weight (ReduxISU/Redux#1057): its whole number string, or null when it has none. */
export function weightOf(group) {
  return wholeNumberOf(group?.weight);
}

/** The sum of whole number strings, exactly, as a string ("4"). */
export function sumWeights(weights) {
  return weights.reduce((sum, weight) => sum + BigInt(weight), 0n).toString();
}

/** The weight as written after a group's name: " · w 3", or "" when it has none. */
export function weightText(weight) {
  const value = wholeNumberOf(weight);
  return value === null ? "" : ` · w ${shownWhole(value)}`;
}

/** The drawn width of a group's name ("C1 · w 3") with the room for its ✓ / ✗, from its box's left edge. */
export function nameWidth(name) {
  return 2 + String(name).length * NAME_CHAR + MARK_ROOM;
}

/** The satisfied-weight text of the strip's head: "SATISFIED WEIGHT 3 OF 5" ("–" when unknown). */
export function satisfiedText(satisfied, total) {
  const shown = wholeNumberOf(satisfied);
  const of = wholeNumberOf(total);
  return `SATISFIED WEIGHT ${shown === null ? "–" : shownWhole(shown)} OF ${of === null ? "–" : shownWhole(of)}`;
}

/** A variable's type (ReduxISU/Redux#929): "int" when the payload says so, else "bool". */
export function variableType(variable) {
  return variable?.type === "int" ? "int" : "bool";
}

/** The characters a chip's value takes: T / F, or "= " and the widest number of its range. */
function valueChars(type, range) {
  if (type !== "int") return 1;
  const ends = Array.isArray(range) && range.length ? range : [0, 999];
  return 2 + Math.max(...ends.map((value) => formatNumber(value).length));
}

/**
 * The variable strip's chips, from `top`, wrapping at `right`: a chip is wide enough for its
 * label and its value, T / F for a true / false variable, "= n" for a number (#278). A true / false
 * chip is exactly as wide as it was before typed values.
 */
export function stripChips(payload, left, right, top) {
  let vx = left;
  let vy = top;
  const chips = (Array.isArray(payload?.variables) ? payload.variables : [])
    .filter((variable) => typeof variable?.id === "string")
    .map((variable) => {
      const label = String(variable.label ?? variable.id);
      const type = variableType(variable);
      const range = Array.isArray(variable.range) ? variable.range : null;
      const w = Math.max(
        CHIP_WIDTH,
        labelWidth(false, label, VARIABLE_SIZE) +
          ((1 + valueChars(type, range)) * CHAR_WIDTH * VARIABLE_SIZE) / LITERAL_SIZE +
          18,
      );
      if (vx + w > right) {
        vx = left;
        vy += CHIP_HEIGHT + 10;
      }
      const chip = { id: variable.id, label, type, range, x: vx, y: vy, w, h: CHIP_HEIGHT };
      vx += w + 8;
      return chip;
    });
  return { chips, bottom: vy + CHIP_HEIGHT };
}

/** The strip's head: ASSIGNMENT when every variable is true / false, VALUES otherwise. */
export function stripLabelOf(chips) {
  return chips.every((chip) => chip.type !== "int") ? "ASSIGNMENT" : "VALUES";
}

/**
 * The Formula's layout.
 *
 * @param {Object} payload The Formula payload (`layout`, `groups`, `nodes`, `variables`).
 * @param {number} [width] The width to lay out at (the picture's box), clamped to
 *   MIN_WIDTH..MAX_WIDTH.
 * @returns {{minX: number, minY: number, width: number, height: number, stripY: number,
 *   form: "cnf"|"dnf"|null, innerOp: "and"|"or", outerOp: "and"|"or",
 *   clauses: Array<{id: string, label: string, weight: string|null, x: number, y: number,
 *     w: number, h: number, members: string[]}>,
 *   totalWeight: string|null, weightTotal: {x: number, y: number}|null,
 *   literals: Map<string, {id: string, label: string, variable: string, group: string,
 *     negated: boolean, name: string, x: number, y: number, w: number, h: number}>,
 *   outers: Array<{x: number, y: number, after: string}>,
 *   inners: Array<{x: number, y: number, clause: string}>,
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

  const { form, inner: innerOp, outer: outerOp } = formulaForm(payload);
  const clauses = [];
  const outers = [];
  const inners = [];
  let x = left;
  let y = TOP;
  let rowHeight = 0;
  let rowStart = true;
  groups.forEach((group, index) => {
    const members = (Array.isArray(group.members) ? group.members : [])
      .map((id) => literals.get(id))
      .filter(Boolean);
    // Pack the group's literals into rows no wider than the line: a long group wraps at its inner
    // operators.
    const maxInner = right - left - 2 * PAD - OUTER_WIDTH;
    const rows = [[]];
    let used = 0;
    for (const member of members) {
      const need = (rows.at(-1).length ? INNER_WIDTH : 0) + member.pillWidth;
      if (rows.at(-1).length && used + need > maxInner) {
        rows.push([]);
        used = 0;
      }
      used += (rows.at(-1).length ? INNER_WIDTH : 0) + member.pillWidth;
      rows.at(-1).push(member);
    }
    const rowWidths = rows.map((row, k) =>
      row.reduce((sum, member, q) => sum + member.pillWidth + (q || k ? INNER_WIDTH : 0), 0),
    );
    const weight = weightOf(group);
    const label = String(group.label ?? group.id);
    // A weighted name is wider than a short clause: the box grows to hold it, never past the line.
    const boxWidth = Math.max(
      2 * PAD + Math.max(0, ...rowWidths),
      weight === null
        ? 0
        : Math.min(nameWidth(label + weightText(weight)), right - left - OUTER_WIDTH),
    );
    const boxHeight = BOX_HEIGHT + (rows.length - 1) * (PILL_HEIGHT + 8);
    const need = (index ? OUTER_WIDTH : 0) + boxWidth;
    if (!rowStart && x + need > right) {
      y += rowHeight + ROW_GAP;
      x = left;
      rowHeight = 0;
      rowStart = true;
    }
    if (index) {
      outers.push({
        x: x + OUTER_WIDTH / 2,
        y: y + LABEL_HEIGHT + BOX_HEIGHT / 2,
        after: group.id,
      });
      x += OUTER_WIDTH;
    }
    const box = {
      id: group.id,
      label,
      weight,
      x,
      y: y + LABEL_HEIGHT,
      w: boxWidth,
      h: boxHeight,
      members: members.map((member) => member.id),
    };
    rows.forEach((row, k) => {
      let px = x + PAD + (k ? INNER_WIDTH : 0);
      const py = box.y + PAD + k * (PILL_HEIGHT + 8);
      if (k)
        inners.push({ x: x + PAD + INNER_WIDTH / 2, y: py + PILL_HEIGHT / 2, clause: group.id });
      row.forEach((member, q) => {
        if (q) {
          inners.push({ x: px + INNER_WIDTH / 2, y: py + PILL_HEIGHT / 2, clause: group.id });
          px += INNER_WIDTH;
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

  // A weighted formula's total, and where the strip's head puts the satisfied weight: beside the
  // head when its widest text fits the line, else on a line of its own under it.
  const weighted = clauses.some((clause) => clause.weight !== null);
  const totalWeight = weighted ? sumWeights(clauses.map((clause) => clause.weight ?? "0")) : null;
  const stripY = y + rowHeight + 22;
  let weightTotal = null;
  let totalLine = 0;
  if (weighted) {
    const heads = ["ASSIGNMENT", "VALUES"];
    const head = Math.max(...heads.map((text) => text.length)) * HEAD_CHAR;
    const beside = left + head + 14;
    const wide = satisfiedText(totalWeight, totalWeight).length * HEAD_CHAR;
    if (beside + wide <= right) weightTotal = { x: beside, y: stripY };
    else {
      weightTotal = { x: left, y: stripY + TOTAL_LINE };
      totalLine = TOTAL_LINE;
    }
  }

  // The assignment strip, under the formula, wrapping the same way.
  const { chips: variables, bottom } = stripChips(
    payload,
    left,
    right,
    y + rowHeight + 40 + totalLine,
  );

  // A literal no clause lists stays out of the drawing (it has no place).
  for (const [id, literal] of literals) if (literal.w === 0) literals.delete(id);

  return {
    minX: 0,
    minY: 0,
    width: drawingWidth,
    height: bottom + 14,
    stripY,
    stripLabel: stripLabelOf(variables),
    totalWeight,
    weightTotal,
    form,
    innerOp,
    outerOp,
    clauses,
    literals,
    outers,
    inners,
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
