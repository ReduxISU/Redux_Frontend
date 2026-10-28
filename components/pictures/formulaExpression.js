// components/pictures/formulaExpression.js
//
// #278 Part 2 (ReduxISU/Redux#929): where the Formula picture puts the pieces of a formula given
// as expressions. A pure function of the payload and the width, like formulaLayout.js, which it
// leaves to draw the flat CNF / DNF payloads exactly as before. Ported from Redux's design mockup
// (Documentation/Visualizations/mockups/formula.js: `exprTokens`, `pack`, `layout`, `legend`).
//
// The payload's `layout` picks the drawing:
//   "rows"      groups as boxes joined by an `outer` operator, flowing left to right and wrapping
//               (`arrange: "flow"`) or one per line (`arrange: "stack"`, the operator in a column
//               on the left). 0-1 Integer Programming's constraints are stacked rows.
//   "equation"  each group one expression on its own line(s), with no box until it has a state.
//               Prime Factorization and Subset Sum. ("tree" is reserved, and drawn as this.)
// A group holds an expression tree (`expr`), or a flat literal list (`members`), which is the
// `inner` operator over its literals. The pieces of an expression:
//   {id, var: "v:x1"}               a variable occurrence: a pill labelled with the variable
//   {id, num: 7, variable?}         a number: plain text until it has a state; `variable` ties it
//                                   to a chip (Subset Sum's numbers, a coefficient)
//   {id, label: "?", variable?}     a placeholder, drawn like a number
//   {id, op: "plus", args: [...]}   an operator node, by name, from OPS; `not` over a variable
//                                   occurrence folds into one ¬x pill
// Every piece and operator node has a stable id (0-1 ILP: row r0, its relation r0-rel, the
// occurrence r0-x0, a coefficient r0-c0, the bound r0-d; chips v:x1), so frames, the focus,
// gadgets and the Reduction View can name it. A frame's `exprs` replaces a group's expression for
// that frame (Prime Factorization builds its right side as it goes): effectivePayload.
//
// Lines wrap at the shallowest operators first: a relation's sides before the terms of a sum,
// a sum's terms before what is inside a term.

import {
  BOX_HEIGHT,
  formatNumber,
  INNER_WIDTH,
  LABEL_HEIGHT,
  labelWidth,
  literalName,
  MARGIN,
  MAX_WIDTH,
  OUTER_WIDTH,
  PAD,
  PILL_HEIGHT,
  pillWidth,
  ROW_GAP,
  stripChips,
  stripLabelOf,
  variableType,
} from "./formulaLayout";

/**
 * The one operator table. `fix`: "infix" (a + b, n-ary), "prefix" (−a), "juxt" (2x, no symbol)
 * or "call" (Σ(a, b)). `prec` decides parentheses: a child binding looser than its parent is
 * wrapped, and relations (prec 0) never chain unwrapped; `assoc`: a same-operator child on the
 * right needs none. `say` is how a screen reader hears it, `rel` how the Legend reads a relation
 * and `says` what the Legend says a call means. An unknown name is drawn as `name(a, b)`.
 */
export const OPS = {
  or: { sym: "∨", fix: "infix", prec: 1, assoc: true, say: "or" },
  and: { sym: "∧", fix: "infix", prec: 2, assoc: true, say: "and" },
  eq: { sym: "=", fix: "infix", prec: 0, say: "equals", rel: "both sides are equal" },
  le: {
    sym: "≤",
    fix: "infix",
    prec: 0,
    say: "is at most",
    rel: "the left side is at most the right side",
  },
  ge: {
    sym: "≥",
    fix: "infix",
    prec: 0,
    say: "is at least",
    rel: "the left side is at least the right side",
  },
  lt: {
    sym: "<",
    fix: "infix",
    prec: 0,
    say: "is less than",
    rel: "the left side is less than the right side",
  },
  gt: {
    sym: ">",
    fix: "infix",
    prec: 0,
    say: "is more than",
    rel: "the left side is more than the right side",
  },
  plus: { sym: "+", fix: "infix", prec: 3, assoc: true, say: "plus" },
  minus: { sym: "−", fix: "infix", prec: 3, say: "minus" },
  times: { sym: "×", fix: "infix", prec: 4, assoc: true, say: "times" },
  mul: { sym: "", fix: "juxt", prec: 4, say: "times" },
  not: { sym: "¬", fix: "prefix", prec: 6, say: "not" },
  neg: { sym: "−", fix: "prefix", prec: 6, say: "minus" },
  sum: { sym: "Σ", fix: "call", prec: 9, say: "the sum of", says: "Σ(…) adds up what is inside" },
};

