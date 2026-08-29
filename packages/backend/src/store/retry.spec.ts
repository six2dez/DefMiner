// packages/backend/src/store/retry.spec.ts — OPS-03's behavioural gate.
//
// WHAT THIS FILE IS ACTUALLY FOR. `retryAnalysis` has one statement and the
// whole of its correctness is in the statement's PREDICATE: which rows it can
// touch, and which it must leave exactly where they are. A predicate is not
// visible from a call site, so every one of the five shipped scan states is
// driven through it here and asserted by READING THE ROW BACK — not by
// trusting a `changes` count, which on this driver is the one thing a write
// can report and the one thing that does not say what the row became.
//
// THE CASE THAT MATTERS MOST IS A NEGATIVE ONE. Retrying a `running` analysis
// must change nothing: a running walk reset underneath itself is threat
// T-05-50, and the reason the guard is a state list INSIDE the update rather
// than a caller-side check before it. A caller-side check is two operations
// this driver cannot make atomic — there is no transaction primitive here at
// all, `BEGIN` does not span `exec` calls and fails silently — so the window
// between the check and the write is real.
//
// Fixture caveat, unchanged from artifacts.spec.ts: `node:sqlite` is
// SINGLE-CONNECTION and cannot reproduce the pool-affinity failure mode.
// Nothing below asserts anything about connection affinity.

import { SCAN_STATES } from "@defminer/engine/contract";
import type { ScanState } from "@defminer/engine/contract";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createFixtureDb,
  type SqliteFixture,
} from "../../test/fixtures/sqlite-fixture";

import { DETECTOR_CORPUS_VERSION, getAnalysis } from "./analyses";
import { migrate } from "./migrations";
import { retryAnalysis } from "./retry";

const P1 = "project-one";
const P2 = "project-two";
const SHA = "a".repeat(64);

let fx: SqliteFixture;

beforeEach(async () => {
  fx = createFixtureDb();
  const report = await migrate(fx.db);
  expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  return () => {
    fx.close();
  };
});

/**
 * Seed one analysis row directly, in a named state.
 *
 * Written through the RAW handle rather than through `claimAnalysis` +
 * `finishAnalysis`, deliberately: those two can only produce the states their
 * own callers produce, and this suite's whole point is to drive EVERY member
 * of the shipped vocabulary — including `pending` and `running`, which no
 * terminal-write path can leave behind on demand.
 */
