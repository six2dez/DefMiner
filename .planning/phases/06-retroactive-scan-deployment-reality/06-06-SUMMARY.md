---
phase: 06-retroactive-scan-deployment-reality
plan: 06
subsystem: database
tags: [sqlite, migration, retention, audit, scan-lifecycle, check-constraint]

requires:
  - phase: 06-01
    provides: "migration step v5, the `scans` table, `discardScan`, `SUSPEND_REASONS.retention_eviction`"
  - phase: 06-02
    provides: "the recorded O-07 verdict this plan's reload-side gate cites by path"
  - phase: 06-03
    provides: "the `reloadOverSize` counter, declared beside `byteLenMismatch`"
  - phase: 06-05
    provides: "the transition set and the epoch re-base on resume, as `scans.ts` now stands"
provides:
  - "Migration step v6 — `audit` REBUILT with a `kind` CHECK admitting nine members; SCHEMA_VERSION 6"
  - "`AUDIT_KINDS` members `scan_discarded` and `scan_suspended_by_retention`, both with a writer"
  - "`scans.ts`'s two destructive writes: an audit row inside `discardScan`, and `suspendForRetentionEviction`"
  - "`RetentionSweepSummary.rowCapDeleted` — the row cap's evictions, separated from age trimming"
  - "`SCANS_OVER_AGE_SQL` / `SCANS_OLDEST_SQL` / `DELETE_SCAN_SQL`, and D-26's exemption as a predicate"
  - "The single D-08 branch at the consumer's sweep call site"
  - "The reload-side `PASSIVE_MAX_BYTES` gate, before the identity write"
  - "A widened cannot-fail migration gate that inspects EVERY statement, not only the `CREATE` ones"
affects: [06-09, 06-12, 06-13, phase-11-hardening]

actuals:
  tokens: 28000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Forward-step table rebuild: create-copy-drop-rename inside one atomic `exec`, with each statement's cannot-fail argument written out"
    - "Exemption-as-predicate: an exemption that attaches to a STATE lives in the WHERE clause, because an absence cannot express a state"
    - "Two-statement destructive write: state change first, audit row second, so the failure mode is a missing record and never a record of something that did not happen"
    - "A summary field is added when, and only when, a caller must BRANCH on the distinction"

key-files:
  created: []
  modified:
    - packages/backend/src/store/migrations.ts
    - packages/backend/src/store/migrations.spec.ts
    - packages/backend/src/store/audit.ts
    - packages/backend/src/store/audit.spec.ts
    - packages/backend/src/store/retention.ts
    - packages/backend/src/store/retention.spec.ts
    - packages/backend/src/scan/scans.ts
    - packages/backend/src/scan/scans.spec.ts
    - packages/backend/src/scan/lifecycle.spec.ts
    - packages/backend/src/ingest/consumer.ts
    - packages/backend/src/ingest/consumer.spec.ts
    - packages/backend/src/index.ts

key-decisions:
  - "Step v6 rebuilds `audit` rather than editing step v3 — SQLite has no ALTER TABLE DROP CONSTRAINT and shipped steps are immutable; approved at a blocking-human checkpoint on 2026-08-31"
  - "The ladder's header rule was amended from 'a data write never may' to the property it depends on — no statement in a batched `exec` may be able to fail — because the sentence had begun contradicting the ladder below it"
  - "MULTISTATEMENT_EXEC_ATOMIC is named in step v6 as the second half of its safety argument: per-statement cannot-fail avoids a poisoned pooled connection, exec atomicity is what makes a partial rebuild impossible"
  - "`sql-discipline.spec.ts`'s `insert-select` rule does not see step v6's copy — the gate classifies by leading keyword — so the compliance argument is written into the step and the blind spot is recorded, not relied on"
  - "`rowCapDeleted` counts digests REMOVED, not candidates enumerated: `deleteDigest` now reports `artifactRemoved`, so a cascade that ran out of budget cannot suspend a scan for an eviction that did not happen"
  - "D-26's exemption is a predicate `AND state <> 'suspended'` rather than an absence, because it attaches to a state and an absence would exempt completed and discarded history rows too"
  - "The `scans` sweep runs inside the existing bounded pass on the existing cadence — no second sweep and no second timer"
  - "`ScanStatusPayload.analysed` stays `null` and is re-owned to 06-09: wiring it needs either a new `scans` column or the telemetry retro sub-map, neither in this plan's scope"

