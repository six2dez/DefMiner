// packages/engine/src/boundary.spec.ts — DET-03's precondition, enforced at test
// time as well as at lint time and typecheck time.
//
// The engine must run under plain vitest on Node with NO Caido present. That is
// what makes the analysis pipeline provable at all: Phase 0 measured that a
// catastrophic regex hangs the QuickJS thread with no interrupt and no
// in-runtime recovery (SPIKE-01), so every engine behaviour has to be
// demonstrable OUTSIDE the runtime it will eventually run in.
//
// FOUR mechanisms guard this, and they fail differently on purpose:
//
//   1. eslint.config.js  — a scoped `no-restricted-imports` over
//                          packages/engine/**. Catches SOURCE, at author time.
//   2. packages/engine/tsconfig.json — `types: ["node"]` only, and
//                          @caido/sdk-backend is not resolvable from this
//                          package. Catches SOURCE, at typecheck time.
//   3. this spec's AST scan — catches SOURCE even if someone adds an eslint
//                          disable comment or the lint scope drifts.
//   4. this spec's MANIFEST assertion — catches a DEPENDENCY that no source has
//                          imported yet. Different failure mode entirely: the
//                          manifest is how a Caido package gets into the engine's
//                          resolution path in the first place.
//
// PARSER NOTE: the sources here are TypeScript, so this uses the TypeScript
// compiler's own parser rather than acorn (acorn parses JavaScript and rejects
// type annotations outright). `scripts/ci/check-bundle-imports.mjs` still uses
// acorn, because the artifact IT reads is a built JavaScript bundle.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const PKG_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SRC = join(PKG_ROOT, "src");
const MANIFEST = join(PKG_ROOT, "package.json");

const REMEDY =
  "packages/engine is SDK-FREE (DET-03): it must run under plain vitest on Node " +
  "with no Caido present. Move whatever needs Caido into packages/backend.";

/** Every non-spec .ts file under packages/engine/src, recursively. */
function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      out.push(...sources(path));
      continue;
    }
    if (!name.endsWith(".ts")) continue;
    if (name.endsWith(".spec.ts")) continue;
    out.push(path);
  }
  return out.sort();
}

/** Every module specifier a file imports, re-exports or dynamically imports. */
function specifiersOf(path: string): string[] {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const found: string[] = [];

  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      found.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      found.push(node.arguments[0].text);
    }
    if (ts.isImportEqualsDeclaration(node)) {
      const ref = node.moduleReference;
      if (
        ts.isExternalModuleReference(ref) &&
        ts.isStringLiteral(ref.expression)
      ) {
        found.push(ref.expression.text);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return found;
}

const files = sources(SRC);

describe("DET-03 — no engine source imports Caido", () => {
  it("found engine sources to scan", () => {
    // NON-VACUITY. An enumeration that silently returns nothing would let every
    // it.each below vanish and this suite pass having checked no file at all —
    // the exact defect shape Phase 0's review rounds kept surfacing.
    expect(
      files.length,
      `no non-spec .ts files found under ${SRC}; this suite would pass having scanned nothing.`,
    ).toBeGreaterThan(0);
  });

  it.each(files)("%s imports nothing from Caido", (path) => {
    const bad = specifiersOf(path).filter(
      (s) =>
        s.startsWith("caido:") || s === "@caido" || s.startsWith("@caido/"),
    );
    expect(bad, `${path} imports ${bad.join(", ")}. ${REMEDY}`).toEqual([]);
  });

  it("does not import the backend either", () => {
    // The dependency edge runs backend -> engine and never the other way. A
    // cycle here would make the engine untestable without the plugin.
    const bad: string[] = [];
    for (const path of files) {
      for (const s of specifiersOf(path)) {
        if (s === "@defminer/backend" || s.startsWith("@defminer/backend/")) {
          bad.push(`${path}: ${s}`);
        }
      }
    }
    expect(
      bad,
      `${bad.join("; ")} — the dependency edge runs backend -> engine and never the reverse.`,
    ).toEqual([]);
  });
});

describe("DET-03 — the engine MANIFEST declares no Caido package", () => {
  const pkg = JSON.parse(readFileSync(MANIFEST, "utf8")) as Record<
    string,
    unknown
  >;

  it.each(["dependencies", "devDependencies", "peerDependencies"])(
    "%s carries no @caido/* entry",
    (field) => {
      const names = Object.keys(
        (pkg[field] ?? {}) as Record<string, string>,
      ).filter((n) => n.startsWith("@caido/"));
      expect(
        names,
        `${MANIFEST} ${field} declares ${names.join(", ")}. ${REMEDY} The lint rule and the AST scan catch SOURCE; this catches the manifest, and a package declared here is resolvable from every engine file whether or not anything imports it yet.`,
      ).toEqual([]);
    },
  );

  it("is a private, ESM package named @defminer/engine", () => {
    expect(
      pkg.name,
      `${MANIFEST} name changed; knip and the workspace protocol both key on it.`,
    ).toBe("@defminer/engine");
    expect(
      pkg.private,
      `${MANIFEST} must stay private — nothing here is published.`,
    ).toBe(true);
    expect(pkg.type, `${MANIFEST} must stay "module".`).toBe("module");
  });
});
