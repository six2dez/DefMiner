---
phase: 01-skeleton-persistence-compatibility
plan: 06
subsystem: infra
tags:
  [compat, caido-0.58.0, sdk-surfaces, version-guard, sha512-pinning, supply-chain, coverage-reconciliation]

requires:
  - phase: 01-skeleton-persistence-compatibility
    plan: 01
    provides: "the minimal compat.ts stub whose export names this plan kept, init()'s guard-first ordering, scripts/phase1/env.sh (ports 8973/8974 pre-allocated for exactly this) and tracer-e2e.sh"
  - phase: 01-skeleton-persistence-compatibility
    plan: 03
    provides: "test/fixtures/fake-sdk.ts with runtime.version overridable to null, admit.ts's inScope call site, and the closed reject-reason union"
  - phase: 01-skeleton-persistence-compatibility
    plan: 04
    provides: "the v2 schema, migrate()'s exec-based DDL ladder and store/db.ts's readSqliteVersion"
  - phase: 01-skeleton-persistence-compatibility
    plan: 05
    provides: "installLifecycle + onProjectChange, telemetry counters, spa-load.sh, and the measured fact that a guest cannot create a persistent project"
  - phase: 00-runtime-reality-check
    provides: "capabilities.json (globals_count 100 vs ~6 declared — the reason feature detection and not the type package is the capability list), and instance.sh / probe-run.sh / origin.py"
provides:
  - "`scripts/phase1/fetch-caido.sh` — hash-pinned, verify-before-extract fetch of a Caido CLI release"
  - "`packages/backend/src/compat.ts` — MIN_CAIDO, MIN_SQLITE, cmpCaidoVersion, REQUIRED_SURFACES (16), probeSurfaces, checkCompat, checkRuntimeSurfaces"
  - "`getCompat` RPC — the in-runtime surface matrix, registered on the REFUSAL path as well as the happy one"
  - "`scripts/phase1/compat-smoke.sh` + `results/compat-smoke.json` — the three-leg surface matrix (0.57.1, 0.58.0, 0.55.3)"
  - "`tests/phase1-compat.spec.ts` — the gate, including a two-directional reconciliation between REQUIRED_SURFACES and COVERAGE.md"
  - "MEASURED: Caido 0.58.0 exhibits NO behavioural difference from 0.57.1 across all 16 surfaces"
  - "MEASURED: a guest may hold at most ONE temporary project"
affects: [02-observability, 03-detectors, 05-frontend, 11-upgrade]

actuals:
  tokens: 50805
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Verify-before-extract: the hash gate runs while the download is still an opaque archive, so a bad artifact cannot place a binary on disk at all"
    - "Two-stage capability gate, split by what is knowable: property reads before anything is opened, handle-dependent probes after"
    - "probe_ok and exercised as SEPARATE recorded fields — presence is not behaviour"
    - "A surface list derived from the source through the running plugin's own RPC, never restated in the test"
    - "Two-directional reconciliation between a planning matrix and the code it describes, gated in both directions plus the summary counts"
    - "The trap executed, not described: the spec asserts JavaScript's own string compare gets 0.6.0 wrong, then that ours does not"

key-files:
  created:
    - scripts/phase1/fetch-caido.sh
    - scripts/phase1/compat-smoke.sh
    - packages/backend/src/compat.spec.ts
    - tests/phase1-compat.spec.ts
    - .planning/phases/01-skeleton-persistence-compatibility/results/compat-smoke.json
  modified:
    - packages/backend/src/compat.ts
    - packages/backend/src/index.ts
    - .planning/phases/01-skeleton-persistence-compatibility/COVERAGE.md
    - .planning/phases/01-skeleton-persistence-compatibility/results/spa-load.json
    - .planning/WINDOWS.md
    - eslint.config.js
    - .gitignore

