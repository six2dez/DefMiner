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

import type { PageRequest } from "@defminer/engine/contract";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createFixtureDb,
  type SqliteFixture,
} from "../../test/fixtures/sqlite-fixture";

import { migrate } from "./migrations";
import {
  ARTIFACT_FILTER_COLUMN,
  ARTIFACT_SORT_KEYS,
  type ArtifactSortKey,
  CANDIDATE_WINDOW_ROWS,
  countInventory,
  INVENTORY_TABLES,
  type InventoryTable,
  KEYSET_PAGE_ROWS,
  listArtifactsPage,
  listObservationsPage,
  OBSERVATION_FILTER_COLUMN,
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
