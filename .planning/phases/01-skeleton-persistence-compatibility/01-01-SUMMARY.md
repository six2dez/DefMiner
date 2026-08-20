---
phase: 01-skeleton-persistence-compatibility
plan: 01
subsystem: infra
tags: [caido, sqlite, quickjs, sha256, upsert, content-addressing, vitest, tracer]

requires:
  - phase: 00-runtime-reality-check
    provides: "go-no-go.json — the only Phase 0 artifact later phases may import; the measured thresholds every constant here traces to, plus instance.sh / probe-run.sh / origin.py / load.sh as reusable live-test apparatus"
provides:
  - "A working vertical slice: proxied JS response -> non-async admission gate -> bounded queue -> single consumer -> reload by id -> native SHA-256 over raw bytes -> two single-statement idempotent upserts"
  - "Migration step v1: `artifacts` PRIMARY KEY (project_id, sha256) with NO url column, and `observations` PRIMARY KEY (project_id, sha256, request_id) carrying the artifact->request->URL edge"
  - "`upsertArtifact` and `recordObservation` — the settled store signatures plans 01-03 and 01-04 call without changing"
  - "packages/engine: SDK-free `sha256Hex`, `BoundedQueue`, and thresholds (generated measured set + derived POLICY set)"
  - "scripts/ci/gen-thresholds.mjs + thresholds.spec.ts — the Phase 0 import-and-assert contract mechanised, so a constant tuned without re-measuring fails CI"
  - "scripts/phase1/env.sh — the whole Phase 1 port block (8971-8975) and path set, allocated once"
  - "scripts/phase1/tracer-e2e.sh — live end-to-end proof against Caido 0.57.1"
  - "runtime-answers.json + tests/phase1-runtime.spec.ts — measured answers to RESEARCH.md Open Questions 1 and 2, gated"
  - "DefMiner's own build config and plugin package, separate from the Phase 0 tier-1 probe build"
affects: [01-02, 01-03, 01-04, 01-05, 01-06, phase-2-observability, phase-3-detectors, phase-4-secrets]

actuals:
  tokens: 36926
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Fire-and-forget admission: non-async hook, integer and header comparisons only, enqueue an id, return"
    - "Single-statement idempotent upsert on a natural key — the only legal write shape on a driver with no transaction primitive"
    - "Forward-only PRAGMA user_version migration ladder over an immutable literal step array"
    - "Generated-not-authored constants, gated by byte-equality against a fresh generator run"
    - "Synchronous extract() boundary: every SDK object is read in one non-async function that returns plain scalars, so nothing survives an await"
    - "Store writes return a result instead of throwing, because Caido surfaces neither a throw nor a rejection"

key-files:
  created:
    - packages/backend/src/index.ts
    - packages/backend/src/hooks/passive.ts
    - packages/backend/src/ingest/consumer.ts
    - packages/backend/src/store/migrations.ts
    - packages/backend/src/store/artifacts.ts
    - packages/backend/src/store/observations.ts
    - packages/backend/src/store/db.ts
    - packages/backend/src/compat.ts
    - packages/engine/src/thresholds.ts
    - packages/engine/src/thresholds.generated.ts
    - packages/engine/src/thresholds.spec.ts
    - packages/engine/src/queue.ts
    - packages/engine/src/digest.ts
    - packages/caido.config.ts
    - scripts/ci/gen-thresholds.mjs
    - scripts/phase1/env.sh
    - scripts/phase1/tracer-e2e.sh
    - scripts/phase1/runtime-answers.sh
    - tests/phase1-runtime.spec.ts
    - .planning/phases/01-skeleton-persistence-compatibility/results/runtime-answers.json
  modified:
    - vitest.config.ts
    - .gitignore

key-decisions:
  - "P1-D1/P1-D6 (one-way, human-approved at a gate=\"blocking\" checkpoint on 2026-08-20): artifact identity is the composite natural key (project_id, sha256) with no surrogate id anywhere, and `artifacts` has NO url column — the URL moves to `observations`, which is created in the same migration step v1"
  - "Migration step v1 creates `artifacts` and `observations` only; `analyses` and `settings` arrive as step v2 in plan 01-04. Shipped steps are immutable"
  - "P1-D4: measured constants are GENERATED from go-no-go.json and asserted byte-identical to a fresh regeneration, rather than hand-copied with per-constant equality tests"
  - "DEVIATION from the plan's stated build layout: DefMiner's caido.config.ts lives at packages/, not packages/backend/, because @caido-community/dev@0.1.7 deletes <cwd>/dist after tsup writes <root>/dist/index.js — with root \".\" the build deletes its own output. Source layout and every sibling plan's file paths are unchanged"
  - "The consumer POLLS on a single self-rescheduling 50 ms timer rather than being kicked by the hook, so `queue.offer` stays the hook's only side effect besides counters"
  - "Store writes return a StoreWriteResult instead of throwing, so a failure of either the artifact or the observation write is counted and logged without orphaning the other"

