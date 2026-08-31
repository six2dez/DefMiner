// packages/backend/src/scan/producer.spec.ts — the sustained backfill: the
// backpressure watermark, the bounded skip-done read, the descending multi-page
// walk, the yield and the re-entrancy flag (FIND-03, FIND-04, D-01, D-03, D-07,
// D-12).
//
// ===========================================================================
// WHY THIS SPLIT OFF `scans.spec.ts`
// ===========================================================================
// Plan 06-01 asserted the producer inside `scans.spec.ts`, and the reason it
// gave was sound at the time: a one-page walk's interesting claim spans the
// filter, the table and the queue, so splitting it would have left each half
// asserted against a mock of the other. That claim is still asserted end to end
// below — the real `composeScanFilter`, the real `scans` table on the sqlite
// fixture, the real `admit()` and the real `BoundedQueue`.
//
// What changed is that the producer stopped being one page. A loop has
// properties no other module has — a watermark it holds at, a yield between
// pages, a flag that stops a second entry — and each one needs its own fixture
// shape. Keeping them inside the table's spec would have meant a file where the
// `scans` cases and the loop cases share a `beforeEach` neither of them wants.
//
// ===========================================================================
// THE HEADLINE PROPERTY, STATED SO IT IS NOT LOST AMONG THE OTHERS
// ===========================================================================
// `BoundedQueue.offer()` drops the OLDEST entry at cap. That is right for live
// traffic and exactly wrong under a backfill, where the oldest entries ARE the
// operator's live browsing. So the case that matters most in this file is
// "cannot displace a live entry": a full page offered at the watermark, then a
// full MEASURED live burst on top of it, with the overflow counter still at zero
// and the first live entry still at the head of the queue. Everything else here
// supports that one.
//
// ===========================================================================
// THE FIXTURE'S HONEST LIMIT
// ===========================================================================
// `sqlite-fixture.ts` is single-connection and CANNOT reproduce pool affinity,
// and the SDK query builder below is a shape rather than a runtime. Everything
// asserted here is statement, counter and control-flow correctness. Nothing
// proves that Caido's real `sdk.requests.query()` behaves this way; plans 06-10
// and 06-11 are where that becomes measured.

import { readFileSync } from "node:fs";

import {
  isDegradedScanState,
  SCAN_KIND_CLAUSE,
  TERMINAL_SCAN_STATES,
} from "@defminer/engine/contract";
import { BoundedQueue } from "@defminer/engine/queue";
import {
  EVENTS_DELIVERED_UNDER_BLOCK,
  QUEUE_CAP,
  SCAN_BACKPRESSURE_WATERMARK,
  SCAN_PAGE_SIZE,
} from "@defminer/engine/thresholds";
import type { Database, Parameter } from "sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  makeFakeRequest,
  makeFakeResponse,
  makeFakeSdk,
} from "../../test/fixtures/fake-sdk";
import type { SqliteFixture } from "../../test/fixtures/sqlite-fixture";
import { createFixtureDb } from "../../test/fixtures/sqlite-fixture";
import { DETECTOR_CORPUS_VERSION } from "../store/analyses";
import { migrate } from "../store/migrations";
import { counters, resetTelemetryForTest } from "../telemetry";

import type { ScanPageItem, ScanQueue } from "./producer";
import {
  isHeldAtWatermark,
  resetScanProducerForTest,
  runScanProducer,
} from "./producer";
import { advanceScan, getActiveScan, startScan } from "./scans";

const PRODUCER_FILE = "packages/backend/src/scan/producer.ts";

const PROJECT = "p1";
const NOW = 1_756_000_000_000;

/** A capture date well before the fake clock, so "the position came from the
 *  ITEM and not from `Date.now()`" is a claim the numbers can carry. */
const CAPTURED_AT = 1_723_600_000_000; // 14 Aug 2024, in ms

function item(
  id: string,
  opts: {
    url?: string;
    code?: number;
    createdAt?: number;
    noResponse?: boolean;
  } = {},
): ScanPageItem {
  const request = makeFakeRequest({
    id,
    url: opts.url ?? `https://example.test/${id}.js`,
  });
  return {
    cursor: `cursor-${id}`,
    request: {
      ...request,
      getCreatedAt: () => new Date(opts.createdAt ?? CAPTURED_AT),
    },
    response:
      opts.noResponse === true
        ? undefined
        : makeFakeResponse({ id, code: opts.code ?? 200 }),
  };
}

