// components/SearchBar.js
//
// T10 (#14) — the search box above the Home page card grid. Filters cards by
// substring as the user types.
//
// Port of Redux_GUI's components/widgets/SearchBarExtensible.js, but only in
// the loose sense: that source is an MUI Autocomplete built to pick one exact
// value out of a known enumerated list (options/optionsMap, groupBy
// sectioning, disabled/de-emphasized options, an extenderButtons escape
// hatch). None of that applies here — the issue and mockup both describe a
// plain full-width free-text field with no dropdown of selectable options.
// So this is a controlled <input>, not an Autocomplete; the
// grouping/extender/disabled-option machinery was deliberately left behind
// rather than dragged over just because the source file had it.
//
// Fully controlled (value/onChange from the caller, no internal text state)
// so the Home page can reset it via "Clear all" / "Clear filters" (T14).
//
// Redux_GUI's source hardcodes id="search-bar" on its Autocomplete (line 73)
// — the exact "six dropdowns, one id" bug ground rule 4 warns about. Not
// carried over: this input gets its own static id (one instance of this
// component per page, so a literal is fine, it's just not the reused
// literal) plus a real associated <label>, visually hidden.

import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import { useEffect, useRef } from "react";

const SEARCH_INPUT_ID = "search-bar-input";

// Standard visually-hidden clip pattern -- the label needs to exist for
// screen readers without displacing the visible placeholder text.
const visuallyHiddenSx = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export default function SearchBar({ value, onChange }) {
  const inputRef = useRef(null);

  // Pressing "/" anywhere on the page focuses the input, unless focus is
  // already inside a text field -- otherwise it would be impossible to type
  // a literal "/" anywhere else on the page.
  useEffect(() => {
    function handleGlobalKeyDown(event) {
      if (event.key !== "/") {
        return;
      }
      const active = document.activeElement;
      const isTextInput =
        active?.tagName === "INPUT" || active?.tagName === "TEXTAREA" || active?.isContentEditable;
      if (isTextInput) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleInputKeyDown = (event) => {
    if (event.key === "Escape") {
      onChange("");
      inputRef.current?.blur();
    }
  };

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      <Box component="label" htmlFor={SEARCH_INPUT_ID} sx={visuallyHiddenSx}>
        Search by problem name
      </Box>
      <TextField
        id={SEARCH_INPUT_ID}
        inputRef={inputRef}
        fullWidth
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder='Search by problem name — e.g. "3-SAT"'
        slotProps={{
          htmlInput: {
            onKeyDown: handleInputKeyDown,
          },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Box
                  aria-hidden="true"
                  sx={{
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: "divider",
                    color: "text.secondary",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    lineHeight: 1.4,
                    fontFamily: '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',
                  }}
                >
                  /
                </Box>
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
}
