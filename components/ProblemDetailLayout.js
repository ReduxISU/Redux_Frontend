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
// --- No persistence ---------------------------------------------------------
// `order` is plain component-local useState. No localStorage, no URL
// params — per the issue body and TASKLIST.md's T18 entry ("do not add
// persistence ... unless the project owner asks").

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
import { cloneElement, useState } from "react";
import OverviewSection from "./detail/OverviewSection";
import ReductionsSection from "./detail/ReductionsSection";
import SolversSection from "./detail/SolversSection";
import VerifierSection from "./detail/VerifierSection";
import VisualizationsSection from "./detail/VisualizationsSection";

// Default order per the ratified "move Reduce pane below Verify" decision
// (TASKLIST.md T18 entry) — Reductions goes last deliberately, not by
// omission.
const SECTIONS = [
  { key: "overview", title: "Overview", Component: OverviewSection },
  { key: "visualizations", title: "Visualizations", Component: VisualizationsSection },
  { key: "solvers", title: "Solvers", Component: SolversSection },
  { key: "verifier", title: "Verifier", Component: VerifierSection },
  { key: "reductions", title: "Reductions", Component: ReductionsSection },
];

const SECTIONS_BY_KEY = new Map(SECTIONS.map((section) => [section.key, section]));
const DEFAULT_ORDER = SECTIONS.map((section) => section.key);

function sectionTitle(key) {
  return SECTIONS_BY_KEY.get(key)?.title ?? key;
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
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function handleReset() {
    setOrder(DEFAULT_ORDER);
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
              const { Component } = SECTIONS_BY_KEY.get(key);
              return (
                <SortableSection key={key} id={key}>
                  <Component problem={problem} />
                </SortableSection>
              );
            })}
          </Box>
        </SortableContext>
      </DndContext>
    </Box>
  );
}
