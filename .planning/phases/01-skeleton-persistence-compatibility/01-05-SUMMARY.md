---
phase: 01-skeleton-persistence-compatibility
plan: 05
subsystem: infra
tags:
  [lifecycle, project-isolation, telemetry, counters, max-slice, external-probe, restart-persistence, ast-gate]

requires:
  - phase: 01-skeleton-persistence-compatibility
    plan: 01
    provides: "the tracer's vertical slice, the counter KEY NAMES this plan rehoused, BoundedQueue, and scripts/phase1/env.sh + tracer-e2e.sh"
  - phase: 01-skeleton-persistence-compatibility
    plan: 02
    provides: "the two-package workspace, eslint/knip scope over packages/**, tsconfig.eslint.json, and the recorded test baseline"
  - phase: 01-skeleton-persistence-compatibility
    plan: 03
    provides: "admit.ts's closed reject-reason union, the local counters object this plan REPLACED, the consumer's four store call sites, walk()'s maxSliceMs, and test/fixtures/fake-sdk.ts"
  - phase: 01-skeleton-persistence-compatibility
    plan: 04
    provides: "the v2 schema, migrate()'s forward-only ladder, finishAnalysis's max_slice_ms column, and store/db.ts's resetDbHandle seam"
provides:
  - "`installLifecycle(sdk, deps)` / `currentProjectId()` / `currentSignal()` / `projectEpoch()` / `admissionAllowed()` — CORE-09, with the `project === null` branch as a first-class state"
  - "`applyProjectChange(project)` — abort, discard, reset the handle, swap the id, allow admission, SYNCHRONOUSLY end to end so nothing can interleave"
  - "`packages/backend/src/telemetry.ts` — THE counter object, `recordSlice`, `slimStatus`, `measured`, `describeError`, and the completeness-word rule that ships with them"
  - "An AST scan over packages/backend/src proving exactly ONE counters object exists, specs included"
  - "The consumer's project-epoch guard: an entry admitted under project A can never write a row under B"
  - "`scripts/phase1/spa-load.sh` — external RPC prober, same-machine baseline, 200-chunk load, live restart check"
  - "`.planning/.../results/spa-load.json` — the recorded measurement, and `tests/phase1-load.spec.ts` as its gate"
affects:
  [02-observability, 02-error-isolation, 03-detectors, 05-frontend, 06-retroactive-scan]

actuals:
  tokens: 54278
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Lifecycle transitions applied by ONE synchronous function, so the ordering guarantee is 'no suspension point' rather than a sequence of defensive checks"
    - "Structural cancellation tokens swapped per transition, handed to the consumer through a GETTER so each walk binds the token in force when it started"
    - "A monotonic 'epoch' captured at the top of a unit of work and re-checked before every write — the cheap general answer to 'did the world change during my awaits'"
    - "An AST scan asserting a singleton, run over specs as well as sources, with its own failing path executed against a synthetic file"
    - "External measurement with a same-machine baseline captured first, and the comparison TOLERANCE recorded in the artifact so the gate reads it as data"

key-files:
  created:
    - packages/backend/src/lifecycle.ts
    - packages/backend/src/lifecycle.spec.ts
    - packages/backend/src/telemetry.ts
    - packages/backend/src/telemetry.spec.ts
    - scripts/phase1/spa-load.sh
    - tests/phase1-load.spec.ts
    - .planning/phases/01-skeleton-persistence-compatibility/results/spa-load.json
  modified:
    - packages/backend/src/index.ts
    - packages/backend/src/ingest/consumer.ts
    - packages/backend/src/ingest/consumer.spec.ts
    - packages/backend/src/hooks/passive.ts
    - packages/backend/src/hooks/passive.spec.ts
    - packages/backend/test/fixtures/fake-sdk.ts
    - tsconfig.eslint.json

