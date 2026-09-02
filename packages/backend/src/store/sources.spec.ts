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
import {
  SOURCES_LABEL_CASE_IDS,
  SOURCES_LABEL_CASES,
} from "@defminer/engine/sourcemap/map-fixture";
import { SOURCE_ROWS_PER_MAP_MAX } from "@defminer/engine/thresholds";
import { describe, expect, it } from "vitest";

import {
  createFixtureDb,
  type SqliteFixture,
} from "../../test/fixtures/sqlite-fixture";

import { migrate, SCHEMA_VERSION } from "./migrations";
// THE DRILL-DOWN'S OWN TWO READS, imported into the WRITE module's spec on
// purpose. W-3 is not a claim about a row existing — it is a claim about what
// the operator SEES, and the only way to assert that here is to make the same
// two calls `SourceBrowser.vue` makes.
import {
  countRecoveredSourcesByArtifact,
  listRecoveredSourcesPage,
} from "./reads";
import {
  countSourcesForMap,
  markProducibility,
  readSightingOrigin,
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
const MAP_B = digest("map-b");
const ARTIFACT_A = digest("artifact-a");
const ARTIFACT_B = digest("artifact-b");
const SOURCE_A = digest("source-a");

/** `SELECT COUNT(*)` against the raw handle — the counts below are claims about
 *  what is IN the tables, so they are read past the store module rather than
 *  through it. */
function countRows(fx: SqliteFixture, table: string): number {
  return (
    fx.raw.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }
  ).n;
}

/** Two sightings of ONE `(map, index)` naming two different bundles, each with
 *  its own request.
 *
 *  BUILT ON THE REAL TABLE SINCE MIGRATION v9. Plan 07-11 could not do that: the
 *  shipped `(project_id, map_sha256, source_index)` key made this pair
 *  UNREPRESENTABLE — the second `INSERT` was refused by the primary key itself,
 *  not merely by `recordSighting`'s attribution guard — so it seeded against a
 *  `widerKeyFixture()` helper that read the shipped DDL out of `sqlite_master`
 *  and substituted only the `PRIMARY KEY` clause, asserting the substitution had
 *  changed something so it would turn RED rather than vacuous the day the real
 *  key moved. That day is plan 07-12 and the helper is retired here as designed:
 *  `migratedFixture()` now ships the wider key, so the pair needs no scaffolding
 *  and the cases below assert it against the schema operators actually run. */
