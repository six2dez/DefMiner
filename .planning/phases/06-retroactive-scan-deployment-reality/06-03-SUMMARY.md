---
phase: 06-retroactive-scan-deployment-reality
plan: 03
subsystem: scan
tags: [backpressure, thresholds, telemetry, sqlite, caido-sdk, backfill]

requires:
  - phase: 06-retroactive-scan-deployment-reality
    provides: "06-01's `runScanProducer`, the `scans` table, `composeScanFilter` and the `ScanStatusPayload` field set; 06-02's measured O-07 verdict; 06-04's `validateOperatorClause` and the HTTPQL static gate the producer composes through"
  - phase: 01-skeleton-persistence-compatibility
    provides: "`hooks/admit.ts`'s five-axis gate and closed `REJECT_REASONS`, `engine/queue.ts`'s drop-oldest `BoundedQueue`, `engine/yield.ts`'s one yield primitive, `telemetry.ts`'s single counters object, and `ingest/consumer.ts`'s draining-flag + yield-per-iteration idiom"
provides:
  - "`SCAN_BACKPRESSURE_WATERMARK` — derived from `QUEUE_CAP - EVENTS_DELIVERED_UNDER_BLOCK - SCAN_PAGE_SIZE`, with its inequality asserted and its latency residual named in the source"
  - "`POLICY_DERIVED_FROM.SCAN_BACKPRESSURE_WATERMARK`"
  - "`counters.retro` — the retro sub-map inside the one counters object, over the shipped `REJECT_REASONS`"
  - "`counters.reloadOverSize` — declared for plan 06-06's reload-side size gate"
  - "The watermark-gated multi-page producer: skip-done read, descending walk, yield per page, re-entrancy flag"
  - "`isHeldAtWatermark()` — the real value behind `ScanStatusPayload.heldAtWatermark`"
  - "`FINISHED_ANALYSIS_STATE` — the derived skip state, exported from `scan/scans.ts`"
  - "`packages/backend/src/scan/producer.spec.ts` — the producer's own spec file"
affects: [06-05 lifecycle transitions and the getScanStatus projection, 06-06 retro counters and the reload size gate, 06-07 deployment matrix, 06-09 per-page progress emit, 06-12 scan status readout]

actuals:
  tokens: 33941
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "A statement's arity COUNTED from its own literal text and asserted at import, so the constant cannot drift from the text it describes"
    - "A bounded per-page IN-list with a documented pad value, replacing a per-item read"
    - "A flat outcome record rather than a discriminated union, when every stop reason still has to carry the counters"
    - "A gate widened to the invariant it enforces, with the failing path executed through the gate's own pure core rather than a copy of its walk"

key-files:
  created:
    - packages/backend/src/scan/producer.spec.ts
  modified:
    - packages/engine/src/thresholds.ts
    - packages/engine/src/thresholds.spec.ts
    - packages/backend/src/telemetry.ts
    - packages/backend/src/telemetry.spec.ts
    - packages/backend/src/scan/producer.ts
    - packages/backend/src/scan/scans.ts
    - packages/backend/src/scan/scans.spec.ts

key-decisions:
  - "`SCAN_BACKPRESSURE_WATERMARK` is computed from three named identifiers and asserted as an INEQUALITY; the literal 1528 appears nowhere in source or spec"
  - "The watermark's LATENCY residual is stated in the source at the constant and carried forward as an open window, rather than closed with a number projected from `RSS_BYTES_PER_INPUT_BYTE`"
  - "`counters.retro` is built INSIDE `createCounters()`, so `resetTelemetryForTest()` zeroes it in place and the AST scan still finds one counters object"
  - "`heldAtWatermark` is producer MODULE STATE with an out-of-band reader, because `getScanStatus` is a different call and the hold cannot be derived from outside the backend"
  - "D-03's skip-done read replaced `scans.ts`'s per-item `isRequestFinished`, which was DELETED rather than left as a second way to ask the same question"
  - "`ScanProducerOutcome` became a flat record: a union drops the counters on the `held` path, which is the common shape of a long backfill"

