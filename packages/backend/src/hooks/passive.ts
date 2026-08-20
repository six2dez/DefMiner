// packages/backend/src/hooks/passive.ts — the CORE-01/CORE-02 admission gate.
//
// The whole contract of this file: be NON-ASYNC, do integer and header
// comparisons only, enqueue an id, and return. Everything expensive happens in the
// consumer, on the other side of the queue.
//
// `MaybePromise<void>` makes an `async` callback type-legal, and that is exactly
// the shape that looks fine and starves the one thread this runtime has. CORE-01
// says non-async; the `<verify>` for this plan asserts the registered callback
// returns `undefined` rather than a Promise.
//
// Plan 01-03 replaces the gate below with the full CORE-02 admission semantics in
// `hooks/admit.ts`. The tracer needs only enough gate to admit one JavaScript
// response and reject an oversized, empty or non-script one.

import { type BoundedQueue } from "@defminer/engine/queue";
import { PASSIVE_MAX_BYTES } from "@defminer/engine/thresholds";

/**
 * In-memory counters. PROVISIONAL BY DESIGN: plan 01-05 moves this object to
 * `telemetry.ts` and rewires both this file and the consumer onto it, keeping the
 * key names. Write increments so that swapping the import is the whole of that
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
  /** Rejected, by reason. */
  rejected: Record<RejectReason, number>;
  /** Entries the queue dropped because it was at cap (CORE-03 visible overflow). */
  queueOverflow: number;
  /** Throws caught inside the hook. Caido surfaces none of them itself. */
  hookErrors: number;
  /** Entries the consumer drained. */
  processed: number;
  /** `sdk.requests.get(id)` returned a usable request+response. */
  reloadHit: number;
  /** `sdk.requests.get(id)` returned undefined, or the pair had no response. */
  reloadMissing: number;
  /** Reloaded but the body was absent or zero-length. */
  reloadEmptyBody: number;
  /** Store writes that reported a failure. */
  storeErrors: number;
  /** Throws caught inside a consumer iteration. */
  consumerErrors: number;
  /** `body.length` from the hook disagreed with `toRaw().length` in the consumer.
   *  BODY_LENGTH_EQUALS_RAW_LENGTH measured them equal across 24 round trips, so a
   *  non-zero value here means that measurement no longer holds. */
  byteLenMismatch: number;
};

export type RejectReason =
  | "status"
  | "revalidation"
  | "empty_body"
  | "oversize"
  | "not_script"
  | "no_body";

const REJECT_REASONS: RejectReason[] = [
  "status",
  "revalidation",
  "empty_body",
  "oversize",
  "not_script",
  "no_body",
];

export function createCounters(): Counters {
  const rejected = {} as Record<RejectReason, number>;
  for (const r of REJECT_REASONS) rejected[r] = 0;
  return {
    proxiedResponsesObserved: 0,
    admitted: 0,
    rejected,
    queueOverflow: 0,
    hookErrors: 0,
    processed: 0,
    reloadHit: 0,
    reloadMissing: 0,
    reloadEmptyBody: 0,
    storeErrors: 0,
    consumerErrors: 0,
    byteLenMismatch: 0,
  };
}

const SCRIPTISH = [
  "javascript",
  "ecmascript",
  "application/x-javascript",
  "text/js",
  "module",
];

/** Content type first, extension second. The extension check strips the query AND
 *  the fragment before looking at the suffix, or `/app.js?v=2` would miss. */
export function isScriptish(
  contentType: string | null,
  url: string | null,
): boolean {
  if (contentType) {
    const ct = String(contentType).toLowerCase();
    for (const needle of SCRIPTISH) {
      if (ct.indexOf(needle) !== -1) return true;
    }
  }
  if (url) {
    const bare = String(url).split("#")[0].split("?")[0].toLowerCase();
    if (bare.endsWith(".js") || bare.endsWith(".mjs")) return true;
  }
  return false;
}

/**
 * Resolve the content type from Caido's header map.
 *
 * BOTH casings are checked rather than assuming which spelling Caido normalises
 * to, and an array value is unwrapped: the SDK types headers as
 * `Record<string, Array<string>>`, but the production recorder found BOTH shapes
 * in the field against real traffic.
 */
export function contentTypeOf(
  headers: Record<string, unknown> | undefined,
): string | null {
  if (!headers) return null;
  const raw = headers["content-type"] ?? headers["Content-Type"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === undefined || value === null ? null : String(value);
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

/** Test seam only: plan 01-03's specs need a clean module between cases. */
export function resetPassiveForTest(): void {
  deps = undefined;
  ready = false;
}

/**
 * The registered `onInterceptResponse` callback. NOT async — it returns
 * `undefined`, never a Promise.
 */
export function onResponse(
  sdk: { console: { log(msg: string): void } },
  request: { getId(): string; getUrl(): string },
  response: {
    getCode(): number;
    getHeaders(): Record<string, unknown>;
    getBody(): { readonly length: number } | undefined;
  },
): void {
  if (!ready || deps === undefined) return;
  try {
    const c = deps.counters;
    c.proxiedResponsesObserved++;

    const status = response.getCode();
    // STATUS FIRST, and 304 is its OWN outcome rather than a content-type miss.
    // A 304 reaches this hook with a zero-length body and NO content-type header
    // whatsoever, so a gate keyed on content type would silently file every
    // revalidation of a JS bundle under "not JS" and hand the Phase 6 retroactive
    // scanner a dishonest number (Pitfall 4).
    if (status === 304) {
      c.rejected.revalidation++;
      return;
    }
    if (status < 200 || status >= 300) {
      c.rejected.status++;
      return;
    }

    const url = request.getUrl();
    const contentType = contentTypeOf(response.getHeaders());
    if (!isScriptish(contentType, url)) {
      c.rejected.not_script++;
      return;
    }

    const body = response.getBody();
    if (!body) {
      c.rejected.no_body++;
      return;
    }
    // `length` is a readonly property that costs NO decode. `toRaw()` and
    // `toText()` are both forbidden in this hook: materialising megabytes here
    // happens on the one thread that also serves the plugin's RPC and every timer.
    const bytes = body.length;
    // Zero-length is rejected HERE, before any store write, so no artifact row can
    // ever carry the SHA-256 of the empty byte string.
    if (bytes <= 0) {
      c.rejected.empty_body++;
      return;
    }
    if (bytes > PASSIVE_MAX_BYTES) {
      c.rejected.oversize++;
      return;
    }

    // The hook's only side effect besides counters. The entry holds SCALARS only —
    // no Request, Response or Body reference survives this call (CORE-05).
    const id = request.getId();
    const accepted = deps.queue.offer({ id, bytes, kind: "js" });
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
