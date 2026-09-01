// packages/backend/src/store/sources.ts — where recovered source is REMEMBERED
// without ever being STORED.
//
// D-05's identity model is the shipped `artifacts` / `observations` split applied
// to a second entity class: `sources` holds one row per distinct source CONTENT,
// keyed by the sha256 OF THAT CONTENT, and `source_sightings` holds one row per
// `(map, index)` place that content was seen. Two different bundles carrying the
// same source therefore produce ONE `sources` row and TWO sighting rows, and
// MAP-06's once-per-content-hash guarantee is literal rather than aspirational
// because it falls out of the primary keys.
//
// D-07: THE CONTENT ITSELF IS NEVER HELD. There is no content column here in any
// encoding — a name, a size, a line count, a content digest, which map it came
// from and which request produced it, and nothing else. That is not a compromise
// forced by storage limits; it is the phase's strongest security property.
// Recovered source is the target's actual source code, plausibly carrying
// credentials, internal hostnames and business logic, and a stolen copy of the
// plugin database contains none of it. `store/schema.spec.ts` enforces the same
// claim structurally, from two independent directions: `body` is forbidden BY
// NAME, and every column's DECLARED TYPE is read out of `PRAGMA table_info` so a
// BLOB or an untyped column cannot arrive under a harmless name.

import { SOURCE_PRODUCIBILITY_STATES } from "@defminer/engine/contract";
import type { SourceProducibility } from "@defminer/engine/contract";
import type { Database } from "sqlite";

import { describeError } from "../telemetry";

// Caught exceptions render through `describeError`, never a bare stringification.
// It matters more here than anywhere else in this package: a driver rejection
// carries the bound parameters, and one of them is `sources_verbatim` — a string
// a hostile origin chose. Redaction happens BEFORE truncation on every catch
// below, which is what `store/error-redaction.spec.ts` polices.

import type { StoreWriteResult } from "./artifacts";

/**
 * The bound on `source_sightings.sources_verbatim` — the one target-controlled
 * column this phase adds.
 *
 * DECLARED HERE WITH ITS OWN JUSTIFICATION, not reused from `URL_MAX` by
 * association. The two columns are bounded for the same reason and at different
 * numbers, and inheriting one bound because the other exists is how a cap stops
 * being a decision.
 *
 * D-06's "VERBATIM" MEANS UNSANITISED AND UNNORMALISED. IT DOES NOT MEAN
 * UNBOUNDED. The label is evidence — the exact bytes the map declared, which is
 * the whole point of keeping it — so nothing here rewrites it, percent-decodes
 * it, strips its control characters or normalises its Unicode. But a
 * target-controlled string AT REST is bounded here exactly as `observations.url`
 * is bounded at `URL_MAX`, because "we keep the evidence" and "a hostile origin
 * may choose how many bytes we keep" are different claims.
 *
 * 4,096 RATHER THAN 2,048, FOR TWO REASONS AND BOTH ARE ABOUT BEING NOTICED.
 * It sits above the shipped 1,024-grapheme display caps, so the truncation an
 * operator actually SEES is the DISPLAY one, at the surface that has the
 * sanitiser in front of it — a storage cap below the display cap would silently
 * become the display cap and move the boundary somewhere nothing tests. And it
 * is the size of `map-fixture.ts`'s `four-kilobyte-label` case, so the boundary
 * is exercised from both sides by a fixture that already exists rather than by a
 * number chosen to be convenient.
 *
 * THIS IS THE ONE PLACE THIS PHASE BOUNDS EVIDENCE. Above the cap the stored
 * label is a PREFIX of what the map declared, and `sources.spec.ts` asserts that
 * from both sides so the fact is executed rather than promised.
 */
export const SOURCES_LABEL_MAX = 4096;

/**
 * The state every sighting is born in, READ FROM THE VOCABULARY rather than
 * spelled out.
 *
 * It is bound into two statements below and they mean different things by it:
 * the seed value on insert, and the GUARD value on the sticky update. Writing
 * the literal twice would let one of them drift from the other and from the
 * database's own CHECK — and the drift would be invisible, because a guard that
 * never matches simply changes zero rows and reports success.
 */
const INITIAL_PRODUCIBILITY: SourceProducibility =
  SOURCE_PRODUCIBILITY_STATES[0];

// Positional `?` ONLY, on every statement in this file.
//
// `exec()` accepts NO bind values and SILENTLY IGNORES an array passed to it,
// which in Phase 0 produced rows with every column NULL and a NOT NULL constraint
// error that never surfaced. Binding requires prepare() then run(...params) with
// the parameters SPREAD, never handed over as one array. Named parameters are
// unsupported by this driver and never report that they did not bind.
//
// No `RETURNING` and no `last_insert_rowid()`: the latter is unusable on the
// pooled connection, so both tables are addressed by the natural key the caller
// already holds. `db.prepare()` is called INSIDE each function; only the SQL
// STRING lives at module scope.

const UPSERT_SOURCE_SQL = `
INSERT INTO sources (project_id, source_sha256, byte_len, line_count, first_seen_at)
VALUES (?, ?, ?, ?, ?)
ON CONFLICT (project_id, source_sha256) DO UPDATE SET
  byte_len = excluded.byte_len,
  line_count = excluded.line_count
`;