key-decisions:
  - "P6-D1 held: MIN_CAIDO is 0.57.1, the exact build every Phase 0 threshold was measured on"
  - "P6-D2 held: COMPAT-01's message is a host-log line plus getStatus()/getCompat(), no frontend. Recorded as owed in the Broken Windows ledger (entry 10)"
  - "P6-D3 held: 0.55.3 is used deliberately as the below-minimum fixture, with CAIDO_BIN passed explicitly and never resolved from PATH"
  - "P6-D4 (new, execution-time): the capability gate is TWO stages, because a Database's method set is not discoverable without a Database. checkCompat(sdk) reads properties only and its refusal opens nothing; checkRuntimeSurfaces(ctx) runs after meta.db() and before any hook. Saying that plainly beats a probe that pretends to check a Statement it never obtained"
  - "P6-D5 (new): api.caido.io publishes hashes for `latest` ONLY (/releases, /releases/0.57.1 and /releases/v0.57.1 all 404), so a non-latest version is REFUSED unless its hash is committed in the script's PINNED_SHA512 table — the fetch-corpus.sh evidence contract"
  - "P6-D6 (new): COVERAGE.md rows 35 and 36 (string_decoder, buffer) reclassified INTEGRATE -> INTEGRATE (source-only). Measured against the BUILT artifact, not the source tree: decode.ts is tree-shaken out, so requiring them would mean statically importing two modules the plugin does not use — and a module-load failure on a future Caido would then take the whole plugin down to satisfy a probe"
  - "P6-D7 (new): onProjectChange is driven through the null -> project transition rather than a project switch, because a guest may hold at most ONE temporary project"

patterns-established:
  - "Refuse rather than reach: an unverifiable download is an error with the remedy in it, not a best-effort fetch"
  - "Record BOTH the requested and the current release on every run, so staleness is visible in the artifact rather than in someone's memory"
  - "The gate does not import the comparison it gates — cmp3 is duplicated in the spec on purpose, so a broken comparison cannot agree with itself"
  - "A closed value set for an outcome field, asserted by the gate, so a reader never has to infer which of several legitimate things happened"

requirements-completed: [COMPAT-01, COMPAT-02]

