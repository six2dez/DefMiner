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
// THE GATE'S FOUR BOUNDARIES, STATED HONESTLY RATHER THAN LEFT TO BE DISCOVERED
// ===========================================================================
// 1. IT IS SCOPED TO `store/` — AND THE THREE RENDERS OUTSIDE THAT SCOPE ARE
//    NAMED HERE, EACH WITH ITS OWNER. Rewritten on 2026-08-21 (01-13). This
//    boundary used to name two files and stop. A residual disclosed with no owner
//    is read as somebody else's problem by every reader in turn, and these two
//    have been disclosed since 01-07 with nobody named. The owners below are
//    checkable against `.planning/ROADMAP.md`'s Requirement Traceability table
//    (`:396`, `ERR-01 … ERR-04 → Phase 2`), not asserted:
//
//      - `packages/backend/src/compat.ts:317` renders `String(e).slice(0, 160)`
//        into the per-surface `error` field the operator reads.
//        OWNER: **Phase 2, ERR-04** — "a per-artifact failure is recorded with its
//        reason and is visible to the operator". That requirement rewrites how a
//        failure is recorded and surfaced, which is the moment the redaction
//        decision is that author's to make rather than deferred past them.
//      - `packages/backend/src/hooks/passive.ts:171` renders
//        `String(e).slice(0, 160)` into `sdk.console.log` on the hook's error path.
//        OWNER: **Phase 2, ERR-03** — "errors thrown or rejected inside
//        `onInterceptResponse` are caught and logged by us", which is this exact
//        line.
//        Both sites are outside the store layer, outside the UAT gap this gate
//        closes, and recorded as threat T-01-37, disposition ACCEPT. Widening
//        STORE_DIR is a one-line change when Phase 2 takes them.
//      - `packages/backend/src/telemetry.ts:422` is `const body = String(e);`
//        INSIDE `describeError`'s own implementation. It is CORRECT — it is the
//        one place where the safe rendering happens — and it has NO OWNER, in
//        those words, because an owner would imply work that must not be done.
//        It is named anyway, and this is the load-bearing part: `describeError`'s
//        parameter is literally called `e`, so the day somebody widens STORE_DIR
//        over `telemetry.ts` this gate fires on the renderer it exists to protect.
//        That widening must exempt it BY CONSTRUCTION — by not scanning the
//        declaration of SAFE_RENDERER itself — and never by a file-name check. A
//        gate with one file-name exception grows one more every phase. Naming the
//        third render now is what stops that widening looking like a bug to
//        whoever does it.
//
// 2. WHAT THE WALK FOLLOWS, AND WHERE IT STOPS.
//    Rewritten on 2026-08-21 (01-13). This boundary used to say only that the walk
//    is scope-blind. That was true and it was the wrong sentence: the rules bottomed
//    out in a BARE-IDENTIFIER match, so `e.message` — the single most common way to
//    render an error — reported clean, along with every cast form the compiler
//    pushes an author toward under `useUnknownInCatchVariables`. Two independent
//    probes (`01-VERIFICATION.md`, 6 of 8 missed; `01-REVIEW.md` CR-05, 10 of 10
//    missed) found it. Both now run below as suite cases. What the walk does:
//
//      - `derivesFrom` FOLLOWS the binding instead of matching it: through
//        parentheses, `as`, `satisfies`, `!` and the legacy `<T>x` assertion;
//        through property and element access; and through a call whose callee is a
//        member, which is what makes `e.toString()` visible. So `e`, `(e)`, `e!`,
//        `e as Error`, `e.message`, `(e as Error).message`, `e["message"]` and
//        `e.toString()` are all the binding.
//      - ONE HOP OF COPY: a `const`/`let` whose initializer derives from the
//        binding records the new name as ALSO the binding, collected in document
//        order in the same walk, so `const x = e; String(x)` is seen. One hop, and
//        that is the honest bound — `const x = e; const y = x; String(y)` is not.
//      - RENDER FORMS: `String(x)`, `JSON.stringify(x)` and `[x].join(…)`, a
//        template span, and a `+` operand. `JSON.stringify` on an `Error` is worse
//        than the others, not better: it serialises enumerable own properties, and
//        a driver rejection's are exactly the bound parameters.
//      - POSITIONS: those render forms anywhere in scope, plus the binding (or
//        anything derived from it) as a RETURN value or as an OBJECT-LITERAL
//        property value — the two positions CR-05 names, and the two the
//        `analyses.error` write path actually travels.
//      - It descends into everything EXCEPT a `describeError(...)` call, which is
//        what keeps `return { ok: false, error: describeError(e).slice(0, 200) }` —
//        the real shape of every catch in this directory — quiet.
//
//    THE RESIDUAL, precisely: the walk builds NO symbol table and is SCOPE-BLIND.
//    The caught binding is resolved by NAME from the `CatchClause`, so an identifier
//    that merely SHARES that name in an unrelated inner scope is treated as the
//    binding (over-approximating), and a value crossing a FUNCTION BOUNDARY or more
//    than ONE HOP of indirection is beyond it (under-approximating). It is a gate,
//    not a type checker. What stands behind that bound is the mutation run recorded
//    in `01-13-SUMMARY.md`, not this paragraph.
// 3. IT SKIPS `.spec.ts`, which is what lets this file's own fixtures live inline
//    as strings with no temp file and no stray module for `tsc --build` to trip
//    over.
// 4. `unwrap` DUPLICATES the helper in `../outbound-prohibition.spec.ts` (its
//    boundary 3) by about a dozen lines, DELIBERATELY and by that file's own
//    agreement. Exporting one gate's internals into the other means one gate's
//    refactor can silently change the other's scope, and these two enforce
//    different requirements for different reasons. The named non-vacuity
//    assertions are the real protection against a walk that shrinks.

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

