// components/workbench/panels/ResultPanel.js
//
// #229: the Result & Verify panel. Stage 3 fills it in:
//   - Solve mode: the solver's answer (its certificate), who produced it, how long it took and
//     how many picture steps it recorded, and Verify This Answer, which puts the answer in the
//     Verify box and checks it in one click.
//   - Reduce mode: which reduction ran, the target instance it built (from
//     ProblemProvider/reduce), and "Map a solution across": pick a solver for the source
//     problem's answer and map that answer onto the target (ProblemProvider/mapSolution). The
//     mapped certificate gets its own Verify This Answer, checked against the target.
//   - Verify at the bottom (./VerifyBox.js), which works before anything has run.
//   - Gadgets (Reduce mode, stage 4, ./GadgetsSection.js): what the reduction built for each
//     piece of the source, at the bottom of the reduction's result; hidden when it lists none.
//
// Time is the round trip this browser measured, network included, and is labelled that way:
// Redux reports no running time of its own for a solve (#95).

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { COMPUTE_FAILED } from "../../../hooks/useComputeRequest";
import ComputeStatus from "../../detail/ComputeStatus";
import { MONO_FONT, secondaryButtonSx } from "../layout";
import TaggedSelect from "../TaggedSelect";
import GadgetsSection from "./GadgetsSection";
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

const factGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "10px",
};

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

const sectionLabelSx = { fontSize: "0.8125rem", color: "text.secondary" };

