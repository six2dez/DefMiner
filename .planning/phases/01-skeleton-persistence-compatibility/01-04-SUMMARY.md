---
phase: 01-skeleton-persistence-compatibility
plan: 04
subsystem: persistence
tags: [sqlite, migrations, schema-gate, retention, ast-gate, content-addressing, cache, node-sqlite]

requires:
  - phase: 01-skeleton-persistence-compatibility
    plan: 01
    provides: "migration step v1 (`artifacts`, `observations`), the settled `upsertArtifact` / `recordObservation` signatures, the memoised db handle, and packages/engine's threshold set"
  - phase: 01-skeleton-persistence-compatibility
    plan: 02
    provides: "the two-package pnpm workspace, tsconfig projects, eslint/knip config and the 8-file / 177-assertion baseline this plan had to preserve"
provides:
  - "Migration step v2: `analyses` (PK project_id, sha256, detector_set_hash) and `settings` (PK project_id, key), plus two BEFORE INSERT triggers that retrofit the non-empty project_id invariant onto the immutable v1 tables"
  - "`migrate()` returning a structured MigrationReport — version/from/head/ahead/ok/steps — so a migration failure is legible instead of silent"
  - "`sweepRetention(db, projectId, bounds, nowMs) -> {examined, deleted, moreWork}` — the FROZEN signature plan 01-03's consumer schedules"
  - "`claimAnalysis` / `finishAnalysis` / `isAnalysed` plus DETECTOR_CORPUS_VERSION and isCorpusSentinel — CORE-08's cache with the corpus version IN THE KEY"
  - "`getSetting` / `putSetting` / `resolveSetting` / `getRetentionBounds` with three-level resolution and documented conservative defaults"
  - "schema.spec.ts — a STRUCTURAL gate reading PRAGMA table_info key ordinals and an explicit column allowlist, not DDL text"
  - "migrations.spec.ts — the ladder run forward over a POPULATED database, twice, plus a simulated failing step"
  - "sql-discipline.spec.ts — a pure auditSource(file, source) over the TypeScript AST with every rule's failing path executed"
  - "packages/backend/test/fixtures/sqlite-fixture.ts — a Caido-shaped node:sqlite handle whose header states the pool-affinity limit it cannot reproduce"
affects: [01-03, 01-05, 01-06, phase-2-observability, phase-3-detectors, phase-4-secrets]

actuals:
  tokens: 35119
  tasks: 3
  commits: 3

tech-stack:
  added:
    - "node:sqlite (Node 26 built-in, test-only — never bundled; the DIST-05 gate confirms the shipped bundle imports only `crypto`)"
    - "typescript compiler API used as a TEST PARSER for the store AST gate (acorn cannot parse .ts; check-bundle-imports.mjs keeps acorn because it reads the emitted bundle)"
  patterns:
    - "Retrofit an invariant onto an immutable migration step with a TRIGGER, never a table rebuild — a rebuild is a multi-statement migration that can fail"
    - "Structural schema assertions: read PRAGMA table_info key ordinals, never the CREATE TABLE text"
    - "Column allowlist as a privacy mechanism — adding a column is a deliberate two-place edit"
    - "The cache key carries the invalidator: detector_set_hash is IN the primary key, so a stale-corpus hit is not expressible"
    - "Static gates with a PURE core, so every rule's failing path runs against a fixture in the same file"
    - "Mutate the REAL source, not only the fixtures — two gate bugs were only visible that way"
    - "Cascade children-first so an exhausted budget leaves a parent with fewer children and never a child with no parent"

key-files:
  created:
    - packages/backend/src/store/analyses.ts
    - packages/backend/src/store/settings.ts
    - packages/backend/src/store/retention.ts
    - packages/backend/src/store/schema.spec.ts
    - packages/backend/src/store/migrations.spec.ts
    - packages/backend/src/store/artifacts.spec.ts
    - packages/backend/src/store/retention.spec.ts
    - packages/backend/src/store/sql-discipline.spec.ts
    - packages/backend/test/fixtures/sqlite-fixture.ts
  modified:
    - packages/backend/src/store/migrations.ts
    - packages/backend/src/store/artifacts.ts
    - packages/backend/src/store/observations.ts
    - packages/backend/src/store/db.ts
    - packages/backend/src/index.ts
    - packages/backend/tsconfig.json

