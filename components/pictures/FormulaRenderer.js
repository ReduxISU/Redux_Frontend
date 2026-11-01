// components/pictures/FormulaRenderer.js
//
// #270: the Formula picture type (ReduxISU/Redux#925), Redux's PICTURE-TYPES.md "Formula". SAT's
// and 3SAT's formula as it is written: one box per clause, the literals inside a clause joined by
// ∨, the boxes joined by ∧, negation written ¬x, and under it a strip with each variable's value
// so far (–, T or F). A second picture for SAT and 3SAT, next to the Grouped Graph and the Factor
// Graph; it replaces neither.
//
// The payload is the Grouped Graph's without its edges: the clauses (`groups`, with their
// members), the literal occurrences (`nodes`, each naming its variable and clause) and the
// variables. Each frame holds the literal states (`nodes`), the clause states (`groups`), the
// assignment so far, and `variables`, each variable chip's state. The ids are the Grouped Graph's
// exactly (clause `c{i}`, literal `c{i}-{j}`, variable `v:{name}`), so the three SAT pictures
// color the same literal the same way and the Reduction View matches gadgets on them.
//
// What each state draws besides its color: a tried literal (ElementHighlight) a thick outline; a
// kept one (Committed) a dashed outline and a lighter green; the confirmed answer (Solution) a
// solid green pill; a false literal (False) a dotted outline and a strike through its letters,
// never through its subscript; a failed one (Rejected) a thick red outline. A clause with a true
// literal (Covered) is light green with ✓ by its name, one with every literal false (Rejected)
// light red with ✗.
//
// Layout is formulaLayout.js's pure function of the payload and the box's width, so on a phone
// the formula wraps to the phone's width rather than shrinking. Hovering, focusing or tapping a
// literal or a chip traces its variable everywhere; a clause traces its literals and their
// variables; everything else fades by color (grayscale and a dashed outline), never by opacity.
//
// #239: a gadget's pieces (`highlightIds`, `gadgetColors`; gadgetRings.js) get a ring around
// their box: a clause, a literal's pill, a variable's chip. The ∧ and ∨ name the clause they
// belong to (`data-piece-for`), so the Reduction View hides them with a clause not built yet.
//
// #278: the operators follow the payload's `layout` (formulaLayout.js's formulaForm): "cnf" is
// the drawing above, "dnf" swaps them (∧ inside a box, ∨ between), and any other value draws
// CNF's symbols without claiming a form. Each connective says its operator (`data-connective`,
// "and" or "or") and its place (`data-join`, "inner" or "outer"). The form is said outside the
// drawing, in the Legend (formulaAnnotations) and the picture's label; every text inside the
// drawing belongs to a piece and moves with it, so ASSIGNMENT is part of the variable strip.

import Box from "@mui/material/Box";
import { useMemo, useRef, useState } from "react";
import { paletteVars } from "../theme";
import DiagramZoom from "./DiagramZoom";
import {
  formulaForm,
  formulaTrace,
  LITERAL_SIZE,
  labelWidth,
  layoutFormula,
  SUB_SCALE,
  SUB_SHIFT,
  splitName,
  strikeWidth,
  VARIABLE_SIZE,
} from "./formulaLayout";
import { GadgetRect, useGadgetMarks } from "./gadgetRings";
import { FAINT_FILTER, MONO, TRACE_COLOR } from "./graphPieces";
import { pictureStateStyle, stateOf, strongestState } from "./pictureStates";
import { useBoxWidth } from "./useBoxWidth";

/** The dash of a faded piece's outline: grey and dashed, never transparent. */
const FAINT_DASH = "3 3";
/** A False literal's dotted outline. */
const FALSE_DASH = "2 3";

/** The symbol each operator is drawn with. */
const SYMBOLS = { and: "∧", or: "∨" };

/**
 * How a form names its boxes and its operators, for the picture's label and a box's aria-label:
 * a CNF formula's boxes are clauses (literals joined by "or"), a DNF one's terms (joined by
 * "and"), and a formula of no named form has groups of literals, listed without an operator.
 */
const FORM_WORDS = {
  cnf: { box: "Clause", boxes: "clause", inner: " or ", outer: "AND", innerWord: "OR" },
  dnf: { box: "Term", boxes: "term", inner: " and ", outer: "OR", innerWord: "AND" },
  none: { box: "Group", boxes: "group", inner: ", " },
};

/** What a clause's state says beside its name. */
const CLAUSE_MARKS = { Covered: "✓", Solution: "✓", Rejected: "✗" };

