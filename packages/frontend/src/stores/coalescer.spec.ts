// @vitest-environment jsdom
//
// packages/frontend/src/stores/coalescer.spec.ts — the two halves of the
// coalescing contract, asserted SEPARATELY and on purpose.
//
// ===========================================================================
// WHY THE RATE CAP AND THE SUPPRESSION RULE ARE NEVER ASSERTED TOGETHER
// ===========================================================================
// They are different properties with different consequences and they fail
// independently. The cap is about the RENDERER — an event flood must not drive
// unbounded re-renders on a ten-thousand-row surface. The suppression rule is
// about DURABLE STATE — while the operator has a row selected or the evidence
// panel open, the table must not re-order or re-render, because a row shifting
// under the cursor mid-triage is how they mark the wrong finding as a false
// positive, and that writes something they cannot take back.
//
// A single test asserting "few reactions while a row is selected" would let a
// passing rate cap mask a broken suppression: two reactions is within the cap
// and is a triage-state corruption. So every suppression case here asserts
// EXACTLY ZERO reactions, and the cap cases assert the cap without touching
// selection at all.
//
// The clock is fake throughout. Real timers would make the twenty-events case a
// second of wall time and, worse, would make it flaky rather than exact.

import type { InvalidationSummary } from "@defminer/engine/contract";
import { INVALIDATION_CATEGORIES } from "@defminer/engine/contract";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computed, ref } from "vue";

import type { InvalidationSubscription } from "../api/client";

import type { CoalescerOptions, InvalidationCoalescer } from "./coalescer";
import {
  COALESCE_TRAILING_WINDOW_MS,
  createCoalescer,
  MAX_REACTIONS_PER_SECOND,
  REACTION_MIN_INTERVAL_MS,
} from "./coalescer";
import type { TriageGate } from "./inventory";
import { createInventoryStore } from "./inventory";

// ---------------------------------------------------------------------------
// THE STUB EVENT BUS AND THE STUB GATE
// ---------------------------------------------------------------------------

type Handler = (summary: InvalidationSummary) => void;

type Bus = {
  readonly subscribe: (handler: Handler) => InvalidationSubscription;
  readonly emit: (summary: InvalidationSummary) => void;
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
    emit: (summary) => {
      for (const listener of [...listeners]) listener(summary);
    },
    listenerCount: () => listeners.length,
  };
}

type StubGate = {
  readonly gate: TriageGate;
  readonly refreshes: () => number;
  readonly select: (rowKey: string | null) => void;
  readonly setPanel: (open: boolean) => void;
  readonly setProject: (projectId: string) => void;
};

