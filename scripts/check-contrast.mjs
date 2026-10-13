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
process.exit(failures ? 1 : 0);
