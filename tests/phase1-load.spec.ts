import { existsSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

// THE PHASE 1 LOAD GATE — success criterion 3, and criterion 4's live half.
//
// This file does not measure anything. `scripts/phase1/spa-load.sh` does, from
// OUTSIDE the plugin, because a starved thread cannot report that it is starved
// and this runtime exposes no scheduler introspection at all. What this file does
// is stop the recorded answer regressing quietly.
//
// FAIL, NEVER SKIP, and name the remedy in every message — the doctrine
// tests/go-no-go.spec.ts sets. An absent or unreadable artifact must fail here
// rather than pass vacuously.
//
// THE ZERO RULE. `max_slice_ms` of 0 FAILS. A plugin that never blocked the
// thread and an instrument that measured nothing produce the same number, and
// only one of them is good news — so the reading that costs nothing to be wrong
// about is treated as the instrument having failed. This is the assertion that
// detonates if `recordSlice(...)` is ever deleted from the consumer, at the
// latest and most expensive moment in the phase.
//
// EXPECT A SMALL HONEST NUMBER. Phase 1 has no detector, so `visit` is a no-op
// and the maximum synchronous slice genuinely is tiny — the live tracer recorded
// 0.023 ms. The deliverable is the instrument proven WIRED; the number becomes
// interesting in Phase 3, when `visit` is given work. A wide margin under the
// budget is not a failure, and a number suspiciously close to the budget on
// every run would be the instrument rather than the system.

const RESULT =
  ".planning/phases/01-skeleton-persistence-compatibility/results/spa-load.json";
const GO_NO_GO =
  ".planning/phases/00-runtime-reality-check/results/go-no-go.json";
const EXPECTED_CAIDO_VERSION = "0.57.1";
const REMEASURE = "re-run `bash scripts/phase1/spa-load.sh`";
const MIN_CHUNKS = 200;
const MIN_RPC_SAMPLES = 10;

/* eslint-disable @typescript-eslint/no-explicit-any --
   Both artifacts are plain recorded JSON with no shipped type. Declaring a
   parallel interface here would be a second, hand-maintained copy of a shape
   that a shell script writes — and the gate would then check the copy. */

function loadJson(path: string): any {
  const raw = readFileSync(path, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`${path} is not valid JSON: ${(err as Error).message}`);
  }
}

const d = existsSync(RESULT) ? loadJson(RESULT) : null;

/** Every string anywhere in the artifact, with its path. */
function strings(
  value: unknown,
  path = "$",
  out: Array<{ path: string; value: string }> = [],
): Array<{ path: string; value: string }> {
  if (typeof value === "string") out.push({ path, value });
  else if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      strings(v, `${path}.${k}`, out);
    }
  }
  return out;
}

describe("Phase 1 SPA-load artifact", () => {
  it("exists — success criterion 3 has no other answer", () => {
    expect(existsSync(RESULT), `${RESULT} missing — ${REMEASURE}`).toBe(true);
  });

  it("parses", () => {
    expect(d, `${RESULT} did not parse — ${REMEASURE}`).not.toBeNull();
  });

  // Two SEPARATE assertions, for two different failures. The first catches a
  // result recorded against the stale 0.55.3 that owns PATH on this machine. The
  // second catches an expectation quietly moved to match whatever happened to be
  // measured — so editing `expected_version` does not rescue the run.
  it("was measured against the build every Phase 0 threshold belongs to", () => {
    expect(
      d?.reported_version,
      `${RESULT}: expected_version does not match reported_version. Do not edit ` +
        `the file — ${REMEASURE} against the app-bundle binary.`,
    ).toBe(d?.expected_version);
    expect(
      d?.reported_version,
      `${RESULT}: reported_version is not ${EXPECTED_CAIDO_VERSION}. Bare ` +
        `\`caido-cli\` on PATH resolves to a stale 0.55.3; every Phase 1 script ` +
        `must use $P1_CAIDO_BIN from scripts/phase1/env.sh. ${REMEASURE}.`,
    ).toBe(EXPECTED_CAIDO_VERSION);
  });
});

