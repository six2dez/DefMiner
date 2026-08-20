// packages/backend/src/store/migrations.spec.ts — STORE-05's gate.
//
// "Tested against a populated database" is the whole requirement, and it is NOT
// the same as "the step exits 0". A migration can succeed and still lose rows; a
// migration can succeed on an EMPTY database and destroy a populated one. So the
// shape here is: apply step v1 ALONE, seed known rows, run the rest of the ladder,
// and assert every seeded row is still present and byte-for-byte unchanged.
//
// Three more properties, each a distinct way the ladder could be wrong:
//   - re-running against an already-current database is a NO-OP, not a
//     re-application (idempotence);
//   - a database at a version ABOVE this build's head is left alone and the state
//     is REPORTED, rather than silently downgraded (forward-only);
//   - a failing step stops the ladder and does not advance the version past it,
//     so the next boot retries it instead of running on a half-built schema.

import { describe, expect, it } from "vitest";

import {
  createFixtureDb,
  listTables,
  userVersion,
} from "../../test/fixtures/sqlite-fixture";

import { migrate, MIGRATIONS, SCHEMA_VERSION } from "./migrations";

/** Three artifact rows with distinct digests, byte lengths, kinds and clocks —
 *  distinct on every column, so a migration that shuffled or defaulted a value
 *  cannot hide behind two rows that happen to look alike. */
const SEED = [
  {
    project_id: "proj-alpha",
    sha256: "a".repeat(64),
    byte_len: 1024,
    kind: "js",
    first_seen_at: 1_700_000_000_000,
    last_seen_at: 1_700_000_000_500,
    seen_count: 1,
  },
  {
    project_id: "proj-alpha",
    sha256: "b".repeat(64),
    byte_len: 2_097_152,
    kind: "map",
    first_seen_at: 1_700_000_001_000,
    last_seen_at: 1_700_000_009_000,
    seen_count: 7,
  },
  {
    project_id: "proj-beta",
    sha256: "c".repeat(64),
    byte_len: 17,
    kind: "js",
    first_seen_at: 1_700_000_002_000,
    last_seen_at: 1_700_000_002_000,
    seen_count: 1,
  },
];

/** Apply ONLY step v1 and stop there, the way a database installed by plan
 *  01-01's build genuinely is. Uses the raw handle deliberately: this is
 *  simulating a PREVIOUS RELEASE, so it must not go through this build's
 *  `migrate()`. */
function applyV1Only(fx: ReturnType<typeof createFixtureDb>): void {
  const v1 = MIGRATIONS.find((m) => m.v === 1);
  expect(v1, "migration step v1 is missing").toBeDefined();
  fx.raw.exec(v1?.sql ?? "");
  fx.raw.exec("PRAGMA user_version = 1");
}

