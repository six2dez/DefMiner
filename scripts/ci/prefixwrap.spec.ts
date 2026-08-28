// scripts/ci/prefixwrap.spec.ts — the CSS containment gate's FAILING PATH.
//
// Same contract as scripts/ci/check-bundle-imports.spec.ts, for the same
// reason its header gives: a gate whose failure path has never executed is
// indistinguishable from a gate that does nothing. So this runs the gate as a
// subprocess — the way CI runs it — and asserts on its exit code AND its
// printed output. Never on `status` alone: a gate that exits non-zero because
// it crashed looks identical, from the exit code, to one that caught the real
// defect.
//
// Fixtures, each covering a distinct way the gate could be theatre:
//
//   scoped        — every rule under the root. The base case.
//   unscoped      — a bare `.foo` that would escape the plugin.
//   partial list  — a comma-separated selector list where ONE member escapes,
//                   which is the shape a hand edit actually produces.
//   anchored-late — `.foo #plugin--defminer`, where the root is PRESENT but is
//                   not the anchor, so the rule still matches outside the
//                   plugin. A substring check would pass this.
//   lookalike id  — `#plugin--defminerX`, a different id sharing our prefix.
//   at-rule       — a rule nested in `@media`, to prove the walk descends.
//   keyframes     — `from`/`to`/percent "selectors" that are NOT selectors and
//                   must not be judged as unscoped.
//   empty         — zero rules is "nothing was checked", not "nothing wrong".
//   missing file  — a gate that cannot find its target must never pass.

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const GATE = "scripts/ci/prefixwrap.mjs";
const BUILT_CSS = "packages/dist/plugin_package/defminer-frontend/index.css";
const ROOT = "#plugin--defminer";

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

function fixture(css: string): string {
  const dir = mkdtempSync(join(tmpdir(), "defminer-prefixwrap-"));
  const path = join(dir, "index.css");
  writeFileSync(path, css, "utf8");
  return path;
}

describe("prefixwrap gate — the shipped stylesheet is contained", () => {
  it("exits 0 against the real built stylesheet and says how much it checked", () => {
    const r = runGate(BUILT_CSS);

    expect(r.status, `stderr:\n${r.stderr}`).toBe(0);
    expect(r.stdout).toContain(ROOT);
    // The count is part of the output on purpose: "0 rules checked" passing
    // silently is the exact failure this gate must not have.
    expect(r.stdout).toMatch(/\d+ rule\(s\) checked/);
  });

  it("reports a non-zero rule count, so a green result means work was done", () => {
    const r = runGate(BUILT_CSS);
    const match = /(\d+) rule\(s\) checked/.exec(r.stdout);

    expect(match).not.toBeNull();
    expect(Number(match![1])).toBeGreaterThan(0);
  });
});

describe("prefixwrap gate — passing fixtures", () => {
  it("accepts rules scoped under the root, including nested at-rules", () => {
    const path = fixture(
      `${ROOT} .a{color:red}` +
        `${ROOT}>.b{color:red}` +
        `${ROOT}:hover{color:red}` +
        `@media (min-width:40rem){${ROOT} .c{color:red}}`,
    );
    const r = runGate(path);

    expect(r.status, `stderr:\n${r.stderr}`).toBe(0);
    expect(r.stdout).toContain("4 rule(s) checked");
  });

  it("does not judge keyframe steps as unscoped selectors", () => {
    const path = fixture(
      `${ROOT} .spin{animation:s 1s}@keyframes s{from{opacity:0}to{opacity:1}}`,
    );
    const r = runGate(path);

    expect(r.status, `stderr:\n${r.stderr}`).toBe(0);
    // The keyframe steps are excluded from the count, not merely tolerated.
    expect(r.stdout).toContain("1 rule(s) checked");
  });
});

describe("prefixwrap gate — failing fixtures", () => {
  it("fails on a rule that escapes the plugin entirely", () => {
    const path = fixture(`${ROOT} .a{color:red}.escaped{color:red}`);
    const r = runGate(path);

    expect(r.status).toBe(1);
    expect(r.stderr).toContain(".escaped");
    expect(r.stderr).toContain("not scoped under");
  });

  it("fails when only ONE member of a selector list escapes", () => {
    const path = fixture(`${ROOT} .a,.b{color:red}`);
    const r = runGate(path);

    expect(r.status).toBe(1);
    expect(r.stderr).toContain(".b");
    // …and does not report the member that IS scoped.
    expect(r.stderr).not.toMatch(
      /not scoped under [^\n]*: #plugin--defminer \.a/,
    );
  });

  it("fails when the root is present but is not the anchor", () => {
    // `.foo #plugin--defminer` contains the root as a substring and still
    // matches elements outside the plugin. A substring check would pass it.
    const path = fixture(`.foo ${ROOT}{color:red}`);
    const r = runGate(path);

    expect(r.status).toBe(1);
    expect(r.stderr).toContain(`.foo ${ROOT}`);
  });

  it("fails on a different id that merely shares the root's prefix", () => {
    const path = fixture(`${ROOT}X .a{color:red}`);
    const r = runGate(path);

    expect(r.status).toBe(1);
    expect(r.stderr).toContain(`${ROOT}X .a`);
  });

  it("fails on an unscoped rule nested inside an at-rule", () => {
    const path = fixture(`@media (min-width:40rem){.escaped{color:red}}`);
    const r = runGate(path);

    expect(r.status).toBe(1);
    expect(r.stderr).toContain(".escaped");
  });

  it("fails on a stylesheet with zero rules rather than reporting success", () => {
    const path = fixture("/* nothing here */\n");
    const r = runGate(path);

    expect(r.status).toBe(2);
    expect(r.stderr).toContain("no CSS rules");
    expect(r.stderr).toContain("nothing was checked");
  });

  it("fails on a missing target and names the path it could not read", () => {
    const r = runGate("/nonexistent.css");

    expect(r.status).toBe(2);
    expect(r.stderr).toContain("/nonexistent.css");
    expect(r.stderr).toContain("must never report success");
  });
});
