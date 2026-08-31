// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// packages/frontend/src/stores/scan-progress.spec.ts — the second payload
// variant's destination, and the invariant it is routed AROUND rather than
// THROUGH.
//
// ===========================================================================
// WHY THIS IS NOT A CASE IN coalescer.spec.ts
// ===========================================================================
// Because it must not be a case in the coalescer at all. D-15 asks for scan
// progress on the shipped event and says the never-re-order-while-a-row-is-
// selected rule must NOT hold it back; the coalescer checks that rule TWICE and
// both checks are before its debounce window, so a fourth category would accrue
// into the pill and never land while a row is selected — the exact opposite of
// what D-15 asks for.
//
// So progress rides the same EVENT and is routed to this store BEFORE the
// coalescer's handler is called. `stores/coalescer.ts` is not modified by the
// plan that added this file, and the cases below assert the consequence rather
// than the intention: with the triage lock ENGAGED, progress still applies —
// because the lock is not in this path and this store has no way to read it.
//
// THE CLOCK IS FAKE THROUGHOUT, the reason coalescer.spec.ts gives: real timers
// would make the twenty-payload case a second of wall time and, worse, flaky
// rather than exact.

import type {
  InvalidationEventPayload,
  InvalidationSummary,
  ScanProgressPayload,
} from "@defminer/engine/contract";
import {
  isScanProgressPayload,
  SCAN_PROGRESS_KIND,
} from "@defminer/engine/contract";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";

import type { InvalidationSubscription } from "../api/client";

import {
  createCoalescer,
  MAX_REACTIONS_PER_SECOND,
  REACTION_MIN_INTERVAL_MS,
} from "./coalescer";
import type { ScanProgressOptions, ScanProgressStore } from "./scan-progress";
import { useScanProgress } from "./scan-progress";

// ---------------------------------------------------------------------------
// THE STUB BUS — it carries the UNION, exactly as the one real event does
// ---------------------------------------------------------------------------

type Handler = (payload: InvalidationEventPayload) => void;

type Bus = {
  readonly subscribe: (handler: Handler) => InvalidationSubscription;
  readonly emit: (payload: InvalidationEventPayload) => void;
  readonly listenerCount: () => number;
};

function makeBus(): Bus {
  const listeners: Handler[] = [];
  return {
    subscribe: (handler) => {
      listeners.push(handler);
      return {
        stop: () => {
          const at = listeners.indexOf(handler);
          if (at >= 0) listeners.splice(at, 1);
        },
      };
    },
    emit: (payload) => {
      for (const listener of [...listeners]) listener(payload);
    },
    listenerCount: () => listeners.length,
  };
}

function progress(
  overrides: Partial<ScanProgressPayload> = {},
): ScanProgressPayload {
  return {
    kind: SCAN_PROGRESS_KIND,
    projectId: "p1",
    scanId: "s1",
    state: "running",
    pagesWalked: 1,
    seen: 20,
    admitted: 4,
    skippedDone: 1,
    rejected: 15,
    queued: 4,
    analysed: null,
    lastCreatedAt: 1_723_600_000_000,
    heldAtWatermark: false,
    ...overrides,
  };
}

function summary(
  overrides: Partial<InvalidationSummary> = {},
): InvalidationSummary {
  return {
    projectId: "p1",
    category: "artifacts",
    changedCount: 1,
    newestId: "sha-1",
    ...overrides,
  };
}

type Fixture = {
  readonly bus: Bus;
  readonly store: ScanProgressStore;
  readonly setProject: (id: string) => void;
};

