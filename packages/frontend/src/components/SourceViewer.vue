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
// OF THE MECHANISM IS THE CONTROL, and it is asserted in the spec as an exact
// module-specifier set rather than as a search for a string. The same set is
// what proves NO FORM CONTROL is mounted here: recovered source in an editable,
// submittable control makes hostile bytes round-trip through a value binding
// the render rules do not cover, and cannot be virtualised.
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
//
// ===========================================================================
// THE FIFTH STATE IS NOT HERE, AND THAT IS RECORDED SO NOBODY LOOKS FOR IT
// ===========================================================================
// A map that was REFUSED, TRUNCATED OR MALFORMED produces no source rows at
// all: D-11 records `scan_state = 'partial'` with its redacted error. That is
// the TREE's empty state, not this component's, and its reason lives in the
// `EvidencePanel` at the artifact level where the analysis vocabulary lives.
// Nothing below renders an analysis-state word.

import type {
  DeriveSourceResult,
  SourceMappingsResult,
} from "@defminer/engine/contract";
import { SOURCE_LINE_MAX_GRAPHEMES } from "@defminer/engine/sanitise";
import { SOURCE_LINE_COUNT_MAX } from "@defminer/engine/thresholds";
import { computed, ref, shallowRef, watch } from "vue";
import { RecycleScroller } from "vue-virtual-scroller";

import type { RpcResult, SourceRef } from "../api/client";
import {
  copyToClipboard,
  forCellText,
  forSourceLine,
  sourceLineCounts,
  sourceLineTruncated,
} from "../safety/display";

