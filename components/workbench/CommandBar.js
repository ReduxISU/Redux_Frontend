// components/workbench/CommandBar.js
//
// #303 (Board G): the task bar under the picture and its steps. From the left: the Solve /
// Reduce / Verify tabs, then the menus for the task on now, then its main button:
//   - Solve: the Algorithm dropdown with its (i) on its right, then, for a randomized solver
//     only, the Seed box (#295), then Solve;
//   - Reduce: the Reduce, Solve, Verify stepper (stage 2, below);
//   - Verify (#303 stage 4): the Verifier dropdown with its (i), then Check where Solve is in
//     Solve; the answer to check, with its format, on the row under them
//     (./panels/VerifyBox.js VerifyTaskRow).
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
// #303 stage 2: Reduce is a Reduce -> Solve -> Verify stepper (StageList, below), on its own row
// under the menus with the main button at its right. The menus are the stage's only:
//   - Reduce: Reduce to and Reduction, and Reduce (Reduced once built, see below);
//   - Solve: the target's Algorithm (its (i) on its right), the Seed box right of it for a
//     randomized solver, and Solve through <target>, which solves the TARGET instance;
//   - Verify (#303 stage 4): two checks side by side, the target's answer with a target verifier
//     and the answer mapped back with one of this problem's (./panels/VerifyBox.js
//     ReduceVerifySide), each with its own Check, and Check both as the main button.
// A stage later in the flow stays disabled until the one before it is done; Workbench.js says
// which stage is shown, which are done, and which can be reached.
//
// #303: a main button whose run is done, so pressing it again can't change the result, says
// what is done ("Solved", "Reduced", "Checked") and is inactive (aria-disabled, ./DoneButton.js)
// until the instance or another input of that run changes. Workbench.js decides when (runDone).
//
// #295: the Seed box takes digits only: blank lets Redux pick a new seed each Run, a number
// repeats that run exactly. Workbench.js decides when it shows and what Run sends.

import Box from "@mui/material/Box";
import { visuallyHiddenSx } from "../pictures/pictureSx";
import DoneButton, { inactiveSx } from "./DoneButton";
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

/** What a stage's mark and accessible name say about it. */
const STAGE_WORDS = {
  done: "done",
  current: "next",
  todo: "not yet",
};

/**
 * #303 stage 2: Reduce's stepper. Each stage is a button that shows its menus; a stage that
 * can't be reached yet is disabled. The one shown has aria-current="step".
 * @param {{idPrefix: string, stages: Array<{key: string, label: string, state: "done"|"current"|
 *   "todo", reachable: boolean}>, shown: string, onPick: (key: string) => void,
 *   busy: boolean}} props
 */
