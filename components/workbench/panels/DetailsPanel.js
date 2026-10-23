// components/workbench/panels/DetailsPanel.js
//
// #229: the Details panel: the problem's description, then Input, Output, Source and
// Contributors as a definition list. No "Reduces to" (the Reduce dropdown covers that).
// #279: this is what the Details pane shows after Show all; collapsed, the pane shows only
// DetailsSummary below, the Input -> Output line.
//
// "Also known as" is in the design but the backend declares no alternative names for any
// problem today, so the row only appears when that data exists rather than showing a
// made-up or empty value.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

function Row({ label, children }) {
  return (
    <Box>
      <Box component="dt" sx={{ color: "text.secondary", fontSize: "0.8125rem" }}>
        {label}
      </Box>
      <Box component="dd" sx={{ m: 0, overflowWrap: "anywhere" }}>
        {children}
      </Box>
    </Box>
  );
}

function inputOutput(problem) {
  const overview = problem.overview ?? {};
  return {
    input: overview.inputDescription ?? overview.input,
    output: overview.outputDescription ?? overview.output,
  };
}

/**
 * #279: the collapsed Details pane's one line, "Input -> Output", cut short with an ellipsis
 * (the whole line is its title, for a pointer).
 * @param {Object} props
 * @param {string} props.id
 * @param {Object} props.problem The problem, as hooks/useProblemDetail.js builds it.
 */
export function DetailsSummary({ id, problem }) {
  const { input, output } = inputOutput(problem);
  const text = `${input ?? "Input not documented yet."} → ${output ?? "Output not documented yet."}`;
  return (
    <Box
      id={id}
      title={text}
      sx={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        color: "ink.text2",
        "@media (max-width:640px)": { whiteSpace: "normal" },
      }}
    >
      {text}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.problem The problem, as hooks/useProblemDetail.js builds it.
 */
export default function DetailsPanel({ problem }) {
  const overview = problem.overview ?? {};
  const { input, output } = inputOutput(problem);
  const aliases = Array.isArray(problem.aliases) ? problem.aliases.join(", ") : problem.aliases;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {problem.oneLiner ? (
        <Typography sx={{ m: 0, color: "ink.text2" }}>{problem.oneLiner}</Typography>
      ) : (
        <Typography sx={{ m: 0, color: "text.secondary" }}>No description declared yet.</Typography>
      )}
      <Box
        component="dl"
        sx={{
          m: 0,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          fontSize: "0.875rem",
        }}
      >
        {aliases && <Row label="Also known as">{aliases}</Row>}
        <Row label="Input">{input ?? "Not documented yet."}</Row>
        <Row label="Output">{output ?? "Not documented yet."}</Row>
        <Row label="Source">
          {overview.source ? (
            overview.sourceLink ? (
              <Box
                component="a"
                href={overview.sourceLink}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: "brand.text", textDecoration: "underline" }}
              >
                {overview.source}
              </Box>
            ) : (
              overview.source
            )
          ) : (
            "Not documented yet."
          )}
        </Row>
        <Row label="Contributors">{overview.contributedBy ?? "Not documented yet."}</Row>
      </Box>
    </Box>
  );
}
