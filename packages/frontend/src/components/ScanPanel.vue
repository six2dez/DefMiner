<script setup lang="ts">
// packages/frontend/src/components/ScanPanel.vue — FIND-04's surface: start a
// retroactive scan, and watch a job with no denominator move.
//
// ===========================================================================
// TWO STATES, NEVER BOTH
// ===========================================================================
// The start form and the live readout are the SAME QUESTION in two states —
// "is this project's history covered?" — so they are never on screen together.
// A disabled start form beside a running scan is chrome whose only content is
// "no"; the one-at-a-time invariant is rendered as a STATE OF THE SURFACE
// instead, with a sentence naming WHICH of the two occupied states is holding
// the slot, because the operator's next action differs between them.
//
// `null` from the status endpoint is a REAL STATE and not a failure, and the
// distinction is the whole reason the endpoint answers a union: a payload of
// zeroes describes a scan that started and found nothing, which is the opposite
// of the truth for a project that has never run one.
//
// ===========================================================================
// NOTHING HERE IS INDETERMINATE
// ===========================================================================
// No progress bar, no spinner, no pulse, no animated ellipsis, no shimmer —
// `progressbar` and `progressspinner` are both available in the Caido palette
// and both are banned on this surface. The only things that move are numbers
// that mean something. The reasoning generalises the shipped no-centred-spinner
// rule and adds an independent second leg: a spinner claims "something is
// happening" while refusing to say what, and this surface's entire subject is
// refusing to claim more than is known. A tool that will not fabricate a
// percentage must not fabricate reassurance either.
//
// The in-flight label convention still applies to the CONTROLS: each action
// takes its OWN label while it is in flight — never a spinner beside the old
// one — the rule the shipped Save, Refresh and Export actions obey.
//
// ===========================================================================
// D-10'S ASYMMETRY IS RENDERED, NOT MERELY TRUE
// ===========================================================================
// Cancel means PAUSE and keeps the resumable position; discard is a separate
// act that destroys it. If the two sat adjacent in one tone the operator would
// hesitate over the safe one and the asymmetry D-10 bought would be invisible.
// Pause and Resume are `surface`-toned; Discard is `danger`-toned — the FIFTH
// member of 05-UI-SPEC.md's reserved destructive list, added by amendment A1 in
// this same commit — separated by the contract's `sm` gap and behind its own
// confirmation. The endpoints are three separate names rather than one with a
// mode flag, and the names are the mitigation: a mis-click cannot reach the
// destructive one.
//
// ===========================================================================
// THE EVIDENCE PANEL STAYS MOUNTED AND ITS REGION IS NOT RECLAIMED
// ===========================================================================
// Taking the panel's third of the workspace back for this tab was weighed and
// REJECTED: the panel's unconditional mount is the shipped no-reflow guarantee,
// and conditioning its presence on tab identity would make it a function of two
// things instead of one. Health already demonstrates that an operational
// surface reads fine in two thirds with a fixed counter strip and a `<dl>`
// below it. Recorded here so it is not rediscovered.
//
// ===========================================================================
// WHAT REACHES THIS TEMPLATE, AND THE TWO DISPLAY-PATH CALLS
// ===========================================================================
// Every field of `ScanStatusPayload` is an integer, a closed-vocabulary word or
// a filter string DefMiner or the operator authored — no response byte, no
// header and no URL. So the counters and the status word need no sanitising and
// a `forCellText` over an integer would imply the opposite.
//
// The two exceptions are real and are the same string twice: the OPERATOR'S OWN
// CLAUSE, echoed back inside the composed filter and echoed back beside a
// rejection. It is routinely pasted from a target's own page, so it is treated
// as untrusted regardless of who typed it. Both go through `forCellText` and
// both appear ONLY inside their own `font-mono` element — never interpolated
// into a sentence, never in a `title`, never in a `data-*`. That is the rule
// the whole page obeys, applied to the one string here that a person typed.

import type {
  ScanProgressPayload,
  ScanStatusPayload,
} from "@defminer/engine/contract";
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";

import type {
  InvalidationSubscription,
  RpcResult,
  ScanCommandOutcome,
  StartScanOutcome,
} from "../api/client";
import { forCellText } from "../safety/display";
import { useScanProgress } from "../stores/scan-progress";

