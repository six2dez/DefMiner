// packages/backend/src/ingest/consumer.ts — the single CPU consumer, and the
// ONLY place in this plugin that writes.
//
// ===========================================================================
// EVERY STORE CALL SITE LIVES HERE (decision P3-D4)
// ===========================================================================
// Four writes, all part of ONE iteration, in this order:
//
//   1. IDENTITY   upsertArtifact   — the content-addressed row.
//   2. THE EDGE   recordObservation — WHERE those bytes were seen. Never
//                                     conditional, never skipped on a cache hit.
//   3. THE SKIP   isAnalysed / claimAnalysis / walk / finishAnalysis (CORE-08).
//   4. THE SWEEP  sweepRetention, on a cadence (STORE-06).
//
// The reason they are all here rather than spread across the modules that would
// each "own" one: a producer and its only caller owned by different plans is a
// contract with nobody implementing it. Ownership of the caller and ownership of
// the wiring are the same thing.
//
// ===========================================================================
// EXACTLY ONE DRAIN LOOP
// ===========================================================================
// `Worker` is `undefined` in this runtime, so "concurrency" would mean
// interleaved async work on the one thread — multiplying peak memory and latency
// and buying nothing. The latch is MODULE-level, not per-call, because a second
// `startConsumer(...)` is the realistic way a second loop appears (a re-init, a
// hot reload) and a per-call flag would not see it.
//
// A second start therefore STOPS the running loop and rebinds to the new deps.
// It used to return the existing handle and discard the new ones — including the
// queue and the database — which is worse than either alternative: `init()`
// constructs a FRESH BoundedQueue and hands it to `configurePassive` BEFORE
// calling this, so on a re-init the hook filled queue #2 while the surviving
// consumer drained queue #1, which nothing filled. The plugin looked healthy
// while `admitted` climbed, `queueDepth` climbed to QUEUE_CAP, `queueOverflow`
// climbed, and `processed` never moved again.

import { randomUUID } from "crypto";

import type {
  InvalidationCategory,
  InvalidationSummary,
  ScanState,
} from "@defminer/engine/contract";
import {
  INVALIDATION_EVENT,
  TERMINAL_SCAN_STATES,
} from "@defminer/engine/contract";
import type { Deadline } from "@defminer/engine/deadline";
import { decodeUtf8 } from "@defminer/engine/decode";
import { sha256Hex } from "@defminer/engine/digest";
import {
  type AbortLike,
  artifactDeadline,
  walk,
} from "@defminer/engine/pipeline";
import type { BoundedQueue, Entry } from "@defminer/engine/queue";
import { findAnnouncement } from "@defminer/engine/sourcemap/announce";
import {
  decodeInlineMap,
  type MapParseReason,
  parseSourceMap,
} from "@defminer/engine/sourcemap/parse";
import {
  MAP_MAX_BYTES,
  PASSIVE_MAX_BYTES,
  RETENTION_SWEEP_EVERY_N,
  RETENTION_SWEEP_MAX_PASSES,
  SOURCE_ROWS_PER_MAP_MAX,
  SOURCEMAP_TAIL_WINDOW_BYTES,
} from "@defminer/engine/thresholds";
import { yieldToLoop } from "@defminer/engine/yield";
import type { Database } from "sqlite";

// `randomUUID` comes from the SAME `crypto` specifier the digest already pulls
// in, so the shipped bundle's import set is unchanged and
// `scripts/ci/check-bundle-imports.mjs` has nothing new to approve. It is a
// MEASURED export of Caido's `crypto` module (Phase 0's capability probe), which
// is why `index.ts` mints scan ids and export ids the same way.

import { contentTypeOf } from "../hooks/admit";
import type { EnqueueClock } from "../hooks/passive";
import { getActiveScan, suspendForRetentionEviction } from "../scan/scans";
import {
  admitDerived,
  admitDerivedDepth,
  DERIVED_MAX_DEPTH,
} from "../sourcemap/derive";
import {
  claimAnalysis,
  DETECTOR_CORPUS_VERSION,
  finishAnalysis,
  isAnalysed,
} from "../store/analyses";
import { upsertArtifact } from "../store/artifacts";
import { recordObservation } from "../store/observations";
import { sweepRetention } from "../store/retention";
import { getRetentionBounds } from "../store/settings";
import {
  countSourcesForMap,
  recordSighting,
  upsertRecoveredSource,
} from "../store/sources";
// THE counter object, and `recordSlice` — the two halves of CORE-10's wiring.
// Imported rather than injected: there is exactly one counter object in this
// plugin (plan 01-05), and a dependency-injected one would be a second.
import {
  counters,
  describeError,
  recordError,
  recordSlice,
} from "../telemetry";

/**
 * How long to wait before re-checking an EMPTY queue.
 *
 * The consumer polls rather than being kicked by the hook, deliberately: the hook's
 * only side effect besides counters is `queue.offer(...)`, and coupling it to the
 * consumer's scheduling would put a second one there. One self-rescheduling timer
 * exists for the plugin's lifetime, and a 50 ms idle latency is invisible next to
 * the reload and hash that follow it.
 */
const IDLE_POLL_MS = 50;

/**
 * The monotonic clock the WALK measures elapsed time against.
 *
 * `performance.now()` where it exists, `Date.now()` otherwise. The distinction
 * matters and is not defensive: `performance.now()` is monotonic and cannot jump
 * backwards when the host clock is adjusted, but it is boot-relative and
 * `performance.timeOrigin` is not a Unix epoch here — so NO timestamp is ever
 * computed from it. Every value this module PERSISTS (`observed_at`, `started_at`,
 * `finished_at`) comes from `Date.now()`; every elapsed figure comes from this.
 */
function defaultClock(): () => number {
  const p = (globalThis as { performance?: { now?: () => number } })
    .performance;
  if (p !== undefined && typeof p.now === "function") {
    const now = p.now.bind(p);
    return () => now();
  }
  return () => Date.now();
}

export type ConsumerDeps = {
  queue: BoundedQueue;
  db: Database;
  /** Resolved lazily and cached by the caller: `init()` can run before a project
   *  is selected, and with none selected the proxy fails anyway. Returns an empty
   *  string when there is still no project, in which case nothing is written. */
  getProjectId: () => Promise<string>;
  /** Enqueue instants written by the hook. The highest observed delta between an
   *  event arriving and its work being successfully reloaded is what answers
   *  RESEARCH.md Open Question 2. */
  enqueuedAt: EnqueueClock;
  /** Called with the running maximum event-to-reload delta in ms. */
  onReloadLatency?: (ms: number) => void;
  /** Monotonic clock for the walk, BY INJECTION — this is what lets a spec drive
   *  an artifact past ARTIFACT_DEADLINE_MS in microseconds instead of 30 seconds,
   *  which is the difference between the degraded path being tested and merely
   *  being written. */
  now?: () => number;
  /** Cancellation for in-flight walks. Structural, not `AbortSignal`: that global
   *  was never enumerated inside this runtime. */
  signal?: AbortLike;
  /** The Phase 3 detector seam for the DERIVED path (D-13, D-14).
   *
   *  BY INJECTION, and the reason is the same one `now` is injected for: it is
   *  what lets a spec OBSERVE that a recovered source's bytes actually reached a
   *  walk. A depth bound on a path with no detector behind it and no test in
   *  front of it is a branch nobody has executed. Defaults to the same no-op the
   *  artifact walk uses. */
  visitDerived?: (window: { start: number; end: number }) => void;
  /** The corpus version CORE-08 keys the cache on. Defaults to the Phase 1
   *  sentinel; Phase 3's real detector-set hash arrives through here. */
  detectorSetHash?: string;
  /**
   * How many project changes have been applied (CORE-09).
   *
   * An iteration captures this ONCE, next to the project id it resolves, and
   * re-checks it before every subsequent write. That is what closes the window
   * this loop otherwise has: `handleOne` resolves the project id and then awaits
   * four times, and a change landing at any of those suspension points would
   * otherwise let the remaining writes land under a project the operator has
   * already left (T-01-25).
   *
   * Optional, defaulting to a constant, so a spec that is not about the
   * lifecycle need not wire one. `lifecycle.spec.ts` drives the real thing.
   */
  projectEpoch?: () => number;
};

export type ConsumerHandle = {
  stop: () => void;
  /** Run one drain pass to completion. The scheduler calls this on its timer; a
   *  spec calls it directly so the loop is deterministic rather than raced. */
  drainNow: () => Promise<void>;
  /**
   * How many artifacts this consumer is part-way through RIGHT NOW.
   *
   * ZERO OR ONE, BY CONSTRUCTION, AND THAT IS THE INFORMATION RATHER THAN A
   * LIMITATION. QuickJS is single-threaded with no worker threads and CPU-bound
   * analysis is strictly serial, so there is never a second walk to count. What
   * the operator learns from a `1` is the thing research pitfall P-07 is about:
   * a `1` sitting beside a climbing queue depth and a large observed slice is a
   * BLOCKED BACKEND THREAD, which looks from the outside exactly like a frozen
   * renderer and is a completely different problem.
   *
   * A READER, NOT A COUNTER. Nothing is measured that was not already measured —
   * this reports the drain flag the loop already keeps.
   */
  jobsInFlight: () => number;
};

