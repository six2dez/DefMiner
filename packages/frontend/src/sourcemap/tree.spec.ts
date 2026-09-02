// packages/frontend/src/sourcemap/tree.spec.ts — the O-08 display normaliser,
// driven over the twenty-three measured `sources` labels.
//
// ===========================================================================
// THE IMPORT SET IS ASSERTED AS AN EQUALITY, NOT SEARCHED FOR AS A STRING
// ===========================================================================
// The prohibition this file exists to prove is "`tree.ts` does not reach the
// general-purpose path library". The obvious spelling — grep the source for
// `node:path` — is a list of the specifiers somebody thought of, and there are
// several (`path`, `node:path`, a re-export, a dynamic import, a default import
// of a shim). So the assertion is inverted: the module's specifier set must
// EQUAL `["../safety/display"]` and its named-import set must EQUAL
// `["forCellText"]`. An added import of any kind fails that equality without
// anyone having to think of the string it was written with, and the second
// equality is simultaneously the proof that `forCell` — the counting path that
// costs a 37,395 ms scroll on a 4 MiB value — is unreachable from here.
//
// Parsed with the TypeScript compiler rather than matched textually, the way
// `frontend-safety.spec.ts` already does, with a NON-VACUITY assertion on the
// visited node count: a walk that visited nothing would report an empty import
// set and pass for ever.
//
// ===========================================================================
// AND THE LOSSLESSNESS PROOF IS A ROUND TRIP
// ===========================================================================
// `schema.spec.ts`'s `COLUMN_ALLOWLIST` describes the model: the MUST-NOT-TOUCH
// half of a round-trip assertion, asserting byte-identity rather than absence
// of an obvious wrong implementation. Here it is cheap and total — the
// normaliser has no write path, so for every fixture the input row's verbatim
// string is asserted byte-identical after construction.

import { readFileSync } from "node:fs";

import {
  BIDI_OVERRIDES_ISOLATES as BIDI,
  C0_C1_CONTROLS as CONTROLS,
} from "@defminer/engine/sanitise";
import {
  SOURCES_LABEL_CASE_IDS,
  SOURCES_LABEL_CASES,
} from "@defminer/engine/sourcemap/map-fixture";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import {
  buildSourceTree,
  expandableKeys,
  flattenSourceTree,
  SOURCE_PATH_SHAPES,
  SOURCE_TREE_MAX_INDENT_DEPTH,
  SOURCE_TREE_NOTES,
  sourcePathShape,
} from "./tree";
import type {
  SourcePathShape,
  SourceTreeInputRow,
  SourceTreeNode,
  SourceTreeRow,
} from "./tree";

const TREE_MODULE = "packages/frontend/src/sourcemap/tree.ts";

/** The whole corpus as rows, in declaration order — which IS the map's own
 *  `sources` index order, and therefore the evidence. */
const LABEL_ROWS: readonly SourceTreeInputRow[] = SOURCES_LABEL_CASES.map(
  (labelCase, index) => ({
    sourceIndex: index,
    sourcesVerbatim: labelCase.value,
  }),
);

/** One row, at index 0, for a per-case assertion. */
const rowOf = (id: string): SourceTreeInputRow => {
  const found = SOURCES_LABEL_CASES.find((labelCase) => labelCase.id === id);
  if (found === undefined) {
    throw new Error(
      `map-fixture.ts no longer exports a case with id "${id}". This spec ` +
        `asserts over the corpus by NAME, so a rename must fail here rather ` +
        `than silently reduce what is covered.`,
    );
  }
  return { sourceIndex: 0, sourcesVerbatim: found.value };
};

