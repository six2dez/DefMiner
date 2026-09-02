---
phase: 07-sourcemap-reconstruction
plan: 13
subsystem: database
tags: [sqlite, retention, sourcemap, anti-join, benchmark, gap-closure]

requires:
  - phase: 07-sourcemap-reconstruction
    provides: "migration v9's four-column `source_sightings` key (plan 07-12), which every delete written here binds"
  - phase: 07-sourcemap-reconstruction
    provides: "the retired `2 *` factor in ROWS_INSERTED_PER_ITERATION_MAX (plan 07-14), so the convergence sentence written here names the shipped insert side"
  - phase: 07-sourcemap-reconstruction
    provides: "the row-counting retention cadence and the A8 measurement this benchmark re-derives (plan 07-05)"
provides:
  - "`sweepRetention` deletes from `source_sightings` and from `sources`, in the operator's CASCADE order: a source dies with its LAST sighting, by anti-join and never by a foreign key"
  - "`source_sightings` carries both ordinary retention bounds; `sources` inherits its ceiling through the anti-join"
  - "`retentionCounts` reports seven tables, so the bound on the two new ones can be shown rather than asserted"
  - "`a8-measure.spec.ts` — a committed benchmark that re-derives 07-05's A8 figures and asserts BOUNDS, never a timing"
  - "a linear `sources` anti-join on a schema with no index for it, measured at 1,600x the correlated form it replaced"
affects: [phase-08-external-maps, phase-11-soak, obs-01-health-surface]

actuals:
  tokens: 36864
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "A table whose ceiling is INHERITED through an edge rather than declared as a cap — `sources` takes no bound of its own and is still bounded, because a surviving source needs a surviving sighting"
    - "A scoped `NOT IN` with an explicit `IS NOT NULL` guard as the linear anti-join for a column no index leads on, where the correlated `NOT EXISTS` this file uses everywhere else is quadratic"
    - "A committed benchmark that PRINTS its wall clock and asserts only counts, row totals and booleans"

key-files:
  created:
    - packages/backend/src/a8-measure.spec.ts
  modified:
    - packages/backend/src/store/retention.ts
    - packages/backend/src/store/retention.spec.ts

key-decisions:
  - "`trimChildTable` was NOT generalised. `source_sightings` got its own bounded loop in `audit`'s and `scans`' shape, because a four-column key with an INTEGER member does not fit a three-element delete tuple over a two-member `secondKey` union, and widening it would be paid for by two tables that asked for nothing."
  - "`sources` takes NO bound of its own — no age bound, no row cap. Its ceiling is inherited: `count(sources) <= count(source_sightings) <= bounds.maxRows`. This is not a third exemption; it is a table bounded by an edge instead of by a cap."
  - "`RetentionSweepSummary` gained NO field. No caller branches on a sightings deletion the way `ingest/consumer.ts` branches on `rowCapDeleted`, and that is the bar the type's own docblock sets."
  - "The `sources` anti-join is a scoped `NOT IN`, not the correlated `NOT EXISTS` every other anti-join in the file uses, because it probes a column no shipped index leads on. Measured: 447 ms vs 1.5 ms at 4,000 rows per table, 11,069 ms vs 7.5 ms at 20,000."
  - "The A8 benchmark asserts bounds and prints timings. Run B's sweep count is asserted as a RANGE rather than the equality 07-05 recorded, because HI-04's multi-pass drain landed after that measurement and `retentionSweeps` counts passes."

patterns-established:
  - "Prefix-marking seeded fixture rows with a character OUTSIDE the hex digest alphabet, so a 'did the backlog drain' query cannot match the run's own content digests"
  - "An IDLE benchmark run costing 20x a WORKING one is a query-plan tell, not noise"

requirements-completed: [MAP-06]

