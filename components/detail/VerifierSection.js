// components/detail/VerifierSection.js
//
// T16d (#24) — the Verifier section of a Problem Detail page: the
// certificate format a solution takes, plus a "check a certificate" demo.
//
// T37 (#95): Verify is live. It calls `requestVerifiedInstance()` with the
// verifier's class name, the shared instance and whatever certificate is in
// the box, and renders the real verdict in the result banner. Before this
// task the button was genuinely `disabled` (and so out of the tab order)
// per ground rule 5; this is the task that lifts that.
//
// Two things worth knowing about the verdict:
//
//   - The API answers with a bare "True" or "False" string. Anything else
//     is shown as-is in a neutral banner rather than being forced into a
//     pass or a fail, because guessing what an unrecognised answer meant is
//     exactly the kind of quiet wrong claim this page must not make.
//   - The pass/fail indication is never colour alone (T16d/#24). An icon
//     and the wording carry it; colour sits on top of that, not instead.
//
// The local certificate validator that used to sit in front of this
// request is gone. See lib/redux/index.js's `requestVerifiedInstance` for
// the decision and the evidence behind it: the Redux API returns a far
// better error for a malformed certificate than that regex ever produced,
// and it does so for all 50 problems rather than two.
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
// See that file's header for the full decision.
//
// --- Decision: where the certificate box pre-fills from (T37/#95) --------
// It keeps pre-filling from the problem's own declared example
// (`verifierInfo.certificate`), and a live Run result never overwrites it.
// Recorded on #95.

import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import {
  COMPUTE_CANCELLED,
  COMPUTE_DONE,
  COMPUTE_FAILED,
  COMPUTE_RUNNING,
  useComputeRequest,
} from "../../hooks/useComputeRequest";
import { REDUX_API_BASE_URL, requestVerifiedInstance } from "../../lib/redux";
import ComputeStatus from "./ComputeStatus";
import SectionShell from "./SectionShell";

const CERTIFICATE_INPUT_ID_PREFIX = "verifier-certificate-input";

// Distinct from SolversSection's own "solvers-instance-input" (ground rule
// 4): the two inputs share a value, never an id.
const INSTANCE_INPUT_ID = "verifier-instance-input";

/**
 * Reads the API's verdict. It answers `"True"` or `"False"` as a bare JSON
 * string today (checked against the live API on 2026-09-02). Anything else
 * comes back as `valid: null` so the banner can show it plainly instead of
 * rounding an unrecognised answer to a pass or a fail.
 */
