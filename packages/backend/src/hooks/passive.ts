// packages/backend/src/hooks/passive.ts — the CORE-01 hook, and nothing else.
//
// This file is WIRING now. The admission decision moved to `admit.ts` in plan
// 01-03, so what is left is exactly the shape CORE-01 describes: latch, count,
// ask `admit`, either increment a named reject counter or offer an entry to the
// queue, return.
//
// STILL NOT ASYNC, and that is type-legal to get wrong: the SDK declares the
// callback as returning `MaybePromise<void>`, so nothing in the type system
// objects to `async` — it is simply the shape that starves the one thread this
// runtime has. Caido QUEUES intercept events (499 survived a 30 s handler block
// and arrived in a 20 ms burst), so an async handler does not drop traffic
// visibly; it silently accumulates backlog until something else breaks.
// `passive.spec.ts` asserts the registered callback returns `undefined` rather
// than a Promise, and eslint.config.js's PROJECT RULE 2 catches the source shape.

import { type BoundedQueue } from "@defminer/engine/queue";

import {
  admit,
  type AdmitConfig,
  DEFAULT_ADMIT_CONFIG,
  REJECT_REASONS,
  type RejectReason,
} from "./admit";

/**
 * In-memory counters. PROVISIONAL BY DESIGN: plan 01-05 moves this object to
 * `telemetry.ts` and rewires this file and the consumer onto it, keeping the key
 * names. Write increments so that swapping the import is the whole of that
 * change, and do not add a second counter object anywhere.
 *
 * NAMING (OBS-02's decision, made here because it is expensive to change later):
 * these count PROXIED RESPONSES OBSERVED. Not "responses on this target", and
 * nothing here may be named with a word asserting completeness. Two measured blind
 * spots make any completeness claim false — `SURFACES_FIRING_INTERCEPT = "proxy"`,
 * so Replay, Automate, workflows, plugin sends and `caido:http` fetch deliver
 * nothing here; and `CACHED_RESPONSES_REACH_HOOK = false`, so a browser-cache hit
 * never enters Caido at all.
 */
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
   *  consumer was mid-`await`. The work already written belongs to the previous
   *  project and is correctly attributed; what is refused is every write AFTER
   *  the change (CORE-09, T-01-25). */
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
   *  those as two different optionality points (`get` returns
   *  `RequestResponseOpt | undefined`, and `RequestResponseOpt.response` is
   *  itself optional) and conflating them hides which one is happening. */
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
   *  BODY_LENGTH_EQUALS_RAW_LENGTH measured them equal across 24 round trips, so a
   *  non-zero value here means that measurement no longer holds. */
  byteLenMismatch: number;
};

