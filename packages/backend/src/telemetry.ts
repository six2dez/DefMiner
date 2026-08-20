// packages/backend/src/telemetry.ts — the in-memory counter surface, the max
// synchronous slice, and the projection `getStatus` returns. Nothing else.
//
// ===========================================================================
// THE NAMING RULE, AND IT IS LOAD-BEARING (decision P5-D1)
// ===========================================================================
// Every counter and every RPC field below is named for PROXIED RESPONSES
// OBSERVED. Not "responses on this target", not "total", not "all", not
// "complete". No identifier in this file — or any file that reads it — may
// contain a word asserting completeness, and {@link FORBIDDEN_COMPLETENESS_WORDS}
// is the list `telemetry.spec.ts` enforces that with.
//
// This is not style. DefMiner's coverage is STRUCTURALLY partial, measured twice
// in Phase 0:
//
//   SURFACES_FIRING_INTERCEPT = "proxy"  — Replay, Automate, workflows,
//     plugin-originated sends and `caido:http` fetch all reach the origin and
//     deliver NOTHING to the hook. Seven surfaces were driven; one fired.
//   CACHED_RESPONSES_REACH_HOOK = false — a browser-cache hit never enters
//     Caido at all, which is why RETROACTIVE_SCAN_MANDATORY is true and Phase 6
//     has to exist.
//
// So a counter named for what the plugin has SEEN is honest, and a counter named
// for what is ON THE TARGET is a lie the operator has no way to detect. The
// naming decision is made here, in the file somebody would edit, because it gets
// expensive the moment a UI, an export and Phase 2's vocabulary all reference it.
//
// ===========================================================================
// CLOCK DISCIPLINE — TWO CLOCKS, NEVER MIXED
// ===========================================================================
// Elapsed figures come from the MONOTONIC clock (`performance.now()` where it
// exists). Correlation timestamps come from the WALL clock (`Date.now()`). A
// timestamp is NEVER computed from the monotonic clock's origin, because
// `performance.timeOrigin` is not a Unix epoch on this build.
//
// ===========================================================================
// WHAT THIS FILE DELIBERATELY DOES NOT DO
// ===========================================================================
// No health surface, no degradation vocabulary, no diagnostics export. Those are
// OBS-01, OBS-02 and OBS-03 and they belong to Phase 2. Phase 1's obligation is
// narrow and cheap: the counters must EXIST and be REACHABLE, so Phase 2 does
// not have to retrofit them through code that has already been reviewed. The
// seam is left open, not filled.

import { REJECT_REASONS, type RejectReason } from "./hooks/admit";

/**
 * Words that may never appear in a counter name, an RPC field name or a string
 * this module projects.
 *
 * Compared WORD BY WORD after splitting camelCase and snake_case, not as raw
 * substrings: a substring rule fails on the first innocent identifier that
 * happens to contain "all", and a rule that cries wolf gets deleted.
 */
export const FORBIDDEN_COMPLETENESS_WORDS = [
  "all",
  "any",
  "complete",
  "completeness",
  "comprehensive",
  "entire",
  "every",
  "everything",
  "exhaustive",
  "full",
  "total",
  "whole",
] as const;

/** Longest error text this module will ever carry. Truncation is not cosmetic:
 *  an untruncated `String(e)` can carry a response body fragment across the RPC
 *  boundary, which is the one thing the projection exists to prevent. */
export const ERROR_TEXT_LIMIT = 240;

/**
 * The reject counters, DERIVED from a list rather than hand-declared.
 *
 * A pure function over the list so `telemetry.spec.ts` can execute the
 * derivation against a SYNTHETIC reason set and watch a new reason acquire a
 * counter — which is the thing being claimed. A hand-maintained parallel object
 * would drift silently, and a counter keyed on a typo'd reason is invisible: it
 * just reads zero forever.
 */
export function zeroedRejectCounters(
  reasons: readonly string[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of reasons) out[r] = 0;
  return out;
}

