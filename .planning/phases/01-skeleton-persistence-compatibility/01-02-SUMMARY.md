---
phase: 01-skeleton-persistence-compatibility
plan: 02
subsystem: infra
tags: [pnpm-workspace, eslint, knip, typescript, dist-05, dist-06, allowlist, supply-chain]

requires:
  - phase: 01-skeleton-persistence-compatibility
    plan: 01
    provides: "packages/engine and packages/backend source trees, packages/caido.config.ts, the widened vitest.config.ts, and the 5-file / 124-assertion baseline this plan had to preserve"
provides:
  - "A real two-package pnpm workspace: @defminer/engine and @defminer/backend, with the Caido SDK moved out of the root so it no longer RESOLVES from the engine"
  - "DIST-06 disarmed: primevue pinned to exactly 4.1.0 and tailwindcss to exactly 3.4.13, in pnpm-workspace.yaml where pnpm 11 actually reads overrides"
  - "The repo's first tsconfig: `pnpm typecheck` = `tsc --build` over two projects with disjoint `types` arrays"
  - "eslint.config.js on @caido/eslint-config plus the engine import restriction and the non-async onInterceptResponse rule"
  - "knip.json declaring both workspaces, with the engine declaring zero dependencies as the machine-checkable DET-03 boundary"
  - "tests/pins.spec.ts — 32 assertions over the manifests, pnpm-workspace.yaml and pnpm-lock.yaml"
  - "scripts/ci/check-bundle-imports.mjs — DIST-05 as an allowlist derived from measured runtime behaviour, over the SHIPPED artifact"
  - "scripts/ci/check-bundle-imports.spec.ts and packages/engine/src/boundary.spec.ts — 21 assertions, every failure path executed"
affects: [01-03, 01-04, 01-05, 01-06, phase-5-frontend]

actuals:
  tokens: 20548
  tasks: 2
  commits: 2

tech-stack:
  added:
    - "typescript@5.8.3 (downgraded from 7.0.2 for knip's `<7` bound — decision P2-D2)"
    - "eslint@9.39.2"
    - "@caido/eslint-config@0.10.0 (human-approved blocking-human gate)"
    - "knip@5.86.0"
    - "prettier@3.8.1"
    - "@types/node@26.2.0"
  patterns:
    - "Allowlist-not-ban: a gate encodes what MAY ship, derived from a committed measurement, and states that hand-editing the list is a lie unless a probe proves it"
    - "Four-mechanism boundary: lint, typecheck, AST scan and manifest assertion, chosen so they fail differently"
    - "Named exceptions: a preset is adopted wholesale and every rule turned off carries the measurement that forced it"
    - "Execute the failing path: eight negative fixtures run across four gates, never just the passing one"
    - "Measured before/after: the regression proof is two numbers, not a claim"

key-files:
  created:
    - pnpm-workspace.yaml
    - tsconfig.base.json
    - tsconfig.json
    - tsconfig.eslint.json
    - packages/engine/package.json
    - packages/engine/tsconfig.json
    - packages/backend/package.json
    - packages/backend/tsconfig.json
    - eslint.config.js
    - knip.json
    - tests/pins.spec.ts
    - scripts/ci/check-bundle-imports.mjs
    - scripts/ci/check-bundle-imports.spec.ts
    - packages/engine/src/boundary.spec.ts
  modified:
    - package.json
    - pnpm-lock.yaml
    - .gitignore
    - packages/backend/src/index.ts
    - packages/backend/src/hooks/passive.ts
    - packages/backend/src/ingest/consumer.ts
    - packages/backend/src/compat.ts
    - packages/backend/src/store/artifacts.ts
    - packages/backend/src/store/migrations.ts
    - packages/backend/src/store/observations.ts
    - packages/engine/src/thresholds.spec.ts
    - scripts/ci/gen-thresholds.mjs
    - .planning/REQUIREMENTS.md
    - .planning/phases/01-skeleton-persistence-compatibility/01-RESEARCH.md