function seedTwoBundleSighting(fx: SqliteFixture): void {
  const stmt = fx.raw.prepare(
    `INSERT INTO source_sightings (project_id, map_sha256, source_index,
                                   artifact_sha256, request_id, producibility,
                                   recovered_at)
     VALUES (?, ?, 0, ?, ?, ?, 2000)`,
  );
  stmt.run(PROJECT, MAP_A, ARTIFACT_A, "req-a", SOURCE_PRODUCIBILITY_STATES[0]);
  stmt.run(PROJECT, MAP_A, ARTIFACT_B, "req-b", SOURCE_PRODUCIBILITY_STATES[0]);
}

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
      expect(await countSourcesForMap(fx.db, PROJECT, ARTIFACT_A, MAP_A)).toBe(
        0,
      );
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
      expect(await countSourcesForMap(fx.db, PROJECT, ARTIFACT_A, MAP_A)).toBe(
        2,
      );
      // SCOPED. A different project's map is a different map.
      expect(await countSourcesForMap(fx.db, "p2", ARTIFACT_A, MAP_A)).toBe(0);
    } finally {
      fx.close();
    }
  });

  // =========================================================================
  // THE COUNT IS SCOPED BY BUNDLE, BECAUSE AFTER v9 A SIGHTING BELONGS TO ONE
  // =========================================================================
  // MAP-06's aggregate bound asks what ONE MAP-BEARING ARTIFACT writes. Before
  // migration v9 that question had no answer in this table: `(map, index)` was
  // the key, a second bundle carrying the same map could not record its own
  // sighting at all, and a map-scoped count was therefore the only count there
  // was. Now the same map genuinely has two independent sets of sightings, and
  // a map-scoped count would hand the caller the SUM of both — refusing bundle
  // B for rows bundle A wrote.
  it("counts by BUNDLE: the same map in a second artifact starts from zero", async () => {
    const fx = await migratedFixture();
    try {
      for (let i = 0; i < 3; i += 1) {
        await recordSighting(
          fx.db,
          PROJECT,
          MAP_A,
          i,
          ARTIFACT_A,
          "req-a",
          SOURCE_A,
          "a" + String(i) + ".js",
          1,
        );
      }

      expect(await countSourcesForMap(fx.db, PROJECT, ARTIFACT_A, MAP_A)).toBe(
        3,
      );

      // THE SAME MAP, A DIFFERENT BUNDLE. A CDN mirror with a different banner
      // comment is the cheapest way a target reaches this, and it is
      // target-triggerable at will.
      expect(
        await countSourcesForMap(fx.db, PROJECT, ARTIFACT_B, MAP_A),
        "the count is still map-scoped: bundle B is being charged for the " +
          "rows bundle A wrote, which would refuse a bundle that has written " +
          "nothing (07-REVIEW.md MD-04).",
      ).toBe(0);

      // And once B writes its own, the two counts are independent rather than
      // shared.
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_B,
        "req-b",
        SOURCE_A,
        "a0.js",
        1,
      );
      expect(await countSourcesForMap(fx.db, PROJECT, ARTIFACT_B, MAP_A)).toBe(
        1,
      );
      expect(await countSourcesForMap(fx.db, PROJECT, ARTIFACT_A, MAP_A)).toBe(
        3,
      );
      // A different map in the same bundle is a different count.
      expect(await countSourcesForMap(fx.db, PROJECT, ARTIFACT_A, MAP_B)).toBe(
        0,
      );
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

describe("cross-bundle dedupe — the reason D-05 chose a content-addressed identity", () => {
  it("the SAME content in TWO bundles is ONE sources row and TWO sightings", async () => {
    // MAP-06's adjacency half, ASSERTED RATHER THAN ASSUMED. This is the whole
    // argument for two tables over one: a vendored module shipped in three
    // bundles across two deploys is ONE recovered source that was seen five
    // times, and a denormalised table would store it five times and then have
    // to rediscover the identity at browse time. The dedupe is not code here —
    // it falls out of `sources`'s primary key being the content digest, which
    // is why it holds for writes nobody coordinated.
    const fx = await migratedFixture();
    try {
      for (const [map, artifact, request] of [
        [MAP_A, ARTIFACT_A, "req-a"],
        [MAP_B, ARTIFACT_B, "req-b"],
      ] as const) {
        expect(
          await upsertRecoveredSource(fx.db, PROJECT, SOURCE_A, 900, 30, 1000),
        ).toEqual({ ok: true, changes: 1 });
        expect(
          await recordSighting(
            fx.db,
            PROJECT,
            map,
            0,
            artifact,
            request,
            SOURCE_A,
            "node_modules/lodash/index.js",
            2000,
          ),
        ).toEqual({ ok: true, changes: 1 });
      }

      expect(countRows(fx, "sources")).toBe(1);
      expect(countRows(fx, "source_sightings")).toBe(2);

      // AND THE TWO SIGHTINGS STILL SAY WHICH BUNDLE EACH CAME FROM. A dedupe
      // that lost the provenance would have deduplicated the evidence too, and
      // `artifact_sha256` is what plan 07-06 re-verifies a reloaded body
      // against under D-24.
      const artifacts = (
        fx.raw
          .prepare(
            "SELECT artifact_sha256 FROM source_sightings ORDER BY artifact_sha256",
          )
          .all() as { artifact_sha256: string }[]
      ).map((row) => row.artifact_sha256);
      expect(artifacts).toEqual([ARTIFACT_A, ARTIFACT_B].sort());
    } finally {
      fx.close();
    }
  });

  it("does NOT move first_seen_at when the same content is seen again", async () => {
    // The row's identity is its content, so a second sighting is the SAME
    // source seen again — not a newer one. `idx_sources_seen` leads on this
    // column and retention orders by it; an upsert that moved it forward would
    // make the index describe the most recent sighting while the column claims
    // to describe the first.
    const fx = await migratedFixture();
    try {
      await upsertRecoveredSource(fx.db, PROJECT, SOURCE_A, 900, 30, 1000);
      await upsertRecoveredSource(fx.db, PROJECT, SOURCE_A, 900, 30, 9999);
      const row = fx.raw.prepare("SELECT first_seen_at FROM sources").get() as {
        first_seen_at: number;
      };
      expect(row.first_seen_at).toBe(1000);
    } finally {
      fx.close();
    }
  });

  it("scopes dedupe to the project — the same content in two projects is two rows", async () => {
    const fx = await migratedFixture();
    try {
      await upsertRecoveredSource(fx.db, PROJECT, SOURCE_A, 900, 30, 1000);
      await upsertRecoveredSource(fx.db, "p2", SOURCE_A, 900, 30, 1000);
      expect(countRows(fx, "sources")).toBe(2);
    } finally {
      fx.close();
    }
  });
});

describe("nullability — the four shapes 07-RESEARCH.md § Pitfall 3 measured", () => {
  it("an index with NO CONTENT stores a NULL source_sha256 and creates no sources row", async () => {
    const fx = await migratedFixture();
    try {
      expect(
        await recordSighting(
          fx.db,
          PROJECT,
          MAP_A,
          3,
          ARTIFACT_A,
          "req-a",
          null,
          "src/absent.js",
          2000,
        ),
      ).toEqual({ ok: true, changes: 1 });

      // The sighting IS written. An index the map declared and did not ship is
      // still a fact about the bundle, and it is still tombstone-eligible.
      expect(countRows(fx, "source_sightings")).toBe(1);
      expect(countRows(fx, "sources")).toBe(0);

      const row = fx.raw
        .prepare(
          "SELECT source_sha256 IS NULL AS is_null FROM source_sightings WHERE source_index = 3",
        )
        .get() as { is_null: number };
      expect(row.is_null).toBe(1);
    } finally {
      fx.close();
    }
  });

  it('a `sources[i]` that is itself null stores SQL NULL, never the string "null"', async () => {
    // ECMA-426 permits a null source name. `parse.ts` keeps the null as a
    // VALUE, and it has to survive the persistence boundary as one: the string
    // "null" is a four-character label a target could also have written, and
    // the two would then be indistinguishable in the drill-down.
    //
    // ASSERTED VIA SQL `IS NULL`, not by comparing to a JavaScript value. A
    // driver that stringified on the way in would return the string "null" and
    // an `expect(...).toBeNull()` on a value the adapter had already coerced
    // could pass for the wrong reason.
    const fx = await migratedFixture();
    try {
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        4,
        ARTIFACT_A,
        "req-a",
        SOURCE_A,
        null,
        2000,
      );
      const row = fx.raw
        .prepare(
          `SELECT sources_verbatim IS NULL AS is_null,
                  typeof(sources_verbatim) AS declared
           FROM source_sightings WHERE source_index = 4`,
        )
        .get() as { is_null: number; declared: string };
      expect(row.is_null).toBe(1);
      expect(row.declared).toBe("null");

      // THE CONTROL. A sighting that really did carry the four characters is a
      // different row and reads back as text, so the assertion above is about
      // the NULL and not about the column.
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        5,
        ARTIFACT_A,
        "req-a",
        SOURCE_A,
        "null",
        2000,
      );
      const control = fx.raw
        .prepare(
          `SELECT sources_verbatim AS value, typeof(sources_verbatim) AS declared
           FROM source_sightings WHERE source_index = 5`,
        )
        .get() as { value: string; declared: string };
      expect(control.value).toBe("null");
      expect(control.declared).toBe("text");
    } finally {
      fx.close();
    }
  });

  it("a sourcesContent SHORTER than sources writes sightings only for the indexes within it", async () => {
    // The caller's shape, exercised at the boundary it actually has: three
    // declared sources, content for the first two. The third index is written
    // with a null digest rather than skipped, because "declared and not
    // shipped" is a different fact from "not declared".
    const fx = await migratedFixture();
    try {
      const declared = ["a.js", "b.js", "c.js"];
      const content: (string | null)[] = ["A", "B"];
      for (const [index, label] of declared.entries()) {
        const hasContent = index < content.length;
        await recordSighting(
          fx.db,
          PROJECT,
          MAP_A,
          index,
          ARTIFACT_A,
          "req-a",
          hasContent ? digest(`content-${String(index)}`) : null,
          label,
          2000,
        );
      }
      expect(countRows(fx, "source_sightings")).toBe(3);
      const withDigest = (
        fx.raw
          .prepare(
            "SELECT COUNT(*) AS n FROM source_sightings WHERE source_sha256 IS NOT NULL",
          )
          .get() as { n: number }
      ).n;
      expect(withDigest).toBe(2);
    } finally {
      fx.close();
    }
  });

  it("a map with NO sourcesContent at all writes zero sightings and is not an error", async () => {
    // The fourth shape. `parse.ts` returns an EMPTY recovered list for a map
    // that declared sources and shipped no content — a legal map, not a failed
    // one — so the caller's loop runs zero times, nothing is written, and
    // nothing reports a failure. That is the "found nothing" versus "broke"
    // distinction the whole error vocabulary exists to keep apart.
    //
    // WRITTEN AS THE CALLER'S OWN LOOP OVER TWO MAPS, WITH A CONTROL, because a
    // case that iterates an empty array and then asserts an empty table has
    // measured nothing: it would pass against a `recordSighting` that had been
    // deleted. The control map goes through the SAME loop and DOES write, so
    // the zero is a fact about the input rather than about the test.
    const fx = await migratedFixture();
    try {
      const write = async (
        map: string,
        recovered: readonly { index: number; label: string }[],
      ): Promise<void> => {
        for (const source of recovered) {
          await recordSighting(
            fx.db,
            PROJECT,
            map,
            source.index,
            ARTIFACT_A,
            "req-a",
            SOURCE_A,
            source.label,
            2000,
          );
        }
      };

      await write(MAP_A, []);
      expect(await countSourcesForMap(fx.db, PROJECT, ARTIFACT_A, MAP_A)).toBe(
        0,
      );

      // THE CONTROL, through the identical path.
      await write(MAP_B, [{ index: 0, label: "src/app.js" }]);
      expect(await countSourcesForMap(fx.db, PROJECT, ARTIFACT_A, MAP_B)).toBe(
        1,
      );

      // And the empty map is still empty after the control wrote — the two are
      // separate partitions, not one table that happened to be empty.
      expect(await countSourcesForMap(fx.db, PROJECT, ARTIFACT_A, MAP_A)).toBe(
        0,
      );
      expect(countRows(fx, "source_sightings")).toBe(1);
    } finally {
      fx.close();
    }
  });
});

