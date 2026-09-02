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
 *
 * =====================================================================
 * THE UNIT IS UNICODE CODE POINTS, AND IT USED TO BE UTF-16 CODE UNITS
 * =====================================================================
 * 4,096 CODE POINTS, enforced by {@link truncateToCodePoints}. Until plan 07-15
 * the cut was `slice(0, SOURCES_LABEL_MAX)` — code UNITS — so a label whose
 * 4,096th code unit was a HIGH SURROGATE stored an UNPAIRED surrogate, an
 * invalid UTF-8 sequence in a `TEXT` column (07-REVIEW.md LO-03). It does not
 * even survive the write: MEASURED against `node:sqlite`, binding a lone
 * U+D83D stores U+FFFD, so the column stopped being the bytes the map declared
 * and the D-06 round-trip claim above stopped being true for that value.
 *
 * THE AT-REST FOOTPRINT THIS IMPLIES, stated because the paragraph above
 * computes a character budget and a reviewer needs the byte one. 4,096 code
 * points is 4 KiB of UTF-8 for an ASCII label, up to 12 KiB for a
 * BMP-non-Latin label, and up to 16 KiB for a label of astral characters. The
 * upper end is the number to reason about; `MAP_MAX_BYTES` caps how many such
 * labels one map can carry.
 *
 * THE NUMBER IS UNCHANGED AT 4,096. Plan 07-15 moved the unit, not the budget:
 * the operator approved a column whose cap is 4,096 and both arguments above —
 * the 1,024-grapheme display caps and `map-fixture.ts`'s `four-kilobyte-label`
 * — are arguments about that number and are untouched.
 */
export const SOURCES_LABEL_MAX = 4096;

/**
 * Cut `value` to at most `maxCodePoints` Unicode code points, never between the
 * halves of a surrogate pair.
 *
 * A PREFIX, AND NOTHING ELSE. This is a truncation and not a transformation:
 * the returned string is `value` itself when it fits, and otherwise a leading
 * substring of it. Nothing is trimmed, normalised, decoded, escaped or
 * replaced, which is what keeps D-06's write-path rule checkable
 * (see {@link recordSighting}).
 *
 * WALKED RATHER THAN SPREAD, and that is a proxy-thread decision rather than a
 * style one. The obvious `[...value].slice(0, max).join("")` allocates an array
 * with one entry per code point of the WHOLE label before discarding all but
 * the first few thousand — and the label is target-controlled, bounded only by
 * `MAP_MAX_BYTES`. This loop stops after at most `maxCodePoints` code points,
 * so the work is bounded by the CAP rather than by the input, and it allocates
 * nothing but the result.
 *
 * A LONE SURROGATE ALREADY IN THE INPUT IS PRESERVED, not repaired. It counts
 * as one code point and is copied through if it falls inside the prefix. LO-03
 * is about the cut CREATING an unpaired surrogate out of a valid pair; a map
 * that declared a broken label declared a broken label, and rewriting it here
 * would be exactly the write-time sanitisation D-06 refuses.
 */
