// packages/backend/src/store/audit.ts — the operator action record (STORE-08).
//
// WHAT THIS TABLE IS FOR. Seven operator actions are each either irreversible, a
// disclosure, or a silent change to what the operator is shown: a projected
// Finding is permanent, a raw export leaves the tool in cleartext, a revealed
// value cannot be unseen, and triage and suppression quietly change which rows
// the operator is ever offered again. This table is the only record that any of
// them happened. An audit log that omitted the disclosures would not be an audit
// log, which is why the vocabulary below is complete rather than a subset.
//
// APPEND-ONLY, AND ONE STATEMENT PER WRITE. There is no alternative on this
// driver: `BEGIN` does not span `exec` calls and every statement still returns
// SUCCESS, so code that LOOKS transactional passes every test and provides no
// atomicity whatsoever (Pitfall 2). No invariant here may require two statements
// to land together. The conflict clause is DO NOTHING rather than DO UPDATE
// because a replay must not rewrite history — overwriting an existing row is the
// one thing an audit log may never do.
//
// THE KEY IS NATURAL AND CALLER-GENERATED. `event_id`, never `id`:
// `last_insert_rowid()` is unusable on this pooled connection (decision P1-D1),
// so a surrogate id would be a row identity nothing can read back, and
// `schema.spec.ts`'s FORBIDDEN_COLUMNS bans the bare name package-wide. The
// caller mints the id, which makes the CALLER the owner of idempotency and makes
// a retry after an ambiguous failure a no-op instead of a duplicate.

import type { Database } from "sqlite";

import { describeError } from "../telemetry";

// Caught exceptions render through `describeError`, never a bare stringification.
// The reasoning — a driver rejection carries the bound parameters, and one of them
// is the observation URL — is stated once beside the first converted site in
// `artifacts.ts`. Enforced by `error-redaction.spec.ts`.

import type { StoreWriteResult } from "./artifacts";

/**
 * Every action worth a permanent record, as a closed vocabulary.
 *
 * A CHECK-constrained closed set in migration step v3 and an `as const` array
 * here, matching how `SCAN_STATES` was done, so the UI binds to SHIPPED values
 * rather than inventing synonyms. Nothing anywhere restates a member string; the
 * one unavoidable second copy is the SQL constraint, and `audit.spec.ts` reads
 * that constraint back out of `sqlite_master` and compares it to this array
 * member by member rather than trusting the two to stay in step.
 *
 * ALL SEVEN, THOUGH FOUR HAVE NO CALLER YET. `triage_set`,
 * `suppression_create`, `suppression_remove` and `finding_projected` are only
 * written by the deferred pass after Phase 4 (decision D-05(3) blocks the triage
 * key on Phase 4's entity identity). They are here anyway because the asymmetry
 * is not close: an unused member costs nothing at runtime, while a MISSING one
 * costs a second permanent step in a ladder whose entries can never be edited.
 * That trade was put to the operator at plan 05-06's `blocking-human` checkpoint
 * and approved as `option-a` on 2026-08-28.
 */
export const AUDIT_KINDS = [
  /** The operator set a triage state on an entity. Changes which rows they are
   *  offered next; silent unless it is recorded. */
  "triage_set",
  /** A suppression rule was created — the same, at a coarser grain. */
  "suppression_create",
  /** A suppression rule was removed, restoring rows to the operator's view. */
  "suppression_remove",
  /** A Finding was projected into Caido. IRREVERSIBLE: the projection is
   *  permanent and DefMiner cannot withdraw it. */
  "finding_projected",
  /** An unredacted export left the tool. A DISCLOSURE — the bytes are in
   *  cleartext outside DefMiner's control from this moment on. */
  "export_raw",
  /** A redacted export left the tool. Recorded beside the raw one so "what did I
   *  export" has a single complete answer rather than a partial one. */
  "export_redacted",
  /** A stored value was revealed in the UI. A DISCLOSURE that cannot be unseen. */
  "value_revealed",
] as const;

/** One member of {@link AUDIT_KINDS}. The database's CHECK constraint is the
 *  ENFORCEMENT; this type is only the warning, which is why `recordAudit`
 *  reports a constraint failure instead of assuming it cannot happen. */
export type AuditKind = (typeof AUDIT_KINDS)[number];

/**
 * Compile-time exhaustiveness over {@link AuditKind}.
 *
 * Its whole job is to STOP COMPILING when a member is added to `AUDIT_KINDS`
 * without a matching migration step: the new value has no arm, the parameter is
 * no longer assignable to `never`, and the build fails at the moment somebody
 * widens the vocabulary rather than at the moment the database refuses the write.
 *
 * @internal
 */
export function assertNoOtherAuditKind(kind: never): never {
  throw new Error(`unhandled audit kind: ${String(kind)}`);
}

/**
 * One audit row, as it is stored.
 *
 * @internal
 */
export type AuditRow = {
  project_id: string;
  event_id: string;
  at: number;
  kind: AuditKind;
  /** An entity key or a rule key — WHAT the event was about, never the value it
   *  was about. A fingerprint, a rule identifier, an export identifier. A raw
   *  extracted value here would defeat T-01-21 by the back door, in the one
   *  table designed to hold none. */
  subject: string;
  /** A DefMiner-authored reason code plus counts, redacted and bounded. Never a
   *  raw value, never a URL. */
  detail: string | null;
};

