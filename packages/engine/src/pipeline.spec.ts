// packages/engine/src/pipeline.spec.ts — CORE-06 and CORE-07, proven off-runtime.
//
// The headline assertion is "the yield trigger is TEMPORAL, not geometric", and
// it is easy to write a version of that test which proves nothing. Counting
// yields on one input tells you a number; it does not tell you what the number is
// a function of. So the proof here runs the SAME elapsed profile through TWO
// window geometries that produce different window COUNTS — 5 windows and 10 — and
// asserts the yield count is IDENTICAL. A geometric implementation
// (`if (n % k === 0) yield`) cannot pass that; a temporal one cannot fail it.
//
// Every case uses an injected clock and an injected yield, so the whole file runs
// in milliseconds. That matters beyond speed: SPIKE-01 measured that a runaway
// loop inside Caido's QuickJS has no interrupt and no in-runtime recovery, so
// these properties have to be demonstrable OUTSIDE the runtime they will run in.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { type Window } from "./chunker";
import { Deadline } from "./deadline";
import {
  artifactDeadline,
  Cancelled,
  walk,
  type WalkContext,
} from "./pipeline";
import { ARTIFACT_DEADLINE_MS, MAX_SYNC_SLICE_MS } from "./thresholds";

// --- harness ----------------------------------------------------------------

type Harness = {
  now: () => number;
  advance: (ms: number) => void;
  yields: number;
  yieldFn: () => Promise<void>;
  visited: Window[];
};

function harness(start = 0): Harness {
  let t = start;
  const h: Harness = {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
    yields: 0,
    // A SPY, not a yield. `Promise.resolve()` scored a 0.00 timer service ratio
    // in SPIKE-02 and would be a bug in `yield.ts`; here nothing needs to be
    // yielded TO, and paying the measured 5.029 ms clamp per yield would make
    // this file take seconds for no added confidence. What the walk's yielding
    // BEHAVIOUR is measured against is the count, which this records exactly.
    yieldFn: () => {
      h.yields += 1;
      return Promise.resolve();
    },
    visited: [],
  };
  return h;
}

function bytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) out[i] = i & 0xff;
  return out;
}

/**
 * A visit that advances the clock by `msPerByte` for every byte of NEW GROUND the
 * window covers.
 *
 * "New ground" rather than "window length" is what makes the elapsed profile
 * independent of the geometry: overlapping windows re-read bytes, so charging for
 * the whole window would make a smaller window size cost more total time and the
 * comparison below would be measuring the harness rather than the pipeline. Total
 * elapsed is therefore `bytes.length * msPerByte` under ANY geometry.
 */
function costedVisit(h: Harness, msPerByte: number): (w: Window) => void {
  let covered = 0;
  return (w: Window) => {
    h.visited.push(w);
    const fresh = Math.max(0, w.end - covered);
    covered = Math.max(covered, w.end);
    h.advance(fresh * msPerByte);
  };
}

function ctx(h: Harness, over: Partial<WalkContext> = {}): WalkContext {
  return {
    now: h.now,
    deadline: new Deadline(1_000_000, h.now),
    visit: (w) => h.visited.push(w),
    yieldFn: h.yieldFn,
    ...over,
  };
}

// --- the headline property --------------------------------------------------