describe("W-3 — one map in TWO bundles leaves BOTH bundles their evidence", () => {
  // `source_sightings` is keyed `(project_id, artifact_sha256, map_sha256,
  // source_index)` since migration v9, and the second column is why. `map_sha256`
  // is content-addressed over the DECODED MAP JSON, never over the bundle, so two
  // different bundles can share a `map_sha256` — a CDN mirror with a different
  // banner comment, a decoy stub carrying a copy, or the same library genuinely
  // re-bundled. It is target-triggerable at will: the second bundle only has to
  // carry a copy of the same map.
  //
  // THE HISTORY THIS BLOCK REPLACES, because a SUMMARY naming it needs somewhere
  // to land. Under the original `(project_id, map_sha256, source_index)` key the
  // second ingest OVERWROTE the first bundle's attribution (07-REVIEW.md HI-03).
  // Plan 07-05 shipped an interim attribution guard that stopped the theft and
  // counted the discard — but the second bundle's evidence was still LOST, and
  // its drill-down read a RESOLVED zero (07-VERIFICATION.md W-3) on the one
  // column whose whole design is that a resolved zero means "DefMiner looked and
  // there was nothing". The key is the complete fix, and these cases are it.

  it("gives BOTH bundles their own row when they carry the same map", async () => {
    const fx = await migratedFixture();
    try {
      const first = await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_A,
        "req-a",
        SOURCE_A,
        "src/secret.js",
        2000,
      );
      expect(first).toEqual({ ok: true, changes: 1 });

      // THE SECOND BUNDLE. Same project, same map digest, same index — a
      // different artifact and a different request.
      const second = await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_B,
        "req-b",
        SOURCE_A,
        "src/secret.js",
        8000,
      );
      // A WRITE, NOT A DISCARD. Under the interim guard this was `changes: 0`
      // and no second row existed; the whole finding is that `changes: 0` was
      // reported as success while evidence went missing.
      expect(second).toEqual({ ok: true, changes: 1 });

      expect(countRows(fx, "source_sightings")).toBe(2);

      const rows = fx.raw
        .prepare(
          `SELECT artifact_sha256, request_id, recovered_at FROM source_sightings
           WHERE project_id = ? AND map_sha256 = ? AND source_index = 0
           ORDER BY artifact_sha256 ASC`,
        )
        .all(PROJECT, MAP_A) as {
        artifact_sha256: string;
        request_id: string;
        recovered_at: number;
      }[];
      expect(rows).toHaveLength(2);
      // EACH BUNDLE KEEPS ITS OWN REQUEST AND ITS OWN CLOCK. D-24 reloads
      // `request_id` and re-verifies the body against `artifact_sha256`, so a
      // row carrying the other bundle's request is the silent mis-verification
      // HI-03 describes.
      expect(rows.map((r) => r.artifact_sha256)).toEqual(
        [ARTIFACT_A, ARTIFACT_B].sort((a, b) => (a < b ? -1 : 1)),
      );
      const byArtifact = new Map(rows.map((r) => [r.artifact_sha256, r]));
      expect(byArtifact.get(ARTIFACT_A)?.request_id).toBe("req-a");
      expect(byArtifact.get(ARTIFACT_A)?.recovered_at).toBe(2000);
      expect(byArtifact.get(ARTIFACT_B)?.request_id).toBe("req-b");
      expect(byArtifact.get(ARTIFACT_B)?.recovered_at).toBe(8000);
    } finally {
      fx.close();
    }
  });

  it("answers each bundle's drill-down with that bundle's OWN rows, and neither with a zero", async () => {
    // THE READ-BACK HALF, AND IT IS THE HALF W-3 IS ABOUT. A key that separates
    // the rows is worth nothing if the two reads the drill-down actually makes
    // still collapse them. `listRecoveredSourcesPage` is scoped
    // `WHERE sg.artifact_sha256 = ?`; `countRecoveredSourcesByArtifact` is what
    // paints the `Sources` column, and its zero is RESOLVED on the
    // `scan_state = 'done'` ground — which is exactly why it must never be a
    // zero that DefMiner reached by throwing evidence away.
    const fx = await migratedFixture();
    try {
      // Two artifacts, so the count read has rows to report against. Seeded on
      // the raw handle: this case is about the sighting key, not about ingest.
      const artifact = fx.raw.prepare(
        `INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at,
                                last_seen_at, seen_count)
         VALUES (?, ?, ?, 'js', ?, ?, 1)`,
      );
      artifact.run(PROJECT, ARTIFACT_A, 1024, 1000, 1000);
      artifact.run(PROJECT, ARTIFACT_B, 2048, 1100, 1100);

      const LABELS = ["src/a.js", "src/b.js", "src/c.js"];
      for (const [i, label] of LABELS.entries()) {
        for (const [artifactSha, requestId] of [
          [ARTIFACT_A, "req-a"],
          [ARTIFACT_B, "req-b"],
        ] as const) {
          expect(
            await recordSighting(
              fx.db,
              PROJECT,
              MAP_A,
              i,
              artifactSha,
              requestId,
              SOURCE_A,
              label,
              2000 + i,
            ),
          ).toEqual({ ok: true, changes: 1 });
        }
      }

      const pageA = await listRecoveredSourcesPage(
        fx.db,
        PROJECT,
        ARTIFACT_A,
        null,
        50,
      );
      const pageB = await listRecoveredSourcesPage(
        fx.db,
        PROJECT,
        ARTIFACT_B,
        null,
        50,
      );
      expect(pageA.rows).toHaveLength(LABELS.length);
      expect(pageB.rows).toHaveLength(LABELS.length);
      expect(pageA.rows.map((r) => r.sources_verbatim)).toEqual(LABELS);
      expect(pageB.rows.map((r) => r.sources_verbatim)).toEqual(LABELS);

      // AND THE COLUMN THE OPERATOR READS. N for BOTH, never 0 for one.
      const counts = await countRecoveredSourcesByArtifact(fx.db, PROJECT);
      expect(counts.get(ARTIFACT_A)).toBe(LABELS.length);
      expect(counts.get(ARTIFACT_B)).toBe(LABELS.length);
    } finally {
      fx.close();
    }
  });

  it("is still idempotent on the FOUR-part key — the same bundle twice is one row", async () => {
    // The other side of the widening. A wider key that stopped deduplicating
    // would turn MAP-06's once-per-sighting guarantee into a row per re-analysis,
    // against a `DEFAULT_RETENTION_MAX_ROWS` the phase already meets soonest here.
    const fx = await migratedFixture();
    try {
      expect(
        await recordSighting(
          fx.db,
          PROJECT,
          MAP_A,
          0,
          ARTIFACT_A,
          "req-a",
          SOURCE_A,
          "src/app.js",
          2000,
        ),
      ).toEqual({ ok: true, changes: 1 });
      expect(
        await recordSighting(
          fx.db,
          PROJECT,
          MAP_A,
          0,
          ARTIFACT_A,
          "req-a2",
          SOURCE_A,
          "src/app.js",
          8000,
        ),
      ).toEqual({ ok: true, changes: 1 });
      expect(countRows(fx, "source_sightings")).toBe(1);
    } finally {
      fx.close();
    }
  });

  it("still refreshes request_id when the SAME bundle is seen again", async () => {
    // THE OTHER HALF, AND IT IS NOT A DETAIL. D-24 reloads `request_id` from
    // Caido and re-verifies the body against `artifact_sha256`. Pinning the
    // request to the first sighting would let Caido's history evict it while
    // the bundle is still being served — and `no_request` mints a STICKY `gone`
    // tombstone. Within one bundle the newest request is the right one; across
    // bundles it is the defect above.
    const fx = await migratedFixture();
    try {
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_A,
        "req-old",
        SOURCE_A,
        "src/app.js",
        2000,
      );
      expect(
        await recordSighting(
          fx.db,
          PROJECT,
          MAP_A,
          0,
          ARTIFACT_A,
          "req-new",
          SOURCE_A,
          "src/app.js",
          8000,
        ),
      ).toEqual({ ok: true, changes: 1 });

      const row = fx.raw
        .prepare(
          "SELECT artifact_sha256, request_id, recovered_at FROM source_sightings",
        )
        .get() as {
        artifact_sha256: string;
        request_id: string;
        recovered_at: number;
      };
      expect(row.request_id).toBe("req-new");
      expect(row.artifact_sha256).toBe(ARTIFACT_A);
      // And `recovered_at` still does not move: this is the same sighting seen
      // again, not a new recovery.
      expect(row.recovered_at).toBe(2000);
    } finally {
      fx.close();
    }
  });

  it("does not un-stick ONE bundle's tombstone by writing the OTHER bundle", async () => {
    // D-23's stickiness across the widening. Bundle B's write is now a genuine
    // INSERT of a row of its own, so the interesting property is not that the
    // write is refused — it is that bundle A's tombstone is in a DIFFERENT ROW
    // and cannot be reached by it. Under the interim guard this was the same row
    // and the property rested on a predicate; it is now the key.
    const fx = await migratedFixture();
    try {
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_A,
        "req-a",
        SOURCE_A,
        "src/app.js",
        2000,
      );
      await markProducibility(
        fx.db,
        PROJECT,
        ARTIFACT_A,
        MAP_A,
        0,
        "gone",
        5000,
      );
      expect(
        await recordSighting(
          fx.db,
          PROJECT,
          MAP_A,
          0,
          ARTIFACT_B,
          "req-b",
          SOURCE_A,
          "src/app.js",
          8000,
        ),
      ).toEqual({ ok: true, changes: 1 });

      const rows = fx.raw
        .prepare(
          `SELECT artifact_sha256, producibility, producibility_at
           FROM source_sightings WHERE project_id = ? ORDER BY artifact_sha256 ASC`,
        )
        .all(PROJECT) as {
        artifact_sha256: string;
        producibility: string;
        producibility_at: number | null;
      }[];
      expect(rows).toHaveLength(2);
      const byArtifact = new Map(rows.map((r) => [r.artifact_sha256, r]));
      // A's tombstone is exactly where it was left.
      expect(byArtifact.get(ARTIFACT_A)?.producibility).toBe("gone");
      expect(byArtifact.get(ARTIFACT_A)?.producibility_at).toBe(5000);
      // And B starts at the FIRST vocabulary member rather than inheriting A's
      // verdict: a tombstone is a fact about one bundle's request, never about
      // the map.
      expect(byArtifact.get(ARTIFACT_B)?.producibility).toBe(
        SOURCE_PRODUCIBILITY_STATES[0],
      );
      expect(byArtifact.get(ARTIFACT_B)?.producibility_at).toBeNull();
    } finally {
      fx.close();
    }
  });

  it("scopes the key by PROJECT: another project's bundle is a separate row", async () => {
    // The key leads on `project_id`, so this is a different partition entirely.
    // Non-vacuity for the cases above: the second row there is about the
    // ARTIFACT column and not merely about the statement writing twice.
    const fx = await migratedFixture();
    try {
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_A,
        "req-a",
        SOURCE_A,
        "src/app.js",
        2000,
      );
      expect(
        await recordSighting(
          fx.db,
          "p2",
          MAP_A,
          0,
          ARTIFACT_B,
          "req-b",
          SOURCE_A,
          "src/app.js",
          8000,
        ),
      ).toEqual({ ok: true, changes: 1 });
      expect(countRows(fx, "source_sightings")).toBe(2);
    } finally {
      fx.close();
    }
  });
});

