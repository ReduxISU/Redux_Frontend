// components/SiteFooter.js
//
// #303: the ISU Computer Science logo, centered at the bottom of every page at every width.
// pages/_app.js renders it after each page, so no page has to remember it, and the banner
// (NavBar.js) no longer carries the logo. It is an ordinary footer, not fixed or sticky: it
// sits under the page's content, or at the bottom of the window when the page is short.

import Box from "@mui/material/Box";
import { IsuLogo } from "./NavBar";

export default function SiteFooter() {
  return (
    <Box
      component="footer"
      id="site-footer"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        px: 3,
        py: 3.5,
        borderTop: "1px solid",
        borderColor: "divider",
        backgroundColor: "surface.main",
      }}
    >
      <IsuLogo idPrefix="site-footer" />
    </Box>
  );
}
