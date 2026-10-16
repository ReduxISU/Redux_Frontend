// components/pictures/AutomatonRenderer.js
//
// #204: the Automaton picture type (ReduxISU/Redux#670), Redux's PICTURE-TYPES.md "Automaton".
// A DFA or an NFA: states left to right in the order the machine reaches them, the start state
// with an entry arrow, accept states with a double ring, every transition between the same two
// states merged into one arrow labelled with its symbols (an ε-move dashed), and the input tape
// under the diagram with the read position.
//
//   - DFA: a missing move leads to a separate, isolated red Garbage state with no arrows into it
//     (the payload's `garbage`, with the moves that lead there). A run that falls in shows it
//     as the active state.
//   - NFA: the steps follow the solver's run, which keeps every branch in view (the subset
//     solver's frames hold every active state at once). The One path switch follows a single run
//     instead, picked from a dropdown: Redux computes the runs (`paths`, accepting ones first,
//     each with its own frames), and the workbench steps the chosen one's frames
//     (components/workbench/Workbench.js, through `runs`).
//
// The payload holds the machine, already layered, and the input; each frame holds the states
// (`nodes`, `edges`: an id that is absent is Background), `active` (the states the machine is
// in) and `position` (how many symbols have been read). Layout is automatonLayout.js's pure
// function of the payload, so every step and every path draws on the same positions. Hovering,
// focusing or tapping a state traces where it can go: its arrows out in the trace color, and
// everything it can't reach in one move faded by color. The diagram opens fitted to its box and
// zooms and pans with DiagramZoom.js.

import Box from "@mui/material/Box";
import { useMemo, useState } from "react";
import { paletteVars } from "../theme";
import { GARBAGE_HEIGHT, layoutAutomaton, STATE_RADIUS } from "./automatonLayout";
import DiagramZoom from "./DiagramZoom";
import {
  edgeLook,
  FAINT_EDGE,
  FAINT_FILTER,
  MONO,
  NodeLabel,
  nodeLook,
  ordinal,
  PictureToggle,
  StatePill,
  TRACE_COLOR,
} from "./graphPieces";
import { pictureStateStyle, stateOf } from "./pictureStates";

/** An ε-arrow's dash, while it has no state dash of its own. */
const EPSILON_DASH = "5 4";

/** The Garbage state's dash while nothing has fallen into it. */
const GARBAGE_DASH = "5 3";

const VIEWS = [
  { value: "all", label: "All branches" },
  { value: "one", label: "One path" },
];

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** A state's body: a circle, or a pill for a long name, with an inner ring when it accepts. */
function StateBody({ state, look }) {
  const R = STATE_RADIUS;
  const pill = state.width > 2 * R;
  const common = {
    fill: look.fill,
    stroke: look.line,
    strokeWidth: look.strokeWidth,
    strokeDasharray: look.dash,
  };
  const inner = {
    fill: "none",
    stroke: look.line,
    strokeWidth: 1.6,
    strokeDasharray: look.dash,
    pointerEvents: "none",
  };
  if (pill) {
    return (
      <>
        <rect
          x={state.x - state.width / 2}
          y={state.y - R}
          width={state.width}
          height={2 * R}
          rx={R}
          data-body=""
          {...common}
        />
        {state.accepting && (
          <rect
            x={state.x - state.width / 2 + 5}
            y={state.y - R + 5}
            width={state.width - 10}
            height={2 * R - 10}
            rx={R - 5}
            data-accept-ring=""
            {...inner}
          />
        )}
      </>
    );
  }
  return (
    <>
      <circle cx={state.x} cy={state.y} r={R} data-body="" {...common} />
      {state.accepting && (
        <circle cx={state.x} cy={state.y} r={R - 5} data-accept-ring="" {...inner} />
      )}
    </>
  );
}

/**
 * The input tape: one cell per symbol, read ones muted, the one just read filled, the head on
 * the next one, and an end cell that gives the verdict on the Done step.
 */
