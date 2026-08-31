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
// ===========================================================================
// ONE SCAN PER PROJECT IS AN INVARIANT, AND IT LIVES IN AN INDEX
// ===========================================================================
// Not "nothing calls start twice". The rule is enforced by the PARTIAL UNIQUE
// index `idx_scans_one_running` — `UNIQUE (project_id) WHERE state = 'running'`
// — created in migration step v5, so a second start FAILS AT THE DRIVER inside
// the insert rather than being turned away by a read this pool cannot make
// atomic with the write that follows it. `06-CONTEXT.md` asks that this be an
// explicit invariant rather than an accident of how the RPC happens to be
// written; this is where it is stated.
//
// The index deliberately does NOT cover `suspended`, because a suspended scan
// has to be able to sit there in order to be resumed at all. The other half of
// the invariant — refusing a start while a SUSPENDED scan is holding the slot —
// is a read in the RPC, and it is a read rather than a constraint because the
// two occupied states mean different things to the operator and the surface has
// a different sentence for each.
//
// That pair is also what BOUNDS the suspended pin in `LIST_SCANS_SQL` below: at
// most one suspended row per project can exist at a time, so pinning every
// suspended row into the returned window can displace at most one row of it.
// The bound stays a bound rather than becoming a soft suggestion.
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
// THE AGE-EXEMPT LEDGER, reached from here for the two events D-16 approved and
// for nothing else. Routine lifecycle stays in `scans` under ordinary retention:
// filling `audit` with background-job chatter would evict the
// permanent-consequence records its row bound was raised to preserve.
import { recordAudit } from "../store/audit";
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
 * The ARITY of {@link ACTIVE_LIFECYCLE_STATES} is part of `GET_ACTIVE_SCAN_SQL`
 * AND of `DISCARD_SQL`, so it is asserted at import rather than assumed at the
 * bind. Those are the two statements in this module whose guard is a LIST; every
 * other transition names its single guard state in the statement text, the way
 * `START_SQL` names `'running'`.
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
    `scan/scans.ts: GET_ACTIVE_SCAN_SQL and DISCARD_SQL each bind ` +
      `${String(ACTIVE_STATE_PLACEHOLDERS)} ` +
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

// ===========================================================================
// THE TRANSITIONS (D-04, D-10, D-11)
// ===========================================================================
//
// EVERY ONE OF THEM IS A SINGLE `UPDATE … WHERE … AND state = …` WITH THE GUARD
// INSIDE THE PREDICATE. `store/retry.ts` states the reason at length and it
// applies here unchanged: a caller-side "read the state, then move it if it is
// still X" is TWO operations, and this driver has no transaction primitive to
// make them one — `BEGIN` does not span `exec` calls and every statement still
// reports success (Pitfall 2). The interleaving that window permits is exactly
// the running walk being reset: a scan the operator paused between the read and
// the write is resumed, or advanced, underneath them.
//
// THE GUARD STATE IS WRITTEN INTO THE STATEMENT TEXT rather than bound, which is
// the shape `START_SQL` above already uses and for the reason it gives there: a
// pause that could move any state other than `running` is not a pause, so the
// state is part of what the statement MEANS rather than a value it takes. The
// one transition whose guard is a LIST binds it, because a list has an arity and
// an arity can drift — see {@link ACTIVE_STATE_PLACEHOLDERS}, which is asserted
// at import for `DISCARD_SQL` as well as for the active-scan read.
//
// THE SUSPENSION REASON IS ALWAYS BOUND AND NEVER WRITTEN INTO THE TEXT. It is a
// value rather than a shape, and binding it is what lets the three constants
// below carry a `SuspendReason` annotation — which is the mechanism that makes
// deleting a member from the closed vocabulary a typecheck failure here instead
// of a string that quietly stops matching the frontend's copy map.
//
// NOTHING BELOW WRITES AN `audit` ROW. D-16 gives a scan exactly two destructive
// events and both land in plan 06-06, together with the forward migration step
// that widens `audit`'s closed `kind` CHECK.

/** The reason a PAUSE writes (D-10). The ANNOTATION is the binding to the closed
 *  vocabulary, not the spelling. */
