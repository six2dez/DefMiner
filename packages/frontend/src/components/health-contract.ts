// packages/frontend/src/components/health-contract.ts — OBS-01's four numbers,
// their labels, and the one layout class that keeps the strip a strip.
//
// ===========================================================================
// WHY THE HEALTH TAB EXISTS AT ALL
// ===========================================================================
// 05-UI-SPEC.md § "Data & Interaction Contract" states it and 05-RESEARCH.md
// P-07 measures it: **a frozen-looking page is almost always the backend's
// single QuickJS thread blocked by a large parse, not Vue.** Without these four
// numbers the operator files "the UI hangs" against the renderer, which is the
// one component that is working. The error copy on the inventory table routes
// them here BY NAME — "open Settings → Health to see queue depth and dropped
// count" — so this surface is the second half of a sentence that already ships.
//
// ===========================================================================
// NOTHING HERE IS NEW INSTRUMENTATION
// ===========================================================================
// OBS-01 formally belongs to Phase 2. Every number below is already measured:
// `telemetry.ts`'s `slimStatus()` projects `maxSliceMs`, and `index.ts`'s
// `getHealth` reads the queue's own depth and overflow count plus the
// consumer's in-flight count. This module names them and nothing more. A phase
// that adds a counter adds it there and then adds a row here; it does not add a
// measurement here.
//
// ===========================================================================
// WHY THE COPY LIVES IN A MODULE AND NOT IN THE TEMPLATE
// ===========================================================================
// The argument `panel-contract.ts`, `export-contract.ts` and
// `settings-contract.ts` all make: a string typed into a template is a string a
// spec has to retype to assert, and two typings of one sentence are two
// sentences.
//
// ===========================================================================
// THE ONE SURFACE IN THIS PHASE WITH NO DISPLAY-PATH CALL
// ===========================================================================
// 05-UI-SPEC.md § "UI Considerations" `long-text / health-strip`: the strip
// carries only DefMiner-authored labels and numeric counters, and no
// target-controlled content reaches it. That is a PROPERTY OF THE SHAPE rather
// than a discipline — `HealthCounters` in api/client.ts carries four numbers and
// no string, so there is no field on it a later edit could render. Which is also
// why this module sanitises nothing: there is nothing here to sanitise, and a
// `forCellText` call over an integer would imply the opposite.

import type { HealthCounters } from "../api/client";

import { groupThousands } from "./table-contract";

// ---------------------------------------------------------------------------
// THE FOUR COUNTERS
// ---------------------------------------------------------------------------

/** One counter's identity, its label, its unit and what it tells the operator.
 *
 * @internal
 */
export type HealthCounter = {
  /** The field on {@link HealthCounters} this row renders. Typed as a key of
   *  that object, so a renamed field is a typecheck failure here rather than an
   *  `undefined` rendered as a blank number. */
  readonly id: keyof HealthCounters;
  readonly label: string;
  /** Rendered after the number, or `""` for a bare count. DefMiner-authored,
   *  like every other string that reaches this strip. */
  readonly unit: string;
  /** What this number means when it is large. Rendered BELOW the strip, never
   *  inside it: the strip's height is fixed and a sentence in it would be the
   *  thing that wraps. */
  readonly help: string;
};

/**
 * The four numbers, in the order 05-UI-SPEC.md names them.
 *
 * FROZEN AND DECLARED AT MODULE SCOPE, for the reason `App.vue`'s `TABS` list
 * gives: order is declaration order and is never sorted at runtime, so a number
 * an operator reads by position does not move under them between two visits to
 * the same page.
 */
export const HEALTH_COUNTERS: readonly HealthCounter[] = Object.freeze([
  {
    id: "queueDepth",
    label: "Queue depth",
    unit: "",
    help: "Responses waiting to be analysed. A depth that stays high while nothing finishes is a backend working through something large, not a stalled interface.",
  },
  {
    id: "droppedCount",
    label: "Dropped",
    unit: "",
    help: "Responses the queue refused because it was full. These were never analysed and will not be retried — the queue is bounded on purpose, because an unbounded one would trade a dropped response for a stalled proxy.",
  },
  {
    id: "jobsInFlight",
    label: "Jobs in flight",
    unit: "",
    help: "Analyses started and not yet finished. DefMiner's backend is single-threaded, so this is at most one at a time; a value that sits at one while the queue depth climbs is the blocked thread this surface exists to show you.",
  },
  {
    id: "maxSliceMs",
    label: "Largest synchronous slice",
    unit: "ms",
    help: "The longest single uninterrupted piece of work the backend has done since it started. The proxy cannot answer anything during a slice, so this is the worst pause DefMiner has cost you.",
  },
] as const);

// ---------------------------------------------------------------------------
// COPY
// ---------------------------------------------------------------------------

/** The section heading. */
export const HEALTH_HEADING = "Backend health";

