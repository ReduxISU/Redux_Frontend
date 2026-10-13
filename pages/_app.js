import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import Head from "next/head";
import "../styles/globals.css";
import theme, { THEME_COLOR_SCHEME_STORAGE_KEY, THEME_MODE_STORAGE_KEY } from "../components/theme";

// T28 (#37): the Pages Router doesn't inject a viewport meta tag on its own
// (unlike the App Router's automatic metadata handling), and doesn't want
// one added via a custom pages/_document.js either -- Next.js warns against
// that specifically (no-document-viewport-meta) since _document only
// renders once per full page load, not per client-side navigation. _app.js
// is the router's own recommended place for it. Without this, every
// breakpoint below is inert on a real phone or tablet: the browser assumes
// a ~980px desktop layout and zooms out to fit it instead of rendering at
// the device's own width.
//
// #156: the theme has dark and light color schemes. defaultMode "system" follows the
// visitor's prefers-color-scheme until they press the nav toggle; the storage keys match
// pages/_document.js's InitColorSchemeScript so the first paint already uses the right scheme.
export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider
      theme={theme}
      defaultMode="system"
      modeStorageKey={THEME_MODE_STORAGE_KEY}
      colorSchemeStorageKey={THEME_COLOR_SCHEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      <CssBaseline enableColorScheme />
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
