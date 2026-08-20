// packages/backend/src/lifecycle.spec.ts — CORE-09, driven rather than reviewed.
//
// NOTHING in this repo has ever run `onProjectChange`. No Phase 0 probe
// registered one, so there is no live observation to fall back on and no
// measured behaviour to defer to: every claim below has to be produced by
// driving the fake, and the fake's `onProjectChange` was added for exactly that.
//
// The cross-project claim is asserted over EVERY row the case produced, not over
// the last one. "The final row is correct" is satisfied by a run that wrote nine
// wrong rows and then one right one — which is the shape a leak actually takes.

/* eslint-disable @typescript-eslint/require-await --
   Every fake `requests.get` and `meta.db` below is `async` WITH NO `await`
   INSIDE, and that is deliberate. The SDK declares both as returning a Promise;
   dropping `async` here would hand the code under test a plain value where
   production hands it a thenable, and the reload path in particular is written
   against a rejection rather than a throw. Same reasoning as consumer.spec.ts. */

import { readFileSync } from "node:fs";

import { artifactDeadline, Cancelled, walk } from "@defminer/engine/pipeline";
import { BoundedQueue } from "@defminer/engine/queue";
import { QUEUE_CAP } from "@defminer/engine/thresholds";
import type { Database } from "sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  emitProjectChange,
  type FakeSdk,
  makeFakeProject,
  makeFakeRequest,
  makeFakeResponse,
  makeFakeSdk,
} from "../test/fixtures/fake-sdk";
import {
  createFixtureDb,
  type SqliteFixture,
} from "../test/fixtures/sqlite-fixture";

import {
  configurePassive,
  type EnqueueClock,
  onResponse,
  resetPassiveForTest,
  setPassiveReady,
} from "./hooks/passive";
import { resetConsumerForTest, startConsumer } from "./ingest/consumer";
import {
  admissionAllowed,
  applyProjectChange,
  currentProjectId,
  currentSignal,
  installLifecycle,
  projectEpoch,
  resetLifecycleForTest,
} from "./lifecycle";
import { listArtifacts } from "./store/artifacts";
import { getDb, resetDbHandle } from "./store/db";
import { migrate } from "./store/migrations";
import { listObservations } from "./store/observations";
import { counters, resetTelemetryForTest } from "./telemetry";

import { init } from "./index";

const LIFECYCLE_SRC = "packages/backend/src/lifecycle.ts";
const A = "project-alpha";
const B = "project-bravo";

let fx: SqliteFixture;
let queue: BoundedQueue;
let enqueuedAt: EnqueueClock;
let resets: number;

beforeEach(async () => {
  resetLifecycleForTest();
  resetPassiveForTest();
  resetConsumerForTest();
  // Process-global memoisation. A case that did not clear it would inherit the
  // previous case's handle and count the wrong number of `meta.db()` calls.
  resetDbHandle();
  fx = createFixtureDb();
  const report = await migrate(fx.db);
  expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  queue = new BoundedQueue(QUEUE_CAP);
  resetTelemetryForTest();
  enqueuedAt = new Map();
  resets = 0;
});

afterEach(() => {
  resetLifecycleForTest();
  resetPassiveForTest();
  resetConsumerForTest();
  resetDbHandle();
  fx.close();
});

function deps(over: { resetDb?: () => void } = {}) {
  return {
    queue,
    enqueuedAt,
    resetDb:
      over.resetDb ??
      ((): void => {
        resets += 1;
        resetDbHandle();
      }),
  };
}

/** The plugin's OBSERVABLE lifecycle state — what a caller can actually see.
 *
 *  Deliberately excludes the epoch: two routes to the same state differ in how
 *  many changes it took to get there, and the claim under test is about the
 *  state, not the route. */
function observable(): Record<string, unknown> {
  return {
    projectId: currentProjectId(),
    admissionAllowed: admissionAllowed(),
    queueDepth: queue.depth,
    aborted: currentSignal().aborted,
  };
}

