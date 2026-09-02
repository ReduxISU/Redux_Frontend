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
//
// T35 (#93): this section now also shows the problem instance the
// certificate is being checked against. Verifying a certificate against a
// different instance than the one that was solved is a silent, meaningless
// error, so there is exactly one instance value on the page: it lives in
// components/ProblemDetailLayout.js and both this section and the Solvers
// section render their own input bound to it. Editing either updates both.
// See that file's header for the full decision. Verify stays disabled:
// turning it on is T37 (#95).

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

// Distinct from SolversSection's own "solvers-instance-input" (ground rule
// 4): the two inputs share a value, never an id.
const INSTANCE_INPUT_ID = "verifier-instance-input";

/**
 * @param {Object} props
 * @param {Object} props.problem A data/fixtures.js-shaped FixtureProblem.
 *   `problem.verifier` is `{ certificateDescription, certificateFormat,
 *   exampleCertificate?, resultBanner?: { valid, headline, detail },
 *   properties?: string[] } | null` -- only 3-SAT's fixture has every
 *   optional field populated; most problems have just the two required
 *   fields, and Closest Pair of Points has `verifier: null` entirely and
 *   deliberately (the fixture's own "incomplete problem" example).
 * @param {string} [props.instanceValue] The shared problem instance, owned
 *   by components/ProblemDetailLayout.js (T35/#93). Empty string when the
 *   problem declares no instance.
 * @param {(next: string) => void} [props.onInstanceChange] Called with the
 *   new text whenever the visitor edits the instance here. The Solvers
 *   section's input is bound to the same value, so an edit here shows up
 *   there too.
 * @param {{attributes: Object, listeners: Object}} [props.dragHandleProps]
 *   Forwarded straight through to SectionShell — see T18 (#27).
 */
export default function VerifierSection({
  problem,
  instanceValue = "",
  onInstanceChange,
  dragHandleProps,
}) {
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
            Check a Certificate
          </Typography>

          <Box component="label" htmlFor={INSTANCE_INPUT_ID} sx={{ display: "block", mt: 1.5 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.5 }}>
              Problem instance
            </Typography>
          </Box>
          <TextField
            id={INSTANCE_INPUT_ID}
            fullWidth
            multiline
            minRows={2}
            size="small"
            value={instanceValue}
            onChange={(event) => onInstanceChange?.(event.target.value)}
            placeholder="No default instance declared for this problem yet."
            slotProps={{ htmlInput: { sx: { fontFamily: monoFontFamily } } }}
          />
          <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
            This is the same instance the Solvers section shows. Editing it in either place changes
            both, so a certificate is always checked against the instance that was solved.
          </Typography>

          <Box
            sx={{
              mt: 1.5,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1.5,
              alignItems: { xs: "stretch", sm: "flex-start" },
            }}
          >
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
// visible input. Width/height/margin are unit strings, not bare numbers:
// MUI's `sx` reinterprets a bare number for a sizing prop as a percentage
// (`1` -> `100%`) and for a spacing prop as a multiple of the theme spacing
// unit (`-1` -> `-8px`) -- either one silently turns this into a full-size
// box that's clipped from view but still counted in the page's scrollable
// area (T33/#42 caught this as a real, if tiny, horizontal-overflow bug).
const visuallyHiddenSx = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};
