// ESLint flat config (ESLint 9+). CommonJS to match the repo (no "type":"module").
// Ported from Redux_GUI's eslint.config.js — same layering, same reasoning:
//   1. ignores        — vendored + build output we must NOT lint
//   2. js.recommended — base-JavaScript correctness floor (eslint-config-next doesn't include it)
//   3. next/core-web-vitals — React + hooks + jsx-a11y + @next, plus browser/node globals
//   4. import-x       — import-correctness (Next's bundled import plugin crashes under ESLint 9
//                       flat config, see Redux_GUI's eslint.config.js for the full explanation)
//   5. project tuning — severity choices for this repo
//   6. eslint-config-prettier — MUST be last: turns off stylistic rules so Biome owns formatting

const js = require("@eslint/js");
const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");
const importX = require("eslint-plugin-import-x");
const prettier = require("eslint-config-prettier");

const nextConfigs = Array.isArray(nextCoreWebVitals) ? nextCoreWebVitals : [nextCoreWebVitals];

module.exports = [
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "public/**", "next-env.d.ts"],
  },

  js.configs.recommended,

  ...nextConfigs,

  {
    plugins: { "import-x": importX },
    settings: {
      "import-x/resolver": { node: { extensions: [".js", ".jsx", ".json"] } },
    },
    rules: {
      "import-x/named": "warn",
      "import-x/no-unresolved": "warn",
    },
  },

  {
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  prettier,
];