function CodeBlock({ id, label, children, maxHeight }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Box component="span" sx={sectionLabelSx}>
        {label}
      </Box>
      <Box id={id} component="pre" sx={{ ...codeBoxSx, maxHeight, overflowY: "auto" }}>
        {children}
      </Box>
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {Object} props.problem The problem, as hooks/useProblemDetail.js builds it.
 * @param {"solve"|"reduce"} props.mode The command bar's mode.
 * @param {string} props.instance The current instance text.
 * @param {Object|null} props.solveResult The last solve: `{solverName, output, elapsedMs,
 *   instance, stepCount}` (`stepCount` null when the picture did not come back).
 * @param {Object|null} props.reduceResult The last reduction: `{targetName, reductionName,
 *   solverName, certificate, elapsedMs, instance, targetInstance, mappedBack}` (`targetInstance`
 *   null when Redux did not send it; `mappedBack`, `{text, ok}`, only for a Reduction View
 *   (#215), whose solver ran on the target, so it has no source certificate).
 * @param {() => void} props.onVerifyAnswer Verify This Answer for the solve.
 * @param {Object|null} props.map "Map a solution across" (Reduce mode): `{select, onMap,
 *   disabled, hint, request, mapped: {certificate, solverName, reused}|null, onVerifyMapped}`.
 * @param {Object} props.verifyProps Everything ./VerifyBox.js takes, except its idPrefix.
 * @param {Object|null} [props.gadgets] The Gadgets section (Reduce mode): `{runId, gadgets,
 *   sourceFrame, targetFrame, activeIndex, onHighlight}`, everything ./GadgetsSection.js takes
 *   except its idPrefix. `runId` remounts the section per run, so a new run starts it closed.
 */
export default function ResultPanel({
  idPrefix,
  problem,
  mode,
  instance,
  solveResult,
  reduceResult,
  onVerifyAnswer,
  map,
  verifyProps,
  gadgets,
}) {
  const result = mode === "solve" ? solveResult : reduceResult;
  const changed = Boolean(result) && result.instance !== instance;
  const solveAnswer = solveResult ? formatOutput(solveResult.output) : "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {!result && (
        <Typography id={`${idPrefix}-empty`} sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
          No run yet: press Run for {mode === "solve" ? "an answer." : "the target instance."}
        </Typography>
      )}

      {result && changed && (
        <Typography
          id={`${idPrefix}-changed`}
          sx={{ fontSize: "0.875rem", color: "warning.light" }}
        >
          The instance changed since this run. Press Run for a new result.
        </Typography>
      )}

      {solveResult && mode === "solve" && (
        <Box id={`${idPrefix}-solve`} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={factGridSx}>
            <Fact label="Solver">{solveResult.solverName}</Fact>
            <Fact label="Time (round trip)">{formatSeconds(solveResult.elapsedMs)}</Fact>
            <Fact label="Steps recorded">
              {solveResult.stepCount === null ? "Not available" : solveResult.stepCount}
            </Fact>
          </Box>
          <CodeBlock id={`${idPrefix}-answer`} label="Answer (certificate)">
            {solveAnswer || "The solver returned an empty answer."}
          </CodeBlock>
          <Box
            id={`${idPrefix}-verify-answer`}
            component="button"
            type="button"
            disabled={!solveAnswer || changed}
            onClick={onVerifyAnswer}
            sx={{ ...secondaryButtonSx, alignSelf: "flex-start" }}
          >
            Verify This Answer
          </Box>
          {changed && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Verify This Answer checks against the instance the answer is for, so it waits for a
              new run.
            </Typography>
          )}
        </Box>
      )}

      {reduceResult && mode === "reduce" && (
        <Box id={`${idPrefix}-reduce`} sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={factGridSx}>
            <Fact label="Reduction">
              {problem.name} {"→"} {reduceResult.targetName}
            </Fact>
            <Fact label="Algorithm">{reduceResult.reductionName}</Fact>
            <Fact label="Time (round trip)">{formatSeconds(reduceResult.elapsedMs)}</Fact>
            <Fact label="Answer from">
              {reduceResult.mappedBack
                ? `${reduceResult.solverName}, on the ${reduceResult.targetName} target`
                : reduceResult.solverName}
            </Fact>
          </Box>
          <CodeBlock
            id={`${idPrefix}-target-instance`}
            label={`Target instance (${reduceResult.targetName})`}
            maxHeight={180}
          >
            {reduceResult.targetInstance ??
              "Redux did not send the target instance's text for this run."}
          </CodeBlock>
          {reduceResult.mappedBack ? (
            // #215: a Reduction View solves the target and maps its answer back.
            <CodeBlock
              id={`${idPrefix}-mapped-back`}
              label={`${problem.name} answer, mapped back from ${reduceResult.targetName}`}
            >
              {reduceResult.mappedBack.text || "The view came back without a closing step."}
            </CodeBlock>
          ) : (
            <CodeBlock id={`${idPrefix}-carried`} label={`${problem.name} answer carried across`}>
              {formatOutput(reduceResult.certificate) || "The solver returned an empty answer."}
            </CodeBlock>
          )}

          {map && (
            <Box
              id={`${idPrefix}-map`}
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                borderTop: "1px solid",
                borderColor: "border.soft",
                pt: 1.5,
              }}
            >
              <Box sx={{ fontWeight: 600 }}>
                Map a solution across{" "}
                <Box component="span" sx={{ fontWeight: 400, color: "text.secondary" }}>
                  (optional)
                </Box>
              </Box>
              {map.select && (
                <TaggedSelect
                  id={`${idPrefix}-map-solver`}
                  label={`Solver for the ${problem.name} answer`}
                  hue="blue"
                  options={map.select.options}
                  value={map.select.value}
                  onChange={map.select.onChange}
                  boxSx={{ width: "100%" }}
                />
              )}
              <Box
                id={`${idPrefix}-map-button`}
                component="button"
                type="button"
                disabled={map.disabled}
                aria-describedby={`${idPrefix}-map-hint`}
                onClick={map.onMap}
                sx={{
                  ...secondaryButtonSx,
                  alignSelf: "flex-start",
                  borderColor: map.disabled ? "border.main" : "brand.goldLine",
                }}
              >
                Map a solution across
              </Box>
              <Box
                id={`${idPrefix}-map-hint`}
                sx={{ fontSize: "0.8125rem", color: "text.secondary" }}
              >
                {map.hint}
              </Box>
              <ComputeStatus
                idPrefix={`${idPrefix}-map`}
                status={map.request.status}
                announcement={map.announcement}
                failure={map.request.status === COMPUTE_FAILED ? map.request.failure : null}
                onCancel={map.request.cancel}
                busyLabel="Mapping the answer across"
              />
              {map.mapped && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  <Box component="span" sx={sectionLabelSx}>
                    Mapped certificate on the {reduceResult.targetName} target, from{" "}
                    {map.mapped.solverName}
                    {map.mapped.reused ? "'s answer in this run" : "'s answer, solved just now"}
                  </Box>
                  <Box
                    id={`${idPrefix}-mapped`}
                    component="pre"
                    sx={{ ...codeBoxSx, borderColor: "status.ok" }}
                  >
                    {map.mapped.certificate || "The mapping returned an empty certificate."}
                  </Box>
                  <Box
                    id={`${idPrefix}-verify-mapped`}
                    component="button"
                    type="button"
                    disabled={!map.mapped.certificate || !map.onVerifyMapped}
                    onClick={map.onVerifyMapped}
                    sx={{ ...secondaryButtonSx, alignSelf: "flex-start" }}
                  >
                    Verify This Answer
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {gadgets && (
            <GadgetsSection
              key={gadgets.runId}
              idPrefix={`${idPrefix}-gadgets`}
              gadgets={gadgets.gadgets}
              sourceFrame={gadgets.sourceFrame}
              targetFrame={gadgets.targetFrame}
              activeIndex={gadgets.activeIndex}
              onHighlight={gadgets.onHighlight}
            />
          )}
        </Box>
      )}

      <VerifyBox idPrefix={`${idPrefix}-verify`} mode={mode} {...verifyProps} />
    </Box>
  );
}