/** An operator's entry, or the call form `name(a, b)` for a name OPS doesn't have. */
export function opInfo(name) {
  return Object.hasOwn(OPS, name)
    ? OPS[name]
    : { sym: String(name), fix: "call", prec: 9, say: String(name), unknown: true };
}

/** The layout presets: CNF and DNF are "rows" with their operators and noun fixed. */
const PRESETS = {
  cnf: { outer: "and", inner: "or", noun: "clause" },
  dnf: { outer: "or", inner: "and", noun: "term" },
};

function layoutName(payload) {
  return typeof payload?.layout === "string" ? payload.layout.toLowerCase() : "";
}

/**
 * True when the payload is drawn here: a group holds an `expr`, `layout` is "equation" or "tree",
 * or `layout` is "rows" with its operators named. A flat CNF / DNF payload (and a flat one of no
 * named form) keeps formulaLayout.js's drawing.
 */
export function isExpressionFormula(payload) {
  const named = layoutName(payload);
  if (named === "equation" || named === "tree") return true;
  if (
    named === "rows" &&
    (typeof payload?.outer === "string" || typeof payload?.inner === "string")
  )
    return true;
  return (Array.isArray(payload?.groups) ? payload.groups : []).some(
    (group) => group?.expr && typeof group.expr === "object",
  );
}

/** The payload with a frame's `exprs` in place of the expressions of the groups it names. */
export function effectivePayload(payload, frame) {
  const exprs = frame?.exprs;
  if (!exprs || typeof exprs !== "object" || !Array.isArray(payload?.groups)) return payload;
  const replaced = (group) => exprs[group?.id] && typeof exprs[group.id] === "object";
  if (!payload.groups.some(replaced)) return payload;
  return {
    ...payload,
    groups: payload.groups.map((group) =>
      replaced(group) ? { ...group, expr: exprs[group.id] } : group,
    ),
  };
}

// Sizes, in drawing units, beside formulaLayout.js's. An infix symbol takes INNER_WIDTH, the room
// a CNF ∨ takes.
const PREFIX_WIDTH = 12;
const PAREN_WIDTH = 10;
const COMMA_WIDTH = 12;
/** An operator's text is 14 px monospace: 8.4 a character. */
const OP_CHAR = 8.4;
const LINE_GAP = 8;
const JUXT_GAP = 4;
/**
 * The narrowest an expression formula is laid out: a phone's picture box (about 300 px at 390),
 * so it is drawn at its own size there and its smallest text stays 11 px. A row too long for it
 * wraps at its relation first.
 */
export const EXPR_MIN_WIDTH = 280;
const TOP = 14;

function numberWidth(text) {
  return Math.max(22, labelWidth(false, text) + 12);
}

/**
 * An expression as a list of tokens: pieces ({t: "piece", kind: "lit" | "num", id, name,
 * negated, text, variable, w}) and symbols ({t: "sym", text, op, w, owner, brk}). `brk` is the
 * nesting depth a line may break at, before that token. `owner` is the operator node's id (a
 * made-up one when it has none).
 */
