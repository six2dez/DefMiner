// packages/backend/src/store/analyses.ts — the corpus-version cache (CORE-08, STORE-04).
//
// One row per (project_id, sha256, detector_set_hash). THE CORPUS VERSION IS PART
// OF THE KEY AND NOT A COLUMN BESIDE IT, and that is the whole design: a corpus
// bump must invalidate exactly the analyses at the OLD value and nothing else. As
// a column it would be a field to remember to compare; as a key component the
// database enforces it and a stale-corpus cache hit is not expressible.
//
// Same write discipline as every other module here: one statement per mutation,
// prepared INSIDE the call, positional `?` spread into run(). No `RETURNING` (it
// needs SQLite 3.35 and buys nothing) and no `last_insert_rowid()` (unusable on
// this pooled connection — decision P4-D4, and the RESEARCH.md note it comes
// from).

import type { Database } from "sqlite";

import { describeError } from "../telemetry";

// Caught exceptions render through `describeError`, never a bare stringification.
// The reasoning — a driver rejection carries the bound parameters, and one of them
// is the observation URL — is stated once beside the first converted site in
// `artifacts.ts`. Enforced by `error-redaction.spec.ts`.

import type { StoreWriteResult } from "./artifacts";

/**
 * The Phase 1 detector-corpus sentinel.
 *
 * Phase 3 replaces this with a CONTENT HASH of the rule corpus, at which point a
 * corpus edit changes the value and every analysis at the old value stops being a
 * cache hit — which is the behaviour CORE-08 actually needs and the reason the
 * value is in the primary key.
 *
 * Phase 3 must be able to DISTINGUISH a Phase 1 row from a real hash, so this
 * value is deliberately not hash-shaped: a real corpus hash will be 64 lowercase
 * hex characters, and this is neither 64 characters nor hex. {@link isCorpusSentinel}
 * is the check, so the discrimination lives in one place rather than in whatever
 * Phase 3 happens to write.
 */
export const DETECTOR_CORPUS_VERSION = "phase1-no-corpus";

/** True for a Phase 1 sentinel, false for anything hash-shaped. Phase 3's
 *  migration decides what to do with the rows this returns true for. */
export function isCorpusSentinel(detectorSetHash: string): boolean {
  return !/^[0-9a-f]{64}$/.test(detectorSetHash);
}

/**
 * The closed `scan_state` vocabulary, enforced by a CHECK constraint in migration
 * step v2.
 *
 * `pending` is what makes this table double as the DURABLE JOB QUEUE that Phase
 * 2's ERR-02 recovery and CORE-09 both need, for the cost of one column: a
 * `pending` row that survives a plugin restart IS the record that work was
 * claimed and never finished. OBS-02 owns the degradation vocabulary in Phase 2 —
 * these values are picked now and must not be contradicted there.
 */
export const SCAN_STATES = [
  "pending",
  "running",
  "done",
  "partial",
  "failed",
] as const;
export type ScanState = (typeof SCAN_STATES)[number];

/**
 * States that mean "this digest has been through the detectors at this corpus
 * version; do not re-analyse it".
 *
 * `failed` is TERMINAL HERE, deliberately. Phase 1 has no retry policy and no
 * failure taxonomy — ERR-02 is Phase 2 — so treating `failed` as re-analysable
 * today would mean re-walking the same bytes on every sighting, for ever, with
 * nothing to break the loop. The row is still there, still says `failed`, and
 * still carries its `error`; Phase 2 decides which failures are worth retrying
 * and gets to make that decision with a taxonomy in hand.
 */
export const TERMINAL_SCAN_STATES: readonly ScanState[] = [
  "done",
  "partial",
  "failed",
];

/** One analysis row, as it is stored. */
export type AnalysisRow = {
  project_id: string;
  sha256: string;
  detector_set_hash: string;
  scan_state: ScanState;
  max_slice_ms: number | null;
  bytes_walked: number | null;
  started_at: number;
  finished_at: number | null;
  error: string | null;
};

