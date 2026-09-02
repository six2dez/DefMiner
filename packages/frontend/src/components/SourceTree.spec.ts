// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// packages/frontend/src/components/SourceTree.spec.ts — every state
// 07-UI-SPEC.md § "UI Considerations" enumerates for `source-tree`, asserted
// rather than read for.
//
// ===========================================================================
// WHY `RecycleScroller` IS STUBBED HERE, AND WHY THAT IS NOT A HOLE
// ===========================================================================
// The same measured reason `InventoryTable.spec.ts` records: mounted in jsdom
// the real scroller sizes its window from `getBoundingClientRect`, jsdom
// reports every box as 0x0 because it has no layout engine, and the scroller
// correctly concludes that zero rows fit. A row assertion written against that
// renders nothing, finds nothing, and PASSES BY MEASURING AN EMPTY SET.
//
// So the scroller is a passthrough declaring the same props, and the two facts
// it cannot carry are stated separately and honestly:
//
//   * `item-size` is asserted on the STUB'S OWN PROPS, so the number that
//     reaches the real component is still checked, by IDENTITY against
//     `TABLE_ROW_HEIGHT_PX` rather than against a literal 32.
//   * ROW GEOMETRY — that a rendered row really is 32px and that a 4 KB label
//     does not grow it — is not assertable in an environment without layout.
//     That half belongs to the browser-driven load spec, and it is named here
//     rather than left to be assumed covered.

import { readFileSync } from "node:fs";

import type { SourceProducibility } from "@defminer/engine/contract";
import { SOURCES_LABEL_CASES } from "@defminer/engine/sourcemap/map-fixture";
import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";

import { TABLE_ROW_HEIGHT_PX } from "../safety/display";

import SourceTree from "./SourceTree.vue";
import { ROW_HEIGHT_CLASS } from "./table-contract";

const SOURCE_TREE_MODULE = "packages/frontend/src/components/SourceTree.vue";

type Row = {
  readonly sourceIndex: number;
  readonly sourcesVerbatim: string | null;
  readonly producibility: SourceProducibility;
};

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

type Props = {
  loadState: "loading" | "failed" | "ready";
  rows: readonly Row[];
  total: number;
  returned: number;
  bound: number;
  analysisStoppedEarly?: boolean;
  selectedIndex?: number | null;
};

function mountTree(props: Partial<Props> = {}): VueWrapper {
  const rows = props.rows ?? [];
  return mount(SourceTree, {
    props: {
      loadState: "ready",
      rows,
      total: rows.length,
      returned: rows.length,
      bound: 2000,
      ...props,
    },
    global: { stubs: { RecycleScroller: ScrollerStub } },
  });
}

const row = (
  sourceIndex: number,
  sourcesVerbatim: string | null,
  producibility: SourceProducibility = "producible",
): Row => ({ sourceIndex, sourcesVerbatim, producibility });

const labels = (wrapper: VueWrapper): string[] =>
  wrapper
    .findAll("[data-defminer-source-tree-label]")
    .map((node) => node.text());

const itemSizeOf = (wrapper: VueWrapper): unknown =>
  wrapper.findComponent(ScrollerStub).props("itemSize");

// ---------------------------------------------------------------------------
// THE FIVE STATES, EACH ITS OWN TEST
// ---------------------------------------------------------------------------

