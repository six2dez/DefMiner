// packages/frontend/src/components/scan-contract.ts — every string, every
// counter and every layout constant the Scan tab renders (FIND-04, D-13, D-14).
//
// ===========================================================================
// WHY THE COPY LIVES IN A MODULE AND NOT IN THE TEMPLATE
// ===========================================================================
// The argument `panel-contract.ts`, `export-contract.ts`, `settings-contract.ts`
// and `health-contract.ts` all make, unchanged: a string typed into a template
// is a string a spec has to retype to assert, and two typings of one sentence
// are two sentences.
//
// ===========================================================================
// THE HARDEST COPY PROBLEM IN THE PHASE, STATED SO IT IS NOT REDISCOVERED
// ===========================================================================
// This surface reports a job that runs for hours WITH NO DENOMINATOR. There is
// no percentage, no total and no bar, and that is a decision rather than a gap:
// Caido cannot count the requests matching an HTTPQL filter without
// transferring every matching response body — which IS the scan — so a total
// would cost a second full pass, and a percentage against an operator-supplied
// guess is a fabricated number.
//
// The problem that creates: a readout with no fraction must read as PROGRESS
// rather than as a stalled screen, on a backend whose single thread genuinely
// does stop for seconds at a time. Four devices carry it and each is a constant
// below rather than a paragraph somebody has to remember —
//
//   1. The fastest-moving counters LEAD. Progress with no denominator is
//      demonstrated by change over time, so the strip holds what changes.
//   2. The POSITION LINE is the narrative a counter cannot be. The walk is
//      descending, so the date marches BACKWARDS into history — and a date
//      moving backwards answers "how far back have I got", which is the
//      question the missing denominator was going to answer.
//   3. The no-denominator note is stated ONCE, as a decision. Without it the
//      operator reads an omission and infers a bug; with it, the missing
//      fraction is an engineering position they can disagree with. It is the
//      single most important sentence on this surface.
//   4. NOTHING IS INDETERMINATE. No bar, no spinner, no pulse, no animated
//      ellipsis. A tool that will not fabricate a percentage must not fabricate
//      reassurance either.
//
// ===========================================================================
// TWO VOCABULARIES, ONE WORD, AND NO SHARED LABEL
// ===========================================================================
// `scan_state` is an ARTIFACT'S ANALYSIS state and ships as Queued / Analysing /
// Complete / Partial / Failed in `scan-state-presentation.ts`. The lifecycle
// state of a retroactive scan is a different closed vocabulary that shares the
// literal `running`. No label below is shared with that map, and — the part a
// set-disjointness check would miss — no label below is a PREFIX of one there:
// `completed` renders **Finished** and never "Completed", because the analysis
// vocabulary already ships "Complete" and a one-character difference between
// two states that mean opposite things is not a difference.

import type {
  ScanLifecycleState,
  ScanStatusPayload,
  SuspendReason,
} from "@defminer/engine/contract";
import {
  ARTIFACT_DEADLINE_MS,
  RETENTION_SWEEP_EVERY_N,
} from "@defminer/engine/thresholds";

import type { StartScanOutcome } from "../api/client";

import { counted, groupThousands } from "./table-contract";

/**
 * Every field on {@link ScanStatusPayload} that is a COUNTER.
 *
 * Derived from the payload by mapped type rather than written out, so a counter
 * row naming `state` or `composedFilter` — both perfectly real fields, neither
 * of them a number — is a typecheck failure at the declaration rather than an
 * object rendered into a cell. The alternative was a hand-written union, which
 * is a second list of the payload's shape that only ever changes in one place.
 */
type ScanCounterField = {
  [K in keyof ScanStatusPayload]: ScanStatusPayload[K] extends number | null
    ? K
    : never;
}[keyof ScanStatusPayload];

/**
 * Why the start endpoint refused, EXTRACTED FROM THE CONTRACT.
 *
 * `Extract<…>["reason"]` and not a copy of the four codes: the copy map below
 * is a `Record` over this, so a fifth reason added to the RPC contract without
 * a sentence here stops the build. A hand-written union here would let the two
 * drift with the map still looking exhaustive.
 */
type ScanRefusalReason = Extract<
  StartScanOutcome,
  { outcome: "refused" }
>["reason"];

/**
 * Why the start endpoint refused the operator's CLAUSE. A different question
 * from {@link ScanRefusalReason} and deliberately a different outcome.
 *
 * The two are not folded together because NOTHING IS STARTED on this path — no
 * row is created, so the operator's next press is a fresh attempt rather than a
 * second scan — and because the copy differs: a rejected clause is echoed back
 * for editing, while an occupied slot points at a scan that already exists.
 * Extracted from the outcome union for the same reason as above: a fifth
 * rejection code added to the RPC contract without a phrase here stops the
 * build.
 */
type ScanClauseRejection = Extract<
  StartScanOutcome,
  { outcome: "clause-rejected" }
>["reason"];

// ---------------------------------------------------------------------------
// COPY — THE START FORM
// ---------------------------------------------------------------------------

/** The section heading, on both states of the surface. */
export const SCAN_HEADING = "Scan traffic Caido already captured";

/**
 * Why the operator is looking at this, said on the surface itself.
 *
 * It names the two situations that create the need — DefMiner installed after
 * the browsing happened, or a host added to scope afterwards — because an
 * operator who has only ever used the live path has no reason to guess that
 * either is a thing this tool can fix.
 */
export const SCAN_PURPOSE =
  "DefMiner analyses JavaScript as you browse. A retroactive scan applies the same analysis to traffic Caido captured before DefMiner was installed — or before you added this host. It walks backwards from now, newest traffic first.";

/** Over the read-only clause. NOT an input: it is context, and it cannot be
 *  edited or removed. */
