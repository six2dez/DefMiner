// packages/backend/src/index.ts — DefMiner's backend entry point.
//
// `init()` runs in a strict order and the order is the design:
//
//   1. checkCompat  — and on failure return WITHOUT registering a hook and
//                     WITHOUT opening the database. A plugin that half-runs on an
//                     unmeasured build produces silently wrong numbers. INSIDE
//                     the try, along with everything after it: a throw that
//                     escapes init() is invisible on this runtime.
//   2. sdk.meta.db()
//   3. migrate()    — ALL DDL up front, before any data write.
//   4. SELECT sqlite_version() — read once and cached. RESEARCH.md Open Question 1:
//                     `ON CONFLICT ... DO UPDATE` needs SQLite >= 3.24 and this
//                     upsert strategy has NO fallback below it.
//  4b. checkRuntimeSurfaces — the half of REQUIRED_SURFACES that cannot be known
//                     without a handle (a Database's methods, a Statement's
//                     methods, the SQLite build, the native hash). Its refusal is
//                     just as hard as step 1's: no hook is registered. It runs
//                     here and not at step 1 because you cannot discover a
//                     Database's method set without a Database.
//   5. installLifecycle — resolve the current project AND register
//                     onProjectChange, before anything can be admitted. CORE-09's
//                     isolation is a gate at the mouth of the pipeline, so it has
//                     to be in force before the mouth opens.
//  5b. and if that registration FAILED, refuse exactly as step 1 refuses. An
//                     unarmed lifecycle cannot notice a switch, which makes every
//                     epoch re-check downstream a constant `true` and turns the
//                     plugin into a cross-project writer.
//   6. start the consumer.
//  6b. register the RPC surface — SUCCESS PATH ONLY. After the consumer, so
//                     nothing can be served before there is a loop behind it,
//                     and BEFORE the ready latch. Every name is registered on
//                     exactly ONE path: `api.register` rejects a duplicate, and
//                     the refusal paths deliberately keep only the minimal
//                     getStatus / getCompat pair so a refusing build is still
//                     diagnosable.
//   7. ready = true.
//   8. ONLY THEN register onInterceptResponse — events arrive before init()
//      finishes awaiting, and the `ready` latch is what makes that safe.

// `crypto` is ALREADY in the shipped bundle via @defminer/engine/digest, and is
// on the DIST-05 allowlist as a specifier Phase 0 measured loading inside Caido
// 0.57.1. Imported here so `crypto.createHash` is a PROBED surface rather than
// an assumed one — it adds nothing new to the bundle's import set, which
// scripts/ci/check-bundle-imports.mjs gates.
// `randomUUID` comes from the SAME specifier and adds nothing to the bundle's
// import set. It is a MEASURED export of Caido's `crypto` module — the Phase 0
// capability probe lists it beside `createHash` in
// `capabilities.json`'s `modules.crypto` — which is why it may be relied on here
// rather than shimmed. It mints the audit event id, and `audit.ts` states why
// that id is the CALLER's to mint: the caller owns idempotency, so a retry after
// an ambiguous failure re-presents the same id and lands as a no-op.
import { createHash, randomUUID } from "crypto";

import type {
  PageRequest,
  PageResponse,
  VisibleTotal,
} from "@defminer/engine/contract";
import { BoundedQueue } from "@defminer/engine/queue";
import { QUEUE_CAP } from "@defminer/engine/thresholds";
import type { Database } from "sqlite";

import {
  type CompatPayload,
  CONTRACT_VERSION,
  type HealthOutcome,
  type PluginSdk,
  type RetryOutcome,
  type StatusPayload,
} from "./api/spec";
import {
  checkCompat,
  checkRuntimeSurfaces,
  MIN_CAIDO,
  MIN_SQLITE,
  probeSurfaces,
  type SurfaceContext,
} from "./compat";
import {
  configurePassive,
  type EnqueueClock,
  onResponse,
  setPassiveReady,
} from "./hooks/passive";
import { jobsInFlight, startConsumer } from "./ingest/consumer";
import {
  admissionAllowed,
  currentProjectId,
  currentSignal,
  installLifecycle,
  projectEpoch,
} from "./lifecycle";
import { composeScanFilter, positionClause } from "./scan/filter";
import { getActiveScan, startScan } from "./scan/scans";
import {
  DETECTOR_CORPUS_VERSION,
  getLatestAnalysisForArtifact,
} from "./store/analyses";
import { listArtifacts } from "./store/artifacts";
import { recordAudit } from "./store/audit";
import { getDb, readSqliteVersion } from "./store/db";
import {
  readContributingArtifactCounts,
  readExportChunk,
} from "./store/export";
import { migrate } from "./store/migrations";
import { listObservations, type ObservationRow } from "./store/observations";
import {
  type ArtifactPageRow,
  countInventory,
  listArtifactsPage,
  listObservationsPage,
} from "./store/reads";
import { retryAnalysis } from "./store/retry";
import {
  clearSetting,
  GLOBAL_PROJECT_ID,
  listKnownSettings,
  putBoundedSetting,
} from "./store/settings";
import { describeError, slimStatus } from "./telemetry";

