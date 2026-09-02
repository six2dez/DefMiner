---
phase: 07-sourcemap-reconstruction
plan: 05
subsystem: api
tags:
  [sourcemap, consumer, retention, convergence, closed-vocabulary, telemetry, depth-bound]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "the single-consumer drain loop with its four store call sites, the CORE-09 epoch idiom and its five stillCurrent() re-check sites, the ONE counters object and its AST gate, recordSlice/finishAnalysis's PAIRED-WITH-THE-WRITE argument, STORE-06's sweep cadence and the convergence inequality this plan restates, ROWS_INSERTED_PER_ARTIFACT_MAX, admit.ts's REJECT_REASONS closed-vocabulary idiom"
  - phase: 06-retroactive-scan-deployment-reality
    provides: "scan/filter.ts's OPERATOR_CLAUSE_REJECTIONS — the SECOND closed rejection vocabulary and the precedent this plan's third one copies — with filter.spec.ts's mechanical every-reason-has-a-case gate; the authoritative reload-side size gate's counter-log-return refusal shape; 06-11's push-down superset proof"
  - phase: 07-sourcemap-reconstruction
    provides: "plan 07-01's MAP_MAX_BYTES, SOURCEMAP_TAIL_WINDOW_BYTES, SOURCE_ROWS_PER_MAP_MAX and the D-10 probe artifact map-bytes.json; plan 07-02's findAnnouncement / decodeInlineMap / parseSourceMap and the MAP_PARSE_REASONS vocabulary; plan 07-03's D-17 codec ban and D-12 sources-sink gate, both of which walk this plan's files unchanged; plan 07-04's migration v8, upsertRecoveredSource / recordSighting and SOURCES_LABEL_MAX"
provides:
  - "D-08's reconstruction stage, wired into analyseAndFinish between the walk and finishAnalysis, always on and with no toggle"
  - "counters.sourcemap — the second sub-map of the ONE counters object, with mapRefused DERIVED from MAP_PARSE_REASONS and derivedRejected DERIVED from DERIVED_REJECT_REASONS"
  - "packages/backend/src/sourcemap/derive.ts — O-05's sibling vocabulary DERIVED_REJECT_REASONS, DERIVED_SOURCE_MAX_BYTES, DERIVED_MAX_DEPTH, admitDerived and admitDerivedDepth"
  - "D-11's first non-null writer of analyses.error from the consumer path, as a namespaced DefMiner-authored reason code"
  - "the restated convergence inequality RETENTION_SWEEP_MAX_ROWS >= RETENTION_SWEEP_EVERY_N, and a sweep interval that counts ROWS"
  - "ROWS_INSERTED_PER_ARTIFACT_MAX demoted to a documentation constant, with the demotion asserted mechanically"
  - "snapshotCounters() — slimStatus's projection derived rather than hand-listed, so a sub-map nobody re-listed is copied and not aliased"
affects:
  [07-06, 07-07, 07-08, 07-09, 07-10, phase-03-detectors, phase-08-external-maps]

actuals:
  tokens: 32166
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A THIRD closed refusal vocabulary as a SIBLING of REJECT_REASONS, with the four-part argument for not extending admission written as the argument rather than as a label"
    - "Namespacing a reason code at the point it is written into a shared column, as a substitute for the distinct-column-name mechanism contract.ts names"
    - "A crossing test (delta >= interval) rather than a landing test (count % interval === 0) wherever a counter can advance by more than one"
    - "A derived deep copy for an RPC projection, so a sub-map added later is snapshotted rather than aliased"
    - "A test-only detector injected through a dep, so a bound is proven over a path that actually ran"

key-files:
  created:
    - packages/backend/src/sourcemap/derive.ts
    - packages/backend/src/sourcemap/derive.spec.ts
    - .planning/phases/07-sourcemap-reconstruction/deferred-items.md
  modified:
    - packages/backend/src/ingest/consumer.ts
    - packages/backend/src/ingest/consumer.spec.ts
    - packages/backend/src/telemetry.ts
    - packages/backend/src/telemetry.spec.ts
    - packages/engine/src/thresholds.ts
    - packages/engine/src/thresholds.spec.ts
    - packages/engine/package.json