function fixture(): Fixture {
  const bus = makeBus();
  const projectId = ref("p1");
  const options: ScanProgressOptions = {
    projectId: computed(() => projectId.value),
    subscribe: (handler) =>
      bus.subscribe((payload) => {
        // THE SHIPPED PREDICATE, not a copy of it. The discrimination happens in
        // `api/client.ts` at the ONE subscription site; this mirrors it with the
        // same function, so a change to the predicate reaches this spec too.
        if (isScanProgressPayload(payload)) handler(payload);
      }),
  };
  const store = useScanProgress(options);
  return {
    bus,
    store,
    setProject: (id: string) => {
      projectId.value = id;
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// THE LEADING EDGE
// ---------------------------------------------------------------------------

describe("the leading edge — the FIRST payload lands immediately", () => {
  it("applies without waiting for a window", async () => {
    // The behavioural difference from the entity coalescer, and it is a decision
    // rather than an accident: an operator who has just pressed Start scan and
    // watches an unchanged screen for half a second has already learned the
    // wrong thing about whether anything is happening.
    const f = fixture();

    f.bus.emit(progress({ seen: 20 }));

    expect(f.store.appliedCount.value).toBe(1);
    expect(f.store.progress.value?.seen).toBe(20);
    // Nothing was scheduled to make that true.
    await vi.advanceTimersByTimeAsync(0);
    expect(f.store.appliedCount.value).toBe(1);
  });

  it("keeps the NEWEST payload, never an older one that arrived first", async () => {
    const f = fixture();

    f.bus.emit(progress({ pagesWalked: 1, seen: 20 }));
    await vi.advanceTimersByTimeAsync(REACTION_MIN_INTERVAL_MS * 2);
    f.bus.emit(progress({ pagesWalked: 2, seen: 40 }));

    expect(f.store.progress.value?.pagesWalked).toBe(2);
    expect(f.store.progress.value?.seen).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// THE CAP
// ---------------------------------------------------------------------------

describe("the rate cap is the SHIPPED one, imported and not restated", () => {
  it("turns twenty payloads in one simulated second into AT MOST the cap", async () => {
    const f = fixture();

    for (let index = 0; index < 20; index++) {
      f.bus.emit(progress({ pagesWalked: index + 1 }));
      await vi.advanceTimersByTimeAsync(50);
    }

    // NOT ZERO AND NOT TWENTY. Zero is what a pure trailing debounce produces
    // over a sustained stream (measured in Phase 5 as P5-D60), and twenty is a
    // re-render per event on a surface the operator is reading.
    expect(f.store.appliedCount.value).toBeGreaterThanOrEqual(1);
    expect(f.store.appliedCount.value).toBeLessThanOrEqual(
      MAX_REACTIONS_PER_SECOND,
    );
  });

  it("has NO trailing application — the burst ending fires nothing more", async () => {
    const f = fixture();

    for (let index = 0; index < 20; index++) {
      f.bus.emit(progress({ pagesWalked: index + 1 }));
    }
    const duringBurst = f.store.appliedCount.value;

    await vi.advanceTimersByTimeAsync(REACTION_MIN_INTERVAL_MS * 10);

    expect(
      f.store.appliedCount.value,
      "a trailing application fired after the stream stopped. The progress path " +
        "is leading-throttled with no trailing edge; a trailing window here " +
        "would be a second mechanism holding the same cap.",
    ).toBe(duringBurst);
  });
});

// ---------------------------------------------------------------------------
// THE PROJECT RACE
// ---------------------------------------------------------------------------

describe("the project-race guard, copied in effect from the coalescer", () => {
  it("ignores a payload for a project that is not the active one", async () => {
    const f = fixture();

    f.bus.emit(progress({ projectId: "p2", seen: 999 }));

    expect(f.store.appliedCount.value).toBe(0);
    expect(f.store.progress.value).toBeNull();
    await vi.advanceTimersByTimeAsync(REACTION_MIN_INTERVAL_MS * 4);
    expect(f.store.appliedCount.value).toBe(0);
  });

  it("follows the active project when it changes", async () => {
    const f = fixture();

    f.bus.emit(progress({ projectId: "p1", seen: 20 }));
    expect(f.store.progress.value?.seen).toBe(20);

    f.setProject("p2");
    await vi.advanceTimersByTimeAsync(REACTION_MIN_INTERVAL_MS * 4);
    f.bus.emit(progress({ projectId: "p1", seen: 999 }));
    await vi.advanceTimersByTimeAsync(REACTION_MIN_INTERVAL_MS * 4);

    expect(f.store.progress.value?.seen).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// THE TRIAGE LOCK IS NOT IN THIS PATH
// ---------------------------------------------------------------------------

describe("the triage-lock invariant is routed AROUND, never weakened", () => {
  it("takes no lock and no refresh — not passing them in IS the mechanism", () => {
    // Asserted over the OPTIONS the store actually accepts. A store that could
    // read the lock is a store somebody eventually teaches to respect it, and
    // the moment it does, D-15's "progress lands immediately" is gone.
    const bus = makeBus();
    // ANNOTATED, so TypeScript's excess-property check is the first line of the
    // guard: an options object that grew a `triageLocked` or a `refresh` would
    // not compile, and the key-set assertion below would never get to run.
    const options: ScanProgressOptions = {
      projectId: computed(() => "p1"),
      subscribe: (handler: (payload: ScanProgressPayload) => void) =>
        bus.subscribe((payload) => {
          if (isScanProgressPayload(payload)) handler(payload);
        }),
    };
    expect(Object.keys(options).sort()).toEqual(["projectId", "subscribe"]);

    const store = useScanProgress(options);
    // And the store hands nothing back that could refetch an entity table.
    expect(Object.keys(store).sort()).toEqual([
      "appliedCount",
      "progress",
      "stop",
    ]);
    store.stop();
  });

  it("applies WITH A ROW SELECTED, which is the whole point of the routing", async () => {
    // The negative the interaction contract asks for by name. One bus, two
    // destinations: the coalescer sees only summaries and is locked; the
    // progress store sees only progress and is not.
    const bus = makeBus();
    const projectId = ref("p1");
    const selected = ref<string | null>(null);
    let refreshes = 0;

    const coalescer = createCoalescer({
      gate: {
        projectId: computed(() => projectId.value),
        triageLocked: computed(() => selected.value !== null),
        refresh: () => {
          refreshes++;
          return Promise.resolve();
        },
      },
      subscribe: (handler) =>
        bus.subscribe((payload) => {
          if (!isScanProgressPayload(payload)) handler(payload);
        }),
    });
    const store = useScanProgress({
      projectId: computed(() => projectId.value),
      subscribe: (handler) =>
        bus.subscribe((payload) => {
          if (isScanProgressPayload(payload)) handler(payload);
        }),
    });

    // THE OPERATOR IS MID-TRIAGE. Nothing may re-order the table.
    selected.value = "sha-1";

    bus.emit(summary({ changedCount: 7 }));
    bus.emit(progress({ seen: 40 }));
    await vi.advanceTimersByTimeAsync(REACTION_MIN_INTERVAL_MS * 8);

    // The suppression held: the summary accrued into the pill and applied
    // nothing.
    expect(coalescer.reactionCount.value).toBe(0);
    expect(refreshes).toBe(0);
    expect(coalescer.pendingTotal.value).toBe(7);

    // And the progress readout advanced anyway.
    expect(store.progress.value?.seen).toBe(40);
    expect(store.appliedCount.value).toBe(1);

    store.stop();
    coalescer.stop();
  });

  it("never increments the pill's total and never refetches", async () => {
    const bus = makeBus();
    const projectId = ref("p1");
    let refreshes = 0;

    const coalescer = createCoalescer({
      gate: {
        projectId: computed(() => projectId.value),
        triageLocked: computed(() => false),
        refresh: () => {
          refreshes++;
          return Promise.resolve();
        },
      },
      subscribe: (handler) =>
        bus.subscribe((payload) => {
          if (!isScanProgressPayload(payload)) handler(payload);
        }),
    });
    const store = useScanProgress({
      projectId: computed(() => projectId.value),
      subscribe: (handler) =>
        bus.subscribe((payload) => {
          if (isScanProgressPayload(payload)) handler(payload);
        }),
    });

    for (let index = 0; index < 5; index++) {
      bus.emit(progress({ pagesWalked: index + 1 }));
      await vi.advanceTimersByTimeAsync(600);
    }

    expect(coalescer.pendingTotal.value).toBe(0);
    expect(coalescer.reactionCount.value).toBe(0);
    expect(refreshes).toBe(0);
    expect(store.appliedCount.value).toBeGreaterThan(0);

    store.stop();
    coalescer.stop();
  });
});

// ---------------------------------------------------------------------------
// THE TWO HALVES OF stop()
// ---------------------------------------------------------------------------

describe("stop() stops BOTH the listener and any window in flight", () => {
  it("removes the subscription", () => {
    const f = fixture();
    expect(f.bus.listenerCount()).toBe(1);
    f.store.stop();
    expect(f.bus.listenerCount()).toBe(0);
  });

  it("silences an application that was already scheduled", async () => {
    // Stopping the listener alone leaves a window already in flight to fire into
    // a store the component no longer owns — the same leak by a different route,
    // and research P-04's whole subject.
    const f = fixture();

    f.bus.emit(progress({ pagesWalked: 1 }));
    expect(f.store.appliedCount.value).toBe(1);

    f.store.stop();
    f.bus.emit(progress({ pagesWalked: 2 }));
    await vi.advanceTimersByTimeAsync(REACTION_MIN_INTERVAL_MS * 8);

    expect(f.store.appliedCount.value).toBe(1);
    expect(f.store.progress.value?.pagesWalked).toBe(1);
  });
});
