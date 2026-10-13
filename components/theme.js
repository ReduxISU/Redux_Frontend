// components/theme.js
//
// T07 (#11) built the one shared MUI theme; #156 turned it into two color schemes, dark and
// light, built from the ISU palette (raw values in ./themeTokens.js). Applied in pages/_app.js
// via ThemeProvider + CssBaseline, with pages/_document.js's InitColorSchemeScript setting the
// scheme before the first paint so a light-theme visitor never sees a dark flash.
//
// How the two schemes work: MUI's CSS-variables theming. Every palette entry below becomes a
// `--mui-palette-*` CSS variable, and the `data-theme="dark" | "light"` attribute on <html>
// picks which values those variables hold. So `sx` palette paths ("text.secondary",
// "surface.raised", "brand.text") and the helpers exported here resolve to `var(...)` strings
// that follow the theme with no re-render. Never read `theme.palette.*` for a color in a
// component: it holds only the default scheme's raw values. Use `theme.vars.palette.*`, a
// palette path in `sx`, or the helpers below. MUI's `alpha()` cannot take a `var(...)`; use
// `tint()` here instead.
//
// The theme follows the visitor's system setting (prefers-color-scheme) until they press the
// nav toggle (components/NavBar.js); their choice is saved in localStorage under
// THEME_MODE_STORAGE_KEY.
//
// --- Ownership of the per-facet accent palette (decided in T07, #11) -------------------------
// data/taxonomy.js gives each facet an `accentColor` NAME ("blue", "salmon-red", ...); this
// file (with ./themeTokens.js) owns the real colors, resolved via getFacetAccentColor() /
// getFacetTagColors(). taxonomy.js stays pure data with no MUI imports.

import { createTheme } from "@mui/material/styles";
import { TAXONOMY } from "../data/taxonomy";
import { THEME_TOKENS } from "./themeTokens";

/** localStorage key holding the visitor's theme choice ("light" | "dark" | "system"). */
export const THEME_MODE_STORAGE_KEY = "redux-theme-mode";
/** localStorage key prefix MUI uses for the per-mode color scheme names. */
export const THEME_COLOR_SCHEME_STORAGE_KEY = "redux-color-scheme";
/** The <html> attribute carrying the active scheme: data-theme="dark" | "light". */
export const THEME_ATTRIBUTE = "data-theme";

const TOUCH_TARGET = 44; // px; the minimum tappable size below the md breakpoint

/**
 * A translucent version of any CSS color, including a theme `var(...)`, for backgrounds and
 * hover washes. `percent` is the share of `color` (0-100) mixed with transparent.
 */
export function tint(color, percent) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

function buildPalette(tokens, mode) {
  return {
    mode,
    // primary is the orange accent as it may appear as text or a thin line: ISU orange in the
    // dark theme, the darker #B84A0E in the light theme (orange text fails on white). Filled
    // orange buttons use `brand.fill` with black labels instead; see MuiButton below.
    primary: {
      main: tokens.brand.line,
      light: tokens.brand.lineLight,
      dark: tokens.brand.lineDark,
      contrastText: tokens.brand.onLine,
    },
    secondary: {
      main: tokens.brand.goldLine,
      contrastText: tokens.brand.onGoldLine,
    },
    // Errors and success keep their own red and green, distinct from the brand orange. `light`
    // is the shade used as text on the theme's surfaces in both schemes.
    error: {
      main: tokens.status.err,
      light: tokens.status.errText,
      dark: tokens.status.err,
      contrastText: tokens.status.onStatus,
    },
    success: {
      main: tokens.status.ok,
      light: tokens.status.okText,
      dark: tokens.status.ok,
      contrastText: tokens.status.onStatus,
    },
    warning: {
      main: tokens.status.warn,
      light: tokens.status.warn,
      dark: tokens.status.warn,
      contrastText: tokens.status.onStatus,
    },
    info: {
      main: tokens.viz.blue,
      light: tokens.viz.blue,
      dark: tokens.viz.blue,
      contrastText: tokens.status.onStatus,
    },
    background: { default: tokens.page, paper: tokens.surface.main },
    divider: tokens.border.soft,
    text: {
      primary: tokens.text.primary,
      secondary: tokens.text.muted,
      disabled: tokens.text.muted2,
    },
    // Custom entries (each becomes --mui-palette-<key>-<name>):
    surface: tokens.surface,
    border: tokens.border,
    ink: { text2: tokens.text.text2, muted: tokens.text.muted, muted2: tokens.text.muted2 },
    brand: tokens.brand,
    status: tokens.status,
    facet: tokens.facet,
    tag: tokens.tag,
    viz: tokens.viz,
  };
}

