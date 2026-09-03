// components/detail/visualizations/QuantumCircuitRenderer.js
//
// T50 (#113) -- the `quantumCircuit` universal type's renderer
// (ai_documentation/VISUALIZATION_TYPE_CONTRACTS.md §3.2), covering the 3
// D3-arm instances (Bernstein-Vazirani, Deutsch, Deutsch-Jozsa) this
// contract's v1 can render. Ported from Redux_GUI's StandardCircuitSvgReact,
// generalized rather than special-cased per gate-type string ("h", "cx",
// "m", ...): the contract names no fixed gate-type vocabulary, so this
// renderer treats every gate the same way structurally -- a labeled box on
// its last target wire, a connecting line plus dots on any other targets,
// and an optional dashed link down to the classical bus for a gate that also
// carries `classical` targets (the shape a measurement gate uses).
//
// No `d3.selectAll`/`d3.select` against `document` or a hardcoded id (§4.1):
// layout is a pure data computation (`buildLayout`), everything on screen is
// plain React-owned SVG.
//
// Solution/oracle/iteration metadata (the panel StandardCircuitSvgReact drew
// below the diagram) is out of scope here -- §3.2's contract covers `d3`'s
// wires/gates/overlays, not `metadata`'s free-form contents, and T50's own
// scope is rendering the frame, not a metadata inspector.
//
// --- T56 (#129): direct-manipulation editing, replacing T51's side-panel form ---------
// Editing is now on the diagram itself: drag a gate's box or one of its connector dots
// onto a grid cell to retime/retarget it (see components/detail/visualizations/
// quantumCircuitGrid.js for the "reuse an existing time column, or insert one and shift
// everything after it" math -- decided as a global shift across every wire, not just the
// one dropped on, on issue #125's thread); right-click a qubit label to rename/remove it,
// empty grid space to add a gate there, or a gate to relabel/delete it.
//
// Built on `@dnd-kit`'s raw `useDraggable`/`useDroppable` (not its sortable preset) --
// unlike `booleanSatisfiability`'s flat/nested lists (T55), this is a genuine 2D grid where
// one gate can occupy multiple rows at once (a multi-qubit gate's box and dots), which the
// sortable preset's "each item belongs to exactly one container" model doesn't fit. Keeps
// keyboard access anyway: `@dnd-kit/core`'s `KeyboardSensor` works with raw draggable/
// droppable directly (arrow keys nudge the drag by a fixed step, not "jump to next list
// item" -- that's the sortable preset's `sortableKeyboardCoordinates`, not used here since
// there's no sortable list). Full decision record: ai_documentation/
// INTERACTIVE_LAYER_DESIGN.md §3.2.
//
// --- The diagram-to-text serializer still does not exist ------------------------------
// Unchanged from T51: T46 (#109) verified SPADE round-tripping against a set-of-nodes-plus-
// edges grammar and an automaton grammar, neither of which is a gate-sequence grammar, and
// nothing this project has checked says whether a quantum-circuit instance's text encodes
// gates by literal type tokens, by position, or some other shape entirely. Writing a
// serializer against an unverified guess risks producing instance text that looks
// plausible and silently means something else. VisualizationsSection.js declines to
// serialize a pending `quantumCircuit` edit and says why, rather than guessing.

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { getVisualizationColor } from "../../theme";
import { FloatingMenu, useCloseFloatingMenu } from "./floatingMenu";
import { addGateAtCell, moveGateToCell } from "./quantumCircuitGrid";

const GATE_WIDTH = 44;
const GATE_HEIGHT = 26;
const ROW_SPACING = 60;
const COLUMN_SPACING = 80;
const MARGIN = { top: 24, right: 40, bottom: 24, left: 60 };
const CLASSICAL_GAP = 40;
const LABEL_COLOR = "#F5F1EA";
const WIRE_COLOR = getVisualizationColor("");
const GATE_FILL = getVisualizationColor("ElementHighlight");
const OVERLAY_COLOR = getVisualizationColor("ClauseHighlight");