coverage:
  - id: D1
    description: "The current Caido release is fetched with its published SHA-512 verified BEFORE extraction, and none of it enters git — a corrupted archive is deleted along with the whole version directory, leaving no binary on disk"
    requirement: COMPAT-02
    verification:
      - kind: e2e
        ref: "bash scripts/phase1/fetch-caido.sh 0.58.0 -> .caido-bin/0.58.0/caido-cli --version = Caido 0.58.0, sha512 1917f43f…b200 equal to the published base64"
        status: pass
      - kind: other
        ref: "4 negative fixtures executed: one flipped bit in the archive (exit 1, both hashes printed, no caido-cli extracted), an unpinned non-latest version (exit 1), a remote CAIDO_RELEASES_JSON override (exit 1), and the pinned non-latest path against a synthetic 0.59.0 index carrying deliberately wrong hashes (exit 0, hash_source=pinned)"
        status: pass
      - kind: other
        ref: "git check-ignore -q .caido-bin exits 0; git status --porcelain shows nothing under .caido-bin/"
        status: pass
    human_judgment: false
  - id: D2
    description: "The version comparison survives the string-compare trap at 0.6.0 and the float-parse trap at 0.10.0, treats the declared minimum as SUPPORTED, compares a pre-release or build suffix on its numeric core, and returns NaN — never 0 — for an unparseable version"
    requirement: COMPAT-01
    verification:
      - kind: unit
        ref: "packages/backend/src/compat.spec.ts (52 assertions) — including 'survives the STRING-COMPARE trap at 0.6.0', which asserts \"0.6.0\" > \"0.57.1\" is TRUE as a raw string compare and that cmpCaidoVersion is negative"
        status: pass
    human_judgment: false
  - id: D3
    description: "A build below the declared minimum, or one missing any surface the plugin calls, registers NO hook and never opens the database — asserted as calls that did NOT happen, not as a string that came back"
    requirement: COMPAT-01
    verification:
      - kind: unit
        ref: "packages/backend/src/compat.spec.ts#init() on an incompatible build — 5 versions through the REAL init(), each with 0 onInterceptResponse handlers and 0 meta.db calls"
        status: pass
      - kind: unit
        ref: "packages/backend/src/compat.spec.ts — removing each of the 9 sdk-scope surfaces individually produces a refusal that NAMES it, with 0/0 calls"
        status: pass
      - kind: e2e
        ref: "compat-smoke.json leg C: real Caido 0.55.3, refusal_mode=guard_refused, artifact_rows_after_proxied_js=0, database_file_present=false"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every SDK surface the backend calls is exercised and succeeds on BOTH Caido 0.57.1 and the current 0.58.0, with the surface list derived from the source rather than restated, and each surface carrying live evidence that it RAN rather than merely existed"
    requirement: COMPAT-02
    verification:
      - kind: e2e
        ref: "bash scripts/phase1/compat-smoke.sh — 16/16 surfaces exercised and ok on both legs; the two matrices differ in exactly 3 fields (two fresh project UUIDs and the reported version)"
        status: pass
      - kind: integration
        ref: "tests/phase1-compat.spec.ts (24 assertions) over results/compat-smoke.json"
        status: pass
      - kind: other
        ref: "10 mutation fixtures executed against the gate, each failing as required with its remedy named"
        status: pass
    human_judgment: false
  - id: D5
    description: "The COMPAT-01 refusal message, read as an operator would see it in the host log, reads as a clear explanation rather than an obscure failure — naming the version required, the version found, and why the difference matters"
    requirement: COMPAT-01
    verification:
      - kind: integration
        ref: "tests/phase1-compat.spec.ts#names BOTH the required and the reported version when the guard was reached — asserts 0.57.1, 0.55.3 and the word 'measured' are all present, and that the line reached the host log"
        status: pass
    human_judgment: true
    rationale: "The gate can prove the message contains the required substrings; it cannot judge whether the sentence READS as an explanation. Deferred to the end-of-phase human gate (workflow.human_verify_mode = end-of-phase). The exact recorded string is quoted in this summary so the human does not have to go looking."
  - id: D6
    description: "REQUIRED_SURFACES and COVERAGE.md's INTEGRATE rows agree in both directions, and the matrix's summary counts match the rows they summarise"
    verification:
      - kind: integration
        ref: "tests/phase1-compat.spec.ts#REQUIRED_SURFACES reconciles with COVERAGE.md — 5 assertions over the parsed 40-row matrix"
        status: pass
      - kind: other
        ref: "mutation fixture: demoting COVERAGE.md row 6 to OPT-OUT fails the gate"
        status: pass
    human_judgment: false

duration: 24 min
completed: 2026-08-21
status: complete
---

# Phase 1 Plan 06: Compatibility Guard and the Three-Leg SDK Surface Matrix Summary

**Every SDK surface DefMiner calls was exercised on both Caido 0.57.1 and the current 0.58.0 and behaved identically — the two recorded matrices differ in exactly three fields, all of which must differ — while the real 0.55.3 binary refused through the guard, wrote zero rows, and never created a database file at all.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-08-20T23:38:06Z
- **Completed:** 2026-08-21T00:02:42Z
- **Tasks:** 3 of 3
- **Files modified:** 37

## Accomplishments

### COMPAT-02 is closed, and the answer is "no difference"

This was the phase's top open risk. Every Phase 0 threshold was measured on 0.57.1; 0.58.0 shipped hours before this phase was researched and had never been run. The type surface being byte-identical was *evidence*, not proof — behaviour is not types.

`.caido-bin/0.58.0/caido-cli` was fetched with its published SHA-512 verified before extraction, and legs A and B ran the identical sequence on identical bytes. **All 16 required surfaces exercised, all 16 ok, on both.** A field-by-field diff of the two matrices returns exactly three differences:

| Field | 0.57.1 | 0.58.0 |
|---|---|---|
| `sdk.events.onProjectChange` evidence | project `8886076a…` | project `8fcc8cb7…` |
| `sdk.projects.getCurrent` evidence | project `8886076a…` | project `8fcc8cb7…` |
| `sdk.runtime.version` evidence | `0.57.1` | `0.58.0` |

