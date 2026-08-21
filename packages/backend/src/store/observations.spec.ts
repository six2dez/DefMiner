// packages/backend/src/store/observations.spec.ts — STORE-03's behavioural gate:
// what a query string looks like AFTER it has crossed the persistence boundary.
//
// The operator's UAT decision of 2026-08-21 (WR-07) was REDACT AT WRITE: keep the
// path, keep the parameter NAMES and their order, replace every VALUE. Names carry
// analytic value — knowing an endpoint takes an `access_token` parameter is worth
// keeping — and values are credentials.
//
// Why this file has to exist at all: `telemetry.ts` already redacts a URL out of a
// 240-character error string before it crosses the RPC, while `observations.url`
// was writing the same value verbatim into a database `db.ts` documents as never
// garbage-collected, surviving project deletion and surviving force-reinstall. The
// DURABLE store must not be looser than the TRANSIENT channel.
//
// Every "the secret is gone" assertion below is a SUBSTRING SEARCH over the whole
// returned string, never an equality against a hand-written expected value. An
// equality assertion passes when both sides are wrong in the same way; a substring
// search for the literal token cannot.

import { beforeEach, describe, expect, it } from "vitest";

import {
  createFixtureDb,
  type SqliteFixture,
} from "../../test/fixtures/sqlite-fixture";

import { migrate } from "./migrations";
import {
  listObservations,
  normaliseObservedUrl,
  QUERY_NAME_MAX,
  QUERY_VALUE_REDACTION,
  recordObservation,
  redactQueryValues,
} from "./observations";

/** `URL_MAX` is module-private on purpose — the column's bound is not a knob. The
 *  literal is repeated here so the ordering case below can assert against it; if
 *  the two ever disagree the ordering case fails loudly rather than silently
 *  measuring nothing. */
const URL_MAX = 2048;

/** A real-shaped JWT prefix. Used as the thing that must NOT survive. */
const TOKEN = "eyJhbGciOiJIUzI1NiJ9";

/**
 * The shared case list. Every case is exercised THREE ways: for its expected
 * output, for the invariant that the scheme/host/path are byte-identical, and for
 * idempotence. A case added here inherits all three automatically, which is the
 * point of keeping one list rather than writing each assertion inline.
 */
const CASES: ReadonlyArray<{ name: string; in: string; out: string }> = [
  {
    name: "a cache buster keeps its name and loses its value",
    in: "https://x.test/app.js?v=8c1f",
    out: `https://x.test/app.js?v=${QUERY_VALUE_REDACTION}`,
  },
  {
    name: "EVERY value is replaced, not just the first, and order is preserved",
    in: `https://cdn.test/a.js?access_token=${TOKEN}&v=2`,
    out: `https://cdn.test/a.js?access_token=${QUERY_VALUE_REDACTION}&v=${QUERY_VALUE_REDACTION}`,
  },
  {
    name: "no query at all is returned unchanged, with no `?` invented",
    in: "https://x.test/app.js",
    out: "https://x.test/app.js",
  },
  {
    name: "an empty query keeps its trailing `?`",
    // The PRESENCE of a query is itself information: `/a.js` and `/a.js?` are not
    // the same stored identity and normalising one into the other would quietly
    // merge two different sightings.
    in: "https://x.test/app.js?",
    out: "https://x.test/app.js?",
  },
  {
    name: "a bare flag with no `=` is a NAME, and names are what we keep",
    in: "https://x.test/app.js?debug",
    out: "https://x.test/app.js?debug",
  },
  {
    name: "the split is on the FIRST `=`, so an `=` inside a value invents nothing",
    in: "https://x.test/a.js?sig=a=b=c",
    out: `https://x.test/a.js?sig=${QUERY_VALUE_REDACTION}`,
  },
  {
    name: "an empty segment stays an empty segment",
    // The function does not silently normalise the query's shape. `a=1&&b=2` came
    // in with three segments and leaves with three.
    in: "https://x.test/a.js?a=1&&b=2",
    out: `https://x.test/a.js?a=${QUERY_VALUE_REDACTION}&&b=${QUERY_VALUE_REDACTION}`,
  },
  {
    name: "percent-encoding is neither decoded nor re-encoded",
    // Decoding would let an encoded `&` inside a value split into a fake
    // parameter, and the fake parameter's NAME half would be a surviving slice of
    // a real value. The bytes are treated as opaque.
    in: "https://x.test/a.js?a=%3D%26b%3D2",
    out: `https://x.test/a.js?a=${QUERY_VALUE_REDACTION}`,
  },
];

