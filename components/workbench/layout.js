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

/**
 * #279 (Workspace tweaks): the "tab stop" a collapsed pane's or section's one line starts at.
 * Every pane's title (Details, Instance) is at least PANE_TITLE_WIDTH wide, and what follows it
 * sits PANE_TITLE_GAP further on, so Details' summary and Instance's field start at one x. The
 * Workspace's sections sit inside the Workspace card's padding instead of their own, so their
 * headings make up the difference (workspaceHeadingTabSx) and their summaries start there too.
 */
export const PANE_TITLE_WIDTH = 120;

/** The gap between a pane's title and what follows it on the title's line. */
export const PANE_TITLE_GAP = 12;

/** The Details and Instance panes' padding. */
export const PANE_PADDING = 16;

/** The Workspace card's padding: the panes' on a desktop, less on phones and tablets. */
export const WORKSPACE_PADDING = 16;
export const WORKSPACE_COMPACT_PADDING = 12;

/** The title line of a pane or a Workspace section: wraps what follows under it when narrow. */
export const titleLineSx = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: `8px ${PANE_TITLE_GAP}px`,
};

/**
 * A Workspace section's heading width, so its collapsed summary starts at the panes' tab stop:
 * the panes' title width plus however much less the Workspace pads than a pane does.
 */
export const workspaceHeadingTabSx = {
  minWidth: PANE_TITLE_WIDTH + PANE_PADDING - WORKSPACE_PADDING,
  [COMPACT_MEDIA]: { minWidth: PANE_TITLE_WIDTH + PANE_PADDING - WORKSPACE_COMPACT_PADDING },
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
