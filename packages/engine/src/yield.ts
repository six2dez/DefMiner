// packages/engine/src/yield.ts — the ONE event-loop yield primitive.
//
// This file exists so that one measured fact has exactly one home.
//
// ---------------------------------------------------------------------------
// SPIKE-02: TWO OF THE THREE OBVIOUS PRIMITIVES DO NOT YIELD AT ALL
// ---------------------------------------------------------------------------
// Measured over a fixed WALL-CLOCK window on Caido 0.57.1, counting how many
// 4 ms interval ticks were serviced while a synchronous loop ran:
//
//     setTimeout(fn, 0)     timer service ratio 0.76
//     setImmediate(fn)      timer service ratio 0.00
//     Promise.resolve()     timer service ratio 0.00
//     no yield at all       timer service ratio 0.00   <- the baseline
//
// `setImmediate` and `Promise.resolve()` scored IDENTICALLY to a fully blocking
// loop. Both are the intuitive choice, both compile, both make the code look like
// it cooperates, and both starve the single thread exactly as hard as not
// yielding. That is why this is a named module rather than an inline
// `await Promise.resolve()` at the call site: the wrong version is indeed one
// character shorter and is silently fatal.
//
// METHODOLOGY NOTE, because it nearly produced the opposite conclusion: a
// FIXED-ITERATION probe gave a false negative during research. A 50-iteration run
// finished in 0.355 ms — shorter than a single timer period — so no timer could
// fire and `setTimeout` looked as though it did not yield either. Every figure
// above comes from a fixed wall-clock window instead.
//
// ---------------------------------------------------------------------------
// COST, AND WHY YIELDING IS TEMPORAL RATHER THAN GEOMETRIC
// ---------------------------------------------------------------------------
// A yield costs a MEDIAN 5.029 ms (p95 6.04 ms), dominated by this runtime's
// ~5 ms `setTimeout` clamp — so a delay of 0 and a delay of 1 are
// indistinguishable here, and asking for 0 is just the honest way to say "as soon
// as possible". At that price, yielding once per 64 KiB window on an 8 MiB bundle
// would be ~128 yields, roughly 730 ms of pure overhead. SPIKE-02 measured the
// two policies head to head on the same input: 330.7% overhead over 137 yields
// for per-chunk, against 21.2% over 5 yields at a 25 ms temporal budget. Hence
// MAX_SYNC_SLICE_MS and `pipeline.ts`'s clock-driven trigger.

/**
 * Give the event loop a real chance to run.
 *
 * `setTimeout(resolve, 0)` and nothing else. See this file's header before
 * changing it to something that looks equivalent.
 */
export function yieldToLoop(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}
