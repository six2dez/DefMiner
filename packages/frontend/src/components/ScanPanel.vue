<script setup lang="ts">
// packages/frontend/src/components/ScanPanel.vue — FIND-04's surface: start a
// retroactive scan, and watch a job with no denominator move.
//
// ===========================================================================
// TWO STATES, NEVER BOTH
// ===========================================================================
// The start form and the live readout are the SAME QUESTION in two states —
// "is this project's history covered?" — so they are never on screen together.
// A disabled start form beside a running scan is chrome whose only content is
// "no"; the one-at-a-time invariant is rendered as a STATE OF THE SURFACE
// instead, which is what makes it explicit rather than accidental.
//
// `null` from the status endpoint is a REAL STATE and not a failure, and the
// distinction is the whole reason the endpoint answers a union: a payload of
// zeroes describes a scan that started and found nothing, which is the opposite
// of the truth for a project that has never run one.
//
// ===========================================================================
// NOTHING HERE IS INDETERMINATE
// ===========================================================================
// No progress bar, no spinner, no pulse, no animated ellipsis, no shimmer —
// `progressbar` and `progressspinner` are both available in the Caido palette
// and both are banned on this surface. The only things that move are numbers
// that mean something. The reasoning generalises the shipped no-centred-spinner
// rule and adds an independent second leg: a spinner claims "something is
// happening" while refusing to say what, and this surface's entire subject is
// refusing to claim more than is known. A tool that will not fabricate a
// percentage must not fabricate reassurance either.
//
// The in-flight label convention still applies to the CONTROLS: Start scan
// becomes "Starting…", disabled while in flight — its own label, not a spinner
// beside the old one, the rule the shipped Save and Refresh actions obey.
//
// ===========================================================================
// WHAT REACHES THIS TEMPLATE, AND WHY THERE IS ONE DISPLAY-PATH CALL
// ===========================================================================
// Every field of `ScanStatusPayload` is an integer, a closed-vocabulary word or
// a filter string DefMiner or the operator authored — no response byte, no
// header and no URL. So the counters and the status word need no sanitising and
// a `forCellText` over an integer would imply the opposite.
//
// The composed filter is the one exception and it is a real one: it contains
// the operator's own clause, echoed back. It goes through `forCellText` and it
// appears ONLY inside its own `font-mono` element — never interpolated into a
// sentence. That is the rule the whole page obeys, applied to the one string on
// this surface that a person typed.

import type { ScanStatusPayload } from "@defminer/engine/contract";
import { computed, onMounted, ref } from "vue";

import type { RpcResult, StartScanOutcome } from "../api/client";
import { forCellText } from "../safety/display";

import {
  counterId,
  counterText,
  positionText,
  SCAN_CELL_CLASS,
  SCAN_CLAUSE_CLASS,
  SCAN_COMPOSED_HELP,
  SCAN_COMPOSED_LABEL,
  SCAN_DEFMINER_CLAUSE_LABEL,
  SCAN_DETAIL_COUNTERS,
  SCAN_DETAIL_HEADING,
  SCAN_FAILED_BODY,
  SCAN_HEADING,
  SCAN_LOADING_LABEL,
  SCAN_NO_DENOMINATOR_NOTE,
  SCAN_POSITION_PREFIX,
  SCAN_PURPOSE,
  SCAN_REFRESH_LABEL,
  SCAN_REFRESHING_LABEL,
  SCAN_REFUSAL_COPY,
  SCAN_SCOPE_STATEMENT,
  SCAN_START_CTA,
  SCAN_STARTING_LABEL,
  SCAN_STATUS_DISCARDED,
  SCAN_STATUS_FINISHED,
  SCAN_STATUS_SCANNING,
  SCAN_STATUS_STARTING,
  SCAN_STATUS_SUSPENDED,
  SCAN_STRIP_COUNTERS,
  SCAN_STRIP_HEIGHT_CLASS,
} from "./scan-contract";
import { FOCUS_RING_CLASS } from "./table-contract";

const { defminerClause, load, start } = defineProps<{
  /** DefMiner's own HTTPQL clause, read-only. Rendered as CONTEXT and never as
   *  an input: the operator may narrow the scan and may not widen it, and the
   *  clause they are adding to has to be visible for that to be checkable. */
  defminerClause: string;
  /** Read this project's active scan. Answers a VALUE on every path — a
   *  component that had to catch would be a component whose failure Caido
   *  swallows. */
  load: () => Promise<RpcResult<ScanStatusPayload | null>>;
  /** Begin one scan. Same contract: a value on every path, and a refusal is a
   *  value rather than a rejection. */
  start: (request: {
    readonly operatorFilter: string;
  }) => Promise<RpcResult<StartScanOutcome>>;
}>();

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------

