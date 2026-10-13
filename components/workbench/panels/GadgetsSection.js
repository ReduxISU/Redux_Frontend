// components/workbench/panels/GadgetsSection.js
//
// #229 stage 4: the Gadgets section at the bottom of the Result panel's reduction result
// (Reduce mode, after a run). Closed by default, titled "Gadgets (n)", and not rendered at all
// when the reduction lists no gadgets (or the backend sends none: see lib/gadgets.js).
//
// Groups follow data/gadgetKinds.js (Bounds, Groups, Edge rules, Elements, then Palette and
// Or-gadgets), each with its count and one-line explanation. A row reads source -> target with
// the gadget's note under it; a group shows its first GADGET_ROW_LIMIT rows and a "Show all n"
// button. Hovering or focusing a row tells the workbench which gadget to highlight on the two
// pictures (`onHighlight`), and the row itself is marked while its gadget is the one drawn.

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import { useState } from "react";
import { GADGET_EMPTY_SIDE, GADGET_ROW_LIMIT, GADGETS_INTRO } from "../../../data/gadgetKinds";
import { describeGadgetId, groupGadgets } from "../../../lib/gadgets";
import { paletteVars } from "../../theme";
import { MONO_FONT, secondaryButtonSx } from "../layout";

const ARROW = "→";

function sideText(ids, frame, emptyText) {
  return ids.length > 0 ? ids.map((id) => describeGadgetId(id, frame)).join(", ") : emptyText;
}

function GadgetRow({ idPrefix, gadget, sourceFrame, targetFrame, active, onHighlight }) {
  const source = sideText(gadget.sourceIds, sourceFrame, GADGET_EMPTY_SIDE.source);
  const target = sideText(gadget.targetIds, targetFrame, GADGET_EMPTY_SIDE.target);
  const rowId = `${idPrefix}-row-${gadget.index}`;
  const enter = () => onHighlight(gadget.index);
  const leave = () => onHighlight(null, gadget.index);

  return (
    <Box
      component="li"
      id={rowId}
      tabIndex={0}
      aria-label={`${source} becomes ${target}`}
      aria-describedby={gadget.note ? `${rowId}-note` : undefined}
      aria-current={active ? "true" : undefined}
      data-active={active ? "true" : "false"}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.25,
        px: 1.25,
        py: 0.75,
        borderRadius: "6px",
        backgroundColor: "surface.input",
        border: "1px solid",
        borderColor: active ? paletteVars.viz.gadget : "border.soft",
        boxShadow: active ? `inset 3px 0 0 ${paletteVars.viz.gadget}` : "none",
        cursor: "default",
        outlineOffset: "2px",
      }}
    >
      <Box
        component="span"
        aria-hidden="true"
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          gap: "4px 8px",
          fontFamily: MONO_FONT,
          fontSize: "0.8125rem",
        }}
      >
        <Box component="span" sx={{ overflowWrap: "anywhere" }}>
          {source}
        </Box>
        <Box component="span" sx={{ color: "text.secondary" }}>
          {ARROW}
        </Box>
        <Box component="span" sx={{ overflowWrap: "anywhere" }}>
          {target}
        </Box>
      </Box>
      {gadget.note && (
        <Box component="span" id={`${rowId}-note`} sx={{ fontSize: "0.75rem", color: "ink.text2" }}>
          {gadget.note}
        </Box>
      )}
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} props.idPrefix Prefixes every id rendered here.
 * @param {Object[]} props.gadgets The reduction's gadgets, as lib/gadgets.js's
 *   normalizeGadgets returns them. Nothing renders when empty.
 * @param {Object|null} props.sourceFrame The source picture's frame, for readable names.
 * @param {Object|null} props.targetFrame The target picture's frame, for readable names.
 * @param {number|null} props.activeIndex The gadget the pictures are highlighting.
 * @param {(index: number|null, leaving?: number) => void} props.onHighlight Called with a
 *   gadget's index when its row is hovered or focused, and with null (plus the row it is
 *   leaving) when the pointer or focus leaves it.
 */
export default function GadgetsSection({
  idPrefix,
  gadgets,
  sourceFrame,
  targetFrame,
  activeIndex,
  onHighlight,
}) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState({});
  if (!gadgets || gadgets.length === 0) return null;

  const groups = groupGadgets(gadgets);
  const bodyId = `${idPrefix}-body`;

  return (
    <Box
      id={idPrefix}
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        borderTop: "1px solid",
        borderColor: "border.soft",
        pt: 1.5,
      }}
    >
      <Box
        id={`${idPrefix}-toggle`}
        component="button"
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => {
          if (open) onHighlight(null);
          setOpen((current) => !current);
        }}
        sx={{
          alignSelf: "flex-start",
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          background: "none",
          border: "none",
          color: "text.primary",
          p: 0,
          fontFamily: "inherit",
          fontSize: "0.9375rem",
          fontWeight: 600,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <ExpandMoreIcon
          aria-hidden="true"
          sx={{ fontSize: 18, transform: open ? "none" : "rotate(-90deg)" }}
        />
        Gadgets{" "}
        <Box
          component="span"
          id={`${idPrefix}-count`}
          sx={{ fontWeight: 400, color: "text.secondary" }}
        >
          ({gadgets.length})
        </Box>
      </Box>
      <Box
        id={bodyId}
        hidden={!open}
        sx={{ display: open ? "flex" : "none", flexDirection: "column", gap: 1.75 }}
      >
        <Box id={`${idPrefix}-intro`} sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>
          {GADGETS_INTRO}
        </Box>
        {groups.map((group) => {
          const groupId = `${idPrefix}-group-${group.kind}`;
          const all = Boolean(showAll[group.kind]);
          const more = group.rows.length > GADGET_ROW_LIMIT;
          const rows = all || !more ? group.rows : group.rows.slice(0, GADGET_ROW_LIMIT);
          return (
            <Box
              key={group.kind}
              id={groupId}
              data-gadget-kind={group.kind}
              sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}
            >
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                <Box component="strong" id={`${groupId}-label`} sx={{ fontSize: "0.875rem" }}>
                  {group.label}
                </Box>
                <Box
                  component="span"
                  id={`${groupId}-count`}
                  sx={{ fontSize: "0.8125rem", color: "text.secondary" }}
                >
                  {group.rows.length} {group.rows.length === 1 ? "gadget" : "gadgets"}
                </Box>
              </Box>
              <Box id={`${groupId}-about`} sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                {group.about}
              </Box>
              <Box
                component="ul"
                id={`${groupId}-rows`}
                aria-labelledby={`${groupId}-label`}
                sx={{
                  listStyle: "none",
                  m: 0,
                  p: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                }}
              >
                {rows.map((gadget) => (
                  <GadgetRow
                    key={gadget.index}
                    idPrefix={idPrefix}
                    gadget={gadget}
                    sourceFrame={sourceFrame}
                    targetFrame={targetFrame}
                    active={gadget.index === activeIndex}
                    onHighlight={onHighlight}
                  />
                ))}
              </Box>
              {more && (
                <Box
                  id={`${groupId}-more`}
                  component="button"
                  type="button"
                  aria-expanded={all}
                  aria-controls={`${groupId}-rows`}
                  onClick={() =>
                    setShowAll((current) => ({ ...current, [group.kind]: !current[group.kind] }))
                  }
                  sx={{ ...secondaryButtonSx, alignSelf: "flex-start", px: 1.5 }}
                >
                  {all ? "Show fewer" : `Show all ${group.rows.length}`}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
