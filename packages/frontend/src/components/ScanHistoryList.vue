<script setup lang="ts">
// packages/frontend/src/components/ScanHistoryList.vue — this project's scans,
// newest first, with the per-scan detail inline under the row (FIND-04, D-13).
//
// ===========================================================================
// IT DOES NOT REUSE THE SHIPPED TABLE CONTRACT, AND THE DECIDING FACT IS
// MECHANICAL RATHER THAN AESTHETIC
// ===========================================================================
// `table-contract.ts`'s `assertColumnContract` throws unless EXACTLY ONE column
// is target-controlled. Its own message says why, and it is quoted here rather
// than paraphrased so a reader does not have to go and find it:
//
//   "05-UI-SPEC.md § \"Table contract\" binds EXACTLY ONE target-controlled
//    column per table … zero means the column that carries the host's bytes is
//    not being routed through safety/display.ts at all."
//
// THIS LIST HAS ZERO. Lifecycle state, the counters, the position date and the
// operator's own HTTPQL clause are all DefMiner-authored or operator-authored;
// not one byte on this surface came off the wire from a possibly hostile host.
// The shipped contract is literally incapable of expressing this table, and
// marking a column `targetControlled: true` to get past the assertion would be
// LYING TO A GATE — it would also make that gate's message false the next time
// somebody read it looking for the column that carries a host's bytes.
//
// So this is an AUTHORED LIST in `HealthPanel.vue`'s idiom, and
// `05-UI-SPEC.md`'s amendment A4 records the scoping in the upstream contract
// so the next author does not rediscover it the wrong way.
//
// ===========================================================================
// AND IT IS NOT VIRTUALISED, WHICH IS THE SAME DECISION SEEN FROM THE OTHER END
// ===========================================================================
// The per-scan detail is an INLINE DISCLOSURE UNDER THE SELECTED ROW, which is
// a VARIABLE ROW HEIGHT — the one thing `RecycleScroller`'s fast path forbids
// (U6-5), and the reason `table-contract.ts`'s `CELL_CLASS` carries
// `whitespace-pre overflow-hidden` on every cell of the tables that DO use it.
// The set is also bounded by construction: one scan at a time, rows aged out by
// normal retention, and the read itself capped. A virtualised scroller over
// tens of rows is cost with no benefit.
//
// NOT SORTABLE EITHER, and that is not the shipped ban applied by habit. The
// shipped ban exists because sorting a 2,000-row resident window would sort a
// SUBSET and present it as the whole set; here the resident set IS the whole
// set, so that defect cannot occur. The list is nonetheless not sortable at all,
// because a scan history's only meaningful order is chronological and a sort
// control would be a control with nothing to buy.
//
// ===========================================================================
// WHAT IS INHERITED, AND NONE OF IT IS OPTIONAL
// ===========================================================================
//   * `FOCUS_RING_CLASS` on every interactive element.
//   * `groupThousands` and `counted` for every number and every singular/plural
//     agreement. Never a parenthesised plural suffix.
//   * The no-icon rule, and the absent icon library behind it.
//   * `font-mono` PLUS SANITISATION on the operator's clause — `forCellText` at
//     the table-cell cap in a row, `forPanel` at the evidence-panel cap in the
//     disclosure. Never a `title`, never a tooltip, never a `data-*` carrying
//     it; per-row hooks are `id`s.
//   * THE STATE DISCIPLINE: skeleton rows rather than a spinner while loading,
//     and AN EXPLICIT ERROR RATHER THAN AN EMPTY LIST on a failed load.
//
// THAT LAST ONE CARRIES THE SUPPRESSIONS-LIST ARGUMENT VERBATIM, and it is the
// most important line in this file: an empty scan history means "you have never
// run a scan", so rendering a load failure that way tells the operator THE
// OPPOSITE OF THE TRUTH — and a suspended scan they cannot see is a resumable
// cursor they will never resume.
//
// ===========================================================================
// A ROW IS NEVER HIDDEN BECAUSE PART OF IT IS MISSING
// ===========================================================================
// A scan that resolved no page renders with NO position element rather than a
// placeholder date. A discarded row states that its position is gone. A
// suspended row states its reason and what resuming would continue from. In
// every case the row still renders, because the alternative — dropping a row
// whose position is unknown — hides exactly the rows an operator is looking for.

import { computed, ref } from "vue";

import type { RpcResult, ScanHistoryRow } from "../api/client";
import { forCellText, forPanel } from "../safety/display";

