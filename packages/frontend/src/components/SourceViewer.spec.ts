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
// So there are two stubs, and the second one is not a convenience:
//
//   * `ScrollerStub` is a PASSTHROUGH. It renders every item, which is what
//     makes a per-row DOM assertion possible at all. It is used for the small
//     fixtures and for the 4 MiB single-line case, which is ONE row.
//   * `CountingScrollerStub` renders NOTHING and only records its props. It is
//     used for the 500,000-line cap, where a passthrough would materialise half
//     a million DOM nodes to assert a number the scroller was already handed.
//     The bound is a property of the DERIVED ITEM LIST, and that is where it is
//     asserted.
//
// `item-size` is asserted on the STUB'S OWN PROPS in both, so the number that
// reaches the real component is still checked, by IDENTITY against
// `SOURCE_LINE_HEIGHT_PX` rather than against a literal 24.

import { readFileSync } from "node:fs";

import type {
  DeriveSourceResult,
  SourceMappingsResult,
} from "@defminer/engine/contract";
import { HOSTILE_CASES } from "@defminer/engine/hostile.fixture";
import { SOURCE_LINE_MAX_GRAPHEMES } from "@defminer/engine/sanitise";
import { SOURCE_LINE_COUNT_MAX } from "@defminer/engine/thresholds";
import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { defineComponent } from "vue";

import type { RpcResult, SourceRef } from "../api/client";
import { forSourceLine } from "../safety/display";

import { SOURCE_PRODUCIBILITY_PRESENTATION } from "./source-producibility-presentation";
import SourceViewer from "./SourceViewer.vue";
import { groupThousands, SOURCE_LINE_HEIGHT_PX } from "./table-contract";

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

/** Records its props and renders nothing. See the header. */
const CountingScrollerStub = defineComponent({
  name: "RecycleScroller",
  props: SCROLLER_PROPS,
  template: `<div class="scroller-counting" />`,
});

type Client = {
  deriveSource: (request: SourceRef) => Promise<RpcResult<DeriveSourceResult>>;
  readSourceMappings: (
    request: SourceRef,
  ) => Promise<RpcResult<SourceMappingsResult>>;
};

/** The fake, with its own call log. The LOG is the point: the laziness rule is
 *  a claim about WHEN a method is called, which nothing in the DOM can show. */
type Fake = Client & {
  readonly deriveCalls: SourceRef[];
  readonly positionCalls: SourceRef[];
};

