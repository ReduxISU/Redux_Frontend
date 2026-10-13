// components/workbench/panels/VerifyBox.js
//
// #229 stage 3: the Verify section at the bottom of the Result & Verify panel. It works before
// anything has run (a student checking their own answer): the verifier's name, the certificate
// format the backend declares (built from the verifier's CertificateGrammar where it has one),
// the certificate box and Check.
//
// In Reduce mode a "Check against: source | target" switch sits on top. The target side checks
// with the target problem's verifier against the instance the reduction built, so it stays
// locked (with the reason under it) until a run has built one.
//
// The state lives in hooks/useCertificateCheck.js, owned by the Workbench: the verdict also
// goes on the picture pane's Showing line, and Verify This Answer fills this box from the
// Result panel. This file only draws it.
//
// A certificate Redux cannot read (400 certificate_parse_error) shows its error right under
// the box, and nothing else: there is no verdict to show and nothing to draw.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { CHECK_SOURCE, CHECK_TARGET } from "../../../hooks/useCertificateCheck";
import {
  COMPUTE_CANCELLED,
  COMPUTE_FAILED,
  COMPUTE_RUNNING,
} from "../../../hooks/useComputeRequest";
import ComputeStatus from "../../detail/ComputeStatus";
import { VerdictBanner } from "../../detail/VerifierSection";
import { MONO_FONT } from "../layout";

/** The backend's certificate formats end in "Example: ..."; that example is the placeholder. */
function exampleFrom(format) {
  const match = /Example:\s*(.+)$/.exec(format ?? "");
  return match ? match[1].trim() : "";
}

