/** @type {import('next').NextConfig} */
module.exports = {
  output: "standalone",
  // A second build or dev server can write elsewhere (NEXT_DIST_DIR=.next-g) while one runs
  // from .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  // Hides the Next.js dev indicator (the "N" badge, dev server only); errors still show.
  devIndicators: false,
  transpilePackages: ["@mui/material", "@mui/icons-material", "@mui/system"],
};
