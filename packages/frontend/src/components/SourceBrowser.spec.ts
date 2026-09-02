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
//
// ===========================================================================
// O-07 MECHANISM 5's REPLACEMENT, REQUIREMENTS 1 AND 2, LIVE IN THIS FILE
// ===========================================================================
// The Phase 5/6 rule is that no surface renders both closed state vocabularies.
// The drill-down renders the parent artifact's ANALYSIS STATE and each
// recovered source's PRODUCIBILITY in the same view, and there is no
// arrangement of D-21's drill-down in which that is false — and there should
// not be, because the analysis state is the context that explains an empty
// source list. So the mechanism is REPLACED, not exempted, by four binding
// requirements. Requirement 3 (a SENTENCE rather than a badge for the degraded
// case) is a property of the viewer body and is asserted in
// SourceViewer.spec.ts; requirement 4 (NOTHING AT ALL for the common case)
// follows from `source-producibility-presentation.ts`. Requirements 1 and 2
// need BOTH REGIONS RENDERED AT ONCE and can only be asserted here.
//
// The harness below is the split body's real shape with the real components in
// it: the drill-down in the left region, `EvidencePanel.vue` in the right one
// at its shipped width. `App.spec.ts` asserts the same invariant over the real
// page; this file asserts it where the fixtures can be driven into the state
// where the two vocabularies are CLOSEST TOGETHER — a tombstoned source
// selected under an artifact whose analysis is `partial`.

import type {
  DeriveSourceResult,
  RecoveredSourcePage,
  RecoveredSourceRow,
  SourceMappingsResult,
} from "@defminer/engine/contract";
import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";

import type {
  PanelAnalysis,
  RecoveredSourcesRequest,
  RpcResult,
  SourceRef,
} from "../api/client";

import EvidencePanel from "./EvidencePanel.vue";
import { NOTHING_TO_EXPORT_LABEL } from "./export-contract";
import { SCAN_LIFECYCLE_PRESENTATION } from "./scan-lifecycle-presentation";
import { SCAN_STATE_PRESENTATION } from "./scan-state-presentation";
import { SOURCE_PRODUCIBILITY_PRESENTATION } from "./source-producibility-presentation";
import SourceBrowser from "./SourceBrowser.vue";

// ---------------------------------------------------------------------------
// COPY THE COMPONENT DECLARES, RESTATED HERE AND ONLY HERE
// ---------------------------------------------------------------------------
// The component holds its copy as private constants, so the approved wording
// has to be asserted from the OUTSIDE — the shape `FindingsTable.spec.ts`
// already uses for the status vocabulary. A spec that imported the constants
// would pass unchanged the day somebody edited them.

const LEAVE_LABEL = "Back to artifacts";
const EXPORT_MANIFEST_LABEL = "Export source manifest";
const EXPORT_PENDING_LABEL =
  "Export source manifest — counting the recovered sources";

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

const rejected = <T>(): RpcResult<T> => ({
  ok: false,
  reason: "rpc-rejected",
  versions: null,
});

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
  options: { analysisStoppedEarly?: boolean } = {},
): Promise<VueWrapper> {
  const wrapper = mount(SourceBrowser, {
    props: {
      projectId: PROJECT,
      artifactSha256: ARTIFACT_SHA,
      client,
      analysisStoppedEarly: options.analysisStoppedEarly ?? false,
    },
    global: { stubs: { RecycleScroller: ScrollerStub } },
  });
  await flush(wrapper);
  return wrapper;
}

/**
 * The SPLIT BODY, with the real drill-down in the left region and the real
 * evidence panel in the right one at its shipped width.
 *
 * A harness rather than the whole page, because the two vocabularies must be
 * driven into the state where they are CLOSEST TOGETHER — a `partial` analysis
 * beside a tombstoned source — and a page-level mount cannot supply the second
 * without also supplying twenty endpoints it never reaches. `App.spec.ts`
 * asserts the same invariant over the real page in its own default state, so
 * neither reading rests on the other.
 */
