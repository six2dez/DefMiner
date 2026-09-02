// packages/backend/src/store/retention.ts — STORE-06, threat T-01-22.
//
// RETENTION IS THE ONLY BOUND ON THIS DATABASE'S GROWTH. Caido never
// garbage-collects `sdk.meta.db()`, does not delete it when the operator deletes
// the project, and it survives a force-reinstall (DB_SURVIVES_REINSTALL). Nothing
// else will ever reclaim a row.
//
// TWO EXEMPTIONS FROM THE AGE BOUND EXIST, AND THEY ARE DIFFERENT SHAPES.
// `audit` — a TABLE — is bounded by rows alone (decision D-06), expressed by the
// ABSENCE of an over-age statement. The `suspended` STATE of `scans` (decision
// D-26) is exempt too, and cannot be an absence because it attaches to a state
// rather than to a table: it is a PREDICATE in the statement text. Both are
// reasoned in full below, beside the statements they are about.
//
// ---------------------------------------------------------------------------
// THIS IS A LIBRARY FUNCTION WITH EXACTLY ONE CALLER, AND THE CALLER IS NOT HERE.
// ---------------------------------------------------------------------------
// Plan 01-03 schedules `sweepRetention` from the consumer loop, one bounded pass
// per RETENTION_SWEEP_EVERY_N processed artifacts (decision P1-D7). An UNCALLED
// sweep bounds nothing, so the proof that a running plugin actually trims is
// 01-03's; what this plan owes is a signature 01-03 can call and behaviour that is
// correct when it does. The signature and the return shape are FIXED HERE and do
// not change afterwards.
//
// The cadence lives in the consumer rather than in a background timer because this
// runtime has ONE thread and `setTimeout` is the only yield primitive — a
// long-lived timer would be a design smell, not a scheduler — and because tying
// the cadence to processed artifacts makes retention pressure scale with the
// ingest that creates it.
//
// ---------------------------------------------------------------------------
// EVERY DELETE IS ONE STATEMENT. NEVER A BATCH.
// ---------------------------------------------------------------------------
// A multi-statement `exec` that fails strands an open write transaction on a
// pooled connection nothing in the plugin API can reach, and the database is
// locked for writes until the plugin restarts. That is measured, not feared. So
// the sweep is a sequence of independent single-statement deletes, each fully
// bound on a natural key, and a failure of any one of them costs that row and
// nothing else.
//
// Foreign keys are NOT relied upon (decision P4-D3): `PRAGMA foreign_keys` is
// per-connection and the pool holds up to five connections. The cascade is
// therefore explicit and runs in dependency order — a digest's observations and
// analyses go BEFORE the artifact itself, so a pass that runs out of budget
// halfway leaves a parent with fewer children and never a child with no parent.

import {
  RETENTION_SWEEP_EVERY_N,
  RETENTION_SWEEP_MAX_PASSES,
  RETENTION_SWEEP_MAX_ROWS,
  ROWS_INSERTED_PER_ARTIFACT_MAX,
  ROWS_INSERTED_PER_ITERATION_MAX,
} from "@defminer/engine/thresholds";
import type { Database } from "sqlite";

import { describeError } from "../telemetry";

// Caught exceptions render through `describeError`, never a bare stringification.
// The reasoning — a driver rejection carries the bound parameters, and one of them
// is the observation URL — is stated once beside the first converted site in
// `artifacts.ts`. Enforced by `error-redaction.spec.ts`.

import type { RetentionBounds } from "./settings";

/**
 * What one bounded pass did.
 *
 * THE SHAPE, AND WHAT IT IS FIXED AGAINST NOW.
 *
 * This comment used to read "FIXED SHAPE — plan 01-03's call site compiles
 * against exactly this", and it is amended in the same commit that grows the
 * type rather than left claiming a fixity the type no longer has. The shape has
 * now grown twice: `auditDeleted` in Phase 5 and `rowCapDeleted` in plan 06-06,
 * each because a caller needed to tell one KIND of deletion from another and the
 * single `deleted` count could not say. What is FIXED is the direction — every
 * field here is ADDED, never removed or renamed, so the one call site
 * (`ingest/consumer.ts`'s `runRetentionPass`) keeps compiling and a reader of an
 * older summary can still read a newer one. A field is added when, and only
 * when, a caller must BRANCH on the distinction; a number nobody branches on
 * belongs in a log line.
 *
 * `examined` counts the candidate ROWS this pass identified as eligible for
 * deletion, BEFORE the per-pass cap was applied. `deleted` is what it actually
 * removed, and is never greater than {@link RETENTION_SWEEP_MAX_ROWS}. `moreWork`
 * is true when eligible rows remained when the pass stopped — the caller defers to
 * the next cadence boundary rather than looping, because the delete rate is above
 * the insert rate by construction and deferral therefore converges anyway.
 *
 * `errors` and `lastError` exist because retention failing was the one thing
 * here that reported nothing at all. Both swallows on this path — `deleteOne`'s
 * empty `catch {}` and the outer handler's `void e` — discarded the error
 * object, so a sweep failing on every row for a structural reason (a locked
 * database, a schema the migration ladder left partial and index.ts explicitly
 * allows the plugin to run on) produced: `retentionSweeps` climbing,
 * `retentionDeleted` stuck at 0, no lastError, no storeErrors, and a log line
 * saying "more remains for the next cadence boundary" for ever. Retention is
 * stated three times in this file to be the ONLY bound on this database's
 * growth, and on a runtime whose measured HANDLER_ERROR_SURFACED is "neither",
 * discarding the error discards the only record that will ever exist.
 *
 * @internal
 */
export type RetentionSweepSummary = {
  examined: number;
  deleted: number;
  /** Audit rows removed by the raised row bound, counted SEPARATELY and also
   *  included in `deleted`. Its own category because the audit table is the one
   *  bounded by rows alone (decision D-06): an operator-facing health surface has
   *  to be able to say "and N audit events aged out of the row cap" rather than
   *  folding an irreplaceable record into one opaque number. */
  auditDeleted: number;
  /**
   * Artifacts the ROW CAP evicted that the age bound would not have — counted
   * SEPARATELY and also included in `deleted`.
   *
   * ITS OWN CATEGORY BECAUSE A CALLER BRANCHES ON IT, which is the bar for
   * adding a field here. `ingest/consumer.ts` suspends a running retroactive
   * scan when this is positive (D-08): a row-cap eviction during a backfill
   * means the backfill is CONSUMING ITSELF — every page it walks costs a page it
   * already walked — and it will never finish however long it runs. An
   * age-bound eviction means nothing of the sort, and folding the two into
   * `deleted` would make DefMiner cancel an operator's multi-hour scan over
   * routine housekeeping.
   *
   * THE DE-DUPLICATION IS WHAT MAKES THE NUMBER MEAN THAT. `pushVictims` skips a
   * digest it has already seen and the over-age candidates are pushed FIRST, so
   * a digest eligible under BOTH bounds is attributed to age. What is left is
   * exactly "artifacts the row cap evicted that age would not have".
   *
   * DIGESTS REMOVED, NOT CANDIDATES ENUMERATED. A digest whose cascade ran out
   * of per-pass budget still has its artifact row, so counting the candidate
   * list would report an eviction that did not happen — and suspend a scan for
   * it.
   */
  rowCapDeleted: number;
  moreWork: boolean;
  /** Deletes that failed, plus one for a pass that threw outright. */
  errors: number;
  /** The most recent failure's text, bounded like every other store error. */
  lastError: string | null;
};

