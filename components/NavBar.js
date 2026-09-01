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

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "next/link";
import { useRouter } from "next/router";

const CHROME_LINKS = [
  { id: "navbar-help-button", label: "Help" },
  { id: "navbar-contribute-button", label: "Contribute" },
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
        gap: 3,
        px: { xs: 3, sm: 5 },
        py: 2.5,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 5 }}>
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

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {CHROME_LINKS.map(({ id, label }) => (
          <Button key={id} id={id} variant="outlined" disabled>
            {label}
          </Button>
        ))}
      </Box>
    </Box>
  );
}