describe("source-tree / empty — the inline-only explanation, and NOT the error", () => {
  it("states that DefMiner never fetches a .map file", () => {
    const wrapper = mountTree({ rows: [], total: 0, returned: 0 });
    const empty = wrapper.find("[data-defminer-source-tree-empty]");
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toContain("No recovered sources in this bundle");
    expect(empty.text()).toContain("never fetches");
    expect(empty.text()).toContain("DefMiner stays silent");
  });

  it("is a DIFFERENT SCREEN from the error state", () => {
    // Asserted by the ABSENCE of the other heading rather than by the presence
    // of this one: an operator who sees a generic empty state over a failed
    // load has been told the opposite of the truth, and the only way to catch a
    // regression that merges the two is to look for what must not be there.
    const empty = mountTree({ rows: [], total: 0, returned: 0 });
    const failed = mountTree({
      loadState: "failed",
      rows: [],
      total: 0,
      returned: 0,
    });

    expect(empty.find("[data-defminer-source-tree-error]").exists()).toBe(
      false,
    );
    expect(failed.find("[data-defminer-source-tree-empty]").exists()).toBe(
      false,
    );
    expect(empty.text()).not.toContain("Could not load");
    expect(failed.text()).not.toContain("No recovered sources in this bundle");
  });

  it("renders the analysis-stopped-early variant with its own action", () => {
    // The one case where an empty tree is genuinely ambiguous, and the action
    // is what resolves it: the evidence panel says why the analysis stopped.
    const wrapper = mountTree({
      rows: [],
      total: 0,
      returned: 0,
      analysisStoppedEarly: true,
    });
    const empty = wrapper.find("[data-defminer-source-tree-empty]");
    expect(empty.text()).toContain("stopped early");
    expect(empty.text()).not.toContain("No recovered sources in this bundle");
    expect(wrapper.text()).toContain("Open evidence");
  });
});

describe("source-tree / loading — skeleton rows, NEVER a spinner", () => {
  it("renders skeleton rows at the fixed row-height class", () => {
    const wrapper = mountTree({
      loadState: "loading",
      rows: [],
      total: 0,
      returned: 0,
    });
    const skeletons = wrapper.findAll("[data-defminer-skeleton-row]");
    expect(skeletons.length).toBeGreaterThan(0);
    for (const skeleton of skeletons) {
      expect(skeleton.classes()).toContain(ROW_HEIGHT_CLASS);
    }
    expect(wrapper.text()).toContain("Loading recovered sources…");
  });

  it("mounts no spinner — a spinner reflows the column when it resolves", () => {
    const wrapper = mountTree({
      loadState: "loading",
      rows: [],
      total: 0,
      returned: 0,
    });
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    // Over the CLASS ATTRIBUTES of the rendered elements, not over the raw
    // HTML: the template's own comment says the word "SPINNER" and a substring
    // search on the markup would fail on the comment that documents the rule.
    for (const node of wrapper.element.querySelectorAll("*")) {
      const className = String(node.getAttribute("class") ?? "");
      expect(className).not.toContain("spin");
      expect(className).not.toContain("animate-");
    }
  });

  it("does not change the row height when the data resolves", () => {
    // The skeleton and the real row read the SAME class from the SAME constant.
    // A skeleton at a different height is the reflow the no-spinner rule exists
    // to prevent, wearing different clothes.
    const loading = mountTree({
      loadState: "loading",
      rows: [],
      total: 0,
      returned: 0,
    });
    const ready = mountTree({ rows: [row(0, "src/app.js")] });
    const skeletonClasses = loading
      .find("[data-defminer-skeleton-row]")
      .classes();
    const rowClasses = ready.find('[role="treeitem"]').classes();
    expect(skeletonClasses).toContain(ROW_HEIGHT_CLASS);
    expect(rowClasses).toContain(ROW_HEIGHT_CLASS);
  });
});

