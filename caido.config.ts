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
    { kind: "backend", id: "parse-probe", name: "Parse Probe", root: "tier1/parse" },
    // Plan 00-04's SPIKE-01 probe. Tier 1 for the same reason `parse-probe` is:
    // `re2js` is a real npm dependency and the build pipeline is part of what is
    // under test. Both backends ship in ONE package, so installing it installs
    // both — which is fine here because SPIKE-01's "does a SECOND plugin keep
    // working during the hang" question is answered with `probe/tier0-core`, a
    // separate package with its own executor.
    { kind: "backend", id: "redos-probe", name: "ReDoS Probe", root: "tier1/redos" },
    // Plan 07-01's D-10 probe (MAP-01/MAP-02). Tier 1 for the third time and
    // for the same reason: the number it produces — `MAP_MAX_BYTES` — has to be
    // measured INSIDE Caido, through the build pipeline that actually ships,
    // and no Phase 0 constant substitutes (SPIKE-06 measures no `JSON.parse`
    // at all).
    //
    // APPENDED, NEVER INSERTED. `scripts/spike/probe-run.sh` resolves
    // `backends[0]` from the install response, so `parse-probe` must stay at
    // index 0 or a re-run of scripts/spike/ladder.sh would silently call
    // `measure` on the wrong backend. probe-run.sh is Phase 0's and is not
    // modified; scripts/phase7/map-bytes.sh resolves ITS backend explicitly by
    // calling `mapbytes_info` against each installed id.
    { kind: "backend", id: "mapbytes-probe", name: "Map Bytes Probe", root: "tier1/mapbytes" },
  ],
});
