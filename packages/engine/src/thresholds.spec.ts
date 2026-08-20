// packages/engine/src/thresholds.spec.ts — THE PHASE 0 EXIT CONTRACT, MECHANISED.
//
// 00-GO-NO-GO.md:26-32, in its own words: "Every tunable constant in the engine
// imports its value from go-no-go.json and is asserted equal to it by a test in
// the SDK-free engine workspace. A developer who tunes a constant without
// re-measuring fails CI." And: "a constant copied into source drifts silently the
// first time someone tunes it to make a test pass; a constant imported and
// asserted cannot."
//
// Four gates:
//   1  DRIFT       — re-run the generator and compare BYTES.
//   2  EQUALITY    — every export equals go-no-go.json's value for its id, and the
//                    export-name SET is exactly the declared id list.
//   3  DERIVATION  — every POLICY constant still satisfies the inequality it was
//                    derived from.
//   4  TRIPWIRE    — Broken Window #6: fail the day the cross-day cache rate
//                    becomes measurable, so nobody keeps budgeting against a
//                    placeholder that has been superseded.
//
// FAIL, NEVER SKIP — the doctrine tests/go-no-go.spec.ts establishes. A skipped
// assertion on this file is indistinguishable from a passing one at the point
// where it matters, which is eleven phases downstream. Every assertion carries a
// remedy string as its second argument.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as GENERATED from "./thresholds.generated";
import * as T from "./thresholds";
// The generator's DECLARED id list. Importing it is what makes gate 2 mechanical:
// an id added to the generator without being added here — or the reverse — cannot
// pass. The module has no import-time side effects.
import { THRESHOLD_IDS } from "../../../scripts/ci/gen-thresholds.mjs";

// Resolved from THIS FILE, explicitly, rather than by copying the bare relative
// literal the three Phase 0 specs use: those run from the repo root by
// construction, and this one lives three directories down.
const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const GO_NO_GO = REPO_ROOT + ".planning/phases/00-runtime-reality-check/results/go-no-go.json";
const GENERATOR = REPO_ROOT + "scripts/ci/gen-thresholds.mjs";
const GENERATED_FILE = REPO_ROOT + "packages/engine/src/thresholds.generated.ts";

const REGEN = "re-run `node scripts/ci/gen-thresholds.mjs`";

// Named as constants exactly as tests/go-no-go.spec.ts names them, so a rename in
// the aggregate breaks one line here rather than four string literals.
const CROSS_DAY = "CACHE_HIT_RATE_CROSS_DAY";
const SAMPLE_DAYS = "CACHE_SAMPLE_DAYS";
const DENOMINATOR = "CACHE_CROSS_DAY_DENOMINATOR";

const G = JSON.parse(readFileSync(GO_NO_GO, "utf8"));

describe("gate 1 — the generated file has not drifted from the generator", () => {
  it("regenerating produces byte-identical output", () => {
    const fresh = execFileSync(process.execPath, [GENERATOR, "--stdout"], {
      encoding: "utf8",
    });
    const committed = readFileSync(GENERATED_FILE, "utf8");
    expect(
      fresh,
      `packages/engine/src/thresholds.generated.ts does not match a fresh run of ` +
        `scripts/ci/gen-thresholds.mjs. This file is GENERATED — do not hand-edit it. ` +
        `If go-no-go.json legitimately changed, ${REGEN} and commit the result. If you ` +
        `were tuning a constant, re-measure the spike instead: that is the entire point ` +
        `of the Phase 0 import-and-assert contract (decision P1-D4).`,
    ).toBe(committed);
  });

  it("the generator is deterministic across runs", () => {
    const a = execFileSync(process.execPath, [GENERATOR, "--stdout"], { encoding: "utf8" });
    const b = execFileSync(process.execPath, [GENERATOR, "--stdout"], { encoding: "utf8" });
    expect(
      a,
      "scripts/ci/gen-thresholds.mjs produced different bytes on two consecutive runs — " +
        "the drift gate above is meaningless unless generation is deterministic. Look for " +
        "a timestamp, an unstable key order or a locale-dependent number format.",
    ).toBe(b);
  });
});