coverage:
  - id: D1
    description: "An artifact evicted by retention leaves no `source_sightings` row naming it, and the sources only that bundle sighted go with it"
    requirement: "MAP-06"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#an artifact evicted by the row cap leaves NO sighting naming it, and its now-unsighted source goes too"
        status: pass
    human_judgment: false
  - id: D2
    description: "Content-addressed dedupe survives the sweep: a source sighted from two bundles outlives the eviction of either bundle alone"
    requirement: "MAP-06"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#a source sighted from TWO bundles OUTLIVES the eviction of one"
        status: pass
    human_judgment: false
  - id: D3
    description: "`source_sightings` carries both ordinary retention bounds, oldest first, de-duplicated across the two arms, and a backlog deeper than one pass is cleared by the multi-pass drain"
    requirement: "MAP-06"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#the AGE bound applies to sightings in their own right, and the cutoff is STRICT"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#the ROW bound is PER TABLE here too — the oldest sightings go first"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#a sighting eligible under BOTH bounds is deleted ONCE and counted once"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#a backlog DEEPER than one pass is cleared by the multi-pass drain"
        status: pass
    human_judgment: false
  - id: D4
    description: "T-07-71: a pass whose sightings work exhausts the budget deletes no `sources` row, and the deferred row goes on a later pass"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#a pass whose sightings work exhausts the budget deletes NO `sources` row"
        status: pass
    human_judgment: false
  - id: D5
    description: "`retentionCounts` reports `sources` and `source_sightings`, each equal to a direct COUNT(*)"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#`retentionCounts` reports both new tables, each equal to a direct COUNT(*)"
        status: pass
    human_judgment: false
  - id: D6
    description: "W-5 is restated where the convergence arithmetic lives, naming the finding and both tables, with no constant moved"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#the convergence docblock says what W-5 asked it to say"
        status: pass
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts (59 passed, file byte-unchanged)"
        status: pass
    human_judgment: false
  - id: D7
    description: "The `sources` anti-join cannot be silenced by a NULL `source_sha256`, and the statement keeps the linear LIST-SUBQUERY form"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#a sighting with a NULL `source_sha256` does not silence the anti-join"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#the statement is the LIST-SUBQUERY form, scoped on BOTH sides"
        status: pass
    human_judgment: false
  - id: D8
    description: "The A8 cost half is re-derivable at HEAD: a committed benchmark runs both of 07-05's runs and asserts bounds"
    verification:
      - kind: integration
        ref: "packages/backend/src/a8-measure.spec.ts (2 cases, 3 consecutive passing runs, identical counts)"
        status: pass
      - kind: other
        ref: "git ls-files -- packages/backend/src/a8-measure.spec.ts"
        status: pass
    human_judgment: false
  - id: D9
    description: "The A8 backstop's actual QUESTION — does RETENTION_SWEEP_MAX_ROWS's cost half still hold under the new cadence, and do this run's figures agree with 07-05's?"
    verification:
      - kind: manual_procedural
        ref: "the Run A / Run B table below, beside 07-05-SUMMARY.md's"
        status: pass
    human_judgment: true
    rationale: "The operator instructed that this benchmark assert bounds and NOT timings, so the cost question is deliberately left to a human reading two printed numbers. Three of the four figures moved for reasons named below, and whether those movements are acceptable is a judgement about proxy latency on a single-threaded runtime, not a threshold a test can hold."
  - id: D10
    description: "The anti-join's cost fix — the correlated form projected past a minute per call at the shipped 50,000 ceiling, on a call `workRemains` repeats every pass"
    verification:
      - kind: other
        ref: "scratchpad probe over the v8+v9 schema: 447/11,069 ms correlated vs 1.5/7.5 ms shipped, at 4,000 and 20,000 rows per table"
        status: pass
    human_judgment: true
    rationale: "The 1,600x figure is a MEASUREMENT and no committed test asserts it, by the same operator instruction that keeps timings out of the benchmark. What is committed is the statement-text guard against the correlated form returning. An operator should see the projection at the shipped ceiling and decide whether an index belongs in a future migration, which this plan is prohibited from adding."

duration: 26 min
completed: 2026-09-02
status: complete
---

# Phase 7 Plan 13: The cascade sweep and the committed A8 benchmark Summary

