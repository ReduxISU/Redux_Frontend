// components/pictures/NestedSetRenderer.js
//
// #271: the Nested Set picture type (ReduxISU/Redux#926), Redux's PICTURE-TYPES.md "Nested Set".
// The sets drawn as sets: every element of U is a labelled dot on a circle, and every set a
// padded, rounded region round its own elements, its name on its edge, so overlaps and subsets
// show directly. A second picture for Set Cover, Exact Cover and Hitting Set, next to the
// Bipartite Graph; it replaces neither.
//
// The payload is the Bipartite Graph's without its edges: the elements, the sets with their
// members, which side the answer picks (`pickSide`) and the rule (`rule`). Each frame holds the
// states of the elements and the sets (`nodes`) and `hits`, how many picks hit each constraint (a
// ×N badge above 1: a count, not a state). The ids are the Bipartite Graph's exactly (element
// `e:{x}`, set `S{i}`), so both pictures color the same element and set the same way.
//
// When the regions don't read (more than 12 elements or 8 sets, an element in more than 4
// overlapping sets, a region that would run into a dot outside it, or no free spot for a set's
// name: nestedSetLayout.js), the picture is the set list instead: U, then one row per set with its
// elements as chips, each carrying its element's state. The heading says why, and the Layout
// switch (Regions (auto) / Set list) forces the list.
//
// Hovering, focusing or tapping a dot traces it and every set it is in; a set (its name, or its
// outline) traces its region and its elements; everything else fades by color (grayscale and a
// dashed outline), never by opacity.
//
// #239: a gadget's pieces (`highlightIds`, `gadgetColors`; gadgetRings.js) are marked: a dot or a
// chip gets a ring, a set's name a box round it and its region a band under its outline.

import Box from "@mui/material/Box";
import { Fragment, useMemo, useRef, useState } from "react";
import { paletteVars } from "../theme";
import DiagramZoom from "./DiagramZoom";
import { GadgetCircle, GadgetRect, GadgetUnderlay, useGadgetMarks } from "./gadgetRings";
import { Badge, FAINT_FILTER, MONO, nodeLook, PictureToggle, TRACE_COLOR } from "./graphPieces";
import { DOT, listLayout, nestedSetPieces, regionsLayout } from "./nestedSetLayout";
import { pictureStateStyle, stateOf } from "./pictureStates";
import { useBoxWidth } from "./useBoxWidth";

const LAYOUT_CHOICES = [
  { value: "auto", label: "Regions (auto)" },
  { value: "list", label: "Set list" },
];

/** A faded piece's outline: grey and dashed, never transparent. */
const FAINT_DASH = "3 3";

/**
 * How a region (or a set-list row) looks in a state: the tint behind its elements, its outline,
 * the outline's width and dash.
 */
function regionLook(state) {
  const style = pictureStateStyle(state);
  const tints = paletteVars.viz.tint;
  switch (state) {
    case "Solution":
      return { fill: tints.covered, line: style.line, width: 3.2 };
    case "Covered":
      return { fill: tints.covered, line: style.line, width: 2.4 };
    case "Committed":
      return { fill: tints.committed, line: style.line, width: 2.8, dash: "7 4" };
    case "ElementHighlight":
      return { fill: tints.elementHighlight, line: style.line, width: 3.2 };
    case "Rejected":
      return { fill: tints.rejected, line: style.line, width: 3.2 };
    case "Blocked":
      return { fill: "none", line: style.line, width: 1.8, dash: "4 4" };
    default:
      return { fill: "none", line: style.line, width: 1.8, dash: style.dash };
  }
}

/** How a set's name tag looks in a state (a Background tag is the canvas with a grey line). */
function tagLook(state) {
  const look = nodeLook(state);
  if (state === "Background") {
    return { ...look, fill: paletteVars.surface.input, ink: paletteVars.text.primary };
  }
  return look;
}