// --- Per-facet card badge / tag-row chip families (T07, T12/#16, #70) --------------------------
// Every data/taxonomy.js facet gets its own MUI Chip variant pair, keyed by the facet's `key`:
// outlined by default, filled when the tag matches an active filter. Consumers pick the state:
// `variant={matched ? "complexityClassFilled" : "complexityClassOutlined"}`.
function buildChipVariants() {
  const variants = [];
  for (const facet of TAXONOMY) {
    const name = facet.accentColor;
    variants.push({
      props: { variant: `${facet.key}Outlined` },
      style: ({ theme: themeParam }) => {
        const family = facetFamily(themeParam, name);
        return {
          color: family.text,
          backgroundColor: family.bg,
          border: `1px solid ${family.border}`,
          fontWeight: 600,
        };
      },
    });
    variants.push({
      props: { variant: `${facet.key}Filled` },
      style: ({ theme: themeParam }) => {
        const family = facetFamily(themeParam, name);
        return {
          color: family.onStrong,
          backgroundColor: family.strong,
          border: `1px solid ${family.strong}`,
          fontWeight: 700,
          "& .MuiChip-icon": { color: family.onStrong },
        };
      },
    });
  }
  return variants;
}

function facetFamily(themeParam, name) {
  const facets = themeParam.vars.palette.facet;
  return facets[name] ?? facets.fallback;
}

const theme = createTheme({
  cssVariables: { colorSchemeSelector: THEME_ATTRIBUTE },
  defaultColorScheme: "dark",
  colorSchemes: {
    dark: { palette: buildPalette(THEME_TOKENS.dark, "dark") },
    light: { palette: buildPalette(THEME_TOKENS.light, "light") },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    // Typography scale (T07 done-when). Conceptual name -> MUI variant:
    //   page title            -> h1     ("Home", "3-SAT")
    //   section title         -> h2     ("Overview", "Solvers")
    //   facet group heading   -> overline (small caps, letter-spaced)
    //   body                  -> body1
    //   mono (instance/cert.) -> custom "mono" variant, see components.MuiTypography below
    h1: {
      fontSize: "2rem",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      lineHeight: 1.25,
    },
    h2: {
      fontSize: "1.25rem",
      fontWeight: 700,
      letterSpacing: "-0.005em",
      lineHeight: 1.3,
    },
    overline: {
      fontSize: "0.6875rem",
      fontWeight: 700,
      letterSpacing: "0.08em",
      lineHeight: 1.4,
    },
    body1: {
      fontSize: "0.9375rem",
      lineHeight: 1.6,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: (themeParam) => ({
        body: {
          backgroundColor: themeParam.vars.palette.background.default,
          // A subtle orange glow along the top edge, behind the nav bar.
          backgroundImage: `radial-gradient(1400px 480px at 18% -12%, ${tint(
            themeParam.vars.palette.brand.fill,
            14,
          )}, transparent 60%)`,
          backgroundRepeat: "no-repeat",
        },
        a: {
          color: "inherit",
          textDecoration: "none",
        },
        // Explicit, clearly visible focus styling (T07 done-when): never remove the browser
        // outline without replacing it with something at least as visible. `brand.line` is
        // at least 3:1 on every surface in both themes.
        "*:focus-visible": {
          outline: `2px solid ${themeParam.vars.palette.brand.line}`,
          outlineOffset: "2px",
          borderRadius: "4px",
        },
      }),
    },
    MuiButtonBase: {
      styleOverrides: {
        root: ({ theme: themeParam }) => ({
          "&.Mui-focusVisible": {
            outline: `2px solid ${themeParam.vars.palette.brand.line}`,
            outlineOffset: "2px",
          },
        }),
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme: themeParam }) => ({
          // MUI's dark-mode Paper lightens via a translucent white overlay per elevation step.
          // Panels get their "one step lighter" look from the surface token + hairline border
          // instead.
          backgroundImage: "none",
          border: `1px solid ${themeParam.vars.palette.divider}`,
        }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: ({ theme: themeParam }) => ({
          borderRadius: 999, // pill-shaped, per the mockup's buttons
          textTransform: "none",
          fontWeight: 600,
          [themeParam.breakpoints.down("md")]: { minHeight: TOUCH_TARGET },
        }),
      },
      variants: [
        {
          // #156: a filled primary button is ISU orange with a BLACK label in both themes
          // (white on orange is 2.9:1 and fails).
          props: { variant: "contained", color: "primary" },
          style: ({ theme: themeParam }) => ({
            backgroundColor: themeParam.vars.palette.brand.fill,
            color: themeParam.vars.palette.brand.onFill,
            "&:hover": { backgroundColor: themeParam.vars.palette.brand.fillHover },
          }),
        },
      ],
    },
    // #179: below the md breakpoint every tappable control is at least 44px. Chips and the
    // Autocomplete's small indicator buttons keep their look and get an invisible 44px hit area.
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme: themeParam }) => ({
          [themeParam.breakpoints.down("md")]: {
            minWidth: TOUCH_TARGET,
            minHeight: TOUCH_TARGET,
            "&.MuiAutocomplete-popupIndicator, &.MuiAutocomplete-clearIndicator": {
              minWidth: 0,
              minHeight: 0,
              "&::after": { content: '""', position: "absolute", inset: -8 },
            },
          },
        }),
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: ({ theme: themeParam }) => ({
          [themeParam.breakpoints.down("md")]: { padding: 12 },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme: themeParam }) => ({
          [themeParam.breakpoints.down("md")]: {
            "&:not(.MuiInputBase-multiline)": { minHeight: TOUCH_TARGET },
          },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme: themeParam }) => ({
          borderRadius: 999, // full pill shape
          [themeParam.breakpoints.down("md")]: {
            "&.MuiChip-clickable::after": {
              content: '""',
              position: "absolute",
              inset: -11,
            },
          },
        }),
      },
      variants: buildChipVariants(),
    },
    MuiTypography: {
      variants: [
        {
          // The small monospace style used for instance strings and certificate text.
          props: { variant: "mono" },
          style: {
            fontFamily: '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',
            fontSize: "0.8125rem",
            letterSpacing: 0,
          },
        },
      ],
    },
  },
});