export function createCounters(): Counters {
  const rejected = {} as Record<RejectReason, number>;
  for (const r of REJECT_REASONS) rejected[r] = 0;
  return {
    proxiedResponsesObserved: 0,
    admitted: 0,
    rejected,
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
 * Enqueue timestamps, keyed by request id.
 *
 * The hook is the ONLY thing that knows when an intercept event arrived, and the
 * queue entry type is frozen at `{id, bytes, kind}` — so the event-to-reload delta
 * that answers RESEARCH.md Open Question 2 has to live in a structure the hook and
 * the consumer share. It is telemetry, in the same class as the counters, and plan
 * 01-05 folds it into `telemetry.ts` alongside them.
 *
 * BOUNDED. The queue drops the oldest entry at cap and a dropped entry is never
 * taken, so its timestamp would leak; {@link stampEnqueued} evicts in insertion
 * order once the map exceeds the queue's cap.
 */
export type EnqueueClock = Map<string, number>;

export type PassiveDeps = {
  queue: BoundedQueue;
  counters: Counters;
  enqueuedAt: EnqueueClock;
  /**
   * CORE-09's gate at the mouth of the pipeline: false while no project is
   * active, so no entry can be queued that a later write would have to refuse.
   *
   * REQUIRED, not optional-with-a-permissive-default. A default of "allow" is
   * invisible when `init()` forgets to wire it — the plugin would work, and the
   * isolation would simply not be there. Making it required turns that mistake
   * into a compile error.
   */
  admissionAllowed: () => boolean;
  /** Optional so `init()` need not restate the default. */
  admitConfig?: AdmitConfig;
};

/** Record the arrival instant, evicting the oldest when the map outgrows the
 *  queue that feeds it. Map iteration is insertion-ordered, so this is O(1). */
export function stampEnqueued(
  clock: EnqueueClock,
  id: string,
  cap: number,
  nowMs: number,
): void {
  if (clock.size >= cap) {
    const oldest = clock.keys().next();
    if (!oldest.done) clock.delete(oldest.value);
  }
  clock.set(id, nowMs);
}

let deps: PassiveDeps | undefined;

// The `ready` latch is not defensive coding — it is load-bearing. Intercept events
// arrive BEFORE `init()` finishes awaiting `sdk.meta.db()` and `migrate()`, and a
// hook that ran then would enqueue work against an unmigrated database.
let ready = false;

export function configurePassive(d: PassiveDeps): void {
  deps = d;
}

export function setPassiveReady(value: boolean): void {
  ready = value;
}

/** Test seam. Module state is process-global, so a spec that did not reset it
 *  would inherit the previous case's queue and counters. */
export function resetPassiveForTest(): void {
  deps = undefined;
  ready = false;
}

export type PassiveSdk = {
  console: { log(msg: string): void };
  requests: { inScope(request: unknown): boolean };
};

export type PassiveRequest = {
  getId(): string;
  getUrl(): string;
};

export type PassiveResponse = {
  getCode(): number;
  getHeaders(): Record<string, unknown>;
  getBody(): { readonly length: number } | undefined;
};

/**
 * The registered `onInterceptResponse` callback. NOT async — it returns
 * `undefined`, never a Promise.
 */
export function onResponse(
  sdk: PassiveSdk,
  request: PassiveRequest,
  response: PassiveResponse,
): void {
  if (!ready || deps === undefined) return;
  try {
    const c = deps.counters;
    c.proxiedResponsesObserved++;

    // CORE-09's gate, BEFORE the admission decision. With no project active
    // there is no id to key a write on, and an entry queued now would either be
    // refused downstream or — worse — land under whatever is selected next.
    // Counted separately from every reject reason because this is a fact about
    // the PLUGIN's state, not about the response.
    if (!deps.admissionAllowed()) {
      c.noProjectSelected++;
      return;
    }

    const decision = admit(
      sdk,
      request,
      response,
      deps.admitConfig ?? DEFAULT_ADMIT_CONFIG,
    );
    if (!decision.ok) {
      c.rejected[decision.reason]++;
      return;
    }

    // The hook's only side effect besides counters. The entry holds SCALARS only,
    // and EXACTLY the three keys `Entry` declares — no Request, Response or Body
    // reference survives this call (CORE-05), and the memory argument for
    // QUEUE_CAP evaporates the moment somebody adds a fourth key here.
    const id = request.getId();
    const accepted = deps.queue.offer({
      id,
      bytes: decision.bytes,
      kind: decision.kind,
    });
    if (!accepted) c.queueOverflow++;
    stampEnqueued(deps.enqueuedAt, id, deps.queue.cap, Date.now());
    c.admitted++;
  } catch (e) {
    // The ONLY error visibility that exists. HANDLER_ERROR_SURFACED = "neither":
    // Phase 0 searched 22,876 host-log lines plus stdout and stderr for a unique
    // error string thrown from a handler and found ZERO traces, while the plugin
    // kept receiving events normally.
    try {
      if (deps !== undefined) deps.counters.hookErrors++;
      sdk.console.log("[defminer] hook skip: " + String(e).slice(0, 160));
    } catch {
      /* sdk.console.log itself can throw during teardown; nothing left to do */
    }
  }
}