patterns-established:
  - "Comment-the-measurement: every constant and every non-obvious code shape carries the Phase 0 measurement that forced it"
  - "Execute the failing path: every gate added here had its negative fixture run, not just its passing one"
  - "Deltas, not readings: cumulative counters are differenced per scenario so one scenario's work is never attributed to another"
  - "External instrumentation: peak queue depth is sampled from outside the plugin, because a starved thread cannot report that it is starved"

requirements-completed: [CORE-01, CORE-04, CORE-05, STORE-01, STORE-02, STORE-03, STORE-07, ENC-01]

coverage:
  - id: D1
    description: "A JavaScript response proxied through a live Caido 0.57.1 becomes exactly one content-addressed artifact row whose sha256 equals a digest the host computed independently with shasum -a 256"
    requirement: "STORE-03"
    verification:
      - kind: e2e
        ref: "bash scripts/phase1/tracer-e2e.sh"
        status: pass
    human_judgment: false
  - id: D2
    description: "The same bundle proxied twice leaves ONE artifact row with seen_count = 2 and TWO observation rows with distinct request ids, both carrying the URL with its cache-busting query intact and no fragment — proving the upsert is the only write path on both tables and the URL edge is written on every iteration"
    requirement: "STORE-01"
    verification:
      - kind: e2e
        ref: "bash scripts/phase1/tracer-e2e.sh"
        status: pass
    human_judgment: false
  - id: D3
    description: "The onInterceptResponse callback is non-async: invoking the registered callback returns undefined, not a Promise, and the hook's only side effect besides counters is queue.offer"
    requirement: "CORE-01"
    verification:
      - kind: unit
        ref: "vitest packages/engine/src/__tracer-acceptance.spec.ts#the registered onInterceptResponse callback returns undefined, not a Promise (transient acceptance probe; permanent home is passive.spec.ts in plan 01-03)"
        status: pass
      - kind: e2e
        ref: "bash scripts/phase1/tracer-e2e.sh"
        status: pass
    human_judgment: false
  - id: D4
    description: "Exactly one consumer drains the queue, reloads work with sdk.requests.get(id), handles both undefined branches, and holds no Request/Response/Body reference across any await"
    requirement: "CORE-04"
    verification:
      - kind: e2e
        ref: "bash scripts/phase1/runtime-answers.sh — 510 entries processed across two scenarios, reloadMissing 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "Offsets and hashes derive from toRaw() bytes and never from toText(); a zero-length body is rejected at the admission gate before any store write"
    requirement: "ENC-01"
    verification:
      - kind: unit
        ref: "vitest#sha256Hex over the empty byte string returns e3b0c442... (transient acceptance probe; permanent home is digest.spec.ts in plan 01-03)"
        status: pass
      - kind: e2e
        ref: "bash scripts/phase1/tracer-e2e.sh — digest read back equals shasum -a 256 of the fixture"
        status: pass
    human_judgment: false
  - id: D6
    description: "Every table is keyed on project_id and every bound value reaches SQLite through positional ? placeholders spread into run(...); no store module concatenates a URL, host or header into SQL"
    requirement: "STORE-02"
    verification:
      - kind: other
        ref: "grep over packages/backend/src/store/*.ts for string-built SQL — no matches; PRAGMA table_info(artifacts) read from the real database file during the e2e run"
        status: pass
    human_judgment: false
  - id: D7
    description: "The Phase 0 import-and-assert contract is mechanised in four gates, each with its FAILING path executed: regeneration drift, per-id equality plus exact export-name set, POLICY derivations, and the Broken Window #6 tripwire"
    verification:
      - kind: unit
        ref: "tests: packages/engine/src/thresholds.spec.ts (41 assertions)"
        status: pass
      - kind: other
        ref: "5 mutation fixtures executed: hand-edited generated value, QUEUE_CAP 1024, RETENTION_SWEEP_EVERY_N 256, RETENTION_SWEEP_MAX_ROWS 2048, undeclared extra export — each fails with the remedy named"
        status: pass
    human_judgment: false
  - id: D8
    description: "RESEARCH.md Open Questions 1 and 2 answered by measurement and gated: SQLite inside sdk.meta.db() is 3.46.0, and sdk.requests.get(id) was readable for 100% of entries both immediately and 2.1 s behind the event under a 500-request burst"
    requirement: "CORE-05"
    verification:
      - kind: integration
        ref: "tests/phase1-runtime.spec.ts (11 assertions) over results/runtime-answers.json"
        status: pass
      - kind: other
        ref: "6 mutation fixtures executed against runtime-answers.json: sub-3.24 version, processed 0, reloadMissing 3, moved expected_version, peakQueueDepth 1, on_conflict false — each fails"
        status: pass
    human_judgment: false
  - id: D9
    description: "The Phase 0 harness is intact: pnpm test still runs all three Phase 0 spec files and at least the 72 assertions it ran before, and the root caido.config.ts is byte-unchanged"
    verification:
      - kind: other
        ref: "pnpm test — 3 files / 72 tests before, 5 files / 124 after, all three Phase 0 gates present; git diff --exit-code caido.config.ts clean"
        status: pass
    human_judgment: false
  - id: D10
    description: "DefMiner builds as its own Caido plugin package, separate from the Phase 0 tier-1 probe build, and installs into a live instance"
    requirement: "STORE-07"
    verification:
      - kind: e2e
        ref: "pnpm exec caido-dev build packages -> packages/backend/dist/index.js + packages/dist/plugin_package.zip; installed and called over RPC during both live scripts"
        status: pass
    human_judgment: true
    rationale: "The build WORKS and installs, but its output path deviates from the plan's stated acceptance criterion: the package lands at packages/dist/plugin_package.zip, not packages/backend/dist/plugin_package.zip, because @caido-community/dev@0.1.7 makes the latter impossible (see Deviations). A human should confirm the deviation is acceptable before plan 01-02 writes per-package manifests against this layout."

