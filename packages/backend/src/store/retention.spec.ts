// packages/backend/src/store/retention.spec.ts — STORE-06's behavioural gate.
//
// The mitigation for T-01-22 is only real once it is INVOKED, and the invocation
// is plan 01-03's consumer loop. What this file proves is the half this plan owns:
// that the sweep does the right thing WHEN it is called, with a signature 01-03 can
// call unchanged.
//
// Five properties, each a distinct way a retention sweep can be wrong:
//   - the row-count bound alone trims to EXACTLY the bound (not near it);
//   - the age bound keeps a row exactly AT the cutoff and removes one older;
//   - sweeping one project does not touch another;
//   - a pass never exceeds its cap and SAYS SO when the cap binds, and repeated
//     passes converge and then report no work remaining;
//   - the cascade leaves no orphan, asserted by counting orphans directly rather
//     than by trusting the delete order.

import {
  AUDIT_RETENTION_MAX_ROWS_KEY,
  RETENTION_MAX_ROWS_KEY,
} from "@defminer/engine/contract";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createFixtureDb,
  type SqliteFixture,
} from "../../test/fixtures/sqlite-fixture";

import { claimAnalysis, DETECTOR_CORPUS_VERSION } from "./analyses";
import { migrate } from "./migrations";
import {
  RETENTION_PASS_LIMITS,
  retentionCounts,
  sweepRetention,
} from "./retention";
import {
  DEFAULT_AUDIT_RETENTION_MAX_ROWS,
  DEFAULT_RETENTION_MAX_AGE_MS,
  DEFAULT_RETENTION_MAX_ROWS,
  getRetentionBounds,
  GLOBAL_PROJECT_ID,
  putSetting,
  type RetentionBounds,
} from "./settings";

const P1 = "project-one";
const P2 = "project-two";
const NOW = 1_800_000_000_000;

/** Generous enough that only the bound under test binds. */
const HUGE_AGE = 10 * 365 * 24 * 60 * 60 * 1000;

/** The same, for the audit row bound: a test about the AGE exemption must not
 *  accidentally be a test about the row cap. */
const HUGE_ROWS = 1_000_000;

let fx: SqliteFixture;

beforeEach(async () => {
  fx = createFixtureDb();
  const report = await migrate(fx.db);
  expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  return () => {
    fx.close();
  };
});

/** Seed artifacts directly. Deliberately NOT through `upsertArtifact`: this is
 *  arranging a database state, not exercising the write path, and going through
 *  the public write would make every seed loop an implicit test of something else. */
function seedArtifacts(
  projectId: string,
  count: number,
  firstLastSeen: number,
  stepMs = 1,
): string[] {
  const stmt = fx.raw.prepare(
    `INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
  );
  const digests: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const sha = String(i).padStart(64, "0");
    stmt.run(
      projectId,
      sha,
      100,
      "js",
      firstLastSeen,
      firstLastSeen + i * stepMs,
    );
    digests.push(sha);
  }
  return digests;
}

function seedObservation(
  projectId: string,
  sha256: string,
  requestId: string,
  observedAt: number,
): void {
  fx.raw
    .prepare(
      `INSERT INTO observations (project_id, sha256, request_id, url, status, content_type, observed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      projectId,
      sha256,
      requestId,
      "https://example.test/a.js",
      200,
      null,
      observedAt,
    );
}

/** Seed audit events directly, for the same reason `seedArtifacts` does: this is
 *  arranging a database state, not exercising `recordAudit`. Event ids increase
 *  with `i`, and so does `at`, so event 0 is the oldest on both keys. */
function seedAudit(
  projectId: string,
  count: number,
  firstAt: number,
  stepMs = 1,
): string[] {
  const stmt = fx.raw.prepare(
    `INSERT INTO audit (project_id, event_id, at, kind, subject, detail)
     VALUES (?, ?, ?, ?, ?, NULL)`,
  );
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const id = "evt-" + String(i).padStart(6, "0");
    stmt.run(
      projectId,
      id,
      firstAt + i * stepMs,
      "finding_projected",
      "fp:" + id,
    );
    ids.push(id);
  }
  return ids;
}