/**
 * Strip the wrappers that hide an expression from a syntactic match.
 *
 * `String(e as Error)` is an `AsExpression` where a bare identifier was expected,
 * and that single wrapper is why the round-1 gate reported it clean. Parens, `as`,
 * `satisfies`, `!` and the legacy `<T>x` assertion all mean "the same value,
 * differently typed", so all five unwrap.
 *
 * DUPLICATED DELIBERATELY from `../outbound-prohibition.spec.ts`, which says the
 * same thing from its side (its boundary 3, and boundary 4 here). Sharing it would
 * mean one gate's refactor silently changing the other gate's scope.
 */
function unwrap(node: ts.Node): ts.Node {
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
 * Does this expression DERIVE from any of `names`?
 *
 * THE WHOLE DEFECT CR-05 FOUND lived in the two lines this replaces:
 * `ts.isIdentifier(node) && node.text === name`. The binding had to appear as a
 * BARE IDENTIFIER, so reaching through it, casting it or copying it made the rule
 * vanish — and because TypeScript types a catch binding as `unknown` under
 * `useUnknownInCatchVariables`, `String(e as Error)` and `(e as Error).message`
 * are precisely the forms the compiler pushes an author toward. The gate was
 * blind exactly where the codebase is most likely to drift.
 *
 * So: unwrap the type-only wrappers, walk DOWN through member access, and walk
 * down through a call whose callee is a member — that last one is what makes
 * `e.toString()` visible — then match the identifier at the bottom.
 *
 * A `describeError(...)` call is the SAFE form and terminates the descent with
 * `false` at whatever depth it appears, which is what keeps
 * `describeError(e).slice(0, 200)` — a call, on a member, of a call — quiet.
 */
function derivesFrom(node: ts.Node, names: ReadonlySet<string>): boolean {
  let current: ts.Node = node;
  for (;;) {
    if (isSafeRenderCall(current)) return false;

    const stripped = unwrap(current);
    if (stripped !== current) {
      current = stripped;
      continue;
    }
    if (
      ts.isPropertyAccessExpression(current) ||
      ts.isElementAccessExpression(current)
    ) {
      current = current.expression;
      continue;
    }
    if (ts.isCallExpression(current)) {
      const callee = unwrap(current.expression);
      if (
        ts.isPropertyAccessExpression(callee) ||
        ts.isElementAccessExpression(callee)
      ) {
        current = callee.expression;
        continue;
      }
    }
    break;
  }
  return ts.isIdentifier(current) && names.has(current.text);
}

/** The property name a binding element takes FROM the object being destructured. */
function boundPropertyName(el: ts.BindingElement): string | undefined {
  const property = el.propertyName ?? el.name;
  return ts.isIdentifier(property) || ts.isStringLiteralLike(property)
    ? property.text
    : undefined;
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
   * Every render form and every render position, applied to one binding.
   *
   * `ruleFor` distinguishes the CATCH class of hole from the PERSISTED-PARAMETER
   * class, so a failure message says which one reopened rather than making the
   * reader work it out.
   *
   * `names` starts as the one binding and GROWS by one hop as the walk meets a
   * `const`/`let` initialised from it. Document order is what makes that sound:
   * `const x = e;` is visited before the `String(x)` below it. Boundary 2.
   */
  const scanFor = (
    root: ts.Node,
    name: string,
    ruleFor: (form: string) => string,
    where: string,
  ): void => {
    const names = new Set<string>([name]);
    const derives = (node: ts.Node | undefined): boolean =>
      node !== undefined && derivesFrom(node, names);

    /** How the offending expression READS, for the failure message. Written with
     *  `split`/`join` rather than a pattern, because this package's discipline is
     *  that a regex is a thing you justify (see `telemetry.ts`'s one permitted
     *  literal), and a failure message is not worth justifying one for. */
    const textOf = (node: ts.Node): string => {
      const raw = node
        .getText()
        .split("\n")
        .map((line) => line.trim())
        .join(" ");
      return raw.length > 60 ? `${raw.slice(0, 57)}...` : raw;
    };

    const visit = (node: ts.Node): void => {
      // ---- ONE HOP OF COPY. `const x = e` makes `x` the binding too. ---------
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        derives(node.initializer)
      ) {
        names.add(node.name.text);
      }

      // ---- RENDER FORM: String(x). ------------------------------------------
      if (ts.isCallExpression(node) && node.arguments.length === 1) {
        const argument = node.arguments[0];
        if (
          argument !== undefined &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === "String" &&
          derives(argument)
        ) {
          add(
            ruleFor("unredacted-string-call"),
            `${where}: String(${textOf(argument)}) renders an error-shaped binding without ${SAFE_RENDERER}(). A driver rejection can carry the statement text and the bound parameters, and one of those parameters is the observation URL.`,
          );
        }
      }

      // ---- RENDER FORM: JSON.stringify(x). ----------------------------------
      // Worse than String(x), not better: it serialises enumerable own
      // properties, and a driver rejection's are exactly the bound parameters.
      if (ts.isCallExpression(node) && node.arguments.length > 0) {
        const argument = node.arguments[0];
        const callee = node.expression;
        if (
          argument !== undefined &&
          ts.isPropertyAccessExpression(callee) &&
          ts.isIdentifier(callee.expression) &&
          callee.expression.text === "JSON" &&
          callee.name.text === "stringify" &&
          derives(argument)
        ) {
          add(
            ruleFor("unredacted-string-call"),
            `${where}: JSON.stringify(${textOf(argument)}) serialises an error-shaped binding's enumerable own properties without ${SAFE_RENDERER}(). On a driver rejection those properties are the bound parameters.`,
          );
        }
      }

      // ---- RENDER FORM: [x].join(...). --------------------------------------
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "join"
      ) {
        const receiver = unwrap(node.expression.expression);
        if (
          ts.isArrayLiteralExpression(receiver) &&
          receiver.elements.some((el) => derives(el))
        ) {
          add(
            ruleFor("unredacted-string-call"),
            `${where}: \`${name}\` is rendered by joining an array it is an element of, without ${SAFE_RENDERER}(). Join ${SAFE_RENDERER}(${name}) instead.`,
          );
        }
      }

      // ---- RENDER FORM: a template span. ------------------------------------
      if (ts.isTemplateExpression(node)) {
        for (const span of node.templateSpans) {
          if (derives(span.expression)) {
            add(
              ruleFor("unredacted-template"),
              `${where}: a template literal interpolates \`${textOf(span.expression)}\` directly. Interpolate ${SAFE_RENDERER}(${name}) instead.`,
            );
          }
        }
      }

      // ---- RENDER FORM: a `+` operand. --------------------------------------
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.PlusToken &&
        (derives(node.left) || derives(node.right))
      ) {
        add(
          ruleFor("unredacted-concat"),
          `${where}: \`${name}\` is concatenated with + into a string. Concatenate ${SAFE_RENDERER}(${name}) instead.`,
        );
      }

      // ---- POSITION: returned. ----------------------------------------------
      // CR-05's first new position. A caught binding handed back to a caller is
      // a caught binding the caller will render, and this directory's callers
      // put it straight into `StoreWriteResult.error`.
      if (ts.isReturnStatement(node)) {
        const returned = node.expression;
        if (returned !== undefined && derives(returned)) {
          add(
            ruleFor("unredacted-return"),
            `${where}: \`${textOf(returned)}\` is RETURNED without passing through ${SAFE_RENDERER}(). The caller renders whatever it is handed.`,
          );
        }
      }

      // ---- POSITION: an object-literal property value. ----------------------
      // CR-05's second. This is the exact shape of every write result in this
      // directory — `{ ok: false, error: ... }` — and the exact shape
      // `compat.ts:317` uses for the field the operator reads.
      if (ts.isObjectLiteralExpression(node)) {
        for (const prop of node.properties) {
          if (ts.isPropertyAssignment(prop) && derives(prop.initializer)) {
            add(
              ruleFor("unredacted-object-value"),
              `${where}: \`${textOf(prop.initializer)}\` is an object-literal property value without ${SAFE_RENDERER}(). That object is what reaches the \`analyses.error\` column.`,
            );
          }
          if (
            ts.isShorthandPropertyAssignment(prop) &&
            names.has(prop.name.text)
          ) {
            add(
              ruleFor("unredacted-object-value"),
              `${where}: \`{ ${prop.name.text} }\` places an error-shaped binding into an object literal without ${SAFE_RENDERER}().`,
            );
          }
        }
      }

      // Do not descend into a `describeError(...)` call: the binding appearing
      // as ITS argument is the whole point.
      if (isSafeRenderCall(node)) return;
      ts.forEachChild(node, visit);
    };
    // `visit(root)` rather than `forEachChild(root, visit)`: a concise arrow body
    // — `(e) => String(e)` — IS the expression, and descending past it without
    // testing it first would skip the only node that could ever match.
    visit(root);
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

        // A DESTRUCTURED parameter — `function fin({ error })`. The round-1 rule
        // required `ts.isIdentifier(param.name)` and so reported this clean
        // (CR-05: `param destructured []`), which matters because a widened
        // `finishAnalysis` taking an options object is the ordinary refactor of
        // a nine-parameter function, and this is a nine-parameter function.
        //
        // The PROPERTY name decides whether it is error-shaped; the BOUND name is
        // what gets scanned. Keying on the bound name alone would miss
        // `{ error: err }`; keying on the property name alone would scan an
        // identifier that does not exist in the body.
        if (ts.isObjectBindingPattern(param.name)) {
          for (const el of param.name.elements) {
            const property = boundPropertyName(el);
            if (
              property === undefined ||
              !ERROR_BINDING_NAMES.has(property) ||
              !ts.isIdentifier(el.name)
            ) {
              continue;
            }
            const bound = el.name.text;
            scanFor(
              node.body,
              bound,
              () => "unredacted-persisted-error",
              bound === property
                ? `destructured parameter \`{ ${property} }\``
                : `destructured parameter \`{ ${property}: ${bound} }\``,
            );
          }
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
      // `db.ts` was missing from this list while being scanned (IN-10): it is the
      // module that opens the handle and the one whose header documents that
      // Caido never garbage-collects the file, so a rename that dropped it from
      // the scan would have been the least visible and the worst.
      "db.ts",
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

// ---------------------------------------------------------------------------
// THE EVASIONS, ENUMERATED BEFORE THE RULE THAT CATCHES THEM.
// ---------------------------------------------------------------------------
// Round 1's gates each passed every fixture they had, because the fixtures were
// written by the same reasoning that wrote the rule. Every shape below was
// written and confirmed RED against the round-1 walk — `isRefTo`, a two-line
// bare-identifier match — BEFORE a line of that walk was touched. The probe
// tables come from two independent executions (the verifier's 8 shapes in
// `01-VERIFICATION.md`, the reviewer's 10 in `01-REVIEW.md` CR-05), so the
// before/after comparison is one artifact rather than a paragraph nobody re-reads.

describe("the 8-shape STORE-07 probe from 01-VERIFICATION.md", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  /** The two the round-1 gate caught. Both must STILL be caught: this is the
   *  half of the probe that says the widening broke nothing. The second is the
   *  one that proves the binding is resolved from the CATCH CLAUSE and not from
   *  a hard-coded name — `ex` is not in `ERROR_BINDING_NAMES`. */
  const CAUGHT: ReadonlyArray<readonly [string, string]> = [
    [
      "catch(e){ return String(e); }",
      "function f() { try { g(); } catch (e) { return String(e); } }",
    ],
    [
      "catch(ex){ return String(ex); } — name outside the listed set",
      "function f() { try { g(); } catch (ex) { return String(ex); } }",
    ],
  ];

  /** The six it missed, verbatim from the probe table. */
  const MISSED: ReadonlyArray<readonly [string, string]> = [
    [
      "catch(e){ return (e as any).message; }",
      "function f() { try { g(); } catch (e) { return (e as any).message; } }",
    ],
    [
      'catch(e){ return "x: " + e.message; }',
      'function f() { try { g(); } catch (e) { return "x: " + e.message; } }',
    ],
    [
      "catch(e){ return String(e as Error); }",
      "function f() { try { g(); } catch (e) { return String(e as Error); } }",
    ],
    [
      "catch(e){ return e.toString(); }",
      "function f() { try { g(); } catch (e) { return e.toString(); } }",
    ],
    [
      "catch(e){ return JSON.stringify(e); }",
      "function f() { try { g(); } catch (e) { return JSON.stringify(e); } }",
    ],
    [
      "catch(e){ const x = e; return String(x); }",
      "function f() { try { g(); } catch (e) { const x = e; return String(x); } }",
    ],
  ];

  it.each(CAUGHT)("control — %s is still caught", (_shape, src) => {
    expect(rulesOf(src), `${_shape} is no longer caught`).not.toEqual([]);
  });

  it.each(MISSED)("previously MISSED — %s now reports", (_shape, src) => {
    expect(rulesOf(src), `${_shape} still reports clean`).not.toEqual([]);
  });
});

