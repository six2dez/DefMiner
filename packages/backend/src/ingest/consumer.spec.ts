// packages/backend/src/ingest/consumer.spec.ts — the four store call sites, each
// proven from the OUTSIDE.
//
// This file drives the real consumer against the real store modules over an
// in-process SQLite database. Nothing about persistence is mocked, deliberately:
// a mocked `recordObservation` would prove the consumer CALLS something, which is
// not the claim. The claim is that a running plugin ends up with the rows, and
// the only honest way to check that is to count them.
//
// The four claims, and how each one FAILS if the wiring is removed:
//
//   1. identity + edge  — one reload leaves one `artifacts` row AND one
//      `observations` row. Delete the `recordObservation` call and the row count
//      goes to zero: the spec fails rather than passing with fewer rows.
//   2. CORE-08's skip   — the same digest twice leaves `analyses` at 1 while
//      `seen_count` reaches 2 and a second observation appears. Proven by ROW
//      COUNTS, not by a flag the consumer sets itself.
//   3. the walk         — `max_slice_ms` and `bytes_walked` are non-null and
//      REAL. Write constants instead and the deadline case fails, because
//      `bytes_walked` stops tracking the offset reached.
//   4. STORE-06         — row counts fall with NO call to `sweepRetention` in
//      this file. That is what makes it a schedule rather than a function.
//
// The fixture's honest limit (sqlite-fixture.ts's header) applies: `node:sqlite`
// is single-connection and cannot reproduce Caido's pool. Nothing here claims to.

/* eslint-disable @typescript-eslint/require-await --
   Every fake `requests.get` below is `async` WITH NO `await` INSIDE, and that is
   deliberate rather than an oversight. The SDK declares
   `get(id): Promise<RequestResponseOpt | undefined>`, and the consumer awaits it;
   a fake that returned a plain object would type-check through `Promise<unknown>`
   and then resolve SYNCHRONOUSLY, so every case in this file would exercise an
   ordering the plugin never sees. `async` is how the fake keeps the SDK's shape
   with nothing to await. Same reasoning, same disable, as
   test/fixtures/sqlite-fixture.ts. */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { RETENTION_MAX_ROWS_KEY } from "@defminer/engine/contract";
import { BoundedQueue } from "@defminer/engine/queue";
import {
  ARTIFACT_DEADLINE_MS,
  MAP_MAX_BYTES,
  PASSIVE_MAX_BYTES,
  QUEUE_CAP,
  RETENTION_SWEEP_EVERY_N,
} from "@defminer/engine/thresholds";
import ts from "typescript";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  type FakeSdkOverrides,
  makeFakeRequest,
  makeFakeResponse,
  makeFakeSdk,
} from "../../test/fixtures/fake-sdk";
import {
  createFixtureDb,
  type SqliteFixture,
} from "../../test/fixtures/sqlite-fixture";
import type { EnqueueClock } from "../hooks/passive";
// THE counter object and the max-slice accessor, both imported. Plan 01-05
// REPLACED the local counters object this file used to build; the assertions
// below are unchanged, because the rewire moved where the object lives and not
// what it holds.
import {
  countAnalyses,
  DETECTOR_CORPUS_VERSION,
  getAnalysis,
} from "../store/analyses";
import { getArtifact } from "../store/artifacts";
import { migrate } from "../store/migrations";
import { listObservations } from "../store/observations";
import { retentionCounts } from "../store/retention";
import { GLOBAL_PROJECT_ID, putSetting } from "../store/settings";
import { counters, resetTelemetryForTest, slimStatus } from "../telemetry";

import {
  type ConsumerDeps,
  MAP_REFUSAL_CODE_PREFIX,
  mapRefusalCode,
  resetConsumerForTest,
  startConsumer,
} from "./consumer";

const PROJECT = "project-one";

let fx: SqliteFixture;
let queue: BoundedQueue;
let enqueuedAt: EnqueueClock;

beforeEach(async () => {
  resetConsumerForTest();
  fx = createFixtureDb();
  const report = await migrate(fx.db);
  expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  queue = new BoundedQueue(QUEUE_CAP);
  resetTelemetryForTest();
  enqueuedAt = new Map();
});

afterEach(() => {
  resetConsumerForTest();
  fx.close();
});

/** A body whose bytes are deterministic and whose length is chosen by the case. */
function body(seed: string, length = 64): Uint8Array {
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    out[i] = (seed.charCodeAt(i % seed.length) + i) & 0xff;
  }
  return out;
}

/** Offer one entry and register the reload the consumer will perform for it. */
type Planned = {
  id: string;
  url: string;
  bytes: Uint8Array;
  status?: number;
  contentType?: string;
};

function plan(entries: Planned[]): {
  overrides: FakeSdkOverrides;
  offer: () => void;
} {
  const byId = new Map(entries.map((e) => [e.id, e]));
  return {
    overrides: {
      get: async (id: string) => {
        const e = byId.get(id);
        if (e === undefined) return undefined;
        return {
          request: makeFakeRequest({ id: e.id, url: e.url }),
          response: makeFakeResponse({
            id: e.id,
            code: e.status ?? 200,
            headers: {
              "content-type": [e.contentType ?? "application/javascript"],
            },
            bodyBytes: e.bytes,
          }),
        };
      },
    },
    offer: () => {
      for (const e of entries) {
        queue.offer({ id: e.id, bytes: e.bytes.length, kind: "js" });
        enqueuedAt.set(e.id, Date.now());
      }
    },
  };
}

function deps(over: Partial<ConsumerDeps> = {}): ConsumerDeps {
  return {
    queue,
    db: fx.db,
    enqueuedAt,
    getProjectId: () => Promise.resolve(PROJECT),
    ...over,
  };
}

/** Start the consumer, drain to completion, stop. The poll timer never gets a
 *  chance to fire, so every case is deterministic rather than raced. */
async function runOnce(
  overrides: FakeSdkOverrides,
  over: Partial<ConsumerDeps> = {},
): Promise<ReturnType<typeof makeFakeSdk>> {
  const sdk = makeFakeSdk(overrides);
  const handle = startConsumer(sdk, deps(over));
  await handle.drainNow();
  handle.stop();
  return sdk;
}

// ===========================================================================
// 1. IDENTITY AND THE EDGE
// ===========================================================================

describe("one reloaded entry produces BOTH an artifact and an observation", () => {
  it("writes exactly one row to each table, in the same iteration", async () => {
    const bytes = body("alpha");
    const p = plan([{ id: "r1", url: "https://x.test/app.js?v=1", bytes }]);
    p.offer();
    await runOnce(p.overrides);

    const counts = await retentionCounts(fx.db, PROJECT);
    expect(
      counts.artifacts,
      "no artifacts row — the identity write did not happen.",
    ).toBe(1);
    expect(
      counts.observations,
      "no observations row. An artifact written without its observation records that bytes " +
        "were seen but not WHERE: the plugin would remember the bundle and be unable to say " +
        "which request served it. THIS is the assertion that fails if the recordObservation " +
        "call is removed — it does not pass with fewer rows.",
    ).toBe(1);
    expect(counters.processed).toBe(1);
    expect(counters.reloadHit).toBe(1);
  });

  it("the observation carries the query NAMES, no query values and no fragment", async () => {
    const p = plan([
      {
        id: "r1",
        url: "https://x.test/app.js?v=8c1f&access_token=eyJhbGciOiJIUzI1NiJ9#frag",
        bytes: body("a"),
      },
    ]);
    p.offer();
    await runOnce(p.overrides);

    const rows = await listObservations(fx.db, PROJECT);
    expect(rows.length).toBe(1);
    // WHY THE NAMES ARE KEPT AND THE VALUES ARE NOT — operator decision, UAT
    // 2026-08-21, gap WR-07. A parameter NAME carries analytic value: knowing an
    // endpoint takes an `access_token` parameter is worth being able to see, and
    // the names are also enough to tell that a URL is cache-busted. A parameter
    // VALUE is a credential, and this column is durable for 90 days in a file
    // that is never garbage-collected and survives force-reinstall. What actually
    // decides a cache hit or a miss is the content DIGEST, not the URL.
    expect(rows[0].url).toBe(
      "https://x.test/app.js?v=<redacted>&access_token=<redacted>",
    );
    // Asserted as a substring search as well as an equality: an equality passes
    // when both sides are wrong in the same way.
    expect(rows[0].url.includes("eyJhbGciOiJIUzI1NiJ9")).toBe(false);
    expect(rows[0].status).toBe(200);
    expect(rows[0].content_type).toBe("application/javascript");
    expect(rows[0].request_id).toBe("r1");
  });

  it("the artifact is keyed on the digest of the RAW bytes, with no url column", async () => {
    const bytes = body("alpha");
    const p = plan([{ id: "r1", url: "https://x.test/a.js", bytes }]);
    p.offer();
    await runOnce(p.overrides);

    const rows = await listObservations(fx.db, PROJECT);
    const artifact = await getArtifact(fx.db, PROJECT, rows[0].sha256);
    expect(artifact).toBeDefined();
    expect(artifact?.byte_len).toBe(bytes.length);
    expect(artifact?.kind).toBe("js");
    expect(Object.keys(artifact as object)).not.toContain("url");
  });

  it("writes nothing at all when no project is selected", async () => {
    const p = plan([
      { id: "r1", url: "https://x.test/a.js", bytes: body("a") },
    ]);
    p.offer();
    await runOnce(p.overrides, { getProjectId: () => Promise.resolve("") });

    const counts = await retentionCounts(fx.db, PROJECT);
    expect(counts.artifacts + counts.observations + counts.analyses).toBe(0);
    expect(counters.storeErrors).toBe(1);
    expect(counters.processed).toBe(0);
  });
});

// ===========================================================================
// THE RELOAD CONTRACT — four failures, four DISTINCT counters
// ===========================================================================

