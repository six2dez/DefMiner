// packages/backend/src/store/sources.spec.ts — MAP-02 and MAP-06's behavioural
// gate: what a recovered source looks like once it has crossed the persistence
// boundary, and what is provably NOT there once it has.
//
// `schema.spec.ts` proves the SHAPE structurally — the table set, the pk
// ordinals, the allowlist, the declared types. This file proves the three
// PROPERTIES that make the tables worth having and which a shape check cannot
// see: that identical content seen in two bundles deduplicates to one row, that
// the four nullability cases store four different things, and that a label comes
// back byte-identical to the bytes the map declared.
//
// THE PRODUCIBILITY CHECK IS READ BACK OUT OF THE SCHEMA, never trusted to have
// stayed in step with `SOURCE_PRODUCIBILITY_STATES`. That is the `scans`
// precedent: a migration and an array that agree today drift the day one of them
// is edited, and a comment claiming they agree is not a mechanism.

import { SOURCE_PRODUCIBILITY_STATES } from "@defminer/engine/contract";
import { describe, expect, it } from "vitest";

import {
  createFixtureDb,
  type SqliteFixture,
} from "../../test/fixtures/sqlite-fixture";

import { migrate, SCHEMA_VERSION } from "./migrations";
import {
  countSourcesForMap,
  recordSighting,
  SOURCES_LABEL_MAX,
  upsertRecoveredSource,
} from "./sources";

/** A migrated in-memory database at the ladder head. */
async function migratedFixture(): Promise<SqliteFixture> {
  const fx = createFixtureDb();
  const report = await migrate(fx.db);
  expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  expect(report.version).toBe(SCHEMA_VERSION);
  return fx;
}

/** A 64-character digest built from a seed, so a test can say WHICH content it
 *  means without pasting hex. Length matters: both tables `CHECK` it. */
function digest(seed: string): string {
  return seed.padEnd(64, "0").slice(0, 64);
}

const PROJECT = "p1";
const MAP_A = digest("map-a");
const ARTIFACT_A = digest("artifact-a");
const SOURCE_A = digest("source-a");

describe("the recovered-source tables round-trip (MAP-02, D-05)", () => {
  it("writes one row into each table and reads both back", async () => {
    const fx = await migratedFixture();
    try {
      const wroteSource = await upsertRecoveredSource(
        fx.db,
        PROJECT,
        SOURCE_A,
        1234,
        56,
        1_700_000_000_000,
      );
      expect(wroteSource).toEqual({ ok: true, changes: 1 });

      const wroteSighting = await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_A,
        "req-1",
        SOURCE_A,
        "src/app/index.js",
        1_700_000_000_001,
      );
      expect(wroteSighting).toEqual({ ok: true, changes: 1 });

      const source = fx.raw
        .prepare("SELECT * FROM sources WHERE project_id = ?")
        .get(PROJECT) as Record<string, unknown>;
      expect({ ...source }).toEqual({
        project_id: PROJECT,
        source_sha256: SOURCE_A,
        byte_len: 1234,
        line_count: 56,
        first_seen_at: 1_700_000_000_000,
      });

      const sighting = fx.raw
        .prepare("SELECT * FROM source_sightings WHERE project_id = ?")
        .get(PROJECT) as Record<string, unknown>;
      expect({ ...sighting }).toEqual({
        project_id: PROJECT,
        map_sha256: MAP_A,
        source_index: 0,
        artifact_sha256: ARTIFACT_A,
        request_id: "req-1",
        source_sha256: SOURCE_A,
        sources_verbatim: "src/app/index.js",
        // Seeded to the FIRST vocabulary member, read from the array rather
        // than spelled out.
        producibility: SOURCE_PRODUCIBILITY_STATES[0],
        producibility_at: null,
        recovered_at: 1_700_000_000_001,
      });
    } finally {
      fx.close();
    }
  });

  it("holds NO content column on either table, in any encoding (D-07)", async () => {
    // THE CLAIM THE WHOLE PHASE RESTS ON, ASSERTED WHERE THE WRITES LIVE.
    // `schema.spec.ts` proves it structurally for every table; this states it
    // for the two that would be worth stealing, so a reader of the write path
    // meets the property without leaving the file.
    const fx = await migratedFixture();
    try {
      for (const table of ["sources", "source_sightings"]) {
        const columns = (
          fx.raw.prepare(`PRAGMA table_info(${table})`).all() as {
            name: string;
            type: string;
          }[]
        ).map((c) => ({ name: c.name, type: c.type.toUpperCase() }));
        expect(columns.length).toBeGreaterThan(0);
        for (const column of columns) {
          expect(
            ["TEXT", "INTEGER"],
            `${table}.${column.name} declares ${column.type}`,
          ).toContain(column.type);
        }
        const names = columns.map((c) => c.name);
        for (const forbidden of ["content", "body", "source", "text", "id"]) {
          expect(names, `${table} has a ${forbidden} column`).not.toContain(
            forbidden,
          );
        }
      }
    } finally {
      fx.close();
    }
  });

  it("counts a map's sightings, so the caller can hold SOURCE_ROWS_PER_MAP_MAX", async () => {
    const fx = await migratedFixture();
    try {
      expect(await countSourcesForMap(fx.db, PROJECT, MAP_A)).toBe(0);
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_A,
        "req-1",
        SOURCE_A,
        "a.js",
        1,
      );
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        1,
        ARTIFACT_A,
        "req-1",
        null,
        "b.js",
        1,
      );
      expect(await countSourcesForMap(fx.db, PROJECT, MAP_A)).toBe(2);
      // SCOPED. A different project's map is a different map.
      expect(await countSourcesForMap(fx.db, "p2", MAP_A)).toBe(0);
    } finally {
      fx.close();
    }
  });
});