const SplitBody = defineComponent({
  name: "SplitBody",
  props: {
    client: { type: Object, required: true },
    analysis: { type: Object, required: true },
  },
  setup(props) {
    return () =>
      h("div", { class: "flex min-h-0 flex-1 gap-4 p-4" }, [
        h("section", { class: "flex min-w-0 flex-1 flex-col" }, [
          h(SourceBrowser, {
            projectId: PROJECT,
            artifactSha256: ARTIFACT_SHA,
            client: props.client,
            analysisStoppedEarly: true,
          }),
        ]),
        h("div", { class: "w-1/3 shrink-0" }, [
          h(EvidencePanel, {
            projectId: PROJECT,
            selectedSha256: ARTIFACT_SHA,
            analysis: props.analysis,
            loading: false,
            failed: false,
            evidence: null,
            sourceRequestId: null,
            retry: () =>
              Promise.resolve({
                ok: false as const,
                reason: "rpc-rejected" as const,
                versions: null,
              }),
          }),
        ]),
      ]);
  },
});

const PARTIAL_ANALYSIS: PanelAnalysis = {
  sha256: ARTIFACT_SHA,
  detectorSetHash: "d".repeat(64),
  scanState: "partial",
  bytesWalked: 512,
  byteLen: 4096,
  startedAt: 1_756_000_000_000,
  finishedAt: 1_756_000_100_000,
};

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

const header = (wrapper: VueWrapper): Element =>
  one(wrapper.element as Element, "[data-defminer-drilldown-header]");

const exportButton = (wrapper: VueWrapper): HTMLButtonElement =>
  one(
    wrapper.element as Element,
    "[data-defminer-drilldown-export]",
  ) as HTMLButtonElement;

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
    //
    // `artifactSha256` IS THE COMPONENT'S OWN PROP AND NOT A ROW FIELD (plan
    // 07-11, finding W-3). The ref names one sighting by its full key, so the
    // bundle on it must be the bundle whose drill-down this is; a row supplying
    // it would let a row disagree with the tree it is displayed inside.
    expect(client.deriveCalls).toEqual([
      {
        projectId: PROJECT,
        artifactSha256: ARTIFACT_SHA,
        mapSha256: MAP_SHA,
        sourceIndex: 0,
      },
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

// ---------------------------------------------------------------------------
// THE HEADER'S FOUR STATES
// ---------------------------------------------------------------------------

describe("drilldown-header / loading — it renders on ENTRY, before any read", () => {
  it("carries the leave action and the digest synchronously, with no await", () => {
    // NO `flush` ANYWHERE ABOVE. Both values are available from the selection,
    // so a header that waited on the backend would leave the operator looking
    // at nothing while a large bundle's source list is read.
    const wrapper = mount(SourceBrowser, {
      props: {
        projectId: PROJECT,
        artifactSha256: ARTIFACT_SHA,
        client: fakeClient(),
        analysisStoppedEarly: false,
      },
      global: { stubs: { RecycleScroller: ScrollerStub } },
    });

    const strip = header(wrapper);
    expect(
      one(strip, "[data-defminer-drilldown-leave]").textContent?.trim(),
    ).toBe(LEAVE_LABEL);
    expect(
      one(strip, "[data-defminer-drilldown-digest]").textContent?.trim(),
    ).toBe(ARTIFACT_SHA);
  });

  it("disables the export action with its reason AS ITS OWN TEXT, not a tooltip", () => {
    const wrapper = mount(SourceBrowser, {
      props: {
        projectId: PROJECT,
        artifactSha256: ARTIFACT_SHA,
        client: fakeClient(),
        analysisStoppedEarly: false,
      },
      global: { stubs: { RecycleScroller: ScrollerStub } },
    });

    const button = exportButton(wrapper);
    expect(button.disabled).toBe(true);
    // The shipped `NOTHING_TO_EXPORT_LABEL` rule: a disabled control states its
    // own reason ON THE BUTTON. A tooltip is not reachable by keyboard and is
    // not read aloud.
    expect(button.textContent?.trim()).toBe(EXPORT_PENDING_LABEL);
    expect(button.getAttribute("title")).toBeNull();
    expect(button.getAttribute("aria-describedby")).toBeNull();
  });

  it("mounts no spinner and no skeleton in the header", () => {
    const wrapper = mount(SourceBrowser, {
      props: {
        projectId: PROJECT,
        artifactSha256: ARTIFACT_SHA,
        client: fakeClient(),
        analysisStoppedEarly: false,
      },
      global: { stubs: { RecycleScroller: ScrollerStub } },
    });
    const strip = header(wrapper);
    expect(
      all(
        strip,
        '[role="progressbar"], [role="status"], [data-defminer-skeleton-row], progress',
      ),
    ).toEqual([]);
  });

  it("states the SHIPPED nothing-to-export reason once a resolved ZERO is known", async () => {
    const wrapper = await mountBrowser(fakeClient({ list: ok(page([])) }));
    const button = exportButton(wrapper);
    expect(button.disabled).toBe(true);
    // A count that resolved to zero and a count nobody has taken yet are
    // different facts here too, and they state different reasons.
    expect(button.textContent?.trim()).toBe(NOTHING_TO_EXPORT_LABEL);
  });

  it("names the CTA and ENABLES it once rows ARE known", async () => {
    // PLAN 07-10 CLOSED THE WIRING GAP plan 07-09 declared (ledger entry 117).
    // Until this landed the control carried a third label — "… not available in
    // this build" — and that constant is DELETED rather than repurposed: a
    // transitional string kept past its transition is a stub with a new job.
    const wrapper = await mountBrowser(fakeClient());
    const button = exportButton(wrapper);
    expect(button.disabled).toBe(false);
    expect(button.textContent?.trim()).toBe(EXPORT_MANIFEST_LABEL);
  });

  it("emits export-manifest WITH THE COUNT, and only once rows are known", async () => {
    // THE COUNT RIDES THE EVENT so the dialog's zero-row rule reads the number
    // this button was enabled against, not a second count that could disagree
    // with it. `ROWS` is the two-row fixture.
    const wrapper = await mountBrowser(fakeClient());
    exportButton(wrapper).click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("export-manifest")).toEqual([[ROWS.length]]);
  });

  it("emits NOTHING from a resolved zero — the guard is at the handler too", async () => {
    // The `disabled` attribute is what the operator sees; the handler's own
    // guard is what holds when anything else calls in. Asserted by calling the
    // click path directly, which a disabled attribute does not stop in jsdom.
    const wrapper = await mountBrowser(fakeClient({ list: ok(page([])) }));
    exportButton(wrapper).click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("export-manifest")).toBeUndefined();
  });
});

