// packages/backend/src/store/reads.spec.ts — the behavioural half of UI-02's
// paginated reads.
//
// `sql-discipline.spec.ts` proves STATICALLY that every statement in `reads.ts`
// is a complete literal with positional binds and a project predicate. It cannot
// prove that the cursor is CORRECT, and correctness is where keyset pagination
// actually fails: a cursor whose direction does not match its ORDER BY skips rows
// and duplicates others, and nothing errors. Every case here is a property that
// would otherwise be discovered in production by an operator noticing a row they
// had already triaged appear again three pages later.
//
// Three of these cases carry their own weight and are named for it:
//
//   - THE TIE BLOCK. Three consecutive pages whose boundaries land inside a run
//     of rows sharing one sort-key value, asserted pairwise-disjoint with a union
//     equal to the expected ordered slice. This is the case the row-value cursor
//     exists for and the one a naive `sort_key < ?` cursor silently fails.
//   - THE TWO SELECTIVITY CASES. A filter matching nothing over partitions
//     differing by an order of magnitude, asserted to report the SAME scanned
//     count. That equality is the whole claim of the bounded candidate window:
//     the cost stops depending on filter selectivity.
//   - THE SHORT PAGE. `exhausted` false with a cursor still to follow versus true
//     without one, on pages that are both shorter than the limit. Conflating them
//     renders an empty state where a refetch was owed.
//
// The fixture is `node:sqlite` and is single-connection: see
// `test/fixtures/sqlite-fixture.ts` for what that means it cannot prove. Nothing
// here claims anything about connection affinity or transaction stranding.

import { readFileSync } from "node:fs";

import type { PageRequest, ScanState } from "@defminer/engine/contract";
import {
  DEGRADED_ANALYSIS_FILTER,
  isDegradedScanState,
  SCAN_STATES,
} from "@defminer/engine/contract";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createFixtureDb,
  type SqliteFixture,
} from "../../test/fixtures/sqlite-fixture";

import {
  DETECTOR_CORPUS_VERSION,
  getLatestAnalysisForArtifact,
} from "./analyses";
import { migrate } from "./migrations";
import {
  ARTIFACT_FILTER_COLUMN,
  ARTIFACT_FILTER_COLUMNS,
  ARTIFACT_SCAN_STATE_FILTER_COLUMN,
  ARTIFACT_SORT_KEYS,
  type ArtifactSortKey,
  CANDIDATE_WINDOW_ROWS,
  countInventory,
  countRecoveredSourcesByArtifact,
  INVENTORY_TABLES,
  type InventoryTable,
  KEYSET_PAGE_ROWS,
  listArtifactsPage,
  listObservationsPage,
  listRecoveredSourcesPage,
  OBSERVATION_FILTER_COLUMN,
  OBSERVATION_FILTER_COLUMNS,
  OBSERVATION_SORT_KEYS,
  type ObservationSortKey,
} from "./reads";

// ---------------------------------------------------------------------------
// FIXTURE
// ---------------------------------------------------------------------------

const PROJECT = "p1";
const OTHER_PROJECT = "p2";

/** Rows sharing one `last_seen_at` in the tie fixture. Coprime with
 *  {@link TIE_PAGE} so at least one page boundary is GUARANTEED to land inside a
 *  block — asserted below rather than assumed. */
const TIE_BLOCK = 5;
/** Page size for the tie-block case. Coprime with {@link TIE_BLOCK}. */
const TIE_PAGE = 7;
/** Rows in the tie fixture. */
const TIE_ROWS = 40;

let fx: SqliteFixture;

/** A digest-shaped, lexicographically ordered key. `sha256` is TEXT, so the
 *  tie-break compares as text and the fixture has to produce keys whose text
 *  order is stable and total. */
function digest(n: number): string {
  return "d" + String(n).padStart(8, "0");
}

function insertArtifact(
  projectId: string,
  sha256: string,
  byteLen: number,
  kind: string,
  lastSeenAt: number,
): void {
  fx.raw
    .prepare(
      "INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count) VALUES (?, ?, ?, ?, ?, ?, 1)",
    )
    .run(projectId, sha256, byteLen, kind, lastSeenAt, lastSeenAt);
}

function insertObservation(
  projectId: string,
  sha256: string,
  requestId: string,
  status: number,
  contentType: string | null,
  observedAt: number,
): void {
  fx.raw
    .prepare(
      "INSERT INTO observations (project_id, sha256, request_id, url, status, content_type, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      projectId,
      sha256,
      requestId,
      "https://example.test/" + requestId,
      status,
      contentType,
      observedAt,
    );
}

/**
 * One analysis row for an artifact, at the shipped corpus sentinel.
 *
 * `startedAt` is a parameter because the page reads pick the artifact's NEWEST
 * analysis, and "newest" is only assertable if a case can make one row newer
 * than another on purpose.
 */
function insertAnalysis(
  projectId: string,
  sha256: string,
  state: ScanState,
  options: {
    detectorSetHash?: string;
    startedAt?: number;
    bytesWalked?: number | null;
  } = {},
): void {
  fx.raw
    .prepare(
      "INSERT INTO analyses (project_id, sha256, detector_set_hash, scan_state, bytes_walked, started_at, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      projectId,
      sha256,
      options.detectorSetHash ?? DETECTOR_CORPUS_VERSION,
      state,
      options.bytesWalked ?? 1024,
      options.startedAt ?? 1_700_000_000_000,
      1_700_000_100_000,
    );
}

/** A request with the boring defaults, overridden field by field so what a case
 *  is about is visible in the override list. */
function req(over: Partial<PageRequest> = {}): PageRequest {
  return {
    projectId: PROJECT,
    sortKey: "last_seen",
    direction: "desc",
    filter: null,
    cursor: null,
    limit: KEYSET_PAGE_ROWS,
    ...over,
  };
}

beforeEach(async () => {
  fx = createFixtureDb();
  const report = await migrate(fx.db);
  expect(report.ok, JSON.stringify(report.steps)).toBe(true);
});

// ---------------------------------------------------------------------------
// ORDER, CURSOR ADVANCE AND THE PROJECT BOUNDARY
// ---------------------------------------------------------------------------