/**
 * THREE STATES, AND THE MIDDLE ONE IS NOT AN ERROR.
 *
 *   a payload            — there is a scan; render the readout.
 *   `null`, `failed` off — there is no scan; render the start form.
 *   `failed`             — the call produced no value at all.
 *
 * Collapsing the middle into a zero-filled payload is the specific mistake the
 * endpoint's union exists to prevent.
 */
const scan = ref<ScanStatusPayload | null>(null);
const failed = ref(false);

/** True while a status read is in flight, INCLUDING THE FIRST — which is why it
 *  starts `true` rather than being set by the mount hook. The Refresh action is
 *  rendered from the first paint and must already be in its in-flight state at
 *  that paint. */
const reading = ref(true);

/** Whether a read has ever come back. Separate from `reading`, because "a read
 *  is open" and "no read has ever completed" are different claims and the
 *  template needs both: after the first answer the loading line must never
 *  reappear, or a refresh would blank the numbers it is refreshing. */
const settled = ref(false);

/** True while the start call is in flight. Its own flag rather than reusing
 *  `reading`: the two actions are independent and sharing one would disable a
 *  control for a call it has nothing to do with. */
const starting = ref(false);

/** The refusal code from the last start attempt, or `null`. A CODE, mapped to
 *  copy at render time — never a message from the backend. */
const refusal = ref<keyof typeof SCAN_REFUSAL_COPY | null>(null);

async function read(): Promise<void> {
  reading.value = true;
  const result = await load();
  reading.value = false;
  settled.value = true;

  if (!result.ok) {
    // A CALL THAT DID NOT ANSWER IS ITSELF A FINDING ABOUT THE BACKEND, and the
    // copy says so — while being careful NOT to claim the scan stopped, which
    // is a different fact this component cannot observe. The reason code is not
    // rendered: it is a DefMiner-authored identifier the UI maps to its own
    // copy, never a sentence it interpolates.
    failed.value = true;
    return;
  }
  failed.value = false;
  scan.value = result.value;
}

onMounted(() => {
  // Not awaited in an async hook: the heading and the purpose paragraph must be
  // on screen before this resolves, and `load` answers with a VALUE on every
  // path so a failure is a rendered state rather than a rejection Caido would
  // swallow.
  void read();
});

/**
 * The re-read action's only caller.
 *
 * THE DOUBLE-SUBMIT GUARD IS HERE, AT THE HANDLER, and not only on the
 * `disabled` attribute. The attribute is what the operator sees; this is what
 * holds when anything else calls in — a keyboard activation racing the paint,
 * or a future caller that does not know about the attribute at all.
 */
function onRefresh(): void {
  if (reading.value) return;
  void read();
}

/**
 * Start one scan, then re-read.
 *
 * THE OPERATOR CLAUSE IS `""` AND IS NOT AN INPUT ON THIS BUILD. Plan 06-04
 * ships the validator that makes a typed clause safe to send; until it does,
 * there is no field, because a field whose contents are refused is worse than
 * no field. The read-only clause below still renders, so what the scan WILL do
 * is on screen either way.
 */
async function onStart(): Promise<void> {
  if (starting.value) return;
  starting.value = true;
  refusal.value = null;
  const result = await start({ operatorFilter: "" });
  starting.value = false;

  if (!result.ok) {
    failed.value = true;
    return;
  }
  if (result.value.outcome === "refused") {
    refusal.value = result.value.reason;
    return;
  }
  // Re-read rather than fabricating a payload from the outcome. The row the
  // backend actually wrote is the only thing worth rendering, and a
  // locally-assembled one would be a second construction of a shape whose whole
  // value is that both sides agree about it.
  await read();
}

// ---------------------------------------------------------------------------
// DERIVED
// ---------------------------------------------------------------------------

/** The live readout renders only when there IS a scan. */
const showReadout = computed<boolean>(() => scan.value !== null);

/** The start form renders when a settled read found no scan. Never beside the
 *  readout, and never before the first read settles — a form that appeared and
 *  was then replaced would invite a press that arrives after the state moved. */
const showStartForm = computed<boolean>(
  () => settled.value && !failed.value && scan.value === null,
);

