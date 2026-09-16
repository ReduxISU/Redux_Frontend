// components/ProblemDetailLayout.js
//
// T18 (#27) — holds the five Problem Detail sections (Overview,
// Visualizations, Solvers, Verifier, Reductions), lets them be dragged into
// a different order by their SectionShell grip, and tracks which are
// collapsed. Pattern ported from Redux_GUI's pages/index.js (SortableRow,
// handleDragEnd, the @dnd-kit sensors/DndContext/SortableContext wiring) —
// same @dnd-kit packages, this is a fresh implementation against this
// repo's own component shape, not a copy of that file (issue body: "write
// our own version of the pattern rather than copying the file wholesale").
//
// --- Decision: does "Reset to default" also reset collapse state? --------
// NO — it restores order only. Collapse state is left untouched.
//
// Recorded as a decision comment on issue #27 per CLAUDE.md's "Recording
// decisions" section. Reasoning, in short: both the issue body and
// TASKLIST.md's T18 entry describe order and collapse state as two
// independent axes ("Each section collapses independently, and collapse
// state is separate from order"), and the "Done when" list only ever asks
// Reset to restore "the canonical order" — never mentions collapse. Keeping
// them independent also means SectionShell doesn't need to become a
// controlled component for this task (it stays exactly as T15 left it,
// beyond the new dragHandleProps passthrough), which is the smaller, more
// obviously-correct change. Rejected alternative: making Reset also
// re-collapse/re-expand every section, which would require lifting
// SectionShell's `expanded` state up into this component (an
// expanded/onToggle prop pair, falling back to the existing internal
// useState when absent) — defensible, but a larger change for a behavior
// neither doc actually asks for.
//
// --- Grip scoping (issue done-when: "dragging elsewhere on the header does
// not [reorder]") ---------------------------------------------------------
// SortableSection below calls useSortable({id}) and clones its child with
// `dragHandleProps: { attributes, listeners }` rather than attaching those
// to the whole row — exactly Redux_GUI's SortableRow pattern. Each section
// component forwards that prop straight through to its own SectionShell
// call, which spreads it only onto the grip Box (see that file's T18
// comment). So the drag activator is scoped to the grip alone; nothing else
// in the header — including the chevron/title button — carries a listener.
//
// --- Keyboard support ------------------------------------------------------
// Sensors are PointerSensor + TouchSensor (ported from Redux_GUI) plus a
// KeyboardSensor with `sortableKeyboardCoordinates` — an explicit,
// non-optional v1 accessibility requirement per the issue body, and not
// something Redux_GUI's own version has. Space picks a section up, arrow
// keys move it, Space drops it, Escape cancels — standard @dnd-kit
// sortable-preset keyboard behavior once the sensor is registered.
//
// --- Screen-reader announcements -------------------------------------------
// DndContext's default announcements say generic things like "Draggable
// item overview was moved...". SECTION_ANNOUNCEMENTS below overrides them
// with text naming the real section title instead.
//
// --- Decision: the problem instance is one shared value, owned here --------
// T35 (#93). Solvers and Verifier both need a problem instance, and this
// component holds the single copy of it. Both sections render their own
// editable input bound to that one value, so editing either updates both.
//
// Ratified on #93 by the project owner: verifying a certificate against a
// different instance than the one that was solved is a silent, meaningless
// error, and two independent inputs allow exactly that with no signal to
// the user. One value makes it impossible. Both sections still get their
// own control because sections are independently collapsible (and default
// to collapsed) and drag-reorderable, so a single control living inside
// one section can be hidden, or can sit below the section that needs it.
// This component is the right owner because it already holds section-order
// state and already renders both sections from SECTIONS. pages/[problem].js
// passes only `problem` and stays that way.
//
// --- Persistence (#154) ---------------------------------------------------
// `order` is now persisted to localStorage and hydrated back in once this
// component has mounted (SECTION_ORDER_STORAGE_KEY below) — the project
// owner asking for exactly this on #154, which is what reverses the "no
// persistence" decision T18/#27 originally recorded here (kept below for the
// record). Collapse state is untouched by this: it stays exactly where #27
// left it, inside SectionShell's own internal useState, never lifted up into
// this component and never written to storage — #154's own scope for this
// component is `order` only.
//
// Hydration happens in a mount effect rather than in useState's own lazy
// initializer: this page has no getServerSideProps, but Next.js still
// prerenders it, and localStorage does not exist during that render, so the
// first client render has to match the prerendered DEFAULT_ORDER exactly to
// hydrate cleanly. The effect corrects `order` immediately after mounting,
// the same "start at a safe default, correct once the client can look" shape
// components/StartupSplash.js's own mount check uses for the same reason
// (that file's header comment covers the SSR/hydration mechanics in more
// detail).
//
// "Reset to default" (handleReset below) is the explicit escape hatch #154's
// issue body calls for ("A visible 'Reset to default' control already
// exists for section order per the README — this should remain the escape
// hatch back to defaults"): it clears the persisted value as well as the
// in-memory order, so pressing it lands a visitor on DEFAULT_ORDER on their
// next visit too, not just for the rest of the current session.
//
// --- Original #27 decision, kept for the record ---------------------------
// `order` was plain component-local useState. No localStorage, no URL
// params — per the issue body and TASKLIST.md's T18 entry ("do not add
// persistence ... unless the project owner asks").
//
// --- The shared Run action (T48/#111, INTERACTIVE_LAYER_DESIGN.md §2.1.1) --
// Run is one shared action, lifted here because this is where the instance it
// acts on already lives. It is not a fetch itself -- each section that
// declares `usesRun` (Solvers, Visualizations; Reductions joins in T53) still
// owns its own request (a `/solve` failure and a `/visualize` failure are
// independent outcomes, shown in their own panels, never all-or-nothing).
// What's shared is just the trigger: `runToken` is a counter bumped by
// `triggerRun`, passed to every `usesRun` section alongside it, so pressing
// Run in ANY of them re-runs every one of them against the same instant of
// the shared instance -- Solvers keeps its own selected solver, Visualizations
// its own selected visualization, and the token carries no data of its own,
// just the "go" signal.

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { cloneElement, useEffect, useLayoutEffect, useState } from "react";
import OverviewSection from "./detail/OverviewSection";
import ReductionsSection from "./detail/ReductionsSection";
import SolversSection from "./detail/SolversSection";
import VerifierSection from "./detail/VerifierSection";
import VisualizationsSection from "./detail/VisualizationsSection";

