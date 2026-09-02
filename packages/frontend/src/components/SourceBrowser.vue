<script setup lang="ts">
// packages/frontend/src/components/SourceBrowser.vue — the Artifacts-tab
// drill-down (D-21): the shell that makes recovered source REACHABLE.
//
// ===========================================================================
// IT IS A STATE, NOT A SIXTH TAB, AND THAT IS THE WHOLE OF D-21
// ===========================================================================
// `App.vue`'s frozen five-entry `TABS` list is BYTE-UNCHANGED. The strip
// already wraps at five, and this surface is reached by activating a cell on
// the artifacts table rather than by a tab. Concretely: this component is a
// state WITHIN the `artifacts` arm of the split body's five-arm conditional,
// not a sixth arm.
//
// Three consequences follow from that placement, and all three are wanted:
//
//   1. THE EVIDENCE PANEL STAYS MOUNTED, at its shipped `w-1/3 shrink-0`,
//      still showing the PARENT ARTIFACT'S analysis state and error. That is
//      not an accident of layout — it is 07-UI-SPEC.md § "Three Vocabularies
//      Now" mechanism 1 (different regions) doing its work for free.
//   2. THE COALESCER'S TRIAGE LOCK STAYS ENGAGED, because the artifact stays
//      selected for the whole life of the drill-down. Newly recovered sources
//      accrue into the coalescing pill instead of shifting rows under a reader.
//      Neither `triageLocked` early return is touched.
//   3. LEAVING RETURNS TO THE ARTIFACTS TABLE WITH THE SAME ROW SELECTED,
//      because leaving clears a drill-down flag and nothing else.
//
// The toolbar's `Export inventory` CTA and its `exportTable` computation are
// likewise byte-unchanged — see § "Named Conflict 1" in the plan and in
// 07-UI-SPEC.md. The manifest gets its own scoped CTA in the header below.
//
// ===========================================================================
// THE TWO SCROLLERS ARE SIBLINGS, NEVER NESTED
// ===========================================================================
// This is the first surface in the product with two virtualised lists, and the
// tree's 32px rows and the viewer's 24px lines are two independent geometries.
// Nesting one scroller inside the other gives the inner one a parent whose
// height it cannot measure, and `RecycleScroller` computes its window from
// exactly that. They are two columns of one `gap-4` flex row, each owning its
// own overflow, and `SourceBrowser.spec.ts` asserts that neither scroller
// element is a descendant of the other.
//
// ===========================================================================
// THIS FILE MOUNTS PLAN 07-08's COMPONENTS AND ADDS NO RENDERING RULE
// ===========================================================================
// `SourceViewer.vue` and `SourcePositionStrip.vue` arrive COMPLETE, with their
// body states, their two bounds and their seven strip states already asserted
// where they live. This shell supplies the columns, the props and the selection
// wiring. Every rule about what a recovered byte may become on screen belongs
// to those files, and `git diff --exit-code` over both is part of this plan's
// verification gate.
//
// ===========================================================================
// AN OPERATOR CAN ALWAYS LEAVE
// ===========================================================================
// The header — and with it `Back to artifacts` — renders on ENTRY, before any
// read resolves, and SURVIVES A FAILED READ. Both the digest and the leave
// action are available synchronously from the selection, so neither waits on
// the backend. A failed source-list read surfaces in the TREE COLUMN, which is
// where there is room to say it; a header that vanished on failure would trap
// the operator in a drill-down they cannot leave. `Escape` from anywhere
// inside does the same thing as the button, and it never navigates away from
// the page and never changes the active tab.

import type {
  DeriveSourceResult,
  PageCursor,
  RecoveredSourcePage,
  RecoveredSourceRow,
  SourceMappingsResult,
} from "@defminer/engine/contract";
import { computed, ref, watch } from "vue";

import type {
  RecoveredSourcesRequest,
  RpcResult,
  SourceRef,
} from "../api/client";

import {
  EXPORT_MANIFEST_CTA,
  NOTHING_TO_EXPORT_LABEL,
} from "./export-contract";
import SourceTree from "./SourceTree.vue";
import SourceViewer from "./SourceViewer.vue";
import { FOCUS_RING_CLASS } from "./table-contract";

/**
 * The three client methods this surface reaches, declared STRUCTURALLY.
 *
 * The precedent both plan 07-07's tree and plan 07-08's viewer already set: a
 * real `BackendClient` is assignable without a cast, and a spec can supply a
 * fake without reimplementing twenty methods it never calls. The two derivation
 * methods are not called HERE at all — they are passed straight through to the
 * viewer, which owns its own derivation, its own retry and its own selection,
 * and which declares the identical pair for itself.
 */