/** `error` is a PLUGIN-generated diagnostic and never target bytes, but it is
 *  still bounded: an error string that quoted an unbounded value would defeat
 *  T-01-21 by the back door.
 *
 *  EXPORTED FOR ONE REASON ONLY (IN-11): so `telemetry.spec.ts` can assert
 *  `ERROR_TEXT_LIMIT <= ERROR_MAX` against THIS constant rather than against a
 *  copy of its value. A test that restated `300` would keep passing while the
 *  code that matters drifted. Nothing imports it at runtime. */
export const ERROR_MAX = 300;

// ONE statement. `DO NOTHING` rather than `DO UPDATE`, because a claim must not
// disturb a row that already exists — that row is either a finished analysis
// (a cache hit) or another claim in flight.
const CLAIM_ANALYSIS_SQL = `
INSERT INTO analyses (project_id, sha256, detector_set_hash, scan_state, started_at)
VALUES (?, ?, ?, 'pending', ?)
ON CONFLICT (project_id, sha256, detector_set_hash) DO NOTHING
`;

const GET_ANALYSIS_SQL = `
SELECT project_id, sha256, detector_set_hash, scan_state, max_slice_ms, bytes_walked,
       started_at, finished_at, error
FROM analyses
WHERE project_id = ? AND sha256 = ? AND detector_set_hash = ?
`;

/** The outcome of a claim attempt. */
export type AnalysisClaim =
  | {
      ok: true;
      /** True when THIS caller inserted the row and therefore owns the work. */
      claimed: boolean;
      /** The row's state as it now stands — `pending` for a fresh claim, and for a
       *  conflict whatever the incumbent is. `undefined` only if the row vanished
       *  between the insert and the read, which retention can legitimately cause. */
      state: ScanState | undefined;
    }
  | { ok: false; error: string };

/**
 * Claim the right to analyse this digest at this corpus version.
 *
 * INSERT-then-READ, and the read is not defensive padding: there is no
 * `RETURNING` on this driver and `last_insert_rowid()` is unusable on the pool, so
 * a write cannot tell you what it wrote. The read is the ONLY way to learn the
 * row's state.
 *
 * Ownership is decided by `started_at` matching the value this caller passed,
 * rather than by the insert's `changes` count. This is sound under the CURRENT
 * execution model: `startConsumer` maintains exactly one consumer and its drain
 * loop awaits one entry at a time, so two live callers cannot claim the same key
 * in the same millisecond. It is NOT a concurrency token. Any future parallel
 * consumer must add an explicit unique claim id (or prove statement-local
 * `changes`) before it may reuse this function concurrently.
 */
