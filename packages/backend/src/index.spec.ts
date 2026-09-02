// packages/backend/src/index.spec.ts — init()'s error containment (COMPAT-01).
//
// The file's own header says the catch exists because "an init failure that is
// not caught here is completely invisible" — HANDLER_ERROR_SURFACED is
// "neither", so Caido writes down neither a throw nor a rejection from plugin
// code. Four statements used to sit OUTSIDE that catch: `checkCompat(sdk)`, the
// version read, and the two `api.register` calls on the refusal path.
//
// Every one of them can throw against a real SDK. `checkCompat` walks `sdk` with
// property access, so a throwing accessor or a revoked proxy escapes; and
// `api.register` rejects a duplicate name, which is precisely what a re-init or
// a hot reload produces. The result was a plugin with no hook, no RPC and no log
// line — the obscure failure COMPAT-01 exists to forbid.
//
// These cases drive the real `init()`. They assert it RESOLVES and that the
// failure is written down somewhere an operator can reach it.

import { readFileSync } from "node:fs";

import type {
  ExportRedactionMode,
  ScanProgressPayload,
} from "@defminer/engine/contract";
import {
  INTERNAL_SETTING_KEYS,
  INVALIDATION_EVENT,
  isScanProgressPayload,
  OPERATOR_SETTING_KEYS,
  RETENTION_MAX_ROWS_KEY,
  STORAGE_BOOT_COUNT_KEY,
  STORAGE_INSTALL_ID_KEY,
} from "@defminer/engine/contract";
import { sha256Hex } from "@defminer/engine/digest";
import type { Database } from "sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  emitProjectChange,
  makeFakeProject,
  makeFakeRequest,
  makeFakeResponse,
  makeFakeScanItem,
  makeFakeSdk,
} from "../test/fixtures/fake-sdk";
import {
  createFixtureDb,
  type SqliteFixture,
} from "../test/fixtures/sqlite-fixture";

import { CONTRACT_VERSION } from "./api/spec";
import { resetPassiveForTest } from "./hooks/passive";
import { drainConsumerForTest, resetConsumerForTest } from "./ingest/consumer";
import { resetLifecycleForTest } from "./lifecycle";
import {
  composeScanFilter,
  OPERATOR_CLAUSE_REJECTIONS,
  positionClause,
} from "./scan/filter";
import { isHeldAtWatermark, resetScanProducerForTest } from "./scan/producer";
import { DETECTOR_CORPUS_VERSION } from "./store/analyses";
import { resetDbHandleForTest } from "./store/db";
import { migrate } from "./store/migrations";
import type { KnownSettingValue } from "./store/settings";
import { GLOBAL_PROJECT_ID, resetBootMarkerForTest } from "./store/settings";
import { resetTelemetryForTest } from "./telemetry";

import { init, resetScanDriverForTest } from "./index";

/**
 * Every endpoint the success path registers, in registration order.
 *
 * Hoisted to module scope so the two assertions that need it cannot drift
 * apart: "registers every contract endpoint on the success path" below reads
 * it in the POSITIVE direction (each name is present), and "registers NOTHING
 * outside the contract on the success path" reads it in the NEGATIVE one (no
 * fifteenth name appeared). Two lists would let one edit satisfy one direction
 * and silently loosen the other.
 *
 * There is no runtime list to derive this from — `Api` in `api/spec.ts` is a
 * TYPE, and the registration site is sixteen hand-written `api.register`
 * calls — so this literal is the gate.
 */
const CONTRACT_ENDPOINTS: readonly string[] = [
  "getStatus",
  "getCompat",
  "getArtifacts",
  "getObservations",
  "listArtifactsPage",
  "listObservationsPage",
  "countInventory",
  "getArtifactAnalysis",
  "retryAnalysis",
  "deriveSource",
  "exportInventory",
  "listSettings",
  "writeSetting",
  "getHealth",
  "getStorageFootprint",
  "startScan",
  "getScanStatus",
  "pauseScan",
  "resumeScan",
  "discardScan",
  "listScans",
  "getContractVersion",
];

beforeEach(() => {
  resetLifecycleForTest();
  resetPassiveForTest();
  resetConsumerForTest();
  resetDbHandleForTest();
  resetTelemetryForTest();
  resetBootMarkerForTest();
  resetScanProducerForTest();
  resetScanDriverForTest();
});

afterEach(() => {
  resetLifecycleForTest();
  resetPassiveForTest();
  resetConsumerForTest();
  resetDbHandleForTest();
  // THE DRIVER'S PENDING TIMER IS CLEARED HERE, and it is not optional. A scan
  // started by one case schedules a re-entry; left armed it would fire during
  // an unrelated case, against a fixture database that case has already closed.
  resetScanDriverForTest();
});

describe("init() contains every failure it can have", () => {
  it("survives a throwing sdk.runtime accessor — the shape checkCompat walks", async () => {
    const registered: Record<string, (...a: unknown[]) => unknown> = {};
    const logs: string[] = [];
    const sdk = makeFakeSdk({
      log: (msg: string) => logs.push(msg),
      register: (name: string, fn: unknown) => {
        registered[name] = fn as (...a: unknown[]) => unknown;
      },
    });
    // A revoked proxy, a lazily-resolved property, an SDK mid-teardown: all of
    // them present as an accessor that throws.
    Object.defineProperty(sdk, "runtime", {
      get(): never {
        throw new Error("sdk.runtime is not available on this build");
      },
    });

    await expect(init(sdk)).resolves.toBeUndefined();

    expect(
      logs.join("\n"),
      "init() failed and logged NOTHING. Caido surfaces neither a throw nor a " +
        "rejection from plugin code, so a failure outside the catch leaves no " +
        "trace of any kind.",
    ).toContain("init failed");
    expect(
      registered.getStatus,
      "no RPC was registered, so the operator has no way to ask what happened.",
    ).toBeTypeOf("function");
    const st = registered.getStatus() as Record<string, unknown>;
    expect(st.compatible).toBe(false);
    expect(String(st.reason)).toContain("init failed");
    // No hook on a build that could not even be checked.
    expect(sdk.calls.interceptResponseHandlers.length).toBe(0);
  });

  it("survives api.register throwing on the REFUSAL path", async () => {
    // The refusal path registers two RPCs. A duplicate name — what a re-init or
    // a hot reload produces — rejects, and that rejection used to escape init()
    // from outside the catch.
    const logs: string[] = [];
    const sdk = makeFakeSdk({
      // Below MIN_CAIDO, so init() takes the refusal path.
      version: "0.1.0",
      log: (msg: string) => logs.push(msg),
      register: (): never => {
        throw new Error("an api with this name is already registered");
      },
    });

    await expect(init(sdk)).resolves.toBeUndefined();
    expect(logs.join("\n")).toContain("INCOMPATIBLE");
    expect(sdk.calls.interceptResponseHandlers.length).toBe(0);
  });

  it("still refuses NORMALLY when nothing throws — the guard is not swallowed", async () => {
    // Non-vacuity: widening the try must not have turned the version guard into
    // a catch-all that reports "init failed" for an ordinary refusal.
    const registered: Record<string, (...a: unknown[]) => unknown> = {};
    const sdk = makeFakeSdk({
      version: "0.1.0",
      register: (name: string, fn: unknown) => {
        registered[name] = fn as (...a: unknown[]) => unknown;
      },
    });

    await init(sdk);

    const st = registered.getStatus() as Record<string, unknown>;
    expect(st.compatible).toBe(false);
    expect(String(st.reason)).toContain("requires Caido");
    expect(String(st.reason)).not.toContain("init failed");
    expect(registered.getCompat).toBeTypeOf("function");
  });
});

// ===========================================================================
// THE PHASE 5 RPC SURFACE AND THE INVALIDATION EVENT
// ===========================================================================
//
// Two of the cases below would otherwise fail SILENTLY, which is why they are
// here rather than left to the frontend to discover:
//
//   - THE DOUBLE REGISTRATION. `sdk.api.register` rejects a duplicate name, and
//     a re-init or a hot reload is exactly what produces one. A throw escaping
//     init() on this runtime leaves no hook, no RPC and no log line.
//   - THE SUMMARY'S KEY SET. The invalidation payload's whole security property
//     is negative — four scalars and NOTHING else (UI-07, T-05-35) — and a
//     negative property can only be asserted against the object that actually
//     crossed the boundary. A payload that quietly grew a `rows` field would be
//     invisible until it reached a listener that had not sanitised it.

