// packages/engine/src/pipeline.ts — the temporal-slice walk (CORE-06, CORE-07).
//
// One function, and three properties that are each a way the obvious
// implementation fails silently:
//
//   1. THE YIELD TRIGGER IS TEMPORAL, NOT GEOMETRIC. Yielding once per window is
//      the intuitive design and costs 330.7% overhead over 137 yields against
//      21.2% over 5 at a 25 ms budget (SPIKE-02, same input, both measured). The
//      window size serves MATCHING; the clock decides when to yield.
//   2. THE DEADLINE DEGRADES RATHER THAN DISCARDING. Crossing
//      ARTIFACT_DEADLINE_MS returns a PARTIAL result carrying the offset actually
//      reached, so the work already done is kept and CORE-07's degraded state has
//      a real number behind it. A walk that threw would leave `bytes_walked` NULL
//      and the operator with no way to know how much of a bundle was read.
//   3. EVERY CLOCK IS INJECTED. A walk that read a global clock could only be
//      tested by taking 30 real seconds, which means the deadline path would be
//      untested in practice.
//
// SDK-free: no Caido type appears below, so every one of those properties is
// provable under plain vitest on Node — which matters more here than anywhere
// else, because SPIKE-01 measured that a runaway loop inside Caido's QuickJS has
// NO interrupt and no in-runtime recovery.

import { type Window, windows } from "./chunker";
import { type Clock, Deadline } from "./deadline";
import { ARTIFACT_DEADLINE_MS, MAX_SYNC_SLICE_MS } from "./thresholds";
import { yieldToLoop } from "./yield";

export type { Window };

/**
 * The abort surface, declared STRUCTURALLY rather than as `AbortSignal`.
 *
 * A real `AbortSignal` satisfies this, and so does a plain object — which is
 * deliberate: Phase 0's capability probe enumerated this runtime's globals and
 * `AbortController` was not among the things measured, so binding the engine to
 * it would be an assumption dressed as a type. The two fields below are all the
 * walk reads.
 */
export type AbortLike = {
  readonly aborted: boolean;
  readonly reason?: unknown;
};

/**
 * Render an abort reason for a message WITHOUT the default `[object Object]`.
 *
 * The reason is `unknown` because `AbortSignal.reason` is: it can be a string, an
 * `Error`, a `DOMException`, or any value the caller passed. A bare `String(...)`
 * collapses the object case to `[object Object]`, which is exactly the log line
 * that tells the operator nothing on the one occasion they needed it — and
 * HANDLER_ERROR_SURFACED is "neither", so this message is not backed up by
 * anything Caido writes down.
 */
function describeReason(reason: unknown): string {
  if (reason === undefined || reason === null) return "no reason given";
  if (typeof reason === "string") return reason;
  if (reason instanceof Error) return reason.message;
  if (typeof reason === "number" || typeof reason === "boolean") {
    return String(reason);
  }
  try {
    return JSON.stringify(reason) ?? Object.prototype.toString.call(reason);
  } catch {
    return Object.prototype.toString.call(reason);
  }
}

/** Thrown when the caller's signal aborts mid-walk. Distinct from a deadline
 *  expiry, which is NOT an error: a deadline produces a partial result, an abort
 *  produces nothing because the caller asked for nothing. */
export class Cancelled extends Error {
  readonly reason: unknown;
  constructor(reason: unknown) {
    super("walk cancelled: " + describeReason(reason));
    this.name = "Cancelled";
    this.reason = reason;
  }
}

