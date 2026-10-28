// components/workbench/CommandBar.js
//
// #303 (Board G): the task bar under the picture and its steps. From the left: the Solve /
// Reduce / Verify tabs, then the menus for the task on now, then its main button:
//   - Solve: the Algorithm dropdown with its (i) on its right, then, for a randomized solver
//     only, the Seed box (#295), then Solve;
//   - Reduce: the Reduce to and Reduction dropdowns, then Reduce (stage 2 of #303 turns this
//     into the Reduce, Solve, Verify stepper);
//   - Verify: the Verify box (./panels/VerifyBox.js), which has its own Check button.
// The run's status (the note on what the button will do, the run's ComputeStatus) shows under
// the row. The results list follows the bar (Workbench.js).
//
// Replaces #229's command bar above the picture. The instance moved to its own always-visible
// editor at the top of the workspace (./panels/InstancePanel.js), so the bar no longer shows it.
//
// The tabs are pressed toggle buttons in a labelled group, as the mockup has them, not an ARIA
// tablist: the bar's controls change with the task, but the picture, the steps and the results
// above and below it are shared, so there is no one tab panel to point at.
//
// #295: the Seed box takes digits only: blank lets Redux pick a new seed each Run, a number
// repeats that run exactly. Workbench.js decides when it shows and what Run sends.

import Box from "@mui/material/Box";
import { visuallyHiddenSx } from "../pictures/pictureSx";
import { controlLabelSx, PHONE_MEDIA } from "./layout";
import TaggedSelect from "./TaggedSelect";

const TASKS = [
  { key: "solve", label: "Solve" },
  { key: "reduce", label: "Reduce" },
  { key: "verify", label: "Verify" },
];

/** A dropdown's width in the bar: grows to fill the row, up to the mockup's 460px. */
const fieldSx = { flex: "1 1 260px", minWidth: 0, maxWidth: 460 };

/**
 * The Seed box (#295): a label above a digits-only text input.
 * @param {{id: string, value: string, onChange: (text: string) => void, invalid?: boolean}} props
 */
export function SeedInput({ id, value, onChange, invalid }) {
  const hintId = `${id}-hint`;
  return (
    <Box
      id={`${id}-field`}
      sx={{ display: "flex", flexDirection: "column", gap: 0.5, width: 132, flex: "none" }}
    >
      <Box component="label" htmlFor={id} sx={controlLabelSx}>
        Seed
      </Box>
      <Box
        component="input"
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        placeholder="Random"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        aria-describedby={hintId}
        aria-invalid={invalid || undefined}
        sx={{
          width: "100%",
          minHeight: 44,
          boxSizing: "border-box",
          px: 1.25,
          backgroundColor: "surface.input",
          color: "text.primary",
          border: "1px solid",
          borderColor: invalid ? "status.err" : "border.main",
          borderRadius: "8px",
          fontFamily: "inherit",
          fontSize: "0.9375rem",
          fontVariantNumeric: "tabular-nums",
          "&::placeholder": { color: "text.secondary", opacity: 1 },
        }}
      />
      <Box component="span" id={hintId} sx={visuallyHiddenSx}>
        Leave blank for a new random run; a number repeats that run exactly.
      </Box>
    </Box>
  );
}

