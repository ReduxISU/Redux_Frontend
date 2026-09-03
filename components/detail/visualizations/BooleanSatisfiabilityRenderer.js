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
// makes collision-proof between two mounted instances (Reductions' side-by-side panes).
//
// Literal text (`"x1"`, `"!x2"`) is rendered exactly as the backend sends it -- no
// substituting `!` for a proper negation glyph -- the same "display exactly what the
// backend returned" call §3.5 already made for stepTable's cell text, extended here on
// the same reasoning: this is the backend's own data, not this project's UI copy.
//
// T55 (#128): editing is right-click context menus (negate/remove a literal; add a
// literal/remove a clause; add a clause), plus drag-to-reorder for both clauses and
// literals within a clause -- replacing T52's inline icon-button controls. Reordering
// never changes what the formula means ("∧"/"∨" are both commutative), and
// `serializeBooleanSatisfiabilityInstance` already serializes whatever order the
// `clauses`/`literals` arrays hold, so this carries none of `graph`'s round-trip
// correctness risk.
//
// Unlike `graph` (T54), this keeps a keyboard-reachable path: dragging is built on
// `@dnd-kit` (already a project dependency; `KeyboardSensor` with
// `sortableKeyboardCoordinates` is T18/#27's existing precedent in
// ProblemDetailLayout.js) rather than hand-rolled pointer math, because both reorders
// here are snap-to-slot -- a clause or literal moves to one of a fixed set of positions
// -- exactly what `@dnd-kit`'s sortable preset is built for, unlike `graph`'s freeform
// curve-dragging, which had no cheap keyboard equivalent. Full decision record:
// ai_documentation/INTERACTIVE_LAYER_DESIGN.md §3.2.
//
// One shared `DndContext` covers both reorder levels rather than nesting a `DndContext`
// per clause -- nesting `DndContext`s is a known-fragile dnd-kit pattern (both would try
// to claim the same pointer/keyboard events). Sibling `SortableContext`s (one for the
// clause list, one per clause for its own literals) coexist fine under one `DndContext`;
// `handleDragEnd` below tells a clause-reorder from a literal-reorder via each draggable
// item's own `data.current.type`, and a literal drop is ignored outright if it lands on a
// different clause than it started in (literals never move between clauses this way).

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { getVisualizationColor } from "../../theme";
import { FloatingMenu, useCloseFloatingMenu } from "./floatingMenu";

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

// Human-readable name for a dnd-kit drag/drop announcement -- a literal's own text, or
// "clause N" (clauses have no shorter display name of their own).
function describeDragItem(id, type, clauses) {
  if (type === "clause") {
    const index = clauses.findIndex((clause) => clause.id === id);
    return index === -1 ? "a clause" : `clause ${index + 1}`;
  }
  for (const clause of clauses) {
    const literal = clause.literals.find((candidate) => candidate.id === id);
    if (literal) return literal.literal;
  }
  return "an item";
}

function LiteralMark({
  id,
  literal,
  highlighted,
  onEnter,
  onLeave,
  onContextMenu,
  dragRef,
  dragStyle,
  dragAttributes,
  dragListeners,
}) {
  const color = getVisualizationColor(literal.color);
  return (
    <Box
      id={id}
      ref={dragRef}
      component="span"
      tabIndex={0}
      aria-label={literal.literal}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onContextMenu={onContextMenu}
      style={dragStyle}
      {...(dragAttributes ?? {})}
      {...(dragListeners ?? {})}
      sx={{
        display: "inline-block",
        fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
        fontSize: "0.9375rem",
        color,
        fontWeight: highlighted ? 700 : 500,
        textDecoration: highlighted ? "underline" : "none",
        borderRadius: 0.5,
        px: 0.25,
        cursor: dragListeners ? "grab" : "default",
      }}
    >
      {literal.literal}
    </Box>
  );
}

// One sortable literal -- calls `useSortable` itself (only ever mounted inside the
// editable tree's DndContext) and hands the resulting drag wiring down to the shared
// LiteralMark presentational component.
function SortableLiteral({
  literal,
  literalIndex,
  clauseIndex,
  clauseId,
  hoveredVariable,
  setHoveredVariable,
  openMenu,
  idPrefix,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: literal.id,
    data: { type: "literal", clauseId },
  });
  const variable = literalVariable(literal.literal);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <LiteralMark
      id={`${idPrefix}-literal-${literal.id}`}
      literal={literal}
      highlighted={hoveredVariable != null && variable === hoveredVariable}
      onEnter={() => setHoveredVariable(variable)}
      onLeave={() => setHoveredVariable((current) => (current === variable ? null : current))}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        openMenu({
          kind: "literal",
          clauseIndex,
          literalIndex,
          x: event.clientX,
          y: event.clientY,
        });
      }}
      dragRef={setNodeRef}
      dragStyle={style}
      dragAttributes={attributes}
      dragListeners={listeners}
    />
  );
}