**`sources` and `source_sightings` are swept in the operator's CASCADE order — a source dies with its
last sighting, by anti-join and never by a foreign key — and the A8 cost measurement is a committed
benchmark that asserts bounds, which is also what caught the anti-join being quadratic.**

## Performance

- **Duration:** 26 min
- **Started:** 2026-09-02T12:26:09Z
- **Completed:** 2026-09-02T12:52:35Z
- **Tasks:** 3
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- **UAT gap 1 closed.** The two tables migration `v: 8` created now have a retention sweep. An
  evicted artifact takes its sightings with it; a source no surviving sighting names is deleted by
  an anti-join; a source two bundles saw outlives the loss of either.
- **`source_sightings` carries both ordinary bounds**, so a bundle that is never evicted cannot
  accumulate sightings for ever — the shape real traffic produces, since the artifact row is
  upserted on every re-serve while each map-bearing re-serve writes a fresh row per
  `(bundle, map, index)`.
- **W-5 resolved, and the code says where and why.** `MAX_ROWS_PER_PASS`'s docblock now records that
  the convergence inequality's insert side counts rows into two tables the delete side could not
  reach, so it held numerically while the property it claims did not. No constant moved.
- **UAT gap 2 closed.** `a8-measure.spec.ts` is in the tree, runs both of 07-05's runs, and asserts
  bounds only.
- **A quadratic anti-join found and fixed before it shipped** — the benchmark's idle run took 13.2 s
  against a working run of 0.7 s, which is the wrong way round.

## Task Commits

1. **Task 1 (tracer, TDD) — RED: the cascade's three failing cases** — `6a5e856` (test)
2. **Task 1 — GREEN: the cascade, in the operator's eviction order** — `48a63b0` (feat)
3. **Task 2 (TDD) — RED: both bounds on `source_sightings`, six failing cases** — `ef116d2` (test)
4. **Task 2 — GREEN: the two bounds, the ordering rule, and W-5 restated** — `994fa2c` (feat)
5. **Task 3 — the A8 benchmark, and the anti-join cost fix it caught** — `71278ad` (test)

**Plan metadata:** see the `docs(07-13)` commit that carries this file.

## Files Created/Modified

- `packages/backend/src/store/retention.ts` — `SIGHTINGS_OVER_AGE_SQL`, `SIGHTINGS_OLDEST_SQL`,
  `COUNT_SIGHTINGS_SQL`, `ORPHAN_SIGHTINGS_SQL`, `DELETE_SIGHTING_SQL`, `UNSIGHTED_SOURCES_SQL`,
  `COUNT_SOURCES_SQL`, `DELETE_SOURCE_SQL`; the cascade section inside `sweepRetention`; a
  four-element `DeleteParams` arm; `retentionCounts` and `workRemains` extended; the W-5 paragraph.
- `packages/backend/src/store/retention.spec.ts` — 12 new cases in three describe blocks, plus five
  seed/count helpers and the four `retentionCounts` shape assertions updated for the two new keys.
- `packages/backend/src/a8-measure.spec.ts` — NEW. The committed A8 benchmark.

## The `trimChildTable` decision, and its reason

**It was NOT generalised. `source_sightings` got its own bounded loop**, in the shape `audit` and
`scans` already use inside `sweepRetention`.

`ChildTableSpec` describes a table keyed on `(project_id, sha256, secondKey)` where `secondKey` is a
closed union of two literal column names, and it hands `remove` a three-element tuple of strings.
`source_sightings` is keyed on four columns since migration `v: 9` and its last member,
`source_index`, is an INTEGER — binding `"0"` where the row holds `0` matches nothing in SQLite,
which is precisely the silently-deleted-nothing shape `deleteOne` was rewritten to stop reporting as
success.

Generalising would have meant a variadic key, a variadic delete tuple and a `secondKey` union that
no longer describes anything, **for the benefit of one more caller, paid for by two tables that asked
for nothing.** The cost taken instead is that the age-arm-first ordering and the de-duplication are
written twice. `audit` and `scans` are already in the file for the same reason and in the same shape,
so this is the file's existing answer rather than a new one.

