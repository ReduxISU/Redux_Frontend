// components/workbench/PaneToggles.js
//
// #279 (board F): the bar of toggles under the title that shows and hides the parts of the page:
// the Details, Instance, Visualization, Execute and Verify panes. Every toggle is the same size, wide enough for the longest name, with an icon and
// its name. Reset layout at the right shows everything again. Replaces #229's rail of panel
// buttons, where one panel opened at a time.
//
// The bar is not sticky; it scrolls with the page. On a phone (640px or less) the toggles sit
// two to a row.
//
// #279 (Workspace tweaks): the bar is a pane of its own, "Panes", in the same frame and with the
// same title as every other pane (layout.js paneFrameSx, paneTitleSx), its buttons starting at
// the panes' tab stop. It has no Show all / Show less: it is one row of buttons.
//
// Shown and hidden differ by more than color: a shown toggle has the pale orange tint and a
// solid border, a hidden one a dashed border with muted text.
//
// --- Decision: disclosure buttons, as #229's rail had ----------------------------------------
// Each toggle is a disclosure button (`aria-expanded` + `aria-controls` naming the pane or
// section it shows), since what it does is show or hide a region; a pressed state (board F's
// markup) would not tell a screen reader that a region appears or disappears. The regions stay
// on the page while hidden (the `hidden` attribute), so `aria-controls` always names something.
// The bar is a labelled group rather than a `nav` landmark: its buttons change this page, they
// do not navigate anywhere.

import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PlayArrowOutlinedIcon from "@mui/icons-material/PlayArrowOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import Box from "@mui/material/Box";
import { LAYOUT_KEYS } from "../../hooks/useWorkbenchLayout";
import { paneFrameSx, paneTitleSx, secondaryButtonSx, titleLineSx } from "./layout";

export const PANE_LABELS = {
  details: "Details",
  instance: "Instance",
  visualization: "Visualization",
  execute: "Execute",
  verify: "Verify",
};

const PANE_ICONS = {
  details: InfoOutlinedIcon,
  instance: EditOutlinedIcon,
  visualization: HubOutlinedIcon,
  execute: PlayArrowOutlinedIcon,
  verify: TaskAltOutlinedIcon,
};

const PHONE_MEDIA = "@media (max-width:640px)";

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {{[key: string]: boolean}} props.shown Whether each pane or section is shown.
 * @param {{[key: string]: string}} props.controls The id of the region each toggle shows.
 * @param {(key: string) => void} props.onToggle
 * @param {() => void} props.onReset
 * @param {{[key: string]: {label: string, color: string}|null}} [props.dots] An optional
 *   notification dot per key (`label` is read by screen readers).
 */
export default function PaneToggles({ idPrefix, shown, controls, onToggle, onReset, dots }) {
  const headingId = `${idPrefix}-toggles-heading`;
  return (
    <Box
      component="section"
      id={`${idPrefix}-toggles-pane`}
      aria-labelledby={headingId}
      sx={{ ...paneFrameSx, ...titleLineSx }}
    >
      <Box component="h2" id={headingId} sx={paneTitleSx}>
        Panes
      </Box>
      <Box
        role="group"
        aria-label="Panes on this page"
        id={`${idPrefix}-toggles`}
        sx={{
          flex: "1 1 320px",
          minWidth: 0,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1,
        }}
      >
        {LAYOUT_KEYS.map((key) => {
          const Icon = PANE_ICONS[key];
          const on = Boolean(shown[key]);
          const dot = dots?.[key] ?? null;
          return (
            <Box
              key={key}
              id={`${idPrefix}-toggle-${key}`}
              component="button"
              type="button"
              aria-expanded={on}
              aria-controls={controls[key]}
              data-shown={on ? "true" : "false"}
              onClick={() => onToggle(key)}
              sx={{
                position: "relative",
                boxSizing: "border-box",
                width: 176,
                minHeight: 52,
                px: "14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.25,
                borderRadius: "10px",
                borderWidth: "2px",
                borderStyle: on ? "solid" : "dashed",
                borderColor: on ? "brand.line" : "border.main",
                backgroundColor: on ? "brand.tint" : "surface.input",
                color: on ? "text.primary" : "text.secondary",
                fontFamily: "inherit",
                fontSize: "1rem",
                fontWeight: 700,
                cursor: "pointer",
                [PHONE_MEDIA]: { width: "calc(50% - 4px)" },
              }}
            >
              <Icon
                aria-hidden="true"
                sx={{ fontSize: 20, flex: "none", color: on ? "brand.text" : "text.secondary" }}
              />
              {PANE_LABELS[key]}
              {dot && (
                <Box
                  component="span"
                  role="img"
                  aria-label={dot.label}
                  id={`${idPrefix}-toggle-${key}-dot`}
                  sx={{
                    position: "absolute",
                    top: 6,
                    right: 8,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: dot.color,
                    border: "2px solid",
                    borderColor: "surface.main",
                  }}
                />
              )}
            </Box>
          );
        })}
        <Box aria-hidden="true" sx={{ flexGrow: 1 }} />
        <Box
          id={`${idPrefix}-layout-reset`}
          component="button"
          type="button"
          onClick={onReset}
          sx={{ ...secondaryButtonSx, backgroundColor: "surface.input" }}
        >
          Reset layout
        </Box>
      </Box>
    </Box>
  );
}