/**
 * The per-PASS delete cap. NOT, ON ITS OWN, THE CONVERGENCE BOUND.
 *
 * This module bounds ONE pass and says nothing about how often a pass runs. The
 * convergence inequality is a property of three constants together —
 * `RETENTION_SWEEP_MAX_ROWS * RETENTION_SWEEP_MAX_PASSES >=
 * RETENTION_SWEEP_EVERY_N + ROWS_INSERTED_PER_ITERATION_MAX` — and it is stated
 * at `RETENTION_SWEEP_MAX_PASSES` and asserted by `thresholds.spec.ts`.
 *
 * SAID HERE BECAUSE THIS COMMENT USED TO CLAIM OTHERWISE (07-REVIEW.md HI-04).
 * It read "a processed artifact inserts at most ROWS_INSERTED_PER_ARTIFACT_MAX
 * rows, and a sweep runs once per RETENTION_SWEEP_EVERY_N processed artifacts",
 * which stopped being true when D-09 let one artifact insert 1,565 rows and the
 * interval changed to count rows. A module that restates a bound it does not
 * enforce is the thing a verifier will cite, so it restates the SCOPE of what it
 * enforces instead: one pass, bounded, and the scheduler decides the rest.
 *
 * The constants are still READ rather than hard-coded, so this file and
 * `thresholds.ts` cannot drift.
 *
 * AND THE INEQUALITY NOW BOUNDS SOMETHING REAL (07-VERIFICATION.md W-5).
 * `ROWS_INSERTED_PER_ITERATION_MAX` — the INSERT side — is
 * `ROWS_INSERTED_PER_ARTIFACT_MAX + SOURCE_ROWS_PER_MAP_MAX`, and that second
 * term is rows written into `sources` and `source_sightings`. Until plan 07-13
 * this module named NEITHER table and migration `v: 8` declares no foreign key
 * and no `ON DELETE CASCADE`, so the DELETE side could not reach either one:
 * the inequality was satisfied numerically while the property it claims — that
 * the database does not grow monotonically past the retention ceiling — did not
 * hold, because once the swept tables reached their floor those two kept
 * growing with nothing able to delete from them. HI-04's own failure narrative
 * is "the form was true and it bounded nothing", and this was a narrower copy of
 * it inside the fix. Both tables are now swept — `source_sightings` by BOTH
 * ordinary bounds, `sources` by the anti-join that inherits them — so every row
 * the insert side counts is a row the delete side can reach.
 *
 * NO CONSTANT MOVED for this. The delete side already dominated: 512 x 16 =
 * 8,192 against 128 + 2,051 = 2,179. What changed is that the tables the 2,051
 * describes are now reachable.
 */
const MAX_ROWS_PER_PASS = RETENTION_SWEEP_MAX_ROWS;

// Referenced so the derivation above is not merely a comment: a build where
// ROWS_INSERTED_PER_ARTIFACT_MAX stopped existing would fail here rather than
// silently losing the reasoning.
const INSERTED_PER_ARTIFACT = ROWS_INSERTED_PER_ARTIFACT_MAX;

/** How many candidate rows one pass may ENUMERATE. Bounded for the same reason
 *  the delete count is: an unbounded SELECT over a table with no size ceiling is
 *  itself a cost the target controls. Two passes' worth, so the pass can always
 *  see whether work remains beyond its own cap. */
const CANDIDATE_SCAN_LIMIT = MAX_ROWS_PER_PASS * 2;

// --- candidate selection ----------------------------------------------------
//
// Every one of these orders OLDEST FIRST with an explicit tie-break, so a capped
// pass and the pass that resumes it agree on which rows come next. Without the
// tie-break, two rows sharing a timestamp could swap between passes and the sweep
// would be resumable only by luck.

const ARTIFACTS_OVER_AGE_SQL = `
SELECT sha256 FROM artifacts
WHERE project_id = ? AND last_seen_at < ?
ORDER BY last_seen_at ASC, sha256 ASC
LIMIT ?
`;

const ARTIFACTS_OLDEST_SQL = `
SELECT sha256 FROM artifacts
WHERE project_id = ?
ORDER BY last_seen_at ASC, sha256 ASC
LIMIT ?
`;

const COUNT_ARTIFACTS_SQL = `SELECT COUNT(*) AS n FROM artifacts WHERE project_id = ?`;
const COUNT_OBSERVATIONS_SQL = `SELECT COUNT(*) AS n FROM observations WHERE project_id = ?`;
const COUNT_ANALYSES_SQL = `SELECT COUNT(*) AS n FROM analyses WHERE project_id = ?`;

// THE CASCADE ENUMERATES KEYS, IT DOES NOT DELETE BY DIGEST.
//
// `DELETE FROM observations WHERE project_id = ? AND sha256 = ?` is one
// statement, which is the rule this file cares most about — but its ROW COUNT is
// chosen by the target. One bundle re-served 3000 times costs 3001 rows in a pass
// whose cap is 512, and a cap the traffic can overrun is not a cap. Measured, not
// argued: one artifact with 3000 sightings produced `deleted: 3001, examined: 1`.
//
// So the children are listed as KEYS, oldest first, within the remaining budget,
// and each one is removed by the SAME fully-bound single-row delete the orphan
// and per-table sweeps use. The pass therefore deletes at most
// RETENTION_SWEEP_MAX_ROWS rows whatever the shape of the data.
const OBSERVATION_KEYS_FOR_DIGEST_SQL = `
SELECT request_id FROM observations
WHERE project_id = ? AND sha256 = ?
ORDER BY observed_at ASC, request_id ASC
LIMIT ?
`;

const ANALYSIS_KEYS_FOR_DIGEST_SQL = `
SELECT detector_set_hash FROM analyses
WHERE project_id = ? AND sha256 = ?
ORDER BY started_at ASC, detector_set_hash ASC
LIMIT ?
`;

const DELETE_ARTIFACT_SQL = `
DELETE FROM artifacts WHERE project_id = ? AND sha256 = ?
`;

// The row-count and age bounds are PER TABLE PER PROJECT, so `observations` and
// `analyses` are bounded in their own right and not only through the artifact
// cascade. Without this, a project inside the artifact bound could still hold an
// unbounded number of sightings of those artifacts — which is precisely the shape
// real traffic produces, since every re-serve of the same bundle is a new
// observation row and the artifact row is upserted rather than inserted.
const OBSERVATIONS_OVER_AGE_SQL = `
SELECT sha256, request_id FROM observations
WHERE project_id = ? AND observed_at < ?
ORDER BY observed_at ASC, request_id ASC
LIMIT ?
`;

const OBSERVATIONS_OLDEST_SQL = `
SELECT sha256, request_id FROM observations
WHERE project_id = ?
ORDER BY observed_at ASC, request_id ASC
LIMIT ?
`;

const ANALYSES_OVER_AGE_SQL = `
SELECT sha256, detector_set_hash FROM analyses
WHERE project_id = ? AND started_at < ?
ORDER BY started_at ASC, sha256 ASC
LIMIT ?
`;

const ANALYSES_OLDEST_SQL = `
SELECT sha256, detector_set_hash FROM analyses
WHERE project_id = ?
ORDER BY started_at ASC, sha256 ASC
LIMIT ?
`;

