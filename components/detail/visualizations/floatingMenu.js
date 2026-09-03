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
import { useEffect } from "react";

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

export function FloatingMenu({ menuRef, x, y, children }) {
  return (
    <Paper
      ref={menuRef}
      elevation={8}
      sx={{
        position: "fixed",
        left: x + 4,
        top: y + 4,
        p: 1.5,
        zIndex: 20,
        minWidth: 200,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      {children}
    </Paper>
  );
}
