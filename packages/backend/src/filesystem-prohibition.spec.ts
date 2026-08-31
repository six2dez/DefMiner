// packages/backend/src/filesystem-prohibition.spec.ts — D-18's wired gate.
//
// THE RULE: no non-spec module the plugin SHIPS may import a filesystem module,
// in any specifier form, or reach Caido's hosted-file surface, in any spelling.
//
// ===========================================================================
// WHY THIS IS A SIBLING OF `outbound-prohibition.spec.ts` AND NOT TWO MORE
// ENTRIES IN ITS `RULES` RECORD
// ===========================================================================
// That file's exported `FORBIDDEN_OUTBOUND` is a CORE-11 vocabulary, and CORE-11
// is about OUTBOUND NETWORK TRAFFIC. What is banned here answers to DEPLOY-03 and
// DEPLOY-04, and it is banned for a different reason: not "traffic this plugin
// generates is invisible to it", but "anything written to server disk is
// permanent and unreclaimable". One record holding both would make
// `FORBIDDEN_OUTBOUND` a list of things-we-do-not-do rather than a statement of
// one requirement, and the next reader would have no way to tell which
// requirement any given entry discharges.
//
// The precedent for a sibling is already set twice in this package.
// `outbound-prohibition.spec.ts` says in its own header that it copies its SHAPE
// — a pure `auditSource(file, source)`, a named non-vacuity assertion, and every
// rule's failing path executed against an inline fixture — from
// `store/sql-discipline.spec.ts` rather than its rules. `store/httpql-
// discipline.spec.ts` did the same again in Phase 6. This file is the third, and
// it copies the SAME shape from `outbound-prohibition.spec.ts`: same walk
// skeleton, same POSIX source-root enumeration, same by-name non-vacuity block,
// same firing-and-legal fixture pair per rule.
//
// ===========================================================================
// WHY THE BAN EXISTS: THE SDK SURFACE, MEASURED
// ===========================================================================
// `HostedFileSDK` is `getAll()` and `create({ name, content })` and NOTHING ELSE
// — verified against @caido/quickjs-types@0.26.0, the newest published version,
// in `06-RESEARCH.md`. There is no delete, no remove, no expiry and no TTL. A
// hosted file, once created, is PERMANENT AND UNRECLAIMABLE by the plugin that
// created it. DEPLOY-03 asks for "expiry and redaction rules" and DEPLOY-04 for
// "orphan cleanup"; neither is expressible against that surface at all.
//
// DEPLOY-03's own text offers "via sdk.hostedFile OR a bounded authenticated
// frontend download" as EQUAL alternatives, and Phase 5 built and measured the
// second one: `store/export.ts` plus the frontend's `export-download.ts`. So the
// requirement is met by its own alternative wording rather than by a compromise.
//
// AND THE DISTINCTION IS WORTH STATING PRECISELY, BECAUSE IT IS THE SHARPEST
// ARGUMENT FOR D-17 AND IT IS EASY TO OVERSTATE. DEPLOY-03's "with expiry and
// redaction rules" clause attaches grammatically to BOTH alternatives, so the
// download alternative owes an answer to it too. Under the download:
//
//   REDACTION IS SHIPPED — `audit.kind` admits `export_raw` and `export_redacted`
//     as distinct events (`store/migrations.ts`, step v4), and `telemetry.ts`
//     carries `PATH_REDACTION` and `URL_REDACTION`.
//   EXPIRY LOSES ITS SUBJECT — nothing persists server-side, so there is no
//     artifact whose lifetime could expire. That is a DISSOLUTION, and it is
//     recorded here as one. It is NOT a box ticked, and this file does not claim
//     it as compliance.
//
// Under `sdk.hostedFile`, by contrast, expiry is not dissolved but UNSATISFIABLE:
// the artifact is permanent and the SDK offers no means to remove it. Choosing
// the hosted-file surface would have selected the one option under which
// DEPLOY-03's own expiry clause can never be met, by anybody, ever.
//
// `HostedFile` also carries a server `path`, which is a second reason to decline
// it: displaying one would violate DEPLOY-02 and D-19.
//
// ===========================================================================
// THE ASYMMETRY THAT MAKES A SOURCE GATE NECESSARY — AND IT IS NOT HYPOTHETICAL
// ===========================================================================
// `fs` IS ON THE DIST-05 BUNDLE ALLOWLIST. `scripts/ci/check-bundle-imports.mjs`
// admits it because the Phase 0 capability probe MEASURED IT LOADABLE inside
// Caido 0.57.1 — which is a different question from whether it is PERMITTED. So
// the door this gate closes is OPEN today: a filesystem import added tomorrow
// would load, would pass `pnpm check:bundle`, and would be reported by nothing.
// That is exactly the `caido:http` asymmetry that made `outbound-import`
// necessary, and it is why this gate reads SOURCE.
//
// THE ALLOWLIST MUST NOT BE EDITED, in either direction. Its own header records
// that "ADDING AN ENTRY BY HAND IS A LIE UNLESS A PROBE RUN PROVES IT", and
// REMOVING `fs` would quietly redefine "measured loadable" as "permitted" —
// destroying the only record of what the runtime actually resolves. The two
// gates answer two different questions and are meant to disagree here: the
// bundle gate bounds what CAN LOAD, this one bounds what the source MAY IMPORT.
//
// ===========================================================================
// WHY AN AST WALK AND NOT A TEXT SCAN, AND IT IS LOAD-BEARING IN THIS FILE
// ===========================================================================
// `store/export.ts`'s header states the principle: a gate a comment can trip is
// a gate that gets WEAKENED rather than obeyed — which is why that file
// deliberately does not spell out the identifiers it forbids. This file has the
// opposite problem and the same answer. It names `fs`, `node:fs`, `llrt/fs`,
// their `/promises` variants and `sdk.hostedFile` dozens of times, in prose and
// inside fixture string literals, because the reasoning above is worth more than
// the characters it costs. A substring scan would fail on its own documentation,
// and the only way to make it pass would be deleting the reasoning — precisely
// backwards. It is asserted below, on this file itself, as the mechanical proof.
//
// A regex would also miss a template spanning a line break, an `export ... from`,
// an `import ... = require()` and any call whose receiver is on the previous
// line: the shapes prettier is most likely to produce in this package.
//
// ===========================================================================
// THE BOUNDARY THIS INHERITS, AND ITS BOUND
// ===========================================================================
// The walk SKIPS `.spec.ts`, exactly as its parent does, and for the same
// reason: it is what lets this file's own fixtures — which necessarily contain
// the forbidden shapes as source text — live inline with no temp file and no
// stray module for `tsc --build` to trip over. IT COSTS SOMETHING REAL: a spec
// file could reach a filesystem surface unnoticed. That residual is bounded from
// the other end by `pnpm check:bundle`, which reads the SHIPPED BUNDLE and which
// specs never enter.
//
// THIS FILE IS ITSELF THAT COST, MADE VISIBLE RATHER THAN LEFT TO BE FOUND. It
// imports `node:fs` — it has to, because the enumeration below is a real
// directory walk — and its own `fs-import` rule fires on that import when the
// file is passed through `auditSource`. The self-audit case below asserts
// EXACTLY THAT and nothing more, which is a stronger statement than "reports
// clean": it proves the gate is neither blind (it sees the one real import) nor
// a substring scanner (it sees none of the hundreds of mentions in prose and in
// fixture strings).
//
// ===========================================================================
// ONE RULE DELIBERATELY NOT DUPLICATED HERE
// ===========================================================================
// An `import(s)` whose specifier will not reduce to a literal is ALREADY reported
// as `outbound-unanalysable` by `outbound-prohibition.spec.ts`, over the IDENTICAL
// file set — same two source roots, same `.spec.ts` skip. Adding an
// `fs-unanalysable` rule here would report the same node twice and split the
// argument across two files. The unreadable-specifier shape is therefore covered
// once, next door, and named here so a reader finds a decision rather than a gap.