describe("a first page, and the page after it", () => {
  beforeEach(() => {
    // Distinct timestamps: this block is about ordering and cursor advance, not
    // about ties. The tie case has its own fixture below.
    for (let i = 0; i < 25; i += 1) {
      insertArtifact(PROJECT, digest(i), 1000 + i, "script", 1_700_000_000 + i);
    }
  });

  it("returns the page-size rows in the declared sort order", async () => {
    const page = await listArtifactsPage(fx.db, req({ limit: 10 }));

    expect(page.rows.length).toBe(10);
    const seen = page.rows.map((r) => r.last_seen_at);
    expect(seen).toEqual([...seen].sort((a, b) => b - a));
    // Newest first: the last row inserted leads.
    expect(page.rows[0]?.sha256).toBe(digest(24));
  });

  it("begins the next page immediately after the last returned row", async () => {
    const first = await listArtifactsPage(fx.db, req({ limit: 10 }));
    expect(first.nextCursor).not.toBeNull();

    const second = await listArtifactsPage(
      fx.db,
      req({ limit: 10, cursor: first.nextCursor }),
    );

    const a = first.rows.map((r) => r.sha256);
    const b = second.rows.map((r) => r.sha256);
    expect(b.filter((k) => a.includes(k))).toEqual([]);
    expect(b[0]).toBe(digest(14));
  });

  it("pages the whole partition with nothing repeated and nothing skipped", async () => {
    const collected: string[] = [];
    let cursor = null as PageRequest["cursor"];
    for (let guard = 0; guard < 20; guard += 1) {
      const page: Awaited<ReturnType<typeof listArtifactsPage>> =
        await listArtifactsPage(fx.db, req({ limit: 7, cursor }));
      collected.push(...page.rows.map((r) => r.sha256));
      if (page.exhausted) break;
      cursor = page.nextCursor;
    }

    expect(collected.length).toBe(25);
    expect(new Set(collected).size).toBe(25);
    const expected = Array.from({ length: 25 }, (_, i) => digest(24 - i));
    expect(collected).toEqual(expected);
  });

  it("costs a bounded number of scanned rows however deep the page is", async () => {
    // The property the keyset cursor exists for, expressed in the one term this
    // module can actually observe: `scanned` never exceeds the page limit on an
    // unfiltered read, no matter how far in the cursor has walked. An offset form
    // would grow this number with depth.
    let cursor = null as PageRequest["cursor"];
    const scans: number[] = [];
    for (let guard = 0; guard < 20; guard += 1) {
      const page: Awaited<ReturnType<typeof listArtifactsPage>> =
        await listArtifactsPage(fx.db, req({ limit: 5, cursor }));
      scans.push(page.scanned);
      if (page.exhausted) break;
      cursor = page.nextCursor;
    }
    for (const n of scans) expect(n).toBeLessThanOrEqual(5);
  });

  it("never returns another project's rows", async () => {
    insertArtifact(OTHER_PROJECT, digest(900), 1, "script", 1_800_000_000);

    const mine = await listArtifactsPage(
      fx.db,
      req({ limit: KEYSET_PAGE_ROWS }),
    );
    expect(mine.rows.map((r) => r.project_id)).toEqual(
      mine.rows.map(() => PROJECT),
    );
    expect(mine.rows.map((r) => r.sha256)).not.toContain(digest(900));

    const theirs = await listArtifactsPage(
      fx.db,
      req({ projectId: OTHER_PROJECT }),
    );
    expect(theirs.rows.length).toBe(1);
    expect(theirs.rows[0]?.sha256).toBe(digest(900));
  });

  it("answers a request with no project with an empty page rather than every project's rows", async () => {
    const page = await listArtifactsPage(fx.db, req({ projectId: "" }));
    expect(page.rows).toEqual([]);
    expect(page.exhausted).toBe(true);
    expect(page.nextCursor).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// BOTH DIRECTIONS
// ---------------------------------------------------------------------------

describe("every sort key is available in both directions", () => {
  beforeEach(() => {
    for (let i = 0; i < 12; i += 1) {
      insertArtifact(
        PROJECT,
        digest(i),
        100 + i * 7,
        "script",
        1_700_000_000 + i,
      );
    }
  });

  for (const sortKey of ["last_seen", "byte_len"]) {
    it(`${sortKey} ascending is the exact reverse of ${sortKey} descending`, async () => {
      const desc = await listArtifactsPage(
        fx.db,
        req({ sortKey, direction: "desc", limit: KEYSET_PAGE_ROWS }),
      );
      const asc = await listArtifactsPage(
        fx.db,
        req({ sortKey, direction: "asc", limit: KEYSET_PAGE_ROWS }),
      );

      expect(desc.rows.length).toBe(12);
      expect(asc.rows.map((r) => r.sha256)).toEqual(
        [...desc.rows].reverse().map((r) => r.sha256),
      );
    });

    it(`${sortKey} ascending pages forward without repeating a row`, async () => {
      const first = await listArtifactsPage(
        fx.db,
        req({ sortKey, direction: "asc", limit: 5 }),
      );
      const second = await listArtifactsPage(
        fx.db,
        req({
          sortKey,
          direction: "asc",
          limit: 5,
          cursor: first.nextCursor,
        }),
      );
      const a = first.rows.map((r) => r.sha256);
      const b = second.rows.map((r) => r.sha256);
      expect(b.filter((k) => a.includes(k))).toEqual([]);
      expect(b.length).toBe(5);
    });
  }

  it("observations page in both directions too", async () => {
    for (let i = 0; i < 8; i += 1) {
      insertObservation(
        PROJECT,
        digest(0),
        "r" + String(i).padStart(4, "0"),
        200,
        "application/javascript",
        1_700_000_000 + i,
      );
    }
    const desc = await listObservationsPage(
      fx.db,
      req({ sortKey: "observed_at", direction: "desc" }),
    );
    const asc = await listObservationsPage(
      fx.db,
      req({ sortKey: "observed_at", direction: "asc" }),
    );
    expect(desc.rows.length).toBe(8);
    expect(asc.rows.map((r) => r.request_id)).toEqual(
      [...desc.rows].reverse().map((r) => r.request_id),
    );
  });
});

// ---------------------------------------------------------------------------
// THE TIE BLOCK — the correctness property the row-value cursor exists for
// ---------------------------------------------------------------------------

describe("the tie block", () => {
  beforeEach(() => {
    // TIE_BLOCK consecutive rows share one `last_seen_at`, so the sort key alone
    // is NOT a total order and the tie-break column is load-bearing.
    for (let i = 0; i < TIE_ROWS; i += 1) {
      insertArtifact(
        PROJECT,
        digest(i),
        1000 + i,
        "script",
        1_700_000_000 + Math.floor(i / TIE_BLOCK),
      );
    }
  });

  it("three consecutive pages are pairwise disjoint and their union is the expected ordered slice", async () => {
    // Non-vacuity first: without real ties this case proves paging over distinct
    // keys, which is the easy one.
    const all = await listArtifactsPage(
      fx.db,
      req({ limit: KEYSET_PAGE_ROWS }),
    );
    expect(all.rows.length).toBe(TIE_ROWS);
    const distinct = new Set(all.rows.map((r) => r.last_seen_at)).size;
    expect(
      distinct,
      "no ties in the fixture — this test would prove nothing",
    ).toBeLessThan(TIE_ROWS);

    const pages: string[][] = [];
    let cursor = null as PageRequest["cursor"];
    for (let p = 0; p < 3; p += 1) {
      const page: Awaited<ReturnType<typeof listArtifactsPage>> =
        await listArtifactsPage(fx.db, req({ limit: TIE_PAGE, cursor }));
      expect(page.rows.length, `page ${String(p + 1)} came back short`).toBe(
        TIE_PAGE,
      );
      pages.push(page.rows.map((r) => r.sha256));
      cursor = page.nextCursor;
      expect(cursor).not.toBeNull();
    }

    // At least one page boundary must land INSIDE a tie block, or the case under
    // test never occurred. Asserted because a fixture change that quietly stopped
    // producing that would turn this green without failing.
    const lastSeenOf = new Map(
      all.rows.map((r) => [r.sha256, r.last_seen_at] as const),
    );
    const boundaryInsideBlock = pages.slice(0, -1).some((page, i) => {
      const tail = page[page.length - 1];
      const head = pages[i + 1]?.[0];
      return (
        tail !== undefined &&
        head !== undefined &&
        lastSeenOf.get(tail) === lastSeenOf.get(head)
      );
    });
    expect(
      boundaryInsideBlock,
      "no page boundary landed inside a tie block — the case under test never occurred",
    ).toBe(true);

    // Pairwise-empty intersections: nothing returned twice.
    for (let i = 0; i < pages.length; i += 1) {
      for (let j = i + 1; j < pages.length; j += 1) {
        const a = new Set(pages[i] ?? []);
        const shared = (pages[j] ?? []).filter((k) => a.has(k));
        expect(
          shared,
          `pages ${String(i + 1)} and ${String(j + 1)} both returned ${shared.join(", ")}`,
        ).toEqual([]);
      }
    }

    // And nothing skipped: the union IS the ordered slice, in order.
    const union = pages.flat();
    expect(union).toEqual(all.rows.slice(0, TIE_PAGE * 3).map((r) => r.sha256));
  });

  it("returns the remainder of a block a cursor landed inside before advancing", async () => {
    // A cursor built from a row in the MIDDLE of a tie block must return the rest
    // of that block first. A naive `last_seen_at < ?` cursor would skip the rest
    // of the block entirely; that is the failure this asserts against.
    const all = await listArtifactsPage(
      fx.db,
      req({ limit: KEYSET_PAGE_ROWS }),
    );
    const pivotIndex = 2; // inside the first block of TIE_BLOCK rows
    const pivot = all.rows[pivotIndex];
    expect(pivot).toBeDefined();
    if (pivot === undefined) return;

    const next = await listArtifactsPage(
      fx.db,
      req({
        limit: TIE_BLOCK,
        cursor: { sortValue: pivot.last_seen_at, tieBreak: pivot.sha256 },
      }),
    );

    expect(next.rows.map((r) => r.sha256)).toEqual(
      all.rows
        .slice(pivotIndex + 1, pivotIndex + 1 + TIE_BLOCK)
        .map((r) => r.sha256),
    );
    // The remainder of the pivot's own block leads the page.
    expect(next.rows[0]?.last_seen_at).toBe(pivot.last_seen_at);
  });
});

// ---------------------------------------------------------------------------
// THE BOUNDED CANDIDATE WINDOW
// ---------------------------------------------------------------------------

describe("the bounded candidate window", () => {
  /** Seed `n` artifacts, none of which carries the filtered-for kind. */
  function seedNonMatching(n: number): void {
    const stmt = fx.raw.prepare(
      "INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count) VALUES (?, ?, ?, ?, ?, ?, 1)",
    );
    for (let i = 0; i < n; i += 1) {
      stmt.run(
        PROJECT,
        digest(i),
        1000 + i,
        "script",
        1_700_000_000 + i,
        1_700_000_000 + i,
      );
    }
  }

  it("a filter that matches nothing returns an empty page and scans no more than the window bound", async () => {
    seedNonMatching(CANDIDATE_WINDOW_ROWS * 2);

    const page = await listArtifactsPage(
      fx.db,
      req({ filter: { column: "kind", value: "wasm" } }),
    );

    expect(page.rows).toEqual([]);
    expect(page.scanned).toBeLessThanOrEqual(CANDIDATE_WINDOW_ROWS);
    expect(page.scanned).toBe(CANDIDATE_WINDOW_ROWS);
    // NOT the end of the data — the window was fully filtered and there is more
    // behind it. Rendering the empty state here would tell the operator nothing
    // was found when the window simply ran out.
    expect(page.exhausted).toBe(false);
    expect(page.nextCursor).not.toBeNull();
  });

  it("reports the SAME scanned count over a partition ten times larger", async () => {
    // THE CLAIM OF THE BOUNDED WINDOW, stated as an equality rather than as a
    // ratio: the cost stops depending on how much data the filter had to reject.
    seedNonMatching(CANDIDATE_WINDOW_ROWS * 2);
    const small = await listArtifactsPage(
      fx.db,
      req({ filter: { column: "kind", value: "wasm" } }),
    );

    fx.raw.prepare("DELETE FROM artifacts WHERE project_id = ?").run(PROJECT);
    seedNonMatching(CANDIDATE_WINDOW_ROWS * 20);
    const large = await listArtifactsPage(
      fx.db,
      req({ filter: { column: "kind", value: "wasm" } }),
    );

    expect(large.scanned).toBe(small.scanned);
    expect(large.rows).toEqual([]);
    expect(small.rows).toEqual([]);
  });

  it("advances the cursor to the window edge so a fully-filtered window is not refetched forever", async () => {
    seedNonMatching(CANDIDATE_WINDOW_ROWS * 2);

    const first = await listArtifactsPage(
      fx.db,
      req({ filter: { column: "kind", value: "wasm" } }),
    );
    expect(first.nextCursor).not.toBeNull();

    // THE PROPERTY, STATED AS TERMINATION RATHER THAN AS A COUNT. Each window
    // starts strictly after the previous one ended, so refetching converges: the
    // 1,000-row partition is consumed in two full windows plus one empty one that
    // reports exhaustion. A cursor that advanced only to the last SURVIVING row
    // would never move here — there are no survivors — and this loop would spin
    // until the guard.
    let cursor = first.nextCursor;
    let calls = 1;
    let totalScanned = first.scanned;
    for (let guard = 0; guard < 10; guard += 1) {
      const page: Awaited<ReturnType<typeof listArtifactsPage>> =
        await listArtifactsPage(
          fx.db,
          req({ filter: { column: "kind", value: "wasm" }, cursor }),
        );
      calls += 1;
      totalScanned += page.scanned;
      expect(page.rows).toEqual([]);
      if (page.exhausted) {
        expect(page.nextCursor).toBeNull();
        break;
      }
      expect(page.nextCursor).not.toBeNull();
      cursor = page.nextCursor;
    }

    expect(calls).toBe(3);
    expect(totalScanned).toBe(CANDIDATE_WINDOW_ROWS * 2);
  });

  it("returns matching rows, in order, when the filter does match", async () => {
    for (let i = 0; i < 20; i += 1) {
      insertArtifact(
        PROJECT,
        digest(i),
        1000 + i,
        i % 2 === 0 ? "script" : "wasm",
        1_700_000_000 + i,
      );
    }

    const page = await listArtifactsPage(
      fx.db,
      req({ filter: { column: "kind", value: "wasm" } }),
    );

    expect(page.rows.length).toBe(10);
    expect(page.rows.map((r) => r.kind)).toEqual(page.rows.map(() => "wasm"));
    const seen = page.rows.map((r) => r.last_seen_at);
    expect(seen).toEqual([...seen].sort((a, b) => b - a));
  });

  it("filters observations by content type, and a project boundary still holds", async () => {
    insertObservation(
      PROJECT,
      digest(0),
      "r1",
      200,
      "application/javascript",
      10,
    );
    insertObservation(PROJECT, digest(0), "r2", 200, "text/html", 11);
    insertObservation(OTHER_PROJECT, digest(0), "r3", 200, "text/html", 12);

    const page = await listObservationsPage(
      fx.db,
      req({
        sortKey: "observed_at",
        filter: { column: "content_type", value: "text/html" },
      }),
    );

    expect(page.rows.map((r) => r.request_id)).toEqual(["r2"]);
  });
});

// ---------------------------------------------------------------------------
// THE SHORT PAGE — end of data versus a window that ran out
// ---------------------------------------------------------------------------

describe("a short page distinguishes end-of-data from a filtered-out window", () => {
  it("reports exhausted true with no cursor when the partition genuinely ran out", async () => {
    for (let i = 0; i < 3; i += 1) {
      insertArtifact(PROJECT, digest(i), 100, "script", 1_700_000_000 + i);
    }

    const page = await listArtifactsPage(fx.db, req({ limit: 10 }));

    expect(page.rows.length).toBe(3);
    expect(page.rows.length).toBeLessThan(10);
    expect(page.exhausted).toBe(true);
    expect(page.nextCursor).toBeNull();
  });

  it("reports exhausted false WITH a cursor when the window ran out but the data did not", async () => {
    // Same shape on the wire — a page shorter than the limit — and the opposite
    // meaning. The two must not be conflated.
    const stmt = fx.raw.prepare(
      "INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count) VALUES (?, ?, ?, ?, ?, ?, 1)",
    );
    for (let i = 0; i < CANDIDATE_WINDOW_ROWS * 2; i += 1) {
      stmt.run(
        PROJECT,
        digest(i),
        1000 + i,
        // Exactly one match, and it sits inside the first window.
        i === 5 ? "wasm" : "script",
        1_700_000_000 + i,
        1_700_000_000 + i,
      );
    }

    const page = await listArtifactsPage(
      fx.db,
      req({ limit: 10, filter: { column: "kind", value: "wasm" } }),
    );

    expect(page.rows.length).toBeLessThan(10);
    expect(page.exhausted).toBe(false);
    expect(page.nextCursor).not.toBeNull();
    expect(page.scanned).toBe(CANDIDATE_WINDOW_ROWS);
  });
});

// ---------------------------------------------------------------------------
// FAIL CLOSED
// ---------------------------------------------------------------------------

describe("a request this module has no statement for reads nothing", () => {
  beforeEach(() => {
    for (let i = 0; i < 5; i += 1) {
      insertArtifact(PROJECT, digest(i), 100, "script", 1_700_000_000 + i);
    }
  });

  it("an unrecognised sort key does not fall back to a default sort", async () => {
    const page = await listArtifactsPage(fx.db, req({ sortKey: "seen_count" }));
    expect(page.rows).toEqual([]);
    expect(page.scanned).toBe(0);
    expect(page.exhausted).toBe(true);
  });

  it("an unrecognised filter column is not ignored — ignoring it would widen the result", async () => {
    const page = await listArtifactsPage(
      fx.db,
      req({ filter: { column: "sha256", value: digest(1) } }),
    );
    expect(page.rows).toEqual([]);
    expect(page.exhausted).toBe(true);
  });

  it("clamps a limit larger than the page contract rather than honouring it", async () => {
    for (let i = 5; i < 150; i += 1) {
      insertArtifact(PROJECT, digest(i), 100, "script", 1_700_000_000 + i);
    }
    const page = await listArtifactsPage(fx.db, req({ limit: 5000 }));
    expect(page.rows.length).toBe(KEYSET_PAGE_ROWS);
  });
});

// ---------------------------------------------------------------------------
// THE COUNT
// ---------------------------------------------------------------------------

describe("countInventory", () => {
  beforeEach(() => {
    for (let i = 0; i < 9; i += 1) {
      insertArtifact(
        PROJECT,
        digest(i),
        100,
        i % 3 === 0 ? "wasm" : "script",
        1_700_000_000 + i,
      );
    }
    insertArtifact(OTHER_PROJECT, digest(500), 100, "wasm", 1);
  });

  it("counts the rows the operator can currently reach, for this project only", async () => {
    const total = await countInventory(fx.db, PROJECT, "artifacts", null);
    expect(total.visible).toBe(9);
  });

  it("counts the filtered set when a filter is given", async () => {
    const total = await countInventory(fx.db, PROJECT, "artifacts", {
      column: "kind",
      value: "wasm",
    });
    expect(total.visible).toBe(3);
  });

  it("reports no hidden-by-suppression line, because these tables have no suppression", async () => {
    // Not a placeholder for a missing feature: `artifacts` and `observations`
    // carry no suppression mechanism at all, so the reachable count IS the count
    // and the second line has nothing to render. The entity tables that DO have
    // suppression are the deferred pass's.
    const total = await countInventory(fx.db, PROJECT, "artifacts", null);
    expect(total.hiddenBySuppression).toBe(0);
    expect(total.suppressionRuleCount).toBe(0);
  });

  it("counts observations too", async () => {
    insertObservation(PROJECT, digest(0), "r1", 200, "text/html", 1);
    insertObservation(PROJECT, digest(0), "r2", 200, "text/html", 2);
    insertObservation(OTHER_PROJECT, digest(0), "r3", 200, "text/html", 3);

    expect(
      (await countInventory(fx.db, PROJECT, "observations", null)).visible,
    ).toBe(2);
    expect(
      (
        await countInventory(fx.db, PROJECT, "observations", {
          column: "content_type",
          value: "text/html",
        })
      ).visible,
    ).toBe(2);
  });

  it("counts nothing for an unrecognised filter column or an absent project", async () => {
    expect(
      (
        await countInventory(fx.db, PROJECT, "artifacts", {
          column: "sha256",
          value: digest(1),
        })
      ).visible,
    ).toBe(0);
    expect((await countInventory(fx.db, "", "artifacts", null)).visible).toBe(
      0,
    );
  });
});

// ---------------------------------------------------------------------------
// THE CLOSED VOCABULARIES ARE THE MATRIX, NOT A DESCRIPTION OF IT
// ---------------------------------------------------------------------------
//
// The exported lists are what a caller — and, one plan from now, the typed RPC
// surface — reads to know what it may ask for. They are worth an assertion
// because a list that has drifted ahead of the statement matrix does not fail:
// the extra sort key silently takes the fail-closed path and the operator gets an
// empty table with no explanation. So each declared member is DRIVEN here, and
// each is required to come back with rows.

describe("every declared vocabulary member has a statement behind it", () => {
  beforeEach(() => {
    for (let i = 0; i < 6; i += 1) {
      insertArtifact(PROJECT, digest(i), 100 + i, "script", 1_700_000_000 + i);
      insertObservation(
        PROJECT,
        digest(i),
        "r" + String(i),
        200 + i,
        "application/javascript",
        1_700_000_000 + i,
      );
    }
  });

  it("names exactly the two shipped pageable tables", () => {
    const tables: readonly InventoryTable[] = INVENTORY_TABLES;
    expect([...tables]).toEqual(["artifacts", "observations"]);
  });

  it("serves every artifact sort key in both directions", async () => {
    for (const sortKey of ARTIFACT_SORT_KEYS) {
      const key: ArtifactSortKey = sortKey;
      for (const direction of ["asc", "desc"] as const) {
        const page = await listArtifactsPage(
          fx.db,
          req({ sortKey: key, direction }),
        );
        expect(page.rows.length, `${key}/${direction} read nothing`).toBe(6);
      }
    }
  });

  it("serves every observation sort key in both directions", async () => {
    for (const sortKey of OBSERVATION_SORT_KEYS) {
      const key: ObservationSortKey = sortKey;
      for (const direction of ["asc", "desc"] as const) {
        const page = await listObservationsPage(
          fx.db,
          req({ sortKey: key, direction }),
        );
        expect(page.rows.length, `${key}/${direction} read nothing`).toBe(6);
      }
    }
  });

  it("serves exactly the declared filter column on each table, and no other", async () => {
    const artifacts = await listArtifactsPage(
      fx.db,
      req({ filter: { column: ARTIFACT_FILTER_COLUMN, value: "script" } }),
    );
    expect(artifacts.rows.length).toBe(6);

    const observations = await listObservationsPage(
      fx.db,
      req({
        sortKey: "observed_at",
        filter: {
          column: OBSERVATION_FILTER_COLUMN,
          value: "application/javascript",
        },
      }),
    );
    expect(observations.rows.length).toBe(6);

    // The other table's column is not a second filter this table accepts.
    expect(
      (
        await listArtifactsPage(
          fx.db,
          req({
            filter: { column: OBSERVATION_FILTER_COLUMN, value: "script" },
          }),
        )
      ).rows,
    ).toEqual([]);
  });

  it("counts against both declared tables", async () => {
    for (const table of INVENTORY_TABLES) {
      const total = await countInventory(fx.db, PROJECT, table, null);
      expect(total.visible, `${table} counted nothing`).toBe(6);
    }
  });
});

// ---------------------------------------------------------------------------
// THE ANALYSIS STATE THE PAGE CARRIES (UI-09)
// ---------------------------------------------------------------------------
//
// UI-09 reads "degraded and partial analyses are visibly marked, never silently
// presented as complete". Plan 05-09 shipped the badge, the banner and the
// floor statement and could mark NOTHING on the running page, because the paged
// statements carried no `scan_state` and no endpoint returned one. These cases
// are the other half: what the page hands the frontend, and what happens when
// there is nothing to hand it.

describe("an artifact page carries its newest analysis state", () => {
  beforeEach(() => {
    for (let i = 0; i < 6; i += 1) {
      insertArtifact(PROJECT, digest(i), 100 + i, "script", 1_700_000_000 + i);
    }
    insertAnalysis(PROJECT, digest(0), "done");
    insertAnalysis(PROJECT, digest(1), "partial");
    insertAnalysis(PROJECT, digest(2), "failed");
    insertAnalysis(PROJECT, digest(3), "running");
    insertAnalysis(PROJECT, digest(4), "pending");
    // digest(5) is deliberately UNANALYSED.
  });

  it("reports the shipped state per row, and null for an artifact never analysed", async () => {
    const page = await listArtifactsPage(fx.db, req({ direction: "asc" }));
    const byDigest = new Map(page.rows.map((r) => [r.sha256, r.scan_state]));

    expect(byDigest.get(digest(0))).toBe("done");
    expect(byDigest.get(digest(1))).toBe("partial");
    expect(byDigest.get(digest(2))).toBe("failed");
    expect(byDigest.get(digest(3))).toBe("running");
    expect(byDigest.get(digest(4))).toBe("pending");
    // NULL, NOT A FABRICATED STATE. A sighting writes the artifact row before
    // any analysis is claimed, so this is a real state of a real row — and
    // answering `done` for it is exactly the silence UI-09 forbids.
    expect(byDigest.get(digest(5))).toBeNull();
  });

  it("picks the NEWEST analysis when an artifact has been read under two corpus versions", async () => {
    // The corpus version is part of the KEY, so an artifact accumulates one
    // analysis per version. The panel and the badge show the reading IN FORCE.
    insertAnalysis(PROJECT, digest(0), "failed", {
      detectorSetHash: "0".repeat(64),
      startedAt: 1_800_000_000_000,
    });

    const page = await listArtifactsPage(fx.db, req({ direction: "asc" }));
    const row = page.rows.find((r) => r.sha256 === digest(0));
    expect(row?.scan_state).toBe("failed");
  });

  it("never reports another project's analysis (T-01-20)", async () => {
    insertArtifact(OTHER_PROJECT, digest(0), 1, "script", 1_700_000_000);
    insertAnalysis(OTHER_PROJECT, digest(0), "failed", {
      startedAt: 1_900_000_000_000,
    });

    const page = await listArtifactsPage(fx.db, req({ direction: "asc" }));
    const row = page.rows.find((r) => r.sha256 === digest(0));
    // The other project's analysis is NEWER, so an uncorrelated subquery would
    // return it. The correlation on `project_id` is what stops that, and one
    // SQLite file serves every Caido project.
    expect(row?.scan_state).toBe("done");
  });

  it("carries the state on the FILTERED path too, not only the unfiltered one", async () => {
    const page = await listArtifactsPage(
      fx.db,
      req({
        direction: "asc",
        filter: { column: ARTIFACT_FILTER_COLUMN, value: "script" },
      }),
    );
    expect(page.rows.length).toBe(6);
    expect(page.rows.find((r) => r.sha256 === digest(2))?.scan_state).toBe(
      "failed",
    );
  });
});

// ---------------------------------------------------------------------------
// THE SCAN-STATE FILTER COLUMNS
// ---------------------------------------------------------------------------

describe("filtering by analysis state", () => {
  beforeEach(() => {
    for (let i = 0; i < 10; i += 1) {
      insertArtifact(PROJECT, digest(i), 100 + i, "script", 1_700_000_000 + i);
    }
    insertAnalysis(PROJECT, digest(0), "done");
    insertAnalysis(PROJECT, digest(1), "done");
    insertAnalysis(PROJECT, digest(2), "partial");
    insertAnalysis(PROJECT, digest(3), "partial");
    insertAnalysis(PROJECT, digest(4), "failed");
    insertAnalysis(PROJECT, digest(5), "pending");
    insertAnalysis(PROJECT, digest(6), "running");
    // 7, 8, 9 unanalysed.
  });

  it("serves each shipped state as its own single-column filter", async () => {
    const counts: Record<string, number> = {};
    for (const state of SCAN_STATES) {
      const page = await listArtifactsPage(
        fx.db,
        req({
          filter: { column: ARTIFACT_SCAN_STATE_FILTER_COLUMN, value: state },
        }),
      );
      counts[state] = page.rows.length;
      for (const row of page.rows) expect(row.scan_state).toBe(state);
    }
    expect(counts).toEqual({
      done: 2,
      partial: 2,
      failed: 1,
      pending: 1,
      running: 1,
    });
  });

  it("narrows to exactly the degraded set, which one equality cannot express", async () => {
    const page = await listArtifactsPage(
      fx.db,
      req({ filter: { ...DEGRADED_ANALYSIS_FILTER } }),
    );

    // THE WHOLE POINT OF THE SECOND FILTER COLUMN. `partial` AND `failed`, in
    // one narrowing — three rows, not the two a single `scan_state = ?` could
    // reach.
    expect(page.rows.map((r) => r.sha256).sort()).toEqual([
      digest(2),
      digest(3),
      digest(4),
    ]);
    for (const row of page.rows) {
      expect(row.scan_state).not.toBeNull();
      expect(isDegradedScanState(row.scan_state as ScanState)).toBe(true);
    }
  });

  it("keeps the matrix LINEAR: one filtered literal per column, never per combination", () => {
    // THE CONSTRAINT THIS PLAN WAS GIVEN, ASSERTED AGAINST THE SOURCE. Three
    // filter columns over eight (sort key x direction x cursor) slots is
    // 3 x 8 = 24 filtered literals. A matrix that had gone exponential in
    // combinations would be 2^3 x 8 = 64, and the difference is visible as a
    // count rather than as an argument.
    const source = readFileSync("packages/backend/src/store/reads.ts", "utf8");
    const filteredLiterals = source.match(
      /^const ARTIFACTS_[A-Z_]+_FILTERED_BY_[A-Z_]+ = `/gm,
    );
    expect(ARTIFACT_FILTER_COLUMNS.length).toBe(3);
    expect(filteredLiterals?.length).toBe(ARTIFACT_FILTER_COLUMNS.length * 8);
  });

  it("holds the degraded SQL to the vocabulary's own predicate", () => {
    // SQL CANNOT IMPORT TYPESCRIPT, so the degraded set is spelled once in the
    // statement text and bound HERE to the single declaration. This is the same
    // device `sanitise.spec.ts` uses to allow a second, cheaper path through a
    // security rule: the restatement is permitted only because something
    // compares it to the original.
    const source = readFileSync("packages/backend/src/store/reads.ts", "utf8");
    const derived = SCAN_STATES.filter((state) => isDegradedScanState(state));
    const expected = derived.map((state) => `'${state}'`).join(", ");
    const occurrences = source.match(/IN \('[a-z']+(?:, '[a-z]+')*'?\)/g) ?? [];
    expect(occurrences.length).toBeGreaterThan(0);
    for (const clause of occurrences) {
      expect(clause).toBe(`IN (${expected})`);
    }
  });

  it("answers an unrecognised filter column with an empty exhausted page", async () => {
    const page = await listArtifactsPage(
      fx.db,
      req({ filter: { column: "scan_state_or_something", value: "failed" } }),
    );
    expect(page.rows).toEqual([]);
    expect(page.exhausted).toBe(true);
  });

  it("counts the SAME rows the page returns, for both new filter columns", async () => {
    // A count and the page it belongs under that disagree produce a total the
    // operator can see is wrong by counting the rows on screen.
    for (const filter of [
      { column: ARTIFACT_SCAN_STATE_FILTER_COLUMN, value: "partial" },
      { ...DEGRADED_ANALYSIS_FILTER },
    ]) {
      const page = await listArtifactsPage(fx.db, req({ filter }));
      const total = await countInventory(fx.db, PROJECT, "artifacts", filter);
      expect(total.visible, `${filter.column} disagreed`).toBe(
        page.rows.length,
      );
    }
  });

  it("declares one filter column on observations, and serves exactly it", async () => {
    // The declared list and the served set, held to each other. An entry added
    // to the list without a literal behind it reads an empty exhausted page,
    // silently and by design (P5-D39), so the list is only trustworthy if
    // something checks it.
    expect(OBSERVATION_FILTER_COLUMNS).toEqual([OBSERVATION_FILTER_COLUMN]);
    for (const column of OBSERVATION_FILTER_COLUMNS) {
      const page = await listObservationsPage(
        fx.db,
        req({ sortKey: "observed_at", filter: { column, value: "text/html" } }),
      );
      expect(page.exhausted).toBe(true);
    }
  });

  it("does not offer the analysis-state columns on observations", async () => {
    // An observation is a SIGHTING of an artifact; the analysis lives on the
    // artifact. Accepting the column here would return rows the caller did not
    // ask for, silently.
    const page = await listObservationsPage(
      fx.db,
      req({
        sortKey: "observed_at",
        filter: { column: ARTIFACT_SCAN_STATE_FILTER_COLUMN, value: "failed" },
      }),
    );
    expect(page.rows).toEqual([]);
    expect(
      (
        await countInventory(fx.db, PROJECT, "observations", {
          ...DEGRADED_ANALYSIS_FILTER,
        })
      ).visible,
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// THE PANEL'S PER-ROW READ
// ---------------------------------------------------------------------------

describe("getLatestAnalysisForArtifact — the evidence panel's subject", () => {
  beforeEach(() => {
    insertArtifact(PROJECT, digest(0), 8192, "script", 1_700_000_000);
  });

  it("returns the newest analysis with the artifact's own byte length beside it", async () => {
    insertAnalysis(PROJECT, digest(0), "done", {
      startedAt: 1,
      bytesWalked: 8192,
    });
    insertAnalysis(PROJECT, digest(0), "partial", {
      detectorSetHash: "0".repeat(64),
      startedAt: 2,
      bytesWalked: 4096,
    });

    const row = await getLatestAnalysisForArtifact(fx.db, PROJECT, digest(0));
    expect(row?.scan_state).toBe("partial");
    expect(row?.detector_set_hash).toBe("0".repeat(64));
    // The two numbers UI-09's degraded marker renders. Both measured by the
    // backend; neither derived in the frontend.
    expect(row?.bytes_walked).toBe(4096);
    expect(row?.byte_len).toBe(8192);
  });

  it("carries no `error` column at all", async () => {
    insertAnalysis(PROJECT, digest(0), "failed");
    const row = await getLatestAnalysisForArtifact(fx.db, PROJECT, digest(0));
    // A NEGATIVE PROPERTY ASSERTED ON THE OBJECT THAT CROSSED THE BOUNDARY,
    // not on the code that built it. `analyses.error` is a plugin diagnostic
    // whose text sits next to the artifact; ERR-04 interpolates a reason into a
    // sentence, so the column stays on this side (T-05-51).
    expect(Object.keys(row ?? {}).sort()).toEqual([
      "byte_len",
      "bytes_walked",
      "detector_set_hash",
      "finished_at",
      "scan_state",
      "sha256",
      "started_at",
    ]);
  });

  it("is undefined for an artifact that has never been analysed", async () => {
    expect(
      await getLatestAnalysisForArtifact(fx.db, PROJECT, digest(0)),
    ).toBeUndefined();
  });

  it("never crosses the project boundary", async () => {
    insertArtifact(OTHER_PROJECT, digest(0), 1, "script", 1_700_000_000);
    insertAnalysis(OTHER_PROJECT, digest(0), "failed", { startedAt: 9 });
    expect(
      await getLatestAnalysisForArtifact(fx.db, PROJECT, digest(0)),
    ).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PHASE 7 — THE RECOVERED-SOURCE READ (MAP-06, MAP-07)
// ---------------------------------------------------------------------------
//
// The same class of property as the cases above, over a read with a NARROWER
// contract: one order, no sort keys, no filters. That narrowness removes the
// selectivity question entirely — there is no filter that could exclude a
// scanned row — and leaves the cursor, which is exactly the part that fails
// silently. Two maps inside one artifact are seeded on purpose, because
// `source_index` is only unique WITHIN a map and the tie-break is what stops the
// cursor skipping or repeating at that boundary.

/**
 * A 64-CHARACTER key, ordered as text like {@link digest}.
 *
 * The three Phase 7 digest columns each carry `CHECK (length(x) = 64)`, so this
 * block cannot reuse the nine-character {@link digest} the artifact and
 * observation fixtures use — and that is the constraint working: those columns
 * hold sha256 hex and the schema says so. Padded on the RIGHT after a
 * fixed-width numeric part, which leaves the text ordering the cursor depends on
 * exactly as {@link digest} has it.
 */
function wide(prefix: string, n: number): string {
  return (prefix + String(n).padStart(8, "0")).padEnd(64, "0");
}

/** One map's digest. */
function mapDigest(n: number): string {
  return wide("m", n);
}

/** One artifact's or source's digest, at the width the Phase 7 CHECKs demand. */
function wideDigest(n: number): string {
  return wide("d", n);
}

function insertSighting(
  projectId: string,
  mapSha256: string,
  sourceIndex: number,
  artifactSha256: string,
  options: { sourceSha256?: string | null; label?: string | null } = {},
): void {
  fx.raw
    .prepare(
      `INSERT INTO source_sightings (project_id, map_sha256, source_index, artifact_sha256,
                                     request_id, source_sha256, sources_verbatim,
                                     producibility, recovered_at)
       VALUES (?, ?, ?, ?, 'req-1', ?, ?, 'producible', 2000)`,
    )
    .run(
      projectId,
      mapSha256,
      sourceIndex,
      artifactSha256,
      options.sourceSha256 === undefined ? wideDigest(1) : options.sourceSha256,
      options.label === undefined ? "src/app.js" : options.label,
    );
}

function insertSource(projectId: string, sourceSha256: string): void {
  fx.raw
    .prepare(
      "INSERT OR IGNORE INTO sources (project_id, source_sha256, byte_len, line_count, first_seen_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(projectId, sourceSha256, 900, 30, 1000);
}

describe("listRecoveredSourcesPage — the drill-down's keyset read", () => {
  it("orders by source_index ASCENDING, which is the map's own declaration order", async () => {
    // THE ORDER IS THE EVIDENCE. It is not a presentation default the operator
    // may override — `07-UI-SPEC.md` fixes it and there is no sort key on this
    // read to override it with.
    insertSource(PROJECT, wideDigest(1));
    for (const index of [4, 0, 2, 1, 3]) {
      insertSighting(PROJECT, mapDigest(0), index, wideDigest(9));
    }
    const page = await listRecoveredSourcesPage(
      fx.db,
      PROJECT,
      wideDigest(9),
      null,
      KEYSET_PAGE_ROWS,
    );
    expect(page.rows.map((r) => r.source_index)).toEqual([0, 1, 2, 3, 4]);
    // STRICTLY ascending, asserted as the property rather than against a
    // hand-written list, so a fixture change cannot quietly weaken it.
    for (let i = 1; i < page.rows.length; i += 1) {
      expect(page.rows[i].source_index).toBeGreaterThan(
        page.rows[i - 1].source_index,
      );
    }
  });

  it("pages at exactly KEYSET_PAGE_ROWS with no duplicate and no gap", async () => {
    // KEYSET_PAGE_ROWS + 1 rows: the boundary case. The union of the two pages
    // is asserted EQUAL to the seeded set — not merely the right length, which
    // a cursor that repeated one row and skipped another would also satisfy.
    insertSource(PROJECT, wideDigest(1));
    const seeded = KEYSET_PAGE_ROWS + 1;
    for (let i = 0; i < seeded; i += 1) {
      insertSighting(PROJECT, mapDigest(0), i, wideDigest(9));
    }

    const first = await listRecoveredSourcesPage(
      fx.db,
      PROJECT,
      wideDigest(9),
      null,
      KEYSET_PAGE_ROWS,
    );
    expect(first.rows).toHaveLength(KEYSET_PAGE_ROWS);
    expect(first.exhausted).toBe(false);
    expect(first.nextCursor).not.toBeNull();

    const second = await listRecoveredSourcesPage(
      fx.db,
      PROJECT,
      wideDigest(9),
      first.nextCursor,
      KEYSET_PAGE_ROWS,
    );
    expect(second.rows).toHaveLength(1);
    expect(second.exhausted).toBe(true);
    expect(second.nextCursor).toBeNull();

    const union = [...first.rows, ...second.rows].map((r) => r.source_index);
    expect(new Set(union).size).toBe(seeded);
    expect(union).toEqual(Array.from({ length: seeded }, (_, i) => i));
  });

  it("pages at exactly KEYSET_PAGE_ROWS rows — the page is full and the partition is done", async () => {
    // The OTHER side of the boundary, which is the one a `<` versus `<=` slip
    // gets wrong: a full page whose cursor leads to nothing. `exhausted` is
    // false here and the second page is empty, which is a REFETCH and not an
    // empty state — conflating them renders "no sources" for a bundle that has
    // exactly 100.
    insertSource(PROJECT, wideDigest(1));
    for (let i = 0; i < KEYSET_PAGE_ROWS; i += 1) {
      insertSighting(PROJECT, mapDigest(0), i, wideDigest(9));
    }
    const first = await listRecoveredSourcesPage(
      fx.db,
      PROJECT,
      wideDigest(9),
      null,
      KEYSET_PAGE_ROWS,
    );
    expect(first.rows).toHaveLength(KEYSET_PAGE_ROWS);
    expect(first.exhausted).toBe(false);
    const second = await listRecoveredSourcesPage(
      fx.db,
      PROJECT,
      wideDigest(9),
      first.nextCursor,
      KEYSET_PAGE_ROWS,
    );
    expect(second.rows).toEqual([]);
    expect(second.exhausted).toBe(true);
  });

  it("breaks ties on map_sha256 when one artifact carries TWO maps", async () => {
    // `source_index` is unique WITHIN a map, and a bundle plus its vendor chunk
    // is two maps under one artifact — so index 0 exists twice. Without the
    // tie-break the two rows order arbitrarily and the cursor either skips one
    // or serves it twice. Paged at 3 across 6 tied-in-pairs rows so a boundary
    // lands INSIDE a tie.
    insertSource(PROJECT, wideDigest(1));
    for (const map of [mapDigest(0), mapDigest(1)]) {
      for (const index of [0, 1, 2]) {
        insertSighting(PROJECT, map, index, wideDigest(9));
      }
    }
    const collected: string[] = [];
    let cursor = null as Awaited<
      ReturnType<typeof listRecoveredSourcesPage>
    >["nextCursor"];
    for (let guard = 0; guard < 10; guard += 1) {
      const page: Awaited<ReturnType<typeof listRecoveredSourcesPage>> =
        await listRecoveredSourcesPage(
          fx.db,
          PROJECT,
          wideDigest(9),
          cursor,
          3,
        );
      for (const row of page.rows) {
        collected.push(`${String(row.source_index)}:${row.map_sha256}`);
      }
      if (page.exhausted) break;
      cursor = page.nextCursor;
    }
    expect(collected).toEqual([
      `0:${mapDigest(0)}`,
      `0:${mapDigest(1)}`,
      `1:${mapDigest(0)}`,
      `1:${mapDigest(1)}`,
      `2:${mapDigest(0)}`,
      `2:${mapDigest(1)}`,
    ]);
    expect(new Set(collected).size).toBe(collected.length);
  });

  it("returns a row whose source_sha256 is NULL — present, not absent", async () => {
    // A tombstone-eligible index with no content is still a fact about the
    // bundle. An INNER join would have dropped it and the operator would see a
    // shorter list than the map declared with nothing saying so.
    insertSource(PROJECT, wideDigest(1));
    insertSighting(PROJECT, mapDigest(0), 0, wideDigest(9));
    insertSighting(PROJECT, mapDigest(0), 1, wideDigest(9), {
      sourceSha256: null,
      label: "src/absent.js",
    });

    const page = await listRecoveredSourcesPage(
      fx.db,
      PROJECT,
      wideDigest(9),
      null,
      KEYSET_PAGE_ROWS,
    );
    expect(page.rows).toHaveLength(2);
    const orphan = page.rows[1];
    // NULL, asserted as null rather than by its absence from the page.
    expect(orphan.source_sha256).toBeNull();
    expect(orphan.sources_verbatim).toBe("src/absent.js");
    // And the joined columns are NULL rather than 0 — "no row to join to" is
    // not "a zero-byte source".
    expect(orphan.byte_len).toBeNull();
    expect(orphan.line_count).toBeNull();
    // The CONTROL: the row that DOES have content carries the joined values.
    expect(page.rows[0].byte_len).toBe(900);
    expect(page.rows[0].line_count).toBe(30);
  });

  it("is scoped to the project AND to the parent artifact", async () => {
    insertSource(PROJECT, wideDigest(1));
    insertSource(OTHER_PROJECT, wideDigest(1));
    insertSighting(PROJECT, mapDigest(0), 0, wideDigest(9));
    insertSighting(PROJECT, mapDigest(1), 0, wideDigest(8));
    insertSighting(OTHER_PROJECT, mapDigest(0), 0, wideDigest(9));

    const mine = await listRecoveredSourcesPage(
      fx.db,
      PROJECT,
      wideDigest(9),
      null,
      KEYSET_PAGE_ROWS,
    );
    expect(mine.rows).toHaveLength(1);
    expect(mine.rows[0].map_sha256).toBe(mapDigest(0));

    const empty = await listRecoveredSourcesPage(
      fx.db,
      "",
      wideDigest(9),
      null,
      KEYSET_PAGE_ROWS,
    );
    expect(empty.rows).toEqual([]);
    expect(empty.exhausted).toBe(true);
  });

  it("clamps the page size at KEYSET_PAGE_ROWS rather than honouring a wider request", async () => {
    insertSource(PROJECT, wideDigest(1));
    for (let i = 0; i < KEYSET_PAGE_ROWS + 5; i += 1) {
      insertSighting(PROJECT, mapDigest(0), i, wideDigest(9));
    }
    const page = await listRecoveredSourcesPage(
      fx.db,
      PROJECT,
      wideDigest(9),
      null,
      KEYSET_PAGE_ROWS * 10,
    );
    expect(page.rows).toHaveLength(KEYSET_PAGE_ROWS);
  });
});

describe("countRecoveredSourcesByArtifact — zero and unknown are different observations", () => {
  it("gives a RESOLVED zero for an analysed artifact that yielded nothing, and NO entry for one never analysed", async () => {
    // THE DISTINCTION THE `Sources` COLUMN EXISTS TO CARRY, asserted as two
    // different observations against one map rather than as one number. A
    // resolved zero says "DefMiner looked and this bundle had no sourcemap";
    // an absent entry says "DefMiner has not looked". Collapsing them tells the
    // operator a bundle is clean when nothing has read it yet.
    insertArtifact(PROJECT, wideDigest(1), 100, "js", 1000); // analysed, 2 sources
    insertArtifact(PROJECT, wideDigest(2), 100, "js", 1000); // analysed, none found
    insertArtifact(PROJECT, wideDigest(3), 100, "js", 1000); // never analysed
    insertAnalysis(PROJECT, wideDigest(1), "done");
    insertAnalysis(PROJECT, wideDigest(2), "done");

    insertSource(PROJECT, wideDigest(1));
    insertSighting(PROJECT, mapDigest(0), 0, wideDigest(1));
    insertSighting(PROJECT, mapDigest(0), 1, wideDigest(1));

    const counts = await countRecoveredSourcesByArtifact(fx.db, PROJECT);

    expect(counts.get(wideDigest(1))).toBe(2);
    // A RESOLVED ZERO — the entry EXISTS and its value is 0.
    expect(counts.has(wideDigest(2))).toBe(true);
    expect(counts.get(wideDigest(2))).toBe(0);
    // UNKNOWN — no entry at all, which is a different fact from 0.
    expect(counts.has(wideDigest(3))).toBe(false);
    expect(counts.get(wideDigest(3))).toBeUndefined();
  });

  it("does not resolve a zero for an analysis that stopped early", async () => {
    // `partial` and `failed` mean the walk did not finish, so the honest answer
    // is UNKNOWN. A zero here would be a claim about the bundle that DefMiner
    // is not in a position to make.
    insertArtifact(PROJECT, wideDigest(1), 100, "js", 1000);
    insertArtifact(PROJECT, wideDigest(2), 100, "js", 1000);
    insertAnalysis(PROJECT, wideDigest(1), "partial");
    insertAnalysis(PROJECT, wideDigest(2), "failed");

    const counts = await countRecoveredSourcesByArtifact(fx.db, PROJECT);
    expect(counts.has(wideDigest(1))).toBe(false);
    expect(counts.has(wideDigest(2))).toBe(false);
  });

  it("still counts an artifact whose analysis stopped early but which HAS sightings", async () => {
    // The other admission ground. What was recorded was recorded, and hiding a
    // count we actually have because the walk was cut short would under-report
    // evidence that exists.
    insertArtifact(PROJECT, wideDigest(1), 100, "js", 1000);
    insertAnalysis(PROJECT, wideDigest(1), "partial");
    insertSource(PROJECT, wideDigest(1));
    insertSighting(PROJECT, mapDigest(0), 0, wideDigest(1));

    const counts = await countRecoveredSourcesByArtifact(fx.db, PROJECT);
    expect(counts.get(wideDigest(1))).toBe(1);
  });

  it("is scoped by project_id", async () => {
    insertArtifact(PROJECT, wideDigest(1), 100, "js", 1000);
    insertArtifact(OTHER_PROJECT, wideDigest(1), 100, "js", 1000);
    insertAnalysis(OTHER_PROJECT, wideDigest(1), "done");
    insertSource(OTHER_PROJECT, wideDigest(1));
    insertSighting(OTHER_PROJECT, mapDigest(0), 0, wideDigest(1));

    expect((await countRecoveredSourcesByArtifact(fx.db, PROJECT)).size).toBe(
      0,
    );
    expect(
      (await countRecoveredSourcesByArtifact(fx.db, OTHER_PROJECT)).get(
        wideDigest(1),
      ),
    ).toBe(1);
    expect((await countRecoveredSourcesByArtifact(fx.db, "")).size).toBe(0);
  });
});
