---
phase: 01-skeleton-persistence-compatibility
plan: 03
subsystem: ingest
tags:
  [admission-gate, bounded-queue, chunker, temporal-yield, deadline, encoding, consumer, store-wiring, ast-gate]

requires:
  - phase: 01-skeleton-persistence-compatibility
    plan: 01
    provides: "the tracer's vertical slice, `upsertArtifact` / `recordObservation` frozen, BoundedQueue, sha256Hex, and the generated threshold set"
  - phase: 01-skeleton-persistence-compatibility
    plan: 02
    provides: "the two-package pnpm workspace, tsconfig projects, eslint scope over packages/**, and knip.json's note addressed to this plan"
  - phase: 01-skeleton-persistence-compatibility
    plan: 04
    provides: "`analyses` and `settings` (step v2), `isAnalysed` / `claimAnalysis` / `finishAnalysis`, `sweepRetention`, `getRetentionBounds`, and the node:sqlite test fixture"
provides:
  - "`admit(sdk, request, response, cfg)` — the complete CORE-02 decision over a CLOSED reject-reason union derived from its own runtime list, with 304 under its own `revalidation` reason"
  - "`packages/backend/test/fixtures/fake-sdk.ts` — the fake every backend spec in this phase and the next three depends on"
  - "`windows(bytes, size, overlap)` — 64 KiB windows with 4 KiB overlap over subarray views, carrying ABSOLUTE offsets"
  - "`Deadline(budgetMs, now)` — injected-clock budget, `expired` at `>=`, float throughout"
  - "`yieldToLoop()` — the ONE yield primitive, with the measurement that forces it"
  - "`walk(bytes, ctx) -> {partial, maxSliceMs, bytesWalked, yieldCount}` — temporal-slice walk degrading to a recorded partial state"
  - "`decodeUtf8` / `decodeViaBuffer` / `decodeViaStringDecoder` — both available paths, cross-checked (TEXTDECODER_MODULE is `none`)"
  - "A consumer in which ALL FOUR store call sites are reachable from a running plugin: identity, the URL edge, CORE-08's skip, and STORE-06's schedule"
  - "`auditNeverRetain(file, source)` — a pure AST gate for CORE-05, with its violation fixture executed in-file"
affects: [01-05, 01-06, phase-2-observability, phase-3-detectors, phase-4-secrets]

actuals:
  tokens: 51229
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Closed enum derived from its own runtime list, plus a set-comparison test — a reason with no case fails at authoring time, because a counter keyed on a typo reads zero forever and nobody can tell that from 'it never happened'"
    - "First-failure-wins axis ordering as a CONTRACT: the order is what decides whether a 304 gets an honest reason or a misleading one"
    - "Inject the clock so the boundary case is a microsecond assertion instead of a 30-second wait"
    - "Prove a trigger is temporal by holding the elapsed profile fixed and varying the geometry — a count alone tells you a number, not what the number is a function of"
    - "Degrade with real values rather than throwing: a partial result keeps the offset actually reached, so the degraded state persists numbers instead of NULLs"
    - "Comment-stripping static gates, so a rule's own documentation cannot fail it — every stripper is itself tested"
    - "Execute the mutation: three negative demonstrations were run against the real source, not asserted in prose"

key-files:
  created:
    - packages/backend/src/hooks/admit.ts
    - packages/backend/src/hooks/admit.spec.ts
    - packages/backend/src/hooks/passive.spec.ts
    - packages/backend/src/ingest/consumer.spec.ts
    - packages/backend/test/fixtures/fake-sdk.ts
    - packages/engine/src/chunker.ts
    - packages/engine/src/chunker.spec.ts
    - packages/engine/src/deadline.ts
    - packages/engine/src/deadline.spec.ts
    - packages/engine/src/yield.ts
    - packages/engine/src/pipeline.ts
    - packages/engine/src/pipeline.spec.ts
    - packages/engine/src/decode.ts
    - packages/engine/src/decode.spec.ts
    - packages/engine/src/digest.spec.ts
    - packages/engine/src/queue.spec.ts
    - .planning/phases/01-skeleton-persistence-compatibility/results/runs/20260820T225004Z-11560/analyses.json
  modified:
    - packages/backend/src/hooks/passive.ts
    - packages/backend/src/ingest/consumer.ts
    - packages/backend/src/store/db.ts
    - packages/engine/src/queue.ts
    - packages/engine/package.json
    - knip.json

