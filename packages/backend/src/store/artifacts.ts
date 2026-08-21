// packages/backend/src/store/artifacts.ts — content-addressed artifact identity (STORE-03).
//
// ONE statement per write, keyed on a natural key, safe to replay. There is no
// alternative on this driver: `BEGIN` does not span `exec` calls and every
// statement still returns SUCCESS, so code that LOOKS transactional passes every
// test and provides no atomicity whatsoever (Pitfall 2). No invariant here may
// require two statements to land together.

import type { Database } from "sqlite";

import { describeError } from "../telemetry";

// ADDITIVE ONLY (plan 01-04). `upsertArtifact`'s signature was settled by the
// tracer in plan 01-01 and is called by plan 01-03's consumer; it takes no `url`
// parameter (decision P1-D6) and nothing in this phase changes it. Everything
// added below is a READ.

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
/**
 * WHY EVERY ERROR-SHAPED BINDING IN THIS DIRECTORY RENDERS THROUGH `describeError`.
 *
 * Stated ONCE here, beside the first converted site, and cross-referenced from the
 * other five store modules rather than copy-pasted six times. Enforced statically
 * by `error-redaction.spec.ts` over `packages/backend/src/store/`.
 *
 * A rejection from this pooled SQLite driver is NOT a plugin-authored string. It
 * can carry the statement text and the BOUND PARAMETERS, and one of those
 * parameters IS the observation URL — the same value `normaliseObservedUrl` now
 * redacts on the way in. Rendering it raw would reintroduce through the ERROR path
 * exactly what the WRITE path removes.
 *
 * The rendered text reaches THREE sinks. All three were read out of
 * `ingest/consumer.ts` before this comment was written, rather than assumed:
 *
 *   1. `sdk.console.log`, on the `ARTIFACT_WRITE_FAILED`, `OBSERVATION_WRITE_FAILED`,
 *      `ANALYSIS_CLAIM_FAILED` and `ANALYSIS_FINISH_FAILED` lines. That lands in
 *      Caido's host log ON DISK: not a projection, not truncated by Caido, and never
 *      reviewed before it is written.
 *   2. `recordError`, which reaches the `getStatus` RPC. Already redacted at that
 *      boundary today, so this leg is defence in depth rather than load-bearing.
 *   3. `finishAnalysis`'s `error` parameter, which IS the `analyses.error` COLUMN —
 *      wired, typed and allowlisted in `schema.spec.ts`. Stated precisely, because a
 *      looser claim is falsifiable in one grep: the Phase 1 consumer passes `null`
 *      there, so this is the destination the plumbing POINTS AT, not a value being
 *      written today. ERR-02 and ERR-04 in Phase 2 are what will start filling it,
 *      and their author will read the gate to learn what is already guaranteed.
 *
 * `describeError` also prepends the exception's CLASS NAME, which a bare
 * stringification loses — a `TypeError` and a `RangeError` from the same line mean
 * completely different things — and it redacts BEFORE truncating (decision P5-D8).
 *
 * No cycle: `telemetry.ts` imports only `./hooks/admit`, which imports only
 * `@defminer/engine/thresholds`. Nothing under `store/` is reachable from either.
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
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

/** One artifact row, as it is stored. Declared rather than inferred so the reads
 *  below and every consumer agree on the shape without re-deriving it. */
export type ArtifactRow = {
  project_id: string;
  sha256: string;
  byte_len: number;
  kind: string;
  first_seen_at: number;
  last_seen_at: number;
  seen_count: number;
};

/**
 * Default page size for {@link listArtifacts}.
 *
 * A read with NO limit is a read whose cost is set by the target, not by us: this
 * database is never garbage-collected by Caido and survives a force-reinstall, so
 * "how many rows are there" has no upper bound the plugin controls. 500 is well
 * above any UI page and well below anything that would stall the single thread
 * marshalling it across the RPC boundary.
 */
export const ARTIFACT_LIST_DEFAULT_LIMIT = 500;

const LIST_ARTIFACTS_SQL = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
FROM artifacts
WHERE project_id = ?
ORDER BY last_seen_at DESC, sha256 ASC
LIMIT ?
`;

/**
 * Rows for one project, most recently seen first.
 *
 * THE SECONDARY SORT KEY IS THE POINT. `last_seen_at` alone is not a total order —
 * two artifacts seen in the same millisecond tie, and SQLite is then free to
 * return them in whatever order the scan produced, which can differ between two
 * runs and between a database and a re-created copy of it. `sha256 ASC` breaks
 * every tie deterministically, so a caller may compare two result sequences for
 * equality and have that mean something.
 *
 * Never relies on insertion or rowid order for the same reason there is no
 * surrogate id: rowid is not a stable identity on this schema.
 */
export async function listArtifacts(
  db: Database,
  projectId: string,
  limit: number = ARTIFACT_LIST_DEFAULT_LIMIT,
): Promise<ArtifactRow[]> {
  const stmt = await db.prepare(LIST_ARTIFACTS_SQL);
  return stmt.all<ArtifactRow>(projectId, limit);
}

const GET_ARTIFACT_SQL = `
SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
FROM artifacts
WHERE project_id = ? AND sha256 = ?
`;

/** One artifact by its natural key, or `undefined`. Both key columns are bound —
 *  a lookup by digest alone would cross the project boundary (T-01-20). */
export async function getArtifact(
  db: Database,
  projectId: string,
  sha256: string,
): Promise<ArtifactRow | undefined> {
  const stmt = await db.prepare(GET_ARTIFACT_SQL);
  return stmt.get<ArtifactRow>(projectId, sha256);
}

const COUNT_ARTIFACTS_SQL = `SELECT COUNT(*) AS n FROM artifacts WHERE project_id = ?`;

/** How many artifacts this project holds. Used by the retention sweep to decide
 *  whether the row-count bound binds at all before it deletes anything. */
export async function countArtifacts(
  db: Database,
  projectId: string,
): Promise<number> {
  const stmt = await db.prepare(COUNT_ARTIFACTS_SQL);
  const row = await stmt.get<{ n: number }>(projectId);
  return Number(row?.n ?? 0);
}
