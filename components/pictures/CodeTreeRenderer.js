// components/pictures/CodeTreeRenderer.js
//
// #214: the Code Tree picture type (ReduxISU/Redux#676), Redux's PICTURE-TYPES.md "Code Tree":
// Lossless Data Compression's Huffman tree, growing bottom-up. Each character of the text is a
// leaf with how often it appears; each step merges the two lightest trees left under a new node
// weighing their sum; left edges read 0 and right edges 1, so once the tree is done each
// character's code is the path down to it, written under (or beside) its leaf. Under the tree
// the text runs character by character, each with its code once the codes are known.
//
// The payload holds the text and its characters (`symbols`: `c1`... in character order, with a
// label safe to draw and a count); each frame holds the merges so far (`merged`: `n1`... in the
// order they were made, each with its weight and its left and right child), the trees not merged
// yet (`roots`), the codes once read (`codes`), the encoded length (`bits`) and the states of the
// nodes (`nodes`) and edges (`edges`, `n1.0` and `n1.1`): an id that is absent is Background.
// What the step merges is highlighted, merges kept so far are Committed, and the finished tree
// turns Solution.
//
// Layout is codeTreeLayout.js's pure function of the payload, the run's frames and the box's
// width: one layout for the whole run (the finished tree), so nothing moves while the steps
// play. Before Run the characters stand in character order as one-node trees. Hanging down on a
// wide box, on its side on a narrow one, so on a phone its text keeps its own size. Hovering,
// focusing or tapping a node traces its path to the root and the tree under it, everything else
// faded by color; a character in the text traces its leaf. The diagram opens fitted to its box
// and zooms and pans with DiagramZoom.js; zoomed in, stepping keeps the step's merge in view.
//
// #250: nothing here can be dragged. Where a node stands is the tree's shape (its height and
// the order its leaves read in), so a node moved by hand would misstate the code.
//
// #239: a gadget's pieces (`highlightIds`, `gadgetColors`; gadgetRings.js) get a ring around
// their node (a merged circle or a character's box) and a band under their edge, drawn inside
// the piece's own group; a marked character's cells in the text strip get an outline too.

import Box from "@mui/material/Box";
import { useMemo, useRef, useState } from "react";
import { paletteVars } from "../theme";
import {
  CODE_LEADING,
  HEAD_SIZE,
  LABEL_SIZE,
  layoutCodeTree,
  SMALL_SIZE,
  WEIGHT_SIZE,
} from "./codeTreeLayout";
import DiagramZoom from "./DiagramZoom";
import {
  GadgetCircle,
  GadgetRect,
  GadgetUnderlay,
  gadgetOutlineProps,
  useGadgetMarks,
} from "./gadgetRings";
import { edgeLook, FAINT_EDGE, FAINT_FILTER, MONO, nodeLook, TRACE_COLOR } from "./graphPieces";
import { pictureStateStyle, stateOf } from "./pictureStates";
import { useBoxWidth } from "./useBoxWidth";

/** The scale (CSS px per drawing unit) the tree's text reads at: its design size. */
const READABLE_SCALE = 1;

/** The most characters of the text the strip under the tree shows. */
const STRIP_MAX = 400;

/** The margin around the merge the view keeps in sight while zoomed in, in drawing units. */
const FRAME_MARGIN = 16;

function plural(count, word, many = `${word}s`) {
  return `${count} ${count === 1 ? word : many}`;
}

/** How an edge looks in a state: a Committed edge dashed like its nodes' outlines. */
function treeEdgeLook(state) {
  const look = edgeLook(state);
  return state === "Committed" ? { ...look, width: 2.6 } : look;
}

/** The ink of text drawn on the canvas (a code, a bit) for a piece in `state`. */
function canvasInk(state) {
  return state === "Background" ? paletteVars.text.primary : pictureStateStyle(state).text;
}

/**
 * @param {Object} props See components/pictures/registry.js for the props every renderer gets.
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.name The visualization's name, for the diagram's label.
 * @param {Object} props.payload The Code Tree payload.
 * @param {Object} props.frame The frame to draw.
 * @param {number|null} props.frameIndex The frame shown, or null before Run.
 * @param {Object[]} [props.frames] Every frame of the run (one layout for all of them).
 * @param {string[]} [props.highlightIds] Gadget piece ids to mark (#239).
 * @param {Object<string, string>} [props.gadgetColors] Color mode's marks, by piece id (#239).
 */
