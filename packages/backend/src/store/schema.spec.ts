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
 * credential dump. No column below can hold a response body or a cookie.
 *
 * AN AUTHORIZATION TOKEN IS A PER-GRAMMAR CLAIM, NOT A SENTENCE. Stating it as
 * one sentence is what went wrong here before, so it is stated per URL grammar
 * and no wider than the cases that RUN at the moment you are reading this:
 *
 *   ENFORCED — the QUERY grammar, everything after the first `?`. Every VALUE of
 *     a `name=value` segment is replaced, and since 2026-08-21 (decision P10-D1)
 *     so is every BARE segment carrying no `=`. Enforcing spec:
 *     `observations.spec.ts`, whose `BARE_CREDENTIAL_SHAPES` block runs one case
 *     per credential format (PAT, AWS key id, Stripe secret, session id, UUID,
 *     JWT and two short opaque tokens) and each goes RED when the branch is
 *     reverted. Proven end to end by `scripts/phase1/tracer-e2e.sh`, which reads
 *     the column with sqlite3 from outside Caido.
 *
 *   ENFORCED — URL USERINFO, since 2026-08-21 (plan 01-11). Resolved inside the
 *     AUTHORITY component only — after the first `://`, up to the first `/`, `?`
 *     or `#` — and BOTH halves are replaced, never just the password. The `@` is
 *     kept, so the fact that the URL carried userinfo survives and the bytes do
 *     not. Enforcing spec: `observations.spec.ts`'s `HEAD_CASES` block, whose
 *     MUST-NOT-TOUCH half asserts that an `@` in a PATH — `/@vite/client.js`,
 *     `/@scope/pkg/index.js` — is byte-identical, because an `@`-anywhere rule
 *     is the obvious wrong implementation.
 *
 *   ENFORCED — `;`-DELIMITED PATH PARAMETERS, since 2026-08-21 (plan 01-11), by
 *     THE SAME RULE as a query parameter and through the same internal helper:
 *     `;jsessionid=SECRETSESSION` keeps its name and loses its value, and a bare
 *     `;` segment follows P10-D1 exactly as a bare query segment does. ONE
 *     policy, two delimiters — `redactDelimitedSegment` in `observations.ts` is
 *     the single implementation both loops call, which is what makes that true
 *     rather than asserted. Enforcing spec: `observations.spec.ts`'s
 *     `HEAD_CASES`.
 *
 *   OPEN — ONE grammar outside the query still reaches this column verbatim, and
 *     it is the only one:
 *       path-embedded tokens   `https://cdn.test/download/eyJhbGciOiJIUzI1NiJ9…/app.js`
 *                              — stored whole. How signed CDN and object-store
 *                              URLs are shaped when the signature is not a query
 *                              parameter.
 *     NOT closed, and the reason is specific rather than "out of scope":
 *     distinguishing a signed-URL segment from a legitimate path segment needs
 *     either entropy scoring — for which Phase 1 has no measured false-positive
 *     rate, and which would shred ordinary hashed asset names, destroying the
 *     analytic core of this column — or a pattern, which `REDOS_RECOVERY =
 *     "kill"` forbids in that module. PINNED, not merely named: the case titled
 *     "RESIDUAL, PINNED: a token embedded in a path SEGMENT is NOT redacted" in
 *     `observations.spec.ts` asserts the current behaviour, so the day somebody
 *     closes it that case goes RED and they update it deliberately. SOURCE:
 *     WR-11.
 *
 * WHY THE WORDING CHANGED, recorded rather than quietly edited. This paragraph
 * used to read "Nothing below can hold … an authorization token", followed by
 * "THAT CLAIM WAS FALSE UNTIL 2026-08-21 AND IS NOW TRUE". Both halves were
 * wrong together in a way neither was alone. The 2026-08-21T13:45 re-verification
 * found a 40-character GitHub PAT pasted as a BARE query segment surviving
 * verbatim into this column, under an "is now true" formulation, with the only
 * test for the bound using a 104-character name — the one length at which
 * truncation is visible — so nothing could go red. An unfalsifiable residual
 * underneath an upgraded claim. The bare-segment half is now closed by
 * construction and IS falsifiable; the grammars listed above as open are not
 * closed, and saying so is the whole point of the rewrite. A claim stronger than
 * its enforcement is an attack surface on the next author, who builds on the
 * claim rather than on the code.
 *
 * AMENDED 2026-08-21 (plan 01-11), and amended in place rather than rewritten.
 * When this paragraph was written it named THREE open grammars — userinfo, `;`
 * path parameters and path-embedded tokens — all owned by plan 01-11. Two of the
 * three are now ENFORCED and are listed as such above; ONE remains, and the
 * count in this note is the record that the number moved from three to one on a
 * date rather than having always been one. The ownership note stopped being a
 * promise by the two grammars closing, not by the sentence being deleted.
 *
 * The four entries that could conceivably carry target bytes, and why each is
 * here deliberately rather than by omission:
 *   observations.url          — a URL with the fragment stripped, EVERY QUERY VALUE
 *                               REPLACED with `<redacted>` — including a BARE
 *                               `=`-less segment, which is a value with no name
 *                               (P10-D1) — the names of `name=value` pairs and
 *                               their order retained, truncated to 2048. It is the
 *                               artifact->request edge; without it the plugin
 *                               records that bytes were seen but not WHERE. The
 *                               names are the analytic value the operator's UAT
 *                               decision of 2026-08-21 deliberately kept; the
 *                               values are credentials and they are gone before the
 *                               row is written. Since 2026-08-21 (plan 01-11) the
 *                               same VALUE rule also covers the head: USERINFO is
 *                               replaced in the authority component with the `@`
 *                               kept, and `;` PATH-PARAMETER values are replaced
 *                               by the same helper the query loop uses. Enforced
 *                               by observations.spec.ts.
 *                               NOT REDACTED, and named here so this entry is not
 *                               read as a complete guarantee: a token embedded in
 *                               a path SEGMENT — the ONE grammar listed as OPEN
 *                               above, pinned by an executed case rather than left
 *                               as a sentence.
 *   observations.content_type — a response HEADER value, and the only one. Bounded
 *                               to 120 chars. It is the admission decision itself,
 *                               so recording it is what makes a wrong admission
 *                               diagnosable.
 *   analyses.error            — a PLUGIN-GENERATED diagnostic, rendered through
 *                               `describeError` (which redacts URL-shaped
 *                               substrings before truncating) and truncated again
 *                               at the write. Never target bytes. Enforced by
 *                               error-redaction.spec.ts's
 *                               `unredacted-persisted-error` rule, which exists
 *                               because the one line that writes this column is
 *                               not inside a catch clause.
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
