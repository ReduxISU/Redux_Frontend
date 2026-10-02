// components/detail/visualizations/floatingMenu.js
//
// Shared floating context-menu chrome for the diagram editors that use right-click menus
// positioned at the click point (GraphRenderer.js/T54, BooleanSatisfiabilityRenderer.js/T55)
// -- extracted once a second renderer needed the identical pattern, rather than duplicated a
// second time. A menu is a DOM sibling of whatever it floats over (never inside an SVG or a
// dnd-kit draggable subtree), positioned with `position: fixed` at the screen point a
// right-click happened, so a click inside the menu never reaches the canvas's own
// pointerdown/contextmenu handlers underneath it.

import Paper from "@mui/material/Paper";
import { useEffect, useLayoutEffect, useState } from "react";

/**
 * Closes `onClose` on an outside click or Escape, while a menu is open. Reads only the given
 * ref, not a hardcoded global selector (§4.1).
 *
 * @param {React.RefObject} menuRef
 * @param {boolean} isOpen
 * @param {() => void} onClose
 */
export function useCloseFloatingMenu(menuRef, isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return undefined;
    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // menuRef is a ref object -- stable across renders, but it arrives as a parameter here
    // (not a `useRef()` call in this function body), so eslint's exhaustive-deps special
    // case for refs doesn't apply and it's listed explicitly instead.
  }, [isOpen, onClose, menuRef]);
}

const VIEWPORT_MARGIN = 8;

// #178: opens at the click point, then is nudged back inside the viewport (and kept there if its
// contents grow), so on a phone it is never cut off at the right or bottom edge.
export function FloatingMenu({ menuRef, x, y, children }) {
  const [position, setPosition] = useState({ left: x + 4, top: y + 4 });

  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!element) return undefined;
    function keepOnScreen() {
      const { width, height } = element.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = window.innerHeight;
      setPosition({
        left: Math.max(VIEWPORT_MARGIN, Math.min(x + 4, viewportWidth - width - VIEWPORT_MARGIN)),
        top: Math.max(VIEWPORT_MARGIN, Math.min(y + 4, viewportHeight - height - VIEWPORT_MARGIN)),
      });
    }
    keepOnScreen();
    const observer = new ResizeObserver(keepOnScreen);
    observer.observe(element);
    return () => observer.disconnect();
  }, [x, y, menuRef]);

  return (
    <Paper
      ref={menuRef}
      elevation={8}
      sx={{
        position: "fixed",
        left: position.left,
        top: position.top,
        p: 1.5,
        zIndex: 20,
        minWidth: `min(200px, calc(100vw - ${2 * VIEWPORT_MARGIN}px))`,
        maxWidth: `calc(100vw - ${2 * VIEWPORT_MARGIN}px)`,
        maxHeight: `calc(100dvh - ${2 * VIEWPORT_MARGIN}px)`,
        overflowY: "auto",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      {children}
    </Paper>
  );
}