describe("source-tree / error — explicit, with both actions, NEVER an empty list", () => {
  it("renders the failure in words with Retry and Open Health", () => {
    const wrapper = mountTree({
      loadState: "failed",
      rows: [],
      total: 0,
      returned: 0,
    });
    const error = wrapper.find("[data-defminer-source-tree-error]");
    expect(error.exists()).toBe(true);
    expect(error.text()).toContain(
      "Could not load the recovered sources for this bundle.",
    );
    expect(error.text()).toContain("DefMiner has not looked");
    const buttons = error.findAll("button").map((button) => button.text());
    expect(buttons).toEqual(["Retry", "Open Health"]);
  });

  it("emits retry and open-health rather than acting on a sibling's state", () => {
    const wrapper = mountTree({
      loadState: "failed",
      rows: [],
      total: 0,
      returned: 0,
    });
    const buttons = wrapper
      .find("[data-defminer-source-tree-error]")
      .findAll("button");
    void buttons[0]?.trigger("click");
    void buttons[1]?.trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);
    expect(wrapper.emitted("open-health")).toHaveLength(1);
  });

  it("mounts no tree region at all in the error state", () => {
    const wrapper = mountTree({
      loadState: "failed",
      rows: [],
      total: 0,
      returned: 0,
    });
    expect(wrapper.find('[role="tree"]').exists()).toBe(false);
    expect(labels(wrapper)).toEqual([]);
  });
});

describe("source-tree / populated — the flattened list, virtualised at the fixed height", () => {
  const ROWS: readonly Row[] = [
    row(0, "src/a.js"),
    row(1, "src/b.js"),
    row(2, "lib/deep/c.js"),
  ];

  it("binds item-size to TABLE_ROW_HEIGHT_PX BY IDENTITY", () => {
    // By identity against the constant, never against a literal 32: a second
    // copy is how the scroller and the row come to disagree by four pixels and
    // the virtualised list drifts a row per screen.
    const wrapper = mountTree({ rows: ROWS });
    expect(itemSizeOf(wrapper)).toBe(TABLE_ROW_HEIGHT_PX);
  });

  it("renders the nodes in the map's own index order", () => {
    const wrapper = mountTree({ rows: ROWS });
    expect(labels(wrapper)).toEqual([
      "src",
      "a.js",
      "b.js",
      "lib",
      "deep",
      "c.js",
    ]);
  });

  it("indents at the 8px step, capped at eight levels", () => {
    const deep = row(
      0,
      Array.from({ length: 12 }, (_, index) => `d${String(index)}`).join("/"),
    );
    const wrapper = mountTree({ rows: [deep] });
    const rows = wrapper.findAll('[role="treeitem"]');
    expect(rows[0]?.classes()).toContain("pl-0");
    expect(rows[1]?.classes()).toContain("pl-2");
    expect(rows[8]?.classes()).toContain("pl-16");
    // Depth 9 and beyond hold the maximum indent. The NODE is still there, at
    // its real aria-level — only the leading whitespace stopped growing.
    expect(rows[9]?.classes()).toContain("pl-16");
    expect(rows[9]?.attributes("aria-level")).toBe("10");
    expect(rows.length).toBe(12);
  });

  it("makes every row a button with an accessible name and a tree role", () => {
    const wrapper = mountTree({ rows: ROWS });
    expect(wrapper.find('[role="tree"]').exists()).toBe(true);
    for (const treeitem of wrapper.findAll('[role="treeitem"]')) {
      expect(treeitem.element.tagName).toBe("BUTTON");
      expect(treeitem.text().length).toBeGreaterThan(0);
      expect(treeitem.attributes("aria-level")).toBeDefined();
    }
  });

  it("carries the expanded state on directory rows and not on leaves", () => {
    // The disclosure glyph is never the sole carrier: the row IS a button with
    // an expanded state whose accessible name is the directory's label.
    const wrapper = mountTree({ rows: ROWS });
    const rows = wrapper.findAll('[role="treeitem"]');
    expect(rows[0]?.attributes("aria-expanded")).toBe("true");
    expect(rows[1]?.attributes("aria-expanded")).toBeUndefined();
    expect(rows[0]?.text()).toContain("src");
  });

  it("uses a TEXT codepoint for the disclosure and mounts no icon", () => {
    const wrapper = mountTree({ rows: ROWS });
    expect(wrapper.text()).toContain("▾");
    expect(wrapper.html()).not.toContain("<svg");
    expect(wrapper.html()).not.toContain("<img");
    expect(wrapper.html()).not.toContain(' class="pi ');
  });

  it("collapses a directory out of the flattened list rather than hiding it", async () => {
    const wrapper = mountTree({ rows: ROWS });
    expect(labels(wrapper).length).toBe(6);
    await wrapper.findAll('[role="treeitem"]')[0]?.trigger("click");
    expect(labels(wrapper)).toEqual(["src", "lib", "deep", "c.js"]);
  });

  it("emits the SOURCES INDEX on a leaf, never the label", () => {
    // The label is never the identity. Every read that needs the real string
    // goes back to the stored row by index — including the viewer's.
    const wrapper = mountTree({ rows: ROWS });
    void wrapper.findAll('[role="treeitem"]')[2]?.trigger("click");
    expect(wrapper.emitted("select")).toEqual([[1]]);
  });
});

