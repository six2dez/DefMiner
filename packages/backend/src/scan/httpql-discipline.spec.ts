// packages/backend/src/scan/httpql-discipline.spec.ts — O-06's static gate.
//
// A SIBLING OF `store/sql-discipline.spec.ts`, NOT AN EXTENSION OF IT, and the
// difference was measured rather than assumed. That gate's sink set is closed:
//
//   // packages/backend/src/store/sql-discipline.spec.ts — verbatim
//   const SQL_SINKS = new Set(["prepare", "exec", "run", "get", "all"]);
//
// There is no `filter` entry, and its `looksLikeSql()` requires a
// `SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE …|PRAGMA` keyword that no HTTPQL
// clause contains. An HTTPQL string reaches `.filter(...)`. So the shipped gate
// is silent about HTTPQL BY CONSTRUCTION, not by oversight, and widening it
// would have meant teaching one file two grammars. This one is written in its
// shape and says so, the way `outbound-prohibition.spec.ts` says it about the
// same parent.
//
// ===========================================================================
// WHY THIS IS STATIC AND NOT A RUNTIME TEST
// ===========================================================================
// Every failure mode below is SILENT. A widened HTTPQL clause returns MORE rows,
// not an error — there is no exception, no counter moves, and `admit()` still
// runs on every returned item, so nothing wrong is ever WRITTEN. What is spent
// is a full-body transfer per page on a runtime where every page carries whole
// response bodies: a widened clause turns a targeted scan into a pull of every
// stored body in history. That makes this a COST control (T-06-19), and a cost
// control whose failure produces no error is exactly the kind a behavioural test
// only catches where somebody thought to write one. Reading the SOURCE catches
// every call site including the ones written next year.
//
// Parsed with the TypeScript compiler, not a regex. The reason is the parent's
// and it is unchanged: a regex over lines misses multi-line template strings,
// `export … from`, and any call whose receiver spans a line break — the three
// shapes real code is most likely to use. `packages/backend/src/compat.ts:403`
// is already one of them, a `.filter(` whose argument begins on the next line.
//
// The gate's core is a PURE function over (filename, source), so every rule below
// has its FAILING path executed against a synthetic fixture in this same file. A
// gate whose failure path has never run is a gate nobody has tested.
//
// ===========================================================================
// WHAT IT POLICES: COMPOSITION AT THE SINK — NOT WHERE FRAGMENTS LIVE
// ===========================================================================
// This distinction is load-bearing and it is worth being explicit about, because
// the shipped code does not match the naive reading. `SCAN_KIND_CLAUSE` — a
// literal HTTPQL fragment — lives in `packages/engine/src/contract.ts` and not in
// `scan/filter.ts`, because the start form has to render it before any scan row
// exists and the frontend cannot import the backend (plan 06-01, deviation 2).
//
// A gate that asserted "every HTTPQL fragment lives in filter.ts" would therefore
// fail on the shipped tree, and it would be asserting the wrong thing anyway. A
// FRAGMENT cannot hurt anyone: it is DefMiner-authored, it is a constant, and it
// cannot place the operator's clause first. The hazard is a second COMPOSER —
// somewhere that joins DefMiner's narrowing to operator input and gets the order
// or the parenthesisation wrong. So the rule is about what reaches
// `.filter(...)`, and the allowlist has exactly one entry.
//
// ===========================================================================
// THREE BOUNDARIES, STATED RATHER THAN LEFT TO BE DISCOVERED
// ===========================================================================
// 1. IT SKIPS `.spec.ts`, inherited from both parents. That is what lets this
//    file's own fixtures — which necessarily contain the forbidden shapes as
//    source text — live inline with no temp file and no stray module for
//    `tsc --build` to trip over. It costs something real: a spec file could
//    compose HTTPQL unnoticed. The residual is bounded by the fact that a spec
//    never enters the shipped bundle (`pnpm check:bundle` reads the built
//    artifact) and by `scan/producer.ts` being the only module in the package
//    that holds an `sdk.requests.query()` to call `.filter()` on at all.
//
// 2. THE ARRAY/HTTPQL DISCRIMINATOR IS SYNTACTIC, AND IT ERRS TOWARD REPORTING.
//    `Array.prototype.filter` is ordinary JavaScript and appears throughout this
//    codebase; `RequestsQuery.filter` takes a STRING. Nothing here has type
//    information, so the discriminator is the argument's SHAPE: a function-valued
//    argument — an arrow, a function expression, or a local name bound to one —
//    is an array filter and is ignored. Everything else is treated as an HTTPQL
//    sink. The direction that errs in is deliberate: an array `.filter(pred)`
//    given an IMPORTED named predicate is REPORTED, and the fix is a visible
//    one-line edit (`.filter((x) => pred(x))`) or a deliberate allowlist entry.
//    Under-reporting would cost a widened scan; over-reporting costs a rewrite of
//    one line. There is no such call in the tree today and this is asserted, not
//    assumed — every enumerated file reports clean below.
//
// 3. IT RESOLVES NAMES FILE-WIDE AND BUILDS NO SYMBOL TABLE. `const f = compose(a, b);
//    query().filter(f)` is resolved by looking the name up in every variable
//    declaration in the file, at any scope, exactly as the parent's second
//    composition pass does. Two declarations of the same name in different scopes
//    collapse to the last one seen. That errs toward REPORTING as well: an
//    unresolvable name is reported rather than trusted.

