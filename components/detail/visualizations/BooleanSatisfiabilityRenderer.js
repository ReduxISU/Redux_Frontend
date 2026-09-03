// components/detail/visualizations/BooleanSatisfiabilityRenderer.js
//
// T49 (#112) -- the `booleanSatisfiability` universal type's renderer
// (ai_documentation/VISUALIZATION_TYPE_CONTRACTS.md §3.3), covering SAT and SAT3 (2 of
// 48 declared instances). Ported from Redux_GUI's StandardSATSvgReact: each clause in
// parentheses, literals joined with U+2227, clauses joined with U+2228 -- T40's
// documented reading of what the original renderer actually draws, kept as-is rather
// than "corrected" against standard CNF notation, since this is a port of an observed
// renderer, not a re-derivation from first principles.
//
// No `d3.selectAll`/`d3.select` against `document` or a hardcoded id (§4.1): this is
// plain React-owned markup, nothing to scope beyond the one root id `useId()` already
// makes collision-proof between two mounted instances (Reductions' side-by-side panes,
// once T53 wires them to real data).
//
// Literal text (`"x1"`, `"!x2"`) is rendered exactly as the backend sends it -- no
// substituting `!` for a proper negation glyph -- the same "display exactly what the
// backend returned" call §3.5 already made for stepTable's cell text, extended here on
// the same reasoning: this is the backend's own data, not this project's UI copy.
//
// This is deliberately structured to grow editing affordances in T52 (`clauses`/
// `literals` map straight onto per-clause/per-literal React elements already) --
// T49 itself is static rendering only, per the issue's own scope note.

import Box from "@mui/material/Box";
import { useId, useState } from "react";
import { getVisualizationColor } from "../../theme";

const CONJUNCTION = "∧"; // AND, between literals within a clause (T40's finding, see header)
const DISJUNCTION = "∨"; // OR, between clauses

function literalVariable(literalText) {
  return typeof literalText === "string" ? literalText.replace(/^!/, "") : literalText;
}

function LiteralMark({ id, literal, highlighted, onEnter, onLeave }) {
  const color = getVisualizationColor(literal.color);
  return (
    <Box
      id={id}
      component="span"
      tabIndex={0}
      aria-label={literal.literal}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      sx={{
        fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
        fontSize: "0.9375rem",
        color,
        fontWeight: highlighted ? 700 : 500,
        textDecoration: highlighted ? "underline" : "none",
        borderRadius: 0.5,
        cursor: "default",
      }}
    >
      {literal.literal}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id this component renders, so two
 *   mounted instances (Reductions' side-by-side panes) never collide (§4.1).
 * @param {string} [props.instanceName] Human-readable visualization name, folded into
 *   the accessible summary when given.
 * @param {{clauses: Array}} props.frame One already-validated `booleanSatisfiability`
 *   frame.
 */
export default function BooleanSatisfiabilityRenderer({ idPrefix, instanceName, frame }) {
  const reactId = useId().replace(/:/g, "");
  const scopeId = `${idPrefix}-${reactId}`;
  // Hovering or focusing one literal highlights every literal for the same variable
  // (ignoring negation) across the whole formula -- the hover-triggered highlight §4.2
  // requires stay keyboard-reachable, via the identical onFocus/onBlur pair LiteralMark
  // already wires to the same mouse handlers.
  const [hoveredVariable, setHoveredVariable] = useState(null);

  const clauses = frame.clauses;
  const clauseCount = clauses.length;
  const summaryBody = `boolean formula with ${clauseCount} clause${clauseCount === 1 ? "" : "s"}`;
  const summary = instanceName ? `${instanceName}: ${summaryBody}` : summaryBody;

  return (
    <Box
      id={scopeId}
      role="img"
      aria-label={summary}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 1,
        p: 2,
        minHeight: "100%",
        boxSizing: "border-box",
      }}
    >
      {clauseCount === 0 ? (
        <Box component="span" sx={{ color: "text.secondary", fontStyle: "italic" }}>
          No clauses.
        </Box>
      ) : (
        clauses.map((clause, clauseIndex) => (
          <Box
            key={clause.id}
            component="span"
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
          >
            {clauseIndex > 0 && (
              <Box component="span" aria-hidden="true" sx={{ color: "text.secondary", mx: 0.5 }}>
                {DISJUNCTION}
              </Box>
            )}
            <Box component="span" sx={{ color: "text.secondary" }}>
              (
            </Box>
            {clause.literals.map((literal, literalIndex) => {
              const variable = literalVariable(literal.literal);
              return (
                <Box
                  key={literal.id}
                  component="span"
                  sx={{ display: "inline-flex", alignItems: "center" }}
                >
                  {literalIndex > 0 && (
                    <Box
                      component="span"
                      aria-hidden="true"
                      sx={{ color: "text.secondary", mx: 0.5 }}
                    >
                      {CONJUNCTION}
                    </Box>
                  )}
                  <LiteralMark
                    id={`${scopeId}-literal-${literal.id}`}
                    literal={literal}
                    highlighted={hoveredVariable != null && variable === hoveredVariable}
                    onEnter={() => setHoveredVariable(variable)}
                    onLeave={() =>
                      setHoveredVariable((current) => (current === variable ? null : current))
                    }
                  />
                </Box>
              );
            })}
            <Box component="span" sx={{ color: "text.secondary" }}>
              )
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
}