function exprTokens(expr, variableIndex, groupId) {
  const out = [];
  let auto = 0;
  const leaf = (node) => {
    if (node.var !== undefined && node.var !== null) {
      const name = String(node.label ?? variableIndex.get(node.var)?.label ?? node.var);
      return {
        t: "piece",
        kind: "lit",
        id: String(node.id ?? `${groupId}/p${auto++}`),
        name,
        negated: false,
        text: name,
        variable: String(node.var),
        w: pillWidth(false, name),
      };
    }
    const number = node.num !== undefined && node.num !== null;
    const text = number ? formatNumber(node.num) : String(node.label ?? "?");
    return {
      t: "piece",
      kind: "num",
      id: String(node.id ?? `${groupId}/p${auto++}`),
      name: text,
      negated: false,
      text,
      placeholder: !number,
      variable: typeof node.variable === "string" ? node.variable : null,
      w: numberWidth(text),
    };
  };
  const sym = (text, w, owner, op, brk) => {
    const token = { t: "sym", text, w, owner, op };
    if (brk !== undefined) token.brk = brk;
    out.push(token);
  };
  const walk = (node, depth) => {
    if (!node || typeof node !== "object") return;
    if (!node.op) {
      out.push(leaf(node));
      return;
    }
    const info = opInfo(node.op);
    const owner = String(node.id ?? `${groupId}/op${auto++}`);
    const args = (Array.isArray(node.args) ? node.args : []).filter(
      (arg) => arg && typeof arg === "object",
    );
    if (node.op === "not" && args.length === 1 && !args[0].op && args[0].var !== undefined) {
      const piece = leaf(args[0]);
      piece.negated = true;
      piece.text = `¬${piece.name}`;
      piece.w = pillWidth(true, piece.name);
      out.push(piece);
      return;
    }
    const sub = (child, k) => {
      const childInfo = child.op ? opInfo(child.op) : null;
      let paren = false;
      if (childInfo && info.fix !== "call") {
        if (childInfo.prec < info.prec) paren = true;
        else if (childInfo.prec === info.prec && info.fix === "infix")
          paren = info.prec === 0 || (k > 0 && !(info.assoc && child.op === node.op));
        else if (childInfo.prec === info.prec && info.fix === "juxt") paren = k > 0;
      }
      // A same-precedence chain (a + b − c) is one level, so it wraps together.
      const next =
        info.fix === "call" || paren || (childInfo && childInfo.prec !== info.prec)
          ? depth + 1
          : depth;
      if (paren) sym("(", PAREN_WIDTH, owner, node.op);
      walk(child, next);
      if (paren) sym(")", PAREN_WIDTH, owner, node.op);
    };
    if (info.fix === "infix") {
      args.forEach((child, k) => {
        if (k) sym(info.sym, INNER_WIDTH, owner, node.op, depth);
        sub(child, k);
      });
    } else if (info.fix === "prefix") {
      sym(info.sym, PREFIX_WIDTH, owner, node.op);
      args.forEach(sub);
    } else if (info.fix === "juxt") {
      // No symbol, only a hair of room, so a coefficient's pill and its variable's don't touch.
      args.forEach((child, k) => {
        if (k) sym("", JUXT_GAP, owner, node.op);
        sub(child, k);
      });
    } else {
      sym(`${info.sym}(`, info.sym.length * OP_CHAR + PAREN_WIDTH, owner, node.op);
      args.forEach((child, k) => {
        if (k) sym(",", COMMA_WIDTH, owner, node.op);
        const at = out.length;
        sub(child, k);
        // A call wraps after its commas.
        if (k && out[at] && out[at].brk === undefined) out[at].brk = depth + 1;
      });
      sym(")", PAREN_WIDTH, owner, node.op);
    }
  };
  walk(expr, 0);
  return out;
}

/**
 * Breaks tokens into lines no wider than maxWidth. A run that fits goes on the current line, or
 * else starts the next; a run wider than a line is cut at its shallowest operators and each part
 * placed the same way. The operator at a break leads the new line.
 */
function pack(tokens, maxWidth) {
  const levels = [
    ...new Set(tokens.filter((t, i) => i && t.brk !== undefined).map((t) => t.brk)),
  ].sort((a, b) => a - b);
  const lines = [[]];
  let used = 0;
  const widthOf = (list) => list.reduce((sum, t) => sum + t.w, 0);
  const place = (list, level) => {
    const w = widthOf(list);
    const line = lines.at(-1);
    if (used + w <= maxWidth || (!line.length && level >= levels.length)) {
      line.push(...list);
      used += w;
      return;
    }
    if (w <= maxWidth || level >= levels.length) {
      if (line.length) lines.push([]);
      lines.at(-1).push(...list);
      used = w;
      return;
    }
    const parts = [];
    list.forEach((t, i) => {
      if (!parts.length || (i && t.brk !== undefined && t.brk <= levels[level])) parts.push([]);
      parts.at(-1).push(t);
    });
    for (const part of parts) place(part, level + 1);
  };
  place(tokens, 0);
  return lines.filter((line) => line.length > 0);
}

