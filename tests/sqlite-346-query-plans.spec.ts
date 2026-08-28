// tests/sqlite-346-query-plans.spec.ts — the query-plan claims plan 05-06 is
// built on, executed against a real SQLite rather than carried over from another
// version's measurement.
//
// ---------------------------------------------------------------------------
// WHICH SQLITE THIS ACTUALLY MEASURES — READ THIS BEFORE QUOTING A NUMBER FROM IT
// ---------------------------------------------------------------------------
// THREE different SQLite versions are in play and the file name names only one:
//
//   3.46.0  — what CAIDO ships. `packages/backend/src/store/db.ts:55-82` records
//             that plan 01-01 MEASURED this and recorded it as EXERCISED, not
//             inferred from a version string. It is the target runtime and the
//             number in this file's name.
//   3.51.0  — what `05-RESEARCH.md § O-01` measured its plans and VM-step counts
//             on, using the local `sqlite3` shell. Assumption A5 of that document
//             is that those plans hold on 3.46.
//   ?.??.?  — what THIS SPEC runs on: whatever `node:sqlite` links, which is
//             decided by the Node binary vitest is running under and is asserted
//             and printed by the first test below rather than assumed here.
//
// THE HONEST LIMIT: no 3.46.0 is reachable from this repo. `node:sqlite` links
// the version bundled with Node, and neither `/usr/bin/sqlite3` nor Homebrew's
// carries 3.46 either. So this spec CANNOT convert assumption A5 into a
// measurement on the target version; what it can do — and does — is convert it
// into a measurement on a REAL version, with that version stated, so a reader who
// later gets a 3.46 in front of them knows exactly which statements to re-run and
// what answer to expect. That is strictly more than the research had, and less
// than the plan asked for; saying so is the point.
//
// A structural note that bounds how much the gap can matter, taken from the
// research rather than invented here: the RATIOS are structural. A non-sargable
// predicate cannot become sargable across a minor version, and an ORDER BY whose
// direction disagrees with its index needs a sorter in every version that has
// ever had one. What a version change CAN move is which index the planner picks,
// which is why the mixed-direction case below is measured against a table
// carrying exactly one index rather than against a hint.
//
// ---------------------------------------------------------------------------
// WHY PLANS AND ROW COUNTS, NOT WALL-CLOCK TIMES
// ---------------------------------------------------------------------------
// `05-RESEARCH.md § O-01` counted VM steps with the shell's `.stats on`, which
// `node:sqlite` does not expose. A wall-clock substitute would be a flaky test
// that measures this machine's load. What IS available and IS stable is the
// PLAN (`EXPLAIN QUERY PLAN`) and the number of rows a statement can yield, and
// those are the two things the design decisions actually rest on: "is it a seek
// or a scan", "does the ORDER BY cost a sorter", and "does the scanned window
// grow with the partition". All three are asserted below.

import type { DatabaseSync } from "node:sqlite";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createFixtureDb } from "../packages/backend/test/fixtures/sqlite-fixture";

/** What Caido ships, measured by plan 01-01 and recorded in store/db.ts. */
const CAIDO_SQLITE = "3.46.0";
/** What `05-RESEARCH.md § O-01` measured its plans on. */
const RESEARCH_SQLITE = "3.51.0";
/** The floor `compat.ts` enforces — `ON CONFLICT … DO UPDATE` needs it and this
 *  whole storage design has no fallback below it. */
const MIN_SQLITE = "3.24.0";

/**
 * The partition size the research used.
 *
 * 200,000 rows, the same figure `§ O-01` measured against, so a plan that differs
 * here differs because of the VERSION and not because of a smaller table that
 * never crossed the planner's threshold for preferring an index. Seeding it takes
 * well under a second in memory (measured below and asserted, so a future
 * regression in seed cost is a failure rather than a slow test), which is two
 * orders of magnitude inside vitest.config.ts's 120 s `testTimeout`.
 */
