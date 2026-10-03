// components/NavBar.js
//
// T08 (#12) — page chrome shown at the top of every page: the "REDUX"
// wordmark and the nav items (with an orange underline on the current
// route).
//
// Active-route detection reads the router directly (useRouter().pathname)
// rather than taking a prop, per the issue's explicit warning: a
// per-page prop silently goes stale the moment a route is added.
//
// Help, Contribute and About Us were chrome-only/absent for v1 (#12 scope
// note, CLAUDE.md's "Not in v1" list) — Help and Contribute originally
// rendered as disabled pill buttons on the right, separate from Home, since
// nothing in this repo named a confirmed URL for a deployed Redux_GUI
// instance to link out to. Superseded twice over by direct project-owner
// instruction: first all three became real pages in this app rather than
// external links, then Help and Contribute moved next to Home and About Us
// and dropped the pill/icon-button treatment entirely, so all nav items
// render identically, one plain-text link style, one flex group.
//
// T61 (#136) added the "Reduction Graph" link -- decision recorded on #136:
// linked from here rather than left undiscoverable, since it's a core-data
// feature (the whole catalog's reduction graph), not a demo page.
//
// Below `md` (the project's one responsive breakpoint) the links collapse into
// a menu button, by project-owner request: five links plus the wordmark
// wrapped onto two or three lines at phone width. The desktop links keep their
// ids; the menu items get a `-menu` suffix so ids stay unique.

import MenuIcon from "@mui/icons-material/Menu";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

const NAV_LINKS = [
  { id: "navbar-home-link", href: "/", label: "Home" },
  { id: "navbar-reduction-graph-link", href: "/reduction-graph", label: "Reduction Graph" },
  { id: "navbar-aboutus-link", href: "/aboutus", label: "About Us" },
  { id: "navbar-help-link", href: "/help", label: "Help" },
  { id: "navbar-contribute-link", href: "/contribute", label: "Contribute" },
];

export default function NavBar() {
  const router = useRouter();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const menuOpen = Boolean(menuAnchor);
  const closeMenu = () => setMenuAnchor(null);

  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1.5, sm: 3 },
        px: { xs: 2, sm: 5 },
        py: { xs: 1.5, md: 2.5 },
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          rowGap: 1,
          columnGap: { xs: 2, sm: 5 },
          flexGrow: 1,
        }}
      >
        <Box
          id="navbar-wordmark-link"
          component={Link}
          href="/"
          sx={{
            fontSize: "1.05rem",
            fontWeight: 700,
            letterSpacing: "0.28em",
            color: "text.primary",
            display: "inline-flex",
            alignItems: "center",
            minHeight: { xs: 44, md: "auto" },
          }}
        >
          REDUX
        </Box>

        {NAV_LINKS.map(({ id, href, label }) => {
          const isActive = router.pathname === href;
          return (
            <Box
              key={id}
              id={id}
              component={Link}
              href={href}
              aria-current={isActive ? "page" : undefined}
              sx={{
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: isActive ? "text.primary" : "text.secondary",
                borderBottom: "2px solid",
                borderColor: isActive ? "primary.main" : "transparent",
                pb: 0.75,
                display: { xs: "none", md: "inline-flex" },
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {label}
            </Box>
          );
        })}
      </Box>

      <IconButton
        id="navbar-menu-button"
        aria-label="Open navigation menu"
        aria-controls={menuOpen ? "navbar-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={menuOpen ? "true" : undefined}
        onClick={(event) => setMenuAnchor(event.currentTarget)}
        sx={{ display: { xs: "inline-flex", md: "none" }, width: 44, height: 44 }}
      >
        <MenuIcon />
      </IconButton>
      <Menu
        id="navbar-menu"
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={closeMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ list: { "aria-labelledby": "navbar-menu-button" } }}
      >
        {NAV_LINKS.map(({ id, href, label }) => {
          const isActive = router.pathname === href;
          return (
            <MenuItem
              key={id}
              id={`${id}-menu`}
              component={Link}
              href={href}
              selected={isActive}
              aria-current={isActive ? "page" : undefined}
              onClick={closeMenu}
              sx={{
                minHeight: 44,
                fontWeight: 600,
                borderLeft: "3px solid",
                borderColor: isActive ? "primary.main" : "transparent",
              }}
            >
              {label}
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}