export const SCAN_DEFMINER_CLAUSE_LABEL = "DefMiner always scans for";

/** Over the operator's own input. OPTIONAL, and the label says so — an absent
 *  clause is the common case and a complete one. */
export const SCAN_OPERATOR_CLAUSE_LABEL = "Narrow it further (optional)";

/** Beside the operator's input. It states the composition rule and D-05's
 *  direction in one sentence, because the direction is the whole promise. */
export const SCAN_OPERATOR_CLAUSE_HELP =
  "An HTTPQL clause, combined with DefMiner's own with AND. You can narrow this scan; you cannot widen it.";

/** Over the composed string. */
export const SCAN_COMPOSED_LABEL = "What will be sent";

/**
 * Why the composed filter is on screen at all.
 *
 * D-05 promises the operator may narrow the scan and never widen it. A promise
 * the operator cannot check is a promise; the composed string is a fact. It
 * also makes the clause-order rule visible — DefMiner's narrowing comes first,
 * so a trailing HTTPQL comment in an operator clause fails closed rather than
 * commenting the narrowing away.
 */
export const SCAN_COMPOSED_HELP =
  "The exact filter this scan will send, in order: DefMiner's own clauses first, yours last, every clause bracketed. You can narrow this scan; you cannot widen it.";

/** The primary action. */
export const SCAN_START_CTA = "Start scan";

/** The primary action in flight — its own label, never a spinner beside the
 *  old one. The rule the shipped Save and Refresh actions already obey. */
export const SCAN_STARTING_LABEL = "Starting…";

/**
 * D-07's scope statement, said before the scan runs rather than after it
 * returns fewer results than expected.
 *
 * The asymmetry it names is genuinely surprising and there is no way to soften
 * it: traffic captured while a host was in scope becomes UNSCANNABLE once that
 * host leaves scope, and no filter the operator can write reaches it.
 */
export const SCAN_SCOPE_STATEMENT =
  "Caido's scope is applied with no override. Traffic captured while a host was in scope becomes unscannable once that host leaves scope — DefMiner will not read it back. Scope is Caido's own setting, not DefMiner's.";

// ---------------------------------------------------------------------------
// COPY — ONE SCAN AT A TIME
// ---------------------------------------------------------------------------
//
// TWO SENTENCES AND NOT ONE, AND THE SPLIT IS THE WHOLE VALUE OF THEM. "One
// scan per project" is an invariant the operator did not choose, so it is
// stated as a STATE OF THE SURFACE with a way out rather than as a disabled
// control whose only content is "no". Which of the two occupied states is
// holding the slot decides the operator's NEXT ACTION — pause or discard for
// one, resume or discard for the other — so a merged sentence would tell them
// to press a control that is not on screen.
//
// Each is used TWICE and typed ONCE: as the refusal body when a start is
// declined, and as the sentence beside the live readout that explains why the
// start form is not there. Two typings of one sentence are two sentences.

/** A `running` scan holds the slot. */
export const SCAN_ONE_AT_A_TIME_RUNNING =
  "A scan is already running on this project. DefMiner runs one scan at a time — pause or discard it before starting another.";

/** A `suspended` scan holds the slot. It is holding a POSITION, which is what
 *  makes discarding it a loss and resuming it the cheap move. */
export const SCAN_ONE_AT_A_TIME_SUSPENDED =
  "A suspended scan is holding its place in this project's history. DefMiner runs one scan at a time — resume it, or discard it, before starting another.";

// ---------------------------------------------------------------------------
// COPY — REFUSALS
// ---------------------------------------------------------------------------

/**
 * Every refusal the start endpoint can answer with, as a map from its CODE.
 *
 * A `Record` over the closed union and not a lookup with a fallback: a new
 * reason added to the contract without a sentence here is a typecheck failure,
 * where a fallback would render a refusal as a blank line and leave the
 * operator pressing a button that silently does nothing.
 *
 * NO CODE IS EVER RENDERED and no backend message is ever interpolated. The
 * alternative on this path is Caido's HTTPQL parser text, which quotes what the
 * operator typed back inside a sentence.
 */
export const SCAN_REFUSAL_COPY: Record<ScanRefusalReason, string> =
  Object.freeze({
    "no-project":
      "No project is open, so there is no traffic to scan. Open a project in Caido and start the scan from there.",
    "already-running": SCAN_ONE_AT_A_TIME_RUNNING,
    "already-suspended": SCAN_ONE_AT_A_TIME_SUSPENDED,
    "write-failed":
      "The scan could not be recorded, so nothing was started. DefMiner has not read any traffic and nothing was changed.",
  });

// ---------------------------------------------------------------------------
// COPY — A REJECTED CLAUSE
// ---------------------------------------------------------------------------

/**
 * Why a typed clause was not accepted, as a DefMiner-AUTHORED phrase per code.
 *
 * A `Record` over the closed rejection union for the same reason the refusal
 * map is one. And the phrases are DefMiner's own rather than Caido's parser
 * text, which is the actual threat on this path (T-06-20): Caido's HTTPQL
 * errors quote whatever the operator typed back at them INSIDE a sentence, and
 * the operator's clause is routinely pasted from a target's own page. The
 * clause is echoed on this surface exactly once, in its own sanitised
 * `font-mono` element, and never inside a sentence.
 *
 * NO NUMBER IN THE LENGTH PHRASE. The cap lives on the backend and is not on
 * the RPC boundary; naming a figure here would be a second declaration of it
 * that only ever drifts.
 */
export const SCAN_CLAUSE_REJECTION_COPY: Record<ScanClauseRejection, string> =
  Object.freeze({
    comment_construct:
      "it contains a comment, which is the one construct that can reach across a parenthesis",
    unbalanced_parentheses: "its parentheses are unbalanced",
    whitespace_only: "it is only whitespace",
    too_long: "it is longer than DefMiner will send",
  });

