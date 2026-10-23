// components/pictures/QuantumRenderer.js
//
// #210: the Quantum Circuit picture type (ReduxISU/Redux#672), Redux's PICTURE-TYPES.md "Quantum
// Circuit": Deutsch, Deutsch-Jozsa, Bernstein-Vazirani, Simon's Problem, Unstructured Search
// (Grover) and Prime Factorization (Shor). One wire per qubit, the gates in the order they run
// with the oracle as a box, and each step applying one column. Bars under the circuit show how
// likely each outcome of the measured qubits is right then, colored by the sign of its amplitude,
// so a reader watches the oracle flip signs and the last gates turn them into one clear answer.
// A classical solver never runs the circuit: its steps are the oracle calls it makes, listed
// under the circuit, and its circuit ends Untraveled.
//
// The payload holds the circuit (`qubits` q0..., `columns` t0... of `gates` g{column}_{qubit},
// `stages`), which qubits are measured (`measure`, the most significant first), how an outcome
// reads (`readout`), whether Redux simulated the circuit (`simulated`) and a `note`. Each frame
// holds how many columns have run (`applied`), the oracle calls so far (`queries`), the states of
// the columns, gates and qubits (absent is Background), the outcome probabilities (`bars`), the
// measured outcome, a quantum server's `counts` when it sent them, and the answer so far
// (`result`). Columns still to come in a run are drawn in dashed grey.
//
// Layout is quantumLayout.js's pure function of the payload, the run's frames and the box's
// width, so the circuit stands still before Run and at every step. Hovering, focusing or tapping
// a qubit traces its wire and every gate on it; a gate traces the wires it acts on; a bar
// traces the measured wires. The rest fades by color. The picture opens at Fit; a wide circuit
// (Shor's) zooms in to its text's own size, and stepping keeps the column in view.
//
// #250: nothing here can be dragged. A wire's place is its qubit's index and a column's place is
// when it runs, so moving either would misstate the circuit.
//
// #239: a gadget's pieces (`highlightIds`, `gadgetColors`; gadgetRings.js) are marked in the
// gadget's color: a qubit (`data-qubit-id`) with a band under its wire, a gate (`data-gate-id`)
// with a ring around its box, circle or meter, and a column (`data-column-id`) with a ring just
// inside its strip from the first wire to the last. No mark covers a label.

import Box from "@mui/material/Box";
import { useMemo, useRef, useState } from "react";
import { paletteVars } from "../theme";
import DiagramZoom from "./DiagramZoom";
import { GadgetCircle, GadgetRect, GadgetUnderlay, useGadgetMarks } from "./gadgetRings";
import { FAINT_FILTER, MONO, nodeLook, TRACE_COLOR } from "./graphPieces";
import { pictureStateStyle, stateOf } from "./pictureStates";
import {
  BOX_OVER,
  BOX_SIZE,
  bitString,
  GATE,
  GLYPH_SIZE,
  HEAD_SIZE,
  layoutQuantum,
  METER_WIDTH,
  NAME_SIZE,
  NOTE_SIZE,
  QUERY_ROW,
  queryText,
  SMALL_SIZE,
  TITLE_SIZE,
} from "./quantumLayout";
import { useBoxWidth } from "./useBoxWidth";

/** The scale (CSS px per drawing unit) the circuit's text reads at: its design size. */
const READABLE_SCALE = 1;

/** The margin around the column the view keeps in sight while zoomed in, in drawing units. */
const FRAME_MARGIN = 12;

/** What a gate is, for its label. */
const GATE_TEXT = { h: "H", x: "X", z: "Z", cx: "CNOT", measure: "Measure" };

function plural(count, word, many = `${word}s`) {
  return `${count} ${count === 1 ? word : many}`;
}

function percent(probability) {
  const p = probability * 100;
  return `${p >= 10 || p === 0 ? Math.round(p) : p.toFixed(1)}%`;
}

/** A bar's fill by its amplitude's sign: positive, negative, or plain when the sign is unknown. */
function barFill(sign) {
  if (sign > 0) return paletteVars.viz.group.g0.line;
  if (sign < 0) return paletteVars.viz.group.g1.line;
  return paletteVars.viz.dim;
}