/** Wire the hook onto the REAL lifecycle gate. */
function wireHook(): void {
  configurePassive({ queue, enqueuedAt, admissionAllowed });
  setPassiveReady(true);
}

/** `getDb` takes the narrow `{ meta: { db(): Promise<Database> } }` slice; the
 *  fake types its return as `unknown` because most callers do not care what came
 *  back. This narrows it at the ONE place that does. */
function asMetaSdk(sdk: unknown): { meta: { db(): Promise<Database> } } {
  return sdk as { meta: { db(): Promise<Database> } };
}

/** Deterministic bytes, distinct per seed. */
function body(seed: string, length = 96): Uint8Array {
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    out[i] = (seed.charCodeAt(i % seed.length) + i * 7) & 0xff;
  }
  return out;
}

// ===========================================================================
// 1. THE ABORT
// ===========================================================================

describe("a project change aborts the work already in flight", () => {
  it("flips the token the running walk is holding, with a reason that names the change", async () => {
    await installLifecycle(makeFakeSdk({ projectId: A }), deps());

    // The token the walk captures at its start. `applyProjectChange` installs a
    // FRESH one afterwards, so this object is the only thing that can still tell
    // the running walk to stop.
    const inFlight = currentSignal();
    expect(inFlight.aborted).toBe(false);

    const clock = (): number => 0; // no elapsed, so no yields and no deadline
    let visited = 0;
    const promise = walk(body("big", 300_000), {
      now: clock,
      deadline: artifactDeadline(clock),
      signal: inFlight,
      visit: () => {
        visited += 1;
        // The change lands MID-WALK, which is the only interesting time for it
        // to land.
        if (visited === 2) applyProjectChange(makeFakeProject(B));
      },
    });

    await expect(promise).rejects.toBeInstanceOf(Cancelled);
    await promise.catch((e: unknown) => {
      expect(
        String((e as Error).message),
        "the abort reason must NAME the project change. HANDLER_ERROR_SURFACED " +
          "is 'neither' — Caido writes nothing of its own down — so this string " +
          "is the entire record of why the walk stopped.",
      ).toContain("project change");
      expect(String((e as Error).message)).toContain(A);
      expect(String((e as Error).message)).toContain(B);
    });
    expect(visited).toBeGreaterThan(1);
  });

  it("installs a fresh token, so work started AFTER the change is not cancelled", async () => {
    await installLifecycle(makeFakeSdk({ projectId: A }), deps());
    const before = currentSignal();
    applyProjectChange(makeFakeProject(B));
    const after = currentSignal();

    expect(before.aborted).toBe(true);
    expect(after.aborted).toBe(false);
    expect(after).not.toBe(before);
  });
});

// ===========================================================================
// 2. THE QUEUE, AND CROSS-PROJECT LEAKAGE
// ===========================================================================