describe("every reload failure has its own counter", () => {
  it("`get` resolving undefined increments reloadMissing", async () => {
    queue.offer({ id: "gone", bytes: 10, kind: "js" });
    await runOnce({ get: async () => undefined });
    expect(counters.reloadMissing).toBe(1);
    expect(counters.reloadNoResponse).toBe(0);
    expect(counters.reloadEmptyBody).toBe(0);
    expect(counters.consumerErrors).toBe(0);
    expect(counters.processed).toBe(0);
  });

  it("a pair whose `response` is undefined increments reloadNoResponse", async () => {
    // A SEPARATE counter, because the SDK types these as two different
    // optionality points and conflating them hides which one is happening —
    // "Caido lost the request" and "Caido has no response for it" call for
    // different investigations.
    queue.offer({ id: "noresp", bytes: 10, kind: "js" });
    await runOnce({
      get: async (id: string) => ({ request: makeFakeRequest({ id }) }),
    });
    expect(counters.reloadNoResponse).toBe(1);
    expect(counters.reloadMissing).toBe(0);
    expect(counters.reloadEmptyBody).toBe(0);
    expect(counters.consumerErrors).toBe(0);
  });

  it("a zero-length body increments reloadEmptyBody", async () => {
    queue.offer({ id: "empty", bytes: 10, kind: "js" });
    await runOnce({
      get: async (id: string) => ({
        request: makeFakeRequest({ id }),
        response: makeFakeResponse({ bodyBytes: new Uint8Array(0) }),
      }),
    });
    expect(counters.reloadEmptyBody).toBe(1);
    expect(counters.reloadMissing).toBe(0);
    expect(counters.reloadNoResponse).toBe(0);
  });

  it("an absent body ALSO increments reloadEmptyBody, and writes nothing", async () => {
    queue.offer({ id: "nobody", bytes: 10, kind: "js" });
    await runOnce({
      get: async (id: string) => ({
        request: makeFakeRequest({ id }),
        response: makeFakeResponse({ noBody: true }),
      }),
    });
    expect(counters.reloadEmptyBody).toBe(1);
    const counts = await retentionCounts(fx.db, PROJECT);
    expect(counts.artifacts).toBe(0);
  });

  it("a REJECTING `get` increments consumerErrors and does not stop the loop", async () => {
    // The property that matters is the second half: one poisoned response must
    // not stop everything queued behind it, and Caido surfaces neither the throw
    // nor the rejection, so nothing outside this counter would ever say so.
    const good = body("good");
    queue.offer({ id: "boom", bytes: 10, kind: "js" });
    queue.offer({ id: "ok", bytes: good.length, kind: "js" });
    const sdk = await runOnce({
      get: async (id: string) => {
        if (id === "boom") throw new Error("reload exploded");
        return {
          request: makeFakeRequest({ id, url: "https://x.test/ok.js" }),
          response: makeFakeResponse({ bodyBytes: good }),
        };
      },
    });
    expect(counters.consumerErrors).toBe(1);
    expect(counters.processed).toBe(1);
    expect(sdk.calls.requestsGet).toEqual(["boom", "ok"]);
    expect((await retentionCounts(fx.db, PROJECT)).artifacts).toBe(1);
  });

  it("counts a byte-length disagreement between the hook and the reload", async () => {
    // BODY_LENGTH_EQUALS_RAW_LENGTH was measured true across 24 round trips, so a
    // non-zero value here means that measurement no longer holds.
    const bytes = body("alpha", 64);
    queue.offer({ id: "r1", bytes: 999, kind: "js" });
    await runOnce({
      get: async (id: string) => ({
        request: makeFakeRequest({ id, url: "https://x.test/a.js" }),
        response: makeFakeResponse({ bodyBytes: bytes }),
      }),
    });
    expect(counters.byteLenMismatch).toBe(1);
    expect(counters.processed).toBe(1);
  });
});

// ===========================================================================
// 2. CORE-08's SKIP
// ===========================================================================

describe("CORE-08 — the corpus-version cache, proven by ROW COUNTS", () => {
  it("the same digest twice leaves analyses at 1, seen_count at 2, observations at 2", async () => {
    const bytes = body("same-bundle");
    const first = plan([{ id: "r1", url: "https://x.test/a.js?v=1", bytes }]);
    first.offer();
    await runOnce(first.overrides);

    resetConsumerForTest();
    const second = plan([{ id: "r2", url: "https://x.test/a.js?v=2", bytes }]);
    second.offer();
    await runOnce(second.overrides);

    const counts = await retentionCounts(fx.db, PROJECT);
    expect(counts.artifacts).toBe(1);
    expect(
      counts.observations,
      "the second sighting did not write its observation. The edge is written on EVERY " +
        "iteration, including a cache hit — the same bytes appearing again at a different URL " +
        "is real information.",
    ).toBe(2);
    expect(
      counts.analyses,
      "a second analysis row appeared. The corpus version is IN the primary key, so a repeat " +
        "sighting at the same version must not start a second analysis.",
    ).toBe(1);

    const rows = await listObservations(fx.db, PROJECT);
    const artifact = await getArtifact(fx.db, PROJECT, rows[0].sha256);
    expect(artifact?.seen_count).toBe(2);
    expect(new Set(rows.map((r) => r.request_id))).toEqual(
      new Set(["r1", "r2"]),
    );
    expect(counters.analysisCacheHit).toBe(1);
    expect(counters.analysisStarted).toBe(1);
  });

  it("the SAME digest at a DIFFERENT detector_set_hash adds exactly one analysis row", async () => {
    // The other half of "the cache key carries its own invalidator": a stale-
    // corpus hit is not expressible, so a new corpus version means new work.
    const bytes = body("same-bundle");
    const first = plan([{ id: "r1", url: "https://x.test/a.js", bytes }]);
    first.offer();
    await runOnce(first.overrides);
    expect((await retentionCounts(fx.db, PROJECT)).analyses).toBe(1);

    resetConsumerForTest();
    const second = plan([{ id: "r2", url: "https://x.test/a.js", bytes }]);
    second.offer();
    await runOnce(second.overrides, { detectorSetHash: "phase3-corpus-v2" });

    expect((await retentionCounts(fx.db, PROJECT)).analyses).toBe(2);
    expect(counters.analysisStarted).toBe(2);
    expect(counters.analysisCacheHit).toBe(0);
  });

  it("consults the store BEFORE claiming, so a hit starts no analysis", async () => {
    const bytes = body("cached");
    const first = plan([{ id: "r1", url: "https://x.test/a.js", bytes }]);
    first.offer();
    await runOnce(first.overrides);
    const sha = (await listObservations(fx.db, PROJECT))[0].sha256;
    const before = await getAnalysis(
      fx.db,
      PROJECT,
      sha,
      DETECTOR_CORPUS_VERSION,
    );

    resetConsumerForTest();
    const second = plan([{ id: "r2", url: "https://x.test/a.js", bytes }]);
    second.offer();
    await runOnce(second.overrides);

    const after = await getAnalysis(
      fx.db,
      PROJECT,
      sha,
      DETECTOR_CORPUS_VERSION,
    );
    // Untouched, not merely un-duplicated: a second claim that lost the race
    // would still have moved `started_at`.
    expect(after).toEqual(before);
    expect(await countAnalyses(fx.db, PROJECT)).toBe(1);
  });
});

// ===========================================================================
// 3. THE WALK — real numbers, on both the done and the partial path
// ===========================================================================

describe("the analysis persists what the WALK returned, not constants", () => {
  it("a normal iteration writes scan_state done with both columns non-null", async () => {
    const bytes = body("walk-me", 200_000);
    const p = plan([{ id: "r1", url: "https://x.test/big.js", bytes }]);
    p.offer();
    await runOnce(p.overrides);

    const sha = (await listObservations(fx.db, PROJECT))[0].sha256;
    const row = await getAnalysis(fx.db, PROJECT, sha, DETECTOR_CORPUS_VERSION);
    expect(row?.scan_state).toBe("done");
    expect(row?.max_slice_ms).not.toBeNull();
    expect(row?.bytes_walked).not.toBeNull();
    expect(
      row?.bytes_walked,
      "bytes_walked does not equal the artifact's length on a completed walk. Either the walk " +
        "did not run or a constant was written in its place.",
    ).toBe(bytes.length);
    expect(counters.analysisPartial).toBe(0);
  });

  it("an iteration whose clock crosses ARTIFACT_DEADLINE_MS writes partial, with REAL numbers", async () => {
    // The negative demonstration for the walk. `bytes_walked` here is the offset
    // the walk ACTUALLY reached — strictly between 0 and the artifact's length —
    // so a consumer that wrote constants instead would fail this case while
    // passing the `done` case above.
    const bytes = body("walk-me", 200_000);
    const p = plan([{ id: "r1", url: "https://x.test/big.js", bytes }]);
    p.offer();

    // Every read advances 5 s against a 30 s budget, so the deadline crosses part
    // way through the four windows a 200000-byte artifact produces.
    let t = 0;
    const now = (): number => {
      const v = t;
      t += 5_000;
      return v;
    };
    await runOnce(p.overrides, { now });

    const sha = (await listObservations(fx.db, PROJECT))[0].sha256;
    const row = await getAnalysis(fx.db, PROJECT, sha, DETECTOR_CORPUS_VERSION);
    expect(row?.scan_state).toBe("partial");
    expect(
      row?.max_slice_ms,
      "max_slice_ms is NULL on the degraded path. CORE-07's degraded state and the stored half " +
        "of CORE-10 would be permanently meaningless with every other test still green.",
    ).not.toBeNull();
    expect(row?.bytes_walked).not.toBeNull();
    expect(Number(row?.bytes_walked)).toBeGreaterThan(0);
    expect(Number(row?.bytes_walked)).toBeLessThan(bytes.length);
    expect(counters.analysisPartial).toBe(1);
    // The artifact and its observation still landed: a deadline expiry degrades
    // the ANALYSIS, it does not discard the sighting.
    const counts = await retentionCounts(fx.db, PROJECT);
    expect(counts.artifacts).toBe(1);
    expect(counts.observations).toBe(1);
  });

  it("ARTIFACT_DEADLINE_MS is the generated 30 s, so the case above is the real budget", () => {
    expect(ARTIFACT_DEADLINE_MS).toBe(30_000);
  });
});

// ===========================================================================
// 3b. CORE-10's WIRE — recordSlice, called by PRODUCTION code
// ===========================================================================
//
// A `telemetry.ts` whose `recordSlice` nothing calls leaves
// `getStatus().maxSliceMs` at zero for ever, and `tests/phase1-load.spec.ts`
// deliberately FAILS on a zero rather than reading it as a perfect score — so
// the defect would surface only after a live Caido run and a 200-chunk load,
// which is the latest and most expensive moment in the phase to find it.
//
// The clock is INJECTED here so the number is deterministic. Real
// `performance.now()` deltas over a 64 KiB window are genuinely tiny (the live
// tracer recorded 0.023 ms) and could round to a clean zero on a coarse clock,
// which would make this assertion flaky in exactly the direction that matters.

