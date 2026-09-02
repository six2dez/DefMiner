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
ON CONFLICT (project_id, artifact_sha256, map_sha256, source_index) DO UPDATE SET
  request_id = excluded.request_id,
  source_sha256 = excluded.source_sha256,
  sources_verbatim = excluded.sources_verbatim
WHERE source_sightings.artifact_sha256 = excluded.artifact_sha256
`;

// =============================================================================
// THE TRAILING `WHERE` IS AN ATTRIBUTION GUARD, NOT AN OPTIMISATION
// =============================================================================
// 07-REVIEW.md HI-03, and it is target-triggerable at will.
//
// The key is `(project_id, map_sha256, source_index)` and `map_sha256` is
// content-addressed over the DECODED MAP JSON — never over the bundle. TWO
// DIFFERENT BUNDLES CAN THEREFORE SHARE A `map_sha256` while having different
// `artifact_sha256`: a CDN mirror with a different banner comment, a decoy stub
// that carries a copy of the map, or the same library genuinely re-bundled.
//
// The update arm used to read `artifact_sha256 = excluded.artifact_sha256,
// request_id = excluded.request_id`, so the second bundle did not create a
// second set of sightings — it OVERWROTE THE FIRST BUNDLE'S, moving the
// attribution to itself. Artifact A's drill-down then returned zero rows
// (`listRecoveredSourcesPage` is scoped `WHERE sg.artifact_sha256 = ?`),
// `countRecoveredSourcesByArtifact` reported `0` on the `scan_state = 'done'`
// ground — the RESOLVED zero, the one the whole zero-versus-unknown design
// exists to make mean "DefMiner looked and there was nothing" — and the tree
// rendered "No recovered sources in this bundle" about a bundle DefMiner had
// recovered four hundred sources from. D-24 did not catch it: the reload
// verified against B's digest and SUCCEEDED, so the attribution was simply the
// wrong bundle's, silently.
//
// WHAT THE GUARD DOES. A conflicting row is updated only when the incoming
// sighting names the SAME artifact. The first writer keeps the attribution and
// the second bundle's sighting is DISCARDED — reported as `changes: 0`, which
// `ingest/consumer.ts` counts rather than swallowing, because a discarded write
// that reports success is how a health surface comes to describe work that
// produced no row.
//
// `artifact_sha256` IS GONE FROM THE `SET` LIST ENTIRELY, and that is the
// structural half: under the guard it could only ever be assigned its own
// value, so removing it makes "a sighting never changes bundles" a property of
// the STATEMENT rather than of a predicate a reader has to evaluate.
//
// `request_id` STAYS IN THE `SET` LIST, and it has to. It is refreshed only
// when the artifact matches, so it always names a request that served THIS
// bundle's bytes — which is exactly what D-24 reloads and re-verifies against.
// Pinning it to the first sighting instead would let Caido's history evict that
// request while the bundle is still being served, and `no_request` mints a
// STICKY `gone` tombstone. Moving it to a DIFFERENT bundle's request is the bug
// above. Refreshing it within one bundle is the only one of the three that is
// correct.
//
// THIS IS AN INTERIM MITIGATION AND IT IS NOT THE FIX. The complete fix widens
// the natural key to `(project_id, artifact_sha256, map_sha256, source_index)`
// so BOTH bundles keep their evidence, which is a v9 migration and a fifth
// `EXPECTED_TABLES` change — an operator decision that has not been taken. What
// this delivers is the strictly smaller property: the FIRST bundle's evidence
// can no longer be taken away from it. The second bundle's sighting is still
// lost, and `sightingsDiscardedOtherArtifact` is how an operator can see that
// it happened rather than inferring it from a drill-down that reads zero.

// `recovered_at` AND `producibility` ARE NOT IN THE UPDATE ARM EITHER, and the
// two omissions carry different weight. `recovered_at` is when this sighting was
// first recorded and D-22's tombstone copy interpolates it; re-running the same
// write must not move it forward. `producibility` is the one that would be a
// DEFECT: an upsert that reset it to the initial member would un-stick a
// tombstone every time the map was re-analysed, which is exactly the property
// D-23 exists to guarantee and which `markProducibility` below makes a property
// of the STATEMENT rather than of a caller's discipline.

const MARK_PRODUCIBILITY_SQL = `
UPDATE source_sightings
SET producibility = ?, producibility_at = ?
WHERE project_id = ? AND artifact_sha256 = ?
  AND map_sha256 = ? AND source_index = ?
  AND producibility = ?
`;

