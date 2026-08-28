// packages/frontend/src/stores/inventory.ts — the bounded, cursor-paged window
// the tables render, and the selection state the coalescer reads.
//
// ===========================================================================
// THIS MODULE NEVER ORDERS ROWS. ORDERING IS A REQUEST PARAMETER.
// ===========================================================================
// Changing the sort key or the direction changes what is ASKED FOR: the window
// is discarded and refetched from the first page. Nothing here — no action, no
// computed property, no display helper — arranges the resident rows.
//
// The reason is in 05-UI-SPEC.md's table contract and is worth restating where
// somebody would edit: this store holds AT MOST two thousand rows out of a
// result set that can be ten thousand or more, so arranging the residents would
// arrange a SUBSET and present it as the whole set. The operator sees a sorted
// table, believes the top row is the top row, and it is merely the top of what
// happened to be in memory. That is a correctness defect wearing the costume of
// a feature, which is why the plan's acceptance gate greps this file for the
// call rather than trusting the paragraph.
//
// ===========================================================================
// WHY A SHORT PAGE IS NOT THE END OF THE DATA
// ===========================================================================
// Every filtered read on the backend bounds the candidate window it scans, so a
// response can carry fewer rows than the limit while more exist — see
// `PageResponse` in packages/engine/src/contract.ts, which says so in its own
// return shape rather than leaving a caller to discover it. Three outcomes,
// three different meanings, and only one of them is "the list ended":
//
//   `exhausted: true`               -> the partition really is finished.
//   short, cursor present           -> ASK AGAIN from that cursor.
//   the assembly bound was reached  -> a distinct state, reported as such.
//
// The third exists because a pathological filter — one suppressing almost every
// candidate — would otherwise spin this loop against a single-threaded backend
// for as long as the operator left the tab open. When the bound is hit the store
// says so; it does not pretend the list ended, because that renders the empty
// state over a list that is not empty.
//
// ===========================================================================
// WHY THE RESIDENT PAGES ARE HELD IN SHALLOW REFS
// ===========================================================================
// Deep reactivity would proxy every field of every one of two thousand rows, on
// a page whose entire budget argument is that the renderer's memory is bounded
// the way the backend's queue is. Rows are replaced wholesale and never mutated
// in place, so a shallow ref is both correct and the cheap option (P5-D53).

import type {
  PageCursor,
  PageRequest,
  PageResponse,
  VisibleTotal,
} from "@defminer/engine/contract";
import type { ComputedRef } from "vue";
import { computed, ref, shallowRef } from "vue";

import type {
  CountRequest,
  InventoryTable,
  RpcFailure,
  RpcResult,
} from "../api/client";

// ---------------------------------------------------------------------------
// THE THREE BOUNDS
// ---------------------------------------------------------------------------

/**
 * How many rows the renderer may hold at once.
 *
 * 05-UI-SPEC.md's table contract: "2,000 rows max; older pages evicted
 * forward-scroll, re-fetched by cursor". This is the frontend's counterpart to
 * the backend queue's own bound — it is what stops a long browsing session
 * growing the renderer without limit, which is a failure that arrives after an
 * hour of work rather than on the first page.
 */
export const IN_MEMORY_WINDOW_ROWS = 2000;

/**
 * Rows asked for per page.
 *
 * 05-UI-SPEC.md fixes 100. The backend declares the same number as its own
 * constant and the two packages cannot import each other (see api/client.ts's
 * header), but they cannot silently diverge either: the limit is a REQUEST
 * FIELD, so this number is the one that takes effect and the backend's is a
 * ceiling, not a competing answer.
 */
export const KEYSET_PAGE_ROWS = 100;

/**
 * How many requests one logical page may take to assemble.
 *
 * The bound on the short-page loop. Eight is enough for a filter that survives
 * one row in eight hundred at the backend's 500-row candidate window, and small
 * enough that a filter surviving nothing costs eight requests rather than an
 * unbounded run of them. Reaching it is REPORTED, never rounded off into
 * "complete" — see the header.
 */