// ===========================================================================
// THE AUDIT TABLE IS BOUNDED BY ROWS AND DELIBERATELY NOT BY AGE (decision D-06).
// ===========================================================================
// Every other table above has BOTH an over-age statement and an oldest-first
// statement. `audit` has only the second, and the missing one is missing ON
// PURPOSE. If you came here to add `AUDIT_OVER_AGE_SQL` "for consistency", this
// paragraph is the answer: don't, and `retention.spec.ts` will stop you.
//
// WHY. An audit trail exists to answer two questions — WHEN did I project this
// permanent Finding, and WHAT did I export — and both are asked long after
// ninety days, about actions that are themselves irreversible. A Finding
// projected into Caido cannot be withdrawn; bytes that left in a raw export are
// in cleartext outside this tool for ever; a revealed value cannot be unseen. An
// audit log that quietly aged those records out would be at its least useful
// exactly when it was most needed, which is a weak audit log and arguably not one
// at all.
//
// AND GROWTH IS STILL BOUNDED, which is what makes the exemption survivable
// rather than merely principled. The row cap still applies — a raised one,
// `bounds.auditMaxRows`, derived in `settings.ts` with its arithmetic written out
// — so this table has a ceiling like every other, on a database Caido never
// garbage-collects, does not delete with the project, and which survives a
// force-reinstall.
//
// THIS IS A SINGLE, DELIBERATE, DOCUMENTED EXCEPTION to the per-table-per-project
// policy decision P4-D7 established. It is not the first of a family. Any second
// exemption is a new decision and needs its own paragraph here.

const AUDIT_OLDEST_SQL = `
SELECT event_id FROM audit
WHERE project_id = ?
ORDER BY at ASC, event_id ASC
LIMIT ?
`;

const COUNT_AUDIT_SQL = `SELECT COUNT(*) AS n FROM audit WHERE project_id = ?`;

const DELETE_AUDIT_SQL = `
DELETE FROM audit WHERE project_id = ? AND event_id = ?
`;

// ===========================================================================
// THE SECOND EXEMPTION: THE `suspended` STATE OF `scans` IS EXEMPT FROM THE AGE
// BOUND (decision D-26). THE TABLE IS NOT.
// ===========================================================================
// The paragraph above ends by saying that a second exemption is a new decision
// and needs its own paragraph here. This is that second exemption, and this is
// that paragraph.
//
// WHY. A suspended scan's ROW IS ITS CURSOR. `scans` holds no content — no body,
// no digest, no URL — and exists for exactly one purpose: to remember where a
// multi-hour backfill had got to across restarts and project switches. Nothing
// else in the system can re-derive that position. So an age bound applied to a
// suspended row is not "trimming old data", it is DELETING AN OPERATOR'S
// RESUMABLE WORK on a ninety-day timer they never asked for and would never see
// fire. `scan/scans.ts` exempts the same state from the scan-history read bound
// for the same reason; this is that argument reaching the sweep.
//
// WHY IT IS A PREDICATE AND NOT AN ABSENCE, which is the whole difference from
// D-06 above. D-06 exempts a TABLE, and a table's exemption can be expressed by
// the ABSENCE of an over-age statement — there is simply no statement to write.
// D-26 exempts a STATE, and an absence cannot express a state: leaving out the
// over-age statement would exempt every scan ever run, including the completed
// and discarded history rows that have no cursor and nothing to resume. The
// exception therefore lives IN THE WHERE CLAUSE, where a reader who came looking
// for it will find it, rather than in the shape of what is missing.
//
// AND GROWTH IS STILL BOUNDED, which is what makes this exemption survivable
// rather than merely principled — the same test D-06 had to pass. The ROW CAP
// below carves out NO state at all: a suspended scan is evicted by the cap like
// any other row, oldest first. `idx_scans_one_running` already bounds suspended
// rows to one per project at a time, so the exempted population is small by
// construction and the cap is what bounds the rest.
//
// THE COST, STATED RATHER THAN DISCOVERED: a suspended scan whose operator never
// returns sits in the table until the row cap reaches it. That is the intended
// behaviour — "resumes only on explicit operator action" (D-11) has no expiry
// date — and it is bounded, which is the property that matters.
//
// This is now TWO exemptions. It is still not a family, and a THIRD is a new
// decision needing its own paragraph, exactly as this one did.

const SCANS_OVER_AGE_SQL = `
SELECT scan_id FROM scans
WHERE project_id = ? AND updated_at < ? AND state <> 'suspended'
ORDER BY updated_at ASC, scan_id ASC
LIMIT ?
`;

// NO STATE PREDICATE, DELIBERATELY. See the paragraph above: the exemption is
// from the AGE bound only, and a carve-out here would leave the table with no
// ceiling at all on a database Caido never garbage-collects.
const SCANS_OLDEST_SQL = `
SELECT scan_id FROM scans
WHERE project_id = ?
ORDER BY updated_at ASC, scan_id ASC
LIMIT ?
`;

const COUNT_SCANS_SQL = `SELECT COUNT(*) AS n FROM scans WHERE project_id = ?`;

const DELETE_SCAN_SQL = `
DELETE FROM scans WHERE project_id = ? AND scan_id = ?
`;

// Orphans: a child whose parent is already gone. The cascade below cannot create
// one — children go first — but a crash mid-pass in some future version, or a row
// written before this module existed, can. Cleaning them is cheap and makes "no
// orphans" a property of the database rather than of this code's control flow.
const ORPHAN_OBSERVATIONS_SQL = `
SELECT sha256, request_id FROM observations
WHERE project_id = ?
  AND NOT EXISTS (
    SELECT 1 FROM artifacts
    WHERE artifacts.project_id = observations.project_id
      AND artifacts.sha256 = observations.sha256
  )
ORDER BY observed_at ASC, request_id ASC
LIMIT ?
`;

const DELETE_OBSERVATION_SQL = `
DELETE FROM observations WHERE project_id = ? AND sha256 = ? AND request_id = ?
`;

const ORPHAN_ANALYSES_SQL = `
SELECT sha256, detector_set_hash FROM analyses
WHERE project_id = ?
  AND NOT EXISTS (
    SELECT 1 FROM artifacts
    WHERE artifacts.project_id = analyses.project_id
      AND artifacts.sha256 = analyses.sha256
  )
ORDER BY started_at ASC, sha256 ASC
LIMIT ?
`;

const DELETE_ANALYSIS_SQL = `
DELETE FROM analyses WHERE project_id = ? AND sha256 = ? AND detector_set_hash = ?
`;

