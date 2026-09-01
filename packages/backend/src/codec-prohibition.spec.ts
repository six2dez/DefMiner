// packages/backend/src/codec-prohibition.spec.ts — D-17's wired gate.
//
// THE RULE: no non-spec module the plugin SHIPS under `packages/backend/src` or
// `packages/engine/src` may import `@jridgewell/sourcemap-codec`, in any
// specifier form and in any import shape.
//
// ===========================================================================
// WHY THE BAN EXISTS: A MEASURED STALL, NOT A STYLE PREFERENCE
// ===========================================================================
// SPIKE-06 measured `vlq_decode` at 167 ms on an 8.3 MB `mappings` string
// against a 25 ms slice budget, and `decode()` consumes the WHOLE string in one
// call — there is no cursor, no generator and no partial result, so it cannot be
// chunked to fit inside a slice. 167 ms of blocked QuickJS is 167 ms in which
// live browsing is not being proxied. D-16 answers that by moving the decode to
// the browser, where the operator's own tab pays for it; this file is what stops
// the decode coming back.
//
// THE BAN IS ON THE CAPABILITY, NOT ON THE USAGE. There is no
// is-this-a-big-map-or-a-small-one judgement left to get wrong, and no
// maintained list of which modules count as "the primary path" — a boundary a
// refactor can quietly move is the weaker kind of gate. MAP-02's "no VLQ
// decoding on the primary path" becomes a mechanical property of the source
// tree, checked on every commit.
//
// ===========================================================================
// WHY THIS IS A SIBLING RATHER THAN MORE ENTRIES IN AN EXISTING RULES RECORD
// ===========================================================================
// `outbound-prohibition.spec.ts`'s `FORBIDDEN_OUTBOUND` is a CORE-11 vocabulary
// about outbound network traffic. `filesystem-prohibition.spec.ts`'s
// `FORBIDDEN_FILESYSTEM` answers DEPLOY-03/04 about server disk. What is banned
// here answers MAP-03, and it is banned for a third reason again: not "traffic
// this plugin generates is invisible to it", not "anything written to server
// disk is permanent", but "a decode this thread cannot interrupt is a stall the
// operator experiences as the proxy going away". One record holding all three
// would make each list a set of things-we-do-not-do rather than a statement of
// one requirement.
//
// This is the FOURTH member of that family and it copies the SAME shape from
// `filesystem-prohibition.spec.ts`, which says in its own header that it copied
// it from `outbound-prohibition.spec.ts`, which copied it from
// `store/sql-discipline.spec.ts`: same walk skeleton, same POSIX source-root
// enumeration, same by-name non-vacuity block, same firing-and-legal fixture
// pair per rule, same pure `auditSource(file, source)`.
//
// ===========================================================================
// `packages/engine/src` IS IN SCOPE, AND THAT IS NOT OPTIONAL
// ===========================================================================
// `@defminer/engine` is a `workspace:*` dependency of BOTH `@defminer/backend`
// and `@defminer/frontend`. A codec import placed in the engine would satisfy
// "the decode runs in the frontend" BY ACCIDENT — the frontend would indeed
// reach it — while shipping the codec into the backend bundle at the same time,
// where the stall this ban exists to prevent is exactly what would happen. The
// engine is where a "just decode the mappings here, it's shared code" line goes,
// and `packages/engine/src/sourcemap/` — this phase's own new subsystem — is the
// single most likely place in the tree for that line to appear.
//
// ===========================================================================
// NO OTHER GATE CAN SEE THIS DEFECT, AND THAT IS MEASURED
// ===========================================================================
// `scripts/ci/check-bundle-imports.mjs` reads import SPECIFIERS out of the BUILT
// bundle. SPIKE-06 measured that this codec is FULLY BUNDLED under Caido's own
// build — it is not externalised, so the built artifact contains the codec's
// CODE and emits NO SPECIFIER for it at all. That gate is therefore silent on a
// backend codec import BY CONSTRUCTION, in the register
// `scan/httpql-discipline.spec.ts` uses for the same shape: it would not fire
// late, it would not fire. That is the sharpest argument for this file existing.
//
// AND `packages/frontend/externals.mjs` MUST NOT BE EDITED TO CLOSE THE GAP, for
// the opposite reason. Marking the codec external would leave it as a bare
// import Caido cannot resolve, and the plugin would fail at runtime on the
// operator's machine — which is precisely the inverse defect
// `scripts/ci/frontend-externals.mjs`'s second rule exists to catch. Neither
// file is modified by this plan and `git diff --exit-code` asserts it.
//
// ===========================================================================
// WHY AN AST WALK AND NOT A TEXT SCAN, AND IT IS LOAD-BEARING IN THIS FILE
// ===========================================================================
// This file names `@jridgewell/sourcemap-codec` dozens of times — in prose, in a
// constant, and inside fixture string literals that are themselves import
// statements. A substring scan would fail on its own documentation, and the only
// way to make it pass would be deleting the reasoning: precisely backwards. The
// self-audit case below asserts the mechanical proof on this very file.
//
// A regex would also miss a template spanning a line break, an
// `export ... from`, an `import ... = require()` and a dynamic `import()` whose
// argument sits on the next line — the shapes prettier is most likely to produce
// in this package.
//
// ===========================================================================
// THE BOUNDARY THIS INHERITS, AND ITS BOUND
// ===========================================================================
// The walk SKIPS `.spec.ts`, exactly as its three parents do and for the same
// reason: it is what lets this file's own fixtures — which necessarily contain
// the forbidden shapes as source text — live inline with no temp file and no
// stray module for `tsc --build` to trip over. IT COSTS SOMETHING REAL: a spec
// file could import the codec unnoticed. That residual is smaller here than it
// is for the filesystem ban, because a spec never enters the shipped bundle and
// therefore never runs on the proxy thread, which is the only thing D-17 is
// about.