duration: 35 min
completed: 2026-08-20
status: complete
---

# Phase 1 Plan 01: End-to-End Tracer, Threshold Contract and Runtime Answers Summary

**A JavaScript response proxied through a live Caido 0.57.1 is admitted by a non-async hook, drained by one consumer, reloaded by id, hashed with native SHA-256 over raw bytes, and stored as one content-addressed row plus one URL-carrying observation — verified against a host-computed digest, with SQLite 3.46.0 and a 100% reload rate measured rather than assumed.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-08-20T22:21:00+02:00 (continuation agent, resuming from the resolved task 1 checkpoint)
- **Completed:** 2026-08-20T22:56:00+02:00
- **Tasks:** 2 of 3 (task 1 was the `checkpoint:decision`, resolved by the operator before this agent started)
- **Files modified:** 38

## Accomplishments

- **The whole Phase 1 architecture runs end to end, on real Caido, in the first commit.** `bash scripts/phase1/tracer-e2e.sh` starts an isolated 0.57.1 on 8971, serves a generated fixture from a local origin on 8972, proxies it twice, and asserts the digest read back out of the plugin's database equals `shasum -a 256` of the file: `cec8f860…6d44` both times.
- **Content-addressed identity with the URL on the edge, exactly as the operator approved.** Two proxied requests leave one `artifacts` row with `seen_count = 2` and two `observations` rows with distinct request ids, both carrying `?v=tracer1` intact and no fragment. `PRAGMA table_info(artifacts)` read from the real database file lists no `url` column.
- **Open Question 1 is closed by measurement: SQLite behind `sdk.meta.db()` is 3.46.0** — comfortably above the 3.24 that `ON CONFLICT … DO UPDATE` requires and for which there was no fallback. Recorded as *exercised*, not inferred from a version string: 510 sightings of one fixture collapsed into a single row whose `seen_count` equals the processed count.
- **Open Question 2 is closed, and the answer is better than the design feared.** `sdk.requests.get(id)` was readable for **100% of 510 entries** across both scenarios — 10 immediate and 500 at concurrency 20 — with a peak queue depth of **323** and a worst-case event-to-reload delta of **2154 ms**. Assumption A7's silent-drop failure does not occur even 2.1 seconds behind the originating event, so **CORE-05 needs no bounded retry** and the consumer's shape stands.
- **The Phase 0 import-and-assert contract is now mechanical.** Measured constants are generated from `go-no-go.json`; a hand edit to the generated file fails CI with a message naming the generator. Every gate's failing path was executed, not just its passing one.
- **The Phase 0 harness is intact and measured, not asserted by eye.** `pnpm test` was 3 files / 72 assertions before this plan and is 5 files / 124 after, with all three Phase 0 gates still in the run.