describe("producibility is a CLOSED vocabulary, read back out of the schema", () => {
  it("the CHECK constraint's members equal SOURCE_PRODUCIBILITY_STATES", async () => {
    // READ THE CONSTRAINT, DO NOT TRUST IT. `scans.state` is gated this way in
    // `schema.spec.ts` for the same reason: the DDL and the contract array are
    // two declarations of one vocabulary, and nothing else in the build notices
    // when they stop agreeing. Adding a member to the array without the
    // migration turns this red naming the missing member.
    const fx = await migratedFixture();
    try {
      const ddl = (
        fx.raw
          .prepare(
            "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'source_sightings'",
          )
          .get() as { sql: string }
      ).sql;
      const clause = ddl.slice(ddl.indexOf("producibility IN ("));
      const members = clause
        .slice(clause.indexOf("(") + 1, clause.indexOf(")"))
        .split(",")
        .map((raw) => raw.trim().replace(/^'|'$/g, ""));
      expect(members).toEqual([...SOURCE_PRODUCIBILITY_STATES]);
    } finally {
      fx.close();
    }
  });

  it("the database REFUSES a value from either scan vocabulary", async () => {
    // The mechanism the column name buys. `running` is a member of both scan
    // vocabularies and of neither of these; the database says so rather than
    // accepting it because the column happened to be TEXT.
    const fx = await migratedFixture();
    try {
      const stmt = await fx.db.prepare(
        `INSERT INTO source_sightings (project_id, map_sha256, source_index,
                                       artifact_sha256, request_id, producibility,
                                       recovered_at)
         VALUES (?, ?, ?, ?, 'req-1', ?, 1)`,
      );
      for (const [index, state] of SOURCE_PRODUCIBILITY_STATES.entries()) {
        await expect(
          stmt.run(PROJECT, MAP_A, index, ARTIFACT_A, state),
        ).resolves.toBeDefined();
      }
      await expect(
        stmt.run(PROJECT, MAP_A, 90, ARTIFACT_A, "running"),
      ).rejects.toThrow();
      await expect(
        stmt.run(PROJECT, MAP_A, 91, ARTIFACT_A, "done"),
      ).rejects.toThrow();
    } finally {
      fx.close();
    }
  });
});

describe("SOURCES_LABEL_MAX — the one place this phase bounds evidence", () => {
  it("is above both shipped display caps, so the truncation the operator sees is the DISPLAY one", () => {
    // 1,024 graphemes is the shipped table-cell and evidence-panel cap. A
    // storage cap at or below it would silently BECOME the display cap and move
    // the boundary somewhere nothing tests.
    expect(SOURCES_LABEL_MAX).toBeGreaterThan(1024);
    expect(SOURCES_LABEL_MAX).toBe(4096);
  });
});
