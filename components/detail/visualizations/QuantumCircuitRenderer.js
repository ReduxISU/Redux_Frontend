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
// --- T51 (#114): editing UI ships; the diagram-to-text serializer does not -------------
// Add/remove qubit and add/remove/relabel gate are wired here, gated behind `editable`,
// and update the local preview immediately (INTERACTIVE_LAYER_DESIGN.md §2.1.2) exactly
// like the `graph` and `recursiveSet` editors on this same task. What's deliberately
// missing is a serializer to send an edit through Run: T46 (#109) verified SPADE
// round-tripping against Clique and DFA, a set-of-nodes-plus-edges grammar and an
// automaton grammar -- neither is a gate-sequence grammar, and nothing this project has
// checked says whether a quantum-circuit instance's text encodes gates by literal type
// tokens, by position, or some other shape entirely, or whether gate `id` (which this
// contract's payload appears to synthesize during parsing, unlike a graph node's `id`,
// which is plausibly the literal grammar token) has any textual counterpart at all.
// Writing a serializer against an unverified guess risks producing instance text that
// looks plausible and silently means something else -- worse than leaving the gap
// visible. VisualizationsSection.js declines to serialize a pending `quantumCircuit`
// edit and says why, rather than guessing. See data/instanceSerializers.js's own header
// for the parallel note. This is this task's one explicitly left-open item -- see its
// handback summary.

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useId, useMemo, useState } from "react";
import { getVisualizationColor } from "../../theme";

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
  const xForTime = (time) => MARGIN.left + (columnIndex.get(time) ?? 0) * COLUMN_SPACING;

  const qubitRowY = new Map(qubits.map((id, index) => [id, MARGIN.top + index * ROW_SPACING]));
  const lastQubitY =
    qubits.length > 0 ? MARGIN.top + (qubits.length - 1) * ROW_SPACING : MARGIN.top;
  const classicalRowY = classical.length > 0 ? lastQubitY + CLASSICAL_GAP : null;

  const maxColumn = Math.max(sortedTimes.length - 1, 0);
  const width = MARGIN.left + MARGIN.right + Math.max(maxColumn, 1) * COLUMN_SPACING + GATE_WIDTH;
  const height = (classicalRowY ?? lastQubitY) + MARGIN.bottom;

  return { qubits, classical, gates, overlays, xForTime, qubitRowY, classicalRowY, width, height };
}

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