describe("CR-05's 10-shape executed table from 01-REVIEW.md", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  const SHAPES: ReadonlyArray<readonly [string, string]> = [
    [
      "e.message returned",
      "function f() { try { g(); } catch (e) { return e.message; } }",
    ],
    [
      "e.message concat",
      'function f() { try { g(); } catch (e) { return "x: " + e.message; } }',
    ],
    [
      "e.message template",
      "function f() { try { g(); } catch (e) { return `x: ${e.message}`; } }",
    ],
    [
      "String(e.message)",
      "function f() { try { g(); } catch (e) { return String(e.message); } }",
    ],
    [
      "e.toString()",
      "function f() { try { g(); } catch (e) { return e.toString(); } }",
    ],
    [
      "JSON.stringify(e)",
      "function f() { try { g(); } catch (e) { return JSON.stringify(e); } }",
    ],
    [
      "String(e as Error)",
      "function f() { try { g(); } catch (e) { return String(e as Error); } }",
    ],
    [
      "`${e as any}`",
      "function f() { try { g(); } catch (e) { return `${e as any}`; } }",
    ],
    [
      "reassign then String",
      "function f() { try { g(); } catch (e) { const x = e; return String(x); } }",
    ],
    [
      "array join",
      'function f() { try { g(); } catch (e) { return [e].join(""); } }',
    ],
  ];

  it.each(SHAPES)("%s now reports at least one violation", (_shape, src) => {
    expect(rulesOf(src), `${_shape} still reports clean`).not.toEqual([]);
  });
});

