// components/pictures/quantumLayout.js
//
// #210: where the Quantum Circuit picture puts everything. A pure function of the payload, the
// run's frames and the width of the box it is drawn in: no randomness, no DOM, no React, so the
// same circuit always lands in the same place, before Run and at every step. Ported from Redux's
// design mockup (Documentation/Visualizations/mockups/quantum.js, `draw()` and `paintBars()`),
// not from its simulator: Redux sends each step's outcome probabilities, so this only places
// them.
//
// One wire per qubit, named at its left (its name over its role, then |0⟩), and the columns of
// gates left to right in the order they run, each as wide as its widest gate needs and as the
// stage it belongs to needs for its label (the dashed boxes over the columns: prepare, query
// once, ...). A wire is drawn in pieces between the gates on it, so no wire runs through a
// gate's letter. After the last column comes the room for the measured bits. Under the circuit:
// the outcome chart when Redux simulates the circuit (one slot per outcome of the measured
// qubits, so a bar never moves between steps), the oracle calls when the run makes any, and
// the answer so far when the run gives one; above it, the payload's note.
//
// The drawing is as wide as its box (between MIN_WIDTH and WIDTH, wider only when the circuit's
// columns need it), so on a phone a small circuit's text is drawn at its own size.

/** The drawing's width at most (and before the box is measured) and at least. */
export const WIDTH = 760;
export const MIN_WIDTH = 260;

/** The text sizes, and a character's width at each (the monospace font's 0.62 em). */
export const NAME_SIZE = 12.5;
export const SMALL_SIZE = 11;
export const GLYPH_SIZE = 13;
export const BOX_SIZE = 12;
export const TITLE_SIZE = 12;
export const NOTE_SIZE = 12;
export const HEAD_SIZE = 11;
const CHAR = 0.62;

/** The distance between two wires, a gate's box, a meter's box. */
const WIRE = 44;
export const GATE = 28;
export const METER_WIDTH = 30;
/** A box gate's margin over its first and last wire. */
export const BOX_OVER = 16;

/** A column's width at least and at most, and the gap a gate keeps from the next column. */
const MIN_COLUMN = 36;
const MAX_COLUMN = 74;
const COLUMN_GAP = 8;

/** The margin at the drawing's edges. */
const PAD = 10;
/** How far a stage's dashed box reaches over the first wire and under the last. */
const STAGE_OVER = 24;
/** The room after the last column, for the measured bits. */
const OUT_ROOM = 20;

/** The outcome chart: its height, and the most slots it draws (the rest are listed). */
const CHART_HEIGHT = 120;
const MAX_SLOTS = 64;

/** A row of the oracle calls list, and a line of the note. */
export const QUERY_ROW = 20;
const NOTE_LINE = 17;

function round(value) {
  return Math.round(value * 100) / 100;
}

export function textWidth(text, size) {
  return String(text).length * size * CHAR;
}

/** `value` as `bits` binary digits (`5`, 3 -> `101`). */
export function bitString(value, bits) {
  return Number(value).toString(2).padStart(Math.max(1, bits), "0");
}

/** An oracle call's input as the payload's readout writes it: bits, or `0` for no input bits. */
export function queryText(query, inputBits) {
  const input = inputBits > 0 ? bitString(query.input, inputBits) : String(query.input);
  return `f(${input}) = ${query.output}`;
}

/** `text` broken into lines of at most `max` characters, at spaces. */
function wrap(text, max) {
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > max) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** The qubits a gate covers: from its first to its last qubit, its control too. */
export function gateSpan(gate) {
  const all = [...gate.qubits, ...(Number.isInteger(gate.control) ? [gate.control] : [])];
  return { from: Math.min(...all), to: Math.max(...all) };
}

/**
 * The Quantum Circuit picture's layout.
 * @param {Object} payload The Quantum Circuit payload (`qubits`, `columns`, `stages`, `measure`,
 *   `readout`, `inputBits`, `simulated`, `note`).
 * @param {Object[]} [frames] The run's frames (none before Run).
 * @param {number|null} [width] The width of the box it is drawn in, in CSS px (WIDTH until it is
 *   measured).
 */
