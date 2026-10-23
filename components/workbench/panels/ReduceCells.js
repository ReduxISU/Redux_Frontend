// components/workbench/panels/ReduceCells.js
//
// #279 stage 2 (board F): Reduce mode's part of the Execute section, under the Reduce row.
//
// #279 (one Solve in Reduce mode) replaced stage 2's Solve button per side with:
//   - Solve via reduction, the one primary button, in a full-width cell with the target's solver
//     (a tagged dropdown): it runs the whole chain, and the cell lists its three steps in order,
//     each with what it gave: 1. Reduce (builds the target instance, skipped when the build on
//     screen is already of this instance and reduction), 2. Solve <Target> with the target's
//     solver, 3. the target's answer mapped back to the source, with Check it. A step that fails
//     shows its failure box (the backend's message, and its hint when it has one) in its own row,
//     with Try again, and the steps after it don't run. Cancel takes the button's place while the
//     chain runs.
//   - Then, on the Workspace's shared two-column grid (layout.js sideGridSx, so each side sits
//     under its picture and they stack, source first, when the Workspace is narrow): the source's
//     cell, its solver and the secondary Solve directly (the same solve, with the same result, as
//     Solve mode's, for comparison), and "Your <Source> answer -> into <Target>" beside it.
//   - Each direction says what it relies on, and Check it for an answer that came across.
//     Converting an answer runs in polynomial time, so both fill in by themselves once their
//     inputs exist. A reduction that can't convert answers in a direction says "Not available for
//     this reduction" there, in neutral grey: that is a gap in the reduction, not an error.
//   - The agree line, across both columns once both sides are solved (lib/answers.js agreeLine:
//     a difference is only called a bug when exact solvers gave both answers).
// A result from an earlier choice (another instance, target, reduction or solver) isn't shown:
// its cell says what changed instead.
//
// #295: a randomized solver's answer (Solve directly, or the Solve <Target> step) says the seed
// its run used, with Run again with this seed (./ResultPanel.js SeedLine).

import Box from "@mui/material/Box";
import { DROPDOWN_WIDTH, MONO_FONT, secondaryButtonSx, sideGridSx } from "../layout";
import { BusyLine, RunControls, RunFailureBox } from "../RunParts";
import TaggedSelect from "../TaggedSelect";
import { AnswerLine, SeedLine } from "./ResultPanel";

const cellSx = {
  display: "flex",
  flexDirection: "column",
  gap: 1,
  p: 1.5,
  minWidth: 0,
  borderRadius: "10px",
  border: "1px solid",
  borderColor: "border.soft",
  backgroundColor: "surface.input",
};

const quietSx = { fontSize: "0.875rem", color: "text.secondary" };

const neutralNoteSx = {
  fontSize: "0.875rem",
  color: "text.secondary",
  backgroundColor: "surface.raised",
  borderRadius: "8px",
  px: 1.25,
  py: 0.75,
};

// One step of the chain: a row of its numbered list.
const stepSx = {
  display: "flex",
  flexDirection: "column",
  gap: 0.75,
  minWidth: 0,
  pt: 1,
  borderTop: "1px solid",
  borderColor: "border.soft",
};

function StepHeading({ number, text }) {
  return (
    <Box
      component="h4"
      sx={{
        m: 0,
        display: "flex",
        alignItems: "baseline",
        gap: 1,
        fontSize: "0.875rem",
        fontWeight: 700,
        color: "text.primary",
      }}
    >
      <Box component="span" sx={{ color: "text.secondary", flex: "none" }}>
        {number}.
      </Box>
      <span>{text}</span>
    </Box>
  );
}

const AGREE_TONES = {
  ok: { borderColor: "status.ok", backgroundColor: "status.okBg", color: "status.okText" },
  err: { borderColor: "status.err", backgroundColor: "status.errBg", color: "status.errText" },
  neutral: {
    borderColor: "border.main",
    backgroundColor: "surface.raised",
    color: "text.secondary",
  },
};

/** A cell's solver dropdown, or a line saying it has none. */
function SolverSelect({ id, label, select }) {
  return select ? (
    <TaggedSelect id={id} label={label} hue="blue" boxSx={{ width: "100%" }} {...select} />
  ) : (
    <Box sx={quietSx}>{label}: none declared.</Box>
  );
}

