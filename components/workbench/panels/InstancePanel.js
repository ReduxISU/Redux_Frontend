// components/workbench/panels/InstancePanel.js
//
// #229: the Instance panel. For now it holds the full instance as one editable text box,
// plus the problem's declared format description. The design's "By part" boxes (one per
// clause, or Nodes / Edges / K) need the backend's per-part description (ReduxISU/Redux#851)
// and land with the part editor (#228); the spot is marked below and nothing here guesses
// at how to split an instance.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { MONO_FONT } from "../layout";

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {Object} props.problem The problem, as hooks/useProblemDetail.js builds it.
 * @param {string} props.instance The current instance text.
 * @param {(next: string) => void} props.onInstanceChange Called on every edit.
 * @param {{headline: string, detail: string, expected?: string}|null} props.instanceError
 *   Why Redux could not read this instance, when it could not.
 */
export default function InstancePanel({
  idPrefix,
  problem,
  instance,
  onInstanceChange,
  instanceError,
}) {
  const inputId = `${idPrefix}-full-instance`;
  const errorId = `${idPrefix}-full-instance-error`;
  const formatId = `${idPrefix}-full-instance-format`;
  const describedBy = [instanceError ? errorId : null, problem.instanceFormat ? formatId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <Box component="label" htmlFor={inputId} sx={{ fontWeight: 600 }}>
        Full instance
      </Box>
      <Box
        id={inputId}
        component="textarea"
        rows={3}
        value={instance}
        onChange={(event) => onInstanceChange(event.target.value)}
        placeholder="No default instance declared for this problem yet."
        aria-invalid={Boolean(instanceError)}
        aria-describedby={describedBy || undefined}
        spellCheck={false}
        sx={{
          width: "100%",
          boxSizing: "border-box",
          resize: "vertical",
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
      {problem.instanceFormat && (
        <Typography id={formatId} variant="body2" sx={{ color: "text.secondary" }}>
          {problem.instanceFormat}
        </Typography>
      )}
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
        Editing the instance one part at a time is not available yet. Edit the full instance above.
      </Typography>
    </Box>
  );
}
