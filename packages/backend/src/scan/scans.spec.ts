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
  completeScan,
  discardScan,
  getActiveScan,
  getScan,
  listScans,
  pauseScan,
  resumeScan,
  SCAN_LIST_DEFAULT_LIMIT,
  startScan,
  suspendOnEpochChange,
  suspendRunningOnInit,
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

describe("the transitions — every guard INSIDE its own statement (D-04, D-10, D-11)", () => {
  let fx: SqliteFixture;

  beforeEach(async () => {
    fx = createFixtureDb();
    const report = await migrate(fx.db);
    expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  });

  afterEach(() => {
    fx.close();
  });

  it("pauses a RUNNING scan and keeps its position — a pause, never a cancel", async () => {
    await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
    await advanceScan(fx.db, PROJECT, "s1", {
      lastRequestId: "9001",
      lastCursor: "cursor-9001",
      lastCreatedAt: CAPTURED_AT,
      seen: 20,
      admitted: 3,
      skippedDone: 0,
      rejected: 17,
      queued: 3,
      nowMs: NOW + 1,
    });

    const paused = await pauseScan(fx.db, PROJECT, "s1", NOW + 2);
    expect(paused.ok, paused.ok ? "" : paused.error).toBe(true);
    expect(paused.ok && paused.changes).toBe(1);
    // THE POSITION IS UNTOUCHED. That is the whole of D-10 — a mis-clicked pause
    // on a multi-hour backfill costs nothing — and it is what makes the pause
    // control safe to put one click away from the operator.
    expect(paused.ok && paused.row?.state).toBe("suspended");
    expect(paused.ok && paused.row?.suspend_reason).toBe("operator_paused");
    expect(paused.ok && paused.row?.last_request_id).toBe("9001");
    expect(paused.ok && paused.row?.last_cursor).toBe("cursor-9001");
    expect(paused.ok && paused.row?.last_created_at).toBe(CAPTURED_AT);
  });

  it("a pause against an ALREADY-suspended row reports zero changes and does not throw", async () => {
    // An operator double-click, not an error — and the second call must not
    // rewrite `suspend_reason`, because a pause that overwrote `project_changed`
    // would erase the only record of why the scan actually stopped.
    await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
    await suspendOnEpochChange(fx.db, PROJECT, "s1", 7, NOW + 1);

    const paused = await pauseScan(fx.db, PROJECT, "s1", NOW + 2);
    expect(paused.ok, paused.ok ? "" : paused.error).toBe(true);
    expect(paused.ok && paused.changes).toBe(0);
    expect(paused.ok && paused.row?.suspend_reason).toBe("project_changed");
  });

  it("resumes a SUSPENDED scan and clears the reason; a terminal row does not move", async () => {
    await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
    await pauseScan(fx.db, PROJECT, "s1", NOW + 1);

    const resumed = await resumeScan(fx.db, PROJECT, "s1", NOW + 2);
    expect(resumed.ok && resumed.changes).toBe(1);
    expect(resumed.ok && resumed.row?.state).toBe("running");
    // CLEARED, not left behind: a running scan still carrying `operator_paused`
    // would render its suspension sentence under a badge saying it is scanning.
    expect(resumed.ok && resumed.row?.suspend_reason).toBeNull();

    await completeScan(fx.db, PROJECT, "s1", NOW + 3);
    const again = await resumeScan(fx.db, PROJECT, "s1", NOW + 4);
    expect(again.ok && again.changes).toBe(0);
    expect(again.ok && again.row?.state).toBe("completed");
  });

  it("completes a RUNNING scan and REFUSES to complete a suspended one", async () => {
    // A suspended scan stopped somewhere in the middle and kept its place.
    // Completing it would file an unfinished backfill under **Finished** and
    // lose the operator's cursor behind a word that says there is nothing left
    // to do.
    await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
    await pauseScan(fx.db, PROJECT, "s1", NOW + 1);

    const refused = await completeScan(fx.db, PROJECT, "s1", NOW + 2);
    expect(refused.ok && refused.changes).toBe(0);
    expect(refused.ok && refused.row?.state).toBe("suspended");

    await resumeScan(fx.db, PROJECT, "s1", NOW + 3);
    const done = await completeScan(fx.db, PROJECT, "s1", NOW + 4);
    expect(done.ok && done.changes).toBe(1);
    expect(done.ok && done.row?.state).toBe("completed");
    expect(done.ok && done.row?.finished_at).toBe(NOW + 4);
  });

  it("DISCARD destroys the position and nothing else", async () => {
    await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
    await advanceScan(fx.db, PROJECT, "s1", {
      lastRequestId: "9001",
      lastCursor: "cursor-9001",
      lastCreatedAt: CAPTURED_AT,
      seen: 20,
      admitted: 4,
      skippedDone: 1,
      rejected: 15,
      queued: 4,
      nowMs: NOW + 1,
    });

    const discarded = await discardScan(fx.db, PROJECT, "s1", NOW + 2);
    expect(discarded.ok, discarded.ok ? "" : discarded.error).toBe(true);
    expect(discarded.ok && discarded.changes).toBe(1);
    expect(discarded.ok && discarded.row?.state).toBe("discarded");
    // THE POSITION IS GONE — `''` is the same "no boundary" value a fresh row
    // carries, and the cursor is NULL.
    expect(discarded.ok && discarded.row?.last_request_id).toBe("");
    expect(discarded.ok && discarded.row?.last_cursor).toBeNull();
    // AND NOTHING ELSE IS. The history row renders "Discarded · {n} seen ·
    // reached {date}" from these, and the artifacts and observations the scan
    // produced are not this table's to touch at all.
    expect(discarded.ok && discarded.row?.seen).toBe(20);
    expect(discarded.ok && discarded.row?.admitted).toBe(4);
    expect(discarded.ok && discarded.row?.last_created_at).toBe(CAPTURED_AT);
  });

  it("discards from EITHER active state, and never rewrites a terminal row", async () => {
    await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
    await pauseScan(fx.db, PROJECT, "s1", NOW + 1);
    expect(
      (await discardScan(fx.db, PROJECT, "s1", NOW + 2)).ok &&
        (await getScan(fx.db, PROJECT, "s1"))?.state,
    ).toBe("discarded");

    await startScan(fx.db, PROJECT, "s2", "", 0, NOW + 10);
    await completeScan(fx.db, PROJECT, "s2", NOW + 11);
    // Moving a `completed` row into `discarded` would be a rewrite of what
    // happened, on the one list whose whole job is to say what happened.
    const terminal = await discardScan(fx.db, PROJECT, "s2", NOW + 12);
    expect(terminal.ok && terminal.changes).toBe(0);
    expect(terminal.ok && terminal.row?.state).toBe("completed");
  });

  it("the EPOCH GUARD is a predicate: a matching epoch changes nothing", async () => {
    await startScan(fx.db, PROJECT, "s1", "", 4, NOW);

    const same = await suspendOnEpochChange(fx.db, PROJECT, "s1", 4, NOW + 1);
    expect(same.ok, same.ok ? "" : same.error).toBe(true);
    expect(same.ok && same.changes).toBe(0);
    expect(same.ok && same.row?.state).toBe("running");
    expect(same.ok && same.row?.suspend_reason).toBeNull();

    const moved = await suspendOnEpochChange(fx.db, PROJECT, "s1", 5, NOW + 2);
    expect(moved.ok && moved.changes).toBe(1);
    expect(moved.ok && moved.row?.state).toBe("suspended");
    expect(moved.ok && moved.row?.suspend_reason).toBe("project_changed");
    // NOTHING WAS WRITTEN UNDER THE NEW PROJECT and the scan kept its place in
    // the old one — the row's own epoch is untouched, which is what a resume
    // from the original project needs in order to be possible.
    expect(moved.ok && moved.row?.epoch).toBe(4);
  });

  it("the STARTUP SWEEP moves every running row for the project in ONE statement", async () => {
    // THE ACCEPTANCE CRITERION ASKED FOR TWO RUNNING ROWS IN ONE PROJECT. That
    // shape is UNREACHABLE by construction and the reason is this plan's own
    // one-at-a-time invariant: `idx_scans_one_running` is a partial UNIQUE index
    // on `(project_id) WHERE state = 'running'`, so the second insert is refused
    // by the driver — including a raw one. Two projects is the reachable form of
    // the same claim, and it also exercises the scoping the sweep needs.
    await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
    await startScan(fx.db, "other", "s-other", "", 0, NOW);
    await advanceScan(fx.db, PROJECT, "s1", {
      lastRequestId: "9001",
      lastCursor: "cursor-9001",
      lastCreatedAt: CAPTURED_AT,
      seen: 20,
      admitted: 1,
      skippedDone: 0,
      rejected: 19,
      queued: 1,
      nowMs: NOW + 1,
    });

    const swept = await suspendRunningOnInit(fx.db, PROJECT, NOW + 2);
    expect(swept.ok, swept.ok ? "" : swept.error).toBe(true);
    expect(swept.ok && swept.changes).toBe(1);

    const row = await getScan(fx.db, PROJECT, "s1");
    expect(row?.state).toBe("suspended");
    expect(row?.suspend_reason).toBe("process_restarted");
    // THE CURSOR IS NULLED AND THE REQUEST ID IS NOT. A cursor's lifetime across
    // a process restart is NOT MEASURED (O-04); `last_request_id` is the
    // re-derivable position that does not depend on that answer.
    expect(row?.last_cursor).toBeNull();
    expect(row?.last_request_id).toBe("9001");

    // SCOPED. The other project's running row is untouched by this project's
    // sweep — one SQLite file serves every Caido project (T-01-20).
    expect((await getScan(fx.db, "other", "s-other"))?.state).toBe("running");
    expect((await suspendRunningOnInit(fx.db, "other", NOW + 3)).ok).toBe(true);
    expect((await getScan(fx.db, "other", "s-other"))?.state).toBe("suspended");
  });

  it("the sweep NEVER auto-resumes — a second call is a no-op, not a restart", async () => {
    await startScan(fx.db, PROJECT, "s1", "", 0, NOW);
    await suspendRunningOnInit(fx.db, PROJECT, NOW + 1);
    const again = await suspendRunningOnInit(fx.db, PROJECT, NOW + 2);
    expect(again.ok && again.changes).toBe(0);
    expect((await getScan(fx.db, PROJECT, "s1"))?.state).toBe("suspended");
  });

  it("`getScan` answers `undefined` for another project's scan id", async () => {
    await startScan(fx.db, "other", "s-other", "", 0, NOW);
    expect(await getScan(fx.db, PROJECT, "s-other")).toBeUndefined();
    expect((await getScan(fx.db, "other", "s-other"))?.scan_id).toBe("s-other");
  });
});

