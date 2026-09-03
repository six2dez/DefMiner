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

import { THRESHOLD_IDS } from "../../../scripts/ci/gen-thresholds.mjs";

import * as T from "./thresholds";
import * as GENERATED from "./thresholds.generated";
// The generator's DECLARED id list. Importing it is what makes gate 2 mechanical:
// an id added to the generator without being added here — or the reverse — cannot
// pass. The module has no import-time side effects.

// Resolved from THIS FILE, explicitly, rather than by copying the bare relative
// literal the three Phase 0 specs use: those run from the repo root by
// construction, and this one lives three directories down.
const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const GO_NO_GO =
  REPO_ROOT + ".planning/phases/00-runtime-reality-check/results/go-no-go.json";
const GENERATOR = REPO_ROOT + "scripts/ci/gen-thresholds.mjs";
const GENERATED_FILE =
  REPO_ROOT + "packages/engine/src/thresholds.generated.ts";
/** This spec, read by the Pitfall 2 demotion case below — the same
 *  read-your-own-source idiom `telemetry.spec.ts`'s AST scan uses on the tree it
 *  polices. */
const THIS_FILE = fileURLToPath(import.meta.url);

const REGEN = "re-run `node scripts/ci/gen-thresholds.mjs`";

/**
 * The D-10 probe artifact, repo-relative — the derivation Phase 7's constants
 * cite BY PATH rather than by an imported symbol.
 *
 * It is deliberately NOT in `go-no-go.json`: `scripts/ci/gen-thresholds.mjs`
 * emits `thresholds.generated.ts` from that one file and gate 1 above
 * byte-compares the result, so a Phase 7 number there would mean either editing
 * a generated file or reopening a Phase 0 aggregate whose whole value is that it
 * describes 0.57.1.
 */
const MAP_BYTES_ARTIFACT =
  ".planning/phases/07-sourcemap-reconstruction/results/map-bytes.json";

/**
 * The per-RPC-call payload BUDGET, restated from
 * `tests/export-payload-budget.spec.ts:86`.
 *
 * A BUDGET, NOT A DISCOVERED LIMIT. It is copied rather than imported for one
 * reason: production code and the engine must not import from `tests/`, and this
 * spec lives in the engine workspace. The value is asserted against
 * `PASSIVE_MAX_BYTES` immediately below so the copy cannot drift silently — they
 * are deliberately the same 8 MiB figure.
 */