describe("D-06 — the label round-trips BYTE-IDENTICALLY", () => {
  it("every SPIKE-12 label at or below the cap comes back exactly as it went in", async () => {
    // UNSANITISED AND UNNORMALISED, PROVEN OVER THE MEASURED CORPUS rather than
    // over cases somebody thought to write. The NUL byte, the RTL override, the
    // fullwidth dot and the trailing dots-and-spaces are each a value some
    // layer in a normal pipeline would silently rewrite — `path.normalize` was
    // MEASURED consuming the RTL run and following the climbs — and every one
    // of them survives this write path untouched, because nothing on it does
    // anything to the string but bound its length.
    const fx = await migratedFixture();
    try {
      const exercised = new Set<string>();
      for (const [index, labelCase] of SOURCES_LABEL_CASES.entries()) {
        exercised.add(labelCase.id);
        if (labelCase.value.length > SOURCES_LABEL_MAX) continue;
        const wrote = await recordSighting(
          fx.db,
          PROJECT,
          MAP_A,
          index,
          ARTIFACT_A,
          "req-a",
          SOURCE_A,
          labelCase.value,
          2000,
        );
        expect(wrote, `${labelCase.id} did not write`).toEqual({
          ok: true,
          changes: 1,
        });
        const row = fx.raw
          .prepare(
            "SELECT sources_verbatim AS value FROM source_sightings WHERE source_index = ?",
          )
          .get(index) as { value: string };
        expect(
          row.value === labelCase.value,
          `${labelCase.id} did not round-trip byte-identically`,
        ).toBe(true);
      }

      // THE ID SET IN FULL, the `hostile.fixture.ts` doctrine: a corpus loop
      // that silently stopped iterating would still pass every assertion inside
      // it. Asserted EQUAL rather than as a count.
      expect([...exercised].sort()).toEqual([...SOURCES_LABEL_CASE_IDS].sort());
    } finally {
      fx.close();
    }
  });

  it("bounds the label at SOURCES_LABEL_MAX, exercised from BOTH sides", async () => {
    // THE ONE PLACE THIS PHASE BOUNDS EVIDENCE, and it is stated as such. At
    // the cap the value round-trips whole; one character above it the stored
    // value is a PREFIX of exactly `SOURCES_LABEL_MAX` characters. The reason
    // is at the constant: "verbatim" means unsanitised and unnormalised, not
    // unbounded, and a target-controlled string at rest is bounded here exactly
    // as `observations.url` is.
    const fx = await migratedFixture();
    try {
      const atCap = "L".repeat(SOURCES_LABEL_MAX);
      const overCap = `${"L".repeat(SOURCES_LABEL_MAX)}X`;

      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_A,
        "req-a",
        SOURCE_A,
        atCap,
        2000,
      );
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        1,
        ARTIFACT_A,
        "req-a",
        SOURCE_A,
        overCap,
        2000,
      );

      const read = (index: number): string =>
        (
          fx.raw
            .prepare(
              "SELECT sources_verbatim AS value FROM source_sightings WHERE source_index = ?",
            )
            .get(index) as { value: string }
        ).value;

      expect(read(0)).toBe(atCap);
      expect(read(0)).toHaveLength(SOURCES_LABEL_MAX);
      expect(read(1)).toHaveLength(SOURCES_LABEL_MAX);
      expect(read(1)).toBe(atCap);
      // A PREFIX, not a hash, not an ellipsis, not a marker. What survives is
      // the first N characters the map declared, so the operator's truncated
      // view is still the target's own bytes.
      expect(overCap.startsWith(read(1))).toBe(true);

      // AND THE FIXTURE THAT ALREADY EXISTS SITS EXACTLY ON THE CAP, which is
      // why the corpus loop above never truncates. Pinned so a change to either
      // number is a change to a failing test rather than a silent shift.
      const fourKilobyte = SOURCES_LABEL_CASES.find(
        (labelCase) => labelCase.id === "four-kilobyte-label",
      );
      expect(fourKilobyte?.value).toHaveLength(SOURCES_LABEL_MAX);
    } finally {
      fx.close();
    }
  });
});

