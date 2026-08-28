// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// REWRITTEN BY PLAN 05-09. The assertions below used to drive the tracer's
// single `getArtifacts` endpoint and its inline row rendering. Both are gone —
// App.vue now mounts the real tables over the keyset stores — so the stub is the
// client's declared SDK surface (`DefMinerBackendSdk`) and the row assertions
// live where the rows are rendered. What is UNCHANGED is every claim this file
// was making: the strip renders on first paint without counts, a tab is never
// removed on error, the failure surfaces in the body, and no rejection text
// reaches the page.

import type {
  InvalidationSummary,
  PageRequest,
  PageResponse,
  VisibleTotal,
} from "@defminer/engine/contract";
import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";

import type { DefMinerBackendSdk, ObservationRow } from "./api/client";
import { FRONTEND_CONTRACT_VERSION } from "./api/client";
import App from "./App.vue";
import type { ArtifactRow } from "./backend";
import { SDK_INJECTION_KEY } from "./backend";

/**
 * Two rows with DELIBERATELY LOOKALIKE digests.
 *
 * `…0O0O…` against `…O0O0…` is the exact confusion the mandatory `font-mono`
 * rule exists to prevent. They are also distinct strings, so an assertion that
 * both are rendered cannot be satisfied by rendering one of them twice.
 */
const ROWS: ArtifactRow[] = [
  {
    project_id: "p1",
    sha256: "a1b2c30O0O4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7",
    byte_len: 4096,
    kind: "script",
    first_seen_at: 1_756_000_000_000,
    last_seen_at: 1_756_000_500_000,
    seen_count: 3,
  },
  {
    project_id: "p1",
    sha256: "a1b2c3O0O04d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7",
    byte_len: 128,
    kind: "inline",
    first_seen_at: 1_756_000_100_000,
    last_seen_at: 1_756_000_600_000,
    seen_count: 1,
  },
];

const TAB_LABELS = ["Artifacts", "Observations", "Health", "Settings"];

const TOTAL: VisibleTotal = {
  visible: 2,
  hiddenBySuppression: 0,
  suppressionRuleCount: 0,
};

/** The passthrough that stands in for `RecycleScroller` — see
 *  InventoryTable.spec.ts's header for why the real one renders nothing here. */
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

type StubOptions = {
  readonly artifacts?: readonly ArtifactRow[];
  /** Reject every paged read — the RPC failure path. */
  readonly reject?: boolean;
};

/**
 * A LITERAL stub of `DefMinerBackendSdk`, never a cast.
 *
 * The client declares the structural slice of the SDK it touches (P5-D41), and
 * a stub that has to be cast is a stub that stops failing when that surface
 * changes.
 */
function stubSdk(options: StubOptions = {}): DefMinerBackendSdk {
  const rows = options.artifacts ?? [];
  const page = <TRow>(items: readonly TRow[]): Promise<PageResponse<TRow>> =>
    options.reject === true
      ? Promise.reject(new Error("backend exploded"))
      : Promise.resolve({
          rows: items,
          nextCursor: null,
          scanned: items.length,
          exhausted: true,
        });

  return {
    backend: {
      getContractVersion: () => Promise.resolve(FRONTEND_CONTRACT_VERSION),
      listArtifactsPage: (_request: PageRequest) => page(rows),
      listObservationsPage: (_request: PageRequest) => page<ObservationRow>([]),
      countInventory: () =>
        options.reject === true
          ? Promise.reject(new Error("backend exploded"))
          : Promise.resolve(TOTAL),
      onEvent: (
        _event: "defminer:invalidated",
        _callback: (summary: InvalidationSummary) => void,
      ) => ({ stop: () => undefined }),
    },
  };
}

function mountWith(sdk: DefMinerBackendSdk | undefined): VueWrapper {
  return mount(App, {
    global: {
      provide: { [SDK_INJECTION_KEY]: sdk },
      stubs: { RecycleScroller: ScrollerStub },
    },
  });
}

async function settle(wrapper: VueWrapper): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
}

