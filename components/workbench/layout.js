// components/workbench/layout.js
//
// #229: the workbench's shared sizes and breakpoint, so the command bar, the picture pane
// and the rail agree on them. Values come from the approved mockup (version 39). #279 (board F)
// added the panes' size container and the shared two-column grid a pane lays sides out on.

/** Phones and tablets: controls drop to their own lines and fields wrap. */
export const COMPACT_MEDIA = "@media (max-width:1024px)";

/**
 * #279: the Visualization, Execute and Verify panes are size containers by this name, so what
 * they hold lays out by the pane's own width rather than the window's.
 */
export const WORKSPACE_CONTAINER = "workspace";

/** A pane's width at or under which it stacks its sides, source first. */
export const WORKSPACE_STACK_WIDTH = 960;

/** Matches while the pane is narrow enough to stack (an `sx` key). */
export const WORKSPACE_NARROW = `@container ${WORKSPACE_CONTAINER} (max-width: ${WORKSPACE_STACK_WIDTH}px)`;

/**
 * #279: the one grid a pane lays its source and target out on (Reduce mode), so a side's parts
 * line up down the page; one column, source first, when the pane is narrow.
 */
export const sideGridSx = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "12px 16px",
  alignItems: "start",
  [WORKSPACE_NARROW]: { gridTemplateColumns: "minmax(0, 1fr)" },
};

/**
 * #279 (Workspace tweaks): the "tab stop" a collapsed pane's one line starts at. Every pane's
 * title is at least PANE_TITLE_WIDTH wide, and what follows it sits PANE_TITLE_GAP further on, so
 * every pane's summary or collapsed controls start at one x.
 */
export const PANE_TITLE_WIDTH = 120;

/** The gap between a pane's title and what follows it on the title's line. */
export const PANE_TITLE_GAP = 12;

/** Every pane's padding on a desktop. */
export const PANE_PADDING = 16;

/** Every pane's padding on phones and tablets, where the pictures need the room. */
export const PANE_COMPACT_PADDING = 12;

/** The title line of a pane: wraps what follows under it when narrow. */
export const titleLineSx = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: `8px ${PANE_TITLE_GAP}px`,
};

/** A pane's title (Details, Instance, Visualization, Execute, Verify). */
export const paneTitleSx = {
  m: 0,
  fontSize: "1.125rem",
  fontWeight: 700,
  flex: "0 0 auto",
  minWidth: PANE_TITLE_WIDTH,
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

/** The page's surface cards (every pane). */
export const cardSx = {
  backgroundColor: "surface.main",
  border: "1px solid",
  borderColor: "border.soft",
  borderRadius: "12px",
};

/** A pane's frame: its card and padding (./CollapsiblePane.js, ./PaneToggles.js). */
export const paneFrameSx = {
  ...cardSx,
  boxSizing: "border-box",
  minWidth: 0,
  p: `${PANE_PADDING}px`,
  [COMPACT_MEDIA]: { p: `${PANE_COMPACT_PADDING}px` },
};