// Assigns one x column per distinct `time` value across every gate and
// overlay boundary, and one y row per qubit (plus one shared classical bus
// row, the same "one bus line with per-measurement tick marks" the ported
// original used rather than one row per classical bit).
function buildLayout(d3) {
  const qubits = d3.qubits;
  const classical = d3.classical ?? [];
  const gates = d3.gates ?? [];
  const overlays = d3.overlays ?? [];

  const times = new Set();
  gates.forEach((gate) => times.add(gate.time));
  overlays.forEach((overlay) => {
    times.add(overlay.timeStart);
    times.add(overlay.timeEnd);
  });
  const sortedTimes = Array.from(times).sort((a, b) => a - b);
  const columnIndex = new Map(sortedTimes.map((time, index) => [time, index]));
  const xForColumnIndex = (index) => MARGIN.left + index * COLUMN_SPACING;
  const xForTime = (time) => xForColumnIndex(columnIndex.get(time) ?? 0);

  const qubitRowY = new Map(qubits.map((id, index) => [id, MARGIN.top + index * ROW_SPACING]));
  const lastQubitY =
    qubits.length > 0 ? MARGIN.top + (qubits.length - 1) * ROW_SPACING : MARGIN.top;
  const classicalRowY = classical.length > 0 ? lastQubitY + CLASSICAL_GAP : null;

  // One extra column's worth of width so the trailing "append a new step" drop zone
  // (T56/#129) has room past the last real column.
  const maxColumn = Math.max(sortedTimes.length, 1);
  const width = MARGIN.left + MARGIN.right + maxColumn * COLUMN_SPACING + GATE_WIDTH;
  const height = (classicalRowY ?? lastQubitY) + MARGIN.bottom + ROW_SPACING;

  return {
    qubits,
    classical,
    gates,
    overlays,
    sortedTimes,
    xForTime,
    xForColumnIndex,
    qubitRowY,
    lastQubitY,
    classicalRowY,
    width,
    height,
  };
}

