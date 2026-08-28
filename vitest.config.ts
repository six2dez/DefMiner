import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Single-file components are compiled for the specs the same way they are
  // compiled for the build. Without this plugin `import App from "./App.vue"`
  // is a syntax error inside vitest and every frontend component spec fails to
  // collect — which reads as "no tests" rather than as "broken toolchain".
  //
  // Top level, NOT inside a per-project config: see the P2-D4 note below.
  plugins: [vue()],
  test: {
    // EXTENDED by Phase 1, never regenerated. `tests/**/*.spec.ts` stays FIRST and
    // unchanged: it is where the three Phase 0 exit gates live, and Pitfall 7 is a
    // restructure that quietly leaves `pnpm test` green while running zero of them.
    // The pre-change baseline was 3 files / 72 assertions and is asserted as a
    // number in 01-01-SUMMARY.md, not by eye.
    //
    // NO `projects` or `workspace` key, and no per-package vitest config
    // (decision P2-D4). Five files in this repo — tests/schema.spec.ts,
    // tests/spike-results.spec.ts, tests/go-no-go.spec.ts, scripts/spike/instance.sh
    // and scripts/spike/probe-run.sh — resolve the Phase 0 results directory from a
    // bare relative literal, so a per-project root would break all five at once.
    //
    // That constraint survived Phase 5's frontend, which needs a DIFFERENT
    // environment (jsdom) for a SUBSET of files — the obvious lever for which
    // was `environmentMatchGlobs`, removed in vitest 4. The frontend component
    // specs therefore each carry a `// @vitest-environment jsdom` docblock on
    // their first line. One line per file, and no project roots to break.
    include: [
      "tests/**/*.spec.ts",
      "packages/*/src/**/*.spec.ts",
      "scripts/ci/**/*.spec.ts",
    ],
    // Spike gates read and validate result files; 120 s leaves headroom for a
    // slow filesystem without ever masking a genuinely hung assertion.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    reporters: ["default"],
  },
});
