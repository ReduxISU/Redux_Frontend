// components/workbench/TaggedSelect.js
//
// #229 stage 2: the workbench's tagged dropdown, used for Solver, To, Using and every
// Visualization Type. A custom listbox rather than a native <select> or MUI Select, so each
// choice can carry its tags:
//   - the closed box shows the chosen item's name on the left and its tags on the right; the
//     name truncates (with an ellipsis) before the tags give up any room;
//   - the open list shows every option with its tags right-aligned, 44px rows, the chosen one
//     on a raised background with a 3px accent mark on its left;
//   - hovering an option with a mouse shows that option's info card beside the list (left of
//     it for right-aligned dropdowns). Option cards are hover-only: `(hover: none)` hides
//     them, and keyboard and touch users get the same card from the (i) button instead;
//   - an (i) button after the label shows the card for the current choice on hover, keyboard
//     focus or tap (a tap toggles it, Escape closes it).
//
// Keyboard and screen readers follow the WAI-ARIA listbox pattern: the button has
// aria-haspopup="listbox", aria-expanded and aria-controls; opening it moves focus to the
// role="listbox" element, which tracks the active option with aria-activedescendant. Arrow
// keys move, Home and End jump, Enter or Space picks, Escape closes and returns focus to the
// button, Tab closes and moves on, and typing letters jumps to the next option starting with
// them. A click outside closes it.
//
// Every id derives from the `id` prop (or React's useId when none is given), so any number of
// these can share a page (ground rule 4).

import Box from "@mui/material/Box";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { paletteVars } from "../theme";
import { controlLabelSx, MONO_FONT } from "./layout";

const ROW_HEIGHT = 44;
const LIST_MAX_WIDTH = "min(460px, calc(100vw - 32px))";
const CARD_WIDTH = "min(300px, calc(100vw - 32px))";
const VIEWPORT_MARGIN = 8;
const TYPEAHEAD_RESET_MS = 600;

/** Keeps an absolutely placed popup inside the viewport by nudging it sideways. */
function useKeepInViewport(ref, active, contentKey) {
  const [shift, setShift] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: contentKey re-measures new content
  useLayoutEffect(() => {
    if (!active || !ref.current) {
      setShift(0);
      return;
    }
    const element = ref.current;
    const previous = element.style.translate;
    element.style.translate = "0px";
    const rect = element.getBoundingClientRect();
    element.style.translate = previous;
    const viewportWidth = document.documentElement.clientWidth;
    let next = 0;
    if (rect.right > viewportWidth - VIEWPORT_MARGIN) {
      next = viewportWidth - VIEWPORT_MARGIN - rect.right;
    }
    if (rect.left + next < VIEWPORT_MARGIN) next = VIEWPORT_MARGIN - rect.left;
    setShift(next);
  }, [active, ref, contentKey]);
  return shift;
}

