<script setup lang="ts">
// packages/frontend/src/components/HealthPanel.vue — OBS-01's four numbers, on
// the surface the inventory table's error copy already sends the operator to.
//
// ===========================================================================
// WHAT THIS COMPONENT IS ACTUALLY FOR
// ===========================================================================
// It is not diagnostics decoration. 05-RESEARCH.md P-07, restating PITFALLS P3:
// **a frozen-looking page is almost always the backend's single QuickJS thread
// blocked by a large parse, not Vue.** The operator's evidence for "the UI
// hangs" and for "the backend is chewing through a 9 MB bundle" is identical —
// a page that does not respond — and without these four numbers they file the
// first report about the second problem, against the one component that is
// working.
//
// The routing already ships: `api/client.ts`'s `RPC_ERROR_STATE_BODY` ends
// "Retry, or open Settings → Health to see queue depth and dropped count", and
// the inventory table renders an **Open Health** action beside it. This
// component is the second half of a sentence that was already on screen.
//
// ===========================================================================
// IT MEASURES NOTHING. IT PROJECTS WHAT IS ALREADY MEASURED.
// ===========================================================================
// OBS-01 formally belongs to Phase 2. `telemetry.ts`'s `slimStatus()` has
// carried `maxSliceMs` since Phase 1 and the queue has carried its own depth and
// overflow count since it was constructed; `getHealth` reads those and the
// consumer's in-flight count. Adding an instrument here would put a measurement
// in the renderer, a process away from the thread being measured.
//
// ===========================================================================
// THE ONE SURFACE IN THIS PHASE WITH NO DISPLAY-PATH CALL
// ===========================================================================
// 05-UI-SPEC.md `long-text / health-strip`: only DefMiner-authored labels and
// numeric counters reach this strip. That is a PROPERTY OF THE SHAPE and not a
// discipline — `HealthCounters` carries four numbers and no string, so there is
// no field a later edit could accidentally render. `api/client.ts` records the
// matching decision on the other side: this surface reads `getHealth` and NOT
// `getStatus`, because `getStatus` carries the whole telemetry projection
// including `lastError`, and a strip built over the wider shape would be one
// field access away from rendering a plugin-generated string.

import { computed, onMounted, ref } from "vue";

import type {
  HealthCounters,
  HealthOutcome,
  RpcResult,
  SourcemapHealthCounters,
} from "../api/client";

import type { StripCounterId } from "./health-contract";
import {
  counterId,
  counterText,
  HEALTH_CELL_CLASS,
  HEALTH_COUNTERS,
  HEALTH_DETAIL_HEADING,
  HEALTH_FAILED_BODY,
  HEALTH_HEADING,
  HEALTH_LOADING_LABEL,
  HEALTH_PURPOSE,
  HEALTH_REFRESH_LABEL,
  HEALTH_REFRESHING_LABEL,
  HEALTH_STRIP_HEIGHT_CLASS,
  HEALTH_UNAVAILABLE_BODY,
  SOURCEMAP_COUNTERS,
  SOURCEMAP_HEADING,
  SOURCEMAP_PURPOSE,
} from "./health-contract";
import { FOCUS_RING_CLASS } from "./table-contract";

const { load } = defineProps<{
  /** Read the four counters. Answers a VALUE on every path — a component that
   *  had to catch would be a component whose failure Caido swallows, on the one
   *  surface whose subject is failures. */
  load: () => Promise<RpcResult<HealthOutcome>>;
}>();

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------

/**
 * THREE STATES, NOT TWO, AND THE THIRD IS NOT AN ERROR.
 *
 *   `counters`  — the backend answered with numbers.
 *   `null` with `failed` false — the backend answered `unavailable`: no project
 *                 is resolved, so there is genuinely nothing being analysed.
 *   `failed`    — the call produced no value at all.
 *
 * Collapsing the middle one into four zeroes is the specific mistake the
 * endpoint's two outcomes exist to prevent: four zeroes are what a perfectly
 * idle, perfectly healthy backend reports.
 */
const counters = ref<HealthCounters | null>(null);
const failed = ref(false);

/**
 * True while a read is in flight, INCLUDING THE FIRST — which is why it starts
 * `true` rather than being set by the mount hook.
 *
 * The action is rendered from the first paint and must already be in its
 * in-flight state at that paint; initialising this `false` would render an
 * enabled Refresh over a read that is already running, and the first thing an
 * operator does on a surface that says "nothing yet" is press it.
 */
