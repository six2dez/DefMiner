// packages/backend/src/scan/producer.ts — the sustained retroactive walk
// (FIND-03, FIND-04, D-01, D-02, D-03, D-07, D-12).
//
// ===========================================================================
// THE SCAN IS A PRODUCER, NOT A PIPELINE
// ===========================================================================
// This module reads pages of Caido's stored traffic and OFFERS the admitted
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
// THE WATERMARK IS WHY THIS LOOP IS ALLOWED TO EXIST
// ===========================================================================
// `BoundedQueue.offer()` drops the OLDEST entry at cap. That is the right trade
// for live traffic — the newest artifact is the one the operator is looking at
// — and it is exactly the wrong one under a backfill, where the oldest entries
// ARE the operator's live browsing. An ungated producer does not merely run
// fast: it provably discards the live responses the operator is watching, and
// the drop counter is the only place that shows.
//
// So the loop offers a page only while the queue's depth is STRICTLY BELOW
// SCAN_BACKPRESSURE_WATERMARK, which `engine/thresholds.ts` derives as
// `QUEUE_CAP - EVENTS_DELIVERED_UNDER_BLOCK - SCAN_PAGE_SIZE` — room for a full
// measured live burst on top of a full page. Plan 06-01 deliberately shipped
// this module with NO CALLER for exactly this reason: a loop before the
// watermark existed would have been a bug, not a feature half built.
//
// THE HOOK IS DELIBERATELY NOT GATED. `hooks/passive.ts` offers
// unconditionally, so live browsing always wins; the scan is the only side that
// yields. A symmetric gate would make a busy queue silently stop recording live
// traffic, which is the failure the whole product exists to avoid.
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
// O-07'S DISPOSITION, RECORDED HERE BECAUSE THIS IS THE MODULE IT WOULD HAVE
// CHANGED. The query-side `admit()` is a FILTER; the AUTHORITATIVE size check
// is the reload, where the byte count is known good and where plan 06-06 puts
// the gate (`counters.reloadOverSize`). The question of whether
// `Body.length` on the `query()` path reports wire bytes or decompressed
// identity bytes was measured rather than argued — see
// `.planning/phases/06-retroactive-scan-deployment-reality/06-02-SUMMARY.md`
// and the artifact it names — and the answer makes no difference here either
// way, which is the property that matters (T-06-18).
//
// ===========================================================================
// THE WALK IS DESCENDING, AND THAT IS A DECISION (D-12)
// ===========================================================================
// `descending("req", "id")` with a `row.id.lt:` position clause, so the walk
// moves AWAY from the present, back into history. Two consequences follow and
// both are wanted: a request arriving mid-scan is never re-walked, because the
// live hook already owns the present; and a scan cancelled early has covered
// RECENT history, which is the half an operator would choose — the UI states
// that rather than hiding it.
//
// The ordering key is `id` and not `created_at`: `id` is a unique integer, so
// no two items compare equal and the page order is fully specified.
// `created_at` is not a total order — two requests captured in the same
// millisecond tie, and a tie under a keyset walk is either a repeat or a silent
// skip.
//
// ===========================================================================
// COUNTERS, AND WHICH CALLER THEY SERVE (D-02)
// ===========================================================================
// EVERY increment on this path goes to `counters.retro.*`. Nothing here touches
// a live counter. A 40,000-request backfill folded into the live numbers would
// make OBS-01's drop count and reject reasons stop describing live proxying,
// on the one surface an operator consults to ask whether DefMiner is keeping up
// with their browsing.
//
// NO REGULAR EXPRESSION, for the reason `hooks/admit.ts` states at length: the
// runtime's ReDoS recovery is `kill`, and SIGKILL takes the operator's real
// project data with it. The one text scan below counts a character in a loop.

import type { Entry } from "@defminer/engine/queue";
import {
  SCAN_BACKPRESSURE_WATERMARK,
  SCAN_PAGE_SIZE,
} from "@defminer/engine/thresholds";
import { yieldToLoop } from "@defminer/engine/yield";
import type { Database } from "sqlite";

