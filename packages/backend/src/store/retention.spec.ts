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
  DEFAULT_RETENTION_MAX_AGE_MS,
  DEFAULT_RETENTION_MAX_ROWS,
  getRetentionBounds,
  GLOBAL_PROJECT_ID,
  putSetting,
  RETENTION_MAX_ROWS_KEY,
  type RetentionBounds,
} from "./settings";

const P1 = "project-one";
const P2 = "project-two";
const NOW = 1_800_000_000_000;

/** Generous enough that only the bound under test binds. */
const HUGE_AGE = 10 * 365 * 24 * 60 * 60 * 1000;

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
    const bounds: RetentionBounds = { maxRows: 40, maxAgeMs: HUGE_AGE };

    const { passes } = await sweepToConvergence(P1, bounds);
    expect(passes).toBeGreaterThan(0);
    expect((await retentionCounts(fx.db, P1)).artifacts).toBe(40);
  });

  it("trims the OLDEST first — the survivors are the most recently seen", async () => {
    // last_seen_at increases with i, so digest 0 is the oldest.
    const digests = seedArtifacts(P1, 10, NOW - 10_000, 1);
    await sweepToConvergence(P1, { maxRows: 3, maxAgeMs: HUGE_AGE });

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
      { maxRows: 40, maxAgeMs: HUGE_AGE },
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

    await sweepToConvergence(P1, { maxRows: 5, maxAgeMs: HUGE_AGE });

    expect((await retentionCounts(fx.db, P1)).artifacts).toBe(5);
    // Counted BEFORE and AFTER, not merely asserted at the end.
    expect(await retentionCounts(fx.db, P2)).toEqual(before);
  });

  it("a sweep of the reserved global scope is a no-op", async () => {
    seedArtifacts(P1, 10, NOW - 100_000);
    const summary = await sweepRetention(
      fx.db,
      GLOBAL_PROJECT_ID,
      { maxRows: 1, maxAgeMs: 1 },
      NOW,
    );
    expect(summary).toEqual({ examined: 0, deleted: 0, moreWork: false });
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
      { maxRows: 10, maxAgeMs: HUGE_AGE },
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
    });
    expect(rest.passes).toBeGreaterThan(0);
    expect((await retentionCounts(fx.db, P1)).artifacts).toBe(10);

    const settled = await sweepRetention(
      fx.db,
      P1,
      { maxRows: 10, maxAgeMs: HUGE_AGE },
      NOW,
    );
    expect(settled.deleted).toBe(0);
    expect(settled.moreWork).toBe(false);
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
    });

    await sweepToConvergence(P1, {
      maxRows: DEFAULT_RETENTION_MAX_ROWS,
      maxAgeMs,
    });

    // The three old artifacts and everything hanging off them are gone; the three
    // recent ones keep BOTH of their sightings and their analysis.
    expect(await retentionCounts(fx.db, P1)).toEqual({
      artifacts: 3,
      observations: 6,
      analyses: 3,
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

    await sweepToConvergence(P1, { maxRows: 2, maxAgeMs: HUGE_AGE });

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
