// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// packages/frontend/src/components/SourcePositionStrip.spec.ts — MAP-03's seven
// states, the laziness rule, the decode wrap, and the prohibition that the
// `mappings` string never enters the DOM.
//
// ===========================================================================
// THE MAPPINGS FIXTURE, AND WHY IT IS A LITERAL
// ===========================================================================
// It is the output of the codec's own `encode` over a hand-written segment
// table, PASTED HERE AS A STRING. It is a literal rather than an `encode` call
// because this spec must not import the codec: the exclusivity assertion at the
// bottom of this file says `SourcePositionStrip.vue` is the ONLY module under
// packages/frontend/src that reaches for it, and a spec that imported `encode`
// to build a fixture would be quietly making that assertion false about itself.
//
//   encode([
//     [[0, 7,  4, 12]],   // generated line 0 — source 7, source line 4
//     [],                 // generated line 1 — no segments
//     [[5, 7,  4,  0]],   // generated line 2 — source 7, source line 4 AGAIN
//     [[0, 7,  9,  3]],   // generated line 3 — source 7, source line 9, once
//     [[0, 3,  4,  0]],   // generated line 4 — a DIFFERENT source (index 3)
//     …twelve more single segments for source 7, source lines 20..31
//   ])
//
// The twelve tail rows exist only to push the string past 64 characters, which
// is what makes the "never enters the DOM" scan non-vacuous.

import { readdirSync, readFileSync } from "node:fs";

