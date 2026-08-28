<script setup lang="ts">
// packages/frontend/src/components/PartialBanner.vue — UI-09's view-level floor
// statement.
//
// ===========================================================================
// WHAT THIS BANNER IS ACTUALLY FOR
// ===========================================================================
// An aggregate presented as a total when a contributing artifact stopped early
// is a FALSE CLAIM THE OPERATOR ACTS ON (threat T-05-46). The per-row Partial
// badge marks the row; it does not mark the NUMBER at the top of the view, and
// an operator reading "412 secrets" has no way to know that 9 of the artifacts
// behind it were never fully walked. This banner is the sentence that closes
// that gap, and it says "floor, not a total" in words rather than leaving it to
// a badge colour.
//
// THE BANNER AND THE PER-ROW BADGE ARE INDEPENDENT, DELIBERATELY. A single
// degraded row in an otherwise complete view is still marked at the row even
// while the banner is showing, and a row is never un-marked because the banner
// is present. Two mechanisms at two altitudes; neither is the other's summary.
//
// ===========================================================================
// FLAG F3 — THE BANNER/COUNT COLOUR PRECEDENCE, STATED RATHER THAN REDISCOVERED
// ===========================================================================
// 05-UI-SPEC.md § "Checker Sign-Off" F3 records the conflict: § "Color" lists
// the partial-view banner under `info-500` (semantic: degradation) AND lists
// "the count in the partial-view banner when it includes failed artifacts"
// under `danger-500` (destructive use #4). Both are true of the same banner.
//
// THE PRECEDENCE, RESOLVED HERE: THEY ARE TWO ELEMENTS WITH TWO RULES.
//   * BANNER CHROME — the border and the sentence — is ALWAYS `info`. The
//     banner's subject is degradation, which is the `info` semantic.
//   * THE COUNT INSIDE IT takes `danger` WHEN AND ONLY WHEN the affected set
//     includes a `failed` artifact, because `failed` means NOTHING WAS
//     INSPECTED — which is categorically different from "stopped early" and is
//     the one case where the number is not merely a floor but may be a floor
//     over an empty inspection.
// A banner over `partial`-only artifacts is `info` throughout. The rule is in
// the markup below and asserted by FindingsTable.spec.ts, so it cannot be
// re-litigated from the two contract rows alone.

import { computed } from "vue";

import { counted, FOCUS_RING_CLASS } from "./table-contract";

const { affected, total, includesFailed, canNarrow } = defineProps<{
  /** Contributing artifacts in a degraded terminal state (partial or failed). */
  affected: number;
  /** Contributing artifacts in total. */
  total: number;
  /** True when at least one of the affected artifacts is `failed`. */
  includesFailed: boolean;
  /**
   * Whether a narrowing filter exists for this table.
   *
   * The action is offered only when it can actually narrow. 05-UI-SPEC.md's
   * page request carries AT MOST ONE column filter — a type-level bound, not a
   * convention, because the backend's statement matrix is enumerated literally
   * — so narrowing requires a scan-state filter column that the shipped
   * `artifacts`/`observations` statements do not yet have. Rendering a button
   * that cannot change the list would be worse than rendering none: it teaches
   * the operator that the affordance does nothing.
   */
  canNarrow: boolean;
}>();

const emit = defineEmits<{ "show-only-affected": [] }>();

/**
 * 05-UI-SPEC.md § "Copywriting Contract", verbatim, with both counts in
 * agreement — "1 artifact", "9 artifacts", never "1 artifact(s)".
 *
 * DefMiner-authored end to end. The only interpolations are integers; no
 * target-controlled string appears in this sentence or in any other on the
 * page.
 */
const message = computed<string>(
  () =>
    `Partial view — ${String(affected)} of ${counted(total, "artifact", "artifacts")} on this target are Partial or Failed. The counts below are a floor, not a total.`,
);

const SHOW_ONLY_AFFECTED_LABEL = "Show only affected artifacts";

// THE TEMPLATE'S ROOT `<div>` IS THE CHROME, and the chrome is always `info` —
// see the FLAG F3 resolution above. There is NO top-level comment inside the
// `<template>`: a comment there is a node, which makes the component a fragment
// and leaves every root-class assertion reading `[]` (the trap
// safety/HighlightSlices.vue records, measured again this session).
</script>

<template>
  <div
    class="flex items-center gap-2 border border-info-500 px-2 py-1 text-xs"
    role="status"
    data-defminer-partial-banner
  >
    <!-- THE COUNT: `danger` only when the affected set includes a `failed`
         artifact, because `failed` means nothing was inspected at all. -->
    <span
      :class="[
        includesFailed ? 'text-danger-500' : 'text-info-500',
        'font-semibold whitespace-pre',
      ]"
      data-defminer-partial-count
      >{{ affected }}</span
    >
    <span class="text-info-500">{{ message }}</span>
    <!-- A TEXT LABEL, never an icon. -->
    <button
      v-if="canNarrow"
      type="button"
      :class="[
        FOCUS_RING_CLASS,
        'border border-surface-600 px-2 py-1 text-xs font-semibold',
      ]"
      @click="emit('show-only-affected')"
    >
      {{ SHOW_ONLY_AFFECTED_LABEL }}
    </button>
  </div>
</template>