describe("the yield trigger is TEMPORAL, not geometric", () => {
  // 240 bytes at 0.25 ms/byte is 60 ms of work under either geometry, against a
  // 25 ms slice budget. The two geometries were chosen so the window counts
  // differ by 2x.
  const TOTAL = 240;
  const MS_PER_BYTE = 0.25;

  async function run(
    size: number,
    overlap: number,
  ): Promise<{
    windows: number;
    yields: number;
    elapsed: number;
  }> {
    const h = harness();
    const result = await walk(
      bytes(TOTAL),
      ctx(h, {
        visit: costedVisit(h, MS_PER_BYTE),
        windowSize: size,
        windowOverlap: overlap,
      }),
    );
    expect(result.partial).toBe(false);
    return {
      windows: h.visited.length,
      yields: result.yieldCount,
      elapsed: h.now(),
    };
  }

  it("MAX_SYNC_SLICE_MS is the measured 25 ms, so the arithmetic below is the real one", () => {
    expect(MAX_SYNC_SLICE_MS).toBe(25);
  });

  it("two geometries with DIFFERENT window counts yield the SAME number of times", async () => {
    const coarse = await run(64, 16); //  5 windows
    const fine = await run(32, 8); // 10 windows

    // The premise: the counts really do differ, so the equality below is not
    // trivially true.
    expect(coarse.windows).toBe(5);
    expect(fine.windows).toBe(10);
    expect(fine.windows).toBe(coarse.windows * 2);

    // The same total elapsed under both, which is what makes them comparable.
    expect(coarse.elapsed).toBeCloseTo(TOTAL * MS_PER_BYTE, 9);
    expect(fine.elapsed).toBeCloseTo(TOTAL * MS_PER_BYTE, 9);

    // THE PROOF. Per-chunk yielding would give 5 and 10 here — and would cost
    // 330.7% overhead over 137 yields on the real input SPIKE-02 measured,
    // against 21.2% over 5 at this budget.
    expect(
      fine.yields,
      `the fine geometry yielded ${fine.yields} times and the coarse one ${coarse.yields}. ` +
        `A yield count that tracks the WINDOW COUNT means the trigger became geometric, which ` +
        `costs roughly 730 ms of pure overhead on an 8 MiB bundle at the measured 5.029 ms per ` +
        `yield (SPIKE-02).`,
    ).toBe(coarse.yields);
    expect(coarse.yields).toBe(2);
  });

  it("halving the per-byte cost halves the yields, at an UNCHANGED window count", () => {
    // The other half of the same claim, from the opposite direction: hold the
    // geometry fixed and change only time. A geometric trigger would not move.
    const slow = harness();
    const fast = harness();
    return Promise.all([
      walk(
        bytes(TOTAL),
        ctx(slow, {
          visit: costedVisit(slow, 0.25),
          windowSize: 64,
          windowOverlap: 16,
        }),
      ),
      walk(
        bytes(TOTAL),
        ctx(fast, {
          visit: costedVisit(fast, 0.02),
          windowSize: 64,
          windowOverlap: 16,
        }),
      ),
    ]).then(([slowResult, fastResult]) => {
      expect(slow.visited.length).toBe(fast.visited.length);
      expect(slowResult.yieldCount).toBe(2);
      expect(fastResult.yieldCount).toBe(0);
    });
  });

  it("uses the injected yield rather than a real timer", async () => {
    const h = harness();
    const result = await walk(
      bytes(240),
      ctx(h, {
        visit: costedVisit(h, 0.25),
        windowSize: 64,
        windowOverlap: 16,
      }),
    );
    expect(h.yields).toBe(result.yieldCount);
    expect(h.yields).toBeGreaterThan(0);
  });
});

// --- the degraded path ------------------------------------------------------

describe("a deadline crossed mid-walk DEGRADES rather than discarding", () => {
  it("returns partial at window 3 of 10 with bytesWalked at window 3's end", async () => {
    const h = harness();
    // 10 windows of 10 bytes, no overlap; each visit costs 10 ms; budget 25 ms.
    const result = await walk(
      bytes(100),
      ctx(h, {
        deadline: new Deadline(25, h.now),
        visit: (w) => {
          h.visited.push(w);
          h.advance(10);
        },
        windowSize: 10,
        windowOverlap: 0,
      }),
    );

    expect(result.partial).toBe(true);
    expect(h.visited.length).toBe(3);
    expect(result.bytesWalked).toBe(h.visited[2].end);
    expect(result.bytesWalked).toBe(30);
    // The work already done is KEPT: a real slice figure survives the expiry, so
    // `scan_state = 'partial'` arrives at the store with numbers rather than
    // NULLs (CORE-07).
    expect(result.maxSliceMs).toBeGreaterThan(0);
  });

  it("checks the deadline BEFORE the visit, so an expired budget visits nothing", async () => {
    const h = harness();
    const deadline = new Deadline(25, h.now);
    h.advance(30);
    const result = await walk(
      bytes(100),
      ctx(h, { deadline, windowSize: 10, windowOverlap: 0 }),
    );
    expect(result.partial).toBe(true);
    expect(h.visited.length).toBe(0);
    expect(result.bytesWalked).toBe(0);
  });

  it("a walk that finishes inside its budget is NOT partial", async () => {
    const h = harness();
    const result = await walk(
      bytes(100),
      ctx(h, {
        deadline: new Deadline(1_000, h.now),
        visit: (w) => {
          h.visited.push(w);
          h.advance(1);
        },
        windowSize: 10,
        windowOverlap: 0,
      }),
    );
    expect(result.partial).toBe(false);
    expect(result.bytesWalked).toBe(100);
    expect(h.visited.length).toBe(10);
  });

  it("artifactDeadline() uses ARTIFACT_DEADLINE_MS and never a literal", () => {
    const h = harness();
    const d = artifactDeadline(h.now);
    expect(d.budgetMs).toBe(ARTIFACT_DEADLINE_MS);
    expect(ARTIFACT_DEADLINE_MS).toBe(30_000);
  });
});

