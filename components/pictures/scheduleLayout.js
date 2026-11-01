// components/pictures/scheduleLayout.js
//
// #211: where the Schedule picture puts everything. A pure function of the payload, the width of
// the box it is drawn in and the run's frames: no randomness, no DOM, no React, so the same
// instance always lands in the same place, before Run and at every step. Ported from Redux's
// design mockup (Documentation/Visualizations/mockups/schedule.js, `drawJob` and `drawPump`),
// not from its parser or solvers.
//
// Time runs left to right, to scale, in both shapes:
//   - Job Sequencing: one row per job, its name and running time at the left and its penalty at
//     the right; the plot between them is the time axis from 0 to the payload's `span`, with a
//     grid at a round step whose numbers keep apart at the drawing's width.
//   - Pump Scheduling: the hours along the top, the demand under them, a row of 24 cells per
//     pump, then the tank level and the cost of each hour charted underneath on the same axis.
//     The tank's scale runs from the lowest level to the highest any frame of the run reaches
//     (the capacity and 0 at least), and the cost's to the dearest hour of any frame, so neither
//     moves while the steps walk (they may change once, when Run brings the levels).
//
// Every text sits outside the plots (the axes' numbers left and right of them, the headings
// above them, the hours and the demand above the cells), so no line the run draws can cross
// one. The tank's limits are labelled by value on its axis, and the Legend names them.
//
// The drawing is as wide as its box (between MIN_WIDTH and WIDTH), so on a phone its text is
// drawn at its own size, not shrunk to fit: the hour labels thin out to every few hours, the
// demand is written once per run of equal hours, and a pump's flow goes under its name.

/** The drawing's width at most (and before the box is measured) and at least. */
export const WIDTH = 760;
export const MIN_WIDTH = 260;

/** The text sizes, and a character's width at each (the monospace font's 0.62 em). */
export const LABEL_SIZE = 12.5;
export const SMALL_SIZE = 11;
export const HEAD_SIZE = 11;
const CHAR = 0.62;
/** The headings' letter spacing, in em. */
export const HEAD_SPACING = 0.06;

/** The margin at the drawing's left and right edges. */
const PAD = 12;

/** Job Sequencing: a row's height, and the run bars' inset from its top and bottom. */
export const JOB_ROW = 34;
export const BAR_INSET = 7;

/** Pump Scheduling: the hours in a day, and a cell's narrowest. */
export const HOURS = 24;
const MIN_CELL = 6;
/** A pump row's height with its flow beside its name, and under it. */
const PUMP_ROW = 26;
const PUMP_ROW_STACKED = 36;
/** The tank's and the cost's plot heights. */
const TANK_HEIGHT = 132;
const COST_HEIGHT = 84;

function round(value) {
  return Math.round(value * 100) / 100;
}

/** How wide `text` is at `size`, in drawing units. */
export function textWidth(text, size) {
  return String(text).length * size * CHAR;
}

/** How wide a heading is (its letters spaced out). */
export function headWidth(text) {
  return String(text).length * HEAD_SIZE * (CHAR + HEAD_SPACING);
}

