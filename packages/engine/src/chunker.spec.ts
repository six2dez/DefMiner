// packages/engine/src/chunker.spec.ts — the window geometry, at its boundaries.
//
// Chunking is easy to get almost right. The failures that matter are the ones a
// smoke test cannot see: an off-by-one at exactly one window, an overlap that is
// off by one byte so a straddling match is missed once in a while, a final window
// padded with zeros that then hash or match as real content, and a `start` that
// is chunk-relative rather than absolute — which produces offsets that point at
// the wrong place in the file with nothing in the data to say so.

import { describe, expect, it } from "vitest";

import {
  type Window,
  WINDOW_BYTES,
  WINDOW_OVERLAP_BYTES,
  windows,
} from "./chunker";

/** Deterministic, non-constant bytes, so a padded or duplicated window is
 *  visible in the CONTENT and not only in the offsets. */
function ramp(n: number): Uint8Array {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) out[i] = (i * 31 + 7) & 0xff;
  return out;
}

describe("the defaults are the documented geometry", () => {
  it("is 64 KiB with 4 KiB of overlap", () => {
    expect(WINDOW_BYTES).toBe(65_536);
    expect(WINDOW_OVERLAP_BYTES).toBe(4_096);
  });
});

describe("boundaries at exactly one window", () => {
  it("exactly 65536 bytes yields ONE window covering [0, 65536)", () => {
    const w = [...windows(new Uint8Array(65_536))];
    expect(w.length).toBe(1);
    expect(w[0].start).toBe(0);
    expect(w[0].end).toBe(65_536);
    expect(w[0].bytes.length).toBe(65_536);
  });

  it("65537 bytes yields TWO windows overlapping by exactly 4096", () => {
    const w = [...windows(new Uint8Array(65_537))];
    expect(w.length).toBe(2);
    expect(w[0].end - w[1].start).toBe(4_096);
    // The second window is CLAMPED, not padded: one real byte of new ground.
    expect(w[1].end).toBe(65_537);
    expect(w[1].bytes.length).toBe(w[1].end - w[1].start);
  });

  it("a zero-length input yields NOTHING, not one empty window", () => {
    expect([...windows(new Uint8Array(0))].length).toBe(0);
  });

  it("an input shorter than one window yields exactly one window over all of it", () => {
    const bytes = ramp(1_000);
    const w = [...windows(bytes)];
    expect(w.length).toBe(1);
    expect(w[0].start).toBe(0);
    expect(w[0].end).toBe(1_000);
    expect([...w[0].bytes]).toEqual([...bytes]);
  });

  it("an input of exactly one byte yields one window of one byte", () => {
    const w = [...windows(new Uint8Array([42]))];
    expect(w.length).toBe(1);
    expect(w[0].end).toBe(1);
    expect([...w[0].bytes]).toEqual([42]);
  });
});

describe("offsets are ABSOLUTE and strictly ascending", () => {
  const bytes = ramp(200_000);
  const w = [...windows(bytes)];

  it("found windows to check", () => {
    // NON-VACUITY: every assertion below iterates, and an empty enumeration
    // would let all of them pass having checked nothing.
    expect(w.length).toBeGreaterThan(1);
  });

  it("starts and ends both strictly increase", () => {
    for (let i = 1; i < w.length; i += 1) {
      expect(w[i].start).toBeGreaterThan(w[i - 1].start);
      expect(w[i].end).toBeGreaterThan(w[i - 1].end);
    }
  });

  it("each window's bytes match the ORIGINAL array at its absolute offsets", () => {
    // The assertion that catches a chunk-relative offset. A window whose `start`
    // were relative would still have self-consistent content and would fail here.
    for (const win of w) {
      expect(win.bytes.length).toBe(win.end - win.start);
      expect(win.bytes[0]).toBe(bytes[win.start]);
      expect(win.bytes[win.bytes.length - 1]).toBe(bytes[win.end - 1]);
    }
  });

  it("the last window ends exactly at the input length and is not padded", () => {
    expect(w[w.length - 1].end).toBe(200_000);
    expect(w[w.length - 1].start + w[w.length - 1].bytes.length).toBe(200_000);
  });
});

