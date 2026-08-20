// packages/backend/src/store/schema.spec.ts — STORE-01 and STORE-02's gate.
//
// THIS GATE READS STRUCTURE, NOT DDL TEXT. The distinction is the whole point: a
// `CREATE TABLE` whose comment claims a composite key it does not have passes any
// grep over migrations.ts and fails here, because here the key is read back out of
// SQLite as `PRAGMA table_info`'s one-based `pk` ordinal.
//
// Three properties, each one a separate failure:
//   1. STORE-02 — every table has `project_id` IN ITS PRIMARY KEY, by ordinal.
//   2. T-01-21  — every column is on an explicit allowlist, so a column able to
//                 hold a body, a header, a cookie or a secret cannot arrive by
//                 accident. Adding a column is a deliberate TWO-PLACE edit.
//   3. The table SET is exact. A fifth table fails as loudly as a missing one.
//
// Non-vacuity is asserted explicitly. A gate that enumerates an empty schema and
// finds nothing wrong with it has measured nothing — see 01-PATTERNS.md, and
// tests/schema.spec.ts:44-53 where the same guard exists for the same reason.

import { describe, expect, it } from "vitest";

import {
  createFixtureDb,
  listTables,
  tableInfo,
  userVersion,
} from "../../test/fixtures/sqlite-fixture";

import { migrate, MIGRATIONS, SCHEMA_VERSION } from "./migrations";

/** The four tables the operator approved at plan 01-01's one-way checkpoint
 *  (option-a, 2026-08-20). Exactly these, in this order. */
const EXPECTED_TABLES = ["analyses", "artifacts", "observations", "settings"];

/**
 * EVERY column of EVERY table, named.
 *
 * This is T-01-21's mitigation and it works by ABSENCE: a stolen copy of the
 * plugin database must be a list of URLs, digests and byte counts, not a
 * credential dump. Nothing below can hold a response body, a header value, a
 * cookie or an authorization token.
 *
 * The four entries that could conceivably carry target bytes, and why each is
 * here deliberately rather than by omission:
 *   observations.url          — a URL, fragment stripped, truncated to 2048. It is
 *                               the artifact->request edge; without it the plugin
 *                               records that bytes were seen but not WHERE.
 *   observations.content_type — a response HEADER value, and the only one. Bounded
 *                               to 120 chars. It is the admission decision itself,
 *                               so recording it is what makes a wrong admission
 *                               diagnosable.
 *   analyses.error            — a PLUGIN-GENERATED diagnostic, truncated at the
 *                               write. Never target bytes.
 *   settings.value            — OPERATOR configuration (retention bounds). Never
 *                               target bytes and never a credential: nothing in
 *                               Phase 1 writes a secret to settings, and a phase
 *                               that wants to must change this comment first.
 *
 * `value_raw` (SEC-04) and `path_key` (DIFF-01, v2) are absent and MUST STAY
 * absent — decision P4-D2. Adding either to a migration step fails this gate.
 */
const COLUMN_ALLOWLIST: Record<string, string[]> = {
  artifacts: [
    "project_id",
    "sha256",
    "byte_len",
    "kind",
    "first_seen_at",
    "last_seen_at",
    "seen_count",
  ],
  observations: [
    "project_id",
    "sha256",
    "request_id",
    "url",
    "status",
    "content_type",
    "observed_at",
  ],
  analyses: [
    "project_id",
    "sha256",
    "detector_set_hash",
    "scan_state",
    "max_slice_ms",
    "bytes_walked",
    "started_at",
    "finished_at",
    "error",
  ],
  settings: ["project_id", "key", "value", "updated_at"],
};

/** Column names that must never exist anywhere, whatever the table. Named rather
 *  than merely omitted so the failure message says WHY. */
const FORBIDDEN_COLUMNS: Record<string, string> = {
  value_raw:
    "SEC-04 — a finding's raw value is never stored; HMAC fingerprint plus redacted preview only",
  path_key:
    "DIFF-01 is v2 scope and its validating spike moved to v2 with it (decision P4-D2)",
  body: "T-01-21 — no column may hold a response body",
  headers: "T-01-21 — no column may hold header values",
  cookie: "T-01-21 — no column may hold cookies",
  authorization: "T-01-21 — no column may hold authorization material",
  id: "no surrogate id anywhere: last_insert_rowid() is unusable on the pooled connection (decision P1-D1)",
};

async function migratedFixture() {
  const fx = createFixtureDb();
  const report = await migrate(fx.db);
  expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  return fx;
}