export const MAX_PAGE_ASSEMBLY_REQUESTS = 8;

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

/** How a page is read. Bound to one of the client's table-specific endpoints at
 *  the call site, which is what keeps this store generic over the row. */
export type PageReader<TRow> = (
  request: PageRequest,
) => Promise<RpcResult<PageResponse<TRow>>>;

/** What the table is doing, as a closed vocabulary. Separate `loading` and
 *  `error` booleans admit the state where both are true, which renders two
 *  contradictory things at once — the argument App.vue already makes. */
export type LoadState = "idle" | "loading" | "ready" | "failed";

/**
 * The slice of this store the coalescer reads.
 *
 * NARROW ON PURPOSE. The coalescer needs three facts — which project is active,
 * whether the operator is mid-triage, and how to requery — and giving it the
 * whole store would let a later edit reach into the window from the event path,
 * which is the one place that must never touch rows directly.
 */
export type TriageGate = {
  /** The active project. Read-only by type: only `setProject` writes it. */
  readonly projectId: ComputedRef<string>;
  /** True while a row is selected OR the evidence panel is open. */
  readonly triageLocked: ComputedRef<boolean>;
  /** Requery from the first page. What a "reaction" and the pill both do. */
  readonly refresh: () => Promise<void>;
};

export type InventoryStore<TRow> = TriageGate & {
  readonly rows: ComputedRef<readonly TRow[]>;
  readonly nextCursor: ComputedRef<PageCursor | null>;
  /** The partition is exhausted — the list genuinely ended. */
  readonly complete: ComputedRef<boolean>;
  /** The assembly bound was reached. NOT `complete`; see the header. */
  readonly assemblyTruncated: ComputedRef<boolean>;
  readonly loadState: ComputedRef<LoadState>;
  readonly failure: ComputedRef<RpcFailure | null>;
  readonly sortKey: ComputedRef<string>;
  readonly direction: ComputedRef<"asc" | "desc">;
  readonly filter: ComputedRef<PageRequest["filter"]>;
  readonly selectedRowKey: ComputedRef<string | null>;
  readonly panelOpen: ComputedRef<boolean>;
  /** The number behind the filtered-empty copy (P5-D45). */
  readonly visibleTotal: ComputedRef<VisibleTotal | null>;
  /** True when a page has been evicted off the head and can be refetched. */
  readonly canLoadPrevious: ComputedRef<boolean>;
  loadFirstPage: () => Promise<void>;
  loadNextPage: () => Promise<void>;
  loadPreviousPage: () => Promise<void>;
  setSort: (sortKey: string, direction: "asc" | "desc") => Promise<void>;
  setFilter: (filter: PageRequest["filter"]) => Promise<void>;
  setProject: (projectId: string) => Promise<void>;
  selectRow: (rowKey: string) => void;
  clearSelection: () => void;
  openPanel: () => void;
  closePanel: () => void;
};

export type InventoryStoreOptions<TRow> = {
  readonly projectId: string;
  readonly table: InventoryTable;
  readonly sortKey: string;
  readonly direction: "asc" | "desc";
  readonly readPage: PageReader<TRow>;
  readonly countRows: (
    request: CountRequest,
  ) => Promise<RpcResult<VisibleTotal>>;
};

/** One resident page. Both cursors are kept: the REQUEST cursor is what a
 *  scroll back into this range must send, and the RESPONSE cursor is what a
 *  scroll forward past it must send. Keeping only one of the two is how a
 *  window that can be evicted from both ends loses the ability to refill the
 *  end it evicted. */
type ResidentPage<TRow> = {
  readonly requestCursor: PageCursor | null;
  readonly rows: readonly TRow[];
  readonly responseCursor: PageCursor | null;
  readonly exhausted: boolean;
};

type Assembled<TRow> =
  | {
      readonly kind: "page";
      readonly page: ResidentPage<TRow>;
      readonly truncated: boolean;
    }
  | { readonly kind: "failed"; readonly failure: RpcFailure }
  /** A newer request superseded this one. Its answer is dropped unread. */
  | { readonly kind: "stale" };

