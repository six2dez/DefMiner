// packages/backend/src/store/sql-discipline.spec.ts — STORE-07's static gate.
//
// WHY THIS IS STATIC AND NOT A RUNTIME TEST.
//
// Every failure mode below is SILENT. Phase 0 measured that passing an array of
// bind values to the parameterless execution form is IGNORED — it produced rows
// with every column NULL plus a NOT NULL constraint failure that never surfaced.
// A named parameter is not rejected loudly either; it simply never binds. A
// multi-row query that forgets `project_id` returns rows, just the wrong ones. So
// a behavioural test only catches these where somebody thought to write one,
// whereas reading the SOURCE catches every call site including the ones written
// next year.
//
// Parsed with the TypeScript compiler rather than acorn (which
// `scripts/ci/check-bundle-imports.mjs` uses over the emitted BUNDLE, where the
// types are already gone). The walk shape is the same and the reason it is a walk
// and not a regex is the same: a regex over lines misses multi-line strings,
// `export ... from`, and any call whose receiver spans a line break — the three
// shapes real code is most likely to use.
//
// The gate's core is a PURE function over (filename, source), so every rule below
// has its FAILING path executed against a synthetic fixture in this same file. A
// gate whose failure path has never run is a gate nobody has tested.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const BACKEND_SRC = "packages/backend/src";
const STORE_DIR = join(BACKEND_SRC, "store");

/**
 * Every non-spec module in the BACKEND PACKAGE, at any depth.
 *
 * The package, not the directory. This used to read `store/` non-recursively, so
 * every rule below — named parameters, array binds, exec arity, unscoped
 * multi-row statements, module-scope prepare, interpolated SQL — was enforced
 * only for files sitting directly in `store/`, while the header claimed it
 * "catches every call site including the ones written next year". SQL written
 * anywhere else in the backend was ungated, and there already was some:
 * `index.ts`'s `db.prepare("SELECT 1")` probe. A future `hooks/` or `ingest/`
 * query, or a `store/reads/` subdirectory, would have inherited none of it.
 */
function backendFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
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
 * EVERY rule name this gate can emit.
 *
 * Declared as a closed list and used as the type of `add`'s first argument, so a
 * new rule cannot be introduced without appearing here — which is what lets the
 * non-vacuity block below assert the gate's REACH as a set rather than as a
 * number somebody remembered to bump. The five names after `concatenated-sql`
 * were added by plan 05-02 for the shapes `05-RESEARCH.md § O-01` measured this
 * gate silent on.
 */
const RULE_NAMES = [
  "named-parameter",
  "returning",
  "last-insert-rowid",
  "unscoped-multi-row",
  "interpolated-sql",
  "concatenated-sql",
  "exec-arity",
  "array-bind",
  "module-scope-await",
  "module-scope-statement",
  "cte-unscoped",
  "insert-select",
  "unscoped-subquery",
  "unscoped-union-arm",
  "fragment-composition",
] as const;

type RuleName = (typeof RULE_NAMES)[number];

type Violation = { file: string; rule: RuleName; detail: string };

/** Statement-execution methods that take BIND PARAMETERS, spread. */
const BIND_METHODS = new Set(["run", "get", "all"]);
/** The PARAMETERLESS form. `Database.exec(sql)` takes no bind values at all. */
const PARAMETERLESS_METHOD = "exec";
/**
 * Every method a finished SQL string is handed to.
 *
 * `fragment-composition` is detected HERE and not at the concatenation, because
 * `a + b` over two identifiers is ordinary string work everywhere else in the
 * language. It only becomes a SQL defect at the moment the result is executed,
 * and the sink is the one place that fact is visible without type information.
 */
const SQL_SINKS = new Set(["prepare", "exec", "run", "get", "all"]);

/** Looks like SQL — used to decide whether a string literal is subject to the
 *  SQL rules at all. Deliberately generous: a false positive costs a comment, a
 *  false negative costs an ungated statement. */
function looksLikeSql(text: string): boolean {
  return /\b(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+(TABLE|INDEX|TRIGGER)|PRAGMA)\b/i.test(
    text,
  );
}

/** The LEADING statement keyword — what the statement actually is.
 *
 *  Classifying by the leading keyword rather than by "does the text contain
 *  UPDATE" matters: every upsert in this package ends `ON CONFLICT ... DO UPDATE
 *  SET`, and a contains-check reads that as an UPDATE statement. It is an INSERT
 *  that touches exactly one row on a fully-specified natural key. */
function statementKind(text: string): string {
  const m = /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|PRAGMA|WITH)\b/i.exec(text);
  return m === null ? "" : (m[1] ?? "").toUpperCase();
}

/** Statements that can return or affect MORE THAN ONE ROW. An INSERT writes one
 *  row by definition; DDL and PRAGMA touch no rows at all. */
function isMultiRowStatement(text: string): boolean {
  const kind = statementKind(text);
  return kind === "SELECT" || kind === "UPDATE" || kind === "DELETE";
}

/** SQL keywords that can follow FROM/INTO/UPDATE/JOIN and are NOT table names.
 *  `SET` is the one that bites: `DO UPDATE SET` reads as "the table `set`". */
const NOT_A_TABLE = new Set([
  "set",
  "select",
  "from",
  "into",
  "update",
  "where",
  "values",
  "conflict",
]);

/** Tables a statement reads or writes. */
function tablesReferenced(text: string): string[] {
  const found = new Set<string>();
  const re = /\b(?:FROM|INTO|UPDATE|JOIN)\s+([A-Za-z_][A-Za-z0-9_]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const name = (m[1] ?? "").toLowerCase();
    if (name !== "" && !NOT_A_TABLE.has(name)) found.add(name);
  }
  return [...found];
}

