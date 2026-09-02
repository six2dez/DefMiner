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

import type { HealthCounters, SourcemapHealthCounters } from "../api/client";

import { groupThousands } from "./table-contract";

// ---------------------------------------------------------------------------
// THE FOUR COUNTERS
// ---------------------------------------------------------------------------

/**
 * A field of {@link HealthCounters} the STRIP renders — the four flat numbers,
 * and never the nested reconstruction sub-object.
 *
 * `Exclude`d rather than listed, so a fifth flat counter added to the payload
 * is available here without a second edit and a nested one can never be
 * mistaken for a strip cell.
 *
 * @internal
 */
export type StripCounterId = Exclude<keyof HealthCounters, "sourcemap">;

/** One counter's identity, its label, its unit and what it tells the operator.
 *
 * @internal
 */
export type HealthCounter = {
  /** The field this row renders. Typed as a key of the object it reads, so a
   *  renamed field is a typecheck failure here rather than an `undefined`
   *  rendered as a blank number. */
  readonly id: StripCounterId | keyof SourcemapHealthCounters;
  readonly label: string;
  /** Rendered after the number, or `""` for a bare count. DefMiner-authored,
   *  like every other string that reaches this strip. */
  readonly unit: string;
  /** What this number means when it is large. Rendered BELOW the strip, never
   *  inside it: the strip's height is fixed and a sentence in it would be the
   *  thing that wraps. */
  readonly help: string;
};

/** A counter row addressing one of the payload's FLAT fields — a strip cell.
 *
 * @internal
 */
export type StripHealthCounter = HealthCounter & {
  readonly id: StripCounterId;
};

/** A counter row addressing one field of the reconstruction sub-object.
 *
 * @internal
 */
export type SourcemapHealthCounter = HealthCounter & {
  readonly id: keyof SourcemapHealthCounters;
};

/**
 * The four numbers, in the order 05-UI-SPEC.md names them.
 *
 * FROZEN AND DECLARED AT MODULE SCOPE, for the reason `App.vue`'s `TABS` list
 * gives: order is declaration order and is never sorted at runtime, so a number
 * an operator reads by position does not move under them between two visits to
 * the same page.
 */
export const HEALTH_COUNTERS: readonly StripHealthCounter[] = Object.freeze([
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
// THE SIX RECONSTRUCTION COUNTERS (Phase 7, plan 07-10)
// ---------------------------------------------------------------------------

/**
 * What sourcemap reconstruction did, as labelled ROWS rather than strip cells.
 *
 * ===========================================================================
 * ROWS AND NOT A SECOND STRIP, AND THE REASON IS THE SHIPPED STRIP'S CONTRACT
 * ===========================================================================
 * `overflow / health-strip` requires that the strip's height come from ONE
 * utility and that no counter ever wrap it. That works at four short cells on
 * one `h-12` line; six cells with labels this long would either wrap the strip
 * — breaking the row the shipped contract turns on — or clip the labels, which
 * is worse than a second block. These are diagnostics an operator READS, not a
 * pulse they GLANCE at, so they get the reading shape.
 *
 * ===========================================================================
 * THE EXTERNAL ROW IS THE LOAD-BEARING ONE AND IT IS NOT A FAILURE
 * ===========================================================================
 * Under D-01 an external `.map` announcement is DISCOVERED and not consumed, on
 * purpose: DefMiner never fetches a `.map`, because that would be a request the
 * target can see. So the number is neither good news nor bad news — it is the
 * MEASUREMENT of how much of MAP-01 this phase hands to Phase 8. Its label says
 * what it means without reading as an error, its `help` says why the number
 * exists, and `HealthPanel.vue` gives it the same tone as every other row: no
 * `danger`, no `info`, no degradation styling of any kind. A number coloured as
 * a fault is a number an operator files a bug about.
 */
export const SOURCEMAP_COUNTERS: readonly SourcemapHealthCounter[] =
  Object.freeze([
    {
      id: "announcedInline",
      label: "Inline maps announced",
      unit: "",
      help: "Bundles that carried their sourcemap inside themselves, as a data: URI. These are the ones DefMiner can reconstruct from, because the map arrived in bytes Caido already had.",
    },
    {
      id: "announcedExternal",
      label: "External maps announced",
      unit: "",
      help: "Bundles that named a separate .map file. DefMiner does not fetch them — a fetch is a request the target can see, and DefMiner stays silent — so these are counted and left. This number is how much of the sourcemap surface is waiting on a later release, not a count of anything that went wrong.",
    },
    {
      id: "mapRefusedTooLarge",
      label: "Maps refused for size",
      unit: "",
      help: "Inline maps whose decoded JSON was larger than the measured ceiling. The backend runs on one thread and parsing a map that large would stall the proxy, so the map is refused rather than attempted.",
    },
    {
      id: "mapMalformed",
      label: "Maps malformed",
      unit: "",
      help: "Inline maps that announced a sourcemap and were not one — truncated base64, invalid JSON, a document too deeply nested, or a shape the format does not allow.",
    },
    {
      id: "sourcesRecovered",
      label: "Sources recovered",
      unit: "",
      help: "Distinct source files reconstructed and stored, counted once per content hash. The same file in two bundles is one row here and two sightings below.",
    },
    {
      id: "sightingsRecorded",
      label: "Sightings recorded",
      unit: "",
      help: "Times a recovered source was seen in a map. This is the number that grows when the same library appears across a target's bundles, and it is what the drill-down's per-artifact counts are read from.",
    },
  ] as const);

// ---------------------------------------------------------------------------
// COPY
// ---------------------------------------------------------------------------

/** The section heading. */
export const HEALTH_HEADING = "Backend health";

/** The reconstruction block's heading. */
export const SOURCEMAP_HEADING = "Sourcemap reconstruction";

/**
 * Why these six numbers are on screen, said on the surface itself.
 *
 * IT PRE-EMPTS THE MISREADING RATHER THAN WAITING FOR IT. An operator who sees
 * a low `Sources recovered` beside a high `External maps announced` should read
 * a deliberate design choice, not a broken feature — and the only place that
 * sentence can do its work is next to the numbers.
 */
export const SOURCEMAP_PURPOSE =
  "DefMiner recovers source only from sourcemaps embedded in a bundle it already has. It never fetches a .map file — that would be a request the target can see. A low recovered count beside a high external count is the expected result on production traffic, not a fault.";

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
export function counterId(
  id: StripCounterId | keyof SourcemapHealthCounters,
): string {
  return "defminer-health-" + id;
}
