// components/themeTokens.js
//
// #156: the raw color values behind the app's two themes (dark and light), built from the ISU
// palette (orange #FF671F, black, gold #F9A81A, white, and a neutral grey scale). Pure data, no
// imports, so components/theme.js turns it into the MUI color schemes and
// scripts/check-contrast.mjs can read the same numbers to check WCAG AA for both themes.
//
// Components never read this file directly: they use the theme (palette paths such as
// "surface.raised" in `sx`, or the helpers components/theme.js exports), which resolve to CSS
// variables that switch with the theme. The values below are the approved mockup tokens
// (.t-dark / .t-light) for the page UI; the facet and visualization hues follow the same rule:
// in the dark theme the light "-400" hue on near-black, in the light theme a dark "-700"/"-800"
// hue on white or light grey, so nothing is light on light or dark on dark.
//
// Rules from #156 that these values encode:
//   - Orange (and gold) buttons get black labels.
//   - In the light theme orange and gold are fills only; orange text and thin orange lines use
//     the darker #B84A0E (`brand.text` / `brand.line`).
//   - Greys carry surfaces, borders and secondary text; secondary text is at least 4.5:1 on the
//     surface it sits on.
//   - Errors are red and success is green, both distinct from the brand orange.

const ISU_ORANGE = "#FF671F";
const ISU_GOLD = "#F9A81A";
const BLACK = "#000000";
const WHITE = "#FFFFFF";

// One facet color family per data/taxonomy.js `accentColor` name. `main` is the accent itself
// (dots, marks, graph strokes; at least 3:1 on the surfaces), `border`/`bg`/`text` draw an
// outlined tag, `strong`/`onStrong` draw a filled (selected) tag.
const DARK_FACETS = {
  blue: {
    main: "#60A5FA",
    border: "rgba(96, 165, 250, 0.6)",
    bg: "rgba(96, 165, 250, 0.12)",
    text: "#BFDBFE",
  },
  cyan: {
    main: "#22D3EE",
    border: "rgba(34, 211, 238, 0.6)",
    bg: "rgba(34, 211, 238, 0.12)",
    text: "#A5F3FC",
  },
  amber: {
    main: "#FB923C",
    border: "rgba(251, 146, 60, 0.6)",
    bg: "rgba(251, 146, 60, 0.12)",
    text: "#FED7AA",
  },
  magenta: {
    main: "#F472B6",
    border: "rgba(244, 114, 182, 0.6)",
    bg: "rgba(244, 114, 182, 0.12)",
    text: "#FBCFE8",
  },
  "salmon-red": {
    main: "#F87171",
    border: "rgba(248, 113, 113, 0.6)",
    bg: "rgba(248, 113, 113, 0.12)",
    text: "#FECACA",
  },
  coral: {
    main: "#FF8A65",
    border: "rgba(255, 138, 101, 0.6)",
    bg: "rgba(255, 138, 101, 0.12)",
    text: "#FFCCBC",
  },
  violet: {
    main: "#C084FC",
    border: "rgba(192, 132, 252, 0.6)",
    bg: "rgba(192, 132, 252, 0.12)",
    text: "#E9D5FF",
  },
  green: {
    main: "#4ADE80",
    border: "rgba(74, 222, 128, 0.6)",
    bg: "rgba(74, 222, 128, 0.12)",
    text: "#BBF7D0",
  },
  // Not a real facet color: an unmapped name reads as visibly neutral instead of borrowing
  // another facet's hue.
  fallback: {
    main: "#A6A6A6",
    border: "rgba(166, 166, 166, 0.6)",
    bg: "rgba(166, 166, 166, 0.12)",
    text: "#E5E5E5",
  },
};