describe("gate 2 — every measured export traces to go-no-go.json", () => {
  it("the exported name set is EXACTLY the declared id list", () => {
    // Both directions in one assertion: a silent addition and a silent drop both
    // fail. Without this, a generator that emitted an extra export would satisfy
    // every per-id check below and still ship an unmeasured constant.
    expect(
      Object.keys(GENERATED).sort(),
      "the export set of thresholds.generated.ts differs from THRESHOLD_IDS in " +
        `scripts/ci/gen-thresholds.mjs. Add or remove the id in the generator's declared ` +
        `list and ${REGEN}; do not edit the generated file.`,
    ).toEqual([...THRESHOLD_IDS].sort());
  });

  it("the declared list is non-empty", () => {
    // Non-vacuity guard, in the habit of tests/schema.spec.ts: an empty list makes
    // every it.each below disappear and the suite pass having checked nothing.
    expect(
      THRESHOLD_IDS.length,
      "THRESHOLD_IDS is empty — this suite would pass having asserted nothing.",
    ).toBeGreaterThan(20);
  });

  it.each(THRESHOLD_IDS)("%s equals go-no-go.json", (id: string) => {
    const t = G.thresholds?.[id];
    expect(t, `go-no-go.json has no threshold "${id}" — re-run scripts/spike/aggregate.py`).toBeDefined();
    expect(
      (GENERATED as Record<string, unknown>)[id],
      `${id} does not match go-no-go.json's measured value. ${REGEN}.`,
    ).toBe(t.value);
  });

  it("thresholds.ts re-exports the measured set unchanged", () => {
    // The engine imports from thresholds.ts, not from the generated file, so the
    // re-export is the surface that actually has to be right.
    for (const id of THRESHOLD_IDS) {
      expect(
        (T as Record<string, unknown>)[id],
        `thresholds.ts shadows or drops the measured export ${id}. It must re-export ` +
          `the generated set unchanged and add only POLICY constants.`,
      ).toBe((GENERATED as Record<string, unknown>)[id]);
    }
  });
});