// ===========================================================================
// LO-03 — THE CAP IS ENFORCED IN CODE POINTS, SO A STORED LABEL IS ALWAYS
// VALID UTF-8
// ===========================================================================
//
// 07-REVIEW.md LO-03: `sourcesVerbatim.slice(0, SOURCES_LABEL_MAX)` cut at code
// UNIT 4,096. A label whose 4,096th code unit is a HIGH SURROGATE therefore
// stored an UNPAIRED surrogate — an invalid UTF-8 sequence in a SQLite `TEXT`
// column, which round-trips through the driver and the RPC boundary
// unpredictably. The cap keeps its value; only the unit it counts changes.
//
// EVERY SURROGATE HERE IS AN ESCAPE SEQUENCE AND NEVER A LITERAL, in
// `map-fixture.ts`'s discipline: this whole case is about characters that are
// invisible in a diff, and a literal astral character in a source file is
// exactly that.

describe("LO-03 — sources_verbatim is cut on a CODE POINT boundary", () => {
  /** A surrogate with no partner, found by walking code units. `[...s]` cannot
   *  answer this: the spread iterator yields a LONE surrogate as its own
   *  one-unit "character" rather than reporting it, so a check written over the
   *  iterator would pass on exactly the value LO-03 is about. */
  function hasUnpairedSurrogate(value: string): boolean {
    for (let i = 0; i < value.length; i += 1) {
      const unit = value.charCodeAt(i);
      if (unit >= 0xd800 && unit <= 0xdbff) {
        const next = i + 1 < value.length ? value.charCodeAt(i + 1) : 0;
        if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
        i += 1;
      } else if (unit >= 0xdc00 && unit <= 0xdfff) {
        return true;
      }
    }
    return false;
  }

  /** Read the stored label back THROUGH THE STORE, in the call
   *  `SourceBrowser.vue` makes. The defect is about what survives the driver
   *  and the RPC boundary, so inspecting the string that was passed in — or
   *  reaching past the store to the raw handle — would assert the wrong thing.
   */
  async function readLabel(fx: SqliteFixture): Promise<string | null> {
    const page = await listRecoveredSourcesPage(
      fx.db,
      PROJECT,
      ARTIFACT_A,
      null,
      10,
    );
    expect(page.rows).toHaveLength(1);
    return page.rows[0].sources_verbatim;
  }

  it("stores no unpaired surrogate when the 4,096th code unit is a high surrogate", async () => {
    // U+1F600 GRINNING FACE, written as its two surrogate halves so the
    // boundary this case is about is visible in the source. 4,095 ASCII
    // characters put the FIRST emoji's HIGH half at code unit index 4,095 —
    // the 4,096th code unit — which is precisely where the shipped `slice` cut.
    const HIGH = "\ud83d";
    const LOW = "\ude00";
    const label = "A".repeat(SOURCES_LABEL_MAX - 1) + (HIGH + LOW).repeat(5);
    expect(label.charCodeAt(SOURCES_LABEL_MAX - 1)).toBe(0xd83d);

    const fx = await migratedFixture();
    try {
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_A,
        "req-a",
        SOURCE_A,
        label,
        2000,
      );
      const stored = await readLabel(fx);
      expect(stored).not.toBeNull();
      expect(
        hasUnpairedSurrogate(stored ?? ""),
        "the stored label ends in an unpaired surrogate (final code unit " +
          "U+" +
          (stored ?? "")
            .charCodeAt((stored ?? "").length - 1)
            .toString(16)
            .toUpperCase() +
          "). The cap is being enforced in UTF-16 CODE UNITS, so the cut fell " +
          "between the two halves of a surrogate pair and put an invalid " +
          "UTF-8 sequence in a TEXT column (07-REVIEW.md LO-03).",
      ).toBe(false);

      // THE OBSERVABLE SHAPE OF THE DEFECT, asserted separately from the
      // surrogate check because the driver HIDES it: binding a lone high
      // surrogate does not store a lone high surrogate, it stores U+FFFD. So
      // `hasUnpairedSurrogate` comes back FALSE on the broken value and the
      // damage shows up here instead — the stored label is neither what was
      // bound nor a prefix of what the map declared.
      expect(
        (stored ?? "").charCodeAt((stored ?? "").length - 1),
        "the stored label's final code unit is U+FFFD REPLACEMENT CHARACTER. " +
          "The code-unit cut bound a LONE HIGH SURROGATE and the driver " +
          "rewrote it, so `sources_verbatim` is no longer the bytes the map " +
          "declared (07-REVIEW.md LO-03).",
      ).not.toBe(0xfffd);

      // AND IT IS STILL A PREFIX. The value is evidence under D-06: truncated,
      // never transformed. A code-point cut is still a truncation.
      expect(label.startsWith(stored ?? "")).toBe(true);
      // Exactly the cap in CODE POINTS — 4,095 ASCII plus one whole emoji.
      expect([...(stored ?? "")]).toHaveLength(SOURCES_LABEL_MAX);
    } finally {
      fx.close();
    }
  });

  it("stores a label of exactly the cap IN CODE POINTS whole", async () => {
    // ASTRAL THROUGHOUT, so code points and code units differ by a factor of
    // two and the two readings of "4,096" cannot be confused. Under the code-
    // UNIT cap this value was cut in half; under the code-POINT cap it is
    // stored whole, which is the budget the operator approved.
    const label = "\ud83d\ude00".repeat(SOURCES_LABEL_MAX);
    const fx = await migratedFixture();
    try {
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_A,
        "req-a",
        SOURCE_A,
        label.slice(0, 2 * SOURCES_LABEL_MAX),
        2000,
      );
      const stored = await readLabel(fx);
      expect([...(stored ?? "")]).toHaveLength(SOURCES_LABEL_MAX);
      expect(stored).toBe(label.slice(0, 2 * SOURCES_LABEL_MAX));
      expect(hasUnpairedSurrogate(stored ?? "")).toBe(false);
    } finally {
      fx.close();
    }
  });

  it("cuts an ASCII label longer than the cap at exactly the cap, unchanged from before", async () => {
    // THE UNCHANGED HALF. For a label with no astral characters a code point
    // IS a code unit, so this case must behave exactly as it did — the fix
    // moves a unit, not a budget.
    const label = "L".repeat(SOURCES_LABEL_MAX + 500);
    const fx = await migratedFixture();
    try {
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_A,
        "req-a",
        SOURCE_A,
        label,
        2000,
      );
      const stored = await readLabel(fx);
      expect(stored).toHaveLength(SOURCES_LABEL_MAX);
      expect(stored).toBe("L".repeat(SOURCES_LABEL_MAX));
      expect(label.startsWith(stored ?? "")).toBe(true);
    } finally {
      fx.close();
    }
  });
});