function SideButton({ id, pressed, disabled, onClick, children, line }) {
  return (
    <Box
      id={id}
      component="button"
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      title={typeof children === "string" ? children : undefined}
      onClick={onClick}
      sx={{
        flex: "1 1 0",
        minWidth: 0,
        minHeight: 44,
        px: 1.25,
        borderRadius: "8px",
        border: pressed ? "2px solid" : "1px solid",
        borderColor: pressed ? line : "border.main",
        backgroundColor: pressed ? "surface.raised" : "transparent",
        color: "text.primary",
        fontFamily: "inherit",
        fontSize: "0.875rem",
        fontWeight: 700,
        cursor: "pointer",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        "&:disabled": { cursor: "not-allowed", color: "text.disabled" },
      }}
    >
      {children}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {"solve"|"reduce"} props.mode The command bar's mode.
 * @param {ReturnType<import("../../../hooks/useCertificateCheck").useCertificateCheck>}
 *   props.verify The Verify state.
 * @param {string} props.sourceName The problem's name, for the switch.
 * @param {string|null} props.targetName The target problem's name (Reduce mode).
 * @param {string} props.targetLockReason Why the target side is locked, shown under the switch.
 */
export default function VerifyBox({
  idPrefix,
  mode,
  verify,
  sourceName,
  targetName,
  targetLockReason,
}) {
  const { current, certificate, request, verdict, checkOn } = verify;
  const verifier = current?.verifier ?? null;
  const onTarget = checkOn === CHECK_TARGET;

  const certificateId = `${idPrefix}-certificate`;
  const errorId = `${certificateId}-error`;
  const hasInstance = Boolean(current?.instance?.trim());
  const canCheck = Boolean(verifier?.className) && hasInstance && certificate.trim() !== "";

  const unreadable =
    request.status === COMPUTE_FAILED && request.failure?.code === "certificate_parse_error"
      ? request.failure
      : null;
  const shownVerdict = verdict && verdict.side === checkOn ? verdict : null;
  const verdictIsCurrent =
    shownVerdict !== null &&
    shownVerdict.instance === current.instance &&
    shownVerdict.certificate === certificate;

  let announcement = "";
  if (request.status === COMPUTE_RUNNING) {
    announcement = "Checking this certificate.";
  } else if (verdict) {
    announcement =
      verdict.valid === true
        ? `Certificate accepted. It is valid for the ${verdict.label}.`
        : verdict.valid === false
          ? `Certificate rejected. It is not valid for the ${verdict.label}.`
          : `Redux answered: ${verdict.text}`;
  } else if (request.status === COMPUTE_FAILED) {
    announcement = `The certificate was not checked. ${request.failure?.headline ?? ""}`;
  } else if (request.status === COMPUTE_CANCELLED) {
    announcement = "Check cancelled.";
  }

  let cannotCheck = "";
  // (With no verifier at all, the box is replaced by a "No verifier declared" line.)
  if (!verifier) cannotCheck = "";
  else if (!verifier.className)
    cannotCheck =
      "This verifier cannot be run: the catalog did not say which backend verifier it is.";
  else if (!hasInstance)
    cannotCheck = "There is no instance to check against. Press Edit to write one.";
  else if (certificate.trim() === "") cannotCheck = "Type a certificate to check.";

  return (
    <Box
      id={idPrefix}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        borderTop: "1px solid",
        borderColor: "border.soft",
        pt: "14px",
      }}
    >
      <Typography component="h3" sx={{ m: 0, fontSize: "1rem", fontWeight: 700 }}>
        Verify
      </Typography>

      {mode === "reduce" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Box
            component="span"
            id={`${idPrefix}-check-on-label`}
            sx={{ fontSize: "0.8125rem", color: "text.secondary" }}
          >
            Check against
          </Box>
          <Box
            role="group"
            aria-labelledby={`${idPrefix}-check-on-label`}
            sx={{ display: "flex", gap: 0.5 }}
          >
            <SideButton
              id={`${idPrefix}-check-on-source`}
              pressed={!onTarget}
              line="brand.line"
              onClick={() => verify.setCheckOn(CHECK_SOURCE)}
            >
              {sourceName}
            </SideButton>
            <SideButton
              id={`${idPrefix}-check-on-target`}
              pressed={onTarget}
              disabled={verify.targetLocked}
              line="brand.goldLine"
              onClick={() => verify.setCheckOn(CHECK_TARGET)}
            >
              {targetName ?? "Target"}
            </SideButton>
          </Box>
          {verify.targetLocked && targetLockReason && (
            <Box
              id={`${idPrefix}-check-on-hint`}
              sx={{ fontSize: "0.8125rem", color: "text.secondary" }}
            >
              {targetLockReason}
            </Box>
          )}
        </Box>
      )}

      {!verifier ? (
        <Typography id={`${idPrefix}-no-verifier`} variant="body2" sx={{ color: "text.secondary" }}>
          No verifier declared for {current?.name ?? "this problem"}.
        </Typography>
      ) : (
        <>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 8px" }}>
            <Box component="span" sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
              Verifier
            </Box>
            <Box component="strong" id={`${idPrefix}-verifier-name`} sx={{ fontSize: "0.875rem" }}>
              {verifier.name}
            </Box>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Box component="span" sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
              Certificate format
            </Box>
            <Box
              component="span"
              id={`${idPrefix}-format`}
              sx={{
                fontFamily: MONO_FONT,
                fontSize: "0.8125rem",
                color: "ink.text2",
                overflowWrap: "anywhere",
              }}
            >
              {verifier.certificateFormat || "Not declared yet"}
            </Box>
          </Box>
          <Box
            component="label"
            htmlFor={certificateId}
            sx={{ fontSize: "0.875rem", fontWeight: 600 }}
          >
            Certificate for the {current.label}
          </Box>
          <Box
            id={certificateId}
            component="textarea"
            rows={3}
            value={certificate}
            placeholder={exampleFrom(verifier.certificateFormat)}
            onChange={(event) => verify.setCertificate(event.target.value)}
            spellCheck={false}
            aria-invalid={unreadable ? "true" : undefined}
            aria-describedby={unreadable ? errorId : undefined}
            sx={{
              width: "100%",
              boxSizing: "border-box",
              resize: "vertical",
              backgroundColor: "surface.input",
              color: "text.primary",
              border: "1px solid",
              borderColor: unreadable ? "status.err" : "border.main",
              borderRadius: "8px",
              px: 1.5,
              py: 1.25,
              fontFamily: MONO_FONT,
              fontSize: "0.875rem",
              "&::placeholder": { color: "text.disabled", opacity: 1 },
            }}
          />
          {unreadable && (
            <Box id={errorId} sx={{ fontSize: "0.8125rem", color: "error.light" }}>
              <Box component="span" sx={{ fontWeight: 700 }}>
                {unreadable.headline}.
              </Box>{" "}
              {unreadable.detail}
              {unreadable.expected && (
                <Box component="span" sx={{ display: "block", mt: 0.5 }}>
                  Expected: {unreadable.expected}
                </Box>
              )}
            </Box>
          )}
          <Box
            id={`${idPrefix}-check`}
            component="button"
            type="button"
            disabled={!canCheck || request.isRunning}
            onClick={() => verify.check()}
            sx={{
              alignSelf: "flex-start",
              minHeight: 44,
              px: 2.5,
              borderRadius: "8px",
              border: "none",
              backgroundColor: "text.primary",
              color: "background.default",
              fontFamily: "inherit",
              fontSize: "0.9375rem",
              fontWeight: 700,
              cursor: "pointer",
              "&:disabled": {
                cursor: "not-allowed",
                backgroundColor: "surface.track",
                color: "text.secondary",
              },
            }}
          >
            Check
          </Box>
          {cannotCheck && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {cannotCheck}
            </Typography>
          )}
          <ComputeStatus
            idPrefix={`${idPrefix}-check`}
            status={request.status}
            announcement={announcement}
            failure={unreadable ? null : request.failure}
            onCancel={request.cancel}
            busyLabel="Checking this certificate"
          />
          {shownVerdict && (
            <VerdictBanner
              id={`${idPrefix}-verdict`}
              valid={shownVerdict.valid}
              headline={
                shownVerdict.valid === true
                  ? "Valid certificate"
                  : shownVerdict.valid === false
                    ? "Not a valid certificate"
                    : "Redux answered something unexpected"
              }
              detail={
                !verdictIsCurrent
                  ? "That was for an earlier instance or certificate. Press Check again for the current ones."
                  : shownVerdict.valid === true
                    ? `Redux checked this certificate against the ${shownVerdict.label} and accepted it.`
                    : shownVerdict.valid === false
                      ? `Redux checked this certificate against the ${shownVerdict.label} and rejected it.`
                      : `The verifier returned "${shownVerdict.text}", which is neither True nor False, so this page will not guess which it meant.`
              }
            />
          )}
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {onTarget
              ? "If a mapped certificate checks out on the target, the reduction carried the answer across correctly."
              : "Checking needs no solver: type any certificate and press Check."}
          </Typography>
        </>
      )}
    </Box>
  );
}
