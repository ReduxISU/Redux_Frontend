// components/workbench/panels/ResultPanel.js
//
// #229: the Result & Verify panel. #303 (Board G) listed the results under the task bar, and
// stage 4 tidies them into Board G's one list of rows, in Solve, Reduce and Verify alike: each
// row a tone (ok, err, warn or info), an icon, a plain-language sentence and, where it helps, a
// monospace field with the text worth copying (an answer, the target instance) and an action
// button at the far right ("Check it in Verify"). Reduce's rows carry the stage they belong to
// (Reduce, Solve or Verify) as a tag, in the stepper's order. Workbench.js decides the rows;
// this file only draws them, so each fact is said once:
//   - Solve: the solver's answer, with the round trip it took and Check it in Verify; a
//     randomized solver's seed (#295, ReduxISU/Redux#932), as text to paste into the Seed box.
//   - Reduce: what the build made (with the target instance), the Solve stage's answer and the
//     answer mapped back, then Verify's two checks and whether they agree.
//   - Verify: the check's verdict.
// Time is the round trip this browser measured, network included, and is labelled that way:
// Redux reports no running time of its own for a solve (#95).
//
// Gadgets (Reduce mode, #229 stage 4, ./GadgetsSection.js) follow the rows: what the reduction
// built for each piece of the source, hidden when it lists none.

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { MONO_FONT, PHONE_MEDIA, secondaryButtonSx } from "../layout";
import GadgetsSection from "./GadgetsSection";

/**
 * The seed a randomized solver's run reported (#295). The number is plain text a user can select
 * and paste into the Seed box, which repeats the run exactly.
 * @param {{id: string, seed: number}} props The number's own id is `${id}-value`.
 */
export function SeedText({ id, seed }) {
  return (
    <Box component="span" id={id}>
      Seed{" "}
      <Box component="span" id={`${id}-value`} sx={{ fontFamily: MONO_FONT, userSelect: "all" }}>
        {seed}
      </Box>{" "}
      made this run. Type it in the Seed box to repeat the same steps.
    </Box>
  );
}

const TONES = {
  ok: { borderColor: "status.ok", backgroundColor: "status.okBg", icon: "status.okText" },
  err: { borderColor: "status.err", backgroundColor: "status.errBg", icon: "status.errText" },
  warn: { borderColor: "status.warn", backgroundColor: "status.warnBg", icon: "status.warnText" },
  info: { borderColor: "border.main", backgroundColor: "surface.raised", icon: "text.primary" },
};

const codeSx = {
  display: "block",
  fontFamily: MONO_FONT,
  fontSize: "0.875rem",
  px: 1.25,
  py: 0.75,
  mt: 0.75,
  borderRadius: "8px",
  backgroundColor: "surface.input",
  color: "text.primary",
  border: "1px solid",
  borderColor: "border.soft",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
  overflowY: "auto",
  userSelect: "text",
};

/**
 * @typedef {Object} ResultRow
 * @property {string} key
 * @property {string} [id] The row's id; `${listId}-${key}` when left out.
 * @property {string} [tag] Reduce's stage: "Reduce", "Solve" or "Verify".
 * @property {"ok"|"err"|"warn"|"info"} tone
 * @property {string} icon One character, drawn in the tone's color and hidden from readers.
 * @property {import("react").ReactNode} text
 * @property {{id: string, text: string, maxHeight?: number}} [code] Text worth copying, in a
 *   monospace field under the sentence.
 * @property {{id: string, label: string, disabled?: boolean, onClick: () => void}} [action]
 */

/**
 * Board G's results: one row each.
 * @param {{id: string, rows: ResultRow[]}} props
 */
export function ResultRows({ id, rows }) {
  if (rows.length === 0) return null;
  return (
    <Box
      component="ul"
      id={id}
      sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}
    >
      {rows.map((row) => {
        const tone = TONES[row.tone] ?? TONES.info;
        return (
          <Box
            component="li"
            key={row.key}
            id={row.id ?? `${id}-${row.key}`}
            data-stage={row.tag ? row.tag.toLowerCase() : undefined}
            data-tone={row.tone}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "8px 12px",
              minWidth: 0,
              px: 1.5,
              py: 1,
              borderRadius: "10px",
              border: "1px solid",
              borderColor: tone.borderColor,
              backgroundColor: tone.backgroundColor,
              color: "text.primary",
              fontSize: "0.875rem",
              [PHONE_MEDIA]: { flexWrap: "wrap" },
            }}
          >
            {row.tag && (
              <Box
                component="span"
                data-tag
                sx={{
                  width: 52,
                  flex: "none",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "text.secondary",
                }}
              >
                {row.tag}
              </Box>
            )}
            <Box
              component="span"
              aria-hidden="true"
              sx={{
                width: 20,
                flex: "none",
                textAlign: "center",
                fontWeight: 700,
                color: tone.icon,
              }}
            >
              {row.icon}
            </Box>
            <Box
              component="div"
              data-row-text
              sx={{ flex: "1 1 240px", minWidth: 0, overflowWrap: "anywhere" }}
            >
              {row.text}
              {row.code && (
                <Box
                  component="code"
                  id={row.code.id}
                  sx={{ ...codeSx, maxHeight: row.code.maxHeight ?? "none" }}
                >
                  {row.code.text}
                </Box>
              )}
            </Box>
            {row.action && (
              <Box
                id={row.action.id}
                component="button"
                type="button"
                disabled={Boolean(row.action.disabled)}
                onClick={row.action.onClick}
                sx={{ ...secondaryButtonSx, ml: "auto", flex: "none", minHeight: 44 }}
              >
                {row.action.label}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here; the list is
 *   `${idPrefix}-rows`.
 * @param {ResultRow[]} props.rows
 * @param {string} [props.empty] What shows when there are no rows ("No run yet: ...").
 * @param {Object|null} [props.gadgets] The Gadgets section (Reduce mode): `{runId, gadgets,
 *   sourceFrame, targetFrame, namers?, colors?, activeIndex, onHighlight}`, everything
 *   ./GadgetsSection.js takes except its idPrefix. `runId` remounts the section per run, so a
 *   new run starts it closed.
 */
export default function ResultPanel({ idPrefix, rows, empty = "", gadgets = null }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}>
      <ResultRows id={`${idPrefix}-rows`} rows={rows} />
      {rows.length === 0 && empty && (
        <Typography id={`${idPrefix}-empty`} sx={{ fontSize: "0.875rem", color: "text.secondary" }}>
          {empty}
        </Typography>
      )}
      {gadgets && (
        <GadgetsSection
          key={gadgets.runId}
          idPrefix={`${idPrefix}-gadgets`}
          gadgets={gadgets.gadgets}
          sourceFrame={gadgets.sourceFrame}
          targetFrame={gadgets.targetFrame}
          namers={gadgets.namers ?? null}
          colors={gadgets.colors ?? null}
          activeIndex={gadgets.activeIndex}
          onHighlight={gadgets.onHighlight}
          controlsRef={gadgets.controlsRef}
        />
      )}
    </Box>
  );
}