patterns-established:
  - "Argued-safe statement forms: a migration gate that lists the forms somebody has made the cannot-fail argument for, and reports anything else — with the `RENAME`'s drop-first ordering and the copy's source/destination existence asserted positionally"
  - "Blind-spot disclosure in code: when a static gate passes by non-observation rather than by compliance, the module says so where a reader will meet it"
  - "Exhaustiveness helpers get a call site in their spec, so a compile-time claim is load-bearing rather than aspirational"

requirements-completed: [FIND-04]

coverage:
  - id: D1
    description: "Migration step v6 rebuilds `audit` with a `kind` CHECK admitting nine members; SCHEMA_VERSION derives to 6 and step v3 is byte-identical to its shipped form"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#the ladder head is step v6 — the version bump IS the appended entry"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#step v6 is its OWN step and step v5 was not edited to carry it"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#the widened CHECK is in force after the rebuild, and it is still CLOSED"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts#the table set is EXACTLY the six approved tables"
        status: pass
    human_judgment: false
  - id: D2
    description: "The rebuild loses no audit row: a v5 database seeded with one row per shipped kind in two projects survives byte-identical, the table set stays at six, `idx_audit_at` is re-created, and both a second `migrate()` and a raw re-exec of step v6 are no-ops"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#step v6 rebuilds `audit` and loses NOT ONE ROW doing it"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#step v6 leaves SIX tables — the rebuild's intermediate is renamed away"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#step v6 re-creates `idx_audit_at`, which went with the dropped table"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#a SECOND run after the rebuild changes nothing — not one row, not one table"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#re-running step v6's RAW SQL by hand is also a no-op — the crash-recovery path"
        status: pass
    human_judgment: false
  - id: D3
    description: "`AUDIT_KINDS` grows by exactly two members, the database CHECK is read back out of `sqlite_master` and compared member for member in order, and `assertNoOtherAuditKind` now has a call site that makes its compile-time claim real"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/store/audit.spec.ts#has exactly the nine kinds: 05-06's seven plus D-16's two"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/audit.spec.ts#the DDL's CHECK constraint lists the SAME nine values, in the same order, with no member restated by hand"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/audit.spec.ts#`assertNoOtherAuditKind` has a CALL SITE, so its compile-time claim is load-bearing"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/audit.spec.ts#the two D-16 members are ACCEPTED by the database after the rebuild"
        status: pass
    human_judgment: false
  - id: D4
    description: "`discardScan` writes exactly one `scan_discarded` audit row naming the position it destroyed; a guard-declined discard, a replay under the same event id and a fresh-id second discard all write nothing further"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#DISCARD writes exactly one `scan_discarded` row, naming the position it destroyed"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#a discard the GUARD DECLINES writes no audit row at all"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#a REPLAYED discard writes no second row — twice over"
        status: pass
    human_judgment: false
  - id: D5
    description: "`suspendForRetentionEviction` moves a running scan to `suspended` with reason `retention_eviction`, keeps its position, writes one `scan_suspended_by_retention` row, and declines on any other state or another project"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#RETENTION EVICTION suspends the running scan at its cursor and records why"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#retention eviction moves a RUNNING scan only, and records nothing otherwise"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#neither write touches ANOTHER project's scan"
        status: pass
    human_judgment: false
  - id: D6
    description: "`sweepRetention` reports `rowCapDeleted` separately from `deleted`: 0 on an age-only sweep, 0 at `count == maxRows`, 1 at `maxRows + 1`, equal to digests actually removed, and 0 for a digest eligible under both bounds"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#an AGE-ONLY sweep deletes rows and reports `rowCapDeleted` as 0"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#the boundary: `count == maxRows` evicts nothing, `count == maxRows + 1` evicts exactly one"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#counts DIGESTS REMOVED, not candidates enumerated"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#a digest eligible under BOTH bounds is attributed to AGE, never to the row cap"
        status: pass
    human_judgment: false
  - id: D7
    description: "D-26's exemption is a predicate in `SCANS_OVER_AGE_SQL`, the row-cap statement carves out no state, both statements order oldest-first with an explicit tie-break, the second exemption has its own paragraph, and `AUDIT_OVER_AGE_SQL` is still absent"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#the exemption is a PREDICATE in the age statement's text"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#THE CONTRAST: equally old scans, and only the non-suspended ones age out"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#the ROW CAP evicts a suspended scan like any other — no state is carved out"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#the exemption block carries the SECOND exemption's own paragraph"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#`AUDIT_OVER_AGE_SQL` is still ABSENT — the first exemption is unchanged"
        status: pass
    human_judgment: false
  - id: D8
    description: "One branch at one call site: a row-cap eviction with a running scan suspends it and writes one audit row; an age trim that really deletes suspends nothing and records nothing; no running scan suspends nothing"
    requirement: FIND-04
    verification:
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#a ROW-CAP eviction while a scan is running suspends it and writes ONE audit row"
        status: pass
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#an AGE-BOUND trim with a running scan suspends NOTHING and records NOTHING"
        status: pass
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#a row-cap eviction with NO running scan suspends nothing"
        status: pass
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#the coupling is ONE branch at ONE call site"
        status: pass
    human_judgment: false
  - id: D9
    description: "The reload-side size gate: one byte over `PASSIVE_MAX_BYTES` increments `reloadOverSize` and writes no row; a body at exactly the ceiling is admitted"
    requirement: FIND-04
    verification:
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#a reloaded body ONE BYTE over the ceiling is counted and not analysed"
        status: pass
      - kind: integration
        ref: "packages/backend/src/ingest/consumer.spec.ts#a body at EXACTLY the ceiling is admitted — the comparison is `>` and not `>=`"
        status: pass
    human_judgment: false
  - id: D10
    description: "The migration ladder's cannot-fail gate is widened from `every CREATE says IF NOT EXISTS` to `every statement is in an argued-safe form`, with the RENAME's drop-first ordering and the copy's source/destination existence asserted positionally"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#EVERY statement in EVERY step is one that CANNOT FAIL on a re-run"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#a RENAME's target name is DROPPED earlier in the same step"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#an INSERT … SELECT reads a table an EARLIER step created, and writes one this step just created"
        status: pass
    human_judgment: false
  - id: D11
    description: "The D-16 one-way checkpoint was surfaced with premises verified against the working tree, and approved by the operator rather than self-decided"
    verification: []
    human_judgment: true
    rationale: "A blocking-human gate is by definition not automatable. What the executor owed was verified premises, and the verification surfaced one fact the plan did not carry — `sql-discipline.spec.ts`'s `insert-select` rule and the leading-keyword blind spot that hides step v6 from it — which changed the disposition from a plain approval to an approval with the blind spot recorded."