import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { posix } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * THE SOURCE ROOTS THE PLUGIN SHIPS — the same two `outbound-prohibition.spec.ts`
 * and `filesystem-prohibition.spec.ts` enumerate, and DUPLICATED RATHER THAN
 * IMPORTED for the mechanical reason those files give: importing a symbol from a
 * spec module EXECUTES it, registering its whole suite a second time under this
 * file's name. The duplication is held honest by the agreement assertion below,
 * which reads the parent's own declaration off disk.
 */
const SOURCE_ROOTS: readonly string[] = Object.freeze([
  "packages/backend/src",
  "packages/engine/src",
]);

const BACKEND_SRC = SOURCE_ROOTS[0];

/** This file, as the walk names it — the subject of the self-audit case. */
const SELF = posix.join(BACKEND_SRC, "codec-prohibition.spec.ts");

/** The parent gate, read for the source-root agreement assertion. */
const OUTBOUND_GATE = posix.join(BACKEND_SRC, "outbound-prohibition.spec.ts");

// ---------------------------------------------------------------------------
// THE SPECIFIER AXIS, DERIVED FROM THE PACKAGE'S OWN `exports` MAP
// ---------------------------------------------------------------------------

/** The one package name. A rename is one edit, everywhere. */
export const CODEC_PACKAGE = "@jridgewell/sourcemap-codec";

/**
 * The subpaths the package DELIBERATELY EXPORTS, read out of its own manifest.
 *
 * ENUMERATING THESE BY HAND IS WHERE ONE SPELLING GOES MISSING, and this package
 * has an unusually rich map for its size: `"."` is an ARRAY whose second member
 * is a bare `"./dist/sourcemap-codec.umd.js"` — a second, deliberately reachable
 * path for bundlers that do not understand conditions — beside the condition
 * object naming `.mjs`, `.d.mts` and `.d.cts`. Reading the manifest means the
 * axis tracks the package instead of tracking whoever last edited this list.
 */
function exportedSubpaths(manifestPath: string): readonly string[] {
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
  const found = new Set<string>();
  const take = (value: string): void => {
    if (value.startsWith("./") && value !== "./") found.add(value.slice(2));
  };
  const walk = (node: unknown): void => {
    if (typeof node === "string") {
      take(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const member of node) walk(member);
      return;
    }
    if (typeof node === "object" && node !== null) {
      for (const [key, value] of Object.entries(node)) {
        take(key);
        walk(value);
      }
    }
  };
  walk((manifest as { exports?: unknown }).exports);
  return Object.freeze([...found].sort());
}

const CODEC_MANIFEST = createRequire(import.meta.url).resolve(
  `${CODEC_PACKAGE}/package.json`,
);

const CODEC_SUBPATHS = exportedSubpaths(CODEC_MANIFEST);