const reading = ref(true);

/**
 * Whether a read has ever come back.
 *
 * SEPARATE FROM `reading`, because "a read is open" and "no read has ever
 * completed" are different claims and the template needs both: the loading
 * paragraph belongs to the second, and after the first answer it must never
 * reappear — a refresh that blanked the numbers it is refreshing would hide the
 * previous sample at the moment the operator is comparing the two.
 */
const settled = ref(false);

async function read(): Promise<void> {
  reading.value = true;
  const result = await load();
  reading.value = false;
  settled.value = true;

  if (!result.ok) {
    // A CALL THAT DID NOT ANSWER IS ITSELF A FINDING ABOUT THE BACKEND, and the
    // copy says so. The reason code is NOT rendered: `RpcReason` is a
    // DefMiner-authored identifier the UI maps to its own copy, never a
    // sentence it interpolates.
    failed.value = true;
    counters.value = null;
    return;
  }
  failed.value = false;
  counters.value =
    result.value.outcome === "health" ? result.value.health : null;
}

onMounted(() => {
  // Not awaited in an async hook: the heading and the purpose paragraph must be
  // on screen before this resolves, and `load` answers with a VALUE on every
  // path so the failure is a rendered state rather than a rejection Caido would
  // swallow.
  void read();
});

/**
 * The re-read action's only caller.
 *
 * THE DOUBLE-SUBMIT GUARD IS HERE, AT THE HANDLER, and not only on the
 * `disabled` attribute. The attribute is what the operator sees; this is what
 * holds when anything else calls in — a keyboard activation racing the paint, or
 * a future caller that does not know about the attribute at all.
 */
function onRefresh(): void {
  if (reading.value) return;
  void read();
}

// ---------------------------------------------------------------------------
// DERIVED
// ---------------------------------------------------------------------------

/** The strip renders only when there are numbers to put in it. */
const showStrip = computed<boolean>(() => counters.value !== null);

/** No project resolved — a real state, and not a failure. */
const unavailable = computed<boolean>(
  () => settled.value && !failed.value && counters.value === null,
);

function valueOf(id: StripCounterId): number {
  return counters.value === null ? 0 : counters.value[id];
}

/**
 * One reconstruction counter's value.
 *
 * THE SHIPPED STILL-RESOLVING RULE, UNCHANGED: this is only ever called from
 * inside a `v-if="showStrip"` block, so an unresolved read renders the rows as
 * ABSENT rather than as six zeroes. The `0` below is unreachable while that
 * holds, and it is a `0` rather than a throw for the reason the strip's own
 * lookup gives — a render-time throw on the surface whose subject is failures
 * would take the failure copy down with it.
 */
function sourcemapValueOf(id: keyof SourcemapHealthCounters): number {
  return counters.value === null ? 0 : counters.value.sourcemap[id];
}

const actionLabel = computed<string>(() =>
  reading.value ? HEALTH_REFRESHING_LABEL : HEALTH_REFRESH_LABEL,
);

// NO COMMENT AT THE TOP OF THE `<template>`: a comment there is a node, which
// makes the component a fragment and leaves every root-class assertion reading
// `[]` (the trap safety/HighlightSlices.vue records).
</script>

