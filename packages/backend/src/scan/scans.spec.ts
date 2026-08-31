// packages/backend/src/scan/scans.spec.ts — two of the retroactive scan's
// backend layers: the filter composer and the `scans` table (FIND-03, FIND-04).
//
// The third layer, the producer, moved to `scan/producer.spec.ts` when plan
// 06-03 turned it from one page into a loop. See the note at the foot of this
// file for why it was here and why it left.
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
// THE PRODUCER MOVED OUT (plan 06-03)
// ---------------------------------------------------------------------------
//
// `runScanProducer`'s cases live in `packages/backend/src/scan/producer.spec.ts`
// as of plan 06-03. They were here because plan 06-01's producer was ONE page,
// and a one-page walk's interesting claim spans the filter, the table and the
// queue — splitting it then would have left each half asserted against a mock of
// the other. That claim is still asserted end to end, against the same real
// modules; it simply moved.
//
// What changed is that the producer became a LOOP, with properties no other
// module here has: a watermark it holds at, a yield between pages, a flag that
// refuses a second entry. Each needs its own fixture shape, and keeping them in
// this file would have meant a `beforeEach` neither half wanted.