// Positional `?` ONLY, and no `RETURNING`: neither named parameters nor
// `RETURNING` work on this driver, and both are reported by
// `sql-discipline.spec.ts`. `exec()` accepts no bind values at all, so binding
// requires prepare() then Statement.run(...params) with the parameters SPREAD.
const RECORD_AUDIT_SQL = `
INSERT INTO audit (project_id, event_id, at, kind, subject, detail)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT (project_id, event_id) DO NOTHING
`;

/**
 * Record that an irreversible or disclosing action happened.
 *
 * Returns `{ ok: true, changes: 0 }` for a replay — the row already exists and
 * was deliberately not touched. A caller distinguishing "written" from "already
 * recorded" reads `changes`; a caller that only needs the record to EXIST can
 * ignore it, which is the common case and the reason a replay is not an error.
 *
 * `eventId` is a PARAMETER rather than generated in here. Two reasons, and the
 * second is the load-bearing one: the caller owns idempotency, so a retry after
 * an ambiguous failure re-presents the same id and lands as a no-op; and the
 * function is testable without stubbing a random source. Call sites mint it from
 * the runtime's UUID function, which Phase 0 measured present in Caido's crypto
 * module export set, so it adds nothing the bundle-import gate must re-approve.
 *
 * `detail` PASSES THROUGH THE SAME REDACTION EVERY BOUNDARY CROSSING USES,
 * BEFORE BINDING (T-05-27). `describeError` redacts URLs and sensitive tokens
 * and then truncates to `ERROR_TEXT_LIMIT`, in that order — redact before
 * truncate, so a URL cut in half by the bound cannot survive as a fragment. A
 * caller that pastes a URL into `detail` is a mistake this writer absorbs rather
 * than one a reviewer is expected to catch, and the unredacted form never
 * reaches the database at all.
 *
 * The statement is prepared INSIDE the write, never at module scope:
 * `sdk.meta.db()` is a pool over worker threads, so two `run()` calls on a shared
 * Statement could land on different connections with interleaved bindings.
 */
export async function recordAudit(
  db: Database,
  projectId: string,
  kind: AuditKind,
  subject: string,
  detail: string | null,
  nowMs: number,
  eventId: string,
): Promise<StoreWriteResult> {
  try {
    // `null` stays `null` — a NULL detail is "nothing to say", which is
    // distinguishable from the string "null" that a bare render would produce.
    const safeDetail = detail === null ? null : describeError(detail);
    const stmt = await db.prepare(RECORD_AUDIT_SQL);
    const res = await stmt.run(
      projectId,
      eventId,
      nowMs,
      kind,
      subject,
      safeDetail,
    );
    return { ok: true, changes: res.changes };
  } catch (e) {
    return { ok: false, error: describeError(e) };
  }
}

/**
 * Default page size for {@link listAudit}.
 *
 * Same reasoning as `ARTIFACT_LIST_DEFAULT_LIMIT`: a read with NO limit is a read
 * whose cost is set by the target rather than by us, and this database is never
 * garbage-collected by Caido and survives a force-reinstall, so "how many rows
 * are there" has no upper bound the plugin controls. 500 is well above any UI
 * page and well below anything that would stall the single thread marshalling it
 * across the RPC boundary.
 *
 * NOT tagged `@internal`, unlike its sibling in `artifacts.ts`, and the
 * difference is real rather than an oversight: `audit.spec.ts` asserts the
 * default page size against THIS constant rather than against a copy of its
 * value, the same reason `ERROR_MAX` is exported (IN-11). A test that restated
 * `500` would keep passing while the code that matters drifted. `knip` reports
 * the tag as unused precisely because the export already has a consumer. */
export const AUDIT_LIST_DEFAULT_LIMIT = 500;

const LIST_AUDIT_SQL = `
SELECT project_id, event_id, at, kind, subject, detail
FROM audit
WHERE project_id = ?
ORDER BY at DESC, event_id DESC
LIMIT ?
`;

/**
 * This project's audit events, newest first.
 *
 * THE SECONDARY SORT KEY IS THE POINT, for the same reason `listArtifacts` has
 * one: `at` alone is not a total order — two events recorded in the same
 * millisecond tie, and SQLite is then free to return them in whatever order the
 * scan produced, which can differ between two runs and between a database and a
 * re-created copy of it. `event_id DESC` breaks every tie deterministically, so a
 * caller may compare two result sequences for equality and have that mean
 * something. Both keys run DESC, matching `idx_audit_at`'s leading column and
 * leaving a future keyset cursor a uniform direction to work with.
 *
 * The limit is ALWAYS bound and never absent. A zero, negative or non-finite
 * limit falls back to the default rather than being passed through: a stored or
 * RPC-supplied bound is a value some future UI wrote, and `Number("")` is 0 —
 * which SQLite would honour as "no rows", silently showing the operator an empty
 * audit log. This is the same guard `boundOrDefault` applies to the retention
 * bounds, for the same reason.
 */
export async function listAudit(
  db: Database,
  projectId: string,
  limit: number = AUDIT_LIST_DEFAULT_LIMIT,
): Promise<AuditRow[]> {
  const bounded =
    Number.isFinite(limit) && limit > 0
      ? Math.floor(limit)
      : AUDIT_LIST_DEFAULT_LIMIT;
  const stmt = await db.prepare(LIST_AUDIT_SQL);
  return stmt.all<AuditRow>(projectId, bounded);
}
