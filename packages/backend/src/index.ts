// packages/backend/src/index.ts — DefMiner's backend entry point.
//
// `init()` runs in a strict order and the order is the design:
//
//   1. checkCompat  — and on failure return WITHOUT registering a hook and
//                     WITHOUT opening the database. A plugin that half-runs on an
//                     unmeasured build produces silently wrong numbers.
//   2. sdk.meta.db()
//   3. migrate()    — ALL DDL up front, before any data write.
//   4. SELECT sqlite_version() — read once and cached. RESEARCH.md Open Question 1:
//                     `ON CONFLICT ... DO UPDATE` needs SQLite >= 3.24 and this
//                     upsert strategy has NO fallback below it.
//   5. installLifecycle — resolve the current project AND register
//                     onProjectChange, before anything can be admitted. CORE-09's
//                     isolation is a gate at the mouth of the pipeline, so it has
//                     to be in force before the mouth opens.
//   6. start the consumer.
//   7. ready = true.
//   8. ONLY THEN register onInterceptResponse — events arrive before init()
//      finishes awaiting, and the `ready` latch is what makes that safe.

import { BoundedQueue } from "@defminer/engine/queue";
import { QUEUE_CAP } from "@defminer/engine/thresholds";
import type { Database } from "sqlite";

import { checkCompat, MIN_CAIDO } from "./compat";
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
import { slimStatus } from "./telemetry";

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
let schemaVersion: number | null = null;
let maxEventToReloadMs = 0;

function log(sdk: any, msg: string): void {
  try {
    sdk.console.log("[defminer] " + String(msg).slice(0, 200));
  } catch {
    /* sdk.console.log can throw during teardown; nothing left to do */
  }
}

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

export async function init(sdk: any): Promise<void> {
  log(sdk, "init");

  // 1 — the version guard, before anything else has a side effect.
  const compat = checkCompat(sdk);
  const caidoVersion =
    typeof sdk?.runtime?.version === "string" ? sdk.runtime.version : null;
  if (!compat.ok) {
    compatible = false;
    compatReason = compat.reason;
    log(sdk, "INCOMPATIBLE: " + compat.reason);
    // getStatus is the ONLY thing registered. No hook, no database. COMPAT-01's
    // "clear message" is this log line plus this RPC; the visible surface is owed
    // to Phase 5 (decision P1-D5).
    sdk.api.register("getStatus", () => ({ ...status(), caidoVersion }));
    return;
  }
  compatible = true;
  compatReason = null;

  try {
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

    // 5 — the project scope every write is keyed on, plus the listener that
    // swaps it. The queue is constructed FIRST because the lifecycle drains it.
    queue = new BoundedQueue(QUEUE_CAP);
    await installLifecycle(sdk, {
      queue,
      enqueuedAt,
      log: (msg) => {
        sdk.console.log(msg);
      },
    });

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
    compatReason = "init failed: " + String(e).slice(0, 160);
    log(sdk, compatReason);
    try {
      sdk.api.register("getStatus", () => ({ ...status(), caidoVersion }));
    } catch {
      /* already registered */
    }
  }
}
