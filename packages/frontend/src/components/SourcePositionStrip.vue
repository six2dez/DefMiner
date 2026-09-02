<script setup lang="ts">
// packages/frontend/src/components/SourcePositionStrip.vue — MAP-03's position
// readout, and the one position consumer in this product that exists without
// detectors.
//
// ===========================================================================
// THIS IS THE ONLY MODULE IN THE REPOSITORY THAT IMPORTS THE POSITION CODEC
// ===========================================================================
// AND THAT IS WHAT MAKES PLAN 07-03's BACKEND-SIDE BAN MEANINGFUL RATHER THAN
// VACUOUS. D-16 puts the VLQ decode in the BROWSER: SPIKE-06 measured
// `vlq_decode` at 167 ms on an 8.3 MB `mappings` string against a 25 ms slice
// budget, and `decode()` consumes the whole string so it cannot be chunked.
// 167 ms of blocked QuickJS is 167 ms in which live browsing is not being
// proxied; in a real browser it is a shrug. D-17 makes that a PACKAGE-LEVEL
// capability ban rather than a convention — `packages/backend`'s
// `codec-prohibition.spec.ts` asserts the codec is absent there, and that
// assertion is only worth having because the codec legitimately lives HERE.
//
// `SourcePositionStrip.spec.ts` asserts the exclusivity as an exact-set
// equality over the frontend source tree's import graph, so a second consumer
// added later fails without anyone having to remember this paragraph.
//
// ===========================================================================
// THE STRIP IS ALWAYS PRESENT, AT ITS FIXED HEIGHT
// ===========================================================================
// A fixed-height block that appears and then fills is a FLASH rather than a
// skeleton (06's rule), and a strip that is always there is also where the
// position feature is DISCOVERED. So the root element below renders in every
// state, carries `h-12` in every state, and is `whitespace-pre
// overflow-hidden` with no wrapping: every value on it is a bounded integer or
// a DefMiner-authored sentence, so it cannot grow and cannot reflow the viewer
// above it.
//
// ===========================================================================
// THE POSITION DATA IS LAZY, BY CONTRACT
// ===========================================================================
// `mappings` is the LARGER HALF of the payload and is unused until the operator
// asks for a position, so it rides its OWN RPC (plan 07-06's
// `readSourceMappings`) and is requested on the FIRST LINE SELECTION — never on
// mount and never on scroll. THE VIEWER MUST RENDER, SCROLL AND BE FULLY
// USABLE BEFORE ONE BYTE OF IT HAS CROSSED THE RPC, and the spec asserts the
// call count is 0 after mount, 0 after a scroll, and 1 after the first select.
//
// ===========================================================================
// A DECODE THROW DEGRADES THIS STRIP AND NOTHING ELSE
// ===========================================================================
// O-01's fourth requirement. `mappings` is TARGET-CONTROLLED. It never enters
// the DOM — it is decoded to integers and the integers are what render — but
// the decode CAN throw, and an uncaught throw takes the viewer down WITH THE
// SOURCE STILL ON SCREEN BEHIND IT. So the decode is wrapped, the catch
// degrades this strip alone, and the source above stays readable.
//
// MEASURED, AND WORTH STATING PRECISELY: the shipped codec contains no `throw`
// of its own — it is total over garbage STRINGS, returning nonsense integers
// rather than raising. What reaches the catch is the RPC BOUNDARY: the
// renderer receives whatever QuickJS serialised, the contract's `string` is a
// compile-time claim about a runtime value, and `decode(null)` throws
// `TypeError: Cannot destructure property 'length' of 'mappings' as it is
// null`. The wrap protects against the boundary, which is where the risk
// actually is. The spec drives both halves.

import type { SourceMappingsResult } from "@defminer/engine/contract";
import type {
  SourceMapMappings,
  SourceMapSegment,
} from "@jridgewell/sourcemap-codec";
import { decode } from "@jridgewell/sourcemap-codec";
import { computed, ref, watch } from "vue";

import type { RpcResult, SourceRef } from "../api/client";

import { counted, FOCUS_RING_CLASS, groupThousands } from "./table-contract";

/** The one client method this component calls, declared STRUCTURALLY. */
type StripClient = {
  readSourceMappings: (
    request: SourceRef,
  ) => Promise<RpcResult<SourceMappingsResult>>;
};

const { client, sourceRef, selectedLine, truncation } = defineProps<{
  client: StripClient;
  sourceRef: SourceRef | null;
  /** The selected line's index, ZERO-BASED, as the source array holds it. */
  selectedLine: number | null;
  /** Two DefMiner-computed integers for the selected line, or `null` when it
   *  was not cut. NEVER the line itself: the untruncated line does not reach
   *  this component, let alone this component's DOM. */
  truncation: { readonly shown: number; readonly total: number } | null;
}>();

const emit = defineEmits<{
  "copy-full-line": [];
}>();