import type { AdmitRequest, AdmitResponse, AdmitSdk } from "../hooks/admit";
import { admit } from "../hooks/admit";
import { DETECTOR_CORPUS_VERSION } from "../store/analyses";
import { counters, describeError } from "../telemetry";

import { composeScanFilter, positionClause } from "./filter";
import { advanceScan, FINISHED_ANALYSIS_STATE, getActiveScan } from "./scans";

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
 * The queue surface the producer touches — `offer`, and `depth` to decide
 * whether to offer at all.
 *
 * Narrow ON PURPOSE. The producer must not be able to `take()`: there is
 * exactly one consumer of this queue (`init()` step 6) and a second reader
 * would silently steal work from it, which is a defect no test of either half
 * would catch.
 *
 * `depth` is a property and is READ AFRESH at every check. That is the whole
 * mechanism of the resume: the consumer drains on the same thread between our
 * yields, so a captured number would be the depth at the moment somebody wired
 * this up rather than the depth now.
 *
 * @internal
 */
export type ScanQueue = {
  offer(entry: Entry): boolean;
  readonly depth: number;
};

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
 * Why the walk stopped. A CLOSED set, and every member is a normal outcome
 * except `failed`.
 *
 * @internal
 */
export type ScanProducerStop =
  /** The filter's range below the current position is exhausted — a zero-item
   *  page, or `hasNextPage: false`. AN EMPTY RESULT IS A COMPLETE SCAN, never
   *  an error: the filter matched nothing, which is what finishing looks like.
   *  Plan 06-05 owns the `completed` transition this reports into. */
  | "completed"
  /** The queue is at or above the watermark. A WAIT, not a stop: the caller
   *  re-enters and the walk continues from exactly where it left off. */
  | "held"
  /** No project, or no running scan for it. The common state, not an error. */
  | "no-scan"
  /** The project changed under the scan (D-04). Nothing further was walked and
   *  nothing was written; plan 06-05 owns the suspension that follows. */
  | "epoch-changed"
  /** A walk is already in flight. The second entry did nothing at all. */
  | "busy"
  /** `execute()` refused the query, or an advance was declined. Redacted. */
  | "failed";

/**
 * What one call did.
 *
 * A FLAT RECORD AND NOT A DISCRIMINATED UNION, which is a change from the
 * tracer's shape and the reason is the loop. A union forces every non-`walked`
 * arm to drop the counters, so a walk that covered nine pages and then held —
 * the common shape of a long backfill — would report the hold and lose the
 * nine pages. The counters describe the CALL; `stop` describes why it ended.
 *
 * A VALUE ON EVERY PATH, never a rejection. Caido surfaces neither a throw nor
 * a rejection from plugin code, so an uncaught failure here would stop the scan
 * with the surface still reading "Scanning" and nothing anywhere saying why.
 *
 * @internal
 */
export type ScanProducerOutcome = {
  readonly stop: ScanProducerStop;
  readonly pagesWalked: number;
  readonly seen: number;
  readonly admitted: number;
  readonly skippedDone: number;
  readonly rejected: number;
  readonly queued: number;
  /** True exactly when `stop` is `held`. Carried on the outcome AND readable
   *  out of band through {@link isHeldAtWatermark} — see that function. */
  readonly heldAtWatermark: boolean;
  /** `""` unless `stop` is `failed`. Redacted and truncated. */
  readonly error: string;
};

