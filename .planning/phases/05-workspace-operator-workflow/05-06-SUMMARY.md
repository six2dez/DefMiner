---
phase: 05-workspace-operator-workflow
plan: 06
subsystem: database
tags: [sqlite, migrations, audit-log, retention, schema-gate, append-only]

# Dependency graph
requires:
  - phase: 05-02
    provides: the widened SQL discipline gate — 15 rules covering WITH/CTE, INSERT … SELECT, unscoped subqueries and unscoped UNION arms, plus the measured index-direction contrast
  - phase: 01-04
    provides: migration step v2, the CHECK/trigger project-scope discipline, and the settings/retention-bounds shape this plan extends
  - phase: 01-01
    provides: the four-table schema and the operator-approval convention that made a fifth table a checkpoint
provides:
  - "migration step v3 — the `audit` table, append-only, PK (project_id, event_id), seven-value CHECK-constrained kind vocabulary"
  - "two direction-explicit UNIFORM DESC,DESC keyset indexes on artifacts and observations, for plan 05-07's row-value cursor"
  - "`audit.ts` — AUDIT_KINDS, AuditKind, recordAudit (one idempotent statement), listAudit (scoped, bounded, deterministic)"
  - "D-06's retention exception, visible in the sweep as a stated exception and proved by contrast"
  - "DEFAULT_AUDIT_RETENTION_MAX_ROWS and RetentionBounds.auditMaxRows — a third, separately-keyed bound"
affects: [05-07, 05-08, phase-04-deferred-pass, any-future-audit-consumer]

actuals:
  tokens: 40011
  tasks: 4
  # 5 task commits + 1 plan-metadata commit. Counted whole rather than as the
  # 5 that would have looked closer to a per-task estimate.
  commits: 6

tech-stack:
  added: []
  patterns:
    - "append-only table: one INSERT with ON CONFLICT DO NOTHING on a caller-generated natural key"
    - "a deliberate policy exception made visible in code shape (a missing statement, named as missing) rather than in a comment alone"
    - "proof by contrast: two row sets of identical age, one swept and one not, in a single test"

key-files:
  created:
    - packages/backend/src/store/audit.ts
    - packages/backend/src/store/audit.spec.ts
  modified:
    - packages/backend/src/store/migrations.ts
    - packages/backend/src/store/migrations.spec.ts
    - packages/backend/src/store/schema.spec.ts
    - packages/backend/src/store/retention.ts
    - packages/backend/src/store/retention.spec.ts
    - packages/backend/src/store/settings.ts

key-decisions:
  - "P5-D31: option-a at the blocking-human checkpoint — the fifth table `audit` with the proposed shape and the FULL seven-kind vocabulary (2026-08-28, one-way)"
  - "P5-D32: the schema.spec.ts two-place gate edit ships in the SAME commit as the migration step, not the following one"
  - "P5-D33: DEFAULT_AUDIT_RETENTION_MAX_ROWS = 200,000, derived as 4x the per-table default with its arithmetic stated"
  - "P5-D34: RetentionBounds.auditMaxRows is REQUIRED, not optional, so the compiler enumerates every construction site"
  - "P5-D35: STORE-08 is NOT marked complete — its text spans three tables and only `audit` is delivered"

patterns-established:
  - "Missing-by-design statement: `retention.ts` carries AUDIT_OLDEST_SQL/COUNT/DELETE and deliberately no AUDIT_OVER_AGE, under a header addressing the reader who came to add one"
  - "Vocabulary agreement asserted, not assumed: the shipped CHECK constraint is read back out of sqlite_master and compared to the TypeScript array member by member"
  - "A required (not optional) widening of a shared bounds type, so the type checker enumerates the call sites instead of defaulting them"

requirements-completed: []

