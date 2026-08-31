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

import type {
  BoundRejection,
  OperatorSettingKey,
  SettingsGroup,
} from "@defminer/engine/contract";
import {
  AUDIT_RETENTION_MAX_ROWS_KEY,
  RETENTION_MAX_AGE_MS_KEY,
  RETENTION_MAX_ROWS_KEY,
  STORAGE_BOOT_COUNT_KEY,
  STORAGE_INSTALL_ID_KEY,
  STORAGE_OBSERVED_LOSS_KEY,
} from "@defminer/engine/contract";
import type { Database } from "sqlite";

import { describeError } from "../telemetry";

import { countAnalyses } from "./analyses";
import { countArtifacts } from "./artifacts";
import type { StoreWriteResult } from "./artifacts";
import { countObservations } from "./observations";

// Caught exceptions render through `describeError`, never a bare stringification.
// The reasoning — a driver rejection carries the bound parameters, and one of them
// is the observation URL — is stated once beside the first converted site in
// `artifacts.ts`. Enforced by `error-redaction.spec.ts`.

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
 * `""` is a value somebody wrote and `null` is a row that does not exist.
 *
 * @internal
 */
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
 * in a module whose whole discipline is that a reader can see what binds where.
 *
 * @internal
 */
export async function resolveSetting(
  db: Database,
  projectId: string,
  key: string,
): Promise<string | null> {
  const scoped = await getSetting(db, projectId, key);
  if (scoped !== null) return scoped;
  return getSetting(db, GLOBAL_PROJECT_ID, key);
}

const CLEAR_SETTING_SQL = `DELETE FROM settings WHERE project_id = ? AND key = ?`;

/**
 * Remove one setting at exactly one scope.
 *
 * WHY DELETE AND NOT "WRITE THE DEFAULT". Clearing a project override must fall
 * the resolution back to the GLOBAL row, and writing the documented default over
 * it would pin the value instead — the operator would see the number they
 * expected and quietly stop tracking the operator-wide default they meant to
 * return to. Absence is the state; a value that happens to equal the default is
 * a different one.
 *
 * `project_id`-SCOPED like every other statement in this package, so clearing an
 * override cannot reach the global row it falls back to. A key with no row at
 * this scope reports `ok` with zero changes: the caller asked for absence and
 * absence is what is there.
 */
export async function clearSetting(
  db: Database,
  projectId: string,
  key: string,
): Promise<StoreWriteResult> {
  try {
    const stmt = await db.prepare(CLEAR_SETTING_SQL);
    const res = await stmt.run(projectId, key);
    return { ok: true, changes: res.changes };
  } catch (e) {
    return { ok: false, error: describeError(e).slice(0, 200) };
  }
}

// --- retention bounds -------------------------------------------------------

// THE THREE KEY LITERALS MOVED TO @defminer/engine/contract IN PLAN 05-12, and
// they are IMPORTED here rather than re-exported: one canonical home, and every
// consumer — this module, the sweep's specs, and the frontend's copy map —
// reaches for the same declaration. They moved for one reason: the settings
// SURFACE needs them as values too, the frontend cannot import this package, and
// a key spelled twice is a setting the operator changes and the sweep never sees
// — with nothing anywhere reporting it, because an unresolved key is
// indistinguishable from an unset one by construction. The engine contract
// states the rest of the reasoning, including why there is deliberately no audit
// AGE key beside the audit row key (decision D-06).

/**
 * Maximum rows per table per project.
 *
 * DELIBERATELY CONSERVATIVE. There is no UI to change this until Phase 5
 * (decision P1-D5), so a default that deletes aggressively would silently destroy
 * the operator's history with no way to opt out. 50,000 artifacts is far more than
 * a real engagement produces and still bounds the file: at the observed row shape
 * (a digest, a byte count, three integers) that is single-digit megabytes.
 *
 * THE UI EXISTS AS OF PLAN 05-12 and this number is now a DEFAULT rather than a
 * ceiling — {@link KNOWN_SETTINGS} lists this key, `SettingsPanel.vue` renders it
 * at both scopes, and the paragraph above is the help text it carries. The value
 * is unchanged: an operator who has not chosen still gets the conservative number,
 * which is the whole reason it was picked conservatively.
 */
