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

import { computed, inject, onMounted, ref } from "vue";

import type { DefMinerBackendSdk, ObservationRow } from "./api/client";
import { createBackendClient } from "./api/client";
import type { ArtifactRow } from "./backend";
import { SDK_INJECTION_KEY } from "./backend";
import ArtifactsTable from "./components/ArtifactsTable.vue";
import ObservationsTable from "./components/ObservationsTable.vue";
import type { InventoryStore, PageReader } from "./stores/inventory";
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
        <!-- `:analyses` and `:affected-filter` ARE EXPLICITLY NULL, and the
             null is the honest answer rather than an omission. The shipped
             paged reads select no `scan_state` and there is no endpoint that
             returns one, so this page has nothing to say about analysis state
             yet; a per-row badge would have to be invented, and inventing
             "Complete" for an unknown analysis is precisely the silence UI-09
             forbids. Same for the narrowing filter: the backend's statement
             matrix has no scan-state filter column, so no single-column filter
             can express "only the affected artifacts". Both become real when
             the reads carry the state — see ArtifactsTable.vue's header. -->
        <ArtifactsTable
          v-if="activeTab === 'artifacts'"
          :store="artifacts"
          :analyses="null"
          :affected-filter="null"
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

      <aside
        class="flex w-1/3 shrink-0 flex-col border-l border-surface-600 pl-4"
        aria-label="Evidence"
      >
        <h2 class="text-xs font-semibold">Evidence</h2>
        <p class="mt-2 text-surface-400">No row selected.</p>
      </aside>
    </div>
  </div>
</template>