// Default order per the ratified "move Reduce pane below Verify" decision
// (TASKLIST.md T18 entry) — Reductions goes last deliberately, not by
// omission.
//
// `usesInstance` marks the sections that take the shared problem instance
// (T35/#93, see header). `usesRun` marks the ones that also react to the
// shared Run trigger (T48/#111, see header) -- Verifier deliberately does
// not: Verify checks a user-supplied certificate against an instance, it
// does not run a solver, and its certificate has no guaranteed relationship
// to a fresh /visualize call (INTERACTIVE_LAYER_DESIGN.md §2.1). Reductions
// joins `usesRun` in T53 (#116), now that it has real data to refresh.
//
// `providesCertificate`/`usesCertificate` (T53) are the other half of that same wiring:
// `ProblemProvider/visualizeReduction` requires a certificate for the source instance
// (INTERACTIVE_LAYER_DESIGN.md §1.3), and the only thing that ever produces one is a
// completed Solvers run -- so Solvers reports its own solve's output up through
// `onCertificateChange`, this component holds the one shared copy the same way it holds
// `instance`, and Reductions reads it back as `certificate`.
const SECTIONS = [
  { key: "overview", title: "Overview", Component: OverviewSection },
  {
    key: "visualizations",
    title: "Visualizations",
    Component: VisualizationsSection,
    usesInstance: true,
    usesRun: true,
  },
  {
    key: "solvers",
    title: "Solvers",
    Component: SolversSection,
    usesInstance: true,
    usesRun: true,
    providesCertificate: true,
  },
  { key: "verifier", title: "Verifier", Component: VerifierSection, usesInstance: true },
  {
    key: "reductions",
    title: "Reductions",
    Component: ReductionsSection,
    usesInstance: true,
    usesRun: true,
    usesCertificate: true,
  },
];

const SECTIONS_BY_KEY = new Map(SECTIONS.map((section) => [section.key, section]));
const DEFAULT_ORDER = SECTIONS.map((section) => section.key);

// #154: useLayoutEffect on the client, useEffect on the server -- same
// pattern and same reasoning as components/StartupSplash.js's own
// useIsomorphicLayoutEffect (that file's header covers it in detail): a
// setState called synchronously from a plain useEffect flags eslint's
// react-hooks/set-state-in-effect rule (the intended fix for that rule is
// almost always "don't setState from a fetch/subscription effect", which
// isn't what's happening here), and separately, a layout effect corrects
// `order` before the browser paints, so a returning visitor never sees a
// frame of DEFAULT_ORDER before it snaps to their saved one.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// #154: namespaced (`redux-frontend:` prefix, matching pages/index.js's own
// HOME_FILTERS_STORAGE_KEY) so this can't collide with
// components/StartupSplash.js's own localStorage key or anything else that
// might land in this origin's storage later.
const SECTION_ORDER_STORAGE_KEY = "redux-frontend:problem-detail-section-order";
// Bumped whenever the shape written below changes -- see readStoredOrder.
const SECTION_ORDER_STORAGE_VERSION = 1;