describe("source-tree / partial — a node is NEVER hidden because part of it is missing", () => {
  it("renders a clamped climb, a truncated label and a tombstone, all in position", () => {
    const clamped = row(0, "../../../../../../etc/defminer-escape.txt");
    const truncated = row(1, `dir/${"L".repeat(4096)}`);
    const tombstoned = row(2, "src/gone.js", "gone");
    const changed = row(3, "src/changed.js", "changed");
    const wrapper = mountTree({
      rows: [clamped, truncated, tombstoned, changed],
    });

    // ALL FOUR ROWS EXIST.
    expect(labels(wrapper)).toContain("etc");
    expect(labels(wrapper)).toContain("defminer-escape.txt");
    expect(labels(wrapper)).toContain("gone.js");
    expect(labels(wrapper)).toContain("changed.js");

    // AND EACH CARRIES ITS NOTE.
    const notes = wrapper
      .findAll("[data-defminer-source-tree-note]")
      .map((node) => node.text());
    expect(notes).toContain("path clamped");
    expect(notes).toContain("label truncated");

    const marks = wrapper
      .findAll("[data-defminer-source-producibility]")
      .map((node) => node.text());
    expect(marks).toEqual(["Gone", "Changed"]);
  });

  it("renders NOTHING for the producible member — the tree stays quiet", () => {
    const wrapper = mountTree({ rows: [row(0, "src/app.js")] });
    expect(wrapper.find("[data-defminer-source-producibility]").exists()).toBe(
      false,
    );
    // And no analysis-vocabulary word appears anywhere on this surface.
    for (const word of [
      "Queued",
      "Analysing",
      "Complete",
      "Partial",
      "Failed",
    ]) {
      expect(wrapper.text()).not.toContain(word);
    }
  });
});

// ---------------------------------------------------------------------------
// ZERO-ONE-MANY
// ---------------------------------------------------------------------------

