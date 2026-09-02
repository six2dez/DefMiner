// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// packages/frontend/src/components/SourceBrowser.spec.ts — the drill-down
// shell, and the ONE ARRANGEMENT in the product where both closed state
// vocabularies are on screen at once.
//
// ===========================================================================
// THE SCROLLER STUB, AND WHY IT IS A PASSTHROUGH
// ===========================================================================
// The measured reason `InventoryTable.spec.ts`, `SourceTree.spec.ts` and
// `SourceViewer.spec.ts` all record: mounted in jsdom the real scroller sizes
// its window from `getBoundingClientRect`, jsdom reports every box as 0x0
// because it has no layout engine, and the scroller correctly concludes that
// zero rows fit. A row assertion written against that renders nothing, finds
// nothing, and PASSES BY MEASURING AN EMPTY SET.
//
// TWO STUBS ARE MOUNTED AT ONCE HERE and that is the point of one assertion
// below: this is the first surface in the product with two virtualised lists,
// and they must be SIBLINGS. Nesting one inside the other gives the inner one a
// parent whose height it cannot measure.

import type {
  DeriveSourceResult,
  RecoveredSourcePage,
  RecoveredSourceRow,
  SourceMappingsResult,
} from "@defminer/engine/contract";
import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";

import type {
  RecoveredSourcesRequest,
  RpcResult,
  SourceRef,
} from "../api/client";

import SourceBrowser from "./SourceBrowser.vue";

// ---------------------------------------------------------------------------
// COPY THE COMPONENT DECLARES, RESTATED HERE AND ONLY HERE
// ---------------------------------------------------------------------------
// The component holds its copy as private constants, so the approved wording
// has to be asserted from the OUTSIDE — the shape `FindingsTable.spec.ts`
// already uses for the status vocabulary. A spec that imported the constants
// would pass unchanged the day somebody edited them.

const LEAVE_LABEL = "Back to artifacts";

const ARTIFACT_SHA = "a".repeat(64);
const MAP_SHA = "b".repeat(64);
const SOURCE_SHA = "c".repeat(64);

const PROJECT = "server-scoped";

// ---------------------------------------------------------------------------
// FIXTURES
// ---------------------------------------------------------------------------

function sourceRow(over: Partial<RecoveredSourceRow> = {}): RecoveredSourceRow {
  return {
    artifactSha256: ARTIFACT_SHA,
    mapSha256: MAP_SHA,
    sourceIndex: 0,
    sourcesVerbatim: "webpack:///./src/app.ts",
    sourceSha256: SOURCE_SHA,
    byteLen: 42,
    lineCount: 4,
    producibility: "producible",
    recoveredAt: 1_756_000_000_000,
    ...over,
  };
}

/** Two rows: one ordinary, one TOMBSTONED. The tombstone is what puts a
 *  producibility marker node in the tree at all — the common member renders
 *  nothing, which is requirement 4 doing its work. */
const ROWS: readonly RecoveredSourceRow[] = [
  sourceRow(),
  sourceRow({
    sourceIndex: 1,
    sourcesVerbatim: "webpack:///./src/secrets.ts",
    producibility: "gone",
  }),
];

const MULTI_LINE = "const a = 1;\nconst b = 2;\n\nexport { a, b };";

function contentArm(content: string): DeriveSourceResult {
  return {
    outcome: "content",
    content,
    byteLen: content.length,
    lineCount: content === "" ? 0 : content.split("\n").length,
    sha256: SOURCE_SHA,
  };
}

function page(rows: readonly RecoveredSourceRow[]): RecoveredSourcePage {
  return {
    rows,
    nextCursor: null,
    returned: rows.length,
    total: rows.length,
    bound: 2000,
    exhausted: true,
  };
}

function ok<T>(value: T): RpcResult<T> {
  return { ok: true, value };
}

type Fake = {
  listRecoveredSources: (
    request: RecoveredSourcesRequest,
  ) => Promise<RpcResult<RecoveredSourcePage>>;
  deriveSource: (request: SourceRef) => Promise<RpcResult<DeriveSourceResult>>;
  readSourceMappings: (
    request: SourceRef,
  ) => Promise<RpcResult<SourceMappingsResult>>;
  readonly listCalls: RecoveredSourcesRequest[];
  readonly deriveCalls: SourceRef[];
};

function fakeClient(
  options: {
    list?: RpcResult<RecoveredSourcePage>;
    derive?: RpcResult<DeriveSourceResult>;
  } = {},
): Fake {
  const listCalls: RecoveredSourcesRequest[] = [];
  const deriveCalls: SourceRef[] = [];
  return {
    listCalls,
    deriveCalls,
    listRecoveredSources: async (request) => {
      listCalls.push(request);
      return await Promise.resolve(options.list ?? ok(page(ROWS)));
    },
    deriveSource: async (request) => {
      deriveCalls.push(request);
      return await Promise.resolve(
        options.derive ?? ok(contentArm(MULTI_LINE)),
      );
    },
    readSourceMappings: () =>
      Promise.resolve(ok<SourceMappingsResult>({ outcome: "unavailable" })),
  };
}

// ---------------------------------------------------------------------------
// STUBS AND MOUNTS
// ---------------------------------------------------------------------------

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

/** Five microtask turns plus a macrotask: the eager page loop, the viewer's
 *  watcher, its RPC, and two renders. */