duration: 121 min
completed: 2026-08-31
status: complete
---

# Phase 06 Plan 06: Retention Meets the Scan State Machine — Summary

**Migration step v6 rebuilds `audit` to admit two destruction kinds, `sweepRetention` learns to tell a row-cap eviction from an age trim, and exactly one branch at one call site stops a backfill that is eating its own results.**

## Performance

- **Duration:** 121 min
- **Started:** 2026-08-31T18:54:46Z
- **Completed:** 2026-08-31T20:56:18Z
- **Tasks:** 3 of 3 (one blocking-human checkpoint, two TDD tasks)
- **Files modified:** 12

## Accomplishments

- **`audit` can now record the two things a retroactive scan does that cannot be undone, and no existing row was lost widening it.** Step v6 is its own forward step; step v3 is byte-identical to its shipped form. The preservation case seeds one row per shipped kind in **two** projects — including a NULL `detail` — and compares every column before and after, because `INSERT OR IGNORE`'s failure mode is a silently skipped row rather than an error. That assertion is the only thing between a silent skip and a green run, and step v6's JSDoc says so.

- **The ladder's own rule was amended rather than left contradicting the code below it.** The header used to read *"DDL that cannot fail may be batched; a data write never may"*. Step v6 batches a data write, so that sentence would have become a rule the ladder violated on the very next screen. It now states the property it always depended on — *no statement in a batched `exec` may be able to fail* — and step v6 makes that argument statement by statement, including the half nobody had written down: per-statement cannot-fail avoids a poisoned pooled connection, and **`MULTISTATEMENT_EXEC_ATOMIC`** is what makes a partial `DROP`/`RENAME` state impossible.