/**
 * The source's solver cell.
 * @param {{cell: Object}} props `cell`: `{id, label, select, run, busy, failure, onRetry,
 *   result: {found, answer, elapsedMs, seed?}|null, changed: string|null}` (`seed` as
 *   ./ResultPanel.js SeedLine takes it). `run` is what RunControls
 *   takes (its id is `${id}-run`).
 */
function SolverCell({ cell }) {
  return (
    <Box id={cell.id} sx={cellSx}>
      <SolverSelect id={`${cell.id}-solver`} label={cell.label} select={cell.select} />
      <RunControls id={`${cell.id}-run`} {...cell.run} />
      {cell.busy && (
        <BusyLine id={`${cell.id}-busy`} text={cell.busy.text} startedAt={cell.busy.startedAt} />
      )}
      <RunFailureBox id={`${cell.id}-failure`} failure={cell.failure} onRetry={cell.onRetry} />
      {cell.result && (
        <AnswerLine
          id={`${cell.id}-result`}
          found={cell.result.found}
          verdict={cell.result.verdict}
          answer={cell.result.answer}
          elapsedMs={cell.result.elapsedMs}
        />
      )}
      {cell.result && <SeedLine id={`${cell.id}-result-seed`} seed={cell.result.seed ?? null} />}
      {cell.changed && (
        <Box id={`${cell.id}-changed`} sx={{ fontSize: "0.875rem" }}>
          {cell.changed}
        </Box>
      )}
    </Box>
  );
}

/**
 * One direction an answer is carried across: the back one is the chain's last step (`step`, its
 * number), the forward one a cell beside the source's.
 * @param {{cell: Object}} props `cell`: `{id, heading, direction, state, text, answer, onCheck,
 *   failure, onRetry}`. `state` is "na" (the reduction can't convert answers this way),
 *   "waiting" (`text` says what is missing), "loading", "answer" (`answer`, with Check it),
 *   "none" (`text`, nothing came across), or "failed" (`failure`, with Try again).
 */
function ResultCell({ cell, step = null }) {
  return (
    <Box
      id={cell.id}
      component={step ? "li" : "div"}
      data-state={cell.state}
      sx={step ? stepSx : cellSx}
    >
      {step ? (
        <StepHeading number={step} text={cell.heading} />
      ) : (
        <Box
          component="h4"
          sx={{ m: 0, fontSize: "0.8125rem", fontWeight: 600, color: "text.secondary" }}
        >
          {cell.heading}
        </Box>
      )}
      <Box sx={{ fontSize: "0.75rem", fontStyle: "italic", color: "text.secondary" }}>
        {cell.direction}
      </Box>
      {cell.state === "na" && (
        <Box id={`${cell.id}-text`} sx={neutralNoteSx}>
          Not available for this reduction: it doesn&apos;t convert answers in this direction yet.
        </Box>
      )}
      {cell.state === "waiting" && (
        <Box id={`${cell.id}-text`} sx={quietSx}>
          {cell.text}
        </Box>
      )}
      {cell.state === "loading" && (
        <BusyLine id={`${cell.id}-busy`} text={cell.text} startedAt={cell.startedAt} />
      )}
      {cell.state === "answer" && (
        <>
          <Box
            id={`${cell.id}-answer`}
            sx={{ fontFamily: MONO_FONT, fontSize: "0.875rem", overflowWrap: "anywhere" }}
          >
            {cell.answer}
          </Box>
          <Box
            id={`${cell.id}-check`}
            component="button"
            type="button"
            onClick={cell.onCheck}
            disabled={!cell.onCheck}
            sx={{ ...secondaryButtonSx, minHeight: 40, alignSelf: "flex-start" }}
          >
            Check it
          </Box>
        </>
      )}
      {cell.state === "none" && (
        <Box id={`${cell.id}-text`} sx={cell.proves ? { fontSize: "0.875rem" } : neutralNoteSx}>
          {cell.text}
        </Box>
      )}
      {cell.state === "failed" && (
        <RunFailureBox id={`${cell.id}-failure`} failure={cell.failure} onRetry={cell.onRetry} />
      )}
    </Box>
  );
}

