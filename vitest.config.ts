import { defineConfig } from "vitest/config";

export default defineConfig({
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
