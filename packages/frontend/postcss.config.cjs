// PostCSS pipeline for the DefMiner frontend. CommonJS (`.cjs`) because
// postcss-load-config reads it outside the package's `"type": "module"` context.
//
// ORDER IS THE DESIGN. Tailwind generates the rules, autoprefixer rewrites
// them, and prefixwrap runs LAST so it wraps everything both of them produced —
// including Tailwind's own utility classes. Running prefixwrap earlier would
// scope the authored CSS and leave the generated utilities global, which is the
// bug that looks like it works.
const path = require("path");

module.exports = {
  plugins: {
    // v3 as a PostCSS plugin (NOT v4's @tailwindcss/postcss — v4 removed the
    // config API `@caido/tailwindcss@0.1.0` is written against, and
    // pnpm-workspace.yaml pins 3.4.13 precisely so this cannot drift).
    // The config is a `.ts` file; tailwind v3.4 loads it through the `jiti` +
    // `sucrase` pair it already depends on.
    // ABSOLUTE, via __dirname. Tailwind resolves a relative `config` path
    // against the PROCESS CWD, not against this file — and the build runs from
    // the repo root (`caido-dev build packages`), where `./tailwind.config.ts`
    // does not exist. The failure is not a missing-file error either: tailwind
    // falls through to an undefined config and dies inside `createContext` with
    // `Cannot read properties of undefined (reading 'blocklist')`, pointing at
    // the stylesheet rather than at the path. Measured this session.
    tailwindcss: { config: path.join(__dirname, "tailwind.config.ts") },
    autoprefixer: {},

    // THE CSS CONTAINMENT CONTROL (threat T-05-02). Every rule this pipeline
    // emits is rewritten to sit under this selector, so DefMiner's stylesheet
    // cannot restyle Caido itself or any other installed plugin.
    //
    // THIS STRING AND THE MOUNT ELEMENT'S id IN src/index.ts ARE ONE FACT.
    // A mismatch does not error — it silently unstyles the entire page, because
    // every rule ends up scoped to an element that does not exist.
    // `src/index.spec.ts` reads the value from HERE and asserts the mounted
    // element's id equals it with the leading `#` removed, rather than
    // restating the literal a third time.
    "postcss-prefixwrap": "#plugin--defminer",
  },
};
