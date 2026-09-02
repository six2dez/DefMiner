<script setup lang="ts">
// packages/frontend/src/components/SourceTree.vue — the recovered-source tree
// column of the drill-down.
//
// ===========================================================================
// THE VIRTUALISATION PRECEDENT IS InventoryTable.vue, NOT ArtifactsTable.vue
// ===========================================================================
// DISCHARGED HERE IN THE PLAN'S OWN WORDS RATHER THAN INHERITED. CONTEXT.md's
// D-18 names `ArtifactsTable.vue` as the scroller precedent. It is not one:
// that file declares a COLUMN LIST and mounts the shared shell, and its own
// header says every state belongs to `InventoryTable.vue`. The actual
// `RecycleScroller` invocation — the fixed `item-size` bound to a constant, the
// `:buffer`, the `key-field`, and the row's role/tabindex/aria/keyboard
// handling — is in `InventoryTable.vue:473-531`, and that is what this file
// copies. RESEARCH O-02 caught the misattribution and PATTERNS.md repeated it.
//
// ===========================================================================
// THE ROW HEIGHT IS FIXED, AND THAT IS THE ONE THING THE FAST PATH REQUIRES
// ===========================================================================
// `item-size` is bound to `TABLE_ROW_HEIGHT_PX`, RE-READ and never restated. A
// VARIABLE ROW HEIGHT degrades `RecycleScroller` to its dynamic variant, and the
// shipped code already declined virtualisation once for exactly that reason
// (`ScanHistoryList.vue`: the per-scan detail is an inline disclosure under the
// selected row, which is a variable height, so that list is authored rather than
// virtualised). Nothing in this file may grow a row: every label is
// `whitespace-pre overflow-hidden`, and it is truncated at the cell cap before
// it ever reaches the template.
//
// ===========================================================================
// NO PrimeVue TREE, NO ICON PACKAGE
// ===========================================================================
// 07-UI-SPEC.md § "Component Inventory" enumerates PrimeVue's `Tree`
// specifically so its absence reads as a DECISION rather than an oversight: a
// themed tree cannot be made to guarantee the fixed 32px geometry every other
// list on this page uses, nor that every node label goes through
// `safety/display.ts`. Both are non-negotiable here, so the markup is authored.
//
// The disclosure glyph is a TEXT CODEPOINT in the inherited font. DefMiner ships
// no icon package at all, and the glyph is never the sole carrier of meaning:
// the whole row is a `<button>` with an expanded state whose accessible name is
// the directory's label, so the arrow is redundant reinforcement. That satisfies
// 05-UI-SPEC.md's ban on icon-only affordances rather than diverging from it.

import type { SourceProducibility } from "@defminer/engine/contract";
import { computed, ref } from "vue";
import { RecycleScroller } from "vue-virtual-scroller";

import { TABLE_ROW_HEIGHT_PX } from "../safety/display";
import type { SourceTreeNode, SourceTreeRow } from "../sourcemap/tree";
import {
  buildSourceTree,
  expandableKeys,
  flattenSourceTree,
  SOURCE_TREE_MAX_INDENT_DEPTH,
} from "../sourcemap/tree";

import ProducibilityMark from "./ProducibilityMark.vue";
import {
  counted,
  FOCUS_RING_CLASS,
  groupThousands,
  ROW_HEIGHT_CLASS,
} from "./table-contract";

/** What this column needs off a recovered-source row. A subset of
 *  `RecoveredSourceRow`, so a real row is assignable without a cast. */
type SourceRow = {
  readonly sourceIndex: number;
  /** TARGET-CONTROLLED and unsanitised, exactly as D-06 stores it. */
  readonly sourcesVerbatim: string | null;
  readonly producibility: SourceProducibility;
};

const {
  loadState,
  rows,
  total,
  returned,
  bound,
  analysisStoppedEarly = false,
  selectedIndex = null,
} = defineProps<{
  loadState: "loading" | "failed" | "ready";
  rows: readonly SourceRow[];
  /** How many sightings this artifact ACTUALLY has — the backend's number. */
  total: number;
  /** How many rows came back. Carried separately, never derived. */
  returned: number;
  /** The read's own bound, echoed so the sentence reads it rather than a
   *  constant this component chose. */
  bound: number;
  /** The analysis of this bundle stopped early, so an empty tree is not the
   *  same fact as "the bundle carried no map". */
  analysisStoppedEarly?: boolean;
  selectedIndex?: number | null;
}>();

const emit = defineEmits<{
  select: [sourceIndex: number];
  retry: [];
  "open-health": [];
  "open-evidence": [];
}>();

