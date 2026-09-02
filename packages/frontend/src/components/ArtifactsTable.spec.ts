// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// packages/frontend/src/components/ArtifactsTable.spec.ts — the `Sources`
// column, which is the drill-down's ONLY entry point (U7-6).
//
// ===========================================================================
// WHY THIS FILE EXISTS BESIDE FindingsTable.spec.ts
// ===========================================================================
// That file owns the table's SHAPE — the four bound columns in order, the
// exactly-one target-controlled column, UI-09's degradation marking — and every
// mount in it passes `sourceCounts: null`, which is the honest statement that
// the mount has nothing to say about counts. This file supplies the map, and
// asserts the one thing the column exists to keep apart.
//
// ===========================================================================
// THE THREE CELL STATES ARE THREE TESTS, AND THAT IS THE POINT
// ===========================================================================
// A RESOLVED ZERO AND AN UNRESOLVED COUNT ARE DIFFERENT FACTS. One says "this
// bundle carried no inline map", which is a real and useful thing to know about
// a bundle. The other says nothing at all. A single renderer will collapse them
// — that is what the UI contract's `zero-one-many` row predicts — so they are
// asserted separately, and the unresolved case is asserted by the ABSENCE of
// both text and child elements rather than by "not a button". A `0` rendered
// for an unknown count tells the operator the OPPOSITE of the truth and stops
// them opening the one row that had the finding.
//
// The failed-lookup case is DELIBERATELY the same assertion as the loading one.
// A null map and a still-resolving map both mean NOT KNOWN, and the count cell
// is not where a read failure is reported — that surfaces at the artifact
// level, in the evidence panel, where the analysis vocabulary lives.

import type {
  PageRequest,
  PageResponse,
  ScanState,
  VisibleTotal,
} from "@defminer/engine/contract";
import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";

import type { RpcResult } from "../api/client";
import type { ArtifactRow } from "../backend";
import type { InventoryStore, PageReader } from "../stores/inventory";
import { createInventoryStore } from "../stores/inventory";

import ArtifactsTable from "./ArtifactsTable.vue";
import { counted, groupThousands } from "./table-contract";

const ScrollerStub = defineComponent({
  name: "RecycleScroller",
  props: {
    items: { type: Array, required: true },
    itemSize: { type: Number, required: true },
    keyField: { type: String, required: true },
    buffer: { type: Number, default: 0 },
  },
  template: `<div><template v-for="(item, index) in items" :key="index"><slot :item="item" :index="index" /></template></div>`,
});

const TOTAL: VisibleTotal = {
  visible: 3,
  hiddenBySuppression: 0,
  suppressionRuleCount: 0,
};

function digest(index: number): string {
  return String(index).padStart(2, "0").repeat(32);
}

function artifactRows(count: number): ArtifactRow[] {
  const rows: ArtifactRow[] = [];
  for (let index = 0; index < count; index++) {
    rows.push({
      project_id: "p1",
      sha256: digest(index),
      byte_len: 1024 + index,
      kind: "script",
      first_seen_at: 1_756_000_000_000,
      last_seen_at: 1_756_000_500_000 + index,
      scan_state: null,
      seen_count: 1,
    });
  }
  return rows;
}

function storeOver(rows: readonly ArtifactRow[]): InventoryStore<ArtifactRow> {
  const readPage: PageReader<ArtifactRow> = (_request: PageRequest) =>
    Promise.resolve({
      ok: true,
      value: {
        rows,
        nextCursor: null,
        scanned: rows.length,
        exhausted: true,
      } satisfies PageResponse<ArtifactRow>,
    } satisfies RpcResult<PageResponse<ArtifactRow>>);

  return createInventoryStore<ArtifactRow>({
    projectId: "p1",
    table: "artifacts",
    sortKey: "last_seen",
    direction: "desc",
    readPage,
    countRows: () => Promise.resolve({ ok: true, value: TOTAL }),
  });
}

