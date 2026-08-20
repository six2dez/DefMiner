// packages/backend/src/store/artifacts.ts — content-addressed artifact identity (STORE-03).
//
// ONE statement per write, keyed on a natural key, safe to replay. There is no
// alternative on this driver: `BEGIN` does not span `exec` calls and every
// statement still returns SUCCESS, so code that LOOKS transactional passes every
// test and provides no atomicity whatsoever (Pitfall 2). No invariant here may
// require two statements to land together.

import type { Database } from "sqlite";

/** Every store write reports its own outcome instead of throwing.
 *
 *  Caido surfaces NEITHER a synchronous throw nor an async rejection from plugin
 *  code (HANDLER_ERROR_SURFACED = "neither"), so an uncaught rejection here would
 *  be completely invisible — no row, no error, nothing in any log. The rejection
 *  is caught at the write, truncated, and handed back so the caller can count it
 *  and still attempt the paired write rather than silently orphaning it. */
export type StoreWriteResult =
  | { ok: true; changes: number }
  | { ok: false; error: string };

// Positional `?` ONLY.
//
// `exec()` accepts NO bind values at all and SILENTLY IGNORES an array passed to
// it, which in Phase 0 produced rows with every column NULL and a NOT NULL
// constraint error that never surfaced. Binding requires prepare() then
// Statement.run(...params) with the parameters SPREAD, never passed as one array.
// Named parameters are unsupported.
//
// No `RETURNING` and no `last_insert_rowid()`: the latter is unusable on this
// pooled connection, so every row a later statement needs is addressed by its
// natural key.
const UPSERT_ARTIFACT_SQL = `
INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count)
VALUES (?, ?, ?, ?, ?, ?, 1)
ON CONFLICT (project_id, sha256) DO UPDATE SET
  last_seen_at = excluded.last_seen_at,
  seen_count   = artifacts.seen_count + 1
`;

/**
 * Record that these bytes exist in this project, or that they have been seen again.
 *
 * There is deliberately NO `url` parameter and no `url` column. Content-addressed
 * identity means the URL is an attribute of an OBSERVATION; putting it here would
 * both duplicate it and leave a column that later stops being written. This
 * signature is settled — plans 01-03 and 01-04 call it and neither changes it.
 *
 * The statement is prepared INSIDE the write. Never a module-level statement:
 * `sdk.meta.db()` is a pool over worker threads, so two `run()` calls on a shared
 * Statement could land on different connections with interleaved bindings. And
 * never a module-level PROMISE either: a continuation attached to an
 * already-settled promise left over from a previous event invocation is never
 * driven in this runtime — the handler logs, returns, and the `.then()` simply
 * never runs.
 */
export async function upsertArtifact(
  db: Database,
  projectId: string,
  sha256: string,
  byteLen: number,
  kind: string,
  nowMs: number,
): Promise<StoreWriteResult> {
  try {
    const stmt = await db.prepare(UPSERT_ARTIFACT_SQL);
    const res = await stmt.run(projectId, sha256, byteLen, kind, nowMs, nowMs);
    return { ok: true, changes: res.changes };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}

/** Rows for one project, ordered deterministically. `ORDER BY` is explicit and
 *  never relies on insertion or rowid order, so a result set is stable across runs
 *  and across a re-created database. */
export async function listArtifacts(
  db: Database,
  projectId: string,
): Promise<object[]> {
  const stmt = await db.prepare(
    `SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
     FROM artifacts WHERE project_id = ? ORDER BY sha256 ASC`,
  );
  return stmt.all(projectId);
}