import type { ScanHistoryCounterField } from "./scan-contract";
import {
  counterText,
  dateOnlyText,
  resumePositionClause,
  SCAN_CLAUSE_CLASS,
  SCAN_HISTORY_CLAUSE_LABEL,
  SCAN_HISTORY_COMPOSED_ABSENT_BODY,
  SCAN_HISTORY_COUNTERS,
  SCAN_HISTORY_DETAIL_HEADING,
  SCAN_HISTORY_DISCARDED_POSITION_BODY,
  SCAN_HISTORY_EMPTY_BODY,
  SCAN_HISTORY_EMPTY_HEADING,
  SCAN_HISTORY_FAILED_BODY,
  SCAN_HISTORY_HEADING,
  SCAN_HISTORY_HIDE_DETAIL_LABEL,
  SCAN_HISTORY_LIMIT,
  SCAN_HISTORY_LOADING_LABEL,
  SCAN_HISTORY_NO_CLAUSE_BODY,
  SCAN_HISTORY_REACHED_PREFIX,
  SCAN_HISTORY_SEEN_SUFFIX,
  SCAN_HISTORY_SHOW_DETAIL_LABEL,
  SCAN_HISTORY_SKELETON_ROWS,
  SCAN_OPEN_HEALTH_LABEL,
  SCAN_RETRY_LABEL,
  SCAN_SUSPEND_COPY,
  scanHistoryDetailId,
  scanHistoryRowId,
  scanHistoryToggleId,
  scanHistoryTruncatedLine,
} from "./scan-contract";
import ScanLifecycleBadge from "./ScanLifecycleBadge.vue";
import {
  FOCUS_RING_CLASS,
  groupThousands,
  ROW_HEIGHT_CLASS,
} from "./table-contract";

const { load } = defineProps<{
  /** Read this project's history. Answers a VALUE on every path — a component
   *  that had to catch would be a component whose failure Caido swallows, and
   *  the failure here is the one that must never be rendered as emptiness.
   *
   *  IT TAKES THE BOUND rather than closing over one: the surface names the
   *  number it wants and the backend clamps it down, so there is exactly one
   *  declaration of the bound and the surface knows which one was applied. */
  load: (limit: number) => Promise<RpcResult<readonly ScanHistoryRow[]>>;
}>();

/** Routing is the WORKSPACE'S. The failure copy names Health; this component
 *  emits rather than navigating, so the tab set keeps exactly one owner. */
const emit = defineEmits<{
  (event: "open-health"): void;
}>();

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------

const rows = ref<readonly ScanHistoryRow[]>([]);
const failed = ref(false);
const reading = ref(false);

/**
 * Whether a read has ever come back.
 *
 * SEPARATE FROM `reading`, for the reason `HealthPanel.vue` states beside its
 * own pair: "a read is open" and "no read has ever completed" are different
 * claims and the template needs both. The skeleton rows belong to the second,
 * and after the first answer they must never reappear — a retry that blanked
 * the rows it is retrying would take the operator's suspended scan off the
 * screen at the moment they went looking for it.
 */
const settled = ref(false);

/** Which row's disclosure is open, by index. ONE AT A TIME: two open
 *  disclosures in a list whose rows are otherwise one line is a list the
 *  operator has to scroll to compare, which is the thing the inline shape was
 *  chosen to avoid. */
const openIndex = ref<number | null>(null);

async function read(): Promise<void> {
  reading.value = true;
  const result = await load(SCAN_HISTORY_LIMIT);
  reading.value = false;
  settled.value = true;

  if (!result.ok) {
    // THE ROWS ARE NOT CLEARED. A failed retry after a successful read must not
    // replace what is on screen with an empty list — see the failure copy: this
    // list is not empty, DefMiner could not read it.
    failed.value = true;
    return;
  }
  failed.value = false;
  rows.value = result.value;
}

void read();

/** The retry action's only caller. THE DOUBLE-SUBMIT GUARD IS AT THE HANDLER
 *  and not only on the `disabled` attribute — the attribute is what the
 *  operator sees; this is what holds when anything else calls in. */
function onRetry(): void {
  if (reading.value) return;
  void read();
}

function toggle(index: number): void {
  openIndex.value = openIndex.value === index ? null : index;
}

// ---------------------------------------------------------------------------
// DERIVED
// ---------------------------------------------------------------------------

const showRows = computed<boolean>(
  () => settled.value && !failed.value && rows.value.length > 0,
);

const showEmpty = computed<boolean>(
  () => settled.value && !failed.value && rows.value.length === 0,
);

/**
 * Whether the set was CUT, and therefore whether the sentence renders.
 *
 * `>=` RATHER THAN `===`, deliberately: the backend clamps the requested limit
 * DOWN, so a returned count can never exceed what was asked for — but a future
 * caller passing a larger number would get the backend's own ceiling instead,
 * and a strict equality would then silently stop saying that the set was cut.
 */
const truncated = computed<boolean>(
  () => rows.value.length >= SCAN_HISTORY_LIMIT,
);

const skeletonRows = computed<number[]>(() =>
  Array.from({ length: SCAN_HISTORY_SKELETON_ROWS }, (_v, i) => i),
);

