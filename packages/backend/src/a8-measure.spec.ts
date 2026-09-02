// packages/backend/src/a8-measure.spec.ts — the A8 backstop, COMMITTED.
//
// WHY THIS FILE EXISTS AT ALL. Plan 07-05 carried the A8 backstop —
// "`RETENTION_SWEEP_MAX_ROWS`'s COST half re-checked against the new, more
// frequent cadence" — and it MEASURED it, with a scratch `a8-measure.spec.ts`
// that was deleted once the numbers were taken. The numbers went into
// `07-05-SUMMARY.md § "A8 — the cost half, measured"` and nowhere else, so the
// phase verifier correctly ABSTAINED on that truth rather than passing it on a
// SUMMARY's word (`07-VERIFICATION.md`, truth 11, `insufficient_spec`). A
// measurement nobody can re-run is a claim, not evidence. This is the harness,
// in the tree, so anyone at HEAD can re-derive the figures with one command.
//
// ===========================================================================
// IT ASSERTS BOUNDS. IT ASSERTS NO ELAPSED TIME, EVER.
// ===========================================================================
// The operator's instruction at Phase 7's UAT (gap 2): *"assert bounds, not
// timings, because wall-clock figures are machine-dependent"*. Every `expect`
// below takes a COUNT, a ROW TOTAL or a BOOLEAN. The elapsed milliseconds of
// both runs are PRINTED for a human to read beside 07-05's figures, and nothing
// is asserted about them.
//
// The repository already has one load-sensitive backstop and is living with the
// consequences: `tests/frontend-load.spec.ts`'s "drops no more frames than the
// stated allowance" asserts an absolute frame count, passes 3/3 in isolation and
// FAILS in full-suite runs under machine load — 52 of 396 frames over budget
// against an allowance of 8, reproduced at unmodified HEAD. It is a real
// measurement wearing a verdict it cannot support on a shared CPU. This file
// must not become the second one.
//
// ===========================================================================
// WHAT IT COSTS TO RUN, STATED UP FRONT AND DERIVED RATHER THAN REMEMBERED
// ===========================================================================
// The run is 07-05's, restated so the figures are comparable: MAP_BEARING
// artifacts, each carrying an inline map declaring SOURCES_PER_MAP sources with
// content. That is `MAP_BEARING * (ROWS_INSERTED_PER_ARTIFACT_MAX +
// ROWS_PER_RECOVERED_SOURCE * SOURCES_PER_MAP)` rows of ingest, printed by the
// run itself. Run B additionally SEEDS `BACKLOG_ROWS` aged rows directly.
// Both figures are computed from the constants below, never restated.
//
// The retention ceilings are the two the operator named: Run A at the shipped
// default (`DEFAULT_RETENTION_MAX_ROWS`), Run B at `CEILING_B`.

/* eslint-disable @typescript-eslint/require-await --
   The fake `requests.get` below is `async` WITH NO `await` INSIDE, deliberately
   and for the reason `ingest/consumer.spec.ts` states at length: the SDK
   declares `get(id): Promise<RequestResponseOpt | undefined>` and the consumer
   awaits it, so a fake returning a plain object would resolve SYNCHRONOUSLY and
   every run here would exercise an ordering the plugin never sees. */

import { RETENTION_MAX_ROWS_KEY } from "@defminer/engine/contract";
import { BoundedQueue } from "@defminer/engine/queue";
import {
  QUEUE_CAP,
  ROWS_INSERTED_PER_ARTIFACT_MAX,
} from "@defminer/engine/thresholds";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  type FakeSdkOverrides,
  makeFakeRequest,
  makeFakeResponse,
  makeFakeSdk,
} from "../test/fixtures/fake-sdk";
import {
  createFixtureDb,
  type SqliteFixture,
} from "../test/fixtures/sqlite-fixture";

import type { EnqueueClock } from "./hooks/passive";
import {
  type ConsumerDeps,
  resetConsumerForTest,
  startConsumer,
} from "./ingest/consumer";
import { migrate } from "./store/migrations";
import { RETENTION_PASS_LIMITS, retentionCounts } from "./store/retention";
import {
  DEFAULT_RETENTION_MAX_ROWS,
  GLOBAL_PROJECT_ID,
  putSetting,
} from "./store/settings";
import { counters, resetTelemetryForTest } from "./telemetry";

const PROJECT = "project-one";

