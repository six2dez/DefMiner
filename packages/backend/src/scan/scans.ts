// packages/backend/src/scan/scans.ts — the retroactive scan's durable position
// (FIND-03, D-09).
//
// ===========================================================================
// WHAT THIS TABLE IS FOR
// ===========================================================================
// A backfill runs for hours, across restarts and project switches, and the one
// thing it cannot keep in memory is where it had got to. Every row here is one
// scan's PLACE IN HISTORY plus the counters the operator reads to tell a
// working backfill from a stalled one. It holds no content and no digest: the
// artifacts and observations a scan produces go through the same admission
// gate, the same digest and the same store path the live hook uses, because
// there is no second analysis path (D-01).
//
// ===========================================================================
// ONE STATEMENT PER WRITE. THERE IS NO ALTERNATIVE ON THIS DRIVER.
// ===========================================================================
// `BEGIN` does not span `exec` calls and every statement still returns SUCCESS,
// so code that LOOKS transactional passes every test and provides no atomicity
// whatsoever (Pitfall 2). No invariant here may require two statements to land
// together — which is why the state guard lives INSIDE each predicate and why
// the one-scan-per-project rule is a partial unique index in migration step v5
// rather than a check before an insert. A caller-side "is one running?" read
// followed by an insert is two operations with a window between them, and the
// interleaving that window permits is two running scans on one project, each
// advancing a position the other does not know about.
//
// ===========================================================================
// THE KEY IS NATURAL AND CALLER-GENERATED
// ===========================================================================
// `scan_id`, never `id`: `last_insert_rowid()` is unusable on this pooled
// connection (decision P1-D1), so a surrogate id would be a row identity
// nothing can read back, and `schema.spec.ts`'s FORBIDDEN_COLUMNS bans the bare
// name package-wide. The caller mints the UUID, which makes the CALLER the
// owner of idempotency and makes a retry after an ambiguous failure a no-op
// instead of a second scan.
//
// ===========================================================================
// WRITE, THEN READ BACK
// ===========================================================================
// There is no `RETURNING` on this driver and no `last_insert_rowid()`, so a
// write cannot tell a caller what it wrote — and the operator is about to be
// SHOWN this state. A reported position that was never persisted is the
// repudiation the phase's threat register names, so every mutation that a
// surface renders is followed by a read.
//
// Driver constraints inherited unchanged: positional `?` only, `prepare()`
// INSIDE the call because `sdk.meta.db()` is a pool over worker threads, and
// `project_id` in every predicate because one SQLite file serves every Caido
// project (T-01-20).
//
// Caught exceptions render through `describeError`, never a bare
// stringification. The reasoning — a driver rejection carries the bound
// parameters, and one of them is a filter the operator typed — is stated once
// beside the first converted site in `artifacts.ts`. Enforced by
// `error-redaction.spec.ts`.

import type {
  ScanLifecycleState,
  ScanState,
  SuspendReason,
} from "@defminer/engine/contract";
import {
  isDegradedScanState,
  SCAN_LIFECYCLE_STATES,
  TERMINAL_SCAN_STATES,
} from "@defminer/engine/contract";
import type { Database } from "sqlite";

import { DETECTOR_CORPUS_VERSION } from "../store/analyses";
import type { StoreWriteResult } from "../store/artifacts";
import { describeError } from "../telemetry";

/**
 * The lifecycle states a scan is still "the active one" in.
 *
 * DERIVED FROM THE VOCABULARY, never restated: the two members that are not
 * terminal. A suspended scan is active in the sense every surface cares about —
 * it is holding its place and it blocks a second start — while `completed` and
 * `discarded` are history the Scan tab lists but never resumes.
 */
const ACTIVE_LIFECYCLE_STATES: readonly ScanLifecycleState[] =
  SCAN_LIFECYCLE_STATES.filter(
    (state) => state !== "completed" && state !== "discarded",
  );

/**
 * The ARITY of {@link ACTIVE_LIFECYCLE_STATES} is part of `GET_ACTIVE_SCAN_SQL`,
 * so it is asserted at import rather than assumed at the bind.
 *
 * `IN (?, ?)` has two placeholders written as literal text, because every
 * statement in this package is a complete literal and an arity computed from a
 * list length would be interpolated SQL. If a fifth lifecycle state is ever
 * added, this throws while the module is being imported — naming both halves —
 * instead of binding a short list and silently making one state invisible to
 * the surface that renders it. Same mechanism, same reason, as
 * `store/retry.ts`'s guard on `RETRYABLE_SCAN_STATES`.
 */
