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

import type { ExportRedactionMode } from "@defminer/engine/contract";
import {
  INVALIDATION_EVENT,
  RETENTION_MAX_ROWS_KEY,
  SETTING_KEYS,
} from "@defminer/engine/contract";
import type { Database } from "sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  makeFakeRequest,
  makeFakeResponse,
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
import { DETECTOR_CORPUS_VERSION } from "./store/analyses";
import { resetDbHandleForTest } from "./store/db";
import { migrate } from "./store/migrations";
import type { KnownSettingValue } from "./store/settings";
import { resetTelemetryForTest } from "./telemetry";

import { init } from "./index";

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
 * TYPE, and the registration site is fourteen hand-written `api.register`
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
  "exportInventory",
  "listSettings",
  "writeSetting",
  "getHealth",
  "getContractVersion",
];

beforeEach(() => {
  resetLifecycleForTest();
  resetPassiveForTest();
  resetConsumerForTest();
  resetDbHandleForTest();
  resetTelemetryForTest();
});

afterEach(() => {
  resetLifecycleForTest();
  resetPassiveForTest();
  resetConsumerForTest();
  resetDbHandleForTest();
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
   *  RPCs it registered and the fake it registered them on. */
  async function boot(projectId: string | null = "p1"): Promise<{
    rpc: Record<string, (...a: unknown[]) => unknown>;
    sdk: ReturnType<typeof makeFakeSdk>;
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
    return { rpc, sdk };
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
    return fx.raw
      .prepare("SELECT project_id, key, value FROM settings")
      .all() as unknown as { project_id: string; key: string; value: string }[];
  }

  it("lists every known key with three distinguishable levels", async () => {
    const { rpc } = await boot();
    const listed = (await rpc.listSettings(null, {
      projectId: "p1",
    })) as KnownSettingValue[];

    expect(listed.map((r) => r.key)).toEqual([...SETTING_KEYS]);
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