key-decisions:
  - "P5-D1 held: counters are named for PROXIED RESPONSES OBSERVED, and telemetry.spec.ts enforces it word-by-word against a forbidden-word list asserted non-empty"
  - "P5-D2 held: queue entries admitted under the previous project are DISCARDED, never re-attributed"
  - "P5-D3 held: the max slice is measured by an external prober against a same-machine baseline, recorded as a committed artifact"
  - "P5-D4 held: this plan owned both ends of the wire — telemetry.ts AND its call sites in consumer.ts and passive.ts"
  - "P5-D5 (new): PassiveDeps.admissionAllowed is REQUIRED rather than optional-with-a-permissive-default, so failing to wire CORE-09's gate is a compile error instead of a silently absent isolation"
  - "P5-D6 (new): the consumer captures a project EPOCH at the top of handleOne and re-checks it before every write. Without it, an entry admitted under A and reloaded across a project change wrote its rows under B — reproduced, then closed"
  - "P5-D7 (new): the restart check reads the plugin database with sqlite3 rather than through getArtifacts, because a guest can create TEMPORARY projects only (temporary:false returns PermissionDeniedUserError, measured) — so the project does not survive the restart while the artifacts must"
  - "P5-D8 (new): describeError redacts URL-shaped substrings BEFORE truncating. Found by the spec, not by review"

patterns-established:
  - "Synchronous state transition as a correctness argument: applyProjectChange contains no await, and lifecycle.spec.ts asserts over the source that none has crept in"
  - "Two routes to the same state are compared as STATES, not asserted separately — init() with no project and an explicit null change are diffed against each other"
  - "Singleton enforcement by AST scan over the whole package including specs, with the gate's own failure path executed"
  - "A recorded measurement's tolerance lives in the artifact, never as a literal in the gate"
  - "A zero in a measured artifact is treated as instrument failure, not as a perfect score"

requirements-completed: [CORE-09, CORE-10]

coverage:
  - id: D1
    description: "A project switch cancels in-flight work, discards the previous project's queue, resets the database handle and swaps the active id before any further write"
    requirement: CORE-09
    verification:
      - kind: unit
        ref: "packages/backend/src/lifecycle.spec.ts#a project change aborts the work already in flight"
        status: pass
      - kind: integration
        ref: "packages/backend/src/lifecycle.spec.ts#write NO row under either project when the change lands mid-drain"
        status: pass
      - kind: unit
        ref: "packages/backend/src/lifecycle.spec.ts#is re-resolved after a project change, proven by counting meta.db() calls"
        status: pass
    human_judgment: false
  - id: D2
    description: "The `project === null` branch is a real state: work is cancelled, the queue drained, no project_id active, and the hook admits nothing until a project is selected again"
    requirement: CORE-09
    verification:
      - kind: unit
        ref: "packages/backend/src/lifecycle.spec.ts#leaves no active project, an empty queue, and a hook that admits nothing"
        status: pass
      - kind: unit
        ref: "packages/backend/src/lifecycle.spec.ts#restores admission when a project is selected again, keyed on the NEW id"
        status: pass
      - kind: unit
        ref: "packages/backend/src/lifecycle.spec.ts#reaches the SAME observable state as an explicit null change"
        status: pass
    human_judgment: false
  - id: D3
    description: "getStatus reports projectId as null rather than an empty string when no project is active, through the real init()"
    requirement: CORE-09
    verification:
      - kind: integration
        ref: "packages/backend/src/lifecycle.spec.ts#reports projectId as null — not an empty string — when none is active"
        status: pass
    human_judgment: false
  - id: D4
    description: "Exactly ONE counters object exists under packages/backend/src, fed by the hook and the consumer, proven by an AST scan whose failing path was executed"
    requirement: CORE-10
    verification:
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#finds the counters binding only in telemetry.ts"
        status: pass
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#finds a counter-shaped object literal only in telemetry.ts"
        status: pass
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#would flag a second object — the failing path, executed"
        status: pass
    human_judgment: false
  - id: D5
    description: "recordSlice is called by production code with the walk result, so a running plugin's getStatus().maxSliceMs is non-zero and equals the persisted analyses.max_slice_ms"
    requirement: CORE-10
    verification:
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#leaves slimStatus().maxSliceMs greater than 0 after ONE processed artifact"
        status: pass
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#reports the SAME number the analyses row persisted, to the exact float"
        status: pass
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#proves recordSlice has a call site OUTSIDE telemetry.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "The max slice starts at 0, only ever rises, and stores the exact float with no rounding"
    requirement: CORE-10
    verification:
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#stores the float EXACTLY — no rounding, no truncation, no unit conversion"
        status: pass
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#records 25 exactly when given 25, and is not lowered by a subsequent 3"
        status: pass
    human_judgment: false
  - id: D7
    description: "slimStatus() carries no URL, no body content and no untruncated string, and no identifier in it asserts completeness"
    requirement: CORE-10
    verification:
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#carries no string that parses as a URL"
        status: pass
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#uses no forbidden word in any key"
        status: pass
    human_judgment: false
  - id: D8
    description: "The maximum synchronous slice under a 200-chunk SPA load is measured from OUTSIDE the plugin, recorded, and at or below the Phase 0 budget"
    requirement: CORE-10
    verification:
      - kind: e2e
        ref: "bash scripts/phase1/spa-load.sh"
        status: pass
      - kind: integration
        ref: "tests/phase1-load.spec.ts#is a number GREATER THAN ZERO — a zero is an instrument failure"
        status: pass
      - kind: integration
        ref: "tests/phase1-load.spec.ts#is at or below the Phase 0 budget, read from go-no-go.json and never a literal"
        status: pass
    human_judgment: false
  - id: D9
    description: "Artifacts survive a real Caido restart and the migration ladder is a no-op on the second boot"
    verification:
      - kind: e2e
        ref: "tests/phase1-load.spec.ts#has the same rows before and after, to the same digests"
        status: pass
      - kind: e2e
        ref: "tests/phase1-load.spec.ts#re-attaches without advancing the version or re-creating a table"
        status: pass
    human_judgment: false
  - id: D10
    description: "The plugin's own RPC keeps answering an external prober throughout the 200-chunk load, without a quiet stretch followed by a burst of replies"
    requirement: CORE-10
    verification:
      - kind: e2e
        ref: "tests/phase1-load.spec.ts#keeps the loaded maximum within a RECORDED multiple of the same-machine baseline"
        status: pass
    human_judgment: true
    rationale: "The automated gate proves a latency tolerance and a zero-error probe count. Only a human reading the two distributions can spot a stall the tolerance let through, or notice a max-slice figure sitting suspiciously close to the budget on every run — which would be the instrument rather than the system. Recorded for the end-of-phase gate (workflow.human_verify_mode = end-of-phase)."

