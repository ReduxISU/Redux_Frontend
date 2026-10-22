// components/workbench/RunParts.js
//
// #279 stage 2 (board F): the pieces every run in the Execute section is made of, so Solve mode's
// row, Reduce mode's row and each side's cell look and behave the same:
//   - the run button (Solve, Reduce, Solve 3SAT, ...), with the reason it is disabled under it
//     ("Another run is going", "Reduce first: ...");
//   - Cancel, which takes the run button's place while it runs;
//   - the chip after it: the run's time, "Running... 0:07" with a spinner, "Timed out", "Failed",
//     "Cancelled", or "Changed · run again" once the instance changed;
//   - the busy line (spinner, what is running, the clock) and the failure box (amber for a run
//     that timed out, red for a server error, grey for Cancelled), each failure with Try again.
//
// The run buttons are the existing primary fill: the soft contained style of the theme refresh
// (#281) isn't on this branch yet.
//
// Times are what this browser measured for the request's round trip, network included: Redux
// reports no running time of its own (#95). The chips say "round trip" in their accessible name.

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { useEffect, useState } from "react";
import { secondaryButtonSx } from "./layout";

/** "0.42 s", the way every chip and result line writes a time. */
export function formatSeconds(milliseconds) {
  return `${(milliseconds / 1000).toFixed(2)} s`;
}

/**
 * Minutes and seconds since `startedAt` while `running`, ticking once a second ("0:07"). Until
 * its first tick it may read 0:00.
 */
export function useRunClock(startedAt, running) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return undefined;
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [running]);
  const seconds = running && startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const CHIP_TONES = {
  ok: { borderColor: "status.ok", backgroundColor: "status.okBg", color: "status.okText" },
  err: { borderColor: "status.err", backgroundColor: "status.errBg", color: "status.errText" },
  warn: { borderColor: "status.warn", backgroundColor: "status.warnBg", color: "status.warnText" },
  neutral: { borderColor: "border.main", backgroundColor: "surface.raised", color: "text.primary" },
};

/**
 * @typedef {Object} Chip
 * @property {"ok"|"err"|"warn"|"neutral"} tone
 * @property {string} text
 * @property {boolean} [spin] A spinner before the text, and the run's clock after it (a run in
 *   progress, which started at `startedAt`).
 * @property {number} [startedAt]
 * @property {string} [label] The accessible name, when the text alone says less ("round trip").
 */

/** @param {{id: string, chip: Chip|null}} props */
export function RunChip({ id, chip }) {
  const clock = useRunClock(chip?.startedAt, Boolean(chip?.spin));
  if (!chip) return null;
  return (
    <Box
      id={id}
      component="span"
      data-tone={chip.tone}
      aria-label={chip.label}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        minHeight: 32,
        px: 1.5,
        borderRadius: "16px",
        border: "1px solid",
        fontSize: "0.8125rem",
        fontWeight: 700,
        whiteSpace: "nowrap",
        ...CHIP_TONES[chip.tone],
      }}
    >
      {chip.spin && <CircularProgress size={14} aria-hidden="true" sx={{ color: "inherit" }} />}
      {chip.spin ? `${chip.text} ${clock}` : chip.text}
    </Box>
  );
}

/**
 * The chip for one run (a hooks/useComputeRequest.js request), by its state: running, timed
 * out, failed, cancelled, its result while that is current, or "Changed" once the instance (or
 * what it ran on) changed since.
 * @param {Object} request
 * @param {Object} options
 * @param {boolean} options.current The kept result is about what is on screen now.
 * @param {(kept: {result: unknown, elapsedMs: number}) => Chip} options.done The chip for a
 *   current result.
 * @param {string} [options.changed] The chip's text once the result is stale.
 * @returns {Chip|null}
 */
export function runChip(request, { current, done, changed = "Changed · run again" }) {
  if (request.isRunning) {
    return { tone: "neutral", spin: true, text: "Running...", startedAt: request.startedAt };
  }
  if (request.status === "failed") {
    return request.failure?.code === "timeout"
      ? { tone: "warn", text: "Timed out" }
      : { tone: "err", text: "Failed" };
  }
  if (request.status === "cancelled") return { tone: "neutral", text: "Cancelled" };
  if (!request.kept) return null;
  return current ? done(request.kept) : { tone: "neutral", text: changed };
}

/**
 * What a run that didn't finish says, or null.
 * @param {Object} request A hooks/useComputeRequest.js request.
 * @returns {RunFailure|null}
 */
