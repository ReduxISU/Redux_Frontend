// components/pictures/ScheduleRenderer.js
//
// #211: the Schedule picture type (ReduxISU/Redux#673), Redux's PICTURE-TYPES.md "Schedule".
// Time runs left to right, drawn to scale, in two shapes told apart by the payload's `rule`:
//   - jobSequencing (Job Sequencing): one row per job. Its bar is when it runs on the one
//     machine, back to back from 0 in the frame's order (`runs`), the tick is its deadline, and
//     the part of a bar past its deadline is drawn solid red: that job is late and its penalty
//     counts. A job's state (`jobs`: an id that is absent is Background) is its bar's fill.
//   - costMinimization and emergencyResilience (Pump Scheduling): a row of 24 hourly cells per
//     pump, with the tank level and the cost of each hour charted underneath on the same axis.
//     Shaded hours are the peak tariff. During the forward pass a band shows the tank levels the
//     dynamic program can still reach (`reached`); once the solver has a schedule each pump's
//     cells are on or off (`schedule`), a corner mark shows a pump starting (and paying its
//     startup cost), and the hours are replayed one by one (`upTo`: the hours after it are drawn
//     faded, and have no tank level or cost yet). Emergency Resilience adds the share of its
//     budget spent, on the cost chart's right axis. A cell's state (`cells`, `P1t0`...) is its
//     fill; an hour's (`hours`) tints its column, and the step's focus hour is outlined.
//
// Layout is scheduleLayout.js's pure function of the payload, the box's width and the run's
// frames. Hovering, focusing or tapping a job or an hour traces it: it is outlined in the trace
// color and read out above the picture, and the other jobs or hours fade by color. The diagram
// opens fitted to its box and zooms and pans with DiagramZoom.js; on a phone it is laid out at
// the box's width, so its text keeps its size.
//
// #250: nothing here can be dragged. Where a bar or a cell sits is its time, which is the data
// itself (and the rows are the instance's jobs and pumps in its own order), so a moved piece
// would only draw a schedule that is not the one the solver made.
//
// #239: a gadget's pieces (`highlightIds`, `gadgetColors`; gadgetRings.js) get a ring: a job's
// whole row (label, bar and deadline) just inside the row, a pump's row of hourly cells just
// outside the strip, and an hourly cell on its own outline.

import Box from "@mui/material/Box";
import { useMemo, useRef, useState } from "react";
import { paletteVars } from "../theme";
import DiagramZoom from "./DiagramZoom";
import { GadgetRect, useGadgetMarks } from "./gadgetRings";
import { FAINT_FILTER, MONO, TRACE_COLOR } from "./graphPieces";
import { pictureStateStyle, stateOf } from "./pictureStates";
import {
  BAR_INSET,
  formatGallons,
  formatMoney,
  HEAD_SIZE,
  HEAD_SPACING,
  HOURS,
  JOB_ROW,
  LABEL_SIZE,
  layoutSchedule,
  SMALL_SIZE,
} from "./scheduleLayout";
import { useBoxWidth } from "./useBoxWidth";

/** How much of a color tints a peak hour's column, and a Rejected hour's. */
const PEAK_TINT = 16;
const HOUR_TINT = 55;

/** The tank's limits' dashes. */
const LIMIT_DASH = "5 4";

/** `color` mixed into the canvas, `percent` of it: a tint, never a see-through color. */
function tint(color, percent) {
  return `color-mix(in srgb, ${color} ${percent}%, ${paletteVars.surface.input})`;
}

/** A state's outline width on a bar or a cell. */
function strokeWidthOf(state) {
  if (state === "ElementHighlight") return 2.6;
  if (state === "Rejected") return 2.2;
  if (state === "Committed") return 2;
  return 1.6;
}

