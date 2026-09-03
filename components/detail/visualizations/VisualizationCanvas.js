// components/detail/visualizations/VisualizationCanvas.js
//
// T48 (#111) -- resolves one frame's universal type
// (ai_documentation/VISUALIZATION_TYPE_CONTRACTS.md §5) and either hands it to that
// type's renderer, or renders one of the two outcomes §4.4 requires kept distinguishable:
// no data / not yet supported (quiet, case b), versus a contract violation (a loud
// `console.warn` plus a dev-only visible marker, case c).
//
// `graph` (T48) and `booleanSatisfiability` (T49) have renderers today -- T50 adds the
// rest, one task per universal type, the same "once per type, not once per instance"
// split the whole Track B design is built around. Every other resolved type, and every
// payload this frontend doesn't recognize at all, takes the quiet "not supported yet"
// path: that is honestly case (b), not something to warn about.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";
import { resolveVisualizationType, validateFrame } from "../../../data/visualizationTypes";
import BooleanSatisfiabilityRenderer from "./BooleanSatisfiabilityRenderer";
import GraphRenderer from "./GraphRenderer";

const RENDERERS = {
  graph: GraphRenderer,
  booleanSatisfiability: BooleanSatisfiabilityRenderer,
};

function CannotRender({ idPrefix, reason, violations }) {
  return (
    <Box
      id={`${idPrefix}-cannot-render`}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        height: "100%",
        p: 2,
      }}
    >
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {reason}
      </Typography>
      {process.env.NODE_ENV !== "production" && violations && violations.length > 0 && (
        <Typography
          variant="mono"
          component="p"
          sx={{ color: "error.light", fontSize: "0.75rem", m: 0 }}
        >
          Contract violation (dev only): {violations.join("; ")}
        </Typography>
      )}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id this component (and whichever
 *   renderer it dispatches to) renders (ground rule 4).
 * @param {string} props.instanceName Human-readable visualization name, used in the
 *   accessible summary and in the console.warn a contract violation emits.
 * @param {string} [props.backendType] The raw `visualizationType` wire value (e.g.
 *   "GraphD3") -- `Navigation/Batch/allVisualizationTypes`, falling back to `allInfo`.
 * @param {Object|null} [props.frame] One frame (`frames[currentStep]`), or null/undefined
 *   when there's nothing to show yet (not yet run, or an empty `frames[]`).
 */
export default function VisualizationCanvas({ idPrefix, instanceName, backendType, frame }) {
  const universalType = resolveVisualizationType(backendType, frame);
  const Renderer = universalType ? RENDERERS[universalType] : null;
  const { valid, violations } =
    Renderer && frame ? validateFrame(universalType, frame) : { valid: true, violations: [] };
  const violationsSummary = violations.length > 0 ? violations.join("; ") : "";

  useEffect(() => {
    if (!Renderer || valid || !violationsSummary) return;
    console.warn(
      `[visualization] "${instanceName}" (${backendType ?? "unknown type"} -> ${universalType}) violates its contract: ${violationsSummary}`,
    );
  }, [Renderer, valid, violationsSummary, instanceName, backendType, universalType]);

  if (!frame) {
    return <CannotRender idPrefix={idPrefix} reason="No visualization data for this step." />;
  }

  if (!Renderer) {
    return (
      <CannotRender
        idPrefix={idPrefix}
        reason={
          universalType
            ? `No renderer built yet for "${universalType}" visualizations.`
            : "This visualization type isn't supported yet."
        }
      />
    );
  }

  if (!valid) {
    return (
      <CannotRender
        idPrefix={idPrefix}
        reason="Cannot render: this frame's data doesn't match what this visualization type expects."
        violations={violations}
      />
    );
  }

  return <Renderer idPrefix={idPrefix} instanceName={instanceName} frame={frame} />;
}
