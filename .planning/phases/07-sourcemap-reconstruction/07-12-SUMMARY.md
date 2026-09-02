---
phase: 07-sourcemap-reconstruction
plan: 12
subsystem: database
tags: [sqlite, migration, primary-key, sourcemap, telemetry, w-3, hi-03]

requires:
  - phase: 07-sourcemap-reconstruction
    provides: "07-11's widened single-sighting statements — SIGHTING_ORIGIN_SQL and MARK_PRODUCIBILITY_SQL already bind all four key columns, so no commit here can make either a multi-match"
  - phase: 07-sourcemap-reconstruction
    provides: "07-04's step v8 source_sightings / sources pair, and the fourth one-way EXPECTED_TABLES approval this plan's fifth is recorded beside"
provides:
  - "Migration `v: 9` — `source_sightings` PRIMARY KEY `(project_id, artifact_sha256, map_sha256, source_index)`"
  - "`SCHEMA_VERSION` 9, by derivation from the last step"
  - "The fifth one-way `EXPECTED_TABLES` approval, recorded with what the operator was shown"
  - "A committed regression proving both bundles of a duplicated map report a non-zero Sources count"
  - "Three executed re-runnability demonstrations for step v9, plus a row-preservation case"
  - "The interim attribution guard and `sightingsDiscardedOtherArtifact` removed, with every comment that anticipated their retirement rewritten"
affects: [07-13, 07-15, 07-16, sourcemap-reconstruction, retention, telemetry]

actuals:
  tokens: 132792
  tasks: 4
  commits: 6

tech-stack:
  added: []
  patterns:
    - "A key widening ships as a v7-shaped table rebuild whose safety is re-runnability, never atomicity: three interruption states are EXECUTED against a real migrated fixture rather than argued in the step's JSDoc"
    - "A one-way approval that changes a KEY rather than a table set is recorded in the same comment as the table approvals, and says so, so a later reader does not scan the array for a member that was never added"
    - "A counter that can no longer be non-zero is REMOVED and its absence asserted, never pinned at zero"

key-files:
  created: []
  modified:
    - packages/backend/src/store/migrations.ts
    - packages/backend/src/store/migrations.spec.ts
    - packages/backend/src/store/schema.spec.ts
    - packages/backend/src/store/sources.ts
    - packages/backend/src/store/sources.spec.ts
    - packages/backend/src/ingest/consumer.ts
    - packages/backend/src/ingest/consumer.spec.ts
    - packages/backend/src/telemetry.ts
    - packages/backend/src/telemetry.spec.ts

key-decisions:
  - "Option A approved by the operator on 2026-09-02 at a `blocking-human` checkpoint: the four-column key, migration v9 as a v7-shaped rebuild, EXPECTED_TABLES byte-unchanged at eight members, and the interim guard and its counter removed in the same plan."
  - "The decision was written into 07-12-SUMMARY.md and COMMITTED before the first byte of migrations.ts changed, because Task 1's first acceptance criterion requires exactly that ordering. That is why this plan has six commits for four tasks."
  - "The closing drift paragraph in EXPECTED_TABLES's doc comment was extended rather than left stale. It claimed the approval count is rewritten in the same commit as the ARRAY; the fifth event is the first where the array did not move, so the rule's scope was corrected to the EVENT it counts."
  - "`widerKeyFixture()` was deleted rather than adapted. 07-11 built it as a tripwire that would turn red the day the shipped key widened; `migratedFixture()` now ships the wider key, so the two-bundle pair is built on the real table and the scaffolding has nothing left to do."
  - "The consumer's `changes === 0` branch became `storeErrors` rather than being deleted. Under the four-column key a conflicting upsert always updates, so the branch is unreachable by any traffic pattern — but a statement that neither inserts nor updates is a store anomaly, and deleting the branch would have made it invisible."

patterns-established:
  - "Measure the RED against the tree that had the defect: when a fix lands in an earlier task of the same plan, restore the two source files at the pre-fix commit with a file-scoped `git checkout <sha> -- <paths>`, take the observation, and restore. No stash, no branch."
  - "Assert a removed member ABSENT in the spec that pins the shape, so the removal is a gate rather than a tolerated diff."

