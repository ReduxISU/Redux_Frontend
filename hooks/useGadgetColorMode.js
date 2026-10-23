// hooks/useGadgetColorMode.js
//
// #239: the Reduction View's gadget marks, Plain or Color. Plain marks a gadget in the gadget
// gold while it is pointed at; Color gives every gadget its own color, on both pictures, all the
// time. The choice is the viewer's own, so it is kept in this browser (localStorage) for the
// next visit, and the page works the same when storage is blocked (private windows, previews):
// every read and write is wrapped, the choice then lasts for the page, and Plain is the default.

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "redux-frontend.gadgetMarks";
const MODES = new Set(["plain", "color"]);

// The choice for this page, when storage can't hold it.
let pageMode = null;
const listeners = new Set();

function readMode() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (MODES.has(value)) return value;
  } catch {
    // Storage blocked: fall back to this page's choice.
  }
  return pageMode ?? "plain";
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * @returns {["plain"|"color", (mode: "plain"|"color") => void]}
 */
export default function useGadgetColorMode() {
  // Plain on the server (and so on the first, hydrating render), then the stored choice.
  const mode = useSyncExternalStore(subscribe, readMode, () => "plain");
  const setMode = useCallback((next) => {
    if (!MODES.has(next)) return;
    pageMode = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked: pageMode holds it for this page.
    }
    for (const listener of listeners) listener();
  }, []);
  return [mode, setMode];
}