import { browserDownload } from "./export-download";
import { sourceDownloadName } from "./source-filename";
import SourcePositionStrip from "./SourcePositionStrip.vue";
import {
  counted,
  FOCUS_RING_CLASS,
  formatTimestamp,
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
  /** Passed straight through to the position strip, which is the only thing
   *  that calls it — and calls it LAZILY, on the first line selection. */
  readSourceMappings: (
    request: SourceRef,
  ) => Promise<RpcResult<SourceMappingsResult>>;
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
// SENTENCE HERE INTERPOLATES A TARGET-CONTROLLED STRING. Every `{n}`,
// `{bytes}`, `{cap}`, `{date}` and `{digest}` is a DefMiner-computed integer, a
// DefMiner-formatted date or a hex digest.

const IDLE_BODY = "Select a source to read it.";

const LOADING_BODY = "Producing this source from the original response…";

const RPC_FAILED_HEADING = "Could not produce this source.";
const RPC_FAILED_BODY =
  "The DefMiner backend did not answer. This source has NOT been marked " +
  "unavailable — DefMiner does not conclude a file is gone from a call that " +
  "never returned.";
const RETRY_LABEL = "Retry";
const OPEN_HEALTH_LABEL = "Open Health";

/** D-22's tombstone, and the reason it is a SENTENCE rather than a badge: it
 *  explains an ABSENCE, and a one-word badge beside another one-word badge is
 *  the confusion O-07 mechanism 5's replacement guards against. The single WORD
 *  appears only on the 32px tree row, which cannot hold a sentence. */
const goneSentence = (recoveredAt: number): string =>
  `Recovered ${formatTimestamp(recoveredAt)}. The response this source came ` +
  "from is no longer in Caido's history, so DefMiner can no longer produce " +
  "its content. Its name, its size and its content hash are kept — that this " +
  "file existed on this target is evidence on its own.";

/** D-24's tombstone. FAIL CLOSED: the content is WITHHELD, and it is withheld
 *  STRUCTURALLY — the `changed` arm has no `content` key at all, so there is
 *  nothing here to forget to hide. */
const changedSentence = (recoveredAt: number): string =>
  `Recovered ${formatTimestamp(recoveredAt)}. The response this source came ` +
  "from still exists, but its bytes no longer match the bundle DefMiner " +
  "recovered from — the target has redeployed. DefMiner will not show you " +
  "source it cannot attribute to the bundle it came from, so the content is " +
  "withheld. The recovered name, size and content hash are kept.";

/** UI-09, O-02: the file has ONE line and that line is over the per-line cap.
 *  It is MINIFIED CODE THE MAP DECLARED AS A SOURCE — real intelligence about
 *  the bundle, not a rendering failure — so it says so in DefMiner's words. */
const noLineStructureSentence = (byteLen: number): string =>
  "This file has no line structure — it is one line of " +
  `${groupThousands(byteLen)} bytes. It is minified code that the map ` +
  "declared as a source. The line is truncated at " +
  `${groupThousands(SOURCE_LINE_MAX_GRAPHEMES)} characters.`;

/** UI-09: the line-count bound, stated in words. Never truncated silently. */
const lineCapSentence = (total: number): string =>
  `Showing the first ${groupThousands(SOURCE_LINE_COUNT_MAX)} lines of ` +
  `${groupThousands(total)}. DefMiner bounds what it renders so a hostile ` +
  "map cannot freeze the page.";

const SAVE_LABEL = "Save this source";

/** The one fact the operator cannot see for themselves: the filename is
 *  DefMiner's, not the developer's. `{name}` is 16 hex characters plus one of
 *  ten DefMiner literals — see `source-filename.ts`. */
const saveHelperSentence = (name: string): string =>
  `Saved as ${name}. DefMiner never builds a filename from the developer's ` +
  "path — that path is evidence, not a destination.";

/** The per-row marker, inside the row. Label role, `surface-400`. */
const LINE_TRUNCATED_MARKER = "…truncated";

/**
 * PLAIN TEXT, ALWAYS, and never derived from the extension.
 *
 * A content type chosen from the label would be a second sink for the target's
 * string, in the one place a browser acts on it — `text/html` on a recovered
 * "source" is a stored-XSS primitive on the operator's own machine, delivered
 * by DefMiner. The extension is cosmetic; the type is not.
 */
const DOWNLOAD_CONTENT_TYPE = "text/plain;charset=utf-8";

// ---------------------------------------------------------------------------
// THE FOUR BODY STATES
// ---------------------------------------------------------------------------
//
// ONE VALUE, NOT A CHAIN OF FLAGS, so that two of them cannot be on screen at
// once and a spec can assert the other three ABSENT.
//
// THE RULE THAT OUTRANKS THE TABLE, AND IT IS THE MOST IMPORTANT SENTENCE ON
// THIS SURFACE:
//
//     A FAILED CALL IS NEVER RENDERED AS A TOMBSTONE, AND THE FRONTEND NEVER
//     INFERS PRODUCIBILITY.
//
// D-23's producibility write happens on the BACKEND, only when the reload
// genuinely returns missing-or-no-response, and it is permanent. A frontend
// that painted a timeout as `gone` would be making a durable-looking claim from
// an absence of evidence — the exact defect `App.vue:606-611`'s shipped compat
// rule names: a call that did not answer is not evidence of a refusal.
//
// So the mapping below is ONE-TO-ONE with the backend's arms and derives
// NOTHING. `gone` and `changed` are reached only because the backend said so;
// an `RpcResult` failure and the `unavailable` arm both reach the could-not-ask
// copy, which states out loud that nothing has been marked unavailable.

type Body =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | {
      readonly kind: "content";
      /** The raw bytes, held for the download and the clipboard. NEVER placed
       *  in the DOM as a whole — only per-line, sanitised, per visible row. */
      readonly content: string;
      readonly lines: readonly string[];
      readonly byteLen: number;
      readonly lineCount: number;
      readonly sha256: string;
    }
  | { readonly kind: "gone"; readonly recoveredAt: number }
  | { readonly kind: "changed"; readonly recoveredAt: number }
  | { readonly kind: "unavailable" };

const body = shallowRef<Body>({ kind: "idle" });

/** The selected line's index, ZERO-BASED. `null` until the operator picks one,
 *  which is also what keeps the position read LAZY. Declared beside `body`
 *  rather than beside its own handlers, because `derive()` clears it and the
 *  `immediate` watcher runs `derive()` before a later declaration exists. */
const selectedLine = ref<number | null>(null);

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

/** The four arms, mapped one-to-one. A fifth arm added to the union fails to
 *  typecheck HERE rather than falling into a state this component chose. */
function fromResult(value: DeriveSourceResult): Body {
  switch (value.outcome) {
    case "content":
      return {
        kind: "content",
        content: value.content,
        lines: splitOnce(value.content),
        byteLen: value.byteLen,
        lineCount: value.lineCount,
        sha256: value.sha256,
      };
    case "gone":
      return { kind: "gone", recoveredAt: value.recoveredAt };
    case "changed":
      return { kind: "changed", recoveredAt: value.recoveredAt };
    case "unavailable":
      return { kind: "unavailable" };
  }
}

async function derive(): Promise<void> {
  const request = sourceRef;
  if (request === null) {
    body.value = { kind: "idle" };
    return;
  }
  inFlight += 1;
  const generation = inFlight;
  selectedLine.value = null;
  body.value = { kind: "loading" };

  const result = await client.deriveSource(request);
  if (generation !== inFlight) return;

  // AN `RpcResult` FAILURE IS NOT AN OUTCOME. It answers "did the backend
  // answer", not "what did it find", and the two are never collapsed.
  body.value = result.ok ? fromResult(result.value) : { kind: "unavailable" };
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

/**
 * THE FIRST OF TWO INDEPENDENT BOUNDS.
 *
 * `SOURCE_LINE_COUNT_MAX` is read BY NAME. Its derivation is an INEQUALITY
 * asserted in `thresholds.spec.ts` against the decoded ceiling — a file
 * reaching the cap inside `floor(PASSIVE_MAX_BYTES * 3/4)` averages under 12.6
 * characters per line — and never the number it currently evaluates to.
 */
const cappedLines = computed<readonly string[]>(() =>
  lines.value.length > SOURCE_LINE_COUNT_MAX
    ? lines.value.slice(0, SOURCE_LINE_COUNT_MAX)
    : lines.value,
);

/** The scroller keys by property NAME, so the line's index is lifted onto the
 *  item. `text` is the RAW line: it is sanitised in the template, per visible
 *  row, so the sanitiser is never run over lines nobody is looking at. */
const scrollerItems = computed<readonly { key: number; text: string }[]>(() =>
  cappedLines.value.map((text, index) => ({ key: index, text })),
);

/** The stated line count. `counted` for singular/plural agreement at 0 (the
 *  legal empty file), 1 and many — never a parenthesised plural. */
const lineCountLine = computed<string | null>(() =>
  body.value.kind === "content"
    ? counted(body.value.lineCount, "line", "lines")
    : null,
);

const boundLine = computed<string | null>(() =>
  lines.value.length > SOURCE_LINE_COUNT_MAX
    ? lineCapSentence(lines.value.length)
    : null,
);

/**
 * O-02, and the condition is DERIVED rather than chosen.
 *
 * The state is "one line, and that line is over the per-line cap" — which is
 * exactly what the copy's own last clause claims ("the line is truncated at
 * {cap} characters"). A one-line file of fifty bytes is a short file and gets
 * no marker; a one-line file of four megabytes gets this one, renders as ONE
 * ROW, and nothing about the scroller changes.
 */
const noLineStructureLine = computed<string | null>(() => {
  const state = body.value;
  if (state.kind !== "content") return null;
  const only = state.lines.length === 1 ? state.lines[0] : undefined;
  if (only === undefined || !sourceLineTruncated(only)) return null;
  return noLineStructureSentence(state.byteLen);
});

/** R6. `null` when the digest is one DefMiner cannot vouch for, and the save
 *  affordance is then not offered at all. */
const downloadName = computed<string | null>(() =>
  body.value.kind === "content"
    ? sourceDownloadName(body.value.sha256, label)
    : null,
);

const saveHelperLine = computed<string | null>(() =>
  downloadName.value === null ? null : saveHelperSentence(downloadName.value),
);

/** The verbatim `sources` entry, through the TEXT-ONLY wrapper. */
const headerLabel = computed<string>(() => forCellText(label ?? ""));

function gutter(key: number): string {
  return groupThousands(key + 1);
}

// ---------------------------------------------------------------------------
// SELECTION, AND WHAT THE POSITION STRIP IS TOLD
// ---------------------------------------------------------------------------

function select(key: number): void {
  selectedLine.value = selectedLine.value === key ? null : key;
}

/**
 * The two integers the truncation notice needs, computed ONCE for the line the
 * operator asked about — and IN ONE UNIT (07-REVIEW.md HI-02).
 *
 * `total` is a grapheme count and there is no way to have one without walking
 * the value — which is exactly why `display.ts` keeps that walk OUT of the
 * per-row predicate and puts the cost here, deliberately, on one line, on
 * demand.
 *
 * IT NO LONGER SPELLS THE COUNT WITH A SPREAD, AND THAT IS THE FIX. Two spreads
 * over two DIFFERENT strings counted `shown` after tab expansion and after both
 * strips and `total` before all three, in code points rather than in the
 * graphemes the cap is enforced in — three unit mismatches, which rendered
 * "Line 1 truncated at 1,024 of 601 characters" on a line of 600 tabs. Both
 * numbers now come out of ONE `display.ts` call over ONE prepared string, so
 * `shown <= total` holds by construction. The named-import equality is
 * satisfied the way it was always meant to be: the walking wrapper stays out of
 * this module and the cost is paid behind a SURFACE-NAMED wrapper.
 *
 * NEITHER NUMBER IS THE LINE. The untruncated line never leaves this component.
 */
const truncation = computed<{ shown: number; total: number } | null>(() => {
  const state = body.value;
  const index = selectedLine.value;
  if (state.kind !== "content" || index === null) return null;
  const line = state.lines[index];
  if (line === undefined) return null;
  const counts = sourceLineCounts(line);
  return counts.shown >= counts.total ? null : counts;
});

/**
 * Copy full line — CLIPBOARD ONLY.
 *
 * The full line is read from the frontend's own store and written to the
 * clipboard. It is never inserted into the DOM, never placed in a `title` and
 * never placed in a `data-*`: R2 states all three as absolutes, and this
 * affordance is the reason the absolutes are affordable.
 */
function copyFullLine(): void {
  const state = body.value;
  const index = selectedLine.value;
  if (state.kind !== "content" || index === null) return;
  const line = state.lines[index];
  if (line === undefined) return;
  // THE SHIPPED HELPER, not a fourth structural DOM host in this file. It is
  // also the ONLY sanctioned route: it has no `document.execCommand` fallback,
  // because that path copies by putting the full value INTO the document,
  // which is precisely what R2 forbids.
  //
  // The rejection is swallowed DELIBERATELY and the reason is stated rather
  // than assumed: the helper rejects only on a host with no async clipboard
  // API, which the Caido renderer is not. Copying nothing is the fail-closed
  // direction; an unhandled rejection here would take down the very viewer the
  // position strip's own wrap exists to keep on screen.
  void copyToClipboard(line).catch(() => undefined);
}

function retry(): void {
  void derive();
}

/**
 * The save. THE BACKEND RETURNS BYTES; no path is sent, received or
 * constructed — the shipped helper's own rule, unchanged.
 *
 * It gets no `danger` ceremony, and the reason is stated rather than assumed:
 * it is not irreversible, it destroys nothing, and it releases no more than the
 * shipped copy-full-value affordance already does with a click.
 */
function save(): void {
  const state = body.value;
  const filename = downloadName.value;
  if (state.kind !== "content" || filename === null) return;
  browserDownload({
    filename,
    contentType: DOWNLOAD_CONTENT_TYPE,
    text: state.content,
  });
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
      <button
        v-if="downloadName !== null"
        type="button"
        :class="[
          FOCUS_RING_CLASS,
          'shrink-0 border border-surface-600 px-2 py-1 text-xs font-semibold',
        ]"
        data-defminer-source-viewer-save
        @click="save()"
      >
        {{ SAVE_LABEL }}
      </button>
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
         GONE (D-22 / D-23) — a SENTENCE, not a badge. The single word lives
         on the 32px tree row, which cannot hold a sentence and where no
         other state word exists.
         =================================================================== -->
    <div
      v-else-if="body.kind === 'gone'"
      class="p-6"
      data-defminer-source-viewer-gone
    >
      <p class="text-sm">{{ goneSentence(body.recoveredAt) }}</p>
    </div>

    <!-- ===================================================================
         CHANGED (D-24) — FAIL CLOSED. There are no line rows in this
         subtree because the arm carries no content at all: withholding is
         structural, not a caller remembering to hide something.
         =================================================================== -->
    <div
      v-else-if="body.kind === 'changed'"
      class="p-6"
      data-defminer-source-viewer-changed
    >
      <p class="text-sm">{{ changedSentence(body.recoveredAt) }}</p>
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
         CONTENT — the notices, then the virtualised line list at the FIXED
         height. The gutter does not scroll with the code column; the code
         column scrolls horizontally on its own.
         =================================================================== -->
    <template v-else>
      <div
        v-if="
          boundLine !== null ||
          noLineStructureLine !== null ||
          saveHelperLine !== null
        "
        class="shrink-0 border-b border-surface-600 px-2 py-1"
      >
        <p
          v-if="boundLine !== null"
          class="text-xs text-surface-400"
          data-defminer-source-viewer-bound
        >
          {{ boundLine }}
        </p>
        <p
          v-if="noLineStructureLine !== null"
          class="text-xs text-surface-400"
          data-defminer-source-viewer-no-line-structure
        >
          {{ noLineStructureLine }}
        </p>
        <p
          v-if="saveHelperLine !== null"
          class="text-xs text-surface-400"
          data-defminer-source-viewer-save-helper
        >
          {{ saveHelperLine }}
        </p>
      </div>

      <div
        class="min-h-0 flex-1 overflow-hidden"
        data-defminer-source-viewer-content
      >
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
              selectedLine === item.key ? 'bg-surface-700' : '',
            ]"
            data-defminer-source-line
            :aria-current="selectedLine === item.key ? 'true' : undefined"
            @click="select(item.key)"
          >
            <!-- The gutter. A DefMiner-computed integer, fixed width, right
                 aligned, and OUTSIDE the horizontally scrolling column. -->
            <span
              class="w-16 shrink-0 pr-2 text-right font-mono text-sm text-surface-400 tabular-nums"
              aria-hidden="true"
              >{{ gutter(item.key) }}</span
            >

            <!-- THE ONE TARGET-CONTROLLED ELEMENT ON THE ROW, and the whole
                 reason this file exists. `forSourceLine` applies R2's four
                 steps with the TAB exception; the result is a TEXT NODE and
                 nothing else. There is no `title` here and no `data-*`
                 carrying it: R2 states both as absolutes. -->
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
    </template>

    <!-- ===================================================================
         THE POSITION STRIP — ALWAYS PRESENT, at its fixed height, in every
         body state. A fixed-height block that appears and then fills is a
         flash rather than a skeleton, and a strip that is always there is
         also where the position feature is discovered.
         =================================================================== -->
    <SourcePositionStrip
      :client="client"
      :source-ref="sourceRef"
      :selected-line="selectedLine"
      :truncation="truncation"
      @copy-full-line="copyFullLine()"
    />
  </div>
</template>