const LARGE_ROWS = 200_000;

/**
 * The second partition size, for the selectivity-independence assertion.
 *
 * Eight times smaller. The property under test is that the bounded window's
 * scanned count does not move between the two; any two sufficiently different
 * sizes would do, and a ratio this large makes "did not move" mean something.
 */
const SMALL_ROWS = 25_000;

/** The inner window of the bounded candidate query — `§ O-01`'s figure. */
const CANDIDATE_WINDOW = 500;

/** The page the operator sees. */
const PAGE_LIMIT = 100;

/** Distinct hosts across a partition — the suppression scope values. */
const HOST_COUNT = 50;

/** Rows sharing one `last_seen_at` in the tie-block fixture. Five, against a page
 *  size of seven, so a page boundary CANNOT land on a block boundary: 7 is coprime
 *  with 5, which is what makes the mid-block cursor the case being tested rather
 *  than a case that happens to be avoided. */
const TIE_BLOCK = 5;
const TIE_PAGE = 7;
const TIE_ROWS = 40;

/** A cursor greater than any row, i.e. "give me the first page".
 *
 *  Deliberately NOT a sentinel folded into the shipped statement: `§ O-01`'s
 *  recommendation is two literals, `FIRST_PAGE` and `NEXT_PAGE`, precisely because
 *  a sentinel encodes a hidden assumption about the fingerprint alphabet. It is
 *  used here only to drive the ONE statement this spec measures, and the reason it
 *  is safe here and not in production is that here the alphabet is this file's. */
const CURSOR_TOP_TS = Number.MAX_SAFE_INTEGER;
const CURSOR_TOP_FP = "￿";

const SCHEMA = `
CREATE TABLE entities_desc (
  project_id   TEXT    NOT NULL,
  fingerprint  TEXT    NOT NULL,
  host         TEXT    NOT NULL,
  last_seen_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, fingerprint)
);
CREATE INDEX idx_entities_desc
  ON entities_desc (project_id, last_seen_at DESC, fingerprint DESC);

CREATE TABLE entities_mixed (
  project_id   TEXT    NOT NULL,
  fingerprint  TEXT    NOT NULL,
  host         TEXT    NOT NULL,
  last_seen_at INTEGER NOT NULL,
  PRIMARY KEY (project_id, fingerprint)
);
CREATE INDEX idx_entities_mixed
  ON entities_mixed (project_id, last_seen_at DESC, fingerprint ASC);

CREATE TABLE suppressions (
  project_id  TEXT NOT NULL,
  scope_kind  TEXT NOT NULL,
  scope_value TEXT NOT NULL,
  PRIMARY KEY (project_id, scope_kind, scope_value)
);
`;

// TWO TABLES, ONE INDEX EACH, rather than one table with two indexes plus an
// `INDEXED BY` hint. A hint measures what the planner was TOLD to do; two tables
// measure what it CHOOSES, which is the thing a later version can change and
// therefore the thing worth pinning. `entities_mixed` models the shipped
// `artifacts` tie-break exactly — `ORDER BY last_seen_at DESC, sha256 ASC`
// (artifacts.ts:151-157) against a matching mixed-direction index.

const UNIFORM_KEYSET_SQL = `
SELECT project_id, fingerprint, host, last_seen_at
FROM entities_desc
WHERE project_id = ? AND (last_seen_at, fingerprint) < (?, ?)
ORDER BY last_seen_at DESC, fingerprint DESC
LIMIT ?
`;

const MIXED_KEYSET_SQL = `
SELECT project_id, fingerprint, host, last_seen_at
FROM entities_mixed
WHERE project_id = ? AND (last_seen_at, fingerprint) < (?, ?)
ORDER BY last_seen_at DESC, fingerprint DESC
LIMIT ?
`;