// One sortable clause: a drag grip (its own handle, distinct from each literal's own drag
// handle so the two never fight over the same pointer/keyboard events), its own nested
// SortableContext for literal reorder, and a right-click target scoped to the clause's own
// background (literals stop propagation on their own context-menu clicks, so this only
// fires for a click that wasn't on a literal).
function SortableClause({
  clause,
  clauseIndex,
  hoveredVariable,
  setHoveredVariable,
  openMenu,
  idPrefix,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: clause.id,
    data: { type: "clause" },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      component="span"
      style={style}
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        openMenu({ kind: "clause", clauseIndex, x: event.clientX, y: event.clientY });
      }}
    >
      <Box
        component="span"
        {...attributes}
        {...listeners}
        aria-label={`Reorder clause ${clauseIndex + 1}`}
        sx={{ display: "inline-flex", cursor: "grab", color: "text.secondary", mr: 0.25 }}
      >
        <DragIndicatorIcon sx={{ fontSize: "0.9375rem" }} />
      </Box>
      <Box component="span" sx={{ color: "text.secondary" }}>
        (
      </Box>
      <SortableContext
        items={clause.literals.map((literal) => literal.id)}
        strategy={rectSortingStrategy}
      >
        {clause.literals.map((literal, literalIndex) => (
          <Box
            key={literal.id}
            component="span"
            sx={{ display: "inline-flex", alignItems: "center" }}
          >
            {literalIndex > 0 && (
              <Box component="span" aria-hidden="true" sx={{ color: "text.secondary", mx: 0.5 }}>
                {CONJUNCTION}
              </Box>
            )}
            <SortableLiteral
              literal={literal}
              literalIndex={literalIndex}
              clauseIndex={clauseIndex}
              clauseId={clause.id}
              hoveredVariable={hoveredVariable}
              setHoveredVariable={setHoveredVariable}
              openMenu={openMenu}
              idPrefix={idPrefix}
            />
          </Box>
        ))}
      </SortableContext>
      <Box component="span" sx={{ color: "text.secondary" }}>
        )
      </Box>
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
 * @param {boolean} [props.editable] T55 (#128): true only when this frame is the base
 *   frame (frames[0]) of a visualization the caller has decided is editable right now --
 *   this component does not re-derive that gate. Renders exactly as before (T49) when
 *   false or omitted.
 * @param {(updater: (clauses: Array) => Array) => void} [props.onClausesChange] Called
 *   with a `(currentClauses) => nextClauses` updater on every structural edit or reorder
 *   -- the caller owns whether "currentClauses" is the frame's own `clauses` or an
 *   already-edited copy from an earlier edit in the same session
 *   (INTERACTIVE_LAYER_DESIGN.md §2.1.2). Required when `editable` is true.
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
  const [hoveredVariable, setHoveredVariable] = useState(null);
  const [menu, setMenu] = useState(null);
  const [menuValue, setMenuValue] = useState("");
  const [menuError, setMenuError] = useState("");
  const menuRef = useRef(null);

  const clauses = frame.clauses;
  const clauseCount = clauses.length;
  const summaryBody = `boolean formula with ${clauseCount} clause${clauseCount === 1 ? "" : "s"}`;
  const summary = instanceName ? `${instanceName}: ${summaryBody}` : summaryBody;

  const closeMenu = useCallback(() => {
    setMenu(null);
    setMenuValue("");
    setMenuError("");
  }, []);
  useCloseFloatingMenu(menuRef, menu !== null, closeMenu);

  function openMenu(next) {
    setMenu(next);
    setMenuValue("");
    setMenuError("");
  }

  // PointerSensor covers mouse, TouchSensor adds mobile/tablet support, KeyboardSensor
  // (arrow keys to move, space to pick up/drop, escape to cancel) is what keeps this
  // reachable without a mouse -- exactly T18's ProblemDetailLayout.js sensor set.
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Overrides @dnd-kit's generic "sortable item was moved" announcements with text naming
  // the actual literal or clause -- T18's SECTION_ANNOUNCEMENTS pattern. Needs live
  // `clauses` (unlike T18's static section titles), so this is a memo, not module scope.
  const announcements = useMemo(
    () => ({
      onDragStart({ active }) {
        const type = active.data.current?.type;
        const name = describeDragItem(active.id, type, clauses);
        return type === "clause"
          ? `Picked up ${name}. Use the arrow keys to move it, space bar to drop, escape to cancel.`
          : `Picked up literal ${name}. Use the arrow keys to move it within its clause, space bar to drop, escape to cancel.`;
      },
      onDragOver({ active, over }) {
        if (!over || active.id === over.id) return "";
        const type = active.data.current?.type;
        return `${describeDragItem(active.id, type, clauses)} was moved next to ${describeDragItem(over.id, type, clauses)}.`;
      },
      onDragEnd({ active, over }) {
        const type = active.data.current?.type;
        const activeName = describeDragItem(active.id, type, clauses);
        return over
          ? `${activeName} was dropped next to ${describeDragItem(over.id, type, clauses)}.`
          : `${activeName} was dropped.`;
      },
      onDragCancel({ active }) {
        const type = active.data.current?.type;
        return `Moving ${describeDragItem(active.id, type, clauses)} was cancelled.`;
      },
    }),
    [clauses],
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const activeType = active.data.current?.type;
      const overType = over.data.current?.type;

      if (activeType === "clause" && overType === "clause") {
        onClausesChange?.((current) => {
          const oldIndex = current.findIndex((clause) => clause.id === active.id);
          const newIndex = current.findIndex((clause) => clause.id === over.id);
          if (oldIndex === -1 || newIndex === -1) return current;
          return arrayMove(current, oldIndex, newIndex);
        });
      } else if (activeType === "literal" && overType === "literal") {
        // Literals only ever reorder within their own clause -- a drop over a literal
        // belonging to a different clause is silently ignored, not moved.
        const clauseId = active.data.current.clauseId;
        if (over.data.current?.clauseId !== clauseId) return;
        onClausesChange?.((current) => {
          const clauseIndex = current.findIndex((clause) => clause.id === clauseId);
          if (clauseIndex === -1) return current;
          const literals = current[clauseIndex].literals;
          const oldIndex = literals.findIndex((literal) => literal.id === active.id);
          const newIndex = literals.findIndex((literal) => literal.id === over.id);
          if (oldIndex === -1 || newIndex === -1) return current;
          const next = [...current];
          next[clauseIndex] = {
            ...next[clauseIndex],
            literals: arrayMove(literals, oldIndex, newIndex),
          };
          return next;
        });
      }
    },
    [onClausesChange],
  );

  function submitToggleNegate() {
    if (menu?.kind !== "literal") return;
    onClausesChange?.((current) => {
      const next = current.map((clause) => ({ ...clause, literals: [...clause.literals] }));
      const target = next[menu.clauseIndex]?.literals[menu.literalIndex];
      if (!target) return current;
      const variable = literalVariable(target.literal);
      next[menu.clauseIndex].literals[menu.literalIndex] = {
        ...target,
        literal: isNegated(target.literal) ? variable : `!${variable}`,
      };
      return next;
    });
    closeMenu();
  }

  function submitRemoveLiteral() {
    if (menu?.kind !== "literal") return;
    onClausesChange?.((current) => {
      const next = current.map((clause) => ({ ...clause, literals: [...clause.literals] }));
      if (!next[menu.clauseIndex] || next[menu.clauseIndex].literals.length <= 1) return current;
      next[menu.clauseIndex].literals.splice(menu.literalIndex, 1);
      return next;
    });
    closeMenu();
  }

  function submitAddLiteralToClause() {
    if (menu?.kind !== "clause") return;
    const trimmed = menuValue.trim();
    if (!VARIABLE_NAME_PATTERN.test(trimmed)) {
      setMenuError("Enter a variable name, e.g. x1");
      return;
    }
    const clause = clauses[menu.clauseIndex];
    if (
      clause &&
      typeof maxLiteralsPerClause === "number" &&
      clause.literals.length >= maxLiteralsPerClause
    ) {
      setMenuError(`Up to ${maxLiteralsPerClause} literals per clause`);
      return;
    }
    onClausesChange?.((current) => {
      const next = current.map((candidate) => ({
        ...candidate,
        literals: [...candidate.literals],
      }));
      if (!next[menu.clauseIndex]) return current;
      next[menu.clauseIndex].literals.push({
        id: nextEditId("literal"),
        literal: trimmed,
        color: "",
      });
      return next;
    });
    closeMenu();
  }

  function submitRemoveClause() {
    if (menu?.kind !== "clause") return;
    onClausesChange?.((current) =>
      current.filter((_candidate, index) => index !== menu.clauseIndex),
    );
    closeMenu();
  }

  function submitCreateClause() {
    if (menu?.kind !== "createClause") return;
    const trimmed = menuValue.trim();
    if (!VARIABLE_NAME_PATTERN.test(trimmed)) {
      setMenuError("Enter a variable name, e.g. x1");
      return;
    }
    onClausesChange?.((current) => [
      ...current,
      {
        id: nextEditId("clause"),
        literals: [{ id: nextEditId("literal"), literal: trimmed, color: "" }],
      },
    ]);
    closeMenu();
  }

  if (!editable) {
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{ announcements }}
      >
        <SortableContext items={clauses.map((clause) => clause.id)} strategy={rectSortingStrategy}>
          <Box
            id={scopeId}
            role="img"
            aria-label={summary}
            onContextMenu={(event) => {
              event.preventDefault();
              openMenu({ kind: "createClause", x: event.clientX, y: event.clientY });
            }}
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 1,
              p: 2,
              minHeight: 120,
              boxSizing: "border-box",
            }}
          >
            {clauseCount === 0 ? (
              <Box component="span" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                No clauses. Right-click to add one.
              </Box>
            ) : (
              clauses.map((clause, clauseIndex) => (
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
                  <SortableClause
                    clause={clause}
                    clauseIndex={clauseIndex}
                    hoveredVariable={hoveredVariable}
                    setHoveredVariable={setHoveredVariable}
                    openMenu={openMenu}
                    idPrefix={scopeId}
                  />
                </Box>
              ))
            )}
          </Box>
        </SortableContext>
      </DndContext>

      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
        Drag the grip to reorder clauses, or drag a literal to reorder it within its clause.
        Right-click a literal, a clause, or empty space to add, negate, or remove.
      </Typography>

      {menu?.kind === "literal" &&
        (() => {
          const clause = clauses[menu.clauseIndex];
          const literal = clause?.literals[menu.literalIndex];
          if (!literal) return null;
          const canRemove = clause.literals.length > 1;
          const negated = isNegated(literal.literal);
          return (
            <FloatingMenu menuRef={menuRef} x={menu.x} y={menu.y}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
                {literal.literal}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" variant="outlined" onClick={submitToggleNegate}>
                  {negated ? "Remove negation" : "Negate"}
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  disabled={!canRemove}
                  onClick={submitRemoveLiteral}
                >
                  Remove
                </Button>
              </Box>
            </FloatingMenu>
          );
        })()}

      {menu?.kind === "clause" &&
        (() => {
          const clause = clauses[menu.clauseIndex];
          if (!clause) return null;
          const atCap =
            typeof maxLiteralsPerClause === "number" &&
            clause.literals.length >= maxLiteralsPerClause;
          return (
            <FloatingMenu menuRef={menuRef} x={menu.x} y={menu.y}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
                Clause {menu.clauseIndex + 1}
              </Typography>
              <TextField
                id={`${scopeId}-add-literal`}
                size="small"
                autoFocus
                label="Add variable"
                placeholder="x1"
                value={menuValue}
                disabled={atCap}
                onChange={(event) => setMenuValue(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && submitAddLiteralToClause()}
              />
              {atCap && (
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Up to {maxLiteralsPerClause} literals per clause.
                </Typography>
              )}
              {menuError && (
                <Typography variant="caption" color="error">
                  {menuError}
                </Typography>
              )}
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  disabled={atCap}
                  onClick={submitAddLiteralToClause}
                >
                  Add literal
                </Button>
                <Button size="small" color="error" variant="outlined" onClick={submitRemoveClause}>
                  Remove clause
                </Button>
                <Button size="small" onClick={closeMenu}>
                  Cancel
                </Button>
              </Box>
            </FloatingMenu>
          );
        })()}

      {menu?.kind === "createClause" && (
        <FloatingMenu menuRef={menuRef} x={menu.x} y={menu.y}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
            New clause
          </Typography>
          <TextField
            id={`${scopeId}-add-clause`}
            size="small"
            autoFocus
            label="First variable"
            placeholder="x1"
            value={menuValue}
            onChange={(event) => setMenuValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submitCreateClause()}
          />
          {menuError && (
            <Typography variant="caption" color="error">
              {menuError}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" variant="contained" onClick={submitCreateClause}>
              Add clause
            </Button>
            <Button size="small" onClick={closeMenu}>
              Cancel
            </Button>
          </Box>
        </FloatingMenu>
      )}
    </Box>
  );
}