import { DESTRUCTIVE_BUTTON_CLASS } from "./export-contract";
import { focusById } from "./export-download";
import {
  clauseRejectedLine,
  composedPreview,
  counterFingerprint,
  counterId,
  counterText,
  discardConfirmBody,
  positionText,
  rejectBreakdownUnavailable,
  resumePositionClause,
  SCAN_CELL_CLASS,
  SCAN_CLAUSE_CLASS,
  SCAN_COMPOSED_HELP,
  SCAN_COMPOSED_LABEL,
  SCAN_DEFMINER_CLAUSE_LABEL,
  SCAN_DETAIL_COUNTERS,
  SCAN_DETAIL_HEADING,
  SCAN_DISCARD_CTA,
  SCAN_DISCARD_HEADING,
  SCAN_DISCARD_KEEP_LABEL,
  SCAN_DISCARDING_LABEL,
  SCAN_EVICTION_SWEEP_NOTE,
  SCAN_FAILED_BODY,
  SCAN_HEADING,
  SCAN_LOADING_LABEL,
  SCAN_NO_DENOMINATOR_NOTE,
  SCAN_NOT_ADVANCING_LINE,
  SCAN_ONE_AT_A_TIME_RUNNING,
  SCAN_ONE_AT_A_TIME_SUSPENDED,
  SCAN_OPEN_HEALTH_LABEL,
  SCAN_OPEN_SETTINGS_LABEL,
  SCAN_OPERATOR_CLAUSE_HELP,
  SCAN_OPERATOR_CLAUSE_LABEL,
  SCAN_PAUSE_CTA,
  SCAN_PAUSING_LABEL,
  SCAN_POSITION_PREFIX,
  SCAN_PURPOSE,
  SCAN_REFRESH_LABEL,
  SCAN_REFRESHING_LABEL,
  SCAN_REFUSAL_COPY,
  SCAN_REJECT_HEADING,
  SCAN_REJECT_OUT_OF_SCOPE_BODY,
  SCAN_REJECT_OUT_OF_SCOPE_LABEL,
  SCAN_RESUME_CTA,
  SCAN_RESUMING_LABEL,
  SCAN_RETRY_LABEL,
  SCAN_SCOPE_STATEMENT,
  SCAN_START_CTA,
  SCAN_STARTING_LABEL,
  SCAN_STATUS_NOT_ADVANCING,
  SCAN_STATUS_WAITING_FOR_QUEUE,
  SCAN_STRIP_COUNTERS,
  SCAN_STRIP_HEIGHT_CLASS,
  SCAN_SUSPEND_COPY,
  SCAN_WAITING_FOR_QUEUE_LINE,
  scanStaleBody,
  scanStatusWord,
} from "./scan-contract";
import { FOCUS_RING_CLASS, groupThousands } from "./table-contract";

const {
  defminerClause,
  discard,
  load,
  pause,
  projectId,
  resume,
  start,
  subscribe,
} = defineProps<{
  /** The active project. Read only to guard the progress store against a
   *  project switch racing an in-flight event; every RPC below substitutes
   *  the backend's own lifecycle-resolved id. */
  projectId: string;
  /** DefMiner's own HTTPQL clause, read-only. Rendered as CONTEXT and never as
   *  an input: the operator may narrow the scan and may not widen it, and the
   *  clause they are adding to has to be visible for that to be checkable. */
  defminerClause: string;
  /** Read this project's active scan. Answers a VALUE on every path — a
   *  component that had to catch would be a component whose failure Caido
   *  swallows. */
  load: () => Promise<RpcResult<ScanStatusPayload | null>>;
  /** Begin one scan. Same contract: a value on every path, and a refusal is a
   *  value rather than a rejection. */
  start: (request: {
    readonly operatorFilter: string;
  }) => Promise<RpcResult<StartScanOutcome>>;
  /** Stop it and KEEP its place. */
  pause: (scanId: string) => Promise<RpcResult<ScanCommandOutcome>>;
  /** The only way back — DefMiner never resumes a scan on its own. */
  resume: (scanId: string) => Promise<RpcResult<ScanCommandOutcome>>;
  /** Throw the POSITION away. The artifacts and observations are untouched. */
  discard: (scanId: string) => Promise<RpcResult<ScanCommandOutcome>>;
  /** Subscribe to the progress half of the one backend event. */
  subscribe: (
    handler: (payload: ScanProgressPayload) => void,
  ) => InvalidationSubscription;
}>();

/** Routing is the WORKSPACE'S, not this panel's. The failure copy names Health
 *  and the eviction suspension names Settings; both are emitted rather than
 *  navigated, so this component stays a function of its props and the tab set
 *  keeps exactly one owner. */
const emit = defineEmits<{
  (event: "open-health"): void;
  (event: "open-settings"): void;
}>();

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------

/**
 * THREE STATES, AND THE MIDDLE ONE IS NOT AN ERROR.
 *
 *   a payload            — there is a scan; render the readout.
 *   `null`, `failed` off — there is no scan; render the start form.
 *   `failed`             — the call produced no value at all.
 *
 * Collapsing the middle into a zero-filled payload is the specific mistake the
 * endpoint's union exists to prevent.
 */
const scan = ref<ScanStatusPayload | null>(null);
const failed = ref(false);

/** True while a status read is in flight, INCLUDING THE FIRST — which is why it
 *  starts `true` rather than being set by the mount hook. */
const reading = ref(true);

/** Whether a read has ever come back. Separate from `reading`, because "a read
 *  is open" and "no read has ever completed" are different claims and the
 *  template needs both: after the first answer the loading line must never
 *  reappear, or a refresh would blank the numbers it is refreshing. */
const settled = ref(false);

/** True while the start call is in flight. Its own flag rather than reusing
 *  `reading`: the two actions are independent and sharing one would disable a
 *  control for a call it has nothing to do with. */
const starting = ref(false);

/** One flag per lifecycle command, for the same reason. Pausing must not
 *  disable Discard's confirmation and vice versa. */
const pausing = ref(false);
const resuming = ref(false);
const discarding = ref(false);

/** Is the discard confirmation open? The one destructive act in the phase, and
 *  it is two deliberate presses rather than one. */
const confirmingDiscard = ref(false);

