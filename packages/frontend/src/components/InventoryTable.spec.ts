// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// packages/frontend/src/components/InventoryTable.spec.ts — every state
// 05-UI-SPEC.md enumerates for `findings-table`, asserted rather than read for.
//
// ===========================================================================
// WHY `RecycleScroller` IS STUBBED HERE, AND WHY THAT IS NOT A HOLE
// ===========================================================================
// MEASURED THIS SESSION, NOT ASSUMED: mounted in jsdom with fifty items and a
// 320px container, the real `RecycleScroller` renders an EMPTY item wrapper.
// It sizes its window from `getBoundingClientRect`, and jsdom reports every box
// as 0x0 because it has no layout engine — so the scroller correctly concludes
// that zero rows fit.
//
// A cell assertion written against that renders nothing, finds nothing, and
// PASSES BY MEASURING AN EMPTY SET. That is the exact failure plan 05-08 found
// twice in its own specs and recorded so it would not be rediscovered. So the
// scroller is replaced here by a passthrough that renders every item through the
// same slot with the same slot props, and the two facts the passthrough cannot
// carry are asserted separately and honestly:
//
//   * `item-size` is asserted on the STUB'S OWN PROPS, so the number that
//     reaches the real component is still checked (`itemSizeOf` below).
//   * ROW GEOMETRY — that a rendered row's measured height really is 32px, and
//     that an adversarial value does not grow it — is not assertable in an
//     environment without layout at all. That half is `tests/frontend-load.spec.ts`,
//     which drives a real browser, and it is named here rather than left to be
//     assumed covered.

import type {
  PageCursor,
  PageRequest,
  PageResponse,
  VisibleTotal,
} from "@defminer/engine/contract";
import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";

import type { CountRequest, RpcResult } from "../api/client";
import { RPC_ERROR_STATE_BODY } from "../api/client";
import { TABLE_ROW_HEIGHT_PX } from "../safety/display";
import type { InventoryStore, PageReader } from "../stores/inventory";
import {
  createInventoryStore,
  IN_MEMORY_WINDOW_ROWS,
  KEYSET_PAGE_ROWS,
} from "../stores/inventory";

import InventoryTable from "./InventoryTable.vue";
import type { ColumnDefinition } from "./table-contract";
import {
  FOCUS_RING_CLASS,
  groupThousands,
  ROW_HEIGHT_CLASS,
  SELECTED_ROW_ACCENT_CLASS,
} from "./table-contract";

type Row = {
  readonly id: string;
  readonly value: string;
  readonly kind: string;
};

const COLUMNS: readonly ColumnDefinition<Row>[] = [
  {
    id: "kind",
    label: "Kind",
    widthClass: "w-1/6",
    targetControlled: false,
    sortKey: "kind",
    text: (row) => row.kind,
  },
  {
    id: "value",
    label: "Value",
    widthClass: "flex-1",
    targetControlled: true,
    sortKey: null,
    text: (row) => row.value,
  },
];

/**
 * The passthrough that stands in for `RecycleScroller`.
 *
 * Declares the SAME props the real component takes, so a spec asserting
 * `item-size` is asserting the value the real one would have received. Renders
 * every item, because the point of the environment is the DOM the cells produce.
 */
const ScrollerStub = defineComponent({
  name: "RecycleScroller",
  props: {
    items: { type: Array, required: true },
    itemSize: { type: Number, required: true },
    keyField: { type: String, required: true },
    buffer: { type: Number, default: 0 },
  },
  template: `<div class="scroller-stub"><template v-for="(item, index) in items" :key="index"><slot :item="item" :index="index" /></template></div>`,
});

const TOTAL: VisibleTotal = {
  visible: 4321,
  hiddenBySuppression: 0,
  suppressionRuleCount: 0,
};

type StoreHarness = {
  readonly store: InventoryStore<Row>;
  readonly requests: PageRequest[];
};

function rowsFor(count: number): Row[] {
  const out: Row[] = [];
  for (let index = 0; index < count; index++) {
    out.push({
      id: `r${String(index)}`,
      value: `value-${String(index)}`,
      kind: "script",
    });
  }
  return out;
}

