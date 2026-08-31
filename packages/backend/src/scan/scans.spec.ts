// packages/backend/src/scan/scans.spec.ts — the retroactive scan's three
// backend layers: the filter composer, the `scans` table and the one-page
// producer (FIND-03, FIND-04).
//
// ===========================================================================
// WHY ALL THREE LIVE IN ONE SPEC FILE
// ===========================================================================
// They are one vertical slice and they are asserted as one. The producer's
// interesting property is not "it called `execute()`" — it is that ONE page
// walked through the SHIPPED admission gate lands exactly one entry in the
// SHIPPED queue and moves the persisted position by the right amounts. That
// claim spans all three modules, and splitting it across three files would
// leave each half of it asserted against a mock of the other half.
//
// ===========================================================================
// THE FIXTURE'S HONEST LIMIT CARRIES OVER
// ===========================================================================
// `sqlite-fixture.ts` is single-connection and therefore CANNOT reproduce the
// pool-affinity failure mode. Everything asserted below is schema, statement
// and counter CORRECTNESS. Nothing here proves anything about connection
// affinity or transaction stranding, and no assertion should be read as if it
// did.

import {
  isDegradedScanState,
  SCAN_KIND_CLAUSE,
  TERMINAL_SCAN_STATES,
} from "@defminer/engine/contract";
import { BoundedQueue } from "@defminer/engine/queue";
import { QUEUE_CAP, SCAN_PAGE_SIZE } from "@defminer/engine/thresholds";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  makeFakeRequest,
  makeFakeResponse,
  makeFakeSdk,
} from "../../test/fixtures/fake-sdk";
import type { SqliteFixture } from "../../test/fixtures/sqlite-fixture";
import { createFixtureDb } from "../../test/fixtures/sqlite-fixture";
import { DETECTOR_CORPUS_VERSION } from "../store/analyses";
import { migrate } from "../store/migrations";

import { composeScanFilter } from "./filter";
import type { ScanPageItem } from "./producer";
import { runScanProducer } from "./producer";
import {
  advanceScan,
  getActiveScan,
  SCAN_LIST_DEFAULT_LIMIT,
  startScan,
} from "./scans";

/**
 * The composed filter's TOP-LEVEL terms.
 *
 * A naive `split(" AND ")` is wrong here and the reason is worth stating:
 * `SCAN_KIND_CLAUSE` contains its own ` AND ` — the 2xx bound is joined to the
 * kind alternation inside the clause — so a flat split reports four terms for a
 * two-term composition. Depth counting is what makes "how many clauses did
 * DefMiner join" a question about the composition rather than about the text.
 */
function topLevelTerms(composed: string): string[] {
  const terms: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < composed.length; i += 1) {
    const ch = composed[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    else if (depth === 0 && composed.startsWith(" AND ", i)) {
      terms.push(composed.slice(start, i));
      i += 4;
      start = i + 1;
    }
  }
  terms.push(composed.slice(start));
  return terms.map((t) => t.trim()).filter((t) => t.length > 0);
}

const PROJECT = "p1";
const NOW = 1_756_000_000_000;

/** A capture date well before the fake clock, so "the position came from the
 *  ITEM and not from `Date.now()`" is a claim the numbers can carry. */
const CAPTURED_AT = 1_723_600_000_000; // 14 Aug 2024, in ms