function seenText(row: ScanHistoryRow): string {
  return `${groupThousands(row.seen)} ${SCAN_HISTORY_SEEN_SUFFIX}`;
}

/** `null` when the scan resolved no page — ABSENT, never a placeholder date and
 *  never the epoch. The row still renders. */
function reachedText(row: ScanHistoryRow): string | null {
  const day = dateOnlyText(row.lastCreatedAt);
  return day === null ? null : `${SCAN_HISTORY_REACHED_PREFIX} ${day}`;
}

/** The row's clause, at the TABLE-CELL cap. */
function cellClause(row: ScanHistoryRow): string {
  return forCellText(row.operatorFilter);
}

/** The disclosure's clause, at the EVIDENCE-PANEL cap. TWO CAPS AND TWO CALL
 *  SITES, bound in the helper names rather than passed as a number, which is
 *  what stops a 2,048-character panel cap leaking into a row. */
function panelClause(row: ScanHistoryRow): string {
  return forPanel(row.operatorFilter).text;
}

/** Why it stopped, when it is stopped and the reason is on the row. The
 *  eviction sentence names no cap here: this surface cannot read the retention
 *  bound, and a fabricated figure on the one mechanism that deletes the
 *  operator's history would be worse than the missing clause. */
function suspensionBody(row: ScanHistoryRow): string | null {
  if (row.suspendReason === null) return null;
  return SCAN_SUSPEND_COPY[row.suspendReason]({
    at: row.finishedAt,
    rowCap: null,
  });
}

function resumeClause(row: ScanHistoryRow): string | null {
  return resumePositionClause(row.lastCreatedAt);
}

/**
 * One counter's rendered value.
 *
 * `row[id]` WITH NO CAST AND NO FALLBACK, and that is the point of declaring
 * {@link ScanHistoryCounterField} as a mapped type over the row rather than as
 * a hand-written union: every member of it is a `number` ON THIS SHAPE, so the
 * index is a type-level fact. A field renamed on the projection drops out of
 * the union and the counter list stops compiling, where a `Record<string,
 * number>` cast would have rendered a blank cell instead.
 */
function counterValue(
  row: ScanHistoryRow,
  id: ScanHistoryCounterField,
): string {
  return counterText(row[id]);
}

function toggleLabel(index: number): string {
  return openIndex.value === index
    ? SCAN_HISTORY_HIDE_DETAIL_LABEL
    : SCAN_HISTORY_SHOW_DETAIL_LABEL;
}

/** The interactive elements' shared signature, matching the shipped surface
 *  buttons byte for byte. No accent: 05-UI-SPEC.md reserves it to five
 *  elements and none of them is here. */
const BUTTON_CLASS =
  "border border-surface-600 px-2 py-1 text-xs font-semibold";

// NO COMMENT AT THE TOP OF THE `<template>`: a comment there is a NODE, which
// makes the component a fragment and leaves every root-class assertion reading
// `[]` — the trap `StatusBadge.vue` and `safety/HighlightSlices.vue` both
// record.
</script>