Two fresh project UUIDs and the version under test. Everything else — row shapes, every counter, `schema_version` 2, **`sqlite_version` 3.46.0 on both**, `defminer_log_lines` 5 on both, `db_artifact_rows` 2, `db_observation_rows` 3 — is identical. The bundled SQLite in particular is the thing a type diff could never have seen, and it did not move.

### COMPAT-01 is observed on a real old binary, not a faked version string

Leg C ran the actual 0.55.3 that owns `caido-cli` on this machine's PATH, passed explicitly so the exception stays deliberate (P6-D3). It recorded `refusal_mode: "guard_refused"` from a closed four-value set, and:

- `artifact_rows_after_proxied_js: 0` after a JavaScript response was genuinely proxied through it
- `database_file_present: false` — **the strongest form of the claim.** There is no file to count rows in, because the guard returned before `sdk.meta.db()` was ever called
- `host_log_incompatible_lines: 1`

The recorded message, verbatim:

> DefMiner requires Caido 0.57.1 or newer; this instance reports 0.55.3. Passive analysis is disabled. Every DefMiner budget was measured on Caido 0.57.1; running below it would produce silently wrong results rather than an error.

### The traps are executed, not described

`compat.spec.ts` asserts JavaScript's own relational operator says `"0.6.0" > "0.57.1"` is **true**, then asserts `cmpCaidoVersion` returns negative, then asserts the guard therefore *refuses* 0.6.0. Same shape for the float trap: `parseFloat("0.10.0") < parseFloat("0.9.0")` is asserted true before `cmpCaidoVersion("0.10.0","0.9.0")` is asserted positive. A comment claiming a trap is avoided is not evidence; a failing fixture is.

### Presence is not behaviour

Every surface carries two independent recorded claims: `probe_ok` (it exists, feature-detected inside the runtime by `getCompat`) and `exercised` (it ran, with named live evidence). The evidence is deliberately about observations rather than about the surface:

- `crypto.createHash` — "digest read back 466a086d… vs host `shasum -a 256` 466a086d… over 2214 bytes"
- `Statement.run` — "seen_count=2 after two sightings — one upsert, bound positionally, run twice"
- `sdk.events.onProjectChange` — "projectId moved None (installed with NO project) -> '8886076a…' after selectProject"
- `sdk.requests.get` — "processed=2 reloadHit=2 reloadMissing=0"

The gate fails if any surface is `probe_ok` but not `exercised`, and that fixture was run.

### Ten mutation fixtures, each failing as required

| # | Mutation | Caught by |
|---|---|---|
| 1 | leg B's `expected_version` moved off the current release | the two-assertion binary check |
| 2 | one surface deleted from leg B only | surface-set identity |
| 3 | leg A `reported_version` set to 0.55.3 | reported vs expected |
| 4 | leg A expectation ALSO moved to match | expected vs the literal for that leg |
| 5 | leg C `artifact_rows_after_proxied_js: 1` | "the guard did not guard" |
| 6 | leg C message replaced with "Plugin error: incompatible." | names-both-versions |
| 7 | leg B `sqlite_version: 3.23.1` | the 3.24 floor |
| 8 | leg C `refusal_mode: "it_was_fine_probably"` | the closed value set |
| 9 | COVERAGE.md row 6 demoted to OPT-OUT | the reconciliation |
| 10 | a surface `exercised: false` | presence-is-not-behaviour |

## Task Commits

1. **Hash-pinned fetch of the current Caido CLI release** — `7260ab3`
   `scripts/phase1/fetch-caido.sh`, `.gitignore`
2. **Complete the COMPAT-01 version guard and its capability probe** — `86dead5`
   `packages/backend/src/compat.ts`, `compat.spec.ts`, `index.ts`, `COVERAGE.md`
3. **Three-leg SDK surface smoke test** — `18e463f`
   `scripts/phase1/compat-smoke.sh`, `tests/phase1-compat.spec.ts`, `results/compat-smoke.json`, `results/runs/*`, `WINDOWS.md`, `eslint.config.js`, `spa-load.json`

## The COVERAGE.md reconciliation, and which way it was resolved

The plan required cross-checking `REQUIRED_SURFACES` against COVERAGE.md's `INTEGRATE` rows. Two real discrepancies surfaced, and both are resolved in the matrix itself rather than papered over.