/** "{1,2,3}", a set's members by label. */
function braces(labels) {
  return `{${labels.join(",")}}`;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Nested Set payload.
 * @param {Object} props.frame The frame to draw.
 * @param {string[]} [props.highlightIds] Gadget piece ids to mark (#239).
 * @param {Object<string, string>} [props.gadgetColors] Color mode's marks, by piece id (#239).
 */
export default function NestedSetRenderer({
  idPrefix,
  name,
  payload,
  frame,
  highlightIds,
  gadgetColors,
}) {
  const gadgetOf = useGadgetMarks(highlightIds, gadgetColors);
  const boxRef = useRef(null);
  const boxWidth = useBoxWidth(boxRef);
  const [mode, setMode] = useState("auto");
  const pieces = useMemo(() => nestedSetPieces(payload), [payload]);
  const regions = useMemo(() => regionsLayout(payload), [payload]);
  const list = useMemo(() => listLayout(payload, boxWidth ?? undefined), [payload, boxWidth]);
  const drawRegions = mode === "auto" && regions.ok;
  const why = mode === "list" ? null : regions.ok ? null : regions.why;
  const drawing = drawRegions ? regions : list;

  const pickSide = payload?.pickSide === "elements" ? "elements" : "sets";
  const pickSets = pickSide === "sets";
  const elementLabel = new Map(pieces.elements.map((element) => [element.id, element.label]));
  const setsOf = useMemo(() => {
    const map = new Map(pieces.elements.map((element) => [element.id, []]));
    for (const set of pieces.sets) for (const id of set.members) map.get(id).push(set.id);
    return map;
  }, [pieces]);
  const membersOf = new Map(pieces.sets.map((set) => [set.id, set.members]));
  const neighbours = (id) => setsOf.get(id) ?? membersOf.get(id) ?? null;

  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);
  // (An id from an earlier payload, after the instance changed, traces nothing.)
  const pointedAt = hover ?? pinned;
  const traced = pointedAt !== null && neighbours(pointedAt) ? pointedAt : null;
  const near = traced ? new Set([traced, ...neighbours(traced)]) : null;
  const traceOf = (id) => (near ? (near.has(id) ? "trace" : "faint") : undefined);

  const hits = frame?.hits && typeof frame.hits === "object" ? frame.hits : {};
  // A constraint (an element when sets are picked, a set when elements are) hit more than once.
  const hitCount = (id, isSet) => {
    const count = Number.isInteger(hits[id]) ? hits[id] : 0;
    return isSet === !pickSets ? count : 0;
  };

  const toggle = (id) => setPinned((current) => (current === id ? null : id));
  const pointerProps = (id) => ({
    onPointerEnter: (event) => {
      if (event.pointerType === "mouse") setHover(id);
    },
    onPointerLeave: (event) => {
      if (event.pointerType === "mouse") setHover(null);
    },
    onClick: () => toggle(id),
  });
  const traceProps = (id) => ({
    ...pointerProps(id),
    "data-focusable": "",
    tabIndex: 0,
    role: "button",
    "aria-pressed": pinned === id,
    onFocus: () => setHover(id),
    onBlur: () => setHover(null),
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle(id);
      }
    },
  });

  const elementSpoken = (id, where) => {
    const state = stateOf(frame?.nodes, id);
    const parts = [`Element ${elementLabel.get(id)}`];
    if (where) parts.push(`in ${where}`);
    if (state !== "Background") parts.push(pictureStateStyle(state).legend);
    const count = hitCount(id, false);
    if (count > 0) parts.push(`hit by ${plural(count, "picked set")}`);
    const sets = setsOf.get(id) ?? [];
    if (!where) parts.push(sets.length ? `in ${sets.join(", ")}` : "in no set");
    return parts.join(", ");
  };
  const setSpoken = (set) => {
    const state = stateOf(frame?.nodes, set.id);
    const parts = [`Set ${set.label} ${braces(set.members.map((id) => elementLabel.get(id)))}`];
    if (state !== "Background") parts.push(pictureStateStyle(state).legend);
    const count = hitCount(set.id, true);
    if (count > 0) parts.push(`hit by ${plural(count, "picked element")}`);
    return parts.join(", ");
  };

  const label = `${name}: ${plural(pieces.elements.length, "element")} and ${plural(pieces.sets.length, "set")}, drawn ${drawRegions ? "as regions round their elements" : "as a list of sets"}; the answer picks ${pickSets ? "sets" : "elements"}.`;
  const headStyle = {
    fill: paletteVars.text.secondary,
    fontFamily: MONO,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    dominantBaseline: "central",
  };
  const second =
    mode === "list"
      ? "SET LIST CHOSEN BY HAND"
      : why
        ? `REGIONS DON'T FIT: ${why.toUpperCase()}`
        : null;

  /** A dot (or a chip) of element `id`: its body, gadget ring, label and ×N badge. */
  const elementPiece = (id, key, shape, where) => {
    const state = stateOf(frame?.nodes, id);
    const look = nodeLook(state);
    const trace = traceOf(id);
    const lit = traced === id;
    const count = hitCount(id, false);
    const line = lit ? TRACE_COLOR : look.line;
    const dash = lit ? undefined : trace === "faint" ? FAINT_DASH : look.dash;
    const text = elementLabel.get(id);
    const common = {
      "data-body": "",
      fill: look.fill,
      stroke: line,
      strokeWidth: lit ? 3 : look.strokeWidth,
      strokeDasharray: dash,
    };
    return (
      // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
      <g
        key={key}
        data-node-id={id}
        data-in-set={where ?? undefined}
        data-state={state}
        data-hits={count || undefined}
        data-traced={trace}
        aria-label={elementSpoken(id, where)}
        style={trace === "faint" ? { filter: FAINT_FILTER } : undefined}
        {...traceProps(id)}
      >
        {shape.circle ? (
          <>
            <circle cx={shape.x} cy={shape.y} r={DOT} {...common} />
            <GadgetCircle id={id} color={gadgetOf(id)} cx={shape.x} cy={shape.y} r={DOT} />
          </>
        ) : (
          <>
            <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={DOT} {...common} />
            <GadgetRect
              id={id}
              color={gadgetOf(id)}
              x={shape.x}
              y={shape.y}
              width={shape.w}
              height={shape.h}
              rx={DOT}
            />
          </>
        )}
        <text
          x={shape.circle ? shape.x : shape.x + shape.w / 2}
          y={shape.circle ? shape.y : shape.y + shape.h / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={look.ink}
          fontFamily={MONO}
          fontSize={shape.circle && String(text).length > 2 ? 10.5 : 13.5}
          fontWeight={look.bold ? 700 : 400}
          pointerEvents="none"
        >
          {text}
        </text>
        {count > 1 && (
          <Badge
            x={shape.circle ? shape.x + DOT - 2 : shape.x + shape.w - 2}
            y={shape.circle ? shape.y - DOT + 2 : shape.y + 2}
            text={`×${count}`}
            testId="hits"
          />
        )}
      </g>
    );
  };

  /** A set's name tag at (x, y) its top left, with its gadget box and ×N badge. */
  const tagPiece = (set, box, focusable) => {
    const state = stateOf(frame?.nodes, set.id);
    const look = tagLook(state);
    const trace = traceOf(set.id);
    const lit = traced === set.id;
    const count = hitCount(set.id, true);
    const body = (
      <>
        <rect
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          rx={11}
          data-body=""
          fill={look.fill}
          stroke={lit ? TRACE_COLOR : look.line}
          strokeWidth={lit ? 3 : Math.min(look.strokeWidth, 2.6)}
          strokeDasharray={lit ? undefined : trace === "faint" ? FAINT_DASH : look.dash}
        />
        <GadgetRect
          id={set.id}
          color={gadgetOf(set.id)}
          x={box.x}
          y={box.y}
          width={box.w}
          height={box.h}
          rx={11}
        />
        <text
          x={box.x + box.w / 2}
          y={box.y + box.h / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={look.ink}
          fontFamily={MONO}
          fontSize={12.5}
          fontWeight={700}
          pointerEvents="none"
        >
          {set.label}
        </text>
        {count > 1 && <Badge x={box.x + box.w} y={box.y + 1} text={`×${count}`} testId="hits" />}
      </>
    );
    if (!focusable) return body;
    return (
      // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
      <g
        key={set.id}
        data-node-id={set.id}
        data-state={state}
        data-hits={count || undefined}
        data-traced={trace}
        aria-label={setSpoken(set)}
        style={trace === "faint" ? { filter: FAINT_FILTER } : undefined}
        {...traceProps(set.id)}
      >
        {body}
      </g>
    );
  };

  /** A region's (or a row's) outline in its state, or the trace's, or faded. */
  const outlineOf = (id) => {
    const look = regionLook(stateOf(frame?.nodes, id));
    const trace = traceOf(id);
    if (traced === id) return { ...look, line: TRACE_COLOR, width: 3, dash: undefined, trace };
    if (trace === "faint") {
      return { ...look, line: pictureStateStyle("Blocked").line, dash: FAINT_DASH, trace };
    }
    return { ...look, trace };
  };

  return (
    <Box
      ref={boxRef}
      id={`${idPrefix}-nestedset`}
      data-layout={drawRegions ? "regions" : "list"}
      data-fallback={why ?? undefined}
      data-pick-side={pickSide}
      data-rule={payload?.rule ?? ""}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <DiagramZoom
        idPrefix={idPrefix}
        label={label}
        drawing={drawing}
        resetOn={[payload, drawRegions, drawing.width]}
        toolbar={
          <PictureToggle
            id={`${idPrefix}-layout`}
            label="Layout"
            options={LAYOUT_CHOICES}
            value={mode}
            onChange={setMode}
          />
        }
      >
        <g data-layer="heads">
          <text x={12} y={22} {...headStyle}>
            {drawRegions ? "SETS AS REGIONS ROUND THEIR ELEMENTS" : "SET LIST"}
            <tspan fill={paletteVars.brand.line} data-picked-head="">
              {`  ● PICKED: ${pickSets ? "SETS" : "ELEMENTS"}`}
            </tspan>
          </text>
          {!drawRegions && second && (
            <text x={12} y={38} data-fallback-reason="" {...headStyle}>
              {second}
            </text>
          )}
        </g>
        {drawRegions ? (
          <>
            {/* Every fill under every outline, the biggest region first. */}
            <g data-layer="shade">
              {regions.regions.map((region) => {
                const look = outlineOf(region.id);
                if (look.fill === "none") return null;
                return (
                  <path
                    key={region.id}
                    data-piece-for={region.id}
                    d={region.d}
                    fill={look.fill}
                    pointerEvents="none"
                    style={look.trace === "faint" ? { filter: FAINT_FILTER } : undefined}
                  />
                );
              })}
            </g>
            <g data-layer="regions">
              {regions.regions.map((region) => {
                const look = outlineOf(region.id);
                return (
                  <g
                    key={region.id}
                    data-piece-for={region.id}
                    data-region-id={region.id}
                    data-state={stateOf(frame?.nodes, region.id)}
                    data-traced={look.trace}
                    style={look.trace === "faint" ? { filter: FAINT_FILTER } : undefined}
                    {...pointerProps(region.id)}
                  >
                    <GadgetUnderlay
                      id={region.id}
                      color={gadgetOf(region.id)}
                      d={region.d}
                      width={look.width}
                    />
                    <path
                      d={region.d}
                      data-region-edge=""
                      fill="none"
                      stroke={look.line}
                      strokeWidth={look.width}
                      strokeDasharray={look.dash}
                      strokeLinejoin="round"
                      pointerEvents="stroke"
                    />
                  </g>
                );
              })}
            </g>
            <g data-layer="elements">
              {pieces.elements.map((element) => {
                const p = regions.positions.get(element.id);
                return elementPiece(element.id, element.id, { circle: true, x: p.x, y: p.y });
              })}
            </g>
            <g data-layer="names">
              {regions.labels.map((placed) => {
                const set = pieces.sets.find((candidate) => candidate.id === placed.id);
                return (
                  <Fragment key={placed.id}>
                    {tagPiece(
                      set,
                      { x: placed.box.x, y: placed.box.y, w: placed.w, h: placed.h },
                      true,
                    )}
                  </Fragment>
                );
              })}
            </g>
          </>
        ) : (
          <>
            <g data-layer="shade">
              {list.rows.map((row) => {
                if (row.id === "U") return null;
                const look = outlineOf(row.id);
                if (look.fill === "none") return null;
                return (
                  <rect
                    key={row.id}
                    data-piece-for={row.id}
                    x={row.x}
                    y={row.y}
                    width={row.w}
                    height={row.h}
                    rx={10}
                    fill={look.fill}
                    pointerEvents="none"
                    style={look.trace === "faint" ? { filter: FAINT_FILTER } : undefined}
                  />
                );
              })}
            </g>
            <g data-layer="rows">
              {list.rows.map((row) => {
                const isU = row.id === "U";
                const set = isU ? null : pieces.sets.find((candidate) => candidate.id === row.id);
                const look = isU ? null : outlineOf(row.id);
                const state = isU ? undefined : stateOf(frame?.nodes, row.id);
                const tagBox = { x: row.x + 10, y: row.y + row.h / 2 - 11, w: 52, h: 22 };
                const braceStyle = {
                  fontFamily: MONO,
                  fontSize: 20,
                  fill: paletteVars.text.primary,
                  dominantBaseline: "central",
                  pointerEvents: "none",
                };
                const inner = (
                  <>
                    {!isU && (
                      <>
                        <rect
                          x={row.x}
                          y={row.y}
                          width={row.w}
                          height={row.h}
                          rx={10}
                          data-body=""
                          fill="none"
                          pointerEvents="all"
                          stroke={look.line}
                          strokeWidth={look.width}
                          strokeDasharray={look.dash}
                        />
                        <GadgetRect
                          id={row.id}
                          color={gadgetOf(row.id)}
                          x={row.x}
                          y={row.y}
                          width={row.w}
                          height={row.h}
                          rx={10}
                        />
                      </>
                    )}
                    {isU ? (
                      <>
                        <rect
                          x={tagBox.x}
                          y={tagBox.y}
                          width={tagBox.w}
                          height={tagBox.h}
                          rx={11}
                          fill={paletteVars.surface.input}
                          stroke={pictureStateStyle("Background").line}
                          strokeWidth={1.4}
                        />
                        <text
                          x={tagBox.x + tagBox.w / 2}
                          y={tagBox.y + tagBox.h / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={paletteVars.text.primary}
                          fontFamily={MONO}
                          fontSize={12.5}
                          fontWeight={700}
                        >
                          U
                        </text>
                      </>
                    ) : (
                      tagPiece(set, tagBox, false)
                    )}
                    <text x={row.x + 70} y={row.y + row.h / 2} {...braceStyle}>
                      {"{"}
                    </text>
                    <text x={row.x + row.w - 16} y={row.y + row.h / 2} {...braceStyle}>
                      {"}"}
                    </text>
                  </>
                );
                if (isU) {
                  return (
                    <g key="U" data-row="U" aria-hidden="true">
                      {inner}
                    </g>
                  );
                }
                return (
                  // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
                  <g
                    key={row.id}
                    data-node-id={row.id}
                    data-row={row.id}
                    data-state={state}
                    data-hits={hitCount(row.id, true) || undefined}
                    data-traced={look.trace}
                    aria-label={setSpoken(set)}
                    style={look.trace === "faint" ? { filter: FAINT_FILTER } : undefined}
                    {...traceProps(row.id)}
                  >
                    {inner}
                  </g>
                );
              })}
            </g>
            <g data-layer="chips">
              {list.rows.flatMap((row) =>
                row.chips.map((chip) =>
                  elementPiece(
                    chip.id,
                    `${row.id}-${chip.id}`,
                    { circle: false, ...chip },
                    row.id === "U" ? null : row.label,
                  ),
                ),
              )}
            </g>
          </>
        )}
      </DiagramZoom>
    </Box>
  );
}

/**
 * The Legend's entries for what a nested set picture draws besides states: the ×N badge on a
 * constraint hit more than once, when the run has one.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function nestedSetAnnotations(payload, frames) {
  const list = Array.isArray(frames) ? frames.filter(Boolean) : [];
  const counts = list.flatMap((frame) =>
    frame.hits && typeof frame.hits === "object" ? Object.values(frame.hits) : [],
  );
  if (!counts.some((count) => count > 1)) return [];
  const what = payload?.pickSide === "elements" ? "picked elements" : "picked sets";
  return [{ key: "hits", text: `×N (hit by N ${what})`, swatch: { kind: "badge", text: "×2" } }];
}
