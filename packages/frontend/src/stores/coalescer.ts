// packages/frontend/src/stores/coalescer.ts — a flood of invalidation summaries
// in, at most two UI reactions a second out, and none at all while the operator
// is mid-triage.
//
// ===========================================================================
// TWO PROPERTIES, TWO DIFFERENT REASONS, ONE MODULE
// ===========================================================================
// THE CAP protects the renderer. A backend drain pass emits one summary per
// category per pass and a busy target produces them continuously; a table that
// re-queried on each one would spend a ten-thousand-row surface's frame budget
// on work the operator never asked for.
//
// THE SUPPRESSION protects DURABLE STATE, and it is not a nicety. While a row is
// selected or the evidence panel is open the table must not re-order or
// re-render: a row shifting under the cursor mid-triage is how an operator marks
// the wrong finding as a false positive, and triage is written to the backend.
// 05-UI-SPEC.md states it as a rule of the table contract, not as a preference.
//
// The suppression is checked TWICE, deliberately. Once when a summary arrives —
// a suppressed summary accrues into the pending count and never enters the
// window — and once when the window elapses, because a reaction that entered
// while nothing was selected and fires four hundred milliseconds later, after
// the operator has clicked a row, is the same defect arriving late.
//
// ===========================================================================
// THE PILL NEVER APPLIES ITSELF
// ===========================================================================
// Open decision D4: the coalescing pill applies on the operator's Refresh and
// on the page's re-entry hook, and nowhere else. There is no inactivity timer
// here and adding one would reintroduce exactly the row-shift the suppression
// exists to remove — with worse timing, because an operator who has stopped
// moving is an operator who is reading.
//
// ===========================================================================
// THE TIMER BOOKKEEPING IS THE LIBRARY'S, NOT OURS
// ===========================================================================
// `useDebounceFn` and `useThrottleFn` come from the pinned @vueuse/core, per
// 05-RESEARCH.md's don't-hand-roll list. The failure mode it names is specific
// and late: hand-rolled timers leak across unmounts, and the leak surfaces as
// duplicated refreshes on the fourth project switch — long after whoever wrote
// the bookkeeping has stopped looking. This module owns exactly one piece of
// lifecycle state of its own, `stopped`, and it exists because a window already
// in flight when the component unmounts must not fire into a dead store.

import type {
  InvalidationCategory,
  InvalidationSummary,
} from "@defminer/engine/contract";
import { INVALIDATION_CATEGORIES } from "@defminer/engine/contract";
import { useDebounceFn, useThrottleFn } from "@vueuse/core";
import type { ComputedRef } from "vue";
import { computed, ref } from "vue";

import type { InvalidationSubscription } from "../api/client";

import type { TriageGate } from "./inventory";

// ---------------------------------------------------------------------------
// THE CONTRACT'S TWO NUMBERS
// ---------------------------------------------------------------------------

/**
 * The trailing window a burst is coalesced over.
 *
 * 05-UI-SPEC.md: "coalesces per category on a 500 ms trailing window". Trailing
 * rather than leading because the point is to react ONCE to a burst, after it
 * settles — a leading edge reacts to the first event of a hundred and then has
 * to decide what to do about the other ninety-nine.
 */
export const COALESCE_TRAILING_WINDOW_MS = 500;

/**
 * The cap, across ALL categories together.
 *
 * 05-UI-SPEC.md: "capped at 2 UI reactions per second across all categories".
 * Together, not per category: three categories at two each would be six
 * re-queries a second on the single-threaded backend, which is the storm this
 * exists to absorb. A category saturating the cap therefore delays the others,
 * and nothing is lost when it does — their counts stay in the pending
 * breakdown until a reaction applies them.
 */
export const MAX_REACTIONS_PER_SECOND = 2;

/**
 * The minimum spacing between reactions. DERIVED from the cap, never restated —
 * a second literal here is how the cap comes to say two and the gate three.
 */
export const REACTION_MIN_INTERVAL_MS = 1000 / MAX_REACTIONS_PER_SECOND;

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

/** How many rows changed, per category, since the last reaction. The pill's
 *  breakdown. */
export type PendingByCategory = Readonly<Record<InvalidationCategory, number>>;

