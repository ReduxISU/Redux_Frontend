// components/workbench/panels/ReduceCells.js
//
// #279 stage 2 (board F): Reduce mode's part of the Execute section, under the Reduce row, on the
// Workspace's shared two-column grid (layout.js sideGridSx), so each side's cells sit under that
// side's picture and stack, source first, when the Workspace is narrow.
//
//   - One solver cell per side: the side's solver (a tagged dropdown) and its Solve button ("Solve
//     3SAT", "Solve Clique"), with its own chip, busy line, Cancel and failure box. The source
//     cell's solve is the same solve, with the same result, as Solve mode's. The target's waits
//     for Reduce to build the target instance.
//   - The results row: "<Target> answer -> back to <Source>" under the source column and "Your
//     <Source> answer -> into <Target>" under the target column, each with the direction it
//     relies on, and Check it for an answer that came across. Converting an answer runs in
//     polynomial time, so both fill in by themselves once their inputs exist; only solving takes
//     a button. A reduction that can't convert answers in a direction says "Not available for
//     this reduction" there, in neutral grey: that is a gap in the reduction, not an error.
//   - The agree line, across both columns once both sides are solved (lib/answers.js agreeLine:
//     a difference is only called a bug when exact solvers gave both answers).

import Box from "@mui/material/Box";
import { MONO_FONT, secondaryButtonSx, sideGridSx } from "../layout";
import { BusyLine, RunControls, RunFailureBox } from "../RunParts";
import TaggedSelect from "../TaggedSelect";
import { AnswerLine } from "./ResultPanel";

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

const AGREE_TONES = {
  ok: { borderColor: "status.ok", backgroundColor: "status.okBg", color: "status.okText" },
  err: { borderColor: "status.err", backgroundColor: "status.errBg", color: "status.errText" },
  neutral: {
    borderColor: "border.main",
    backgroundColor: "surface.raised",
    color: "text.secondary",
  },
};

/**
 * One side's solver cell.
 * @param {{cell: Object}} props `cell`: `{id, label, select, run, busy, failure, onRetry,
 *   result: {found, answer, elapsedMs}|null, changed: string|null}`. `run` is what RunControls
 *   takes (its id is `${id}-run`).
 */
function SolverCell({ cell }) {
  return (
    <Box id={cell.id} sx={cellSx}>
      {cell.select ? (
        <TaggedSelect
          id={`${cell.id}-solver`}
          label={cell.label}
          hue="blue"
          boxSx={{ width: "100%" }}
          {...cell.select}
        />
      ) : (
        <Box sx={quietSx}>{cell.label}: none declared.</Box>
      )}
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
      {cell.changed && (
        <Box id={`${cell.id}-changed`} sx={{ fontSize: "0.875rem" }}>
          {cell.changed}
        </Box>
      )}
    </Box>
  );
}

/**
 * One direction of the results row.
 * @param {{cell: Object}} props `cell`: `{id, heading, direction, state, text, answer, onCheck,
 *   failure, onRetry}`. `state` is "na" (the reduction can't convert answers this way),
 *   "waiting" (`text` says what is missing), "loading", "answer" (`answer`, with Check it),
 *   "none" (`text`, nothing came across), or "failed" (`failure`, with Try again).
 */
function ResultCell({ cell }) {
  return (
    <Box id={cell.id} data-state={cell.state} sx={cellSx}>
      <Box
        component="h4"
        sx={{ m: 0, fontSize: "0.8125rem", fontWeight: 600, color: "text.secondary" }}
      >
        {cell.heading}
      </Box>
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
 * @param {Object} props
 * @param {string} props.idPrefix
 * @param {Object|null} props.cells Null outside Reduce mode (nothing is drawn), otherwise:
 *   `source` and `target`, the solver cells (see SolverCell); `back`, the back direction's
 *   result cell, under the source column, and `forward`, the forward one's, under the target
 *   column (see ResultCell); `agree`, `{tone: "ok"|"err"|"neutral", text}` or null.
 */
export default function ReduceCells({ idPrefix, cells }) {
  if (!cells) return null;
  const { source, target, back, forward, agree } = cells;
  return (
    <Box id={idPrefix} sx={{ display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}>
      <Box sx={sideGridSx}>
        <SolverCell cell={source} />
        <SolverCell cell={target} />
      </Box>
      <Box id={`${idPrefix}-results`} sx={sideGridSx}>
        <ResultCell cell={back} />
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