// Read-only rendering -- unchanged from T50/T51. Only used on the non-editable path;
// EditableGateMark (below) is the editable path's own version, since it needs to know
// *which* `gate.targets` array index each handle represents (for drag-to-retarget),
// something this simpler version was never handed.
function GateMark({ idPrefix, gate, x, targetYs, classicalY, highlighted, onEnter, onLeave }) {
  if (targetYs.length === 0) return null;

  const label = gate.label ?? gate.type ?? "?";
  const sortedYs = [...targetYs].sort((a, b) => a - b);
  const boxY = sortedYs[sortedYs.length - 1];
  const dotYs = sortedYs.slice(0, -1);
  const hasClassicalLink =
    classicalY != null && Array.isArray(gate.classical) && gate.classical.length > 0;
  const stroke = highlighted ? GATE_FILL : WIRE_COLOR;

  return (
    <g
      id={`${idPrefix}-gate-${gate.id}`}
      tabIndex={0}
      role="img"
      aria-label={`${label} on ${gate.targets.join(", ")}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      style={{ cursor: "default" }}
    >
      {sortedYs.length > 1 && (
        <line
          x1={x}
          x2={x}
          y1={sortedYs[0]}
          y2={sortedYs[sortedYs.length - 1]}
          stroke={stroke}
          strokeWidth={highlighted ? 2.5 : 1.5}
        />
      )}
      {dotYs.map((y) => (
        <circle key={y} cx={x} cy={y} r={5} fill={stroke} />
      ))}
      {hasClassicalLink && (
        <>
          <line
            x1={x}
            x2={x}
            y1={boxY}
            y2={classicalY}
            stroke={WIRE_COLOR}
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
          <circle cx={x} cy={classicalY} r={4} fill={WIRE_COLOR} />
        </>
      )}
      <rect
        x={x - GATE_WIDTH / 2}
        y={boxY - GATE_HEIGHT / 2}
        width={GATE_WIDTH}
        height={GATE_HEIGHT}
        rx={5}
        ry={5}
        fill={GATE_FILL}
        stroke={highlighted ? "#FFFFFF" : WIRE_COLOR}
        strokeWidth={highlighted ? 2 : 1.5}
      />
      <text
        x={x}
        y={boxY + 4}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill={LABEL_COLOR}
        style={{ pointerEvents: "none" }}
      >
        {String(label).toUpperCase()}
      </text>
    </g>
  );
}

function OverlayBand({ idPrefix, overlay, overlayIndex, x0, x1, yMin, yMax }) {
  const top = yMin - GATE_HEIGHT - 10;
  const bottom = yMax + GATE_HEIGHT / 2 + 6;
  return (
    <g id={`${idPrefix}-overlay-${overlay.id || overlayIndex}`}>
      <rect
        x={x0}
        y={top}
        width={Math.max(x1 - x0, 1)}
        height={bottom - top}
        rx={10}
        ry={10}
        fill={OVERLAY_COLOR}
        fillOpacity={0.14}
        stroke={OVERLAY_COLOR}
        strokeDasharray="4 3"
        strokeWidth={1.5}
      />
      <text
        x={(x0 + x1) / 2}
        y={top + 14}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill={OVERLAY_COLOR}
      >
        {overlay.label || overlay.type}
      </text>
    </g>
  );
}

// One drag handle: a gate's box (its last/highest-sorted target -- the wire it "acts on")
// or one of its connector dots (an earlier target -- a wire it "depends on"). Each is its
// own `useDraggable` so the two kinds of handle never fight over the same pointer/keyboard
// events, and so dropping one only ever changes the one `gate.targets` position it
// represents (`data.targetIndex`) plus the whole gate's shared `time` (§ file header).
function DraggableHandle({
  gateId,
  targetIndex,
  cx,
  cy,
  isBox,
  label,
  highlighted,
  stroke,
  onContextMenu,
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${gateId}::${targetIndex}`,
    data: { type: "gateHandle", gateId, targetIndex },
  });
  const dragStyle = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.4 : 1,
    cursor: "grab",
  };

  if (isBox) {
    return (
      <g
        ref={setNodeRef}
        style={dragStyle}
        {...attributes}
        {...listeners}
        onContextMenu={onContextMenu}
      >
        <rect
          x={cx - GATE_WIDTH / 2}
          y={cy - GATE_HEIGHT / 2}
          width={GATE_WIDTH}
          height={GATE_HEIGHT}
          rx={5}
          ry={5}
          fill={GATE_FILL}
          stroke={highlighted ? "#FFFFFF" : stroke}
          strokeWidth={highlighted ? 2 : 1.5}
        />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill={LABEL_COLOR}
          style={{ pointerEvents: "none" }}
        >
          {String(label).toUpperCase()}
        </text>
      </g>
    );
  }

  return (
    <circle
      ref={setNodeRef}
      style={dragStyle}
      {...attributes}
      {...listeners}
      onContextMenu={onContextMenu}
      cx={cx}
      cy={cy}
      r={5}
      fill={stroke}
    />
  );
}

// Editable path's gate renderer -- unlike the read-only GateMark, this is handed the raw
// `gate.targets` array (not pre-stripped Y positions) so each handle can carry its own
// array index for drag-to-retarget.
function EditableGateMark({
  gate,
  x,
  qubitRowY,
  classicalY,
  highlighted,
  onEnter,
  onLeave,
  onGateContextMenu,
}) {
  const entries = gate.targets
    .map((targetId, index) => ({ index, y: qubitRowY.get(targetId) }))
    .filter((entry) => entry.y != null);
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => a.y - b.y);
  const boxEntry = sorted[sorted.length - 1];
  const dotEntries = sorted.slice(0, -1);
  const label = gate.label ?? gate.type ?? "?";
  const hasClassicalLink =
    classicalY != null && Array.isArray(gate.classical) && gate.classical.length > 0;
  const stroke = highlighted ? GATE_FILL : WIRE_COLOR;

  function handleContextMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    onGateContextMenu(gate, event);
  }

  return (
    <g onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {sorted.length > 1 && (
        <line
          x1={x}
          x2={x}
          y1={sorted[0].y}
          y2={boxEntry.y}
          stroke={stroke}
          strokeWidth={highlighted ? 2.5 : 1.5}
          style={{ pointerEvents: "none" }}
        />
      )}
      {hasClassicalLink && (
        <g style={{ pointerEvents: "none" }}>
          <line
            x1={x}
            x2={x}
            y1={boxEntry.y}
            y2={classicalY}
            stroke={WIRE_COLOR}
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
          <circle cx={x} cy={classicalY} r={4} fill={WIRE_COLOR} />
        </g>
      )}
      {dotEntries.map((entry) => (
        <DraggableHandle
          key={entry.index}
          gateId={gate.id}
          targetIndex={entry.index}
          cx={x}
          cy={entry.y}
          isBox={false}
          stroke={stroke}
          onContextMenu={handleContextMenu}
        />
      ))}
      <DraggableHandle
        gateId={gate.id}
        targetIndex={boxEntry.index}
        cx={x}
        cy={boxEntry.y}
        isBox
        label={label}
        highlighted={highlighted}
        stroke={stroke}
        onContextMenu={handleContextMenu}
      />
    </g>
  );
}