key-decisions:
  - "D-08's stage lands in analyseAndFinish AFTER walk() returns and BEFORE finishAnalysis, not at the visit seam: visit is (window) => void, synchronous, and every write in the stage is awaited. D-08's intent is preserved in full; only the insertion point differs from a literal reading."
  - "O-05's sibling vocabulary is a THIRD closed list, not an extension of REJECT_REASONS. Extending admission would force a lying case in admit.spec.ts's every-reason gate, put a derived reason in the ADMISSION counters, and land a member inside 06-11's push-down superset proof that the proof says nothing about."
  - "DERIVED_SOURCE_MAX_BYTES = MAP_MAX_BYTES, stated as an equality rather than a number: a recovered source cannot exceed the map that carried it, and the probe's sources_materialise curve (2.3975 ms/MB, ~6.0 ms at the ceiling against a 25 ms slice) says no tighter bound is owed."
  - "The depth bound is TWO gates over ONE vocabulary — admitDerivedDepth answers 'may this stage run' and admitDerived answers 'may this source enter'. Folding them would mean handing the depth question a fabricated source."
  - "Pitfall 2's fix changes PHASE 1 MACHINERY: processedForSweep advances by ROWS, and thresholds.spec.ts's convergence assertion is restated as RETENTION_SWEEP_MAX_ROWS >= RETENTION_SWEEP_EVERY_N. Both alternatives were evaluated and both fail by construction."
  - "The sweep-due test became a CROSSING test. A counter advancing by 203 lands on no multiple of 128 ever, so the shipped modulo form would have scheduled the cadence pass NEVER — the rows fix would have made convergence worse than the bug it repairs."
  - "analyses.error codes are NAMESPACED at the point of writing (map:<reason>), because two vocabularies share the literal members too_large and empty and there is only one error column."

patterns-established:
  - "Sibling vocabulary per subject: the repo's rule is one vocabulary per subject, not one vocabulary. derive.ts is the twelfth and says so."
  - "Demotion made mechanical: a constant kept as documentation carries an assertion proving nothing reads it any more."
  - "Both directions watched: four RED demonstrations plus one negative demonstration, each RUN with its message recorded."

requirements-completed: [MAP-01, MAP-02, MAP-06]

coverage:
  - id: D1
    description: "D-08's reconstruction stage runs on every admitted bundle, inside analyseAndFinish, after walk() and before finishAnalysis — and not inside the visit callback"
    requirement: MAP-01
    verification:
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#calls reconstruct AFTER `walk(` and BEFORE `finishAnalysis(`, inside analyseAndFinish"
        status: pass
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#no `visit` callback awaits or writes — the stage did not move into one"
        status: pass
    human_judgment: false
  - id: D2
    description: "One admitted bundle carrying an inline map produces N sources rows and N source_sightings rows through the real consumer, finishing `done` with a null error"
    requirement: MAP-02
    verification:
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#writes exactly N sources and N sightings for a map declaring N sources"
        status: pass
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#finishes `done` with a NULL error — a recovered map is not a degradation"
        status: pass
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#counts a source seen through two bundles ONCE in `sources` and TWICE in sightings"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-03: an external announcement increments a counter and nothing else — zero rows, no URL at rest, no outbound request"
    requirement: MAP-01
    verification:
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#writes ZERO rows, finishes `done`, and increments announcedExternal once"
        status: pass
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#issues no outbound request — the fake SDK has no surface that could"
        status: pass
    human_judgment: false
  - id: D4
    description: "MAP-06's three empty outcomes stay distinguishable: no announcement, a map with no sourcesContent, and a refused map with a namespaced reason code in analyses.error"
    requirement: MAP-06
    verification:
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#MAP-06's three EMPTY outcomes stay distinguishable (4 cases)"
        status: pass
    human_judgment: false
  - id: D5
    description: "CORE-10: max_slice_ms is the maximum over BOTH stages, and the column and the in-memory maximum take the same number"
    verification:
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#the column and the in-memory maximum take the SAME number"
        status: pass
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#reports the RECONSTRUCTION stretch when it dominates the walk's"
        status: pass
    human_judgment: false
  - id: D6
    description: "O-05's sibling vocabulary DERIVED_REJECT_REASONS with a mechanical every-reason-has-a-case gate, admit.ts byte-unchanged"
    verification:
      - kind: unit
        ref: "packages/backend/src/sourcemap/derive.spec.ts#the table exercises exactly the members of DERIVED_REJECT_REASONS"
        status: pass
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#consumer.ts never calls admit() on the derived path"
        status: pass
      - kind: other
        ref: "git diff --exit-code -- packages/backend/src/hooks/admit.ts"
        status: pass
    human_judgment: false
  - id: D7
    description: "D-13's depth-1 bound with no re-entry, proven by a test-only detector that observes the recovered source's bytes reaching a walk"
    requirement: MAP-06
    verification:
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#recovers the outer sources, refuses the inner announcement, and is SEEN doing it"
        status: pass
    human_judgment: false
  - id: D8
    description: "Pitfall 2: the retention interval counts rows, the inequality is restated as RETENTION_SWEEP_MAX_ROWS >= RETENTION_SWEEP_EVERY_N, and ROWS_INSERTED_PER_ARTIFACT_MAX is demoted with the demotion asserted"
    verification:
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the retention sweep CONVERGES against worst-case ingest"
        status: pass
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the convergence check no longer READS ROWS_INSERTED_PER_ARTIFACT_MAX"
        status: pass
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#the sweep FIRES — once at start, then once per RETENTION_SWEEP_EVERY_N rows"
        status: pass
    human_judgment: false
  - id: D9
    description: "The A8 backstop: whether RETENTION_SWEEP_MAX_ROWS's COST half still holds under the new, more frequent cadence"
    verification:
      - kind: manual_procedural
        ref: "scratch a8-measure.spec.ts, both cadences, recorded in this SUMMARY under 'A8 — the cost half, measured'"
        status: pass
    human_judgment: true
    rationale: "The measurement was taken and the numbers are recorded, but 'does the cost half still hold' is a judgement about acceptable proxy latency on a single-threaded runtime, not a threshold a test can assert. It also surfaced a coverage gap (deferred item D1) that an operator should see before the phase is called done."