patterns-established:
  - "Import-time arity assertion derived by counting placeholders in the statement literal, not by writing the count out"
  - "The pad value for an unused bind slot documented AT the pad, with its safety executed as a spec case rather than argued in a comment"
  - "Watermark-hold as a WAIT that returns: yield, re-check, and report the hold rather than spinning inside the call"

requirements-completed: []

coverage:
  - id: D1
    description: "`SCAN_BACKPRESSURE_WATERMARK` is derived from `QUEUE_CAP`, `EVENTS_DELIVERED_UNDER_BLOCK` and `SCAN_PAGE_SIZE`, asserted as an inequality over named constants and never against a literal"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the backpressure watermark leaves room for a full measured burst on top of a full page"
        status: pass
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the backpressure watermark is strictly inside the queue"
        status: pass
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#POLICY_DERIVED_FROM names the three constants the watermark hangs off"
        status: pass
      - kind: manual_procedural
        ref: "QUEUE_CAP temporarily lowered to 500 -> 'the backpressure watermark is strictly inside the queue' FAILED (2 failed / 42 passed); restored, 44 passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "Retro admissions, rejections and skips are counted separately from live ones over the SAME closed `REJECT_REASONS` vocabulary, in ONE counters object with two sub-maps"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#keys its reject counters on EXACTLY the shipped reason set"
        status: pass
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#moves independently of the live counters, in both directions"
        status: pass
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#is zeroed by resetTelemetryForTest() without that function naming a member"
        status: pass
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#finds a counter-shaped object literal only in telemetry.ts, and only inside createCounters()"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#counts admissions, rejections and skips into counters.retro alone"
        status: pass
    human_judgment: false
  - id: D3
    description: "The producer offers a page only while queue depth is STRICTLY below the watermark; at the watermark and above it issues no query and reports the hold"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#offers a page while depth is STRICTLY below the watermark"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#issues NO query at exactly the watermark, and reports the hold"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#issues NO query ABOVE the watermark either"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#resumes on its own the moment depth falls back below, with no operator action"
        status: pass
    human_judgment: false
  - id: D4
    description: "A backfill running at the watermark cannot displace a live entry: a full page plus a full measured live burst fits with zero drops and the oldest live entry still at the head"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#cannot displace a live entry: a full measured burst still fits on top of a full page"
        status: pass
    human_judgment: false
  - id: D5
    description: "`heldAtWatermark` carries a real value, readable out of band by a later `getScanStatus` call rather than only on the walk's return"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#issues NO query at exactly the watermark, and reports the hold (asserts isHeldAtWatermark() === true)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#resumes on its own the moment depth falls back below, with no operator action (asserts isHeldAtWatermark() === false)"
        status: pass
    human_judgment: true
    rationale: "The VALUE is real and proven. Its journey to the operator is not: `getScanStatus` in `index.ts` still projects an unconditional `false`, because `index.ts` and `api/spec.ts` are named in 06-05-PLAN.md's `files_modified` and 06-05 owns that projection. Until 06-05 lands, no surface can render `Waiting for the analysis queue`. Recorded as an open window."
  - id: D6
    description: "The skip-done read is ONE bounded statement per page, binding every id of that page positionally, returning only ids whose artifact has a terminal `done` analysis; `partial` and `failed` are re-offered"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#issues exactly one skip-done read per page, whatever the page contains"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#binds EXACTLY SCAN_PAGE_SIZE request ids, padding a short page"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#the empty-string pad cannot silence a real item"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#skips only FINISHED work — a partial or failed analysis is RE-OFFERED"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#does not skip another project's finished analysis"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sql-discipline.spec.ts#packages/backend/src/scan/producer.ts passes every SQL-discipline rule"
        status: pass
      - kind: manual_procedural
        ref: "project_id removed from the skip-done subquery -> sql-discipline.spec.ts reported `unscoped-subquery` against packages/backend/src/scan/producer.ts by name; restored, 44 passed"
        status: pass
    human_judgment: false
  - id: D7
    description: "Caido's scope engine is applied to every retroactive item with no override, because `admit()` is called unchanged"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#applies Caido's OWN scope with no override (D-07)"
        status: pass
    human_judgment: false
  - id: D8
    description: "The walk is descending and resumes strictly below the last-walked request, with the position taken from the item's capture time"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#orders DESCENDING on the request id — a unique integer, so no two items tie (D-12)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#resumes STRICTLY BELOW the last walked request — no overlap and no gap"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#takes the position from the ITEM's capture time, never from the clock"
        status: pass
    human_judgment: false
  - id: D9
    description: "The producer yields once per page and carries a re-entrancy flag, so a long serial backfill cannot be entered twice and cannot hold the QuickJS thread across pages"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#awaits a yield once per page — four pages, four yields"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#refuses a SECOND concurrent entry, and that entry transfers no page"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#clears the re-entrancy flag on the FAILING path too"
        status: pass
    human_judgment: false
  - id: D10
    description: "A zero-item page, or `hasNextPage: false`, ends the walk as a COMPLETED scan rather than an error"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#treats a ZERO-ITEM page as a completed scan, and advances nothing"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#treats `hasNextPage: false` as a completed scan"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#walks EVERY page of a multi-page range and accumulates across them"
        status: pass
    human_judgment: false
  - id: D11
    description: "`producer.ts` holds no local copy of the page size or the watermark; both are imported identifiers"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#imports the page size and the watermark instead of writing them out"
        status: pass
    human_judgment: false
  - id: D12
    description: "A real backfill against a live Caido holds at the watermark, resumes when the consumer drains, and costs the operator no live entry over a multi-hour walk"
    verification: []
    human_judgment: true
    rationale: "Every layer is unit-proven against the sqlite fixture, the real `BoundedQueue`, the real `admit()` and a literal SDK stub — but the SDK stub is a shape, not a runtime, and the producer still has no caller in the shipped build. That Caido's real `sdk.requests.query()` paginates this way under `descending(\"req\",\"id\")`, and that the consumer actually drains fast enough for the hold to be brief, has never run against a live instance. Plans 06-10 and 06-11 are where this becomes measured. The LATENCY half of the watermark is a stated residual and is not proven by anything here."

