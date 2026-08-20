// GENERATED FILE — DO NOT EDIT BY HAND.
//
// Written by scripts/ci/gen-thresholds.mjs from
// .planning/phases/00-runtime-reality-check/results/go-no-go.json.
//
// To change a value here you must re-measure the spike that produced it and
// re-run the Phase 0 aggregation; then run:
//
//     node scripts/ci/gen-thresholds.mjs
//
// packages/engine/src/thresholds.spec.ts re-runs the generator and compares
// bytes, so a hand edit to this file fails CI rather than silently
// redefining a measured budget (decision P1-D4).

// Every value below was measured on Caido 0.57.1. The Caido version is
// deliberately a COMMENT and not an export: the exported name set is exactly the
// declared threshold id list, and thresholds.spec.ts asserts that equality.

export const AST_MAX_BYTES = 1334405; // SPIKE-06 · resolved · confidence HIGH
export const BODY_LENGTH_EQUALS_RAW_LENGTH = true; // SPIKE-08 · resolved · confidence HIGH
export const BODY_STORED_DECOMPRESSED = true; // SPIKE-08 · resolved · confidence HIGH
export const CACHED_RESPONSES_REACH_HOOK = false; // SPIKE-11 · resolved · confidence HIGH
export const CACHE_CROSS_DAY_DENOMINATOR = 0; // SPIKE-10 · resolved · confidence HIGH
export const CACHE_HIT_RATE_ASSUMED = 0.4; // SPIKE-10 · no-status · confidence pessimistic-default
export const CACHE_HIT_RATE_CROSS_DAY = null; // SPIKE-10 · inconclusive · confidence LOW
export const CACHE_SAMPLE_DAYS = 1; // SPIKE-10 · resolved · confidence HIGH
export const EVENTS_DELIVERED_UNDER_BLOCK = 500; // SPIKE-03 · resolved · confidence HIGH
export const EVENT_OVERFLOW_BEHAVIOUR = "queue"; // SPIKE-03 · resolved · confidence HIGH
export const HANDLER_ERROR_SURFACED = "neither"; // SPIKE-03 · resolved · confidence HIGH
export const HARD_MAX_BYTES = 274736748; // SPIKE-06 · resolved · confidence HIGH
export const MAX_SYNC_SLICE_MS = 25; // SPIKE-02 · resolved · confidence HIGH
export const MULTISTATEMENT_EXEC_ATOMIC = true; // SPIKE-09 · resolved · confidence HIGH
export const PRAGMA_PERSISTS_ACROSS_EXEC = "connection-scoped and file-scoped PRAGMAs both survived"; // SPIKE-09 · resolved · confidence HIGH
export const REDOS_RECOVERY = "kill"; // SPIKE-01 · resolved · confidence HIGH
export const RSS_BYTES_PER_INPUT_BYTE = 102.112; // SPIKE-06 · resolved · confidence MEDIUM
export const SIZE_GATE_SOURCE = "Body.length (decompressed identity bytes)"; // SPIKE-08 · resolved · confidence HIGH
export const STATUS_304_REACHES_HOOK = true; // SPIKE-11 · resolved · confidence HIGH
export const SURFACES_FIRING_INTERCEPT = "proxy"; // SPIKE-05 · resolved · confidence HIGH
export const TEXTDECODER_MODULE = "none"; // SPIKE-07 · resolved · confidence HIGH
export const TOKENIZER_MS_PER_MB = 783; // SPIKE-06 · resolved · confidence HIGH
export const TRANSACTION_PERSISTS_ACROSS_EXEC = false; // SPIKE-09 · resolved · confidence HIGH
export const WAL_ENABLED = true; // SPIKE-09 · resolved · confidence HIGH
export const YIELD_COST_MS = 5.029; // SPIKE-02 · resolved · confidence HIGH
export const YIELD_PRIMITIVE = "setTimeout0"; // SPIKE-02 · resolved · confidence HIGH