// Module-level state. Everything here is IN MEMORY and is lost on plugin restart:
// durable failure recording is ERR-04 and the health surface is OBS-01, both
// Phase 2. Phase 1's obligation is only that these exist and are REACHABLE, so
// Phase 2 does not have to retrofit them through reviewed code.
//
// The COUNTERS are NOT here. They live in telemetry.ts, as one object the hook
// and the consumer increment directly; this file only projects them.
let queue: BoundedQueue | undefined;
const enqueuedAt: EnqueueClock = new Map();
let db: Database | undefined;
let sqliteVersion: string | null = null;
let compatible = false;
let compatReason: string | null = null;
// The context every surface probe reads. Filled in as init() acquires each
// piece, so `getCompat` reports what was ACTUALLY reachable at the point the
// plugin stopped — an empty `db` on an incompatible build is information, not a
// gap.
let surfaceCtx: SurfaceContext = { createHash };
let schemaVersion: number | null = null;
let maxEventToReloadMs = 0;

function log(sdk: any, msg: string): void {
  try {
    sdk.console.log("[defminer] " + String(msg).slice(0, 200));
  } catch {
    /* sdk.console.log can throw during teardown; nothing left to do */
  }
}

/**
 * Why the plugin refuses to observe anything when CORE-09's listener is missing.
 *
 * A CONSTANT rather than an inline string: `lifecycle.spec.ts` asserts the
 * operator is told the reason on the RPC, and a sentence that exists in two
 * places drifts in one of them.
 */
const ISOLATION_UNAVAILABLE_REASON =
  "project isolation unavailable: sdk.events.onProjectChange could not be " +
  "registered, so a project switch would go unnoticed and this plugin would " +
  "write one project's traffic under another's id. Ingestion is DISABLED.";

/** The projection `getStatus` returns, minus the one field only `init()` holds.
 *  Typed against the published contract rather than `Record<string, unknown>`:
 *  a renamed field is now a typecheck failure here instead of an `undefined` the
 *  frontend reads at runtime. */
/**
 * THE PAGE A READ ANSWERS WITH WHEN THERE IS NOTHING TO READ FROM.
 *
 * FAIL CLOSED, NOT THROW. Caido surfaces neither a synchronous throw nor an
 * async rejection from plugin code, so a read that threw here would hand the
 * frontend a promise that never settles and nothing anywhere would say why. An
 * empty exhausted page is a shape the caller already knows how to render.
 */
function emptyPage<TRow>(): PageResponse<TRow> {
  return { rows: [], nextCursor: null, scanned: 0, exhausted: true };
}

/** The count a read answers with when there is nothing to count. */
const NO_ROWS_VISIBLE: VisibleTotal = {
  visible: 0,
  hiddenBySuppression: 0,
  suppressionRuleCount: 0,
};

/**
 * The outcome a retry answers with when it could not be attempted at all.
 *
 * `ok: false` AND `state: null` TOGETHER, never `ok: true` with no change. The
 * panel distinguishes "the guard declined to move this row" from "the write
 * did not happen", and collapsing the two would show the operator a decline
 * that never ran (T-05-55).
 */
const NO_RETRY: RetryOutcome = { ok: false, changed: false, state: null };

/**
 * What the health endpoint answers when no project is resolved.
 *
 * AN EXPLICIT OUTCOME, NOT FOUR ZEROES. Four zeroes are what a perfectly idle,
 * perfectly healthy backend reports, and rendering them for a plugin that has
 * resolved no project would tell the operator the opposite of the truth at
 * exactly the moment they opened this surface to find out why nothing is
 * happening. The same argument the paged reads make for an explicit empty page
 * over a rejection, applied to the one surface whose whole job is diagnosis.
 */