/** Tables where an empty `project_id` is legal and a global row is the point. */
const SETTINGS_TABLES = new Set(["settings"]);

// ---------------------------------------------------------------------------
// STATEMENT DECOMPOSITION — added because a WHOLE-STATEMENT predicate check can
// be LAUNDERED.
//
// `05-RESEARCH.md § O-01` drove this file's own `auditSource` against twenty-four
// candidate statements and found five silent. Two of the silences (probes Q2 and
// Q7) have the same cause: the project-scoping check reads the text from the
// FIRST `WHERE` onward, so a `project_id` anywhere in that tail satisfies it —
// including one belonging to a completely different query. An outer query with
// `WHERE project_id = ?` therefore vouched for an `IN (SELECT … FROM
// suppressions)` that scoped on nothing, and the first arm of a UNION vouched for
// the second.
//
// The fix is to check the PIECES independently rather than to make the tail scan
// cleverer. A statement is split into its top-level set-operation arms and its
// balanced-parenthesis subquery spans, and the SAME predicate rule is applied to
// each piece on its own. A piece that reads a non-settings table and does not
// scope itself is reported no matter what its siblings do.
// ---------------------------------------------------------------------------

/**
 * Replace every single-quoted SQL string literal with same-length spaces.
 *
 * Every scan below is either paren-depth counting or keyword matching, and both
 * are wrong inside a quoted value: `'a (b'` unbalances the depth counter forever,
 * and `'UNION'` as a stored value would split a statement that has one arm. Blank
 * runs rather than deletion so every index stays aligned with the original text,
 * which is what lets the spans be sliced back out of `text` itself.
 *
 * SQLite escapes a quote by DOUBLING it (`''`), which needs no special case here:
 * the closing quote of the first pair simply opens the next, and the whole run
 * ends up masked either way.
 */
function maskSqlStrings(text: string): string {
  let out = "";
  let inString = false;
  for (const ch of text) {
    if (ch === "'") {
      inString = !inString;
      out += " ";
    } else {
      out += inString && ch !== "\n" ? " " : ch;
    }
  }
  return out;
}

/** Indices of every match of `re` that sits at paren depth ZERO. */
function topLevelMatches(
  text: string,
  re: RegExp,
): { at: number; len: number }[] {
  const masked = maskSqlStrings(text);
  const depths: number[] = [];
  let depth = 0;
  for (const ch of masked) {
    if (ch === "(") {
      depths.push(depth);
      depth += 1;
    } else if (ch === ")") {
      depth = Math.max(0, depth - 1);
      depths.push(depth);
    } else {
      depths.push(depth);
    }
  }
  const out: { at: number; len: number }[] = [];
  const scan = new RegExp(
    re.source,
    re.flags.includes("g") ? re.flags : re.flags + "g",
  );
  let m: RegExpExecArray | null;
  while ((m = scan.exec(masked)) !== null) {
    if ((depths[m.index] ?? 0) === 0)
      out.push({ at: m.index, len: m[0].length });
    if (m[0].length === 0) scan.lastIndex += 1;
  }
  return out;
}

/** The arms of a top-level set operation. One element — the whole statement —
 *  when there is no `UNION`/`INTERSECT`/`EXCEPT` at depth zero. */
function topLevelArms(text: string): string[] {
  const seps = topLevelMatches(
    text,
    /\b(?:UNION\s+ALL|UNION|INTERSECT|EXCEPT)\b/gi,
  );
  if (seps.length === 0) return [text];
  const arms: string[] = [];
  let cursor = 0;
  for (const s of seps) {
    arms.push(text.slice(cursor, s.at));
    cursor = s.at + s.len;
  }
  arms.push(text.slice(cursor));
  return arms.map((a) => a.trim()).filter((a) => a !== "");
}

/**
 * Every balanced-parenthesis span whose body begins with `SELECT`, at any nesting
 * depth.
 *
 * Nested spans are all returned, not just the outermost: a subquery two levels
 * down reads rows exactly as freely as one at the top, and reporting only the
 * outer one would let the inner hide behind a scoped parent.
 */
function subquerySpans(text: string): string[] {
  const masked = maskSqlStrings(text);
  const opens: number[] = [];
  const out: string[] = [];
  for (let i = 0; i < masked.length; i += 1) {
    const ch = masked[i];
    if (ch === "(") {
      opens.push(i);
    } else if (ch === ")") {
      const start = opens.pop();
      if (start === undefined) continue;
      const body = text.slice(start + 1, i);
      if (/^\s*SELECT\b/i.test(body)) out.push(body);
    }
  }
  return out;
}

/** The scoping rule, applied to ONE piece of a statement. Predicate-only, for the
 *  reason the `unscoped-multi-row` rule already records: `project_id` in a SELECT
 *  LIST is a cross-project read that reports its own project id in every row it
 *  should not have returned. */
function scopesOnProjectId(piece: string): boolean {
  const wherePos = piece.search(/\bWHERE\b/i);
  return wherePos >= 0 && /project_id/.test(piece.slice(wherePos));
}

/** Non-settings tables a piece touches — the ones whose rows belong to exactly
 *  one project and must therefore be scoped. */
function scopedTables(piece: string): string[] {
  return tablesReferenced(piece).filter((t) => !SETTINGS_TABLES.has(t));
}

/** An `INSERT` whose row source is a `SELECT` rather than a `VALUES` list.
 *
 *  Top-level only. `INSERT INTO t (a) VALUES ((SELECT max(x) FROM y))` writes ONE
 *  row from a scalar subquery and is not this shape; the column list and the
 *  VALUES tuple both sit at depth one, so a depth-zero `SELECT` is exactly the
 *  `INSERT … SELECT` form and nothing else. */