describe("redactQueryValues", () => {
  for (const c of CASES) {
    it(c.name, () => {
      expect(redactQueryValues(c.in)).toBe(c.out);
    });
  }

  it("the literal token text does not appear ANYWHERE in the output", () => {
    const out = redactQueryValues(
      `https://cdn.test/a.js?access_token=${TOKEN}&v=2`,
    );
    // Substring search over the whole string, deliberately — not an equality.
    expect(out.includes(TOKEN)).toBe(false);
    expect(out.includes("access_token=")).toBe(true);
  });

  it("the scheme, the host and the path are byte-identical to the input's", () => {
    for (const c of CASES) {
      const head = c.in.split("?")[0];
      expect(redactQueryValues(c.in).startsWith(head)).toBe(true);
      // And nothing was inserted before the query either.
      expect(redactQueryValues(c.in).split("?")[0]).toBe(head);
    }
  });

  it(`a parameter NAME longer than QUERY_NAME_MAX (${String(QUERY_NAME_MAX)}) is truncated`, () => {
    // This closes the bare-token hole: `?eyJhbGciOiJIUzI1NiJ9…` with no `=` is
    // syntactically a NAME, and without a bound on names a token pasted as a bare
    // parameter would survive verbatim under a values-only rule.
    const longName = "n".repeat(QUERY_NAME_MAX + 40);
    const bare = redactQueryValues(`https://x.test/a.js?${longName}`);
    expect(bare).toBe(`https://x.test/a.js?${"n".repeat(QUERY_NAME_MAX)}`);

    const pair = redactQueryValues(`https://x.test/a.js?${longName}=v`);
    expect(pair).toBe(
      `https://x.test/a.js?${"n".repeat(QUERY_NAME_MAX)}=${QUERY_VALUE_REDACTION}`,
    );
  });

  it("a fragment sitting inside a query value does not survive", () => {
    const out = redactQueryValues("https://x.test/a.js?v=1#frag");
    expect(out.includes("#")).toBe(false);
    expect(out).toBe(`https://x.test/a.js?v=${QUERY_VALUE_REDACTION}`);
  });

  it("is IDEMPOTENT — a second pass returns the first pass byte-for-byte", () => {
    // Rewriting a row through the redactor any number of times must not
    // accumulate markers. Looped over the shared case list so a case added later
    // inherits the check without anybody remembering to.
    for (const c of CASES) {
      const once = redactQueryValues(c.in);
      expect(redactQueryValues(once)).toBe(once);
    }
    const longName = "n".repeat(QUERY_NAME_MAX + 40);
    for (const extra of [
      `https://x.test/a.js?${longName}`,
      `https://x.test/a.js?${longName}=v`,
      "https://x.test/a.js?v=1#frag",
    ]) {
      const once = redactQueryValues(extra);
      expect(redactQueryValues(once)).toBe(once);
    }
  });

  it("executes no pattern — the implementation is string splitting only", async () => {
    // REDOS_RECOVERY is "kill" on this runtime: SPIKE-01 measured that a
    // catastrophic pattern hangs the QuickJS thread with NO interrupt handler and
    // that SIGKILL is the only exit, taking `caido-cli` down with the operator's
    // real project data. `admit.ts` holds the hooks to indexOf/endsWith for
    // exactly this reason and the store has no licence the hooks do not.
    const fs = await import("node:fs/promises");
    const url = await import("node:url");
    const here = url.fileURLToPath(new URL(".", import.meta.url));
    const source = await fs.readFile(here + "observations.ts", "utf8");
    const code = source
      .split("\n")
      .filter((l) => !/^\s*\*/.test(l) && !/^\s*\/\//.test(l))
      .join("\n");
    for (const forbidden of [
      ".test(",
      ".match(",
      ".exec(",
      ".matchAll(",
      ".search(",
      "RegExp(",
    ]) {
      expect(code.includes(forbidden), `${forbidden} in observations.ts`).toBe(
        false,
      );
    }
  });
});

describe("normaliseObservedUrl", () => {
  it("routes through the redaction and still strips the fragment", () => {
    const out = normaliseObservedUrl("https://x.test/a.js?t=secret#f");
    expect(out.includes("secret")).toBe(false);
    expect(out.includes("#")).toBe(false);
    expect(out).toBe(`https://x.test/a.js?t=${QUERY_VALUE_REDACTION}`);
  });

  it("strips a fragment on a URL with no query at all", () => {
    expect(normaliseObservedUrl("https://x.test/a.js#f")).toBe(
      "https://x.test/a.js",
    );
  });

  it("REDACTS FIRST AND TRUNCATES SECOND (decision P5-D8)", () => {
    // Decision P5-D8, restated at the write path. `telemetry.ts` learned by
    // measurement that truncating before redacting leaves the front half of the
    // string, and the front half is the half that carries what you did not want
    // to keep.
    //
    // What the ORDER is observably worth HERE, stated precisely rather than
    // hand-waved: because this redactor replaces a value WHOLE regardless of its
    // length, tail truncation alone cannot expose a value — so the ordering's
    // visible effect is that parameter NAMES beyond the truncation point SURVIVE
    // under redact-first and are LOST under truncate-first. That is the assertion
    // below, and it is the one that fails when the two lines are swapped.
    //
    // The ordering is nonetheless the load-bearing invariant, not a nicety: the
    // moment any future redactor preserves a length, a prefix or a fingerprint of
    // a value, truncate-first leaks immediately. Pinning the order now is what
    // stops that change from being silent.
    const long = "A".repeat(3000);
    const out = normaliseObservedUrl(`https://x.test/a.js?t=${long}&marker=z`);

    expect(out.length).toBeLessThanOrEqual(URL_MAX);
    expect(out.includes(long.slice(0, 200))).toBe(false);
    expect(out).toBe(
      `https://x.test/a.js?t=${QUERY_VALUE_REDACTION}&marker=${QUERY_VALUE_REDACTION}`,
    );
  });

  it("still bounds the result at URL_MAX when the PATH alone is oversized", () => {
    const out = normaliseObservedUrl(`https://x.test/${"p".repeat(4000)}`);
    expect(out.length).toBe(URL_MAX);
  });
});

describe("recordObservation writes the redacted URL, not the raw one", () => {
  let fx: SqliteFixture;

  beforeEach(async () => {
    fx = createFixtureDb();
    const report = await migrate(fx.db);
    expect(report.ok, JSON.stringify(report.steps)).toBe(true);
    return () => {
      fx.close();
    };
  });

  it("a round trip through the store keeps `token=` and loses `hunter2`", async () => {
    // THIS is the assertion that fails if the redactor is correct but nobody
    // wired it into the write. A pure-function spec cannot tell the difference.
    const res = await recordObservation(
      fx.db,
      "project-one",
      "a".repeat(64),
      "r1",
      "https://x.test/app.js?token=hunter2&v=3",
      200,
      "application/javascript",
      1_700_000_000_000,
    );
    expect(res.ok, JSON.stringify(res)).toBe(true);

    const rows = await listObservations(fx.db, "project-one");
    expect(rows.length).toBe(1);
    expect(rows[0].url.includes("token=")).toBe(true);
    expect(rows[0].url.includes("hunter2")).toBe(false);
    expect(rows[0].url).toBe(
      `https://x.test/app.js?token=${QUERY_VALUE_REDACTION}&v=${QUERY_VALUE_REDACTION}`,
    );
  });

  it("the JWT case survives the round trip with its parameter name intact", async () => {
    const res = await recordObservation(
      fx.db,
      "project-one",
      "b".repeat(64),
      "r2",
      `https://cdn.test/a.js?access_token=${TOKEN}`,
      200,
      null,
      1_700_000_000_001,
    );
    expect(res.ok, JSON.stringify(res)).toBe(true);

    const rows = await listObservations(fx.db, "project-one");
    expect(rows.length).toBe(1);
    expect(rows[0].url.includes(TOKEN)).toBe(false);
    expect(rows[0].url.includes("access_token=")).toBe(true);
  });
});