import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

/** The scanned tree. The backend package only: `packages/engine` holds no SDK
 *  handle and cannot reach a query builder — it declares no dependencies at all
 *  (DET-03), which knip enforces. */
const BACKEND_SRC = "packages/backend/src";

/** This file, so the documentation-hazard case can audit its own prose. */
const THIS_FILE = `${BACKEND_SRC}/scan/httpql-discipline.spec.ts`;

/**
 * Every non-spec module in the backend package, at any depth.
 *
 * POSIX `join`, the shape `outbound-prohibition.spec.ts` uses: the paths are
 * compared against POSIX literals in the non-vacuity block below, and Node
 * accepts `/` on every platform it supports, so building with it costs nothing
 * and removes one way for this gate to behave differently on somebody else's
 * machine.
 */
function backendFiles(): string[] {
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
  walk(BACKEND_SRC);
  return out.sort();
}

/**
 * EVERY rule this gate can emit, with the surface it guards and the reason it
 * exists, frozen.
 *
 * The `RULES` record shape from `outbound-prohibition.spec.ts`: `RuleId` is
 * derived from the KEYS, so a typo cannot compile, and the `why` travels with the
 * rule into the failure message — which is the difference between a gate that
 * explains itself at 2am and a bare rule id.
 */
const RULES = Object.freeze({
  "httpql-interpolation": Object.freeze({
    rule: "httpql-interpolation",
    surface:
      "a template literal carrying a substitution, reaching a `.filter(...)` sink",
    why:
      "an interpolated filter is a filter somebody is BUILDING, and building is the " +
      "step where clause order and parenthesisation get decided. HTTPQL has no bind " +
      "parameters, so there is no safe interpolation to permit — the safe shape is to " +
      "call the one composer, which puts DefMiner's narrowing first and the operator's " +
      "clause last. D-05 is the requirement; T-06-HTTPQL-INJ is the threat.",
  }),
  "httpql-concatenation": Object.freeze({
    rule: "httpql-concatenation",
    surface:
      "a `+` chain or an `Array.join(...)` result, reaching a `.filter(...)` sink",
    why:
      "the natural spelling of a query BUILDER, and the one the parent gate measured " +
      "itself silent on (05-RESEARCH § O-01, probes P1 and P3). A second builder is a " +
      "second place the operator's clause can be placed FIRST, where a trailing `//` " +
      "comments DefMiner's narrowing away instead of unbalancing a trailing parenthesis.",
  }),
  "httpql-foreign-producer": Object.freeze({
    rule: "httpql-foreign-producer",
    surface:
      "any non-function argument to a `.filter(...)` sink that did not come from the one allowlisted composer",
    why:
      "the catch-all, and the rule that makes the other two more than a list of " +
      "spellings. A bare literal, a property access, a conditional, a call to some " +
      "other function — each is a filter string this codebase cannot account for. The " +
      "claim `composeScanFilter` is the ONLY producer of a scan filter string is only " +
      "worth writing down if something checks it.",
  }),
});