const HEALTH_UNAVAILABLE: HealthOutcome = {
  outcome: "unavailable",
  reason: "no-project",
};

/**
 * Replace the caller's `projectId` with the one the plugin resolved.
 *
 * THE CALLER DOES NOT GET TO NAME THE PROJECT. `PageRequest` carries a
 * `projectId` because the store layer needs one in every predicate, not because
 * the frontend is the authority on which project is active — and a read that
 * trusted the field would let anything holding the RPC handle page another
 * project's rows out of the one shared SQLite file (T-05-34, T-01-20). The value
 * comes from `currentProjectId()`, which is CORE-09's lifecycle-resolved id, and
 * the caller's is discarded without comment.
 */
function scopedTo(req: PageRequest, projectId: string): PageRequest {
  return { ...req, projectId };
}

function status(): Omit<StatusPayload, "caidoVersion"> {
  return {
    compatible,
    reason: compatReason,
    minCaido: MIN_CAIDO,
    sqliteVersion,
    schemaVersion,
    // NULL, not "". An empty string is a project id that happens to be blank,
    // which is a different claim from "there is no project selected".
    projectId: currentProjectId(),
    // `counters`, `maxSliceMs` and `lastError`, projected — never the live
    // object, and never a payload of any kind (T-01-26).
    ...slimStatus(),
    queueDepth: queue ? queue.depth : 0,
    queueCap: queue ? queue.cap : 0,
    queueOverflowCount: queue ? queue.overflowCount : 0,
    maxEventToReloadMs,
  };
}

/**
 * COMPAT-02's in-runtime report: which of REQUIRED_SURFACES this build actually
 * exposes, measured inside the QuickJS runtime rather than inferred from a type
 * package. `scripts/phase1/compat-smoke.sh` records it per leg.
 */
function compatReport(caidoVersion: string | null): CompatPayload {
  return {
    compatible,
    reason: compatReason,
    minCaido: MIN_CAIDO,
    minSqlite: MIN_SQLITE,
    caidoVersion,
    sqliteVersion,
    surfaces: probeSurfaces(surfaceCtx),
  };
}

/**
 * THE PARAMETER IS TYPED AGAINST THE PUBLISHED CONTRACT AS OF PLAN 05-07.
 *
 * It was `any`. That was the honest annotation while the RPC surface was four
 * argument-less endpoints registered against `sdk.api.register(name: string, fn:
 * unknown)` — there was nothing for a type to check. It stopped being honest the
 * moment an endpoint took a `PageRequest` and returned a `PageResponse`: a typo
 * in an endpoint name registers a second, unreachable endpoint, and a callback
 * whose return shape drifted from the contract is read by a stale frontend as
 * `undefined`. On this runtime both are SILENT — Caido surfaces neither a throw
 * nor a rejection from plugin code.
 *
 * {@link PluginSdk} types `sdk.api` as `APISDK<Api, Events>` and leaves the rest
 * of the surface structural, which is the shape every other module in this
 * package already uses (`MetaSdk`, `LifecycleSdk`, `PassiveSdk`). Its own doc
 * comment states why the whole `SDK<...>` is not adopted wholesale.
 */
