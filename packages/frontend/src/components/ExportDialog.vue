<script setup lang="ts">
// packages/frontend/src/components/ExportDialog.vue — UI-06's export, and
// decision D-04's whole mechanism on this side.
//
// ===========================================================================
// AN EXPORT IS A DOWNLOAD ONTO THE OPERATOR'S OWN MACHINE. THERE IS NO SERVER
// PATH ANYWHERE IN IT.
// ===========================================================================
// The backend serialises and returns BYTES, chunk by chunk, at the size plan
// 05-02 measured. This component requests the chunks in order, concatenates
// them, builds a Blob from the content type the backend named and triggers a
// download with the filename the backend named. Nothing is written on the Caido
// server, which may be a shared VPS or a container — that is the property D-04
// exists to buy, and it is why this component and not a hosted-file mechanism.
//
// THE OBJECT URL AND THE ANCHOR ARE NOT AN R1 VIOLATION, and the difference is
// worth stating because the shape looks like one. R1 forbids offering an
// EXTRACTED URL as a destination: an extracted URL is data to be displayed. The
// URL here is minted by this component from its own Blob, and the filename is
// DefMiner-authored (`defminer-<table>-<mode>-<stamp>.<ext>`, built on the
// backend from no target byte at all). Neither is target-controlled, and the
// object URL is revoked immediately after the click.
//
// ===========================================================================
// TWO DELIBERATE ACTS FOR A RAW EXPORT, AND NO WAY TO REMEMBER THE CHOICE
// ===========================================================================
// Redacted is PRE-SELECTED and FOCUSED. Raw requires actively choosing the
// second option AND THEN confirming the destructive dialog, whose copy is used
// verbatim from the design contract as amended by decision D-07. There is no
// "remember this choice" for raw and none may be added: `ExportDialog.spec.ts`
// asserts the dialog's control set EQUALS an expected list, so a checkbox added
// here fails that case rather than passing unnoticed.
//
// ===========================================================================
// WHAT A FAILURE MUST NOT DO
// ===========================================================================
// The dialog stays open WITH THE REDACTION CHOICE EXACTLY AS THE OPERATOR SET
// IT. It never falls back to raw, never silently re-defaults a raw selection to
// redacted, and never leaves the operator thinking a partial file was written
// when none was. `mode` is written by exactly two things — the operator's radio,
// and the "Export redacted instead" escape they pressed themselves — and by no
// error path.

import type {
  ExportFormat,
  ExportRedactionMode,
  PageRequest,
} from "@defminer/engine/contract";
import {
  EXPORT_FORMATS,
  EXPORT_REDACTION_MODES,
} from "@defminer/engine/contract";
import { computed, nextTick, ref, watch } from "vue";

import type {
  ExportChunkOutcome,
  ExportChunkRequest,
  InventoryTable,
  RpcResult,
} from "../api/client";

import {
  CANCEL_LABEL,
  DESTRUCTIVE_BUTTON_CLASS,
  EXPORT_DIALOG_HEADING,
  EXPORT_EMPTY_BODY,
  EXPORT_FAILED_BODY,
  EXPORT_LABEL,
  EXPORT_REFUSED_BODY,
  exportFloorLine,
  EXPORTING_LABEL,
  FORMAT_GROUP_LABEL,
  FORMAT_OPTION_LABELS,
  NOTHING_TO_EXPORT_LABEL,
  RAW_EXPORT_CONFIRM_HEADING,
  RAW_EXPORT_ESCAPE_LABEL,
  rawExportConfirmBody,
  rawExportConfirmLabel,
  REDACTION_GROUP_LABEL,
  REDACTION_OPTION_LABELS,
} from "./export-contract";
import type { ExportFile } from "./export-download";
import {
  browserDownload,
  focusById,
  redactionRadioId,
} from "./export-download";
import { FOCUS_RING_CLASS } from "./table-contract";

