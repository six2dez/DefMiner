<script setup lang="ts">
// packages/frontend/src/components/EvidencePanel.vue — UI-03's frame, ERR-04's
// copy, UI-09's per-artifact line, and OPS-03's action.
//
// ===========================================================================
// PERSISTENCE IS THE LOAD-BEARING PROPERTY, NOT THE CONTENTS
// ===========================================================================
// 05-UI-SPEC.md § "Data & Interaction Contract": the panel is "a persistent
// region, not an overlay: an overlay would force the operator to close it
// between rows, which is the wrong ergonomics for triaging thousands of items".
// Its `loading / evidence-panel` row states the consequence for this file:
// while a selected row's evidence loads the panel "renders a skeleton at its
// own fixed height and DOES NOT COLLAPSE OR UNMOUNT. A collapsing panel would
// reflow the split body on every row click — the same defect the table's
// no-spinner rule exists to prevent."
//
// So the root element below is rendered UNCONDITIONALLY, carries
// `EVIDENCE_PANEL_HEIGHT_CLASS` in every state, and the five states are chosen
// INSIDE its scroll container. Nothing in this component can remove the region
// from the tree, and its spec asserts that by node identity across a
// loading/loaded transition rather than by a pixel measurement jsdom cannot
// take (P5-D65).
//
// ===========================================================================
// A FRAME IS THE DELIVERABLE. THE FIELDS THAT HAVE NO DATA SOURCE SAY SO.
// ===========================================================================
// `EvidencePanelFrame` in @defminer/engine/contract publishes five mandatory
// fields. Two of them — the byte range and the snippet — come from Phase 4's
// `evidence` table, and one — the score explanation — from Phase 3's signal
// vocabulary. Neither exists. The entity contract's deferral register records
// which, why, and which plan unblocks each.
//
// EVERY DEFERRED SLOT RENDERS AN EXPLICIT LINE NAMING WHAT IT IS WAITING ON,
// never an empty region. An empty region reads as "no evidence for this row",
// which is a DIFFERENT AND FALSE CLAIM from "the table that holds it does not
// exist yet" — and it is the claim an operator would act on.
//
// ===========================================================================
// WHAT DOES NOT CROSS INTO THIS COMPONENT
// ===========================================================================
// The backend's analysis projection carries NO `error` field. That is
// resolution rather than discipline: ERR-04's copy interpolates a `{reason}`
// into a sentence, 05-UI-SPEC.md's rule that outranks its copy table requires
// that reason be a DefMiner-authored code, and the surest way to keep a
// hostile artifact's own error text out of a sentence is for it never to reach
// the package that writes the sentence (T-05-51).
//
// `StatusBadge` is deliberately NOT used here. It carries a
// `data-defminer-status-badge` marker, and this panel asserts — per test, over
// its RENDERED SUBTREE — that no node inside it carries a `title` attribute or
// a `data-`prefixed one, which is R2's absolute. The five labels are shared
// through `scan-state-presentation.ts` instead, so the vocabulary still has
// exactly one declaration.

import type { ScanState } from "@defminer/engine/contract";
import {
  isDegradedScanState,
  UNCLASSIFIED_ANALYSIS_FAILURE_REASON,
} from "@defminer/engine/contract";
import { computed, ref, watch } from "vue";

import type {
  AnalysisKey,
  PanelAnalysis,
  RetryOutcome,
  RpcResult,
} from "../api/client";
import { byteRangeNotice, forPanel, truncationNotice } from "../safety/display";

import {
  ARTIFACT_VERSION_LABEL,
  BYTE_RANGE_PENDING,
  CLOSE_LABEL,
  degradedMarker,
  EVIDENCE_HEADING,
  EVIDENCE_PANEL_HEIGHT_CLASS,
  failureDetail,
  LOAD_FAILED_BODY,
  LOADING_LABEL,
  NEVER_ANALYSED_BODY,
  NO_SELECTION_BODY,
  type PanelEvidence,
  RE_ANALYSE_LABEL,
  RE_ANALYSING_LABEL,
  RETRY_FAILED_BODY,
  SCORE_PENDING,
  SNIPPET_PENDING,
  SOURCE_REQUEST_PENDING,
} from "./panel-contract";
import { SCAN_STATE_PRESENTATION } from "./scan-state-presentation";
import { FOCUS_RING_CLASS } from "./table-contract";

