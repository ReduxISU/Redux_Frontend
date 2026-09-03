// components/theme.js
//
// T07 (#11) — the one shared MUI dark theme for the whole app. Defined once
// here, applied in pages/_app.js via ThemeProvider + CssBaseline. Every
// other visual task styles against this rather than ad-hoc colors.
//
// Built from the four mockup PDFs in mockup_images/ (gitignored, see
// CLAUDE.md for how to extract them). Every per-facet accent color sampled
// out of those images landed within a few RGB units of a Tailwind CSS v3
// "-400" swatch, so FACET_ACCENT_COLORS below adopts those swatches
// directly (and their "-600" counterparts for filled-badge backgrounds)
// rather than approximating by eye.
//
// --- Ownership of the per-facet accent palette (open question in #11) ----
// data/taxonomy.js (#10/T06) gives each facet an `accentColor` field, but
// left the value a semantic color NAME ("blue", "salmon-red", ...) rather
// than a real color, and explicitly left ownership of the palette for T07
// to decide ("pick one owner and say which in a comment"). No later
// comment on #11 settled it, so this is this task's call:
//
//   THIS FILE (components/theme.js) owns the actual color values.
//   data/taxonomy.js's `accentColor` strings are lookup keys into
//   FACET_ACCENT_COLORS below, resolved via getFacetAccentColor() —
//   never hardcoded as hex anywhere else.
//
// Reasoning: taxonomy.js's own header comment declares it "Pure data ... No
// React, no MUI, no imports from elsewhere in the app" — a real MUI-facing
// color value doesn't belong in a file that states that constraint about
// itself. A theme module is exactly where a color palette belongs.

import { alpha, createTheme } from "@mui/material/styles";
import { TAXONOMY } from "../data/taxonomy";

// Semantic color name (as stored in each data/taxonomy.js facet's
// `accentColor` field) -> real color. Values are Tailwind CSS v3 "-400"
// swatches, matched by pixel-sampling the mockups.
export const FACET_ACCENT_COLORS = {
  blue: "#60A5FA", // Problem Type
  cyan: "#22D3EE", // Computational Model
  amber: "#FB923C", // Complexity Class — reads as warm orange in the mockup, not MUI's yellow-ish "amber"
  magenta: "#F472B6", // Quantum Complexity Class
  "salmon-red": "#F87171", // Solver Type
  // Solver Complexity's mockup dot sampled almost identical to Solver
  // Type's salmon-red (within ~3 RGB units) — the mockup doesn't actually
  // give them visually distinct hues despite the distinct semantic names.
  // Nudged warmer/lighter here so the two facets are still tellable apart
  // at a glance when they appear side by side (sidebar, solver cards).
  coral: "#FF8A65", // Solver Complexity
  violet: "#C084FC", // Reduction Type + Reduction Cost (taxonomy.js gives both the same name)
  green: "#4ADE80", // Visualization Type
};

// Darker "-600" counterpart of each accent, used only as the background of
// a *filled* (matched) badge — see BADGE_FAMILIES below. Keeping these next
// to FACET_ACCENT_COLORS rather than deriving them at runtime because
// Tailwind's 400->600 step isn't a uniform transform (hue shifts too).
const FACET_ACCENT_COLORS_STRONG = {
  blue: "#2563EB",
  cyan: "#0891B2",
  amber: "#EA580C",
  magenta: "#DB2777",
  "salmon-red": "#DC2626",
  coral: "#E64A19",
  violet: "#9333EA",
  green: "#16A34A",
};

const FALLBACK_ACCENT = "#9CA3AF"; // neutral gray — deliberately NOT a real
// facet color, so a typo'd/unmapped color name reads as visibly "wrong"
// instead of silently masquerading as Problem Type's blue.

/** Resolve a data/taxonomy.js `accentColor` name to a real color. */
export function getFacetAccentColor(colorName) {
  return FACET_ACCENT_COLORS[colorName] ?? FALLBACK_ACCENT;
}