requirements-completed: [MAP-06, MAP-07, UI-05]

coverage:
  - id: D1
    description: "Two bundles carrying a byte-identical map each keep their own recovered-source evidence: each artifact's drill-down returns its own N rows and countRecoveredSourcesByArtifact reports N for BOTH, never 0 for one"
    requirement: MAP-06
    verification:
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#gives a SECOND bundle carrying the same map its OWN recovered-source evidence"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#answers each bundle's drill-down with that bundle's OWN rows, and neither with a zero"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#gives BOTH bundles their own row when they carry the same map"
        status: pass
    human_judgment: false
  - id: D2
    description: "Migration v9 converges from every state its own interruption can leave behind, and loses no row"
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#the rebuild carries EVERY sighting across, in every project, with every column intact"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#step v9 recovers a database interrupted AFTER the drop — the ladder still advances"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#step v9 recovers a database interrupted BEFORE the drop — both names present"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#step v9 is re-runnable AFTER it fully applied — a re-entry must not drop the evidence"
        status: pass
    human_judgment: false
  - id: D3
    description: "Step v9's six statements are asserted in the one order that makes them safe, positionally rather than by trusting the JSDoc"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#step v9's SIX statements run in the ONE order that makes them safe"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#a RENAME's target name is DROPPED earlier in the same step"
        status: pass
    human_judgment: false
  - id: D4
    description: "SCHEMA_VERSION evaluates to 9 without being restated, and EXPECTED_TABLES still holds exactly eight members under five named approvals"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#the ladder head is step v9 — the version bump IS the appended entry"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts#exactly the tables the operator approved, and no others"
        status: pass
      - kind: other
        ref: "grep -v comments migrations.ts | grep -c 'SCHEMA_VERSION = 9' returns 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "The interim attribution guard and sightingsDiscardedOtherArtifact are gone, and their absence is asserted rather than tolerated"
    verification:
      - kind: unit
        ref: "packages/backend/src/telemetry.spec.ts#no longer carries the retired attribution-discard counter (07-12)"
        status: pass
      - kind: other
        ref: "grep -v comments sources.ts | grep -c 'artifact_sha256 = excluded' returns 0; pnpm knip exits 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "The fifth one-way approval is recorded beside the four before it, with what the operator was shown, and the array it guards is byte-unchanged"
    verification:
      - kind: other
        ref: "git diff schema.spec.ts — every changed line is a doc-comment line; grep FOUR=0, FIVE=2, 'The eight tables the operator approved'=1"
        status: pass
    human_judgment: true
    rationale: "Whether the entry states the operator's decision FAITHFULLY — that the column lists, the two keys, the version, the transient name, the row-volume cost and the irreversible half are all present and accurate — is a judgment no grep makes. The reviewer should read the entry against this plan's checkpoint text and decide whether a reader five phases from now could reconstruct what was approved."
  - id: D7
    description: "Four docblocks and one comment block that described the interim mitigation as current now describe what shipped instead; none was deleted"
    verification: []
    human_judgment: true
    rationale: "Whether a rewritten argument is CORRECT and readable is a judgment no test asserts. The reviewer should read sources.ts's replaced attribution essay (especially the preserved request_id paragraph), recordSighting's rewritten changes:0 docblock, consumer.ts's rewritten changes===0 comment block, telemetry.ts's removal note, and step v9's own JSDoc, and decide whether each argues what now holds rather than what used to."

duration: 20 min
completed: 2026-09-02
status: complete
---

# Phase 7 Plan 12: The Key Names The Bundle Summary

**Migration `v: 9` widened `source_sightings`' primary key to `(project_id, artifact_sha256, map_sha256, source_index)`, so a second bundle carrying a byte-identical map keeps its own evidence instead of reading a resolved zero — and the interim guard that was standing in for this, plus the counter that measured its losses, are gone in the same plan.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-02T11:31:52Z
- **Completed:** 2026-09-02T11:51:57Z
- **Tasks:** 4
- **Files modified:** 9

## Task 1 — the fifth one-way `EXPECTED_TABLES` approval

**Option A — approve as specified. Answered 2026-09-02. Gate: `blocking-human`, so not auto-approved in any mode; the operator answered explicitly.**

