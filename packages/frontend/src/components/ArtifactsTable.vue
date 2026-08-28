<script setup lang="ts">
// packages/frontend/src/components/ArtifactsTable.vue — the shipped `artifacts`
// inventory, as a column list over the shared shell.
//
// ===========================================================================
// THIN ON PURPOSE
// ===========================================================================
// Every state — empty, filtered-empty, loading, error, populated — belongs to
// `InventoryTable.vue` and is asserted there once. This file declares a column
// list, a row key, and the degradation marking. Two tables implementing the
// states separately would be two chances to collapse the empty and
// filtered-empty screens into one, which is the defect that distinction exists
// to prevent.
//
// ===========================================================================
// THE FOUR ALWAYS-PRESENT COLUMNS COME FIRST, IN THE BOUND ORDER
// ===========================================================================
// 05-UI-SPEC.md § "Table contract": `[state/score] [target-controlled value]
// [last seen] [triage state]`, then the table's own columns. EXACTLY ONE column
// carries the target-controlled value — here the content digest — and the shell
// asserts that count rather than trusting this file to hold to it.
//
// THE DIGEST IS TARGET-DERIVED AND THEREFORE MONO. It is not free-form host
// text, but the mandatory `font-mono` rule is about an operator's ability to
// tell two near-identical strings apart, not about whether a value is trusted:
// in a proportional face `0`/`O` and `l`/`1` are the same picture, and two
// digests differing in one of them are indistinguishable.
//
// ===========================================================================
// WHERE THE ANALYSIS STATE COMES FROM, AND WHY IT IS OPTIONAL TODAY
// ===========================================================================
// MEASURED AGAINST THE SHIPPED READS, NOT ASSUMED: the paged statements in
// packages/backend/src/store/reads.ts select
// `project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count`
// and nothing else. There is NO `scan_state` on an artifact row and no endpoint
// that returns one — the `analyses` table is an invalidation category, not a
// pageable table. Joining one in is an edit to that literal statement matrix,
// which is a backend change this plan does not make.
//
// So the state arrives as an OPTIONAL LOOKUP the mounting component supplies,
// and when it has nothing to say the lead cell renders NOTHING. That is the
// only honest option: rendering "Complete" for an artifact whose analysis state
// is unknown is precisely the silence UI-09 forbids, and inventing an
// "Unknown" label would introduce the UI-only synonym § "Status vocabulary"
// bans. The column keeps its position either way, so the plan that supplies the
// data does not move the operator's columns underneath them.

import type { PageRequest, ScanState } from "@defminer/engine/contract";
import { isDegradedScanState } from "@defminer/engine/contract";
import { computed } from "vue";

import type { ArtifactRow } from "../backend";
import type { InventoryStore } from "../stores/inventory";

import InventoryTable from "./InventoryTable.vue";
import PartialBanner from "./PartialBanner.vue";
import StatusBadge from "./StatusBadge.vue";
import type { ColumnDefinition } from "./table-contract";

const { store, analyses, affectedFilter } = defineProps<{
  store: InventoryStore<ArtifactRow>;
  /**
   * Scan state per content digest, for the artifacts currently resident.
   *
   * Empty by default — see this file's header. A digest absent from the map has
   * an UNKNOWN state, which renders as nothing rather than as a guess.
   */
  analyses: ReadonlyMap<string, ScanState> | null;
  /**
   * The single column filter that narrows to the degraded artifacts, or `null`
   * when no such filter column exists on the backend yet.
   *
   * ONE FILTER, NEVER TWO: `PageRequest["filter"]` is a single optional object
   * and not a record, because the backend's statement matrix is enumerated
   * literally and a second simultaneous filter has no statement behind it.
   */
  affectedFilter: PageRequest["filter"];
}>();

const emit = defineEmits<{ "open-health": [] }>();

/**
 * The empty lookup, frozen at module scope so every mount shares one instance
 * rather than allocating a Map per read.
 *
 * BOTH PROPS ARE REQUIRED AND EXPLICITLY NULLABLE rather than optional with a
 * default. A caller has to write `:analyses="null"`, which states at the call
 * site that it has nothing to say about analysis state — and an absent entry is
 * read as UNKNOWN everywhere below, never as "complete".
 */
const EMPTY_ANALYSES: ReadonlyMap<string, ScanState> = new Map();