const ACTIVE_STATE_PLACEHOLDERS = 2;
if (ACTIVE_LIFECYCLE_STATES.length !== ACTIVE_STATE_PLACEHOLDERS) {
  throw new Error(
    `scan/scans.ts: GET_ACTIVE_SCAN_SQL binds ${String(ACTIVE_STATE_PLACEHOLDERS)} ` +
      `state placeholders but ACTIVE_LIFECYCLE_STATES now holds ` +
      `${String(ACTIVE_LIFECYCLE_STATES.length)}. Every statement in this package is a ` +
      `complete literal, so the guard list cannot be sized at run time — widen the ` +
      `statement and this bound in one edit.`,
  );
}

/**
 * The analysis state a retroactive scan treats as "already done, do not reload".
 *
 * DERIVED, never spelled: the one terminal analysis state that is NOT degraded.
 * The operator-facing promise is 06-UI-SPEC.md's `Skipped` help text — "Anything
 * that was partial or failed is re-offered, so a scan repairs earlier failures
 * rather than cementing them" — and deriving it from the shipped vocabulary is
 * what keeps that sentence true if the vocabulary grows. Writing `'done'` into
 * the statement would have been a third declaration of a closed set whose whole
 * value is that the CHECK constraint and every surface agree on one list.
 */
const FINISHED_ANALYSIS_STATES: readonly ScanState[] =
  TERMINAL_SCAN_STATES.filter((state) => !isDegradedScanState(state));

/** Same mechanism as {@link ACTIVE_STATE_PLACEHOLDERS}, for the skip read's
 *  single placeholder. A second non-degraded terminal state would silently stop
 *  being skipped; this stops the module loading instead.
 *
 *  The statement that binds it lives in `scan/producer.ts` as of plan 06-03 —
 *  see {@link FINISHED_ANALYSIS_STATE} — but the DERIVATION stays here, beside
 *  the other vocabulary derivations this module owns. */
const FINISHED_STATE_PLACEHOLDERS = 1;
if (FINISHED_ANALYSIS_STATES.length !== FINISHED_STATE_PLACEHOLDERS) {
  throw new Error(
    `scan/scans.ts: the skip-done statement binds ${String(FINISHED_STATE_PLACEHOLDERS)} ` +
      `state placeholder but FINISHED_ANALYSIS_STATES now holds ` +
      `${String(FINISHED_ANALYSIS_STATES.length)}. Widen the statement in ` +
      `scan/producer.ts and this bound in one edit.`,
  );
}

/**
 * The one analysis state the scan skips, as a scalar.
 *
 * Exported so `scan/producer.ts` can bind it without re-deriving it. A second
 * `TERMINAL_SCAN_STATES.filter(...)` in that module would be a second
 * declaration of the same rule, which is precisely what deriving it once was
 * for; the assertion above is what makes taking element zero safe.
 *
 * @internal
 */
export const FINISHED_ANALYSIS_STATE: ScanState = FINISHED_ANALYSIS_STATES[0];

/**
 * One scan row, as it is stored. Column names, not camelCase: this is the
 * database's shape and the RPC layer maps it field by field rather than
 * spreading it, so a column added here does not cross the boundary by accident.
 *
 * @internal
 */
export type ScanRow = {
  project_id: string;
  scan_id: string;
  state: ScanLifecycleState;
  suspend_reason: SuspendReason | null;
  operator_filter: string;
  epoch: number;
  last_request_id: string;
  last_cursor: string | null;
  last_created_at: number | null;
  pages_walked: number;
  seen: number;
  admitted: number;
  skipped_done: number;
  rejected: number;
  queued: number;
  started_at: number;
  updated_at: number;
  finished_at: number | null;
};