duration: 35 min
completed: 2026-08-21
status: complete
---

# Phase 01 Plan 05: Lifecycle, Telemetry & External Measurement Summary

**A project switch — including to `null` — now cancels in-flight work and makes cross-project row leakage structurally impossible; there is exactly one counters object in the plugin, fed by the hook and the consumer; and the maximum synchronous slice under a 200-chunk SPA load is a number measured from outside the process (0.028 ms against a 25 ms budget) rather than one the plugin asserted about itself.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-08-20T22:56Z
- **Completed:** 2026-08-20T23:31Z
- **Tasks:** 3 of 3
- **Files modified:** 14 source/config files (+ 20 recorded run artifacts)

## Accomplishments

- **CORE-09 closed, and the `null` branch is a state rather than a guard.** `applyProjectChange` aborts the in-flight walk with a reason naming the transition, discards every queued entry admitted under the previous project, resets the memoised database handle, swaps the active id, and only then installs a fresh cancellation token. It contains no `await`, and that is the entire ordering guarantee: one thread with no suspension point cannot observe a half-applied swap. `lifecycle.spec.ts` asserts over the source that no `await` has crept in.
- **A real cross-project leak was found and closed.** The consumer resolved the project id *after* its reload `await`. An entry admitted under project A and reloaded across a project change therefore wrote its artifact and observation rows under project B — one client's bundles appearing in another client's view. Reproduced by neutering the fix and watching the spec report two rows keyed on the wrong project; closed by capturing a monotonic project *epoch* at the top of `handleOne` and re-checking it before every write.
- **Exactly one counters object, proven by an AST scan.** `telemetry.ts` now owns `counters`, `recordSlice`, `slimStatus`, `measured` and `describeError`. The local object plans 01-01 and 01-03 built is deleted, not shadowed. The scan covers every `.ts` file under `packages/backend/src` **including specs** — a spec that built its own counters would assert against an object production never touches — and its own failure path was executed against a synthetic file.
- **01-03's assertions pass unedited.** Verified mechanically: `git diff 2b0b93d` over `consumer.spec.ts` and `passive.spec.ts` removes zero lines containing `expect(`. Only imports and setup lines moved.
- **CORE-10 measured externally on a live Caido 0.57.1.** 200 distinct chunks (8 KB – 811 KB, 17.9 MB total) at concurrency 20, with a same-machine idle baseline captured first using the identical prober. Recorded: `max_slice_ms` **0.02799999713897705** against a 25 ms budget, 200 processed / 200 distinct digests, 0 overflow, 0 reload misses, and 200 artifacts identical before and after a real host restart with `user_version` and the DDL hash unchanged.
- **The test count moved from 22 files / 473 tests to 25 files / 540 tests.** Measured before and after, not asserted.

