// packages/backend/src/hooks/passive.spec.ts — the hook is WIRING, and these are
// the three ways wiring goes wrong invisibly.
//
//   1. The callback becomes async. Type-legal (`MaybePromise<void>`), invisible in
//      traffic because Caido QUEUES events rather than dropping them, and fatal:
//      it starves the one thread this runtime has.
//   2. The `ready` latch stops holding. Intercept events arrive BEFORE `init()`
//      finishes awaiting `sdk.meta.db()` and `migrate()`, so an unlatched hook
//      enqueues work against an unmigrated database.
//   3. A throw escapes. HANDLER_ERROR_SURFACED is "neither" — Phase 0 searched
//      22,876 host-log lines plus stdout and stderr for an error thrown from a
//      handler and found ZERO traces. The counter IS the error report.
//
// The permanent home for the "returns undefined, not a Promise" assertion that
// plan 01-01 parked in a transient acceptance probe (01-01-SUMMARY.md § Next
// Phase Readiness).

import { BoundedQueue, type Entry } from "@defminer/engine/queue";
import { PASSIVE_MAX_BYTES, QUEUE_CAP } from "@defminer/engine/thresholds";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  makeFake304,
  makeFakeRequest,
  makeFakeResponse,
  makeFakeSdk,
} from "../../test/fixtures/fake-sdk";
// THE counter object, imported rather than constructed. Plan 01-05 moved it to
// telemetry.ts and REPLACED the local one; a spec that built its own would be
// the second object `telemetry.spec.ts`'s AST scan exists to forbid.
import { counters, resetTelemetryForTest } from "../telemetry";

import { REJECT_REASONS } from "./admit";
import {
  configurePassive,
  type EnqueueClock,
  onResponse,
  resetPassiveForTest,
  setPassiveReady,
  stampEnqueued,
} from "./passive";

let queue: BoundedQueue;
let enqueuedAt: EnqueueClock;

function wire(ready = true): void {
  queue = new BoundedQueue(QUEUE_CAP);
  resetTelemetryForTest();
  enqueuedAt = new Map();
  // `admissionAllowed` is REQUIRED on PassiveDeps (CORE-09). Always-true here:
  // every case in this file is about the hook, not about the lifecycle, and
  // lifecycle.spec.ts drives the false branch against the real gate.
  configurePassive({
    queue,
    enqueuedAt,
    admissionAllowed: () => true,
  });
  setPassiveReady(ready);
}

beforeEach(() => {
  resetPassiveForTest();
  wire();
});

afterEach(() => {
  resetPassiveForTest();
});

describe("CORE-01 — the callback is not async", () => {
  it("returns undefined, and the return value has no .then", () => {
    const sdk = makeFakeSdk();
    const result: unknown = onResponse(
      sdk,
      makeFakeRequest(),
      makeFakeResponse(),
    );
    expect(result).toBeUndefined();
    expect(typeof (result as { then?: unknown } | undefined)?.then).toBe(
      "undefined",
    );
  });

  it("has completed its work by the time it returns — nothing is deferred", () => {
    // A synchronous return proves nothing on its own if the body kicked off a
    // floating promise. The queue depth is observable immediately, so it is the
    // honest assertion.
    const sdk = makeFakeSdk();
    onResponse(sdk, makeFakeRequest({ id: "7" }), makeFakeResponse());
    expect(queue.depth).toBe(1);
    expect(counters.admitted).toBe(1);
  });
});

describe("the ready latch", () => {
  it("drops an event that arrives before ready without touching the queue", () => {
    wire(false);
    const sdk = makeFakeSdk();
    onResponse(sdk, makeFakeRequest(), makeFakeResponse());
    expect(queue.depth).toBe(0);
    // Not even the observed counter moves: a response the plugin was not ready
    // for was not observed by the plugin, and counting it would inflate the
    // denominator every later ratio is computed against.
    expect(counters.proxiedResponsesObserved).toBe(0);
    expect(enqueuedAt.size).toBe(0);
  });

  it("drops an event when configurePassive has never been called", () => {
    resetPassiveForTest();
    setPassiveReady(true);
    const sdk = makeFakeSdk();
    expect(() =>
      onResponse(sdk, makeFakeRequest(), makeFakeResponse()),
    ).not.toThrow();
  });

  it("admits once the latch is set", () => {
    wire(false);
    const sdk = makeFakeSdk();
    onResponse(sdk, makeFakeRequest(), makeFakeResponse());
    expect(queue.depth).toBe(0);
    setPassiveReady(true);
    onResponse(sdk, makeFakeRequest({ id: "2" }), makeFakeResponse());
    expect(queue.depth).toBe(1);
  });
});