duration: 22 min
completed: 2026-08-31
status: complete
---

# Phase 6 Plan 03: The Backpressure Watermark and the Sustained Backfill Summary

**A retroactive scan can now run for hours without costing the operator a single live entry: it holds at a watermark derived from the only burst anyone has measured, reloads nothing it has already finished, repairs what it failed, yields between pages, and counts itself separately from live proxying.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-08-31T17:04Z
- **Completed:** 2026-08-31T17:26Z
- **Tasks:** 3 of 3 (all `tdd="true"` — six commits, RED then GREEN per task)
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- **The watermark is a defended derivation, not a number.** `SCAN_BACKPRESSURE_WATERMARK = QUEUE_CAP − EVENTS_DELIVERED_UNDER_BLOCK − SCAN_PAGE_SIZE`, computed from three identifiers in the `RETENTION_SWEEP_MAX_ROWS` idiom. The literal `1528` appears nowhere in source or spec: `thresholds.spec.ts` asserts the *inequality* (`WATERMARK + burst + page ≤ QUEUE_CAP`), asserts the watermark is strictly inside the queue, and asserts `POLICY_DERIVED_FROM` names the three constants by reference. Lowering `QUEUE_CAP` to 500 was executed and turned the new case red.

- **The residual is named in the source rather than closed with a projection.** The paragraph above the constant states, in the file somebody would edit, that this is a **drop-safety** bound and says nothing about **latency** — at `TOKENIZER_MS_PER_MB` a full `PASSIVE_MAX_BYTES` artifact takes ~6.3 s and the consumer is strictly serial, so a queue standing at the watermark can be a long backlog with nothing dropped. It names the measurement that would close it (a median artifact size over real stored traffic; SPIKE-06's ladder was four sizes over a corpus of two) and explicitly refuses to reuse `RSS_BYTES_PER_INPUT_BYTE` as a latency proxy.

- **The property the whole design exists for is executed, not argued.** `producer.spec.ts`'s headline case fills a real `BoundedQueue` to one below the watermark with **live** entries, lets the producer add a full page on top, then delivers a full `EVENTS_DELIVERED_UNDER_BLOCK` burst — and asserts `overflowCount === 0`, `counters.queueOverflow === 0`, and that `live-0` is *still at the head*. Drop-oldest never fires. That is the claim the watermark exists to make and it is now a test rather than a paragraph.

- **`heldAtWatermark` has a real value.** The producer sets module state when it withholds and clears it when it resumes, exposed through `isHeldAtWatermark()` — module state and not merely a return value, because `getScanStatus` is a *different call* that does not hold the walk's outcome, and from outside the backend a watermark hold and a blocked QuickJS thread look identical.

- **D-03: one bounded read per page replaces one read per item.** At twenty items a page that is 2,000 indexed round trips for a 40,000-request backfill instead of 40,000. A complete literal, positional binds, `project_id` first in the outer `WHERE` **and** inside the subquery, short pages padded with the empty string — and the placeholder count is *counted from the statement's own text* and asserted at import against `SCAN_PAGE_SIZE`, so it cannot drift from the literal it describes.

- **Retro and live attribution are separate over one vocabulary.** `counters.retro` — `pagesWalked`, `seen`, `admitted`, `skippedDone`, `queued`, `reloadNoResponse` and a `rejected` map built by calling the *shipped* `zeroedRejectCounters(REJECT_REASONS)` again — lives inside `createCounters()`, so `resetTelemetryForTest()` zeroes it with no edit and the AST scan still finds one counters object. `counters.reloadOverSize` is declared for 06-06.

- **The loop mirrors `consumer.ts` exactly where it should.** A module-level `walking` flag checked before the first `await`; `await yieldToLoop()` after every page *including the last*, so N pages yield N times; and the flag cleared in a `finally`, because every exit from the walk is a `return` and the first `execute()` that threw would otherwise leave the producer permanently busy.

## Task Commits

1. **Task 1: The backpressure watermark** — `c5180dd` (test, RED: 3 failed) then `3198766` (feat, GREEN: 44 passed).
2. **Task 2: Retro counters as a second sub-map** — `43b4c6d` (test, RED: 7 failed) then `f20638b` (feat, GREEN: 62 passed).
3. **Task 3: The multi-page producer** — `4f76b5b` (test, RED: typecheck exit 2 against the intended API) then `5b2357e` (feat, GREEN: 116 passed in `scan/`).

**Plan metadata:** see the `docs(06-03)` commit that carries this file.

## Files Created/Modified

**Created**

- `packages/backend/src/scan/producer.spec.ts` — 30 cases over the walk, the watermark, the skip-done read, the loop and the attribution split, plus the source assertion that no tunable is written out. Carries the note explaining why the producer left `scans.spec.ts`.

**Modified**

- `packages/engine/src/thresholds.ts` — `SCAN_BACKPRESSURE_WATERMARK`, its derivation, its residual, and its `POLICY_DERIVED_FROM` entry with the one policy-input exception recorded.
- `packages/engine/src/thresholds.spec.ts` — three cases in gate 3.
- `packages/backend/src/telemetry.ts` — the `RetroCounters` type, `counters.retro` inside `createCounters()`, `counters.reloadOverSize`, the deep-copying `slimStatus()` projection, and the header paragraph stating why the split exists and what D-02 costs.
- `packages/backend/src/telemetry.spec.ts` — the retro contract, the `slimStatus` projection cases, two widened gates and a pure `scanSource(file, src)` core with three synthetic fixtures.
- `packages/backend/src/scan/producer.ts` — the watermark gate, `heldAtWatermark`, `SKIP_DONE_SQL` and its counted arity assertion, the page loop, the yield, the re-entrancy flag, the flat outcome record.
- `packages/backend/src/scan/scans.ts` — `isRequestFinished` and its statement removed (superseded); `FINISHED_ANALYSIS_STATE` exported.
- `packages/backend/src/scan/scans.spec.ts` — the producer describe block removed, header and footer notes recording the move.

## Decisions Made

1. **`ScanProducerOutcome` became a flat record rather than a discriminated union.** The tracer's union was right for one page: every call either walked or did not. A loop breaks that — a walk that covered nine pages and *then* held is the common shape of a long backfill, and a union forces the `held` arm to drop the counters describing those nine pages. `stop` now says why the call ended; the counters describe the call. Nothing consumed the old shape (the producer had no caller), so this cost no migration.

2. **The hold is a WAIT that returns, not a spin.** At or above the watermark the producer sets the flag, yields once, and re-checks. If the depth fell, it resumes inside the same call with no operator action. If it did not, it returns `stop: "held"` rather than spinning. One yield is this runtime's minimum slice (~5.03 ms median); a consumer that moved nothing in that window is busy with a large artifact, and holding the call open would turn a reportable state into an invisible one. Every return is a natural resume point.

3. **`heldAtWatermark` is module state, not only an outcome field.** Justified in the code at the declaration: the reader is a different call. This is also why 06-01 was right to ship the payload field early — its later *absence* would have collapsed a healthy hold into the stall marker.

4. **The skip-done read stayed a scalar subquery rather than becoming a JOIN,** despite the plan's wording. `sql-discipline.spec.ts` decomposes a statement into arms and asks each one separately about `project_id`; a JOIN whose scoping lived only in the outer `WHERE` is a cross-project read one edit away. This is 06-01's decision 4, inherited deliberately rather than re-litigated — and it was verified by mutation: removing `project_id` from the subquery made the gate report `unscoped-subquery` against `producer.ts` by name.

5. **The statement's arity is COUNTED from its own text, not written out.** `store/retry.ts`'s idiom writes the placeholder count as a literal; here that literal would have been the page size, which the plan prohibits in this module. Counting `?` in the literal (in a loop — no pattern, `REDOS_RECOVERY = "kill"`) and subtracting the four fixed binds gives the same import-time failure with no copy of a tunable. The fixed-bind count *is* written out, because it is a property of the statement text rather than a tunable.

6. **A no-response item gets its own counter and is neither admitted nor rejected.** The tracer counted it as `rejected`, which was defensible when there were four buckets to explain. `admit.ts`'s reason union is closed and describes a **response**; there is none here to describe. `counters.retro.reloadNoResponse` carries it, and the durable `rejected` column no longer absorbs a shape that does not fit it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `scans.ts` and `scans.spec.ts` were edited, and neither is in this plan's `files_modified`**

- **Found during:** Task 3.
- **Issue:** D-03 replaces the per-item skip read with one per-page read. That makes `scans.ts`'s `isRequestFinished` dead, and `knip` reports a dead export as an **error** (`"exports": "error"`, `ignoreExportsUsedInFile: false`) — so leaving it would have failed the plan's own `<verify>`. Separately, `scans.spec.ts` held the `runScanProducer` describe block, whose fakes could not survive the producer becoming a loop (`fakeQuerySdk` returned the same page for ever, so a loop over it would not terminate).
- **Fix:** `isRequestFinished` and `IS_REQUEST_FINISHED_SQL` deleted rather than left as a second way to ask the same question — two readers drift, and the one nobody calls stops being right without anything failing. The derivation it hung off stays in `scans.ts` and is now exported as `FINISHED_ANALYSIS_STATE`, so the producer binds it instead of re-deriving it. The producer cases moved to `producer.spec.ts`, with a note at both ends recording why they were together and why they parted.
- **Files modified:** `packages/backend/src/scan/scans.ts`, `packages/backend/src/scan/scans.spec.ts`
- **Verification:** `pnpm knip` exit 0; `pnpm vitest run packages/backend/src/scan` — 116 passed.
- **Committed in:** `5b2357e`
- **Note for later plans:** 06-05 and 06-06 both name `scans.ts` in their own `files_modified` and will see this.

**2. [Rule 3 — Blocking] `telemetry.spec.ts`'s payload rule failed a nested sub-map for being an object**

- **Found during:** Task 2 (GREEN).
- **Issue:** "carries only numbers besides the one error string" filtered container paths by a hand-listed set (`$`, `$.counters`, `$.counters.rejected`) and then flagged everything non-numeric. `counters.retro` and `counters.retro.rejected` are containers, so the first nested sub-map anyone added failed a gate about **payloads** for the crime of being an object. The rule was always about the leaves.
- **Fix:** containers are now filtered by **shape** (`value !== null && typeof value === "object"`), with a non-vacuity assertion that the leaf walk still finds more than twenty values, so the shape filter cannot silently eat its own subject. The hand-list is gone and cannot drift again.
- **Files modified:** `packages/backend/src/telemetry.spec.ts`
- **Verification:** `pnpm vitest run packages/backend/src/telemetry.spec.ts` — 62 passed.
- **Committed in:** `f20638b`

**3. [Rule 3 — Blocking] The AST counters gate counted to one, which refused the shape D-02 mandates**

- **Found during:** Task 2 (GREEN).
- **Issue:** "finds a counter-shaped object literal only in telemetry.ts" asserted `literals.length === 1`. The retro sub-map is itself a literal carrying three canonical counter keys (`admitted`, `reloadNoResponse`, `rejected`), so the count went to two. This is 06-01's deviation 1 again in a different file: a gate narrower than the invariant it enforces. Worse, the count was also *weaker* than it looked — it permitted a genuine second object anywhere inside `telemetry.ts`.
- **Fix:** the rule the count stood in for is now stated directly and is strictly stronger — **every** counter-shaped literal in the package is in `telemetry.ts` **and** inside `createCounters()`. That is what makes `resetTelemetryForTest()` total over every counter that exists, which is the property the count was protecting by proxy. `scanFile` was split into a pure `scanSource(file, src)` (the `sql-discipline.spec.ts` doctrine), the existing synthetic fixture now runs **through the gate** instead of through a re-implementation of its walk, and the new rule got a firing fixture and a legal one.
- **Files modified:** `packages/backend/src/telemetry.spec.ts`
- **Verification:** `pnpm vitest run packages/backend/src/telemetry.spec.ts` — 62 passed, including the two new fixtures.
- **Committed in:** `f20638b`

**4. [Rule 1 — Bug] A new spec assertion cried wolf on `slice(0, 200)`**

- **Found during:** Task 3 (GREEN).
- **Issue:** the "no local copy of a tunable number" case searched `producer.ts` for the **substring** `"20"` and found it inside `describeError(e).slice(0, 200)`. The code was correct; the assertion was wrong, and a gate that cries wolf is a gate somebody deletes.
- **Fix:** a `numericTokens()` helper extracts maximal digit runs, so the check is about whole numbers written in the file rather than about substrings. A non-vacuity assertion confirms the tokeniser still finds the numbers that *are* legitimately there.
- **Files modified:** `packages/backend/src/scan/producer.spec.ts`
- **Verification:** `pnpm vitest run packages/backend/src/scan` — 116 passed.
- **Committed in:** `5b2357e`

**5. [Rule 3 — Blocking] `@typescript-eslint/no-unnecessary-type-assertion` rejected the recording-db cast in a return position**

- **Found during:** Task 3 (GREEN).
- **Issue:** `return { … } as unknown as Database` in a function whose declared return type is `Database` is reported as an unnecessary assertion, but removing it fails `tsc` (`Property 'exec' is missing`). The two gates disagreed about the same line.
- **Fix:** assigned to a local first, which is exactly the shape `sqlite-fixture.ts` already uses for the same cast and the same reason.
- **Files modified:** `packages/backend/src/scan/producer.spec.ts`
- **Verification:** `pnpm lint` exit 0, `pnpm typecheck` exit 0.
- **Committed in:** `5b2357e`

---

**Total deviations:** 5 auto-fixed (1 × Rule 1, 4 × Rule 3).
**Impact on plan:** No scope creep and no architectural change. Deviation 1 is the only one that touched a file outside `files_modified`, and it was forced by D-03's own consequence plus a gate that treats dead code as an error; both edits are deletions and one export. Deviations 2 and 3 widened shipped gates to the invariants they enforce, both ending strictly stronger than before. Deviations 4 and 5 are a bad new assertion and two linters disagreeing about one cast.

## Known Stubs

| Stub | File | Reason and owner |
|---|---|---|
| `getScanStatus` still reports `heldAtWatermark: false` | `packages/backend/src/index.ts` | The producer now computes the real value and exposes `isHeldAtWatermark()`; the **projection** is 06-05's, which names `index.ts` and `api/spec.ts` in its `files_modified` and owns the `getScanStatus` payload. Wiring it here would have shipped a half-owned endpoint the way 06-04 declined to (WINDOWS 71). **Plan 06-05.** |
| `runScanProducer` still has no caller | `packages/backend/src/scan/producer.ts` | The loop WINDOWS 67 named now exists; the **driver** does not. `startScan` inserts the row and returns, and the driver lives in `index.ts`. Entry 67 is half discharged. **Plan 06-05.** |
| `analysed: null` | `packages/backend/src/index.ts` | Untouched. There is no `analysed` column and the number belongs to the consumer; `0` would lie. **Plan 06-06** (WINDOWS 65). |

All three, plus the watermark's latency residual and both file-scope deviations, are recorded in `.planning/WINDOWS.md` (entries 73–77).

## Out of scope, and stated because the executor brief asked for it

**D-08 — a row-cap eviction during a running scan suspends it, an age-bound eviction does not — is NOT in this plan.** It belongs to `store/retention.ts` and `scan/scans.ts`, neither of which this plan's `files_modified` covers, and **06-06-PLAN.md** carries it as an explicit `must_haves.truths` entry beside `rowCapDeleted`. Implementing it here would have needed the retention sweep's shape, the widened `audit` `kind` CHECK and its rebuild migration — all three of which are 06-06's, and none of which exist yet. Nothing in 06-03 blocks it.

## Threat Flags

None. Every file touched sits inside a trust boundary the plan's `<threat_model>` names, and every `mitigate` disposition has an implementation and a test:

| Threat | Where it landed |
|---|---|
| T-06-13 (DoS, producer → queue) | The strict depth-below-watermark gate, the derived inequality in `thresholds.spec.ts`, and the executed "cannot displace a live entry" case asserting `counters.queueOverflow === 0`. |
| T-06-14 (DoS, the QuickJS thread) | `await yieldToLoop()` per page — spied on `setTimeout(fn, 0)` itself, because SPIKE-02 measured `setImmediate` and `Promise.resolve()` scoring identically to no yield — plus the re-entrancy flag and its `finally`. |
| T-06-15 (EoP, retro admission) | `admit()` called unchanged; one case drives `inScope: () => false` and asserts `counters.retro.rejected.out_of_scope`. |
| T-06-16 (disclosure, skip-done read) | A complete literal, positional binds, `project_id` in both arms; `sql-discipline.spec.ts` names `producer.ts` and was mutation-tested to prove it fires. |
| T-06-17 (repudiation, live telemetry) | `counters.retro` as a separate sub-map, with independence asserted in both directions and the live counters asserted unmoved after a walk. |
| T-06-18 (tampering, size axis) | Recorded in the module header: the query-side `admit()` is a filter, the authoritative gate is the reload, and `counters.reloadOverSize` is declared for 06-06. 06-02's verdict is cited by artifact path, not restated. |
| T-06-SC (supply chain) | No package installed; `pnpm-lock.yaml` untouched. |

## Issues Encountered

None beyond the five documented deviations. Both RED runs failed exactly as intended, and Task 3's RED was a typecheck failure against the intended API rather than a test failure — the honest shape when the contract being added is a type.

## User Setup Required

None — no external service configuration, no environment variable, no package installed.

## Next Phase Readiness

**Ready.** Every later plan expands a layer this one proved:

- **06-05** wires `getScanStatus` to `isHeldAtWatermark()`, drives `runScanProducer` from `index.ts`, and owns the `completed` transition this plan reports into (`stop: "completed"`). It will also see `scans.ts` without `isRequestFinished` and with `FINISHED_ANALYSIS_STATE`.
- **06-06** increments `counters.reloadOverSize` at the reload and fills `analysed`; both are declared. D-08 is entirely its own.
- **06-09** adds the per-page progress emit after the position advance, guarded by the same epoch check, and will find `heldAtWatermark` already real.
- **06-12** reads `heldAtWatermark` from the payload as the presentation word that outranks the stall marker.

**Carried obligations:**

1. **The watermark's LATENCY residual is open and deliberately unclosed** (WINDOWS 75). It needs a median artifact size over a real project's stored traffic. No number was projected.
2. **The producer has still never run against a live Caido** — coverage entry D12. The SDK stub is a shape and the fixture is single-connection. 06-10 and 06-11 are where this becomes evidence. This also means WINDOWS 68's note — that 06-02 could not measure through the real producer — is **not yet** discharged: the loop exists but nothing drives it, so the O-07 measurement is still not repeatable through the shipped path. 06-05 is what makes it so.
3. **`heldAtWatermark` does not reach any surface yet.** The value is real; the projection is 06-05's.

**Concerns:** none blocking. The thing a reviewer should look at first is deviation 3 — the AST gate rewrite — because it is the one place a shipped safety gate changed shape rather than merely gaining a case.

## Self-Check: PASSED

**Files claimed — all present on disk:**

- FOUND: `packages/engine/src/thresholds.ts`
- FOUND: `packages/engine/src/thresholds.spec.ts`
- FOUND: `packages/backend/src/scan/producer.ts`
- FOUND: `packages/backend/src/scan/producer.spec.ts`
- FOUND: `packages/backend/src/telemetry.ts`
- FOUND: `packages/backend/src/telemetry.spec.ts`
- FOUND: `packages/backend/src/scan/scans.ts`

**Commits claimed — all six in `git log`:**

- FOUND: `c5180dd`, `3198766`, `43b4c6d`, `f20638b`, `4f76b5b`, `5b2357e`

**Plan `<verification>` re-run at close-out:**

- `pnpm test` — **64 files, 2460 passed** (baseline 2433; +27)
- `pnpm typecheck` — exit 0
- `pnpm lint` — exit 0
- `pnpm knip` — exit 0 (17 tag hints, no error)
- `pnpm build` — plugin package built successfully
- `pnpm check:bundle` — 1 import specifier (`crypto`), unchanged
- `pnpm check:css` — 118 rules checked against `#plugin--defminer`
- `pnpm check:externals` — 1 bare specifier (`vue`), externals honoured
- `pnpm vitest run packages/engine/src/thresholds.spec.ts` — 44 passed, the watermark inequality asserted from imported constants
- `counters.queueOverflow` stays at zero across the simulated sustained walk — asserted in `producer.spec.ts`'s "cannot displace a live entry" case