/**
 * Every specifier form of the codec: the bare name plus each exported subpath.
 *
 * BANNING ONE SPELLING OF A CAPABILITY IS BANNING NOTHING, which is the lesson
 * `filesystem-prohibition.spec.ts` records for `fs` / `node:fs` / `llrt/fs`. This
 * list is the FIXTURE AXIS; the MATCHER below is wider still and covers any
 * subpath at all, exported or not, because a deep import into `src/` is a
 * reachable spelling that no `exports` map can be trusted to have closed.
 */
export const CODEC_SPECIFIER_LIST: readonly string[] = Object.freeze([
  CODEC_PACKAGE,
  ...CODEC_SUBPATHS.map((subpath) => `${CODEC_PACKAGE}/${subpath}`),
]);

/** Is this specifier the codec, in any spelling? Prefix, not membership. */
function isCodecSpecifier(specifier: string): boolean {
  return (
    specifier === CODEC_PACKAGE || specifier.startsWith(`${CODEC_PACKAGE}/`)
  );
}

type CodecRule = Readonly<{ rule: string; surface: string; why: string }>;

/**
 * The rule set as DATA a reader can enumerate rather than logic they must trace,
 * KEYED BY RULE ID — the shape `outbound-prohibition.spec.ts` adopted so that
 * `add()`'s lookup is TOTAL BY CONSTRUCTION: `RuleId` is `keyof typeof RULES`, a
 * typo is a compile error, and there is no `no such rule` branch left over that
 * no test could ever execute. The `why` travels with the violation into the
 * failure message, which is the difference between a gate that explains itself at
 * 2am and a bare rule id.
 */
const RULES = Object.freeze({
  "codec-import": Object.freeze({
    rule: "codec-import",
    surface: `an import of \`${CODEC_PACKAGE}\`, or of any subpath of it`,
    why:
      "MAP-03 moves the VLQ decode to the browser because SPIKE-06 MEASURED vlq_decode at " +
      "167 ms on an 8.3 MB mappings string against a 25 ms slice, and decode() consumes the " +
      "whole string in one call so it cannot be chunked to fit. 167 ms of blocked QuickJS is " +
      "167 ms in which live browsing is not being proxied. THE BAN IS ON THE CAPABILITY " +
      "RATHER THAN THE USAGE, so there is no is-this-a-big-map judgement left to get wrong " +
      "and no maintained list of which modules are the primary path — a boundary a refactor " +
      "can quietly move is the weaker kind of gate. AND NO OTHER GATE CAN SEE THIS: " +
      "scripts/ci/check-bundle-imports.mjs reads import SPECIFIERS out of the built bundle, " +
      "and SPIKE-06 measured this codec is FULLY BUNDLED under Caido's own build — a bundled " +
      "dependency emits no specifier at all, so that gate is silent here BY CONSTRUCTION. Do " +
      "NOT close the gap by adding the codec to packages/frontend/externals.mjs: marking it " +
      "external leaves a bare import Caido cannot resolve and the plugin fails at runtime on " +
      "the operator's machine, which is the inverse defect frontend-externals.mjs exists to " +
      "catch. The codec belongs to packages/frontend, where plan 07-08's viewer imports it.",
  }),
});

type RuleId = keyof typeof RULES;

/**
 * The same rule set as an ARRAY, for readers and for the enumeration assertion.
 * Derived from `RULES` so the two cannot disagree about what the gate enforces —
 * never a hand-maintained parallel list.
 */
export const FORBIDDEN_CODEC: readonly CodecRule[] = Object.freeze(
  Object.values(RULES),
);

type Violation = { file: string; rule: RuleId; detail: string };

// ---------------------------------------------------------------------------
// THE FILE SET
// ---------------------------------------------------------------------------

/**
 * Every non-spec module the plugin SHIPS, under either source root, at any depth.
 *
 * ONE PATH CONVENTION, POSIX, END TO END, copied from the parent gates for the
 * reason their headers give: paths built with the platform separator and then
 * compared against a hard-coded `/` work on this host and make every by-name
 * assertion below silently stop matching on a non-POSIX one — and a gate that
 * quietly matches nothing is the same defect as a gate that quietly scans nothing.
 */
function shippedFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = posix.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".spec.ts")
      ) {
        out.push(full);
      }
    }
  };
  for (const root of SOURCE_ROOTS) walk(root);
  return out.sort();
}