describe("the gate follows the binding — reach, cast, assert, parenthesise, copy", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it.each([
    [
      "reach — e.message",
      "function f() { try { g(); } catch (e) { return e.message; } }",
    ],
    [
      "reach — concatenated e.message",
      'function f() { try { g(); } catch (e) { return "x: " + e.message; } }',
    ],
    [
      "reach — interpolated e.message",
      "function f() { try { g(); } catch (e) { return `x: ${e.message}`; } }",
    ],
    [
      "reach — String(e.message)",
      "function f() { try { g(); } catch (e) { return String(e.message); } }",
    ],
    [
      "reach — a call ON a member, e.toString()",
      "function f() { try { g(); } catch (e) { return e.toString(); } }",
    ],
    [
      "render — JSON.stringify(e)",
      "function f() { try { g(); } catch (e) { return JSON.stringify(e); } }",
    ],
    [
      "cast — String(e as Error)",
      "function f() { try { g(); } catch (e) { return String(e as Error); } }",
    ],
    [
      "cast — `${e as any}`",
      "function f() { try { g(); } catch (e) { return `${e as any}`; } }",
    ],
    [
      "parenthesise — String((e))",
      "function f() { try { g(); } catch (e) { return String((e)); } }",
    ],
    [
      "non-null assert — String(e!)",
      "function f() { try { g(); } catch (e) { return String(e!); } }",
    ],
    [
      "cast then reach — (e as Error).message",
      "function f() { try { g(); } catch (e) { return (e as Error).message; } }",
    ],
    [
      "copy — const x = e; String(x)",
      "function f() { try { g(); } catch (e) { const x = e; return String(x); } }",
    ],
    [
      "render — [e].join('')",
      'function f() { try { g(); } catch (e) { return [e].join(""); } }',
    ],
  ])("flags %s", (_shape, src) => {
    expect(rulesOf(src), `${_shape} reports clean`).not.toEqual([]);
  });
});