/** Every node in a forest, depth first. */
function everyNode(
  nodes: readonly SourceTreeNode[],
): readonly SourceTreeNode[] {
  const out: SourceTreeNode[] = [];
  const walk = (list: readonly SourceTreeNode[]): void => {
    for (const node of list) {
      out.push(node);
      walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

/** The chain of labels from a root down to the first `source` node. */
function firstSourceChain(nodes: readonly SourceTreeNode[]): string[] {
  const chain: string[] = [];
  const walk = (list: readonly SourceTreeNode[]): boolean => {
    for (const node of list) {
      chain.push(node.label);
      if (node.kind === "source") return true;
      if (walk(node.children)) return true;
      chain.pop();
    }
    return false;
  };
  walk(nodes);
  return chain;
}

// ---------------------------------------------------------------------------
// THE TWO EXACT-SET IMPORT ASSERTIONS
// ---------------------------------------------------------------------------

type ImportFacts = {
  readonly specifiers: string[];
  readonly namesFromDisplay: string[];
  readonly visited: number;
};

function importFacts(): ImportFacts {
  const source = readFileSync(TREE_MODULE, "utf8");
  const file = ts.createSourceFile(
    TREE_MODULE,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const specifiers: string[] = [];
  const namesFromDisplay: string[] = [];
  let visited = 0;

  const visit = (node: ts.Node): void => {
    visited++;
    // Static imports, type-only imports and `export … from` all carry a module
    // specifier, and so does a dynamic `import()` call. All four are collected:
    // an equality over a set that only counted one of the four forms would be
    // an equality over a hole.
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const specifier = node.moduleSpecifier;
      if (specifier !== undefined && ts.isStringLiteral(specifier)) {
        specifiers.push(specifier.text);
        const clause = ts.isImportDeclaration(node)
          ? node.importClause
          : undefined;
        const bindings = clause?.namedBindings;
        if (bindings !== undefined && ts.isNamedImports(bindings)) {
          for (const element of bindings.elements) {
            namesFromDisplay.push(element.name.text);
          }
        }
        if (clause?.name !== undefined) {
          namesFromDisplay.push(`default as ${clause.name.text}`);
        }
      }
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      const first = node.arguments[0];
      specifiers.push(
        first !== undefined && ts.isStringLiteral(first)
          ? first.text
          : "<dynamic import with a non-literal specifier>",
      );
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require"
    ) {
      const first = node.arguments[0];
      specifiers.push(
        first !== undefined && ts.isStringLiteral(first)
          ? first.text
          : "<require with a non-literal specifier>",
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(file);

  return { specifiers, namesFromDisplay, visited };
}

describe("tree.ts imports NOTHING but the shipped text-only display path", () => {
  it("has EXACTLY one module specifier, and it is safety/display", () => {
    // T-07-01. `path.resolve` escaped on 5 of 22 measured fixtures and
    // `path.normalize` silently rewrote the RTL-override fixture into a bare
    // filename. Here the library is the hazard, and the absence of it is proved
    // by an equality rather than by a search.
    const facts = importFacts();
    expect(facts.specifiers).toEqual(["../safety/display"]);
  });

  it("takes EXACTLY `forCellText` from it — which is why forCell is unreachable", () => {
    // T-07-12. The counting path walks the whole value to compute `total`, a
    // number no tree node renders: 99 of 396 frames over the 32 ms budget and a
    // 37,395 ms scroll, against 0 of 396 and 4,010 ms. Pinning the NAME set is
    // what makes that unreachable rather than merely unused today.
    const facts = importFacts();
    expect(facts.namesFromDisplay).toEqual(["forCellText"]);
  });

  it("actually parsed the module — the non-vacuity half", () => {
    // A walk that visited nothing reports an empty specifier set and passes
    // both assertions above for ever. This is the assertion that would notice.
    const facts = importFacts();
    expect(facts.visited).toBeGreaterThan(200);
    expect(readFileSync(TREE_MODULE, "utf8")).toContain("buildSourceTree");
  });
});

// ---------------------------------------------------------------------------
// THE LOSSLESSNESS PROOF
// ---------------------------------------------------------------------------

describe("the normaliser has no write path — the round trip is byte-identical", () => {
  const exercised: string[] = [];

  it.each(SOURCES_LABEL_CASES.map((c) => [c.id, c.value] as const))(
    "%s builds a tree and leaves the stored string untouched",
    (id, value) => {
      const row: SourceTreeInputRow = {
        sourceIndex: 7,
        sourcesVerbatim: value,
      };
      const before = row.sourcesVerbatim;
      const tree = buildSourceTree([row]);

      // 1. IT DID NOT THROW, and it produced something renderable.
      expect(tree.length, `case ${id} produced no node at all`).toBeGreaterThan(
        0,
      );

      // 2. THE STORED STRING IS BYTE-IDENTICAL. Not "equivalent", not
      //    "normalises to the same thing" — the same bytes, in order, at the
      //    same length. This is the MUST-NOT-TOUCH half.
      expect(row.sourcesVerbatim, `case ${id} was rewritten`).toBe(before);
      expect(row.sourcesVerbatim).toBe(value);
      expect(String(row.sourcesVerbatim).length).toBe(value.length);

      // 3. AND THE INDEX SURVIVED, on every node the case produced. The label
      //    is never the identity; this is.
      for (const node of everyNode(tree)) {
        expect(node.sourcesIndex, `case ${id} lost its index`).toBe(7);
      }

      exercised.push(id);
    },
  );

  it("exercised EVERY label case in the fixture module", () => {
    expect([...exercised].sort()).toEqual([...SOURCES_LABEL_CASE_IDS].sort());
  });

  it("leaves the whole corpus untouched when built as one tree", () => {
    // The per-case loop builds one row at a time; this builds all twenty-three
    // together, which is the shape the drill-down actually calls, and asserts
    // the same property over the whole array.
    const copies = SOURCES_LABEL_CASES.map((labelCase) => labelCase.value);
    buildSourceTree(LABEL_ROWS);
    expect(LABEL_ROWS.map((row) => row.sourcesVerbatim)).toEqual(copies);
  });
});

// ---------------------------------------------------------------------------
// STEP 1 — CLASSIFY, DO NOT REPAIR
// ---------------------------------------------------------------------------

describe("step 1 — the shape is classified and never repaired", () => {
  it("classifies each measured shape as SPIKE-12 enumerated it", () => {
    expect(sourcePathShape("webpack:///./src/app.js")).toBe("protocol");
    expect(sourcePathShape("file:///etc/defminer-escape.txt")).toBe("protocol");
    expect(sourcePathShape("http://evil.example/app.js")).toBe("protocol");
    expect(sourcePathShape("/etc/defminer-escape.txt")).toBe("absolute-posix");
    expect(sourcePathShape("C:\\Windows\\Temp\\x.txt")).toBe("windows-drive");
    expect(sourcePathShape("\\\\server\\share\\x.txt")).toBe("windows-unc");
    expect(sourcePathShape("src/app/index.js")).toBe("relative");
    // THE PERCENT-ENCODED ONE IS RELATIVE, AND THAT IS THE POINT. The prefix
    // rule ACCEPTS it: `..%2f..%2f` is not a separator to anything here, so it
    // renders as one honest leaf rather than being decoded into a climb the
    // developer did not write.
    expect(sourcePathShape("..%2f..%2fdefminer-escape.txt")).toBe("relative");
  });

  it("covers every member of the closed shape list", () => {
    const seen = new Set<SourcePathShape>(
      [
        "webpack:///./src/app.js",
        "/etc/x",
        "C:\\Windows\\x",
        "\\\\server\\share\\x",
        "src/app.js",
      ].map(sourcePathShape),
    );
    expect([...seen].sort()).toEqual([...SOURCE_PATH_SHAPES].sort());
  });

  it("puts each shape under its own synthetic display root", () => {
    const tree = buildSourceTree([
      { sourceIndex: 0, sourcesVerbatim: "webpack:///./src/app.js" },
      { sourceIndex: 1, sourcesVerbatim: "/etc/x.js" },
      { sourceIndex: 2, sourcesVerbatim: "C:\\Windows\\x.js" },
      { sourceIndex: 3, sourcesVerbatim: "\\\\server\\share\\x.js" },
      { sourceIndex: 4, sourcesVerbatim: "src/app.js" },
    ]);
    expect(tree.map((node) => node.label)).toEqual([
      "webpack:",
      "/",
      "C:",
      "\\\\",
      "src",
    ]);
    expect(tree.map((node) => node.kind)).toEqual([
      "root",
      "root",
      "root",
      "root",
      "directory",
    ]);
  });
});

// ---------------------------------------------------------------------------
// STEP 2 — BOTH SEPARATORS
// ---------------------------------------------------------------------------

describe("step 2 — a Windows-authored entry is not one enormous leaf", () => {
  it("splits on the backslash as well as the forward slash", () => {
    const tree = buildSourceTree([rowOf("windows-drive")]);
    expect(firstSourceChain(tree)).toEqual([
      "C:",
      "Windows",
      "Temp",
      "defminer-escape.txt",
    ]);
  });

  it("splits a UNC path under its own root", () => {
    const tree = buildSourceTree([rowOf("windows-unc")]);
    expect(firstSourceChain(tree)).toEqual([
      "\\\\",
      "server",
      "share",
      "defminer-escape.txt",
    ]);
  });

  it("is display-only — the verbatim string still carries its backslashes", () => {
    const row = rowOf("windows-drive");
    buildSourceTree([row]);
    expect(row.sourcesVerbatim).toContain("\\");
  });
});

// ---------------------------------------------------------------------------
// STEP 3 — CLAMPED AT THE ROOT AND MARKED
// ---------------------------------------------------------------------------

describe("step 3 — climbs are resolved, bounded at the root, and MARKED", () => {
  it("renders a climb past the root as a visible node, never as its final segment", () => {
    // THE TRAVERSAL FIXTURE. `path.resolve` escapes on this one. Here it
    // renders `etc/defminer-escape.txt` — a chain of two under the implicit
    // root, NOT the bare filename a rewrite would have produced.
    const tree = buildSourceTree([rowOf("relative-traversal")]);
    const chain = firstSourceChain(tree);
    expect(chain).toEqual(["etc", "defminer-escape.txt"]);
    expect(chain.length).toBeGreaterThan(1);

    const leaf = everyNode(tree).find((node) => node.kind === "source");
    expect(leaf?.climbs).toBe(6);
    expect(leaf?.clampedClimbs).toBe(6);
    expect(leaf?.degraded).toBe(true);
    expect(leaf?.notes).toContain("path-clamped");
  });

  it("marks the RTL-override fixture, and strips every bidi codepoint from every label", () => {
    // SPIKE-12 #18, the documented `path.normalize` CORRUPTION case: it
    // rewrites this entry to `defminer-escape.txt` with the RTL run CONSUMED
    // and the climbs FOLLOWED. Here the climbs are resolved and COUNTED, and
    // the bidi codepoints are stripped from the label rather than from the
    // stored string.
    const row = rowOf("unicode-rtl-override");
    const tree = buildSourceTree([row]);

    for (const node of everyNode(tree)) {
      expect(node.label.includes("\u202E")).toBe(false);
      expect(node.label.replace(BIDI, "")).toBe(node.label);
    }

    const leaf = everyNode(tree).find((node) => node.kind === "source");
    expect(leaf?.climbs).toBeGreaterThan(0);
    expect(leaf?.degraded).toBe(true);
    expect(leaf?.notes).toContain("path-clamped");
    // The position REFLECTS the climb: the leaf sits at the root, where the two
    // climbs left it, rather than under `sub/`.
    expect(firstSourceChain(tree)).toEqual(["defminer-escape.txt"]);
    // AND THE STORED STRING STILL CARRIES THE OVERRIDE. That is the evidence.
    expect(String(row.sourcesVerbatim).includes("\u202E")).toBe(true);
  });

  it("does not mark a benign path — the corpus control", () => {
    // A corpus in which every case fires proves only that the check fires.
    const tree = buildSourceTree([rowOf("benign-control")]);
    for (const node of everyNode(tree)) {
      expect(node.degraded).toBe(false);
      expect(node.notes).toEqual([]);
      expect(node.climbs).toBe(0);
      expect(node.clampedClimbs).toBe(0);
    }
    expect(firstSourceChain(tree)).toEqual(["src", "app", "index.js"]);
  });

  it("survives the degenerate cases with a defined outcome", () => {
    for (const id of ["empty", "dot-only"]) {
      const tree = buildSourceTree([rowOf(id)]);
      expect(tree.length, `${id} produced no node`).toBe(1);
      expect(tree[0]?.kind).toBe("source");
      expect(tree[0]?.label).toBe("");
      expect(tree[0]?.sourcesIndex).toBe(0);
    }
  });

  it("renders a null verbatim as a node rather than dropping the row", () => {
    // A row that vanishes from the tree is a row the operator believes does not
    // exist. The index is still openable.
    const tree = buildSourceTree([{ sourceIndex: 41, sourcesVerbatim: null }]);
    expect(tree.length).toBe(1);
    expect(tree[0]?.sourcesIndex).toBe(41);
  });
});

// ---------------------------------------------------------------------------
// STEP 4 — SANITISE EACH SEGMENT
// ---------------------------------------------------------------------------

describe("step 4 — every SEGMENT goes through the text-only display path", () => {
  it("removes the NUL byte from the label and keeps it in the evidence", () => {
    const row = rowOf("null-byte");
    const tree = buildSourceTree([row]);
    for (const node of everyNode(tree)) {
      expect(node.label.replace(CONTROLS, "")).toBe(node.label);
    }
    expect(String(row.sourcesVerbatim).replace(CONTROLS, "")).not.toBe(
      row.sourcesVerbatim,
    );
  });

  it("cuts the 4 KB label and says so", () => {
    const tree = buildSourceTree([rowOf("four-kilobyte-label")]);
    const leaf = everyNode(tree).find((node) => node.kind === "source");
    expect(leaf?.label.length).toBeLessThan(4096);
    expect(leaf?.notes).toContain("label-truncated");
    expect(leaf?.degraded).toBe(true);
  });

  it("does not claim a short label was truncated", () => {
    const tree = buildSourceTree([rowOf("benign-control")]);
    for (const node of everyNode(tree)) {
      expect(node.notes).not.toContain("label-truncated");
    }
  });

  it("uses only the two closed notes", () => {
    const tree = buildSourceTree(LABEL_ROWS);
    for (const node of everyNode(tree)) {
      for (const note of node.notes) {
        expect([...SOURCE_TREE_NOTES]).toContain(note);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// STEP 5 — DISAMBIGUATE BY POSITION, NEVER BY RENAMING
// ---------------------------------------------------------------------------

describe("step 5 — duplicates keep their distinction", () => {
  it("keeps the NFD and the NFC spelling as TWO sibling nodes", () => {
    // Collapsing them would destroy two genuinely distinct source files into
    // one node. No Unicode normalisation happens here and none may be added.
    const tree = buildSourceTree([
      rowOf("unicode-nfc"),
      { ...rowOf("unicode-nfd"), sourceIndex: 1 },
    ]);
    expect(tree.length).toBe(2);
    expect(tree[0]?.label).not.toBe(tree[1]?.label);
    expect(tree.map((node) => node.sourcesIndex)).toEqual([0, 1]);
    // They RENDER identically, which is exactly why the index has to be shown.
    expect(tree[0]?.label.normalize("NFC")).toBe(
      tree[1]?.label.normalize("NFC"),
    );
  });

  it("keeps a case-only pair as TWO sibling nodes", () => {
    const tree = buildSourceTree([
      rowOf("case-lower"),
      { ...rowOf("case-upper"), sourceIndex: 1 },
    ]);
    expect(tree.length).toBe(2);
    expect(tree[0]?.label).toBe("srcdir");
    expect(tree[1]?.label).toBe("SRCDIR");
    expect(tree.map((node) => node.sourcesIndex)).toEqual([0, 1]);
  });

  it("marks BOTH siblings when two leaves share a display label", () => {
    // Both or neither: the index suffix is only meaningful as a distinction.
    const tree = buildSourceTree([
      { sourceIndex: 0, sourcesVerbatim: "src/app.js" },
      { sourceIndex: 1, sourcesVerbatim: "src/app.js" },
      { sourceIndex: 2, sourcesVerbatim: "src/other.js" },
    ]);
    const leaves = everyNode(tree).filter((node) => node.kind === "source");
    expect(leaves.map((node) => node.label)).toEqual([
      "app.js",
      "app.js",
      "other.js",
    ]);
    expect(leaves.map((node) => node.duplicate)).toEqual([true, true, false]);
    expect(leaves.map((node) => node.sourcesIndex)).toEqual([0, 1, 2]);
  });

  it("merges a directory on a BYTE-IDENTICAL label and on nothing weaker", () => {
    const tree = buildSourceTree([
      { sourceIndex: 0, sourcesVerbatim: "src/a.js" },
      { sourceIndex: 1, sourcesVerbatim: "src/b.js" },
    ]);
    expect(tree.length).toBe(1);
    expect(tree[0]?.children.length).toBe(2);
    // The directory carries the FIRST row that created it.
    expect(tree[0]?.sourcesIndex).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// ORDERING AND DEPTH
// ---------------------------------------------------------------------------

describe("ordering is the map's own index, within every parent", () => {
  it("is strictly ascending by sourcesIndex among siblings", () => {
    const tree = buildSourceTree(LABEL_ROWS);
    const check = (list: readonly SourceTreeNode[]): void => {
      let previous = -1;
      for (const node of list) {
        expect(node.sourcesIndex).toBeGreaterThan(previous);
        previous = node.sourcesIndex;
        check(node.children);
      }
    };
    check(tree);
  });

  it("is deterministic — the same rows build the same keys and labels twice", () => {
    const once = everyNode(buildSourceTree(LABEL_ROWS));
    const twice = everyNode(buildSourceTree(LABEL_ROWS));
    expect(once.map((node) => `${node.key}:${node.label}`)).toEqual(
      twice.map((node) => `${node.key}:${node.label}`),
    );
  });
});

describe("the flattened list, and the indent cap", () => {
  const deep = (segments: number): SourceTreeInputRow => ({
    sourceIndex: 0,
    sourcesVerbatim: Array.from(
      { length: segments },
      (_, i) => `d${String(i)}`,
    ).join("/"),
  });

  it("caps the indent at eight levels while keeping the real depth", () => {
    const tree = buildSourceTree([deep(14)]);
    const rows = flattenSourceTree(tree, expandableKeys(tree));

    const atEight: SourceTreeRow | undefined = rows.find(
      (row) => row.depth === 8,
    );
    const atNine: SourceTreeRow | undefined = rows.find(
      (row) => row.depth === 9,
    );
    expect(atEight).toBeDefined();
    expect(atNine).toBeDefined();
    expect(atEight?.indentDepth).toBe(SOURCE_TREE_MAX_INDENT_DEPTH);
    expect(atNine?.indentDepth).toBe(SOURCE_TREE_MAX_INDENT_DEPTH);
    expect(atNine?.indentDepth).toBe(atEight?.indentDepth);
    // THE NODE IS STILL THERE, at its real depth. Only the leading whitespace
    // stopped growing.
    expect(atNine?.depth).toBe(9);
    expect(rows.length).toBe(14);
  });

  it("omits a collapsed node's children rather than hiding them", () => {
    // `RecycleScroller` computes geometry from the item COUNT, so a row it must
    // not paint is a row it must not be handed.
    const tree = buildSourceTree([
      { sourceIndex: 0, sourcesVerbatim: "src/deep/app.js" },
    ]);
    expect(flattenSourceTree(tree, new Set()).length).toBe(1);
    expect(flattenSourceTree(tree, expandableKeys(tree)).length).toBe(3);
  });

  it("flattens the whole corpus without throwing", () => {
    const tree = buildSourceTree(LABEL_ROWS);
    const rows = flattenSourceTree(tree, expandableKeys(tree));
    expect(rows.length).toBeGreaterThanOrEqual(SOURCES_LABEL_CASES.length);
    expect(new Set(rows.map((row) => row.node.key)).size).toBe(rows.length);
  });
});