duration: 37 min
completed: 2026-09-02
status: complete
---

# Phase 7 Plan 05: Wiring reconstruction into the pipeline Summary

**D-08's reconstruction stage lands in `analyseAndFinish` between the walk and the finish — with a
sibling refusal vocabulary that leaves `admit()` untouched, a depth-1 bound proven by a detector that
runs, and a retention interval that counts rows so the sweep bounds the database again under D-09.**

## Performance

- **Duration:** 37 min
- **Started:** 2026-09-01T23:46:00Z
- **Completed:** 2026-09-02T00:23:00Z
- **Tasks:** 3
- **Files modified:** 9 (7 modified, 2 created; plus `deferred-items.md`)

## Accomplishments

- **The stage is wired and always on.** One admitted bundle carrying an inline map produces `sources`
  and `source_sightings` rows through the *running* consumer over the real store modules and the real
  migration — nothing about the parse, the store or the schema is mocked. Removing the stage does not
  make the suite pass with fewer rows; it fails.
- **The placement is asserted, not described.** `consumer.spec.ts` parses `consumer.ts` and compares
  three call offsets *scoped to `analyseAndFinish`*, and separately checks that no `visit` callback in
  the file awaits or writes.
- **A third closed refusal vocabulary exists with the argument for it written down.** `admit.ts` is
  byte-unchanged and `admit.spec.ts` passes unaltered.
- **D-13's depth bound is wired now and proven by a path that ran.** A test-only `visitDerived`
  detector observes the recovered source's bytes reaching a walk, so the four depth assertions are not
  equally satisfied by a bound over a path nobody executes.
- **The retention sweep bounds the database again.** Four map-bearing artifacts inserting 812 rows now
  sweep four times where the old interval swept once.
- **Two latent defects were found and fixed on the way** — both documented below as deviations, and
  both of the class where nothing fails.

## Task Commits

1. **Task 1 (TRACER): one admitted bundle, through the real consumer, to source rows** — `ab79ca6` (feat)
2. **Task 2: the sibling vocabulary, the derived path, and D-13's depth bound** — `1242035` (feat)
3. **Task 3: Pitfall 2 — the sweep counts rows, and the inequality is restated** — `3a88080` (fix)

Tracer feedback gate: `HUMAN_VERIFY_MODE` is `end-of-phase` and the tracer's `<verify>` carries only
`<automated>` entries, so both commands were re-run end to end after `ab79ca6` and passed before any
expansion task started.

## Files Created/Modified

- `packages/backend/src/sourcemap/derive.ts` — **created.** O-05's sibling vocabulary, D-14's derived
  entry point, D-13's depth constant, and the four-part argument for not extending `REJECT_REASONS`.
- `packages/backend/src/sourcemap/derive.spec.ts` — **created.** The every-reason-has-a-case gate, the
  boundary pair, and the overlap with `REJECT_REASONS` asserted rather than avoided.
- `packages/backend/src/ingest/consumer.ts` — the `reconstruct` stage, `ReconstructionInput`, the
  `visitDerived` seam, the row-counting sweep interval, the crossing test, and `mapRefusalCode`.
- `packages/backend/src/ingest/consumer.spec.ts` — the tracer proof, the placement assertions, D-03,
  the three MAP-06 empty outcomes, CORE-10 over two stages, the mid-stage project change, D-13's four
  properties, D-14's counter separation, and the Pitfall 2 sweep-fires case.