Recorded in this file and **committed as `1601983` before the first byte of `migrations.ts` changed**, which is Task 1's first acceptance criterion stated literally. That ordering requirement is why this plan has six commits for four tasks.

The operator confirmed both explicit points the checkpoint asked for: the approval event may be written into `EXPECTED_TABLES`'s doc comment naming plan 07-12 and date 2026-09-02, and both occurrences of the approval count advance while the array-length word `eight` stays byte-identical.

**Scope the approval did NOT extend to, and which this plan did not take:** no foreign key, no `ON DELETE CASCADE`, no content column, no ninth table. D-07 is unamended and `FORBIDDEN_COLUMNS` is byte-unchanged. `sources` (PK `(project_id, source_sha256)`) was not touched at all. The eviction cascade for these two tables remains plan 07-13's anti-join.

### The four numbers, measured before and after

| `grep -c` over `packages/backend/src/store/schema.spec.ts` | At `8744be0` | At `f039a1c` | Required |
|---|---|---|---|
| `'FOUR'` | 2 | **0** | 0 |
| `'FIVE'` | 0 | **2** | 2 |
| `'The eight tables the operator approved'` | 1 | **1** | 1, byte-unchanged |
| `'07-12'` | 0 | **2** | at least 1 |

## The key, as shipped

```
was  PRIMARY KEY (project_id, map_sha256, source_index)
now  PRIMARY KEY (project_id, artifact_sha256, map_sha256, source_index)
```

Read back out of SQLite rather than out of the DDL text, `source_sightings`' pk ordinals are:

```
PK_ORDINALS [["project_id",1],["map_sha256",3],["source_index",4],["artifact_sha256",2]]
```

`project_id` is still at ordinal 1, so STORE-02 holds and the pk-ordinal gate passes. Every other line of the table's DDL is unchanged: the same ten columns, the same types, the same `CHECK` constraints, the same closed producibility vocabulary. `COLUMN_ALLOWLIST` is byte-unchanged because no column name moved.

## Accomplishments

- **Migration `v: 9`** — a table rebuild in step `v: 7`'s exact shape, six statements, with the per-statement cannot-fail argument and one paragraph per interruption state in its own JSDoc. It does not claim atomicity: a `BEGIN`-less batch is a sequence on this driver, so the safety is re-runnability and the JSDoc says so.
- **`SCHEMA_VERSION` is 9 by derivation** from the last entry. `grep -c 'SCHEMA_VERSION = 9'` over non-comment lines of `migrations.ts` returns **0** — it is not restated anywhere.
- **`source_sightings_v9` is transient**, the same shape `audit_v6` has in step `v: 7`. It is never an `EXPECTED_TABLES` member, and `schema.spec.ts`'s table-set assertion failing with it present is the specific signal that the swap did not complete.
- **The statement order is asserted positionally**, by index, with a message naming statement 5's dependence on statement 4 — because a rename onto an occupied name fails, and an argument that depends on ordering and is not checked for ordering is a comment.
- **The fifth approval is recorded** beside the four before it, stating what the operator was shown: both column lists, the two keys side by side, the migration version, the transient table name, the per-bundle row-volume cost, and the irreversible half.
- **The interim mitigation is retired whole** — the guard, the counter, and every comment that described either as current.

## The three re-runnability demonstrations

Each is driven against a real fixture migrated through `v: 8` and seeded with six sightings across two projects, distinct on every column with NULLs on the two nullable ones. Each replays the step's **own** statements rather than restating its DDL.

| State | How it is constructed | What is asserted |
|---|---|---|
| **Interrupted between 2 and 4** — both names present, the old one still holding every row | Replay statements 2 and 3, then run `migrate()` | Converges; every row byte-identical; `source_sightings_v9` gone; index back |
| **Interrupted between 4 and 5** — `source_sightings` gone, `_v9` holding every row | Replay statements 2 and 3, then a bare `DROP TABLE source_sightings` as the simulated crash | Converges; not one row lost. **This is the state statement 1 exists for**: without it the re-run fails at `... SELECT ... FROM source_sightings` with `no such table` and the ladder never advances again on any subsequent boot |
| **Completed but `user_version` not advanced** — the round trip | Full `migrate()`, then rewind only `PRAGMA user_version` to 8, then `migrate()` again | Lossless, because the two shapes have identical columns. A step written as drop-plus-rename alone would destroy the evidence here |

