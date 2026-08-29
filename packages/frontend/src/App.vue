<script setup lang="ts">
// The DefMiner workspace page: the three regions 05-UI-SPEC.md § Data &
// Interaction Contract fixes, top to bottom — a 48px toolbar, a tab strip, and
// a split body.
//
// WHAT CHANGED IN PLAN 05-09. The tracer's inline artifacts rendering is gone.
// It existed to prove one path from the shipped SQLite table to rendered text,
// and it did; keeping it beside the real table would leave two renderings of the
// same rows, one of which nobody maintains. The two entity tabs now mount
// `ArtifactsTable` and `ObservationsTable` over the keyset stores. Health and
// Settings still route and still render from the first paint — plans 05-10 and
// 05-12 own their bodies, and reaching into them here would put two plans in one
// file for no gain.

import type { PageRequest, ScanState } from "@defminer/engine/contract";
import { DEGRADED_ANALYSIS_FILTER } from "@defminer/engine/contract";
import { computed, inject, onMounted, onUnmounted, ref, watch } from "vue";

import type {
  AnalysisKey,
  DefMinerBackendSdk,
  ObservationRow,
  PanelAnalysis,
  RetryOutcome,
  RpcResult,
} from "./api/client";
import { createBackendClient } from "./api/client";
import type { ArtifactRow } from "./backend";
import { SDK_INJECTION_KEY } from "./backend";
import ArtifactsTable from "./components/ArtifactsTable.vue";
import EvidencePanel from "./components/EvidencePanel.vue";
import ObservationsTable from "./components/ObservationsTable.vue";
import type { InvalidationCoalescer } from "./stores/coalescer";
import { createCoalescer } from "./stores/coalescer";
import type {
  InventoryStore,
  PageReader,
  TriageGate,
} from "./stores/inventory";
import { createInventoryStore } from "./stores/inventory";

/**
 * The tab strip's contents, FROZEN and declared at module scope.
 *
 * Three properties of this list are contract, not convenience:
 *
 *  1. Every label is DefMiner-authored. No target-controlled string ever
 *     reaches a tab — a tab is chrome, and chrome that a hostile host can write
 *     into is chrome the operator cannot trust to mean what it says.
 *  2. It renders on FIRST PAINT, before any query resolves, and it renders
 *     WITHOUT counts. A count that is still resolving must render as absent,
 *     never as `0`: a zero reads as "nothing found here" and stops the operator
 *     opening the one tab that had the finding.
 *  3. Order is declaration order and is never sorted at runtime, so the tab an
 *     operator reaches for by muscle memory does not move under them.
 *
 * `Health` and `Settings` are fixed labels from the layout contract; the other
 * two name entity classes DefMiner itself defines.
 */
const TABS = Object.freeze([
  { id: "artifacts", label: "Artifacts" },
  { id: "observations", label: "Observations" },
  { id: "health", label: "Health" },
  { id: "settings", label: "Settings" },
] as const);

type TabId = (typeof TABS)[number]["id"];

const activeTab = ref<TabId>("artifacts");

// `inject` rather than an import. The SDK is a per-instance object Caido hands
// to `init()`; typed as possibly-undefined because a component mounted without
// a provider (a spec that forgets the stub) must render the shell and SAY SO,
// not throw during setup and leave a blank page.
//
// TYPED AS THE CLIENT'S OWN STRUCTURAL SURFACE (P5-D41): every module declares
// the piece of the SDK it touches rather than the whole. It is also what makes
// a spec's stub a literal instead of a cast — a stub that has to be cast is a
// stub that stops failing when the real surface changes.
const sdk = inject<DefMinerBackendSdk | undefined>(
  SDK_INJECTION_KEY,
  undefined,
);

/**
 * The project id the page ASKS under.
 *
 * DELIBERATELY A PLACEHOLDER AND NOT A REAL ID. The backend discards the
 * caller's `projectId` on every paged read and substitutes its own
 * lifecycle-resolved value — `scopedTo(req, currentProjectId())` in
 * packages/backend/src/index.ts, whose comment says why: trusting the field
 * would let anything holding the RPC handle page another project's rows out of
 * the one shared SQLite file (T-05-34). So this value is never the answer to
 * "which project"; it is a required field on a request whose scope the server
 * decides. Naming it makes that visible instead of leaving a mystery literal.
 */
