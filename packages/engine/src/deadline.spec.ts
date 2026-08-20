// packages/engine/src/deadline.spec.ts — the boundary, both sides of it.
//
// A deadline written with `>` instead of `>=` passes every test that checks
// "expires eventually" and lets the walk take one more slice than it was allowed,
// every time, invisibly. So the case that matters is elapsed EXACTLY equal to the
// budget, and its neighbour one tick below.
//
// Every case here uses an injected clock and runs in microseconds. That is the
// whole reason the clock is injected: a deadline that read `performance.now()`
// could only be tested by actually waiting, which means in practice it would not
// be tested at all.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { Deadline } from "./deadline";

/**
 * Remove `//` line comments and `/* ... *\/` block comments.
 *
 * A character scan rather than a pattern, for the same reason the admission gate
 * is: REDOS_RECOVERY is `kill` on this project's target runtime, and a nested
 * quantifier is exactly what a comment-matching regex tends to grow. This runs on
 * Node, but the habit is the point.
 */
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

/** A clock the spec drives by hand. Returns a float, never rounded. */
function fakeClock(start = 1_000): {
  now: () => number;
  advance: (ms: number) => void;
} {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("the boundary is >= and it is asserted on both sides", () => {
  it("elapsed EXACTLY equal to the budget is expired", () => {
    const c = fakeClock();
    const d = new Deadline(25, c.now);
    c.advance(25);
    expect(d.elapsedMs).toBe(25);
    expect(d.expired).toBe(true);
  });

  it("one tick below the budget is NOT expired", () => {
    const c = fakeClock();
    const d = new Deadline(25, c.now);
    c.advance(24.999);
    expect(d.expired).toBe(false);
  });

  it("a fresh deadline is not expired", () => {
    const c = fakeClock();
    expect(new Deadline(25, c.now).expired).toBe(false);
  });

  it("a zero budget is expired immediately", () => {
    // Degenerate but reachable: a caller computing a budget from a remaining
    // allowance can legitimately arrive at 0, and "0 means unlimited" is the
    // failure that would follow from a strict `>`.
    const c = fakeClock();
    expect(new Deadline(0, c.now).expired).toBe(true);
  });

  it("stays expired once expired", () => {
    const c = fakeClock();
    const d = new Deadline(25, c.now);
    c.advance(30);
    expect(d.expired).toBe(true);
    c.advance(1_000);
    expect(d.expired).toBe(true);
  });
});

describe("the comparison is a millisecond FLOAT with no rounding", () => {
  it("24.999 is inside the budget and 25.0 is not", () => {
    // A `Math.round` anywhere in the chain would make 24.999 read as 25 and
    // report expiry a whole slice early, with nothing in any output to show it.
    const c = fakeClock();
    const d = new Deadline(25, c.now);
    c.advance(24.999);
    expect(d.expired).toBe(false);
    c.advance(0.001);
    expect(d.elapsedMs).toBeCloseTo(25, 9);
    expect(d.expired).toBe(true);
  });

  it("reports fractional elapsed unrounded", () => {
    const c = fakeClock();
    const d = new Deadline(25, c.now);
    c.advance(3.25);
    expect(d.elapsedMs).toBe(3.25);
  });

  it("works with a fractional budget", () => {
    const c = fakeClock();
    const d = new Deadline(0.5, c.now);
    c.advance(0.4);
    expect(d.expired).toBe(false);
    c.advance(0.1);
    expect(d.expired).toBe(true);
  });
});

describe("remaining and overrun", () => {
  it("counts down and never goes negative", () => {
    const c = fakeClock();
    const d = new Deadline(25, c.now);
    expect(d.remainingMs).toBe(25);
    c.advance(10);
    expect(d.remainingMs).toBe(15);
    c.advance(15);
    expect(d.remainingMs).toBe(0);
  });

  it("clamps at zero rather than reporting a negative remainder", () => {
    // A negative "remaining" is silently plausible in a formatted status line and
    // flips the sign of any arithmetic built on it. The overshoot is available
    // separately, so nothing is lost by clamping.
    const c = fakeClock();
    const d = new Deadline(25, c.now);
    c.advance(100);
    expect(d.remainingMs).toBe(0);
    expect(d.overrunMs).toBe(75);
  });

  it("reports zero overrun while inside the budget", () => {
    const c = fakeClock();
    const d = new Deadline(25, c.now);
    c.advance(10);
    expect(d.overrunMs).toBe(0);
  });
});

describe("the clock is INJECTED, and only deltas of it are used", () => {
  it("pins its start from the injected clock at construction", () => {
    const c = fakeClock(500_000);
    const d = new Deadline(25, c.now);
    expect(d.startedAt).toBe(500_000);
    expect(d.budgetMs).toBe(25);
  });

  it("is unaffected by the clock's ORIGIN — only the delta matters", () => {
    // `performance.now()` is boot-relative and `performance.timeOrigin` is not a
    // Unix epoch on this runtime, so a deadline that folded an origin into its
    // arithmetic would behave differently on a freshly started Caido than on one
    // that had been up for a day.
    for (const origin of [0, 1, 1_000_000, 1_800_000_000_000]) {
      const c = fakeClock(origin);
      const d = new Deadline(25, c.now);
      c.advance(24.999);
      expect(d.expired, `origin ${origin}`).toBe(false);
      c.advance(0.001);
      expect(d.expired, `origin ${origin}`).toBe(true);
    }
  });

  it("re-reads the clock on every question rather than caching an answer", () => {
    let reads = 0;
    const d = new Deadline(25, () => {
      reads += 1;
      return reads === 1 ? 0 : 100;
    });
    expect(reads).toBe(1);
    expect(d.expired).toBe(true);
    expect(reads).toBe(2);
  });

  it("rejects a budget that is not a finite, non-negative number", () => {
    const c = fakeClock();
    for (const bad of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => new Deadline(bad, c.now), String(bad)).toThrow();
    }
  });
});

describe("no wall-clock source participates", () => {
  it("deadline.ts references neither Date.now nor performance in CODE", () => {
    // Read from the source, because the whole point is that the module CANNOT
    // reach a clock it was not handed — a behavioural test cannot distinguish
    // "used the injected clock" from "used both and happened to agree".
    //
    // Comments are stripped first, and that is not a loophole: this file's header
    // NAMES both clocks in order to explain which one is legal and why
    // `performance.timeOrigin` is not a Unix epoch here. A scan that banned the
    // words would be satisfiable only by deleting the reasoning.
    const code = stripComments(
      readFileSync(
        fileURLToPath(new URL("./deadline.ts", import.meta.url)),
        "utf8",
      ),
    );
    for (const forbidden of ["Date.now", "performance.", "new Date"]) {
      expect(
        code.includes(forbidden),
        `deadline.ts reaches for ${forbidden} in code. The clock is injected so the boundary ` +
          `case is deterministic, and so no timestamp is ever computed from a boot-relative ` +
          `origin.`,
      ).toBe(false);
    }
  });

  it("the comment stripper actually strips, and does not strip code", () => {
    // Guards the guard. A stripper that returned "" would make the scan above
    // pass unconditionally.
    expect(stripComments("// Date.now\nconst a = 1;")).toContain(
      "const a = 1;",
    );
    expect(stripComments("// Date.now\nconst a = 1;")).not.toContain(
      "Date.now",
    );
    expect(stripComments("/* performance.now */ const b = 2;")).not.toContain(
      "performance",
    );
    expect(stripComments("const c = Date.now();")).toContain("Date.now");
  });
});