## Task Commits

1. **Task 1: Project-switch lifecycle, including the null branch** — `71c21b1` (feat)
2. **Task 2: Counters, max-slice recording, the slim projection — and the call sites that feed them** — `b68ec87` (feat)
3. **Task 3: External max-slice and RPC-responsiveness measurement under a 200-chunk SPA load** — `7828589` (feat)

## Files Created/Modified

**Created**

- `packages/backend/src/lifecycle.ts` — CORE-09. `installLifecycle`, `applyProjectChange`, `currentProjectId`, `currentSignal`, `projectEpoch`, `admissionAllowed`. Explicitly reconciles no `scan_state` row and names ERR-02 as their owner.
- `packages/backend/src/lifecycle.spec.ts` — 17 cases driving the fake SDK's new `onProjectChange`, including the mid-drain leak case, the two routes to "no project" compared as states, and three cases running the real `init()`.
- `packages/backend/src/telemetry.ts` — the single counter object, the max-slice fold, the RPC projection, and the completeness-word rule as shipped data rather than a convention.
- `packages/backend/src/telemetry.spec.ts` — 31 cases, ending in the AST singleton scan.
- `scripts/phase1/spa-load.sh` — baseline prober → 200-chunk load with the prober running → restart check on the same data path.
- `tests/phase1-load.spec.ts` — 15 assertions over the recorded artifact, fail-never-skip, remedy in every message.
- `.planning/.../results/spa-load.json` — the measurement.

**Modified**

- `packages/backend/src/index.ts` — `installLifecycle` after `migrate()` and before the ready latch; `signal` handed to the consumer as a getter; `status()` spreads `slimStatus()`; the local counters object removed.
- `packages/backend/src/ingest/consumer.ts` — imports `counters` and `recordSlice`; project-epoch guards; `recordSlice(result.maxSliceMs)` one statement from the `finishAnalysis` that persists the same number.
- `packages/backend/src/hooks/passive.ts` — `Counters`/`createCounters` deleted; CORE-09's admission gate added before the admission decision.
- `packages/backend/test/fixtures/fake-sdk.ts` — `onProjectChange`, `makeFakeProject`, `emitProjectChange`.
- `tsconfig.eslint.json` — `tests/**/*.ts` instead of one named spec.

## Decisions Made

Four planned decisions (P5-D1 … P5-D4) held as written. Four new ones were forced by execution:

| # | Decision | Why |
|---|---|---|
| P5-D5 | `PassiveDeps.admissionAllowed` is **required**, not optional-with-a-permissive-default | A default of "allow" is invisible when `init()` forgets to wire it: the plugin works and the isolation simply is not there. Required makes it a compile error. Cost: two setup lines in `passive.spec.ts`. |
| P5-D6 | The consumer captures a project **epoch** at the top of `handleOne` and re-checks before every write | Resolving the project id after an `await` is what produced the leak below. Capturing at the top means an entry is only ever processed under the project it was admitted under. |
| P5-D7 | The restart check reads the plugin database with `sqlite3`, not through `getArtifacts` | A guest may create **temporary** projects only — `temporary:false` returns `PermissionDeniedUserError`, measured against this build — so the project does not survive the restart. The artifacts must anyway, because `sdk.meta.db()` is one database for the plugin across every project and is not deleted when a project is. That asymmetry *is* the CORE-09 fact. |
| P5-D8 | `describeError` redacts URL-shaped substrings **before** truncating | Truncating first leaves the front half of a URL, which is the half carrying the host. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] A project change mid-reload wrote one project's traffic under another's id**

- **Found during:** Task 1, while writing the mid-drain case in `lifecycle.spec.ts`.
- **Issue:** `handleOne` resolved the project id *after* `await sdk.requests.get(id)`. An entry admitted under project A whose reload straddled a project change resolved project **B** and wrote both its artifact and its observation row keyed on B. Every table already carries `project_id`, so the rows looked perfectly well-formed; they were simply attributed to the wrong client. This is the exact failure T-01-25 describes, and the plan's own text — "cancel in-flight work" — does not cover it, because the entry was not in flight when the change fired.
- **Fix:** `ConsumerDeps.projectEpoch` (optional, defaulting to a constant so specs unconcerned with the lifecycle need not wire it). `handleOne` captures it before the reload and re-checks before the observation write, before the analyses block and before `finishAnalysis`; a mismatch increments `abandonedOnProjectChange` and returns.
- **Files modified:** `packages/backend/src/ingest/consumer.ts`, `packages/backend/src/hooks/passive.ts` (the counter).
- **Verification:** Neutering `stillCurrent()` to a constant `true` makes `lifecycle.spec.ts` report `expected 2 to be +0` on rows keyed on project B. Run, not described.
- **Committed in:** `71c21b1`.

