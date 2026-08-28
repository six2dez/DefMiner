// Vite config for the DefMiner frontend plugin.
//
// This file is MERGED INTO, not replaced by, the config `@caido-community/dev`
// builds internally. `buildFrontendPlugin` calls vite's `build()` with an inline
// config that sets `root`, `build.lib` (entry `src/index.ts`, ES format, output
// `index.js` + `index.css`) and `emptyOutDir` — and it does NOT pass
// `configFile: false`, so vite still loads THIS file from the plugin root and
// merges it, inline winning on conflicts [verified against
// @caido-community/dev@0.1.7 dist/cli.js:64-99 this session].
//
// So: do not restate `build.lib` here (it would be overridden anyway, which
// makes it a lie in the source). Everything below is a key the internal config
// leaves untouched.

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

import { ROLLUP_EXTERNAL } from "./externals.mjs";

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      // Caido's renderer already provides these. Bundling `vue` in particular
      // gives DefMiner a SECOND reactivity runtime inside the host page
      // (threat T-05-03) — an elevation-of-privilege shaped defect that
      // produces no error, just two Vues disagreeing about the same DOM.
      //
      // Imported, never restated: `scripts/ci/frontend-externals.mjs` asserts
      // this same list against the BUILD OUTPUT, and a second copy of the list
      // is a second thing to forget.
      // Spread, not passed by reference: the shared list is frozen (so no
      // consumer can mutate the other's view of it) and rollup's `external`
      // option is typed mutable.
      external: [...ROLLUP_EXTERNAL],
    },
  },
});