/**
 * How a literal's pill (or a variable's chip) looks in a state: its fill, outline, outline width
 * and dash, and its label's color and weight.
 */
function pillLook(state) {
  const style = pictureStateStyle(state);
  switch (state) {
    case "ElementHighlight":
      return { fill: style.fill, line: style.line, width: 3, dash: undefined, ink: style.ink };
    case "Solution":
      return {
        fill: style.fill,
        line: style.line,
        width: 2,
        dash: undefined,
        ink: style.ink,
        bold: true,
      };
    case "Committed":
      return {
        fill: style.fill,
        line: style.line,
        width: 2.4,
        dash: style.dash,
        ink: style.ink,
        bold: true,
      };
    case "False":
      return { fill: style.fill, line: style.line, width: 1.4, dash: FALSE_DASH, ink: style.ink };
    case "Rejected":
      return {
        fill: style.fill,
        line: style.line,
        width: 2.6,
        dash: undefined,
        ink: style.ink,
        bold: true,
      };
    case "Background":
      return {
        fill: paletteVars.surface.input,
        line: style.line,
        width: 1.4,
        dash: undefined,
        ink: paletteVars.text.primary,
      };
    default:
      return { fill: style.fill, line: style.line, width: 2, dash: style.dash, ink: style.ink };
  }
}

/** How a clause's box looks in a state: the tint behind its literals, its outline, its mark. */
function clauseLook(state) {
  const style = pictureStateStyle(state);
  const tints = paletteVars.viz.tint;
  switch (state) {
    case "Covered":
    case "Solution":
      return {
        fill: tints.covered,
        line: pictureStateStyle("Covered").line,
        width: 2.2,
        name: paletteVars.text.secondary,
        mark: pictureStateStyle("Covered").text,
      };
    case "Rejected":
      return {
        fill: tints.rejected,
        line: style.line,
        width: 3,
        name: style.text,
        mark: style.text,
      };
    case "ElementHighlight":
      return { fill: "none", line: style.line, width: 3, name: paletteVars.text.secondary };
    case "Committed":
      return {
        fill: tints.committed,
        line: style.line,
        width: 2.4,
        dash: style.dash,
        name: paletteVars.text.secondary,
      };
    case "Background":
      return { fill: "none", line: style.line, width: 1.6, name: paletteVars.text.secondary };
    default:
      return {
        fill: "none",
        line: style.line,
        width: 2,
        dash: style.dash,
        name: paletteVars.text.secondary,
      };
  }
}

/**
 * A label drawn from its left edge: ¬ and the base letters, then a letters-then-digits name's
 * digits as a subscript, smaller and a little lower. `after` (a variable chip's value) follows
 * on the base line.
 */
function LabelText({ x, y, negated, name, size, color, bold, after }) {
  const parts = splitName(name);
  const shift = Math.round(SUB_SHIFT * size * 10) / 10;
  return (
    <text
      x={x}
      y={y}
      dominantBaseline="central"
      fill={color}
      fontFamily={MONO}
      fontSize={size}
      fontWeight={bold ? 700 : 400}
      pointerEvents="none"
    >
      <tspan data-label-base="">{`${negated ? "¬" : ""}${parts.base}`}</tspan>
      {parts.sub && (
        // Placed where the layout counts the letters ending, not where the font ends them, so the
        // False strike (strikeWidth, short of that point) never reaches the subscript on a
        // narrower monospace font.
        <tspan
          data-label-sub=""
          x={x + labelWidth(negated, parts.base, size)}
          fontSize={Math.round(SUB_SCALE * size * 10) / 10}
          dy={shift}
        >
          {parts.sub}
        </tspan>
      )}
      {after && (
        <tspan data-value-text="" dx={7} dy={parts.sub ? -shift : undefined} fontWeight={700}>
          {after}
        </tspan>
      )}
    </text>
  );
}

/**
 * A chip's state when a frame has no `variables` map (Redux's open question 2 asks whether to
 * keep it): False when it is false, the tried variable's ElementHighlight, else what its true
 * literals say.
 */
