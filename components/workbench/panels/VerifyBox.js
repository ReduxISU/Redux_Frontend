// components/workbench/panels/VerifyBox.js
//
// #229 stage 3: Verify. #279 stage 4 (board F) made it one strip per side: the source in Solve
// mode, and source and target in Reduce mode, each under its own column of the Workspace's
// shared two-column grid (layout.js sideGridSx), so a side's strip sits under its picture and its
// solver cell. Each strip, top to bottom:
//   - its heading ("Verify 3SAT") with Hide / Show: each strip collapses on its own;
//   - the verifier's name;
//   - "Certificate", the field (one line high; on phones and small tablets it grows with the
//     text), and the hint under it, worded per problem with Redux's own example, which is also
//     the placeholder (lib/certificateHints.js);
//   - Check, and Use the solver's answer (disabled, saying why, until a solver or an answer
//     carried across the reduction has given this side an answer);
//   - the verdict: Valid, Not valid, or Can't check this (Redux could not read it), while it is
//     of the certificate and instance on screen; once either changes, a line asks to check again;
//   - Show where it fails, for a well-formed certificate that fails.
//
// Verify needs no run: the source side checks a typed certificate against the instance as it
// is. The target side checks against the instance Reduce built, so its Check waits for a build.
//
// Show where it fails: Redux's verifier answers a bare True or False (ProblemProvider/verify),
// and no endpoint draws a given certificate on a picture, so there is nothing to highlight and
// no failing part to name. The button is there, disabled, with that reason under it; switch on
// FAILURE_SUPPORTED once Redux can say where a certificate fails.
//
// The state lives in hooks/useCertificateCheck.js, owned by the Workbench, so what is typed
// survives collapsing a strip and hiding the section. This file only draws it.
//
// #279 (Workspace tweaks):
//   - the verifier's name became a dropdown of every verifier Redux lists for the side's problem
//     (Navigation/Batch/allVerifiers; one each today, so one option);
//   - each verdict says how long the check took, measured the way Execute's runs are: this
//     browser's round trip for the request, network included;
//   - Enter in the certificate field checks it (Shift+Enter starts a new line);
//   - collapsed (the Verify section's Show less), the section keeps one side's top controls, live,
//     on its heading's line: the verifier, the certificate field, Check and a chip with the
//     verdict and its time. In Reduce mode a Problem to verify choice (source or target, by name)
//     comes first and picks the side; the target can't be picked until Reduce has built its
//     instance. These are the strip's own elements, laid out in a row, so what is typed or picked
//     collapsed is what the strip shows expanded. The rest stays on the page, hidden.

import Box from "@mui/material/Box";
import { useState } from "react";
import {
  COMPUTE_CANCELLED,
  COMPUTE_FAILED,
  COMPUTE_RUNNING,
} from "../../../hooks/useComputeRequest";
import ComputeStatus from "../../detail/ComputeStatus";
import { COMPACT_MEDIA, controlLabelSx, MONO_FONT, secondaryButtonSx, sideGridSx } from "../layout";
import { formatSeconds, RunChip } from "../RunParts";
import TaggedSelect from "../TaggedSelect";

const FAILURE_SUPPORTED = false;
export const FAILURE_REASON =
  "Redux's verifier only answers valid or not valid, so it can't point at the part that fails yet.";

const quietSx = { fontSize: "0.8125rem", color: "text.secondary" };

// The collapsed row's verifier dropdown: room for "Default SAT Verifier" and its (i).
const VERIFIER_WIDTH = 280;

const stripSx = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  px: 1.5,
  py: 1.25,
  minWidth: 0,
  border: "1px solid",
  borderColor: "border.soft",
  borderRadius: "10px",
  backgroundColor: "surface.input",
};

const headSx = {
  width: "100%",
  minHeight: 36,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 1,
  p: 0,
  border: 0,
  background: "transparent",
  color: "text.secondary",
  fontFamily: "inherit",
  fontSize: "0.8125rem",
  fontWeight: 600,
  // #279: not upper-cased, so the problem reads as Redux names it ("Verify Vertex Cover").
  textAlign: "left",
  cursor: "pointer",
};

