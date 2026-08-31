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
  tableInfo,
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

/** Apply every step UP TO AND INCLUDING v5 and stop there — the ladder exactly
 *  as plan 06-01's build shipped it, before `audit`'s `kind` CHECK was widened.
 *  Raw handle deliberately, for the reason {@link applyV1Only} uses one: this is
 *  simulating a PREVIOUS RELEASE, so it must not go through this build's
 *  `migrate()`. */
function applyThroughV5(fx: ReturnType<typeof createFixtureDb>): void {
  for (const m of MIGRATIONS) {
    if (m.v > 5) break;
    fx.raw.exec(m.sql);
  }
  fx.raw.exec("PRAGMA user_version = 5");
}

/** The SEVEN kinds step v3 shipped, written out rather than imported from
 *  `audit.ts`.
 *
 *  Importing `AUDIT_KINDS` here would be wrong in a way that matters: this array
 *  stands for the rows a database written by the OLD build actually holds, and
 *  `AUDIT_KINDS` is the vocabulary of the NEW one. Bound to the live constant,
 *  this seed would silently start writing the two new members and the
 *  preservation case would stop being about preservation at all. */
const SHIPPED_AUDIT_KINDS = [
  "triage_set",
  "suppression_create",
  "suppression_remove",
  "finding_projected",
  "export_raw",
  "export_redacted",
  "value_revealed",
];

/** One audit row per shipped kind, in TWO projects.
 *
 *  Two projects rather than one because the rebuild's copy carries NO
 *  `project_id` predicate — copying every project is the point of a table
 *  rebuild rather than the cross-project leak that predicate normally prevents —
 *  and a single-project seed could not tell a correct whole-table copy from a
 *  copy that silently dropped everyone else. */