<template>
  <div class="flex flex-col gap-4 overflow-y-auto" data-defminer-health>
    <div class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold leading-snug">{{ HEALTH_HEADING }}</h2>
      <p class="text-surface-400">{{ HEALTH_PURPOSE }}</p>
    </div>

    <!-- THE STRIP. Its height comes from ONE utility and its cells are kept
         from wrapping by two more, none of them conditional on any value: the
         `overflow / health-strip` row requires that a large queue depth never
         wraps the strip or reflows what is below it, and a strip whose height
         is decided by its content is a strip that grows the first time a
         counter passes a million. No `flex-wrap` here, deliberately — the tab
         strip wraps because hiding a tab hides an entity class; hiding part of
         a counter row costs nothing and reflowing the page costs the operator
         their place. -->
    <div
      v-if="showStrip"
      :class="[
        HEALTH_STRIP_HEIGHT_CLASS,
        'flex shrink-0 items-center gap-8 border border-surface-600 px-4',
      ]"
      data-defminer-health-strip
    >
      <div
        v-for="counter in HEALTH_COUNTERS"
        :id="counterId(counter.id)"
        :key="counter.id"
        :class="[HEALTH_CELL_CLASS, 'flex items-center gap-2']"
      >
        <span class="text-xs font-semibold text-surface-400">{{
          counter.label
        }}</span>
        <span class="text-sm">{{
          counterText(counter, valueOf(counter.id))
        }}</span>
      </div>
    </div>

    <p v-else-if="!settled" class="text-surface-400">
      {{ HEALTH_LOADING_LABEL }}
    </p>

    <!-- A READ THAT DID NOT ANSWER IS SAID IN WORDS, and the words name the
         irony rather than hiding it: the one call that could not be answered is
         the one asking whether the backend is answering. -->
    <p
      v-else-if="failed"
      class="border border-danger-500 px-2 py-1 text-danger-500"
      role="alert"
      data-defminer-health-failed
    >
      {{ HEALTH_FAILED_BODY }}
    </p>

    <!-- NOT FOUR ZEROES. Four zeroes are what a healthy idle backend reports. -->
    <p
      v-else-if="unavailable"
      class="border border-surface-600 px-2 py-1"
      role="status"
      data-defminer-health-unavailable
    >
      {{ HEALTH_UNAVAILABLE_BODY }}
    </p>

    <!-- A TEXT LABEL, never an icon, and its own label in flight. The whole
         diagnosis is "does the number move", so one sample on mount could not
         answer the question the surface exists for. -->
    <div>
      <button
        id="defminer-health-refresh"
        type="button"
        :class="[
          FOCUS_RING_CLASS,
          'border border-surface-600 px-2 py-1 text-xs font-semibold',
        ]"
        :disabled="reading"
        @click="onRefresh"
      >
        {{ actionLabel }}
      </button>
    </div>

    <!-- THE EXPLANATIONS LIVE BELOW THE STRIP AND NEVER INSIDE IT. A sentence
         in a fixed-height row is the thing that wraps. -->
    <section v-if="showStrip" class="flex flex-col gap-2">
      <h3 class="text-xs font-semibold">{{ HEALTH_DETAIL_HEADING }}</h3>
      <dl class="flex flex-col gap-2">
        <div
          v-for="counter in HEALTH_COUNTERS"
          :key="counter.id"
          class="flex flex-col gap-1"
        >
          <dt class="text-xs font-semibold">{{ counter.label }}</dt>
          <dd class="text-surface-400">{{ counter.help }}</dd>
        </div>
      </dl>
    </section>

    <!-- PHASE 7's RECONSTRUCTION COUNTERS. Under the SAME `v-if` the strip
         uses, which is how the shipped still-resolving rule reaches them
         unchanged: a read that has not answered renders these rows ABSENT, and
         six zeroes are never shown for a number nobody has taken.

         ROWS, NOT A SECOND STRIP. The `overflow / health-strip` row requires a
         fixed height no counter can wrap, and six long labels on one `h-12`
         line would either wrap it or clip them. These are read, not glanced at.

         AND NO TONE. Every row here carries the same classes — no `danger`, no
         `info`, no degradation styling — because `External maps announced` is a
         MEASUREMENT of a deliberate design choice, not a fault. A number
         coloured as a fault is a number an operator files a bug about. -->
    <section
      v-if="showStrip"
      class="flex flex-col gap-2"
      data-defminer-health-sourcemap
    >
      <h3 class="text-xs font-semibold">{{ SOURCEMAP_HEADING }}</h3>
      <p class="text-surface-400">{{ SOURCEMAP_PURPOSE }}</p>
      <dl class="flex flex-col gap-2">
        <div
          v-for="counter in SOURCEMAP_COUNTERS"
          :id="counterId(counter.id)"
          :key="counter.id"
          class="flex flex-col gap-1"
          data-defminer-health-sourcemap-row
        >
          <dt :class="[HEALTH_CELL_CLASS, 'flex items-center gap-2 text-xs']">
            <span class="font-semibold text-surface-400">{{
              counter.label
            }}</span>
            <span class="text-sm">{{
              counterText(counter, sourcemapValueOf(counter.id))
            }}</span>
          </dt>
          <dd class="text-surface-400">{{ counter.help }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>
