// components/workbench/layout.js
//
// #229: the workbench's shared sizes and breakpoints, so the task bar, the picture pane and
// the results agree on them. Values came from the approved mockup (version 39); #303 (Board G)
// adds the column width and the phone breakpoint.

/** Phones and tablets: the workspace's padding tightens and its rows wrap sooner. */
export const COMPACT_MEDIA = "@media (max-width:1024px)";

/** #303: phones (MUI's xs): the ISU logo moves to the footer, and every row stacks. */
export const PHONE_MEDIA = "@media (max-width:599.95px)";

/** #303: Board G's centered column, at its widest. */
export const COLUMN_MAX_WIDTH = 1520;

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