/** A store whose first page answers `rows` and then exhausts. */
function harness(
  rows: readonly Row[],
  options: {
    readonly total?: VisibleTotal | null;
    readonly fail?: boolean;
  } = {},
): StoreHarness {
  const requests: PageRequest[] = [];
  const readPage: PageReader<Row> = (request) => {
    requests.push(request);
    if (options.fail === true) {
      return Promise.resolve({
        ok: false,
        reason: "rpc-timeout",
        versions: null,
      } satisfies RpcResult<PageResponse<Row>>);
    }
    return Promise.resolve({
      ok: true,
      value: {
        rows,
        nextCursor: null satisfies PageCursor | null,
        scanned: rows.length,
        exhausted: true,
      },
    });
  };

  const store = createInventoryStore<Row>({
    projectId: "p1",
    table: "artifacts",
    sortKey: "last_seen",
    direction: "desc",
    readPage,
    countRows: (request: CountRequest) => {
      void request;
      const total = options.total === undefined ? TOTAL : options.total;
      if (total === null) {
        return Promise.resolve({
          ok: false,
          reason: "rpc-rejected",
          versions: null,
        } satisfies RpcResult<VisibleTotal>);
      }
      return Promise.resolve({ ok: true, value: total });
    },
  });

  return { store, requests };
}

/**
 * `InventoryTable`, with its type parameter BOUND to {@link Row}.
 *
 * Vue Test Utils' `mount()` cannot infer a generic component's own type
 * parameter, so vue-tsc resolves the props at `TRow = unknown` and then
 * (correctly, under `strictFunctionTypes`) rejects a `Row`-typed column list as
 * contravariantly unsound. Binding the parameter HERE is the narrow fix; the
 * alternative — widening every accessor to `unknown` and casting inside it —
 * would delete the one thing worth typechecking in this file, which is that the
 * column list describes the row it is given.
 */
const Table = InventoryTable as unknown as new () => {
  $props: {
    label: string;
    columns: readonly ColumnDefinition<Row>[];
    store: InventoryStore<Row>;
    rowKey: (row: Row) => string;
  };
};

function mountTable(store: InventoryStore<Row>): VueWrapper {
  return mount(Table, {
    props: {
      label: "Artifacts",
      columns: COLUMNS,
      store,
      rowKey: (row: Row) => row.id,
    },
    global: { stubs: { RecycleScroller: ScrollerStub } },
  });
}

/** Let every pending microtask and the store's own awaits settle. */
async function settle(wrapper: VueWrapper): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
}

/** The `item-size` the scroller was actually handed. */
function itemSizeOf(wrapper: VueWrapper): unknown {
  return wrapper.findComponent(ScrollerStub).props("itemSize");
}

const EMPTY_HEADING = "Nothing analysed on this target yet";
const FILTERED_EMPTY_HEADING = "No secrets match these filters";

describe("InventoryTable — the empty and filtered-empty screens are disjoint", () => {
  it("renders the nothing-analysed screen, and NOT the filtered-empty one, with no filter", async () => {
    const h = harness([]);
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    expect(wrapper.text()).toContain(EMPTY_HEADING);
    expect(wrapper.text()).toContain(
      "DefMiner analyses JavaScript as you browse, in the background.",
    );
    expect(wrapper.text()).toContain("DefMiner sends nothing to the target");
    // THE OTHER SCREEN IS ABSENT. Asserting only that this heading is present
    // would pass on a component that rendered both.
    expect(wrapper.text()).not.toContain(FILTERED_EMPTY_HEADING);
    expect(wrapper.text()).not.toContain("Clear all filters");
  });

  it("renders the filtered-empty screen, and NOT the nothing-analysed one, under a filter", async () => {
    const h = harness([]);
    const wrapper = mountTable(h.store);
    await h.store.setFilter({ column: "kind", value: "inline" });
    await settle(wrapper);

    expect(wrapper.text()).toContain(FILTERED_EMPTY_HEADING);
    expect(wrapper.text()).not.toContain(EMPTY_HEADING);
  });

  it("interpolates the REACHABLE total into the filtered-empty body", async () => {
    const h = harness([]);
    const wrapper = mountTable(h.store);
    await h.store.setFilter({ column: "kind", value: "inline" });
    await settle(wrapper);

    // 4,321 — grouped, and agreeing with a plural noun.
    expect(wrapper.text()).toContain(
      "4,321 secrets exist on this target. Clear the filters to see them all.",
    );
    expect(wrapper.text()).not.toContain("secret(s)");
  });

  it("agrees in number at one — never `1 secrets`, never a parenthesised suffix", async () => {
    const h = harness([], {
      total: { visible: 1, hiddenBySuppression: 0, suppressionRuleCount: 0 },
    });
    const wrapper = mountTable(h.store);
    await h.store.setFilter({ column: "kind", value: "inline" });
    await settle(wrapper);

    expect(wrapper.text()).toContain("1 secret exists on this target.");
    expect(wrapper.text()).not.toContain("1 secrets");
    expect(wrapper.text()).not.toContain("secret(s)");
  });

  it("clear-all-filters clears the store's filter and re-requests the first page", async () => {
    const h = harness([]);
    const wrapper = mountTable(h.store);
    await h.store.setFilter({ column: "kind", value: "inline" });
    await settle(wrapper);

    const before = h.requests.length;
    const button = wrapper
      .findAll("button")
      .find((b) => b.text() === "Clear all filters");
    expect(button).toBeDefined();
    await button!.trigger("click");
    await settle(wrapper);

    expect(h.store.filter.value).toBeNull();
    expect(h.requests.length).toBeGreaterThan(before);
    expect(h.requests[h.requests.length - 1].filter).toBeNull();
    expect(h.requests[h.requests.length - 1].cursor).toBeNull();
  });
});