export type Counters = {
  /** Proxied responses this hook was handed. */
  proxiedResponsesObserved: number;
  /** Admitted to the queue. */
  admitted: number;
  /** Rejected, by reason. Keyed on `admit.ts`'s closed union, so a counter for a
   *  reason that does not exist is a compile error rather than a silent zero. */
  rejected: Record<RejectReason, number>;
  /** Entries the queue dropped because it was at cap (CORE-03 visible overflow). */
  queueOverflow: number;
  /** Proxied responses observed while NO project was active, so nothing could be
   *  admitted. Not a reject reason: `admit.ts`'s union is closed and describes
   *  the RESPONSE, whereas this describes the plugin's own state (CORE-09). */
  noProjectSelected: number;
  /** Iterations abandoned part-way because a project change landed while the
   *  consumer was mid-`await` (CORE-09, T-01-25). */
  abandonedOnProjectChange: number;
  /** Throws caught inside the hook. Caido surfaces none of them itself. */
  hookErrors: number;
  /** Entries the consumer drained to completion. */
  processed: number;
  /** `sdk.requests.get(id)` returned a usable request+response. */
  reloadHit: number;
  /** `sdk.requests.get(id)` itself resolved `undefined`. */
  reloadMissing: number;
  /** `sdk.requests.get(id)` resolved a pair whose `response` was `undefined`.
   *  A SEPARATE counter from {@link reloadMissing} on purpose: the SDK types
   *  those as two different optionality points and conflating them hides which
   *  one is happening. */
  reloadNoResponse: number;
  /** Reloaded but the body was absent or zero-length. */
  reloadEmptyBody: number;
  /** Artifacts skipped because this digest was already analysed at the current
   *  DETECTOR_CORPUS_VERSION (CORE-08). */
  analysisCacheHit: number;
  /** Analyses this consumer claimed and walked. */
  analysisStarted: number;
  /** Walks that hit ARTIFACT_DEADLINE_MS and persisted a `partial` state. */
  analysisPartial: number;
  /** Retention sweep passes actually run from the consumer loop (STORE-06). */
  retentionSweeps: number;
  /** Rows those passes deleted. */
  retentionDeleted: number;
  /** Store writes that reported a failure. */
  storeErrors: number;
  /** Throws caught inside a consumer iteration. */
  consumerErrors: number;
  /** `body.length` from the hook disagreed with `toRaw().length` in the consumer.
   *  BODY_LENGTH_EQUALS_RAW_LENGTH measured them equal across 24 round trips, so
   *  a non-zero value here means that measurement no longer holds. */
  byteLenMismatch: number;
};

function createCounters(): Counters {
  return {
    proxiedResponsesObserved: 0,
    admitted: 0,
    rejected: zeroedRejectCounters(REJECT_REASONS),
    queueOverflow: 0,
    noProjectSelected: 0,
    abandonedOnProjectChange: 0,
    hookErrors: 0,
    processed: 0,
    reloadHit: 0,
    reloadMissing: 0,
    reloadNoResponse: 0,
    reloadEmptyBody: 0,
    analysisCacheHit: 0,
    analysisStarted: 0,
    analysisPartial: 0,
    retentionSweeps: 0,
    retentionDeleted: 0,
    storeErrors: 0,
    consumerErrors: 0,
    byteLenMismatch: 0,
  };
}

/**
 * THE counter object. There is exactly one, and `telemetry.spec.ts` proves it
 * over the AST of every file in this package.
 *
 * Plans 01-01 and 01-03 kept a local object inside the consumer because this
 * file did not exist yet; plan 01-05 REPLACED it rather than shadowing it.
 * Leaving both would end the phase with one object that is written and never
 * read and another that is read and never written, with {@link slimStatus}
 * projecting the empty one — green everywhere, and zero on the RPC.
 */
export const counters: Counters = createCounters();

/** The running maximum synchronous slice, in float milliseconds (CORE-10). */
let maxSliceMs = 0;

/** The most recent error any part of the pipeline reported, class name first and
 *  truncated. Overwritten, not accumulated: durable failure recording is ERR-04
 *  in Phase 2, and a growing in-memory list here would be a worse version of it. */
let lastError: string | null = null;

/** Test seam. Module state is process-global, so a spec that did not reset it
 *  would inherit the previous case's counts. Mutates IN PLACE, because every
 *  importer holds a reference to this exact object. */
export function resetTelemetryForTest(): void {
  Object.assign(counters, createCounters());
  maxSliceMs = 0;
  lastError = null;
}

/**
 * Fold one measured span into the running maximum (CORE-10).
 *
 * Initialised to 0 and only ever RAISED — a later, shorter slice never lowers
 * it, because the question the number answers is "what is the worst this plugin
 * has done to the one thread", not "what did it do most recently".
 *
 * Stores the float EXACTLY as computed: no rounding, no truncation, no unit
 * conversion. `ms` is a delta between two reads of the monotonic clock; a value
 * that is not a number is ignored rather than poisoning the maximum with NaN
 * (`NaN > x` is false, so the comparison already does this — it is stated here
 * so nobody "fixes" it into a Math.max).
 */
export function recordSlice(ms: number): void {
  if (ms > maxSliceMs) maxSliceMs = ms;
}

/** What a redacted URL reads as in an error string. */
export const URL_REDACTION = "<url-redacted>";

