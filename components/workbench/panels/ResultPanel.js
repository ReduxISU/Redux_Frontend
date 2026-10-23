// components/workbench/panels/ResultPanel.js
//
// #229: the Result & Verify panel. #279 (board F) made it the result part of the Workspace's
// Execute section, under the run controls; Verify (./VerifyBox.js) moved to the Workspace's
// Verify section and Gadgets (./GadgetsSection.js) to its Visualization section.
//
// #279 stage 2 trimmed it to the mockup's lines:
//   - Solve mode: whether the solver found an answer, the answer, and how long it took, with
//     Check it (the answer goes into the Verify section and is checked there);
//   - Reduce mode: that the target instance was built, by which reduction and how long it took,
//     and the target instance's text. Reduce only builds; each side's solve and the answers
//     carried across are in ./ReduceCells.js.
// An instance edit after a run says so instead of showing an answer that is about another
// instance. A run in progress, or one that failed, speaks for itself above (CommandBar.js).
//
// #295 (ReduxISU/Redux#932): a randomized solver's run says which seed it ran with (SeedLine,
// below, shared with ./ReduceCells.js), with Run again with this seed to see the same steps
// again. A solver without a seed shows neither.
//
// Time is the round trip this browser measured, network included, and is labelled that way:
// Redux reports no running time of its own for a solve (#95).

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { MONO_FONT, secondaryButtonSx } from "../layout";
import { formatSeconds } from "../RunParts";

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

const lineSx = { fontSize: "0.875rem", color: "text.primary" };

/**
 * A solver's answer on one line: found or not (green or red), the answer, and its time.
 * Shared with the Reduce mode cells (./ReduceCells.js).
 * @param {Object} props
 * @param {string} props.id
 * @param {boolean} props.found
 * @param {string} props.verdict "Answer found", "No answer found", ...
 * @param {string} props.answer The certificate (left out when nothing was found).
 * @param {number} props.elapsedMs
 */
export function AnswerLine({ id, found, verdict, answer, elapsedMs }) {
  return (
    <Box
      id={id}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: "4px 12px",
        fontSize: "0.875rem",
        minWidth: 0,
      }}
    >
      <Box
        component="span"
        id={`${id}-verdict`}
        sx={{ fontWeight: 700, color: found ? "status.okText" : "status.errText" }}
      >
        {verdict}
      </Box>
      {found && (
        <Box
          component="span"
          id={`${id}-answer`}
          sx={{ fontFamily: MONO_FONT, overflowWrap: "anywhere", minWidth: 0 }}
        >
          {answer}
        </Box>
      )}
      <Box component="span" sx={{ color: "text.secondary" }}>
        Took {formatSeconds(elapsedMs)} (round trip)
      </Box>
    </Box>
  );
}

/**
 * The seed a randomized solver's run reported, and Run again with this seed (#295).
 * @param {{id: string, seed: {seed: number, onRerun: () => void, disabled?: boolean}|null}} props
 *   The button's id is `${id}-rerun`.
 */
export function SeedLine({ id, seed }) {
  if (!seed) return null;
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "4px 12px",
        fontSize: "0.875rem",
        minWidth: 0,
      }}
    >
      <Box component="span" id={id} sx={{ color: "text.primary" }}>
        Seed:{" "}
        <Box component="span" id={`${id}-value`} sx={{ fontFamily: MONO_FONT }}>
          {seed.seed}
        </Box>
      </Box>
      {/* ProblemProvider/solve takes no seed, so the answer above can be another draw's. */}
      <Box component="span" id={`${id}-note`} sx={{ color: "text.secondary" }}>
        of the run Algorithm Steps shows
      </Box>
      <Box
        id={`${id}-rerun`}
        component="button"
        type="button"
        onClick={seed.onRerun}
        disabled={Boolean(seed.disabled)}
        aria-describedby={`${id} ${id}-note`}
        sx={{ ...secondaryButtonSx, minHeight: 40 }}
      >
        Run again with this seed
      </Box>
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {"solve"|"reduce"} props.mode The command bar's mode.
 * @param {{found: boolean, answer: string, elapsedMs: number, seed?: Object|null}|null}
 *   props.solve The Solve mode result while it is current (null otherwise); `seed` as SeedLine
 *   takes it.
 * @param {boolean} props.solveChanged A solve ran, on an instance since changed.
 * @param {() => void} props.onCheckAnswer Check it, for the solve's answer.
 * @param {{targetName: string, reductionName: string, elapsedMs: number,
 *   targetInstance: string|null}|null} props.built The Reduce mode build while it is current.
 * @param {boolean} props.buildChanged A build ran, on an instance since changed.
 */
export default function ResultPanel({
  idPrefix,
  mode,
  solve,
  solveChanged,
  onCheckAnswer,
  built,
  buildChanged,
}) {
  if (mode === "solve") {
    if (solve) {
      return (
        <Box id={`${idPrefix}-solve`} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <AnswerLine
            id={idPrefix}
            found={solve.found}
            verdict={solve.found ? "Answer found" : "No answer found"}
            answer={solve.answer}
            elapsedMs={solve.elapsedMs}
          />
          <SeedLine id={`${idPrefix}-seed`} seed={solve.seed ?? null} />
          {solve.found && (
            <Box
              id={`${idPrefix}-verify-answer`}
              component="button"
              type="button"
              onClick={onCheckAnswer}
              sx={{ ...secondaryButtonSx, minHeight: 40, alignSelf: "flex-start" }}
            >
              Check it
            </Box>
          )}
        </Box>
      );
    }
    return solveChanged ? (
      <Typography id={`${idPrefix}-changed`} sx={lineSx}>
        The instance changed after the last solve. Press Solve to run it again.
      </Typography>
    ) : null;
  }

  if (built) {
    return (
      <Box id={`${idPrefix}-reduce`} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography id={`${idPrefix}-built`} sx={lineSx}>
          Built the {built.targetName} instance with {built.reductionName}.{" "}
          <Box component="span" sx={{ color: "text.secondary" }}>
            Took {formatSeconds(built.elapsedMs)} (round trip). Building runs in polynomial time.
          </Box>
        </Typography>
        <Box
          id={`${idPrefix}-target-instance`}
          component="pre"
          sx={{ ...codeBoxSx, maxHeight: 140, overflowY: "auto" }}
        >
          {built.targetInstance ?? "Redux did not send the target instance's text for this build."}
        </Box>
      </Box>
    );
  }
  return buildChanged ? (
    <Typography id={`${idPrefix}-changed`} sx={lineSx}>
      The instance changed after the last reduction. Press Reduce to build it again.
    </Typography>
  ) : null;
}