describe("the Phase 5 RPC surface", () => {
  let fx: SqliteFixture;

  beforeEach(async () => {
    fx = createFixtureDb();
    // Migrated HERE and not left to init(): these cases seed rows before they
    // boot, and a seed against an unmigrated database fails with "no such
    // table". init()'s own migrate() then finds the ladder already at head and
    // is the no-op it is supposed to be.
    await migrate(fx.db);
  });

  afterEach(() => {
    fx.close();
    resetDbHandleForTest();
  });

  /** Run the real `init()` against the fixture database and hand back both the
   *  RPCs it registered and the fake it registered them on.
   *
   *  `runningAtRegistration` RECORDS THE DATABASE AT THE INSTANT EACH ENDPOINT
   *  BECAME REACHABLE — how many `scans` rows still said `running` right then.
   *  That is the only way to assert an ORDERING inside `init()` from outside it:
   *  a check after `init()` returns proves the sweep ran SOMETIME, not that it
   *  ran BEFORE the RPC surface was exposed, and "sometime" is exactly the
   *  window in which a caller can see a scan the sweep has not yet moved. */
  async function boot(projectId: string | null = "p1"): Promise<{
    rpc: Record<string, (...a: unknown[]) => unknown>;
    sdk: ReturnType<typeof makeFakeSdk>;
    runningAtRegistration: Record<string, number>;
  }> {
    const rpc: Record<string, (...a: unknown[]) => unknown> = {};
    const runningAtRegistration: Record<string, number> = {};
    const sdk = makeFakeSdk({
      projectId,
      db: () => Promise.resolve(fx.db),
      register: (name: string, fn: unknown) => {
        rpc[name] = fn as (...a: unknown[]) => unknown;
        runningAtRegistration[name] = (
          fx.raw
            .prepare("SELECT COUNT(*) AS n FROM scans WHERE state = 'running'")
            .get() as { n: number }
        ).n;
      },
    });
    await init(sdk);
    return { rpc, sdk, runningAtRegistration };
  }

  /** Seed one `running` scan row directly, as a previous process would have left
   *  it behind. */
  function seedRunningScan(scanId: string, projectId = "p1"): void {
    fx.raw
      .prepare(
        "INSERT INTO scans (project_id, scan_id, state, suspend_reason, operator_filter, epoch, " +
          "last_request_id, last_cursor, last_created_at, pages_walked, seen, admitted, " +
          "skipped_done, rejected, queued, started_at, updated_at, finished_at) " +
          "VALUES (?, ?, 'running', NULL, '', 0, '9001', 'cursor-9001', 1723600000000, " +
          "1, 20, 3, 1, 16, 3, 1756000000000, 1756000000000, NULL)",
      )
      .run(projectId, scanId);
  }

  function seedArtifact(sha256: string, lastSeenAt: number): void {
    fx.raw
      .prepare(
        "INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count) VALUES (?, ?, ?, ?, ?, ?, 1)",
      )
      .run("p1", sha256, 100, "script", lastSeenAt, lastSeenAt);
  }

  function seedAnalysis(sha256: string, state: string): void {
    fx.raw
      .prepare(
        "INSERT INTO analyses (project_id, sha256, detector_set_hash, scan_state, bytes_walked, started_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run("p1", sha256, DETECTOR_CORPUS_VERSION, state, 64, 1_700_000_000_000);
  }

  const PAGE_REQUEST = {
    projectId: "p1",
    sortKey: "last_seen",
    direction: "desc" as const,
    filter: null,
    cursor: null,
    limit: 10,
  };

  it("registers every contract endpoint on the success path, and each exactly once", async () => {
    const { sdk } = await boot();
    const names = sdk.calls.apiRegister;

    for (const expected of CONTRACT_ENDPOINTS) {
      expect(names, `${expected} was not registered`).toContain(expected);
    }
    // No name twice. `api.register` rejects a duplicate, so a repeat here is an
    // aborted init() in production rather than a harmless extra entry.
    expect(new Set(names).size).toBe(names.length);
  });

  it("getScanStatus answers `null` when no scan row exists — a real state, not an error", async () => {
    // NOT a zero-filled payload. A payload reading `seen: 0, admitted: 0`
    // describes a scan that has started and found nothing; `null` says there is
    // no scan. The Scan tab renders the start form for the second and the live
    // readout for the first, and collapsing them would put a counter strip full
    // of zeroes in front of an operator who has never pressed Start scan.
    const { rpc } = await boot();
    await expect(rpc.getScanStatus()).resolves.toBeNull();
  });

  it("startScan inserts ONE running row and getScanStatus then reports it", async () => {
    // The tracer's RPC half, end to end against the real migration ladder.
    const { rpc } = await boot();

    const started = (await rpc.startScan(null, { operatorFilter: "" })) as {
      outcome: string;
    };
    expect(started.outcome, JSON.stringify(started)).toBe("started");

    const status = (await rpc.getScanStatus()) as Record<string, unknown>;
    expect(status, "the scan was not read back").not.toBeNull();
    expect(status.state).toBe("running");
    expect(status.seen).toBe(0);
    // The composed filter crosses the RPC so the operator can CHECK D-05's
    // promise rather than take it. It is the exact string that will be sent.
    expect(String(status.composedFilter)).toContain("resp.code.gte:200");
    // REQUIRED, and `false` on the tracer. Without it a healthy backpressure
    // hold is indistinguishable from a blocked thread.
    expect(status.heldAtWatermark).toBe(false);
    // ABSENT, not zero: `analysed` belongs to the consumer and plan 06-06 wires
    // it. A zero here would read as "nothing has been analysed".
    expect(status.analysed).toBeNull();
  });

  it("a SECOND startScan on a running project refuses with a DefMiner code", async () => {
    const { rpc } = await boot();
    await rpc.startScan(null, { operatorFilter: "" });

    const second = (await rpc.startScan(null, { operatorFilter: "" })) as {
      outcome: string;
      reason?: string;
    };
    expect(second.outcome).toBe("refused");
    // A CLOSED DefMiner-authored code, never the driver's constraint message —
    // which would carry the bound parameters across the RPC boundary.
    expect(second.reason).toBe("already-running");
  });

  it("startScan REJECTS a comment-bearing clause with a closed code and writes NO row", async () => {
    // T-06-20. HTTPQL has `//` and `/* */` comments, and a comment is the one
    // construct that can reach across a parenthesis. `validateOperatorClause`
    // refuses it with a DefMiner-authored code — never Caido's parser text,
    // which would carry the operator's own clause back through a sentence.
    const { rpc } = await boot();
    const outcome = (await rpc.startScan(null, {
      operatorFilter: 'req.host.eq:"a.example" // everything else',
    })) as { outcome: string; reason?: string };

    expect(outcome.outcome).toBe("clause-rejected");
    // A MEMBER OF THE CLOSED SET, asserted against the array rather than against
    // a copy of one of its strings.
    expect(OPERATOR_CLAUSE_REJECTIONS).toContain(outcome.reason);
    expect(outcome.reason).toBe("comment_construct");

    // NOTHING WAS STARTED. Not a suspended row, not a discarded one, not a row
    // at all — the operator's next press of Start scan is a fresh attempt.
    await expect(rpc.getScanStatus()).resolves.toBeNull();
    expect(await rpc.listScans(null, { projectId: "p1", limit: null })).toEqual(
      [],
    );
  });

  it("startScan ACCEPTS a valid clause and composes it LAST, exactly as sent", async () => {
    // The other half of the same claim: 06-04's validator is wired, so a clause
    // that passes is stored and composed rather than refused. D-05's promise is
    // that the operator may narrow and never widen, and `composedFilter` is what
    // makes that checkable rather than merely stated.
    const { rpc } = await boot();
    const clause = 'req.host.eq:"a.example"';
    const started = (await rpc.startScan(null, {
      operatorFilter: clause,
    })) as { outcome: string };
    expect(started.outcome, JSON.stringify(started)).toBe("started");

    const status = (await rpc.getScanStatus()) as Record<string, unknown>;
    expect(status.operatorFilter).toBe(clause);
    expect(String(status.composedFilter).endsWith(`(${clause})`)).toBe(true);
  });

  it("getScanStatus's composedFilter is `composeScanFilter`'s output BYTE FOR BYTE", async () => {
    // Rebuilt through the ONE producer, never stored and never concatenated at
    // the registration site. Storing the composed string would let it drift from
    // what the next page will actually send, and the whole value of showing it is
    // that it IS what will be sent.
    const { rpc } = await boot();
    await rpc.startScan(null, { operatorFilter: 'req.host.eq:"a.example"' });
    const status = (await rpc.getScanStatus()) as Record<string, unknown>;

    const row = fx.raw
      .prepare("SELECT last_request_id, operator_filter FROM scans LIMIT 1")
      .get() as { last_request_id: string; operator_filter: string };
    expect(status.composedFilter).toBe(
      composeScanFilter(
        positionClause(row.last_request_id),
        row.operator_filter,
      ),
    );
    // REQUIRED, AND A BOOLEAN ON EVERY NON-NULL RETURN. 06-UI-SPEC.md § "The
    // scan status payload — required fields" is binding: without an explicit
    // hold signal a healthy backpressure hold is indistinguishable from a
    // blocked QuickJS thread, and the stall marker cries wolf on the most common
    // healthy state of a long backfill.
    expect(typeof status.heldAtWatermark).toBe("boolean");
  });

  it("D-11's STARTUP SWEEP runs BEFORE any scan endpoint is reachable (ERR-02)", async () => {
    // A `running` row left behind by a previous process. Nothing else in the
    // system will ever move it: the producer refuses to advance a scan it cannot
    // find in memory, the one-at-a-time rule refuses a new start beside it, and
    // the operator is shown a badge saying it is scanning.
    seedRunningScan("s-orphan");

    const { rpc, runningAtRegistration } = await boot();

    // THE ORDERING ASSERTION. At the instant each scan endpoint became callable,
    // no row was still `running`. A check after init() returns would only prove
    // the sweep ran SOMETIME — and "sometime" is exactly the window in which a
    // caller can observe a scan the sweep has not yet moved.
    for (const name of [
      "startScan",
      "getScanStatus",
      "pauseScan",
      "resumeScan",
      "discardScan",
      "listScans",
    ]) {
      expect(
        runningAtRegistration[name],
        `${name} was registered while a scan was still \`running\``,
      ).toBe(0);
    }

    const status = (await rpc.getScanStatus()) as Record<string, unknown>;
    expect(status.state).toBe("suspended");
    // A CLOSED CODE, so the surface can say who stopped it and what to do next.
    expect(status.suspendReason).toBe("process_restarted");
    // NOTHING AUTO-RESUMED, and the position survived: `last_cursor` is dropped
    // because its lifetime across a restart is unmeasured (O-04), while
    // `last_request_id` is the re-derivable boundary that does not depend on
    // that answer.
    const row = fx.raw
      .prepare("SELECT last_cursor, last_request_id FROM scans LIMIT 1")
      .get() as { last_cursor: string | null; last_request_id: string };
    expect(row.last_cursor).toBeNull();
    expect(row.last_request_id).toBe("9001");
  });

  it("a start beside a SUSPENDED scan is refused with its own code, not the running one", async () => {
    // The operator's next action differs — resume or discard, not pause — and
    // 06-UI-SPEC.md's start form has a separate sentence for each. Collapsing
    // them tells the operator to press a control that is not on screen.
    seedRunningScan("s-orphan");
    const { rpc } = await boot();

    const refused = (await rpc.startScan(null, { operatorFilter: "" })) as {
      outcome: string;
      reason?: string;
    };
    expect(refused.outcome).toBe("refused");
    expect(refused.reason).toBe("already-suspended");
  });

  it("PAUSE keeps the position, RESUME returns it to running, DISCARD destroys the position only", async () => {
    const { rpc } = await boot();
    const started = (await rpc.startScan(null, { operatorFilter: "" })) as {
      outcome: string;
      scanId: string;
    };
    const ref = { projectId: "p1", scanId: started.scanId };

    const paused = (await rpc.pauseScan(null, ref)) as Record<string, unknown>;
    expect(paused.ok).toBe(true);
    expect(paused.changed).toBe(true);
    expect(paused.state).toBe("suspended");
    expect(paused.suspendReason).toBe("operator_paused");
    expect(paused.reason).toBeNull();

    // A SECOND PAUSE IS AN OPERATOR DOUBLE-CLICK, NOT A FAILURE. The guard
    // declining is the guard working, and `ok` and `changed` are not the same
    // claim.
    const again = (await rpc.pauseScan(null, ref)) as Record<string, unknown>;
    expect(again.ok).toBe(true);
    expect(again.changed).toBe(false);
    expect(again.reason).toBe("guard-declined");

    const resumed = (await rpc.resumeScan(null, ref)) as Record<
      string,
      unknown
    >;
    expect(resumed.changed).toBe(true);
    expect(resumed.state).toBe("running");
    expect(resumed.suspendReason).toBeNull();

    const discarded = (await rpc.discardScan(null, ref)) as Record<
      string,
      unknown
    >;
    expect(discarded.changed).toBe(true);
    expect(discarded.state).toBe("discarded");

    // The scan is no longer active, so the surface renders the start form again
    // — and the history still carries what it did.
    await expect(rpc.getScanStatus()).resolves.toBeNull();
    const history = (await rpc.listScans(null, {
      projectId: "p1",
      limit: null,
    })) as { scanId: string; state: string }[];
    expect(history).toHaveLength(1);
    expect(history[0]?.state).toBe("discarded");
  });

  it("D-04: a project change SUSPENDS the running scan, and `getScanStatus` is where it is noticed", async () => {
    // Nothing is written under a stale project and nothing silently restarts.
    // The per-page re-check lives in `runScanProducer`, which has no driver in
    // this build — so the polled read is the only call that can notice the
    // change in time to tell the operator the truth about it. The correction is
    // the same guarded statement either way and can only move a row DEFENSIVELY.
    const { rpc, sdk } = await boot();
    await rpc.startScan(null, { operatorFilter: "" });
    expect(((await rpc.getScanStatus()) as Record<string, unknown>).state).toBe(
      "running",
    );

    // Away and back. The epoch counter is MONOTONIC, so returning to the same
    // project gives a higher number and never the old one — which is exactly why
    // a resume re-bases it.
    await emitProjectChange(sdk, makeFakeProject("p2"));
    await emitProjectChange(sdk, makeFakeProject("p1"));

    const status = (await rpc.getScanStatus()) as Record<string, unknown>;
    expect(status.state).toBe("suspended");
    expect(status.suspendReason).toBe("project_changed");
    // IT KEPT ITS PLACE. D-04 suspends; it does not discard.
    expect(status.pagesWalked).toBe(0);

    // AND IT RESUMES ON EXPLICIT OPERATOR ACTION, from the project it belongs
    // to. Without the epoch re-base this is where the one-way door would show:
    // the resume would land and the very next status read would suspend it
    // again, for ever.
    const ref = { projectId: "p1", scanId: String(status.scanId) };
    const resumed = (await rpc.resumeScan(null, ref)) as Record<
      string,
      unknown
    >;
    expect(resumed.changed).toBe(true);
    const after = (await rpc.getScanStatus()) as Record<string, unknown>;
    expect(
      after.state,
      "the resume did not stick — D-04 is a one-way door",
    ).toBe("running");
    expect(after.suspendReason).toBeNull();
  });

  it("a lifecycle command on an unknown scan answers `no-scan`, never a driver message", async () => {
    const { rpc } = await boot();
    for (const name of ["pauseScan", "resumeScan", "discardScan"]) {
      const outcome = (await rpc[name]?.(null, {
        projectId: "p1",
        scanId: "nope",
      })) as Record<string, unknown>;
      expect(outcome.ok, name).toBe(false);
      expect(outcome.reason, name).toBe("no-scan");
      expect(outcome.state, name).toBeNull();
    }
  });

  it("`listScans` carries a PROJECTION and no column this table may grow", async () => {
    const { rpc } = await boot();
    await rpc.startScan(null, { operatorFilter: "" });
    const history = (await rpc.listScans(null, {
      projectId: "p1",
      limit: null,
    })) as Record<string, unknown>[];

    expect(history).toHaveLength(1);
    // MAPPED FIELD BY FIELD, never spread. `epoch`, `last_cursor` and
    // `last_request_id` are the backend's own bookkeeping and must not cross.
    expect(Object.keys(history[0] ?? {}).sort()).toEqual([
      "admitted",
      "finishedAt",
      "lastCreatedAt",
      "operatorFilter",
      "pagesWalked",
      "queued",
      "rejected",
      "scanId",
      "seen",
      "skippedDone",
      "startedAt",
      "state",
      "suspendReason",
    ]);
  });

  it("returns a page whose rows come from the reads module", async () => {
    seedArtifact("d1", 1_700_000_002);
    seedArtifact("d2", 1_700_000_001);
    const { rpc } = await boot();

    const page = (await rpc.listArtifactsPage(null, PAGE_REQUEST)) as {
      rows: { sha256: string }[];
      scanned: number;
      exhausted: boolean;
    };

    expect(page.rows.map((r) => r.sha256)).toEqual(["d1", "d2"]);
    expect(page.scanned).toBe(2);
    expect(page.exhausted).toBe(true);
  });

  it("returns an EMPTY page rather than throwing when no project is resolved", async () => {
    seedArtifact("d1", 1_700_000_002);
    const { rpc } = await boot(null);

    const page = (await rpc.listArtifactsPage(null, PAGE_REQUEST)) as {
      rows: unknown[];
      nextCursor: unknown;
      scanned: number;
      exhausted: boolean;
    };

    expect(page.rows).toEqual([]);
    expect(page.nextCursor).toBeNull();
    expect(page.scanned).toBe(0);
    expect(page.exhausted).toBe(true);
  });

  it("ignores a caller-supplied project id and uses the resolved one", async () => {
    // The frontend is not the authority on which project is active. A read that
    // trusted this field would page another project's rows out of the one shared
    // SQLite file (T-05-34).
    fx.raw
      .prepare(
        "INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count) VALUES (?, ?, ?, ?, ?, ?, 1)",
      )
      .run("p2", "other", 100, "script", 1_700_000_009, 1_700_000_009);
    seedArtifact("mine", 1_700_000_001);
    const { rpc } = await boot("p1");

    const page = (await rpc.listArtifactsPage(null, {
      ...PAGE_REQUEST,
      projectId: "p2",
    })) as { rows: { sha256: string }[] };

    expect(page.rows.map((r) => r.sha256)).toEqual(["mine"]);
  });

  it("counts the reachable rows", async () => {
    seedArtifact("d1", 1);
    seedArtifact("d2", 2);
    const { rpc } = await boot();
    expect(
      await rpc.countInventory(null, {
        projectId: "p1",
        table: "artifacts",
        filter: null,
      }),
    ).toEqual({ visible: 2, hiddenBySuppression: 0, suppressionRuleCount: 0 });
  });

  it("counts nothing when no project is resolved", async () => {
    seedArtifact("d1", 1);
    const { rpc } = await boot(null);
    expect(
      await rpc.countInventory(null, {
        projectId: "p1",
        table: "artifacts",
        filter: null,
      }),
    ).toEqual({ visible: 0, hiddenBySuppression: 0, suppressionRuleCount: 0 });
  });

  it("returns the contract version constant, and it is past version 1", async () => {
    const { rpc } = await boot();
    expect(rpc.getContractVersion()).toBe(CONTRACT_VERSION);
    // THE BUMP IS PART OF THE CONTRACT, not bookkeeping. `listArtifactsPage`
    // answers a WIDER ROW than version 1 did, and a frontend built against the
    // old shape would read the new one with the old expectations — silently, on
    // this runtime. Asserted as an inequality rather than as a literal so the
    // next bump does not have to edit a number in two places.
    expect(CONTRACT_VERSION).toBeGreaterThan(1);
  });

  it("carries the analysis state onto the paged artifact rows", async () => {
    seedArtifact("d1", 1_700_000_002);
    seedArtifact("d2", 1_700_000_001);
    seedAnalysis("d1", "partial");
    const { rpc } = await boot();

    const page = (await rpc.listArtifactsPage(null, PAGE_REQUEST)) as {
      rows: { sha256: string; scan_state: string | null }[];
    };
    expect(page.rows.map((r) => [r.sha256, r.scan_state])).toEqual([
      ["d1", "partial"],
      // NULL for the artifact with no analysis. Not "done", which is the
      // silence UI-09 forbids, and not an omitted field, which the frontend
      // would read the same way.
      ["d2", null],
    ]);
  });

  it("serves the panel's analysis WITHOUT the stored error column", async () => {
    seedArtifact("d1", 1_700_000_002);
    seedAnalysis("d1", "failed");
    const { rpc } = await boot();

    const analysis = (await rpc.getArtifactAnalysis(null, {
      projectId: "p1",
      sha256: "d1",
    })) as Record<string, unknown>;

    // THE KEY SET OF THE OBJECT THAT ACTUALLY CROSSED THE BOUNDARY, not the
    // code that built it — the same device the invalidation payload's own case
    // uses. A mapping that quietly grew an `error` field fails here rather than
    // at a panel that has not sanitised it (T-05-51).
    expect(Object.keys(analysis).sort()).toEqual([
      "byteLen",
      "bytesWalked",
      "detectorSetHash",
      "finishedAt",
      "scanState",
      "sha256",
      "startedAt",
    ]);
    expect(analysis.scanState).toBe("failed");
    expect(analysis.byteLen).toBe(100);
  });

  it("answers null for an artifact with no analysis, and when no project is resolved", async () => {
    seedArtifact("d1", 1_700_000_002);
    const withProject = await boot();
    expect(
      await withProject.rpc.getArtifactAnalysis(null, {
        projectId: "p1",
        sha256: "d1",
      }),
    ).toBeNull();

    resetDbHandleForTest();
    const noProject = await boot(null);
    expect(
      await noProject.rpc.getArtifactAnalysis(null, {
        projectId: "p1",
        sha256: "d1",
      }),
    ).toBeNull();
  });

  it("moves a failed analysis and reports the state it READ BACK", async () => {
    seedArtifact("d1", 1_700_000_002);
    seedAnalysis("d1", "failed");
    const { rpc } = await boot();

    const outcome = (await rpc.retryAnalysis(null, {
      projectId: "p1",
      sha256: "d1",
      detectorSetHash: DETECTOR_CORPUS_VERSION,
    })) as { ok: boolean; changed: boolean; state: string | null };

    expect(outcome).toEqual({ ok: true, changed: true, state: "pending" });

    // And the panel's own read agrees, which is the only way an operator can
    // tell a reported state from a persisted one.
    const after = (await rpc.getArtifactAnalysis(null, {
      projectId: "p1",
      sha256: "d1",
    })) as { scanState: string };
    expect(after.scanState).toBe("pending");
  });

  it("declines to move a running analysis, and says so as changed: false", async () => {
    seedArtifact("d1", 1_700_000_002);
    seedAnalysis("d1", "running");
    const { rpc } = await boot();

    expect(
      await rpc.retryAnalysis(null, {
        projectId: "p1",
        sha256: "d1",
        detectorSetHash: DETECTOR_CORPUS_VERSION,
      }),
    ).toEqual({ ok: true, changed: false, state: "running" });
  });

  it("fails CLOSED when no project is resolved — never ok with no change", async () => {
    seedArtifact("d1", 1_700_000_002);
    seedAnalysis("d1", "failed");
    const { rpc } = await boot(null);

    // `ok: false`, NOT `ok: true, changed: false`. The panel distinguishes "the
    // guard declined" from "the write did not happen", and collapsing the two
    // shows the operator a decline that never ran (T-05-55).
    expect(
      await rpc.retryAnalysis(null, {
        projectId: "p1",
        sha256: "d1",
        detectorSetHash: DETECTOR_CORPUS_VERSION,
      }),
    ).toEqual({ ok: false, changed: false, state: null });
  });

  it("ignores a caller-supplied project id on the retry path too", async () => {
    fx.raw
      .prepare(
        "INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count) VALUES (?, ?, ?, ?, ?, ?, 1)",
      )
      .run("p2", "theirs", 100, "script", 1, 1);
    fx.raw
      .prepare(
        "INSERT INTO analyses (project_id, sha256, detector_set_hash, scan_state, started_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run("p2", "theirs", DETECTOR_CORPUS_VERSION, "failed", 1);
    const { rpc } = await boot("p1");

    // The caller names p2 and owns nothing there. The server substitutes p1,
    // finds no such row, and the other project's analysis is untouched.
    expect(
      await rpc.retryAnalysis(null, {
        projectId: "p2",
        sha256: "theirs",
        detectorSetHash: DETECTOR_CORPUS_VERSION,
      }),
    ).toEqual({ ok: true, changed: false, state: null });

    const row = fx.raw
      .prepare("SELECT scan_state FROM analyses WHERE project_id = ?")
      .get("p2") as { scan_state: string };
    expect(row.scan_state).toBe("failed");
  });

  it("registers the surface TWICE without a throw escaping init()", async () => {
    // The re-initialisation case. A real `api.register` rejects the second
    // registration of a name; the fake below reproduces that, and init() must
    // still resolve, still log, and still leave a getStatus to ask.
    const seen = new Set<string>();
    const logs: string[] = [];
    const rpc: Record<string, (...a: unknown[]) => unknown> = {};
    const sdk = makeFakeSdk({
      projectId: "p1",
      db: () => Promise.resolve(fx.db),
      log: (msg: string) => logs.push(msg),
      register: (name: string, fn: unknown) => {
        if (seen.has(name)) {
          throw new Error("an api with this name is already registered");
        }
        seen.add(name);
        rpc[name] = fn as (...a: unknown[]) => unknown;
      },
    });

    // THE SAME STUB, TWICE. A fresh one per call would give the second init() a
    // clean name set and prove nothing — the case under test is precisely that
    // the SECOND registration of a name it already holds rejects.
    await expect(init(sdk)).resolves.toBeUndefined();
    resetDbHandleForTest();
    await expect(init(sdk)).resolves.toBeUndefined();

    // The second init() hit the duplicate and was CONTAINED: it reported the
    // failure where an operator can reach it rather than dying silently.
    expect(logs.join("\n")).toContain("init failed");
    expect(rpc.getStatus).toBeTypeOf("function");
  });

  it("does not add any page endpoint to a refusal path", async () => {
    // A build that refuses has no database to serve a page from, and every name
    // it registers is a name the success path may then not register.
    const sdk = makeFakeSdk({ version: "0.1.0" });
    await init(sdk);
    expect(sdk.calls.apiRegister).toEqual(["getStatus", "getCompat"]);
  });
});

// ===========================================================================
// THE EXACT ENDPOINT SET OF EVERY REFUSAL PATH
// ===========================================================================
//
// `init()` refuses in three distinct places, and each one returns early after a
// HAND-WRITTEN pair of `api.register` calls:
//
//   1. checkCompat          — the Caido build is below MIN_CAIDO;
//   2. checkRuntimeSurfaces — a Database, Statement or capability is missing;
//   3. projectChangeArmed   — project isolation could not be installed.
//
// Plus the catch, which registers `getStatus` ALONE and guards even that
// against the already-registered case.
//
// Only path 1 was pinned — by "does not add any page endpoint to a refusal
// path" above. Paths 2 and 3 and the catch had nothing: plan 05-12 checked
// "the refusal path is unchanged" by reading a `git diff`, which is a review
// step and not a test. A fourth `api.register` added to one of them tomorrow,
// or a `getCompat` dropped from one, would leave the suite green.
//
// That silence is not cosmetic. `CompatRefusal.vue` renders a refusal out of
// exactly the endpoints the path it is rendering actually registered — it has
// no other source of truth, and Caido surfaces neither a throw nor a rejection
// when it calls one that is not there. So the assertions below are `toEqual`
// and NOT `toContain`: "at least these two" is precisely the claim that cannot
// catch either edit.

describe("the exact endpoint set of every refusal path", () => {
  let fx: SqliteFixture;

  beforeEach(async () => {
    // Migrated here, as in the Phase 5 surface block above: paths 2 and 3 are
    // reached only by a build that opened and migrated a database cleanly, so
    // an unmigrated handle would refuse for the wrong reason and prove nothing.
    fx = createFixtureDb();
    await migrate(fx.db);
  });

  afterEach(() => {
    fx.close();
    resetDbHandleForTest();
  });

  /** The two endpoints a refusing build owes an operator: the status it refused
   *  with, and the surface matrix saying which probe failed. */
  const REFUSAL_SURFACE = ["getStatus", "getCompat"];

  /** The fixture handle with the ONE probe `init()` prepares — `SELECT 1` — made
   *  to reject, and every other statement left working.
   *
   *  This is the only way to reach refusal path 2 honestly. `init()` catches
   *  that rejection, leaves `statement` undefined, and `checkRuntimeSurfaces`
   *  then finds Statement.run/get/all missing on a database that migrated fine.
   *  Breaking `exec` or `prepare` outright would instead take the CATCH path via
   *  `migrate()`, which is a different case with a different endpoint set. */
  function noProbeStatement(db: Database): Database {
    // Both methods are delegated BY HAND rather than spread. `Database` is a
    // class, and a spread of a class instance carries no methods in the type
    // system — `{ ...db }` typechecks as `{}` and the result would then be
    // missing the `Database.exec` that `checkRuntimeSurfaces` probes for.
    return {
      exec: (sql: string) => db.exec(sql),
      prepare: (sql: string) =>
        sql === "SELECT 1"
          ? Promise.reject(new Error("no statement is available on this build"))
          : db.prepare(sql),
    };
  }

  it("registers exactly getStatus and getCompat when a RUNTIME SURFACE is missing", async () => {
    const sdk = makeFakeSdk({
      db: () => Promise.resolve(noProbeStatement(fx.db)),
    });

    await init(sdk);

    const logs = sdk.calls.consoleLog.join("\n");
    // Non-vacuity: this must be refusal path 2 and not the catch, which would
    // also register a short list. The named surface is what tells them apart.
    expect(logs, "this did not take the runtime-surface refusal").toContain(
      "Statement.run",
    );
    expect(logs).not.toContain("init failed");
    expect(
      sdk.calls.apiRegister,
      "the runtime-surface refusal registers a set CompatRefusal.vue does not expect",
    ).toEqual(REFUSAL_SURFACE);
    expect(sdk.calls.interceptResponseHandlers).toHaveLength(0);
  });

  it("registers exactly getStatus and getCompat when project isolation cannot be armed", async () => {
    const sdk = makeFakeSdk({ db: () => Promise.resolve(fx.db) });
    // The disarming case: `onProjectChange` cannot be registered, so a project
    // switch would go unnoticed and ingestion refuses rather than writing one
    // project's traffic under another's id (CORE-09).
    sdk.events.onProjectChange = (): never => {
      throw new Error("onProjectChange is not available on this build");
    };

    await init(sdk);

    const logs = sdk.calls.consoleLog.join("\n");
    expect(logs, "this did not take the isolation refusal").toContain(
      "project isolation unavailable",
    );
    expect(logs).not.toContain("init failed");
    expect(
      sdk.calls.apiRegister,
      "the isolation refusal registers a set CompatRefusal.vue does not expect",
    ).toEqual(REFUSAL_SURFACE);
    expect(sdk.calls.interceptResponseHandlers).toHaveLength(0);
  });

  it("registers exactly getStatus — and NO getCompat — when init throws", async () => {
    // The catch is deliberately NOT a refusal path: it reports a failure it did
    // not anticipate, so it registers the one endpoint that can carry a reason
    // and does not claim a compatibility report it never computed.
    const sdk = makeFakeSdk({
      db: () => Promise.reject(new Error("meta.db() is unavailable")),
    });

    await init(sdk);

    expect(sdk.calls.consoleLog.join("\n")).toContain("init failed");
    expect(
      sdk.calls.apiRegister,
      "the catch path's endpoint set changed",
    ).toEqual(["getStatus"]);
    expect(sdk.calls.interceptResponseHandlers).toHaveLength(0);
  });

  it("registers NOTHING outside the contract on the success path", async () => {
    // The negative half of "registers every contract endpoint on the success
    // path" above, which asserts presence and uniqueness but would not notice a
    // fifteenth name — and a name the success path registers is a name a
    // refusal path may then not register, since `api.register` rejects a
    // duplicate and the rejection aborts whichever init() hits it second.
    const sdk = makeFakeSdk({ db: () => Promise.resolve(fx.db) });

    await init(sdk);

    expect(
      sdk.calls.interceptResponseHandlers,
      "this did not take the success path",
    ).toHaveLength(1);
    const extra = sdk.calls.apiRegister.filter(
      (name) => !CONTRACT_ENDPOINTS.includes(name),
    );
    expect(
      extra,
      "an endpoint was registered that no contract type declares",
    ).toEqual([]);
  });
});

describe("the invalidation summary the consumer emits", () => {
  let fx: SqliteFixture;

  beforeEach(async () => {
    fx = createFixtureDb();
    await migrate(fx.db);
  });

  afterEach(() => {
    fx.close();
    resetDbHandleForTest();
  });

  /** Boot the real `init()`, push `n` responses through the real hook, and drain
   *  the real consumer once. */
  async function ingest(n: number): Promise<ReturnType<typeof makeFakeSdk>> {
    const bodies = Array.from(
      { length: n },
      (_, i) => `console.log(${String(i)});\n`,
    );
    const sdk = makeFakeSdk({
      projectId: "p1",
      db: () => Promise.resolve(fx.db),
      get: (id: string) =>
        Promise.resolve({
          request: makeFakeRequest({ id }),
          response: makeFakeResponse({
            id,
            bodyBytes: bodies[Number(id)] ?? "console.log(0);\n",
          }),
        }),
    });
    await init(sdk);

    const hook = sdk.calls.interceptResponseHandlers[0];
    expect(hook, "no intercept hook was registered").toBeTypeOf("function");
    for (let i = 0; i < n; i += 1) {
      const id = String(i);
      hook?.(
        sdk,
        makeFakeRequest({ id }),
        makeFakeResponse({ id, bodyBytes: bodies[i] }),
      );
    }
    await drainConsumerForTest();
    return sdk;
  }

  it("emits exactly one summary per category for a batch of writes", async () => {
    const sdk = await ingest(3);

    const artifacts = sdk.calls.apiSend.filter(
      (s) => (s.args[0] as { category?: string }).category === "artifacts",
    );
    expect(artifacts.length, "one summary per category per batch").toBe(1);

    const summary = artifacts[0]?.args[0] as {
      projectId: string;
      category: string;
      changedCount: number;
      newestId: string;
    };
    expect(artifacts[0]?.event).toBe(INVALIDATION_EVENT);
    expect(summary.projectId).toBe("p1");
    expect(summary.category).toBe("artifacts");
    expect(summary.changedCount).toBe(3);
    expect(summary.newestId).toMatch(/^[0-9a-f]{64}$/);

    // The edge category too — an artifact written without its observation being
    // announced would leave the sightings table stale on screen.
    const observations = sdk.calls.apiSend.filter(
      (s) => (s.args[0] as { category?: string }).category === "observations",
    );
    expect(observations.length).toBe(1);
  });

  it("carries EXACTLY the four contract fields and nothing else", async () => {
    const sdk = await ingest(1);
    expect(sdk.calls.apiSend.length).toBeGreaterThan(0);

    for (const sent of sdk.calls.apiSend) {
      expect(sent.event).toBe(INVALIDATION_EVENT);
      expect(sent.args.length, "the payload is ONE object, not a spread").toBe(
        1,
      );
      expect(
        Object.keys(sent.args[0] as object).sort(),
        "a field arrived on the invalidation payload that the contract does " +
          "not declare. Four scalars, no rows, no bodies, no URLs (UI-07, " +
          "T-05-35) — the frontend re-queries, it is never pushed data.",
      ).toEqual(["category", "changedCount", "newestId", "projectId"]);

      const payload = sent.args[0] as Record<string, unknown>;
      for (const [k, v] of Object.entries(payload)) {
        expect(
          ["string", "number"].includes(typeof v),
          `${k} is a ${typeof v}, not a scalar`,
        ).toBe(true);
      }
      // Not a URL, not a body, not a target-controlled string.
      expect(String(payload.newestId)).not.toMatch(/https?:/i);
    }
  });

  it("emits nothing at all when nothing was written", async () => {
    const sdk = await ingest(0);
    expect(sdk.calls.apiSend).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// THE EXPORT ENDPOINT (UI-06, STORE-08, decision D-04)
// ---------------------------------------------------------------------------
//
// The one behaviour a chunked export gets wrong INVISIBLY is the audit row: a
// naive implementation writes one per call, so a five-chunk export leaves five
// records of a single disclosure and the log becomes unreadable at exactly the
// moment somebody is reading it to answer "what did I export". The
// one-row-per-completed-export assertion below is why this block exists.
//
// The double-registration case is NOT repeated here — it is already covered by
// "registers the surface TWICE without a throw escaping init()" above, which
// drives the whole surface including this endpoint.

describe("the export endpoint (UI-06, D-04)", () => {
  let fx: SqliteFixture;
  /** Observation reads to allow before the driver starts rejecting. Reset per
   *  case; `Infinity` is the healthy database. */
  let allowObservationReads = Number.POSITIVE_INFINITY;
  let observationReads = 0;

  beforeEach(async () => {
    fx = createFixtureDb();
    await migrate(fx.db);
    allowObservationReads = Number.POSITIVE_INFINITY;
    observationReads = 0;
  });

  afterEach(() => {
    fx.close();
    resetDbHandleForTest();
  });

  /** The fixture handle with a failure injected at a chosen read.
   *
   *  A WRAPPER RATHER THAN A SPY: the store prepares its statement INSIDE the
   *  read, so the only place a driver rejection can be introduced is `prepare`,
   *  which is also where the real one comes from. */
  function guardedDb(): Database {
    const db: Database = {
      exec: (sql: string) => fx.db.exec(sql),
      prepare: (sql: string) => {
        if (sql.includes("FROM observations")) {
          observationReads += 1;
          if (observationReads > allowObservationReads) {
            // A REJECTION, NOT A THROW. The fixture's own header records the
            // difference and why it matters: `node:sqlite` throws where Caido's
            // driver REJECTS, and store code is written against a rejection. A
            // synchronous throw here would exercise a shape the real driver
            // never produces.
            return Promise.reject(new Error("simulated driver rejection"));
          }
        }
        return fx.db.prepare(sql);
      },
    };
    return db;
  }

  async function boot(projectId: string | null = "p1"): Promise<{
    rpc: Record<string, (...a: unknown[]) => unknown>;
    sdk: ReturnType<typeof makeFakeSdk>;
  }> {
    const rpc: Record<string, (...a: unknown[]) => unknown> = {};
    const db = guardedDb();
    const sdk = makeFakeSdk({
      projectId,
      db: () => Promise.resolve(db),
      register: (name: string, fn: unknown) => {
        rpc[name] = fn as (...a: unknown[]) => unknown;
      },
    });
    await init(sdk);
    return { rpc, sdk };
  }

  function seedObservation(i: number): void {
    fx.raw
      .prepare(
        "INSERT INTO observations (project_id, sha256, request_id, url, status, content_type, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        "p1",
        String(i).padStart(64, "0"),
        `req_${String(i).padStart(4, "0")}`,
        `https://assets.example.test/a${String(i)}.js?token=<redacted>`,
        200,
        "application/javascript",
        1_767_000_000_000 + i,
      );
  }

  function seedDegradedArtifact(sha256: string): void {
    fx.raw
      .prepare(
        "INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count) VALUES (?, ?, ?, ?, ?, ?, 1)",
      )
      .run("p1", sha256, 100, "script", 1, 1);
    fx.raw
      .prepare(
        "INSERT INTO analyses (project_id, sha256, detector_set_hash, scan_state, bytes_walked, started_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run("p1", sha256, DETECTOR_CORPUS_VERSION, "partial", 64, 1);
  }

  const REQUEST = {
    projectId: "p1",
    table: "observations" as const,
    format: "csv" as const,
    mode: "redacted" as ExportRedactionMode,
    filter: null,
    sortKey: "observed_at",
    direction: "asc" as const,
    chunkIndex: 0,
    cursor: null as unknown,
    chunkRows: 2,
  };

  type Chunk = {
    outcome: string;
    reason?: string;
    chunk?: {
      filename: string;
      contentType: string;
      text: string;
      chunkIndex: number;
      rows: number;
      hasMore: boolean;
      nextCursor: unknown;
    };
  };

  function auditRows(): { kind: string; detail: string | null }[] {
    return fx.raw
      .prepare("SELECT kind, detail FROM audit WHERE project_id = ?")
      .all("p1") as { kind: string; detail: string | null }[];
  }

  /** Drive the whole export to completion, returning the concatenated bytes and
   *  the number of calls it took. */
  async function drain(
    rpc: Record<string, (...a: unknown[]) => unknown>,
    overrides: Partial<typeof REQUEST> = {},
  ): Promise<{ text: string; calls: number; last: Chunk }> {
    let text = "";
    let cursor: unknown = null;
    let index = 0;
    let last: Chunk = { outcome: "empty" };
    for (;;) {
      last = (await rpc.exportInventory(null, {
        ...REQUEST,
        ...overrides,
        chunkIndex: index,
        cursor,
      })) as Chunk;
      if (last.outcome !== "chunk" || last.chunk === undefined) break;
      text += last.chunk.text;
      if (!last.chunk.hasMore) break;
      cursor = last.chunk.nextCursor;
      index += 1;
      expect(index, "the chunk loop did not terminate").toBeLessThan(20);
    }
    return { text, calls: index + 1, last };
  }

  it("is registered on the success path", async () => {
    const { sdk } = await boot();
    expect(sdk.calls.apiRegister).toContain("exportInventory");
    expect(new Set(sdk.calls.apiRegister).size).toBe(
      sdk.calls.apiRegister.length,
    );
  });

  it("returns a filename, a content type, the bytes, the index and a more flag", async () => {
    seedObservation(0);
    const { rpc } = await boot();
    const result = (await rpc.exportInventory(null, REQUEST)) as Chunk;
    expect(result.outcome).toBe("chunk");
    expect(result.chunk?.filename).toMatch(
      /^defminer-observations-redacted-\d{8}T\d{6}Z\.csv$/,
    );
    expect(result.chunk?.contentType).toContain("text/csv");
    expect(result.chunk?.chunkIndex).toBe(0);
    expect(result.chunk?.rows).toBe(1);
    expect(typeof result.chunk?.hasMore).toBe("boolean");
  });

  it("emits the header on chunk zero and NOT on a later chunk", async () => {
    for (let i = 0; i < 4; i += 1) seedObservation(i);
    const { rpc } = await boot();

    const first = (await rpc.exportInventory(null, REQUEST)) as Chunk;
    expect(first.chunk?.text.startsWith('"project_id"')).toBe(true);

    const second = (await rpc.exportInventory(null, {
      ...REQUEST,
      chunkIndex: 1,
      cursor: first.chunk?.nextCursor,
    })) as Chunk;
    expect(second.chunk?.text).not.toContain('"project_id"');
  });

  it("fails closed with an explicit outcome when no project is resolved", async () => {
    seedObservation(0);
    const { rpc } = await boot(null);
    expect(await rpc.exportInventory(null, REQUEST)).toEqual({
      outcome: "refused",
      reason: "no-project",
    });
  });

  it("answers the empty outcome for a zero-row export — never a header-only file", async () => {
    const { rpc } = await boot();
    expect(await rpc.exportInventory(null, REQUEST)).toEqual({
      outcome: "empty",
    });
    expect(auditRows()).toHaveLength(0);
  });

  it("writes EXACTLY ONE audit row for a five-call export, not one per chunk", async () => {
    for (let i = 0; i < 8; i += 1) seedObservation(i);
    const { rpc } = await boot();

    const { calls } = await drain(rpc);
    expect(
      calls,
      "the fixture must actually chunk, or this proves nothing",
    ).toBe(5);

    const rows = auditRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("export_redacted");
  });

  it("writes NO audit row on an intermediate chunk", async () => {
    for (let i = 0; i < 8; i += 1) seedObservation(i);
    const { rpc } = await boot();

    const first = (await rpc.exportInventory(null, REQUEST)) as Chunk;
    expect(first.chunk?.hasMore).toBe(true);
    expect(auditRows()).toHaveLength(0);
  });

  it("writes NO audit row when the export fails partway", async () => {
    for (let i = 0; i < 8; i += 1) seedObservation(i);
    const { rpc } = await boot();

    // init() and the first two chunks read; the third rejects. A failed export
    // is not a disclosure that happened.
    allowObservationReads = observationReads + 2;
    await expect(drain(rpc)).rejects.toThrow();
    expect(auditRows()).toHaveLength(0);
  });

  it("names the mode in the audit KIND — raw and redacted are different records", async () => {
    seedObservation(0);
    const { rpc } = await boot();

    await drain(rpc, { mode: "raw" });
    expect(auditRows().map((r) => r.kind)).toEqual(["export_raw"]);
  });

  it("carries the row count and the format in the detail, and NO value and NO URL", async () => {
    for (let i = 0; i < 3; i += 1) seedObservation(i);
    const { rpc } = await boot();

    const { text } = await drain(rpc);
    const detail = auditRows()[0]?.detail ?? "";

    expect(detail).toContain("rows=3");
    expect(detail).toContain("format=csv");
    // NO URL-SHAPED SUBSTRING, and no field value from any exported row. The
    // audit writer redacts, and the caller must not rely on that to launder
    // something it should not have passed.
    expect(detail).not.toMatch(/[a-z][a-z0-9+.-]*:\/\//i);
    expect(detail).not.toContain("assets.example.test");
    expect(detail).not.toContain("req_0000");
    expect(text).toContain("assets.example.test");
  });

  it("embeds the floor statement in the FILE when a contributing artifact is degraded", async () => {
    seedObservation(0);
    seedDegradedArtifact("f".repeat(64));
    const { rpc } = await boot();

    const { text } = await drain(rpc);
    expect(text.split("\r\n")[0]?.startsWith("# ")).toBe(true);
    expect(text).toContain("floor, not a total");
  });

  it("bumps the contract version — the API map changed", () => {
    expect(CONTRACT_VERSION).toBeGreaterThan(2);
  });
});

// ===========================================================================
// UI-08 — THE SETTINGS SURFACE AND OBS-01's FOUR NUMBERS, AT THE ENDPOINT
// ===========================================================================
//
// WHAT THE STORE-LEVEL CASES IN `store/settings.spec.ts` CANNOT REACH. Three
// things, and each is a property of the REGISTRATION rather than of the module:
//
//   1. THE CALLER'S `projectId` IS DISCARDED. The store takes whatever project id
//      it is handed; only the endpoint substitutes the lifecycle-resolved one. A
//      settings write is the same hazard `scopedTo` guards on the paged reads
//      (T-05-34) with a durable effect — anything holding the RPC handle could
//      otherwise rewrite another project's retention bounds (T-05-67).
//   2. THE SCOPE SELECTS THE ROW. A project-scoped write with nothing resolved
//      must REFUSE, not fall through onto the global row and change every project
//      the operator has.
//   3. HEALTH FAILS CLOSED WITH AN OUTCOME, NOT WITH ZEROES. Four zeroes are what
//      a perfectly healthy idle backend reports.

describe("UI-08's settings endpoints", () => {
  let fx: SqliteFixture;

  beforeEach(async () => {
    fx = createFixtureDb();
    await migrate(fx.db);
  });

  afterEach(() => {
    fx.close();
    resetDbHandleForTest();
  });

  async function boot(projectId: string | null = "p1"): Promise<{
    rpc: Record<string, (...a: unknown[]) => unknown>;
  }> {
    const rpc: Record<string, (...a: unknown[]) => unknown> = {};
    const sdk = makeFakeSdk({
      projectId,
      db: () => Promise.resolve(fx.db),
      register: (name: string, fn: unknown) => {
        rpc[name] = fn as (...a: unknown[]) => unknown;
      },
    });
    await init(sdk);
    return { rpc };
  }

  function settingsRows(): {
    project_id: string;
    key: string;
    value: string;
  }[] {
    // THE OPERATOR'S ROWS ONLY, AND THE FILTER IS THE POINT RATHER THAN A
    // CONVENIENCE. Every claim below is about what a SETTINGS WRITE did — "the
    // caller's project id was discarded", "a project-scoped write with no
    // project stored nothing". `init()` also writes O-02's boot marker at the
    // reserved global scope on every boot (plan 06-08), which is internal
    // durable state and not a settings write; counting it here would let an
    // unrelated feature decide whether a scoping assertion passes. The filter is
    // over the CLOSED internal list, so a marker key added later is excluded by
    // the vocabulary rather than by a string somebody remembers to update.
    const internal = new Set<string>(INTERNAL_SETTING_KEYS);
    return (
      fx.raw
        .prepare("SELECT project_id, key, value FROM settings")
        .all() as unknown as {
        project_id: string;
        key: string;
        value: string;
      }[]
    ).filter((r) => !internal.has(r.key));
  }

  it("lists every known key with three distinguishable levels", async () => {
    const { rpc } = await boot();
    const listed = (await rpc.listSettings(null, {
      projectId: "p1",
    })) as KnownSettingValue[];

    expect(listed.map((r) => r.key)).toEqual([...OPERATOR_SETTING_KEYS]);
    for (const row of listed) {
      expect(row.project).toBeNull();
      expect(row.global).toBeNull();
      expect(row.documented.length).toBeGreaterThan(0);
    }
  });

  it("DISCARDS the caller's projectId and reads under the resolved one", async () => {
    const { rpc } = await boot("p1");
    await rpc.writeSetting(null, {
      projectId: "p1",
      scope: "project",
      key: RETENTION_MAX_ROWS_KEY,
      value: "4321",
    });

    // A caller naming ANOTHER project must not be able to read its rows — and
    // must not fail to read its OWN, either. Both halves of the same claim.
    const listed = (await rpc.listSettings(null, {
      projectId: "some-other-project",
    })) as KnownSettingValue[];
    expect(listed.find((r) => r.key === RETENTION_MAX_ROWS_KEY)?.project).toBe(
      "4321",
    );
    expect(settingsRows().map((r) => r.project_id)).toEqual(["p1"]);
  });

  it("writes the two scopes to two rows, and the caller cannot pick the project", async () => {
    const { rpc } = await boot("p1");
    await rpc.writeSetting(null, {
      projectId: "ignored",
      scope: "project",
      key: RETENTION_MAX_ROWS_KEY,
      value: "11",
    });
    await rpc.writeSetting(null, {
      projectId: "ignored",
      scope: "global",
      key: RETENTION_MAX_ROWS_KEY,
      value: "22",
    });

    const rows = settingsRows().filter((r) => r.key === RETENTION_MAX_ROWS_KEY);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.project_id === "p1")?.value).toBe("11");
    expect(rows.find((r) => r.project_id === "")?.value).toBe("22");
  });

  it("REFUSES a project-scoped write when no project is resolved, rather than writing globally", async () => {
    const { rpc } = await boot(null);
    const outcome = (await rpc.writeSetting(null, {
      projectId: "p1",
      scope: "project",
      key: RETENTION_MAX_ROWS_KEY,
      value: "11",
    })) as { ok: boolean; reason?: string };

    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toBe("no-project");
    // THE ROW THAT MUST NOT EXIST. A fall-through onto the global scope would
    // have changed every project the operator has, silently.
    expect(settingsRows()).toHaveLength(0);
  });

  it("rejects a bad bound at the endpoint and stores nothing", async () => {
    const { rpc } = await boot();
    for (const [value, reason] of [
      ["", "empty"],
      ["abc", "not-numeric"],
      ["0", "zero"],
      ["-1", "negative"],
    ] as const) {
      const outcome = (await rpc.writeSetting(null, {
        projectId: "p1",
        scope: "project",
        key: RETENTION_MAX_ROWS_KEY,
        value,
      })) as { ok: boolean; reason?: string };
      expect(outcome.ok, `${JSON.stringify(value)} was accepted`).toBe(false);
      expect(outcome.reason).toBe(reason);
    }
    expect(settingsRows()).toHaveLength(0);
  });

  it("clears a project override with a null value and leaves the global row", async () => {
    const { rpc } = await boot();
    await rpc.writeSetting(null, {
      projectId: "p1",
      scope: "global",
      key: RETENTION_MAX_ROWS_KEY,
      value: "22",
    });
    await rpc.writeSetting(null, {
      projectId: "p1",
      scope: "project",
      key: RETENTION_MAX_ROWS_KEY,
      value: "11",
    });

    const cleared = (await rpc.writeSetting(null, {
      projectId: "p1",
      scope: "project",
      key: RETENTION_MAX_ROWS_KEY,
      value: null,
    })) as { ok: boolean };
    expect(cleared.ok).toBe(true);

    const rows = settingsRows().filter((r) => r.key === RETENTION_MAX_ROWS_KEY);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.project_id).toBe("");
  });
});

describe("OBS-01's four numbers, projected", () => {
  let fx: SqliteFixture;

  beforeEach(async () => {
    fx = createFixtureDb();
    await migrate(fx.db);
  });

  afterEach(() => {
    fx.close();
    resetDbHandleForTest();
  });

  async function boot(projectId: string | null = "p1"): Promise<{
    rpc: Record<string, (...a: unknown[]) => unknown>;
  }> {
    const rpc: Record<string, (...a: unknown[]) => unknown> = {};
    const sdk = makeFakeSdk({
      projectId,
      db: () => Promise.resolve(fx.db),
      register: (name: string, fn: unknown) => {
        rpc[name] = fn as (...a: unknown[]) => unknown;
      },
    });
    await init(sdk);
    return { rpc };
  }

  it("answers the four counters and NOTHING else — no string reaches this shape", async () => {
    const { rpc } = await boot();
    const answered = rpc.getHealth(null) as {
      outcome: string;
      health: Record<string, unknown>;
    };

    expect(answered.outcome).toBe("health");
    // AN EQUALITY OVER THE WHOLE KEY SET, not four presence checks. The strip's
    // safety property is NEGATIVE — it carries only DefMiner-authored labels and
    // numeric counters — and a field added here (`lastError` being the obvious
    // one, since `getStatus` carries it) would be invisible to a search.
    expect(Object.keys(answered.health).sort()).toEqual([
      "droppedCount",
      "jobsInFlight",
      "maxSliceMs",
      "queueDepth",
    ]);
    for (const value of Object.values(answered.health)) {
      expect(typeof value).toBe("number");
    }
  });

  it("fails closed with an EXPLICIT outcome when no project is resolved — never four zeroes", async () => {
    const { rpc } = await boot(null);
    const answered = rpc.getHealth(null) as {
      outcome: string;
      reason?: string;
      health?: unknown;
    };
    expect(answered.outcome).toBe("unavailable");
    expect(answered.reason).toBe("no-project");
    expect(answered.health).toBeUndefined();
  });

  it("reports jobs in flight as zero while nothing is being walked", async () => {
    const { rpc } = await boot();
    const answered = rpc.getHealth(null) as {
      health: { jobsInFlight: number };
    };
    expect(answered.health.jobsInFlight).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// O-02's BOOT MARKER AND D-25's FOOTPRINT, THROUGH init()
// ---------------------------------------------------------------------------
//
// The store module owns the decision and proves it directly. What is proven HERE
// is the wiring: that `init()` writes the marker at all, that it writes it at the
// reserved global scope, and that the endpoint the Settings surface reads returns
// the three pairs and the flag together.

describe("init() records the boot marker and serves the storage footprint", () => {
  let fx: SqliteFixture;

  beforeEach(async () => {
    fx = createFixtureDb();
    const report = await migrate(fx.db);
    expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  });

  afterEach(() => {
    fx.close();
    resetDbHandleForTest();
  });

  async function boot(projectId: string | null = "p1"): Promise<{
    rpc: Record<string, (...a: unknown[]) => unknown>;
  }> {
    const rpc: Record<string, (...a: unknown[]) => unknown> = {};
    const sdk = makeFakeSdk({
      projectId,
      db: () => Promise.resolve(fx.db),
      register: (name: string, fn: unknown) => {
        rpc[name] = fn as (...a: unknown[]) => unknown;
      },
    });
    await init(sdk);
    return { rpc };
  }

  function markerRows(): { project_id: string; key: string; value: string }[] {
    return fx.raw
      .prepare("SELECT project_id, key, value FROM settings WHERE key LIKE ?")
      .all("storage.%") as unknown as {
      project_id: string;
      key: string;
      value: string;
    }[];
  }

  it("writes an install identifier and a boot count of 1 on a FIRST init, at the global scope", async () => {
    await boot();

    const byKey = new Map(markerRows().map((r) => [r.key, r]));
    expect(byKey.get(STORAGE_INSTALL_ID_KEY)?.value.length).toBeGreaterThan(0);
    expect(byKey.get(STORAGE_INSTALL_ID_KEY)?.project_id).toBe(
      GLOBAL_PROJECT_ID,
    );
    expect(byKey.get(STORAGE_BOOT_COUNT_KEY)?.value).toBe("1");
  });

  it("increments the boot count and keeps the install id on a SECOND init", async () => {
    await boot();
    const first = new Map(markerRows().map((r) => [r.key, r.value]));

    resetDbHandleForTest();
    resetLifecycleForTest();
    resetPassiveForTest();
    resetConsumerForTest();
    await boot();

    const second = new Map(markerRows().map((r) => [r.key, r.value]));
    expect(second.get(STORAGE_INSTALL_ID_KEY)).toBe(
      first.get(STORAGE_INSTALL_ID_KEY),
    );
    expect(second.get(STORAGE_BOOT_COUNT_KEY)).toBe("2");
  });

  it("reports NO observed loss on a first install — the one false positive that would make the sentence untrustworthy", async () => {
    const { rpc } = await boot();
    const footprint = (await rpc.getStorageFootprint(null)) as {
      observedRestartLoss: boolean;
    };
    expect(footprint.observedRestartLoss).toBe(false);
  });

  it("reports an observed loss once THIS process's own marker has disappeared", async () => {
    await boot();
    fx.raw.prepare("DELETE FROM settings").run();

    resetDbHandleForTest();
    resetLifecycleForTest();
    resetPassiveForTest();
    resetConsumerForTest();
    const { rpc } = await boot();

    const footprint = (await rpc.getStorageFootprint(null)) as {
      observedRestartLoss: boolean;
    };
    expect(footprint.observedRestartLoss).toBe(true);
  });

  it("answers three count/cap pairs and the flag, and NOTHING path-shaped", async () => {
    const { rpc } = await boot();
    const footprint = (await rpc.getStorageFootprint(null)) as Record<
      string,
      unknown
    >;

    expect(Object.keys(footprint).sort()).toEqual([
      "analyses",
      "artifacts",
      "observations",
      "observedRestartLoss",
    ]);
    for (const table of ["artifacts", "observations", "analyses"] as const) {
      const row = footprint[table] as { count: number; cap: number };
      expect(row.count).toBe(0);
      expect(row.cap).toBeGreaterThan(0);
    }
    // NO BYTES AND NO PATH. The negative is the property D-25 and D-19 buy
    // together, and a field added later would be invisible to a search.
    expect(JSON.stringify(footprint)).not.toContain("/");
  });

  it("fails closed with an EXPLICIT absence when no project is resolved", async () => {
    const { rpc } = await boot(null);
    const footprint = (await rpc.getStorageFootprint(null)) as {
      artifacts: unknown;
      observations: unknown;
      analyses: unknown;
    };
    // No project means no project-scoped count to report. The rows are ABSENT,
    // which is what the surface renders as "no row", never as a zero — a zero
    // would claim a measured empty project.
    expect(footprint.artifacts).toBeNull();
    expect(footprint.observations).toBeNull();
    expect(footprint.analyses).toBeNull();
  });
});

// ===========================================================================
// THE PRODUCER'S DRIVER — ROADMAP SUCCESS CRITERION 1's "runs" HALF
// ===========================================================================
//
// `runScanProducer` shipped in plan 06-01, was given a watermark by 06-03 and a
// lifecycle by 06-05, and until this plan NOTHING CALLED IT. Every property the
// producer's own spec proves — the descending walk, the bounded skip-done read,
// the backpressure hold — was true of a function no build ever entered, so a
// retroactive scan did not run at all. These cases assert the walk from the
// OUTSIDE: through the real `init()`, the real RPC surface, the real queue and
// the real `scans` table.
//
// THE CLOCK IS FAKE THROUGHOUT. The driver is scheduled rather than run inline,
// deliberately — a walk that started synchronously inside `startScan` would hold
// the RPC open for the length of a backfill — so advancing time is the only way
// to observe it, and real timers would make these cases slow and flaky at once.

describe("a retroactive scan actually WALKS, driven from production code", () => {
  let fx: SqliteFixture;

  beforeEach(async () => {
    vi.useFakeTimers();
    fx = createFixtureDb();
    await migrate(fx.db);
  });

  afterEach(() => {
    vi.useRealTimers();
    fx.close();
    resetDbHandleForTest();
  });

  async function boot(pages: ReturnType<typeof makeFakeScanItem>[][]): Promise<{
    rpc: Record<string, (...a: unknown[]) => unknown>;
    sdk: ReturnType<typeof makeFakeSdk>;
  }> {
    const rpc: Record<string, (...a: unknown[]) => unknown> = {};
    const sdk = makeFakeSdk({
      projectId: "p1",
      db: () => Promise.resolve(fx.db),
      scanPages: pages,
      register: (name: string, fn: unknown) => {
        rpc[name] = fn as (...a: unknown[]) => unknown;
      },
    });
    await init(sdk);
    return { rpc, sdk };
  }

  /** Let every scheduled driver pass and every yield between pages run. */
  async function settle(): Promise<void> {
    await vi.advanceTimersByTimeAsync(5_000);
  }

  function scanRow(): Record<string, unknown> | undefined {
    return fx.raw.prepare("SELECT * FROM scans WHERE project_id = 'p1'").get();
  }

  it("startScan kicks the driver, the walk covers every page, and completeScan lands", async () => {
    const { rpc } = await boot([
      [makeFakeScanItem({ id: "a-1" }), makeFakeScanItem({ id: "a-2" })],
      [makeFakeScanItem({ id: "b-1" })],
    ]);

    const started = await rpc.startScan(null, { operatorFilter: "" });
    expect(started).toEqual({ outcome: "started", scanId: expect.any(String) });

    // NOTHING HAS WALKED YET, and that is the contract: the RPC answers before
    // any page is transferred, so pressing Start scan never blocks the operator
    // on a backfill.
    expect(scanRow()?.pages_walked).toBe(0);

    await settle();

    const row = scanRow();
    expect(row?.pages_walked).toBe(2);
    expect(row?.seen).toBe(3);
    expect(row?.admitted).toBe(3);
    // `completeScan` had NO PRODUCTION CALLER before this plan. The driver is
    // that caller: the filter's range below the position is exhausted, which is
    // what finishing looks like.
    expect(row?.state).toBe("completed");
    expect(row?.finished_at).not.toBeNull();
  });

  it("hands the producer the SHIPPED queue — the consumer picks the walked work up", async () => {
    // THE WATERMARK IS ONLY OPERATIVE IF THE DRIVER PASSES THE REAL QUEUE. A
    // driver that constructed its own would gate on a depth nothing else ever
    // touches, and the drop-oldest defect D-01 exists to prevent would be back
    // with every producer test still green. The observable proof is that the ONE
    // consumer re-reads exactly the ids the walk offered: `analyseAndFinish`
    // resolves work with `sdk.requests.get(id)`, and it can only see an id that
    // reached the queue it drains.
    const { rpc, sdk } = await boot([
      [
        makeFakeScanItem({ id: "walked-1" }),
        makeFakeScanItem({ id: "walked-2" }),
      ],
    ]);

    await rpc.startScan(null, { operatorFilter: "" });
    await settle();
    await drainConsumerForTest();

    expect(sdk.calls.requestsGet).toContain("walked-1");
    expect(sdk.calls.requestsGet).toContain("walked-2");
  });

  it("sends DefMiner's own clause to Caido, with the operator's clause last", async () => {
    // D-05 made checkable at the one place it becomes a fact: the string handed
    // to `sdk.requests.query().filter(...)`. Compared BYTE FOR BYTE against the
    // one producer of a scan filter, never re-derived here.
    const { rpc, sdk } = await boot([[makeFakeScanItem({ id: "a-1" })]]);
    await rpc.startScan(null, {
      operatorFilter: 'req.host.eq:"example.test"',
    });
    await settle();

    const filters = sdk.calls.scanFilters.filter((f) => f !== null);
    expect(filters.length).toBeGreaterThan(0);
    expect(filters[0]).toBe(
      composeScanFilter(positionClause(""), 'req.host.eq:"example.test"'),
    );
  });

  it("emits one progress payload per walked page on the SHIPPED event", async () => {
    const { rpc, sdk } = await boot([
      [makeFakeScanItem({ id: "a-1" })],
      [makeFakeScanItem({ id: "b-1" })],
      [makeFakeScanItem({ id: "c-1" })],
    ]);
    await rpc.startScan(null, { operatorFilter: "" });
    await settle();

    const progress = sdk.calls.apiSend
      .map((call) => call.args[0])
      .filter((payload): payload is ScanProgressPayload =>
        isScanProgressPayload(payload as ScanProgressPayload),
      );

    expect(progress).toHaveLength(3);
    expect(progress.map((p) => p.pagesWalked)).toEqual([1, 2, 3]);
    expect(progress[2].projectId).toBe("p1");
    expect(progress[2].state).toBe("running");
    expect(progress[2].heldAtWatermark).toBe(false);
  });

  it("resumeScan kicks the driver too — the ONLY other way back into the walk", async () => {
    const { rpc, sdk } = await boot([
      [makeFakeScanItem({ id: "a-1" })],
      [makeFakeScanItem({ id: "b-1" })],
    ]);
    const started = (await rpc.startScan(null, { operatorFilter: "" })) as {
      scanId: string;
    };
    await rpc.pauseScan(null, { scanId: started.scanId });
    await settle();

    // Paused before anything ran: the walk refuses a scan that is not `running`.
    expect(scanRow()?.pages_walked).toBe(0);
    expect(scanRow()?.state).toBe("suspended");
    const walkedWhilePaused = sdk.calls.scanFilters.length;

    await rpc.resumeScan(null, { scanId: started.scanId });
    await settle();

    expect(sdk.calls.scanFilters.length).toBeGreaterThan(walkedWhilePaused);
    expect(scanRow()?.pages_walked).toBe(2);
    expect(scanRow()?.state).toBe("completed");
  });

  it("D-11 is not undone: init() arms NO driver, so nothing resumes itself", async () => {
    // The startup sweep suspends a scan a previous process left running and
    // resumes NOTHING (ERR-02, D-11). A driver kicked at boot would quietly
    // reverse that decision and start pulling full response bodies again the
    // moment Caido came back up.
    fx.raw
      .prepare(
        "INSERT INTO scans (project_id, scan_id, state, suspend_reason, operator_filter, epoch, " +
          "last_request_id, last_cursor, last_created_at, pages_walked, seen, admitted, " +
          "skipped_done, rejected, queued, started_at, updated_at, finished_at) " +
          "VALUES ('p1', 's-old', 'running', NULL, '', 0, '', '', NULL, 0, 0, 0, 0, 0, 0, 1, 1, NULL)",
      )
      .run();

    const { sdk } = await boot([[makeFakeScanItem({ id: "a-1" })]]);
    await settle();

    expect(scanRow()?.state).toBe("suspended");
    expect(scanRow()?.suspend_reason).toBe("process_restarted");
    expect(sdk.calls.scanFilters).toHaveLength(0);
  });

  it("getScanStatus reports the producer's REAL hold, never a hardcoded false", async () => {
    // WINDOWS 66 and 73. The value cannot be derived by the reader — from
    // outside the backend a scan holding at the watermark and a scan whose
    // QuickJS thread is blocked look identical — so the projection reads the
    // producer's module state, and this asserts the WIRE rather than the source.
    const { rpc } = await boot([[makeFakeScanItem({ id: "a-1" })]]);
    await rpc.startScan(null, { operatorFilter: "" });
    const status = (await rpc.getScanStatus()) as { heldAtWatermark: boolean };
    expect(status.heldAtWatermark).toBe(isHeldAtWatermark());

    // And the source carries no literal for it: a projection that had been
    // corrected to `false` again would pass the equality above whenever the
    // producer happens not to be holding, which is almost always.
    const src = readFileSync("packages/backend/src/index.ts", "utf8");
    expect(src).toContain("heldAtWatermark: isHeldAtWatermark()");
    expect(src).not.toContain("heldAtWatermark: false");
  });
});

// ===========================================================================
// D-07's ON-DEMAND DERIVATION — FOUR ARMS, AND WHAT EACH ONE WRITES
// ===========================================================================
//
// THE ARM IS HALF THE ASSERTION AND THE DATABASE IS THE OTHER HALF. Every case
// below reads `source_sightings.producibility` back after the call, because the
// two failures this endpoint can have are exactly the two a return-value
// assertion cannot see: a tombstone written for a call that merely failed, and a
// tombstone that was supposed to be written and was not. 07-UI-SPEC.md's rule
// that outranks its own copy table — a failed call is NEVER rendered as a
// tombstone, and producibility is never inferred — is a claim about a WRITE, so
// it is asserted against the write.

describe("deriveSource — D-07's reload, D-24's re-verify, D-23's tombstone", () => {
  let fx: SqliteFixture;

  beforeEach(async () => {
    fx = createFixtureDb();
    await migrate(fx.db);
  });

  afterEach(() => {
    fx.close();
    resetDbHandleForTest();
  });

  const LABEL = "webpack://app/src/secret.ts";
  const CONTENT =
    "export const token = 'not-a-real-secret';\nexport default 1;\n";
  const REQUEST_ID = "req-7";

  /** A well-formed map declaring ONE source with content. */
  const MAP_DOC = JSON.stringify({
    version: 3,
    file: "app.js",
    sources: [LABEL],
    sourcesContent: [CONTENT],
    names: [],
    mappings: "AAAA;AACA",
  });

  /** The bundle that announces it inline, in the spelling every real bundler
   *  emits. Built once so the digests below are facts about these bytes. */
  const BUNDLE = Buffer.from(
    "console.log(1);\n//# sourceMappingURL=data:application/json;base64," +
      Buffer.from(MAP_DOC, "utf8").toString("base64") +
      "\n",
    "utf8",
  );
  const ARTIFACT_SHA = sha256Hex(BUNDLE);
  const MAP_SHA = sha256Hex(Buffer.from(MAP_DOC, "utf8"));
  const SOURCE_SHA = sha256Hex(Buffer.from(CONTENT, "utf8"));
  const RECOVERED_AT = 1_756_000_000_000;

  /** A DIFFERENT bundle, announcing a DIFFERENT map — the re-deploy. */
  const REDEPLOYED = Buffer.from(
    "console.log(2);\n//# sourceMappingURL=data:application/json;base64," +
      Buffer.from(
        JSON.stringify({
          version: 3,
          file: "app.js",
          sources: [LABEL],
          sourcesContent: ["export const token = 'rotated';\n"],
          names: [],
          mappings: "AAAA",
        }),
        "utf8",
      ).toString("base64") +
      "\n",
    "utf8",
  );

  /** The rows the consumer would have written for one recovered source. */
  function seedSighting(): void {
    fx.raw
      .prepare(
        "INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count) VALUES (?, ?, ?, 'script', ?, ?, 1)",
      )
      .run("p1", ARTIFACT_SHA, BUNDLE.length, RECOVERED_AT, RECOVERED_AT);
    fx.raw
      .prepare(
        "INSERT INTO sources (project_id, source_sha256, byte_len, line_count, first_seen_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(
        "p1",
        SOURCE_SHA,
        Buffer.byteLength(CONTENT, "utf8"),
        3,
        RECOVERED_AT,
      );
    fx.raw
      .prepare(
        "INSERT INTO source_sightings (project_id, map_sha256, source_index, artifact_sha256, request_id, source_sha256, sources_verbatim, producibility, producibility_at, recovered_at) " +
          "VALUES (?, ?, 0, ?, ?, ?, ?, 'producible', NULL, ?)",
      )
      .run(
        "p1",
        MAP_SHA,
        ARTIFACT_SHA,
        REQUEST_ID,
        SOURCE_SHA,
        LABEL,
        RECOVERED_AT,
      );
  }

  /** What the row says now. The half of every assertion below that a return
   *  value cannot make. */
  function producibilityNow(): string {
    return (
      fx.raw
        .prepare(
          "SELECT producibility FROM source_sightings WHERE project_id = 'p1' AND map_sha256 = ? AND source_index = 0",
        )
        .get(MAP_SHA) as { producibility: string }
    ).producibility;
  }

  /** Boot the real `init()` with a `requests.get` this case chose. */
  async function bootWith(
    get: (id: string) => Promise<unknown>,
  ): Promise<Record<string, (...a: unknown[]) => unknown>> {
    const rpc: Record<string, (...a: unknown[]) => unknown> = {};
    await init(
      makeFakeSdk({
        projectId: "p1",
        db: () => Promise.resolve(fx.db),
        get,
        register: (name: string, fn: unknown) => {
          rpc[name] = fn as (...a: unknown[]) => unknown;
        },
      }),
    );
    return rpc;
  }

  /** The reload result for a stored request whose response carries `bytes`. */
  function storedResponse(bytes: Uint8Array): unknown {
    return {
      request: makeFakeRequest({ id: REQUEST_ID }),
      response: makeFakeResponse({ id: REQUEST_ID, bodyBytes: bytes }),
    };
  }

  const REF = { projectId: "p1", mapSha256: "", sourceIndex: 0 };

  it("registers deriveSource AFTER the consumer and BEFORE the ready latch", async () => {
    // THE ORDERING CONTRACT IN `index.ts`'s HEADER, asserted from outside
    // `init()`. Step 6b sits between the consumer and step 8, and the intercept
    // handler registered at step 8 is the only observable that moves across the
    // latch — so recording, at each `api.register`, whether a handler existed
    // yet proves the endpoint became reachable BEFORE the latch rather than
    // merely at some point during init(). "At some point" is exactly the window
    // in which a caller can reach a read with no loop behind it.
    seedSighting();
    const handlersAtRegistration: Record<string, number> = {};
    const sdk = makeFakeSdk({
      projectId: "p1",
      db: () => Promise.resolve(fx.db),
      register: (name: string) => {
        handlersAtRegistration[name] =
          sdk.calls.interceptResponseHandlers.length;
      },
    });
    await init(sdk);

    expect(sdk.calls.apiRegister).toContain("deriveSource");
    expect(
      handlersAtRegistration.deriveSource,
      "deriveSource was registered after the ready latch, so a response could " +
        "have been admitted before the read surface existed",
    ).toBe(0);
    // AFTER the consumer: `getHealth` projects the consumer's queue and is
    // registered in the same step, and the queue only exists once step 6 has
    // run. The registration ORDER within 6b is what carries the claim.
    expect(sdk.calls.apiRegister.indexOf("deriveSource")).toBeGreaterThan(
      sdk.calls.apiRegister.indexOf("getStatus"),
    );
    expect(sdk.calls.interceptResponseHandlers.length).toBe(1);
  });

  it("returns the CONTENT arm and leaves producibility untouched", async () => {
    seedSighting();
    const rpc = await bootWith(() => Promise.resolve(storedResponse(BUNDLE)));

    const answer = (await rpc.deriveSource(null, {
      ...REF,
      mapSha256: MAP_SHA,
    })) as Record<string, unknown>;

    expect(answer.outcome, JSON.stringify(answer)).toBe("content");
    expect(answer.content).toBe(CONTENT);
    // THE THREE NUMBERS DESCRIBE THIS ARM's CONTENT, computed from it rather
    // than read off the row — so they cannot describe something else.
    expect(answer.byteLen).toBe(Buffer.byteLength(CONTENT, "utf8"));
    expect(answer.lineCount).toBe(3);
    expect(answer.sha256).toBe(SOURCE_SHA);
    expect(producibilityNow()).toBe("producible");
  });

  it("a reload returning undefined is `gone` / no_request, and it STICKS", async () => {
    // BRANCH ONE OF TWO. Caido no longer has the request at all.
    seedSighting();
    const rpc = await bootWith(() => Promise.resolve(undefined));

    const answer = (await rpc.deriveSource(null, {
      ...REF,
      mapSha256: MAP_SHA,
    })) as Record<string, unknown>;

    expect(answer.outcome, JSON.stringify(answer)).toBe("gone");
    expect(answer.cause).toBe("no_request");
    // The date the tombstone sentence interpolates, read from the ROW rather
    // than taken from the clock.
    expect(answer.recoveredAt).toBe(RECOVERED_AT);
    expect(producibilityNow()).toBe("gone");
    expect("content" in answer).toBe(false);
  });

  it("a record with NO RESPONSE is `gone` / no_response — a DIFFERENT tag", async () => {
    // BRANCH TWO OF TWO, and the whole point of keeping them apart: the SDK
    // types these as two different optionality points, and conflating them
    // hides which one is happening — the only thing that would tell an operator
    // whether Caido lost the request or never recorded a response for it.
    seedSighting();
    const rpc = await bootWith(() =>
      Promise.resolve({ request: makeFakeRequest({ id: REQUEST_ID }) }),
    );

    const answer = (await rpc.deriveSource(null, {
      ...REF,
      mapSha256: MAP_SHA,
    })) as Record<string, unknown>;

    expect(answer.outcome).toBe("gone");
    expect(answer.cause).toBe("no_response");
    expect(producibilityNow()).toBe("gone");
  });

  it("D-24: a body that hashes differently is `changed`, with NO content field at all", async () => {
    // THE SINGLE MOST VALUABLE SECURITY PROPERTY THIS PHASE ADDS. The reloaded
    // bundle is a real, well-formed bundle carrying a real map with a source at
    // index 0 — so a handler that re-derived from the new body would have had
    // something plausible to return, and would have returned it. It must not.
    seedSighting();
    const rpc = await bootWith(() =>
      Promise.resolve(storedResponse(REDEPLOYED)),
    );

    const answer = (await rpc.deriveSource(null, {
      ...REF,
      mapSha256: MAP_SHA,
    })) as Record<string, unknown>;

    expect(answer.outcome, JSON.stringify(answer)).toBe("changed");
    // STRUCTURAL, NOT "the content is empty". An empty string is a value a
    // viewer renders; the absence of the key is what makes withholding a
    // property of the answer rather than of the caller's discipline.
    expect(Object.keys(answer).sort()).toEqual([
      "outcome",
      "recordedByteLen",
      "recoveredAt",
      "reloadedByteLen",
    ]);
    // `byteLenMismatch`'s reporting shape: a re-deploy is visible as a number
    // rather than only as a refusal the operator cannot explain.
    expect(answer.recordedByteLen).toBe(BUNDLE.length);
    expect(answer.reloadedByteLen).toBe(REDEPLOYED.length);
    expect(producibilityNow()).toBe("changed");
  });

  it("the tombstone is STICKY — a later reload that succeeds does not un-write it", async () => {
    // D-23's stickiness is a property of `markProducibility`'s trailing guard
    // rather than of this handler's discipline, and this is what proves the two
    // are wired together. The second call reloads the ORIGINAL bundle and hashes
    // correctly, so it answers `content` — and the row does not move back.
    seedSighting();
    const bodies: unknown[] = [undefined, storedResponse(BUNDLE)];
    let at = 0;
    const rpc = await bootWith(() => Promise.resolve(bodies[at++]));

    await rpc.deriveSource(null, { ...REF, mapSha256: MAP_SHA });
    expect(producibilityNow()).toBe("gone");

    const second = (await rpc.deriveSource(null, {
      ...REF,
      mapSha256: MAP_SHA,
    })) as Record<string, unknown>;
    expect(second.outcome).toBe("content");
    expect(
      producibilityNow(),
      "a tombstone was un-written by a later successful reload",
    ).toBe("gone");
  });

  it("a reload that THREW is `unavailable` and writes NOTHING", async () => {
    // THE RULE THAT OUTRANKS EVERYTHING ELSE HERE. A call that did not answer
    // is not evidence of a refusal, so nothing durable may be recorded — and
    // the only way to see that is to read the row back.
    seedSighting();
    const rpc = await bootWith(() =>
      Promise.reject(new Error("the request store is unavailable")),
    );

    const answer = (await rpc.deriveSource(null, {
      ...REF,
      mapSha256: MAP_SHA,
    })) as Record<string, unknown>;

    expect(answer).toEqual({ outcome: "unavailable" });
    expect(
      producibilityNow(),
      "a failed call wrote a permanent tombstone",
    ).toBe("producible");
  });

  it("a sighting that is not in this project is `unavailable`, not `gone`", async () => {
    // THE ORIGIN COMES FROM THE DATABASE. There is no row, so there is nothing
    // to reload and nothing has been proven about the target's history. The
    // reload is not even attempted, which is also what bounds the set of stored
    // bodies this endpoint can reach.
    const rpc = await bootWith(() => Promise.resolve(storedResponse(BUNDLE)));
    const answer = await rpc.deriveSource(null, {
      ...REF,
      mapSha256: "f".repeat(64),
    });
    expect(answer).toEqual({ outcome: "unavailable" });
  });

  it("an index the map no longer carries content for is `unavailable`, never `gone`", async () => {
    // The bundle is still there and still hashes correctly, so the source has
    // not been proven unproducible — only unread this time. A `gone` here would
    // be a permanent claim about Caido's history made from a fact about a map.
    seedSighting();
    fx.raw
      .prepare(
        "INSERT INTO source_sightings (project_id, map_sha256, source_index, artifact_sha256, request_id, source_sha256, sources_verbatim, producibility, producibility_at, recovered_at) " +
          "VALUES ('p1', ?, 9, ?, ?, NULL, ?, 'producible', NULL, ?)",
      )
      .run(MAP_SHA, ARTIFACT_SHA, REQUEST_ID, LABEL, RECOVERED_AT);

    const rpc = await bootWith(() => Promise.resolve(storedResponse(BUNDLE)));
    const answer = await rpc.deriveSource(null, {
      ...REF,
      mapSha256: MAP_SHA,
      sourceIndex: 9,
    });

    expect(answer).toEqual({ outcome: "unavailable" });
    expect(
      (
        fx.raw
          .prepare(
            "SELECT producibility FROM source_sightings WHERE project_id = 'p1' AND source_index = 9",
          )
          .get() as { producibility: string }
      ).producibility,
    ).toBe("producible");
  });

  it("a sighting whose map digest is not the one the bundle announces is `unavailable`", async () => {
    // `findAnnouncement` returns the LAST announcement in the tail window, so
    // the digest check is what stops content from a document the sighting does
    // not describe being served under its name. In this build no nested map
    // ever acquires a sighting — `DERIVED_MAX_DEPTH` is 1 and the gate refuses
    // at `depth >= 1` — so this is a consistency assertion today and the thing
    // that fails closed the day that bound is raised.
    const otherMap = "e".repeat(64);
    fx.raw
      .prepare(
        "INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count) VALUES ('p1', ?, ?, 'script', ?, ?, 1)",
      )
      .run(ARTIFACT_SHA, BUNDLE.length, RECOVERED_AT, RECOVERED_AT);
    fx.raw
      .prepare(
        "INSERT INTO source_sightings (project_id, map_sha256, source_index, artifact_sha256, request_id, source_sha256, sources_verbatim, producibility, producibility_at, recovered_at) " +
          "VALUES ('p1', ?, 0, ?, ?, NULL, ?, 'producible', NULL, ?)",
      )
      .run(otherMap, ARTIFACT_SHA, REQUEST_ID, LABEL, RECOVERED_AT);

    const rpc = await bootWith(() => Promise.resolve(storedResponse(BUNDLE)));
    expect(
      await rpc.deriveSource(null, { ...REF, mapSha256: otherMap }),
    ).toEqual({ outcome: "unavailable" });
  });

  it("NO project resolved is `unavailable`, and it never reaches the request store", async () => {
    seedSighting();
    const rpc: Record<string, (...a: unknown[]) => unknown> = {};
    const sdk = makeFakeSdk({
      projectId: null,
      db: () => Promise.resolve(fx.db),
      get: () => Promise.resolve(storedResponse(BUNDLE)),
      register: (name: string, fn: unknown) => {
        rpc[name] = fn as (...a: unknown[]) => unknown;
      },
    });
    await init(sdk);

    expect(
      await rpc.deriveSource(null, { ...REF, mapSha256: MAP_SHA }),
    ).toEqual({ outcome: "unavailable" });
    expect(
      sdk.calls.requestsGet,
      "a read with no project resolved reached the request store anyway",
    ).toEqual([]);
    expect(producibilityNow()).toBe("producible");
  });
});