key-decisions:
  - "P4-D6 (new, forced): STORE-02's non-empty project_id invariant is retrofitted onto the v1 tables by BEFORE INSERT TRIGGERS, not by CHECK constraints. v1 is immutable and SQLite has no ALTER TABLE ADD CONSTRAINT; the only alternative was a create-copy-drop-rename rebuild, which is a multi-statement migration that CAN fail and would therefore strand an open write transaction on an unreachable pooled connection. Unlike PRAGMA foreign_keys (P4-D3), a trigger is stored IN THE SCHEMA and binds on every pooled connection."
  - "P4-D7 (new): the row-count and age bounds are enforced PER TABLE PER PROJECT, so `observations` and `analyses` are capped in their own right and not only through the artifact cascade. Real traffic upserts one artifact and inserts a new observation on every re-serve, so an artifact-only bound leaves the fastest-growing table unbounded."
  - "P4-D8 (new): `failed` is a TERMINAL scan_state in Phase 1, so a failed analysis is a cache hit. With no retry policy and no failure taxonomy until ERR-02, a re-analysable `failed` would re-walk the same bytes on every sighting with nothing to break the loop. The row and its `error` survive for Phase 2 to classify."
  - "migrate() now returns a MigrationReport rather than a number. Caido surfaces neither a throw nor a rejection, so an unguarded step rejection would leave the plugin running against a schema it does not have. A failing step stops the ladder and does NOT advance user_version past it, so the next boot retries rather than skips."
  - "The test fixture uses node:sqlite and every pool-affinity behaviour is marked live-only rather than faked (P4-D5, as planned). Verified this session against Node 26.7.0 / SQLite 3.53.4: ON CONFLICT DO UPDATE, ON CONFLICT DO NOTHING, PRAGMA user_version, PRAGMA table_info key ordinals and triggers with RAISE(ABORT) all behave as the gates need."
  - "The AST gate parses with the TypeScript compiler, not acorn. Acorn cannot parse .ts; scripts/ci/check-bundle-imports.mjs keeps acorn because it reads the EMITTED bundle where the types are gone. knip does not report `typescript` as unlisted, so no manifest change was needed."

requirements-completed: [STORE-01, STORE-02, STORE-04, STORE-05, STORE-06, STORE-07, CORE-08]