/** What one fake query run recorded. */
type QueryRecord = {
  filter: string | null;
  first: number | null;
  order: string[];
  /** HOW MANY QUERIES WERE ISSUED, which is the watermark gate's whole subject.
   *  A gate that holds is a gate that transfers no page, and on this runtime a
   *  page is a transfer of every matching response body. */
  executes: number;
};

function newRecord(): QueryRecord {
  return { filter: null, first: null, order: [], executes: 0 };
}

/**
 * An `sdk.requests.query()` builder answering a SEQUENCE of pages.
 *
 * Every method returns the same object, exactly as `RequestsQuery` declares — a
 * fake that returned a fresh one would let a lost `.filter()` call pass
 * unnoticed. Past the end of the sequence it answers an empty final page, so a
 * loop bug shows up as an assertion failure rather than as a hung suite.
 */
function fakeQuerySdk(
  pages: ScanPageItem[][],
  hasNextPageAfterLast: boolean,
  record: QueryRecord,
) {
  const query = {
    filter(f: string) {
      record.filter = f;
      return query;
    },
    descending(target: string, field: string) {
      record.order.push(`${target}.${field}`);
      return query;
    },
    first(n: number) {
      record.first = n;
      return query;
    },
    execute() {
      const index = record.executes;
      record.executes += 1;
      const page = pages[index] ?? [];
      const isLast = index >= pages.length - 1;
      return Promise.resolve({
        pageInfo: {
          hasNextPage: isLast ? hasNextPageAfterLast : true,
          hasPreviousPage: false,
          startCursor: page[0]?.cursor ?? "",
          endCursor: page[page.length - 1]?.cursor ?? "",
        },
        items: page,
      });
    },
  };
  const base = makeFakeSdk();
  return {
    ...base,
    requests: { ...base.requests, query: () => query },
  };
}

/** One page, the common case. */
function onePage(
  page: ScanPageItem[],
  hasNextPage: boolean,
  record: QueryRecord,
) {
  return fakeQuerySdk([page], hasNextPage, record);
}

/**
 * A queue whose depth the spec drives, and which counts what it was offered.
 *
 * Narrower than `BoundedQueue` on purpose: the watermark cases are about the
 * DECISION to offer, and a real queue's depth is a consequence of that decision
 * rather than an input to it. The cases that are about the queue's own behaviour
 * use the real `BoundedQueue`.
 */
function fakeQueue(depths: number[]): ScanQueue & { offered: string[] } {
  let reads = 0;
  return {
    offered: [] as string[],
    offer(entry) {
      this.offered.push(entry.id);
      return true;
    },
    get depth(): number {
      const value = depths[Math.min(reads, depths.length - 1)];
      reads += 1;
      return value;
    },
  };
}

/** One statement execution the producer performed. */
type DbCall = { sql: string; args: Parameter[] };

/**
 * `fx.db` with every bind recorded.
 *
 * The `as unknown as Database` follows `sqlite-fixture.ts`'s own idiom and for
 * the same reason: `Database` is the driver's class and only `prepare` is on
 * this path. The cast has ONE place and this comment.
 */
function recordingDb(db: Database, log: DbCall[]): Database {
  return {
    prepare: async (sql: string) => {
      const stmt = await db.prepare(sql);
      return {
        all: (...args: Parameter[]) => {
          log.push({ sql, args });
          return stmt.all(...args);
        },
        get: (...args: Parameter[]) => {
          log.push({ sql, args });
          return stmt.get(...args);
        },
        run: (...args: Parameter[]) => {
          log.push({ sql, args });
          return stmt.run(...args);
        },
      };
    },
  };
}

/** The skip-done read, picked out of the log by the two tables it joins. */
function skipDoneCalls(log: DbCall[]): DbCall[] {
  return log.filter(
    (c) => c.sql.includes("observations") && c.sql.includes("analyses"),
  );
}

/** Seed one request as already carried to a FINISHED analysis: an observation
 *  binds the request id to a digest, and that digest has a `done` analysis at
 *  the current corpus version. */