- `packages/backend/src/telemetry.ts` — the `sourcemap:` sub-map and `snapshotCounters()`.
- `packages/backend/src/telemetry.spec.ts` — key-set assertions over both new derived maps, the reset
  case, the projection case, and the "deep-copies a sub-map NOBODY re-listed" derivation.
- `packages/engine/src/thresholds.ts` — `ROWS_INSERTED_PER_ARTIFACT_MAX` demoted;
  `RETENTION_SWEEP_MAX_ROWS`'s convergence derivation restated.
- `packages/engine/src/thresholds.spec.ts` — the restated inequality, the mechanical demotion proof.
- `packages/engine/package.json` — `./sourcemap/announce` and `./sourcemap/parse` export entries.
- `.planning/phases/07-sourcemap-reconstruction/deferred-items.md` — **created.**

## The counter sub-map, as shipped

`counters.sourcemap`, a SUB-MAP of the one `counters` object exactly as `counters.retro` is:

| Member | What it counts |
|---|---|
| `announcedExternal` | D-03. Announcements naming a URL this phase does not fetch. |
| `announcedInline` | Announcements carrying a `data:application/json;base64,` payload. |
| `mapRefusedTooLarge` | Named roll-up of `mapRefused.too_large`. |
| `mapMalformed` | Named roll-up of every non-size refusal. |
| `mapRefused` | `Record<MapParseReason, number>` — DERIVED from the engine's frozen array by the shipped `zeroedRejectCounters`. |
| `sourcesRecovered` | Rows written to `sources`. |
| `sightingsRecorded` | Rows written to `source_sightings`. |
| `derivedRejected` | `Record<DerivedRejectReason, number>` — DERIVED from `DERIVED_REJECT_REASONS`. |

The plan named `mapRefusedTooLarge` and `mapMalformed` "at minimum". Both ship, **and so does the
per-reason `mapRefused` map**, because without it seven of the eight parse reasons collapse into
`mapMalformed` and an operator cannot tell a nesting bomb from a truncated payload. All three are
incremented from ONE site (`noteMapRefusal`), so the roll-ups cannot drift from the map they roll up.

## `DERIVED_SOURCE_MAX_BYTES`, with its derivation

**Value: `MAP_MAX_BYTES` (2,621,440 bytes), stated as an equality rather than as a literal.**

Two terms, and the second is what makes the first sufficient:

1. **A single recovered source cannot exceed the map that carried it.** Every byte of
   `sourcesContent[i]` is a byte of the decoded map document, and the document is refused above
   `MAP_MAX_BYTES` before it is parsed. Any smaller number here would be a second, tighter policy that
   nothing measured.
2. **The probe says no tighter bound is owed.** `sources_materialise` measured 2.3975 ms/MB across the
   D-10 ladder — the *cheapest* of the five operations
   [`results/map-bytes.json`, `derivation.op_ms_per_mb`]. At `MAP_MAX_BYTES` (2.5 MiB) materialising
   one source of that size costs **~6.0 ms** against a `MAX_SYNC_SLICE_MS` of 25, so the stall
   argument that binds `MAP_MAX_BYTES` does not bind again here.

Declared in `derive.ts` and not in `thresholds.ts`, because it is a property of one entry point rather
than project policy: there is no measurement that answers "how big may a recovered source be" as a
project question. `derive.spec.ts` asserts the RELATION, so a re-run ladder cannot leave it behind.

## The four RED demonstrations, RUN with their messages

Each was produced by a scratch edit, observed, and reverted; the suite was green again afterwards.

**1. The second-counters-object AST scan.** Added `packages/backend/src/scratch-second-counters.ts`
with three canonical counter keys.

> `a counter-shaped object literal exists outside telemetry.ts. Two objects means one is written and
> never read while the other is read and never written, and slimStatus() projects the empty one.:
> expected [ Array(1) ] to deeply equal []` — received
> `[ "packages/backend/src/scratch-second-counters.ts" ]`

**2. The slice-number pairing.** Changed `finishAnalysis`'s `maxSliceMs` argument back to
`result.maxSliceMs` — the walk's number alone. Two cases went red:

> `analyses.max_slice_ms disagrees with the in-memory maximum getStatus() reports. They are taken one
> statement apart from the SAME expression precisely so they cannot drift.: expected
> 0.006791000000021086 to be 0.0542920000000322`

> `max_slice_ms carries the WALK's number alone. Reconstruction runs after the walk returns, so its
> stretch is invisible in that number — and CORE-10's whole claim is that this column is the TRUE
> maximum.: expected 3 to be greater than or equal to 500`

**3. The every-reason gate.** Added a fourth member `scratch_fourth_reason` to
`DERIVED_REJECT_REASONS` with no case.

