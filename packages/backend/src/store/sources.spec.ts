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

/**
 * A migrated fixture whose `source_sightings` has been RE-KEYED to the wider key
 * — `(project_id, artifact_sha256, map_sha256, source_index)`.
 *
 * WHY THIS EXISTS AND WHY IT IS NOT A MIGRATION. The shipped `v: 8` key is
 * `(project_id, map_sha256, source_index)`, so two sightings that share a map
 * and an index while naming different bundles are not merely unwritten by
 * `recordSighting`'s attribution guard — they are UNREPRESENTABLE, and a direct
 * `INSERT` is refused by the primary key itself. The two-bundle disambiguation
 * these cases assert therefore cannot be constructed against the shipped table
 * at all, and plan 07-11 is forbidden from touching `store/migrations.ts`: the
 * widening is 07-12's, behind an operator checkpoint.
 *
 * So the wider world is built HERE, in the spec, against a table this fixture
 * owns. That buys the property the widened statements exist for — a read and a
 * write that each name ONE sighting — proven BEFORE the key moves, which is the
 * whole reason 07-11 ships ahead of 07-12: there must be no commit at which
 * `readSightingOrigin` can match two rows and `stmt.get` returns whichever one
 * SQLite reaches first.
 *
 * THE DDL IS READ OUT OF `sqlite_master` AND REWRITTEN, never restated. The
 * producibility-vocabulary case above reads its `CHECK` constraint the same way
 * and for the same reason: a second copy of the DDL in a spec is a second
 * declaration that drifts the day the first one is edited. Only the `PRIMARY
 * KEY` clause is substituted, and the substitution is asserted to have changed
 * something — so the day 07-12 widens the shipped key, this helper turns red
 * naming the clause it could not find rather than silently testing nothing.
 */
async function widerKeyFixture(): Promise<SqliteFixture> {
  const fx = await migratedFixture();
  const ddl = (
    fx.raw
      .prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'source_sightings'",
      )
      .get() as { sql: string }
  ).sql;
  const wider = ddl.replace(
    "PRIMARY KEY (project_id, map_sha256, source_index)",
    "PRIMARY KEY (project_id, artifact_sha256, map_sha256, source_index)",
  );
  expect(
    wider,
    "the shipped PRIMARY KEY clause was not found in the source_sightings DDL, " +
      "so this fixture re-keyed nothing and every case built on it is vacuous",
  ).not.toBe(ddl);
  fx.raw.exec("DROP TABLE source_sightings");
  fx.raw.exec(wider);
  return fx;
}

/** Two sightings of ONE `(map, index)` naming two different bundles, each with
 *  its own request. Only representable against {@link widerKeyFixture}. */
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
      expect(await countSourcesForMap(fx.db, PROJECT, MAP_A)).toBe(0);

      // THE CONTROL, through the identical path.
      await write(MAP_B, [{ index: 0, label: "src/app.js" }]);
      expect(await countSourcesForMap(fx.db, PROJECT, MAP_B)).toBe(1);

      // And the empty map is still empty after the control wrote — the two are
      // separate partitions, not one table that happened to be empty.
      expect(await countSourcesForMap(fx.db, PROJECT, MAP_A)).toBe(0);
      expect(countRows(fx, "source_sightings")).toBe(1);
    } finally {
      fx.close();
    }
  });
});

describe("HI-03 — one map in TWO bundles never reattributes the first's evidence", () => {
  // `source_sightings` is keyed `(project_id, map_sha256, source_index)` and
  // `map_sha256` is content-addressed over the DECODED MAP JSON, never over the
  // bundle. Two different bundles can therefore share a `map_sha256` — a CDN
  // mirror with a different banner comment, a decoy stub carrying a copy, or
  // the same library genuinely re-bundled — and the second ingest used to
  // OVERWRITE the first's attribution rather than colliding with it.
  //
  // This is the executed form of the finding. It is target-triggerable at will:
  // the second bundle only has to carry a copy of the same map.

  it("keeps artifact A's attribution when artifact B carries the same map", async () => {
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
      // DISCARDED, AND IT SAYS SO. `changes: 0` is what the consumer branches
      // on; before the guard this was `changes: 1` and the row had moved.
      expect(second).toEqual({ ok: true, changes: 0 });

      const row = fx.raw
        .prepare(
          "SELECT artifact_sha256, request_id, recovered_at FROM source_sightings WHERE source_index = 0",
        )
        .get() as {
        artifact_sha256: string;
        request_id: string;
        recovered_at: number;
      };
      // ARTIFACT A'S DRILL-DOWN STILL FINDS THIS ROW. `listRecoveredSourcesPage`
      // is scoped `WHERE sg.artifact_sha256 = ?`, and
      // `countRecoveredSourcesByArtifact` reporting 0 for A on the
      // `scan_state = 'done'` ground is the RESOLVED zero — the one the whole
      // zero-versus-unknown design exists to make mean "DefMiner looked and
      // there was nothing".
      expect(row.artifact_sha256).toBe(ARTIFACT_A);
      expect(row.request_id).toBe("req-a");
      expect(row.recovered_at).toBe(2000);
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

  it("does not un-stick a tombstone by way of the declined arm", async () => {
    // A discarded write must change NOTHING, including the one column whose
    // stickiness D-23 guarantees. The guard fails the whole update rather than
    // part of it.
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
      await markProducibility(fx.db, PROJECT, MAP_A, 0, "gone", 5000);
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
      ).toEqual({ ok: true, changes: 0 });
      const row = fx.raw
        .prepare(
          "SELECT producibility, producibility_at, artifact_sha256 FROM source_sightings",
        )
        .get() as {
        producibility: string;
        producibility_at: number;
        artifact_sha256: string;
      };
      expect(row.producibility).toBe("gone");
      expect(row.producibility_at).toBe(5000);
      expect(row.artifact_sha256).toBe(ARTIFACT_A);
    } finally {
      fx.close();
    }
  });

  it("scopes the guard by PROJECT: another project's bundle is a separate row", async () => {
    // The key leads on `project_id`, so this is a different partition entirely
    // and the guard has nothing to decline. Non-vacuity for the case above:
    // `changes: 0` there is about the ARTIFACT and not about the statement.
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

describe("W-3 — a sighting is READ by a key that names its bundle", () => {
  it("answers each bundle with its OWN request when two share (map, index)", async () => {
    // THE MULTI-MATCH THIS PLAN EXISTS TO PREVENT. Under the shipped key this
    // pair cannot be written at all, so the read's ambiguity is invisible; the
    // moment 07-12 widens the key it becomes the ORDINARY case, and a `WHERE`
    // that binds only map and index would hand back whichever row SQLite
    // reached first. Measured against the pre-widening statement this case
    // returned `req-a` for BOTH asks.
    const fx = await widerKeyFixture();
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
        MAP_A,
        0,
        "gone",
        5000,
      );
      expect(first).toEqual({ ok: true, changes: 1 });

      const second = await markProducibility(
        fx.db,
        PROJECT,
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
        await markProducibility(fx.db, "p2", MAP_A, 0, "gone", 5000),
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
      await markProducibility(fx.db, PROJECT, MAP_A, 0, "gone", 5000);
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
      expect(await countSourcesForMap(fx.db, PROJECT, MAP_A)).toBe(
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
      expect(await countSourcesForMap(fx.db, PROJECT, MAP_A)).toBeGreaterThan(
        SOURCE_ROWS_PER_MAP_MAX,
      );
    } finally {
      fx.close();
    }
  });
});