/** What the operator typed. `""` IS A VALID, COMPLETE INPUT and the common one
 *  — most scans carry no operator clause and run over DefMiner's alone. It is
 *  never cleared by a failed submit. */
const operatorClause = ref("");

/** The refusal code from the last start attempt, or `null`. A CODE, mapped to
 *  copy at render time — never a message from the backend. */
const refusal = ref<keyof typeof SCAN_REFUSAL_COPY | null>(null);

/** The clause-rejection code from the last start attempt. A DIFFERENT state
 *  from a refusal: nothing was started, no row exists, and the clause is echoed
 *  back for editing. */
const clauseRejection = ref<
  Extract<StartScanOutcome, { outcome: "clause-rejected" }>["reason"] | null
>(null);

/** When the last read that ANSWERED landed. It is what the stale sentence
 *  quotes, and it is a wall-clock rather than a payload field because the claim
 *  is about the READ and not about the walk. */
const lastGoodReadAt = ref<number | null>(null);

/**
 * When any counter last changed, and the clock the stall marker is measured
 * against.
 *
 * `now` TICKS ON A TIMER, which is what lets the stall marker ever appear: a
 * scan whose backend has stopped answering the event channel produces no new
 * payload, so a word computed only on payload arrival would never become "Not
 * advancing" — precisely on the build where it matters. A ticking NUMBER is not
 * an indeterminate indicator: nothing pulses, nothing spins, and the only thing
 * that changes on screen is a word that means something.
 */
const lastCounterChangeAt = ref<number | null>(null);
const now = ref(Date.now());
let tick: ReturnType<typeof setInterval> | null = null;

/**
 * The live progress store (plan 06-09), created and OWNED here.
 *
 * Created in the component that renders it so the stop handle has an owner —
 * research P-04's leak is a subscription nobody stops. It is the throttle half
 * of the coalescer and nothing else: no triage lock is passed in, so there is
 * none to consult even by accident. A progress strip has no rows and no cursor,
 * so its correct relationship to the lock is not "exempt from it" but "never
 * behind it".
 */
const progressStore = useScanProgress({
  projectId: computed(() => projectId),
  subscribe: (handler) => subscribe(handler),
});

async function read(): Promise<void> {
  reading.value = true;
  const result = await load();
  reading.value = false;
  settled.value = true;

  if (!result.ok) {
    // A CALL THAT DID NOT ANSWER IS ITSELF A FINDING ABOUT THE BACKEND, and the
    // copy says so — while being careful NOT to claim the scan stopped, which
    // is a different fact this component cannot observe. The reason code is not
    // rendered: it is a DefMiner-authored identifier the UI maps to its own
    // copy, never a sentence it interpolates. THE PREVIOUS PAYLOAD IS NOT
    // CLEARED: clearing the numbers would read as "the scan reset".
    failed.value = true;
    return;
  }
  failed.value = false;
  lastGoodReadAt.value = Date.now();
  scan.value = result.value;
}

onMounted(() => {
  // Not awaited in an async hook: the heading and the purpose paragraph must be
  // on screen before this resolves, and `load` answers with a VALUE on every
  // path so a failure is a rendered state rather than a rejection Caido would
  // swallow.
  void read();
  tick = setInterval(() => {
    now.value = Date.now();
  }, 1_000);
});

onUnmounted(() => {
  // BOTH halves. Stopping the timer alone leaves the subscription delivering
  // into a store this component no longer owns, and stopping the subscription
  // alone leaves a timer writing to a ref nothing renders.
  if (tick !== null) clearInterval(tick);
  progressStore.stop();
});

/**
 * The re-read action's only caller.
 *
 * THE DOUBLE-SUBMIT GUARD IS HERE, AT THE HANDLER, and not only on the
 * `disabled` attribute. The attribute is what the operator sees; this is what
 * holds when anything else calls in — a keyboard activation racing the paint,
 * or a future caller that does not know about the attribute at all.
 */
function onRefresh(): void {
  if (reading.value) return;
  void read();
}

/** Start one scan, then re-read. */
async function onStart(): Promise<void> {
  if (starting.value) return;
  starting.value = true;
  refusal.value = null;
  clauseRejection.value = null;
  // EXACTLY WHAT THEY TYPED — never trimmed, never normalised. A form that
  // silently edits the input is a form whose output the operator cannot check
  // against the composed filter it showed them.
  const result = await start({ operatorFilter: operatorClause.value });
  starting.value = false;

  if (!result.ok) {
    failed.value = true;
    return;
  }
  if (result.value.outcome === "clause-rejected") {
    // NOTHING WAS STARTED and the surface stays exactly where it was, with
    // every typed character intact.
    clauseRejection.value = result.value.reason;
    return;
  }
  if (result.value.outcome === "refused") {
    refusal.value = result.value.reason;
    return;
  }
  // Re-read rather than fabricating a payload from the outcome. The row the
  // backend actually wrote is the only thing worth rendering, and a
  // locally-assembled one would be a second construction of a shape whose whole
  // value is that both sides agree about it.
  await read();
}

/**
 * The three lifecycle commands, over one shape.
 *
 * EVERY ONE RE-READS. A command's outcome carries the state the row moved to,
 * and rendering from it would be a second construction of the payload — the
 * same argument `onStart` makes. A guard that DECLINED (`ok: true,
 * changed: false`) is not an error and is not reported as one: it is what an
 * impatient double-click produces, and the re-read shows the operator the state
 * that actually holds.
 */