describe("success criterion 3 — the maximum synchronous slice", () => {
  it("is a number GREATER THAN ZERO — a zero is an instrument failure", () => {
    expect(
      typeof d?.max_slice_ms,
      `${RESULT}: max_slice_ms is ${JSON.stringify(d?.max_slice_ms)}, not a ` +
        `number. ${REMEASURE}.`,
    ).toBe("number");
    expect(
      d?.max_slice_ms,
      `${RESULT}: max_slice_ms is 0 after a ${MIN_CHUNKS}-chunk load. A plugin ` +
        `that never blocked the thread and an instrument that measured nothing ` +
        `report the same number, and this gate refuses to read the second as the ` +
        `first. THE MOST LIKELY CAUSE IS THAT recordSlice(walkResult.maxSliceMs) ` +
        `IS NO LONGER CALLED IN packages/backend/src/ingest/consumer.ts — check ` +
        `that before re-measuring, and note that ` +
        `packages/backend/src/ingest/consumer.spec.ts fails on the same defect ` +
        `in under a second.`,
    ).toBeGreaterThan(0);
  });

  it("is at or below the Phase 0 budget, read from go-no-go.json and never a literal", () => {
    const budget = loadJson(GO_NO_GO)?.thresholds?.MAX_SYNC_SLICE_MS?.value;
    expect(
      typeof budget,
      `${GO_NO_GO}: MAX_SYNC_SLICE_MS is missing. Every tunable constant is ` +
        `imported from the Phase 0 exit artifact, never re-typed.`,
    ).toBe("number");
    // The artifact records the budget it was judged against, so a later change
    // to the threshold cannot silently re-judge an old measurement.
    expect(
      d?.max_sync_slice_ms_budget,
      `${RESULT} recorded a different budget from the one in ${GO_NO_GO}. ` +
        `${REMEASURE}.`,
    ).toBe(budget);
    expect(
      d?.max_slice_ms,
      `${RESULT}: max_slice_ms is ${JSON.stringify(d?.max_slice_ms)}, ABOVE the ` +
        `measured MAX_SYNC_SLICE_MS budget of ${JSON.stringify(budget)}. The ` +
        `walk's yield trigger is temporal, so a slice above the budget means the ` +
        `loop ran a single window for longer than the whole budget allows — ` +
        `check packages/engine/src/pipeline.ts before relaxing anything here.`,
    ).toBeLessThanOrEqual(budget);
  });

  it("was produced by a load that actually happened", () => {
    // Non-vacuity FIRST: a run that processed nothing satisfies every latency
    // assertion below trivially and would pass having proven nothing.
    expect(
      d?.processed,
      `${RESULT}: the loaded run processed ${JSON.stringify(d?.processed)} ` +
        `artifacts, fewer than the ${MIN_CHUNKS} chunks it requested. Check that ` +
        `a project was selected — with none selected the proxy fails every ` +
        `request and the hook never fires. ${REMEASURE}.`,
    ).toBeGreaterThanOrEqual(MIN_CHUNKS);
    expect(
      d?.distinct_digests,
      `${RESULT}: only ${JSON.stringify(d?.distinct_digests)} DISTINCT digests. ` +
        `${MIN_CHUNKS} requests for the same body would be ${MIN_CHUNKS - 1} ` +
        `content-hash cache hits, which exercises CORE-08's skip and not the ` +
        `walk — the opposite of what this run is for. Check that ` +
        `scripts/phase1/spa-load.sh is still driving distinct paths.`,
    ).toBeGreaterThanOrEqual(MIN_CHUNKS);
    expect(
      d?.load?.requests_ok,
      `${RESULT}: only ${JSON.stringify(d?.load?.requests_ok)} of the load's ` +
        `requests succeeded. Do not read the latency figures for this run.`,
    ).toBeGreaterThanOrEqual(MIN_CHUNKS);
  });
});

describe("success criterion 3 — the plugin's RPC stays responsive", () => {
  const rpc = d?.rpc ?? {};

  it.each([
    ["baseline", rpc.baseline],
    ["loaded", rpc.loaded],
  ])(
    "the %s distribution was measured, with enough samples to mean something",
    (name: string, dist: any) => {
      expect(
        dist?.measured,
        `${RESULT}: the ${name} RPC distribution was not measured ` +
          `(${dist?.reason ?? "no reason recorded"}). A scenario that did not run ` +
          `is null with a reason, never a zero — ${REMEASURE}.`,
      ).toBe(true);
      expect(
        dist?.samples,
        `${RESULT}: the ${name} prober recorded ${JSON.stringify(dist?.samples)} ` +
          `samples. Fewer than ${MIN_RPC_SAMPLES} is not a distribution.`,
      ).toBeGreaterThanOrEqual(MIN_RPC_SAMPLES);
      for (const field of ["median_ms", "p95_ms", "max_ms"]) {
        expect(
          typeof dist?.[field],
          `${RESULT}: the ${name} distribution has no ${field}.`,
        ).toBe("number");
      }
    },
  );

  it("keeps the loaded maximum within a RECORDED multiple of the same-machine baseline", () => {
    const multiple = rpc?.tolerance_multiple;
    expect(
      typeof multiple,
      `${RESULT}: rpc.tolerance_multiple is missing. The tolerance lives in the ` +
        `artifact so this gate reads it as DATA; a literal here would be a magic ` +
        `number nobody could re-derive.`,
    ).toBe("number");
    expect(multiple).toBeGreaterThan(0);

    const baseMax = rpc?.baseline?.max_ms;
    const loadedMax = rpc?.loaded?.max_ms;
    expect(
      loadedMax,
      `${RESULT}: the plugin's RPC took ${JSON.stringify(loadedMax)} ms at worst ` +
        `under load against a same-machine idle baseline maximum of ` +
        `${JSON.stringify(baseMax)} ms — more than ${JSON.stringify(multiple)}x. ` +
        `That is the thread being held. The comparison is against THIS rig ` +
        `rather than a number measured elsewhere, so a slow machine does not ` +
        `explain it away.`,
    ).toBeLessThanOrEqual(baseMax * multiple);
  });

  it("answered every probe it was sent under load", () => {
    expect(
      d?.rpc?.loaded?.errors,
      `${RESULT}: ${JSON.stringify(d?.rpc?.loaded?.errors)} probes failed or ` +
        `timed out during the load. A probe that never got an answer is the ` +
        `strongest form of the stall this criterion is about.`,
    ).toBe(0);
  });
});

