// Tailwind v3 config for the DefMiner frontend.
//
// Loaded by name from postcss.config.cjs. Every setting below is a constraint
// from 05-UI-SPEC.md, not a preference.

import caido from "@caido/tailwindcss";
import type { Config } from "tailwindcss";
import primeui from "tailwindcss-primeui";

export default {
  // `.vue` and `.ts` only. There is no `.html` in this package — the page's
  // root element is created in JavaScript by `init()`.
  content: ["./src/**/*.{vue,ts}"],

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
