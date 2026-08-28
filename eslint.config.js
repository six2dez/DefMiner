// DefMiner ESLint flat config.
//
// Base: @caido/eslint-config@0.10.0 — Caido's own conventions, so DefMiner does
// not drift from the ecosystem it ships into. Installed on 2026-08-20 through a
// `gate="blocking-human"` package-legitimacy checkpoint (01-02-PLAN.md task 1):
// it is the ONE package in Phase 1's install set that was never exercised in
// Phase 0, at 153 weekly downloads. The operator approved it with the evidence
// on the table, including that github.com/caido/typescript-configs returns 404
// to the API because Caido keeps some config repos private. See 01-02-SUMMARY.md
// § "The human-approved package gate".
//
// `vue: true` — TURNED ON BY PLAN 05-01, which is what P1-D5 deferred it for.
// packages/frontend now exists and App.vue is a real single-file component, so
// the Vue rules have something to check. The two Vue packages were already
// arriving transitively; this stops paying for them and getting nothing.
// `node: true` — the engine, the CI gates and every script run on Node.
// `compat: true` — ALSO turned on by plan 05-01, and it could not be turned on
// before this one was. eslint-plugin-compat checks BROWSERSLIST targets; with
// no browserslist config it falls back to `op_mini all` and reports `Promise`
// and `URL` unsupported, which is why Phase 1 left it off rather than accept
// permanent noise. `.browserslistrc` now carries a single measured target —
// Caido 0.58.2's Electron renderer reports Chrome/148, and the file records
// both the measurement and why the target sits below it.
//
// Note what compat does NOT cover, so nobody reads this as broader than it is:
// the BACKEND runs in Caido's QuickJS, whose real capability surface is
// measured in .../results/runs/20260820T121824Z-31596/raw/capabilities.json and
// is not a browser table. A browserslist says nothing about QuickJS. The DIST-05
// bundle gate remains the only thing that answers that question.

import { defaultConfig } from "@caido/eslint-config";

const preset = defaultConfig({ vue: true, node: true, compat: true });

/**
 * The `vue` plugin object, taken from the preset rather than imported.
 *
 * Flat config scopes plugin names PER CONFIG OBJECT: a block that sets
 * `vue/no-v-html` must define `vue` itself, or ESLint refuses to start with
 * "could not find plugin". The alternative is adding `eslint-plugin-vue` as a
 * direct dependency — but it is already in the tree, underneath
 * @caido/eslint-config, and declaring it separately would create a SECOND
 * version to drift. Reaching into the preset guarantees the override applies to
 * the same plugin instance the preset itself configured.
 */
const vuePlugin = preset.find((c) => c?.plugins?.vue)?.plugins.vue;

if (vuePlugin === undefined) {
  // Loud, not silent. If a preset bump moves the plugin, the R1 override below
  // would otherwise vanish quietly and take rendering safety's lint half with
  // it — a control that stops existing without anything failing is the exact
  // shape of defect this repo keeps finding.
  throw new Error(
    "@caido/eslint-config no longer exposes the `vue` plugin; the R1 override " +
      "in this file cannot be applied. Fix it here — do not delete the block.",
  );
}

