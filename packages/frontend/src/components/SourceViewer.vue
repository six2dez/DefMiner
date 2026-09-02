<script setup lang="ts">
// packages/frontend/src/components/SourceViewer.vue — the reading surface of
// the recovered-source drill-down.
//
// ===========================================================================
// THE MOST HOSTILE RENDER TARGET THIS PRODUCT HAS
// ===========================================================================
// Megabytes of target-controlled bytes, in a component whose entire job is to
// display them faithfully. Every rendering rule in this file is a security
// control with the same standing as the backend's, and D-18 (virtualise) plus
// D-19 (no highlighting, plain monospace) exist to keep the render surface as
// small as it can be while still delivering the feature.
//
// PLAIN MONOSPACED TEXT, VIRTUALISED BY LINE, AND NOTHING ELSE. No syntax
// highlighting, no tokeniser, no highlighter dependency, and NO import of
// `safety/HighlightSlices.vue` — the evidence panel's slicing path exists for
// match highlighting and this surface has no matches to highlight. THE ABSENCE
// OF THE MECHANISM IS THE CONTROL, and it is asserted in the spec as an
// exact module-specifier set rather than as a search for a string.
//
// ===========================================================================
// THE SPLIT HAPPENS ONCE, AT DERIVATION TIME
// ===========================================================================
// `content.split("\n")` runs in the RPC handler and its result is held in a
// `shallowRef`. It is bounded because the map is bounded by `MAP_MAX_BYTES`,
// but bounded-per-render is still per-render: a half-million-element array
// rebuilt because a sibling component's ref changed is the defect UI-05's
// precision row names. The spec asserts the split count across two further
// renders from two different causes.
//
// ===========================================================================
// THE ROW HEIGHT IS FIXED, AND THAT IS WHAT THE FAST PATH REQUIRES
// ===========================================================================
// `item-size` is bound to `SOURCE_LINE_HEIGHT_PX` (24), RE-READ and never
// restated. A variable row height degrades `RecycleScroller` to its dynamic
// variant. Nothing in this file may grow a row: the code column is
// `whitespace-pre` and every line goes through `forSourceLine`, which truncates
// at the third cap before the string reaches the template.
//
// The precedent is `InventoryTable.vue:473-531`, not `ArtifactsTable.vue` —
// plan 07-07's P7-D07-4 records why.

import type { DeriveSourceResult } from "@defminer/engine/contract";
import { computed, shallowRef, watch } from "vue";
import { RecycleScroller } from "vue-virtual-scroller";

import type { RpcResult, SourceRef } from "../api/client";
import {
  forCellText,
  forSourceLine,
  sourceLineTruncated,
} from "../safety/display";

import {
  counted,
  FOCUS_RING_CLASS,
  groupThousands,
  SOURCE_LINE_HEIGHT_CLASS,
  SOURCE_LINE_HEIGHT_PX,
} from "./table-contract";

/**
 * The one client method this component calls, declared STRUCTURALLY.
 *
 * A structural type rather than the whole `DefMinerClient`, for the reason the
 * tree column's row type gives: a real client is assignable without a cast, and
 * a spec can supply a fake without reimplementing twenty methods it never
 * reaches.
 */
type ViewerClient = {
  deriveSource: (request: SourceRef) => Promise<RpcResult<DeriveSourceResult>>;
};

const { client, sourceRef, label } = defineProps<{
  client: ViewerClient;
  /** The sighting to produce. `null` before the operator picks one. */
  sourceRef: SourceRef | null;
  /** TARGET-CONTROLLED and unsanitised, exactly as D-06 stores it. The header
   *  shows it VERBATIM (through the text-only wrapper), which is what makes the
   *  tree's losslessness visible rather than merely provable. */
  label: string | null;
}>();

const emit = defineEmits<{
  "open-health": [];
}>();

// ---------------------------------------------------------------------------
// COPY — 07-UI-SPEC.md § "Copywriting Contract", VERBATIM
// ---------------------------------------------------------------------------
// The rule that outranks the whole copy table applies to every string below: NO
// SENTENCE HERE INTERPOLATES A TARGET-CONTROLLED STRING. The only
// interpolations are DefMiner-computed integers.

const IDLE_BODY = "Select a source to read it.";

const LOADING_BODY = "Producing this source from the original response…";