coverage:
  - id: D1
    description: "Four tables — artifacts, observations, analyses, settings — every one with project_id in its PRIMARY KEY, verified by reading each table's key ORDINALS from PRAGMA table_info rather than by reading the DDL text; the table set is exact, so a fifth table fails as loudly as a missing one"
    requirement: "STORE-01, STORE-02"
    verification:
      - kind: unit
        ref: "vitest packages/backend/src/store/schema.spec.ts (9 tests)"
        status: pass
      - kind: other
        ref: "failure fixture executed: a fifth table added to step v2 fails 3 assertions"
        status: pass
      - kind: e2e
        ref: "bash scripts/phase1/tracer-e2e.sh — getStatus().schemaVersion reads 2 against a real Caido 0.57.1 / SQLite 3.46.0, which migrate() only reports after step v2's DDL exec succeeded on the pooled connection"
        status: pass
    human_judgment: false
  - id: D2
    description: "No column in any table can hold a response body, a header value, a cookie or a secret, enforced by an explicit per-table column allowlist that a new column must be added to deliberately; value_raw (SEC-04) and path_key (DIFF-01, v2) are named as forbidden rather than merely absent"
    requirement: "STORE-01"
    verification:
      - kind: unit
        ref: "vitest packages/backend/src/store/schema.spec.ts#every column across every table is on the explicit allowlist"
        status: pass
      - kind: other
        ref: "failure fixture executed: a value_raw column added to step v2 fails 2 assertions and the message names SEC-04"
        status: pass
    human_judgment: false
  - id: D3
    description: "The migration ladder runs forward on a POPULATED database without losing or altering a row (3 seeded rows compared whole, not counted), is a no-op on a second run that records only the version read, refuses to move backwards from a version above head, and stops at a failing step without advancing user_version past it"
    requirement: "STORE-05"
    verification:
      - kind: unit
        ref: "vitest packages/backend/src/store/migrations.spec.ts (7 tests)"
        status: pass
      - kind: other
        ref: "step v1 proven BYTE-IDENTICAL to the eebd796 revision by extracting and comparing the literal (844 bytes)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Identical content is stored and hashed once per project and twice across two projects; an empty project_id is rejected at write time on artifacts, observations and analyses, asserted on BOTH the reported outcome and the resulting row count"
    requirement: "STORE-02"
    verification:
      - kind: unit
        ref: "vitest packages/backend/src/store/artifacts.spec.ts (16 tests)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The three silent binding behaviours are proven on a real SQLite: two adjacent placeholders bind left-to-right (proven by ALSO running them reversed and showing the columns swap), a null parameter binds SQL NULL and is not found by equality against the four-character string, and a parameterless statement runs with zero arguments"
    requirement: "STORE-07"
    verification:
      - kind: unit
        ref: "vitest packages/backend/src/store/artifacts.spec.ts#positional binding (STORE-07) — 3 tests"
        status: pass
    human_judgment: false
  - id: D6
    description: "A second sighting of a digest already analysed at the current corpus version updates last_seen_at, seen_count and the observation, and creates NO new analysis row; the same digest at a different detector_set_hash creates exactly one more; a pending analysis is not a cache hit and an analysis in one project is not a cache hit in another"
    requirement: "CORE-08, STORE-04"
    verification:
      - kind: unit
        ref: "vitest packages/backend/src/store/artifacts.spec.ts#the corpus-version cache (CORE-08, STORE-04) — 6 tests"
        status: pass
    human_judgment: false
  - id: D7
    description: "Database growth is bounded by row count AND age, per table per project, with a per-pass cap that is honoured and reported, convergence to moreWork false, project isolation counted before and after, and zero orphans counted directly"
    requirement: "STORE-06"
    verification:
      - kind: unit
        ref: "vitest packages/backend/src/store/retention.spec.ts (15 tests)"
        status: pass
    human_judgment: true
    rationale: "The BEHAVIOUR is fully proven and the signature is frozen, but the mitigation for T-01-22 is only real once the sweep is INVOKED — and the call site is plan 01-03's consumer loop, which does not exist yet. Nothing in a running plugin trims today. This is by design (the plan assigns the schedule to 01-03), but until 01-03 lands, 'database growth is bounded' is true of the function and not yet of the product."
  - id: D8
    description: "Every SQL string and every bind call site under packages/backend/src/store passes a static AST gate covering named parameters, exec arity, array-vs-spread binds, interpolated and concatenated SQL, RETURNING, last_insert_rowid, module-scope statements and awaits, and project_id scoping on multi-row statements — with an explicit non-vacuity guard on both the file list and the SQL count"
    requirement: "STORE-07"
    verification:
      - kind: unit
        ref: "vitest packages/backend/src/store/sql-discipline.spec.ts (21 tests, 10 of them failing-path fixtures)"
        status: pass
      - kind: other
        ref: "3 mutations of the REAL source executed: a colon-prefixed parameter in artifacts.ts, a dropped project_id predicate in GET_ARTIFACT_SQL, and an array argument to all() — each fails the file-level gate"
        status: pass
    human_judgment: false
  - id: D9
    description: "The tracer's proven write path is untouched: upsertArtifact and recordObservation are byte-identical to what plan 01-01 shipped, so plan 01-03's call sites bind unchanged"
    requirement: "STORE-03"
    verification:
      - kind: other
        ref: "both exported declarations extracted from eebd796 and from HEAD and compared byte-for-byte — identical; git diff over the two modules shows removed lines only in the two list* READ helpers"
        status: pass
      - kind: e2e
        ref: "bash scripts/phase1/tracer-e2e.sh — 1 artifact row with seen_count 2, 2 observations with distinct request ids, digest equal to shasum -a 256, against the expanded schema"
        status: pass
    human_judgment: false
  - id: D10
    description: "The Phase 0 harness and the phase-1 gates are all intact and the shipped bundle is unaffected by the test-only node:sqlite fixture"
    verification:
      - kind: other
        ref: "pnpm test 8 files / 177 assertions before -> 13 files / 245 after, all three Phase 0 gates present; pnpm typecheck, pnpm lint and pnpm knip all exit 0; pnpm check:bundle reports the bundle's only import specifier is `crypto`; git status --porcelain over scripts/spike tests probe corpus caido.config.ts is clean"
        status: pass
    human_judgment: false