import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * THE SOURCE ROOTS THE PLUGIN SHIPS — the same two `outbound-prohibition.spec.ts`
 * enumerates, and DUPLICATED RATHER THAN IMPORTED for a mechanical reason.
 *
 * That module is a spec file with ~11,700 lines of top-level `describe` calls.
 * Importing a symbol from it would EXECUTE it, registering its entire suite a
 * second time under this file's name. So the constant is restated, and the
 * duplication is held honest by an assertion below that reads the parent's own
 * declaration off disk and fails loudly if the two ever diverge — a derived
 * bound rather than an authored one.
 *
 * `packages/engine/src` is not optional here for the same reason it is not
 * optional there: the engine is bundled into the backend's dist, and
 * `pipeline.ts` is the module most likely to grow a "just write the sourcemap
 * out" line.
 */
const SOURCE_ROOTS: readonly string[] = Object.freeze([
  "packages/backend/src",
  "packages/engine/src",
]);

const BACKEND_SRC = SOURCE_ROOTS[0];

/** This file, as the walk names it — the subject of the self-audit case. */
const SELF = posix.join(BACKEND_SRC, "filesystem-prohibition.spec.ts");

/** The parent gate, read for the source-root agreement assertion. */
const OUTBOUND_GATE = posix.join(BACKEND_SRC, "outbound-prohibition.spec.ts");

// ---------------------------------------------------------------------------
// THE SURFACES, AS TOKENS THE WALK MATCHES ON
// ---------------------------------------------------------------------------

/**
 * The three prefix families a filesystem specifier is spelled with on this
 * runtime, and they are three rather than one BY MEASUREMENT.
 *
 * The bare name is what Phase 0's probe loaded. The `node:` form is what modern
 * lint configs actively push toward, so it is a live spelling rather than a
 * hypothetical one. `llrt/` is the runtime-prefixed form named in D-18's own
 * wording — Caido's QuickJS is LLRT-derived and that is how its own modules are
 * addressed. Banning one spelling of a capability is banning nothing.
 */
const FS_PREFIX_BARE = "";
const FS_PREFIX_NODE = "node:";
const FS_PREFIX_RUNTIME = "llrt/";

const FS_PREFIXES: readonly string[] = Object.freeze([
  FS_PREFIX_BARE,
  FS_PREFIX_NODE,
  FS_PREFIX_RUNTIME,
]);

const FS_MODULE = "fs";
const PROMISES_SUFFIX = "/promises";

/**
 * Every specifier form of the filesystem module: each prefix family, plain and
 * with the promises suffix. DERIVED from the two constants above rather than
 * written out, so a fourth prefix is one entry and not six.
 */
const FS_SPECIFIER_LIST: readonly string[] = Object.freeze(
  FS_PREFIXES.flatMap((prefix) => [
    `${prefix}${FS_MODULE}`,
    `${prefix}${FS_MODULE}${PROMISES_SUFFIX}`,
  ]),
);

const FS_SPECIFIERS: ReadonlySet<string> = new Set(FS_SPECIFIER_LIST);

/**
 * The SDK member that names the hosted-file surface.
 *
 * The rules below are anchored on this MEMBER NAME rather than on the receiver
 * being an object called `sdk`, which is the same choice `outbound-prohibition`
 * made for `requests` and `net`, and it is made here for the same two reasons:
 * the SDK arrives under whatever local name a function's parameter list gives it,
 * and a gate that only recognises one spelling of the receiver is a gate that a
 * rename defeats. THE COST, STATED: an ordinary object with a member literally
 * named `hostedFile`, used as a receiver, would report. `hostedFile` appears
 * NOWHERE in this codebase outside this file, so the cost is currently zero, and
 * the real-tree case below is what would make it visible if that changed.
 */
const HOSTED_FILE_MEMBER = "hostedFile";

type FilesystemRule = Readonly<{ rule: string; surface: string; why: string }>;