- **The gate that should have caught the copy does not see it, and the code says so.** `sql-discipline.spec.ts` bans `INSERT … SELECT` package-wide with no allowlist — but `statementKind()` classifies a SQL string by its leading keyword, so a multi-statement blob leading with `CREATE` skips `insertsFromSelect`, `isMultiRowStatement` and the whole row-scoping family. A green run on `migrations.ts` is **green by non-observation, not by compliance**, and that sentence is in the step where a reader will meet it. The compliance argument is then made on the rule's own three grounds, and the blind spot is recorded as WINDOWS 84 with an owner.

- **`rowCapDeleted` separates the eviction that means something from the one that does not.** The sweep pushed both victim sets into one array and one count, so D-08 had nothing to fire on. It now counts digests that entered through the `excess > 0` branch **and were actually removed** — `deleteDigest` reports `artifactRemoved` for that, because a cascade that ran out of budget leaves the artifact standing and reporting it as evicted would suspend a scan for work that did not happen. Both boundary sides are executed: at `count == maxRows` nothing is evicted, at `maxRows + 1` exactly one is.

- **D-26's exemption is a predicate, in the statement a reader would open looking for it.** `AND state <> 'suspended'` in `SCANS_OVER_AGE_SQL`, with the paragraph the audit exemption's closing sentence said a second exemption would need — including *why* it cannot be an absence: an absence exempts the whole table, and the whole table includes completed and discarded history rows that have no cursor and nothing to resume. `SCANS_OLDEST_SQL` carves out no state, so growth is still bounded.

- **The coupling is ten lines at one call site, and a test says so.** `consumer.spec.ts` counts the calls to `suspendForRetentionEviction` in `consumer.ts` and requires exactly one. Both D-08 paths are executed rather than asserted: a row-cap eviction with a running scan produces one suspension and one audit row; an age trim that **really deletes** (`retentionDeleted > 0` is asserted first, so the case is not vacuous) produces neither.

- **The size check moved to where the byte count is known good.** `PASSIVE_MAX_BYTES` is now checked against the reloaded body's own length, before the identity write. It is a no-op on the live path — the hook already admitted against a count it measured — and it is the authoritative gate on the retro path, where the query-side count is a filter. 06-02's verdict is cited by artifact path rather than restated as a number, and the comment states plainly that `SIZE_GATE_SOURCE`, `BODY_STORED_DECOMPRESSED` and `BODY_LENGTH_EQUALS_RAW_LENGTH` all describe the hook path and are not evidence about either read path.

- **Two gates got stronger as a side effect of being used.** The migration ladder's cannot-fail check used to filter to statements beginning with `CREATE` — so step v6's `INSERT`/`DROP`/`ALTER` would have been skipped by the very gate that justifies batching them. It now inspects every statement against a list of argued-safe forms, and asserts the `RENAME`'s drop-first ordering and the copy's source/destination existence positionally. And `assertNoOtherAuditKind`, whose JSDoc claims its job is to stop the build when a member is added without a migration, had **no call site at all** — it has one now, so the claim is load-bearing.

## Task Commits

1. **Task 1: One-way decision — widening `audit`'s closed `kind` CHECK by rebuilding the table (D-16)** — no commit. A `checkpoint:decision` with `gate="blocking-human"`; surfaced with premises verified against the working tree and approved by the operator on 2026-08-31 ("approve, and record the gate blind spot").
2. **Task 2: Migration step v6, the two new audit kinds, and the two destructive writes** — `18ec8c2` (test, RED) then `2bc96cf` (feat, GREEN).
3. **Task 3: `rowCapDeleted`, D-26's visible state exemption, the single D-08 branch, and the reload-side size gate** — `8628ba9` (test, RED) then `2dd0465` (feat, GREEN).

**Plan metadata:** see the `docs(06-06)` commit that carries this file.

_Both auto tasks carried `tdd="true"`, so each is two commits: the failing contract first, the implementation second. `workflow.tdd_mode` is `false` in config, but the plan's task attributes are what govern, and both RED commits were verified failing before the GREEN commit._

## Files Created/Modified

**Modified**