describe("`listScans` — bounded at READ, with every suspended scan pinned in (U6-1)", () => {
  let fx: SqliteFixture;

  /** Seed one row directly. The transitions are asserted above; these cases are
   *  about the STATEMENT, and driving two hundred rows through `startScan` would
   *  be two hundred inserts to assert an ORDER BY. */
  function seedScan(
    scanId: string,
    state: string,
    startedAt: number,
    projectId: string = PROJECT,
  ): void {
    fx.raw
      .prepare(
        "INSERT INTO scans (project_id, scan_id, state, suspend_reason, operator_filter, epoch, " +
          "last_request_id, last_cursor, last_created_at, pages_walked, seen, admitted, " +
          "skipped_done, rejected, queued, started_at, updated_at, finished_at) " +
          "VALUES (?, ?, ?, NULL, '', 0, '', NULL, NULL, 0, 0, 0, 0, 0, 0, ?, ?, NULL)",
      )
      .run(projectId, scanId, state, startedAt, startedAt);
  }

  beforeEach(async () => {
    fx = createFixtureDb();
    const report = await migrate(fx.db);
    expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  });

  afterEach(() => {
    fx.close();
  });

  it("breaks a `started_at` tie on `scan_id DESC`, identically across two reads", async () => {
    // `started_at` alone is not a total order. Without the secondary key SQLite
    // is free to return tied rows in whatever order the scan produced, which can
    // differ between two runs and between a database and a re-created copy of it.
    seedScan("s-a", "completed", NOW);
    seedScan("s-b", "completed", NOW);
    seedScan("s-c", "completed", NOW);

    const first = (await listScans(fx.db, PROJECT)).map((r) => r.scan_id);
    const second = (await listScans(fx.db, PROJECT)).map((r) => r.scan_id);
    expect(first).toEqual(["s-c", "s-b", "s-a"]);
    expect(second).toEqual(first);
  });

  it("is scoped to ONE project", async () => {
    seedScan("s-mine", "completed", NOW);
    seedScan("s-theirs", "completed", NOW + 1, "other");
    expect((await listScans(fx.db, PROJECT)).map((r) => r.scan_id)).toEqual([
      "s-mine",
    ]);
  });

  it("PINS a suspended scan into the window even when the bound would cut it", async () => {
    // The case that fails without the `(state = 'suspended') DESC` term, rather
    // than a reading of the statement text. A suspended scan's row IS its
    // cursor — D-26 exempts the state from the retention age bound for exactly
    // that reason — so a suspended row hidden below a display cap is an
    // operator's unfinished work behind a number nobody chose deliberately.
    seedScan("s-suspended", "suspended", NOW - 1_000_000);
    for (let i = 0; i <= SCAN_LIST_DEFAULT_LIMIT; i += 1) {
      seedScan(`s-newer-${String(i).padStart(4, "0")}`, "completed", NOW + i);
    }

    const rows = await listScans(fx.db, PROJECT);
    expect(rows).toHaveLength(SCAN_LIST_DEFAULT_LIMIT);
    expect(rows[0]?.scan_id).toBe("s-suspended");
    expect(rows.map((r) => r.scan_id)).toContain("s-suspended");
  });

  it("CLAMPS a caller's limit down to the bound — the RPC cannot widen it", async () => {
    for (let i = 0; i <= SCAN_LIST_DEFAULT_LIMIT + 4; i += 1) {
      seedScan(`s-${String(i).padStart(4, "0")}`, "completed", NOW + i);
    }

    expect(
      await listScans(fx.db, PROJECT, SCAN_LIST_DEFAULT_LIMIT * 10),
    ).toHaveLength(SCAN_LIST_DEFAULT_LIMIT);
    // A caller may only LOWER the ceiling.
    expect(await listScans(fx.db, PROJECT, 3)).toHaveLength(3);
    // Zero, negative and non-finite fall back to the default rather than being
    // passed through: `Number("")` is 0, which SQLite honours as "no rows" and
    // which would silently show the operator an empty scan history.
    expect(await listScans(fx.db, PROJECT, 0)).toHaveLength(
      SCAN_LIST_DEFAULT_LIMIT,
    );
    expect(await listScans(fx.db, PROJECT, -1)).toHaveLength(
      SCAN_LIST_DEFAULT_LIMIT,
    );
    expect(await listScans(fx.db, PROJECT, Number.NaN)).toHaveLength(
      SCAN_LIST_DEFAULT_LIMIT,
    );
  });

  it("answers an empty list for a project that has never run a scan", async () => {
    expect(await listScans(fx.db, PROJECT)).toEqual([]);
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
