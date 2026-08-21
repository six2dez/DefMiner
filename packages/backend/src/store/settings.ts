// packages/backend/src/store/settings.ts — key/value configuration, project-scoped.
//
// THE EMPTY PROJECT ID IS RESERVED HERE AND ONLY HERE. `project_id = ''` means
// GLOBAL: applies to every project. On every other table an empty `project_id` is
// a project-scoping bug that writes a row no read will ever return, which is why
// migration step v2's CHECK constraints and triggers reject it there and why this
// table has no such constraint.
//
// Resolution order for a read is project row, then global row, then the documented
// default in this file. Three levels rather than two because Phase 5 will want an
// operator-wide default that a single project can override, and retrofitting that
// through a two-level lookup would mean changing every call site.

import type { Database } from "sqlite";

import { describeError } from "../telemetry";

// Caught exceptions render through `describeError`, never a bare stringification.
// The reasoning — a driver rejection carries the bound parameters, and one of them
// is the observation URL — is stated once beside the first converted site in
// `artifacts.ts`. Enforced by `error-redaction.spec.ts`.

import type { StoreWriteResult } from "./artifacts";

/** The reserved `project_id` for a setting that applies to every project. */
export const GLOBAL_PROJECT_ID = "";

// One statement, idempotent on the natural key (project_id, key) — the same write
// shape as every other mutation in this package, for the same reason: this driver
// has no transaction primitive, so no invariant may require two statements.
const PUT_SETTING_SQL = `
INSERT INTO settings (project_id, key, value, updated_at)
VALUES (?, ?, ?, ?)
ON CONFLICT (project_id, key) DO UPDATE SET
  value      = excluded.value,
  updated_at = excluded.updated_at
`;

/** Write (or overwrite) one setting. */
export async function putSetting(
  db: Database,
  projectId: string,
  key: string,
  value: string,
  nowMs: number,
): Promise<StoreWriteResult> {
  try {
    const stmt = await db.prepare(PUT_SETTING_SQL);
    const res = await stmt.run(projectId, key, value, nowMs);
    return { ok: true, changes: res.changes };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

const GET_SETTING_SQL = `SELECT value FROM settings WHERE project_id = ? AND key = ?`;

/** Read one setting for exactly one scope. Returns `null` when absent, which is
 *  distinguishable from an empty stored value — `settings.value` is NOT NULL, so
 *  `""` is a value somebody wrote and `null` is a row that does not exist. */
export async function getSetting(
  db: Database,
  projectId: string,
  key: string,
): Promise<string | null> {
  const stmt = await db.prepare(GET_SETTING_SQL);
  const row = await stmt.get<{ value: string }>(projectId, key);
  return row === undefined ? null : String(row.value);
}

/** Project row, else global row, else `null`. Two single-key reads rather than one
 *  `IN (?, ?)` with an ordering trick: two obvious statements beat one clever one
 *  in a module whose whole discipline is that a reader can see what binds where. */
export async function resolveSetting(
  db: Database,
  projectId: string,
  key: string,
): Promise<string | null> {
  const scoped = await getSetting(db, projectId, key);
  if (scoped !== null) return scoped;
  return getSetting(db, GLOBAL_PROJECT_ID, key);
}

// --- retention bounds -------------------------------------------------------

/** The two settings keys `sweepRetention` reads. Named constants so a typo is a
 *  compile-time problem rather than a silently-defaulted bound. */
export const RETENTION_MAX_ROWS_KEY = "retention.max_rows_per_table";
export const RETENTION_MAX_AGE_MS_KEY = "retention.max_age_ms";

/**
 * Maximum rows per table per project.
 *
 * DELIBERATELY CONSERVATIVE. There is no UI to change this until Phase 5
 * (decision P1-D5), so a default that deletes aggressively would silently destroy
 * the operator's history with no way to opt out. 50,000 artifacts is far more than
 * a real engagement produces and still bounds the file: at the observed row shape
 * (a digest, a byte count, three integers) that is single-digit megabytes.
 */
export const DEFAULT_RETENTION_MAX_ROWS = 50_000;

/**
 * Maximum row age, in milliseconds.
 *
 * 90 days. Same reasoning: retention is the ONLY bound on this database's growth —
 * Caido never garbage-collects it, does not delete it when a project is deleted,
 * and it survives a force-reinstall (DB_SURVIVES_REINSTALL) — but Phase 1 has no
 * way for the operator to say "keep more", so the default errs long.
 */
export const DEFAULT_RETENTION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

/** What {@link sweepRetention} takes. Produced here so the bounds and their
 *  defaults have one owner. */
export type RetentionBounds = {
  /** Maximum rows per table per project. */
  maxRows: number;
  /** Maximum row age in milliseconds, measured against the sweep's `nowMs`. */
  maxAgeMs: number;
};

/** A finite positive integer, or the default. A stored bound is a STRING that some
 *  future UI wrote; `Number("")` is 0 and `Number("abc")` is NaN, and either one
 *  silently applied as a retention bound would delete everything. */
function boundOrDefault(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

/**
 * The retention bounds in force for this project.
 *
 * BOTH bounds always apply and whichever binds first wins — a project under the
 * row cap can still hold rows past the age cap, and a project inside the age
 * window can still hold too many rows.
 */
export async function getRetentionBounds(
  db: Database,
  projectId: string,
): Promise<RetentionBounds> {
  const [rows, age] = [
    await resolveSetting(db, projectId, RETENTION_MAX_ROWS_KEY),
    await resolveSetting(db, projectId, RETENTION_MAX_AGE_MS_KEY),
  ];
  return {
    maxRows: boundOrDefault(rows, DEFAULT_RETENTION_MAX_ROWS),
    maxAgeMs: boundOrDefault(age, DEFAULT_RETENTION_MAX_AGE_MS),
  };
}