/** How a gate's box looks: its state's, the oracle's, the plain one, or dashed grey to come. */
function gateLook(state, { oracle, future }) {
  if (state === "Background" && future) {
    return {
      fill: paletteVars.surface.main,
      line: paletteVars.viz.dim,
      ink: paletteVars.text.secondary,
      dash: "3 2",
      width: 1.4,
    };
  }
  if (state === "Background") {
    return {
      fill: paletteVars.surface.input,
      line: oracle ? paletteVars.viz.violet : nodeLook("Background").line,
      ink: paletteVars.text.primary,
      dash: undefined,
      width: oracle ? 2.2 : 1.6,
    };
  }
  const look = nodeLook(state);
  return {
    fill: look.fill,
    line: look.line,
    ink: look.ink,
    dash: look.dash,
    width: look.strokeWidth,
  };
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Quantum Circuit payload.
 * @param {Object} props.frame The frame to draw.
 * @param {number|null} props.frameIndex The frame shown, or null before Run.
 * @param {Object[]} [props.frames] Every frame of the run (one layout for all of them).
 * @param {string[]} [props.highlightIds] Gadget piece ids to mark (#239).
 * @param {Object<string, string>} [props.gadgetColors] Color mode's marks, by piece id (#239).
 */
export default function QuantumRenderer({
  idPrefix,
  name,
  payload,
  frame,
  frameIndex,
  frames = [],
  highlightIds,
  gadgetColors,
}) {
  const gadgetOf = useGadgetMarks(highlightIds, gadgetColors);
  const boxRef = useRef(null);
  const boxWidth = useBoxWidth(boxRef);
  const plain = frameIndex === null || frameIndex === undefined;
  const alone = plain || frames.length ? null : frame;
  const layout = useMemo(
    () => layoutQuantum(payload, plain ? [] : alone ? [alone] : frames, boxWidth ?? undefined),
    [payload, plain, alone, frames, boxWidth],
  );
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);

  const step = plain ? {} : (frame ?? {});
  const applied = Number.isInteger(step.applied) ? step.applied : 0;
  const focus = new Set(Array.isArray(step.focus) ? step.focus : []);
  const outcome = Number.isInteger(step.outcome) ? step.outcome : null;
  const bars = new Map(
    (Array.isArray(step.bars) ? step.bars : []).map((bar) => [bar.outcome, bar]),
  );
  const counts = new Map();
  for (const [key, value] of Object.entries(step.counts ?? {})) {
    const at =
      /^[01]+$/.test(key) && key.length === layout.bits ? Number.parseInt(key, 2) : Number(key);
    if (Number.isInteger(at)) counts.set(at, (counts.get(at) ?? 0) + Number(value));
  }
  const shots = [...counts.values()].reduce((sum, n) => sum + n, 0);
  const queries = Array.isArray(step.queries) ? step.queries : [];
  const inputBits = Number.isInteger(payload?.inputBits) ? payload.inputBits : 0;
  // The measured outcome's verdict: the measured qubits' state once the step reads it.
  const measuredState =
    outcome !== null && layout.measure.length
      ? stateOf(step.qubits, layout.wires[layout.measure[0]].id)
      : "Background";

  // Every gate by id, and the gates on each wire.
  const gates = layout.columns.flatMap((column) => column.gates);
  const gateById = new Map(gates.map((gate) => [gate.id, gate]));
  const onWire = (gate, k) =>
    gate.type === "box"
      ? k >= gate.from && k <= gate.to
      : gate.qubits.includes(k) || gate.control === k;

  // What is traced: a wire and its gates, a gate and its wires, or a bar and the measured wires.
  const pointedAt = hover ?? pinned;
  let near = null;
  const wireOf = new Map(layout.wires.map((wire) => [wire.id, wire]));
  if (wireOf.has(pointedAt)) {
    const k = wireOf.get(pointedAt).index;
    near = new Set([pointedAt, ...gates.filter((gate) => onWire(gate, k)).map((gate) => gate.id)]);
  } else if (gateById.has(pointedAt)) {
    const gate = gateById.get(pointedAt);
    near = new Set([pointedAt]);
    for (const wire of layout.wires) if (onWire(gate, wire.index)) near.add(wire.id);
  } else if (typeof pointedAt === "string" && pointedAt.startsWith("o:")) {
    near = new Set([pointedAt, ...layout.measure.map((k) => layout.wires[k].id)]);
  }
  const traced = near ? pointedAt : null;
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
  const fade = (id) => (near !== null && !near.has(id) ? { filter: FAINT_FILTER } : undefined);
  const tracedAttr = (id) => (near ? (near.has(id) ? "trace" : "faint") : undefined);

  // Zoomed in, a step keeps its column in view.
  const focusColumn = layout.columns.find((column) => focus.has(column.id));
  const follow =
    focusColumn && layout.wires.length
      ? (() => {
          const top = layout.wires[0].y - BOX_OVER - FRAME_MARGIN;
          const box = {
            x: focusColumn.left - FRAME_MARGIN,
            y: top,
            width: focusColumn.right - focusColumn.left + 2 * FRAME_MARGIN,
            height: layout.wires.at(-1).y + BOX_OVER + FRAME_MARGIN - top,
          };
          return { key: `${frameIndex}:${focusColumn.id}`, ...box, path: box };
        })()
      : null;

  const stageOf = (index) =>
    layout.stages.find((stage) => index >= stage.from && index <= stage.to)?.label;
  const columnCount = layout.columns.length;
  const label = `${name}: ${plural(layout.wires.length, "qubit")}, ${plural(columnCount, "column")} of gates${plain ? "" : applied ? `; ${applied} run` : ""}${queries.length ? `; ${plural(queries.length, "oracle call")}` : ""}${outcome !== null ? `; measured ${layout.chart?.slots.find((s) => s.outcome === outcome)?.label ?? outcome}` : ""}.`;
  const summary = plain
    ? `${plural(layout.wires.length, "qubit")}, ${plural(columnCount, "column")}`
    : queries.length
      ? `${plural(queries.length, "oracle call")}`
      : `${applied} of ${plural(columnCount, "column")} run`;
  const ink = (state) =>
    state === "Background" ? paletteVars.text.primary : pictureStateStyle(state).text;
  const head = {
    fill: paletteVars.text.secondary,
    fontFamily: MONO,
    fontSize: HEAD_SIZE,
    fontWeight: 600,
    letterSpacing: "0.08em",
    dominantBaseline: "central",
    pointerEvents: "none",
  };

  return (
    <Box
      ref={boxRef}
      id={`${idPrefix}-quantum`}
      data-drawing-width={layout.width}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <DiagramZoom
        idPrefix={idPrefix}
        label={label}
        drawing={layout}
        resetOn={[payload, frames, layout.width]}
        follow={follow}
        readableScale={READABLE_SCALE}
        toolbar={
          <Box
            id={`${idPrefix}-summary`}
            data-applied={plain ? undefined : applied}
            sx={{ fontSize: "0.8125rem", color: "text.secondary" }}
          >
            {summary}
          </Box>
        }
      >
        {layout.note.length > 0 && (
          <text
            data-note=""
            fill={layout.wires.length ? paletteVars.text.secondary : paletteVars.text.primary}
            fontFamily={MONO}
            fontSize={NOTE_SIZE}
            dominantBaseline="central"
            pointerEvents="none"
          >
            {layout.note.map((line) => (
              <tspan key={line.y} x={10} y={line.y}>
                {line.text}
              </tspan>
            ))}
          </text>
        )}
        <g data-layer="stages" pointerEvents="none">
          {layout.stages.map((stage) => (
            <g key={`${stage.left}`} data-stage={stage.label}>
              <rect
                x={stage.left}
                y={stage.top}
                width={stage.right - stage.left}
                height={stage.bottom - stage.top}
                rx={8}
                fill="none"
                stroke={paletteVars.viz.dim}
                strokeDasharray="4 4"
              />
              <text
                x={stage.headX}
                y={stage.headY}
                textAnchor="middle"
                {...head}
                fontWeight={400}
                letterSpacing={0}
                fontSize={SMALL_SIZE}
              >
                {stage.label}
              </text>
            </g>
          ))}
        </g>
        <g data-layer="wires">
          {layout.wires.map((wire) => {
            const state = stateOf(step.qubits, wire.id);
            const lit = state !== "Background";
            const isTraced = traced === wire.id;
            const parts = [`Qubit ${wire.name}`, `${wire.role} qubit`];
            if (wire.measured >= 0) parts.push("measured");
            if (outcome !== null && wire.measured >= 0) {
              parts.push(`read ${bitString(outcome, layout.bits)[wire.measured]}`);
            }
            if (lit) parts.push(pictureStateStyle(state).legend);
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={wire.id}
                data-qubit-id={wire.id}
                data-state={state}
                data-traced={tracedAttr(wire.id)}
                aria-label={parts.join(", ")}
                style={fade(wire.id)}
                {...traceProps(wire.id)}
              >
                {wire.pieces.map(([from, to]) => (
                  <GadgetUnderlay
                    key={`gadget-${from}`}
                    id={wire.id}
                    color={gadgetOf(wire.id)}
                    d={`M${from} ${wire.y} L${to} ${wire.y}`}
                    width={2.6}
                  />
                ))}
                <rect
                  x={0}
                  y={wire.y - 20}
                  width={layout.nameX + 8}
                  height={40}
                  fill="transparent"
                />
                <text
                  x={layout.nameX}
                  y={wire.y - 7}
                  data-label=""
                  textAnchor="end"
                  dominantBaseline="central"
                  fill={isTraced ? TRACE_COLOR : ink(state)}
                  fontFamily={MONO}
                  fontSize={NAME_SIZE}
                  fontWeight={lit || isTraced ? 700 : 400}
                >
                  {wire.name}
                </text>
                <text
                  x={layout.nameX}
                  y={wire.y + 8}
                  data-role=""
                  textAnchor="end"
                  dominantBaseline="central"
                  fill={paletteVars.text.secondary}
                  fontFamily={MONO}
                  fontSize={SMALL_SIZE}
                >
                  {wire.role}
                </text>
                {layout.ketX !== null && (
                  <text
                    x={layout.ketX}
                    y={wire.y}
                    dominantBaseline="central"
                    fill={paletteVars.text.primary}
                    fontFamily={MONO}
                    fontSize={NAME_SIZE}
                  >
                    |0⟩
                  </text>
                )}
                {wire.pieces.map(([from, to]) => (
                  <line
                    key={from}
                    x1={from}
                    y1={wire.y}
                    x2={to}
                    y2={wire.y}
                    stroke={
                      isTraced
                        ? TRACE_COLOR
                        : lit
                          ? pictureStateStyle(state).line
                          : paletteVars.viz.edge
                    }
                    strokeWidth={lit || isTraced ? 2.6 : 1.4}
                  />
                ))}
                {outcome !== null && wire.measured >= 0 && (
                  <text
                    x={layout.outX}
                    y={wire.y}
                    data-bit-out=""
                    dominantBaseline="central"
                    fill={ink(state)}
                    fontFamily={MONO}
                    fontSize={GLYPH_SIZE}
                    fontWeight={700}
                  >
                    {bitString(outcome, layout.bits)[wire.measured]}
                  </text>
                )}
              </g>
            );
          })}
        </g>
        <g data-layer="gates">
          {layout.columns.map((column) => {
            const columnState = stateOf(step.columns, column.id);
            const future = !plain && column.index >= applied;
            return (
              <g
                key={column.id}
                data-column-id={column.id}
                data-state={columnState}
                data-future={future ? "true" : undefined}
              >
                {layout.wires.length > 0 && (
                  <GadgetRect
                    id={column.id}
                    color={gadgetOf(column.id)}
                    x={column.left}
                    y={layout.wires[0].y - GATE / 2 - 6}
                    width={column.right - column.left}
                    height={layout.wires[layout.wires.length - 1].y - layout.wires[0].y + GATE + 12}
                    rx={4}
                    gap={-1}
                  />
                )}
                {column.gates.map((gate) => {
                  // The gate's own state (a measured gate's verdict), else its column's.
                  const own = stateOf(step.gates, gate.id);
                  const state = own !== "Background" ? own : columnState;
                  const look = gateLook(state, { oracle: gate.oracle === true, future });
                  const isTraced = traced === gate.id;
                  const line = isTraced ? TRACE_COLOR : look.line;
                  const width = isTraced ? 3 : look.width;
                  const wires = gate.qubits.map((k) => layout.wires[k].name).join(", ");
                  const parts = [
                    `${gate.type === "box" ? (gate.label ?? "Box") : (GATE_TEXT[gate.type] ?? gate.type)}${gate.oracle ? " (the oracle)" : ""} on ${wires}`,
                  ];
                  if (Number.isInteger(gate.control)) {
                    parts.push(`controlled by ${layout.wires[gate.control].name}`);
                  }
                  const stage = stageOf(column.index);
                  parts.push(`column ${column.index + 1}${stage ? ` (${stage})` : ""}`);
                  if (future && state === "Background") parts.push("not run yet");
                  if (state !== "Background") parts.push(pictureStateStyle(state).legend);
                  return (
                    // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
                    <g
                      key={gate.id}
                      data-gate-id={gate.id}
                      data-type={gate.type}
                      data-state={state}
                      data-oracle={gate.oracle ? "true" : undefined}
                      data-traced={tracedAttr(gate.id)}
                      aria-label={parts.join(", ")}
                      style={fade(gate.id)}
                      {...traceProps(gate.id)}
                    >
                      <GateMark gate={gate} color={gadgetOf(gate.id)} />
                      <GateShape gate={gate} look={look} line={line} width={width} />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
        {layout.chart && (
          <g data-layer="chart">
            <text
              x={10}
              y={layout.chart.titleY}
              data-head=""
              dominantBaseline="central"
              fill={paletteVars.text.primary}
              fontFamily={MONO}
              fontSize={TITLE_SIZE}
              fontWeight={700}
              pointerEvents="none"
            >
              {layout.chart.title}
            </text>
            <ChartAxes chart={layout.chart} />
            {bars.size === 0 && counts.size === 0 && (
              <text
                x={(layout.chart.left + layout.chart.right) / 2}
                y={layout.chart.top + layout.chart.height / 2 - 14}
                data-chart-empty=""
                textAnchor="middle"
                dominantBaseline="central"
                fill={paletteVars.text.secondary}
                fontFamily={MONO}
                fontSize={SMALL_SIZE}
                pointerEvents="none"
              >
                {queries.length
                  ? "A classical solver: no column runs."
                  : "Bars appear once a column runs."}
              </text>
            )}
            {layout.chart.slots.map((slot) => {
              const bar = bars.get(slot.outcome);
              const counted = counts.get(slot.outcome) ?? 0;
              const probability = bar ? bar.probability : shots ? counted / shots : 0;
              const id = `o:${slot.outcome}`;
              const isRead = outcome === slot.outcome && measuredState !== "Background";
              const verdict = isRead ? pictureStateStyle(measuredState) : null;
              const fill = verdict ? verdict.line : barFill(bar ? bar.sign : 0);
              const height = probability > 0 ? Math.max(1.5, probability * layout.chart.height) : 0;
              const top = layout.chart.top + layout.chart.height - height;
              const isTraced = traced === id;
              const parts = [`Outcome ${slot.label}`, percent(probability)];
              if (bar?.sign > 0) parts.push("positive amplitude");
              if (bar?.sign < 0) parts.push("negative amplitude");
              if (counts.size) parts.push(`came up ${plural(counted, "time")}`);
              if (isRead) parts.push(`measured, ${verdict.legend}`);
              return (
                // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
                <g
                  key={slot.outcome}
                  data-outcome={slot.outcome}
                  data-probability={bars.size || counts.size ? probability : undefined}
                  data-sign={bar ? bar.sign : undefined}
                  data-read={isRead ? measuredState : undefined}
                  data-traced={tracedAttr(id)}
                  aria-label={parts.join(", ")}
                  style={fade(id)}
                  {...traceProps(id)}
                >
                  <rect
                    x={slot.x - slot.width / 2}
                    y={layout.chart.top}
                    width={slot.width}
                    height={layout.chart.height}
                    fill="transparent"
                  />
                  {height > 0 && (
                    <rect
                      x={slot.x - slot.width / 2}
                      y={top}
                      width={slot.width}
                      height={height}
                      rx={2}
                      data-bar=""
                      fill={fill}
                      stroke={isTraced ? TRACE_COLOR : "none"}
                      strokeWidth={isTraced ? 2.4 : 0}
                    />
                  )}
                  {layout.chart.percents && probability > 0.02 && (
                    <text
                      x={slot.x}
                      y={top - 8}
                      data-percent=""
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={paletteVars.text.secondary}
                      fontFamily={MONO}
                      fontSize={SMALL_SIZE}
                      pointerEvents="none"
                    >
                      {percent(probability)}
                    </text>
                  )}
                  {(slot.showLabel || isRead) && (
                    <text
                      x={slot.x}
                      y={layout.chart.labelY}
                      data-outcome-label=""
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={verdict ? verdict.text : paletteVars.text.secondary}
                      fontFamily={MONO}
                      fontSize={SMALL_SIZE}
                      fontWeight={verdict ? 700 : 400}
                      pointerEvents="none"
                    >
                      {slot.label}
                    </text>
                  )}
                  {counts.size > 0 && slot.showLabel && (
                    <text
                      x={slot.x}
                      y={layout.chart.countY}
                      data-count=""
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={paletteVars.text.primary}
                      fontFamily={MONO}
                      fontSize={SMALL_SIZE}
                      pointerEvents="none"
                    >
                      {`×${counted}`}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        )}
        {layout.queries && (
          <g data-layer="queries">
            <text x={10} y={layout.queries.headY} data-head="" {...head}>
              {`ORACLE CALLS · ${queries.length}`}
            </text>
            {queries.map((query, i) => {
              const cell = layout.queries.cells[i];
              if (!cell) return null;
              const latest = i === queries.length - 1 && focus.size > 0;
              const style = pictureStateStyle(latest ? "ElementHighlight" : "Background");
              return (
                <g
                  key={cell.x * 1000 + cell.y}
                  data-query={i}
                  data-latest={latest ? "true" : undefined}
                >
                  <rect
                    x={cell.x}
                    y={cell.y - (QUERY_ROW - 4) / 2}
                    width={cell.width}
                    height={QUERY_ROW - 4}
                    rx={4}
                    fill={latest ? style.fill : paletteVars.surface.main}
                    stroke={latest ? style.line : "none"}
                  />
                  <text
                    x={cell.x + 6}
                    y={cell.y}
                    dominantBaseline="central"
                    fill={latest ? style.ink : paletteVars.text.primary}
                    fontFamily={MONO}
                    fontSize={TITLE_SIZE}
                  >
                    {queryText(query, inputBits)}
                  </text>
                </g>
              );
            })}
          </g>
        )}
        {layout.result && typeof step.result === "string" && step.result && (
          <g data-layer="result">
            <text x={10} y={layout.result.headY} data-head="" {...head}>
              {typeof step.ok === "boolean" ? "ANSWER" : "ANSWER SO FAR"}
            </text>
            <text
              x={10}
              y={layout.result.y}
              data-result={step.result}
              dominantBaseline="central"
              fill={
                typeof step.ok === "boolean"
                  ? pictureStateStyle(step.ok ? "Solution" : "Rejected").text
                  : paletteVars.text.primary
              }
              fontFamily={MONO}
              fontSize={GLYPH_SIZE}
              fontWeight={700}
            >
              {step.result}
            </text>
          </g>
        )}
      </DiagramZoom>
    </Box>
  );
}

/** One gate's drawing, centred on its column. */
/** #239: a gadget's ring around a gate's box, circle, meter or squares. */
function GateMark({ gate, color }) {
  if (!color) return null;
  const { x } = gate;
  if (gate.type === "box") {
    return (
      <GadgetRect
        id={gate.id}
        color={color}
        x={gate.box.left}
        y={gate.box.top}
        width={gate.box.right - gate.box.left}
        height={gate.box.bottom - gate.box.top}
        rx={6}
      />
    );
  }
  if (gate.type === "cx") {
    return <GadgetCircle id={gate.id} color={color} cx={x} cy={gate.ys[0]} r={11} />;
  }
  const half = (gate.type === "measure" ? METER_WIDTH : GATE) / 2;
  return gate.ys.map((y) => (
    <GadgetRect
      key={y}
      id={gate.id}
      color={color}
      x={x - half}
      y={y - GATE / 2}
      width={2 * half}
      height={GATE}
      rx={5}
    />
  ));
}

function GateShape({ gate, look, line, width }) {
  const { x } = gate;
  const glyph = (text, y, size = GLYPH_SIZE) => (
    <text
      x={x}
      y={y}
      data-glyph=""
      textAnchor="middle"
      dominantBaseline="central"
      fill={look.ink}
      fontFamily={MONO}
      fontSize={size}
      fontWeight={700}
      pointerEvents="none"
    >
      {text}
    </text>
  );
  const control =
    gate.controlY !== null ? (
      <>
        <line
          x1={x}
          y1={gate.controlY}
          x2={x}
          y2={
            gate.type === "box"
              ? gate.controlY < gate.box.top
                ? gate.box.top
                : gate.box.bottom
              : gate.ys[0]
          }
          stroke={line}
          strokeWidth={1.8}
          strokeDasharray={look.dash}
        />
        <circle cx={x} cy={gate.controlY} r={5} fill={line} />
      </>
    ) : null;
  if (gate.type === "box") {
    return (
      <>
        {control}
        <rect
          x={gate.box.left}
          y={gate.box.top}
          width={gate.box.right - gate.box.left}
          height={gate.box.bottom - gate.box.top}
          rx={6}
          data-body=""
          fill={look.fill}
          stroke={line}
          strokeWidth={width}
          strokeDasharray={look.dash}
        />
        {glyph(gate.label ?? "", (gate.box.top + gate.box.bottom) / 2, BOX_SIZE)}
      </>
    );
  }
  if (gate.type === "cx") {
    const y = gate.ys[0];
    return (
      <>
        {control}
        <circle
          cx={x}
          cy={y}
          r={11}
          data-body=""
          fill={look.fill}
          stroke={line}
          strokeWidth={width}
          strokeDasharray={look.dash}
        />
        <line x1={x - 7} y1={y} x2={x + 7} y2={y} stroke={look.ink} strokeWidth={1.8} />
        <line x1={x} y1={y - 7} x2={x} y2={y + 7} stroke={look.ink} strokeWidth={1.8} />
      </>
    );
  }
  if (gate.type === "measure") {
    const y = gate.ys[0];
    return (
      <>
        <rect
          x={x - METER_WIDTH / 2}
          y={y - GATE / 2}
          width={METER_WIDTH}
          height={GATE}
          rx={5}
          data-body=""
          fill={look.fill}
          stroke={line}
          strokeWidth={width}
          strokeDasharray={look.dash}
        />
        <path
          d={`M${x - 9} ${y + 6} A 10 10 0 0 1 ${x + 9} ${y + 6}`}
          fill="none"
          stroke={look.ink}
          strokeWidth={1.4}
        />
        <line x1={x} y1={y + 6} x2={x + 7} y2={y - 8} stroke={look.ink} strokeWidth={1.6} />
      </>
    );
  }
  return (
    <>
      {gate.ys.map((y) => (
        <rect
          key={y}
          x={x - GATE / 2}
          y={y - GATE / 2}
          width={GATE}
          height={GATE}
          rx={5}
          data-body=""
          fill={look.fill}
          stroke={line}
          strokeWidth={width}
          strokeDasharray={look.dash}
        />
      ))}
      {gate.ys.map((y) => (
        <g key={`g${y}`}>{glyph((GATE_TEXT[gate.type] ?? gate.type).toUpperCase(), y)}</g>
      ))}
    </>
  );
}

/**
 * The chart's axis, its 50% and 100% grid lines and their ticks. A grid line is drawn only
 * between the slots, so it never runs through a bar or its percent.
 */
function ChartAxes({ chart }) {
  const gaps = [];
  let from = chart.left;
  for (const slot of chart.slots) {
    const half = Math.max(slot.width, 4 * SMALL_SIZE * 0.62) / 2 + 2;
    if (slot.x - half > from) gaps.push([from, slot.x - half]);
    from = slot.x + half;
  }
  if (chart.right > from) gaps.push([from, chart.right]);
  const bottom = chart.top + chart.height;
  return (
    <g data-layer="axes" pointerEvents="none">
      <line
        x1={chart.left}
        y1={bottom}
        x2={chart.right}
        y2={bottom}
        stroke={paletteVars.viz.edge}
        strokeWidth={1}
      />
      {[0.5, 1].map((share) => {
        const y = bottom - share * chart.height;
        return (
          <g key={share}>
            {gaps.map(([a, b]) => (
              <line
                key={a}
                x1={a}
                y1={y}
                x2={b}
                y2={y}
                stroke={paletteVars.viz.dim}
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            ))}
          </g>
        );
      })}
      {[
        [0, "0"],
        [0.5, "50%"],
        [1, "100%"],
      ].map(([share, text]) => (
        <text
          key={text}
          x={chart.left - 6}
          y={bottom - share * chart.height}
          data-tick=""
          textAnchor="end"
          dominantBaseline="central"
          fill={paletteVars.text.secondary}
          fontFamily={MONO}
          fontSize={SMALL_SIZE}
        >
          {text}
        </text>
      ))}
    </g>
  );
}

/**
 * The Legend's entries for what a Quantum Circuit draws besides states: the oracle box, the
 * bars by their amplitude's sign, the columns still to come, and the oracle calls, each only
 * when `frames` draw it. The Legend passes the step on screen alone (registry.js
 * pictureLegendFrames), so a Done lists no dashed gate once every column has run, nor bars it no
 * longer shows.
 * @param {Object|null} payload
 * @param {Object[]} frames
 * @param {{plain?: boolean}} [options] `plain`: before Run, when nothing is still to come.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function quantumAnnotations(payload, frames, { plain = false } = {}) {
  const list = Array.isArray(frames) ? frames.filter(Boolean) : [];
  const entries = [];
  const columns = Array.isArray(payload?.columns) ? payload.columns : [];
  if (columns.some((column) => (column.gates ?? []).some((gate) => gate?.oracle))) {
    entries.push({
      key: "oracle",
      text: "Oracle (the black box holding the function f)",
      swatch: { fill: paletteVars.surface.input, line: paletteVars.viz.violet },
    });
  }
  const signs = new Set(
    list.flatMap((frame) => (frame.bars ?? []).map((bar) => Math.sign(bar.sign))),
  );
  if (signs.has(1)) {
    entries.push({
      key: "positive",
      text: "Blue bar (an outcome's probability; its amplitude is positive)",
      swatch: { fill: barFill(1), line: barFill(1) },
    });
  }
  if (signs.has(-1)) {
    entries.push({
      key: "negative",
      text: "Orange bar (the same, with a negative amplitude)",
      swatch: { fill: barFill(-1), line: barFill(-1) },
    });
  }
  if (signs.has(0)) {
    entries.push({
      key: "plain",
      text: "Grey bar (an outcome's probability)",
      swatch: { fill: barFill(0), line: barFill(0) },
    });
  }
  // A gate is dashed when its column has not run and nothing gives it a state (as gateLook).
  const dashed = (frame) => {
    const applied = Number.isInteger(frame.applied) ? frame.applied : 0;
    return columns.some(
      (column, index) =>
        index >= applied &&
        (column.gates ?? []).some((gate) => {
          const own = stateOf(frame.gates, gate?.id);
          return (own !== "Background" ? own : stateOf(frame.columns, column.id)) === "Background";
        }),
    );
  };
  if (!plain && list.some(dashed)) {
    entries.push({
      key: "future",
      text: "Dashed grey gate (its column has not run)",
      swatch: { kind: "line", color: paletteVars.viz.dim, dash: "3 2" },
    });
  }
  if (list.some((frame) => Array.isArray(frame.queries) && frame.queries.length)) {
    entries.push({
      key: "query",
      text: "f(x) = y (an oracle call made classically)",
      swatch: { kind: "text", text: "f" },
    });
  }
  return entries;
}
