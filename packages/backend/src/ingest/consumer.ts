// packages/backend/src/ingest/consumer.ts — the single CPU consumer.
//
// EXACTLY ONE drain loop, guarded by an in-flight boolean. `Worker` is `undefined`
// in this runtime, so "concurrency" would mean interleaved async work on the one
// thread — which multiplies peak memory and latency and buys nothing.
//
// This is the only thing in the plugin that WRITES, so it is where every store
// call site lives.

import { sha256Hex } from "@defminer/engine/digest";
import type { BoundedQueue } from "@defminer/engine/queue";
import type { Database } from "sqlite";

import { contentTypeOf } from "../hooks/admit";
import type { Counters, EnqueueClock } from "../hooks/passive";
import { upsertArtifact } from "../store/artifacts";
import { recordObservation } from "../store/observations";

/**
 * The ONLY primitive that yields this event loop.
 *
 * `setImmediate` and `Promise.resolve()` both scored a 0.00 timer service ratio —
 * identical to a fully blocking loop. `setTimeout(fn, 0)` scored 0.76. It costs
 * 5.03 ms median, which is why yielding is temporal rather than per-item.
 */
const yieldToLoop = (): Promise<void> =>
  new Promise<void>((r) => setTimeout(r, 0));

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

export type ConsumerDeps = {
  queue: BoundedQueue;
  counters: Counters;
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
};

export type ConsumerHandle = { stop: () => void };

type Extracted = {
  requestId: string;
  sha256: string;
  byteLen: number;
  url: string;
  status: number;
  contentType: string | null;
};

/**
 * Everything that touches an SDK object happens HERE, synchronously, and only
 * plain scalars come out.
 *
 * That is the whole point: CORE-05 forbids holding a `Request`, `Response` or
 * `Body` reference across an `await`, and the cheapest way to guarantee it is to
 * make the extraction a synchronous function whose return type contains no SDK
 * type at all. `raw` goes out of scope when this returns and is never persisted.
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
  // Bytes, never `toText()`: SPIKE-08 measured a 222-byte non-UTF-8 fixture
  // becoming 242 bytes across a toText() round trip with a different digest, so
  // offsets and hashes derive from raw bytes only (ENC-01).
  const raw = body.toRaw();
  if (!raw || raw.length === 0) return { empty: true };
  return {
    requestId: rr.request.getId(),
    sha256: sha256Hex(raw),
    byteLen: raw.length,
    url: rr.request.getUrl(),
    status: rr.response.getCode(),
    contentType: contentTypeOf(rr.response.getHeaders()),
  };
}

export function startConsumer(
  sdk: {
    console: { log(msg: string): void };
    requests: { get(id: string): Promise<unknown> };
  },
  deps: ConsumerDeps,
): ConsumerHandle {
  let stopped = false;
  let draining = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let maxReloadLatencyMs = 0;

  const log = (msg: string): void => {
    try {
      sdk.console.log("[defminer] " + msg.slice(0, 200));
    } catch {
      /* sdk.console.log can throw during teardown; nothing left to do */
    }
  };

  async function handleOne(entry: {
    id: string;
    bytes: number;
    kind: string;
  }): Promise<void> {
    const c = deps.counters;

    // TWO undefined branches, not one: `get()` itself may resolve to undefined,
    // and the pair it resolves to has an OPTIONAL response. Neither may throw —
    // a missing reload is counted and the loop continues.
    const rr = (await sdk.requests.get(entry.id)) as
      | { request: any; response?: any }
      | undefined;
    const response = rr?.response;
    if (!rr || !response) {
      c.reloadMissing++;
      return;
    }
    c.reloadHit++;
    const queuedAt = deps.enqueuedAt.get(entry.id);
    if (queuedAt !== undefined) {
      const latency = Date.now() - queuedAt;
      if (latency > maxReloadLatencyMs) maxReloadLatencyMs = latency;
      deps.onReloadLatency?.(maxReloadLatencyMs);
    }

    // `response` rather than `rr` so the narrowing SURVIVES the call: the reload
    // result types response as optional, and truthiness-narrowing a property does
    // not make the whole object assignable to a required-response parameter.
    const got = extract({ request: rr.request, response });
    // From here on NOTHING references rr, its request, its response or its body.
    if ("empty" in got) {
      c.reloadEmptyBody++;
      return;
    }
    if (got.byteLen !== entry.bytes) c.byteLenMismatch++;

    const projectId = await deps.getProjectId();
    if (projectId === "") {
      // No project selected means no row may be written: `project_id` is part of
      // every primary key precisely so a project-scoping bug fails at write time
      // rather than leaking across projects (STORE-02).
      c.storeErrors++;
      log("no project selected; dropping " + got.sha256.slice(0, 12));
      return;
    }

    // The two writes are ONE logical step and both are UNCONDITIONAL. They are two
    // statements because they must be — this driver has no transaction primitive,
    // and no invariant may require two statements to land together — so a failure
    // of either is counted and logged rather than silently orphaning the other.
    const now = Date.now();
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
    }

    c.processed++;
  }

  async function drain(): Promise<void> {
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
          // One bad response must never stop the loop, and Caido would report
          // nothing if it did.
          deps.counters.consumerErrors++;
          log("consumer iteration failed: " + String(e).slice(0, 160));
        } finally {
          deps.enqueuedAt.delete(entry.id);
        }
        await yieldToLoop();
      }
    } finally {
      draining = false;
    }
  }

  function schedule(): void {
    if (stopped) return;
    timer = setTimeout(() => {
      drain()
        .catch((e) => {
          deps.counters.consumerErrors++;
          log("drain failed: " + String(e).slice(0, 160));
        })
        .then(schedule, schedule);
    }, IDLE_POLL_MS);
  }

  schedule();

  return {
    stop: () => {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
    },
  };
}