key-decisions:
  - "HUMAN-APPROVED blocking-human gate (2026-08-20): @caido/eslint-config@0.10.0 installed after the operator was shown the full evidence, including that github.com/caido/typescript-configs returns 404 to the GitHub API"
  - "P2-D5 (execution-time correction): DIST-06's overrides live in pnpm-workspace.yaml, NOT package.json's `pnpm` key — pnpm 11 no longer reads that field, so the plan's stated location would have produced NO pin"
  - "P2-D2 confirmed by measurement, not assumption: typescript 7.0.2 -> 5.8.3 re-resolved @caido-community/dev's peer and the build still produces a byte-for-byte equivalent bundle"
  - "P2-D6: lint scope is packages/**, scripts/ci/** and root config; the Phase 0 harness is excluded BY NAME so anything added to tests/ later is linted by default"
  - "packages/engine/package.json declares ZERO dependencies — that absence, plus the SDK moving to packages/backend, is what makes `import type { SDK } from \"@caido/sdk-backend\"` a typecheck error in the engine"
  - "boundary.spec.ts parses with the TypeScript compiler API, not acorn: the engine sources are TypeScript and acorn rejects type annotations. The bundle gate still uses acorn, because the artifact it reads is built JavaScript"
  - "knip's `exports`/`types` rules are `warn`, not `error`, because plan 01-01 deliberately shipped seams for 01-03/01-04/01-05; the unlisted-dependency rule that enforces DET-03 stays at error"

requirements-completed: [DIST-05, DIST-06]

coverage:
  - id: D1
    description: "The repo is a two-package pnpm workspace and every Phase 0 gate still runs and still passes, proven by counts rather than asserted by eye"
    verification:
      - kind: other
        ref: "pnpm test — 5 files / 124 assertions before, 8 files / 177 after; the three Phase 0 spec files contribute exactly 72, the original Phase 0 number"
        status: pass
      - kind: other
        ref: "git status --porcelain scripts/spike tests probe corpus caido.config.ts — clean"
        status: pass
      - kind: other
        ref: "launchctl list | grep com.defminer.spike.recorder — still registered; plist mtime Aug 20 20:02:55, before this session began"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every dependency version in the tree is an exact pin, and DIST-06's two traps are disarmed before anything can install a bad transitive version"
    requirement: "DIST-06"
    verification:
      - kind: unit
        ref: "tests/pins.spec.ts (32 assertions) — overrides in pnpm-workspace.yaml and in pnpm-lock.yaml, exact-pin pattern over all three manifests, non-vacuity guard"
        status: pass
      - kind: other
        ref: "negative fixture executed: overrides.primevue set to ^4.1.0 -> 2 assertions fail, exit 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "The DIST-05 gate is an allowlist derived from measured runtime behaviour, runs against the shipped artifact, and has had its failure path executed"
    requirement: "DIST-05"
    verification:
      - kind: other
        ref: "node scripts/ci/check-bundle-imports.mjs — exit 0 on packages/backend/dist/index.js AND on the backend entry extracted from packages/dist/plugin_package.zip; 1 specifier found, `crypto`"
        status: pass
      - kind: unit
        ref: "scripts/ci/check-bundle-imports.spec.ts (11 assertions) — zlib, node:crypto, caido:crypto, zlib+util (two lines), export-from + dynamic import, non-literal dynamic, missing file"
        status: pass
    human_judgment: false
  - id: D4
    description: "packages/engine cannot import Caido, enforced four ways that fail differently"
    verification:
      - kind: unit
        ref: "packages/engine/src/boundary.spec.ts (10 assertions) — AST scan over every non-spec engine source plus a manifest assertion"
        status: pass
      - kind: other
        ref: "three negative fixtures executed: `import type { SDK } from \"@caido/sdk-backend\"` in digest.ts -> tsc TS2307; the same import -> knip `Unlisted dependencies`; `import { Body } from \"caido:utils\"` in queue.ts -> boundary.spec.ts fails"
        status: pass
    human_judgment: false
  - id: D5
    description: "A lint rule mechanically forbids an async callback on sdk.events.onInterceptResponse — the type-legal shape that starves the QuickJS thread"
    requirement: "CORE-01"
    verification:
      - kind: other
        ref: "negative fixture executed: making the registered callback `async` in packages/backend/src/index.ts -> eslint exit 1 with the CORE-01 message; restored to exit 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "ROADMAP success criterion 6 and REQUIREMENTS.md DIST-05 both state the rule that is actually correct"
    verification:
      - kind: other
        ref: "ROADMAP.md:67 was already corrected during planning; .planning/REQUIREMENTS.md:219 was NOT and is corrected here"
        status: pass
    human_judgment: false
  - id: D7
    description: "@caido/eslint-config@0.10.0 — the one Phase 1 package never exercised in Phase 0 — entered the tree only through an explicit human decision, with the negative evidence surfaced rather than smoothed over"
    verification:
      - kind: other
        ref: "gate=\"blocking-human\" checkpoint:human-verify, resolved `approved` by the operator on 2026-08-20; four verification steps recorded below with one MIXED outcome"
        status: pass
    human_judgment: true
    rationale: "This is a trust decision, not a testable property. A human weighed a 404 on the source repository against provenance and install-script evidence and chose to proceed; no gate can or should re-decide that."

