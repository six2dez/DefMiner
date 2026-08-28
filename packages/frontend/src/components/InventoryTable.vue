<script setup lang="ts" generic="TRow">
// packages/frontend/src/components/InventoryTable.vue — the ONE table shell,
// carrying every state 05-UI-SPEC.md enumerates for `findings-table`.
//
// ===========================================================================
// ONE SHELL, TWO TABLES, AND WHY THAT IS THE DESIGN AND NOT A CONVENIENCE
// ===========================================================================
// Five of the design contract's `findings-table` rows are STATE rows — empty,
// filtered-empty, loading, error, populated — and each one has a defect it
// exists to prevent. Two tables implementing them separately is two chances to
// get the empty/filtered-empty distinction wrong, and the operator who sees a
// generic empty state over a filtered list cannot tell whether the tool found
// nothing or their own filter hid everything. So the states live HERE, once,
// and a concrete table contributes a column list and a store handle.
//
// ===========================================================================
// THE FIXED ROW HEIGHT IS THE LOAD-BEARING NUMBER ON THIS SURFACE
// ===========================================================================
// `RecycleScroller` needs a fixed `item-size` to compute scroll geometry.
// A variable row height — which is what happens the moment a cell is allowed to
// wrap — degrades it to `DynamicScroller` and costs the 10,000-row
// responsiveness target outright. That is why every cell renders with
// pre-formatted whitespace and hidden overflow, why the target-controlled cell
// is truncated at the 256-grapheme cap, and why truncation here is mandatory
// rather than cosmetic. One number (`TABLE_ROW_HEIGHT_PX`), three uses: the
// scroller's item size, the skeleton row, and the row itself through
// `ROW_HEIGHT_CLASS`, which is a LOOKUP keyed by that number rather than a
// second copy of it.
//
// ===========================================================================
// ACCESSIBILITY IS CONTRACT HERE, NOT POLISH
// ===========================================================================
// `aria-rowcount` IS THE REACHABLE TOTAL, NEVER THE RESIDENT COUNT. The store
// holds at most 2,000 rows out of a set that can be ten thousand; announcing
// 2,000 on a 10,000-row table tells assistive technology something false, which
// 05-UI-SPEC.md § "Visual Hierarchy" calls out by name. `aria-rowindex` is
// likewise 1-based over the whole set, not over the window.
//
// Every interactive element carries a TEXT label and the accent focus ring.
// There is no icon-only affordance anywhere in this file — a 10,000-row triage
// surface is a keyboard surface, and DefMiner ships no icon package at all.
//
// ===========================================================================
// THE ACCENT BUDGET, SPENT EXACTLY TWICE
// ===========================================================================
// 05-UI-SPEC.md § "Color" reserves the accent for five elements and gives an
// explicit not-list: no sort indicator, no filter chip, no row hover, no header.
// This component spends two of the five — the focus ring and the selected-row
// left-edge bar — and nothing else in it is `primary`-toned. Both are named
// constants in table-contract.ts so a spec can COUNT them rather than read for
// them.

import type { PageRequest } from "@defminer/engine/contract";
import { computed } from "vue";
import { RecycleScroller } from "vue-virtual-scroller";

import { RPC_ERROR_STATE_BODY } from "../api/client";
import { forCellText, TABLE_ROW_HEIGHT_PX } from "../safety/display";
import HighlightSlices from "../safety/HighlightSlices.vue";
import type { InventoryStore } from "../stores/inventory";
import { KEYSET_PAGE_ROWS } from "../stores/inventory";

import type { ColumnDefinition } from "./table-contract";
import {
  assertColumnContract,
  CELL_CLASS,
  counted,
  FOCUS_RING_CLASS,
  ROW_HEIGHT_CLASS,
  SELECTED_ROW_ACCENT_CLASS,
} from "./table-contract";

// Destructured directly, with Vue 3.5's reactive-props-destructure: the
// compiler rewrites every use back into a property access on the props object,
// so reactivity is preserved. This is what `vue/define-props-destructuring`
// prefers and what `safety/HighlightSlices.vue` already does.
const { label, columns, store, rowKey } = defineProps<{
  /** DefMiner-authored name of the collection, for the grid's accessible name. */
  label: string;
  columns: readonly ColumnDefinition<TRow>[];
  store: InventoryStore<TRow>;
  /** The stable per-row identity the selection and the scroller key on. */
  rowKey: (row: TRow) => string;
}>();

