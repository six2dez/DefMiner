// packages/backend/src/store/migrations.ts — the forward-only migration ladder (STORE-05).
//
// SHIPPED STEPS ARE IMMUTABLE. Once a step has been released it is never edited:
// a user's populated database has already run it, so an edit changes the schema of
// new installs only and silently forks the two. Later columns arrive as NEW steps.
//
// Step v1 (the tracer, plan 01-01) creates `artifacts` and `observations`.
// Step v2 (plan 01-04) adds `analyses` and `settings`, plus the two write-time
// guards that retrofit STORE-02's non-empty `project_id` invariant onto the v1
// tables WITHOUT editing v1 — see the note on triggers above step v2.
// Step v3 (plan 05-06) adds `audit` — the fifth table, approved at this plan's
// one-way checkpoint (option-a, 2026-08-28) — and two direction-explicit keyset
// indexes on the v1 tables. Index additions, not table additions: the approved
// table set grew by exactly one.
// Step v4 (plan 05-07) adds the second keyset index per pageable table. No table.
// Step v5 (plan 06-01) adds `scans` — the sixth table, approved at that plan's
// blocking-human checkpoint (approve-as-specified, 2026-08-31) — plus one
// ordinary index and one PARTIAL UNIQUE index that makes the one-scan-per-project
// invariant a driver-level failure rather than a read-then-write this pool cannot
// make atomic.
// Steps v6 and v7 (plan 06-06) REBUILD `audit` to widen its closed `kind` CHECK
// by two members, approved at that plan's blocking-human checkpoint (2026-08-31).
// SQLite has no `ALTER TABLE ... DROP CONSTRAINT`, so a closed CHECK can only be
// changed by replacing the table that carries it — step v3 is NOT edited, and the
// approved table set does not grow: the replacement is renamed onto `audit`.
// THE REBUILD IS TWO STEPS AND NOT ONE. v6 creates the replacement and copies
// into it; v7 swaps the names. A `BEGIN`-less multi-statement `exec` is a
// SEQUENCE and not an atomic unit — the correction is argued at length on step
// v6's JSDoc — so the drop is put behind a durable `user_version` boundary from
// the copy, and each half is re-runnable from every state its own interruption
// can leave behind.

import type { Database } from "sqlite";

import { describeError } from "../telemetry";

// Caught exceptions render through `describeError`, never a bare stringification.
// The reasoning — a driver rejection carries the bound parameters, and one of them
// is the observation URL — is stated once beside the first converted site in
// `artifacts.ts`. Enforced by `error-redaction.spec.ts`.

/**
 * EVERY STATEMENT IN A STEP MUST BE ONE THAT CANNOT FAIL ON A RE-RUN. That is the
 * property, and it is the ONLY reason it is legal to batch a step into a single
 * multi-statement `exec`.
 *
 * The rule it depends on: a single `exec` string IS an atomic unit
 * (MULTISTATEMENT_EXEC_ATOMIC), but an `exec` that FAILS leaves an open write
 * transaction on a pooled connection that nothing in the plugin API can reach —
 * every subsequent write then fails with "database is locked" until the plugin
 * restarts (Pitfall 1). This is also why
 * `probe/tier0-budgets/backend/script.js:219-222` records a CREATE that landed
 * inside a dangling transaction and read back as "no such table": every table is
 * created UP FRONT, in `init()`, before any data write.
 *
 * THIS PARAGRAPH USED TO READ "DDL that cannot fail may be batched; a data write
 * never may", AND IT IS AMENDED RATHER THAN LEFT STANDING. `IF NOT EXISTS` is the
 * usual WAY of being unable to fail, not the property itself, and "a data write
 * never may" was a categorical restatement of a reason that is not categorical.
 * Step v6 batches a data write — the row copy inside a table rebuild — and a
 * sentence above the ladder may not go on forbidding what the ladder below it
 * does; a comment claiming a rule the code no longer follows is worse than no
 * comment. What is BINDING is unchanged and is now stated as the thing it always
 * was: a statement whose failure is possible does not belong in a batched `exec`,
 * whatever its keyword. Step v6's JSDoc makes that argument statement by
 * statement, and `migrations.spec.ts` gates every step in the ladder against the
 * list of forms somebody has actually made the argument for.
 *
 * NOTE ON `settings` AND THE EMPTY PROJECT ID: `project_id = ''` is RESERVED and
 * means "global — applies to every project". It is legal on `settings` ONLY. On
 * every other table an empty `project_id` is a project-scoping BUG, and step v2's
 * CHECK constraints and triggers make it fail at write time rather than write a
 * row no read will ever return.
 *
 * NOTE ON `artifacts`: there is deliberately NO `url` column. Identity is
 * content-addressed — the same bytes served from two URLs is ONE artifact — so the
 * URL is an attribute of an OBSERVATION. It is not discarded, it is moved to where
 * it belongs (decisions P1-D1 and P1-D6). No column in either table can hold body
 * bytes, headers, cookies or a secret value, and neither has a surrogate id:
 * `last_insert_rowid()` is unusable on this pooled connection, so a generated id
 * would be a row identity you can never read back.
 */
