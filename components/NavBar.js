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
// and dropped the pill/icon-button treatment entirely, so all four nav
// items now render identically, one plain-text link style, one flex group.
// That also retired the old mobile fallback (a separate icon-only button
// per chrome link below `sm`) — plain text links are compact enough that
// four of them plus the wordmark fit without needing one; `flexWrap: "wrap"`
// on the group is the only safety net left, for extreme narrow widths.
//
// T61 (#136) added the "Reduction Graph" link -- decision recorded on #136:
// linked from here rather than left undiscoverable, since it's a core-data
// feature (the whole catalog's reduction graph), not a demo page.

import Box from "@mui/material/Box";
import Link from "next/link";
import { useRouter } from "next/router";

const NAV_LINKS = [
  { id: "navbar-home-link", href: "/", label: "Home" },
  { id: "navbar-reduction-graph-link", href: "/reduction-graph", label: "Reduction Graph" },
  { id: "navbar-aboutus-link", href: "/aboutus", label: "About Us" },
  { id: "navbar-help-link", href: "/help", label: "Help" },
  { id: "navbar-contribute-link", href: "/contribute", label: "Contribute" },
  // T60 (#135): linked rather than left as a hidden route, for discoverability --
  // see the decision comment on #135.
  { id: "navbar-quantum-demo-link", href: "/quantum-demo", label: "Quantum Demo" },
];

export default function NavBar() {
  const router = useRouter();

  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 1.5, sm: 3 },
        px: { xs: 2, sm: 5 },
        py: 2.5,
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
              }}
            >
              {label}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
