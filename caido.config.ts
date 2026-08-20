import { defineConfig } from "@caido-community/dev";

/**
 * Tier-1 build configuration for the Phase 0 measurement probes.
 *
 * Tier 1 exists because for SPIKE-06 (and SPIKE-01 in plan 00-04) the BUILD
 * PIPELINE IS PART OF WHAT IS UNDER TEST. `@caido-community/dev@0.1.7` builds a
 * backend plugin with tsup at `target: "esnext"`, `config: false` and
 * `external: [/caido:.+/, "sqlite", ...builtinModules]` — so a dependency that
 * imports a Node built-in survives the build silently and fails only at runtime
 * on a user's machine. That is precisely the hazard DIST-05 exists to catch in
 * Phase 1, and measuring meriyah on a hand-rolled zip would measure the wrong
 * artifact.
 *
 * The schema is a `z.strictObject`: unknown keys are REJECTED and `version` must
 * be a three-part semver. Keep this minimal.
 *
 * `watch.port` is 3100 rather than the 3000 default so the probe's watch server
 * can never collide with a later DefMiner dev loop.
 *
 * Build entry is `<root>/src/index.ts`; output is `<root>/dist/index.js`; the
 * installable package lands at `dist/plugin_package.zip`.
 */
export default defineConfig({
  id: "defminer-tier1-parse",
  name: "DefMiner Tier-1 Parse Probe",
  description: "Phase 0 SPIKE-06 probe: meriyah, acorn and sourcemap-codec under measurement",
  version: "0.0.1",
  author: { name: "DefMiner" },
  watch: { port: 3100 },
  plugins: [
    // Plan 00-04 adds its re2js probe as a second entry in this array — one
    // line, same shape, a different `id` and `root`.
    { kind: "backend", id: "parse-probe", name: "Parse Probe", root: "tier1/parse" },
  ],
});