function sectionTitle(key) {
  return SECTIONS_BY_KEY.get(key)?.title ?? key;
}

// #154: reads this browser's last-saved section order. Returns null for
// "nothing stored", which also covers every way a stored value can fail to
// apply cleanly: localStorage throwing outright (see components/
// StartupSplash.js's readStoredBootId for the same caveat -- Safari private
// mode, cookie-blocking policies), the value not being valid JSON, the
// parsed value not matching SECTION_ORDER_STORAGE_VERSION, or the order it
// names not being a clean permutation of DEFAULT_ORDER (a stale value from
// before a section was added/removed/renamed, or a hand-edited one). Any of
// those degrades to "nothing stored" rather than crashing the page or
// applying a partial/duplicated order.
function readStoredOrder() {
  let raw;
  try {
    raw = window.localStorage.getItem(SECTION_ORDER_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    parsed.version !== SECTION_ORDER_STORAGE_VERSION ||
    !Array.isArray(parsed.order)
  ) {
    return null;
  }

  const isValidPermutation =
    parsed.order.length === DEFAULT_ORDER.length &&
    new Set(parsed.order).size === DEFAULT_ORDER.length &&
    DEFAULT_ORDER.every((key) => parsed.order.includes(key));
  return isValidPermutation ? parsed.order : null;
}

// #154: writes the current section order as this browser's last-saved
// state. Write failures are silently ignored, same as StartupSplash's own
// writeStoredBootId and for the same reason -- there is nowhere better to
// surface a storage failure, and it should never block the reorder that
// triggered it.
function writeStoredOrder(order) {
  try {
    window.localStorage.setItem(
      SECTION_ORDER_STORAGE_KEY,
      JSON.stringify({ version: SECTION_ORDER_STORAGE_VERSION, order }),
    );
  } catch {
    // Nothing to do: see readStoredOrder.
  }
}

// #154: "Reset to default" (handleReset below) clears the persisted value
// outright rather than overwriting it with DEFAULT_ORDER, so a future
// readStoredOrder call reports "nothing stored" and this component's own
// useState(DEFAULT_ORDER) default is what a later visit starts from --
// functionally identical to writing DEFAULT_ORDER back, but it reads more
// directly as "there is no longer a saved preference" than "the saved
// preference happens to match the default".
function clearStoredOrder() {
  try {
    window.localStorage.removeItem(SECTION_ORDER_STORAGE_KEY);
  } catch {
    // Nothing to do: see readStoredOrder.
  }
}

// Overridden @dnd-kit live-region announcements (issue done-when: name the
// real section, not the library's generic "sortable item" defaults). Pure
// function of section keys, so this can live at module scope rather than
// being rebuilt every render.
const SECTION_ANNOUNCEMENTS = {
  onDragStart({ active }) {
    return `Picked up the ${sectionTitle(active.id)} section. Use the arrow keys to move it, space bar to drop, escape to cancel.`;
  },
  onDragOver({ active, over }) {
    if (over && active.id !== over.id) {
      return `The ${sectionTitle(active.id)} section was moved next to the ${sectionTitle(over.id)} section.`;
    }
    return `The ${sectionTitle(active.id)} section is back in its original position.`;
  },
  onDragEnd({ active, over }) {
    if (over) {
      return `The ${sectionTitle(active.id)} section was dropped next to the ${sectionTitle(over.id)} section.`;
    }
    return `The ${sectionTitle(active.id)} section was dropped.`;
  },
  onDragCancel({ active }) {
    return `Reordering the ${sectionTitle(active.id)} section was cancelled.`;
  },
};

// Ported from Redux_GUI's pages/index.js `SortableRow` — clones its single
// child with `dragHandleProps` rather than spreading drag attributes/
// listeners on the row itself, so the child (a section component) can hand
// them to just its grip.
function SortableSection({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    opacity: isDragging ? 0.6 : 1,
  };

  const childWithDragHandle = cloneElement(children, {
    dragHandleProps: { attributes, listeners },
  });

  return (
    <Box ref={setNodeRef} style={style}>
      {childWithDragHandle}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {Object} props.problem A data/fixtures.js-shaped FixtureProblem,
 *   passed straight through to every section.
 */
export default function ProblemDetailLayout({ problem }) {
  const [order, setOrder] = useState(DEFAULT_ORDER);

  // #154: hydrate `order` from this browser's last-saved value once mounted
  // -- see this file's own "Persistence (#154)" header comment above for why
  // this is a mount effect rather than useState's lazy initializer, and
  // useIsomorphicLayoutEffect's own comment above for why it's a layout
  // effect rather than a plain one.
  useIsomorphicLayoutEffect(() => {
    const stored = readStoredOrder();
    if (stored) {
      setOrder(stored);
    }
  }, []);

  // The shared problem instance (T35/#93), pre-filled from the problem's
  // real declared `defaultInstance`.
  const [instance, setInstance] = useState(problem.defaultInstance ?? "");

  // The shared certificate (T53/#116, see header) -- `null` until Solvers' own Run
  // produces one. Shaped `{ value, instance }` (mirroring SolversSection's own
  // `liveResult`/`instanceChangedSinceRun` pattern) so a consumer can tell a certificate
  // for the *current* instance apart from a stale one left over from a since-edited box.
  const [certificate, setCertificate] = useState(null);

  // Re-seed the box when the page switches to a different problem, so one
  // problem's instance can never be left sitting in another's input. In
  // practice pages/[problem].js unmounts this component while the next
  // problem is loading, which would reset the state anyway, but that is a
  // side effect of how the loading state happens to be rendered rather
  // than something this component should depend on. React's documented
  // "adjust state when a prop changes" pattern, not an effect: it settles
  // during the same render instead of flashing the previous problem's
  // instance for a frame first. The certificate resets alongside it -- a
  // certificate for the previous problem's instance is never valid here.
  const [instanceProblemName, setInstanceProblemName] = useState(problem.name);
  if (instanceProblemName !== problem.name) {
    setInstanceProblemName(problem.name);
    setInstance(problem.defaultInstance ?? "");
    setCertificate(null);
  }

  // The shared Run trigger (T48/#111, see file header). A `usesRun` section
  // reacts to this changing, not to its value -- it is a "go" signal, not a
  // payload.
  const [runToken, setRunToken] = useState(0);
  function triggerRun() {
    setRunToken((token) => token + 1);
  }

  // PointerSensor covers mouse; TouchSensor adds mobile/tablet support
  // (both ported from Redux_GUI). KeyboardSensor is new here — see file
  // header.
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        const next = arrayMove(items, oldIndex, newIndex);
        // #154: persisted at the point the order actually changes, same as
        // every other write-on-change path in this codebase.
        writeStoredOrder(next);
        return next;
      });
    }
  }

  function handleReset() {
    setOrder(DEFAULT_ORDER);
    // #154: Reset to default is the explicit escape hatch back to defaults
    // -- clearing the persisted value too means it stays gone on the next
    // visit, not just for the rest of this session (see this file's own
    // "Persistence (#154)" header comment).
    clearStoredOrder();
  }

  const currentLayoutText = order.map(sectionTitle).join(", ");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          columnGap: 1.5,
          rowGap: 0.5,
        }}
      >
        <DragIndicatorIcon aria-hidden="true" fontSize="small" sx={{ color: "text.secondary" }} />
        {/* T30 (#39): id added so tests/e2e/detail.spec.js can read the
            current order back out of real page text (this line is the only
            place it's rendered as text) rather than reimplementing "what
            order are the sections in" via a separate DOM query. */}
        <Typography
          id="detail-layout-status"
          variant="body2"
          component="span"
          sx={{ color: "text.secondary", flex: 1, minWidth: 0 }}
        >
          Drag any section by its grip to reorder. Click a chevron to expand. Current layout:{" "}
          {currentLayoutText}.
        </Typography>
        <Box
          id="detail-layout-reset"
          component="button"
          type="button"
          onClick={handleReset}
          sx={{
            border: "none",
            background: "none",
            p: 0,
            color: "primary.main",
            font: "inherit",
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "underline",
            flexShrink: 0,
          }}
        >
          Reset to default
        </Box>
      </Box>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        accessibility={{ announcements: SECTION_ANNOUNCEMENTS }}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {order.map((key) => {
              const { Component, usesInstance, usesRun, providesCertificate, usesCertificate } =
                SECTIONS_BY_KEY.get(key);
              const instanceProps = usesInstance
                ? { instanceValue: instance, onInstanceChange: setInstance }
                : null;
              const runProps = usesRun ? { runToken, onRunRequest: triggerRun } : null;
              const certificateProps = providesCertificate
                ? { onCertificateChange: setCertificate }
                : usesCertificate
                  ? { certificate }
                  : null;
              return (
                <SortableSection key={key} id={key}>
                  <Component
                    problem={problem}
                    {...instanceProps}
                    {...runProps}
                    {...certificateProps}
                  />
                </SortableSection>
              );
            })}
          </Box>
        </SortableContext>
      </DndContext>
    </Box>
  );
}