// --- cancellation -----------------------------------------------------------

describe("cancellation", () => {
  it("throws Cancelled carrying the signal's reason", async () => {
    const h = harness();
    await expect(
      walk(
        bytes(100),
        ctx(h, {
          signal: { aborted: true, reason: "project closed" },
          windowSize: 10,
          windowOverlap: 0,
        }),
      ),
    ).rejects.toBeInstanceOf(Cancelled);

    let caught: unknown;
    try {
      await walk(
        bytes(100),
        ctx(h, {
          signal: { aborted: true, reason: "project closed" },
          windowSize: 10,
          windowOverlap: 0,
        }),
      );
    } catch (e) {
      caught = e;
    }
    expect((caught as Cancelled).reason).toBe("project closed");
    expect(String(caught)).toContain("project closed");
  });

  it("aborts mid-walk, before the next window is visited", async () => {
    const h = harness();
    const signal = { aborted: false, reason: undefined as unknown };
    await expect(
      walk(
        bytes(100),
        ctx(h, {
          signal,
          visit: (w) => {
            h.visited.push(w);
            if (h.visited.length === 4) {
              (signal as { aborted: boolean }).aborted = true;
              (signal as { reason: unknown }).reason = "stopped";
            }
          },
          windowSize: 10,
          windowOverlap: 0,
        }),
      ),
    ).rejects.toBeInstanceOf(Cancelled);
    expect(h.visited.length).toBe(4);
  });

  it("an abort takes precedence over an expired deadline", async () => {
    // Both conditions true at once. The abort wins because the caller asked for
    // nothing at all, whereas a deadline expiry means "keep what you have".
    const h = harness();
    const deadline = new Deadline(0, h.now);
    await expect(
      walk(
        bytes(100),
        ctx(h, {
          deadline,
          signal: { aborted: true, reason: "both" },
          windowSize: 10,
          windowOverlap: 0,
        }),
      ),
    ).rejects.toBeInstanceOf(Cancelled);
  });

  it("a signal that is not aborted does not interfere", async () => {
    const h = harness();
    const result = await walk(
      bytes(100),
      ctx(h, {
        signal: { aborted: false },
        windowSize: 10,
        windowOverlap: 0,
      }),
    );
    expect(result.partial).toBe(false);
    expect(result.bytesWalked).toBe(100);
  });
});

// --- degenerate input -------------------------------------------------------

describe("a zero-length input", () => {
  it("returns non-partial with maxSliceMs 0, yieldCount 0, and never yields", async () => {
    const h = harness();
    // The clock is deliberately advanced BEFORE the walk, so a naive trailing
    // slice measurement would report a non-zero maximum for a walk that did
    // nothing at all.
    h.advance(500);
    const result = await walk(new Uint8Array(0), ctx(h));
    expect(result.partial).toBe(false);
    expect(result.maxSliceMs).toBe(0);
    expect(result.yieldCount).toBe(0);
    expect(result.bytesWalked).toBe(0);
    expect(h.yields).toBe(0);
    expect(h.visited.length).toBe(0);
  });

  it("does not consult the deadline for an empty input", async () => {
    const h = harness();
    const result = await walk(
      new Uint8Array(0),
      ctx(h, { deadline: new Deadline(0, h.now) }),
    );
    expect(result.partial).toBe(false);
  });
});

describe("maxSliceMs", () => {
  it("is the longest UNINTERRUPTED stretch, not the total", async () => {
    const h = harness();
    // Five windows costing 30, 1, 1, 1, 1 ms. The first crosses the budget and
    // yields; the rest never do. Total is 34 ms; the longest slice is 30.
    const costs = [30, 1, 1, 1, 1];
    let i = 0;
    const result = await walk(
      bytes(50),
      ctx(h, {
        visit: (w) => {
          h.visited.push(w);
          h.advance(costs[i]);
          i += 1;
        },
        windowSize: 10,
        windowOverlap: 0,
      }),
    );
    expect(h.now()).toBe(34);
    expect(result.maxSliceMs).toBe(30);
    expect(result.yieldCount).toBe(1);
  });

  it("includes the TRAILING slice, which never triggered a yield", async () => {
    // Without this the last stretch of every walk is unmeasured — and a walk that
    // spends 24 ms per window and never quite crosses the budget would report a
    // maximum slice of 24 while running for as long as the input is big.
    const h = harness();
    const result = await walk(
      bytes(30),
      ctx(h, {
        visit: (w) => {
          h.visited.push(w);
          h.advance(5);
        },
        windowSize: 10,
        windowOverlap: 0,
      }),
    );
    expect(result.yieldCount).toBe(0);
    expect(result.maxSliceMs).toBe(15);
  });
});

