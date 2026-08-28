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

import { INVALIDATION_EVENT } from "@defminer/engine/contract";
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
import { resetDbHandleForTest } from "./store/db";
import { migrate } from "./store/migrations";
import { resetTelemetryForTest } from "./telemetry";

import { init } from "./index";

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

    for (const expected of [
      "getStatus",
      "getCompat",
      "getArtifacts",
      "getObservations",
      "listArtifactsPage",
      "listObservationsPage",
      "countInventory",
      "getContractVersion",
    ]) {
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

  it("returns the contract version constant", async () => {
    const { rpc } = await boot();
    expect(rpc.getContractVersion()).toBe(CONTRACT_VERSION);
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
