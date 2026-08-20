import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // tests/ is the only include root. Phase 0 ships measurement artifacts, not
    // product code, so every gate here is an artifact assertion over
    // .planning/phases/00-runtime-reality-check/results/.
    include: ["tests/**/*.spec.ts"],
    // Spike gates read and validate result files; 120 s leaves headroom for a
    // slow filesystem without ever masking a genuinely hung assertion.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    reporters: ["default"],
  },
});