duration: 21 min
completed: 2026-08-20
status: complete
---

# Phase 1 Plan 02: Workspace, Pins and the Two Static Gates Summary

**A two-package pnpm workspace with exact pins everywhere, a typecheck and a lint rule that make the SDK-free engine boundary mechanical rather than conventional, and DIST-05 shipped as an allowlist derived from what Phase 0 actually loaded inside Caido — with every one of the four gates' failure paths executed against a real fixture.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-08-20T21:08:26Z (continuation agent, resuming from the resolved task 1 checkpoint)
- **Completed:** 2026-08-20T21:30:13Z
- **Tasks:** 2 of 3 — task 1 was the `checkpoint:human-verify`, resolved by the operator before this agent started
- **Files modified:** 26

## The human-approved package gate

Task 1 was a `gate="blocking-human"` `checkpoint:human-verify` placed **before** the install, on the one package in Phase 1's set that had never been installed or exercised in Phase 0. The operator answered **`approved`** on 2026-08-20 with the full evidence on the table. Recording it in detail, because the value of a trust gate is entirely in what was known at the moment of the decision:

| # | Verification step | Outcome |
|---|---|---|
| 1 | Publisher and provenance | **PASS** — the last four releases of `@caido/eslint-config` were published through GitHub Actions OIDC **trusted publishing**. Version `0.10.0` exists, published 2026-05-14, tarball `sha512-wLtPQMwh84/8mJNggwhNe1VzqrP9fhjaAVS05CDTzuaRGhkCXAk9sOUCOCuhlRaDjFB3BD21cIzT2GvbmojgQg==`. |
| 2 | The linked GitHub repository is the real Caido org | **MIXED — and the operator approved knowing this.** `api.github.com/repos/caido/typescript-configs` returns **404**, so the declared source repository is **not publicly readable** and the published code cannot be diffed against it. |
| 3 | Neighbour comparison, which is what settled step 2 | `caido/sdk-js`, `caido/caido` and `caido-community/dev` all return **200**; `caido/typescript-configs` and `caido/tailwindcss` both return **404**. The pattern is *"Caido keeps some config repos private"*, not *"this is a lookalike org"* — a lookalike would not also own the repos that do resolve. |
| 4 | Install scripts | **PASS** — the package declares `typecheck`, `build` and `clean` only; no `preinstall`, no `postinstall`. After the install, the tree's install-script surface is still **exactly one**: `esbuild`'s platform-binary fetch, allowlisted explicitly in `pnpm-workspace.yaml` with `sharp: false` beside it, unchanged. |

**Accepted knowingly:** two of the ten transitive dependencies — `eslint-plugin-vue@10.6.0` and `vue-eslint-parser@10.2.0` — are Vue tooling with **no consumer in this phase**. `eslint.config.js` passes `vue: false`, so their rules never run; they are present in the store regardless.

**A correction to the research record, not a footnote.** `01-RESEARCH.md` § Package Legitimacy Audit asserted: *"No new package enters the build in Phase 1 that was not already installed and exercised in Phase 0"*, and concluded from it that *"no `checkpoint:human-verify` is warranted here"*. **Both were false for this package.** The failure shape is worth naming because it will recur: a `low-downloads` verdict was generalised into "official `@caido/*`, therefore already exercised", and the one package in the set that had never been installed at all was swept up in the generalisation. `01-RESEARCH.md` is corrected **in place** — the false sentence is replaced with the correction and a pointer here, rather than quietly deleted.