describe("the two positions CR-05 names — a return value and an object-literal value", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it("flags the caught binding RETURNED without passing through describeError", () => {
    expect(
      rulesOf("function f() { try { g(); } catch (e) { return e; } }"),
    ).toContain("unredacted-return");
  });

  it("flags a derivative of the binding as an OBJECT-LITERAL property value", () => {
    expect(
      rulesOf(
        "function f() { try { g(); } catch (e) { return { ok: false, error: e.message }; } }",
      ),
    ).toContain("unredacted-object-value");
  });

  it("flags the shorthand form — { error } is the same position as { error: e }", () => {
    expect(
      rulesOf(
        "function f() { try { g(); } catch (error) { return { error }; } }",
      ),
    ).toContain("unredacted-object-value");
  });

  it("flags a CONCISE ARROW BODY, which is the whole expression rather than a block", () => {
    // Found while widening, not listed in the plan: the scan entered a function
    // body with `forEachChild`, so for `(e) => String(e)` it descended PAST the
    // only node that could ever match and reported clean. A block body was
    // unaffected, which is why nothing noticed. Mutation-proven: restoring
    // `forEachChild(root, visit)` turns this case red and leaves the other 61
    // green.
    expect(rulesOf("const f = (e: unknown) => String(e);")).toContain(
      "unredacted-persisted-error",
    );
  });
});