/** How many times does `needle` occur in `haystack`? Non-overlapping. */
function occurrences(haystack: string, needle: string): number {
  let count = 0;
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    count += 1;
    at = haystack.indexOf(needle, at + needle.length);
  }
  return count;
}

// ---------------------------------------------------------------------------
// THE WALK
// ---------------------------------------------------------------------------

/**
 * Strip the wrappers that hide an expression from a syntactic match.
 *
 * `(SPEC as string)` is an `AsExpression` where a bare identifier was expected,
 * and that single wrapper is enough to make a naive match miss. Parens, `as`,
 * `satisfies`, `!` and the legacy `<T>x` assertion all mean "the same value,
 * differently typed", so all five unwrap.
 */
function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  for (;;) {
    if (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isTypeAssertionExpression(current)
    ) {
      current = current.expression;
      continue;
    }
    return current;
  }
}

/**
 * The assignment operators that BIND a value to the name on their left.
 *
 * Named rather than quantified over, and the three logical spellings are in the
 * set because `outbound-prohibition.spec.ts` MEASURED what leaving them out
 * costs: the `??=` spelling grew nothing while the `=` spelling two characters
 * away reported. The NUMERIC compound assignments are deliberately absent — they
 * bind a number whatever their right-hand side was.
 */
const ASSIGNING_OPERATORS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
]);

const NO_LITERALS: ReadonlySet<string> = new Set<string>();

/**
 * Audit one source file.
 *
 * PURE — takes text, returns findings — which is what makes every fixture below
 * possible without touching the filesystem, and what lets the failing path of
 * every rule actually RUN. A gate whose failure path has never run is a gate
 * nobody has tested; the rule this package settled on is a firing fixture AND a
 * legal fixture for every rule, both executed.
 */