type RuleId = keyof typeof RULES;

type Violation = { file: string; rule: RuleId; detail: string };

/** The method a finished HTTPQL string is handed to. One name, and it is closed:
 *  `RequestsQuery.filter(clause)` is the only place in the SDK a query string is
 *  accepted. */
const HTTPQL_SINKS = new Set(["filter"]);

/**
 * The ONE allowlisted producer in the package.
 *
 * Mirrors `sql-discipline.spec.ts`'s `INTERPOLATION_ALLOWLIST`: one entry,
 * matched on the callee's HEAD TEXT, so a different function does not inherit the
 * exemption by resembling it. `module` is not matched on — it records where the
 * producer lives so a reader does not have to search for it, and the "the
 * allowlist is LIVE" case below asserts the file really exports that name.
 */
const HTTPQL_PRODUCER_ALLOWLIST = Object.freeze([
  Object.freeze({ producer: "composeScanFilter", module: "scan/filter.ts" }),
]);

function isAllowlistedProducer(name: string): boolean {
  return HTTPQL_PRODUCER_ALLOWLIST.some((a) => a.producer === name);
}

/** Strip the wrappers that hide an expression from a syntactic match. */
function unwrap(expr: ts.Expression): ts.Expression {
  let e = expr;
  for (;;) {
    if (ts.isParenthesizedExpression(e) || ts.isAwaitExpression(e))
      e = e.expression;
    else if (ts.isAsExpression(e) || ts.isSatisfiesExpression(e))
      e = e.expression;
    else if (ts.isNonNullExpression(e)) e = e.expression;
    else return e;
  }
}

/** A function-valued argument — the `Array.prototype.filter` shape. See boundary 2. */
function isFunctionValued(expr: ts.Expression): boolean {
  return ts.isArrowFunction(expr) || ts.isFunctionExpression(expr);
}

/** The callee's head name: `f(…)` → `f`, `a.b.f(…)` → `f`. */
function calleeName(call: ts.CallExpression, sf: ts.SourceFile): string {
  const callee = unwrap(call.expression);
  if (ts.isIdentifier(callee)) return callee.text;
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  if (ts.isElementAccessExpression(callee)) {
    const arg = callee.argumentExpression;
    return ts.isStringLiteral(arg) ? arg.text : arg.getText(sf);
  }
  return callee.getText(sf);
}

/**
 * Audit one source file. Pure — takes text, returns findings — so the failing
 * path of every rule can be executed against a synthetic fixture below.
 */