const RPC_FAILED_HEADING = "Could not produce this source.";
const RPC_FAILED_BODY =
  "The DefMiner backend did not answer. This source has NOT been marked " +
  "unavailable — DefMiner does not conclude a file is gone from a call that " +
  "never returned.";
const RETRY_LABEL = "Retry";
const OPEN_HEALTH_LABEL = "Open Health";

/** The per-row marker, inside the row. Label role, `surface-400`. */
const LINE_TRUNCATED_MARKER = "…truncated";

// ---------------------------------------------------------------------------
// THE BODY STATE
// ---------------------------------------------------------------------------
//
// ONE VALUE, NOT A CHAIN OF FLAGS. The states are mutually exclusive by
// construction, which is the only way two of them cannot be on screen at once.
//
// THE RULE THAT OUTRANKS THE TABLE, AND IT IS THE MOST IMPORTANT SENTENCE ON
// THIS SURFACE:
//
//     A FAILED CALL IS NEVER RENDERED AS A TOMBSTONE, AND THE FRONTEND NEVER
//     INFERS PRODUCIBILITY.
//
// D-23's producibility write happens on the BACKEND, only when the reload
// genuinely returns missing-or-no-response, and it is permanent. A frontend
// that painted a timeout as "gone" would be making a durable-looking claim from
// an absence of evidence. This component maps the backend's arms ONE-TO-ONE and
// derives nothing.
//
// PLAN 07-08 TASK 2 SPLITS `unavailable` INTO THE FOUR BODY STATES. Until it
// does, every non-content arm renders the copy above — the one that claims
// nothing durable — which is the safe direction and never the tombstone.

type Body =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | {
      readonly kind: "content";
      readonly lines: readonly string[];
      readonly byteLen: number;
      readonly lineCount: number;
      readonly sha256: string;
    }
  | { readonly kind: "unavailable" };

const body = shallowRef<Body>({ kind: "idle" });

/** Which derivation the answer in flight belongs to. A second selection while
 *  the first is in flight must not have the first's answer land on it. */
let inFlight = 0;

/**
 * The newline split — ONCE, HERE, at derivation time.
 *
 * A ZERO-BYTE SOURCE IS LEGAL: the spec permits an empty `sourcesContent`
 * entry, and `"".split("\n")` is `[""]`, a phantom line the file does not have.
 * A zero-byte file has ZERO lines, and that is a file rather than an error.
 */
function splitOnce(content: string): readonly string[] {
  return content === "" ? [] : content.split("\n");
}

async function derive(): Promise<void> {
  const request = sourceRef;
  if (request === null) {
    body.value = { kind: "idle" };
    return;
  }
  inFlight += 1;
  const generation = inFlight;
  body.value = { kind: "loading" };

  const result = await client.deriveSource(request);
  if (generation !== inFlight) return;

  if (!result.ok) {
    body.value = { kind: "unavailable" };
    return;
  }
  const value = result.value;
  if (value.outcome !== "content") {
    body.value = { kind: "unavailable" };
    return;
  }
  body.value = {
    kind: "content",
    lines: splitOnce(value.content),
    byteLen: value.byteLen,
    lineCount: value.lineCount,
    sha256: value.sha256,
  };
}

watch(
  () => sourceRef,
  () => {
    void derive();
  },
  { immediate: true },
);

// ---------------------------------------------------------------------------
// DERIVED VIEW
// ---------------------------------------------------------------------------

const lines = computed<readonly string[]>(() =>
  body.value.kind === "content" ? body.value.lines : [],
);

/** The scroller keys by property NAME, so the line's index is lifted onto the
 *  item. `text` is the RAW line: it is sanitised in the template, per visible
 *  row, so the sanitiser is never run over lines nobody is looking at. */
const scrollerItems = computed<readonly { key: number; text: string }[]>(() =>
  lines.value.map((text, index) => ({ key: index, text })),
);

/** The stated line count. `counted` for singular/plural agreement at 0 (the
 *  legal empty file), 1 and many — never a parenthesised plural. */
const lineCountLine = computed<string | null>(() =>
  body.value.kind === "content"
    ? counted(body.value.lineCount, "line", "lines")
    : null,
);

/** The verbatim `sources` entry, through the TEXT-ONLY wrapper. */
const headerLabel = computed<string>(() => forCellText(label ?? ""));

function gutter(key: number): string {
  return groupThousands(key + 1);
}