export const MIGRATIONS: ReadonlyArray<{ v: number; sql: string }> = [
  {
    v: 1,
    sql: `
CREATE TABLE IF NOT EXISTS artifacts (
  project_id    TEXT    NOT NULL,
  sha256        TEXT    NOT NULL,
  byte_len      INTEGER NOT NULL,
  kind          TEXT    NOT NULL,
  first_seen_at INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL,
  seen_count    INTEGER NOT NULL,
  PRIMARY KEY (project_id, sha256)
);
CREATE INDEX IF NOT EXISTS idx_artifacts_last_seen
  ON artifacts (project_id, last_seen_at);
CREATE TABLE IF NOT EXISTS observations (
  project_id   TEXT    NOT NULL,
  sha256       TEXT    NOT NULL,
  request_id   TEXT    NOT NULL,
  url          TEXT    NOT NULL,
  status       INTEGER NOT NULL,
  content_type TEXT,
  observed_at  INTEGER NOT NULL,
  PRIMARY KEY (project_id, sha256, request_id)
);
CREATE INDEX IF NOT EXISTS idx_observations_observed_at
  ON observations (project_id, observed_at);
`,
  },
  /**
   * Step v2 — plan 01-04. `analyses` and `settings`, and nothing else.
   *
   * WHY THE v1 TABLES GET TRIGGERS AND THE v2 TABLES GET CHECK CONSTRAINTS.
   *
   * STORE-02's invariant is that an empty `project_id` never reaches a
   * non-`settings` table: a row written under `''` is a row NOTHING will ever
   * find again, because every read is scoped by project. A `CHECK` in the DDL is
   * the natural way to say that — but `artifacts` and `observations` shipped in
   * step v1 WITHOUT one, v1 is immutable, and SQLite has no
   * `ALTER TABLE ... ADD CONSTRAINT`. The only alternatives were a 12-line
   * table rebuild (create-copy-drop-rename), which is a multi-statement
   * migration that CAN fail and would therefore strand an open write transaction
   * on an unreachable pooled connection, or a `BEFORE INSERT` trigger.
   *
   * The trigger wins on every axis that matters here: it is one statement, it is
   * `IF NOT EXISTS` and so idempotent, it destroys no data, and — unlike
   * `PRAGMA foreign_keys` (decision P4-D3) — it is stored IN THE SCHEMA and is
   * therefore in force on every connection the pool hands out, not on whichever
   * one happened to run a PRAGMA.
   *
   * A trigger is a guard, not a substitute for a key. Both v1 tables already have
   * `project_id` NOT NULL and first in their PRIMARY KEY; what these add is the
   * LENGTH check, which is the half that `NOT NULL` cannot express.
   */
  {
    v: 2,
    sql: `
CREATE TABLE IF NOT EXISTS analyses (
  project_id        TEXT    NOT NULL CHECK (length(project_id) > 0),
  sha256            TEXT    NOT NULL CHECK (length(sha256) > 0),
  detector_set_hash TEXT    NOT NULL CHECK (length(detector_set_hash) > 0),
  scan_state        TEXT    NOT NULL CHECK (scan_state IN ('pending', 'running', 'done', 'partial', 'failed')),
  max_slice_ms      REAL,
  bytes_walked      INTEGER,
  started_at        INTEGER NOT NULL,
  finished_at       INTEGER,
  error             TEXT,
  PRIMARY KEY (project_id, sha256, detector_set_hash)
);
CREATE INDEX IF NOT EXISTS idx_analyses_state
  ON analyses (project_id, scan_state, started_at);
CREATE INDEX IF NOT EXISTS idx_analyses_started_at
  ON analyses (project_id, started_at);
CREATE TABLE IF NOT EXISTS settings (
  project_id TEXT    NOT NULL,
  key        TEXT    NOT NULL CHECK (length(key) > 0),
  value      TEXT    NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, key)
);
CREATE TRIGGER IF NOT EXISTS trg_artifacts_project_scope
  BEFORE INSERT ON artifacts
  WHEN length(NEW.project_id) = 0 OR length(NEW.sha256) = 0
  BEGIN SELECT RAISE(ABORT, 'artifacts: project_id and sha256 must be non-empty'); END;
CREATE TRIGGER IF NOT EXISTS trg_observations_project_scope
  BEFORE INSERT ON observations
  WHEN length(NEW.project_id) = 0 OR length(NEW.sha256) = 0
  BEGIN SELECT RAISE(ABORT, 'observations: project_id and sha256 must be non-empty'); END;
`,
  },
  /**
   * Step v3 — plan 05-06. `audit`, and the two keyset indexes plan 05-07 reads
   * through. Approved at a `blocking-human` checkpoint on 2026-08-28 (option-a),
   * because `schema.spec.ts` names its table set as the one THE OPERATOR approved
   * at plan 01-01's one-way checkpoint — so a fifth table is an operator-visible
   * addition by that file's own statement, and this ladder never takes a step back.
   *
   * WHAT `audit` IS FOR. Seven operator actions are each either irreversible, a
   * disclosure, or a silent change to what the operator is shown: a projected
   * Finding is permanent, a raw export leaves the tool in cleartext, a revealed
   * value cannot be unseen, and triage and suppression quietly change which rows
   * the operator is ever offered. This table is the only record that any of them
   * happened. It is append-only — one insert with a do-nothing conflict clause on
   * `(project_id, event_id)`, so a replay writes nothing new and no invariant ever
   * needs two statements on a connection where `BEGIN` does not span `exec` calls.
   *
   * WHY THE IDENTIFIER COLUMN IS NOT THE OBVIOUS NAME. `event_id`, never `id`:
   * `schema.spec.ts`'s `FORBIDDEN_COLUMNS` bans the bare name package-wide with
   * the reason, and the reason is a measurement — `last_insert_rowid()` is
   * unusable on this pooled connection (decision P1-D1), so a surrogate id would
   * be a row identity nothing can read back. The key is therefore NATURAL and
   * caller-generated: the call site mints a UUID, which makes the caller the owner
   * of idempotency and makes a retry a no-op instead of a duplicate.
   *
   * WHY THE VOCABULARY IS COMPLETE BEFORE FOUR OF ITS MEMBERS HAVE CALLERS. Four
   * of the seven kinds are only written by the deferred pass after Phase 4. They
   * are listed here anyway, because the asymmetry is not close: an unused enum
   * value costs nothing at runtime, while a MISSING one costs a second permanent
   * step in a ladder whose entries can never be edited. The vocabulary is stated
   * once, here and in `audit.ts`'s `AUDIT_KINDS`, and nowhere else restates a
   * member string.
   *
   * WHY THE TWO NEW INDEXES RUN IN A DIFFERENT DIRECTION FROM THE SHIPPED LIST
   * STATEMENTS, AND WHY THAT IS NOT A CONTRADICTION. `listArtifacts` orders
   * `last_seen_at DESC, sha256 ASC` and `listObservations` orders
   * `observed_at DESC, request_id ASC` — MIXED directions. Those statements are
   * not changed here and keep their own indexes; they are separate statements
   * serving a whole-page read. The two indexes below are UNIFORM `DESC, DESC`
   * because they serve the NEW paginated reads, whose row-value cursor
   * (`(a, b) < (?, ?)`) requires a single direction to be CORRECT at all, not
   * merely fast — a mixed-direction pair makes the row-value comparison mean
   * something other than "the next page". Plan 05-02 measured the cost half of
   * this by contrast: a mixed-direction index under a uniform-direction ORDER BY
   * plans a temporary sort structure where the uniform index seeks. THAT
   * MEASUREMENT WAS TAKEN ON SQLite 3.51.0 AND 3.53.4, NOT on Caido's shipped
   * 3.46.0 — no 3.46 binary was reachable — so it is a result narrowed to a
   * 3.46 -> 3.51 window and disclosed as such, never claimed as verified on the
   * shipped runtime. The CORRECTNESS half does not depend on a query plan.
   */
  {
    v: 3,
    sql: `
CREATE TABLE IF NOT EXISTS audit (
  project_id TEXT    NOT NULL CHECK (length(project_id) > 0),
  event_id   TEXT    NOT NULL CHECK (length(event_id) > 0),
  at         INTEGER NOT NULL,
  kind       TEXT    NOT NULL CHECK (kind IN ('triage_set', 'suppression_create', 'suppression_remove', 'finding_projected', 'export_raw', 'export_redacted', 'value_revealed')),
  subject    TEXT    NOT NULL,
  detail     TEXT,
  PRIMARY KEY (project_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_audit_at
  ON audit (project_id, at);
CREATE INDEX IF NOT EXISTS idx_artifacts_keyset
  ON artifacts (project_id, last_seen_at DESC, sha256 DESC);
CREATE INDEX IF NOT EXISTS idx_observations_keyset
  ON observations (project_id, observed_at DESC, request_id DESC);
`,
  },
  /**
   * Step v4 — plan 05-07. The SECOND sort key on each pageable table, indexed.
   *
   * WHY THIS STEP EXISTS AT ALL, given step v3 already added a keyset index per
   * table. v3 indexed one sort key each — `last_seen_at` on `artifacts` and
   * `observed_at` on `observations` — and `store/reads.ts` offers TWO sort keys
   * per table, because a size column and a status column are the two things an
   * operator sorts an inventory by after recency. An `ORDER BY byte_len DESC,
   * sha256 DESC` with no index behind it does not degrade gracefully: SQLite
   * restricts to the project partition and then top-N sorts the WHOLE of it, once
   * per page. On a 200,000-row partition that is a scan whose cost is of the same
   * order as the `LIMIT ... OFFSET` form `05-UI-SPEC.md` bans outright — reached
   * by clicking a column header, on the single QuickJS thread, inside one
   * synchronous driver call with no yield point. Shipping the sort key without
   * the index would have been shipping that click.
   *
   * DIRECTIONS ARE EXPLICIT AND UNIFORM, for exactly the reason step v3 states:
   * the paginated reads use a row-value cursor `(a, b) < (?, ?)`, which requires
   * a single direction to be CORRECT rather than merely fast. SQLite traverses an
   * index in reverse for the opposite ORDER BY, so one `DESC, DESC` index serves
   * both the ascending and the descending statement for its sort key — which is
   * why there are two indexes here and not four.
   *
   * WHAT THIS STEP DELIBERATELY DOES NOT ADD: a filter-leading index. Making
   * `kind` and `content_type` sargable would need one composite index per (filter
   * column x sort key x direction) and would multiply the write cost of every
   * ingested response. The settled design instead bounds the SCANNED window
   * inside each filtered statement (`store/reads.ts`, CANDIDATE_WINDOW_ROWS),
   * which was measured to make the cost independent of filter selectivity
   * entirely — 500 candidates at a 25,000-row partition and 500 at a 200,000-row
   * one. An index cannot buy that property; it can only make the good case
   * faster.
   *
   * THE PROVENANCE CAVEAT FROM STEP v3 CARRIES OVER UNCHANGED. Those plans were
   * measured on SQLite 3.51.0 and 3.53.4, not on Caido's shipped 3.46.0, and are
   * disclosed as a result narrowed to a 3.46 -> 3.51 window rather than claimed
   * as verified on the shipped runtime. The correctness half — that a row-value
   * cursor needs a uniform direction — does not depend on a query plan.
   */
  {
    v: 4,
    sql: `
CREATE INDEX IF NOT EXISTS idx_artifacts_size_keyset
  ON artifacts (project_id, byte_len DESC, sha256 DESC);
CREATE INDEX IF NOT EXISTS idx_observations_status_keyset
  ON observations (project_id, status DESC, request_id DESC);
`,
  },
  /**
   * Step v5 — plan 06-01. `scans`, the retroactive backfill's durable position.
   *
   * APPROVED AT A BLOCKING-HUMAN CHECKPOINT (approve-as-specified, 2026-08-31),
   * for the reason `audit`'s step was: this ladder is forward-only and shipped
   * steps are immutable, `schema.spec.ts` asserts the table SET exactly and
   * names every column of every table, so the eighteen columns below can only
   * be changed by ANOTHER permanent step. The operator was shown the whole
   * list, both indexes, and the two costs the shape accepts before it was
   * written.
   *
   * -------------------------------------------------------------------------
   * WHAT THE TABLE IS FOR
   * -------------------------------------------------------------------------
   * DefMiner analyses JavaScript as the operator browses. A retroactive scan
   * applies the same analysis to traffic Caido captured BEFORE DefMiner was
   * installed, walking backwards from now. That walk runs for hours across
   * restarts and project switches, so the one thing it cannot keep in memory is
   * WHERE IT HAD GOT TO. This table is that place, and nothing else.
   *
   * It holds no content. There is no body column, no header column, no URL and
   * no digest — the artifacts and observations the scan produces go to the
   * tables that already exist for them, through the same admission gate,
   * digest and store path the live hook uses. There is no second analysis path
   * (D-01), so there is no second place for content to land.
   *
   * -------------------------------------------------------------------------
   * WHY THE IDENTIFIER IS `scan_id` AND NOT `id`
   * -------------------------------------------------------------------------
   * `last_insert_rowid()` is unusable on this pooled connection (decision
   * P1-D1) and `RETURNING` needs a SQLite this runtime does not have (P4-D4),
   * so a write cannot tell a caller what it wrote. A surrogate id would be a
   * row identity nothing can read back. The CALLER mints a UUID, which makes
   * the caller the owner of idempotency and makes a retry after an ambiguous
   * failure a no-op instead of a duplicate — exactly `audit.event_id`. The bare
   * name `id` is banned package-wide by `schema.spec.ts`'s FORBIDDEN_COLUMNS.
   *
   * -------------------------------------------------------------------------
   * WHY THE STATE COLUMN IS `state` AND NEVER `scan_state`
   * -------------------------------------------------------------------------
   * `analyses.scan_state` already exists in this same database over a DIFFERENT
   * closed vocabulary — pending / running / done / partial / failed, the
   * analysis state of one artifact. The vocabulary below is the LIFECYCLE state
   * of a backfill, and `running` is a literal member of both. Two different
   * closed vocabularies under one column name in one SQLite file is the drift
   * shape this repo keeps catching, and `COLUMN_ALLOWLIST` would have accepted
   * it without complaint. The TypeScript half is `SCAN_LIFECYCLE_STATES` in
   * `@defminer/engine/contract`, declared immediately beside `SCAN_STATES` so
   * the collision is visible where it is created.
   *
   * -------------------------------------------------------------------------
   * WHY THE VOCABULARY IS COMPLETE BEFORE EVERY MEMBER HAS A CALLER
   * -------------------------------------------------------------------------
   * `completed` and `discarded` are written by plans 06-05 and 06-09; nothing
   * in this plan produces either. They are in the CHECK anyway, and the
   * asymmetry is not close: an unused member costs nothing at run time, while a
   * missing one costs a second permanent step in a ladder whose entries can
   * never be edited. `audit`'s step made the same trade for the same reason.
   *
   * -------------------------------------------------------------------------
   * THE POSITION IS `last_request_id`, AND `last_cursor` IS OPPORTUNISTIC
   * -------------------------------------------------------------------------
   * O-04 — is a Caido `Cursor` stable across a process restart? — is NOT
   * MEASURED, and this migration must not wait on it. `RequestOrderField`
   * includes `"id"` and HTTPQL's `row` namespace has `id` with `lt`, so the
   * position is expressible as a filter over a plain integer that survives
   * anything: `last_request_id` is AUTHORITATIVE and is re-derivable from
   * nothing but itself. `last_cursor` is nullable, is an in-process fast path
   * only, and is NULLed by the startup sweep. If O-04's four-line probe in plan
   * 06-10 comes back positive the column is already here and the fast path
   * widens with no second migration; if it comes back negative nothing in the
   * design moves. The open question is designed around rather than bet on.
   *
   * -------------------------------------------------------------------------
   * WHAT IS DELIBERATELY ABSENT, AND THE COST THAT BUYS
   * -------------------------------------------------------------------------
   * There is no column per member of `REJECT_REASONS` and there is no JSON
   * column. Six reject columns would couple a one-way migration to a vocabulary
   * Phases 3 and 4 will grow; a JSON blob is a column able to hold arbitrary
   * content, which is precisely what `COLUMN_ALLOWLIST` exists to prevent. Only
   * the aggregate `rejected` is durable, and the live per-reason breakdown is
   * served from `telemetry.ts`'s in-memory retro sub-map. THE ACCEPTED COST,
   * STATED RATHER THAN DISCOVERED: a completed or restarted scan's per-reason
   * breakdown is gone, and the surface says so in words instead of rendering
   * six zeroes.
   *
   * -------------------------------------------------------------------------
   * WHY `idx_scans_one_running` IS A *PARTIAL UNIQUE* INDEX
   * -------------------------------------------------------------------------
   * DefMiner runs one scan per project at a time. Expressed as a caller-side
   * "read whether one is running, then insert" that is TWO operations, and this
   * driver has no transaction primitive to make them one — `BEGIN` does not
   * span `exec` calls and every statement still reports success (Pitfall 2). So
   * the invariant is an index: `UNIQUE (project_id) WHERE state = 'running'`
   * makes the second start fail INSIDE the insert, at the driver, with no
   * window between a check and a write. The `WHERE` half is what still permits
   * a project to hold a suspended scan and a completed history beside it —
   * without it, resuming would be impossible.
   *
   * `idx_scans_state` runs `(project_id, state, started_at)` in the ascending,
   * uniform direction `idx_analyses_state` already uses, because the reads
   * behind it are "the active scan for this project" and "this project's scan
   * history, newest first" — SQLite traverses an index in reverse for the
   * opposite ORDER BY, so one direction serves both.
   */
  {
    v: 5,
    sql: `
CREATE TABLE IF NOT EXISTS scans (
  project_id       TEXT    NOT NULL CHECK (length(project_id) > 0),
  scan_id          TEXT    NOT NULL CHECK (length(scan_id) > 0),
  state            TEXT    NOT NULL CHECK (state IN ('running','suspended','completed','discarded')),
  suspend_reason   TEXT,
  operator_filter  TEXT    NOT NULL,
  epoch            INTEGER NOT NULL,
  last_request_id  TEXT    NOT NULL,
  last_cursor      TEXT,
  last_created_at  INTEGER,
  pages_walked     INTEGER NOT NULL,
  seen             INTEGER NOT NULL,
  admitted         INTEGER NOT NULL,
  skipped_done     INTEGER NOT NULL,
  rejected         INTEGER NOT NULL,
  queued           INTEGER NOT NULL,
  started_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  finished_at      INTEGER,
  PRIMARY KEY (project_id, scan_id)
);
CREATE INDEX IF NOT EXISTS idx_scans_state
  ON scans (project_id, state, started_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scans_one_running
  ON scans (project_id) WHERE state = 'running';
`,
  },
  /**
   * Step v6 — plan 06-06. `audit`'s closed `kind` CHECK, widened by REBUILDING
   * the table, so a scan can record the two things it does that cannot be undone.
   *
   * THE CREATE-AND-COPY HALF. The swap that finishes the rebuild is step v7, and
   * the reason the rebuild is two steps rather than one blob is argued below
   * under "WHY THE REBUILD IS TWO STEPS". This JSDoc carries the DESIGN argument
   * for the whole rebuild; v7's carries the per-state recovery argument for the
   * half that drops and renames.
   *
   * APPROVED AT A BLOCKING-HUMAN CHECKPOINT (approve-as-specified with the gate
   * blind spot recorded, 2026-08-31). One-way, and accepted as one-way: rows
   * already written cannot be re-kinded, and a member added to the vocabulary
   * after this costs a further permanent step.
   *
   * -------------------------------------------------------------------------
   * WHY A REBUILD AND NOT AN EDIT
   * -------------------------------------------------------------------------
   * `audit.kind` is a CLOSED `CHECK (kind IN (...))` constraint created by step
   * v3. SQLite has no `ALTER TABLE ... DROP CONSTRAINT`, so a closed CHECK can
   * only be changed by replacing the table that carries it. STEP v3 IS NOT EDITED
   * AND IS BYTE-IDENTICAL TO ITS SHIPPED FORM — every database already at v3 has
   * run it, and an edit would change the schema of new installs only and silently
   * fork the two. This is a FORWARD step, which is the only kind this ladder has.
   *
   * -------------------------------------------------------------------------
   * THE TWO NEW MEMBERS, AND WHY ONLY TWO
   * -------------------------------------------------------------------------
   * `scan_discarded` and `scan_suspended_by_retention`. D-16 gives a retroactive
   * scan exactly two events worth a permanent record — a discard, which destroys
   * the walked position (D-10), and a suspension caused by retention evicting the
   * scan's own results (D-08) — and leaves routine lifecycle in `scans` under
   * ordinary retention. That restraint is the point rather than an omission:
   * `audit` is the AGE-EXEMPT ledger whose row bound Phase 5's D-06 raised
   * specifically to preserve permanent-consequence records, so filling it with
   * background-job chatter would evict the projection records it exists for.
   *
   * BOTH MEMBERS HAVE A WRITER IN THIS PLAN, which is the difference from step
   * v3's and step v5's vocabularies. Those two argued that an unused member costs
   * nothing at run time while a missing one costs a permanent step; that argument
   * is still true and is simply not needed here. `scan/scans.ts`'s `discardScan`
   * writes the first and `suspendForRetentionEviction` writes the second.
   *
   * -------------------------------------------------------------------------
   * WHY THE REBUILD IS TWO STEPS, AND WHAT SPIKE-09 ACTUALLY MEASURED
   * -------------------------------------------------------------------------
   * THIS SECTION IS A CORRECTION, AND THE CLAIM IT REPLACES IS WRITTEN OUT SO
   * THE NEXT READER CAN SEE WHICH ARGUMENT WAS WRONG. It used to read: "what
   * keeps a PARTIAL rebuild from existing at all — `audit` dropped, `audit_v6`
   * still holding the rows, nothing to copy from on the next boot — is
   * MULTISTATEMENT_EXEC_ATOMIC: a single `exec` string is one atomic unit, so
   * the five statements land together or not at all." That overstated its
   * evidence, and the overstatement is what let five statements be written as
   * one blob.
   *
   * WHAT SPIKE-09 MEASURED (`00-GO-NO-GO.md:362`) is narrower than the name
   * MULTISTATEMENT_EXEC_ATOMIC suggests: a single `exec` containing an EXPLICIT
   * `BEGIN`, three good inserts, a UNIQUE-violating insert and a `COMMIT` left
   * ZERO rows when counted from a fresh connection pool after a plugin restart.
   * What that establishes is that an explicit transaction INSIDE one `exec` is
   * honoured — not that a `BEGIN`-less batch is one unit. A batch with no
   * transaction runs each statement in its own implicit one, and SQLite's
   * journal spans a statement, not a batch. So a `BEGIN`-less five-statement
   * rebuild is a SEQUENCE, and a process killed between `DROP TABLE IF EXISTS
   * audit` and `ALTER TABLE audit_v6 RENAME TO audit` leaves exactly the state
   * the old paragraph called impossible: no `audit`, an `audit_v6` holding every
   * row, and `user_version` still below the step. Every later boot then re-runs
   * the step, fails at `... SELECT ... FROM audit` with `no such table: audit`,
   * and the ladder never advances again.
   *
   * ADDING `BEGIN … COMMIT` IS NOT THE FIX TAKEN, and not for taste: the file
   * header's Pitfall 1 note records that a failing `exec` strands an open write
   * transaction on a pooled connection nothing in the plugin API can reach, and
   * putting a poisonable write transaction on the BOOT path is the one place
   * that is least recoverable. This project's standing rule is also that `BEGIN`
   * does not span `exec` calls and fails silently on this driver.
   *
   * WHAT MAKES THE REBUILD SAFE IS THE SPLIT. The rebuild is two steps, and
   * `user_version` — which SPIKE-09 DID measure as surviving across `exec` calls
   * and a connection switch — is the only durable thing between them. Each step
   * is re-runnable from EVERY state its own interruption can leave behind, which
   * is the property that replaces the atomicity claim:
   *
   *   step v6 — CREATE `audit_v6`, COPY into it. It never drops anything, so
   *     `audit` is still there on every re-entry and the copy always has its
   *     source. An interruption costs a repeated `INSERT OR IGNORE`.
   *   step v7 — SWAP. It re-creates BOTH names under `IF NOT EXISTS` and copies
   *     again BEFORE it drops, so it converges from the two states its own
   *     interruption can produce as well as from the normal one. The per-state
   *     argument is on step v7's own JSDoc, beside the SQL it describes.
   *
   * The per-statement "cannot fail" argument below is UNCHANGED and still
   * required — it is what keeps a failure from stranding that open write
   * transaction. It was never the half that ruled out a partial rebuild, and the
   * old paragraph's mistake was to think a second half had been supplied.
   *
   * -------------------------------------------------------------------------
   * WHY EACH STATEMENT IN EITHER STEP CANNOT FAIL
   * -------------------------------------------------------------------------
   * The header above states the property a batched `exec` depends on: not that
   * every statement says `IF NOT EXISTS`, but that no statement in it can fail.
   * `IF NOT EXISTS` is the usual way of getting that; here the argument is made
   * one statement at a time, because the copy has no such guard.
   *
   *   1. `CREATE TABLE IF NOT EXISTS audit_v6 (...)` — the guard makes a second
   *      application a no-op.
   *   2. `INSERT OR IGNORE INTO audit_v6 (...) SELECT ... FROM audit` — the
   *      source exists, because step v3 creates it and the ladder is ordered (and
   *      in step v7, because that step re-creates the name under `IF NOT EXISTS`
   *      first); the destination exists, because statement 1 just created it; and
   *      every row satisfies the destination's constraints, because the widened
   *      CHECK is a strict SUPERSET of the shipped one and no other column
   *      constraint moved. `OR IGNORE` turns any conflict into a skipped row, so
   *      a re-run over rows already copied writes nothing and raises nothing.
   *   3. `DROP TABLE IF EXISTS audit` — the guard makes an absent target a no-op.
   *   4. `ALTER TABLE audit_v6 RENAME TO audit` — cannot fail ONLY because
   *      statement 3 just freed the name. This is the one statement whose safety
   *      is not self-contained, so the ORDER is load-bearing and
   *      `migrations.spec.ts` asserts it positionally rather than trusting this
   *      paragraph.
   *   5. `CREATE INDEX IF NOT EXISTS idx_audit_at ON audit (project_id, at)` — the
   *      guard makes it a no-op, and it is REQUIRED rather than tidy: SQLite drops
   *      a table's indexes with the table, so step v3's index went with statement
   *      3 and `listAudit`'s `ORDER BY at DESC, event_id DESC` would silently lose
   *      the index its leading column matches.
   *
   * -------------------------------------------------------------------------
   * WHY STEP v2's REBUILD OBJECTION DOES NOT REACH THIS CASE
   * -------------------------------------------------------------------------
   * Step v2 rejected a table rebuild for the v1 tables and chose triggers, on the
   * grounds that a rebuild is "a multi-statement migration that CAN fail and
   * would therefore strand an open write transaction on an unreachable pooled
   * connection". That objection is about a rebuild that CAN fail, and it was the
   * right call there: v2's alternative — a `BEFORE INSERT` trigger — achieved the
   * same invariant in ONE guarded statement, so the rebuild bought nothing and
   * carried risk. There is no trigger-shaped alternative to widening a CHECK. The
   * choice here is a rebuild or nothing.
   *
   * -------------------------------------------------------------------------
   * `INSERT ... SELECT`, AND THE GATE THAT DOES NOT SEE IT
   * -------------------------------------------------------------------------
   * `sql-discipline.spec.ts` carries a rule named `insert-select` that bans this
   * form package-wide, with no allowlist entry, on three grounds: the row set is
   * decided at execution time, `ON CONFLICT` cannot make an unknown row set
   * idempotent, and this driver has no transaction to undo a partial write.
   *
   * THAT RULE WILL NOT REPORT THE STATEMENT BELOW, AND NOT BECAUSE THE STATEMENT
   * COMPLIES. The gate classifies a SQL string by its LEADING KEYWORD, and a
   * multi-statement migration blob leads with `CREATE` — so `insertsFromSelect`,
   * `isMultiRowStatement` and the whole row-scoping family never look at it. The
   * same blind spot already lets step v2's `CREATE TRIGGER ... BEGIN SELECT
   * RAISE(ABORT, ...); END` through. A green run on this file is green by
   * NON-OBSERVATION, not by compliance, and saying so here is the point of this
   * paragraph. The blind spot is recorded in `.planning/WINDOWS.md` with an owner;
   * closing it was declined as scope for this plan, not as a non-issue.
   *
   * So the argument is made rather than delegated, and each of the rule's three
   * grounds is answered on its own terms:
   *
   *   - "the row set is decided at execution time" — a rebuild's row set is EVERY
   *     row, which is the one row set fully known before the statement runs. It is
   *     not a query whose selectivity depends on data.
   *   - "ON CONFLICT cannot make an unknown row set idempotent" — the natural key
   *     `(project_id, event_id)` is carried by every row being copied, so
   *     `OR IGNORE` is genuinely idempotent: re-copying a row that is already
   *     there is a skip, not a duplicate and not an error.
   *   - "no transaction to undo a partial write" — TRUE, and CONCEDED rather
   *     than answered. There is no transaction here, and this ground used to be
   *     waved off with MULTISTATEMENT_EXEC_ATOMIC, which does not cover a
   *     `BEGIN`-less batch. What answers it instead is that no partial write of
   *     this copy needs undoing: `INSERT OR IGNORE` into a table keyed on the
   *     same natural key is convergent, so a half-finished copy is completed by
   *     re-running it, and the DROP that would make the copy unrepeatable lives
   *     in a LATER step that re-copies before it drops. Recovery by re-run,
   *     not by rollback.
   *
   * AND THE ABSENT `project_id` PREDICATE IS THE POINT, not the leak the scoping
   * rule normally catches. `sdk.meta.db()` is ONE database for every project
   * (T-01-20), and a table rebuild that scoped to one project would DELETE every
   * other project's audit log. `migrations.spec.ts` seeds two projects for exactly
   * this reason.
   *
   * -------------------------------------------------------------------------
   * `INSERT OR IGNORE` FAILS SILENTLY, WHICH IS WHY THE COUNT IS ASSERTED
   * -------------------------------------------------------------------------
   * `OR IGNORE`'s failure mode is a SKIPPED ROW, not an error. A copy that
   * dropped rows would migrate cleanly, report `ok`, and leave a shorter audit log
   * than it found — in the one table whose whole value is that nothing is ever
   * removed from it. `migrations.spec.ts` seeds one row per shipped kind in two
   * projects, including a NULL `detail`, and compares every column of every row
   * before and after. That assertion is load-bearing rather than
   * belt-and-braces: it is the only thing standing between a silent skip and a
   * green run.
   *
   * -------------------------------------------------------------------------
   * THE ALTERNATIVE CONSIDERED AND REJECTED
   * -------------------------------------------------------------------------
   * A separate table for scan-destruction events. It would need its own retention
   * exemption — a THIRD exception, where this project has so far taken two and
   * writes a paragraph for each — and it would split a ledger whose entire value
   * is being the ONE place an irreversible action is recorded. "What happened in
   * this project that cannot be undone" would become a question with two answers.
   */
  {
    v: 6,
    sql: `
CREATE TABLE IF NOT EXISTS audit_v6 (
  project_id TEXT    NOT NULL CHECK (length(project_id) > 0),
  event_id   TEXT    NOT NULL CHECK (length(event_id) > 0),
  at         INTEGER NOT NULL,
  kind       TEXT    NOT NULL CHECK (kind IN ('triage_set', 'suppression_create', 'suppression_remove', 'finding_projected', 'export_raw', 'export_redacted', 'value_revealed', 'scan_discarded', 'scan_suspended_by_retention')),
  subject    TEXT    NOT NULL,
  detail     TEXT,
  PRIMARY KEY (project_id, event_id)
);
INSERT OR IGNORE INTO audit_v6 (project_id, event_id, at, kind, subject, detail)
  SELECT project_id, event_id, at, kind, subject, detail FROM audit;
`,
  },
  /**
   * Step v7 — the SWAP half of plan 06-06's `audit` rebuild.
   *
   * -------------------------------------------------------------------------
   * WHY THIS IS A SEPARATE STEP AT ALL
   * -------------------------------------------------------------------------
   * Because a `BEGIN`-less `exec` is a SEQUENCE, not a unit — argued in full on
   * step v6's JSDoc, under "WHY THE REBUILD IS TWO STEPS". The five statements
   * used to be one blob whose safety rested on a reading of
   * MULTISTATEMENT_EXEC_ATOMIC that SPIKE-09's measurement does not support.
   * Splitting them puts a durable `user_version` between the copy and the drop,
   * and turns "this cannot be interrupted" into "every interruption converges".
   *
   * THIS SPLIT IS NOT AN EDIT TO A SHIPPED STEP. Step v6 was authored in THIS
   * PHASE (commit `2bc96cf`, plan 06-06) and DefMiner has no release tag — no
   * database anywhere has run the five-statement form, so v6 could be narrowed
   * rather than only appended to. Verified from the git history rather than
   * assumed. Had v6 shipped, the drop-and-rename would have had to arrive as v7
   * with v6 left byte-identical, which is very nearly this same shape.
   *
   * -------------------------------------------------------------------------
   * THE THREE STATES THIS STEP MUST CONVERGE FROM
   * -------------------------------------------------------------------------
   * `user_version` is bumped in a SEPARATE `exec`, so this step is re-entered
   * from any point its own interruption can reach, INCLUDING from full success.
   * There are exactly three reachable states, and the statement order below is
   * chosen so that all three land in the same place with every row intact:
   *
   *   (a) NORMAL — `audit` (old shape, rows) and `audit_v6` (the copy) both
   *       present. Statements 1 and 2 are no-ops, the copy re-copies nothing,
   *       the drop frees the name, the rename lands.
   *   (b) INTERRUPTED AFTER THE DROP — no `audit`, `audit_v6` holding every row.
   *       This is the state the old blob could not recover from, and statement 2
   *       is what makes it recoverable: it re-creates an EMPTY `audit` purely so
   *       statement 3 has a source. That table is transient — created, copied
   *       from (nothing), and dropped two statements later — which is why it is
   *       declared with the WIDENED shape rather than step v3's: it is never
   *       read, and duplicating the shipped CHECK here would invite someone to
   *       "keep the two in sync".
   *   (c) INTERRUPTED AFTER THE RENAME — `audit` is already the NEW table with
   *       every row, `audit_v6` is gone. Statement 1 re-creates an empty
   *       `audit_v6`, statement 3 copies the rows back into it, and the swap
   *       runs again. This is why the copy is repeated HERE and not left in v6:
   *       a v7 that were only DROP + RENAME would, on this re-entry, drop the
   *       renamed `audit` — the ledger itself — and then fail on a rename whose
   *       source no longer exists. The naive split destroys the table it is
   *       meant to protect, and `migrations.spec.ts` holds a case for it.
   *
   * THE DROP IS NEVER THE FIRST DESTRUCTIVE THING TO HAPPEN. In every one of the
   * three states, `audit_v6` durably holds every row BEFORE `DROP TABLE IF
   * EXISTS audit` runs, because the copy commits in its own implicit transaction
   * one statement earlier. That ordering — not a transaction — is what makes the
   * ledger safe.
   *
   * `idx_audit_at` is re-created here rather than in v6 because SQLite drops a
   * table's indexes with the table: step v3's index goes with the drop below,
   * and `listAudit`'s `ORDER BY at DESC, event_id DESC` would silently lose the
   * index its leading column matches.
   */
  {
    v: 7,
    sql: `
CREATE TABLE IF NOT EXISTS audit_v6 (
  project_id TEXT    NOT NULL CHECK (length(project_id) > 0),
  event_id   TEXT    NOT NULL CHECK (length(event_id) > 0),
  at         INTEGER NOT NULL,
  kind       TEXT    NOT NULL CHECK (kind IN ('triage_set', 'suppression_create', 'suppression_remove', 'finding_projected', 'export_raw', 'export_redacted', 'value_revealed', 'scan_discarded', 'scan_suspended_by_retention')),
  subject    TEXT    NOT NULL,
  detail     TEXT,
  PRIMARY KEY (project_id, event_id)
);
CREATE TABLE IF NOT EXISTS audit (
  project_id TEXT    NOT NULL CHECK (length(project_id) > 0),
  event_id   TEXT    NOT NULL CHECK (length(event_id) > 0),
  at         INTEGER NOT NULL,
  kind       TEXT    NOT NULL CHECK (kind IN ('triage_set', 'suppression_create', 'suppression_remove', 'finding_projected', 'export_raw', 'export_redacted', 'value_revealed', 'scan_discarded', 'scan_suspended_by_retention')),
  subject    TEXT    NOT NULL,
  detail     TEXT,
  PRIMARY KEY (project_id, event_id)
);
INSERT OR IGNORE INTO audit_v6 (project_id, event_id, at, kind, subject, detail)
  SELECT project_id, event_id, at, kind, subject, detail FROM audit;
DROP TABLE IF EXISTS audit;
ALTER TABLE audit_v6 RENAME TO audit;
CREATE INDEX IF NOT EXISTS idx_audit_at
  ON audit (project_id, at);
`,
  },
  /**
   * Step v8 — plan 07-04. The two tables recovered source is REMEMBERED in,
   * approved at that plan's `blocking-human` checkpoint (approve-as-specified,
   * 2026-09-02) — the FOURTH one-way `EXPECTED_TABLES` approval, named in that
   * array's own doc comment beside the three before it.
   *
   * D-05's IDENTITY MODEL IS THE SHIPPED ONE, APPLIED TO A SECOND ENTITY CLASS.
   * `sources` is `artifacts`: one row per distinct CONTENT, keyed by its digest.
   * `source_sightings` is `observations`: one row per place that content was
   * seen, here `(map, index)` rather than `(artifact, request)`. Two different
   * bundles carrying the same source therefore produce ONE `sources` row and TWO
   * sighting rows, which is the cross-bundle, cross-deploy dedupe MAP-06's
   * once-per-content-hash guarantee is made of — literal rather than aspirational
   * because it falls out of the primary keys.
   *
   * THERE IS NO CONTENT COLUMN, IN ANY ENCODING, AND THAT IS THE PHASE'S
   * STRONGEST SECURITY PROPERTY RATHER THAN A COMPROMISE (D-07). Recovered
   * source is the target's actual source code — plausibly credentials, internal
   * hostnames and business logic — and a stolen copy of this database contains a
   * list of labels, digests and byte counts and nothing else. Every column below
   * declares `TEXT` or `INTEGER`: no BLOB and no untyped column, the two
   * mechanisms that could reopen Phase 6's D-24 and its "DEPLOY-04 is satisfied
   * BY CONSTRUCTION" claim, both of which `schema.spec.ts` executes as failure
   * fixtures rather than describing.
   *
   * ONE STEP, BOTH TABLES, BOTH INDEXES — AND IT HAS TO BE. `exec` is atomic per
   * call (MULTISTATEMENT_EXEC_ATOMIC) while `BEGIN` does NOT span `exec` calls
   * and fails silently (TRANSACTION_PERSISTS_ACROSS_EXEC = false, Pitfall 2), so
   * no invariant may require two statements to land together. A sighting whose
   * `sources` table did not arrive is exactly such an invariant.
   *
   * NATURAL KEYS, NEVER `id`. `last_insert_rowid()` is unusable on the pooled
   * connection (decision P1-D1), so both tables address rows by the key the
   * caller already holds. `project_id` is at PRIMARY KEY ordinal 1 on both,
   * which is STORE-02 and is read back structurally by the pk-ordinal gate.
   *
   * `producibility`'s CHECK IS THE ENFORCEMENT AND `SOURCE_PRODUCIBILITY_STATES`
   * IS THE DECLARATION. The member order here is that array's order, so a
   * reordering is a diff a reviewer can put beside this DDL; `sources.spec.ts`
   * reads the constraint back out of the schema and compares it member by member,
   * the way `scans` already does for the lifecycle vocabulary. The column is
   * `producibility` and NOT `state` (taken by `scans`) and NOT `scan_state`
   * (taken by `analyses`) — either of those names would have accepted a value
   * from the wrong vocabulary silently.
   *
   * TWO NULLABLE COLUMNS, EACH FOR A MEASURED REASON (07-RESEARCH.md § Pitfall
   * 3). `source_sha256` is NULL when that index carried no content at all, and
   * there is then no `sources` row to point at — an index with nothing behind it
   * is still a fact about the bundle. `sources_verbatim` is NULL when the map
   * declares `sources[i]` as null, which ECMA-426 permits; the SQL NULL is a
   * value and is never the three-character string "null".
   *
   * `sources_verbatim` IS THE ONE TARGET-CONTROLLED COLUMN, and the first since
   * `observations.url`. It is stored UNSANITISED and UNNORMALISED because D-06
   * says evidence is sanitised at DISPLAY time — but "verbatim" is not
   * "unbounded", so `store/sources.ts` bounds it at `SOURCES_LABEL_MAX` exactly
   * as `observations.url` is bounded at `URL_MAX`. `schema.spec.ts`'s allowlist
   * entry carries the rest of that argument, including the part that must not be
   * softened: it is NOT redacted at write time, so its safety rests on R1/R2 at
   * render and on the O-08 normaliser, which is a DISPLAY control.
   *
   * BOTH INDEXES ASCENDING, one direction each, for the reason step v5 gives at
   * length: SQLite traverses an index in reverse for the opposite `ORDER BY`, so
   * one direction serves both reads. `idx_source_sightings_artifact` is the
   * drill-down's keyset order — `(project_id, artifact_sha256, source_index)`,
   * matching `listRecoveredSourcesPage`'s scope and sort exactly.
   * `idx_sources_seen` is retention's, leading on `first_seen_at`.
   *
   * THE COST D-09 ACCEPTS, WITH NO EXEMPTION, PUT TO THE OPERATOR BEFORE THIS
   * STEP WAS WRITTEN. One row per recovered source under the NORMAL retention
   * caps: a 781-source map is 781 `sources` rows and 781 sighting rows against a
   * `DEFAULT_RETENTION_MAX_ROWS` of 50,000, so a handful of large maps consumes
   * the budget and the operator meets eviction sooner here than on any other
   * table. `SOURCE_ROWS_PER_MAP_MAX` bounds the per-map half; the sweep-cadence
   * half is plan 07-05's.
   */
  {
    v: 8,
    sql: `
CREATE TABLE IF NOT EXISTS sources (
  project_id    TEXT    NOT NULL CHECK (length(project_id) > 0),
  source_sha256 TEXT    NOT NULL CHECK (length(source_sha256) = 64),
  byte_len      INTEGER NOT NULL,
  line_count    INTEGER NOT NULL,
  first_seen_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, source_sha256)
);
CREATE TABLE IF NOT EXISTS source_sightings (
  project_id       TEXT    NOT NULL CHECK (length(project_id) > 0),
  map_sha256       TEXT    NOT NULL CHECK (length(map_sha256) = 64),
  source_index     INTEGER NOT NULL,
  artifact_sha256  TEXT    NOT NULL CHECK (length(artifact_sha256) = 64),
  request_id       TEXT    NOT NULL,
  source_sha256    TEXT,
  sources_verbatim TEXT,
  producibility    TEXT    NOT NULL CHECK (producibility IN ('producible','gone','changed')),
  producibility_at INTEGER,
  recovered_at     INTEGER NOT NULL,
  PRIMARY KEY (project_id, map_sha256, source_index)
);
CREATE INDEX IF NOT EXISTS idx_source_sightings_artifact
  ON source_sightings (project_id, artifact_sha256, source_index);
CREATE INDEX IF NOT EXISTS idx_sources_seen
  ON sources (project_id, first_seen_at, source_sha256);
`,
  },
  /**
   * Step v9 — plan 07-12. `source_sightings`' PRIMARY KEY LEARNS THE BUNDLE.
   * Approved at that plan's `blocking-human` checkpoint (option A, 2026-09-02) —
   * the FIFTH one-way `EXPECTED_TABLES` approval, named in that array's own doc
   * comment beside the four before it.
   *
   * NO TABLE IS ADDED AND NO COLUMN MOVES. `EXPECTED_TABLES` still holds eight
   * members; the same ten columns keep the same types, the same CHECK
   * constraints and the same closed producibility vocabulary, and `project_id`
   * is still at PRIMARY KEY ordinal 1 (STORE-02). One line of DDL changes:
   *
   *   was  PRIMARY KEY (project_id, map_sha256, source_index)
   *   now  PRIMARY KEY (project_id, artifact_sha256, map_sha256, source_index)
   *
   * `sources` is UNTOUCHED. Its `(project_id, source_sha256)` key is
   * content-addressed dedupe across bundles, which is exactly what that table is
   * for, and this step does not weaken it. Two bundles carrying the same source
   * still produce ONE `sources` row.
   *
   * WHY THE KEY HAD TO SPAN THE BUNDLE (07-VERIFICATION.md W-3, 07-REVIEW.md
   * HI-03). `map_sha256` is content-addressed over the DECODED MAP JSON and
   * never over the bundle, so two different bundles can share it at the target's
   * discretion — a CDN mirror with a different banner comment is enough. Under
   * the v8 key the second bundle's sightings collided with the first's. Plan
   * 07-05's interim guard stopped the second bundle STEALING the first's
   * attribution; it could not give the second bundle its evidence back, and that
   * bundle's drill-down then read a RESOLVED ZERO — on the one column whose
   * whole design is that a resolved zero means "DefMiner looked and there was
   * nothing". The key must span the bundle for the row to be about the bundle.
   *
   * NO ROW IS LOST BY THE COPY. Every existing row has a distinct
   * `(project_id, map_sha256, source_index)`, so it necessarily has a distinct
   * `(project_id, artifact_sha256, map_sha256, source_index)`: the new key is a
   * SUPERSET of the old one's columns, so it can only ever separate rows that
   * were already separate. `OR IGNORE` never has anything to skip.
   *
   * THE ROW-VOLUME COST, ACCEPTED AT THE CHECKPOINT AND STATED HERE SO IT IS NOT
   * REDISCOVERED. Volume goes UP for the duplicated-map case, which is the
   * point: where the interim guard wrote one set of sightings for two bundles,
   * this writes two. D-09's accepted cost — one row per recovered source under
   * the NORMAL retention caps, no exemption — now applies per bundle, so a
   * 781-source map seen in two bundles is 1,562 rows rather than 781, against a
   * `DEFAULT_RETENTION_MAX_ROWS` of 50,000.
   *
   * -------------------------------------------------------------------------
   * IT IS A TABLE REBUILD, IN STEP v7's SHAPE, FOR STEP v7's REASONS
   * -------------------------------------------------------------------------
   * SQLite cannot alter a primary key in place, so the key arrives the only way
   * it can: create the new shape, copy, drop, rename. Step v7 already litigated
   * this shape when it widened `audit`'s CHECK, and its whole argument is
   * inherited rather than re-derived.
   *
   * THIS STEP DOES NOT ASSERT ATOMICITY AND MUST NOT. SPIKE-09 measured
   * MULTISTATEMENT_EXEC_ATOMIC on a batch that CONTAINED an explicit
   * `BEGIN … COMMIT`; this batch contains none, so it is a SEQUENCE and each
   * statement commits in its own implicit transaction. Adding `BEGIN … COMMIT`
   * is NOT the fix — a failing `exec` strands an open write transaction on a
   * pooled connection nothing in the plugin API can reach, and the boot path is
   * the least recoverable place to put one (Pitfall 1), and `BEGIN` does not
   * span `exec` calls on this driver anyway (Pitfall 2,
   * TRANSACTION_PERSISTS_ACROSS_EXEC = false).
   *
   * WHAT MAKES IT SAFE IS RE-RUNNABILITY, one paragraph per state its own
   * interruption can leave behind. `migrations.spec.ts` EXECUTES all three
   * against a real migrated fixture rather than trusting these paragraphs, and
   * asserts the statement order positionally.
   *
   *   INTERRUPTED BETWEEN 2 AND 4 — both names present, the old one still
   *     holding every row. The re-run's statements 1 and 2 are no-ops, statement
   *     3 copies again and `OR IGNORE` writes nothing over rows already there,
   *     and 4 and 5 complete the swap. Converges with every row.
   *   INTERRUPTED BETWEEN 4 AND 5 — `source_sightings` is GONE and
   *     `source_sightings_v9` holds every row. This is the state statement 1
   *     exists for: it re-creates the SOURCE name under `IF NOT EXISTS` so
   *     statement 3 always has a table to select from. Without it the re-run
   *     fails at `... SELECT ... FROM source_sightings` with `no such table`,
   *     and THE LADDER NEVER ADVANCES AGAIN on any subsequent boot — `index.ts`
   *     only logs `MIGRATION INCOMPLETE`. Statement 3 then copies zero rows out
   *     of the freshly-created empty table, statement 4 drops that empty table,
   *     and statement 5 renames the one holding the evidence into place.
   *   COMPLETED BUT `user_version` NOT YET ADVANCED — the round trip. The rebuilt
   *     `source_sightings` already carries the new key; statement 2 creates a
   *     fresh `_v9`, statement 3 copies every row into it, and the swap runs
   *     again. It is LOSSLESS because the two shapes have IDENTICAL columns, and
   *     it is why the step re-creates BOTH names and copies BEFORE it drops. A
   *     step written as drop-plus-rename alone would destroy the evidence here.
   *
   * -------------------------------------------------------------------------
   * WHY EACH STATEMENT CANNOT FAIL
   * -------------------------------------------------------------------------
   *   1. `CREATE TABLE IF NOT EXISTS source_sightings (...)` — the guard makes it
   *      a no-op on the normal forward path, where the name already exists
   *      carrying the OLD key. It is not decoration: it is the whole recovery for
   *      the interrupted-between-4-and-5 state above.
   *   2. `CREATE TABLE IF NOT EXISTS source_sightings_v9 (...)` — the guard makes
   *      a second application a no-op.
   *   3. `INSERT OR IGNORE INTO source_sightings_v9 (...) SELECT ... FROM
   *      source_sightings` — the source exists because statement 1 just
   *      guaranteed it; the destination exists because statement 2 just created
   *      it; and every row satisfies the destination's constraints because no
   *      column constraint moved and the new key only ever separates rows the old
   *      key had already separated. `OR IGNORE` turns any conflict into a skipped
   *      row. Every column is NAMED on both sides, never `SELECT *`: a positional
   *      copy would silently transpose two columns of the same type the day
   *      either shape's column ORDER is edited.
   *   4. `DROP TABLE IF EXISTS source_sightings` — the guard makes an absent
   *      target a no-op.
   *   5. `ALTER TABLE source_sightings_v9 RENAME TO source_sightings` — cannot
   *      fail ONLY because statement 4 just freed the name. This is the one
   *      statement whose safety is not self-contained, so the ORDER is
   *      load-bearing and `migrations.spec.ts` asserts it positionally rather
   *      than trusting this paragraph.
   *   6. `CREATE INDEX IF NOT EXISTS idx_source_sightings_artifact ...` — the
   *      guard makes it a no-op, and it is REQUIRED rather than tidy: SQLite
   *      drops a table's indexes with the table, so step v8's index went with
   *      statement 4 and `listRecoveredSourcesPage`'s keyset order would silently
   *      lose the index its leading columns match.
   *
   * `source_sightings_v9` IS TRANSIENT AND IS NEVER AN `EXPECTED_TABLES` MEMBER,
   * exactly as `audit_v6` is not. It does not survive the step, and
   * `schema.spec.ts`'s table-set assertion failing with it present is the
   * specific signal that the swap did not complete.
   */
  {
    v: 9,
    sql: `
CREATE TABLE IF NOT EXISTS source_sightings (
  project_id       TEXT    NOT NULL CHECK (length(project_id) > 0),
  map_sha256       TEXT    NOT NULL CHECK (length(map_sha256) = 64),
  source_index     INTEGER NOT NULL,
  artifact_sha256  TEXT    NOT NULL CHECK (length(artifact_sha256) = 64),
  request_id       TEXT    NOT NULL,
  source_sha256    TEXT,
  sources_verbatim TEXT,
  producibility    TEXT    NOT NULL CHECK (producibility IN ('producible','gone','changed')),
  producibility_at INTEGER,
  recovered_at     INTEGER NOT NULL,
  PRIMARY KEY (project_id, artifact_sha256, map_sha256, source_index)
);
CREATE TABLE IF NOT EXISTS source_sightings_v9 (
  project_id       TEXT    NOT NULL CHECK (length(project_id) > 0),
  map_sha256       TEXT    NOT NULL CHECK (length(map_sha256) = 64),
  source_index     INTEGER NOT NULL,
  artifact_sha256  TEXT    NOT NULL CHECK (length(artifact_sha256) = 64),
  request_id       TEXT    NOT NULL,
  source_sha256    TEXT,
  sources_verbatim TEXT,
  producibility    TEXT    NOT NULL CHECK (producibility IN ('producible','gone','changed')),
  producibility_at INTEGER,
  recovered_at     INTEGER NOT NULL,
  PRIMARY KEY (project_id, artifact_sha256, map_sha256, source_index)
);
INSERT OR IGNORE INTO source_sightings_v9 (project_id, map_sha256, source_index, artifact_sha256,
         request_id, source_sha256, sources_verbatim, producibility,
         producibility_at, recovered_at)
  SELECT project_id, map_sha256, source_index, artifact_sha256,
         request_id, source_sha256, sources_verbatim, producibility,
         producibility_at, recovered_at
    FROM source_sightings;
DROP TABLE IF EXISTS source_sightings;
ALTER TABLE source_sightings_v9 RENAME TO source_sightings;
CREATE INDEX IF NOT EXISTS idx_source_sightings_artifact
  ON source_sightings (project_id, artifact_sha256, source_index);
`,
  },
];

