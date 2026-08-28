// scripts/ci/frontend-externals.mjs — the frontend bundle's externals, asserted
// on the BUILD OUTPUT.
//
//   node scripts/ci/frontend-externals.mjs [bundle.js]...
//
// Exits 0 when the bundle imports every module it must import and imports
// nothing it must not, 1 on a violation, and 2 when an input cannot be read,
// cannot be parsed, or is empty. With no arguments it checks the frontend
// plugin's built bundle.
//
// ---------------------------------------------------------------------------
// THE THREAT (T-05-03)
// ---------------------------------------------------------------------------
// Caido's renderer already runs Vue. If DefMiner's bundle carries its OWN copy,
// the plugin gets a SECOND reactivity runtime inside the host page: two
// schedulers, two sets of effect scopes, one DOM. Nothing throws. The symptoms
// are refs that do not update, provide/inject that does not resolve across the
// boundary, and a page that is subtly wrong in ways that look like application
// bugs. `rollupOptions.external` in packages/frontend/vite.config.ts is what
// prevents it and this gate is the only thing that notices when that stops
// being true.
//
// ---------------------------------------------------------------------------
// WHAT "ABSENT" MEANS, AND WHY THE REQUIRED SET IS SMALLER THAN THE EXTERNAL SET
// ---------------------------------------------------------------------------
// The obvious formulation — "every declared external must appear in the built
// import set, because absent means bundled" — is WRONG, and wrong in the
// direction that fails every build.
//
// "Absent from the import set" has two possible causes and they are opposite
// verdicts: the module was inlined (the defect), or the module was never
// imported in the first place (perfectly fine). The import set alone cannot
// distinguish them.
//
// `vue` is the case where it can, and that is why it is the required one: every
// Vue application imports `createApp` unconditionally, so if `vue` is missing
// from a bundle that renders a Vue app, inlining is the only explanation left.
// `@caido/frontend-sdk` is types-only here — the SDK arrives as `init()`'s
// argument, never as a runtime import — and no CodeMirror or Lezer module is
// referenced yet. Requiring THOSE to be present would fail the build for a
// defect that has not occurred, which is how a gate gets deleted.
//
// The rest of the external set is still enforced, by the complementary rule:
// every bare specifier the bundle DOES import must be declared external. That
// catches the inverse defect — a dependency left external that Caido does not
// provide, which is a runtime resolution failure on the operator's machine.
//
// Parsing is a full acorn walk, for the reason
// scripts/ci/check-bundle-imports.mjs states: a regex misses `export ... from`,
// dynamic `import()` and multi-line specifiers.

import { readFileSync } from "node:fs";

import { parse } from "acorn";

import {
  EXTERNAL_NAMES,
  EXTERNAL_PREFIXES,
  isExternal,
  REQUIRED_IMPORTS,
} from "../../packages/frontend/externals.mjs";

const DEFAULT_TARGET =
  "packages/dist/plugin_package/defminer-frontend/index.js";

const REMEDY =
  "remedy: edit `EXTERNAL_NAMES` / `EXTERNAL_PREFIXES` in " +
  "packages/frontend/externals.mjs — vite.config.ts and this gate both read " +
  "that one list, so there is no second copy to keep in sync";

/** Every literal module specifier reachable from the AST, plus the offsets of
 *  any dynamic import whose source is not a literal — reported rather than
 *  ignored, because a specifier this gate cannot classify is a specifier it is
 *  not checking. */
function collectSpecifiers(ast) {
  const specifiers = new Set();
  const dynamic = [];

  const visit = (node) => {
    if (node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (typeof node.type === "string") {
      switch (node.type) {
        case "ImportDeclaration":
        case "ExportNamedDeclaration":
        case "ExportAllDeclaration":
          if (node.source && node.source.type === "Literal") {
            specifiers.add(String(node.source.value));
          }
          break;
        case "ImportExpression":
          if (node.source && node.source.type === "Literal") {
            specifiers.add(String(node.source.value));
          } else {
            dynamic.push(node.start);
          }
          break;
        default:
          break;
      }
    }
    for (const key of Object.keys(node)) {
      if (key === "type" || key === "start" || key === "end" || key === "loc") {
        continue;
      }
      visit(node[key]);
    }
  };

  visit(ast);
  return { specifiers, dynamic };
}

/** Relative and absolute paths are chunk references, not dependencies. */
function isBare(specifier) {
  return !specifier.startsWith(".") && !specifier.startsWith("/");
}

const inputs = process.argv.slice(2);
const targets = inputs.length > 0 ? inputs : [DEFAULT_TARGET];

let failed = 0;

for (const path of targets) {
  let src;
  try {
    src = readFileSync(path, "utf8");
  } catch (err) {
    console.error(`${path}: cannot read bundle: ${err.message}`);
    console.error(
      `${path}: build it first (\`pnpm build\`) — a gate that cannot find its ` +
        `target must never report success`,
    );
    process.exit(2);
  }

  if (src.trim() === "") {
    // An empty bundle imports nothing, which would satisfy every "must not
    // import" rule vacuously. It fails here instead.
    console.error(
      `${path}: bundle is empty — nothing was checked, which is not the same ` +
        `as nothing being wrong`,
    );
    process.exit(2);
  }

  let ast;
  try {
    ast = parse(src, { ecmaVersion: "latest", sourceType: "module" });
  } catch (err) {
    console.error(`${path}: cannot parse as an ES module: ${err.message}`);
    process.exit(2);
  }

  const { specifiers, dynamic } = collectSpecifiers(ast);

  for (const start of dynamic) {
    console.error(
      `${path}: dynamic import at offset ${start} has a non-literal specifier, ` +
        `so this gate cannot classify it (${REMEDY})`,
    );
    failed++;
  }

  const found = [...specifiers].sort();
  const bare = found.filter(isBare);
  console.log(
    `${path}: ${bare.length} bare import specifier(s): ${bare.join(", ") || "(none)"}`,
  );

  // Rule 1 — a module that MUST stay external, and whose absence can only mean
  // it was inlined.
  for (const required of REQUIRED_IMPORTS) {
    if (specifiers.has(required)) continue;
    console.error(
      `${path}: "${required}" is not imported — Caido provides it, so its ` +
        `absence from a bundle that uses it means a SECOND copy was inlined ` +
        `into the plugin (${REMEDY})`,
    );
    failed++;
  }

  // Rule 2 — nothing bare may be imported that Caido does not provide. An
  // undeclared bare specifier survives to runtime and fails to resolve on the
  // operator's machine, where nobody can debug it.
  for (const specifier of bare) {
    if (isExternal(specifier)) continue;
    console.error(
      `${path}: "${specifier}" is imported but is not a declared external — ` +
        `Caido will not resolve it at runtime (${REMEDY})`,
    );
    failed++;
  }
}

if (failed === 0) {
  console.log(
    `externals honoured: required ${REQUIRED_IMPORTS.join(", ")}; ` +
      `permitted ${[...EXTERNAL_NAMES, ...EXTERNAL_PREFIXES.map((p) => `${p}*`)].join(", ")}`,
  );
}

process.exit(failed === 0 ? 0 : 1);