key-decisions:
  - "P3-D1 held: the queue drops the OLDEST entry on overflow, diverging from the probe/tier0-events analog. Asserted by reconstructing the retained window, not just commented"
  - "P3-D2 held: 304 carries its own `revalidation` reason. Enforced by axis ORDER — a 304 fails status, size and kind simultaneously, so status-first is the only ordering under which the reason is reachable at all"
  - "P3-D3 held: decode.ts ships both Buffer and string_decoder paths with a cross-check, defaulting to ON, with a documented opt-out"
  - "P3-D4 held: all four store call sites live in consumer.ts, and each has a negative demonstration that was EXECUTED rather than described"
  - "NEW — the in-flight latch moved from per-call to MODULE scope. A per-call flag cannot see a second startConsumer(), which is the realistic way a second loop appears (re-init, hot reload). startConsumer now returns the EXISTING handle, so a caller that stops what it started stops the real loop"
  - "NEW — `reloadMissing` split into `reloadMissing` and `reloadNoResponse`. The SDK types these as two different optionality points, and 'Caido lost the request' and 'Caido has no response for it' call for different investigations"
  - "NEW — `detectorSetHash` is injectable on ConsumerDeps, defaulting to DETECTOR_CORPUS_VERSION. Phase 3's real hash arrives through it, and it is what lets the spec prove a DIFFERENT corpus version adds exactly one analyses row through the real consumer path rather than by calling the store directly"
  - "NEW — `walk` takes its abort surface STRUCTURALLY (`{aborted, reason?}`) rather than as `AbortSignal`. Phase 0's capability probe never enumerated AbortController in this runtime; binding to it would be an assumption dressed as a type"
  - "DEVIATION from the plan's prose: the per-iteration error counter stays `consumerErrors` (01-01's name) rather than becoming `iterationError`. 01-05 rewires this object keeping the key names, and `consumerErrors` already pairs with `hookErrors`"

requirements-completed: [CORE-02, CORE-03, CORE-04, CORE-05, CORE-06, CORE-07, CORE-08, STORE-03, STORE-06, ENC-01]