export async function init(sdk: PluginSdk): Promise<void> {
  log(sdk, "init");

  // OUTSIDE the try because the catch reports it, and INSIDE nothing else:
  // everything from the version guard down is covered. Four statements used to
  // sit outside the catch — checkCompat, this read, and the two api.register
  // calls on the refusal path — and each of them can throw. checkCompat walks
  // `sdk` with property access, so a throwing accessor or a revoked proxy escapes
  // init() into a runtime that logs nothing; `api.register` rejects a duplicate
  // name, which is exactly what a re-init hits. The plugin would then have no
  // hook, no RPC and no log line: the obscure failure COMPAT-01 forbids.
  let caidoVersion: string | null = null;

  try {
    // 1 — the version guard, before anything else has a side effect.
    const compat = checkCompat(sdk);
    caidoVersion =
      typeof sdk?.runtime?.version === "string" ? sdk.runtime.version : null;
    if (!compat.ok) {
      compatible = false;
      compatReason = compat.reason;
      log(sdk, "INCOMPATIBLE: " + compat.reason);
      // getStatus is the ONLY thing registered. No hook, no database. COMPAT-01's
      // "clear message" is this log line plus this RPC; the visible surface is owed
      // to Phase 5 (decision P1-D5).
      surfaceCtx = { ...surfaceCtx, sdk };
      sdk.api.register("getStatus", () => ({ ...status(), caidoVersion }));
      // Registered on the REFUSAL path too. A build that refuses is exactly the
      // build whose surface matrix somebody needs to read, and leg C of the
      // compatibility smoke test has no other way to see it.
      sdk.api.register("getCompat", () => compatReport(caidoVersion));
      return;
    }
    compatible = true;
    compatReason = null;

    // 2, 3 — handle, then ALL DDL, before any data write can leave a transaction
    // dangling on a pooled connection.
    db = await getDb(sdk);
    const migration = await migrate(db);
    schemaVersion = migration.version;
    // A migration failure is otherwise INVISIBLE — Caido surfaces neither a throw
    // nor a rejection — so the structured per-step record is logged here and the
    // plugin does not pretend the schema is what it expected (T-01-24).
    if (!migration.ok) {
      const failed = migration.steps.find((st) => !st.ok);
      log(
        sdk,
        "MIGRATION INCOMPLETE at v" +
          String(migration.version) +
          " of " +
          String(migration.head) +
          ": " +
          (failed && !failed.ok
            ? failed.step + " — " + failed.error
            : "unknown"),
      );
    }
    if (migration.ahead) {
      log(
        sdk,
        "database is at v" +
          String(migration.from) +
          ", NEWER than this build's v" +
          String(migration.head) +
          " — the ladder is forward-only and made no change",
      );
    }

    // 4 — the measurement RESEARCH.md Open Question 1 asks for. Read once, cached
    // in store/db.ts, and surfaced on getStatus so
    // scripts/phase1/runtime-answers.sh can record it as data rather than anyone
    // assuming it.
    sqliteVersion = await readSqliteVersion(db);
    log(
      sdk,
      "sqlite " + String(sqliteVersion) + " schema v" + String(schemaVersion),
    );

    // 4b — the surfaces that CANNOT be known without a handle. A Database's
    // method set is not discoverable without a Database, and a Statement's is
    // not discoverable without a Statement, so this stage necessarily runs
    // after meta.db(). Its refusal is just as hard as checkCompat's: no hook is
    // registered, so an unmeasured runtime still observes nothing.
    let statement: unknown;
    try {
      statement = await db.prepare("SELECT 1");
    } catch (e) {
      statement = undefined;
      log(sdk, "could not prepare a probe statement: " + describeError(e));
    }
    surfaceCtx = { sdk, db, statement, sqliteVersion, createHash };
    const runtimeSurfaces = checkRuntimeSurfaces(surfaceCtx);
    if (!runtimeSurfaces.ok) {
      compatible = false;
      compatReason = runtimeSurfaces.reason;
      log(sdk, "INCOMPATIBLE: " + runtimeSurfaces.reason);
      sdk.api.register("getStatus", () => ({ ...status(), caidoVersion }));
      sdk.api.register("getCompat", () => compatReport(caidoVersion));
      return;
    }

    // 5 — the project scope every write is keyed on, plus the listener that
    // swaps it. The queue is constructed FIRST because the lifecycle drains it.
    queue = new BoundedQueue(QUEUE_CAP);
    const lifecycle = await installLifecycle(sdk, {
      queue,
      enqueuedAt,
      log: (msg) => {
        sdk.console.log(msg);
      },
    });

    // 5b — ISOLATION IS A PRECONDITION FOR INGESTING, NOT A FEATURE OF IT.
    //
    // With no `onProjectChange` registration the plugin can never learn that the
    // operator switched project. The active id stays pinned to whatever boot
    // resolved, the epoch never moves, and every epoch re-check the consumer
    // makes is a constant `true` — so a plugin that carried on here would write
    // project B's bundles and B's URLs keyed on project A, and then serve A's
    // filter back to an operator working in B. That is the Information
    // Disclosure CORE-09 exists to prevent, and it arrives with every downstream
    // guard still looking healthy.
    //
    // So this refuses exactly the way an unmeasured build is refused: no hook,
    // no consumer, no ready latch, and the reason on getStatus().
    if (!lifecycle.projectChangeArmed) {
      compatible = false;
      compatReason = ISOLATION_UNAVAILABLE_REASON;
      log(sdk, "INCOMPATIBLE: " + compatReason);
      sdk.api.register("getStatus", () => ({ ...status(), caidoVersion }));
      sdk.api.register("getCompat", () => compatReport(caidoVersion));
      return;
    }

    // 6 — exactly one consumer.
    configurePassive({ queue, enqueuedAt, admissionAllowed });
    startConsumer(sdk, {
      queue,
      db,
      enqueuedAt,
      getProjectId: () => Promise.resolve(currentProjectId() ?? ""),
      projectEpoch,
      // A GETTER, not a captured value. `analyseAndFinish` reads `deps.signal`
      // once per walk, so this hands each walk the token that is in force when
      // it starts — which is what lets a project change abort the walk already
      // running without also cancelling everything started afterwards.
      get signal() {
        return currentSignal();
      },
      onReloadLatency: (ms) => {
        maxEventToReloadMs = ms;
      },
    });

    // 6b — THE RPC SURFACE. SUCCESS PATH ONLY, AND EACH NAME ON EXACTLY ONE
    // PATH.
    //
    // `sdk.api.register` REJECTS A DUPLICATE NAME, which is exactly what a
    // re-init or a hot reload produces — so a name registered on two paths is
    // not a redundancy, it is a rejection that aborts init(), invisibly. The
    // three refusal paths above keep registering only the minimal `getStatus` /
    // `getCompat` pair: a build that refuses is exactly the build whose surface
    // matrix somebody needs to read, and none of the reads below has a database
    // to serve from on those paths anyway.
    //
    // Placement obeys the ordering contract in this file's header: after the
    // consumer starts, BEFORE the passive-ready latch, and inside the one try.
    sdk.api.register("getStatus", () => ({ ...status(), caidoVersion }));
    sdk.api.register("getCompat", () => compatReport(caidoVersion));
    sdk.api.register("getArtifacts", async () => {
      const pid = currentProjectId();
      if (!db || pid === null) return [];
      return listArtifacts(db, pid);
    });
    sdk.api.register("getObservations", async () => {
      const pid = currentProjectId();
      if (!db || pid === null) return [];
      return listObservations(db, pid);
    });
    sdk.api.register("listArtifactsPage", async (_s, req) => {
      const pid = currentProjectId();
      if (!db || pid === null) return emptyPage<ArtifactPageRow>();
      return listArtifactsPage(db, scopedTo(req, pid));
    });
    sdk.api.register("listObservationsPage", async (_s, req) => {
      const pid = currentProjectId();
      if (!db || pid === null) return emptyPage<ObservationRow>();
      return listObservationsPage(db, scopedTo(req, pid));
    });
    sdk.api.register("countInventory", async (_s, req) => {
      const pid = currentProjectId();
      if (!db || pid === null) return NO_ROWS_VISIBLE;
      return countInventory(db, pid, req.table, req.filter);
    });
    sdk.api.register("getArtifactAnalysis", async (_s, req) => {
      const pid = currentProjectId();
      // FAIL CLOSED, AND `null` IS NOT THE SAME CLAIM AS AN EMPTY PANEL. The
      // panel reads `null` as "this artifact has no analysis to show" and says
      // so in words; it never renders a state nobody knows.
      if (!db || pid === null) return null;
      const row = await getLatestAnalysisForArtifact(db, pid, req.sha256);
      if (row === undefined) return null;
      // MAPPED FIELD BY FIELD, not spread. `analyses.error` is on the row and
      // is deliberately not on the contract type; a spread would carry it
      // across the boundary the day somebody widens the select list.
      return {
        sha256: row.sha256,
        detectorSetHash: row.detector_set_hash,
        scanState: row.scan_state,
        bytesWalked: row.bytes_walked,
        byteLen: row.byte_len,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
      };
    });
    sdk.api.register("retryAnalysis", async (_s, req) => {
      const pid = currentProjectId();
      if (!db || pid === null) return NO_RETRY;
      const outcome = await retryAnalysis(
        db,
        pid,
        req.sha256,
        // The corpus version the caller named, NOT a substituted current one:
        // it is part of the key, and substituting it would aim the retry at a
        // reading of these bytes the operator is not looking at. The sentinel
        // is imported so this file does not restate it.
        req.detectorSetHash === ""
          ? DETECTOR_CORPUS_VERSION
          : req.detectorSetHash,
        Date.now(),
      );
      if (!outcome.ok) {
        // LOGGED HERE, NOT RETURNED. The description is already redacted, and
        // it still does not cross the boundary: ERR-04's copy interpolates a
        // DefMiner-authored reason code into a sentence, and a message that
        // reached the panel is a message somebody eventually interpolates.
        log(sdk, "retryAnalysis failed: " + outcome.error);
        return NO_RETRY;
      }
      return {
        ok: true,
        changed: outcome.changes > 0,
        state: outcome.state ?? null,
      };
    });
    sdk.api.register("exportInventory", async (_s, req) => {
      const pid = currentProjectId();
      // FAIL CLOSED WITH A REASON THE DIALOG CAN RENDER. Not an empty file and
      // not a rejection: a zero-byte download the operator then opens is the
      // worst of the three answers, because it looks like a finished export.
      if (!db || pid === null) {
        return { outcome: "refused", reason: "no-project" } as const;
      }

      // Read at the moment the export is SERIALISED, from the same partition it
      // is serialised from. The dialog shows the operator the same two numbers,
      // but the ones the FILE carries are these.
      const counts = await readContributingArtifactCounts(db, pid);

      const result = await readExportChunk(db, {
        projectId: pid,
        table: req.table,
        format: req.format,
        mode: req.mode,
        filter: req.filter,
        sortKey: req.sortKey,
        direction: req.direction,
        chunkIndex: req.chunkIndex,
        cursor: req.cursor,
        chunkRows: req.chunkRows,
        counts,
        nowMs: Date.now(),
      });

      // THE AUDIT ROW IS WRITTEN ONCE, ON THE CHUNK THAT COMPLETES THE EXPORT.
      //
      // Not per call, and not optimistically at the start. Per call, a
      // five-chunk export leaves five records of ONE disclosure and the log
      // becomes unreadable at exactly the moment somebody is reading it to
      // answer "what did I export". At the start, a failed export would be
      // recorded as a disclosure that never happened — and an audit log that
      // over-reports is an audit log nobody believes the second time.
      if (result.outcome === "chunk" && !result.chunk.hasMore) {
        // The reachable count for this table and filter IS the export's row
        // count, and it is the same number the dialog put in front of the
        // operator before they confirmed.
        const exported = await countInventory(db, pid, req.table, req.filter);
        // ONE id, used as BOTH the event id and the subject. One completed
        // export is one event about one export, and inventing a second
        // identifier would be inventing a second thing to correlate.
        const exportId = randomUUID();
        const written = await recordAudit(
          db,
          pid,
          // The KIND names which of the two it was. Both members already exist
          // in the shipped vocabulary (plan 05-06), so this adds a call site and
          // not a migration.
          req.mode === "raw" ? "export_raw" : "export_redacted",
          exportId,
          // A DefMiner-authored reason code, a count and two identifiers this
          // plugin chose. NO exported value, NO URL, NO target byte — the audit
          // writer redacts, and a caller must not rely on that to launder
          // something it should not have passed (T-05-62).
          `export_completed rows=${String(exported.visible)} ` +
            `format=${req.format} table=${req.table} ` +
            `chunks=${String(req.chunkIndex + 1)}`,
          Date.now(),
          exportId,
        );
        if (!written.ok) {
          // LOGGED, NOT RETURNED. The description is already redacted and it
          // still does not cross the boundary: the dialog's copy is
          // DefMiner-authored and a message that reached it is a message
          // somebody eventually interpolates.
          log(sdk, "export audit failed: " + written.error);
        }
      }

      return result;
    });
    // --- UI-08's SETTINGS SURFACE ----------------------------------------
    //
    // THE CALLER DOES NOT NAME THE PROJECT, on the read OR the write, and here
    // that matters more than anywhere else on this contract. `scopedTo`'s
    // comment states the general rule for pages; a settings write is the same
    // hazard with a durable effect — anything holding the RPC handle could
    // otherwise read and rewrite ANOTHER project's retention bounds out of the
    // one shared SQLite file (threat T-05-67, T-05-34).
    sdk.api.register("listSettings", async () => {
      const pid = currentProjectId();
      // NOT A REFUSAL. With no project there is genuinely no project row for
      // any key, and the global rows and documented defaults are
      // project-independent — so the honest answer is the list with every
      // `project` field null, which is exactly what this produces. Refusing
      // would hide the operator-wide defaults they can still legitimately read.
      if (!db) return [];
      return listKnownSettings(db, pid ?? GLOBAL_PROJECT_ID);
    });
    sdk.api.register("writeSetting", async (_s, req) => {
      const pid = currentProjectId();
      if (!db) return { ok: false, reason: "write-failed" } as const;
      // THE SCOPE DECIDES THE ROW, AND THE PROJECT SCOPE NEEDS A PROJECT. A
      // project-scoped write with nothing resolved must not silently land on
      // the global row and change every project the operator has.
      if (req.scope === "project" && pid === null) {
        return { ok: false, reason: "no-project" } as const;
      }
      const target = req.scope === "global" ? GLOBAL_PROJECT_ID : (pid ?? "");

      if (req.value === null) {
        // CLEARING IS A WRITE OF ABSENCE. `clearSetting` deletes the row at this
        // scope only, so the resolution falls back to the next level down
        // rather than being pinned to whatever the default happens to be today.
        const cleared = await clearSetting(db, target, req.key);
        if (!cleared.ok) {
          // LOGGED, NOT RETURNED. The description is already redacted and it
          // still does not cross the boundary: the panel's copy is
          // DefMiner-authored and a message that reached it is a message
          // somebody eventually interpolates.
          log(sdk, "clearSetting failed: " + cleared.error);
          return { ok: false, reason: "write-failed" } as const;
        }
        return { ok: true, stored: "" } as const;
      }

      return putBoundedSetting(db, target, req.key, req.value, Date.now());
    });
    // --- OBS-01's FOUR NUMBERS, PROJECTED --------------------------------
    //
    // Not `async` and it touches no database: every value is already in memory,
    // and a health surface that could itself block on the thread it is
    // reporting about would be the joke research pitfall P-07 warns against.
    sdk.api.register("getHealth", () => {
      if (currentProjectId() === null) return HEALTH_UNAVAILABLE;
      return {
        outcome: "health",
        health: {
          queueDepth: queue ? queue.depth : 0,
          droppedCount: queue ? queue.overflowCount : 0,
          jobsInFlight: jobsInFlight(),
          // FROM THE SAME PROJECTION `getStatus` READS, not a second reader of
          // the same module variable. One number, one owner.
          maxSliceMs: slimStatus().maxSliceMs,
        },
      };
    });
    // --- FIND-03's RETROACTIVE SCAN ---------------------------------------
    //
    // THE CALLER DOES NOT NAME THE PROJECT, on either endpoint, for the reason
    // the settings surface above states: anything holding the RPC handle could
    // otherwise start a scan in — or read a scan out of — ANOTHER project's
    // partition of the one shared SQLite file (T-05-34, T-06-03).
    sdk.api.register("startScan", async (_s, req) => {
      const pid = currentProjectId();
      // FAIL CLOSED WITH A REASON THE FORM CAN RENDER. Not silence and not a
      // throw: Caido surfaces neither, so a rejection here would leave the
      // operator pressing a button that does nothing.
      if (!db || pid === null) {
        return { outcome: "refused", reason: "no-project" } as const;
      }

      // THE OPERATOR CLAUSE IS REFUSED, NOT DROPPED. Plan 06-04 ships the
      // validator and the static HTTPQL gate. Until it does, accepting a clause
      // and ignoring it would run a WIDER scan than the operator asked for while
      // the surface told them it was narrowed — which is exactly the outcome
      // D-05 exists to prevent, arrived at from the opposite direction.
      if (req.operatorFilter !== "") {
        return {
          outcome: "refused",
          reason: "operator-clause-unsupported",
        } as const;
      }

      // ONE AT A TIME. The partial unique index refuses a second RUNNING scan
      // inside the insert; this read refuses a second start while a SUSPENDED
      // one is still holding its place, which the index deliberately permits so
      // that resuming is possible at all. The two together are the invariant,
      // and neither is a substitute for the other.
      const active = await getActiveScan(db, pid);
      if (active !== undefined) {
        return { outcome: "refused", reason: "already-running" } as const;
      }

      // MINTED HERE, BY THE CALLER OF THE WRITE. That is what makes a retry
      // after an ambiguous failure a no-op instead of a second scan.
      const scanId = randomUUID();
      const written = await startScan(
        db,
        pid,
        scanId,
        req.operatorFilter,
        projectEpoch(),
        Date.now(),
      );
      if (!written.ok) {
        // LOGGED HERE, NOT RETURNED. The description is already redacted and it
        // still does not cross the boundary: the form's copy is
        // DefMiner-authored and a message that reached it is a message somebody
        // eventually interpolates.
        log(sdk, "startScan failed: " + written.error);
        return { outcome: "refused", reason: "write-failed" } as const;
      }
      return { outcome: "started", scanId } as const;
    });
    sdk.api.register("getScanStatus", async () => {
      const pid = currentProjectId();
      // `null` ON EVERY ABSENT PATH, AND THAT IS ONE CLAIM RATHER THAN THREE.
      // No database, no project, or no scan row all mean the same thing to the
      // surface: there is no scan, so render the start form. A zero-filled
      // payload would instead describe a scan that ran and found nothing.
      if (!db || pid === null) return null;
      const row = await getActiveScan(db, pid);
      if (row === undefined) return null;

      // MAPPED FIELD BY FIELD, NEVER SPREAD — the rule `getArtifactAnalysis`
      // already follows. A spread would carry every column this table grows
      // across the RPC boundary on the day somebody adds one.
      return {
        scanId: row.scan_id,
        state: row.state,
        suspendReason: row.suspend_reason,
        operatorFilter: row.operator_filter,
        // REBUILT THROUGH THE ONE PRODUCER, never stored and never concatenated
        // here. Storing the composed string would let it drift from what the
        // next page will actually send, and the whole value of showing it is
        // that it IS what will be sent (D-05).
        composedFilter: composeScanFilter(
          positionClause(row.last_request_id),
          row.operator_filter,
        ),
        pagesWalked: row.pages_walked,
        seen: row.seen,
        admitted: row.admitted,
        skippedDone: row.skipped_done,
        rejected: row.rejected,
        queued: row.queued,
        // ABSENT, NOT ZERO. `analysed` belongs to the consumer at the far end of
        // the queue and plan 06-06 wires it; a zero here would read as "nothing
        // has been analysed" on a scan that is analysing.
        analysed: null,
        lastCreatedAt: row.last_created_at,
        startedAt: row.started_at,
        updatedAt: row.updated_at,
        finishedAt: row.finished_at,
        // FALSE UNTIL PLAN 06-03 SHIPS THE WATERMARK. It is reported rather
        // than omitted because the field is required by the UI contract: an
        // absent signal collapses a healthy backpressure hold into the stall
        // marker, and this build genuinely never holds — it walks one page per
        // call — so `false` is the true answer and not a placeholder.
        heldAtWatermark: false,
      };
    });
    // Not `async`, and it touches nothing: a version check that could fail for
    // any reason other than the plugin being absent would be a check the
    // frontend has to interpret rather than compare.
    sdk.api.register("getContractVersion", () => CONTRACT_VERSION);

    // 7, 8 — latch, THEN register. Not the other way round.
    setPassiveReady(true);
    sdk.events.onInterceptResponse((s: any, request: any, response: any) =>
      onResponse(s, request, response),
    );
    log(sdk, "ready — observing proxied responses");
  } catch (e) {
    // Caido surfaces neither a throw nor a rejection from plugin code, so an init
    // failure that is not caught here is completely invisible.
    compatible = false;
    // describeError, NOT String(e): `compatReason` is returned as `reason` by
    // status() on every getStatus() call, so it crosses the same RPC boundary
    // slimStatus().lastError does. It redacts URL-shaped substrings BEFORE
    // truncating — truncating first keeps the front half, which is the half
    // carrying the host — and init-stage errors routinely quote the SQLite file
    // path from sdk.meta.path() (T-01-26, DEPLOY-02).
    compatReason = "init failed: " + describeError(e);
    log(sdk, compatReason);
    try {
      sdk.api.register("getStatus", () => ({ ...status(), caidoVersion }));
    } catch {
      /* already registered */
    }
  }
}