// D-23's WRITE ON A READ PATH, in `retry.ts:RETRY_ANALYSIS_SQL`'s shape — one
// statement, positional `?` only, `project_id` first in the `WHERE`, values
// spread into `run`, no `RETURNING`, no `last_insert_rowid()`.
//
// THE TRAILING `AND producibility = ?` IS THE WHOLE MECHANISM. Bound to the
// FIRST vocabulary member, it makes the write idempotent and makes D-23's
// stickiness a property of the statement: the first attempt changes one row, a
// second attempt matches nothing and changes zero, and no sequence of calls can
// move a sighting back out of a tombstone. A caller-side "read it, check it,
// write it" would be two operations with no transaction primitive to join them.
//
// `artifact_sha256` IS IN THE `WHERE` SO THAT "ONE CALL MOVES ONE SIGHTING" IS A
// PROPERTY OF THE STATEMENT TOO (07-REVIEW.md HI-03, finding W-3). It sits
// immediately after `project_id`, in key order. Without it this write matches on
// `(project_id, map_sha256, source_index)` — and `map_sha256` is
// content-addressed over the DECODED MAP and never over the bundle, so two
// bundles can share one. A tombstone raised from ONE bundle's drill-down would
// then move EVERY bundle's sighting at that index, and D-23 makes the damage
// permanent: no sequence of calls moves any of them back. Measured against the
// pre-widening statement, one call reported `changes: 2` and marked both bundles
// `gone`. Today the shipped primary key makes the second row unrepresentable, so
// that is latent rather than live; plan 07-12 removes exactly that accident,
// which is why this predicate ships FIRST.
//
// O-06's VERDICT, RECORDED WHERE THE STATEMENT IS. `sql-discipline.spec.ts`
// models statement TEXT and has no concept of which RPC issues a statement, so
// "a write on a read path" is not a category it can express — asking it to
// express one would mean teaching a static gate about call graphs. The shipped,
// green precedent for exactly this shape is `RETRY_ANALYSIS_SQL`, and the reason
// the shape is safe is visible in the statement itself rather than in the
// caller: it is guarded, single-row and idempotent.

// DELIBERATELY MAP-SCOPED AND DELIBERATELY NOT WIDENED BY PLAN 07-11. This is
// the third and last statement in the backend that names sightings by map, and
// unlike the two above it does NOT name ONE sighting — it is MAP-06's aggregate
// over every sighting of a map, which is the count 07-05's refusal compares
// against, so a bundle predicate would change what it counts rather than
// disambiguate it. It also has NO production caller today (07-REVIEW.md MD-04),
// and plan 07-15 owns both its wiring and the artifact scope its bound needs.
// Widening it here would be guessing that plan's answer.
const COUNT_SOURCES_FOR_MAP_SQL = `
SELECT COUNT(*) AS n
FROM source_sightings
WHERE project_id = ? AND map_sha256 = ?
`;

// D-24's INTEGRITY READ. The recorded digest a derivation re-verifies against
// comes FROM THE DATABASE, never from the caller.
//
// THAT IS THE WHOLE OF T-07-05's MITIGATION AND IT IS WORTH SAYING WHY, because
// the obvious shape — let the RPC carry `requestId` and `artifactSha256` and
// compare the two — typechecks, reads naturally, and is VACUOUS. A caller that
// supplies both halves of an equality supplies the answer: it could name any
// request in Caido's history, name that request's own digest, and be handed
// content presented as this bundle's. The whole point of D-24 is that the
// operator can never be shown source attributed to a bundle it did not come
// from, and an attribution the caller chose is not an attribution at all.
//
// So the RPC names the SIGHTING — `(artifact_sha256, map_sha256, source_index)`,
// project-scoped — and this statement answers with which request DefMiner itself
// recorded, which bundle digest it recorded, and when. The set of requests the
// derivation path can reach is therefore exactly the set DefMiner already
// recorded a sighting for, in this project.
//
// THE BUNDLE DIGEST IS PART OF THE NAME AND IS STILL NOT PART OF THE ANSWER,
// and the distinction is the whole of why widening this predicate does not
// reopen the tautology above (07-REVIEW.md HI-03, finding W-3). Naming a
// sighting is not naming a request: the caller says WHICH of DefMiner's own
// recorded sightings it means, and `request_id` — the thing that decides which
// stored body is reloaded — still comes back out of the matched row. A caller
// that names a tuple with no row gets `undefined` and is answered `unavailable`;
// it cannot name a request at all, let alone pair one with a digest of its
// choosing, which is the pairing D-24 exists to refuse.
//
// WITHOUT THE BUNDLE IN THE PREDICATE THIS READ IS AMBIGUOUS THE MOMENT THE KEY
// WIDENS. `map_sha256` is content-addressed over the DECODED MAP and never over
// the bundle, so two bundles can share one — the same case the attribution guard
// on `RECORD_SIGHTING_SQL` was built for. Today that guard makes the second
// bundle's sighting UNWRITABLE and the shipped primary key makes it
// unrepresentable, so a three-part `WHERE` matches at most one row by accident
// of the schema rather than by construction. Plan 07-12 removes both of those
// accidents. This predicate is what makes "one call, one sighting" survive it,
// and it ships FIRST so there is never a commit at which `stmt.get` returns
// whichever of two rows SQLite reached first.
//
// A LEFT JOIN ONTO `artifacts` for one column, in `reads.ts`'s shape. The
// artifact's `byte_len` is the number the `changed` arm reports beside the
// reloaded body's length so a re-deploy — the expected benign cause — is visible
// as a difference rather than only as a refusal the operator cannot explain. An
// INNER join would drop the sighting entirely when retention has already swept
// the artifact row, turning a tombstone-eligible fact into a missing one;
// `byte_len` comes back NULL there, which is a different claim from zero.
const SIGHTING_ORIGIN_SQL = `
SELECT sg.artifact_sha256, sg.request_id, sg.recovered_at, sg.producibility,
       ar.byte_len
FROM source_sightings sg
LEFT JOIN artifacts ar
  ON ar.project_id = sg.project_id AND ar.sha256 = sg.artifact_sha256
WHERE sg.project_id = ? AND sg.artifact_sha256 = ?
  AND sg.map_sha256 = ? AND sg.source_index = ?
`;

