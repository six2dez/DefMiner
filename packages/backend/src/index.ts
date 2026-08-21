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
//   7. ready = true.
//   8. ONLY THEN register onInterceptResponse — events arrive before init()
//      finishes awaiting, and the `ready` latch is what makes that safe.

// `crypto` is ALREADY in the shipped bundle via @defminer/engine/digest, and is
// on the DIST-05 allowlist as a specifier Phase 0 measured loading inside Caido
// 0.57.1. Imported here so `crypto.createHash` is a PROBED surface rather than
// an assumed one — it adds nothing new to the bundle's import set, which
// scripts/ci/check-bundle-imports.mjs gates.
import { createHash } from "crypto";

import { BoundedQueue } from "@defminer/engine/queue";
import { QUEUE_CAP } from "@defminer/engine/thresholds";
import type { Database } from "sqlite";

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
import { startConsumer } from "./ingest/consumer";
import {
  admissionAllowed,
  currentProjectId,
  currentSignal,
  installLifecycle,
  projectEpoch,
} from "./lifecycle";
import { listArtifacts } from "./store/artifacts";
import { getDb, readSqliteVersion } from "./store/db";
import { migrate } from "./store/migrations";
import { listObservations } from "./store/observations";
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

function status(): Record<string, unknown> {
  return {
    compatible,
    reason: compatReason,
    minCaido: MIN_CAIDO,
    caidoVersion: null as string | null,
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
function compatReport(caidoVersion: string | null): Record<string, unknown> {
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

export async function init(sdk: any): Promise<void> {
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
