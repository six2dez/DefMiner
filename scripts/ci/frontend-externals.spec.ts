// scripts/ci/frontend-externals.spec.ts — the externals gate's FAILING PATH.
//
// Same contract as scripts/ci/check-bundle-imports.spec.ts and
// scripts/ci/prefixwrap.spec.ts: the gate runs as a subprocess and every
// assertion checks BOTH the exit code and the printed output, so a gate that
// exits non-zero for the wrong reason is distinguishable from one that caught
// the real defect.
//
// Fixtures:
//
//   external vue   — the correct shape. `import ... from "vue"` present.
//   inlined vue    — Vue's source in the bundle and NO `vue` specifier. This is
//                    threat T-05-03: a second reactivity runtime in the host
//                    page, which throws nothing and breaks reactivity subtly.
//   undeclared     — a bare specifier Caido does not provide, left external by
//                    accident. Fails to resolve on the operator's machine.
//   dynamic        — `import(someVariable)`: a specifier the gate CANNOT
//                    classify, reported rather than ignored.
//   relative-only  — chunk references are not dependencies and must not be
//                    mistaken for undeclared externals.
//   empty bundle   — imports nothing, so it satisfies every "must not import"
//                    rule vacuously. Fails instead.
//   missing bundle — a gate that cannot find its target must never pass.

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const GATE = "scripts/ci/frontend-externals.mjs";
const BUILT_BUNDLE = "packages/dist/plugin_package/defminer-frontend/index.js";

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

function fixture(source: string): string {
  const dir = mkdtempSync(join(tmpdir(), "defminer-externals-"));
  const path = join(dir, "index.js");
  writeFileSync(path, source, "utf8");
  return path;
}

describe("externals gate — the shipped frontend bundle", () => {
  it("exits 0 against the real built bundle and lists what it found", () => {
    const r = runGate(BUILT_BUNDLE);

    expect(r.status, `stderr:\n${r.stderr}`).toBe(0);
    expect(r.stdout).toContain("bare import specifier(s)");
    expect(r.stdout).toContain("externals honoured");
  });

  it("proves Vue is genuinely external in the shipped bundle", () => {
    const r = runGate(BUILT_BUNDLE);

    expect(r.status, `stderr:\n${r.stderr}`).toBe(0);
    // Not an incidental pass: `vue` is actually in the bundle's import set,
    // which is what "Caido provides it" has to look like in the output.
    expect(r.stdout).toMatch(/bare import specifier\(s\):[^\n]*\bvue\b/);
  });
});

describe("externals gate — passing fixtures", () => {
  it("accepts a bundle that imports vue and nothing undeclared", () => {
    const path = fixture(
      'import { createApp } from "vue";\nexport const app = createApp({});\n',
    );
    const r = runGate(path);

    expect(r.status, `stderr:\n${r.stderr}`).toBe(0);
    expect(r.stdout).toContain("externals honoured");
  });

  it("accepts scoped externals matched by prefix", () => {
    const path = fixture(
      'import { createApp } from "vue";\n' +
        'import { EditorView } from "@codemirror/view";\n' +
        'import { highlightTree } from "@lezer/highlight";\n' +
        "export { createApp, EditorView, highlightTree };\n",
    );
    const r = runGate(path);

    expect(r.status, `stderr:\n${r.stderr}`).toBe(0);
    expect(r.stdout).toContain("@codemirror/view");
  });

  it("does not mistake relative chunk references for dependencies", () => {
    const path = fixture(
      'import { createApp } from "vue";\nexport * from "./chunk-abc.js";\n',
    );
    const r = runGate(path);

    expect(r.status, `stderr:\n${r.stderr}`).toBe(0);
    expect(r.stdout).not.toContain("./chunk-abc.js");
  });
});

describe("externals gate — failing fixtures", () => {
  it("fails on a bundle with an INLINED Vue and no vue import specifier", () => {
    // What a bundled Vue actually looks like from the outside: the runtime's
    // source is present, and the `vue` specifier is gone.
    const path = fixture(
      "function createApp(options){return{mount(el){el.textContent='';return options}}}\n" +
        "export const app = createApp({});\n",
    );
    const r = runGate(path);

    expect(r.status).toBe(1);
    expect(r.stderr).toContain('"vue" is not imported');
    expect(r.stderr).toContain("SECOND copy was inlined");
  });

  it("fails on a bare specifier Caido does not provide", () => {
    const path = fixture(
      'import { createApp } from "vue";\nimport lodash from "lodash";\nexport { createApp, lodash };\n',
    );
    const r = runGate(path);

    expect(r.status).toBe(1);
    expect(r.stderr).toContain(
      '"lodash" is imported but is not a declared external',
    );
  });

  it("reports EVERY violation rather than bailing on the first", () => {
    const path = fixture(
      'import a from "lodash";\nimport b from "axios";\nexport { a, b };\n',
    );
    const r = runGate(path);

    expect(r.status).toBe(1);
    expect(r.stderr).toContain("lodash");
    expect(r.stderr).toContain("axios");
    // …and the missing `vue` too: three findings from one run.
    expect(r.stderr).toContain('"vue" is not imported');
  });

  it("reports a dynamic import it cannot classify instead of ignoring it", () => {
    const path = fixture(
      'import { createApp } from "vue";\nexport const load = (n) => import(n);\nexport { createApp };\n',
    );
    const r = runGate(path);

    expect(r.status).toBe(1);
    expect(r.stderr).toContain("non-literal specifier");
  });

  it("fails on an empty bundle rather than passing vacuously", () => {
    const path = fixture("\n   \n");
    const r = runGate(path);

    expect(r.status).toBe(2);
    expect(r.stderr).toContain("bundle is empty");
    expect(r.stderr).toContain("nothing was checked");
  });

  it("fails on a missing target and names the path it could not read", () => {
    const r = runGate("/nonexistent-bundle.js");

    expect(r.status).toBe(2);
    expect(r.stderr).toContain("/nonexistent-bundle.js");
    expect(r.stderr).toContain("must never report success");
  });
});
