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

type Violation = { file: string; rule: string; detail: string };

/** Statement-execution methods that take BIND PARAMETERS, spread. */
const BIND_METHODS = new Set(["run", "get", "all"]);
/** The PARAMETERLESS form. `Database.exec(sql)` takes no bind values at all. */
const PARAMETERLESS_METHOD = "exec";

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
});