export type CoalescerOptions = {
  /** The three facts this store reads off the inventory: which project is
   *  active, whether the operator is mid-triage, and how to requery. */
  readonly gate: TriageGate;
  /** Subscribe to the one backend event. Returns the handle that MUST be
   *  stopped — see {@link InvalidationCoalescer.stop}. */
  readonly subscribe: (
    handler: (summary: InvalidationSummary) => void,
  ) => InvalidationSubscription;
  /**
   * The trailing window, for tests that need it shorter than the contract's.
   *
   * THE WINDOW IS OVERRIDABLE AND THE CAP IS NOT, and that asymmetry is the
   * point: it lets a spec drive the debounce so fast that the debounce cannot
   * be what holds the cap, which is the only way to prove the throttle gate is
   * load-bearing rather than decorative.
   */
  readonly trailingWindowMs?: number;
};

export type InvalidationCoalescer = {
  /** Changed rows not yet applied, in total. The pill's number. */
  readonly pendingTotal: ComputedRef<number>;
  /** The same, broken down. */
  readonly pendingByCategory: ComputedRef<PendingByCategory>;
  /** How many UI reactions have fired. The cap is asserted against this. */
  readonly reactionCount: ComputedRef<number>;
  /** Apply the pending count and requery. The pill's **Refresh**, and the
   *  page's re-entry hook. The ONLY two callers — there is no timer. */
  applyPending: () => Promise<void>;
  /** Stop the subscription and silence any window still in flight. The
   *  mounting component MUST call this on unmount (research P-04). */
  stop: () => void;
};

// ---------------------------------------------------------------------------
// THE STORE
// ---------------------------------------------------------------------------

function zeroed(): Record<InvalidationCategory, number> {
  const counts = {} as Record<InvalidationCategory, number>;
  for (const category of INVALIDATION_CATEGORIES) counts[category] = 0;
  return counts;
}

export function createCoalescer(
  options: CoalescerOptions,
): InvalidationCoalescer {
  const pending = ref<Record<InvalidationCategory, number>>(zeroed());
  const reactions = ref(0);
  let stopped = false;

  const applyPending = async (): Promise<void> => {
    pending.value = zeroed();
    await options.gate.refresh();
  };

  /**
   * One UI reaction.
   *
   * The second suppression check lives here. See the module header: a window
   * that opened while nothing was selected can elapse after the operator has
   * clicked a row, and applying it then is the row-shift-under-cursor defect
   * with a half-second delay on it. The counts are NOT discarded — they stay
   * pending and the pill carries them until the operator asks.
   */
  const react = (): void => {
    if (stopped) return;
    if (options.gate.triageLocked.value) return;
    reactions.value++;
    void applyPending();
  };

  // Composed, not chosen between. The throttle is the CAP and the debounce is
  // the WINDOW, and they answer different questions: without the debounce a
  // quiet target still re-queries on every single event, and without the
  // throttle a window shorter than the cap's interval — which is what a future
  // edit to one constant produces — raises the rate silently.
  //
  // `maxWait` is the cap's interval, and it is what stops a SUSTAINED stream
  // starving the operator: a pure trailing debounce never elapses while events
  // keep arriving, so a busy target would freeze the table's counts entirely
  // rather than update them twice a second.
  const gated = useThrottleFn(react, REACTION_MIN_INTERVAL_MS, true);
  const windowed = useDebounceFn(
    gated,
    options.trailingWindowMs ?? COALESCE_TRAILING_WINDOW_MS,
    { maxWait: REACTION_MIN_INTERVAL_MS },
  );

  const onSummary = (summary: InvalidationSummary): void => {
    if (stopped) return;

    // A project switch and an in-flight event race. Applying another project's
    // count puts a visibly wrong number on screen and is the frontend half of
    // the boundary the backend's reads enforce with `currentProjectId()`.
    if (summary.projectId !== options.gate.projectId.value) return;

    pending.value = {
      ...pending.value,
      [summary.category]:
        pending.value[summary.category] + summary.changedCount,
    };

    // THE SUPPRESSION IS CHECKED BEFORE THE WINDOW, not inside it. A summary
    // that arrives mid-triage does not enter the debounce at all: it has
    // already been counted above, and the pill is where it belongs until the
    // operator asks for it.
    if (options.gate.triageLocked.value) return;

    void windowed();
  };

  const subscription = options.subscribe(onSummary);

  return {
    pendingTotal: computed(() =>
      INVALIDATION_CATEGORIES.reduce(
        (sum, category) => sum + pending.value[category],
        0,
      ),
    ),
    pendingByCategory: computed(() => pending.value),
    reactionCount: computed(() => reactions.value),
    applyPending,
    stop: () => {
      // BOTH halves. Stopping the listener alone leaves a window already in
      // flight to fire into a store the component no longer owns, which is the
      // same leak by a different route.
      stopped = true;
      subscription.stop();
    },
  };
}