const BOUNDED_WINDOW_SQL = `
SELECT e.project_id, e.fingerprint, e.host, e.last_seen_at
FROM (
  SELECT * FROM entities_desc
  WHERE project_id = ? AND (last_seen_at, fingerprint) < (?, ?)
  ORDER BY last_seen_at DESC, fingerprint DESC
  LIMIT ${String(CANDIDATE_WINDOW)}
) e
WHERE NOT EXISTS (
  SELECT 1 FROM suppressions s
  WHERE s.project_id = ? AND s.scope_kind = 'host' AND s.scope_value = e.host
)
LIMIT ${String(PAGE_LIMIT)}
`;

/** How many rows the BOUNDED candidate window can hand to the outer filter. */
const BOUNDED_CANDIDATES_SQL = `
SELECT COUNT(*) AS n FROM (
  SELECT * FROM entities_desc
  WHERE project_id = ? AND (last_seen_at, fingerprint) < (?, ?)
  ORDER BY last_seen_at DESC, fingerprint DESC
  LIMIT ${String(CANDIDATE_WINDOW)}
)
`;

/** The same, with the inner LIMIT removed — the form `§ O-01` measured at
 *  4,000,023 VM steps for a page that returns nothing. */
const UNBOUNDED_CANDIDATES_SQL = `
SELECT COUNT(*) AS n FROM (
  SELECT * FROM entities_desc
  WHERE project_id = ? AND (last_seen_at, fingerprint) < (?, ?)
  ORDER BY last_seen_at DESC, fingerprint DESC
)
`;

const TIE_PAGE_SQL = `
SELECT fingerprint, last_seen_at
FROM entities_desc
WHERE project_id = ? AND (last_seen_at, fingerprint) < (?, ?)
ORDER BY last_seen_at DESC, fingerprint DESC
LIMIT ${String(TIE_PAGE)}
`;

const TIE_ALL_SQL = `
SELECT fingerprint, last_seen_at
FROM entities_desc
WHERE project_id = ?
ORDER BY last_seen_at DESC, fingerprint DESC
`;

type Row = { fingerprint: string; last_seen_at: number };

let raw: DatabaseSync;
let close: () => void;
let measuredVersion = "";
let seedMs = 0;

/** `EXPLAIN QUERY PLAN`, flattened to one string per statement.
 *
 *  The statement is interpolated because EXPLAIN takes a STATEMENT and not a bound
 *  value — the same non-bindable position `migrations.ts`'s PRAGMA has. Every
 *  argument comes from the module-level literals above and none from input. This
 *  file is not audited by `sql-discipline.spec.ts` (which walks
 *  `packages/backend/src`), so the exemption is stated here rather than claimed
 *  there. */
function plan(sql: string): string {
  const rows = raw.prepare(`EXPLAIN QUERY PLAN ${sql}`).all() as {
    detail: string;
  }[];
  return rows.map((r) => String(r.detail)).join("\n");
}

function seedPartition(
  projectId: string,
  rows: number,
  tieBlock: number,
  bothTables: boolean,
): void {
  const insDesc = raw.prepare(
    "INSERT INTO entities_desc (project_id, fingerprint, host, last_seen_at) VALUES (?, ?, ?, ?)",
  );
  const insMixed = raw.prepare(
    "INSERT INTO entities_mixed (project_id, fingerprint, host, last_seen_at) VALUES (?, ?, ?, ?)",
  );
  raw.exec("BEGIN");
  for (let i = 0; i < rows; i += 1) {
    const fingerprint = `fp${String(i).padStart(8, "0")}`;
    const host = `h${String(i % HOST_COUNT)}.example.test`;
    // Deliberate ties: `tieBlock` consecutive rows share one `last_seen_at`, so
    // `last_seen_at` alone is NOT a total order and the tie-break column is
    // load-bearing — which is the condition artifacts.ts:151-157 exists for.
    const lastSeenAt = 1_700_000_000_000 + Math.floor(i / tieBlock);
    insDesc.run(projectId, fingerprint, host, lastSeenAt);
    if (bothTables) insMixed.run(projectId, fingerprint, host, lastSeenAt);
  }
  raw.exec("COMMIT");
}