// `Open Health` is the SHELL'S to ASK FOR and the PAGE'S to PERFORM. The tab
// strip lives in App.vue; a table that reached up and switched tabs itself would
// be a component writing to a sibling's state.
const emit = defineEmits<{ "open-health": [] }>();

/**
 * The column contract, enforced by the SHELL rather than by each table.
 *
 * Checked here and not in the concrete tables because a check a caller has to
 * remember to call is a check the third table will not call. Throwing during
 * setup is deliberate: 05-UI-SPEC.md § "Table contract" binds EXACTLY ONE
 * target-controlled column per table, and a second one added without R1/R2
 * applied is threat T-05-15 — a defect that renders perfectly and is invisible
 * until a hostile value arrives.
 */
assertColumnContract(label, columns);

// ---------------------------------------------------------------------------
// COPY — 05-UI-SPEC.md § "Copywriting Contract", VERBATIM
// ---------------------------------------------------------------------------
// Every string below is the approved wording. The rule that outranks the whole
// copy table applies to all of them: NO SENTENCE HERE INTERPOLATES A
// TARGET-CONTROLLED STRING. The only interpolations are integers.

const EMPTY_HEADING = "Nothing analysed on this target yet";
const EMPTY_BODY =
  "DefMiner analyses JavaScript as you browse, in the background. Browse the " +
  "target with the Caido proxy running and assets appear here as they are " +
  "analysed. DefMiner sends nothing to the target to do this.";

const FILTERED_EMPTY_HEADING = "No secrets match these filters";
const CLEAR_FILTERS_LABEL = "Clear all filters";

/** The error body, IMPORTED rather than restated: it carries the ten-second
 *  figure derived from the client's own timeout, so the copy cannot promise a
 *  duration the client does not wait. */
const ERROR_BODY = RPC_ERROR_STATE_BODY;
const RETRY_LABEL = "Retry";
const OPEN_HEALTH_LABEL = "Open Health";

/** The loading label, with its number READ FROM the page-size constant. */
const LOADING_LABEL = `Loading the first ${String(KEYSET_PAGE_ROWS)} rows…`;

// ---------------------------------------------------------------------------
// THE FIVE STATES, AS ONE VALUE
// ---------------------------------------------------------------------------

/**
 * Which screen is showing.
 *
 * ONE COMPUTED, NOT A CHAIN OF `v-else-if`. A chain admits the reading where
 * two branches are both live — which is exactly the defect the store's
 * `LoadState` vocabulary was introduced to remove on the loading/error pair.
 * Making it a single value means "the empty and filtered-empty screens are
 * never the same screen" is a property of the type, and a spec can assert the
 * other heading is ABSENT rather than merely that this one is present.
 */
type View = "failed" | "loading" | "filtered-empty" | "empty" | "populated";

const rows = computed<readonly TRow[]>(() => store.rows.value);
const filter = computed<PageRequest["filter"]>(() => store.filter.value);

const view = computed<View>(() => {
  if (store.loadState.value === "failed") return "failed";
  if (store.loadState.value === "loading" && rows.value.length === 0) {
    return "loading";
  }
  if (rows.value.length > 0) return "populated";
  return filter.value === null ? "empty" : "filtered-empty";
});

/**
 * The number behind the filtered-empty copy.
 *
 * P5-D45, settled by plan 05-07: it counts ROWS THE OPERATOR CAN CURRENTLY
 * REACH, and suppressed rows are outside it. On the two shipped tables there is
 * no suppression mechanism at all, so `hiddenBySuppression` is zero and the
 * second line renders nothing — which is why there is no second line in this
 * file rather than a line that renders "0 hidden".
 */
const reachableTotal = computed<number>(
  () => store.visibleTotal.value?.visible ?? rows.value.length,
);

/**
 * The filtered-empty body, in agreement.
 *
 * The approved copy reads "{total} secrets exist on this target." with a plural
 * noun; the zero-one-many row of the same contract forbids a count that does not
 * agree with its noun and forbids the parenthesised suffix outright. At n = 1
 * agreement wins, because "1 secrets exist" is the defect that rule names.
 */
