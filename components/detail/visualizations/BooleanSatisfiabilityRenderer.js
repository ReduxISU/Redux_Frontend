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
// T52 (#115): editing affordances (add/remove/negate a literal, add/remove a clause) are
// now here, gated behind the `editable` prop -- exactly the growth this component was
// structured for. Only ever passed `editable` when the frame being shown is the base
// frame (frames[0], per INTERACTIVE_LAYER_DESIGN.md §2.3) -- VisualizationsSection.js
// owns that gate, this component doesn't re-derive it. Every edit control here is a
// real, focusable, aria-labelled button or text input -- no drag, no right-click -- per
// §3's keyboard-reachable requirement (same precedent as T18's KeyboardSensor).

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useId, useRef, useState } from "react";
import { getVisualizationColor } from "../../theme";

const CONJUNCTION = "∧"; // AND, between literals within a clause (T40's finding, see header)
const DISJUNCTION = "∨"; // OR, between clauses

// A bare CNF variable name: a letter, then letters/digits/underscores. Deliberately not
// restricted to the "x<number>" shape the observed contract examples ("x1", "!x2") use --
// SAT/SAT3's grammar is not known to require that specific naming, only that a literal is
// a variable name optionally prefixed with "!".
const VARIABLE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

function literalVariable(literalText) {
  return typeof literalText === "string" ? literalText.replace(/^!/, "") : literalText;
}

function isNegated(literalText) {
  return typeof literalText === "string" && literalText.startsWith("!");
}

// Ids only need to be unique within one edited frame (React keys, DOM ids) -- a
// module-level counter is enough, no persistence or cross-session uniqueness required.
let editIdCounter = 0;
function nextEditId(prefix) {
  editIdCounter += 1;
  return `${prefix}-${editIdCounter}`;
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

// The negate toggle and remove button share this compact icon-button style -- kept small
// enough to sit inline with the clause's literal text without dominating it.
function EditIconButton({ id, label, pressed, onClick, children }) {
  return (
    <IconButton
      id={id}
      size="small"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      sx={{ p: 0.375 }}
    >
      {children}
    </IconButton>
  );
}

function EditableLiteral({ idPrefix, clauseIndex, literalIndex, literal, canRemove, onEdit }) {
  const variable = literalVariable(literal.literal);
  const negated = isNegated(literal.literal);
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
      <LiteralMark id={`${idPrefix}-literal-${literal.id}`} literal={literal} />
      <EditIconButton
        id={`${idPrefix}-literal-${literal.id}-negate`}
        label={`${negated ? "Remove negation from" : "Negate"} ${variable} in clause ${clauseIndex + 1}`}
        pressed={negated}
        onClick={() =>
          onEdit((clauses) => {
            const next = clauses.map((clause) => ({ ...clause, literals: [...clause.literals] }));
            const target = next[clauseIndex].literals[literalIndex];
            next[clauseIndex].literals[literalIndex] = {
              ...target,
              literal: negated ? variable : `!${variable}`,
            };
            return next;
          })
        }
      >
        <Typography
          component="span"
          aria-hidden="true"
          sx={{ fontSize: "0.75rem", fontWeight: 700 }}
        >
          !
        </Typography>
      </EditIconButton>
      {canRemove && (
        <EditIconButton
          id={`${idPrefix}-literal-${literal.id}-remove`}
          label={`Remove ${literal.literal} from clause ${clauseIndex + 1}`}
          onClick={() =>
            onEdit((clauses) => {
              const next = clauses.map((clause) => ({
                ...clause,
                literals: [...clause.literals],
              }));
              next[clauseIndex].literals.splice(literalIndex, 1);
              return next;
            })
          }
        >
          <CloseIcon sx={{ fontSize: "0.875rem" }} />
        </EditIconButton>
      )}
    </Box>
  );
}