/** 07-05's synthetic run, restated so the figures are comparable. */
const MAP_BEARING = 40;
const SOURCES_PER_MAP = 100;

/** D-05's identity: one recovered source costs a `sources` row and a
 *  `source_sightings` row. The same two-rows-per-source conversion
 *  `SOURCE_ROWS_PER_MAP_MAX`'s gate performs, and the reason 07-05's arithmetic
 *  reads `40 x (3 + 2x100)`. */
const ROWS_PER_RECOVERED_SOURCE = 2;

/** What one map-bearing artifact inserts, and what the whole ingest inserts.
 *  DERIVED, so an edit to `ROWS_INSERTED_PER_ARTIFACT_MAX` moves it. */
const ROWS_PER_MAP_BEARING_ARTIFACT =
  ROWS_INSERTED_PER_ARTIFACT_MAX + ROWS_PER_RECOVERED_SOURCE * SOURCES_PER_MAP;
const ROWS_INSERTED_BY_RUN = MAP_BEARING * ROWS_PER_MAP_BEARING_ARTIFACT;

/** Run B's aged backlog, split across THREE tables so the two Phase 7 tables
 *  participate. Before plan 07-13 the sweep could reach neither of them, which
 *  is precisely why the original measurement recorded `retentionDeleted` as 0
 *  in Run A and surfaced deferred item D1. */
const BACKLOG_ARTIFACTS = 10_000;
const BACKLOG_SIGHTINGS = 6_000;
const BACKLOG_SOURCES = 4_000;
const BACKLOG_ROWS = BACKLOG_ARTIFACTS + BACKLOG_SIGHTINGS + BACKLOG_SOURCES;

/** Run B's retention row ceiling — the cost case the operator named. */
const CEILING_B = 100;

/**
 * Leading characters that mark a SEEDED row, chosen from OUTSIDE the hex digest
 * alphabet.
 *
 * NOT COSMETIC — it is the difference between this run measuring the sweep and
 * measuring nothing. The seeded backlog has to be told apart from the run's own
 * rows AFTER the sweep, and the only handle a raw row offers is its digest. The
 * first version of this file marked seeded sources with `"e"`, which is a
 * perfectly good hex character: roughly one in sixteen of the run's OWN
 * recovered-source digests starts with it, so the "surviving backlog" query
 * matched three of the run's own rows and reported a drain failure that had not
 * happened. `z` and `y` cannot appear in a sha256 hex digest, so the query
 * matches seeded rows and only seeded rows. The columns CHECK length 64 and
 * nothing else, so a non-hex marker is legal.
 */
const SEEDED_SOURCE_MARK = "z";
const SEEDED_ARTIFACT_MARK = "y";

/** How old "aged" is. Well past `DEFAULT_RETENTION_MAX_AGE_MS`, so the backlog
 *  is eligible under BOTH bounds and the run is not a test of which one binds. */
const AGED_MS = 400 * 24 * 60 * 60 * 1000;

let fx: SqliteFixture;
let queue: BoundedQueue;
let enqueuedAt: EnqueueClock;
let now: number;

beforeEach(async () => {
  resetConsumerForTest();
  fx = createFixtureDb();
  const report = await migrate(fx.db);
  expect(report.ok, JSON.stringify(report.steps)).toBe(true);
  queue = new BoundedQueue(QUEUE_CAP);
  resetTelemetryForTest();
  enqueuedAt = new Map();
  now = Date.now();
});

afterEach(() => {
  resetConsumerForTest();
  fx.close();
});

/** A 64-character digest from a short seed. */
function digest(seed: string): string {
  return seed.padEnd(64, "0");
}

/** A well-formed map declaring `SOURCES_PER_MAP` sources WITH content, unique
 *  to `n` in every source body — so every artifact recovers
 *  `SOURCES_PER_MAP` NEW content hashes and really does insert
 *  `ROWS_PER_MAP_BEARING_ARTIFACT` rows. Shared content would dedupe by digest
 *  and the run would insert fewer rows than its own arithmetic claims. */
function mapDocument(n: number): string {
  const labels: string[] = [];
  const contents: string[] = [];
  for (let i = 0; i < SOURCES_PER_MAP; i += 1) {
    labels.push("src/a" + String(n) + "/m" + String(i) + ".ts");
    contents.push(
      "export const v" +
        String(n) +
        "_" +
        String(i) +
        " = " +
        String(n * 1000 + i) +
        ";\n",
    );
  }
  return JSON.stringify({
    version: 3,
    file: "app.js",
    sources: labels,
    sourcesContent: contents,
    names: [],
    mappings: "AAAA",
  });
}