describe("source-tree / zero-one-many — agreement, never a parenthesised plural", () => {
  it("agrees at 0, 1 and many, by exact string comparison", () => {
    const at = (total: number, rows: readonly Row[]): string =>
      mountTree({ rows, total, returned: rows.length })
        .find("[data-defminer-source-tree-count]")
        .text();

    expect(at(0, [])).toBe("0 recovered sources");
    expect(at(1, [row(0, "src/a.js")])).toBe("1 recovered source");
    expect(at(3412, [row(0, "src/a.js")])).toBe("3,412 recovered sources");
    expect(at(0, [])).not.toContain("(s)");
  });

  it("carries the index on duplicated sibling labels at one, two and many", () => {
    const wrapper = mountTree({
      rows: [
        row(0, "src/app.js"),
        row(1, "src/app.js"),
        row(2, "src/app.js"),
        row(3, "src/other.js"),
      ],
    });
    const suffixes = wrapper
      .findAll("[data-defminer-source-tree-duplicate]")
      .map((node) => node.text());
    expect(suffixes).toEqual(["· #0", "· #1", "· #2"]);
    // And a NON-duplicated label does not carry one — otherwise the index is
    // noise on every row and stops distinguishing anything.
    expect(suffixes.length).toBe(3);
    expect(labels(wrapper)).toContain("other.js");
  });

  it("states the bound in WORDS when the read stopped short, and not otherwise", () => {
    const short = mountTree({
      rows: [row(0, "src/a.js")],
      returned: 1,
      total: 9999,
      bound: 2000,
    });
    expect(short.find("[data-defminer-source-tree-bound]").text()).toBe(
      "Showing the first 2,000 of 9,999 recovered sources, in the order this map declares them.",
    );

    const whole = mountTree({ rows: [row(0, "src/a.js")] });
    expect(whole.find("[data-defminer-source-tree-bound]").exists()).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// THE VOCABULARY SEPARATION, AS FAR AS THIS SURFACE CAN CARRY IT
// ---------------------------------------------------------------------------

describe("SourceTree imports NEITHER shipped presentation map", () => {
  const specifiersOf = (): string[] => {
    const source = readFileSync(SOURCE_TREE_MODULE, "utf8");
    const script = /<script[^>]*>([\s\S]*?)<\/script>/.exec(source)?.[1] ?? "";
    const file = ts.createSourceFile(
      SOURCE_TREE_MODULE,
      script,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const out = new Set<string>();
    const visit = (node: ts.Node): void => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier !== undefined &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        out.add(node.moduleSpecifier.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    return [...out].sort();
  };

  it("has EXACTLY this module-specifier set", () => {
    // O-07's testable no-shared-subtree rule belongs to plan 07-09, where both
    // regions are on screen at once. This is the narrower half that is
    // available now, and it is an EQUALITY rather than a pair of absences: an
    // import added later fails it without anyone having to think of the
    // specifier it would have been written with.
    expect(specifiersOf()).toEqual([
      "../safety/display",
      "../sourcemap/tree",
      "./ProducibilityMark.vue",
      "./table-contract",
      "@defminer/engine/contract",
      "vue",
      "vue-virtual-scroller",
    ]);
  });

  it("parsed a NON-EMPTY script block — the non-vacuity half", () => {
    expect(specifiersOf().length).toBeGreaterThan(3);
    expect(readFileSync(SOURCE_TREE_MODULE, "utf8")).toContain(
      "buildSourceTree",
    );
  });
});

// ---------------------------------------------------------------------------
// THE HOSTILE LABELS, AT THE COMPONENT BOUNDARY
// ---------------------------------------------------------------------------
//
// The FULL backstop — every label case, the byte-identical round trip at the
// component boundary, and the absolutes over the whole rendered subtree —
// lives in `safety/hostile.spec.ts`, extended rather than forked. What is here
// is the smoke test that the component mounts over the measured corpus at all,
// so a failure that is really about the component fails in the component's own
// spec.

describe("SourceTree mounts over the measured hostile label corpus", () => {
  it("renders every case without a title attribute anywhere", () => {
    const rows = SOURCES_LABEL_CASES.map((labelCase, index) =>
      row(index, labelCase.value),
    );
    const wrapper = mountTree({ rows });
    const nodes = [wrapper.element, ...wrapper.element.querySelectorAll("*")];
    for (const node of nodes) {
      expect(node.hasAttribute?.("title") ?? false).toBe(false);
    }
    expect(labels(wrapper).length).toBeGreaterThanOrEqual(
      SOURCES_LABEL_CASES.length,
    );
  });

  it("keeps a bidi override out of every rendered label", () => {
    const rtl = SOURCES_LABEL_CASES.find(
      (labelCase) => labelCase.id === "unicode-rtl-override",
    );
    const wrapper = mountTree({ rows: [row(0, rtl?.value ?? "")] });
    for (const label of labels(wrapper)) {
      expect(label.includes("\u202E")).toBe(false);
    }
  });
});