describe("entries queued under the previous project", () => {
  it("are discarded, and their enqueue timestamps go with them", async () => {
    await installLifecycle(makeFakeSdk({ projectId: A }), deps());
    for (let i = 0; i < 10; i += 1) {
      queue.offer({ id: "a" + String(i), bytes: 96, kind: "js" });
      enqueuedAt.set("a" + String(i), Date.now());
    }
    expect(queue.depth).toBe(10);

    const summary = applyProjectChange(makeFakeProject(B));

    expect(summary.discarded).toBe(10);
    expect(queue.depth).toBe(0);
    expect(
      enqueuedAt.size,
      "a discarded entry's enqueue timestamp is never taken, so leaving it " +
        "behind grows the map for ids nothing will ever read.",
    ).toBe(0);
  });

  it("write NO row under either project when the change lands mid-drain", async () => {
    await installLifecycle(makeFakeSdk({ projectId: A }), deps());

    const ids = Array.from({ length: 10 }, (_v, i) => "a" + String(i));
    for (const id of ids) {
      queue.offer({ id, bytes: 96, kind: "js" });
      enqueuedAt.set(id, Date.now());
    }

    // The change fires from inside the THIRD reload — i.e. while an entry
    // admitted under A is mid-`await`, which is the window a naive
    // implementation leaves open.
    let reloads = 0;
    const sdk = makeFakeSdk({
      get: async (id: string) => {
        reloads += 1;
        if (reloads === 3) applyProjectChange(makeFakeProject(B));
        return {
          request: makeFakeRequest({ id, url: "https://a.test/" + id + ".js" }),
          response: makeFakeResponse({ id, bodyBytes: body(id) }),
        };
      },
    });

    const handle = startConsumer(sdk, {
      queue,
      db: fx.db,
      enqueuedAt,
      getProjectId: () => Promise.resolve(currentProjectId() ?? ""),
      projectEpoch,
      get signal() {
        return currentSignal();
      },
    });
    await handle.drainNow();
    handle.stop();

    // EVERY row, both projects, both tables — not just the last one.
    const rowsA = await listArtifacts(fx.db, A);
    const rowsB = await listArtifacts(fx.db, B);
    const obsA = await listObservations(fx.db, A);
    const obsB = await listObservations(fx.db, B);

    expect(
      rowsB.length + obsB.length,
      "traffic admitted under " +
        A +
        " produced a row keyed on " +
        B +
        ". That is one client's bundles appearing in another client's view — " +
        "the exact failure CORE-09 exists to prevent.",
    ).toBe(0);
    expect(
      rowsA.length,
      "rows under " +
        A +
        " must stop at the two entries that completed BEFORE the change; the " +
        "third was mid-reload and the remaining seven were discarded from the " +
        "queue unprocessed.",
    ).toBe(2);
    expect(obsA.length).toBe(2);
    for (const row of [...rowsA, ...obsA]) {
      expect((row as { project_id: string }).project_id).toBe(A);
    }
    expect(queue.depth).toBe(0);
    expect(counters.abandonedOnProjectChange).toBeGreaterThan(0);
    expect(counters.processed).toBe(2);
  });
});

// ===========================================================================
// 3. THE DATABASE HANDLE
// ===========================================================================

describe("the memoised database handle", () => {
  it("is re-resolved after a project change, proven by counting meta.db() calls", async () => {
    const sdk = makeFakeSdk({ projectId: A, db: async () => fx.db });
    await installLifecycle(sdk, { queue, enqueuedAt });

    await getDb(asMetaSdk(sdk));
    await getDb(asMetaSdk(sdk));
    expect(
      sdk.calls.metaDb,
      "getDb is memoised: two calls with no change between them must open ONE " +
        "handle.",
    ).toBe(1);

    applyProjectChange(makeFakeProject(B));

    await getDb(asMetaSdk(sdk));
    expect(
      sdk.calls.metaDb,
      "the handle was not reset, so the next write would go through a handle " +
        "resolved while the previous project was selected.",
    ).toBe(2);
  });

  it("resets on the null branch too", async () => {
    await installLifecycle(makeFakeSdk({ projectId: A }), deps());
    const before = resets;
    applyProjectChange(null);
    expect(resets).toBe(before + 1);
  });
});

// ===========================================================================
// 4. THE NULL BRANCH — A STATE, NOT A GUARD
// ===========================================================================