duration: 28 min
completed: 2026-08-21
status: complete
---

# Phase 1 Plan 04: Full Schema, Corpus-Version Cache, Retention and the SQL Discipline Gate Summary

**Four tables behind a forward-only ladder proven over seeded data, a corpus version carried in the primary key so a stale cache hit is not expressible, a bounded retention sweep whose signature plan 01-03 can call unchanged, and three gates that read structure and source rather than trusting comments — with every gate's failing path executed and two of the gate's own bugs found by mutating the real code.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-08-20T21:38:18Z
- **Completed:** 2026-08-20T22:06:30Z
- **Tasks:** 3 of 3
- **Files modified:** 15 (9 created, 6 modified)

## Accomplishments

- **Step v2 shipped and step v1 was not touched — proven, not asserted.** The v1 literal was extracted from `eebd796` and from `HEAD` and compared byte-for-byte: identical, 844 bytes. `analyses` carries the corpus version in its primary key and a closed five-value `scan_state`; `settings` reserves the empty `project_id` for global rows.
- **The immutable-step problem had a real answer, and it was not the obvious one.** STORE-02 wants `length(project_id) > 0` on `artifacts` and `observations`, both of which shipped in v1 without it, and SQLite has no `ALTER TABLE ADD CONSTRAINT`. The obvious fix — a create-copy-drop-rename rebuild — is a multi-statement migration that CAN fail, and a failed multi-statement `exec` on this driver strands an open write transaction on a pooled connection nothing in the plugin API can reach. Two `BEFORE INSERT` triggers do the same job in one idempotent statement each, destroy no data, and — unlike `PRAGMA foreign_keys` — live in the schema and therefore bind on every connection the pool hands out.
- **The schema gate reads structure, and the difference is demonstrable.** It enumerates tables from `sqlite_master`, reads each column's one-based `pk` ordinal from `PRAGMA table_info`, and checks every column against an explicit per-table allowlist. Both failure paths were executed: a fifth table in step v2 fails three assertions; a `value_raw` column fails two and the message names SEC-04.
- **The migration gate runs over a POPULATED database and compares rows whole.** Three seeded artifacts, distinct on every column, survive the ladder with identical values — not a count, the values. A second `migrate()` records only `read_user_version` and touches nothing. A database at `head + 5` is left alone and reported as `ahead` rather than downgraded. And a rejecting handle proves a failing step stops the ladder without advancing `user_version` past it, so the next boot retries instead of running on a half-built schema.
- **CORE-08's cache carries its own invalidator.** `detector_set_hash` is part of the primary key, not a column beside it, so a corpus bump invalidates exactly the analyses at the old value and a stale hit cannot be expressed. A second sighting at the current version moves `seen_count` to 2 and adds an observation while the analysis count stays put; the same digest at a different corpus hash adds exactly one.
- **The retention sweep bounds both axes on every table, and the second half of that was not in the first draft.** Real traffic upserts one artifact and inserts a *new* observation on every re-serve, so an artifact-only bound leaves the fastest-growing table unbounded. Both bounds now apply per table per project. The age predicate is strict, so a row exactly at the cutoff survives and one millisecond older does not.
- **The AST gate has a pure core, so every rule's failing path runs.** `auditSource(file, source)` returns violations; ten synthetic fixtures exercise named parameters in all three prefixes, a single array argument to a bind call, `exec` with a second argument, interpolated and concatenated SQL, `RETURNING`, `last_insert_rowid()`, module-scope statements and awaits, and an unscoped multi-row query. The migration `PRAGMA` is the one allowlisted interpolation, and the exemption is proven scoped to that file *and* that PRAGMA.
- **Mutating the REAL source found two bugs the synthetic fixtures could not.** Both are written up under Deviations. Neither would have been visible from a green run.
- **The live slice still passes against the expanded schema.** `scripts/phase1/tracer-e2e.sh` on a real Caido 0.57.1: digest `cec8f860…6d44` read back equal to `shasum -a 256`, one artifact row with `seen_count 2`, two observations with distinct request ids, `sqliteVersion 3.46.0`, **`schemaVersion 2`**. That last number is the live proof that step v2's DDL — tables, indexes, CHECK constraints and both triggers — applied on the pooled connection, because `migrate()` only reports a version it has already written.