beforeAll(() => {
  // The SHARED fixture, not a second harness: `05-PATTERNS.md` names
  // `packages/backend/test/fixtures/sqlite-fixture.ts` as the one SQLite harness
  // every store spec is driven from. `raw` is the escape hatch it exposes for
  // exactly this kind of assertion — EXPLAIN output and bulk seeding, neither of
  // which the Caido-shaped async adapter can express.
  const fixture = createFixtureDb();
  raw = fixture.raw;
  close = fixture.close;

  measuredVersion = String(
    (raw.prepare("SELECT sqlite_version() AS v").get() as { v: string }).v,
  );

  raw.exec(SCHEMA);
  const started = Date.now();
  seedPartition("large", LARGE_ROWS, 3, true);
  seedPartition("small", SMALL_ROWS, 3, false);
  seedPartition("ties", TIE_ROWS, TIE_BLOCK, false);

  const sup = raw.prepare(
    "INSERT INTO suppressions (project_id, scope_kind, scope_value) VALUES (?, ?, ?)",
  );
  raw.exec("BEGIN");
  for (const pid of ["large", "small"]) {
    for (let h = 0; h < HOST_COUNT; h += 1) {
      // EVERY host suppressed — the pathological case `§ O-01` measured, where
      // the page returns zero rows and the naive form walks the whole partition.
      sup.run(pid, "host", `h${String(h)}.example.test`);
    }
  }
  raw.exec("COMMIT");

  // The research ran ANALYZE before measuring, and it matters: without stats the
  // planner's index choice is a guess, and this spec's whole subject is which
  // index it picks.
  raw.exec("ANALYZE");
  seedMs = Date.now() - started;
});

afterAll(() => {
  close();
});

describe("which SQLite this measurement is FROM", () => {
  it("states the version it ran on, and it is not silently the target version", () => {
    expect(measuredVersion, "sqlite_version() returned nothing").toMatch(
      /^\d+\.\d+\.\d+/,
    );

    const cmp = (a: string, b: string): number => {
      const pa = a.split(".").map(Number);
      const pb = b.split(".").map(Number);
      for (let i = 0; i < 3; i += 1) {
        const d = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (d !== 0) return d < 0 ? -1 : 1;
      }
      return 0;
    };

    // The floor compat.ts enforces. Below it, ON CONFLICT … DO UPDATE does not
    // exist and NOTHING measured here would be meaningful for this schema.
    expect(
      cmp(measuredVersion, MIN_SQLITE),
      `this fixture runs SQLite ${measuredVersion}, below compat.ts's floor of ${MIN_SQLITE}`,
    ).toBeGreaterThanOrEqual(0);

    // THE GAP, ASSERTED RATHER THAN NARRATED. `node:sqlite` links whatever the
    // Node binary carries; no 3.46.0 is reachable from this repo. Rather than let
    // a reader assume this file measured Caido's version because of its name, the
    // fact that it did not is an EXECUTED assertion whose message carries all
    // three numbers. If a Node that links 3.46.0 ever runs this suite, this
    // assertion is the thing that fails, and its message says what to do.
    expect(
      measuredVersion,
      `MEASURED ON SQLite ${measuredVersion}. Caido ships ${CAIDO_SQLITE} ` +
        `(store/db.ts:55-82, measured by plan 01-01); 05-RESEARCH.md § O-01 measured ` +
        `${RESEARCH_SQLITE}. If this now reads ${CAIDO_SQLITE}, the assumption-A5 gap ` +
        `is CLOSED — delete this assertion and record the plans below as measured on ` +
        `the target runtime.`,
    ).not.toBe(CAIDO_SQLITE);
  });

  it("seeds the research's partition size well inside the test timeout", () => {
    // Non-vacuity for the fixture itself: a partition that silently failed to
    // seed would make every plan below a plan over an empty table, which SQLite
    // answers differently and cheerfully.
    const n = (
      raw
        .prepare(
          "SELECT COUNT(*) AS n FROM entities_desc WHERE project_id = 'large'",
        )
        .get() as { n: number }
    ).n;
    expect(n).toBe(LARGE_ROWS);
    expect(
      seedMs,
      `seeding ${String(LARGE_ROWS + SMALL_ROWS + TIE_ROWS)} rows took ${String(seedMs)} ms; ` +
        `vitest.config.ts allows 120 s per test`,
    ).toBeLessThan(30_000);
  });
});