const {
  open,
  table,
  filter,
  sortKey,
  direction,
  projectId,
  reachableCount,
  contributingTotal,
  contributingDegraded,
  runExport,
  deliver = browserDownload,
} = defineProps<{
  /** Whether the dialog is on screen. The TOOLBAR owns this: its action opens
   *  the dialog and never exports. */
  open: boolean;
  table: InventoryTable;
  filter: PageRequest["filter"];
  sortKey: string;
  direction: "asc" | "desc";
  projectId: string;
  /** Rows the operator can currently reach under the active filter — what the
   *  export covers, and the number the zero-row rule reads. `null` while the
   *  count is still resolving, which is NOT zero: a count that renders as zero
   *  before it has answered disables the action against a number nobody
   *  measured. */
  reachableCount: number | null;
  /** Contributing artifacts, and how many stopped short (UI-09). */
  contributingTotal: number;
  contributingDegraded: number;
  /** One chunk request. Answers a VALUE on every path — a component that had to
   *  catch would be a component whose failure Caido swallows. */
  runExport: (
    request: ExportChunkRequest,
  ) => Promise<RpcResult<ExportChunkOutcome>>;
  /** How a finished export reaches the operator. Defaults to the browser
   *  download; a spec passes its own and asserts what was assembled. */
  deliver?: (file: ExportFile) => void;
}>();

const emit = defineEmits<{ close: [] }>();

/**
 * The redaction choice.
 *
 * INITIALISED FROM THE CONTRACT'S FIRST MEMBER, not from the literal
 * `"redacted"`. The list's order is the safety property; reading `[0]` is what
 * makes this component inherit it rather than restate it.
 */
const mode = ref<ExportRedactionMode>(EXPORT_REDACTION_MODES[0]);
const format = ref<ExportFormat>(EXPORT_FORMATS[0]);

/** True once the operator has asked for a raw export and the destructive
 *  confirmation is on screen. The SECOND of the two deliberate acts. */
const confirmingRaw = ref(false);

/** In flight. Read SYNCHRONOUSLY at the top of the run, which is what makes a
 *  double invocation issue no second call: an `await` before the guard would
 *  leave a window a second click fits through. */
const exporting = ref(false);

/** DefMiner-authored copy for the last failure, or `null`. Never a message from
 *  the backend: the copywriting rule that outranks the table forbids an
 *  interpolated target-controlled string inside a sentence, and an RPC
 *  rejection can quote a URL. */
const failure = ref<string | null>(null);

/** The focus target on open: the FIRST member of the redaction vocabulary,
 *  which is the one `mode` was initialised to and the one that withholds. */
const FIRST_REDACTION_RADIO_ID = redactionRadioId(EXPORT_REDACTION_MODES[0]);

/** The confirmation's focused default is the way OUT of it. */
const RAW_ESCAPE_BUTTON_ID = "defminer-export-raw-escape";

const nothingToExport = computed(() => reachableCount === 0);
const exportCount = computed(() => reachableCount ?? 0);
const degraded = computed(() => contributingDegraded > 0);

const floorLine = computed(() =>
  exportFloorLine(contributingDegraded, contributingTotal),
);

const confirmLabel = computed(() => {
  if (exporting.value) return EXPORTING_LABEL;
  if (nothingToExport.value) return NOTHING_TO_EXPORT_LABEL;
  return EXPORT_LABEL;
});

watch(
  () => open,
  (isOpen) => {
    if (!isOpen) return;
    // A FRESH DIALOG EVERY TIME, and the reset is toward the WITHHOLDING
    // choice. A raw selection that survived a close would be a "remember this
    // choice" by another route, which is precisely what the design contract
    // forbids.
    mode.value = EXPORT_REDACTION_MODES[0];
    format.value = EXPORT_FORMATS[0];
    confirmingRaw.value = false;
    failure.value = null;
    void nextTick(() => {
      focusById(FIRST_REDACTION_RADIO_ID);
    });
  },
  { immediate: true },
);

watch(confirmingRaw, (confirming) => {
  if (!confirming) return;
  void nextTick(() => {
    focusById(RAW_ESCAPE_BUTTON_ID);
  });
});

/** Dismissal. REFUSED WHILE IN FLIGHT: the design contract's
 *  `loading / export-dialog` row says the dialog cannot be dismissed mid-write,
 *  and a dialog that vanished mid-assembly would leave the operator with no
 *  statement about whether a file was written. */
function requestClose(): void {
  if (exporting.value) return;
  emit("close");
}

