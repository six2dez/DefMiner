---
phase: 05-workspace-operator-workflow
plan: 01
subsystem: ui
tags: [vue, vite, tailwind, primevue, caido-sdk-frontend, postcss-prefixwrap, eslint, knip, rollup-externals]

# Dependency graph
requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: the shipped `artifacts` table, `listArtifacts`, and the registered `getArtifacts` RPC
  - phase: 00-runtime-reality-check
    provides: the DIST-05 bundle-gate pattern that both new gates follow
provides:
  - "`packages/frontend` (@defminer/frontend) — a buildable Vue workspace registered as a Caido frontend plugin"
  - "A sidebar item and a page at /defminer rendering real rows from the shipped artifacts table"
  - "The prefixwrap CSS containment pipeline, asserted on build output by scripts/ci/prefixwrap.mjs"
  - "The rollup externals contract, asserted on build output by scripts/ci/frontend-externals.mjs"
  - "packages/frontend/externals.mjs — the single external list both vite and the CI gate read"
  - "Rendering-safety R1's lint half: five rules at error, no inline disable possible, executed by scripts/ci/lint-r1.spec.ts"
  - "vitest compiles single-file components; jsdom via per-file docblock, no `projects` key"
  - "knip `ignoreExportsUsedInFile: false` — the Phase 1 hole is closed"
affects: [05-02, 05-05, 05-07, 05-08, 05-09, 05-10, 05-11, 05-12]

# Actuals (#2632)
actuals:
  tokens: 72000
  tasks: 4
  commits: 3

tech-stack:
  added:
    - vue@3.5.41
    - primevue@4.1.0
    - "@caido/primevue@0.3.3"
    - "@caido/tailwindcss@0.1.0"
    - tailwindcss@3.4.13
    - tailwindcss-primeui@0.6.1
    - postcss-prefixwrap@1.57.2
    - postcss@8.5.26
    - autoprefixer@10.5.4
    - pinia@3.0.4
    - "@vueuse/core@14.2.0"
    - vue-virtual-scroller@2.0.0-beta.8
    - "@caido/sdk-frontend@0.58.2"
    - "@vitejs/plugin-vue@6.0.1"
    - vue-tsc@3.2.4
    - vite@6.4.3
    - jsdom@30.0.1
    - "@vue/test-utils@2.4.11"
  patterns:
    - "Build-output gates: a .mjs run as a subprocess against a BUILT artifact, with a spec asserting exit code AND printed output against deliberately-broken fixtures"
    - "One shared list, two consumers: packages/frontend/externals.mjs is imported by vite.config.ts and by the CI gate, so there is no second copy to drift"
    - "A gate that cannot find its target, or finds nothing to check, exits non-zero — 'nothing was checked' is not 'nothing was wrong'"
    - "Per-file `// @vitest-environment jsdom` docblock instead of a vitest `projects` key (P2-D4)"
    - "Per-export `@internal` JSDoc instead of a config-wide knip exemption — the claim lives where somebody editing the code will see it"
    - "Behavioural lint gate: run eslint as a subprocess against fixtures, because --print-config reports what the config SAYS, not what the linter DOES"

key-files:
  created:
    - packages/frontend/package.json
    - packages/frontend/tsconfig.json
    - packages/frontend/vite.config.ts
    - packages/frontend/postcss.config.cjs
    - packages/frontend/tailwind.config.ts
    - packages/frontend/externals.mjs
    - packages/frontend/src/index.ts
    - packages/frontend/src/index.spec.ts
    - packages/frontend/src/App.vue
    - packages/frontend/src/App.spec.ts
    - packages/frontend/src/backend.ts
    - packages/frontend/src/shims-vue.d.ts
    - packages/frontend/src/styles/index.css
    - scripts/ci/prefixwrap.mjs
    - scripts/ci/prefixwrap.spec.ts
    - scripts/ci/frontend-externals.mjs
    - scripts/ci/frontend-externals.spec.ts
    - scripts/ci/lint-r1.spec.ts
    - .browserslistrc
  modified:
    - packages/caido.config.ts
    - package.json
    - tsconfig.json
    - tsconfig.eslint.json
    - vitest.config.ts
    - eslint.config.js
    - knip.json
    - .gitignore