// ---------------------------------------------------------------------------
// THE STORE
// ---------------------------------------------------------------------------

export function createInventoryStore<TRow>(
  options: InventoryStoreOptions<TRow>,
): InventoryStore<TRow> {
  const pages = shallowRef<ResidentPage<TRow>[]>([]);
  /** The request cursors of pages evicted off the HEAD, nearest last. */
  const evicted = shallowRef<(PageCursor | null)[]>([]);
  const projectId = ref(options.projectId);
  const sortKey = ref(options.sortKey);
  const direction = ref<"asc" | "desc">(options.direction);
  const filter = ref<PageRequest["filter"]>(null);
  const selectedRowKey = ref<string | null>(null);
  const panelOpen = ref(false);
  const loadState = ref<LoadState>("idle");
  const failure = ref<RpcFailure | null>(null);
  const truncated = ref(false);
  const total = ref<VisibleTotal | null>(null);

  /**
   * Bumped every time the window is discarded.
   *
   * An in-flight request that resolves after a project switch, a filter change
   * or a refresh is answering a question nobody is asking any more, and
   * applying it puts one project's rows under another project's heading
   * (T-05-41). The generation is checked after EVERY await, not once at the
   * end, because the assembly loop awaits several times.
   */
  let generation = 0;

  const residentRowCount = (): number =>
    pages.value.reduce((sum, page) => sum + page.rows.length, 0);

  const buildRequest = (cursor: PageCursor | null): PageRequest => ({
    projectId: projectId.value,
    sortKey: sortKey.value,
    direction: direction.value,
    filter: filter.value,
    cursor,
    limit: KEYSET_PAGE_ROWS,
  });

  const countRequest = (): CountRequest => ({
    projectId: projectId.value,
    table: options.table,
    filter: filter.value,
  });

  /**
   * Assemble ONE logical page from one or more responses.
   *
   * The three exits are the three meanings a short page can have, and they are
   * kept distinct all the way out to the store's state. See the module header.
   */
  const assemble = async (
    startCursor: PageCursor | null,
  ): Promise<Assembled<TRow>> => {
    const mine = generation;
    const collected: TRow[] = [];
    let cursor = startCursor;
    let responseCursor: PageCursor | null = startCursor;
    let exhausted = false;
    let hitBound = false;

    for (let attempt = 0; attempt < MAX_PAGE_ASSEMBLY_REQUESTS; attempt++) {
      const result = await options.readPage(buildRequest(cursor));
      if (generation !== mine) return { kind: "stale" };
      if (result.ok === false) return { kind: "failed", failure: result };

      const response = result.value;
      collected.push(...response.rows);
      responseCursor = response.nextCursor;
      exhausted = response.exhausted;

      if (exhausted) break;
      if (collected.length >= KEYSET_PAGE_ROWS) break;
      if (response.nextCursor === null) break;

      cursor = response.nextCursor;
      if (attempt === MAX_PAGE_ASSEMBLY_REQUESTS - 1) hitBound = true;
    }

    return {
      kind: "page",
      page: {
        requestCursor: startCursor,
        rows: collected,
        responseCursor,
        exhausted,
      },
      truncated: hitBound,
    };
  };

  /** Drop pages off the HEAD until the window fits, remembering where each one
   *  began so a scroll back can ask for it again. */
  const evictHead = (): void => {
    while (
      residentRowCount() > IN_MEMORY_WINDOW_ROWS &&
      pages.value.length > 1
    ) {
      const head = pages.value[0];
      evicted.value = [...evicted.value, head.requestCursor];
      pages.value = pages.value.slice(1);
    }
  };

  /** Drop pages off the TAIL until the window fits. Nothing is remembered: the
   *  forward cursor is recoverable from the new last page's response cursor. */
  const evictTail = (): void => {
    while (
      residentRowCount() > IN_MEMORY_WINDOW_ROWS &&
      pages.value.length > 1
    ) {
      pages.value = pages.value.slice(0, -1);
    }
  };

  const discardWindow = (): void => {
    generation++;
    pages.value = [];
    evicted.value = [];
    truncated.value = false;
    failure.value = null;
  };

  const applyFailure = (outcome: RpcFailure): void => {
    failure.value = outcome;
    loadState.value = "failed";
  };

  const loadFirstPage = async (): Promise<void> => {
    discardWindow();
    const mine = generation;
    loadState.value = "loading";

    const counted = await options.countRows(countRequest());
    if (generation !== mine) return;
    if (counted.ok) total.value = counted.value;

    const outcome = await assemble(null);
    if (outcome.kind === "stale") return;
    if (outcome.kind === "failed") {
      applyFailure(outcome.failure);
      return;
    }

    pages.value = [outcome.page];
    truncated.value = outcome.truncated;
    loadState.value = "ready";
  };

  const loadNextPage = async (): Promise<void> => {
    const last = pages.value[pages.value.length - 1];
    if (last === undefined) return;
    if (last.exhausted) return;
    if (last.responseCursor === null) return;

    loadState.value = "loading";
    const outcome = await assemble(last.responseCursor);
    if (outcome.kind === "stale") return;
    if (outcome.kind === "failed") {
      applyFailure(outcome.failure);
      return;
    }

    pages.value = [...pages.value, outcome.page];
    truncated.value = outcome.truncated;
    evictHead();
    loadState.value = "ready";
  };

  const loadPreviousPage = async (): Promise<void> => {
    const stack = evicted.value;
    if (stack.length === 0) return;
    const startCursor = stack[stack.length - 1];

    loadState.value = "loading";
    const outcome = await assemble(startCursor);
    if (outcome.kind === "stale") return;
    if (outcome.kind === "failed") {
      applyFailure(outcome.failure);
      return;
    }

    // REFETCHED, not restored. The rows that were evicted are gone; what goes
    // back on screen is what the backend answers now, which is also what makes
    // a scroll back show rows that arrived while the operator was elsewhere.
    pages.value = [outcome.page, ...pages.value];
    evicted.value = stack.slice(0, -1);
    evictTail();
    loadState.value = "ready";
  };

  const rebuild = async (): Promise<void> => {
    await loadFirstPage();
  };

  return {
    rows: computed(() => pages.value.flatMap((page) => page.rows)),
    nextCursor: computed(() => {
      const last = pages.value[pages.value.length - 1];
      return last === undefined ? null : last.responseCursor;
    }),
    complete: computed(() => {
      const last = pages.value[pages.value.length - 1];
      return last === undefined ? false : last.exhausted;
    }),
    assemblyTruncated: computed(() => truncated.value),
    loadState: computed(() => loadState.value),
    failure: computed(() => failure.value),
    sortKey: computed(() => sortKey.value),
    direction: computed(() => direction.value),
    filter: computed(() => filter.value),
    selectedRowKey: computed(() => selectedRowKey.value),
    panelOpen: computed(() => panelOpen.value),
    visibleTotal: computed(() => total.value),
    canLoadPrevious: computed(() => evicted.value.length > 0),
    projectId: computed(() => projectId.value),
    triageLocked: computed(
      () => selectedRowKey.value !== null || panelOpen.value,
    ),

    loadFirstPage,
    loadNextPage,
    loadPreviousPage,

    // The three that change the QUESTION all discard the window and start over.
    // None of them touches the resident rows in place.
    setSort: async (nextKey, nextDirection) => {
      sortKey.value = nextKey;
      direction.value = nextDirection;
      await rebuild();
    },
    setFilter: async (nextFilter) => {
      filter.value = nextFilter;
      await rebuild();
    },
    setProject: async (nextProjectId) => {
      projectId.value = nextProjectId;
      selectedRowKey.value = null;
      panelOpen.value = false;
      total.value = null;
      await rebuild();
    },

    selectRow: (rowKey) => {
      selectedRowKey.value = rowKey;
    },
    clearSelection: () => {
      selectedRowKey.value = null;
    },
    openPanel: () => {
      panelOpen.value = true;
    },
    closePanel: () => {
      panelOpen.value = false;
    },

    refresh: rebuild,
  };
}
