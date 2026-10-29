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
//   - A randomized solver's seed (Solve mode, #295, ReduxISU/Redux#932): the run says which
//     seed it ran with (SeedLine, below); typed into the command bar's Seed box, it repeats the
//     same steps. A solver without a seed shows no seed. Solve's answer is that same run's
//     whenever ProblemProvider/visualizeRun gave one (Workbench.js), so the answer and the steps
//     agree.
//   - Verify at the bottom (./VerifyBox.js), which works before anything has run.
//   - Gadgets (Reduce mode, stage 4, ./GadgetsSection.js): what the reduction built for each
//     piece of the source, at the bottom of the reduction's result; hidden when it lists none.
//
// #303 (Board G): the results are listed under the task bar, no longer in a panel. Solve's
// answer ends with "Check it in Verify" at the far right of its row, which opens the Verify tab
// and checks the answer there; the Verify box itself moved to that tab (CommandBar.js), so the
// Solve results leave it out (`showVerify`). Reduce keeps it under its results until stage 4
// of #303 builds Reduce's own checks.
//
// #303 stage 2: Reduce's results start with one row per thing a stage did or does next, tagged
// Reduce, Solve or Verify, in the stepper's order (StageRows, below). The Verify box moved to the
// stepper's Verify stage (CommandBar.js). The reduction's facts follow: the Solve step's answer,
// mapped back, joins them once it ran.
//
// Time is the round trip this browser measured, network included, and is labelled that way:
// Redux reports no running time of its own for a solve (#95).

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { COMPUTE_FAILED } from "../../../hooks/useComputeRequest";
import ComputeStatus from "../../detail/ComputeStatus";
import { MONO_FONT, PHONE_MEDIA, secondaryButtonSx } from "../layout";
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

/** A result row: its text on the left, its action button pushed to the far right (#303). */
const actionRowSx = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px 12px",
  minWidth: 0,
};
const actionButtonSx = { ...secondaryButtonSx, ml: "auto", flex: "none" };

/**
 * The seed a randomized solver's run reported (#295). The number is plain text a user can select
 * and paste into the Seed box, which repeats the run exactly.
 * @param {{id: string, seed: {seed: number}|null}} props The number's own id is `${id}-value`.
 */
export function SeedLine({ id, seed }) {
  if (!seed) return null;
  return (
    <Box component="span" id={id} sx={{ fontSize: "0.875rem", color: "text.primary", minWidth: 0 }}>
      Seed{" "}
      <Box component="span" id={`${id}-value`} sx={{ fontFamily: MONO_FONT, userSelect: "all" }}>
        {seed.seed}
      </Box>{" "}
      made this run. Type it in the Seed box to repeat the same steps.
    </Box>
  );
}

const STAGE_TONES = {
  ok: { borderColor: "status.ok", backgroundColor: "status.okBg", icon: "status.okText" },
  err: { borderColor: "status.err", backgroundColor: "status.errBg", icon: "status.errText" },
  warn: { borderColor: "status.warn", backgroundColor: "status.warnBg", icon: "status.warnText" },
  info: { borderColor: "border.main", backgroundColor: "surface.raised", icon: "text.secondary" },
};

/**
 * #303 stage 2: Reduce's results, one row each, tagged by the stage they belong to.
 * @param {{id: string, rows: Array<{key: string, tag: string, tone: "ok"|"err"|"warn"|"info",
 *   icon: string, text: string, action?: {id: string, label: string, disabled?: boolean}}>,
 *   onAction: (key: string) => void}} props A row's action calls `onAction` with its key.
 */