export const DEFAULT_RETENTION_MAX_ROWS = 50_000;

/**
 * Maximum row age, in milliseconds.
 *
 * 90 days. Same reasoning: retention is the ONLY bound on this database's growth —
 * Caido never garbage-collects it, does not delete it when a project is deleted,
 * and it survives a force-reinstall (DB_SURVIVES_REINSTALL) — but Phase 1 has no
 * way for the operator to say "keep more", so the default errs long.
 *
 * PLAN 05-12 GIVES THEM THAT WAY. The three facts in the paragraph above are
 * exactly what an operator needs before raising or lowering this, so they are the
 * help text `SettingsPanel.vue` renders beside the field rather than a summary of
 * it. The default is unchanged.
 */
export const DEFAULT_RETENTION_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Maximum audit rows per project — the audit table's ONLY bound.
 *
 * DERIVED, NOT PICKED. The arithmetic, so a reader can check it rather than
 * take it:
 *
 *   - the per-table default is {@link DEFAULT_RETENTION_MAX_ROWS} = 50,000;
 *   - a generous engagement produces on the order of 1,000 audit events — say
 *     500 triage decisions, ~150 projections, ~200 reveals, ~100 suppression
 *     changes and a few dozen exports. These are OPERATOR actions, one human
 *     click each, so unlike every other table in this schema the row rate is not
 *     something the TARGET can drive;
 *   - 50,000 x 4 = 200,000, which is 200 engagements of history.
 *
 * WHY FOUR TIMES AND NOT ONE. Every other table is bounded by rows OR age,
 * whichever binds first, and in practice the 90-day age bound is what reclaims.
 * D-06 removes the age bound here, so the row bound must carry ALONE the horizon
 * those two carry jointly elsewhere — which is the entire reason the number is
 * raised rather than shared.
 *
 * AND IT IS STILL BOUNDED, which is the property that makes "no age bound"
 * survivable on a database Caido never garbage-collects. A worst-case row is a
 * 36-character UUID, an integer, a short enum, a key and a `detail` capped at
 * `ERROR_TEXT_LIMIT` (240) — about 350 bytes, so 200,000 rows is roughly 70 MB
 * at the ceiling. The realistic row carries a null or short `detail` and runs
 * nearer 120 bytes, so roughly 24 MB. Both numbers are stated because the
 * ceiling is the one that has to be acceptable.
 */
export const DEFAULT_AUDIT_RETENTION_MAX_ROWS = DEFAULT_RETENTION_MAX_ROWS * 4;

/** What {@link sweepRetention} takes. Produced here so the bounds and their
 *  defaults have one owner. */
export type RetentionBounds = {
  /** Maximum rows per table per project. Does NOT apply to `audit`, which has
   *  its own raised bound below. */
  maxRows: number;
  /** Maximum row age in milliseconds, measured against the sweep's `nowMs`.
   *  Applies to every table EXCEPT `audit` (decision D-06). */
  maxAgeMs: number;
  /** Maximum audit rows per project. The audit table's only bound — there is no
   *  audit age bound, deliberately. */
  auditMaxRows: number;
};

/**
 * What {@link validateBound} answers. A finite positive integer, or WHY NOT.
 *
 * The reason is a member of the shared closed vocabulary, never a message: the
 * settings surface maps it to its own copy, and a driver's or a coercion's own
 * words crossing this boundary would be words somebody eventually interpolates
 * into a sentence the operator reads.
 *
 * @internal
 */
export type BoundValidation =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: BoundRejection };

