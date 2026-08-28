<script setup lang="ts">
// The DefMiner workspace page: the three regions 05-UI-SPEC.md § Data &
// Interaction Contract fixes, top to bottom — a 48px toolbar, a tab strip, and
// a split body.
//
// WHAT THIS COMPONENT IS FOR, AND WHAT IT DELIBERATELY IS NOT. This is the
// tracer slice: one path from the shipped SQLite `artifacts` table to rendered
// text, proving the architecture end to end. The virtualised keyset table
// (05-07), the evidence panel (05-10), the export dialog (05-11) and the
// settings form (05-12) each land in their own plan. Pre-empting them here
// would mean guessing at schemas Phases 3 and 4 have not defined yet.

import { inject, onMounted, ref } from "vue";

import type { ArtifactRow, DefMinerSDK } from "./backend";
import { SDK_INJECTION_KEY } from "./backend";

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

/**
 * The artifacts query's state, as a closed vocabulary rather than a pair of
 * booleans. `loading`/`error` as separate flags admits the state where both are
 * true, which renders two contradictory things at once.
 */
type LoadState = "loading" | "ready" | "failed";

const loadState = ref<LoadState>("loading");
const rows = ref<ArtifactRow[]>([]);

// `inject` rather than an import. The SDK is a per-instance object Caido hands
// to `init()`; typed as possibly-undefined because a component mounted without
// a provider (a spec that forgets the stub) must render the shell and say so,
// not throw during setup and leave a blank page.
const sdk = inject<DefMinerSDK | undefined>(SDK_INJECTION_KEY, undefined);

onMounted(() => {
  if (sdk === undefined) {
    loadState.value = "failed";
    return;
  }

  // Deliberately not `await`ed in an async `onMounted`: the tab strip and the
  // rest of the shell must be on screen before this resolves, and a rejected
  // promise here must not escape the lifecycle hook.
  void sdk.backend
    .getArtifacts()
    .then((result) => {
      rows.value = result;
      loadState.value = "ready";
    })
    .catch(() => {
      // The rejection value is DISCARDED ON PURPOSE. An error thrown across the
      // RPC boundary can quote target-controlled bytes, and 05-UI-SPEC.md's
      // copywriting rule outranks every other rule on this page: no sentence
      // ever interpolates a target-controlled string. The operator gets a
      // DefMiner-authored explanation of what to do; the raw text is not
      // rendered anywhere.
      loadState.value = "failed";
    });
});

/** A millisecond epoch as a fixed-width, sortable, locale-independent string. */
function formatTimestamp(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19);
}
</script>

<template>
  <!--
    Colours are the six @caido/tailwindcss roles and nothing else. There is no
    hex literal in this file: `--c-*` is operator-customisable, and a hardcoded
    colour would survive their theme change as the one unreadable element on the
    page. There is no `font-family` either — preflight is off, so family and root
    size are inherited from Caido; `font-mono` below is a Tailwind utility, not
    an authored declaration.
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
        class="border-b-2 px-2 py-1 text-xs font-semibold"
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
        :id="`defminer-panel-${activeTab}`"
        class="flex min-w-0 flex-1 flex-col"
        role="tabpanel"
        :aria-labelledby="`defminer-tab-${activeTab}`"
      >
        <template v-if="activeTab === 'artifacts'">
          <p v-if="loadState === 'loading'" class="text-surface-400">
            Loading artifacts…
          </p>

          <!-- DefMiner-authored, every word of it. No part of the rejection
               value reaches this element. -->
          <p v-else-if="loadState === 'failed'" class="text-danger-500">
            Could not load artifacts. The DefMiner backend did not answer — it
            may be busy analysing a large bundle, which blocks its single
            thread. Open Health to see queue depth and dropped count.
          </p>

          <div v-else-if="rows.length === 0" class="py-16">
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

          <div v-else class="flex min-h-0 flex-col overflow-hidden">
            <!-- Header and rows are both 32px, the `xl` scale value. That
                 height is load-bearing rather than cosmetic: the virtualised
                 scroller plan 05-07 puts here needs a FIXED item size to
                 compute scroll geometry, and a cell allowed to wrap destroys
                 it. Cells never wrap — hence `whitespace-pre` and
                 `overflow-hidden` on every one of them. -->
            <div
              class="flex h-8 shrink-0 items-center gap-4 border-b border-surface-600 bg-surface-800 px-2 text-xs font-semibold"
            >
              <span class="min-w-0 flex-1 overflow-hidden whitespace-pre"
                >Digest</span
              >
              <span class="w-1/6 overflow-hidden whitespace-pre">Bytes</span>
              <span class="w-1/6 overflow-hidden whitespace-pre">Kind</span>
              <span class="w-1/4 overflow-hidden whitespace-pre"
                >Last seen</span
              >
            </div>

            <div class="min-h-0 flex-1 overflow-hidden">
              <div
                v-for="row in rows"
                :key="row.sha256"
                class="flex h-8 items-center gap-4 border-b border-surface-600 px-2"
              >
                <!-- Target-DERIVED, therefore `font-mono`. In a proportional
                     face `l`/`I`/`1` and `0`/`O` are indistinguishable, and an
                     operator comparing two digests cannot see a lookalike.
                     Interpolated as TEXT — there is no `v-html` in this
                     codebase and lint makes that an error that cannot be
                     disabled inline. -->
                <span
                  class="min-w-0 flex-1 overflow-hidden whitespace-pre font-mono"
                  >{{ row.sha256 }}</span
                >
                <span class="w-1/6 overflow-hidden whitespace-pre">{{
                  row.byte_len
                }}</span>
                <span class="w-1/6 overflow-hidden whitespace-pre font-mono">{{
                  row.kind
                }}</span>
                <span class="w-1/4 overflow-hidden whitespace-pre font-mono">{{
                  formatTimestamp(row.last_seen_at)
                }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- The other three tabs ROUTE and RENDER from the first paint; they
             gain real bodies in plans 05-09, 05-10 and 05-12. A tab is never
             removed, never disabled and never hidden on account of having no
             body yet — the strip is a fixed map of the surface. -->
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