// `qubits` is `d3.qubits` straight from the contract -- a plain `string[]` (§3.2), not
// objects, unlike `graph`'s nodes. Rows are keyed by array index rather than value: a
// qubit's position in the array is stable across a rename (renaming mutates the string at
// the same index, it doesn't reorder), so indexing avoids the same remount-during-rename
// problem GraphEditPanel solves with a synthetic `_key` -- without needing one here, since
// the contract gives this type no per-qubit object to hang one off. `gates` don't need
// this treatment at all: `gate.id` (§3.2) is independent of `gate.type`, the field being
// relabeled, so it's already a stable key on its own.
function QuantumCircuitEditPanel({ idPrefix, qubits, gates, onCircuitEdit }) {
  const [newQubitId, setNewQubitId] = useState("");
  const [newGateType, setNewGateType] = useState("");
  const [newGateTarget, setNewGateTarget] = useState(qubits[0] ?? "");
  const targetValue = qubits.includes(newGateTarget) ? newGateTarget : (qubits[0] ?? "");

  function handleAddQubit(event) {
    event.preventDefault();
    const trimmed = newQubitId.trim();
    if (!trimmed || qubits.includes(trimmed)) return;
    onCircuitEdit({ type: "addQubit", id: trimmed });
    setNewQubitId("");
  }

  function handleAddGate(event) {
    event.preventDefault();
    const trimmed = newGateType.trim();
    if (!trimmed || !targetValue) return;
    onCircuitEdit({ type: "addGate", gateType: trimmed, target: targetValue });
    setNewGateType("");
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        mt: 1,
        p: 1.5,
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 1,
      }}
    >
      <Typography variant="overline" sx={{ color: "text.secondary" }}>
        Edit qubits
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {qubits.map((qubitId, index) => (
          <Box key={index} sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
            <Box component="label" htmlFor={`${idPrefix}-qubit-${index}`} sx={{ display: "none" }}>
              Rename qubit {qubitId}
            </Box>
            <TextField
              id={`${idPrefix}-qubit-${index}`}
              size="small"
              variant="standard"
              value={qubitId}
              onChange={(event) =>
                onCircuitEdit({ type: "renameQubit", from: qubitId, to: event.target.value })
              }
              sx={{ width: 56, "& input": { fontSize: "0.8125rem", py: 0.25 } }}
              inputProps={{ "aria-label": `Rename qubit ${qubitId}` }}
            />
            <IconButton
              id={`${idPrefix}-qubit-${index}-remove`}
              size="small"
              aria-label={`Remove qubit ${qubitId}`}
              onClick={() => onCircuitEdit({ type: "removeQubit", id: qubitId })}
              sx={{ p: 0.375 }}
            >
              <CloseIcon sx={{ fontSize: "0.875rem" }} />
            </IconButton>
          </Box>
        ))}
      </Box>
      <Box
        component="form"
        onSubmit={handleAddQubit}
        sx={{ display: "inline-flex", gap: 0.5, alignItems: "center" }}
      >
        <Box component="label" htmlFor={`${idPrefix}-add-qubit`} sx={{ display: "none" }}>
          New qubit id
        </Box>
        <TextField
          id={`${idPrefix}-add-qubit`}
          size="small"
          variant="outlined"
          placeholder="new qubit id"
          value={newQubitId}
          onChange={(event) => setNewQubitId(event.target.value)}
          sx={{ width: 120, "& input": { fontSize: "0.8125rem", py: 0.5 } }}
          inputProps={{ "aria-label": "New qubit id" }}
        />
        <IconButton
          id={`${idPrefix}-add-qubit-submit`}
          type="submit"
          size="small"
          disabled={!newQubitId.trim() || qubits.includes(newQubitId.trim())}
          aria-label="Add qubit"
          sx={{ p: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
        >
          <AddIcon sx={{ fontSize: "1rem" }} />
        </IconButton>
      </Box>

      <Typography variant="overline" sx={{ color: "text.secondary", mt: 1 }}>
        Edit gates
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {gates.length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
            No gates.
          </Typography>
        )}
        {gates.map((gate) => (
          <Box key={gate.id} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
            <Box component="label" htmlFor={`${idPrefix}-gate-${gate.id}`} sx={{ display: "none" }}>
              Relabel gate on {gate.targets?.join(", ")}
            </Box>
            <TextField
              id={`${idPrefix}-gate-${gate.id}`}
              size="small"
              variant="standard"
              value={gate.type ?? ""}
              onChange={(event) =>
                onCircuitEdit({ type: "relabelGate", id: gate.id, gateType: event.target.value })
              }
              sx={{ width: 56, "& input": { fontSize: "0.8125rem", py: 0.25 } }}
              inputProps={{ "aria-label": `Relabel gate on ${gate.targets?.join(", ")}` }}
            />
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              on {gate.targets?.join(", ")}
            </Typography>
            <IconButton
              id={`${idPrefix}-gate-${gate.id}-remove`}
              size="small"
              aria-label={`Remove gate on ${gate.targets?.join(", ")}`}
              onClick={() => onCircuitEdit({ type: "removeGate", id: gate.id })}
              sx={{ p: 0.375 }}
            >
              <CloseIcon sx={{ fontSize: "0.875rem" }} />
            </IconButton>
          </Box>
        ))}
      </Box>
      {qubits.length > 0 && (
        <Box
          component="form"
          onSubmit={handleAddGate}
          sx={{ display: "inline-flex", gap: 0.5, alignItems: "center" }}
        >
          <TextField
            id={`${idPrefix}-add-gate-type`}
            size="small"
            variant="outlined"
            placeholder="gate type"
            value={newGateType}
            onChange={(event) => setNewGateType(event.target.value)}
            sx={{ width: 100, "& input": { fontSize: "0.8125rem", py: 0.5 } }}
            inputProps={{ "aria-label": "New gate type" }}
          />
          <Select
            id={`${idPrefix}-add-gate-target`}
            size="small"
            value={targetValue}
            onChange={(event) => setNewGateTarget(event.target.value)}
            inputProps={{ "aria-label": "New gate target qubit" }}
            sx={{ minWidth: 72 }}
          >
            {qubits.map((qubitId) => (
              <MenuItem key={qubitId} value={qubitId}>
                {qubitId}
              </MenuItem>
            ))}
          </Select>
          <IconButton
            id={`${idPrefix}-add-gate-submit`}
            type="submit"
            size="small"
            disabled={!newGateType.trim()}
            aria-label="Add gate"
            sx={{ p: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
          >
            <AddIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </Box>
      )}
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        These changes preview here, but can&apos;t be sent to Run yet for this visualization type.
      </Typography>
    </Box>
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
 * @param {boolean} [props.editable] T51 (#114): true only when this frame is
 *   the base frame of a visualization the caller has decided is editable
 *   right now. See this file's header for why edits here preview locally
 *   but are never sent to Run.
 * @param {(op: Object) => void} [props.onCircuitEdit] Called with one edit
 *   descriptor per structural edit -- `{type: "addQubit", id}`,
 *   `{type: "removeQubit", id}`, `{type: "renameQubit", from, to}`,
 *   `{type: "addGate", gateType, target}`, `{type: "removeGate", id}`, or
 *   `{type: "relabelGate", id, gateType}`. Required when `editable` is true.
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

  const layout = useMemo(() => buildLayout(frame.d3), [frame]);
  const { qubits, classical, gates, overlays, xForTime, qubitRowY, classicalRowY, width, height } =
    layout;

  const summaryBody = `quantum circuit with ${qubits.length} qubit${qubits.length === 1 ? "" : "s"} and ${gates.length} gate${gates.length === 1 ? "" : "s"}`;
  const summary = instanceName ? `${instanceName}: ${summaryBody}` : summaryBody;

  return (
    <Box sx={{ width: "100%", height: editable ? "auto" : "100%", overflow: "auto" }}>
      <svg
        id={scopeId}
        role="img"
        aria-label={summary}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ display: "block" }}
      >
        <title>{summary}</title>

        {qubits.map((qubitId) => {
          const y = qubitRowY.get(qubitId);
          return (
            <g key={qubitId}>
              <text x={MARGIN.left - 10} y={y + 4} textAnchor="end" fontSize={11} fill={WIRE_COLOR}>
                {qubitId}
              </text>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y} y2={y} stroke={WIRE_COLOR} />
            </g>
          );
        })}

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
          // §3.2 only requires `id` be a string -- live data sends "" on every
          // overlay of at least one instance (Bernstein-Vazirani), so the
          // index is the fallback that keeps both the React key and the DOM
          // id (§4.1) unique when `id` alone can't.
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
              onLeave={() => setHoveredGateId((current) => (current === gate.id ? null : current))}
            />
          );
        })}
      </svg>
      {editable && (
        <QuantumCircuitEditPanel
          idPrefix={scopeId}
          qubits={frame.d3.qubits}
          gates={frame.d3.gates}
          onCircuitEdit={onCircuitEdit}
        />
      )}
    </Box>
  );
}