async function runCommand(
  flag: typeof pausing,
  call: (scanId: string) => Promise<RpcResult<ScanCommandOutcome>>,
): Promise<void> {
  const row = scan.value;
  if (row === null || flag.value) return;
  flag.value = true;
  const result = await call(row.scanId);
  flag.value = false;
  if (!result.ok) {
    failed.value = true;
    return;
  }
  await read();
}

function onPause(): void {
  void runCommand(pausing, pause);
}

function onResume(): void {
  void runCommand(resuming, resume);
}

/** THE FIRST OF TWO DELIBERATE PRESSES. It opens the confirmation and calls
 *  nothing — the endpoint is only reachable from inside it. */
function onDiscardRequested(): void {
  confirmingDiscard.value = true;
}

/** The escape. The NON-ACTION, and it calls nothing at all. */
function onKeepIt(): void {
  confirmingDiscard.value = false;
}

async function onDiscardConfirmed(): Promise<void> {
  await runCommand(discarding, discard);
  confirmingDiscard.value = false;
}

/**
 * The confirmation's default focus is the way OUT of it.
 *
 * The same move the shipped raw-export dialog makes, by the same mechanism, for
 * the same reason: the keyboard path out of a destructive dialog must not be
 * the destructive button. `focusById` after `nextTick` rather than a template
 * ref, because the element is inside a conditional block and does not exist
 * until the block has rendered — and because `focusById` is the one place this
 * package reaches for `document`, which keeps the DOM access in a module the
 * safety gate already walks.
 */
const KEEP_IT_BUTTON_ID = "defminer-scan-discard-keep";
watch(confirmingDiscard, (open) => {
  if (!open) return;
  void nextTick(() => {
    focusById(KEEP_IT_BUTTON_ID);
  });
});

// ---------------------------------------------------------------------------
// DERIVED
// ---------------------------------------------------------------------------

/**
 * The payload as it stands RIGHT NOW: the status read, with the live progress
 * event layered over it.
 *
 * THE EVENT IS THE UPDATE — there is no re-query behind it, because there is no
 * table: every field on the progress payload is an integer, a boolean or a
 * closed-vocabulary word the backend already computed. The scan id is checked
 * before layering, so a payload belonging to a scan this panel is not showing
 * cannot put a wrong number on screen.
 */
const live = computed<ScanStatusPayload | null>(() => {
  const row = scan.value;
  if (row === null) return null;
  const progress = progressStore.progress.value;
  if (progress === null || progress.scanId !== row.scanId) return row;
  return {
    ...row,
    state: progress.state,
    pagesWalked: progress.pagesWalked,
    seen: progress.seen,
    admitted: progress.admitted,
    skippedDone: progress.skippedDone,
    rejected: progress.rejected,
    queued: progress.queued,
    analysed: progress.analysed,
    lastCreatedAt: progress.lastCreatedAt,
    heldAtWatermark: progress.heldAtWatermark,
  };
});

/**
 * THE STALL CLOCK IS RESET BY ANY COUNTER AND NEVER BY THE POSITION DATE.
 *
 * A scan covering a single day would leave a date-only signal frozen while the
 * counters moved, so a marker derived from the date would fire on a perfectly
 * healthy walk. The fingerprint covers every counter including the one that is
 * `null`, so a scan whose only moving number is the absent one still reads as
 * moving once that number exists.
 */
let fingerprint: string | null = null;
watch(
  live,
  (row) => {
    if (row === null) return;
    const next = counterFingerprint(row);
    if (next !== fingerprint) {
      fingerprint = next;
      lastCounterChangeAt.value = Date.now();
    }
  },
  { immediate: true },
);

/** The live readout renders only when there IS a scan. */
const showReadout = computed<boolean>(() => scan.value !== null);

/** The start form renders when a settled read found no scan. Never beside the
 *  readout, and never before the first read settles — a form that appeared and
 *  was then replaced would invite a press that arrives after the state moved.
 *  Never after a FAILED read either: a call that did not answer is not evidence
 *  that there is no scan. */
const showStartForm = computed<boolean>(
  () => settled.value && !failed.value && scan.value === null,
);

/** The failure with NO numbers behind it — the first read never answered, so
 *  there is nothing to mark stale. */
const showBareFailure = computed<boolean>(
  () => settled.value && failed.value && scan.value === null,
);

/** The failure WITH numbers behind it. They stay on screen and are marked
 *  stale in words. */
const showStale = computed<boolean>(() => failed.value && scan.value !== null);

/**
 * The status LINE — a computed presentation state, distinct from the four
 * persisted lifecycle states.
 *
 * Seven words over four states, computed by the contract module's pure function
 * so the precedence is testable without mounting anything. The precedence that
 * matters is written there: the watermark hold OUTRANKS the stall marker,
 * because from outside the backend a hold and a blocked thread look identical
 * and the marker firing on the most common healthy state of a long backfill
 * teaches the operator to ignore it.
 */
const statusWord = computed<string>(() => {
  const row = live.value;
  if (row === null) return "";
  return scanStatusWord({
    state: row.state,
    heldAtWatermark: row.heldAtWatermark,
    pagesWalked: row.pagesWalked,
    lastCounterChangeAt: lastCounterChangeAt.value,
    now: now.value,
  });
});