function StageList({ idPrefix, stages, shown, onPick, busy }) {
  return (
    <Box
      component="ol"
      id={`${idPrefix}-stages`}
      aria-label="Reduction stages"
      sx={{
        listStyle: "none",
        m: 0,
        p: 0,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "6px",
        minWidth: 0,
      }}
    >
      {stages.map((stage, index) => {
        const isShown = stage.key === shown;
        const can = stage.reachable && !busy;
        const done = stage.state === "done";
        return (
          <Box
            component="li"
            key={stage.key}
            sx={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            {index > 0 && (
              <Box
                component="span"
                aria-hidden="true"
                sx={{ display: "flex", color: "text.secondary" }}
              >
                <svg
                  width="18"
                  height="12"
                  viewBox="0 0 18 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 6h15M11 1l5 5-5 5" />
                </svg>
              </Box>
            )}
            <Box
              id={`${idPrefix}-stage-${stage.key}`}
              component="button"
              type="button"
              data-stage-state={stage.state}
              aria-current={isShown ? "step" : undefined}
              aria-label={`${stage.label}, ${STAGE_WORDS[stage.state]}${
                isShown ? ", showing its controls" : can ? ". Press to show its controls." : ""
              }`}
              disabled={!can}
              onClick={() => onPick(stage.key)}
              sx={{
                minHeight: 44,
                pl: 0.75,
                pr: 1.75,
                display: "flex",
                alignItems: "center",
                gap: 1,
                borderRadius: "999px",
                fontFamily: "inherit",
                fontSize: "0.875rem",
                fontWeight: 700,
                cursor: "pointer",
                border: isShown ? "2px solid" : "1px solid",
                borderColor: isShown ? "brand.softLine" : done ? "status.ok" : "border.main",
                backgroundColor: isShown ? "brand.tint" : done ? "surface.main" : "transparent",
                color: isShown || done ? "text.primary" : "text.secondary",
                "&:hover:not(:disabled)": { backgroundColor: "surface.raised2" },
                "&:disabled": { cursor: "not-allowed" },
              }}
            >
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8125rem",
                  boxSizing: "border-box",
                  ...(done
                    ? {
                        backgroundColor: "status.okBg",
                        border: "2px solid",
                        borderColor: "status.ok",
                      }
                    : stage.state === "current"
                      ? {
                          backgroundColor: "brand.soft",
                          border: "2px solid",
                          borderColor: "brand.softLine",
                          color: "brand.onSoft",
                        }
                      : { border: "1px solid", borderColor: "border.main" }),
                }}
              >
                {done ? "✓" : index + 1}
              </Box>
              {stage.label}
            </Box>
          </Box>
        );
      })}
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
 * The main button: Solve, Reduce, Solve through <target>, ... #303: once its run is done and
 * pressing it again can't change the result, it says so ("Solved") and is aria-disabled
 * (./DoneButton.js); `done` is null while it can still change something.
 */
function RunButton({ id, label, disabled, done, onRun }) {
  return (
    <DoneButton
      id={id}
      done={done}
      disabled={disabled}
      onClick={onRun}
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
        '&:hover:not(:disabled):not([aria-disabled="true"])': {
          backgroundColor: "brand.softHover",
        },
        // #303: the mockup's disabled primary, the same look as a done button.
        "&:disabled": inactiveSx,
        [PHONE_MEDIA]: { flex: "1 1 100%" },
      }}
    >
      {label}
    </DoneButton>
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
 *   The Seed box (#295): Solve's, or Reduce's Solve stage's (#303 stage 2), or null to hide it
 *   (a solver that isn't randomized).
 * @param {{stages: Array, shown: "reduce"|"solve"|"verify", onPick: Function, busy: boolean,
 *   solver: {label: string, value: string, options: Array, onChange: Function}|null,
 *   noSolver: string, verify: import("react").ReactNode}|null} [props.stepper] #303 stage 2:
 *   Reduce's stepper (see StageList), the stage shown, the target's Algorithm dropdown for the
 *   Solve stage (null when the target declares none) and the Verify stage's two checks.
 * @param {{value: string, options: Array, onChange: Function}|null} [props.verifier] #303
 *   stage 4: the Verify tab's Verifier dropdown (a dropdown even with one verifier), or
 *   null when it declares none.
 * @param {string} props.runLabel "Solve", "Reduce", "Solve through Clique", "Check", ...
 * @param {boolean} props.runDisabled
 * @param {{label: string, hint: string}|null} [props.runDone] #303: the run is done and pressing
 *   the button again can't change the result: it shows `label` ("Solved", "Checked") and is
 *   aria-disabled, described by `hint`, until an input changes (./DoneButton.js).
 * @param {() => void} props.onRun
 * @param {import("react").ReactNode} props.verify The Verify tab's row under the menus.
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
  stepper = null,
  verifier = null,
  runLabel,
  runDisabled,
  runDone = null,
  onRun,
  verify,
  status,
}) {
  const reducing = task === "reduce" && stepper;
  const stage = reducing ? stepper.shown : null;
  const runButton = (
    <RunButton
      id={`${idPrefix}-run`}
      label={runLabel}
      disabled={runDisabled}
      done={runDone}
      onRun={onRun}
    />
  );
  return (
    <Box
      component="section"
      aria-label="Task"
      id={`${idPrefix}-command-bar`}
      data-task={task}
      data-stage={stage ?? undefined}
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

        {task === "reduce" && (stage === null || stage === "reduce") && target && reduction && (
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
        {stage === "solve" &&
          (stepper.solver ? (
            <TaggedSelect
              id={`${idPrefix}-target-solver`}
              hue="blue"
              infoPlacement="box"
              boxSx={fieldSx}
              {...stepper.solver}
            />
          ) : (
            <Box
              id={`${idPrefix}-target-solver-none`}
              sx={{ fontSize: "0.875rem", color: "text.secondary", pb: 1.25 }}
            >
              {stepper.noSolver}
            </Box>
          ))}
        {stage === "solve" && seed && <SeedInput id={`${idPrefix}-seed`} {...seed} />}
        {task === "verify" &&
          (verifier ? (
            <TaggedSelect
              id={`${idPrefix}-verifier`}
              label="Verifier"
              hue="green"
              infoPlacement="box"
              boxSx={fieldSx}
              {...verifier}
            />
          ) : (
            <Box
              id={`${idPrefix}-verifier-none`}
              sx={{ fontSize: "0.875rem", color: "text.secondary", pb: 1.25 }}
            >
              This problem declares no verifier yet.
            </Box>
          ))}

        {(task === "solve" || task === "verify") && runButton}
      </Box>

      {/* #303: Reduce's Verify stage holds two whole checks, so they get their own row under the
          tabs rather than stretching the tabs' row and pushing the tabs down. */}
      {stage === "verify" && stepper.verify}

      {reducing && (
        <Box
          id={`${idPrefix}-stage-row`}
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px 16px",
          }}
        >
          <StageList
            idPrefix={idPrefix}
            stages={stepper.stages}
            shown={stage}
            onPick={stepper.onPick}
            busy={stepper.busy}
          />
          {runButton}
        </Box>
      )}
      {task === "reduce" && !reducing && runButton}

      {task === "verify" && verify}
      {status}
    </Box>
  );
}