describe("InventoryTable — loading is skeleton rows, never a spinner", () => {
  it("renders one skeleton row per row of the page, each at the row-height class", async () => {
    // A read that never settles: the loading state, held open.
    const store = createInventoryStore<Row>({
      projectId: "p1",
      table: "artifacts",
      sortKey: "last_seen",
      direction: "desc",
      readPage: () => new Promise(() => {}),
      countRows: () => new Promise(() => {}),
    });
    const wrapper = mountTable(store);
    void store.loadFirstPage();
    await settle(wrapper);

    const skeletons = wrapper.findAll("[data-defminer-skeleton-row]");
    expect(skeletons).toHaveLength(KEYSET_PAGE_ROWS);
    for (const skeleton of skeletons) {
      expect(skeleton.classes()).toContain(ROW_HEIGHT_CLASS);
    }
    expect(wrapper.text()).toContain(
      `Loading the first ${String(KEYSET_PAGE_ROWS)} rows…`,
    );
  });

  it("renders NO element with a spinner role — a spinner reflows the table on resolve", async () => {
    const store = createInventoryStore<Row>({
      projectId: "p1",
      table: "artifacts",
      sortKey: "last_seen",
      direction: "desc",
      readPage: () => new Promise(() => {}),
      countRows: () => new Promise(() => {}),
    });
    const wrapper = mountTable(store);
    void store.loadFirstPage();
    await settle(wrapper);

    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.html()).not.toContain("animate-spin");
  });

  it("binds the scroller's item size to the shared row-height constant", async () => {
    const h = harness(rowsFor(3));
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    // STRICT equality against the constant, not against 32. A test that
    // restated the number would pass while the two halves drifted.
    expect(itemSizeOf(wrapper)).toBe(TABLE_ROW_HEIGHT_PX);
  });
});

describe("InventoryTable — the error screen", () => {
  it("renders the contract's error copy with both actions", async () => {
    const h = harness([], { fail: true });
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    expect(wrapper.text()).toContain(RPC_ERROR_STATE_BODY);
    // The backend-thread explanation is what stops the operator filing "the UI
    // hangs" against the wrong component.
    expect(wrapper.text()).toContain("blocks its single thread");

    const labels = wrapper.findAll("button").map((b) => b.text());
    expect(labels).toContain("Retry");
    expect(labels).toContain("Open Health");
  });

  it("re-issues the request on Retry", async () => {
    const h = harness([], { fail: true });
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    const before = h.requests.length;
    const retry = wrapper.findAll("button").find((b) => b.text() === "Retry");
    await retry!.trigger("click");
    await settle(wrapper);

    expect(h.requests.length).toBeGreaterThan(before);
  });

  it("emits open-health rather than reaching into the tab strip itself", async () => {
    const h = harness([], { fail: true });
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    const health = wrapper
      .findAll("button")
      .find((b) => b.text() === "Open Health");
    await health!.trigger("click");

    expect(wrapper.emitted("open-health")).toHaveLength(1);
  });
});