- `packages/backend/src/store/migrations.ts` — step v6 (the five-statement `audit` rebuild) and its JSDoc; the header rule amended from "a data write never may" to the property it depends on; the top-of-file ladder summary gains a v6 line. `SCHEMA_VERSION` derives to 6 with no second edit.
- `packages/backend/src/store/migrations.spec.ts` — the v5-only seeding helper, the two-project audit seed, and six cases over the rebuild; the cannot-fail gate widened from `CREATE`-only to every statement, plus the RENAME-ordering and copy-existence gates.
- `packages/backend/src/store/audit.ts` — `AUDIT_KINDS` grows by `scan_discarded` and `scan_suspended_by_retention`, each with its own per-member reasoning; the header's "complete before its callers" paragraph now marks that argument as *not* what justifies these two.
- `packages/backend/src/store/audit.spec.ts` — seven→nine, the exhaustive-switch call site for `assertNoOtherAuditKind`, and the two database-side acceptance writes.
- `packages/backend/src/store/retention.ts` — `rowCapDeleted` and the amended FIXED SHAPE comment; `deleteDigest`'s `artifactRemoved`; D-26's paragraph and the three `scans` statements; the `scans` sweep inside the existing pass; `workRemains` and `retentionCounts` extended.
- `packages/backend/src/store/retention.spec.ts` — eleven new cases across D-08 and D-26, half source-text and half behavioural, plus four `retentionCounts` shapes updated for the new `scans` field.
- `packages/backend/src/scan/scans.ts` — `SUSPEND_FOR_RETENTION_SQL`, `RETENTION_EVICTION`, `destructionDetail`, the audit write inside `discardScan` (with the pre-read that makes "the position it destroyed" sayable), and `suspendForRetentionEviction`.
- `packages/backend/src/scan/scans.spec.ts` — a new describe block of six cases over the two destructive writes and their declined paths.
- `packages/backend/src/ingest/consumer.ts` — the single D-08 branch at the sweep call site, and the reload-side size gate before the identity write.
- `packages/backend/src/ingest/consumer.spec.ts` — the four D-08 cases and the two size-gate boundary cases.
- `packages/backend/src/index.ts` — the `discardScan` registration mints the audit event id.
- `packages/backend/src/scan/lifecycle.spec.ts` — one `discardScan` call site updated for the new arity.

## Decisions Made

- **The rebuild is a separate step v6, never folded into v5.** `06-PATTERNS.md` flagged folding as the thing to avoid, and the plan-checker had already confirmed the separation. A dedicated test now asserts step v5 mentions neither new member nor the word `audit`, and that step v3 still declares exactly the seven it shipped with.
- **The intermediate table is `audit_v6`, renamed away inside the step.** `schema.spec.ts` asserts the table set exactly, and a dedicated case asserts six tables after the rebuild — a create-copy that stopped before the rename would leave a seventh table holding a duplicate audit log.
- **The audit write is conditional on `changes > 0`, in both destructive writes.** A ledger that can claim a discard nobody performed is worse than one with a gap: the gap is at least not a lie. Ordering is state-change first, audit row second, since `BEGIN` does not span `exec` calls and no ordering makes them atomic — only one chooses which half survives.
- **`discardScan` pre-reads the row.** `DISCARD_SQL` erases `last_request_id`, so a detail assembled from the read-back would record the destruction of nothing. The pre-read is for the RECORD, never for the decision — the state guard stays in the statement's predicate — and the test that asserts the detail contains `9001` is the only thing that distinguishes the two orders.
- **Scan deletions are counted into `deleted`, not into a new category.** `auditDeleted` earned its own field because `audit` is the table with no age bound at all; `scans` carries both bounds like everything else, and the bar for a new field is that a caller must branch on it.
- **`retentionCounts` gained a `scans` field** — outside `files_modified`, deliberately. Every other table the sweep bounds is counted there, and a table the sweep deletes from that no reader can count is a bound nothing can be shown to hold.
- **`ScanStatusPayload.analysed` stays `null`.** Window 65 named this plan as owner, and this plan declines it with a reason rather than silently: `analyses` rows carry no scan attribution, so a per-scan count needs either a new `scans` column — another one-way migration step this plan had no mandate for — or `telemetry.ts`'s retro sub-map. Re-owned to 06-09 in WINDOWS 86.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `discardScan`'s new arity reached two files outside `files_modified`**
- **Found during:** Task 2
- **Issue:** The plan requires the caller to mint the audit `event_id` ("which is what makes a retry a no-op rather than a duplicate"). A caller-minted id has no meaning if the caller does not mint it, so `index.ts`'s `discardScan` registration and `scan/lifecycle.spec.ts`'s one call site both had to change. `pnpm typecheck` caught the second one.
- **Fix:** `index.ts` passes `randomUUID()` (already imported there for scan ids and export ids), with a comment explaining why the id is minted at the call site; `lifecycle.spec.ts` passes a fixed id.
- **Files modified:** `packages/backend/src/index.ts`, `packages/backend/src/scan/lifecycle.spec.ts`
- **Verification:** `pnpm typecheck` exits 0; the replay case in `scans.spec.ts` executes both the same-id and fresh-id paths.
- **Committed in:** `2bc96cf`
- **Recorded:** WINDOWS 87

