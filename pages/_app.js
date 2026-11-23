import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect } from "react";
import "../styles/globals.css";
import SiteFooter from "../components/SiteFooter";
import theme, { THEME_COLOR_SCHEME_STORAGE_KEY, THEME_MODE_STORAGE_KEY } from "../components/theme";
import { noteRoute } from "../lib/siteHistory";

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
//
// #303: every page ends in the same footer, the ISU logo centered under the page. The column
// is at least the window's height and the page fills what the footer leaves, so on a short
// page the footer sits at the bottom of the window rather than right under the content.
//
// #327: every page change is noted (lib/siteHistory.js), so the problem page's Back control
// knows whether going back in history stays on this site.
export default function App({ Component, pageProps }) {
  const router = useRouter();
  const { asPath, events, isReady } = router;
  // The first page, once its real address is known (before that a dynamic route's asPath can
  // be its pattern, /[problem]).
  useEffect(() => {
    if (isReady) noteRoute(asPath);
  }, [isReady, asPath]);
  useEffect(() => {
    events.on("routeChangeComplete", noteRoute);
    return () => events.off("routeChangeComplete", noteRoute);
  }, [events]);
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
        {/* #279: every page is titled; a problem page or Compare names its problems (theirs wins). */}
        <title>Redux</title>
      </Head>
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Component {...pageProps} />
        </Box>
        <SiteFooter />
      </Box>
    </ThemeProvider>
  );
}