/**
 * Is this string a usable retention bound?
 *
 * ONE PREDICATE, TWO CALLERS, AND THAT IS THE POINT. {@link boundOrDefault}
 * below reads DEFENSIVELY — it applies the documented default to anything this
 * refuses — and {@link putBoundedSetting} validates at the WRITE EDGE so a
 * refusal is reported to the operator instead of silently becoming a default
 * they did not ask for. Two implementations of "usable" would eventually
 * disagree, and the direction they would disagree in is the one where a value
 * the form accepted is a value the sweep ignores.
 *
 * WHY THE WRITE EDGE VALIDATES AT ALL, WHEN THE READ ALREADY GUARDS. The guard's
 * own comment names its reason: a stored bound is a string some future interface
 * wrote, and `Number("")` is 0 and `Number("abc")` is NaN — either one silently
 * applied as a retention bound would delete everything. THIS IS THAT FUTURE
 * INTERFACE. A backstop that turns a typo into "saved, and quietly ignored" is a
 * backstop doing the operator no favours.
 *
 * ZERO AND NEGATIVE ARE REPORTED SEPARATELY. "0" is what somebody types when
 * they mean "no limit", which is the single most dangerous thing they can mean
 * about a bound on a database nothing else garbage-collects; "-1" is a typo. The
 * copy for the two cannot be the same sentence.
 */
export function validateBound(raw: string): BoundValidation {
  if (raw.trim() === "") return { ok: false, reason: "empty" };
  const n = Number(raw);
  if (Number.isNaN(n)) return { ok: false, reason: "not-numeric" };
  if (!Number.isFinite(n)) return { ok: false, reason: "not-finite" };
  if (n === 0) return { ok: false, reason: "zero" };
  if (n < 0) return { ok: false, reason: "negative" };
  // FLOORED, not rounded and not rejected. This is the shipped behaviour and is
  // deliberately not changed here: a bound is a row count or a millisecond
  // count, and flooring a fraction can only ever make the bound tighter, which
  // is the safe direction for a value that governs deletion.
  return { ok: true, value: Math.floor(n) };
}

/** A finite positive integer, or the default. A stored bound is a STRING that some
 *  future UI wrote; `Number("")` is 0 and `Number("abc")` is NaN, and either one
 *  silently applied as a retention bound would delete everything.
 *
 *  DELEGATES TO {@link validateBound} rather than restating the test, so the
 *  write edge and this defensive read cannot drift into disagreeing about what a
 *  usable bound is. `settings.spec.ts` asserts the equivalence directly: every
 *  input the edge rejects is an input this falls back on. */
function boundOrDefault(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const checked = validateBound(raw);
  return checked.ok ? checked.value : fallback;
}

/**
 * The retention bounds in force for this project.
 *
 * The row and age bounds always BOTH apply and whichever binds first wins — a
 * project under the row cap can still hold rows past the age cap, and a project
 * inside the age window can still hold too many rows.
 *
 * `auditMaxRows` is the exception and is the third bound rather than a variant of
 * the first: the audit table is bounded by rows ALONE (decision D-06). See
 * `retention.ts`, where the absence of an audit age bound is a stated exception
 * rather than an omission.
 */
export async function getRetentionBounds(
  db: Database,
  projectId: string,
): Promise<RetentionBounds> {
  const [rows, age, auditRows] = [
    await resolveSetting(db, projectId, RETENTION_MAX_ROWS_KEY),
    await resolveSetting(db, projectId, RETENTION_MAX_AGE_MS_KEY),
    await resolveSetting(db, projectId, AUDIT_RETENTION_MAX_ROWS_KEY),
  ];
  return {
    maxRows: boundOrDefault(rows, DEFAULT_RETENTION_MAX_ROWS),
    maxAgeMs: boundOrDefault(age, DEFAULT_RETENTION_MAX_AGE_MS),
    // Through the SAME guard as the other two, and for the same reason stated
    // there: a stored bound is a string some future UI wrote, and an unguarded
    // `Number("")` of 0 applied as the audit cap would delete the whole audit
    // log on the next sweep — the one table whose loss cannot be reconstructed
    // from the traffic, because nothing else records that the action happened.
    auditMaxRows: boundOrDefault(auditRows, DEFAULT_AUDIT_RETENTION_MAX_ROWS),
  };
}