function Tape({ id, input, frame, frameIndex, justRead }) {
  const running = frameIndex !== null && frame;
  const done = running && frame.event === "Done";
  const position = running && Number.isInteger(frame.position) ? frame.position : null;
  const accepted = done && frame.ok === true;
  const plain = pictureStateStyle("Background");
  const highlight = pictureStateStyle("ElementHighlight");
  const verdictStyle = pictureStateStyle(accepted ? "Solution" : "Rejected");

  let summary;
  if (!input.length) summary = "The input is empty.";
  else summary = `The input: ${input.join(" ")}.`;
  if (position !== null) {
    if (done) {
      summary += ` ${accepted ? "Accepted" : "Rejected"} after reading ${plural(position, "symbol")}.`;
    } else if (position < input.length) {
      summary += ` ${plural(position, "symbol")} read; the head is on the ${ordinal(position + 1)}, ${input[position]}.`;
    } else {
      summary += " Every symbol has been read.";
    }
  }

  const cellSx = {
    minWidth: 34,
    height: 38,
    px: 0.75,
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
    border: "1.5px solid",
    borderRadius: "6px",
    fontFamily: MONO,
    fontSize: "1rem",
  };
  return (
    <Box
      id={id}
      role="group"
      aria-label={summary}
      data-position={position ?? undefined}
      sx={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}
    >
      {input.map((symbol, index) => {
        const read = position !== null && index < position;
        const just = !done && justRead && position !== null && index === position - 1;
        const head = !done && position !== null && index === position;
        let sx = {
          ...cellSx,
          borderColor: plain.line,
          backgroundColor: "surface.main",
          color: "text.primary",
        };
        if (read) sx = { ...sx, backgroundColor: "transparent", color: "text.secondary" };
        if (just) sx = { ...sx, backgroundColor: highlight.fill, color: highlight.ink };
        if (head) {
          sx = {
            ...sx,
            borderColor: highlight.line,
            boxShadow: `0 0 0 2px ${highlight.line}`,
          };
        }
        return (
          <Box
            // biome-ignore lint/suspicious/noArrayIndexKey: a tape cell is its position.
            key={index}
            aria-hidden="true"
            data-tape-cell={index}
            data-read={read ? "true" : undefined}
            data-just={just ? "true" : undefined}
            data-head={head ? "true" : undefined}
            sx={sx}
          >
            {symbol}
          </Box>
        );
      })}
      <Box
        aria-hidden="true"
        data-tape-end=""
        data-verdict={done ? (accepted ? "accept" : "reject") : undefined}
        data-head={
          !done && position !== null && position >= input.length && input.length > 0
            ? "true"
            : undefined
        }
        sx={{
          ...cellSx,
          px: 1.25,
          fontSize: "0.75rem",
          borderStyle: done ? "solid" : "dashed",
          borderColor: done ? verdictStyle.line : plain.line,
          color: done ? verdictStyle.text : "text.secondary",
          fontWeight: done ? 700 : 400,
          ...(!done && position !== null && position >= input.length && input.length > 0
            ? { borderColor: highlight.line, boxShadow: `0 0 0 2px ${highlight.line}` }
            : {}),
        }}
      >
        {done ? (accepted ? "accept" : "reject") : input.length ? "end" : "empty input"}
      </Box>
    </Box>
  );
}

/** The All branches / One path switch and, on One path, the path to follow. */
function PathPicker({ id, runs }) {
  const one = runs.value !== null;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, minWidth: 0 }}>
      <PictureToggle
        id={`${id}-view`}
        label="Steps follow"
        options={VIEWS}
        value={one ? "one" : "all"}
        onChange={(value) => {
          if (value === "all") runs.onChange(null);
          else if (!one && runs.options.length) runs.onChange(runs.options[0].id);
        }}
      />
      {one && (
        <Box
          component="select"
          id={`${id}-path`}
          aria-label="Path to follow"
          value={runs.value}
          onChange={(event) => runs.onChange(event.target.value)}
          sx={{
            minHeight: 32,
            maxWidth: "100%",
            minWidth: 0,
            px: 1,
            border: "1px solid",
            borderColor: "border.main",
            borderRadius: "8px",
            backgroundColor: "surface.input",
            color: "text.primary",
            fontFamily: "inherit",
            fontSize: "0.8125rem",
            outline: "none",
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "brand.line",
              outlineOffset: "1px",
            },
          }}
        >
          {runs.options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Box>
      )}
    </Box>
  );
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Automaton payload.
 * @param {Object} props.frame The frame to draw.
 * @param {number|null} props.frameIndex The step, or null before Run.
 * @param {Object|null} [props.runs] An NFA's paths to follow instead (see the header).
 */