function readVerdict(raw) {
  const text = typeof raw === "string" ? raw.trim() : JSON.stringify(raw);
  if (/^true$/i.test(text)) return { valid: true, text };
  if (/^false$/i.test(text)) return { valid: false, text };
  return { valid: null, text };
}

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
  const verifyIdPrefix = `verifier-verify-${problem.slug}`;

  const check = useComputeRequest({ subject: "certificate" });

  // Both are needed for the request to mean anything, so Verify stays
  // disabled (and out of the tab order) until both are present, rather than
  // being enabled into a state where it cannot succeed.
  const canVerify =
    Boolean(verifier?.className) && instanceValue.trim() !== "" && certificateValue.trim() !== "";

  const liveVerdict = check.status === COMPUTE_DONE ? readVerdict(check.result) : null;

  function handleVerify() {
    if (!canVerify) return;
    check.start((signal) =>
      requestVerifiedInstance(
        REDUX_API_BASE_URL,
        verifier.className,
        instanceValue,
        certificateValue,
        signal,
      ),
    );
  }

  let announcement = "";
  if (check.status === COMPUTE_RUNNING) {
    announcement = "Checking this certificate.";
  } else if (check.status === COMPUTE_DONE) {
    if (liveVerdict?.valid === true) {
      announcement = "Certificate accepted. It is valid for this instance.";
    } else if (liveVerdict?.valid === false) {
      announcement = "Certificate rejected. It is not valid for this instance.";
    } else {
      announcement = `Redux answered: ${liveVerdict?.text ?? ""}`;
    }
  } else if (check.status === COMPUTE_FAILED) {
    announcement = `The certificate was not checked. ${check.failure?.headline ?? ""}`;
  } else if (check.status === COMPUTE_CANCELLED) {
    announcement = "Check cancelled.";
  }

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
            <Button
              id={`verifier-verify-button-${problem.slug}`}
              type="button"
              variant="contained"
              disabled={!canVerify || check.isRunning}
              onClick={handleVerify}
              sx={verifyButtonSx}
            >
              Verify
            </Button>
          </Box>

          {!canVerify && (
            <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
              {verifier.className
                ? "Verify needs both a problem instance and a certificate. Fill in whichever box is empty."
                : "This verifier cannot be run: the catalog did not say which backend verifier it is."}
            </Typography>
          )}

          <Box sx={{ mt: 1.5 }}>
            <ComputeStatus
              idPrefix={verifyIdPrefix}
              status={check.status}
              announcement={announcement}
              failure={check.failure}
              onCancel={check.cancel}
              busyLabel="Checking this certificate"
            />
          </Box>

          {verifier.exampleCertificate && (
            <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
              Pre-filled with the example certificate this problem declares. Replace it to check
              your own, including one the Solvers section has just produced.
            </Typography>
          )}

          {/* The live verdict when there is one, otherwise the problem's
              own declared outcome for its pre-filled example. The declared
              path is kept rather than replaced (#95: do not remove the
              declared-data display path). */}
          {liveVerdict ? (
            <VerdictBanner
              id={`verifier-verdict-${problem.slug}`}
              valid={liveVerdict.valid}
              headline={
                liveVerdict.valid === true
                  ? "Valid certificate"
                  : liveVerdict.valid === false
                    ? "Not a valid certificate"
                    : "Redux answered something unexpected"
              }
              detail={
                liveVerdict.valid === true
                  ? "Redux checked this certificate against the instance above and accepted it."
                  : liveVerdict.valid === false
                    ? "Redux checked this certificate against the instance above and rejected it."
                    : `The verifier returned "${liveVerdict.text}", which is neither True nor False, so this page will not guess which it meant.`
              }
            />
          ) : (
            verifier.resultBanner && (
              <VerdictBanner
                id={`verifier-declared-result-${problem.slug}`}
                valid={verifier.resultBanner.valid}
                headline={verifier.resultBanner.headline}
                detail={verifier.resultBanner.detail}
              />
            )
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

// Keeps the pill shape the section has always had, now on a real MUI
// Button so a live control gets the focus ring, the hover state and the
// disabled semantics for free. It used to be a plain Box styled to look
// unavailable, which was right while it was inert and wrong now.
const verifyButtonSx = {
  flexShrink: 0,
  borderRadius: 999,
  px: 2,
  py: 1,
  fontWeight: 600,
  textTransform: "none",
};

/**
 * Pass/fail (or "cannot tell") shown as an icon plus wording, never colour
 * alone (T16d/#24). `valid` is `true`, `false`, or `null` for a verdict
 * this page cannot read as either.
 */
function VerdictBanner({ id, valid, headline, detail }) {
  const palette =
    valid === true
      ? {
          color: "success.light",
          background: "rgba(74, 222, 128, 0.12)",
          border: "rgba(74, 222, 128, 0.4)",
        }
      : valid === false
        ? {
            color: "error.light",
            background: "rgba(248, 113, 113, 0.12)",
            border: "rgba(248, 113, 113, 0.4)",
          }
        : {
            color: "text.primary",
            background: "rgba(148, 163, 184, 0.12)",
            border: "rgba(148, 163, 184, 0.4)",
          };

  const Icon = valid === true ? CheckCircleIcon : valid === false ? CancelIcon : InfoOutlinedIcon;

  return (
    <Box
      id={id}
      sx={{
        mt: 2,
        display: "flex",
        alignItems: "flex-start",
        gap: 1,
        p: 1.5,
        borderRadius: 1,
        color: palette.color,
        backgroundColor: palette.background,
        border: "1px solid",
        borderColor: palette.border,
      }}
    >
      <Icon fontSize="small" aria-hidden="true" sx={{ mt: "2px" }} />
      <Typography variant="body2" sx={{ color: "inherit" }}>
        <strong>{headline}</strong> {detail}
      </Typography>
    </Box>
  );
}

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
