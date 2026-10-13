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
//
// #156: the right end of the bar holds the theme toggle and, at the far right, the ISU
// Computer Science logo. Both have a dark and a light version rendered together, with the
// inactive one hidden by the color-scheme CSS selector (theme.applyStyles), so the server
// render and the first paint already match the theme the visitor sees: no hydration
// mismatch and no flash of the wrong logo or label. The toggle shows what it switches TO
// (sun + "Light" while dark, moon + "Dark" while light) and its accessible name says the
// same; the hidden half is display:none, so it is out of the accessibility tree too. Below
// `sm` the toggle drops its text label and stays a 44px icon button beside the menu button.

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import MenuIcon from "@mui/icons-material/Menu";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useColorScheme } from "@mui/material/styles";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { THEME_ATTRIBUTE } from "./theme";

const LOGO_ALT = "Idaho State University, Computer Science";
// The logo is a plain <img> (MUI Box component="img"), not next/image. It was already
// `unoptimized`, so next/image added nothing here, and on Next 16.4.0 importing next/image
// in this shared component makes Turbopack's dev server leave @mui/material out of the client
// chunks for /help, /aboutus and /reduction-graph ("module factory is not available" for
// Box.mjs). Production builds were fine and the bug is gone in 16.5.0-canary.9.
// Trimmed logo files in public/ are 289 x 120; shown 40px tall.
const LOGO_WIDTH = 289;
const LOGO_HEIGHT = 120;
const LOGO_DISPLAY_HEIGHT = 40;

const visuallyHiddenSx = {
  position: "absolute",
  width: 1,
  height: 1,
  p: 0,
  m: -0.125,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

// Shown only while the given scheme is active; hidden (display:none) in the other one.
function onlyInSx(scheme, display = "inline-flex") {
  const other = scheme === "dark" ? "light" : "dark";
  return (theme) => ({ display, ...theme.applyStyles(other, { display: "none" }) });
}

function ThemeToggleFace({ scheme, icon, label, accessibleName }) {
  return (
    <Box component="span" sx={[onlyInSx(scheme), { alignItems: "center", gap: 0.75 }]}>
      {icon}
      <Box component="span" aria-hidden="true" sx={{ display: { xs: "none", sm: "inline" } }}>
        {label}
      </Box>
      <Box component="span" sx={visuallyHiddenSx}>
        {accessibleName}
      </Box>
    </Box>
  );
}

function ThemeToggle() {
  const { setMode } = useColorScheme();
  const toggle = () => {
    // The attribute on <html> is the scheme actually showing (InitColorSchemeScript sets it
    // before the first paint, MUI keeps it current), whether it came from a saved choice or
    // from prefers-color-scheme.
    const current = document.documentElement.getAttribute(THEME_ATTRIBUTE);
    setMode(current === "light" ? "dark" : "light");
  };

  return (
    <Button
      id="navbar-theme-toggle"
      variant="outlined"
      color="inherit"
      onClick={toggle}
      sx={{
        minHeight: 44,
        minWidth: 44,
        px: { xs: 1, sm: 1.75 },
        flexShrink: 0,
        color: "text.primary",
        borderColor: "border.main",
        "&:hover": { borderColor: "border.strong", backgroundColor: "action.hover" },
      }}
    >
      <ThemeToggleFace
        scheme="dark"
        icon={<LightModeIcon aria-hidden="true" fontSize="small" />}
        label="Light"
        accessibleName="Switch to the light theme"
      />
      <ThemeToggleFace
        scheme="light"
        icon={<DarkModeIcon aria-hidden="true" fontSize="small" />}
        label="Dark"
        accessibleName="Switch to the dark theme"
      />
    </Button>
  );
}

function IsuLogo() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
      {[
        { scheme: "dark", src: "/ISULogo-Dark.png", id: "navbar-isu-logo-dark" },
        { scheme: "light", src: "/ISULogo-Light.png", id: "navbar-isu-logo-light" },
      ].map(({ scheme, src, id }) => (
        <Box key={scheme} component="span" sx={onlyInSx(scheme, "block")}>
          <Box
            component="img"
            id={id}
            src={src}
            alt={LOGO_ALT}
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            sx={{ display: "block", height: LOGO_DISPLAY_HEIGHT, width: "auto" }}
          />
        </Box>
      ))}
    </Box>
  );
}

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
        backgroundColor: "surface.nav",
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
      <ThemeToggle />
      <IsuLogo />
    </Box>
  );
}