const MAX_RPC_PAYLOAD_BYTES = 8 * 1024 * 1024;

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
    const a = execFileSync(process.execPath, [GENERATOR, "--stdout"], {
      encoding: "utf8",
    });
    const b = execFileSync(process.execPath, [GENERATOR, "--stdout"], {
      encoding: "utf8",
    });
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
    expect(
      t,
      `go-no-go.json has no threshold "${id}" — re-run scripts/spike/aggregate.py`,
    ).toBeDefined();
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

  // --- THE CONVERGENCE INEQUALITY (P1-D7, twice superseded) -----------------
  //
  // A CHANGE TO PHASE 1 MACHINERY, DECLARED AS ONE, TWICE. Both superseded forms
  // are recorded because each was wrong in a different way and the second one
  // looked like a fix.
  //
  // FORM 1, through 2026-09-01: `RETENTION_SWEEP_MAX_ROWS >=
  // ROWS_INSERTED_PER_ARTIFACT_MAX * RETENTION_SWEEP_EVERY_N` — 512 >= 3 * 128.
  // Correct for as long as `ingest/consumer.ts`'s sweep interval advanced by ONE
  // per row-inserting iteration, because then "artifacts per interval" times
  // "rows per artifact" WAS "rows per interval". D-09 broke the right-hand side
  // by up to 521x: one artifact carrying monaco's real 781-source map inserts
  // `3 + 781 + 781 = 1,565` rows in a single iteration.
  //
  // FORM 2, 2026-09-02 (plan 07-05, Pitfall 2): the interval was changed to count
  // ROWS and the inequality restated as `RETENTION_SWEEP_MAX_ROWS >=
  // RETENTION_SWEEP_EVERY_N` — 512 >= 128 — claimed to hold "INDEPENDENTLY of how
  // many rows any single artifact produces".
  //
  // IT WAS NOT A CONVERGENCE PROOF (07-REVIEW.md HI-04). Convergence needs
  //
  //     rows deleted per interval >= rows inserted per interval
  //
  // and RETENTION_SWEEP_EVERY_N is not the insert side — it is the THRESHOLD at
  // which a pass becomes due. The sweep runs BETWEEN drain iterations, so the
  // rows inserted before a pass fires are whatever had accumulated below the
  // threshold PLUS everything the crossing iteration inserted. On the code's own
  // monaco example that is 1,565 in against 512 out: +1,053 rows per iteration,
  // monotonically, which is verbatim the failure the inequality exists to
  // prevent. The form was true and it bounded nothing.
  //
  // FORM 3, ASSERTED BELOW. The delete side is the CADENCE's budget rather than
  // one pass's, because the per-pass cap is held down by the 1024-row cost cap
  // and cannot be raised to 4,227 without breaking it. `ingest/consumer.ts`
  // repeats the bounded pass while the database says work remains, yielding
  // between passes, up to RETENTION_SWEEP_MAX_PASSES.
  //
  // THE CHECK NOW READS ROWS_INSERTED_PER_ARTIFACT_MAX AGAIN, DELIBERATELY, and
  // that reverses a demotion this spec asserted mechanically on 2026-09-02. The
  // demotion's premise was that "no constant multiplier relates artifacts to
  // rows" — which is true of a MULTIPLIER and false of the SUM the insert side
  // actually is: an iteration inserts the artifact's base rows PLUS its map's.
  // `ROWS_INSERTED_PER_ITERATION_MAX` is that sum, derived in `thresholds.ts`,
  // and the constant is load-bearing again as one of its two terms.

  it("the retention sweep CONVERGES against worst-case ingest", () => {
    // THE DELETE SIDE: what one cadence crossing may remove.
    const deletedPerInterval =
      T.RETENTION_SWEEP_MAX_ROWS * T.RETENTION_SWEEP_MAX_PASSES;

    // THE INSERT SIDE: what may be inserted before that crossing fires. Up to
    // RETENTION_SWEEP_EVERY_N rows sit below the threshold, and then ONE
    // iteration crosses it — and one iteration can insert
    // ROWS_INSERTED_PER_ITERATION_MAX.
    const insertedPerInterval =
      T.RETENTION_SWEEP_EVERY_N + T.ROWS_INSERTED_PER_ITERATION_MAX;

    expect(
      deletedPerInterval,
      `one cadence crossing may delete ${deletedPerInterval} rows ` +
        `(${T.RETENTION_SWEEP_MAX_ROWS} x ${T.RETENTION_SWEEP_MAX_PASSES}) ` +
        `against ${insertedPerInterval} that can be inserted before it fires ` +
        `(${T.RETENTION_SWEEP_EVERY_N} below the threshold + ` +
        `${T.ROWS_INSERTED_PER_ITERATION_MAX} from the crossing iteration). ` +
        `A sweep that deletes fewer rows per interval than the interval inserts ` +
        `bounds NOTHING: past the retention ceiling the database grows ` +
        `monotonically while the sweep runs exactly as designed (decision P1-D7, ` +
        `restated by 07-REVIEW.md HI-04).`,
    ).toBeGreaterThanOrEqual(insertedPerInterval);
  });

  it("the insert side is DERIVED from what one iteration can actually write", () => {
    // THE HALF THAT WENT MISSING TWICE, ASSERTED BY NAME so it cannot drift back
    // into being a threshold or an artifact count. One iteration inserts the
    // artifact's base rows PLUS its map's rows, and the map's rows are bounded by
    // SOURCE_ROWS_PER_MAP_MAX — which `parse.ts` now enforces IN ROWS, converting
    // the declared source count at D-05's two rows per source before comparing.
    //
    // THE FACTOR IS ONE, AND IT IS ASSERTED AS A NAMED QUANTITY RATHER THAN
    // WRITTEN INTO THE EXPRESSION (07-REVIEW.md MD-01). Through 2026-09-02 this
    // read `2 * SOURCE_ROWS_PER_MAP_MAX`, because the gate was documented in rows
    // and enforced in sources: the factor was the unit mismatch, not a choice.
    // Plan 07-14 fixed the gate first and retired the factor second, and this
    // assertion exists so the unit cannot come apart again silently — a gate that
    // reverted to counting sources would make MAP_ROWS_PER_SOURCE_ROW_BOUND 2
    // again and this line the place that says so.
    const MAP_ROWS_PER_SOURCE_ROW_BOUND = 1;
    expect(
      T.ROWS_INSERTED_PER_ITERATION_MAX,
      `ROWS_INSERTED_PER_ITERATION_MAX (${T.ROWS_INSERTED_PER_ITERATION_MAX}) is no ` +
        `longer ROWS_INSERTED_PER_ARTIFACT_MAX (${T.ROWS_INSERTED_PER_ARTIFACT_MAX}) + ` +
        `${MAP_ROWS_PER_SOURCE_ROW_BOUND} x SOURCE_ROWS_PER_MAP_MAX ` +
        `(${T.SOURCE_ROWS_PER_MAP_MAX}). The factor between the two is the UNIT ` +
        `RELATIONSHIP between the map gate and the insert bound: it is 1 exactly ` +
        `while \`absorb\` refuses on ROWS, and it was 2 while \`absorb\` refused on ` +
        `declared SOURCES. A factor that drifts without this line failing is MD-01 ` +
        `happening again.`,
    ).toBe(
      T.ROWS_INSERTED_PER_ARTIFACT_MAX +
        MAP_ROWS_PER_SOURCE_ROW_BOUND * T.SOURCE_ROWS_PER_MAP_MAX,
    );
    // AND IT DOMINATES THE THRESHOLD, which is the whole reason Form 2 failed:
    // if the crossing iteration could only insert less than the threshold, the
    // threshold WOULD have been the insert side.
    expect(T.ROWS_INSERTED_PER_ITERATION_MAX).toBeGreaterThan(
      T.RETENTION_SWEEP_EVERY_N,
    );
  });

  it("retiring the MD-01 factor made the inequality SLACKER, never tighter", () => {
    // THE ORDERING CLAIM, EXECUTED. The superseded comment predicted that fixing
    // MD-01 would make this factor 1 and the inequality "only slacker — it cannot
    // become false by that edit". That is the sentence plan 07-14 was held to, so
    // it is asserted rather than trusted: the superseded insert side is
    // recomputed here and the shipped one must be strictly smaller against the
    // same delete budget.
    const deletedPerInterval =
      T.RETENTION_SWEEP_MAX_ROWS * T.RETENTION_SWEEP_MAX_PASSES;
    const supersededInsertSide =
      T.RETENTION_SWEEP_EVERY_N +
      T.ROWS_INSERTED_PER_ARTIFACT_MAX +
      2 * T.SOURCE_ROWS_PER_MAP_MAX;
    const shippedInsertSide =
      T.RETENTION_SWEEP_EVERY_N + T.ROWS_INSERTED_PER_ITERATION_MAX;
    expect(
      shippedInsertSide,
      `the insert side is ${shippedInsertSide} against the superseded ` +
        `${supersededInsertSide}. Retiring the compensating factor must LOOSEN the ` +
        `inequality, because the gate it compensated for now refuses at half the ` +
        `rows it used to. An insert side that grew means the factor was retired ` +
        `while the gate still counted sources, which is the ordering HI-04 records ` +
        `as the failure.`,
    ).toBeLessThan(supersededInsertSide);
    // And both forms are satisfied, so the change never crossed the boundary.
    expect(deletedPerInterval).toBeGreaterThanOrEqual(supersededInsertSide);
    expect(deletedPerInterval).toBeGreaterThanOrEqual(shippedInsertSide);
  });

  it("the convergence check names every quantity the inequality is made of", () => {
    // MECHANICAL, IN THE SHAPE THE SUPERSEDED DEMOTION CHECK USED. An inequality
    // that quietly stopped reading one of its four terms would still evaluate to
    // `true` and would be asserting a weaker property than the one it claims —
    // which is exactly how Form 2 shipped. This reads THIS FILE and checks the
    // convergence case's own text.
    const source = readFileSync(THIS_FILE, "utf8");
    const start = source.indexOf(
      'it("the retention sweep CONVERGES against worst-case ingest"',
    );
    expect(start, "the convergence case was renamed").toBeGreaterThan(-1);
    const end = source.indexOf("\n  });", start);
    const body = source.slice(start, end);
    for (const term of [
      "RETENTION_SWEEP_MAX_ROWS",
      "RETENTION_SWEEP_MAX_PASSES",
      "RETENTION_SWEEP_EVERY_N",
      "ROWS_INSERTED_PER_ITERATION_MAX",
    ]) {
      expect(
        body.includes(term),
        `the convergence check no longer reads ${term}. All four are terms of ` +
          `the inequality; dropping one leaves an assertion that passes while ` +
          `bounding something narrower than it claims (07-REVIEW.md HI-04).`,
      ).toBe(true);
    }
    // Non-vacuity: the slice really is the case body.
    expect(body.length).toBeGreaterThan(200);
  });

  it("one retention PASS is still a bounded piece of work", () => {
    // THE COST HALF, UNCHANGED. Convergence is now satisfied by REPEATING a
    // bounded pass with a yield between passes rather than by raising this cap,
    // precisely so this assertion keeps holding: sixteen bounded stretches with
    // the event loop between them is not the long uninterruptible stretch the
    // bounded pass exists to prevent.
    expect(
      T.RETENTION_SWEEP_MAX_ROWS,
      `RETENTION_SWEEP_MAX_ROWS (${T.RETENTION_SWEEP_MAX_ROWS}) exceeds the 1024-row ` +
        `cost cap. Convergence and cost pull in opposite directions; raising the delete ` +
        `budget to satisfy convergence must not turn one pass into a long stretch that ` +
        `starves ingest. Raise RETENTION_SWEEP_MAX_PASSES instead.`,
    ).toBeLessThanOrEqual(1024);
  });

  it("the pass budget is a CEILING and is bounded in its own right", () => {
    // A budget that could grow without limit would make one cadence crossing an
    // unbounded amount of work again, by a different route.
    expect(T.RETENTION_SWEEP_MAX_PASSES).toBeGreaterThanOrEqual(1);
    expect(T.RETENTION_SWEEP_MAX_PASSES).toBeLessThanOrEqual(64);
  });

  it("ROWS_INSERTED_PER_ARTIFACT_MAX survives as the record of what changed", () => {
    // Kept, and kept CORRECT for what it still describes: an artifact carrying no
    // sourcemap inserts an `artifacts` row, an `observations` row and an
    // `analyses` row.
    expect(T.ROWS_INSERTED_PER_ARTIFACT_MAX).toBe(3);
  });

  // --- D-01's backpressure watermark (plan 06-03) ---------------------------
  //
  // THE INEQUALITY IS THE PROPERTY, not the number it currently evaluates to.
  // Asserting `SCAN_BACKPRESSURE_WATERMARK === 1528` would keep passing while
  // any of the three constants it hangs off moved underneath it — which is the
  // exact failure mode this whole file exists to close. Every figure below is
  // referenced by NAME.

  it("the backpressure watermark leaves room for a full measured burst on top of a full page", () => {
    expect(
      T.SCAN_BACKPRESSURE_WATERMARK +
        T.EVENTS_DELIVERED_UNDER_BLOCK +
        T.SCAN_PAGE_SIZE,
      `SCAN_BACKPRESSURE_WATERMARK (${T.SCAN_BACKPRESSURE_WATERMARK}) plus one measured ` +
        `live burst (EVENTS_DELIVERED_UNDER_BLOCK = ${T.EVENTS_DELIVERED_UNDER_BLOCK}) plus ` +
        `one scan page (SCAN_PAGE_SIZE = ${T.SCAN_PAGE_SIZE}) exceeds QUEUE_CAP ` +
        `(${T.QUEUE_CAP}). BoundedQueue.offer() drops the OLDEST entry at cap, and during a ` +
        `backfill the oldest entries are the operator's LIVE browsing — so a watermark above ` +
        `this bound means a retroactive scan can provably discard the traffic the operator is ` +
        `looking at right now, with the drop counter as the only trace (D-01, T-06-13).`,
    ).toBeLessThanOrEqual(T.QUEUE_CAP);
  });

  it("the backpressure watermark is strictly inside the queue", () => {
    // The non-vacuity half. The inequality above is satisfied by any watermark
    // at or below the bound INCLUDING zero and every negative value, and a
    // watermark of zero is a producer that never offers anything: a scan that
    // reports "running" for ever and walks nothing. Both ends are asserted so
    // that lowering QUEUE_CAP under EVENTS_DELIVERED_UNDER_BLOCK + SCAN_PAGE_SIZE
    // fails HERE rather than shipping a scan that cannot start.
    expect(
      T.SCAN_BACKPRESSURE_WATERMARK,
      `SCAN_BACKPRESSURE_WATERMARK is ${T.SCAN_BACKPRESSURE_WATERMARK}. QUEUE_CAP ` +
        `(${T.QUEUE_CAP}) no longer leaves room for a measured burst ` +
        `(${T.EVENTS_DELIVERED_UNDER_BLOCK}) plus a page (${T.SCAN_PAGE_SIZE}), so the ` +
        `derived watermark has fallen to or below zero and the producer would never offer a ` +
        `single page. Raise QUEUE_CAP or lower SCAN_PAGE_SIZE.`,
    ).toBeGreaterThan(0);
    expect(
      T.SCAN_BACKPRESSURE_WATERMARK,
      "SCAN_BACKPRESSURE_WATERMARK is at or above QUEUE_CAP, which makes the gate a no-op: " +
        "the producer would offer right up to the cap and every offer past it drops a live entry.",
    ).toBeLessThan(T.QUEUE_CAP);
  });

  it("POLICY_DERIVED_FROM names the three constants the watermark hangs off", () => {
    // Same shape as every other entry in that object, and it is what keeps the
    // derivation from decaying into a comment: the map is the machine-readable
    // copy of the paragraph above the constant.
    const derived = T.POLICY_DERIVED_FROM.SCAN_BACKPRESSURE_WATERMARK;
    expect(
      Object.keys(derived).sort(),
      "POLICY_DERIVED_FROM.SCAN_BACKPRESSURE_WATERMARK must name exactly QUEUE_CAP, " +
        "EVENTS_DELIVERED_UNDER_BLOCK and SCAN_PAGE_SIZE — the three values the derivation " +
        "reads. A derivation whose stated inputs differ from its real ones is worse than none.",
    ).toEqual(["EVENTS_DELIVERED_UNDER_BLOCK", "QUEUE_CAP", "SCAN_PAGE_SIZE"]);
    // BY REFERENCE, never by copied value — the rule CACHE_HIT_RATE's case states.
    expect(derived.QUEUE_CAP).toBe(T.QUEUE_CAP);
    expect(derived.EVENTS_DELIVERED_UNDER_BLOCK).toBe(
      T.EVENTS_DELIVERED_UNDER_BLOCK,
    );
    expect(derived.SCAN_PAGE_SIZE).toBe(T.SCAN_PAGE_SIZE);
  });

  // --- D-10's inline sourcemap bounds (plan 07-01) --------------------------
  //
  // SAME RULE AS THE WATERMARK BLOCK ABOVE: THE INEQUALITY IS THE PROPERTY, not
  // the number it currently evaluates to. `MAP_MAX_BYTES` is a MEASURED figure
  // rounded down, and asserting `=== 2_621_440` would keep passing while
  // PASSIVE_MAX_BYTES moved underneath it — which is the exact failure this file
  // exists to close. Every figure below is referenced BY NAME.

  it("MAP_MAX_BYTES stays inside the STRUCTURAL ceiling base64 imposes", () => {
    // The one assertion that goes red the day PASSIVE_MAX_BYTES is raised, which
    // is the only way O-01's composition can break.
    const ceiling = Math.floor((T.PASSIVE_MAX_BYTES * 3) / 4);
    expect(
      T.MAP_MAX_BYTES,
      `MAP_MAX_BYTES (${T.MAP_MAX_BYTES}) exceeds floor(PASSIVE_MAX_BYTES * 3/4) = ` +
        `${ceiling}. That ceiling is not a preference: base64 expands 4:3 and admit() ` +
        `refuses any body over PASSIVE_MAX_BYTES (${T.PASSIVE_MAX_BYTES}), so an INLINE ` +
        `map's decoded JSON cannot physically exceed it. A MAP_MAX_BYTES above the ` +
        `ceiling prices a case that cannot reach this code.`,
    ).toBeLessThanOrEqual(ceiling);
  });

  it("MAP_MAX_BYTES fits the project's own RPC payload budget", () => {
    // O-01's first required assertion. The budget is IMPORTED from the module
    // that owns it rather than restated as 8,388,608 — a copied number is a
    // number that drifts.
    expect(
      T.MAP_MAX_BYTES,
      `MAP_MAX_BYTES (${T.MAP_MAX_BYTES}) exceeds MAX_RPC_PAYLOAD_BYTES ` +
        `(${MAX_RPC_PAYLOAD_BYTES}). The raw \`mappings\` string is a JSON member of the ` +
        `map, so map <= budget bounds it with no chunked string transport and no new ` +
        `bound. TWO THINGS A READER MUST NOT TAKE FROM THIS PASSING: the 8 MiB figure is ` +
        `a BUDGET THIS PROJECT SETS, NOT A CEILING IT MEASURED FROM CAIDO — nothing in ` +
        `this repository can push bytes through Caido's RPC, so the real limit is ` +
        `live-only; and \`exportInventory\` already ships 7.00 MiB responses under exactly ` +
        `that assumption, so this residual is INHERITED by Phase 7 rather than created ` +
        `by it.`,
    ).toBeLessThanOrEqual(MAX_RPC_PAYLOAD_BYTES);
    // THE ANTI-DRIFT HALF. MAX_RPC_PAYLOAD_BYTES above is a COPY of the figure
    // tests/export-payload-budget.spec.ts:86 declares — the engine must not
    // import from tests/, so a copy is the only option. It cannot be allowed to
    // drift silently, and the two are deliberately the same 8 MiB number, so
    // asserting them equal is a free tripwire on the copy.
    expect(
      MAX_RPC_PAYLOAD_BYTES,
      `the MAX_RPC_PAYLOAD_BYTES copy in this file (${MAX_RPC_PAYLOAD_BYTES}) no longer ` +
        `equals PASSIVE_MAX_BYTES (${T.PASSIVE_MAX_BYTES}). The two are deliberately the ` +
        `same 8 MiB figure, and this spec cannot import the original from tests/. If the ` +
        `budget genuinely moved, update BOTH and say why; if PASSIVE_MAX_BYTES moved, ` +
        `this copy is now stale and the assertion above was checking the wrong number.`,
    ).toBe(T.PASSIVE_MAX_BYTES);
  });

  it("the tail window can never be narrower than the payload it must contain", () => {
    expect(
      T.SOURCEMAP_TAIL_WINDOW_BYTES,
      `SOURCEMAP_TAIL_WINDOW_BYTES (${T.SOURCEMAP_TAIL_WINDOW_BYTES}) is below ` +
        `ceil(MAP_MAX_BYTES * 4/3) = ${Math.ceil((T.MAP_MAX_BYTES * 4) / 3)}. For an ` +
        `EXTERNAL map the announcement sits 35-67 bytes from EOF (measured on babel, ` +
        `monaco and tfjs); for an INLINE map the marker sits payload_length + ~45 bytes ` +
        `from the end. A window narrower than the payload finds EVERY external ` +
        `announcement and NO inline one — every test passes, the D-03 counter climbs, ` +
        `and the phase ships recovering nothing (Pitfall 1).`,
    ).toBeGreaterThanOrEqual(Math.ceil((T.MAP_MAX_BYTES * 4) / 3));
  });

  it("the two base64 rounding directions OPPOSE, which is what makes the window safe", () => {
    // The subtle half, and the reason the derivation names both directions. The
    // ENCODE direction (decoded -> base64) must CEIL and the DECODE direction
    // (body -> decodable map) must FLOOR. Using floor on the encode side would
    // under-size the window by up to a byte at every size that is not a multiple
    // of three — a one-byte miss on a `lastIndexOf` is a total miss, not a
    // slightly worse result.
    const encode = (n: number) => Math.ceil((n * 4) / 3);
    const decode = (n: number) => Math.floor((n * 3) / 4);
    for (const n of [
      1,
      2,
      3,
      4,
      5,
      1023,
      T.MAP_MAX_BYTES,
      T.PASSIVE_MAX_BYTES,
    ]) {
      expect(
        decode(encode(n)),
        `the base64 round trip lost bytes at n = ${n}: encode(${n}) = ${encode(n)} and ` +
          `decode(${encode(n)}) = ${decode(encode(n))}, which is below ${n}. The encode ` +
          `direction must CEIL and the decode direction must FLOOR; using the same ` +
          `rounding for both under-sizes the window at every size that is not a multiple ` +
          `of three, and a one-byte miss on a lastIndexOf is a TOTAL miss.`,
      ).toBeGreaterThanOrEqual(n);
    }
    // And the ceiling itself is computed with the FLOOR direction, so the two
    // are consistent as a pair rather than merely each correct alone.
    expect(
      decode(T.PASSIVE_MAX_BYTES),
      "floor(PASSIVE_MAX_BYTES * 3/4) is not the structural ceiling the derivation " +
        "claims. The decode direction is what bounds a decoded map, and it floors.",
    ).toBe(Math.floor((T.PASSIVE_MAX_BYTES * 3) / 4));
  });

  it("the announcement prefix covers the longest legal spelling with margin", () => {
    // Non-vacuity for the window's second term. A prefix constant below the
    // real prefix would make the window one marker short of the payload, which
    // is the same total miss as an under-sized window.
    const longest =
      "//# sourceMappingURL=data:application/json;charset=utf-8;base64,".length;
    expect(
      T.ANNOUNCEMENT_PREFIX_MAX,
      `ANNOUNCEMENT_PREFIX_MAX (${T.ANNOUNCEMENT_PREFIX_MAX}) is below the longest legal ` +
        `announcement prefix (${longest} bytes for ` +
        `\`//# sourceMappingURL=data:application/json;charset=utf-8;base64,\`). ECMA-426 ` +
        `also permits the legacy \`//@\` spelling and whitespace between the marker and ` +
        `the URL, so the constant needs margin over that figure and not merely equality.`,
    ).toBeGreaterThan(longest);
  });

  it("SOURCE_LINE_COUNT_MAX's density argument is EXECUTABLE, not prose", () => {
    // MIN_CHARS_PER_LINE is declared HERE, in the spec, as the derivation's own
    // witness. It is not a shipped constant: nothing in production reads it, and
    // its only job is to make the line cap's argument something a machine
    // checks. Below this density a "source" is line noise a hostile map declared,
    // and saying so is more useful than rendering it (O-02's residual, UI-09).
    const MIN_CHARS_PER_LINE = 12.58;
    const ceiling = Math.floor((T.PASSIVE_MAX_BYTES * 3) / 4);
    expect(
      T.SOURCE_LINE_COUNT_MAX * MIN_CHARS_PER_LINE,
      `SOURCE_LINE_COUNT_MAX (${T.SOURCE_LINE_COUNT_MAX}) at ${MIN_CHARS_PER_LINE} ` +
        `characters per line projects to ` +
        `${Math.round(T.SOURCE_LINE_COUNT_MAX * MIN_CHARS_PER_LINE)} bytes, above the ` +
        `${ceiling}-byte decoded ceiling. Either the cap admits a file that cannot fit ` +
        `inside a map DefMiner will accept — in which case it bounds nothing — or the ` +
        `density witness is wrong. A file at this cap averaging UNDER ` +
        `${MIN_CHARS_PER_LINE} characters per line is line noise, not source.`,
    ).toBeLessThanOrEqual(ceiling);
    expect(
      T.SOURCE_LINE_COUNT_MAX,
      "SOURCE_LINE_COUNT_MAX is not positive, so the viewer would render nothing.",
    ).toBeGreaterThan(0);
  });

  it("SOURCE_ROWS_PER_MAP_MAX bounds a map at MAP_MAX_BYTES with headroom", () => {
    // MAP-06's aggregate limit, checked against the probe's OWN source density
    // rather than against a preference: the top ladder point carried 1,131
    // sources in 6,291,456 decoded bytes, and D-09 writes TWO rows per source.
    const SOURCES_PER_DECODED_BYTE = 1131 / 6_291_456;
    const ROWS_PER_SOURCE = 2; // one derived-source row, one sighting row
    const projected = Math.ceil(
      T.MAP_MAX_BYTES * SOURCES_PER_DECODED_BYTE * ROWS_PER_SOURCE,
    );
    expect(
      T.SOURCE_ROWS_PER_MAP_MAX,
      `SOURCE_ROWS_PER_MAP_MAX (${T.SOURCE_ROWS_PER_MAP_MAX}) is below the ~${projected} ` +
        `rows a map at MAP_MAX_BYTES (${T.MAP_MAX_BYTES}) projects to at the source ` +
        `density map-bytes.json measured (1,131 sources in 6,291,456 decoded bytes, two ` +
        `rows each under D-09). A cap below the typical case refuses ordinary maps and ` +
        `the aggregate limit stops being a limit and becomes the common path.`,
    ).toBeGreaterThanOrEqual(projected);
    expect(
      T.SOURCE_ROWS_PER_MAP_MAX,
      `SOURCE_ROWS_PER_MAP_MAX (${T.SOURCE_ROWS_PER_MAP_MAX}) is more than 4x the ` +
        `~${projected}-row typical case. MAP-06 asks for an AGGREGATE LIMIT; a cap with ` +
        `that much slack is not refusing anything a real map does, which means the ` +
        `1,000,000-source fixture is the only thing it stops and the retention argument ` +
        `it shares with Pitfall 2 has no margin left.`,
    ).toBeLessThanOrEqual(projected * 4);
  });

  it("POLICY_DERIVED_FROM cites the probe artifact BY PATH for every Phase 7 constant", () => {
    // What keeps the derivation from decaying into a comment. A reader who asks
    // where MAP_MAX_BYTES came from is one grep from the measurement, the schema
    // that validates it and the gate that fails when it is absent.
    for (const name of [
      "MAP_MAX_BYTES",
      "ANNOUNCEMENT_PREFIX_MAX",
      "SOURCEMAP_TAIL_WINDOW_BYTES",
      "SOURCE_LINE_COUNT_MAX",
      "SOURCE_ROWS_PER_MAP_MAX",
    ] as const) {
      const entry = (
        T.POLICY_DERIVED_FROM as Record<string, Record<string, unknown>>
      )[name];
      expect(
        entry,
        `POLICY_DERIVED_FROM has no entry for ${name}. Every Phase 7 constant is derived ` +
          `from one measurement and the map is the machine-readable copy of that claim.`,
      ).toBeDefined();
      expect(
        entry?.measured_in,
        `POLICY_DERIVED_FROM.${name} does not name ${MAP_BYTES_ARTIFACT}. These are the ` +
          `first entries whose measured term is a FILE PATH rather than an imported ` +
          `symbol — Phase 7's measurement is deliberately not in go-no-go.json, because ` +
          `gen-thresholds.mjs emits thresholds.generated.ts from that one artifact and ` +
          `gate 1 byte-compares the result. Naming the path is what keeps the derivation ` +
          `checkable anyway.`,
      ).toBe(MAP_BYTES_ARTIFACT);
    }
  });

  it("the derived window is DERIVED — by reference, never by a copied number", () => {
    // The rule CACHE_HIT_RATE's case states, applied to a computed constant:
    // recomputing the expression here proves the export is the expression's
    // value and not a literal that happens to match it today.
    expect(
      T.SOURCEMAP_TAIL_WINDOW_BYTES,
      "SOURCEMAP_TAIL_WINDOW_BYTES is not ceil(MAP_MAX_BYTES * 4/3) + " +
        "ANNOUNCEMENT_PREFIX_MAX. It must be COMPUTED from those two identifiers, never " +
        "written as the number they currently produce — Pitfall 1's whole argument is " +
        "that a chosen window silently breaks the inline path by two orders of magnitude.",
    ).toBe(Math.ceil((T.MAP_MAX_BYTES * 4) / 3) + T.ANNOUNCEMENT_PREFIX_MAX);
    expect(
      T.POLICY_DERIVED_FROM.SOURCEMAP_TAIL_WINDOW_BYTES.MAP_MAX_BYTES,
      "POLICY_DERIVED_FROM.SOURCEMAP_TAIL_WINDOW_BYTES does not carry MAP_MAX_BYTES by " +
        "reference.",
    ).toBe(T.MAP_MAX_BYTES);
  });

  it("the probe artifact exists and still reports the bound this constant was rounded from", () => {
    // THE TRIPWIRE. A policy constant citing an artifact that is gone, or that
    // now says something else, is a derivation nobody can check — which is the
    // state this whole file exists to make impossible. Deliberately an
    // INEQUALITY: the artifact's figure is a least-squares fit over four timing
    // points and moves a few percent per run, so the property is "the shipped
    // constant is at or below what was measured", not equality.
    const artifact = JSON.parse(
      readFileSync(REPO_ROOT + MAP_BYTES_ARTIFACT, "utf8"),
    );
    expect(
      artifact?.verdict?.map_max_bytes,
      `${MAP_BYTES_ARTIFACT} carries no verdict.map_max_bytes. Re-run ` +
        `\`bash scripts/phase7/map-bytes.sh\`.`,
    ).toBeGreaterThan(0);
    expect(
      T.MAP_MAX_BYTES,
      `MAP_MAX_BYTES (${T.MAP_MAX_BYTES}) is ABOVE the bound the probe artifact reports ` +
        `(${artifact?.verdict?.map_max_bytes}). The shipped constant is the measured ` +
        `figure ROUNDED DOWN to the nearest 512 KiB boundary — down, because the ` +
        `measurement is a least-squares fit over four timing points and a constant above ` +
        `it sits inside the fit's own noise on the WRONG side. If the probe now reports a ` +
        `lower bound, re-round rather than raising the constant.`,
    ).toBeLessThanOrEqual(artifact?.verdict?.map_max_bytes);
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

// ===========================================================================
// GATE 5 — THE DOCUMENTED DERIVATION, READ AS TEXT.
// ===========================================================================
// Gate 3 computes the convergence inequality FROM the constants, so it is
// structurally unable to fail when a SENTENCE about those constants goes stale.
// That blindness is not hypothetical. Commit `59347c3` (plan 07-14) retired the
// `2 *` compensating factor from ROWS_INSERTED_PER_ITERATION_MAX and updated one
// docblock, leaving the neighbouring RETENTION_SWEEP_MAX_PASSES derivation
// computing the pre-fix insert side in three sentences — and every wired gate
// stayed green for a full verification round (07-VERIFICATION.md WR-01).
//
// SO THIS GATE READS thresholds.ts's OWN SOURCE TEXT and compares the figures the
// passes docblock STATES against the figures the constants PRODUCE. It is the
// complement of gate 3, not a duplicate: gate 3 proves the inequality holds, this
// one proves the file says so correctly. Every expected figure is computed from an
// imported constant — a hand-written expectation would be the same second copy
// this gate exists to abolish.
//
// REGION SCOPING IS LOAD-BEARING. The superseded figures are CORRECT history
// inside ROWS_INSERTED_PER_ITERATION_MAX's commit-ordering paragraph later in the
// same file: that paragraph is the record of why the row-unit gate had to land
// BEFORE the factor was retired, and it legitimately names both the over-stated
// figure and the exact one. A file-wide absence check would therefore be wrong and
// unsatisfiable. The absence half is scoped to the passes docblock, and a
// companion assertion proves those same figures are STILL present in the iteration
// docblock — because an absence check with no non-vacuity guard passes on an empty
// region, which is the self-defeating gate this repository has already paid for.

/** The module this gate polices, repo-relative — `tests/corpus-maps.spec.ts`'s
 *  FIXTURE_MODULE habit, so the path appears once and every message can name it. */
const THRESHOLDS_MODULE = "packages/engine/src/thresholds.ts";

/** Thousands-separated, DERIVED from the number rather than written out.
 *  Deliberately not `toLocaleString`, whose grouping depends on the runtime's
 *  ICU data — this gate must compare the same string on every machine. */
function grouped(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
}

/** The source text BETWEEN two `export const` declarations. Slicing by
 *  declaration rather than by line number is what stops this gate rotting the
 *  first time somebody adds a paragraph above it. */
function region(fromDeclaration: string, toDeclaration: string): string {
  const source = readFileSync(REPO_ROOT + THRESHOLDS_MODULE, "utf8");
  const start = source.indexOf(fromDeclaration);
  const end = source.indexOf(toDeclaration);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(
      `${THRESHOLDS_MODULE} no longer contains "${fromDeclaration}" followed by ` +
        `"${toDeclaration}". This gate slices a docblock BETWEEN two declarations. ` +
        `If a declaration was renamed or reordered, update the anchors here — do ` +
        `not delete the assertion, which is the only thing reading this prose.`,
    );
  }
  return source.slice(start, end);
}

/** The RETENTION_SWEEP_MAX_PASSES docblock — the region whose prose this gate
 *  holds to the constants. */
function passesDocblock(): string {
  return region(
    "export const RETENTION_SWEEP_MAX_ROWS",
    "export const RETENTION_SWEEP_MAX_PASSES",
  );
}

/** ROWS_INSERTED_PER_ITERATION_MAX's docblock — where the superseded figures
 *  legitimately survive as history. Read ONLY for the non-vacuity half. */
function iterationDocblock(): string {
  return region(
    "export const SOURCE_ROWS_PER_MAP_MAX",
    "export const ROWS_INSERTED_PER_ITERATION_MAX",
  );
}

describe("the DOCUMENTED derivation matches the SHIPPED constants", () => {
  // THE SECOND COPY OF THIS FIGURE IS UNGUARDED, AND SAYING SO IS THE HONEST
  // OPTION. `packages/backend/src/store/retention.ts:178-180` states the same two
  // numbers this block pins — "512 x 16 = 8,192 against 128 + 2,051 = 2,179" — and
  // NO TEST READS THAT SENTENCE. This spec deliberately does not reach across the
  // workspace to read it: 07-REVIEW.md IN-04 records what a cross-package reach out
  // of `packages/backend` costs in the build graph, and the same caution applies in
  // this direction. So the two paragraphs are kept in agreement by a READER, not by
  // a machine. Naming an unguarded copy is more honest than guarding it badly — if
  // a figure below moves, `retention.ts` is the other place to edit by hand.

  // THE SHIPPED ARITHMETIC, recomputed from the imports exactly as gate 3
  // recomputes it, so no figure below is a literal anybody typed.
  const deleteSide = T.RETENTION_SWEEP_MAX_ROWS * T.RETENTION_SWEEP_MAX_PASSES;
  const insertSide =
    T.RETENTION_SWEEP_EVERY_N + T.ROWS_INSERTED_PER_ITERATION_MAX;
  const quotient = (insertSide / T.RETENTION_SWEEP_MAX_ROWS).toFixed(2);
  const smallestSatisfying = Math.ceil(insertSide / T.RETENTION_SWEEP_MAX_ROWS);
  const nextPowerOfTwo = 2 ** Math.ceil(Math.log2(smallestSatisfying));
  const headroom = (deleteSide / insertSide).toFixed(2);

  // THE INSERT SIDE AS IT READ BEFORE `59347c3`, PINNED AS THE HISTORICAL FIGURE
  // IT IS. 4,227 is what `RETENTION_SWEEP_EVERY_N + ROWS_INSERTED_PER_ARTIFACT_MAX
  // + 2 * SOURCE_ROWS_PER_MAP_MAX` evaluated to at that commit's parent, and it is
  // the figure `ROWS_INSERTED_PER_ITERATION_MAX`'s history paragraph records for
  // 2026-09-02.
  //
  // RECOMPUTING IT WAS THE PREVIOUS SHAPE HERE, AND IT WAS WRONG IN A WAY THAT
  // ONLY SHOWS THE DAY A CONSTANT MOVES. Re-measure `SOURCE_ROWS_PER_MAP_MAX` and
  // the presence half below would demand the NEW number be written into a
  // paragraph describing a day when the number was 4,227, while the absence half
  // would begin asserting the absence of a string that had never been in the
  // docblock — the exact "absence of an arbitrary string" failure the old comment
  // here said this gate existed to avoid. The drift detector would have become
  // the drift generator (07-UAT.md G-07-8).
  //
  // THE COINCIDENCE IS ASSERTED RATHER THAN ASSUMED, immediately below, so the
  // day it ends is a test failure carrying its own remedy instead of a silently
  // wrong demand. The SHIPPED figures above stay derived; only these two are
  // pinned.
  const SUPERSEDED_INSERT_SIDE_BEFORE_59347C3 = 4_227;
  const SUPERSEDED_QUOTIENT_BEFORE_59347C3 = "8.26";

  /** The remedy every message in this block ends with. The fix for a failure
   *  here is the PROSE — repairing a derivation by moving the constant to fit
   *  the words is the inverse of the fix. */
  const REMEDY =
    `The fix is the SENTENCE, not the constant: rewrite the ` +
    `RETENTION_SWEEP_MAX_PASSES docblock so it computes from the shipped insert ` +
    `side. 16 is retained headroom by deliberate decision and lowering it was ` +
    `considered and NOT approved (07-VERIFICATION.md WR-01).`;

  it("the superseded figures STILL equal what today's constants recompute, and when they stop it is THIS assertion that retires — not the history", () => {
    const recomputed =
      T.RETENTION_SWEEP_EVERY_N +
      T.ROWS_INSERTED_PER_ARTIFACT_MAX +
      2 * T.SOURCE_ROWS_PER_MAP_MAX;
    const recomputedQuotient = (
      recomputed / T.RETENTION_SWEEP_MAX_ROWS
    ).toFixed(2);
    expect(
      recomputed,
      `Today's constants recompute the pre-59347c3 insert side as ` +
        `${grouped(recomputed)}, but the pinned historical figure is ` +
        `${grouped(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3)}. THE LITERAL IS STILL ` +
        `CORRECT AND IT STAYS — it records what the insert side READ at 59347c3's ` +
        `parent, and ROWS_INSERTED_PER_ITERATION_MAX's docblock in ` +
        `${THRESHOLDS_MODULE} describes 2026-09-02, when the figure was ` +
        `${grouped(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3)}. Do NOT rewrite that ` +
        `history paragraph to ${grouped(recomputed)}: a paragraph describing a past ` +
        `day does not change because a constant moved today. What ended is the ` +
        `COINCIDENCE that today's constants happen to reproduce the historical ` +
        `figure. THE REMEDY IS TO RETIRE THIS ASSERTION, with a one-line note of ` +
        `the date and the new recomputed value, leaving the two literals, the ` +
        `absence half and the presence half exactly as they are.`,
    ).toBe(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3);
    expect(
      recomputedQuotient,
      `Today's constants recompute the pre-59347c3 quotient as ` +
        `${recomputedQuotient}, but the pinned historical figure is ` +
        `${SUPERSEDED_QUOTIENT_BEFORE_59347C3}. THE LITERAL IS STILL CORRECT AND IT ` +
        `STAYS — it is ${grouped(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3)} over ` +
        `RETENTION_SWEEP_MAX_ROWS (${T.RETENTION_SWEEP_MAX_ROWS}) as both stood ` +
        `before 59347c3. Do NOT rewrite ROWS_INSERTED_PER_ITERATION_MAX's history ` +
        `paragraph to the new figure; what ended is the COINCIDENCE, not the ` +
        `history. THE REMEDY IS TO RETIRE THIS ASSERTION, with a one-line dated ` +
        `note of the new recomputed value.`,
    ).toBe(SUPERSEDED_QUOTIENT_BEFORE_59347C3);
  });

  it("the passes docblock states the insert side, the quotient and the smallest satisfying integer that the constants actually produce", () => {
    const docblock = passesDocblock();
    const stated: readonly (readonly [string, string])[] = [
      [
        grouped(deleteSide),
        `the delete side — RETENTION_SWEEP_MAX_ROWS (${T.RETENTION_SWEEP_MAX_ROWS}) x ` +
          `RETENTION_SWEEP_MAX_PASSES (${T.RETENTION_SWEEP_MAX_PASSES})`,
      ],
      [
        grouped(insertSide),
        `the insert side — RETENTION_SWEEP_EVERY_N (${T.RETENTION_SWEEP_EVERY_N}) + ` +
          `ROWS_INSERTED_PER_ITERATION_MAX (${T.ROWS_INSERTED_PER_ITERATION_MAX})`,
      ],
      [
        `${grouped(insertSide)} / ${grouped(T.RETENTION_SWEEP_MAX_ROWS)} = ${quotient}`,
        "the quotient the choice of passes is derived from, to two decimal places",
      ],
      [
        `smallest integer that satisfies the inequality is ${smallestSatisfying}`,
        "the smallest integer that satisfies the inequality",
      ],
      [
        `next power of two above it is ${nextPowerOfTwo}`,
        "the next power of two above that integer",
      ],
      [`${headroom}x headroom`, "the headroom multiple the delete side buys"],
    ];

    for (const [figure, what] of stated) {
      expect(
        docblock,
        `The RETENTION_SWEEP_MAX_PASSES docblock in ${THRESHOLDS_MODULE} does not ` +
          `state "${figure}" — ${what}. The shipped constants produce ` +
          `${grouped(deleteSide)} >= ${grouped(insertSide)}, quotient ${quotient}, ` +
          `smallest satisfying integer ${smallestSatisfying}, next power of two ` +
          `${nextPowerOfTwo}, headroom ${headroom}x. ${REMEDY}`,
      ).toContain(figure);
    }
  });

  it("the passes docblock carries NONE of the figures the superseded insert side produced", () => {
    const docblock = passesDocblock();
    const retired: readonly (readonly [string, string])[] = [
      [
        grouped(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3),
        "the pre-59347c3 insert side, pinned as the historical figure it is rather " +
          "than recomputed from today's constants",
      ],
      [
        SUPERSEDED_QUOTIENT_BEFORE_59347C3,
        "the quotient that pinned historical insert side produced against " +
          "RETENTION_SWEEP_MAX_ROWS",
      ],
    ];

    for (const [figure, what] of retired) {
      expect(
        docblock,
        `The RETENTION_SWEEP_MAX_PASSES docblock in ${THRESHOLDS_MODULE} still ` +
          `states "${figure}" — ${what}. The shipped insert side is ` +
          `${grouped(insertSide)} with quotient ${quotient}, so this paragraph is ` +
          `computing a value the code retired. Do NOT keep the retired figure here ` +
          `as a history note: the history lives in ROWS_INSERTED_PER_ITERATION_MAX's ` +
          `commit-ordering paragraph, which the companion test below pins. ${REMEDY}`,
      ).not.toContain(figure);
    }
  });

  it("the superseded figures survive where they are CORRECT history, so the absence check cannot pass vacuously", () => {
    // WITHOUT THIS THE ABSENCE HALF ROTS. Delete the history paragraph and the
    // test above starts passing for the wrong reason — it would then be asserting
    // that a figure is missing from a file that no longer explains anything.
    const history = iterationDocblock();
    expect(
      history,
      `ROWS_INSERTED_PER_ITERATION_MAX's docblock in ${THRESHOLDS_MODULE} no longer ` +
        `names ${grouped(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3)}. That paragraph is the record of ` +
        `why 07-14's row-unit gate had to land BEFORE the \`2 *\` factor was ` +
        `retired — the gate first at ${grouped(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3)} (over-stated ` +
        `and therefore safe), the factor second at ${grouped(insertSide)} (exact). ` +
        `It is ALSO the reason the absence check above is scoped to a region rather ` +
        `than to the file. Restore the paragraph rather than relaxing the scope.`,
    ).toContain(grouped(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3));
    expect(
      history,
      `ROWS_INSERTED_PER_ITERATION_MAX's docblock no longer names the shipped ` +
        `insert side ${grouped(insertSide)} alongside the superseded ` +
        `${grouped(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3)}, so the ordering argument it makes can no ` +
        `longer be checked against the constants.`,
    ).toContain(grouped(insertSide));
  });
});