`RetentionSweepSummary` gained **no field**, against the bar its own docblock sets: a field is added
when a caller must BRANCH on the distinction. `ingest/consumer.ts` branches on `rowCapDeleted`
because a row-cap eviction during a backfill means the backfill is consuming itself; nothing branches
on a sightings deletion, and a number nobody branches on belongs in a log line.

## The RED observations, recorded

**Task 1** (`6a5e856`) — 3 failed | 41 passed in `retention.spec.ts`:

| Case | Observed | Expected |
|---|---|---|
| an artifact evicted by the row cap leaves NO sighting naming it | `sightingsNaming(evicted)` = **1** | 0 |
| a source sighted from TWO bundles OUTLIVES the eviction of one | `sightingsNaming(evicted)` = **1** | 0 |
| `retentionCounts` reports both new tables | `counts.sources` = **undefined** | 2 |

The `1` in the first two rows is the orphan a missing cascade leaves: the `artifacts` row was gone
and the sighting that named it was still there, which is migration `v: 8`'s absent foreign key made
visible.

**Task 2** (`ef116d2`) — 6 failed | 44 passed:

| Case | Observed | Expected |
|---|---|---|
| the AGE bound applies to sightings in their own right | `[0, 1, 2, 3]` | `[2, 3]` |
| the ROW bound is PER TABLE here too | `[0 … 9]` | `[7, 8, 9]` |
| eligible under BOTH bounds, deleted once | `[0 … 5]` | `[]` |
| a backlog DEEPER than one pass is cleared | **1,124** sightings | 10 |
| a pass whose sightings work exhausts the budget | **1** row deleted | 512 |
| the convergence docblock says what W-5 asked | docblock does not contain `W-5` | contains it |

The RED commits do not typecheck, and that is the RED condition rather than an oversight: Task 1's
third case reads `counts.sources`, a property `retentionCounts` did not yet have. `pnpm typecheck`
is green from the first GREEN commit onward.

## The dedupe-survives demonstration

The case that matters most here is *"a source sighted from TWO bundles OUTLIVES the eviction of
one"*, and it was demonstrated to be non-vacuous rather than asserted to be. With
`UNSIGHTED_SOURCES_SQL`'s anti-join arm temporarily stripped — leaving
`SELECT source_sha256 FROM sources WHERE project_id = ? ORDER BY … LIMIT ?`, i.e. a blind delete over
every source — the case printed:

```
AssertionError: the shared source was deleted with the FIRST bundle that lost it. …
  expected [] to deeply equal [ "5c00000000000000000000000000000000000000000000000000000000000000" ]
- [
-   "5c00000000000000000000000000000000000000000000000000000000000000",
- ]
```

The shared source was gone while the bundle still sighting it was untouched. The arm was restored
and the case is green. **This is the property the operator chose the anti-join for**, and it now
fails loudly if the anti-join is replaced.

## A8 — the figures, beside 07-05's

07-05's runs, re-run at HEAD by the committed benchmark. Elapsed is PRINTED and asserted on by
nothing; the two columns are not comparable across machines or days and are here only so a reader has
both.

**Run A — no backlog, retention ceiling 50,000 (the steady state):**

| | Sweeps | Rows deleted | Rows surviving | Elapsed |
|---|---|---|---|---|
| 07-05 (NEW cadence) | 40 | 0 | — | 185 ms |
| **07-13 at HEAD** | **40** | **0** | **8,120** | **296 / 342 / 329 ms** |

**Run B — 20,000-row aged backlog, retention ceiling 100 (the cost case):**

| | Sweeps | Rows deleted | Rows surviving | Elapsed |
|---|---|---|---|---|
| 07-05 (NEW cadence) | 40 | 20,000 | 8,120 | 781 ms |
| **07-13 at HEAD** | **77 passes** | **27,800** | **320** | **607 / 631 / 625 ms** |