const {
  projectId,
  selectedSha256,
  analysis,
  loading,
  failed,
  evidence,
  sourceRequestId,
  retry,
} = defineProps<{
  /** The project the page asks under. The backend discards and substitutes it
   *  (P5-D43); it is a required request field, not the answer to "which
   *  project". */
  projectId: string;
  /** The selected row's content digest, or `null` when nothing is selected. */
  selectedSha256: string | null;
  /** The loaded analysis, or `null` when the artifact has never been analysed.
   *  REQUIRED AND EXPLICITLY NULLABLE, not optional: in a Vue prop `undefined`
   *  means ABSENT AND DEFAULTED while `null` means PRESENT AND EMPTY, and those
   *  are two different claims here. */
  analysis: PanelAnalysis | null;
  /** True while the selected row's evidence is being fetched. */
  loading: boolean;
  /** True when the last fetch failed. Distinct from `analysis === null`, which
   *  is a successful read of an unanalysed artifact. */
  failed: boolean;
  /** The evidence excerpt and its byte range, or `null` until Phase 4's
   *  `evidence` table exists. */
  evidence: PanelEvidence | null;
  /** UI-03's source request, or `null` until it is linked. A REQUEST ID handed
   *  to a Caido navigation call — never an `<a href>` built from an extracted
   *  URL (R1). */
  sourceRequestId: string | null;
  /** Perform the retry. Answers a VALUE, never rejects — the client's whole
   *  reason to exist, because Caido surfaces neither a throw nor a rejection. */
  retry: (key: AnalysisKey) => Promise<RpcResult<RetryOutcome>>;
}>();

const emit = defineEmits<{ retried: [ScanState | null]; close: [] }>();

// ---------------------------------------------------------------------------
// THE RETRY'S OWN STATE
// ---------------------------------------------------------------------------

const retrying = ref(false);
const retryFailed = ref(false);

/**
 * The state the backend READ BACK from the row after a successful retry.
 *
 * `null` until one lands, and reset the moment the selection changes. This is
 * the only thing that overrides the state the panel was handed, and it is set
 * ONLY from a persisted read-back — never optimistically from the click. A
 * state the operator is shown that was not persisted is threat T-05-55, and it
 * is the same rule 05-UI-SPEC.md states for triage controls ("the row's badge
 * does not optimistically flip before the write confirms"), applied here
 * because it is the same class of write.
 */
const persistedState = ref<ScanState | null>(null);

watch(
  () => selectedSha256,
  () => {
    persistedState.value = null;
    retryFailed.value = false;
  },
);

const shownState = computed<ScanState | null>(
  () => persistedState.value ?? analysis?.scanState ?? null,
);

const presentation = computed(() =>
  shownState.value === null ? null : SCAN_STATE_PRESENTATION[shownState.value],
);

const isFailedAnalysis = computed(() => shownState.value === "failed");
const isDegraded = computed(
  () => shownState.value !== null && isDegradedScanState(shownState.value),
);

/** The retry is offered for exactly the states the backend's guard will move.
 *  Offering it on a complete analysis would teach the operator that the
 *  affordance does nothing, which is the same argument the partial banner's
 *  narrowing action makes for hiding itself. */
const canRetry = computed(() => isDegraded.value && analysis !== null);

async function reAnalyse(): Promise<void> {
  // THE DOUBLE-SUBMIT GUARD IS HERE AND NOT ONLY ON THE `disabled` ATTRIBUTE.
  // A disabled attribute is a rendering; a second click that arrives in the
  // same tick, or through a keyboard activation the browser dispatches before
  // the re-render, would still reach this handler.
  if (retrying.value) return;
  if (analysis === null) return;

  retrying.value = true;
  retryFailed.value = false;
  try {
    const result = await retry({
      projectId,
      sha256: analysis.sha256,
      detectorSetHash: analysis.detectorSetHash,
    });
    // TWO FAILURE SHAPES, ONE OUTCOME ON SCREEN. `result.ok === false` is the
    // call not landing; `value.ok === false` is the backend not attempting the
    // write. Neither may move the state text, and neither is reported as a
    // decline the guard made.
    if (!result.ok || !result.value.ok) {
      retryFailed.value = true;
      return;
    }
    persistedState.value = result.value.state;
    emit("retried", result.value.state);
  } finally {
    retrying.value = false;
  }
}