**2. [Rule 2 - Missing Critical] The migration ladder's cannot-fail gate would not have looked at step v6 at all**
- **Found during:** Task 2
- **Issue:** `migrations.spec.ts`'s idempotence gate filtered statements to `/^CREATE\b/` before checking for `IF NOT EXISTS`. Step v6's `INSERT OR IGNORE`, `DROP TABLE IF EXISTS` and `ALTER TABLE … RENAME TO` would all have been silently skipped — by the very gate whose stated purpose is to justify batching them into one `exec`.
- **Fix:** The gate now classifies **every** statement against a list of argued-safe forms, each carrying its own reason, and reports anything else. Two further gates assert the parts of step v6's argument that depend on ORDER rather than on the statement alone: a `RENAME`'s target must be dropped earlier in the same step, and an `INSERT … SELECT`'s source must be created by an earlier step with its destination created earlier in this one. A negative list bans bare `INSERT`, `UPDATE`, `DELETE` and unguarded `DROP TABLE`.
- **Files modified:** `packages/backend/src/store/migrations.spec.ts`
- **Verification:** All three cases pass over the whole ladder, including step v2's trigger fragments.
- **Committed in:** `18ec8c2`
- **Recorded:** WINDOWS 88

**3. [Rule 1 - Bug] `retention.spec.ts` did not, in fact, assert `AUDIT_OVER_AGE_SQL`'s absence**
- **Found during:** Task 3
- **Issue:** The plan's task-3 acceptance criterion says "`retention.spec.ts` **still** asserts its absence". It did not — the absence was asserted only behaviourally, via the D-06 contrast case. Adding a *second* exemption is exactly the moment somebody tidies the first into the same shape, so the premise mattered.
- **Fix:** The criterion is now true rather than the premise quietly accepted. `retention.spec.ts` asserts no `const AUDIT_OVER_AGE_SQL` declaration exists **and** that the paragraph naming it survives — a bare `toContain` would have been asserting against the very sentence that makes the absence legible.
- **Files modified:** `packages/backend/src/store/retention.spec.ts`
- **Verification:** Both halves pass; the behavioural D-06 contrast case is untouched.
- **Committed in:** `8628ba9`
- **Recorded:** WINDOWS 88

**4. [Rule 1 - Bug] A pinned literal version in a pre-existing migration case**
- **Found during:** Task 2
- **Issue:** `"step v5 brings `scans` to a database that stopped at v1"` asserted `userVersion === 5`. The ladder runs to its HEAD, so appending step v6 turned it red — the exact trap the v3 case above it had already learned and documented.
- **Fix:** Asserts `SCHEMA_VERSION`, with a comment pointing at the v3 case that learned it first. What the case is about — `scans` arriving — is untouched.
- **Files modified:** `packages/backend/src/store/migrations.spec.ts`
- **Verification:** `pnpm vitest run packages/backend/src/store` green.
- **Committed in:** `2bc96cf`

---

**Total deviations:** 4 auto-fixed (2 bugs, 1 missing critical, 1 blocking)
**Impact on plan:** All four were necessary for correctness or for the plan's own criteria to be true. Two of them made existing gates stronger. No scope creep — nothing was built that the plan did not ask for.

## Checkpoint Outcome