async function mountTable(
  rows: readonly ArtifactRow[],
  sourceCounts: ReadonlyMap<string, number> | null,
  analyses: ReadonlyMap<string, ScanState> | null = null,
): Promise<VueWrapper> {
  const store = storeOver(rows);
  const wrapper = mount(ArtifactsTable, {
    props: { store, analyses, sourceCounts, affectedFilter: null },
    global: { stubs: { RecycleScroller: ScrollerStub } },
  });
  await store.loadFirstPage();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
  return wrapper;
}

/**
 * The `Sources` cell of the first row.
 *
 * Resolved by COLUMN POSITION off the header, not by a hardcoded index: the
 * column is appended after the shipped five, and an index written here would
 * silently point at `Kind` the day a sixth is added.
 */
function sourcesCell(wrapper: VueWrapper): Element {
  const headers = [
    ...wrapper.element.querySelectorAll('[role="columnheader"]'),
  ];
  const position = headers.findIndex(
    (header) => (header.textContent ?? "").trim() === "Sources",
  );
  expect(position).toBeGreaterThanOrEqual(0);

  const row = wrapper.element.querySelector('[role="row"][aria-rowindex="1"]');
  expect(row).not.toBeNull();
  const cells = [...(row?.querySelectorAll('[role="gridcell"]') ?? [])];
  const cell = cells[position];
  expect(cell).toBeDefined();
  return cell as Element;
}

const ONE_ROW = artifactRows(1);
const SHA = digest(0);

describe("sources-count-column / populated — a resolved count of at least one", () => {
  it("renders the grouped integer as a BUTTON naming the count", async () => {
    const wrapper = await mountTable(ONE_ROW, new Map([[SHA, 1234]]));
    const cell = sourcesCell(wrapper);

    const button = cell.querySelector("button");
    expect(button).not.toBeNull();
    expect((button?.textContent ?? "").trim()).toBe(groupThousands(1234));
    expect(button?.getAttribute("aria-label")).toBe(
      `Browse ${counted(1234, "recovered source", "recovered sources")}`,
    );
  });

  it("emits browse-sources with the row's DIGEST, and nothing else", async () => {
    const wrapper = await mountTable(ONE_ROW, new Map([[SHA, 2]]));
    await (sourcesCell(wrapper).querySelector("button") as HTMLElement).click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("browse-sources")).toEqual([[SHA]]);
  });

  it("agrees with its noun at ONE — never `1 recovered sources`", async () => {
    // 05-UI-SPEC.md § "Copywriting Contract"'s own zero-one-many rule outranks
    // its template row: a count that does not agree with its noun is the defect
    // that rule names. The accessible name is the only place this count is
    // spelled out in words, so it is the only place it can be got wrong.
    const wrapper = await mountTable(ONE_ROW, new Map([[SHA, 1]]));
    const label =
      sourcesCell(wrapper)
        .querySelector("button")
        ?.getAttribute("aria-label") ?? "";
    expect(label).toBe("Browse 1 recovered source");
    expect(label).not.toContain("sources");
  });
});

describe("sources-count-column / zero-one-many — a RESOLVED zero", () => {
  it("renders the digit in the muted tone and is NOT a button", async () => {
    const wrapper = await mountTable(ONE_ROW, new Map([[SHA, 0]]));
    const cell = sourcesCell(wrapper);

    // A resolved zero is a real, useful fact: this bundle carried no inline
    // map. It is rendered, and it is NOT an entry point, because there is
    // nothing to browse.
    expect((cell.textContent ?? "").trim()).toBe("0");
    expect(cell.querySelector("button")).toBeNull();
    expect(cell.querySelector("span")?.getAttribute("class")).toContain(
      "text-surface-400",
    );
  });

  it("is a DIFFERENT rendering from an unresolved count, never the same pixel", async () => {
    const resolved = await mountTable(ONE_ROW, new Map([[SHA, 0]]));
    const unknown = await mountTable(ONE_ROW, new Map());

    // The load-bearing assertion of this whole column, stated as an
    // inequality: whatever the two render, they do not render the same thing.
    expect((sourcesCell(resolved).textContent ?? "").trim()).not.toBe(
      (sourcesCell(unknown).textContent ?? "").trim(),
    );
  });
});

