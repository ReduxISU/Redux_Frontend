// components/workbench/DoneButton.js
//
// #303 (Board G): an action button that goes inactive once it is done. The rule: a control that
// is enabled but can't change the result is disabled; one that can (a randomized solver's next
// run, with the Seed box blank) stays enabled. So once a run, check or map has its result for
// exactly the inputs on screen, its button says what is done ("Solved", "Checked", "Reduced")
// and does nothing until one of those inputs changes; then it is its action again ("Solve").
// The caller derives `done` from "there is a current result for these inputs", the same test
// that keeps the result on screen, so the two never disagree.
//
// A done button is aria-disabled, not disabled: it stays in the tab order and says why it is
// inactive (its description, and a tooltip), and its clicks are dropped here. It takes the
// disabled look of the mockup's primary button: the raised grey, a 1px dashed strong line and
// the muted text (each pair checked by scripts/check-contrast.mjs). A button that can't run at
// all (nothing to check, a run in progress) is still plain `disabled`, as before.

import Box from "@mui/material/Box";
import { visuallyHiddenSx } from "../pictures/pictureSx";

/** The inactive look, for a done (aria-disabled) button and, on the main button, a disabled one. */
export const inactiveSx = {
  cursor: "not-allowed",
  borderStyle: "dashed",
  borderColor: "border.strong",
  backgroundColor: "surface.raised",
  color: "text.secondary",
};

/**
 * @param {Object} props
 * @param {string} props.id The button's id; its description is `${id}-done-hint`.
 * @param {import("react").ReactNode} props.children The action's label ("Solve", "Check").
 * @param {{label: string, hint: string}|null} [props.done] When set, the button shows `label`
 *   ("Solved"), is aria-disabled, and is described by `hint` (what to change to run again).
 * @param {boolean} [props.disabled] Can't run at all (not done): the plain disabled attribute.
 * @param {() => void} props.onClick
 * @param {string} [props.describedBy] Another description the button keeps (a hint under it).
 * @param {Object} [props.sx]
 */
export default function DoneButton({
  id,
  children,
  done = null,
  disabled = false,
  onClick,
  describedBy,
  sx,
}) {
  const hintId = `${id}-done-hint`;
  const describedByIds = [done ? hintId : null, describedBy].filter(Boolean).join(" ");
  return (
    <>
      <Box
        id={id}
        component="button"
        type="button"
        data-done={done ? "true" : undefined}
        aria-disabled={done ? "true" : undefined}
        aria-describedby={describedByIds || undefined}
        title={done ? `${done.label}. ${done.hint}` : undefined}
        disabled={!done && disabled}
        onClick={(event) => {
          if (done) {
            event.preventDefault();
            return;
          }
          onClick?.();
        }}
        sx={{
          ...sx,
          '&[aria-disabled="true"]': inactiveSx,
          '&[aria-disabled="true"]:hover': { backgroundColor: "surface.raised" },
        }}
      >
        {done ? done.label : children}
      </Box>
      {done && (
        <Box component="span" id={hintId} sx={visuallyHiddenSx}>
          {done.hint}
        </Box>
      )}
    </>
  );
}