/** One step's outcome. A migration that fails must be LEGIBLE: Caido surfaces
 *  neither a synchronous throw nor an async rejection from plugin code, so an
 *  unguarded `await db.exec(step)` that rejects produces no row, no error and
 *  nothing in any log — the plugin simply runs on against a schema that is not
 *  the one it thinks it has. The `safe()`/`step()` shape below is taken from
 *  `probe/tier0-budgets/backend/script.js:195-212`, where it was used for exactly
 * this reason (T-01-24).
 *
 * @internal
 */
export type MigrationStepRecord =
  | { step: string; ok: true }
  | { step: string; ok: false; error: string };

/**
 * What {@link migrate} hands back so `init()` can log it.
 *
 * @internal
 */
export type MigrationReport = {
  /** The ladder position after this run. */
  version: number;
  /** The position before this run. */
  from: number;
  /** The highest step THIS BUILD knows about. */
  head: number;
  /** True when the database was written by a NEWER DefMiner than this one. The
   *  ladder is forward-only: it makes no change and reports this state rather
   *  than attempting a downgrade that would destroy the newer schema. */
  ahead: boolean;
  /** True when every attempted step succeeded. False means the schema is
   *  PARTIAL and the version was not advanced past the failing step. */
  ok: boolean;
  steps: MigrationStepRecord[];
};

