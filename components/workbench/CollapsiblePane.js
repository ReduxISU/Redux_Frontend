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
// The rail's toggle hides the whole pane (`hidden`); it stays on the page so whatever is typed
// in it survives.

import Box from "@mui/material/Box";
import { cardSx, PANE_PADDING, PANE_TITLE_WIDTH, titleLineSx } from "./layout";

/**
 * The Show all / Show less button at the right of a pane's title line. The Workspace's sections
 * (./Workspace.js) use it too, so every collapse on the page looks and behaves the same.
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
 *   where `summary` would go (Instance's one-line field).
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
}) {
  const headingId = `${id}-heading`;
  const inline = inlineCollapsed && !expanded;
  // On the title line, after the title and before the button; dropping under the title when
  // there isn't room.
  const onTitleLineSx = { order: 1, flex: "1 1 320px", minWidth: 0 };
  return (
    <Box
      component="section"
      id={id}
      aria-labelledby={headingId}
      hidden={hidden}
      sx={{
        ...cardSx,
        boxSizing: "border-box",
        minWidth: 0,
        p: `${PANE_PADDING}px`,
        ...(inline
          ? // The card is the title line; its padding gives back what the line's -6px margin
            // takes from a pane whose title line is a box of its own.
            { ...titleLineSx, display: hidden ? "none" : "flex", py: `${PANE_PADDING - 6}px` }
          : { display: hidden ? "none" : "flex", flexDirection: "column", gap: 1 }),
      }}
    >
      <Box sx={inline ? { display: "contents" } : { ...titleLineSx, my: -0.75 }}>
        <Box
          component="h2"
          id={headingId}
          sx={{
            m: 0,
            fontSize: "1.125rem",
            fontWeight: 700,
            flex: "0 0 auto",
            minWidth: PANE_TITLE_WIDTH,
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
      <Box id={bodyId} hidden={!children} sx={inline ? onTitleLineSx : { minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
