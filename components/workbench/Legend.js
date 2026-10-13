// components/workbench/Legend.js
//
// #229: the Legend dropdown at the bottom of the picture pane, open by default.
//
// The renderers and the frames they draw do not carry legend text of their own yet, so this
// lists the shared color keys (VISUALIZATION_TYPE_CONTRACTS.md section 4.3) that actually
// appear in the pictures on screen, each with the same theme color the renderers use for it.
// A picture with no color keys at all (the pump schedule, for one) says so instead of
// listing colors it does not use.

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import { useState } from "react";
import { getVisualizationColor, getVisualizationFill } from "../theme";

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

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {Object[]} props.frames Every frame currently drawn (one per picture on screen).
 */
export default function Legend({ idPrefix, frames }) {
  const [open, setOpen] = useState(true);
  const found = new Set();
  for (const frame of frames) {
    if (frame) collectKeys(frame, found, null);
  }
  const entries = KEY_TEXT.filter(([key]) => found.has(key));
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
          entries.map(([key, text]) => (
            <Box
              key={key}
              component="span"
              sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}
            >
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  width: 22,
                  height: 16,
                  borderRadius: "4px",
                  backgroundColor: getVisualizationFill(key),
                  border: "2px solid",
                  borderColor: getVisualizationColor(key),
                  boxSizing: "border-box",
                  flex: "none",
                }}
              />
              {text}
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}
