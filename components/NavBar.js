// components/NavBar.js
//
// T08 (#12) — page chrome shown at the top of every page: the "REDUX"
// wordmark, the "Home" nav item (with an orange underline on the current
// route), and the Help/Contribute pill buttons.
//
// Active-route detection reads the router directly (useRouter().pathname)
// rather than taking a prop, per the issue's explicit warning: a
// per-page prop silently goes stale the moment a route is added.
//
// Help and Contribute are chrome only for v1 (#12 scope note). Redux_GUI
// already has live /help and /contribute pages, but nothing in this repo
// (.env.example, ARCHITECTURE.md) names a confirmed URL for a deployed
// Redux_GUI instance to link to, so guessing a domain felt worse than
// leaving them inert — swap in a real href once the project owner
// confirms one.
//
// T28 (#37): below `sm` (600px) there isn't room for "REDUX" + "Home" + two
// full-width pill buttons on one row without wrapping or crowding the home
// link. Each chrome link renders as two elements — a labeled Button (sm and
// up) and an icon-only IconButton (below sm, same disabled/inert state,
// `aria-label` carrying the name a sighted user would otherwise read off the
// button text) — switched by CSS `display`, not a JS media-query hook, so
// there's no hydration-time layout flicker. Both are real `disabled`
// elements, so exactly one is ever in the tab order at a time regardless of
// viewport (a disabled control isn't focusable), never two overlapping stops
// for the same action.

import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Link from "next/link";
import { useRouter } from "next/router";

const CHROME_LINKS = [
  { id: "navbar-help-button", label: "Help", Icon: HelpOutlineIcon },
  { id: "navbar-contribute-button", label: "Contribute", Icon: PeopleAltOutlinedIcon },
];

export default function NavBar() {
  const router = useRouter();
  const isHomeActive = router.pathname === "/";

  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: { xs: 1.5, sm: 3 },
        px: { xs: 2, sm: 5 },
        py: 2.5,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 2, sm: 5 } }}>
        <Box
          id="navbar-wordmark-link"
          component={Link}
          href="/"
          sx={{
            fontSize: "1.05rem",
            fontWeight: 700,
            letterSpacing: "0.28em",
            color: "text.primary",
          }}
        >
          REDUX
        </Box>

        <Box
          id="navbar-home-link"
          component={Link}
          href="/"
          aria-current={isHomeActive ? "page" : undefined}
          sx={{
            fontSize: "0.9375rem",
            fontWeight: 600,
            color: isHomeActive ? "text.primary" : "text.secondary",
            borderBottom: "2px solid",
            borderColor: isHomeActive ? "primary.main" : "transparent",
            pb: 0.75,
          }}
        >
          Home
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 1.5 } }}>
        {CHROME_LINKS.map(({ id, label, Icon }) => (
          <Box key={id} sx={{ display: "contents" }}>
            <Button
              id={id}
              variant="outlined"
              disabled
              sx={{ display: { xs: "none", sm: "inline-flex" } }}
            >
              {label}
            </Button>
            <IconButton
              id={`${id}-icon`}
              aria-label={label}
              disabled
              sx={{
                display: { xs: "inline-flex", sm: "none" },
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Icon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