// Positional `?` ONLY, and no `RETURNING`: neither named parameters nor
// `RETURNING` work on this driver, and both are reported by
// `sql-discipline.spec.ts`. `exec()` accepts no bind values at all, so binding
// requires prepare() then Statement.run(...params) with the parameters SPREAD.
//
// `ON CONFLICT ... DO NOTHING` and not `DO UPDATE`, for `recordAudit`'s reason:
// a replay must not rewrite a position. Overwriting an existing scan row would
// reset a running backfill's counters underneath itself.
//
// `state` is written as the literal `'running'` rather than bound, because a
// start that could produce any OTHER state is not a start. The other three
// members are reached by the transitions plans 06-05 and 06-09 add, each with
// its own statement and its own guard.
const START_SQL = `
INSERT INTO scans (project_id, scan_id, state, suspend_reason, operator_filter, epoch,
                   last_request_id, last_cursor, last_created_at,
                   pages_walked, seen, admitted, skipped_done, rejected, queued,
                   started_at, updated_at, finished_at)
VALUES (?, ?, 'running', NULL, ?, ?, '', NULL, NULL, 0, 0, 0, 0, 0, 0, ?, ?, NULL)
ON CONFLICT (project_id, scan_id) DO NOTHING
`;

/**
 * Begin one retroactive scan.
 *
 * `''` FOR THE POSITION AND NOT NULL. The empty string means "no boundary yet"
 * and is what makes the first page compose with no position clause; a NULL
 * would make the column nullable and leave "never walked" indistinguishable
 * from "position lost".
 *
 * TWO DIFFERENT FALSE OUTCOMES, AND THE CALLER MUST TELL THEM APART:
 *
 *   `{ ok: true, changes: 1 }` — started.
 *   `{ ok: true, changes: 0 }` — this exact `scanId` already exists. A REPLAY,
 *       and deliberately not an error: the caller minted the id, so a retry
 *       after an ambiguous failure lands here rather than starting a second
 *       scan.
 *   `{ ok: false, error }`     — the write was refused. In practice this is the
 *       partial unique index declining a SECOND running scan on the project,
 *       which is the one-at-a-time invariant working. It is reported rather
 *       than thrown because the surface renders it as a sentence.
 *
 * @param scanId - Minted by the CALLER, from the runtime's UUID function.
 * @param operatorFilter - `''` when the operator supplied none. Stored as given
 * so the composed filter can be rebuilt and shown; never interpolated into a
 * sentence and never used to build SQL.
 */