function derivedChipState(frame, variable, literals) {
  const value = frame?.assignment?.[variable];
  if (Array.isArray(frame?.focus) && frame.focus.includes(variable)) return "ElementHighlight";
  if (value === false) return "False";
  if (value !== true) return "Background";
  const states = [...literals.values()]
    .filter((literal) => literal.variable === variable)
    .map((literal) => stateOf(frame?.nodes, literal.id))
    .filter((state) => state !== "False");
  return strongestState(states);
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Formula payload.
 * @param {Object} props.frame The frame to draw.
 * @param {string[]} [props.highlightIds] Gadget piece ids to mark (#239).
 * @param {Object<string, string>} [props.gadgetColors] Color mode's marks, by piece id (#239).
 */
export default function FormulaRenderer({
  idPrefix,
  name,
  payload,
  frame,
  highlightIds,
  gadgetColors,
}) {
  const gadgetOf = useGadgetMarks(highlightIds, gadgetColors);
  const boxRef = useRef(null);
  const boxWidth = useBoxWidth(boxRef);
  const layout = useMemo(() => layoutFormula(payload, boxWidth ?? undefined), [payload, boxWidth]);
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  // (An id from an earlier payload, after the formula changed, traces nothing.)
  const hot = formulaTrace(payload, hover ?? pinned);

  const assignment =
    frame?.assignment && typeof frame.assignment === "object" ? frame.assignment : {};
  const hasChipStates = frame?.variables && typeof frame.variables === "object";
  const clauseLabel = new Map(layout.clauses.map((clause) => [clause.id, clause.label]));
  const variableLabel = new Map(layout.variables.map((variable) => [variable.id, variable.label]));
  const words = FORM_WORDS[layout.form ?? "none"];
  const shownLiteral = (literal) => `${literal.negated ? "¬" : ""}${literal.name}`;

  const toggle = (id) => setPinned((current) => (current === id ? null : id));
  const traceProps = (id) => ({
    "data-focusable": "",
    tabIndex: 0,
    role: "button",
    "aria-pressed": pinned === id,
    onPointerEnter: (event) => {
      if (event.pointerType === "mouse") setHover(id);
    },
    onPointerLeave: (event) => {
      if (event.pointerType === "mouse") setHover(null);
    },
    onFocus: () => setHover(id),
    onBlur: () => setHover(null),
    onClick: () => toggle(id),
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle(id);
      }
    },
  });
  // A piece's place in the trace: "trace" (lit), "faint" (faded), or undefined (nothing traced).
  const traceOf = (id) => (hot ? (hot.has(id) ? "trace" : "faint") : undefined);

  const counts = `${plural(layout.clauses.length, words.boxes)}${layout.form ? "" : " of literals"} and ${plural(layout.variables.length, "variable")}`;
  const label = layout.form
    ? `${name}: a formula of ${counts}, the ${words.boxes}s joined by ${words.outer} and the literals in each ${words.boxes} by ${words.innerWord}.`
    : `${name}: a formula of ${counts}.`;
  const headStyle = {
    fill: paletteVars.text.secondary,
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    dominantBaseline: "central",
  };

  return (
    <Box
      ref={boxRef}
      id={`${idPrefix}-formula`}
      data-drawing-width={layout.width}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <DiagramZoom
        idPrefix={idPrefix}
        label={label}
        drawing={layout}
        resetOn={[payload, layout.width]}
      >
        {/* The tints behind the clauses' literals: behind everything, so no outline is hidden. */}
        <g data-layer="shade">
          {layout.clauses.map((clause) => {
            const state = stateOf(frame?.groups, clause.id);
            const look = clauseLook(state);
            if (look.fill === "none") return null;
            const trace = traceOf(clause.id);
            return (
              <rect
                key={clause.id}
                data-piece-for={clause.id}
                x={clause.x}
                y={clause.y}
                width={clause.w}
                height={clause.h}
                rx={9}
                fill={look.fill}
                pointerEvents="none"
                style={trace === "faint" ? { filter: FAINT_FILTER } : undefined}
              />
            );
          })}
        </g>
        <g data-layer="clauses">
          {layout.clauses.map((clause, index) => {
            const state = stateOf(frame?.groups, clause.id);
            const look = clauseLook(state);
            const trace = traceOf(clause.id);
            const traced = hover === clause.id || pinned === clause.id;
            const mark = CLAUSE_MARKS[state] ?? "";
            const literalTexts = clause.members.map((id) => shownLiteral(layout.literals.get(id)));
            const parts = [
              `${words.box} ${clause.label}: ${literalTexts.join(words.inner) || "empty"}`,
            ];
            if (state !== "Background") parts.push(pictureStateStyle(state).legend);
            let line = look.line;
            let width = look.width;
            let dash = look.dash;
            if (traced) {
              line = TRACE_COLOR;
              width = 3;
              dash = undefined;
            } else if (trace === "faint") {
              dash = FAINT_DASH;
            }
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={clause.id}
                id={`${idPrefix}-clause-${index}`}
                data-clause-id={clause.id}
                data-state={state}
                data-traced={trace}
                aria-label={parts.join(", ")}
                style={trace === "faint" ? { filter: FAINT_FILTER } : undefined}
                {...traceProps(clause.id)}
              >
                <rect
                  x={clause.x}
                  y={clause.y}
                  width={clause.w}
                  height={clause.h}
                  rx={9}
                  data-body=""
                  fill="none"
                  pointerEvents="all"
                  stroke={line}
                  strokeWidth={width}
                  strokeDasharray={dash}
                />
                <GadgetRect
                  id={clause.id}
                  color={gadgetOf(clause.id)}
                  x={clause.x}
                  y={clause.y}
                  width={clause.w}
                  height={clause.h}
                  rx={9}
                />
                <text
                  x={clause.x + 2}
                  y={clause.y - 15}
                  dominantBaseline="central"
                  fill={look.name}
                  fontFamily={MONO}
                  fontSize={11}
                  fontWeight={600}
                  pointerEvents="none"
                  data-clause-name=""
                >
                  {clause.label}
                  {mark && (
                    <tspan
                      data-clause-mark={mark}
                      dx={5}
                      fill={look.mark}
                      fontSize={12}
                      fontWeight={700}
                    >
                      {mark}
                    </tspan>
                  )}
                </text>
              </g>
            );
          })}
        </g>
        <g data-layer="operators">
          {layout.outers.map((outer) => (
            <text
              key={`outer-${outer.after}`}
              data-connective={layout.outerOp}
              data-join="outer"
              data-piece-for={outer.after}
              x={outer.x}
              y={outer.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={paletteVars.text.primary}
              fontFamily={MONO}
              fontSize={17}
              fontWeight={600}
              pointerEvents="none"
              aria-hidden="true"
              style={traceOf(outer.after) === "faint" ? { filter: FAINT_FILTER } : undefined}
            >
              {SYMBOLS[layout.outerOp]}
            </text>
          ))}
          {layout.inners.map((inner) => (
            <text
              key={`inner-${inner.clause}-${inner.x}-${inner.y}`}
              data-connective={layout.innerOp}
              data-join="inner"
              data-piece-for={inner.clause}
              x={inner.x}
              y={inner.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={paletteVars.text.secondary}
              fontFamily={MONO}
              fontSize={14}
              pointerEvents="none"
              aria-hidden="true"
            >
              {SYMBOLS[layout.innerOp]}
            </text>
          ))}
        </g>
        <g data-layer="literals">
          {[...layout.literals.values()].map((literal) => {
            const state = stateOf(frame?.nodes, literal.id);
            const look = pillLook(state);
            const trace = traceOf(literal.id);
            const traced = trace === "trace";
            const lw = labelWidth(literal.negated, literal.name);
            const x0 = literal.x + (literal.w - lw) / 2;
            const cy = literal.y + literal.h / 2;
            const parts = [
              `Literal ${shownLiteral(literal)} in ${clauseLabel.get(literal.group) ?? literal.group}`,
            ];
            if (state !== "Background") parts.push(pictureStateStyle(state).legend);
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={literal.id}
                data-node-id={literal.id}
                data-variable={literal.variable ?? undefined}
                data-state={state}
                data-traced={trace}
                aria-label={parts.join(", ")}
                style={trace === "faint" ? { filter: FAINT_FILTER } : undefined}
                {...traceProps(literal.id)}
              >
                <rect
                  x={literal.x}
                  y={literal.y}
                  width={literal.w}
                  height={literal.h}
                  rx={7}
                  data-body=""
                  fill={look.fill}
                  stroke={traced ? TRACE_COLOR : look.line}
                  strokeWidth={traced ? 3 : look.width}
                  strokeDasharray={traced ? undefined : trace === "faint" ? FAINT_DASH : look.dash}
                />
                <GadgetRect
                  id={literal.id}
                  color={gadgetOf(literal.id)}
                  x={literal.x}
                  y={literal.y}
                  width={literal.w}
                  height={literal.h}
                  rx={7}
                />
                <LabelText
                  x={x0}
                  y={cy}
                  negated={literal.negated}
                  name={literal.name}
                  size={LITERAL_SIZE}
                  color={look.ink}
                  bold={look.bold}
                />
                {state === "False" && (
                  // False's mark besides color: a strike through the letters, never the subscript.
                  <line
                    data-strike=""
                    x1={x0 - 1}
                    y1={cy + 1}
                    x2={x0 + strikeWidth(literal.negated, literal.name)}
                    y2={cy + 1}
                    stroke={look.ink}
                    strokeWidth={1.6}
                    pointerEvents="none"
                  />
                )}
              </g>
            );
          })}
        </g>
        {/* The variable strip: its ASSIGNMENT head is part of it, so it moves with the chips. */}
        <g data-layer="variables" data-strip="assignment">
          {layout.variables.length > 0 && (
            <text x={12} y={layout.stripY} data-strip-head="" {...headStyle}>
              ASSIGNMENT
            </text>
          )}
          {layout.variables.map((variable, index) => {
            const state = hasChipStates
              ? stateOf(frame.variables, variable.id)
              : derivedChipState(frame, variable.id, layout.literals);
            const look = pillLook(state);
            const value = assignment[variable.id];
            const assigned = typeof value === "boolean";
            const trace = traceOf(variable.id);
            const traced = trace === "trace";
            const spoken = assigned ? (value ? "true" : "false") : "not assigned yet";
            const parts = [`Variable ${variableLabel.get(variable.id)}: ${spoken}`];
            if (state !== "Background") parts.push(pictureStateStyle(state).legend);
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={variable.id}
                id={`${idPrefix}-variable-${index}`}
                data-variable-id={variable.id}
                data-value={assigned ? String(value) : "unassigned"}
                data-state={state}
                data-traced={trace}
                aria-label={parts.join(", ")}
                style={trace === "faint" ? { filter: FAINT_FILTER } : undefined}
                {...traceProps(variable.id)}
              >
                <rect
                  x={variable.x}
                  y={variable.y}
                  width={variable.w}
                  height={variable.h}
                  rx={7}
                  data-body=""
                  fill={look.fill}
                  stroke={traced ? TRACE_COLOR : look.line}
                  strokeWidth={traced ? 3 : look.width}
                  strokeDasharray={traced ? undefined : trace === "faint" ? FAINT_DASH : look.dash}
                />
                <GadgetRect
                  id={variable.id}
                  color={gadgetOf(variable.id)}
                  x={variable.x}
                  y={variable.y}
                  width={variable.w}
                  height={variable.h}
                  rx={7}
                />
                <LabelText
                  x={variable.x + 9}
                  y={variable.y + variable.h / 2}
                  negated={false}
                  name={variable.label}
                  size={VARIABLE_SIZE}
                  color={look.ink}
                  bold={false}
                  after={assigned ? (value ? "T" : "F") : "–"}
                />
              </g>
            );
          })}
        </g>
      </DiagramZoom>
    </Box>
  );
}