coverage:
  - id: D1
    description: "Migration step v3 adds the `audit` table with the approved shape, every shipped step byte-unchanged"
    requirement: "STORE-08 (audit third only)"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#step v3 brings `audit` to a database that stopped at v1, losing no seeded row"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#the ladder head is step v3 — the version bump IS the appended entry"
        status: pass
      - kind: other
        ref: "git diff -U0 7d670a2~1 7d670a2 -- migrations.ts | grep '^-' → no removed lines"
        status: pass
    human_judgment: false
  - id: D2
    description: "The schema gate's two exact sets both know about the fifth table (P-09's two-place edit)"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts#every column across every table is on the explicit allowlist"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts (EXPECTED_TABLES exact-set assertion, 5 tables)"
        status: pass
    human_judgment: false
  - id: D3
    description: "One idempotent statement records an audit event; a replay writes nothing and does not rewrite history"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/audit.spec.ts#a REPLAY of the same event id writes nothing and is not an error"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/audit.spec.ts#writes one event and reports one change"
        status: pass
    human_judgment: false
  - id: D4
    description: "The audit detail column carries no raw value and no URL (T-05-27)"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/audit.spec.ts#a detail carrying a URL is stored REDACTED"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts (static gate, covers audit.ts on landing)"
        status: pass
    human_judgment: false
  - id: D5
    description: "An audit read never returns another project's rows (T-05-28)"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/audit.spec.ts#never returns another project's rows"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sql-discipline.spec.ts (unscoped-multi-row rule over the new statements)"
        status: pass
    human_judgment: false
  - id: D6
    description: "D-06 — the audit table is bounded by rows and deliberately not by age, proved by contrast"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#THE CONTRAST: equally old rows, and only the artifact ones are swept"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#the ROW bound still applies — the oldest audit rows go first"
        status: pass
      - kind: other
        ref: "comment-stripped source check: no AUDIT_OVER_AGE statement in retention.ts"
        status: pass
    human_judgment: false
  - id: D7
    description: "The two direction-explicit keyset indexes exist with UNIFORM DESC on both non-project columns"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#step v3's indexes exist and their DIRECTIONS are the ones the keyset reads need"
        status: pass
    human_judgment: true
    rationale: "The index SHAPE is asserted structurally out of sqlite_master, but the PLAN benefit (a seek rather than a temporary sort) was measured on SQLite 3.51.0/3.53.4, not Caido's shipped 3.46.0 — no 3.46 binary is reachable on this machine. The operator chose at the Wave 1 boundary to proceed with that residual disclosed rather than closed. A human must keep treating the performance claim as narrowed to a 3.46 -> 3.51 window. The CORRECTNESS half (a uniform direction is required for the row-value cursor to mean 'the next page') does not depend on a query plan and is not affected."
  - id: D8
    description: "STORE-08 requirement status"
    verification: []
    human_judgment: true
    rationale: "Only the `audit` third of STORE-08 is delivered; `entities` and `evidence` are Phase 4 and absent from the ladder. Left unchecked deliberately — the operator should confirm this reading rather than have a mechanical gate flip it Complete."

duration: 24 min
completed: 2026-08-28
status: complete
---

# Phase 05 Plan 06: The Audit Table and D-06's Retention Exception Summary

**The fifth table `audit` ships as forward migration step v3 — append-only, keyed on a caller-generated UUID, with a seven-value CHECK-constrained vocabulary — alongside two uniform-DESC keyset indexes, and D-06's age-bound exemption made visible in the sweep as a stated missing statement rather than an omission.**

## Performance

- **Duration:** 24 min (post-checkpoint execution span: 11 min, 16:57:58 → 17:09:02 local)
- **Started:** 2026-08-28T14:53:00Z (approx., context load)
- **Completed:** 2026-08-28T15:09:02Z
- **Tasks:** 4 (1 checkpoint + 3 implementation)
- **Files modified:** 8 (2 created, 6 modified)

## Accomplishments

- **A fifth table, approved rather than assumed.** `schema.spec.ts` named its table set as the one *the operator* approved at plan 01-01's one-way checkpoint. That sentence made adding a fifth an operator-visible act by the file's own statement, and the `gate="blocking-human"` checkpoint was honoured: `option-a`, 2026-08-28, `<reversibility rating="one-way">`.
- **Migration step v3, appended with every shipped step byte-unchanged.** 73 insertions, 0 deletions in `migrations.ts`. `SCHEMA_VERSION` derives from the last entry, so appending *is* the version bump — there is no second place to forget.
- **The full seven-kind vocabulary, four of them ahead of their callers.** Approved on the asymmetry argument: an unused enum value costs nothing at runtime; a missing one costs a second permanent step in a ladder whose entries can never be edited.
- **P-09's two-place edit closed, and observed firing.** With the table added and the gate not yet updated, `schema.spec.ts` failed three assertions across both exact sets — the gate working exactly as designed.
- **D-06 expressed in code shape.** `retention.ts` gained `AUDIT_OLDEST_SQL`, `COUNT_AUDIT_SQL` and `DELETE_AUDIT_SQL`, and deliberately *no* `AUDIT_OVER_AGE_SQL`, under a header that says so, says why, and speaks directly to the reader who came to add one "for consistency". Proved by contrast, not by absence.
- **A derived retention bound, with its arithmetic checkable.** 200,000 = 50,000 × 4, ≈200 engagements at ~1,000 operator-driven events each, ~70 MB worst-case / ~24 MB realistic — the ceiling stated because the ceiling is the number that has to be acceptable.