function auditCount(projectId: string): number {
  const row = fx.raw
    .prepare("SELECT COUNT(*) AS n FROM audit WHERE project_id = ?")
    .get(projectId) as { n: number };
  return Number(row.n);
}

function orphanCount(projectId: string): {
  observations: number;
  analyses: number;
} {
  const obs = fx.raw
    .prepare(
      `SELECT COUNT(*) AS n FROM observations o
       WHERE o.project_id = ?
         AND NOT EXISTS (SELECT 1 FROM artifacts a WHERE a.project_id = o.project_id AND a.sha256 = o.sha256)`,
    )
    .get(projectId) as { n: number };
  const ana = fx.raw
    .prepare(
      `SELECT COUNT(*) AS n FROM analyses x
       WHERE x.project_id = ?
         AND NOT EXISTS (SELECT 1 FROM artifacts a WHERE a.project_id = x.project_id AND a.sha256 = x.sha256)`,
    )
    .get(projectId) as { n: number };
  return { observations: Number(obs.n), analyses: Number(ana.n) };
}

/** Run passes until the sweep reports no more work, with a hard stop so a
 *  non-converging implementation FAILS instead of hanging the suite. */
async function sweepToConvergence(
  projectId: string,
  bounds: RetentionBounds,
  nowMs = NOW,
): Promise<{ passes: number; deleted: number }> {
  let passes = 0;
  let deleted = 0;
  for (;;) {
    const s = await sweepRetention(fx.db, projectId, bounds, nowMs);
    passes += 1;
    deleted += s.deleted;
    if (!s.moreWork) break;
    expect(
      passes,
      "sweep did not converge in 50 passes — the delete rate is not above the insert rate",
    ).toBeLessThan(50);
  }
  return { passes, deleted };
}

describe("the row-count bound", () => {
  it("100 artifacts against a bound of 40 leaves EXACTLY 40", async () => {
    seedArtifacts(P1, 100, NOW - 1000);
    const bounds: RetentionBounds = {
      maxRows: 40,
      maxAgeMs: HUGE_AGE,
      auditMaxRows: HUGE_ROWS,
    };

    const { passes } = await sweepToConvergence(P1, bounds);
    expect(passes).toBeGreaterThan(0);
    expect((await retentionCounts(fx.db, P1)).artifacts).toBe(40);
  });

  it("trims the OLDEST first — the survivors are the most recently seen", async () => {
    // last_seen_at increases with i, so digest 0 is the oldest.
    const digests = seedArtifacts(P1, 10, NOW - 10_000, 1);
    await sweepToConvergence(P1, {
      maxRows: 3,
      maxAgeMs: HUGE_AGE,
      auditMaxRows: HUGE_ROWS,
    });

    const survivors = (
      fx.raw
        .prepare(
          "SELECT sha256 FROM artifacts WHERE project_id = ? ORDER BY sha256 ASC",
        )
        .all(P1) as { sha256: string }[]
    ).map((r) => String(r.sha256));
    expect(survivors).toEqual(digests.slice(7));
  });

  it("does nothing when the project is inside both bounds", async () => {
    seedArtifacts(P1, 5, NOW - 1000);
    const summary = await sweepRetention(
      fx.db,
      P1,
      { maxRows: 40, maxAgeMs: HUGE_AGE, auditMaxRows: HUGE_ROWS },
      NOW,
    );
    expect(summary.deleted).toBe(0);
    expect(summary.moreWork).toBe(false);
    expect((await retentionCounts(fx.db, P1)).artifacts).toBe(5);
  });
});