// ===========================================================================
// THE TWO TABLES PHASE 7 ADDED, SWEPT IN THE ORDER THE OPERATOR CHOSE:
// CASCADE — A SOURCE DIES WITH ITS LAST SIGHTING.
// ===========================================================================
// Migration `v: 8` created `sources` and `source_sightings` and this module
// named neither of them, while `v: 8` declares NO FOREIGN KEY and NO
// `ON DELETE CASCADE` — so deleting an artifact ORPHANED its sightings and both
// tables grew with nothing able to delete from them (deferred item D1,
// 07-VERIFICATION.md W-5). The eviction order was a design question and it was
// answered by the operator at Phase 7's UAT, not here.
//
// AND IT IS AN ANTI-JOIN AND NOT A FOREIGN KEY, deliberately. An FK is a second
// schema change and a sixth one-way `EXPECTED_TABLES` approval; the anti-join
// needs neither, and `PRAGMA foreign_keys` is per-connection on a pool of five
// anyway (decision P4-D3) — the same reason the artifact cascade above is
// explicit rather than declared.
//
// WHY `sources` TAKES NO BOUND OF ITS OWN, and why growth is still bounded.
// Every other table here carries an age bound, a row bound or both. `sources`
// carries neither, because its lifetime is DERIVED: a row survives exactly as
// long as some sighting names it. Since a surviving `sources` row requires at
// least one surviving `source_sightings` row, and `source_sightings` carries
// BOTH ordinary bounds, `count(sources) <= count(source_sightings) <=
// bounds.maxRows`. The ceiling is inherited rather than declared, which is what
// makes "a source dies with its last sighting" and "neither table grows past the
// retention ceiling" the same statement.
//
// THIS IS NOT A THIRD EXEMPTION. The two exemptions above are refusals to apply
// a bound that would otherwise be right (D-06's age bound on `audit`, D-26's age
// bound on suspended `scans`). This is a table whose ceiling comes from an edge
// rather than from a cap — bounded, not exempt — so the paragraph the exemption
// block asks for is not owed here.

// `source_sightings` TAKES BOTH BOUNDS, AND BOTH STATEMENTS THEREFORE EXIST.
//
// Said explicitly because the block above `AUDIT_OLDEST_SQL` says the opposite
// about `audit` in the same register: there the ABSENCE of an over-age statement
// IS the decision. Here there is no decision to express by an absence, and a
// reader arriving from that paragraph should not have to infer which kind of
// table this is. The cascade is not a substitute for either bound — a bundle
// that is never evicted accumulates sightings for ever, and that is the shape
// real traffic produces: the artifact row is UPSERTED on every re-serve while
// each map-bearing re-serve writes a fresh row per (bundle, map, index).
const SIGHTINGS_OVER_AGE_SQL = `
SELECT artifact_sha256, map_sha256, source_index FROM source_sightings
WHERE project_id = ? AND recovered_at < ?
ORDER BY recovered_at ASC, artifact_sha256 ASC, map_sha256 ASC, source_index ASC
LIMIT ?
`;

const SIGHTINGS_OLDEST_SQL = `
SELECT artifact_sha256, map_sha256, source_index FROM source_sightings
WHERE project_id = ?
ORDER BY recovered_at ASC, artifact_sha256 ASC, map_sha256 ASC, source_index ASC
LIMIT ?
`;

// Sightings whose BUNDLE is already gone. This is the cascade: the artifact
// sweep above removes the `artifacts` row, and the sighting rows that named it
// are collected here in the same pass, in `ORPHAN_OBSERVATIONS_SQL`'s exact
// shape — `NOT EXISTS` with `project_id` matched on BOTH sides, so a sweep in
// one project cannot reach another project's rows in the one shared SQLite file
// (T-07-56).
//
// The four key columns are selected because the key IS four columns since
// migration `v: 9`, and every delete below binds all four.
const ORPHAN_SIGHTINGS_SQL = `
SELECT artifact_sha256, map_sha256, source_index FROM source_sightings
WHERE project_id = ?
  AND NOT EXISTS (
    SELECT 1 FROM artifacts
    WHERE artifacts.project_id = source_sightings.project_id
      AND artifacts.sha256 = source_sightings.artifact_sha256
  )
ORDER BY recovered_at ASC, artifact_sha256 ASC, map_sha256 ASC, source_index ASC
LIMIT ?
`;

const COUNT_SIGHTINGS_SQL = `SELECT COUNT(*) AS n FROM source_sightings WHERE project_id = ?`;

const DELETE_SIGHTING_SQL = `
DELETE FROM source_sightings
WHERE project_id = ? AND artifact_sha256 = ? AND map_sha256 = ? AND source_index = ?
`;

// THE ANTI-JOIN, AND THIS IS WHERE CONTENT-ADDRESSED DEDUPE SURVIVES THE SWEEP.
//
// `sources` is keyed on the CONTENT digest (D-05), so two bundles shipping the
// same module produce ONE row with TWO sightings. Selecting by "the evicted
// bundle's sightings" would take that row out from under the bundle still
// sighting it; selecting by "no sighting names it AT ALL" cannot. A `sources`
// row therefore outlives either bundle alone and dies with its LAST sighting,
// which is the property the operator chose this shape for and the one
// `retention.spec.ts` fails on if the `NOT EXISTS` is replaced by a blind
// delete.
//
// `first_seen_at` leads the ordering because `idx_sources_seen` does, and
// `sources.ts` keeps that column OUT of its upsert's update arm precisely so
// retention's ordering describes the first sighting rather than the latest.
const UNSIGHTED_SOURCES_SQL = `
SELECT source_sha256 FROM sources
WHERE project_id = ?
  AND NOT EXISTS (
    SELECT 1 FROM source_sightings
    WHERE source_sightings.project_id = sources.project_id
      AND source_sightings.source_sha256 = sources.source_sha256
  )
ORDER BY first_seen_at ASC, source_sha256 ASC
LIMIT ?
`;

const COUNT_SOURCES_SQL = `SELECT COUNT(*) AS n FROM sources WHERE project_id = ?`;

const DELETE_SOURCE_SQL = `
DELETE FROM sources WHERE project_id = ? AND source_sha256 = ?
`;

async function countRows(
  db: Database,
  sql: string,
  projectId: string,
): Promise<number> {
  const stmt = await db.prepare(sql);
  const row = await stmt.get<{ n: number }>(projectId);
  return Number(row?.n ?? 0);
}

/**
 * One bounded retention pass for one project.
 *
 * BOTH bounds apply and whichever binds first wins: an artifact is eligible when
 * it is older than `bounds.maxAgeMs` OR when the project holds more than
 * `bounds.maxRows` artifacts and this one is among the oldest of the excess. A row
 * EXACTLY at the age cutoff is KEPT — the predicate is strict — because "older
 * than 90 days" should not silently mean "90 days or exactly now minus 90 days",
 * and a boundary that moves with the clock is the kind of thing that deletes a row
 * a test just wrote.
 *
 * Never throws. A failing delete is counted as not-deleted and the pass continues:
 * one unwritable row must not stop retention for the whole project, and Caido
 * surfaces neither the throw nor the rejection anyway.
 */
