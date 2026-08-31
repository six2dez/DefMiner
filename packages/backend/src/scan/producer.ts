// packages/backend/src/scan/producer.ts — one page of the retroactive walk
// (FIND-03, FIND-04, D-01, D-07, D-12).
//
// ===========================================================================
// THE SCAN IS A PRODUCER, NOT A PIPELINE
// ===========================================================================
// This module reads a page of Caido's stored traffic and OFFERS the admitted
// items into the queue the live hook already feeds. It does not digest, it does
// not analyse, it does not write an artifact, it does not write an observation.
// Everything downstream of the queue is the SHIPPED consumer, unchanged.
//
// That is decision D-01 and it is the load-bearing architectural choice of the
// phase. A second path from bytes to rows would need its own admission gate,
// its own deadline, its own retention interaction and its own failure taxonomy
// — four controls that already exist once, reimplemented in a place nobody
// looks at while debugging the first one. The retroactive scan is therefore a
// different SOURCE for the same pipeline, and this file is the only new thing
// in it.
//
// ===========================================================================
// THE PUSH-DOWN IS AN OPTIMISATION; `admit()` IS THE GATE
// ===========================================================================
// Every item this walk returns goes through the SHIPPED `admit()` unchanged,
// including its fifth axis — `sdk.requests.inScope`, Caido's own scope engine,
// with no override (D-07). A widened HTTPQL clause therefore CANNOT produce a
// row that admission would have rejected: the risk a wrong filter carries is
// COST, not correctness. On a runtime where every returned page transfers full
// response bodies, that cost is real — a widened clause turns a targeted scan
// into a pull of every stored body in history — which is why plan 06-04 gates
// the clause. But the correctness argument does not depend on the filter at
// all, and framing it this way is what keeps the gate honest about what it is
// protecting.
//
// ===========================================================================
// WHAT THIS TRACER DELIBERATELY DOES NOT DO
// ===========================================================================
// It walks ONE page per call and returns. There is no loop, no timer and no
// self-scheduling. Three named plans fill this in and each is a layer rather
// than a rewrite: plan 06-03 adds the backpressure watermark that makes a
// sustained backfill safe and the loop that runs under it, 06-06 adds the retro
// counters and the analysed number, and 06-05 adds the lifecycle transitions.
// The shape here does not have to change for any of them — a caller that wants
// N pages calls this N times.
//
// A MULTI-PAGE WALK WITHOUT THE WATERMARK WOULD BE A BUG, not a feature half
// built. `BoundedQueue` drops the OLDEST entry at cap, and the oldest entries
// during a backfill are the operator's LIVE browsing. A loop here today would
// quietly discard the traffic the operator is looking at right now in order to
// make room for traffic from three months ago. That is why the loop is 06-03's
// and why 06-03 is a blocking dependency of any multi-page walk.
//
// NO REGULAR EXPRESSION, for the reason `hooks/admit.ts` states at length: the
// runtime's ReDoS recovery is `kill`, and SIGKILL takes the operator's real
// project data with it.

import type { Entry } from "@defminer/engine/queue";
import { SCAN_PAGE_SIZE } from "@defminer/engine/thresholds";
import type { Database } from "sqlite";

import type { AdmitRequest, AdmitResponse, AdmitSdk } from "../hooks/admit";
import { admit } from "../hooks/admit";
import { describeError } from "../telemetry";

import { composeScanFilter, positionClause } from "./filter";
import { advanceScan, getActiveScan, isRequestFinished } from "./scans";

/**
 * One item of a `RequestsConnection`, as `RequestsQuery.execute()` resolves it.
 *
 * DECLARED STRUCTURALLY rather than imported from `@caido/quickjs-types`,
 * following the shape every other module in this package uses (`AdmitSdk`,
 * `PassiveDeps`, `LifecycleSdk`): each declares the piece of the SDK it
 * touches. It is also what lets the spec's fake be a literal instead of a cast
 * — a stub that has to be cast is a stub that stops failing when the real
 * surface changes.
 *
 * `response` is OPTIONAL because the SDK declares it optional. A stored request
 * with no response is a real shape and it is not an error.
 *
 * @internal
 */
export type ScanPageItem = {
  readonly cursor: string;
  readonly request: AdmitRequest & { getCreatedAt(): Date };
  readonly response?: AdmitResponse | undefined;
};

