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

import type { Database } from "sqlite";

import { describeError } from "../telemetry";

// Caught exceptions render through `describeError`, never a bare stringification.
// The reasoning — a driver rejection carries the bound parameters, and one of them
// is the observation URL — is stated once beside the first converted site in
// `artifacts.ts`. Enforced by `error-redaction.spec.ts`.

/**
 * All DDL is `IF NOT EXISTS` and therefore cannot fail on a re-run, which is the
 * ONLY reason it is legal to batch it into a single multi-statement `exec`.
 *
 * The rule it depends on: a single `exec` string IS an atomic unit
 * (MULTISTATEMENT_EXEC_ATOMIC), but an `exec` that FAILS leaves an open write
 * transaction on a pooled connection that nothing in the plugin API can reach —
 * every subsequent write then fails with "database is locked" until the plugin
 * restarts (Pitfall 1). So DDL that cannot fail may be batched; a data write never
 * may. This is also why `probe/tier0-budgets/backend/script.js:219-222` records a
 * CREATE that landed inside a dangling transaction and read back as "no such
 * table": every table is created UP FRONT, in `init()`, before any data write.
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