describe("App", () => {
  it("renders every tab label on first paint, before any query resolves", () => {
    // Synchronously, with no `flushPromises` and no `await` anywhere above. If
    // the tab strip waited on the query — the defect this asserts against —
    // nothing below would be on screen, and the operator would be looking at an
    // empty page while the backend chews through a large bundle.
    const wrapper = mountWith(stubSdk());

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(TAB_LABELS.length);
    expect(tabs.map((t) => t.text())).toEqual(TAB_LABELS);

    // And NO count on any of them. A count that is still resolving must render
    // as ABSENT, never as `0` — a zero reads as "nothing found here" and stops
    // the operator opening the one tab that had the finding.
    for (const tab of tabs) {
      expect(tab.text()).not.toMatch(/\d/);
    }
  });

  it("renders both artifact rows as text once the page resolves", async () => {
    const wrapper = mountWith(stubSdk({ artifacts: ROWS }));
    await settle(wrapper);

    const text = wrapper.text();
    for (const row of ROWS) {
      expect(text).toContain(row.sha256);
    }
    expect(text).toContain("4096");
    expect(text).toContain("script");
    expect(text).toContain("inline");
  });

  it("renders every target-derived digest in font-mono", async () => {
    const wrapper = mountWith(stubSdk({ artifacts: ROWS }));
    await settle(wrapper);

    for (const row of ROWS) {
      // SOME element holding this exact text carries `font-mono`. Not the
      // outermost: the grid cell is layout and the text lives one level in,
      // inside HighlightSlices' own `font-mono` span. Asserting on the
      // outermost would be asserting where the class is, which is a fact about
      // this component's markup rather than about what the operator sees.
      const holders = wrapper
        .findAll("span")
        .filter((span) => span.text() === row.sha256);
      expect(holders.length).toBeGreaterThan(0);
      expect(
        holders.some((span) => span.classes().includes("font-mono")),
        `no font-mono element holds ${row.sha256}`,
      ).toBe(true);
    }
  });

  it("keeps every tab rendered and routable when the query fails", async () => {
    const wrapper = mountWith(stubSdk({ reject: true }));
    await settle(wrapper);

    // A tab is NEVER removed on error. The failure belongs in the body region.
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.map((t) => t.text())).toEqual(TAB_LABELS);

    expect(wrapper.text()).toContain("Could not load secrets");
    expect(wrapper.text()).toContain("blocks its single thread");

    // And the rejection's own message is NOT rendered. An error crossing the
    // RPC boundary can quote target-controlled bytes, and no sentence on this
    // page ever interpolates one.
    expect(wrapper.text()).not.toContain("backend exploded");
  });

  it("still routes to another tab after the query fails", async () => {
    const wrapper = mountWith(stubSdk({ reject: true }));
    await settle(wrapper);

    const health = wrapper
      .findAll('[role="tab"]')
      .find((t) => t.text() === "Health");
    expect(health).toBeDefined();
    await health!.trigger("click");

    expect(health!.attributes("aria-selected")).toBe("true");
    expect(wrapper.text()).toContain("Nothing analysed on this target yet");
  });

  it("routes to Health when the table's Open Health action is used", async () => {
    // The TABLE asks and the PAGE moves. A table that switched tabs itself
    // would be a component writing to a sibling's state.
    const wrapper = mountWith(stubSdk({ reject: true }));
    await settle(wrapper);

    const action = wrapper
      .findAll("button")
      .find((b) => b.text() === "Open Health");
    expect(action).toBeDefined();
    await action!.trigger("click");

    const health = wrapper
      .findAll('[role="tab"]')
      .find((t) => t.text() === "Health");
    expect(health!.attributes("aria-selected")).toBe("true");
  });

  it("renders the empty state when the backend answers an empty page", async () => {
    const wrapper = mountWith(stubSdk({ artifacts: [] }));
    await settle(wrapper);

    expect(wrapper.findAll('[role="tab"]')).toHaveLength(TAB_LABELS.length);
    expect(wrapper.text()).toContain("Nothing analysed on this target yet");
  });

  it("renders the ERROR state, not the empty one, when no SDK was provided", async () => {
    // A page mounted without a provider is not a page with nothing on it. An
    // empty state there would tell the operator the target is clean when in
    // fact nothing was asked.
    const wrapper = mountWith(undefined);
    await settle(wrapper);

    expect(wrapper.findAll('[role="tab"]')).toHaveLength(TAB_LABELS.length);
    expect(wrapper.text()).toContain("Could not load secrets");
    expect(wrapper.text()).not.toContain("Nothing analysed on this target yet");
  });

  it("wraps the tab strip instead of scrolling it or hiding tabs behind a menu", () => {
    const wrapper = mountWith(stubSdk());
    const nav = wrapper.find("nav");

    expect(nav.classes()).toContain("flex-wrap");
    // A horizontal scroll container or an overflow menu both hide a tab behind
    // an interaction, and a hidden tab is a finding the operator never opens.
    expect(nav.classes()).not.toContain("overflow-x-auto");
    expect(nav.classes()).not.toContain("overflow-x-scroll");
  });

  it("marks exactly one tab active, with the accent token", () => {
    const wrapper = mountWith(stubSdk());
    const tabs = wrapper.findAll('[role="tab"]');

    const active = tabs.filter((t) => t.attributes("aria-selected") === "true");
    expect(active).toHaveLength(1);
    expect(active[0].text()).toBe("Artifacts");
    expect(active[0].classes()).toContain("text-primary-500");

    // Accent is reserved. Every other tab is surface-toned.
    for (const tab of tabs.filter(
      (t) => t.attributes("aria-selected") !== "true",
    )) {
      expect(tab.classes()).not.toContain("text-primary-500");
      expect(tab.classes()).toContain("text-surface-400");
    }
  });

  it("renders no markup from row data — every cell is text", async () => {
    const hostile: ArtifactRow[] = [
      {
        ...ROWS[0],
        sha256: "<img src=x onerror=alert(1)>",
        kind: "<script>alert(2)</script>",
      },
    ];
    const wrapper = mountWith(stubSdk({ artifacts: hostile }));
    await settle(wrapper);

    // The bytes are VISIBLE as text…
    expect(wrapper.text()).toContain("<img src=x onerror=alert(1)>");
    // …and inert as markup. No element was created from them.
    expect(wrapper.find("img").exists()).toBe(false);
    expect(wrapper.element.querySelector("script")).toBeNull();
  });
});