// `first_seen_at` IS DELIBERATELY NOT IN THE UPDATE ARM. The row's identity is
// its content digest, so a second sighting of the same bytes is the SAME source
// seen again — moving `first_seen_at` forward would make retention's ordering
// describe the most recent sighting while claiming to describe the first, and
// `idx_sources_seen` leads on that column. `byte_len` and `line_count` are
// re-asserted instead of skipped because they are functions of the content and
// the content is fixed by the key: writing them again is a no-op that costs
// nothing and makes a disagreement impossible to persist.

const RECORD_SIGHTING_SQL = `
INSERT INTO source_sightings (project_id, map_sha256, source_index, artifact_sha256,
                              request_id, source_sha256, sources_verbatim,
                              producibility, producibility_at, recovered_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
ON CONFLICT (project_id, map_sha256, source_index) DO UPDATE SET
  artifact_sha256 = excluded.artifact_sha256,
  request_id = excluded.request_id,
  source_sha256 = excluded.source_sha256,
  sources_verbatim = excluded.sources_verbatim
`;

// `recovered_at` AND `producibility` ARE NOT IN THE UPDATE ARM EITHER, and the
// two omissions carry different weight. `recovered_at` is when this sighting was
// first recorded and D-22's tombstone copy interpolates it; re-running the same
// write must not move it forward. `producibility` is the one that would be a
// DEFECT: an upsert that reset it to the initial member would un-stick a
// tombstone every time the map was re-analysed, which is exactly the property
// D-23 exists to guarantee and which `markProducibility` below makes a property
// of the STATEMENT rather than of a caller's discipline.

const COUNT_SOURCES_FOR_MAP_SQL = `
SELECT COUNT(*) AS n
FROM source_sightings
WHERE project_id = ? AND map_sha256 = ?
`;

/**
 * Record one distinct recovered source CONTENT.
 *
 * `sourceSha256` is the digest of the CONTENT and never of the label — D-05's
 * identity — so two bundles shipping the same module produce one row here.
 * `byteLen` and `lineCount` are DefMiner-computed at recovery time, before the
 * content is discarded; under D-07 nothing can re-derive them later without a
 * full bundle reload, which is why they are columns rather than read-time work.
 */
export async function upsertRecoveredSource(
  db: Database,
  projectId: string,
  sourceSha256: string,
  byteLen: number,
  lineCount: number,
  firstSeenAt: number,
): Promise<StoreWriteResult> {
  try {
    const stmt = await db.prepare(UPSERT_SOURCE_SQL);
    const res = await stmt.run(
      projectId,
      sourceSha256,
      byteLen,
      lineCount,
      firstSeenAt,
    );
    return { ok: true, changes: res.changes };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

/**
 * Record one `(map, index)` sighting of a recovered source.
 *
 * TWO PARAMETERS ARE NULLABLE AND EACH NULL MEANS SOMETHING DIFFERENT
 * (07-RESEARCH.md § Pitfall 3). `sourceSha256` is null when that index carried
 * NO CONTENT at all — the map declared a source it did not ship — and there is
 * then no `sources` row to point at; the sighting is still written, because an
 * index with nothing behind it is still a fact about the bundle and is still
 * tombstone-eligible. `sourcesVerbatim` is null when the map declares
 * `sources[i]` as literal null, which ECMA-426 permits; that stores as SQL NULL
 * and never as the three-character string "null".
 *
 * `producibility` is seeded to the FIRST vocabulary member and is never written
 * again by this statement — see the comment on {@link markProducibility}.
 */
export async function recordSighting(
  db: Database,
  projectId: string,
  mapSha256: string,
  sourceIndex: number,
  artifactSha256: string,
  requestId: string,
  sourceSha256: string | null,
  sourcesVerbatim: string | null,
  recoveredAt: number,
): Promise<StoreWriteResult> {
  try {
    const stmt = await db.prepare(RECORD_SIGHTING_SQL);
    const res = await stmt.run(
      projectId,
      mapSha256,
      sourceIndex,
      artifactSha256,
      requestId,
      sourceSha256,
      // TRUNCATED, NEVER TRANSFORMED. `slice` is the only thing done to this
      // value on the whole write path: no trim, no normalise, no decode, no
      // sanitiser. D-06 puts all of that at display time, and the bound is
      // argued at `SOURCES_LABEL_MAX`.
      sourcesVerbatim === null
        ? null
        : sourcesVerbatim.slice(0, SOURCES_LABEL_MAX),
      INITIAL_PRODUCIBILITY,
      recoveredAt,
    );
    return { ok: true, changes: res.changes };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

/**
 * How many sightings one map already has, so the caller can hold
 * `SOURCE_ROWS_PER_MAP_MAX`.
 *
 * THE BOUND IS ENFORCED BY THE CALLER, AND THE REFUSAL IS NAMED. This function
 * only counts; plan 07-05's ingest path compares the count and refuses with a
 * reason rather than stopping quietly, because a map that silently wrote 2,048
 * of its 2,049 sources and said nothing is indistinguishable from a map that had
 * 2,048. `SOURCE_ROWS_PER_MAP_MAX` bounds MAP-06's aggregate limit and Pitfall
 * 2's convergence fix with the SAME constant — two constants for one quantity is
 * how a retention sweep comes to bound nothing while running exactly as designed.
 */
export async function countSourcesForMap(
  db: Database,
  projectId: string,
  mapSha256: string,
): Promise<number> {
  const stmt = await db.prepare(COUNT_SOURCES_FOR_MAP_SQL);
  const row = await stmt.get<{ n: number }>(projectId, mapSha256);
  return row?.n ?? 0;
}