describe("InventoryTable — the populated table", () => {
  it("renders every resident row through the scroller", async () => {
    const h = harness(rowsFor(3));
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    expect(wrapper.findAll('[role="row"][tabindex="0"]')).toHaveLength(3);
    expect(wrapper.text()).toContain("value-0");
    expect(wrapper.text()).toContain("value-2");
  });

  it("renders one row for a single-row result — no special case", async () => {
    const h = harness(rowsFor(1));
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    expect(wrapper.findAll('[role="row"][tabindex="0"]')).toHaveLength(1);
    expect(wrapper.text()).not.toContain(EMPTY_HEADING);
  });

  it("gives every cell pre-formatted whitespace and hidden overflow", async () => {
    const h = harness(rowsFor(2));
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    const cells = wrapper.findAll('[role="gridcell"]');
    expect(cells.length).toBe(2 * COLUMNS.length);
    for (const cell of cells) {
      expect(cell.classes()).toContain("whitespace-pre");
      expect(cell.classes()).toContain("overflow-hidden");
    }
  });

  it("renders the target-controlled column in font-mono, through the display path", async () => {
    const h = harness([{ id: "r0", value: "‮moc.live‬", kind: "script" }]);
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    // The bidi override is GONE — the display path stripped it before the DOM.
    expect(wrapper.text()).not.toContain("‮");
    expect(wrapper.text()).toContain("moc.live");

    const mono = wrapper
      .findAll("span")
      .filter((s) => s.classes().includes("font-mono"));
    expect(mono.length).toBeGreaterThan(0);
  });

  it("truncates a target-controlled value at the cell cap without breaking the row", async () => {
    const h = harness([{ id: "r0", value: "x".repeat(5000), kind: "script" }]);
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    // 256 graphemes, and not one more. The measured HEIGHT of the row is the
    // browser spec's half — see this file's header.
    expect(wrapper.text()).not.toContain("x".repeat(257));
    expect(wrapper.text()).toContain("x".repeat(256));
  });

  it("gives every row the fixed row-height class", async () => {
    const h = harness(rowsFor(4));
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    for (const row of wrapper.findAll('[role="row"][tabindex="0"]')) {
      expect(row.classes()).toContain(ROW_HEIGHT_CLASS);
    }
  });
});

describe("InventoryTable — the accent budget and the keyboard surface", () => {
  const accentElements = (wrapper: VueWrapper): number =>
    wrapper
      .findAll("*")
      .filter((node) => node.classes().includes("border-primary-500")).length;

  it("paints no row accent when nothing is selected", async () => {
    const h = harness(rowsFor(3));
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    expect(accentElements(wrapper)).toBe(0);
  });

  it("paints EXACTLY ONE row accent when a row is selected", async () => {
    const h = harness(rowsFor(3));
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    h.store.selectRow("r1");
    await settle(wrapper);

    expect(accentElements(wrapper)).toBe(1);
    const selected = wrapper.find('[aria-selected="true"]');
    expect(selected.exists()).toBe(true);
    for (const token of SELECTED_ROW_ACCENT_CLASS.split(" ")) {
      expect(selected.classes()).toContain(token);
    }
  });

  it("selects the row and opens the panel on a click and on Enter", async () => {
    const h = harness(rowsFor(2));
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    const rows = wrapper.findAll('[role="row"][tabindex="0"]');
    await rows[1].trigger("keydown.enter");
    expect(h.store.selectedRowKey.value).toBe("r1");
    expect(h.store.panelOpen.value).toBe(true);
  });

  it("gives every interactive element the accent focus ring and a text label", async () => {
    const h = harness(rowsFor(2));
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    const interactive = [
      ...wrapper.findAll("button"),
      ...wrapper.findAll('[tabindex="0"]'),
    ];
    expect(interactive.length).toBeGreaterThan(0);
    for (const node of interactive) {
      for (const token of FOCUS_RING_CLASS.split(" ")) {
        expect(node.classes()).toContain(token);
      }
      // NO ICON-ONLY ACTION ANYWHERE. Every one of them says something.
      expect(node.text().trim().length).toBeGreaterThan(0);
    }
  });
});