const states = computed<ReadonlyMap<string, ScanState>>(
  () => analyses ?? EMPTY_ANALYSES,
);

/** A millisecond epoch as a fixed-width, sortable, locale-independent string. */
function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19);
}

const COLUMNS: readonly ColumnDefinition<ArtifactRow>[] = [
  // 1 — the lead. Rendered through the `cell-state` slot below.
  {
    id: "state",
    label: "Analysis",
    widthClass: "w-24",
    targetControlled: false,
    sortKey: null,
    text: () => "",
  },
  // 2 — THE target-controlled column. Exactly one per table.
  {
    id: "digest",
    label: "Digest",
    widthClass: "flex-1",
    targetControlled: true,
    sortKey: null,
    text: (row) => row.sha256,
  },
  // 3 — last seen.
  {
    id: "last_seen",
    label: "Last seen",
    widthClass: "w-44",
    targetControlled: false,
    sortKey: "last_seen",
    text: (row) => formatTimestamp(row.last_seen_at),
  },
  // 4 — triage state. Empty until the triage table exists; the column holds its
  // position so it does not appear later and shift every column right of it.
  {
    id: "triage",
    label: "Triage",
    widthClass: "w-24",
    targetControlled: false,
    sortKey: null,
    text: () => "",
  },
  // Entity-specific columns follow the four.
  {
    id: "byte_len",
    label: "Bytes",
    widthClass: "w-24",
    targetControlled: false,
    sortKey: "byte_len",
    text: (row) => String(row.byte_len),
  },
  {
    id: "kind",
    label: "Kind",
    widthClass: "w-24",
    targetControlled: false,
    sortKey: null,
    text: (row) => row.kind,
  },
];

/**
 * The row's analysis state as a LIST OF AT MOST ONE.
 *
 * A list rather than an optional value because the template renders it with
 * `v-for` rather than `v-if` + a non-null assertion: a `!` inside a template
 * expression is not parseable by vue-eslint-parser, and the alternative — a
 * lookup with a fallback state — would fabricate a state for a row whose
 * analysis is unknown, which is the silence UI-09 forbids. An empty list
 * renders nothing, which is the absence of a claim rather than a wrong one.
 */
function leadStates(row: ArtifactRow): readonly ScanState[] {
  const state = states.value.get(row.sha256);
  return state === undefined ? [] : [state];
}

/** The stable per-row identity. A named function, because a type annotation
 *  inside a template expression is not parseable by vue-eslint-parser. */
function rowKey(row: ArtifactRow): string {
  return row.sha256;
}

/**
 * The artifacts whose analysis is in a degraded terminal state.
 *
 * Computed over what the operator can currently SEE, which is what makes the
 * floor statement true rather than decorative: it counts the artifacts actually
 * contributing to the numbers on screen.
 */
const degraded = computed<ScanState[]>(() => {
  const out: ScanState[] = [];
  for (const row of store.rows.value) {
    const state = states.value.get(row.sha256);
    if (state !== undefined && isDegradedScanState(state)) out.push(state);
  }
  return out;
});

const known = computed<number>(() => {
  let count = 0;
  for (const row of store.rows.value) {
    if (states.value.has(row.sha256)) count++;
  }
  return count;
});

const showBanner = computed<boolean>(() => degraded.value.length > 0);
const includesFailed = computed<boolean>(() =>
  degraded.value.includes("failed"),
);

async function showOnlyAffected(): Promise<void> {
  if (affectedFilter === null) return;
  await store.setFilter(affectedFilter);
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-2">
    <PartialBanner
      v-if="showBanner"
      :affected="degraded.length"
      :total="known"
      :includes-failed="includesFailed"
      :can-narrow="affectedFilter !== null"
      @show-only-affected="void showOnlyAffected()"
    />

    <InventoryTable
      label="Artifacts"
      :columns="COLUMNS"
      :store="store"
      :row-key="rowKey"
      @open-health="emit('open-health')"
    >
      <!-- THE PER-ROW BADGE IS INDEPENDENT OF THE BANNER. A degraded row is
           marked whether or not the banner is showing, and a row is never
           un-marked because the banner is present: two mechanisms at two
           altitudes, neither a summary of the other. -->
      <template #cell-state="{ row }">
        <StatusBadge
          v-for="state in leadStates(row)"
          :key="state"
          :state="state"
        />
      </template>
    </InventoryTable>
  </div>
</template>