A fourth case covers the ordinary forward path: every column of every seeded row survives, `source_sightings_v9` does not, the index is recreated, and a second bundle's row is now accepted while the same four columns twice still collide.

## The RED observations

### 1. Two bundles, one map — the second bundle's `Sources` column read a resolved ZERO

Measured against the **pre-`v: 9` tree**: `migrations.ts` and `sources.ts` restored to `8744be0` with a file-scoped `git checkout 8744be0 -- <paths>`, the regression run, then restored with `git checkout HEAD -- <paths>`. No stash, no branch, no worktree.

```
PROBE per-artifact Sources column => [["65f147535083",3],["c5f6098a249b",0]]
FAIL  consumer.spec.ts > gives a SECOND bundle carrying the same map its OWN recovered-source evidence
      expected 3 to be 6 // Object.is equality
```

Bundle A reports 3. **Bundle B reports 0** — a resolved zero on the `scan_state = 'done'` ground, about a bundle DefMiner had recovered three sources from. `expected 3 to be 6` is the row count: one set of sightings existed where two should have. This is finding W-3 verbatim.

### 2. The narrow key refused the second bundle outright

```
FAIL  migrations.spec.ts > the rebuild carries EVERY sighting across, in every project, with every column intact
      expected [Function] to not throw an error but 'Error: UNIQUE constraint failed: sour...' was thrown
      Received: "Error: UNIQUE constraint failed: source_sightings.project_id,
                 source_sightings.map_sha256, source_sightings.source_index"
```

The pair was not merely unwritten by the guard — it was **unrepresentable**, which is the same fact 07-11 hit and worked around with `widerKeyFixture()`.

### 3. The store write reported a discard

```
FAIL  sources.spec.ts > gives BOTH bundles their own row when they carry the same map
      expected { ok: true, changes: +0 } to deeply equal { ok: true, changes: 1 }
FAIL  sources.spec.ts > answers each bundle's drill-down with that bundle's OWN rows, and neither with a zero
      expected { ok: true, changes: +0 } to deeply equal { ok: true, changes: 1 }
FAIL  sources.spec.ts > does not un-stick ONE bundle's tombstone by writing the OTHER bundle
      expected { ok: true, changes: +0 } to deeply equal { ok: true, changes: 1 }
```

### 4. Step v9 did not exist

```
FAIL  migrations.spec.ts > step v9's SIX statements run in the ONE order that makes them safe
      AssertionError: step v9 is missing — the key widening did not ship: expected undefined to be defined
```

### 5. The retired counter was still on the shape

```
FAIL  telemetry.spec.ts > no longer carries the retired attribution-discard counter (07-12)
      expected [ 'announcedExternal', ...(13) ] to not include 'sightingsDiscardedOtherArtifact'
```

## Findings closed

| Finding | Source | Closed by |
|---|---|---|
| **W-3** | `07-VERIFICATION.md` | `236514b` (the key and the conflict target) and `7262e91` (the guard and the counter). The regression that proves it is in `aad02c8`. |
| **HI-03** | `07-REVIEW.md` | Same two commits. HI-03's interim mitigation was plan 07-05's guard; `7262e91` removes it because the key makes it tautological. |

Both are closed **by construction rather than by mitigation**: `artifact_sha256` is a key column, so a conflicting row necessarily agrees on it and there is no longer a predicate a reader must evaluate to learn the property holds.

## Task Commits

1. **Task 1: the checkpoint decision, recorded before any migration edit** — `1601983` (docs)
2. **Task 2 RED: the second bundle's evidence, and step v9's six statements** — `773a0fc` (test)
3. **Task 2 GREEN: migration v9 widens the key** — `236514b` (feat)
4. **Task 3: the fifth one-way approval** — `f039a1c` (docs)
5. **Task 4 RED: W-3's regression, and the counter asserted absent** — `aad02c8` (test)
6. **Task 4 GREEN: retire the interim guard and its counter** — `7262e91` (feat)

**Plan metadata:** see the final `docs(07-12)` commit.