coverage:
  - id: D1
    description: "Every delivered response is admitted or rejected under exactly one NAMED reason from a closed union, with 304 under its own `revalidation` rather than folded into the content-type miss; the reason set is compared against the union's members, so a seventh reason with no test fails"
    requirement: "CORE-02"
    verification:
      - kind: unit
        ref: "vitest packages/backend/src/hooks/admit.spec.ts (37 tests)"
        status: pass
      - kind: e2e
        ref: "bash scripts/phase1/tracer-e2e.sh — live status.json shows all six reasons present at 0 and admitted 2, including out_of_scope 0, proving the new Caido scope axis does not reject real proxied traffic"
        status: pass
    human_judgment: false
  - id: D2
    description: "The queue is bounded above the measured burst, FIFO, drop-OLDEST, with a monotonic overflow count a read never resets, and an entry type frozen at exactly three keys"
    requirement: "CORE-03"
    verification:
      - kind: unit
        ref: "vitest packages/engine/src/queue.spec.ts — 499 throws / 500 succeeds, 2048+1 gives overflow 1, 3000 gives 952, and the retained window is reconstructed as contiguous"
        status: pass
    human_judgment: false
  - id: D3
    description: "Exactly one drain loop runs regardless of how many callers start or drive it, proven by an in-flight latch test that parks a reload mid-flight and shows a concurrent drain takes nothing"
    requirement: "CORE-04"
    verification:
      - kind: unit
        ref: "vitest packages/backend/src/ingest/consumer.spec.ts#CORE-04 — starting twice with a queue of depth 10 gives 10 reloads, not 20"
        status: pass
    human_judgment: false
  - id: D4
    description: "No Request, Response or Body reference survives an await, checked over consumer.ts's AST rather than by convention, with the violation (direct binding AND alias) executed against fixtures and a legal-shape control proving the gate does not simply report everything"
    requirement: "CORE-05"
    verification:
      - kind: unit
        ref: "vitest packages/backend/src/ingest/consumer.spec.ts#CORE-05 — auditNeverRetain over the real file plus 3 fixtures"
        status: pass
    human_judgment: false
  - id: D5
    description: "The yield trigger is TEMPORAL, not geometric — the same elapsed profile through two geometries producing 5 and 10 windows yields an identical 2 times, and the converse (same geometry, cheaper bytes) takes 2 yields to 0"
    requirement: "CORE-06"
    verification:
      - kind: unit
        ref: "vitest packages/engine/src/pipeline.spec.ts#two geometries with DIFFERENT window counts yield the SAME number of times"
        status: pass
      - kind: other
        ref: "static scan: no engine source but yield.ts references a timer, and yield.ts references only setTimeout — with the comment stripper itself tested"
        status: pass
    human_judgment: false
  - id: D6
    description: "A deadline crossed mid-walk returns a PARTIAL result keeping the work already done, and the consumer persists scan_state='partial' with max_slice_ms and bytes_walked both non-null and equal to the offset actually reached"
    requirement: "CORE-07"
    verification:
      - kind: unit
        ref: "vitest packages/engine/src/pipeline.spec.ts#returns partial at window 3 of 10 with bytesWalked at window 3's end"
        status: pass
      - kind: unit
        ref: "vitest packages/backend/src/ingest/consumer.spec.ts#an iteration whose clock crosses ARTIFACT_DEADLINE_MS writes partial, with REAL numbers"
        status: pass
      - kind: other
        ref: "MUTATION EXECUTED: replacing walk(...) with constants makes the deadline case fail ('done' vs 'partial')"
        status: pass
    human_judgment: false
  - id: D7
    description: "Content already analysed at the current corpus version starts no second analysis: a repeat sighting updates the artifact counters and writes its observation while the analyses row count stays at 1; a DIFFERENT detector_set_hash adds exactly one"
    requirement: "CORE-08"
    verification:
      - kind: unit
        ref: "vitest packages/backend/src/ingest/consumer.spec.ts#CORE-08 — proven by row counts, and by the analyses row being byte-identical before and after"
        status: pass
      - kind: e2e
        ref: "live Caido 0.57.1: two proxied sightings leave analyses=1, observations=2, seen_count=2 — results/runs/20260820T225004Z-11560/analyses.json"
        status: pass
    human_judgment: false
  - id: D8
    description: "One successfully reloaded entry produces BOTH an artifact upsert and an observation write, unconditionally and in the same iteration, so the plugin can never durably remember bytes without remembering where they came from"
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: "vitest packages/backend/src/ingest/consumer.spec.ts#one reloaded entry produces BOTH an artifact and an observation"
        status: pass
      - kind: other
        ref: "MUTATION EXECUTED: removing the recordObservation call fails 8 cases, the first naming exactly why — it does not pass with fewer rows"
        status: pass
    human_judgment: false
  - id: D9
    description: "A running plugin actually trims: row counts fall to the configured bounds with NO call to sweepRetention in the test, and a single cadence crossing performs exactly one pass rather than looping to convergence"
    requirement: "STORE-06"
    verification:
      - kind: unit
        ref: "vitest packages/backend/src/ingest/consumer.spec.ts#STORE-06 — 100 seeded artifacts against a 40-row bound fall to <=41 from one processed entry; 128 processed entries give exactly 2 sweeps"
        status: pass
      - kind: e2e
        ref: "live Caido 0.57.1 status.json: retentionSweeps 1 after two proxied responses, with nothing external triggering it"
        status: pass
    human_judgment: false
  - id: D10
    description: "Offsets and hashes derive from toRaw() bytes and never from toText(), with a failing counterexample: the 222-byte fixture's anchor is at raw byte 175 and at text-derived byte 195, and the two digests differ"
    requirement: "ENC-01"
    verification:
      - kind: unit
        ref: "vitest packages/engine/src/decode.spec.ts (19 tests) and digest.spec.ts (22 tests)"
        status: pass
      - kind: other
        ref: "MUTATION EXECUTED: deleting the gitignored fixture fails every case with both regeneration commands in the message, rather than skipping"
        status: pass
    human_judgment: false
  - id: D11
    description: "The whole tracer still passes after the expansion, including its artifact-plus-two-observations assertion — the regression guard on the store call sites this plan rewired"
    verification:
      - kind: e2e
        ref: "bash scripts/phase1/tracer-e2e.sh against a live Caido 0.57.1 — TRACER PASSED, host digest cec8f860…6d44 equal to the digest read back"
        status: pass
    human_judgment: false
  - id: D12
    description: "knip's exports and types rules restored to error, as plan 01-02's note asked for, at the cost of one documented weakening and one @public tag"
    verification:
      - kind: other
        ref: "pnpm knip exits 0 at error level"
        status: pass
    human_judgment: true
    rationale: "`ignoreExportsUsedInFile: true` is a REAL weakening and knip.json says so: a dead export referenced once in its own file is now invisible. It is a smaller hole than `warn` (which hid everything), but a human should confirm the trade before Phase 5, when the frontend will give most of those sixteen types a cross-module consumer and the setting could be dropped."