## Task Commits

1. **Task 0: the blocking-human decision checkpoint** — no commit; the operator's `option-a` is recorded here and in STATE.md as P5-D31.
2. **Task 1: migration step v3 + the two-place gate edit** — `7d670a2` (feat)
3. **Task 2 RED: failing spec for the audit writer** — `786133e` (test)
4. **Task 2 GREEN: the append-only audit writer** — `6165407` (feat)
5. **Task 3 RED: failing spec for the D-06 exemption** — `66d0ed1` (test)
6. **Task 3 GREEN: the audit retention exception** — `82f9705` (feat)

**Plan metadata:** see the `docs(05-06)` commit that carries this file.

## Files Created/Modified

- `packages/backend/src/store/audit.ts` — **new.** `AUDIT_KINDS`/`AuditKind`, a compile-time exhaustiveness function, `recordAudit` (one INSERT … DO NOTHING), `listAudit` (project-scoped, newest-first with an `event_id DESC` tie-break, always bounded).
- `packages/backend/src/store/audit.spec.ts` — **new.** 13 cases covering what the static gates structurally cannot.
- `packages/backend/src/store/migrations.ts` — step v3 appended; v1 and v2 untouched.
- `packages/backend/src/store/migrations.spec.ts` — step-v3 arrival over a populated v1 database, index directions read out of `sqlite_master`, and an `IF NOT EXISTS` assertion over the *whole* ladder so the batching justification cannot decay.
- `packages/backend/src/store/schema.spec.ts` — `EXPECTED_TABLES` (now 5, with both approval events and dates named) and `COLUMN_ALLOWLIST` (the `audit` entry).
- `packages/backend/src/store/retention.ts` — the audit row-bound sweep, the stated absence of the age bound, `auditDeleted` as its own counted category, `retentionCounts` learning the fifth table.
- `packages/backend/src/store/retention.spec.ts` — the contrast test and 8 more D-06 cases; 12 pre-existing bounds literals widened.
- `packages/backend/src/store/settings.ts` — `AUDIT_RETENTION_MAX_ROWS_KEY`, `DEFAULT_AUDIT_RETENTION_MAX_ROWS`, `RetentionBounds.auditMaxRows`.

## Decisions Made