describe("InventoryTable — grid semantics and the announced row count", () => {
  it("announces the REACHABLE total, not the resident window", async () => {
    // 3 resident rows against a reachable total of 4,321 — the two differ, so
    // an implementation reading `rows.length` fails here rather than passing by
    // coincidence.
    const h = harness(rowsFor(3));
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    const grid = wrapper.find('[role="grid"]');
    expect(grid.exists()).toBe(true);
    expect(grid.attributes("aria-rowcount")).toBe(String(TOTAL.visible));
    expect(grid.attributes("aria-rowcount")).not.toBe("3");
    expect(grid.attributes("aria-label")).toBe("Artifacts");
  });

  it("exposes row, columnheader and gridcell semantics", async () => {
    const h = harness(rowsFor(2));
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    expect(wrapper.findAll('[role="columnheader"]')).toHaveLength(
      COLUMNS.length,
    );
    expect(wrapper.findAll('[role="gridcell"]').length).toBe(
      2 * COLUMNS.length,
    );
    // 1-based over the whole set, not over the window.
    const rows = wrapper.findAll('[role="row"][tabindex="0"]');
    expect(rows[0].attributes("aria-rowindex")).toBe("1");
    expect(rows[1].attributes("aria-rowindex")).toBe("2");
  });
});

describe("InventoryTable — sorting is a request, never an arrangement", () => {
  it("re-asks the backend from the first page when a column header is clicked", async () => {
    const h = harness(rowsFor(3));
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    const before = h.requests.length;
    const header = wrapper
      .findAll('[role="columnheader"] button')
      .find((b) => b.text().startsWith("Kind"));
    expect(header).toBeDefined();
    await header!.trigger("click");
    await settle(wrapper);

    const latest = h.requests[h.requests.length - 1];
    expect(h.requests.length).toBeGreaterThan(before);
    expect(latest.sortKey).toBe("kind");
    // From the FIRST page: the window was discarded, not re-arranged.
    expect(latest.cursor).toBeNull();
  });

  it("renders the sort direction as a WORD, with no accent on the indicator", async () => {
    const h = harness(rowsFor(3));
    const wrapper = mountTable(h.store);
    await h.store.setSort("kind", "asc");
    await settle(wrapper);

    const header = wrapper
      .findAll('[role="columnheader"]')
      .find((c) => c.text().startsWith("Kind"));
    expect(header!.text()).toContain("ascending");
    expect(header!.attributes("aria-sort")).toBe("ascending");
    expect(header!.html()).not.toContain("text-primary-500");
    expect(header!.html()).not.toContain("bg-primary-500");
  });

  it("offers no sort affordance on a column that declares no sort key", async () => {
    const h = harness(rowsFor(3));
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    const valueHeader = wrapper
      .findAll('[role="columnheader"]')
      .find((c) => c.text().startsWith("Value"));
    expect(valueHeader!.find("button").exists()).toBe(false);
  });
});

describe("InventoryTable — the column contract is enforced by the shell", () => {
  // Checked HERE and not in each concrete table, because a check a caller has
  // to remember to call is a check the third table will not call.
  const mountColumns = (columns: readonly ColumnDefinition<Row>[]): void => {
    const Bound = InventoryTable as unknown as new () => {
      $props: {
        label: string;
        columns: readonly ColumnDefinition<Row>[];
        store: InventoryStore<Row>;
        rowKey: (row: Row) => string;
      };
    };
    mount(Bound, {
      props: {
        label: "Artifacts",
        columns,
        store: harness([]).store,
        rowKey: (row: Row) => row.id,
      },
      global: { stubs: { RecycleScroller: ScrollerStub } },
    });
  };

  it("refuses a table with TWO target-controlled columns", () => {
    expect(() =>
      mountColumns([
        { ...COLUMNS[0], targetControlled: true },
        { ...COLUMNS[1] },
      ]),
    ).toThrow(/EXACTLY ONE/);
  });

  it("refuses a table with NO target-controlled column", () => {
    expect(() =>
      mountColumns([
        { ...COLUMNS[0] },
        { ...COLUMNS[1], targetControlled: false },
      ]),
    ).toThrow(/EXACTLY ONE/);
  });

  it("refuses two columns sharing an id — one slot would render twice", () => {
    expect(() =>
      mountColumns([
        { ...COLUMNS[1] },
        { ...COLUMNS[1], targetControlled: false },
      ]),
    ).toThrow(/duplicate column id/);
  });
});

// ===========================================================================
// THE TABLE PAGES ITSELF
// ===========================================================================
// THE DEFECT THIS BLOCK EXISTS FOR: the store could always fetch page two, and
// nothing on screen ever asked it to, so the first hundred rows were the only
// hundred an operator could read. The real scroller cannot be laid out in jsdom
// (see this file's header), so the stub stands in for it and EMITS the two
// events the real one emits when its first or last item enters the rendered
// range; `tests/frontend-load.spec.ts` drives the real one in a browser.