type BrowserClient = {
  listRecoveredSources: (
    request: RecoveredSourcesRequest,
  ) => Promise<RpcResult<RecoveredSourcePage>>;
  deriveSource: (request: SourceRef) => Promise<RpcResult<DeriveSourceResult>>;
  readSourceMappings: (
    request: SourceRef,
  ) => Promise<RpcResult<SourceMappingsResult>>;
};

const { projectId, artifactSha256, client, analysisStoppedEarly } =
  defineProps<{
    projectId: string;
    /** The PARENT artifact. A fixed-length hex digest, DefMiner-computed, and
     *  the only value on the header strip that is not a copy constant. */
    artifactSha256: string;
    client: BrowserClient;
    /**
     * The parent artifact's analysis stopped early, so an empty source list is
     * not the same fact as "the bundle carried no map".
     *
     * REQUIRED AND EXPLICITLY BOOLEAN rather than optional: a caller has to
     * state what it knows, and the tree's empty state changes on it.
     */
    analysisStoppedEarly: boolean;
  }>();

const emit = defineEmits<{
  /** Leave the drill-down. THE PAGE'S TO PERFORM, exactly as `open-health` is:
   *  this component does not know what it is a state of. */
  leave: [];
  "open-health": [];
  "open-evidence": [];
  /**
   * Open the shipped export dialog against the sources table.
   *
   * THE PAGE'S TO PERFORM, exactly as `open-health` is — this component does
   * not own the dialog and does not know what it is a state of. It carries the
   * ROW COUNT, because the dialog's zero-row rule reads a number and the only
   * component that has taken that number is this one. Emitting it beats having
   * the page re-count: two counts of one set are two claims about it.
   */
  "export-manifest": [rows: number];
}>();

// ---------------------------------------------------------------------------
// COPY — 07-UI-SPEC.md § "Copywriting Contract", VERBATIM
// ---------------------------------------------------------------------------
// Every string below is DefMiner-authored and declared as a NAMED CONSTANT.
// NO TARGET-CONTROLLED STRING REACHES THE HEADER STRIP, and that is a property
// of the SHAPE rather than of anyone's discipline: the strip renders exactly
// three things — two copy constants and a fixed-length hex digest — and there
// is no field on it a later edit could interpolate a `sources` label into. The
// same structural invariant governs the shipped toolbar.

const LEAVE_LABEL = "Back to artifacts";

/**
 * The ONE reason a disabled export states.
 *
 * THE SHIPPED PATTERN, NOT A NEW ONE: `ExportDialog.vue` puts
 * `NOTHING_TO_EXPORT_LABEL` ON THE BUTTON when the count is zero, rather than
 * in a tooltip, because a tooltip is not reachable by keyboard and is not read
 * aloud. It NAMES THE CTA FIRST, so the operator can still tell what the
 * control is for while it is refusing to act.
 *
 * The pending reason is not "loading": it is the honest statement that DefMiner
 * has not counted yet. A count that is still resolving and a count of zero are
 * different facts on this strip for the same reason they are different facts in
 * the `Sources` cell that led here.
 *
 * BUILT FROM {@link EXPORT_MANIFEST_CTA} RATHER THAN RETYPED, so the CTA's
 * words exist in exactly one place.
 *
 * THIS STRIP USED TO CARRY A THIRD LABEL AND IT IS DELETED, NOT REPURPOSED.
 * Plan 07-09 declared one for the state in which the CTA was present but not
 * yet wired, and named it a transitional string that plan 07-10 must remove
 * (broken-windows ledger entry 117). Plan 07-10 wired the CTA, so the constant
 * and the `canExport` prop it was selected by are both gone — a transitional
 * string kept past its transition is a stub with a new job. Its wording is
 * deliberately not quoted here: a duplication scan should find zero copies of a
 * deleted constant, including in prose.
 */
const EXPORT_COUNT_PENDING_LABEL = `${EXPORT_MANIFEST_CTA} — counting the recovered sources`;

// ---------------------------------------------------------------------------
// THE EAGER, BOUNDED READ
// ---------------------------------------------------------------------------
//
// Pages are drawn EAGERLY TO THE BOUND rather than on scroll, because the tree
// is a HIERARCHY OVER THE WHOLE SET and 05-UI-SPEC.md bans presenting a subset
// as the whole set. A source row is metadata only — label, index, digest, byte
// length, producibility — and carries no content, so the whole set for one
// artifact is small even when its count is large.
//
// `returned` and `total` are two fields off the answer and one is never derived
// from the other: deriving one would derive a claim about the database from a
// fact about the renderer's memory. `bound` is echoed by the backend so the
// tree's sentence reads its bound from the answer rather than from a constant
// each side holds a copy of.

