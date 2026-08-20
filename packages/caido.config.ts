import { defineConfig } from "@caido-community/dev";

/**
 * DefMiner's OWN build config (decision P1-D2).
 *
 * The root `caido.config.ts` is the Phase 0 tier-1 probe build and is NOT touched
 * by Phase 1: keeping a separate config here means DefMiner's package never
 * bundles the `parse-probe` and `redos-probe` backends, and its zip never collides
 * with theirs at the repo root's `dist/plugin_package.zip`.
 *
 * WHY THIS FILE LIVES AT `packages/` AND NOT AT `packages/backend/`.
 * `@caido-community/dev@0.1.7` resolves the plugin `root` relative to the build
 * CWD and then, AFTER tsup has written `<root>/dist/index.js`, deletes
 * `<cwd>/dist` wholesale before copying that file into the package directory
 * (dist/cli.js:528-541 and 171-176). When `root` is `"."` those two paths are the
 * same directory, so the build deletes its own output and fails with ENOENT —
 * verified against 0.1.7 this session. Putting the config one level up makes the
 * two paths distinct: tsup writes `packages/backend/dist/index.js` and the package
 * is assembled under `packages/dist/`.
 *
 * Build with:  pnpm exec caido-dev build packages
 *
 * The schema is a `z.strictObject` — unknown keys are REJECTED and `version` must
 * be three-part semver. Keep this minimal; do not invent keys.
 */
export default defineConfig({
  id: "defminer",
  name: "DefMiner",
  description: "Passive JavaScript analysis for Caido — Phase 1 skeleton",
  version: "0.1.0",
  author: { name: "DefMiner" },
  plugins: [
    {
      kind: "backend",
      id: "defminer-backend",
      name: "DefMiner Backend",
      root: "backend",
    },
  ],
});