function makeGate(): StubGate {
  const projectId = ref("p1");
  const selected = ref<string | null>(null);
  const panelOpen = ref(false);
  let refreshes = 0;

  return {
    gate: {
      projectId: computed(() => projectId.value),
      triageLocked: computed(() => selected.value !== null || panelOpen.value),
      refresh: () => {
        refreshes++;
        return Promise.resolve();
      },
    },
    refreshes: () => refreshes,
    select: (rowKey) => {
      selected.value = rowKey;
    },
    setPanel: (open) => {
      panelOpen.value = open;
    },
    setProject: (next) => {
      projectId.value = next;
    },
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
  readonly gate: StubGate;
  readonly coalescer: InvalidationCoalescer;
};

function fixture(trailingWindowMs?: number): Fixture {
  const bus = makeBus();
  const gate = makeGate();
  const options: CoalescerOptions =
    trailingWindowMs === undefined
      ? { gate: gate.gate, subscribe: bus.subscribe }
      : { gate: gate.gate, subscribe: bus.subscribe, trailingWindowMs };
  return { bus, gate, coalescer: createCoalescer(options) };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// THE RATE CAP — no selection is touched anywhere in this block
// ---------------------------------------------------------------------------

/**
 * The pending map with every category at zero, DERIVED rather than written out.
 *
 * `zeroed()` in the store builds its keys from `INVALIDATION_CATEGORIES`, so a
 * hand-copied literal here is a second declaration of that list which goes stale
 * the moment a phase appends the entity category its own new table needs — plan
 * 07-04 appended two and reddened both assertions below, neither of which has any
 * opinion about recovered source. Spreading this and overriding the categories a
 * case is actually about keeps each expectation ABOUT that case.
 */
function pendingZeroed(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const category of INVALIDATION_CATEGORIES) out[category] = 0;
  return out;
}

describe("the reaction rate cap", () => {
  it("reacts once, AFTER the trailing window and not before", async () => {
    const f = fixture();

    f.bus.emit(summary({ changedCount: 4 }));
    await vi.advanceTimersByTimeAsync(COALESCE_TRAILING_WINDOW_MS - 1);
    expect(f.coalescer.reactionCount.value).toBe(0);
    expect(f.gate.refreshes()).toBe(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(f.coalescer.reactionCount.value).toBe(1);
    expect(f.gate.refreshes()).toBe(1);
    expect(f.coalescer.pendingTotal.value).toBe(0);
  });

  it("turns twenty summaries in one simulated second into AT MOST two reactions", async () => {
    const f = fixture();

    for (let index = 0; index < 20; index++) {
      f.bus.emit(summary({ changedCount: 1, newestId: `sha-${index}` }));
      await vi.advanceTimersByTimeAsync(50);
    }

    expect(f.coalescer.reactionCount.value).toBeLessThanOrEqual(
      MAX_REACTIONS_PER_SECOND,
    );

    // And the flood is not simply swallowed: once it stops, the trailing window
    // still produces the reaction that brings the table up to date.
    await vi.advanceTimersByTimeAsync(REACTION_MIN_INTERVAL_MS * 4);
    expect(f.coalescer.reactionCount.value).toBeGreaterThanOrEqual(1);
    expect(f.coalescer.pendingTotal.value).toBe(0);
  });

  it("holds the cap when the trailing window is too short to hold it — the throttle is load-bearing", async () => {
    // With a 20 ms window every one of these twenty summaries clears the
    // debounce on its own, so the debounce cannot be what enforces the cap.
    // Without the throttle gate this test reports twenty reactions.
    const f = fixture(20);

    for (let index = 0; index < 20; index++) {
      f.bus.emit(summary({ newestId: `sha-${index}` }));
      await vi.advanceTimersByTimeAsync(45);
    }

    expect(f.coalescer.reactionCount.value).toBeGreaterThanOrEqual(1);
    expect(f.coalescer.reactionCount.value).toBeLessThanOrEqual(
      MAX_REACTIONS_PER_SECOND,
    );
  });

  it("does not STARVE under a sustained stream — reactions keep arriving, capped", async () => {
    // A debounce alone never fires while events keep coming, which on a busy
    // target means the operator watches a table that stops updating entirely.
    const f = fixture();
    const seconds = 3;

    for (let index = 0; index < seconds * 20; index++) {
      f.bus.emit(summary({ newestId: `sha-${index}` }));
      await vi.advanceTimersByTimeAsync(50);
    }

    expect(f.coalescer.reactionCount.value).toBeGreaterThanOrEqual(1);
    expect(f.coalescer.reactionCount.value).toBeLessThanOrEqual(
      seconds * MAX_REACTIONS_PER_SECOND,
    );
  });

  it("accumulates categories separately while they share ONE cap", async () => {
    const f = fixture();

    f.bus.emit(summary({ category: "artifacts", changedCount: 3 }));
    f.bus.emit(summary({ category: "artifacts", changedCount: 3 }));
    f.bus.emit(summary({ category: "observations", changedCount: 1 }));
    f.bus.emit(summary({ category: "analyses", changedCount: 5 }));

    expect(f.coalescer.pendingByCategory.value).toEqual({
      ...pendingZeroed(),
      artifacts: 6,
      observations: 1,
      analyses: 5,
    });
    expect(f.coalescer.pendingTotal.value).toBe(12);

    await vi.advanceTimersByTimeAsync(COALESCE_TRAILING_WINDOW_MS);
    expect(f.coalescer.reactionCount.value).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// THE SUPPRESSION RULE — every assertion here is EXACTLY ZERO
// ---------------------------------------------------------------------------

describe("suppression while the operator is mid-triage", () => {
  it("reacts ZERO times while a row is selected, and accrues the counts", async () => {
    const f = fixture();
    f.gate.select("row-1");

    for (let index = 0; index < 20; index++) {
      f.bus.emit(summary({ changedCount: 2, newestId: `sha-${index}` }));
      await vi.advanceTimersByTimeAsync(50);
    }
    await vi.advanceTimersByTimeAsync(COALESCE_TRAILING_WINDOW_MS * 10);

    expect(f.coalescer.reactionCount.value).toBe(0);
    expect(f.gate.refreshes()).toBe(0);
    expect(f.coalescer.pendingTotal.value).toBe(40);
  });

  it("reacts ZERO times while the panel is open with NO row selected", async () => {
    // Independent of the selection: the panel is a persistent region and the
    // operator reads it while nothing is highlighted.
    const f = fixture();
    f.gate.setPanel(true);

    for (let index = 0; index < 20; index++) {
      f.bus.emit(summary({ changedCount: 1, newestId: `sha-${index}` }));
      await vi.advanceTimersByTimeAsync(50);
    }
    await vi.advanceTimersByTimeAsync(COALESCE_TRAILING_WINDOW_MS * 10);

    expect(f.coalescer.reactionCount.value).toBe(0);
    expect(f.gate.refreshes()).toBe(0);
    expect(f.coalescer.pendingTotal.value).toBe(20);
  });

  it("does not let a reaction ALREADY IN THE WINDOW land after a row is selected", async () => {
    // The late arrival of the same defect: the summary entered the debounce
    // while nothing was selected, and the operator selected a row before the
    // window elapsed. Re-checking only at entry would re-order the table under
    // a cursor that is already on a row.
    const f = fixture();

    f.bus.emit(summary({ changedCount: 2 }));
    await vi.advanceTimersByTimeAsync(COALESCE_TRAILING_WINDOW_MS - 10);
    f.gate.select("row-9");
    await vi.advanceTimersByTimeAsync(COALESCE_TRAILING_WINDOW_MS * 10);

    expect(f.coalescer.reactionCount.value).toBe(0);
    expect(f.gate.refreshes()).toBe(0);
    expect(f.coalescer.pendingTotal.value).toBe(2);
  });

  it("does not react when the selection is merely CLEARED", async () => {
    const f = fixture();
    f.gate.select("row-1");
    f.bus.emit(summary({ changedCount: 7 }));
    await vi.advanceTimersByTimeAsync(COALESCE_TRAILING_WINDOW_MS);

    f.gate.select(null);
    await vi.advanceTimersByTimeAsync(COALESCE_TRAILING_WINDOW_MS * 4);

    expect(f.coalescer.reactionCount.value).toBe(0);
    expect(f.coalescer.pendingTotal.value).toBe(7);
  });

  it("NEVER auto-applies the pending count on inactivity — decision D4", async () => {
    const f = fixture();
    f.gate.select("row-1");
    f.bus.emit(summary({ changedCount: 5 }));
    await vi.advanceTimersByTimeAsync(COALESCE_TRAILING_WINDOW_MS);
    f.gate.select(null);

    // Ten minutes of an idle tab. An inactivity timer here would reintroduce
    // exactly the row-shift the suppression rule exists to remove.
    await vi.advanceTimersByTimeAsync(600_000);

    expect(f.coalescer.pendingTotal.value).toBe(5);
    expect(f.coalescer.reactionCount.value).toBe(0);
    expect(f.gate.refreshes()).toBe(0);
  });

  it("applies the pending count on the refresh action, and resets it", async () => {
    const f = fixture();
    f.gate.select("row-1");
    f.bus.emit(summary({ changedCount: 3 }));
    f.bus.emit(summary({ category: "observations", changedCount: 2 }));
    await vi.advanceTimersByTimeAsync(COALESCE_TRAILING_WINDOW_MS);
    expect(f.coalescer.pendingTotal.value).toBe(5);

    await f.coalescer.applyPending();

    expect(f.coalescer.pendingTotal.value).toBe(0);
    expect(f.coalescer.pendingByCategory.value).toEqual(pendingZeroed());
    expect(f.gate.refreshes()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// THE PROJECT BOUNDARY AND THE SUBSCRIPTION HANDLE
// ---------------------------------------------------------------------------

describe("the project boundary and the subscription handle", () => {
  it("discards a summary carrying a DIFFERENT project id", async () => {
    const f = fixture();

    f.bus.emit(summary({ projectId: "p2", changedCount: 99 }));
    await vi.advanceTimersByTimeAsync(COALESCE_TRAILING_WINDOW_MS * 4);

    expect(f.coalescer.pendingTotal.value).toBe(0);
    expect(f.coalescer.reactionCount.value).toBe(0);
    expect(f.gate.refreshes()).toBe(0);
  });

  it("stops the subscription, and an event emitted afterwards changes NOTHING", async () => {
    const f = fixture();
    expect(f.bus.listenerCount()).toBe(1);

    f.coalescer.stop();

    expect(f.bus.listenerCount()).toBe(0);
    f.bus.emit(summary({ changedCount: 50 }));
    await vi.advanceTimersByTimeAsync(COALESCE_TRAILING_WINDOW_MS * 4);
    expect(f.coalescer.pendingTotal.value).toBe(0);
    expect(f.coalescer.reactionCount.value).toBe(0);
  });

  it("does not react from a window still in flight when stop() is called", async () => {
    // The leak this closes is the one research P-04 names: a handle that is
    // stopped but a timer that is not is still a reaction after unmount.
    const f = fixture();

    f.bus.emit(summary({ changedCount: 1 }));
    await vi.advanceTimersByTimeAsync(COALESCE_TRAILING_WINDOW_MS - 10);
    f.coalescer.stop();
    await vi.advanceTimersByTimeAsync(COALESCE_TRAILING_WINDOW_MS * 4);

    expect(f.coalescer.reactionCount.value).toBe(0);
    expect(f.gate.refreshes()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AGAINST THE REAL STORE — the two modules actually compose
// ---------------------------------------------------------------------------

describe("composed with the real inventory store", () => {
  it("suppresses reactions when a row is selected IN THE STORE", async () => {
    const bus = makeBus();
    const store = createInventoryStore<{ id: string }>({
      projectId: "p1",
      table: "artifacts",
      sortKey: "last_seen",
      direction: "desc",
      readPage: () =>
        Promise.resolve({
          ok: true,
          value: {
            rows: [{ id: "r0" }],
            nextCursor: null,
            scanned: 1,
            exhausted: true,
          },
        }),
      countRows: () =>
        Promise.resolve({
          ok: true,
          value: {
            visible: 1,
            hiddenBySuppression: 0,
            suppressionRuleCount: 0,
          },
        }),
    });
    const coalescer = createCoalescer({
      gate: store,
      subscribe: bus.subscribe,
    });
    await store.loadFirstPage();

    store.selectRow("r0");
    bus.emit(summary({ changedCount: 6 }));
    await vi.advanceTimersByTimeAsync(COALESCE_TRAILING_WINDOW_MS * 4);

    expect(coalescer.reactionCount.value).toBe(0);
    expect(coalescer.pendingTotal.value).toBe(6);

    coalescer.stop();
  });
});
