// packages/backend/src/store/observations.ts — the artifact -> request -> URL edge.
//
// This table is what makes "durably remembers what it saw" true. An artifact row
// on its own records that some bytes were seen but not WHERE, and identity is
// decoupled from URL because the URL lives on this edge — not because it was
// discarded (decisions P1-D1, P1-D6).

import type { Database } from "sqlite";

import type { StoreWriteResult } from "./artifacts";

// ADDITIVE ONLY (plan 01-04). `recordObservation`'s signature and SQL are exactly
// as plan 01-01 shipped them and as plan 01-03's consumer calls them. Everything
// added below is a READ.

/** `content_type` is TARGET-CONTROLLED. Truncated to a bounded length so a
 *  hostile origin cannot push an unbounded string into the operator's database. */
const CONTENT_TYPE_MAX = 120;
/** So is the URL. Bounded for the same reason; 2048 is comfortably above any real
 *  bundle URL and below anything worth storing. */
const URL_MAX = 2048;

// Same discipline as the artifact upsert: one statement, positional `?` only,
// prepared inside the write, parameters SPREAD into run().
const RECORD_OBSERVATION_SQL = `
INSERT INTO observations (project_id, sha256, request_id, url, status, content_type, observed_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (project_id, sha256, request_id) DO UPDATE SET
  observed_at = excluded.observed_at
`;

/**
 * Strip the fragment; KEEP the query.
 *
 * A cache-busting query parameter is exactly what makes a re-served bundle a MISS,
 * and dropping it would inflate the cache hit rate this data exists to measure. A
 * fragment never reaches an origin and carries no server-side meaning.
 */
export function normaliseObservedUrl(url: string): string {
  return String(url).split("#")[0].slice(0, URL_MAX);
}

/**
 * Record that this artifact was seen on this request at this URL.
 *
 * Called on the SAME consumer iteration as {@link upsertArtifact} and never
 * conditionally: an artifact written without its observation is the failure this
 * pairing exists to prevent. They are two statements because they MUST be — this
 * driver has no transaction primitive — so each reports its own outcome and the
 * caller counts and logs a failure of either rather than leaving the other
 * silently orphaned.
 */
export async function recordObservation(
  db: Database,
  projectId: string,
  sha256: string,
  requestId: string,
  url: string,
  status: number,
  contentType: string | null,
  observedAt: number,
): Promise<StoreWriteResult> {
  try {
    const stmt = await db.prepare(RECORD_OBSERVATION_SQL);
    const res = await stmt.run(
      projectId,
      sha256,
      requestId,
      normaliseObservedUrl(url),
      status,
      contentType === null
        ? null
        : String(contentType).slice(0, CONTENT_TYPE_MAX),
      observedAt,
    );
    return { ok: true, changes: res.changes };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200) };
  }
}

/** One observation row, as it is stored. */
export type ObservationRow = {
  project_id: string;
  sha256: string;
  request_id: string;
  url: string;
  status: number;
  content_type: string | null;
  observed_at: number;
};

/** Same reasoning as {@link ARTIFACT_LIST_DEFAULT_LIMIT}: an unbounded read over a
 *  table whose size the TARGET drives is a cost we do not control. */
export const OBSERVATION_LIST_DEFAULT_LIMIT = 500;

// TWO COMPLETE LITERAL STATEMENTS, chosen between — never one string assembled
// from a condition. Concatenating a fragment onto SQL at runtime is the exact
// shape `sql-discipline.spec.ts` fails, and writing the digest filter as an
// optional clause would have made this module the first exception to a rule whose
// value is that it has none.
const LIST_OBSERVATIONS_SQL = `
SELECT project_id, sha256, request_id, url, status, content_type, observed_at
FROM observations
WHERE project_id = ?
ORDER BY observed_at DESC, request_id ASC
LIMIT ?
`;

const LIST_OBSERVATIONS_FOR_DIGEST_SQL = `
SELECT project_id, sha256, request_id, url, status, content_type, observed_at
FROM observations
WHERE project_id = ? AND sha256 = ?
ORDER BY observed_at DESC, request_id ASC
LIMIT ?
`;

/**
 * Where this project saw things, most recently first.
 *
 * With `sha256` given, the sightings of ONE artifact — which is the read the
 * retention cascade and any future "where did this bundle come from" surface both
 * want. Without it, the project's whole recent edge set.
 *
 * `request_id ASC` is the tie-break, for the same reason `listArtifacts` has one:
 * `observed_at` alone is not a total order, and two sightings in the same
 * millisecond would otherwise be free to swap between runs.
 */
export async function listObservations(
  db: Database,
  projectId: string,
  sha256?: string,
  limit: number = OBSERVATION_LIST_DEFAULT_LIMIT,
): Promise<ObservationRow[]> {
  if (sha256 === undefined) {
    const stmt = await db.prepare(LIST_OBSERVATIONS_SQL);
    return stmt.all<ObservationRow>(projectId, limit);
  }
  const stmt = await db.prepare(LIST_OBSERVATIONS_FOR_DIGEST_SQL);
  return stmt.all<ObservationRow>(projectId, sha256, limit);
}

const COUNT_OBSERVATIONS_SQL = `SELECT COUNT(*) AS n FROM observations WHERE project_id = ?`;

/** How many observations this project holds. The retention sweep's row-count bound
 *  is per table per project, so it needs this before it deletes anything. */
export async function countObservations(
  db: Database,
  projectId: string,
): Promise<number> {
  const stmt = await db.prepare(COUNT_OBSERVATIONS_SQL);
  const row = await stmt.get<{ n: number }>(projectId);
  return Number(row?.n ?? 0);
}