> `these derived rejection reasons have no case in CASES: scratch_fourth_reason. A reason with no test
> is a code plan 07-08 renders for a refusal nobody has ever reproduced.: expected [
> 'scratch_fourth_reason' ] to deeply equal []`

**4. The restated inequality.** Set `RETENTION_SWEEP_EVERY_N = 600`, above `RETENTION_SWEEP_MAX_ROWS`.

> `RETENTION_SWEEP_MAX_ROWS (512) is below RETENTION_SWEEP_EVERY_N (600). Both are counted in ROWS:
> the interval is RETENTION_SWEEP_EVERY_N rows inserted, and the pass deletes at most
> RETENTION_SWEEP_MAX_ROWS. A sweep that deletes fewer rows per interval than the interval inserts
> bounds NOTHING: past the retention ceiling the database grows monotonically while the sweep runs
> exactly as designed (decision P1-D7, restated by plan 07-05 for D-09).: expected 512 to be greater
> than or equal to 600`

Green again after each revert (56 passed in `thresholds.spec.ts`, 70 in `telemetry.spec.ts`, 12 in
`derive.spec.ts`, 70 in `consumer.spec.ts`).

## The sweep-fires NEGATIVE demonstration, RUN

The positive case lives in the tree: four map-bearing artifacts × 100 recovered sources each = 812
rows, and the sweep fires **4** times.

The negative twin cannot live in the tree and be green at the same time, so it was run under a scratch
revert of `consumer.ts` to the shipped Phase 1 behaviour — `processedForSweep += 1` per iteration and
the modulo landing test:

> `1 sweeps after 4 map-bearing artifacts inserted 812 rows. With the interval counting ARTIFACTS this
> reads 1 — the start-up pass and nothing else — while the database grows monotonically past its
> ceiling.: expected 1 to be 4`

**The sweep did NOT fire at the cadence.** One start-up pass, then nothing, for the entire run.

## The convergence inequality, restated — and it reaches outside this phase

This is the debt the plan rated `costly`, and it is stated here in full rather than left in a commit
message.

**What was shipped in Phase 1.** `thresholds.spec.ts` asserted

```
RETENTION_SWEEP_MAX_ROWS  >=  ROWS_INSERTED_PER_ARTIFACT_MAX * RETENTION_SWEEP_EVERY_N
        512               >=              3 * 128 = 384
```

and it was correct, because `ingest/consumer.ts`'s interval advanced by ONE per row-inserting
iteration. "Artifacts per interval" times "rows per artifact" genuinely WAS "rows per interval".

**What D-09 does to it.** One artifact carrying monaco's real 781-source map inserts
`3 + 781 + 781 = 1,565` rows in a single consumer iteration — **521× the declared worst case**. With
the interval counting artifacts, 128 such artifacts insert roughly **200,000 rows between sweeps**
against a `DEFAULT_RETENTION_MAX_ROWS` of 50,000. The database grows monotonically while the sweep
runs exactly as designed, which is the precise failure the inequality exists to prevent.

**Both obvious repairs fail by construction, not by preference.**

- Raising `RETENTION_SWEEP_MAX_ROWS` to satisfy the old form needs `1,565 × 128 = 200,320`, which
  violates the shipped 1024-row cost cap **by 195×**.
- Lowering `RETENTION_SWEEP_EVERY_N` to satisfy it drives the interval **below 1**.
- A per-map row cap is the third option, and it is exactly what **D-09 rejected**.

**The fix, and it is a change to PHASE 1 MACHINERY.** `processedForSweep` now advances by the number
of rows actually inserted in the iteration, beside each write as it lands. The increment site keeps
its position — immediately after the write, before the project-change returns — because moving it
broke convergence once already and the shipped comment records that. What changed is the UNIT, and it
makes the counter match documentation that was already there: the shipped comment already said the
interval's right-hand side is *"rows inserted per sweep interval"*. It simply was not true.

**The restatement:**

```
RETENTION_SWEEP_MAX_ROWS  >=  RETENTION_SWEEP_EVERY_N
        512               >=            128            (4× headroom)
```

This holds **independently of how many rows any single artifact produces**, which is exactly the
property D-09 needs — delivered WITHOUT the per-map row cap D-09 rejected. The failure message keeps
the shipped sentence's force and adds the new terms.

**`ROWS_INSERTED_PER_ARTIFACT_MAX` is kept, demoted, and the demotion is mechanical.** It is not
deleted, because it is the record of what the old inequality meant; its doc comment carries the date
(2026-09-02) and this plan's id. `thresholds.spec.ts` reads its own source and asserts the convergence
case's body does not contain the identifier — with a non-vacuity check so the assertion is not passing
over an empty slice. A retained constant that something still reads is not demoted at all.