export function layoutQuantum(payload, frames = [], width = WIDTH) {
  const target = Math.round(Math.min(WIDTH, Math.max(MIN_WIDTH, width || WIDTH)));
  const qubits = (Array.isArray(payload?.qubits) ? payload.qubits : []).filter(
    (qubit) => typeof qubit?.id === "string",
  );
  const count = qubits.length;
  const columns = (Array.isArray(payload?.columns) ? payload.columns : [])
    .filter((column) => typeof column?.id === "string")
    .map((column) => ({
      id: column.id,
      gates: (Array.isArray(column.gates) ? column.gates : []).filter(
        (gate) =>
          typeof gate?.id === "string" &&
          Array.isArray(gate.qubits) &&
          gate.qubits.length &&
          gate.qubits.every((q) => Number.isInteger(q) && q >= 0 && q < count) &&
          (gate.control === undefined ||
            (Number.isInteger(gate.control) && gate.control >= 0 && gate.control < count)),
      ),
    }));
  const stages = (Array.isArray(payload?.stages) ? payload.stages : []).filter(
    (stage) =>
      Number.isInteger(stage?.from) &&
      Number.isInteger(stage?.to) &&
      stage.from >= 0 &&
      stage.to < columns.length &&
      stage.from <= stage.to,
  );
  const measure = (Array.isArray(payload?.measure) ? payload.measure : []).filter(
    (q) => Number.isInteger(q) && q >= 0 && q < count,
  );
  const list = Array.isArray(frames) ? frames.filter(Boolean) : [];
  const inputBits = Number.isInteger(payload?.inputBits) ? payload.inputBits : 0;

  // The names at the wires' left: the name over the role, then |0⟩.
  const labelWidth = Math.max(
    0,
    ...qubits.map((qubit) =>
      Math.max(
        textWidth(qubit.name ?? qubit.id, NAME_SIZE),
        textWidth(qubit.role ?? "", SMALL_SIZE),
      ),
    ),
  );
  const ketWidth = textWidth("|0⟩", NAME_SIZE);
  const nameX = PAD + labelWidth;
  const ketX = nameX + 8;

  // Each column as wide as its widest gate needs, the rest sharing what is left of the room.
  const gateWidth = (gate) => {
    if (gate.type === "box") return Math.max(40, textWidth(gate.label ?? "", BOX_SIZE) + 12);
    if (gate.type === "measure") return METER_WIDTH;
    return GATE;
  };
  const needs = columns.map((column) =>
    Math.max(MIN_COLUMN, ...column.gates.map((gate) => gateWidth(gate) + COLUMN_GAP)),
  );
  const columnsFrom = (start) => {
    const room = target - start - 4 - OUT_ROOM - PAD;
    let base = room / Math.max(1, columns.length);
    for (let pass = 0; pass < 3; pass += 1) {
      const wide = needs.filter((need) => need > base);
      const rest = columns.length - wide.length;
      if (rest > 0) base = (room - wide.reduce((sum, need) => sum + need, 0)) / rest;
    }
    base = Math.min(MAX_COLUMN, Math.max(MIN_COLUMN, base));
    const widths = needs.map((need) => Math.max(base, need));
    return { widths, total: start + 4 + widths.reduce((sum, w) => sum + w, 0) + OUT_ROOM + PAD };
  };
  // The |0⟩ before each wire, unless the box is too narrow for it (a phone).
  let wireStart = round(ketX + ketWidth + 6);
  let fitted = columnsFrom(wireStart);
  const ket = fitted.total <= target;
  if (!ket) {
    wireStart = round(nameX + 8);
    fitted = columnsFrom(wireStart);
  }
  const { widths } = fitted;
  const drawingWidth = Math.max(target, Math.ceil(fitted.total));

  // The note, wrapped to the drawing, over everything.
  const noteLines = payload?.note
    ? wrap(payload.note, Math.max(20, Math.floor((drawingWidth - 2 * PAD) / (NOTE_SIZE * CHAR))))
    : [];
  let y = PAD + noteLines.length * NOTE_LINE + (noteLines.length ? 6 : 0);
  const note = noteLines.map((line, i) => ({ text: line, y: round(PAD + i * NOTE_LINE + 8) }));

  // The circuit. A stage's label is centred over its box, on a second row when it would meet
  // the label before it.
  const spans = [];
  {
    let at = wireStart + 4;
    for (const w of widths) {
      spans.push([at, at + w]);
      at += w;
    }
  }
  const rowEnds = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  const stageRows = stages.map((stage) => {
    const half = textWidth(stage.label ?? "", SMALL_SIZE) / 2;
    const centre = Math.min(
      drawingWidth - PAD - half,
      Math.max(PAD + half, (spans[stage.from][0] + spans[stage.to][1]) / 2),
    );
    const row = centre - half >= rowEnds[0] + 8 ? 0 : 1;
    rowEnds[row] = centre + half;
    return { row, centre };
  });
  const twoRows = stageRows.some((stage) => stage.row === 1);
  const stageHeadY = round(y + 8 + (twoRows ? 15 : 0));
  const wireTop = y + (stages.length ? 26 + STAGE_OVER : 22) + (twoRows ? 15 : 0);
  const wireY = (k) => round(wireTop + k * WIRE);
  const laidColumns = [];
  let at = wireStart + 4;
  columns.forEach((column, c) => {
    const x = round(at + widths[c] / 2);
    laidColumns.push({
      id: column.id,
      index: c,
      x,
      left: round(at),
      right: round(at + widths[c]),
      gates: column.gates.map((gate) => {
        const span = gateSpan(gate);
        const w = gateWidth(gate);
        const box =
          gate.type === "box"
            ? {
                left: round(x - w / 2),
                right: round(x + w / 2),
                top: round(wireY(Math.min(...gate.qubits)) - BOX_OVER),
                bottom: round(wireY(Math.max(...gate.qubits)) + BOX_OVER),
              }
            : gate.type === "cx"
              ? { left: round(x - 11), right: round(x + 11), top: 0, bottom: 0 }
              : { left: round(x - w / 2), right: round(x + w / 2), top: 0, bottom: 0 };
        return {
          ...gate,
          column: column.id,
          x,
          box,
          from: span.from,
          to: span.to,
          ys: gate.qubits.map(wireY),
          controlY: Number.isInteger(gate.control) ? wireY(gate.control) : null,
        };
      }),
    });
    at += widths[c];
  });
  const circuitRight = round(at);
  const wiresBottom = count ? wireY(count - 1) : wireTop - WIRE / 2;

  // Each wire in pieces: broken under every gate on it, and under a box that spans it.
  const wireEnd = round(circuitRight + 4);
  const wires = qubits.map((qubit, k) => {
    const cuts = [];
    for (const column of laidColumns) {
      for (const gate of column.gates) {
        const on =
          gate.type === "box"
            ? k >= Math.min(...gate.qubits) && k <= Math.max(...gate.qubits)
            : gate.type === "cx"
              ? gate.qubits.includes(k)
              : gate.qubits.includes(k);
        if (on) cuts.push([gate.box.left, gate.box.right]);
      }
    }
    cuts.sort((a, b) => a[0] - b[0]);
    const pieces = [];
    let from = wireStart;
    for (const [left, right] of cuts) {
      if (left > from) pieces.push([round(from), round(left)]);
      from = Math.max(from, right);
    }
    if (wireEnd > from) pieces.push([round(from), wireEnd]);
    return {
      id: qubit.id,
      index: k,
      name: String(qubit.name ?? qubit.id),
      role: String(qubit.role ?? ""),
      y: wireY(k),
      pieces,
      measured: measure.indexOf(k),
    };
  });
  const laidStages = stages.map((stage, i) => {
    const left = round(laidColumns[stage.from].left + 3);
    const right = round(laidColumns[stage.to].right - 3);
    return {
      label: String(stage.label ?? ""),
      from: stage.from,
      to: stage.to,
      left,
      right,
      top: round(wireTop - STAGE_OVER),
      bottom: round(wiresBottom + STAGE_OVER),
      headX: round(stageRows[i].centre),
      headY: round(stageHeadY - stageRows[i].row * 15),
    };
  });
  y = count ? wiresBottom + (stages.length ? STAGE_OVER : 0) + 26 : y;

  // The outcome chart: a slot per outcome of the measured qubits (up to 5 of them), or per
  // outcome any step lists, so a bar keeps its place while the steps play.
  const bits = measure.length;
  const anyBars = list.some((frame) => Array.isArray(frame.bars) && frame.bars.length);
  const anyCounts = list.some((frame) => frame.counts && Object.keys(frame.counts).length);
  let chart = null;
  if (bits && (payload?.simulated || anyBars || anyCounts)) {
    let outcomes;
    if (bits <= 5) {
      outcomes = Array.from({ length: 2 ** bits }, (_, i) => i);
    } else {
      const seen = new Set();
      for (const frame of list) {
        for (const bar of frame.bars ?? []) seen.add(bar.outcome);
        for (const key of Object.keys(frame.counts ?? {})) {
          if (/^[01]+$/.test(key)) seen.add(Number.parseInt(key, 2));
        }
        if (Number.isInteger(frame.outcome)) seen.add(frame.outcome);
      }
      outcomes = [...seen].sort((a, b) => a - b);
    }
    const slots = outcomes.slice(0, MAX_SLOTS);
    const left = PAD + textWidth("100%", SMALL_SIZE) + 8;
    const right = drawingWidth - PAD;
    const slot = (right - left) / Math.max(1, slots.length);
    const decimal = payload?.readout === "decimal";
    const label = (outcome) => (decimal ? String(outcome) : bitString(outcome, bits));
    const labelWidth = Math.max(...slots.map((o) => textWidth(label(o), SMALL_SIZE)), 1);
    const every = Math.max(1, Math.ceil((labelWidth + 4) / slot));
    const titleY = round(y + 10);
    const top = y + 40;
    const names = measure.map((q) => qubits[q].name ?? qubits[q].id).join("");
    let title = decimal
      ? "Probability of each reading of the count qubits"
      : `Probability of each outcome on ${names}`;
    if (textWidth(title, TITLE_SIZE) > drawingWidth - 2 * PAD)
      title = "Probability of each outcome";
    chart = {
      left: round(left),
      right: round(right),
      top: round(top),
      height: CHART_HEIGHT,
      titleY,
      title,
      percents: slot >= textWidth("100%", SMALL_SIZE) + 4,
      slots: slots.map((outcome, i) => {
        const x = left + slot * i + slot / 2;
        return {
          outcome,
          label: label(outcome),
          showLabel: i % every === 0,
          x: round(x),
          width: round(Math.min(42, slot * 0.7)),
        };
      }),
      more: outcomes.length - slots.length,
      labelY: round(top + CHART_HEIGHT + 14),
      countY: round(top + CHART_HEIGHT + 30),
    };
    y = top + CHART_HEIGHT + (anyCounts ? 44 : 28);
  }

  // The oracle calls, as many to a row as fit.
  const most = Math.max(
    0,
    ...list.map((frame) => (Array.isArray(frame.queries) ? frame.queries.length : 0)),
  );
  let queries = null;
  if (most) {
    const longest = Math.max(
      ...list.flatMap((frame) => (frame.queries ?? []).map((q) => queryText(q, inputBits).length)),
    );
    const cell = textWidth("0".repeat(longest), TITLE_SIZE) + 18;
    const perRow = Math.max(1, Math.floor((drawingWidth - 2 * PAD + 8) / cell));
    const headY = round(y + 8);
    const top = y + 22;
    queries = {
      headY,
      cells: Array.from({ length: most }, (_, i) => ({
        x: round(PAD + (i % perRow) * cell),
        y: round(top + Math.floor(i / perRow) * QUERY_ROW + QUERY_ROW / 2),
        width: round(cell - 8),
      })),
    };
    y = top + Math.ceil(most / perRow) * QUERY_ROW + 6;
  }

  // The answer so far.
  let result = null;
  if (list.some((frame) => typeof frame.result === "string" && frame.result)) {
    result = { headY: round(y + 8), y: round(y + 26) };
    y += 38;
  }

  return {
    minX: 0,
    minY: 0,
    width: drawingWidth,
    height: Math.ceil(Math.max(y, PAD + 40) + PAD),
    note,
    nameX: round(nameX),
    ketX: ket ? round(ketX) : null,
    wires,
    columns: laidColumns,
    stages: laidStages,
    outX: round(circuitRight + 10),
    chart,
    queries,
    result,
    measure,
    bits,
  };
}
