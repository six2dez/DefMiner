// packages/engine/src/chunker.ts — overlapping byte windows with ABSOLUTE offsets.
//
// ---------------------------------------------------------------------------
// THE GEOMETRY SERVES MATCHING. IT DELIBERATELY DOES NOT DRIVE YIELDING.
// ---------------------------------------------------------------------------
// The overlap exists so a match that straddles a chunk boundary is still visible
// inside at least one window: a 4 KiB overlap means any pattern up to 4 KiB long
// is wholly contained in some window no matter where it starts.
//
// What the window size must NOT decide is how often the pipeline yields. SPIKE-02
// measured both shapes on the same input: yielding per chunk cost 330.7% overhead
// over 137 yields, against 21.2% over 5 yields at a 25 ms TEMPORAL budget. Each
// yield costs a median 5.029 ms because `setTimeout` clamps to ~5 ms in this
// runtime, so 128 yields on an 8 MiB bundle would be roughly 730 ms of pure
// overhead — and that overhead scales with the input while buying nothing. The
// clock decides when to yield (see `pipeline.ts`); this file decides only where
// the matcher can see.
//
// SDK-free, total, and allocation-light: `bytes` is a SUBARRAY VIEW over the
// caller's array, not a copy, so walking an 8 MiB artifact does not double its
// memory. Callers must therefore treat a window's bytes as read-only.

/** 64 KiB. Large enough that per-window overhead is negligible, small enough that
 *  one window is never a meaningful fraction of the size ceiling. */
export const WINDOW_BYTES = 65_536;

/** 4 KiB. The longest match that is guaranteed to fit inside a single window. */
export const WINDOW_OVERLAP_BYTES = 4_096;

/** One window over the input. `start` and `end` are ABSOLUTE offsets into the
 *  ORIGINAL array — never chunk-relative — because every offset this project
 *  persists or reports has to map back to the artifact's raw bytes (ENC-01). A
 *  chunk-relative offset that escaped into a finding would point at the wrong
 *  place in the file and there would be nothing in the data to say so. */
export type Window = {
  start: number;
  end: number;
  bytes: Uint8Array;
};

/**
 * Yield windows of `size` bytes advancing by `size - overlap`, in strictly
 * ascending order, covering every byte with no gap.
 *
 * - a zero-length input yields NOTHING (not one empty window);
 * - an input shorter than `size` yields exactly one window over the whole input;
 * - the final window is CLAMPED to the input length and is never padded, so
 *   `end` is always a real offset and `bytes.length` is always `end - start`.
 */
export function* windows(
  bytes: Uint8Array,
  size: number = WINDOW_BYTES,
  overlap: number = WINDOW_OVERLAP_BYTES,
): Generator<Window, void, undefined> {
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error(`windows(): size must be a positive integer, got ${size}`);
  }
  if (!Number.isFinite(overlap) || overlap < 0 || overlap >= size) {
    // `overlap >= size` would make the step zero or negative and the generator
    // would never terminate — an infinite loop on the one thread this runtime
    // has, which SPIKE-01 measured to be unrecoverable without SIGKILL.
    throw new Error(
      `windows(): overlap must satisfy 0 <= overlap < size, got ${overlap} with size ${size}`,
    );
  }

  const total = bytes.length;
  if (total === 0) return;

  const step = size - overlap;
  let start = 0;
  for (;;) {
    const end = Math.min(start + size, total);
    yield { start, end, bytes: bytes.subarray(start, end) };
    if (end >= total) return;
    start += step;
  }
}
