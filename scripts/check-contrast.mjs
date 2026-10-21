// scripts/check-contrast.mjs
//
// #156: checks the WCAG 2 contrast of the theme's main color pairs, in BOTH themes, straight from
// components/themeTokens.js (the same values the MUI theme is built from). Fails (exit 1) when any
// pair is under AA: 4.5:1 for text, 3:1 for UI parts (borders, focus rings, graph marks).
//
//   node scripts/check-contrast.mjs          # prints the table, exits 1 on any failure
//
// Translucent colors (the dark theme's rgba tag backgrounds) are composited over the surface they
// sit on before measuring, which is what the eye actually sees.

import { THEME_TOKENS } from "../components/themeTokens.js";

const TEXT = 4.5;
const UI = 3;

function parse(color) {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = color.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/,
  );
  if (rgba) {
    return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] === undefined ? 1 : +rgba[4] };
  }
  throw new Error(`Unparseable color: ${color}`);
}

function over(top, bottom) {
  const t = parse(top);
  const b = parse(bottom);
  const mix = (x, y) => Math.round(x * t.a + y * (1 - t.a));
  const hex = [mix(t.r, b.r), mix(t.g, b.g), mix(t.b, b.b)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

function luminance(color) {
  const { r, g, b } = parse(color);
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(fg, bg) {
  const solidBg = parse(bg).a < 1 ? bg : bg;
  const a = luminance(over(fg, solidBg));
  const b = luminance(solidBg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

function pairsFor(t) {
  const s = t.surface;
  const pairs = [];
  const add = (name, fg, bg, min) => pairs.push({ name, fg, bg, min });

  for (const [bgName, bg] of [
    ["page", t.page],
    ["nav", s.nav],
    ["surface", s.main],
    ["raised", s.raised],
    ["input", s.input],
  ]) {
    add(`text on ${bgName}`, t.text.primary, bg, TEXT);
    add(`secondary text (muted) on ${bgName}`, t.text.muted, bg, TEXT);
    // Orange text is not used on the raised grey (light theme: 4.2:1); see themeTokens.js.
    if (bgName !== "raised") add(`link / orange text on ${bgName}`, t.brand.text, bg, TEXT);
    add(`orange line / focus ring on ${bgName}`, t.brand.line, bg, UI);
  }
  add("text2 on surface", t.text.text2, s.main, TEXT);
  add("disabled text (muted2) on surface", t.text.muted2, s.main, TEXT);
  add("disabled text (muted2) on raised", t.text.muted2, s.raised, TEXT);
  add("input border on input", t.border.main, s.input, UI);
  add("input border on surface", t.border.main, s.main, UI);
  add("strong border on surface", t.border.strong, s.main, UI);
  add("orange button label (black on orange)", t.brand.onFill, t.brand.fill, TEXT);
  add("orange button label, hover", t.brand.onFill, t.brand.fillHover, TEXT);
  add("gold fill label", t.brand.onGold, t.brand.gold, TEXT);
  add("primary contrastText on primary line", t.brand.onLine, t.brand.line, TEXT);
  add("secondary contrastText on gold line", t.brand.onGoldLine, t.brand.goldLine, TEXT);
  add("gold line on surface", t.brand.goldLine, s.main, UI);
  add("error text on surface", t.status.errText, s.main, TEXT);
  add("error text on error tint", t.status.errText, over(t.status.errBg, s.main), TEXT);
  add("error border on surface", t.status.err, s.main, UI);
  add("error banner label", t.status.onStatus, t.status.err, TEXT);
  add("success text on surface", t.status.okText, s.main, TEXT);
  add("success text on success tint", t.status.okText, over(t.status.okBg, s.main), TEXT);
  add("success border on surface", t.status.ok, s.main, UI);
  add("warning text on surface", t.status.warn, s.main, TEXT);

  for (const [name, f] of Object.entries(t.facet)) {
    const tagBg = over(f.bg, s.main);
    add(`tag ${name}: text on tag bg`, f.text, tagBg, TEXT);
    add(`tag ${name}: border on surface`, f.border, s.main, UI);
    add(`tag ${name}: accent mark on surface`, f.main, s.main, UI);
    add(`tag ${name}: filled label`, f.onStrong, f.strong, TEXT);
  }

  // #229 stage 2: the workbench's tagged dropdowns. Tags sit in the closed box (input), on the
  // open list (surface), on the chosen option (raised) and on the active option (raised2);
  // the chosen option carries a 3px accent mark and the list's text sits on raised2 too.
  for (const hue of ["blue", "violet", "cyan"]) {
    const f = t.tag[hue];
    for (const [bgName, bg] of [
      ["input", s.input],
      ["raised", s.raised],
      ["raised2", s.raised2],
    ]) {
      add(`dropdown tag ${hue}: text on tag bg over ${bgName}`, f.text, over(f.bg, bg), TEXT);
      add(`dropdown tag ${hue}: border on ${bgName}`, f.rowBorder, bg, UI);
    }
  }
  add("dropdown text on active option (raised2)", t.text.primary, s.raised2, TEXT);
  add("dropdown selected mark (accent line) on raised", t.brand.line, s.raised, UI);
  add("dropdown selected mark (accent line) on raised2", t.brand.line, s.raised2, UI);
  add("dropdown list border on surface", t.border.main, s.main, UI);
  add("info card border on surface", t.border.strong, s.main, UI);

  // #229 stage 3: Result & Verify. The certificate box's placeholder (an example certificate)
  // on the input, the gold-bordered Map button and Check-against target side on the raised
  // grey, the mapped certificate's green border on the input, and the verdict on the Showing
  // line (on the surface; covered by the success / error text pairs above).
  add("certificate placeholder (muted2) on input", t.text.muted2, s.input, TEXT);
  add("gold line on raised (Map button, target side)", t.brand.goldLine, s.raised, UI);
  add("success border on input (mapped certificate)", t.status.ok, s.input, UI);

  const v = t.viz;
  for (const key of ["background", "solution", "elementHighlight", "clauseHighlight"]) {
    for (const [bgName, bg] of [
      ["page", t.page],
      ["surface", s.main],
    ]) {
      add(`viz ${key}: line / colored text on ${bgName}`, v[key].line, bg, TEXT);
    }
    add(`viz ${key}: label on node fill`, v[key].onFill, v[key].fill, TEXT);
  }
  add("viz node border on surface", v.nodeBorder, s.main, UI);
  add("viz dimmed edge on page", v.dim, t.page, UI);
  add("viz dimmed edge on surface", v.dim, s.main, UI);
  add("viz label text on surface", v.label, s.main, TEXT);
  for (const hue of ["blue", "orange", "pink", "violet", "p3", "p4", "p5", "p7"]) {
    add(`viz hue ${hue} on surface`, v[hue], s.main, UI);
  }
  for (const key of ["on", "off", "peak", "offPeak", "tankLow", "tankHigh", "tankNormal"]) {
    add(`pump ${key}: label on fill`, v.pump.onFill, v.pump[key], TEXT);
  }
  add("pump tank bar on track", v.pump.tankNormal, s.track, UI);

  // #229 stage 4: the gadget highlight ring and edge underlay, on the picture's canvas (input)
  // and next to the background node fill it rings. The active gadget row's border in the
  // Result panel sits on the input grey too.
  add("gadget highlight on canvas (input)", v.gadget, s.input, UI);
  add("gadget highlight on surface", v.gadget, s.main, UI);
  add("gadget highlight next to background node fill", v.gadget, v.background.fill, UI);
  // #239: Color mode's gadget palette, on the canvas, the pane and next to a background node.
  for (const [key, color] of Object.entries(v.gadgetPalette)) {
    add(`gadget color ${key} on canvas (input)`, color, s.input, UI);
    add(`gadget color ${key} on surface`, color, s.main, UI);
    add(`gadget color ${key} next to background node fill`, color, v.background.fill, UI);
  }

  // #199: the picture states (components/pictures/pictureStates.js). Pictures sit on the
  // canvas (input) and the Legend on the pane (surface). Each state's line and its own text
  // color stand on both, and its ink is the text drawn on its fill (a node body, a table cell).
  // The gadget ring also lands on a stated piece's fill.
  for (const [name, state] of Object.entries(v.state)) {
    for (const [bgName, bg] of [
      ["canvas (input)", s.input],
      ["surface", s.main],
    ]) {
      add(`state ${name}: line on ${bgName}`, state.line, bg, UI);
      add(`state ${name}: text on ${bgName}`, state.text, bg, TEXT);
    }
    add(`state ${name}: ink on its fill`, state.ink, state.fill, TEXT);
  }
  add("state cell text (primary) on canvas", t.text.primary, s.input, TEXT);
  // #201: the Graph and Grouped Graph pictures. Plain edges and the hover trace stand on the
  // canvas; an order badge is the canvas color on the primary text color; group colors (cut
  // sides, color classes, clique-cover groups) carry their label on the fill, and their outline
  // stands on the canvas and, as a Legend swatch, on the pane.
  add("graph edge on canvas (input)", v.edge, s.input, UI);
  add("graph hover trace on canvas (input)", t.brand.line, s.input, UI);
  add("graph order badge text on badge", s.input, t.text.primary, TEXT);
  add("graph order badge on canvas", t.text.primary, s.input, UI);
  for (const [name, group] of Object.entries(v.group)) {
    add(`group ${name}: label on its fill`, group.ink, group.fill, TEXT);
    add(`group ${name}: line on canvas (input)`, group.line, s.input, UI);
    add(`group ${name}: line on surface`, group.line, s.main, UI);
  }
  add("table header text on raised", t.text.primary, s.raised, TEXT);
  // #279: the pale orange tint behind a shown pane's rail toggle (the pairs #280 checks).
  add("text on tint", t.text.primary, t.brand.tint, TEXT);
  add("secondary text (muted) on tint", t.text.muted, t.brand.tint, TEXT);
  add("link / orange text on tint", t.brand.text, t.brand.tint, TEXT);
  add("orange line on tint", t.brand.line, t.brand.tint, UI);
  // #270, #271: the tints behind a box or a region that holds other pieces (a Formula clause, a
  // Nested Set region). What sits on them: every state's outline, the hover trace, the gadget
  // marks, the muted ∨ and clause names, the ∧ (primary text), and each state's own text.
  for (const [tintName, tint] of Object.entries(v.tint)) {
    for (const [name, state] of Object.entries(v.state)) {
      add(`tint ${tintName}: state ${name} line on it`, state.line, tint, UI);
    }
    add(`tint ${tintName}: hover trace on it`, t.brand.line, tint, UI);
    add(`tint ${tintName}: gadget gold on it`, v.gadget, tint, UI);
    for (const [key, color] of Object.entries(v.gadgetPalette)) {
      add(`tint ${tintName}: gadget color ${key} on it`, color, tint, UI);
    }
    add(`tint ${tintName}: muted text on it`, t.text.muted, tint, TEXT);
    add(`tint ${tintName}: primary text on it`, t.text.primary, tint, TEXT);
    if (v.state[tintName]) {
      add(`tint ${tintName}: its state's text on it`, v.state[tintName].text, tint, TEXT);
    }
  }
  return pairs;
}

let failures = 0;
for (const [themeName, tokens] of Object.entries(THEME_TOKENS)) {
  console.log(`\n${themeName.toUpperCase()} THEME`);
  console.log(`${"pair".padEnd(48)} ${"fg".padEnd(9)} ${"bg".padEnd(9)} ratio   min  result`);
  for (const pair of pairsFor(tokens)) {
    const fg = parse(pair.fg).a < 1 ? over(pair.fg, pair.bg) : pair.fg;
    const r = ratio(fg, pair.bg);
    const pass = r >= pair.min;
    if (!pass) failures += 1;
    console.log(
      `${pair.name.padEnd(48)} ${fg.padEnd(9)} ${pair.bg.padEnd(9)} ${r.toFixed(2).padStart(5)}  ${String(pair.min).padEnd(4)} ${pass ? "pass" : "FAIL"}`,
    );
  }
}
console.log(failures ? `\n${failures} pair(s) under WCAG AA.` : "\nAll pairs meet WCAG AA.");

// #239: colors that must not be mistaken for each other on a picture. Contrast says a mark shows
// on the canvas; this says two marks don't look alike. Distance is CIE76 delta E in CIELAB
// (about 2.3 is a just-noticeable difference): the gadget gold against the orange hover trace
// (they were 6 apart in the light theme), and Color mode's gadget colors against each other, the
// picture states' lines and the trace.
const DISTINCT = 30;
const STATE_DISTINCT = 25;

function lab(color) {
  const { r, g, b } = parse(color);
  const linear = (value) => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [linear(r), linear(g), linear(b)];
  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 0.95047;
  const y = lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

function deltaE(a, b) {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

let alike = 0;
for (const [themeName, t] of Object.entries(THEME_TOKENS)) {
  const v = t.viz;
  const pairs = [["gadget gold vs hover trace (orange)", v.gadget, t.brand.line, DISTINCT]];
  const palette = Object.entries(v.gadgetPalette);
  palette.forEach(([key, color], index) => {
    pairs.push([`gadget color ${key} vs hover trace`, color, t.brand.line, DISTINCT]);
    for (const [otherKey, other] of palette.slice(index + 1)) {
      pairs.push([`gadget color ${key} vs ${otherKey}`, color, other, DISTINCT]);
    }
    for (const [state, family] of Object.entries(v.state)) {
      pairs.push([`gadget color ${key} vs state ${state}`, color, family.line, STATE_DISTINCT]);
    }
  });
  console.log(`\n${themeName.toUpperCase()} THEME: colors that must look different (delta E)`);
  for (const [name, a, b, min] of pairs) {
    const distance = deltaE(a, b);
    const pass = distance >= min;
    if (!pass) alike += 1;
    console.log(
      `${name.padEnd(48)} ${a.padEnd(9)} ${b.padEnd(9)} ${distance.toFixed(0).padStart(5)}  ${String(min).padEnd(4)} ${pass ? "pass" : "FAIL"}`,
    );
  }
}
console.log(alike ? `\n${alike} pair(s) too alike.` : "\nAll marks are distinct.");
process.exit(failures || alike ? 1 : 0);