## Task Commits

1. **Task 1: Phase 1 persistent schema shape and artifact identity** — `checkpoint:decision`, resolved by the operator as **option-a** before this agent started. No code, no commit.
2. **Task 2: End-to-end "a proxied JS response is hashed and durably remembered"** — `1e4cb05` (feat)
3. **Task 3: Threshold contract gates, and the two open runtime answers** — `14714dd` (feat)

**Plan metadata:** see the `docs(01-01)` commit following this summary.

## Files Created/Modified

**The vertical slice**
- `packages/backend/src/index.ts` — `init()` in strict order: compat guard (returns without registering a hook or opening the DB on failure) → db → migrate → `SELECT sqlite_version()` → project id → consumer → `ready = true` → *then* register the hook. Exposes `getStatus`, `getArtifacts`, `getObservations`.
- `packages/backend/src/hooks/passive.ts` — the non-async admission gate. Status first with 304 as its own outcome, content type checked in both casings with array values unwrapped, `body.length` only (never `toRaw()`), zero-length rejected before any write. Also holds the provisional `Counters` object plan 01-05 moves to `telemetry.ts`.
- `packages/backend/src/ingest/consumer.ts` — one drain loop behind an in-flight boolean. A synchronous `extract()` reads every SDK object and returns plain scalars, so nothing survives an `await`; then `upsertArtifact` and `recordObservation` unconditionally on the same iteration.
- `packages/backend/src/store/migrations.ts` — forward-only `PRAGMA user_version` ladder. Step v1 creates both tables and their indexes; the step array is immutable.
- `packages/backend/src/store/artifacts.ts`, `observations.ts` — one statement each, `ON CONFLICT … DO UPDATE` on the natural key, prepared per write, parameters spread. URL fragment stripped and query kept; `content_type` and `url` truncated because both are target-controlled.
- `packages/backend/src/store/db.ts` — memoised pool handle plus `resetDbHandle()` for plan 01-05.
- `packages/backend/src/compat.ts` — `MIN_CAIDO`, `cmpCaidoVersion` (numeric, so `0.6.0 > 0.57.1` and `0.10.0 > 0.9.0`), `checkCompat` reading `sdk.runtime?.version` through an optional chain.

**The engine (SDK-free)**
- `packages/engine/src/digest.ts` — `sha256Hex` over `Uint8Array` via bare `crypto`.
- `packages/engine/src/queue.ts` — `BoundedQueue`, drop-oldest, monotonic `overflowCount`, constructor throwing below the measured 500-event burst.
- `packages/engine/src/thresholds.generated.ts` — 26 measured constants, generated.
- `packages/engine/src/thresholds.ts` — the re-export plus 7 POLICY constants, each with its derivation written down.
- `packages/engine/src/thresholds.spec.ts` — the four contract gates, 41 assertions.

**Harness and scripts**
- `scripts/ci/gen-thresholds.mjs` — deterministic generator; `--stdout` mode is what the drift gate runs.
- `scripts/phase1/env.sh` — ports 8971-8975 with the exclusion of every port Phase 0 or the operator owns, derived in comments.
- `scripts/phase1/tracer-e2e.sh`, `scripts/phase1/runtime-answers.sh` — the two live scripts.
- `tests/phase1-runtime.spec.ts` — 11 assertions gating the runtime answers.
- `vitest.config.ts` — `include` widened by two globs, `tests/**` kept first and unchanged.
- `.gitignore` — Phase 1 token/log exclusions (see Deviations).

## Decisions Made