## Task Commits

1. **Task 1: the full schema, the forward-only ladder, and a schema gate that reads key ordinals** — `0aca814`
2. **Task 2: content-addressed writes and the corpus-version cache** — `fdc7e77`
3. **Task 3: retention sweep and the static SQL-discipline gate** — `add75ce`

**Plan metadata:** see the `docs(01-04)` commit following this summary.

## Files Created/Modified

**Schema and migrations**
- `packages/backend/src/store/migrations.ts` — step v2 appended; step v1 byte-unchanged. `migrate()` rewritten around the `safe()`/`step()` shape from `probe/tier0-budgets/backend/script.js:195-212` and now returns `MigrationReport { version, from, head, ahead, ok, steps }`.
- `packages/backend/src/store/db.ts` — `readSqliteVersion(db)` added, memoised process-wide. One place knows which SQLite is underneath; `resetDbHandle()` deliberately does not clear it, because a project change invalidates the handle and not the engine.
- `packages/backend/src/index.ts` — consumes the report: logs an incomplete migration with the failing step's name and error, logs an `ahead` database, and reads the SQLite version through `store/db.ts`.

**Stores**
- `packages/backend/src/store/analyses.ts` — `claimAnalysis` (one `INSERT … DO NOTHING`, then one read, because there is no `RETURNING` and `last_insert_rowid()` is unusable on the pool), `finishAnalysis`, `isAnalysed`, `getAnalysis`, `countAnalyses`, plus `DETECTOR_CORPUS_VERSION` and `isCorpusSentinel`.
- `packages/backend/src/store/settings.ts` — `getSetting` / `putSetting` / `resolveSetting`, `GLOBAL_PROJECT_ID`, and `getRetentionBounds` with three-level resolution and a fallback for a stored bound that parses to `NaN` or `<= 0`.
- `packages/backend/src/store/retention.ts` — `sweepRetention` and `retentionCounts`. Frozen signature and return shape.
- `packages/backend/src/store/artifacts.ts`, `observations.ts` — **reads only**. `getArtifact`, `countArtifacts`, a deterministic `listArtifacts` with an optional limit; `countObservations` and a `listObservations` that takes an optional digest as two complete literal statements rather than one assembled string. Both write functions untouched.

**Gates and fixture**
- `packages/backend/src/store/schema.spec.ts` — 9 tests.
- `packages/backend/src/store/migrations.spec.ts` — 7 tests.
- `packages/backend/src/store/artifacts.spec.ts` — 16 tests.
- `packages/backend/src/store/retention.spec.ts` — 15 tests.
- `packages/backend/src/store/sql-discipline.spec.ts` — 21 tests, 10 of them failing-path fixtures.
- `packages/backend/test/fixtures/sqlite-fixture.ts` — the Caido-shaped `node:sqlite` adapter, with the honest-limit header.
- `packages/backend/tsconfig.json` — `include` widened by `test/**/*.ts`.

## Decisions Made

