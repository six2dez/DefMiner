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
//   5. the current project id.
//   6. start the consumer.
//   7. ready = true.
//   8. ONLY THEN register onInterceptResponse — events arrive before init()
//      finishes awaiting, and the `ready` latch is what makes that safe.

import { checkCompat, MIN_CAIDO } from "./compat";
import {
  configurePassive,
  createCounters,
  onResponse,
  setPassiveReady,
  type Counters,
  type EnqueueClock,
} from "./hooks/passive";
import { startConsumer } from "./ingest/consumer";
import { listArtifacts } from "./store/artifacts";
import { getDb } from "./store/db";
import { migrate, SCHEMA_VERSION } from "./store/migrations";
import { listObservations } from "./store/observations";
import { BoundedQueue } from "../../engine/src/queue";
import { QUEUE_CAP } from "../../engine/src/thresholds";

import type { Database } from "sqlite";

// Module-level state. Everything here is IN MEMORY and is lost on plugin restart:
// durable failure recording is ERR-04 and the health surface is OBS-01, both
// Phase 2. Phase 1's obligation is only that these exist and are REACHABLE, so
// Phase 2 does not have to retrofit them through reviewed code.
let counters: Counters = createCounters();
let queue: BoundedQueue | undefined;
let enqueuedAt: EnqueueClock = new Map();
let db: Database | undefined;
let sqliteVersion: string | null = null;
let projectId = "";
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

/** Resolve the project id lazily and cache the first non-empty answer.
 *
 *  `init()` can legitimately run before a project is selected — and with none
 *  selected, Caido's proxy fails every request and the hook never fires anyway, so
 *  there is nothing to lose by resolving late. */
async function resolveProjectId(sdk: any): Promise<string> {
  if (projectId !== "") return projectId;
  try {
    const p = await sdk.projects.getCurrent();
    projectId = p ? String(p.getId()) : "";
  } catch {
    projectId = "";
  }
  return projectId;
}

function status(): Record<string, unknown> {
  return {
    compatible,
    reason: compatReason,
    minCaido: MIN_CAIDO,
    caidoVersion: null as string | null,
    sqliteVersion,
    schemaVersion,
    projectId,
    counters,
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
  const caidoVersion = typeof sdk?.runtime?.version === "string" ? sdk.runtime.version : null;
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
    schemaVersion = await migrate(db);

    // 4 — the measurement RESEARCH.md Open Question 1 asks for. Read once, cached,
    // and surfaced on getStatus so scripts/phase1/runtime-answers.sh can record it
    // as data rather than anyone assuming it.
    const v = await (await db.prepare("SELECT sqlite_version() AS v")).get<{ v: string }>();
    sqliteVersion = v?.v ?? null;
    log(sdk, "sqlite " + String(sqliteVersion) + " schema v" + String(schemaVersion));

    // 5 — the project scope every write is keyed on.
    await resolveProjectId(sdk);

    // 6 — exactly one consumer.
    queue = new BoundedQueue(QUEUE_CAP);
    configurePassive({ queue, counters, enqueuedAt });
    startConsumer(sdk, {
      queue,
      counters,
      db,
      enqueuedAt,
      getProjectId: () => resolveProjectId(sdk),
      onReloadLatency: (ms) => {
        maxEventToReloadMs = ms;
      },
    });

    sdk.api.register("getStatus", () => ({ ...status(), caidoVersion }));
    sdk.api.register("getArtifacts", async () => {
      if (!db || projectId === "") return [];
      return listArtifacts(db, projectId);
    });
    sdk.api.register("getObservations", async () => {
      if (!db || projectId === "") return [];
      return listObservations(db, projectId);
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