export function auditSource(file: string, source: string): Violation[] {
  const base = file.split("/").pop() ?? file;
  const violations: Violation[] = [];

  const add = (rule: RuleId, where: string): void => {
    const surface = RULES[rule];
    violations.push({
      file: base,
      rule,
      detail: `${where} — ${surface.surface}. ${surface.why}`,
    });
  };

  const sf = ts.createSourceFile(
    base,
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  );

  // --- pass 1: collect string bindings, in document order -------------------
  //
  // NO SYMBOL TABLE IS BUILT. Bindings are file-wide rather than scope-aware and
  // the set is only ever grown, so it OVER-approximates — the fail-closed
  // direction — and a two-hop chain resolves for free because the first hop is
  // already bound when the second is read.

  const constStrings = new Map<string, Set<string>>();

  const bindString = (name: string, literal: string): void => {
    const bound = constStrings.get(name);
    if (bound === undefined) constStrings.set(name, new Set([literal]));
    else bound.add(literal);
  };

  const literalsOf = (node: ts.Node | undefined): ReadonlySet<string> => {
    if (node === undefined) return NO_LITERALS;
    const inner = unwrap(node as ts.Expression);
    if (ts.isStringLiteralLike(inner) && !ts.isTemplateExpression(inner)) {
      return new Set([inner.text]);
    }
    if (ts.isIdentifier(inner)) {
      return constStrings.get(inner.text) ?? NO_LITERALS;
    }
    return NO_LITERALS;
  };

  /**
   * The SINGLE-valued string reader a specifier needs: one binding resolves, two
   * or more answer `undefined`, and `undefined` means COULD NOT READ at every
   * call site.
   */
  const literalOf = (node: ts.Node | undefined): string | undefined => {
    const literals = literalsOf(node);
    if (literals.size !== 1) return undefined;
    for (const only of literals) return only;
    return undefined;
  };

  const collect = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer !== undefined &&
      ts.isIdentifier(node.name)
    ) {
      const init = unwrap(node.initializer);
      if (ts.isStringLiteralLike(init)) bindString(node.name.text, init.text);
    }
    if (
      ts.isBinaryExpression(node) &&
      ASSIGNING_OPERATORS.has(node.operatorToken.kind) &&
      ts.isIdentifier(node.left)
    ) {
      const right = unwrap(node.right);
      if (ts.isStringLiteralLike(right)) bindString(node.left.text, right.text);
    }
    ts.forEachChild(node, collect);
  };
  collect(sf);

  // --- pass 2: apply the rules to the bindings pass 1 produced ---------------

  const importShapeOf = (node: ts.ImportDeclaration): string => {
    if (node.importClause === undefined) return "a side-effect import";
    if (node.importClause.isTypeOnly) return "a type-only import";
    const bindings = node.importClause.namedBindings;
    if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
      return "a namespace import";
    }
    return "a value import";
  };

  const reportSpecifier = (how: string, node: ts.Node | undefined): void => {
    const specifier = literalOf(node);
    if (specifier !== undefined && isCodecSpecifier(specifier)) {
      add("codec-import", `${how} of \`${specifier}\``);
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      reportSpecifier(importShapeOf(node), node.moduleSpecifier);
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      reportSpecifier("an `export ... from`", node.moduleSpecifier);
    }
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      reportSpecifier(
        "an `import ... = require()`",
        node.moduleReference.expression,
      );
    }
    if (ts.isCallExpression(node)) {
      const callee = unwrap(node.expression);
      if (callee.kind === ts.SyntaxKind.ImportKeyword) {
        reportSpecifier("a dynamic import()", node.arguments[0]);
      } else if (ts.isIdentifier(callee) && callee.text === "require") {
        reportSpecifier("a require()", node.arguments[0]);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return violations;
}

// ---------------------------------------------------------------------------
// THE REAL TREE
// ---------------------------------------------------------------------------
describe(`MAP-03 — no VLQ codec is reachable from ${SOURCE_ROOTS.join(" or ")}`, () => {
  // BOUND ONCE, AND EVERY CASE BELOW READS THIS BINDING. Two filesystem walks
  // would mean the assertions that say "the scan is not empty and contains these
  // files" were made against a DIFFERENT array than the per-file cases iterate.
  const files = shippedFiles();

  it("enumerates a NON-EMPTY set of shipped modules, BY NAME, ACROSS BOTH ROOTS", () => {
    expect(
      files.length,
      `no .ts modules found under ${SOURCE_ROOTS.join(" or ")}`,
    ).toBeGreaterThan(0);
    for (const expected of [
      "index.ts",
      "lifecycle.ts",
      "scan/producer.ts",
      // The engine, named so a package split or a moved module is a loud failure
      // rather than a quietly halved scan.
      "pipeline.ts",
      "decode.ts",
      // THIS PHASE'S OWN SUBJECT, and the reason this plan depends on 07-02. A
      // walk that ran before `packages/engine/src/sourcemap/` existed would have
      // passed without ever visiting the modules D-17 is actually about, and a
      // non-vacuity block that names only SHIPPED modules would not have
      // noticed. `parse.ts` in particular is the module that already handles
      // `sources` and `mappings`, so it is where a decode call goes.
      "sourcemap/parse.ts",
      "sourcemap/announce.ts",
    ]) {
      expect(
        files.some((f) => f.endsWith(`/${expected}`)),
        `${expected} is not being audited`,
      ).toBe(true);
    }
  });

  it("every root contributes at least one file to the scan", () => {
    for (const root of SOURCE_ROOTS) {
      expect(
        files.filter((f) => f.startsWith(`${root}/`)).length,
        `no file under ${root} reached the scan`,
      ).toBeGreaterThan(0);
    }
  });

  it("scans the SAME roots the outbound gate does, read off that file rather than assumed", () => {
    const parent = readFileSync(OUTBOUND_GATE, "utf8");
    const start = parent.indexOf("export const SOURCE_ROOTS");
    expect(
      start,
      "outbound-prohibition.spec.ts no longer declares SOURCE_ROOTS, so this agreement check is vacuous",
    ).toBeGreaterThan(-1);
    const block = parent.slice(start, parent.indexOf("]);", start));
    for (const root of SOURCE_ROOTS) {
      expect(block, `${root} is not in the outbound gate's roots`).toContain(
        `"${root}"`,
      );
    }
    expect(occurrences(block, '"packages/')).toBe(SOURCE_ROOTS.length);
  });

  it.each(files)("%s imports no VLQ codec", (file) => {
    const violations = auditSource(file, readFileSync(file, "utf8"));
    expect(
      violations.map((v) => `${v.rule}: ${v.detail}`),
      `${file} imports ${CODEC_PACKAGE}, which D-17 forbids in every module the plugin ships — ${SOURCE_ROOTS.join(" and ")}`,
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// THE RULE'S FAILING PATH, EXECUTED — plus the legal shape it must stay quiet on
// ---------------------------------------------------------------------------

const rulesOf = (src: string, file = "fixture.ts"): string[] =>
  auditSource(file, src).map((v) => v.rule);

describe("the gate's own failure path, executed", () => {
  it("codec-import fires on a default import of the bare specifier", () => {
    expect(rulesOf(`import decode from "${CODEC_PACKAGE}";`)).toEqual([
      "codec-import",
    ]);
  });

  it("stays QUIET on a neighbouring package whose name shares the scope", () => {
    // EXACT, not a prefix: `@jridgewell/trace-mapping` is a real package in this
    // lockfile and is not the codec.
    expect(
      rulesOf('import { TraceMap } from "@jridgewell/trace-mapping";'),
    ).toEqual([]);
  });

  it("FORBIDDEN_CODEC is DERIVED from RULES and cannot disagree with it", () => {
    expect(FORBIDDEN_CODEC.map((r) => r.rule).sort()).toEqual(
      Object.keys(RULES).sort(),
    );
    expect(Object.isFrozen(FORBIDDEN_CODEC)).toBe(true);
    for (const rule of FORBIDDEN_CODEC) {
      expect(Object.isFrozen(rule)).toBe(true);
      expect(
        rule.surface.length,
        `${rule.rule} has no surface`,
      ).toBeGreaterThan(0);
      expect(rule.why.length, `${rule.rule} has no why`).toBeGreaterThan(0);
    }
  });

  it("the specifier axis is DERIVED from the package's own exports map", () => {
    // NON-VACUITY OF THE DERIVATION ITSELF. If the manifest read ever returns
    // nothing — a moved package, a changed exports shape — the axis would
    // silently collapse to the bare name and the cross product in task 2 would
    // shrink without saying so.
    expect(
      CODEC_SUBPATHS.length,
      `${CODEC_MANIFEST} declares no exported subpaths, so the specifier axis is only the bare name`,
    ).toBeGreaterThan(0);
    // The second deliberately exported path, named because it is the one a hand
    // written list would miss: the `"."` entry is an ARRAY whose second member is
    // this bare string, beside the condition object.
    expect(CODEC_SUBPATHS).toContain("dist/sourcemap-codec.umd.js");
    expect(CODEC_SPECIFIER_LIST[0]).toBe(CODEC_PACKAGE);
    expect(CODEC_SPECIFIER_LIST.length).toBe(CODEC_SUBPATHS.length + 1);
  });

  it("reports NOTHING on ITSELF, while a substring scan of the same bytes FIRES", () => {
    // THE MECHANICAL PROOF THAT THIS IS AN AST WALK, on the most adversarial file
    // available — this one, which names the banned specifier in prose, in a
    // constant, and inside fixture string literals that are themselves import
    // statements.
    //
    // THE CLAIM IS ASSERTED AS A DISAGREEMENT, NOT AS A COUNT, and that is the
    // stronger form. A threshold on how many times this file says
    // "@jridgewell/sourcemap-codec" measures how the prose happens to be
    // written; running the naive gate this file argues against, on these exact
    // bytes, and showing the two answer differently measures the thing actually
    // claimed. AN EARLIER DRAFT DID ASSERT A COUNT — `toBeGreaterThan(5)` — and
    // FAILED ON ITS OWN FILE at a measured 3, because most mentions here are
    // built from the CODEC_PACKAGE constant rather than spelled out. That is the
    // non-vacuity assertion doing exactly its job, and it is recorded here
    // rather than quietly lowered, in the register
    // `filesystem-prohibition.spec.ts` uses for the same experience.
    const source = readFileSync(SELF, "utf8");

    // Non-vacuity, at the floor the file actually measures rather than at a
    // number chosen to sound impressive: the literal appears 3 times today.
    expect(
      occurrences(source, CODEC_PACKAGE),
      "this file no longer names the codec as text at all, so the AST-vs-text case has no subject",
    ).toBeGreaterThan(2);

    // The naive gate, written out so the comparison is executed rather than
    // described. This is what a grep-based ban would be.
    const substringHits = occurrences(source, CODEC_PACKAGE);
    expect(
      substringHits,
      "a substring scan finds nothing here, so it cannot be shown to disagree with the walk",
    ).toBeGreaterThan(0);

    // And the walk — over the same bytes — reports nothing, because none of
    // those mentions is an import.
    expect(auditSource(SELF, source)).toEqual([]);
  });
});