export default [
  ...preset,

  {
    // The preset enables TYPED typescript-eslint rules, which need a TS program
    // covering every linted file. tsconfig.eslint.json exists for exactly that
    // and for nothing else — see its header. The typecheck that enforces the
    // DET-03 boundary is `pnpm typecheck` (tsc --build), not this.
    languageOptions: {
      parserOptions: {
        // `projectService: false` is required, not stylistic: the preset turns
        // the service ON, and typescript-eslint then IGNORES `project` and
        // reports "Enabling project does nothing when projectService is
        // enabled" as a parse error on every file the service cannot place. An
        // explicit project list is deterministic here, where several linted
        // files (the .mjs gates, vitest.config.ts, packages/caido.config.ts)
        // belong to no package tsconfig.
        projectService: false,
        project: ["./tsconfig.eslint.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    // Build outputs, vendored corpora and Phase 0 measurement apparatus. The
    // probes are hand-written QuickJS scripts measured against a real Caido and
    // committed as evidence; reformatting them would invalidate the artifact.
    // SCOPE. `pnpm lint` gates the code this repo AUTHORS from Phase 1 onward:
    // packages/**, scripts/ci/** and the root config files. It deliberately does
    // NOT gate the Phase 0 measurement apparatus.
    //
    // That is a decision, not an oversight. `tests/**` and `scripts/spike/**`
    // are Phase 0 EVIDENCE — hand-written probes and exit gates measured against
    // a real Caido 0.57.1 — and this plan's own acceptance criterion requires
    // `git status --porcelain scripts/spike tests probe corpus caido.config.ts`
    // to come back clean. The preset runs `prettier/prettier` as an error, so
    // linting those trees would leave exactly two options: fail forever, or
    // reformat files this plan is forbidden to touch. A later phase that is
    // ALLOWED to touch them can widen this list in the same commit that
    // reformats them.
    //
    // `packages/engine/src/thresholds.generated.ts` is generated, byte-compared
    // against a fresh generator run by thresholds.spec.ts gate 1, and a lint
    // autofix there would fail that gate rather than fix anything.
    ignores: [
      "**/dist/**",
      "node_modules/**",
      "corpus/**",
      "probe/**",
      "tier1/**",
      ".spike/**",
      ".planning/**",
      // NAMED FILES, not `tests/**`. ESLint's flat config cannot un-ignore a
      // file inside an ignored directory, and this plan authors tests/pins.spec.ts
      // — which must be gated like every other new file. Listing the four
      // existing specs instead means the default for anything added to tests/
      // later is LINTED, which is the correct default.
      "tests/go-no-go.spec.ts",
      "tests/schema.spec.ts",
      "tests/spike-results.spec.ts",
      "tests/phase1-runtime.spec.ts",
      "scripts/spike/**",
      "caido.config.ts",
      "packages/engine/src/thresholds.generated.ts",
      // Transient fixtures written by scripts/ci/lint-r1.spec.ts, which lints
      // them EXPLICITLY with `--no-ignore`. Ignored here so a crashed spec run
      // that leaves one behind cannot break `pnpm lint` with a violation it
      // deliberately authored.
      "packages/frontend/src/__r1_fixtures__/**",
    ],
  },

  {
    // -----------------------------------------------------------------------
    // ADOPTED PRESET, FOUR NAMED EXCEPTIONS.
    // -----------------------------------------------------------------------
    // Caido's conventions are taken wholesale. These four rules are turned off
    // for DefMiner's own packages because each one contradicts a MEASURED
    // decision in this repo rather than a stylistic preference. Every exception
    // names its evidence; an exception without one does not belong here.
    // `.vue` IS IN SCOPE AS OF PLAN 05-09, and the omission was a gap rather
    // than a decision. The exception's own evidence is about `null` being a
    // first-class value in this codebase, and the frontend's single-file
    // components consume exactly the types that carry it — `PageRequest["filter"]`
    // is `{ column; value } | null`, and a table prop that can say "I have
    // nothing to report" has to be able to say `| null`. Restricted to `.ts`
    // the rule pushed a `.vue` file towards `undefined`, which in a Vue prop
    // means ABSENT and defaulted, not PRESENT AND EMPTY — two different claims,
    // and the difference is the whole reason 05-09's tables take a required
    // nullable prop instead of an optional one.
    files: ["packages/**/*.{ts,vue}"],
    rules: {
      // `null` is a first-class value in this codebase and collapsing it into
      // `undefined` would destroy information the Phase 0 exit gates assert on.
      // go-no-go.json carries `CACHE_HIT_RATE_CROSS_DAY: null` to mean
      // MEASURED-AND-INCONCLUSIVE, and STATE.md records three review rounds
      // spent closing the "fabricate a number instead of admitting null" path.
      // SQLite columns are nullable for the same reason. The rule also bans
      // `ReturnType<>`, which is the only portable way to type a timer handle
      // across Node (vitest) and QuickJS (Caido) — the two runtimes this code
      // must compile for.
      "@typescript-eslint/no-restricted-types": "off",
    },
  },

  {
    // SAME exception as packages/**, for the same measured reason, extended to
    // the gates in tests/ by plan 01-06.
    //
    // `no-restricted-types` bans `null` as a type. But the artifacts these gates
    // read RECORD null, and null means something there that `undefined` does
    // not: `coverage_row: null` is "this is a capability, not one of the 40
    // enumerated API surfaces", and `reason: null` is "compatible, nothing to
    // explain". tests/phase1-compat.spec.ts declares the artifact's shape rather
    // than reaching for `any` precisely so a renamed field is a typecheck
    // failure instead of a silently-undefined assertion that passes — and it
    // cannot declare that shape honestly without `| null`.
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-restricted-types": "off",
    },
  },

  {
    files: ["packages/backend/**/*.ts"],
    rules: {
      // The SDK boundary is DELIBERATELY untyped. Phase 0 measured that
      // @caido/quickjs-types under-declares the real runtime by roughly a factor
      // of thirteen (SPIKE-12) and declares about 6 of the 100 globals a probe
      // actually enumerated (SPIKE-07). Typing `sdk` against it would assert a
      // surface that does not match the runtime — the precise failure Phase 0
      // exists to prevent. Plan 01-06 owns the SDK-surface probe; until then
      // `any` at the boundary is the honest annotation, and every value crossing
      // it is narrowed by the synchronous `extract()` in ingest/consumer.ts.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      // Same root cause. This rule flags `if (!raw || raw.length === 0)` as an
      // always-true condition because the type says `Uint8Array`. The type is
      // the thing under suspicion: Phase 0's standing conclusion is NEVER trust
      // the type package as a capability list. These guards are the measured
      // shape, not dead code.
      "@typescript-eslint/strict-boolean-expressions": "off",
    },
  },

  {
    // -----------------------------------------------------------------------
    // RENDERING SAFETY R1 — the LINT HALF. (UISEC-01, threat T-05-01)
    // -----------------------------------------------------------------------
    // 05-UI-SPEC.md § Rendering Safety Contract R1 says v-html is "banned by
    // lint, as an error, on every file, with no per-line disable permitted".
    // The shipped preset does not do that, and the gap was MEASURED rather than
    // assumed, twice:
    //
    //   `vue/no-v-html` — @caido/eslint-config@0.10.0 applies
    //   eslint-plugin-vue's `flat/recommended` restricted to **/*.vue, and in
    //   eslint-plugin-vue@10.6.0 that config sets the rule to "warn". A warning
    //   is not a ban: it prints alongside everything else and ships.
    //
    //   `no-eval` / `no-new-func` / `no-implied-eval` / `no-script-url` — the
    //   preset applies eslint-plugin-no-unsanitized's recommended config, which
    //   covers innerHTML, outerHTML, insertAdjacentHTML and document.write and
    //   covers NEITHER dynamic-code-construction form. @eslint/js recommended
    //   does not carry any of the four either. R1 names `new Function` and
    //   `eval` explicitly and would otherwise be entirely unenforced — the same
    //   "stated reach exceeds executed reach" defect this repo has a history of.
    //
    // THIS IS THE WEAKER OF TWO CONTROLS AND IS DOCUMENTED AS SUCH. A lint rule
    // is a rule about source text that a person editing that text can turn off;
    // `noInlineConfig` below closes the per-line escape, but the block itself
    // is still one edit away from being deleted. The stronger control is the
    // static AST gate in plan 05-05, for exactly the reason
    // sql-discipline.spec.ts's header gives about behavioural tests: a spec-file
    // gate cannot be disabled by a comment in the file it is judging.
    files: ["packages/frontend/**/*.{ts,vue}"],
    plugins: { vue: vuePlugin },
    linterOptions: {
      // So `// eslint-disable-next-line vue/no-v-html` cannot re-enable any of
      // the five below. Without this the entire block is advisory.
      noInlineConfig: true,
    },
    rules: {
      // `noInlineConfig` ALONE DOES NOT CLOSE THE ESCAPE IN A .vue FILE, and
      // this was measured rather than reasoned about. ESLint's `noInlineConfig`
      // governs ESLint's own inline-comment mechanism. A `<template>` block is
      // parsed by vue-eslint-parser, and `<!-- eslint-disable-next-line
      // vue/no-v-html -->` inside it is honoured by eslint-plugin-vue's OWN
      // rule, `vue/comment-directive`, which `noInlineConfig` does not touch.
      //
      // Measured this session: with `noInlineConfig: true` and `vue/no-v-html`
      // at error, a probe component carrying `v-html` plus that HTML comment
      // linted CLEAN — while the same probe without the comment reported the
      // error. The ban was one comment away from being decorative, in exactly
      // the file type it exists to protect. Turning the directive rule off is
      // what makes template comments inert.
      "vue/comment-directive": "off",

      // Target-controlled bytes reach the DOM in this package for the first
      // time in the project. They are rendered as TEXT, always.
      // Target-controlled bytes reach the DOM in this package for the first
      // time in the project. They are rendered as TEXT, always.
      "vue/no-v-html": "error",
      "no-eval": "error",
      "no-new-func": "error",
      "no-implied-eval": "error",
      // `href="javascript:..."` built from an extracted URL. R1: an extracted
      // URL is data to be displayed, never a destination to be offered.
      "no-script-url": "error",
    },
  },

  {
    // packages/frontend/postcss.config.cjs is CommonJS by necessity —
    // postcss-load-config reads it outside the package's `"type": "module"`
    // context, so it cannot be ESM. `require`, `module` and `__dirname` are
    // correct there and only there.
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "writable",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    // The CI gates are plain Node ESM scripts, run outside any bundler and
    // outside QuickJS. `no-undef` does not know that.
    files: ["scripts/ci/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        URL: "readonly",
        TextDecoder: "readonly",
      },
    },
    rules: {
      // These gates communicate by printing every violation and exiting
      // non-zero; that IS the interface (see scripts/spike/validate-schema.mjs,
      // the contract they follow).
      "no-console": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
    },
  },

  {
    // ---------------------------------------------------------------------
    // PROJECT RULE 1 — the engine may not import Caido. (DET-03)
    // ---------------------------------------------------------------------
    // The engine must run under plain vitest on Node with NO Caido present.
    // That is what makes the analysis pipeline testable at all: Phase 0
    // measured that a catastrophic regex hangs the QuickJS thread with no
    // interrupt and no in-runtime recovery (SPIKE-01), so every engine
    // behaviour has to be provable OUTSIDE the runtime it will eventually run
    // in.
    //
    // Note what is NOT forbidden: bare `crypto` and `string_decoder`. DET-03
    // forbids *Caido* value-imports, not runtime modules. A rule written as
    // "no bare built-ins" would forbid `createHash` — the exact native hashing
    // path DET-07 makes mandatory, measured at 0.34 ms/MB against 187 ms/MB for
    // the JS loop it replaces.
    //
    // This is one of FOUR mechanisms; the other three are packages/engine's
    // tsconfig (which omits @caido/quickjs-types so `caido:*` does not even
    // resolve), packages/engine/src/boundary.spec.ts's AST scan, and that same
    // spec's assertion over packages/engine/package.json. Lint catches source,
    // the manifest assertion catches the dependency, and they fail differently.
    files: ["packages/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["caido:*"],
              message:
                "packages/engine is SDK-FREE (DET-03): it must run under plain vitest on Node with no Caido present. Move anything that needs a caido: module into packages/backend.",
            },
            {
              group: ["@caido/*"],
              message:
                "packages/engine is SDK-FREE (DET-03): it must run under plain vitest on Node with no Caido present. Move anything that needs the Caido SDK into packages/backend.",
            },
          ],
        },
      ],
    },
  },

  {
    // ---------------------------------------------------------------------
    // PROJECT RULE 2 — onInterceptResponse's callback may not be async.
    // ---------------------------------------------------------------------
    // This is TYPE-LEGAL: the SDK declares the callback as returning
    // `MaybePromise<void>`, so nothing in the type system objects. It is also
    // the exact shape that makes the pipeline LOOK fine and starve the single
    // thread — Caido queues intercept events (Phase 0 measured 499 surviving a
    // 30 s handler block and arriving in a 20 ms burst), so an async handler
    // that awaits does not drop traffic visibly; it silently accumulates
    // backlog until something else breaks.
    //
    // CORE-01's whole shape is fire-and-forget: integer and header comparisons
    // only, enqueue an id, return. Everything expensive happens on the
    // consumer's own timer.
    files: ["packages/backend/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name='onInterceptResponse'] > ArrowFunctionExpression[async=true]",
          message:
            "onInterceptResponse's callback must NOT be async (CORE-01). It is type-legal (MaybePromise<void>) and is the exact shape that starves the single QuickJS thread: the admission gate does integer and header comparisons, enqueues an id and returns. Do the awaiting in packages/backend/src/ingest/consumer.ts.",
        },
        {
          selector:
            "CallExpression[callee.property.name='onInterceptResponse'] > FunctionExpression[async=true]",
          message:
            "onInterceptResponse's callback must NOT be async (CORE-01). It is type-legal (MaybePromise<void>) and is the exact shape that starves the single QuickJS thread: the admission gate does integer and header comparisons, enqueues an id and returns. Do the awaiting in packages/backend/src/ingest/consumer.ts.",
        },
      ],
    },
  },
];
