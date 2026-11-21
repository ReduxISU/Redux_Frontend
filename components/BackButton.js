// components/BackButton.js
//
// #327: the problem page's Back control, above its title. When the visitor came from another page
// of this site (the problem list, the reduction graph, a playlist, Compare), it goes back in
// history, so that page comes back as they left it. When they came from outside (a shared link,
// a bookmark, a new tab), going back would leave the site, so it goes to the problem list
// instead and says so ("Back to problems"). lib/siteHistory.js knows which.
//
// A real link to "/" underneath, so it works with the keyboard, a middle click opens the list in
// a new tab, and it still goes somewhere before the page's scripts run.

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Box from "@mui/material/Box";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSyncExternalStore } from "react";
import { cameFromSite } from "../lib/siteHistory";

const noChange = () => () => {};

/** Whether going back stays on the site; false on the server, where there is no history. */
function useCameFromSite() {
  return useSyncExternalStore(
    noChange,
    () => cameFromSite({ referrer: document.referrer, origin: window.location.origin }),
    () => false,
  );
}

/**
 * @param {Object} props
 * @param {string} props.id
 */
export default function BackButton({ id }) {
  const router = useRouter();
  const fromSite = useCameFromSite();
  const label = fromSite ? "Back" : "Back to problems";

  function goBack(event) {
    // A middle click or a modifier opens the problem list the usual way.
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!fromSite) return;
    event.preventDefault();
    router.back();
  }

  return (
    <Box
      id={id}
      component={Link}
      href="/"
      onClick={goBack}
      data-goes={fromSite ? "back" : "home"}
      sx={{
        alignSelf: "flex-start",
        minHeight: 44,
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.25,
        ml: -1.25,
        borderRadius: "8px",
        color: "text.secondary",
        fontSize: "0.9375rem",
        fontWeight: 600,
        textDecoration: "none",
        "&:hover": { color: "text.primary", backgroundColor: "surface.raised2" },
        "&:focus-visible": { color: "text.primary" },
      }}
    >
      <ArrowBackIcon aria-hidden="true" sx={{ fontSize: 18 }} />
      {label}
    </Box>
  );
}