const OPERATOR_PAUSED: SuspendReason = "operator_paused";
/** The reason an EPOCH CHANGE writes (D-04). */
const PROJECT_CHANGED: SuspendReason = "project_changed";
/** The reason the STARTUP SWEEP writes (D-11, and ERR-02's early slice). */
const PROCESS_RESTARTED: SuspendReason = "process_restarted";
/** The reason a ROW-CAP EVICTION writes (D-08): the backfill was consuming its
 *  own results. NOT written for an age-bound trim — see
 *  {@link suspendForRetentionEviction}. */
const RETENTION_EVICTION: SuspendReason = "retention_eviction";

// `last_request_id` and `last_created_at` ARE NOT TOUCHED. A pause keeps the
// place — that is the whole of D-10, and it is why the pause control is allowed
// to be one click away from nothing.
const PAUSE_SQL = `
UPDATE scans
SET state = 'suspended', suspend_reason = ?, updated_at = ?
WHERE project_id = ? AND scan_id = ? AND state = 'running'
`;

// The reason is CLEARED, not left behind. A running scan still carrying
// `operator_paused` would render its suspension sentence under a badge that says
// it is scanning, on the surface whose entire subject is which of those two it
// is.
//
// AND THE EPOCH IS RE-BASED TO THE ONE IN FORCE NOW. That is the least obvious
// line in this module and it is load-bearing, so here is the whole argument.
//
// `projectEpoch()` is a MONOTONIC COUNT OF APPLIED PROJECT CHANGES
// (`lifecycle.ts`: "Bumped by every applied change"). It never returns to a
// previous value — switching away from a project and back gives a HIGHER number,
// not the old one. A resume that left the row's stale epoch in place would
// therefore produce a scan that suspends itself again on its very first page,
// for ever, because `runScanProducer` re-checks `scan.epoch !== projectEpoch()`
// every page. D-04's suspension would be a ONE-WAY DOOR, and the must-have that
// a suspended scan "resumes only on explicit operator action" would be
// unreachable rather than merely awkward.
//
// THE EPOCH IS A FRESHNESS TOKEN, NOT A PROJECT IDENTITY. The identity is
// `project_id`, which is in this predicate and in every other one in this
// package, and which comes from `currentProjectId()` and never from the caller
// (T-05-34). What the epoch catches is a change that lands MID-FLIGHT, between a
// walk's own reads and its writes — the window `consumer.ts` re-checks it for.
// A resume is the operator saying "continue this scan, in this project, now", so
// re-stamping the token to now is what makes the resume mean anything.
//
// A resume issued from the WRONG project is refused before this statement is
// ever reached, and refused by the scoping rather than by the epoch: the row is
// not in that project's partition, so `getScan` does not find it. That is
// 06-UI-SPEC.md's "Resume it from that project" enforced by the predicate.
const RESUME_SQL = `
UPDATE scans
SET state = 'running', suspend_reason = NULL, epoch = ?, updated_at = ?
WHERE project_id = ? AND scan_id = ? AND state = 'suspended'
`;

// GUARDED ON `running` AND NOT ON THE ACTIVE PAIR. A suspended scan has not
// reached the end of its range — it stopped somewhere in the middle and kept its
// place — so completing one would file an unfinished backfill under **Finished**
// and lose the operator's cursor behind a word that says there is nothing left
// to do.
const COMPLETE_SQL = `
UPDATE scans
SET state = 'completed', suspend_reason = NULL, updated_at = ?, finished_at = ?
WHERE project_id = ? AND scan_id = ? AND state = 'running'
`;

// THE POSITION IS WHAT DISCARD DESTROYS, AND IT IS THE ONLY THING IT DESTROYS.
// `last_request_id` goes back to `''` — the same "no boundary" value a fresh row
// carries — and `last_cursor` to NULL. The COUNTERS and `last_created_at` are
// left alone deliberately: the history row renders "Discarded · {n} seen ·
// reached {date}" from them, and the artifacts and observations the scan already
// produced are not this table's to touch at all.
//
// The guard is the ACTIVE PAIR, bound: a scan can be discarded whether it is
// running or suspended, and discarding an already-terminal row would move
// `completed` history into `discarded` — a rewrite of what happened.
const DISCARD_SQL = `
UPDATE scans
SET state = 'discarded', suspend_reason = NULL,
    last_request_id = '', last_cursor = NULL,
    updated_at = ?, finished_at = ?
WHERE project_id = ? AND scan_id = ? AND state IN (?, ?)
`;