describe("W-3 — a sighting is READ by a key that names its bundle", () => {
  it("answers each bundle with its OWN request when two share (map, index)", async () => {
    // THE MULTI-MATCH THIS PLAN EXISTS TO PREVENT. Under the shipped key this
    // pair cannot be written at all, so the read's ambiguity is invisible; the
    // moment 07-12 widens the key it becomes the ORDINARY case, and a `WHERE`
    // that binds only map and index would hand back whichever row SQLite
    // reached first. Measured against the pre-widening statement this case
    // returned `req-a` for BOTH asks.
    const fx = await migratedFixture();
    try {
      seedTwoBundleSighting(fx);

      const fromA = await readSightingOrigin(
        fx.db,
        PROJECT,
        ARTIFACT_A,
        MAP_A,
        0,
      );
      expect(fromA?.request_id).toBe("req-a");
      expect(fromA?.artifact_sha256).toBe(ARTIFACT_A);

      const fromB = await readSightingOrigin(
        fx.db,
        PROJECT,
        ARTIFACT_B,
        MAP_A,
        0,
      );
      expect(fromB?.request_id).toBe("req-b");
      expect(fromB?.artifact_sha256).toBe(ARTIFACT_B);
    } finally {
      fx.close();
    }
  });

  it("answers `undefined` for a bundle that never carried this sighting", async () => {
    // THE NEGATIVE HALF, and it is the half that matters at the RPC boundary:
    // the caller now names a four-part key, so a caller naming a real map, a
    // real index and the WRONG bundle must get nothing rather than another
    // bundle's request. `index.ts` answers that with `unavailable` and writes no
    // producibility row — an absence of evidence is not a proven refusal.
    //
    // THE POSITIVE CONTROL IS ON PURPOSE. Asserting only the `undefined` would
    // pass against a statement that matched nothing at all, including the
    // pre-widening one reading the digest into `map_sha256`.
    const fx = await migratedFixture();
    try {
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_A,
        "req-a",
        SOURCE_A,
        "src/app.js",
        2000,
      );

      expect(
        (await readSightingOrigin(fx.db, PROJECT, ARTIFACT_A, MAP_A, 0))
          ?.request_id,
        "the sighting that IS there was not found, so the negative below proves nothing",
      ).toBe("req-a");
      expect(
        await readSightingOrigin(fx.db, PROJECT, ARTIFACT_B, MAP_A, 0),
      ).toBeUndefined();
    } finally {
      fx.close();
    }
  });
});

