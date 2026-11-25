// components/ShareButton.js
//
// #324: the problem page's Share button. Pressing it copies a link to what is on screen (the
// instance, the solver, the picture and, in Reduce, the reduction: lib/permalink.js) and says
// "Copied" for a moment. A browser that blocks the clipboard (or has none, as a page served
// without HTTPS) gets the link in a read-only box under the button, selected, to copy by hand.
// When the instance is too long for a link (#174), Share saves the whole view on the Redux server
// and copies a short link to it instead (`?share={id}`, ReduxISU/Redux#844, lib/shortLinks.js),
// saying it lasts about 6 months. If saving fails, the link leaves the instance out as before,
// and the message says so and why in plain words, rather than handing out a link that breaks.
//
// Opening a shared link never runs anything by itself: the workbench only computes when its main
// button is pressed (#177, tests/e2e/share.spec.js checks it).

import ShareIcon from "@mui/icons-material/Share";
import Box from "@mui/material/Box";
import { useEffect, useRef, useState } from "react";
import { REDUX_API_BASE_URL } from "../lib/redux";
import { SAVED_LINK_TEXT, saveFailureText, saveShareLink, shortLinkHref } from "../lib/shortLinks";
import { secondaryButtonSx } from "./workbench/layout";

/** How long the button says "Copied" before it is Share again. */
const COPIED_MS = 2500;

const OMITTED_TEXT =
  "The instance is too long for a link, so the link leaves it out and opens on the default instance.";

/** Copies `text` with the Clipboard API, else the older copy command; resolves to success. */
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Blocked: try the older way below.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand?.("copy") === true;
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

/**
 * The link to copy for `link`: the plain one when it holds the whole view, else a short link
 * to the view saved on the server, else (saving failed) the plain one without the instance.
 * @returns {Promise<{href: string, instanceOmitted: boolean, saved: boolean, reason: string|null}>}
 */
async function linkToCopy(link) {
  if (!link.instanceOmitted || !link.view || typeof link.base !== "string") {
    return { href: link.href, instanceOmitted: link.instanceOmitted, saved: false, reason: null };
  }
  try {
    const shareId = await saveShareLink(REDUX_API_BASE_URL, link.view);
    return {
      href: shortLinkHref(link.base, shareId),
      instanceOmitted: false,
      saved: true,
      reason: null,
    };
  } catch (error) {
    return { href: link.href, instanceOmitted: true, saved: false, reason: saveFailureText(error) };
  }
}

/** What the status line says about a copied (or to-copy) link, after the copy result. */
function aboutLink(shared) {
  if (shared.saved) return SAVED_LINK_TEXT;
  if (!shared.instanceOmitted) return "";
  return shared.reason ? `${OMITTED_TEXT} ${shared.reason}` : OMITTED_TEXT;
}

/**
 * @param {Object} props
 * @param {string} props.id Prefixes every id rendered here.
 * @param {() => ({href: string, instanceOmitted: boolean, base?: string, view?: Object}|null)}
 *   props.getLink The link to copy, asked for on each press (the workbench's lib/permalink.js
 *   fitPermalink answer, with the page's address and the whole view for a short link).
 */
export default function ShareButton({ id, getLink }) {
  // {state: "saving" | "copied" | "manual" | "done", href, instanceOmitted, saved, reason}, or
  // null before a press.
  const [shared, setShared] = useState(null);
  const fieldRef = useRef(null);

  useEffect(() => {
    if (shared?.state !== "copied") return undefined;
    const timer = setTimeout(
      () => setShared((now) => (now === shared ? { ...now, state: "done" } : now)),
      COPIED_MS,
    );
    return () => clearTimeout(timer);
  }, [shared]);

  useEffect(() => {
    if (shared?.state === "manual") fieldRef.current?.select();
  }, [shared]);

  async function share() {
    if (shared?.state === "saving") return;
    const link = getLink?.();
    if (!link?.href) return;
    if (link.instanceOmitted) setShared({ state: "saving" });
    const chosen = await linkToCopy(link);
    const copied = await copyText(chosen.href);
    setShared({ ...chosen, state: copied ? "copied" : "manual" });
  }

  let message = "";
  const about = shared && shared.state !== "saving" ? aboutLink(shared) : "";
  if (shared?.state === "saving") {
    message = "Saving a short link to this view.";
  } else if (shared?.state === "copied") {
    message = about ? `Link copied. ${about}` : "Link copied.";
  } else if (shared?.state === "manual") {
    message = `This browser did not let the page copy the link. Copy it from the box below.${
      about ? ` ${about}` : ""
    }`;
  } else if (shared?.state === "done") {
    message = about;
  }

  return (
    <Box
      id={id}
      sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.75 }}
    >
      <Box
        component="button"
        type="button"
        id={`${id}-button`}
        onClick={share}
        aria-busy={shared?.state === "saving" || undefined}
        aria-describedby={message ? `${id}-status` : undefined}
        sx={{
          ...secondaryButtonSx,
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <ShareIcon aria-hidden="true" sx={{ fontSize: 18 }} />
        {shared?.state === "copied" ? "Copied" : "Share"}
      </Box>
      <Box
        id={`${id}-status`}
        role="status"
        aria-live="polite"
        sx={{
          fontSize: "0.8125rem",
          color: "text.secondary",
          maxWidth: 420,
          textAlign: "right",
          "&:empty": { display: "none" },
        }}
      >
        {message}
      </Box>
      {shared?.state === "manual" && (
        <Box
          component="input"
          ref={fieldRef}
          id={`${id}-link`}
          type="text"
          readOnly
          value={shared.href}
          aria-label="Link to this view"
          onFocus={(event) => event.target.select()}
          sx={{
            width: "min(420px, 100%)",
            minHeight: 44,
            boxSizing: "border-box",
            px: 1.25,
            backgroundColor: "surface.input",
            color: "text.primary",
            border: "1px solid",
            borderColor: "border.main",
            borderRadius: "8px",
            fontFamily: "inherit",
            fontSize: "0.875rem",
          }}
        />
      )}
    </Box>
  );
}
