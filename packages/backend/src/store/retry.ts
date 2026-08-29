// packages/backend/src/store/retry.ts — the operator's manual override of a
// stopped analysis (OPS-03).
//
// ===========================================================================
// WHAT THIS MODULE IS, AND WHAT IT DELIBERATELY IS NOT
// ===========================================================================
// `TERMINAL_SCAN_STATES` treats the failed state as terminal ON PURPOSE, and
// its own comment says why: the phase that wrote it had no failure taxonomy —
// ERR-02 is Phase 2's — so re-analysing a failure automatically would mean
// re-walking the same bytes on every sighting, for ever, with nothing to break
// the loop.
//
// THIS PATH DOES NOT CHANGE THAT POLICY. It is the operator saying, about one
// row they are looking at, "try this one again". NOTHING RE-ANALYSES ON ITS OWN
// AS A RESULT OF THIS MODULE: no timer is installed, no queue entry is written,
// and the automatic rule stays exactly where it was. What the row becomes is
// re-claimable — `isAnalysed` reports false for a non-terminal state — so the
// walk happens the next time the artifact is sighted, through the same ingest
// path every other analysis takes. That is a real and stated limit, not an
// oversight: writing a queue entry here would be a second way work enters the
// pipeline, with none of the admission controls the first one has.
//
// ===========================================================================
// THE GUARD IS INSIDE THE STATEMENT. THAT IS THE WHOLE DESIGN.
// ===========================================================================
// A caller-side "read the state, then update if it is retryable" is TWO
// operations, and this driver has no transaction primitive to make them one —
// `BEGIN` does not span `exec` calls and every statement still reports success
// (Pitfall 2). The interleaving that permits is the one that matters: a walk
// that STARTS between the read and the write is reset underneath itself, mid
// flight, with its `bytes_walked` cleared and its consumer still running
// (threat T-05-50). So the state list is a constraint in the predicate.
//
// The list is {@link RETRYABLE_SCAN_STATES}, imported. The five scan-state
// strings are not written in this file and must not be: the vocabulary has one
// declaration, in `@defminer/engine/contract`, and the database's own CHECK
// constraint is the other half of the same agreement.
//
// ===========================================================================
// WRITE-THEN-READ, FOR THE REASON `claimAnalysis` ALREADY GIVES
// ===========================================================================
// There is no `RETURNING` on this driver (it needs SQLite 3.35 and P4-D4
// declined it) and `last_insert_rowid()` is unusable on the pooled connection.
// A write therefore cannot tell a caller what it wrote. The read back is the
// ONLY way to learn the row's resulting state — and the operator is about to
// be shown that state, so a reported state that was never persisted is exactly
// the repudiation T-05-55 names.
//
// Caught exceptions render through `describeError`, never a bare
// stringification. The reasoning — a driver rejection carries the bound
// parameters — is stated once beside the first converted site in
// `artifacts.ts`. Enforced by `error-redaction.spec.ts`.
//
// Driver constraints inherited unchanged: positional `?` only, `prepare()`
// INSIDE the call because `sdk.meta.db()` is a pool over worker threads, one
// statement per mutation on a fully-bound natural key, and `project_id` in the
// predicate because one SQLite file serves every Caido project (T-01-20).

import type { ScanState } from "@defminer/engine/contract";
import {
  RETRY_TARGET_SCAN_STATE,
  RETRYABLE_SCAN_STATES,
} from "@defminer/engine/contract";
import type { Database } from "sqlite";

import { describeError } from "../telemetry";

import { getAnalysis } from "./analyses";
import type { StoreWriteResult } from "./artifacts";

/**
 * The retryable list's ARITY is part of the statement below, so it is asserted
 * at import rather than assumed at the bind.
 *
 * `IN (?, ?)` has two placeholders written as literal text, because every
 * statement in this package is a complete literal and an arity computed from a
 * list length would be interpolated SQL. If a sixth degraded state is ever
 * added, this throws while the module is being imported — naming both halves —
 * instead of binding a short list and silently retrying one state fewer. Same
 * mechanism, same reason, as `table-contract.ts`'s row-height lookup.
 */
const RETRYABLE_STATE_PLACEHOLDERS = 2;
if (RETRYABLE_SCAN_STATES.length !== RETRYABLE_STATE_PLACEHOLDERS) {
  throw new Error(
    `store/retry.ts: RETRY_ANALYSIS_SQL binds ${String(RETRYABLE_STATE_PLACEHOLDERS)} ` +
      `state placeholders but RETRYABLE_SCAN_STATES now holds ` +
      `${String(RETRYABLE_SCAN_STATES.length)}. Every statement in this package is a ` +
      `complete literal, so the guard list cannot be sized at run time — widen the ` +
      `statement and this bound in one edit.`,
  );
}

// ONE statement. The key is FULLY BOUND so it can only ever touch the row the
// caller named, and the STATE GUARD IS IN THE PREDICATE rather than in a check
// before it — see this file's header.
//
// The previous walk's numbers are cleared in the same statement, not left
// behind: a queued row still carrying the stopped walk's `bytes_walked` would
// make UI-09's degraded marker render "Analysis stopped at 4,096 of N bytes"
// about an analysis that has not started. `error` goes with them for the same
// reason, and clearing it is also the last place the previous diagnostic can
// linger on a row the operator has explicitly asked to redo.
const RETRY_ANALYSIS_SQL = `
UPDATE analyses
SET scan_state = ?, started_at = ?, finished_at = NULL, max_slice_ms = NULL,
    bytes_walked = NULL, error = NULL
WHERE project_id = ? AND sha256 = ? AND detector_set_hash = ?
  AND scan_state IN (?, ?)
`;

/**
 * The outcome of a retry attempt.
 *
 * `state` is what the row ACTUALLY HOLDS after the write, read back. It is
 * `undefined` only when there is no such row — a key that does not exist, or
 * one retention swept — and that is deliberately not collapsed into a
 * fabricated state, because the panel renders this value.
 *
 * @internal
 */
export type AnalysisRetry =
  | (StoreWriteResult & { ok: true; state: ScanState | undefined })
  | { ok: false; error: string };

/**
 * Move a stopped analysis back out of its terminal state, on operator command.
 *
 * Returns `changes: 0` and the row's UNCHANGED state for every request the
 * guard declines — a complete analysis, a queued one, a running one, a row in
 * another project, a row at another corpus version, and a row that is not
 * there. None of those is an error: they are the guard working, and the caller
 * distinguishes them by reading `state` rather than by catching something.
 */
export async function retryAnalysis(
  db: Database,
  projectId: string,
  sha256: string,
  detectorSetHash: string,
  startedAt: number,
): Promise<AnalysisRetry> {
  try {
    const stmt = await db.prepare(RETRY_ANALYSIS_SQL);
    const res = await stmt.run(
      RETRY_TARGET_SCAN_STATE,
      startedAt,
      projectId,
      sha256,
      detectorSetHash,
      // SPREAD, never passed as one array: an array handed to a bind position
      // is silently ignored on this driver and produced rows with every column
      // NULL in Phase 0. Indexed rather than destructured because the arity is
      // asserted above and the compiler cannot see that assertion.
      RETRYABLE_SCAN_STATES[0],
      RETRYABLE_SCAN_STATES[1],
    );
    const row = await getAnalysis(db, projectId, sha256, detectorSetHash);
    return { ok: true, changes: res.changes, state: row?.scan_state };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}