key-decisions:
  - "Both low-download first-party Caido packages approved by the operator after registry verification (option-b): @caido/primevue@0.3.3 (279/wk) and @caido/tailwindcss@0.1.0 (258/wk)"
  - "The externals gate REQUIRES only `vue` to be present, because 'absent from the import set' cannot distinguish inlined from never-imported; the rest of the set is enforced by the complementary rule that every bare import must be declared external"
  - "vue/comment-directive is off in the frontend block — noInlineConfig alone does not stop an HTML eslint-disable comment in a Vue template"
  - "knip's Phase 1 hole is closed with per-export @internal tags rather than a narrower class-wide flag; the plan's premise that the frontend would give those types cross-module consumers is false, because the frontend must not depend on @defminer/backend"
  - "browserslist target is chrome >= 140, set BELOW the measured Chrome/148 in Caido 0.58.2, because too-low costs a lint fix and too-high ships a broken page"

patterns-established:
  - "Build-output assertion over config assertion: three separate defects this session would each have passed a config-reading check"
  - "Every CI gate names its remedy in the failure message, pointing at the one file to edit"
  - "Control cases in gate specs: a gate that fails on everything proves nothing"

requirements-completed: [UI-01, UISEC-01]

coverage:
  - id: D1
    description: "A sidebar item labelled DefMiner opens a page at /defminer whose body is an HTMLElement carrying the prefixwrap root id, rendering DefMiner's own markup"
    requirement: "UI-01"
    verification:
      - kind: unit
        ref: "packages/frontend/src/index.spec.ts#registers the page with an HTMLElement body, not a component"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/index.spec.ts#mounts on an element whose id is the prefixwrap root from postcss.config.cjs"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/index.spec.ts#registers exactly one sidebar item, at the page path, with no icon"
        status: pass
    human_judgment: false
  - id: D2
    description: "The page renders a 48px toolbar, a wrapping tab strip that paints all four fixed tabs on first paint with no counts, and a split body"
    requirement: "UI-01"
    verification:
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#renders every tab label on first paint, before any query resolves"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#wraps the tab strip instead of scrolling it or hiding tabs behind a menu"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#marks exactly one tab active, with the accent token"
        status: pass
    human_judgment: false
  - id: D3
    description: "Real artifact rows from the shipped getArtifacts RPC render as text, with every target-derived value in font-mono; a failed query leaves every tab rendered and routable and surfaces DefMiner-authored copy only"
    requirement: "UI-01"
    verification:
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#renders both artifact rows as text once the query resolves"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#renders every target-derived digest in font-mono"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#keeps every tab rendered and routable when the query fails"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#renders no markup from row data — every cell is text"
        status: pass
    human_judgment: false
  - id: D4
    description: "The built frontend CSS contains no rule whose selector is not anchored under #plugin--defminer, asserted against build output"
    requirement: "UISEC-01"
    verification:
      - kind: integration
        ref: "scripts/ci/prefixwrap.spec.ts (11 cases: real bundle, scoped, keyframes, escaped rule, partial selector list, late anchor, lookalike id, at-rule, empty, missing file)"
        status: pass
      - kind: other
        ref: "pnpm check:css — 61 rules checked against #plugin--defminer, exit 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "The built frontend bundle contains no inlined Vue and imports nothing Caido does not provide"
    requirement: "UISEC-01"
    verification:
      - kind: integration
        ref: "scripts/ci/frontend-externals.spec.ts (11 cases incl. inlined-Vue fixture, undeclared bare import, dynamic import, empty and missing bundle)"
        status: pass
      - kind: other
        ref: "pnpm check:externals — 1 bare specifier (vue), exit 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "Lint fails as an error, not a warning, on v-html and on the four dynamic-code forms, and no inline disable comment can re-enable them in the frontend"
    requirement: "UISEC-01"
    verification:
      - kind: integration
        ref: "scripts/ci/lint-r1.spec.ts (6 cases incl. line and block template disables, script-block disable, and a clean control)"
        status: pass
      - kind: other
        ref: "eslint --print-config packages/frontend/src/App.vue — all five rules severity 2, noInlineConfig true"
        status: pass
    human_judgment: false
  - id: D7
    description: "The visual result inside Caido — that the page actually looks like the UI-SPEC's design contract when the plugin is installed and opened"
    verification: []
    human_judgment: true
    rationale: "Every automated check here runs against build output and jsdom. Neither can answer whether the Caido theme's CSS variables resolve to a readable page in the real Electron renderer, whether the 48px toolbar and 32px rows read correctly at the host's root font size, or whether the tab strip wraps sensibly at a real window width. This needs the plugin installed in Caido and looked at."

# Metrics
duration: 34 min
completed: 2026-08-28
status: complete
---

# Phase 05 Plan 01: Frontend Workspace & Tracer Slice Summary