// ---------------------------------------------------------------------------
// COPY — 07-UI-SPEC.md § "Copywriting Contract", VERBATIM
// ---------------------------------------------------------------------------
// Seven rows, seven states, and no two collapsed. Every interpolation is a
// DefMiner-computed integer.

const DISCOVERY_LINE =
  "Select a line to see where it appears in the minified bundle.";
const READING_LINE = "Reading positions…";
const UNMAPPED_LINE = "This line has no position in the bundle's mappings.";
/** A DIFFERENT FACT FROM UNMAPPED, and never the same sentence: "this line has
 *  no entry" and "this map has no table" are two different things to know. */
const NO_TABLE_LINE = "This map carries no position table.";
const UNREADABLE_LINE =
  "DefMiner could not read this map's position table. The source above is " +
  "unaffected.";
const COPY_FULL_LINE_LABEL = "Copy full line";

/**
 * The position sentence.
 *
 * THE ONLY TRANSFORMATION APPLIED TO A DECODED INTEGER, and it is stated here
 * rather than buried. The sourcemap specification numbers generated lines and
 * columns from ZERO; the gutter beside the source — and therefore `{n}` in this
 * very sentence — numbers from ONE. Rendering the two halves of one sentence in
 * two different conventions is a defect the operator cannot see and cannot
 * correct for, so the base shift is applied in ONE place, to both halves,
 * identically.
 *
 * MAP-03's "no arithmetic beyond the library's own output" is about DERIVING a
 * position: DefMiner never interpolates between segments, never computes an
 * offset and never guesses. It reports the segment the library named. The
 * decoded integers are held VERBATIM in state; this function is presentation.
 */
const positionSentence = (
  sourceLine: number,
  generatedLine: number,
  generatedColumn: number,
  further: number,
): string => {
  const head =
    `Line ${groupThousands(oneBased(sourceLine))} appears at line ` +
    `${groupThousands(oneBased(generatedLine))}, column ` +
    `${groupThousands(oneBased(generatedColumn))} of the minified bundle.`;
  // `counted` rather than the copy table's bare plural, because the rule that
  // outranks that table forbids "1 other position(s)" and requires agreement.
  return further === 0
    ? head
    : `${head} and at ${counted(further, "other position", "other positions")}.`;
};

const truncationSentence = (
  sourceLine: number,
  shown: number,
  total: number,
): string =>
  `Line ${groupThousands(oneBased(sourceLine))} truncated at ` +
  `${groupThousands(shown)} of ${groupThousands(total)} characters.`;

function oneBased(zeroBased: number): number {
  return zeroBased + 1;
}

// ---------------------------------------------------------------------------
// THE POSITION TABLE
// ---------------------------------------------------------------------------

/** The FIRST segment for a source line, plus how many more there were. Two
 *  numbers and a count — no segment array is retained, so nothing here can
 *  grow with the map. */
type Position = {
  readonly generatedLine: number;
  readonly generatedColumn: number;
  /** Including the first. The sentence renders `count - 1` as "further". */
  readonly count: number;
};

type Table =
  | { readonly kind: "unread" }
  | { readonly kind: "reading" }
  | {
      readonly kind: "ready";
      readonly positions: ReadonlyMap<number, Position>;
    }
  | { readonly kind: "no-table" }
  | { readonly kind: "unreadable" };

const table = ref<Table>({ kind: "unread" });

/**
 * The decoded segments, indexed by SOURCE line.
 *
 * SEGMENTS ARE CONSUMED IN THE ORDER THE LIBRARY RETURNS THEM — generated lines
 * ascending, segments within a line in their own order — and the position kept
 * for a source line is THE FIRST one seen, which is what the copy claims. A
 * segment naming a different `sources` index belongs to a different file and is
 * skipped; a one-element segment carries only a generated column and names no
 * source at all.
 */
function indexBySourceLine(
  decoded: SourceMapMappings,
  sourcesIndex: number,
): ReadonlyMap<number, Position> {
  const positions = new Map<number, Position>();
  for (
    let generatedLine = 0;
    generatedLine < decoded.length;
    generatedLine += 1
  ) {
    const segments: readonly SourceMapSegment[] = decoded[generatedLine] ?? [];
    for (const segment of segments) {
      const fields: readonly number[] = segment;
      if (fields.length < 4) continue;
      const generatedColumn = fields[0] ?? 0;
      if (fields[1] !== sourcesIndex) continue;
      const sourceLine = fields[2] ?? 0;
      const seen = positions.get(sourceLine);
      positions.set(
        sourceLine,
        seen === undefined
          ? { generatedLine, generatedColumn, count: 1 }
          : { ...seen, count: seen.count + 1 },
      );
    }
  }
  return positions;
}

let inFlight = 0;