## A8 — the cost half, measured

The backstop the plan carries: a sweep that triggers more often on map-heavy traffic needs
`RETENTION_SWEEP_MAX_ROWS`'s COST half re-checked, not only its convergence half.

**The synthetic run,** stated so it can be re-run: 40 artifacts, each carrying an inline map with 100
recovered sources → **8,120 rows inserted** (`40 × (3 + 2×100)`). Driven through the real consumer
over the real migration by a scratch `a8-measure.spec.ts`, deleted after the numbers were taken.

**Run A — no backlog, retention ceiling 50,000** (the steady state):

| Cadence | Sweeps | Rows deleted | Elapsed |
|---|---|---|---|
| OLD (artifacts) | 1 | 0 | 174 ms |
| NEW (rows) | **40** | 0 | 185 ms |

**Run B — a 20,000-row aged backlog seeded, retention ceiling 100** (the cost case):

| Cadence | Sweeps | Rows deleted | Rows surviving | Elapsed |
|---|---|---|---|---|
| OLD (artifacts) | 1 | 512 | **27,608** | 196 ms |
| NEW (rows) | **40** | **20,000** | 8,120 | 781 ms |

**Does the cost half still hold? Yes — and the statement is narrower than "it is fine".**

The cost half's own words are that *one pass* must stay bounded so it does not starve ingest, capped
at 1024 by assertion. `RETENTION_SWEEP_MAX_ROWS` is unchanged at 512 and every pass in Run B deleted
at most that. What changed is FREQUENCY, and it is 40× on this workload — because at 203 rows per
artifact a single map-bearing bundle crosses the 128-row interval on its own, so map-heavy traffic
sweeps roughly once per artifact.

- **Idle cost (Run A): +11 ms over the whole run, ≈ 0.28 ms per artifact.** A no-op sweep is three
  bounded counts on a pooled connection.
- **Working cost (Run B): +585 ms to delete 19,488 more rows, ≈ 0.03 ms per deleted row.** Every
  delete is an *awaited* statement on a pooled worker-thread connection, so none of it enters
  `max_slice_ms` or blocks the QuickJS thread the way a synchronous loop would.
- Run B's surviving-row column is the convergence claim made visible: the old cadence leaves **27,608
  rows against a ceiling of 100**; the new one drains the backlog entirely in the same run.

**The finding this measurement surfaced, recorded rather than adjusted away:** `retentionDeleted` was
**0** in Run A even with the ceiling lowered, and the reason is that
`packages/backend/src/store/retention.ts` **does not sweep `sources` or `source_sightings` at all** —
`grep -n "sources" store/retention.ts` returns nothing, and `retentionCounts` reports five tables, none
of them the two migration v8 added. The cadence is now correct; the coverage is not. Logged as
deferred item **D1** with its reasoning, not fixed here: it is a new SQL surface in a file this plan
does not own, and choosing the eviction order for a content-addressed table with a sighting edge is a
design question (deviation Rule 4), not a wiring bug.

## The D-11 pre-emption paragraph (carried into 07-10)

**D-11 ships a slice of ERR-02/OBS-02 ahead of Phase 2, and the cost is accepted openly.** Phase 7 is
the first writer of a non-null `analyses.error` from the consumer path — Phase 1 always passed null —
and it reuses the ONE degradation vocabulary in the one place that already has it rather than
inventing a second. `scan_state = 'partial'` had exactly one producer until now, deadline expiry, and
reconstruction gives it more; `error` is the discriminator, and what goes in it is a DefMiner-authored
REASON CODE (`map:malformed_json`, `map:too_large`, …), never a caught exception's text.
`describeError` is the right function for a *diagnostic* and is deliberately not on this path.

**The cost, stated before anyone hits it.** One `scan_state` column cannot express *"reconstruction
failed but detection succeeded"*. Today that costs nothing, because no detector exists — Phase 3 has
not landed and `visit` is a no-op. The day it does, an artifact whose detectors ran cleanly and whose
map was refused will read `partial`, and an operator reading the Artifacts table will not be able to
tell that from an artifact whose walk hit the deadline without opening the `error` column. **Phase 3
inherits that knowingly.** The exit is already visible and is not being pre-built: either ERR-02
splits the state per stage, or the UI reads the `map:` prefix — which is why the codes are namespaced
at the point of writing rather than left bare.

Phase 6's D-11 made exactly this move and announced it in the same way; this is the second time, and
announcing it twice is cheaper than discovering it once. **Plan 07-10 carries this paragraph forward**
along with the D-03 `announcedExternal` counter, which is the measurement of how much of MAP-01 this
phase leaves on the table for Phase 8.