describe("the consumer feeds the max synchronous slice into telemetry", () => {
  /** A clock that advances a fixed amount per read, so every window's measured
   *  slice is exactly `stepMs`. */
  function steppedClock(stepMs: number): () => number {
    let t = 0;
    return () => {
      const v = t;
      t += stepMs;
      return v;
    };
  }

  it("leaves slimStatus().maxSliceMs greater than 0 after ONE processed artifact", async () => {
    expect(
      slimStatus().maxSliceMs,
      "the maximum starts at 0 — otherwise this case proves nothing.",
    ).toBe(0);

    const p = plan([
      { id: "r1", url: "https://x.test/app.js", bytes: body("slice", 200_000) },
    ]);
    p.offer();
    await runOnce(p.overrides, { now: steppedClock(3) });

    expect(
      slimStatus().maxSliceMs,
      "getStatus().maxSliceMs is still 0 after a full iteration. The walk ran " +
        "and measured a slice, and nothing carried it to telemetry: DELETE THE " +
        "recordSlice(...) CALL IN consumer.ts AND THIS IS THE ASSERTION THAT " +
        "FAILS. Without it the number reaches the 200-chunk load as a zero, " +
        "where tests/phase1-load.spec.ts treats a zero as an instrument failure.",
    ).toBeGreaterThan(0);
    expect(counters.processed).toBe(1);
  });

  it("reports the SAME number the analyses row persisted, to the exact float", async () => {
    const p = plan([
      { id: "r1", url: "https://x.test/app.js", bytes: body("slice", 200_000) },
    ]);
    p.offer();
    await runOnce(p.overrides, { now: steppedClock(3) });

    const sha = (await listObservations(fx.db, PROJECT))[0].sha256;
    const row = await getAnalysis(fx.db, PROJECT, sha, DETECTOR_CORPUS_VERSION);

    expect(
      slimStatus().maxSliceMs,
      "the in-memory maximum and analyses.max_slice_ms disagree. They are taken " +
        "from the SAME walk result one statement apart precisely so they cannot.",
    ).toBe(Number(row?.max_slice_ms));
  });

  it("is not lowered by a later, shorter artifact", async () => {
    const slow = plan([
      { id: "r1", url: "https://x.test/slow.js", bytes: body("slow", 200_000) },
    ]);
    slow.offer();
    await runOnce(slow.overrides, { now: steppedClock(11) });
    const peak = slimStatus().maxSliceMs;
    expect(peak).toBeGreaterThan(0);

    resetConsumerForTest();
    const fast = plan([
      { id: "r2", url: "https://x.test/fast.js", bytes: body("fast", 200_000) },
    ]);
    fast.offer();
    await runOnce(fast.overrides, { now: steppedClock(1) });

    expect(
      slimStatus().maxSliceMs,
      "a shorter slice lowered the maximum. The number answers 'what is the " +
        "worst this plugin has done to the one thread', not 'what did it do " +
        "most recently'.",
    ).toBe(peak);
    expect(counters.processed).toBe(2);
  });

  it("does NOT raise the maximum for an iteration whose analyses row was never written", async () => {
    // A project change during the walk abandons the row. Recording the slice
    // anyway would leave getStatus() describing work no analyses row records.
    //
    // The epoch is flipped BY THE WALK'S OWN CLOCK rather than by counting guard
    // calls: `now` is read only inside `analyseAndFinish`, so "a read has
    // happened" is a precise statement that the walk is under way, and it stays
    // precise if somebody adds another guard upstream.
    let inWalk = false;
    let t = 0;
    const now = (): number => {
      const v = t;
      t += 7;
      if (t > 7) inWalk = true;
      return v;
    };
    const p = plan([
      { id: "r1", url: "https://x.test/app.js", bytes: body("gone", 200_000) },
    ]);
    p.offer();
    await runOnce(p.overrides, {
      now,
      projectEpoch: () => (inWalk ? 1 : 0),
    });

    expect(inWalk, "the walk never ran, so this case proves nothing.").toBe(
      true,
    );
    expect(counters.abandonedOnProjectChange).toBeGreaterThan(0);

    // The row was CLAIMED and never finished — non-terminal, which is exactly
    // the state ERR-02 reconciles in Phase 2 and which Phase 1 leaves alone.
    const sha = (await listObservations(fx.db, PROJECT))[0].sha256;
    const row = await getAnalysis(fx.db, PROJECT, sha, DETECTOR_CORPUS_VERSION);
    expect(
      row?.scan_state,
      "the analysis reached a terminal state, so the abandonment did not happen " +
        "at the finishAnalysis step and this case is testing something else.",
    ).toBe("pending");
    expect(row?.max_slice_ms).toBeNull();

    expect(
      slimStatus().maxSliceMs,
      "the in-memory maximum rose for an iteration that persisted no " +
        "max_slice_ms column. getStatus() would then describe work no analyses " +
        "row records.",
    ).toBe(0);
  });
});

describe("a claim nobody finished", () => {
  it("is counted as STALE on the next sighting, never as a cache hit", async () => {
    // The real way this happens: a walk cancelled by a project change (or a
    // killed runtime) leaves scan_state = 'pending'. `pending` is not terminal,
    // so isAnalysed keeps saying false and claimAnalysis keeps hitting DO
    // NOTHING — the artifact is never re-analysed at this corpus version until
    // the row ages out at 90 days. The only counter that used to move said
    // "cache hit", so the health surface reported a stuck artifact as a success
    // AND the CORE-08 hit rate this phase exists to start measuring was wrong.
    const bytes = body("stranded");

    const first = plan([{ id: "r1", url: "https://x.test/a.js", bytes }]);
    first.offer();
    await runOnce(first.overrides, { signal: { aborted: true } });

    const stranded = fx.raw
      .prepare("SELECT scan_state FROM analyses WHERE project_id = ?")
      .all(PROJECT) as { scan_state: string }[];
    expect(
      stranded.map((r) => r.scan_state),
      "the fixture did not strand a pending row, so the case below would be " +
        "asserting nothing.",
    ).toEqual(["pending"]);
    expect(counters.analysisStarted).toBe(1);

    // The SAME bytes are served again.
    const second = plan([{ id: "r2", url: "https://x.test/a.js", bytes }]);
    second.offer();
    await runOnce(second.overrides);

    expect(
      counters.analysisCacheHit,
      "a pending claim was reported as a cache hit. It is the opposite: the " +
        "bytes have NOT been through the detectors, and nothing will take them " +
        "there again at this corpus version.",
    ).toBe(0);
    expect(counters.analysisStale).toBe(1);
    expect(await countAnalyses(fx.db, PROJECT)).toBe(1);
  });

  it("still counts a genuinely finished analysis as a cache hit", async () => {
    // Non-vacuity for the case above: the new branch must not have swallowed
    // CORE-08's actual skip.
    const bytes = body("finished");
    const p = plan([
      { id: "r1", url: "https://x.test/a.js", bytes },
      { id: "r2", url: "https://x.test/b.js", bytes },
    ]);
    p.offer();
    await runOnce(p.overrides);

    expect(counters.analysisStarted).toBe(1);
    expect(counters.analysisCacheHit).toBe(1);
    expect(counters.analysisStale).toBe(0);
  });
});

// ===========================================================================
// 4. STORE-06's SCHEDULE
// ===========================================================================