function insertsFromSelect(text: string): boolean {
  return (
    statementKind(text) === "INSERT" &&
    topLevelMatches(text, /\bSELECT\b/gi).length > 0
  );
}

/** Statement heads whose PIECES are worth decomposing. DDL and PRAGMA are
 *  excluded deliberately: `CREATE TRIGGER … BEGIN SELECT RAISE(ABORT, …); END`
 *  and a `CHECK (length(project_id) > 0)` column constraint are neither queries
 *  nor arms, and running the scoping rule over them would report the migration
 *  ladder as a cross-project read. */
function isDecomposable(text: string): boolean {
  const kind = statementKind(text);
  return kind !== "" && kind !== "CREATE" && kind !== "PRAGMA";
}

/**
 * The ONE allowlisted interpolation in the package.
 *
 * SQLite does not accept a bound parameter in a PRAGMA value position, so the
 * migration ladder's `user_version` write has no alternative. It is safe because
 * the value is a COMPILE-TIME INTEGER from the literal `MIGRATIONS` array and
 * never comes from input — which is stated in migrations.ts for a reviewer and
 * asserted here for a machine. Matched on the template's HEAD TEXT, so a
 * different interpolated PRAGMA does not inherit the exemption.
 */
const INTERPOLATION_ALLOWLIST: { file: string; head: RegExp }[] = [
  { file: "migrations.ts", head: /^PRAGMA user_version = $/ },
];

/** Named-parameter forms. Caido's driver: "Named parameters are not supported." */
const NAMED_PARAM_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "colon-prefixed", re: /(?<![:\w]):[A-Za-z_][A-Za-z0-9_]*/ },
  { name: "at-prefixed", re: /@[A-Za-z_][A-Za-z0-9_]*/ },
  { name: "dollar-prefixed", re: /\$[A-Za-z_][A-Za-z0-9_]*/ },
];

/**
 * Audit one source file. Pure — takes text, returns findings — so the failing path
 * of every rule can be executed against a synthetic fixture below.
 */