export default function AutomatonRenderer({ idPrefix, name, payload, frame, frameIndex, runs }) {
  const layout = useMemo(() => layoutAutomaton(payload), [payload]);
  const labels = useMemo(
    () => new Map(layout.states.map((state) => [state.id, state.label])),
    [layout],
  );
  // Each state's arrows out and in, and the symbols it has no move on (DFA, to Garbage).
  const links = useMemo(() => {
    const map = new Map(layout.states.map((state) => [state.id, { out: [], in: [], missing: [] }]));
    for (const arrow of layout.arrows) {
      map.get(arrow.a).out.push(arrow);
      map.get(arrow.b).in.push(arrow);
    }
    for (const move of layout.garbage?.missing ?? []) {
      map.get(move.state)?.missing.push(String(move.symbol));
    }
    return map;
  }, [layout]);
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  // (A state from an earlier payload, after the instance changed, traces nothing.)
  const pointedAt = hover ?? pinned;
  const traced = pointedAt !== null && labels.has(pointedAt) ? pointedAt : null;
  const near = traced ? new Set([traced, ...links.get(traced).out.map((arrow) => arrow.b)]) : null;
  const tracesGarbage = traced !== null && links.get(traced).missing.length > 0;

  const kind = payload?.kind === "nfa" ? "nfa" : "dfa";
  const input = (Array.isArray(payload?.input) ? payload.input : []).map(String);
  const active = new Set(Array.isArray(frame?.active) ? frame.active : []);
  const running = frameIndex !== null;
  // The cell just read: the step took an arrow (not only ε) that reads the symbol before the head.
  const focusIds = new Set(Array.isArray(frame?.focus) ? frame.focus : []);
  const position = Number.isInteger(frame?.position) ? frame.position : 0;
  const justRead =
    running &&
    position > 0 &&
    layout.arrows.some(
      (arrow) =>
        focusIds.has(arrow.id) &&
        stateOf(frame?.edges, arrow.id) !== "Background" &&
        arrow.symbols.includes(input[position - 1]),
    );

  const label = `${name}: ${kind === "nfa" ? "an NFA" : "a DFA"} with ${plural(layout.states.length, "state")} and ${plural(layout.arrows.length, "arrow")}${layout.garbage ? ", and a Garbage state for its missing moves" : ""}, left to right from the start state.`;

  const garbageState = layout.garbage ? stateOf(frame?.nodes, layout.garbage.id) : "Background";

  return (
    <Box
      id={`${idPrefix}-graph`}
      data-automaton-kind={kind}
      data-run-view={runs ? (runs.value ?? "all") : undefined}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1.5 }}
    >
      <DiagramZoom
        idPrefix={idPrefix}
        label={label}
        drawing={layout}
        resetOn={[payload]}
        toolbar={runs && runs.options.length > 0 ? <PathPicker id={idPrefix} runs={runs} /> : null}
      >
        <g data-layer="edges">
          {layout.arrows.map((arrow) => {
            const state = stateOf(frame?.edges, arrow.id);
            const out = traced !== null && arrow.a === traced;
            const faint = traced !== null && !out;
            let look = edgeLook(state);
            if (arrow.epsilon && !look.dash) look = { ...look, dash: EPSILON_DASH };
            if (traced !== null) {
              look = faint
                ? { ...FAINT_EDGE }
                : { ...look, line: TRACE_COLOR, width: 2.6, dash: look.dash };
            }
            return (
              <g
                key={arrow.id}
                data-edge-id={arrow.id}
                data-state={state}
                data-epsilon={arrow.epsilon ? "true" : undefined}
                data-loop={arrow.loop ? "true" : undefined}
                data-traced={traced ? (faint ? "faint" : "trace") : undefined}
              >
                <path
                  d={arrow.path}
                  fill="none"
                  stroke={look.line}
                  strokeWidth={look.width}
                  strokeDasharray={look.dash}
                  strokeLinecap="round"
                />
                <polygon points={arrow.arrow} fill={look.line} />
              </g>
            );
          })}
        </g>
        <g data-layer="labels">
          {layout.arrows.map((arrow) => (
            <StatePill
              key={arrow.id}
              forId={arrow.id}
              testId="arrow-label"
              x={arrow.label.x}
              y={arrow.label.y}
              text={arrow.text}
              state={stateOf(frame?.edges, arrow.id)}
              faint={traced !== null && arrow.a !== traced}
              traced={traced !== null && arrow.a === traced}
            />
          ))}
        </g>
        {layout.start && (
          <g data-start-arrow="" pointerEvents="none">
            <path
              d={layout.start.path}
              fill="none"
              stroke={paletteVars.text.primary}
              strokeWidth={1.8}
            />
            <polygon points={layout.start.arrow} fill={paletteVars.text.primary} />
          </g>
        )}
        <g data-layer="nodes">
          {layout.states.map((node) => {
            const state = stateOf(frame?.nodes, node.id);
            const look = nodeLook(state);
            const faint = near !== null && !near.has(node.id);
            const isTraced = traced === node.id;
            const { out, in: into, missing } = links.get(node.id);

            const parts = [`State ${node.label}`];
            if (node.start) parts.push("start");
            if (node.accepting) parts.push("accepting");
            if (state !== "Background") parts.push(pictureStateStyle(state).legend);
            if (running && active.has(node.id)) parts.push("active");
            const moves = out.map((arrow) => `on ${arrow.text} to ${labels.get(arrow.b)}`);
            if (missing.length) {
              moves.push(`no move on ${missing.join(", ")} (to ${layout.garbage.label})`);
            }
            parts.push(moves.length ? moves.join("; ") : "no moves out");
            const from = into.filter((arrow) => arrow.a !== node.id);
            if (from.length) {
              parts.push(
                `from ${from.map((arrow) => `${labels.get(arrow.a)} on ${arrow.text}`).join("; ")}`,
              );
            }

            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={node.id}
                data-node-id={node.id}
                data-state={state}
                data-start={node.start ? "true" : undefined}
                data-accepting={node.accepting ? "true" : undefined}
                data-active={running && active.has(node.id) ? "true" : undefined}
                data-traced={near ? (faint ? "faint" : "trace") : undefined}
                data-focusable=""
                tabIndex={0}
                role="button"
                aria-pressed={pinned === node.id}
                aria-label={parts.join(", ")}
                style={faint ? { filter: FAINT_FILTER } : undefined}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") setHover(node.id);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") setHover(null);
                }}
                onFocus={() => setHover(node.id)}
                onBlur={() => setHover(null)}
                onClick={() => setPinned((current) => (current === node.id ? null : node.id))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setPinned((current) => (current === node.id ? null : node.id));
                  }
                }}
              >
                <StateBody
                  state={node}
                  look={
                    isTraced
                      ? { ...look, line: TRACE_COLOR, strokeWidth: 3, dash: undefined }
                      : look
                  }
                />
                <NodeLabel
                  x={node.x}
                  y={node.y}
                  text={node.label}
                  color={look.ink}
                  bold={look.bold}
                  size={15}
                />
              </g>
            );
          })}
          {layout.garbage &&
            (() => {
              const garbage = layout.garbage;
              const red = pictureStateStyle("Rejected");
              const stated = garbageState !== "Background";
              const outline = stated ? pictureStateStyle(garbageState).line : red.line;
              const faint = traced !== null && !tracesGarbage;
              const moves = garbage.missing.map(
                (move) => `${labels.get(move.state) ?? move.state} on ${move.symbol}`,
              );
              const parts = [
                `${garbage.label} state: a missing move leads here and the input is rejected`,
              ];
              if (stated) parts.push(pictureStateStyle(garbageState).legend);
              if (running && active.has(garbage.id)) parts.push("active");
              if (moves.length) parts.push(`missing moves: ${moves.join("; ")}`);
              return (
                <g
                  data-node-id={garbage.id}
                  data-garbage=""
                  data-state={garbageState}
                  data-active={running && active.has(garbage.id) ? "true" : undefined}
                  data-traced={traced ? (faint ? "faint" : "trace") : undefined}
                  role="img"
                  aria-label={parts.join(", ")}
                  style={faint ? { filter: FAINT_FILTER } : undefined}
                >
                  <rect
                    x={garbage.x - garbage.width / 2}
                    y={garbage.y - GARBAGE_HEIGHT / 2}
                    width={garbage.width}
                    height={GARBAGE_HEIGHT}
                    rx={GARBAGE_HEIGHT / 2}
                    data-body=""
                    fill={red.fill}
                    stroke={tracesGarbage ? TRACE_COLOR : outline}
                    strokeWidth={stated || tracesGarbage ? 3.5 : 2}
                    strokeDasharray={stated || tracesGarbage ? undefined : GARBAGE_DASH}
                  />
                  <text
                    x={garbage.x}
                    y={garbage.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={red.ink}
                    fontFamily={MONO}
                    fontSize={13}
                    fontWeight={700}
                    pointerEvents="none"
                  >
                    {garbage.label}
                  </text>
                  <text
                    x={garbage.x}
                    y={garbage.y + 33}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={paletteVars.text.secondary}
                    fontFamily={MONO}
                    fontSize={11}
                    pointerEvents="none"
                  >
                    missing moves
                  </text>
                </g>
              );
            })()}
        </g>
      </DiagramZoom>
      <Tape
        id={`${idPrefix}-tape`}
        input={input}
        frame={frame}
        frameIndex={frameIndex}
        justRead={justRead}
      />
      {runs && runs.value !== null && payload?.pathsTruncated === true && (
        <Box
          id={`${idPrefix}-paths-truncated`}
          sx={{ fontSize: "0.8125rem", color: "text.secondary" }}
        >
          This machine has more runs than the {runs.options.length} listed.
        </Box>
      )}
    </Box>
  );
}

