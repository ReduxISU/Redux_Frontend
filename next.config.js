/** @type {import('next').NextConfig} */
module.exports = {
  output: "standalone",
  reactStrictMode: true,
  // Hides the Next.js dev indicator (the "N" badge, dev server only); errors still show.
  devIndicators: false,
  transpilePackages: ["@mui/material", "@mui/icons-material", "@mui/system"],
};