function seedAnalysis(
  fx: SqliteFixture,
  projectId: string,
  requestId: string,
  sha256: string,
  state: string,
): void {
  fx.raw
    .prepare(
      "INSERT INTO observations (project_id, sha256, request_id, url, status, content_type, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      projectId,
      sha256,
      requestId,
      "https://example.test/x.js",
      200,
      "application/javascript",
      NOW,
    );
  fx.raw
    .prepare(
      "INSERT INTO analyses (project_id, sha256, detector_set_hash, scan_state, started_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(projectId, sha256, DETECTOR_CORPUS_VERSION, state, NOW);
}

let fx: SqliteFixture;

beforeEach(async () => {
  resetTelemetryForTest();
  resetScanProducerForTest();
  fx = createFixtureDb();
  const report = await migrate(fx.db);
  expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
});

afterEach(() => {
  fx.close();
  vi.restoreAllMocks();
});

// ===========================================================================
// 1. THE WALK ITSELF — carried over from the tracer, still asserted end to end
// ===========================================================================

describe("runScanProducer walks pages through the SHIPPED admission gate", () => {
  it("walks ONE page: three items in, exactly one queue entry out, every counter moved", async () => {
    seedAnalysis(fx, PROJECT, "done-1", "a".repeat(64), "done");
    const page = [
      item("done-1"),
      item("ok-1"),
      // A 404 fails `admit()`'s first axis. NOT a 304 here: a 304 is
      // `revalidation` and the push-down's 2xx bound means Caido would not have
      // returned it at all.
      item("no-1", { code: 404 }),
    ];
    const record = newRecord();
    const queue = new BoundedQueue(QUEUE_CAP);

    const outcome = await runScanProducer({
      sdk: onePage(page, false, record),
      db: fx.db,
      queue,
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW + 60_000,
    });

    expect(outcome.stop, JSON.stringify(outcome)).toBe("completed");
    expect(outcome.pagesWalked).toBe(1);

    // EXACTLY ONE ENTRY, and it is the shipped `Entry` shape — id, bytes, kind
    // and nothing else. CORE-05 forbids retaining SDK objects across the
    // boundary, and the queue's memory argument evaporates the moment an item
    // carries a header.
    expect(queue.depth).toBe(1);
    const entry = queue.take();
    expect(entry?.id).toBe("ok-1");
    expect(Object.keys(entry ?? {}).sort()).toEqual(["bytes", "id", "kind"]);

    const row = await getActiveScan(fx.db, PROJECT);
    expect(row?.pages_walked).toBe(1);
    expect(row?.seen).toBe(3);
    expect(row?.admitted).toBe(1);
    expect(row?.skipped_done).toBe(1);
    expect(row?.rejected).toBe(1);
    expect(row?.queued).toBe(1);
  });

  it("takes the position from the ITEM's capture time, never from the clock", async () => {
    // D-14 and Pitfall 4. `consumer.ts` stamps every persisted row with
    // `Date.now()`, so a position line built from a stored row would read "now
    // scanning traffic from today" for the entire walk.
    const record = newRecord();
    const clock = NOW + 60_000;

    await runScanProducer({
      sdk: onePage(
        [item("a-1"), item("a-2", { createdAt: CAPTURED_AT - 5_000 })],
        false,
        record,
      ),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => clock,
    });

    const row = await getActiveScan(fx.db, PROJECT);
    // The LAST item of the page — the walk is descending, so the last item is
    // the oldest one and is the boundary the next page starts below.
    expect(row?.last_request_id).toBe("a-2");
    expect(row?.last_created_at).toBe(CAPTURED_AT - 5_000);
    expect(row?.last_created_at).not.toBe(clock);
    expect(row?.updated_at).toBe(clock);
  });

  it("composes the filter with NO position clause on the first page", async () => {
    const record = newRecord();
    await runScanProducer({
      sdk: onePage([item("a-1")], false, record),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });
    expect(record.filter).toBe(`(${SCAN_KIND_CLAUSE})`);
  });

  it("resumes STRICTLY BELOW the last walked request — no overlap and no gap", async () => {
    // The adjacency edge. `row.id.lt:<last>` and not `lte:`: the last-walked
    // request is never re-walked, and the next page starts exactly one row
    // below it.
    await advanceScan(fx.db, PROJECT, "s1", {
      lastRequestId: "9001",
      lastCursor: null,
      lastCreatedAt: CAPTURED_AT,
      seen: 20,
      admitted: 0,
      skippedDone: 0,
      rejected: 20,
      queued: 0,
      nowMs: NOW,
    });

    const record = newRecord();
    await runScanProducer({
      sdk: onePage([item("8999")], false, record),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(record.filter).toBe(`(${SCAN_KIND_CLAUSE}) AND (row.id.lt:9001)`);
    expect(record.filter).not.toContain("lte");
  });

  it("orders DESCENDING on the request id — a unique integer, so no two items tie (D-12)", async () => {
    const record = newRecord();
    await runScanProducer({
      sdk: onePage([item("a-1")], false, record),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });
    expect(record.order).toEqual(["req.id"]);
    expect(record.first).toBe(SCAN_PAGE_SIZE);
  });

  it("applies Caido's OWN scope with no override (D-07)", async () => {
    // `admit()`'s fifth axis is `sdk.requests.inScope`, and the producer calls
    // the SHIPPED gate unchanged. The push-down is an OPTIMISATION; this is the
    // gate.
    const record = newRecord();
    const queue = new BoundedQueue(QUEUE_CAP);
    const sdk = onePage([item("ok-1")], false, record);

    await runScanProducer({
      sdk: { ...sdk, requests: { ...sdk.requests, inScope: () => false } },
      db: fx.db,
      queue,
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(queue.depth).toBe(0);
    const row = await getActiveScan(fx.db, PROJECT);
    expect(row?.rejected).toBe(1);
    expect(row?.admitted).toBe(0);
    expect(counters.retro.rejected.out_of_scope).toBe(1);
  });

  it("does nothing at all when the project has no scan", async () => {
    const record = newRecord();
    const outcome = await runScanProducer({
      sdk: onePage([item("a-1")], true, record),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve("no-such-project"),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(outcome.stop).toBe("no-scan");
    // The query was never built, so NO PAGE WAS TRANSFERRED. On a runtime where
    // every page carries full response bodies that is the difference between a
    // no-op and a pull of history.
    expect(record.executes).toBe(0);
  });

  it("refuses to walk under a CHANGED project epoch (D-04)", async () => {
    const record = newRecord();
    const outcome = await runScanProducer({
      sdk: onePage([item("a-1")], true, record),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 1,
      nowMs: () => NOW,
    });

    expect(outcome.stop).toBe("epoch-changed");
    expect(record.executes).toBe(0);
  });

  it("answers a VALUE when execute() throws, and writes nothing", async () => {
    // Caido surfaces neither a throw nor a rejection from plugin code, so an
    // uncaught rejection here is invisible — the scan would simply stop with the
    // surface still reading "Scanning".
    const base = makeFakeSdk();
    const query = {
      filter: () => query,
      descending: () => query,
      first: () => query,
      execute: () =>
        Promise.reject(new Error("invalid query at https://secret.test/x")),
    };
    const outcome = await runScanProducer({
      sdk: { ...base, requests: { ...base.requests, query: () => query } },
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(outcome.stop).toBe("failed");
    // REDACTED, and bounded. A driver rejection carries the bound parameters and
    // one of them is a URL; `describeError` redacts before it truncates.
    expect(outcome.error).not.toContain("secret.test");

    const row = await getActiveScan(fx.db, PROJECT);
    expect(row?.pages_walked).toBe(0);
  });
});

// ===========================================================================
// 2. TERMINATION — an empty result is a COMPLETE scan (FIND-03 empty edge)
// ===========================================================================

describe("the walk ends on an exhausted range, and that is not an error", () => {
  it("treats a ZERO-ITEM page as a completed scan, and advances nothing", async () => {
    const record = newRecord();
    const outcome = await runScanProducer({
      sdk: onePage([], true, record),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    // COMPLETED, not "failed" and not "empty". The filter matched nothing below
    // the current position, which is what finishing looks like.
    expect(outcome.stop).toBe("completed");
    expect(outcome.pagesWalked).toBe(0);

    const row = await getActiveScan(fx.db, PROJECT);
    // NOT advanced. There is no last item to take a boundary from, and writing
    // `pages_walked + 1` for a page that contained nothing would report motion
    // that did not happen on the surface whose whole subject is motion.
    expect(row?.pages_walked).toBe(0);
    expect(row?.last_request_id).toBe("");
  });

  it("treats `hasNextPage: false` as a completed scan", async () => {
    const record = newRecord();
    const outcome = await runScanProducer({
      sdk: onePage([item("a-1")], false, record),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(outcome.stop).toBe("completed");
    expect(outcome.pagesWalked).toBe(1);
    // ONE query. `hasNextPage: false` is the end of the range, so a second
    // execute() would be a page nobody asked for.
    expect(record.executes).toBe(1);
  });

  it("walks EVERY page of a multi-page range and accumulates across them", async () => {
    const record = newRecord();
    const pages = [
      [item("p1-a"), item("p1-b")],
      [item("p2-a")],
      [item("p3-a"), item("p3-b"), item("p3-c")],
    ];
    const queue = new BoundedQueue(QUEUE_CAP);

    const outcome = await runScanProducer({
      sdk: fakeQuerySdk(pages, false, record),
      db: fx.db,
      queue,
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(outcome.stop).toBe("completed");
    expect(record.executes).toBe(3);
    expect(outcome.pagesWalked).toBe(3);
    expect(outcome.seen).toBe(6);
    expect(queue.depth).toBe(6);

    const row = await getActiveScan(fx.db, PROJECT);
    expect(row?.pages_walked).toBe(3);
    expect(row?.seen).toBe(6);
    // The position is the LAST item of the LAST page — the oldest thing walked.
    expect(row?.last_request_id).toBe("p3-c");
    expect(counters.retro.pagesWalked).toBe(3);
    expect(counters.retro.seen).toBe(6);
    expect(counters.retro.queued).toBe(6);
  });
});

// ===========================================================================
// 3. THE BACKPRESSURE WATERMARK — D-01, and the reason this plan exists
// ===========================================================================

describe("the watermark gate (D-01, T-06-13)", () => {
  it("offers a page while depth is STRICTLY below the watermark", async () => {
    const record = newRecord();
    const outcome = await runScanProducer({
      sdk: onePage([item("a-1")], false, record),
      db: fx.db,
      queue: fakeQueue([SCAN_BACKPRESSURE_WATERMARK - 1]),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(record.executes).toBe(1);
    expect(outcome.stop).toBe("completed");
    expect(outcome.heldAtWatermark).toBe(false);
    expect(isHeldAtWatermark()).toBe(false);
  });

  it("issues NO query at exactly the watermark, and reports the hold", async () => {
    // STRICTLY BELOW is the comparison, so the boundary value itself holds.
    // This is the edge the whole derivation is stated at: at the watermark there
    // is room for one measured burst plus one page, and not a page more.
    const record = newRecord();
    const outcome = await runScanProducer({
      sdk: onePage([item("a-1")], true, record),
      db: fx.db,
      queue: fakeQueue([SCAN_BACKPRESSURE_WATERMARK]),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(record.executes).toBe(0);
    expect(outcome.stop).toBe("held");
    expect(outcome.heldAtWatermark).toBe(true);
    // REPORTED OUT OF BAND, not only on the return value. `getScanStatus` is a
    // separate RPC from whatever drives the walk, and from outside the backend a
    // scan holding at the watermark and a scan whose QuickJS thread is blocked
    // look identical — both show counters that stop advancing. Without this
    // reader "Waiting for the analysis queue" can never render and every healthy
    // hold falls through to the stall marker (06-UI-SPEC § "The scan status
    // payload — required fields").
    expect(isHeldAtWatermark()).toBe(true);
  });

  it("issues NO query ABOVE the watermark either", async () => {
    const record = newRecord();
    const outcome = await runScanProducer({
      sdk: onePage([item("a-1")], true, record),
      db: fx.db,
      queue: fakeQueue([SCAN_BACKPRESSURE_WATERMARK + 1]),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(record.executes).toBe(0);
    expect(outcome.stop).toBe("held");
    expect(isHeldAtWatermark()).toBe(true);
  });

  it("resumes on its own the moment depth falls back below, with no operator action", async () => {
    // The hold is a WAIT, not a stop. The first depth read is at the watermark,
    // the next is below it, and the producer walks without anybody restarting
    // it.
    const record = newRecord();
    const outcome = await runScanProducer({
      sdk: onePage([item("a-1")], false, record),
      db: fx.db,
      queue: fakeQueue([
        SCAN_BACKPRESSURE_WATERMARK,
        SCAN_BACKPRESSURE_WATERMARK - 1,
      ]),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(record.executes).toBe(1);
    expect(outcome.stop).toBe("completed");
    // The flag is true EXACTLY WHILE the producer is withholding. It resumed, so
    // it is not withholding, so it reads false.
    expect(outcome.heldAtWatermark).toBe(false);
    expect(isHeldAtWatermark()).toBe(false);
  });

  it("cannot displace a live entry: a full measured burst still fits on top of a full page", async () => {
    // ===================================================================
    // THE PROPERTY THE WHOLE DESIGN EXISTS FOR, EXECUTED.
    // ===================================================================
    // `BoundedQueue.offer()` drops the OLDEST entry at cap, and during a
    // backfill the oldest entries are the responses the operator is looking at
    // right now. So this case fills the queue to one below the watermark with
    // LIVE entries, lets the producer add a full page on top, and then delivers
    // a full MEASURED live burst — the 499-in-20 ms burst SPIKE-03 recorded,
    // rounded to EVENTS_DELIVERED_UNDER_BLOCK. Nothing may be dropped, and the
    // FIRST live entry must still be at the head.
    const queue = new BoundedQueue(QUEUE_CAP);
    for (let i = 0; i < SCAN_BACKPRESSURE_WATERMARK - 1; i += 1) {
      queue.offer({ id: `live-${String(i)}`, bytes: 10, kind: "js" });
    }
    expect(queue.depth).toBe(SCAN_BACKPRESSURE_WATERMARK - 1);

    const page = Array.from({ length: SCAN_PAGE_SIZE }, (_unused, i) =>
      item(`retro-${String(i)}`),
    );
    const record = newRecord();

    const outcome = await runScanProducer({
      sdk: fakeQuerySdk([page, page, page], true, record),
      db: fx.db,
      queue,
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    // One page went in, then the producer held rather than transferring another.
    expect(record.executes).toBe(1);
    expect(outcome.stop).toBe("held");
    expect(queue.depth).toBe(SCAN_BACKPRESSURE_WATERMARK - 1 + SCAN_PAGE_SIZE);

    // The burst lands on top of everything the scan just added.
    for (let i = 0; i < EVENTS_DELIVERED_UNDER_BLOCK; i += 1) {
      queue.offer({ id: `burst-${String(i)}`, bytes: 10, kind: "js" });
    }

    expect(
      queue.overflowCount,
      "the queue dropped an entry after a scan page plus one measured live " +
        "burst. That drop is a LIVE response the operator was looking at, " +
        "silently discarded to make room for traffic from months ago — which " +
        "is the entire failure D-01's watermark exists to prevent.",
    ).toBe(0);
    expect(
      counters.queueOverflow,
      "counters.queueOverflow moved during a backfill. It is the named warning " +
        "sign for T-06-13.",
    ).toBe(0);
    // The head is still the OLDEST live entry — drop-oldest never fired.
    expect(queue.take()?.id).toBe("live-0");
  });
});

// ===========================================================================
// 4. THE SKIP-DONE READ — D-03, one bounded statement per page
// ===========================================================================

describe("the skip-done read is ONE bounded statement per page (D-03)", () => {
  it("issues exactly one skip-done read per page, whatever the page contains", async () => {
    // The whole point of D-03. The tracer asked once PER ITEM; a 40,000-request
    // backfill at twenty items a page is 40,000 reads instead of 2,000.
    const log: DbCall[] = [];
    const record = newRecord();
    const pages = [
      [item("p1-a"), item("p1-b"), item("p1-c")],
      [item("p2-a"), item("p2-b")],
    ];

    await runScanProducer({
      sdk: fakeQuerySdk(pages, false, record),
      db: recordingDb(fx.db, log),
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(skipDoneCalls(log).length).toBe(2);
  });

  it("binds EXACTLY SCAN_PAGE_SIZE request ids, padding a short page", async () => {
    // Every statement in this package is a complete literal, so the placeholder
    // count is fixed at SCAN_PAGE_SIZE and a short page fills the unused slots
    // rather than rewriting the statement.
    const log: DbCall[] = [];
    const record = newRecord();

    await runScanProducer({
      sdk: onePage([item("a-1"), item("a-2"), item("a-3")], false, record),
      db: recordingDb(fx.db, log),
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    const call = skipDoneCalls(log)[0];
    expect(call).toBeDefined();
    // project_id, then the id list, then the subquery's three binds.
    const ids = call.args.slice(1, 1 + SCAN_PAGE_SIZE);
    expect(ids.slice(0, 3)).toEqual(["a-1", "a-2", "a-3"]);
    expect(
      ids.filter((v) => v === ""),
      "a short page did not pad the unused bind slots with the empty string.",
    ).toHaveLength(SCAN_PAGE_SIZE - 3);
  });

  it("the empty-string pad cannot silence a real item", async () => {
    // The pad's safety argument, executed rather than asserted in a comment.
    // `observations.request_id` is NOT NULL and a real Caido request id is never
    // empty — so even a stored observation whose request id IS empty, carried to
    // a `done` analysis, matches only the pad and skips nothing.
    seedAnalysis(fx, PROJECT, "", "d".repeat(64), "done");
    const record = newRecord();
    const queue = new BoundedQueue(QUEUE_CAP);

    await runScanProducer({
      sdk: onePage([item("a-1"), item("a-2"), item("a-3")], false, record),
      db: fx.db,
      queue,
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(queue.depth).toBe(3);
    const row = await getActiveScan(fx.db, PROJECT);
    expect(row?.skipped_done).toBe(0);
  });

  it("skips only FINISHED work — a partial or failed analysis is RE-OFFERED", async () => {
    // 06-UI-SPEC.md's `Skipped` help text is the contract: "Anything that was
    // partial or failed is re-offered, so a scan repairs earlier failures rather
    // than cementing them." Derived from the shipped vocabulary rather than
    // restated — the skip state is the terminal state that is NOT degraded.
    expect(TERMINAL_SCAN_STATES.filter((s) => isDegradedScanState(s))).toEqual([
      "partial",
      "failed",
    ]);

    seedAnalysis(fx, PROJECT, "done-1", "a".repeat(64), "done");
    seedAnalysis(fx, PROJECT, "partial-1", "b".repeat(64), "partial");
    seedAnalysis(fx, PROJECT, "failed-1", "c".repeat(64), "failed");

    const record = newRecord();
    const queue = new BoundedQueue(QUEUE_CAP);
    await runScanProducer({
      sdk: onePage(
        [item("done-1"), item("partial-1"), item("failed-1")],
        false,
        record,
      ),
      db: fx.db,
      queue,
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(queue.depth).toBe(2);
    const row = await getActiveScan(fx.db, PROJECT);
    expect(row?.skipped_done).toBe(1);
    expect(row?.admitted).toBe(2);
    expect(counters.retro.skippedDone).toBe(1);
  });

  it("does not skip another project's finished analysis", async () => {
    // The skip read is project-scoped like every other read in this package. A
    // digest finished in project B must not silence a scan in project A.
    seedAnalysis(fx, "other", "done-x", "c".repeat(64), "done");

    const record = newRecord();
    const queue = new BoundedQueue(QUEUE_CAP);
    await runScanProducer({
      sdk: onePage([item("done-x")], false, record),
      db: fx.db,
      queue,
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    const row = await getActiveScan(fx.db, PROJECT);
    expect(row?.skipped_done).toBe(0);
    expect(row?.admitted).toBe(1);
  });
});

// ===========================================================================
// 5. THE LOOP'S OWN PROPERTIES — the yield and the re-entrancy flag (Pitfall 3)
// ===========================================================================

describe("the loop yields and cannot be entered twice", () => {
  it("awaits a yield once per page — four pages, four yields", async () => {
    // Spied on the PRIMITIVE rather than on an injected seam. SPIKE-02 measured
    // `setImmediate` and `Promise.resolve()` scoring IDENTICALLY to a fully
    // blocking loop on this runtime, so asserting "it awaited something" would
    // pass for two spellings that starve the one thread exactly as hard as no
    // yield at all. `setTimeout(fn, 0)` is the only primitive that yields here.
    const spy = vi.spyOn(globalThis, "setTimeout");
    const record = newRecord();
    const pages = [[item("p1")], [item("p2")], [item("p3")], [item("p4")]];

    await runScanProducer({
      sdk: fakeQuerySdk(pages, false, record),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(record.executes).toBe(4);
    expect(
      spy.mock.calls.filter((c) => c[1] === 0).length,
      "a walk of four pages did not yield four times. A long serial job that " +
        "never yields is Pitfall 3 — the frozen-looking page an operator reads " +
        "as a crash, on a runtime with one thread and no worker threads.",
    ).toBe(4);
  });

  it("refuses a SECOND concurrent entry, and that entry transfers no page", async () => {
    // The in-process half of the one-scan-at-a-time invariant; the durable half
    // is the partial UNIQUE index on `(project_id) WHERE state = 'running'`.
    const first = newRecord();
    const second = newRecord();

    const walk = runScanProducer({
      sdk: fakeQuerySdk([[item("a-1")], [item("a-2")]], false, first),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    const reentry = await runScanProducer({
      sdk: onePage([item("b-1")], false, second),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(reentry.stop).toBe("busy");
    expect(second.executes).toBe(0);

    const outcome = await walk;
    expect(outcome.stop).toBe("completed");
    expect(first.executes).toBe(2);
  });

  it("clears the re-entrancy flag on the FAILING path too", async () => {
    // In a `finally`, not after the loop: every exit from the walk is a
    // `return`, so a reset placed after the loop would leave the producer
    // permanently busy the first time `execute()` threw.
    const base = makeFakeSdk();
    const query = {
      filter: () => query,
      descending: () => query,
      first: () => query,
      execute: () => Promise.reject(new Error("boom")),
    };
    const failing = await runScanProducer({
      sdk: { ...base, requests: { ...base.requests, query: () => query } },
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });
    expect(failing.stop).toBe("failed");

    const record = newRecord();
    const after = await runScanProducer({
      sdk: onePage([item("a-1")], false, record),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });
    expect(after.stop).not.toBe("busy");
    expect(record.executes).toBe(1);
  });
});

// ===========================================================================
// 6. ATTRIBUTION — every increment on this path is a RETRO increment (D-02)
// ===========================================================================

describe("nothing on the retro path touches a live counter (D-02)", () => {
  it("counts admissions, rejections and skips into counters.retro alone", async () => {
    seedAnalysis(fx, PROJECT, "done-1", "a".repeat(64), "done");
    const record = newRecord();

    await runScanProducer({
      sdk: onePage(
        [item("done-1"), item("ok-1"), item("no-1", { code: 404 })],
        false,
        record,
      ),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(counters.retro.pagesWalked).toBe(1);
    expect(counters.retro.seen).toBe(3);
    expect(counters.retro.admitted).toBe(1);
    expect(counters.retro.skippedDone).toBe(1);
    expect(counters.retro.queued).toBe(1);
    expect(counters.retro.rejected.status).toBe(1);

    // THE LIVE NUMBERS ARE UNTOUCHED. A backfill that moved them would make
    // OBS-01's drop count and reject reasons stop describing live proxying.
    expect(counters.admitted).toBe(0);
    expect(counters.rejected.status).toBe(0);
    expect(counters.proxiedResponsesObserved).toBe(0);
  });

  it("counts a response-less item as reloadNoResponse — neither admitted nor rejected", async () => {
    // `RequestsConnectionItem.response` is optional and a stored request with no
    // response is a real shape. It is NOT a rejection: `admit.ts`'s reason union
    // is closed and describes a RESPONSE, and there is no response to describe.
    const record = newRecord();
    const queue = new BoundedQueue(QUEUE_CAP);

    await runScanProducer({
      sdk: onePage([item("no-resp", { noResponse: true })], false, record),
      db: fx.db,
      queue,
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(queue.depth).toBe(0);
    expect(counters.retro.reloadNoResponse).toBe(1);
    expect(counters.retro.admitted).toBe(0);
    for (const value of Object.values(counters.retro.rejected)) {
      expect(value).toBe(0);
    }

    const row = await getActiveScan(fx.db, PROJECT);
    expect(row?.seen).toBe(1);
    expect(row?.admitted).toBe(0);
    expect(row?.rejected).toBe(0);
  });
});

// ===========================================================================
// 7. THE CONSTANTS ARE IMPORTED, NEVER RESTATED
// ===========================================================================

describe("producer.ts holds no local copy of a tunable number", () => {
  it("imports the page size and the watermark instead of writing them out", () => {
    // A literal here would keep passing while `thresholds.ts` moved underneath
    // it — the exact drift the whole import-and-assert contract exists to close.
    // Read from SOURCE rather than inferred from behaviour, because behaviour
    // cannot tell a matching literal from an import.
    const src = readFileSync(PRODUCER_FILE, "utf8");
    const code = src
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("*"))
      .filter((line) => !line.trimStart().startsWith("//"))
      .join("\n");

    expect(code).toContain("SCAN_BACKPRESSURE_WATERMARK");
    expect(code).toContain("SCAN_PAGE_SIZE");
    expect(
      code.includes(String(SCAN_PAGE_SIZE)),
      `packages/backend/src/scan/producer.ts contains the literal ${String(SCAN_PAGE_SIZE)} ` +
        "outside a comment — the page size is an imported identifier, never a copy.",
    ).toBe(false);
    expect(
      code.includes(String(SCAN_BACKPRESSURE_WATERMARK)),
      `packages/backend/src/scan/producer.ts contains the literal ` +
        `${String(SCAN_BACKPRESSURE_WATERMARK)} outside a comment — the watermark is an ` +
        "imported identifier, never a copy.",
    ).toBe(false);
  });
});