**1. Two INTEGRATE rows the shipped bundle does not reach.** Rows 35 (`string_decoder — StringDecoder`) and 36 (`buffer — Buffer`) were marked INTEGRATE on the strength of `packages/engine/src/decode.ts`. But `decode.ts` has no consumer in the shipped path — Broken Windows entry 8 — so it is tree-shaken out, and `grep -c StringDecoder packages/backend/dist/index.js` returns **0**. The bundle's *entire* import set is one specifier: `crypto`.

Resolved by reclassifying both to **`INTEGRATE (source-only)`** with the measurement and a promotion condition recorded in the row. They are deliberately NOT in `REQUIRED_SURFACES`: the only way to require them would be a static import of two modules the plugin does not use, and a module-load failure on some future Caido would then take the whole plugin down in order to satisfy a probe. That is a self-inflicted compatibility bug wearing a compatibility test's clothes.

**2. The summary table did not match its own rows.** It read `INTEGRATE 16` while seventeen rows carried the mark, and its four opt-out buckets summed to 24 against 23 opt-out rows — so it added to 40 only because two errors cancelled. Re-derived row by row: rows 3, 4 and 21 are available-with-no-Phase-1-caller rather than deferred-to-a-named-phase (none names a later phase), and row 38 (`caido:http` fetch) is prohibited rather than deferred, by the same outbound-traffic prohibition as rows 9 and 27.

Both directions are now gated, plus the counts, so the matrix cannot drift from the code again:

- every INTEGRATE row must appear in `REQUIRED_SURFACES` **at the row number it claims**
- every row-carrying `REQUIRED_SURFACES` entry must be an INTEGRATE row
- exactly one entry may carry no row (the SQLite capability), so nothing else can escape the cross-check by setting `coverageRow: null`
- the summary counts must equal the parsed rows and account for all 40

## Deviations from Plan

### 1. [Rule 1 — Bug] The plan's `0.6.0` acceptance criterion is INVERTED

- **Found during:** Task 2, writing the comparison spec.
- **Issue:** The plan's `must_haves` truth and acceptance criterion both require `cmpCaidoVersion("0.6.0", "0.57.1")` to be **POSITIVE** ("0.6.0 compares GREATER than 0.57.1"). Under the three-part numeric comparison the plan itself specifies, minor 6 is less than minor 57, so the correct result is **NEGATIVE**. Caido's release line runs 0.55.3 → 0.57.1 → 0.58.0, so 0.6.0 is an ancient build. POSITIVE is precisely what the string-compare trap produces — the plan named the trap correctly and then wrote down the trap's answer as the requirement.
- **Why it matters:** implementing it as written would have made the guard *accept* a build from long before the measured minimum, which is the exact failure COMPAT-01 exists to prevent.
- **Fix:** implemented the correct sign, and turned the criterion into a stronger three-part assertion that executes the trap: `"0.6.0" > "0.57.1"` is asserted TRUE as a raw string compare, `cmpCaidoVersion` is asserted negative, and `checkCompat` on 0.6.0 is asserted to refuse.
- **Files:** `packages/backend/src/compat.ts`, `packages/backend/src/compat.spec.ts`
- **Commit:** `86dead5`

### 2. [Rule 3 — Blocker] `api.caido.io` publishes hashes for `latest` only

- **Found during:** Task 1.
- **Issue:** The plan's acceptance criterion "requesting a version other than the API's current `latest` still succeeds" assumes a per-version endpoint. There is none: `/releases`, `/releases/0.57.1` and `/releases/v0.57.1` all return 404. A non-latest version therefore has no published hash to verify against, and downloading it anyway would put an unverifiable executable on disk — the exact thing threat T-01-30 forbids.
- **Fix:** fail closed. A non-latest version is refused unless its hash is committed in the script's `PINNED_SHA512` table (the `fetch-corpus.sh` evidence contract), with the remedy printed. 0.58.0's four platform hashes are seeded there so this exact leg stays reproducible after 0.59.0 ships. The "records both the requested and the current version" half of the criterion is satisfied unconditionally, on every run.
- **Demonstrated:** the pinned path was exercised against a synthetic index reporting 0.59.0 as latest and carrying deliberately wrong hashes — the run succeeded with `hash_source: "pinned"`, proving the pin and not the index hash was used.
- **Files:** `scripts/phase1/fetch-caido.sh`
- **Commit:** `7260ab3`

