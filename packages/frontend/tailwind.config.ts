// Tailwind v3 config for the DefMiner frontend.
//
// Loaded by name from postcss.config.cjs. Every setting below is a constraint
// from 05-UI-SPEC.md, not a preference.

import path from "node:path";
import { fileURLToPath } from "node:url";

import caido from "@caido/tailwindcss";
import type { Config } from "tailwindcss";
import primeui from "tailwindcss-primeui";

// ABSOLUTE, resolved from THIS FILE. Tailwind resolves a relative content glob
// against the PROCESS CWD, and the build runs from the repo root
// (`caido-dev build packages`), where `./src` does not exist.
//
// The failure mode is why this is spelled out rather than left as a relative
// path: a content glob that matches nothing is not an error. Tailwind emits its
// base layer, generates ZERO utilities, and the build succeeds — shipping a
// stylesheet that passes a containment check (every rule in it really is
// scoped) while the page renders completely unstyled inside Caido. Measured
// this session: the first build produced 4 rules, 2 of them keyframes.
const HERE = path.dirname(fileURLToPath(import.meta.url));

export default {
  // `.vue` and `.ts` only. There is no `.html` in this package — the page's
  // root element is created in JavaScript by `init()`.
  content: [path.join(HERE, "src/**/*.{vue,ts}")],

  // OFF, and this is not optional. Preflight is a global reset: with prefixwrap
  // scoping it under `#plugin--defminer` it would reset the plugin's own subtree
  // against the host document's inherited styles, and the plugin would stop
  // looking like the tool it lives in. It is also why DefMiner declares no
  // `font-family` — the family and root size are INHERITED from Caido.
  corePlugins: { preflight: false },

  // Caido toggles its theme with `data-mode="dark"` on an ancestor, not with a
  // `.dark` class. `"selector"` + that attribute is what makes `dark:` variants
  // follow the host instead of a switch DefMiner would have to own.
  darkMode: ["selector", '[data-mode="dark"]'],

  plugins: [
    // PrimeVue's utility layer, matching the `pt`-driven Classic theme.
    primeui,
    // The six Caido colour roles — primary, secondary, danger, info, success,
    // surface — each step resolving to `hsl(var(--c-<role>-<step>))`
    // [verified against the installed dist this session]. This plugin is the
    // whole reason the zero-hex rule in 05-UI-SPEC.md § Color is enforceable:
    // the operator can restyle those CSS variables, and a hex literal in
    // DefMiner would survive their change and become the one unreadable
    // element on their page.
    caido,
  ],
} satisfies Config;
