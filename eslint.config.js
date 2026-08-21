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
// `vue: false` — P1-D5 defers the frontend to Phase 5, so there is no .vue file
// in this repo and enabling the Vue rules would only cost lint time. (The two
// Vue packages still arrive transitively; that was accepted knowingly.)
// `node: true` — the engine, the CI gates and every script run on Node.
// `compat: false` — eslint-plugin-compat checks BROWSERSLIST targets, and with
// no browserslist config it falls back to `op_mini all` and reports `Promise`
// and `URL` as unsupported. Nothing in this repo ships to a browser: the
// backend runs in Caido's QuickJS (whose real capability surface is measured in
// .../results/runs/20260820T121824Z-31596/raw/capabilities.json, not inferred
// from a browser table) and the engine runs on Node. Re-enable it in Phase 5
// WITH a browserslist, when a frontend exists.

import { defaultConfig } from "@caido/eslint-config";

export default [
  ...defaultConfig({ vue: false, node: true, compat: false }),

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
    files: ["packages/**/*.ts"],
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