type Extracted = {
  requestId: string;
  sha256: string;
  byteLen: number;
  url: string;
  status: number;
  contentType: string | null;
  /** The RAW bytes, retained deliberately for the duration of this iteration
   *  because the walk has to read them. A `Uint8Array` is not an SDK object — the
   *  never-retain rule is about `Request`, `Response` and `Body` handles, whose
   *  liveness pins Caido-side state. These bytes are ours and go out of scope
   *  when the iteration ends. */
  bytes: Uint8Array;
};

/**
 * Everything that touches an SDK object happens HERE, synchronously, and only
 * plain values come out.
 *
 * That is the whole point: CORE-05 forbids holding a `Request`, `Response` or
 * `Body` reference across an `await`, and the cheapest way to guarantee it is to
 * make the extraction a synchronous function whose return type contains no SDK
 * type at all. `consumer.spec.ts` re-checks the property over this file's AST, so
 * the guarantee does not rest on the shape being preserved by convention.
 */
function extract(rr: {
  request: { getId(): string; getUrl(): string };
  response: {
    getCode(): number;
    getHeaders(): Record<string, unknown>;
    getBody(): { toRaw(): Uint8Array; readonly length: number } | undefined;
  };
}): Extracted | { empty: true } {
  const body = rr.response.getBody();
  if (!body) return { empty: true };
  // Bytes, never `toText()`: the 222-byte non-UTF-8 fixture becomes 242 bytes
  // across a toText() round trip with a different digest, and its anchor moves
  // 20 bytes. Offsets and hashes derive from raw bytes only (ENC-01).
  const raw = body.toRaw();
  if (!raw || raw.length === 0) return { empty: true };
  return {
    requestId: rr.request.getId(),
    sha256: sha256Hex(raw),
    byteLen: raw.length,
    url: rr.request.getUrl(),
    status: rr.response.getCode(),
    contentType: contentTypeOf(rr.response.getHeaders()),
    bytes: raw,
  };
}

/**
 * The prefix that makes a map refusal TELLABLE APART in `analyses.error`.
 *
 * D-11 writes reconstruction refusals into a column Phase 1 shipped, and Phase 7
 * is its first non-null writer from this path. Exactly ONE vocabulary reaches it
 * today — `MAP_PARSE_REASONS`, for a map-level refusal — because a DERIVED
 * refusal describes one recovered source and a recovered source has no
 * `analyses` row of its own to mark.
 *
 * THE PREFIX IS WHAT LETS THE SECOND ONE ARRIVE LATER WITHOUT A COLLISION.
 * `too_large` and `empty` are literal members of BOTH `MAP_PARSE_REASONS` and
 * `sourcemap/derive.ts`'s `DERIVED_REJECT_REASONS`. `contract.ts:88-120` keeps
 * two colliding vocabularies apart with four mechanisms, and the FIRST of them —
 * a distinct column name — is not available here: there is one `error` column.
 * Namespacing at the point of writing buys the same separation a different way,
 * and it costs nothing to do now rather than as a migration later.
 *
 * A CODE, NEVER A MESSAGE (T-07-10). Every character of the written value is
 * DefMiner's word: a fixed prefix and a member of a frozen array declared in
 * this repository. Nothing a driver, a parser or an exception said is
 * interpolated, so `describeError` — the right function for a DIAGNOSTIC — is
 * deliberately not on this path. Plan 07-08's viewer maps these codes to
 * operator copy.
 */
export const MAP_REFUSAL_CODE_PREFIX = "map:";

/** The `analyses.error` discriminator for one map-level refusal. */
export function mapRefusalCode(reason: MapParseReason): string {
  return MAP_REFUSAL_CODE_PREFIX + reason;
}

/** Lines in a recovered source, for `sources.line_count`.
 *
 *  Computed HERE, at recovery time, because D-07 discards the content: nothing
 *  downstream can re-derive it without a full bundle reload, which is why it is a
 *  column rather than read-time work. A file with no trailing newline still has a
 *  last line, so the count is separators + 1; the empty string is one empty line
 *  and `admitDerived` refuses it before this is reached anyway.
 *
 *  EXPORTED FOR THE DERIVATION PATH (plan 07-06), which recomputes the number
 *  from the content it is about to return rather than reading the column. Under
 *  D-07 the two are the same content by construction — the derivation only
 *  reaches this point once the reloaded body's digest matched — and computing it
 *  is what keeps the three numbers on the `content` arm descriptions OF THAT ARM
 *  rather than a row's claims about it. One implementation, because a second
 *  line counter that disagreed with this one would disagree silently. */
export function countLines(content: string): number {
  let lines = 1;
  for (let i = 0; i < content.length; i += 1) {
    if (content.charCodeAt(i) === 0x0a) lines += 1;
  }
  return lines;
}

/** Has this analysis reached a state that means "do not analyse again"?
 *
 *  Reads TERMINAL_SCAN_STATES rather than listing the states again: a state
 *  added to one list and not the other is exactly how a non-terminal row starts
 *  being reported as a completed one. `undefined` means the row vanished between
 *  the insert and the read — retention can legitimately do that — and is not
 *  terminal either. */
function isTerminal(state: ScanState | undefined): boolean {
  return state !== undefined && TERMINAL_SCAN_STATES.includes(state);
}

/** The one running consumer, if any. Module scope, so a second `startConsumer`
 *  rebinds rather than adding a second loop. */
let current: ConsumerHandle | undefined;

/** Test seam. Module state is process-global, so a spec that did not reset it
 *  would inherit the previous case's loop, queue and database. */
export function resetConsumerForTest(): void {
  current?.stop();
  current = undefined;
}

/** Test seam. `init()` starts the consumer and keeps the handle to itself, so a
 *  spec that drives the REAL entry point has no other way to make the loop run
 *  on demand — and waiting for the poll timer would make every such case a race.
 *  Resolves immediately when no consumer is running. */
export function drainConsumerForTest(): Promise<void> {
  return current?.drainNow() ?? Promise.resolve();
}

/** What the health endpoint reports as jobs in flight. Zero when no consumer is
 *  running, which is the truth rather than a gap: with no loop there is nothing
 *  part-way through anything. See {@link ConsumerHandle.jobsInFlight}. */
export function jobsInFlight(): number {
  return current?.jobsInFlight() ?? 0;
}