duration: 37 min
completed: 2026-08-20
status: complete
---

# Phase 1 Plan 03: Full Ingestion Pipeline and Every Store Call Site Summary

**The store stopped being dead code: a live Caido 0.57.1 now admits a proxied JavaScript response under a named gate, walks it on a temporal slice with an injected clock, and leaves one artifact row, two observation rows, one analyses row with `bytes_walked = 2574` and `max_slice_ms = 0.023`, and one retention sweep — all four writes reached from the consumer loop, each with its removal demonstrated to fail.**

## Performance

- **Duration:** 37 min
- **Started:** 2026-08-20T22:14:47Z
- **Completed:** 2026-08-20T22:52:32Z
- **Tasks:** 3 of 3
- **Files changed:** 22 (17 created, 5 modified)
- **Test suite:** 13 files / 245 tests before → **22 files / 473 tests after**

## Accomplishments

- **All four store call sites are now reachable from a running plugin, and the live database proves it.** The plan's governing worry (P3-D4) was a producer whose only caller nobody owned. `results/runs/20260820T225004Z-11560/analyses.json` was read out of the plugin's real database inside Caido 0.57.1 after two proxied sightings: `artifacts 1 / observations 2 / analyses 1`, with `scan_state = 'done'`, `bytes_walked = 2574` (exactly the artifact's `byte_len`) and `max_slice_ms = 0.023000001907348633`. That float is itself evidence — the walk ran inside QuickJS against a real `performance.now()`, and the un-rounded millisecond survived the round trip through SQLite.
- **Three negative demonstrations were EXECUTED against the real source, not described.** Removing `recordObservation` fails 8 cases, the first naming precisely what is lost. Replacing `walk(...)` with constants fails the deadline case (`'done'` where `'partial'` was required) while the `done` case still passes — which is exactly the asymmetry the plan predicted. Deleting the gitignored corpus fixture fails every ENC-01 case with both regeneration commands in the message, and does not skip. Each mutation was applied, run, and reverted.
- **The temporal-yield claim is proven by construction, not by counting.** Counting yields on one input tells you a number; it does not tell you what the number is a function of. So `pipeline.spec.ts` runs the SAME elapsed profile (240 bytes at 0.25 ms/byte, driven by new ground covered so the geometry cannot change the total) through two window geometries producing **5 and 10 windows**, and asserts an **identical yield count of 2**. A geometric trigger cannot pass that. The converse runs too: same geometry, cheaper bytes, 2 yields becomes 0.
- **The 304's honest reason is enforced by axis ORDER, and the order is written down as a contract.** A 304 fails status, size and kind simultaneously — `STATUS_304_REACHES_HOOK` recorded it arriving with a zero-length body and *no content-type header at all* — so status-first is the only ordering under which `revalidation` is reachable. `makeFake304()` builds one with the exact headers Phase 0 recorded, so no case can accidentally give a 304 a content-type it never has.
- **ENC-01's counterexample is now anchored and localised.** `OFFSET_ANCHOR_START` sits at raw byte 106, character 106 and text-derived byte 106 — all three agree. `OFFSET_ANCHOR_END` sits at raw byte **175** and at text-derived byte **195**. The spec asserts the raw offset points at the anchor and the text-derived one does not, so "offsets derive from bytes" has a demonstrated failure mode rather than a stated rule.
- **The Caido scope axis was the plan's one live risk, and the live run retired it.** `admit` calls `sdk.requests.inScope(request)` — a genuinely new rejection path added to a hook that previously had none. The live `status.json` reads `admitted: 2` with `out_of_scope: 0`, so a default-scope instance does not silently discard everything. That could not have been settled by any unit test.
- **Every static gate in this plan has its own failing path executed and its own stripper tested.** The hooks' no-decode scan is an AST walk (a substring scan would fail on the comments that explain the rule); the CORE-05 never-retain audit runs a direct-binding violation, an alias violation, and a legal-shape control; the timer and per-character scans strip comments with a hand-written character scanner that is itself asserted to strip comments and keep code.

## Task Commits

1. **Task 1: the admission gate and the bounded queue** — `ddef14f` (feat)
2. **Task 2: chunker, deadline, yield and the temporal-slice pipeline** — `40bbc9c` (feat)
3. **Task 3: byte-exact encoding and every store call site** — `0882ef0` (feat)
4. **knip's gate restored to error, as 01-02 asked** — `54c912d` (chore)

**Plan metadata:** see the `docs(01-03)` commit following this summary.

## Files Created/Modified

**The gate and the hook**
- `packages/backend/src/hooks/admit.ts` — `admit(sdk, request, response, cfg)` over `REJECT_REASONS` as a runtime list with the type DERIVED from it, so the "every reason has a test" comparison is mechanical. Status → body → size → kind → scope, first failure wins. No regex anywhere (`REDOS_RECOVERY` is `kill`); `indexOf` and `endsWith` only.
- `packages/backend/src/hooks/passive.ts` — reduced to wiring: latch, count, admit, offer, return. Still not async. Counters keyed on admit's union, so a counter for a reason that does not exist is a compile error rather than a silent zero.
- `packages/backend/src/hooks/admit.spec.ts`, `passive.spec.ts` — 37 + 22 assertions, including the permanent home for the "returns undefined, not a Promise" check plan 01-01 parked in a transient probe.

**The engine**
- `packages/engine/src/chunker.ts` — `windows()` over subarray views with absolute offsets; illegal geometry throws rather than looping forever.
- `packages/engine/src/deadline.ts` — injected clock, `expired` at `>=`, float throughout, `remainingMs` clamped at 0 with `overrunMs` carrying the honest overshoot.
- `packages/engine/src/yield.ts` — `setTimeout(resolve, 0)`, with the whole SPIKE-02 table in the header because the two wrong answers are one character shorter.
- `packages/engine/src/pipeline.ts` — `walk()`; abort check → deadline check → visit → measure → maybe yield. `artifactDeadline(now)` so `ARTIFACT_DEADLINE_MS` is imported once and never re-typed as a literal.
- `packages/engine/src/decode.ts` — both paths, cross-checked, with `DecodeDivergence` as its own class.
- `packages/engine/src/queue.ts` — `drain(n)`, which never touches `overflowCount`.

**The consumer**
- `packages/backend/src/ingest/consumer.ts` — the four call sites, the module-scope in-flight latch, `reloadMissing`/`reloadNoResponse` split, and `defaultClock()` separating the monotonic elapsed clock from the `Date.now()` correlation keys.
- `packages/backend/src/ingest/consumer.spec.ts` — 30 assertions against the REAL store modules over in-process SQLite, plus `auditNeverRetain`.

**Fixtures and config**
- `packages/backend/test/fixtures/fake-sdk.ts` — `makeFakeSdk` / `makeFakeRequest` / `makeFakeResponse` / `makeFake304` / `makeDeclaredLengthBody`. Its header names what it deliberately does NOT fake.
- `packages/engine/package.json` — five new export subpaths.
- `knip.json`, `packages/backend/src/store/db.ts` — the gate restoration and its one `@public` tag.

## Decisions Made

Beyond the four the plan recorded (all held), five arose during execution:

- **The in-flight latch is module-scoped, not per-call.** The plan says "a second call to start the consumer is a no-op rather than a second loop", and a closure-local flag cannot deliver that — two `startConsumer` calls would build two independent loops each believing itself alone. `startConsumer` now returns the EXISTING handle, so a caller that stops what it started stops the real loop rather than a decoy.
- **`reloadMissing` became two counters.** `sdk.requests.get(id)` resolving `undefined` and a pair whose `response` is `undefined` are two different optionality points in the SDK's own types, and they call for different investigations.
- **`detectorSetHash` is injectable.** Phase 3's real hash arrives through it, and it is what lets the CORE-08 "different corpus version" case run through the real consumer path rather than by calling the store directly.
- **`walk` takes its abort surface structurally.** `AbortController` was never enumerated inside this runtime by Phase 0's capability probe, so typing against `AbortSignal` would have been an assumption dressed as a type. A real `AbortSignal` satisfies the structural type anyway.
- **The per-iteration error counter stays `consumerErrors`.** The plan's prose called it `iterationError`; 01-01 shipped `consumerErrors`, 01-05 rewires this object keeping the key names, and `consumerErrors` pairs with `hookErrors`. Renaming would have bought nothing and cost 01-05 a diff.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `contentTypeOf` moved to `admit.ts`, so `consumer.ts`'s import moved with it in task 1**

- **Found during:** Task 1, extracting the gate.
- **Issue:** `isScriptish` and `contentTypeOf` lived in `passive.ts`, which task 1 reduces to wiring. Leaving `contentTypeOf` behind would have made `passive.ts` a module that exports a classifier it no longer uses; moving it while leaving `consumer.ts` importing from the old path would have broken `tsc --build` at the end of task 1.
- **Fix:** both moved to `admit.ts`; `consumer.ts`'s single import line repointed in the same commit. `consumer.ts` is task 3's file, but a task must leave the repo typechecking.
- **Files modified:** `packages/backend/src/hooks/admit.ts`, `passive.ts`, `ingest/consumer.ts` (one line).
- **Committed in:** `ddef14f`.

**2. [Rule 1 — Bug] `decode.spec.ts` failed with a bare ENOENT instead of naming the regeneration commands**

- **Found during:** Task 3, executing the "delete the fixture" demonstration.
- **Issue:** the fixture was read at `describe` scope, so a missing `corpus/encoded/nonutf8.js` failed the whole FILE with a raw `ENOENT` — which satisfies "must not skip" but fails the acceptance criterion's other half, that the message name `fetch-corpus.sh` and `make-encoded-fixtures.mjs`. A fresh clone would have got a filesystem error and no remedy.
- **Fix:** a `rawBytes()` helper that throws the remedy, called lazily inside each case.
- **Verification:** the fixture was moved aside and the run re-executed — every case now fails individually with both commands in the message — then restored and its digest re-checked.
- **Files modified:** `packages/engine/src/decode.spec.ts`.
- **Committed in:** `0882ef0`.

**3. [Rule 2 — Missing critical] `thresholds.generated.ts` had to be excluded from the timer scan, by NAME**

- **Found during:** Task 2, first run of the timer-discipline gate.
- **Issue:** the generated file carries `YIELD_PRIMITIVE = "setTimeout0"` — the measured ANSWER as a string literal — and the scan read it as a timer reference.
- **Fix:** excluded by an explicitly named constant with the reasoning attached, matching `eslint.config.js`'s existing exclusion of the same file. Not pattern-matched, so the exclusion is a decision somebody has to read.
- **Files modified:** `packages/engine/src/pipeline.spec.ts`, `digest.spec.ts`.
- **Committed in:** `40bbc9c`, `0882ef0`.

**4. [Rule 2 — Missing critical] knip's `exports`/`types` rules restored to `error`, with the cost stated**

- **Found during:** post-task verification.
- **Issue:** `knip.json` carried an instruction from plan 01-02 addressed to this plan. 01-02 expected every seam to have a consumer by now; 26 did not. `warn` is not a gate — a genuinely dead export added tomorrow would print alongside the expected ones and change nothing.
- **Fix:** `ignoreExportsUsedInFile: true` (drops the 16 types referenced only inside their own module) plus one `@public` tag on `resetDbHandle`, the single remaining export with no consumer and a named owner one wave away.
- **The hole, stated in `knip.json` rather than buried:** a dead export referenced once in its own file is now invisible. Smaller than `warn`, which hid everything — but not nothing. See coverage D12; a human should confirm the trade.
- **Files modified:** `knip.json`, `packages/backend/src/store/db.ts`.
- **Committed in:** `54c912d`.

---

**Total deviations:** 4 auto-fixed (1 blocking, 1 bug, 2 missing-critical).
**Impact on plan:** no scope creep and no signature changed. Deviations 1 and 3 are mechanical consequences of moving code the plan asked to move. Deviation 2 turned a criterion that would have been *reported* as met into one that is *demonstrated*. Deviation 4 is the only one that widened scope, by two small files, and it closes an instruction the previous plan left in the repo addressed to this one.

## Verification Run

| Check | Result |
|---|---|
| `pnpm vitest run packages --reporter=dot` | 16 files / **347 tests**, 0.77 s |
| `pnpm test` | 22 files / **473 tests** (was 13 / 245), 0.99 s |
| `pnpm typecheck` | clean |
| `pnpm lint` | clean |
| `pnpm knip` | clean, at **error** level |
| `pnpm exec caido-dev build packages` | `packages/backend/dist/index.js` 42.26 KB + `packages/dist/plugin_package.zip` |
| `node scripts/ci/check-bundle-imports.mjs` | 1 specifier: `crypto` |
| `bash scripts/phase1/tracer-e2e.sh` | **TRACER PASSED** against live Caido 0.57.1 |

Every task's `<verify>` command ran under 15 seconds with no live Caido, as its acceptance criterion required.

## Known Stubs

| Stub | File | Why it is intentional, and who resolves it |
|---|---|---|
| `visit: () => {}` — the walk's callback does nothing | `packages/backend/src/ingest/consumer.ts` | **Phase 3.** No detector exists until then. The plan names this explicitly: the walk's yielding, deadline and offset accounting are all real regardless, and proving them now is the point — there is nothing to hide behind yet. The persisted `bytes_walked = 2574` from the live run is what a no-op visit still produces honestly. |
| `decode.ts` has no consumer in the shipped bundle | `packages/engine/src/decode.ts` | **Phase 3/5.** Nothing displays source until a frontend exists. This is why `check-bundle-imports.mjs` still reports only `crypto`: `string_decoder` is not reachable from `index.ts`. ENC-01's requirement is that the byte path is provably distinct from the text path, which `decode.spec.ts` demonstrates today. |
| The counters object is provisional | `packages/backend/src/hooks/passive.ts` | **Plan 01-05, by design.** Key names were chosen so swapping the import to `telemetry.ts` is the whole of the change. There is still exactly one counters object. New keys this plan added: `reloadNoResponse`, `analysisCacheHit`, `analysisStarted`, `analysisPartial`, `retentionSweeps`, `retentionDeleted`. The reject-reason keys changed with the union: `empty_body`/`oversize`/`not_script`/`no_body` became `empty`/`too_large`/`not_scriptish`, and `out_of_scope` is new. |

No stub prevents this plan's goal from being achieved; each is a Phase-1-scoped boundary with a named later owner.

## Issues Encountered

- **The Caido scope axis could not be settled off-runtime.** Adding `sdk.requests.inScope(request)` to a hook that previously had none is the kind of change that silently rejects everything if a default-scope instance answers `false`. No unit test can answer it. It was settled by running the tracer live and reading `out_of_scope: 0` out of `status.json`. Worth remembering for Phase 5: an operator with a NARROW configured scope will see this counter climb, and that is correct behaviour that will look like a bug.
- **The retention cadence test is the slowest thing in the suite** — 128 processed artifacts, each with a reload, a walk, three writes and a `setTimeout(0)` yield. It runs in about 250 ms on Node and would take roughly 640 ms of pure yield overhead inside QuickJS at the measured 5.029 ms clamp. That is fine, and it is also a reminder that the cadence constant is doing real work.
- **`RETENTION_SWEEP_EVERY_N` is exercised at its real value.** It was tempting to make it injectable so the cadence test could use 4 instead of 128. It is not, deliberately: the claim is about the SCHEDULE, and a schedule proven at a fabricated interval is a different schedule.

## User Setup Required

None.

## Next Phase Readiness

**Ready.**

- **Plan 01-05 (wave 5)** — the counters object and `EnqueueClock` are still the only ones, still provisional, and now carry the six new keys listed under Known Stubs. `recordSlice(walkResult.maxSliceMs)` has an obvious home: `analyseAndFinish` in `consumer.ts` already holds `result.maxSliceMs` at the point where it decides `scan_state`. `resetDbHandle` is tagged `@public` for exactly this plan — when 01-05 calls it, the tag should come off and knip will keep the gate honest without it.
- **Plan 01-06 (wave 6)** — `compat.ts` untouched. The build is unchanged: `pnpm exec caido-dev build packages`, installing from `packages/dist/plugin_package`.
- **Phase 3 (detectors)** — three seams are already shaped for it: `visit(window)` receives absolute offsets on subarray views; `ConsumerDeps.detectorSetHash` replaces the Phase 1 sentinel and is already proven to add exactly one `analyses` row when it changes; and `decodeUtf8` exists with its ENC-01 boundary documented, so an offset-mapper has one decoder rather than two competing ones.
- **Phase 2 (observability)** — `getStatus()` already surfaces every counter this plan added, verified live. `retentionSweeps` and `retentionDeleted` are the two numbers a health surface will want first.

**Carried risk, unchanged:** the cross-day cache hit rate is still inconclusive (Broken Window #6). `CACHE_HIT_RATE` still reads through `CACHE_HIT_RATE_ASSUMED` and `thresholds.spec.ts` still fails loudly the day real data arrives.

**New carried risk:** knip's `ignoreExportsUsedInFile` hole (coverage D12). It is documented in `knip.json` and should be revisited in Phase 5.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-20*

## Self-Check: PASSED

All 17 files named in `key-files.created` verified present on disk, and all four task commits (`ddef14f`, `40bbc9c`, `0882ef0`, `54c912d`) verified present in `git log`. Every task's `<acceptance_criteria>` was re-run after the final commit; the plan-level `<verification>` block was executed in full and is tabulated above, including the live `scripts/phase1/tracer-e2e.sh` run against Caido 0.57.1.