## Decisions Made

Beyond the `key-decisions` frontmatter:

- **The depth bound is two exported gates over one vocabulary.** `admitDerivedDepth(depth)` answers
  "may this stage run" and `admitDerived(source)` answers "may this source enter". The plan named only
  `admitDerived`; folding the depth question into it would mean handing it a fabricated source, which
  is the invented-answer problem `derive.ts`'s own header refuses.
- **A refused derived source writes no row and does not mark the map partial.** It costs a counter, a
  log and a `continue`, in the counter-log-return shape the authoritative size gate uses — and the
  sources beside it still land, because a refused source is not a refused map.
- **The derived walk shares the ARTIFACT's deadline.** A fresh deadline per recovered source would let
  a 781-source map buy itself 781 × `ARTIFACT_DEADLINE_MS`.
- **`decodeUtf8(bytes, { crossCheck: false })` in the stage.** The cross-check is a second full decode
  of a multi-megabyte target-controlled body inside the slice this stage shares with the walk, and it
  THROWS on divergence — turning a malformed body into a caught consumer error instead of a named
  refusal. ENC-01 is untouched: nothing derived from that string is persisted as an offset or a digest.
- **The `sweptSinceStart` start-up pass consumes the first rows of the interval.** No special case was
  added for it; one cadence test was given one more artifact instead, with the arithmetic stated.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `packages/engine/package.json` did not export the modules plan 07-02 created**

- **Found during:** Task 1, at the first import.
- **Issue:** `announce.ts` and `parse.ts` exist and are tested, but `exports` only listed
  `./sourcemap/map-fixture`. Every consumer outside the engine — including this plan's entire stage —
  could not import them.
- **Fix:** Added `"./sourcemap/announce"` and `"./sourcemap/parse"`, in the existing alphabetical order.
- **Verification:** `pnpm typecheck` clean; `telemetry.ts` and `consumer.ts` import both.
- **Committed in:** `ab79ca6`.

**2. [Rule 1 — Bug] `slimStatus()` aliased any counter sub-map nobody re-listed**

- **Found during:** Task 1, when the `telemetry.spec.ts` AST scan went red on the projection literal.
- **Issue:** Two problems in one place. Mechanically, `{ ...counters, rejected, retro, sourcemap }`
  reached three canonical counter keys and tripped the "every counter-shaped literal lives inside
  `createCounters()`" gate — a gate that was already one key away from firing. Substantively, the outer
  spread is SHALLOW, so a sub-map added later and not re-listed by hand is handed to the RPC as a
  **live alias into module state**: right numbers at the instant it is taken, then changing under the
  caller, with nothing failing anywhere. That is the same hand-maintained-parallel-list defect
  `zeroedRejectCounters` exists to refuse.
- **Fix:** Replaced the literal with a derived recursive deep copy, `snapshotCounters()`. Total over
  whatever the object holds — a fourth sub-map is snapshotted for free — which makes it the
  counterpart of `resetTelemetryForTest()`, whose totality comes from `createCounters()` for the same
  reason. The gate was NOT weakened and its threshold was NOT raised.
- **Verification:** New case *"deep-copies a sub-map NOBODY re-listed — the derivation, executed"*
  attaches a sub-map the function has never heard of, projects, mutates the live one, and asserts the
  projection did not move. The AST gate's RED path was re-run afterwards and still fires.
- **Committed in:** `ab79ca6`.

**3. [Rule 1 — Bug] The sweep-due modulo test becomes wrong the moment the counter advances by more than one**

- **Found during:** Task 3, while changing `processedForSweep` to count rows.
- **Issue:** The shipped test is `processedForSweep % RETENTION_SWEEP_EVERY_N === 0` — a LANDING test,
  exactly right for a counter that advances by one, because every boundary is landed on. A counter
  advancing by ROWS **steps over** boundaries: an iteration inserting 203 rows goes 203, 406, 609 and
  lands on no multiple of 128 ever. Left alone, the rows fix would have scheduled the cadence pass
  **never** on precisely the map-heavy traffic it was written to handle — strictly worse than the bug
  it repairs, and silent.
- **Fix:** Changed to a CROSSING test,
  `processedForSweep - lastSweptAtProcessedCount >= RETENTION_SWEEP_EVERY_N`, which fires on the first
  iteration at or past the interval whatever the step size. `lastSweptAtProcessedCount` initialises to
  0 rather than −1.
- **Verification:** The sweep-fires case would read 1 instead of 4 without it; the three existing
  cadence cases still pass with their new, stated arithmetic.
- **Committed in:** `3a88080`.

### Adjustments that are the plan's own instruction, recorded for the reader