/**
 * The rule set as DATA a reader can enumerate rather than logic they must trace,
 * KEYED BY RULE ID — the shape `outbound-prohibition.spec.ts` adopted so that
 * `add()`'s lookup is TOTAL BY CONSTRUCTION: `RuleId` is `keyof typeof RULES`,
 * a typo is a compile error, and there is no `no such rule` branch left over that
 * no test could ever execute.
 *
 * A fourth surface discovered in a later phase is one entry here plus one branch
 * in the walk, and the `why` travels with it into the failure message — which is
 * the difference between a gate that explains itself at 2am and a bare rule id.
 */
const RULES = Object.freeze({
  "fs-import": Object.freeze({
    rule: "fs-import",
    surface: `an import of ${FS_SPECIFIER_LIST.map((s) => `"${s}"`).join(", ")}`,
    why:
      "DEPLOY-04 treats server disk as SHARED INSTANCE STORAGE, and D-17 discharges it " +
      "by writing nothing to that disk at all: the chunked RPC download in store/export.ts " +
      "is the only path by which anything this plugin produces reaches the operator. The " +
      "ban is on the CAPABILITY rather than on the usage, so there is no is-this-a-read-or-" +
      "a-write judgement left to get wrong. AND THE DOOR IS OPEN TODAY, which is the whole " +
      "reason this rule is not decorative: `fs` is on the DIST-05 bundle allowlist in " +
      "scripts/ci/check-bundle-imports.mjs because Phase 0 MEASURED IT LOADABLE inside " +
      "Caido 0.57.1 — a different question from whether it is permitted, and exactly the " +
      "asymmetry that made outbound-import necessary. Do NOT edit that allowlist to close " +
      "this: its header records that adding an entry by hand is a lie unless a probe run " +
      "proves it, and removing one would redefine measured-loadable as permitted, " +
      "destroying the only record of what the runtime actually resolves. A type-only " +
      "import is banned too, and that is a DESIGN signal rather than a load — it erases at " +
      "compile time and reaches nothing — but a module typing itself against fs is a " +
      "module being written to use fs, and catching it at the type is catching it early.",
  }),
  "hosted-file": Object.freeze({
    rule: "hosted-file",
    surface: `any member of an \`sdk.${HOSTED_FILE_MEMBER}\` receiver, however that receiver was bound`,
    why:
      "HostedFileSDK is getAll() and create({ name, content }) and nothing else — verified " +
      "against @caido/quickjs-types@0.26.0, the newest published version. THERE IS NO " +
      "DELETE AND NO EXPIRY, so a file created through this surface is permanent and " +
      "unreclaimable, and DEPLOY-03's own expiry clause could never be satisfied against " +
      "it by anybody. DEPLOY-03 offers a bounded authenticated frontend download as an " +
      "EQUAL alternative and Phase 5 shipped and measured it, so declining this surface " +
      "costs nothing and buys the guarantee. There is no read-only allowlist here, " +
      "deliberately and unlike the outbound gate's REQUESTS_READ_ONLY: getAll() returns " +
      "HostedFile objects each carrying a server `path`, so even the read half hands back " +
      "the one string DEPLOY-02 and D-19 exist to keep off the operator's screen.",
  }),
  "hosted-file-unanalysable": Object.freeze({
    rule: "hosted-file-unanalysable",
    surface:
      "a computed member that SELECTS the hosted-file surface, or a computed member OF one",
    why:
      "this is the argument, not the rule. A key assembled from pieces is the one shape " +
      "that defeats an AST gate SILENTLY — the walk returns nothing and the file reports " +
      "clean, which is INDISTINGUISHABLE FROM A PASS. Every other rule here fails loudly " +
      "when it fails; this one exists because that rule has an exception. Resolve the " +
      "value, or delete the indirection. The narrowing to keys this walk WATCHED BEING " +
      "ASSEMBLED is deliberate and is the parent gate's measured lesson: reporting every " +
      "key that would not reduce fired on compat.ts's documented dotted-path walk and on " +
      "an ordinary loop index, and a gate that calls those a hosted-file access gets " +
      "deleted rather than fixed.",
  }),
});

type RuleId = keyof typeof RULES;

/**
 * The same rule set as an ARRAY, for readers and for the enumeration assertion.
 * Derived from `RULES` so the two cannot disagree about what the gate enforces —
 * never a hand-maintained parallel list.
 */
export const FORBIDDEN_FILESYSTEM: readonly FilesystemRule[] = Object.freeze(
  Object.values(RULES),
);

type Violation = { file: string; rule: RuleId; detail: string };

// ---------------------------------------------------------------------------
// THE FILE SET
// ---------------------------------------------------------------------------