// --- Per-facet card badge / tag-row chip families (T07 done-when, T12/#16,
// #70) -----------------------------------------------------------------
//
// Every data/taxonomy.js facet gets its own MUI Chip variant pair, keyed by
// the facet's own `key`: outlined by default, filled (solid background +
// white text) when the tag matches an active filter. Consumers pick the
// state: `variant={matched ? "complexityClassFilled" :
// "complexityClassOutlined"}`. The leading checkmark on a matched badge is
// content (an icon), not styling, so ProblemCatalogCard renders it — this
// file only makes the filled state look right once it's there.
//
// #70: originally only complexityClass/solverType/problemType (the three
// facets ProblemCatalogCard renders by default) had variants here. Widened
// to every facet so a card can add a tag row for ANY facet once a filter for
// it is active, with the exact same filled/checkmark/bold treatment as the
// three default rows.
function buildChipVariants() {
  const variants = [];
  for (const facet of TAXONOMY) {
    const base = FACET_ACCENT_COLORS[facet.accentColor];
    const strong = FACET_ACCENT_COLORS_STRONG[facet.accentColor];
    const outlinedVariant = `${facet.key}Outlined`;
    const filledVariant = `${facet.key}Filled`;

    variants.push({
      props: { variant: outlinedVariant },
      style: {
        color: base,
        backgroundColor: alpha(base, 0.1),
        border: `1px solid ${alpha(base, 0.55)}`,
        fontWeight: 600,
      },
    });
    variants.push({
      props: { variant: filledVariant },
      style: {
        color: "#FFFFFF",
        backgroundColor: strong,
        border: `1px solid ${strong}`,
        fontWeight: 700,
        "& .MuiChip-icon": { color: "#FFFFFF" },
      },
    });
  }
  return variants;
}

const PAGE_BACKGROUND = "#0A0908";
const PANEL_BACKGROUND = "#17140F"; // one step lighter than the page, per the mockup's elevated surfaces
const HAIRLINE_BORDER = "rgba(255, 237, 213, 0.09)"; // warm-tinted hairline, used for every panel/card edge

// Shared scrollbar treatment for every internally-scrolling region on the
// Home page (#68): the sidebar's own scroll, each facet group's capped
// option list, and the card grid. Track is transparent (matches the page
// background it sits over, per #68's explicit requirement) and the thumb is
// a slim, low-contrast bar rather than the browser default. Firefox
// properties (`scrollbarWidth`/`scrollbarColor`) and the WebKit
// pseudo-elements are both set so Chrome/Edge/Safari and Firefox match.
const SCROLLBAR_THUMB_COLOR = "rgba(245, 241, 234, 0.22)";
export const thinScrollbarSx = {
  scrollbarWidth: "thin",
  scrollbarColor: `${SCROLLBAR_THUMB_COLOR} transparent`,
  "&::-webkit-scrollbar": {
    width: 6,
    height: 6,
  },
  "&::-webkit-scrollbar-track": {
    background: "transparent",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: SCROLLBAR_THUMB_COLOR,
    borderRadius: 999,
  },
};

// --- T48 (#111): the shared visualization color-key vocabulary (§4.3) ------------------
// `graph`, `quantumCircuit`, `booleanSatisfiability`, `recursiveSet` and `stepTable` all
// send color fields as color-KEY NAMES ("Solution", "Background", "ElementHighlight",
// ...), never hex, resolved through one lookup table -- Redux_GUI kept two
// (`constants/VisColors.js`/`VisColorsArray.js`) for the same concept, which T40 flagged
// as exactly the kind of drift this project doesn't want a second copy of. `pumpSchedule`
// is exempt (§3.6): it hardcodes its own palette and sends no color-key field at all.
//
// Reconciled with this theme's own tokens rather than a separate palette: reusing
// FACET_ACCENT_COLORS' hues keeps a visualization's "Solution"/"ElementHighlight" marks
// visually related to this app's own accent vocabulary instead of introducing unrelated
// colors. An unrecognized key (not in the table, and not "") is not malformed per the
// contract -- it degrades to the same neutral BACKGROUND entry an empty string already
// does, which is what the fallback below does.
export const VISUALIZATION_COLOR_KEYS = {
  Background: "#94A3B8",
  Solution: FACET_ACCENT_COLORS.green,
  ElementHighlight: FACET_ACCENT_COLORS.blue,
  ClauseHighlight: FACET_ACCENT_COLORS.magenta,
};