const SERVER_SCOPED_PROJECT = "server-scoped";

const client = sdk === undefined ? null : createBackendClient(sdk);

/**
 * A reader for a table the SDK cannot serve.
 *
 * ANSWERS A FAILURE VALUE, NEVER REJECTS, and never resolves an empty page. An
 * empty page would render the "Nothing analysed on this target yet" screen over
 * a plugin that is not connected at all, which tells the operator the opposite
 * of the truth about what they are looking at — the same argument the design
 * contract makes about an errored suppressions list rendering as empty.
 */
const unavailable =
  <TRow,>(): PageReader<TRow> =>
  () =>
    Promise.resolve({ ok: false, reason: "rpc-rejected", versions: null });

const countUnavailable = () =>
  Promise.resolve({
    ok: false,
    reason: "rpc-rejected",
    versions: null,
  } as const);

const artifacts: InventoryStore<ArtifactRow> =
  createInventoryStore<ArtifactRow>({
    projectId: SERVER_SCOPED_PROJECT,
    table: "artifacts",
    // The shipped sort keys, from the backend's own frozen lookup. Newest first:
    // the operator's question on arriving is "what has this target served me
    // lately", not "what is alphabetically first".
    sortKey: "last_seen",
    direction: "desc",
    readPage:
      client === null
        ? unavailable<ArtifactRow>()
        : (request) => client.listArtifactsPage(request),
    countRows: client === null ? countUnavailable : client.countInventory,
  });

const observations: InventoryStore<ObservationRow> =
  createInventoryStore<ObservationRow>({
    projectId: SERVER_SCOPED_PROJECT,
    table: "observations",
    sortKey: "observed_at",
    direction: "desc",
    readPage:
      client === null
        ? unavailable<ObservationRow>()
        : (request) => client.listObservationsPage(request),
    countRows: client === null ? countUnavailable : client.countInventory,
  });

const activePanelId = computed(() => `defminer-panel-${activeTab.value}`);

// ---------------------------------------------------------------------------
// UI-07 — THE COALESCER, SUBSCRIBED
// ---------------------------------------------------------------------------
//
// PLAN 05-08 BUILT THE COALESCER AND NOTHING SUBSCRIBED IT. Left that way its
// mid-triage guarantee is a property of a module rather than of the page: the
// backend emits an invalidation summary per category per drain pass, the
// frontend receives none of them, and the counts on screen simply go stale.
// Wiring it here is what makes "the table does not re-order while a row is
// selected or the panel is open" true of the running page.
//
// THE GATE SPANS BOTH TABLES, not just the active one. `triageLocked` is the
// flag the suppression rule reads, and a panel opened from the observations
// tab locks triage exactly as one opened from artifacts does — the operator is
// mid-triage either way, and a gate that watched one store would let a
// reaction land the moment they switched tabs.
const triageGate: TriageGate = {
  projectId: computed(() => artifacts.projectId.value),
  triageLocked: computed(
    () => artifacts.triageLocked.value || observations.triageLocked.value,
  ),
  refresh: async () => {
    await artifacts.refresh();
    await observations.refresh();
  },
};

const coalescer: InvalidationCoalescer | null =
  client === null
    ? null
    : createCoalescer({
        gate: triageGate,
        subscribe: client.subscribeInvalidation,
      });

// THE STOP HANDLE IS OWNED, NOT DROPPED. Research P-04 is entirely about this
// being forgotten: a subscription that outlives its component keeps a dead
// page's handler alive for the life of the Caido session.
onUnmounted(() => {
  coalescer?.stop();
});

const pendingCount = computed<number>(() => coalescer?.pendingTotal.value ?? 0);

/** 05-UI-SPEC.md § "Copywriting Contract": **{n} new since you opened this —
 *  Refresh**. DefMiner-authored end to end; the only interpolation is an
 *  integer. */
const pillLabel = computed<string>(
  () => `${String(pendingCount.value)} new since you opened this — Refresh`,
);

/** The pill's ONLY caller. The count never auto-applies (UI-SPEC Open Decision
 *  D4): applying it re-orders the table, and the operator asks for that. */