export async function startScan(
  db: Database,
  projectId: string,
  scanId: string,
  operatorFilter: string,
  epoch: number,
  nowMs: number,
): Promise<StoreWriteResult> {
  try {
    const stmt = await db.prepare(START_SQL);
    const res = await stmt.run(
      projectId,
      scanId,
      operatorFilter,
      epoch,
      nowMs,
      nowMs,
    );
    return { ok: true, changes: res.changes };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

// ONE statement, and THE GUARD IS IN THE PREDICATE rather than in a check
// before it — `store/retry.ts`'s design, and for the same reason: a caller-side
// "read the state, then advance if it is running" is two operations this driver
// cannot make one, and the interleaving it permits is a scan the operator just
// suspended being advanced past the position they were about to resume from.
//
// Every counter is `column + ?` and not `= ?`. The producer knows what ONE page
// contributed and does not know the running totals, and a read-then-add here
// would be the same two-operation shape one level down.
const ADVANCE_SQL = `
UPDATE scans
SET last_request_id = ?, last_cursor = ?, last_created_at = ?,
    pages_walked = pages_walked + 1,
    seen = seen + ?, admitted = admitted + ?, skipped_done = skipped_done + ?,
    rejected = rejected + ?, queued = queued + ?, updated_at = ?
WHERE project_id = ? AND scan_id = ? AND state = 'running'
`;

/**
 * What one walked page contributed.
 *
 * `lastCreatedAt` COMES FROM THE ITEM, NEVER FROM THE CLOCK, and that is the
 * single most consequential line in this module. `ingest/consumer.ts` stamps
 * every persisted row with `Date.now()`, so a position line built from a stored
 * row would read "now scanning traffic from today" for the entire walk — the
 * most misleading string this surface could produce, on the one element the
 * operator uses to judge whether a job with no percentage is progressing.
 *
 * @internal
 */
export type ScanAdvance = {
  /** Caido's identifier for the LAST request of the page. The walk is
   *  descending, so the last item is the oldest and is the boundary the next
   *  page starts strictly below. */
  readonly lastRequestId: string;
  /** Opportunistic. `null` is always legal and costs nothing: the position is
   *  `lastRequestId` and this is an in-process fast path (O-04). */
  readonly lastCursor: string | null;
  /** `request.getCreatedAt().getTime()` of that same last item. */
  readonly lastCreatedAt: number;
  readonly seen: number;
  readonly admitted: number;
  readonly skippedDone: number;
  readonly rejected: number;
  readonly queued: number;
  readonly nowMs: number;
};

/**
 * Move one scan's position forward by exactly one page.
 *
 * Returns `changes: 0` for every request the guard declines — a suspended scan,
 * a completed one, a scan in another project, a scan that is not there. None of
 * those is an error: they are the guard working, and the caller distinguishes
 * them by reading `changes` rather than by catching something.
 */
export async function advanceScan(
  db: Database,
  projectId: string,
  scanId: string,
  advance: ScanAdvance,
): Promise<StoreWriteResult> {
  try {
    const stmt = await db.prepare(ADVANCE_SQL);
    const res = await stmt.run(
      advance.lastRequestId,
      advance.lastCursor,
      advance.lastCreatedAt,
      advance.seen,
      advance.admitted,
      advance.skippedDone,
      advance.rejected,
      advance.queued,
      advance.nowMs,
      projectId,
      scanId,
    );
    return { ok: true, changes: res.changes };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

/**
 * Default page size for the scan history read.
 *
 * Same reasoning as `AUDIT_LIST_DEFAULT_LIMIT`, and NOT tagged `@internal` for
 * the same reason: the spec asserts the default against THIS constant rather
 * than against a copy of its value, so a test cannot keep passing while the
 * code that matters drifts. A read with no limit is a read whose cost is set by
 * how long the operator has had DefMiner installed.
 */
export const SCAN_LIST_DEFAULT_LIMIT = 200;

// THE SECONDARY SORT KEY IS THE POINT, exactly as `listAudit`'s is: `started_at`
// alone is not a total order — two scans started in the same millisecond tie,
// and SQLite is then free to return them in whatever order the scan produced.
// `scan_id DESC` breaks every tie deterministically.
//
// The state list is BOUND, not written: the vocabulary has one declaration and
// the arity is asserted at import above.
const GET_ACTIVE_SCAN_SQL = `
SELECT project_id, scan_id, state, suspend_reason, operator_filter, epoch,
       last_request_id, last_cursor, last_created_at,
       pages_walked, seen, admitted, skipped_done, rejected, queued,
       started_at, updated_at, finished_at
FROM scans
WHERE project_id = ? AND state IN (?, ?)
ORDER BY state ASC, started_at DESC, scan_id DESC
LIMIT 1
`;

/**
 * This project's active scan — the running one if there is one, otherwise the
 * newest suspended one.
 *
 * `ORDER BY state ASC` IS THE PREFERENCE, and it is not an accident of
 * alphabetisation being convenient: `'running' < 'suspended'` under SQLite's
 * default collation, so the running scan sorts first. It is written as an
 * explicit ORDER rather than as two statements because two statements is two
 * round trips on a pooled connection to answer one question, and the answer
 * would still have to pick between them.
 *
 * `undefined` when the project has no active scan. That is a REAL STATE — the
 * one that puts the start form on screen — and it is deliberately not collapsed
 * into a zero-filled row, because a counter strip reading `0 seen · 0 admitted`
 * describes a scan that started and found nothing, which is the opposite of the
 * truth for a project that has never run one.
 */
export async function getActiveScan(
  db: Database,
  projectId: string,
): Promise<ScanRow | undefined> {
  const stmt = await db.prepare(GET_ACTIVE_SCAN_SQL);
  return stmt.get<ScanRow>(
    projectId,
    // SPREAD, never passed as one array: an array handed to a bind position is
    // silently ignored on this driver and produced rows with every column NULL
    // in Phase 0. Indexed rather than destructured because the arity is
    // asserted above and the compiler cannot see that assertion.
    ACTIVE_LIFECYCLE_STATES[0],
    ACTIVE_LIFECYCLE_STATES[1],
  );
}

// ===========================================================================
// THE SKIP-DONE READ MOVED TO `scan/producer.ts` (plan 06-03, D-03)
// ===========================================================================
// `isRequestFinished` lived here and asked the question ONCE PER ITEM. At twenty
// items a page that is 40,000 indexed round trips for a 40,000-request backfill
// instead of 2,000, every one of them on a pooled connection. D-03 replaces it
// with ONE bounded read per page, which has to live where the page is.
//
// DELETED RATHER THAN LEFT AS A SECOND WAY TO ASK. Two readers of the same
// question drift, and the one nobody calls is the one that stops being right
// without anything failing. The derivation it hung off — which terminal state
// counts as finished — stays above, and the producer binds
// {@link FINISHED_ANALYSIS_STATE}.