<template>
  <section class="flex flex-col gap-2" data-defminer-scan-history>
    <h3 class="text-xs font-semibold">{{ SCAN_HISTORY_HEADING }}</h3>

    <!-- LOADING — SKELETON ROWS AND NEVER A SPINNER, matching the shipped
         inventory tables. A spinner reflows the list when it resolves, and
         there is no element with a spinner role anywhere below. -->
    <div
      v-if="!settled"
      class="flex flex-col gap-1"
      data-defminer-scan-history-loading
    >
      <p class="text-surface-400">{{ SCAN_HISTORY_LOADING_LABEL }}</p>
      <div
        v-for="index in skeletonRows"
        :key="`skeleton-${index}`"
        :class="[ROW_HEIGHT_CLASS, 'bg-surface-700']"
        data-defminer-scan-history-skeleton
      ></div>
    </div>

    <!-- A FAILED LOAD, AND IT IS A DIFFERENT SCREEN FROM AN EMPTY ONE. The two
         are distinguishable by their text alone, which is what a spec can hold
         and what an operator actually reads. -->
    <div
      v-else-if="failed"
      class="flex flex-col gap-2 border border-danger-500 px-2 py-1 text-danger-500"
      role="alert"
      data-defminer-scan-history-failed
    >
      <p>{{ SCAN_HISTORY_FAILED_BODY }}</p>
      <div class="flex gap-2">
        <button
          id="defminer-scan-history-retry"
          type="button"
          :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
          :disabled="reading"
          @click="onRetry"
        >
          {{ SCAN_RETRY_LABEL }}
        </button>
        <button
          id="defminer-scan-history-health"
          type="button"
          :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
          @click="emit('open-health')"
        >
          {{ SCAN_OPEN_HEALTH_LABEL }}
        </button>
      </div>
    </div>

    <!-- NO SCANS YET — the operator has never run one, and the body says what
         a retroactive scan is for rather than leaving a blank region. -->
    <div
      v-else-if="showEmpty"
      class="flex flex-col gap-1 border border-surface-600 px-2 py-1"
      role="status"
      data-defminer-scan-history-empty
    >
      <p class="text-xs font-semibold">{{ SCAN_HISTORY_EMPTY_HEADING }}</p>
      <p class="text-surface-400">{{ SCAN_HISTORY_EMPTY_BODY }}</p>
    </div>

    <!-- NEWEST FIRST, IN THE ORDER THE READ RETURNED THEM. This component does
         not re-sort: the backend's ORDER BY pins every suspended scan in and
         breaks every tie deterministically, and a second ordering here would be
         a second answer to a question with one authority. -->
    <div
      v-else-if="showRows"
      class="flex flex-col gap-2"
      data-defminer-scan-history-rows
    >
      <div
        v-for="(row, index) in rows"
        :id="scanHistoryRowId(index)"
        :key="row.scanId"
        class="flex flex-col gap-1 border-b border-surface-600 pb-2"
      >
        <div class="flex flex-wrap items-center gap-2">
          <ScanLifecycleBadge :state="row.state" />
          <span class="whitespace-pre text-xs text-surface-400"
            >· {{ seenText(row) }}</span
          >
          <span
            v-if="reachedText(row) !== null"
            class="whitespace-pre text-xs text-surface-400"
            >· {{ reachedText(row) }}</span
          >
          <button
            :id="scanHistoryToggleId(index)"
            type="button"
            :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
            :aria-expanded="openIndex === index"
            :aria-controls="scanHistoryDetailId(index)"
            @click="toggle(index)"
          >
            {{ toggleLabel(index) }}
          </button>
        </div>

        <!-- THE OPERATOR'S CLAUSE, AT THE CELL CAP, IN ITS OWN ELEMENT. Never
             inside a sentence, never in a `title` and never in a `data-*`. -->
        <p
          v-if="row.operatorFilter !== ''"
          :class="SCAN_CLAUSE_CLASS"
          data-defminer-scan-history-clause
        >
          {{ cellClause(row) }}
        </p>

        <p v-if="row.state === 'discarded'" class="text-surface-400">
          {{ SCAN_HISTORY_DISCARDED_POSITION_BODY }}
        </p>

        <!-- A SUSPENDED ROW STATES ITS REASON AND WHAT RESUMING CONTINUES
             FROM. `info`, never `danger`: nothing failed. -->
        <p
          v-if="row.state === 'suspended' && suspensionBody(row) !== null"
          class="text-info-500"
        >
          {{ suspensionBody(row) }}
        </p>
        <p
          v-if="row.state === 'suspended' && resumeClause(row) !== null"
          class="text-info-500"
        >
          {{ resumeClause(row) }}
        </p>

        <!-- THE INLINE DISCLOSURE. A variable row height, which is why this
             list is not virtualised, and one open at a time. -->
        <div
          v-if="openIndex === index"
          :id="scanHistoryDetailId(index)"
          class="flex flex-col gap-2 border border-surface-600 px-2 py-1"
          data-defminer-scan-history-detail
        >
          <h4 class="text-xs font-semibold">
            {{ SCAN_HISTORY_DETAIL_HEADING }}
          </h4>
          <dl class="flex flex-col gap-1">
            <div
              v-for="counter in SCAN_HISTORY_COUNTERS"
              :key="counter.id"
              class="flex gap-2"
            >
              <dt class="text-xs font-semibold">{{ counter.label }}</dt>
              <dd class="whitespace-pre text-xs">
                {{ counterValue(row, counter.id) }}
              </dd>
            </div>
          </dl>
          <p class="text-xs font-semibold">{{ SCAN_HISTORY_CLAUSE_LABEL }}</p>
          <p
            v-if="row.operatorFilter !== ''"
            :class="SCAN_CLAUSE_CLASS"
            data-defminer-scan-history-detail-clause
          >
            {{ panelClause(row) }}
          </p>
          <p v-else class="text-surface-400">
            {{ SCAN_HISTORY_NO_CLAUSE_BODY }}
          </p>
          <p class="text-surface-400">
            {{ SCAN_HISTORY_COMPOSED_ABSENT_BODY }}
          </p>
        </div>
      </div>

      <!-- THE TRUNCATION, SAID IN WORDS. Never a silent cut: an operator who
           counts fifty rows has no way to know their suspended scan is not the
           fifty-first, and the sentence is what tells them it is not. -->
      <p
        v-if="truncated"
        class="text-surface-400"
        data-defminer-scan-history-truncated
      >
        {{ scanHistoryTruncatedLine(rows.length) }}
      </p>
    </div>
  </section>
</template>