/**
 * The rejection line, in the contract's words.
 *
 * `role="alert"` at the render site, matching the shipped settings failure
 * line. The clause itself is NOT in this string and must not be — it goes in
 * its own element beside it.
 */
export function clauseRejectedLine(reason: ScanClauseRejection): string {
  return `That filter was not accepted: ${SCAN_CLAUSE_REJECTION_COPY[reason]}. Nothing was started.`;
}

// ---------------------------------------------------------------------------
// COPY — THE PROGRESS READOUT
// ---------------------------------------------------------------------------

/** `running`, before any page has resolved. Nothing is wrong; the first query
 *  is in flight. */
export const SCAN_STATUS_STARTING = "Starting…";

/** `running`, with a page behind it. */
export const SCAN_STATUS_SCANNING = "Scanning";

/**
 * `running`, HELD AT D-01's BACKPRESSURE WATERMARK — and it is the word that
 * stops the stall marker from crying wolf.
 *
 * The scan pages only while the analysis queue's depth is below the watermark,
 * so live browsing always wins; `BoundedQueue.offer()` drops the OLDEST entry at
 * cap, and during a backfill the oldest entries ARE the responses the operator
 * is looking at. THIS IS THEREFORE A HEALTHY STATE AND THE MOST COMMON ONE ON A
 * LONG BACKFILL. Without a word of its own every legitimate hold falls through
 * to the stall marker below, and an operator who learns to ignore a stall marker
 * is worse off than one who never had it — the same argument PROJECT.md makes
 * about false positives, applied to a status line.
 *
 * A SENTENCE RATHER THAN A WORD, deliberately: "Waiting" alone says nothing
 * about what is being waited for, and what is being waited for is the whole
 * content of the reassurance.
 */
export const SCAN_STATUS_WAITING_FOR_QUEUE = "Waiting for the analysis queue";

/**
 * `running`, with NO counter moved for longer than the stall threshold, and NOT
 * held at the watermark. The only one of the four running words that is bad
 * news.
 *
 * `info` AND NOT `danger`, and it names the cause it cannot see. It is the same
 * move the shipped `partial` badge makes: a state that is not "working" is
 * marked in words rather than silently presented as fine. Its copy routes to
 * Health by name, exactly as the shipped inventory-table error copy does,
 * because a blocked QuickJS thread is precisely what Health's four counters
 * exist to distinguish from a stuck interface.
 *
 * THE THRESHOLD IS NOT DECLARED HERE. It is `ARTIFACT_DEADLINE_MS`, imported by
 * whoever computes this state and never restated: at
 * `TOKENIZER_MS_PER_MB = 783` a full `PASSIVE_MAX_BYTES` artifact takes ~6.3 s
 * to walk on a strictly serial thread, and a threshold below the shipped
 * per-artifact ceiling would fire on every large bundle.
 */
export const SCAN_STATUS_NOT_ADVANCING = "Not advancing";

/** `suspended`. Stopped, with a reason, and resumable. */
export const SCAN_STATUS_SUSPENDED = "Suspended";

/** `completed`. **Finished**, NEVER "Completed" — see this file's header. */
export const SCAN_STATUS_FINISHED = "Finished";

/** `discarded`. History only. */
export const SCAN_STATUS_DISCARDED = "Discarded";

/**
 * THE SINGLE MOST IMPORTANT SENTENCE ON THIS SURFACE.
 *
 * Rendered as prose, once, directly under the strip — not as a tooltip and not
 * behind a disclosure. A sentence that explains why the surface looks the way
 * it looks must not be hidden behind an interaction the operator has no reason
 * to perform.
 */
export const SCAN_NO_DENOMINATOR_NOTE =
  "There is no percentage. Caido cannot count the requests matching a filter without transferring every response body — which is the scan itself. A total would cost a second full pass, so DefMiner reports what it has done rather than guessing what is left.";

/** The prefix of the position line. The date follows it. */
export const SCAN_POSITION_PREFIX = "Now scanning traffic from";

/** The heading over the per-counter explanations below the strip. */
export const SCAN_DETAIL_HEADING = "What these numbers mean";

/** While the first status read is in flight. */
export const SCAN_LOADING_LABEL = "Reading scan progress…";

/**
 * What a FAILED status read says.
 *
 * IT SEPARATES THE TWO FAILURES the operator would otherwise conflate: the call
 * did not answer, which says something about the backend's thread; and the scan
 * may well still be running, which says nothing bad at all. A bare "could not
 * load" would let them conclude the scan died.
 */
export const SCAN_FAILED_BODY =
  "Could not read scan progress — the DefMiner backend did not answer. The scan itself may still be running; a backend that cannot answer a call is a backend whose thread is busy or gone. Retry, or open Health to tell those apart.";

/** The re-read action at rest. A TEXT LABEL, never an icon. */
export const SCAN_REFRESH_LABEL = "Refresh";

/** The re-read action in flight. */
export const SCAN_REFRESHING_LABEL = "Refreshing…";

/** The route to the one surface that can tell a blocked thread from a stuck
 *  interface. The same label the shipped inventory-table error copy uses. */
export const SCAN_OPEN_HEALTH_LABEL = "Open Health";

/** The route to the retention bounds, offered only beside the eviction
 *  suspension — the one suspension the operator can actually act on. */
export const SCAN_OPEN_SETTINGS_LABEL = "Open Settings";

/** The re-read after a failure. `Retry` and not `Refresh`: the two are the same
 *  call and different acts, and the word the operator reads should name the one
 *  they are performing. */
