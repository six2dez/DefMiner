// packages/engine/src/queue.spec.ts — CORE-03's bounded queue, at its boundaries.
//
// The properties here are the ones a queue gets wrong in ways that no smoke test
// notices: an off-by-one at the cap, a drop that takes the WRONG end, an overflow
// counter that a read resets, and an entry type that quietly grows until the
// memory argument for the cap stops holding.

import { describe, expect, it } from "vitest";

import { BoundedQueue, type Entry } from "./queue";
import { EVENTS_DELIVERED_UNDER_BLOCK, QUEUE_CAP } from "./thresholds";

const CAP = QUEUE_CAP;

function entry(i: number): Entry {
  return { id: String(i), bytes: 100 + i, kind: "js" };
}

/** Offer `count` entries numbered from 0. */
function fill(q: BoundedQueue, count: number): void {
  for (let i = 0; i < count; i += 1) q.offer(entry(i));
}

describe("the cap is DERIVED from the measured burst, not chosen", () => {
  it("refuses a cap below EVENTS_DELIVERED_UNDER_BLOCK, naming the number", () => {
    // A queue under the only burst anyone has MEASURED would report our own
    // under-sizing as if it were target-driven back-pressure (Pitfall 3), and the
    // operator would have no way to tell the two apart.
    let thrown: unknown;
    try {
      new BoundedQueue(EVENTS_DELIVERED_UNDER_BLOCK - 1);
    } catch (e) {
      thrown = e;
    }
    expect(
      thrown,
      `a cap of ${EVENTS_DELIVERED_UNDER_BLOCK - 1} must throw — it is below the measured burst.`,
    ).toBeInstanceOf(Error);
    expect(String(thrown)).toContain(String(EVENTS_DELIVERED_UNDER_BLOCK));
  });

  it("accepts a cap of exactly EVENTS_DELIVERED_UNDER_BLOCK", () => {
    // ADJACENCY, not a round number: 499 throws and 500 does not. Asserting only
    // "some small number throws" would pass with the comparison written either
    // way round.
    expect(EVENTS_DELIVERED_UNDER_BLOCK).toBe(500);
    const q = new BoundedQueue(EVENTS_DELIVERED_UNDER_BLOCK);
    expect(q.cap).toBe(500);
    expect(q.depth).toBe(0);
  });

  it("QUEUE_CAP itself is a legal cap that clears the burst with margin", () => {
    // The DERIVATION (>= 4x the measured burst, and under 1 MiB at 200 bytes an
    // entry) belongs to thresholds.spec.ts and is asserted there. What this file
    // owns is only that the queue ACCEPTS the constant the plugin constructs it
    // with — a cap that failed the constructor guard would be a plugin that never
    // starts, and that failure should not first appear in a live instance.
    expect(QUEUE_CAP).toBeGreaterThanOrEqual(EVENTS_DELIVERED_UNDER_BLOCK * 4);
    expect(new BoundedQueue(QUEUE_CAP).cap).toBe(QUEUE_CAP);
  });
});

describe("an empty queue", () => {
  it("reports depth 0 and overflowCount 0", () => {
    const q = new BoundedQueue(CAP);
    expect(q.depth).toBe(0);
    expect(q.overflowCount).toBe(0);
  });

  it("returns undefined from take() rather than throwing", () => {
    const q = new BoundedQueue(CAP);
    expect(q.take()).toBeUndefined();
    // Twice: a queue that threw only on the second empty take would pass a
    // single-call assertion.
    expect(q.take()).toBeUndefined();
  });

  it("returns an empty array from drain()", () => {
    const q = new BoundedQueue(CAP);
    expect(q.drain(10)).toEqual([]);
  });
});

describe("the bound holds at the boundary", () => {
  it("offering exactly cap entries leaves depth === cap and no overflow", () => {
    const q = new BoundedQueue(CAP);
    fill(q, CAP);
    expect(q.depth).toBe(CAP);
    expect(q.overflowCount).toBe(0);
  });

  it("offering cap + 1 leaves depth === cap and overflowCount === 1", () => {
    const q = new BoundedQueue(CAP);
    fill(q, CAP + 1);
    expect(q.depth).toBe(CAP);
    expect(q.overflowCount).toBe(1);
  });

  it("offering 3000 to a cap of 2048 leaves 952 overflows and depth 2048", () => {
    const q = new BoundedQueue(CAP);
    fill(q, 3000);
    expect(q.depth).toBe(2048);
    expect(q.overflowCount).toBe(3000 - 2048);
    expect(q.overflowCount).toBe(952);
  });

  it("offer() reports acceptance and displacement distinctly", () => {
    const q = new BoundedQueue(EVENTS_DELIVERED_UNDER_BLOCK);
    for (let i = 0; i < EVENTS_DELIVERED_UNDER_BLOCK; i += 1) {
      expect(q.offer(entry(i))).toBe(true);
    }
    expect(q.offer(entry(9999))).toBe(false);
  });
});