describe("W-3 — a sighting is WRITTEN by a key that names its bundle", () => {
  it("tombstones ONE bundle's sighting and leaves the other's shipped state", async () => {
    // D-23 MAKES THIS THE EXPENSIVE ONE TO GET WRONG. A read that matched the
    // wrong row shows the operator one wrong answer; a WRITE that matched the
    // wrong row is permanent, because the trailing producibility guard means no
    // sequence of later calls moves it back. Measured against the pre-widening
    // statement this call reported `changes: 2` and marked BOTH bundles `gone`.
    //
    // The pair is built on {@link seedTwoBundleSighting} for the reason that helper
    // gives: under the shipped key the second row cannot exist, so the damage is
    // latent rather than live — and plan 07-12 is what makes it live.
    const fx = await migratedFixture();
    try {
      seedTwoBundleSighting(fx);

      const written = await markProducibility(
        fx.db,
        PROJECT,
        ARTIFACT_A,
        MAP_A,
        0,
        "gone",
        5000,
      );
      expect(written).toEqual({ ok: true, changes: 1 });

      const rows = fx.raw
        .prepare(
          "SELECT artifact_sha256, producibility FROM source_sightings ORDER BY artifact_sha256",
        )
        .all() as { artifact_sha256: string; producibility: string }[];
      expect(rows).toEqual([
        { artifact_sha256: ARTIFACT_A, producibility: "gone" },
        {
          artifact_sha256: ARTIFACT_B,
          producibility: SOURCE_PRODUCIBILITY_STATES[0],
        },
      ]);
    } finally {
      fx.close();
    }
  });

  it("is still idempotent on the four-part key — one row, then zero", async () => {
    // THE PROPERTY THE WIDENING MUST NOT COST. D-23's stickiness lives in the
    // trailing `AND producibility = ?`, which the bundle predicate sits in front
    // of rather than replaces, so a second call for the SAME four-part key still
    // matches nothing.
    const fx = await migratedFixture();
    try {
      seedTwoBundleSighting(fx);
      expect(
        await markProducibility(
          fx.db,
          PROJECT,
          ARTIFACT_A,
          MAP_A,
          0,
          "gone",
          5000,
        ),
      ).toEqual({ ok: true, changes: 1 });
      expect(
        await markProducibility(
          fx.db,
          PROJECT,
          ARTIFACT_A,
          MAP_A,
          0,
          "changed",
          9999,
        ),
      ).toEqual({ ok: true, changes: 0 });
    } finally {
      fx.close();
    }
  });
});