export function startConsumer(
  sdk: {
    console: { log(msg: string): void };
    requests: { get(id: string): Promise<unknown> };
    /** The event channel, narrowed to the ONE event this plugin emits and the
     *  ONE payload it may carry. Declared structurally, like every other SDK
     *  slice this package takes, so a spec can drive it without a real Caido —
     *  and typed to the contract's summary so an emit that grew a field is a
     *  typecheck failure rather than a leak nobody notices. */
    api: {
      send(
        event: typeof INVALIDATION_EVENT,
        summary: InvalidationSummary,
      ): void;
    };
  },
  deps: ConsumerDeps,
): ConsumerHandle {
  const log = (msg: string): void => {
    try {
      sdk.console.log("[defminer] " + msg.slice(0, 200));
    } catch {
      /* sdk.console.log can throw during teardown; nothing left to do */
    }
  };

  if (current !== undefined) {
    // STOP AND REBIND, never "return the old handle and drop the new deps".
    // The caller has already pointed the hook at the new queue by the time it
    // gets here (index.ts calls configurePassive before startConsumer), so
    // keeping the old binding leaves the producer and the consumer on two
    // different queues with no error anywhere. Still exactly one loop: the old
    // one is stopped before the new one exists.
    log("consumer already running; stopping it and rebinding to the new deps");
    current.stop();
  }

  const clock = deps.now ?? defaultClock();
  const detectorSetHash = deps.detectorSetHash ?? DETECTOR_CORPUS_VERSION;

  let stopped = false;
  let draining = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let maxReloadLatencyMs = 0;

  // ---------------------------------------------------------------------
  // UI-07's INVALIDATION SUMMARIES — ACCUMULATED PER DRAIN PASS, EMITTED ONCE
  // ---------------------------------------------------------------------
  //
  // WHY THE EMIT LIVES HERE AND NOT AT THE STORE. Decision P3-D4 already puts
  // every store call site in this file, for the reason that a producer and its
  // only caller owned by different plans is a contract with nobody implementing
  // it. The same argument applies to announcing a write: the only code that
  // knows a batch FINISHED is the loop that ran it.
  //
  // WHY PER PASS AND NOT PER ROW. A busy browsing session writes an artifact and
  // an observation per proxied response, and one event per row would hand the
  // frontend the exact storm the coalescer exists to absorb. One summary per
  // category per drain pass is the smallest honest unit: it says THAT the
  // category changed, how many rows, and the newest identifier.
  //
  // WHY THE BACKEND HOLDS NO TIMER. It emits and forgets. The reaction-rate cap
  // — trailing debounce, at most two reactions a second, never while a row is
  // selected — is the FRONTEND's, because a timer here would run on the single
  // thread that also serves every RPC, every hook and this loop, and would be
  // spending the operator's proxy latency on the operator's own screen refresh.
  //
  // WHAT MAY CROSS: four scalars (UI-07, T-05-35). No row, no body, no URL, no
  // target-controlled string. `newestId` is a digest or a Caido request id —
  // both DefMiner-side or Caido-side identifiers, neither of them bytes the
  // target chose. The frontend re-queries a page when it decides to, through the
  // same project-scoped, redacted read path everything else uses.
  const pendingInvalidations = new Map<
    InvalidationCategory,
    { projectId: string; changedCount: number; newestId: string }
  >();

  function noteChange(
    category: InvalidationCategory,
    projectId: string,
    newestId: string,
  ): void {
    const existing = pendingInvalidations.get(category);
    if (existing === undefined || existing.projectId !== projectId) {
      // A project change mid-pass discards what was accumulated under the
      // previous project rather than re-attributing it — the same rule the
      // queue drain follows (decision P5-D2). A summary that mixed two projects
      // would invalidate the wrong table for the wrong operator.
      pendingInvalidations.set(category, {
        projectId,
        changedCount: 1,
        newestId,
      });
      return;
    }
    existing.changedCount += 1;
    existing.newestId = newestId;
  }

  function flushInvalidations(): void {
    for (const [category, agg] of pendingInvalidations) {
      // BUILT AS A LITERAL WITH EXACTLY FOUR KEYS. Not a spread of an internal
      // object: a spread is how a fifth field arrives without anybody deciding
      // it should, and `index.spec.ts` asserts the emitted object's own
      // enumerable key set for precisely that reason.
      const summary: InvalidationSummary = {
        projectId: agg.projectId,
        category,
        changedCount: agg.changedCount,
        newestId: agg.newestId,
      };
      try {
        sdk.api.send(INVALIDATION_EVENT, summary);
      } catch (e) {
        // An event channel that is gone during teardown must never take the
        // drain loop down with it, and Caido would report nothing if it did.
        counters.consumerErrors++;
        recordError(e);
        log("invalidation emit failed: " + describeError(e));
      }
    }
    pendingInvalidations.clear();
  }

  // ===========================================================================
  // STORE-06's CADENCE STATE — AND IT COUNTS ROWS, NOT ARTIFACTS
  // ===========================================================================
  //
  // A CHANGE TO PHASE 1 MACHINERY, MADE DELIBERATELY AND SAID OUT LOUD (plan
  // 07-05, Pitfall 2, 2026-09-02). This counter advanced by ONE per row-inserting
  // iteration from Phase 1 until now, and `thresholds.spec.ts` asserted
  // convergence as `RETENTION_SWEEP_MAX_ROWS >= ROWS_INSERTED_PER_ARTIFACT_MAX *
  // RETENTION_SWEEP_EVERY_N` — 512 >= 3 * 128 — which was true and load-bearing
  // for as long as one artifact could only insert three rows.
  //
  // D-09 BREAKS THAT BY UP TO 521x. Under D-05 plus D-09 one artifact carrying
  // monaco's real 781-source map inserts `3 + 781 + 781 = 1,565` rows in a SINGLE
  // iteration against a declared `ROWS_INSERTED_PER_ARTIFACT_MAX` of 3. With the
  // counter advancing by one, 128 such artifacts would insert roughly 200,000
  // rows between sweeps against a `DEFAULT_RETENTION_MAX_ROWS` of 50,000: the
  // database grows monotonically while the sweep runs exactly as designed, which
  // is the exact failure the inequality exists to prevent.
  //
  // BOTH OBVIOUS REPAIRS FAIL BY CONSTRUCTION. Satisfying the OLD inequality by
  // raising `RETENTION_SWEEP_MAX_ROWS` needs `1,565 * 128 = 200,320`, which
  // violates the shipped 1024-row cost cap by 195x. Satisfying it by lowering
  // `RETENTION_SWEEP_EVERY_N` drives it below 1. The third option — a per-map row
  // cap — is what D-09 explicitly rejected.
  //
  // SO THE COUNTER IS MADE TO MATCH THE DOCUMENTATION RATHER THAN THE OTHER WAY
  // ROUND. The shipped comment at the increment site already said the interval's
  // right-hand side is "rows inserted per sweep interval"; it simply was not
  // true. Now it is, and the interval is a ROW count.
  //
  // AND THE INEQUALITY THAT WAS RESTATED ALONGSIDE IT WAS STILL NOT A
  // CONVERGENCE PROOF (07-REVIEW.md HI-04, 2026-09-02). It read
  // `RETENTION_SWEEP_MAX_ROWS >= RETENTION_SWEEP_EVERY_N` — 512 >= 128 — with
  // the claim, in three places, that it holds "INDEPENDENTLY of how many rows
  // any single artifact produces". It compares the delete cap against the
  // THRESHOLD at which a pass becomes due, not against rows inserted per
  // interval. The sweep runs BETWEEN iterations, so the rows inserted before a
  // pass fires are the rows inserted by the iteration that CROSSED the
  // threshold — 1,565 for monaco's map by this comment's own example, and up to
  // ROWS_INSERTED_PER_ITERATION_MAX in the worst case. 1,565 in against 512 out
  // is +1,053 rows per iteration, monotonically: verbatim the failure the
  // inequality exists to prevent.
  //
  // The counter change above is RETAINED — the interval genuinely should count
  // rows — and the convergence half is fixed at the SCHEDULER instead, by
  // repeating the bounded pass while work remains. See RETENTION_SWEEP_MAX_PASSES
  // for the inequality that is now load-bearing and the drain loop below for the
  // shape.
  //
  // Monotonic for the plugin's lifetime; never reset by a sweep, or the interval
  // would restart every time it fired.
  let processedForSweep = 0;
  let sweptSinceStart = false;
  let lastSweptAtProcessedCount = 0;

  /**
   * ONE bounded retention pass. Returns whether work REMAINS after it.
   *
   * A single pass is bounded (RETENTION_SWEEP_MAX_ROWS) precisely so it cannot
   * become the long synchronous stretch the sweep exists to prevent. THAT BOUND
   * IS UNCHANGED; what changed on 2026-09-02 is what the caller does with the
   * answer, and why (07-REVIEW.md HI-04).
   *
   * THIS DOCBLOCK USED TO CITE AN ASSERTION THAT NO LONGER EXISTS. It read
   * "deferral converges anyway, because RETENTION_SWEEP_MAX_ROWS >=
   * ROWS_INSERTED_PER_ARTIFACT_MAX * RETENTION_SWEEP_EVERY_N BY ASSERTION" —
   * and `thresholds.spec.ts` had deleted that assertion in the same phase. The
   * one function whose correctness turns on the inequality was citing the
   * superseded form of it.
   *
   * AND THE FORM THAT REPLACED IT WAS ALSO NOT A CONVERGENCE PROOF.
   * `RETENTION_SWEEP_MAX_ROWS >= RETENTION_SWEEP_EVERY_N` compares the delete cap
   * against the THRESHOLD at which a pass becomes due, not against rows inserted
   * per interval. One iteration carrying monaco's map inserts 1,565 rows against
   * 512 deleted: +1,053 per iteration, monotonically.
   *
   * SO THE CALLER REPEATS THE PASS WHILE IT IS MAKING PROGRESS, bounded by
   * RETENTION_SWEEP_MAX_PASSES and yielding between passes. The inequality that
   * is actually load-bearing is stated at {@link RETENTION_SWEEP_MAX_PASSES} and
   * asserted by `thresholds.spec.ts`. `moreWork` is re-COUNTED against the
   * database at the end of every pass rather than inferred from the pass's own
   * bookkeeping, so the loop's exit condition is a fact about the tables.
   *
   * WHAT IS RETURNED IS "REPEAT ME", NOT `moreWork` — AND THE DIFFERENCE IS A
   * SPIN GUARD. A pass that deleted NOTHING and still reports work remaining is
   * a pass that is not converging: the deletes are failing (a locked database, a
   * half-applied schema) or every candidate is one the bounds require keeping.
   * Repeating it inside the same cadence would multiply the failure's error
   * counters and log lines by the pass budget and delete nothing. Progress is
   * therefore part of the condition, which also makes the loop terminate on its
   * own merits rather than only on the ceiling.
   *
   * Retention is the ONLY bound on this database. Caido never garbage-collects
   * it, does not delete it when a project is deleted, and it survives a
   * force-reinstall — so a sweep that is available but never scheduled closes
   * nothing at all.
   */
  async function runRetentionPass(projectId: string): Promise<boolean> {
    try {
      const bounds = await getRetentionBounds(deps.db, projectId);
      const summary = await sweepRetention(
        deps.db,
        projectId,
        bounds,
        Date.now(),
      );
      counters.retentionSweeps++;
      counters.retentionDeleted += summary.deleted;

      // =====================================================================
      // D-08 — THE ONE BRANCH THAT COUPLES RETENTION TO THE SCAN STATE MACHINE
      // =====================================================================
      // A ROW-CAP eviction while a retroactive scan is running means the
      // backfill is CONSUMING ITSELF: every page it walks costs a page it
      // already walked, and it will never finish however long it runs. The scan
      // is stopped at its cursor and told why.
      //
      // NOT `summary.deleted`. An AGE-BOUND eviction is retention working
      // exactly as the operator configured it, and stopping a multi-hour
      // backfill over routine housekeeping would be DefMiner cancelling work
      // nobody asked it to cancel. `rowCapDeleted` exists precisely because the
      // single `deleted` count cannot tell the two apart —
      // `store/retention.ts` carries that argument in full.
      //
      // ONE BRANCH, AT ONE CALL SITE, AND THAT IS THE WHOLE COUPLING. D-08
      // names the coupling of two subsystems as its own cost; this is the one
      // place `sweepRetention` runs, so putting the branch anywhere else would
      // spread a cost that is currently bounded to these ten lines.
      // `consumer.spec.ts` asserts the call appears exactly once in this file.
      //
      // THE DETECTION IS LATE BY UP TO ONE CADENCE, AND THE COPY SAYS SO. The
      // sweep runs once per RETENTION_SWEEP_EVERY_N processed artifacts, so the
      // scan ran a little PAST the first evicted row rather than stopping at it
      // — which is what `06-UI-SPEC.md`'s suspension copy claims, deliberately,
      // instead of claiming a precision this cadence cannot deliver.
      if (summary.rowCapDeleted > 0) {
        const active = await getActiveScan(deps.db, projectId);
        // `running` ONLY. A suspended scan already carries the reason it
        // actually stopped for, and overwriting that would erase the only
        // record of why — the statement's own guard declines anyway, and
        // checking here keeps the audit write from being attempted at all.
        if (active !== undefined && active.state === "running") {
          await suspendForRetentionEviction(
            deps.db,
            projectId,
            active.scan_id,
            summary.rowCapDeleted,
            Date.now(),
            // Minted at the CALL SITE, so a retry re-presents the same id and
            // lands as a no-op on the do-nothing conflict clause.
            randomUUID(),
          );
        }
      }
      if (summary.errors > 0) {
        // Retention is the ONLY bound on this database's growth, and its failure
        // used to be the one thing on this path that reported nothing: sweeps
        // climbing, deleted stuck at 0, no counter, no lastError, and a log line
        // promising the next cadence boundary for ever.
        counters.storeErrors += summary.errors;
        const text =
          "RETENTION_DELETE_FAILED " +
          String(summary.errors) +
          " of " +
          String(summary.examined) +
          " examined: " +
          (summary.lastError ?? "unknown");
        recordError(text);
        log(text);
      }
      if (summary.moreWork) {
        // Picked up by the next pass WITHIN this cadence if the pass budget
        // allows, and at the next cadence boundary otherwise.
        log(
          "retention pass deleted " +
            String(summary.deleted) +
            " of " +
            String(summary.examined) +
            " examined; more remains",
        );
      }
      // `deleted > 0` IS THE SPIN GUARD, ARGUED IN THE DOCBLOCK. `moreWork`
      // alone would loop the pass budget over a sweep whose every delete is
      // rejecting — `workRemains` re-counts the tables and keeps answering
      // true, because nothing was removed.
      return summary.moreWork && summary.deleted > 0;
    } catch (e) {
      // A sweep must never take the loop down with it: the database growing is a
      // problem, and the plugin stopping is a bigger one.
      counters.consumerErrors++;
      recordError(e);
      log("retention sweep failed: " + describeError(e));
      // FALSE, NOT `summary.moreWork`. `sweepRetention` pins `moreWork` true on
      // its own internal throw, and a throw OUT of it means the pass reported
      // nothing at all — repeating it inside the same cadence would spin on a
      // failure that is not going to resolve between two yields. The next
      // cadence boundary retries, which is where a persistent failure belongs.
      return false;
    }
  }

  async function handleOne(entry: Entry): Promise<void> {
    const c = counters;

    // CORE-09. Captured BEFORE the reload, not after: this entry was admitted
    // under whatever project was active when the queue took it, and the reload
    // that follows is an `await`. If a project change lands during it, the entry
    // belongs to the PREVIOUS project — writing it under the new one would
    // import one client's traffic into another's view, which is precisely the
    // failure the isolation exists to prevent (T-01-25, decision P5-D2).
    const epochAtEntry = deps.projectEpoch?.() ?? 0;
    const stillCurrent = (): boolean =>
      (deps.projectEpoch?.() ?? 0) === epochAtEntry;

    // TWO undefined branches, not one, with a counter each. The SDK types them as
    // two different optionality points — `get` returns
    // `RequestResponseOpt | undefined`, and `RequestResponseOpt.response` is
    // itself optional — and conflating them hides WHICH one is happening, which is
    // the only thing that would tell an operator whether Caido lost the request
    // or never recorded a response for it.
    const rr = (await sdk.requests.get(entry.id)) as
      | { request: any; response?: any }
      | undefined;
    if (!rr) {
      c.reloadMissing++;
      return;
    }
    const response = rr.response;
    if (!response) {
      c.reloadNoResponse++;
      return;
    }
    c.reloadHit++;

    // `response` rather than `rr` so the narrowing SURVIVES the call: the reload
    // result types response as optional, and truthiness-narrowing a property does
    // not make the whole object assignable to a required-response parameter.
    const got = extract({ request: rr.request, response });
    // From here on NOTHING references rr, its request, its response or its body —
    // and `consumer.spec.ts` proves it over the AST rather than trusting this
    // comment.
    if ("empty" in got) {
      c.reloadEmptyBody++;
      return;
    }
    if (got.byteLen !== entry.bytes) c.byteLenMismatch++;

    // =======================================================================
    // THE AUTHORITATIVE SIZE CHECK, WHERE THE BYTE COUNT IS KNOWN GOOD (O-07)
    // =======================================================================
    // A NO-OP ON THE LIVE PATH AND THE REAL GATE ON THE RETRO PATH, and both
    // halves are the point. On the live path `hooks/admit.ts` already refused
    // anything over this ceiling against a count it measured itself, so this
    // check can only ever agree with it. On the RETROACTIVE path the size that
    // got the request into the queue came from a QUERY-SIDE count, which is a
    // FILTER — it decides what to reload — and this is the check, because the
    // bytes are in hand and their length is not an estimate.
    //
    // WHAT PLAN 06-02 DID AND DID NOT ESTABLISH. Its recorded O-07 verdict is
    // at `.planning/phases/06-retroactive-scan-deployment-reality/06-02-SUMMARY.md`;
    // cited by path rather than restated as a number, so this comment cannot
    // drift from it. What matters here is the SCOPE of that work and of the
    // three constants beside it: `SIZE_GATE_SOURCE`,
    // `BODY_STORED_DECOMPRESSED` and `BODY_LENGTH_EQUALS_RAW_LENGTH` all
    // describe the HOOK path. None of them is evidence about either read path,
    // and reading them as though they were is exactly the mistake this gate
    // makes unnecessary — with the check here, 06-02's verdict stops being
    // load-bearing on the retro path at all.
    //
    // `>` AND NOT `>=`: PASSIVE_MAX_BYTES is the largest body DefMiner
    // analyses, not the smallest it refuses. `hooks/admit.ts` admits at exactly
    // the ceiling and a stricter comparison here would silently drop every
    // artifact the live path already accepted.
    if (got.byteLen > PASSIVE_MAX_BYTES) {
      c.reloadOverSize++;
      // BEFORE the identity write, so an oversized body costs a counter and
      // nothing else: no artifact row, no observation, no analysis claim. The
      // bytes go out of scope with this iteration.
      log(
        "reloaded body over the size ceiling; dropping " +
          entry.id +
          " at " +
          String(got.byteLen) +
          " bytes",
      );
      return;
    }

    const queuedAt = deps.enqueuedAt.get(entry.id);
    if (queuedAt !== undefined) {
      const latency = Date.now() - queuedAt;
      if (latency > maxReloadLatencyMs) maxReloadLatencyMs = latency;
      deps.onReloadLatency?.(maxReloadLatencyMs);
    }

    if (!stillCurrent()) {
      c.abandonedOnProjectChange++;
      log("project changed during the reload; dropping " + entry.id);
      return;
    }

    const projectId = await deps.getProjectId();
    if (projectId === "") {
      // No project selected means no row may be written: `project_id` is part of
      // every primary key precisely so a project-scoping bug fails at write time
      // rather than leaking across projects (STORE-02).
      c.storeErrors++;
      log("no project selected; dropping " + got.sha256.slice(0, 12));
      return;
    }

    if (!stillCurrent()) {
      c.abandonedOnProjectChange++;
      log("project changed before the identity write; dropping " + entry.id);
      return;
    }

    const now = Date.now();

    // --- 1. IDENTITY --------------------------------------------------------
    // No `url` argument. The URL lives on the observation (decision P1-D6) —
    // artifacts are content-addressed and the same bytes served from two paths
    // are ONE artifact with two observations.
    const a = await upsertArtifact(
      deps.db,
      projectId,
      got.sha256,
      got.byteLen,
      entry.kind,
      now,
    );
    if (!a.ok) {
      c.storeErrors++;
      log("ARTIFACT_WRITE_FAILED " + a.error);
    } else {
      // Only a write that REPORTED SUCCESS is announced. A failed write left the
      // table exactly as it was, and telling the frontend to re-query would send
      // it looking for a row that is not there.
      noteChange("artifacts", projectId, got.sha256);
      // THE RETENTION INTERVAL COUNTS WRITES, NOT COMPLETIONS — AND IT COUNTS
      // THEM IN ROWS.
      //
      // THE POSITION IS UNCHANGED AND THAT IS DELIBERATE. This used to be the
      // last statement of the function, reached only on the full-success path —
      // but the two project-change returns below happen AFTER this artifact row
      // (and, for the second, after the observation row) has already landed.
      // Under sustained project churn the rows accumulated while the counter
      // stayed frozen, and because `sweptSinceStart` was already true by then NO
      // sweep was scheduled at all. Moving this broke convergence once already.
      //
      // WHAT CHANGED IS THE UNIT, not the site: `+= 1` per ITERATION became `+= 1`
      // per ROW, advanced beside each write as it lands. See the cadence state's
      // declaration for the arithmetic D-09 forces.
      //
      // AN UPSERT THAT UPDATED IS COUNTED AS A ROW, conservatively and on
      // purpose. `INSERT ... ON CONFLICT DO UPDATE` reports `changes: 1` either
      // way on this driver, so insert and update are not distinguishable here at
      // all — and the interval must never UNDER-count, because under-counting is
      // the failure that leaves the database unbounded. Over-counting only sweeps
      // more often, which the cost half is checked against separately.
      processedForSweep += 1;
    }

    // --- 2. THE EDGE --------------------------------------------------------
    // UNCONDITIONAL, and never skipped on a cache hit. An artifact written
    // without its observation records that bytes were seen but not WHERE, which
    // is the failure the pairing exists to prevent — the plugin would remember
    // the bundle and be unable to say which request served it. The two are two
    // statements because they MUST be (this driver has no transaction primitive
    // and no invariant may require two statements to land together), so each
    // reports its own outcome and a failure of either is counted rather than
    // silently orphaning the other.
    if (!stillCurrent()) {
      c.abandonedOnProjectChange++;
      log("project changed mid-iteration; not writing the observation");
      return;
    }

    const o = await recordObservation(
      deps.db,
      projectId,
      got.sha256,
      got.requestId,
      got.url,
      got.status,
      got.contentType,
      now,
    );
    if (!o.ok) {
      c.storeErrors++;
      log("OBSERVATION_WRITE_FAILED " + o.error);
    } else {
      noteChange("observations", projectId, got.requestId);
      processedForSweep += 1;
    }

    // --- 3. CORE-08's SKIP --------------------------------------------------
    // Consulted BEFORE claiming. Already analysed at this corpus version means
    // the artifact counters and the observation above still updated — the same
    // bytes appearing again is real information — but no second analysis starts
    // and the `analyses` row count does not move. The corpus version is IN the
    // primary key, so a stale-corpus hit is not expressible.
    if (!stillCurrent()) {
      c.abandonedOnProjectChange++;
      log("project changed mid-iteration; not starting an analysis");
      return;
    }

    const alreadyAnalysed = await isAnalysed(
      deps.db,
      projectId,
      got.sha256,
      detectorSetHash,
    );
    if (alreadyAnalysed) {
      c.analysisCacheHit++;
    } else {
      const claim = await claimAnalysis(
        deps.db,
        projectId,
        got.sha256,
        detectorSetHash,
        now,
      );
      if (!claim.ok) {
        c.storeErrors++;
        log("ANALYSIS_CLAIM_FAILED " + claim.error);
      } else if (claim.claimed) {
        c.analysisStarted++;
        // The `analyses` row this claim just inserted. `analyseAndFinish` adds
        // whatever the reconstruction stage writes on top of it.
        processedForSweep += 1;
        processedForSweep += await analyseAndFinish(
          projectId,
          got,
          detectorSetHash,
          stillCurrent,
        );
      } else if (isTerminal(claim.state)) {
        // The row reached a terminal state between the isAnalysed read above and
        // this claim. Genuinely a cache hit.
        c.analysisCacheHit++;
      } else {
        // A CLAIM NOBODY FINISHED, and NOT a cache hit. Anything between the
        // claim and finishAnalysis can strand the row at `pending`: a walk
        // cancelled by a project change, the epoch return in analyseAndFinish, a
        // rejected finishAnalysis, a killed runtime. `pending` is not terminal,
        // so isAnalysed keeps returning false and claimAnalysis keeps hitting DO
        // NOTHING — the artifact is never re-analysed at this corpus version
        // until the row ages out. Counting it as a cache hit made the stuck state
        // report as a success and corrupted the CORE-08 hit rate. Reconciling it
        // is ERR-02 in Phase 2; SEEING it is this counter.
        c.analysisStale++;
        log(
          "analysis row for " +
            got.sha256.slice(0, 12) +
            " is " +
            String(claim.state ?? "<gone>") +
            " and unfinished — not re-analysed at this corpus version (ERR-02)",
        );
      }
    }

    c.processed++;
  }

  /**
   * What one reconstruction stage did, for the three statements that consume it.
   *
   * `sliceMs` feeds `recordSlice` AND `finishAnalysis`; `reason` becomes
   * `analyses.error` and turns `scan_state` to `partial`; `rowsInserted` advances
   * STORE-06's interval (Pitfall 2).
   */
  type Reconstruction = {
    /** The stage's own longest UNINTERRUPTED synchronous stretch, in float ms. */
    sliceMs: number;
    /** A DefMiner-authored reason CODE, or null when nothing was refused. */
    reason: string | null;
    /** Rows this stage actually inserted. */
    rowsInserted: number;
  };

  /**
   * What one reconstruction stage is pointed at.
   *
   * A RECORD RATHER THAN `Extracted`, because the stage runs over TWO different
   * things and only one of them is an artifact: at depth 0 the bytes are the
   * admitted response body, and at depth 1 they are a source recovered out of
   * it. `artifactSha256` and `requestId` are the PROVENANCE either way — the
   * bundle the bytes ultimately came from and the request that served it — so a
   * sighting written at any depth still points at the artifact an operator can
   * find.
   */
  type ReconstructionInput = {
    readonly bytes: Uint8Array;
    /** The digest of the ADMITTED artifact, at every depth. */
    readonly artifactSha256: string;
    /** The Caido request id that served that artifact, at every depth. */
    readonly requestId: string;
    /** 0 for an admitted bundle; D-13 refuses at {@link DERIVED_MAX_DEPTH}. */
    readonly depth: number;
    /** The ARTIFACT's deadline, shared by every stage this iteration runs. */
    readonly deadline: Deadline;
  };

  /**
   * The detector seam for the DERIVED path.
   *
   * Optional and defaulting to the same no-op `analyseAndFinish` uses, for the
   * same reason: no detector exists until Phase 3. It is injectable so a spec can
   * OBSERVE that recovered bytes actually reach a walk — the difference between
   * D-13's bound being a path that runs and a path with no detector behind it
   * and no test in front of it.
   */
  const derivedVisit =
    deps.visitDerived ??
    ((): void => {
      /* Phase 3 puts the detector here too. */
    });

  /** Both refusal counters from ONE site, so the roll-up cannot drift from the
   *  per-reason map it rolls up. */
  function noteMapRefusal(reason: MapParseReason): void {
    counters.sourcemap.mapRefused[reason]++;
    if (reason === "too_large") counters.sourcemap.mapRefusedTooLarge++;
    else counters.sourcemap.mapMalformed++;
  }

  /**
   * D-08's stage — reconstruct the original sources an admitted bundle carries.
   *
   * =====================================================================
   * WHY THIS IS NOT INSIDE `visit`, WHICH IS WHERE D-08 LITERALLY SAID
   * =====================================================================
   * READ THIS BEFORE MOVING IT. D-08 places reconstruction "where `visit` is a
   * no-op today", and RESEARCH found the structural fact that makes a literal
   * reading impossible: `visit` is `(window: Window) => void` — SYNCHRONOUS,
   * returning void, called once per window in ascending offset order — so it
   * CANNOT `await` the store, and every write below is awaited. It is also the
   * wrong SHAPE: a sourcemap is not a per-window object. The announcement is at
   * the TAIL, the base64 decode needs the WHOLE payload, and `JSON.parse` needs
   * the WHOLE map, so a stage running per window would either re-run the whole
   * reconstruction 64 KiB at a time or accumulate the body a second time beside
   * the walk that is already reading it.
   *
   * D-08's INTENT IS PRESERVED IN FULL and only the insertion point differs: one
   * artifact at a time, the same slice budget, the same `setTimeout(0)` yield
   * primitive, the same epoch discipline, the same `partial` / `failed` states
   * and the same retention cadence. The stage runs inside `analyseAndFinish`,
   * AFTER `await walk(...)` returns and BEFORE `finishAnalysis(...)` — after,
   * because the walk owns the deadline and the artifact's first slice; before,
   * because `finishAnalysis` is the statement that persists what this stage
   * decided.
   *
   * ALWAYS ON, NO TOGGLE, NO SECOND LIFECYCLE. It inherits the queue, the
   * deadline, the size ceiling, the project epoch and the retention sweep from
   * the pipeline that already exists, which is the whole of D-08's argument.
   *
   * NO OUTBOUND REQUEST IS EVER ISSUED. An external announcement increments a
   * counter and returns (D-01/D-03); `outbound-prohibition.spec.ts` already walks
   * this file and would fail if that changed.
   */
  async function reconstruct(
    projectId: string,
    input: ReconstructionInput,
    stillCurrent: () => boolean,
  ): Promise<Reconstruction> {
    const sm = counters.sourcemap;
    let sliceMs = 0;
    let rowsInserted = 0;
    /** Fold one synchronous stretch into this stage's maximum. */
    const mark = (from: number): void => {
      const elapsed = clock() - from;
      if (elapsed > sliceMs) sliceMs = elapsed;
    };
    const done = (reason: string | null): Reconstruction => ({
      sliceMs,
      reason,
      rowsInserted,
    });

    // --- D-13's DEPTH BOUND, BEFORE ANYTHING ELSE ---------------------------
    // AND BEFORE `findAnnouncement` IN PARTICULAR. The refusal is not "we found
    // a map and declined to follow it"; it is "this stage may not run at this
    // depth", so it costs a comparison rather than a scan over a body a
    // recovered source chose. T-07-31: an attacker-controlled body that recovers
    // to another attacker-controlled body is unbounded work on the one thread,
    // and the bound is one level with no re-entry.
    //
    // COUNTER-LOG-RETURN, in the shape the authoritative size gate uses at the
    // top of `handleOne`: increment, log, return, write no row. The refusal is
    // NOT propagated as a `reason` — a depth-1 stage runs over a recovered
    // SOURCE, which has no `analyses` row of its own, and marking the outer
    // artifact `partial` for it would report the bound working as a degradation.
    //
    // THIS ARM IS NOW THE BACKSTOP AND NOT THE HOT PATH (07-REVIEW.md MD-03).
    // The recursion call site below asks the same question ONCE per stage,
    // before the per-source loop, and only recurses when the answer admits — so
    // the ordinary path no longer arrives here at all. THE GATE STAYS ANYWAY,
    // and deleting it because "nothing reaches it" is exactly the mistake MD-04
    // records one file over: a bound whose enforcement lives only at one call
    // site is a bound somebody removes by adding a second call site. Any future
    // caller that reaches `reconstruct` at or past `DERIVED_MAX_DEPTH` is
    // refused here, counted here, and logged here.
    const depthGate = admitDerivedDepth(input.depth);
    if (!depthGate.ok) {
      sm.derivedRejected[depthGate.reason]++;
      log(
        "reconstruction refused at depth " +
          String(input.depth) +
          ": " +
          depthGate.reason +
          " (D-13)",
      );
      return done(null);
    }

    // --- the whole-payload stretch: decode, scan, decode, parse -------------
    // ONE uninterrupted synchronous run, and it is measured as one because that
    // is what it is on the thread. The D-10 probe put the three inline-path
    // operations at 8.87 ms/MB combined, which is what `MAP_MAX_BYTES` was
    // derived against.
    let sliceStart = clock();

    // `crossCheck: false`, and the asymmetry with the display path is DELIBERATE.
    // The cross-check is a second FULL decode of a multi-megabyte
    // target-controlled body, on the proxy thread, inside the 25 ms slice this
    // stage shares with the walk — and it THROWS on divergence, which would turn
    // a malformed body into a caught consumer error instead of a named refusal.
    // Nothing derived from this string is persisted as an offset or a digest:
    // ENC-01's rule is untouched because the map's own digest below is taken over
    // the DECODED JSON's bytes and the artifact digest came from `toRaw()`.
    const text = decodeUtf8(input.bytes, { crossCheck: false });
    const announcement = findAnnouncement(text, SOURCEMAP_TAIL_WINDOW_BYTES);
    if (announcement === null) {
      // THE COMMON CASE, and it costs one backwards scan. The artifact finishes
      // exactly as it did before this stage existed: no counter, no row, no
      // error. "No announcement" and "an announcement we refused" are different
      // outcomes and MAP-06 requires them to stay distinguishable.
      mark(sliceStart);
      return done(null);
    }

    const inline = decodeInlineMap(announcement.url, MAP_MAX_BYTES);
    if (inline.kind === "external") {
      // D-03, and the SourceMap: response header folds in here rather than
      // becoming a third code path — that header always names an external URL,
      // so under D-01 it is the same fact reached by another route. No table, no
      // row, no target-controlled URL at rest.
      sm.announcedExternal++;
      mark(sliceStart);
      log(
        "external sourcemap announced by " +
          input.artifactSha256.slice(0, 12) +
          "; not fetched (D-01)",
      );
      return done(null);
    }
    if (inline.kind === "refused") {
      noteMapRefusal(inline.reason);
      mark(sliceStart);
      log("sourcemap refused: " + mapRefusalCode(inline.reason));
      return done(mapRefusalCode(inline.reason));
    }

    sm.announcedInline++;
    const parsed = parseSourceMap(inline.json, {
      maxSourceRows: SOURCE_ROWS_PER_MAP_MAX,
    });
    if (!parsed.ok) {
      noteMapRefusal(parsed.reason);
      mark(sliceStart);
      log("sourcemap refused: " + mapRefusalCode(parsed.reason));
      return done(mapRefusalCode(parsed.reason));
    }
    // The map's identity, over the DECODED JSON's bytes — the same content
    // addressing `artifacts` uses, so the same map delivered inside two different
    // bundles is one `map_sha256` with two sets of sightings.
    const mapSha256 = sha256Hex(Buffer.from(inline.json, "utf8"));
    mark(sliceStart);

    // --- MAP-06's AGGREGATE HALF, ENFORCED (07-REVIEW.md MD-04) -------------
    // ONE INDEXED COUNT PER MAP-BEARING ARTIFACT, above the per-source loop and
    // never inside it. `countSourcesForMap`'s docblock asserted a caller in
    // "plan 07-05's ingest path" since Phase 7 shipped and there was none, so
    // the aggregate half of MAP-06 — the bound across repeated ingests of one
    // map — was enforced nowhere. A docblock that describes a caller which does
    // not exist is worse than no docblock, because it is the thing a verifier
    // cites.
    //
    // MAP-01/T-07-09: the epoch is re-checked IMMEDIATELY BEFORE the read, in
    // the idiom the five shipped `stillCurrent()` sites use. A count taken under
    // one project and acted on under another is exactly the class of thing those
    // five sites exist to prevent.
    if (!stillCurrent()) {
      counters.abandonedOnProjectChange++;
      log("project changed mid-reconstruction; not counting this map's rows");
      return done(null);
    }
    const existingSightings = await countSourcesForMap(
      deps.db,
      projectId,
      input.artifactSha256,
      mapSha256,
    );

    // THE PROJECTED POST-WRITE TOTAL, AND IT IS A MAXIMUM RATHER THAN A SUM.
    // READ THIS BEFORE "SIMPLIFYING" IT TO `existing + recovered`.
    //
    // Since migration v9 `recordSighting` upserts on `(project_id,
    // artifact_sha256, map_sha256, source_index)`, so re-ingesting the same
    // artifact writes ZERO new rows — it updates in place. And `map_sha256` is
    // content-addressed over the DECODED map JSON, so the stored index set for
    // this `(artifact, map)` is drawn from the same `sources` array this parse
    // is reading: the stored set is a SUBSET of the set about to be written.
    // The new-row count is therefore exactly `max(0, recovered - existing)` and
    // the projected total exactly `max(existing, recovered)`.
    //
    // WHAT THE ADDITIVE FORM DOES, so a reviewer recognises it. The bound is
    // 2,048 rows, so `existing + recovered` refuses any `(artifact, map)`
    // already holding more than 1,024 sightings — well inside what the parse
    // gate admits — on its very next pass, writing `scan_state = 'partial'` on
    // an artifact that was previously accepted whole and that adds not one row.
    // Re-analysis is reachable at EVERY `detectorSetHash` change (see
    // `isAnalysed`'s short-circuit), which Phase 3 landing is, so that is the
    // ordinary path rather than a corner. The real monaco 781-source case is
    // squarely in the band.
    const projectedSightings = Math.max(
      existingSightings,
      parsed.recovered.length,
    );
    // TWO ROWS PER RECOVERED SOURCE, the same relationship `parse.ts`'s
    // `ROWS_PER_RECOVERED_SOURCE` names and plan 07-14's gate uses: one
    // `sources` row per new content hash and one `source_sightings` row per
    // `(map, index)`. It is a WORST CASE in the `sources` half — a source whose
    // content hash is already stored writes no `sources` row — and it is stated
    // as such rather than left to read as exact. The literal lives here because
    // that constant is module-private to the engine's parser and this plan does
    // not widen the engine's surface.
    const projectedRows = 2 * projectedSightings;
    if (projectedRows > SOURCE_ROWS_PER_MAP_MAX) {
      // THE SHIPPED REASON, THROUGH THE SHIPPED PATH. `MAP_PARSE_REASONS` is a
      // closed vocabulary with an every-reason-has-a-case gate, and
      // `too_many_sources` already means exactly this. D-11 puts the namespaced
      // code in `analyses.error` and turns `scan_state` to `partial`, so the
      // operator gets a refusal they can read rather than a map that stopped.
      noteMapRefusal("too_many_sources");
      log(
        "sourcemap refused: " +
          mapRefusalCode("too_many_sources") +
          " (" +
          String(projectedRows) +
          " projected rows against a bound of " +
          String(SOURCE_ROWS_PER_MAP_MAX) +
          "; " +
          String(existingSightings) +
          " already recorded)",
      );
      return done(mapRefusalCode("too_many_sources"));
    }

    // --- the per-source stretches -------------------------------------------
    // A MAP THAT PARSED AND CARRIED NO `sourcesContent` IS A SUCCESS. It writes
    // no rows, records no error and finishes `done` — ECMA-426 makes the field
    // optional, and telling the operator "nothing there" is not the same as
    // telling them something failed (Pitfall 3, UI-09).
    const now = Date.now();

    // --- D-13's DEPTH QUESTION, ASKED ONCE PER STAGE -----------------------
    // THE DECISION BELONGS WHERE IT IS MADE, and it is made here: the loop
    // below recurses at `input.depth + 1`, and whether that is permitted is a
    // property of THIS STAGE'S DEPTH which cannot change between sources.
    // Before plan 07-15 the question was re-asked inside the callee's preamble
    // for every recovered source, so one artifact carrying monaco's real
    // 781-source map emitted 781 identical `sdk.console.log` lines on the proxy
    // thread in a single consumer iteration and drove
    // `derivedRejected.depth_exceeded` to exactly `sourcesRecovered`. A counter
    // equal by construction to another counter carries no information about the
    // run, and a health surface reading "781 sources rejected: depth_exceeded"
    // describes a bound working as designed as if it were a refusal
    // (07-REVIEW.md MD-03).
    //
    // COUNTED AND LOGGED ONLY WHEN THERE IS SOMETHING TO RECURSE OVER. A map
    // that parsed and recovered nothing declined nothing, and `consumer.spec.ts`
    // pins that: the counter describes the BOUND FIRING, not the stage running.
    // The count in the message is `parsed.recovered.length` — the sources that
    // reach the loop — which OVER-STATES by the sources `admitDerived` refuses
    // below before they could recurse. Said plainly rather than left for a
    // reader to discover: the refusal is one per stage either way, and the
    // number beside it is the stage's recovered-source count, not a count of
    // recursions that were individually declined.
    const nextDepth = admitDerivedDepth(input.depth + 1);
    if (!nextDepth.ok && parsed.recovered.length > 0) {
      sm.derivedRejected[nextDepth.reason]++;
      log(
        "reconstruction of the " +
          String(parsed.recovered.length) +
          " source(s) recovered from " +
          input.artifactSha256.slice(0, 12) +
          " not attempted at depth " +
          String(input.depth + 1) +
          ": " +
          nextDepth.reason +
          " (D-13)",
      );
    }

    for (const source of parsed.recovered) {
      sliceStart = clock();
      const bytes = Buffer.from(source.content, "utf8");
      // D-14's SECOND ENTRY POINT, and it deliberately BYPASSES `admit()`. The
      // whole argument is in `sourcemap/derive.ts`'s header: admission answers
      // status, body presence, size, kind and scope, and a recovered `.ts` has no
      // status, no scope of its own and a kind that is whatever the developer
      // wrote. The derived path carries a SIZE BOUND ONLY.
      //
      // COUNTER-LOG-RETURN per source, in the authoritative size gate's shape:
      // increment, log, write no row, and move to the next index. A refused
      // source is not a refused MAP, so `analyses.error` is untouched and the
      // sources beside it still land.
      const admitted = admitDerived({
        content: source.content,
        byteLen: bytes.length,
      });
      if (!admitted.ok) {
        sm.derivedRejected[admitted.reason]++;
        mark(sliceStart);
        log(
          "recovered source at index " +
            String(source.sourcesIndex) +
            " refused: " +
            admitted.reason,
        );
        continue;
      }
      const sourceSha256 = sha256Hex(bytes);
      const lineCount = countLines(source.content);
      mark(sliceStart);

      // MAP-01/T-07-09: IMMEDIATELY before the write, in the idiom the five
      // shipped re-check sites use. A project change mid-stage abandons the
      // remaining writes and leaves no partial source set attributed to the new
      // project.
      if (!stillCurrent()) {
        counters.abandonedOnProjectChange++;
        log("project changed mid-reconstruction; not writing the source row");
        return done(null);
      }
      const up = await upsertRecoveredSource(
        deps.db,
        projectId,
        sourceSha256,
        bytes.length,
        lineCount,
        now,
      );
      if (!up.ok) {
        counters.storeErrors++;
        log("SOURCE_WRITE_FAILED " + up.error);
      } else {
        sm.sourcesRecovered++;
        rowsInserted += 1;
        noteChange("sources", projectId, sourceSha256);
      }

      if (!stillCurrent()) {
        counters.abandonedOnProjectChange++;
        log("project changed mid-reconstruction; not writing the sighting");
        return done(null);
      }
      const sighting = await recordSighting(
        deps.db,
        projectId,
        mapSha256,
        source.sourcesIndex,
        input.artifactSha256,
        input.requestId,
        sourceSha256,
        source.sourcesVerbatim,
        now,
      );
      if (!sighting.ok) {
        counters.storeErrors++;
        log("SIGHTING_WRITE_FAILED " + sighting.error);
      } else if (sighting.changes === 0) {
        // ===================================================================
        // A STORE ANOMALY — RECORDED, NEVER SWALLOWED (W-3, HI-03)
        // ===================================================================
        // Since migration v9 the key is `(project_id, artifact_sha256,
        // map_sha256, source_index)`, so a conflicting upsert always has an
        // update arm that runs: the statement either inserts a row or updates
        // one. `changes: 0` is therefore neither, and there is no traffic
        // pattern that reaches it on purpose.
        //
        // WHAT THIS BRANCH USED TO BE. Under the pre-v9 key this was plan
        // 07-05's attribution discard: the `(map, index)` was already
        // attributed to a DIFFERENT bundle and the upsert's interim guard
        // refused to move it, so the SECOND bundle's evidence was lost and
        // counted in `sightingsDiscardedOtherArtifact`. That counter is gone
        // with the guard — the loss cannot happen now, and a number that can
        // never again be non-zero carries no information.
        //
        // `ok: true, changes: 0` IS STILL NOT A SUCCESSFUL WRITE and must not
        // be counted as one. Both rules survive verbatim and for their original
        // reasons: `rowsInserted` feeds STORE-06's retention interval, so
        // counting a row that never landed would advance the cadence for work
        // that did not happen, and `sightingsRecorded` would report rows that
        // do not exist. It goes to `storeErrors` instead, because that is the
        // counter for "the store did something this code cannot explain".
        counters.storeErrors++;
        log(
          "SIGHTING_NO_CHANGE the upsert neither inserted nor updated on " +
            "(project_id, artifact_sha256, map_sha256, source_index)",
        );
      } else {
        sm.sightingsRecorded++;
        rowsInserted += 1;
        noteChange("source_sightings", projectId, mapSha256);
      }

      // --- D-13: THE RECOVERED SOURCE ENTERS THE PIPELINE, ONCE -------------
      // WIRED NOW RATHER THAN LEFT FOR PHASE 3, and that is the whole point of
      // the bound: a depth limit written after the recursive path already exists
      // is a limit somebody has to remember to add. The recursion limit is the
      // valuable half of MAP-06 and it is fully testable today.
      //
      // The recovered bytes go through the SAME `walk` the artifact did — same
      // deadline, same window geometry, same yield primitive — so a detector
      // arriving in Phase 3 sees them through the surface it already reads from.
      // Then reconstruction is attempted at `depth + 1` — IF the stage-level
      // gate above admitted it. THAT is what makes the bound a path that runs
      // rather than a branch nobody executes: at depth 0 the gate refuses, once,
      // and the walk above still happens for every recovered source.
      //
      // THE DEADLINE IS THE ARTIFACT'S, NOT A FRESH ONE. Derived analysis is
      // work this artifact caused, so it spends this artifact's budget; a new
      // deadline per recovered source would let a 781-source map buy itself 781
      // times `ARTIFACT_DEADLINE_MS`.
      const walked = await walk(bytes, {
        now: clock,
        deadline: input.deadline,
        signal: deps.signal,
        visit: derivedVisit,
      });
      if (walked.maxSliceMs > sliceMs) sliceMs = walked.maxSliceMs;

      if (nextDepth.ok) {
        const derived = await reconstruct(
          projectId,
          {
            bytes,
            artifactSha256: input.artifactSha256,
            requestId: input.requestId,
            depth: input.depth + 1,
            deadline: input.deadline,
          },
          stillCurrent,
        );
        rowsInserted += derived.rowsInserted;
        // The DERIVED stage's own stretch still counts against this artifact's
        // maximum: it ran on the same thread, inside the same iteration, and a
        // number that omitted it would under-report exactly the work D-13
        // bounds.
        if (derived.sliceMs > sliceMs) sliceMs = derived.sliceMs;
      }
    }

    return done(null);
  }

  /**
   * The Phase 1 "work", and it is not a placeholder.
   *
   * `walk` is the sole source of three persisted facts, so they are passed
   * STRAIGHT THROUGH rather than recomputed or defaulted. A consumer that skipped
   * the walk and wrote constants would leave `max_slice_ms` and `bytes_walked`
   * permanently meaningless with every other test in this repo still green — and
   * `scan_state` would never once say `partial`, so CORE-07's degraded state
   * would exist only in the schema.
   *
   * `visit` is a no-op because no detector exists until Phase 3. The walk's
   * yielding, its deadline and its offset accounting are all real regardless, and
   * proving them now is the point: there is nothing to hide behind yet.
   */
  async function analyseAndFinish(
    projectId: string,
    got: Extracted,
    detectorHash: string,
    stillCurrent: () => boolean,
  ): Promise<number> {
    const deadline = artifactDeadline(clock);
    const result = await walk(got.bytes, {
      now: clock,
      deadline,
      signal: deps.signal,
      visit: () => {
        /* Phase 3 puts the detector here. */
      },
    });
    if (result.partial) counters.analysisPartial++;
    if (!stillCurrent()) {
      counters.abandonedOnProjectChange++;
      log("project changed during the walk; not finishing the analysis row");
      return 0;
    }

    // --- D-08's STAGE, AND THIS IS WHERE IT GOES ----------------------------
    // AFTER `await walk(...)` returned, BEFORE `finishAnalysis(...)`. The long
    // argument for why this is not the `visit` seam is on {@link reconstruct}
    // itself; the short version is that `visit` is synchronous and every write
    // below it is awaited. `consumer.spec.ts` asserts these three offsets against
    // this file's own text so the placement cannot drift back.
    const recon = await reconstruct(
      projectId,
      {
        bytes: got.bytes,
        artifactSha256: got.sha256,
        requestId: got.requestId,
        // DEPTH 0 — an admitted artifact, reached directly rather than through a
        // reconstruction. `DERIVED_MAX_DEPTH` is what turns that into a bound.
        depth: 0,
        deadline,
      },
      stillCurrent,
    );

    // --- CORE-10's WIRE -----------------------------------------------------
    // The in-memory maximum `getStatus()` reports and the per-artifact
    // `analyses.max_slice_ms` column take the SAME number from the SAME pair of
    // stages, one statement apart, so the two cannot drift into disagreeing.
    // PAIRED with the write rather than merely near it: an iteration that does
    // not persist the column must not raise the in-memory maximum either, or
    // `getStatus().maxSliceMs` starts describing work no `analyses` row records.
    // Delete this line and `consumer.spec.ts` fails — that negative
    // demonstration was RUN, not described.
    //
    // THE MAXIMUM IS NOW OVER TWO STAGES, and taking it is not bookkeeping.
    // Reconstruction runs AFTER the walk returns, so its synchronous stretch is
    // not in `result.maxSliceMs` at all: reporting the walk's number alone would
    // say 25 ms while the thread sat blocked for 300 ms inside a `JSON.parse`,
    // and CORE-10's entire claim is that this number is the TRUE maximum.
    const maxSliceMs = Math.max(result.maxSliceMs, recon.sliceMs);
    recordSlice(maxSliceMs);
    const finished = await finishAnalysis(
      deps.db,
      projectId,
      got.sha256,
      detectorHash,
      // D-11. `partial` had exactly ONE producer before this line — deadline
      // expiry — and reconstruction gives it more. The `error` column is the
      // discriminator: null for a deadline expiry, a namespaced reason CODE for
      // a refused map. Both are `partial`, and an operator can tell them apart.
      result.partial || recon.reason !== null ? "partial" : "done",
      Date.now(),
      maxSliceMs,
      result.bytesWalked,
      recon.reason,
    );
    if (!finished.ok) {
      counters.storeErrors++;
      log("ANALYSIS_FINISH_FAILED " + finished.error);
    }
    // The rows the reconstruction stage inserted, returned rather than reached
    // for: STORE-06's interval is `handleOne`'s to advance, and a stage that
    // mutated the counter directly would put the cadence in two places.
    return recon.rowsInserted;
  }

  async function drain(): Promise<void> {
    // THE IN-FLIGHT LATCH. Two callers racing here — the poll timer and a direct
    // `drainNow()`, or two `startConsumer` calls — must produce ONE loop, or every
    // entry is reloaded and hashed twice.
    if (draining) return;
    draining = true;
    try {
      for (;;) {
        if (stopped) return;
        const entry = deps.queue.take();
        if (entry === undefined) return;
        try {
          await handleOne(entry);
        } catch (e) {
          // One poisoned response must never stop everything after it, and Caido
          // would report nothing if it did: HANDLER_ERROR_SURFACED is "neither",
          // so this counter and this log line are the entire error surface.
          counters.consumerErrors++;
          recordError(e);
          log("consumer iteration failed: " + describeError(e));
        } finally {
          deps.enqueuedAt.delete(entry.id);
        }

        // --- 4. STORE-06's SCHEDULE ---------------------------------------
        // BETWEEN iterations, never inside one. One pass on the first iteration
        // after start, so a plugin that ingests slowly still trims rather than
        // growing forever between bursts; then one pass per
        // RETENTION_SWEEP_EVERY_N processed artifacts, so retention pressure
        // scales with the ingest that creates it.
        // A CROSSING TEST, NOT A LANDING TEST, and this is the second half of
        // Pitfall 2's fix rather than a tidy-up. It was
        // `processedForSweep % RETENTION_SWEEP_EVERY_N === 0`, which is exactly
        // right for a counter that advances by ONE — every boundary is landed on.
        // A counter that advances by ROWS STEPS OVER boundaries: an iteration
        // inserting 203 rows goes 203, 406, 609 and lands on no multiple of 128
        // ever, so a modulo test would schedule the cadence pass NEVER and the
        // rows-counting fix would silently make convergence worse than the bug it
        // repairs. The delta form fires on the first iteration at or past the
        // interval, whatever the step size.
        const due =
          !sweptSinceStart ||
          processedForSweep - lastSweptAtProcessedCount >=
            RETENTION_SWEEP_EVERY_N;
        if (due) {
          const projectId = await deps.getProjectId();
          if (projectId !== "") {
            sweptSinceStart = true;
            lastSweptAtProcessedCount = processedForSweep;
            // ===============================================================
            // BOUNDED PER SLICE, NOT PER CADENCE (07-REVIEW.md HI-04)
            // ===============================================================
            // Convergence needs `rows deleted per interval >= rows inserted per
            // interval`, and ONE pass cannot deliver it: the delete side is
            // held at RETENTION_SWEEP_MAX_ROWS by the 1024-row cost cap while
            // one iteration carrying monaco's map inserts 1,565 rows. Exactly
            // one pass per crossing is +1,053 rows per iteration, for ever.
            //
            // So the pass REPEATS while the database says work remains, up to
            // RETENTION_SWEEP_MAX_PASSES, and the inequality it satisfies is
            // stated and asserted at that constant.
            //
            // THE COST ARGUMENT SURVIVES INTACT, and the yield is what makes
            // that true: each pass is still bounded at RETENTION_SWEEP_MAX_ROWS
            // and the event loop runs between them, so this is up to sixteen
            // bounded stretches rather than one long uninterruptible one.
            //
            // AN ORDINARY CADENCE STILL RUNS EXACTLY ONE PASS. `moreWork` is
            // false whenever the tables are inside their bounds, so the repeat
            // is reachable only when there is a real backlog — which is the
            // only case in which convergence was ever in question.
            //
            // `stopped` IS CHECKED EVERY TIME AROUND. A shutdown arriving mid-
            // drain must not be held for fifteen more passes. And the pass
            // itself declines to be repeated unless it DELETED something, so a
            // failing sweep costs one pass per cadence and not sixteen.
            for (
              let pass = 0;
              pass < RETENTION_SWEEP_MAX_PASSES && !stopped;
              pass += 1
            ) {
              if (!(await runRetentionPass(projectId))) break;
              await yieldToLoop();
            }
          }
        }

        await yieldToLoop();
      }
    } finally {
      draining = false;
      // IN THE `finally`, not after the loop. Every exit from the drain is a
      // `return` — the queue emptied, or `stopped` went true mid-pass — so a
      // flush placed after the loop would never run at all, and the rows written
      // in that pass would sit in the table with nothing announcing them until
      // the NEXT pass happened to emit. A stop is exactly when that next pass
      // does not come.
      flushInvalidations();
    }
  }

  function schedule(): void {
    if (stopped) return;
    timer = setTimeout(() => {
      drain()
        .catch((e) => {
          counters.consumerErrors++;
          recordError(e);
          log("drain failed: " + describeError(e));
        })
        .then(schedule, schedule);
    }, IDLE_POLL_MS);
  }

  const handle: ConsumerHandle = {
    // The drain flag, read rather than a second thing to keep in step with it.
    jobsInFlight: () => (draining ? 1 : 0),
    stop: () => {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
      if (current === handle) current = undefined;
    },
    drainNow: () => drain(),
  };
  current = handle;

  schedule();

  return handle;
}
