// packages/engine/src/queue.ts — the bounded ingest queue (CORE-03, CORE-05).
//
// SDK-free: it holds scalars only, so it unit-tests under plain vitest and cannot
// accidentally pin a Request, Response or Body alive.

import { EVENTS_DELIVERED_UNDER_BLOCK } from "./thresholds";

/**
 * One unit of deferred work.
 *
 * EXACTLY these three keys and nothing else. CORE-05 forbids retaining SDK
 * objects across the hook boundary — the consumer re-reads the work with
 * `sdk.requests.get(id)` — and the memory argument for QUEUE_CAP (roughly
 * 100-200 bytes per entry) evaporates the moment somebody adds headers here.
 */
export type Entry = {
  id: string;
  bytes: number;
  kind: string;
};

export class BoundedQueue {
  #buf: Entry[] = [];
  #overflow = 0;
  readonly #cap: number;

  constructor(cap: number) {
    // The cap is DERIVED, not chosen. Caido queues intercept events and loses
    // nothing: 499 arrived in a single 20 ms burst after a 30 s handler block.
    // A queue below that measured burst reports our own under-sizing as if it
    // were target-driven back-pressure, which is Pitfall 3 exactly.
    if (cap < EVENTS_DELIVERED_UNDER_BLOCK) {
      throw new Error(
        `BoundedQueue cap ${cap} is below the measured ${EVENTS_DELIVERED_UNDER_BLOCK}-event burst ` +
          `(EVENTS_DELIVERED_UNDER_BLOCK, SPIKE-03). A queue under the only burst anyone has ` +
          `measured would report our own under-sizing as back-pressure.`,
      );
    }
    this.#cap = cap;
  }

  /**
   * Offer one entry. Returns true when it was accepted without displacing
   * anything, false when the queue was already full and the OLDEST entry was
   * dropped to make room.
   *
   * DROP-OLDEST, deliberately diverging from the drop-newest that the
   * `probe/tier0-events` analog uses: the newest artifact is the one the operator
   * is looking at right now. Dropping it to preserve something from minutes ago
   * is the wrong trade for a tool somebody is watching.
   *
   * The caller passes an object literal, so TypeScript's excess-property check is
   * what keeps an SDK reference out of the queue; the entry is stored as given
   * rather than copied, so `take()` returns the identical object the hook built.
   */
  offer(entry: Entry): boolean {
    if (this.#buf.length >= this.#cap) {
      this.#overflow++;
      this.#buf.shift();
      this.#buf.push(entry);
      return false;
    }
    this.#buf.push(entry);
    return true;
  }

  /** FIFO take. Returns undefined on empty rather than throwing. */
  take(): Entry | undefined {
    return this.#buf.shift();
  }

  /**
   * Take up to `n` entries, FIFO, in one call.
   *
   * Returns FEWER than `n` when the queue holds fewer — never blocks, never
   * pads, never throws. `n <= 0` returns an empty array rather than draining
   * everything, because "drain zero" is the honest reading of a computed bound
   * that came out non-positive and silently draining the whole queue instead is
   * how a bound stops binding.
   *
   * Does NOT touch {@link overflowCount}: an overflow is a fact about what the
   * queue DISCARDED, and a read path that adjusted it would make the number mean
   * two different things depending on when you looked.
   */
  drain(n: number): Entry[] {
    if (!(n > 0)) return [];
    return this.#buf.splice(0, Math.min(n, this.#buf.length));
  }

  get depth(): number {
    return this.#buf.length;
  }

  /** Monotonic across the plugin's lifetime — never reset, never decremented.
   *  OBS-01 reads it in Phase 2; CORE-03 requires the overflow be VISIBLE. */
  get overflowCount(): number {
    return this.#overflow;
  }

  get cap(): number {
    return this.#cap;
  }
}
