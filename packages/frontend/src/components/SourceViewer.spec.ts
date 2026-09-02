// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// packages/frontend/src/components/SourceViewer.spec.ts — the most hostile
// render target this product has.
//
// ===========================================================================
// WHY `RecycleScroller` IS STUBBED, AND WHY THERE ARE TWO STUBS
// ===========================================================================
// The measured reason `InventoryTable.spec.ts` and `SourceTree.spec.ts` both
// record: mounted in jsdom the real scroller sizes its window from
// `getBoundingClientRect`, jsdom reports every box as 0x0 because it has no
// layout engine, and the scroller correctly concludes that zero rows fit. A row
// assertion written against that renders nothing, finds nothing, and PASSES BY
// MEASURING AN EMPTY SET.
//
// So the scroller is a PASSTHROUGH stub declaring the same props. It renders
// every item, which is what makes a per-row DOM assertion possible at all, and
// `item-size` is asserted on the STUB'S OWN PROPS — so the number that reaches
// the real component is still checked, by IDENTITY against
// `SOURCE_LINE_HEIGHT_PX` rather than against a literal 24.

import type { DeriveSourceResult } from "@defminer/engine/contract";
import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";

import type { RpcResult, SourceRef } from "../api/client";
import { forSourceLine } from "../safety/display";

import SourceViewer from "./SourceViewer.vue";
import { SOURCE_LINE_HEIGHT_PX } from "./table-contract";

// ---------------------------------------------------------------------------
// FIXTURES
// ---------------------------------------------------------------------------

const DIGEST =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const SOURCE_REF: SourceRef = {
  projectId: "p1",
  mapSha256: "b".repeat(64),
  sourceIndex: 7,
};

/** Four lines, one of them empty — the shape a real file has. */
const MULTI_LINE = "const a = 1;\nconst b = 2;\n\nexport { a, b };";

function contentArm(content: string): DeriveSourceResult {
  return {
    outcome: "content",
    content,
    byteLen: content.length,
    lineCount: content === "" ? 0 : content.split("\n").length,
    sha256: DIGEST,
  };
}

function ok<T>(value: T): RpcResult<T> {
  return { ok: true, value };
}

// ---------------------------------------------------------------------------
// STUBS
// ---------------------------------------------------------------------------

const SCROLLER_PROPS = {
  items: { type: Array, required: true },
  itemSize: { type: Number, required: true },
  keyField: { type: String, required: true },
  buffer: { type: Number, default: 0 },
} as const;

const ScrollerStub = defineComponent({
  name: "RecycleScroller",
  props: SCROLLER_PROPS,
  template: `<div class="scroller-stub"><template v-for="(item, index) in items" :key="index"><slot :item="item" :index="index" /></template></div>`,
});

type Client = {
  deriveSource: (request: SourceRef) => Promise<RpcResult<DeriveSourceResult>>;
};

function clientReturning(
  result: RpcResult<DeriveSourceResult>,
  calls: SourceRef[] = [],
): Client {
  return {
    deriveSource: async (request) => {
      calls.push(request);
      return await Promise.resolve(result);
    },
  };
}

async function mountViewer(
  client: Client,
  options: {
    label?: string | null;
    scroller?: typeof ScrollerStub;
  } = {},
): Promise<VueWrapper> {
  const wrapper = mount(SourceViewer, {
    props: {
      client,
      sourceRef: SOURCE_REF,
      label: options.label ?? "webpack:///./src/app.ts",
    },
    global: {
      stubs: { RecycleScroller: options.scroller ?? ScrollerStub },
    },
  });
  await flush();
  return wrapper;
}