/** A bundle announcing `doc` inline, in the spelling every real bundler emits. */
function bundleAnnouncingInline(doc: string, lead: string): Uint8Array {
  const payload = Buffer.from(doc, "utf8").toString("base64");
  return Buffer.from(
    lead +
      "//# sourceMappingURL=data:application/json;base64," +
      payload +
      "\n",
    "utf8",
  );
}

type Planned = { id: string; url: string; bytes: Uint8Array };

/** The `MAP_BEARING` bundles this run ingests, each with its own map. */
function plannedRun(): Planned[] {
  const out: Planned[] = [];
  for (let n = 0; n < MAP_BEARING; n += 1) {
    out.push({
      id: "r" + String(n),
      url: "https://x.test/app" + String(n) + ".js",
      bytes: bundleAnnouncingInline(
        mapDocument(n),
        "// bundle " + String(n) + "\nconsole.log(" + String(n) + ");\n",
      ),
    });
  }
  return out;
}

function offer(entries: Planned[]): FakeSdkOverrides {
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const e of entries) {
    queue.offer({ id: e.id, bytes: e.bytes.length, kind: "js" });
    enqueuedAt.set(e.id, Date.now());
  }
  return {
    get: async (id: string) => {
      const e = byId.get(id);
      if (e === undefined) return undefined;
      return {
        request: makeFakeRequest({ id: e.id, url: e.url }),
        response: makeFakeResponse({
          id: e.id,
          code: 200,
          headers: { "content-type": ["application/javascript"] },
          bodyBytes: e.bytes,
        }),
      };
    },
  };
}

function deps(): ConsumerDeps {
  return {
    queue,
    db: fx.db,
    enqueuedAt,
    getProjectId: () => Promise.resolve(PROJECT),
  };
}

/** Start the consumer, drain to completion, stop — and report the elapsed
 *  milliseconds WITHOUT asserting anything about them. */
async function driveRun(overrides: FakeSdkOverrides): Promise<number> {
  const sdk = makeFakeSdk(overrides);
  const handle = startConsumer(sdk, deps());
  const started = Date.now();
  await handle.drainNow();
  const elapsed = Date.now() - started;
  handle.stop();
  return elapsed;
}

/** Seed `count` AGED artifacts directly. Arranging a database state, not
 *  exercising the write path. */
