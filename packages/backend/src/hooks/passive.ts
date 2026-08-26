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

import { counters, describeError } from "../telemetry";

import { admit, type AdmitConfig, DEFAULT_ADMIT_CONFIG } from "./admit";

// COUNTERS LIVE IN telemetry.ts AND NOWHERE ELSE (plan 01-05).
//
// This file used to declare them, with a note saying plan 01-05 would move them.
// It did. The object is REPLACED, not shadowed: `telemetry.spec.ts` scans this
// package's AST and fails if a second counters object appears anywhere, because
// the failure mode is one object that is written and never read next to another
// that is read and never written.

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
    const c = counters;
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
      counters.hookErrors++;
      sdk.console.log(
        "[defminer] hook skip: " + describeError(e).slice(0, 160),
      );
    } catch {
      /* sdk.console.log itself can throw during teardown; nothing left to do */
    }
  }
}
