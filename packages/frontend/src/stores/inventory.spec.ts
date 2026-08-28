// packages/frontend/src/stores/inventory.spec.ts — the bounded window, the
// cursor, and the short-page loop, driven against a scripted page reader.
//
// WHAT THESE SPECS ARE ABOUT. Two of the store's properties have failure modes
// that LOOK LIKE FEATURES, and they are what most of this file asserts:
//
//   THE SHORT-PAGE LOOP. The backend's filtered statements bound the candidate
//   window they scan, so a page can come back with fewer rows than requested
//   while more exist (packages/engine/src/contract.ts, `PageResponse`). Treating
//   that as end-of-data renders the empty state over a list that is not empty —
//   the operator concludes nothing was found. The loop, its termination on
//   `exhausted`, and its bound are asserted separately because each one ends the
//   loop for a different reason and only one of the three means "the list ended".
//
//   THE BOUNDED WINDOW. Eviction is what stops a long browsing session growing
//   the renderer without limit, and a scroll back into an evicted range must
//   REFETCH rather than serve whatever is still lying around. The refetch is
//   asserted by giving the second answer different row ids from the first: a
//   cache would return the old ones and pass a weaker test.
//
// The row type here is deliberately a single field. This store is generic over
// the row and reads no field of it; a realistic row would only invite an
// assertion about a column, which belongs to the table component's specs.

import type {
  PageCursor,
  PageRequest,
  PageResponse,
  VisibleTotal,
} from "@defminer/engine/contract";
import { beforeEach, describe, expect, it } from "vitest";

import type { CountRequest, RpcResult } from "../api/client";
import type { InventoryStore } from "./inventory";
import {
  createInventoryStore,
  IN_MEMORY_WINDOW_ROWS,
  KEYSET_PAGE_ROWS,
  MAX_PAGE_ASSEMBLY_REQUESTS,
} from "./inventory";

type Row = { readonly id: string };

const TOTAL: VisibleTotal = {
  visible: 4321,
  hiddenBySuppression: 0,
  suppressionRuleCount: 0,
};

/** One scripted answer, as a function of which call it is. */
type Script = (call: number, request: PageRequest) => RpcResult<PageResponse<Row>>;

type Harness = {
  readonly store: InventoryStore<Row>;
  readonly requests: PageRequest[];
  readonly counts: CountRequest[];
};

function cursorFor(call: number): PageCursor {
  return { sortValue: call, tieBreak: `tie-${call}` };
}

/** `count` rows, labelled with the call that produced them — so a REFETCH is
 *  distinguishable from a cache hit by the ids alone. */
function rowsFor(call: number, count: number): Row[] {
  const rows: Row[] = [];
  for (let index = 0; index < count; index++) {
    rows.push({ id: `c${call}-r${index}` });
  }
  return rows;
}

function harness(script: Script): Harness {
  const requests: PageRequest[] = [];
  const counts: CountRequest[] = [];
  let call = 0;

  const store = createInventoryStore<Row>({
    projectId: "p1",
    table: "artifacts",
    sortKey: "last_seen",
    direction: "desc",
    readPage: (request) => {
      requests.push(request);
      const answer = script(call, request);
      call++;
      return Promise.resolve(answer);
    },
    countRows: (request) => {
      counts.push(request);
      return Promise.resolve({ ok: true, value: TOTAL });
    },
  });

  return { store, requests, counts };
}

/** Every call answers a FULL page and never exhausts. The plain forward-paging
 *  case, with no short-page loop involved. */
const fullPages: Script = (call) => ({
  ok: true,
  value: {
    rows: rowsFor(call, KEYSET_PAGE_ROWS),
    nextCursor: cursorFor(call),
    scanned: KEYSET_PAGE_ROWS,
    exhausted: false,
  },
});

describe("createInventoryStore — paging by cursor", () => {
  let h: Harness;

  beforeEach(() => {
    h = harness(fullPages);
  });

  it("requests the first page with NO cursor and stores the rows and next cursor", async () => {
    await h.store.loadFirstPage();

    expect(h.requests).toHaveLength(1);
    expect(h.requests[0]).toEqual({
      projectId: "p1",
      sortKey: "last_seen",
      direction: "desc",
      filter: null,
      cursor: null,
      limit: KEYSET_PAGE_ROWS,
    });
    expect(h.store.rows.value).toHaveLength(KEYSET_PAGE_ROWS);
    expect(h.store.nextCursor.value).toEqual(cursorFor(0));
    expect(h.store.loadState.value).toBe("ready");
  });

  it("sends the stored cursor for the next page and APPENDS", async () => {
    await h.store.loadFirstPage();
    await h.store.loadNextPage();

    expect(h.requests[1]?.cursor).toEqual(cursorFor(0));
    expect(h.store.rows.value).toHaveLength(KEYSET_PAGE_ROWS * 2);
    expect(h.store.rows.value[0]?.id).toBe("c0-r0");
    expect(h.store.rows.value[KEYSET_PAGE_ROWS]?.id).toBe("c1-r0");
  });

  it("holds the resident rows in ARRIVAL order and never reorders them", async () => {
    // The backend owns the order. A store that re-derived it would be sorting a
    // subset of the result set and presenting it as the whole — the defect
    // 05-UI-SPEC.md names as looking like a feature.
    const shuffled: Script = (call) => ({
      ok: true,
      value: {
        rows: [{ id: `c${call}-z` }, { id: `c${call}-a` }, { id: `c${call}-m` }],
        nextCursor: cursorFor(call),
        scanned: 3,
        exhausted: true,
      },
    });
    const local = harness(shuffled);
    await local.store.loadFirstPage();

    expect(local.store.rows.value.map((row) => row.id)).toEqual([
      "c0-z",
      "c0-a",
      "c0-m",
    ]);
  });

  it("fetches the reachable count alongside the first page", async () => {
    await h.store.loadFirstPage();

    expect(h.counts).toEqual([
      { projectId: "p1", table: "artifacts", filter: null },
    ]);
    expect(h.store.visibleTotal.value).toEqual(TOTAL);
  });
});