// --- UI-08's operator-facing surface ----------------------------------------
//
// WHAT THIS HALF IS FOR. Everything above is read by the sweep. Everything below
// is read by a person. The two shipped debts this file recorded — the three-level
// resolution written "because Phase 5 will want an operator-wide default that a
// single project can override", and each retention default's note that "there is
// no UI to change this until Phase 5" — are discharged here, and neither one
// required a call site to change, which was the point of writing the resolution
// three-deep in the first place.

/**
 * One settings key this build ACTUALLY HAS, with the group it belongs to and the
 * documented default it falls back to.
 *
 * `documented` IS A STRING, not the number. All three levels a reader compares
 * are then the same kind of thing — a stored row's value is a string, so a
 * default rendered as a number would be the one level that looked different for
 * a reason that is an implementation detail of where it lives.
 */
export type KnownSetting = {
  /**
   * OPERATOR keys only, and the TYPE is what enforces it.
   *
   * The closed vocabulary holds a second kind of key as of plan 06-08 —
   * internal durable state this plugin writes to observe whether its own
   * database survives a restart (O-02, D-19). This list is what the Settings
   * panel renders, so an internal marker landing here would be a field the
   * operator can edit and nothing sensibly reads. Narrowing the type makes that
   * a typecheck failure rather than a rule somebody has to remember (T-06-41).
   */
  readonly key: OperatorSettingKey;
  readonly group: SettingsGroup;
  readonly documented: string;
};

/**
 * Every key the settings surface may render. FROZEN, and short on purpose.
 *
 * A PHASE THAT ADDS A TOGGLE ADDS ITS KEY HERE — and to `SETTING_KEYS` in the
 * engine contract, which is what makes the frontend's copy map fail to typecheck
 * until the new field has a label. That is the whole growth mechanism: this
 * surface grows by ADDITION, not by anybody guessing what a later phase will
 * want and rendering an empty box for it (05-UI-SPEC.md, `empty / settings-form`).
 *
 * ORDER IS DECLARATION ORDER and is never sorted at runtime.
 */
export const KNOWN_SETTINGS: readonly KnownSetting[] = Object.freeze([
  {
    key: RETENTION_MAX_ROWS_KEY,
    group: "retention",
    documented: String(DEFAULT_RETENTION_MAX_ROWS),
  },
  {
    key: RETENTION_MAX_AGE_MS_KEY,
    group: "retention",
    documented: String(DEFAULT_RETENTION_MAX_AGE_MS),
  },
  {
    key: AUDIT_RETENTION_MAX_ROWS_KEY,
    group: "retention",
    documented: String(DEFAULT_AUDIT_RETENTION_MAX_ROWS),
  },
] as const);

/**
 * One key with all THREE levels of its resolution reported separately.
 *
 * THREE FIELDS AND NOT ONE RESOLVED VALUE, because a three-level resolution the
 * operator cannot see is a three-level resolution they will misconfigure. They
 * need to know not just what is in force but WHERE it came from, so that
 * "clearing this override falls back to 50,000" is a statement the interface can
 * make rather than one they have to infer.
 *
 * `null` MEANS NO ROW. An empty string means a row holding an empty string, which
 * `settings.value`'s NOT NULL makes a value somebody wrote — and it is precisely
 * the value the write guard refuses, so it can only have arrived from before this
 * surface existed. Collapsing the two would make it unfindable and unclearable.
 */
export type KnownSettingValue = KnownSetting & {
  readonly project: string | null;
  readonly global: string | null;
};