/**
 * Strip anything URL-shaped out of a string bound for the RPC.
 *
 * NOT paranoia, and not hypothetical: `telemetry.spec.ts` found this by
 * throwing an `Error("failed loading https://victim.example/private/app.js?token=secret")`
 * at the projection and watching the whole thing come out the other side. Store
 * and reload failures interpolate the thing they were working on, and the thing
 * this pipeline works on IS a target URL — often with a session token in the
 * query. `slimStatus()` is the only channel by which internal state leaves the
 * plugin in Phase 1 (T-01-26), so the redaction belongs here rather than at each
 * of the call sites that might one day build a message.
 *
 * One quantifier before a literal `://` and one after, no nesting and no
 * alternation — `admit.ts`'s ReDoS discipline is about the HOOK, but a pattern
 * that can backtrack has no business anywhere in a runtime whose REDOS_RECOVERY
 * is "kill".
 */
function redactUrls(text: string): string {
  return text.replace(/[a-z][a-z0-9+.-]*:\/\/\S*/gi, URL_REDACTION);
}

/**
 * Render an error with its CLASS NAME in front, and no target data behind it.
 *
 * `String(e)` alone loses the constructor name, and the class name is usually
 * the whole diagnosis — a `TypeError` and a `RangeError` from the same line mean
 * completely different things. Copied deliberately from
 * `tier1/parse/src/index.ts:101`, which is where that lesson was learned.
 *
 * Redact FIRST, truncate SECOND: truncating first would leave the front half of
 * a URL in the output, which is the half carrying the host.
 */
export function describeError(e: unknown): string {
  const name =
    e !== null && e !== undefined && typeof e === "object"
      ? (e.constructor?.name ?? "")
      : "";
  const body = String(e);
  const text = name === "" || body.startsWith(name) ? body : name + ": " + body;
  return redactUrls(text).slice(0, ERROR_TEXT_LIMIT);
}

/** Record the most recent error. Never throws — it is the error path. */
export function recordError(e: unknown): void {
  try {
    lastError = describeError(e);
  } catch {
    lastError = "unrenderable error";
  }
}

/** The monotonic clock, mirroring `ingest/consumer.ts`. Boot-relative, so no
 *  timestamp is ever computed from it. */
function monotonic(): number {
  const p = (globalThis as { performance?: { now?: () => number } })
    .performance;
  return p !== undefined && typeof p.now === "function" ? p.now() : Date.now();
}

/** One measured span. Carries BOTH clocks at both ends — see the header. */
export type Mark<T> = {
  label: string;
  elapsedMs: number;
  startedAt: number;
  finishedAt: number;
  ok: boolean;
  err: string | null;
  out: T | null;
};

/**
 * Run `fn` and measure it, never letting it throw past.
 *
 * The swallow is the point rather than a convenience: HANDLER_ERROR_SURFACED is
 * "neither" — Phase 0 searched 22,876 host-log lines plus stdout and stderr for
 * an error thrown from a handler and found ZERO traces — so an escaping throw is
 * not "loud", it is INVISIBLE. Capturing it with its class name is the only
 * record that will exist.
 */
export function measured<T>(label: string, fn: () => T): Mark<T> {
  const startedAt = Date.now();
  const t0 = monotonic();
  let ok = true;
  let err: string | null = null;
  let out: T | null = null;
  try {
    out = fn();
  } catch (e) {
    ok = false;
    err = describeError(e);
    lastError = err;
  }
  const elapsedMs = monotonic() - t0;
  return {
    label,
    elapsedMs,
    startedAt,
    finishedAt: Date.now(),
    ok,
    err,
    out,
  };
}

/** What {@link slimStatus} returns. Numbers and one truncated string. */
export type SlimStatus = {
  counters: Counters;
  /** The largest uninterrupted synchronous stretch observed, float ms. */
  maxSliceMs: number;
  lastError: string | null;
};

/**
 * The projection `getStatus` returns.
 *
 * STRIPS EVERYTHING THAT IS NOT A COUNT. No URL, no header value, no body
 * content of any kind, and the one string it does carry is truncated. This is
 * the ONLY channel by which internal state leaves the plugin in Phase 1
 * (T-01-26), and `telemetry.spec.ts` walks the returned object recursively
 * rather than trusting a reading of this function.
 *
 * Spread rather than hand-listed, deliberately: a hand-listed projection silently
 * stops carrying a counter somebody adds later, and a counter nobody can see is
 * the same as no counter.
 */
export function slimStatus(): SlimStatus {
  return {
    counters: { ...counters, rejected: { ...counters.rejected } },
    maxSliceMs,
    lastError,
  };
}