export function runFailure(request) {
  if (request.status === "failed") {
    const failure = request.failure ?? { headline: "The run failed", detail: "" };
    if (failure.code === "timeout") {
      return {
        kind: "timeout",
        text: "Stopped after 60 seconds. Try a smaller instance or a faster solver.",
      };
    }
    // Redux's hint, when its answer has one, says what to do next (useComputeRequest.js).
    const text = `${failure.headline}. ${failure.detail} ${failure.hint ?? ""}`;
    return { kind: "server", text: text.replace(/\s+/g, " ").trim() };
  }
  if (request.status === "cancelled") {
    return {
      kind: "cancelled",
      text: request.kept ? "Cancelled. The last result is kept." : "Cancelled.",
    };
  }
  return null;
}

const runButtonSx = {
  minHeight: 44,
  px: 2,
  borderRadius: "8px",
  border: "1px solid",
  borderColor: "brand.line",
  backgroundColor: "brand.fill",
  color: "brand.onFill",
  fontFamily: "inherit",
  fontSize: "0.9375rem",
  fontWeight: 700,
  whiteSpace: "nowrap",
  cursor: "pointer",
  "&:hover": { backgroundColor: "brand.fillHover" },
  "&:disabled": {
    cursor: "not-allowed",
    borderStyle: "dashed",
    borderColor: "border.main",
    backgroundColor: "surface.main",
    color: "text.secondary",
  },
};

/**
 * One run's button, Cancel in its place while it runs, and its chip, on one line; the reason the
 * button is disabled goes under them.
 * @param {Object} props
 * @param {string} props.id The run button's id; Cancel, the chip and the hint derive theirs.
 * @param {string} props.label
 * @param {() => void} props.onRun
 * @param {boolean} props.disabled
 * @param {string} [props.hint] Why it is disabled (shown, and the button's description).
 * @param {boolean} props.running
 * @param {() => void} props.onCancel
 * @param {Chip|null} props.chip
 * @param {boolean} [props.secondary] The quieter outlined button, for a run beside a primary one
 *   (Reduce mode's Solve directly, beside Solve via reduction).
 */
export function RunControls({
  id,
  label,
  onRun,
  disabled,
  hint,
  running,
  onCancel,
  chip,
  secondary = false,
}) {
  const hintId = `${id}-hint`;
  return (
    <>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
        {running ? (
          <Box
            id={`${id}-cancel`}
            component="button"
            type="button"
            onClick={onCancel}
            sx={{ ...secondaryButtonSx, backgroundColor: "surface.input", fontWeight: 700 }}
          >
            Cancel
          </Box>
        ) : (
          <Box
            id={id}
            component="button"
            type="button"
            onClick={onRun}
            disabled={disabled}
            aria-describedby={disabled && hint ? hintId : undefined}
            sx={secondary ? { ...secondaryButtonSx, whiteSpace: "nowrap" } : runButtonSx}
          >
            {label}
          </Box>
        )}
        <RunChip id={`${id}-chip`} chip={chip} />
      </Box>
      {!running && disabled && hint && (
        <Box id={hintId} sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
          {hint}
        </Box>
      )}
    </>
  );
}

/** The spinner, what is running, and its clock. */
export function BusyLine({ id, text, startedAt }) {
  const clock = useRunClock(startedAt, true);
  return (
    <Box
      id={id}
      sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "0.875rem", minWidth: 0 }}
    >
      <CircularProgress size={16} aria-hidden="true" />
      <span>
        {text}... {clock}
      </span>
    </Box>
  );
}

const FAILURE_TONES = {
  timeout: CHIP_TONES.warn,
  server: CHIP_TONES.err,
  cancelled: {
    borderColor: "border.main",
    backgroundColor: "surface.raised",
    color: "text.primary",
  },
};

/**
 * @typedef {Object} RunFailure
 * @property {"timeout"|"server"|"cancelled"} kind
 * @property {string} text
 */

/** A run that didn't finish, and Try again. */
export function RunFailureBox({ id, failure, onRetry }) {
  if (!failure) return null;
  return (
    <Box
      id={id}
      data-kind={failure.kind}
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 1,
        borderRadius: "8px",
        border: "1px solid",
        fontSize: "0.875rem",
        ...FAILURE_TONES[failure.kind],
      }}
    >
      <Box component="span" sx={{ flex: "1 1 220px", minWidth: 0, overflowWrap: "anywhere" }}>
        {failure.text}
      </Box>
      <Box
        id={`${id}-retry`}
        component="button"
        type="button"
        onClick={onRetry}
        sx={{ ...secondaryButtonSx, minHeight: 36, backgroundColor: "surface.input" }}
      >
        Try again
      </Box>
    </Box>
  );
}