**Task 1 (`checkpoint:decision`, `gate="blocking-human"`) was surfaced, not self-decided.** `workflow.auto_advance` is `true` and does not reach this gate. Every premise was verified against the working tree first — step v3's seven members, `SCHEMA_VERSION` deriving from the last entry, the `(project_id, event_id)` natural key, `idx_audit_at` living inside step v3's blob, `EXPECTED_TABLES` at six, `retention_eviction` already shipped in `SUSPEND_REASONS`, and both new members having a writer in this plan.

The verification surfaced **three things the plan's task-1 context did not carry**, and the operator's disposition changed because of them:

1. `sql-discipline.spec.ts:445-450` bans `INSERT … SELECT` package-wide with no allowlist, and will not report step v6 — not because the statement complies, but because `statementKind()` classifies by leading keyword.
2. The file header's rule was categorical (*"a data write never may"*) and step v6 breaks its letter; approving meant amending it.
3. The five per-statement "cannot fail" arguments are sufficient only in combination with `MULTISTATEMENT_EXEC_ATOMIC`, which the plan never named.

The operator approved **"approve, and record the gate blind spot"**: all three written into the code, plus the note that `INSERT OR IGNORE` fails silently, and the gate widening explicitly **declined for this plan as scope rather than as a non-issue** — recorded as WINDOWS 84.

## Issues Encountered

**One pre-existing full-suite failure, not caused by this plan and deliberately not fixed by it.**

`outbound-prohibition.spec.ts`'s byte-compare of the derived residual block in `.planning/REQUIREMENTS.md` fails. Its two inputs are `.planning/REQUIREMENTS.md` and `outbound-prohibition.spec.ts`; `git diff HEAD` over both is empty for this plan, and the last commit to touch either is `532491a` — plan 06-07's close-out. The shipped block gained three blank lines the generator does not emit, consistent with a markdown reflow applied by `requirements.mark-complete`.

Left unfixed under the scope boundary and recorded as **WINDOWS 85** with the exact remedy: the spec prints the authoritative bytes between `BEGIN EXPECTED` / `END EXPECTED`, and the generated text is authoritative by that gate's own statement. **The risk worth naming: every close-out that runs `requirements.mark-complete` can re-introduce it, including this one.**

Everything else is green: **2750 of 2751 tests pass**, and `typecheck`, `lint`, `knip`, `build`, `check:bundle`, `check:css` and `check:externals` all exit 0.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `ScanStatusPayload.analysed` is `null` | `packages/backend/src/index.ts` (`getScanStatus`) | Window 65 assigned this to 06-06. Declined with a reason: `analyses` rows carry no scan attribution, so the count needs either a new `scans` column — another one-way migration step, a Rule 4 decision this plan had no mandate to take — or `telemetry.ts`'s retro sub-map. Neither file is in this plan's `files_modified`. Re-owned to plan 06-09 (WINDOWS 86), which already owns delivering scan progress to the frontend. `null` still renders as an em dash and does not lie; `0` would. |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **06-09 inherits two things.** `ScanStatusPayload.analysed` (WINDOWS 86), and the fact that `suspendForRetentionEviction` now exists and fires — so a progress channel needs to carry the `retention_eviction` suspension reason to the surface, which `06-UI-SPEC.md` already has copy for.
- **06-12 and 06-13 can render the two new audit kinds.** They are in the database and in `AUDIT_KINDS`, and both have a writer, so neither is a vocabulary entry waiting for a caller.
- **Phase 11 hardening owns WINDOWS 84.** Splitting a migration blob on `;` and classifying each statement independently may surface violations in step v2's shipped trigger, which is why it was not attempted mid-phase. `migrations.spec.ts`'s widened gate covers the same ground for the ladder specifically, so the exposure is narrowed rather than untouched.
- **One concern, stated plainly:** the `sql-discipline.spec.ts` blind spot means the strongest static gate in the backend does not see any SQL inside a multi-statement blob, in any module, not only in `migrations.ts`. Nothing else in the codebase currently writes one — but nothing stops it either.

## Self-Check: PASSED

All ten named source and spec files exist on disk. All four task commits (`18ec8c2`, `2bc96cf`, `8628ba9`, `2dd0465`) are present in `git log --all`. Every task's `<acceptance_criteria>` was re-run and passes, and both plan-level `<verify>` command sets exit 0.

---
*Phase: 06-retroactive-scan-deployment-reality*
*Completed: 2026-08-31*