// ---------------------------------------------------------------------------
// THE FRAME
// ---------------------------------------------------------------------------

/** Which screen the panel BODY is showing. ONE COMPUTED, not a `v-else-if`
 *  chain, for the reason `InventoryTable.vue` gives: a chain admits the reading
 *  where two branches are both live. */
type PanelView = "unselected" | "loading" | "failed" | "unanalysed" | "frame";

const view = computed<PanelView>(() => {
  if (selectedSha256 === null) return "unselected";
  if (loading) return "loading";
  if (failed) return "failed";
  if (analysis === null) return "unanalysed";
  return "frame";
});

/** Skeleton lines, at the panel's own fixed height rather than a spinner. */
const SKELETON_LINES = Object.freeze([0, 1, 2, 3, 4, 5]);

const degradedLine = computed<string>(() =>
  degradedMarker(
    analysis?.bytesWalked ?? null,
    analysis?.byteLen ?? null,
    UNCLASSIFIED_ANALYSIS_FAILURE_REASON,
  ),
);

const failureLine = computed<string>(() =>
  failureDetail(UNCLASSIFIED_ANALYSIS_FAILURE_REASON),
);

/**
 * The evidence excerpt, through the PANEL display path at the panel cap.
 *
 * `forPanel`, never `forCell`: R2 step 1 has exactly one stated exception and
 * it is this surface — a control character is REMOVED from a cell and shown as
 * a visible escape here. The cap is bound in the function name, so this call
 * site cannot reach for the cell's 256 by mistyping.
 */
const displayed = computed(() =>
  evidence === null ? null : forPanel(evidence.value),
);

/** GRAPHEMES, in the frontend's length space. */
const truncation = computed<string | undefined>(() =>
  displayed.value === null ? undefined : truncationNotice(displayed.value),
);

/** BYTES, in the BACKEND's length space, from the integers it supplied beside
 *  the value. Never derived from the display text — see `display.ts`'s own
 *  note, and decision P5-D26 which this pays. */
const byteRange = computed<string>(() =>
  evidence === null
    ? BYTE_RANGE_PENDING
    : byteRangeNotice(evidence.byteRange, evidence.byteTotal),
);

const sourceRequestLine = computed<string>(() =>
  sourceRequestId === null
    ? SOURCE_REQUEST_PENDING
    : `Source request: ${sourceRequestId}`,
);

// THERE IS NO TOP-LEVEL COMMENT INSIDE THE `<template>` BELOW. A comment there
// is a NODE: it would make this component a FRAGMENT, `wrapper.element` would
// resolve to the mount container rather than to the section, and every class
// assertion in the spec would read `[]`. Measured twice already in this phase
// — StatusBadge.vue, PartialBanner.vue and safety/HighlightSlices.vue each
// record the same trap.
</script>

