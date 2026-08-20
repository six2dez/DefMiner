// packages/backend/src/store/artifacts.spec.ts — CORE-08, STORE-02 and STORE-07's
// BEHAVIOURAL gate, on the fixture database.
//
// `sql-discipline.spec.ts` proves the SQL is shaped correctly by reading the
// source. This file proves the shapes actually behave the way the comments claim
// when a real SQLite executes them — including the three binding behaviours Phase 0
// measured the hard way, each of which fails SILENTLY when it is wrong:
//
//   - two adjacent positional placeholders bind LEFT TO RIGHT;
//   - a null parameter binds SQL NULL and not the four-character string "null";
//   - a statement with no placeholders runs with ZERO parameters, because passing
//     an array of bind values to the parameterless form is silently ignored and
//     produced rows with every column NULL in Phase 0.
//
// Fixture caveat that bounds every claim below: `node:sqlite` is SINGLE-CONNECTION
// and cannot reproduce the pool-affinity failure mode. Nothing here asserts
// anything about connection affinity — see test/fixtures/sqlite-fixture.ts.

import { beforeEach, describe, expect, it } from "vitest";

import {
  createFixtureDb,
  type SqliteFixture,
} from "../../test/fixtures/sqlite-fixture";

import {
  claimAnalysis,
  countAnalyses,
  DETECTOR_CORPUS_VERSION,
  finishAnalysis,
  isAnalysed,
  isCorpusSentinel,
} from "./analyses";
import {
  countArtifacts,
  getArtifact,
  listArtifacts,
  upsertArtifact,
} from "./artifacts";
import { migrate } from "./migrations";
import {
  countObservations,
  listObservations,
  recordObservation,
} from "./observations";

const P1 = "project-one";
const P2 = "project-two";
const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

let fx: SqliteFixture;

beforeEach(async () => {
  fx = createFixtureDb();
  const report = await migrate(fx.db);
  expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  return () => {
    fx.close();
  };
});

describe("content-addressed identity (STORE-02, STORE-03)", () => {
  it("the same digest twice under ONE project is ONE row with seen_count 2", async () => {
    expect((await upsertArtifact(fx.db, P1, SHA_A, 1024, "js", 1000)).ok).toBe(
      true,
    );
    expect((await upsertArtifact(fx.db, P1, SHA_A, 1024, "js", 2000)).ok).toBe(
      true,
    );

    expect(await countArtifacts(fx.db, P1)).toBe(1);
    const row = await getArtifact(fx.db, P1, SHA_A);
    expect(row?.seen_count).toBe(2);
    // first_seen_at is NOT touched by the conflict branch; last_seen_at is.
    expect(row?.first_seen_at).toBe(1000);
    expect(row?.last_seen_at).toBe(2000);
  });

  it("the same digest under TWO projects is TWO rows", async () => {
    await upsertArtifact(fx.db, P1, SHA_A, 1024, "js", 1000);
    await upsertArtifact(fx.db, P2, SHA_A, 1024, "js", 1000);

    expect(await countArtifacts(fx.db, P1)).toBe(1);
    expect(await countArtifacts(fx.db, P2)).toBe(1);
    // Identical bytes, two projects, two rows: project isolation is an
    // access-control boundary here, not a data-modelling nicety (T-01-20).
    const all = fx.raw.prepare("SELECT COUNT(*) AS n FROM artifacts").get() as {
      n: number;
    };
    expect(Number(all.n)).toBe(2);
  });

  it("an EMPTY project_id is REJECTED, and the rejection is asserted not swallowed", async () => {
    const res = await upsertArtifact(fx.db, "", SHA_A, 1024, "js", 1000);
    // upsertArtifact catches and REPORTS rather than throwing, because Caido
    // surfaces neither a throw nor a rejection. So the assertion is on the
    // reported outcome — and on the row count, because "it reported failure" and
    // "it wrote nothing" are two different claims.
    expect(res.ok).toBe(false);
    expect(res.ok ? "" : res.error).toMatch(/non-empty|constraint/i);
    const all = fx.raw.prepare("SELECT COUNT(*) AS n FROM artifacts").get() as {
      n: number;
    };
    expect(Number(all.n)).toBe(0);
  });

  it("an empty project_id is rejected on observations too", async () => {
    const res = await recordObservation(
      fx.db,
      "",
      SHA_A,
      "req-1",
      "https://example.test/app.js",
      200,
      "application/javascript",
      1000,
    );
    expect(res.ok).toBe(false);
    expect(await countObservations(fx.db, "")).toBe(0);
  });
});