describe("STORE-06 — retention is SCHEDULED from the loop, not merely available", () => {
  /** Seed artifacts directly, bypassing the write path: this arranges a database
   *  state rather than exercising anything. */
  function seedArtifacts(count: number, at: number): void {
    const stmt = fx.raw.prepare(
      `INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    );
    for (let i = 0; i < count; i += 1) {
      stmt.run(
        PROJECT,
        "seed" + String(i).padStart(60, "0"),
        10,
        "js",
        at,
        at + i,
      );
    }
  }

  /** A `Database` that runs the real fixture, and calls `bump` the instant the
   *  artifact upsert has landed. That is the ONE interleaving point this case is
   *  about: a project change that arrives after the identity write and before
   *  the observation write. */
  function dbBumpingAfterTheArtifactWrite(
    bump: () => void,
  ): SqliteFixture["db"] {
    return {
      exec: fx.db.exec.bind(fx.db),
      prepare: async (sql: string) => {
        const stmt = await fx.db.prepare(sql);
        if (!/INSERT\s+INTO\s+artifacts/i.test(sql)) return stmt;
        // `get` and `all` are delegated unchanged: only the write is
        // instrumented, so nothing else about the fixture's behaviour moves.
        return {
          get: stmt.get.bind(stmt),
          all: stmt.all.bind(stmt),
          run: async (...params: string[]) => {
            const res = await stmt.run(...params);
            bump();
            return res;
          },
        };
      },
    };
  }

  it("row counts FALL with no call to sweepRetention anywhere in this test", async () => {
    // grep this file for `sweepRetention` — it is imported by nothing here. The
    // only way the count can fall is if the consumer scheduled the pass itself.
    await putSetting(
      fx.db,
      GLOBAL_PROJECT_ID,
      RETENTION_MAX_ROWS_KEY,
      "40",
      Date.now(),
    );
    seedArtifacts(100, Date.now() - 1_000);
    expect((await retentionCounts(fx.db, PROJECT)).artifacts).toBe(100);

    const p = plan([
      { id: "r1", url: "https://x.test/a.js", bytes: body("trigger") },
    ]);
    p.offer();
    await runOnce(p.overrides);

    const after = await retentionCounts(fx.db, PROJECT);
    expect(
      after.artifacts,
      "the row count did not fall. sweepRetention exists and works (retention.spec.ts proves " +
        "that); what this asserts is that a RUNNING PLUGIN invokes it. Until it does, STORE-06's " +
        "mitigation is a function nobody calls.",
    ).toBeLessThanOrEqual(41);
    expect(counters.retentionSweeps).toBe(1);
    expect(counters.retentionDeleted).toBeGreaterThan(0);
  });

  it("runs ONE pass on the first iteration after start, and not on the second", async () => {
    // "Also run one pass on the first iteration after the consumer starts, so a
    // plugin that ingests slowly still trims rather than growing forever between
    // bursts" — once, not once per entry.
    const p = plan([
      { id: "r1", url: "https://x.test/a.js", bytes: body("one") },
      { id: "r2", url: "https://x.test/b.js", bytes: body("two") },
      { id: "r3", url: "https://x.test/c.js", bytes: body("three") },
    ]);
    p.offer();
    await runOnce(p.overrides);
    expect(counters.processed).toBe(3);
    expect(counters.retentionSweeps).toBe(1);
  });

  it("a single cadence crossing performs EXACTLY ONE pass, not a loop to convergence", async () => {
    // A pass reporting `moreWork` defers to the next boundary. Looping until it
    // is false would rebuild the long uninterruptible stretch the bounded pass
    // exists to prevent — and deferral converges anyway, because the per-pass
    // delete cap dominates the worst-case insert rate by assertion.
    const entries: Planned[] = [];
    for (let i = 0; i < RETENTION_SWEEP_EVERY_N; i += 1) {
      entries.push({
        id: "r" + String(i),
        url: "https://x.test/" + String(i) + ".js",
        bytes: body("artifact-" + String(i)),
      });
    }
    const p = plan(entries);
    p.offer();
    await runOnce(p.overrides);

    expect(counters.processed).toBe(RETENTION_SWEEP_EVERY_N);
    // One at the first iteration, one when the counter crossed the cadence.
    // Exactly two — a loop-to-convergence, or a per-iteration sweep, would be more.
    expect(
      counters.retentionSweeps,
      `${counters.retentionSweeps} sweeps over ${RETENTION_SWEEP_EVERY_N} processed artifacts. ` +
        `Expected exactly 2: one on the first iteration after start, one at the cadence boundary.`,
    ).toBe(2);
  });

  it("does not repeat a cadence pass while early returns leave the write count stalled", async () => {
    const entries: Planned[] = [];
    for (let i = 0; i < RETENTION_SWEEP_EVERY_N; i += 1) {
      entries.push({
        id: "r" + String(i),
        url: "https://x.test/" + String(i) + ".js",
        bytes: body("artifact-" + String(i)),
      });
    }
    const p = plan(entries);
    p.offer();
    for (const id of ["missing-1", "missing-2", "missing-3"]) {
      queue.offer({ id, bytes: 10, kind: "js" });
    }

    await runOnce(p.overrides);

    expect(counters.processed).toBe(RETENTION_SWEEP_EVERY_N);
    expect(counters.reloadMissing).toBe(3);
    expect(
      counters.retentionSweeps,
      "the write counter stayed on a cadence boundary while three reloads " +
        "returned early; that boundary must schedule one pass, not one pass " +
        "per later queue entry",
    ).toBe(2);
  });

  /** The fixture database with every DELETE rejecting — the shape a locked
   *  database or a half-applied schema takes from in here. */
  function dbWhereDeletesFail(): SqliteFixture["db"] {
    return {
      exec: fx.db.exec.bind(fx.db),
      prepare: async (sql: string) => {
        const stmt = await fx.db.prepare(sql);
        if (!/^\s*DELETE\b/i.test(sql)) return stmt;
        return {
          get: stmt.get.bind(stmt),
          all: stmt.all.bind(stmt),
          run: () => Promise.reject(new Error("database is locked")),
        };
      },
    };
  }

  it("a sweep whose deletes all fail moves a counter and leaves a record", async () => {
    // The failure used to be silent end to end: retentionSweeps climbing,
    // retentionDeleted stuck at 0, no storeErrors, no lastError, and a log line
    // saying "more remains for the next cadence boundary" for ever — while
    // retention is the only thing bounding this database at all.
    await putSetting(
      fx.db,
      GLOBAL_PROJECT_ID,
      RETENTION_MAX_ROWS_KEY,
      "1",
      Date.now(),
    );
    seedArtifacts(10, Date.now() - 1_000);

    const p = plan([
      { id: "r1", url: "https://x.test/a.js", bytes: body("locked") },
    ]);
    p.offer();
    await runOnce(p.overrides, { db: dbWhereDeletesFail() });

    expect(counters.retentionSweeps).toBe(1);
    expect(counters.retentionDeleted).toBe(0);
    expect(
      counters.storeErrors,
      "a retention pass failed on every row and nothing counted it.",
    ).toBeGreaterThan(0);
    expect(
      String(slimStatus().lastError),
      "no error record survived the sweep. HANDLER_ERROR_SURFACED is " +
        "'neither', so this is the only record that will ever exist.",
    ).toContain("RETENTION_DELETE_FAILED");
  });

  it("still reaches the cadence when every iteration is abandoned AFTER a write", async () => {
    // The cadence counter used to be the LAST statement of handleOne, reached
    // only on the full-success path — while the project-change returns that
    // precede it happen after one or two rows have already landed. Under
    // sustained churn the rows accumulated and the interval never advanced, and
    // since the first-iteration sweep has already happened, nothing was ever
    // scheduled again. Every existing cadence case feeds fully-processed
    // entries, so none of them can see it.
    const entries: Planned[] = [];
    for (let i = 0; i < RETENTION_SWEEP_EVERY_N; i += 1) {
      entries.push({
        id: "r" + String(i),
        url: "https://x.test/" + String(i) + ".js",
        bytes: body("churn-" + String(i)),
      });
    }
    const p = plan(entries);
    p.offer();

    // The operator switches project DURING each artifact write, so every
    // iteration inserts its artifact row and then abandons before the
    // observation write.
    let epoch = 0;
    await runOnce(p.overrides, {
      db: dbBumpingAfterTheArtifactWrite(() => {
        epoch += 1;
      }),
      projectEpoch: () => epoch,
    });

    expect(
      counters.abandonedOnProjectChange,
      "the fixture did not actually abandon the iterations it was built to " +
        "abandon, so this case would pass against the bug it exists to catch.",
    ).toBe(RETENTION_SWEEP_EVERY_N);
    expect(counters.processed).toBe(0);
    expect(
      (await retentionCounts(fx.db, PROJECT)).artifacts,
      "every iteration wrote its artifact row before abandoning — that is the " +
        "whole premise.",
    ).toBe(RETENTION_SWEEP_EVERY_N);
    expect(
      counters.retentionSweeps,
      `${counters.retentionSweeps} sweeps after ${RETENTION_SWEEP_EVERY_N} ` +
        `rows were inserted. Retention is the ONLY bound on this database, and ` +
        `an interval that counts completions rather than writes stops advancing ` +
        `exactly when the rows keep coming.`,
    ).toBe(2);
  });

  it("does not sweep the reserved global scope", async () => {
    // '' is a settings-only scope; no artifact, observation or analysis can carry
    // it, so a sweep for it would be a bug.
    const p = plan([
      { id: "r1", url: "https://x.test/a.js", bytes: body("x") },
    ]);
    p.offer();
    await runOnce(p.overrides, {
      getProjectId: () => Promise.resolve(GLOBAL_PROJECT_ID),
    });
    expect(counters.retentionSweeps).toBe(0);
  });
});

// ===========================================================================
// EXACTLY ONE DRAIN LOOP
// ===========================================================================

describe("CORE-04 — exactly one drain loop, whatever the caller does", () => {
  it("starting twice with a queue of depth 10 reloads 10 times, not 20", async () => {
    const entries: Planned[] = [];
    for (let i = 0; i < 10; i += 1) {
      entries.push({
        id: "r" + String(i),
        url: "https://x.test/" + String(i) + ".js",
        bytes: body("e" + String(i)),
      });
    }
    const p = plan(entries);
    p.offer();

    const sdk = makeFakeSdk(p.overrides);
    const first = startConsumer(sdk, deps());
    const second = startConsumer(sdk, deps());
    // A NEW handle bound to the new deps, with the old loop stopped — still
    // exactly one loop, because the stop happens before the start.
    expect(second).not.toBe(first);

    await Promise.all([first.drainNow(), second.drainNow()]);
    second.stop();

    expect(
      sdk.calls.requestsGet.length,
      `${sdk.calls.requestsGet.length} reloads for 10 queued entries. Two loops means every ` +
        `artifact is reloaded and hashed twice on the one thread this runtime has.`,
    ).toBe(10);
    expect(new Set(sdk.calls.requestsGet).size).toBe(10);
    expect(counters.processed).toBe(10);
  });

  it("a second start REBINDS to the new queue rather than orphaning it", async () => {
    // init() constructs a FRESH BoundedQueue and points the hook at it with
    // configurePassive BEFORE calling startConsumer. A second start that
    // returned the existing handle discarded the new deps entirely, so the hook
    // filled queue #2 while the surviving consumer drained queue #1 — which
    // nothing fills. Observable result: admitted climbs, queueDepth climbs to
    // QUEUE_CAP, queueOverflow climbs, and processed never moves again.
    const entries: Planned[] = [];
    for (let i = 0; i < 4; i += 1) {
      entries.push({
        id: "n" + String(i),
        url: "https://x.test/" + String(i) + ".js",
        bytes: body("rebind-" + String(i)),
      });
    }
    const p = plan(entries);
    const sdk = makeFakeSdk(p.overrides);

    // Loop #1, bound to the module-level `queue`, which stays empty.
    const first = startConsumer(sdk, deps());

    // Re-init: a new queue, filled by the hook, then a second start.
    const rebound = new BoundedQueue(QUEUE_CAP);
    for (const e of entries) {
      rebound.offer({ id: e.id, bytes: e.bytes.length, kind: "js" });
      enqueuedAt.set(e.id, Date.now());
    }
    const second = startConsumer(sdk, deps({ queue: rebound }));

    await second.drainNow();
    // The old handle is stopped, so driving it does nothing at all.
    await first.drainNow();
    second.stop();

    expect(
      counters.processed,
      "the consumer kept draining the queue it was started with while the hook " +
        "filled a different one. Nothing reports that: the plugin looks healthy " +
        "and simply stops processing.",
    ).toBe(entries.length);
    expect(rebound.depth).toBe(0);
    expect(sdk.calls.requestsGet.length).toBe(entries.length);
  });

  it("the IN-FLIGHT latch holds while a drain is still running", async () => {
    // The latch test proper: a second drain entered WHILE the first is mid-flight
    // must return immediately rather than interleave. Driven by a reload that
    // does not resolve until the second call has been made.
    const entries: Planned[] = [
      { id: "a", url: "https://x.test/a.js", bytes: body("a") },
      { id: "b", url: "https://x.test/b.js", bytes: body("b") },
    ];
    const p = plan(entries);
    p.offer();

    let release: (() => void) | undefined;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let firstGetSeen = false;

    const sdk = makeFakeSdk({
      get: async (id: string) => {
        if (!firstGetSeen) {
          firstGetSeen = true;
          await gate;
        }
        return (await p.overrides.get?.(id)) ?? undefined;
      },
    });

    const handle = startConsumer(sdk, deps());
    const inFlight = handle.drainNow();
    // The first reload is now parked inside the loop. A concurrent drain must be
    // a no-op — it must NOT take the second entry and process it in parallel.
    const concurrent = handle.drainNow();
    await concurrent;
    expect(queue.depth).toBe(1);
    expect(sdk.calls.requestsGet.length).toBe(1);

    release?.();
    await inFlight;
    handle.stop();
    expect(sdk.calls.requestsGet.length).toBe(2);
    expect(counters.processed).toBe(2);
  });

  it("drops its handle on stop, so a later start is a real start", async () => {
    const p = plan([
      { id: "r1", url: "https://x.test/a.js", bytes: body("a") },
    ]);
    p.offer();
    const sdk = makeFakeSdk(p.overrides);
    const first = startConsumer(sdk, deps());
    first.stop();
    const second = startConsumer(sdk, deps());
    expect(second).not.toBe(first);
    await second.drainNow();
    second.stop();
    expect(counters.processed).toBe(1);
  });
});

// ===========================================================================
// CORE-05 — nothing from the SDK survives an await, checked over the AST
// ===========================================================================

/**
 * Report every identifier bound to a `*.requests.get(...)` result — or derived
 * from one — that is still referenced after a LATER `await` in the same function.
 *
 * Pure over `(fileName, source)` so the FAILING path can be executed against an
 * inline fixture in this same file. A static gate whose failing path is never run
 * is a gate nobody has seen work.
 *
 * Why a gate at all, when `extract()` already returns plain scalars: the never-
 * retain rule is a property of the CODE SHAPE, and the shape is one refactor away
 * from being lost. CORE-05 forbids holding a `Request`, `Response` or `Body`
 * across an await because those handles pin Caido-side state, and Phase 0 measured
 * a worst-case event-to-reload delta of 2154 ms under load — 2.1 seconds during
 * which a retained handle would be alive per queued entry.
 */
export function auditNeverRetain(fileName: string, source: string): string[] {
  const sf = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const violations = new Set<string>();

  /** `<anything>.requests.get(...)` */
  function isRequestsGetCall(node: ts.Node): boolean {
    if (!ts.isCallExpression(node)) return false;
    const callee = node.expression;
    if (!ts.isPropertyAccessExpression(callee)) return false;
    if (callee.name.text !== "get") return false;
    const obj = callee.expression;
    return ts.isPropertyAccessExpression(obj) && obj.name.text === "requests";
  }

  /** The identifier an expression is ultimately rooted at, if any. */
  function rootIdentifier(node: ts.Node): string | undefined {
    let cur: ts.Node = node;
    for (;;) {
      if (ts.isIdentifier(cur)) return cur.text;
      if (
        ts.isPropertyAccessExpression(cur) ||
        ts.isElementAccessExpression(cur) ||
        ts.isNonNullExpression(cur) ||
        ts.isParenthesizedExpression(cur) ||
        ts.isAsExpression(cur) ||
        ts.isAwaitExpression(cur)
      ) {
        cur = cur.expression;
        continue;
      }
      return undefined;
    }
  }

  function containsRequestsGet(node: ts.Node): boolean {
    if (isRequestsGetCall(node)) return true;
    let found = false;
    ts.forEachChild(node, (child) => {
      if (!found && containsRequestsGet(child)) found = true;
    });
    return found;
  }

  function checkBody(body: ts.Node, label: string): void {
    // name -> end position of the declaration that tainted it
    const tainted = new Map<string, number>();
    const collect = (n: ts.Node): void => {
      if (
        ts.isVariableDeclaration(n) &&
        n.initializer !== undefined &&
        ts.isIdentifier(n.name)
      ) {
        if (containsRequestsGet(n.initializer)) {
          tainted.set(n.name.text, n.end);
        } else {
          const root = rootIdentifier(n.initializer);
          if (root !== undefined && tainted.has(root)) {
            tainted.set(n.name.text, n.end);
          }
        }
      }
      ts.forEachChild(n, collect);
    };
    collect(body);
    if (tainted.size === 0) return;

    const awaitEnds: number[] = [];
    const collectAwaits = (n: ts.Node): void => {
      if (ts.isAwaitExpression(n)) awaitEnds.push(n.end);
      ts.forEachChild(n, collectAwaits);
    };
    collectAwaits(body);

    const collectRefs = (n: ts.Node): void => {
      if (ts.isIdentifier(n) && tainted.has(n.text)) {
        const parent = n.parent as ts.Node | undefined;
        const isDeclarationName =
          parent !== undefined &&
          ts.isVariableDeclaration(parent) &&
          parent.name === n;
        if (!isDeclarationName) {
          const declEnd = tainted.get(n.text) ?? 0;
          const pos = n.getStart(sf);
          const blocking = awaitEnds.find((a) => a > declEnd && a < pos);
          if (blocking !== undefined) {
            violations.add(
              `${fileName} ${label}: \`${n.text}\` is bound to a requests.get result and is still ` +
                `referenced after a later await. CORE-05 forbids holding a Request, Response or ` +
                `Body across an await — read everything you need synchronously (see extract()).`,
            );
          }
        }
      }
      ts.forEachChild(n, collectRefs);
    };
    collectRefs(body);
  }

  const visit = (node: ts.Node): void => {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node)) &&
      node.body !== undefined
    ) {
      const name =
        "name" in node && node.name !== undefined
          ? node.name.getText(sf)
          : "<anonymous>";
      checkBody(node.body, name);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return [...violations].sort();
}

