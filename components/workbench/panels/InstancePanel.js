// components/workbench/panels/InstancePanel.js
//
// #229: the Instance panel. For now it holds the full instance as one editable text box,
// plus the problem's declared format description. The design's "By part" boxes (one per
// clause, or Nodes / Edges / K) need the backend's per-part description (ReduxISU/Redux#851)
// and land with the part editor (#228); the spot is marked below and nothing here guesses
// at how to split an instance.
//
// #279 (board F): this is the Instance pane's content. Collapsed (`expanded` false) it is just
// the instance field, one line high (it wraps and grows on phones and tablets), with any error
// under it; Show all adds the label, three lines, the format and "By part". It is the same field
// in both states, so focus and the caret stay put across Show all / Show less.
//
// A one-line field that scrolls sideways would put its scrollbar over the text, so the field
// grows by the scrollbar's height whenever one shows (useRoomForScrollbar below).

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useLayoutEffect, useRef } from "react";
import { COMPACT_MEDIA, MONO_FONT } from "../layout";

/**
 * Gives a field the height of its horizontal scrollbar on top of its own, so the bar sits under
 * the text instead of covering it. Measured rather than guessed, since the bar's height depends
 * on the browser and the system (overlay scrollbars take none).
 * @param {string} text The field's value; the bar comes and goes with it.
 * @returns {import("react").RefObject<HTMLTextAreaElement>}
 */
function useRoomForScrollbar(text) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      el.style.height = "";
      const style = getComputedStyle(el);
      const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const bar = el.offsetHeight - el.clientHeight - borders;
      if (bar > 0) el.style.height = `${el.offsetHeight + bar}px`;
    };
    fit();
    // The bar also comes and goes with the field's width (window size, panes opening). Only a
    // new width refits: fit() changes the height, which would otherwise call it again.
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);
  return ref;
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {Object} props.problem The problem, as hooks/useProblemDetail.js builds it.
 * @param {string} props.instance The current instance text.
 * @param {(next: string) => void} props.onInstanceChange Called on every edit.
 * @param {{headline: string, detail: string, expected?: string}|null} props.instanceError
 *   Why Redux could not read this instance, when it could not.
 * @param {boolean} [props.expanded] Show all (#279); collapsed it is the field alone.
 */
export default function InstancePanel({
  idPrefix,
  problem,
  instance,
  onInstanceChange,
  instanceError,
  expanded = true,
}) {
  const inputId = `${idPrefix}-full-instance`;
  const inputRef = useRoomForScrollbar(`${expanded}|${instance}`);
  const errorId = `${idPrefix}-full-instance-error`;
  const formatId = `${idPrefix}-full-instance-format`;
  const describedBy = [
    instanceError ? errorId : null,
    expanded && problem.instanceFormat ? formatId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {expanded && (
        <Box component="label" htmlFor={inputId} sx={{ fontWeight: 600 }}>
          Full instance
        </Box>
      )}
      <Box
        id={inputId}
        ref={inputRef}
        component="textarea"
        rows={expanded ? 3 : 1}
        aria-label={expanded ? undefined : "Full instance"}
        value={instance}
        onChange={(event) => onInstanceChange(event.target.value)}
        placeholder="No default instance declared for this problem yet."
        aria-invalid={Boolean(instanceError)}
        aria-describedby={describedBy || undefined}
        spellCheck={false}
        sx={{
          width: "100%",
          boxSizing: "border-box",
          resize: expanded ? "vertical" : "none",
          // Collapsed: one line, scrolling sideways on a wide screen; wrapping and growing with
          // the text on phones and tablets.
          ...(expanded
            ? {}
            : {
                whiteSpace: "pre",
                overflowX: "auto",
                overflowY: "hidden",
                [COMPACT_MEDIA]: {
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                  fieldSizing: "content",
                },
              }),
          backgroundColor: "surface.input",
          color: "text.primary",
          border: "1px solid",
          borderColor: instanceError ? "status.err" : "border.main",
          borderRadius: "8px",
          px: 1.5,
          py: 1.25,
          fontFamily: MONO_FONT,
          fontSize: "0.875rem",
        }}
      />
      {instanceError && (
        <Box id={errorId} sx={{ fontSize: "0.8125rem", color: "error.light" }}>
          <Box component="span" sx={{ fontWeight: 700 }}>
            {instanceError.headline}.
          </Box>{" "}
          {instanceError.detail}
          {instanceError.expected && (
            <Box component="span" sx={{ display: "block", mt: 0.5 }}>
              Expected: {instanceError.expected}
            </Box>
          )}
        </Box>
      )}
      {expanded && problem.instanceFormat && (
        <Typography id={formatId} variant="body2" sx={{ color: "text.secondary" }}>
          {problem.instanceFormat}
        </Typography>
      )}
      {expanded && (
        <>
          <Box
            sx={{
              borderTop: "1px solid",
              borderColor: "border.soft",
              pt: 1.5,
              fontWeight: 600,
            }}
          >
            By part
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Editing the instance one part at a time is not available yet. Edit the full instance
            above.
          </Typography>
        </>
      )}
    </Box>
  );
}
