// components/workbench/panels/VerifyBox.js
//
// #229: the basic Verify area at the bottom of the Result panel. It keeps the old page's
// live Verify (T37/#95) reachable on the workbench: the verifier's name, the certificate
// format, a certificate box pre-filled with the problem's example certificate, and Check.
// It works before anything has run. The rest of the Verify design (Verify This Answer, the
// Check-against switch, drawing the certificate on the picture) is a later stage of #229.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import {
  COMPUTE_CANCELLED,
  COMPUTE_DONE,
  COMPUTE_FAILED,
  COMPUTE_RUNNING,
  useComputeRequest,
} from "../../../hooks/useComputeRequest";
import { REDUX_API_BASE_URL, requestVerifiedInstance } from "../../../lib/redux";
import ComputeStatus from "../../detail/ComputeStatus";
import { readVerdict, VerdictBanner } from "../../detail/VerifierSection";
import { MONO_FONT } from "../layout";

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {Object} props.problem The problem, as hooks/useProblemDetail.js builds it.
 * @param {string} props.instance The instance the certificate is checked against.
 */
export default function VerifyBox({ idPrefix, problem, instance }) {
  const verifier = problem.verifier;
  const [certificate, setCertificate] = useState(verifier?.exampleCertificate ?? "");
  const check = useComputeRequest({ subject: "certificate" });

  const certificateId = `${idPrefix}-certificate`;
  const canCheck =
    Boolean(verifier?.className) && instance.trim() !== "" && certificate.trim() !== "";
  const verdict = check.status === COMPUTE_DONE ? readVerdict(check.result.verdict) : null;
  const verdictIsCurrent =
    verdict !== null &&
    check.result.instance === instance &&
    check.result.certificate === certificate;

  function handleCheck() {
    if (!canCheck) return;
    const instanceAtCheck = instance;
    const certificateAtCheck = certificate;
    check.start(async (signal) => ({
      verdict: await requestVerifiedInstance(
        REDUX_API_BASE_URL,
        verifier.className,
        instanceAtCheck,
        certificateAtCheck,
        signal,
      ),
      instance: instanceAtCheck,
      certificate: certificateAtCheck,
    }));
  }

  let announcement = "";
  if (check.status === COMPUTE_RUNNING) {
    announcement = "Checking this certificate.";
  } else if (verdict) {
    announcement =
      verdict.valid === true
        ? "Certificate accepted. It is valid for this instance."
        : verdict.valid === false
          ? "Certificate rejected. It is not valid for this instance."
          : `Redux answered: ${verdict.text}`;
  } else if (check.status === COMPUTE_FAILED) {
    announcement = `The certificate was not checked. ${check.failure?.headline ?? ""}`;
  } else if (check.status === COMPUTE_CANCELLED) {
    announcement = "Check cancelled.";
  }

  return (
    <Box
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
      {!verifier ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No verifier declared for this problem.
        </Typography>
      ) : (
        <>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 8px" }}>
            <Box component="span" sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
              Verifier
            </Box>
            <Box component="strong" sx={{ fontSize: "0.875rem" }}>
              {verifier.name}
            </Box>
          </Box>
          {verifier.certificateFormat && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Box component="span" sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
                Certificate format
              </Box>
              <Box
                component="span"
                sx={{ fontFamily: MONO_FONT, fontSize: "0.8125rem", color: "ink.text2" }}
              >
                {verifier.certificateFormat}
              </Box>
            </Box>
          )}
          <Box
            component="label"
            htmlFor={certificateId}
            sx={{ fontSize: "0.875rem", fontWeight: 600 }}
          >
            Certificate for the {problem.name} instance
          </Box>
          <Box
            id={certificateId}
            component="textarea"
            rows={3}
            value={certificate}
            onChange={(event) => setCertificate(event.target.value)}
            spellCheck={false}
            sx={{
              width: "100%",
              boxSizing: "border-box",
              resize: "vertical",
              backgroundColor: "surface.input",
              color: "text.primary",
              border: "1px solid",
              borderColor: "border.main",
              borderRadius: "8px",
              px: 1.5,
              py: 1.25,
              fontFamily: MONO_FONT,
              fontSize: "0.875rem",
            }}
          />
          <Box
            id={`${idPrefix}-check`}
            component="button"
            type="button"
            disabled={!canCheck || check.isRunning}
            onClick={handleCheck}
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
          {!canCheck && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {verifier.className
                ? "Check needs both an instance and a certificate. Fill in whichever is empty."
                : "This verifier cannot be run: the catalog did not say which backend verifier it is."}
            </Typography>
          )}
          <ComputeStatus
            idPrefix={`${idPrefix}-check`}
            status={check.status}
            announcement={announcement}
            failure={check.failure}
            onCancel={check.cancel}
            busyLabel="Checking this certificate"
          />
          {verdict && (
            <VerdictBanner
              id={`${idPrefix}-verdict`}
              valid={verdict.valid}
              headline={
                verdict.valid === true
                  ? "Valid certificate"
                  : verdict.valid === false
                    ? "Not a valid certificate"
                    : "Redux answered something unexpected"
              }
              detail={
                !verdictIsCurrent
                  ? "That was for an earlier instance or certificate. Press Check again for the current ones."
                  : verdict.valid === true
                    ? `Redux checked this certificate against the ${problem.name} instance and accepted it.`
                    : verdict.valid === false
                      ? `Redux checked this certificate against the ${problem.name} instance and rejected it.`
                      : `The verifier returned "${verdict.text}", which is neither True nor False, so this page will not guess which it meant.`
              }
            />
          )}
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Checking needs no solver: type any certificate and press Check.
          </Typography>
        </>
      )}
    </Box>
  );
}