// ===========================================================================
// THE SKIP-DONE READ (D-03)
// ===========================================================================
//
// ONE bounded statement PER PAGE, replacing the tracer's one read per ITEM. At
// twenty items a page that is the difference between 2,000 reads and 40,000 for
// a 40,000-request backfill, and every one of them was an indexed round trip on
// a pooled connection.
//
// A COMPLETE LITERAL, fully bound with positional `?`, `project_id` first in
// the WHERE. The `analyses` half is a SCALAR SUBQUERY rather than a JOIN, which
// is the shape `scans.ts` already uses and for the reason recorded there:
// `sql-discipline.spec.ts` decomposes a statement into arms and asks each one
// separately about `project_id`, so a JOIN whose scoping lived only in the
// outer WHERE would be a cross-project read one edit away.
//
// `partial` and `failed` ARE DELIBERATELY ABSENT from the predicate. They are
// exactly the pair `store/retry.ts` treats as movable, so a scan REPAIRS
// earlier failures rather than cementing them — the promise 06-UI-SPEC.md's
// `Skipped` help text makes to the operator.
//
// The corpus version is bound: an analysis finished under a DIFFERENT detector
// set has not answered the question this scan is asking, so it must not silence
// it.
const SKIP_DONE_SQL = `
SELECT DISTINCT request_id
FROM observations
WHERE project_id = ?
  AND request_id IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  AND sha256 IN (
    SELECT sha256 FROM analyses
    WHERE project_id = ? AND detector_set_hash = ? AND scan_state = ?
  )
`;

/**
 * The value that fills an unused bind slot on a short page.
 *
 * A REAL CAIDO REQUEST ID IS NEVER EMPTY. `observations.request_id` is
 * `TEXT NOT NULL` and every id this codebase writes comes from
 * `request.getId()`, so the empty string cannot collide with a stored row —
 * and even if one somehow existed, no page ITEM has an empty id either, so a
 * match on the pad silences nothing. This is stated here because a reader
 * meeting the pad below will otherwise read it as a bug.
 */
const SKIP_DONE_PAD = "";

/**
 * The binds in {@link SKIP_DONE_SQL} that are NOT request ids: `project_id` in
 * the outer WHERE, then `project_id`, `detector_set_hash` and `scan_state`
 * inside the subquery.
 *
 * A property of the STATEMENT TEXT above rather than a tunable, which is why it
 * is written out while the page size never is.
 */
const SKIP_DONE_FIXED_BINDS = 4;

/** Count one character, in a loop. `telemetry.ts`'s `countCharacter` idiom, and
 *  for the same reason: a character class is a pattern, and this runtime's
 *  ReDoS recovery is `kill`. */
function countCharacter(text: string, character: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === character) count += 1;
  }
  return count;
}

// THE STATEMENT'S ARITY, ASSERTED AT IMPORT rather than assumed at the bind —
// `store/retry.ts`'s idiom, and the same failure it prevents. Every statement in
// this package is a complete literal, so the placeholder count cannot be sized
// at run time; widening the page and widening the statement have to be ONE
// edit. Derived by counting the `?` in the literal above rather than written
// out, so this constant cannot itself drift from the text it describes.
const SKIP_DONE_REQUEST_SLOTS =
  countCharacter(SKIP_DONE_SQL, "?") - SKIP_DONE_FIXED_BINDS;
if (SKIP_DONE_REQUEST_SLOTS !== SCAN_PAGE_SIZE) {
  throw new Error(
    `scan/producer.ts: SKIP_DONE_SQL binds ${String(SKIP_DONE_REQUEST_SLOTS)} request-id ` +
      `placeholders but SCAN_PAGE_SIZE is now ${String(SCAN_PAGE_SIZE)}. Widen the ` +
      `statement and the page size in ONE edit — a short bind list would silently stop ` +
      `skipping the tail of every page, and a long one would bind past the end.`,
  );
}

/**
 * Which of these request ids have already been carried to a FINISHED analysis
 * in this project, at the current corpus version.
 *
 * Prepared INSIDE the call because `sdk.meta.db()` is a pool over worker
 * threads: two `all()` calls on a shared Statement can land on different
 * connections with interleaved bindings.
 */
