// components/workbench/CommandBar.js
//
// #229: the bar above the picture with everything needed to run: the instance (with Edit,
// which opens the Instance panel), the Solve | Reduce switch, the Solver dropdown or the To
// and Using dropdowns, and Run on the right. Instance errors and the run's own status show
// under it.
//
// Stage 1 of #229 kept the instance simple on purpose: it shows as one line of text,
// truncated. Labeled pieces per part are stage 5. The dropdowns are the tagged listboxes of
// stage 2 (./TaggedSelect.js), each with its tags and info card.
//
// #295: for a randomized solver (ReduxISU/Redux#932), Solve mode has a Seed box between the
// Solver dropdown and Run: blank lets Redux pick a new seed each Run, a number repeats that run
// exactly. It takes digits only. Workbench.js decides when it shows and what Run sends.
//
// On phones and tablets (COMPACT_MEDIA) the bar is not sticky (it never is: it scrolls with
// the page so the picture gets the screen), and Edit and Run drop to their own lines on the
// left.

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Box from "@mui/material/Box";
import { visuallyHiddenSx } from "../pictures/pictureSx";
import {
  COMPACT_MEDIA,
  cardSx,
  controlLabelSx,
  DROPDOWN_WIDTH,
  MONO_FONT,
  SHARED_CONTROL_WIDTH,
  secondaryButtonSx,
} from "./layout";
import TaggedSelect from "./TaggedSelect";

/**
 * The Seed box (#295): a label and a digits-only text input.
 * @param {{id: string, value: string, onChange: (text: string) => void, invalid?: boolean}} props
 */
function SeedInput({ id, value, onChange, invalid }) {
  const hintId = `${id}-hint`;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: "none" }}>
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
          width: 128,
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

// Forces the next item onto its own line, only on phones and tablets.
function CompactLineBreak() {
  return (
    <Box
      aria-hidden="true"
      sx={{ display: "none", [COMPACT_MEDIA]: { display: "block", flexBasis: "100%", height: 0 } }}
    />
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
 * @param {{value: string, options: {value: string, label: string, tags: Array, card: Object}[],
 *   onChange: Function}|null} props.solver The Solver dropdown (options as TaggedSelect
 *   takes them), or null when the problem declares no solver.
 * @param {{value: string, options: Array, onChange: Function}|null} props.target The To
 *   dropdown, or null when the problem has no reductions.
 * @param {{value: string, options: Array, onChange: Function}|null} props.reduction The
 *   Using dropdown.
 * @param {{value: string, onChange: (text: string) => void, invalid: boolean}|null} props.seed
 *   The Seed box (#295), Solve mode only, or null to hide it (a solver that isn't randomized).
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
  seed,
  runLabel,
  runDisabled,
  onRun,
  runFill,
  status,
}) {
  const instanceLabelId = `${idPrefix}-instance-label`;

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

        {mode === "solve" && solver && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "6px 8px",
              minWidth: 0,
            }}
          >
            <TaggedSelect
              id={`${idPrefix}-solver`}
              label="Solver"
              hue="blue"
              labelPlacement="row"
              boxSx={{ width: DROPDOWN_WIDTH, maxWidth: "100%" }}
              {...solver}
            />
            {seed && <SeedInput id={`${idPrefix}-seed`} {...seed} />}
          </Box>
        )}

        {mode === "reduce" && target && reduction && (
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
            <TaggedSelect
              id={`${idPrefix}-target`}
              label="To"
              hue="violet"
              labelPlacement="row"
              {...target}
            />
            <TaggedSelect
              id={`${idPrefix}-reduction`}
              label="Using"
              hue="violet"
              labelPlacement="row"
              {...reduction}
            />
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
