# Phase 07 — deferred items

Out-of-scope discoveries logged rather than fixed, per the executor's scope
boundary. Each names the file that owns it and the plan that found it.

---

## D1 — `store/retention.ts` does not sweep `sources` or `source_sightings`

**Found during:** plan 07-05, task 3, while taking the A8 measurement.
**Owner:** `packages/backend/src/store/retention.ts` (Phase 1 machinery, not in
07-05's `files_modified`).

`grep -n "sources" packages/backend/src/store/retention.ts` returns nothing, and
`retentionCounts` reports `artifacts`, `observations`, `analyses`, `audit` and
`scans` only. Migration v8 added two tables and the sweep does not know about
either.

Plan 07-04's decision text states the intended policy plainly — "one row per
recovered source under NORMAL retention caps, no exemption" — so this is an
unfinished wiring rather than a decision that went the other way.

**Why it matters here specifically.** Plan 07-05 changed the sweep interval to
count ROWS so that a map-bearing artifact's 1,565 rows advance the interval
honestly. That fix works: the A8 measurement shows the same synthetic run going
from 1 sweep to 40. But the extra sweeps delete from the three Phase 1 tables
only — the two tables whose row volume *caused* the extra firing are not swept at
all. The cadence is now correct; the coverage is not yet.

**Not fixed here** because it is a new SQL surface in a file this plan does not
own, and because deciding the eviction ORDER for a content-addressed table with a
sighting edge (delete a `sources` row whose last sighting went, or age it
independently?) is a design question, not a wiring bug. That is deviation Rule 4
territory.

**Suggested owner:** a Phase 7 follow-up plan, or the D-25 footprint readout,
which is where the operator will first see the two tables growing unbounded.

## From plan 07-07 (2026-09-02)

- **`pnpm --filter @defminer/frontend typecheck` (vue-tsc) reports 5 PRE-EXISTING errors** in
  `ExportDialog.vue:232` (`ExportChunkRequest.scopeSha256` missing at the call site) and
  `SettingsPanel.vue:430,446,461,481` (`FieldCopy` record indexed with the wider settings-key
  union). Neither file is touched by 07-07 and neither error is reachable from any 07-07 module.
  The repo gate is `pnpm typecheck` (`tsc --build`), which is green; `vue-tsc` is not wired into
  any script and is therefore not a gate today. Out of scope for this plan under the executor's
  scope boundary; recorded rather than fixed.

## From plan 07-08 (2026-09-02)

- **`formatTimestamp` is declared three times in the frontend.** Plan 07-08 needed a
  DefMiner-formatted date for the two producibility tombstone sentences and, rather than add a
  third private copy, exported one from `components/table-contract.ts`. The two PRE-EXISTING
  copies — `ArtifactsTable.vue:98` and `ObservationsTable.vue:68`, byte-identical one-liners —
  were NOT rewritten: they are outside this plan's `files_modified` and neither is reachable from
  any 07-08 module. Nothing new copies the line, so the duplication stopped growing here; three
  copies of a date format is still how one of them comes to disagree with the other two about a
  timezone. **Suggested owner:** any plan that already touches either table.

  **HALF DISCHARGED by plan 07-09 (2026-09-02).** `ArtifactsTable.vue` is in that plan's
  `files_modified` for the `Sources` column, so it is the plan the suggested owner names. Its
  private copy was deleted and it now imports `table-contract.ts`'s exported one; the two were
  byte-identical, and `FindingsTable.spec.ts`'s `Last seen` assertions cover the result.
  `ObservationsTable.vue`'s copy REMAINS — that file is outside 07-09's scope and is not reachable
  from any 07-09 module. **Remaining owner:** any plan that touches `ObservationsTable.vue`. Two
  copies left, down from three.

- **`pnpm --filter @defminer/frontend typecheck` (vue-tsc) still reports the 5 PRE-EXISTING
  errors 07-07 recorded**, in `ExportDialog.vue` and `SettingsPanel.vue`. 07-08 adds none: its
  three new modules are clean under `tsc --build`, which is the repo gate and is green. Unchanged
  and still out of scope.

## From plan 07-13 (2026-09-02)

- **D1 is CLOSED by this plan.** `store/retention.ts` now sweeps both tables in the
  eviction order the operator chose at UAT — `source_sightings` by the two ordinary
  bounds plus the artifact cascade, `sources` by an anti-join — and `retentionCounts`
  reports both. The design question D1 declined to answer was answered by the operator,
  not by the executor. Commits `48a63b0` (cascade), `994fa2c` (both bounds), `71278ad`
  (the benchmark, and the anti-join's cost fix).

- **`consumer.spec.ts` > "a claim nobody finished > is counted as STALE on the next
  sighting, never as a cache hit" FAILED ONCE in a three-file run and has not
  reproduced.** Passed in isolation, passed 2/2 on the same three-file command
  immediately after, and passed in the full 90-file suite. It is NOT reachable from
  anything 07-13 changed: the case drives `runOnce(..., { signal: { aborted: true } })`
  and asserts the abort strands a `pending` analyses row, a path with no retention in
  it. The shape is the same class UAT test 6 recorded for
  `tests/frontend-load.spec.ts` — a race whose verdict moves with machine load — and
  this one is a race between the abort check and the walk rather than a frame budget.
  Recorded rather than chased: out of this plan's scope boundary, and one
  non-reproducing failure is not enough to name a cause.
  **Suggested owner:** any plan that touches `ingest/consumer.ts`'s cancellation path.

- **`vue-tsc` could not be run to re-confirm verifier finding W-4's 6-error baseline.**
  `pnpm exec vue-tsc` reports `Command "vue-tsc" not found`; the package is not
  installed in this workspace and, as 07-07 and 07-08 both recorded, it is wired into
  no gate. 07-13 touches no frontend file — its three changed files are all under
  `packages/backend/src` — so the baseline cannot have grown. Unchanged and still out
  of scope.

## From 07-21 (2026-09-02)

- **`.planning/REQUIREMENTS.md:842` (MAP-05) says "the 39-entry hostile corpus in `map-fixture.ts`".** That figure matched neither corpus arithmetic BEFORE this plan (`HOSTILE_MAP_CASES` 13 + `SOURCES_LABEL_CASES` 23 + `sizeBoundaryCases` 2 = 38) and is out of `07-21-PLAN.md`'s `files_modified`, so it was NOT edited here. Recorded rather than fixed: it is a pre-existing prose figure, not drift this plan introduced. Whoever reconciles it should decide which arrays the sentence means before changing the number — that is the actual ambiguity.