describe("the age bound", () => {
  it("a row EXACTLY at the cutoff is KEPT; one millisecond older is removed", async () => {
    const maxAgeMs = 10_000;
    const cutoff = NOW - maxAgeMs;
    const stmt = fx.raw.prepare(
      `INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    );
    stmt.run(P1, "a".repeat(64), 10, "js", 0, cutoff); // exactly at the cutoff
    stmt.run(P1, "b".repeat(64), 10, "js", 0, cutoff - 1); // one ms older
    stmt.run(P1, "c".repeat(64), 10, "js", 0, cutoff + 1); // one ms newer

    await sweepToConvergence(P1, {
      maxRows: DEFAULT_RETENTION_MAX_ROWS,
      maxAgeMs,
      auditMaxRows: HUGE_ROWS,
    });

    const left = (
      fx.raw
        .prepare(
          "SELECT sha256 FROM artifacts WHERE project_id = ? ORDER BY sha256 ASC",
        )
        .all(P1) as { sha256: string }[]
    ).map((r) => String(r.sha256)[0]);
    // The boundary is STRICT. `a` sits exactly on it and survives.
    expect(left).toEqual(["a", "c"]);
  });

  it("the age bound applies to observations in their own right", async () => {
    const maxAgeMs = 10_000;
    const cutoff = NOW - maxAgeMs;
    // The artifact itself is recent, so only the per-table age bound can remove
    // these sightings.
    seedArtifacts(P1, 1, NOW - 5);
    const sha = String(0).padStart(64, "0");
    seedObservation(P1, sha, "old", cutoff - 1);
    seedObservation(P1, sha, "edge", cutoff);
    seedObservation(P1, sha, "new", NOW);

    await sweepToConvergence(P1, {
      maxRows: DEFAULT_RETENTION_MAX_ROWS,
      maxAgeMs,
      auditMaxRows: HUGE_ROWS,
    });

    const ids = (
      fx.raw
        .prepare(
          "SELECT request_id FROM observations WHERE project_id = ? ORDER BY request_id ASC",
        )
        .all(P1) as { request_id: string }[]
    ).map((r) => String(r.request_id));
    expect(ids).toEqual(["edge", "new"]);
    // And the artifact is untouched — it is inside both bounds.
    expect((await retentionCounts(fx.db, P1)).artifacts).toBe(1);
  });
});

describe("project isolation (T-01-20)", () => {
  it("sweeping project A leaves project B's rows untouched", async () => {
    seedArtifacts(P1, 50, NOW - 100_000);
    seedArtifacts(P2, 50, NOW - 100_000);
    seedObservation(P2, String(0).padStart(64, "0"), "b-req", NOW - 100_000);

    const before = await retentionCounts(fx.db, P2);
    expect(before.artifacts).toBe(50);
    expect(before.observations).toBe(1);

    await sweepToConvergence(P1, {
      maxRows: 5,
      maxAgeMs: HUGE_AGE,
      auditMaxRows: HUGE_ROWS,
    });

    expect((await retentionCounts(fx.db, P1)).artifacts).toBe(5);
    // Counted BEFORE and AFTER, not merely asserted at the end.
    expect(await retentionCounts(fx.db, P2)).toEqual(before);
  });

  it("a sweep of the reserved global scope is a no-op", async () => {
    seedArtifacts(P1, 10, NOW - 100_000);
    const summary = await sweepRetention(
      fx.db,
      GLOBAL_PROJECT_ID,
      { maxRows: 1, maxAgeMs: 1, auditMaxRows: 1 },
      NOW,
    );
    expect(summary).toEqual({
      examined: 0,
      deleted: 0,
      auditDeleted: 0,
      moreWork: false,
      errors: 0,
      lastError: null,
    });
    expect((await retentionCounts(fx.db, P1)).artifacts).toBe(10);
  });
});

describe("the per-pass cap and convergence", () => {
  it("a single pass never deletes more than the cap and reports remaining work", async () => {
    const cap = RETENTION_PASS_LIMITS.maxRowsPerPass;
    // Enough eligible rows that the cap MUST bind: each artifact costs itself
    // plus one observation, so cap+50 artifacts is well over one pass.
    const n = cap + 50;
    const digests = seedArtifacts(P1, n, NOW - 100_000);
    for (const sha of digests)
      seedObservation(P1, sha, "r-" + sha, NOW - 100_000);

    const first = await sweepRetention(
      fx.db,
      P1,
      { maxRows: 10, maxAgeMs: HUGE_AGE, auditMaxRows: HUGE_ROWS },
      NOW,
    );
    expect(first.deleted).toBeGreaterThan(0);
    expect(first.deleted).toBeLessThanOrEqual(cap);
    expect(first.moreWork).toBe(true);
    expect(first.examined).toBeGreaterThanOrEqual(first.deleted / 2);

    // Two or three more passes converge, and the last one says so.
    const rest = await sweepToConvergence(P1, {
      maxRows: 10,
      maxAgeMs: HUGE_AGE,
      auditMaxRows: HUGE_ROWS,
    });
    expect(rest.passes).toBeGreaterThan(0);
    expect((await retentionCounts(fx.db, P1)).artifacts).toBe(10);

    const settled = await sweepRetention(
      fx.db,
      P1,
      { maxRows: 10, maxAgeMs: HUGE_AGE, auditMaxRows: HUGE_ROWS },
      NOW,
    );
    expect(settled.deleted).toBe(0);
    expect(settled.moreWork).toBe(false);
  });

  it("bounds the CASCADE: one artifact with a large fan-out cannot overrun the cap", async () => {
    // THE FIXTURE THAT COULD FAIL. The case above seeds exactly ONE observation
    // per artifact, so the largest overshoot it can possibly detect is one row —
    // it passed against a cascade that deleted every sighting of a digest in a
    // single unbounded statement, which measured `deleted: 3001` against a cap of
    // 512. Real traffic makes this the NORMAL shape: the artifact row is upserted
    // on every re-serve while each re-serve adds an observation.
    const cap = RETENTION_PASS_LIMITS.maxRowsPerPass;
    const [sha] = seedArtifacts(P1, 1, NOW - 100_000);
    const fanOut = cap * 3;
    for (let i = 0; i < fanOut; i += 1) {
      seedObservation(P1, String(sha), "r-" + String(i), NOW - 100_000);
    }
    await claimAnalysis(fx.db, P1, String(sha), DETECTOR_CORPUS_VERSION, 1);

    const bounds: RetentionBounds = {
      maxRows: 0,
      maxAgeMs: 1,
      auditMaxRows: HUGE_ROWS,
    };
    const first = await sweepRetention(fx.db, P1, bounds, NOW);

    expect(
      first.deleted,
      `one pass removed ${String(first.deleted)} rows against a cap of ` +
        `${String(cap)}. RetentionSweepSummary states that deleted is never ` +
        `greater than RETENTION_SWEEP_MAX_ROWS, and the whole point of the cap ` +
        `is that no pass becomes the long synchronous stretch it exists to ` +
        `prevent — a bound the TARGET can overrun by re-serving one bundle is ` +
        `not a bound.`,
    ).toBeLessThanOrEqual(cap);
    expect(first.moreWork).toBe(true);
    // `examined` is in ROWS, so a pass that deleted hundreds may not report that
    // it looked at one.
    expect(
      first.examined,
      "examined reported fewer rows than the pass deleted, which is the " +
        "incoherence that made `deleted 3001 of 1 examined` a legal log line.",
    ).toBeGreaterThanOrEqual(first.deleted);
    // The parent outlives its children: a capped cascade must never orphan.
    expect(orphanCount(P1)).toEqual({ observations: 0, analyses: 0 });

    // And it still converges — deferral, not a loop to convergence inside a pass.
    await sweepToConvergence(P1, bounds);
    expect(await retentionCounts(fx.db, P1)).toEqual({
      artifacts: 0,
      observations: 0,
      analyses: 0,
      audit: 0,
    });
  });

  it("the per-pass cap dominates what one interval can insert", () => {
    // The convergence inequality, asserted against the SAME constants the sweep
    // reads. thresholds.spec.ts owns the full derivation; this asserts the sweep
    // is not using different numbers from the ones that were reasoned about.
    expect(RETENTION_PASS_LIMITS.insertedPerArtifact).toBe(3);
    expect(RETENTION_PASS_LIMITS.maxRowsPerPass).toBeGreaterThanOrEqual(
      RETENTION_PASS_LIMITS.insertedPerArtifact,
    );
  });
});

describe("a sweep that cannot delete", () => {
  /** The fixture database, with every DELETE rejecting. Models the structural
   *  failures that make retention stop bounding anything: a locked database, or
   *  a schema the migration ladder left partial — which index.ts explicitly
   *  allows the plugin to keep running on. */
  function dbWhereDeletesFail(): SqliteFixture["db"] {
    return {
      exec: fx.db.exec.bind(fx.db),
      prepare: async (sql: string) => {
        const stmt = await fx.db.prepare(sql);
        if (!/^\s*DELETE\b/i.test(sql)) return stmt;
        return {
          get: stmt.get.bind(stmt),
          all: stmt.all.bind(stmt),
          run: () => Promise.reject(new Error("database is locked")),
        };
      },
    };
  }

  it("COUNTS and RECORDS the failures instead of reporting a clean pass", async () => {
    // Two swallows used to sit on this path: deleteOne's empty `catch {}`, which
    // made a failure indistinguishable from "nothing to delete", and the outer
    // handler's `void e`, which discarded the error object outright. A sweep
    // failing on every row therefore produced retentionSweeps climbing,
    // retentionDeleted stuck at 0, no lastError, no storeErrors, and
    // "more remains for the next cadence boundary" for ever.
    const digests = seedArtifacts(P1, 5, NOW - 100_000);
    for (const sha of digests)
      seedObservation(P1, sha, "r-" + sha, NOW - 100_000);

    const summary = await sweepRetention(
      dbWhereDeletesFail(),
      P1,
      { maxRows: 0, maxAgeMs: 1, auditMaxRows: HUGE_ROWS },
      NOW,
    );

    expect(
      summary.errors,
      "every delete in the pass failed and the summary reported no error at " +
        "all. Retention is the ONLY bound on this database's growth, and on a " +
        "runtime whose HANDLER_ERROR_SURFACED is 'neither' this summary is the " +
        "only record that will ever exist.",
    ).toBeGreaterThan(0);
    expect(String(summary.lastError)).toContain("database is locked");
    expect(summary.deleted).toBe(0);
    expect(summary.moreWork).toBe(true);
    // Nothing was removed, and the pass did not throw.
    expect(await retentionCounts(fx.db, P1)).toEqual({
      artifacts: 5,
      observations: 5,
      analyses: 0,
      audit: 0,
    });
  });

  it("reports zero errors on a pass that works — the counter is not always-on", async () => {
    seedArtifacts(P1, 3, NOW - 100_000);
    const summary = await sweepRetention(
      fx.db,
      P1,
      { maxRows: 0, maxAgeMs: 1, auditMaxRows: HUGE_ROWS },
      NOW,
    );
    expect(summary.deleted).toBe(3);
    expect(summary.errors).toBe(0);
    expect(summary.lastError).toBeNull();
  });
});

describe("the cascade leaves no orphan", () => {
  it("deleting an artifact removes its observations and analyses", async () => {
    // Driven by the AGE bound, not the row bound, so the cascade is what removes
    // the children rather than the child tables' own per-table row cap. Three old
    // artifacts with old sightings, three recent ones with recent sightings.
    const maxAgeMs = 10_000;
    const cutoff = NOW - maxAgeMs;
    const stmt = fx.raw.prepare(
      `INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    );
    const old: string[] = [];
    const fresh: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const o = ("o" + String(i)).padStart(64, "0");
      const f = ("f" + String(i)).padStart(64, "0");
      stmt.run(P1, o, 100, "js", 0, cutoff - 1000 - i);
      stmt.run(P1, f, 100, "js", 0, NOW - i);
      old.push(o);
      fresh.push(f);
    }
    for (const sha of old) {
      seedObservation(P1, sha, "r1-" + sha, cutoff - 1000);
      seedObservation(P1, sha, "r2-" + sha, cutoff - 1000);
      expect(
        (
          await claimAnalysis(
            fx.db,
            P1,
            sha,
            DETECTOR_CORPUS_VERSION,
            cutoff - 1000,
          )
        ).ok,
      ).toBe(true);
    }
    for (const sha of fresh) {
      seedObservation(P1, sha, "r1-" + sha, NOW);
      seedObservation(P1, sha, "r2-" + sha, NOW);
      expect(
        (await claimAnalysis(fx.db, P1, sha, DETECTOR_CORPUS_VERSION, NOW)).ok,
      ).toBe(true);
    }
    expect(await retentionCounts(fx.db, P1)).toEqual({
      artifacts: 6,
      observations: 12,
      analyses: 6,
      audit: 0,
    });

    await sweepToConvergence(P1, {
      maxRows: DEFAULT_RETENTION_MAX_ROWS,
      maxAgeMs,
      auditMaxRows: HUGE_ROWS,
    });

    // The three old artifacts and everything hanging off them are gone; the three
    // recent ones keep BOTH of their sightings and their analysis.
    expect(await retentionCounts(fx.db, P1)).toEqual({
      artifacts: 3,
      observations: 6,
      analyses: 3,
      audit: 0,
    });
    // Counted DIRECTLY, not inferred from the delete order.
    expect(orphanCount(P1)).toEqual({ observations: 0, analyses: 0 });
  });

  it("the row bound is PER TABLE, so the child tables are capped in their own right", async () => {
    // Six artifacts, two sightings each, against a bound of 2. The artifact table
    // trims to 2 — and so does the observation table, which is what "a maximum
    // row count per table per project" means. Without this, a project inside the
    // artifact bound could still hold an unbounded number of sightings of those
    // artifacts, which is exactly the shape real traffic produces.
    const digests = seedArtifacts(P1, 6, NOW - 100_000);
    for (const sha of digests) {
      seedObservation(P1, sha, "r1-" + sha, NOW - 100_000);
      seedObservation(P1, sha, "r2-" + sha, NOW - 100_000);
    }
    expect((await retentionCounts(fx.db, P1)).observations).toBe(12);

    await sweepToConvergence(P1, {
      maxRows: 2,
      maxAgeMs: HUGE_AGE,
      auditMaxRows: HUGE_ROWS,
    });

    const after = await retentionCounts(fx.db, P1);
    expect(after.artifacts).toBe(2);
    expect(after.observations).toBeLessThanOrEqual(2);
    expect(orphanCount(P1)).toEqual({ observations: 0, analyses: 0 });
  });

  it("an orphan left by an earlier interrupted pass is cleaned up", async () => {
    seedArtifacts(P1, 1, NOW - 10);
    const sha = String(0).padStart(64, "0");
    // A child whose parent never existed — the shape a crash mid-cascade in some
    // future version would leave behind.
    seedObservation(P1, "f".repeat(64), "orphan", NOW - 10);
    seedObservation(P1, sha, "kept", NOW - 10);
    expect(orphanCount(P1).observations).toBe(1);

    await sweepToConvergence(P1, {
      maxRows: DEFAULT_RETENTION_MAX_ROWS,
      maxAgeMs: DEFAULT_RETENTION_MAX_AGE_MS,
      auditMaxRows: HUGE_ROWS,
    });

    expect(orphanCount(P1)).toEqual({ observations: 0, analyses: 0 });
    expect((await retentionCounts(fx.db, P1)).observations).toBe(1);
  });
});