export type WalkContext = {
  /** Monotonic millisecond clock, BY INJECTION. Shared with `deadline`. */
  now: Clock;
  /** The budget for this artifact. Construct with {@link artifactDeadline}. */
  deadline: Deadline;
  /** Called once per window, in ascending offset order. A NO-OP in Phase 1 — no
   *  detector exists until Phase 3 — which is exactly why the walk's other
   *  properties have to be proven now, while there is nothing to hide behind. */
  visit: (window: Window) => void;
  /** Optional cancellation. */
  signal?: AbortLike;
  /** Window geometry, defaulted by {@link windows}. Overridable so a spec can
   *  produce two different window COUNTS over the same elapsed profile — the
   *  proof that the yield trigger is temporal. */
  windowSize?: number;
  windowOverlap?: number;
  /** The yield primitive, injectable ONLY so a spec can count invocations
   *  without waiting ~5 ms per yield. Production always uses `yieldToLoop`, and
   *  `pipeline.spec.ts` asserts this file references no timer function itself. */
  yieldFn?: () => Promise<void>;
};

export type WalkResult = {
  /** True when the deadline expired before the input was exhausted. */
  partial: boolean;
  /** The longest UNINTERRUPTED synchronous stretch observed, in milliseconds.
   *  CORE-10's half of the story, and the number a health surface has to show for
   *  "is this plugin blocking the thread" to be answerable. */
  maxSliceMs: number;
  /** The absolute end offset actually reached. Equals `bytes.length` on a
   *  complete walk, and the last visited window's `end` on a partial one. */
  bytesWalked: number;
  /** How many times the loop actually yielded. */
  yieldCount: number;
};

/**
 * The deadline the consumer gives one artifact.
 *
 * Here rather than at the call site so `ARTIFACT_DEADLINE_MS` is imported from
 * the generated threshold set exactly once and can never be re-typed as a
 * literal next to the walk that enforces it.
 */
export function artifactDeadline(now: Clock): Deadline {
  return new Deadline(ARTIFACT_DEADLINE_MS, now);
}

/**
 * Walk `bytes` window by window, yielding on elapsed time and degrading to a
 * recorded partial state at the deadline.
 *
 * Order inside the loop, and each step is load-bearing:
 *   abort check -> deadline check -> visit -> measure the slice -> maybe yield.
 *
 * The two checks come BEFORE the visit so neither can be delayed by a window's
 * own cost; the slice is measured AFTER the visit because the visit is the work
 * the slice is made of.
 */
export async function walk(
  bytes: Uint8Array,
  ctx: WalkContext,
): Promise<WalkResult> {
  const doYield = ctx.yieldFn ?? yieldToLoop;

  let maxSliceMs = 0;
  let bytesWalked = 0;
  let yieldCount = 0;
  let visited = 0;
  let sliceStart = ctx.now();

  for (const window of windows(bytes, ctx.windowSize, ctx.windowOverlap)) {
    if (ctx.signal?.aborted === true) {
      throw new Cancelled(ctx.signal.reason);
    }
    if (ctx.deadline.expired) {
      // DEGRADE, do not discard. Everything already visited stays counted, and
      // `bytesWalked` is the real offset reached rather than a guess — which is
      // what makes `scan_state = 'partial'` mean something the operator can act
      // on (CORE-07).
      return { partial: true, maxSliceMs, bytesWalked, yieldCount };
    }

    ctx.visit(window);
    visited += 1;
    bytesWalked = window.end;

    const elapsed = ctx.now() - sliceStart;
    if (elapsed > maxSliceMs) maxSliceMs = elapsed;
    // TEMPORAL. Not `visited % N === 0`: see this file's header, and note that a
    // geometric trigger would produce a different yield count for the same
    // elapsed profile at a different window size — which is precisely what
    // `pipeline.spec.ts` asserts is NOT the case here.
    if (elapsed >= MAX_SYNC_SLICE_MS) {
      await doYield();
      yieldCount += 1;
      sliceStart = ctx.now();
    }
  }

  // The trailing slice, and only when there WAS one. A zero-length input visits
  // nothing, so it reports a maximum slice of 0 and never touches the yield
  // primitive — measuring an empty walk against the clock would report whatever
  // the caller's own setup cost happened to be.
  if (visited > 0) {
    const trailing = ctx.now() - sliceStart;
    if (trailing > maxSliceMs) maxSliceMs = trailing;
  }

  return { partial: false, maxSliceMs, bytesWalked, yieldCount };
}