async function applyPending(): Promise<void> {
  await coalescer?.applyPending();
}

// ---------------------------------------------------------------------------
// UI-09's MARKING, ON THE RUNNING PAGE
// ---------------------------------------------------------------------------
//
// PLAN 05-09 SHIPPED THE MARKING MECHANISM AND COULD MARK NOTHING. Its own
// summary records why, measured against the shipped reads rather than assumed:
// the paged statements carried no `scan_state` and no endpoint returned one, so
// this file passed `:analyses="null"` and the badge and banner stayed dark. It
// refused to mark UI-09 complete for exactly that reason.
//
// The page rows now carry the state. The map below is built from what the
// operator can currently SEE — the resident window — which is what makes the
// banner's floor statement true rather than decorative: it counts the artifacts
// actually contributing to the numbers on screen.
//
// AN ARTIFACT WITH NO ANALYSIS IS ABSENT FROM THE MAP, NOT PRESENT WITH A
// GUESS. `scan_state` is `null` for a sighted-but-unanalysed artifact, and the
// table reads an absent entry as UNKNOWN and renders nothing (P5-D66).

/**
 * States a retry moved, keyed by digest.
 *
 * WHY AN OVERLAY RATHER THAN A REFETCH. 05-UI-SPEC.md: "the table does not
 * re-order or re-render rows while a row is selected or the panel is open".
 * A retry happens with the panel open BY CONSTRUCTION — it is invoked from
 * inside it — so refetching the page to pick the new state up would re-order
 * the table underneath the operator at the exact moment they are mid-triage,
 * which is the row shift the coalescer exists to prevent, arriving through the
 * one path the coalescer does not watch.
 *
 * Every value here was READ BACK from the row by the backend. Nothing
 * optimistic is ever written into it.
 */
const retriedStates = ref<Map<string, ScanState>>(new Map());

const artifactAnalyses = computed<ReadonlyMap<string, ScanState>>(() => {
  const states = new Map<string, ScanState>();
  for (const row of artifacts.rows.value) {
    if (row.scan_state !== null) states.set(row.sha256, row.scan_state);
  }
  for (const [sha256, state] of retriedStates.value) {
    if (states.has(sha256)) states.set(sha256, state);
  }
  return states;
});

/**
 * The narrowing filter the partial-view banner offers.
 *
 * ONE OBJECT, DECLARED IN THE ENGINE CONTRACT AND IMPORTED BY BOTH SIDES. The
 * backend answers an unrecognised filter column with an empty exhausted page,
 * by design (P5-D39), so a column name spelled twice is a "Show only affected
 * artifacts" button that silently narrows to nothing.
 */
const AFFECTED_FILTER: PageRequest["filter"] = DEGRADED_ANALYSIS_FILTER;

// ---------------------------------------------------------------------------
// THE EVIDENCE PANEL'S SUBJECT
// ---------------------------------------------------------------------------

/**
 * The digest the panel is showing.
 *
 * BOTH TABLES CAN NAME ONE, and they name it differently: an artifact row is
 * keyed by its digest and an observation row by `digest:requestId`, because an
 * observation is a SIGHTING of an artifact and two sightings of the same bytes
 * are two rows. The panel's subject is the ARTIFACT either way — that is where
 * the analysis lives — so the observation key is split rather than a second
 * panel subject being invented.
 */
const selectedSha256 = computed<string | null>(() => {
  if (activeTab.value === "artifacts") return artifacts.selectedRowKey.value;
  if (activeTab.value === "observations") {
    const key = observations.selectedRowKey.value;
    if (key === null) return null;
    const [sha256] = key.split(":");
    return sha256 ?? null;
  }
  return null;
});

const panelAnalysis = ref<PanelAnalysis | null>(null);
const panelLoading = ref(false);
const panelFailed = ref(false);

/**
 * Bumped on every selection change, and checked after the await.
 *
 * A read that resolves after the operator has clicked a second row is
 * answering a question nobody is asking any more, and applying it puts one
 * artifact's analysis under another artifact's heading — the same generation
 * guard the inventory store uses, for the same reason.
 */
let panelGeneration = 0;

