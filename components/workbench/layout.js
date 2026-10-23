// components/workbench/layout.js
//
// #229: the workbench's shared sizes and breakpoint, so the command bar, the picture pane
// and the rail agree on them. Values come from the approved mockup (version 39). #279 (board F)
// added the Workspace's container and the shared two-column grid its sections lay sides out on.

/** Phones and tablets: controls drop to their own lines and fields wrap. */
export const COMPACT_MEDIA = "@media (max-width:1024px)";

/**
 * #279: the Workspace pane is a size container by this name, so its sections lay out by the
 * Workspace's own width rather than the window's.
 */
export const WORKSPACE_CONTAINER = "workspace";

/** The Workspace's width at or under which each section stacks its sides, source first. */
export const WORKSPACE_STACK_WIDTH = 960;

/** Matches while the Workspace is narrow enough to stack (an `sx` key). */
export const WORKSPACE_NARROW = `@container ${WORKSPACE_CONTAINER} (max-width: ${WORKSPACE_STACK_WIDTH}px)`;

/**
 * #279: the one grid every Workspace section lays its source and target out on (Reduce mode),
 * so a side's parts line up down the page; one column, source first, when the Workspace is
 * narrow.
 */
export const sideGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px 16px",
  alignItems: "start",
  [WORKSPACE_NARROW]: { gridTemplateColumns: "minmax(0, 1fr)" },
};

/** A Workspace section's small heading (Visualization, Execute, Verify). */
export const sectionHeadingSx = {
  m: 0,
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "text.secondary",
};

/** One width shared by Edit, Run and every Visualization Type dropdown, right edges aligned. */
export const SHARED_CONTROL_WIDTH = 256;

/** The closed width of the Solver, To and Using dropdowns. */
export const DROPDOWN_WIDTH = 340;

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

/** The page's surface cards (the Details, Instance and Workspace panes). */
export const cardSx = {
  backgroundColor: "surface.main",
  border: "1px solid",
  borderColor: "border.soft",
  borderRadius: "12px",
};