const filteredEmptyBody = computed<string>(() => {
  const total = reachableTotal.value;
  const verb = total === 1 ? "exists" : "exist";
  return `${counted(total, "secret", "secrets")} ${verb} on this target. Clear the filters to see them all.`;
});

/**
 * The rows as the scroller sees them: the stable key as a FIELD, the row, and
 * the DISPLAY TEXT of every target-controlled cell, precomputed.
 *
 * TWO REASONS, AND THE SECOND ONE IS THE LOAD-BEARING ONE.
 *
 * THE KEY AS A FIELD: `RecycleScroller` keys by property NAME (`key-field`), not
 * by a function, and neither shipped row type has a single column that is unique
 * on its own — an artifact is keyed by (project, digest) and an observation by
 * (project, digest, request). Wrapping is how the row's real identity reaches a
 * component that can only read one field.
 *
 * THE DISPLAY TEXT, PRECOMPUTED: `forCell` is O(n) IN THE RAW VALUE and it has
 * to be. R2 truncates to 256 graphemes but still counts the whole string, so the
 * affordance can say "truncated at 256 OF 4,194,304" — a `total` that stopped at
 * the cap would be a number that is always 256 and means nothing. On a 4 MiB
 * single-line value (hostile fixture case `multi-megabyte-single-line`) that is
 * a four-million-step grapheme walk, and calling it FROM THE TEMPLATE would run
 * it on every re-render of that row — which on a virtualised list is every frame
 * the row is on screen. That is the renderer freeze T-05-47 names, arriving
 * through the mitigation rather than despite it.
 *
 * Computed here, the walk happens ONCE PER WINDOW CHANGE (a page load, a sort, a
 * filter) and never on the scroll path. The cost is bounded by the same 2,000-row
 * window that bounds everything else on this surface, and it is off the frame
 * budget entirely. `tests/frontend-load.spec.ts` is what holds that true: it
 * scrolls ten thousand rows with the hostile values seeded among them and reports
 * the frame times it measured.
 */
type ScrollerItem = {
  __defminerRowKey: string;
  row: TRow;
  /** Display text per target-controlled column id. R2 already applied. */
  display: Readonly<Record<string, string>>;
};

const scrollerItems = computed<ScrollerItem[]>(() =>
  rows.value.map((row) => {
    const display: Record<string, string> = {};
    for (const column of columns) {
      if (column.targetControlled)
        display[column.id] = displayText(column, row);
    }
    return { __defminerRowKey: rowKey(row), row, display };
  }),
);

/** Skeleton placeholders, one per row of the page that is being fetched. */
const skeletonRows = computed<number[]>(() =>
  Array.from({ length: KEYSET_PAGE_ROWS }, (_, index) => index),
);

// ---------------------------------------------------------------------------
// CELLS
// ---------------------------------------------------------------------------

/**
 * A target-controlled cell's DISPLAY text.
 *
 * R2 in one call: control characters stripped, bidi overrides stripped,
 * grapheme-safe truncation at the 256-character cell cap. The cap is bound in
 * the function name rather than passed here, so this call site cannot get it
 * wrong by reaching for the panel's 2,048.
 *
 * `forCellText`, NOT `forCell`. The cell renders 256 graphemes and never renders
 * "Truncated at {shown} of {total} characters" — that affordance is the panel's,
 * and `total` is what forces a walk over the whole value. See `forCellText`'s own
 * note for the numbers `tests/frontend-load.spec.ts` measured when this path paid
 * for a count it does not report.
 */
function displayText(column: ColumnDefinition<TRow>, row: TRow): string {
  return forCellText(column.text(row));
}

/**
 * Display text already computed, keyed by row identity.
 *
 * THE WINDOW MOVES BY ONE PAGE AND KEEPS 1,900 OF ITS 2,000 ROWS. Recomputing
 * all of them on every page load throws away work that has not changed, and on
 * the hostile values it is the expensive kind of work. Pruned to the current
 * window on every recompute, so the cache is bounded by the same 2,000 rows that
 * bound everything else here rather than growing for the life of the session.
 *
 * A PLAIN Map, NOT A REACTIVE ONE. Nothing reads it except the computed below,
 * which already depends on `rows`; making it reactive would add a dependency
 * cycle for no observer.
 */
const displayCache = new Map<string, Readonly<Record<string, string>>>();