describe("CORE-05 — no SDK handle survives an await", () => {
  const CONSUMER = fileURLToPath(new URL("./consumer.ts", import.meta.url));

  it("consumer.ts holds nothing from requests.get across a later await", () => {
    const source = readFileSync(CONSUMER, "utf8");
    expect(auditNeverRetain("consumer.ts", source)).toEqual([]);
  });

  it("the audit FAILS on the violation, introduced deliberately", () => {
    // Execute the failing path. Introduced here rather than by editing the real
    // file, so the demonstration is permanent and runs on every CI pass instead
    // of having happened once on somebody's laptop.
    const violation = `
      async function bad(sdk: any, id: string, db: any) {
        const rr = await sdk.requests.get(id);
        const projectId = await db.getProjectId();
        return rr.response.getCode() + projectId.length;
      }
    `;
    const found = auditNeverRetain("violation.ts", violation);
    expect(found.length).toBe(1);
    expect(found[0]).toContain("`rr`");
    expect(found[0]).toContain("CORE-05");
  });

  it("the audit ALSO catches an alias derived from the reload result", () => {
    const violation = `
      async function bad(sdk: any, id: string, db: any) {
        const rr = await sdk.requests.get(id);
        const response = rr.response;
        await db.something();
        return response.getCode();
      }
    `;
    const found = auditNeverRetain("violation.ts", violation);
    expect(found.length).toBe(1);
    expect(found[0]).toContain("`response`");
  });

  it("the audit does NOT fire on the legal shape", () => {
    // Guards the guard from the other side: a gate that reported everything would
    // pass its own failing-path test and be useless.
    const legal = `
      async function good(sdk: any, id: string, db: any) {
        const rr = await sdk.requests.get(id);
        const bytes = rr.response.getBody().toRaw();
        const projectId = await db.getProjectId();
        return bytes.length + projectId.length;
      }
    `;
    expect(auditNeverRetain("legal.ts", legal)).toEqual([]);
  });

  it("consumer.ts reads every SDK value inside the synchronous extract()", () => {
    const source = readFileSync(CONSUMER, "utf8");
    // `extract` is declared with `function`, not `async function`. A synchronous
    // function whose return type contains no SDK type CANNOT leak a handle past
    // an await, which is a stronger guarantee than any convention.
    expect(source).toContain("function extract(rr: {");
    expect(source).not.toContain("async function extract");
  });
});

// ===========================================================================
// SHAPE OF THE CALL SITES
// ===========================================================================