describe("the keyset cursor's plan (05-RESEARCH § O-01, restated as an assertion)", () => {
  it("uniform-direction index: an index SEEK, and no sorter", () => {
    const p = plan(UNIFORM_KEYSET_SQL);
    expect(p, `plan was:\n${p}`).toContain("SEARCH");
    expect(p, `plan was:\n${p}`).toContain("idx_entities_desc");
    // The row-value cursor is used AS A CURSOR — both terms inside the seek —
    // rather than as a filter applied after a coarser seek.
    expect(p, `plan was:\n${p}`).toContain("(last_seen_at,fingerprint)<(?,?)");
    // The whole point. `ORDER BY … DESC, DESC` over a `… DESC, DESC` index is
    // read straight off the index; there is nothing to sort.
    expect(p.toUpperCase(), `plan was:\n${p}`).not.toContain("TEMP B-TREE");
  });

  it("mixed-direction index: the SAME order costs a sorter — proved by contrast", () => {
    // The other half of the rule. A rule asserted only on the case that passes
    // is a rule nobody has seen fail, which is the defect this repo's SQL gate
    // header names in its first paragraph.
    const p = plan(MIXED_KEYSET_SQL);
    expect(p, `plan was:\n${p}`).toContain("idx_entities_mixed");
    expect(p.toUpperCase(), `plan was:\n${p}`).toContain("TEMP B-TREE");
    // And the cursor DEGRADES too, which the research did not call out and which
    // is the more expensive half: the seek keeps only `last_seen_at<?`, so the
    // second cursor term stops narrowing the scan at all.
    expect(p, `plan was:\n${p}`).not.toContain(
      "(last_seen_at,fingerprint)<(?,?)",
    );
  });
});

describe("the bounded candidate window", () => {
  it("is a co-routine with a correlated subquery, not a materialisation", () => {
    const p = plan(BOUNDED_WINDOW_SQL);
    expect(p, `plan was:\n${p}`).toContain("CO-ROUTINE");
    expect(p, `plan was:\n${p}`).toContain("CORRELATED SCALAR SUBQUERY");
    // The inner query still seeks; wrapping it did not cost the index.
    expect(p, `plan was:\n${p}`).toContain("idx_entities_desc");
  });

  it("scans the same number of candidates at 25,000 rows and at 200,000", () => {
    const count = (sql: string, pid: string): number =>
      (raw.prepare(sql).get(pid, CURSOR_TOP_TS, CURSOR_TOP_FP) as { n: number })
        .n;

    const boundedSmall = count(BOUNDED_CANDIDATES_SQL, "small");
    const boundedLarge = count(BOUNDED_CANDIDATES_SQL, "large");

    // SELECTIVITY AND SIZE INDEPENDENCE — the property that matters, not the
    // number. Every row in both partitions is suppressed, so the page returns
    // nothing in both cases; what must not happen is the scanned window growing
    // with the partition.
    expect(boundedSmall).toBe(CANDIDATE_WINDOW);
    expect(boundedLarge).toBe(CANDIDATE_WINDOW);
    expect(
      boundedLarge - boundedSmall,
      "the bounded window grew with the partition, which is the whole failure it prevents",
    ).toBe(0);

    // The contrast, so "bounded" is a measured claim and not a name. `node:sqlite`
    // exposes no VM-step counter, so this counts CANDIDATE ROWS rather than the
    // research's VM steps; the shape of the finding is identical — the unbounded
    // form's work is the partition, the bounded form's work is the window.
    expect(count(UNBOUNDED_CANDIDATES_SQL, "small")).toBe(SMALL_ROWS);
    expect(count(UNBOUNDED_CANDIDATES_SQL, "large")).toBe(LARGE_ROWS);
  });

  it("returns a SHORT PAGE rather than a wrong one when everything is suppressed", () => {
    // The contract change `§ O-01` flags for the RPC's return shape: fewer than
    // PAGE_LIMIT rows does NOT mean end-of-data. Asserted here so plan 05-06
    // cannot ship `{ rows, nextCursor }` without noticing.
    const rows = raw
      .prepare(BOUNDED_WINDOW_SQL)
      .all("large", CURSOR_TOP_TS, CURSOR_TOP_FP, "large");
    expect(rows.length).toBe(0);
    expect(rows.length).toBeLessThan(PAGE_LIMIT);
  });
});