// ---------------------------------------------------------------------------
// COPY — 07-UI-SPEC.md § "Copywriting Contract", VERBATIM
// ---------------------------------------------------------------------------
// Every string below is the approved wording, declared as a NAMED CONSTANT and
// never written inline in the template. The rule that outranks the whole copy
// table applies to all of them: NO SENTENCE HERE INTERPOLATES A
// TARGET-CONTROLLED STRING. The only interpolations are DefMiner-computed
// integers.

const COLUMN_HEADING = "Recovered sources";

const EMPTY_HEADING = "No recovered sources in this bundle";
const EMPTY_BODY =
  "DefMiner recovers source only from sourcemaps embedded in the bundle it " +
  "already has. It never fetches a `.map` file — that would be a request the " +
  "target can see, and DefMiner stays silent.";

const STOPPED_EARLY_HEADING =
  "Nothing was recovered from this bundle's sourcemap.";
const STOPPED_EARLY_BODY =
  "The analysis of this bundle stopped early. The evidence panel for this " +
  'artifact says why. This is not "the bundle had no map".';
const OPEN_EVIDENCE_LABEL = "Open evidence";

const LOADING_LABEL = "Loading recovered sources…";

const ERROR_HEADING = "Could not load the recovered sources for this bundle.";
const ERROR_BODY =
  'The DefMiner backend did not answer. This is not the same as "nothing was ' +
  'recovered" — DefMiner has not looked.';
const RETRY_LABEL = "Retry";
const OPEN_HEALTH_LABEL = "Open Health";

/** The two display notes. NOT a vocabulary: they describe what the TREE did to
 *  a position or a label, not what happened to the artifact. */
const PATH_CLAMPED_NOTE = "path clamped";
const LABEL_TRUNCATED_NOTE = "label truncated";

/** The disclosure glyphs — text codepoints, never an icon. */
const DISCLOSURE_OPEN = "▾";
const DISCLOSURE_CLOSED = "▸";

/**
 * The indent, as LITERAL Tailwind utilities keyed by depth.
 *
 * The `sm` step is 8px, so level n is `pl-{2n}` — and every one is spelled out
 * because Tailwind's JIT only emits a utility it can SEE in the scanned source,
 * exactly as `table-contract.ts`'s row-height map records. Nine entries, which
 * is the eight-level cap plus the root: an indent that grew without bound in a
 * quarter-width column would eventually leave no room for the label the
 * operator came to read.
 */
const INDENT_CLASSES: readonly string[] = [
  "pl-0",
  "pl-2",
  "pl-4",
  "pl-6",
  "pl-8",
  "pl-10",
  "pl-12",
  "pl-14",
  "pl-16",
];

// ---------------------------------------------------------------------------
// THE FOUR STATES, AS ONE VALUE
// ---------------------------------------------------------------------------
//
// ONE COMPUTED, NOT A CHAIN OF `v-else-if`. A chain admits the reading where
// two branches are both live, and the branch that must never be confused with
// another is here: AN EMPTY TREE MEANS "this bundle carried no inline map". So
// a load failure rendered as an empty list tells the operator the OPPOSITE of
// the truth, and the error state is a different screen with a different
// heading — a fact a spec can assert by looking for the absence of one.

type View = "failed" | "loading" | "empty" | "populated";

const view = computed<View>(() => {
  if (loadState === "failed") return "failed";
  if (loadState === "loading" && rows.length === 0) return "loading";
  return rows.length === 0 ? "empty" : "populated";
});

const emptyHeading = computed<string>(() =>
  analysisStoppedEarly ? STOPPED_EARLY_HEADING : EMPTY_HEADING,
);
const emptyBody = computed<string>(() =>
  analysisStoppedEarly ? STOPPED_EARLY_BODY : EMPTY_BODY,
);

/** The count line. `counted` for singular/plural agreement at 0, 1 and many —
 *  never a parenthesised plural. */
const countLine = computed<string>(() =>
  counted(total, "recovered source", "recovered sources"),
);

/** The bound sentence (UI-09), rendered ONLY when the read stopped short.
 *  `returned` and `total` are two fields from the backend, never one derived
 *  from the other. */
const boundLine = computed<string | null>(() =>
  returned < total
    ? `Showing the first ${groupThousands(bound)} of ${groupThousands(total)} recovered sources, in the order this map declares them.`
    : null,
);

/** Producibility by index. The tree carries `sourcesIndex` and nothing else —
 *  the label is never the identity — so the mark is resolved the same way every
 *  other read of a node is. */