/** How a screen reader hears an expression, from its tree: "minus x1 plus x2 is at most 0". */
export function speakExpr(node, variableIndex) {
  if (!node || typeof node !== "object") return "";
  if (!node.op) {
    if (node.var !== undefined && node.var !== null)
      return String(node.label ?? variableIndex?.get(node.var)?.label ?? node.var);
    if (node.num !== undefined && node.num !== null) return String(node.num);
    return String(node.label ?? "?");
  }
  const info = opInfo(node.op);
  const args = (Array.isArray(node.args) ? node.args : []).map((arg) =>
    speakExpr(arg, variableIndex),
  );
  if (info.fix === "infix" || info.fix === "juxt") return args.join(` ${info.say} `);
  if (info.fix === "prefix") return `${info.say} ${args.join(" ")}`;
  return `${info.say} ${args.join(", ")}`;
}

/**
 * The payload as the layout reads it: the layout ("rows" | "equation"), the preset it names, the
 * outer operator (null for an equation), the inner one (a flat group's), how rows are arranged,
 * what a group is called (`noun`), and each group's expression and tokens.
 */
export function normalizeFormula(payload) {
  const named = layoutName(payload);
  const preset = Object.hasOwn(PRESETS, named) ? PRESETS[named] : null;
  const equation = named === "equation" || named === "tree";
  const outer = equation
    ? null
    : typeof payload?.outer === "string"
      ? payload.outer
      : (preset?.outer ?? "and");
  const inner = typeof payload?.inner === "string" ? payload.inner : (preset?.inner ?? "or");
  const variables = (Array.isArray(payload?.variables) ? payload.variables : [])
    .filter((variable) => typeof variable?.id === "string")
    .map((variable) => ({ ...variable, type: variableType(variable) }));
  const variableIndex = new Map(variables.map((variable) => [variable.id, variable]));
  const nodeIndex = new Map(
    (Array.isArray(payload?.nodes) ? payload.nodes : [])
      .filter((node) => typeof node?.id === "string")
      .map((node) => [node.id, node]),
  );
  const rawGroups = (Array.isArray(payload?.groups) ? payload.groups : []).filter(
    (group) => typeof group?.id === "string",
  );
  const groups = rawGroups.map((group) => {
    let expr = group.expr && typeof group.expr === "object" ? group.expr : null;
    if (!expr) {
      // A flat literal list is the inner operator over its literals.
      const leaves = (Array.isArray(group.members) ? group.members : [])
        .map((id) => nodeIndex.get(id))
        .filter(Boolean)
        .map((node) => {
          const occurrence = {
            id: node.id,
            var: node.variable ?? node.id,
            label: literalName(node),
          };
          return node.positive === false ? { op: "not", args: [occurrence] } : occurrence;
        });
      expr = leaves.length === 1 ? leaves[0] : { id: `${group.id}/inner`, op: inner, args: leaves };
    }
    return {
      id: group.id,
      label: String(group.label ?? ""),
      expr,
      tokens: exprTokens(expr, variableIndex, group.id),
    };
  });
  return {
    layout: equation ? "equation" : "rows",
    preset: preset ? named : null,
    outer,
    inner,
    arrange: equation ? "stack" : payload?.arrange === "stack" ? "stack" : "flow",
    noun:
      typeof payload?.noun === "string" && payload.noun
        ? payload.noun
        : (preset?.noun ?? (equation ? "equation" : "group")),
    flat: rawGroups.every((group) => !group.expr),
    groups,
    variables,
    variableIndex,
  };
}