**2. [Rule 2 — Missing critical, T-01-26] The `getStatus` projection leaked target URLs through error text**

- **Found during:** Task 2, by the recursive-walk assertion in `telemetry.spec.ts` — not by review.
- **Issue:** `describeError` rendered `String(e)` verbatim. An `Error("failed loading https://victim.example/private/app.js?token=secret")` came out of `slimStatus()` intact. Store and reload failures interpolate the thing they were working on, and the thing this pipeline works on is a target URL, frequently with a session token in the query. `getStatus` is the only channel by which internal state leaves the plugin in Phase 1.
- **Fix:** `redactUrls()` replaces anything scheme-shaped with `<url-redacted>`, applied before truncation. The pattern has one quantifier either side of a literal `://` — no nesting, no alternation — because `REDOS_RECOVERY` is `kill` on this runtime.
- **Files modified:** `packages/backend/src/telemetry.ts`.
- **Verification:** Two assertions, one for the redaction and one non-vacuity check that the message survives with the marker rather than vanishing, plus a case proving the order (redact then truncate).
- **Committed in:** `b68ec87`.

**3. [Rule 3 — Blocker] A new `tests/` spec failed lint with a parsing error**

- **Found during:** Task 3.
- **Issue:** `tsconfig.eslint.json` listed `tests/pins.spec.ts` by name, so `tests/phase1-load.spec.ts` had no type program and the typed rules could not run on it. 01-02's design is that anything added to `tests/` is linted **by default** — which was working; the tsconfig simply had not been widened to match.
- **Fix:** `include` now carries `tests/**/*.ts`. Which tests are *linted* remains `eslint.config.js`'s decision (it still names the Phase 0 gates it deliberately leaves alone); this file only supplies a program for whatever that decision lets through.
- **Files modified:** `tsconfig.eslint.json`.
- **Verification:** `pnpm lint` clean; the Phase 0 trees are still untouched.
- **Committed in:** `7828589`.

---

**Total deviations:** 3 auto-fixed (1 × Rule 1 bug, 1 × Rule 2 missing critical, 1 × Rule 3 blocker).
**Impact on plan:** All three were required for correctness or for the plan's own threat model, and two were found by assertions the plan asked for rather than by inspection. No scope creep — nothing from Phase 2's ERR/OBS set was pre-built, and `telemetry.spec.ts` asserts that `telemetry.ts` exports no health surface, vocabulary or diagnostics export.

## Issues Encountered

**A guest cannot create a persistent project.** The restart check needs data to survive a host restart, and `createProject(temporary:false)` returns `PermissionDeniedUserError` on a `--allow-guests` instance — verified with a throwaway run before committing to a design. Resolved by reading the plugin database from the filesystem with `sqlite3` on both boots (P5-D7). This turned out to be the *stronger* check: it proves the rows persist in the plugin's own database independently of any project, which is precisely the property that makes CORE-09 necessary in the first place.

**`load.sh` drives a single URL.** 200 fetches of one body would have been 199 content-hash cache hits, exercising CORE-08's skip instead of the walk. Rather than edit the Phase 0 driver — which must not change between baseline and loaded runs or the comparison is meaningless — the load is driven with `-u "/chunk-{}.js"`: `xargs -I{}` substitutes *every* occurrence of the placeholder, so the path varies per request alongside the cache-buster. Verified with a standalone `xargs` run before relying on it. `distinct_digests` is asserted at ≥ 200 so this cannot silently regress.

## The number, and why it is small

`max_slice_ms` is **0.028 ms** against a 25 ms budget, and the loaded RPC distribution sits *at or below* the idle baseline (loaded max 1.311 ms vs baseline max 1.374 ms, both over ≥ 26 samples with zero probe errors and a maximum inter-sample gap of 0.233 s against a 0.2 s polling interval).