const producibilityByIndex = computed<ReadonlyMap<number, SourceProducibility>>(
  () => new Map(rows.map((row) => [row.sourceIndex, row.producibility])),
);

const tree = computed<readonly SourceTreeNode[]>(() => buildSourceTree(rows));

/** Everything open on first render. The bound is enforced at the read, so the
 *  flattened list is bounded too, and a tree that opens closed hides the thing
 *  the operator navigated here to see. */
const collapsedKeys = ref<ReadonlySet<string>>(new Set());

const expandedKeys = computed<ReadonlySet<string>>(() => {
  const open = new Set(expandableKeys(tree.value));
  for (const key of collapsedKeys.value) open.delete(key);
  return open;
});

const visibleRows = computed<readonly SourceTreeRow[]>(() =>
  flattenSourceTree(tree.value, expandedKeys.value),
);

/** The scroller keys by property NAME, so the node's key is lifted onto the
 *  item. */
const scrollerItems = computed(() =>
  visibleRows.value.map((row) => ({ row, key: row.node.key })),
);

function toggle(node: SourceTreeNode): void {
  const next = new Set(collapsedKeys.value);
  if (next.has(node.key)) next.delete(node.key);
  else next.add(node.key);
  collapsedKeys.value = next;
}

function activate(node: SourceTreeNode): void {
  if (node.children.length > 0) toggle(node);
  else emit("select", node.sourcesIndex);
}

function indentClass(indentDepth: number): string {
  return (
    INDENT_CLASSES[Math.min(indentDepth, SOURCE_TREE_MAX_INDENT_DEPTH)] ??
    INDENT_CLASSES[0] ??
    ""
  );
}

/** The `· #{index}` suffix, and ONLY when a sibling shares the label —
 *  otherwise the index is noise. DefMiner-computed integer, never a slice of
 *  the label. */
function duplicateSuffix(node: SourceTreeNode): string | null {
  return node.duplicate ? `· #${groupThousands(node.sourcesIndex)}` : null;
}

function noteFor(node: SourceTreeNode): string | null {
  if (node.notes.includes("path-clamped")) return PATH_CLAMPED_NOTE;
  if (node.notes.includes("label-truncated")) return LABEL_TRUNCATED_NOTE;
  return null;
}

/**
 * The producibility of a source node.
 *
 * THE LOOKUP IS TOTAL BY CONSTRUCTION — the tree is built from the SAME `rows`
 * array the map is built from, so every `source` node's index is a key. The
 * `??` arm is therefore unreachable, and it answers the ORDINARY member rather
 * than throwing, because the fallen-back behaviour on a render path must be the
 * quiet one: a mark that appears from nowhere would be a tombstone the operator
 * cannot explain, and an exception here would blank the column.
 */
function producibilityOf(node: SourceTreeNode): SourceProducibility {
  return producibilityByIndex.value.get(node.sourcesIndex) ?? "producible";
}

const isSelected = (node: SourceTreeNode): boolean =>
  node.kind === "source" && node.sourcesIndex === selectedIndex;

/** Skeleton rows at the FIXED height. Never a spinner: a spinner reflows the
 *  column when it resolves, and this column shares a row with the viewer. */
const SKELETON_ROWS = 12;
</script>