export function auditHttpqlSource(file: string, source: string): Violation[] {
  const base = file.split("/").pop() ?? file;
  const violations: Violation[] = [];
  const add = (rule: RuleId, detail: string): void => {
    violations.push({
      file: base,
      rule,
      detail: `${detail} — ${RULES[rule].why}`,
    });
  };

  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  // Collected in ONE document-order pass, then resolved. The declaration may
  // appear AFTER the sink that consumes it, which is why nothing is classified
  // during the walk itself.
  const declInit = new Map<string, ts.Expression>();
  const sinkArgs: { expr: ts.Expression; where: string }[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const init = node.initializer;
      if (init !== undefined) declInit.set(node.name.text, init);
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const method = node.expression.name.text;
      const first = node.arguments[0];
      if (HTTPQL_SINKS.has(method) && first !== undefined) {
        const receiver = node.expression.expression.getText(sf).slice(0, 40);
        sinkArgs.push({
          expr: first,
          where: `${receiver}.${method}() argument`,
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);

  const classify = (
    expr: ts.Expression,
    where: string,
    seen: Set<string>,
  ): void => {
    const inner = unwrap(expr);

    // The array filter, ruled out first and by shape. See boundary 2.
    if (isFunctionValued(inner)) return;

    if (ts.isTemplateExpression(inner) && inner.templateSpans.length > 0) {
      add(
        "httpql-interpolation",
        `${where}: a template literal with ${String(inner.templateSpans.length)} substitution(s) reaches a filter sink`,
      );
      return;
    }

    if (
      ts.isBinaryExpression(inner) &&
      inner.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      add("httpql-concatenation", `${where}: a + chain reaches a filter sink`);
      return;
    }

    if (ts.isCallExpression(inner)) {
      const name = calleeName(inner, sf);
      if (name === "join") {
        add(
          "httpql-concatenation",
          `${where}: an Array.join(...) result reaches a filter sink`,
        );
        return;
      }
      if (isAllowlistedProducer(name)) return;
      add(
        "httpql-foreign-producer",
        `${where}: the value comes from ${JSON.stringify(name)}, which is not the one allowlisted composer (${HTTPQL_PRODUCER_ALLOWLIST.map((a) => a.producer).join(", ")})`,
      );
      return;
    }

    if (ts.isIdentifier(inner)) {
      if (seen.has(inner.text)) {
        add(
          "httpql-foreign-producer",
          `${where}: ${inner.text} resolves in a cycle`,
        );
        return;
      }
      const init = declInit.get(inner.text);
      if (init === undefined) {
        add(
          "httpql-foreign-producer",
          `${where}: ${inner.text} is not bound by any variable declaration in this file, so this gate cannot tell where the string came from`,
        );
        return;
      }
      classify(
        init,
        `${where} via ${inner.text}`,
        new Set([...seen, inner.text]),
      );
      return;
    }

    add(
      "httpql-foreign-producer",
      `${where}: a ${ts.SyntaxKind[inner.kind]} reaches a filter sink without passing through the one allowlisted composer`,
    );
  };

  for (const { expr, where } of sinkArgs)
    classify(expr, where, new Set<string>());

  return violations;
}

/**
 * Every `.filter(...)` call site in a file, as source text.
 *
 * An INDEPENDENT walk, deliberately. The non-vacuity assertions below need to
 * know the gate is looking at something, and measuring that with the same
 * function under test would answer the question with the thing being questioned.
 */
function httpqlSinkCallTexts(file: string, source: string): string[] {
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      HTTPQL_SINKS.has(node.expression.name.text)
    ) {
      out.push(node.getText(sf).slice(0, 120));
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

describe("HTTPQL discipline over packages/backend/src (O-06, D-05, T-06-21)", () => {
  // BOUND ONCE, AND EVERY CASE BELOW READS THIS BINDING. Two filesystem walks
  // would mean the assertions that say "the scan is not empty and contains these
  // files" were made against a DIFFERENT array than the per-file cases iterate,
  // and neither would say so.
  const files = backendFiles();

  it("enumerates a NON-EMPTY set of shipped modules, BY NAME", () => {
    // Without this the whole gate passes by measuring nothing. Names rather than
    // a count, so a rename or a moved directory is a VISIBLE change instead of a
    // silently shrunk scanned set.
    expect(
      files.length,
      `no .ts modules found under ${BACKEND_SRC}`,
    ).toBeGreaterThan(0);
    for (const expected of [
      // The three modules this gate is actually about.
      "scan/filter.ts",
      "scan/producer.ts",
      "scan/scans.ts",
      // And the modules most likely to grow the next query: the RPC surface and
      // the two hook-side modules that already hold an sdk handle.
      "index.ts",
      "hooks/admit.ts",
      "ingest/consumer.ts",
    ]) {
      expect(
        files.some((f) => f.endsWith(`/${expected}`)),
        `${expected} is not being audited`,
      ).toBe(true);
    }
  });

  it("the walk really DESCENDED into subdirectories, including scan/", () => {
    // A non-recursive read would enumerate index.ts, lifecycle.ts, telemetry.ts
    // and compat.ts and pass every rule below having never opened the one
    // directory this gate exists for.
    expect(
      files.some((f) => f.startsWith(`${BACKEND_SRC}/scan/`)),
      "the walk did not descend into scan/, which is where every filter sink lives",
    ).toBe(true);
    expect(
      files.filter((f) => f.slice(BACKEND_SRC.length + 1).includes("/")).length,
      "no enumerated path contains a separator, so the walk is flat",
    ).toBeGreaterThan(0);
  });

  it("the per-file cases iterate the SAME binding the assertions above measured", () => {
    expect(backendFiles()).toEqual(files);
  });

  it("emits exactly the rules it claims to — the gate's REACH, named", () => {
    // The RULE set, guarded as a set rather than as a number somebody remembered
    // to bump. `RuleId` is `keyof typeof RULES`, so a rule emitted without
    // appearing here is a typecheck failure rather than a silently wider gate.
    expect(Object.keys(RULES)).toEqual([
      "httpql-interpolation",
      "httpql-concatenation",
      "httpql-foreign-producer",
    ]);
    for (const [id, entry] of Object.entries(RULES)) {
      expect(entry.rule, "a RULES key and its own rule field disagree").toBe(
        id,
      );
      expect(entry.surface.length, `${id} has no surface`).toBeGreaterThan(0);
      expect(entry.why.length, `${id} has no why`).toBeGreaterThan(0);
    }
    expect(Object.isFrozen(RULES)).toBe(true);
  });

  it("finds filter sinks to audit — the gate is not measuring an empty set", () => {
    // Non-vacuity for the SINK SEARCH, measured with the independent walk. If
    // `runScanProducer`'s query ever moves, this fails loudly rather than leaving
    // a gate that passes because it found nothing to look at.
    let total = 0;
    for (const f of files)
      total += httpqlSinkCallTexts(f, readFileSync(f, "utf8")).length;
    expect(
      total,
      "no .filter(...) call site was found anywhere in the backend, so every rule below is vacuous",
    ).toBeGreaterThan(0);

    const producer = `${BACKEND_SRC}/scan/producer.ts`;
    expect(
      httpqlSinkCallTexts(producer, readFileSync(producer, "utf8")).length,
      "scan/producer.ts holds the one legitimate query().filter() call and it was not seen",
    ).toBeGreaterThan(0);
  });

  it.each(files)(
    "%s composes no HTTPQL outside the one allowlisted producer",
    (file) => {
      const violations = auditHttpqlSource(file, readFileSync(file, "utf8"));
      expect(
        violations.map((v) => `${v.rule}: ${v.detail}`),
        `${file} produces an HTTPQL filter string outside composeScanFilter, which D-05 forbids`,
      ).toEqual([]);
    },
  );

  it("the ONE allowlisted producer is real, and the allowlist is LIVE", () => {
    // The exemption exists AND is exercised. If `runScanProducer` ever stopped
    // calling the composer, this notices the allowlist had gone dead rather than
    // leaving a permanent hole nobody uses — the same reason
    // `sql-discipline.spec.ts` asserts its PRAGMA exemption is still used.
    expect(HTTPQL_PRODUCER_ALLOWLIST).toHaveLength(1);
    const entry = HTTPQL_PRODUCER_ALLOWLIST[0];
    const composerFile = `${BACKEND_SRC}/${entry.module}`;
    expect(readFileSync(composerFile, "utf8")).toContain(
      `export function ${entry.producer}(`,
    );

    const producer = `${BACKEND_SRC}/scan/producer.ts`;
    const src = readFileSync(producer, "utf8");
    expect(
      src,
      "producer.ts no longer calls the allowlisted composer",
    ).toContain(`${entry.producer}(`);
    expect(auditHttpqlSource(producer, src)).toEqual([]);

    // MUTATED: the same file with the composer renamed to something that is not
    // on the allowlist. This is what proves the clean result above is the
    // allowlist working rather than the gate never reaching the call.
    const mutated = src.split(`${entry.producer}(`).join("buildFilterSomehow(");
    expect(auditHttpqlSource(producer, mutated).map((v) => v.rule)).toContain(
      "httpql-foreign-producer",
    );
  });

  it("this file NAMES every forbidden shape in prose and still reports clean", () => {
    // The documentation hazard, live and asserted on the real file. It is the
    // mechanical proof that the gate walks the AST rather than scanning strings:
    // the header above contains `.filter(...)`, `+`, `Array.join` and a verbatim
    // `SQL_SINKS` line, and every fixture below contains a forbidden shape as
    // source text. A gate a comment can trip is a gate that gets weakened rather
    // than obeyed, which is `store/export.ts`'s stated rule.
    expect(
      auditHttpqlSource(THIS_FILE, readFileSync(THIS_FILE, "utf8")),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// EVERY RULE'S FAILING PATH, EXECUTED — plus the legal shape it must stay quiet on
// ---------------------------------------------------------------------------
describe("the gate's own failure paths", () => {
  const rulesOf = (src: string, file = "fixture.ts"): RuleId[] =>
    auditHttpqlSource(file, src).map((v) => v.rule);

  // --- httpql-interpolation ------------------------------------------------

  it("httpql-interpolation FIRES on a template literal with a substitution", () => {
    expect(rulesOf('await q.filter(`req.host.eq:"${host}"`);')).toContain(
      "httpql-interpolation",
    );
  });

  it("httpql-interpolation FIRES through a name bound to the template", () => {
    // The realistic spelling, and the one a sink-only check would miss: the
    // declaration is resolved file-wide, at any scope, and may appear after the
    // sink that consumes it.
    expect(
      rulesOf(
        "await q.filter(clause);\nconst clause = `(${kind}) AND (${operator})`;",
      ),
    ).toContain("httpql-interpolation");
  });

  it("httpql-interpolation stays QUIET on a template with no substitution reaching an array", () => {
    // A no-substitution template is not an interpolation. It is still a foreign
    // producer at a filter sink — asserted separately below — but not this rule.
    expect(rulesOf('await q.filter(`req.host.eq:"a"`);')).not.toContain(
      "httpql-interpolation",
    );
  });

  // --- httpql-concatenation ------------------------------------------------

  it("httpql-concatenation FIRES on two identifiers joined with +", () => {
    expect(rulesOf("await q.filter(kindClause + operatorClause);")).toContain(
      "httpql-concatenation",
    );
  });

  it("httpql-concatenation FIRES on an Array.join(...) result", () => {
    expect(
      rulesOf('await q.filter([kind, position, operator].join(" AND "));'),
    ).toContain("httpql-concatenation");
    // And through a name, which is how it would actually be written.
    expect(
      rulesOf(
        'const terms = [kind, operator];\nawait q.filter(terms.join(" AND "));',
      ),
    ).toContain("httpql-concatenation");
  });

  it("httpql-concatenation stays QUIET on string work that never reaches a sink", () => {
    // `a + b` over two identifiers is ordinary string work everywhere else in the
    // language — the parent gate's own reasoning for detecting composition at the
    // sink and not at the concatenation.
    expect(
      rulesOf('const label = kind + " AND " + operator;\nlogger.info(label);'),
    ).toEqual([]);
    expect(
      rulesOf('const joined = [a, b].join(" AND ");\nreturn joined;'),
    ).toEqual([]);
  });

  // --- httpql-foreign-producer ---------------------------------------------

  it("httpql-foreign-producer FIRES on a bare string literal at a sink", () => {
    expect(
      rulesOf('await q.filter("req.host.eq:\\"a.example\\"");', "somewhere.ts"),
    ).toContain("httpql-foreign-producer");
    expect(
      rulesOf('await q.filter(`req.host.eq:"a"`);', "somewhere.ts"),
    ).toContain("httpql-foreign-producer");
  });

  it("httpql-foreign-producer FIRES on a call to any function that is not the composer", () => {
    expect(
      rulesOf("await q.filter(buildFilter(position, operator));"),
    ).toContain("httpql-foreign-producer");
    expect(rulesOf("await q.filter(helpers.buildFilter(operator));")).toContain(
      "httpql-foreign-producer",
    );
  });

  it("httpql-foreign-producer FIRES on a name this file cannot account for", () => {
    // An imported string, a parameter, a property — the gate does not guess.
    expect(rulesOf("await q.filter(importedClause);")).toContain(
      "httpql-foreign-producer",
    );
    expect(rulesOf("await q.filter(scan.operator_filter);")).toContain(
      "httpql-foreign-producer",
    );
    expect(rulesOf("await q.filter(wide ? a : b);")).toContain(
      "httpql-foreign-producer",
    );
  });

  it("httpql-foreign-producer stays QUIET on the one allowlisted composer", () => {
    expect(
      rulesOf(
        "await sdk.requests.query().filter(composeScanFilter(position, operator)).execute();",
      ),
    ).toEqual([]);
    // Including through a name, which is exactly how producer.ts writes it.
    expect(
      rulesOf(
        "const filter = composeScanFilter(positionClause(id), operator);\nawait q.filter(filter);",
      ),
    ).toEqual([]);
  });

  it("a lookalike does NOT inherit the exemption", () => {
    // Head-text matched, so `composeScanFilterUnsafe` is a different function and
    // is reported. An allowlist matched by prefix would be an allowlist a rename
    // can widen.
    expect(
      rulesOf("await q.filter(composeScanFilterUnsafe(position, operator));"),
    ).toContain("httpql-foreign-producer");
  });

  // --- the false positive that matters most --------------------------------

  it("Array.prototype.filter reports NOTHING — the single most important false positive", () => {
    // THE one that would get this gate reverted within the hour, and rightly.
    // Asserted as the EMPTY ARRAY rather than "not the httpql rule", so a future
    // fourth rule cannot start firing here unnoticed.
    expect(rulesOf("const missing = surfaces.filter((s) => !s.ok);")).toEqual(
      [],
    );
    expect(
      rulesOf("const out = rows.filter(function (r) { return r.ok; });"),
    ).toEqual([]);
    // Multi-line, the shape compat.ts:403 already uses and the shape a regex
    // over lines would miss in the other direction.
    expect(
      rulesOf(
        "const missing = probe(ctx, [\n  'db',\n]).filter(\n  (s) => !s.ok,\n);",
      ),
    ).toEqual([]);
    // A local name bound to an arrow is still a predicate.
    expect(
      rulesOf("const isOk = (s) => s.ok;\nconst out = rows.filter(isOk);"),
    ).toEqual([]);
    // And a `.filter()` with no argument at all is not a sink.
    expect(rulesOf("const out = rows.filter();")).toEqual([]);
  });

  it("the REAL array filters in this package report nothing", () => {
    // The live version of the case above, on the shipped files rather than on a
    // fixture — `compat.ts` and `scan/scans.ts` between them hold every
    // `Array.prototype.filter` in the package.
    for (const f of ["compat.ts", "scan/scans.ts"]) {
      const full = `${BACKEND_SRC}/${f}`;
      expect(
        auditHttpqlSource(full, readFileSync(full, "utf8")),
        `${f} reported a violation`,
      ).toEqual([]);
    }
  });
});
