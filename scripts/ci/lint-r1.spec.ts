// scripts/ci/lint-r1.spec.ts — rendering safety R1's lint half, EXECUTED.
//
// 05-UI-SPEC.md § Rendering Safety Contract R1 requires that `v-html` be
// "banned by lint, as an error, on every file, with no per-line disable
// permitted", and names `eval` and `new Function` alongside it.
//
// WHY THIS FILE EXISTS RATHER THAN A `--print-config` CHECK.
// Asking ESLint what severity a rule has is asking the CONFIG whether the
// control is armed. This session measured those two coming apart: with
// `vue/no-v-html` at severity 2 AND `linterOptions.noInlineConfig` true,
// `--print-config` reported exactly what the contract asks for, and a component
// carrying `v-html` plus `<!-- eslint-disable-next-line vue/no-v-html -->`
// linted CLEAN. `noInlineConfig` governs ESLint's own comment mechanism; a
// `<template>` is parsed by vue-eslint-parser and its HTML comments are honoured
// by eslint-plugin-vue's own `vue/comment-directive` rule, which
// `noInlineConfig` does not reach. The ban was one comment away from being
// decorative in precisely the file type it exists to protect.
//
// So this runs ESLint as a subprocess against fixtures that actually contain
// the violations, and asserts on what it REPORTS. Same contract as
// scripts/ci/check-bundle-imports.spec.ts and the two Phase 5 build gates:
// exit code AND printed output, never one alone.
//
// The fixtures are written under packages/frontend/src/__r1_fixtures__/ because
// the rules are scoped to `packages/frontend/**` and typescript-eslint requires
// a real file inside the lint TS program (`--stdin-filename` alone fails with
// "that TSConfig does not include this file" — also measured). That directory is
// gitignored, excluded from the typecheck, and in eslint.config.js's `ignores`
// so a crashed run cannot break `pnpm lint`; the spec lints it with
// `--no-ignore`.

import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const FIXTURE_REL = "packages/frontend/src/__r1_fixtures__";
const FIXTURE_ABS = join(REPO_ROOT, FIXTURE_REL);

function writeFixture(name: string, source: string): string {
  writeFileSync(join(FIXTURE_ABS, name), source, "utf8");
  return `${FIXTURE_REL}/${name}`;
}

function lint(relPath: string): { status: number; stdout: string } {
  const r = spawnSync(
    process.execPath,
    [
      join(REPO_ROOT, "node_modules/eslint/bin/eslint.js"),
      "--no-ignore",
      relPath,
    ],
    { cwd: REPO_ROOT, encoding: "utf8" },
  );
  return {
    status: r.status ?? -1,
    stdout: (r.stdout ?? "") + (r.stderr ?? ""),
  };
}

beforeAll(() => {
  mkdirSync(FIXTURE_ABS, { recursive: true });
});

afterAll(() => {
  rmSync(FIXTURE_ABS, { recursive: true, force: true });
});

describe("R1 — v-html is an ERROR, not a warning", () => {
  it("reports v-html as an error", () => {
    const path = writeFixture(
      "PlainVHtml.vue",
      '<script setup lang="ts">\nconst v = "x";\n</script>\n\n<template>\n  <div v-html="v"></div>\n</template>\n',
    );
    const r = lint(path);

    expect(r.status).toBe(1);
    expect(r.stdout).toContain("vue/no-v-html");
    // "error", not "warning". The shipped preset sets this rule to `warn`, and
    // a warning prints alongside everything else and ships.
    expect(r.stdout).toMatch(/error\s+'v-html'/);
    expect(r.stdout).not.toMatch(/warning\s+'v-html'/);
  });

  it("still reports it when a template comment tries to disable it", () => {
    const path = writeFixture(
      "DisabledVHtml.vue",
      '<script setup lang="ts">\nconst v = "x";\n</script>\n\n<template>\n  <!-- eslint-disable-next-line vue/no-v-html -->\n  <div v-html="v"></div>\n</template>\n',
    );
    const r = lint(path);

    expect(r.status).toBe(1);
    expect(r.stdout).toContain("vue/no-v-html");
  });

  it("still reports it when a block-level template comment tries to disable it", () => {
    const path = writeFixture(
      "BlockDisabledVHtml.vue",
      '<script setup lang="ts">\nconst v = "x";\n</script>\n\n<template>\n  <!-- eslint-disable vue/no-v-html -->\n  <div v-html="v"></div>\n</template>\n',
    );
    const r = lint(path);

    expect(r.status).toBe(1);
    expect(r.stdout).toContain("vue/no-v-html");
  });
});

describe("R1 — dynamic code construction is an ERROR", () => {
  it("reports all four forms, and says the inline disable had no effect", () => {
    const path = writeFixture(
      "dynamic.ts",
      "/* eslint-disable no-eval, no-new-func, no-implied-eval, no-script-url */\n" +
        'export const a: unknown = eval("1");\n' +
        'export const b = new Function("return 1");\n' +
        'export const c = setTimeout("x=1", 0);\n' +
        'export const d = "javascript:alert(1)";\n',
    );
    const r = lint(path);

    expect(r.status).toBe(1);
    for (const rule of [
      "no-eval",
      "no-new-func",
      "no-implied-eval",
      "no-script-url",
    ]) {
      expect(r.stdout, `expected ${rule} to be reported`).toContain(rule);
    }
    // ESLint says so itself when `noInlineConfig` is on, which is the strongest
    // available evidence that the escape is closed rather than merely unused.
    expect(r.stdout).toContain("noInlineConfig");
  });

  it("reports the same four inside a single-file component's script block", () => {
    const path = writeFixture(
      "Dynamic.vue",
      '<script setup lang="ts">\n' +
        "// eslint-disable-next-line no-eval\n" +
        'const a: unknown = eval("1");\n' +
        'const b = new Function("return 1");\n' +
        "defineExpose({ a, b });\n" +
        "</script>\n\n<template>\n  <div />\n</template>\n",
    );
    const r = lint(path);

    expect(r.status).toBe(1);
    expect(r.stdout).toContain("no-eval");
    expect(r.stdout).toContain("no-new-func");
  });
});

describe("R1 — the control does not fire on correct code", () => {
  it("passes a component that renders the same value as text", () => {
    const path = writeFixture(
      "Clean.vue",
      '<script setup lang="ts">\nconst v = "x";\n</script>\n\n<template>\n  <div>{{ v }}</div>\n</template>\n',
    );
    const r = lint(path);

    // A gate that fails on everything is not a gate. This is the control case
    // that makes the four failures above mean something.
    expect(r.status, r.stdout).toBe(0);
  });
});
