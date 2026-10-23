// hooks/useWorkbenchLayout.js
//
// #279 (stage 1): which parts of the problem page are shown. The rail's five toggles show and
// hide the Details and Instance panes and the Workspace's three sections (Visualization,
// Execute, Verify), and Details and Instance each have their own Show all / Show less. Reset
// layout shows everything again and collapses Details and Instance.
//
// #279 stage 3: it also keeps whether the viewer opened or closed Algorithm Steps (`stepsOpen`).
// Until they do it is null, and Algorithm Steps opens by itself once a run gives it steps; once
// they do, their choice holds until Reset layout, which makes it null again.
//
// #279 (Workspace tweaks): Visualization, Execute and Verify have a Show all / Show less of their
// own too. Every pane starts collapsed but Visualization (open), for a viewer with no saved
// layout; a saved layout wins. The layout also keeps whether the pictures highlight the
// reduction's gadgets in color (`highlightGadgets`, off by default: the pictures are plain until
// asked). Reset layout goes back to those defaults and turns the highlight off.
//
// The layout is the viewer's own, so it is kept in this browser (localStorage) for the next
// visit, for every problem alike. Every read and write is wrapped: with storage blocked (private
// windows, previews) the layout lasts for the page and starts from the defaults.
//
// The Workbench only renders in the browser (the page shows just its chrome until the router is
// ready and the problem has loaded), so reading storage in the initial state can't make the
// first render differ from a server render.

import { useCallback, useState } from "react";

const STORAGE_KEY = "redux-frontend.workbenchLayout";

/** The rail's keys, in order: two panes, then the Workspace's three sections. */
export const LAYOUT_KEYS = ["details", "instance", "visualization", "execute", "verify"];

/** The panes that were sections of one Workspace card before #279's Workspace tweaks. */
export const WORKSPACE_SECTIONS = ["visualization", "execute", "verify"];

/** The panes and sections with a Show all / Show less of their own. */
export const EXPANDABLE_PANES = ["details", "instance", ...WORKSPACE_SECTIONS];

function defaultLayout() {
  return {
    shown: Object.fromEntries(LAYOUT_KEYS.map((key) => [key, true])),
    // Every pane starts collapsed but Visualization, so the picture leads.
    expanded: Object.fromEntries(EXPANDABLE_PANES.map((key) => [key, key === "visualization"])),
    stepsOpen: null,
    highlightGadgets: false,
  };
}

/** The stored layout, keeping only known keys with boolean values; the defaults otherwise. */
function readLayout() {
  const layout = defaultLayout();
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    for (const group of ["shown", "expanded"]) {
      for (const key of Object.keys(layout[group])) {
        if (typeof stored?.[group]?.[key] === "boolean") layout[group][key] = stored[group][key];
      }
    }
    if (typeof stored?.stepsOpen === "boolean") layout.stepsOpen = stored.stepsOpen;
    if (typeof stored?.highlightGadgets === "boolean") {
      layout.highlightGadgets = stored.highlightGadgets;
    }
  } catch {
    // Storage blocked or unreadable: the defaults.
  }
  return layout;
}

function writeLayout(layout) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Storage blocked: the layout lasts for this page.
  }
}

/**
 * @returns {{
 *   shown: {[key: string]: boolean},
 *   expanded: {[key: string]: boolean},
 *   toggle: (key: string) => void,
 *   show: (key: string) => void,
 *   setExpanded: (key: string, expanded: boolean) => void,
 *   stepsOpen: boolean|null,
 *   setStepsOpen: (open: boolean) => void,
 *   highlightGadgets: boolean,
 *   setHighlightGadgets: (on: boolean) => void,
 *   reset: () => void,
 * }}
 */
export default function useWorkbenchLayout() {
  const [layout, setLayout] = useState(readLayout);

  const update = useCallback((change) => {
    setLayout((current) => {
      const next = change(current);
      writeLayout(next);
      return next;
    });
  }, []);

  const toggle = useCallback(
    (key) =>
      update((current) => ({
        ...current,
        shown: { ...current.shown, [key]: !current.shown[key] },
      })),
    [update],
  );
  const show = useCallback(
    (key) =>
      update((current) =>
        current.shown[key] ? current : { ...current, shown: { ...current.shown, [key]: true } },
      ),
    [update],
  );
  const setExpanded = useCallback(
    (key, expanded) =>
      update((current) => ({ ...current, expanded: { ...current.expanded, [key]: expanded } })),
    [update],
  );
  const setStepsOpen = useCallback(
    (open) => update((current) => ({ ...current, stepsOpen: open })),
    [update],
  );
  const setHighlightGadgets = useCallback(
    (on) => update((current) => ({ ...current, highlightGadgets: on })),
    [update],
  );
  const reset = useCallback(() => update(() => defaultLayout()), [update]);

  return {
    shown: layout.shown,
    expanded: layout.expanded,
    toggle,
    show,
    setExpanded,
    stepsOpen: layout.stepsOpen,
    setStepsOpen,
    highlightGadgets: layout.highlightGadgets,
    setHighlightGadgets,
    reset,
  };
}