/**
 * Request chunks in order until the backend reports no more, concatenate in
 * order, and hand the result to the delivery.
 *
 * THE CURSOR IS CARRIED FORWARD FROM EACH RESPONSE. It is how the rows are
 * found — 05-UI-SPEC.md bans `OFFSET` — while the index is what tells the
 * backend which chunk carries the header and which one completes the export and
 * therefore writes the audit row.
 */
async function assembleAndDeliver(
  chosen: ExportRedactionMode,
): Promise<string | null> {
  let text = "";
  let filename = "";
  let contentType = "";
  let cursor: ExportChunkRequest["cursor"] = null;
  let chunkIndex = 0;

  for (;;) {
    const result = await runExport({
      projectId,
      table,
      format: format.value,
      mode: chosen,
      filter,
      sortKey,
      direction,
      chunkIndex,
      cursor,
      // `null` takes the measured constant. The frontend does not get to choose
      // what crosses the boundary in one call.
      chunkRows: null,
    });
    if (!result.ok) return EXPORT_FAILED_BODY;

    const outcome = result.value;
    if (outcome.outcome === "refused") return EXPORT_REFUSED_BODY;
    // A ZERO-ROW EXPORT SHOULD HAVE BEEN DISABLED AT THE BUTTON (Open Decision
    // D3). Arriving here means the count the button was disabled against and the
    // rows the backend found have disagreed, which is worth a sentence rather
    // than a silent no-op.
    if (outcome.outcome === "empty") return EXPORT_EMPTY_BODY;

    text += outcome.chunk.text;
    filename = outcome.chunk.filename;
    contentType = outcome.chunk.contentType;
    if (!outcome.chunk.hasMore) break;
    cursor = outcome.chunk.nextCursor;
    chunkIndex += 1;
  }

  deliver({ filename, contentType, text });
  return null;
}

/** Run one export. `chosen` is passed rather than read from `mode` inside, so
 *  the escape's redacted run cannot be mistaken for a mutation of the
 *  operator's selection. */
async function runWith(chosen: ExportRedactionMode): Promise<void> {
  if (exporting.value) return;
  if (nothingToExport.value) return;
  exporting.value = true;
  failure.value = null;
  const problem = await assembleAndDeliver(chosen);
  exporting.value = false;
  if (problem !== null) {
    // THE CHOICE IS NOT TOUCHED. Not reset, not defaulted, not "helpfully"
    // moved to redacted. Whatever the operator selected is what the next
    // confirmation will be about.
    failure.value = problem;
    confirmingRaw.value = false;
    return;
  }
  emit("close");
}

/** The primary action. Raw does NOT export here — it opens the second gate. */
function onConfirm(): void {
  if (exporting.value || nothingToExport.value) return;
  if (mode.value === "raw") {
    confirmingRaw.value = true;
    return;
  }
  void runWith("redacted");
}

/** The destructive confirmation's own confirm. */
function onConfirmRaw(): void {
  void runWith("raw");
}

/** The destructive confirmation's escape. It moves the selection to redacted
 *  because that is what the button SAYS it does — an operator act, not an error
 *  path, which is the distinction the failure rule turns on. */
function onExportRedactedInstead(): void {
  mode.value = "redacted";
  confirmingRaw.value = false;
  void runWith("redacted");
}

const RADIO_CLASS = "mr-2 align-middle";
const OPTION_ROW_CLASS = "block py-1 text-xs";
const BUTTON_CLASS =
  "border border-surface-600 px-2 py-1 text-xs font-semibold";

// THERE IS NO TOP-LEVEL COMMENT INSIDE THE `<template>` BELOW. A comment there
// is a NODE: it would make this component a FRAGMENT, `wrapper.element` would
// resolve to the mount container rather than to the section, and every class
// assertion in the spec would read `[]`. Measured three times in this phase
// already — StatusBadge.vue, PartialBanner.vue and safety/HighlightSlices.vue
// each record the same trap.
</script>