## Accomplishments

- **The workspace is real, and the boundary it creates is checkable four different ways.** `packages/engine/package.json` declares **zero dependencies**, and `@caido/sdk-backend` / `@caido/quickjs-types` moved out of the root into `packages/backend`. That relocation is the load-bearing part: with pnpm's strict layout the SDK is no longer in the engine's resolution path at all, so `import type { SDK } from "@caido/sdk-backend"` inside `packages/engine/src/` fails with **TS2307**, not with a lint warning. Verified by executing it.
- **DIST-06's pins are in the place pnpm 11 actually reads, which is not the place the plan said.** The plan specified `pnpm.overrides` in `package.json`. The install printed `The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored: "pnpm.overrides"`. A pin there is not a weaker pin — it is **no pin**, which is worse than none because it reads as protection. The overrides moved to `pnpm-workspace.yaml`, the dead key was removed, and `tests/pins.spec.ts` asserts both that the overrides are live *and* that the dead key has not come back.
- **DIST-05 ships as an allowlist over the SHIPPED artifact, and its failure path ran on six distinct fixtures.** The allowlist is exactly the ten specifiers the Phase 0 capability probe loaded inside Caido 0.57.1. Executed failures: `zlib`; `node:crypto` (the prefixed spelling of a specifier that *is* allowed bare — the case a lint autofix introduces); `caido:crypto` (in the measured-**failing** set, which is why `caido:http` is matched literally and the `caido:` prefix is never blanket-allowed); a fixture importing **both** `zlib` and `util`, asserting **two** violation lines so the gate cannot bail on the first; `export * from "stream"` plus `await import("perf_hooks")`, the two shapes a regex over `^import` misses; and a computed dynamic import, which the gate reports as its own failure because it cannot classify it. Plus a missing target, which exits 2 and never 0.
- **The gate was run against both shipped artifacts, not one.** `packages/backend/dist/index.js` and the backend entry extracted from `packages/dist/plugin_package.zip` — the file a user would actually install. Both report the same single specifier, `crypto`.
- **The Phase 0 harness is intact and measured.** `pnpm test` was **5 files / 124 assertions** before this plan and is **8 / 177** after. The three Phase 0 spec files contribute **exactly 72** — the original Phase 0 number, unchanged. `git status --porcelain scripts/spike tests probe corpus caido.config.ts` is clean. `launchctl list` still reports `com.defminer.spike.recorder` and its plist is unmodified.
- **The typescript downgrade was verified, not assumed.** The `.pnpm` store showed `@caido-community+dev@0.1.7_postcss@8.5.26_typescript@7.0.2` — `typescript@7.0.2` was a real resolved peer of the build tool, so the P2-D2 downgrade re-resolved it. The rebuilt bundle is byte-equivalent (16,060 bytes, one import specifier) and the build exits 0.

## Task Commits

1. **Task 1: Package legitimacy gate for `@caido/eslint-config`** — `checkpoint:human-verify`, `gate="blocking-human"`, resolved **`approved`** by the operator. No code, no commit.
2. **Task 2: Two-package pnpm workspace with exact pins, without unhooking Phase 0** — `3425666` (feat)
3. **Task 3: The two static gates — bundle-import allowlist and engine SDK-freedom** — `524f742` (feat)

## Files Created/Modified

**Workspace and pins**
- `pnpm-workspace.yaml` — `packages: [packages/*]` and the `overrides` block added; the hand-written `allowBuilds` map (`esbuild: true`, `sharp: false`) and both its rationales are **byte-identical**, and only the header comment was amended, to record when and why the "no `packages:` key by design" statement stopped being true.
- `package.json` — every caret range converted to an exact pin; `typescript` 7.0.2 -> 5.8.3; `eslint`, `@caido/eslint-config`, `knip`, `prettier`, `@types/node` added; `@caido/sdk-backend` and `@caido/quickjs-types` removed (they moved to the backend); scripts `typecheck`, `lint`, `knip`, `gen:thresholds`, `build:backend`, `check:bundle`.
- `packages/engine/package.json` — `@defminer/engine`, private, ESM, **no dependencies of any kind**, with explicit subpath exports (`./digest`, `./queue`, `./thresholds`) rather than a wildcard, so an engine module cannot be reached from outside by accident.
- `packages/backend/package.json` — `@defminer/backend`, private, ESM, `@defminer/engine` via `workspace:*`, and the two Caido packages as devDependencies.

