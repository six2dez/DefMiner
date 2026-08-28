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

import type {
  InvalidationCategory,
  InvalidationSummary,
  ScanState,
} from "@defminer/engine/contract";
import {
  INVALIDATION_EVENT,
  TERMINAL_SCAN_STATES,
} from "@defminer/engine/contract";
import { sha256Hex } from "@defminer/engine/digest";
import {
  type AbortLike,
  artifactDeadline,
  walk,
} from "@defminer/engine/pipeline";
import type { BoundedQueue, Entry } from "@defminer/engine/queue";
import { RETENTION_SWEEP_EVERY_N } from "@defminer/engine/thresholds";
import { yieldToLoop } from "@defminer/engine/yield";
import type { Database } from "sqlite";

import { contentTypeOf } from "../hooks/admit";
import type { EnqueueClock } from "../hooks/passive";
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

  // STORE-06's cadence state. Monotonic for the plugin's lifetime; never reset by
  // a sweep, or the interval would restart every time it fired.
  let processedForSweep = 0;
  let sweptSinceStart = false;
  let lastSweptAtProcessedCount = -1;

  /**
   * ONE bounded retention pass. Never a loop to convergence.
   *
   * A single pass is bounded (RETENTION_SWEEP_MAX_ROWS) precisely so it cannot
   * become the long synchronous stretch the sweep exists to prevent — looping
   * until `moreWork` is false would rebuild exactly that. Deferral converges
   * anyway, because RETENTION_SWEEP_MAX_ROWS >= ROWS_INSERTED_PER_ARTIFACT_MAX *
   * RETENTION_SWEEP_EVERY_N by assertion: the delete rate is above the worst-case
   * insert rate, so a backlog DRAINS under sustained ingest rather than merely
   * failing to grow faster.
   *
   * Retention is the ONLY bound on this database. Caido never garbage-collects
   * it, does not delete it when a project is deleted, and it survives a
   * force-reinstall — so a sweep that is available but never scheduled closes
   * nothing at all.
   */
  async function runRetentionPass(projectId: string): Promise<void> {
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
        // Picked up at the NEXT cadence boundary, deliberately.
        log(
          "retention pass deleted " +
            String(summary.deleted) +
            " of " +
            String(summary.examined) +
            " examined; more remains for the next cadence boundary",
        );
      }
    } catch (e) {
      // A sweep must never take the loop down with it: the database growing is a
      // problem, and the plugin stopping is a bigger one.
      counters.consumerErrors++;
      recordError(e);
      log("retention sweep failed: " + describeError(e));
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
    }
    // THE RETENTION INTERVAL COUNTS WRITES, NOT COMPLETIONS.
    //
    // It used to be the last statement of this function, reached only on the
    // full-success path — but the two project-change returns below happen AFTER
    // this artifact row (and, for the second, after the observation row) has
    // already landed. Under sustained project churn the rows accumulated while
    // the counter stayed frozen at whatever it was, and because `sweptSinceStart`
    // is already true by then, NO sweep was scheduled at all. That breaks the
    // convergence inequality thresholds.spec.ts asserts, whose right-hand side is
    // "rows inserted per sweep interval" and holds only if every row-inserting
    // iteration advances the interval.
    processedForSweep += 1;

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
        await analyseAndFinish(projectId, got, detectorSetHash, stillCurrent);
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
  ): Promise<void> {
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
      return;
    }
    // --- CORE-10's WIRE -----------------------------------------------------
    // The in-memory maximum `getStatus()` reports and the per-artifact
    // `analyses.max_slice_ms` column take the SAME number from the SAME walk
    // result, one statement apart, so the two cannot drift into disagreeing.
    // PAIRED with the write rather than merely near it: an iteration that does
    // not persist the column must not raise the in-memory maximum either, or
    // `getStatus().maxSliceMs` starts describing work no `analyses` row records.
    // Delete this line and `consumer.spec.ts` fails — that negative
    // demonstration was RUN, not described.
    recordSlice(result.maxSliceMs);
    const finished = await finishAnalysis(
      deps.db,
      projectId,
      got.sha256,
      detectorHash,
      result.partial ? "partial" : "done",
      Date.now(),
      result.maxSliceMs,
      result.bytesWalked,
      null,
    );
    if (!finished.ok) {
      counters.storeErrors++;
      log("ANALYSIS_FINISH_FAILED " + finished.error);
    }
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
        const due =
          !sweptSinceStart ||
          (processedForSweep > 0 &&
            processedForSweep % RETENTION_SWEEP_EVERY_N === 0 &&
            processedForSweep !== lastSweptAtProcessedCount);
        if (due) {
          const projectId = await deps.getProjectId();
          if (projectId !== "") {
            sweptSinceStart = true;
            lastSweptAtProcessedCount = processedForSweep;
            await runRetentionPass(projectId);
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