async function loadPanelAnalysis(sha256: string | null): Promise<void> {
  panelGeneration += 1;
  const mine = panelGeneration;
  panelFailed.value = false;

  if (sha256 === null) {
    panelAnalysis.value = null;
    panelLoading.value = false;
    return;
  }
  if (client === null) {
    // A FAILURE, NOT AN EMPTY PANEL. An empty frame over a plugin that is not
    // connected tells the operator there is no evidence for this row, which is
    // the opposite of the truth about what they are looking at.
    panelAnalysis.value = null;
    panelLoading.value = false;
    panelFailed.value = true;
    return;
  }

  panelLoading.value = true;
  const result = await client.getArtifactAnalysis({
    projectId: SERVER_SCOPED_PROJECT,
    sha256,
  });
  if (panelGeneration !== mine) return;
  panelLoading.value = false;
  if (!result.ok) {
    panelAnalysis.value = null;
    panelFailed.value = true;
    return;
  }
  panelAnalysis.value = result.value;
}

watch(selectedSha256, (sha256) => {
  void loadPanelAnalysis(sha256);
});

/** The retry, routed through the typed client. Answers a VALUE on every path —
 *  a component that had to catch would be a component whose failure Caido
 *  swallows. */
function retryAnalysis(key: AnalysisKey): Promise<RpcResult<RetryOutcome>> {
  if (client === null) {
    return Promise.resolve({
      ok: false,
      reason: "rpc-rejected",
      versions: null,
    });
  }
  return client.retryAnalysis(key);
}

/** Record what the backend read back, without refetching the page. See
 *  {@link retriedStates}. */
/**
 * Dismiss the panel.
 *
 * CLEARS THE SELECTION AND THE PANEL FLAG ON BOTH STORES, AND NOTHING ELSE. It
 * does not apply the pending count — that is the pill's, and only the operator
 * presses it. A close that silently re-ordered the table would be the row
 * shift the flags exist to prevent, arriving the moment they stopped looking.
 */
function closePanel(): void {
  artifacts.clearSelection();
  artifacts.closePanel();
  observations.clearSelection();
  observations.closePanel();
}

function onRetried(state: ScanState | null): void {
  const sha256 = selectedSha256.value;
  if (sha256 === null || state === null) return;
  const next = new Map(retriedStates.value);
  next.set(sha256, state);
  retriedStates.value = next;
  if (panelAnalysis.value !== null) {
    panelAnalysis.value = { ...panelAnalysis.value, scanState: state };
  }
}

onMounted(() => {
  // Deliberately not `await`ed in an async `onMounted`: the tab strip and the
  // rest of the shell must be on screen before any of this resolves, and a
  // rejected promise here must not escape the lifecycle hook. Every one of these
  // answers with a VALUE rather than a rejection (api/client.ts's whole reason
  // to exist), so the failure path is a rendered error state, not a stack trace
  // Caido would swallow.
  if (client !== null) {
    void client.checkContractVersion();
  }
  void artifacts.loadFirstPage();
  void observations.loadFirstPage();
});

/** The table asked for Health. The TAB STRIP is this component's to move; a
 *  table that switched tabs itself would be a component writing to a sibling. */
function openHealth(): void {
  activeTab.value = "health";
}
</script>

