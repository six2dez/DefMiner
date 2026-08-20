#!/usr/bin/env node
// scripts/ci/gen-thresholds.mjs — generate packages/engine/src/thresholds.generated.ts
// from the Phase 0 exit artifact.
//
// 00-GO-NO-GO.md:26-32 requires that every tunable constant in DefMiner import
// its value from go-no-go.json and be asserted equal to it by a test in this
// workspace. Hand-copying satisfies the letter and not the spirit: a copied
// number drifts silently the first time somebody tunes it to make a test pass.
// So the measured set is GENERATED, and packages/engine/src/thresholds.spec.ts
// re-runs this generator and asserts byte-equality with the committed file.
// A hand edit to the generated file therefore fails CI (decision P1-D4).
//
// Determinism is a hard requirement, because the drift gate compares bytes:
// ids are emitted in a fixed sorted order, values are rendered by a total
// function, line endings are LF, and NOTHING here reads the clock or the
// environment.
//
// Usage:
//   node scripts/ci/gen-thresholds.mjs            # write the file
//   node scripts/ci/gen-thresholds.mjs --stdout   # render to stdout (the drift gate)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Resolved relative to THIS FILE, never from process.cwd(): the generator is run
// from the repo root by pnpm, from a spec file by vitest, and potentially from a
// package directory by a future script. Only the file-relative path is stable.
const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const GO_NO_GO_PATH =
  REPO_ROOT + ".planning/phases/00-runtime-reality-check/results/go-no-go.json";
export const OUT_PATH =
  REPO_ROOT + "packages/engine/src/thresholds.generated.ts";

// THE DECLARED ID LIST. The generated file exports exactly these names and no
// others; thresholds.spec.ts asserts the export-name set equals this list, so
// neither a silent addition nor a silent drop can pass review.
//
// Sorted, because the sort IS the emission order and a stable order is what
// makes the byte-equality gate meaningful.
export const THRESHOLD_IDS = [
  "AST_MAX_BYTES",
  "BODY_LENGTH_EQUALS_RAW_LENGTH",
  "BODY_STORED_DECOMPRESSED",
  "CACHED_RESPONSES_REACH_HOOK",
  "CACHE_CROSS_DAY_DENOMINATOR",
  "CACHE_HIT_RATE_ASSUMED",
  "CACHE_HIT_RATE_CROSS_DAY",
  "CACHE_SAMPLE_DAYS",
  "EVENTS_DELIVERED_UNDER_BLOCK",
  "EVENT_OVERFLOW_BEHAVIOUR",
  "HANDLER_ERROR_SURFACED",
  "HARD_MAX_BYTES",
  "MAX_SYNC_SLICE_MS",
  "MULTISTATEMENT_EXEC_ATOMIC",
  "PRAGMA_PERSISTS_ACROSS_EXEC",
  "REDOS_RECOVERY",
  "RSS_BYTES_PER_INPUT_BYTE",
  "SIZE_GATE_SOURCE",
  "STATUS_304_REACHES_HOOK",
  "SURFACES_FIRING_INTERCEPT",
  "TEXTDECODER_MODULE",
  "TOKENIZER_MS_PER_MB",
  "TRANSACTION_PERSISTS_ACROSS_EXEC",
  "WAL_ENABLED",
  "YIELD_COST_MS",
  "YIELD_PRIMITIVE",
];

/** Render one threshold value as a TypeScript literal. Total over the shapes
 *  go-no-go.json actually contains: number, string, boolean and null. */
function literal(value, id) {
  if (value === null) return "null";
  switch (typeof value) {
    case "number":
      if (!Number.isFinite(value)) throw new Error(`${id}: non-finite number`);
      return String(value);
    case "boolean":
      return value ? "true" : "false";
    case "string":
      return JSON.stringify(value);
    default:
      throw new Error(
        `${id}: unsupported threshold value type ${typeof value}`,
      );
  }
}

export function render(goNoGo) {
  const th = goNoGo.thresholds ?? {};
  const lines = [
    "// GENERATED FILE — DO NOT EDIT BY HAND.",
    "//",
    "// Written by scripts/ci/gen-thresholds.mjs from",
    "// .planning/phases/00-runtime-reality-check/results/go-no-go.json.",
    "//",
    "// To change a value here you must re-measure the spike that produced it and",
    "// re-run the Phase 0 aggregation; then run:",
    "//",
    "//     node scripts/ci/gen-thresholds.mjs",
    "//",
    "// packages/engine/src/thresholds.spec.ts re-runs the generator and compares",
    "// bytes, so a hand edit to this file fails CI rather than silently",
    "// redefining a measured budget (decision P1-D4).",
    "",
    `// Every value below was measured on Caido ${goNoGo.caido_version}. The Caido version is`,
    "// deliberately a COMMENT and not an export: the exported name set is exactly the",
    "// declared threshold id list, and thresholds.spec.ts asserts that equality.",
    "",
  ];

  for (const id of THRESHOLD_IDS) {
    const t = th[id];
    if (t === undefined) {
      throw new Error(
        `go-no-go.json has no threshold "${id}". Either the aggregate is stale ` +
          `(re-run scripts/spike/aggregate.py) or the id list in this generator is wrong.`,
      );
    }
    lines.push(
      `export const ${id} = ${literal(t.value, id)};` +
        ` // ${t.spike} · ${t.status ?? "no-status"} · confidence ${t.confidence}`,
    );
  }

  // LF endings, single trailing newline. Both are part of the byte contract.
  return lines.join("\n") + "\n";
}

export function generate() {
  return render(JSON.parse(readFileSync(GO_NO_GO_PATH, "utf8")));
}

// Only when executed as a program — importing this module from the spec must
// have no side effects.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = generate();
  if (process.argv.includes("--stdout")) {
    process.stdout.write(out);
  } else {
    writeFileSync(OUT_PATH, out);
    process.stderr.write(
      `wrote ${OUT_PATH} (${THRESHOLD_IDS.length} thresholds)\n`,
    );
  }
}
