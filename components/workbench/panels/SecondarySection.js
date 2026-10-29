// components/workbench/panels/SecondarySection.js
//
// #303 (Board G polish): a collapsible section at the bottom of the page, under the results,
// for what the workbench keeps but Board G does not show (the Reduction View's phase buttons).
// Closed by default, titled with a count ("Phases (3)"), its button a 44px target, styled as
// ./GadgetsSection.js's.

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import { useState } from "react";

/**
 * @param {Object} props
 * @param {string} props.id The section's id; its button is `${id}-toggle`, its body `${id}-body`.
 * @param {string} props.title
 * @param {number|null} [props.count] Said after the title, in brackets.
 * @param {import("react").Ref} [props.bodyRef] The body's element, for pieces rendered into it.
 * @param {import("react").ReactNode} [props.children]
 */
export default function SecondarySection({ id, title, count = null, bodyRef, children }) {
  const [open, setOpen] = useState(false);
  const bodyId = `${id}-body`;
  return (
    <Box
      id={id}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        borderTop: "1px solid",
        borderColor: "border.soft",
        pt: 1.5,
      }}
    >
      <Box
        id={`${id}-toggle`}
        component="button"
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((current) => !current)}
        sx={{
          alignSelf: "flex-start",
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          background: "none",
          border: "none",
          color: "text.primary",
          p: 0,
          fontFamily: "inherit",
          fontSize: "0.9375rem",
          fontWeight: 600,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <ExpandMoreIcon
          aria-hidden="true"
          sx={{ fontSize: 18, transform: open ? "none" : "rotate(-90deg)" }}
        />
        {title}
        {count !== null && (
          <Box component="span" sx={{ fontWeight: 400, color: "text.secondary" }}>
            ({count})
          </Box>
        )}
      </Box>
      <Box
        id={bodyId}
        ref={bodyRef}
        hidden={!open}
        sx={{ display: open ? "flex" : "none", flexDirection: "column", gap: 1.5 }}
      >
        {children}
      </Box>
    </Box>
  );
}