export const SCAN_RETRY_LABEL = "Retry";

/**
 * The sentence under {@link SCAN_STATUS_WAITING_FOR_QUEUE}.
 *
 * IT SAYS THE SCAN RESUMES ON ITS OWN, which is the half that stops the
 * operator reaching for a control. The hold is D-01's design working: the scan
 * pages only while queue depth is below the watermark, so live browsing always
 * wins.
 */
export const SCAN_WAITING_FOR_QUEUE_LINE =
  "The queue is near its limit, so the scan is holding off. Live browsing always gets analysed first; the scan resumes on its own.";

/**
 * The sentence under {@link SCAN_STATUS_NOT_ADVANCING}.
 *
 * THE NUMBER OF SECONDS IS COMPUTED FROM THE ENGINE'S CEILING, never typed.
 * `POLICY_DERIVED_FROM` in `engine/thresholds.ts` records the derivation
 * machine-checkably: `ARTIFACT_DEADLINE_MS` hangs off `TOKENIZER_MS_PER_MB`, at
 * which a full `PASSIVE_MAX_BYTES` artifact takes ~6.3 s to walk on a strictly
 * serial thread, and the deadline is the shipped ceiling on ANY single
 * artifact. A threshold below it would fire on every large bundle. Raising the
 * ceiling therefore rewrites this sentence rather than leaving it claiming
 * thirty seconds on a build that waits sixty.
 *
 * It names the two causes it cannot tell apart and routes to the surface that
 * can, exactly as the shipped inventory-table error copy does.
 */
export const SCAN_NOT_ADVANCING_LINE = `No counter has moved for over ${String(
  ARTIFACT_DEADLINE_MS / 1000,
)} seconds. The backend is single-threaded, so one very large bundle can hold it for a while — or the queue is full. Open Health to tell those apart.`;

/**
 * What a failed status read says WHEN THERE ARE NUMBERS ON SCREEN.
 *
 * THE NUMBERS STAY AND ARE MARKED STALE IN WORDS. Clearing them would read as
 * "the scan reset"; leaving them unmarked would read as a stall — and numbers
 * that stop moving with nothing on screen to say why is the precise appearance
 * this whole surface exists to prevent. It is careful NOT to claim the scan
 * stopped: a backend that cannot answer a call is a backend whose thread is
 * busy or gone, which says nothing about the walk.
 *
 * The moment is ABSENT rather than fabricated when no read has ever settled;
 * that case takes {@link SCAN_FAILED_BODY} instead, which has no numbers to
 * qualify.
 */
export function scanStaleBody(asOf: number | null): string {
  const from = positionText(asOf);
  const when = from === null ? "the last read that answered" : from;
  return `Could not read scan progress — the DefMiner backend did not answer. The numbers below are from ${when} and are not updating. The scan itself may still be running; a backend that cannot answer a call is a backend whose thread is busy or gone.`;
}

// ---------------------------------------------------------------------------
// COPY — WHY REQUESTS WERE REJECTED
// ---------------------------------------------------------------------------

/** The heading over the rejection breakdown. */
export const SCAN_REJECT_HEADING = "Why requests were rejected";

/** The one rejection reason whose consequence the operator can act on, and the
 *  one D-07 makes genuinely surprising. */
export const SCAN_REJECT_OUT_OF_SCOPE_LABEL = "Not in Caido's current scope.";

/** D-07's asymmetry, in full. There is no way to soften it: no filter the
 *  operator can write reaches traffic whose host has left scope. */
export const SCAN_REJECT_OUT_OF_SCOPE_BODY =
  "These were captured while the host was in scope. They are not scannable now, and raising the scan's filter will not reach them; the host has to be back in Caido's scope.";

/**
 * What the breakdown says when it is gone — WHICH IS ALWAYS, ON THIS SURFACE.
 *
 * Only the AGGREGATE `rejected` lives on the scan row; the per-reason breakdown
 * lives in the backend's in-memory telemetry sub-map and is not carried on the
 * status payload at all. So this sentence is not an edge case here, it is the
 * state — and it is written with the REAL total rather than six zeroes, because
 * six zeroes would claim that nothing was rejected for any reason on a scan
 * that rejected thousands.
 */
export function rejectBreakdownUnavailable(rejected: number): string {
  return `The per-reason breakdown is kept only while a scan is running. This scan's total is ${groupThousands(
    rejected,
  )}; the breakdown for it was not stored.`;
}

// ---------------------------------------------------------------------------
// COPY — WHY A SCAN IS SUSPENDED
// ---------------------------------------------------------------------------

/** What a suspension sentence may name. Two values, both of which DefMiner may
 *  legitimately NOT have — and an absent one is rendered as absent rather than
 *  as a zero or a placeholder. */
export type SuspendContext = {
  /** When the scan stopped, or `null`. */
  readonly at: number | null;
  /** The retention row cap in force, or `null` when this surface cannot read
   *  it. It is not on the status payload; the eviction sentence names the cap
   *  only when the caller supplies one. */
  readonly rowCap: number | null;
};

/**
 * Every suspension reason, as a sentence that names WHO OR WHAT stopped the
 * scan and what to do next.
 *
 * A `Record` over the closed reason union — a fifth reason added to the engine
 * contract without a sentence here is a typecheck error, where a lookup with a
 * fallback would render a suspension as a blank line. A scan that stopped for a
 * reason nobody can see is the frozen-looking page this whole surface exists to
 * prevent.
 *
 * FUNCTIONS RATHER THAN STRINGS, because three of the four carry a value: the
 * moment it stopped, or the cap that evicted it. It is still a `Record` over
 * the union and still exhaustive; what changes is that a sentence needing a
 * number it does not have can OMIT the clause rather than print `null`.
 *
 * A SUSPENSION IS NOT AN ERROR. Every route here is operator-initiated, or
 * expected and recoverable, or a resource bound doing its job — which is why
 * the state carries the `info` tone and `role="status"` rather than
 * `role="alert"`.
 */
