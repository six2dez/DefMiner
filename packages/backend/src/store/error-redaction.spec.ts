// packages/backend/src/store/error-redaction.spec.ts — STORE-07's redaction gate.
//
// THE RULE: no module under `packages/backend/src/store/` renders an ERROR-SHAPED
// BINDING to a string without passing it through `describeError` first.
//
// WHY THIS IS STATIC AND NOT A RUNTIME TEST. The failure is invisible at runtime:
// a bare `String(e)` produces a perfectly plausible-looking message, and the only
// thing wrong with it is the target URL sitting in the middle of a driver
// rejection's bound parameters. Nothing throws, nothing is slower, nothing fails.
// So a behavioural test only catches this where somebody thought to write one,
// whereas reading the SOURCE catches every site including the ones written next
// year — which is the argument `sql-discipline.spec.ts` makes for itself and the
// reason this file copies its SHAPE (a pure `auditSource(file, source)`, a
// non-vacuity assertion, and every rule's failing path executed against an inline
// fixture) rather than its rules.
//
// WHY AN AST WALK AND NOT A TEXT SCAN: a regex over lines misses a template that
// spans a line break, a `+` concatenation whose operands straddle a wrap, and any
// call whose receiver is on the previous line — the three shapes prettier is most
// likely to produce in this very package.
//
// ===========================================================================
// THE GATE'S TWO BOUNDARIES, STATED HONESTLY RATHER THAN LEFT TO BE DISCOVERED
// ===========================================================================
// 1. IT IS SCOPED TO `store/`. `packages/backend/src/compat.ts` and
//    `packages/backend/src/hooks/passive.ts` render caught exceptions the same
//    bare way and are OUTSIDE this gate ON PURPOSE — outside the store layer,
//    outside the UAT gap this plan closes, and recorded for a later cleanup pass
//    alongside `01-REVIEW.md`'s IN-01…IN-07 (threat T-01-37, disposition accept).
//    Widening the scope is a one-line change to STORE_DIR when that pass happens.
// 2. IT SKIPS `.spec.ts`, which is what lets this file's own fixtures live inline
//    as strings with no temp file and no stray module for `tsc --build` to trip
//    over.
//
// And one precision it does NOT have, said out loud rather than implied: the catch
// rules resolve the caught binding by NAME from the `CatchClause`, so an identifier
// that merely SHARES that name in an unrelated inner scope is out of reach. The
// walk is scope-blind. It is a gate, not a type checker.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const STORE_DIR = join("packages", "backend", "src", "store");

/** The renderer every error-shaped binding must go through. */
const SAFE_RENDERER = "describeError";

/**
 * Parameter names treated as ERROR-SHAPED for the fourth rule.
 *
 * A small CLOSED set, and that is what keeps the rule tight. Checked against the
 * real tree before it was written rather than assumed: `analyses.ts:194` is the
 * ONLY non-catch error-shaped render in the whole store directory. Every other
 * `String(...)` there renders `sha256`, `request_id`, `detector_set_hash`, `url`,
 * `contentType`, `row.v` or `row.value` — none of them error-shaped — so the rule
 * has zero false-positive surface today.
 */
const ERROR_BINDING_NAMES = new Set(["e", "err", "error", "cause"]);

type Violation = { file: string; rule: string; detail: string };

/** Every non-spec module directly under `store/`. */
function storeModules(): string[] {
  return readdirSync(STORE_DIR, { withFileTypes: true })
    .filter(
      (d) =>
        d.isFile() && d.name.endsWith(".ts") && !d.name.endsWith(".spec.ts"),
    )
    .map((d) => join(STORE_DIR, d.name))
    .sort();
}

/** Is this expression the SAFE call, `describeError(x)`? */
function isSafeRenderCall(node: ts.Node): boolean {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === SAFE_RENDERER
  );
}

/** Is `node` a bare reference to the identifier `name`? */
function isRefTo(node: ts.Node, name: string): boolean {
  return ts.isIdentifier(node) && node.text === name;
}

/**
 * Audit one source file.
 *
 * PURE — takes text, returns findings — so the failing path of every rule below is
 * executed against a synthetic fixture in this same file. A gate whose failure
 * path has never run is a gate nobody has tested, and this phase has been bitten
 * by exactly that four times.
 */