const LIGHT_FACETS = {
  blue: { main: "#1D4ED8", border: "#1D4ED8", bg: "#EAF1FF", text: "#1E3A8A" },
  cyan: { main: "#0E7490", border: "#0E7490", bg: "#E6F7FA", text: "#155E75" },
  amber: { main: "#C2410C", border: "#C2410C", bg: "#FFF1E6", text: "#9A3412" },
  magenta: { main: "#BE185D", border: "#BE185D", bg: "#FCE7F3", text: "#831843" },
  "salmon-red": { main: "#B91C1C", border: "#B91C1C", bg: "#FDECEC", text: "#7F1D1D" },
  coral: { main: "#B4361E", border: "#B4361E", bg: "#FDEEE9", text: "#7C2D12" },
  violet: { main: "#7E22CE", border: "#7E22CE", bg: "#F4ECFE", text: "#581C87" },
  green: { main: "#15803D", border: "#15803D", bg: "#E8F7EE", text: "#14532D" },
  fallback: { main: "#525252", border: "#525252", bg: "#F0F0F0", text: "#262626" },
};

// Filled (selected) tags: the light accent with black text in the dark theme, the dark accent
// with white text in the light theme.
function withFilledState(facets, onStrong) {
  return Object.fromEntries(
    Object.entries(facets).map(([name, family]) => [
      name,
      { ...family, strong: family.main, onStrong },
    ]),
  );
}

// The mockup's per-hue tag tokens (--tag-{hue}-{border,bg,text}), named by hue for the
// workbench page (#229). Same values as the facet families they match, plus `rowBorder`: the
// border a tag gets inside the workbench's dropdowns (#229 stage 2), where it also sits on
// the raised grey of a chosen or active option. The dark theme's 60% border drops under 3:1
// on those greys, so it is 75% there; the light theme's solid border already holds.
const DARK_TAG_ROW_BORDERS = {
  orange: "rgba(251, 146, 60, 0.75)",
  blue: "rgba(96, 165, 250, 0.75)",
  cyan: "rgba(34, 211, 238, 0.75)",
  violet: "rgba(192, 132, 252, 0.75)",
  green: "rgba(74, 222, 128, 0.75)",
};

function tagHues(facets, rowBorders) {
  const hues = {
    orange: facets.amber,
    blue: facets.blue,
    cyan: facets.cyan,
    violet: facets.violet,
    green: facets.green,
  };
  return Object.fromEntries(
    Object.entries(hues).map(([hue, family]) => [
      hue,
      { ...family, rowBorder: rowBorders?.[hue] ?? family.border },
    ]),
  );
}

const DARK_FACET_FAMILIES = withFilledState(DARK_FACETS, BLACK);
const LIGHT_FACET_FAMILIES = withFilledState(LIGHT_FACETS, WHITE);

