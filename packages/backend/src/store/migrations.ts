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