/** The Legend's line for the boxes and operators, worded from the payload's `layout` (#278). */
const FORM_LEGEND = {
  cnf: {
    text: "Boxes are clauses, joined by ∧; the literals inside are joined by ∨ (CNF).",
    swatch: "∧∨",
  },
  dnf: {
    text: "Boxes are terms, joined by ∨; the literals inside are joined by ∧ (DNF).",
    swatch: "∨∧",
  },
  // No named form: say only what a box is, never what its operators mean.
  none: { text: "Boxes are groups of literals.", swatch: "▢" },
};

/**
 * The Legend's entries for what a formula draws besides states: the boxes and their operators
 * (worded from the form the payload names), a False literal's strike, a clause's ✓ / ✗, and the
 * chips' values, each only when the run (or, for the boxes, the formula) has it.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function formulaAnnotations(payload, frames) {
  const entries = [];
  const list = Array.isArray(frames) ? frames.filter(Boolean) : [];
  if ((payload?.groups ?? []).length > 0) {
    const line = FORM_LEGEND[formulaForm(payload).form ?? "none"];
    entries.push({
      key: "connectives",
      text: line.text,
      swatch: { kind: "text", text: line.swatch },
    });
  }
  const anyState = (map, wanted) =>
    list.some(
      (frame) =>
        frame?.[map] &&
        typeof frame[map] === "object" &&
        Object.values(frame[map]).some((entry) => wanted.includes(entry?.state)),
    );
  if (anyState("nodes", ["False"])) {
    entries.push({
      key: "strike",
      text: "Struck through (false; the letters only, never the subscript)",
      swatch: { kind: "strike", text: "x", sub: "1" },
    });
  }
  if (anyState("groups", ["Covered", "Solution", "Rejected"])) {
    entries.push({
      key: "clause-mark",
      text: "✓ / ✗ by a clause's name (a true literal / every literal false)",
      swatch: { kind: "text", text: "✓✗" },
    });
  }
  if (
    list.some(
      (frame) =>
        frame?.assignment &&
        typeof frame.assignment === "object" &&
        Object.keys(frame.assignment).length > 0,
    )
  ) {
    entries.push({
      key: "value",
      text: "T / F / – (the variable's value so far)",
      swatch: { kind: "text", text: "T" },
    });
  }
  return entries;
}