export function auditSource(
  file: string,
  source: string,
): { violations: Violation[]; sqlStrings: string[] } {
  const base = file.split("/").pop() ?? file;
  const violations: Violation[] = [];
  const sqlStrings: string[] = [];
  const add = (rule: RuleName, detail: string): void => {
    violations.push({ file: base, rule, detail });
  };

  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const checkSqlText = (text: string, where: string): void => {
    if (!looksLikeSql(text)) return;
    sqlStrings.push(text);

    for (const p of NAMED_PARAM_PATTERNS) {
      if (p.re.test(text)) {
        add(
          "named-parameter",
          `${where}: SQL contains a ${p.name} parameter token. This driver does NOT support named parameters — they never bind and nothing reports it. Use positional ? and spread the values into run()/get()/all().`,
        );
      }
    }

    if (/\bRETURNING\b/i.test(text)) {
      add(
        "returning",
        `${where}: RETURNING needs SQLite 3.35 and buys nothing Phase 1 needs (decision P4-D4).`,
      );
    }
    if (/last_insert_rowid/i.test(text)) {
      add(
        "last-insert-rowid",
        `${where}: last_insert_rowid() is unusable on this pooled connection. Address the row by its natural key.`,
      );
    }

    if (isMultiRowStatement(text)) {
      const tables = tablesReferenced(text).filter(
        (t) => !SETTINGS_TABLES.has(t),
      );
      // THE PREDICATE, NOT THE STRING. Looking for `project_id` anywhere in the
      // SQL passes a query that merely SELECTS the column while scoping on
      // nothing — which is a cross-project read that reports its own project id
      // in every row it should not have returned. Found by mutation: dropping
      // `project_id = ?` from GET_ARTIFACT_SQL left the column list matching and
      // the gate green.
      const wherePos = text.search(/\bWHERE\b/i);
      const predicate = wherePos < 0 ? "" : text.slice(wherePos);
      if (tables.length > 0 && !/project_id/.test(predicate)) {
        add(
          "unscoped-multi-row",
          `${where}: a multi-row statement over ${tables.join(", ")} does not scope on project_id in its WHERE clause. sdk.meta.db() is ONE database for every project (T-01-20).`,
        );
      }
    }

    // --- the four shapes the whole-statement checks above cannot see ---------
    //
    // `isMultiRowStatement` accepts SELECT, UPDATE and DELETE, and it is left
    // exactly as it is: its name and its message are about multi-row READS and
    // single-table writes, and every upsert in this package would start failing
    // if `INSERT` were folded into it (`ON CONFLICT … DO UPDATE SET` touches one
    // row on a fully-specified natural key). The scoping CONCERN is extended
    // instead, one head at a time, each with its own rule name and its own reason.

    // A CTE head. `statementKind` returns "WITH", so this statement never reached
    // the multi-row check at all — probe Q5 reported [].
    if (statementKind(text) === "WITH") {
      const tables = scopedTables(text);
      if (tables.length > 0 && !scopesOnProjectId(text)) {
        add(
          "cte-unscoped",
          `${where}: a WITH statement over ${tables.join(", ")} does not scope on project_id. A CTE head takes the statement out of the multi-row check entirely, which is why this shape reported nothing (05-RESEARCH § O-01, probe Q5). sdk.meta.db() is ONE database for every project (T-01-20).`,
        );
      }
    }

    // A multi-row WRITE. The one-statement, idempotent-by-natural-key discipline
    // this package is built on cannot cover it: the row set is decided by a query
    // at execution time, ON CONFLICT cannot make an unknown row set idempotent,
    // and this driver has no usable transaction to undo a partial write —
    // `BEGIN` does not span `exec` calls and fails silently.
    if (insertsFromSelect(text)) {
      const tables = scopedTables(text);
      add(
        "insert-select",
        `${where}: INSERT … SELECT is a MULTI-ROW write over ${tables.join(", ") || "an unnamed source"}. Its row set is decided at execution time, so ON CONFLICT cannot make it idempotent, and this driver has no transaction to undo a partial write (BEGIN does not span exec calls and fails silently). Write one row per statement from values the caller already holds.`,
      );
      if (tables.length > 0 && !scopesOnProjectId(text)) {
        add(
          "unscoped-multi-row",
          `${where}: an INSERT … SELECT over ${tables.join(", ")} does not scope on project_id in its WHERE clause, so it copies every project's rows (05-RESEARCH § O-01, probe Q10). sdk.meta.db() is ONE database for every project (T-01-20).`,
        );
      }
    }

    // PIECES, checked independently — see the decomposition note above.
    if (isDecomposable(text)) {
      const arms = topLevelArms(text);
      if (arms.length > 1) {
        for (const arm of arms) {
          const tables = scopedTables(arm);
          if (tables.length > 0 && !scopesOnProjectId(arm)) {
            add(
              "unscoped-union-arm",
              `${where}: a set-operation arm over ${tables.join(", ")} does not scope on project_id. Each arm is its own query — a sibling arm's predicate does not reach it, and the whole-statement check reads them as one string (05-RESEARCH § O-01, probe Q7).`,
            );
          }
        }
      }
      for (const span of subquerySpans(text)) {
        const tables = scopedTables(span);
        if (tables.length > 0 && !scopesOnProjectId(span)) {
          add(
            "unscoped-subquery",
            `${where}: a subquery over ${tables.join(", ")} does not scope on project_id. A scoped OUTER query does not scope its subqueries — the rows the subquery reads come from every project (05-RESEARCH § O-01, probe Q2). Correlate on project_id inside the subquery, or bind it there too.`,
          );
        }
      }
    }
  };

  // --- fragment composition ------------------------------------------------
  //
  // `concatenated-sql` only inspects `+` operands that are THEMSELVES SQL-looking
  // string literals, so `BASE + ORDER + " LIMIT ?"` over two identifiers reported
  // nothing (probe P1), and neither did a template whose head is not SQL-looking
  // (P2) nor an array join (P3). All three are the natural spelling of a query
  // BUILDER, which is what `05-RESEARCH § O-01` rejected for Phase 5 in favour of
  // a fixed literal matrix — and rejected partly BECAUSE the gate could not see
  // it, so an allowlist entry for a builder would have been an exemption whose
  // stated reach exceeded its executed reach.
  //
  // Two passes, because the declaration may appear AFTER the sink that consumes
  // it: the walk collects the names handed to a sink and the initializer of every
  // variable declaration, and the composition check runs over the intersection.
  const sinkArgNames = new Set<string>();
  const declInit = new Map<string, ts.Expression>();
  const reported = new Set<string>();

  /** Flatten a `+` chain into its leaf operands. */
  const plusOperands = (expr: ts.Expression): ts.Expression[] =>
    ts.isBinaryExpression(expr) &&
    expr.operatorToken.kind === ts.SyntaxKind.PlusToken
      ? [...plusOperands(expr.left), ...plusOperands(expr.right)]
      : [expr];

  const isLiteralOperand = (e: ts.Expression): boolean =>
    ts.isStringLiteral(e) ||
    ts.isNoSubstitutionTemplateLiteral(e) ||
    ts.isNumericLiteral(e);

  const reportComposition = (expr: ts.Expression, where: string): void => {
    const inner = ts.isAwaitExpression(expr)
      ? expr.expression
      : ts.isParenthesizedExpression(expr)
        ? expr.expression
        : expr;

    let why = "";
    if (
      ts.isBinaryExpression(inner) &&
      inner.operatorToken.kind === ts.SyntaxKind.PlusToken &&
      plusOperands(inner).some((op) => !isLiteralOperand(op))
    ) {
      why =
        "a + chain one of whose operands is a NAMED FRAGMENT rather than a literal";
    } else if (
      ts.isTemplateExpression(inner) &&
      inner.templateSpans.length > 0 &&
      !looksLikeSql(inner.head.text)
    ) {
      // A SQL-looking head is `interpolated-sql`'s business and is already
      // reported there; this rule exists for the head that hides the statement.
      why =
        "a template literal whose HEAD is not SQL-looking, so interpolated-sql never saw it";
    }
    if (why === "") return;

    const key = inner.getText(sf).slice(0, 200);
    if (reported.has(key)) return;
    reported.add(key);
    add(
      "fragment-composition",
      `${where}: SQL assembled from fragments — ${why} (${JSON.stringify(
        key.slice(0, 60),
      )}). 05-RESEARCH § O-01 probes P1/P2 measured this reporting NOTHING. Write complete literal statements and choose between them; a fixed matrix of literals is the shipped pattern (observations.ts carries two).`,
    );
  };

  const visit = (node: ts.Node): void => {
    // --- SQL string literals -------------------------------------------------
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      checkSqlText(node.text, "string literal");
    }

    // --- interpolated SQL ----------------------------------------------------
    if (ts.isTemplateExpression(node)) {
      const head = node.head.text;
      const whole =
        head + node.templateSpans.map((s) => s.literal.text).join(" ");
      if (looksLikeSql(whole)) {
        const allowed = INTERPOLATION_ALLOWLIST.some(
          (a) => a.file === base && a.head.test(head),
        );
        if (allowed) {
          sqlStrings.push(whole);
        } else {
          add(
            "interpolated-sql",
            `template literal: SQL built by interpolating a non-literal expression (head ${JSON.stringify(head)}). Bind with positional ? instead. The ONLY exemption is the migration PRAGMA, whose value position cannot be bound and whose value is a compile-time integer from a literal array.`,
          );
          checkSqlText(whole, "template literal");
        }
      }
    }

    // --- concatenated SQL ----------------------------------------------------
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      for (const side of [node.left, node.right]) {
        if (
          (ts.isStringLiteral(side) ||
            ts.isNoSubstitutionTemplateLiteral(side)) &&
          looksLikeSql(side.text)
        ) {
          add(
            "concatenated-sql",
            `binary +: SQL assembled by concatenation (${JSON.stringify(side.text.slice(0, 60))}). Write complete literal statements and choose between them.`,
          );
        }
      }
    }

    // --- call sites ----------------------------------------------------------
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const method = node.expression.name.text;
      const args = node.arguments;

      if (method === PARAMETERLESS_METHOD && args.length !== 1) {
        add(
          "exec-arity",
          `exec() called with ${String(args.length)} arguments. exec takes the SQL and NOTHING else — an array of bind values passed here is SILENTLY IGNORED, which in Phase 0 produced rows with every column NULL and a constraint failure that never surfaced.`,
        );
      }

      if (
        BIND_METHODS.has(method) &&
        args.length === 1 &&
        ts.isArrayLiteralExpression(args[0])
      ) {
        add(
          "array-bind",
          `${method}() called with a single ARRAY argument. Parameters must be SPREAD: ${method}(...params), never ${method}(params).`,
        );
      }

      // --- fragment composition, form (c): Array.join ------------------------
      //
      // Checked wherever it appears rather than only at a sink, because an array
      // literal containing a SQL-looking string, being joined, has no innocent
      // reading. `[a, b].join(" ")` over things that are not SQL is ordinary and
      // is untouched.
      if (
        method === "join" &&
        ts.isArrayLiteralExpression(node.expression.expression)
      ) {
        const sqlish = node.expression.expression.elements.find(
          (el) =>
            (ts.isStringLiteral(el) ||
              ts.isNoSubstitutionTemplateLiteral(el)) &&
            looksLikeSql(el.text),
        );
        if (sqlish !== undefined) {
          add(
            "fragment-composition",
            `Array.join(): SQL assembled from array fragments (${JSON.stringify(
              (sqlish as ts.StringLiteral).text.slice(0, 60),
            )}). 05-RESEARCH § O-01 probe P3 measured this shape reporting NOTHING, because concatenated-sql only inspects binary + operands. Write complete literal statements and choose between them.`,
          );
        }
      }

      // --- fragment composition, forms (a) and (b): at the SINK --------------
      if (SQL_SINKS.has(method) && args.length >= 1) {
        const first = args[0];
        if (first !== undefined) {
          if (ts.isIdentifier(first)) {
            // Resolved after the walk — the declaration may appear later in the
            // file than the sink that consumes it.
            sinkArgNames.add(first.text);
          } else {
            reportComposition(first, `${method}() argument`);
          }
        }
      }
    }

    // --- every variable initializer, for the second composition pass ---------
    //
    // At ANY scope, not just module scope: the realistic spelling of the builder
    // is `const sql = BASE + ORDER; ... db.prepare(sql)` inside the read
    // function, and a module-scope-only collection would miss exactly that.
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const init = node.initializer;
      if (init !== undefined) declInit.set(node.name.text, init);
    }

    // --- module-scope statements and promises --------------------------------
    if (ts.isVariableStatement(node) && node.parent === sf) {
      for (const decl of node.declarationList.declarations) {
        const init = decl.initializer;
        if (init === undefined) continue;
        if (ts.isAwaitExpression(init)) {
          add(
            "module-scope-await",
            `${decl.name.getText(sf)} is awaited at module scope. A continuation attached to an already-settled module-level promise left over from a previous event invocation is NEVER driven in this runtime.`,
          );
        }
        if (
          ts.isCallExpression(init) &&
          ts.isPropertyAccessExpression(init.expression) &&
          init.expression.name.text === "prepare"
        ) {
          add(
            "module-scope-statement",
            `${decl.name.getText(sf)} prepares a statement at module scope. sdk.meta.db() is a POOL over worker threads, so two run() calls on a shared Statement can land on different connections with interleaved bindings. Prepare INSIDE the write.`,
          );
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);

  // Second composition pass. A name is only examined if a sink actually consumed
  // it, which is what keeps `const label = a + b` — string work with nothing to
  // do with SQL — out of this rule entirely.
  for (const name of sinkArgNames) {
    const init = declInit.get(name);
    if (init !== undefined)
      reportComposition(init, `${name} (passed to a sink)`);
  }

  return { violations, sqlStrings };
}

describe("SQL discipline over packages/backend/src (STORE-07, T-01-19)", () => {
  const files = backendFiles();

  it("enumerates a NON-EMPTY set of backend modules", () => {
    // Without this the whole gate passes by measuring nothing — the same failure
    // tests/schema.spec.ts:44-53 guards against for the same reason.
    expect(
      files.length,
      `no .ts modules found under ${BACKEND_SRC}`,
    ).toBeGreaterThan(0);
    // The modules this plan and plan 01-01 shipped, so a RENAME is a visible
    // change rather than a silently shrunk gate. `index.ts`, `consumer.ts` and
    // `passive.ts` are here because the walk is over the PACKAGE now: index.ts
    // already prepares a statement, and the two hook-side modules are where a
    // future query is most likely to be written.
    const names = files.map((f) => f.split("/").pop());
    for (const expected of [
      "analyses.ts",
      "artifacts.ts",
      "db.ts",
      "migrations.ts",
      "observations.ts",
      "retention.ts",
      "settings.ts",
      "index.ts",
      "lifecycle.ts",
      "telemetry.ts",
      "consumer.ts",
      "passive.ts",
      "admit.ts",
      "compat.ts",
    ]) {
      expect(names, `${expected} is not being audited`).toContain(expected);
    }
    // And the walk really did DESCEND, rather than matching those names in one
    // flat directory.
    expect(
      files.some((f) => f.includes("/ingest/")),
      "the walk did not descend into subdirectories, which is the whole fix.",
    ).toBe(true);
  });

  it("audits the SQL that lives OUTSIDE store/ — the reason for the walk", () => {
    // Non-vacuity for the widening itself: index.ts's probe statement is real
    // SQL that the directory-scoped version of this gate never saw.
    const indexFile = join(BACKEND_SRC, "index.ts");
    const { sqlStrings } = auditSource(
      indexFile,
      readFileSync(indexFile, "utf8"),
    );
    expect(
      sqlStrings.length,
      "index.ts contributes no SQL to the gate, so widening it bought nothing " +
        "measurable. If the probe statement moved, point this at wherever it went.",
    ).toBeGreaterThan(0);
  });

  it("emits exactly the rules it claims to — the gate's REACH, named", () => {
    // Non-vacuity for the WIDENING. The other three assertions in this block
    // guard the file set; this one guards the RULE set, which is the thing plan
    // 05-02 changed. `RULE_NAMES` is the type of `add`'s first argument, so a
    // rule added without appearing here is a typecheck failure rather than a
    // silently wider gate — and a rule DELETED here is a visible edit rather
    // than a quietly narrower one.
    //
    // FIFTEEN, not the fourteen 05-02-PLAN.md asks for. The plan's count comes
    // from `05-RESEARCH.md § O-01`'s summary table, which lists
    // `module-scope-statement / module-scope-audit` as ONE row because they share
    // a cause. They are two names in the source and always have been: 10 + 5 = 15.
    // Asserting 14 would assert something false about this file.
    expect([...RULE_NAMES]).toEqual([
      "named-parameter",
      "returning",
      "last-insert-rowid",
      "unscoped-multi-row",
      "interpolated-sql",
      "concatenated-sql",
      "exec-arity",
      "array-bind",
      "module-scope-await",
      "module-scope-statement",
      // Added by plan 05-02 — the five shapes § O-01 measured this gate silent on.
      "cte-unscoped",
      "insert-select",
      "unscoped-subquery",
      "unscoped-union-arm",
      "fragment-composition",
    ]);
    expect(new Set(RULE_NAMES).size, "a duplicate rule name").toBe(
      RULE_NAMES.length,
    );
  });

  it("finds SQL to audit — the gate is not measuring an empty set", () => {
    let total = 0;
    for (const f of files) {
      total += auditSource(f, readFileSync(f, "utf8")).sqlStrings.length;
    }
    expect(
      total,
      "no SQL strings were found in any store module — the gate would pass vacuously",
    ).toBeGreaterThan(0);
  });

  it.each(files)("%s passes every SQL-discipline rule", (file) => {
    const { violations } = auditSource(file, readFileSync(file, "utf8"));
    expect(
      violations.map((v) => `${v.rule}: ${v.detail}`),
      `${file} violates SQL discipline`,
    ).toEqual([]);
  });

  it("the migration PRAGMA is the ONE allowlisted interpolation, and it is used", () => {
    const src = readFileSync(join(STORE_DIR, "migrations.ts"), "utf8");
    // The exemption exists AND is exercised: if the PRAGMA write were ever
    // rewritten, this assertion would notice the allowlist had gone dead rather
    // than leaving a permanent hole nobody uses.
    expect(src).toMatch(/PRAGMA user_version = \$\{/);
    expect(auditSource("migrations.ts", src).violations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// EVERY RULE'S FAILING PATH, EXECUTED.
// ---------------------------------------------------------------------------
describe("the gate's own failure paths", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditSource(file, src).violations.map((v) => v.rule);

  it("fails on a colon-prefixed named parameter", () => {
    expect(
      rulesOf(
        'const SQL = "SELECT sha256 FROM artifacts WHERE project_id = :projectId";',
      ),
    ).toContain("named-parameter");
  });

  it("fails on an at-prefixed and a dollar-prefixed named parameter", () => {
    expect(
      rulesOf('const SQL = "SELECT * FROM artifacts WHERE project_id = @pid";'),
    ).toContain("named-parameter");
    expect(
      rulesOf('const SQL = "SELECT * FROM artifacts WHERE project_id = $pid";'),
    ).toContain("named-parameter");
  });

  it("fails on a bind call given a single ARRAY argument", () => {
    expect(rulesOf("await stmt.run([projectId, sha256]);")).toContain(
      "array-bind",
    );
    // And PASSES on the correct spread form, so the rule distinguishes the two.
    expect(rulesOf("await stmt.run(...params);")).not.toContain("array-bind");
    expect(rulesOf("await stmt.run(projectId, sha256);")).not.toContain(
      "array-bind",
    );
  });

  it("fails on exec() given a second argument", () => {
    expect(rulesOf("await db.exec(SQL, [a, b]);")).toContain("exec-arity");
    expect(rulesOf("await db.exec(SQL);")).not.toContain("exec-arity");
  });

  it("fails on a multi-row statement over a non-settings table that omits project_id", () => {
    expect(
      rulesOf(
        'const SQL = "SELECT sha256 FROM artifacts ORDER BY sha256 ASC";',
      ),
    ).toContain("unscoped-multi-row");
    expect(
      rulesOf('const SQL = "DELETE FROM observations WHERE sha256 = ?";'),
    ).toContain("unscoped-multi-row");
    // Scoped: no violation.
    expect(
      rulesOf(
        'const SQL = "SELECT sha256 FROM artifacts WHERE project_id = ? ORDER BY sha256 ASC";',
      ),
    ).not.toContain("unscoped-multi-row");
    // `settings` is exempt — a global row is the point there.
    expect(
      rulesOf('const SQL = "SELECT value FROM settings WHERE key = ?";'),
    ).not.toContain("unscoped-multi-row");
  });

  it("an upsert is not a multi-row UPDATE just because it says DO UPDATE SET", () => {
    // Every upsert in this package ends `ON CONFLICT ... DO UPDATE SET`. Reading
    // that as an UPDATE statement made the gate demand a WHERE clause an INSERT
    // does not have — found by the same mutation run that found the predicate
    // bug above.
    expect(
      rulesOf(
        'const SQL = "INSERT INTO artifacts (project_id, sha256) VALUES (?, ?) ON CONFLICT (project_id, sha256) DO UPDATE SET seen_count = artifacts.seen_count + 1";',
      ),
    ).toEqual([]);
  });

  it("project_id in the SELECT LIST is not scoping — only the predicate counts", () => {
    // The mutation that found this: GET_ARTIFACT_SQL with `project_id = ?`
    // removed from its WHERE still contained `project_id` in the column list, so
    // a whole-string match passed a cross-project read.
    expect(
      rulesOf(
        'const SQL = "SELECT project_id, sha256 FROM artifacts WHERE sha256 = ?";',
      ),
    ).toContain("unscoped-multi-row");
    expect(
      rulesOf(
        'const SQL = "SELECT project_id, sha256 FROM artifacts WHERE project_id = ? AND sha256 = ?";',
      ),
    ).not.toContain("unscoped-multi-row");
  });

  it("fails on interpolated and concatenated SQL", () => {
    expect(
      rulesOf(
        "const SQL = `SELECT * FROM artifacts WHERE project_id = '${pid}'`;",
      ),
    ).toContain("interpolated-sql");
    expect(
      rulesOf(
        'const SQL = "SELECT * FROM artifacts WHERE project_id = " + pid;',
      ),
    ).toContain("concatenated-sql");
  });

  it("the PRAGMA exemption is scoped to migrations.ts and to that PRAGMA", () => {
    const pragma = "await db.exec(`PRAGMA user_version = ${m.v}`);";
    expect(rulesOf(pragma, "migrations.ts")).not.toContain("interpolated-sql");
    // Same code in any other module is NOT exempt.
    expect(rulesOf(pragma, "artifacts.ts")).toContain("interpolated-sql");
    // A DIFFERENT interpolated PRAGMA in migrations.ts is NOT exempt either.
    expect(
      rulesOf("await db.exec(`PRAGMA cache_size = ${n}`);", "migrations.ts"),
    ).toContain("interpolated-sql");
  });

  it("fails on RETURNING and on last_insert_rowid()", () => {
    expect(
      rulesOf(
        'const SQL = "INSERT INTO artifacts (project_id) VALUES (?) RETURNING sha256";',
      ),
    ).toContain("returning");
    expect(
      rulesOf('const SQL = "SELECT last_insert_rowid() AS id FROM artifacts";'),
    ).toContain("last-insert-rowid");
  });

  it("fails on a module-scope prepared statement and a module-scope await", () => {
    expect(rulesOf("const STMT = db.prepare(SQL);")).toContain(
      "module-scope-statement",
    );
    expect(rulesOf("const HANDLE = await db.prepare(SQL);")).toContain(
      "module-scope-await",
    );
    // A prepare INSIDE a function is correct and must not be flagged.
    expect(
      rulesOf("async function w() { const stmt = await db.prepare(SQL); }"),
    ).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // THE FIVE SHAPES `05-RESEARCH.md § O-01` MEASURED THE GATE SILENT ON.
  //
  // That section drove this file's own exported `auditSource` against twenty-four
  // candidate statements. Five reported `[]`, and each fixture below is the probe
  // text from that table rather than a paraphrase of it, so the thing asserted
  // here and the thing measured there are the SAME statement.
  //
  // None of the five was a live exposure — no such statement existed in the tree.
  // Four of them (CTE, unscoped subquery, unscoped UNION arm, INSERT … SELECT)
  // are the natural spelling of a suppression filter, a tab-count aggregate and
  // an audit write, which is precisely what Phase 5 is about to write. The rules
  // therefore land BEFORE the first Phase 5 query, not after it.
  //
  // Every one is PAIRED. The positive proves the rule fires; the negative is the
  // correct spelling of the same intent and proves the rule is a rule rather than
  // a ban on the whole shape.
  // -------------------------------------------------------------------------

  /** Q5 — a CTE head. `statementKind` returns `"WITH"`, which `isMultiRowStatement`
   *  rejects, so the project-scoping check never ran on it at all. */
  const Q5_CTE_UNSCOPED = `const SQL = "WITH s AS (SELECT 1) SELECT a FROM entities LIMIT ?";`;
  const Q5_CTE_SCOPED = `const SQL = "WITH s AS (SELECT 1) SELECT a FROM entities WHERE project_id = ? LIMIT ?";`;

  /** Q10 — a multi-row WRITE. `statementKind` returns `"INSERT"`, which the
   *  multi-row check also rejects, because an INSERT was assumed to touch one row. */
  const Q10_INSERT_SELECT = `const SQL = "INSERT INTO audit (project_id, event_id) SELECT project_id, 'x' FROM entities";`;
  const Q10_INSERT_VALUES = `const SQL = "INSERT INTO audit (project_id, event_id, kind, at) VALUES (?, ?, ?, ?)";`;

  /** Q2 — the outer query IS scoped, so the whole-statement predicate check passes
   *  while the subquery reads every project's suppressions. */
  const Q2_SUBQUERY_UNSCOPED = `const SQL = "SELECT a FROM entities WHERE project_id = ? AND fingerprint IN (SELECT fingerprint FROM suppressions)";`;
  const Q2_SUBQUERY_SCOPED = `const SQL = "SELECT a FROM entities WHERE project_id = ? AND fingerprint IN (SELECT s.fingerprint FROM suppressions s WHERE s.project_id = ?)";`;

  /** Q7 — the FIRST arm carries `project_id`, and the predicate check reads the
   *  text from the first WHERE onward, so the second arm rides in behind it. */
  const Q7_UNION_UNSCOPED = `const SQL = "SELECT a FROM entities WHERE project_id = ? UNION ALL SELECT a FROM archived_entities";`;
  const Q7_UNION_SCOPED = `const SQL = "SELECT a FROM entities WHERE project_id = ? UNION ALL SELECT a FROM archived_entities WHERE project_id = ?";`;

  /** P1/P2/P3 — the three builder shapes. `concatenated-sql` only inspects `+`
   *  operands that are THEMSELVES SQL-looking literals, so composing named
   *  fragments was invisible in all three spellings. Detected at the SINK: `a + b`
   *  over two identifiers is ordinary string work everywhere else in the language
   *  and only becomes a SQL defect at the moment it is executed. */
  //
  //  Each is wrapped in a function because a module-scope `await` is a DIFFERENT
  //  rule of this same gate, and a fixture that trips two rules cannot prove
  //  which of them the correct form clears.
  const P1_PLUS_FRAGMENTS = `async function q() { const stmt = await db.prepare(BASE + ORDER + " LIMIT ?"); }`;
  const P1_COMPLETE_LITERAL =
    "async function q() { const stmt = await db.prepare(`SELECT a FROM entities WHERE project_id = ? LIMIT ?`); }";
  const P2_TEMPLATE_FRAGMENTS =
    "async function q() { const stmt = await db.prepare(`${BASE} ORDER BY ${col} LIMIT ?`); }";
  const P3_JOIN_FRAGMENTS = `async function q() { const stmt = await db.prepare(["SELECT a FROM entities WHERE project_id = ?", " ORDER BY a"].join(" ")); }`;
  const P3_JOIN_NON_SQL = `const label = [a, b].join(" ");`;

  it("fails on a CTE head that scopes on nothing (probe Q5)", () => {
    expect(rulesOf(Q5_CTE_UNSCOPED)).toContain("cte-unscoped");
    expect(rulesOf(Q5_CTE_SCOPED)).not.toContain("cte-unscoped");
  });

  it("fails on INSERT … SELECT, and not on INSERT … VALUES (probe Q10)", () => {
    expect(rulesOf(Q10_INSERT_SELECT)).toContain("insert-select");
    expect(rulesOf(Q10_INSERT_VALUES)).not.toContain("insert-select");
    // The one-row INSERT is not merely un-flagged for this rule — it is clean.
    expect(rulesOf(Q10_INSERT_VALUES)).toEqual([]);
  });

  it("fails on an unscoped subquery under a scoped outer query (probe Q2)", () => {
    expect(rulesOf(Q2_SUBQUERY_UNSCOPED)).toContain("unscoped-subquery");
    expect(rulesOf(Q2_SUBQUERY_SCOPED)).not.toContain("unscoped-subquery");
  });

  it("fails on a UNION arm that scopes on nothing (probe Q7)", () => {
    expect(rulesOf(Q7_UNION_UNSCOPED)).toContain("unscoped-union-arm");
    expect(rulesOf(Q7_UNION_SCOPED)).not.toContain("unscoped-union-arm");
  });

  it("fails on all three fragment-composition shapes (probes P1, P2, P3)", () => {
    expect(rulesOf(P1_PLUS_FRAGMENTS)).toContain("fragment-composition");
    expect(rulesOf(P2_TEMPLATE_FRAGMENTS)).toContain("fragment-composition");
    expect(rulesOf(P3_JOIN_FRAGMENTS)).toContain("fragment-composition");
    // A single COMPLETE literal handed to the same sink is the correct form.
    expect(rulesOf(P1_COMPLETE_LITERAL)).not.toContain("fragment-composition");
    expect(rulesOf(P1_COMPLETE_LITERAL)).toEqual([]);
    // And a join over strings that are not SQL is not this repo's business.
    expect(rulesOf(P3_JOIN_NON_SQL)).not.toContain("fragment-composition");
    expect(rulesOf(P3_JOIN_NON_SQL)).toEqual([]);
  });

  it("every one of the five new rule names is REACHABLE from a fixture", () => {
    // Non-vacuity for the widening itself. A rule that no fixture can reach is a
    // rule whose failing path has never run, which is the condition this file's
    // header exists to forbid.
    const reached = new Set(
      [
        Q5_CTE_UNSCOPED,
        Q10_INSERT_SELECT,
        Q2_SUBQUERY_UNSCOPED,
        Q7_UNION_UNSCOPED,
        P1_PLUS_FRAGMENTS,
        P2_TEMPLATE_FRAGMENTS,
        P3_JOIN_FRAGMENTS,
      ].flatMap((src) => rulesOf(src)),
    );
    for (const name of [
      "cte-unscoped",
      "insert-select",
      "unscoped-subquery",
      "unscoped-union-arm",
      "fragment-composition",
    ]) {
      expect(
        [...reached],
        `${name} is not reachable from any fixture`,
      ).toContain(name);
    }
  });
});