function clientReturning(
  result: RpcResult<DeriveSourceResult>,
  mappings: RpcResult<SourceMappingsResult> = ok({ outcome: "unavailable" }),
): Fake {
  const deriveCalls: SourceRef[] = [];
  const positionCalls: SourceRef[] = [];
  return {
    deriveCalls,
    positionCalls,
    deriveSource: async (request) => {
      deriveCalls.push(request);
      return await Promise.resolve(result);
    },
    readSourceMappings: async (request) => {
      positionCalls.push(request);
      return await Promise.resolve(mappings);
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

// ---------------------------------------------------------------------------
// THE FOUR BODY STATES — MUTUALLY EXCLUSIVE, AND NO TWO MAY BE COLLAPSED
// ---------------------------------------------------------------------------
//
// Each test asserts its OWN copy present and the other three ABSENT. The
// absence half is the half that catches a regression: an operator shown a
// generic body over a state that means something specific has been told the
// wrong thing, and the only way to catch a merge of two states is to look for
// what must not be there.

const REGIONS = {
  content: "[data-defminer-source-viewer-content]",
  gone: "[data-defminer-source-viewer-gone]",
  changed: "[data-defminer-source-viewer-changed]",
  rpcFailed: "[data-defminer-source-viewer-rpc-failed]",
} as const;

type RegionName = keyof typeof REGIONS;

function expectOnly(wrapper: VueWrapper, present: RegionName): void {
  for (const [name, selector] of Object.entries(REGIONS)) {
    expect(
      wrapper.find(selector).exists(),
      `${name} region should be ${name === present ? "present" : "absent"}`,
    ).toBe(name === present);
  }
}

const RECOVERED_AT = Date.UTC(2026, 1, 14, 9, 30, 15);

describe("the four body states — mutually exclusive, none collapsible", () => {
  it("content — the virtualised line list, and NEITHER tombstone", async () => {
    const wrapper = await mountViewer(
      clientReturning(ok(contentArm(MULTI_LINE))),
    );
    expectOnly(wrapper, "content");
    expect(wrapper.text()).not.toContain("no longer in Caido's history");
    expect(wrapper.text()).not.toContain("the target has redeployed");
    expect(wrapper.text()).not.toContain("Could not produce this source.");
  });

  it("gone — D-22's tombstone SENTENCE, and no line rows", async () => {
    const wrapper = await mountViewer(
      clientReturning(
        ok({ outcome: "gone", cause: "no_request", recoveredAt: RECOVERED_AT }),
      ),
    );
    expectOnly(wrapper, "gone");
    const gone = wrapper.find(REGIONS.gone);
    expect(gone.text()).toContain("Recovered 2026-02-14 09:30:15.");
    expect(gone.text()).toContain("no longer in Caido's history");
    expect(gone.text()).toContain("evidence on its own");
    expect(wrapper.findAll("[data-defminer-source-line]")).toHaveLength(0);
  });

  it("changed — FAIL CLOSED: the subtree contains ZERO line rows", async () => {
    // Structural, not an empty string. The `changed` arm has no `content` key
    // at ALL (plan 07-06), so there is nothing here to forget to hide, and the
    // assertion is over the rendered subtree rather than over a value.
    const wrapper = await mountViewer(
      clientReturning(
        ok({
          outcome: "changed",
          recoveredAt: RECOVERED_AT,
          recordedByteLen: 4096,
          reloadedByteLen: 5120,
        }),
      ),
    );
    expectOnly(wrapper, "changed");
    const changed = wrapper.find(REGIONS.changed);
    expect(changed.text()).toContain("the target has redeployed");
    expect(changed.text()).toContain("the content is withheld");
    expect(wrapper.findAll("[data-defminer-source-line]")).toHaveLength(0);
    expect(wrapper.findAll("[data-defminer-source-code]")).toHaveLength(0);
  });

  it("could not ask — the RPC failed, and it is NEVER a tombstone", async () => {
    const wrapper = await mountViewer(
      clientReturning({ ok: false, reason: "rpc-timeout", versions: null }),
    );
    expectOnly(wrapper, "rpcFailed");
    const failed = wrapper.find(REGIONS.rpcFailed);
    expect(failed.text()).toContain("Could not produce this source.");
    // THE SENTENCE THAT MAKES THE RULE VISIBLE TO THE OPERATOR.
    expect(failed.text()).toContain("has NOT been marked unavailable");
    expect(failed.text()).toContain("does not conclude a file is gone");
    expect(failed.text()).toContain("Retry");
    expect(failed.text()).toContain("Open Health");
    // NO PRODUCIBILITY MARKER ANYWHERE. The frontend never infers
    // producibility, so there is nothing in this subtree that could carry it.
    expect(
      wrapper.findAll("[data-defminer-source-producibility]"),
    ).toHaveLength(0);
    expect(wrapper.findAll("[data-defminer-status-badge]")).toHaveLength(0);
  });

  it("maps the `unavailable` arm to the SAME could-not-ask copy", async () => {
    // The backend answered and could not produce. It has still concluded
    // nothing durable, so it renders the copy that claims nothing durable —
    // never a tombstone.
    const wrapper = await mountViewer(
      clientReturning(ok({ outcome: "unavailable" })),
    );
    expectOnly(wrapper, "rpcFailed");
    expect(wrapper.text()).toContain("has NOT been marked unavailable");
  });

  it("renders the loading SENTENCE, never a skeleton and never a spinner", () => {
    // Not awaited: the assertion is about the state BEFORE the RPC settles.
    const wrapper = mount(SourceViewer, {
      props: {
        client: {
          deriveSource: async () =>
            await new Promise<RpcResult<DeriveSourceResult>>(() => {
              /* never settles */
            }),
          readSourceMappings: async () =>
            await Promise.resolve(ok({ outcome: "unavailable" })),
        },
        sourceRef: SOURCE_REF,
        label: "webpack:///./src/app.ts",
      },
      global: { stubs: { RecycleScroller: ScrollerStub } },
    });
    const loading = wrapper.find("[data-defminer-source-viewer-loading]");
    expect(loading.exists()).toBe(true);
    expect(loading.text()).toContain(
      "Producing this source from the original response…",
    );
    expect(wrapper.findAll("[role='progressbar']")).toHaveLength(0);
    expect(wrapper.findAll("[data-defminer-skeleton-row]")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// O-07 MECHANISM 5'S REPLACEMENT, REQUIREMENT 3
// ---------------------------------------------------------------------------

describe("the degraded producibility state is a SENTENCE, not a badge", () => {
  it("is longer than every label in the producibility presentation map", async () => {
    const labels = Object.values(SOURCE_PRODUCIBILITY_PRESENTATION)
      .map((entry) => entry.label)
      .filter((label): label is string => label !== null);
    expect(labels).toEqual(["Gone", "Changed"]);

    for (const [arm, selector] of [
      [
        { outcome: "gone", cause: "no_request", recoveredAt: RECOVERED_AT },
        REGIONS.gone,
      ],
      [
        {
          outcome: "changed",
          recoveredAt: RECOVERED_AT,
          recordedByteLen: 1,
          reloadedByteLen: 2,
        },
        REGIONS.changed,
      ],
    ] as const) {
      const wrapper = await mountViewer(clientReturning(ok(arm)));
      const text = wrapper.find(selector).text();
      expect(text).toMatch(/\s/);
      for (const label of labels) {
        expect(text.length).toBeGreaterThan(label.length);
      }
      // AND IT IS NOT A BADGE. No producibility marker and no status badge in
      // the subtree — the single WORD belongs to the 32px tree row, which
      // cannot hold a sentence and where no other state word exists.
      expect(
        wrapper.findAll("[data-defminer-source-producibility]"),
      ).toHaveLength(0);
      expect(wrapper.findAll("[data-defminer-status-badge]")).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// THE LEGAL EMPTY FILE — ZERO LINES, AND NOT AN ERROR
// ---------------------------------------------------------------------------

describe("source-viewer / empty — a ZERO-BYTE source is LEGAL", () => {
  it("renders zero line rows, a stated count of zero, and NEITHER tombstone", async () => {
    const wrapper = await mountViewer(clientReturning(ok(contentArm(""))));
    expectOnly(wrapper, "content");
    expect(wrapper.findAll("[data-defminer-source-line]")).toHaveLength(0);
    expect(itemsOf(wrapper)).toHaveLength(0);
    expect(wrapper.find("[data-defminer-source-viewer-lines]").text()).toBe(
      "0 lines",
    );
    expect(wrapper.text()).not.toContain("no longer in Caido's history");
    expect(wrapper.text()).not.toContain("the target has redeployed");
    expect(wrapper.text()).not.toContain("Could not produce this source.");
  });

  it("agrees at 0, 1 and many — never a parenthesised plural", async () => {
    const zero = await mountViewer(clientReturning(ok(contentArm(""))));
    const one = await mountViewer(clientReturning(ok(contentArm("only()"))));
    const many = await mountViewer(clientReturning(ok(contentArm(MULTI_LINE))));
    const lineCount = (wrapper: VueWrapper): string =>
      wrapper.find("[data-defminer-source-viewer-lines]").text();
    expect(lineCount(zero)).toBe("0 lines");
    expect(lineCount(one)).toBe("1 line");
    expect(lineCount(many)).toBe("4 lines");
    expect(lineCount(one)).not.toContain("(s)");
  });
});

// ---------------------------------------------------------------------------
// THE TWO INDEPENDENT BOUNDS, EACH WITH ITS OWN VISIBLE MARKER
// ---------------------------------------------------------------------------

describe("source-viewer / overflow — the line-count cap", () => {
  it("renders exactly the cap and states the bound in DefMiner's integers", async () => {
    const overCap = `x\n`.repeat(SOURCE_LINE_COUNT_MAX + 1);
    const total = overCap.split("\n").length;
    expect(total).toBeGreaterThan(SOURCE_LINE_COUNT_MAX);

    const wrapper = await mountViewer(
      clientReturning(ok(contentArm(overCap))),
      { scroller: CountingScrollerStub },
    );
    expect(itemsOf(wrapper, CountingScrollerStub)).toHaveLength(
      SOURCE_LINE_COUNT_MAX,
    );
    expect(itemSizeOf(wrapper, CountingScrollerStub)).toBe(
      SOURCE_LINE_HEIGHT_PX,
    );

    const bound = wrapper.find("[data-defminer-source-viewer-bound]");
    expect(bound.exists()).toBe(true);
    expect(bound.text()).toBe(
      `Showing the first ${groupThousands(SOURCE_LINE_COUNT_MAX)} lines of ` +
        `${groupThousands(total)}. DefMiner bounds what it renders so a ` +
        "hostile map cannot freeze the page.",
    );
  });

  it("says nothing about a bound when the file is inside it", async () => {
    const wrapper = await mountViewer(
      clientReturning(ok(contentArm(MULTI_LINE))),
    );
    expect(wrapper.find("[data-defminer-source-viewer-bound]").exists()).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// THE BACKSTOP: O-02, AGAINST THE REAL 4 MiB SINGLE-LINE FIXTURE
// ---------------------------------------------------------------------------
//
// `07-UI-SPEC.md` marks this row 🧪 backstop and says why: the repo has already
// MEASURED what getting it wrong costs on this exact shape — 99 of 396 frames
// over the 32 ms budget and a 37,395 ms scroll through `forCell`, against 0 of
// 396 and 4,010 ms through the text-only family. It cannot be signed off by
// inspection, so it is driven through the REAL component against the REAL
// fixture.

describe("source-viewer / long-text — the 4 MiB single-line fixture", () => {
  const FIXTURE = HOSTILE_CASES.find(
    (hostileCase) => hostileCase.id === "multi-megabyte-single-line",
  );

  it("is the real fixture, four megabytes on one line", () => {
    // Non-vacuity. A `find` that missed would leave every assertion below
    // running against the empty string.
    expect(FIXTURE?.value).toHaveLength(4 * 1024 * 1024);
    expect(FIXTURE?.value.includes("\n")).toBe(false);
  });

  it("renders ONE row, truncated, with a visible marker and no leak", async () => {
    const value = FIXTURE?.value ?? "";
    const started = Date.now();
    const wrapper = await mountViewer(clientReturning(ok(contentArm(value))));
    const elapsed = Date.now() - started;

    // ONE ROW. Nothing about the scroller changes.
    expect(itemsOf(wrapper)).toHaveLength(1);
    expect(itemSizeOf(wrapper)).toBe(SOURCE_LINE_HEIGHT_PX);
    const code = codeNodes(wrapper);
    expect(code).toHaveLength(1);

    // BOUNDED BY THE PER-LINE CAP, counted in GRAPHEMES.
    const rendered = code[0]?.textContent ?? "";
    expect([...rendered].length).toBeLessThanOrEqual(SOURCE_LINE_MAX_GRAPHEMES);

    // BOTH MARKERS ARE VISIBLE — the per-row one and the O-02 sentence.
    expect(wrapper.find("[data-defminer-source-line-truncated]").exists()).toBe(
      true,
    );
    const marker = wrapper.find(
      "[data-defminer-source-viewer-no-line-structure]",
    );
    expect(marker.exists()).toBe(true);
    expect(marker.text()).toContain("This file has no line structure");
    expect(marker.text()).toContain(groupThousands(value.length));
    expect(marker.text()).toContain(groupThousands(SOURCE_LINE_MAX_GRAPHEMES));

    // R2'S ABSOLUTE, OVER THE WHOLE RENDERED SUBTREE. No `title` anywhere, and
    // no `data-*` carrying the untruncated value — asserted in the stronger
    // honest form plan 07-07 established, because this component legitimately
    // uses `data-*` markers for its own regions.
    const titles: string[] = [];
    const oversized: string[] = [];
    for (const element of [
      wrapper.element,
      ...wrapper.element.querySelectorAll("*"),
    ]) {
      for (const attribute of element.attributes) {
        const name = String(attribute.name).toLowerCase();
        const attributeValue = String(attribute.value);
        if (name === "title") titles.push(String(element.tagName));
        if (!name.startsWith("data-")) continue;
        if (
          [...attributeValue].length > SOURCE_LINE_MAX_GRAPHEMES ||
          attributeValue.includes("A".repeat(64))
        ) {
          oversized.push(`${String(element.tagName)}[${name}]`);
        }
      }
    }
    expect(titles).toEqual([]);
    expect(oversized).toEqual([]);

    // The freeze budget the shipped hostile backstop uses for this same value.
    expect(elapsed).toBeLessThan(5_000);
  });

  it("offers a save name that is DefMiner's, not the fixture's", async () => {
    const wrapper = await mountViewer(
      clientReturning(ok(contentArm(FIXTURE?.value ?? ""))),
      { label: "../../../../../../etc/defminer-escape.txt" },
    );
    const helper = wrapper.find("[data-defminer-source-viewer-save-helper]");
    expect(helper.exists()).toBe(true);
    expect(helper.text()).toBe(
      `Saved as ${DIGEST.slice(0, 16)}.txt. DefMiner never builds a filename ` +
        "from the developer's path — that path is evidence, not a destination.",
    );
    expect(helper.text()).not.toContain("/etc/");
  });
});

// ---------------------------------------------------------------------------
// THE PROHIBITIONS, AS AN EXACT-SET EQUALITY OVER THE PARSED IMPORTS
// ---------------------------------------------------------------------------
//
// The idiom plan 07-07 established, and the reason it is an EQUALITY rather
// than a pair of absences: an import added later fails it without anyone having
// to think of the specifier it would have been written with.

describe("SourceViewer.vue imports EXACTLY these modules", () => {
  const MODULE = "packages/frontend/src/components/SourceViewer.vue";

  const parse = (): {
    specifiers: string[];
    namesFromDisplay: string[];
    visited: number;
  } => {
    const source = readFileSync(MODULE, "utf8");
    const script = /<script[^>]*>([\s\S]*?)<\/script>/.exec(source)?.[1] ?? "";
    const file = ts.createSourceFile(
      MODULE,
      script,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const specifiers = new Set<string>();
    const namesFromDisplay = new Set<string>();
    let visited = 0;
    const visit = (node: ts.Node): void => {
      visited += 1;
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier !== undefined &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        specifiers.add(node.moduleSpecifier.text);
        const bindings = ts.isImportDeclaration(node)
          ? node.importClause?.namedBindings
          : undefined;
        if (
          node.moduleSpecifier.text === "../safety/display" &&
          bindings !== undefined &&
          ts.isNamedImports(bindings)
        ) {
          for (const element of bindings.elements) {
            namesFromDisplay.add(element.name.text);
          }
        }
      }
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        const isDynamic = callee.kind === ts.SyntaxKind.ImportKeyword;
        const isRequire = ts.isIdentifier(callee) && callee.text === "require";
        const first = node.arguments[0];
        if (
          (isDynamic || isRequire) &&
          first !== undefined &&
          ts.isStringLiteral(first)
        ) {
          specifiers.add(first.text);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    return {
      specifiers: [...specifiers].sort(),
      namesFromDisplay: [...namesFromDisplay].sort(),
      visited,
    };
  };

  it("has EXACTLY this module-specifier set", () => {
    // Four forms are collected — `import`, `export … from`, dynamic `import()`
    // and `require()` — so an equality over a set that counted only static
    // imports would not be an equality over a hole.
    //
    // NEITHER `safety/HighlightSlices.vue` NOR ANY FORM CONTROL IS IN IT. D-19
    // means the viewer has no slicing path at all, and no Phase 7 surface
    // mounts a form control: hostile bytes in an editable, submittable control
    // invite a value round-trip the render rules do not cover.
    expect(parse().specifiers).toEqual([
      "../api/client",
      "../safety/display",
      "./SourcePositionStrip.vue",
      "./export-download",
      "./source-filename",
      "./table-contract",
      "@defminer/engine/contract",
      "@defminer/engine/sanitise",
      "@defminer/engine/thresholds",
      "vue",
      "vue-virtual-scroller",
    ]);
  });

  it("imports EXACTLY the text-only wrapper family from the display module", () => {
    // Simultaneously the T-07-12 proof. `forCell` returns `total`, which forces
    // a walk of the whole value: `display.ts:110-121` records 99 of 396 frames
    // over budget and a 37,395 ms scroll through it on a 4 MiB single line,
    // against 0 of 396 and 4,010 ms through the text-only family.
    expect(parse().namesFromDisplay).toEqual([
      "copyToClipboard",
      "forCellText",
      "forSourceLine",
      "sourceLineCounts",
      "sourceLineTruncated",
    ]);
    // `sourceLineCounts` JOINED THE SET on 2026-09-02 (07-REVIEW.md HI-02) and
    // it does not weaken the equality. It is a SURFACE-NAMED wrapper in the
    // family this case is about — the cap is bound in its name, it is called
    // once per SELECTED line and never per row, and it returns two integers
    // rather than text. What the equality forbids is the WALKING wrapper on the
    // row path, and the loop below still asserts every one of them is absent.
    // AND WHAT THE EQUALITY PROVES, SAID OUT LOUD. `copyToClipboard` is not a
    // wrapper at all — it is the sanctioned escape R2's absolute names, and
    // reusing it is why this file has no structural DOM host of its own. Every
    // WALKING wrapper is absent, and that is the T-07-12 mitigation.
    for (const walking of [
      "forCell",
      "forDisplay",
      "forPanel",
      "forEvidence",
    ]) {
      expect(parse().namesFromDisplay).not.toContain(walking);
    }
  });

  it("parsed a NON-EMPTY script block — the non-vacuity half", () => {
    const facts = parse();
    expect(facts.visited).toBeGreaterThan(200);
    expect(readFileSync(MODULE, "utf8")).toContain("splitOnce");
  });
});

// ---------------------------------------------------------------------------
// THE POSITION STRIP, THROUGH THE VIEWER — LAZINESS AND CONTAINMENT
// ---------------------------------------------------------------------------
//
// The strip's own seven states live in `SourcePositionStrip.spec.ts`. What is
// here is the pair of properties that are only true of the two components
// TOGETHER: the position table does not block first paint, and a decode failure
// does not take the source down behind it.

const STRIP = "[data-defminer-source-position-strip]";

describe("viewer-position-strip / loading — the position data is LAZY", () => {
  it("is not read on mount, not read on scroll, read on the FIRST selection", async () => {
    const client = clientReturning(
      ok(contentArm(MULTI_LINE)),
      ok({ outcome: "mappings", mappings: "AAAA" }),
    );
    const wrapper = await mountViewer(client);

    // FIRST PAINT HAPPENED AND NOT ONE BYTE OF `mappings` HAS CROSSED THE RPC.
    expect(client.deriveCalls).toHaveLength(1);
    expect(client.positionCalls).toHaveLength(0);

    // AND THE VIEWER IS FULLY USABLE IN BETWEEN: the rows are on screen, the
    // strip is present at its fixed height, and it states the discovery line.
    const rows = wrapper.findAll("[data-defminer-source-line]");
    expect(rows).toHaveLength(4);
    expect(wrapper.find(STRIP).text()).toContain(
      "Select a line to see where it appears in the minified bundle.",
    );

    await wrapper
      .find("[data-defminer-source-viewer-content]")
      .trigger("scroll");
    await flush();
    expect(client.positionCalls).toHaveLength(0);

    await rows[0]?.trigger("click");
    await flush();
    expect(client.positionCalls).toHaveLength(1);
    expect(client.positionCalls[0]).toEqual(SOURCE_REF);
  });

  it("keeps the strip present at its fixed height in EVERY body state", async () => {
    const arms: DeriveSourceResult[] = [
      contentArm(MULTI_LINE),
      { outcome: "gone", cause: "no_request", recoveredAt: RECOVERED_AT },
      {
        outcome: "changed",
        recoveredAt: RECOVERED_AT,
        recordedByteLen: 1,
        reloadedByteLen: 2,
      },
      { outcome: "unavailable" },
    ];
    for (const arm of arms) {
      const wrapper = await mountViewer(clientReturning(ok(arm)));
      const strip = wrapper.find(STRIP);
      expect(strip.exists()).toBe(true);
      expect(strip.classes()).toContain("h-12");
      expect(strip.text().length).toBeGreaterThan(0);
    }
  });
});

describe("viewer-position-strip / error — a decode throw degrades the STRIP only", () => {
  it("leaves every line row on screen and raises no unhandled rejection", async () => {
    // The RPC boundary, not the parser: the contract's `string` is a
    // compile-time claim about a runtime value, and `decode(null)` throws.
    const hostile = {
      outcome: "mappings",
      mappings: null,
    } as unknown as SourceMappingsResult;
    const rejections: unknown[] = [];
    const record = (reason: unknown): void => {
      rejections.push(reason);
    };
    process.on("unhandledRejection", record);
    try {
      const wrapper = await mountViewer(
        clientReturning(ok(contentArm(MULTI_LINE)), ok(hostile)),
      );
      await wrapper.findAll("[data-defminer-source-line]")[0]?.trigger("click");
      await flush();

      // THE SOURCE IS STILL ON SCREEN AND STILL READABLE.
      expect(wrapper.findAll("[data-defminer-source-line]")).toHaveLength(4);
      expect(codeNodes(wrapper)).toHaveLength(4);
      expect(codeNodes(wrapper)[0]?.textContent).toBe("const a = 1;");

      // AND THE STRIP SAYS SO, IN ITS OWN WORDS.
      expect(wrapper.find(STRIP).text()).toBe(
        "DefMiner could not read this map's position table. The source above " +
          "is unaffected.",
      );
      expect(rejections).toEqual([]);
    } finally {
      process.off("unhandledRejection", record);
    }
  });
});

// ---------------------------------------------------------------------------
// 07-REVIEW.md HI-01 / HI-02 — THE TRUNCATION PREDICATE AND ITS TWO INTEGERS
// ---------------------------------------------------------------------------
//
// Both findings were filed with an EXECUTED reproduction and both are asserted
// here through the mounted component, because the visible damage was three
// render-level consequences rather than a wrong return value: a marker on every
// row, a false one-line sentence, and a position strip that could never reach
// `mapped` for the whole file.

describe("source-viewer / truncation — a CRLF file is not a truncated file", () => {
  /** The reviewer's reproduction: an ordinary Windows-authored source. Lines
   *  arrive from `split("\n")`, so every one of them ends in a `\r`. */
  const CRLF = "const a = 1;\r\nconst b = 2;\r\nexport { a, b };\r\n";

  it("renders NO truncation marker on any row", async () => {
    const wrapper = await mountViewer(clientReturning(ok(contentArm(CRLF))));
    // Before the fix EVERY visible row carried the marker, on a file where
    // nothing was cut: `\r` is a C0 control, and the predicate was asking
    // whether the string had CHANGED rather than whether it had been CUT.
    expect(
      wrapper.findAll("[data-defminer-source-line-truncated]"),
    ).toHaveLength(0);
    // Non-vacuity: the rows really are there and really did lose the `\r`.
    expect(codeNodes(wrapper)[0]?.textContent).toBe("const a = 1;");
  });

  it("lets the position strip reach a POSITION state instead of pinning it", async () => {
    // THE FINDING'S SECOND CONSEQUENCE, AND THE WORST ONE. The strip gives
    // truncation absolute precedence, so a `truncation` that is non-null for
    // every line makes MAP-03's entire readout unreachable — for the whole
    // file, on every selection, permanently.
    const wrapper = await mountViewer(
      clientReturning(
        ok(contentArm(CRLF)),
        ok({ outcome: "mappings", mappings: "AAAA" }),
      ),
    );
    await wrapper.findAll("[data-defminer-source-line]")[0]?.trigger("click");
    await flush();

    const strip = wrapper.find(STRIP);
    expect(strip.text()).not.toContain("truncated");
    expect(strip.text()).toBe(
      "This line has no position in the bundle's mappings.",
    );
  });

  it("does not claim a one-line CRLF file has no line structure", async () => {
    // O-02's sentence fires on `lines.length === 1 && sourceLineTruncated(only)`
    // and read, verbatim, "This file has no line structure — it is one line of
    // 13 bytes… The line is truncated at 1,024 characters." about thirteen
    // bytes of readable code.
    const wrapper = await mountViewer(
      clientReturning(ok(contentArm("const a = 1;\r"))),
    );
    expect(
      wrapper.find("[data-defminer-source-viewer-no-line-structure]").exists(),
    ).toBe(false);
  });
});

describe("source-viewer / truncation — SHOWN and TOTAL are one unit", () => {
  it("never renders a sentence whose SHOWN exceeds its TOTAL", async () => {
    // The reviewer's second reproduction: 600 tabs and one character, which
    // rendered "Line 1 truncated at 1,024 of 601 characters" — `shown` above
    // `total`, arithmetically impossible for the claim the sentence makes.
    // `shown` was counted after tab expansion and after both strips, `total`
    // before all three, and both in code points against a grapheme cap.
    const tabs = "\u0009".repeat(600) + "x";
    const wrapper = await mountViewer(clientReturning(ok(contentArm(tabs))));
    await wrapper.findAll("[data-defminer-source-line]")[0]?.trigger("click");
    await flush();

    // 600 tabs expand to 1,200 spaces, plus one character: 1,201 graphemes of
    // the PREPARED line, cut to the cap. Both numbers off the same walk.
    // `toContain` rather than `toBe`: the strip also carries the "Copy full
    // line" affordance in this state, which the shipped case above asserts.
    expect(wrapper.find(STRIP).text()).toContain(
      `Line 1 truncated at ${groupThousands(SOURCE_LINE_MAX_GRAPHEMES)} of ` +
        `${groupThousands(1201)} characters.`,
    );
    // AND THE IMPOSSIBLE SENTENCE IS GONE, named so a regression reads as the
    // finding rather than as an arithmetic surprise.
    expect(wrapper.find(STRIP).text()).not.toContain("of 601 characters");
  });
});

describe("Copy full line — the clipboard, never the DOM", () => {
  it("writes the FULL untruncated line while the DOM holds only the prefix", async () => {
    const long = "x".repeat(SOURCE_LINE_MAX_GRAPHEMES + 500);
    const written: string[] = [];
    const host = globalThis as unknown as {
      navigator?: { clipboard?: { writeText(text: string): Promise<void> } };
    };
    const before = host.navigator;
    host.navigator = {
      clipboard: {
        writeText: async (text: string) => {
          written.push(text);
          await Promise.resolve();
        },
      },
    };
    try {
      const wrapper = await mountViewer(clientReturning(ok(contentArm(long))));
      await wrapper.findAll("[data-defminer-source-line]")[0]?.trigger("click");
      await flush();

      const strip = wrapper.find(STRIP);
      expect(strip.text()).toContain(
        `Line 1 truncated at ${groupThousands(SOURCE_LINE_MAX_GRAPHEMES)} of ` +
          `${groupThousands(long.length)} characters.`,
      );
      await wrapper.find("[data-defminer-copy-full-line]").trigger("click");
      expect(written).toEqual([long]);

      // AND THE DOM STILL HOLDS ONLY THE PREFIX. R2's absolute is what makes
      // this affordance necessary and what makes it safe.
      expect(codeNodes(wrapper)[0]?.textContent).toHaveLength(
        SOURCE_LINE_MAX_GRAPHEMES,
      );
      expect(wrapper.html().includes(long)).toBe(false);
    } finally {
      host.navigator = before;
    }
  });
});