describe("the queue entry", () => {
  it("carries EXACTLY id, bytes, kind", () => {
    const sdk = makeFakeSdk();
    onResponse(
      sdk,
      makeFakeRequest({ id: "abc" }),
      makeFakeResponse({ bodyBytes: "console.log(1)" }),
    );
    const entry = queue.take() as Entry;
    expect(entry).toBeDefined();
    expect(Object.keys(entry).sort()).toEqual(["bytes", "id", "kind"]);
    expect(entry.id).toBe("abc");
    expect(entry.kind).toBe("js");
    expect(entry.bytes).toBe(14);
  });

  it("carries the byte length from body.length, not from a decode", () => {
    // The declared-length body throws from toRaw()/toText(); reaching 8 MiB
    // without an 8 MiB allocation is the point, and a hook that decoded would
    // throw instead of enqueueing.
    const sdk = makeFakeSdk();
    onResponse(
      sdk,
      makeFakeRequest(),
      makeFakeResponse({ bodyLength: PASSIVE_MAX_BYTES }),
    );
    expect(counters.hookErrors).toBe(0);
    expect((queue.take() as Entry).bytes).toBe(PASSIVE_MAX_BYTES);
  });
});

describe("counters", () => {
  it("starts every reject reason at zero", () => {
    for (const r of REJECT_REASONS) {
      expect(counters.rejected[r], `rejected.${r}`).toBe(0);
    }
  });

  it("increments the NAMED reason and never the queue", () => {
    const sdk = makeFakeSdk();
    onResponse(sdk, makeFakeRequest(), makeFake304());
    expect(counters.rejected.revalidation).toBe(1);
    expect(counters.rejected.not_scriptish).toBe(0);
    expect(counters.proxiedResponsesObserved).toBe(1);
    expect(counters.admitted).toBe(0);
    expect(queue.depth).toBe(0);
  });

  it("counts an out-of-scope response under its own reason", () => {
    const sdk = makeFakeSdk({ inScope: () => false });
    onResponse(sdk, makeFakeRequest(), makeFakeResponse());
    expect(counters.rejected.out_of_scope).toBe(1);
    expect(queue.depth).toBe(0);
  });

  it("records a queue overflow when the queue is at cap", () => {
    // A small cap, so the overflow is reachable without 2048 fake responses.
    queue = new BoundedQueue(500);
    resetTelemetryForTest();
    enqueuedAt = new Map();
    configurePassive({
      queue,
      enqueuedAt,
      admissionAllowed: () => true,
    });
    setPassiveReady(true);
    const sdk = makeFakeSdk();
    for (let i = 0; i < 501; i += 1) {
      onResponse(sdk, makeFakeRequest({ id: String(i) }), makeFakeResponse());
    }
    expect(queue.depth).toBe(500);
    expect(counters.queueOverflow).toBe(1);
    expect(queue.overflowCount).toBe(1);
    // An overflowed entry is still ADMITTED — it passed the gate. Conflating the
    // two would hide our own under-sizing inside the rejection reasons.
    expect(counters.admitted).toBe(501);
  });
});

describe("a throw inside the gate is caught and counted", () => {
  it("does not propagate, and increments hookErrors", () => {
    const sdk = makeFakeSdk({
      inScope: () => {
        throw new Error("scope engine exploded");
      },
    });
    expect(() =>
      onResponse(sdk, makeFakeRequest(), makeFakeResponse()),
    ).not.toThrow();
    expect(counters.hookErrors).toBe(1);
    expect(queue.depth).toBe(0);
    expect(sdk.calls.consoleLog.join("\n")).toContain("hook skip");
  });

  it("survives sdk.console.log ALSO throwing", () => {
    // Observed in the field: `sdk.console.log` can throw during teardown, at
    // which point there is genuinely nothing left to do but not make it worse.
    const sdk = makeFakeSdk({
      inScope: () => {
        throw new Error("boom");
      },
      log: () => {
        throw new Error("console gone");
      },
    });
    expect(() =>
      onResponse(sdk, makeFakeRequest(), makeFakeResponse()),
    ).not.toThrow();
    expect(counters.hookErrors).toBe(1);
  });
});

describe("stampEnqueued is bounded", () => {
  it("stamps the admitted id", () => {
    const sdk = makeFakeSdk();
    onResponse(sdk, makeFakeRequest({ id: "42" }), makeFakeResponse());
    expect(enqueuedAt.has("42")).toBe(true);
  });

  it("evicts in insertion order once it outgrows the queue's cap", () => {
    // A dropped queue entry is never taken, so its timestamp would leak forever.
    const clock: EnqueueClock = new Map();
    for (let i = 0; i < 5; i += 1) stampEnqueued(clock, String(i), 3, 1000 + i);
    expect(clock.size).toBe(3);
    expect([...clock.keys()]).toEqual(["2", "3", "4"]);
  });
});