### 3. [Rule 2 — Missing critical] The capability gate had to be split into two stages

- **Found during:** Task 2.
- **Issue:** The plan asks `checkCompat(sdk)` to cover every `REQUIRED_SURFACES` entry, and separately requires that a refusal record **zero** calls to `meta.db`. Those two cannot both hold for the `Database.*` and `Statement.*` surfaces: you cannot discover a Database's method set without obtaining a Database.
- **Fix:** two stages, each with a hard refusal. `checkCompat(sdk)` reads properties only — never invoking anything, so its refusal opens nothing and the 0/0 assertion holds. `checkRuntimeSurfaces(ctx)` runs at step 4b of `init()`, after `meta.db()` and the `sqlite_version()` read but **before** any hook is registered, so a build that opens a database but cannot prepare a statement still observes nothing.
- **Consequence, stated rather than buried:** for a db-scope refusal `meta.db` is necessarily 1, not 0. That is unavoidable, and naming it is better than a probe that pretends to check a Statement it never obtained.
- **Files:** `packages/backend/src/compat.ts`, `packages/backend/src/index.ts`
- **Commit:** `86dead5`

### 4. [Rule 3 — Blocker] A guest may hold at most ONE temporary project

- **Found during:** Task 3, first run. Leg A aborted with `createProject failed: PermissionDeniedUserError`.
- **Issue:** plan 01-05 measured that a guest cannot create a *persistent* project. This run measured something further: a guest cannot create a **second** project at all, temporary or not, and the denial fires even before either is selected. So the obvious way to drive `sdk.events.onProjectChange` — switch between two projects — does not exist on a guest instance.
- **Fix:** install the plugin FIRST, into an instance with no project. `init()` then resolves `projects.getCurrent()` to nothing and `getStatus().projectId` is `null`; selecting a project fires the hook and moves it. The leg records `project_id_before_select: null` alongside the post-select id, and nothing else in the plugin can move that field.
- **Why this is better than the plan's route:** it drives the `null → project` transition, which is the branch `lifecycle.spec.ts` can only reach with a fake. The plan's route would have exercised `project → project`, which is already covered by unit tests.
- **Files:** `scripts/phase1/compat-smoke.sh`
- **Commit:** `18e463f`

### 5. [Rule 3 — Blocker] `no-restricted-types` blocked an honest artifact type in `tests/`

- **Found during:** Task 3.
- **Issue:** the Caido preset bans `null` as a type. `eslint.config.js` already turns that off for `packages/**` with a documented, measured rationale (null is a first-class value here; `go-no-go.json` carries `CACHE_HIT_RATE_CROSS_DAY: null` to mean measured-and-inconclusive). `compat-smoke.json` records `null` with the same meaning — `coverage_row: null` is "this is a capability, not one of the 40 enumerated API surfaces". The gate declares the artifact's shape rather than reaching for `any` precisely so a renamed field is a typecheck failure instead of a silently-undefined assertion that passes, and it cannot declare that shape honestly without `| null`.
- **Fix:** extended the same exception to `tests/**/*.ts`, with the reason written next to it.
- **Files:** `eslint.config.js`
- **Commit:** `18e463f`

### 6. [Rule 1 — Bug] The no-version refusal did not name the surface it was missing

- **Found during:** Task 2, first spec run. Removing `runtime.version` produced a refusal that did not contain the string `sdk.runtime.version`.
- **Fix:** the no-version branch now names the surface as well as the minimum. The version branch is still preferred over the generic missing-surface branch, because "reports no version at all" is more useful to an operator than a list.
- **Commit:** `86dead5`