function seedArtifacts(fx: ReturnType<typeof createFixtureDb>): void {
  const stmt = fx.raw.prepare(
    `INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const r of SEED) {
    stmt.run(
      r.project_id,
      r.sha256,
      r.byte_len,
      r.kind,
      r.first_seen_at,
      r.last_seen_at,
      r.seen_count,
    );
  }
}

function readArtifacts(fx: ReturnType<typeof createFixtureDb>): object[] {
  return fx.raw
    .prepare(
      `SELECT project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count
       FROM artifacts ORDER BY project_id ASC, sha256 ASC`,
    )
    .all()
    .map((r) => ({ ...r }));
}

function countRows(
  fx: ReturnType<typeof createFixtureDb>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of listTables(fx.raw)) {
    const row = fx.raw.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get() as {
      n: number;
    };
    out[t] = Number(row.n);
  }
  return out;
}

describe("forward-only migration ladder (STORE-05)", () => {
  it("runs forward over a POPULATED database without losing or altering a row", async () => {
    const fx = createFixtureDb();
    try {
      applyV1Only(fx);
      seedArtifacts(fx);
      const before = readArtifacts(fx);
      expect(before.length).toBe(3);
      expect(userVersion(fx.raw)).toBe(1);

      const report = await migrate(fx.db);
      expect(report.ok, JSON.stringify(report.steps)).toBe(true);
      expect(report.from).toBe(1);
      expect(report.version).toBe(SCHEMA_VERSION);
      expect(report.ahead).toBe(false);

      // Every seeded row still present, with identical column values. Not a
      // count — the values, compared whole.
      expect(readArtifacts(fx)).toEqual(before);
      expect(userVersion(fx.raw)).toBe(SCHEMA_VERSION);

      // And the new tables arrived.
      const tables = listTables(fx.raw);
      expect(tables).toContain("analyses");
      expect(tables).toContain("settings");
    } finally {
      fx.close();
    }
  });

  it("a second run against an already-current database is a NO-OP", async () => {
    const fx = createFixtureDb();
    try {
      applyV1Only(fx);
      seedArtifacts(fx);
      await migrate(fx.db);

      const rowsBefore = readArtifacts(fx);
      const countsBefore = countRows(fx);
      const versionBefore = userVersion(fx.raw);

      const second = await migrate(fx.db);
      expect(second.ok).toBe(true);
      expect(second.from).toBe(SCHEMA_VERSION);
      expect(second.version).toBe(SCHEMA_VERSION);
      // No DDL step ran at all: the only recorded step is the version read.
      expect(second.steps.map((s) => s.step)).toEqual(["read_user_version"]);

      expect(readArtifacts(fx)).toEqual(rowsBefore);
      expect(countRows(fx)).toEqual(countsBefore);
      expect(userVersion(fx.raw)).toBe(versionBefore);
    } finally {
      fx.close();
    }
  });

  it("migrating an EMPTY database and a populated one reach the same head", async () => {
    const empty = createFixtureDb();
    const populated = createFixtureDb();
    try {
      const a = await migrate(empty.db);
      applyV1Only(populated);
      seedArtifacts(populated);
      const b = await migrate(populated.db);

      expect(a.version).toBe(SCHEMA_VERSION);
      expect(b.version).toBe(SCHEMA_VERSION);
      expect(listTables(empty.raw)).toEqual(listTables(populated.raw));
    } finally {
      empty.close();
      populated.close();
    }
  });

  it("refuses to move BACKWARDS and reports that state", async () => {
    const fx = createFixtureDb();
    try {
      await migrate(fx.db);
      // A database written by a NEWER DefMiner than this build.
      const ahead = SCHEMA_VERSION + 5;
      fx.raw.exec(`PRAGMA user_version = ${ahead}`);
      const countsBefore = countRows(fx);

      const report = await migrate(fx.db);
      expect(report.ahead).toBe(true);
      expect(report.from).toBe(ahead);
      // Unchanged — not downgraded to head.
      expect(report.version).toBe(ahead);
      expect(userVersion(fx.raw)).toBe(ahead);
      expect(countRows(fx)).toEqual(countsBefore);
      expect(report.steps.map((s) => s.step)).toEqual(["read_user_version"]);
    } finally {
      fx.close();
    }
  });

  it("every migration step is idempotent — applying the whole array twice by hand changes nothing", () => {
    const fx = createFixtureDb();
    try {
      // Bypasses the version ladder entirely and re-runs the raw DDL, which is
      // exactly what a crash between the DDL `exec` and the `user_version` `exec`
      // causes on the next boot. If any statement were not `IF NOT EXISTS` this
      // would throw.
      for (const m of MIGRATIONS) fx.raw.exec(m.sql);
      const tablesOnce = listTables(fx.raw);
      for (const m of MIGRATIONS) fx.raw.exec(m.sql);
      expect(listTables(fx.raw)).toEqual(tablesOnce);
      expect(tablesOnce.length).toBeGreaterThan(0);
    } finally {
      fx.close();
    }
  });

  it("a FAILING step stops the ladder and does not advance the version past it", async () => {
    const fx = createFixtureDb();
    try {
      applyV1Only(fx);
      // A handle whose exec rejects for step v2's DDL only. This is the failure
      // path executed, not merely described: without it, "the ladder stops at the
      // failing step" is a claim about code nobody has run.
      const failing = {
        prepare: (sql: string) => fx.db.prepare(sql),
        exec: async (sql: string) => {
          if (sql.includes("CREATE TABLE IF NOT EXISTS analyses")) {
            throw new Error("simulated DDL failure");
          }
          await fx.db.exec(sql);
        },
      } as unknown as typeof fx.db;

      const report = await migrate(failing);
      expect(report.ok).toBe(false);
      expect(report.version).toBe(1);
      // The version was NOT bumped, so the next boot retries the same step.
      expect(userVersion(fx.raw)).toBe(1);
      const failed = report.steps.find((s) => !s.ok);
      expect(failed?.step).toBe("ddl_v2");
    } finally {
      fx.close();
    }
  });

  it("the step array is strictly increasing and starts at 1", () => {
    expect(MIGRATIONS.length).toBeGreaterThan(0);
    expect(MIGRATIONS[0]?.v).toBe(1);
    for (let i = 1; i < MIGRATIONS.length; i += 1) {
      expect(MIGRATIONS[i]?.v).toBeGreaterThan(MIGRATIONS[i - 1]?.v ?? 0);
    }
    expect(SCHEMA_VERSION).toBe(MIGRATIONS[MIGRATIONS.length - 1]?.v);
  });
});
