// components/workbench/CollapsiblePane.js
//
// #279 (board F): the Details and Instance panes. Each is a full-width card with its title, a
// Show all / Show less button at the right, and what it holds. Collapsed, a pane keeps only its
// essentials: Details its Input -> Output line (`summary`, on the title's line), Instance its
// one-line instance field (part of `children`, which the pane itself draws short).
//
// #279 (Workspace tweaks): both sit on the title's line, "tabbed" to one x (layout.js
// PANE_TITLE_WIDTH). Instance's field moves there with `inlineCollapsed`: while collapsed, the
// title line and the body stop being boxes of their own (`display: contents`) and the card itself
// lays out the title, the body and the button on one wrapping line. The field stays the same
// element in the same place in the tree, so focus, the caret and what is typed are untouched.
//
// #279 (Workspace tweaks): the Visualization, Execute and Verify panes are this pane too, each
// its own card, in place of the one Workspace card they were sections of. Visualization
// collapses to a summary (its pictures' live Visualization Type dropdowns); Execute and Verify
// collapse inline like Instance, their top controls on the title's line, lined up at the bottom
// (`collapsedAlign`) so the title sits level with the controls under their labels. Those three are
// size containers (`container`, layout.js WORKSPACE_CONTAINER), so Reduce mode's two sides
// stack by the pane's own width.
//
// The rail's toggle hides the whole pane (`hidden`); it stays on the page so whatever is typed
// in it survives. Collapsed to a summary, the body stays on the page too, hidden.

import Box from "@mui/material/Box";
import {
  COMPACT_MEDIA,
  cardSx,
  PANE_COMPACT_PADDING,
  PANE_PADDING,
  paneTitleSx,
  titleLineSx,
  WORKSPACE_CONTAINER,
} from "./layout";

/**
 * The Show all / Show less button at the right of a pane's title line, the same on every pane.
 * @param {{id: string, controls: string, expanded: boolean,
 *   onExpandedChange: (expanded: boolean) => void}} props
 */
export function ExpandButton({ id, controls, expanded, onExpandedChange }) {
  return (
    <Box
      id={id}
      component="button"
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={() => onExpandedChange(!expanded)}
      sx={{
        order: 2,
        ml: "auto",
        minHeight: 40,
        px: 1.5,
        borderRadius: "8px",
        border: "1px solid",
        borderColor: "border.main",
        backgroundColor: "surface.input",
        color: "brand.text",
        fontFamily: "inherit",
        fontSize: "0.8125rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
    >
      {expanded ? "Show less" : "Show all"}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.id The pane's id; the heading and the button are `${id}-heading` and
 *   `${expandId}`.
 * @param {string} props.expandId The Show all / Show less button's id.
 * @param {string} props.title
 * @param {boolean} props.hidden Hidden by its rail toggle.
 * @param {boolean} props.expanded
 * @param {(expanded: boolean) => void} props.onExpandedChange
 * @param {import("react").ReactNode} [props.summary] Shown on the title's line while collapsed.
 * @param {string} props.bodyId The id of what Show all reveals, for `aria-controls`.
 * @param {import("react").ReactNode} [props.children] Drawn under the title line.
 * @param {boolean} [props.inlineCollapsed] While collapsed, draw `children` on the title's line
 *   where `summary` would go (Instance's one-line field, Execute's and Verify's top controls).
 * @param {"center"|"flex-end"} [props.collapsedAlign] How the collapsed title line lines up its
 *   parts: centered, or at the bottom, for controls with their labels above them (Execute's and
 *   Verify's controls, Visualization's dropdowns).
 * @param {boolean} [props.container] The pane is a size container (layout.js
 *   WORKSPACE_CONTAINER), so what it holds lays out by its own width.
 */
export default function CollapsiblePane({
  id,
  expandId,
  title,
  hidden,
  expanded,
  onExpandedChange,
  summary,
  bodyId,
  children,
  inlineCollapsed = false,
  collapsedAlign = "center",
  container = false,
}) {
  const headingId = `${id}-heading`;
  const inline = inlineCollapsed && !expanded;
  // On the title line, after the title and before the button; dropping under the title when
  // there isn't room.
  const onTitleLineSx = { order: 1, flex: "1 1 320px", minWidth: 0 };
  const display = hidden ? "none" : "flex";
  const bodyHidden = !children || (!expanded && !inline);
  // The card is the title line; its padding gives back what the line's -6px margin takes from a
  // pane whose title line is a box of its own.
  const inlinePaddingY = (padding) => `${padding - 6}px`;
  return (
    <Box
      component="section"
      id={id}
      aria-labelledby={headingId}
      hidden={hidden}
      data-expanded={expanded ? "true" : "false"}
      sx={{
        ...cardSx,
        boxSizing: "border-box",
        minWidth: 0,
        p: `${PANE_PADDING}px`,
        ...(container ? { containerType: "inline-size", containerName: WORKSPACE_CONTAINER } : {}),
        ...(inline
          ? {
              ...titleLineSx,
              display,
              alignItems: collapsedAlign,
              py: inlinePaddingY(PANE_PADDING),
            }
          : { display, flexDirection: "column", gap: 1 }),
        // Last, so it wins over the padding above on phones and tablets.
        [COMPACT_MEDIA]: {
          p: `${PANE_COMPACT_PADDING}px`,
          ...(inline ? { py: inlinePaddingY(PANE_COMPACT_PADDING) } : {}),
        },
      }}
    >
      <Box
        sx={
          inline
            ? { display: "contents" }
            : { ...titleLineSx, my: -0.75, ...(expanded ? {} : { alignItems: collapsedAlign }) }
        }
      >
        <Box
          component="h2"
          id={headingId}
          sx={{
            ...paneTitleSx,
            // Lined up at the bottom, as tall as the controls beside it, its text centered on
            // them.
            ...(!expanded && collapsedAlign === "flex-end"
              ? { minHeight: 44, display: "flex", alignItems: "center" }
              : {}),
          }}
        >
          {title}
        </Box>
        {!expanded && summary && <Box sx={onTitleLineSx}>{summary}</Box>}
        <ExpandButton
          id={expandId}
          controls={bodyId}
          expanded={expanded}
          onExpandedChange={onExpandedChange}
        />
      </Box>
      {/* Always on the page, so the button's aria-controls names something even when the
          collapsed pane has nothing under its title. */}
      <Box
        id={bodyId}
        hidden={bodyHidden}
        sx={
          inline
            ? onTitleLineSx
            : {
                minWidth: 0,
                display: bodyHidden ? "none" : "flex",
                flexDirection: "column",
                gap: 1.5,
              }
        }
      >
        {children}
      </Box>
    </Box>
  );
}