- **The one-way door, recorded as approved.** On **2026-08-20** the operator selected **option-a** at a `gate="blocking"` `checkpoint:decision`: four tables, content-addressed identity, `artifacts` PRIMARY KEY `(project_id, sha256)` with **no `url` column**, `observations` PRIMARY KEY `(project_id, sha256, request_id)` carrying the URL edge, and no surrogate `id` anywhere because `last_insert_rowid()` is unusable on the pooled connection. This plan ships step v1 (`artifacts`, `observations`); step v2 (`analyses`, `settings`) is plan 01-04's. Decisions P1-D1 and P1-D6 are therefore both **confirmed by a human**, not assumed by the planner. `findings.value_raw` does not exist and `assets.path_key` / `pathKey()` were not built.
- **The consumer polls rather than being kicked.** One self-rescheduling 50 ms timer, so `queue.offer` remains the hook's only side effect besides counters and the plan's key-link holds literally. Idle latency of up to 50 ms is invisible next to the reload and hash that follow.
- **Store writes return a result instead of throwing.** Caido surfaces neither a synchronous throw nor an async rejection, and the artifact/observation pair must not orphan half of itself when one statement fails — so each write catches, truncates to 200 characters, and hands the outcome back for the consumer to count and log.
- **The event-to-reload clock is an explicit shared structure.** The queue entry type is frozen at `{id, bytes, kind}` and only the hook knows when an event arrived, so enqueue instants live in a bounded `EnqueueClock` map alongside the counters, evicting in insertion order at the queue's cap. Plan 01-05 folds it into `telemetry.ts` with them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] DefMiner's build config lives at `packages/caido.config.ts`, not `packages/backend/caido.config.ts`**

- **Found during:** Task 2, wiring the build.
- **Issue:** The plan specifies a config at `packages/backend/caido.config.ts` built with `pnpm exec caido-dev build packages/backend`, producing `packages/backend/dist/index.js` **and** `packages/backend/dist/plugin_package.zip`. That combination is impossible with `@caido-community/dev@0.1.7`. Its `bundlePackage` calls `createDistDirectories(cwd)`, which does `fs.rm(<cwd>/dist, {recursive: true, force: true})`, and only *then* copies `<root>/dist/index.js` into the package directory (`dist/cli.js:528-541` and `171-176`). With `cwd = packages/backend` and `root = "."` those are the same directory, so the build deletes its own output and dies with `ENOENT: copyfile … dist/index.js`.
- **Verification of the diagnosis:** reproduced in isolation in a scratch directory with a three-line plugin before any DefMiner code was written — the failure is in the tool, not in this plan's code.
- **Fix:** move the config one directory up to `packages/caido.config.ts` with `root: "backend"`, built by `pnpm exec caido-dev build packages`. This keeps **everything the plan actually cares about**: DefMiner has its own config (P1-D2), the root `caido.config.ts` is untouched and the tier-1 probes keep building, the zip never collides with theirs at the repo-root `dist/plugin_package.zip`, `packages/backend/dist/index.js` is produced exactly as specified, and **no source path changes** — every sibling plan's `packages/backend/src/**` file list is unaffected.
- **What differs:** the package lands at `packages/dist/plugin_package.zip` rather than `packages/backend/dist/plugin_package.zip`. Both are gitignored. `scripts/phase1/tracer-e2e.sh` and `runtime-answers.sh` install from `packages/dist/plugin_package`.
- **Who needs to know:** **plan 01-02**, which writes `packages/backend/package.json` and a build script, and **plan 01-06**, whose `compat-smoke.sh` installs the package. Both must use `pnpm exec caido-dev build packages` and `packages/dist/plugin_package`.
- **Files modified:** `packages/caido.config.ts`, `packages/README.md` (the tool requires a README at the build cwd), `scripts/phase1/tracer-e2e.sh`, `scripts/phase1/runtime-answers.sh`.
- **Committed in:** `1e4cb05`.

**2. [Rule 2 — Missing Critical, security] Phase 1 run directories could have committed a live guest bearer token and the operator's host logs**

- **Found during:** Task 2, staging the first commit.
- **Issue:** `.gitignore`'s credential control names `.planning/phases/00-runtime-reality-check/results/runs/*/token` and `…/*.log` — **Phase-0-path-specific**. Phase 1's scripts source the same `instance.sh` into `$P1_OUT`, a different results root, so those rules do not apply. `instance.sh`'s teardown deletes the token on a clean exit, but a run that dies before teardown leaves it on disk, and the host logs (2.7 MB of `caido.stdout.log` and 2.2 MB of `logging.*.log` in this plan's own runs) were never covered at all.
- **Fix:** added the three mirrored rules for the Phase 1 results root.
- **Verification:** `git add -n` over the run directory lists only the JSON evidence; the two `.log` files and any `token` are excluded. Every URL in the staged evidence was checked and is the scripts' own loopback fixture.
- **Files modified:** `.gitignore`.
- **Committed in:** `1e4cb05`.

**3. [Rule 1 — Bug] The external queue-depth sampler lost a startup race and reported a null peak depth**