function seedAgedArtifacts(count: number): void {
  const stmt = fx.raw.prepare(
    `INSERT INTO artifacts (project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
  );
  const at = now - AGED_MS;
  for (let i = 0; i < count; i += 1) {
    const sha = SEEDED_ARTIFACT_MARK + String(i).padStart(63, "0");
    stmt.run(PROJECT, sha, 100, "js", at, at + i);
  }
}

/** Seed `count` AGED sightings of a bundle that does not exist, so they are
 *  eligible three ways over: by age, by the row cap, and as orphans of the
 *  cascade. `source_sha256` is NULL — legal per Pitfall 3, an index the map
 *  declared and shipped no content for — so these rows say nothing about the
 *  `sources` backlog seeded beside them. */
function seedAgedSightings(count: number): void {
  const stmt = fx.raw.prepare(
    `INSERT INTO source_sightings (project_id, map_sha256, source_index, artifact_sha256,
                                   request_id, source_sha256, sources_verbatim,
                                   producibility, producibility_at, recovered_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, 'producible', NULL, ?)`,
  );
  const at = now - AGED_MS;
  const gone = digest("dead");
  for (let i = 0; i < count; i += 1) {
    stmt.run(
      PROJECT,
      digest("c" + String(i)),
      i,
      gone,
      "req-" + String(i),
      "src/aged/" + String(i) + ".ts",
      at + i,
    );
  }
}

/** Seed `count` `sources` rows NO sighting names, which is exactly what the
 *  anti-join exists to remove. */
function seedUnsightedSources(count: number): void {
  const stmt = fx.raw.prepare(
    `INSERT INTO sources (project_id, source_sha256, byte_len, line_count, first_seen_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const at = now - AGED_MS;
  for (let i = 0; i < count; i += 1) {
    stmt.run(
      PROJECT,
      SEEDED_SOURCE_MARK + String(i).padStart(63, "0"),
      100,
      4,
      at + i,
    );
  }
}

/** Every counted table's rows, summed — the "surviving row count" both runs
 *  report. */
function totalRows(
  counts: Awaited<ReturnType<typeof retentionCounts>>,
): number {
  return (
    counts.artifacts +
    counts.observations +
    counts.analyses +
    counts.audit +
    counts.scans +
    counts.sources +
    counts.source_sightings
  );
}

describe("A8 — the retention sweep's COST half, re-derivable at HEAD", () => {
  it("Run A — no backlog, the shipped ceiling: the sweep costs bounded counts and NOTHING else", async () => {
    // THE STEADY STATE. Nothing is eligible, so a sweep is three bounded counts
    // on a pooled connection and no delete at all. What this asserts is that the
    // 40x frequency increase 07-05's cadence fix produced is FREE when there is
    // nothing to do — which is the half of the cost question a table of
    // millisecond figures cannot answer on someone else's machine.
    const elapsed = await driveRun(offer(plannedRun()));
    const after = await retentionCounts(fx.db, PROJECT);

    // PRINTED FOR A HUMAN TO READ beside 07-05-SUMMARY.md's figures, and
    // asserted on by nothing. This is the whole of what the operator asked of
    // the wall clock: a number a reader can compare, never a verdict.
    // eslint-disable-next-line no-console
    console.log(
      `[A8 Run A] ceiling=${String(DEFAULT_RETENTION_MAX_ROWS)} ` +
        `sweeps=${String(counters.retentionSweeps)} ` +
        `deleted=${String(counters.retentionDeleted)} ` +
        `rows=${String(totalRows(after))} elapsed=${String(elapsed)}ms`,
    );

    // THE CADENCE, AT THE A8 SCALE. One pass on the first iteration after
    // start, then one per RETENTION_SWEEP_EVERY_N ROWS — and one map-bearing
    // artifact inserts more rows than the interval on its own, so the crossing
    // count is the artifact count. With nothing eligible every crossing costs
    // exactly one pass (`moreWork` is false), so passes and crossings coincide
    // here and the counter can be read as either.
    expect(counters.processed).toBe(MAP_BEARING);
    expect(
      counters.retentionSweeps,
      `${String(counters.retentionSweeps)} sweeps over ${String(MAP_BEARING)} ` +
        `map-bearing artifacts. At ${String(ROWS_PER_MAP_BEARING_ARTIFACT)} ` +
        `rows each against an interval of ` +
        `${String(RETENTION_PASS_LIMITS.sweepEveryNRows)} rows, every artifact ` +
        `crosses it on its own.`,
    ).toBe(MAP_BEARING);

    // THE IDLE DELTA: nothing was eligible, so nothing was removed.
    expect(counters.retentionDeleted).toBe(0);

    // And the row counts are the run's own inserts, unchanged. BOTH NEW TABLES
    // ARE NAMED: the original measurement could not have made this assertion,
    // because `retentionCounts` did not report them.
    expect(after.artifacts).toBe(MAP_BEARING);
    expect(after.sources).toBe(MAP_BEARING * SOURCES_PER_MAP);
    expect(after.source_sightings).toBe(MAP_BEARING * SOURCES_PER_MAP);
    expect(totalRows(after)).toBe(ROWS_INSERTED_BY_RUN);
  });

  it("Run B — a 20,000-row aged backlog against a ceiling of 100: it DRAINS, and no pass overruns its cap", async () => {
    // THE COST CASE. The backlog is seeded across three tables, two of which
    // the sweep could not reach before plan 07-13 — which is why Run A's
    // original `retentionDeleted` was 0 and why deferred item D1 exists.
    expect(
      (
        await putSetting(
          fx.db,
          GLOBAL_PROJECT_ID,
          RETENTION_MAX_ROWS_KEY,
          String(CEILING_B),
          now,
        )
      ).ok,
    ).toBe(true);
    seedAgedArtifacts(BACKLOG_ARTIFACTS);
    seedAgedSightings(BACKLOG_SIGHTINGS);
    seedUnsightedSources(BACKLOG_SOURCES);

    const before = await retentionCounts(fx.db, PROJECT);
    expect(totalRows(before)).toBe(BACKLOG_ROWS);

    const elapsed = await driveRun(offer(plannedRun()));
    const after = await retentionCounts(fx.db, PROJECT);

    // PRINTED FOR A HUMAN TO READ beside 07-05-SUMMARY.md's figures, and
    // asserted on by nothing. This is the whole of what the operator asked of
    // the wall clock: a number a reader can compare, never a verdict.
    // eslint-disable-next-line no-console
    console.log(
      `[A8 Run B] ceiling=${String(CEILING_B)} ` +
        `backlog=${String(BACKLOG_ROWS)} ` +
        `sweeps=${String(counters.retentionSweeps)} ` +
        `deleted=${String(counters.retentionDeleted)} ` +
        `rows=${String(totalRows(after))} elapsed=${String(elapsed)}ms`,
    );

    // THE CROSSING COUNT IS STILL THE ARTIFACT COUNT — but a crossing with a
    // backlog now costs MORE THAN ONE PASS, and `retentionSweeps` counts
    // PASSES. 07-REVIEW.md HI-04's multi-pass drain landed AFTER 07-05 took its
    // measurement, so Run B's recorded "40 sweeps" is no longer reproducible as
    // an equality and is asserted as the bound it became: at least one pass per
    // crossing, at most `maxPasses` per crossing.
    expect(counters.processed).toBe(MAP_BEARING);
    expect(counters.retentionSweeps).toBeGreaterThanOrEqual(MAP_BEARING);
    expect(counters.retentionSweeps).toBeLessThanOrEqual(
      MAP_BEARING * RETENTION_PASS_LIMITS.maxPasses,
    );

    // THE PER-PASS DELETE BOUND, DERIVED FROM THE COUNTERS AND NOT FROM
    // INSTRUMENTING THE SWEEP. `RetentionSweepSummary` states that `deleted` is
    // never greater than `RETENTION_SWEEP_MAX_ROWS`; across a whole run that is
    // the same claim as this product. A bound the TARGET can overrun by serving
    // one big map is not a bound.
    expect(
      counters.retentionDeleted,
      `${String(counters.retentionDeleted)} rows deleted across ` +
        `${String(counters.retentionSweeps)} passes, which averages more than ` +
        `the per-pass cap of ` +
        `${String(RETENTION_PASS_LIMITS.maxRowsPerPass)}.`,
    ).toBeLessThanOrEqual(
      counters.retentionSweeps * RETENTION_PASS_LIMITS.maxRowsPerPass,
    );

    // THE WORKING OUTCOME: the backlog is gone. Every seeded row was aged past
    // the age bound and over the row ceiling, so a converging sweep leaves none
    // of it — and this is the assertion that made Run B worth taking: under the
    // OLD cadence 27,608 rows survived against a ceiling of 100.
    expect(counters.retentionDeleted).toBeGreaterThanOrEqual(BACKLOG_ROWS);
    expect(
      totalRows(after),
      "the backlog did not drain inside the run.",
    ).toBeLessThanOrEqual(CEILING_B * 7 + ROWS_INSERTED_BY_RUN);

    // BOTH NEW TABLES DRAINED, NAMED SEPARATELY. The seeded sightings named a
    // bundle that never existed and the seeded sources were sighted by nothing,
    // so every one of them is reachable only through the cascade plan 07-13
    // added. Whatever survives is the RUN's own rows, not the backlog's.
    expect(after.sources).toBeLessThanOrEqual(MAP_BEARING * SOURCES_PER_MAP);
    expect(after.source_sightings).toBeLessThanOrEqual(
      MAP_BEARING * SOURCES_PER_MAP,
    );
    const survivingBacklogSightings = (
      fx.raw
        .prepare(
          "SELECT COUNT(*) AS n FROM source_sightings WHERE project_id = ? AND artifact_sha256 = ?",
        )
        .get(PROJECT, digest("dead")) as { n: number }
    ).n;
    expect(
      Number(survivingBacklogSightings),
      "aged sightings of a bundle that does not exist survived the run.",
    ).toBe(0);
    const survivingBacklogSources = (
      fx.raw
        .prepare(
          "SELECT COUNT(*) AS n FROM sources WHERE project_id = ? AND source_sha256 LIKE ?",
        )
        .get(PROJECT, SEEDED_SOURCE_MARK + "%") as { n: number }
    ).n;
    expect(
      Number(survivingBacklogSources),
      "unsighted sources survived the run — the anti-join did not run.",
    ).toBe(0);
  });
});