describe("gate 3 — every POLICY constant still satisfies its derivation", () => {
  it("PASSIVE_MAX_BYTES stays inside the measured hard ceiling", () => {
    expect(
      T.PASSIVE_MAX_BYTES,
      "PASSIVE_MAX_BYTES exceeds HARD_MAX_BYTES, the point at which Phase 0 measured " +
        "this runtime breaking. The admission ceiling is a policy BELOW the breaking " +
        "point, never at or above it.",
    ).toBeLessThanOrEqual(T.HARD_MAX_BYTES);
  });

  it("a ceiling-sized artifact projects under 1 GiB of RSS", () => {
    expect(
      T.PASSIVE_MAX_BYTES * T.RSS_BYTES_PER_INPUT_BYTE,
      `PASSIVE_MAX_BYTES (${T.PASSIVE_MAX_BYTES}) at the measured ` +
        `RSS_BYTES_PER_INPUT_BYTE (${T.RSS_BYTES_PER_INPUT_BYTE}) projects past 1 GiB of ` +
        `peak RSS INSIDE caido-cli. Caido's QuickJS sets no memory limit and runs under ` +
        `panic = "abort", so that is a host kill taking the operator's project data with ` +
        `it — not a slow scan. Lower PASSIVE_MAX_BYTES.`,
    ).toBeLessThan(1073741824);
  });

  it("QUEUE_CAP clears the measured burst with margin", () => {
    expect(
      T.QUEUE_CAP,
      `QUEUE_CAP (${T.QUEUE_CAP}) is below four times EVENTS_DELIVERED_UNDER_BLOCK ` +
        `(${T.EVENTS_DELIVERED_UNDER_BLOCK}). Caido delivered 499 events in a single ` +
        `20 ms burst after a 30 s block, so a cap near that figure reports our own ` +
        `under-sizing as if it were target-driven back-pressure (Pitfall 3).`,
    ).toBeGreaterThanOrEqual(T.EVENTS_DELIVERED_UNDER_BLOCK * 4);
  });

  it("QUEUE_CAP costs under 1 MiB at the entry size CORE-05 permits", () => {
    expect(
      T.QUEUE_CAP * 200,
      "at 200 bytes per entry the queue would cost more than 1 MiB. Either lower " +
        "QUEUE_CAP or check that Entry is still {id, bytes, kind} — the memory argument " +
        "for the cap evaporates the moment somebody adds headers to it (assumption A2).",
    ).toBeLessThan(1048576);
  });

  it("ARTIFACT_DEADLINE_MS exceeds a ceiling-sized walk at the measured rate", () => {
    const worstCaseMs = (T.PASSIVE_MAX_BYTES / 1048576) * T.TOKENIZER_MS_PER_MB;
    expect(
      T.ARTIFACT_DEADLINE_MS,
      `ARTIFACT_DEADLINE_MS (${T.ARTIFACT_DEADLINE_MS}) is below the ` +
        `${Math.round(worstCaseMs)} ms it costs to walk a PASSIVE_MAX_BYTES artifact at ` +
        `the measured TOKENIZER_MS_PER_MB. A deadline that routine work can hit stops ` +
        `being an anomaly signal.`,
    ).toBeGreaterThanOrEqual(worstCaseMs);
  });

  it("the retention sweep CONVERGES against worst-case ingest", () => {
    expect(
      T.RETENTION_SWEEP_MAX_ROWS,
      `RETENTION_SWEEP_MAX_ROWS (${T.RETENTION_SWEEP_MAX_ROWS}) is below ` +
        `ROWS_INSERTED_PER_ARTIFACT_MAX * RETENTION_SWEEP_EVERY_N ` +
        `(${T.ROWS_INSERTED_PER_ARTIFACT_MAX} * ${T.RETENTION_SWEEP_EVERY_N} = ` +
        `${T.ROWS_INSERTED_PER_ARTIFACT_MAX * T.RETENTION_SWEEP_EVERY_N}). A sweep that ` +
        `deletes fewer rows per interval than the interval inserts bounds NOTHING: past ` +
        `the retention ceiling the database grows monotonically while the sweep runs ` +
        `exactly as designed (decision P1-D7).`,
    ).toBeGreaterThanOrEqual(T.ROWS_INSERTED_PER_ARTIFACT_MAX * T.RETENTION_SWEEP_EVERY_N);
  });

  it("one retention sweep pass stays a bounded piece of work", () => {
    expect(
      T.RETENTION_SWEEP_MAX_ROWS,
      `RETENTION_SWEEP_MAX_ROWS (${T.RETENTION_SWEEP_MAX_ROWS}) exceeds the 1024-row ` +
        `cost cap. Convergence and cost pull in opposite directions; raising the delete ` +
        `budget to satisfy convergence must not turn one pass into a long stretch that ` +
        `starves ingest. Lower RETENTION_SWEEP_EVERY_N instead.`,
    ).toBeLessThanOrEqual(1024);
  });

  it("CACHE_HIT_RATE takes the assumed value and never a literal", () => {
    expect(
      T.CACHE_HIT_RATE,
      "CACHE_HIT_RATE must be CACHE_HIT_RATE_ASSUMED by reference, never a copied " +
        "number. Writing the literal makes the placeholder invisible the day the real " +
        "cross-day measurement lands.",
    ).toBe(T.CACHE_HIT_RATE_ASSUMED);
  });
});

describe("gate 4 — Broken Window #6 tripwire", () => {
  it("the cross-day cache hit rate is still inconclusive", () => {
    expect(
      G.thresholds[CROSS_DAY].value,
      `${CROSS_DAY} is no longer null. CACHE_HIT_RATE must stop using the pessimistic ` +
        `default — see the tripwire below.`,
    ).toBeNull();
    expect(
      G.thresholds[CROSS_DAY].status,
      `${CROSS_DAY}.status is no longer "inconclusive".`,
    ).toBe("inconclusive");
  });

  it("fails loudly the moment the real cross-day rate becomes measurable", () => {
    // Not a skip and not a console warning. The whole failure mode this guards is
    // somebody budgeting for eleven phases against a placeholder that was
    // superseded months earlier.
    if (
      G.thresholds[SAMPLE_DAYS].value >= 2 &&
      G.thresholds[DENOMINATOR].value > 0
    ) {
      expect.fail(
        `${CROSS_DAY} is now measurable: ${SAMPLE_DAYS} = ` +
          `${G.thresholds[SAMPLE_DAYS].value} and ${DENOMINATOR} = ` +
          `${G.thresholds[DENOMINATOR].value}. Re-run scripts/spike/aggregate.py and ` +
          `scripts/spike/render-go-no-go.py, ${REGEN}, and switch CACHE_HIT_RATE in ` +
          `packages/engine/src/thresholds.ts off CACHE_HIT_RATE_ASSUMED onto the ` +
          `measured ${CROSS_DAY}. Then close Broken Window #6.`,
      );
    }
    expect(G.thresholds[DENOMINATOR].value).toBe(0);
  });
});