export default function CodeTreeRenderer({
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
  // The run's frames share one layout; a frame on its own (no run passed) lays out its own tree.
  const alone = plain || frames.length ? null : frame;
  const layout = useMemo(
    () => layoutCodeTree(payload, plain ? [] : alone ? [alone] : frames, boxWidth ?? undefined),
    [payload, plain, alone, frames, boxWidth],
  );
  const [hover, setHover] = useState(null);
  const [pinned, setPinned] = useState(null);

  // What this step shows: its merges so far, the codes it knows, the encoded length.
  const shown = new Set(
    plain ? [] : (Array.isArray(frame?.merged) ? frame.merged : []).map((m) => m?.id),
  );
  const merged = layout.merged.filter((merge) => shown.has(merge.id));
  const edges = layout.edges.filter((edge) => shown.has(edge.parent));
  const codes = !plain && frame?.codes && typeof frame.codes === "object" ? frame.codes : {};
  const bits = !plain && Number.isFinite(frame?.bits) ? frame.bits : null;
  const focus = new Set(!plain && Array.isArray(frame?.focus) ? frame.focus : []);

  const nodeById = new Map([
    ...layout.leaves.map((leaf) => [leaf.id, leaf]),
    ...merged.map((merge) => [merge.id, merge]),
  ]);
  const parentOf = new Map();
  for (const merge of merged) {
    parentOf.set(merge.left, merge.id);
    parentOf.set(merge.right, merge.id);
  }
  const pathUp = (id) => {
    const path = [id];
    for (let at = parentOf.get(id); at !== undefined; at = parentOf.get(at)) path.push(at);
    return path;
  };
  const leavesUnder = (id) => {
    const merge = nodeById.get(id);
    if (!merge || merge.leaf) return [id];
    return [...leavesUnder(merge.left), ...leavesUnder(merge.right)];
  };
  const subtree = (id) => {
    const merge = nodeById.get(id);
    if (!merge || merge.leaf) return [id];
    return [id, ...subtree(merge.left), ...subtree(merge.right)];
  };

  // What is traced: a node, its path up to the root and the tree under it.
  const pointedAt = hover ?? pinned;
  const traced = pointedAt !== null && nodeById.has(pointedAt) ? pointedAt : null;
  const near = traced ? new Set([...pathUp(traced), ...subtree(traced)]) : null;
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

  // Zoomed in, a step keeps its merge (the focused nodes) in view.
  const focused = [...focus].map((id) => nodeById.get(id)).filter(Boolean);
  let follow = null;
  if (focused.length) {
    const left = Math.min(...focused.map((node) => node.x - (node.width ?? 0) / 2));
    const right = Math.max(...focused.map((node) => node.x + (node.width ?? 0) / 2));
    const topY = Math.min(...focused.map((node) => node.y - (node.height ?? 0) / 2));
    const bottom = Math.max(...focused.map((node) => node.y + (node.height ?? 0) / 2));
    const box = {
      x: left - layout.radius - FRAME_MARGIN,
      y: topY - layout.radius - FRAME_MARGIN,
      width: right - left + 2 * (layout.radius + FRAME_MARGIN),
      height: bottom - topY + 2 * (layout.radius + FRAME_MARGIN),
    };
    follow = { key: `${frameIndex}:${[...focus].join(",")}`, ...box, path: box };
  }

  // Redux counts the text's UTF-16 code units, as its solver does.
  const text = typeof payload?.text === "string" ? payload.text : "";
  const roots = !plain && Array.isArray(frame?.roots) ? frame.roots.length : null;
  const label = `${name}: ${plural(text.length, "character")}, ${layout.leaves.length} different${merged.length ? `; ${plural(merged.length, "merge")} so far` : ""}${bits !== null ? `; ${plural(bits, "bit")} encoded` : ""}.`;

  return (
    <Box
      ref={boxRef}
      id={`${idPrefix}-codetree`}
      data-drawing-width={layout.width}
      data-orientation={layout.orientation}
      sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <DiagramZoom
        idPrefix={idPrefix}
        label={label}
        drawing={layout}
        resetOn={[payload, frames, layout.width, layout.orientation]}
        follow={follow}
        readableScale={READABLE_SCALE}
        toolbar={
          <Box
            id={`${idPrefix}-summary`}
            data-roots={roots ?? undefined}
            data-bits={bits ?? undefined}
            sx={{ fontSize: "0.8125rem", color: "text.secondary" }}
          >
            {bits !== null
              ? `${plural(bits, "bit")} vs ${8 * text.length} at 8 bits each`
              : roots !== null
                ? `${plural(roots, "tree")} left to merge`
                : `${plural(layout.leaves.length, "one-node tree")} to merge`}
          </Box>
        }
      >
        <text
          x={10}
          y={layout.headY}
          data-head=""
          dominantBaseline="central"
          fill={paletteVars.text.secondary}
          fontFamily={MONO}
          fontSize={HEAD_SIZE}
          fontWeight={600}
          letterSpacing="0.08em"
          pointerEvents="none"
        >
          CODE TREE
        </text>
        <g data-layer="edges">
          {edges.map((edge) => {
            const state = stateOf(frame?.edges, edge.id);
            const onTrace = near !== null && near.has(edge.parent) && near.has(edge.child);
            const look =
              near === null
                ? treeEdgeLook(state)
                : onTrace
                  ? { line: TRACE_COLOR, width: 3, dash: undefined }
                  : FAINT_EDGE;
            return (
              <g
                key={edge.id}
                data-edge-id={edge.id}
                data-state={state}
                data-traced={near ? (onTrace ? "trace" : "faint") : undefined}
                pointerEvents="none"
              >
                <GadgetUnderlay
                  id={edge.id}
                  color={gadgetOf(edge.id)}
                  d={`M${edge.x1},${edge.y1} L${edge.x2},${edge.y2}`}
                  width={look.width}
                />
                <line
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke={look.line}
                  strokeWidth={look.width}
                  strokeDasharray={look.dash}
                  strokeLinecap="round"
                />
                <text
                  x={edge.bitX}
                  y={edge.bitY}
                  data-bit={edge.bit}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={onTrace ? TRACE_COLOR : paletteVars.text.secondary}
                  fontFamily={MONO}
                  fontSize={SMALL_SIZE}
                  fontWeight={700}
                >
                  {edge.bit}
                </text>
              </g>
            );
          })}
        </g>
        <g data-layer="nodes">
          {merged.map((merge) => {
            const state = stateOf(frame?.nodes, merge.id);
            const look = nodeLook(state);
            const faint = near !== null && !near.has(merge.id);
            const isTraced = traced === merge.id;
            const under = leavesUnder(merge.id).map((id) => nodeById.get(id).label);
            const parts = [`Merged tree ${merge.id} of weight ${merge.weight}`];
            parts.push(`holding ${under.join(", ")}`);
            if (state !== "Background") parts.push(pictureStateStyle(state).legend);
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={merge.id}
                data-node-id={merge.id}
                data-state={state}
                data-focus={focus.has(merge.id) ? "true" : undefined}
                data-traced={near ? (faint ? "faint" : "trace") : undefined}
                aria-label={parts.join(", ")}
                style={faint ? { filter: FAINT_FILTER } : undefined}
                {...traceProps(merge.id)}
              >
                <circle
                  cx={merge.x}
                  cy={merge.y}
                  r={layout.radius}
                  data-body=""
                  fill={look.fill}
                  stroke={isTraced ? TRACE_COLOR : look.line}
                  strokeWidth={isTraced ? 3 : look.strokeWidth}
                  strokeDasharray={isTraced ? undefined : look.dash}
                />
                <GadgetCircle
                  id={merge.id}
                  color={gadgetOf(merge.id)}
                  cx={merge.x}
                  cy={merge.y}
                  r={layout.radius}
                />
                <text
                  x={merge.x}
                  y={merge.y}
                  data-label=""
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={look.ink}
                  fontFamily={MONO}
                  fontSize={WEIGHT_SIZE}
                  fontWeight={700}
                  pointerEvents="none"
                >
                  {merge.weight}
                </text>
              </g>
            );
          })}
          {layout.leaves.map((leaf) => {
            const state = stateOf(plain ? null : frame?.nodes, leaf.id);
            const look = nodeLook(state);
            const faint = near !== null && !near.has(leaf.id);
            const isTraced = traced === leaf.id;
            const code = typeof codes[leaf.id] === "string" ? codes[leaf.id] : null;
            const side = layout.orientation === "side";
            const parts = [
              `Character ${leaf.label}, appears ${plural(leaf.count, "time")}`,
              code !== null ? `code ${code}` : "no code yet",
            ];
            if (state !== "Background") parts.push(pictureStateStyle(state).legend);
            const left = leaf.x - leaf.width / 2;
            return (
              // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>.
              <g
                key={leaf.id}
                data-node-id={leaf.id}
                data-leaf=""
                data-state={state}
                data-code={code ?? undefined}
                data-focus={focus.has(leaf.id) ? "true" : undefined}
                data-traced={near ? (faint ? "faint" : "trace") : undefined}
                aria-label={parts.join(", ")}
                style={faint ? { filter: FAINT_FILTER } : undefined}
                {...traceProps(leaf.id)}
              >
                {/* The leaf's whole area, its code too, takes the pointer. */}
                <rect
                  x={left}
                  y={leaf.y - leaf.height / 2}
                  width={leaf.width}
                  height={
                    code !== null && layout.codesBeside && !side
                      ? leaf.code.y -
                        leaf.y +
                        leaf.height / 2 +
                        (code.length - 1) * CODE_LEADING +
                        8
                      : leaf.height
                  }
                  fill="transparent"
                />
                <rect
                  x={left}
                  y={leaf.y - leaf.height / 2}
                  width={leaf.width}
                  height={leaf.height}
                  rx={7}
                  data-body=""
                  fill={look.fill}
                  stroke={isTraced ? TRACE_COLOR : look.line}
                  strokeWidth={isTraced ? 3 : look.strokeWidth}
                  strokeDasharray={isTraced ? undefined : look.dash}
                />
                <GadgetRect
                  id={leaf.id}
                  color={gadgetOf(leaf.id)}
                  x={left}
                  y={leaf.y - leaf.height / 2}
                  width={leaf.width}
                  height={leaf.height}
                  rx={7}
                />
                <text
                  x={side ? left + 8 : leaf.x}
                  y={side ? leaf.y : leaf.y - 7}
                  data-label=""
                  textAnchor={side ? "start" : "middle"}
                  dominantBaseline="central"
                  fill={look.ink}
                  fontFamily={MONO}
                  fontSize={LABEL_SIZE}
                  fontWeight={700}
                  pointerEvents="none"
                >
                  {leaf.label}
                </text>
                <text
                  x={side ? left + leaf.width - 8 : leaf.x}
                  y={side ? leaf.y : leaf.y + 9}
                  data-count=""
                  textAnchor={side ? "end" : "middle"}
                  dominantBaseline="central"
                  fill={look.ink}
                  fontFamily={MONO}
                  fontSize={SMALL_SIZE}
                  pointerEvents="none"
                >
                  {leaf.count}
                </text>
                {code !== null && layout.codesBeside && (
                  <text
                    x={leaf.code.x}
                    y={leaf.code.y}
                    data-code-text={code}
                    textAnchor={side ? "start" : "middle"}
                    dominantBaseline="central"
                    fill={isTraced ? TRACE_COLOR : canvasInk(state)}
                    fontFamily={MONO}
                    fontSize={SMALL_SIZE}
                    fontWeight={700}
                    pointerEvents="none"
                  >
                    {side
                      ? code
                      : [...code].map((digit, k) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: a code's digits are positions.
                          <tspan key={k} x={leaf.code.x} dy={k ? CODE_LEADING : 0}>
                            {digit}
                          </tspan>
                        ))}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </DiagramZoom>
      <EncodedStrip
        idPrefix={idPrefix}
        payload={payload}
        text={text}
        codes={codes}
        bits={bits}
        traced={near ? new Set(leavesUnder(traced)) : null}
        onPoint={setHover}
        gadgetOf={gadgetOf}
      />
    </Box>
  );
}

/**
 * The text under the tree, one cell per character, each with its code once the codes are known
 * (the mockup's ENCODED strip). Pointing at a cell traces its character's leaf. HTML, so it
 * wraps to the box at its own text size.
 */
function EncodedStrip({ idPrefix, payload, text, codes, bits, traced, onPoint, gadgetOf }) {
  const symbols = Array.isArray(payload?.symbols) ? payload.symbols : [];
  // A character's leaf, by its UTF-16 code (Redux counts code units: each half of a surrogate
  // pair is a character there, with its own leaf).
  const leafOf = new Map(symbols.map((symbol) => [symbol.code, symbol]));
  const units = [];
  for (let i = 0; i < text.length; i += 1) units.push(text.charCodeAt(i));
  const cells = units.slice(0, STRIP_MAX).map((unit) => leafOf.get(unit) ?? null);
  const coded = bits !== null;
  const head = coded
    ? `ENCODED · ${plural(bits, "BIT", "BITS")}`
    : `INPUT · ${plural(units.length, "CHARACTER", "CHARACTERS")}`;
  return (
    <Box id={`${idPrefix}-strip`} data-encoded={coded ? "true" : "false"}>
      <Box
        id={`${idPrefix}-strip-head`}
        sx={{
          fontFamily: MONO,
          fontSize: "0.6875rem",
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: "text.secondary",
          mb: 0.5,
        }}
      >
        {head}
      </Box>
      <Box
        component="ol"
        aria-label={coded ? `The text encoded in ${plural(bits, "bit")}` : "The text"}
        sx={{ display: "flex", flexWrap: "wrap", gap: "3px", listStyle: "none", m: 0, p: 0 }}
      >
        {cells.map((symbol, k) => {
          const code = symbol && typeof codes[symbol.id] === "string" ? codes[symbol.id] : null;
          const lit = traced !== null && symbol !== null && traced.has(symbol.id);
          return (
            <Box
              component="li"
              // biome-ignore lint/suspicious/noArrayIndexKey: a cell is a position in the text.
              key={k}
              {...(symbol ? gadgetOutlineProps(symbol.id, gadgetOf(symbol.id)) : {})}
              data-cell={symbol?.id ?? ""}
              data-traced={traced ? (lit ? "trace" : "faint") : undefined}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse" && symbol) onPoint(symbol.id);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") onPoint(null);
              }}
              sx={{
                minWidth: 18,
                px: "4px",
                py: "2px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                fontFamily: MONO,
                lineHeight: 1.3,
                border: "1px solid",
                borderColor: lit ? TRACE_COLOR : paletteVars.border.main,
                // The trace thickens the outline without growing the cell: a cell that grew
                // would rewrap the strip, move it from under the pointer, and flicker.
                boxShadow: lit ? `inset 0 0 0 1px ${TRACE_COLOR}` : "none",
                borderRadius: "4px",
                bgcolor: k % 2 ? paletteVars.surface.main : paletteVars.surface.input,
              }}
            >
              <Box component="span" sx={{ fontSize: "0.75rem", color: "text.primary" }}>
                {symbol ? symbol.label : "?"}
              </Box>
              {code !== null && (
                <Box
                  component="span"
                  data-cell-code=""
                  sx={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    color: lit ? TRACE_COLOR : "text.secondary",
                  }}
                >
                  {code}
                </Box>
              )}
            </Box>
          );
        })}
        {units.length > STRIP_MAX && (
          <Box
            component="li"
            data-more=""
            sx={{ alignSelf: "center", fontSize: "0.75rem", color: "text.secondary", px: 1 }}
          >
            {`+${units.length - STRIP_MAX} more`}
          </Box>
        )}
      </Box>
    </Box>
  );
}

/**
 * The Legend's entries for what a Code Tree draws besides states: the 0 / 1 on the edges, the
 * weight in a merged node, and the codes once the run writes them.
 * @returns {Array<{key: string, text: string, swatch: Object}>}
 */
export function codeTreeAnnotations(_payload, frames) {
  const list = Array.isArray(frames) ? frames.filter(Boolean) : [];
  const entries = [];
  if (list.some((frame) => Array.isArray(frame.merged) && frame.merged.length)) {
    entries.push(
      {
        key: "weight",
        text: "Circle (a merged tree; its number is how many characters it holds)",
        swatch: { kind: "text", text: "7" },
      },
      {
        key: "bit",
        text: "0 / 1 on an edge (going left adds 0 to a code, going right adds 1)",
        swatch: { kind: "text", text: "0" },
      },
    );
  }
  if (list.some((frame) => frame.codes && Object.keys(frame.codes).length)) {
    entries.push({
      key: "code",
      text: "Code (a character's bits, read from the root down to it)",
      swatch: { kind: "text", text: "01" },
    });
  }
  return entries;
}