export async function sweepRetention(
  db: Database,
  projectId: string,
  bounds: RetentionBounds,
  nowMs: number,
): Promise<RetentionSweepSummary> {
  let examined = 0;
  let deleted = 0;
  let auditDeleted = 0;
  let rowCapDeleted = 0;
  let moreWork = false;
  /** Mutated from inside `remove` below, so it is an object rather than two
   *  `let`s: a captured `let` assigned only inside a closure is exactly the
   *  shape narrowing gets wrong. */
  const failures = { count: 0, last: null as string | null };

  // A sweep for the reserved global scope would be a bug: '' is a settings-only
  // scope and no artifact, observation or analysis can carry it.
  if (projectId === "")
    return {
      examined,
      deleted,
      auditDeleted,
      rowCapDeleted,
      moreWork,
      errors: failures.count,
      lastError: failures.last,
    };

  const budget = (): number => MAX_ROWS_PER_PASS - deleted;

  /** One delete, with its failure RECORDED rather than returned as a zero that
   *  is indistinguishable from "there was nothing to delete". */
  const remove: DeleteFn = async (sql, params) => {
    const outcome = await deleteOne(db, sql, params);
    if (outcome.error !== null) {
      failures.count += 1;
      failures.last = outcome.error;
    }
    return outcome.deleted;
  };

  const cutoff = nowMs - bounds.maxAgeMs;

  try {
    // --- 1. artifacts eligible under either bound --------------------------
    const victims: string[] = [];
    const seen = new Set<string>();
    /** The digests that entered through the ROW-CAP branch and no other.
     *
     *  D-08's whole signal. Because `pushVictims` skips a digest already in
     *  `seen` and the over-age candidates are pushed FIRST, membership here means
     *  "the row cap would have evicted this and the age bound would not" — which
     *  is the backfill-consuming-itself condition and not ordinary trimming. */
    const fromRowCap = new Set<string>();
    const pushVictims = (
      rows: { sha256: string }[],
      viaRowCap = false,
    ): void => {
      for (const r of rows) {
        const sha = String(r.sha256);
        if (seen.has(sha)) continue;
        seen.add(sha);
        victims.push(sha);
        if (viaRowCap) fromRowCap.add(sha);
      }
    };

    const overAgeStmt = await db.prepare(ARTIFACTS_OVER_AGE_SQL);
    pushVictims(
      await overAgeStmt.all<{ sha256: string }>(
        projectId,
        cutoff,
        CANDIDATE_SCAN_LIMIT,
      ),
    );

    const artifactCount = await countRows(db, COUNT_ARTIFACTS_SQL, projectId);
    // `> 0` AND NOT `>= 0`: at the cap exactly, nothing is over it. FIND-04's
    // boundary, and an off-by-one here would suspend a running scan for a cap it
    // never exceeded.
    const excess = artifactCount - bounds.maxRows;
    if (excess > 0) {
      const oldestStmt = await db.prepare(ARTIFACTS_OLDEST_SQL);
      pushVictims(
        await oldestStmt.all<{ sha256: string }>(
          projectId,
          Math.min(excess, CANDIDATE_SCAN_LIMIT),
        ),
        true,
      );
    }

    // Each victim costs its observations, its analyses and itself. `examined`
    // counts eligible ARTIFACT rows plus, below, eligible orphan rows: the units
    // are rows, and every row counted here is one the pass would delete if the
    // cap allowed.
    examined += victims.length;

    for (const sha256 of victims) {
      if (budget() <= 0) {
        moreWork = true;
        break;
      }
      const cascade = await deleteDigest(db, projectId, sha256, budget, remove);
      examined += cascade.examined;
      deleted += cascade.deleted;
      // COUNTED ON REMOVAL, never on selection. See `RetentionSweepSummary`'s
      // `rowCapDeleted`: a digest whose cascade ran out of budget still has its
      // artifact row, and reporting it as evicted would stop a scan over work
      // that did not happen.
      if (cascade.artifactRemoved && fromRowCap.has(sha256)) rowCapDeleted += 1;
      // The digest still has children, or the budget ran out inside it. Either
      // way the artifact row is still there and the next pass resumes on it.
      if (cascade.capped) moreWork = true;
    }

    // --- 2. orphans, if any survived an earlier interrupted pass -----------
    if (budget() > 0) {
      const orphanObsStmt = await db.prepare(ORPHAN_OBSERVATIONS_SQL);
      const orphanObs = await orphanObsStmt.all<{
        sha256: string;
        request_id: string;
      }>(projectId, Math.min(budget(), CANDIDATE_SCAN_LIMIT));
      examined += orphanObs.length;
      for (const o of orphanObs) {
        if (budget() <= 0) {
          moreWork = true;
          break;
        }
        deleted += await remove(DELETE_OBSERVATION_SQL, [
          projectId,
          String(o.sha256),
          String(o.request_id),
        ]);
      }
    }

    if (budget() > 0) {
      const orphanAnaStmt = await db.prepare(ORPHAN_ANALYSES_SQL);
      const orphanAna = await orphanAnaStmt.all<{
        sha256: string;
        detector_set_hash: string;
      }>(projectId, Math.min(budget(), CANDIDATE_SCAN_LIMIT));
      examined += orphanAna.length;
      for (const a of orphanAna) {
        if (budget() <= 0) {
          moreWork = true;
          break;
        }
        deleted += await remove(DELETE_ANALYSIS_SQL, [
          projectId,
          String(a.sha256),
          String(a.detector_set_hash),
        ]);
      }
    }

    // --- 3. the per-table bounds on the child tables -----------------------
    if (budget() > 0) {
      const obs = await trimChildTable(
        db,
        projectId,
        {
          overAgeSql: OBSERVATIONS_OVER_AGE_SQL,
          oldestSql: OBSERVATIONS_OLDEST_SQL,
          countSql: COUNT_OBSERVATIONS_SQL,
          deleteSql: DELETE_OBSERVATION_SQL,
          secondKey: "request_id",
        },
        bounds,
        cutoff,
        budget,
        remove,
      );
      examined += obs.examined;
      deleted += obs.deleted;
      if (obs.capped) moreWork = true;
    }

    if (budget() > 0) {
      const ana = await trimChildTable(
        db,
        projectId,
        {
          overAgeSql: ANALYSES_OVER_AGE_SQL,
          oldestSql: ANALYSES_OLDEST_SQL,
          countSql: COUNT_ANALYSES_SQL,
          deleteSql: DELETE_ANALYSIS_SQL,
          secondKey: "detector_set_hash",
        },
        bounds,
        cutoff,
        budget,
        remove,
      );
      examined += ana.examined;
      deleted += ana.deleted;
      if (ana.capped) moreWork = true;
    }

    // --- 3b. the audit table's ROW bound, and only its row bound -----------
    // No `cutoff` is passed and no over-age candidate statement exists to pass it
    // to. That is the whole of D-06, expressed as code rather than as a comment:
    // the count-and-trim half is here and the age half is absent.
    if (budget() > 0) {
      const auditTotal = await countRows(db, COUNT_AUDIT_SQL, projectId);
      const auditExcess = auditTotal - bounds.auditMaxRows;
      if (auditExcess > 0) {
        const oldestAudit = await db.prepare(AUDIT_OLDEST_SQL);
        const victims = await oldestAudit.all<{ event_id: string }>(
          projectId,
          Math.min(auditExcess, CANDIDATE_SCAN_LIMIT),
        );
        examined += victims.length;
        for (const v of victims) {
          if (budget() <= 0) {
            moreWork = true;
            break;
          }
          // The SAME fully-bound single-row delete every other table uses, and
          // the same recorded-failure discipline: a failing delete is counted,
          // the pass continues, and the sweep never throws.
          const removed = await remove(DELETE_AUDIT_SQL, [
            projectId,
            String(v.event_id),
          ]);
          deleted += removed;
          auditDeleted += removed;
        }
      }
    }

    // --- 3c. the `scans` table's TWO bounds, one of which carves out a state -
    // ONE SWEEP, ONE CADENCE, ONE CONVERGENCE INEQUALITY. `scans` is trimmed
    // here, inside the same bounded pass, counted into the same `deleted` and
    // the same per-pass budget as every other table — not by a second sweep and
    // not on a second timer. A backfill's position table is small; giving it its
    // own schedule would buy nothing and would put a second long-lived timer on
    // a single-threaded runtime where a timer is a design smell rather than a
    // scheduler.
    //
    // NOT counted into `rowCapDeleted`: that number is about ARTIFACTS the cap
    // evicted, because that is what tells a scan it is consuming its own
    // results. Evicting an old scan HISTORY row says nothing of the kind.
    if (budget() > 0) {
      const scanVictims: string[] = [];
      const scanSeen = new Set<string>();
      const pushScans = (rows: { scan_id: string }[]): void => {
        for (const r of rows) {
          const id = String(r.scan_id);
          if (scanSeen.has(id)) continue;
          scanSeen.add(id);
          scanVictims.push(id);
        }
      };

      // The AGE bound, carrying D-26's state exemption in its predicate.
      const scansOverAge = await db.prepare(SCANS_OVER_AGE_SQL);
      pushScans(
        await scansOverAge.all<{ scan_id: string }>(
          projectId,
          cutoff,
          CANDIDATE_SCAN_LIMIT,
        ),
      );

      // The ROW bound, carrying no exemption at all.
      const scanTotal = await countRows(db, COUNT_SCANS_SQL, projectId);
      const scanExcess = scanTotal - bounds.maxRows;
      if (scanExcess > 0) {
        const scansOldest = await db.prepare(SCANS_OLDEST_SQL);
        pushScans(
          await scansOldest.all<{ scan_id: string }>(
            projectId,
            Math.min(scanExcess, CANDIDATE_SCAN_LIMIT),
          ),
        );
      }

      examined += scanVictims.length;
      for (const id of scanVictims) {
        if (budget() <= 0) {
          moreWork = true;
          break;
        }
        // The SAME fully-bound single-row delete every other table uses. A scan
        // row has no children — it holds a position and counters and nothing
        // else — so there is no cascade to order.
        deleted += await remove(DELETE_SCAN_SQL, [projectId, id]);
      }
    }

    // --- 3d. the cascade the operator chose: sightings, THEN sources -------
    //
    // SIGHTINGS BEFORE SOURCES, IN EVERY PASS, WITHOUT EXCEPTION. The anti-join
    // is a question about a sighting set, so it must be asked of the set this
    // pass FINISHED with. `sightingsCapped` is what enforces that: if any part
    // of the sightings work stopped on budget, the anti-join does not run at all
    // in this pass and the next one asks the question again (T-07-71).
    //
    // THE DIRECTION OF THE RISK, STATED HONESTLY RATHER THAN OVERSOLD. Because
    // the anti-join selects only sources with NO sighting left, having deleted
    // FEWER sightings can only leave MORE sources protected — so running it
    // against a half-swept set would delete too few rather than too many, and
    // the cost of the guard is one deferred pass rather than a lost row. The
    // guard is kept anyway: that argument holds only while the enumeration and
    // the delete agree about what "unsighted" means, and an invariant that
    // depends on nobody widening either statement is not an invariant. What it
    // buys is that a `sources` row is never evicted on the strength of a
    // sighting set the pass was still in the middle of.
    let sightingsCapped = false;

    // The cascade half: sightings whose bundle the artifact sweep above already
    // removed. `examined` counts them as rows, like every other candidate here.
    if (budget() > 0) {
      const orphanSightStmt = await db.prepare(ORPHAN_SIGHTINGS_SQL);
      const orphanSightings = await orphanSightStmt.all<{
        artifact_sha256: string;
        map_sha256: string;
        source_index: number;
      }>(projectId, Math.min(budget(), CANDIDATE_SCAN_LIMIT));
      examined += orphanSightings.length;
      for (const s of orphanSightings) {
        if (budget() <= 0) {
          moreWork = true;
          sightingsCapped = true;
          break;
        }
        deleted += await remove(DELETE_SIGHTING_SQL, [
          projectId,
          String(s.artifact_sha256),
          String(s.map_sha256),
          Number(s.source_index),
        ]);
      }
    } else {
      sightingsCapped = true;
    }

    // The per-table half: BOTH ordinary bounds on `source_sightings` itself.
    //
    // `trimChildTable` WAS NOT GENERALISED, AND THE DECISION IS RECORDED RATHER
    // THAN IMPLIED. That helper's `ChildTableSpec` describes a table keyed on
    // `(project_id, sha256, secondKey)` — a three-element delete tuple over a
    // closed union of two column names — and `source_sightings` is keyed on FOUR
    // columns since migration `v: 9`, the last of them an INTEGER. Widening it
    // would mean a variadic key, a variadic delete tuple and a `secondKey` union
    // that no longer describes anything, for the benefit of ONE more caller,
    // while `observations` and `analyses` depend on the current shape. The cost
    // of the loop below is that the de-duplication and the age-arm-first
    // ordering are written twice; the cost of the widening would be borne by two
    // tables that asked for nothing. `audit` and `scans` are here for the same
    // reason and in the same shape.
    if (budget() > 0 && !sightingsCapped) {
      const sightingVictims: {
        artifact: string;
        map: string;
        index: number;
      }[] = [];
      const sightingSeen = new Set<string>();
      const pushSightings = (
        rows: {
          artifact_sha256: string;
          map_sha256: string;
          source_index: number;
        }[],
      ): void => {
        for (const r of rows) {
          const artifact = String(r.artifact_sha256);
          const map = String(r.map_sha256);
          const index = Number(r.source_index);
          const id = artifact + "\u0000" + map + "\u0000" + String(index);
          if (sightingSeen.has(id)) continue;
          sightingSeen.add(id);
          sightingVictims.push({ artifact, map, index });
        }
      };

      // THE AGE ARM FIRST, THEN THE ROW ARM, and a key already seen is skipped —
      // the same `pushVictims` de-duplication the artifact cascade uses and for
      // the same reason: a row eligible under BOTH bounds must be deleted once
      // and counted once, or the pass misreports itself to the one caller whose
      // job is deciding whether the sweep is keeping up.
      const sightOverAge = await db.prepare(SIGHTINGS_OVER_AGE_SQL);
      pushSightings(
        await sightOverAge.all(projectId, cutoff, CANDIDATE_SCAN_LIMIT),
      );

      const sightingTotal = await countRows(db, COUNT_SIGHTINGS_SQL, projectId);
      const sightingExcess = sightingTotal - bounds.maxRows;
      if (sightingExcess > 0) {
        const sightOldest = await db.prepare(SIGHTINGS_OLDEST_SQL);
        pushSightings(
          await sightOldest.all(
            projectId,
            Math.min(sightingExcess, CANDIDATE_SCAN_LIMIT),
          ),
        );
      }

      examined += sightingVictims.length;
      for (const v of sightingVictims) {
        if (budget() <= 0) {
          moreWork = true;
          sightingsCapped = true;
          break;
        }
        deleted += await remove(DELETE_SIGHTING_SQL, [
          projectId,
          v.artifact,
          v.map,
          v.index,
        ]);
      }
    }

    // The anti-join half: `sources` rows no surviving sighting names.
    if (budget() > 0 && !sightingsCapped) {
      const unsightedStmt = await db.prepare(UNSIGHTED_SOURCES_SQL);
      const unsighted = await unsightedStmt.all<{ source_sha256: string }>(
        projectId,
        Math.min(budget(), CANDIDATE_SCAN_LIMIT),
      );
      examined += unsighted.length;
      for (const s of unsighted) {
        if (budget() <= 0) {
          moreWork = true;
          break;
        }
        deleted += await remove(DELETE_SOURCE_SQL, [
          projectId,
          String(s.source_sha256),
        ]);
      }
    }

    // --- 4. does work remain for the next pass? ----------------------------
    // Asked by RE-COUNTING rather than by trusting the loop's bookkeeping: the
    // question is about the database, and the database is right there.
    if (!moreWork) {
      moreWork = await workRemains(db, projectId, bounds, cutoff);
    }
  } catch (e) {
    // A sweep that throws is a sweep that silently stops bounding growth, and
    // Caido surfaces neither the throw nor the rejection. RECORD it — `void e`
    // threw away the only account of why retention stopped working — then report
    // what the pass managed and let the caller schedule another.
    failures.count += 1;
    failures.last = describeError(e).slice(0, 200);
    moreWork = true;
  }

  return {
    examined,
    deleted,
    auditDeleted,
    rowCapDeleted,
    moreWork,
    errors: failures.count,
    lastError: failures.last,
  };
}