describe("composeScanFilter — the ONLY producer of a scan filter string (O-06, D-05)", () => {
  it("composes ONE parenthesised term on a first page, never an empty `()`", () => {
    // A scan that has not walked yet has `last_request_id = ''`, so there is no
    // position clause. Emitting `(<kind>) AND ()` instead would be a syntax
    // error the operator would meet as an unexplained failure on the first
    // press of Start scan.
    expect(composeScanFilter("", "")).toBe(`(${SCAN_KIND_CLAUSE})`);
    expect(composeScanFilter("", "")).not.toContain("()");
  });

  it("adds the position clause as a SECOND term once the walk has a boundary", () => {
    expect(composeScanFilter("row.id.lt:9001", "")).toBe(
      `(${SCAN_KIND_CLAUSE}) AND (row.id.lt:9001)`,
    );
  });

  it("puts the OPERATOR's clause LAST, and that order is the mitigation", () => {
    // T-06-01. HTTPQL has `//` and `/* */` comments. An operator clause placed
    // BEFORE DefMiner's would comment DefMiner's narrowing away — a widening,
    // which is exactly what D-05 forbids. Placed last, the same input comments
    // out only the trailing `)` and produces an unbalanced expression that
    // `execute()` throws on. Fail closed.
    expect(composeScanFilter("row.id.lt:9001", 'req.host.eq:"a.example"')).toBe(
      `(${SCAN_KIND_CLAUSE}) AND (row.id.lt:9001) AND (req.host.eq:"a.example")`,
    );
  });

  it("parenthesises EVERY clause, so the meaning survives either precedence reading", () => {
    // Caido's own reference contradicts itself on AND/OR precedence — one box
    // says AND and OR have "the same priority", the two worked examples below
    // it say AND binds tighter. Full parenthesisation is what makes the
    // composition mean the same thing under either reading. That is a
    // derivation, not a preference.
    const composed = composeScanFilter("row.id.lt:1", 'req.host.eq:"a"');
    const terms = topLevelTerms(composed);
    expect(terms).toHaveLength(3);
    for (const term of terms) {
      expect(term.startsWith("("), `${term} is not parenthesised`).toBe(true);
      expect(term.endsWith(")"), `${term} is not parenthesised`).toBe(true);
    }
  });

  it("skips an absent operator clause entirely rather than emitting an empty term", () => {
    const composed = composeScanFilter("row.id.lt:9001", "");
    expect(topLevelTerms(composed)).toHaveLength(2);
    expect(composed).not.toContain("()");
  });

  it("keeps DefMiner's kind clause FIRST on every shape", () => {
    for (const [position, operator] of [
      ["", ""],
      ["row.id.lt:9001", ""],
      ["row.id.lt:9001", 'req.host.eq:"a.example"'],
      ["", 'req.host.eq:"a.example"'],
    ]) {
      expect(
        composeScanFilter(position ?? "", operator ?? "").startsWith(
          `(${SCAN_KIND_CLAUSE})`,
        ),
        `kind clause is not first for (${String(position)}, ${String(operator)})`,
      ).toBe(true);
    }
  });
});