## Files Created/Modified

- `packages/backend/src/store/migrations.ts` — step `v: 9`, its six statements and the JSDoc carrying the per-statement and per-state arguments. `SCHEMA_VERSION` moves to 9 by derivation.
- `packages/backend/src/store/migrations.spec.ts` — `applyThroughV8`, `seedSightings`, `readSightings`, `statementsOf`; the positional order case; the row-preservation case; the three re-runnability cases; the ladder head 8 -> 9.
- `packages/backend/src/store/schema.spec.ts` — the fifth approval entry and the corrected drift paragraph. **Doc comment only**: every changed line is a comment line.
- `packages/backend/src/store/sources.ts` — the four-column conflict target; the trailing attribution guard deleted; the attribution essay replaced with what still holds plus the history; `recordSighting`'s `changes: 0` docblock rewritten.
- `packages/backend/src/store/sources.spec.ts` — the HI-03 interim block rewritten as the W-3 closure; the drill-down read-back case; the four-part-key idempotence case; `widerKeyFixture()` retired and its three call sites moved to `migratedFixture()`.
- `packages/backend/src/ingest/consumer.ts` — the `changes === 0` branch becomes a recorded store anomaly; the comment block that narrated HI-03's interim is rewritten.
- `packages/backend/src/ingest/consumer.spec.ts` — the discard case becomes the W-3 end-to-end regression, asserting through the same two reads the drill-down makes.
- `packages/backend/src/telemetry.ts` — `sightingsDiscardedOtherArtifact` removed from the shape and the initialiser, with a removal note naming the plan and the reason.
- `packages/backend/src/telemetry.spec.ts` — the removal asserted as an ABSENCE rather than tolerated.

## `ROWS_INSERTED_PER_ITERATION_MAX` — the inequality still holds

07-14 retired the `2 *` compensating factor, leaving `ROWS_INSERTED_PER_ITERATION_MAX = ROWS_INSERTED_PER_ARTIFACT_MAX + SOURCE_ROWS_PER_MAP_MAX` against an unchanged delete budget. This plan increases row volume for the duplicated-map case, so the interaction was checked rather than assumed.

**It holds, and it was never at risk, for a reason worth stating precisely: the bound is PER ITERATION, and one iteration processes ONE artifact reconstructing ONE map.** Two bundles carrying the same map are two artifacts and therefore two iterations. The widening does not raise what a single iteration can insert — it raises what the SECOND iteration inserts from roughly zero (its sightings were discarded) to the same ceiling every non-duplicated iteration already reached. The bound was always sized for a full map's worth of rows in one iteration; the discard only ever made one iteration land under it.

`thresholds.spec.ts` exits 0 at every commit in this plan (59 tests), and `retention.spec.ts` is green.

## Measurements

