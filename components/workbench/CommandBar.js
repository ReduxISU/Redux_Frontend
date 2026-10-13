// components/workbench/CommandBar.js
//
// #229: the bar above the picture with everything needed to run: the instance (with Edit,
// which opens the Instance panel), the Solve | Reduce switch, the Solver dropdown or the To
// and Using dropdowns, and Run on the right. Instance errors and the run's own status show
// under it.
//
// Stage 1 of #229 keeps two things simple on purpose, both replaced by later stages:
//   - The instance shows as one line of text, truncated. Labeled pieces per part are stage 5.
//   - The dropdowns are MUI Selects. Stage 2 swaps them for tagged listboxes with info
//     cards; they already have their final widths (DROPDOWN_WIDTH) and layout.
//
// On phones and tablets (COMPACT_MEDIA) the bar is not sticky (it never is: it scrolls with
// the page so the picture gets the screen), and Edit and Run drop to their own lines on the
// left.

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import {
  COMPACT_MEDIA,
  cardSx,
  controlLabelSx,
  DROPDOWN_WIDTH,
  MONO_FONT,
  SHARED_CONTROL_WIDTH,
  secondaryButtonSx,
} from "./layout";

// Forces the next item onto its own line, only on phones and tablets.
function CompactLineBreak() {
  return (
    <Box
      aria-hidden="true"
      sx={{ display: "none", [COMPACT_MEDIA]: { display: "block", flexBasis: "100%", height: 0 } }}
    />
  );
}