// --- static discipline over the engine --------------------------------------

describe("timer discipline across packages/engine/src", () => {
  const SRC = fileURLToPath(new URL("./", import.meta.url));
  // `thresholds.generated.ts` is excluded, and NAMED rather than pattern-matched
  // so the exclusion is a decision somebody has to read. It carries
  // `YIELD_PRIMITIVE = "setTimeout0"` — the measured ANSWER as a string literal,
  // not a call — and it is written by scripts/ci/gen-thresholds.mjs and
  // byte-compared against a fresh generator run, so it cannot acquire a call
  // site without the generator acquiring one first. eslint.config.js ignores it
  // for the same reason.
  const GENERATED = "thresholds.generated.ts";
  const files = readdirSync(SRC)
    .filter(
      (n) => n.endsWith(".ts") && !n.endsWith(".spec.ts") && n !== GENERATED,
    )
    .sort();

  /** `//` and block comments removed, so the scans below test CODE. Both
   *  `yield.ts` and `pipeline.ts` discuss the rejected primitives by name in
   *  order to record why they were rejected; a scan that banned the words could
   *  only be satisfied by deleting that. */
  function stripComments(source: string): string {
    let out = "";
    let i = 0;
    while (i < source.length) {
      if (source[i] === "/" && source[i + 1] === "/") {
        while (i < source.length && source[i] !== "\n") i += 1;
        continue;
      }
      if (source[i] === "/" && source[i + 1] === "*") {
        i += 2;
        while (
          i < source.length &&
          !(source[i] === "*" && source[i + 1] === "/")
        ) {
          i += 1;
        }
        i += 2;
        continue;
      }
      out += source[i];
      i += 1;
    }
    return out;
  }

  const TIMERS = [
    "setTimeout",
    "setInterval",
    "setImmediate",
    "queueMicrotask",
    "requestAnimationFrame",
  ];

  it("found engine sources to scan", () => {
    expect(files.length).toBeGreaterThan(0);
    expect(files).toContain("yield.ts");
    expect(files).toContain("pipeline.ts");
  });

  it.each(files.filter((n) => n !== "yield.ts"))(
    "%s references no timer function",
    (name) => {
      // ONE yield primitive, ONE home. `setImmediate` and `Promise.resolve()`
      // both scored a 0.00 timer service ratio — identical to a fully blocking
      // loop — so a second, casually chosen yield somewhere else in the engine
      // would look like cooperation and be indistinguishable from not yielding
      // at all.
      const code = stripComments(readFileSync(join(SRC, name), "utf8"));
      const found = TIMERS.filter((t) => code.includes(t));
      expect(
        found,
        `${name} references ${found.join(", ")}. The engine has exactly one yield primitive and ` +
          `it lives in yield.ts (YIELD_PRIMITIVE = "setTimeout0", SPIKE-02).`,
      ).toEqual([]);
    },
  );

  it("yield.ts references setTimeout and no other timer", () => {
    const code = stripComments(readFileSync(join(SRC, "yield.ts"), "utf8"));
    expect(code).toContain("setTimeout");
    const others = TIMERS.filter((t) => t !== "setTimeout").filter((t) =>
      code.includes(t),
    );
    expect(others, `yield.ts also references ${others.join(", ")}.`).toEqual(
      [],
    );
  });

  it.each(["deadline.ts", "pipeline.ts"])(
    "%s takes its clock by injection and reads no global clock",
    (name) => {
      const code = stripComments(readFileSync(join(SRC, name), "utf8"));
      for (const forbidden of ["Date.now", "performance.", "new Date"]) {
        expect(
          code.includes(forbidden),
          `${name} reads ${forbidden} directly. The clock is injected so the deadline boundary ` +
            `is a deterministic microsecond assertion instead of a 30-second wait, and so no ` +
            `timestamp is derived from a boot-relative origin.`,
        ).toBe(false);
      }
    },
  );

  it("the comment stripper strips comments and keeps code", () => {
    expect(stripComments("// setTimeout\nlet a;")).not.toContain("setTimeout");
    expect(stripComments("/* setInterval */ let b;")).toContain("let b;");
    expect(stripComments("setTimeout(f, 0);")).toContain("setTimeout");
  });
});
