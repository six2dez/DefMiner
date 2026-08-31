// packages/backend/src/scan/lifecycle.spec.ts — the retroactive scan's STATE
// MACHINE, end to end, including the two suspensions nobody asked for
// (D-04, D-10, D-11, FIND-03, FIND-04).
//
// ===========================================================================
// WHY THIS IS A SEPARATE FILE FROM `scans.spec.ts`
// ===========================================================================
// `scans.spec.ts` asserts STATEMENTS: that each guard is inside its own
// predicate, that a clamp clamps, that a tie-break breaks ties. Those are
// claims about one write at a time. This file asserts ROUTES — start → advance
// → pause → resume → advance → complete, and the three ways a scan stops
// without the operator touching anything — and a route's interesting property
// is what SURVIVES it. Splitting them keeps each `beforeEach` the shape its own
// half wants, which is the same reason plan 06-03 moved the producer's cases
// out of `scans.spec.ts`.
//
// It sits beside `backend/src/lifecycle.spec.ts` in name deliberately: that file
// owns the PROJECT lifecycle and the epoch semantics this one consumes. The two
// meet at exactly one value — `projectEpoch()` — and this file binds it as a
// number rather than importing the module, because the guard being asserted is
// a SQL predicate and not a call.
//
// ===========================================================================
// THE FIXTURE'S HONEST LIMIT, CARRIED OVER VERBATIM
// ===========================================================================
// `sqlite-fixture.ts` is single-connection and therefore CANNOT reproduce the
// pool-affinity failure mode. Everything below is transition CORRECTNESS.
// Nothing here proves anything about connection affinity or transaction
// stranding, and no assertion should be read as if it did.

import type { SuspendReason } from "@defminer/engine/contract";
import { SUSPEND_REASONS } from "@defminer/engine/contract";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { SqliteFixture } from "../../test/fixtures/sqlite-fixture";
import { createFixtureDb } from "../../test/fixtures/sqlite-fixture";
import { migrate } from "../store/migrations";

import { composeScanFilter, positionClause } from "./filter";
import type { ScanRow } from "./scans";
import {
  advanceScan,
  completeScan,
  discardScan,
  getActiveScan,
  getScan,
  listScans,
  pauseScan,
  resumeScan,
  startScan,
  suspendOnEpochChange,
  suspendRunningOnInit,
} from "./scans";

const PROJECT = "p1";
const OTHER = "p2";
const NOW = 1_756_000_000_000;
const EPOCH = 4;

/** A capture date well before the fake clock, so "the position came from the
 *  ITEM and not from `Date.now()`" is a claim these numbers can carry. */
const CAPTURED_AT = 1_723_600_000_000; // 14 Aug 2024, in ms

/**
 * Every `suspend_reason` a case in THIS FILE actually produced.
 *
 * Populated by {@link expectReason}, read by the vocabulary case at the foot of
 * the file. The point is stated there: a vocabulary member with no transition is
 * either a missing feature or a dead string, and the difference should be a
 * written statement rather than a guess.
 */
const producedReasons = new Set<SuspendReason>();

/** Assert a row's suspension reason AND record that this file reached it. One
 *  helper rather than two lines at every site, so a case cannot assert a reason
 *  without contributing it to the coverage set. */
function expectReason(row: ScanRow | undefined, reason: SuspendReason): void {
  expect(row?.state, "the row is not suspended").toBe("suspended");
  expect(row?.suspend_reason).toBe(reason);
  producedReasons.add(reason);
}

/**
 * Suspension reasons this file deliberately does NOT reach, and who owns each.
 *
 * A NAMED OWNER IS THE WHOLE MECHANISM. An entry here is a written statement
 * that the member is a feature arriving later, not a dead string; a member with
 * neither a transition nor an entry here fails the vocabulary case below, which
 * is exactly the signal a fifth reason added with no call site should produce.
 */
const DEFERRED_REASONS: Partial<Record<SuspendReason, string>> = {
  // D-08: the retention cap was deleting this scan's own results — the backfill
  // was consuming itself. Detected on the retention sweep, which is plan 06-06's
  // to wire, together with the `audit` rows D-16 gives a scan.
  retention_eviction: "plan 06-06",
};

/** One walked page's worth of advance, with the boundary the caller names. */
function page(
  lastRequestId: string,
  nowMs: number,
): Parameters<typeof advanceScan>[3] {
  return {
    lastRequestId,
    lastCursor: `cursor-${lastRequestId}`,
    lastCreatedAt: CAPTURED_AT,
    seen: 20,
    admitted: 3,
    skippedDone: 1,
    rejected: 16,
    queued: 3,
    nowMs,
  };
}