type LoadState = "loading" | "failed" | "ready";

const loadState = ref<LoadState>("loading");
const rows = ref<readonly RecoveredSourceRow[]>([]);
const total = ref(0);
const returned = ref(0);
const bound = ref(0);

/**
 * Which read the answers belong to.
 *
 * Bumped on every (re)load and checked after each await, the shipped
 * generation-guard shape: a page that resolves after the operator has left and
 * re-entered against a different artifact must not be written into this one's
 * list. Without it a slow first read can overwrite a fast second one, and the
 * tree would show one bundle's sources under another bundle's digest.
 */
let generation = 0;

/**
 * How many rows the manifest would cover — `null` until the read answers.
 *
 * NULL IS NOT ZERO. It is the same distinction the `Sources` cell that led here
 * is built around, one level down: a disabled control has to state WHICH reason
 * it is disabled for, and "nothing to export" is a claim DefMiner cannot make
 * before it has looked.
 */
const rowCount = computed<number | null>(() =>
  loadState.value === "ready" ? total.value : null,
);

async function load(): Promise<void> {
  const mine = (generation += 1);
  loadState.value = "loading";
  rows.value = [];

  const collected: RecoveredSourceRow[] = [];
  let cursor: PageCursor | null = null;

  for (;;) {
    const result = await client.listRecoveredSources({
      projectId,
      artifactSha256,
      cursor,
    });
    if (mine !== generation) return;

    if (!result.ok) {
      // THE FAILURE IS THE TREE COLUMN'S TO SAY, and the header survives it.
      // A call that did not answer is not evidence of anything — least of all
      // of "this bundle carried no inline map", which is what an empty list
      // would claim.
      loadState.value = "failed";
      rows.value = [];
      return;
    }

    collected.push(...result.value.rows);
    total.value = result.value.total;
    returned.value = collected.length;
    bound.value = result.value.bound;
    cursor = result.value.nextCursor;

    // The backend stops filling at its own bound; `nextCursor` is null once the
    // data ran out. The `>=` guard is the belt to that braces: a backend that
    // answered a cursor past its own bound would otherwise loop here.
    if (cursor === null || collected.length >= result.value.bound) break;
  }

  rows.value = collected;
  loadState.value = "ready";
}

// ---------------------------------------------------------------------------
// SELECTION
// ---------------------------------------------------------------------------

const selectedIndex = ref<number | null>(null);

const selectedRow = computed<RecoveredSourceRow | null>(
  () =>
    rows.value.find((row) => row.sourceIndex === selectedIndex.value) ?? null,
);

/**
 * The sighting the viewer produces, or `null` before one is picked.
 *
 * THE ABSENT FIELD IS THE DESIGN. There is no request id on a `SourceRef`,
 * because the backend reads which request produced this sighting out of
 * `source_sightings`. A caller that could name the request AND the digest it
 * will be compared against could be shown any stored body presented as this
 * bundle's — which is D-24 answering a question the caller already answered.
 *
 * `artifactSha256` NAMES THE SIGHTING; NAMING A SIGHTING IS NOT NAMING A DIGEST
 * TO BE COMPARED AGAINST (07-REVIEW.md HI-03, finding W-3). `mapSha256` is
 * content-addressed over the decoded map and never over the bundle, so two
 * bundles can carry the same map — a ref built from `(map, index)` alone does
 * not name ONE sighting, and the backend would answer with whichever row it
 * reached first. The backend still reads the digest it re-verifies the reloaded
 * bytes against out of the matched row, so this field decides which row is
 * matched and decides nothing about whether the bytes are accepted.
 *
 * IT COMES FROM THIS COMPONENT'S OWN PROP AND NEVER FROM A ROW FIELD. The prop
 * is the PARENT artifact — the bundle whose drill-down the operator is standing
 * in — and it is the same value already on the header strip. Reading it off a
 * row would let a row disagree with the tree it is being displayed inside.
 */
const sourceRef = computed<SourceRef | null>(() => {
  const row = selectedRow.value;
  return row === null
    ? null
    : {
        projectId,
        artifactSha256,
        mapSha256: row.mapSha256,
        sourceIndex: row.sourceIndex,
      };
});

/** TARGET-CONTROLLED and unsanitised, exactly as D-06 stores it. It goes to the
 *  viewer, which is the component that owns what may be done with it. Nothing
 *  in this file renders it. */
const selectedLabel = computed<string | null>(
  () => selectedRow.value?.sourcesVerbatim ?? null,
);

function select(sourceIndex: number): void {
  selectedIndex.value = sourceIndex;
}