async function readTable(): Promise<void> {
  const request = sourceRef;
  if (request === null) return;
  inFlight += 1;
  const generation = inFlight;
  table.value = { kind: "reading" };

  const result = await client.readSourceMappings(request);
  if (generation !== inFlight) return;

  if (!result.ok) {
    // The call did not answer. That is not a claim about the map, and it is
    // certainly not a claim about producibility — this strip renders neither.
    table.value = { kind: "unreadable" };
    return;
  }
  const value = result.value;
  if (value.outcome !== "mappings") {
    // `unavailable` is the arm a SECTIONED map produces: a sectioned document
    // carries its `mappings` per section and has no top-level string member, so
    // there genuinely is no position table. `gone` and `changed` mean the
    // bundle moved under the read, which this strip reports as unreadable — it
    // never repeats a producibility claim the viewer body already owns.
    table.value =
      value.outcome === "unavailable"
        ? { kind: "no-table" }
        : { kind: "unreadable" };
    return;
  }
  if (value.mappings === "") {
    table.value = { kind: "no-table" };
    return;
  }
  try {
    table.value = {
      kind: "ready",
      positions: indexBySourceLine(decode(value.mappings), request.sourceIndex),
    };
  } catch {
    // THE WRAP. The catch degrades THIS STRIP AND NOTHING ELSE; the source
    // above stays on screen and stays readable. The thrown value is DISCARDED
    // rather than rendered — it was produced from target-controlled input and
    // has no place in a sentence.
    table.value = { kind: "unreadable" };
  }
}

/** LAZY: the read is triggered by the FIRST line selection, never by mount and
 *  never by a scroll. */
watch(
  () => selectedLine,
  (line) => {
    if (line === null) return;
    if (table.value.kind !== "unread") return;
    void readTable();
  },
  { immediate: true },
);

/** A different source is a different table. Reset rather than reuse: a
 *  position read for one file must never answer for another. */
watch(
  () => sourceRef,
  () => {
    inFlight += 1;
    table.value = { kind: "unread" };
  },
);

// ---------------------------------------------------------------------------
// THE SEVEN STATES, AS ONE VALUE
// ---------------------------------------------------------------------------
//
// ONE COMPUTED, NOT A CHAIN OF `v-if`s that could both be live. TRUNCATION
// TAKES PRECEDENCE, and the reason is the strip's own fixed height: it holds
// ONE sentence, and the more urgent thing to tell an operator looking at a cut
// line is that it is cut and how to get the rest. The position for that line is
// one keystroke away — deselect and reselect after copying.

type StripView =
  | "truncated"
  | "idle"
  | "reading"
  | "no-table"
  | "unreadable"
  | "mapped"
  | "unmapped";

const position = computed<Position | null>(() => {
  const current = table.value;
  if (current.kind !== "ready" || selectedLine === null) return null;
  return current.positions.get(selectedLine) ?? null;
});

const view = computed<StripView>(() => {
  if (truncation !== null && selectedLine !== null) return "truncated";
  if (selectedLine === null) return "idle";
  const kind = table.value.kind;
  if (kind === "no-table") return "no-table";
  if (kind === "unreadable") return "unreadable";
  if (kind === "ready") return position.value === null ? "unmapped" : "mapped";
  // `unread` and `reading` are the SAME THING to an operator — a table that is
  // not here yet — and they are two internal states because only one of them
  // may start a second RPC. Written as the fall-through rather than as a
  // `switch` so the function has one exit and no unreachable arm.
  return "reading";
});

const mappedLine = computed<string | null>(() => {
  const found = position.value;
  if (found === null || selectedLine === null) return null;
  return positionSentence(
    selectedLine,
    found.generatedLine,
    found.generatedColumn,
    found.count - 1,
  );
});

const truncatedLine = computed<string | null>(() =>
  truncation === null || selectedLine === null
    ? null
    : truncationSentence(selectedLine, truncation.shown, truncation.total),
);
</script>

<template>
  <div
    class="flex h-12 shrink-0 items-center gap-2 border-t border-surface-600 px-2 text-sm whitespace-pre overflow-hidden"
    data-defminer-source-position-strip
  >
    <p v-if="view === 'idle'" class="text-surface-400">
      {{ DISCOVERY_LINE }}
    </p>
    <p v-else-if="view === 'reading'" class="text-surface-400">
      {{ READING_LINE }}
    </p>
    <p v-else-if="view === 'no-table'" class="text-surface-400">
      {{ NO_TABLE_LINE }}
    </p>
    <p v-else-if="view === 'unreadable'" class="text-surface-400">
      {{ UNREADABLE_LINE }}
    </p>
    <p v-else-if="view === 'unmapped'" class="text-surface-400">
      {{ UNMAPPED_LINE }}
    </p>
    <p v-else-if="view === 'mapped'">{{ mappedLine }}</p>
    <template v-else>
      <p>{{ truncatedLine }}</p>
      <button
        type="button"
        :class="[
          FOCUS_RING_CLASS,
          'shrink-0 border border-surface-600 px-2 py-1 text-xs font-semibold',
        ]"
        data-defminer-copy-full-line
        @click="emit('copy-full-line')"
      >
        {{ COPY_FULL_LINE_LABEL }}
      </button>
    </template>
  </div>
</template>
