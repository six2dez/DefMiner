// The frontend's view of the backend RPC surface.
//
// DECLARED HERE, NOT IMPORTED FROM @defminer/backend. The frontend package
// deliberately has no dependency on the backend package: the backend imports
// `caido:*` module specifiers that only resolve inside Caido's QuickJS, so
// depending on it would drag an unresolvable module graph into a browser build
// and make the boundary a matter of discipline instead of a matter of
// resolution.
//
// WHAT IS LEFT HERE, AND WHY. This file carried a one-endpoint SDK surface for
// the tracer slice and said so, adding that "the typed, versioned RPC contract
// ... is plan 05-07's job, and widening this file ahead of it would mean writing
// that contract twice". That contract landed in `src/api/client.ts`, and plan
// 05-09 wired the page to it, so the narrow pair is gone (see below). What
// remains is the ROW SHAPE — declared here, not imported, for the resolution
// reason above.

import type { ScanState } from "@defminer/engine/contract";

/**
 * One artifact row exactly as the paged read returns it.
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
  /**
   * The state of the artifact's NEWEST analysis, or `null` when it has never
   * been analysed.
   *
   * NOT A COLUMN OF `artifacts` — the backend reads it beside the row and says
   * so (`ArtifactPageRow` in packages/backend/src/store/reads.ts). `null` is a
   * REAL STATE and not a missing value: a sighting writes the artifact row
   * before any analysis is claimed. It is rendered as NOTHING (P5-D66), never
   * as "Complete", which is the silence UI-09 forbids.
   */
  scan_state: ScanState | null;
};

// `DefMinerEndpoints` AND `DefMinerSDK` ARE GONE, AND THIS FILE'S OWN HEADER
// ASKED FOR THAT. It said the one-endpoint surface was "the MINIMAL surface the
// tracer slice needs" and that "the typed, versioned RPC contract ... is plan
// 05-07's job, and widening this file ahead of it would mean writing that
// contract twice". 05-07 landed it: `src/api/client.ts` declares
// `DefMinerBackendSdk` — the structural slice of the SDK the client actually
// touches (P5-D41) — over request and response types imported from
// @defminer/engine/contract, which the backend's own api/spec.ts imports too.
//
// Plan 05-09 wired App.vue to that client and removed the tracer's inline
// rendering, so the narrow pair had no consumer left. Deleted rather than kept
// as a harmless alias: a second description of the RPC surface is a second thing
// to drift, and knip (exports: error) reports it rather than letting it sit.
//
// `ArtifactRow` STAYS. It is the row shape both `api/client.ts` and the
// artifacts table read, and it is declared HERE rather than imported from the
// backend for the resolution reason above.

/** The injection key the root component provides the SDK under. */
export const SDK_INJECTION_KEY = "sdk";
