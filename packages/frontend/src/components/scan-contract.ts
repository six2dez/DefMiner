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

import type { ScanStatusPayload } from "@defminer/engine/contract";

import type { StartScanOutcome } from "../api/client";

import { groupThousands } from "./table-contract";

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
    // TWO SENTENCES, AND THE SECOND ONE IS THE ACTION. "One scan per project"
    // is an invariant the operator did not choose, so it is stated as a state
    // of the surface with a way out rather than as a disabled control whose
    // only content is "no".
    "already-running":
      "A scan is already running or suspended on this project. DefMiner runs one scan at a time — pause, resume or discard it before starting another.",
    "operator-clause-unsupported":
      "This build cannot check an additional filter yet, so it will not run one. Nothing was started. Start the scan without a filter, or wait for the build that validates one.",
    "write-failed":
      "The scan could not be recorded, so nothing was started. DefMiner has not read any traffic and nothing was changed.",
  });

// ---------------------------------------------------------------------------
// COPY — THE PROGRESS READOUT
// ---------------------------------------------------------------------------

/** `running`, before any page has resolved. Nothing is wrong; the first query
 *  is in flight. */
export const SCAN_STATUS_STARTING = "Starting…";

/** `running`, with a page behind it. */
export const SCAN_STATUS_SCANNING = "Scanning";

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
  if (lastCreatedAt === null || !Number.isFinite(lastCreatedAt)) return null;
  const d = new Date(lastCreatedAt);
  const month = MONTHS[d.getMonth()] ?? "";
  return `${String(d.getDate())} ${month} ${String(d.getFullYear())}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
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