/**
 * A store over `total` rows served in keyset pages, with an optional scripted
 * failure of one request by its call index.
 */
function pagedHarness(
  total: number,
  options: { readonly failCall?: number } = {},
): StoreHarness {
  const requests: PageRequest[] = [];
  let call = 0;
  const readPage: PageReader<Row> = (request) => {
    requests.push(request);
    const mine = call;
    call++;
    if (mine === options.failCall) {
      return Promise.resolve({
        ok: false,
        reason: "rpc-timeout",
        versions: null,
      } satisfies RpcResult<PageResponse<Row>>);
    }
    const start =
      request.cursor === null ? 0 : Number(request.cursor.sortValue);
    const end = Math.min(start + request.limit, total);
    const rows: Row[] = [];
    for (let index = start; index < end; index++) {
      rows.push({
        id: `r${String(index)}`,
        value: `v${String(index)}`,
        kind: "script",
      });
    }
    const exhausted = end >= total;
    return Promise.resolve({
      ok: true,
      value: {
        rows,
        nextCursor: exhausted
          ? null
          : { sortValue: end, tieBreak: `r${String(end)}` },
        scanned: rows.length,
        exhausted,
      },
    } satisfies RpcResult<PageResponse<Row>>);
  };
  const store = createInventoryStore<Row>({
    projectId: "p1",
    table: "artifacts",
    sortKey: "last_seen",
    direction: "desc",
    readPage,
    countRows: () =>
      Promise.resolve({
        ok: true,
        value: {
          visible: total,
          hiddenBySuppression: 0,
          suppressionRuleCount: 0,
        },
      }),
  });
  return { store, requests };
}

/** Emit one of the real scroller's range events from the stub. */
async function reach(
  wrapper: VueWrapper,
  event: "scroll-end" | "scroll-start",
): Promise<void> {
  wrapper.findComponent(ScrollerStub).vm.$emit(event);
  await settle(wrapper);
}

function footerText(wrapper: VueWrapper): string {
  return wrapper.get("[data-defminer-table-footer]").text();
}

describe("InventoryTable — scrolling to the end reads the rest of the list", () => {
  it("asks for the NEXT page when the last row enters the rendered range", async () => {
    const h = pagedHarness(250);
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);
    expect(wrapper.findAll('[role="row"][tabindex="0"]')).toHaveLength(
      KEYSET_PAGE_ROWS,
    );

    await reach(wrapper, "scroll-end");

    expect(h.requests).toHaveLength(2);
    expect(h.requests[1]?.cursor).not.toBeNull();
    expect(wrapper.findAll('[role="row"][tabindex="0"]')).toHaveLength(
      2 * KEYSET_PAGE_ROWS,
    );
    expect(wrapper.text()).toContain("v199");
  });

  it("reaches the LAST row of the list, and then stops asking", async () => {
    const h = pagedHarness(250);
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    await reach(wrapper, "scroll-end");
    await reach(wrapper, "scroll-end");
    expect(wrapper.text()).toContain("v249");
    expect(h.store.complete.value).toBe(true);

    const before = h.requests.length;
    await reach(wrapper, "scroll-end");
    expect(h.requests, "a complete list was asked for more").toHaveLength(
      before,
    );
  });

  it("states which rows of how many are on screen, and offers the next page as a button", async () => {
    const h = pagedHarness(250);
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    expect(footerText(wrapper)).toContain("Rows 1–100 of 250");
    const loadMore = wrapper.get("[data-defminer-load-more]");
    expect(loadMore.text()).toBe("Load more rows");
    for (const token of FOCUS_RING_CLASS.split(" ")) {
      expect(loadMore.classes()).toContain(token);
    }

    await loadMore.trigger("click");
    await settle(wrapper);
    expect(footerText(wrapper)).toContain("Rows 1–200 of 250");

    await wrapper.get("[data-defminer-load-more]").trigger("click");
    await settle(wrapper);
    expect(footerText(wrapper)).toContain("Rows 1–250 of 250");
    // THE END OF THE LIST OFFERS NOTHING MORE.
    expect(wrapper.find("[data-defminer-load-more]").exists()).toBe(false);
  });

  it("keeps the rows on screen when a PAGE fails, and does not re-ask until Retry", async () => {
    const h = pagedHarness(250, { failCall: 1 });
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    await reach(wrapper, "scroll-end");

    // THE ROWS STAY. A failed next page is not a failed table.
    expect(wrapper.findAll('[role="row"][tabindex="0"]')).toHaveLength(
      KEYSET_PAGE_ROWS,
    );
    expect(wrapper.text()).not.toContain(RPC_ERROR_STATE_BODY);
    expect(footerText(wrapper)).toContain(
      "The DefMiner backend did not return these rows.",
    );

    // A nudge of the scroll bar does not re-ask a backend that did not answer.
    const before = h.requests.length;
    await reach(wrapper, "scroll-end");
    expect(h.requests).toHaveLength(before);

    await wrapper.get("[data-defminer-paging-retry]").trigger("click");
    await settle(wrapper);
    expect(h.requests).toHaveLength(before + 1);
    expect(wrapper.findAll('[role="row"][tabindex="0"]')).toHaveLength(
      2 * KEYSET_PAGE_ROWS,
    );
    expect(footerText(wrapper)).not.toContain("did not return");
  });
});