describe("positional binding (STORE-07)", () => {
  it("two ADJACENT placeholders bind LEFT TO RIGHT", async () => {
    // first_seen_at and last_seen_at are adjacent, same type, and distinguishable
    // by value. If binding were right-to-left the two would come back swapped —
    // which is exactly what the second half of this test demonstrates, so the
    // assertion provably distinguishes the two orders rather than passing either
    // way.
    const stmt = await fx.db.prepare(
      `INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    );
    await stmt.run(P1, SHA_A, 10, "js", 1111, 2222);
    const correct = await getArtifact(fx.db, P1, SHA_A);
    expect(correct?.first_seen_at).toBe(1111);
    expect(correct?.last_seen_at).toBe(2222);

    // The SAME statement with the two arguments reversed stores them reversed.
    await stmt.run(P1, SHA_B, 10, "js", 2222, 1111);
    const reversed = await getArtifact(fx.db, P1, SHA_B);
    expect(reversed?.first_seen_at).toBe(2222);
    expect(reversed?.last_seen_at).toBe(1111);
    // And the two are NOT the same, which is the property that makes the first
    // pair of assertions load-bearing.
    expect(correct?.first_seen_at).not.toBe(reversed?.first_seen_at);
  });

  it("a NULL parameter binds SQL NULL, not the four-character string", async () => {
    await upsertArtifact(fx.db, P1, SHA_A, 10, "js", 1000);
    const res = await recordObservation(
      fx.db,
      P1,
      SHA_A,
      "req-null",
      "https://example.test/app.js",
      200,
      null, // content_type
      1000,
    );
    expect(res.ok).toBe(true);

    const isNull = await fx.db.prepare(
      "SELECT COUNT(*) AS n FROM observations WHERE project_id = ? AND content_type IS NULL",
    );
    expect(Number((await isNull.get<{ n: number }>(P1))?.n)).toBe(1);

    // The failure this rules out: a driver that stringifies null would store
    // 'null' and this equality read would find the row.
    const asString = await fx.db.prepare(
      "SELECT COUNT(*) AS n FROM observations WHERE project_id = ? AND content_type = ?",
    );
    expect(Number((await asString.get<{ n: number }>(P1, "null"))?.n)).toBe(0);
  });

  it("a statement with NO placeholders runs with ZERO parameters", async () => {
    await upsertArtifact(fx.db, P1, SHA_A, 10, "js", 1000);
    await upsertArtifact(fx.db, P2, SHA_B, 20, "js", 1000);
    // Phase 0 measured that passing an ARRAY of bind values to the parameterless
    // execution form is SILENTLY IGNORED — it produced rows with every column
    // NULL and a NOT NULL constraint failure that never surfaced. The correct
    // call takes no arguments at all, and this is it.
    const stmt = await fx.db.prepare("SELECT COUNT(*) AS n FROM artifacts");
    const row = await stmt.get<{ n: number }>();
    expect(Number(row?.n)).toBe(2);
  });
});

describe("deterministic ordering", () => {
  it("listArtifacts is stable across calls, INCLUDING rows that tie on last_seen_at", async () => {
    // Four rows, three of which share a last_seen_at. Without the sha256
    // tie-break the order of those three is whatever the scan produced.
    await upsertArtifact(fx.db, P1, "d".repeat(64), 10, "js", 5000);
    await upsertArtifact(fx.db, P1, "c".repeat(64), 10, "js", 5000);
    await upsertArtifact(fx.db, P1, "e".repeat(64), 10, "js", 5000);
    await upsertArtifact(fx.db, P1, "f".repeat(64), 10, "js", 9000);

    const first = await listArtifacts(fx.db, P1);
    const second = await listArtifacts(fx.db, P1);
    expect(first.map((r) => r.sha256)).toEqual(second.map((r) => r.sha256));
    // Most recent first, then digest ascending among the tie.
    expect(first.map((r) => r.sha256[0])).toEqual(["f", "c", "d", "e"]);
  });

  it("listArtifacts honours its limit and never crosses the project boundary", async () => {
    for (const c of ["a", "b", "c", "d"]) {
      await upsertArtifact(fx.db, P1, c.repeat(64), 10, "js", 1000);
    }
    await upsertArtifact(fx.db, P2, "z".repeat(64), 10, "js", 9999);

    expect((await listArtifacts(fx.db, P1, 2)).length).toBe(2);
    const all = await listArtifacts(fx.db, P1);
    expect(all.length).toBe(4);
    expect(all.every((r) => r.project_id === P1)).toBe(true);
  });

  it("listObservations orders by observed_at DESC then request_id ASC", async () => {
    await upsertArtifact(fx.db, P1, SHA_A, 10, "js", 1000);
    await recordObservation(
      fx.db,
      P1,
      SHA_A,
      "r-b",
      "https://x/1.js",
      200,
      null,
      100,
    );
    await recordObservation(
      fx.db,
      P1,
      SHA_A,
      "r-a",
      "https://x/2.js",
      200,
      null,
      100,
    );
    await recordObservation(
      fx.db,
      P1,
      SHA_A,
      "r-c",
      "https://x/3.js",
      200,
      null,
      300,
    );

    const rows = await listObservations(fx.db, P1, SHA_A);
    expect(rows.map((r) => r.request_id)).toEqual(["r-c", "r-a", "r-b"]);
    // Same sequence on a second call — the tie between r-a and r-b is broken by
    // request_id, not by scan order.
    expect(
      (await listObservations(fx.db, P1, SHA_A)).map((r) => r.request_id),
    ).toEqual(["r-c", "r-a", "r-b"]);
  });
});

describe("the corpus-version cache (CORE-08, STORE-04)", () => {
  it("the Phase 1 sentinel is distinguishable from a real corpus hash", () => {
    expect(isCorpusSentinel(DETECTOR_CORPUS_VERSION)).toBe(true);
    expect(isCorpusSentinel("f".repeat(64))).toBe(false);
    // Not hash-shaped, so Phase 3 can find every Phase 1 row.
    expect(/^[0-9a-f]{64}$/.test(DETECTOR_CORPUS_VERSION)).toBe(false);
  });

  it("a SECOND sighting at the current corpus version creates NO new analysis row", async () => {
    // First sighting: claim, analyse, finish.
    await upsertArtifact(fx.db, P1, SHA_A, 1024, "js", 1000);
    await recordObservation(
      fx.db,
      P1,
      SHA_A,
      "req-1",
      "https://x/a.js",
      200,
      null,
      1000,
    );
    const first = await claimAnalysis(
      fx.db,
      P1,
      SHA_A,
      DETECTOR_CORPUS_VERSION,
      1000,
    );
    expect(first.ok && first.claimed).toBe(true);
    expect(
      (
        await finishAnalysis(
          fx.db,
          P1,
          SHA_A,
          DETECTOR_CORPUS_VERSION,
          "done",
          1500,
          12.5,
          1024,
          null,
        )
      ).ok,
    ).toBe(true);

    expect(await isAnalysed(fx.db, P1, SHA_A, DETECTOR_CORPUS_VERSION)).toBe(
      true,
    );
    const analysesAfterFirst = await countAnalyses(fx.db, P1);
    expect(analysesAfterFirst).toBe(1);

    // Second sighting of the SAME bytes at the SAME corpus version.
    await upsertArtifact(fx.db, P1, SHA_A, 1024, "js", 2000);
    await recordObservation(
      fx.db,
      P1,
      SHA_A,
      "req-2",
      "https://x/a.js",
      200,
      null,
      2000,
    );

    // The observation and the counters DID update — the same bytes appearing
    // again is real information — and the analysis count did NOT move.
    const art = await getArtifact(fx.db, P1, SHA_A);
    expect(art?.seen_count).toBe(2);
    expect(art?.last_seen_at).toBe(2000);
    expect(await countObservations(fx.db, P1)).toBe(2);
    expect(await countAnalyses(fx.db, P1)).toBe(analysesAfterFirst);
  });

  it("the SAME digest at a DIFFERENT corpus hash creates exactly ONE more analysis", async () => {
    await upsertArtifact(fx.db, P1, SHA_A, 1024, "js", 1000);
    await claimAnalysis(fx.db, P1, SHA_A, DETECTOR_CORPUS_VERSION, 1000);
    await finishAnalysis(
      fx.db,
      P1,
      SHA_A,
      DETECTOR_CORPUS_VERSION,
      "done",
      1500,
      1,
      1024,
      null,
    );
    const before = await countAnalyses(fx.db, P1);

    // A corpus bump. Because the version is part of the KEY, the old analysis is
    // not a cache hit for the new corpus and a stale hit is not expressible.
    const nextCorpus = "9".repeat(64);
    expect(await isAnalysed(fx.db, P1, SHA_A, nextCorpus)).toBe(false);
    const claim = await claimAnalysis(fx.db, P1, SHA_A, nextCorpus, 3000);
    expect(claim.ok && claim.claimed).toBe(true);
    expect(await countAnalyses(fx.db, P1)).toBe(before + 1);
  });

  it("a claim on an already-claimed row does NOT win and does NOT disturb it", async () => {
    await upsertArtifact(fx.db, P1, SHA_A, 1024, "js", 1000);
    const a = await claimAnalysis(
      fx.db,
      P1,
      SHA_A,
      DETECTOR_CORPUS_VERSION,
      1000,
    );
    const b = await claimAnalysis(
      fx.db,
      P1,
      SHA_A,
      DETECTOR_CORPUS_VERSION,
      2000,
    );
    expect(a.ok && a.claimed).toBe(true);
    expect(b.ok && b.claimed).toBe(false);
    // DO NOTHING, not DO UPDATE: the incumbent's started_at survives.
    expect(b.ok ? b.state : undefined).toBe("pending");
    expect(await countAnalyses(fx.db, P1)).toBe(1);
  });

  it("a PENDING analysis is not a cache hit — only a terminal state is", async () => {
    await upsertArtifact(fx.db, P1, SHA_A, 1024, "js", 1000);
    await claimAnalysis(fx.db, P1, SHA_A, DETECTOR_CORPUS_VERSION, 1000);
    // Claimed but never finished — the durable-job-queue row ERR-02 recovers.
    expect(await isAnalysed(fx.db, P1, SHA_A, DETECTOR_CORPUS_VERSION)).toBe(
      false,
    );

    await finishAnalysis(
      fx.db,
      P1,
      SHA_A,
      DETECTOR_CORPUS_VERSION,
      "partial",
      1500,
      30_000,
      512,
      "deadline",
    );
    expect(await isAnalysed(fx.db, P1, SHA_A, DETECTOR_CORPUS_VERSION)).toBe(
      true,
    );
  });

  it("an analysis in one project is not a cache hit in another", async () => {
    await upsertArtifact(fx.db, P1, SHA_A, 1024, "js", 1000);
    await claimAnalysis(fx.db, P1, SHA_A, DETECTOR_CORPUS_VERSION, 1000);
    await finishAnalysis(
      fx.db,
      P1,
      SHA_A,
      DETECTOR_CORPUS_VERSION,
      "done",
      1500,
      1,
      1024,
      null,
    );
    expect(await isAnalysed(fx.db, P1, SHA_A, DETECTOR_CORPUS_VERSION)).toBe(
      true,
    );
    expect(await isAnalysed(fx.db, P2, SHA_A, DETECTOR_CORPUS_VERSION)).toBe(
      false,
    );
  });
});