/**
 * The slice of `RequestsQuery` this walk uses. Every method returns the query,
 * exactly as the SDK declares — the builder is chained, not applied.
 *
 * @internal
 */
export type ScanQuery = {
  filter(filter: string): ScanQuery;
  descending(target: "req", field: "id"): ScanQuery;
  first(n: number): ScanQuery;
  execute(): Promise<{
    readonly pageInfo: { readonly hasNextPage: boolean };
    readonly items: readonly ScanPageItem[];
  }>;
};

/**
 * The queue surface the producer touches — `offer` and nothing else.
 *
 * Narrow ON PURPOSE. The producer must not be able to `take()`: there is
 * exactly one consumer of this queue (`init()` step 6) and a second reader
 * would silently steal work from it, which is a defect no test of either half
 * would catch.
 *
 * @internal
 */
export type ScanQueue = { offer(entry: Entry): boolean };

/**
 * Everything one walk needs, injected.
 *
 * AN OBJECT AND NOT AMBIENT MODULE STATE, so the spec drives the whole path
 * with fakes and the epoch and project id are read at the moment they matter
 * rather than captured when the module loaded. `projectEpoch` and
 * `getProjectId` are functions for the reason `startConsumer`'s `signal` is a
 * getter: a captured value is the value that was true when somebody wired this
 * up, and the whole point of the epoch is that it changes underneath.
 *
 * @internal
 */
export type ScanProducerDeps = {
  readonly sdk: AdmitSdk & { requests: { query(): ScanQuery } };
  readonly db: Database;
  readonly queue: ScanQueue;
  readonly getProjectId: () => Promise<string>;
  readonly projectEpoch: () => number;
  /** Injected so the spec can prove the position does NOT come from here. */
  readonly nowMs: () => number;
};

/**
 * What one call did.
 *
 * A VALUE ON EVERY PATH, never a rejection. Caido surfaces neither a throw nor
 * a rejection from plugin code, so an uncaught failure here would stop the scan
 * with the surface still reading "Scanning" and nothing anywhere saying why.
 *
 * @internal
 */
export type ScanProducerOutcome =
  | {
      readonly outcome: "walked";
      readonly seen: number;
      readonly admitted: number;
      readonly skippedDone: number;
      readonly rejected: number;
      readonly queued: number;
      /** False means the filter's range is exhausted — plan 06-05 turns that
       *  into the `completed` transition. */
      readonly hasNextPage: boolean;
    }
  /** The filter matched nothing below the current position. */
  | { readonly outcome: "exhausted" }
  /** No active scan for this project. Not an error: the common state. */
  | { readonly outcome: "no-scan" }
  /** The project changed under the scan (D-04). Nothing was walked and nothing
   *  was written; plan 06-05 owns the suspension that follows. */
  | { readonly outcome: "epoch-changed" }
  /** `execute()` refused the query, or the advance was declined. Redacted. */
  | { readonly outcome: "failed"; readonly error: string };

/**
 * Walk exactly ONE page of stored traffic and offer what it admits.
 *
 * The order of operations is the design and each step is a refusal the next one
 * depends on:
 *
 *   1. Resolve the project. No project, no scan, no query — and in particular
 *      NO PAGE TRANSFERRED, which on this runtime is the difference between a
 *      no-op and a pull of history.
 *   2. Read the scan. `undefined` is the common state and answers `no-scan`.
 *   3. Compare the epoch. A scan started under a different project must not
 *      keep writing: its rows would land in the new project's partition under
 *      the old project's filter (D-04, threat T-05-34's shape).
 *   4. Compose the filter — through the ONE producer, never inline.
 *   5. Execute, descending on `req.id`.
 *   6. Per item: skip-if-finished, then the SHIPPED `admit()`, then `offer`.
 *   7. Advance the position from the LAST item, with its OWN capture time.
 */