describe("D-23 — the producibility write is sticky BY STATEMENT CONSTRUCTION", () => {
  it("changes one row, then zero, and the second call cannot move producibility_at", async () => {
    // THE TOMBSTONE CANNOT BE UN-STUCK. The trailing `AND producibility = ?` is
    // bound to the initial vocabulary member, so a second attempt matches
    // nothing. That makes stickiness a property of the SQL rather than of a
    // caller remembering to check first — and there is no transaction primitive
    // on this driver with which a caller could have checked safely anyway.
    const fx = await migratedFixture();
    try {
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_A,
        "req-a",
        SOURCE_A,
        "src/app.js",
        2000,
      );

      const first = await markProducibility(
        fx.db,
        PROJECT,
        ARTIFACT_A,
        MAP_A,
        0,
        "gone",
        5000,
      );
      expect(first).toEqual({ ok: true, changes: 1 });

      const second = await markProducibility(
        fx.db,
        PROJECT,
        ARTIFACT_A,
        MAP_A,
        0,
        "changed",
        9999,
      );
      expect(second).toEqual({ ok: true, changes: 0 });

      const row = fx.raw
        .prepare(
          "SELECT producibility, producibility_at FROM source_sightings WHERE source_index = 0",
        )
        .get() as { producibility: string; producibility_at: number };
      expect(row.producibility).toBe("gone");
      expect(row.producibility_at).toBe(5000);
    } finally {
      fx.close();
    }
  });

  it("is scoped by project_id, which is FIRST in the WHERE", async () => {
    const fx = await migratedFixture();
    try {
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_A,
        "req-a",
        SOURCE_A,
        "src/app.js",
        2000,
      );
      expect(
        await markProducibility(
          fx.db,
          "p2",
          ARTIFACT_A,
          MAP_A,
          0,
          "gone",
          5000,
        ),
      ).toEqual({ ok: true, changes: 0 });
      const row = fx.raw
        .prepare(
          "SELECT producibility FROM source_sightings WHERE source_index = 0",
        )
        .get() as { producibility: string };
      expect(row.producibility).toBe(SOURCE_PRODUCIBILITY_STATES[0]);
    } finally {
      fx.close();
    }
  });
});

describe("MAP-06 — recording the same sighting twice leaves one row", () => {
  it("is idempotent, and does not move recovered_at", async () => {
    // The statement half of MAP-06's idempotency; the ingest half is plan
    // 07-05's. `recovered_at` stays put for the same reason `first_seen_at`
    // does on `sources`: D-22's tombstone copy interpolates it, and a re-run of
    // the analysis is not a new recovery.
    const fx = await migratedFixture();
    try {
      for (const at of [2000, 8000]) {
        expect(
          await recordSighting(
            fx.db,
            PROJECT,
            MAP_A,
            0,
            ARTIFACT_A,
            "req-a",
            SOURCE_A,
            "src/app.js",
            at,
          ),
        ).toEqual({ ok: true, changes: 1 });
      }
      expect(countRows(fx, "source_sightings")).toBe(1);
      const row = fx.raw
        .prepare("SELECT recovered_at FROM source_sightings")
        .get() as { recovered_at: number };
      expect(row.recovered_at).toBe(2000);
    } finally {
      fx.close();
    }
  });

  it("re-running it does NOT un-stick a tombstone", async () => {
    // THE DEFECT THIS OMISSION PREVENTS, EXECUTED. An upsert whose update arm
    // reset `producibility` would clear every tombstone the day the artifact
    // was re-analysed — silently, because the write reports success either way.
    const fx = await migratedFixture();
    try {
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_A,
        "req-a",
        SOURCE_A,
        "src/app.js",
        2000,
      );
      await markProducibility(
        fx.db,
        PROJECT,
        ARTIFACT_A,
        MAP_A,
        0,
        "gone",
        5000,
      );
      await recordSighting(
        fx.db,
        PROJECT,
        MAP_A,
        0,
        ARTIFACT_A,
        "req-a",
        SOURCE_A,
        "src/app.js",
        8000,
      );
      const row = fx.raw
        .prepare("SELECT producibility, producibility_at FROM source_sightings")
        .get() as { producibility: string; producibility_at: number };
      expect(row.producibility).toBe("gone");
      expect(row.producibility_at).toBe(5000);
    } finally {
      fx.close();
    }
  });

  it("counts against SOURCE_ROWS_PER_MAP_MAX at the bound and one past it", async () => {
    // THE BOUND IS A ROW BOUND, so MAP-06's aggregate limit and Pitfall 2's
    // convergence fix are the SAME constant. This function only COUNTS — the
    // refusal is the caller's and is plan 07-05's — so what is asserted here is
    // that the count the caller compares against is the count that is there.
    //
    // Seeded with raw inserts rather than through `recordSighting`: writing
    // 2,048 rows one awaited statement at a time is the fixture being slow, not
    // the property being tested.
    const fx = await migratedFixture();
    try {
      const stmt = fx.raw.prepare(
        `INSERT INTO source_sightings (project_id, map_sha256, source_index,
                                       artifact_sha256, request_id, producibility,
                                       recovered_at)
         VALUES (?, ?, ?, ?, 'req-a', ?, 2000)`,
      );
      for (let i = 0; i < SOURCE_ROWS_PER_MAP_MAX; i += 1) {
        stmt.run(PROJECT, MAP_A, i, ARTIFACT_A, SOURCE_PRODUCIBILITY_STATES[0]);
      }
      expect(await countSourcesForMap(fx.db, PROJECT, ARTIFACT_A, MAP_A)).toBe(
        SOURCE_ROWS_PER_MAP_MAX,
      );

      // ONE MORE. The count crosses the bound, which is the observation the
      // caller's refusal is built on.
      stmt.run(
        PROJECT,
        MAP_A,
        SOURCE_ROWS_PER_MAP_MAX,
        ARTIFACT_A,
        SOURCE_PRODUCIBILITY_STATES[0],
      );
      expect(
        await countSourcesForMap(fx.db, PROJECT, ARTIFACT_A, MAP_A),
      ).toBeGreaterThan(SOURCE_ROWS_PER_MAP_MAX);
    } finally {
      fx.close();
    }
  });
});
