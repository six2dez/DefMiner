// packages/engine/src/deadline.ts — a wall-clock budget with the clock INJECTED.
//
// ---------------------------------------------------------------------------
// THE ONE THING NOT TO COPY FROM THE ANALOG
// ---------------------------------------------------------------------------
// `probe/tier0-core` calls `performance.now()` directly inside its slice loop.
// That is correct for a probe measuring a live runtime and wrong for shipped
// code: a deadline that reads a global clock can only be tested by making a test
// actually take that long, which means the deadline path is either untested or
// the suite is slow enough that nobody runs it. Injecting the clock makes
// "expired exactly at the budget" a deterministic assertion that costs
// microseconds.
//
// ---------------------------------------------------------------------------
// WHICH CLOCK, AND WHY IT IS NEVER A TIMESTAMP
// ---------------------------------------------------------------------------
// The caller passes `performance.now` in production: it is monotonic to about a
// microsecond and cannot go backwards when the host clock is adjusted, which
// `Date.now()` can. But it is BOOT-RELATIVE, and `performance.timeOrigin` is not
// a Unix epoch on this runtime — so no timestamp may ever be computed from it.
// Elapsed time here comes only from DELTAS between two readings of the same
// injected clock. Correlation keys (`observed_at`, `started_at`) come from
// `Date.now()` and are the consumer's business, not this file's.
//
// No rounding and no truncation anywhere below: the comparison is a millisecond
// FLOAT throughout. `Math.round` on a 24.6 ms elapsed against a 25 ms budget
// would report expiry a slice early, and rounding the other way would report it
// late; neither error is visible in any output.

/** A monotonic millisecond clock. `performance.now` in production, a mutable
 *  counter in every spec. */
export type Clock = () => number;

export class Deadline {
  readonly #budgetMs: number;
  readonly #now: Clock;
  readonly #startedAt: number;

  /**
   * @param budgetMs how long the work may take, in milliseconds.
   * @param now the clock, BY INJECTION. Read once here to pin the start.
   */
  constructor(budgetMs: number, now: Clock) {
    if (!Number.isFinite(budgetMs) || budgetMs < 0) {
      throw new Error(
        `Deadline(): budgetMs must be a finite, non-negative number, got ${budgetMs}`,
      );
    }
    this.#budgetMs = budgetMs;
    this.#now = now;
    this.#startedAt = now();
  }

  get budgetMs(): number {
    return this.#budgetMs;
  }

  /** The instant the budget started, on the injected clock's scale. Not a
   *  timestamp — see this file's header. */
  get startedAt(): number {
    return this.#startedAt;
  }

  /** Milliseconds since construction, as a float. */
  get elapsedMs(): number {
    return this.#now() - this.#startedAt;
  }

  /**
   * True once the budget is spent.
   *
   * `>=`, so elapsed EXACTLY equal to the budget IS expired. With a strict `>`
   * the boundary case slips through and the walk takes one more slice than it was
   * allowed — invisibly, because "one slice over" looks exactly like "on time" in
   * every number this project records. Stating the boundary is the point;
   * `deadline.spec.ts` asserts both sides of it.
   */
  get expired(): boolean {
    return this.elapsedMs >= this.#budgetMs;
  }

  /**
   * Milliseconds left, CLAMPED AT ZERO.
   *
   * Clamped rather than negative because the only honest reading of "remaining"
   * once the budget is spent is "none". A negative here would be silently
   * plausible in a formatted status line and would flip the sign of any
   * arithmetic built on it. The overshoot is still available and is what a caller
   * that wants to know HOW LATE it is should read.
   */
  get remainingMs(): number {
    const left = this.#budgetMs - this.elapsedMs;
    return left > 0 ? left : 0;
  }

  /** How far past the budget, or 0 while inside it. The honest overshoot that
   *  {@link remainingMs} deliberately does not encode. */
  get overrunMs(): number {
    const over = this.elapsedMs - this.#budgetMs;
    return over > 0 ? over : 0;
  }
}