export const SCAN_SUSPEND_COPY: Record<
  SuspendReason,
  (context: SuspendContext) => string
> = Object.freeze({
  operator_paused: ({ at }) => {
    const when = positionText(at);
    const moment = when === null ? "" : ` at ${when}`;
    return `Paused by you${moment}. Resume when you like — the scan keeps its place.`;
  },
  project_changed: () =>
    "Suspended because the Caido project changed. Nothing was written under the new project, and this scan kept its place in the old one. Resume it from that project.",
  process_restarted: () =>
    "Suspended because Caido restarted while it was running. DefMiner never resumes a scan on its own — resume it when you want it to continue.",
  retention_eviction: ({ rowCap }) => {
    // THE CAP IS NAMED ONLY WHEN IT IS KNOWN. A fabricated figure on the one
    // mechanism in this plugin that deletes the operator's history would be
    // worse than the missing clause, and the sentence reads correctly without
    // it — the ACTION it asks for does not depend on the number.
    const cap = rowCap === null ? "row" : `${groupThousands(rowCap)}-row`;
    return `Suspended: your retention cap was deleting this scan's own results. Rows were evicted by the ${cap} cap while the scan was running, so the backfill was consuming itself. Raise the row cap in Settings, or narrow the filter, then resume.`;
  },
});

/**
 * The honesty note under the eviction suspension.
 *
 * THE SWEEP INTERVAL IS IMPORTED, never typed. The sweep runs once per
 * `RETENTION_SWEEP_EVERY_N` processed artifacts, so eviction is detected a
 * little after it starts — and saying so is what stops the operator concluding
 * the counters lied.
 */
export const SCAN_EVICTION_SWEEP_NOTE = `Eviction is detected on the retention sweep, which runs every ${String(
  RETENTION_SWEEP_EVERY_N,
)} analysed artifacts, so the scan ran a little past the first evicted row.`;

/**
 * Appended to EVERY suspension reason, and it is the sentence that makes a
 * suspension cheap.
 *
 * `null` when the scan resolved no page — absent, never the epoch. A resume
 * from nothing continues from now, which the operator can read off the absence
 * of this clause rather than from a fabricated date.
 */
export function resumePositionClause(
  lastCreatedAt: number | null,
): string | null {
  const when = positionText(lastCreatedAt);
  return when === null ? null : `Resuming continues from ${when}.`;
}

// ---------------------------------------------------------------------------
// COPY — THE LIFECYCLE CONTROLS (D-10)
// ---------------------------------------------------------------------------
//
// D-10's ASYMMETRY HAS TO BE VISIBLE, NOT MERELY TRUE. Cancel means PAUSE and
// keeps the resumable position; discard is a separate act that destroys it. If
// the two sat adjacent in one tone the operator would hesitate over the safe
// one and the asymmetry D-10 bought would be invisible. Pause and Resume are
// surface-toned; Discard is danger-toned, separated by the contract's `sm` gap,
// and behind its own confirmation.

/** THE WORD `Cancel` IS NEVER USED. D-10 makes this a pause and the label must
 *  not promise something else — a mis-clicked pause on a multi-hour backfill
 *  costs nothing, and a label reading "Cancel" would make the operator believe
 *  it costs everything. */
export const SCAN_PAUSE_CTA = "Pause scan";

/** Its own in-flight label, never a spinner beside the old one. */
export const SCAN_PAUSING_LABEL = "Pausing…";

/** THE ONLY WAY BACK. DefMiner never resumes a scan on its own after a restart,
 *  a project change or an eviction. */
export const SCAN_RESUME_CTA = "Resume scan";

export const SCAN_RESUMING_LABEL = "Resuming…";

/** The phase's one destructive control, and the fifth member of the reserved
 *  destructive list (05-UI-SPEC.md amendment A1). */
export const SCAN_DISCARD_CTA = "Discard scan";

export const SCAN_DISCARDING_LABEL = "Discarding…";

/** The confirmation's title. A QUESTION, so the buttons are answers. */
export const SCAN_DISCARD_HEADING = "Discard this scan?";

/** The escape, and the DEFAULT FOCUS. The non-action holds focus for the same
 *  reason the shipped raw-export dialog's escape does: the keyboard path out of
 *  a destructive dialog must not be the destructive button. */
export const SCAN_DISCARD_KEEP_LABEL = "Keep it suspended";

/**
 * What a discard destroys, and — the half that matters more — what it does not.
 *
 * THREE PROPERTIES CARRIED DELIBERATELY:
 *
 *  1. IT NAMES WHAT SURVIVES. "Discard a scan" reads to most operators as
 *     "delete what it found", and it does not: the artifacts and observations
 *     went through the same admission, digest and store path the live hook uses
 *     and are not touched. Only the walked position is lost.
 *  2. IT QUANTIFIES THE LOSS with the real position and the real count rather
 *     than warning vaguely. D-26 makes a suspended scan's row its cursor, and
 *     that cursor may represent hours of strictly serial backfill.
 *  3. THE COUNT AGREES WITH ITS NOUN through `counted`, never a parenthesised
 *     plural suffix.
 *
 * The position is ABSENT rather than fabricated for a scan that resolved no
 * page — there is genuinely nothing to lose in that case and the sentence says
 * so instead of naming the epoch.
 */