/** The palette as theme-following CSS variables (`var(--mui-palette-...)` strings). */
export const paletteVars = theme.vars.palette;

// --- Facet accents ------------------------------------------------------------------------------

/** Facet color name -> its accent as a theme-following CSS variable. */
export const FACET_ACCENT_COLORS = Object.fromEntries(
  Object.entries(paletteVars.facet)
    .filter(([name]) => name !== "fallback")
    .map(([name, family]) => [name, family.main]),
);

/** Resolve a data/taxonomy.js `accentColor` name to its accent color (a CSS variable). */
export function getFacetAccentColor(colorName) {
  return (paletteVars.facet[colorName] ?? paletteVars.facet.fallback).main;
}

/**
 * Every color of one facet family as CSS variables: `main` (accent mark), `border`/`bg`/`text`
 * (outlined tag), `strong`/`onStrong` (filled tag).
 */
export function getFacetTagColors(colorName) {
  return paletteVars.facet[colorName] ?? paletteVars.facet.fallback;
}

/** `sx` for a facet-colored outlined pill (tag text on its tinted background). */
export function facetTagSx(colorName) {
  const family = getFacetTagColors(colorName);
  return {
    color: family.text,
    backgroundColor: family.bg,
    border: `1px solid ${family.border}`,
  };
}

// --- Scrollbars ----------------------------------------------------------------------------------
// Shared scrollbar treatment for every internally scrolling region (#68, extended app-wide by
// project-owner instruction). Transparent track, slim grey thumb with a hover state. Firefox
// properties and the WebKit pseudo-elements are both set so every engine matches.
export const thinScrollbarSx = {
  scrollbarWidth: "thin",
  scrollbarColor: `${paletteVars.border.main} transparent`,
  "&::-webkit-scrollbar": {
    width: 6,
    height: 6,
  },
  "&::-webkit-scrollbar-track": {
    background: "transparent",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: paletteVars.border.main,
    borderRadius: 999,
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: paletteVars.border.strong,
  },
};

// Fully hidden scrollbar: the element stays scrollable by wheel/trackpad/touch/drag, with no
// scrollbar chrome. Ported from Redux_GUI's chipScrollRowSx; three properties because no single
// one covers every engine.
export const hiddenScrollbarSx = {
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  "&::-webkit-scrollbar": {
    display: "none",
  },
};

// --- T48 (#111): the shared visualization color-key vocabulary (section 4.3) --------------------
// `graph`, `quantumCircuit`, `booleanSatisfiability`, `recursiveSet` and `stepTable` send color
// fields as color-KEY NAMES ("Solution", "Background", ...), never hex, resolved through this one
// table. `pumpSchedule` is exempt (section 3.6) and uses `paletteVars.viz.pump`. An unrecognized
// or empty key degrades to Background. #156: each key has a theme-following `line` (strokes,
// marks, colored text on the canvas), `fill` (a node or gate body) and `onFill` (its label).
const VISUALIZATION_KEY_TOKENS = {
  Background: "background",
  Solution: "solution",
  ElementHighlight: "elementHighlight",
  ClauseHighlight: "clauseHighlight",
};

function visualizationFamily(colorKey) {
  const token = VISUALIZATION_KEY_TOKENS[colorKey] ?? VISUALIZATION_KEY_TOKENS.Background;
  return paletteVars.viz[token];
}

/** Color key -> its `line` color (a CSS variable). */
export const VISUALIZATION_COLOR_KEYS = Object.fromEntries(
  Object.entries(VISUALIZATION_KEY_TOKENS).map(([key, token]) => [
    key,
    paletteVars.viz[token].line,
  ]),
);

/** Resolve a visualization payload's color key to a color that stands on the canvas. */
export function getVisualizationColor(colorKey) {
  return visualizationFamily(colorKey).line;
}

/** Resolve a color key to the fill for a node/gate body. */
export function getVisualizationFill(colorKey) {
  return visualizationFamily(colorKey).fill;
}

/** Resolve a color key to the label color drawn on top of getVisualizationFill(colorKey). */
export function getVisualizationOnFill(colorKey) {
  return visualizationFamily(colorKey).onFill;
}

export default theme;
