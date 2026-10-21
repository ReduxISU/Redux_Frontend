// components/workbench/CommandBar.js
//
// #229: everything needed to run: the Solve | Reduce switch, the Solver dropdown or the To and
// Using dropdowns, and Run on the right. Instance errors and the run's own status show under it.
// The dropdowns are the tagged listboxes of stage 2 (./TaggedSelect.js), each with its tags and
// info card.
//
// #279 (board F): this is the top of the Workspace's Execute section, so it has no card of its
// own, and the instance line and its Edit button are gone: the Instance pane above the
// Workspace holds the instance, one editable line when collapsed. Stage 2 of #279 redesigns
// these controls; stage 1 only moved them.
//
// On phones and tablets (COMPACT_MEDIA) Run drops to its own line on the left. Nothing here is
// sticky: it scrolls with the page so the picture gets the screen.

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import Box from "@mui/material/Box";
import { COMPACT_MEDIA, DROPDOWN_WIDTH, SHARED_CONTROL_WIDTH } from "./layout";
import TaggedSelect from "./TaggedSelect";

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
 * @param {"solve"|"reduce"} props.mode
 * @param {(mode: "solve"|"reduce") => void} props.onModeChange
 * @param {{value: string, options: {value: string, label: string, tags: Array, card: Object}[],
 *   onChange: Function}|null} props.solver The Solver dropdown (options as TaggedSelect
 *   takes them), or null when the problem declares no solver.
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
  return (
    <Box
      id={`${idPrefix}-controls`}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        [COMPACT_MEDIA]: { gap: 1.5 },
      }}
    >
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