describe("InventoryTable — the window moves, and the numbering does not", () => {
  const PAGES_TO_EVICT = IN_MEMORY_WINDOW_ROWS / KEYSET_PAGE_ROWS + 1;

  async function scrolledPastTheBound(): Promise<{
    h: StoreHarness;
    wrapper: VueWrapper;
  }> {
    const h = pagedHarness(IN_MEMORY_WINDOW_ROWS + 5 * KEYSET_PAGE_ROWS);
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);
    for (let page = 1; page < PAGES_TO_EVICT; page++) {
      await reach(wrapper, "scroll-end");
    }
    return { h, wrapper };
  }

  it("refetches an EVICTED page when the first row enters the range — and not before", async () => {
    const h = pagedHarness(IN_MEMORY_WINDOW_ROWS + 5 * KEYSET_PAGE_ROWS);
    const wrapper = mountTable(h.store);
    await h.store.loadFirstPage();
    await settle(wrapper);

    // Nothing evicted yet: the top of the window IS the top of the list.
    await reach(wrapper, "scroll-start");
    expect(h.requests).toHaveLength(1);

    for (let page = 1; page < PAGES_TO_EVICT; page++) {
      await reach(wrapper, "scroll-end");
    }
    expect(h.store.canLoadPrevious.value).toBe(true);
    const before = h.requests.length;

    await reach(wrapper, "scroll-start");

    expect(h.requests).toHaveLength(before + 1);
    // The evicted page's OWN boundary: the first page's, which is no cursor.
    expect(h.requests[before]?.cursor).toBeNull();
    expect(wrapper.text()).toContain("v0");
  });

  it("numbers rows over the WHOLE set once the head was evicted", async () => {
    const { wrapper } = await scrolledPastTheBound();

    const rows = wrapper.findAll('[role="row"][tabindex="0"]');
    expect(rows).toHaveLength(IN_MEMORY_WINDOW_ROWS);
    // One page went off the head, so the first resident row is the 101st.
    expect(rows[0]?.attributes("aria-rowindex")).toBe(
      String(KEYSET_PAGE_ROWS + 1),
    );
    expect(rows[0]?.text()).toContain(`v${String(KEYSET_PAGE_ROWS)}`);
    expect(footerText(wrapper)).toContain(
      `Rows 101–2,100 of ${groupThousands(IN_MEMORY_WINDOW_ROWS + 5 * KEYSET_PAGE_ROWS)}`,
    );
  });
});

describe("InventoryTable — a store that has not been asked yet", () => {
  it("renders the loading skeleton, NEVER the empty screen", async () => {
    // The page waits for the backend to name the active project before its
    // first read. The empty screen in that gap would say the target served
    // nothing.
    const h = pagedHarness(250);
    const wrapper = mountTable(h.store);
    await settle(wrapper);

    expect(h.store.loadState.value).toBe("idle");
    expect(wrapper.text()).not.toContain(EMPTY_HEADING);
    expect(wrapper.text()).toContain(
      `Loading the first ${String(KEYSET_PAGE_ROWS)} rows…`,
    );
    expect(wrapper.find("[data-defminer-table-footer]").exists()).toBe(false);
  });
});