/**
 * Every known key, with its project row, its global row and its documented
 * default.
 *
 * TWO SINGLE-KEY READS PER KEY, through the shipped {@link getSetting}, rather
 * than one multi-row statement over the table. Three reasons, in order of how
 * much they matter: the shipped reads are already inside the SQL discipline gate
 * and a new multi-row statement would have to earn its own scoping proof; the key
 * count is fixed and tiny, so the cost is bounded by the vocabulary rather than
 * by the data; and a statement that returned "whatever is in the table" would
 * report keys this build does not have, which is the opposite of what this list
 * is for.
 */
export async function listKnownSettings(
  db: Database,
  projectId: string,
): Promise<readonly KnownSettingValue[]> {
  const out: KnownSettingValue[] = [];
  for (const setting of KNOWN_SETTINGS) {
    out.push({
      ...setting,
      project: await getSetting(db, projectId, setting.key),
      global: await getSetting(db, GLOBAL_PROJECT_ID, setting.key),
    });
  }
  return out;
}

/**
 * What a bounded write answers with. NEVER a rejection and never a message.
 *
 * `stored` IS THE VALUE THAT ACTUALLY LANDED, which is not always the value the
 * caller sent: a fractional input is floored. Returning it means the form can
 * show what was stored rather than what was typed, and the two differing is
 * information the operator is entitled to.
 */
export type BoundedSettingOutcome =
  | { readonly ok: true; readonly stored: string }
  | { readonly ok: false; readonly reason: BoundRejection };

/**
 * Write one retention bound, VALIDATED BEFORE IT IS STORED.
 *
 * The write the settings surface uses, and the reason it exists beside the
 * unvalidated {@link putSetting}: `putSetting` is the general key/value write and
 * has no business knowing that some values govern deletion. This one does.
 *
 * A REJECTION STORES NOTHING AND CHANGES NOTHING. A previously stored good value
 * survives a later typo, which is the property the form's error path depends on —
 * the operator keeps their edits in the field and their configuration on disk,
 * and neither is a casualty of the other.
 *
 * The `nowMs` a caller passes becomes `updated_at`, so writing the same value
 * twice is an upsert that touches the timestamp and leaves one row.
 */
export async function putBoundedSetting(
  db: Database,
  projectId: string,
  key: OperatorSettingKey,
  raw: string,
  nowMs: number,
): Promise<BoundedSettingOutcome> {
  const checked = validateBound(raw);
  if (!checked.ok) return { ok: false, reason: checked.reason };
  const stored = String(checked.value);
  const written = await putSetting(db, projectId, key, stored, nowMs);
  if (!written.ok) {
    // THE DRIVER'S DESCRIPTION IS DISCARDED, DELIBERATELY. It is already
    // redacted by `describeError`, and it still does not cross this boundary: the
    // settings surface's copy is DefMiner-authored, and a message that reached it
    // is a message somebody eventually interpolates into a sentence.
    return { ok: false, reason: "write-failed" };
  }
  return { ok: true, stored };
}

// --- O-02's BOOT MARKER — OBSERVED PERSISTENCE, NEVER PREDICTED -------------
//
// THE QUESTION D-19 ASKS AND WHY NOTHING ELSE CAN ANSWER IT. The Settings
// surface owes the operator a statement about whether this deployment keeps
// their findings across a restart. Research O-02 read the complete backend SDK
// member list this session and found a version string and two server path
// strings and no durability signal of any kind; `os` has no `hostname()`;
// `process` does not load; and `/.dockerenv` is unreachable under D-18 by
// construction and would only distinguish container-from-not, never
// volume-from-no-volume. A persistence CLAIM would therefore be a prediction,
// and it would be false on exactly the deployment shape the DEPLOY-01 matrix
// tests: Docker without a volume.
//
// SO NOTHING PREDICTS. This marker OBSERVES.

