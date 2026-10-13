// components/workbench/panels/ResultPanel.js
//
// #229: the Result panel, basic for now: what the last Run in the current mode produced
// (the solver's answer, or which reduction ran), who produced it, how long it took and how
// many picture steps it recorded. A basic Verify box sits at the bottom so the old page's
// live Verify stays reachable. Verify This Answer, Map a solution across and Gadgets are
// later stages of #229.
//
// Time is the round trip this browser measured, network included, and is labelled that way:
// Redux reports no running time of its own for a solve (#95).

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { MONO_FONT } from "../layout";
import VerifyBox from "./VerifyBox";

function formatSeconds(milliseconds) {
  return `${(milliseconds / 1000).toFixed(2)} s`;
}

function formatOutput(value) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return JSON.stringify(value, null, 2);
}

function Fact({ label, children }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <Box component="span" sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
        {label}
      </Box>
      <Box component="strong" sx={{ overflowWrap: "anywhere" }}>
        {children}
      </Box>
    </Box>
  );
}

const codeBoxSx = {
  fontFamily: MONO_FONT,
  fontSize: "0.875rem",
  px: 1.5,
  py: 1.25,
  borderRadius: "8px",
  backgroundColor: "surface.input",
  border: "1px solid",
  borderColor: "border.soft",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
  m: 0,
};

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {Object} props.problem The problem, as hooks/useProblemDetail.js builds it.
 * @param {"solve"|"reduce"} props.mode The command bar's mode.
 * @param {string} props.instance The current instance text.
 * @param {Object|null} props.solveResult The last solve: `{solverName, output, elapsedMs,
 *   instance, stepCount}` (`stepCount` null when the picture did not come back).
 * @param {Object|null} props.reduceResult The last reduction: `{targetName, reductionName,
 *   solverName, certificate, elapsedMs, instance}`.
 */
export default function ResultPanel({
  idPrefix,
  problem,
  mode,
  instance,
  solveResult,
  reduceResult,
}) {
  const result = mode === "solve" ? solveResult : reduceResult;
  const changed = Boolean(result) && result.instance !== instance;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {!result && (
        <Typography id={`${idPrefix}-empty`} sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
          No run yet: press Run for {mode === "solve" ? "an answer." : "the target instance."}
        </Typography>
      )}

      {result && changed && (
        <Typography sx={{ fontSize: "0.875rem", color: "warning.light" }}>
          The instance changed since this run. Press Run for a new result.
        </Typography>
      )}

      {solveResult && mode === "solve" && (
        <Box id={`${idPrefix}-solve`} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "10px",
            }}
          >
            <Fact label="Solver">{solveResult.solverName}</Fact>
            <Fact label="Time (round trip)">{formatSeconds(solveResult.elapsedMs)}</Fact>
            <Fact label="Steps recorded">
              {solveResult.stepCount === null ? "Not available" : solveResult.stepCount}
            </Fact>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Box component="span" sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
              Answer (certificate)
            </Box>
            <Box id={`${idPrefix}-answer`} component="pre" sx={codeBoxSx}>
              {formatOutput(solveResult.output) || "The solver returned an empty answer."}
            </Box>
          </Box>
        </Box>
      )}

      {reduceResult && mode === "reduce" && (
        <Box id={`${idPrefix}-reduce`} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "10px",
            }}
          >
            <Fact label="Reduction">
              {problem.name} {"→"} {reduceResult.targetName}
            </Fact>
            <Fact label="Algorithm">{reduceResult.reductionName}</Fact>
            <Fact label="Time (round trip)">{formatSeconds(reduceResult.elapsedMs)}</Fact>
            <Fact label="Answer from">{reduceResult.solverName}</Fact>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Box component="span" sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
              {problem.name} answer carried across
            </Box>
            <Box component="pre" sx={codeBoxSx}>
              {formatOutput(reduceResult.certificate) || "The solver returned an empty answer."}
            </Box>
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            The target instance is drawn on the right of the picture.
          </Typography>
        </Box>
      )}

      <VerifyBox idPrefix={`${idPrefix}-verify`} problem={problem} instance={instance} />
    </Box>
  );
}
