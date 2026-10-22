// components/workbench/Workspace.js
//
// #279 (board F): the one Workspace pane. It holds three sections, top to bottom:
// Visualization (the pictures, steps, Legend and Gadgets), Execute (the controls, the run's
// status and its result) and Verify (the certificate check). The rail shows and hides each
// section; the Workspace has no collapse of its own, and hiding all three hides it.
//
// #279 (Workspace tweaks): each section has the Details and Instance panes' Show all / Show less
// (./CollapsiblePane.js ExpandButton) at the right of its heading. Collapsed, the section keeps
// only a one-line summary beside its heading (`summary`); what it holds stays on the page,
// hidden, like a section hidden from the rail. The summary starts at the same x as Details'
// summary and Instance's field (layout.js workspaceHeadingTabSx), dropping under the heading
// when there isn't room.
//
// Execute and Verify collapse differently (`inlineCollapsed`, as Instance's pane does,
// ./CollapsiblePane.js): their body itself moves onto the heading's line, starting at the same
// x, and draws only its top controls there (CommandBar and VerifyBox, collapsed). The controls
// are the same elements throughout, so what is picked or typed is the same either way.
//
// Every section stays on the page while hidden (the `hidden` attribute), so a typed certificate,
// an open list or a chosen step survives hiding and showing it again.
//
// The Workspace is a size container (layout.js WORKSPACE_CONTAINER): its sections lay their
// source and target out side by side on the shared grid (layout.js sideGridSx) and stack, source
// first, when the Workspace itself is 960px wide or less, whatever the window's width.

import Box from "@mui/material/Box";
import { ExpandButton } from "./CollapsiblePane";
import {
  COMPACT_MEDIA,
  cardSx,
  sectionHeadingSx,
  titleLineSx,
  WORKSPACE_COMPACT_PADDING,
  WORKSPACE_CONTAINER,
  WORKSPACE_PADDING,
  workspaceHeadingTabSx,
} from "./layout";

/**
 * One section of the Workspace: a region named by its small heading.
 * @param {Object} props
 * @param {string} props.id
 * @param {string} props.title
 * @param {boolean} props.hidden
 * @param {boolean} props.first The first shown section sits right under the pane's title, with
 *   no rule above it.
 * @param {boolean} props.expanded Open, or collapsed to its heading and `summary`.
 * @param {(expanded: boolean) => void} props.onExpandedChange
 * @param {import("react").ReactNode} [props.summary] The one line shown while collapsed.
 * @param {boolean} [props.inlineCollapsed] While collapsed, draw `children` on the heading's line
 *   where `summary` would go, instead of hiding them.
 * @param {import("react").ReactNode} props.children
 */
export function WorkspaceSection({
  id,
  title,
  hidden,
  first,
  expanded,
  onExpandedChange,
  summary,
  inlineCollapsed = false,
  children,
}) {
  const headingId = `${id}-heading`;
  const bodyId = `${id}-body`;
  const inline = inlineCollapsed && !expanded;
  const display = hidden ? "none" : "flex";
  return (
    <Box
      id={id}
      role="region"
      aria-labelledby={headingId}
      hidden={hidden}
      data-expanded={expanded ? "true" : "false"}
      sx={{
        ...(inline
          ? // The section is the heading's line: the heading, the body and the button wrap on it.
            // Its parts line up at the bottom, so the heading sits level with the controls under
            // their labels.
            { ...titleLineSx, display, alignItems: "flex-end" }
          : { display, flexDirection: "column", gap: 1.5 }),
        minWidth: 0,
        pt: first ? 0 : 1.5,
        borderTop: first ? "none" : "1px solid",
        borderColor: "border.soft",
      }}
    >
      <Box sx={inline ? { display: "contents" } : { ...titleLineSx, my: -0.5 }}>
        <Box
          component="h3"
          id={headingId}
          sx={{
            ...sectionHeadingSx,
            flex: "0 0 auto",
            ...workspaceHeadingTabSx,
            // As tall as the controls beside it, its text centered on them.
            ...(inline ? { minHeight: 44, display: "flex", alignItems: "center" } : {}),
          }}
        >
          {title}
        </Box>
        {!expanded && !inlineCollapsed && (
          <Box
            id={`${id}-summary`}
            sx={{
              order: 1,
              flex: "1 1 280px",
              minWidth: 0,
              fontSize: "0.875rem",
              color: "text.primary",
              overflowWrap: "anywhere",
            }}
          >
            {summary}
          </Box>
        )}
        <ExpandButton
          id={`${id}-expand`}
          controls={bodyId}
          expanded={expanded}
          onExpandedChange={onExpandedChange}
        />
      </Box>
      <Box
        id={bodyId}
        hidden={!expanded && !inline}
        sx={{
          display: expanded || inline ? "flex" : "none",
          flexDirection: "column",
          gap: 1.5,
          minWidth: 0,
          // On the heading's line, after the heading; under it when there isn't room.
          ...(inline ? { order: 1, flex: "1 1 280px" } : {}),
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.id
 * @param {boolean} props.hidden Every section is hidden.
 * @param {import("react").ReactNode} props.children The WorkspaceSections.
 */
export default function Workspace({ id, hidden, children }) {
  const headingId = `${id}-heading`;
  return (
    <Box
      component="section"
      id={id}
      aria-labelledby={headingId}
      hidden={hidden}
      sx={{
        ...cardSx,
        display: hidden ? "none" : "flex",
        flexDirection: "column",
        gap: 1.5,
        p: `${WORKSPACE_PADDING}px`,
        // On phones and tablets the pictures keep the room #229's picture pane gave them.
        [COMPACT_MEDIA]: { p: `${WORKSPACE_COMPACT_PADDING}px` },
        boxSizing: "border-box",
        minWidth: 0,
        containerType: "inline-size",
        containerName: WORKSPACE_CONTAINER,
      }}
    >
      <Box component="h2" id={headingId} sx={{ m: 0, fontSize: "1.125rem", fontWeight: 700 }}>
        Workspace
      </Box>
      {children}
    </Box>
  );
}