describe("a change to null", () => {
  it("leaves no active project, an empty queue, and a hook that admits nothing", async () => {
    const sdk = makeFakeSdk({ projectId: A });
    await installLifecycle(sdk, deps());
    wireHook();
    queue.offer({ id: "a0", bytes: 96, kind: "js" });

    // Exactly as the SDK delivers it: the user deleted the selected project.
    await emitProjectChange(sdk, null);

    expect(currentProjectId()).toBeNull();
    expect(queue.depth).toBe(0);
    expect(admissionAllowed()).toBe(false);

    onResponse(sdk, makeFakeRequest({ id: "z1" }), makeFakeResponse());

    expect(
      queue.depth,
      "the hook offered an entry with no project active. There is no id to key " +
        "a write on, so the entry would either be refused downstream or land " +
        "under whatever gets selected next.",
    ).toBe(0);
    expect(counters.admitted).toBe(0);
    expect(counters.noProjectSelected).toBe(1);
    // Counted as OBSERVED — the hook really was handed a proxied response, and
    // pretending otherwise would understate the blind spot rather than the
    // coverage.
    expect(counters.proxiedResponsesObserved).toBe(1);
  });

  it("restores admission when a project is selected again, keyed on the NEW id", async () => {
    const sdk = makeFakeSdk({
      projectId: A,
      get: async (id: string) => ({
        request: makeFakeRequest({ id, url: "https://b.test/" + id + ".js" }),
        response: makeFakeResponse({ id, bodyBytes: body(id) }),
      }),
    });
    await installLifecycle(sdk, deps());
    wireHook();

    await emitProjectChange(sdk, null);
    expect(admissionAllowed()).toBe(false);

    await emitProjectChange(sdk, makeFakeProject(B));
    expect(currentProjectId()).toBe(B);
    expect(admissionAllowed()).toBe(true);

    onResponse(sdk, makeFakeRequest({ id: "b1" }), makeFakeResponse());
    expect(queue.depth).toBe(1);
    enqueuedAt.set("b1", Date.now());

    const handle = startConsumer(sdk, {
      queue,
      db: fx.db,
      enqueuedAt,
      getProjectId: () => Promise.resolve(currentProjectId() ?? ""),
      projectEpoch,
      get signal() {
        return currentSignal();
      },
    });
    await handle.drainNow();
    handle.stop();

    const rowsB = await listArtifacts(fx.db, B);
    const rowsA = await listArtifacts(fx.db, A);
    expect(rowsB.length).toBe(1);
    expect(rowsB[0].project_id).toBe(B);
    expect(rowsA.length).toBe(0);
  });
});

// ===========================================================================
// 5. getStatus, THROUGH THE REAL init()
// ===========================================================================

describe("getStatus over a real init()", () => {
  /** Run `init()` against the fake and hand back the RPCs it registered. */
  async function bootInit(
    projectId: string | null,
  ): Promise<Record<string, (...a: unknown[]) => unknown>> {
    const registered: Record<string, (...a: unknown[]) => unknown> = {};
    const sdk = makeFakeSdk({
      projectId,
      db: async () => fx.db,
      register: (name: string, fn: unknown) => {
        registered[name] = fn as (...a: unknown[]) => unknown;
      },
    });
    await init(sdk);
    return registered;
  }

  it("reports projectId as null — not an empty string — when none is active", async () => {
    const rpc = await bootInit(null);
    const st = rpc.getStatus() as Record<string, unknown>;

    expect(
      st.projectId,
      'getStatus reported "" for the project id. An empty string is a project ' +
        "id that happens to be blank, which is a different claim from 'there " +
        "is no project selected' — and the second is the one that is true here.",
    ).toBeNull();
    expect(st.compatible).toBe(true);
  });

  it("reports the resolved id when one IS active, and admits through the real gate", async () => {
    const rpc = await bootInit(A);
    const st = rpc.getStatus() as Record<string, unknown>;
    expect(st.projectId).toBe(A);

    // `init()` wired `configurePassive` with the lifecycle's own gate, so this
    // is the production path rather than a stand-in.
    expect(admissionAllowed()).toBe(true);
  });

  it("returns no rows from getArtifacts while no project is active", async () => {
    const rpc = await bootInit(null);
    await expect(rpc.getArtifacts()).resolves.toEqual([]);
    await expect(rpc.getObservations()).resolves.toEqual([]);
  });
});

// ===========================================================================
// 6. INIT AND THE NULL CHANGE REACH THE SAME STATE
// ===========================================================================