/** One tag pill in a tag hue (the theme's `tag.*` tokens: blue, violet, cyan, ...). */
function Tag({ label, hue }) {
  const colors = paletteVars.tag[hue] ?? paletteVars.facet.fallback;
  return (
    <Box
      component="span"
      sx={{
        fontSize: "0.6875rem",
        fontWeight: 600,
        lineHeight: 1.5,
        px: 1,
        py: "1px",
        borderRadius: 999,
        border: `1px solid ${colors.rowBorder ?? colors.border}`,
        backgroundColor: colors.bg,
        color: colors.text,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}

function TagList({ id, tags, hue, sx }) {
  if (!tags || tags.length === 0) return null;
  return (
    <Box
      component="span"
      id={id}
      data-testid="tag-list"
      sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end", ...sx }}
    >
      {tags.map((tag) => (
        <Tag key={tag.key} label={tag.label} hue={hue} />
      ))}
    </Box>
  );
}

/**
 * An info card: name, kind line, one-line description, then facts.
 * @param {Object} props
 * @param {import("./infoCards").Card} props.card
 */
export function InfoCard({ card, id, role, hidden, sx, cardRef, ...rest }) {
  return (
    <Box
      id={id}
      ref={cardRef}
      role={role}
      hidden={hidden}
      {...rest}
      sx={{
        position: "absolute",
        zIndex: 60,
        width: CARD_WIDTH,
        boxSizing: "border-box",
        display: hidden ? "none" : "flex",
        flexDirection: "column",
        gap: 1,
        px: 1.75,
        py: 1.5,
        borderRadius: "10px",
        backgroundColor: "surface.main",
        border: "1px solid",
        borderColor: "border.strong",
        boxShadow: 8,
        color: "text.primary",
        fontWeight: 400,
        textAlign: "left",
        whiteSpace: "normal",
        ...sx,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <Box component="strong" sx={{ fontSize: "0.9375rem" }}>
          {card.title}
        </Box>
        <Box component="span" sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
          {card.kind}
        </Box>
      </Box>
      {card.description && (
        <Box
          sx={{
            fontSize: "0.8125rem",
            lineHeight: 1.4,
            color: "ink.text2",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {card.description}
        </Box>
      )}
      <Box
        component="dl"
        sx={{
          m: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0.75,
          borderTop: "1px solid",
          borderColor: "border.soft",
          pt: 1,
        }}
      >
        {card.facts.map((fact) => (
          <Box
            key={fact.label}
            sx={{
              display: "grid",
              gridTemplateColumns: "72px 1fr",
              gap: 1.25,
              fontSize: "0.8125rem",
            }}
          >
            <Box component="dt" sx={{ color: "text.secondary" }}>
              {fact.label}
            </Box>
            <Box
              component="dd"
              sx={{ m: 0, display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}
            >
              <Box
                component="span"
                sx={{
                  fontWeight: 600,
                  overflowWrap: "anywhere",
                  ...(fact.mono ? { fontFamily: MONO_FONT, fontSize: "0.8125rem" } : {}),
                }}
              >
                {fact.value}
              </Box>
              {fact.note && (
                <Box component="span" sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                  {fact.note}
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * The (i) after a dropdown's label. Shows the current choice's card on mouse hover, on
 * keyboard focus, or on a tap or click (which toggles it). Escape closes it.
 */
function InfoButton({ id, card, align }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const wrapperRef = useRef(null);
  const cardRef = useRef(null);
  const open = (hovered || focused || pinned) && !dismissed;
  const shift = useKeepInViewport(cardRef, open, card.title);
  const cardId = `${id}-card`;

  useEffect(() => {
    if (!pinned) return undefined;
    function onPointerDown(event) {
      if (!wrapperRef.current?.contains(event.target)) setPinned(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pinned]);

  return (
    <Box
      component="span"
      ref={wrapperRef}
      sx={{ position: "relative", display: "inline-flex" }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") {
          setHovered(false);
          setDismissed(false);
        }
      }}
    >
      <Box
        component="button"
        type="button"
        id={`${id}-button`}
        aria-label={`About ${card.title}`}
        aria-describedby={cardId}
        onFocus={(event) => {
          // Only keyboard focus opens the card on its own; a tap or click toggles it below.
          if (event.currentTarget.matches(":focus-visible")) setFocused(true);
        }}
        onBlur={() => {
          setFocused(false);
          setPinned(false);
          setDismissed(false);
        }}
        onClick={() => {
          if (open) {
            setPinned(false);
            setFocused(false);
            setDismissed(true);
          } else {
            setPinned(true);
            setDismissed(false);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && open) {
            event.stopPropagation();
            setPinned(false);
            setDismissed(true);
          }
        }}
        sx={{
          width: 44,
          height: 44,
          m: "-12px -8px -12px -4px",
          p: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "none",
          border: "none",
          color: "text.secondary",
          cursor: "pointer",
          "&:hover": { color: "text.primary" },
          // A ring around the icon itself, not the whole 44px target over the label text.
          "&:focus-visible": { outlineOffset: "-10px", borderRadius: "50%" },
        }}
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M10 9v5M10 6.2v.1"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </Box>
      <InfoCard
        id={cardId}
        role="tooltip"
        card={card}
        hidden={!open}
        cardRef={cardRef}
        sx={{
          top: "calc(100% + 2px)",
          ...(align === "right" ? { right: 0 } : { left: 0 }),
          translate: `${shift}px`,
        }}
      />
    </Box>
  );
}

/**
 * @param {Object} props
 * @param {string} [props.id] Prefixes every id rendered here. Falls back to React's useId.
 * @param {string} props.label The visible label ("Solver", "To", "Visualization Type").
 * @param {{value: string, label: string, tags: import("./infoCards").Tag[],
 *   listTags?: import("./infoCards").Tag[], card: import("./infoCards").Card}[]} props.options
 *   `listTags`, when given, replaces `tags` in the open list, which has room for more.
 * @param {string} props.value The chosen option's value.
 * @param {(value: string) => void} [props.onChange] Leave out for a fixed choice: the box
 *   still shows its name, tags and (i) card but cannot open.
 * @param {"blue"|"violet"|"cyan"|"orange"|"green"} props.hue The tag hue.
 * @param {"left"|"right"} [props.align] Which edge the open list lines up with.
 * @param {"row"|"stack"} [props.labelPlacement] "row" puts the label beside the box (it is a
 *   cell of a parent grid or flex row: the label and box are returned as siblings), "stack"
 *   puts it above.
 * @param {Object} [props.boxSx] Extra `sx` for the box's wrapper (its width).
 */
export default function TaggedSelect({
  id: idProp,
  label,
  options,
  value,
  onChange,
  hue,
  align = "left",
  labelPlacement = "stack",
  boxSx,
}) {
  const autoId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const id = idProp ?? `tagged-select-${autoId}`;
  const labelId = `${id}-label`;
  const buttonId = `${id}-button`;
  const valueId = `${id}-value`;
  const tagsId = `${id}-tags`;
  const listboxId = `${id}-listbox`;
  const optionId = (index) => `${id}-option-${index}`;

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const selected = options[selectedIndex];
  const fixed = !onChange || options.length === 0;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [hover, setHover] = useState(null); // {index, top} while a mouse is over an option
  const [cardSide, setCardSide] = useState(align === "right" ? "left" : "right");
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listboxRef = useRef(null);
  const popupRef = useRef(null);
  const optionCardRef = useRef(null);
  const typeahead = useRef({ text: "", time: 0 });

  const popupShift = useKeepInViewport(popupRef, open, options.length);

  function openList(startIndex = selectedIndex) {
    if (fixed) return;
    setActiveIndex(startIndex);
    setHover(null);
    setOpen(true);
  }

  function closeList({ focusButton } = { focusButton: true }) {
    setOpen(false);
    setHover(null);
    if (focusButton) buttonRef.current?.focus();
  }

  function pick(index) {
    const option = options[index];
    closeList();
    if (option && option.value !== value) onChange(option.value);
  }

  // Focus the list once it is open, and keep the active option in view.
  useEffect(() => {
    if (open) listboxRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: "nearest" });
  });

  // A click anywhere outside closes the list without moving focus.
  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) closeList({ focusButton: false });
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  });

  // The hover card sits beside the list on the side away from the box's aligned edge, and
  // flips to the other side when the viewport has no room for it there.
  useLayoutEffect(() => {
    if (!hover || !popupRef.current || !optionCardRef.current) return;
    const listRect = popupRef.current.getBoundingClientRect();
    const cardWidth = optionCardRef.current.offsetWidth;
    const viewportWidth = document.documentElement.clientWidth;
    const preferred = align === "right" ? "left" : "right";
    const fits = (side) =>
      side === "right"
        ? listRect.right + 10 + cardWidth <= viewportWidth - VIEWPORT_MARGIN
        : listRect.left - 10 - cardWidth >= VIEWPORT_MARGIN;
    const next = fits(preferred)
      ? preferred
      : fits(preferred === "right" ? "left" : "right")
        ? preferred === "right"
          ? "left"
          : "right"
        : "none";
    setCardSide(next);
  }, [hover, align]);

  function onButtonKeyDown(event) {
    if (fixed) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openList(selectedIndex);
    }
  }

  function onListKeyDown(event) {
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, last));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(last);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        pick(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        closeList();
        break;
      case "Tab":
        // Close, and let Tab move on from the button as if the list had never opened.
        closeList();
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const now = event.timeStamp;
          const state = typeahead.current;
          state.text = now - state.time > TYPEAHEAD_RESET_MS ? event.key : state.text + event.key;
          state.time = now;
          const query = state.text.toLowerCase();
          const start = state.text.length === 1 ? activeIndex + 1 : activeIndex;
          for (let step = 0; step < options.length; step += 1) {
            const index = (start + step) % options.length;
            if (options[index].label.toLowerCase().startsWith(query)) {
              setActiveIndex(index);
              break;
            }
          }
        }
    }
  }

  const hovered = hover ? options[hover.index] : null;

  const labelRow = (
    <Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
      <Box component="label" id={labelId} htmlFor={buttonId} sx={controlLabelSx}>
        {label}
      </Box>
      {selected?.card && <InfoButton id={`${id}-info`} card={selected.card} align={align} />}
    </Box>
  );

  const box = (
    <Box
      ref={rootRef}
      sx={{ position: "relative", minWidth: 0, ...(labelPlacement === "row" ? boxSx : {}) }}
      onBlur={(event) => {
        if (open && !rootRef.current?.contains(event.relatedTarget)) {
          closeList({ focusButton: false });
        }
      }}
    >
      <Box
        component="button"
        type="button"
        ref={buttonRef}
        id={buttonId}
        aria-haspopup={fixed ? undefined : "listbox"}
        aria-expanded={fixed ? undefined : open}
        aria-controls={open ? listboxId : undefined}
        aria-labelledby={`${labelId} ${valueId}`}
        aria-describedby={selected?.tags?.length ? tagsId : undefined}
        disabled={fixed}
        data-fixed={fixed || undefined}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={onButtonKeyDown}
        sx={{
          width: "100%",
          minHeight: ROW_HEIGHT,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.25,
          py: 0.75,
          backgroundColor: "surface.input",
          color: "text.primary",
          border: "1px solid",
          borderColor: "border.main",
          borderRadius: "8px",
          fontFamily: "inherit",
          fontSize: "0.9375rem",
          textAlign: "left",
          cursor: "pointer",
          // A fixed single choice still reads as text, not as a greyed-out control.
          "&:disabled": { cursor: "default", color: "text.primary" },
        }}
      >
        <Box
          component="span"
          id={valueId}
          sx={{
            flex: "1 1 0%",
            minWidth: "3em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {selected?.label ?? ""}
        </Box>
        <TagList
          id={tagsId}
          tags={selected?.tags}
          hue={hue}
          sx={{ flex: "0 1 auto", flexWrap: "wrap", minWidth: 0 }}
        />
        {!fixed && (
          <Box
            component="svg"
            aria-hidden="true"
            viewBox="0 0 12 12"
            sx={{
              width: 12,
              height: 12,
              flex: "none",
              color: "text.secondary",
              transform: open ? "rotate(180deg)" : "none",
            }}
          >
            <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </Box>
        )}
      </Box>

      {open && (
        <Box
          ref={popupRef}
          id={`${id}-popup`}
          // Keeps focus on the list while an option is clicked.
          onMouseDown={(event) => event.preventDefault()}
          sx={{
            position: "absolute",
            zIndex: 40,
            top: "calc(100% + 4px)",
            ...(align === "right" ? { right: 0 } : { left: 0 }),
            minWidth: "100%",
            width: "max-content",
            maxWidth: LIST_MAX_WIDTH,
            translate: `${popupShift}px`,
          }}
        >
          <Box
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={labelId}
            aria-activedescendant={optionId(activeIndex)}
            onKeyDown={onListKeyDown}
            onPointerLeave={() => setHover(null)}
            sx={{
              boxSizing: "border-box",
              maxHeight: 360,
              overflowX: "hidden",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              p: 0.5,
              backgroundColor: "surface.main",
              border: "1px solid",
              borderColor: "border.main",
              borderRadius: "8px",
              boxShadow: 8,
            }}
          >
            {options.map((option, index) => {
              const isSelected = index === selectedIndex;
              const isActive = index === activeIndex;
              return (
                <Box
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  aria-labelledby={`${optionId(index)}-name`}
                  aria-describedby={
                    (option.listTags ?? option.tags)?.length ? `${optionId(index)}-tags` : undefined
                  }
                  data-active={isActive || undefined}
                  onClick={() => pick(index)}
                  onPointerEnter={(event) => {
                    if (event.pointerType !== "mouse") return;
                    setActiveIndex(index);
                    const listTop = popupRef.current?.getBoundingClientRect().top ?? 0;
                    setHover({
                      index,
                      top: event.currentTarget.getBoundingClientRect().top - listTop,
                    });
                  }}
                  sx={{
                    minHeight: ROW_HEIGHT,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    px: 1.25,
                    py: 0.75,
                    borderLeft: "3px solid",
                    borderLeftColor: isSelected ? "brand.line" : "transparent",
                    borderRadius: "6px",
                    backgroundColor: isActive
                      ? "surface.raised2"
                      : isSelected
                        ? "surface.raised"
                        : "transparent",
                    fontWeight: isSelected ? 700 : 400,
                    fontSize: "0.9375rem",
                    color: "text.primary",
                    cursor: "pointer",
                  }}
                >
                  <Box component="span" id={`${optionId(index)}-name`} sx={{ minWidth: 0 }}>
                    {option.label}
                  </Box>
                  <TagList
                    id={`${optionId(index)}-tags`}
                    tags={option.listTags ?? option.tags}
                    hue={hue}
                    sx={{ flex: "none" }}
                  />
                </Box>
              );
            })}
          </Box>
          {hovered?.card && (
            <InfoCard
              id={`${id}-option-card`}
              aria-hidden="true"
              card={hovered.card}
              cardRef={optionCardRef}
              sx={{
                top: hover.top - 4,
                ...(cardSide !== "right"
                  ? { right: "calc(100% + 10px)" }
                  : { left: "calc(100% + 10px)" }),
                visibility: cardSide === "none" ? "hidden" : "visible",
                "@media (hover: none)": { display: "none" },
              }}
            />
          )}
        </Box>
      )}
    </Box>
  );

  if (labelPlacement === "row") {
    return (
      <>
        {labelRow}
        {box}
      </>
    );
  }
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0, ...boxSx }}>
      {labelRow}
      {box}
    </Box>
  );
}