<template>
  <!--
    Colours are the six @caido/tailwindcss roles and nothing else. There is no
    hex literal in this file: `--c-*` is operator-customisable, and a hardcoded
    colour would survive their theme change as the one unreadable element on the
    page. There is no `font-family` either — preflight is off, so family and root
    size are inherited from Caido; `font-mono` in the tables below is a Tailwind
    utility, not an authored declaration.
  -->
  <div class="flex h-full flex-col bg-surface-900 text-sm text-surface-100">
    <!-- Region 1 — toolbar. 48px is the `2xl` scale value, and it is fixed:
         the tab strip and body are measured against it. -->
    <header
      class="flex h-12 shrink-0 items-center border-b border-surface-600 bg-surface-800 px-4"
    >
      <h1 class="text-2xl font-semibold leading-tight">DefMiner</h1>

      <!-- The coalescing pill slot. It renders ONLY when there is something
           pending: a pill reading "0 new" is chrome that says nothing and
           trains the operator to stop reading it. -->
      <button
        v-if="pendingCount > 0"
        id="defminer-coalescing-pill"
        type="button"
        class="ml-4 border border-surface-600 px-2 py-1 text-xs font-semibold focus:ring-2 focus:ring-primary-500"
        @click="void applyPending()"
      >
        {{ pillLabel }}
      </button>
    </header>

    <!-- Region 2 — tab strip. `flex-wrap` is the whole layout decision: when the
         tabs do not fit they WRAP to a second row. Never a horizontal scroll
         container and never an overflow menu, because both hide a tab behind an
         interaction, and a hidden tab in a triage surface is a finding the
         operator never opens. -->
    <nav
      class="flex shrink-0 flex-wrap gap-2 border-b border-surface-600 bg-surface-800 px-4 py-2"
      aria-label="DefMiner sections"
    >
      <button
        v-for="tab in TABS"
        :id="`defminer-tab-${tab.id}`"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="tab.id === activeTab"
        :aria-controls="`defminer-panel-${tab.id}`"
        class="border-b-2 px-2 py-1 text-xs font-semibold focus:ring-2 focus:ring-primary-500"
        :class="
          tab.id === activeTab
            ? 'border-primary-500 text-primary-500'
            : 'border-surface-600 text-surface-400'
        "
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <!-- Region 3 — split body. The evidence panel is a PERSISTENT region, not an
         overlay: an overlay forces the operator to close it between rows, which
         is the wrong ergonomics for triaging thousands of items. -->
    <div class="flex min-h-0 flex-1 gap-4 p-4">
      <section
        :id="activePanelId"
        class="flex min-w-0 flex-1 flex-col"
        role="tabpanel"
        :aria-labelledby="`defminer-tab-${activeTab}`"
      >
        <!-- THE ARTIFACTS TABLE IS MARKED; THE OBSERVATIONS TABLE IS NOT,
             AND THE NULL THERE IS THE HONEST ANSWER RATHER THAN AN OMISSION.
             An observation is a SIGHTING of an artifact and carries no analysis
             of its own — the analysis lives on the bytes, which is where the
             read carries it. Marking observation rows would mean attributing an
             artifact's state to each of its sightings, and a sighting whose
             artifact is outside the resident window would be marked as unknown
             beside identical ones that were not. The column keeps its position
             either way. -->
        <ArtifactsTable
          v-if="activeTab === 'artifacts'"
          :store="artifacts"
          :analyses="artifactAnalyses"
          :affected-filter="AFFECTED_FILTER"
          @open-health="openHealth"
        />

        <ObservationsTable
          v-else-if="activeTab === 'observations'"
          :store="observations"
          :analyses="null"
          :affected-filter="null"
          @open-health="openHealth"
        />

        <!-- Health and Settings ROUTE and RENDER from the first paint; they gain
             real bodies in plans 05-10 and 05-12. A tab is never removed, never
             disabled and never hidden on account of having no body yet — the
             strip is a fixed map of the surface. -->
        <div v-else class="py-16">
          <h2 class="text-2xl font-semibold leading-tight">
            Nothing analysed on this target yet
          </h2>
          <p class="mt-4 text-surface-400">
            DefMiner analyses JavaScript as you browse, in the background.
            Browse the target with the Caido proxy running and assets appear
            here as they are analysed. DefMiner sends nothing to the target to
            do this.
          </p>
        </div>
      </section>

      <!-- THE PANEL IS A REGION OF THE SPLIT BODY, NOT AN OVERLAY, AND IT IS
           MOUNTED UNCONDITIONALLY. It keeps its width here and its own fixed
           height inside the component, across a selection change and across a
           tab change between the two entity tables — a panel that came and
           went would reflow the body on every row click. -->
      <div class="w-1/3 shrink-0">
        <EvidencePanel
          :project-id="SERVER_SCOPED_PROJECT"
          :selected-sha256="selectedSha256"
          :analysis="panelAnalysis"
          :loading="panelLoading"
          :failed="panelFailed"
          :evidence="null"
          :source-request-id="null"
          :retry="retryAnalysis"
          @retried="onRetried"
          @close="closePanel"
        />
      </div>
    </div>
  </div>
</template>