async function flush(wrapper: VueWrapper): Promise<void> {
  for (let turn = 0; turn < 6; turn += 1) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
}

async function mountBrowser(
  client: Fake,
  options: { analysisStoppedEarly?: boolean; canExport?: boolean } = {},
): Promise<VueWrapper> {
  const wrapper = mount(SourceBrowser, {
    props: {
      projectId: PROJECT,
      artifactSha256: ARTIFACT_SHA,
      client,
      analysisStoppedEarly: options.analysisStoppedEarly ?? false,
      canExport: options.canExport ?? false,
    },
    global: { stubs: { RecycleScroller: ScrollerStub } },
  });
  await flush(wrapper);
  return wrapper;
}

// ---------------------------------------------------------------------------
// QUERIES
// ---------------------------------------------------------------------------

const all = (root: Element, selector: string): Element[] => [
  ...root.querySelectorAll(selector),
];

const one = (root: Element, selector: string): Element => {
  const found = root.querySelector(selector);
  expect(found).not.toBeNull();
  return found as Element;
};

const treeRows = (wrapper: VueWrapper): Element[] =>
  all(wrapper.element as Element, '[role="treeitem"]');

/**
 * The SOURCE rows of the tree, as opposed to its directory rows.
 *
 * A leaf is what carries a `sourcesIndex` the viewer can produce; a directory
 * row TOGGLES and selects nothing, which is `SourceTree.vue`'s own `activate`.
 * Distinguished by `aria-expanded`, which that component binds to `undefined`
 * for a node with no children — so this is the rendered accessibility fact,
 * not an index a fixture change would invalidate.
 */
const leafRows = (wrapper: VueWrapper): Element[] =>
  treeRows(wrapper).filter(
    (row) => row.hasAttribute("aria-expanded") === false,
  );

// ---------------------------------------------------------------------------
// THE TRACER: TWO CLICKS FROM THE ARTIFACTS TABLE TO ONE FILE ON SCREEN
// ---------------------------------------------------------------------------

describe("source-browser — the drill-down shell, end to end", () => {
  it("mounts the REAL tree and the REAL viewer, never a stub or a placeholder", async () => {
    const wrapper = await mountBrowser(fakeClient());

    expect(
      wrapper.element.querySelectorAll("[data-defminer-source-tree]"),
    ).toHaveLength(1);
    expect(
      wrapper.element.querySelectorAll("[data-defminer-source-viewer]"),
    ).toHaveLength(1);
    // The viewer's own idle line, from plan 07-08's component. Nothing is
    // selected yet, so nothing has been derived.
    expect(
      wrapper.element.querySelector("[data-defminer-source-viewer-idle]"),
    ).not.toBeNull();
  });

  it("reads the source list EAGERLY on entry, scoped to the parent artifact", async () => {
    const client = fakeClient();
    await mountBrowser(client);

    expect(client.listCalls).toEqual([
      { projectId: PROJECT, artifactSha256: ARTIFACT_SHA, cursor: null },
    ]);
  });

  it("renders the recovered file's lines when a tree node is selected", async () => {
    const client = fakeClient();
    const wrapper = await mountBrowser(client);

    const rows = leafRows(wrapper);
    expect(rows.length).toBeGreaterThan(0);
    await (rows[0] as HTMLElement).click();
    await flush(wrapper);

    // THE TRACER'S PROOF: one row per newline-separated line, produced through
    // the real viewer against the real derivation result.
    expect(
      wrapper.element.querySelectorAll("[data-defminer-source-code]"),
    ).toHaveLength(MULTI_LINE.split("\n").length);

    // The sighting the viewer asked for is the one the tree node names — and
    // it names it by INDEX, never by label.
    expect(client.deriveCalls).toEqual([
      { projectId: PROJECT, mapSha256: MAP_SHA, sourceIndex: 0 },
    ]);
  });

  it("mounts the two scrollers as SIBLINGS — neither is a descendant of the other", async () => {
    const client = fakeClient();
    const wrapper = await mountBrowser(client);
    await (leafRows(wrapper)[0] as HTMLElement).click();
    await flush(wrapper);

    const scrollers = all(wrapper.element as Element, ".scroller-stub");
    expect(scrollers.length).toBe(2);
    for (const a of scrollers) {
      for (const b of scrollers) {
        if (a === b) continue;
        expect(a.contains(b)).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// LEAVING — AN OPERATOR IS NEVER TRAPPED
// ---------------------------------------------------------------------------

describe("drilldown-header — leaving", () => {
  it("emits leave from the Back to artifacts button", async () => {
    const wrapper = await mountBrowser(fakeClient());
    await (
      one(
        wrapper.element as Element,
        "[data-defminer-drilldown-leave]",
      ) as HTMLElement
    ).click();
    expect(wrapper.emitted("leave")).toHaveLength(1);
  });

  it("emits leave on Escape from ANYWHERE inside the drill-down", async () => {
    const wrapper = await mountBrowser(fakeClient());

    // Dispatched on a DEEP descendant — a tree row — rather than on the root,
    // because "from anywhere" is the claim and a handler bound to the root
    // element only would not catch it if the keydown did not bubble.
    const row = leafRows(wrapper)[0] as HTMLElement;
    row.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("leave")).toHaveLength(1);
  });
});