Three shipped `consumer.spec.ts` cadence expectations changed because the interval's UNIT changed.
This is the declared Phase 1 change, not scope creep, and each carries the arithmetic in a comment:

- *"a single cadence crossing performs EXACTLY ONE pass"* — 2 → **3**. 128 artifacts × 3 rows = 384
  rows; passes at rows 3, 132 and 261. A per-iteration sweep would still be 128, which the case now
  also asserts against.
- *"does not repeat a cadence pass while early returns leave the write count stalled"* — 2 → **3**. The
  three early-returning reloads insert no rows and so advance the interval by nothing, which is the
  claim.
- *"still reaches the cadence when every iteration is abandoned AFTER a write"* — fed
  `RETENTION_SWEEP_EVERY_N + 1` artifacts instead of `RETENTION_SWEEP_EVERY_N`. Each abandoned
  iteration inserts exactly one row and the start-up pass consumes the first of them, so the interval
  needs one more to cross. Under artifact counting the two numbers coincided; under rows they do not.

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs).
**Impact on plan:** All three were necessary for correctness. Two were latent defects of the class
where nothing fails — an RPC handing out a live window into module state, and a sweep that would never
be scheduled — and both were found by doing the planned work rather than by looking for them. No scope
creep: `admit.ts` is byte-unchanged, `REJECT_REASONS` is untouched, `ROWS_INSERTED_PER_ARTIFACT_MAX`
survives, and `RETENTION_SWEEP_MAX_ROWS` / `RETENTION_SWEEP_EVERY_N` hold their shipped values.

## Issues Encountered

**1. One unreproduced full-suite failure, recorded rather than buried.** During Task 2's gate a single
full-suite run failed at `consumer.spec.ts > a claim nobody finished > is counted as STALE on the next
sighting, never as a cache hit` with `expected +0 to be 1`. It did not reproduce: **six** subsequent
full-suite runs and three isolated runs of that file were clean, and the final gate is green. The
failing case exercises `signal: { aborted: true }`, so `walk` throws before `reconstruct` is reached —
this plan's stage is not on that path. Recorded here because an unexplained flake that nobody writes
down is a flake nobody investigates.

**2. The retention coverage gap.** See "A8 — the cost half, measured" and `deferred-items.md` D1. Not
resolved here by design.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Ready for 07-06 onward.** The stage is wired, the counters exist and are on the RPC, the reason
  codes are namespaced and stable, and `DERIVED_REJECT_REASONS` is the closed list plan 07-08's viewer
  maps to operator copy.
- **07-10 owes two carries:** the D-11 pre-emption paragraph above, and the `announcedExternal`
  counter surfaced rather than left internal — it is the measurement of how much of MAP-01 this phase
  leaves for Phase 8. Open Question 2's expected outcome (a low recovered-source count on real
  traffic; zero of eight pinned production bundles carries an inline map) is owed to
  `07-VERIFICATION.md`.
- **One concern, not a blocker:** deferred item D1. The two tables this phase created are not swept.
  Retention is the only bound on this database, and until D1 is closed the bound has a hole in exactly
  the two tables D-09 fills fastest. It should be closed before the phase is verified.
- **Phase 3 inherits D-11's cost knowingly** — one `scan_state` cannot say "reconstruction failed but
  detection succeeded".

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-02*

**4. [Rule 1 — Bug] `requirements.mark-complete` reformatted a machine-owned derived block**

- **Found during:** the post-plan state update, caught by the final `pnpm test`.
- **Issue:** `.planning/REQUIREMENTS.md` carries a sentinel-delimited span that
  `outbound-prohibition.spec.ts` GENERATES and byte-compares — "the GENERATED text is authoritative
  and the shipped text is the defect". The SDK's markdown writer normalised that span while flipping
  the three MAP checkboxes, inserting blank lines after two headings inside it, and the byte
  comparison went red.
- **Fix:** Restored the derived span to its pre-write bytes and kept only the three intended checkbox
  flips. `git diff` against the pre-update file now shows exactly three changed lines.
- **Verification:** `packages/backend/src/outbound-prohibition.spec.ts` 465 passed; full suite green.
- **Committed in:** the state-metadata commit.

---

## Self-Check: PASSED

Files created verified present on disk: `packages/backend/src/sourcemap/derive.ts`,
`packages/backend/src/sourcemap/derive.spec.ts`, `deferred-items.md`, this file.
Commits verified in `git log`: `ab79ca6`, `1242035`, `3a88080`.
Plan-level verification re-run at close: `pnpm test` 3,765 passed / 81 files, `pnpm typecheck`,
`pnpm lint` and `pnpm knip` all clean.