// THE EPOCH GUARD IS A PREDICATE, NOT A BRANCH — `AND epoch <> ?`. Written as an
// `if` in the caller it would be the same two-operation shape the state guard
// avoids, and the window it opens is the one D-04 exists to close: a scan that
// keeps writing after the Caido project changed lands the old project's traffic
// in the new project's partition. It matches how `runScanProducer` re-checks the
// epoch every page — the check is on the same value, in the same direction.
const SUSPEND_ON_EPOCH_SQL = `
UPDATE scans
SET state = 'suspended', suspend_reason = ?, updated_at = ?
WHERE project_id = ? AND scan_id = ? AND state = 'running' AND epoch <> ?
`;

// GUARDED ON `running`, AND THE GUARD IS WHAT KEEPS THE REASON HONEST. A scan
// that is already suspended carries the reason it actually stopped for —
// `operator_paused`, `project_changed`, `process_restarted` — and overwriting
// that with `retention_eviction` would erase the only record of why it stopped,
// on the surface whose whole subject is that question. The predicate declines
// instead, reporting `changes: 0`, exactly as a second pause does.
//
// THE POSITION IS NOT TOUCHED. This is a suspension, not a discard: the operator
// raises the cap and resumes from here, which is the only reason recording the
// stop is worth anything.
const SUSPEND_FOR_RETENTION_SQL = `
UPDATE scans
SET state = 'suspended', suspend_reason = ?, updated_at = ?
WHERE project_id = ? AND scan_id = ? AND state = 'running'
`;

// ONE STATEMENT OVER THE WHOLE PROJECT, and no `scan_id` in the predicate: the
// sweep does not know which scans it is about to find and must not have to read
// them first. `last_cursor` is NULLed because a cursor's lifetime across a
// process restart is NOT MEASURED (O-04) — `last_request_id` is the re-derivable
// position that does not depend on the answer, so it survives and the cursor
// does not.
const SUSPEND_RUNNING_ON_INIT_SQL = `
UPDATE scans
SET state = 'suspended', suspend_reason = ?, last_cursor = NULL, updated_at = ?
WHERE project_id = ? AND state = 'running'
`;

/**
 * What one transition did, and what the row HOLDS afterwards.
 *
 * `row` IS READ BACK, never assumed from the request — this driver has no
 * `RETURNING` and cannot report what a write did, and the operator is about to
 * be shown this state. `store/retry.ts`'s `AnalysisRetry` is the same shape for
 * the same reason; it carries a single field because the panel renders one, and
 * this carries the row because the Scan tab renders several.
 *
 * `undefined` for `row` means there is no such scan — a scan_id that never
 * existed, or one in another project. That is deliberately not collapsed into a
 * fabricated row, because a state the operator is shown that was never persisted
 * is the repudiation T-06-28 names.
 *
 * `changes: 0` IS NOT AN ERROR on any of these. It is the guard declining, and
 * the caller tells the cases apart by reading `changes` and `row.state` rather
 * than by catching something.
 *
 * @internal
 */
export type ScanTransition =
  | (StoreWriteResult & { ok: true; row: ScanRow | undefined })
  | { ok: false; error: string };

const GET_SCAN_SQL = `
SELECT project_id, scan_id, state, suspend_reason, operator_filter, epoch,
       last_request_id, last_cursor, last_created_at,
       pages_walked, seen, admitted, skipped_done, rejected, queued,
       started_at, updated_at, finished_at
FROM scans
WHERE project_id = ? AND scan_id = ?
LIMIT 1
`;

/**
 * One scan by its id, in this project.
 *
 * The READ-BACK half of every transition below, and the only way any of them can
 * report what it produced. Exported because the RPC layer needs to answer
 * "what does this row hold now" after a command the operator issued, and because
 * `getActiveScan` cannot answer it: a scan the operator just discarded is no
 * longer active and is exactly the row they are looking at.
 *
 * @internal
 */
export async function getScan(
  db: Database,
  projectId: string,
  scanId: string,
): Promise<ScanRow | undefined> {
  const stmt = await db.prepare(GET_SCAN_SQL);
  return stmt.get<ScanRow>(projectId, scanId);
}