const selectSx = {
  width: "100%",
  minHeight: 44,
  backgroundColor: "surface.input",
  borderRadius: "8px",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "border.main" },
  "& .MuiSelect-select": {
    py: "10px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};

/**
 * Everything one labelled dropdown needs. `labelId` ties the visible label to the Select's
 * combobox (MUI sets `aria-labelledby` from it and focuses the combobox on a label click);
 * the combobox itself gets `${id}-button`.
 */
function selectSpec({ id, label, value, options, onChange, disabled }) {
  return { labelId: `${id}-label`, label, id, value, options, onChange, disabled };
}

function SelectControl({ spec }) {
  return (
    <Select
      id={spec.id}
      labelId={spec.labelId}
      size="small"
      value={spec.value}
      onChange={(event) => spec.onChange(event.target.value)}
      disabled={spec.disabled}
      SelectDisplayProps={{ id: `${spec.id}-button` }}
      sx={selectSx}
      MenuProps={{ slotProps: { paper: { sx: { maxWidth: "min(460px, calc(100vw - 32px))" } } } }}
    >
      {spec.options.map((option) => (
        <MenuItem key={option.value} value={option.value} sx={{ minHeight: 44 }}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  );
}

function ControlLabel({ spec }) {
  return (
    <Box component="label" id={spec.labelId} sx={controlLabelSx}>
      {spec.label}
    </Box>
  );
}

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

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string} props.instance The instance text.
 * @param {boolean} props.instanceHasError Draws the instance box's border red.
 * @param {() => void} props.onEdit Opens the Instance panel.
 * @param {"solve"|"reduce"} props.mode
 * @param {(mode: "solve"|"reduce") => void} props.onModeChange
 * @param {{value: string, options: {value: string, label: string}[], onChange: Function}|null}
 *   props.solver The Solver dropdown, or null when the problem declares no solver.
 * @param {{value: string, options: Array, onChange: Function}|null} props.target The To
 *   dropdown, or null when the problem has no reductions.
 * @param {{value: string, options: Array, onChange: Function}|null} props.reduction The
 *   Using dropdown.
 * @param {string} props.runLabel "Run solve", "Run reduction again", ...
 * @param {boolean} props.runDisabled
 * @param {() => void} props.onRun
 * @param {string} props.runFill The Run button's fill (orange for Solve, gold for Reduce).
 * @param {import("react").ReactNode} props.status Rendered under the bar: the instance error,
 *   a note on what Run will do (or why it can't), and the run's ComputeStatus.
 */
export default function CommandBar({
  idPrefix,
  instance,
  instanceHasError,
  onEdit,
  mode,
  onModeChange,
  solver,
  target,
  reduction,
  runLabel,
  runDisabled,
  onRun,
  runFill,
  status,
}) {
  const instanceLabelId = `${idPrefix}-instance-label`;
  const solverSpec = solver
    ? selectSpec({ id: `${idPrefix}-solver`, label: "Solver", ...solver })
    : null;
  const targetSpec = target
    ? selectSpec({ id: `${idPrefix}-target`, label: "To", ...target })
    : null;
  const reductionSpec = reduction
    ? selectSpec({ id: `${idPrefix}-reduction`, label: "Using", ...reduction })
    : null;

  return (
    <Box
      component="section"
      aria-label="Run"
      id={`${idPrefix}-command-bar`}
      sx={{
        ...cardSx,
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        [COMPACT_MEDIA]: { gap: 1.5 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          [COMPACT_MEDIA]: { flexWrap: "wrap", rowGap: 1.5 },
        }}
      >
        <Box
          component="span"
          id={instanceLabelId}
          sx={{
            flex: "none",
            pt: 1.5,
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "text.secondary",
          }}
        >
          Instance
        </Box>
        <Box
          id={`${idPrefix}-instance-text`}
          role="group"
          aria-labelledby={instanceLabelId}
          title={instance}
          sx={{
            flex: "1 1 auto",
            minWidth: 0,
            minHeight: 44,
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            px: 1.5,
            borderRadius: "8px",
            backgroundColor: "surface.input",
            border: "1px solid",
            borderColor: instanceHasError ? "status.err" : "border.main",
          }}
        >
          <Box
            component="span"
            sx={{
              fontFamily: MONO_FONT,
              fontSize: "0.8125rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: instance ? "text.primary" : "text.secondary",
            }}
          >
            {instance || "No instance yet. Press Edit to write one."}
          </Box>
        </Box>
        <CompactLineBreak />
        <Box
          id={`${idPrefix}-edit-instance`}
          component="button"
          type="button"
          onClick={onEdit}
          sx={{
            ...secondaryButtonSx,
            width: SHARED_CONTROL_WIDTH,
            flex: "none",
            alignSelf: "stretch",
          }}
        >
          Edit
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "10px 12px",
          [COMPACT_MEDIA]: { rowGap: 1.5 },
        }}
      >
        <Box role="group" aria-label="Mode" sx={{ display: "flex", gap: 0.5, flex: "none" }}>
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

        {mode === "solve" && solverSpec && (
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 8px" }}>
            <ControlLabel spec={solverSpec} />
            <Box sx={{ width: DROPDOWN_WIDTH, maxWidth: "100%" }}>
              <SelectControl spec={solverSpec} />
            </Box>
          </Box>
        )}

        {mode === "reduce" && targetSpec && reductionSpec && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: `auto minmax(0, ${DROPDOWN_WIDTH}px)`,
              alignItems: "center",
              gap: 1,
              flex: "0 1 auto",
              minWidth: 0,
            }}
          >
            <ControlLabel spec={targetSpec} />
            <SelectControl spec={targetSpec} />
            <ControlLabel spec={reductionSpec} />
            <SelectControl spec={reductionSpec} />
          </Box>
        )}

        <CompactLineBreak />
        <Box
          id={`${idPrefix}-run`}
          component="button"
          type="button"
          onClick={onRun}
          disabled={runDisabled}
          sx={{
            width: SHARED_CONTROL_WIDTH,
            flex: "none",
            ml: "auto",
            minHeight: 44,
            px: 2,
            border: "none",
            borderRadius: "10px",
            backgroundColor: runFill,
            color: "brand.onFill",
            fontFamily: "inherit",
            fontSize: "0.9375rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.25,
            cursor: "pointer",
            "&:disabled": {
              cursor: "not-allowed",
              backgroundColor: "surface.track",
              color: "text.secondary",
            },
            [COMPACT_MEDIA]: { ml: 0 },
          }}
        >
          <PlayArrowIcon aria-hidden="true" sx={{ fontSize: 18 }} />
          {runLabel}
        </Box>
      </Box>

      {status}
    </Box>
  );
}