describe("the scan lifecycle — every route into and out of every state", () => {
  let fx: SqliteFixture;

  beforeEach(async () => {
    fx = createFixtureDb();
    const report = await migrate(fx.db);
    expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  });

  afterEach(() => {
    fx.close();
  });

  it("THE HAPPY PATH: start → advance → pause → resume → advance → complete, position intact", async () => {
    expect((await startScan(fx.db, PROJECT, "s1", "", EPOCH, NOW)).ok).toBe(
      true,
    );
    expect(
      (await advanceScan(fx.db, PROJECT, "s1", page("9001", NOW + 1))).ok,
    ).toBe(true);

    const paused = await pauseScan(fx.db, PROJECT, "s1", NOW + 2);
    expect(paused.ok && paused.changes).toBe(1);
    expectReason(paused.ok ? paused.row : undefined, "operator_paused");
    // THE POSITION SURVIVES THE PAUSE. That is D-10 in one assertion: a
    // mis-clicked pause on a multi-hour backfill costs nothing, because the
    // resume continues from exactly here.
    expect(paused.ok && paused.row?.last_request_id).toBe("9001");
    expect(paused.ok && paused.row?.last_created_at).toBe(CAPTURED_AT);

    const resumed = await resumeScan(fx.db, PROJECT, "s1", EPOCH, NOW + 3);
    expect(resumed.ok && resumed.row?.state).toBe("running");
    expect(resumed.ok && resumed.row?.suspend_reason).toBeNull();
    expect(resumed.ok && resumed.row?.last_request_id).toBe("9001");

    // A SUSPENDED SCAN DOES NOT ADVANCE, so this second page is the proof the
    // resume actually re-opened the guard rather than the counters moving on
    // their own.
    expect(
      (await advanceScan(fx.db, PROJECT, "s1", page("8981", NOW + 4))).ok,
    ).toBe(true);

    const finished = await completeScan(fx.db, PROJECT, "s1", NOW + 5);
    expect(finished.ok && finished.changes).toBe(1);
    const row = finished.ok ? finished.row : undefined;
    expect(row?.state).toBe("completed");
    expect(row?.finished_at).toBe(NOW + 5);
    // MONOTONIC THROUGHOUT. Every counter is an integer advanced by SQL
    // addition; nothing on this path is a float, a rounded value or a
    // percentage (FIND-04's precision edge).
    expect(row?.pages_walked).toBe(2);
    expect(row?.seen).toBe(40);
    expect(row?.admitted).toBe(6);
    expect(row?.skipped_done).toBe(2);
    expect(row?.rejected).toBe(32);
    expect(row?.queued).toBe(6);
    for (const n of [
      row?.seen,
      row?.admitted,
      row?.rejected,
      row?.pages_walked,
    ]) {
      expect(Number.isInteger(n), `${String(n)} is not an integer`).toBe(true);
    }
    // The boundary is the LATEST one, not a sum and not the first.
    expect(row?.last_request_id).toBe("8981");
  });

  it("start → pause → DISCARD: the position is gone and the results are not", async () => {
    await startScan(fx.db, PROJECT, "s1", "", EPOCH, NOW);
    await advanceScan(fx.db, PROJECT, "s1", page("9001", NOW + 1));
    await pauseScan(fx.db, PROJECT, "s1", NOW + 2);

    const discarded = await discardScan(
      fx.db,
      PROJECT,
      "s1",
      NOW + 3,
      "evt-lifecycle-discard",
    );
    const row = discarded.ok ? discarded.row : undefined;
    expect(row?.state).toBe("discarded");
    expect(row?.finished_at).toBe(NOW + 3);
    // WHAT DISCARD DESTROYS.
    expect(row?.last_request_id).toBe("");
    expect(row?.last_cursor).toBeNull();
    // AND WHAT IT DOES NOT. The counters it accumulated are still readable, and
    // so is the capture time it reached — the history row renders
    // "Discarded · {n} seen · reached {date}" from exactly these. The artifacts
    // and observations went through the same admission gate, digest and store
    // path the live hook uses (D-01); they are not this table's to touch.
    expect(row?.seen).toBe(20);
    expect(row?.admitted).toBe(3);
    expect(row?.last_created_at).toBe(CAPTURED_AT);

    // A discarded scan is no longer active, so the surface shows the start form
    // again rather than a terminal row it cannot act on.
    expect(await getActiveScan(fx.db, PROJECT)).toBeUndefined();
  });

  it("start → EPOCH CHANGE: suspended with `project_changed`, resumable only from the project it belongs to", async () => {
    await startScan(fx.db, PROJECT, "s1", "", EPOCH, NOW);
    await advanceScan(fx.db, PROJECT, "s1", page("9001", NOW + 1));

    // D-04. Nothing is written under a stale project and nothing silently
    // restarts. `projectEpoch()` is a MONOTONIC COUNT of applied changes, so the
    // new epoch is a higher number and never the old one again.
    const changedEpoch = EPOCH + 1;
    const suspended = await suspendOnEpochChange(
      fx.db,
      PROJECT,
      "s1",
      changedEpoch,
      NOW + 2,
    );
    expect(suspended.ok && suspended.changes).toBe(1);
    expectReason(suspended.ok ? suspended.row : undefined, "project_changed");
    // IT KEPT ITS PLACE IN THE OLD PROJECT — both the position and the row's own
    // epoch, which is what makes the scan still identifiable as belonging there.
    expect(suspended.ok && suspended.row?.last_request_id).toBe("9001");
    expect(suspended.ok && suspended.row?.epoch).toBe(EPOCH);

    // A RESUME FROM THE PROJECT THE OPERATOR SWITCHED TO IS REFUSED, AND IT IS
    // REFUSED BY THE SCOPING RATHER THAN BY THE EPOCH. The row is not in that
    // project's partition, so nothing there can reach it — which is
    // 06-UI-SPEC.md's "Resume it from that project" enforced by a predicate
    // instead of by a rule somebody has to remember. The RPC reads
    // `currentProjectId()` and never a caller-supplied id (T-05-34), so there is
    // no argument a caller can pass to get past this.
    expect(await getScan(fx.db, OTHER, "s1")).toBeUndefined();
    const fromWrongProject = await resumeScan(
      fx.db,
      OTHER,
      "s1",
      changedEpoch,
      NOW + 3,
    );
    expect(fromWrongProject.ok && fromWrongProject.changes).toBe(0);
    expect((await getScan(fx.db, PROJECT, "s1"))?.state).toBe("suspended");

    // A RESUME FROM THE PROJECT IT BELONGS TO CONTINUES, and it RE-BASES the
    // epoch to the one in force now. That re-basing is load-bearing rather than
    // incidental: the counter never returns to a previous value, so a resume
    // that preserved the stale epoch would produce a scan that suspends itself
    // again on its very first page, for ever — D-04's suspension would be a
    // one-way door and "resumes only on explicit operator action" would be
    // unreachable rather than merely awkward. `RESUME_SQL` carries the argument.
    const backHome = EPOCH + 2;
    const resumed = await resumeScan(fx.db, PROJECT, "s1", backHome, NOW + 4);
    expect(resumed.ok && resumed.changes).toBe(1);
    expect(resumed.ok && resumed.row?.state).toBe("running");
    expect(resumed.ok && resumed.row?.suspend_reason).toBeNull();
    expect(resumed.ok && resumed.row?.epoch).toBe(backHome);
    // …and the position it was suspended at is exactly where it carries on from.
    expect(resumed.ok && resumed.row?.last_request_id).toBe("9001");

    // THE GUARD NO LONGER FIRES AT THE CURRENT EPOCH, so the scan can actually
    // walk — the assertion the one-way-door bug would fail.
    const settled = await suspendOnEpochChange(
      fx.db,
      PROJECT,
      "s1",
      backHome,
      NOW + 5,
    );
    expect(settled.ok && settled.changes).toBe(0);
    expect(settled.ok && settled.row?.state).toBe("running");
    expect(
      (await advanceScan(fx.db, PROJECT, "s1", page("8981", NOW + 6))).ok,
    ).toBe(true);
    expect((await getScan(fx.db, PROJECT, "s1"))?.pages_walked).toBe(2);

    // AND IT FIRES AGAIN ON THE NEXT CHANGE. Re-basing does not disarm D-04; it
    // re-arms it against the epoch the operator resumed under.
    const changedAgain = await suspendOnEpochChange(
      fx.db,
      PROJECT,
      "s1",
      backHome + 1,
      NOW + 7,
    );
    expect(changedAgain.ok && changedAgain.changes).toBe(1);
    expectReason(
      changedAgain.ok ? changedAgain.row : undefined,
      "project_changed",
    );
  });

  it("ERR-02: after the startup sweep NO row is `running`, in any project, and nothing auto-resumed", async () => {
    // ERR-02 IS A PHASE 2 REQUIREMENT — "jobs in flight when the process died
    // are detected on startup and either resumed or explicitly abandoned, never
    // left permanently `running`" — and D-11 ships a slice of it here, on the
    // one table that needs it now. This is the case that proves Phase 6 keeps
    // the rule. Phase 2 inherits the pattern rather than inventing a second one.
    await startScan(fx.db, PROJECT, "s1", "", EPOCH, NOW);
    await advanceScan(fx.db, PROJECT, "s1", page("9001", NOW + 1));
    await startScan(fx.db, OTHER, "s2", "", EPOCH, NOW);

    // The sweep is project-scoped because every multi-row statement in this
    // package is (T-01-20). init() runs it for the project it resolved; a
    // process holding rows in two projects needs the call once per project, and
    // that is what this drives.
    expect((await suspendRunningOnInit(fx.db, PROJECT, NOW + 2)).ok).toBe(true);
    expect((await suspendRunningOnInit(fx.db, OTHER, NOW + 2)).ok).toBe(true);

    const stillRunning = fx.raw
      .prepare("SELECT project_id, scan_id FROM scans WHERE state = 'running'")
      .all() as { project_id: string; scan_id: string }[];
    expect(
      stillRunning,
      "a scan was left permanently `running` across a restart — ERR-02",
    ).toEqual([]);

    const swept = await getScan(fx.db, PROJECT, "s1");
    expectReason(swept, "process_restarted");
    // `last_cursor` IS NULLED AND `last_request_id` IS NOT. A cursor's lifetime
    // across a process restart is NOT MEASURED (O-04); the request id is the
    // re-derivable position that does not depend on that answer, so the scan
    // still knows where it was.
    expect(swept?.last_cursor).toBeNull();
    expect(swept?.last_request_id).toBe("9001");

    // NOTHING AUTO-RESUMED. There is no timer in this module and no path back
    // to `running` that is not an explicit call, so a second sweep — the shape a
    // second restart takes — moves nothing and rewrites no reason.
    const again = await suspendRunningOnInit(fx.db, PROJECT, NOW + 3);
    expect(again.ok && again.changes).toBe(0);
    expect((await getScan(fx.db, PROJECT, "s1"))?.state).toBe("suspended");
    expect((await getScan(fx.db, PROJECT, "s1"))?.suspend_reason).toBe(
      "process_restarted",
    );
  });

  it("ONE AT A TIME, both ways: a running occupant is refused by the driver, a suspended one by the read", async () => {
    // The two halves are NOT substitutes for each other and the surface says
    // which of them fired — 06-UI-SPEC.md's start form has a separate sentence
    // for each ("A scan is already running…" / "A suspended scan is holding its
    // place…"), and picking the wrong one tells the operator to press a control
    // that is not on screen.
    await startScan(fx.db, PROJECT, "s1", "", EPOCH, NOW);

    // HALF ONE — the partial UNIQUE index, INSIDE the insert. There is no window
    // in which two scans can both believe they started.
    const second = await startScan(fx.db, PROJECT, "s2", "", EPOCH, NOW + 1);
    expect(second.ok).toBe(false);
    expect(await listScans(fx.db, PROJECT)).toHaveLength(1);
    expect((await getActiveScan(fx.db, PROJECT))?.state).toBe("running");

    // HALF TWO — the read, once the occupant is SUSPENDED. The index
    // deliberately does not cover `suspended`, because a suspended scan has to
    // be able to sit there in order to be resumed at all…
    await pauseScan(fx.db, PROJECT, "s1", NOW + 2);
    expect((await getActiveScan(fx.db, PROJECT))?.state).toBe("suspended");

    // …which is exactly why the read is LOAD-BEARING rather than decorative:
    // without it the driver would accept a second row and the operator would
    // have two scans, one of them holding a cursor nothing will ever resume.
    const wouldSucceed = await startScan(
      fx.db,
      PROJECT,
      "s3",
      "",
      EPOCH,
      NOW + 3,
    );
    expect(
      wouldSucceed.ok && wouldSucceed.changes,
      "the driver refused a start beside a SUSPENDED scan — if this ever " +
        "becomes true the RPC's getActiveScan guard has stopped being the " +
        "thing that enforces the suspended half of the invariant",
    ).toBe(1);
  });

  it("the RESUME BOUNDARY is strictly less-than: id N is not re-walked and id N-1 is not skipped", async () => {
    // FIND-03's adjacency edge. `lt` and not `lte`: the walk is descending, so
    // the boundary is the LAST request the previous page walked. `lte` would
    // re-walk it as the first item of every subsequent page, once per page, for
    // the whole backfill; anything wider than `lt` would leave a gap. The two
    // errors are not symmetrical — a repeat costs a wasted full-body transfer, a
    // gap costs an artifact the operator will never be told was missed — and
    // `lt` has neither.
    await startScan(fx.db, PROJECT, "s1", "", EPOCH, NOW);
    await advanceScan(fx.db, PROJECT, "s1", page("9001", NOW + 1));
    await pauseScan(fx.db, PROJECT, "s1", NOW + 2);
    await resumeScan(fx.db, PROJECT, "s1", EPOCH, NOW + 3);

    const row = await getScan(fx.db, PROJECT, "s1");
    const resumeFilter = composeScanFilter(
      positionClause(row?.last_request_id ?? ""),
      row?.operator_filter ?? "",
    );

    // THE BOUNDARY ITSELF IS EXCLUDED — asserted by comparing the composed
    // string for the boundary against the one built for the id BELOW it, which
    // is what makes this a claim about adjacency rather than about spelling.
    const oneBelow = composeScanFilter(positionClause("9000"), "");
    expect(resumeFilter).toContain("(row.id.lt:9001)");
    expect(resumeFilter).not.toBe(oneBelow);
    expect(oneBelow).toContain("(row.id.lt:9000)");
    // No `lte` anywhere on the path — the one-character difference that turns a
    // resume into a permanent re-walk of the boundary row.
    expect(resumeFilter).not.toContain("lte");
  });

  it("a resumed scan continues from its OWN boundary, not from the start of history", async () => {
    await startScan(fx.db, PROJECT, "s1", "", EPOCH, NOW);
    await advanceScan(fx.db, PROJECT, "s1", page("9001", NOW + 1));
    await suspendRunningOnInit(fx.db, PROJECT, NOW + 2);
    await resumeScan(fx.db, PROJECT, "s1", EPOCH, NOW + 3);

    const row = await getScan(fx.db, PROJECT, "s1");
    // A scan that had lost its position would compose with NO position clause —
    // which is a full re-walk of the operator's entire history, silently.
    expect(positionClause(row?.last_request_id ?? "")).toBe("row.id.lt:9001");
    expect(positionClause("")).toBe("");
  });

  it("the SUSPENSION VOCABULARY is fully accounted for: every member has a transition or a named owner", () => {
    // A vocabulary member with no transition is either a missing feature or a
    // dead string, and the difference should be a written statement rather than
    // a guess. This case is that statement, enforced mechanically against the
    // closed array rather than against a copy of its members.
    //
    // IT DEPENDS ON THE CASES ABOVE HAVING RUN, which is why the emptiness guard
    // is first: vitest runs a file's cases in declaration order, and a set that
    // is empty here means the collection stopped working rather than that the
    // vocabulary shrank.
    expect(
      producedReasons.size,
      "no case in this file recorded a suspension reason — expectReason() is " +
        "no longer being reached, so this assertion is vacuous",
    ).toBeGreaterThan(0);

    const unaccounted = SUSPEND_REASONS.filter(
      (reason) =>
        !producedReasons.has(reason) && DEFERRED_REASONS[reason] === undefined,
    );
    expect(
      unaccounted,
      "these suspension reasons have no transition in this file and no named " +
        "owning plan in DEFERRED_REASONS. Add the transition, or record who " +
        "ships it — a reason the frontend has copy for and nothing can ever " +
        "produce is a dead string",
    ).toEqual([]);

    // And the deferral is DELIBERATE rather than an omission: the one member
    // this phase does not reach yet is named, with its owner.
    expect(Object.keys(DEFERRED_REASONS)).toEqual(["retention_eviction"]);
    expect(DEFERRED_REASONS.retention_eviction).toBe("plan 06-06");
    expect(producedReasons.has("retention_eviction")).toBe(false);

    // The three this phase DOES reach, named so the diff is readable when a
    // fourth arrives.
    expect([...producedReasons].sort()).toEqual([
      "operator_paused",
      "process_restarted",
      "project_changed",
    ]);
  });
});