- **P4-D6 — triggers, not a table rebuild.** Recorded above and in `migrations.ts` where the next person will look. The trigger wins on every axis: one statement, `IF NOT EXISTS`, destroys no data, and in force on every pooled connection.
- **P4-D7 — the row and age bounds are per table.** The plan's own words were "a maximum row count per table per project"; the first implementation drove everything from `artifacts` and would have left a project inside the artifact bound holding unbounded sightings of those artifacts. `retention.spec.ts` has a test whose name says so.
- **P4-D8 — `failed` is terminal in Phase 1.** Stated in `analyses.ts` with the reason: no retry policy and no failure taxonomy until ERR-02, so a re-analysable `failed` re-walks the same bytes on every sighting with nothing to break the loop.
- **Ownership of a claim is decided by the READ, not by `changes`.** The insert's `changes` count would probably work, but "probably" is not a property this codebase spends; the read is authoritative regardless of how the pool reports affected rows and costs one indexed lookup on a key the caller already holds.
- **The AST gate parses with TypeScript, not acorn.** Acorn cannot parse `.ts`. `scripts/ci/check-bundle-imports.mjs` correctly keeps acorn — it reads the emitted bundle, where the types are already gone. The walk shape and the reason for a walk over a regex are unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing Critical] The static gate's `project_id` check read the whole SQL string, so a column list satisfied it**

- **Found during:** Task 3, running a mutation against the *real* source rather than only against the synthetic fixtures.
- **Issue:** the rule tested `/project_id/` against the entire statement. `GET_ARTIFACT_SQL` begins `SELECT project_id, sha256, …`, so removing `project_id = ?` from its `WHERE` clause left the gate green — while the query became a cross-project read that helpfully reports, in every row it should not have returned, the project id it ignored. Exactly the T-01-20 failure the gate exists to prevent.
- **Fix:** the check now reads the PREDICATE — the text from the first `WHERE` onward — and a multi-row statement over a non-`settings` table with no `WHERE` at all is a violation too.
- **Verification:** the same real-source mutation now fails with `unscoped-multi-row: … does not scope on project_id in its WHERE clause`. A regression fixture (`project_id in the SELECT LIST is not scoping — only the predicate counts`) asserts both directions.
- **Files modified:** `packages/backend/src/store/sql-discipline.spec.ts`.
- **Committed in:** `add75ce`.

**2. [Rule 1 — Bug] `ON CONFLICT … DO UPDATE SET` was classified as a multi-row UPDATE over a table named `set`**

- **Found during:** Task 3, immediately after fixing deviation 1 — which is how it surfaced: the old whole-string match had been hiding it.
- **Issue:** `isMultiRowStatement` asked whether the text *contained* `UPDATE`, and `tablesReferenced` matched `UPDATE\s+(\w+)`. Every upsert in the package ends `ON CONFLICT … DO UPDATE SET`, so all three upserts read as multi-row UPDATEs over a table called `set`, and once the predicate check landed they demanded a `WHERE` clause an INSERT does not have. Three real files failed the gate for a reason that was entirely the gate's.
- **Fix:** statements are classified by their LEADING keyword (`statementKind`), so an upsert is the single-row INSERT it actually is; and a `NOT_A_TABLE` set excludes SQL keywords that can follow `FROM`/`INTO`/`UPDATE`/`JOIN`.
- **Verification:** a fixture (`an upsert is not a multi-row UPDATE just because it says DO UPDATE SET`) asserts the real upsert shape produces zero violations, and the five real store modules pass.
- **Files modified:** `packages/backend/src/store/sql-discipline.spec.ts`.
- **Committed in:** `add75ce`.

**3. [Rule 3 — Blocking] `packages/backend/tsconfig.json` did not include `test/**`**

- **Found during:** Task 1, wiring the fixture the plan places at `packages/backend/test/fixtures/sqlite-fixture.ts`.
- **Issue:** the backend project's `include` was `["src/**/*.ts"]`, so a spec importing a module outside the file list is a `tsc --build` error.
- **Fix:** `include` widened to `["src/**/*.ts", "test/**/*.ts"]`, with a comment recording that nothing under `test/` is reachable from `src/index.ts` and that the DIST-05 gate reads the shipped artifact, which is the only place the "does `node:sqlite` reach QuickJS" question can be answered honestly.
- **Verification:** `pnpm typecheck` exits 0; `pnpm check:bundle` reports the bundle's only import specifier is `crypto`.
- **Files modified:** `packages/backend/tsconfig.json`.
- **Committed in:** `0aca814`.