/**
 * The install id this PROCESS has already seen in the database it is talking to.
 *
 * PROCESS-SCOPED MEMORY, AND IT IS THE WHOLE EVIDENCE MECHANISM. The marker is
 * what disappears when the database is thrown away, so the database cannot
 * remember that it forgot — the memory of having written one has to live
 * somewhere the wipe does not reach. That is here.
 *
 * A test seam resets it, named like the other four in this package
 * (`resetLifecycleForTest`, `resetConsumerForTest`, `resetPassiveForTest`,
 * `resetDbHandleForTest`): module state is process-global, and a case that could
 * not clear it would be a case that passes or fails on what ran before it.
 */
let seenInstallId: string | null = null;

/** Forget that this process ever saw a marker. TESTS ONLY — a production reset
 *  would be a production way to erase the evidence. */
export function resetBootMarkerForTest(): void {
  seenInstallId = null;
}

/** What one boot found, and what it left behind.
 *
 *  NOT EXPORTED. {@link recordBoot} is the only producer and `index.ts` reads
 *  the result inline, so an export would have no cross-module consumer — and
 *  knip runs with `ignoreExportsUsedInFile: false`, where an export nothing
 *  imports is a build failure rather than dead code. */
type BootMarker = {
  /** The id identifying this install of the database. */
  readonly installId: string;
  /** How many boots this install has seen, this one included. */
  readonly bootCount: number;
  /** Has a boot ever found this process's own marker gone? */
  readonly observedLoss: boolean;
};

/**
 * Record this boot, and report whether a restart has EVER been observed to lose
 * this database.
 *
 * THE RULE, STATED ONCE AND EXACTLY:
 *
 *   An observed loss is a boot that finds NO install id in a database THIS
 *   PROCESS has already written or read one from.
 *
 * WHY IT CANNOT FIRE ON A GENUINE FIRST INSTALL. {@link seenInstallId} is `null`
 * until this process has read or written a marker. A first install reaches the
 * absent-marker branch with `seenInstallId === null`, which is the no-evidence
 * arm: a fresh marker is written and no loss is recorded. The loss arm is
 * reachable ONLY after this same process has already held a marker in its hand,
 * which a first install by definition has not. That is the one false positive
 * that would make the sentence untrustworthy, and it is unreachable rather than
 * merely unlikely.
 *
 * WHY A BOOT COUNT GOING BACKWARDS IS NOT THE CONDITION. It cannot be: the count
 * lives in the same row set that disappears, so a wiped database reports no
 * count at all rather than a lower one. Absence is the only signal a wipe leaves.
 *
 * WHAT THIS DELIBERATELY DOES NOT CLAIM. A restart that this process did not
 * live through — the ordinary case, since a Caido restart is a new process —
 * leaves no evidence, and none is invented. The honest reading of a clear flag
 * is "nothing has been observed", never "your data is safe", and the copy this
 * feeds says nothing in the clear case at all.
 *
 * `mintedId` IS THE CALLER'S TO MINT, for the reason `audit.ts` states about its
 * own event id: this module must not import `crypto`, whose specifier set the
 * bundle gate polices. It is IGNORED when a marker already exists.
 *
 * THREE SINGLE-STATEMENT WRITES, NOT A TRANSACTION. This driver has no
 * transaction primitive, so no invariant here may require two statements to hold
 * — and none does: a boot interrupted between the id write and the count write
 * leaves an id with a stale count, which the next boot corrects by incrementing
 * whatever it finds.
 */