describe("rule 4 reaches a DESTRUCTURED error-shaped parameter", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it("flags function fin({ error }: { error: string | null })", () => {
    expect(
      rulesOf(
        "function fin({ error }: { error: string | null }) { return error === null ? null : String(error); }",
      ),
    ).toContain("unredacted-persisted-error");
  });

  it("flags the same with a RENAMED binding — { error: err }", () => {
    // The PROPERTY name decides whether it is error-shaped; the BOUND name is
    // what gets scanned. Keying on the bound name alone would miss this, and
    // keying on the property name alone would scan the wrong identifier.
    expect(
      rulesOf(
        "function fin({ error: err }: { error: string }) { return String(err); }",
      ),
    ).toContain("unredacted-persisted-error");
  });
});

describe("the widened rule is NOT always-on — nine shapes that must stay quiet", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).map((v) => v.rule);

  it.each([
    [
      "describeError(e) inside a catch",
      "function f() { try { g(); } catch (e) { return describeError(e).slice(0, 200); } }",
    ],
    [
      "THE REAL STORE SHAPE — return { ok: false, error: describeError(e).slice(0, 200) }",
      "function f() { try { g(); } catch (e) { return { ok: false, error: describeError(e).slice(0, 200) }; } }",
    ],
    [
      "the raw binding handed to a function that renders it safely",
      "function f() { try { g(); } catch (e) { recordError(e); return null; } }",
    ],
    [
      "a bare catch binds nothing",
      "function f() { try { g(); } catch { return null; } }",
    ],
    [
      "a String(x) outside any catch",
      "function f(x) { return String(x).slice(0, 120); }",
    ],
    [
      "a type MEMBER named error",
      "type AnalysisRow = { error: string | null }; interface B { error: string } const r: AnalysisRow = { error: null }; const s = String(r.error);",
    ],
    [
      "a parameter that is not error-shaped — label",
      "function f(label: string) { return String(label); }",
    ],
    [
      "a parameter that is not error-shaped — contentType",
      "function f(contentType: string) { return String(contentType).slice(0, 120); }",
    ],
    [
      "an error-shaped parameter passed to describeError — analyses.ts:228's real shape",
      "function fin(error: string | null) { return error === null ? null : describeError(error).slice(0, 300); }",
    ],
  ])("stays quiet on %s", (_shape, src) => {
    expect(
      rulesOf(src),
      `${_shape} FIRED — the rule is wrong, not the code`,
    ).toEqual([]);
  });
});