const exportLabel = computed<string>(() => {
  if (rowCount.value === null) return EXPORT_COUNT_PENDING_LABEL;
  if (rowCount.value === 0) return NOTHING_TO_EXPORT_LABEL;
  return EXPORT_MANIFEST_CTA;
});

const exportDisabled = computed<boolean>(
  () => rowCount.value === null || rowCount.value === 0,
);

/**
 * Ask the page to open the export dialog for this artifact's manifest.
 *
 * THE GUARD IS HERE AND NOT ONLY ON `disabled`, the shipped double-submit
 * shape: the attribute is what the operator sees, this is what holds when
 * anything else calls in. And the count is READ ONCE AND EMITTED, so the
 * number the dialog disables against is the number the button was enabled
 * against — not a second read that could disagree with it.
 */
function requestManifestExport(): void {
  const rows = rowCount.value;
  if (rows === null || rows === 0) return;
  emit("export-manifest", rows);
}

// A NEW ARTIFACT IS A NEW READ AND A CLEARED SELECTION. `immediate` because the
// first read is the mount: a component that waited for a prop to CHANGE would
// render its loading state forever on the artifact it was mounted against.
watch(
  () => [projectId, artifactSha256] as const,
  () => {
    selectedIndex.value = null;
    void load();
  },
  { immediate: true },
);

// THERE IS NO TOP-LEVEL COMMENT INSIDE THE `<template>` BELOW. A comment there
// is a NODE: it would make this component a FRAGMENT, `wrapper.element` would
// resolve to the mount container rather than to the root div, and every
// subtree assertion in the spec would read against the wrong element. The trap
// StatusBadge.vue, ProducibilityMark.vue and EvidencePanel.vue each record.
</script>

<template>
  <div
    class="flex h-full min-h-0 flex-col gap-4"
    data-defminer-source-browser
    tabindex="-1"
    @keydown.esc="emit('leave')"
  >
    <!-- ===================================================================
         THE HEADER STRIP — fixed height, no wrap, no scroll, and it renders
         on ENTRY before any read resolves. Three elements at the shipped
         `ml-4` separation: a text button, a fixed-length digest, a text
         button. It SURVIVES A FAILED READ: an operator who cannot leave a
         failed drill-down is trapped in it.
         =================================================================== -->
    <div
      class="flex h-12 shrink-0 items-center overflow-hidden border-b border-surface-600 px-2 whitespace-pre"
      data-defminer-drilldown-header
    >
      <button
        type="button"
        :class="[
          FOCUS_RING_CLASS,
          'shrink-0 border border-surface-600 px-2 py-1 text-xs font-semibold',
        ]"
        data-defminer-drilldown-leave
        @click="emit('leave')"
      >
        {{ LEAVE_LABEL }}
      </button>

      <!-- MONO, for the reason `ArtifactsTable.vue`'s header already gives:
           `0`/`O` and `l`/`1` are the same picture in a proportional face, and
           two digests differing in one of them are indistinguishable. -->
      <span
        class="ml-4 min-w-0 overflow-hidden font-mono text-xs whitespace-pre"
        data-defminer-drilldown-digest
        >{{ artifactSha256 }}</span
      >

      <button
        type="button"
        :disabled="exportDisabled"
        :class="[
          FOCUS_RING_CLASS,
          'ml-4 shrink-0 border border-surface-600 px-2 py-1 text-xs font-semibold',
        ]"
        data-defminer-drilldown-export
        @click="requestManifestExport()"
      >
        {{ exportLabel }}
      </button>
    </div>

    <!-- ===================================================================
         THE TWO COLUMNS. The tree at a quarter width, the viewer at the
         remaining width, `gap-4` between them — the same utility the shipped
         split body uses. THE TWO SCROLLERS INSIDE THEM ARE SIBLINGS: neither
         is a descendant of the other, which is what keeps two independent row
         geometries measurable.
         =================================================================== -->
    <div class="flex min-h-0 flex-1 gap-4">
      <div class="w-1/4 min-w-0 shrink-0">
        <SourceTree
          :load-state="loadState"
          :rows="rows"
          :total="total"
          :returned="returned"
          :bound="bound"
          :analysis-stopped-early="analysisStoppedEarly"
          :selected-index="selectedIndex"
          @select="select"
          @retry="void load()"
          @open-health="emit('open-health')"
          @open-evidence="emit('open-evidence')"
        />
      </div>

      <div class="min-w-0 flex-1">
        <SourceViewer
          :client="client"
          :source-ref="sourceRef"
          :label="selectedLabel"
          @open-health="emit('open-health')"
        />
      </div>
    </div>
  </div>
</template>