/** Run `fn`, never throw, and report which it was. */
async function safe(
  step: string,
  fn: () => Promise<unknown>,
): Promise<MigrationStepRecord> {
  try {
    await fn();
    return { step, ok: true };
  } catch (e) {
    // The outer `.slice(0, 300)` is GONE rather than kept: `describeError` caps
    // at `ERROR_TEXT_LIMIT` (240), which is tighter, so the old bound could only
    // ever be dead code claiming a looser guarantee than the code gives. A
    // deliberate 300 -> 240 narrowing of this field.
    return { step, ok: false, error: describeError(e) };
  }
}

/**
 * Run every step above the database's current `user_version`, in order.
 *
 * `PRAGMA user_version` is header-scoped and MEASURED to survive across `exec`
 * calls and a connection switch (SPIKE-09 read 4242 back from a different `exec`
 * than the one that set it), which is what makes it usable as the ladder position
 * on a pooled connection.
 *
 * The version is written in a SEPARATE `exec` from the DDL because SQLite does not
 * accept a bound parameter in a PRAGMA value position. THE MIGRATION NUMBER IS A
 * COMPILE-TIME INTEGER FROM THE LITERAL ARRAY ABOVE AND NEVER COMES FROM INPUT —
 * stated explicitly because a reviewer scanning for string-built SQL will
 * otherwise flag this line as injection. A crash between the two `exec` calls
 * simply re-runs idempotent DDL on the next boot, which is why every step must be
 * `IF NOT EXISTS`.
 *
 * A step that FAILS stops the ladder where it is. The version is not advanced past
 * it, so the next boot retries the same step against the same schema instead of
 * skipping it and running the plugin on a half-built database.
 */