/**
 * Why the operator is looking at this, said on the surface itself.
 *
 * The design contract's paragraph, carried rather than summarised. An operator
 * who reaches this tab from the table's error action arrives already suspecting
 * the interface; this is the sentence that redirects them.
 */
export const HEALTH_PURPOSE =
  "DefMiner's backend runs on a single thread, and a large bundle blocks it. When the page looks frozen, these four numbers are how you tell a busy backend from a stuck interface: a backend that is working shows a queue depth that moves.";

/** The heading over the per-counter explanations below the strip. */
export const HEALTH_DETAIL_HEADING = "What these numbers mean";

/** While the first read is in flight. */
export const HEALTH_LOADING_LABEL = "Reading backend health…";

/**
 * What a FAILED read says.
 *
 * IT NAMES THE IRONY RATHER THAN HIDING IT. The one call that cannot be
 * answered is the one asking whether the backend is answering, and a bare
 * "could not load" would leave the operator no better off than the frozen page
 * that sent them here. A read that times out IS a finding about the backend, and
 * this sentence says so.
 */
export const HEALTH_FAILED_BODY =
  "Could not read backend health — the DefMiner backend did not answer. That is itself an answer: a backend that cannot reply to a call that touches no database is a backend whose thread is busy or gone. Retry in a moment.";

/**
 * What the `unavailable` outcome says.
 *
 * FOUR ZEROES ARE NOT THIS STATE, and that is the whole reason the endpoint has
 * two outcomes. Four zeroes are what a perfectly idle, perfectly healthy backend
 * reports; rendering them for a plugin that has resolved no project would tell
 * the operator the opposite of the truth at exactly the moment they came here to
 * find out why nothing is happening.
 */
export const HEALTH_UNAVAILABLE_BODY =
  "No project is open, so there is nothing being analysed and nothing to report. Open a project in Caido and these counters start moving.";

/** The re-read action at rest. A TEXT LABEL, never an icon. */
export const HEALTH_REFRESH_LABEL = "Refresh";

/** The re-read action in flight — its own label, not a spinner beside the old
 *  one, the same rule the settings surface's save action obeys. */
export const HEALTH_REFRESHING_LABEL = "Refreshing…";

// ---------------------------------------------------------------------------
// LAYOUT
// ---------------------------------------------------------------------------

/**
 * The strip's fixed height, as the Tailwind utility that produces it.
 *
 * 48px — the `2xl` value in 05-UI-SPEC.md § "Spacing Scale", the same token the
 * page toolbar uses. FIXED IS THE CONTRACT, not the number: the `overflow /
 * health-strip` row requires that a large queue depth or dropped count never
 * wraps the strip or reflows the toolbar, and a strip whose height is decided by
 * its content is a strip that grows the first time a counter passes a million.
 *
 * A LITERAL, because Tailwind's JIT only emits a utility it can SEE spelled out
 * in the scanned source — the trap `table-contract.ts`'s row-height lookup
 * records at length.
 */
export const HEALTH_STRIP_HEIGHT_CLASS = "h-12";

/**
 * What every counter cell in the strip carries.
 *
 * `whitespace-pre` and `overflow-hidden` are the other half of the fixed height:
 * without them a number wide enough to fill the row wraps, and the strip that
 * cannot wrap becomes a strip that did. Deliberately the same pair
 * `table-contract.ts`'s `CELL_CLASS` uses, for the same reason, and NOT reused
 * from it — a table cell's classes are a table's contract, and a shared constant
 * would make a change to one silently a change to the other.
 */
export const HEALTH_CELL_CLASS = "whitespace-pre overflow-hidden";

// ---------------------------------------------------------------------------
// RENDERING
// ---------------------------------------------------------------------------

/**
 * One counter's rendered value: a grouped integer, with its unit when it has
 * one.
 *
 * SEPARATORS ARE NOT DECORATION HERE. `1000000` and `100000` differ by one
 * character and by a factor of ten, and this surface exists to be read at a
 * glance by somebody who already thinks something is broken.
 *
 * NON-FINITE AND NEGATIVE VALUES ARE RENDERED AS THEY ARE, not clamped. Every
 * one of these four is a bounded non-negative integer by construction on the
 * backend; if one ever is not, the honest rendering is the wrong number, because
 * a clamp would hide the defect on the one surface whose whole job is to show
 * defects.
 */
export function counterText(counter: HealthCounter, value: number): string {
  const grouped = groupThousands(value);
  return counter.unit === "" ? grouped : `${grouped} ${counter.unit}`;
}

/**
 * A stable element id for one counter cell.
 *
 * AN `id` AND NOT A `data-*` ATTRIBUTE, for the reason `settings-contract.ts`'s
 * `groupId` states: the static R1/R2 gate reports ANY bound `data-*` binding
 * categorically, because an attribute escapes every text-node protection R2
 * buys and a rule that asked whether the expression happened to be safe would be
 * a rule somebody argues with.
 */
export function counterId(id: keyof HealthCounters): string {
  return "defminer-health-" + id;
}