/**
 * The status LINE — a computed presentation state, distinct from the four
 * persisted lifecycle states.
 *
 * A single "Running" label would make three very different situations look
 * identical, and only one of them is bad. This build reports two of the three:
 * "Starting…" while `running` with no page behind it, and "Scanning" once a
 * page has resolved. The third — "Waiting for the analysis queue", the healthy
 * backpressure hold — arrives with plan 06-03's watermark, which is also what
 * makes `heldAtWatermark` ever true. The stall marker is 06-03's too and
 * DEPENDS on that signal existing: without it every legitimate hold would fall
 * through to "Not advancing" and the marker would cry wolf on the most common
 * healthy state of a long backfill.
 */
const statusLine = computed<string>(() => {
  const row = scan.value;
  if (row === null) return "";
  if (row.state === "suspended") return SCAN_STATUS_SUSPENDED;
  if (row.state === "completed") return SCAN_STATUS_FINISHED;
  if (row.state === "discarded") return SCAN_STATUS_DISCARDED;
  return row.pagesWalked === 0 ? SCAN_STATUS_STARTING : SCAN_STATUS_SCANNING;
});

/**
 * The position line, or `null`.
 *
 * ABSENT BEFORE THE FIRST PAGE, never a placeholder date and never the epoch.
 * The status line carries "Starting…" instead — a number DefMiner does not have
 * is absent, never zero.
 */
const position = computed<string | null>(() =>
  scan.value === null ? null : positionText(scan.value.lastCreatedAt),
);

/** The composed filter, sanitised. THE ONE display-path call on this surface,
 *  because this is the one string here that a person typed. */
const composed = computed<string>(() =>
  scan.value === null ? "" : forCellText(scan.value.composedFilter),
);

/** DefMiner's own clause, sanitised too — not because its provenance is in
 *  doubt but because the element it lands in must not become the one element on
 *  the page with a different rule. */
const ownClause = computed<string>(() => forCellText(defminerClause));

function valueOf(
  id: (typeof SCAN_STRIP_COUNTERS)[number]["id"],
): number | null {
  const row = scan.value;
  return row === null ? null : row[id];
}

const startLabel = computed<string>(() =>
  starting.value ? SCAN_STARTING_LABEL : SCAN_START_CTA,
);

const refreshLabel = computed<string>(() =>
  reading.value ? SCAN_REFRESHING_LABEL : SCAN_REFRESH_LABEL,
);

const refusalBody = computed<string | null>(() =>
  refusal.value === null ? null : SCAN_REFUSAL_COPY[refusal.value],
);

// NO COMMENT AT THE TOP OF THE `<template>`: a comment there is a node, which
// makes the component a fragment and leaves every root-class assertion reading
// `[]` (the trap safety/HighlightSlices.vue records).
</script>

