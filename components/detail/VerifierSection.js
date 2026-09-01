// components/detail/VerifierSection.js
//
// T16d (#24) — the Verifier section of a Problem Detail page: the
// certificate format a solution takes, plus a "check a certificate" demo.
//
// v1 scope (ground rule 5): certificate format is real declared data, but
// Verify is inert — no live verification. The Verify button is `disabled`
// (out of tab order automatically) rather than wired to a fake handler, so
// it never looks functional when it isn't. The result banner below it is
// simply the fixture's own canned outcome for its pre-filled example, shown
// unconditionally rather than gated behind a click that wouldn't do
// anything real anyway.
//
// Per the ratified naming convention this section's title is always the
// generic "Verifier" — never problem-prefixed — so it's hardcoded by this
// component's caller-facing contract, not derived from `problem.name`.

import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import SectionShell from "./SectionShell";

const CERTIFICATE_INPUT_ID_PREFIX = "verifier-certificate-input";

/**
 * @param {Object} props
 * @param {Object} props.problem A data/fixtures.js-shaped FixtureProblem.
 *   `problem.verifier` is `{ certificateDescription, certificateFormat,
 *   exampleCertificate?, resultBanner?: { valid, headline, detail },
 *   properties?: string[] } | null` -- only 3-SAT's fixture has every
 *   optional field populated; most problems have just the two required
 *   fields, and Closest Pair of Points has `verifier: null` entirely and
 *   deliberately (the fixture's own "incomplete problem" example).
 * @param {{attributes: Object, listeners: Object}} [props.dragHandleProps]
 *   Forwarded straight through to SectionShell — see T18 (#27).
 */
export default function VerifierSection({ problem, dragHandleProps }) {
  const verifier = problem.verifier;
  const [certificateValue, setCertificateValue] = useState(verifier?.exampleCertificate ?? "");
  const inputId = `${CERTIFICATE_INPUT_ID_PREFIX}-${problem.slug}`;

  if (!verifier) {
    return (
      <SectionShell sectionKey="verifier" title="Verifier" dragHandleProps={dragHandleProps}>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          No verifier declared for this problem.
        </Typography>
      </SectionShell>
    );
  }

  return (
    <SectionShell sectionKey="verifier" title="Verifier" dragHandleProps={dragHandleProps}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Certificate Format
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {verifier.certificateDescription}
          </Typography>
          <Box
            component="pre"
            sx={{
              mt: 1.5,
              mb: 0,
              p: 1.5,
              borderRadius: 1,
              backgroundColor: "background.default",
              overflowX: "auto",
            }}
          >
            <Typography variant="mono" component="code" sx={{ whiteSpace: "pre-wrap" }}>
              {verifier.certificateFormat}
            </Typography>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" sx={{ color: "text.secondary" }}>
            Check a Certificate — matches the format above
          </Typography>

          <Box sx={{ mt: 1.5, display: "flex", gap: 1.5, alignItems: "flex-start" }}>
            <Box component="label" htmlFor={inputId} sx={visuallyHiddenSx}>
              Certificate to check
            </Box>
            <TextField
              id={inputId}
              fullWidth
              size="small"
              value={certificateValue}
              onChange={(event) => setCertificateValue(event.target.value)}
              slotProps={{ htmlInput: { sx: { fontFamily: monoFontFamily } } }}
            />
            <Box
              id={`verifier-verify-button-${problem.slug}`}
              component="button"
              type="button"
              disabled
              sx={disabledActionButtonSx}
            >
              Verify
            </Box>
          </Box>

          {verifier.exampleCertificate && (
            <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
              Pre-filled with the default solver&apos;s result above — replace it to check your own
              certificate.
            </Typography>
          )}

          {verifier.resultBanner && (
            <Box
              sx={{
                mt: 2,
                display: "flex",
                alignItems: "flex-start",
                gap: 1,
                p: 1.5,
                borderRadius: 1,
                color: verifier.resultBanner.valid ? "success.light" : "error.light",
                backgroundColor: verifier.resultBanner.valid
                  ? "rgba(74, 222, 128, 0.12)"
                  : "rgba(248, 113, 113, 0.12)",
                border: "1px solid",
                borderColor: verifier.resultBanner.valid
                  ? "rgba(74, 222, 128, 0.4)"
                  : "rgba(248, 113, 113, 0.4)",
              }}
            >
              {verifier.resultBanner.valid ? (
                <CheckCircleIcon fontSize="small" sx={{ mt: "2px" }} />
              ) : (
                <CancelIcon fontSize="small" sx={{ mt: "2px" }} />
              )}
              <Typography variant="body2" sx={{ color: "inherit" }}>
                <strong>{verifier.resultBanner.headline}</strong> — {verifier.resultBanner.detail}
              </Typography>
            </Box>
          )}

          {verifier.properties && verifier.properties.length > 0 && (
            <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
              {verifier.properties.map((property) => (
                <Chip key={property} size="small" variant="outlined" label={property} />
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    </SectionShell>
  );
}

const monoFontFamily = '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace';

const disabledActionButtonSx = {
  flexShrink: 0,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 999,
  px: 2,
  py: 1,
  color: "text.disabled",
  backgroundColor: "transparent",
  font: "inherit",
  fontWeight: 600,
  cursor: "not-allowed",
};

// Standard visually-hidden clip pattern (same as components/SearchBar.js) --
// the label needs to exist for screen readers without displacing the
// visible input.
const visuallyHiddenSx = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};