export async function migrate(db: Database): Promise<MigrationReport> {
  const steps: MigrationStepRecord[] = [];
  let current = 0;

  const read = await safe("read_user_version", async () => {
    const row = await (
      await db.prepare("PRAGMA user_version")
    ).get<{ user_version: number }>();
    current = Number(row?.user_version ?? 0);
  });
  steps.push(read);

  const head = SCHEMA_VERSION;
  const from = current;
  let applied = current;
  let ok = read.ok;

  if (ok) {
    for (const m of MIGRATIONS) {
      if (m.v <= applied) continue;
      // The DDL of one step is batched into ONE `exec` — legal ONLY because every
      // statement in it is `IF NOT EXISTS` and therefore cannot fail on a re-run.
      const ddl = await safe(`ddl_v${m.v}`, () => db.exec(m.sql));
      steps.push(ddl);
      if (!ddl.ok) {
        ok = false;
        break;
      }
      const bump = await safe(`user_version_v${m.v}`, () =>
        db.exec(`PRAGMA user_version = ${m.v}`),
      );
      steps.push(bump);
      if (!bump.ok) {
        ok = false;
        break;
      }
      applied = m.v;
    }
  }

  return { version: applied, from, head, ahead: from > head, ok, steps };
}

/** The highest step this build knows about. A database reporting a HIGHER
 *  user_version was written by a newer DefMiner; the ladder is forward-only and
 *  simply does nothing, rather than attempting a downgrade. */
export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].v;
