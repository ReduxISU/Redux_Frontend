// pages/_document.js
//
// #156: InitColorSchemeScript runs before the page paints and sets data-theme="dark" | "light"
// on <html> from the visitor's saved choice (localStorage) or, with none saved, their system
// setting (prefers-color-scheme). Without it the server-rendered page would show the default
// dark theme for a moment before React applied a light choice. Its storage keys and attribute
// must match the ThemeProvider props in pages/_app.js, so both read them from
// components/theme.js.

import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { Head, Html, Main, NextScript } from "next/document";
import {
  THEME_ATTRIBUTE,
  THEME_COLOR_SCHEME_STORAGE_KEY,
  THEME_MODE_STORAGE_KEY,
} from "../components/theme";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <InitColorSchemeScript
          attribute={THEME_ATTRIBUTE}
          modeStorageKey={THEME_MODE_STORAGE_KEY}
          colorSchemeStorageKey={THEME_COLOR_SCHEME_STORAGE_KEY}
          defaultMode="system"
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