describe("bounds come from settings with documented defaults", () => {
  it("an unset bound falls back to the documented default", async () => {
    expect(await getRetentionBounds(fx.db, P1)).toEqual({
      maxRows: DEFAULT_RETENTION_MAX_ROWS,
      maxAgeMs: DEFAULT_RETENTION_MAX_AGE_MS,
      auditMaxRows: DEFAULT_AUDIT_RETENTION_MAX_ROWS,
    });
  });

  it("a project row overrides a global row, which overrides the default", async () => {
    expect(
      (
        await putSetting(
          fx.db,
          GLOBAL_PROJECT_ID,
          RETENTION_MAX_ROWS_KEY,
          "900",
          NOW,
        )
      ).ok,
    ).toBe(true);
    expect((await getRetentionBounds(fx.db, P1)).maxRows).toBe(900);

    expect(
      (await putSetting(fx.db, P1, RETENTION_MAX_ROWS_KEY, "77", NOW)).ok,
    ).toBe(true);
    expect((await getRetentionBounds(fx.db, P1)).maxRows).toBe(77);
    // P2 still sees the global value.
    expect((await getRetentionBounds(fx.db, P2)).maxRows).toBe(900);
  });

  it("a malformed stored bound falls back rather than deleting everything", async () => {
    // `Number("")` is 0 and `Number("abc")` is NaN. Either one applied as a row
    // cap would trim the project to nothing on the next sweep.
    for (const bad of ["", "abc", "-5", "0"]) {
      await putSetting(fx.db, P1, RETENTION_MAX_ROWS_KEY, bad, NOW);
      expect(
        (await getRetentionBounds(fx.db, P1)).maxRows,
        `stored bound ${JSON.stringify(bad)} was accepted`,
      ).toBe(DEFAULT_RETENTION_MAX_ROWS);
    }
  });
});

