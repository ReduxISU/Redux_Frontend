// components/workbench/CommandBar.js
//
// #229: everything needed to run: the Solve | Reduce switch, the dropdowns, and the run button.
// The dropdowns are the tagged listboxes of stage 2 (./TaggedSelect.js), each with its info card.
//
// #279 (board F): this is the top of the Workspace's Execute section, so it has no card of its
// own; the Instance pane above the Workspace holds the instance. Stage 2 of #279 made it one row,
// as the mockup has it:
//   - Solve mode: Mode | Solver | Solve | the run's chip;
//   - Reduce mode: Mode | Target | Reduction | Reduce | the build's chip. Reduce only builds the
//     target; each side's solver and Solve button are in the cells under this row
//     (./panels/ReduceCells.js).
// While the row's run is going, Cancel takes its button's place and the busy line (spinner, what
// is running, a clock) shows under the row; a run that didn't finish shows its failure box there,
// with Try again (./RunParts.js).
//
// Labels sit above their controls, and the row wraps; nothing here is sticky, so it scrolls with
// the page and the picture gets the screen.

import Box from "@mui/material/Box";
import { controlLabelSx, DROPDOWN_WIDTH } from "./layout";
import { BusyLine, RunControls, RunFailureBox } from "./RunParts";
import TaggedSelect from "./TaggedSelect";

function ModeButton({ id, pressed, onClick, accent, children }) {
  return (
    <Box
      id={id}
      component="button"
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      sx={{
        minHeight: 44,
        px: "14px",
        borderRadius: "8px",
        border: pressed ? "2px solid" : "1px solid",
        borderColor: pressed ? accent : "border.main",
        backgroundColor: pressed ? "surface.raised" : "transparent",
        color: "text.primary",
        fontFamily: "inherit",
        fontSize: "0.9375rem",
        fontWeight: 700,
        cursor: "pointer",
        "&:hover": { backgroundColor: "surface.raised" },
      }}
    >
      {children}
    </Box>
  );
}

// One dropdown's slot in the row: it grows to the shared dropdown width and shrinks to fit.
const selectSlotSx = { flex: `0 1 ${DROPDOWN_WIDTH}px`, minWidth: 200, maxWidth: "100%" };

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {"solve"|"reduce"} props.mode
 * @param {(mode: "solve"|"reduce") => void} props.onModeChange
 * @param {{value: string, options: Array, onChange: Function}|null} props.solver The Solver
 *   dropdown (options as TaggedSelect takes them), or null when the problem declares no solver.
 * @param {{value: string, options: Array, onChange: Function}|null} props.target The Target
 *   dropdown, or null when the problem has no reductions.
 * @param {{value: string, options: Array, onChange: Function}|null} props.reduction The
 *   Reduction dropdown.
 * @param {Object} props.run The row's run, as ./RunParts.js RunControls takes it (`id` is
 *   `${idPrefix}-run`), plus `busy` ({text, startedAt} while it runs) and `failure` and
 *   `onRetry` for its failure box.
 * @param {import("react").ReactNode} props.status Under the row: the instance error and a note
 *   on what the button does (or why it can't run).
 * @param {import("react").ReactNode} props.children The run's result, under everything else.
 */
export default function CommandBar({
  idPrefix,
  mode,
  onModeChange,
  solver,
  target,
  reduction,
  run,
  status,
  children,
}) {
  return (
    <Box
      id={`${idPrefix}-controls`}
      sx={{ display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: "12px 16px",
          minWidth: 0,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, flex: "none" }}>
          <Box id={`${idPrefix}-mode-label`} sx={controlLabelSx}>
            Mode
          </Box>
          <Box
            role="group"
            aria-labelledby={`${idPrefix}-mode-label`}
            sx={{ display: "flex", gap: 0.75 }}
          >
            <ModeButton
              id={`${idPrefix}-mode-solve`}
              pressed={mode === "solve"}
              onClick={() => onModeChange("solve")}
              accent="brand.line"
            >
              Solve
            </ModeButton>
            <ModeButton
              id={`${idPrefix}-mode-reduce`}
              pressed={mode === "reduce"}
              onClick={() => onModeChange("reduce")}
              accent="brand.goldLine"
            >
              Reduce
            </ModeButton>
          </Box>
        </Box>

        {mode === "solve" && solver && (
          <Box sx={selectSlotSx}>
            <TaggedSelect
              id={`${idPrefix}-solver`}
              label="Solver"
              hue="blue"
              boxSx={{ width: "100%" }}
              {...solver}
            />
          </Box>
        )}

        {mode === "reduce" && target && reduction && (
          <>
            <Box sx={{ ...selectSlotSx, flexBasis: 240 }}>
              <TaggedSelect
                id={`${idPrefix}-target`}
                label="Target"
                hue="violet"
                boxSx={{ width: "100%" }}
                {...target}
              />
            </Box>
            <Box sx={selectSlotSx}>
              <TaggedSelect
                id={`${idPrefix}-reduction`}
                label="Reduction"
                hue="violet"
                boxSx={{ width: "100%" }}
                {...reduction}
              />
            </Box>
          </>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
          <RunControls
            id={`${idPrefix}-run`}
            label={run.label}
            onRun={run.onRun}
            disabled={run.disabled}
            hint={run.hint}
            running={run.running}
            onCancel={run.onCancel}
            chip={run.chip}
          />
        </Box>
      </Box>

      {run.busy && (
        <BusyLine id={`${idPrefix}-run-busy`} text={run.busy.text} startedAt={run.busy.startedAt} />
      )}
      <RunFailureBox id={`${idPrefix}-run-failure`} failure={run.failure} onRetry={run.onRetry} />
      {status}
      {children}
    </Box>
  );
}