<template>
  <div class="flex flex-col gap-4 overflow-y-auto" data-defminer-scan>
    <div class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold leading-snug">{{ SCAN_HEADING }}</h2>
      <p class="text-surface-400">{{ SCAN_PURPOSE }}</p>
    </div>

    <!-- THE STATUS LINE AND THE POSITION LINE COME FIRST, because the
         operator's question on arrival is "is it moving". The position date
         marches BACKWARDS into history — the walk is descending — and a date
         moving backwards is legible as progress in a way a rising integer is
         not: it answers "how far back have I got", which is the question the
         missing denominator was going to answer. -->
    <div
      v-if="showReadout"
      class="flex flex-col gap-1"
      role="status"
      data-defminer-scan-status
    >
      <p class="text-sm font-semibold">{{ statusLine }}</p>
      <p v-if="position !== null" class="text-surface-400">
        {{ SCAN_POSITION_PREFIX }} {{ position }}
      </p>
    </div>

    <!-- THE STRIP. Its height comes from ONE utility and its cells are kept
         from wrapping by two more, none of them conditional on any value: a
         strip whose height is decided by its content is a strip that grows the
         first time a counter passes a million, and this one is on screen for
         hours. Four cells and not seven — seven at `gap-8` would wrap at
         plausible panel widths, and a wrapping strip reflows what is below it.
         No animation of any kind. -->
    <div
      v-if="showReadout"
      :class="[
        SCAN_STRIP_HEIGHT_CLASS,
        'flex shrink-0 items-center gap-8 border border-surface-600 px-4',
      ]"
      data-defminer-scan-strip
    >
      <div
        v-for="counter in SCAN_STRIP_COUNTERS"
        :id="counterId(counter.id)"
        :key="counter.id"
        :class="[SCAN_CELL_CLASS, 'flex items-center gap-2']"
      >
        <span class="text-xs font-semibold text-surface-400">{{
          counter.label
        }}</span>
        <span class="text-sm">{{ counterText(valueOf(counter.id)) }}</span>
      </div>
    </div>

    <!-- THE SINGLE MOST IMPORTANT SENTENCE ON THIS SURFACE, directly under the
         strip and never repeated per counter. Prose in body weight, not a
         tooltip and not behind a disclosure: a sentence explaining why the
         surface looks the way it looks must not be hidden behind an interaction
         the operator has no reason to perform. -->
    <p v-if="showReadout" class="text-surface-400" data-defminer-scan-note>
      {{ SCAN_NO_DENOMINATOR_NOTE }}
    </p>

    <!-- THE COMPOSED FILTER — the exact string that is being sent. Its own
         `font-mono` element, never inside a sentence. -->
    <section v-if="showReadout" class="flex flex-col gap-1">
      <h3 class="text-xs font-semibold">{{ SCAN_COMPOSED_LABEL }}</h3>
      <p :class="SCAN_CLAUSE_CLASS">{{ composed }}</p>
    </section>

    <p v-if="!settled" class="text-surface-400">{{ SCAN_LOADING_LABEL }}</p>

    <!-- A READ THAT DID NOT ANSWER IS SAID IN WORDS, and the words are careful
         NOT to claim the scan stopped — that is a different fact, and one this
         component cannot observe. -->
    <p
      v-else-if="failed"
      class="border border-danger-500 px-2 py-1 text-danger-500"
      role="alert"
      data-defminer-scan-failed
    >
      {{ SCAN_FAILED_BODY }}
    </p>

    <!-- THE START FORM. Absent — not disabled — whenever a scan exists. -->
    <section
      v-if="showStartForm"
      class="flex flex-col gap-4"
      data-defminer-scan-form
    >
      <div class="flex flex-col gap-1">
        <h3 class="text-xs font-semibold">
          {{ SCAN_DEFMINER_CLAUSE_LABEL }}
        </h3>
        <p :class="SCAN_CLAUSE_CLASS">{{ ownClause }}</p>
        <p class="text-surface-400">{{ SCAN_COMPOSED_HELP }}</p>
      </div>

      <!-- D-07, SAID BEFORE THE SCAN RUNS rather than after it returns fewer
           results than expected. The asymmetry is genuinely surprising and
           there is no way to soften it. -->
      <p class="text-surface-400">{{ SCAN_SCOPE_STATEMENT }}</p>

      <!-- A REFUSAL IS RENDERED FROM ITS CODE, never from a backend message. -->
      <p
        v-if="refusalBody !== null"
        class="border border-danger-500 px-2 py-1 text-danger-500"
        role="alert"
        data-defminer-scan-refused
      >
        {{ refusalBody }}
      </p>

      <div>
        <button
          id="defminer-scan-start"
          type="button"
          :class="[
            FOCUS_RING_CLASS,
            'border border-surface-600 px-2 py-1 text-xs font-semibold',
          ]"
          :disabled="starting"
          @click="void onStart()"
        >
          {{ startLabel }}
        </button>
      </div>
    </section>

    <!-- A TEXT LABEL, never an icon, and its own label in flight. The whole
         diagnosis is "does the number move", so one sample on mount could not
         answer the question this surface exists for. -->
    <div v-if="showReadout">
      <button
        id="defminer-scan-refresh"
        type="button"
        :class="[
          FOCUS_RING_CLASS,
          'border border-surface-600 px-2 py-1 text-xs font-semibold',
        ]"
        :disabled="reading"
        @click="onRefresh"
      >
        {{ refreshLabel }}
      </button>
    </div>

    <!-- THE SLOWER COUNTERS AND THEIR EXPLANATIONS LIVE BELOW THE STRIP AND
         NEVER INSIDE IT. A sentence in a fixed-height row is the thing that
         wraps. -->
    <section v-if="showReadout" class="flex flex-col gap-2">
      <h3 class="text-xs font-semibold">{{ SCAN_DETAIL_HEADING }}</h3>
      <dl class="flex flex-col gap-2">
        <div
          v-for="counter in SCAN_DETAIL_COUNTERS"
          :key="counter.id"
          class="flex flex-col gap-1"
        >
          <dt class="text-xs font-semibold">
            {{ counter.label }} · {{ counterText(valueOf(counter.id)) }}
          </dt>
          <dd class="text-surface-400">{{ counter.help }}</dd>
        </div>
        <div
          v-for="counter in SCAN_STRIP_COUNTERS"
          :key="counter.id"
          class="flex flex-col gap-1"
        >
          <dt class="text-xs font-semibold">{{ counter.label }}</dt>
          <dd class="text-surface-400">{{ counter.help }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>