**A Vue 3 workspace registered as a Caido frontend plugin, rendering real rows from the shipped `artifacts` table on a `/defminer` page — plus two build-output gates (CSS containment, rollup externals) and rendering-safety R1's lint half armed as errors that no inline comment can disable.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-08-28T10:52:30Z
- **Completed:** 2026-08-28T11:26:38Z
- **Tasks:** 4 (1 blocking-human checkpoint, 1 tracer, 2 auto)
- **Files created/modified:** 38 (excluding the lockfile)

## The human-approved package gate

**Task 0, `checkpoint:decision`, `gate="blocking-human"`.** Decision route: **`option-b` → verify on the registry first → both approved.**

| Package | Weekly downloads | Flagged reasons | Verdict |
|---|---:|---|---|
| `@caido/primevue@0.3.3` | 279 | `low-downloads`, `no-repository` | **Approved with a stated residual** |
| `@caido/tailwindcss@0.1.0` | 258 | `low-downloads` | **Approved — clean** |

### `@caido/tailwindcss@0.1.0` — clean

- repository declared: `git+https://github.com/caido/ui-kit.git`; homepage `https://github.com/caido/ui-kit#readme`
- published by **GitHub Actions OIDC trusted publishing** (`npm-oidc-no-reply@github.com`)
- **SLSA provenance attestation present** (`predicateType: https://slsa.dev/provenance/v1`)
- 4 files, 5,629 bytes unpacked; license MIT; author Caido Labs Inc.
- `dependencies: {"tailwindcss": "3.4.13"}` — exact, and it matches the DIST-06 pin already in `pnpm-workspace.yaml`
- published 2026-02-12; `dist-tags.latest` = `0.1.0`, so the pin **is** latest
- integrity: `sha512-QZ9KeyFOPl9UkC6J+YtzTsaYjaUd8QW3jwu5kwbUIIULJTWZBr7R1pHSYmoSWood5RNQw6stNY7s8v1e2H2aTA==`

### `@caido/primevue@0.3.3` — approved with a stated residual

- repository: **NONE DECLARED** — the flagged reason, confirmed true
- **NO provenance attestation** — confirmed true
- published by `caidobot <dev@caido.io>` (publish token, not OIDC)
- 107 files, 1,535,039 bytes unpacked; license MIT; author Caido Labs Inc.
- `peerDependencies: {"primevue": "4.1.0"}` — exact, confirming the UI-SPEC's hard pin
- 26 versions since 2024-08-16 — a real maintained package, not a fresh typosquat
- published 2025-10-25; `dist-tags.latest` = `0.3.3`, so the pin **is** latest
- integrity: `sha512-y4wam8i8aK716HZLtq7jGcT3VeDeUefB+ulgkCCWPkXPQtfBBpOzImHwv3EvfZhw4EaSoKZbOzoqZ/TO8KgXNw==`

### The two decisive cross-checks