describe("D-06 — the audit table is bounded by ROWS and NOT by age", () => {
  it("THE CONTRAST: equally old rows, and only the artifact ones are swept", async () => {
    // THIS IS THE TEST THAT MAKES D-06 A CLAIM ABOUT BEHAVIOUR RATHER THAN ABOUT
    // TEXT. Asserting that no `AUDIT_OVER_AGE` statement exists proves only that
    // somebody did not write one. Seeding audit rows and artifact rows at the
    // SAME timestamp, sweeping once, and finding one set gone and the other
    // intact proves the exemption is in force — and it fails the day a
    // well-meaning edit adds the age bound "for consistency".
    const ANCIENT = NOW - 400 * 24 * 60 * 60 * 1000;
    seedArtifacts(P1, 10, ANCIENT, 0);
    seedAudit(P1, 10, ANCIENT, 0);

    const bounds: RetentionBounds = {
      maxRows: HUGE_ROWS,
      maxAgeMs: DEFAULT_RETENTION_MAX_AGE_MS,
      auditMaxRows: HUGE_ROWS,
    };
    await sweepToConvergence(P1, bounds);

    // The artifacts are older than the age bound and are gone.
    expect((await retentionCounts(fx.db, P1)).artifacts).toBe(0);
    // The audit rows are EXACTLY as old and every one of them survives.
    expect(auditCount(P1)).toBe(10);
  });

  it("the ROW bound still applies — the oldest audit rows go first", async () => {
    // The exemption is from the AGE bound only. Growth is still bounded, which
    // is what makes "no age bound" survivable on a database Caido never
    // garbage-collects.
    const ids = seedAudit(P1, 20, NOW - 20_000, 1);
    await sweepToConvergence(P1, {
      maxRows: HUGE_ROWS,
      maxAgeMs: HUGE_AGE,
      auditMaxRows: 5,
    });

    expect(auditCount(P1)).toBe(5);
    const survivors = (
      fx.raw
        .prepare(
          "SELECT event_id FROM audit WHERE project_id = ? ORDER BY event_id ASC",
        )
        .all(P1) as { event_id: string }[]
    ).map((r) => String(r.event_id));
    // The five NEWEST, i.e. the last five seeded.
    expect(survivors).toEqual(ids.slice(15));
  });

  it("candidate selection is oldest-first with an explicit tie-break, so a capped pass RESUMES correctly", async () => {
    // Every audit row shares one timestamp, so `at` alone cannot order them and
    // a resumption would be a matter of luck. The tie-break on `event_id` is
    // what makes two consecutive passes agree on which rows come next.
    const TIE = NOW - 5_000;
    const ids = seedAudit(P1, 12, TIE, 0);
    const bounds: RetentionBounds = {
      maxRows: HUGE_ROWS,
      maxAgeMs: HUGE_AGE,
      auditMaxRows: 4,
    };

    await sweepToConvergence(P1, bounds);
    expect(auditCount(P1)).toBe(4);

    const survivors = (
      fx.raw
        .prepare(
          "SELECT event_id FROM audit WHERE project_id = ? ORDER BY event_id ASC",
        )
        .all(P1) as { event_id: string }[]
    ).map((r) => String(r.event_id));
    // Deterministic despite the shared timestamp: the four HIGHEST event ids.
    expect(survivors).toEqual(ids.slice(8));
  });

  it("sweeping one project's audit log does not touch another's", async () => {
    seedAudit(P1, 10, NOW - 10_000, 1);
    seedAudit(P2, 10, NOW - 10_000, 1);
    await sweepToConvergence(P1, {
      maxRows: HUGE_ROWS,
      maxAgeMs: HUGE_AGE,
      auditMaxRows: 2,
    });
    expect(auditCount(P1)).toBe(2);
    expect(auditCount(P2)).toBe(10);
  });

  it("reports audit deletions as their OWN counted category", async () => {
    // Distinguishable from the other tables' deletions, so an operator-facing
    // health surface can say "and N audit events aged out of the row cap"
    // rather than folding them into a single opaque number.
    seedAudit(P1, 9, NOW - 9_000, 1);
    const summary = await sweepRetention(
      fx.db,
      P1,
      { maxRows: HUGE_ROWS, maxAgeMs: HUGE_AGE, auditMaxRows: 4 },
      NOW,
    );
    expect(summary.auditDeleted).toBe(5);
    expect(summary.deleted).toBeGreaterThanOrEqual(summary.auditDeleted);
    expect(summary.errors).toBe(0);
  });

  it("a FAILING audit delete is counted and the pass continues — the sweep still never throws", async () => {
    seedAudit(P1, 9, NOW - 9_000, 1);
    // Same shape as `dbWhereDeletesFail` above, narrowed to the AUDIT delete so
    // the other tables' sweeps still run and "the pass continues" is a claim
    // about work that actually happened.
    const failing: SqliteFixture["db"] = {
      exec: fx.db.exec.bind(fx.db),
      prepare: async (sql: string) => {
        const stmt = await fx.db.prepare(sql);
        if (!/^\s*DELETE FROM audit\b/i.test(sql.trim())) return stmt;
        return {
          get: stmt.get.bind(stmt),
          all: stmt.all.bind(stmt),
          run: () => Promise.reject(new Error("database is locked")),
        };
      },
    };

    const summary = await sweepRetention(
      failing,
      P1,
      { maxRows: HUGE_ROWS, maxAgeMs: HUGE_AGE, auditMaxRows: 4 },
      NOW,
    );

    // Not thrown — reported.
    expect(summary.errors).toBeGreaterThan(0);
    expect(summary.lastError).not.toBeNull();
    expect(summary.auditDeleted).toBe(0);
    // And nothing was lost.
    expect(auditCount(P1)).toBe(9);
  });

  it("the reserved empty project scope still returns an empty summary", async () => {
    seedAudit(P1, 5, NOW - 5_000, 1);
    const summary = await sweepRetention(
      fx.db,
      GLOBAL_PROJECT_ID,
      { maxRows: 0, maxAgeMs: 1, auditMaxRows: 1 },
      NOW,
    );
    expect(summary).toEqual({
      examined: 0,
      deleted: 0,
      auditDeleted: 0,
      moreWork: false,
      errors: 0,
      lastError: null,
    });
    // P1's log is untouched — the reserved scope swept nothing at all.
    expect(auditCount(P1)).toBe(5);
  });

  it("the audit bound resolves from settings with its own key and its own default", async () => {
    expect((await getRetentionBounds(fx.db, P1)).auditMaxRows).toBe(
      DEFAULT_AUDIT_RETENTION_MAX_ROWS,
    );

    await putSetting(fx.db, P1, AUDIT_RETENTION_MAX_ROWS_KEY, "1234", NOW);
    expect((await getRetentionBounds(fx.db, P1)).auditMaxRows).toBe(1234);
    // The audit bound is its OWN key: overriding it does not move the per-table
    // bound, and vice versa.
    expect((await getRetentionBounds(fx.db, P1)).maxRows).toBe(
      DEFAULT_RETENTION_MAX_ROWS,
    );

    // Same `boundOrDefault` guard as the other two: a stored bound is a string
    // some future UI wrote, and `Number("")` is 0 — which as an audit row cap
    // would delete the entire audit log on the next sweep.
    for (const bad of ["", "abc", "-5", "0"]) {
      await putSetting(fx.db, P1, AUDIT_RETENTION_MAX_ROWS_KEY, bad, NOW);
      expect(
        (await getRetentionBounds(fx.db, P1)).auditMaxRows,
        `stored audit bound ${JSON.stringify(bad)} was accepted`,
      ).toBe(DEFAULT_AUDIT_RETENTION_MAX_ROWS);
    }
  });

  it("the audit row bound is DERIVED from the per-table default, not picked", () => {
    // The number's arithmetic is stated in `settings.ts`. Asserted here so the
    // relationship survives an edit to either constant: the audit bound is four
    // times the per-table default, because the audit table has no age bound and
    // must therefore carry alone the horizon that rows and age carry jointly
    // everywhere else.
    expect(DEFAULT_AUDIT_RETENTION_MAX_ROWS).toBe(
      DEFAULT_RETENTION_MAX_ROWS * 4,
    );
  });
});