export const THEME_TOKENS = {
  dark: {
    page: BLACK,
    surface: {
      nav: "#0A0A0A",
      main: "#141414",
      input: "#0A0A0A",
      raised: "#262626",
      raised2: "#333333",
      track: "#333333",
    },
    border: { soft: "#2E2E2E", main: "#666666", strong: "#808080" },
    text: { primary: WHITE, text2: "#D9D9D9", muted: "#A6A6A6", muted2: "#8C8C8C" },
    brand: {
      fill: ISU_ORANGE,
      fillHover: "#E55A17",
      onFill: BLACK,
      line: ISU_ORANGE,
      lineLight: "#FF8A4C",
      lineDark: "#CC5219",
      onLine: BLACK,
      text: ISU_ORANGE,
      gold: ISU_GOLD,
      goldLine: ISU_GOLD,
      onGold: BLACK,
      onGoldLine: BLACK,
    },
    status: {
      ok: "#4ADE80",
      okText: "#4ADE80",
      okBg: "rgba(74, 222, 128, 0.12)",
      err: "#F87171",
      errText: "#F87171",
      errBg: "rgba(248, 113, 113, 0.12)",
      warn: "#FBBF24",
      onStatus: BLACK,
    },
    facet: DARK_FACET_FAMILIES,
    tag: tagHues(DARK_FACET_FAMILIES, DARK_TAG_ROW_BORDERS),
    viz: {
      // Visualization color keys (ai_documentation/VISUALIZATION_TYPE_CONTRACTS.md section 4.3).
      // `line` stands on the canvas (strokes, marks, colored text), `fill` fills a node or
      // gate, `onFill` is the label drawn on that fill.
      background: { line: "#A6A6A6", fill: "#333333", onFill: WHITE },
      solution: { line: "#4ADE80", fill: "#4ADE80", onFill: BLACK },
      elementHighlight: { line: "#60A5FA", fill: "#60A5FA", onFill: BLACK },
      clauseHighlight: { line: "#F472B6", fill: "#F472B6", onFill: BLACK },
      nodeBorder: "#A6A6A6",
      edge: "#6B6B6B",
      // De-emphasis is a color, never low opacity: still at least 3:1 on the canvas.
      dim: "#6B6B6B",
      // #229 stage 4: the ring (nodes, literals, clauses) and underlay (edges) a gadget row
      // draws on the pictures while it is hovered or focused. Reduce mode's gold, which no
      // color key uses, so it reads as "this gadget" and not as an answer or a step.
      gadget: ISU_GOLD,
      label: WHITE,
      blue: "#60A5FA",
      orange: "#FB923C",
      pink: "#F472B6",
      violet: "#C084FC",
      p3: "#22D3EE",
      p4: "#FACC15",
      p5: "#E879F9",
      p7: "#93C5FD",
      // pumpSchedule (exempt from the color-key table, section 3.6): fills carry `onFill` text.
      pump: {
        on: "#4ADE80",
        off: "#8C8C8C",
        peak: "#F87171",
        offPeak: "#4ADE80",
        tankLow: "#F87171",
        tankHigh: "#FB923C",
        tankNormal: "#60A5FA",
        onFill: BLACK,
      },
    },
  },
  light: {
    page: WHITE,
    surface: {
      nav: "#F2F2F2",
      main: "#F5F5F5",
      input: WHITE,
      raised: "#E6E6E6",
      raised2: "#D9D9D9",
      track: "#D4D4D4",
    },
    border: { soft: "#DEDEDE", main: "#8C8C8C", strong: "#737373" },
    text: { primary: BLACK, text2: "#262626", muted: "#525252", muted2: "#666666" },
    brand: {
      fill: ISU_ORANGE,
      fillHover: "#E55A17",
      onFill: BLACK,
      // #B84A0E is 5.2:1 on white and 4.8:1 on the surface grey, but only 4.2:1 on
      // surface.raised: don't put orange text on a raised (selected/hover) background.
      line: "#B84A0E",
      lineLight: "#D4561A",
      lineDark: "#8F390A",
      onLine: WHITE,
      text: "#B84A0E",
      gold: ISU_GOLD,
      goldLine: "#B45309",
      onGold: BLACK,
      onGoldLine: WHITE,
    },
    status: {
      ok: "#15803D",
      okText: "#166534",
      okBg: "#E8F7EE",
      err: "#B91C1C",
      errText: "#991B1B",
      errBg: "#FDECEC",
      warn: "#B45309",
      onStatus: WHITE,
    },
    facet: LIGHT_FACET_FAMILIES,
    tag: tagHues(LIGHT_FACET_FAMILIES),
    viz: {
      background: { line: "#525252", fill: "#E6E6E6", onFill: BLACK },
      solution: { line: "#15803D", fill: "#15803D", onFill: WHITE },
      elementHighlight: { line: "#1D4ED8", fill: "#1D4ED8", onFill: WHITE },
      clauseHighlight: { line: "#BE185D", fill: "#BE185D", onFill: WHITE },
      nodeBorder: "#525252",
      edge: "#8A8A8A",
      dim: "#8A8A8A",
      gadget: "#B45309",
      label: BLACK,
      blue: "#1D4ED8",
      orange: "#C2410C",
      pink: "#BE185D",
      violet: "#7E22CE",
      p3: "#0E7490",
      p4: "#A16207",
      p5: "#A21CAF",
      p7: "#1E3A8A",
      pump: {
        on: "#15803D",
        off: "#525252",
        peak: "#B91C1C",
        offPeak: "#15803D",
        tankLow: "#B91C1C",
        tankHigh: "#C2410C",
        tankNormal: "#1D4ED8",
        onFill: WHITE,
      },
    },
  },
};
