// components/workbench/panels/InstancePanel.js
//
// #229: the Instance panel. For now it holds the full instance as one editable text box,
// plus the problem's declared format description.
//
// #303 (Board G): no longer a panel. It is the instance editor at the top of the workspace,
// always visible, with the error (when Redux can't read the instance) or the format under it.
// Board G's "By parts" mode (one box per clause, or Nodes / Edges / K) needs the backend's
// per-part description (ReduxISU/Redux#851) and lands with the part editor (#228); until then
// only the whole text is shown, with no placeholder for the other mode.

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
    <Box
      component="section"
      aria-labelledby={`${idPrefix}-label`}
      id={idPrefix}
      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
    >
      <Box
        component="label"
        id={`${idPrefix}-label`}
        htmlFor={inputId}
        sx={{ fontSize: "0.8125rem", fontWeight: 600, color: "text.secondary" }}
      >
        Instance
      </Box>
      <Box
        id={inputId}
        component="textarea"
        rows={2}
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
          borderRadius: "10px",
          px: "14px",
          py: "11px",
          fontFamily: MONO_FONT,
          fontSize: "0.9375rem",
          lineHeight: 1.6,
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
        <Typography
          id={formatId}
          variant="body2"
          sx={{ color: "text.secondary", fontSize: "0.8125rem" }}
        >
          {problem.instanceFormat}
        </Typography>
      )}
    </Box>
  );
}