// ---------------------------------------------------------------------------
// INTERACTIONS — ALL OF THEM SERVER-SIDE
// ---------------------------------------------------------------------------
// Nothing in this component arranges the resident rows. Changing the sort
// changes what is ASKED FOR: the store discards its window and refetches from
// the first page. Sorting the 2,000-row window would sort a SUBSET and present
// it as the whole set, which is a correctness defect wearing the costume of a
// feature — the store's own header makes the same argument at the other end.

function isSorted(column: ColumnDefinition<TRow>): boolean {
  return column.sortKey !== null && column.sortKey === store.sortKey.value;
}

/** The direction in WORDS. There is no glyph here: colour and shape are never
 *  the sole carrier of meaning, and DefMiner ships no icon package. */
function sortWord(column: ColumnDefinition<TRow>): string {
  if (!isSorted(column)) return "";
  return store.direction.value === "asc" ? "ascending" : "descending";
}

async function toggleSort(column: ColumnDefinition<TRow>): Promise<void> {
  if (column.sortKey === null) return;
  const next =
    isSorted(column) && store.direction.value === "desc" ? "asc" : "desc";
  await store.setSort(column.sortKey, next);
}

async function clearFilters(): Promise<void> {
  await store.setFilter(null);
}

async function retry(): Promise<void> {
  await store.loadFirstPage();
}

function isSelected(row: TRow): boolean {
  return store.selectedRowKey.value === rowKey(row);
}

function openEvidence(row: TRow): void {
  store.selectRow(rowKey(row));
  store.openPanel();
}
</script>