**Typecheck (the repo's first)**
- `tsconfig.base.json` — strict, `verbatimModuleSyntax`, `isolatedModules`, `noEmit`, `moduleResolution: bundler`. Deliberately sets **no** `types`; each package sets its own, and that is the mechanism.
- `packages/engine/tsconfig.json` — `types: ["node"]` and nothing else. `allowJs`/`checkJs: false` so `thresholds.spec.ts` can keep importing `THRESHOLD_IDS` from the generator.
- `packages/backend/tsconfig.json` — `types: ["node", "@caido/quickjs-types"]`, with the reason written down: the build externalises Node built-ins and Caido resolves a measured subset, so the type layer must know `crypto` exists while **DIST-05**, not this list, decides what may ship.
- `tsconfig.json` — the solution file `tsc --build` runs against. `tsconfig.eslint.json` — the linter's type program, and nothing else.

**Lint and dead-code**
- `eslint.config.js` — `@caido/eslint-config` with `vue: false` and `compat: false`, plus the two project rules (engine `no-restricted-imports`, non-async `onInterceptResponse` via `no-restricted-syntax`) and four named rule exceptions, each carrying its Phase 0 measurement.
- `knip.json` — both workspaces declared; `sqlite` and `@caido/sdk-backend` ignored in the backend with written reasons; `exports`/`types` at `warn` with a note telling plan 01-03 to restore them to `error`.

**Gates**
- `tests/pins.spec.ts` — 32 assertions, non-vacuity guarded, with a deliberately tiny YAML block reader rather than a new unaudited dependency.
- `scripts/ci/check-bundle-imports.mjs` — follows `validate-schema.mjs`'s CLI contract exactly: accumulate across all inputs, one `path: detail` line per error, never bail on the first.
- `scripts/ci/check-bundle-imports.spec.ts` (11 assertions) and `packages/engine/src/boundary.spec.ts` (10 assertions).

**Records corrected**
- `.planning/REQUIREMENTS.md` — DIST-05's wording. `.planning/phases/.../01-RESEARCH.md` — the false package-audit claim.

## Decisions Made

- **The pins moved because pnpm 11 moved them** (P2-D5). See Deviation 1.
- **`packages/engine` declares zero dependencies**, and that absence is the boundary. The alternative — declaring `@types/node`, `vitest` and `typescript` locally — would have made the manifest look tidier and enforced nothing; they resolve from the root by ancestor lookup either way, while `@caido/sdk-backend` does not, because it is no longer a root dependency.
- **`boundary.spec.ts` parses with the TypeScript compiler API rather than acorn.** The plan said acorn; acorn parses JavaScript and rejects TypeScript type annotations outright, and every engine source is TypeScript. `check-bundle-imports.mjs` still uses acorn, correctly — the artifact *it* reads is a built JavaScript bundle.
- **knip's unused-export rules are `warn`, not `error`.** Plan 01-01 deliberately shipped reachable-but-unconsumed seams (`resetDbHandle` for 01-05, `MIGRATIONS` for 01-04, `isScriptish`/`normaliseObservedUrl`/`cmpCaidoVersion`/`resetPassiveForTest` for 01-03's specs). Erroring on them today would mean deleting work that is already spoken for. The rule that enforces DET-03 — unlisted dependencies — stays at **error**, and `knip.json` carries an instruction for plan 01-03 to restore the other two once every seam has a consumer.
- **The lint scope is named files, not `tests/**`** (P2-D6). ESLint's flat config cannot un-ignore a file inside an ignored directory, so ignoring the directory would have left this plan's own new `tests/pins.spec.ts` ungated. Listing the four existing Phase 0 specs individually means the default for anything added to `tests/` later is **linted**.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `pnpm.overrides` in `package.json` is dead config under pnpm 11; the pins would have protected nothing**