<template>
  <div class="flex h-full min-h-0 flex-col" data-defminer-source-tree>
    <div class="border-b border-surface-600 px-2 py-1">
      <h2 class="text-sm font-semibold leading-tight">{{ COLUMN_HEADING }}</h2>
      <p class="text-xs text-surface-400" data-defminer-source-tree-count>
        {{ countLine }}
      </p>
      <p
        v-if="boundLine !== null"
        class="text-xs text-surface-400"
        data-defminer-source-tree-bound
      >
        {{ boundLine }}
      </p>
    </div>

    <!-- ===================================================================
         LOADING — skeleton rows at the fixed height. NEVER A SPINNER: there
         is no element with a spinner role anywhere below.
         =================================================================== -->
    <div
      v-if="view === 'loading'"
      class="min-h-0 flex-1 overflow-hidden"
      data-defminer-source-tree-loading
    >
      <p class="px-2 py-1 text-xs text-surface-400">{{ LOADING_LABEL }}</p>
      <div
        v-for="index in SKELETON_ROWS"
        :key="`skeleton-${index}`"
        :class="[
          ROW_HEIGHT_CLASS,
          'flex items-center gap-2 border-b border-surface-600 px-2',
        ]"
        data-defminer-skeleton-row
      >
        <span class="h-3 w-2/3 bg-surface-700">&nbsp;</span>
      </div>
    </div>

    <!-- ===================================================================
         ERROR — an explicit failure with both actions, and NEVER an empty
         list. An empty tree means "this bundle carried no inline map", so
         rendering a load failure that way says the opposite of the truth.
         =================================================================== -->
    <div
      v-else-if="view === 'failed'"
      class="px-2 py-16"
      data-defminer-source-tree-error
    >
      <h3 class="text-sm font-semibold text-danger-500">{{ ERROR_HEADING }}</h3>
      <p class="mt-2 text-xs text-surface-400">{{ ERROR_BODY }}</p>
      <div class="mt-4 flex gap-2">
        <button
          type="button"
          :class="[
            FOCUS_RING_CLASS,
            'border border-surface-600 px-2 py-1 text-xs font-semibold',
          ]"
          @click="emit('retry')"
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
         EMPTY — a DIFFERENT SCREEN from the error state, with the
         inline-only / never-fetches explanation, and its stopped-early
         variant carrying the one action that resolves the ambiguity.
         =================================================================== -->
    <div
      v-else-if="view === 'empty'"
      class="px-2 py-16"
      data-defminer-source-tree-empty
    >
      <h3 class="text-sm font-semibold leading-tight">{{ emptyHeading }}</h3>
      <p class="mt-2 text-xs text-surface-400">{{ emptyBody }}</p>
      <button
        v-if="analysisStoppedEarly"
        type="button"
        :class="[
          FOCUS_RING_CLASS,
          'mt-4 border border-surface-600 px-2 py-1 text-xs font-semibold',
        ]"
        @click="emit('open-evidence')"
      >
        {{ OPEN_EVIDENCE_LABEL }}
      </button>
    </div>

    <!-- ===================================================================
         POPULATED — the flattened visible-node list, virtualised at the
         fixed row height, in the map's own index order.
         =================================================================== -->
    <div
      v-else
      class="min-h-0 flex-1 overflow-hidden"
      role="tree"
      :aria-label="COLUMN_HEADING"
    >
      <RecycleScroller
        v-slot="{ item }"
        class="h-full"
        :items="scrollerItems"
        :item-size="TABLE_ROW_HEIGHT_PX"
        :buffer="200"
        key-field="key"
      >
        <button
          type="button"
          :class="[
            ROW_HEIGHT_CLASS,
            FOCUS_RING_CLASS,
            indentClass(item.row.indentDepth),
            'flex w-full items-center gap-1 border-b border-surface-600 pr-2 text-left',
            isSelected(item.row.node) ? 'bg-surface-700' : '',
          ]"
          role="treeitem"
          :aria-level="item.row.depth + 1"
          :aria-expanded="
            item.row.node.children.length > 0
              ? expandedKeys.has(item.row.node.key)
              : undefined
          "
          :aria-current="isSelected(item.row.node) ? 'true' : undefined"
          @click="activate(item.row.node)"
        >
          <!-- The disclosure glyph. `aria-hidden` because the row's own
               expanded state already carries the meaning: the arrow is
               redundant reinforcement, never the sole carrier. -->
          <span
            v-if="item.row.node.children.length > 0"
            class="w-3 shrink-0 text-surface-400"
            aria-hidden="true"
            >{{
              expandedKeys.has(item.row.node.key)
                ? DISCLOSURE_OPEN
                : DISCLOSURE_CLOSED
            }}</span
          >
          <span v-else class="w-3 shrink-0" aria-hidden="true">&nbsp;</span>

          <!-- THE ONE TARGET-CONTROLLED ELEMENT ON THE ROW. The label already
               came through `forCellText` — one segment at a time, in
               sourcemap/tree.ts — and is mono, pre-formatted and clipped, so a
               value carrying a newline cannot grow the fixed row. There is no
               `title` here and no `data-*` carrying it: R2 states both as
               absolutes. -->
          <span
            class="min-w-0 truncate font-mono text-xs whitespace-pre overflow-hidden"
            data-defminer-source-tree-label
            >{{ item.row.node.label }}</span
          >

          <span
            v-if="duplicateSuffix(item.row.node) !== null"
            class="shrink-0 text-xs text-surface-400"
            data-defminer-source-tree-duplicate
            >{{ duplicateSuffix(item.row.node) }}</span
          >

          <span
            v-if="noteFor(item.row.node) !== null"
            class="shrink-0 text-xs text-surface-400"
            data-defminer-source-tree-note
            >{{ noteFor(item.row.node) }}</span
          >

          <ProducibilityMark
            v-if="item.row.node.kind === 'source'"
            :producibility="producibilityOf(item.row.node)"
          />
        </button>
      </RecycleScroller>
    </div>
  </div>
</template>