export async function claimAnalysis(
  db: Database,
  projectId: string,
  sha256: string,
  detectorSetHash: string,
  startedAt: number,
): Promise<AnalysisClaim> {
  try {
    const insert = await db.prepare(CLAIM_ANALYSIS_SQL);
    await insert.run(projectId, sha256, detectorSetHash, startedAt);
    const read = await db.prepare(GET_ANALYSIS_SQL);
    const row = await read.get<AnalysisRow>(projectId, sha256, detectorSetHash);
    return {
      ok: true,
      claimed: row !== undefined && Number(row.started_at) === startedAt,
      state: row?.scan_state,
    };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

// ONE statement, and the key is fully bound so it can only ever touch the row the
// caller claimed. `project_id` is in the predicate for the same reason it is in
// the key (T-01-20).
const FINISH_ANALYSIS_SQL = `
UPDATE analyses
SET scan_state = ?, finished_at = ?, max_slice_ms = ?, bytes_walked = ?, error = ?
WHERE project_id = ? AND sha256 = ? AND detector_set_hash = ?
`;

/**
 * Record the terminal state of an analysis this caller claimed.
 *
 * One statement, so there is nothing here that needs two writes to land together —
 * which matters because this driver has no transaction primitive at all and
 * `BEGIN` does not span `exec` calls while every statement still reports success.
 */
export async function finishAnalysis(
  db: Database,
  projectId: string,
  sha256: string,
  detectorSetHash: string,
  scanState: ScanState,
  finishedAt: number,
  maxSliceMs: number | null,
  bytesWalked: number | null,
  error: string | null,
): Promise<StoreWriteResult> {
  try {
    const stmt = await db.prepare(FINISH_ANALYSIS_SQL);
    const res = await stmt.run(
      scanState,
      finishedAt,
      maxSliceMs,
      bytesWalked,
      // THE ONE LINE IN THIS DIRECTORY THAT WRITES THE `analyses.error` COLUMN,
      // and the only error render in it that is NOT inside a catch. The binding
      // is a function PARAMETER, so a catch-scoped rule cannot reach it by
      // construction — which is why `error-redaction.spec.ts` carries a fourth
      // rule, `unredacted-persisted-error`, aimed at exactly this shape.
      //
      // `describeError` takes a string perfectly well: `typeof error` is not
      // `object`, so no class name is prepended, the redactions still run, and
      // the result is capped at `ERROR_TEXT_LIMIT` (240). That makes `ERROR_MAX`
      // (300) unreachable BY CONSTRUCTION — for every input, not merely "in
      // practice", which is what this comment used to say (IN-11). The two are
      // different kinds of claim: "in practice" is about what usually happens,
      // and this is about what CAN happen. The outer slice stays anyway, because
      // it documents the COLUMN's bound rather than the renderer's, and those
      // are two different guarantees.
      //
      // `migrations.ts:176-183` reached the OPPOSITE conclusion from the same
      // situation and DELETED its outer slice as a deliberate 300 -> 240
      // narrowing. The two files still differ on the slice and now AGREE on the
      // relationship, because `telemetry.spec.ts` asserts
      // `ERROR_TEXT_LIMIT <= ERROR_MAX` by name — which is the thing that makes
      // either choice safe when somebody moves a constant.
      error === null ? null : describeError(error).slice(0, ERROR_MAX),
      projectId,
      sha256,
      detectorSetHash,
    );
    return { ok: true, changes: res.changes };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

const IS_ANALYSED_SQL = `
SELECT scan_state FROM analyses
WHERE project_id = ? AND sha256 = ? AND detector_set_hash = ?
`;

/**
 * CORE-08's answer, in one indexed read on the primary key.
 *
 * True means: these exact bytes have already been through these exact detectors in
 * this project, so the sighting still updates `last_seen_at` and `seen_count` —
 * the same bytes appearing again is real information — but no new analysis row is
 * created and no re-walk is scheduled.
 */
export async function isAnalysed(
  db: Database,
  projectId: string,
  sha256: string,
  detectorSetHash: string,
): Promise<boolean> {
  const stmt = await db.prepare(IS_ANALYSED_SQL);
  const row = await stmt.get<{ scan_state: ScanState }>(
    projectId,
    sha256,
    detectorSetHash,
  );
  if (row === undefined) return false;
  return TERMINAL_SCAN_STATES.includes(row.scan_state);
}

/** The whole row, for callers that need more than the boolean. Reuses
 *  {@link GET_ANALYSIS_SQL} directly rather than aliasing it: every SQL string in
 *  this package is a plain literal, and an alias would be the first non-literal
 *  initializer for `sql-discipline.spec.ts` to have to reason about. */
export async function getAnalysis(
  db: Database,
  projectId: string,
  sha256: string,
  detectorSetHash: string,
): Promise<AnalysisRow | undefined> {
  const stmt = await db.prepare(GET_ANALYSIS_SQL);
  return stmt.get<AnalysisRow>(projectId, sha256, detectorSetHash);
}

const COUNT_ANALYSES_SQL = `SELECT COUNT(*) AS n FROM analyses WHERE project_id = ?`;

/** How many analyses this project holds. */
export async function countAnalyses(
  db: Database,
  projectId: string,
): Promise<number> {
  const stmt = await db.prepare(COUNT_ANALYSES_SQL);
  const row = await stmt.get<{ n: number }>(projectId);
  return Number(row?.n ?? 0);
}