**4. [Rule 3 — Blocking] `migrate()`'s return type changed, so `index.ts` changed with it**

- **Found during:** Task 1.
- **Issue:** the plan requires `migrate()` to return the structured `safe()`/`step()` record so `init()` can log it. `migrate()` previously returned `Promise<number>` and `index.ts` assigned it straight to `schemaVersion`.
- **Why this is safe to do here:** `migrate` is not one of the frozen signatures. `index.ts` is its only caller, no sibling plan is rewriting that line, and wave 3 runs before wave 4.
- **Fix:** `index.ts` reads `migration.version` and additionally logs an incomplete migration (naming the failing step and its error) and an `ahead` database.
- **Files modified:** `packages/backend/src/index.ts`.
- **Committed in:** `0aca814`.

**5. [Rule 2 — Missing Critical] The retention bounds applied to `artifacts` only**

- **Found during:** Task 3, writing `retention.ts` against the requirement's own wording, "a maximum row count per table per project".
- **Issue:** the first implementation selected victim artifacts and cascaded; `observations` and `analyses` were only ever removed as children. A project inside the artifact bound could therefore hold an unbounded number of sightings of those artifacts — which is precisely the shape real traffic produces, since the artifact row is upserted and a new observation row is inserted on every re-serve.
- **Fix:** a `trimChildTable` pass applies BOTH bounds to `observations` and `analyses` in their own right, oldest first with an explicit tie-break, within the same per-pass budget. Deleting a child cannot orphan anything, so it runs after the cascade and needs no dependency ordering of its own.
- **Verification:** `retention.spec.ts` has a test for the per-table row bound and one for the per-table age bound (an observation exactly at the cutoff survives while its artifact stays untouched).
- **Files modified:** `packages/backend/src/store/retention.ts`, `retention.spec.ts`.
- **Committed in:** `add75ce`.

**6. [Rule 3 — Blocking, cosmetic] Two `eslint` rules objected to deliberate shapes**

- **Found during:** Task 1.
- **Issue:** `@typescript-eslint/require-await` flagged the fixture's adapter methods, which are `async` with no `await` on purpose — `node:sqlite` throws synchronously where Caido's driver rejects, and the async wrapper is what makes an error-path spec exercise the same code path production takes.
- **Fix:** a file-scoped `eslint-disable` with that reasoning written out, plus two genuinely unnecessary type assertions removed and one `it()` made non-async.
- **Files modified:** `packages/backend/test/fixtures/sqlite-fixture.ts`, `packages/backend/src/store/migrations.spec.ts`.
- **Committed in:** `0aca814`.

---

**Total deviations:** 6 auto-fixed (2 missing-critical, 1 bug, 3 blocking).
**Impact on plan:** no scope creep and no signature changes to anything another plan depends on. Deviations 1, 2 and 5 make three claims TRUE that the plan states and that a green run would otherwise have merely asserted. Deviations 3, 4 and 6 are mechanical consequences of the plan's own file layout and its stated requirement for a structured migration record.

## Issues Encountered

- **`ROWS_INSERTED_PER_ARTIFACT_MAX = 3` still holds.** Nothing in this plan inserts a fourth row per processed artifact — the sweep inserts nothing at all, and the three insert paths are unchanged (`artifacts` upsert, `observations` insert, `analyses` claim). `retention.spec.ts` asserts the constant is 3 and that the per-pass cap dominates it, against the same constants `retention.ts` reads.
- **The triggers' rejection path is proven on the fixture, not live.** The tracer never writes an empty `project_id`, so there is no live path that fires them. What the live run *does* prove is that the trigger DDL applied on the real pooled connection (`schemaVersion 2` is only reported after the step's `exec` succeeds). A live negative would need a deliberate bad write, which no code path has.
- **The `node:sqlite` fixture is more forgiving than the real driver, and that is stated where it matters.** `last_insert_rowid()` works fine under it and is unusable on the pool; a single connection cannot strand a transaction. The fixture header says so in the strongest terms and `sql-discipline.spec.ts` is what catches those statically instead.
- **`git commit -m` with backticks in a double-quoted shell string mangled one message.** Caught immediately by reading the message back; amended from a heredoc file. Worth remembering for any future long commit body.