- **Found during:** Task 2, immediately after the first `pnpm install`.
- **Issue:** The plan specifies "add a `pnpm.overrides` object" to the root `package.json`. pnpm 11.22.0 **no longer reads the `pnpm` field** and ignored it with: `The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored: "pnpm.overrides"`. DIST-06's entire point is that a Phase 5 transitive resolution cannot pick a version that breaks a hard peer; an override in a location pnpm ignores provides exactly none of that, while reading in review as though it does.
- **Fix:** moved both overrides into `pnpm-workspace.yaml` under an `overrides:` key, with the measured warning quoted in a comment above them, and **removed** the dead `pnpm` key from `package.json` rather than leaving it as a decoy.
- **Verification:** `pnpm-lock.yaml` now carries an `overrides:` block with `primevue: 4.1.0` and `tailwindcss: 3.4.13`. `tests/pins.spec.ts` asserts the workspace file, the lockfile, and the absence of the dead key. Negative fixture executed: setting `overrides.primevue` to `^4.1.0` fails two assertions and exits 1.
- **Files modified:** `pnpm-workspace.yaml`, `package.json`, `pnpm-lock.yaml`, `tests/pins.spec.ts`.
- **Committed in:** `3425666`.

**2. [Rule 3 — Blocking] The build command is `caido-dev build packages`, not `caido-dev build packages/backend`**

- **Found during:** Task 2, before any change — flagged from plan 01-01's Deviation 1 and confirmed against the shipped reality.
- **Issue:** The plan's task and verification both use `pnpm exec caido-dev build packages/backend`. That combination is impossible with `@caido-community/dev@0.1.7`, whose `bundlePackage` does `fs.rm(<cwd>/dist)` *after* tsup writes the output, deleting its own artifact when the config and the plugin root share a directory. Wave 1 already moved the config to `packages/caido.config.ts` for this reason.
- **Fix:** `build:backend` runs `caido-dev build packages`. **The DIST-05 target path is unaffected** — `packages/backend/dist/index.js` is still produced exactly as the plan's acceptance criterion requires; only the command differs. The distributable lands at `packages/dist/plugin_package.zip`.
- **Verification:** build exits 0; `packages/backend/dist/index.js` present; the gate passes against it and against the backend entry extracted from the zip.
- **Files modified:** `package.json`.
- **Committed in:** `3425666`.

**3. [Rule 2 — Missing critical] The plan's file list could not produce a passing typecheck or lint**

- **Found during:** Task 2.
- **Issue:** Three things the plan's file list omitted are load-bearing. (a) `tsc --build` needs a **solution file** with references, and the linter's typed rules need a **type program** covering the `.mjs` gates and root configs, which belong to no package project. (b) The Caido preset enables typed `typescript-eslint` rules and crashes with `You have used a rule which requires type information` on any file the program does not cover. (c) `knip@5.86.0` peer-depends on `@types/node >= 18`, and `tsc` cannot resolve `crypto` or `node:fs` without it.
- **Fix:** added `tsconfig.json`, `tsconfig.eslint.json` and `@types/node@26.2.0` (exact pin, matching the Node 26.7.0 in use).
- **Files modified:** `tsconfig.json`, `tsconfig.eslint.json`, `package.json`.
- **Committed in:** `3425666`.

**4. [Rule 1 — Bug] Three latent type errors in wave-1 code, surfaced by introducing the first typecheck**

- **Found during:** Task 2, first `tsc --build`.
- **Issue:** `consumer.ts` passed the reload result whole to `extract()` after truthiness-narrowing `rr.response`; narrowing a property does not make the object assignable to a required-response parameter (TS2345). Plus a `readonly string[]` inference issue on `it.each(THRESHOLD_IDS)` and an implicit `any` on the `.mjs` import (TS7016), both in `thresholds.spec.ts`.
- **Fix:** `consumer.ts` binds `const response = rr?.response` and calls `extract({ request: rr.request, response })`, so the narrowing survives the call — **runtime behaviour is identical**. The two spec errors were resolved by `allowJs`/`checkJs: false` on the engine project, which types the generator by inference rather than as `any`.
- **Verification:** `pnpm exec tsc --build` exits 0; `pnpm test` unchanged at the same counts.
- **Files modified:** `packages/backend/src/ingest/consumer.ts`, `packages/engine/tsconfig.json`.
- **Committed in:** `3425666`.