function truncateToCodePoints(value: string, maxCodePoints: number): string {
  let unit = 0;
  for (let seen = 0; seen < maxCodePoints && unit < value.length; seen += 1) {
    const code = value.charCodeAt(unit);
    const high = code >= 0xd800 && code <= 0xdbff;
    const low = high ? value.charCodeAt(unit + 1) : 0;
    unit += high && low >= 0xdc00 && low <= 0xdfff ? 2 : 1;
  }
  return unit >= value.length ? value : value.slice(0, unit);
}

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
`;

// =============================================================================
// THE KEY NAMES THE BUNDLE, SO THE STATEMENT NO LONGER HAS TO ARGUE ABOUT IT
// =============================================================================
// `map_sha256` IS CONTENT-ADDRESSED OVER THE DECODED MAP JSON AND NEVER OVER THE
// BUNDLE, and that fact is the whole reason this comment exists. TWO DIFFERENT
// BUNDLES CAN THEREFORE SHARE A `map_sha256` while having different
// `artifact_sha256`: a CDN mirror with a different banner comment, a decoy stub
// that carries a copy of the map, or the same library genuinely re-bundled. It
// is target-triggerable at will.
//
// Since migration v9 the PRIMARY KEY is `(project_id, artifact_sha256,
// map_sha256, source_index)`, so those two bundles are two rows and the conflict
// target above names all four columns. A sighting is "this bundle's view of this
// map at this index", which is what it always described and now finally is.
//
// -----------------------------------------------------------------------------
// THE HISTORY, KEPT BECAUSE A SUMMARY NAMING IT NEEDS SOMEWHERE TO LAND
// -----------------------------------------------------------------------------
// The original key was `(project_id, map_sha256, source_index)` and the update
// arm read `artifact_sha256 = excluded.artifact_sha256, request_id =
// excluded.request_id`. The second bundle did not create a second set of
// sightings — it OVERWROTE THE FIRST BUNDLE'S, moving the attribution to itself
// (07-REVIEW.md HI-03). Artifact A's drill-down then returned zero rows, and
// D-24 did not catch it: the reload verified against B's digest and SUCCEEDED,
// so the attribution was simply the wrong bundle's, silently.
//
// Plan 07-05 shipped an INTERIM MITIGATION: a trailing
// `WHERE source_sightings.artifact_sha256 = excluded.artifact_sha256` that
// updated a conflicting row only when the incoming sighting named the same
// artifact. It bought the strictly smaller property — the first bundle's
// evidence could no longer be taken away — and it discarded the second bundle's,
// reporting `changes: 0` and counting it in `sightingsDiscardedOtherArtifact`.
// That left the SECOND bundle's drill-down reading a RESOLVED ZERO
// (07-VERIFICATION.md W-3), on the one column whose whole design is that a
// resolved zero means "DefMiner looked and there was nothing".
//
// PLAN 07-12 REMOVED BOTH, in the commit after the key landed. The guard became
// TAUTOLOGICAL — a conflicting row necessarily agrees on `artifact_sha256`,
// because it is a key column — and a predicate a reader must evaluate in order
// to learn it can never be false is worse than no predicate. The counter became
// a number that can never again be non-zero, so it was removed rather than
// pinned at zero; `telemetry.spec.ts` asserts its ABSENCE.
//
// `artifact_sha256` IS STILL ABSENT FROM THE `SET` LIST, and the reason is now
// structural twice over: it is a KEY column, so it cannot differ between the
// stored row and the incoming one, and assigning a column its own value is not
// an update. "A sighting never changes bundles" is a property of the KEY.
//
// `request_id` STAYS IN THE `SET` LIST, AND IT HAS TO. This argument survives
// the widening unchanged and is the one paragraph here that must not be
// softened. The refreshed request always names a request that served THIS
// bundle's bytes — the key guarantees it now, where the guard used to — and that
// is exactly what D-24 reloads and re-verifies against. Pinning it to the first
// sighting instead would let Caido's history evict that request while the bundle
// is still being served, and `no_request` mints a STICKY `gone` tombstone.
// Moving it to a DIFFERENT bundle's request was the bug above, and the key now
// makes that unrepresentable rather than merely refused. Refreshing it within
// one bundle is the only one of the three that is correct.

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

// NAMES THE BUNDLE, AND PLAN 07-11 DELIBERATELY LEFT THAT TO THIS ONE. Plan
// 07-11 widened the two statements that name ONE sighting and stopped here,
// because this is MAP-06's AGGREGATE — the count a refusal compares against —
// and the scope its bound needs is a question about what the bound MEANS rather
// than about disambiguating a row. Plan 07-15 answers it: the bound is about
// what ONE MAP-BEARING ARTIFACT writes, so the count is scoped by artifact.
//
// WHY THAT IS THE ONLY SCOPE THAT WORKS AFTER MIGRATION v9. `map_sha256` is
// content-addressed over the DECODED MAP and never over the bundle, so two
// bundles can share one — a CDN mirror with a different banner comment reaches
// it at will. Since v9 the primary key is `(project_id, artifact_sha256,
// map_sha256, source_index)` and those two bundles are two independent sets of
// sightings. A map-scoped count would hand the caller the SUM of both and
// refuse bundle B for rows bundle A wrote, which is a self-inflicted refusal on
// ordinary traffic.
//
// `project_id` STAYS FIRST in the predicate (STORE-07), and the three-column
// prefix is exactly `idx_source_sightings_artifact`'s leading columns, so this
// is an indexed count rather than a scan.
const COUNT_SOURCES_FOR_MAP_SQL = `
SELECT COUNT(*) AS n
FROM source_sightings
WHERE project_id = ? AND artifact_sha256 = ? AND map_sha256 = ?
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
 * `changes: 0` WITH `ok: true` IS A STORE ANOMALY SINCE MIGRATION v9, AND THE
 * CALLER MUST STILL BRANCH ON IT — but it now means something else, and the
 * change of meaning is the point. Under the four-column key every conflicting
 * upsert has an update arm that runs, so the statement either INSERTS a row or
 * UPDATES one; there is no third outcome it can reach on purpose. `changes: 0`
 * is therefore a statement that neither inserted nor updated, which is a fact
 * about the STORE and not about the traffic.
 *
 * WHAT IT USED TO MEAN, because a reader of a pre-v9 SUMMARY will arrive here
 * looking for it: this `(map, index)` was already attributed to a DIFFERENT
 * bundle and plan 07-05's interim attribution guard declined to move it
 * (07-REVIEW.md HI-03, 07-VERIFICATION.md W-3). That was a DISCARD — a fact
 * about the target's traffic, counted in a dedicated counter. It cannot happen
 * now: the bundle is a key column, so the second bundle gets its own row.
 *
 * WHAT THE CALLER MUST DO WITH IT. Treating it as a successful write would
 * report evidence that does not exist, so `ingest/consumer.ts` still does NOT
 * advance `sightingsRecorded` and does NOT advance `rowsInserted` — both rules
 * survive verbatim and for their original reasons, `rowsInserted` because it
 * feeds STORE-06's retention interval and must not advance the cadence for work
 * that never landed. It increments `storeErrors` and logs the four-part key
 * shape, because an anomaly nobody can see is an anomaly nobody fixes.
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
      // TRUNCATED, NEVER TRANSFORMED. A LENGTH BOUND is the only thing done to
      // this value on the whole write path: no trim, no normalise, no decode,
      // no sanitiser. D-06 puts all of that at display time, and the bound is
      // argued at `SOURCES_LABEL_MAX`.
      //
      // A CODE-POINT CUT IS STILL A TRUNCATION, and this comment has to say so
      // because it is the reason D-06's write-time-sanitisation refusal stays
      // checkable. `truncateToCodePoints` returns the value unchanged when it
      // fits and a leading SUBSTRING of it when it does not — the same claim
      // `slice` made, in a unit that cannot cut a surrogate pair in half.
      // Plan 07-15 moved the unit after 07-REVIEW.md LO-03; nothing about
      // "never transformed" was weakened to do it.
      sourcesVerbatim === null
        ? null
        : truncateToCodePoints(sourcesVerbatim, SOURCES_LABEL_MAX),
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
 * How many sightings one `(artifact, map)` pair already has, so the caller can
 * hold `SOURCE_ROWS_PER_MAP_MAX`.
 *
 * THE BOUND IS ENFORCED BY THE CALLER, AND THE REFUSAL IS NAMED. This function
 * only counts. The caller is `ingest/consumer.ts`'s reconstruction stage: it
 * takes this count once per map-bearing artifact, immediately after the map
 * parses and BEFORE the per-source loop, compares the PROJECTED POST-WRITE ROW
 * total against `SOURCE_ROWS_PER_MAP_MAX`, and refuses with the shipped
 * `too_many_sources` reason through the `map:`-namespaced path — so the artifact
 * records `partial` with a reason an operator can read rather than stopping
 * quietly. A map that silently wrote 2,048 of its 2,049 sources and said nothing
 * is indistinguishable from a map that had 2,048.
 *
 * THE UNIT OF THE COMPARISON IS ROWS, NOT SIGHTINGS, and the caller does the
 * conversion. `SOURCE_ROWS_PER_MAP_MAX` bounds MAP-06's aggregate limit and
 * Pitfall 2's convergence fix with the SAME constant — two constants for one
 * quantity is how a retention sweep comes to bound nothing while running exactly
 * as designed — and plan 07-14 settled that the constant is expressed in rows.
 * One recovered source costs at most two rows, so the caller compares
 * `2 * max(existing, recovered)` against it. The maximum rather than the sum is
 * load-bearing and is argued at the call site.
 *
 * =====================================================================
 * THIS IS THE SECOND ENFORCEMENT POINT, NOT THE ONLY ONE — SAID PLAINLY
 * =====================================================================
 * Under the four-column key a `(project, artifact, map)` can hold at most as
 * many sightings as the map declares distinct source indices, and
 * `parseSourceMap`'s row gate already bounds that at parse time. So this check
 * is not the only bound and it is not a bound the parse gate lacks — it is the
 * SECOND enforcement point, taken in the store's unit against what is actually
 * on disk. It catches divergence between what the parse gate projected and what
 * the write path produced, including rows written by an earlier build under a
 * different gate, and it is what makes MAP-06's aggregate half a thing a
 * verifier can execute rather than a sentence a docblock asserts.
 *
 * IT IS A DEFENCE-IN-DEPTH CHECK AND SAYING SO IS THE POINT. Until plan 07-15
 * this paragraph claimed a caller in "plan 07-05's ingest path" that did not
 * exist, and `knip` could not see the gap because the spec glob in `knip.json`
 * is an ENTRY glob, so a spec-only consumer counted as usage (07-REVIEW.md
 * MD-04). A
 * docblock claiming to be the sole enforcer of a bound something else already
 * enforces is the same defect one layer over, so it is not claimed here.
 *
 * SCOPED BY BUNDLE. After migration v9 a sighting belongs to an artifact, and
 * the bound MAP-06 states is about what ONE MAP-BEARING ARTIFACT writes; the
 * same map delivered in a second bundle legitimately starts from zero.
 */
export async function countSourcesForMap(
  db: Database,
  projectId: string,
  artifactSha256: string,
  mapSha256: string,
): Promise<number> {
  const stmt = await db.prepare(COUNT_SOURCES_FOR_MAP_SQL);
  const row = await stmt.get<{ n: number }>(
    projectId,
    artifactSha256,
    mapSha256,
  );
  return row?.n ?? 0;
}