describe("drilldown-header / error — the header SURVIVES a failed read", () => {
  it("keeps the leave action, and it still works", async () => {
    const wrapper = await mountBrowser(
      fakeClient({ list: rejected<RecoveredSourcePage>() }),
    );

    const leave = one(
      wrapper.element as Element,
      "[data-defminer-drilldown-leave]",
    ) as HTMLElement;
    expect(leave.textContent?.trim()).toBe(LEAVE_LABEL);
    await leave.click();
    expect(wrapper.emitted("leave")).toHaveLength(1);

    // And the digest is still there — the header is not partially removed.
    expect(
      one(
        wrapper.element as Element,
        "[data-defminer-drilldown-digest]",
      ).textContent?.trim(),
    ).toBe(ARTIFACT_SHA);
  });

  it("surfaces the failure in the TREE COLUMN, not in the header", async () => {
    const wrapper = await mountBrowser(
      fakeClient({ list: rejected<RecoveredSourcePage>() }),
    );

    // The tree column is where there is room to say it, and it says it with
    // both actions. The header holds three elements and no error text.
    const error = one(
      wrapper.element as Element,
      "[data-defminer-source-tree-error]",
    );
    expect(error.textContent ?? "").toContain("Could not load");
    expect(header(wrapper).textContent ?? "").not.toContain("Could not load");
  });

  it("re-reads the source list when the tree column's Retry is pressed", async () => {
    const client = fakeClient({ list: rejected<RecoveredSourcePage>() });
    const wrapper = await mountBrowser(client);
    expect(client.listCalls).toHaveLength(1);

    const retry = [
      ...one(
        wrapper.element as Element,
        "[data-defminer-source-tree-error]",
      ).querySelectorAll("button"),
    ].find((button) => button.textContent?.trim() === "Retry");
    expect(retry).toBeDefined();
    await (retry as HTMLElement).click();
    await flush(wrapper);

    expect(client.listCalls).toHaveLength(2);
  });
});