/** One recorded delete. `sweepRetention` supplies it; the helpers below take it
 *  rather than reaching for `deleteOne` themselves, so no delete on this path can
 *  fail without being counted. */
type DeleteFn = (sql: string, params: DeleteParams) => Promise<number>;

/** The bound parameters of one fully-bound single-row delete, `project_id`
 *  FIRST in every arm.
 *
 *  The four-element arm arrived with `source_sightings`, whose key has been
 *  `(project_id, artifact_sha256, map_sha256, source_index)` since migration
 *  `v: 9`. Its last member is a NUMBER and not a string: `source_index` is an
 *  INTEGER column, and binding "0" where the row holds 0 matches nothing in
 *  SQLite — a delete that silently removes no row is exactly the shape
 *  `deleteOne` was rewritten to stop reporting as success. */
type DeleteParams =
  | [string, string]
  | [string, string, string]
  | [string, string, string, number];

/**
 * Remove ONE digest and everything hanging off it, within the remaining budget.
 *
 * DEPENDENCY ORDER. Children first, parent last, so an exhausted budget leaves a
 * parent with fewer children and NEVER a child with no parent — which is why the
 * artifact row is deleted only when the enumeration proves nothing of its is
 * left. "I deleted everything I listed" is not "there is nothing left" when the
 * listing itself was capped, so completeness is decided by whether the LIMIT was
 * reached rather than by the loop's own bookkeeping.
 *
 * `capped` means this digest is not finished: the artifact survives and the next
 * pass picks it up again, oldest-first ordering guaranteeing it comes back.
 */