/** Three microtask turns: the watcher fires, the RPC settles, Vue re-renders. */
async function flush(): Promise<void> {
  for (let turn = 0; turn < 4; turn += 1) {
    await Promise.resolve();
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const codeNodes = (wrapper: VueWrapper): Element[] => [
  ...wrapper.element.querySelectorAll("[data-defminer-source-code]"),
];

const itemSizeOf = (wrapper: VueWrapper, stub = ScrollerStub): unknown =>
  wrapper.findComponent(stub).props("itemSize");

const itemsOf = (wrapper: VueWrapper, stub = ScrollerStub): unknown[] =>
  wrapper.findComponent(stub).props("items");

// ---------------------------------------------------------------------------
// THE TRACER: ONE RECOVERED SOURCE'S BYTES, ON SCREEN AS VIRTUALISED ROWS
// ---------------------------------------------------------------------------

describe("source-viewer / populated — the content arm, rendered", () => {
  it("renders exactly one row per newline-separated line", async () => {
    const wrapper = await mountViewer(
      clientReturning(ok(contentArm(MULTI_LINE))),
    );
    expect(codeNodes(wrapper)).toHaveLength(MULTI_LINE.split("\n").length);
    expect(codeNodes(wrapper)).toHaveLength(4);
  });

  it("renders each line's code as a TEXT NODE carrying forSourceLine's output", async () => {
    // R1's load-bearing clause on this surface: every recovered source line is a
    // text node and nothing else. Asserted STRUCTURALLY — one child, of type
    // TEXT_NODE — rather than by comparing `innerHTML`, because a comparison
    // that happens to match is not a proof that nothing was parsed.
    const wrapper = await mountViewer(
      clientReturning(ok(contentArm(MULTI_LINE))),
    );
    const expected = MULTI_LINE.split("\n");
    codeNodes(wrapper).forEach((node, index) => {
      // NO ELEMENT CHILD, EVER. This is the assertion that would catch a
      // payload having been parsed into markup, and it is stated first because
      // it is the one that matters.
      expect(node.querySelectorAll("*")).toHaveLength(0);
      for (const child of node.childNodes) {
        expect(child.nodeType).toBe(3 /* Node.TEXT_NODE */);
      }
      // The EMPTY line renders zero child nodes rather than one empty text
      // node — Vue writes `textContent` for a lone interpolation and assigning
      // "" removes the child. `textContent` is therefore the exact comparison
      // at every line length, including zero.
      expect(node.textContent).toBe(forSourceLine(expected[index] ?? ""));
      expect(node.childNodes.length).toBeLessThanOrEqual(1);
    });
  });

  it("binds the scroller's item size to SOURCE_LINE_HEIGHT_PX BY IDENTITY", async () => {
    // The same assertion `InventoryTable.spec.ts` makes about its own height:
    // against the CONSTANT, never against the literal 24. A variable row height
    // is the one thing `RecycleScroller`'s fast path forbids, and a literal here
    // is how the two numbers drift apart.
    const wrapper = await mountViewer(
      clientReturning(ok(contentArm(MULTI_LINE))),
    );
    expect(itemSizeOf(wrapper)).toBe(SOURCE_LINE_HEIGHT_PX);
    expect(itemsOf(wrapper)).toHaveLength(4);
  });

  it("splits the content ONCE, at derivation time — never per render", async () => {
    // UI-05/precision, asserted rather than read for. The split is bounded
    // because the map is bounded by MAP_MAX_BYTES, but bounded-per-render is
    // still per-render, and a 500,000-element array rebuilt on every keystroke
    // in a sibling component is the defect this rule exists to prevent.
    // The arm is built BEFORE the spy is installed: the fixture helper computes
    // `lineCount` by splitting, and counting that would be counting the test.
    const arm = contentArm(MULTI_LINE);
    type Split = typeof String.prototype.split;
    const original: Split = String.prototype.split;
    let newlineSplitsOfTheFixture = 0;
    const counting = function (this: string, ...args: unknown[]): string[] {
      if (args[0] === "\n" && String(this) === MULTI_LINE) {
        newlineSplitsOfTheFixture += 1;
      }
      return (original as (this: string, ...rest: unknown[]) => string[]).apply(
        this,
        args,
      );
    } as unknown as Split;
    String.prototype.split = counting;

    try {
      const wrapper = await mountViewer(clientReturning(ok(arm)));
      expect(newlineSplitsOfTheFixture).toBe(1);

      // Two further renders, from two different causes: a prop change and a
      // forced update. Neither may re-split.
      await wrapper.setProps({ label: "webpack:///./src/other.ts" });
      await flush();
      wrapper.vm.$forceUpdate();
      await flush();

      expect(newlineSplitsOfTheFixture).toBe(1);
      expect(codeNodes(wrapper)).toHaveLength(4);
    } finally {
      String.prototype.split = original;
    }
  });
});