const checkButtonSx = {
  minHeight: 40,
  px: 1.75,
  borderRadius: "8px",
  border: "1px solid",
  borderColor: "brand.line",
  backgroundColor: "brand.fill",
  color: "brand.onFill",
  fontFamily: "inherit",
  fontSize: "0.875rem",
  fontWeight: 700,
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

// Read by screen readers, not shown: the disabled Use the solver's answer button's reason.
const visuallyHiddenSx = {
  position: "absolute",
  // Pixels, not sx's 0-1 fractions (width: 1 would be 100%).
  width: "1px",
  height: "1px",
  p: 0,
  m: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

const useButtonSx = {
  ...secondaryButtonSx,
  minHeight: 40,
  px: 1.5,
  "&:disabled": {
    cursor: "not-allowed",
    borderStyle: "dashed",
    backgroundColor: "surface.main",
    color: "text.secondary",
  },
};

const RESULT_TONES = {
  valid: { borderColor: "status.ok", backgroundColor: "status.okBg", color: "status.okText" },
  invalid: { borderColor: "status.err", backgroundColor: "status.errBg", color: "status.errText" },
  unreadable: {
    borderColor: "status.warn",
    backgroundColor: "status.warnBg",
    color: "status.warnText",
  },
  odd: { borderColor: "border.main", backgroundColor: "surface.raised", color: "text.primary" },
};

/**
 * What the verdict box says, or null when there is nothing to show.
 * @returns {{tone: string, headline: string, detail: string}|null}
 */
function resultOf(check, problemName) {
  if (check.unreadable) {
    return { tone: "unreadable", headline: "Can't check this.", detail: check.unreadable.detail };
  }
  const verdict = check.verdict;
  if (!verdict) return null;
  if (verdict.valid === true) {
    return {
      tone: "valid",
      headline: "Valid.",
      detail: `Redux checked it against this ${problemName} instance and accepted it.`,
    };
  }
  if (verdict.valid === false) {
    return {
      tone: "invalid",
      headline: "Not valid.",
      detail: `Redux checked it against this ${problemName} instance and rejected it.`,
    };
  }
  return {
    tone: "odd",
    headline: "Redux answered something unexpected.",
    detail: `The verifier returned "${verdict.text}", which is neither True nor False, so this page will not guess which it meant.`,
  };
}

/** How long the side's last check took, as Execute writes a run's time ("0.08 s"). */
function checkTime(check) {
  return formatSeconds(check.request.elapsedMs);
}

/**
 * The collapsed line's chip (./RunParts.js RunChip): the side's verdict and its time,
 * "Checking..." with a clock, or "Not checked" before any check.
 * @returns {import("../RunParts").Chip}
 */
export function verdictChip(check) {
  const { request } = check;
  if (request.status === COMPUTE_RUNNING) {
    return { tone: "neutral", spin: true, text: "Checking...", startedAt: request.startedAt };
  }
  const time = checkTime(check);
  const timed = (tone, word) => ({
    tone,
    text: `${word} · ${time}`,
    label: `${word}, ${time}, round trip`,
  });
  if (check.unreadable) return timed("warn", "Can't check this");
  const verdict = check.verdict;
  if (verdict?.valid === true) return timed("ok", "Valid");
  if (verdict?.valid === false) return timed("err", "Not valid");
  if (verdict) return timed("neutral", "Unexpected answer");
  if (check.stale) return { tone: "neutral", text: "Changed · check again" };
  if (request.status === COMPUTE_FAILED) return { tone: "err", text: "Failed" };
  if (request.status === COMPUTE_CANCELLED) return { tone: "neutral", text: "Cancelled" };
  return { tone: "neutral", text: "Not checked" };
}

/**
 * What the strip's status line says while there is no verdict. A verdict is its own live region
 * (the box below), so it is not said twice on screen.
 */
function announcementOf(check, result) {
  const { request } = check;
  if (request.status === COMPUTE_RUNNING) return "Checking this certificate.";
  if (result) return "";
  if (request.status === COMPUTE_FAILED) {
    return `The certificate was not checked. ${request.failure?.headline ?? ""}`;
  }
  if (request.status === COMPUTE_CANCELLED) return "Check cancelled.";
  return "";
}

/**
 * @typedef {Object} VerifyStrip
 * @property {"source"|"target"} side
 * @property {string} problemName The side's problem ("3SAT").
 * @property {boolean} open Shown, or collapsed to its heading.
 * @property {() => void} onToggle
 * @property {ReturnType<import("../../../hooks/useCertificateCheck").useCertificateCheck>["source"]}
 *   check The side's check (hooks/useCertificateCheck.js).
 * @property {{hint: string, example: string}} format The hint and placeholder.
 * @property {string} checkHint Why Check can't run yet ("" when it can).
 * @property {string|null} answer The solver's answer for this side, when there is one.
 * @property {string} answerHint Why Use the solver's answer is disabled.
 */

// Shown on the strip only while expanded (a collapsed strip keeps its top controls).
function expandedOnly(collapsed, display = "block") {
  return collapsed ? { display: "none" } : { display };
}

/**
 * One side's strip.
 * @param {{id: string, strip: VerifyStrip, collapsed: boolean, shown: boolean}} props
 *   `collapsed`: the Verify section is collapsed, so the strip draws only its top controls in a
 *   row; `shown`: this is the side the collapsed row checks (the other strip is hidden).
 */
function Strip({ id, strip, collapsed, shown }) {
  const { check, problemName } = strip;
  const open = collapsed || strip.open;
  const verifier = check.info?.verifier ?? null;
  const bodyId = `${id}-body`;
  const certificateId = `${id}-certificate`;
  const hintId = `${certificateId}-hint`;
  const result = resultOf(check, problemName);
  const running = check.request.isRunning;
  const checkDisabled = Boolean(strip.checkHint) || running;
  // Check stays enabled with an empty field, so it never looks like Verify needs a run first;
  // pressing it then asks for a certificate instead.
  const [askedEmpty, setAskedEmpty] = useState(false);
  const empty = check.certificate.trim() === "";
  const shownFailure =
    check.request.status === COMPUTE_FAILED && !check.unreadable && !check.stale
      ? check.request.failure
      : null;

  // Check, and Enter in the field.
  function runCheck() {
    if (checkDisabled) return;
    if (empty) {
      setAskedEmpty(true);
      document.getElementById(certificateId)?.focus();
      return;
    }
    setAskedEmpty(false);
    check.check();
  }

  // Collapsed, the strip and its body stop being boxes of their own (`display: contents`), so
  // their parts sit in VerifyBox's row; the other side's strip is hidden.
  let rootSx = stripSx;
  if (collapsed) rootSx = shown ? { display: "contents" } : { display: "none" };
  const bodySx = collapsed
    ? { display: "contents" }
    : { display: open ? "flex" : "none", flexDirection: "column", gap: "6px", minWidth: 0 };

  return (
    <Box id={id} data-side={strip.side} hidden={collapsed && !shown} sx={rootSx}>
      <Box
        id={`${id}-toggle`}
        component="button"
        type="button"
        aria-expanded={strip.open ? "true" : "false"}
        aria-controls={bodyId}
        onClick={strip.onToggle}
        hidden={collapsed}
        sx={{ ...headSx, ...expandedOnly(collapsed, "flex") }}
      >
        <span>Verify {problemName}</span>
        <Box
          component="span"
          sx={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "brand.text",
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          {strip.open ? "Hide" : "Show"}
        </Box>
      </Box>
      <Box id={bodyId} hidden={!open} sx={bodySx}>
        {!verifier ? (
          <Box id={`${id}-no-verifier`} sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
            No verifier is declared for {problemName} yet, so there is nothing to check with.
          </Box>
        ) : (
          <>
            {strip.verifierSelect && (
              <Box
                sx={
                  collapsed
                    ? { flex: `0 1 ${VERIFIER_WIDTH}px`, minWidth: 200, maxWidth: "100%" }
                    : { minWidth: 0 }
                }
              >
                <TaggedSelect
                  id={`${id}-verifier`}
                  label="Verifier"
                  hue="green"
                  boxSx={{ width: "100%" }}
                  {...strip.verifierSelect}
                />
              </Box>
            )}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: collapsed ? 0.5 : "6px",
                minWidth: 0,
                ...(collapsed ? { flex: "1 1 220px" } : {}),
              }}
            >
              <Box
                component="label"
                htmlFor={certificateId}
                sx={collapsed ? controlLabelSx : quietSx}
              >
                Certificate
              </Box>
              <Box
                id={certificateId}
                component="textarea"
                rows={1}
                value={check.certificate}
                placeholder={strip.format.example}
                onChange={(event) => check.setCertificate(event.target.value)}
                onKeyDown={(event) => {
                  // Enter checks; Shift+Enter, or Enter while an input method composes, types.
                  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
                    return;
                  }
                  event.preventDefault();
                  runCheck();
                }}
                spellCheck={false}
                aria-describedby={check.unreadable ? `${hintId} ${id}-verdict` : hintId}
                aria-invalid={check.unreadable ? "true" : undefined}
                sx={{
                  boxSizing: "border-box",
                  width: "100%",
                  minWidth: 0,
                  minHeight: collapsed ? 44 : 30,
                  px: 1.25,
                  py: collapsed ? 1.25 : 0.5,
                  lineHeight: "20px",
                  resize: collapsed ? "none" : "vertical",
                  border: "1px solid",
                  borderColor: check.unreadable ? "status.warn" : "border.main",
                  borderRadius: "8px",
                  fontFamily: MONO_FONT,
                  fontSize: "0.875rem",
                  color: "text.primary",
                  backgroundColor: "surface.main",
                  "&::placeholder": { color: "text.secondary", opacity: 1 },
                  // Phones and small tablets: the field grows with the text instead of scrolling.
                  [COMPACT_MEDIA]: {
                    fieldSizing: "content",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    resize: "none",
                  },
                }}
              />
            </Box>
            <Box
              id={hintId}
              sx={{
                ...quietSx,
                overflowWrap: "anywhere",
                // Collapsed, still the field's description, but not shown.
                ...(collapsed ? visuallyHiddenSx : {}),
              }}
            >
              {strip.format.hint}
            </Box>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 1,
                minWidth: 0,
                ...(collapsed ? {} : { mt: 0.5 }),
              }}
            >
              <Box
                id={`${id}-check`}
                component="button"
                type="button"
                disabled={checkDisabled}
                aria-describedby={strip.checkHint ? `${id}-check-hint` : undefined}
                onClick={runCheck}
                sx={{ ...checkButtonSx, ...(collapsed ? { minHeight: 44, px: 2 } : {}) }}
              >
                Check
              </Box>
              {/* Why it's disabled is a tooltip, not a line on the page, so it doesn't read as a
                  step Verify needs. A disabled button gets no hover, so the wrapper carries it. */}
              <Box
                component="span"
                id={`${id}-use-answer-wrap`}
                hidden={collapsed}
                title={!strip.answer ? strip.answerHint : undefined}
                sx={expandedOnly(collapsed, "inline-flex")}
              >
                <Box
                  id={`${id}-use-answer`}
                  component="button"
                  type="button"
                  disabled={!strip.answer || !check.info?.instance || running}
                  aria-describedby={!strip.answer ? `${id}-use-answer-hint` : undefined}
                  onClick={() => strip.answer && check.check(strip.answer)}
                  sx={useButtonSx}
                >
                  {"Use the solver's answer"}
                </Box>
              </Box>
              {collapsed && <RunChip id={`${id}-chip`} chip={verdictChip(check)} />}
            </Box>
            {askedEmpty && empty && !strip.checkHint && (
              <Box id={`${id}-empty`} role="status" sx={{ ...quietSx, flexBasis: "100%" }}>
                Type a certificate first.
              </Box>
            )}
            {strip.checkHint && (
              <Box id={`${id}-check-hint`} sx={{ ...quietSx, flexBasis: "100%" }}>
                {strip.checkHint}
              </Box>
            )}
            {!strip.answer && (
              <Box id={`${id}-use-answer-hint`} sx={visuallyHiddenSx}>
                {strip.answerHint}
              </Box>
            )}
            {/* Collapsed, the chip shows what this says; its live region still speaks. */}
            <Box sx={collapsed ? visuallyHiddenSx : { display: "contents" }}>
              <ComputeStatus
                idPrefix={`${id}-check`}
                status={check.request.status}
                announcement={announcementOf(check, result)}
                failure={shownFailure}
                onCancel={check.request.cancel}
                busyLabel="Checking this certificate"
              />
            </Box>
            {result && (
              <Box
                id={`${id}-verdict`}
                role="status"
                data-tone={result.tone}
                data-valid={
                  result.tone === "valid" ? "true" : result.tone === "invalid" ? "false" : undefined
                }
                sx={{
                  m: 0,
                  px: 1.5,
                  py: 1.25,
                  borderRadius: "8px",
                  border: "1px solid",
                  fontSize: "0.875rem",
                  overflowWrap: "anywhere",
                  ...RESULT_TONES[result.tone],
                  // Collapsed, the chip shows it; the field's aria-describedby still reads it.
                  ...(collapsed ? visuallyHiddenSx : {}),
                }}
              >
                <Box component="strong">{result.headline}</Box> {result.detail}{" "}
                <Box component="span" id={`${id}-verdict-time`} sx={{ whiteSpace: "nowrap" }}>
                  Took {checkTime(check)} (round trip)
                </Box>
              </Box>
            )}
            {result?.tone === "invalid" && (
              <Box
                hidden={collapsed}
                sx={{
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "6px 10px",
                  ...expandedOnly(collapsed, "flex"),
                }}
              >
                <Box
                  id={`${id}-fail`}
                  component="button"
                  type="button"
                  aria-pressed="false"
                  disabled={!FAILURE_SUPPORTED}
                  aria-describedby={FAILURE_SUPPORTED ? undefined : `${id}-fail-reason`}
                  sx={{
                    ...useButtonSx,
                    backgroundColor: "surface.main",
                    alignSelf: "flex-start",
                  }}
                >
                  Show where it fails
                </Box>
                {!FAILURE_SUPPORTED && (
                  <Box component="span" id={`${id}-fail-reason`} sx={quietSx}>
                    {FAILURE_REASON}
                  </Box>
                )}
              </Box>
            )}
            {check.stale && !running && !collapsed && (
              <Box id={`${id}-stale`} sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
                The certificate or the instance changed after the last check. Check again.
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}

const choiceButtonSx = {
  minHeight: 44,
  px: "14px",
  borderRadius: "8px",
  border: "1px solid",
  borderColor: "border.main",
  backgroundColor: "transparent",
  color: "text.primary",
  fontFamily: "inherit",
  fontSize: "0.875rem",
  fontWeight: 700,
  cursor: "pointer",
  overflowWrap: "anywhere",
  "&:hover": { backgroundColor: "surface.raised" },
  '&[aria-pressed="true"]': {
    border: "2px solid",
    borderColor: "brand.line",
    backgroundColor: "surface.raised",
  },
  "&:disabled": {
    cursor: "not-allowed",
    borderStyle: "dashed",
    backgroundColor: "surface.main",
    color: "text.secondary",
  },
};

/**
 * Collapsed Verify's Problem to verify choice (Reduce mode): the source or the target, by name.
 * The target is disabled, saying why, until Reduce has built its instance.
 */
function SideChoice({ id, strips, choice }) {
  const labelId = `${id}-label`;
  const reasonId = `${id}-target-reason`;
  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 0.5, flex: "none", maxWidth: "100%" }}
    >
      <Box id={labelId} sx={controlLabelSx}>
        Problem to verify
      </Box>
      <Box
        id={id}
        role="group"
        aria-labelledby={labelId}
        sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}
      >
        {strips.map((strip) => {
          const disabled = strip.side === "target" && Boolean(choice.targetDisabledReason);
          return (
            // A disabled button gets no hover, so the wrapper carries the reason's tooltip.
            <Box
              key={strip.side}
              component="span"
              title={disabled ? choice.targetDisabledReason : undefined}
              sx={{ display: "inline-flex", minWidth: 0 }}
            >
              <Box
                id={`${id}-${strip.side}`}
                component="button"
                type="button"
                aria-pressed={choice.value === strip.side ? "true" : "false"}
                disabled={disabled}
                aria-describedby={disabled ? reasonId : undefined}
                onClick={() => choice.onChange(strip.side)}
                sx={choiceButtonSx}
              >
                {strip.problemName}
              </Box>
            </Box>
          );
        })}
      </Box>
      {choice.targetDisabledReason && (
        <Box id={reasonId} sx={visuallyHiddenSx}>
          {choice.targetDisabledReason}
        </Box>
      )}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here; each strip is
 *   `${idPrefix}-${side}`.
 * @param {VerifyStrip[]} props.strips The source's, then the target's in Reduce mode.
 * @param {boolean} [props.collapsed] Only one side's top controls, in a row.
 * @param {"source"|"target"} [props.side] The side the collapsed row checks.
 * @param {{value: string, onChange: Function, targetDisabledReason: string}|null} [props.choice]
 *   Reduce mode's Problem to verify choice, shown while collapsed.
 */
export default function VerifyBox({
  idPrefix,
  strips,
  collapsed = false,
  side = "source",
  choice = null,
}) {
  let rootSx = strips.length > 1 ? sideGridSx : { display: "flex", flexDirection: "column" };
  if (collapsed) {
    rootSx = {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "flex-end",
      gap: "12px 16px",
      minWidth: 0,
    };
  }
  return (
    <Box
      id={idPrefix}
      data-collapsed={collapsed ? "true" : "false"}
      // #279: the Verify pane draws the title.
      sx={rootSx}
    >
      {collapsed && choice && strips.length > 1 && (
        <SideChoice id={`${idPrefix}-side`} strips={strips} choice={choice} />
      )}
      {strips.map((strip) => (
        <Strip
          key={strip.side}
          id={`${idPrefix}-${strip.side}`}
          strip={strip}
          collapsed={collapsed}
          shown={strip.side === side}
        />
      ))}
    </Box>
  );
}