/**
 * The expression Formula's layout.
 *
 * @param {Object} payload The Formula payload, with a frame's `exprs` already in place
 *   (effectivePayload).
 * @param {number} [width] The box's width, clamped to EXPR_MIN_WIDTH..MAX_WIDTH. A group no line can
 *   hold (one piece wider than the line) widens the drawing rather than shrinking its text.
 * @returns {{mode: "expr", minX: number, minY: number, width: number, height: number,
 *   stripY: number, stripLabel: string, model: Object,
 *   groups: Array<{id, label, x, y, w, h, plain: boolean, members: string[], spoken: string}>,
 *   pieces: Map<string, {id, kind: "lit"|"num", name, negated, text, variable, placeholder,
 *     group, x, y, w, h}>,
 *   symbols: Array<{x, y, w, text, op, owner, group}>,
 *   joins: Array<{x, y, text, op, after}>,
 *   variables: Array<{id, label, type, range, x, y, w, h}>}}
 */
export function layoutExpression(payload, width = MAX_WIDTH) {
  const model = normalizeFormula(payload);
  const drawingWidth = Math.round(
    Math.min(MAX_WIDTH, Math.max(EXPR_MIN_WIDTH, width || MAX_WIDTH)),
  );
  const left = MARGIN;
  const right = drawingWidth - MARGIN;
  const joinText = model.outer ? opInfo(model.outer).sym : null;
  const stacked = model.arrange === "stack";
  const indent = stacked && joinText ? OUTER_WIDTH : 0;
  const maxInner =
    right - left - 2 * PAD - (model.layout === "equation" ? 0 : stacked ? indent : OUTER_WIDTH);
  const groups = [];
  const pieces = new Map();
  const symbols = [];
  const joins = [];
  let x = left;
  let y = TOP;
  let rowHeight = 0;
  let rowStart = true;
  let widest = right;
  model.groups.forEach((group, index) => {
    const lines = pack(group.tokens, maxInner);
    const lineWidths = lines.map((line) => line.reduce((sum, t) => sum + t.w, 0));
    const boxWidth = 2 * PAD + Math.max(0, ...lineWidths);
    const boxHeight = BOX_HEIGHT + Math.max(0, lines.length - 1) * (PILL_HEIGHT + LINE_GAP);
    const join = (jx) => ({
      x: jx,
      y: y + LABEL_HEIGHT + BOX_HEIGHT / 2,
      text: joinText,
      op: model.outer,
      after: group.id,
    });
    if (stacked) {
      if (index) {
        y += rowHeight + ROW_GAP;
        rowHeight = 0;
      }
      x = left + indent;
      if (index && joinText) joins.push(join(left + OUTER_WIDTH / 2));
    } else {
      const need = (index ? OUTER_WIDTH : 0) + boxWidth;
      if (!rowStart && x + need > right) {
        y += rowHeight + ROW_GAP;
        x = left;
        rowHeight = 0;
        rowStart = true;
      }
      if (index) {
        if (joinText) joins.push(join(x + OUTER_WIDTH / 2));
        x += OUTER_WIDTH;
      }
    }
    const box = {
      id: group.id,
      label: group.label,
      x,
      y: y + LABEL_HEIGHT,
      w: boxWidth,
      h: boxHeight,
      plain: model.layout === "equation",
      members: [],
      spoken: speakExpr(group.expr, model.variableIndex),
    };
    lines.forEach((line, k) => {
      let px = x + PAD;
      const py = box.y + PAD + k * (PILL_HEIGHT + LINE_GAP);
      for (const token of line) {
        if (token.t === "sym") {
          if (token.text)
            symbols.push({
              x: px + token.w / 2,
              y: py + PILL_HEIGHT / 2,
              w: token.w,
              text: token.text,
              op: token.op,
              owner: token.owner,
              group: group.id,
            });
        } else if (!pieces.has(token.id)) {
          pieces.set(token.id, { ...token, group: group.id, x: px, y: py, h: PILL_HEIGHT });
          box.members.push(token.id);
        }
        px += token.w;
      }
    });
    groups.push(box);
    widest = Math.max(widest, x + boxWidth);
    x += boxWidth;
    rowHeight = Math.max(rowHeight, LABEL_HEIGHT + boxHeight);
    rowStart = false;
  });
  const finalWidth = Math.max(drawingWidth, Math.ceil(widest + MARGIN));
  const { chips, bottom } = stripChips(payload, left, finalWidth - MARGIN, y + rowHeight + 40);
  return {
    mode: "expr",
    minX: 0,
    minY: 0,
    width: finalWidth,
    height: chips.length ? bottom + 14 : y + rowHeight + 14,
    stripY: y + rowHeight + 22,
    stripLabel: stripLabelOf(chips),
    model,
    groups,
    pieces,
    symbols,
    joins,
    variables: chips,
  };
}