/** Gallons as the picture writes them: 4,950, or 0.25 for a fraction. */
export function formatGallons(value) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Money as the picture writes it: $32.12. */
export function formatMoney(value) {
  const amount = Math.abs(Number(value)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value < 0 ? "-" : ""}$${amount}`;
}

/** An hour's demand in its cell: 600, 0.3, or 1k and 1.5k from a thousand up. */
export function formatDemand(value) {
  if (value >= 1000) return `${Number((value / 1000).toFixed(1))}k`;
  return formatGallons(value);
}

/** The round steps (1, 2, 5 times a power of ten) from about `rough` up. */
function* niceSteps(rough) {
  let power = 10 ** Math.floor(Math.log10(rough > 0 ? rough : 1));
  for (;;) {
    for (const factor of [1, 2, 5]) {
      if (factor * power >= rough * 0.999) yield factor * power;
    }
    power *= 10;
  }
}

/** The values from `low` to `high` at `step`. */
function ticksOf(low, high, step) {
  const ticks = [];
  for (let k = Math.ceil(low / step - 1e-9); k * step <= high + 1e-9; k += 1) {
    ticks.push(Number((k * step).toPrecision(12)));
  }
  return ticks;
}

/** A number at `step`'s precision, with thousands separators. */
function tickText(value, step) {
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const text = Number(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return text === "-0" ? "0" : text;
}

/** The drawing's width for a box `width` wide. */
function drawingWidthFor(width) {
  return Math.round(Math.min(WIDTH, Math.max(MIN_WIDTH, width || WIDTH)));
}

/**
 * The Schedule picture's layout: Job Sequencing's or Pump Scheduling's, by the payload's `rule`.
 * @param {Object} payload The Schedule payload.
 * @param {number|null} [width] The width of the box it is drawn in, in CSS px (WIDTH until it is
 *   measured).
 * @param {Object[]} [frames] The run's frames (none before Run): Pump Scheduling's scales hold
 *   every level and cost they reach.
 */
export function layoutSchedule(payload, width = WIDTH, frames = []) {
  return payload?.rule === "jobSequencing" || Array.isArray(payload?.jobs)
    ? layoutJobs(payload, width)
    : layoutPumps(payload, width, frames);
}

// ---- Job Sequencing ------------------------------------------------------------------------

/**
 * @returns {{kind: "jobs", minX: number, minY: number, width: number, height: number,
 *   plot: {x: number, y: number, width: number, height: number}, span: number,
 *   heads: {y: number, job: number, penalty: number}, toX: Function,
 *   rows: Array<{id: string, label: string, time: number, deadline: number, penalty: number,
 *     y: number, cy: number, timeX: number|null, deadlineX: number}>,
 *   ticks: Array<{value: number, text: string, at: number}>, tickY: number, axisY: number}}
 */
function layoutJobs(payload, width) {
  const jobs = (Array.isArray(payload?.jobs) ? payload.jobs : []).filter(
    (job) =>
      typeof job?.id === "string" &&
      Number.isFinite(job.time) &&
      Number.isFinite(job.deadline) &&
      Number.isFinite(job.penalty),
  );
  const fromJobs = Math.max(
    jobs.reduce((sum, job) => sum + Math.max(0, job.time), 0),
    ...jobs.map((job) => job.deadline),
    0,
  );
  const span = Number.isFinite(payload?.span) && payload.span > 0 ? payload.span : fromJobs || 1;
  const labelOf = (job) => (typeof job.label === "string" && job.label ? job.label : job.id);

  const labelW = Math.max(0, ...jobs.map((job) => textWidth(labelOf(job), LABEL_SIZE)));
  const timeW = Math.max(0, ...jobs.map((job) => textWidth(`t=${job.time}`, SMALL_SIZE)));
  const penaltyW = Math.max(
    headWidth("PENALTY"),
    ...jobs.map((job) => textWidth(job.penalty, LABEL_SIZE)),
  );
  const right = Math.ceil(12 + penaltyW + PAD);
  const target = drawingWidthFor(width);
  // Each job's running time beside its name, unless that leaves the plot under 180 wide (a
  // phone): its bar's length shows it, and the readout says it.
  const withTime = target - Math.ceil(PAD + labelW + 8 + timeW + 12) - right >= 180;
  const left = Math.ceil(
    PAD + Math.max(labelW, headWidth("JOB")) + (withTime ? 8 + timeW : 0) + 12,
  );
  // A plot at least 80 wide: on a box too narrow for that the drawing is wider than the box.
  const drawingWidth = Math.max(target, left + right + 80);
  const plot = {
    x: left,
    y: 30,
    width: drawingWidth - left - right,
    height: jobs.length * JOB_ROW,
  };
  const scale = plot.width / span;
  const toX = (t) => round(plot.x + t * scale);

  // The roundest step (from about eight lines across) whose numbers keep apart.
  let step = 1;
  for (const candidate of niceSteps(Math.max(1, span / 8))) {
    const widest = Math.max(
      ...ticksOf(0, span, candidate).map((value) => textWidth(tickText(value, 1), SMALL_SIZE)),
    );
    if (candidate * scale >= widest + 10) {
      step = candidate;
      break;
    }
  }
  const ticks = ticksOf(0, span, step).map((value) => ({
    value,
    text: tickText(value, Math.max(1, step)),
    at: toX(value),
  }));

  const rows = jobs.map((job, index) => {
    const y = plot.y + index * JOB_ROW;
    return {
      id: job.id,
      label: labelOf(job),
      time: job.time,
      deadline: job.deadline,
      penalty: job.penalty,
      y,
      cy: y + JOB_ROW / 2,
      timeX: withTime ? PAD + labelW + 8 : null,
      deadlineX: toX(Math.min(span, Math.max(0, job.deadline))),
    };
  });
  const axisY = plot.y + plot.height;
  return {
    kind: "jobs",
    minX: 0,
    minY: 0,
    width: drawingWidth,
    height: Math.ceil(axisY + 46),
    plot,
    span,
    heads: { y: 14, job: PAD, penalty: plot.x + plot.width + 12 },
    toX,
    rows,
    ticks,
    tickY: axisY + 14,
    axisY,
  };
}

// ---- Pump Scheduling -----------------------------------------------------------------------

/** Every number a run's frames draw on the tank's and the cost's scales. */
function runExtents(frames) {
  const levels = [];
  const costs = [];
  for (const frame of Array.isArray(frames) ? frames : []) {
    for (const hour of Array.isArray(frame?.schedule) ? frame.schedule : []) {
      if (Number.isFinite(hour?.level)) levels.push(hour.level);
      const cost = (Number(hour?.energy) || 0) + (Number(hour?.startup) || 0);
      if (Number.isFinite(cost)) costs.push(cost);
    }
    for (const reached of Array.isArray(frame?.reached) ? frame.reached : []) {
      if (Number.isFinite(reached?.low)) levels.push(reached.low);
      if (Number.isFinite(reached?.high)) levels.push(reached.high);
    }
  }
  return { levels, costs };
}

/**
 * The hours labelled along the top: every `step` hours (the fewest that keep the labels apart),
 * the first starting at the plot's left edge, the rest centred on their hour's left edge, and
 * 24:00 ending at the plot's right edge when it has room.
 */
function hourLabels(toX) {
  const w = textWidth("00:00", SMALL_SIZE);
  for (const step of [1, 2, 3, 4, 6, 8, 12]) {
    const labels = [];
    for (let h = 0; h <= HOURS; h += step) {
      const text = `${String(h).padStart(2, "0")}:00`;
      const at = toX(h);
      const anchor = h === 0 ? "start" : h === HOURS ? "end" : "middle";
      const x0 = anchor === "start" ? at : anchor === "end" ? at - w : at - w / 2;
      labels.push({ hour: h, text, at, anchor, x0, x1: x0 + w });
    }
    const apart = labels.every((label, i) => i === 0 || label.x0 >= labels[i - 1].x1 + 4);
    if (apart) return labels;
    // Without 24:00, if only it is in the way.
    const shorter = labels.filter((label) => label.hour !== HOURS);
    if (shorter.every((label, i) => i === 0 || label.x0 >= shorter[i - 1].x1 + 4)) {
      return shorter;
    }
  }
  return [{ hour: 0, text: "00:00", at: toX(0), anchor: "start", x0: toX(0), x1: toX(0) + w }];
}

/**
 * The demand written over the cells: each hour's, when every one fits its cell, else once per
 * run of equal hours, centred over the run, where the run is wide enough.
 */
function demandLabels(hours, toX, cell) {
  const texts = hours.map((hour) => formatDemand(hour.demand));
  if (texts.every((text) => textWidth(text, SMALL_SIZE) <= cell - 2)) {
    return texts.map((text, h) => ({ key: `d${h}`, text, at: toX(h) + cell / 2, from: h, to: h }));
  }
  const labels = [];
  let from = 0;
  for (let h = 1; h <= hours.length; h += 1) {
    if (h === hours.length || hours[h].demand !== hours[from].demand) {
      const text = texts[from];
      if (textWidth(text, SMALL_SIZE) <= (h - from) * cell - 4) {
        labels.push({ key: `d${from}`, text, at: (toX(from) + toX(h)) / 2, from, to: h - 1 });
      }
      from = h;
    }
  }
  return labels;
}

/**
 * The numbers down a plot's left side: round values at a step whose numbers keep apart, and
 * `marks` (the tank's limits) always, a round value too near a mark giving way to it.
 */
function axisTicks(low, high, toY, height, marks = []) {
  const perUnit = height / (high - low || 1);
  let step = 1;
  for (const candidate of niceSteps((high - low) / 4 || 1)) {
    if (candidate * perUnit >= 16) {
      step = candidate;
      break;
    }
  }
  const marked = marks.map((mark) => ({
    value: mark.value,
    text: formatGallons(mark.value),
    at: round(toY(mark.value)),
    mark: mark.kind,
  }));
  const plain = ticksOf(low, high, step)
    .map((value) => ({ value, text: tickText(value, step), at: round(toY(value)), mark: null }))
    .filter((tick) => !marked.some((mark) => Math.abs(mark.at - tick.at) < SMALL_SIZE + 3));
  return [...plain, ...marked].sort((a, b) => b.at - a.at);
}

/**
 * @returns {{kind: "pumps", minX: number, minY: number, width: number, height: number,
 *   cell: number, toX: Function, plot: {x: number, width: number}, stacked: boolean,
 *   hourY: number, demand: {y: number, labelX: number, label: string,
 *     labels: Array<{key: string, text: string, at: number}>},
 *   hourLabels: Array<{hour: number, text: string, at: number, anchor: string}>,
 *   rows: Array<{id: string, name: string, flowText: string, y: number, height: number,
 *     nameY: number, flowX: number, flowY: number}>, rowsTop: number, rowsBottom: number,
 *   columnTop: number, columnBottom: number,
 *   tank: {top: number, height: number, head: number, low: number, high: number, toY: Function,
 *     ticks: Array<{value: number, text: string, at: number, mark: string|null}>,
 *     capacity: number, minimum: number, level: number},
 *   cost: {top: number, height: number, head: number, max: number, toY: Function,
 *     ticks: Array<{value: number, text: string, at: number}>,
 *     share: Array<{value: number, text: string, at: number}>|null},
 *   hours: Array<{id: string, label: string, demand: number, peak: boolean}>}}
 */
function layoutPumps(payload, width, frames) {
  const hours = (Array.isArray(payload?.hours) ? payload.hours : [])
    .slice(0, HOURS)
    .map((hour, h) => ({
      id: typeof hour?.id === "string" ? hour.id : `t${h}`,
      label: typeof hour?.label === "string" ? hour.label : `${String(h).padStart(2, "0")}:00`,
      demand: Number.isFinite(hour?.demand) ? hour.demand : 0,
      peak: hour?.peak === true,
    }));
  const pumps = (Array.isArray(payload?.pumps) ? payload.pumps : []).filter(
    (pump) => typeof pump?.id === "string",
  );
  const tankIn = payload?.tank ?? {};
  const capacity = Number.isFinite(tankIn.capacity) ? tankIn.capacity : 0;
  const minimum = Number.isFinite(tankIn.minimum) ? tankIn.minimum : 0;
  const level = Number.isFinite(tankIn.level) ? tankIn.level : 0;
  const withBudget = payload?.rule === "emergencyResilience";

  const nameOf = (pump) => (typeof pump.name === "string" && pump.name ? pump.name : pump.id);
  const flowOf = (pump) => `${formatGallons(Number(pump.flow) || 0)} gph`;
  const nameW = Math.max(0, ...pumps.map((pump) => textWidth(nameOf(pump), LABEL_SIZE)));
  const flowW = Math.max(0, ...pumps.map((pump) => textWidth(flowOf(pump), SMALL_SIZE)));
  const right = withBudget ? Math.ceil(PAD + textWidth("100%", SMALL_SIZE) + 6) : PAD + 2;
  const target = drawingWidthFor(width);

  // The tank's and the cost's numbers down the left (sized from the widest they can write).
  const { levels, costs } = runExtents(frames);
  const low = Math.min(0, minimum, ...levels);
  const high = Math.max(capacity, level, ...levels, low + 1);
  const costMax = Math.max(0.01, ...costs);

  // The flow beside the name when the cells keep 16 units that way, else under it.
  const inlineLeft = PAD + Math.max(nameW + 8 + flowW, textWidth("Demand gal/h", SMALL_SIZE)) + 10;
  const stacked = target - inlineLeft - right < HOURS * 16;
  const demandLabel = stacked ? "Demand" : "Demand gal/h";
  const axisW = (value) => textWidth(value, SMALL_SIZE) + 10;
  const numbersW = Math.max(
    axisW(formatGallons(low)),
    axisW(formatGallons(high)),
    axisW(formatGallons(capacity)),
    axisW(tickText(costMax, 0.01)),
  );
  const left = Math.ceil(
    Math.max(
      stacked ? PAD + Math.max(nameW, flowW, textWidth(demandLabel, SMALL_SIZE)) + 10 : inlineLeft,
      PAD + numbersW,
    ),
  );
  const drawingWidth = Math.max(target, left + right + HOURS * MIN_CELL);
  const cell = (drawingWidth - left - right) / HOURS;
  const toX = (h) => round(left + h * cell);

  const rowHeight = stacked ? PUMP_ROW_STACKED : PUMP_ROW;
  const hourY = 12;
  const demandY = 34;
  const rowsTop = 48;
  const rows = pumps.map((pump, index) => {
    const y = rowsTop + index * rowHeight;
    return {
      id: pump.id,
      name: nameOf(pump),
      flowText: flowOf(pump),
      y,
      height: rowHeight,
      nameY: stacked ? y + 11 : y + rowHeight / 2,
      flowX: stacked ? PAD : PAD + nameW + 8,
      flowY: stacked ? y + 26 : y + rowHeight / 2,
    };
  });
  const rowsBottom = rowsTop + pumps.length * rowHeight;

  const tankTop = rowsBottom + 40;
  const tankHeight = TANK_HEIGHT;
  const toTankY = (value) =>
    round(tankTop + tankHeight - ((value - low) / (high - low)) * tankHeight);
  const marks = [{ value: capacity, kind: "capacity" }];
  if (minimum > 0) marks.push({ value: minimum, kind: "minimum" });
  const tankTicks = axisTicks(low, high, toTankY, tankHeight, marks);

  const costTop = tankTop + tankHeight + 42;
  const costHeight = COST_HEIGHT;
  const toCostY = (value) => round(costTop + costHeight - (value / costMax) * costHeight);
  // No numbers on the cost's axis until some frame has a cost to read off it.
  const costTicks = costs.some((value) => value > 0)
    ? axisTicks(0, costMax, toCostY, costHeight).map((tick) => ({
        value: tick.value,
        text: tick.text,
        at: tick.at,
      }))
    : [];
  const share = withBudget
    ? [0, 50, 100].map((percent) => ({
        value: percent,
        text: `${percent}%`,
        at: round(costTop + costHeight - (percent / 100) * costHeight),
      }))
    : null;

  return {
    kind: "pumps",
    minX: 0,
    minY: 0,
    width: Math.round(drawingWidth),
    height: Math.ceil(costTop + costHeight + 10),
    cell: round(cell),
    toX,
    plot: { x: left, width: round(cell * HOURS) },
    stacked,
    hourY,
    hourLabels: hourLabels(toX),
    demand: {
      y: demandY,
      labelX: PAD,
      label: demandLabel,
      labels: demandLabels(hours, toX, cell),
    },
    rows,
    rowsTop,
    rowsBottom,
    columnTop: demandY - 12,
    columnBottom: costTop + costHeight,
    tank: {
      top: tankTop,
      height: tankHeight,
      head: tankTop - 20,
      low,
      high,
      toY: toTankY,
      ticks: tankTicks,
      capacity,
      minimum,
      level,
    },
    cost: {
      top: costTop,
      height: costHeight,
      head: costTop - 20,
      max: costMax,
      toY: toCostY,
      ticks: costTicks,
      share,
    },
    hours,
  };
}