export function discardConfirmBody(
  lastCreatedAt: number | null,
  seen: number,
): string {
  const when = positionText(lastCreatedAt);
  const reached =
    when === null
      ? `It has not reached any traffic yet, over ${counted(seen, "request", "requests")}`
      : `It walked back to ${when} over ${counted(seen, "request", "requests")}`;
  return `Discarding deletes this scan's position in your traffic history. ${reached}; a new scan starts again from now and walks the whole way back. Everything it already analysed stays — artifacts and observations are not touched. Only the place it had reached is lost.`;
}

// ---------------------------------------------------------------------------
// THE COUNTERS
// ---------------------------------------------------------------------------

/** One counter's identity, its label and what it tells the operator.
 *
 * @internal
 */
export type ScanCounter = {
  /** The COUNTER field on {@link ScanStatusPayload} this cell renders. Typed
   *  as a numeric key of that shape, so a renamed field — or one that is not a
   *  number at all — is a typecheck failure here rather than an `undefined`
   *  rendered as a blank cell. */
  readonly id: ScanCounterField;
  readonly label: string;
  /** Rendered BELOW the strip, never inside it: the strip's height is fixed and
   *  a sentence in it would be the thing that wraps. */
  readonly help: string;
};

/**
 * The four counters that go IN THE STRIP, in the order they carry weight.
 *
 * FOUR AND NOT SEVEN, for a shipped reason: `health-contract.ts` fixes a strip
 * at `h-12` with `whitespace-pre overflow-hidden` cells and no `flex-wrap`,
 * because a strip whose height is decided by its content is a strip that grows
 * the first time a counter passes a million. Seven cells at `gap-8` would wrap
 * at plausible panel widths, and a wrapping strip reflows everything below it.
 *
 * The order is the movement order: `seen` moves every page and is the most
 * direct evidence that the walk is walking; `admitted` is progress toward what
 * the operator actually wants; `queued` and `analysed` are the two ends of the
 * pipe, and the gap between them IS the backlog, made visible without asking
 * anyone to do arithmetic.
 */
export const SCAN_STRIP_COUNTERS: readonly ScanCounter[] = Object.freeze([
  {
    id: "seen",
    label: "Requests seen",
    help: "Stored requests this scan has looked at. The fastest-moving number here, and the one that most directly means the walk is walking.",
  },
  {
    id: "admitted",
    label: "Admitted",
    help: "Responses that passed the same admission gate live browsing uses — 2xx, non-empty, under the size ceiling, script-shaped, and inside Caido's scope.",
  },
  {
    id: "queued",
    label: "Queued",
    help: "Admitted responses handed to the analysis queue. The gap between this and Analysed is the backlog.",
  },
  {
    id: "analysed",
    label: "Analysed",
    help: "Analyses finished at the far end of the queue. Absent rather than zero while DefMiner cannot attribute an analysis to this scan.",
  },
] as const);

/**
 * The three counters that go in the `<dl>` below the strip.
 *
 * They move more slowly or are read once, so they are worth their explanation
 * more than their position.
 */
export const SCAN_DETAIL_COUNTERS: readonly ScanCounter[] = Object.freeze([
  {
    id: "pagesWalked",
    label: "Pages walked",
    help: "Pages of stored traffic fetched from Caido. Each page carries full response bodies, which is why they are small.",
  },
  {
    id: "skippedDone",
    label: "Skipped (already analysed)",
    help: "Requests already carried to a finished analysis. DefMiner does not reload them. Anything that was partial or failed is re-offered, so a scan repairs earlier failures rather than cementing them.",
  },
  {
    id: "rejected",
    label: "Rejected",
    help: "Responses the admission gate turned away — most often because they are not JavaScript, or because the host is not in Caido's current scope.",
  },
] as const);

// ---------------------------------------------------------------------------
// LAYOUT
// ---------------------------------------------------------------------------

/**
 * The strip's fixed height, as the Tailwind utility that produces it.
 *
 * 48px — the same `2xl` token the page toolbar and the health strip use. FIXED
 * IS THE CONTRACT, not the number.
 *
 * A LITERAL, because Tailwind's JIT only emits a utility it can SEE spelled out
 * in the scanned source. Deliberately NOT imported from `health-contract.ts`: a
 * shared constant would make a change to one strip silently a change to the
 * other, and these are two surfaces with two owners.
 */
export const SCAN_STRIP_HEIGHT_CLASS = "h-12";

/** What every counter cell carries. `whitespace-pre` and `overflow-hidden` are
 *  the other half of the fixed height — without them a wide number wraps, and a
 *  strip that cannot wrap becomes a strip that did. */
export const SCAN_CELL_CLASS = "whitespace-pre overflow-hidden";

/** The read-only clause elements. `font-mono` because an HTTPQL clause is code
 *  and is compared character by character by the person reading it; `break-all`
 *  because a long clause must wrap inside its own element rather than widen the
 *  panel. */
export const SCAN_CLAUSE_CLASS =
  "font-mono text-xs break-all border border-surface-600 px-2 py-1";

// ---------------------------------------------------------------------------
// RENDERING
// ---------------------------------------------------------------------------

/**
 * The twelve month abbreviations, frozen.
 *
 * DEFMINER-AUTHORED AND NEVER `toLocaleString`, for the reason `groupThousands`
 * already gives twice in the shipped source: a locale-formatted string reads
 * differently under a different locale, and these strings are compared
 * literally by specs. A date that renders as "14 Aug 2026" in CI and something
 * else on the operator's machine is a date no assertion can pin.
 */
