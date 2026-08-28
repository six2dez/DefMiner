// packages/backend/src/store/retention.ts — STORE-06, threat T-01-22.
//
// RETENTION IS THE ONLY BOUND ON THIS DATABASE'S GROWTH. Caido never
// garbage-collects `sdk.meta.db()`, does not delete it when the operator deletes
// the project, and it survives a force-reinstall (DB_SURVIVES_REINSTALL). Nothing
// else will ever reclaim a row.
//
// ONE TABLE IS EXEMPT FROM THE AGE BOUND AND FROM IT ONLY: `audit` is bounded by
// rows alone (decision D-06). The reasoning is stated in full beside its
// statements below, where the missing over-age statement is.
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
  RETENTION_SWEEP_MAX_ROWS,
  ROWS_INSERTED_PER_ARTIFACT_MAX,
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
 * FIXED SHAPE — plan 01-03's call site compiles against exactly this.
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
  moreWork: boolean;
  /** Deletes that failed, plus one for a pass that threw outright. */
  errors: number;
  /** The most recent failure's text, bounded like every other store error. */
  lastError: string | null;
};

/**
 * The convergence inequality, restated where the code that depends on it lives.
 *
 * A processed artifact inserts at most ROWS_INSERTED_PER_ARTIFACT_MAX rows, and a
 * sweep runs once per RETENTION_SWEEP_EVERY_N processed artifacts. A pass that
 * removed fewer rows than the interval inserts would let the database grow
 * monotonically past the retention ceiling WHILE RUNNING EXACTLY AS DESIGNED —
 * which is the failure mode this constant exists to make impossible.
 * `thresholds.spec.ts` asserts the inequality; this module reads the constants
 * rather than hard-coding either, so the two cannot drift.
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
    const pushVictims = (rows: { sha256: string }[]): void => {
      for (const r of rows) {
        const sha = String(r.sha256);
        if (seen.has(sha)) continue;
        seen.add(sha);
        victims.push(sha);
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
    const excess = artifactCount - bounds.maxRows;
    if (excess > 0) {
      const oldestStmt = await db.prepare(ARTIFACTS_OLDEST_SQL);
      pushVictims(
        await oldestStmt.all<{ sha256: string }>(
          projectId,
          Math.min(excess, CANDIDATE_SCAN_LIMIT),
        ),
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
    moreWork,
    errors: failures.count,
    lastError: failures.last,
  };
}

/** One recorded delete. `sweepRetention` supplies it; the helpers below take it
 *  rather than reaching for `deleteOne` themselves, so no delete on this path can
 *  fail without being counted. */
type DeleteFn = (
  sql: string,
  params: [string, string] | [string, string, string],
) => Promise<number>;

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
): Promise<{ examined: number; deleted: number; capped: boolean }> {
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
    if (left() <= 0) return { examined, deleted, capped: true };
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
    if (left() <= 0) return { examined, deleted, capped: true };
    deleted += await remove(DELETE_ANALYSIS_SQL, [
      projectId,
      sha256,
      String(a.detector_set_hash),
    ]);
  }

  // Reaching the LIMIT means there may be more rows behind it. Deleting the
  // parent now would orphan them.
  if (obs.length >= obsLimit || ana.length >= anaLimit) {
    return { examined, deleted, capped: true };
  }
  if (left() <= 0) return { examined, deleted, capped: true };
  deleted += await remove(DELETE_ARTIFACT_SQL, [projectId, sha256]);
  return { examined, deleted, capped: false };
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
  params: [string, string] | [string, string, string],
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
}> {
  return {
    artifacts: await countRows(db, COUNT_ARTIFACTS_SQL, projectId),
    observations: await countRows(db, COUNT_OBSERVATIONS_SQL, projectId),
    analyses: await countRows(db, COUNT_ANALYSES_SQL, projectId),
    audit: await countRows(db, COUNT_AUDIT_SQL, projectId),
  };
}

/** The per-pass cap and the insert bound it must dominate, surfaced so a spec can
 *  assert against the SAME numbers the sweep uses rather than re-deriving them. */
export const RETENTION_PASS_LIMITS = {
  maxRowsPerPass: MAX_ROWS_PER_PASS,
  insertedPerArtifact: INSERTED_PER_ARTIFACT,
} as const;