describe("schema shape (STORE-01, STORE-02, T-01-21)", () => {
  it("migrates a fresh database to the head version", async () => {
    const fx = await migratedFixture();
    try {
      expect(userVersion(fx.raw)).toBe(SCHEMA_VERSION);
      expect(SCHEMA_VERSION).toBe(MIGRATIONS[MIGRATIONS.length - 1].v);
    } finally {
      fx.close();
    }
  });

  it("the table set is EXACTLY the four approved tables", async () => {
    const fx = await migratedFixture();
    try {
      const tables = listTables(fx.raw);
      // NON-VACUITY. An empty schema must fail this gate, not sail through it.
      expect(
        tables.length,
        "no user tables found — the gate would pass vacuously",
      ).toBeGreaterThan(0);
      // Exact set equality, so an EXTRA table fails as loudly as a missing one.
      // A fifth table is a schema decision that has not been through the
      // allowlist above, and this is where it gets caught.
      expect(tables).toEqual(EXPECTED_TABLES);
    } finally {
      fx.close();
    }
  });

  it("every table has project_id in its PRIMARY KEY, read by ordinal", async () => {
    const fx = await migratedFixture();
    try {
      const tables = listTables(fx.raw);
      expect(tables.length).toBeGreaterThan(0);
      let checked = 0;
      for (const table of tables) {
        const cols = tableInfo(fx.raw, table);
        expect(cols.length, `${table} has no columns`).toBeGreaterThan(0);
        const projectId = cols.find((c) => c.name === "project_id");
        expect(projectId, `${table} has no project_id column`).toBeDefined();
        // `pk` is the ONE-BASED position within the PRIMARY KEY and 0 when the
        // column is not part of it. > 0 is therefore the assertion, and it is
        // read from SQLite rather than from the CREATE TABLE text.
        expect(
          projectId?.pk,
          `${table}.project_id is not part of the PRIMARY KEY (pk ordinal ${String(projectId?.pk)})`,
        ).toBeGreaterThan(0);
        expect(projectId?.notnull, `${table}.project_id is nullable`).toBe(1);
        checked += 1;
      }
      expect(checked).toBe(EXPECTED_TABLES.length);
    } finally {
      fx.close();
    }
  });

  it("every column across every table is on the explicit allowlist", async () => {
    const fx = await migratedFixture();
    try {
      const tables = listTables(fx.raw);
      expect(tables.length).toBeGreaterThan(0);
      let columnsSeen = 0;
      for (const table of tables) {
        const allowed = COLUMN_ALLOWLIST[table];
        expect(allowed, `${table} has no allowlist entry`).toBeDefined();
        const actual = tableInfo(fx.raw, table).map((c) => c.name);
        columnsSeen += actual.length;
        // Set equality both ways: an unlisted column fails, and a listed column
        // that was silently dropped fails too.
        expect([...actual].sort()).toEqual([...(allowed ?? [])].sort());
      }
      expect(
        columnsSeen,
        "no columns enumerated — the allowlist checked nothing",
      ).toBeGreaterThan(0);
    } finally {
      fx.close();
    }
  });

  it("no forbidden column name exists in any table", async () => {
    const fx = await migratedFixture();
    try {
      const offenders: string[] = [];
      for (const table of listTables(fx.raw)) {
        for (const col of tableInfo(fx.raw, table)) {
          const reason = FORBIDDEN_COLUMNS[col.name];
          if (reason !== undefined)
            offenders.push(`${table}.${col.name}: ${reason}`);
        }
      }
      expect(offenders).toEqual([]);
    } finally {
      fx.close();
    }
  });

  it("artifacts still has NO url column — identity is content-addressed", async () => {
    const fx = await migratedFixture();
    try {
      const names = tableInfo(fx.raw, "artifacts").map((c) => c.name);
      expect(names).not.toContain("url");
      // The URL lives on the edge, and this is the assertion that says so.
      expect(tableInfo(fx.raw, "observations").map((c) => c.name)).toContain(
        "url",
      );
    } finally {
      fx.close();
    }
  });

  it("analyses is keyed on (project_id, sha256, detector_set_hash) in that order", async () => {
    const fx = await migratedFixture();
    try {
      const key = tableInfo(fx.raw, "analyses")
        .filter((c) => c.pk > 0)
        .sort((a, b) => a.pk - b.pk)
        .map((c) => c.name);
      // The corpus version is part of the KEY, not a column beside it: that is
      // what makes a corpus bump invalidate exactly the analyses at the old
      // value (CORE-08, STORE-04).
      expect(key).toEqual(["project_id", "sha256", "detector_set_hash"]);
    } finally {
      fx.close();
    }
  });

  it("settings is the ONLY table that accepts an empty project_id", async () => {
    const fx = await migratedFixture();
    try {
      // '' is RESERVED on settings and means "global".
      const put = await fx.db.prepare(
        "INSERT INTO settings (project_id, key, value, updated_at) VALUES (?, ?, ?, ?)",
      );
      await expect(
        put.run("", "retention.max_rows", "5000", 1),
      ).resolves.toBeDefined();

      // And is a project-scoping BUG everywhere else.
      const art = await fx.db.prepare(
        "INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count) VALUES (?, ?, ?, ?, ?, ?, 1)",
      );
      await expect(
        art.run("", "a".repeat(64), 10, "js", 1, 1),
      ).rejects.toThrow();

      const obs = await fx.db.prepare(
        "INSERT INTO observations (project_id, sha256, request_id, url, status, content_type, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      );
      await expect(
        obs.run("", "a".repeat(64), "r1", "https://x/y.js", 200, null, 1),
      ).rejects.toThrow();

      const ana = await fx.db.prepare(
        "INSERT INTO analyses (project_id, sha256, detector_set_hash, scan_state, started_at) VALUES (?, ?, ?, ?, ?)",
      );
      await expect(
        ana.run("", "a".repeat(64), "h", "pending", 1),
      ).rejects.toThrow();
    } finally {
      fx.close();
    }
  });

  it("analyses.scan_state is a CLOSED vocabulary", async () => {
    const fx = await migratedFixture();
    try {
      const stmt = await fx.db.prepare(
        "INSERT INTO analyses (project_id, sha256, detector_set_hash, scan_state, started_at) VALUES (?, ?, ?, ?, ?)",
      );
      // OBS-02 owns the degradation vocabulary in Phase 2. These five values are
      // picked now and must not be contradicted later; `pending` is what makes
      // this table double as the durable job queue ERR-02 and CORE-09 need.
      for (const state of ["pending", "running", "done", "partial", "failed"]) {
        await expect(
          stmt.run("p1", state.padEnd(64, "0"), "h", state, 1),
        ).resolves.toBeDefined();
      }
      await expect(
        stmt.run("p1", "z".repeat(64), "h", "in_progress", 1),
      ).rejects.toThrow();
    } finally {
      fx.close();
    }
  });
});
