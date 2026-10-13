// components/workbench/layout.js
//
// #229: the workbench's shared sizes and breakpoint, so the command bar, the picture pane
// and the rail agree on them. Values come from the approved mockup (version 39).

/** Phones and tablets: the rail becomes bottom tabs and a panel opens as a bottom sheet. */
export const COMPACT_MEDIA = "@media (max-width:1024px)";

/** One width shared by Edit, Run and every Visualization Type dropdown, right edges aligned. */
export const SHARED_CONTROL_WIDTH = 256;

/** The closed width of the Solver, To and Using dropdowns. */
export const DROPDOWN_WIDTH = 340;

/** The desktop panel's width, between the rail and the picture. */
export const PANEL_WIDTH = 340;

/** Monospace stack for instance and certificate text (matches the theme's `mono` variant). */
export const MONO_FONT = '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace';

/** The small grey label used above or beside a control ("Solver", "Visualization Type"). */
export const controlLabelSx = {
  fontSize: "0.8125rem",
  color: "text.secondary",
};

/** A raised, outlined secondary button (Edit, Close, Try again). */
export const secondaryButtonSx = {
  minHeight: 44,
  px: 2,
  borderRadius: "8px",
  border: "1px solid",
  borderColor: "border.main",
  backgroundColor: "surface.raised",
  color: "text.primary",
  fontSize: "0.875rem",
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
  "&:hover": { backgroundColor: "surface.raised2" },
  "&:disabled": { cursor: "not-allowed", color: "text.disabled" },
};

/** The page's surface cards (command bar, picture pane, open panel). */
export const cardSx = {
  backgroundColor: "surface.main",
  border: "1px solid",
  borderColor: "border.soft",
  borderRadius: "12px",
};