/** "a", "a and b", "a, b and c". */
function andList(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** The trace props for a focusable piece that traces `id`. */
function useTrace() {
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
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
  return { traced: hover ?? pinned, traceProps };
}

/** A heading above a chart or a column, spaced out in small capitals. */
function Head({ x, y, text, anchor }) {
  return (
    <text
      x={x}
      y={y}
      data-head=""
      textAnchor={anchor}
      dominantBaseline="central"
      fill={paletteVars.text.secondary}
      fontFamily={MONO}
      fontSize={HEAD_SIZE}
      fontWeight={600}
      letterSpacing={`${HEAD_SPACING}em`}
    >
      {text}
    </text>
  );
}

/** Small secondary text (a number on an axis, a flow, the demand). */
function Small({ x, y, text, anchor, fill, bold, ...rest }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="central"
      fill={fill ?? paletteVars.text.secondary}
      fontFamily={MONO}
      fontSize={SMALL_SIZE}
      fontWeight={bold ? 700 : 400}
      {...rest}
    >
      {text}
    </text>
  );
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Schedule payload.
 * @param {Object} props.frame The frame to draw.
 * @param {Object[]} [props.frames] Every frame of the run (none before Run): the tank's and the
 *   cost's scales hold all of them.
 * @param {string[]} [props.highlightIds] Gadget piece ids to mark (#239).
 * @param {Object<string, string>} [props.gadgetColors] Color mode's marks, by piece id (#239).
 */
export default function ScheduleRenderer({
  idPrefix,
  name,
  payload,
  frame,
  frames = [],
  highlightIds,
  gadgetColors,
}) {
  const gadgetOf = useGadgetMarks(highlightIds, gadgetColors);
  const boxRef = useRef(null);
  const boxWidth = useBoxWidth(boxRef);
  // A frame drawn on its own (no run passed) is its own run.
  const run = frames.length ? frames : frame;
  const layout = useMemo(
    () => layoutSchedule(payload, boxWidth ?? undefined, Array.isArray(run) ? run : [run]),
    [payload, boxWidth, run],
  );
  const { traced, traceProps } = useTrace();
  const drawing =
    layout.kind === "jobs"
      ? jobsDrawing({ layout, payload, frame, traced, traceProps, name, gadgetOf })
      : pumpsDrawing({ layout, payload, frame, traced, traceProps, name, gadgetOf });

  return (
    <Box
      ref={boxRef}
      id={`${idPrefix}-schedule`}
      data-rule={payload?.rule ?? ""}
      data-drawing-width={layout.width}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <Box
        id={`${idPrefix}-readout`}
        aria-live="polite"
        data-traced={drawing.readout.traced ? "true" : undefined}
        sx={{
          fontFamily: MONO,
          fontSize: "0.8125rem",
          lineHeight: 1.45,
          minHeight: "2.9em",
          color: drawing.readout.traced ? "text.primary" : "text.secondary",
        }}
      >
        {drawing.readout.text}
      </Box>
      <DiagramZoom
        idPrefix={idPrefix}
        label={drawing.label}
        drawing={layout}
        resetOn={[payload, layout.width, layout.height]}
      >
        {drawing.content}
      </DiagramZoom>
    </Box>
  );
}

// ---- Job Sequencing ------------------------------------------------------------------------

function jobsDrawing({ layout, payload, frame, traced, traceProps, name, gadgetOf }) {
  const runs = new Map(
    (Array.isArray(frame?.runs) ? frame.runs : [])
      .filter((run) => typeof run?.job === "string")
      .map((run) => [run.job, run]),
  );
  const { plot, rows, toX } = layout;
  const tracedRow = rows.find((row) => row.id === traced) ?? null;
  const k = Number.isFinite(payload?.k) ? payload.k : null;
  const penalty = Number.isFinite(frame?.penalty) ? frame.penalty : null;
  const rejected = pictureStateStyle("Rejected");

  const describe = (row) => {
    const run = runs.get(row.id);
    const parts = [`${row.label}: takes ${row.time}, due ${row.deadline}, penalty ${row.penalty}`];
    if (run) {
      parts.push(`runs ${run.start} to ${run.end}, ${run.late ? "late" : "on time"}`);
    } else if (runs.size) parts.push("not placed");
    return parts;
  };

  let readout;
  if (tracedRow) readout = { traced: true, text: describe(tracedRow).join("; ") };
  else if (runs.size && penalty !== null) {
    readout = {
      traced: false,
      text: `Late penalty ${penalty}${k !== null ? ` (K = ${k})` : ""}. Hover or tap a job to read it.`,
    };
  } else {
    readout = {
      traced: false,
      text: `${rows.length} ${rows.length === 1 ? "job" : "jobs"}${k !== null ? `, penalty budget K = ${k}` : ""}. Bars are runs, ticks are deadlines; hover or tap a job to read it.`,
    };
  }

  const content = (
    <>
      <g data-layer="grid" pointerEvents="none">
        <Head x={layout.heads.job} y={layout.heads.y} text="JOB" anchor="start" />
        <Head x={layout.heads.penalty} y={layout.heads.y} text="PENALTY" anchor="start" />
        {layout.ticks.map((tick) => (
          <line
            key={`g${tick.value}`}
            data-grid=""
            x1={tick.at}
            x2={tick.at}
            y1={plot.y - 4}
            y2={layout.axisY}
            stroke={paletteVars.border.soft}
          />
        ))}
        <line
          data-axis-line=""
          x1={plot.x}
          x2={plot.x + plot.width}
          y1={layout.axisY}
          y2={layout.axisY}
          stroke={paletteVars.border.strong}
        />
        {layout.ticks.map((tick) => (
          <Small
            key={`t${tick.value}`}
            x={tick.at}
            y={layout.tickY}
            text={tick.text}
            anchor="middle"
            data-tick=""
          />
        ))}
        <Small
          x={plot.x + plot.width / 2}
          y={layout.tickY + 16}
          text="time"
          anchor="middle"
          data-tick=""
        />
      </g>
      <g data-layer="jobs">
        {rows.map((row) => {
          const run = runs.get(row.id);
          const state = stateOf(frame?.jobs, row.id);
          const style = pictureStateStyle(state);
          const late = run?.late === true;
          const faint = tracedRow !== null && tracedRow.id !== row.id;
          const isTraced = tracedRow?.id === row.id;
          const parts = describe(row);
          if (state !== "Background") parts.push(style.legend);
          const barY = row.y + BAR_INSET;
          const barH = JOB_ROW - 2 * BAR_INSET;
          const x0 = run ? toX(Math.max(0, run.start)) : 0;
          const x1 = run ? toX(Math.min(layout.span, Math.max(run.start, run.end))) : 0;
          const lateFrom = run ? toX(Math.min(layout.span, Math.max(row.deadline, run.start))) : 0;
          return (
            // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
            <g
              key={row.id}
              data-job-id={row.id}
              data-state={state}
              data-start={run ? run.start : undefined}
              data-end={run ? run.end : undefined}
              data-late={run ? String(late) : undefined}
              data-traced={tracedRow ? (faint ? "faint" : "trace") : undefined}
              aria-label={parts.join(", ")}
              style={faint ? { filter: FAINT_FILTER } : undefined}
              {...traceProps(row.id)}
            >
              <rect
                x={0}
                y={row.y}
                width={layout.width}
                height={JOB_ROW}
                fill={isTraced ? tint(TRACE_COLOR, 14) : "transparent"}
              />
              <GadgetRect
                id={row.id}
                color={gadgetOf(row.id)}
                x={0}
                y={row.y}
                width={layout.width}
                height={JOB_ROW}
                // rx + gap: corners rounded 3 units, just inside the row.
                rx={5}
                gap={-2}
              />
              <text
                x={layout.heads.job}
                y={row.cy}
                data-label=""
                dominantBaseline="central"
                fill={paletteVars.text.primary}
                fontFamily={MONO}
                fontSize={LABEL_SIZE}
                fontWeight={isTraced ? 700 : 400}
                pointerEvents="none"
              >
                {row.label}
              </text>
              {row.timeX !== null && (
                <Small x={row.timeX} y={row.cy} text={`t=${row.time}`} pointerEvents="none" />
              )}
              {run && (
                <g data-run="" pointerEvents="none">
                  <rect
                    x={x0}
                    y={barY}
                    width={Math.max(2, x1 - x0)}
                    height={barH}
                    rx={4}
                    data-body=""
                    fill={state === "Background" ? paletteVars.surface.input : style.fill}
                    stroke={isTraced ? TRACE_COLOR : style.line}
                    strokeWidth={isTraced ? 3 : strokeWidthOf(state)}
                    strokeDasharray={isTraced ? undefined : style.dash}
                  />
                  {late && x1 - lateFrom > 0 && (
                    <rect
                      x={lateFrom}
                      y={barY}
                      width={x1 - lateFrom}
                      height={barH}
                      rx={4}
                      data-late-part=""
                      fill={rejected.line}
                    />
                  )}
                </g>
              )}
              <line
                x1={row.deadlineX}
                x2={row.deadlineX}
                y1={row.y + 3}
                y2={row.y + JOB_ROW - 3}
                stroke={paletteVars.surface.input}
                strokeWidth={5}
                pointerEvents="none"
              />
              <line
                data-deadline={row.deadline}
                x1={row.deadlineX}
                x2={row.deadlineX}
                y1={row.y + 3}
                y2={row.y + JOB_ROW - 3}
                stroke={late ? rejected.line : paletteVars.text.primary}
                strokeWidth={2}
                pointerEvents="none"
              />
              <text
                x={layout.heads.penalty}
                y={row.cy}
                data-penalty=""
                dominantBaseline="central"
                fill={late ? rejected.text : paletteVars.text.secondary}
                fontFamily={MONO}
                fontSize={LABEL_SIZE}
                fontWeight={late ? 700 : 400}
                pointerEvents="none"
              >
                {row.penalty}
              </text>
            </g>
          );
        })}
      </g>
    </>
  );
  const label = `${name}: ${rows.length} ${rows.length === 1 ? "job" : "jobs"} on one machine${k !== null ? `, at most ${k} total penalty` : ""}${runs.size && penalty !== null ? `; this order's late penalty is ${penalty}` : ""}.`;
  return { content, readout, label };
}

// ---- Pump Scheduling -----------------------------------------------------------------------

function pumpsDrawing({ layout, payload, frame, traced, traceProps, name, gadgetOf }) {
  const { tank, cost, rows, toX, cell } = layout;
  const schedule = (Array.isArray(frame?.schedule) ? frame.schedule : []).slice(0, HOURS);
  const reached = (Array.isArray(frame?.reached) ? frame.reached : []).filter(
    (hour) => Number.isFinite(hour?.low) && Number.isFinite(hour?.high),
  );
  const upTo = Number.isFinite(frame?.upTo) ? Math.min(frame.upTo, schedule.length - 1) : -1;
  const budget = Number.isFinite(frame?.budget) && frame.budget > 0 ? frame.budget : null;
  const focus = new Set(Array.isArray(frame?.focus) ? frame.focus : []);
  const hourIndex = new Map(layout.hours.map((hour, h) => [hour.id, h]));
  const tracedHour = hourIndex.has(traced) ? hourIndex.get(traced) : null;
  const pumpName = new Map(rows.map((row) => [row.id, row.name]));
  const highlight = pictureStateStyle("ElementHighlight");
  const rejected = pictureStateStyle("Rejected");
  const rates = payload?.rates ?? {};
  const costOf = (hour) => (Number(hour?.energy) || 0) + (Number(hour?.startup) || 0);
  const spent = (to) => schedule.slice(0, to + 1).reduce((sum, hour) => sum + costOf(hour), 0);

  // The three stretches of a column (the cells, the tank, the cost), for its outline and tint.
  const segments = [
    { key: "cells", y: layout.rowsTop - 4, height: layout.rowsBottom - layout.rowsTop + 8 },
    { key: "tank", y: tank.top, height: tank.height },
    { key: "cost", y: cost.top, height: cost.height },
  ];
  const column = (h, props) =>
    segments.map((segment) => (
      <rect
        key={`${h}-${segment.key}`}
        x={toX(h)}
        y={segment.y}
        width={cell}
        height={segment.height}
        {...props}
      />
    ));

  const describe = (h) => {
    const hour = layout.hours[h];
    const rate = hour.peak ? rates.onPeak : rates.offPeak;
    const parts = [
      `Hour ${h} (${hour.label}${hour.peak ? ", peak" : ""}${Number.isFinite(rate) ? `, $${rate}/kWh` : ""}): demand ${formatGallons(hour.demand)} gal`,
    ];
    const run = schedule[h];
    if (run && h <= upTo) {
      const on = (Array.isArray(run.on) ? run.on : []).map((id) => pumpName.get(id) ?? id);
      parts.push(on.length ? `${andList(on)} on` : "no pump on");
      parts.push(`in ${formatGallons(run.inflow)}, tank ${formatGallons(run.level)} gal`);
      parts.push(`cost ${formatMoney(costOf(run))}`);
    } else if (run) parts.push("not replayed yet");
    const state = stateOf(frame?.hours, hour.id);
    if (state !== "Background") parts.push(pictureStateStyle(state).legend);
    return parts;
  };

  let readout;
  if (tracedHour !== null) readout = { traced: true, text: describe(tracedHour).join("; ") };
  else if (schedule.length && upTo >= 0) {
    readout = {
      traced: false,
      text: `${upTo < HOURS - 1 ? `Hours 0 to ${upTo}: ` : "Total "}${formatMoney(spent(upTo))}${budget !== null ? ` of a ${formatMoney(budget)} budget` : ""}. Hover or tap an hour to read it.`,
    };
  } else if (reached.length) {
    readout = {
      traced: false,
      text: `Forward pass: ${reached.length} of 24 hours. The band is every tank level still reachable.`,
    };
  } else {
    readout = {
      traced: false,
      text: `Tank at ${formatGallons(tank.level)} of ${formatGallons(tank.capacity)} gal. Shaded hours are peak tariff; hover or tap an hour to read it.`,
    };
  }

  // The tank's line: from its level at the start of hour 0 to its level after each hour drawn.
  const tankPoints = [[toX(0), tank.toY(tank.level)]];
  for (let h = 0; h <= upTo; h += 1) tankPoints.push([toX(h + 1), tank.toY(schedule[h].level)]);
  const outside = (value) => value < tank.minimum - 1e-9 || value > tank.capacity + 1e-9;
  // The forward pass's band of reachable levels, while there is no schedule yet.
  const band =
    !schedule.length && reached.length
      ? [
          [toX(0), tank.toY(tank.level)],
          ...reached.map((hour, h) => [toX(h + 1), tank.toY(hour.high)]),
          ...reached.map((hour, h) => [toX(h + 1), tank.toY(hour.low)]).reverse(),
        ]
      : null;
  // The share of the budget spent by the end of each hour drawn.
  const budgetPoints = [];
  if (budget !== null && cost.share) {
    let sum = 0;
    for (let h = 0; h <= upTo; h += 1) {
      sum += costOf(schedule[h]);
      const share = Math.min(1, sum / budget);
      budgetPoints.push([toX(h + 1), cost.top + cost.height - share * cost.height]);
    }
  }
  const points = (list) => list.map(([x, y]) => `${x},${y}`).join(" ");

  const content = (
    <>
      <g data-layer="shade" pointerEvents="none">
        {layout.hours.map((hour, h) =>
          hour.peak ? (
            <rect
              key={hour.id}
              data-peak={hour.id}
              x={toX(h)}
              y={layout.columnTop}
              width={cell}
              height={layout.columnBottom - layout.columnTop}
              fill={tint(paletteVars.viz.dim, PEAK_TINT)}
            />
          ) : null,
        )}
        {layout.hours.map((hour, h) => {
          const state = stateOf(frame?.hours, hour.id);
          if (state === "Background" || state === "ElementHighlight") return null;
          return (
            <g key={hour.id} data-hour-tint={hour.id}>
              {column(h, {
                fill: tint(pictureStateStyle(state).fill, HOUR_TINT),
              })}
            </g>
          );
        })}
      </g>
      <g data-layer="labels" pointerEvents="none">
        {layout.hourLabels.map((label) => (
          <Small
            key={label.hour}
            x={label.at}
            y={layout.hourY}
            text={label.text}
            anchor={label.anchor}
            data-hour-label={label.hour}
          />
        ))}
        <Small x={layout.demand.labelX} y={layout.demand.y} text={layout.demand.label} />
        {layout.demand.labels.map((label) => (
          <Small
            key={label.key}
            x={label.at}
            y={layout.demand.y}
            text={label.text}
            anchor="middle"
            data-demand={label.key}
          />
        ))}
        {rows.map((row) => (
          <g key={row.id} data-pump-id={row.id}>
            <GadgetRect
              id={row.id}
              color={gadgetOf(row.id)}
              x={toX(0)}
              y={row.y + 4}
              width={toX(HOURS) - toX(0)}
              height={row.height - 8}
              rx={3}
              gap={2}
            />
            <text
              x={layout.demand.labelX}
              y={row.nameY}
              data-label=""
              dominantBaseline="central"
              fill={paletteVars.text.primary}
              fontFamily={MONO}
              fontSize={LABEL_SIZE}
            >
              {row.name}
            </text>
            <Small x={row.flowX} y={row.flowY} text={row.flowText} />
          </g>
        ))}
        <Head x={layout.demand.labelX} y={tank.head} text="TANK LEVEL, GAL" anchor="start" />
        <Head x={layout.demand.labelX} y={cost.head} text="COST PER HOUR, $" anchor="start" />
        {tank.ticks.map((tick) => (
          <Small
            key={`tank${tick.value}`}
            x={layout.plot.x - 6}
            y={tick.at}
            text={tick.text}
            anchor="end"
            data-tick=""
            data-mark={tick.mark ?? undefined}
            fill={tick.mark === "minimum" ? rejected.text : undefined}
            bold={tick.mark !== null}
          />
        ))}
        {cost.ticks.map((tick) => (
          <Small
            key={`cost${tick.value}`}
            x={layout.plot.x - 6}
            y={tick.at}
            text={tick.text}
            anchor="end"
            data-tick=""
          />
        ))}
        {budget !== null &&
          cost.share?.map((tick) => (
            <Small
              key={`share${tick.value}`}
              x={layout.plot.x + layout.plot.width + 4}
              y={tick.at}
              text={tick.text}
              anchor="start"
              data-tick=""
              fill={paletteVars.viz.violet}
            />
          ))}
      </g>
      <g data-layer="tank" data-low={tank.low} data-high={tank.high} pointerEvents="none">
        {tank.ticks.map((tick) => (
          <line
            key={tick.value}
            x1={layout.plot.x}
            x2={layout.plot.x + layout.plot.width}
            y1={tick.at}
            y2={tick.at}
            data-limit={tick.mark ?? undefined}
            stroke={
              tick.mark === "minimum"
                ? rejected.line
                : tick.mark === "capacity"
                  ? paletteVars.text.secondary
                  : paletteVars.border.soft
            }
            strokeWidth={tick.mark ? 1.4 : 1}
            strokeDasharray={tick.mark ? LIMIT_DASH : undefined}
          />
        ))}
        {band && (
          <polygon
            data-band={reached.length}
            points={points(band)}
            fill={highlight.fill}
            stroke={highlight.line}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
        )}
        {tankPoints.length >= 2 && (
          <polyline
            data-tank-line={upTo + 1}
            points={points(tankPoints)}
            fill="none"
            stroke={paletteVars.text.primary}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
        )}
        <circle
          cx={toX(0)}
          cy={tank.toY(tank.level)}
          r={3.5}
          fill={paletteVars.text.primary}
          data-tank-start=""
        />
        {schedule
          .slice(0, upTo + 1)
          .map((hour, h) =>
            outside(hour.level) ? (
              <circle
                key={hour.hour ?? h}
                data-tank-outside={layout.hours[h].id}
                cx={toX(h + 1)}
                cy={tank.toY(hour.level)}
                r={4}
                fill={rejected.line}
              />
            ) : null,
          )}
      </g>
      <g data-layer="cost" pointerEvents="none">
        {cost.ticks.map((tick) => (
          <line
            key={tick.value}
            x1={layout.plot.x}
            x2={layout.plot.x + layout.plot.width}
            y1={tick.at}
            y2={tick.at}
            stroke={paletteVars.border.soft}
          />
        ))}
        <line
          data-axis-line=""
          x1={layout.plot.x}
          x2={layout.plot.x + layout.plot.width}
          y1={cost.top + cost.height}
          y2={cost.top + cost.height}
          stroke={paletteVars.border.strong}
        />
      </g>
      <g data-layer="hours">
        {layout.hours.map((hour, h) => {
          const run = schedule[h];
          const on = new Set(Array.isArray(run?.on) ? run.on : []);
          const starts = new Set(Array.isArray(run?.starts) ? run.starts : []);
          const shown = h <= upTo;
          const faint = tracedHour !== null && tracedHour !== h;
          // An hour of the schedule not replayed yet is drawn faded, by color.
          const later = run !== undefined && !shown;
          const energy = run ? Number(run.energy) || 0 : 0;
          const startup = run ? Number(run.startup) || 0 : 0;
          const x = toX(h);
          const barX = x + Math.min(3, cell * 0.15);
          const barW = Math.max(1, cell - 2 * Math.min(3, cell * 0.15));
          const isFocus = focus.has(hour.id);
          return (
            <g
              key={hour.id}
              data-hour-id={hour.id}
              data-state={stateOf(frame?.hours, hour.id)}
              data-shown={run ? String(shown) : undefined}
              data-traced={tracedHour !== null ? (faint ? "faint" : "trace") : undefined}
              style={faint || later ? { filter: FAINT_FILTER } : undefined}
              pointerEvents="none"
            >
              {rows.map((row) => {
                const id = `${row.id}${hour.id}`;
                const isOn = on.has(row.id);
                const state = stateOf(frame?.cells, id);
                const style = pictureStateStyle(state);
                const inset = Math.min(1.5, cell * 0.12);
                const cellY = row.y + 4;
                return (
                  <g key={id} data-cell-id={id} data-on={String(isOn)} data-state={state}>
                    <rect
                      x={x + inset}
                      y={cellY}
                      width={Math.max(1, cell - 2 * inset)}
                      height={row.height - 8}
                      rx={Math.min(3, cell / 4)}
                      data-body=""
                      fill={
                        isOn
                          ? state === "Background"
                            ? paletteVars.viz.edge
                            : style.fill
                          : paletteVars.surface.input
                      }
                      stroke={isOn ? style.line : paletteVars.border.soft}
                      strokeWidth={isOn ? Math.min(strokeWidthOf(state), cell / 4) : 0.8}
                      strokeDasharray={isOn ? style.dash : undefined}
                    />
                    <GadgetRect
                      id={id}
                      color={gadgetOf(id)}
                      x={x + inset}
                      y={cellY}
                      width={Math.max(1, cell - 2 * inset)}
                      height={row.height - 8}
                      rx={Math.min(3, cell / 4)}
                      gap={0}
                    />
                    {isOn && shown && starts.has(row.id) && (
                      <path
                        data-startup={id}
                        d={`M${x + inset} ${cellY} l${Math.min(7, cell * 0.5)} 0 l${-Math.min(7, cell * 0.5)} ${Math.min(7, cell * 0.5)} z`}
                        fill={paletteVars.text.primary}
                        stroke={paletteVars.surface.input}
                        strokeWidth={1}
                      />
                    )}
                  </g>
                );
              })}
              {shown && energy > 0 && (
                <rect
                  data-cost={hour.id}
                  x={barX}
                  y={cost.toY(energy)}
                  width={barW}
                  height={cost.top + cost.height - cost.toY(energy)}
                  fill={isFocus ? highlight.line : paletteVars.text.secondary}
                />
              )}
              {shown && startup > 0 && (
                <rect
                  data-startup-cost={hour.id}
                  x={barX}
                  y={cost.toY(energy + startup)}
                  width={barW}
                  height={cost.toY(energy) - cost.toY(energy + startup)}
                  fill={paletteVars.text.primary}
                />
              )}
            </g>
          );
        })}
      </g>
      {budgetPoints.length > 0 && (
        <g data-layer="budget" pointerEvents="none">
          <line
            x1={layout.plot.x}
            x2={layout.plot.x + layout.plot.width}
            y1={cost.top}
            y2={cost.top}
            stroke={paletteVars.viz.violet}
            strokeWidth={1.2}
            strokeDasharray="4 4"
          />
          <polyline
            data-budget-line={budgetPoints.length}
            points={points([[toX(0), cost.top + cost.height], ...budgetPoints])}
            fill="none"
            stroke={paletteVars.viz.violet}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </g>
      )}
      <g data-layer="outlines" pointerEvents="none">
        {layout.hours.map((hour, h) => {
          if (!focus.has(hour.id)) return null;
          const state = stateOf(frame?.hours, hour.id);
          return (
            <g key={hour.id} data-focus-hour={hour.id}>
              {column(h, {
                fill: "none",
                stroke: state === "Rejected" ? rejected.line : highlight.line,
                strokeWidth: 2.4,
              })}
            </g>
          );
        })}
        {tracedHour !== null && (
          <g data-trace-hour={layout.hours[tracedHour].id}>
            {column(tracedHour, { fill: "none", stroke: TRACE_COLOR, strokeWidth: 2.4 })}
          </g>
        )}
      </g>
      <g data-layer="hits">
        {layout.hours.map((hour, h) => (
          // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
          <g
            key={hour.id}
            data-hour-hit={hour.id}
            aria-label={describe(h).join(", ")}
            {...traceProps(hour.id)}
          >
            <rect
              x={toX(h)}
              y={layout.rowsTop - 4}
              width={cell}
              height={layout.columnBottom - layout.rowsTop + 4}
              fill="transparent"
            />
          </g>
        ))}
      </g>
    </>
  );
  const label = `${name}: ${rows.length} ${rows.length === 1 ? "pump" : "pumps"} over 24 hours, a tank of ${formatGallons(tank.capacity)} gal${tank.minimum > 0 ? ` kept above ${formatGallons(tank.minimum)} gal` : ""}${schedule.length && upTo >= 0 ? `; ${formatMoney(spent(upTo))} spent by hour ${upTo}` : ""}.`;
  return { content, readout, label };
}

/**
 * The Legend's entries for what a Schedule picture draws besides states: a job's deadline tick
 * and late part; the pumps' peak hours, the tank's limits and line, the forward pass's band, the
 * startup marks and costs, and the budget line, each only when the picture draws it.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function scheduleAnnotations(payload, frames) {
  const entries = [];
  const list = Array.isArray(frames) ? frames.filter(Boolean) : [];
  const rejected = pictureStateStyle("Rejected");
  if (payload?.rule === "jobSequencing" || Array.isArray(payload?.jobs)) {
    entries.push({
      key: "deadline",
      text: "Tick (the job's deadline; red once the job runs past it)",
      swatch: { kind: "line", color: paletteVars.text.primary },
    });
    if (list.some((frame) => (frame.runs ?? []).some((run) => run?.late))) {
      entries.push({
        key: "late",
        text: "Solid red end (the part after the deadline: the job is late and its penalty counts)",
        swatch: { kind: "fill", fill: rejected.line, line: rejected.line },
      });
    }
    return entries;
  }
  if ((payload?.hours ?? []).some((hour) => hour?.peak)) {
    entries.push({
      key: "peak",
      text: "Shaded hour (peak tariff: power costs more)",
      swatch: {
        kind: "fill",
        fill: tint(paletteVars.viz.dim, PEAK_TINT),
        line: tint(paletteVars.viz.dim, PEAK_TINT),
      },
    });
  }
  entries.push({
    key: "capacity",
    text: "Dashed line (the tank's capacity)",
    swatch: { kind: "line", color: paletteVars.text.secondary, dash: LIMIT_DASH },
  });
  if (Number(payload?.tank?.minimum) > 0) {
    entries.push({
      key: "minimum",
      text: "Red dashed line (the tank's minimum)",
      swatch: { kind: "line", color: rejected.line, dash: LIMIT_DASH },
    });
  }
  const scheduled = list.filter((frame) => Array.isArray(frame.schedule) && frame.schedule.length);
  if (list.some((frame) => !frame.schedule?.length && frame.reached?.length)) {
    const highlight = pictureStateStyle("ElementHighlight");
    entries.push({
      key: "band",
      text: "Band (the tank levels the forward pass can still reach)",
      swatch: { kind: "fill", fill: highlight.fill, line: highlight.line },
    });
  }
  if (scheduled.length) {
    entries.push({
      key: "tank",
      text: "Tank line (gallons at the end of each hour)",
      swatch: { kind: "line", color: paletteVars.text.primary },
    });
    entries.push({
      key: "energy",
      text: "Bar (the hour's energy cost)",
      swatch: { kind: "fill", fill: paletteVars.text.secondary, line: paletteVars.text.secondary },
    });
  }
  if (scheduled.some((frame) => frame.schedule.some((hour) => hour?.starts?.length))) {
    entries.push({
      key: "startup",
      text: "Corner mark and bar cap (a pump starts and pays its startup cost)",
      swatch: { kind: "fill", fill: paletteVars.text.primary, line: paletteVars.text.primary },
    });
  }
  if (scheduled.some((frame) => Number(frame.budget) > 0)) {
    entries.push({
      key: "budget",
      text: "Violet line, right axis (the share of the budget spent so far)",
      swatch: { kind: "line", color: paletteVars.viz.violet },
    });
  }
  if (
    scheduled.some((frame) =>
      frame.schedule.some(
        (hour) =>
          Number(hour?.level) < Number(payload?.tank?.minimum ?? 0) ||
          Number(hour?.level) > Number(payload?.tank?.capacity ?? Number.POSITIVE_INFINITY),
      ),
    )
  ) {
    entries.push({
      key: "outside",
      text: "Red dot (the tank leaves its limits at the end of that hour)",
      swatch: { kind: "fill", fill: rejected.line, line: rejected.line },
    });
  }
  return entries;
}