| Gate | Result |
|---|---|
| `pnpm vitest run` | **89 files / 4,258 tests, all passing** (baseline at `8744be0`: 4,250) |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm knip` | exit 0 |
| `pnpm build` | exit 0 |
| `git diff --stat 8744be0..HEAD -- .planning/REQUIREMENTS.md` | prints nothing |

The collected test count rose by exactly the eight cases added: five in `migrations.spec.ts` (order, preservation, three re-runnability), two in `sources.spec.ts` (drill-down read-back, four-part-key idempotence), one in `telemetry.spec.ts` (the absence). The rewritten cases replaced existing ones in place.

### `vue-tsc` — measured at this tree, not carried in from a document

| When | Total | `SettingsPanel.vue` | `SourceBrowser.spec.ts` |
|---|---|---|---|
| After this plan (`7262e91`) | **6** | 4 | 2 |

Identical to the W-4 baseline `07-VERIFICATION.md` recorded and to what 07-11 measured, with the same per-file split. W-4 was neither fixed nor worsened, and this plan was prohibited from working on it.

## Decisions Made

See `key-decisions` in the frontmatter. The two a reviewer should weigh hardest:

1. **The RED for the two-bundle regression was measured against a temporarily restored pre-`v: 9` tree.** The plan requires that case to be RED "against the pre-`v: 9` tree", but `v: 9` lands in Task 2 and the regression is Task 4's — so by the time the case exists, the defect is already fixed. Rather than skip the observation or fake it, `migrations.ts` and `sources.ts` were restored at `8744be0` with a file-scoped `git checkout`, the case was run, the output captured verbatim, and the files restored from `HEAD`. `git status` was clean of both files afterwards. No stash, no branch, no worktree — all three are forbidden here, and none was needed.

2. **The `changes === 0` branch survives as a store anomaly rather than being deleted.** It is now unreachable by any traffic pattern, which is an argument for deleting it. It was kept because a statement that neither inserts nor updates is a real thing a broken store can do, and the branch is the only place that would ever be visible. It moved to `counters.storeErrors` with a log naming the four-part key shape, and it still refuses to advance `sightingsRecorded` or `rowsInserted` — both rules survive verbatim, `rowsInserted` because it feeds STORE-06's retention interval.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] The `EXPECTED_TABLES` drift paragraph would have been left asserting something the fifth approval makes false**

- **Found during:** Task 3
- **Issue:** The closing paragraph states that the approval count "was rewritten in the same commit as the array". That was true of the sixth, seventh and eighth entries, which were all table additions. The fifth approval changes a KEY, so the array did not move — and the paragraph would have been left describing a rule the very edit beneath it had just broken. That is the drift shape the paragraph exists to catch, arriving in the direction it did not anticipate.
- **Fix:** Extended the paragraph with the corrected scope: the count is rewritten in the same commit as the EVENT it counts, which is the array only when the event is a table. States explicitly that rewriting `eight` to `nine` would have introduced exactly the drift being warned about.
- **Files modified:** `packages/backend/src/store/schema.spec.ts`
- **Verification:** The first attempt at this paragraph used the literal tokens `FOUR -> FIVE` and broke the plan's own acceptance criteria (`grep -c 'FOUR'` went 0 -> 1 and `grep -c 'FIVE'` went 2 -> 3). Caught by re-measuring immediately after the edit, and rewritten without either token. Final: `FOUR`=0, `FIVE`=2.
- **Committed in:** `f039a1c`

**2. [Rule 3 - Blocking] `widerKeyFixture()` had to be retired, not merely left**

- **Found during:** Task 2
- **Issue:** 07-11 built `widerKeyFixture()` to read the shipped `source_sightings` DDL out of `sqlite_master` and substitute the `PRIMARY KEY` clause, asserting the substitution changed something. Once `v: 9` shipped, the clause it searches for no longer exists, so the assertion fires and three of 07-11's committed cases fail. This was designed as a deliberate tripwire for this plan.
- **Fix:** Deleted the helper and pointed its three call sites at `migratedFixture()`, which now ships the wider key. `seedTwoBundleSighting`'s docblock was rewritten to record why the scaffolding existed and why it is gone, so a reader of 07-11-SUMMARY.md naming the helper can find out what happened to it.
- **Files modified:** `packages/backend/src/store/sources.spec.ts`
- **Verification:** All three 07-11 cases pass against the real table; `grep widerKeyFixture` finds only the historical mention in the replacement docblock.
- **Committed in:** `236514b`

**3. [Rule 1 - Bug] A `Record<string, unknown>` cast made the preservation case fail to typecheck**

- **Found during:** Task 2
- **Issue:** The second-bundle insert in the preservation case bound values read back from `readSightings()`, typed `object[]`. Cast to `Record<string, unknown>`, every bound value was `unknown` and `stmt.run` rejected it with `TS2769`.
- **Fix:** Cast to the three named columns the case actually binds, so the types are declared rather than widened away.
- **Files modified:** `packages/backend/src/store/migrations.spec.ts`
- **Verification:** `pnpm typecheck` exits 0.
- **Committed in:** `236514b`

---

**Total deviations:** 3 auto-fixed (1 missing critical, 1 blocking, 1 bug).
**Impact on plan:** No scope creep. Deviation 1 is the plan's own comment-discipline rule applied to a case the comment did not anticipate; deviation 2 is the tripwire 07-11 deliberately armed for this plan, fired and cleared as designed; deviation 3 is a local type correction. Every acceptance criterion in all four tasks was met and verified.

## Issues Encountered

- **`vitest` printed `Failed to fully serialize error: Invalid character` on the consumer regression's failure output.** The inner message was always legible (`expected 3 to be 6`), and the file was scanned for the W-2 class of invisible bytes and is clean. This is a vitest 4 serializer quirk on the failure path, not a defect in the spec, and it does not appear on a passing run.
- **The `2 *` factor question was checked rather than assumed.** See the `ROWS_INSERTED_PER_ITERATION_MAX` section: the bound is per-iteration and one iteration is one artifact, so the widening cannot raise it.

## The W-2 class — scanned, not hoped

Every file this plan touched was scanned for literal U+2028, U+2029, NUL, other C0/C1 controls, `Cf`/`Cc`/`Zl`/`Zp` category characters, NBSP, BOM and the zero-width set, **before each commit**. All nine files report clean at every commit. The class recurred three times in Wave 1; it did not recur here.

## Known Stubs

None. No placeholder, empty-value or "coming soon" path was introduced. Every new code path is exercised by a committed test, and the one branch that is now unreachable by design (`changes === 0`) is documented as a store anomaly rather than left as a silent no-op.

## Threat Flags

None. The plan's own register is discharged as written:

- **T-07-52** (Tampering — a target suppressing or reattributing another bundle's evidence): **mitigated**, by `artifact_sha256` becoming a PRIMARY KEY column. Asserted by the two-artifact regression.
- **T-07-54** (DoS — the rebuild on the boot path): **mitigated**. One `INSERT OR IGNORE ... SELECT` over a table already bounded by `DEFAULT_RETENTION_MAX_ROWS`, no `BEGIN`, and re-runnability asserted by three executed cases rather than argued in a comment.
- **T-07-69** (Repudiation — the health surface after the counter is removed): **accepted, and smaller than the register assumed.** Verified by reading `index.ts`'s `SourcemapHealth` projection and `index.spec.ts`'s whole-key-set equality: the projection names six sourcemap fields and `sightingsDiscardedOtherArtifact` was never one of them. The counter never reached the health payload, so no operator dashboard can see it disappear, no RPC contract moves and no frontend shape changes. The plan's `<reversibility rating="costly">` for this removal over-stated the cost.

No new network endpoint, auth path or file access pattern. The one trust boundary this plan touches — migration `v: 9` rewriting a shipped table on the boot path — is T-07-54 above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **07-13, 07-15 and 07-16 are unblocked.** All three `depends_on: ["07-12"]` and all three were written against `v: 9`. 07-13 Task 1's precondition "migration `v: 9` has landed" is satisfied; 07-15 Task 2's "after migration `v: 9`" scoping of `countSourcesForMap` by artifact is now possible.
- **`countSourcesForMap` is still un-widened, deliberately, and is still 07-15's.** 07-11 recorded the reason above the statement and this plan did not touch it. It is now the only remaining statement over `source_sightings` that names a sighting by map-and-index alone, and under the four-column key that is a real choice about WHAT it counts rather than a schema accident.
- **The eviction cascade is unchanged and remains 07-13's anti-join.** No foreign key and no `ON DELETE CASCADE` was added, so no sixth `EXPECTED_TABLES` approval is owed.
- **A future narrowing of this key fires `schema.spec.ts` by design.** The shipped key is now the asserted key, and the pk-ordinal gate reads it back from SQLite rather than from the DDL text.
- **`.planning/REQUIREMENTS.md` was NOT touched.** MAP-06, MAP-07 and UI-05 are declared by sibling plans that have not finished, so the shared-ID gate governs when they read Complete.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-02*

## Self-Check: PASSED

All nine modified files exist on disk. All six task commits (`1601983`, `773a0fc`, `236514b`, `f039a1c`, `aad02c8`, `7262e91`) are present in `git log --oneline --all`. The plan-level `<verification>` was re-run at `7262e91`: `pnpm vitest run` — 89 files / 4,258 tests, all passing, collected count higher than the 4,250 at `8744be0`; `pnpm typecheck && pnpm lint && pnpm knip` — exit 0; `pnpm build` — exit 0; `git diff --stat 8744be0..HEAD -- .planning/REQUIREMENTS.md` — prints nothing. Every acceptance criterion across all four tasks was executed as its own command and passed.