function retry(): void {
  void derive();
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col" data-defminer-source-viewer>
    <!-- ===================================================================
         HEADER — the VERBATIM `sources` entry, which is what makes the
         tree's losslessness visible. Mono, pre-formatted, clipped: a value
         carrying a newline cannot grow the strip.
         =================================================================== -->
    <div
      class="flex h-12 shrink-0 items-center gap-2 border-b border-surface-600 px-2"
    >
      <h2
        class="min-w-0 flex-1 truncate font-mono text-sm font-semibold whitespace-pre overflow-hidden"
        data-defminer-source-viewer-label
      >
        {{ headerLabel }}
      </h2>
      <p
        v-if="lineCountLine !== null"
        class="shrink-0 text-xs text-surface-400"
        data-defminer-source-viewer-lines
      >
        {{ lineCountLine }}
      </p>
    </div>

    <!-- ===================================================================
         IDLE — nothing selected yet.
         =================================================================== -->
    <div
      v-if="body.kind === 'idle'"
      class="px-2 py-16"
      data-defminer-source-viewer-idle
    >
      <p class="text-sm text-surface-400">{{ IDLE_BODY }}</p>
    </div>

    <!-- ===================================================================
         LOADING — A SENTENCE, never a skeleton and never a spinner. A
         skeleton of code is indistinguishable from code, and the sentence
         explains a real wait: every open reloads the bundle, re-verifies its
         hash and re-reads the map.
         =================================================================== -->
    <div
      v-else-if="body.kind === 'loading'"
      class="px-2 py-16"
      data-defminer-source-viewer-loading
    >
      <p class="text-sm text-surface-400">{{ LOADING_BODY }}</p>
    </div>

    <!-- ===================================================================
         COULD NOT ASK — the RPC failed, timed out or was not answered. It
         says EXPLICITLY that the source has not been marked unavailable,
         because this is where a reader would otherwise conclude the wrong
         thing. NEVER a tombstone.
         =================================================================== -->
    <div
      v-else-if="body.kind === 'unavailable'"
      class="px-6 py-16"
      data-defminer-source-viewer-rpc-failed
    >
      <h3 class="text-sm font-semibold text-danger-500">
        {{ RPC_FAILED_HEADING }}
      </h3>
      <p class="mt-2 text-sm text-surface-400">{{ RPC_FAILED_BODY }}</p>
      <div class="mt-4 flex gap-2">
        <button
          type="button"
          :class="[
            FOCUS_RING_CLASS,
            'border border-surface-600 px-2 py-1 text-xs font-semibold',
          ]"
          @click="retry()"
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
         CONTENT — the virtualised line list at the FIXED height. The gutter
         does not scroll with the code column; the code column scrolls
         horizontally on its own.
         =================================================================== -->
    <div v-else class="min-h-0 flex-1 overflow-hidden">
      <RecycleScroller
        v-slot="{ item }"
        class="h-full"
        :items="scrollerItems"
        :item-size="SOURCE_LINE_HEIGHT_PX"
        :buffer="200"
        key-field="key"
      >
        <button
          type="button"
          :class="[
            SOURCE_LINE_HEIGHT_CLASS,
            FOCUS_RING_CLASS,
            'flex w-full items-center gap-2 text-left',
          ]"
          data-defminer-source-line
        >
          <!-- The gutter. A DefMiner-computed integer, fixed width, right
               aligned, and OUTSIDE the horizontally scrolling column. -->
          <span
            class="w-16 shrink-0 pr-2 text-right font-mono text-sm text-surface-400 tabular-nums"
            aria-hidden="true"
            >{{ gutter(item.key) }}</span
          >

          <!-- THE ONE TARGET-CONTROLLED ELEMENT ON THE ROW, and the whole
               reason this file exists. `forSourceLine` applies R2's four steps
               with the TAB exception; the result is a TEXT NODE and nothing
               else. There is no `title` here and no `data-*` carrying it: R2
               states both as absolutes. -->
          <span
            class="min-w-0 flex-1 overflow-x-auto font-mono text-sm whitespace-pre"
            data-defminer-source-code
            >{{ forSourceLine(item.text) }}</span
          >

          <span
            v-if="sourceLineTruncated(item.text)"
            class="shrink-0 text-xs text-surface-400"
            data-defminer-source-line-truncated
            >{{ LINE_TRUNCATED_MARKER }}</span
          >
        </button>
      </RecycleScroller>
    </div>
  </div>
</template>