export async function recordBoot(
  db: Database,
  mintedId: string,
  nowMs: number,
): Promise<BootMarker> {
  const storedId = await getSetting(
    db,
    GLOBAL_PROJECT_ID,
    STORAGE_INSTALL_ID_KEY,
  );
  const storedLoss =
    (await getSetting(db, GLOBAL_PROJECT_ID, STORAGE_OBSERVED_LOSS_KEY)) ===
    "1";

  if (storedId !== null) {
    // A CONTINUING DATABASE. Increment whatever count is there — a missing or
    // unparseable count is treated as zero rather than as a reason to fail,
    // because the count is a diagnostic and the id is the identity.
    const rawCount = await getSetting(
      db,
      GLOBAL_PROJECT_ID,
      STORAGE_BOOT_COUNT_KEY,
    );
    const prior = Number(rawCount);
    const bootCount =
      Number.isFinite(prior) && prior > 0 ? Math.floor(prior) + 1 : 1;
    await putSetting(
      db,
      GLOBAL_PROJECT_ID,
      STORAGE_BOOT_COUNT_KEY,
      String(bootCount),
      nowMs,
    );
    seenInstallId = storedId;
    return { installId: storedId, bootCount, observedLoss: storedLoss };
  }

  // NO MARKER. Either a first install, or a database that lost one.
  const observedLoss = seenInstallId !== null;

  await putSetting(
    db,
    GLOBAL_PROJECT_ID,
    STORAGE_INSTALL_ID_KEY,
    mintedId,
    nowMs,
  );
  await putSetting(db, GLOBAL_PROJECT_ID, STORAGE_BOOT_COUNT_KEY, "1", nowMs);
  if (observedLoss) {
    // WRITTEN, SO THE OBSERVATION OUTLIVES THE PROCESS THAT MADE IT — for
    // exactly as long as the database does, which is the honest horizon. On a
    // deployment that keeps nothing, this row goes with the next wipe and the
    // surface falls silent again rather than repeating a claim it can no longer
    // support.
    await putSetting(
      db,
      GLOBAL_PROJECT_ID,
      STORAGE_OBSERVED_LOSS_KEY,
      "1",
      nowMs,
    );
  }
  seenInstallId = mintedId;
  return { installId: mintedId, bootCount: 1, observedLoss };
}

// --- D-25's FOOTPRINT — ROW COUNTS AGAINST THEIR CAPS -----------------------
//
// NO PRAGMA AND NO BYTES. D-25 rejected a byte figure via `PRAGMA page_count`
// because it buys a SQL-discipline allowlist argument for a number derivable
// from the counts, and the counts are what the retention bounds are actually
// expressed in — so a count against its cap is the number that explains a scan
// suspended by the cap (D-08), which a megabyte figure never could.

/** ONE table's footprint: how many rows, against the cap in force, and how old
 *  the oldest row is when that is knowable. */
export type FootprintRow = {
  /** Rows this project holds in this table. A MEASURED zero is a zero. */
  readonly count: number;
  /** The row cap in force for this project. */
  readonly cap: number;
  /**
   * Age of the oldest row in whole days, or `null`.
   *
   * `null` IS ABSENT AND IS NEVER RENDERED AS ZERO. "oldest 0 days" is a
   * fabricated number, and an empty table genuinely has no oldest row.
   */
  readonly oldestDays: number | null;
};

/**
 * What the Settings storage surface reads. ONE CALL, not two.
 *
 * A `null` ROW IS AN UNREAD COUNT, NOT AN EMPTY TABLE. The two must be
 * distinguishable on the surface: a zero claims a measured empty project, and a
 * read that failed claims nothing. One unreadable table does not take the other
 * two with it.
 */
export type StorageFootprint = {
  readonly artifacts: FootprintRow | null;
  readonly observations: FootprintRow | null;
  readonly analyses: FootprintRow | null;
  /** Has a restart ever been OBSERVED to lose this database? See
   *  {@link recordBoot} for why this is never a prediction. */
  readonly observedRestartLoss: boolean;
};