/**
 * Where one sighting came from, as the derivation path needs it.
 *
 * `@internal` — the four fields are the derivation's inputs and are not a
 * projection anything renders.
 */
export type SightingOrigin = {
  artifact_sha256: string;
  request_id: string;
  recovered_at: number;
  producibility: string;
  /** The BUNDLE's recorded byte length, or null when its artifact row is gone. */
  byte_len: number | null;
};

/**
 * Read one sighting's origin, so a derivation can reload the right request and
 * re-verify against the right digest.
 *
 * THE FOUR ARGUMENTS ARE THE SIGHTING'S FULL NAME, and the uniqueness this
 * function relies on is the one the CALLER states rather than one the schema
 * happens to enforce. It used to reason from a sighting being unique on
 * `(map, index)`; that is true only while the attribution guard on
 * {@link recordSighting} and the shipped primary key together make a second
 * bundle's sighting unwritable, and plan 07-12 removes both. `artifactSha256`
 * sits between `projectId` and `mapSha256` so the argument order mirrors the key
 * order — a transposed call is then a type error at the digest/number boundary
 * rather than a silently wrong row.
 *
 * `undefined` when there is no such sighting in this project — INCLUDING when
 * the map and index are real and the bundle named is not the one that carried
 * them. The caller must answer that with its "could not ask" sentinel and MUST
 * NOT write a producibility row for it: a sighting that is not there has not
 * been proven unproducible, and a durable-looking claim made from an absence of
 * evidence is the defect D-23's stickiness would make permanent.
 *
 * Does NOT try/catch, following this module's split: writes report their own
 * outcome and reads do not.
 */
export async function readSightingOrigin(
  db: Database,
  projectId: string,
  artifactSha256: string,
  mapSha256: string,
  sourceIndex: number,
): Promise<SightingOrigin | undefined> {
  const stmt = await db.prepare(SIGHTING_ORIGIN_SQL);
  // SPREAD, never one array: an array handed to a bind position is silently
  // ignored on this driver.
  return stmt.get<SightingOrigin>(
    projectId,
    artifactSha256,
    mapSha256,
    sourceIndex,
  );
}

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
 *
 * `changes: 0` WITH `ok: true` IS A REAL OUTCOME AND THE CALLER MUST BRANCH ON
 * IT. It means this `(map, index)` is already attributed to a DIFFERENT bundle
 * and the attribution guard declined to move it (07-REVIEW.md HI-03) — the
 * sighting was DISCARDED, no row was written, and treating it as a successful
 * write reports evidence that does not exist. `ingest/consumer.ts` counts it as
 * `sightingsDiscardedOtherArtifact` and does NOT advance `rowsInserted`.
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
 * Move one sighting out of `producible`, once and for good (D-23).
 *
 * Returns `changes: 1` the first time and `changes: 0` for every attempt after
 * it, including an attempt to write a DIFFERENT outcome. That is not a failure
 * and the caller must not treat it as one: a tombstone is the record that
 * DefMiner could not produce these bytes at a moment it tried, and a later
 * attempt that also fails has nothing new to say.
 *
 * THE FOUR KEY ARGUMENTS NAME EXACTLY THE SIGHTING THE CALLER MEANS, and
 * `artifactSha256` sits between `projectId` and `mapSha256` so the argument
 * order mirrors {@link readSightingOrigin}'s and the key's. This used to reason
 * from a sighting being unique on `(map, index)`, which is true only while the
 * shipped primary key and `recordSighting`'s attribution guard together make a
 * second bundle's sighting unrepresentable. A tombstone written for one bundle's
 * sighting must leave any other bundle's sighting at the same `(map, index)` in
 * its shipped state — and because D-23 is STICKY, a write that moved the wrong
 * row could never be moved back.
 */
export async function markProducibility(
  db: Database,
  projectId: string,
  artifactSha256: string,
  mapSha256: string,
  sourceIndex: number,
  next: SourceProducibility,
  at: number,
): Promise<StoreWriteResult> {
  try {
    const stmt = await db.prepare(MARK_PRODUCIBILITY_SQL);
    const res = await stmt.run(
      next,
      at,
      projectId,
      artifactSha256,
      mapSha256,
      sourceIndex,
      // SPREAD, never passed as one array: an array handed to a bind position is
      // silently ignored on this driver and produced rows with every column NULL
      // in Phase 0. This is the guard value — the state the row must still be in
      // for the write to land.
      INITIAL_PRODUCIBILITY,
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
