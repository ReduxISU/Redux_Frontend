// components/workbench/panels/VerifyBox.js
//
// #229 stage 3 built the Verify box: the verifier's name, the certificate format the backend
// declares, the certificate box and Check. #303 stage 4 (Board G) takes it apart into the task
// bar's pieces (./CommandBar.js lays them out):
//   - CertificateField: the certificate box with its label, the format as a hint under it (its
//     example as the placeholder), and the error of a certificate Redux cannot read;
//   - VerifyTaskRow: the Verify tab's row under the menus, the field and, after a Solve, "Use the
//     solver's answer" (#303: hidden once the field holds that answer, when it could change
//     nothing); the Verifier menu and the main Check button sit on the row above;
//   - ReduceVerifySide: one of the two checks of Reduce's Verify stage, a Verifier menu, the
//     answer to check (prefilled from the Solve stage) and its own Check button, which says
//     "Checked" and is inactive while its verdict is of the answer, verifier and instance shown.
// The verdicts are result rows (Workbench.js), not drawn here.
//
// A certificate Redux cannot read (400 certificate_parse_error) shows its error right under its
// box, and nothing else: there is no verdict to show.

import Box from "@mui/material/Box";
import { COMPUTE_FAILED } from "../../../hooks/useComputeRequest";
import DoneButton from "../DoneButton";
import { controlLabelSx, MONO_FONT, secondaryButtonSx } from "../layout";
import TaggedSelect from "../TaggedSelect";

// "... Example: x" or "... - e.g. x" (an em dash or a hyphen), at the end of the format.
const EXAMPLE = /(?:\bExample:|\s[—-]\s*e\.g\.)\s*(.+?)\s*$/s;

/**
 * #279: the placeholder is Redux's own example, so it is text Redux can read. Most certificate
 * formats end in "Example: ...", a few (N-Queens, Max Cut, Min Cut, Minimum s-t Cut) in
 * "- e.g. ..."; a format with neither gives the verifier's own example certificate, if any.
 * An example written as the end of a sentence keeps its full stop out of the field.
 */
export function exampleFrom(format, fallback = "") {
  const match = EXAMPLE.exec(format ?? "");
  if (match) return match[1].replace(/\.$/, "").trim();
  return (fallback ?? "").trim();
}

/** The failure of a check whose certificate Redux could not read, or null. */
export function unreadableFailure(request) {
  return request.status === COMPUTE_FAILED && request.failure?.code === "certificate_parse_error"
    ? request.failure
    : null;
}

/**
 * The certificate box: its label, the box, the verifier's format under it, and the error of a
 * certificate Redux could not read.
 * @param {{id: string, label: string, value: string, onChange: (text: string) => void,
 *   verifier: Object|null, unreadable: Object|null, sx?: Object}} props The hint's id is
 *   `${id}-hint`, the error's `${id}-error`.
 */
export function CertificateField({ id, label, value, onChange, verifier, unreadable, sx }) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  // Some formats already start with "Format:"; the hint says it once.
  const format = (verifier?.certificateFormat ?? "").replace(/^\s*Format:\s*/i, "");
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0, ...sx }}>
      <Box component="label" htmlFor={id} sx={{ ...controlLabelSx, fontWeight: 600 }}>
        {label}
      </Box>
      <Box
        id={id}
        component="input"
        type="text"
        value={value}
        placeholder={exampleFrom(format, verifier?.exampleCertificate)}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={unreadable ? "true" : undefined}
        aria-describedby={unreadable ? `${errorId} ${hintId}` : hintId}
        sx={{
          width: "100%",
          minHeight: 44,
          boxSizing: "border-box",
          backgroundColor: "surface.input",
          color: "text.primary",
          border: "1px solid",
          borderColor: unreadable ? "status.err" : "border.main",
          borderRadius: "10px",
          px: 1.5,
          fontFamily: MONO_FONT,
          fontSize: "0.875rem",
          "&::placeholder": { color: "text.secondary", opacity: 1 },
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
        component="p"
        id={hintId}
        sx={{
          m: 0,
          fontSize: "0.8125rem",
          color: "text.secondary",
          overflowWrap: "anywhere",
        }}
      >
        {format ? `Format: ${format}` : "The verifier doesn't declare its certificate format yet."}
      </Box>
    </Box>
  );
}

/**
 * The Verify tab's row under the menus: the answer to check and, after a Solve, Use the
 * solver's answer.
 * @param {{idPrefix: string, field: Object, useAnswer: (() => void)|null}} props `field` is
 *   everything CertificateField takes but its id (`${idPrefix}-certificate`).
 */
export function VerifyTaskRow({ idPrefix, field, useAnswer }) {
  return (
    <Box
      id={`${idPrefix}-row`}
      sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "10px 12px" }}
    >
      <CertificateField id={`${idPrefix}-certificate`} {...field} sx={{ flex: "1 1 360px" }} />
      {useAnswer && (
        <Box
          id={`${idPrefix}-use-answer`}
          component="button"
          type="button"
          onClick={useAnswer}
          sx={{ ...secondaryButtonSx, flex: "none", mt: "22px" }}
        >
          {"Use the solver's answer"}
        </Box>
      )}
    </Box>
  );
}

/**
 * One check of Reduce's Verify stage: its Verifier menu (or why there is none), the answer it
 * checks and Check.
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id: the menu is `${idPrefix}-verifier`, the
 *   box `${idPrefix}-certificate`, the button `${idPrefix}-check`.
 * @param {Object|null} props.select The Verifier menu, as TaggedSelect takes it, or null.
 * @param {string} props.noVerifier What shows instead of the menu when there is no verifier.
 * @param {Object} props.field CertificateField's props, but its id.
 * @param {() => void} props.onCheck
 * @param {boolean} props.checkDisabled
 * @param {{label: string, hint: string}|null} [props.checkDone] #303: this answer is checked
 *   with this verifier against this instance, so Check says "Checked" and is inactive
 *   (../DoneButton.js) until one of them changes.
 * @param {import("react").ReactNode} [props.extra] Under the box (the target's Map an answer
 *   across).
 */
export function ReduceVerifySide({
  idPrefix,
  select,
  noVerifier,
  field,
  onCheck,
  checkDisabled,
  checkDone = null,
  extra = null,
}) {
  return (
    <Box
      id={idPrefix}
      sx={{
        flex: "1 1 280px",
        minWidth: 0,
        maxWidth: 460,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
      }}
    >
      {select ? (
        <TaggedSelect
          id={`${idPrefix}-verifier`}
          hue="green"
          infoPlacement="box"
          boxSx={{ width: "100%" }}
          {...select}
        />
      ) : (
        <Box id={`${idPrefix}-no-verifier`} sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
          {noVerifier}
        </Box>
      )}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, minWidth: 0 }}>
        <CertificateField id={`${idPrefix}-certificate`} {...field} sx={{ flex: "1 1 auto" }} />
        <DoneButton
          id={`${idPrefix}-check`}
          onClick={onCheck}
          disabled={checkDisabled}
          done={checkDone}
          sx={{ ...secondaryButtonSx, flex: "none", mt: "22px" }}
        >
          Check
        </DoneButton>
      </Box>
      {extra}
    </Box>
  );
}
