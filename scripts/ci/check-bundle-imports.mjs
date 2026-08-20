// scripts/ci/check-bundle-imports.mjs — DIST-05.
//
//   node scripts/ci/check-bundle-imports.mjs [bundle.js]...
//
// Exits 0 when every import specifier in every given bundle is in the
// MEASURED-LOADABLE set, 1 when any is not, and 2 when an input cannot be read
// or parsed. With no arguments it checks packages/backend/dist/index.js.
//
// ---------------------------------------------------------------------------
// WHY THIS IS AN ALLOWLIST AND NOT A BAN ON NODE BUILT-INS
// ---------------------------------------------------------------------------
// ROADMAP Phase 1 success criterion 6 was originally worded "a CI gate fails the
// build if the backend bundle imports any Node built-in". As literally worded
// that criterion FAILS A CORRECT DefMiner, for three measured reasons:
//
//   1. @caido-community/dev@0.1.7 builds the backend with
//      `external: [/caido:.+/, "sqlite", ...builtinModules]`. Node 26's
//      builtinModules has 66 entries, so EVERY built-in is externalised
//      silently and survives the build either way.
//   2. Caido's QuickJS resolves SOME of those and hard-fails on others. The
//      split is measured, not guessed — see DERIVATION below.
//   3. A real, working, already-built Phase 0 backend bundle emits
//      `import { createHash } from "crypto"`. That native hash is not optional:
//      DET-07 forbids the JS loop Phase 0 measured at 187 ms/MB against
//      0.34 ms/MB native.
//
// The corrected criterion, which this gate implements, is STRICTLY STRONGER in
// the direction that matters: the original would not have caught `zlib`, `util`,
// `stream` or `caido:crypto` at all, because it treats built-ins as one
// undifferentiated set and `caido:crypto` is not a built-in.
//
// ---------------------------------------------------------------------------
// DERIVATION — read this before touching ALLOWED
// ---------------------------------------------------------------------------
// EVERY entry in ALLOWED is a module the Phase 0 capability probe LOADED
// SUCCESSFULLY inside Caido 0.57.1. The measurement is committed at:
//
//   .planning/phases/00-runtime-reality-check/results/runs/
//     20260820T121824Z-31596/raw/capabilities.json
//
// ADDING AN ENTRY BY HAND IS A LIE UNLESS A PROBE RUN PROVES IT. The remedy for
// a genuinely-needed new module is a probe run against the target build, not an
// edit to this list. A specifier that is in neither the loadable set nor the
// failing set still fails, for the same reason: nobody has measured it.
//
// Measured to FAIL despite the build externalising them just as silently:
//
//   util, stream, zlib, process, perf_hooks, qjs, llrt:qjs, caido:crypto
//
// Note `caido:crypto` in that list. A blanket prefix match on `caido:` would be
// WRONG — it would allow a specifier the runtime is known to reject. `caido:http`
// is therefore matched LITERALLY, as itself, and any other `caido:` module has
// to be probed before it can ship.
//
// `node:`-prefixed specifiers are treated as unresolvable. Node's builtinModules
// contains only bare names apart from node:sea, node:sqlite, node:test and
// node:test/reporters; Caido's probe loaded bare `crypto` and never
// `node:crypto`. Strict is the safe direction here: over-strictness costs a lint
// fix, permissiveness ships a runtime crash on a user's machine. Modern lint
// configs actively push toward the prefix, so this is a live risk and not a
// hypothetical one.
//
// Parsing is a full acorn walk rather than a regex over lines starting with
// `import`. A regex misses `export ... from`, dynamic `import()` and multi-line
// specifiers — the three shapes a dependency is most likely to use.

import { readFileSync } from "node:fs";

import { parse } from "acorn";

const CAPABILITIES =
  ".planning/phases/00-runtime-reality-check/results/runs/" +
  "20260820T121824Z-31596/raw/capabilities.json";

/** The ten specifiers that LOADED inside Caido 0.57.1. Derived, not authored. */
const ALLOWED = new Set([
  "os",
  "path",
  "fs",
  "sqlite",
  "caido:http",
  "crypto",
  "buffer",
  "string_decoder",
  "url",
  "events",
]);

const DEFAULT_TARGET = "packages/backend/dist/index.js";

const REMEDY =
  "remedy: run the Phase 0 capability probe against the target build and record " +
  "the result in " +
  CAPABILITIES +
  " — do NOT edit the allowlist";

/** Every literal module specifier reachable from the AST, plus any dynamic
 *  import whose source is not a literal (reported separately: the gate cannot
 *  reason about it, and silently ignoring it would be the same bug as the regex
 *  it replaces). */
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

const targets = process.argv.slice(2);
const inputs = targets.length > 0 ? targets : [DEFAULT_TARGET];

let failed = 0;

for (const path of inputs) {
  let src;
  try {
    src = readFileSync(path, "utf8");
  } catch (err) {
    console.error(`${path}: cannot read bundle: ${err.message}`);
    console.error(
      `${path}: build it first (\`pnpm build:backend\`) — a gate that cannot ` +
        `find its target must never report success`,
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
  console.log(
    `${path}: ${found.length} import specifier(s): ${found.join(", ")}`,
  );

  for (const specifier of found) {
    if (ALLOWED.has(specifier)) continue;
    console.error(
      `${path}: ${specifier} is not in the measured-loadable set (${REMEDY})`,
    );
    failed++;
  }
}

process.exit(failed === 0 ? 0 : 1);