describe("createInventoryStore — the short-page loop", () => {
  it("refetches from the returned cursor until a FULL page is assembled", async () => {
    // Three short answers that together make one full page. The store must not
    // present the first of them as the end of anything.
    const sizes = [40, 30, KEYSET_PAGE_ROWS - 70];
    const h = harness((call) => ({
      ok: true,
      value: {
        rows: rowsFor(call, sizes[call] ?? 1),
        nextCursor: cursorFor(call),
        scanned: 500,
        exhausted: false,
      },
    }));

    await h.store.loadFirstPage();

    expect(h.requests).toHaveLength(3);
    expect(h.requests[1]?.cursor).toEqual(cursorFor(0));
    expect(h.requests[2]?.cursor).toEqual(cursorFor(1));
    expect(h.store.rows.value).toHaveLength(KEYSET_PAGE_ROWS);
    expect(h.store.complete.value).toBe(false);
    expect(h.store.assemblyTruncated.value).toBe(false);
  });

  it("ends the loop on an EXHAUSTED short page — one request, list complete", async () => {
    const h = harness((call) => ({
      ok: true,
      value: {
        rows: rowsFor(call, 3),
        nextCursor: null,
        scanned: 500,
        exhausted: true,
      },
    }));

    await h.store.loadFirstPage();

    expect(h.requests).toHaveLength(1);
    expect(h.store.rows.value).toHaveLength(3);
    expect(h.store.complete.value).toBe(true);
    expect(h.store.assemblyTruncated.value).toBe(false);
  });

  it("stops at the iteration bound in a DISTINCT state, not a completed list", async () => {
    // A filter that suppresses nearly everything: every window is scanned, one
    // row survives, and the cursor keeps advancing. Without the bound this is an
    // unbounded request loop on a single-threaded backend.
    const h = harness((call) => ({
      ok: true,
      value: {
        rows: rowsFor(call, 1),
        nextCursor: cursorFor(call),
        scanned: 500,
        exhausted: false,
      },
    }));

    await h.store.loadFirstPage();

    expect(h.requests).toHaveLength(MAX_PAGE_ASSEMBLY_REQUESTS);
    expect(h.store.assemblyTruncated.value).toBe(true);
    expect(h.store.complete.value).toBe(false);
    expect(h.store.rows.value).toHaveLength(MAX_PAGE_ASSEMBLY_REQUESTS);
  });

  it("stops when the backend offers no further cursor", async () => {
    const h = harness((call) => ({
      ok: true,
      value: {
        rows: rowsFor(call, 2),
        nextCursor: null,
        scanned: 500,
        exhausted: false,
      },
    }));

    await h.store.loadFirstPage();

    expect(h.requests).toHaveLength(1);
    expect(h.store.assemblyTruncated.value).toBe(false);
  });
});

describe("createInventoryStore — the bounded window", () => {
  it("never holds more than the window bound, across enough pages to evict", async () => {
    const h = harness(fullPages);
    const pages = IN_MEMORY_WINDOW_ROWS / KEYSET_PAGE_ROWS + 1;

    await h.store.loadFirstPage();
    for (let index = 1; index < pages; index++) {
      await h.store.loadNextPage();
      expect(h.store.rows.value.length).toBeLessThanOrEqual(
        IN_MEMORY_WINDOW_ROWS,
      );
    }

    expect(h.requests).toHaveLength(pages);
    expect(h.store.rows.value).toHaveLength(IN_MEMORY_WINDOW_ROWS);
    // The OLDEST page went, not the newest: forward-scroll eviction.
    expect(h.store.rows.value[0]?.id).toBe("c1-r0");
    expect(h.store.canLoadPrevious.value).toBe(true);
  });

  it("REFETCHES an evicted head range by cursor rather than serving stale rows", async () => {
    const h = harness(fullPages);
    const pages = IN_MEMORY_WINDOW_ROWS / KEYSET_PAGE_ROWS + 1;

    await h.store.loadFirstPage();
    for (let index = 1; index < pages; index++) await h.store.loadNextPage();

    const before = h.requests.length;
    await h.store.loadPreviousPage();

    // The request went out — a cache would have answered without one — and it
    // carried the evicted range's own boundary cursor, which for the first page
    // is no cursor at all.
    expect(h.requests).toHaveLength(before + 1);
    expect(h.requests[before]?.cursor).toBeNull();
    // And the rows on screen are the ANSWER, not the ones that were evicted:
    // the ids carry the call that produced them.
    expect(h.store.rows.value[0]?.id).toBe(`c${before}-r0`);
    expect(h.store.rows.value.length).toBeLessThanOrEqual(IN_MEMORY_WINDOW_ROWS);
    expect(h.store.canLoadPrevious.value).toBe(false);
  });

  it("does nothing when there is nothing before the resident window", async () => {
    const h = harness(fullPages);
    await h.store.loadFirstPage();

    await h.store.loadPreviousPage();

    expect(h.requests).toHaveLength(1);
  });
});

