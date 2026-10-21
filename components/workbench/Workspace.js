// components/workbench/Workspace.js
//
// #279 (board F): the one Workspace pane. It holds three sections, top to bottom:
// Visualization (the pictures, steps, Legend and Gadgets), Execute (the controls, the run's
// status and its result) and Verify (the certificate check). The rail shows and hides each
// section; the Workspace has no collapse of its own, and hiding all three hides it.
//
// Every section stays on the page while hidden (the `hidden` attribute), so a typed certificate,
// an open list or a chosen step survives hiding and showing it again.
//
// The Workspace is a size container (layout.js WORKSPACE_CONTAINER): its sections lay their
// source and target out side by side on the shared grid (layout.js sideGridSx) and stack, source
// first, when the Workspace itself is 960px wide or less, whatever the window's width.

import Box from "@mui/material/Box";
import { cardSx, sectionHeadingSx, WORKSPACE_CONTAINER } from "./layout";

/**
 * One section of the Workspace: a region named by its small heading.
 * @param {Object} props
 * @param {string} props.id
 * @param {string} props.title
 * @param {boolean} props.hidden
 * @param {boolean} props.first The first shown section sits right under the pane's title, with
 *   no rule above it.
 * @param {import("react").ReactNode} props.children
 */
export function WorkspaceSection({ id, title, hidden, first, children }) {
  const headingId = `${id}-heading`;
  return (
    <Box
      id={id}
      role="region"
      aria-labelledby={headingId}
      hidden={hidden}
      sx={{
        display: hidden ? "none" : "flex",
        flexDirection: "column",
        gap: 1.5,
        minWidth: 0,
        pt: first ? 0 : 1.5,
        borderTop: first ? "none" : "1px solid",
        borderColor: "border.soft",
      }}
    >
      <Box component="h3" id={headingId} sx={sectionHeadingSx}>
        {title}
      </Box>
      {children}
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
        p: 2,
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