describe("the call sites match the signatures 01-01 and 01-04 froze", () => {
  const CONSUMER = fileURLToPath(new URL("./consumer.ts", import.meta.url));

  it("upsertArtifact is called with SIX arguments and no url", () => {
    // `artifacts` has no `url` column (decision P1-D6) — the URL lives on the
    // observation. A seventh argument here would be silently ignored by the
    // prepared statement and the URL would simply never be stored.
    const source = readFileSync(CONSUMER, "utf8");
    const sf = ts.createSourceFile(
      "consumer.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const arities: number[] = [];
    const visit = (n: ts.Node): void => {
      if (
        ts.isCallExpression(n) &&
        ts.isIdentifier(n.expression) &&
        n.expression.text === "upsertArtifact"
      ) {
        arities.push(n.arguments.length);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
    expect(arities.length, "consumer.ts never calls upsertArtifact.").toBe(1);
    expect(arities[0]).toBe(6);
  });

  it("all four store call sites are present", () => {
    const source = readFileSync(CONSUMER, "utf8");
    for (const call of [
      "upsertArtifact(",
      "recordObservation(",
      "isAnalysed(",
      "claimAnalysis(",
      "finishAnalysis(",
      "sweepRetention(",
      "walk(",
    ]) {
      expect(
        source.includes(call),
        `consumer.ts does not call ${call}. This file is the ONLY writer in the plugin, so a ` +
          `store function it does not call is a function nobody calls (decision P3-D4).`,
      ).toBe(true);
    }
  });
});

// ===========================================================================
// D-08 — THE ONE BRANCH THAT COUPLES RETENTION TO THE SCAN STATE MACHINE
// ===========================================================================

describe("D-08 — a row-cap eviction suspends a running scan; an age trim does not", () => {
  const CONSUMER = fileURLToPath(new URL("./consumer.ts", import.meta.url));
  const ANCIENT = () => Date.now() - 400 * 24 * 60 * 60 * 1000;

  function seedArtifacts(count: number, at: number): void {
    const stmt = fx.raw.prepare(
      `INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
    );
    for (let i = 0; i < count; i += 1) {
      stmt.run(
        PROJECT,
        "seed" + String(i).padStart(60, "0"),
        10,
        "js",
        at,
        at + i,
      );
    }
  }

  function seedRunningScan(scanId = "scan-1"): void {
    fx.raw
      .prepare(
        `INSERT INTO scans (project_id, scan_id, state, suspend_reason, operator_filter,
                            epoch, last_request_id, last_cursor, last_created_at,
                            pages_walked, seen, admitted, skipped_done, rejected, queued,
                            started_at, updated_at, finished_at)
         VALUES (?, ?, 'running', NULL, '', 0, '9001', NULL, NULL, 3, 60, 12, 4, 44, 12, ?, ?, NULL)`,
      )
      .run(PROJECT, scanId, Date.now(), Date.now());
  }

  function scanState(scanId = "scan-1"): {
    state: string;
    suspend_reason: string | null;
    last_request_id: string;
  } {
    return {
      ...(fx.raw
        .prepare(
          "SELECT state, suspend_reason, last_request_id FROM scans WHERE project_id = ? AND scan_id = ?",
        )
        .get(PROJECT, scanId) as {
        state: string;
        suspend_reason: string | null;
        last_request_id: string;
      }),
    };
  }

  function auditKinds(): string[] {
    return (
      fx.raw
        .prepare(
          "SELECT kind FROM audit WHERE project_id = ? ORDER BY at ASC, event_id ASC",
        )
        .all(PROJECT) as { kind: string }[]
    ).map((r) => String(r.kind));
  }

  it("a ROW-CAP eviction while a scan is running suspends it and writes ONE audit row", async () => {
    // The backfill is consuming itself: every page it walks costs a page it
    // already walked, and it will never finish however long it runs. Stopping it
    // is the whole of D-08, and stopping it WITHOUT saying why would leave the
    // operator with a scan that halted for no visible reason.
    await putSetting(
      fx.db,
      GLOBAL_PROJECT_ID,
      RETENTION_MAX_ROWS_KEY,
      "40",
      Date.now(),
    );
    seedArtifacts(100, Date.now() - 1_000);
    seedRunningScan();

    const p = plan([
      { id: "r1", url: "https://x.test/a.js", bytes: body("trigger") },
    ]);
    p.offer();
    await runOnce(p.overrides);

    const row = scanState();
    expect(row.state).toBe("suspended");
    expect(row.suspend_reason).toBe("retention_eviction");
    // THE POSITION IS KEPT. The remedy the copy names is "raise the cap, then
    // resume" — and a resume needs somewhere to resume from.
    expect(row.last_request_id).toBe("9001");
    expect(auditKinds()).toEqual(["scan_suspended_by_retention"]);
  });

  it("an AGE-BOUND trim with a running scan suspends NOTHING and records NOTHING", async () => {
    // THE NEGATIVE PATH, EXECUTED. Both bounds delete rows and both report into
    // `deleted`; only one of them means the backfill is eating itself. If this
    // case ever goes red, DefMiner is cancelling operators' multi-hour scans
    // over routine housekeeping.
    seedArtifacts(10, ANCIENT());
    seedRunningScan();

    const p = plan([
      { id: "r1", url: "https://x.test/a.js", bytes: body("trigger") },
    ]);
    p.offer();
    await runOnce(p.overrides);

    // The sweep really did delete — otherwise this proves nothing at all.
    expect(counters.retentionDeleted).toBeGreaterThan(0);
    const row = scanState();
    expect(row.state).toBe("running");
    expect(row.suspend_reason).toBeNull();
    expect(auditKinds()).toEqual([]);
  });

  it("a row-cap eviction with NO running scan suspends nothing", async () => {
    await putSetting(
      fx.db,
      GLOBAL_PROJECT_ID,
      RETENTION_MAX_ROWS_KEY,
      "40",
      Date.now(),
    );
    seedArtifacts(100, Date.now() - 1_000);
    // A SUSPENDED scan is present and must stay suspended for the reason it
    // already carries: overwriting `operator_paused` would erase the only record
    // of why it actually stopped.
    fx.raw
      .prepare(
        `INSERT INTO scans (project_id, scan_id, state, suspend_reason, operator_filter,
                            epoch, last_request_id, last_cursor, last_created_at,
                            pages_walked, seen, admitted, skipped_done, rejected, queued,
                            started_at, updated_at, finished_at)
         VALUES (?, 'scan-paused', 'suspended', 'operator_paused', '', 0, '9001', NULL, NULL, 1, 1, 1, 0, 0, 0, ?, ?, NULL)`,
      )
      .run(PROJECT, Date.now(), Date.now());

    const p = plan([
      { id: "r1", url: "https://x.test/a.js", bytes: body("trigger") },
    ]);
    p.offer();
    await runOnce(p.overrides);

    expect(scanState("scan-paused").suspend_reason).toBe("operator_paused");
    expect(auditKinds()).toEqual([]);
  });

  it("the coupling is ONE branch at ONE call site", () => {
    // D-08 already flags coupling two subsystems as its cost. One branch at the
    // one place `sweepRetention` runs is what keeps that cost bounded; a second
    // call site anywhere would spread it, and this is the assertion that notices.
    const source = readFileSync(CONSUMER, "utf8");
    const calls = source.match(/suspendForRetentionEviction\(/g) ?? [];
    expect(calls).toHaveLength(1);
    expect(source).toContain("summary.rowCapDeleted > 0");
  });
});

// ===========================================================================
// O-07's DISPOSITION — THE AUTHORITATIVE SIZE CHECK IS AT THE RELOAD
// ===========================================================================

describe("the reload-side size gate — where the byte count is known good", () => {
  /** A body of exactly `n` bytes, allocated rather than generated per byte: at
   *  the `PASSIVE_MAX_BYTES` ceiling a per-byte loop is the slowest thing in the
   *  suite and buys nothing this case is about. */
  function sized(n: number): Uint8Array {
    const out = new Uint8Array(n);
    out.fill(0x2f); // '/', so the bytes decode as text and nothing throws
    return out;
  }

  it("a reloaded body ONE BYTE over the ceiling is counted and not analysed", async () => {
    const p = plan([
      {
        id: "r-big",
        url: "https://x.test/huge.js",
        bytes: sized(PASSIVE_MAX_BYTES + 1),
      },
    ]);
    p.offer();
    await runOnce(p.overrides);

    expect(counters.reloadOverSize).toBe(1);
    // NOTHING WAS WRITTEN. The gate is before the identity write, so an
    // oversized body costs a counter and nothing else.
    expect((await retentionCounts(fx.db, PROJECT)).artifacts).toBe(0);
    expect((await retentionCounts(fx.db, PROJECT)).analyses).toBe(0);
  });

  it("a body at EXACTLY the ceiling is admitted — the comparison is `>` and not `>=`", async () => {
    // The boundary executed on both sides. `PASSIVE_MAX_BYTES` is the largest
    // body DefMiner analyses, not the smallest it refuses, and an off-by-one
    // here would silently drop every artifact at the ceiling the live hook
    // already admits.
    const p = plan([
      {
        id: "r-exact",
        url: "https://x.test/exact.js",
        bytes: sized(PASSIVE_MAX_BYTES),
      },
    ]);
    p.offer();
    await runOnce(p.overrides, { signal: { aborted: true } });

    expect(counters.reloadOverSize).toBe(0);
    // It got past the gate: the identity write happened. The ANALYSIS is
    // deliberately aborted by the signal above — walking eight megabytes to
    // prove a comparison operator would be the slowest case in the suite and
    // would be testing the walk rather than the gate.
    expect((await retentionCounts(fx.db, PROJECT)).artifacts).toBe(1);
  });
});

// ===========================================================================
// PHASE 7 — D-08's RECONSTRUCTION STAGE, THROUGH THE REAL CONSUMER
// ===========================================================================
//
// THE TRACER'S CLAIM, and it is deliberately end-to-end rather than unit-shaped:
// one admitted bundle carrying an inline map leaves `sources` and
// `source_sightings` rows behind, written by the RUNNING consumer over the real
// store modules and the real migration. Nothing about the parse, the store or
// the schema is mocked here for the same reason the four Phase 1 claims are not:
// a mocked `upsertRecoveredSource` would prove the consumer CALLS something,
// which is not the claim.
//
// The fixtures below are built HERE rather than imported from
// `map-fixture.ts`, and that is not a fork of the corpus. That module is the
// HOSTILE and STRUCTURAL corpus — the shapes a target serves to break a parser —
// and every case in it is imported by the specs that need it. What this section
// needs is a WELL-FORMED map with a known source count, which the corpus does
// not carry and should not: it is a control, not a hazard.

/** A well-formed map document declaring `labels.length` sources with content. */
function mapDocument(labels: readonly string[], contents: readonly string[]) {
  return JSON.stringify({
    version: 3,
    file: "app.js",
    sources: labels,
    sourcesContent: contents,
    names: [],
    mappings: "AAAA",
  });
}

/** A bundle that ANNOUNCES `doc` inline, in the spelling every real bundler emits.
 *
 *  `lead` is the code BEFORE the announcement, and it is a parameter rather than
 *  a constant because it is load-bearing at the size boundary: the announcement
 *  has to fall inside `SOURCEMAP_TAIL_WINDOW_BYTES`, and that window is derived
 *  to be exactly wide enough for a map at `MAP_MAX_BYTES` plus
 *  `ANNOUNCEMENT_PREFIX_MAX`. A one-over-the-ceiling case with a leading comment
 *  would be missed by the SCAN rather than refused by the GATE — which would
 *  pass a test that is asserting the wrong thing. */
function bundleAnnouncingInline(
  doc: string,
  lead = "console.log(1);\n",
): Uint8Array {
  const payload = Buffer.from(doc, "utf8").toString("base64");
  return Buffer.from(
    lead +
      "//# sourceMappingURL=data:application/json;base64," +
      payload +
      "\n",
    "utf8",
  );
}

/** A well-formed map document of EXACTLY `target` bytes, padded in its content. */
function mapOfExactlyBytes(target: number): string {
  const empty = mapDocument(["s"], [""]);
  return mapDocument(
    ["s"],
    ["x".repeat(target - Buffer.byteLength(empty, "utf8"))],
  );
}

/** A bundle announcing an EXTERNAL map — the D-03 case, never fetched. */
function bundleAnnouncingExternal(url: string): Uint8Array {
  return Buffer.from(
    "console.log(1);\n//# sourceMappingURL=" + url + "\n",
    "utf8",
  );
}

async function countTable(table: string): Promise<number> {
  const stmt = await fx.db.prepare(
    "SELECT COUNT(*) AS n FROM " + table + " WHERE project_id = ?",
  );
  const row = await stmt.get<{ n: number }>(PROJECT);
  return row?.n ?? 0;
}

describe("D-08's stage sits where `visit` cannot reach, and the placement is asserted", () => {
  const CONSUMER = fileURLToPath(new URL("./consumer.ts", import.meta.url));

  /** The parsed consumer, so both cases below reason over structure rather than
   *  over text. A TEXT search is not available for the placement question: the
   *  file now contains TWO `reconstruct(` call sites — the depth-0 one in
   *  `analyseAndFinish` and the depth-1 recursion inside `reconstruct` itself —
   *  and the recursion appears FIRST in the file, so an `indexOf` would compare
   *  the wrong offsets and pass or fail for the wrong reason. */
  function parsed(): { sf: ts.SourceFile; source: string } {
    const source = readFileSync(CONSUMER, "utf8");
    return {
      source,
      sf: ts.createSourceFile(
        "consumer.ts",
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      ),
    };
  }

  /** The body of the named function declaration, or undefined. */
  function bodyOf(sf: ts.SourceFile, name: string): ts.Node | undefined {
    let found: ts.Node | undefined;
    const visit = (n: ts.Node): void => {
      if (
        ts.isFunctionDeclaration(n) &&
        n.name !== undefined &&
        n.name.text === name
      ) {
        found = n.body;
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
    return found;
  }

  /** Where each named call happens INSIDE `scope`, in file order. */
  function callOffsets(
    sf: ts.SourceFile,
    scope: ts.Node,
    callee: string,
  ): number[] {
    const out: number[] = [];
    const visit = (n: ts.Node): void => {
      if (
        ts.isCallExpression(n) &&
        ts.isIdentifier(n.expression) &&
        n.expression.text === callee
      ) {
        out.push(n.getStart(sf));
      }
      ts.forEachChild(n, visit);
    };
    visit(scope);
    return out;
  }

  it("calls reconstruct AFTER `walk(` and BEFORE `finishAnalysis(`, inside analyseAndFinish", () => {
    // THE THREE OFFSETS, COMPARED, AND SCOPED TO ONE FUNCTION. RESEARCH found the
    // structural fact that makes D-08's literal reading impossible — `visit` is
    // `(window: Window) => void`, synchronous, and every write in the stage is
    // awaited — so the stage runs in `analyseAndFinish` between the walk and the
    // finish. This is what stops it drifting back: an edit that moved the call
    // above the walk or below the finish turns it red.
    const { sf } = parsed();
    const scope = bodyOf(sf, "analyseAndFinish");
    expect(scope, "consumer.ts declares no analyseAndFinish").toBeDefined();
    if (scope === undefined) return;

    const walks = callOffsets(sf, scope, "walk");
    const recons = callOffsets(sf, scope, "reconstruct");
    const finishes = callOffsets(sf, scope, "finishAnalysis");
    expect(walks.length, "analyseAndFinish no longer walks").toBe(1);
    expect(
      recons.length,
      "analyseAndFinish does not call reconstruct exactly once",
    ).toBe(1);
    expect(finishes.length).toBe(1);
    expect(
      recons[0],
      "the reconstruction stage is not AFTER the walk. It must be: the walk owns " +
        "the deadline and the artifact's first slice, and the announcement is at " +
        "the tail of a payload the walk has already read.",
    ).toBeGreaterThan(walks[0]);
    expect(
      recons[0],
      "the reconstruction stage is not BEFORE finishAnalysis. It must be: " +
        "finishAnalysis is the statement that persists the scan_state, the error " +
        "code and the max_slice_ms this stage decided.",
    ).toBeLessThan(finishes[0]);
  });

  it("no `visit` callback awaits or writes — the stage did not move into one", () => {
    // THE PROHIBITION, EXECUTED, AND OVER EVERY `visit` IN THE FILE. There are
    // two walks now — the artifact's and the derived source's — and neither
    // callback may become the stage. `visit` is `(window: Window) => void`:
    // synchronous, returning void, so it cannot await the store at all, and a
    // sourcemap is not a per-window object anyway. The announcement is at the
    // tail and JSON.parse needs the whole map.
    const { sf } = parsed();
    const bodies: string[] = [];
    const collect = (n: ts.Node): void => {
      if (
        ts.isPropertyAssignment(n) &&
        ts.isIdentifier(n.name) &&
        n.name.text === "visit"
      ) {
        bodies.push(n.initializer.getText(sf));
      }
      ts.forEachChild(n, collect);
    };
    collect(sf);
    expect(
      bodies.length,
      "consumer.ts declares no `visit` callback at all",
    ).toBeGreaterThanOrEqual(1);
    for (const body of bodies) {
      for (const forbidden of [
        "await",
        "reconstruct",
        "upsertRecoveredSource",
        "recordSighting",
        "findAnnouncement",
      ]) {
        expect(
          body.includes(forbidden),
          `a \`visit\` callback references ${forbidden}. The reconstruction stage ` +
            `moved into the walk's per-window seam, which cannot await the store ` +
            `and is the wrong shape for a tail-announced, whole-payload object.`,
        ).toBe(false);
      }
    }
    // The ARTIFACT walk's callback is still the Phase 3 no-op, specifically.
    expect(
      bodies.some((b) => b.includes("Phase 3 puts the detector here")),
      "the artifact walk's `visit` is no longer the Phase 3 no-op",
    ).toBe(true);
  });
});

describe("one admitted bundle carrying an inline map produces source rows", () => {
  const LABELS = ["src/a.ts", "src/b.ts", "src/c.ts"];
  const CONTENTS = [
    "export const a = 1;\n",
    "export const b = 2;\n",
    "let c;\n",
  ];

  it("writes exactly N sources and N sightings for a map declaring N sources", async () => {
    const bytes = bundleAnnouncingInline(mapDocument(LABELS, CONTENTS));
    const p = plan([{ id: "r1", url: "https://x.test/app.js", bytes }]);
    p.offer();
    await runOnce(p.overrides);

    expect(
      await countTable("sources"),
      "no sources rows. THIS is the assertion that fails if the reconstruction " +
        "stage is removed — it does not pass with fewer rows.",
    ).toBe(LABELS.length);
    expect(await countTable("source_sightings")).toBe(LABELS.length);
    expect(counters.sourcemap.announcedInline).toBe(1);
    expect(counters.sourcemap.announcedExternal).toBe(0);
    expect(counters.sourcemap.sourcesRecovered).toBe(LABELS.length);
    expect(counters.sourcemap.sightingsRecorded).toBe(LABELS.length);
  });

  it("finishes `done` with a NULL error — a recovered map is not a degradation", async () => {
    const bytes = bundleAnnouncingInline(mapDocument(LABELS, CONTENTS));
    const p = plan([{ id: "r1", url: "https://x.test/app.js", bytes }]);
    p.offer();
    await runOnce(p.overrides);

    const rows = await listObservations(fx.db, PROJECT);
    const row = await getAnalysis(
      fx.db,
      PROJECT,
      rows[0].sha256,
      DETECTOR_CORPUS_VERSION,
    );
    expect(row?.scan_state).toBe("done");
    expect(row?.error).toBeNull();
  });

  it("stores the label VERBATIM and never the content — D-07 from the outside", async () => {
    const bytes = bundleAnnouncingInline(mapDocument(LABELS, CONTENTS));
    const p = plan([{ id: "r1", url: "https://x.test/app.js", bytes }]);
    p.offer();
    await runOnce(p.overrides);

    const stmt = await fx.db.prepare(
      "SELECT sources_verbatim, source_index FROM source_sightings WHERE project_id = ? ORDER BY source_index",
    );
    const rows = await stmt.all<{
      sources_verbatim: string;
      source_index: number;
    }>(PROJECT);
    expect(rows.map((r) => r.sources_verbatim)).toEqual(LABELS);
    // The CONTENT is nowhere. Asserted by searching every column of the row
    // rather than by reading the schema: `store/schema.spec.ts` polices the
    // column set, and this polices the values that actually landed.
    const all = await (
      await fx.db.prepare("SELECT * FROM sources WHERE project_id = ?")
    ).all<Record<string, unknown>>(PROJECT);
    for (const source of all) {
      for (const value of Object.values(source)) {
        expect(
          typeof value === "string" && value.includes("export const a"),
          "a recovered source's CONTENT reached a column. D-07 keeps a digest, a " +
            "size and a line count — never the bytes.",
        ).toBe(false);
      }
    }
  });

  it("counts a source seen through two bundles ONCE in `sources` and TWICE in sightings", async () => {
    // MAP-06's once-per-content-hash guarantee, and it falls out of the primary
    // keys rather than out of a new mechanism. Two different maps carrying the
    // same module: one `sources` row, two sightings.
    const shared = ["export const shared = 1;\n"];
    const a = bundleAnnouncingInline(mapDocument(["a/x.ts"], shared));
    const b = bundleAnnouncingInline(mapDocument(["b/x.ts"], shared));
    const p = plan([
      { id: "r1", url: "https://x.test/one.js", bytes: a },
      { id: "r2", url: "https://x.test/two.js", bytes: b },
    ]);
    p.offer();
    await runOnce(p.overrides);

    expect(await countTable("sources")).toBe(1);
    expect(await countTable("source_sightings")).toBe(2);
  });
});

describe("D-03 — an external announcement is a counter and nothing else", () => {
  it("writes ZERO rows, finishes `done`, and increments announcedExternal once", async () => {
    const bytes = bundleAnnouncingExternal("https://cdn.evil.test/app.js.map");
    const p = plan([{ id: "r1", url: "https://x.test/app.js", bytes }]);
    p.offer();
    await runOnce(p.overrides);

    expect(counters.sourcemap.announcedExternal).toBe(1);
    expect(counters.sourcemap.announcedInline).toBe(0);
    expect(await countTable("sources")).toBe(0);
    expect(await countTable("source_sightings")).toBe(0);

    const rows = await listObservations(fx.db, PROJECT);
    const row = await getAnalysis(
      fx.db,
      PROJECT,
      rows[0].sha256,
      DETECTOR_CORPUS_VERSION,
    );
    // NOT an error and NOT a degradation. D-01 refuses the fetch by design, so
    // the artifact analysed exactly as far as this phase goes.
    expect(row?.scan_state).toBe("done");
    expect(row?.error).toBeNull();
  });

  it("issues no outbound request — the fake SDK has no surface that could", async () => {
    // The structural half of D-01: `outbound-prohibition.spec.ts` walks this
    // consumer for a forbidden specifier. What THIS asserts is behavioural — the
    // announced URL is never even read back out of the announcement, so there is
    // nothing at rest for a later phase to accidentally fetch.
    const bytes = bundleAnnouncingExternal("https://cdn.evil.test/app.js.map");
    const p = plan([{ id: "r1", url: "https://x.test/app.js", bytes }]);
    p.offer();
    await runOnce(p.overrides);

    const stmt = await fx.db.prepare(
      "SELECT url FROM observations WHERE project_id = ?",
    );
    const rows = await stmt.all<{ url: string }>(PROJECT);
    for (const row of rows) {
      expect(row.url.includes("cdn.evil.test")).toBe(false);
    }
  });
});

describe("MAP-06's three EMPTY outcomes stay distinguishable", () => {
  it("no announcement — no rows, no error, `done`", async () => {
    const p = plan([
      { id: "r1", url: "https://x.test/plain.js", bytes: body("plain") },
    ]);
    p.offer();
    await runOnce(p.overrides);

    expect(await countTable("sources")).toBe(0);
    expect(counters.sourcemap.announcedInline).toBe(0);
    expect(counters.sourcemap.announcedExternal).toBe(0);
    const rows = await listObservations(fx.db, PROJECT);
    const row = await getAnalysis(
      fx.db,
      PROJECT,
      rows[0].sha256,
      DETECTOR_CORPUS_VERSION,
    );
    expect(row?.scan_state).toBe("done");
    expect(row?.error).toBeNull();
  });

  it("a map that parsed and carried NO sourcesContent — no rows, `done`, no error", async () => {
    // Pitfall 3 / UI-09. `sourcesContent` is OPTIONAL in ECMA-426, so a map that
    // parses and yields nothing has done everything it can. Telling the operator
    // "nothing there" is not the same as telling them something failed.
    const doc = JSON.stringify({
      version: 3,
      file: "app.js",
      sources: ["src/a.ts"],
      names: [],
      mappings: "AAAA",
    });
    const p = plan([
      {
        id: "r1",
        url: "https://x.test/app.js",
        bytes: bundleAnnouncingInline(doc),
      },
    ]);
    p.offer();
    await runOnce(p.overrides);

    expect(await countTable("sources")).toBe(0);
    expect(counters.sourcemap.announcedInline).toBe(1);
    const rows = await listObservations(fx.db, PROJECT);
    const row = await getAnalysis(
      fx.db,
      PROJECT,
      rows[0].sha256,
      DETECTOR_CORPUS_VERSION,
    );
    expect(row?.scan_state).toBe("done");
    expect(row?.error).toBeNull();
  });

  it("a REFUSED map — no rows, `partial`, and a namespaced reason CODE", async () => {
    // D-11, and Phase 7 is the FIRST writer of a non-null `analyses.error` from
    // this path. The code is DefMiner's word end to end: a fixed prefix and a
    // member of a frozen array. Nothing a driver or a parser said is in it.
    const p = plan([
      {
        id: "r1",
        url: "https://x.test/app.js",
        bytes: bundleAnnouncingInline("{not json at all"),
      },
    ]);
    p.offer();
    await runOnce(p.overrides);

    expect(await countTable("sources")).toBe(0);
    expect(counters.sourcemap.mapMalformed).toBe(1);
    expect(counters.sourcemap.mapRefused.malformed_json).toBe(1);
    expect(counters.sourcemap.mapRefusedTooLarge).toBe(0);

    const rows = await listObservations(fx.db, PROJECT);
    const row = await getAnalysis(
      fx.db,
      PROJECT,
      rows[0].sha256,
      DETECTOR_CORPUS_VERSION,
    );
    expect(row?.scan_state).toBe("partial");
    expect(row?.error).toBe(mapRefusalCode("malformed_json"));
    expect(row?.error?.startsWith(MAP_REFUSAL_CODE_PREFIX)).toBe(true);
  });

  it("a map over MAP_MAX_BYTES is REFUSED, never truncated and never partly parsed", async () => {
    // REFUSE, NEVER TRUNCATE. A truncated map decodes to WRONG POSITIONS rather
    // than to an error, which is the quiet-wrongness class every gate here
    // exists to prevent.
    // ONE QUANTUM OVER, not a megabyte over, and the tightness is the point: the
    // gate compares the ENCODED length against `encodedCeiling(MAP_MAX_BYTES)`
    // BEFORE anything is allocated, so the case has to sit just past that
    // boundary to prove the comparison rather than the allocator. No leading
    // code, so the announcement still falls inside the derived tail window.
    const huge = mapOfExactlyBytes(MAP_MAX_BYTES + 5);
    const p = plan([
      {
        id: "r1",
        url: "https://x.test/app.js",
        bytes: bundleAnnouncingInline(huge, ""),
      },
    ]);
    p.offer();
    await runOnce(p.overrides);

    expect(counters.sourcemap.mapRefusedTooLarge).toBe(1);
    expect(counters.sourcemap.mapRefused.too_large).toBe(1);
    expect(counters.sourcemap.mapMalformed).toBe(0);
    expect(await countTable("sources")).toBe(0);
    expect(await countTable("source_sightings")).toBe(0);

    const rows = await listObservations(fx.db, PROJECT);
    const row = await getAnalysis(
      fx.db,
      PROJECT,
      rows[0].sha256,
      DETECTOR_CORPUS_VERSION,
    );
    expect(row?.scan_state).toBe("partial");
    expect(row?.error).toBe(mapRefusalCode("too_large"));
  });
});

describe("CORE-10 — max_slice_ms is the maximum over BOTH stages", () => {
  it("the column and the in-memory maximum take the SAME number", async () => {
    // ASSERTED AS AN EQUALITY, not as two independent expectations. Two
    // expectations both pass when the two numbers are wrong in the same way; an
    // equality is what fails when `finishAnalysis` is handed the walk's number
    // alone while `recordSlice` gets the maximum.
    const bytes = bundleAnnouncingInline(
      mapDocument(["src/a.ts"], ["export const a = 1;\n"]),
    );
    const p = plan([{ id: "r1", url: "https://x.test/app.js", bytes }]);
    p.offer();
    await runOnce(p.overrides);

    const rows = await listObservations(fx.db, PROJECT);
    const row = await getAnalysis(
      fx.db,
      PROJECT,
      rows[0].sha256,
      DETECTOR_CORPUS_VERSION,
    );
    expect(
      row?.max_slice_ms,
      "analyses.max_slice_ms disagrees with the in-memory maximum getStatus() " +
        "reports. They are taken one statement apart from the SAME expression " +
        "precisely so they cannot drift.",
    ).toBe(slimStatus().maxSliceMs);
  });

  it("reports the RECONSTRUCTION stretch when it dominates the walk's", async () => {
    // THE NUMBER CORE-10 EXISTS FOR. Reconstruction runs AFTER the walk returns,
    // so its synchronous stretch is not in `result.maxSliceMs` at all — a
    // consumer that passed the walk's number alone would report 1 ms while the
    // thread sat blocked in a JSON.parse.
    //
    // DRIVEN DETERMINISTICALLY rather than raced against a real parse: the
    // injected clock steps by 1 until the first sighting lands, then by 500. The
    // walk is long over by then, so the only stretch that can carry the large
    // step is the SECOND source's — which is inside the stage.
    let step = 1;
    let t = 0;
    const clock = (): number => {
      t += step;
      return t;
    };
    const db = {
      exec: fx.db.exec.bind(fx.db),
      prepare: async (sql: string) => {
        const stmt = await fx.db.prepare(sql);
        if (!sql.includes("INSERT INTO source_sightings")) return stmt;
        return {
          get: stmt.get.bind(stmt),
          all: stmt.all.bind(stmt),
          run: async (...args: unknown[]) => {
            step = 500;
            return stmt.run(...(args as never[]));
          },
        };
      },
    };
    const bytes = bundleAnnouncingInline(
      mapDocument(["a.ts", "b.ts"], ["const a = 1;\n", "const b = 2;\n"]),
    );
    const p = plan([{ id: "r1", url: "https://x.test/app.js", bytes }]);
    p.offer();
    await runOnce(p.overrides, { now: clock, db });

    const rows = await listObservations(fx.db, PROJECT);
    const row = await getAnalysis(
      fx.db,
      PROJECT,
      rows[0].sha256,
      DETECTOR_CORPUS_VERSION,
    );
    expect(
      row?.max_slice_ms ?? 0,
      "max_slice_ms carries the WALK's number alone. Reconstruction runs after " +
        "the walk returns, so its stretch is invisible in that number — and " +
        "CORE-10's whole claim is that this column is the TRUE maximum.",
    ).toBeGreaterThanOrEqual(500);
    expect(row?.max_slice_ms).toBe(slimStatus().maxSliceMs);
  });
});

describe("MAP-01 — a project change mid-stage abandons the remaining writes", () => {
  it("leaves no partial source set attributed to the new project", async () => {
    // T-07-09, executed rather than described. The epoch callback changes
    // BETWEEN two source writes, which is the window `stillCurrent()` closes;
    // `epochAtEntry` is captured before the reload because the entry was
    // admitted under whatever project was active when the queue took it.
    const bytes = bundleAnnouncingInline(
      mapDocument(
        ["a.ts", "b.ts", "c.ts"],
        ["const a = 1;\n", "const b = 2;\n", "const c = 3;\n"],
      ),
    );
    const p = plan([{ id: "r1", url: "https://x.test/app.js", bytes }]);
    p.offer();

    let epoch = 0;
    let sightings = 0;
    const db = {
      exec: fx.db.exec.bind(fx.db),
      prepare: async (sql: string) => {
        const stmt = await fx.db.prepare(sql);
        if (!sql.includes("INSERT INTO source_sightings")) return stmt;
        return {
          get: stmt.get.bind(stmt),
          all: stmt.all.bind(stmt),
          run: async (...args: unknown[]) => {
            sightings += 1;
            // The project changes after the FIRST sighting lands.
            if (sightings === 1) epoch = 1;
            return stmt.run(...(args as never[]));
          },
        };
      },
    };
    await runOnce(p.overrides, { db, projectEpoch: () => epoch });

    expect(
      sightings,
      "the stage kept writing after the project changed. Every new write must " +
        "be immediately preceded by stillCurrent().",
    ).toBe(1);
    expect(counters.abandonedOnProjectChange).toBeGreaterThan(0);
    expect(await countTable("source_sightings")).toBe(1);
  });
});

// ===========================================================================
// D-13 — THE DEPTH BOUND, PROVEN BY A DETECTOR THAT EXISTS ONLY IN THE SUITE
// ===========================================================================
//
// T-07-31: an attacker-controlled body that recovers to another
// attacker-controlled body is unbounded work on the one thread. The bound is one
// level with no re-entry, and the reason it is wired NOW rather than left for
// Phase 3 is that a limit added after the recursive path already exists is a
// limit somebody has to remember.
//
// THE DETECTOR IS THE POINT. Asserting "the inner map produced no rows" alone
// would pass just as well if the recovered source never reached the pipeline at
// all — a bound over a path nobody executes. The injected `visitDerived` records
// every window it is handed, so the suite can say the recovered BYTES arrived and
// the announcement inside them was still not followed.

describe("D-13 — a recovered source enters the pipeline once, and never twice", () => {
  it("recovers the outer sources, refuses the inner announcement, and is SEEN doing it", async () => {
    // The recovered source is ITSELF a bundle announcing an inline map. If the
    // bound were missing, that inner map's two sources would land as rows.
    const inner = mapDocument(
      ["deep/one.ts", "deep/two.ts"],
      ["const one = 1;\n", "const two = 2;\n"],
    );
    const innerBundle = Buffer.from(bundleAnnouncingInline(inner)).toString(
      "utf8",
    );
    const outer = mapDocument(["outer/only.ts"], [innerBundle]);
    const bytes = bundleAnnouncingInline(outer);

    // THE TEST-ONLY DETECTOR. It exists nowhere in the shipped tree: `consumer.ts`
    // defaults `visitDerived` to the same Phase 3 no-op the artifact walk uses.
    const seen: Array<{ start: number; end: number }> = [];
    const p = plan([{ id: "r1", url: "https://x.test/app.js", bytes }]);
    p.offer();
    await runOnce(p.overrides, {
      visitDerived: (w) => {
        seen.push({ start: w.start, end: w.end });
      },
    });

    // (a) the OUTER bundle's sources were recovered — exactly one, and it is the
    //     inner bundle's text.
    expect(await countTable("sources")).toBe(1);
    expect(counters.sourcemap.sourcesRecovered).toBe(1);

    // (b) the INNER announcement was NOT followed. Its two sources are absent,
    //     which is what the row count says: one, not three.
    expect(
      await countTable("source_sightings"),
      "the inner map's sources landed. D-13's bound is one level with no " +
        "re-entry: a recovered source that itself announces a map is not " +
        "reconstructed a second time.",
    ).toBe(1);
    expect(counters.sourcemap.announcedInline).toBe(1);

    // (c) `depth_exceeded` fired exactly once — one recovered source, one
    //     depth-1 stage, one refusal. Counted rather than inferred.
    expect(counters.sourcemap.derivedRejected.depth_exceeded).toBe(1);

    // (d) THE DETECTOR SAW THE RECOVERED BYTES. Without this the three
    //     assertions above are equally satisfied by a path that never ran.
    expect(
      seen.length,
      "the derived walk never happened. The three row-count assertions above " +
        "are all satisfied by a recovered source that never entered the " +
        "pipeline at all — this is what tells them apart.",
    ).toBeGreaterThan(0);
    const observed = seen.reduce((max, w) => (w.end > max ? w.end : max), 0);
    expect(
      observed,
      "the derived walk was handed something other than the recovered source.",
    ).toBe(Buffer.byteLength(innerBundle, "utf8"));
  });

  it("does not fire depth_exceeded when nothing was recovered", async () => {
    // The counter must describe the bound firing, not the stage running. A
    // bundle with no map recovers nothing, so no depth-1 stage exists.
    const p = plan([
      { id: "r1", url: "https://x.test/plain.js", bytes: body("plain") },
    ]);
    p.offer();
    await runOnce(p.overrides);
    expect(counters.sourcemap.derivedRejected.depth_exceeded).toBe(0);
  });

  it("fires ONCE PER RECOVERED SOURCE, so the bound scales with what it bounds", async () => {
    const bytes = bundleAnnouncingInline(
      mapDocument(["a.ts", "b.ts"], ["const a = 1;\n", "const b = 2;\n"]),
    );
    const p = plan([{ id: "r1", url: "https://x.test/app.js", bytes }]);
    p.offer();
    await runOnce(p.overrides);
    expect(counters.sourcemap.derivedRejected.depth_exceeded).toBe(2);
  });
});

describe("D-14 — the derived path refuses by its OWN vocabulary, with no admit() call", () => {
  it("skips an EMPTY recovered source with a counter and no row", async () => {
    // `sourcesContent[i]` as the empty string is legal per ECMA-426 and reaches
    // the recovered list rather than the parser's skip list. It writes no row,
    // costs a counter, and the sources BESIDE it still land — a refused source
    // is not a refused map.
    const bytes = bundleAnnouncingInline(
      mapDocument(["a.ts", "empty.ts"], ["const a = 1;\n", ""]),
    );
    const p = plan([{ id: "r1", url: "https://x.test/app.js", bytes }]);
    p.offer();
    await runOnce(p.overrides);

    expect(counters.sourcemap.derivedRejected.empty).toBe(1);
    expect(await countTable("sources")).toBe(1);
    expect(await countTable("source_sightings")).toBe(1);

    // The MAP was not refused: `analyses` stays `done` with a null error.
    const rows = await listObservations(fx.db, PROJECT);
    const row = await getAnalysis(
      fx.db,
      PROJECT,
      rows[0].sha256,
      DETECTOR_CORPUS_VERSION,
    );
    expect(row?.scan_state).toBe("done");
    expect(row?.error).toBeNull();
  });

  it("leaves the ADMISSION counters completely untouched", async () => {
    // O-05's second argument, executed. A derived reason folded into
    // `REJECT_REASONS` would appear in `counters.rejected` — on the one surface
    // an operator consults to answer "is DefMiner keeping up with my browsing" —
    // describing something admission never did.
    const bytes = bundleAnnouncingInline(
      mapDocument(["a.ts", "empty.ts"], ["const a = 1;\n", ""]),
    );
    const p = plan([{ id: "r1", url: "https://x.test/app.js", bytes }]);
    p.offer();
    await runOnce(p.overrides);

    expect(counters.sourcemap.derivedRejected.empty).toBe(1);
    expect(counters.rejected.empty).toBe(0);
    expect(counters.rejected.too_large).toBe(0);
    expect(counters.retro.rejected.empty).toBe(0);
  });

  it("consumer.ts never calls admit() on the derived path", () => {
    // THE PROHIBITION, OVER THE AST. `contentTypeOf` is imported from
    // `hooks/admit.ts` and used at the reload — that is the LIVE path and it is
    // fine. What must not exist is an `admit(` call: admission answers status,
    // body presence, size, kind and scope, and a recovered `.ts` has no status,
    // no scope of its own and a kind that is whatever the developer wrote.
    const CONSUMER = fileURLToPath(new URL("./consumer.ts", import.meta.url));
    const sf = ts.createSourceFile(
      "consumer.ts",
      readFileSync(CONSUMER, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const calls: string[] = [];
    const visit = (n: ts.Node): void => {
      if (
        ts.isCallExpression(n) &&
        ts.isIdentifier(n.expression) &&
        n.expression.text === "admit"
      ) {
        calls.push(n.getText(sf));
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
    expect(
      calls,
      "consumer.ts calls admit(). D-14 gives the derived path its own entry " +
        "point precisely because three of admission's five axes have no answer " +
        "for a recovered source that is not invented.",
    ).toEqual([]);
  });
});