describe("createInventoryStore — sorting, filtering and the project boundary", () => {
  it("discards the window and refetches the FIRST page when the direction changes", async () => {
    const h = harness(fullPages);
    await h.store.loadFirstPage();
    await h.store.loadNextPage();

    await h.store.setSort("last_seen", "asc");

    const last = h.requests.at(-1);
    expect(last?.cursor).toBeNull();
    expect(last?.direction).toBe("asc");
    expect(h.store.rows.value).toHaveLength(KEYSET_PAGE_ROWS);
    expect(h.store.rows.value[0]?.id).toBe("c2-r0");
    expect(h.store.canLoadPrevious.value).toBe(false);
  });

  it("discards the window and recounts when the filter changes", async () => {
    const h = harness(fullPages);
    await h.store.loadFirstPage();

    await h.store.setFilter({ column: "kind", value: "script" });

    expect(h.requests.at(-1)?.filter).toEqual({
      column: "kind",
      value: "script",
    });
    expect(h.requests.at(-1)?.cursor).toBeNull();
    expect(h.counts.at(-1)?.filter).toEqual({ column: "kind", value: "script" });
    expect(h.store.rows.value).toHaveLength(KEYSET_PAGE_ROWS);
  });

  it("DISCARDS a response that lands after the window was discarded", async () => {
    // A project switch and an in-flight page request race. Applying the loser
    // puts one project's rows under another project's heading (T-05-41).
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let call = 0;
    const requests: PageRequest[] = [];

    const store = createInventoryStore<Row>({
      projectId: "p1",
      table: "artifacts",
      sortKey: "last_seen",
      direction: "desc",
      readPage: async (request) => {
        requests.push(request);
        const mine = call;
        call++;
        if (mine === 0) await gate;
        return {
          ok: true,
          value: {
            rows: rowsFor(mine, 5),
            nextCursor: null,
            scanned: 5,
            exhausted: true,
          },
        };
      },
      countRows: () => Promise.resolve({ ok: true, value: TOTAL }),
    });

    const slow = store.loadFirstPage();
    await store.setProject("p2");
    release?.();
    await slow;

    expect(store.projectId.value).toBe("p2");
    expect(store.rows.value.map((row) => row.id)).toEqual([
      "c1-r0",
      "c1-r1",
      "c1-r2",
      "c1-r3",
      "c1-r4",
    ]);
    expect(requests[1]?.projectId).toBe("p2");
  });

  it("records a failed read without appending rows", async () => {
    const h = harness(() => ({
      ok: false,
      reason: "rpc-timeout",
      versions: null,
    }));

    await h.store.loadFirstPage();

    expect(h.store.loadState.value).toBe("failed");
    expect(h.store.failure.value).toEqual({
      ok: false,
      reason: "rpc-timeout",
      versions: null,
    });
    expect(h.store.rows.value).toEqual([]);
  });
});

describe("createInventoryStore — the triage gate the coalescer reads", () => {
  it("tracks selection and panel state INDEPENDENTLY, and locks on either", async () => {
    const h = harness(fullPages);
    await h.store.loadFirstPage();

    expect(h.store.triageLocked.value).toBe(false);

    h.store.selectRow("c0-r0");
    expect(h.store.selectedRowKey.value).toBe("c0-r0");
    expect(h.store.panelOpen.value).toBe(false);
    expect(h.store.triageLocked.value).toBe(true);

    h.store.clearSelection();
    expect(h.store.triageLocked.value).toBe(false);

    h.store.openPanel();
    expect(h.store.selectedRowKey.value).toBeNull();
    expect(h.store.panelOpen.value).toBe(true);
    expect(h.store.triageLocked.value).toBe(true);

    h.store.closePanel();
    expect(h.store.triageLocked.value).toBe(false);
  });

  it("refreshes by requerying the first page", async () => {
    const h = harness(fullPages);
    await h.store.loadFirstPage();
    await h.store.loadNextPage();

    await h.store.refresh();

    expect(h.requests.at(-1)?.cursor).toBeNull();
    expect(h.store.rows.value).toHaveLength(KEYSET_PAGE_ROWS);
    expect(h.store.rows.value[0]?.id).toBe("c2-r0");
  });
});