async function readFinishedRequestIds(
  db: Database,
  projectId: string,
  requestIds: readonly string[],
): Promise<Set<string>> {
  const bound: string[] = [];
  for (let i = 0; i < SCAN_PAGE_SIZE; i += 1) {
    bound.push(requestIds[i] ?? SKIP_DONE_PAD);
  }
  const stmt = await db.prepare(SKIP_DONE_SQL);
  const rows = await stmt.all<{ request_id: string }>(
    projectId,
    ...bound,
    projectId,
    DETECTOR_CORPUS_VERSION,
    FINISHED_ANALYSIS_STATE,
  );
  return new Set(rows.map((r) => r.request_id));
}

// ===========================================================================
// MODULE STATE — the re-entrancy flag and the reported hold
// ===========================================================================

/**
 * One walk at a time, in this process.
 *
 * `consumer.ts`'s `draining` flag, mirrored. This is HALF of the
 * one-scan-at-a-time invariant; the durable half is the partial UNIQUE index on
 * `(project_id) WHERE state = 'running'`, which is what survives a restart. A
 * second entry here would walk the same page twice, offer every item twice and
 * advance the position twice.
 */
let walking = false;

/**
 * Is the producer withholding pages because the queue is at the watermark?
 *
 * MODULE STATE AND NOT ONLY A RETURN VALUE, because the reader is a DIFFERENT
 * CALL. `getScanStatus` is its own RPC; it does not have the walk's outcome in
 * hand. And this is the one field the readout cannot derive for itself: from
 * outside the backend a scan holding at the watermark and a scan whose QuickJS
 * thread is blocked look identical — both show counters that stop advancing.
 * Without an explicit signal, "Waiting for the analysis queue" can never render,
 * every legitimate hold falls through to "Not advancing", and the stall marker
 * cries wolf on the single most common healthy state of a long backfill. An
 * operator who learns to ignore a stall marker is worse off than one who never
 * had it (06-UI-SPEC.md § "The scan status payload — required fields").
 */
let heldAtWatermark = false;

/**
 * The hold, as `getScanStatus` reads it.
 *
 * Plan 06-05 owns the `index.ts` projection that carries this across the RPC;
 * plan 06-01 shipped the payload field reporting an unconditional `false`,
 * which was the true answer for a build that walked one page per call and never
 * held. This is the value that makes it true.
 *
 * @internal
 */
export function isHeldAtWatermark(): boolean {
  return heldAtWatermark;
}

/** Test seam. Module state is process-global, so a spec that did not reset it
 *  would inherit the previous case's flags — and a `walking` left true would
 *  make every later case report `busy`.
 *
 *  @internal */
export function resetScanProducerForTest(): void {
  walking = false;
  heldAtWatermark = false;
}

/** Running totals for one CALL, across however many pages it walked. */
type WalkTotals = {
  pagesWalked: number;
  seen: number;
  admitted: number;
  skippedDone: number;
  rejected: number;
  queued: number;
};

function outcome(
  stop: ScanProducerStop,
  totals: WalkTotals,
  error = "",
): ScanProducerOutcome {
  return {
    stop,
    pagesWalked: totals.pagesWalked,
    seen: totals.seen,
    admitted: totals.admitted,
    skippedDone: totals.skippedDone,
    rejected: totals.rejected,
    queued: totals.queued,
    heldAtWatermark: stop === "held",
    error,
  };
}

/**
 * Walk stored traffic, page after page, offering what it admits.
 *
 * The order of operations inside one page is the design, and each step is a
 * refusal the next one depends on:
 *
 *   1. Resolve the project. No project, no scan, no query — and in particular
 *      NO PAGE TRANSFERRED, which on this runtime is the difference between a
 *      no-op and a pull of history.
 *   2. Read the scan. `undefined` is the common state and answers `no-scan`.
 *      Re-read EVERY page, not once: plan 06-05's suspend and discard land in
 *      this table, and a walk that read the row once would keep going after the
 *      operator had stopped it.
 *   3. Compare the epoch. A scan started under a different project must not
 *      keep writing: its rows would land in the new project's partition under
 *      the old project's filter (D-04, threat T-05-34's shape).
 *   4. Check the watermark. BEFORE the query, because checking after would mean
 *      paying for a full-body page transfer and then declining to use it.
 *   5. Compose the filter — through the ONE producer, never inline.
 *   6. Execute, descending on `req.id`.
 *   7. ONE skip-done read for the whole page, then per item: skip, or the
 *      SHIPPED `admit()`, then `offer`.
 *   8. Advance the position from the LAST item, with its OWN capture time.
 *   9. Yield, then decide whether there is another page.
 */