export async function runScanProducer(
  deps: ScanProducerDeps,
): Promise<ScanProducerOutcome> {
  const projectId = await deps.getProjectId();
  if (projectId === "") return { outcome: "no-scan" };

  const scan = await getActiveScan(deps.db, projectId);
  if (scan === undefined || scan.state !== "running") {
    return { outcome: "no-scan" };
  }

  // THE GUARD VALUE, CHECKED BEFORE THE QUERY IS EVEN BUILT. Checking it after
  // would mean paying for a full-body page transfer and then throwing it away,
  // which is the expensive half of the mistake as well as the wrong half.
  if (scan.epoch !== deps.projectEpoch()) return { outcome: "epoch-changed" };

  const filter = composeScanFilter(
    positionClause(scan.last_request_id),
    scan.operator_filter,
  );

  let page: {
    readonly pageInfo: { readonly hasNextPage: boolean };
    readonly items: readonly ScanPageItem[];
  };
  try {
    page = await deps.sdk.requests
      .query()
      .filter(filter)
      // D-12, AND THE ORDERING EDGE. Descending on the request ID and not on
      // `created_at`: `id` is a unique integer, so no two items compare equal
      // and the page order is fully specified. `created_at` is not a total
      // order — two requests captured in the same millisecond tie, and a tie
      // under a keyset walk is either a repeat or a silent skip.
      .descending("req", "id")
      .first(SCAN_PAGE_SIZE)
      .execute();
  } catch (e) {
    // `execute()` throws if a query parameter is invalid — which is exactly the
    // fail-closed path the clause-order rule designs for. REDACTED before it
    // goes anywhere: a driver rejection quotes the query, and the query
    // contains whatever the operator typed.
    return { outcome: "failed", error: describeError(e).slice(0, 200) };
  }

  const items = page.items;
  if (items.length === 0) {
    // NOT AN ADVANCE. There is no last item to take a boundary from, and
    // writing `pages_walked + 1` for a page that contained nothing would report
    // motion that did not happen — on the one surface whose entire subject is
    // whether anything is moving.
    return { outcome: "exhausted" };
  }

  let admitted = 0;
  let skippedDone = 0;
  let rejected = 0;
  let queued = 0;

  for (const it of items) {
    // ALREADY FINISHED — do not reload. One indexed, project-scoped read per
    // item. Anything `partial` or `failed` falls through and is re-offered, so
    // a scan repairs earlier failures rather than cementing them.
    if (await isRequestFinished(deps.db, projectId, it.request.getId())) {
      skippedDone += 1;
      continue;
    }

    const response = it.response;
    if (response === undefined) {
      // A stored request with no response. Counted as rejected because the
      // operator's question is "how many did DefMiner not take", and a fourth
      // bucket for a shape that carries no information would be a counter
      // nobody can act on.
      rejected += 1;
      continue;
    }

    // THE SHIPPED GATE, UNCHANGED. Not a copy of its axes, not a subset, not a
    // "retro variant". Its scope axis is Caido's own engine (D-07).
    const verdict = admit(deps.sdk, it.request, response);
    if (!verdict.ok) {
      rejected += 1;
      continue;
    }

    admitted += 1;
    // EXACTLY `{ id, bytes, kind }`. CORE-05 forbids retaining SDK objects
    // across this boundary — the consumer re-reads the work with
    // `sdk.requests.get(id)` — and the queue's memory budget assumes an entry
    // is scalars. The object literal is what makes TypeScript's excess-property
    // check the mechanism rather than a review comment.
    deps.queue.offer({
      id: it.request.getId(),
      bytes: verdict.bytes,
      kind: verdict.kind,
    });
    queued += 1;
  }

  // THE LAST ITEM OF THE PAGE IS THE BOUNDARY, because the walk is descending:
  // the last item is the OLDEST one seen, and the next page starts strictly
  // below it.
  const boundary = items[items.length - 1];
  const advanced = await advanceScan(deps.db, projectId, scan.scan_id, {
    lastRequestId: boundary.request.getId(),
    // Opportunistic and always safe to lose: the authoritative position is the
    // request id above (O-04).
    lastCursor: boundary.cursor,
    // FROM THE ITEM, NEVER `Date.now()`. See `ScanAdvance`'s note — this is the
    // line that keeps the position readout from saying "now scanning traffic
    // from today" for the whole walk.
    lastCreatedAt: boundary.request.getCreatedAt().getTime(),
    seen: items.length,
    admitted,
    skippedDone,
    rejected,
    queued,
    // The CLOCK belongs here and only here. "When did DefMiner last write this
    // row" and "how far back has the walk got" are two questions, and one value
    // cannot answer both.
    nowMs: deps.nowMs(),
  });
  if (!advanced.ok) return { outcome: "failed", error: advanced.error };

  return {
    outcome: "walked",
    seen: items.length,
    admitted,
    skippedDone,
    rejected,
    queued,
    hasNextPage: page.pageInfo.hasNextPage,
  };
}