- **Found during:** Task 3, first full run of `runtime-answers.sh`.
- **Issue:** the sampler's guard file was created *after* the background loop launched, so the loop evaluated `[ -f "$RUN_DIR/.sampling" ]` immediately, found nothing, and exited. The burst scenario then reported `peakQueueDepth: null` — which is the honest output for "sampled nothing", and is exactly why the gate asserts `> 1` rather than accepting whatever arrives.
- **Fix:** create the flag before launching the sampler.
- **Verification:** re-run reports `peakQueueDepth 323` from 300+ external samples; `tests/phase1-runtime.spec.ts` fails when that value is mutated to 1.
- **Files modified:** `scripts/phase1/runtime-answers.sh`.
- **Committed in:** `14714dd`.

---

**Total deviations:** 3 auto-fixed (1 blocking, 1 missing-critical/security, 1 bug).
**Impact on plan:** no scope creep. Deviation 1 is a tool limitation with a narrower workaround than any alternative — it preserves every source path the other five plans depend on and costs one config-file location. Deviations 2 and 3 are corrections that make claims true which would otherwise have been merely stated.

## Issues Encountered

- **`probe_install` requires a `manifest.json` in the directory it zips**, which is the `caido-dev` *package* directory (`packages/dist/plugin_package`), not the source directory. Resolved by installing from the built package rather than the source tree — which is also the more honest test, since it installs the artifact a user would.
- **The plugin database's location was not documented anywhere in the repo.** Found empirically at `<data-path>/plugins/<backend-plugin-uuid>/data.db`, and the uuid is exactly the `BACKEND_ID` `probe_install` already exports. `tracer-e2e.sh` uses that directly with a `find` fallback, so the `PRAGMA table_info` assertion runs against the real file rather than against the DDL string the plugin shipped.
- **A note for plan 01-03, from the measurement rather than from theory:** the burst scenario's worst-case event-to-reload delta is **2154 ms** — over two seconds of real backlog at 500 requests and concurrency 20, with a peak queue depth of 323. The reload still succeeded every time. Any future timeout or staleness heuristic in the consumer must be sized well above two seconds, or it will discard work that Caido was perfectly willing to return.

## User Setup Required

None — no external service configuration required. Both live scripts start and tear down their own isolated Caido instance.

## Next Phase Readiness

**Ready.**

- **Plan 01-02 (wave 2)** — must build with `pnpm exec caido-dev build packages`, and its `packages/backend/package.json` must not reintroduce a package-local `caido.config.ts` (see Deviation 1). Cross-package imports are currently **relative** (`../../engine/src/...`) because no pnpm workspace exists yet; 01-02 converting them to `@defminer/engine` is additive and touches only import lines.
- **Plan 01-03 (wave 4)** — `upsertArtifact(db, projectId, sha256, byteLen, kind, nowMs)` and `recordObservation(db, projectId, sha256, requestId, url, status, contentType, observedAt)` are settled and take no `url` on the artifact side. `queue.ts` still needs `drain(n)`; `queue.spec.ts`, `digest.spec.ts` and `passive.spec.ts` are unwritten by design and are 01-03's. The transient acceptance probe used here (`__tracer-acceptance.spec.ts`) was deliberately **not** committed — those five assertions need permanent homes in 01-03's specs.
- **Plan 01-04 (wave 3)** — migration step v1 is shipped and immutable. `analyses` and `settings` arrive as step v2. `SCHEMA_VERSION` is derived from the array's last element, so adding a step is a one-line change.
- **Plan 01-05 (wave 5)** — the counters object and the `EnqueueClock` are both provisional and both reachable, written so that swapping the import to `telemetry.ts` is the whole of the change. There is exactly one counters object today.
- **Plan 01-06 (wave 6)** — `compat.ts`'s export names are stable; ports 8973/8974 are already reserved for its two version legs, and `P1_CAIDO_BIN_OLD` points at the real 0.55.3 fixture.

**Carried risk, unchanged:** the cross-day cache hit rate is still inconclusive (Broken Window #6). `CACHE_HIT_RATE` reads through `CACHE_HIT_RATE_ASSUMED = 0.4` and `thresholds.spec.ts` now **fails loudly** the day `CACHE_SAMPLE_DAYS >= 2` and the denominator is non-zero, naming both scripts to re-run. Nobody can budget against the placeholder unknowingly from here on.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-20*

## Self-Check: PASSED

All 21 files named in `key-files` and both task commits (`1e4cb05`, `14714dd`) verified present on disk and in `git log`. The transient acceptance probe referenced in `coverage` D3/D5 is correctly **absent** from the index — those five assertions are owed permanent homes in plan 01-03's `queue.spec.ts`, `digest.spec.ts` and `passive.spec.ts`.