/**
 * The chain's first two steps (Reduce, Solve <Target>).
 * @param {{step: Object, number: number}} props `step`: `{id, heading, state, text, busy,
 *   failure, onRetry, result}`. `state` is "waiting" (`text` says what it waits for), "loading"
 *   (`busy`: `{text, startedAt}`), "done" (`text` for the build, or `result` for the solve: what
 *   AnswerLine takes) or "failed" (`failure`, with Try again).
 */
function ChainStep({ step, number }) {
  return (
    <Box id={step.id} component="li" data-state={step.state} sx={stepSx}>
      <StepHeading number={number} text={step.heading} />
      {(step.state === "waiting" || (step.state === "done" && step.text)) && (
        <Box id={`${step.id}-text`} sx={step.state === "done" ? { fontSize: "0.875rem" } : quietSx}>
          {step.text}
        </Box>
      )}
      {step.state === "loading" && (
        <BusyLine id={`${step.id}-busy`} text={step.busy.text} startedAt={step.busy.startedAt} />
      )}
      {step.state === "done" && step.result && (
        <AnswerLine
          id={`${step.id}-result`}
          found={step.result.found}
          verdict={step.result.verdict}
          answer={step.result.answer}
          elapsedMs={step.result.elapsedMs}
        />
      )}
      {step.state === "done" && step.result && (
        <SeedLine id={`${step.id}-result-seed`} seed={step.result.seed ?? null} />
      )}
      {step.state === "failed" && (
        <RunFailureBox id={`${step.id}-failure`} failure={step.failure} onRetry={step.onRetry} />
      )}
    </Box>
  );
}

/**
 * Solve via reduction: the target's solver, the button, and the chain's steps in order.
 * @param {{chain: Object, back: Object}} props `chain`: `{id, label, select, run, changed,
 *   steps: [reduce, solve]}` (`run` is what RunControls takes, its id `${id}-run`; the steps as
 *   ChainStep takes them). `back` is the last step, the back direction's result cell.
 */
function ChainCell({ chain, back }) {
  return (
    <Box id={chain.id} sx={cellSx}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: "8px 16px",
          minWidth: 0,
        }}
      >
        <Box sx={{ flex: `0 1 ${DROPDOWN_WIDTH}px`, minWidth: 200, maxWidth: "100%" }}>
          <SolverSelect id={`${chain.id}-solver`} label={chain.label} select={chain.select} />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
          <RunControls id={`${chain.id}-run`} {...chain.run} />
        </Box>
      </Box>
      {chain.changed && (
        <Box id={`${chain.id}-changed`} sx={{ fontSize: "0.875rem" }}>
          {chain.changed}
        </Box>
      )}
      <Box
        component="ol"
        id={`${chain.id}-steps`}
        aria-label="Steps of Solve via reduction"
        sx={{ m: 0, p: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 1 }}
      >
        {chain.steps.map((step, index) => (
          <ChainStep key={step.id} step={step} number={index + 1} />
        ))}
        <ResultCell cell={back} step={chain.steps.length + 1} />
      </Box>
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix
 * @param {Object|null} props.cells Null outside Reduce mode (nothing is drawn), otherwise:
 *   `chain`, Solve via reduction (see ChainCell); `source`, the source's solver cell (see
 *   SolverCell); `back`, the back direction's result cell, the chain's last step, and
 *   `forward`, the forward one's, beside the source's cell (see ResultCell); `agree`,
 *   `{tone: "ok"|"err"|"neutral", text}` or null.
 */
export default function ReduceCells({ idPrefix, cells }) {
  if (!cells) return null;
  const { chain, source, back, forward, agree } = cells;
  return (
    <Box id={idPrefix} sx={{ display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}>
      <ChainCell chain={chain} back={back} />
      <Box id={`${idPrefix}-results`} sx={sideGridSx}>
        <SolverCell cell={source} />
        <ResultCell cell={forward} />
        {agree && (
          <Box
            id={`${idPrefix}-agree`}
            role="status"
            data-tone={agree.tone}
            sx={{
              gridColumn: "1 / -1",
              textAlign: "center",
              fontSize: "0.875rem",
              fontWeight: 600,
              px: 1.5,
              py: 0.75,
              borderRadius: "8px",
              border: "1px solid",
              ...AGREE_TONES[agree.tone],
            }}
          >
            {agree.text}
          </Box>
        )}
      </Box>
    </Box>
  );
}
