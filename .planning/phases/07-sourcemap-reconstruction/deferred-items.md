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