function TaskButton({ id, pressed, onClick, children }) {
  return (
    <Box
      id={id}
      component="button"
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      sx={{
        minHeight: 44,
        px: 2,
        borderRadius: "8px",
        border: "1px solid",
        borderColor: pressed ? "brand.softLine" : "transparent",
        backgroundColor: pressed ? "brand.soft" : "transparent",
        color: pressed ? "brand.onSoft" : "text.primary",
        fontFamily: "inherit",
        fontSize: "0.9375rem",
        fontWeight: 700,
        cursor: "pointer",
        "&:hover": { backgroundColor: pressed ? "brand.softHover" : "surface.raised2" },
        [PHONE_MEDIA]: { flex: "1 1 0", px: 1 },
      }}
    >
      {children}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {"solve"|"reduce"|"verify"} props.task The tab on now.
 * @param {(task: "solve"|"reduce"|"verify") => void} props.onTaskChange
 * @param {{value: string, options: {value: string, label: string, tags: Array, card: Object}[],
 *   onChange: Function}|null} props.solver The Algorithm dropdown (options as TaggedSelect
 *   takes them), or null when the problem declares no solver.
 * @param {{value: string, options: Array, onChange: Function}|null} props.target The Reduce
 *   to dropdown, or null when the problem has no reductions.
 * @param {{value: string, options: Array, onChange: Function}|null} props.reduction The
 *   Reduction dropdown.
 * @param {{value: string, onChange: (text: string) => void, invalid: boolean}|null} props.seed
 *   The Seed box (#295), Solve only, or null to hide it (a solver that isn't randomized).
 * @param {string} props.runLabel "Solve", "Reduce again", ...
 * @param {boolean} props.runDisabled
 * @param {() => void} props.onRun
 * @param {import("react").ReactNode} props.verify The Verify box, shown in Verify.
 * @param {import("react").ReactNode} props.status Rendered under the row: a note on what the
 *   button will do (or why it can't) and the run's ComputeStatus.
 */
export default function CommandBar({
  idPrefix,
  task,
  onTaskChange,
  solver,
  target,
  reduction,
  seed,
  runLabel,
  runDisabled,
  onRun,
  verify,
  status,
}) {
  return (
    <Box
      component="section"
      aria-label="Task"
      id={`${idPrefix}-command-bar`}
      data-task={task}
      sx={{
        borderTop: "1px solid",
        borderColor: "border.soft",
        pt: "22px",
        display: "flex",
        flexDirection: "column",
        gap: 1.75,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: "14px 16px",
        }}
      >
        <Box
          role="group"
          aria-label="Task"
          id={`${idPrefix}-tasks`}
          sx={{
            display: "flex",
            gap: 0.5,
            p: 0.5,
            borderRadius: "12px",
            backgroundColor: "surface.raised",
            flex: "none",
            [PHONE_MEDIA]: { flex: "1 1 100%" },
          }}
        >
          {TASKS.map(({ key, label }) => (
            <TaskButton
              key={key}
              id={`${idPrefix}-mode-${key}`}
              pressed={task === key}
              onClick={() => onTaskChange(key)}
            >
              {label}
            </TaskButton>
          ))}
        </Box>

        {task === "solve" && solver && (
          <TaggedSelect
            id={`${idPrefix}-solver`}
            label="Algorithm"
            hue="blue"
            infoPlacement="box"
            boxSx={fieldSx}
            {...solver}
          />
        )}
        {task === "solve" && seed && <SeedInput id={`${idPrefix}-seed`} {...seed} />}

        {task === "reduce" && target && reduction && (
          <>
            <TaggedSelect
              id={`${idPrefix}-target`}
              label="Reduce to"
              hue="violet"
              infoPlacement="box"
              boxSx={{ ...fieldSx, flexBasis: 220 }}
              {...target}
            />
            <TaggedSelect
              id={`${idPrefix}-reduction`}
              label="Reduction"
              hue="violet"
              infoPlacement="box"
              boxSx={{ ...fieldSx, flexBasis: 320 }}
              {...reduction}
            />
          </>
        )}

        {task !== "verify" && (
          <Box
            id={`${idPrefix}-run`}
            component="button"
            type="button"
            onClick={onRun}
            disabled={runDisabled}
            sx={{
              flex: "none",
              minHeight: 44,
              px: "26px",
              border: "1px solid",
              borderColor: "brand.softLine",
              borderRadius: "10px",
              backgroundColor: "brand.soft",
              color: "brand.onSoft",
              fontFamily: "inherit",
              fontSize: "0.9375rem",
              fontWeight: 700,
              cursor: "pointer",
              "&:hover:not(:disabled)": { backgroundColor: "brand.softHover" },
              "&:disabled": {
                cursor: "not-allowed",
                borderColor: "border.main",
                borderStyle: "dashed",
                backgroundColor: "surface.track",
                color: "text.secondary",
              },
              [PHONE_MEDIA]: { flex: "1 1 100%" },
            }}
          >
            {runLabel}
          </Box>
        )}
      </Box>

      {task === "verify" && verify}
      {status}
    </Box>
  );
}