describe("drilldown-header / overflow — fixed height, no wrap, no scroll", () => {
  it("holds three elements at the shipped separation on one clipped line", async () => {
    const wrapper = await mountBrowser(fakeClient());
    const strip = header(wrapper);
    const className = strip.getAttribute("class") ?? "";

    expect(className).toContain("h-12");
    expect(className).toContain("whitespace-pre");
    expect(className).toContain("overflow-hidden");
    expect(className).not.toContain("flex-wrap");
    expect(className).not.toContain("overflow-auto");
    expect(className).not.toContain("overflow-y");

    // Three direct children: a text button, a fixed-length digest, a text
    // button — at the `md` step of the shipped spacing scale.
    expect(strip.children).toHaveLength(3);
    expect(strip.children[1]?.getAttribute("class")).toContain("ml-4");
    expect(strip.children[2]?.getAttribute("class")).toContain("ml-4");
  });
});

describe("drilldown-header / long-text — a property of the SHAPE", () => {
  it("renders only the hex digest and DefMiner-authored copy, asserted as a SET", async () => {
    // NO TARGET-CONTROLLED STRING REACHES THIS STRIP, and it is closed by
    // construction rather than by anyone's discipline: the strip has exactly
    // three text nodes, and the total output space over any fixture is the
    // digest pattern plus two copy constants. The fixture below carries a
    // hostile `sources` label, so a leak would have somewhere to come from.
    const client = fakeClient({
      list: ok(
        page([
          sourceRow({
            sourcesVerbatim:
              "../../".repeat(40) + "‮evil\u0000<script>alert(1)</script>",
          }),
        ]),
      ),
    });
    const wrapper = await mountBrowser(client);
    const strip = header(wrapper);

    const texts = new Set<string>();
    const walker = (node: Node): void => {
      if (node.nodeType === 3) {
        const text = (node.nodeValue ?? "").trim();
        if (text.length > 0) texts.add(text);
        return;
      }
      for (const child of node.childNodes) walker(child);
    };
    walker(strip);

    expect([...texts].sort()).toEqual(
      [ARTIFACT_SHA, LEAVE_LABEL, EXPORT_MANIFEST_LABEL].sort(),
    );
    // And the digest half of that set really is a fixed-length hex string.
    expect(ARTIFACT_SHA).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// O-07 MECHANISM 5's REPLACEMENT — REQUIREMENTS 1 AND 2
// ---------------------------------------------------------------------------

/** Every operator-facing word from BOTH shipped analysis vocabularies. */
const ANALYSIS_LABELS: readonly string[] = [
  ...Object.values(SCAN_STATE_PRESENTATION).map((p) => p.label),
  ...Object.values(SCAN_LIFECYCLE_PRESENTATION).map((p) => p.label),
];

/** The producibility words that are rendered at all — the common member's is
 *  `null`, which is requirement 4. */
const PRODUCIBILITY_LABELS: readonly string[] = Object.values(
  SOURCE_PRODUCIBILITY_PRESENTATION,
)
  .map((p) => p.label)
  .filter((label): label is string => label !== null);

/**
 * Nodes carrying the ANALYSIS vocabulary, in either of its two rendered forms.
 *
 * BOTH FORMS, BECAUSE THE RULE NAMES BOTH: "no DOM subtree containing a
 * `data-defminer-status-badge` node, OR ANY STRING FROM `SCAN_STATE_PRESENTATION`
 * / `SCAN_LIFECYCLE_PRESENTATION`". The badge marker is how the artifacts table
 * renders it at level 1; the bare label string is how `EvidencePanel.vue`
 * renders it, and it renders it that way deliberately — the panel asserts over
 * its own subtree that no node inside it carries a `data-`prefixed attribute,
 * which is why it cannot reuse `StatusBadge`.
 */
function analysisNodes(root: Element): Element[] {
  const found = new Set<Element>(all(root, "[data-defminer-status-badge]"));
  for (const element of [root, ...all(root, "*")]) {
    const own = [...element.childNodes]
      .filter((node) => node.nodeType === 3)
      .map((node) => (node.nodeValue ?? "").trim())
      .join("");
    if (own.length > 0 && ANALYSIS_LABELS.includes(own)) found.add(element);
  }
  return [...found];
}

const producibilityNodes = (root: Element): Element[] =>
  all(root, "[data-defminer-source-producibility]");

/** A node and every element above it, nearest first. */
function ancestorChain(node: Element): Element[] {
  const chain: Element[] = [node];
  let current = node.parentElement;
  while (current !== null) {
    chain.push(current);
    current = current.parentElement;
  }
  return chain;
}

/**
 * The nearest ancestor two nodes share.
 *
 * Two nodes of one mounted tree always share the container, so this is asserted
 * to exist rather than typed as nullable — the interesting question is never
 * WHETHER they meet, it is WHERE.
 */
function nearestCommonAncestor(a: Element, b: Element): Element {
  const chain = new Set<Element>(ancestorChain(a));
  const meeting = ancestorChain(b).find((node) => chain.has(node));
  expect(meeting).toBeDefined();
  return meeting as Element;
}

/**
 * The closest-together arrangement, mounted once per test.
 *
 * A `partial` analysis in the evidence panel — the ANALYSIS vocabulary at its
 * most alarming — beside a TOMBSTONED source selected in the drill-down — the
 * PRODUCIBILITY vocabulary at its most alarming. This is the state that would
 * fail if the separation were only editorial.
 */
async function mountClosestTogether(): Promise<VueWrapper> {
  const wrapper = mount(SplitBody, {
    props: { client: fakeClient(), analysis: PARTIAL_ANALYSIS },
    global: { stubs: { RecycleScroller: ScrollerStub } },
  });
  await flush(wrapper);

  // Select the TOMBSTONED node — the second row.
  const rows = all(wrapper.element as Element, '[role="treeitem"]');
  const tombstoned = rows.find((row) =>
    PRODUCIBILITY_LABELS.some((label) =>
      String(row.textContent ?? "").includes(label),
    ),
  );
  expect(tombstoned).toBeDefined();
  await (tombstoned as HTMLElement).click();
  await flush(wrapper);
  return wrapper;
}

// THE RULE WAS DEMONSTRATED RED BEFORE IT WAS ASSERTED GREEN. A single
// `<span>Partial</span>` added to the drill-down header — one analysis-state
// word, in the region that must carry none — took SEVEN tests down across this
// file and App.spec.ts: requirement 1 in both, requirement 2's converse, the
// page-split assertion, and the header's own three-element and text-set
// absolutes. The edit was reverted and `git diff` over the component is clean.
describe("O-07 mechanism 5's replacement — the two vocabularies, proven apart", () => {
  it("searches for LABEL SETS THAT ARE NOT EMPTY — the non-vacuity check", () => {
    // A search over an empty set finds nothing and passes for the wrong reason.
    expect(ANALYSIS_LABELS.length).toBeGreaterThan(0);
    expect(PRODUCIBILITY_LABELS.length).toBeGreaterThan(0);
    for (const label of [...ANALYSIS_LABELS, ...PRODUCIBILITY_LABELS]) {
      expect(label.length).toBeGreaterThan(0);
    }
    // And the two vocabularies really are disjoint word sets (mechanism 3), so
    // the searches below cannot alias onto each other.
    for (const word of PRODUCIBILITY_LABELS) {
      expect(ANALYSIS_LABELS).not.toContain(word);
    }
  });

  it("renders BOTH vocabularies at once — the arrangement is real, not hypothetical", async () => {
    const wrapper = await mountClosestTogether();
    const root = wrapper.element as Element;

    // NON-VACUITY, and it is the load-bearing half of this whole file: the two
    // absence assertions below mean nothing unless both vocabularies are
    // genuinely on screen in this arrangement.
    expect(analysisNodes(root).length).toBeGreaterThan(0);
    expect(producibilityNodes(root).length).toBeGreaterThan(0);
  });

  it("requirement 1 — NO Phase 7 surface renders an analysis-state word", async () => {
    const wrapper = await mountClosestTogether();
    const drilldown = one(
      wrapper.element as Element,
      "[data-defminer-source-browser]",
    );

    const text = drilldown.textContent ?? "";
    expect(text.length).toBeGreaterThan(0);
    for (const label of ANALYSIS_LABELS) {
      expect(text).not.toContain(label);
    }
    // And not as a marker node either — a badge that rendered no text would
    // slip past a text search.
    expect(analysisNodes(drilldown)).toEqual([]);
  });

  it("requirement 2 — no analysis subtree contains a producibility node", async () => {
    const wrapper = await mountClosestTogether();
    const root = wrapper.element as Element;

    const offenders: string[] = [];
    for (const node of analysisNodes(root)) {
      for (const mark of producibilityNodes(node)) {
        offenders.push(`${String(node.tagName)} > ${String(mark.tagName)}`);
      }
    }
    expect(offenders).toEqual([]);

    // The whole evidence-panel region, which is where the analysis vocabulary
    // lives, carries not one producibility mark.
    const panel = one(root, "#defminer-evidence-panel");
    expect(analysisNodes(panel).length).toBeGreaterThan(0);
    expect(producibilityNodes(panel)).toEqual([]);
  });

  it("requirement 2, THE CONVERSE — no producibility subtree contains an analysis node", async () => {
    const wrapper = await mountClosestTogether();
    const root = wrapper.element as Element;

    const offenders: string[] = [];
    for (const mark of producibilityNodes(root)) {
      for (const node of analysisNodes(mark)) {
        offenders.push(`${String(mark.tagName)} > ${String(node.tagName)}`);
      }
    }
    expect(offenders).toEqual([]);

    // The whole drill-down region carries not one analysis word — asserted
    // above as requirement 1 and restated here as the region-level converse.
    const drilldown = one(root, "[data-defminer-source-browser]");
    expect(producibilityNodes(drilldown).length).toBeGreaterThan(0);
    expect(analysisNodes(drilldown)).toEqual([]);
  });

  it("the closest thing the two share is the PAGE SPLIT, not a component", async () => {
    // The rule's sharpest form. Two disjoint leaf nodes trivially do not
    // contain each other; what makes the separation real is WHERE they meet.
    // Every pair's nearest common ancestor must be a strict ancestor of BOTH
    // region roots — which is to say the two vocabularies share no component
    // subtree at all, only the split body that holds the regions.
    const wrapper = await mountClosestTogether();
    const root = wrapper.element as Element;
    const drilldown = one(root, "[data-defminer-source-browser]");
    const panel = one(root, "#defminer-evidence-panel");

    const analysis = analysisNodes(root);
    const marks = producibilityNodes(root);
    expect(analysis.length).toBeGreaterThan(0);
    expect(marks.length).toBeGreaterThan(0);

    for (const a of analysis) {
      for (const m of marks) {
        expect(a.contains(m)).toBe(false);
        expect(m.contains(a)).toBe(false);
        const meeting = nearestCommonAncestor(a, m);
        expect(meeting.contains(drilldown)).toBe(true);
        expect(meeting.contains(panel)).toBe(true);
        expect(meeting).not.toBe(drilldown);
        expect(meeting).not.toBe(panel);
      }
    }
  });

  it("keeps the evidence panel mounted at its shipped width while the drill-down is open", async () => {
    const wrapper = await mountClosestTogether();
    const root = wrapper.element as Element;

    const panel = one(root, "#defminer-evidence-panel");
    expect(panel.parentElement?.getAttribute("class")).toContain("w-1/3");
    expect(panel.parentElement?.getAttribute("class")).toContain("shrink-0");
    // Mechanism 1 doing its work for free: the PARENT artifact's state is what
    // the panel is showing, and it is still on screen.
    expect(panel.textContent ?? "").toContain(
      SCAN_STATE_PRESENTATION.partial.label,
    );
  });
});