**Do they agree? Run A does exactly. Run B's three count columns all moved, and every movement has a
named cause rather than an adjustment.**

1. **Sweeps 40 → 77.** `retentionSweeps` counts PASSES, and 07-REVIEW.md HI-04's multi-pass drain
   landed AFTER 07-05 took its measurement. The CROSSING count is still 40 — `counters.processed` is
   40 and each map-bearing artifact inserts 203 rows against a 128-row interval — but a crossing with
   a backlog now costs more than one pass. Run B's assertion is therefore the bound it became: at
   least one pass per crossing, at most `maxPasses` per crossing. **Run A is still an equality**,
   because with nothing eligible every crossing costs exactly one pass, and that is where the
   cadence property is asserted sharply.
2. **Deleted 20,000 → 27,800.** In 07-05 the sweep could not reach `sources` or `source_sightings`
   at all, so it deleted the seeded backlog and nothing else. It can now, and the run's own 8,120
   rows are subject to the ceiling of 100 like everything else: 20,000 backlog + 7,800 of the run's
   own = 27,800.
3. **Surviving 8,120 → 320.** The same cause read from the other side, and it is the closing of gap 1
   made numeric. Final counts: `artifacts 40, observations 40, analyses 40, audit 0, scans 0,`
   **`sources 100, source_sightings 100`** — the two new tables sitting exactly at the configured
   ceiling instead of holding all 4,000 rows the run put in them.
4. **Elapsed.** Run A rose (185 → ~320 ms) and Run B fell (781 → ~620 ms) while deleting 39% more
   rows. Different machine, different day, and this is exactly why the operator instructed that
   nothing be asserted about these two columns.

All three runs produced **identical counts**; only the elapsed figures varied, by roughly 5%.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The `sources` anti-join was quadratic, and would have been a target-controlled stall**

- **Found during:** Task 3, by the benchmark itself.
- **Issue:** Task 1 wrote `UNSIGHTED_SOURCES_SQL` as a correlated `NOT EXISTS`, matching every other
  anti-join in the file. Those probe `artifacts`, whose PRIMARY KEY is `(project_id, sha256)`, so the
  correlated probe is an index seek. This one probes `source_sightings` on `source_sha256`, and **no
  index in migration `v: 8` or `v: 9` leads on that column** — the PK is
  `(project_id, artifact_sha256, map_sha256, source_index)` and `idx_source_sightings_artifact` is
  `(project_id, artifact_sha256, source_index)`. So it scanned every sighting in the project once per
  `sources` row. Measured on the shipped schema, one call at `LIMIT 1024`:

  | rows per table | correlated `NOT EXISTS` | shipped `NOT IN` |
  |---|---|---|
  | 4,000 | 447 ms | 1.5 ms |
  | 20,000 | 11,069 ms | 7.5 ms |

  The growth is quadratic, so at the shipped `DEFAULT_RETENTION_MAX_ROWS` of 50,000 the correlated
  form projects **past a minute per call** — on a question `workRemains` asks again on every pass.
  That is the long uninterruptible stretch `RETENTION_SWEEP_MAX_ROWS`'s 1024-row cost cap exists to
  prevent, arriving through the query planner instead of through the row count, and it is reachable
  by a target that serves enough distinct sourcemapped modules. A `LEFT JOIN` was measured too and is
  worse (884 ms / 24,643 ms).
- **Fix:** a scoped `NOT IN`, which SQLite plans as a LIST SUBQUERY materialised once per statement
  and probed with a bloom filter. **No index and no schema change** — `migrations.ts` is
  byte-unchanged, as this plan requires. `AND source_sha256 IS NOT NULL` inside the subquery is
  load-bearing and is commented as such: the column is nullable by design (Pitfall 3 — a map index
  that shipped no content), and SQL's `NOT IN` over a list containing NULL is never true, so one such
  row anywhere in the project would silently make the statement return nothing for ever. That is a
  worse failure than the one being fixed, and it is target-triggerable.
- **Files modified:** `packages/backend/src/store/retention.ts`,
  `packages/backend/src/store/retention.spec.ts`
