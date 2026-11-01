// components/workbench/Legend.js
//
// #229: the Legend dropdown at the bottom of the picture pane, open by default.
//
// The renderers and the frames they draw do not carry legend text of their own yet, so this
// lists the shared color keys (VISUALIZATION_TYPE_CONTRACTS.md section 4.3) that actually
// appear in the pictures on screen, each with the same theme color the renderers use for it.
// A picture with no color keys at all (the pump schedule, for one) says so instead of
// listing colors it does not use.
//
// #199: a format=frames picture names its pieces with the shared picture states instead
// (components/pictures/pictureStates.js). Those are listed from `states`, in that table's
// order, wording and colors, with the faded states' swatches dashed as they are drawn.
//
// #201: after the states come the picture's annotations (`annotations`, from
// components/pictures/registry.js's pictureAnnotations): what it draws that is not a state,
// such as group colors, order badges or missing edges. Each names its swatch's kind:
//   fill   {fill, line}       a box like a state's
//   line   {color, dash?}     a short stroke (an edge kind)
//   badge  {text?}            a round badge with a number (or `text`, such as "×2")
//   text   {text}             a short label drawn as the picture draws it (T, #1, d = 2)
//   ring   {color?}           a circle inside an outer ring (a terminal, the tried variable)
//   arrow                     an arrowhead (a directed edge)

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import { useState } from "react";
import { PICTURE_STATES, pictureStateStyle } from "../pictures/pictureStates";
import { getVisualizationColor, getVisualizationFill, paletteVars } from "../theme";

// Order and wording of each color key's legend entry.
const KEY_TEXT = [
  ["Solution", "Part of the answer"],
  ["ElementHighlight", "Highlighted element"],
  ["ClauseHighlight", "Highlighted clause or group"],
  ["Background", "Not highlighted"],
];
const KNOWN_KEYS = new Set(KEY_TEXT.map(([key]) => key));
const COLOR_FIELDS = new Set(["color", "outline"]);

// Walks a frame and records every known color key found in a `color`/`outline` field or a
// `cellColors` map. Bounded by the frame's own size; frames are plain JSON.
function collectKeys(value, found, parentKey) {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, found, parentKey);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (key === "cellColors" && child && typeof child === "object") {
        for (const cell of Object.values(child)) {
          if (KNOWN_KEYS.has(cell)) found.add(cell);
        }
      } else {
        collectKeys(child, found, key);
      }
    }
    return;
  }
  if (typeof value === "string" && COLOR_FIELDS.has(parentKey) && KNOWN_KEYS.has(value)) {
    found.add(value);
  }
}