function StageRows({ id, rows, onAction }) {
  if (rows.length === 0) return null;
  return (
    <Box
      component="ul"
      id={id}
      aria-label="Results by stage"
      sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      {rows.map((row) => {
        const tone = STAGE_TONES[row.tone] ?? STAGE_TONES.info;
        return (
          <Box
            component="li"
            key={row.key}
            id={`${id}-${row.key}`}
            data-stage={row.tag.toLowerCase()}
            data-tone={row.tone}
            sx={{
              ...actionRowSx,
              flexWrap: "nowrap",
              px: 1.5,
              py: 1,
              borderRadius: "10px",
              border: "1px solid",
              borderColor: tone.borderColor,
              backgroundColor: tone.backgroundColor,
              color: "text.primary",
              fontSize: "0.875rem",
              [PHONE_MEDIA]: { flexWrap: "wrap" },
            }}
          >
            <Box
              component="span"
              data-tag
              sx={{
                width: 52,
                flex: "none",
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "text.secondary",
              }}
            >
              {row.tag}
            </Box>
            <Box
              component="span"
              aria-hidden="true"
              sx={{
                width: 20,
                flex: "none",
                textAlign: "center",
                fontWeight: 700,
                color: tone.icon,
              }}
            >
              {row.icon}
            </Box>
            <Box component="span" sx={{ flex: "1 1 240px", minWidth: 0, overflowWrap: "anywhere" }}>
              {row.text}
            </Box>
            {row.action && (
              <Box
                id={row.action.id}
                component="button"
                type="button"
                disabled={Boolean(row.action.disabled)}
                onClick={() => onAction(row.key)}
                sx={{ ...actionButtonSx, minHeight: 40 }}
              >
                {row.action.label}
              </Box>
            )}
          </Box>
        );
      })}
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
 *   instance, stepCount, seed}` (`stepCount` null when the picture did not come back; `seed`
 *   as SeedLine takes it, null when there is none to show).
 * @param {Object|null} props.reduceResult The last reduction: `{targetName, reductionName,
 *   solverName, certificate, elapsedMs, instance, targetInstance, mappedBack}` (`targetInstance`
 *   null when Redux did not send it; `mappedBack`, `{text, ok}`, only for a Reduction View
 *   (#215), whose solver ran on the target, so it has no source certificate).
 * @param {() => void} props.onVerifyAnswer Verify This Answer for the solve.
 * @param {Object|null} props.map "Map a solution across" (Reduce mode): `{select, onMap,
 *   disabled, hint, request, mapped: {certificate, solverName, reused}|null, onVerifyMapped}`.
 * @param {Object} props.verifyProps Everything ./VerifyBox.js takes, except its idPrefix.
 * @param {Object|null} [props.gadgets] The Gadgets section (Reduce mode): `{runId, gadgets,
 *   sourceFrame, targetFrame, namers?, colors?, activeIndex, onHighlight}`, everything
 *   ./GadgetsSection.js takes
 *   except its idPrefix. `runId` remounts the section per run, so a new run starts it closed.
 * @param {boolean} [props.showVerify] Ends the results with the Verify box (#303: the Verify box
 *   is in the Verify tab, and stage 2 put Reduce's in its stepper's Verify stage).
 * @param {Array} [props.stages] #303 stage 2: Reduce's rows by stage (StageRows).
 * @param {(key: string) => void} [props.onStageAction] A stage row's action button.
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
  showVerify = true,
  stages = [],
  onStageAction = () => {},
}) {
  const result = mode === "solve" ? solveResult : reduceResult;
  const changed = Boolean(result) && result.instance !== instance;
  const solveAnswer = solveResult ? formatOutput(solveResult.output) : "";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {mode === "reduce" && (
        <StageRows id={`${idPrefix}-stages`} rows={stages} onAction={onStageAction} />
      )}

      {!result && (
        <Typography id={`${idPrefix}-empty`} sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
          {mode === "solve"
            ? "No run yet: press Solve for an answer."
            : "No run yet: press Reduce for the target instance."}
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
          <Box sx={actionRowSx}>
            <SeedLine id={`${idPrefix}-seed`} seed={solveResult.seed ?? null} />
            <Box
              id={`${idPrefix}-verify-answer`}
              component="button"
              type="button"
              disabled={!solveAnswer || changed}
              onClick={onVerifyAnswer}
              sx={actionButtonSx}
            >
              Check it in Verify
            </Box>
          </Box>
          {changed && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Check it in Verify checks against the instance the answer is for, so it waits for a
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
              {!reduceResult.solverName
                ? "Not solved yet"
                : reduceResult.mappedBack || !reduceResult.certificate
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
          ) : reduceResult.certificate !== null && reduceResult.certificate !== undefined ? (
            // The older requests solve the source first and carry its answer across.
            <CodeBlock id={`${idPrefix}-carried`} label={`${problem.name} answer carried across`}>
              {formatOutput(reduceResult.certificate) || "The solver returned an empty answer."}
            </CodeBlock>
          ) : null}

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
                  <Box sx={actionRowSx}>
                    <Box
                      id={`${idPrefix}-verify-mapped`}
                      component="button"
                      type="button"
                      disabled={!map.mapped.certificate || !map.onVerifyMapped}
                      onClick={map.onVerifyMapped}
                      sx={actionButtonSx}
                    >
                      Verify This Answer
                    </Box>
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
              namers={gadgets.namers ?? null}
              colors={gadgets.colors ?? null}
              activeIndex={gadgets.activeIndex}
              onHighlight={gadgets.onHighlight}
            />
          )}
        </Box>
      )}

      {showVerify && <VerifyBox idPrefix={`${idPrefix}-verify`} mode={mode} {...verifyProps} />}
    </Box>
  );
}