/**
 * An NFA's runs, for the One path switch (registry.js pictureRuns): each with its own frames, in
 * Redux's order (accepting ones first). None for a DFA, which has one run.
 * @returns {Array<{id: string, label: string, accepted: boolean, frames: Object[]}>}
 */
export function automatonRuns(payload) {
  if (payload?.kind !== "nfa" || !Array.isArray(payload.paths)) return [];
  return payload.paths
    .filter((path) => typeof path?.id === "string" && Array.isArray(path.frames))
    .filter((path) => path.frames.length > 0)
    .map((path) => ({
      id: path.id,
      label: String(path.label ?? path.id),
      accepted: path.accepted === true,
      frames: path.frames,
    }));
}

/**
 * The Legend's entries for what an Automaton draws besides states: the entry arrow, the double
 * ring, the arrows' symbols, dashed ε-moves and the Garbage state (each only when the machine
 * has it).
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function automatonAnnotations(payload) {
  const entries = [];
  if (typeof payload?.start === "string") {
    entries.push({
      key: "start",
      text: "Entry arrow (the start state)",
      swatch: { kind: "arrow" },
    });
  }
  if (Array.isArray(payload?.accepting) && payload.accepting.length > 0) {
    entries.push({
      key: "accepting",
      text: "Double ring (an accept state)",
      swatch: { kind: "ring", color: pictureStateStyle("Background").line },
    });
  }
  const transitions = Array.isArray(payload?.transitions) ? payload.transitions : [];
  if (transitions.length > 0) {
    entries.push({
      key: "symbols",
      text: "a, b (the symbols an arrow reads)",
      swatch: { kind: "text", text: "a" },
    });
  }
  if (transitions.some((transition) => transition?.epsilon === true)) {
    entries.push({
      key: "epsilon",
      text: "Dashed arrow (an ε-move: taken without reading a symbol)",
      swatch: { kind: "line", color: edgeLook("Background").line, dash: EPSILON_DASH },
    });
  }
  if (payload?.garbage && typeof payload.garbage.id === "string") {
    const red = pictureStateStyle("Rejected");
    entries.push({
      key: "garbage",
      text: `${payload.garbage.label ?? "Garbage"} (where every missing move leads; the input is rejected)`,
      swatch: { kind: "fill", fill: red.fill, line: red.line },
    });
  }
  return entries;
}