**P5-D31 — `option-a` at the checkpoint (verbatim, as required by the task's acceptance criteria).** The operator selected **`option-a`: approve the fifth table and the shape as proposed**, on **2026-08-28**, at a **`gate="blocking-human"` `checkpoint:decision`** carrying **`<reversibility rating="one-way">`**. The approval covers the table exactly as proposed (`project_id` / `event_id` / `at` / `kind` / `subject` / `detail`, `PRIMARY KEY (project_id, event_id)`, the `length(...) > 0` CHECKs, `idx_audit_at`), the full seven-kind vocabulary with an explicit instruction not to narrow it, and the two keyset indexes in the same step.

Decision IDs were allocated from **P5-D31 upward** to avoid a third collision after `P5-D21` was taken twice.

**P5-D32 — the gate edit ships with the table.** See Deviations.

**P5-D33 — the audit row bound, derived not picked.** Stated in `settings.ts` in full: per-table default 50,000; ~1,000 audit events per generous engagement (500 triage decisions, ~150 projections, ~200 reveals, ~100 suppression changes, a few dozen exports); 50,000 × 4 = 200,000 ≈ 200 engagements. Four times rather than one *because* D-06 removes the age bound, so the row bound must carry alone the horizon that rows and age carry jointly elsewhere. Byte ceiling stated both ways: ~350 B/row worst case → ~70 MB; ~120 B/row realistic → ~24 MB.

**P5-D34 — `auditMaxRows` required, not optional.** An optional field would have let all twelve construction sites silently inherit a default. That is precisely how a retention bound goes wrong invisibly, so the field is required and the compiler named every site.

**P5-D35 — STORE-08 left unmarked.** See "Requirement status" below.

## Deviations from Plan

### Auto-fixed and directed changes

**1. [Coordinator direction + bisect hygiene] The task-2 gate edit was folded into the task-1 commit**
- **Found during:** Task 1, confirmed by running the gate.
- **Issue:** The plan assigns `migrations.ts` to task 1 and `schema.spec.ts` to task 2. Executed literally, task 1's commit would have shipped a table the schema gate does not know about — three failing assertions, committed. Verified by running it: `EXPECTED_TABLES` exact-set, the per-table column check, and `audit has no allowlist entry` all failed.
- **Fix:** `EXPECTED_TABLES`, `COLUMN_ALLOWLIST` and the doc comment moved into `7d670a2`. The coordinator's message directed exactly this ("close it in the same commit that adds the table, not afterwards").
- **Verification:** `git diff -U0` on `migrations.ts` shows additions only; all three gates green at `7d670a2`.
- **Committed in:** `7d670a2`
- **Note:** the plan's task boundary and the shipped commit boundary therefore differ. Recorded in `.planning/WINDOWS.md` as a `deviation` so it is visible at ship time.

**2. [Rule 1 — consequence of a widened return shape] Five pre-existing assertions updated**
- **Found during:** Task 3.
- **Issue:** `RetentionSweepSummary` gained `auditDeleted` and `retentionCounts` gained `audit`, so four `toEqual` assertions on counts and one on the global-scope summary failed.
- **Fix:** each expectation gained the new field. All four count assertions expect `audit: 0`, which is itself worth having — an audit row must never appear as a side effect of an unrelated sweep.
- **Committed in:** `82f9705`

**3. [Rule 3 — blocking] Twelve `RetentionBounds` literals widened**
- **Found during:** Task 3, surfaced by `tsc`.
- **Issue:** making `auditMaxRows` required broke every inline bounds literal in `retention.spec.ts`.
- **Fix:** all twelve given `auditMaxRows: HUGE_ROWS` (a new sibling to the existing `HUGE_AGE`), so a test about the artifact bounds does not silently become a test about the audit cap. **All twelve were in the spec** — the production path goes through `getRetentionBounds` and needed no change.
- **Committed in:** `82f9705`

**4. [Rule 3 — blocking] Lint and knip cleanups**
- `AUDIT_LIST_DEFAULT_LIMIT` had an `@internal` tag that `knip` reported as unused, because the spec imports it. The tag was a claim the code contradicted; removed, with the reason stated in the `ERROR_MAX`/IN-11 voice.
- The audit failing-delete test's stub handle was rewritten to match the existing `dbWhereDeletesFail` precedent, which also cleared three `require-await` errors.
- Prettier autofixes across the four touched spec files.

---

**Total deviations:** 4 (1 directed task-boundary change, 1 Rule 1, 2 Rule 3). **Impact:** no scope creep. Deviation 1 changes which commit carries a file, not what ships. Deviations 2–4 are the mechanical consequences of two widened types plus tooling hygiene.

## Requirement status — read this before marking anything

**STORE-08 is deliberately left unchecked, against the mechanical gate's advice.**

`requirements.ready-ids` reported STORE-08 ready to mark complete. It is wrong here, through no fault of its own: it inspects *sibling plans in this phase* and cannot see that STORE-08's own text spans three tables across two phases —

> **STORE-08**: Schema coverage for `entities`, `evidence` and `audit` … `entities` and `evidence` are owned by Phase 4 (SEC-*); `audit` by Phase 5.

`grep -c "CREATE TABLE IF NOT EXISTS entities\|evidence" migrations.ts` returns **0**. Marking STORE-08 Complete would assert two tables that do not exist — the same "the comment says four while the array holds five" drift shape this repo keeps catching, and one nobody re-reads once it is a checkbox. `requirements-completed` is therefore `[]`.

**What the operator may want to do:** split STORE-08 the way STORE-01 → STORE-08 was split on 2026-08-21, so the `audit` third can be closed now and the Phase 4 two-thirds tracked separately. That is a requirements-structure decision, not this plan's to take.

## Issues Encountered

- **`state.update-progress` withheld its percentage again** — `progress percent withheld by buildStateFrontmatter — STATE.md left unchanged`. This is the **sixth consecutive occurrence** in Phase 05 (waves 1–5 recorded the previous five). Recorded so the run stays visible rather than being rediscovered. `state.advance-plan` was correct this time: 6 → 7, matching 6 SUMMARY files on disk, and it was invoked **exactly once**.
- **`state.add-decision` rejects paths outside the repo.** The first five attempts wrote to `/tmp` and returned `{"added": false, "reason": "Path escapes allowed directory"}` — a *silent-looking* failure in that the command exits 0. Re-run from a repo-local temp directory; all five landed. Worth knowing: the `--summary-file` flag is repo-scoped.
- **`roadmap.update-plan-progress` ran before this SUMMARY existed** and recorded 5/12; re-run after the file landed.

## Threat Flags

None. Every surface this plan adds was in the plan's `<threat_model>` (T-05-26 … T-05-31) and each disposition is implemented: all seven kinds present from the first step (T-05-26), `detail` redacted before binding with the static gate covering the module (T-05-27), project predicate plus a behavioural cross-project test (T-05-28), DO NOTHING with the zero-changes replay asserted (T-05-29), the raised row bound swept oldest-first with an explicit tie-break (T-05-30), and both exact gate sets edited behind an operator checkpoint (T-05-31).

## Known Stubs

None. `grep -nE "TODO|FIXME|placeholder|coming soon|not available|\.skip\(|\.todo\("` over all eight files returns nothing. Every `<verify>` in the plan was executed.

The four kind values without callers (`triage_set`, `suppression_create`, `suppression_remove`, `finding_projected`) are **not** stubs — they are shipped, constrained, writable schema values, deliberately complete ahead of their call sites for the reason the operator approved at the checkpoint. The deferred pass after Phase 4 adds call sites, not a migration.

## Carried disclosure — the SQLite version residual

The index-direction *performance* result behind the two new keyset indexes was measured on **SQLite 3.51.0 and 3.53.4, not on Caido's shipped 3.46.0** — no 3.46 binary is reachable on this machine. The operator chose at the Wave 1 boundary to proceed with this **disclosed rather than closed**. It is stated as such in `migrations.ts`'s step-v3 doc comment and narrowed to a 3.46 → 3.51 window; it is nowhere claimed as verified on the shipped runtime.

The **correctness** half is independent of any query plan: the row-value cursor `(a, b) < (?, ?)` requires a uniform sort direction to mean "the next page" at all, which is a property of the comparison, not of the optimiser.

## Verification

| Gate | Result |
|---|---|
| `pnpm test` | **1732 passed**, 45 files |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm knip` | exit 0 |
| `pnpm check:bundle` | exit 0 — shipped import set is one specifier, `crypto` |
| `pnpm vitest run packages/backend/src/store` | **389 passed**, 8 files |
| `git diff` on `migrations.ts` | additions only; no line inside v1 or v2 modified or removed |

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 05-07 has what it needs:** `idx_artifacts_keyset` and `idx_observations_keyset` exist with uniform `DESC, DESC` on both non-project columns. 05-07's `reads.ts` `ORDER BY` directions must match them exactly — a mixed direction is a correctness problem for the row-value cursor, not merely a speed one.
- **The deferred pass after Phase 4** adds call sites for the four uncalled kinds. It needs no migration step. Call sites mint `eventId` from the runtime's UUID function, already inside the approved `crypto` import.
- **Open for the operator:** whether to split STORE-08 so its `audit` third can be closed (see "Requirement status").
- **No blockers.**

---
*Phase: 05-workspace-operator-workflow*
*Completed: 2026-08-28*

## Self-Check: PASSED

- All 3 created files present on disk (`audit.ts`, `audit.spec.ts`, this SUMMARY).
- All 6 commits present in `git log` (`7d670a2`, `786133e`, `6165407`, `66d0ed1`, `82f9705`, `fd4f3b9`).
- Working tree clean.
- `.planning/REQUIREMENTS.md` untouched by this plan — CORE-11's byte-compared `DERIVED RESIDUAL` span was not at risk and was not modified.
- All plan-level `<verification>` commands re-run and green (see the Verification table above).