describe("the `scans` table (D-09, FIND-03)", () => {
  let fx: SqliteFixture;

  beforeEach(async () => {
    fx = createFixtureDb();
    const report = await migrate(fx.db);
    expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  });

  afterEach(() => {
    fx.close();
  });

  it("starts one running scan with every counter at zero and NO position", () => {
    return (async () => {
      const written = await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
      expect(written.ok, written.ok ? "" : written.error).toBe(true);

      const row = await getActiveScan(fx.db, PROJECT);
      expect(row, "the scan was not read back").toBeDefined();
      expect(row?.scan_id).toBe("s1");
      expect(row?.state).toBe("running");
      expect(row?.pages_walked).toBe(0);
      expect(row?.seen).toBe(0);
      expect(row?.admitted).toBe(0);
      expect(row?.skipped_done).toBe(0);
      expect(row?.rejected).toBe(0);
      expect(row?.queued).toBe(0);
      // `''` AND NOT NULL. The position is a re-derivable boundary and the
      // empty string is "no boundary yet"; a NULL would make the column
      // nullable and the first-page case indistinguishable from a lost one.
      expect(row?.last_request_id).toBe("");
      expect(row?.last_cursor).toBeNull();
      expect(row?.last_created_at).toBeNull();
      expect(row?.finished_at).toBeNull();
    })();
  });

  it("a SECOND start on a project that already has a running scan creates no second row", async () => {
    const first = await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
    expect(first.ok).toBe(true);

    // Reported, never thrown: the caller renders this as the one-at-a-time
    // sentence rather than catching something. The partial unique index is
    // what refuses, INSIDE the statement.
    const second = await startScan(fx.db, PROJECT, "s2", "", 0, NOW + 1);
    expect(second.ok).toBe(false);

    const row = await getActiveScan(fx.db, PROJECT);
    expect(row?.scan_id).toBe("s1");

    const all = fx.raw
      .prepare("SELECT scan_id FROM scans WHERE project_id = ?")
      .all(PROJECT) as { scan_id: string }[];
    expect(all).toHaveLength(1);
  });

  it("a REPLAY of the same scan id is a no-op, not a duplicate and not an error", async () => {
    // The caller mints the id, which makes the caller the owner of idempotency:
    // a retry after an ambiguous failure re-presents the same id and lands as
    // `changes: 0`. `ON CONFLICT ... DO NOTHING`, the shape `recordAudit` uses.
    const first = await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
    expect(first.ok && first.changes).toBe(1);

    const replay = await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
    expect(replay.ok, replay.ok ? "" : replay.error).toBe(true);
    expect(replay.ok && replay.changes).toBe(0);
  });

  it("advances the position and EVERY counter in one statement", async () => {
    await startScan(fx.db, PROJECT, "s1", "", 0, NOW);

    const advanced = await advanceScan(fx.db, PROJECT, "s1", {
      lastRequestId: "9001",
      lastCursor: "cursor-9001",
      lastCreatedAt: CAPTURED_AT,
      seen: 20,
      admitted: 3,
      skippedDone: 1,
      rejected: 16,
      queued: 3,
      nowMs: NOW + 1000,
    });
    expect(advanced.ok, advanced.ok ? "" : advanced.error).toBe(true);

    const row = await getActiveScan(fx.db, PROJECT);
    expect(row?.pages_walked).toBe(1);
    expect(row?.seen).toBe(20);
    expect(row?.admitted).toBe(3);
    expect(row?.skipped_done).toBe(1);
    expect(row?.rejected).toBe(16);
    expect(row?.queued).toBe(3);
    expect(row?.last_request_id).toBe("9001");
    expect(row?.last_cursor).toBe("cursor-9001");
    expect(row?.last_created_at).toBe(CAPTURED_AT);
    expect(row?.updated_at).toBe(NOW + 1000);
  });

  it("ACCUMULATES across pages rather than overwriting", async () => {
    await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
    const page = {
      lastCursor: null,
      lastCreatedAt: CAPTURED_AT,
      seen: 20,
      admitted: 2,
      skippedDone: 0,
      rejected: 18,
      queued: 2,
      nowMs: NOW + 1,
    };
    await advanceScan(fx.db, PROJECT, "s1", { ...page, lastRequestId: "9001" });
    await advanceScan(fx.db, PROJECT, "s1", { ...page, lastRequestId: "8981" });

    const row = await getActiveScan(fx.db, PROJECT);
    expect(row?.pages_walked).toBe(2);
    expect(row?.seen).toBe(40);
    expect(row?.admitted).toBe(4);
    // The position is the LATEST boundary, not a sum.
    expect(row?.last_request_id).toBe("8981");
  });

  it("the state guard is INSIDE the statement — a non-running scan does not advance", async () => {
    // `retry.ts`'s design, applied. A caller-side "read the state, then update
    // if it is running" is two operations this driver cannot make one, and the
    // interleaving it permits is a scan suspended between the read and the
    // write being advanced underneath itself.
    await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
    fx.raw
      .prepare(
        "UPDATE scans SET state = 'suspended' WHERE project_id = ? AND scan_id = ?",
      )
      .run(PROJECT, "s1");

    const advanced = await advanceScan(fx.db, PROJECT, "s1", {
      lastRequestId: "9001",
      lastCursor: null,
      lastCreatedAt: CAPTURED_AT,
      seen: 20,
      admitted: 3,
      skippedDone: 0,
      rejected: 17,
      queued: 3,
      nowMs: NOW + 1000,
    });

    // NOT an error — the guard declining is the guard working, and the caller
    // distinguishes it by reading `changes`.
    expect(advanced.ok).toBe(true);
    expect(advanced.ok && advanced.changes).toBe(0);

    const row = fx.raw
      .prepare(
        "SELECT seen, pages_walked FROM scans WHERE project_id = ? AND scan_id = ?",
      )
      .get(PROJECT, "s1") as { seen: number; pages_walked: number };
    expect(row.seen).toBe(0);
    expect(row.pages_walked).toBe(0);
  });

  it("is scoped to ONE project — another project's running scan is invisible here", async () => {
    // One SQLite file serves every Caido project (T-01-20), so an unscoped read
    // is a cross-project disclosure that reports its own project id in every
    // row it should not have returned.
    await startScan(fx.db, "other", "s-other", "", 0, NOW);
    expect(await getActiveScan(fx.db, PROJECT)).toBeUndefined();
    expect((await getActiveScan(fx.db, "other"))?.scan_id).toBe("s-other");
  });

  it("prefers a RUNNING scan over an older suspended one", async () => {
    // A suspended scan is still holding its place, so it is `active` in the
    // sense the surface cares about — but a running one outranks it, and the
    // tie-break is deterministic rather than whatever the scan produced.
    await startScan(fx.db, PROJECT, "s-old", "", 0, NOW);
    fx.raw
      .prepare(
        "UPDATE scans SET state = 'suspended' WHERE project_id = ? AND scan_id = ?",
      )
      .run(PROJECT, "s-old");
    await startScan(fx.db, PROJECT, "s-new", "", 0, NOW + 5000);

    expect((await getActiveScan(fx.db, PROJECT))?.scan_id).toBe("s-new");
  });

  it("ignores a TERMINAL scan when reporting the active one", async () => {
    await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
    fx.raw
      .prepare(
        "UPDATE scans SET state = 'completed' WHERE project_id = ? AND scan_id = ?",
      )
      .run(PROJECT, "s1");
    expect(await getActiveScan(fx.db, PROJECT)).toBeUndefined();
  });

  it("exports its page bound so a spec asserts the CONSTANT, not a copy of its value", () => {
    // `AUDIT_LIST_DEFAULT_LIMIT`'s reasoning, inherited: a test that restated
    // the number would keep passing while the code that matters drifted.
    expect(SCAN_LIST_DEFAULT_LIMIT).toBeGreaterThan(0);
    expect(Number.isInteger(SCAN_LIST_DEFAULT_LIMIT)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// THE PRODUCER
// ---------------------------------------------------------------------------

/** One page item, shaped exactly as `RequestsConnectionItem` is: a cursor, a
 *  request, and a response that MAY be absent. */
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

/** A `sdk.requests.query()` builder that records the filter it was handed and
 *  answers ONE page. Every method returns `this`, exactly as `RequestsQuery`
 *  declares — a fake that returned a fresh object would let a lost `.filter()`
 *  call pass unnoticed. */
function fakeQuerySdk(
  page: ScanPageItem[],
  hasNextPage: boolean,
  record: { filter: string | null; first: number | null; order: string[] },
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
      return Promise.resolve({
        pageInfo: {
          hasNextPage,
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

describe("runScanProducer — one page, through the SHIPPED admission gate (FIND-03, D-01)", () => {
  let fx: SqliteFixture;

  beforeEach(async () => {
    fx = createFixtureDb();
    const report = await migrate(fx.db);
    expect(report.ok, JSON.stringify(report.steps)).toBe(true);
    await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
  });

  afterEach(() => {
    fx.close();
  });

  /** Seed one request as already carried to a FINISHED analysis: an observation
   *  binds the request id to a digest, and that digest has a `done` analysis at
   *  the current corpus version. */
  function seedFinished(requestId: string, sha256: string): void {
    fx.raw
      .prepare(
        "INSERT INTO observations (project_id, sha256, request_id, url, status, content_type, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        PROJECT,
        sha256,
        requestId,
        "https://example.test/x.js",
        200,
        "application/javascript",
        NOW,
      );
    fx.raw
      .prepare(
        "INSERT INTO analyses (project_id, sha256, detector_set_hash, scan_state, started_at, finished_at) VALUES (?, ?, ?, 'done', ?, ?)",
      )
      .run(PROJECT, sha256, DETECTOR_CORPUS_VERSION, NOW, NOW);
  }

  it("walks ONE page: three items in, exactly one queue entry out, every counter moved", async () => {
    // The tracer's whole claim, in one case. One item already finished, one
    // admitted, one rejected — and the counters that result are the ones the
    // Scan tab renders.
    seedFinished("done-1", "a".repeat(64));
    const page = [
      item("done-1"),
      item("ok-1"),
      // A 404 fails `admit()`'s first axis. NOT a 304 here: a 304 is
      // `revalidation` and the push-down's 2xx bound means Caido would not have
      // returned it at all, so asserting on one would be asserting on a shape
      // this path cannot see.
      item("no-1", { code: 404 }),
    ];
    const record = {
      filter: null as string | null,
      first: null as number | null,
      order: [] as string[],
    };
    const queue = new BoundedQueue(QUEUE_CAP);

    const outcome = await runScanProducer({
      sdk: fakeQuerySdk(page, true, record),
      db: fx.db,
      queue,
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW + 60_000,
    });

    expect(outcome.outcome, JSON.stringify(outcome)).toBe("walked");

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
    // scanning traffic from today" for the entire walk — the single most
    // misleading string this surface could produce.
    const page = [item("a-1"), item("a-2", { createdAt: CAPTURED_AT - 5_000 })];
    const record = {
      filter: null as string | null,
      first: null as number | null,
      order: [] as string[],
    };
    const clock = NOW + 60_000;

    await runScanProducer({
      sdk: fakeQuerySdk(page, true, record),
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
    // `updated_at` IS the clock, and that is a different field on purpose:
    // "when did DefMiner last write this row" and "how far back has the walk
    // got" are two questions and one value cannot answer both.
    expect(row?.updated_at).toBe(clock);
  });

  it("composes the filter with NO position clause on the first page", async () => {
    const record = {
      filter: null as string | null,
      first: null as number | null,
      order: [] as string[],
    };
    await runScanProducer({
      sdk: fakeQuerySdk([item("a-1")], true, record),
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
    // below it. `lte` would re-walk one item per page for the whole backfill;
    // anything wider would leave a hole.
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

    const record = {
      filter: null as string | null,
      first: null as number | null,
      order: [] as string[],
    };
    await runScanProducer({
      sdk: fakeQuerySdk([item("8999")], false, record),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(record.filter).toBe(`(${SCAN_KIND_CLAUSE}) AND (row.id.lt:9001)`);
    expect(record.filter).not.toContain("lte");
  });

  it("orders DESCENDING on the request id — a unique integer, so no two items tie", async () => {
    // D-12 and the ordering edge. `created_at` is not a total order: two
    // requests captured in the same millisecond tie, and a tie under a keyset
    // walk is either a repeat or a skip. `id` is unique by construction.
    const record = {
      filter: null as string | null,
      first: null as number | null,
      order: [] as string[],
    };
    await runScanProducer({
      sdk: fakeQuerySdk([item("a-1")], true, record),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });
    expect(record.order).toEqual(["req.id"]);
    expect(record.first).toBe(SCAN_PAGE_SIZE);
  });

  it("counts an item with NO response as seen, and never offers it", async () => {
    // `RequestsConnectionItem.response` is optional. A request Caido stored
    // without a response cannot be admitted — there is nothing to admit — and
    // it is not a rejection either: `admit()` never ran.
    const record = {
      filter: null as string | null,
      first: null as number | null,
      order: [] as string[],
    };
    const queue = new BoundedQueue(QUEUE_CAP);
    await runScanProducer({
      sdk: fakeQuerySdk([item("no-resp", { noResponse: true })], false, record),
      db: fx.db,
      queue,
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(queue.depth).toBe(0);
    const row = await getActiveScan(fx.db, PROJECT);
    expect(row?.seen).toBe(1);
    expect(row?.admitted).toBe(0);
    expect(row?.rejected).toBe(1);
  });

  it("applies Caido's OWN scope with no override (D-07)", async () => {
    // `admit()`'s fifth axis is `sdk.requests.inScope`, and the producer calls
    // the SHIPPED gate unchanged. The push-down is an OPTIMISATION; this is the
    // gate. A widened HTTPQL clause cannot produce a row `admit()` would reject.
    const record = {
      filter: null as string | null,
      first: null as number | null,
      order: [] as string[],
    };
    const queue = new BoundedQueue(QUEUE_CAP);
    const sdk = fakeQuerySdk([item("ok-1")], false, record);

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
  });

  it("reports an EMPTY page as exhausted and leaves the position where it was", async () => {
    const record = {
      filter: null as string | null,
      first: null as number | null,
      order: [] as string[],
    };
    const outcome = await runScanProducer({
      sdk: fakeQuerySdk([], false, record),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(outcome.outcome).toBe("exhausted");
    const row = await getActiveScan(fx.db, PROJECT);
    // NOT advanced. There is no last item to take a boundary from, and writing
    // `pages_walked + 1` for a page that contained nothing would report motion
    // that did not happen on the surface whose whole subject is motion.
    expect(row?.pages_walked).toBe(0);
    expect(row?.last_request_id).toBe("");
  });

  it("does nothing at all when the project has no scan", async () => {
    const record = {
      filter: null as string | null,
      first: null as number | null,
      order: [] as string[],
    };
    const outcome = await runScanProducer({
      sdk: fakeQuerySdk([item("a-1")], true, record),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve("no-such-project"),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(outcome.outcome).toBe("no-scan");
    // The query was never built, so no page was transferred. On a runtime where
    // every page carries full response bodies that is the difference between a
    // no-op and a pull of history.
    expect(record.filter).toBeNull();
  });

  it("refuses to walk under a CHANGED project epoch (D-04)", async () => {
    // The guard value. A scan started under epoch 0 must not keep writing after
    // the operator switched projects — its rows would land in the new project's
    // partition under the old project's filter.
    const record = {
      filter: null as string | null,
      first: null as number | null,
      order: [] as string[],
    };
    const outcome = await runScanProducer({
      sdk: fakeQuerySdk([item("a-1")], true, record),
      db: fx.db,
      queue: new BoundedQueue(QUEUE_CAP),
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 1,
      nowMs: () => NOW,
    });

    expect(outcome.outcome).toBe("epoch-changed");
    expect(record.filter).toBeNull();
  });

  it("answers a VALUE when execute() throws, and writes nothing", async () => {
    // Caido surfaces neither a throw nor a rejection from plugin code, so an
    // uncaught rejection here is invisible — the scan would simply stop with
    // the surface still reading "Scanning". `execute()` throws on an invalid
    // query parameter, which is exactly the fail-closed path T-06-01 designs
    // for.
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

    expect(outcome.outcome).toBe("failed");
    // REDACTED, and bounded. A driver rejection carries the bound parameters
    // and one of them is a URL; `describeError` redacts before it truncates.
    expect(outcome.outcome === "failed" && outcome.error).not.toContain(
      "secret.test",
    );

    const row = await getActiveScan(fx.db, PROJECT);
    expect(row?.pages_walked).toBe(0);
  });

  it("skips only FINISHED work — a partial or failed analysis is re-offered", async () => {
    // 06-UI-SPEC.md's `Skipped` help text is the contract: "Anything that was
    // partial or failed is re-offered, so a scan repairs earlier failures
    // rather than cementing them." Derived from the shipped vocabulary rather
    // than restated — the skip state is the terminal state that is NOT
    // degraded.
    const notSkipped = TERMINAL_SCAN_STATES.filter((s) =>
      isDegradedScanState(s),
    );
    expect(notSkipped).toEqual(["partial", "failed"]);

    fx.raw
      .prepare(
        "INSERT INTO observations (project_id, sha256, request_id, url, status, content_type, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        PROJECT,
        "b".repeat(64),
        "partial-1",
        "https://example.test/x.js",
        200,
        "application/javascript",
        NOW,
      );
    fx.raw
      .prepare(
        "INSERT INTO analyses (project_id, sha256, detector_set_hash, scan_state, started_at) VALUES (?, ?, ?, 'partial', ?)",
      )
      .run(PROJECT, "b".repeat(64), DETECTOR_CORPUS_VERSION, NOW);

    const record = {
      filter: null as string | null,
      first: null as number | null,
      order: [] as string[],
    };
    const queue = new BoundedQueue(QUEUE_CAP);
    await runScanProducer({
      sdk: fakeQuerySdk([item("partial-1")], false, record),
      db: fx.db,
      queue,
      getProjectId: () => Promise.resolve(PROJECT),
      projectEpoch: () => 0,
      nowMs: () => NOW,
    });

    expect(queue.depth).toBe(1);
    const row = await getActiveScan(fx.db, PROJECT);
    expect(row?.skipped_done).toBe(0);
    expect(row?.admitted).toBe(1);
  });

  it("does not skip another project's finished analysis", async () => {
    // The skip read is project-scoped like every other read in this package.
    // A digest finished in project B must not silence a scan in project A.
    fx.raw
      .prepare(
        "INSERT INTO observations (project_id, sha256, request_id, url, status, content_type, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        "other",
        "c".repeat(64),
        "done-x",
        "https://example.test/x.js",
        200,
        "application/javascript",
        NOW,
      );
    fx.raw
      .prepare(
        "INSERT INTO analyses (project_id, sha256, detector_set_hash, scan_state, started_at) VALUES (?, ?, ?, 'done', ?)",
      )
      .run("other", "c".repeat(64), DETECTOR_CORPUS_VERSION, NOW);

    const record = {
      filter: null as string | null,
      first: null as number | null,
      order: [] as string[],
    };
    const queue = new BoundedQueue(QUEUE_CAP);
    await runScanProducer({
      sdk: fakeQuerySdk([item("done-x")], false, record),
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