export async function runScanProducer(
  deps: ScanProducerDeps,
): Promise<ScanProducerOutcome> {
  const totals: WalkTotals = {
    pagesWalked: 0,
    seen: 0,
    admitted: 0,
    skippedDone: 0,
    rejected: 0,
    queued: 0,
  };

  // BEFORE THE FIRST `await`, so two entries in the same turn cannot both pass
  // it. There is no lock on this runtime and none is needed: the thread is not
  // pre-empted between synchronous statements.
  if (walking) return outcome("busy", totals);
  walking = true;

  try {
    for (;;) {
      const projectId = await deps.getProjectId();
      if (projectId === "") return outcome("no-scan", totals);

      const scan = await getActiveScan(deps.db, projectId);
      if (scan === undefined || scan.state !== "running") {
        return outcome("no-scan", totals);
      }

      // THE GUARD VALUE, CHECKED BEFORE THE QUERY IS EVEN BUILT.
      if (scan.epoch !== deps.projectEpoch()) {
        return outcome("epoch-changed", totals);
      }

      // --- THE WATERMARK GATE (D-01, T-06-13) ------------------------------
      //
      // STRICTLY BELOW. At the watermark exactly there is room for one measured
      // live burst plus one page and not a page more, so offering there would
      // spend the margin the derivation reserves.
      if (deps.queue.depth >= SCAN_BACKPRESSURE_WATERMARK) {
        heldAtWatermark = true;
        // YIELD AND RE-CHECK. The consumer drains on this same thread, so the
        // only way the depth can fall is if we let it run — and
        // `setTimeout(fn, 0)` is the only primitive that yields this loop.
        await yieldToLoop();
        if (deps.queue.depth >= SCAN_BACKPRESSURE_WATERMARK) {
          // STILL HELD, so return rather than spin. One yield is this runtime's
          // minimum slice (a measured ~5.03 ms median); if the consumer moved
          // nothing in that window it is busy with a large artifact, and holding
          // the call open would turn a reportable state into an invisible one.
          // The caller re-enters and the walk resumes from exactly here — which
          // is what makes the hold a WAIT rather than a stop.
          return outcome("held", totals);
        }
        // It drained. Resume with no operator action, and stop reporting a hold
        // that is over.
        heldAtWatermark = false;
        continue;
      }
      heldAtWatermark = false;

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
          .descending("req", "id")
          .first(SCAN_PAGE_SIZE)
          .execute();
      } catch (e) {
        // `execute()` throws if a query parameter is invalid — which is exactly
        // the fail-closed path the clause-order rule designs for. REDACTED
        // before it goes anywhere: a driver rejection quotes the query, and the
        // query contains whatever the operator typed.
        return outcome("failed", totals, describeError(e).slice(0, 200));
      }

      const items = page.items;
      if (items.length === 0) {
        // NOT AN ADVANCE, and NOT AN ERROR. There is no last item to take a
        // boundary from, and writing `pages_walked + 1` for a page that
        // contained nothing would report motion that did not happen — on the
        // one surface whose entire subject is whether anything is moving. The
        // filter matched nothing below the current position, which is what
        // finishing looks like.
        return outcome("completed", totals);
      }

      const finished = await readFinishedRequestIds(
        deps.db,
        projectId,
        items.map((it) => it.request.getId()),
      );

      let admitted = 0;
      let skippedDone = 0;
      let rejected = 0;
      let queued = 0;

      for (const it of items) {
        // ALREADY FINISHED — do not reload. Anything `partial` or `failed` is
        // absent from `finished` and falls through, so a scan repairs earlier
        // failures rather than cementing them.
        if (finished.has(it.request.getId())) {
          skippedDone += 1;
          counters.retro.skippedDone += 1;
          continue;
        }

        const response = it.response;
        if (response === undefined) {
          // A stored request with no response. NEITHER admitted NOR rejected:
          // `admit.ts`'s reason union is closed and describes a RESPONSE, and
          // there is none here to describe. It gets its own counter instead of
          // being folded into a reason it does not fit.
          counters.retro.reloadNoResponse += 1;
          continue;
        }

        // THE SHIPPED GATE, UNCHANGED. Not a copy of its axes, not a subset,
        // not a "retro variant". Its scope axis is Caido's own engine (D-07).
        const verdict = admit(deps.sdk, it.request, response);
        if (!verdict.ok) {
          rejected += 1;
          counters.retro.rejected[verdict.reason] += 1;
          continue;
        }

        admitted += 1;
        counters.retro.admitted += 1;
        // EXACTLY `{ id, bytes, kind }`. CORE-05 forbids retaining SDK objects
        // across this boundary — the consumer re-reads the work with
        // `sdk.requests.get(id)` — and the queue's memory budget assumes an
        // entry is scalars. The object literal is what makes TypeScript's
        // excess-property check the mechanism rather than a review comment.
        deps.queue.offer({
          id: it.request.getId(),
          bytes: verdict.bytes,
          kind: verdict.kind,
        });
        queued += 1;
        counters.retro.queued += 1;
      }

      // THE LAST ITEM OF THE PAGE IS THE BOUNDARY, because the walk is
      // descending: the last item is the OLDEST one seen, and the next page
      // starts strictly below it.
      const boundary = items[items.length - 1];
      const advanced = await advanceScan(deps.db, projectId, scan.scan_id, {
        lastRequestId: boundary.request.getId(),
        // Opportunistic and always safe to lose: the authoritative position is
        // the request id above (O-04).
        lastCursor: boundary.cursor,
        // FROM THE ITEM, NEVER `Date.now()`. This is the line that keeps the
        // position readout from saying "now scanning traffic from today" for
        // the whole walk.
        lastCreatedAt: boundary.request.getCreatedAt().getTime(),
        seen: items.length,
        admitted,
        skippedDone,
        rejected,
        queued,
        // The CLOCK belongs here and only here. "When did DefMiner last write
        // this row" and "how far back has the walk got" are two questions, and
        // one value cannot answer both.
        nowMs: deps.nowMs(),
      });
      if (!advanced.ok) return outcome("failed", totals, advanced.error);

      totals.pagesWalked += 1;
      totals.seen += items.length;
      totals.admitted += admitted;
      totals.skippedDone += skippedDone;
      totals.rejected += rejected;
      totals.queued += queued;
      counters.retro.pagesWalked += 1;
      counters.retro.seen += items.length;

      // BETWEEN PAGES, UNCONDITIONALLY — including after the last one. One
      // thread, no worker threads, and `setTimeout(fn, 0)` the only primitive
      // that yields it; a long serial job that never yields is the
      // frozen-looking page Pitfall 3 describes, which an operator reads as a
      // crash. Placed BEFORE the termination check so the count of yields is
      // the count of pages, with no page that skipped its turn.
      await yieldToLoop();

      if (!page.pageInfo.hasNextPage) return outcome("completed", totals);
    }
  } finally {
    // IN THE `finally`, not after the loop. Every exit from the walk is a
    // `return`, so a reset placed after the loop would never run at all — and
    // the first `execute()` that threw would leave the producer permanently
    // busy, refusing every later start with nothing on any surface saying why.
    walking = false;
  }
}