describe("init() with no project selected", () => {
  it("reaches the SAME observable state as an explicit null change", async () => {
    // Route 1: a project was selected, then deleted.
    const sdk = makeFakeSdk({ projectId: A });
    await installLifecycle(sdk, deps());
    await emitProjectChange(sdk, null);
    const viaChange = observable();

    // Route 2: init() on an instance that never had one.
    resetLifecycleForTest();
    queue = new BoundedQueue(QUEUE_CAP);
    enqueuedAt = new Map();
    await installLifecycle(makeFakeSdk({ projectId: null }), deps());
    const viaInit = observable();

    expect(
      viaInit,
      "two code paths to 'no project' that produce different states will " +
        "diverge, and the one that diverges is always the one nobody drives in " +
        "a test. installLifecycle routes BOTH through applyProjectChange for " +
        "this reason.",
    ).toEqual(viaChange);
    expect(viaInit.projectId).toBeNull();
    expect(viaInit.admissionAllowed).toBe(false);
  });

  it("survives projects.getCurrent() throwing, as the null state", async () => {
    const sdk: FakeSdk = makeFakeSdk({
      getCurrent: () => Promise.reject(new Error("projects unavailable")),
    });
    await expect(installLifecycle(sdk, deps())).resolves.toBeTruthy();
    expect(currentProjectId()).toBeNull();
    expect(admissionAllowed()).toBe(false);
  });

  it("registers exactly one onProjectChange callback, and does so AFTER resolving", async () => {
    const sdk = makeFakeSdk({ projectId: A });
    await installLifecycle(sdk, deps());
    expect(sdk.calls.projectChangeHandlers.length).toBe(1);
    expect(sdk.calls.projectsGetCurrent).toBe(1);
  });

  it("does not take init() down when onProjectChange cannot be registered", async () => {
    const sdk = makeFakeSdk({ projectId: A });
    sdk.events.onProjectChange = (): never => {
      throw new Error("no such event on this build");
    };
    await expect(installLifecycle(sdk, deps())).resolves.toBeTruthy();
    expect(
      currentProjectId(),
      "a plugin that cannot notice a switch is still useful for the project it " +
        "resolved; a plugin that refused to start is not.",
    ).toBe(A);
  });
});

// ===========================================================================
// 7. THE SCOPE BOUNDARY, STATED AND CHECKED
// ===========================================================================

describe("the Phase 2 seam is left open, not filled", () => {
  const src = readFileSync(LIFECYCLE_SRC, "utf8");

  it("reconciles no scan_state row, and names ERR-02 as their owner", () => {
    expect(
      src,
      "the omission must be DELIBERATE and legible, or the next reader adds " +
        "stale-job reconciliation here and Phase 2 finds it already half-done.",
    ).toContain("ERR-02");
    expect(
      /UPDATE\s+analyses/i.test(src),
      LIFECYCLE_SRC +
        " writes to the analyses table. A scan_state row left non-terminal by a " +
        "killed runtime is ERR-02's to reconcile in Phase 2, not this file's.",
    ).toBe(false);
    for (const forbidden of ["claimAnalysis", "finishAnalysis", "scan_state"]) {
      expect(
        src.includes(forbidden + "("),
        LIFECYCLE_SRC + " calls " + forbidden + " — that is Phase 2's job.",
      ).toBe(false);
    }
  });

  it("applies a change with no await between the abort and the swap", () => {
    // The whole ordering guarantee rests on this: one thread, no suspension
    // point, therefore no window in which a write can observe a half-applied
    // swap. An `await` slipped in here would silently reopen it.
    const start = src.indexOf("export function applyProjectChange");
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf("\n/**", start);
    const fn = src.slice(start, end === -1 ? src.length : end);
    expect(
      /\bawait\b/.test(fn),
      "applyProjectChange contains an await. Its ordering guarantee is that " +
        "nothing can interleave between the abort and the swap, and an await " +
        "is exactly an interleaving point.",
    ).toBe(false);
  });
});