<template>
  <div
    v-if="open"
    id="defminer-export-dialog"
    class="flex flex-col gap-2 border border-surface-600 bg-surface-800 p-4 text-xs"
    role="dialog"
    aria-modal="true"
    :aria-label="EXPORT_DIALOG_HEADING"
  >
    <h2 class="text-2xl font-semibold leading-tight">
      {{ EXPORT_DIALOG_HEADING }}
    </h2>

    <!-- UI-09, BEFORE THE CONFIRMATION AND IN THE SAME WORDS THE FILE WILL
         CARRY. The count takes the `info` semantic, never `danger`: `danger` in
         this dialog is reserved to the raw confirm button and nothing else. -->
    <p
      v-if="degraded"
      class="border border-info-500 px-2 py-1 text-info-500"
      role="status"
      data-defminer-export-floor
    >
      {{ floorLine }}
    </p>

    <fieldset class="border-0 p-0" data-defminer-export-redaction>
      <legend class="font-semibold">{{ REDACTION_GROUP_LABEL }}</legend>
      <!-- ITERATED OVER THE CONTRACT'S OWN LIST, never two hand-written radios.
           The order IS the safety property: the first member is the one that
           withholds, and it is the one `mode` was initialised to. -->
      <label
        v-for="option in EXPORT_REDACTION_MODES"
        :key="option"
        :class="OPTION_ROW_CLASS"
      >
        <input
          :id="redactionRadioId(option)"
          v-model="mode"
          type="radio"
          name="defminer-export-redaction"
          :value="option"
          :disabled="exporting"
          :class="[RADIO_CLASS, FOCUS_RING_CLASS]"
        />
        {{ REDACTION_OPTION_LABELS[option] }}
      </label>
    </fieldset>

    <fieldset class="border-0 p-0" data-defminer-export-format>
      <legend class="font-semibold">{{ FORMAT_GROUP_LABEL }}</legend>
      <label
        v-for="option in EXPORT_FORMATS"
        :key="option"
        :class="OPTION_ROW_CLASS"
      >
        <input
          v-model="format"
          type="radio"
          name="defminer-export-format"
          :value="option"
          :disabled="exporting"
          :class="[RADIO_CLASS, FOCUS_RING_CLASS]"
        />
        {{ FORMAT_OPTION_LABELS[option] }}
      </label>
    </fieldset>

    <p
      v-if="failure !== null"
      class="text-surface-100"
      role="alert"
      data-defminer-export-failure
    >
      {{ failure }}
    </p>

    <div v-if="!confirmingRaw" class="flex gap-2">
      <button
        id="defminer-export-confirm"
        type="button"
        :disabled="nothingToExport || exporting"
        :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
        @click="onConfirm"
      >
        {{ confirmLabel }}
      </button>
      <button
        id="defminer-export-cancel"
        type="button"
        :disabled="exporting"
        :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
        @click="requestClose"
      >
        {{ CANCEL_LABEL }}
      </button>
    </div>

    <!-- THE SECOND GATE. Its copy is 05-UI-SPEC.md's, verbatim as amended by
         decision D-07, and `export-contract.ts` is the one place it is
         written. -->
    <div
      v-else
      class="flex flex-col gap-2 border border-danger-500 p-2"
      role="alertdialog"
      aria-modal="true"
      :aria-label="RAW_EXPORT_CONFIRM_HEADING"
      data-defminer-raw-confirm
    >
      <h3 class="font-semibold">{{ RAW_EXPORT_CONFIRM_HEADING }}</h3>
      <p data-defminer-raw-confirm-body>
        {{ rawExportConfirmBody(exportCount) }}
      </p>
      <div class="flex gap-2">
        <button
          id="defminer-export-raw-confirm"
          type="button"
          :disabled="exporting"
          :class="[FOCUS_RING_CLASS, BUTTON_CLASS, DESTRUCTIVE_BUTTON_CLASS]"
          @click="onConfirmRaw"
        >
          {{ exporting ? EXPORTING_LABEL : rawExportConfirmLabel(exportCount) }}
        </button>
        <button
          :id="RAW_ESCAPE_BUTTON_ID"
          type="button"
          :disabled="exporting"
          :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
          @click="onExportRedactedInstead"
        >
          {{ RAW_EXPORT_ESCAPE_LABEL }}
        </button>
      </div>
    </div>
  </div>
</template>
