<script setup lang="ts">
// packages/frontend/src/components/ObservationsTable.vue — the shipped
// `observations` inventory over the shared shell.
//
// ===========================================================================
// THE OBSERVED URL IS THE GENUINE ARTICLE
// ===========================================================================
// The artifacts table's target-controlled column is a content digest — derived
// from host bytes, but hex-shaped and bounded. THIS table's is the OBSERVED
// URL: free-form bytes chosen by a possibly hostile host, of unbounded length,
// able to carry markup, a bidi override that reverses the hostname the operator
// is reading, a four-byte grapheme, or four megabytes on one line. It is the
// right first subject for the whole rendering safety contract, and it is why
// R1's rule that "an extracted URL is data to be displayed, never a destination
// to be offered" has a column to point at.
//
// So: it goes through `safety/display.ts`'s cell path like every other
// target-controlled value — the shell does that for any column marked
// `targetControlled`, which is exactly one column here. It renders in
// `font-mono` (a security control: `l`/`1` and `0`/`O` are one picture in a
// proportional face, and a lookalike hostname is the attack). It is never an
// `href`, never a `title`, never a `data-*` value; the static gate in
// `frontend-safety.spec.ts` reports all three and cannot be switched off by a
// comment in this file.
//
// Everything else here mirrors ArtifactsTable.vue, including why the analysis
// state is an optional lookup — see that file's header; the shipped paged read
// selects `project_id, sha256, request_id, url, status, content_type,
// observed_at` and carries no scan state.

import type { PageRequest, ScanState } from "@defminer/engine/contract";
import { isDegradedScanState } from "@defminer/engine/contract";
import { computed } from "vue";

import type { ObservationRow } from "../api/client";
import type { InventoryStore } from "../stores/inventory";

import InventoryTable from "./InventoryTable.vue";
import PartialBanner from "./PartialBanner.vue";
import StatusBadge from "./StatusBadge.vue";
import type { ColumnDefinition } from "./table-contract";

const { store, analyses, affectedFilter } = defineProps<{
  store: InventoryStore<ObservationRow>;
  /** Scan state per content digest. See ArtifactsTable.vue's header. */
  analyses: ReadonlyMap<string, ScanState> | null;
  /** The single column filter narrowing to degraded rows, or null. */
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

function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19);
}

const COLUMNS: readonly ColumnDefinition<ObservationRow>[] = [
  {
    id: "state",
    label: "Analysis",
    widthClass: "w-24",
    targetControlled: false,
    sortKey: null,
    text: () => "",
  },
  // THE target-controlled column, and the one this whole safety contract is
  // written for.
  {
    id: "url",
    label: "Observed URL",
    widthClass: "flex-1",
    targetControlled: true,
    sortKey: null,
    text: (row) => row.url,
  },
  {
    id: "observed_at",
    label: "Last seen",
    widthClass: "w-44",
    targetControlled: false,
    sortKey: "observed_at",
    text: (row) => formatTimestamp(row.observed_at),
  },
  {
    id: "triage",
    label: "Triage",
    widthClass: "w-24",
    targetControlled: false,
    sortKey: null,
    text: () => "",
  },
  {
    id: "status",
    label: "Status",
    widthClass: "w-20",
    targetControlled: false,
    sortKey: "status",
    text: (row) => String(row.status),
  },
  // DefMiner-authored fallback text rather than an empty cell: `null` here means
  // the host sent no Content-Type, which is a fact about the response and not a
  // missing value. It is a DefMiner sentence, so it is not target-controlled.
  {
    id: "content_type",
    label: "Content type",
    widthClass: "w-40",
    targetControlled: false,
    sortKey: null,
    text: (row) => row.content_type ?? "not declared",
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
function leadStates(row: ObservationRow): readonly ScanState[] {
  const state = states.value.get(row.sha256);
  return state === undefined ? [] : [state];
}

/** The stable per-row identity. A named function, because a type annotation
 *  inside a template expression is not parseable by vue-eslint-parser. */
function rowKey(row: ObservationRow): string {
  return `${row.sha256}:${row.request_id}`;
}

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
      label="Observations"
      :columns="COLUMNS"
      :store="store"
      :row-key="rowKey"
      @open-health="emit('open-health')"
    >
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