const MONTHS = Object.freeze([
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const);

function pad2(value: number): string {
  return value < 10 ? `0${String(value)}` : String(value);
}

/**
 * The position date, as the Scan tab renders it.
 *
 * TO THE MINUTE, and the precision is a decision: a scan covering a single day
 * would leave a date-only line frozen while the counters moved, which is
 * exactly the stalled appearance this whole surface is built to prevent. The
 * toolbar indicator is a bounded slot and renders date only; this is the detail
 * surface.
 *
 * LOCAL TIME, deliberately. The operator's mental model of "when was I
 * browsing" is their own clock, and the label says "traffic from" rather than
 * naming a timestamp field.
 *
 * `null` in, `null` out — ABSENT, never a placeholder date and never the epoch.
 * Before the first page resolves DefMiner does not know where the walk is, and
 * the status line carries "Starting…" instead.
 */
export function positionText(lastCreatedAt: number | null): string | null {
  const day = dateOnlyText(lastCreatedAt);
  if (day === null) return null;
  const d = new Date(lastCreatedAt as number);
  return `${day}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * The DATE-ONLY form of the same instant, from the same frozen table.
 *
 * TWO PRECISIONS, ONE FORMATTER. The toolbar indicator is a bounded slot inside
 * a 48px row that does not wrap and cannot truncate, so it renders the date
 * alone; this tab is the detail surface and renders to the minute, because a
 * scan covering a single day would leave a date-only line frozen while the
 * counters moved — which is the stalled appearance the whole readout is built
 * to prevent. A SECOND formatter for the second precision is how a toolbar and
 * a tab come to disagree about the same scan, so `positionText` above is built
 * on this rather than beside it.
 *
 * `@internal` for exactly one wave. Plan 06-13 builds the toolbar indicator and
 * the history list — "reached {D MMM YYYY}" — and is the cross-module consumer
 * that lets the tag come off. It is exported now rather than later so that plan
 * consumes this formatter instead of writing a second one, which is the whole
 * point of declaring it here.
 *
 * @internal
 */
export function dateOnlyText(at: number | null): string | null {
  if (at === null || !Number.isFinite(at)) return null;
  const d = new Date(at);
  const month = MONTHS[d.getMonth()] ?? "";
  return `${String(d.getDate())} ${month} ${String(d.getFullYear())}`;
}

/**
 * The exact string the backend will send, composed on this side so the operator
 * can read it BEFORE they press anything.
 *
 * SHOWING THE COMPOSITION IS THE WHOLE POINT (D-05, O-06). The promise is that
 * the operator may narrow the scan and can never widen it; a promise they
 * cannot check is a promise, and the composed string is a fact. The ORDER is
 * the mechanism rather than a presentation choice — DefMiner's narrowing comes
 * FIRST, so a trailing HTTPQL comment in an operator clause fails closed at
 * `execute()` instead of commenting the narrowing away.
 *
 * NO POSITION TERM, and its absence is correct rather than an omission: this
 * preview is shown only on the start form, where no scan has walked and the
 * backend's own composer emits no position clause either. Once a scan exists,
 * the readout renders `composedFilter` off the status payload — the backend's
 * actual output — rather than recomposing it here.
 *
 * AN EMPTY OPERATOR CLAUSE OMITS THE TERM ENTIRELY. `()` is not "no filter", it
 * is a filter Caido would refuse for a reason the operator did not cause; an
 * absent clause is a valid, complete input and the common one.
 *
 * IT DOES NOT RE-VALIDATE. A typed clause that the backend refuses starts
 * nothing at all and the surface says so in its own alert — so a preview that
 * silently dropped an invalid term would show a string that was never going to
 * be sent, which is the one thing this element must never do. A second copy of
 * the validator on this side would also be a second answer to a question with
 * one authority.
 */
export function composedPreview(
  defminerClause: string,
  operatorClause: string,
): string {
  const terms = [`(${defminerClause})`];
  if (operatorClause !== "") terms.push(`(${operatorClause})`);
  return terms.join(" AND ");
}

/**
 * One counter's rendered value.
 *
 * SEPARATORS ARE NOT DECORATION. `1000000` and `100000` differ by one character
 * and by a factor of ten, on a surface whose whole job is to be read at a
 * glance by somebody deciding whether anything is happening. `groupThousands`
 * and never `toLocaleString`, never a second grouping helper.
 *
 * AN ABSENT NUMBER RENDERS AS AN EM DASH, NOT AS ZERO. `analysed` is `null`
 * until DefMiner can attribute an analysis to this scan, and a zero there would
 * read as "nothing has been analysed" on a scan that is analysing.
 */
export function counterText(value: number | null): string {
  return value === null ? "—" : groupThousands(value);
}

/** A stable element id for one counter cell. An `id` and not a bound `data-*`
 *  attribute, for the reason `settings-contract.ts`'s `groupId` states: the
 *  static rendering-safety gate reports ANY bound `data-*` binding
 *  categorically. */
export function counterId(id: ScanCounterField): string {
  return "defminer-scan-" + id;
}

// ---------------------------------------------------------------------------
// THE COMPUTED STATUS WORD
// ---------------------------------------------------------------------------
//
// ===========================================================================
// FOUR PERSISTED STATES, SEVEN PRESENTATION WORDS, AND THE FOUR EXTRA ONES ARE
// NEVER WRITTEN TO THE DATABASE
// ===========================================================================
// `scans.state` holds four values. This surface renders seven words, because a
// single "Running" label would make three very different situations look
// identical and only one of them is bad news. The four extra words —
// `Starting…`, `Scanning`, `Waiting for the analysis queue`, `Not advancing` —
// are COMPUTED here from the payload and the clock, and nothing writes them
// anywhere. `SCAN_LIFECYCLE_PRESENTATION` in `scan-lifecycle-presentation.ts`
// is the map for the PERSISTED half and imports its labels from this file, so
// the toolbar badge and this line cannot spell one state two ways.
//
// The two vocabularies — this one and `analyses.scan_state` — are kept apart by
// the five mechanisms this file's header names, and the no-prefix guard in
// `scan-lifecycle-presentation.spec.ts` already walks all seven words below.
//
// ===========================================================================
// THIS FUNCTION IS PURE AND LIVES OUTSIDE THE COMPONENT ON PURPOSE
// ===========================================================================
// Its whole content is a PRECEDENCE ORDER, and a precedence order tested
// through a mounted component is a precedence order tested through seven
// mounts, seven payload fixtures and seven fake clocks — reporting a rendering
// failure and an ordering failure with the same message. The clock is a
// parameter rather than a call to `Date.now()` for the same reason.

/** One of the seven words this surface can put on the status line. A closed
 *  union over the constants above, so a word that is not one of them cannot be
 *  returned and a spelling drift is a typecheck failure. */
export type ScanStatusWord =
  | typeof SCAN_STATUS_STARTING
  | typeof SCAN_STATUS_SCANNING
  | typeof SCAN_STATUS_WAITING_FOR_QUEUE
  | typeof SCAN_STATUS_NOT_ADVANCING
  | typeof SCAN_STATUS_SUSPENDED
  | typeof SCAN_STATUS_FINISHED
  | typeof SCAN_STATUS_DISCARDED;

/** Everything the status word is a function of, and nothing else. */
export type ScanStatusInput = {
  readonly state: ScanLifecycleState;
  /**
   * IS THE PRODUCER WITHHOLDING PAGES AT D-01'S WATERMARK?
   *
   * READ FROM THE PAYLOAD AND NEVER INFERRED. From outside the backend a scan
   * holding at the watermark and a scan whose QuickJS thread is blocked are
   * INDISTINGUISHABLE — both show counters that stop advancing — so there is no
   * quantity this function could derive it from. Without the field the
   * backpressure word can never render and every legitimate hold falls through
   * to the stall marker.
   */
  readonly heldAtWatermark: boolean;
  /** How many pages have resolved. Zero means the first query is still in
   *  flight, which is not the same claim as "nothing is happening". */
  readonly pagesWalked: number;
  /**
   * When ANY counter last changed, or `null` when this reader has not yet seen
   * one change.
   *
   * ANY COUNTER, AND NEVER THE POSITION DATE. A scan covering a single day
   * would leave a date-only signal frozen while the counters moved, so a stall
   * marker derived from the date would fire on a perfectly healthy walk. `null`
   * is "not yet observed", which is not "has not moved for thirty seconds" —
   * conflating them puts the stall marker on screen one paint after mount.
   */
  readonly lastCounterChangeAt: number | null;
  /** The clock, passed in rather than read, so the precedence is testable
   *  without a fake timer. */
  readonly now: number;
};

/**
 * The status line's word.
 *
 * ===========================================================================
 * THE PRECEDENCE IS LOAD-BEARING, IN THIS ORDER, AND EACH STEP HAS A REASON
 * ===========================================================================
 *  1. NOT `running` — the persisted state answers for itself. `completed`
 *     renders **Finished**, never "Completed": the analysis vocabulary already
 *     ships "Complete" and a one-character difference between two states that
 *     mean opposite things is not a difference.
 *
 *  2. HELD AT THE WATERMARK — **before** the starting word and **before** the
 *     stall marker. Before the stall marker because that is the entire reason
 *     `heldAtWatermark` is a required field: the hold is a HEALTHY state and
 *     the MOST COMMON one on a long backfill, and an operator who learns to
 *     ignore a stall marker is worse off than one who never had it — the same
 *     argument PROJECT.md makes about false positives, applied to a status
 *     line. Before the starting word because a scan that meets a full queue
 *     immediately would otherwise read "Starting…" for as long as the hold
 *     lasts, which says nothing about the one thing that is actually happening.
 *
 *  3. NO PAGE RESOLVED — "Starting…". Nothing is wrong; the first query is in
 *     flight, and there is no position to render yet either.
 *
 *  4. NOTHING MOVED PAST `ARTIFACT_DEADLINE_MS` — the stall marker, and the
 *     only one of the four running words that is bad news. STRICTLY PAST, not
 *     at: the deadline is the shipped ceiling on walking any single artifact,
 *     so the boundary belongs to the healthy side.
 *
 *  5. OTHERWISE — "Scanning".
 */
export function scanStatusWord(input: ScanStatusInput): ScanStatusWord {
  if (input.state === "suspended") return SCAN_STATUS_SUSPENDED;
  if (input.state === "completed") return SCAN_STATUS_FINISHED;
  if (input.state === "discarded") return SCAN_STATUS_DISCARDED;

  if (input.heldAtWatermark) return SCAN_STATUS_WAITING_FOR_QUEUE;
  if (input.pagesWalked === 0) return SCAN_STATUS_STARTING;

  const { lastCounterChangeAt, now } = input;
  if (
    lastCounterChangeAt !== null &&
    now - lastCounterChangeAt > ARTIFACT_DEADLINE_MS
  ) {
    return SCAN_STATUS_NOT_ADVANCING;
  }
  return SCAN_STATUS_SCANNING;
}

/**
 * The counter tuple the stall marker watches, as one comparable string.
 *
 * EVERY COUNTER, INCLUDING THE ONE THAT IS `null`. The marker's rule is "ANY
 * counter moved", and a tuple that omitted a field would leave a scan whose
 * only moving number was the omitted one reading as stalled. Built as a string
 * rather than compared field by field so the caller holds ONE previous value
 * instead of seven, and so adding a counter to the strip is one edit here.
 */
export function counterFingerprint(payload: ScanStatusPayload): string {
  return [
    payload.pagesWalked,
    payload.seen,
    payload.admitted,
    payload.skippedDone,
    payload.rejected,
    payload.queued,
    payload.analysed,
  ].join("|");
}