/** An annotation's swatch, drawn in the same 22 x 16 box as a state's. */
function AnnotationSwatch({ swatch }) {
  const plain = pictureStateStyle("Background");
  let inner = null;
  if (swatch.kind === "line") {
    inner = (
      <line
        x1={1}
        y1={8}
        x2={21}
        y2={8}
        stroke={swatch.color ?? plain.line}
        strokeWidth={2.4}
        strokeDasharray={swatch.dash}
      />
    );
  } else if (swatch.kind === "badge") {
    inner = (
      <>
        {String(swatch.text ?? "3").length > 1 ? (
          <rect x={0} y={0.5} width={22} height={15} rx={7.5} fill={paletteVars.text.primary} />
        ) : (
          <circle cx={11} cy={8} r={7.5} fill={paletteVars.text.primary} />
        )}
        <text
          x={11}
          y={8}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={9}
          fontWeight={700}
          fill={paletteVars.surface.input}
        >
          {swatch.text ?? "3"}
        </text>
      </>
    );
  } else if (swatch.kind === "text") {
    inner = (
      <text
        x={11}
        y={8}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={700}
        fill={paletteVars.text.primary}
      >
        {swatch.text}
      </text>
    );
  } else if (swatch.kind === "ring") {
    inner = (
      <>
        <circle cx={11} cy={8} r={4.5} fill={plain.fill} stroke={plain.line} strokeWidth={1.5} />
        <circle
          cx={11}
          cy={8}
          r={7.2}
          fill="none"
          stroke={swatch.color ?? plain.text}
          strokeWidth={1.5}
        />
      </>
    );
  } else if (swatch.kind === "arrow") {
    inner = (
      <>
        <line x1={1} y1={8} x2={14} y2={8} stroke={plain.line} strokeWidth={2} />
        <polygon points="21,8 12,3 12,13" fill={plain.line} />
      </>
    );
  }
  if (inner) {
    return (
      <Box
        component="svg"
        aria-hidden="true"
        viewBox="0 0 22 16"
        sx={{ width: 22, height: 16, flex: "none", overflow: "visible" }}
      >
        {inner}
      </Box>
    );
  }
  return (
    <Box
      component="span"
      aria-hidden="true"
      sx={{
        width: 22,
        height: 16,
        borderRadius: "4px",
        backgroundColor: swatch.fill,
        border: "2px solid",
        borderColor: swatch.line,
        boxSizing: "border-box",
        flex: "none",
      }}
    />
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {Object[]} props.frames Every frame currently drawn (one per picture on screen).
 * @param {Set<string>|null} [props.states] Picture states a format=frames picture uses.
 * @param {Array<{key: string, text: string, swatch: Object}>|null} [props.annotations] What a
 *   format=frames picture draws besides states (#201).
 */
export default function Legend({ idPrefix, frames, states, annotations }) {
  const [open, setOpen] = useState(true);
  const found = new Set();
  for (const frame of frames) {
    if (frame) collectKeys(frame, found, null);
  }
  const entries = KEY_TEXT.filter(([key]) => found.has(key)).map(([key, text]) => ({
    key,
    text,
    fill: getVisualizationFill(key),
    line: getVisualizationColor(key),
    dashed: false,
  }));
  for (const state of PICTURE_STATES) {
    if (!states?.has(state.name)) continue;
    const style = pictureStateStyle(state.name);
    entries.push({
      key: `state-${state.name}`,
      text: style.legend,
      fill: style.fill,
      line: style.line,
      dashed: Boolean(style.dash),
    });
  }
  for (const annotation of annotations ?? []) {
    entries.push({
      key: `note-${annotation.key}`,
      text: annotation.text,
      swatch: annotation.swatch,
    });
  }
  const bodyId = `${idPrefix}-body`;

  return (
    <Box
      sx={{
        borderTop: "1px solid",
        borderColor: "border.soft",
        pt: 0.5,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Box
        id={`${idPrefix}-toggle`}
        component="button"
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((current) => !current)}
        sx={{
          alignSelf: "flex-start",
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          background: "none",
          border: "none",
          color: "text.primary",
          p: 0,
          fontFamily: "inherit",
          fontSize: "0.9375rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <ExpandMoreIcon
          aria-hidden="true"
          sx={{ fontSize: 18, transform: open ? "none" : "rotate(-90deg)" }}
        />
        Legend
      </Box>
      <Box
        id={bodyId}
        hidden={!open}
        sx={{
          display: open ? "flex" : "none",
          flexWrap: "wrap",
          gap: "8px 20px",
          fontSize: "0.8125rem",
          color: "ink.text2",
          pb: 0.5,
        }}
      >
        {entries.length === 0 ? (
          <Box component="span">This picture uses no highlight colors.</Box>
        ) : (
          entries.map(({ key, text, fill, line, dashed, swatch }) => (
            <Box
              key={key}
              component="span"
              data-legend-key={key}
              sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}
            >
              {swatch ? (
                <AnnotationSwatch swatch={swatch} />
              ) : (
                <Box
                  component="span"
                  aria-hidden="true"
                  sx={{
                    width: 22,
                    height: 16,
                    borderRadius: "4px",
                    backgroundColor: fill,
                    border: `2px ${dashed ? "dashed" : "solid"}`,
                    borderColor: line,
                    boxSizing: "border-box",
                    flex: "none",
                  }}
                />
              )}
              {text}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