export function auditSource(file: string, source: string): Violation[] {
  const base = file.split("/").pop() ?? file;
  const violations: Violation[] = [];
  const add = (rule: string, detail: string): void => {
    violations.push({ file: base, rule, detail });
  };

  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  /**
   * The three syntactic forms a bare render takes, applied to one binding name.
   *
   * `ruleFor` distinguishes the CATCH class of hole from the PERSISTED-PARAMETER
   * class, so a failure message says which one reopened rather than making the
   * reader work it out.
   */
  const scanFor = (
    root: ts.Node,
    name: string,
    ruleFor: (form: string) => string,
    where: string,
  ): void => {
    const visit = (node: ts.Node): void => {
      // `String(x)` — the callee is the identifier `String` and its sole argument
      // is the binding.
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "String" &&
        node.arguments.length === 1 &&
        node.arguments[0] !== undefined &&
        isRefTo(node.arguments[0], name)
      ) {
        add(
          ruleFor("unredacted-string-call"),
          `${where}: String(${name}) renders an error-shaped binding without ${SAFE_RENDERER}(). A driver rejection can carry the statement text and the bound parameters, and one of those parameters is the observation URL.`,
        );
      }

      // A template literal one of whose spans is the binding.
      if (ts.isTemplateExpression(node)) {
        for (const span of node.templateSpans) {
          if (isRefTo(span.expression, name)) {
            add(
              ruleFor("unredacted-template"),
              `${where}: a template literal interpolates \`${name}\` directly. Interpolate ${SAFE_RENDERER}(${name}) instead.`,
            );
          }
        }
      }

      // `a + b` where either operand is the binding. String concatenation is the
      // third way real code reaches for this.
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.PlusToken &&
        (isRefTo(node.left, name) || isRefTo(node.right, name))
      ) {
        add(
          ruleFor("unredacted-concat"),
          `${where}: \`${name}\` is concatenated with + into a string. Concatenate ${SAFE_RENDERER}(${name}) instead.`,
        );
      }

      // Do not descend into a `describeError(...)` call: the binding appearing
      // as ITS argument is the whole point.
      if (isSafeRenderCall(node)) return;
      ts.forEachChild(node, visit);
    };
    ts.forEachChild(root, visit);
  };

  const visit = (node: ts.Node): void => {
    // ---- Rules 1-3: inside a catch clause, over the CAUGHT binding. ----------
    if (ts.isCatchClause(node)) {
      const decl = node.variableDeclaration;
      // A bare `catch {}` binds nothing and is correctly checked against nothing.
      // The binding is resolved from the clause, so `catch (err)` and
      // `catch (cause)` are checked as rigorously as `catch (e)`.
      if (decl !== undefined && ts.isIdentifier(decl.name)) {
        scanFor(
          node.block,
          decl.name.text,
          (form) => form,
          `catch (${decl.name.text})`,
        );
      }
    }

    // ---- Rule 4: `unredacted-persisted-error`. ------------------------------
    // The three rules above cannot reach `analyses.ts:194` BY CONSTRUCTION: that
    // line is not inside a catch and its binding is a function PARAMETER. It is
    // also the one line in this directory that writes the `analyses.error`
    // COLUMN, which is precisely where UAT gap 1's second `missing` item points.
    // A catch-scoped-only gate would have been a gate with a hole exactly one
    // line below a site it does cover.
    //
    // Matched on `ParameterDeclaration` SPECIFICALLY, never on any identifier
    // with one of these names: `analyses.ts:87` declares `error: string | null`
    // as a TYPE MEMBER of `AnalysisRow`, which renders nothing at runtime and
    // must not be flagged.
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node)) &&
      node.body !== undefined
    ) {
      for (const param of node.parameters) {
        if (
          ts.isIdentifier(param.name) &&
          ERROR_BINDING_NAMES.has(param.name.text)
        ) {
          scanFor(
            node.body,
            param.name.text,
            () => "unredacted-persisted-error",
            `parameter \`${param.name.text}\``,
          );
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
  return violations;
}

// ---------------------------------------------------------------------------
// THE REAL SOURCE.
// ---------------------------------------------------------------------------
describe("error redaction over packages/backend/src/store (STORE-07, T-01-33, T-01-52)", () => {
  const files = storeModules();

  it("enumerates a NON-EMPTY set of store modules, by name", () => {
    // Without this the whole gate passes by measuring nothing — the exact failure
    // class that produced four green-because-they-could-not-fail gates earlier in
    // this phase (T-01-34).
    expect(
      files.length,
      `no .ts modules found under ${STORE_DIR}`,
    ).toBeGreaterThan(0);

    // Named individually so a RENAME is a visible failure rather than a silently
    // shrunk scan set.
    const names = files.map((f) => f.split("/").pop());
    for (const expected of [
      "analyses.ts",
      "artifacts.ts",
      "migrations.ts",
      "observations.ts",
      "retention.ts",
      "settings.ts",
    ]) {
      expect(names, `${expected} is no longer being scanned`).toContain(
        expected,
      );
    }
  });

  it("finds error-shaped bindings to audit — the gate is not scanning inert files", () => {
    // Non-vacuity for the RULES, not just for the file list: a gate over six
    // files that between them contain no catch clause would also report zero.
    let catches = 0;
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const sf = ts.createSourceFile(
        f,
        src,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      const walk = (n: ts.Node): void => {
        if (ts.isCatchClause(n)) catches += 1;
        ts.forEachChild(n, walk);
      };
      walk(sf);
    }
    expect(catches, "no catch clauses found in store/").toBeGreaterThan(5);
  });

  it("reports ZERO violations across the store layer", () => {
    const all: Violation[] = [];
    for (const f of files) all.push(...auditSource(f, readFileSync(f, "utf8")));
    expect(all, JSON.stringify(all, null, 2)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// EVERY RULE'S FAILING PATH, EXECUTED AGAINST AN INLINE FIXTURE.
// ---------------------------------------------------------------------------
describe("the gate's own failure paths", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it("flags String(e) inside a catch — unredacted-string-call", () => {
    expect(
      rulesOf(
        "function f() { try { g(); } catch (e) { return String(e).slice(0, 200); } }",
      ),
    ).toContain("unredacted-string-call");
  });

  it("flags a template literal interpolating the caught binding — unredacted-template", () => {
    expect(
      rulesOf(
        "function f() { try { g(); } catch (e) { return `failed: ${e}`; } }",
      ),
    ).toContain("unredacted-template");
  });

  it("flags a + concatenation of the caught binding — unredacted-concat", () => {
    expect(
      rulesOf(
        'function f() { try { g(); } catch (e) { return "failed: " + e; } }',
      ),
    ).toContain("unredacted-concat");
  });

  it("resolves the binding from the CATCH CLAUSE, not from the name `e`", () => {
    // `catch (err)` and `catch (cause)` are checked as rigorously as `catch (e)`.
    // Without this the rule would be a hard-coded search for one letter.
    expect(
      rulesOf(
        "function f() { try { g(); } catch (err) { return String(err); } }",
      ),
    ).toContain("unredacted-string-call");
    expect(
      rulesOf(
        "function f() { try { g(); } catch (cause) { return `${cause}`; } }",
      ),
    ).toContain("unredacted-template");
  });

  it("a bare `catch {}` binds nothing and is checked against nothing", () => {
    expect(
      rulesOf("function f() { try { g(); } catch { return null; } }"),
    ).toEqual([]);
  });

  // ---- NEGATIVE fixtures: the gate is not always-on. -----------------------

  it("does NOT flag describeError(e) inside a catch", () => {
    expect(
      rulesOf(
        "function f() { try { g(); } catch (e) { return describeError(e).slice(0, 200); } }",
      ),
    ).toEqual([]);
  });

  it("does NOT flag a String(x) call OUTSIDE any catch clause", () => {
    expect(
      rulesOf("function f(x) { return String(x).slice(0, 120); }"),
    ).toEqual([]);
  });

  // ---- Rule 4, `unredacted-persisted-error`: the non-catch parameter. ------

  it("flags an error-shaped PARAMETER rendered with String(...) — none of these is in a catch", () => {
    expect(
      rulesOf(
        "function fin(error: string | null) { return error === null ? null : String(error).slice(0, 300); }",
      ),
    ).toEqual(["unredacted-persisted-error"]);
  });

  it("flags an error-shaped PARAMETER interpolated into a template", () => {
    expect(
      rulesOf("function fin(err: string) { return `state: ${err}`; }"),
    ).toEqual(["unredacted-persisted-error"]);
  });

  it("flags an error-shaped PARAMETER concatenated with +", () => {
    expect(
      rulesOf('function fin(cause: string) { return "state: " + cause; }'),
    ).toEqual(["unredacted-persisted-error"]);
  });

  it("does NOT flag an error-shaped parameter passed to describeError", () => {
    expect(
      rulesOf(
        "function fin(error: string | null) { return error === null ? null : describeError(error).slice(0, 300); }",
      ),
    ).toEqual([]);
  });

  it("does NOT flag a parameter that is not error-shaped", () => {
    expect(
      rulesOf("function f(label: string) { return String(label); }"),
    ).toEqual([]);
    expect(
      rulesOf(
        "function f(contentType: string) { return String(contentType).slice(0, 120); }",
      ),
    ).toEqual([]);
  });

  it("does NOT flag an interface or type MEMBER named `error`", () => {
    // This is the shape `analyses.ts:87` really has: `error: string | null` as a
    // member of `AnalysisRow`. It declares a field, it renders nothing, and
    // matching on any identifier with that name instead of on a
    // ParameterDeclaration would flag it.
    expect(
      rulesOf(
        "type AnalysisRow = { error: string | null }; interface B { error: string } const r: AnalysisRow = { error: null }; const s = String(r.error);",
      ),
    ).toEqual([]);
  });
});