- **Verification:** three new cases — the NULL row does not silence the anti-join, a source its
  NULL-bearing neighbour does not name still survives, and the statement text is the LIST-SUBQUERY
  form scoped on both sides. `sql-discipline.spec.ts` green with the two-sided scoping. The
  benchmark's idle run went **13.2 s → 0.3 s**.
- **Committed in:** `71278ad`

**2. [Rule 1 - Bug] The benchmark's own backlog marker was a legal hex character**

- **Found during:** Task 3.
- **Issue:** Seeded backlog `sources` rows were marked with a leading `"e"` and the
  "did the backlog drain" query used `LIKE 'e%'`. Roughly one in sixteen of the run's OWN
  recovered-source digests starts with `e`, so the query matched three of the run's own rows and
  reported a drain failure that had not happened. Diagnosed by running the sweep to convergence
  afterwards: it converged in one further pass, deleted nothing, and the three rows stayed — which is
  the signature of a query fault, not a sweep fault.
- **Fix:** seeded rows are marked with `z` (sources) and `y` (artifacts), characters the hex digest
  alphabet cannot produce. Both columns CHECK length 64 and nothing else, so a non-hex marker is
  legal.
- **Files modified:** `packages/backend/src/a8-measure.spec.ts`
- **Committed in:** `71278ad`

---

**Total deviations:** 2 auto-fixed (2 bugs, both in this plan's own new code, both inside the scope
boundary).
**Impact on plan:** No scope creep. Deviation 1 is the reason the benchmark was worth building: it
found a defect in Task 1's own statement that no test in this plan would have caught, because the
plan correctly forbids asserting timings.

## Issues Encountered

- **`consumer.spec.ts` > "a claim nobody finished > is counted as STALE on the next sighting" failed
  once and has not reproduced.** It passed in isolation, passed 2/2 on the identical three-file
  command immediately afterwards, and passed in the full 90-file suite. It is not reachable from
  anything this plan changed — the case drives `runOnce(..., { signal: { aborted: true } })` and
  asserts the abort strands a `pending` analyses row, a path with no retention in it. Logged to
  `deferred-items.md` rather than chased: one non-reproducing failure is not enough to name a cause,
  and the file is outside this plan's scope boundary.
- **`vue-tsc` could not be run** to re-confirm verifier finding W-4's 6-error baseline —
  `pnpm exec vue-tsc` reports `Command "vue-tsc" not found`, and as 07-07 and 07-08 both recorded it
  is wired into no gate. This plan touches no frontend file, so the baseline cannot have grown.
  Recorded in `deferred-items.md`.

## Prohibitions — each checked, not assumed

| Prohibition | Check | Result |
|---|---|---|
| No FK, no `ON DELETE CASCADE` | the cascade is `ORPHAN_SIGHTINGS_SQL` + `UNSIGHTED_SOURCES_SQL`, both anti-joins | held |
| No change to `migrations.ts` | `git diff --stat packages/backend/src/store/migrations.ts` | prints nothing |
| No wall-clock timing assertion | `grep -nE 'expect\([^)]*elapsed' a8-measure.spec.ts` | no match |
| No change to the three sweep constants | `git diff packages/engine/src/thresholds.ts`; `thresholds.spec.ts` | prints nothing; 59 passed |
| No work on UAT gap 3 | `tests/frontend-load.spec.ts` untouched | held |
| No change to `.planning/REQUIREMENTS.md` | `git diff --stat` on it | prints nothing |

The W-2 class did NOT survive this plan, but it did recur: **two literal NUL bytes** were emitted
into the sightings de-duplication key while writing Task 2's GREEN, and were caught by the
pre-commit byte scan and re-spelled as escape sequences before the commit — the same escape the
neighbouring `trimChildTable` already uses. Every one of the three touched files plus this SUMMARY
was scanned for literal U+2028/U+2029/NUL/C0/C1/NBSP/BOM/zero-width bytes before each of the five
commits. Clean at every commit after the repair.