// One droppable grid cell -- a (wire, column) position a dragged handle can land on.
// `columnIndex === sortedTimes.length` is the trailing "append a new step" zone past the
// last existing column.
function GridCell({ wireId, columnIndex, x, y, onContextMenu }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell::${wireId}::${columnIndex}`,
    data: { type: "gridCell", wireId, columnIndex },
  });
  return (
    <rect
      ref={setNodeRef}
      x={x - COLUMN_SPACING / 2}
      y={y - ROW_SPACING / 2}
      width={COLUMN_SPACING}
      height={ROW_SPACING}
      fill={isOver ? "rgba(255,255,255,0.08)" : "transparent"}
      stroke={isOver ? WIRE_COLOR : "none"}
      strokeDasharray="3 2"
      onContextMenu={onContextMenu}
    />
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id this component renders,
 *   so two mounted instances (Reductions' side-by-side panes) never collide
 *   (§4.1).
 * @param {string} [props.instanceName] Human-readable visualization name,
 *   folded into the accessible summary when given.
 * @param {{d3: Object}} props.frame One already-validated `quantumCircuit`
 *   frame (the `d3` arm -- resolveVisualizationType only reaches this
 *   renderer when `format === 1` and `d3` is present, per §3.2).
 * @param {boolean} [props.editable] T56 (#129): true only when this frame is
 *   the base frame of a visualization the caller has decided is editable
 *   right now. See this file's header for why edits here preview locally
 *   but are never sent to Run.
 * @param {(op: Object) => void} [props.onCircuitEdit] Called with one edit
 *   descriptor per structural edit -- `{type: "addQubit", id}`,
 *   `{type: "removeQubit", id}`, `{type: "renameQubit", from, to}`,
 *   `{type: "relabelGate", id, gateType}`, `{type: "removeGate", id}`, or
 *   `{type: "replaceGates", gates}` (a drag-to-retime/retarget or an "add
 *   gate at this cell", both computed via
 *   components/detail/visualizations/quantumCircuitGrid.js). Required when
 *   `editable` is true.
 */
export default function QuantumCircuitRenderer({
  idPrefix,
  instanceName,
  frame,
  editable = false,
  onCircuitEdit,
}) {
  const reactId = useId().replace(/:/g, "");
  const scopeId = `${idPrefix}-${reactId}`;
  const [hoveredGateId, setHoveredGateId] = useState(null);
  const [menu, setMenu] = useState(null);
  const [menuValue, setMenuValue] = useState("");
  const [menuError, setMenuError] = useState("");
  const menuRef = useRef(null);

  const layout = useMemo(() => buildLayout(frame.d3), [frame]);
  const {
    qubits,
    classical,
    gates,
    overlays,
    sortedTimes,
    xForTime,
    xForColumnIndex,
    qubitRowY,
    lastQubitY,
    classicalRowY,
    width,
    height,
  } = layout;

  const summaryBody = `quantum circuit with ${qubits.length} qubit${qubits.length === 1 ? "" : "s"} and ${gates.length} gate${gates.length === 1 ? "" : "s"}`;
  const summary = instanceName ? `${instanceName}: ${summaryBody}` : summaryBody;

  const closeMenu = useCallback(() => {
    setMenu(null);
    setMenuValue("");
    setMenuError("");
  }, []);
  useCloseFloatingMenu(menuRef, menu !== null, closeMenu);

  // KeyboardSensor's default coordinate getter (no `coordinateGetter` override) nudges the
  // drag by a fixed step per arrow key -- the sortable preset's `sortableKeyboardCoordinates`
  // ("jump to the next list item") doesn't apply here since this isn't a SortableContext.
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over) return;
      const { gateId, targetIndex } = active.data.current ?? {};
      const { wireId, columnIndex } = over.data.current ?? {};
      if (!gateId || wireId == null || columnIndex == null) return;
      const nextGates = moveGateToCell(
        gates,
        gateId,
        targetIndex,
        wireId,
        columnIndex,
        sortedTimes,
      );
      onCircuitEdit?.({ type: "replaceGates", gates: nextGates });
    },
    [gates, sortedTimes, onCircuitEdit],
  );

  function openGateMenu(gate, event) {
    setMenu({ kind: "gate", gateId: gate.id, x: event.clientX, y: event.clientY });
    setMenuValue(gate.type ?? "");
    setMenuError("");
  }

  function openCellMenu(wireId, columnIndex, event) {
    event.preventDefault();
    setMenu({ kind: "cell", wireId, columnIndex, x: event.clientX, y: event.clientY });
    setMenuValue("");
    setMenuError("");
  }

  function openQubitMenu(wireId, event) {
    event.preventDefault();
    setMenu({ kind: "qubit", wireId, x: event.clientX, y: event.clientY });
    setMenuValue(wireId);
    setMenuError("");
  }

  function openAddQubitMenu(event) {
    event.preventDefault();
    setMenu({ kind: "addQubit", x: event.clientX, y: event.clientY });
    setMenuValue("");
    setMenuError("");
  }

  function submitRenameQubit() {
    if (menu?.kind !== "qubit") return;
    const trimmed = menuValue.trim();
    if (!trimmed) {
      setMenuError("Name is required");
      return;
    }
    if (trimmed !== menu.wireId && qubits.includes(trimmed)) {
      setMenuError("Name already used");
      return;
    }
    if (trimmed !== menu.wireId) {
      onCircuitEdit?.({ type: "renameQubit", from: menu.wireId, to: trimmed });
    }
    closeMenu();
  }

  function submitRemoveQubit() {
    if (menu?.kind !== "qubit") return;
    onCircuitEdit?.({ type: "removeQubit", id: menu.wireId });
    closeMenu();
  }

  function submitAddQubit() {
    if (menu?.kind !== "addQubit") return;
    const trimmed = menuValue.trim();
    if (!trimmed) {
      setMenuError("Name is required");
      return;
    }
    if (qubits.includes(trimmed)) {
      setMenuError("Name already used");
      return;
    }
    onCircuitEdit?.({ type: "addQubit", id: trimmed });
    closeMenu();
  }

  function submitRelabelGate() {
    if (menu?.kind !== "gate") return;
    const trimmed = menuValue.trim();
    if (!trimmed) {
      setMenuError("Gate type is required");
      return;
    }
    onCircuitEdit?.({ type: "relabelGate", id: menu.gateId, gateType: trimmed });
    closeMenu();
  }

  function submitRemoveGate() {
    if (menu?.kind !== "gate") return;
    onCircuitEdit?.({ type: "removeGate", id: menu.gateId });
    closeMenu();
  }

  function submitAddGate() {
    if (menu?.kind !== "cell") return;
    const trimmed = menuValue.trim();
    if (!trimmed) {
      setMenuError("Gate type is required");
      return;
    }
    const result = addGateAtCell(gates, trimmed, menu.wireId, menu.columnIndex, sortedTimes);
    onCircuitEdit?.({ type: "replaceGates", gates: result.gates });
    closeMenu();
  }

  const svgCommon = (
    <>
      <title>{summary}</title>

      {classicalRowY != null && (
        <g>
          <text
            x={MARGIN.left - 10}
            y={classicalRowY - 8}
            textAnchor="end"
            fontSize={11}
            fill={WIRE_COLOR}
          >
            {classical.length === 1 ? classical[0] : `c (${classical.length})`}
          </text>
          <line
            x1={MARGIN.left}
            x2={width - MARGIN.right}
            y1={classicalRowY}
            y2={classicalRowY}
            stroke={WIRE_COLOR}
            strokeWidth={2}
          />
        </g>
      )}

      {overlays.map((overlay, overlayIndex) => {
        const targetYs = (overlay.targets ?? [])
          .map((targetId) => qubitRowY.get(targetId))
          .filter((y) => y != null);
        if (targetYs.length === 0) return null;
        const x0 = xForTime(overlay.timeStart) - COLUMN_SPACING / 2 + GATE_WIDTH / 2;
        const x1 = xForTime(overlay.timeEnd) + COLUMN_SPACING / 2 - GATE_WIDTH / 2;
        return (
          <OverlayBand
            key={overlay.id || overlayIndex}
            idPrefix={scopeId}
            overlay={overlay}
            overlayIndex={overlayIndex}
            x0={x0}
            x1={x1}
            yMin={Math.min(...targetYs)}
            yMax={Math.max(...targetYs)}
          />
        );
      })}
    </>
  );

  if (!editable) {
    return (
      <Box sx={{ width: "100%", height: "100%", overflow: "auto" }}>
        <svg
          id={scopeId}
          role="img"
          aria-label={summary}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          style={{ display: "block" }}
        >
          {svgCommon}
          {qubits.map((qubitId) => {
            const y = qubitRowY.get(qubitId);
            return (
              <g key={qubitId}>
                <text
                  x={MARGIN.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill={WIRE_COLOR}
                >
                  {qubitId}
                </text>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y}
                  y2={y}
                  stroke={WIRE_COLOR}
                />
              </g>
            );
          })}
          {gates.map((gate) => {
            const x = xForTime(gate.time);
            const targetYs = (gate.targets ?? [])
              .map((targetId) => qubitRowY.get(targetId))
              .filter((y) => y != null);
            return (
              <GateMark
                key={gate.id}
                idPrefix={scopeId}
                gate={gate}
                x={x}
                targetYs={targetYs}
                classicalY={classicalRowY}
                highlighted={hoveredGateId === gate.id}
                onEnter={() => setHoveredGateId(gate.id)}
                onLeave={() =>
                  setHoveredGateId((current) => (current === gate.id ? null : current))
                }
              />
            );
          })}
        </svg>
      </Box>
    );
  }

  const addQubitZoneTop = (classicalRowY ?? lastQubitY) + ROW_SPACING / 2;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Box sx={{ width: "100%", overflow: "auto" }}>
          <svg
            id={scopeId}
            role="img"
            aria-label={summary}
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            style={{ display: "block" }}
          >
            {svgCommon}

            {/* Grid cells first, so gates painted afterward sit on top and win hit-testing */}
            {qubits.map((qubitId) => {
              const y = qubitRowY.get(qubitId);
              return Array.from({ length: sortedTimes.length + 1 }, (_, columnIndex) => (
                <GridCell
                  key={`${qubitId}-${columnIndex}`}
                  wireId={qubitId}
                  columnIndex={columnIndex}
                  x={xForColumnIndex(columnIndex)}
                  y={y}
                  onContextMenu={(event) => openCellMenu(qubitId, columnIndex, event)}
                />
              ));
            })}

            {qubits.map((qubitId) => {
              const y = qubitRowY.get(qubitId);
              return (
                <g key={qubitId}>
                  <text
                    x={MARGIN.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={11}
                    fill={WIRE_COLOR}
                    style={{ cursor: "context-menu" }}
                    onContextMenu={(event) => openQubitMenu(qubitId, event)}
                  >
                    {qubitId}
                  </text>
                  <line
                    x1={MARGIN.left}
                    x2={width - MARGIN.right}
                    y1={y}
                    y2={y}
                    stroke={WIRE_COLOR}
                  />
                </g>
              );
            })}

            <rect
              x={0}
              y={addQubitZoneTop}
              width={width}
              height={Math.max(height - addQubitZoneTop, 1)}
              fill="transparent"
              onContextMenu={openAddQubitMenu}
            />

            {gates.map((gate) => (
              <EditableGateMark
                key={gate.id}
                gate={gate}
                x={xForTime(gate.time)}
                qubitRowY={qubitRowY}
                classicalY={classicalRowY}
                highlighted={hoveredGateId === gate.id}
                onEnter={() => setHoveredGateId(gate.id)}
                onLeave={() =>
                  setHoveredGateId((current) => (current === gate.id ? null : current))
                }
                onGateContextMenu={openGateMenu}
              />
            ))}
          </svg>
        </Box>
      </DndContext>

      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Drag a gate&apos;s box or a connector dot onto a grid cell to retime or retarget it.
        Right-click a qubit label, empty grid space, or a gate to add, rename, relabel, or remove.
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        These changes preview here, but can&apos;t be sent to Run yet for this visualization type.
      </Typography>

      {menu?.kind === "qubit" && (
        <FloatingMenu menuRef={menuRef} x={menu.x} y={menu.y}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
            Qubit {menu.wireId}
          </Typography>
          <TextField
            id={`${scopeId}-rename-qubit`}
            size="small"
            autoFocus
            label="Name"
            value={menuValue}
            onChange={(event) => setMenuValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submitRenameQubit()}
          />
          {menuError && (
            <Typography variant="caption" color="error">
              {menuError}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" variant="contained" onClick={submitRenameQubit}>
              Save
            </Button>
            <Button size="small" color="error" variant="outlined" onClick={submitRemoveQubit}>
              Remove
            </Button>
            <Button size="small" onClick={closeMenu}>
              Cancel
            </Button>
          </Box>
        </FloatingMenu>
      )}

      {menu?.kind === "addQubit" && (
        <FloatingMenu menuRef={menuRef} x={menu.x} y={menu.y}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
            New qubit
          </Typography>
          <TextField
            id={`${scopeId}-add-qubit`}
            size="small"
            autoFocus
            label="Name"
            value={menuValue}
            onChange={(event) => setMenuValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submitAddQubit()}
          />
          {menuError && (
            <Typography variant="caption" color="error">
              {menuError}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" variant="contained" onClick={submitAddQubit}>
              Add
            </Button>
            <Button size="small" onClick={closeMenu}>
              Cancel
            </Button>
          </Box>
        </FloatingMenu>
      )}

      {menu?.kind === "gate" && (
        <FloatingMenu menuRef={menuRef} x={menu.x} y={menu.y}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
            Edit gate
          </Typography>
          <TextField
            id={`${scopeId}-relabel-gate`}
            size="small"
            autoFocus
            label="Gate type"
            value={menuValue}
            onChange={(event) => setMenuValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submitRelabelGate()}
          />
          {menuError && (
            <Typography variant="caption" color="error">
              {menuError}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" variant="contained" onClick={submitRelabelGate}>
              Save
            </Button>
            <Button size="small" color="error" variant="outlined" onClick={submitRemoveGate}>
              Remove
            </Button>
            <Button size="small" onClick={closeMenu}>
              Cancel
            </Button>
          </Box>
        </FloatingMenu>
      )}

      {menu?.kind === "cell" && (
        <FloatingMenu menuRef={menuRef} x={menu.x} y={menu.y}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
            New gate on {menu.wireId}
          </Typography>
          <TextField
            id={`${scopeId}-add-gate`}
            size="small"
            autoFocus
            label="Gate type"
            placeholder="h"
            value={menuValue}
            onChange={(event) => setMenuValue(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submitAddGate()}
          />
          {menuError && (
            <Typography variant="caption" color="error">
              {menuError}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" variant="contained" onClick={submitAddGate}>
              Add
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
