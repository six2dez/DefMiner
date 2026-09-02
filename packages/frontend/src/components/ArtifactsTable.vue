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
//
// ===========================================================================
// THE `Sources` COLUMN (PLAN 07-09) — AND THE ONE THING IT MUST NOT COLLAPSE
// ===========================================================================
// It is the drill-down's ONLY entry point (U7-6), and it arrives by the SAME
// route and for the SAME measured reason as `analyses` above: `reads.ts`'s
// paged statements select a fixed column set and no source count, so joining
// one in is an edit to that literal statement matrix. It is therefore an
// OPTIONAL LOOKUP MAP the mounting component supplies, keyed on content digest.
//
// THREE CELL STATES, AND THE DISTINCTION BETWEEN TWO OF THEM IS THE WHOLE
// POINT OF THE COLUMN:
//
//   * count known and >= 1 -> the grouped integer as a BUTTON. Activating it
//     enters the drill-down.
//   * count known and 0    -> the literal `0` in the level-4 tone, NOT a
//     button. A RESOLVED ZERO IS A REAL, USEFUL FACT: this bundle carried no
//     inline map, and there is nothing to browse.
//   * count NOT known      -> NOTHING AT ALL. No text and no element.
//
// A resolved zero and an unresolved count are DIFFERENT FACTS and are never
// the same pixel. `countRecoveredSources` carries the distinction across the
// RPC by presence rather than by value precisely so this cell can render it —
// an entry with value 0 means DefMiner looked and found none, and no entry
// means DefMiner has not looked. A `0` rendered for an unknown count tells the
// operator the OPPOSITE of the truth and stops them opening the one row that
// had the finding; a spinner in a 32px cell reflows the column when it
// resolves. So the unknown cell is empty, and a failed lookup is DELIBERATELY
// indistinguishable from a still-resolving one, because both mean NOT KNOWN.
// A read failure surfaces at the artifact level, in the evidence panel, where
// the analysis vocabulary lives.
//
// THE COLUMN IS NOT TARGET-CONTROLLED and does not need to be: it renders a
// DefMiner-computed integer and nothing else, so the shell's exactly-one
// assertion is unchanged and there is no field here a later edit could render
// a target-controlled string into.

import type { PageRequest, ScanState } from "@defminer/engine/contract";
import { isDegradedScanState } from "@defminer/engine/contract";
import { computed } from "vue";

import type { ArtifactRow } from "../backend";
import type { InventoryStore } from "../stores/inventory";

import InventoryTable from "./InventoryTable.vue";
import PartialBanner from "./PartialBanner.vue";
import StatusBadge from "./StatusBadge.vue";
import type { ColumnDefinition } from "./table-contract";
import { counted, FOCUS_RING_CLASS, groupThousands } from "./table-contract";

const { store, analyses, sourceCounts, affectedFilter } = defineProps<{
  store: InventoryStore<ArtifactRow>;
  /**
   * Scan state per content digest, for the artifacts currently resident.
   *
   * Empty by default — see this file's header. A digest absent from the map has
   * an UNKNOWN state, which renders as nothing rather than as a guess.
   */
  analyses: ReadonlyMap<string, ScanState> | null;
  /**
   * Recovered-source count per content digest (07-UI-SPEC.md § "The `Sources`
   * column").
   *
   * AN ENTRY WITH VALUE 0 IS A RESOLVED ZERO; NO ENTRY IS AN UNKNOWN. The two
   * are never collapsed, and `null` — the whole map absent — means the same
   * thing as an absent entry: NOT KNOWN. That is why a failed lookup and a
   * still-resolving one are indistinguishable here by design.
   */
  sourceCounts: ReadonlyMap<string, number> | null;
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

const emit = defineEmits<{
  "open-health": [];
  /** The operator asked to browse this artifact's recovered sources. The
   *  DRILL-DOWN IS THE PAGE'S TO ENTER, exactly as `open-health` is the page's
   *  to route: a table that entered it itself would be a component writing to
   *  a sibling's state. */
  "browse-sources": [sha256: string];
}>();

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

/** The empty count lookup, frozen at module scope for the reason above. A
 *  null map and an empty map say the same thing — NOT KNOWN for every row. */
const EMPTY_SOURCE_COUNTS: ReadonlyMap<string, number> = new Map();

const counts = computed<ReadonlyMap<string, number>>(
  () => sourceCounts ?? EMPTY_SOURCE_COUNTS,
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
  // The drill-down's only entry point, rendered through the `cell-sources`
  // slot below. `text` answers the EMPTY STRING and never a count: the slot
  // owns all three states, and a fallback that stringified a number here would
  // render `0` for an unknown row the moment somebody removed the slot.
  {
    id: "sources",
    label: "Sources",
    widthClass: "w-24",
    targetControlled: false,
    sortKey: null,
    text: () => "",
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
 * The BROWSABLE count, as a LIST OF AT MOST ONE.
 *
 * A list rather than an optional value, for the reason {@link leadStates} gives
 * one screen up: a `!` inside a template expression is not parseable by
 * vue-eslint-parser, and a lookup with a fallback would fabricate a count for a
 * row nobody has counted. An empty list renders NOTHING, which is the absence
 * of a claim rather than a wrong one.
 */
function browsableCounts(row: ArtifactRow): readonly number[] {
  const count = counts.value.get(row.sha256);
  return count === undefined || count < 1 ? [] : [count];
}

/**
 * The RESOLVED ZERO, as a list of at most one.
 *
 * Separate from {@link browsableCounts} rather than one function with a mode,
 * because the two cells are different SHAPES — a button and a plain digit —
 * and the whole point of the column is that they cannot be collapsed. A row
 * whose count is unknown is in NEITHER list, and its cell has no child at all.
 */
function resolvedZeros(row: ArtifactRow): readonly number[] {
  return counts.value.get(row.sha256) === 0 ? [0] : [];
}

/**
 * The cell button's accessible name.
 *
 * `counted` rather than the copy row's literal `{n} recovered sources`, because
 * 05-UI-SPEC.md § "Copywriting Contract"'s own zero-one-many rule outranks its
 * template: a count that does not agree with its noun is the defect that rule
 * names, and "Browse 1 recovered sources" is exactly it. Agreement wins at one;
 * the string is byte-identical to the copy row at every other count.
 */
function browseLabel(count: number): string {
  return `Browse ${counted(count, "recovered source", "recovered sources")}`;
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

      <!-- THE THREE CELL STATES. There is no `v-else` here and there must not
           be one: the third state is the ABSENCE of both `v-for`s, so a row
           whose count is unknown renders no text and no element at all. A
           `v-else` would be a place for somebody to put a `0` or a spinner.

           `@click.stop` because the row's own click opens the evidence panel:
           entering the drill-down is the PAGE'S to arrange, and it selects the
           row and opens the panel deliberately rather than by relying on which
           handler bubbling reaches first. -->
      <template #cell-sources="{ row }">
        <button
          v-for="count in browsableCounts(row)"
          :key="`browse-${count}`"
          type="button"
          :class="[
            FOCUS_RING_CLASS,
            'whitespace-pre overflow-hidden text-xs font-semibold underline',
          ]"
          :aria-label="browseLabel(count)"
          @click.stop="emit('browse-sources', row.sha256)"
        >
          {{ groupThousands(count) }}
        </button>
        <span
          v-for="zero in resolvedZeros(row)"
          :key="`zero-${zero}`"
          class="whitespace-pre overflow-hidden text-xs text-surface-400"
          >{{ groupThousands(zero) }}</span
        >
      </template>
    </InventoryTable>
  </div>
</template>