describe("FIFO order, and drop-OLDEST on overflow (decision P3-D1)", () => {
  it("takes entries in offer order when nothing overflowed", () => {
    const q = new BoundedQueue(CAP);
    fill(q, 5);
    expect([0, 1, 2, 3, 4].map(() => q.take()?.id)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("after overflow the retained window is the most recent cap entries, in arrival order", () => {
    // The divergence from the `probe/tier0-events` analog, asserted rather than
    // merely commented: the analog drops the NEWEST. The newest artifact is the
    // one the operator is looking at right now, and discarding it to preserve a
    // stale backlog inverts the value of the queue.
    const q = new BoundedQueue(CAP);
    fill(q, 3000);
    const drained = q.drain(CAP);
    expect(drained.length).toBe(CAP);
    expect(drained[0].id).toBe(String(3000 - CAP));
    expect(drained[drained.length - 1].id).toBe("2999");
    // Strictly ascending with no gap — the window is contiguous, not a sample.
    for (let i = 1; i < drained.length; i += 1) {
      expect(Number(drained[i].id) - Number(drained[i - 1].id)).toBe(1);
    }
    expect(q.depth).toBe(0);
  });

  it("a drain does not change overflowCount", () => {
    const q = new BoundedQueue(CAP);
    fill(q, 3000);
    const before = q.overflowCount;
    q.drain(CAP);
    expect(q.overflowCount).toBe(before);
    expect(q.overflowCount).toBe(952);
  });
});

describe("overflowCount is monotonic", () => {
  it("increments by exactly 1 per dropped entry", () => {
    const q = new BoundedQueue(CAP);
    fill(q, CAP);
    for (let n = 1; n <= 10; n += 1) {
      q.offer(entry(10_000 + n));
      expect(q.overflowCount).toBe(n);
    }
  });

  it("is never reset by a take, and keeps counting across takes", () => {
    const q = new BoundedQueue(CAP);
    fill(q, CAP + 7);
    expect(q.overflowCount).toBe(7);
    q.take();
    q.take();
    expect(q.overflowCount).toBe(7);
    // Room was made by the takes, so these two do NOT overflow...
    q.offer(entry(20_001));
    q.offer(entry(20_002));
    expect(q.overflowCount).toBe(7);
    // ...and the next one does.
    q.offer(entry(20_003));
    expect(q.overflowCount).toBe(8);
  });
});

describe("drain(n)", () => {
  it("returns at most n, FIFO", () => {
    const q = new BoundedQueue(CAP);
    fill(q, 10);
    expect(q.drain(3).map((e) => e.id)).toEqual(["0", "1", "2"]);
    expect(q.depth).toBe(7);
    expect(q.take()?.id).toBe("3");
  });

  it("returns fewer than n when the queue holds fewer", () => {
    const q = new BoundedQueue(CAP);
    fill(q, 2);
    expect(q.drain(50).length).toBe(2);
    expect(q.depth).toBe(0);
  });

  it("treats a non-positive n as zero rather than as 'everything'", () => {
    const q = new BoundedQueue(CAP);
    fill(q, 5);
    expect(q.drain(0)).toEqual([]);
    expect(q.drain(-1)).toEqual([]);
    expect(q.depth).toBe(5);
  });
});

describe("the entry type stays exactly three keys", () => {
  it("an entry taken from the queue has exactly id, bytes, kind", () => {
    // The memory argument for QUEUE_CAP (roughly 100-200 bytes per entry, so
    // 2048 entries cost well under 1 MiB) evaporates the moment somebody adds
    // headers or a body here — and CORE-05 forbids an SDK reference outright,
    // which is what a fourth key would most likely smuggle in.
    const q = new BoundedQueue(CAP);
    q.offer({ id: "abc", bytes: 42, kind: "js" });
    const taken = q.take();
    expect(taken).toBeDefined();
    expect(Object.keys(taken as object).sort()).toEqual([
      "bytes",
      "id",
      "kind",
    ]);
  });

  it("stores the entry as given rather than copying it", () => {
    // `take()` returning the identical object is what lets the hook build the
    // entry once. A copy would be a second allocation per admitted response on
    // the thread CORE-01 exists to protect.
    const q = new BoundedQueue(CAP);
    const e: Entry = { id: "x", bytes: 1, kind: "js" };
    q.offer(e);
    expect(q.take()).toBe(e);
  });
});
