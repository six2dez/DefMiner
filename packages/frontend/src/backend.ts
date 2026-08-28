// The frontend's view of the backend RPC surface.
//
// DECLARED HERE, NOT IMPORTED FROM @defminer/backend. The frontend package
// deliberately has no dependency on the backend package: the backend imports
// `caido:*` module specifiers that only resolve inside Caido's QuickJS, so
// depending on it would drag an unresolvable module graph into a browser build
// and make the boundary a matter of discipline instead of a matter of
// resolution.
//
// This is the MINIMAL surface the tracer slice needs — one endpoint. The typed,
// versioned RPC contract built on `DefinePluginPackageSpec` (which replaces the
// deprecated `DefineAPI`/`DefineEvents` pair) is plan 05-07's job, and widening
// this file ahead of it would mean writing that contract twice.

import type { Caido } from "@caido/sdk-frontend";

/**
 * One artifact row exactly as `getArtifacts` returns it.
 *
 * Mirrors `ArtifactRow` in packages/backend/src/store/artifacts.ts — the column
 * list of `LIST_ARTIFACTS_SQL`, in its order. Every field is either
 * DefMiner-computed (`sha256`, `byte_len`, timestamps, `seen_count`) or drawn
 * from a closed DefMiner vocabulary (`kind`); none is free-form
 * target-controlled text. `sha256` is still rendered in `font-mono`, because it
 * is TARGET-DERIVED and the mono rule is about an operator's ability to tell
 * two near-identical strings apart, not about whether the value is trusted.
 */
export type ArtifactRow = {
  project_id: string;
  sha256: string;
  byte_len: number;
  kind: string;
  first_seen_at: number;
  last_seen_at: number;
  seen_count: number;
};

/**
 * The backend endpoints this plan consumes.
 *
 * `getArtifacts` is already shipped and already registered
 * [packages/backend/src/index.ts — `sdk.api.register("getArtifacts", …)`]. It
 * returns `[]` rather than throwing when no project is resolved, which is what
 * lets the page mount before a project exists.
 */
export type DefMinerEndpoints = {
  getArtifacts: () => Promise<ArtifactRow[]>;
};

/** The Caido frontend SDK, parameterised with DefMiner's own endpoints. */
export type DefMinerSDK = Caido<DefMinerEndpoints>;

/** The injection key the root component provides the SDK under. */
export const SDK_INJECTION_KEY = "sdk";