function seed(
  projectId: string,
  sha256: string,
  state: ScanState,
  extras: { bytesWalked?: number | null; error?: string | null } = {},
): void {
  fx.raw
    .prepare(
      `INSERT INTO analyses (project_id, sha256, detector_set_hash, scan_state,
                             max_slice_ms, bytes_walked, started_at, finished_at, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      projectId,
      sha256,
      DETECTOR_CORPUS_VERSION,
      state,
      12.5,
      extras.bytesWalked ?? 4096,
      1_756_000_000_000,
      1_756_000_100_000,
      extras.error ?? "some earlier diagnostic",
    );
}

async function stateOf(
  projectId: string,
  sha256: string,
): Promise<ScanState | undefined> {
  const row = await getAnalysis(
    fx.db,
    projectId,
    sha256,
    DETECTOR_CORPUS_VERSION,
  );
  return row?.scan_state;
}

describe("retryAnalysis — one case per shipped state (OPS-03, EDGE OPS-03/unclassified)", () => {
  /**
   * THE STATE-TRANSITION EDGE, CLOSED AS A TABLE RATHER THAN AS PROSE.
   *
   * Five rows, one per member of `SCAN_STATES`, with the expectation stated as
   * "does the row move" rather than as "what does it become". Exactly two move,
   * and the two that move are the two terminal states that did not inspect
   * every byte.
   */
  const CASES: readonly { from: ScanState; moves: boolean }[] = [
    { from: "pending", moves: false },
    { from: "running", moves: false },
    { from: "done", moves: false },
    { from: "partial", moves: true },
    { from: "failed", moves: true },
  ];

  it("covers every member of the shipped vocabulary and no other", () => {
    // NON-VACUITY. A table that silently stopped covering a state would keep
    // passing; this is the assertion that makes adding a sixth state fail here
    // rather than in production.
    expect(CASES.map((c) => c.from)).toEqual([...SCAN_STATES]);
    expect(CASES.filter((c) => c.moves)).toHaveLength(2);
  });

  for (const testCase of CASES) {
    it(`${testCase.moves ? "moves" : "leaves"} an analysis in the ${testCase.from} state`, async () => {
      seed(P1, SHA, testCase.from);

      const result = await retryAnalysis(
        fx.db,
        P1,
        SHA,
        DETECTOR_CORPUS_VERSION,
        1_756_999_000_000,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      // THE READ-BACK IS THE ASSERTION, not the changes count. This driver has
      // no RETURNING clause and `last_insert_rowid()` is unusable on the pool,
      // so a write cannot tell a caller what it wrote — the same reason
      // `claimAnalysis` is insert-then-read.
      const after = await stateOf(P1, SHA);
      expect(result.state).toBe(after);

      if (testCase.moves) {
        expect(result.changes).toBe(1);
        expect(after).not.toBe(testCase.from);
        // A retried row is queued again, which is the state that makes the
        // analyses table double as the durable job queue.
        expect(after).toBe("pending");
      } else {
        expect(result.changes).toBe(0);
        expect(after).toBe(testCase.from);
      }
    });
  }

  it("clears the previous walk's numbers when it moves a row, and only then", async () => {
    // A row back in the queue carrying the STOPPED walk's byte count would
    // report that a queued analysis had already walked 4,096 bytes — a number
    // the UI-09 degraded marker renders verbatim.
    seed(P1, SHA, "partial", { bytesWalked: 4096, error: "stopped early" });
    await retryAnalysis(fx.db, P1, SHA, DETECTOR_CORPUS_VERSION, 1_756_999_000_000);

    const moved = await getAnalysis(fx.db, P1, SHA, DETECTOR_CORPUS_VERSION);
    expect(moved?.bytes_walked).toBeNull();
    expect(moved?.finished_at).toBeNull();
    expect(moved?.error).toBeNull();
    expect(moved?.started_at).toBe(1_756_999_000_000);

    const other = "b".repeat(64);
    seed(P1, other, "done", { bytesWalked: 512, error: null });
    await retryAnalysis(fx.db, P1, other, DETECTOR_CORPUS_VERSION, 1_756_999_000_000);
    const untouched = await getAnalysis(fx.db, P1, other, DETECTOR_CORPUS_VERSION);
    expect(untouched?.bytes_walked).toBe(512);
    expect(untouched?.finished_at).toBe(1_756_000_100_000);
  });

  it("reports no change and no error for a key that does not exist", async () => {
    const result = await retryAnalysis(
      fx.db,
      P1,
      "f".repeat(64),
      DETECTOR_CORPUS_VERSION,
      1_756_999_000_000,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes).toBe(0);
    // `undefined`, not a fabricated state. A row that is not there has no
    // state, and answering with one would be an invention the panel renders.
    expect(result.state).toBeUndefined();
  });

  it("changes nothing when the project does not own the row (T-05-53)", async () => {
    seed(P1, SHA, "failed");

    const result = await retryAnalysis(
      fx.db,
      P2,
      SHA,
      DETECTOR_CORPUS_VERSION,
      1_756_999_000_000,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes).toBe(0);

    // READ BACK UNDER THE ROW'S TRUE PROJECT. Asserting only on the result
    // would pass against a statement that had touched the row and reported
    // nothing — one SQLite file serves every Caido project (T-01-20).
    expect(await stateOf(P1, SHA)).toBe("failed");
    expect(await stateOf(P2, SHA)).toBeUndefined();
  });

  it("changes nothing when the corpus version does not match", async () => {
    // The corpus version is part of the KEY, not a column beside it: a retry
    // aimed at one reading of these bytes must not disturb another.
    seed(P1, SHA, "failed");

    const result = await retryAnalysis(
      fx.db,
      P1,
      SHA,
      "0".repeat(64),
      1_756_999_000_000,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changes).toBe(0);
    expect(await stateOf(P1, SHA)).toBe("failed");
  });

  it("returns a REDACTED description when the driver rejects", async () => {
    seed(P1, SHA, "failed");
    fx.close();

    const result = await retryAnalysis(
      fx.db,
      P1,
      SHA,
      DETECTOR_CORPUS_VERSION,
      1_756_999_000_000,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).not.toBe("");
    // The description is produced by `describeError`, which prepends the class
    // name for an Error instance. A bare stringification would not carry it,
    // so this is the cheapest way to assert the value went through the
    // redactor rather than through `String(e)`.
    expect(result.error).toMatch(/^[A-Za-z]+Error:/);

    // Re-open so the fixture's own teardown has something to close.
    fx = createFixtureDb();
  });
});