describe("success criterion 4 — artifacts survive a real Caido restart", () => {
  const r = d?.restart ?? {};

  it("the check actually ran", () => {
    expect(
      r?.checked,
      `${RESULT}: the restart check did not run (${r?.reason ?? "no reason recorded"}). ` +
        `${REMEASURE}.`,
    ).toBe(true);
  });

  it("has the same rows before and after, to the same digests", () => {
    expect(
      r?.before?.artifacts,
      `${RESULT}: the before-snapshot recorded ` +
        `${JSON.stringify(r?.before?.artifacts)} artifacts, so the comparison ` +
        `below would hold vacuously.`,
    ).toBeGreaterThanOrEqual(MIN_CHUNKS);
    expect(
      r?.after?.artifacts,
      `${RESULT}: ${JSON.stringify(r?.before?.artifacts)} artifact rows before ` +
        `the restart and ${JSON.stringify(r?.after?.artifacts)} after. ` +
        `sdk.meta.db() lives in Caido Data and is never garbage-collected, so ` +
        `rows disappearing across a restart means the plugin re-created the ` +
        `database rather than re-attaching to it.`,
    ).toBe(r?.before?.artifacts);
    expect(r?.after?.observations).toBe(r?.before?.observations);
    expect(
      r?.after?.digest_sample,
      `${RESULT}: the recorded digest sample differs across the restart. Equal ` +
        `COUNTS with different CONTENT would mean the rows were rewritten, which ` +
        `a count comparison alone cannot catch.`,
    ).toEqual(r?.before?.digest_sample);
    expect(r?.before?.digest_sample?.length).toBeGreaterThan(0);
    expect(r?.identical).toBe(true);
  });

  it("re-attaches without advancing the version or re-creating a table", () => {
    expect(
      r?.plugin_reattached,
      `${RESULT}: the plugin did not report itself compatible on the second ` +
        `boot. ${REMEASURE}.`,
    ).toBe(true);
    expect(
      r?.migration_advanced_version,
      `${RESULT}: PRAGMA user_version moved on the second boot. The ladder is ` +
        `forward-only and every step is IF NOT EXISTS, so a second boot against ` +
        `an already-migrated database must be a NO-OP.`,
    ).toBe(false);
    expect(
      r?.schema_changed,
      `${RESULT}: the database's DDL changed across the restart. A table was ` +
        `re-created, which is exactly what "re-attaches" is supposed to exclude.`,
    ).toBe(false);
    expect(r?.schema_version_after).toBe(r?.schema_version_before);
  });
});

describe("the artifact carries no target data", () => {
  it("records no URL at all — only path templates and a named origin", () => {
    const urls = strings(d).filter((s) =>
      /[a-z][a-z0-9+.-]*:\/\//i.test(s.value),
    );
    expect(
      urls.map((s) => `${s.path} = ${s.value}`),
      `${RESULT} carries a URL. The instance proxies only this script's own ` +
        `synthetic load, so nothing an operator browsed can be in here — but the ` +
        `artifact is COMMITTED, and a committed file is the wrong place to start ` +
        `relying on that (T-01-29).`,
    ).toEqual([]);
  });

  it("records no response body content", () => {
    // A concrete check rather than a vague one: this is the literal seed every
    // generated chunk's body is built from.
    const leaked = strings(d).filter((s) =>
      s.value.includes("export function c"),
    );
    expect(
      leaked.map((s) => s.path),
      `${RESULT} carries response body content.`,
    ).toEqual([]);
  });
});