**5. [Rule 2 — Missing critical] The lint scope had to be decided, because the preset and the plan's own freeze criterion are in direct conflict**

- **Found during:** Task 2. The first full lint run reported **709 problems**, 262 of them prettier reformatting inside `tests/**` and `scripts/spike/**`.
- **Issue:** `@caido/eslint-config` runs `prettier/prettier` as an **error**, and this plan's acceptance criterion requires `git status --porcelain scripts/spike tests probe corpus caido.config.ts` to come back clean. Linting the Phase 0 harness therefore offers exactly two outcomes: fail forever, or reformat files the plan forbids touching.
- **Fix:** scoped the lint to `packages/**`, `scripts/ci/**` and the root config files, excluding the Phase 0 harness **by name** (P2-D6). Ran `--fix` over the in-scope files only. Turned off four rule groups, each with its measurement written into the config: `compat/compat` (browserslist rules against a QuickJS/Node target — it was reporting `Promise` as unsupported), `no-restricted-types` (this codebase uses `null` deliberately, and `go-no-go.json` carries `null` to mean *measured and inconclusive*), the `no-unsafe-*` / `no-explicit-any` family on the backend (Phase 0 measured `@caido/quickjs-types` under-declaring the runtime by ~13x, so `sdk: any` at the boundary is the honest annotation until plan 01-06's SDK-surface probe), and `strict-boolean-expressions` (it flags guards that exist *because* the types are the thing under suspicion).
- **Residual, stated plainly:** `tests/go-no-go.spec.ts`, `tests/schema.spec.ts`, `tests/spike-results.spec.ts`, `tests/phase1-runtime.spec.ts`, `scripts/spike/**` and the root `caido.config.ts` are **not linted**. A later phase that is allowed to touch them should widen the list in the same commit that reformats them.
- **Files modified:** `eslint.config.js`, and formatting-only changes across `packages/backend/src/**`, `packages/engine/src/thresholds.spec.ts`, `scripts/ci/gen-thresholds.mjs`. The autofix also removed two genuinely redundant `!` assertions and converted two never-reassigned `let`s to `const`; `thresholds.spec.ts` gate 1 (byte-identical regeneration) still passes, so the generator's **output** is unchanged.
- **Committed in:** `3425666`.

**6. [Rule 3 — Blocking] `boundary.spec.ts` parses with the TypeScript compiler API, not acorn**

- **Found during:** Task 3.
- **Issue:** The plan says "parse each with acorn". acorn parses JavaScript; every file under `packages/engine/src/` is TypeScript with type annotations, which acorn rejects outright.
- **Fix:** `ts.createSourceFile` + `ts.forEachChild`, covering `import`, `export ... from`, dynamic `import()` and `import x = require()`. `typescript` is now a devDependency, so this adds nothing to the tree. `check-bundle-imports.mjs` still uses acorn, which is correct there.
- **Verification:** negative fixture executed — `import { Body } from "caido:utils"` in `queue.ts` fails the spec with the specifier named.
- **Files modified:** `packages/engine/src/boundary.spec.ts`.
- **Committed in:** `524f742`.

**7. [Rule 2 — Missing critical] `REQUIREMENTS.md` still carried the DIST-05 wording that fails a correct plugin**

- **Found during:** Task 3, while updating requirement state.
- **Issue:** ROADMAP success criterion 6 was corrected during planning, but `.planning/REQUIREMENTS.md:219` still read *"A CI gate asserts the built backend bundle imports no Node built-ins."* The requirements register is what a later verifier reads; leaving the old wording there means the correction exists in one record and not the other.
- **Fix:** corrected in place, with the reason and a pointer to the gate.
- **Files modified:** `.planning/REQUIREMENTS.md`.
- **Committed in:** the `docs(01-02)` commit following this summary.

**8. [Rule 2 — Missing critical] `.tsbuildinfo` was untracked build state**

- `tsc --build` writes `packages/*/tsconfig.tsbuildinfo` — machine- and path-specific, regenerated every run, never evidence. Added `*.tsbuildinfo` to `.gitignore`. Wave 1's Phase 1 credential rules are untouched. Committed in `3425666`.

---

**Total deviations:** 8 auto-fixed — 2 bugs, 4 missing-critical, 2 blocking.
**Impact on plan:** no scope creep, and one of them mattered a great deal. Deviation 1 is the difference between DIST-06 being satisfied and DIST-06 *looking* satisfied — had the plan been followed literally, `tests/pins.spec.ts` would have asserted a `package.json` key that pnpm ignores, and the suite would have been green while both traps stayed armed. Deviation 5 is the only one that trades away coverage: the Phase 0 harness is not linted, stated above rather than buried.

## Issues Encountered

- **`@caido/eslint-config` has no default export.** It exports `{ defaultConfig }`; `import caido from "@caido/eslint-config"` fails at config load with `does not provide an export named 'default'`.
- **The preset sets `projectService`, which silently disables `parserOptions.project`.** Supplying both produces `Parsing error: Enabling "project" does nothing when "projectService" is enabled` on every file the service cannot place. `projectService: false` is required, not stylistic, and the reason is written into `eslint.config.js`.
- **A `.d.mts` sibling removes its `.mjs` from the TypeScript program**, which then makes the `.mjs` unlintable under a `project`-based type program. Resolved by dropping the declaration file and using `allowJs` on the engine project instead.
- **`pnpm-lock.yaml` is a multi-document YAML** — the pnpm-binary lockfile first, the project lockfile second. Anything asserting against it must not assume a single document.
- **A note for plan 01-03, from this plan's measurements rather than from theory:** `knip.json` says in writing that `exports` and `types` should return to `error` in the commit that writes the backend specs. Every name currently listed as an unused export is one 01-03 is expected to give a consumer, so if any is still unconsumed at that point, that is a finding and not noise.

## Next Phase Readiness

**Ready.**

- **Plan 01-03 (wave 4)** — `pnpm lint`, `pnpm typecheck` and `pnpm knip` are now gates its code must pass. New spec files under `packages/**` and `scripts/ci/**` are linted by default; new files under `tests/` are linted too (only the four named Phase 0 specs are excluded). It should restore knip's `exports`/`types` rules to `error`, per the instruction in `knip.json`.
- **Plan 01-04 (wave 3)** — nothing here touches `store/migrations.ts` beyond formatting; `MIGRATIONS` is unchanged and step v2 remains a one-line append.
- **Plan 01-05 / 01-06** — `@caido/sdk-backend` now resolves **only** from `packages/backend`. 01-06's SDK-surface probe belongs there, and it is the plan that will make that dependency genuinely used (it is currently in knip's `ignoreDependencies` with that reason written down).
- **Phase 5 (frontend)** — the two DIST-06 overrides are already live and lockfile-recorded, so `@caido/primevue` and `@caido/tailwindcss` cannot resolve a breaking version. `eslint.config.js` will need `vue: true` and `compat: true` **with a browserslist** at that point; both are one-word changes with the reason already in the file.

**Carried risk, unchanged:** the cross-day cache hit rate is still inconclusive (Broken Window #6). Nothing in this plan touched it.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-20*

## Self-Check: PASSED

All 15 files named in `key-files.created` verified present on disk, and both task commits (`3425666`, `524f742`) verified present in `git log`. Re-ran the plan's full `<verification>` block at close-out: `pnpm install --frozen-lockfile` exit 0; `pnpm test` 8 files / 177 assertions with the three Phase 0 gates contributing exactly 72; `pnpm typecheck`, `pnpm lint`, `pnpm knip` all exit 0; `node scripts/ci/check-bundle-imports.mjs` exit 0 against both shipped artifacts; `git status --porcelain scripts/spike tests probe corpus caido.config.ts` clean; `launchctl list | grep com.defminer.spike.recorder` still reports the agent with its plist unmodified.

No stubs. No skipped tests. No unrun `<verify>` commands.
