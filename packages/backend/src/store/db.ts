// packages/backend/src/store/db.ts — the memoised database handle.
//
// `sdk.meta.db()` is ONE database for the plugin across EVERY project. It lives in
// Caido Data, is never garbage-collected by Caido, is not deleted when a project
// is deleted, and survives a force-reinstall. That is why `project_id` is part of
// every primary key and every WHERE clause (STORE-02) rather than a convention.
//
// The handle is a connection POOL over worker threads (default 5 connections),
// which is why nothing in this layer may assume statement-to-connection affinity.

import type { Database } from "sqlite";

type MetaSdk = { meta: { db(): Promise<Database> } };

let handle: Promise<Database> | undefined;

/** Memoised so `init()`, the consumer and every RPC share one pool rather than
 *  opening several. Returns the same promise, not the same awaited value, so
 *  concurrent first callers cannot race two `db()` calls. */
export function getDb(sdk: MetaSdk): Promise<Database> {
  if (handle === undefined) {
    handle = sdk.meta.db();
  }
  return handle;
}

/**
 * ONE POOLED HANDLE SPANS EVERY PROJECT, BY DESIGN.
 *
 * There is deliberately no production reset. `sdk.meta.db()` returns the ONE
 * database Caido keeps for this plugin across every project — switching project
 * does not change which file is open, so re-resolving the handle on a change
 * would open a second pool onto the same bytes and prove nothing. Isolation is
 * `project_id` in every primary key and every WHERE clause (STORE-02); it is not
 * and cannot be a fresh connection.
 *
 * This mattered because the code used to claim otherwise. `applyProjectChange`
 * called a reset and a comment said "the next write re-resolves the handle" —
 * but `index.ts` resolves the handle ONCE and hands that object to the consumer
 * and to both read RPCs, so nothing ever consulted the memo again. The reset was
 * a no-op dressed as a safety property, and the test that covered it called
 * `getDb()` by hand rather than driving anything production does.
 *
 * What remains is a TEST SEAM, named like the other three (`resetLifecycleForTest`,
 * `resetConsumerForTest`, `resetPassiveForTest`): module state is process-global,
 * so a spec that did not clear it would inherit the previous case's fixture
 * database. Deliberately does not close the pool — the SDK exposes no close, and
 * Caido owns the lifetime.
 */
export function resetDbHandleForTest(): void {
  handle = undefined;
}

// --- sqlite_version ---------------------------------------------------------
//
// ONE place in the codebase knows which SQLite is underneath. RESEARCH.md Open
// Question 1 asked because `ON CONFLICT ... DO UPDATE` needs >= 3.24 and this
// whole storage design has NO fallback below it; plan 01-01 measured 3.46.0 and
// recorded it as EXERCISED (510 sightings collapsed into one row), not inferred
// from a version string.
//
// Cached process-wide rather than per-handle: the engine underneath does not
// change when the operator switches project, and neither does the database. See
// `resetDbHandleForTest` above for why there is no production reset of either.

let sqliteVersion: string | null = null;

/** Read `sqlite_version()` once and cache it. Returns `null` if the read fails —
 *  never throws, because a version read is diagnostic and must not be able to
 *  take `init()` down. */
export async function readSqliteVersion(db: Database): Promise<string | null> {
  if (sqliteVersion !== null) return sqliteVersion;
  try {
    const row = await (
      await db.prepare("SELECT sqlite_version() AS v")
    ).get<{ v: string }>();
    sqliteVersion = row?.v === undefined ? null : String(row.v);
  } catch {
    sqliteVersion = null;
  }
  return sqliteVersion;
}