describe("the union of the ranges covers every index, with no gap", () => {
  it("walks the ranges of a 200000-byte input and finds every index at least once", () => {
    // Walked, not inspected: a coverage claim checked by reading the numbers is
    // exactly the claim that stays true in the comment and false in the code.
    const total = 200_000;
    const covered = new Uint8Array(total);
    for (const win of windows(ramp(total))) {
      for (let i = win.start; i < win.end; i += 1) covered[i] += 1;
    }
    const uncovered: number[] = [];
    for (let i = 0; i < total; i += 1) {
      if (covered[i] === 0) uncovered.push(i);
    }
    expect(
      uncovered.slice(0, 8),
      `${uncovered.length} byte offsets are covered by NO window — a match starting at any of ` +
        `them would be invisible.`,
    ).toEqual([]);
  });

  it("reconstructs the input byte-for-byte from the windows alone", () => {
    // Coverage with no gap is necessary but not sufficient: the windows must also
    // carry the RIGHT bytes at the offsets they claim.
    const bytes = ramp(200_000);
    const rebuilt = new Uint8Array(bytes.length);
    for (const win of windows(bytes)) rebuilt.set(win.bytes, win.start);
    expect(Buffer.from(rebuilt).equals(Buffer.from(bytes))).toBe(true);
  });

  it("adjacent windows share exactly `overlap` bytes wherever a full window fits", () => {
    const w = [...windows(ramp(200_000))];
    for (let i = 1; i < w.length; i += 1) {
      const shared = w[i - 1].end - w[i].start;
      // The last pair can share MORE than the overlap, because the final window
      // is clamped and therefore starts earlier relative to its end. Never less.
      expect(shared).toBeGreaterThanOrEqual(WINDOW_OVERLAP_BYTES);
      if (i < w.length - 1) expect(shared).toBe(WINDOW_OVERLAP_BYTES);
    }
  });
});

describe("custom geometry", () => {
  it.each([
    [240, 64, 16, 5],
    [240, 32, 8, 10],
    [100, 10, 0, 10],
    [100, 100, 0, 1],
    [101, 100, 0, 2],
  ])(
    "%i bytes at size %i overlap %i yields %i windows",
    (total, size, overlap, expected) => {
      const w = [...windows(ramp(total), size, overlap)];
      expect(w.length).toBe(expected);
      expect(w[w.length - 1].end).toBe(total);
    },
  );

  it("a zero overlap still covers everything exactly once", () => {
    const covered = new Uint8Array(100);
    for (const win of windows(ramp(100), 10, 0)) {
      for (let i = win.start; i < win.end; i += 1) covered[i] += 1;
    }
    expect([...covered].every((c) => c === 1)).toBe(true);
  });
});

describe("illegal geometry throws instead of looping forever", () => {
  it.each([
    ["size 0", 0, 0],
    ["negative size", -1, 0],
    ["overlap equal to size", 64, 64],
    ["overlap larger than size", 64, 65],
    ["negative overlap", 64, -1],
  ])("%s", (_name, size, overlap) => {
    // `overlap >= size` makes the step zero or negative and the generator never
    // terminates. SPIKE-01 measured that a runaway loop in this runtime has no
    // interrupt and no in-runtime recovery — SIGKILL was the only teardown that
    // worked, and it takes caido-cli down with the operator's project data. So
    // this is a crash-the-test error, not a clamp.
    expect(() => [...windows(ramp(100), size, overlap)]).toThrow();
  });

  it("does not throw on a zero-length input even with legal geometry", () => {
    expect(() => [...windows(new Uint8Array(0), 64, 16)]).not.toThrow();
  });
});

describe("windows are VIEWS, not copies", () => {
  it("a window's bytes alias the caller's array", () => {
    // An 8 MiB artifact must not become 16 MiB just because it is being walked.
    // `subarray` shares the buffer; `slice` would not, and nothing in the offsets
    // would reveal the difference.
    const bytes = ramp(1_000);
    const w: Window = [...windows(bytes, 100, 0)][0];
    expect(w.bytes.buffer).toBe(bytes.buffer);
    expect(w.bytes.byteOffset).toBe(0);
  });
});
