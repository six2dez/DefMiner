// packages/backend/src/store/migrations.ts — the forward-only migration ladder (STORE-05).
//
// SHIPPED STEPS ARE IMMUTABLE. Once a step has been released it is never edited:
// a user's populated database has already run it, so an edit changes the schema of
// new installs only and silently forks the two. Later columns arrive as NEW steps.
//
// Step v1 (this tracer) creates `artifacts` and `observations`.
// Step v2 (plan 01-04) adds `analyses` and `settings`.

import type { Database } from "sqlite";

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
];

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
 */
export async function migrate(db: Database): Promise<number> {
  const row = await (
    await db.prepare("PRAGMA user_version")
  ).get<{ user_version: number }>();
  const current = row?.user_version ?? 0;
  let applied = current;
  for (const m of MIGRATIONS) {
    if (m.v <= applied) continue;
    await db.exec(m.sql);
    await db.exec(`PRAGMA user_version = ${m.v}`);
    applied = m.v;
  }
  return applied;
}

/** The highest step this build knows about. A database reporting a HIGHER
 *  user_version was written by a newer DefMiner; the ladder is forward-only and
 *  simply does nothing, rather than attempting a downgrade. */
export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].v;