**Total deviations:** 6 auto-fixed (2× Rule 1 bug, 1× Rule 2 missing-critical, 3× Rule 3 blocker). **Impact:** one of them (deviation 1) prevented shipping a version guard that would have accepted builds from years before the measured minimum. None required an architectural change, and none is deferred.

## Verification

| Check | Result |
|---|---|
| `pnpm vitest run packages/backend/src/compat.spec.ts` | 52 passed, 0.16 s |
| `bash scripts/phase1/fetch-caido.sh 0.58.0` | exit 0, `Caido 0.58.0`, sha512 verified |
| `bash scripts/phase1/compat-smoke.sh` | 3 legs, 16/16 surfaces on A and B, leg C `guard_refused` |
| `pnpm vitest run tests/phase1-compat.spec.ts` | 24 passed |
| `pnpm test` | **27 files / 616 tests passed** (was 26 / 592) |
| `bash scripts/phase1/tracer-e2e.sh` | TRACER PASSED — digest `cec8f860…6d44` equal, 1 artifact / seen_count 2 / 2 observations |
| `bash scripts/phase1/spa-load.sh` | SPA LOAD RECORDED — 200/200 processed, `max_slice_ms` 0.029 vs a 25 ms budget, 0 overflow, restart identical |
| `pnpm typecheck` / `pnpm lint` / `pnpm knip` | all clean |
| `node scripts/ci/check-bundle-imports.mjs` | 1 specifier: `crypto` — DIST-05 allowlist satisfied |

Both live scripts were re-run *after* `index.ts` changed, so the second-stage gate is proven not to have disturbed the tracer or CORE-10.

## Known Stubs

None introduced by this plan. The pre-existing entries (Broken Windows 7 and 8 — the no-op `visit` callback and `decode.ts`'s absent consumer) are unchanged; entry 8 is now cross-referenced from COVERAGE.md rows 35 and 36, which is where the next reader will look.

## Broken Windows

One entry added, `open_count` 7 → 8 exactly:

| id | kind | description |
|---|---|---|
| 10 | deviation | COMPAT-01's operator-visible message is a host-log line plus `getStatus()`/`getCompat()` only — the backend QuickJS surface has no toast or notification API, and `sdk.api.send` has no subscriber because Phase 1 ships no frontend (P6-D2). Phase 5 owes the visible surface. |

## Owed to the end-of-phase human gate

`workflow.human_verify_mode` is `end-of-phase`, so the plan's `<human-check>` is recorded rather than blocking. Both halves have been *prepared* so the human is judging rather than digging:

1. **Does leg C's message read as an explanation?** Quoted verbatim above and in `compat-smoke.json` at `legs.C.message`.
2. **Does any surface's outcome DETAIL differ between 0.57.1 and 0.58.0?** Diffed field by field: three differences, all of them fields that must differ (two fresh project UUIDs, the version under test). No row shape, error string, counter or `sqlite_version` differs. A human should confirm the three-field table above is the whole diff before Phase 2 builds on it.

## Next Phase Readiness

**Phase 1 is complete — 6 of 6 plans.** The plugin ingests, persists, isolates by project, reports telemetry, refuses unmeasured builds, and is proven against both the release it was calibrated on and the release that is current.

Carried forward for Phase 2:

- `getCompat` exists and is registered on both the happy and the refusal path — OBS-01's diagnostics export has a surface matrix to project rather than one to invent.
- The `MIN_CAIDO` floor is a maintenance obligation, not a fixture: when Caido ships 0.59.0, `tests/phase1-compat.spec.ts` fails on the current-release assertion until `fetch-caido.sh` and `compat-smoke.sh` are re-run. That is the gate working, and the failure message says exactly which two commands to run.
- COVERAGE.md rows 35/36 are `INTEGRATE (source-only)` and should be promoted in the same wave that gives `decode.ts` a shipped consumer.

## Self-Check: PASSED

- All 5 created files and the recorded artifact exist on disk.
- All 3 task commits (`7260ab3`, `86dead5`, `18e463f`) exist in `git log`.
- All plan-level `<verification>` commands re-run and logged in the table above.
- All plan `<success_criteria>` met, with deviation 1's inverted criterion corrected and documented rather than satisfied as written.