/** The sentence under the two running words that need one. The other five need
 *  none: they say what they mean. */
const statusLine = computed<string | null>(() => {
  if (statusWord.value === SCAN_STATUS_WAITING_FOR_QUEUE) {
    return SCAN_WAITING_FOR_QUEUE_LINE;
  }
  if (statusWord.value === SCAN_STATUS_NOT_ADVANCING) {
    return SCAN_NOT_ADVANCING_LINE;
  }
  return null;
});

/**
 * The position line, or `null`.
 *
 * ABSENT BEFORE THE FIRST PAGE, never a placeholder date and never the epoch.
 * The status line carries "Starting…" instead — a number DefMiner does not have
 * is absent, never zero.
 */
const position = computed<string | null>(() =>
  live.value === null ? null : positionText(live.value.lastCreatedAt),
);

/** The composed filter the backend built, sanitised. ONE of the two
 *  display-path calls on this surface, because it carries the operator's own
 *  clause echoed back. */
const composedLive = computed<string>(() =>
  live.value === null ? "" : forCellText(live.value.composedFilter),
);

/** The composed filter this form WILL send, built here because no scan exists
 *  yet to have built it. Sanitised for the same reason. */
const composedPreviewText = computed<string>(() =>
  forCellText(composedPreview(defminerClause, operatorClause.value)),
);

/** DefMiner's own clause, sanitised too — not because its provenance is in
 *  doubt but because the element it lands in must not become the one element on
 *  the page with a different rule. */
const ownClause = computed<string>(() => forCellText(defminerClause));

/** The rejected clause, echoed for editing. THE SECOND display-path call, and
 *  it lands in its own element outside any sentence. */
const rejectedClauseEcho = computed<string>(() =>
  forCellText(operatorClause.value),
);

function valueOf(
  id: (typeof SCAN_STRIP_COUNTERS)[number]["id"],
): number | null {
  const row = live.value;
  return row === null ? null : row[id];
}

const startLabel = computed<string>(() =>
  starting.value ? SCAN_STARTING_LABEL : SCAN_START_CTA,
);

const refreshLabel = computed<string>(() =>
  reading.value ? SCAN_REFRESHING_LABEL : SCAN_REFRESH_LABEL,
);

const pauseLabel = computed<string>(() =>
  pausing.value ? SCAN_PAUSING_LABEL : SCAN_PAUSE_CTA,
);

const resumeLabel = computed<string>(() =>
  resuming.value ? SCAN_RESUMING_LABEL : SCAN_RESUME_CTA,
);

const discardLabel = computed<string>(() =>
  discarding.value ? SCAN_DISCARDING_LABEL : SCAN_DISCARD_CTA,
);

const refusalBody = computed<string | null>(() =>
  refusal.value === null ? null : SCAN_REFUSAL_COPY[refusal.value],
);

const rejectionLine = computed<string | null>(() =>
  clauseRejection.value === null
    ? null
    : clauseRejectedLine(clauseRejection.value),
);

const staleBody = computed<string>(() => scanStaleBody(lastGoodReadAt.value));

/** Which of the two occupied states is holding the start form's slot. */
const oneAtATime = computed<string | null>(() => {
  const row = live.value;
  if (row === null) return null;
  if (row.state === "running") return SCAN_ONE_AT_A_TIME_RUNNING;
  if (row.state === "suspended") return SCAN_ONE_AT_A_TIME_SUSPENDED;
  return null;
});

/** A suspension always says who or what stopped it and what to do next. */
const suspensionBody = computed<string | null>(() => {
  const row = live.value;
  if (row === null || row.state !== "suspended" || row.suspendReason === null) {
    return null;
  }
  return SCAN_SUSPEND_COPY[row.suspendReason]({
    at: row.updatedAt,
    // NOT ON THE PAYLOAD, so it is not named. A fabricated cap on the one
    // mechanism that deletes the operator's history would be worse than the
    // missing clause, and the action the sentence asks for does not need it.
    rowCap: null,
  });
});

const resumeClause = computed<string | null>(() =>
  live.value === null ? null : resumePositionClause(live.value.lastCreatedAt),
);

/** The eviction suspension is the only one with an action beyond resuming. */
const evicted = computed<boolean>(
  () => live.value?.suspendReason === "retention_eviction",
);

const suspended = computed<boolean>(() => live.value?.state === "suspended");

const rejectTotalLine = computed<string | null>(() =>
  live.value === null ? null : rejectBreakdownUnavailable(live.value.rejected),
);

const detailValue = (id: (typeof SCAN_DETAIL_COUNTERS)[number]["id"]): string =>
  counterText(valueOf(id));

const BUTTON_CLASS =
  "border border-surface-600 px-2 py-1 text-xs font-semibold";

// NO COMMENT AT THE TOP OF THE `<template>`: a comment there is a node, which
// makes the component a fragment and leaves every root-class assertion reading
// `[]` (the trap safety/HighlightSlices.vue records).
</script>