async function deleteDigest(
  db: Database,
  projectId: string,
  sha256: string,
  budget: () => number,
  remove: DeleteFn,
): Promise<{
  examined: number;
  deleted: number;
  capped: boolean;
  /** Whether the ARTIFACT ROW ITSELF was removed, as distinct from "some rows
   *  were". `rowCapDeleted` counts digests the cap actually evicted, and a
   *  cascade that spent its whole budget on children left the artifact standing
   *  — reporting that as an eviction would suspend a running scan (D-08) for
   *  work that did not happen. */
  artifactRemoved: boolean;
}> {
  let examined = 0;
  let deleted = 0;
  /** What is left of the PASS budget, this cascade's own deletions included. */
  const left = (): number => budget() - deleted;

  const obsLimit = Math.min(left(), CANDIDATE_SCAN_LIMIT);
  const obsStmt = await db.prepare(OBSERVATION_KEYS_FOR_DIGEST_SQL);
  const obs = await obsStmt.all<{ request_id: string }>(
    projectId,
    sha256,
    obsLimit,
  );
  examined += obs.length;
  for (const o of obs) {
    if (left() <= 0)
      return { examined, deleted, capped: true, artifactRemoved: false };
    deleted += await remove(DELETE_OBSERVATION_SQL, [
      projectId,
      sha256,
      String(o.request_id),
    ]);
  }

  const anaLimit = Math.min(left(), CANDIDATE_SCAN_LIMIT);
  const anaStmt = await db.prepare(ANALYSIS_KEYS_FOR_DIGEST_SQL);
  const ana =
    anaLimit <= 0
      ? []
      : await anaStmt.all<{ detector_set_hash: string }>(
          projectId,
          sha256,
          anaLimit,
        );
  examined += ana.length;
  for (const a of ana) {
    if (left() <= 0)
      return { examined, deleted, capped: true, artifactRemoved: false };
    deleted += await remove(DELETE_ANALYSIS_SQL, [
      projectId,
      sha256,
      String(a.detector_set_hash),
    ]);
  }

  // Reaching the LIMIT means there may be more rows behind it. Deleting the
  // parent now would orphan them.
  if (obs.length >= obsLimit || ana.length >= anaLimit) {
    return { examined, deleted, capped: true, artifactRemoved: false };
  }
  if (left() <= 0)
    return { examined, deleted, capped: true, artifactRemoved: false };
  const removedArtifact = await remove(DELETE_ARTIFACT_SQL, [
    projectId,
    sha256,
  ]);
  deleted += removedArtifact;
  // `remove` reports 0 for a delete that FAILED as well as for one that matched
  // nothing, and both mean the same thing here: the row is still there.
  return {
    examined,
    deleted,
    capped: false,
    artifactRemoved: removedArtifact > 0,
  };
}

/** The four statements and the second key column that describe one child table to
 *  the trim below. Passed as data so `observations` and `analyses` share one
 *  bounded, deterministic implementation instead of two that can drift. */
type ChildTableSpec = {
  overAgeSql: string;
  oldestSql: string;
  countSql: string;
  deleteSql: string;
  secondKey: "request_id" | "detector_set_hash";
};

/** Apply BOTH bounds to one child table, oldest first, within the remaining
 *  budget. Deleting a child never orphans anything — the artifact is the parent —
 *  so this runs after the cascade and needs no dependency ordering of its own. */
async function trimChildTable(
  db: Database,
  projectId: string,
  spec: ChildTableSpec,
  bounds: RetentionBounds,
  cutoff: number,
  budget: () => number,
  remove: DeleteFn,
): Promise<{ examined: number; deleted: number; capped: boolean }> {
  const victims: { sha256: string; second: string }[] = [];
  const seen = new Set<string>();
  const push = (rows: Record<string, unknown>[]): void => {
    for (const r of rows) {
      const sha256 = String(r.sha256);
      const second = String(r[spec.secondKey]);
      const id = sha256 + "\u0000" + second;
      if (seen.has(id)) continue;
      seen.add(id);
      victims.push({ sha256, second });
    }
  };

  const overAge = await db.prepare(spec.overAgeSql);
  push(
    await overAge.all<Record<string, unknown>>(
      projectId,
      cutoff,
      CANDIDATE_SCAN_LIMIT,
    ),
  );

  const total = await countRows(db, spec.countSql, projectId);
  const excess = total - bounds.maxRows;
  if (excess > 0) {
    const oldest = await db.prepare(spec.oldestSql);
    push(
      await oldest.all<Record<string, unknown>>(
        projectId,
        Math.min(excess, CANDIDATE_SCAN_LIMIT),
      ),
    );
  }

  let deleted = 0;
  let capped = false;
  for (const v of victims) {
    if (budget() - deleted <= 0) {
      capped = true;
      break;
    }
    deleted += await remove(spec.deleteSql, [projectId, v.sha256, v.second]);
  }
  return { examined: victims.length, deleted, capped };
}

