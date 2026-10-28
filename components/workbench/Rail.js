// components/workbench/Rail.js
//
// #229: the column of icon + name buttons on the left of the workbench (Details, Instance,
// Result). One panel is open at a time; pressing the open panel's button again closes it.
// On phones and tablets (up to 1024px) the same buttons become a row of tabs fixed to the
// bottom of the screen.
//
// --- Decision: disclosure buttons, not a tablist ------------------------------------------
// Each button is a plain disclosure button (`aria-expanded` + `aria-controls` pointing at the
// one panel region) rather than an ARIA tab. A tablist promises that exactly one tab is always
// selected and its panel always shown, but here every panel can be closed (pressing the open
// button again, or the panel's Close button), leaving no panel at all. Disclosure buttons say
// exactly that: "this button shows or hides that region, and it is shown now / hidden now".
// They also keep the ordinary Tab-key order instead of the arrow-key roving focus a tablist
// requires, which suits three buttons.
// Rejected: `role="tablist"`, for the always-one-selected reason above; `aria-pressed` toggle
// buttons (the mockup's markup), because a pressed state does not tell a screen reader that
// the button controls a region that appears and disappears. The rail itself is a labelled
// group rather than a `nav` landmark: its buttons open panels on this page, they do not
// navigate anywhere.

import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ViewAgendaOutlinedIcon from "@mui/icons-material/ViewAgendaOutlined";
import Box from "@mui/material/Box";
import { COMPACT_MEDIA } from "./layout";

export const PANEL_KEYS = ["details", "instance", "result"];

const RAIL_ITEMS = {
  details: { label: "Details", Icon: InfoOutlinedIcon },
  instance: { label: "Instance", Icon: ViewAgendaOutlinedIcon },
  result: { label: "Result", Icon: AssignmentTurnedInOutlinedIcon },
};

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {string|null} props.openPanel The open panel's key, or null.
 * @param {(key: string) => void} props.onToggle Called with a panel key when its button is pressed.
 * @param {string} props.panelId The id of the panel region the buttons control.
 * @param {{[key: string]: {label: string, color: string}|null}} props.dots An optional
 *   notification dot per panel key (`label` is read by screen readers).
 * @param {string} props.accentLine The active button's border color (orange in Solve mode,
 *   gold in Reduce mode, matching the mode toggle).
 */
export default function Rail({ idPrefix, openPanel, onToggle, panelId, dots, accentLine }) {
  return (
    <Box
      role="group"
      aria-label="Workbench panels"
      id={`${idPrefix}-rail`}
      sx={{
        flex: "none",
        width: 92,
        minHeight: "calc(100vh - 150px)",
        p: 1,
        boxSizing: "border-box",
        backgroundColor: "surface.nav",
        border: "1px solid",
        borderColor: "border.soft",
        borderRadius: "12px",
        [COMPACT_MEDIA]: {
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          width: "auto",
          minHeight: 0,
          borderRadius: 0,
          borderWidth: "1px 0 0 0",
          p: 0.5,
        },
      }}
    >
      <Box
        sx={{
          position: "sticky",
          top: 16,
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          [COMPACT_MEDIA]: {
            position: "static",
            flexDirection: "row",
            justifyContent: "space-around",
          },
        }}
      >
        {PANEL_KEYS.map((key) => {
          const { label, Icon } = RAIL_ITEMS[key];
          const active = openPanel === key;
          const dot = dots?.[key] ?? null;
          return (
            <Box
              key={key}
              id={`${idPrefix}-rail-${key}`}
              component="button"
              type="button"
              aria-expanded={active}
              aria-controls={panelId}
              onClick={() => onToggle(key)}
              sx={{
                position: "relative",
                minHeight: 60,
                minWidth: 60,
                px: "2px",
                py: "6px",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: active ? accentLine : "transparent",
                backgroundColor: active ? "surface.raised2" : "transparent",
                color: "text.primary",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                fontFamily: "inherit",
                fontSize: "0.6875rem",
                fontWeight: 600,
                cursor: "pointer",
                "&:hover": { backgroundColor: active ? "surface.raised2" : "surface.raised" },
                [COMPACT_MEDIA]: { flex: "1 1 0", maxWidth: 140 },
              }}
            >
              <Icon aria-hidden="true" sx={{ fontSize: 22 }} />
              {label}
              {dot && (
                <Box
                  component="span"
                  role="img"
                  aria-label={dot.label}
                  id={`${idPrefix}-rail-${key}-dot`}
                  sx={{
                    position: "absolute",
                    top: 6,
                    right: 12,
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
      </Box>
    </Box>
  );
}