<template>
  <!--
    Colours are the six Caido roles and nothing else; there is no hex literal in
    this file. `surface-400` is the level-4 text tone from the weight order.
  -->
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- ===================================================================
         POPULATED and LOADING both render the table's own shape. The header
         is part of that shape: removing it while rows load would reflow the
         column widths when they arrive, which is the same defect the
         no-spinner rule exists to prevent one element down.
         =================================================================== -->
    <template v-if="view === 'populated' || view === 'loading'">
      <div
        :class="[
          ROW_HEIGHT_CLASS,
          'flex shrink-0 items-center gap-2 border-b border-surface-600 bg-surface-800 px-2 text-xs font-semibold',
        ]"
        role="row"
      >
        <span
          v-for="column in columns"
          :key="column.id"
          :class="[column.widthClass, CELL_CLASS, 'min-w-0']"
          role="columnheader"
          :aria-sort="
            isSorted(column)
              ? store.direction.value === 'asc'
                ? 'ascending'
                : 'descending'
              : 'none'
          "
        >
          <!-- A sortable header is a BUTTON with a text label. No accent: the
               contract's not-list names the sort indicator explicitly. -->
          <button
            v-if="column.sortKey !== null"
            type="button"
            :class="[
              FOCUS_RING_CLASS,
              'text-xs font-semibold text-surface-100 underline',
            ]"
            @click="void toggleSort(column)"
          >
            {{ column.label }}
            <span
              v-if="isSorted(column)"
              class="font-normal text-surface-400"
              >{{ sortWord(column) }}</span
            >
          </button>
          <template v-else>{{ column.label }}</template>
        </span>
      </div>
    </template>

    <!-- ===================================================================
         LOADING — skeleton rows at the fixed height, one per row of the page.
         NEVER A CENTRED SPINNER: a spinner reflows the table when it
         resolves, and there is no element with a spinner role anywhere below.
         =================================================================== -->
    <div v-if="view === 'loading'" class="min-h-0 flex-1 overflow-hidden">
      <p class="px-2 py-1 text-surface-400">{{ LOADING_LABEL }}</p>
      <div
        v-for="index in skeletonRows"
        :key="`skeleton-${index}`"
        :class="[
          ROW_HEIGHT_CLASS,
          'flex items-center gap-2 border-b border-surface-600 px-2',
        ]"
        data-defminer-skeleton-row
      >
        <span
          v-for="column in columns"
          :key="column.id"
          :class="[column.widthClass, CELL_CLASS, 'min-w-0 bg-surface-700']"
          >&nbsp;</span
        >
      </div>
    </div>

    <!-- ===================================================================
         ERROR — the contract's copy, naming the backend's single thread, with
         both actions. A tab is never removed on error and neither is the
         table region: the failure surfaces HERE, in words.
         =================================================================== -->
    <div v-else-if="view === 'failed'" class="py-16">
      <p class="text-danger-500">{{ ERROR_BODY }}</p>
      <div class="mt-4 flex gap-2">
        <button
          type="button"
          :class="[
            FOCUS_RING_CLASS,
            'border border-surface-600 px-2 py-1 text-xs font-semibold',
          ]"
          @click="void retry()"
        >
          {{ RETRY_LABEL }}
        </button>
        <button
          type="button"
          :class="[
            FOCUS_RING_CLASS,
            'border border-surface-600 px-2 py-1 text-xs font-semibold',
          ]"
          @click="emit('open-health')"
        >
          {{ OPEN_HEALTH_LABEL }}
        </button>
      </div>
    </div>

    <!-- ===================================================================
         FILTERED-EMPTY — a DIFFERENT SCREEN from empty, and never the same
         one. The operator seeing a generic empty state over a filtered list
         cannot tell whether the tool found nothing or their filter hid
         everything.
         =================================================================== -->
    <div v-else-if="view === 'filtered-empty'" class="py-16">
      <h2 class="text-2xl font-semibold leading-tight">
        {{ FILTERED_EMPTY_HEADING }}
      </h2>
      <p class="mt-4 text-surface-400">{{ filteredEmptyBody }}</p>
      <button
        type="button"
        :class="[
          FOCUS_RING_CLASS,
          'mt-4 border border-surface-600 px-2 py-1 text-xs font-semibold',
        ]"
        @click="void clearFilters()"
      >
        {{ CLEAR_FILTERS_LABEL }}
      </button>
    </div>

    <!-- ===================================================================
         EMPTY — nothing has been analysed at all.
         =================================================================== -->
    <div v-else-if="view === 'empty'" class="py-16">
      <h2 class="text-2xl font-semibold leading-tight">{{ EMPTY_HEADING }}</h2>
      <p class="mt-4 text-surface-400">{{ EMPTY_BODY }}</p>
    </div>

    <!-- ===================================================================
         POPULATED — the keyset page inside the recycling scroller.
         `aria-rowcount` is the REACHABLE TOTAL and not the resident window.
         =================================================================== -->
    <div
      v-else
      class="min-h-0 flex-1 overflow-hidden"
      role="grid"
      :aria-label="label"
      :aria-rowcount="reachableTotal"
      :aria-colcount="columns.length"
    >
      <RecycleScroller
        v-slot="{ item, index }"
        class="h-full"
        :items="scrollerItems"
        :item-size="TABLE_ROW_HEIGHT_PX"
        :buffer="200"
        key-field="__defminerRowKey"
      >
        <div
          :class="[
            ROW_HEIGHT_CLASS,
            FOCUS_RING_CLASS,
            'flex items-center gap-2 border-b border-surface-600 px-2',
            isSelected(item.row)
              ? SELECTED_ROW_ACCENT_CLASS
              : 'border-l-2 border-l-transparent',
          ]"
          role="row"
          tabindex="0"
          :aria-rowindex="index + 1"
          :aria-selected="isSelected(item.row)"
          @click="openEvidence(item.row)"
          @keydown.enter="openEvidence(item.row)"
          @keydown.space.prevent="openEvidence(item.row)"
        >
          <span
            v-for="column in columns"
            :key="column.id"
            :class="[column.widthClass, CELL_CLASS, 'min-w-0']"
            role="gridcell"
          >
            <!-- Per-column slot. Its FALLBACK is the whole rendering rule, so a
                 concrete table that supplies no slot still gets R1/R2 applied:
                 a target-controlled column goes through the display path and
                 comes out sliced into plain strings by HighlightSlices, and
                 every other column is a plain text interpolation. -->
            <slot :name="`cell-${column.id}`" :row="item.row" :column="column">
              <HighlightSlices
                v-if="column.targetControlled"
                :text="item.display[column.id]"
              />
              <template v-else>{{ column.text(item.row) }}</template>
            </slot>
          </span>

          <!-- The row's secondary CTA, with a TEXT label. No icon-only action
               exists anywhere on this surface. -->
          <button
            type="button"
            :class="[
              FOCUS_RING_CLASS,
              'shrink-0 text-xs font-semibold text-surface-400 underline',
            ]"
            @click.stop="openEvidence(item.row)"
          >
            Open evidence
          </button>
        </div>
      </RecycleScroller>
    </div>
  </div>
</template>
