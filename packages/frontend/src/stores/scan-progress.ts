// packages/frontend/src/stores/scan-progress.ts — the second payload variant's
// destination: a flood of scan-progress payloads in, at most the shipped cap of
// UI reactions a second out, and the FIRST one immediately.
//
// ===========================================================================
// THIS IS THE COALESCER'S THROTTLE HALF AND NOTHING ELSE
// ===========================================================================
// `./coalescer.ts` composes a trailing debounce with a throttle and guards both
// with a triage lock. This store keeps ONE of those three: the throttle. The
// other two are absent for reasons, and each reason is a defect that would
// otherwise arrive later.
//
// ===========================================================================
// 1. LEADING EDGE, THROTTLED, WITH NO TRAILING DEBOUNCE
// ===========================================================================
// The entity coalescer debounces trailing with a `maxWait`; this store throttles
// leading. TWO DIFFERENT MECHANISMS BECAUSE THEY ANSWER TWO DIFFERENT QUESTIONS,
// stated here so the difference is a decision rather than a divergence somebody
// discovers.
//
// A PURE TRAILING DEBOUNCE PRODUCES ZERO APPLICATIONS OVER A SUSTAINED STREAM —
// measured in Phase 5 (P5-D60): zero reactions across three simulated seconds of
// twenty events a second, because the window never elapses while events keep
// arriving. A progress readout that stops updating exactly while the scan is
// fastest is the opposite of the requirement.
//
// And the FIRST update must land immediately. An operator who has just pressed
// **Start scan** and watches an unchanged screen for half a second has already
// learned the wrong thing about whether anything is happening — on a surface
// whose entire subject is whether anything is happening, and which deliberately
// has no spinner, no bar and no percentage to fall back on.
//
// ===========================================================================
// 2. THE CAP IS IMPORTED, NEVER RESTATED
// ===========================================================================
// `MAX_REACTIONS_PER_SECOND` and the DERIVED `REACTION_MIN_INTERVAL_MS` come
// from the coalescer, which already carries the argument on the declaration: a
// second literal is how a cap comes to say two in one file and three in
// another. There is no numeric literal for either in this file.
//
// ===========================================================================
// 3. THE TRIAGE LOCK IS NOT IMPORTED, NOT READ, AND NOT RECEIVED
// ===========================================================================
// NOT PASSING IT IN IS THE MECHANISM. The options below carry a project id and a
// subscribe function and nothing else; there is no `TriageGate` here, so there
// is no `refresh` to call and no `triageLocked` to consult even by accident.
//
// D-15 asks for progress on the shipped coalescer as a new category AND says the
// never-re-order-while-a-row-is-selected rule must not hold it back. Taken
// literally those contradict: `coalescer.ts` checks the lock BEFORE its debounce
// window, so a `scans` category would accrue into the pill and never land while
// a row is selected. 06-UI-SPEC.md § "Named Conflicts" settles it — progress
// rides the SAME EVENT, which is D-15's actual reason, and is not a category,
// which is D-15's mechanism and cannot deliver its own intent.
//
// **`coalescer.ts` IS NOT MODIFIED.** Both of its triage-lock early returns stay
// byte-identical, because a progress payload is discriminated at the client's
// single subscription site and never reaches `onSummary` at all. A PROGRESS
// STRIP HAS NO ROWS AND NO CURSOR, so its correct relationship to the lock is
// not "exempt from it" but "never behind it" — and the difference matters,
// because an exemption is a conditional inside the one file whose whole value is
// that it has none.
//
// ===========================================================================
// 4. IT NEVER REFETCHES AND NEVER TOUCHES THE PILL
// ===========================================================================
// The payload IS the update. There is no re-query, because there is no table:
// every field on it is an integer, a boolean or a closed-vocabulary word the
// backend already computed. The coalescing pill belongs to the entity tables and
// this store cannot increment it — it has no reference to one.

import type { ScanProgressPayload } from "@defminer/engine/contract";
import { useThrottleFn } from "@vueuse/core";
import type { ComputedRef } from "vue";
import { computed, ref, shallowRef } from "vue";

import type { InvalidationSubscription } from "../api/client";

import { REACTION_MIN_INTERVAL_MS } from "./coalescer";

export type ScanProgressOptions = {
  /** The active project. THE ONLY THING THIS STORE READS OFF THE WORKSPACE —
   *  deliberately not a `TriageGate`, so the lock and the refresh are not
   *  reachable from here. */
  readonly projectId: ComputedRef<string>;
  /** Subscribe to the progress half of the one backend event. Returns the handle
   *  that MUST be stopped — see {@link ScanProgressStore.stop}. */
  readonly subscribe: (
    handler: (payload: ScanProgressPayload) => void,
  ) => InvalidationSubscription;
};

export type ScanProgressStore = {
  /** The most recently APPLIED payload, or `null` before the first one lands.
   *  `null` and not a zero-filled shape: zeroes describe a scan that ran and
   *  found nothing, which is the opposite of "nothing has arrived yet". */
  readonly progress: ComputedRef<ScanProgressPayload | null>;
  /** How many applications have fired. The cap is asserted against this. */
  readonly appliedCount: ComputedRef<number>;
  /** Stop the subscription and silence any window still in flight. The mounting
   *  component MUST call this on unmount (research P-04). */
  stop: () => void;
};

export function useScanProgress(
  options: ScanProgressOptions,
): ScanProgressStore {
  // `shallowRef`, not `ref`: the payload is a frozen-in-practice record of
  // scalars that is REPLACED wholesale, never mutated in place, so deep
  // reactivity would walk thirteen fields on every page of a backfill to
  // discover what an identity comparison already knows.
  const applied = shallowRef<ScanProgressPayload | null>(null);
  const applications = ref(0);
  // The newest payload seen, whether or not it has been applied. The throttle
  // decides WHEN; this decides WHAT — so an application always renders the most
  // recent numbers rather than the ones that happened to open the window.
  let latest: ScanProgressPayload | null = null;
  let stopped = false;

  const apply = (): void => {
    if (stopped || latest === null) return;
    applied.value = latest;
    applications.value++;
  };

  // LEADING, NOT TRAILING. `useThrottleFn(fn, ms, trailing, leading)` — both
  // flags are written out rather than defaulted, because the DEFAULT is the
  // thing being asserted here and a reader must not have to look it up to know
  // which edge fires. The bookkeeping is the pinned @vueuse/core's, per
  // 05-RESEARCH.md's don't-hand-roll list: hand-rolled timers leak across
  // unmounts and the leak surfaces as duplicated work on the fourth project
  // switch, long after whoever wrote it has stopped looking.
  const throttled = useThrottleFn(apply, REACTION_MIN_INTERVAL_MS, false, true);

  const onProgress = (payload: ScanProgressPayload): void => {
    if (stopped) return;

    // A project switch and an in-flight event race. Applying another project's
    // scan progress puts a visibly wrong number on screen, and it is the same
    // guard `coalescer.ts` applies for the same reason — copied in EFFECT, not
    // by import, because the two stores read the project from their own options.
    if (payload.projectId !== options.projectId.value) return;

    latest = payload;
    void throttled();
  };

  const subscription = options.subscribe(onProgress);

  return {
    progress: computed(() => applied.value),
    appliedCount: computed(() => applications.value),
    stop: () => {
      // BOTH halves. Stopping the listener alone leaves a window already in
      // flight to fire into a store the component no longer owns, which is the
      // same leak by a different route.
      stopped = true;
      subscription.stop();
    },
  };
}