function seedAudit(fx: ReturnType<typeof createFixtureDb>): void {
  const stmt = fx.raw.prepare(
    `INSERT INTO audit (project_id, event_id, at, kind, subject, detail)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  let n = 0;
  for (const project of ["proj-alpha", "proj-beta"]) {
    for (const kind of SHIPPED_AUDIT_KINDS) {
      n += 1;
      stmt.run(
        project,
        `evt-${String(n).padStart(4, "0")}`,
        1_700_000_000_000 + n,
        kind,
        `subject-${kind}`,
        // A NULL detail on one row per project, so "every column survives"
        // covers the nullable one too. `INSERT OR IGNORE` skipping a row is
        // SILENT, and a defaulted NULL would look identical to a preserved one
        // if no row carried it.
        n % 7 === 0 ? null : `detail-${String(n)}`,
      );
    }
  }
}

function readAudit(fx: ReturnType<typeof createFixtureDb>): object[] {
  return fx.raw
    .prepare(
      `SELECT project_id, event_id, at, kind, subject, detail
       FROM audit ORDER BY project_id ASC, event_id ASC`,
    )
    .all()
    .map((r) => ({ ...r }));
}

/** Every index this database holds, by name. */
function indexNames(fx: ReturnType<typeof createFixtureDb>): string[] {
  return (
    fx.raw
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC",
      )
      .all() as { name: string }[]
  ).map((r) => String(r.name));
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

  it("the ladder head is step v6 — the version bump IS the appended entry", () => {
    // `SCHEMA_VERSION` is derived from the LAST entry, so appending a step is the
    // whole version bump and there is no second place to forget. Asserted against
    // the literal 6 rather than against `MIGRATIONS.length`: a step number that
    // silently skipped or repeated would satisfy a length comparison.
    expect(SCHEMA_VERSION).toBe(6);
    for (const v of [3, 4, 5, 6]) {
      expect(
        MIGRATIONS.find((m) => m.v === v),
        `step v${String(v)} is missing`,
      ).toBeDefined();
    }
  });

  it("step v6 is its OWN step and step v5 was not edited to carry it", () => {
    // D-16 widens `audit`'s closed `kind` CHECK. The ladder is forward-only and
    // shipped steps are immutable, so the widening MUST arrive as a new entry —
    // folding it into v5 would change the schema of new installs only and
    // silently fork them from every database already at v5.
    const v5 = MIGRATIONS.find((m) => m.v === 5)?.sql ?? "";
    const v6 = MIGRATIONS.find((m) => m.v === 6)?.sql ?? "";
    expect(v5).not.toContain("scan_discarded");
    expect(v5).not.toContain("scan_suspended_by_retention");
    expect(v5).not.toMatch(/\baudit\b/);
    expect(v6).toContain("scan_discarded");
    expect(v6).toContain("scan_suspended_by_retention");

    // And step v3 — the step that CREATED the constraint being widened — is
    // untouched: it still declares exactly the seven it shipped with.
    const v3 = MIGRATIONS.find((m) => m.v === 3)?.sql ?? "";
    expect(v3).toContain(
      "CHECK (kind IN ('triage_set', 'suppression_create', 'suppression_remove', 'finding_projected', 'export_raw', 'export_redacted', 'value_revealed'))",
    );
    expect(v3).not.toContain("scan_discarded");
  });

  it("step v5's DDL is a COMPLETE LITERAL — no column arrives by computation", () => {
    // The one-way property, asserted as text rather than trusted to a comment.
    // Shipped steps are immutable, `schema.spec.ts` asserts `EXPECTED_TABLES`
    // exactly and `COLUMN_ALLOWLIST` names every column of every table, so the
    // column list approved at plan 06-01's blocking-human checkpoint
    // (2026-08-31) can only be changed by ANOTHER forward step. A DDL string
    // assembled at run time would put that list somewhere a reviewer reading
    // the diff cannot see it.
    const v5 = MIGRATIONS.find((m) => m.v === 5);
    expect(v5, "step v5 is missing").toBeDefined();
    const sql = v5?.sql ?? "";

    // The approved eighteen, each named. A column added to the DDL without a
    // line here fails `schema.spec.ts`'s allowlist; a column REMOVED from the
    // DDL fails here, which is the direction an allowlist cannot see.
    for (const column of [
      "project_id",
      "scan_id",
      "state",
      "suspend_reason",
      "operator_filter",
      "epoch",
      "last_request_id",
      "last_cursor",
      "last_created_at",
      "pages_walked",
      "seen",
      "admitted",
      "skipped_done",
      "rejected",
      "queued",
      "started_at",
      "updated_at",
      "finished_at",
    ]) {
      expect(sql, `scans.${column} is not in step v5`).toContain(column);
    }

    // THE STATE COLUMN IS `state`, NEVER `scan_state`. `analyses.scan_state`
    // already exists over a DIFFERENT closed vocabulary, and two vocabularies
    // under one column name in one database is the drift shape this repo keeps
    // catching (06-UI-SPEC.md § "Two Vocabularies With One Name", mechanism 1).
    expect(sql).not.toContain("scan_state");
    expect(sql).toContain(
      "CHECK (state IN ('running','suspended','completed','discarded'))",
    );

    // `project_id` FIRST in the primary key — asserted structurally in
    // `schema.spec.ts` by PRAGMA ordinal, and here as the DDL a reviewer reads.
    expect(sql).toContain("PRIMARY KEY (project_id, scan_id)");

    // NO BLOB and no untyped column. Every column is TEXT or INTEGER, which is
    // what keeps DEPLOY-04's "fixed-shape metadata" claim true by construction.
    expect(sql).not.toMatch(/\bBLOB\b/);
  });

  it("step v5's one-running index is PARTIAL and UNIQUE — the invariant is the driver's", () => {
    // The one-scan-per-project rule cannot be a read-then-write: `BEGIN` does
    // not span `exec` calls on this driver, so a caller-side "is one already
    // running" check is two operations nothing can make atomic. A partial
    // unique index makes the second start fail INSIDE the insert.
    const fx = createFixtureDb();
    try {
      const v5 = MIGRATIONS.find((m) => m.v === 5);
      expect(v5?.sql ?? "").toContain(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_scans_one_running",
      );
      expect(v5?.sql ?? "").toContain("WHERE state = 'running'");
    } finally {
      fx.close();
    }
  });

  it("step v5 brings `scans` to a database that stopped at v1, losing no seeded row", async () => {
    // The same property the v3 case asserts, re-asserted for the step that
    // actually ships in this plan: a migration can succeed on an EMPTY database
    // and destroy a populated one.
    const fx = createFixtureDb();
    try {
      applyV1Only(fx);
      seedArtifacts(fx);
      const before = readArtifacts(fx);

      const report = await migrate(fx.db);
      expect(report.ok, JSON.stringify(report.steps)).toBe(true);
      expect(userVersion(fx.raw)).toBe(5);

      expect(readArtifacts(fx)).toEqual(before);
      expect(listTables(fx.raw)).toContain("scans");

      // The column set as SQLite actually built it, not as the DDL claims.
      const columns = tableInfo(fx.raw, "scans").map((c) => c.name);
      expect(columns).toHaveLength(18);
      expect(columns).not.toContain("id");
    } finally {
      fx.close();
    }
  });

  it("step v4 indexes the SECOND sort key on each pageable table", async () => {
    // The reason this is asserted structurally rather than trusted: an
    // `ORDER BY byte_len DESC, sha256 DESC` with no index behind it does not
    // fail, it just top-N sorts the whole project partition once per page — on
    // the single QuickJS thread, at a cost of the same order as the
    // `LIMIT ... OFFSET` form the UI design contract bans. A dropped index is a
    // silent regression of exactly that shape.
    const fx = createFixtureDb();
    try {
      const report = await migrate(fx.db);
      expect(report.ok, JSON.stringify(report.steps)).toBe(true);

      const indexes = (
        fx.raw
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC",
          )
          .all() as { name: string }[]
      ).map((r) => String(r.name));

      expect(indexes).toContain("idx_artifacts_size_keyset");
      expect(indexes).toContain("idx_observations_status_keyset");
      // Step v3's pair is still there — appending a step must never have
      // replaced one.
      expect(indexes).toContain("idx_artifacts_keyset");
      expect(indexes).toContain("idx_observations_keyset");
    } finally {
      fx.close();
    }
  });

  it("step v3 brings `audit` to a database that stopped at v1, losing no seeded row", async () => {
    const fx = createFixtureDb();
    try {
      applyV1Only(fx);
      seedArtifacts(fx);
      const before = readArtifacts(fx);

      const report = await migrate(fx.db);
      expect(report.ok, JSON.stringify(report.steps)).toBe(true);
      // The ladder runs to its HEAD, not to v3: a step appended after v3 must
      // not turn this case red, and pinning the literal here would guarantee it
      // did. What this case is about is `audit` arriving, asserted below.
      expect(report.version).toBe(SCHEMA_VERSION);
      expect(userVersion(fx.raw)).toBe(SCHEMA_VERSION);
      expect(readArtifacts(fx)).toEqual(before);

      expect(listTables(fx.raw)).toContain("audit");

      // The table is USABLE, not merely present: the natural key, the non-empty
      // project scope and the closed `kind` vocabulary are all in force. A
      // `listTables` assertion alone would pass against a table with the wrong
      // shape entirely.
      const cols = tableInfo(fx.raw, "audit").map((c) => c.name);
      expect(cols).toEqual([
        "project_id",
        "event_id",
        "at",
        "kind",
        "subject",
        "detail",
      ]);
      const pk = tableInfo(fx.raw, "audit")
        .filter((c) => c.pk > 0)
        .sort((a, b) => a.pk - b.pk)
        .map((c) => c.name);
      expect(pk).toEqual(["project_id", "event_id"]);
    } finally {
      fx.close();
    }
  });

  it("step v3's indexes exist and their DIRECTIONS are the ones the keyset reads need", async () => {
    const fx = createFixtureDb();
    try {
      await migrate(fx.db);

      const idx = fx.raw
        .prepare(
          `SELECT name, sql FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'`,
        )
        .all()
        .map((r) => ({ ...r })) as { name: string; sql: string | null }[];
      const byName = new Map(idx.map((r) => [r.name, r.sql ?? ""]));

      expect(byName.has("idx_audit_at")).toBe(true);

      // UNIFORM DESC on both non-project columns. Read out of `sqlite_master`
      // rather than out of the source text, so this asserts what the DATABASE
      // built and not what the migration string says.
      const artifactsKeyset = byName.get("idx_artifacts_keyset") ?? "";
      expect(artifactsKeyset).toMatch(/last_seen_at\s+DESC/i);
      expect(artifactsKeyset).toMatch(/sha256\s+DESC/i);

      const observationsKeyset = byName.get("idx_observations_keyset") ?? "";
      expect(observationsKeyset).toMatch(/observed_at\s+DESC/i);
      expect(observationsKeyset).toMatch(/request_id\s+DESC/i);

      // And the SHIPPED list statements' own indexes are untouched beside them —
      // the new pair is an addition, not a replacement.
      expect(byName.has("idx_artifacts_last_seen")).toBe(true);
      expect(byName.has("idx_observations_observed_at")).toBe(true);
    } finally {
      fx.close();
    }
  });

  it("EVERY statement in EVERY step is one that CANNOT FAIL on a re-run", () => {
    // ==================================================================
    // THE RULE, RESTATED AS THE PROPERTY IT ACTUALLY DEPENDS ON
    // ==================================================================
    // The whole justification for batching a step's statements into one `exec`
    // is that no statement in it can fail on a re-run: an `exec` that FAILS
    // strands an open write transaction on a pooled connection nothing in the
    // plugin API can reach, and every subsequent write then reports "database
    // is locked" until the plugin restarts.
    //
    // THIS GATE USED TO SAY `IF NOT EXISTS`, AND IT USED TO LOOK ONLY AT
    // STATEMENTS BEGINNING WITH `CREATE`. Both were narrower than the rule.
    // `IF NOT EXISTS` is the usual WAY of being unable to fail, not the
    // property itself; and filtering to `CREATE` meant a step could add an
    // `UPDATE`, a bare `INSERT` or an unguarded `DROP` and this gate would not
    // look at it at all. Step v6 is the first step with non-`CREATE`
    // statements, so the gate is widened to the rule rather than the step being
    // written around the gate.
    //
    // Each allowed form below carries its OWN argument for why it cannot fail.
    // A form not on this list is not "probably fine" — it is a form nobody has
    // made the argument for, and adding one means adding the paragraph.
    const FORMS: { name: string; re: RegExp; why: string }[] = [
      {
        name: "CREATE … IF NOT EXISTS",
        re: /^CREATE\s+(UNIQUE\s+)?(TABLE|INDEX|TRIGGER)\s+IF\s+NOT\s+EXISTS\b/i,
        why: "the guard makes a second application a no-op",
      },
      {
        name: "DROP … IF EXISTS",
        re: /^DROP\s+(TABLE|INDEX)\s+IF\s+EXISTS\b/i,
        why: "the guard makes an absent target a no-op",
      },
      {
        name: "INSERT OR IGNORE … SELECT",
        re: /^INSERT\s+OR\s+IGNORE\s+INTO\b/i,
        why: "OR IGNORE turns every constraint conflict into a skipped row, so a re-run over rows already copied writes nothing and raises nothing",
      },
      {
        name: "ALTER TABLE … RENAME TO",
        re: /^ALTER\s+TABLE\s+[A-Za-z_][A-Za-z0-9_]*\s+RENAME\s+TO\s+[A-Za-z_][A-Za-z0-9_]*$/i,
        why: "cannot fail ONLY because the target name is dropped earlier in the same step — asserted positionally below, not assumed",
      },
      {
        name: "a trigger body's END",
        re: /^END$/i,
        why: "not a statement: splitting a CREATE TRIGGER on the `;` inside its own body leaves this fragment",
      },
    ];

    for (const m of MIGRATIONS) {
      const statements = m.sql
        .split(";")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      expect(statements.length, `step v${m.v} declared nothing`).toBeGreaterThan(
        0,
      );
      for (const st of statements) {
        const form = FORMS.find((f) => f.re.test(st));
        expect(
          form,
          `step v${m.v} has a statement in no argued-safe form: ${st.slice(0, 90)}`,
        ).toBeDefined();
      }

      // A form the list deliberately does NOT contain, asserted as an absence so
      // the omission is a rule rather than an oversight: a step may not carry a
      // bare INSERT, an UPDATE or a DELETE. Each of those CAN fail on a re-run
      // or CAN destroy a row, and neither belongs inside a batched `exec`.
      for (const banned of [
        /^INSERT\s+INTO\b/i,
        /^UPDATE\b/i,
        /^DELETE\s+FROM\b/i,
        /^DROP\s+TABLE\s+(?!IF\s+EXISTS)/i,
      ]) {
        for (const st of statements) {
          expect(
            banned.test(st),
            `step v${m.v} carries a statement that can fail or destroy: ${st.slice(0, 90)}`,
          ).toBe(false);
        }
      }
    }
  });

  it("a RENAME's target name is DROPPED earlier in the same step", () => {
    // The `ALTER TABLE … RENAME TO` form's cannot-fail argument is the ONLY one
    // on the list that is not self-contained: a rename onto an occupied name
    // fails, so the form is safe because of the statement BEFORE it and for no
    // other reason. Asserted by position, because an argument that depends on
    // ordering and is not checked for ordering is a comment.
    for (const m of MIGRATIONS) {
      const statements = m.sql
        .split(";")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      statements.forEach((st, i) => {
        const rename = /^ALTER\s+TABLE\s+([A-Za-z_][A-Za-z0-9_]*)\s+RENAME\s+TO\s+([A-Za-z_][A-Za-z0-9_]*)$/i.exec(
          st,
        );
        if (rename === null) return;
        const target = rename[2] ?? "";
        const droppedEarlier = statements
          .slice(0, i)
          .some((prev) =>
            new RegExp(`^DROP\\s+TABLE\\s+IF\\s+EXISTS\\s+${target}$`, "i").test(
              prev,
            ),
          );
        expect(
          droppedEarlier,
          `step v${m.v} renames onto \`${target}\` without dropping it first`,
        ).toBe(true);
      });
    }
  });

  it("an INSERT … SELECT reads a table an EARLIER step created, and writes one this step just created", () => {
    // The copy's cannot-fail argument has two halves and both are structural.
    // The SOURCE must exist when the step runs — it does, because an earlier
    // step created it and the ladder is ordered. The DESTINATION must exist too,
    // and it does because the same step creates it two statements earlier. Left
    // unchecked, a future rebuild that copied from a table added in a LATER step
    // would be a statement that fails on a fresh install and strands the
    // connection, which is the exact outcome this whole discipline exists to
    // prevent.
    for (const m of MIGRATIONS) {
      const statements = m.sql
        .split(";")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      statements.forEach((st, i) => {
        const copy =
          /^INSERT\s+OR\s+IGNORE\s+INTO\s+([A-Za-z_][A-Za-z0-9_]*)[\s\S]*\bFROM\s+([A-Za-z_][A-Za-z0-9_]*)/i.exec(
            st,
          );
        if (copy === null) return;
        const dest = copy[1] ?? "";
        const src = copy[2] ?? "";

        const createdEarlierInStep = statements
          .slice(0, i)
          .some((prev) =>
            new RegExp(
              `^CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${dest}\\b`,
              "i",
            ).test(prev),
          );
        expect(
          createdEarlierInStep,
          `step v${m.v} copies INTO \`${dest}\` without creating it first`,
        ).toBe(true);

        const createdByEarlierStep = MIGRATIONS.filter((e) => e.v < m.v).some(
          (e) =>
            new RegExp(
              `CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${src}\\b`,
              "i",
            ).test(e.sql),
        );
        expect(
          createdByEarlierStep,
          `step v${m.v} copies FROM \`${src}\`, which no earlier step creates`,
        ).toBe(true);
      });
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