<template>
  <section
    id="defminer-evidence-panel"
    :class="[
      EVIDENCE_PANEL_HEIGHT_CLASS,
      'flex shrink-0 flex-col border-l border-surface-600 pl-4',
    ]"
    :aria-label="EVIDENCE_HEADING"
    aria-live="polite"
  >
    <div class="flex shrink-0 items-center justify-between">
      <h2 class="text-xs font-semibold">{{ EVIDENCE_HEADING }}</h2>
      <button
        v-if="selectedSha256 !== null"
        id="defminer-evidence-close"
        type="button"
        :class="[
          FOCUS_RING_CLASS,
          'text-xs font-semibold text-surface-400 underline',
        ]"
        @click="emit('close')"
      >
        {{ CLOSE_LABEL }}
      </button>
    </div>

    <!-- THE SCROLL CONTAINER. The overflow rule is a property of the panel's
         own layout, not of any value it renders: it holds for an empty panel
         and for a 4 MiB one alike, and it is what keeps the page height
         unchanged. -->
    <div
      id="defminer-evidence-body"
      class="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-2 text-xs"
    >
      <p v-if="view === 'unselected'" class="text-surface-400">
        {{ NO_SELECTION_BODY }}
      </p>

      <!-- LOADING — skeleton lines, never a spinner, inside a region that has
           already claimed its height. -->
      <div v-else-if="view === 'loading'" id="defminer-evidence-skeleton">
        <p class="text-surface-400">{{ LOADING_LABEL }}</p>
        <div
          v-for="line in SKELETON_LINES"
          :key="line"
          class="mt-2 h-4 bg-surface-700"
        ></div>
      </div>

      <p v-else-if="view === 'failed'" class="text-danger-500">
        {{ LOAD_FAILED_BODY }}
      </p>

      <p v-else-if="view === 'unanalysed'" class="text-surface-400">
        {{ NEVER_ANALYSED_BODY }}
      </p>

      <template v-else>
        <!-- THE STATE, IN WORDS. The distinction between a clean result and a
             failed one is stated in words and is NEVER left to a badge colour;
             the tone is reinforcement. -->
        <p id="defminer-evidence-state">
          <span
            v-if="presentation !== null"
            :class="[presentation.toneClass, 'font-semibold']"
            >{{ presentation.label }}</span
          >
        </p>

        <!-- ERR-04. The full sentence, with the action beside it. -->
        <template v-if="isFailedAnalysis">
          <p id="defminer-evidence-failure" class="text-danger-500">
            {{ failureLine }}
          </p>
        </template>

        <!-- UI-09's per-artifact line. Both counts are integers the backend
             measured; neither is derived from the other. -->
        <p
          v-if="isDegraded"
          id="defminer-evidence-degraded"
          class="text-info-500"
        >
          {{ degradedLine }}
        </p>

        <button
          v-if="canRetry"
          id="defminer-evidence-retry"
          type="button"
          :disabled="retrying"
          :class="[
            FOCUS_RING_CLASS,
            'border border-surface-600 px-2 py-1 text-xs font-semibold disabled:text-surface-400',
          ]"
          @click="void reAnalyse()"
        >
          {{ retrying ? RE_ANALYSING_LABEL : RE_ANALYSE_LABEL }}
        </button>

        <p
          v-if="retryFailed"
          id="defminer-evidence-retry-failure"
          class="text-danger-500"
        >
          {{ RETRY_FAILED_BODY }}
        </p>

        <!-- UI-03's artifact version. TARGET-DERIVED, therefore MONO: the rule
             is about an operator's ability to tell two near-identical strings
             apart, not about whether a value is trusted. -->
        <p id="defminer-artifact-version">
          <span class="text-surface-400">{{ ARTIFACT_VERSION_LABEL }}</span>
          <span class="ml-2 whitespace-pre font-mono">{{
            analysis?.detectorSetHash
          }}</span>
        </p>

        <p id="defminer-evidence-source-request" class="text-surface-400">
          {{ sourceRequestLine }}
        </p>

        <p id="defminer-evidence-byte-range" class="text-surface-400">
          {{ byteRange }}
        </p>

        <p v-if="displayed === null" class="text-surface-400">
          {{ SNIPPET_PENDING }}
        </p>
        <template v-else>
          <!-- TEXT, NEVER MARKUP (R1). The value is interpolated as a text
               node after the panel display path has applied R2; there is no
               `v-html` in this package and lint bans it as an error with no
               per-line disable. -->
          <p
            id="defminer-evidence-snippet"
            class="whitespace-pre-wrap break-all font-mono"
          >
            {{ displayed.text }}
          </p>
          <p
            v-if="truncation !== undefined"
            id="defminer-evidence-truncation"
            class="text-surface-400"
          >
            {{ truncation }}
          </p>
        </template>

        <p id="defminer-evidence-score" class="text-surface-400">
          {{ SCORE_PENDING }}
        </p>
      </template>
    </div>
  </section>
</template>