/**
 * What pointing at `id` traces: a chip, or a piece tied to a variable (an occurrence, a number
 * with `variable`), traces that variable everywhere; a group traces its pieces and their
 * variables; a plain number only itself. Null for an id the drawing doesn't have.
 */
export function expressionTrace(layout, id) {
  if (typeof id !== "string" || !layout?.pieces) return null;
  const piece = layout.pieces.get(id);
  const group = layout.groups.find((candidate) => candidate.id === id);
  const isVariable = layout.variables.some((candidate) => candidate.id === id);
  if (!piece && !group && !isVariable) return null;
  const hot = new Set([id]);
  const addVariable = (variable) => {
    if (typeof variable !== "string") return;
    hot.add(variable);
    for (const other of layout.pieces.values()) if (other.variable === variable) hot.add(other.id);
  };
  if (isVariable) addVariable(id);
  if (piece) addVariable(piece.variable);
  if (group) {
    for (const member of group.members) {
      hot.add(member);
      const inner = layout.pieces.get(member);
      if (inner?.variable) hot.add(inner.variable);
    }
  }
  return hot;
}

/**
 * The Legend's line for an expression Formula, worded from its layout and operators (the
 * mockup's `legend`): what a box is and how the boxes join, or how to read an equation, and what
 * any call operator means.
 */
export function expressionLegend(payload) {
  const model = normalizeFormula(payload);
  const noun = model.noun;
  const sym = (op) => opInfo(op).sym;
  const used = new Set();
  const walkOps = (node) => {
    if (node && typeof node === "object" && node.op) {
      used.add(node.op);
      for (const arg of Array.isArray(node.args) ? node.args : []) walkOps(arg);
    }
  };
  for (const group of model.groups) walkOps(group.expr);
  const out = [];
  if (model.layout === "rows") {
    const tag = model.preset ? ` (${model.preset.toUpperCase()})` : "";
    const all =
      model.outer === "and"
        ? `Every ${noun} must hold`
        : model.outer === "or"
          ? `One ${noun} that holds is enough`
          : `The ${noun}s are combined by ${sym(model.outer)}`;
    if (model.flat) {
      const each =
        model.inner === "or"
          ? `a ${noun} holds when one of its literals is true`
          : model.inner === "and"
            ? `a ${noun} holds when all its literals are true`
            : `a ${noun} is its literals combined by ${sym(model.inner)}`;
      out.push(
        `Boxes are ${noun}s, joined by ${sym(model.outer)}; the literals inside are joined by ${sym(model.inner)}${tag}. ${all}: ${each}.`,
      );
    } else {
      out.push(
        `Each box is a ${noun}, joined by ${sym(model.outer)}${model.arrange === "stack" ? ", one per line" : ""}. ${all}.`,
      );
    }
  } else {
    const relations = [
      ...new Set(model.groups.map((group) => group.expr?.op).filter((op) => op && OPS[op]?.rel)),
    ];
    const holds = relations.length === 1 ? `; it holds when ${OPS[relations[0]].rel}` : "";
    out.push(
      `${model.groups.length > 1 ? "One equation per line" : "One equation"}, wrapped at its top-level operators${holds}.`,
    );
  }
  const says = [...used]
    .map((op) =>
      Object.hasOwn(OPS, op) ? OPS[op].says : `${op}(…) is the operator "${op}", written by name`,
    )
    .filter(Boolean);
  if (says.length) out.push(`${says.join("; ")}.`);
  return out.join(" ");
}