import type { SourceMappingsResult } from "@defminer/engine/contract";
import { mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import type { RpcResult, SourceRef } from "../api/client";

import SourcePositionStrip from "./SourcePositionStrip.vue";

const MAPPINGS =
  "AOIY;;KAAZ;AAKG;AJLH;AIgBA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;AACA;" +
  "AACA;AACA";

const SOURCE_REF: SourceRef = {
  projectId: "p1",
  mapSha256: "b".repeat(64),
  sourceIndex: 7,
};

function ok<T>(value: T): RpcResult<T> {
  return { ok: true, value };
}

type Fake = {
  readSourceMappings: (
    request: SourceRef,
  ) => Promise<RpcResult<SourceMappingsResult>>;
  readonly calls: SourceRef[];
};

function fake(result: RpcResult<SourceMappingsResult>): Fake {
  const calls: SourceRef[] = [];
  return {
    calls,
    readSourceMappings: async (request) => {
      calls.push(request);
      return await Promise.resolve(result);
    },
  };
}

async function flush(): Promise<void> {
  for (let turn = 0; turn < 4; turn += 1) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function mountStrip(options: {
  result?: RpcResult<SourceMappingsResult>;
  selectedLine?: number | null;
  truncation?: { shown: number; total: number } | null;
  sourceRef?: SourceRef | null;
}): Promise<VueWrapper> {
  const wrapper = mount(SourcePositionStrip, {
    props: {
      client: fake(
        options.result ?? ok({ outcome: "mappings", mappings: MAPPINGS }),
      ),
      sourceRef:
        options.sourceRef === undefined ? SOURCE_REF : options.sourceRef,
      selectedLine: options.selectedLine ?? null,
      truncation: options.truncation ?? null,
    },
  });
  await flush();
  return wrapper;
}

// ---------------------------------------------------------------------------
// THE SEVEN STATES — EACH ITS OWN COPY, AND THE OTHER SIX ABSENT
// ---------------------------------------------------------------------------
//
// The absence half is the half that catches a regression. Two of these rows in
// particular must never converge: "this line has no entry in the table" and
// "this map has no table" are DIFFERENT FACTS, and an operator told the second
// when the first is true will go looking for a build problem that is not there.

const COPY = {
  discovery: "Select a line to see where it appears in the minified bundle.",
  reading: "Reading positions…",
  unmapped: "This line has no position in the bundle's mappings.",
  noTable: "This map carries no position table.",
  unreadable:
    "DefMiner could not read this map's position table. The source above is unaffected.",
  mapped: "appears at line",
  truncated: "truncated at",
} as const;

type CopyName = keyof typeof COPY;

function expectOnly(wrapper: VueWrapper, present: CopyName): void {
  const text = wrapper.text();
  for (const [name, phrase] of Object.entries(COPY)) {
    expect(
      text.includes(phrase),
      `${name} should be ${name === present ? "present" : "absent"}`,
    ).toBe(name === present);
  }
}

describe("viewer-position-strip — the seven states", () => {
  it("1. no line selected — the discovery line, at the fixed height", async () => {
    const wrapper = await mountStrip({ selectedLine: null });
    const strip = wrapper.find("[data-defminer-source-position-strip]");
    expect(strip.exists()).toBe(true);
    // ALWAYS PRESENT, NEVER BLANK. A fixed-height block that appears and then
    // fills is a flash rather than a skeleton, and an always-present strip is
    // where the position feature is found.
    expect(strip.classes()).toContain("h-12");
    expect(strip.classes()).toContain("whitespace-pre");
    expect(strip.classes()).toContain("overflow-hidden");
    expect(strip.text().length).toBeGreaterThan(0);
    expectOnly(wrapper, "discovery");
  });

  it("2. selected, table not yet read — the reading line", async () => {
    const wrapper = mount(SourcePositionStrip, {
      props: {
        client: {
          readSourceMappings: async () =>
            await new Promise<RpcResult<SourceMappingsResult>>(() => {
              /* never settles */
            }),
        },
        sourceRef: SOURCE_REF,
        selectedLine: 4,
        truncation: null,
      },
    });
    await flush();
    expectOnly(wrapper, "reading");
  });

  it("3. mapped — the FIRST segment, with the further-positions clause", async () => {
    // Source line 4 (zero-based) has TWO segments: generated line 0 column 0,
    // and generated line 2 column 5. The FIRST is what renders, stated as such.
    const wrapper = await mountStrip({ selectedLine: 4 });
    expectOnly(wrapper, "mapped");
    expect(wrapper.text()).toBe(
      "Line 5 appears at line 1, column 1 of the minified bundle. " +
        "and at 1 other position.",
    );
  });

  it("3b. mapped once — the sentence alone, no further-positions clause", async () => {
    const wrapper = await mountStrip({ selectedLine: 9 });
    expectOnly(wrapper, "mapped");
    expect(wrapper.text()).toBe(
      "Line 10 appears at line 4, column 1 of the minified bundle.",
    );
    expect(wrapper.text()).not.toContain("other position");
  });

  it("4. unmapped — a DIFFERENT sentence from the no-table one", async () => {
    const wrapper = await mountStrip({ selectedLine: 0 });
    expectOnly(wrapper, "unmapped");
    expect(COPY.unmapped).not.toBe(COPY.noTable);
  });

  it("5. no position table — its own sentence, never the unmapped one", async () => {
    // `unavailable` is what a SECTIONED map produces (plan 07-06): its
    // `mappings` live per section and there is no top-level string member.
    const unavailable = await mountStrip({
      selectedLine: 4,
      result: ok({ outcome: "unavailable" }),
    });
    expectOnly(unavailable, "noTable");

    // An EMPTY mappings string is the same fact by a different route.
    const empty = await mountStrip({
      selectedLine: 4,
      result: ok({ outcome: "mappings", mappings: "" }),
    });
    expectOnly(empty, "noTable");
  });

  it("6. the read did not answer — the could-not-read sentence", async () => {
    const wrapper = await mountStrip({
      selectedLine: 4,
      result: { ok: false, reason: "rpc-timeout", versions: null },
    });
    expectOnly(wrapper, "unreadable");
    // AND IT CLAIMS NOTHING DURABLE. The strip never renders a producibility
    // word and never renders a tombstone — that vocabulary belongs to the
    // viewer body and to the tree row, and to the backend that wrote it.
    expect(wrapper.text()).not.toContain("Gone");
    expect(wrapper.text()).not.toContain("Changed");
    expect(
      wrapper.findAll("[data-defminer-source-producibility]"),
    ).toHaveLength(0);
  });

  it("7. the line is truncated — the notice plus Copy full line", async () => {
    const wrapper = await mountStrip({
      selectedLine: 4,
      truncation: { shown: 1024, total: 4194304 },
    });
    expectOnly(wrapper, "truncated");
    expect(wrapper.text()).toContain(
      "Line 5 truncated at 1,024 of 4,194,304 characters.",
    );
    const copy = wrapper.find("[data-defminer-copy-full-line]");
    expect(copy.exists()).toBe(true);
    expect(copy.text()).toBe("Copy full line");
    await copy.trigger("click");
    expect(wrapper.emitted("copy-full-line")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// THE DECODE WRAP — AND WHAT ACTUALLY REACHES IT
// ---------------------------------------------------------------------------

describe("a decode throw degrades THIS STRIP AND NOTHING ELSE", () => {
  it("survives a mappings value the contract's `string` does not describe", async () => {
    // THE HONEST FIXTURE, and it is worth stating why it is this one. The
    // shipped codec has NO `throw` in its own source: it is total over garbage
    // STRINGS, returning nonsense integers rather than raising. What reaches
    // the catch is the RPC BOUNDARY — the renderer receives whatever QuickJS
    // serialised, and `decode(null)` throws
    // `TypeError: Cannot destructure property 'length' of 'mappings' as it is
    // null`. A `string` in the contract is a compile-time claim about a runtime
    // value, which is exactly the class of claim a wrap exists for.
    const hostile = {
      outcome: "mappings",
      mappings: null,
    } as unknown as SourceMappingsResult;
    const wrapper = await mountStrip({
      selectedLine: 4,
      result: ok(hostile),
    });
    expectOnly(wrapper, "unreadable");
    expect(wrapper.find("[data-defminer-source-position-strip]").exists()).toBe(
      true,
    );
  });

  it("records that a garbage STRING does not throw — measured, not assumed", async () => {
    // A corpus of shapes that look malformed and are not, driven through the
    // real codec. Each decodes to nonsense integers, none raises, and none of
    // them may put a byte of itself on screen.
    // A lone space is a member of this class too and is deliberately NOT in
    // the list: it decodes without throwing like the rest, but " " is a
    // substring of every sentence on the strip, so asserting its absence would
    // fail for a reason that has nothing to do with the property.
    for (const garbage of ["!!!!", ";;;;;;;;;;", "@@@@@@@@", "AAAA,,,,####"]) {
      const wrapper = await mountStrip({
        selectedLine: 4,
        result: ok({ outcome: "mappings", mappings: garbage }),
      });
      const text = wrapper.text();
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toContain(garbage);
    }
  });
});

// ---------------------------------------------------------------------------
// THE `mappings` STRING NEVER ENTERS THE DOM
// ---------------------------------------------------------------------------

describe("MAP-03/encoding — the position string is decoded to integers only", () => {
  it("puts no 8-character run of it in any text, title, data or style", async () => {
    const wrapper = await mountStrip({ selectedLine: 4 });

    // NON-VACUITY FIRST. An assertion over a short string proves nothing.
    expect(MAPPINGS.length).toBeGreaterThanOrEqual(64);
    const runs = Array.from({ length: MAPPINGS.length - 7 }, (_, at) =>
      MAPPINGS.slice(at, at + 8),
    );
    expect(runs.length).toBeGreaterThan(56);

    const offenders: string[] = [];
    const inspect = (label: string, value: string): void => {
      for (const run of runs) {
        if (value.includes(run)) offenders.push(`${label}: ${run}`);
      }
    };

    inspect("text", wrapper.text());
    inspect("html", wrapper.html());
    for (const element of [
      wrapper.element,
      ...wrapper.element.querySelectorAll("*"),
    ]) {
      for (const attribute of element.attributes) {
        const name = String(attribute.name).toLowerCase();
        if (
          name === "title" ||
          name === "style" ||
          name === "href" ||
          name === "src" ||
          name.startsWith("data-")
        ) {
          inspect(
            `${String(element.tagName)}[${name}]`,
            String(attribute.value),
          );
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// THE CODEC LIVES IN EXACTLY ONE PLACE, AND THAT IS ASSERTED
// ---------------------------------------------------------------------------

describe("the codec has EXACTLY ONE consumer in the frontend source tree", () => {
  const ROOT = "packages/frontend/src";
  const CODEC = "@jridgewell/sourcemap-codec";

  const files = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const full = `${directory}/${entry.name}`;
      if (entry.isDirectory()) return files(full);
      return /\.(ts|vue)$/.test(entry.name) ? [full] : [];
    });

  const specifiersOf = (path: string): string[] => {
    const source = readFileSync(path, "utf8");
    const script = path.endsWith(".vue")
      ? (/<script[^>]*>([\s\S]*?)<\/script>/.exec(source)?.[1] ?? "")
      : source;
    const file = ts.createSourceFile(
      path,
      script,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const out: string[] = [];
    const visit = (node: ts.Node): void => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier !== undefined &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        out.push(node.moduleSpecifier.text);
      }
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
        const literal = node.argument.literal;
        if (ts.isStringLiteral(literal)) out.push(literal.text);
      }
      if (ts.isCallExpression(node)) {
        const isDynamic = node.expression.kind === ts.SyntaxKind.ImportKeyword;
        const isRequire =
          ts.isIdentifier(node.expression) &&
          node.expression.text === "require";
        const first = node.arguments[0];
        if (
          (isDynamic || isRequire) &&
          first !== undefined &&
          ts.isStringLiteral(first)
        ) {
          out.push(first.text);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    return out;
  };

  it("is imported by SourcePositionStrip.vue and by nothing else", () => {
    // AN EXACT SET OVER THE WHOLE TREE, not a grep for a literal. D-17 makes
    // the codec a package-level capability the BACKEND may not have, and
    // `packages/backend/src/codec-prohibition.spec.ts` asserts that. This is
    // the other half: the frontend has exactly one consumer, so "the codec
    // lives in the browser" is a fact about the code rather than a sentence in
    // a decision record.
    //
    // Five specifier forms are collected — `import`, `export … from`, a
    // TYPE-position `import("…")`, dynamic `import()` and `require()` — so a
    // second consumer cannot arrive under a spelling the scan does not read.
    const scanned = files(ROOT);
    const consumers = scanned.filter((path) =>
      specifiersOf(path).includes(CODEC),
    );
    expect(consumers).toEqual([
      "packages/frontend/src/components/SourcePositionStrip.vue",
    ]);
    // Non-vacuity: the walk really did read the tree.
    expect(scanned.length).toBeGreaterThan(40);
    expect(scanned).toContain(
      "packages/frontend/src/components/SourcePositionStrip.vue",
    );
  });

  it("imports EXACTLY the decoder from it — never the encoder", () => {
    // `encode` has no consumer here and never will: DefMiner reads maps and
    // writes none. An exact named-import set is what keeps that true.
    const source = readFileSync(
      "packages/frontend/src/components/SourcePositionStrip.vue",
      "utf8",
    );
    expect(source).toContain(`import { decode } from "${CODEC}"`);
    expect(source).not.toContain("encode");
  });
});