/**
 * One delete, one statement, prepared inside the call, parameters SPREAD.
 *
 * Returns the rows it removed AND why it failed if it did. A single unwritable
 * row must not stop the pass — but the previous version's `catch { return 0; }`
 * made "failed" and "there was nothing to delete" the same value, which is how a
 * sweep failing on every row could report a clean pass for ever.
 */
async function deleteOne(
  db: Database,
  sql: string,
  params: DeleteParams,
): Promise<{ deleted: number; error: string | null }> {
  try {
    const stmt = await db.prepare(sql);
    const res = await stmt.run(...params);
    return { deleted: Number(res.changes), error: null };
  } catch (e) {
    return { deleted: 0, error: describeError(e).slice(0, 200) };
  }
}

/** True when either bound still binds, or an orphan is still present. */
async function workRemains(
  db: Database,
  projectId: string,
  bounds: RetentionBounds,
  cutoff: number,
): Promise<boolean> {
  const overAge = await db.prepare(ARTIFACTS_OVER_AGE_SQL);
  const stillOld = await overAge.all<{ sha256: string }>(projectId, cutoff, 1);
  if (stillOld.length > 0) return true;

  const artifactCount = await countRows(db, COUNT_ARTIFACTS_SQL, projectId);
  if (artifactCount > bounds.maxRows) return true;

  const orphanObs = await db.prepare(ORPHAN_OBSERVATIONS_SQL);
  if ((await orphanObs.all<object>(projectId, 1)).length > 0) return true;

  const orphanAna = await db.prepare(ORPHAN_ANALYSES_SQL);
  if ((await orphanAna.all<object>(projectId, 1)).length > 0) return true;

  // The child tables carry the SAME two bounds in their own right.
  const oldObs = await db.prepare(OBSERVATIONS_OVER_AGE_SQL);
  if ((await oldObs.all<object>(projectId, cutoff, 1)).length > 0) return true;
  if ((await countRows(db, COUNT_OBSERVATIONS_SQL, projectId)) > bounds.maxRows)
    return true;

  const oldAna = await db.prepare(ANALYSES_OVER_AGE_SQL);
  if ((await oldAna.all<object>(projectId, cutoff, 1)).length > 0) return true;
  if ((await countRows(db, COUNT_ANALYSES_SQL, projectId)) > bounds.maxRows)
    return true;

  // The audit table is asked about its ROW bound and NOTHING ELSE. There is no
  // `cutoff` comparison here and there must never be one — an audit row over the
  // age bound is not work remaining, it is a row the sweep is required to keep
  // (decision D-06).
  if ((await countRows(db, COUNT_AUDIT_SQL, projectId)) > bounds.auditMaxRows)
    return true;

  // `scans` carries BOTH bounds, and the age half asks the question through
  // D-26's predicate rather than around it: a suspended scan over the age bound
  // is not work remaining, it is a cursor the sweep is required to keep. Asking
  // without the predicate would report work for ever and pin `moreWork` true on
  // every pass.
  const oldScans = await db.prepare(SCANS_OVER_AGE_SQL);
  if ((await oldScans.all<object>(projectId, cutoff, 1)).length > 0)
    return true;
  if ((await countRows(db, COUNT_SCANS_SQL, projectId)) > bounds.maxRows)
    return true;

  // The cascade's two tables. WITHOUT THESE THE MULTI-PASS DRAIN STOPS ONE PASS
  // EARLY on exactly the backlog this coverage creates the ability to clear: a
  // pass whose budget ran out inside the sightings work would report "nothing
  // remains" and the consumer would wait for a cadence boundary that sustained
  // ingest never yields (07-REVIEW.md HI-04's failure shape, one table over).
  const oldSightings = await db.prepare(SIGHTINGS_OVER_AGE_SQL);
  if ((await oldSightings.all<object>(projectId, cutoff, 1)).length > 0)
    return true;
  if ((await countRows(db, COUNT_SIGHTINGS_SQL, projectId)) > bounds.maxRows)
    return true;

  const orphanSightings = await db.prepare(ORPHAN_SIGHTINGS_SQL);
  if ((await orphanSightings.all<object>(projectId, 1)).length > 0) return true;

  // `sources` is asked about its EDGE and never about a cap, because it has no
  // cap of its own — see the section header above. An unsighted source is work
  // remaining; a large but fully-sighted `sources` table is not.
  const unsighted = await db.prepare(UNSIGHTED_SOURCES_SQL);
  if ((await unsighted.all<object>(projectId, 1)).length > 0) return true;

  return false;
}

/** Row counts per table for one project. Exported for the sweep's own spec and for
 *  any future health surface — OBS-01 is Phase 2 and will want exactly this. */
export async function retentionCounts(
  db: Database,
  projectId: string,
): Promise<{
  artifacts: number;
  observations: number;
  analyses: number;
  audit: number;
  scans: number;
  sources: number;
  source_sightings: number;
}> {
  return {
    artifacts: await countRows(db, COUNT_ARTIFACTS_SQL, projectId),
    observations: await countRows(db, COUNT_OBSERVATIONS_SQL, projectId),
    analyses: await countRows(db, COUNT_ANALYSES_SQL, projectId),
    audit: await countRows(db, COUNT_AUDIT_SQL, projectId),
    // ADDED rather than left out: every other table the sweep bounds is counted
    // here, and a table the sweep deletes from but no reader can count is a
    // table whose bound nothing can be shown to hold.
    scans: await countRows(db, COUNT_SCANS_SQL, projectId),
    // The same reason, for the two tables plan 07-13 gave the sweep. These are
    // what let W-5's claim be SHOWN rather than asserted: the convergence
    // inequality's insert side counts rows into both, and until this plan the
    // delete side could reach neither and no reader could even count them.
    //
    // SNAKE_CASE, MATCHING THE TABLE. Every other key here is the table's own
    // name, and renaming one of them to fit a naming convention would make the
    // one function whose job is "count the tables" disagree with the schema.
    sources: await countRows(db, COUNT_SOURCES_SQL, projectId),
    source_sightings: await countRows(db, COUNT_SIGHTINGS_SQL, projectId),
  };
}

/**
 * The four numbers the convergence argument is made of, surfaced so a spec can
 * assert against the SAME values the sweep and the scheduler use rather than
 * re-deriving them.
 *
 * `maxRowsPerPass` ALONE IS NOT THE DELETE SIDE — `maxPasses` multiplies it, and
 * `insertedPerIteration` rather than `insertedPerArtifact` is the insert side
 * (07-REVIEW.md HI-04). Both of the narrower numbers are kept: one pass really
 * is bounded by `maxRowsPerPass`, and an artifact carrying no sourcemap really
 * does insert `insertedPerArtifact` rows, which is the only claim that constant
 * still makes.
 */
export const RETENTION_PASS_LIMITS = {
  maxRowsPerPass: MAX_ROWS_PER_PASS,
  maxPasses: RETENTION_SWEEP_MAX_PASSES,
  insertedPerArtifact: INSERTED_PER_ARTIFACT,
  insertedPerIteration: ROWS_INSERTED_PER_ITERATION_MAX,
  sweepEveryNRows: RETENTION_SWEEP_EVERY_N,
} as const;