// Keyboard-reachable "add literal" affordance (§3 of INTERACTIVE_LAYER_DESIGN.md): a real
// text field plus a submit button, not a drag/right-click gesture. Disabled once the
// clause is at `maxLiteralsPerClause` (SAT3's 3-literal cap, enforced here rather than
// left for the backend to reject).
function AddLiteralForm({ idPrefix, clauseIndex, atCap, onEdit }) {
  const [value, setValue] = useState("");
  const fieldId = `${idPrefix}-clause-${clauseIndex}-add-literal`;
  const isValid = VARIABLE_NAME_PATTERN.test(value.trim());

  function handleSubmit(event) {
    event.preventDefault();
    if (!isValid || atCap) return;
    const variable = value.trim();
    onEdit((clauses) => {
      const next = clauses.map((clause) => ({ ...clause, literals: [...clause.literals] }));
      next[clauseIndex].literals.push({
        id: nextEditId("literal"),
        literal: variable,
        color: "",
      });
      return next;
    });
    setValue("");
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, ml: 0.5 }}
    >
      <Box component="label" htmlFor={fieldId} sx={{ display: "none" }}>
        Variable name to add to clause {clauseIndex + 1}
      </Box>
      <TextField
        id={fieldId}
        size="small"
        variant="standard"
        placeholder="x1"
        value={value}
        disabled={atCap}
        onChange={(event) => setValue(event.target.value)}
        sx={{ width: 56, "& input": { fontSize: "0.8125rem", py: 0.25 } }}
        inputProps={{ "aria-label": `Variable name to add to clause ${clauseIndex + 1}` }}
      />
      <IconButton
        id={`${fieldId}-submit`}
        type="submit"
        size="small"
        disabled={atCap || !isValid}
        aria-label={`Add literal to clause ${clauseIndex + 1}`}
        sx={{ p: 0.375 }}
      >
        <AddIcon sx={{ fontSize: "0.875rem" }} />
      </IconButton>
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
 * @param {boolean} [props.editable] T52 (#115): true only when this frame is the base
 *   frame (frames[0]) of a visualization the caller has decided is editable right now --
 *   this component does not re-derive that gate. Adds add/remove/negate-literal and
 *   add/remove-clause controls when true; renders exactly as before (T49) when false or
 *   omitted, so Reductions' still-static panes (§2.5, T53 not yet built) are unaffected.
 * @param {(updater: (clauses: Array) => Array) => void} [props.onClausesChange] Called
 *   with a `(currentClauses) => nextClauses` updater on every structural edit -- the
 *   caller owns whether "currentClauses" is the frame's own `clauses` or an already-
 *   edited copy from an earlier edit in the same session (INTERACTIVE_LAYER_DESIGN.md
 *   §2.1.2: edits preview locally; only Run round-trips through the backend). Required
 *   when `editable` is true.
 * @param {number} [props.maxLiteralsPerClause] SAT3's 3-literal-per-clause cap, enforced
 *   in this UI rather than left for the backend to reject. Omitted (no cap) for SAT.
 */
export default function BooleanSatisfiabilityRenderer({
  idPrefix,
  instanceName,
  frame,
  editable = false,
  onClausesChange,
  maxLiteralsPerClause,
}) {
  const reactId = useId().replace(/:/g, "");
  const scopeId = `${idPrefix}-${reactId}`;
  // Hovering or focusing one literal highlights every literal for the same variable
  // (ignoring negation) across the whole formula -- the hover-triggered highlight §4.2
  // requires stay keyboard-reachable, via the identical onFocus/onBlur pair LiteralMark
  // already wires to the same mouse handlers. Suppressed in edit mode: EditableLiteral
  // renders its own negate/remove controls in the same slot instead of a hover target.
  const [hoveredVariable, setHoveredVariable] = useState(null);
  const addClauseFieldRef = useRef(null);
  const [newClauseValue, setNewClauseValue] = useState("");

  const clauses = frame.clauses;
  const clauseCount = clauses.length;
  const summaryBody = `boolean formula with ${clauseCount} clause${clauseCount === 1 ? "" : "s"}`;
  const summary = instanceName ? `${instanceName}: ${summaryBody}` : summaryBody;
  const isNewClauseValid = VARIABLE_NAME_PATTERN.test(newClauseValue.trim());

  function handleAddClause(event) {
    event.preventDefault();
    if (!isNewClauseValid) return;
    const variable = newClauseValue.trim();
    onClausesChange?.((current) => [
      ...current,
      {
        id: nextEditId("clause"),
        literals: [{ id: nextEditId("literal"), literal: variable, color: "" }],
      },
    ]);
    setNewClauseValue("");
    addClauseFieldRef.current?.focus();
  }

  return (
    <Box
      id={scopeId}
      role="img"
      aria-label={summary}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        p: 2,
        minHeight: "100%",
        boxSizing: "border-box",
      }}
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
        {clauseCount === 0 ? (
          <Box component="span" sx={{ color: "text.secondary", fontStyle: "italic" }}>
            No clauses.
          </Box>
        ) : (
          clauses.map((clause, clauseIndex) => {
            const atCap =
              typeof maxLiteralsPerClause === "number" &&
              clause.literals.length >= maxLiteralsPerClause;
            return (
              <Box
                key={clause.id}
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
              >
                {clauseIndex > 0 && (
                  <Box
                    component="span"
                    aria-hidden="true"
                    sx={{ color: "text.secondary", mx: 0.5 }}
                  >
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
                      {editable ? (
                        <EditableLiteral
                          idPrefix={scopeId}
                          clauseIndex={clauseIndex}
                          literalIndex={literalIndex}
                          literal={literal}
                          canRemove={clause.literals.length > 1}
                          onEdit={onClausesChange}
                        />
                      ) : (
                        <LiteralMark
                          id={`${scopeId}-literal-${literal.id}`}
                          literal={literal}
                          highlighted={hoveredVariable != null && variable === hoveredVariable}
                          onEnter={() => setHoveredVariable(variable)}
                          onLeave={() =>
                            setHoveredVariable((current) => (current === variable ? null : current))
                          }
                        />
                      )}
                    </Box>
                  );
                })}
                <Box component="span" sx={{ color: "text.secondary" }}>
                  )
                </Box>
                {editable && (
                  <>
                    <AddLiteralForm
                      idPrefix={scopeId}
                      clauseIndex={clauseIndex}
                      atCap={atCap}
                      onEdit={onClausesChange}
                    />
                    <EditIconButton
                      id={`${scopeId}-clause-${clause.id}-remove`}
                      label={`Remove clause ${clauseIndex + 1}`}
                      onClick={() =>
                        onClausesChange?.((current) =>
                          current.filter((_candidate, index) => index !== clauseIndex),
                        )
                      }
                    >
                      <CloseIcon sx={{ fontSize: "0.875rem" }} />
                    </EditIconButton>
                  </>
                )}
              </Box>
            );
          })
        )}
      </Box>

      {editable && (
        <Box
          component="form"
          onSubmit={handleAddClause}
          sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
        >
          <Box component="label" htmlFor={`${scopeId}-add-clause`} sx={{ display: "none" }}>
            First variable for the new clause
          </Box>
          <TextField
            id={`${scopeId}-add-clause`}
            inputRef={addClauseFieldRef}
            size="small"
            variant="outlined"
            placeholder="x1"
            value={newClauseValue}
            onChange={(event) => setNewClauseValue(event.target.value)}
            sx={{ width: 88, "& input": { fontSize: "0.8125rem", py: 0.5 } }}
            inputProps={{ "aria-label": "First variable for the new clause" }}
          />
          <Button
            id={`${scopeId}-add-clause-submit`}
            type="submit"
            size="small"
            variant="outlined"
            disabled={!isNewClauseValid}
            startIcon={<AddIcon sx={{ fontSize: "1rem" }} />}
          >
            Add clause
          </Button>
          {typeof maxLiteralsPerClause === "number" && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Up to {maxLiteralsPerClause} literals per clause.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
