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
//
// ===========================================================================
// ONE RULE DELIBERATELY DUPLICATED HERE, AND THE COST OF DOING SO
// ===========================================================================
// `filesystem-prohibition.spec.ts` DECLINED to add an `fs-unanalysable` rule,
// because an `import(s)` whose specifier will not reduce to a literal is already
// reported as `outbound-unanalysable` by `outbound-prohibition.spec.ts` over the
// IDENTICAL file set, and a second entry would have reported the same node twice
// while splitting one argument across two files.
//
// THIS FILE DUPLICATES IT ANYWAY, and the cost is stated rather than hidden: a
// dynamic import with an assembled specifier now reports TWICE, once next door
// and once here. What is bought for that is ATTRIBUTION. `FORBIDDEN_CODEC` is
// read as the COMPLETE statement of what D-17 forbids — that is the whole point
// of exporting a rule array as data — and a reader who consults only this file
// must not be able to conclude that an unreadable specifier is a permitted way
// to reach the codec. D-17's claim is that a PACKAGE is unreachable from these
// two roots; once every literal spelling is banned, an unresolvable specifier is
// the only remaining path to it, so a gap there is not a missing detail but the
// whole ban defeated. The two reports carry different `why` texts pointing at
// different requirements (CORE-11 next door, MAP-03 here), so the duplication
// costs a second message and not a second investigation.
//
// AND THE SHAPE IS WORTH NAMING PRECISELY: it is the one shape that defeats an
// AST gate SILENTLY. Every other rule here fails loudly when it fails. This one
// exists because the walk returns nothing on an unreadable specifier, and
// "reported nothing" is INDISTINGUISHABLE FROM A PASS.

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
  "codec-unanalysable": Object.freeze({
    rule: "codec-unanalysable",
    surface:
      "a dynamic `import()` or a `require()` whose specifier this walk cannot reduce to a literal",
    why:
      "THIS IS THE ARGUMENT, NOT THE RULE. A specifier assembled from pieces, or arriving " +
      "through a name this file never watched being bound, is the ONE shape that defeats an " +
      "AST gate SILENTLY: the walk returns nothing and the file reports clean, which is " +
      "INDISTINGUISHABLE FROM A PASS. Every other rule here fails loudly when it fails; this " +
      "one exists because that rule has an exception, and D-17's claim is that a PACKAGE is " +
      "unreachable from these two roots — so once every literal spelling is banned, an " +
      "unreadable specifier is not a missing detail, it is the whole ban defeated. RESOLVE " +
      "THE VALUE, OR DELETE THE INDIRECTION. THE COST, MEASURED AND ACCEPTED: the shipped " +
      "tree contains ZERO dynamic imports and ZERO require() calls under either root today, " +
      "so this rule reports nothing at all right now, and an ordinary `import(path)` added " +
      "tomorrow with a parameter as its specifier WOULD report — which is the intended " +
      "answer rather than a false positive, because such a call is exactly as unreadable as " +
      "a concatenation. The same node is ALSO reported as `outbound-unanalysable` by " +
      "outbound-prohibition.spec.ts over the identical file set; that duplication is " +
      "deliberate and this file's header states what it buys.",
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

/**
 * Every `"packages/..."` literal in a declaration block, by `indexOf`.
 *
 * A HAND-ROLLED SCAN RATHER THAN A PATTERN, because none of the three sibling
 * gates uses a regex anywhere and there is no reason for this one to be the
 * first. It reads a SOURCE-TEXT declaration off disk, which is a place a subtly
 * wrong pattern would fail silently by matching nothing — and a check that
 * matches nothing is the same defect as a check that scans nothing.
 */
function quotedRootsIn(block: string): string[] {
  const marker = '"packages/';
  const out: string[] = [];
  let at = block.indexOf(marker);
  while (at !== -1) {
    const close = block.indexOf('"', at + 1);
    if (close === -1) break;
    out.push(block.slice(at + 1, close));
    at = block.indexOf(marker, close + 1);
  }
  return out;
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

  /**
   * `export * from "x"` and `export { y } from "x"` reach the same module and
   * are distinguished only in the MESSAGE — a star re-export is the shape most
   * likely to be written without noticing what it drags in.
   */
  const exportShapeOf = (node: ts.ExportDeclaration): string =>
    node.exportClause === undefined
      ? "a star re-export"
      : "an `export ... from`";

  const reportSpecifier = (how: string, node: ts.Node | undefined): void => {
    const specifier = literalOf(node);
    if (specifier !== undefined && isCodecSpecifier(specifier)) {
      add("codec-import", `${how} of \`${specifier}\``);
    }
  };

  /**
   * The runtime-resolved forms, where an unreadable specifier is its own rule.
   *
   * A STATIC `import ... from` CANNOT TAKE THIS PATH — its specifier is a string
   * literal by grammar, so there is no unreadable case to report and no branch
   * here that could never run. Only `import()` and `require()` accept an
   * expression, which is exactly why they are the two shapes that can hide a
   * package from this gate.
   */
  const reportResolvedSpecifier = (
    how: string,
    node: ts.Node | undefined,
  ): void => {
    if (node === undefined) return;
    const specifier = literalOf(node);
    if (specifier === undefined) {
      add("codec-unanalysable", `${how} whose specifier this walk cannot read`);
      return;
    }
    if (isCodecSpecifier(specifier)) {
      add("codec-import", `${how} of \`${specifier}\``);
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      reportSpecifier(importShapeOf(node), node.moduleSpecifier);
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      reportSpecifier(exportShapeOf(node), node.moduleSpecifier);
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
        reportResolvedSpecifier("a dynamic import()", node.arguments[0]);
      } else if (ts.isIdentifier(callee) && callee.text === "require") {
        reportResolvedSpecifier("a require()", node.arguments[0]);
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

  it("the walk really DESCENDED into subdirectories, per root", () => {
    // A non-recursive read would enumerate the top-level modules of each root and
    // pass every rule below having never opened `packages/engine/src/sourcemap/`
    // — this phase's own subsystem, and the single directory D-17 is most about.
    //
    // BOTH ROOTS ARE HELD TO THIS UNCONDITIONALLY NOW, which
    // `filesystem-prohibition.spec.ts` could not do: when that gate was written
    // packages/engine/src was FLAT, so it had to read the condition off disk and
    // skip a root with no subdirectory. Plan 07-02 gave the engine its first
    // subdirectory, so the weaker form is no longer needed — and the assertion
    // that every root HAS one is made first, so an engine that goes flat again
    // fails loudly here rather than quietly relaxing this case back.
    for (const root of SOURCE_ROOTS) {
      expect(
        readdirSync(root, { withFileTypes: true }).some((e) => e.isDirectory()),
        `${root} has no subdirectory at all, so this walk cannot be shown to descend`,
      ).toBe(true);
      const relative = files
        .filter((f) => f.startsWith(`${root}/`))
        .map((f) => f.slice(root.length + 1));
      expect(
        relative.filter((r) => r.includes("/")),
        `${root} has subdirectories but no enumerated path under it contains a separator, so the walk is flat there`,
      ).not.toEqual([]);
    }
  });

  it("the per-file cases iterate the SAME binding the assertions above measured", () => {
    // Made executable rather than asserted in a comment: if the binding and a
    // fresh walk ever disagree, the non-vacuity guarantees above stop covering
    // what is actually scanned.
    expect(shippedFiles()).toEqual(files);
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
    // AND THE OTHER DIRECTION, NAMED RATHER THAN COUNTED. A count alone reports
    // "expected 2 to be 1" and leaves the reader to work out WHICH root went
    // missing — and the root most likely to go missing is `packages/engine/src`,
    // because it is the one somebody deletes while thinking "the codec ban is
    // about the backend". So the parent's roots are extracted and diffed, and
    // the failure says which one this file has dropped.
    // Extracted by `indexOf`, never a pattern: none of the three sibling gates
    // uses a regex anywhere, and this file has no reason to be the first.
    const parentRoots = quotedRootsIn(block);
    expect(
      parentRoots.filter((root) => !SOURCE_ROOTS.includes(root)),
      "the outbound gate scans a root this gate does not, so half the shipped tree is ungated for the codec while the outbound rules still cover it",
    ).toEqual([]);
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

/**
 * The import shapes a package can arrive through.
 *
 * Written as a table CROSSED with the specifier list rather than by hand,
 * because the whole claim of the `codec-import` rule is that it bans the
 * CAPABILITY and not one spelling of it — and a hand-written fixture list is
 * exactly where one spelling goes missing.
 *
 * A TYPE-ONLY IMPORT IS BANNED TOO, and that is a DESIGN signal rather than a
 * load: it erases at compile time and ships nothing. But a module typing itself
 * against the codec is a module being written to use the codec, and catching it
 * at the type is catching it a commit early.
 */
const IMPORT_SHAPES: readonly Readonly<{
  shape: string;
  write: (specifier: string) => string;
}>[] = Object.freeze([
  { shape: "a default import", write: (s) => `import decode from "${s}";` },
  {
    shape: "a named import",
    write: (s) => `import { decode } from "${s}";`,
  },
  {
    shape: "a namespace import",
    write: (s) => `import * as codec from "${s}";`,
  },
  {
    shape: "a type-only import",
    write: (s) => `import type { SourceMapMappings } from "${s}";`,
  },
  { shape: "a side-effect import", write: (s) => `import "${s}";` },
  { shape: "a re-export from", write: (s) => `export { decode } from "${s}";` },
  { shape: "a star re-export", write: (s) => `export * from "${s}";` },
  {
    shape: "a dynamic import() with a literal specifier",
    write: (s) => `const codec = await import("${s}");`,
  },
  { shape: "a require()", write: (s) => `const codec = require("${s}");` },
  {
    shape: "an import-equals-require",
    write: (s) => `import codec = require("${s}");`,
  },
]);

const CODEC_IMPORT_TABLE = CODEC_SPECIFIER_LIST.flatMap((specifier) =>
  IMPORT_SHAPES.map(({ shape, write }) => ({
    specifier,
    shape,
    source: write(specifier),
  })),
);

/**
 * The import shapes the plan NAMES, as an external floor on the axis above.
 *
 * WITHOUT THIS THE CROSS-PRODUCT ASSERTION IS SELF-REFERENTIAL AND CANNOT CATCH
 * A DELETION, which was measured rather than reasoned about: asserting that the
 * table's length equals `specifiers × shapes` stays TRUE when a shape is removed,
 * because both sides shrink together. An earlier draft asserted exactly that and
 * a scratch deletion of the star re-export did NOT redden it. The product
 * assertion is a self-consistency claim; THIS list is what makes the axis
 * shrinking loud, because it is written down somewhere the shrink does not
 * reach.
 *
 * Two shapes in `IMPORT_SHAPES` are deliberately absent from this floor — a
 * side-effect import and a `require()` — because they are inherited from
 * `filesystem-prohibition.spec.ts`'s table rather than required by MAP-03, and a
 * floor that named them would stop being a statement of the requirement.
 */
const REQUIRED_IMPORT_SHAPES: readonly string[] = Object.freeze([
  "a default import",
  "a named import",
  "a namespace import",
  "a type-only import",
  "a re-export from",
  "a star re-export",
  "a dynamic import() with a literal specifier",
  "an import-equals-require",
]);

/**
 * A subpath the `exports` map does NOT declare, exercised in every shape.
 *
 * The MATCHER is wider than the derived axis on purpose: a deep import into the
 * package's shipped `src/` directory is a reachable spelling that no `exports`
 * map can be trusted to have closed, and Node's own resolution has historically
 * allowed exactly this. Kept as its own table rather than folded into the axis,
 * so the cross-product assertion above stays a statement about the DERIVED list.
 */
const UNDECLARED_SUBPATH = `${CODEC_PACKAGE}/src/sourcemap-codec.ts`;

const UNDECLARED_SUBPATH_TABLE = IMPORT_SHAPES.map(({ shape, write }) => ({
  shape,
  source: write(UNDECLARED_SUBPATH),
}));

/**
 * Specifiers that must stay QUIET, and each is a near-miss chosen to prove a
 * different thing.
 *
 * `@jridgewell/trace-mapping` and `@jridgewell/gen-mapping` are REAL entries in
 * this lockfile that share the scope. `sourcemap-codec` is the legacy UNSCOPED
 * package of the same name, which is a different package. The `-extra` and
 * `-shim` spellings prove the match is EXACT rather than a bare string prefix —
 * they begin with the package name and are not it, which is the single most
 * likely way a hand-rolled `startsWith` gets this wrong. `./sourcemap-codec`
 * proves a local module may be named anything.
 */
const LEGAL_SPECIFIERS: readonly string[] = Object.freeze([
  "@jridgewell/trace-mapping",
  "@jridgewell/gen-mapping",
  "sourcemap-codec",
  `${CODEC_PACKAGE}-extra`,
  `${CODEC_PACKAGE}-shim`,
  "./sourcemap-codec",
  "@defminer/engine/sourcemap/map-fixture",
  "node:path",
]);

const LEGAL_IMPORT_TABLE = LEGAL_SPECIFIERS.flatMap((specifier) =>
  IMPORT_SHAPES.map(({ shape, write }) => ({
    specifier,
    shape,
    source: write(specifier),
  })),
);

/**
 * A firing fixture for every rule that is not `codec-import`, with its EXACT
 * expected rule list rather than a containment check.
 *
 * Exact, because a containment assertion passes when a rule fires twice for one
 * reason and once for another, and the difference between those two is the
 * difference between a gate that is right and a gate that is loud.
 */
const FIRING_FIXTURES: readonly Readonly<{
  rule: RuleId;
  name: string;
  source: string;
  expected: readonly RuleId[];
}>[] = Object.freeze([
  {
    rule: "codec-unanalysable",
    name: "a string-concatenated dynamic import specifier",
    source: 'const codec = await import("@jridgewell/" + "sourcemap-codec");',
    expected: ["codec-unanalysable"],
  },
  {
    rule: "codec-unanalysable",
    name: "a template-assembled dynamic import specifier",
    source: "const codec = await import(`@jridgewell/${name}`);",
    expected: ["codec-unanalysable"],
  },
  {
    rule: "codec-unanalysable",
    name: "a specifier arriving as a parameter — as unreadable as a concatenation, and reported as such",
    source: "async function load(spec) {\n  return await import(spec);\n}",
    expected: ["codec-unanalysable"],
  },
  {
    rule: "codec-unanalysable",
    name: "a name bound to TWO different literals, so literalOf cannot choose",
    source: [
      'let spec = "@jridgewell/trace-mapping";',
      `spec = "${CODEC_PACKAGE}";`,
      "const codec = await import(spec);",
    ].join("\n"),
    expected: ["codec-unanalysable"],
  },
  {
    rule: "codec-unanalysable",
    name: "the same hole through require()",
    source: 'const codec = require("@jridgewell/" + "sourcemap-codec");',
    expected: ["codec-unanalysable"],
  },
]);

/**
 * Shapes that MUST stay quiet. Each is real in, or adjacent to, this codebase.
 *
 * The one-hop alias case is the counterpart of the two-literal firing fixture
 * above: a specifier that DOES reduce is read, so a legal package behind a name
 * reports nothing at all rather than reporting `codec-unanalysable`.
 */
const LEGAL_FIXTURES: readonly Readonly<{ name: string; source: string }>[] =
  Object.freeze([
    {
      name: "a dynamic import whose specifier reduces through ONE hop to a legal package",
      source: [
        'const spec = "@jridgewell/trace-mapping";',
        "const mapper = await import(spec);",
      ].join("\n"),
    },
    {
      name: "a comment naming the codec and every shape of importing it",
      source: [
        `// This module does not import ${CODEC_PACKAGE}, nor`,
        `// ${CODEC_PACKAGE}/dist/sourcemap-codec.umd.js, and never calls`,
        `// await import("${CODEC_PACKAGE}") or require("${CODEC_PACKAGE}").`,
        "export const NOTHING = 0;",
      ].join("\n"),
    },
    {
      name: "a string literal that IS an import statement — the shape a substring scan cannot tell from an import",
      source: `const documented = "import decode from \\"${CODEC_PACKAGE}\\";";`,
    },
    {
      name: "a template literal naming the codec",
      source: `const doc = \`\${scope}/sourcemap-codec is decoded in the frontend\`;`,
    },
    {
      name: "an ordinary object whose method is NAMED decode",
      source: "const positions = vlq.decode(mappings);",
    },
    {
      name: "the engine's own base64 decode, which is NOT VLQ and is LEGAL",
      source: 'import { decodeBase64 } from "../decode";',
    },
    {
      name: "an ordinary property access on something called codec",
      source: "const n = telemetry.counters.codecAttempts;",
    },
  ]);

describe("the gate's own failure paths, every one of them executed", () => {
  it.each(CODEC_IMPORT_TABLE)(
    "codec-import fires on $shape of $specifier",
    ({ source }) => {
      expect(rulesOf(source)).toEqual(["codec-import"]);
    },
  );

  it.each(UNDECLARED_SUBPATH_TABLE)(
    "codec-import fires on $shape of an UNDECLARED subpath",
    ({ source }) => {
      expect(rulesOf(source)).toEqual(["codec-import"]);
    },
  );

  it.each(LEGAL_IMPORT_TABLE)(
    "codec-import stays QUIET on $shape of $specifier",
    ({ source }) => {
      expect(rulesOf(source)).toEqual([]);
    },
  );

  it.each(FIRING_FIXTURES)("$rule fires on $name", ({ source, expected }) => {
    expect(rulesOf(source)).toEqual(expected);
  });

  it.each(LEGAL_FIXTURES)("stays QUIET on $name", ({ source }) => {
    expect(rulesOf(source)).toEqual([]);
  });
});

describe("the fixture set covers the rule set, and the rule set is data", () => {
  it("EVERY declared rule id has at least one firing fixture", () => {
    // The non-vacuity of the fixture table itself. Without this, adding a third
    // rule and no fixture for it would leave a rule whose failing path has never
    // run — the exact defect this file's whole shape exists to prevent, hiding
    // inside the file that exists to prevent it.
    const covered = new Set<string>(FIRING_FIXTURES.map((f) => f.rule));
    if (CODEC_IMPORT_TABLE.length > 0) covered.add("codec-import");
    expect([...covered].sort()).toEqual(Object.keys(RULES).sort());
  });

  it("EVERY declared rule id has at least one legal fixture proving it stays quiet", () => {
    // Asserted as REACH rather than as a count: each rule is named with the
    // fixture family that proves it silent, so a rule cannot be added with a
    // firing case and no counter-case.
    expect(LEGAL_IMPORT_TABLE.length).toBeGreaterThan(0); // codec-import
    expect(
      LEGAL_FIXTURES.some((f) => f.source.includes("const spec =")),
      "no legal fixture exercises a REDUCIBLE dynamic specifier, so codec-unanalysable has no counter-case",
    ).toBe(true); // codec-unanalysable
  });

  it("the codec-import case table is the FULL CROSS PRODUCT of specifier forms and import shapes", () => {
    // The criterion this file is held to is a PRODUCT — every specifier form in
    // every import shape — so it is asserted as one rather than counted by hand
    // in a review. A shape added without a specifier, or a specifier added
    // without every shape, fails HERE instead of leaving a spelling untested.
    expect(CODEC_IMPORT_TABLE.length).toBe(
      CODEC_SPECIFIER_LIST.length * IMPORT_SHAPES.length,
    );
    expect(
      new Set(CODEC_IMPORT_TABLE.map((r) => `${r.specifier}|${r.shape}`)).size,
      "the cross product contains a duplicate pair, so its length overstates its reach",
    ).toBe(CODEC_IMPORT_TABLE.length);
    // Asserted as the SET of pairs, not only as a count, so two shapes swapping
    // names could not keep the arithmetic while changing what is exercised.
    expect(
      new Set(CODEC_IMPORT_TABLE.map((r) => `${r.specifier}|${r.shape}`)),
    ).toEqual(
      new Set(
        CODEC_SPECIFIER_LIST.flatMap((s) =>
          IMPORT_SHAPES.map((sh) => `${s}|${sh.shape}`),
        ),
      ),
    );
    // AND THE HALF THAT MAKES A DELETION LOUD. Every REQUIRED shape, crossed
    // with every derived specifier, must be a pair the table actually exercises
    // — asserted against a list written outside the axis, so removing a shape
    // from `IMPORT_SHAPES` fails HERE rather than shrinking both sides of the
    // arithmetic above in step.
    const exercised = new Set(
      CODEC_IMPORT_TABLE.map((r) => `${r.specifier}|${r.shape}`),
    );
    for (const specifier of CODEC_SPECIFIER_LIST) {
      for (const shape of REQUIRED_IMPORT_SHAPES) {
        expect(
          exercised,
          `the cross product does not exercise ${shape} of ${specifier}`,
        ).toContain(`${specifier}|${shape}`);
      }
    }

    // The floor the plan set: sixteen cases. Shipped is six specifiers by ten
    // shapes, plus ten more for the undeclared subpath.
    expect(CODEC_IMPORT_TABLE.length).toBeGreaterThanOrEqual(16);
    expect(CODEC_IMPORT_TABLE.length).toBeGreaterThanOrEqual(
      CODEC_SPECIFIER_LIST.length * REQUIRED_IMPORT_SHAPES.length,
    );
  });

  it("the failure message carries the WHY, not just the rule id", () => {
    const [violation] = auditSource("f.ts", `import "${CODEC_PACKAGE}";`);
    expect(violation?.detail).toContain("167 ms");
    expect(violation?.detail).toContain("FULLY BUNDLED");
    expect(violation?.detail).toContain("a side-effect import");
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

    // And the walk — over the same bytes — reports the EXACT set, which here is
    // empty, because none of those mentions is an import. Asserted as an exact
    // array rather than as "does not contain codec-import": the two are
    // different claims and only the first one says the gate is quiet.
    expect(auditSource(SELF, source)).toEqual([]);

    // ADDING A PROSE MENTION DOES NOT CHANGE IT. This is the half that proves
    // the gate cannot be weakened by deleting documentation — the failure mode
    // a substring scan creates, where the only way to make the gate pass is to
    // stop explaining it.
    const withMoreProse = [
      source,
      `// ${CODEC_PACKAGE} is decoded in the frontend, never here.`,
      `// Not even as import decode from "${CODEC_PACKAGE}";`,
      `const documented = 'await import("${CODEC_PACKAGE}")';`,
    ].join("\n");
    expect(occurrences(withMoreProse, CODEC_PACKAGE)).toBeGreaterThan(
      substringHits,
    );
    expect(auditSource(SELF, withMoreProse)).toEqual([]);

    // And the gate is NOT BLIND on its own file either: one real import line
    // appended to these same bytes reports, and reports exactly once.
    const withRealImport = `${source}\nimport decode from "${CODEC_PACKAGE}";\n`;
    expect(auditSource(SELF, withRealImport).map((v) => v.rule)).toEqual([
      "codec-import",
    ]);
  });
});