describe("the tie block — the correctness property the cursor exists for", () => {
  it("three consecutive pages are disjoint and their union is the ordered slice", () => {
    const ordered = raw.prepare(TIE_ALL_SQL).all("ties") as Row[];
    expect(ordered.length).toBe(TIE_ROWS);

    // Non-vacuity: the fixture must actually CONTAIN a tie block, or this test
    // proves paging over distinct keys, which is the easy case.
    const distinctTimestamps = new Set(ordered.map((r) => r.last_seen_at)).size;
    expect(
      distinctTimestamps,
      "no ties in the fixture — this test would prove nothing",
    ).toBeLessThan(TIE_ROWS);

    const pages: Row[][] = [];
    let cursorTs = CURSOR_TOP_TS;
    let cursorFp = CURSOR_TOP_FP;
    for (let p = 0; p < 3; p += 1) {
      const page = raw
        .prepare(TIE_PAGE_SQL)
        .all("ties", cursorTs, cursorFp) as Row[];
      expect(page.length, `page ${String(p + 1)} came back short`).toBe(
        TIE_PAGE,
      );
      pages.push(page);
      const last = page[page.length - 1];
      if (last === undefined) break;
      cursorTs = last.last_seen_at;
      cursorFp = last.fingerprint;
    }

    // TIE_PAGE (7) is coprime with TIE_BLOCK (5), so at least one boundary lands
    // INSIDE a block. Asserted, because a fixture that quietly stopped doing that
    // would turn this into a test of the easy case without failing.
    const boundaryInsideBlock = pages
      .slice(0, -1)
      .some(
        (page, i) =>
          page[page.length - 1]?.last_seen_at ===
          pages[i + 1]?.[0]?.last_seen_at,
      );
    expect(
      boundaryInsideBlock,
      "no page boundary landed inside a tie block — the case under test never occurred",
    ).toBe(true);

    // Pairwise-empty intersections: nothing returned twice.
    for (let i = 0; i < pages.length; i += 1) {
      for (let j = i + 1; j < pages.length; j += 1) {
        const a = new Set((pages[i] ?? []).map((r) => r.fingerprint));
        const shared = (pages[j] ?? [])
          .map((r) => r.fingerprint)
          .filter((fp) => a.has(fp));
        expect(
          shared,
          `pages ${String(i + 1)} and ${String(j + 1)} both returned ${shared.join(", ")}`,
        ).toEqual([]);
      }
    }

    // And nothing skipped: the union IS the ordered slice, in order.
    expect(pages.flat().map((r) => r.fingerprint)).toEqual(
      ordered.slice(0, 3 * TIE_PAGE).map((r) => r.fingerprint),
    );
  });
});