/**
 * Every non-spec module the plugin SHIPS, under either source root, at any depth.
 *
 * ONE PATH CONVENTION, POSIX, END TO END, copied from the parent gate for the
 * reason its header gives: paths built with the platform separator and then
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

/** Does this root have a subdirectory to descend INTO? */
function rootHasSubdirectory(root: string): boolean {
  return readdirSync(root, { withFileTypes: true }).some((e) =>
    e.isDirectory(),
  );
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
 * `(sdk as any).hostedFile` is an `AsExpression` where a bare identifier was
 * expected, and that single wrapper is enough to make a naive match miss. Parens,
 * `as`, `satisfies`, `!` and the legacy `<T>x` assertion all mean "the same
 * value, differently typed", so all five unwrap.
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
 * set because the parent gate measured what leaving them out costs: `let r; r ??=
 * sdk.requests; r.send(req)` grew NOTHING while the `=` spelling two characters
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
 * nobody has tested; this package has been bitten by exactly that more than once,
 * and the rule it settled on is the one this file follows: a firing fixture AND a
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

  // --- pass 1: collect bindings, in document order --------------------------
  //
  // NO SYMBOL TABLE IS BUILT. Bindings are file-wide rather than scope-aware, and
  // the alias set is grown from the LIVE set at both collecting branches, never
  // removed from — so it OVER-approximates, which is the fail-closed direction,
  // and a two-hop chain resolves for free because the first hop is already in the
  // set when the second is read. The cost is stated with the residuals below.

  const constStrings = new Map<string, Set<string>>();
  const assembledNames = new Set<string>();
  const hostedFileAliases = new Set<string>();

  const bindString = (name: string, literal: string): void => {
    const bound = constStrings.get(name);
    if (bound === undefined) constStrings.set(name, new Set([literal]));
    else bound.add(literal);
  };

  const literalsOf = (node: ts.Node | undefined): ReadonlySet<string> => {
    if (node === undefined) return NO_LITERALS;
    const inner = unwrap(node as ts.Expression);
    if (ts.isStringLiteralLike(inner)) return new Set([inner.text]);
    if (ts.isIdentifier(inner))
      return constStrings.get(inner.text) ?? NO_LITERALS;
    return NO_LITERALS;
  };

  /**
   * The SINGLE-valued string reader specifiers and member names need: one binding
   * resolves, two or more answer `undefined`, and `undefined` means COULD NOT
   * READ at every call site.
   */
  const literalOf = (node: ts.Node | undefined): string | undefined => {
    const literals = literalsOf(node);
    if (literals.size !== 1) return undefined;
    for (const only of literals) return only;
    return undefined;
  };

  /**
   * Was this expression ASSEMBLED from pieces rather than written as a literal?
   *
   * Narrow on purpose: a `+` with a string operand, or a template with
   * substitutions. `a + b` between two numbers is not a string assembly and does
   * not answer true here, which is what keeps the unanalysable rule off every
   * array index in the tree.
   */
  const isAssembledString = (node: ts.Expression): boolean => {
    const inner = unwrap(node);
    if (ts.isTemplateExpression(inner)) return true;
    if (
      ts.isBinaryExpression(inner) &&
      inner.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      const left = unwrap(inner.left);
      const right = unwrap(inner.right);
      return (
        ts.isStringLiteralLike(left) ||
        ts.isStringLiteralLike(right) ||
        ts.isTemplateExpression(left) ||
        ts.isTemplateExpression(right) ||
        (ts.isIdentifier(left) && assembledNames.has(left.text)) ||
        (ts.isIdentifier(right) && assembledNames.has(right.text))
      );
    }
    return false;
  };

  /** Is this key one the walk WATCHED being assembled, and so cannot read? */
  const isAssembledKey = (node: ts.Expression): boolean => {
    const inner = unwrap(node);
    if (isAssembledString(inner)) return true;
    return ts.isIdentifier(inner) && assembledNames.has(inner.text);
  };

  /** The property name a destructure element binds FROM, if the walk can read it. */
  const boundPropertyName = (el: ts.BindingElement): string | undefined => {
    const property = el.propertyName ?? el.name;
    if (ts.isIdentifier(property) || ts.isStringLiteralLike(property)) {
      return property.text;
    }
    if (ts.isComputedPropertyName(property)) {
      return literalOf(property.expression);
    }
    return undefined;
  };

  /**
   * Is this expression the hosted-file surface, in any spelling the walk resolves?
   *
   * Three arms, deliberately shaped like the parent gate's receiver resolvers: a
   * bare name the collect pass bound to the surface, a property access naming the
   * member, or a computed access whose key REDUCES to the member name. A computed
   * access whose key does not reduce is NOT quietly false here — it is handled by
   * `hosted-file-unanalysable` at the visit site, which is the whole point of
   * having that rule.
   */
  const isHostedFileExpression = (node: ts.Expression): boolean => {
    const inner = unwrap(node);
    if (ts.isIdentifier(inner)) return hostedFileAliases.has(inner.text);
    if (ts.isPropertyAccessExpression(inner)) {
      return inner.name.text === HOSTED_FILE_MEMBER;
    }
    if (ts.isElementAccessExpression(inner)) {
      return literalOf(inner.argumentExpression) === HOSTED_FILE_MEMBER;
    }
    return false;
  };

  const bindFrom = (name: string, value: ts.Expression): void => {
    const init = unwrap(value);
    if (ts.isStringLiteralLike(init)) {
      bindString(name, init.text);
      return;
    }
    if (isAssembledString(init)) {
      assembledNames.add(name);
      return;
    }
    if (isHostedFileExpression(init)) hostedFileAliases.add(name);
  };

  const collect = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      if (ts.isIdentifier(node.name)) {
        bindFrom(node.name.text, node.initializer);
      } else if (ts.isObjectBindingPattern(node.name)) {
        for (const el of node.name.elements) {
          if (
            boundPropertyName(el) === HOSTED_FILE_MEMBER &&
            ts.isIdentifier(el.name)
          ) {
            hostedFileAliases.add(el.name.text);
          }
        }
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      ASSIGNING_OPERATORS.has(node.operatorToken.kind) &&
      ts.isIdentifier(node.left)
    ) {
      bindFrom(node.left.text, node.right);
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
    if (specifier !== undefined && FS_SPECIFIERS.has(specifier)) {
      add("fs-import", `${how} of \`${specifier}\``);
    }
  };

  const visit = (node: ts.Node): void => {
    // --- every import shape ------------------------------------------------
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

    // --- the hosted-file surface, destructured off an SDK object ------------
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer !== undefined &&
      ts.isObjectBindingPattern(node.name)
    ) {
      for (const el of node.name.elements) {
        const property = boundPropertyName(el);
        if (property === HOSTED_FILE_MEMBER) {
          add(
            "hosted-file",
            `\`${HOSTED_FILE_MEMBER}\`, destructured off an SDK object`,
          );
        } else if (
          property === undefined &&
          el.propertyName !== undefined &&
          ts.isComputedPropertyName(el.propertyName) &&
          isAssembledKey(el.propertyName.expression)
        ) {
          add(
            "hosted-file-unanalysable",
            "a destructure whose property name this walk watched being assembled",
          );
        }
      }
    }

    // --- a named member of an identified hosted-file receiver ---------------
    if (
      ts.isPropertyAccessExpression(node) &&
      isHostedFileExpression(node.expression)
    ) {
      add(
        "hosted-file",
        `\`${node.name.text}\` on a ${HOSTED_FILE_MEMBER} receiver`,
      );
    }

    // --- a computed member, of the surface or selecting it ------------------
    if (ts.isElementAccessExpression(node)) {
      if (isHostedFileExpression(node.expression)) {
        const member = literalOf(node.argumentExpression);
        if (member === undefined) {
          add(
            "hosted-file-unanalysable",
            `a computed member of a ${HOSTED_FILE_MEMBER} receiver that this walk cannot reduce to a name`,
          );
        } else {
          add(
            "hosted-file",
            `\`${member}\` on a ${HOSTED_FILE_MEMBER} receiver, selected by a computed key`,
          );
        }
      } else if (isAssembledKey(node.argumentExpression)) {
        add(
          "hosted-file-unanalysable",
          "a computed member whose key this walk watched being assembled, and which may therefore select the hosted-file surface",
        );
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
describe(`DEPLOY-03/04 — no filesystem and no hosted file is reachable from ${SOURCE_ROOTS.join(" or ")}`, () => {
  // BOUND ONCE, AND EVERY CASE BELOW READS THIS BINDING. Two filesystem walks
  // would mean the assertions that say "the scan is not empty and contains these
  // files" were made against a DIFFERENT array than the per-file cases iterate —
  // the two could disagree about what was scanned and neither would say so.
  const files = shippedFiles();

  it("enumerates a NON-EMPTY set of shipped modules, BY NAME, ACROSS BOTH ROOTS", () => {
    // Without this the whole gate passes by measuring nothing. Names rather than
    // a count, so a rename or a moved directory is a VISIBLE change instead of a
    // silently shrunk scanned set.
    expect(
      files.length,
      `no .ts modules found under ${SOURCE_ROOTS.join(" or ")}`,
    ).toBeGreaterThan(0);
    for (const expected of [
      "index.ts",
      "lifecycle.ts",
      "telemetry.ts",
      "compat.ts",
      "hooks/admit.ts",
      "ingest/consumer.ts",
      "store/export.ts",
      "store/migrations.ts",
      "store/retention.ts",
      // Phase 6's new subsystem, named explicitly because it is the newest code
      // in the tree and therefore the code most likely to reach for a file.
      // `producer.ts` in particular has no caller yet (STATE.md), which is
      // exactly the condition under which a module grows a convenience.
      "scan/scans.ts",
      "scan/producer.ts",
      "scan/filter.ts",
      // The engine, named so a package split or a moved module is a loud failure
      // rather than a quietly halved scan.
      "pipeline.ts",
      "decode.ts",
      "queue.ts",
    ]) {
      expect(
        files.some((f) => f.endsWith(`/${expected}`)),
        `${expected} is not being audited`,
      ).toBe(true);
    }
  });

  it("every root contributes at least one file to the scan", () => {
    // A root that vanishes, or a package that moves, must be a loud failure and
    // not a scan that quietly halved. Per root, by prefix, so neither can hide
    // behind the other's file count.
    for (const root of SOURCE_ROOTS) {
      expect(
        files.filter((f) => f.startsWith(`${root}/`)).length,
        `no file under ${root} reached the scan`,
      ).toBeGreaterThan(0);
    }
  });

  it("the walk really DESCENDED into subdirectories, per root", () => {
    // A non-recursive read would enumerate the four top-level backend modules and
    // pass every rule below having never opened the hooks, the store or the scan
    // subsystem.
    //
    // CONDITIONED ON THE ROOT ACTUALLY HAVING A SUBDIRECTORY, because
    // packages/engine/src is flat today: an unconditional per-root assertion
    // would fail there for a reason that is a fact about the engine's layout
    // rather than a defect in this walk. The condition is read from disk, so the
    // day the engine grows a subdirectory this holds it to the same standard
    // with no edit here.
    for (const root of SOURCE_ROOTS) {
      if (!rootHasSubdirectory(root)) continue;
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
    // The duplication of SOURCE_ROOTS is held honest HERE. If the parent gate
    // grows a third root — a new package, a moved engine — and this file does
    // not, this fails loudly instead of leaving half the tree ungated by the
    // filesystem rules while the outbound rules still cover it.
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
    // And the count, so the parent cannot have a root this file lacks.
    expect(occurrences(block, '"packages/')).toBe(SOURCE_ROOTS.length);
  });

  it.each(files)("%s reaches no filesystem and no hosted file", (file) => {
    const violations = auditSource(file, readFileSync(file, "utf8"));
    expect(
      violations.map((v) => `${v.rule}: ${v.detail}`),
      `${file} reaches a filesystem module or the hosted-file surface, which D-17/D-18 forbid in every module the plugin ships — ${SOURCE_ROOTS.join(" and ")}`,
    ).toEqual([]);
  });

  it("telemetry.ts NAMES the legal path accessor in prose and still reports clean", () => {
    // THE case that decides whether this rule bans a CAPABILITY or a VOCABULARY,
    // asserted LIVE against a real shipped file rather than only inline.
    // `sdk.meta.path()` reads a string and touches no filesystem, and it is named
    // in telemetry.ts's header precisely because the path it returns is the one
    // PATH_REDACTION exists to keep out of error text. If the header is ever
    // reworded this fails loudly rather than leaving a case that proves nothing.
    const file = posix.join(BACKEND_SRC, "telemetry.ts");
    const source = readFileSync(file, "utf8");
    expect(
      source,
      "telemetry.ts no longer names sdk.meta.path(), so the capability-not-vocabulary case is vacuous",
    ).toContain("sdk.meta.path()");
    expect(auditSource(file, source)).toEqual([]);
  });

  it("lifecycle.ts NAMES sdk.meta.db() in prose and still reports clean", () => {
    // The second legal accessor, live. `sdk.meta.db()` is how this plugin gets
    // its database at all — index.ts's init() calls it — so a gate that reported
    // it would be a gate that bans the plugin from existing.
    const file = posix.join(BACKEND_SRC, "lifecycle.ts");
    const source = readFileSync(file, "utf8");
    expect(
      source,
      "lifecycle.ts no longer names sdk.meta.db(), so this legal-accessor case is vacuous",
    ).toContain("sdk.meta.db()");
    expect(auditSource(file, source)).toEqual([]);
  });

  it("reports EXACTLY its own real fs import on ITSELF, and nothing from its prose or its fixtures", () => {
    // THE MECHANICAL PROOF THAT THIS IS AN AST WALK, on the single most
    // adversarial file in the repository — this one, which names every forbidden
    // specifier and the hosted-file surface dozens of times in prose and inside
    // fixture string literals.
    //
    // IT DOES NOT ASSERT AN EMPTY ARRAY, AND THAT IS THE HONEST STATEMENT RATHER
    // THAN A WEAKER ONE. This file MUST import `node:fs` — the enumeration above
    // is a real directory walk — and `fs-import` correctly fires on that real
    // import. Making the self-audit return `[]` would take exempting the gate's
    // own file from its own rule, which is exactly the weakening the gate exists
    // to prevent. What is asserted instead is strictly stronger, in both
    // directions at once: the gate sees the ONE real import (so it is not blind),
    // and it sees NONE of the hundreds of mentions in comments and strings (so it
    // is not a substring scanner). Removing that single import line leaves
    // nothing at all.
    const source = readFileSync(SELF, "utf8");

    // NON-VACUITY FIRST, AND THE STRONG HALF OF IT IS DERIVED RATHER THAN
    // AUTHORED. If this file stopped naming the forbidden vocabulary, the case
    // below would still pass while proving nothing at all.
    //
    // The derived claim: EVERY specifier the rule bans is named somewhere in
    // this file, as text, in prose or in a fixture. That cannot drift into
    // meaninglessness the way a threshold can, and it also states something
    // worth stating — the file documents its whole ban rather than the one form
    // its author happened to think of.
    for (const specifier of FS_SPECIFIER_LIST) {
      expect(
        occurrences(source, specifier),
        `this file no longer names \`${specifier}\`, so the AST-vs-text proof does not cover that specifier form`,
      ).toBeGreaterThan(0);
    }

    // The counted half, with the floors set BELOW the measured values rather
    // than at them, so ordinary editing does not trip a test about editing.
    // MEASURED on the day this landed: `node:fs` 12, `hostedFile` 25. An
    // earlier draft of this case asserted 20 for the first of them and FAILED
    // on its own file — which is the non-vacuity assertion doing exactly its
    // job, and the number is recorded here rather than quietly lowered.
    expect(
      occurrences(source, `${FS_PREFIX_NODE}${FS_MODULE}`),
      "this file no longer names the node-prefixed filesystem specifier often enough for the AST-vs-text case to mean anything",
    ).toBeGreaterThan(5);
    expect(
      occurrences(source, HOSTED_FILE_MEMBER),
      "this file no longer names the hosted-file surface often enough for the AST-vs-text case to mean anything",
    ).toBeGreaterThan(15);

    // The gate sees the ONE real import, and only it.
    expect(auditSource(SELF, source).map((v) => v.rule)).toEqual(["fs-import"]);

    // And it is that import, not something else: drop the single line and the
    // file — prose, fixtures and all — reports clean.
    const lines = source.split("\n");
    const realImport = lines.filter(
      (line) =>
        line.startsWith("import ") &&
        line.includes(`"${FS_PREFIX_NODE}${FS_MODULE}"`),
    );
    expect(
      realImport.length,
      "expected exactly one real filesystem import line in this file",
    ).toBe(1);
    expect(
      auditSource(
        SELF,
        lines.filter((l) => !realImport.includes(l)).join("\n"),
      ),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// EVERY RULE'S FAILING PATH, EXECUTED — plus the legal shape it must stay quiet on
// ---------------------------------------------------------------------------

const rulesOf = (src: string, file = "fixture.ts"): string[] =>
  auditSource(file, src).map((v) => v.rule);

/**
 * The import shapes a filesystem module can arrive through.
 *
 * Written as a table crossed with the specifier list rather than by hand,
 * because the whole claim of the `fs-import` rule is that it bans the CAPABILITY
 * and not one spelling of it — and a hand-written fixture list is exactly where
 * one spelling goes missing.
 */
const IMPORT_SHAPES: readonly Readonly<{
  shape: string;
  write: (specifier: string) => string;
}>[] = Object.freeze([
  {
    shape: "a value import",
    write: (s) => `import { readFileSync } from "${s}";`,
  },
  {
    shape: "a namespace import",
    write: (s) => `import * as bound from "${s}";`,
  },
  { shape: "a default import", write: (s) => `import bound from "${s}";` },
  { shape: "a side-effect import", write: (s) => `import "${s}";` },
  {
    shape: "a type-only import",
    write: (s) => `import type { Stats } from "${s}";`,
  },
  {
    shape: "an export-from",
    write: (s) => `export { readFileSync } from "${s}";`,
  },
  { shape: "a require()", write: (s) => `const bound = require("${s}");` },
  {
    shape: "a dynamic import()",
    write: (s) => `const bound = await import("${s}");`,
  },
  {
    shape: "an import-equals-require",
    write: (s) => `import bound = require("${s}");`,
  },
]);

const FS_IMPORT_TABLE = FS_SPECIFIER_LIST.flatMap((specifier) =>
  IMPORT_SHAPES.map(({ shape, write }) => ({
    specifier,
    shape,
    source: write(specifier),
  })),
);

/**
 * Specifiers that must stay quiet, and each is a near-miss chosen to prove a
 * different thing.
 *
 * `path` and `os` are on the SAME bundle allowlist as `fs` and are genuinely
 * used by this codebase's tooling; `sqlite` is the runtime module the whole
 * store is built on; `fs-extra` proves the match is EXACT and not a prefix;
 * `./fs` proves a local module may be named anything; `node:fsevents` proves the
 * `node:` family is matched member-by-member and not by its prefix.
 */
const LEGAL_SPECIFIERS: readonly string[] = Object.freeze([
  "path",
  "node:path",
  "llrt/path",
  "os",
  "crypto",
  "sqlite",
  "caido:utils",
  "fs-extra",
  "./fs",
  "node:fsevents",
]);

const LEGAL_IMPORT_TABLE = LEGAL_SPECIFIERS.flatMap((specifier) =>
  IMPORT_SHAPES.map(({ shape, write }) => ({
    specifier,
    shape,
    source: write(specifier),
  })),
);

/**
 * A firing fixture for every rule that is not `fs-import`, with its EXACT
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
    rule: "hosted-file",
    name: "the direct create call",
    source: "await sdk.hostedFile.create({ name: n, content: c });",
    expected: ["hosted-file"],
  },
  {
    rule: "hosted-file",
    name: "the read half — getAll is banned too, because a HostedFile carries a server path",
    source: "const all = await sdk.hostedFile.getAll();",
    expected: ["hosted-file"],
  },
  {
    rule: "hosted-file",
    name: "a one-hop alias",
    source: "const hf = sdk.hostedFile;\nawait hf.create(spec);",
    expected: ["hosted-file"],
  },
  {
    rule: "hosted-file",
    name: "a two-hop alias, which resolves because collect grows from the LIVE set",
    source: "const a = sdk.hostedFile;\nconst b = a;\nawait b.create(spec);",
    expected: ["hosted-file"],
  },
  {
    rule: "hosted-file",
    name: "a lazy-init logical assignment, the spelling two characters from `=`",
    source: "let hf;\nhf ??= sdk.hostedFile;\nawait hf.create(spec);",
    expected: ["hosted-file"],
  },
  {
    rule: "hosted-file",
    name: "a destructure of the SDK object — reported at the BINDING and again at the use, because the capability is reached twice",
    source: "const { hostedFile } = sdk;\nawait hostedFile.create(spec);",
    expected: ["hosted-file", "hosted-file"],
  },
  {
    rule: "hosted-file",
    name: "an `as` cast around the receiver, which is the wrapper that defeats a naive match",
    source: "await (sdk as PluginSdk).hostedFile.create(spec);",
    expected: ["hosted-file"],
  },
  {
    rule: "hosted-file",
    name: "a computed selection whose key REDUCES to the member name",
    source: 'const key = "hostedFile";\nawait sdk[key].create(spec);',
    expected: ["hosted-file"],
  },
  {
    rule: "hosted-file",
    name: "a computed member of the receiver whose key reduces",
    source: 'await sdk.hostedFile["create"](spec);',
    expected: ["hosted-file"],
  },
  {
    rule: "hosted-file-unanalysable",
    name: "a string-concatenated selection of the surface, written inline",
    source: 'await sdk["hosted" + "File"].create(spec);',
    expected: ["hosted-file-unanalysable"],
  },
  {
    rule: "hosted-file-unanalysable",
    name: "the same assembly, one hop away through a name",
    source: 'const key = "hosted" + "File";\nawait sdk[key].create(spec);',
    expected: ["hosted-file-unanalysable"],
  },
  {
    rule: "hosted-file-unanalysable",
    name: "a template assembly, which hides the key just as well as a concatenation",
    source: "await sdk[`hosted${suffix}`].create(spec);",
    expected: ["hosted-file-unanalysable"],
  },
  {
    rule: "hosted-file-unanalysable",
    name: "an assembled MEMBER of an already-identified receiver",
    source: 'const m = "cre" + "ate";\nawait sdk.hostedFile[m](spec);',
    expected: ["hosted-file-unanalysable"],
  },
  {
    rule: "hosted-file-unanalysable",
    name: "an assembled destructure key, the spelling that would otherwise bind the surface invisibly",
    source: 'const { ["hosted" + "File"]: hf } = sdk;',
    expected: ["hosted-file-unanalysable"],
  },
]);

/**
 * Shapes that MUST stay quiet. Each is real in, or adjacent to, this codebase.
 *
 * The three PATH ACCESSORS are the reason this list exists at all. They read
 * strings and touch no filesystem, one of them is named inside redacted error
 * text in telemetry.ts, and without them the `hosted-file` rule would be
 * indistinguishable from a ban on the word "path".
 */
const LEGAL_FIXTURES: readonly Readonly<{ name: string; source: string }>[] =
  Object.freeze([
    {
      name: "sdk.meta.path() — the plugin data directory accessor, LEGAL",
      source: "const dir = sdk.meta.path();",
    },
    {
      name: "sdk.meta.assetsPath() — the assets directory accessor, LEGAL",
      source: "const assets = sdk.meta.assetsPath();",
    },
    {
      name: "sdk.meta.db() — how this plugin gets its database at all, LEGAL",
      source: "const db = await sdk.meta.db();",
    },
    {
      name: "the project path accessor, LEGAL",
      source: "const p = sdk.projects.getCurrent().getPath();",
    },
    {
      name: "all four accessors together, in one module",
      source: [
        "const dir = sdk.meta.path();",
        "const assets = sdk.meta.assetsPath();",
        "const db = await sdk.meta.db();",
        "const p = sdk.projects.getCurrent().getPath();",
      ].join("\n"),
    },
    {
      name: "a destructure of the LEGAL half of sdk.meta",
      source: "const { path, assetsPath, db } = sdk.meta;\nconst d = path();",
    },
    {
      name: "an ordinary object whose method is NAMED like a filesystem call",
      source: "const out = fsHelper.writeFileSync(target, bytes);",
    },
    {
      name: "an ordinary object with a member named for hosted files, not USED as the surface",
      source: "const n = telemetry.counters.hostedFileAttempts;",
    },
    {
      name: "a bare filesystem call with no import — nothing is reachable without the module",
      source: "const bytes = readFileSync(target);",
    },
    {
      name: "an ordinary dotted-path walk, which the parent gate MEASURED a wider rule firing on",
      source: "for (const key of segments) cur = cur[key];",
    },
    {
      name: "an ordinary numeric index",
      source: "const last = MIGRATIONS[MIGRATIONS.length - 1];",
    },
    {
      name: "a parameter used as a key — never watched being bound, so never reported",
      source: "function at(ctx, root) {\n  return ctx[root];\n}",
    },
    {
      name: "a comment naming every forbidden specifier and the surface",
      source: [
        "// This module does not import fs, node:fs, llrt/fs, fs/promises,",
        "// node:fs/promises or llrt/fs/promises, and never calls",
        "// sdk.hostedFile.create or sdk.hostedFile.getAll.",
        "export const NOTHING = 0;",
      ].join("\n"),
    },
    {
      name: "a string literal naming a forbidden specifier — the shape a substring scan cannot tell from an import",
      source:
        'const documented = "import { readFileSync } from \\"node:fs\\";";',
    },
    {
      name: "a template literal naming the surface",
      source: "const doc = `sdk.${member}File.create is forbidden`;",
    },
  ]);

describe("the gate's own failure paths, every one of them executed", () => {
  it.each(FS_IMPORT_TABLE)(
    "fs-import fires on $shape of $specifier",
    ({ source }) => {
      expect(rulesOf(source)).toEqual(["fs-import"]);
    },
  );

  it.each(LEGAL_IMPORT_TABLE)(
    "fs-import stays QUIET on $shape of $specifier",
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
    // The non-vacuity of the fixture table itself. Without this, adding a fourth
    // rule and no fixture for it would leave a rule whose failing path has never
    // run — the exact defect this file's whole shape exists to prevent, hiding
    // inside the file that exists to prevent it.
    const covered = new Set<string>(FIRING_FIXTURES.map((f) => f.rule));
    if (FS_IMPORT_TABLE.length > 0) covered.add("fs-import");
    expect([...covered].sort()).toEqual(Object.keys(RULES).sort());
  });

  it("EVERY declared rule id has at least one legal fixture proving it stays quiet", () => {
    // Asserted as REACH rather than as a count: each rule is named with the
    // fixture family that proves it silent, so a rule cannot be added with a
    // firing case and no counter-case.
    expect(LEGAL_IMPORT_TABLE.length).toBeGreaterThan(0); // fs-import
    expect(
      LEGAL_FIXTURES.some((f) => f.source.includes("sdk.meta.path()")),
    ).toBe(true); // hosted-file
    expect(LEGAL_FIXTURES.some((f) => f.source.includes("cur[key]"))).toBe(
      true,
    ); // hosted-file-unanalysable
  });

  it("the three path accessors each report the EMPTY array, not merely some other rule", () => {
    // Stated as its own case because "did not fire THIS rule" and "reported
    // nothing at all" are different claims, and only the second one is what
    // "these stay LEGAL" means.
    expect(auditSource("legal.ts", "const dir = sdk.meta.path();")).toEqual([]);
    expect(
      auditSource("legal.ts", "const assets = sdk.meta.assetsPath();"),
    ).toEqual([]);
    expect(
      auditSource("legal.ts", "const p = sdk.projects.getCurrent().getPath();"),
    ).toEqual([]);
  });

  it("FORBIDDEN_FILESYSTEM is DERIVED from RULES and cannot disagree with it", () => {
    expect(FORBIDDEN_FILESYSTEM.map((r) => r.rule).sort()).toEqual(
      Object.keys(RULES).sort(),
    );
    expect(Object.isFrozen(FORBIDDEN_FILESYSTEM)).toBe(true);
    for (const rule of FORBIDDEN_FILESYSTEM) {
      expect(Object.isFrozen(rule)).toBe(true);
      expect(
        rule.surface.length,
        `${rule.rule} has no surface`,
      ).toBeGreaterThan(0);
      expect(rule.why.length, `${rule.rule} has no why`).toBeGreaterThan(0);
    }
  });

  it("the fs-import case table is the FULL CROSS PRODUCT of specifier forms and import shapes", () => {
    // The criterion this file is held to is a PRODUCT — every specifier form in
    // every import shape — so it is asserted as one rather than counted by hand
    // in a review. A shape added without a specifier, or a specifier added
    // without every shape, fails here instead of leaving a spelling untested.
    expect(FS_IMPORT_TABLE.length).toBe(
      FS_SPECIFIER_LIST.length * IMPORT_SHAPES.length,
    );
    expect(
      new Set(FS_IMPORT_TABLE.map((r) => `${r.specifier}|${r.shape}`)).size,
      "the cross product contains a duplicate pair, so its length overstates its reach",
    ).toBe(FS_IMPORT_TABLE.length);
    // The floor the plan set: four specifier families crossed with five import
    // shapes. Shipped is six by nine.
    expect(FS_IMPORT_TABLE.length).toBeGreaterThanOrEqual(4 * 5);
  });

  it("the specifier list is DERIVED from the prefix families, covering every form", () => {
    // Six specifiers from three families, and the derivation asserted rather
    // than the list — so a fourth family is one entry and cannot arrive with
    // half its forms missing.
    expect(FS_SPECIFIER_LIST.length).toBe(FS_PREFIXES.length * 2);
    expect([...FS_SPECIFIERS].sort()).toEqual(
      [
        "fs",
        "fs/promises",
        "llrt/fs",
        "llrt/fs/promises",
        "node:fs",
        "node:fs/promises",
      ].sort(),
    );
  });

  it("the failure message carries the WHY, not just the rule id", () => {
    // The `why` travels with the violation into the message, which is the
    // difference between a gate that explains itself at 2am and one that says
    // `fs-import` and leaves the reader to find this file.
    const [violation] = auditSource("f.ts", 'import "node:fs";');
    expect(violation?.detail).toContain("DIST-05 bundle allowlist");
    expect(violation?.detail).toContain("Do NOT edit that allowlist");
    expect(violation?.detail).toContain("a side-effect import");
  });

  it("the bundle allowlist is NOT the subject of this gate, and still admits fs", () => {
    // The asymmetry, asserted rather than described. If `fs` ever leaves that
    // allowlist this fails — not because the removal is wrong, but because the
    // argument in this file's header would have silently stopped being true.
    const allowlist = readFileSync(
      "scripts/ci/check-bundle-imports.mjs",
      "utf8",
    );
    expect(
      allowlist,
      "check-bundle-imports.mjs no longer admits fs, so this gate's stated reason for existing has changed and the header needs rewriting",
    ).toContain(`"${FS_MODULE}"`);
  });
});