Worth recording for the next reader: the NUL bytes also made `grep -c 'W-5' retention.ts` print
**nothing at all** rather than a count, because grep treats a file containing NUL as binary. An
acceptance criterion expressed as a grep can be failed by an invisible byte three hundred lines away
from what it is asking about.

## REQUIREMENTS.md — not touched, and the gate agrees

`requirements.ready-ids` reports **`0/1 requirement(s) ready to mark complete`**: MAP-06 is declared
by seven plans in this phase and sibling 07-15 has no SUMMARY yet, so the shared-ID gate blocks it.
`requirements.mark-complete` was NOT run — this plan prohibits any change to that file, the gate
independently says the ID is not ready, and MAP-06 is already `[x]` on disk from an earlier plan.
The gate and the prohibition agree, which is the only case in which skipping the mutation is not a
judgement call. `outbound-prohibition.spec.ts` byte-compares a machine-owned span in that file and is
green; the file's sha256 is `c09e8dfc…4672467d`, unchanged.

## Gaps and findings closed

| Item | Source | Status | Commits |
|---|---|---|---|
| **UAT gap 1** | `07-UAT.md` test 2, severity major | CLOSED — the cascade sweep in the operator's eviction order | `48a63b0`, `994fa2c` |
| **W-5** | `07-VERIFICATION.md` finding W-5 | CLOSED — the inequality's insert side now counts rows the delete side can reach, said in the code at `MAX_ROWS_PER_PASS` | `994fa2c` |
| **D1** | `deferred-items.md` D1 (found by 07-05) | CLOSED — the design question was answered at UAT, this is its wiring | `48a63b0`, `994fa2c` |
| **UAT gap 2** | `07-UAT.md` test 3, severity minor | CLOSED — `a8-measure.spec.ts` is tracked and asserts bounds | `71278ad` |
| Backstop truth 11 | `07-VERIFICATION.md` (⚠️ ABSTAIN, `insufficient_spec`) | The harness exists again; the cost JUDGEMENT is routed to a human as coverage item D9 |  `71278ad` |

## Verification

- `pnpm vitest run` — **90 files, 4,293 tests, all passing.** Baseline at plan start was 89 files /
  4,279 tests; the delta is exactly the 14 cases added here.
- `pnpm typecheck && pnpm lint && pnpm knip` — all exit 0.
- `git diff --stat packages/backend/src/store/migrations.ts packages/engine/src/thresholds.ts .planning/REQUIREMENTS.md` — prints nothing.
- `git ls-files -- packages/backend/src/a8-measure.spec.ts` — prints the path.
- `packages/backend/src/a8-measure.spec.ts` — 3 consecutive passing runs on this machine, identical
  counts each time.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Ready for 07-15** (wave 4), which rewrites `consumer.spec.ts`. That file is RUN by this plan's
  verify blocks and NOT modified by it, exactly as the plan required; the ordering that keeps the two
  apart held.
- **One thing an operator should decide, and it is not this plan's to take.** The `sources` anti-join
  is linear because of how it is WRITTEN, not because the schema supports it. An index on
  `source_sightings (project_id, source_sha256)` would make the natural correlated form fast and
  would remove the `NOT IN` NULL hazard entirely — measured at 1.2 ms against the correlated form's
  504 ms at 4,000 rows. That is a migration, this plan is prohibited from writing one, and the
  operator approved exactly one schema change this round. Recorded as coverage item D10 so it is a
  decision rather than a discovery.
- **Phase 11's soak inherits a real bound.** W-5's note that "Phase 11 SC4's soak is about heap, not
  table rows" still stands, but the table-row half is now bounded and countable through
  `retentionCounts`' seven entries.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-02*

## Self-Check: PASSED

Every file named in `key-files` exists on disk (`[ -f ]`), and every commit hash named in
`## Task Commits` resolves in `git log --oneline --all`. All five task `<verify>` blocks and the
plan-level `<verification>` block were re-run at HEAD and are green; the four prohibition greps and
the two `git diff --stat` checks print exactly what the plan requires.
