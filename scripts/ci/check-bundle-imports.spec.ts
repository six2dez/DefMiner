// scripts/ci/check-bundle-imports.spec.ts — the DIST-05 gate's FAILING PATH.
//
// A gate whose failure path has never executed is the shape of every Phase 0
// verification defect: "the prose stated a rule correctly, and the gate checked
// less than the prose claimed" (.planning/STATE.md). So this file runs the gate
// as a subprocess — the same way CI does — and asserts on its exit code and its
// printed output, not on any internal it could be lying about.
//
// Five failure fixtures, each covering a distinct way the gate could be theatre:
//
//   zlib        — a plain unresolvable built-in. The base case.
//   node:crypto — the prefixed spelling of a specifier that IS allowed bare.
//                 This is the case a lint autofix introduces silently.
//   caido:crypto— measured to FAIL inside Caido despite the `caido:` prefix, so
//                 a blanket prefix match would wrongly pass it.
//   zlib+util   — two violations in one file, to prove the gate reports EVERY
//                 bad specifier rather than bailing on the first.
//   missing file— a gate that cannot find its target must never report success.

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const GATE = "scripts/ci/check-bundle-imports.mjs";
const BUNDLE = "packages/backend/dist/index.js";

const BUILD = "run `pnpm build:backend`";

function runGate(...args: string[]): {
  status: number;
  stdout: string;
  stderr: string;
} {
  const r = spawnSync(process.execPath, [GATE, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return {
    status: r.status ?? -1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

function fixture(name: string, source: string): string {
  const dir = mkdtempSync(join(tmpdir(), "defminer-dist05-"));
  const path = join(dir, name);
  writeFileSync(path, source, "utf8");
  return path;
}

describe("DIST-05 — the shipped backend bundle passes the measured allowlist", () => {
  it("exits 0 against the real bundle", () => {
    const r = runGate();
    expect(
      r.status,
      `the gate rejected DefMiner's own shipped bundle:\n${r.stderr}`,
    ).toBe(0);
  });

  it("actually found import specifiers — it did not pass by measuring nothing", () => {
    // NON-VACUITY. A gate pointed at an empty or truncated file would otherwise
    // report success having classified zero specifiers.
    const r = runGate();
    const m = /(\d+) import specifier\(s\)/.exec(r.stdout);
    expect(
      m,
      `the gate printed no specifier count for ${BUNDLE}; ${BUILD} and re-run.`,
    ).not.toBeNull();
    expect(
      Number(m?.[1]),
      `the gate classified 0 specifiers in ${BUNDLE}, so exit 0 means nothing. ${BUILD}.`,
    ).toBeGreaterThan(0);
  });

  it("names `crypto` among what it found", () => {
    // DET-07's native hash is mandatory, so this specifier must both be present
    // and be accepted. If it ever disappears, the digest path changed.
    const r = runGate();
    expect(
      r.stdout,
      `${BUNDLE} no longer imports \`crypto\`. DET-07 forbids the JS hashing loop Phase 0 measured at 187 ms/MB against 0.34 ms/MB native — check packages/engine/src/digest.ts.`,
    ).toContain("crypto");
  });
});

describe("DIST-05 — the failing path, executed", () => {
  it("fails on `zlib` and names it", () => {
    const path = fixture(
      "zlib.js",
      'import { deflateSync } from "zlib";\nexport { deflateSync };\n',
    );
    const r = runGate(path);
    expect(
      r.status,
      "the gate ACCEPTED a bundle importing `zlib`, which Caido 0.57.1 was measured to reject with `could not load module`.",
    ).not.toBe(0);
    expect(r.stderr, "the gate failed without naming `zlib`.").toContain(
      "zlib",
    );
  });

  it("fails on `node:crypto` — the prefixed spelling a lint autofix introduces", () => {
    const path = fixture(
      "prefixed.js",
      'import { createHash } from "node:crypto";\nexport { createHash };\n',
    );
    const r = runGate(path);
    expect(
      r.status,
      "the gate ACCEPTED `node:crypto`. Caido's probe loaded bare `crypto` and never the prefixed form; Node's builtinModules carries only bare names apart from node:sea/sqlite/test.",
    ).not.toBe(0);
    expect(r.stderr, "the gate failed without naming `node:crypto`.").toContain(
      "node:crypto",
    );
  });

  it("fails on `caido:crypto` — the prefix is NOT blanket-allowed", () => {
    const path = fixture(
      "caido-crypto.js",
      'import { hash } from "caido:crypto";\nexport { hash };\n',
    );
    const r = runGate(path);
    expect(
      r.status,
      "the gate ACCEPTED `caido:crypto`, so it is matching the `caido:` prefix by pattern. That specifier is in the MEASURED-FAILING set; only `caido:http` was proven loadable.",
    ).not.toBe(0);
    expect(
      r.stderr,
      "the gate failed without naming `caido:crypto`.",
    ).toContain("caido:crypto");
  });

  it("reports EVERY bad specifier in one run, not just the first", () => {
    const path = fixture(
      "two.js",
      'import { deflateSync } from "zlib";\nimport { inspect } from "util";\nexport { deflateSync, inspect };\n',
    );
    const r = runGate(path);
    expect(
      r.status,
      "the gate accepted a bundle with two violations.",
    ).not.toBe(0);
    const lines = r.stderr
      .split("\n")
      .filter((l) => l.includes("is not in the measured-loadable set"));
    expect(
      lines.length,
      `the gate printed ${lines.length} violation line(s) for a fixture importing BOTH zlib and util. It is bailing on the first failure, and the operator wants the full list.\n${r.stderr}`,
    ).toBe(2);
    expect(r.stderr).toContain("zlib");
    expect(r.stderr).toContain("util");
  });

  it("catches `export ... from` and dynamic `import()`, not just `import`", () => {
    // A regex over lines starting with `import` misses both of these, which is
    // why the gate walks the AST.
    const path = fixture(
      "reexport.js",
      'export * from "stream";\nconst m = await import("perf_hooks");\nexport { m };\n',
    );
    const r = runGate(path);
    expect(
      r.status,
      "the gate missed a re-export or a dynamic import.",
    ).not.toBe(0);
    expect(r.stderr).toContain("stream");
    expect(r.stderr).toContain("perf_hooks");
  });

  it("fails on a dynamic import whose specifier is not a literal", () => {
    const path = fixture(
      "dynamic.js",
      'const n = "zl" + "ib";\nconst m = await import(n);\nexport { m };\n',
    );
    const r = runGate(path);
    expect(
      r.status,
      "the gate SILENTLY IGNORED a computed dynamic import. It cannot classify one, so it must fail rather than pass.",
    ).not.toBe(0);
    expect(r.stderr).toContain("non-literal specifier");
  });

  it("never exits 0 when its target does not exist", () => {
    const r = runGate(join(tmpdir(), "defminer-there-is-no-such-bundle.js"));
    expect(
      r.status,
      "the gate reported success against a bundle that is not there. A gate that cannot find its target must fail.",
    ).not.toBe(0);
  });
});