const VISUALIZATION_COLOR_DEFAULT = VISUALIZATION_COLOR_KEYS.Background;

/** Resolve a visualization payload's color-key string to a real color. */
export function getVisualizationColor(colorKey) {
  if (!colorKey) return VISUALIZATION_COLOR_DEFAULT;
  return VISUALIZATION_COLOR_KEYS[colorKey] ?? VISUALIZATION_COLOR_DEFAULT;
}

const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: PAGE_BACKGROUND,
      paper: PANEL_BACKGROUND,
    },
    divider: HAIRLINE_BORDER,
    primary: {
      // The single orange/amber brand accent: nav underline, "Reset to
      // default", focus rings, the Run button. Same family as (and close
      // in value to) the Complexity Class facet accent — the mockup reuses
      // one hue for both roles.
      main: "#FB923C",
      light: "#FDBA74",
      dark: "#EA580C",
      contrastText: "#241505",
    },
    secondary: {
      main: "#94A3B8",
      contrastText: "#0B0A09",
    },
    text: {
      primary: "#F5F1EA",
      secondary: "rgba(245, 241, 234, 0.64)",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    // Typography scale (T07 done-when). Conceptual name -> MUI variant:
    //   page title            -> h1     ("Home", "3-SAT")
    //   section title         -> h2     ("Overview", "Solvers")
    //   facet group heading   -> overline (small caps, letter-spaced — MUI's
    //                            overline variant already models this shape)
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
          backgroundColor: themeParam.palette.background.default,
          // The mockup's subtle warm glow along the top edge, behind the
          // nav bar. Expressed here (not styles/globals.css) because
          // CssBaseline's styleOverrides can express it directly — see
          // this task's done-when item about what globals.css should hold.
          backgroundImage: `radial-gradient(1400px 480px at 18% -12%, ${alpha(
            themeParam.palette.primary.main,
            0.16,
          )}, transparent 60%)`,
          backgroundRepeat: "no-repeat",
        },
        a: {
          color: "inherit",
          textDecoration: "none",
        },
        // Explicit, clearly-visible focus styling against the dark
        // background — required (T07 done-when): never remove the browser
        // outline without replacing it with something at least as visible.
        // Covers plain/native elements; MuiButtonBase below covers MUI's
        // ripple-based components, whose overflow:hidden root can clip a
        // default outline.
        "*:focus-visible": {
          outline: `2px solid ${themeParam.palette.primary.light}`,
          outlineOffset: "2px",
          borderRadius: "4px",
        },
      }),
    },
    MuiButtonBase: {
      styleOverrides: {
        root: ({ theme: themeParam }) => ({
          "&.Mui-focusVisible": {
            outline: `2px solid ${themeParam.palette.primary.light}`,
            outlineOffset: "2px",
          },
        }),
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme: themeParam }) => ({
          // MUI dark-mode Paper normally lightens via a translucent white
          // overlay gradient per elevation step, which washes out this
          // theme's warm palette. Panels get their "one step lighter"
          // treatment from an explicit background + hairline border
          // instead (see PANEL_BACKGROUND / HAIRLINE_BORDER above).
          backgroundImage: "none",
          border: `1px solid ${themeParam.palette.divider}`,
        }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 999, // pill-shaped, per the mockup's buttons ("Clear filters", "Help", "Contribute")
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999, // full pill shape
        },
      },
      variants: buildChipVariants(),
    },
    MuiTypography: {
      variants: [
        {
          // The small monospace style used for instance strings and
          // certificate text (T16c/T16d).
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

export default theme;