That is the honest result, not a broken instrument. Phase 1 ships no detector, so `walk`'s `visit` is a no-op and there is genuinely almost nothing for a synchronous slice to consist of — the live tracer recorded 0.023 ms independently. CORE-10 asks for "the maximum synchronous slice *actually observed*", and this is it. **The deliverable is the instrument proven wired**, which is why the gate fails on a zero and why deleting `recordSlice` fails four assertions in under a second. The number becomes interesting in Phase 3, when `visit` is given work; the 890× margin under the budget is headroom that has not yet been spent, not a claim that it never will be.

## Verification

| Command | Result |
|---|---|
| `pnpm vitest run packages/backend/src --reporter=dot` | 10 files / 211 tests pass |
| `pnpm test` | 25 files / **540** tests pass (baseline was 22 / 473) |
| `bash scripts/phase1/spa-load.sh && pnpm vitest run tests/phase1-load.spec.ts` | exits 0; 15 assertions pass |
| `bash scripts/phase1/tracer-e2e.sh` | TRACER PASSED — digest equal, 1 artifact `seen_count` 2, 2 observations, sqlite 3.46.0, schema v2 |
| `pnpm typecheck && pnpm lint && pnpm knip` | clean |

**Negative demonstrations, all executed rather than described:**

| Mutation | Result |
|---|---|
| Delete `recordSlice(result.maxSliceMs)` from `consumer.ts` | 4 assertions fail across `consumer.spec.ts` and `telemetry.spec.ts` |
| Reintroduce a three-key counters literal in `index.ts` | 2 assertions fail in the AST scan |
| Neuter the consumer's `stillCurrent()` guard | `lifecycle.spec.ts` reports 2 rows keyed on the wrong project |
| Set `spa-load.json`'s `max_slice_ms` to `0` | `tests/phase1-load.spec.ts` fails with the instrument-failure message |
| Hold TCP 8971 in LISTEN | `spa-load.sh` refuses and exits 1 before touching anything |

## Known Stubs

None. `walk`'s `visit` is a documented no-op until Phase 3 — that is a scope boundary stated in `pipeline.ts` and inherited from plan 01-03, not a stub introduced here. No `TODO`, `FIXME`, skipped test or unrun `<verify>` was left behind.

## Outstanding for the end-of-phase gate

`workflow.human_verify_mode` is `end-of-phase`, so the plan's `<human-check>` is **recorded rather than halted on** (it is not `blocking-human`). It is carried as coverage entry **D10**:

> Open `.planning/phases/01-skeleton-persistence-compatibility/results/spa-load.json` and read the `rpc.baseline` and `rpc.loaded` distributions by eye. The plugin's own RPC should keep answering on its polling interval throughout the 200-chunk load, not go quiet for a stretch and then return a burst of replies — `max_gap_between_samples_s` is recorded for exactly that. A max-slice number suspiciously close to the budget on every run is the instrument, not the system.
>
> Current run: baseline n=53 median 1.238 ms p95 1.31 ms max 1.374 ms gap_max 0.235 s; loaded n=26 median 1.089 ms p95 1.249 ms max 1.311 ms gap_max 0.233 s; 0 probe errors on both. The loaded maximum is *below* the idle baseline maximum.

## Next Phase Readiness

Plan 01-06 (COMPAT-01's compatibility legs) is unblocked and untouched by this work — it uses `P1_COMPAT_PORT` / `P1_COMPAT_PORT_ALT`, which this plan did not take.

What Phase 2 inherits, deliberately left open rather than filled:

- **OBS-01 / OBS-02 / OBS-03** — the counters exist, are reachable through one object, and are named under a rule that ships with them. `telemetry.spec.ts` asserts `telemetry.ts` exports no health surface, degradation vocabulary or diagnostics export, so Phase 2 builds on the seam rather than around a half-built version of itself.
- **ERR-02** — `lifecycle.ts` reconciles no `scan_state` row and says so in a comment naming ERR-02; the spec fails if either the restraint or the comment goes away. Plan 01-05's own `abandonedOnProjectChange` path deliberately leaves a `pending` row behind, which is a concrete example waiting for that reconciliation.
- **ERR-03/ERR-04** — `measured()` and `recordError()` exist and preserve the error class name, but nothing durable records failures yet. `lastError` is in-memory and overwritten, not accumulated.

One carried concern, unchanged from the phase's own framing: the responsiveness claim is currently proven against a load the plugin barely notices. It should be re-run in Phase 3 once `visit` does real work, at which point the same script and the same gate will be measuring something that can actually stall.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-21*

## Self-Check: PASSED

All 7 created files verified present on disk. All 3 task commits verified in `git log`.