// THREE COMPLETE LITERAL STATEMENTS, ONE PER TABLE, IN `retention.ts`'s STYLE:
// bounded, single-row, `project_id` bound FIRST and alone in the WHERE. This is
// the one read D-25 does not already ship — U6-3's `oldest {n} days` clause —
// and D-25 permits it ("no new SQL DISCIPLINE EXCEPTION" bars an exemption, not
// a statement that passes the gate on its own terms). `MIN` over an empty set is
// SQL NULL, which is exactly the absent case: no row, no age, no fabrication.
const OLDEST_ARTIFACT_SQL = `SELECT MIN(first_seen_at) AS t FROM artifacts WHERE project_id = ?`;
const OLDEST_OBSERVATION_SQL = `SELECT MIN(observed_at) AS t FROM observations WHERE project_id = ?`;
const OLDEST_ANALYSIS_SQL = `SELECT MIN(started_at) AS t FROM analyses WHERE project_id = ?`;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days between the oldest row and now, or `null` when there is no oldest
 *  row — or when the read failed, which is the same absence to the surface and a
 *  different one from a zero. */
async function oldestDays(
  db: Database,
  sql: string,
  projectId: string,
  nowMs: number,
): Promise<number | null> {
  try {
    const stmt = await db.prepare(sql);
    const row = await stmt.get<{ t: number | null }>(projectId);
    const oldest = row?.t;
    if (oldest === null || oldest === undefined) return null;
    const age = Number(oldest);
    if (!Number.isFinite(age)) return null;
    // FLOORED, so a row six hours old reads as "oldest 0 days" — which is why
    // the caller renders the clause only when this is non-null AND the copy
    // reads as a duration rather than as a count of rows. Never negative: a
    // clock that moved backwards must not produce a negative age.
    return Math.max(0, Math.floor((nowMs - age) / MS_PER_DAY));
  } catch {
    return null;
  }
}

/** One table's row, or `null` when its count could not be read. */
async function footprintRow(
  count: () => Promise<number>,
  cap: number,
  age: () => Promise<number | null>,
): Promise<FootprintRow | null> {
  try {
    const n = await count();
    return { count: n, cap, oldestDays: await age() };
  } catch {
    // ABSENT, NOT ZERO. A zero is what a genuinely empty project reports, and
    // the surface has to be able to say "DefMiner could not read this" without
    // saying "there is nothing here".
    return null;
  }
}

/**
 * Has a restart ever been OBSERVED to lose this database?
 *
 * SEPARATE FROM {@link readStorageFootprint} because it is knowable when the
 * counts are not: it is a fact about the DATABASE, stored at the reserved global
 * scope, so it answers with no project resolved — which is exactly the moment
 * the operator most needs it and the counts have nothing honest to say.
 */
export async function readObservedRestartLoss(db: Database): Promise<boolean> {
  return (
    (await getSetting(db, GLOBAL_PROJECT_ID, STORAGE_OBSERVED_LOSS_KEY)) === "1"
  );
}

/**
 * The three counts, their caps, their ages, and the observed-loss flag.
 *
 * COMPOSED FROM THE ALREADY-SHIPPED READS — `countArtifacts`,
 * `countObservations`, `countAnalyses` and {@link getRetentionBounds} — so D-25's
 * "no new SQL" holds for every number except the three ages, which are the one
 * addition U6-3 asks for and which pass the discipline gate on their own terms.
 */
export async function readStorageFootprint(
  db: Database,
  projectId: string,
  nowMs: number,
): Promise<StorageFootprint> {
  const bounds = await getRetentionBounds(db, projectId);
  const cap = bounds.maxRows;

  return {
    artifacts: await footprintRow(
      () => countArtifacts(db, projectId),
      cap,
      () => oldestDays(db, OLDEST_ARTIFACT_SQL, projectId, nowMs),
    ),
    observations: await footprintRow(
      () => countObservations(db, projectId),
      cap,
      () => oldestDays(db, OLDEST_OBSERVATION_SQL, projectId, nowMs),
    ),
    analyses: await footprintRow(
      () => countAnalyses(db, projectId),
      cap,
      () => oldestDays(db, OLDEST_ANALYSIS_SQL, projectId, nowMs),
    ),
    observedRestartLoss: await readObservedRestartLoss(db),
  };
}
