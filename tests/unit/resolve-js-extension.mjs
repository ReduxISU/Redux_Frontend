// tests/unit/resolve-js-extension.mjs
//
// #299. Loaded by `npm test` (`node --import`) before the unit tests run. The app's modules
// import each other without a file extension (`from "../data/taxonomy"`), which Next.js's
// bundler resolves but Node's own ES module loader does not. This hook retries such a relative
// import with ".js" added, so the tests can import the app's real modules unchanged.

import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      const relative = specifier.startsWith("./") || specifier.startsWith("../");
      if (error?.code !== "ERR_MODULE_NOT_FOUND" || !relative || /\.[cm]?js$/.test(specifier)) {
        throw error;
      }
      return nextResolve(`${specifier}.js`, context);
    }
  },
});