1. **The maintainer set is byte-identical across all three packages** — `@caido/primevue`, `@caido/tailwindcss` and the already-installed-and-vetted `@caido/sdk-backend`: `caido-chris, caidoadmin, caidobot, ian-caidoio, sytten`. (`sytten` = `code@efugulin.com`, Caido's founder; the rest are `@caido.io`.) The same five accounts that publish the SDK this plugin already runs on.
2. **Neither package runs any install-time script.** No `preinstall`, `install`, `postinstall` or `prepare` on either. The `prepublish`/`build`/`test` entries are publisher-side and never execute on a consumer install. This closes the vector a supply-chain gate actually exists to catch.

### Residual, stated as unresolved rather than closed

**`@caido/primevue@0.3.3` declares no repository and ships no provenance attestation.** It is trusted on *publisher identity* (maintainer set identical to `@caido/sdk-backend`) and on *carrying no install-time script* — **not** on a verifiable build. `@caido/tailwindcss` already publishes via GitHub Actions OIDC with SLSA provenance, which makes `@caido/primevue` lacking both look like a **gap in Caido's release pipeline rather than deliberate policy**. Worth raising upstream; not a reason to block here.

**Precedent this matches:** Phase 1 approved `@caido/eslint-config@0.10.0` at **153** weekly downloads — lower than either package here — through the same `gate="blocking-human"` route, with the `caido/typescript-configs` 404 known and explicit (recorded at `eslint.config.js:1-11`).

## Accomplishments

- **The tracer path is real and end to end.** `pnpm exec caido-dev build packages` produces both a backend and a frontend bundle; the frontend mounts a Vue app on a plain `div`, hands that element to `sdk.navigation.addPage`, registers a sidebar item, and renders rows returned by the already-shipped `getArtifacts` RPC as text.
- **Two build-output gates, each with its failure path executed** against deliberately-broken fixtures — 22 cases across the two specs, including the substring near-misses a naive check would wave through (`.foo #plugin--defminer` and `#plugin--defminerX`).
- **R1's lint half is armed and proven by behaviour, not by config.** Five rules at `error` with `noInlineConfig`; `vue/comment-directive` off; a spec that runs ESLint against real fixtures including a clean control case.
- **The Phase 1 `ignoreExportsUsedInFile` hole is fully closed** — `false`, with all 31 previously-hidden exports tagged `@internal` at their declarations.
- **Three latent build defects found and fixed** that every config-reading check would have passed. Two of them would have shipped a page that renders completely unstyled inside Caido.

## Task Commits

1. **Task 0: Package legitimacy checkpoint** — no commit (decision task; recorded above)
2. **Task 1: End-to-end tracer slice** — `925f4f5` (feat)
3. **Task 2: The two build-output gates** — `ba7ce65` (feat)
4. **Task 3: Arm the R1 lint rules and the test toolchain** — `43428b2` (feat)

## Files Created/Modified

### The frontend workspace

- `packages/frontend/package.json` — `@defminer/frontend`, private, ESM, exact pins throughout, **no dependency on `@defminer/backend`**
- `packages/frontend/src/index.ts` — `init(sdk)`: create a `div`, mount `createApp(App).use(createPinia()).use(PrimeVue, { unstyled: true, pt: Classic }).provide("sdk", sdk)` on it, then `addPage` and `registerItem`
- `packages/frontend/src/App.vue` — the three regions: 48px toolbar, wrapping tab strip, split body. Frozen four-entry tab list; artifacts body renders `sha256` / `byte_len` / `kind` / `last_seen_at` at 32px rows with `whitespace-pre` and `overflow-hidden`
- `packages/frontend/src/backend.ts` — the minimal RPC surface (`getArtifacts`) and `ArtifactRow`, declared locally because the frontend must not depend on the backend package
- `packages/frontend/src/shims-vue.d.ts` — makes `import App from "./App.vue"` resolve under plain `tsc`
- `packages/frontend/externals.mjs` — `EXTERNAL_NAMES`, `EXTERNAL_PREFIXES`, `REQUIRED_IMPORTS`, `isExternal`, `ROLLUP_EXTERNAL`
- `packages/frontend/vite.config.ts` — `@vitejs/plugin-vue` and `rollupOptions.external` from the shared list
- `packages/frontend/postcss.config.cjs` — tailwind (v3, absolute config path), autoprefixer, then `postcss-prefixwrap: "#plugin--defminer"` **last**
- `packages/frontend/tailwind.config.ts` — `preflight: false`, `darkMode: ["selector", '[data-mode="dark"]']`, `tailwindcss-primeui` + `@caido/tailwindcss`, absolute content glob

### Gates

- `scripts/ci/prefixwrap.mjs` / `.spec.ts` — CSS containment on build output (11 cases)
- `scripts/ci/frontend-externals.mjs` / `.spec.ts` — externals on build output (11 cases)
- `scripts/ci/lint-r1.spec.ts` — R1's lint half, executed (6 cases)
- `.browserslistrc` — `chrome >= 140`, with the measurement and the direction-of-error reasoning

### Repo wiring

- `packages/caido.config.ts` — second plugin entry, `root: "frontend"`
- `package.json` — `build` renamed, `build:backend` kept as an alias so `pretest` is unchanged; `check:css` and `check:externals` added
- `tsconfig.json`, `tsconfig.eslint.json` — frontend joins the solution build and the lint type program
- `vitest.config.ts` — `plugins: [vue()]` at the top level; **no `projects` or `workspace` key** (P2-D4 intact)
- `eslint.config.js` — `vue: true, compat: true`; the frontend safety block; a CommonJS block for `postcss.config.cjs`
- `knip.json` — `packages/frontend` workspace, `tags: ["-internal"]`, `ignoreExportsUsedInFile: false`
- 11 `packages/backend/src/**` files — **comment-only** `@internal` JSDoc tags on 31 exports

## Decisions Made

- **The externals gate's REQUIRED set is `vue` alone.** See deviation 8 — the plan's literal formulation would have failed every build.
- **`vue/comment-directive: "off"` in the frontend block.** `noInlineConfig` does not reach Vue template comments; measured, see deviation 6.
- **`@internal` tags over a narrower class-wide knip flag.** A per-export exemption states which one and invites the question why; a flag hides the whole class and stops anyone asking.
- **`chrome >= 140`, below the measured `Chrome/148`.** Too-low is stricter and costs a lint fix; too-high silently permits an API the operator's renderer lacks.
- **`@vue/test-utils` pinned at `2.4.11`, not `2.5.0`.** See deviation 5.
- **No "Export inventory" CTA in the toolbar.** Rendering a button that does nothing is a stub with a promise attached; plan 05-11 owns the export dialog.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `vite` was not resolvable from `packages/frontend`**
- **Found during:** Task 1
- **Issue:** `caido-dev build packages` died resolving `packages/frontend/vite.config.ts`'s own imports — `Did you mean to import "vite/dist/node/index.js"?`. Vite loads the plugin root's config file, so the package needs `vite` itself.
- **Fix:** `vite@6.4.3` added as a frontend devDependency, matching the version the `vite@<=6.4.2: 6.4.3` workspace override already forces.
- **Verification:** build proceeds past config loading.
- **Committed in:** `925f4f5`

**2. [Rule 1 - Bug] Tailwind's `config` path resolved against the process CWD**
- **Found during:** Task 1
- **Issue:** `tailwindcss: { config: "./tailwind.config.ts" }` resolves relative to the CWD, and the build runs from the repo root where that path does not exist. The failure was **not** a missing-file error: tailwind fell through to an undefined config and died inside `createContext` with `Cannot read properties of undefined (reading 'blocklist')`, pointing at the stylesheet.
- **Fix:** `path.join(__dirname, "tailwind.config.ts")`.
- **Verification:** CSS emits; the reasoning is recorded in the config comment.
- **Committed in:** `925f4f5`

**3. [Rule 1 - Bug] Tailwind's content globs matched nothing — the page would have rendered unstyled**
- **Found during:** Task 2, caught by the new prefixwrap gate's rule count
- **Issue:** `content: ["./src/**/*.{vue,ts}"]` also resolves against the CWD. **A content glob that matches nothing is not an error.** Tailwind emitted its base layer, generated **zero utilities**, and the build succeeded — producing a stylesheet that passes containment (every rule in it really is scoped) while the page renders completely unstyled inside Caido. Measured: 4 rules, 2 of them keyframes.
- **Fix:** absolute glob via `path.dirname(fileURLToPath(import.meta.url))`.
- **Verification:** 61 rules after the fix; every utility the component uses (`bg-surface-900`, `h-12`, `font-mono`, `text-primary-500`, `flex-wrap`, `py-16`, `h-8`, `whitespace-pre`, `text-danger-500`, `w-1/3`) confirmed present in the built CSS.
- **Committed in:** `ba7ce65`
- **Note:** the gate's "zero rules is a failure" rule *nearly* caught this — 4 > 0. Containment and completeness are different assertions and the gate correctly checks only the first; the near-miss is recorded here rather than papered over by widening the gate's remit.

**4. [Rule 3 - Blocking] `vue` was not resolvable from the repo root**
- **Found during:** Task 1
- **Issue:** vitest runs from the root and could not resolve `vue` for the frontend specs. `@vue/test-utils` also peer-depends on it.
- **Fix:** `vue@3.5.41` added as a root devDependency, same version as the frontend's, so pnpm links one store entry.
- **Verification:** both frontend specs collect and pass.
- **Committed in:** `925f4f5`

**5. [Rule 2 - Missing Critical] pnpm auto-added a supply-chain bypass and it was removed**
- **Found during:** Task 1
- **Issue:** `pnpm add -Dw @vue/test-utils@2.5.0` tripped the release-age policy (published 2026-08-27, **one day** before this session) and pnpm silently wrote `minimumReleaseAgeExclude: ['@vue/test-utils@2.5.0']` into `pnpm-workspace.yaml`. Keeping it would weaken a control this project deliberately runs, in the same session as a package-legitimacy checkpoint.
- **Fix:** downgraded to `@vue/test-utils@2.4.11` (published 2026-06-04, ~3 months old) and deleted the bypass entry. `pnpm-workspace.yaml` is byte-identical to its pre-session state.
- **Verification:** install reports `✓ Lockfile passes supply-chain policies` with no exclusion entry; `git diff pnpm-workspace.yaml` is empty.
- **Committed in:** `925f4f5`

**6. [Rule 2 - Missing Critical] `noInlineConfig` did not close the escape it was added to close**
- **Found during:** Task 3
- **Issue:** With `vue/no-v-html` at severity 2 **and** `linterOptions.noInlineConfig: true`, `eslint --print-config` reported exactly what R1 asks for — and a component carrying `v-html` plus `<!-- eslint-disable-next-line vue/no-v-html -->` **linted clean**. The same component without the comment reported the error. `noInlineConfig` governs ESLint's own comment mechanism; a `<template>` is parsed by `vue-eslint-parser` and its HTML comments are honoured by eslint-plugin-vue's own `vue/comment-directive` rule, which `noInlineConfig` does not reach. **The ban was one comment away from being decorative, in exactly the file type it exists to protect.**
- **Fix:** `"vue/comment-directive": "off"` in the frontend block, plus `scripts/ci/lint-r1.spec.ts` — six cases running ESLint as a subprocess against real fixtures, including line-level and block-level template disables, a script-block disable, and a clean control.
- **Verification:** the disabled fixture now reports `vue/no-v-html` as an error; the clean fixture exits 0.
- **Committed in:** `43428b2`

**7. [Rule 3 - Blocking] Task 3's toolchain was a prerequisite of Task 1's verification**
- **Found during:** Task 1
- **Issue:** Task 1's `<verify>` runs `App.spec.ts`, which imports a `.vue` file — impossible without the vitest Vue plugin, `jsdom` and `@vue/test-utils`, all of which the plan assigned to Task 3.
- **Fix:** those three moved into Task 1. Task 3 kept the eslint / browserslist / knip work, which is what its `<verify>` (`pnpm lint && pnpm knip`) actually gates.
- **Committed in:** `925f4f5`

**8. [Rule 1 - Bug] The externals gate as literally specified would have failed every build**
- **Found during:** Task 2
- **Issue:** The plan specifies the gate exit non-zero if `vue`, `@caido/frontend-sdk`, or any `@codemirror/` or `@lezer/` specifier is **absent** from the import set, "because absent means bundled". That inference does not hold. Absent has two opposite causes — inlined, or never imported — and the import set cannot distinguish them. Measured: the real bundle imports **`vue` and nothing else**. `@caido/sdk-frontend` is types-only here (its `index.js` is empty; the SDK arrives as `init()`'s argument), and no CodeMirror or Lezer module is referenced yet. The gate as written would have reported three violations against a correct bundle, on the first run, forever.
- **Fix:** split into two rules that are each sound. `REQUIRED_IMPORTS = ["vue"]` — every Vue app imports `createApp` unconditionally, so `vue` missing from a bundle that renders one can only mean inlining, which is threat T-05-03 exactly. Plus the complementary rule: **every bare specifier the bundle does import must be declared external**, which catches the inverse defect (a dependency left external that Caido will not resolve at runtime). The reasoning is written into `externals.mjs` beside the two lists.
- **Verification:** the spec's inlined-Vue fixture (Vue's source present, no `vue` specifier) fails with `"vue" is not imported` / `SECOND copy was inlined`; the undeclared-import fixture fails separately; the real bundle passes.
- **Committed in:** `ba7ce65`

**9. [Rule 2 - Missing Critical] `postcss` added at the repo root**
- **Found during:** Task 2
- **Issue:** `scripts/ci/prefixwrap.mjs` runs from the root and needs a real CSS parser. Hand-rolling one would miss nested at-rules, `@supports`, multi-line selector lists and braces inside attribute selectors — and a containment gate that misses a shape reports a containment it did not check.
- **Fix:** `postcss@8.5.26` as a root devDependency, same version as the frontend's.
- **Committed in:** `ba7ce65`

**10. [Rule 1 - Bug] The knip plan step rested on a false premise**
- **Found during:** Task 3
- **Issue:** The plan states "the sixteen types it was hiding now have cross-module consumers, which is exactly the condition the note named". They do not, and cannot: the frontend is **prohibited** from depending on `@defminer/backend`, so it declares its own `ArtifactRow` rather than importing the backend's. Setting the flag to `false` surfaced **31** exports (26 types, 5 values), not sixteen, and none of them gained a consumer.
- **Fix:** the hole is still fully closed — `ignoreExportsUsedInFile: false` — via `tags: ["-internal"]` plus an `@internal` TSDoc tag on each of the 31 declarations. Every exemption is now named in the file somebody editing it will read, and a *new* dead export of any kind is reported again.
- **Verification:** `pnpm knip` exits 0; the 31 are enumerated below.
- **Committed in:** `43428b2`

**11. [Rule 3 - Blocking] Four files the plan did not list**
- **Found during:** Tasks 1–3
- **Issue/Fix:**
  - `packages/frontend/externals.mjs` — the plan's own `key_links` require the gate to mirror vite's external list; two copies of a list is the drift the gate exists to catch, reproduced inside the gate.
  - `packages/frontend/src/backend.ts` — `Caido`'s endpoint type parameter defaults to `Record<string, never>`, so `sdk.backend.getArtifacts()` does not typecheck without a local endpoint declaration. The full `DefinePluginPackageSpec` contract is plan 05-07's.
  - `packages/frontend/src/shims-vue.d.ts` — plain `tsc` cannot parse `.vue`, and the root solution build is plain tsc.
  - `scripts/ci/lint-r1.spec.ts` — see deviation 6.
- **Committed in:** `925f4f5`, `43428b2`

**12. [Rule 1 - Bug] Two acceptance-criterion commands were not runnable as written**
- **Found during:** Tasks 1 and 3
- **Issue:** (a) The `packages/caido.config.ts` check regex-matches `root: "..."` over the raw file and therefore also matched the phrase `root: "."` **inside the header comment** explaining why `"."` is forbidden — the file was correct and the check reported failure. (b) `node -e "const k=require('./knip.json')..."` cannot parse `knip.json`: it has been JSONC, with comments, since Phase 1.
- **Fix:** both re-run with comments stripped first. **(a)** `kinds: ["backend","frontend"]`, `roots: ["backend","frontend"]` — PASS. **(b)** `ignoreExportsUsedInFile === false` — PASS. The plan's criterion for (b) is disjunctive and its second branch (naming every exception) is also satisfied below.

**13. [Rule 2 - Missing Critical] Loading and error copy authored rather than taken verbatim**
- **Found during:** Task 1
- **Issue:** The Copywriting Contract's loading string is "Loading the first 100 rows…" and its error string names secrets and a 10-second timeout. This tab shows artifacts, `getArtifacts` has no page size of 100 and no 10s timeout, and none of it is implemented yet. Using the strings verbatim would put three false statements on screen.
- **Fix:** DefMiner-authored equivalents that are true of what actually runs. The contract's empty-state heading and body are used **verbatim**, because those are true as written.
- **Additionally:** the rejection value from `getArtifacts()` is **discarded**, never rendered — an error crossing the RPC boundary can quote target-controlled bytes, and the contract's rule that no sentence interpolates a target-controlled string outranks the rest. Asserted by `App.spec.ts#keeps every tab rendered and routable when the query fails`.
- **Committed in:** `925f4f5`

---

**Total deviations:** 13 auto-fixed (4 × Rule 1 bugs, 5 × Rule 2 missing-critical, 4 × Rule 3 blocking)
**Impact on plan:** No scope creep. Three of the thirteen (2, 3, 6) were defects that would have shipped: two produce a completely unstyled page inside Caido and one leaves the `v-html` ban disableable by a comment. Deviation 8 corrects a gate specification that would have failed every build from the first run. Deviations 5 and 13 are security posture — a supply-chain bypass removed, and target-controlled bytes kept out of rendered prose.

## The 31 exports tagged `@internal`

The plan asks that any export forcing an exception be named. All 31 are declared in `packages/backend/src/**` next to the function or table that uses them, and are referenced only inside their own module. **Comment-only edits — no behaviour, type or test change.**

**Types (26):**

| File | Exports |
|---|---|
| `compat.ts` | `CompatResult`, `SurfaceScope`, `RequiredSurface`, `SurfaceOutcome` |
| `hooks/admit.ts` | `AdmitSdk`, `AdmitRequest`, `AdmitResponse` |
| `hooks/passive.ts` | `PassiveDeps`, `PassiveSdk`, `PassiveRequest`, `PassiveResponse` |
| `lifecycle.ts` | `LifecycleProject`, `ProjectOrNull`, `LifecycleSdk`, `LifecycleDeps`, `ProjectChangeSummary`, `LifecycleInstallation` |
| `store/analyses.ts` | `AnalysisRow`, `AnalysisClaim` |
| `store/artifacts.ts` | `ArtifactRow` |
| `store/migrations.ts` | `MigrationStepRecord`, `MigrationReport` |
| `store/observations.ts` | `ObservationRow` |
| `store/retention.ts` | `RetentionSweepSummary` |
| `telemetry.ts` | `Counters`, `SlimStatus` |

**Values (5):** `ARTIFACT_LIST_DEFAULT_LIMIT` (`store/artifacts.ts`), `OBSERVATION_LIST_DEFAULT_LIMIT` (`store/observations.ts`), `getSetting`, `resolveSetting`, `RETENTION_MAX_AGE_MS_KEY` (all `store/settings.ts`).

These five are the more interesting half: the Phase 1 flag was hiding **dead values, not just dead type aliases**, and that class is now visible again for anything added from here on.

## Known Stubs

Each is a region that exists to prove the layout and is explicitly owned by a later plan. None is load-bearing for this plan's goal.

| Stub | File | Resolved by |
|---|---|---|
| Evidence panel renders a label and "No row selected." — no evidence, no triage controls | `packages/frontend/src/App.vue` (`<aside aria-label="Evidence">`) | 05-10 |
| `observations`, `health` and `settings` tab bodies all render the empty-state block | `packages/frontend/src/App.vue` | 05-09, 05-12 |
| No "Export inventory" CTA in the toolbar — deliberately omitted rather than rendered inert | `packages/frontend/src/App.vue` (`<header>`) | 05-11 |
| Artifacts body renders every returned row with no virtualisation, keyset pagination or server-side sort | `packages/frontend/src/App.vue` | 05-07 |
| `@defminer/engine`, `vue-virtual-scroller` and `@vueuse/core` are declared but not imported | `packages/frontend/package.json`, `knip.json` | 05-03, 05-07, 05-08, 05-11 |

## Threat Flags

None. The three trust boundaries the plan names are the ones this plan crossed, and all three dispositions were implemented: `T-05-01` (text interpolation + non-disableable lint), `T-05-02` (prefixwrap asserted on build output), `T-05-03` (externals asserted on build output). `T-05-04` (`sha256` rendered) was accepted with the `font-mono` rule applied, which is what the register specifies.

## Issues Encountered

- **`eslint . --fix` could not autofix `App.vue`.** It reported a typescript-eslint parsing error ("that TSConfig does not include this file") on the same file that linted cleanly without `--fix`, so the fixes were never written. Worked around with `prettier --write` directly. Not investigated further — it does not affect `pnpm lint`, which is the gate.
- **`eslint --stdin-filename` cannot be used for the R1 fixtures.** typescript-eslint requires the file to exist in the TS program, so `lint-r1.spec.ts` writes real files to a gitignored, lint-ignored, typecheck-excluded directory and removes them in `afterAll`.

## Verification

| Check | Result |
|---|---|
| `pnpm exec caido-dev build packages` | exit 0, backend **and** frontend bundles produced |
| `pnpm test` | **36 files, 1,443 tests** — baseline was 31 files (`01-45-SUMMARY.md`), so **no drop**; +5 files, +29 tests |
| `pnpm lint` | exit 0 |
| `pnpm typecheck` | exit 0 |
| `vue-tsc --noEmit` (frontend) | exit 0 — templates typecheck too |
| `pnpm knip` | exit 0, with `ignoreExportsUsedInFile: false` |
| `pnpm check:bundle` | exit 0 (DIST-05 unaffected) |
| `pnpm check:css` | exit 0 — 61 rules, all anchored at `#plugin--defminer` |
| `pnpm check:externals` | exit 0 — 1 bare specifier (`vue`) |

## Self-Check: PASSED

All 19 files in `key-files.created` verified present on disk with `[ -f ]`. All three task commits verified present in `git log`. All acceptance criteria for tasks 1–3 re-run and passing; the two unrunnable criterion commands (deviation 12) re-run with comments stripped and passing. Plan-level `<verification>` block re-run in full — every line green, recorded in the table above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready for 05-02.** The architecture the whole phase builds outward from is proven rather than assumed: `addPage` takes an element, prefixwrap containment holds on build output, externals hold on build output, and PrimeVue's pass-through theme loads.

**Two things later plans should know:**

1. **The frontend cannot import from `@defminer/backend`,** and this is now load-bearing rather than stylistic — it is why `ArtifactRow` is declared twice. Any shared type belongs in `@defminer/engine` (which is already declared as a frontend dependency, awaiting its first import in 05-03).
2. **`pnpm knip` is now a real gate for new exports.** With `ignoreExportsUsedInFile: false`, a new export with no cross-module consumer fails the build. The remedy is an `@internal` tag at the declaration, not a config edit.

**One item for the operator, not a blocker:** `@caido/primevue@0.3.3` ships with no declared repository and no provenance attestation, while its sibling `@caido/tailwindcss` publishes via OIDC with SLSA provenance. That asymmetry is worth raising with Caido.

---
*Phase: 05-workspace-operator-workflow*
*Completed: 2026-08-28*