<template>
  <div class="flex flex-col gap-4 overflow-y-auto" data-defminer-scan>
    <div class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold leading-snug">{{ SCAN_HEADING }}</h2>
      <p class="text-surface-400">{{ SCAN_PURPOSE }}</p>
    </div>

    <!-- THE STATUS LINE AND THE POSITION LINE COME FIRST, because the
         operator's question on arrival is "is it moving". The position date
         marches BACKWARDS into history — the walk is descending — and a date
         moving backwards is legible as progress in a way a rising integer is
         not: it answers "how far back have I got", which is the question the
         missing denominator was going to answer.

         `role="status"` HERE AND NEVER ON THE STRIP. The strip updates up to
         twice a second and a live region over four counters at 2 Hz would flood
         a screen reader with numbers for hours; this line changes rarely and
         its changes are exactly what a non-sighted operator needs announced. -->
    <div
      v-if="showReadout"
      class="flex flex-col gap-1"
      role="status"
      data-defminer-scan-status
    >
      <p
        :class="[
          'text-sm font-semibold',
          statusWord === SCAN_STATUS_NOT_ADVANCING
            ? 'text-info-500'
            : 'text-surface-100',
        ]"
      >
        {{ statusWord }}
      </p>
      <!-- THE WORD IS NEVER ALONE FOR THE TWO THAT NEED EXPLAINING. One of
           them is the healthiest state on a long backfill and the other is the
           only bad one, and a bare two-word label cannot carry that
           difference. -->
      <p v-if="statusLine !== null" class="text-surface-400">
        {{ statusLine }}
      </p>
      <p v-if="position !== null" class="text-surface-400">
        {{ SCAN_POSITION_PREFIX }} {{ position }}
      </p>
    </div>

    <!-- A SUSPENSION IS `info` AND `role="status"`, NEVER `role="alert"` AND
         NEVER `danger`. Nothing failed: every route here is operator-initiated,
         expected and recoverable, or a resource bound doing its job. -->
    <div
      v-if="showReadout && suspended && suspensionBody !== null"
      class="flex flex-col gap-1 border border-info-500 px-2 py-1 text-info-500"
      role="status"
      data-defminer-scan-suspension
    >
      <p>{{ suspensionBody }}</p>
      <p v-if="evicted">{{ SCAN_EVICTION_SWEEP_NOTE }}</p>
      <!-- APPENDED TO EVERY REASON. It is the sentence that makes a suspension
           cheap, and the reason a mis-clicked pause costs nothing. -->
      <p v-if="resumeClause !== null">{{ resumeClause }}</p>
      <div v-if="evicted">
        <button
          id="defminer-scan-open-settings"
          type="button"
          :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
          @click="emit('open-settings')"
        >
          {{ SCAN_OPEN_SETTINGS_LABEL }}
        </button>
      </div>
    </div>

    <!-- A READ THAT DID NOT ANSWER, WITH NUMBERS STILL ON SCREEN. They are
         NEITHER CLEARED (which would read as "the scan reset") NOR LEFT
         UNMARKED (which would read as a stall) — numbers that stop moving with
         nothing on screen to say why is the precise appearance this whole
         surface exists to prevent. -->
    <div
      v-if="showStale"
      class="flex flex-col gap-2 border border-danger-500 px-2 py-1 text-danger-500"
      role="alert"
      data-defminer-scan-stale
    >
      <p>{{ staleBody }}</p>
      <div class="flex gap-2">
        <button
          id="defminer-scan-retry"
          type="button"
          :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
          :disabled="reading"
          @click="onRefresh"
        >
          {{ SCAN_RETRY_LABEL }}
        </button>
        <button
          id="defminer-scan-open-health"
          type="button"
          :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
          @click="emit('open-health')"
        >
          {{ SCAN_OPEN_HEALTH_LABEL }}
        </button>
      </div>
    </div>

    <!-- THE STRIP. Its height comes from ONE utility and its cells are kept
         from wrapping by two more, none of them conditional on any value: a
         strip whose height is decided by its content is a strip that grows the
         first time a counter passes a million, and this one is on screen for
         hours. Four cells and not seven — seven at `gap-8` would wrap at
         plausible panel widths, and a wrapping strip reflows what is below it.
         No animation of any kind. -->
    <div
      v-if="showReadout"
      :class="[
        SCAN_STRIP_HEIGHT_CLASS,
        'flex shrink-0 items-center gap-8 border border-surface-600 px-4',
      ]"
      data-defminer-scan-strip
    >
      <div
        v-for="counter in SCAN_STRIP_COUNTERS"
        :id="counterId(counter.id)"
        :key="counter.id"
        :class="[SCAN_CELL_CLASS, 'flex items-center gap-1']"
      >
        <span class="text-xs font-semibold text-surface-400">{{
          counter.label
        }}</span>
        <span class="text-sm">{{ counterText(valueOf(counter.id)) }}</span>
      </div>
    </div>

    <!-- THE SINGLE MOST IMPORTANT SENTENCE ON THIS SURFACE, directly under the
         strip and never repeated per counter. Prose in body weight, not a
         tooltip and not behind a disclosure: a sentence explaining why the
         surface looks the way it looks must not be hidden behind an interaction
         the operator has no reason to perform. -->
    <p v-if="showReadout" class="text-surface-400" data-defminer-scan-note>
      {{ SCAN_NO_DENOMINATOR_NOTE }}
    </p>

    <!-- THE COMPOSED FILTER — the exact string that is being sent. Its own
         `font-mono` element, never inside a sentence. -->
    <section v-if="showReadout" class="flex flex-col gap-1">
      <h3 class="text-xs font-semibold">{{ SCAN_COMPOSED_LABEL }}</h3>
      <p :class="SCAN_CLAUSE_CLASS" data-defminer-scan-composed>
        {{ composedLive }}
      </p>
    </section>

    <!-- WHICH OF THE TWO OCCUPIED STATES IS HOLDING THE START FORM'S SLOT.
         "One scan per project" is an invariant the operator did not choose, so
         it is a state of the surface with a way out rather than a disabled
         control whose only content is "no". -->
    <p
      v-if="showReadout && oneAtATime !== null"
      class="text-surface-400"
      data-defminer-scan-one-at-a-time
    >
      {{ oneAtATime }}
    </p>

    <p v-if="!settled" class="text-surface-400">{{ SCAN_LOADING_LABEL }}</p>

    <!-- A FIRST READ THAT DID NOT ANSWER. No numbers exist to mark stale, and
         the start form is deliberately NOT offered: a call that did not answer
         is not evidence that there is no scan. -->
    <div
      v-else-if="showBareFailure"
      class="flex flex-col gap-2 border border-danger-500 px-2 py-1 text-danger-500"
      role="alert"
      data-defminer-scan-failed
    >
      <p>{{ SCAN_FAILED_BODY }}</p>
      <div class="flex gap-2">
        <button
          id="defminer-scan-retry"
          type="button"
          :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
          :disabled="reading"
          @click="onRefresh"
        >
          {{ SCAN_RETRY_LABEL }}
        </button>
        <button
          id="defminer-scan-open-health"
          type="button"
          :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
          @click="emit('open-health')"
        >
          {{ SCAN_OPEN_HEALTH_LABEL }}
        </button>
      </div>
    </div>

    <!-- THE START FORM. Absent — not disabled — whenever a scan exists. -->
    <section
      v-if="showStartForm"
      class="flex flex-col gap-4"
      data-defminer-scan-form
    >
      <div class="flex flex-col gap-1">
        <h3 class="text-xs font-semibold">
          {{ SCAN_DEFMINER_CLAUSE_LABEL }}
        </h3>
        <p :class="SCAN_CLAUSE_CLASS">{{ ownClause }}</p>
      </div>

      <!-- THE ONE UNBOUNDED STRING ON THIS SURFACE, and it is routinely pasted
           from a target's own page. `font-mono` is a security control here and
           not a style: an HTTPQL clause is code, and it is compared character
           by character by the person reading it. -->
      <div class="flex flex-col gap-1">
        <label class="text-xs font-semibold" for="defminer-scan-clause">
          {{ SCAN_OPERATOR_CLAUSE_LABEL }}
        </label>
        <input
          id="defminer-scan-clause"
          v-model="operatorClause"
          type="text"
          :class="[
            FOCUS_RING_CLASS,
            'border border-surface-600 px-2 py-1 font-mono text-xs',
          ]"
          :disabled="starting"
        />
        <p class="text-surface-400">{{ SCAN_OPERATOR_CLAUSE_HELP }}</p>
      </div>

      <div class="flex flex-col gap-1">
        <h3 class="text-xs font-semibold">{{ SCAN_COMPOSED_LABEL }}</h3>
        <p :class="SCAN_CLAUSE_CLASS" data-defminer-scan-composed>
          {{ composedPreviewText }}
        </p>
        <p class="text-surface-400">{{ SCAN_COMPOSED_HELP }}</p>
      </div>

      <!-- D-07, SAID BEFORE THE SCAN RUNS rather than after it returns fewer
           results than expected. The asymmetry is genuinely surprising and
           there is no way to soften it. -->
      <p class="text-surface-400">{{ SCAN_SCOPE_STATEMENT }}</p>

      <!-- A REFUSAL IS RENDERED FROM ITS CODE, never from a backend message. -->
      <p
        v-if="refusalBody !== null"
        class="border border-danger-500 px-2 py-1 text-danger-500"
        role="alert"
        data-defminer-scan-refused
      >
        {{ refusalBody }}
      </p>

      <!-- A REJECTED CLAUSE. The reason is DefMiner-authored and Caido's parser
           text never reaches it — that text quotes what the operator typed back
           at them INSIDE a sentence, and the clause is target-influenced. It is
           echoed here in its OWN sanitised `font-mono` element instead. -->
      <div
        v-if="rejectionLine !== null"
        class="flex flex-col gap-1 border border-danger-500 px-2 py-1"
        data-defminer-scan-refused
      >
        <!-- `role="alert"` ON THE DEFMINER-AUTHORED SENTENCE ALONE, and
             deliberately NOT on the element holding the clause. A live region
             is read aloud the moment it changes; putting a target-influenced
             string inside one would announce whatever a hostile page put in the
             operator's clipboard. The echo below is a sibling, sanitised, and
             silent. -->
        <p class="text-danger-500" role="alert">{{ rejectionLine }}</p>
        <p :class="SCAN_CLAUSE_CLASS" data-defminer-scan-clause-echo>
          {{ rejectedClauseEcho }}
        </p>
      </div>

      <div>
        <button
          id="defminer-scan-start"
          type="button"
          :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
          :disabled="starting"
          @click="void onStart()"
        >
          {{ startLabel }}
        </button>
      </div>
    </section>

    <!-- THE CONTROLS. Pause and Resume `surface`-toned; Discard `danger`-toned
         and separated by the contract's `sm` gap. That visible asymmetry IS
         D-10, rendered: a mis-clicked pause on a multi-hour backfill costs
         nothing, and the control that costs everything does not look like it.
         Each in-flight action takes its OWN label, never a spinner beside the
         old one. -->
    <div
      v-if="showReadout"
      class="flex items-center gap-2"
      data-defminer-scan-controls
    >
      <button
        v-if="!suspended"
        id="defminer-scan-pause"
        type="button"
        :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
        :disabled="pausing"
        @click="onPause"
      >
        {{ pauseLabel }}
      </button>
      <button
        v-else
        id="defminer-scan-resume"
        type="button"
        :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
        :disabled="resuming"
        @click="onResume"
      >
        {{ resumeLabel }}
      </button>
      <button
        id="defminer-scan-discard"
        type="button"
        :class="[FOCUS_RING_CLASS, BUTTON_CLASS, DESTRUCTIVE_BUTTON_CLASS]"
        :disabled="discarding || confirmingDiscard"
        @click="onDiscardRequested"
      >
        {{ SCAN_DISCARD_CTA }}
      </button>
      <!-- A TEXT LABEL, never an icon, and its own label in flight. The whole
           diagnosis is "does the number move", so one sample on mount could not
           answer the question this surface exists for. -->
      <button
        id="defminer-scan-refresh"
        type="button"
        :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
        :disabled="reading"
        @click="onRefresh"
      >
        {{ refreshLabel }}
      </button>
    </div>

    <!-- THE PHASE'S ONE DESTRUCTIVE CONFIRMATION, mounted IN the panel rather
         than as an overlay — the shape the shipped export dialog established.
         It names what is destroyed and what is not, quantifies the loss from
         the real position and count, and focuses the NON-action. -->
    <div
      v-if="showReadout && confirmingDiscard && live !== null"
      class="flex flex-col gap-2 border border-danger-500 bg-surface-800 p-4 text-xs"
      role="alertdialog"
      aria-modal="true"
      :aria-label="SCAN_DISCARD_HEADING"
      data-defminer-scan-discard-confirm
    >
      <h3 class="font-semibold">{{ SCAN_DISCARD_HEADING }}</h3>
      <p>{{ discardConfirmBody(live.lastCreatedAt, live.seen) }}</p>
      <div class="flex gap-2">
        <button
          id="defminer-scan-discard-confirm"
          type="button"
          :class="[FOCUS_RING_CLASS, BUTTON_CLASS, DESTRUCTIVE_BUTTON_CLASS]"
          :disabled="discarding"
          @click="void onDiscardConfirmed()"
        >
          {{ discardLabel }}
        </button>
        <button
          :id="KEEP_IT_BUTTON_ID"
          type="button"
          :class="[FOCUS_RING_CLASS, BUTTON_CLASS]"
          :disabled="discarding"
          @click="onKeepIt"
        >
          {{ SCAN_DISCARD_KEEP_LABEL }}
        </button>
      </div>
    </div>

    <!-- THE SLOWER COUNTERS AND THEIR EXPLANATIONS LIVE BELOW THE STRIP AND
         NEVER INSIDE IT. A sentence in a fixed-height row is the thing that
         wraps. -->
    <section v-if="showReadout" class="flex flex-col gap-2">
      <h3 class="text-xs font-semibold">{{ SCAN_DETAIL_HEADING }}</h3>
      <dl class="flex flex-col gap-2">
        <div
          v-for="counter in SCAN_DETAIL_COUNTERS"
          :key="counter.id"
          class="flex flex-col gap-1"
        >
          <dt class="text-xs font-semibold">
            {{ counter.label }} · {{ detailValue(counter.id) }}
          </dt>
          <dd class="text-surface-400">{{ counter.help }}</dd>
        </div>
        <div
          v-for="counter in SCAN_STRIP_COUNTERS"
          :key="counter.id"
          class="flex flex-col gap-1"
        >
          <dt class="text-xs font-semibold">{{ counter.label }}</dt>
          <dd class="text-surface-400">{{ counter.help }}</dd>
        </div>
      </dl>
    </section>

    <!-- WHY REQUESTS WERE REJECTED. The per-reason breakdown is NOT DURABLE —
         only the aggregate lives on the scan row — so this block renders the
         real total and says the breakdown was not stored, rather than six
         zeroes, which would claim nothing was rejected for any reason. -->
    <section
      v-if="showReadout && rejectTotalLine !== null"
      class="flex flex-col gap-2"
      data-defminer-scan-rejects
    >
      <h3 class="text-xs font-semibold">{{ SCAN_REJECT_HEADING }}</h3>
      <p class="text-surface-400">{{ rejectTotalLine }}</p>
      <div class="flex flex-col gap-1">
        <p class="text-xs font-semibold">
          {{ SCAN_REJECT_OUT_OF_SCOPE_LABEL }}
        </p>
        <p class="text-surface-400">{{ SCAN_REJECT_OUT_OF_SCOPE_BODY }}</p>
      </div>
    </section>
  </div>
</template>