describe("sources-count-column / loading and error — an UNRESOLVED count", () => {
  it("renders NOTHING for a digest the map does not carry: no text, no element", async () => {
    const wrapper = await mountTable(ONE_ROW, new Map([["some-other", 9]]));
    const cell = sourcesCell(wrapper);

    // Asserted on BOTH axes. Empty text alone would pass against a `<span>`
    // holding a non-breaking space, and no child alone would pass against a
    // bare `0` interpolated into the cell.
    expect((cell.textContent ?? "").trim()).toBe("");
    expect(cell.childElementCount).toBe(0);
  });

  it("renders NOTHING while the whole map is still null", async () => {
    const wrapper = await mountTable(ONE_ROW, null);
    const cell = sourcesCell(wrapper);
    expect((cell.textContent ?? "").trim()).toBe("");
    expect(cell.childElementCount).toBe(0);
  });

  it("mounts no spinner, no skeleton and no progress element in the column", async () => {
    // A spinner in a 32px cell reflows the column when it resolves, and the
    // whole table with it. There is no element with a progress role anywhere.
    const wrapper = await mountTable(ONE_ROW, null);
    expect(
      wrapper.element.querySelectorAll(
        '[role="progressbar"], [role="status"], progress',
      ),
    ).toHaveLength(0);
  });

  it("renders the SAME empty cell for a failed lookup as for a pending one", async () => {
    // DELIBERATELY INDISTINGUISHABLE. Both mean NOT KNOWN, and the count cell
    // is not where a read failure is reported: that surfaces at the artifact
    // level in the evidence panel, where the analysis vocabulary lives. The
    // page models a failed lookup as `null`, which is this assertion's left
    // side; a map that simply has not answered yet is its right.
    //
    // Compared on RENDERED MARKUP with the slot's own comment node stripped —
    // the comment is Vue's placeholder for an unused slot fallback and carries
    // the source file's line wrapping, which is not a rendering difference.
    const stripped = (cell: Element): string =>
      cell.outerHTML.replace(/<!--[\s\S]*?-->/g, "").replace(/\s+/g, " ");
    const failed = await mountTable(ONE_ROW, null);
    const pending = await mountTable(ONE_ROW, new Map());
    expect(stripped(sourcesCell(failed))).toBe(stripped(sourcesCell(pending)));
  });
});

describe("sources-count-column / overflow and long-text", () => {
  it("holds a count past a million on one pre-formatted, clipped line", async () => {
    const wrapper = await mountTable(ONE_ROW, new Map([[SHA, 12_345_678]]));
    const button = sourcesCell(wrapper).querySelector("button");

    expect((button?.textContent ?? "").trim()).toBe(groupThousands(12_345_678));
    // Fixed row geometry is what `RecycleScroller` needs; a cell that could
    // wrap degrades it to the dynamic variant for the whole table.
    const className = button?.getAttribute("class") ?? "";
    expect(className).toContain("whitespace-pre");
    expect(className).toContain("overflow-hidden");
  });

  it("renders a DefMiner-computed integer and nothing else — a property of the SHAPE", async () => {
    // Long-text is closed by CONSTRUCTION here, not by discipline. The cell's
    // entire output space over any count is the grouped integer; there is no
    // field a later edit could render a target-controlled string into, and the
    // column is not marked target-controlled, so the shell's exactly-one
    // assertion is unchanged.
    for (const count of [0, 1, 7, 1024, 999_999_999]) {
      const wrapper = await mountTable(ONE_ROW, new Map([[SHA, count]]));
      expect((sourcesCell(wrapper).textContent ?? "").trim()).toBe(
        groupThousands(count),
      );
    }
  });

  it("carries the sha256 in no attribute of the Sources cell", async () => {
    const wrapper = await mountTable(ONE_ROW, new Map([[SHA, 3]]));
    const cell = sourcesCell(wrapper);
    const offenders: string[] = [];
    for (const element of [cell, ...cell.querySelectorAll("*")]) {
      for (const attribute of element.attributes) {
        if (String(attribute.value).includes(SHA)) {
          offenders.push(`${String(element.tagName)}[${attribute.name}]`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