/**
 * Suspend a RUNNING scan on operator command — a PAUSE, and never a cancel.
 *
 * D-10: the position is kept and a resume continues from exactly where this
 * stopped, which is what makes a mis-clicked pause on a multi-hour backfill cost
 * nothing. Destroying the position is {@link discardScan}, a different function
 * with a different name and its own confirmation.
 *
 * A row that is ALREADY suspended reports `changes: 0` and does not throw. Two
 * pauses in a row is an operator double-click, not an error, and the second one
 * must not rewrite `suspend_reason` — a pause that overwrote `project_changed`
 * would erase the only record of why the scan actually stopped.
 */
export async function pauseScan(
  db: Database,
  projectId: string,
  scanId: string,
  nowMs: number,
): Promise<ScanTransition> {
  try {
    const stmt = await db.prepare(PAUSE_SQL);
    const res = await stmt.run(OPERATOR_PAUSED, nowMs, projectId, scanId);
    return {
      ok: true,
      changes: res.changes,
      row: await getScan(db, projectId, scanId),
    };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

/**
 * Return a SUSPENDED scan to `running`, on explicit operator command.
 *
 * THE ONLY WAY BACK TO `running` FROM A SUSPENSION, and it is never automatic:
 * D-11 forbids an auto-resume after a restart, D-04 forbids one after a project
 * change, and there is no timer anywhere in this module. A `completed` or
 * `discarded` row reports `changes: 0` — a scan that reached the end of its
 * range has nothing to continue, and a discarded one has no position to continue
 * from.
 *
 * @param currentEpoch - The epoch in force NOW, written onto the row. See
 * {@link RESUME_SQL} for why a resume re-bases it rather than preserving it —
 * the short version is that the counter is monotonic, so a preserved epoch makes
 * D-04's suspension permanent.
 */
export async function resumeScan(
  db: Database,
  projectId: string,
  scanId: string,
  currentEpoch: number,
  nowMs: number,
): Promise<ScanTransition> {
  try {
    const stmt = await db.prepare(RESUME_SQL);
    const res = await stmt.run(currentEpoch, nowMs, projectId, scanId);
    return {
      ok: true,
      changes: res.changes,
      row: await getScan(db, projectId, scanId),
    };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

/**
 * Mark a RUNNING scan as having reached the end of its filter's range.
 *
 * Not reachable from a suspension, by the statement's own guard: see
 * {@link COMPLETE_SQL}. `runScanProducer` reports `completed` when a page comes
 * back empty — an empty result IS a finished scan, never an error — and this is
 * the transition that reports into.
 */
export async function completeScan(
  db: Database,
  projectId: string,
  scanId: string,
  nowMs: number,
): Promise<ScanTransition> {
  try {
    const stmt = await db.prepare(COMPLETE_SQL);
    const res = await stmt.run(nowMs, nowMs, projectId, scanId);
    return {
      ok: true,
      changes: res.changes,
      row: await getScan(db, projectId, scanId),
    };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

/**
 * The `detail` a destructive scan event records.
 *
 * DEFMINER-AUTHORED, BOUNDED, AND ASSEMBLED FROM NUMBERS THIS MODULE OWNS. It
 * never carries a URL, a cursor or anything else a target influenced — `audit`
 * is the one table designed to hold no extracted value, and a detail pasted from
 * a scan's inputs would defeat T-01-21 by the back door. `recordAudit` runs
 * `describeError` over it before binding as a second line of defence; that is
 * the absorber, not the licence.
 *
 * The scan id is NOT repeated here: it is the `subject` column, and a detail
 * that restated it would be the second declaration of one fact.
 */
function destructionDetail(parts: readonly string[]): string {
  return parts.join("; ");
}

/**
 * Throw a scan away — the ONE destructive action in this module.
 *
 * IT DESTROYS THE POSITION AND NOTHING ELSE. The artifacts and observations the
 * scan produced went through the same admission gate, digest and store path the
 * live hook uses (D-01); they are not this scan's property and are not touched.
 * What is lost is the place in history the walk had reached, which is why the
 * confirmation copy quantifies it and why this is a separate endpoint from
 * {@link pauseScan} rather than a flag on it (T-06-28).
 *
 * ===========================================================================
 * IT ALSO WRITES AN `audit` ROW, AND THE ORDER IS DELIBERATE
 * ===========================================================================
 * D-16 gives a retroactive scan two events worth a permanent record and this is
 * one of them. `BEGIN` does not span `exec` calls on this driver, so the state
 * change and the audit row are two statements that CANNOT land together — there
 * is no ordering that makes them atomic, only an ordering that chooses which
 * half survives a failure between them. The state change goes FIRST, so the
 * audit row is the record of an action ALREADY TAKEN: the failure mode is a
 * missing record of something that happened, never a record of something that
 * did not. A ledger that can claim a discard nobody performed is worse than one
 * with a gap, because the gap is at least not a lie.
 *
 * NOTHING IS RECORDED WHEN THE GUARD DECLINES. `changes: 0` means the predicate
 * refused — a terminal row, or another project's scan — and no position was
 * destroyed, so there is nothing to record.
 *
 * ===========================================================================
 * THE POSITION IS READ BEFORE THE UPDATE, AND THAT IS NOT A GUARD
 * ===========================================================================
 * `DISCARD_SQL` sets `last_request_id` back to `''`, so the read-back cannot
 * say what was destroyed — the detail has to be assembled from the row as it
 * stood BEFORE. This pre-read is for the RECORD and never for the decision: the
 * state guard stays inside the statement's predicate, where a caller-side check
 * would be two operations this pool cannot make one. A stale pre-read costs an
 * imprecise detail on a row the statement then declines to move, and that row
 * is never recorded at all.
 *
 * @param eventId - Minted BY THE CALLER, which is what makes a retry after an
 * ambiguous failure a no-op instead of a duplicate: the same id re-presented
 * hits the do-nothing conflict clause. A genuine SECOND discard mints a fresh
 * id and is stopped by the state guard instead, because the row is already
 * `discarded`.
 */
export async function discardScan(
  db: Database,
  projectId: string,
  scanId: string,
  nowMs: number,
  eventId: string,
): Promise<ScanTransition> {
  try {
    const before = await getScan(db, projectId, scanId);
    const stmt = await db.prepare(DISCARD_SQL);
    const res = await stmt.run(
      nowMs,
      nowMs,
      projectId,
      scanId,
      // SPREAD, never passed as one array: an array handed to a bind position is
      // silently ignored on this driver. Indexed rather than destructured
      // because the arity is asserted at import and the compiler cannot see
      // that assertion.
      ACTIVE_LIFECYCLE_STATES[0],
      ACTIVE_LIFECYCLE_STATES[1],
    );
    if (res.changes > 0) {
      // NOT AWAITED FOR ITS RESULT BEYOND THIS POINT, AND NOT ALLOWED TO FAIL
      // THE TRANSITION. `recordAudit` reports rather than throws, and a discard
      // that succeeded is a discard that succeeded — turning an unrecorded
      // record into a failed command would tell the operator their scan is
      // still there when it is not.
      await recordAudit(
        db,
        projectId,
        "scan_discarded",
        scanId,
        destructionDetail([
          `discarded at row.id ${before?.last_request_id ?? "unknown"}`,
          `${String(before?.pages_walked ?? 0)} pages walked`,
          `${String(before?.seen ?? 0)} seen`,
        ]),
        nowMs,
        eventId,
      );
    }
    return {
      ok: true,
      changes: res.changes,
      row: await getScan(db, projectId, scanId),
    };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

/**
 * Stop a RUNNING scan because retention's ROW CAP was deleting its own results
 * (D-08), and record that DefMiner did so.
 *
 * ===========================================================================
 * WHY THIS EXISTS, AND WHY IT IS NOT AN AGE-BOUND CONCERN
 * ===========================================================================
 * A retroactive scan walks backwards through captured traffic and stores what it
 * admits. If the artifact ROW CAP starts evicting to make room, the backfill is
 * consuming itself: every page it walks costs a page it already walked, and it
 * will never finish however long it runs. An AGE-BOUND eviction means nothing of
 * the sort — a 90-day timer removing artifacts older than the retention window
 * is retention working exactly as configured, and stopping a scan for it would
 * be DefMiner cancelling the operator's backfill over routine housekeeping.
 *
 * That distinction is the whole reason `sweepRetention` reports `rowCapDeleted`
 * separately from `deleted`. This function is the consumer of that number and
 * has no opinion of its own about which eviction happened.
 *
 * ===========================================================================
 * THE SAME TWO-STATEMENT ORDERING AS {@link discardScan}
 * ===========================================================================
 * State change first, audit row second, for the reason stated there: the record
 * is of an action already taken, so a failure between them leaves a gap rather
 * than a claim. Nothing is recorded when the guard declines.
 *
 * @param evictedCount - How many of this project's artifacts the ROW CAP removed
 * in the sweep that triggered this. It goes into the audit detail as a number
 * and nowhere else — the operator-facing sentence is `06-UI-SPEC.md`'s, and it
 * says the scan ran a little past the first evicted row rather than claiming it
 * stopped at it, because the sweep runs on a cadence and the detection is
 * therefore late by up to that many artifacts.
 * @param eventId - Minted by the caller, same contract as {@link discardScan}.
 */
export async function suspendForRetentionEviction(
  db: Database,
  projectId: string,
  scanId: string,
  evictedCount: number,
  nowMs: number,
  eventId: string,
): Promise<ScanTransition> {
  try {
    const stmt = await db.prepare(SUSPEND_FOR_RETENTION_SQL);
    const res = await stmt.run(RETENTION_EVICTION, nowMs, projectId, scanId);
    if (res.changes > 0) {
      await recordAudit(
        db,
        projectId,
        "scan_suspended_by_retention",
        scanId,
        destructionDetail([
          `retention row cap evicted ${String(evictedCount)} artifacts`,
          "scan suspended at its position",
        ]),
        nowMs,
        eventId,
      );
    }
    return {
      ok: true,
      changes: res.changes,
      row: await getScan(db, projectId, scanId),
    };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

/**
 * Suspend a running scan BECAUSE THE PROJECT CHANGED UNDER IT (D-04).
 *
 * @param currentEpoch - The epoch in force NOW. The statement moves the row only
 * when it DIFFERS from the row's own, so a call with a matching epoch is a
 * no-op reporting `changes: 0` rather than a suspension nobody asked for. The
 * comparison is in the predicate for the reason {@link SUSPEND_ON_EPOCH_SQL}
 * states: as a caller-side branch it is two operations this pool cannot make
 * one.
 */
export async function suspendOnEpochChange(
  db: Database,
  projectId: string,
  scanId: string,
  currentEpoch: number,
  nowMs: number,
): Promise<ScanTransition> {
  try {
    const stmt = await db.prepare(SUSPEND_ON_EPOCH_SQL);
    const res = await stmt.run(
      PROJECT_CHANGED,
      nowMs,
      projectId,
      scanId,
      currentEpoch,
    );
    return {
      ok: true,
      changes: res.changes,
      row: await getScan(db, projectId, scanId),
    };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

/**
 * D-11's STARTUP SWEEP: move every `running` scan in this project to
 * `suspended`, with a reason, in ONE statement.
 *
 * THIS IS A SLICE OF ERR-02, A PHASE 2 REQUIREMENT, SHIPPED EARLY AND DECLARED.
 * ERR-02's rule is that jobs in flight when the process died are detected on
 * startup and either resumed or explicitly abandoned, never left permanently
 * running. Applied to the one table that needs it now: a `running` row is a lie
 * the moment the process holding the walk is gone, and nothing else in the
 * system will ever move it — the producer refuses to advance a scan it cannot
 * find in memory, and the operator is shown a badge saying it is scanning.
 * Phase 2 inherits this pattern — one statement, a reason, and never an
 * auto-resume — rather than inventing a second one.
 *
 * NOTHING IS RESUMED. The reason is `process_restarted` and the row sits there
 * until the operator says otherwise, which is exactly what ERR-02's "explicitly
 * abandoned" half means here: DefMiner does not decide on the operator's behalf
 * that a multi-hour backfill should start pulling full response bodies again the
 * moment Caido comes back up.
 *
 * Returns `changes` — the number of rows it moved. It is a `StoreWriteResult`
 * and not a {@link ScanTransition} because there is no single row to read back:
 * the statement is set-based by design, and reading each moved row would be the
 * per-item shape D-03 has already removed from this package once.
 */
export async function suspendRunningOnInit(
  db: Database,
  projectId: string,
  nowMs: number,
): Promise<StoreWriteResult> {
  try {
    const stmt = await db.prepare(SUSPEND_RUNNING_ON_INIT_SQL);
    const res = await stmt.run(PROCESS_RESTARTED, nowMs, projectId);
    return { ok: true, changes: res.changes };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

/**
 * Default AND MAXIMUM page size for the scan history read.
 *
 * Same reasoning as `AUDIT_LIST_DEFAULT_LIMIT`, and NOT tagged `@internal` for
 * the same reason: the spec asserts the default against THIS constant rather
 * than against a copy of its value, so a test cannot keep passing while the
 * code that matters drifts. A read with no limit is a read whose cost is set by
 * how long the operator has had DefMiner installed.
 *
 * THE NUMBER IS AN ASSUMPTION, NOT A MEASUREMENT, and saying so here is the
 * point of this paragraph. No requirement bounds the number of scans a project
 * is expected to accumulate, and nothing in this phase measured one. What is
 * BINDING is the SHAPE — a stated bound, enforced at read rather than at render,
 * suspended rows exempt from it, and the truncation said in words on the surface
 * — and the number may move without any of that changing. Plan 06-13 owns the
 * surface that renders `Showing the {n} most recent scans`, and carries the
 * number as an explicit planner assumption; presenting it here as derived would
 * be the more comfortable lie.
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

// THE LEADING `(state = 'suspended') DESC` TERM IS THE PIN, AND IT IS LOAD
// BEARING RATHER THAN COSMETIC.
//
// A suspended scan's ROW IS ITS CURSOR. That is why D-26 exempts the state from
// the retention age bound, and it is the same reason it must be exempt from this
// display bound: a suspended row cut off below a limit is an operator's
// unfinished work hidden behind a number nobody chose deliberately, and the
// operator has no way to learn it is there. The list is the only surface that
// shows it.
//
// PINNED INSIDE THE `ORDER BY` rather than as a second statement or a UNION,
// because this stays ONE bounded `project_id`-scoped read — which is the shape
// `sql-discipline.spec.ts` requires and the shape P5-D20 established for the
// suppressions list. A second statement would also be two round trips on a
// pooled connection to answer one question.
//
// THE PIN COSTS AT MOST ONE ROW OF THE WINDOW. The one-at-a-time rule refuses a
// start while a suspended scan holds the slot, so at most one suspended row per
// project exists at a time — see this file's header. The bound therefore stays a
// bound rather than becoming a soft suggestion.
//
// AND THE SECONDARY KEYS ARE THE POINT, exactly as `listAudit`'s are:
// `started_at` alone is not a total order — two scans started in the same
// millisecond tie, and SQLite is then free to return them in whatever order the
// scan produced. `scan_id DESC` breaks every tie deterministically, so two reads
// of the same set agree and a caller may compare two sequences for equality and
// have that mean something.
const LIST_SCANS_SQL = `
SELECT project_id, scan_id, state, suspend_reason, operator_filter, epoch,
       last_request_id, last_cursor, last_created_at,
       pages_walked, seen, admitted, skipped_done, rejected, queued,
       started_at, updated_at, finished_at
FROM scans
WHERE project_id = ?
ORDER BY (state = 'suspended') DESC, started_at DESC, scan_id DESC
LIMIT ?
`;

/**
 * This project's scan history — newest first, every suspended scan pinned in.
 *
 * BOUNDED AT READ, NOT AT RENDER, and the bound CANNOT BE WIDENED FROM THE RPC.
 * `limit` is CLAMPED into `[1, SCAN_LIST_DEFAULT_LIMIT]`, which is a stricter
 * rule than `listAudit`'s fallback and the difference is deliberate: this list's
 * only caller is an RPC the frontend drives, and a ceiling a caller may only
 * LOWER is the shape `ExportRequest.chunkRows` already uses on this contract. A
 * zero, negative or non-finite limit falls back to the default rather than being
 * passed through — `Number("")` is 0, which SQLite would honour as "no rows",
 * silently showing the operator an empty scan history.
 *
 * A read with no limit at all is a read whose cost is set by how long the
 * operator has had DefMiner installed.
 *
 * @internal
 */
export async function listScans(
  db: Database,
  projectId: string,
  limit: number = SCAN_LIST_DEFAULT_LIMIT,
): Promise<ScanRow[]> {
  const bounded =
    Number.isFinite(limit) && limit > 0
      ? Math.min(Math.floor(limit), SCAN_LIST_DEFAULT_LIMIT)
      : SCAN_LIST_DEFAULT_LIMIT;
  const stmt = await db.prepare(LIST_SCANS_SQL);
  return stmt.all<ScanRow>(projectId, bounded);
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