## User Setup Required

None.

## Next Phase Readiness

**Ready.**

- **Plan 01-03 (wave 4)** — the two things it needs from here are both frozen and both proven:
  - `sweepRetention(db, projectId, bounds, nowMs)` returns `{ examined, deleted, moreWork }`. `bounds` is what `getRetentionBounds(db, projectId)` produces. Schedule one bounded pass per `RETENTION_SWEEP_EVERY_N` processed artifacts and DEFER on `moreWork` rather than looping — the delete rate is above the insert rate by construction, so deferral converges and a loop would only buy a long uninterruptible stretch. **01-03 carries the truth and the acceptance criterion proving a running plugin actually trims; until then, T-01-22's mitigation is a function nobody calls.**
  - `upsertArtifact` and `recordObservation` are byte-identical to plan 01-01's. `listArtifacts(db, projectId)` and `listObservations(db, projectId)` still compile with two arguments; the new parameters are optional.
  - Also available if the consumer wants them: `isAnalysed` / `claimAnalysis` / `finishAnalysis` with `DETECTOR_CORPUS_VERSION`, and `countArtifacts` / `countObservations` / `countAnalyses`.
  - `knip.json` still has `exports` and `types` at `warn` with a note saying 01-03 should restore both to `error`. This plan ADDED to that list (`SCAN_STATES`, `TERMINAL_SCAN_STATES`, `getAnalysis`, `getSetting`, `resolveSetting`, the two `*_DEFAULT_LIMIT` constants, `RETENTION_MAX_AGE_MS_KEY` and seven types). Most gain a consumer when 01-03 wires the consumer loop and Phase 5 builds a UI; anything still unconsumed at that point is a genuine finding and should be deleted rather than silenced.
- **Plan 01-05 (wave 5)** — `resetDbHandle()` is unchanged and still the project-change seam. Note that `readSqliteVersion`'s cache is deliberately NOT cleared by it, because the SQLite build does not change when the operator switches project.
- **Plan 01-06 (wave 6)** — nothing here touches `compat.ts`. The build is still `pnpm exec caido-dev build packages` and the package still lands at `packages/dist/plugin_package.zip`.
- **Phase 3** — `DETECTOR_CORPUS_VERSION` is `"phase1-no-corpus"` and `isCorpusSentinel()` is the discriminator. Replace the constant with a content hash of the rule corpus; every Phase 1 row is findable by that predicate, and because the version is in the primary key, a bump invalidates exactly the analyses at the old value with no migration.
- **Phase 2** — `analyses.scan_state = 'pending'` is the durable job queue ERR-02 and CORE-09 need; a `pending` row that survives a restart is the record that work was claimed and never finished. OBS-02 owns the degradation vocabulary and must not contradict the five values chosen here.

**Carried risk, unchanged:** `CACHE_HIT_RATE` still reads through the pessimistic `CACHE_HIT_RATE_ASSUMED = 0.4` because `CACHE_HIT_RATE_CROSS_DAY` is null with status `inconclusive` (open Broken Window #6, revisit after 2026-09-03). Nothing in this plan budgets against it; the cache's CORRECTNESS is proven and only its expected HIT RATE is unknown.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-21*

## Self-Check: PASSED

All 9 files named in `key-files.created` verified present on disk, all 6 in `key-files.modified` present and diffed against `eebd796`, and all three task commits (`0aca814`, `fdc7e77`, `add75ce`) verified in `git log`. Every `<acceptance_criteria>` from all three tasks was re-run at close-out, and the plan-level `<verification>` block was executed in full: `pnpm vitest run packages/backend/src/store` (5 files / 68 assertions, 0.38 s), `pnpm test` (13 files / 245 assertions), `pnpm typecheck && pnpm lint && pnpm knip` (all exit 0), and `bash scripts/phase1/tracer-e2e.sh` against a live Caido 0.57.1 — TRACER PASSED with `schemaVersion 2`. Run evidence committed at `results/runs/20260820T220535Z-13693/`.
