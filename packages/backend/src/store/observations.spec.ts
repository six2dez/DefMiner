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
 * The adversarial fixture table for decision P10-D1 (operator, 2026-08-21) — one
 * entry per common credential format, and EVERY ONE of them shorter than
 * `QUERY_NAME_MAX` = 64, which is the bound that was supposed to catch them.
 *
 * Built from the formats the verifier and `01-REVIEW.md` named, NOT from what the
 * new branch happens to catch. Round 1's gates all passed their own fixtures and
 * still missed 14 of 22 shapes, because the fixtures were written by the same
 * reasoning that wrote the rule. A fixture list that agrees with the
 * implementation measures the implementation's opinion of itself.
 *
 * The two opaque tokens (16 and 12 characters) are the lengths that decided the
 * checkpoint: a bound low enough to catch the 12 would truncate
 * `disableAnalytics` (16) and `enableExperimentalFeature` (25) into prefixes that
 * still read as real flag names. They are listed under the option that WAS chosen
 * so the record states what the policy does with a SHORT credential rather than
 * leaving it unmeasured.
 */
const BARE_CREDENTIAL_SHAPES: ReadonlyArray<{
  label: string;
  literal: string;
}> = Object.freeze([
  {
    label: "GitHub personal access token (40)",
    literal: "ghp_AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIII",
  },
  { label: "AWS access key id (20)", literal: "AKIAIOSFODNN7EXAMPLE" },
  {
    label: "Stripe secret key (32)",
    literal: "sk_live_4eC39HqLyjWDarjtT1zdp7dc",
  },
  {
    label: "PHP/Java session id, lowercase hex (32)",
    literal: "9b74c9897bac770ffc029102a200c5de",
  },
  {
    label: "canonical UUID with its four hyphens (36)",
    literal: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  },
  {
    label: "compact JWT (43)",
    literal: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdef",
  },
  { label: "opaque token (16)", literal: "s3cr3tt0k3n1234x" },
  { label: "opaque token (12)", literal: "s3cr3tt0k3n1" },
]);

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
    // AMENDED 2026-08-21 under decision P10-D1 — amended, NOT deleted. Plan 01-07
    // amended `01-01-PLAN.md`'s truth #2 in place for the same reason and that is
    // the precedent: a deleted case leaves no record that the behaviour was ever
    // different, and this one was different for a reason worth being able to read.
    //
    // The title this case used to carry — "a bare flag with no `=` is a NAME, and
    // names are what we keep" — was a FAITHFUL reading of the operator's UAT words
    // ("keeping the path and the parameter names"). It is now contradicted because
    // the operator RE-OPENED those words, not because the code was wrong. The
    // POLICY changed; decision P7-D2 was not a bug.
    //
    // What forced the re-opening: a segment with no `=` has no name to keep, and
    // every common credential format is shorter than `QUERY_NAME_MAX` = 64, so a
    // values-only rule wrote a pasted token verbatim into a column `db.ts`
    // documents as never garbage-collected. See `BARE_CREDENTIAL_SHAPES`.
    //
    // The accepted cost, stated rather than buried: `?debug`, `?nocache` and
    // `?prod` are genuine feature-flag signal on a bundle URL and they are now
    // `<redacted>`. Feature-flag analysis is not a Phase 1 capability, so nothing
    // that exists today loses a signal it was using.
    name: "a bare flag with no `=` is REDACTED — it is a value with no name (P10-D1, 2026-08-21; previously: kept as a NAME)",
    in: "https://x.test/app.js?debug",
    out: `https://x.test/app.js?${QUERY_VALUE_REDACTION}`,
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

  it(`a BARE segment of ANY length is redacted, and QUERY_NAME_MAX (${String(QUERY_NAME_MAX)}) now bounds only the NAME HALF of a pair (P10-D1, 2026-08-21)`, () => {
    // AMENDED 2026-08-21 under decision P10-D1 — amended, NOT deleted, and the
    // amendment is the point. What this case used to claim, quoted verbatim from
    // the comment it carried:
    //
    //   "This closes the bare-token hole: `?eyJhbGciOiJIUzI1NiJ9…` with no `=` is
    //    syntactically a NAME, and without a bound on names a token pasted as a
    //    bare parameter would survive verbatim under a values-only rule."
    //
    // That was FALSE, and this case is the sharpest instance in the repository of
    // the exact defect this plan exists to remove. The JWT named in the comment is
    // 43 characters. The bound it appealed to is 64. The case then exercised
    // `"n".repeat(QUERY_NAME_MAX + 40)` — 104 characters, the one length at which
    // truncation is VISIBLE — so it could not fail on the hole its own comment
    // said it closed. Meanwhile `schema.spec.ts:39-46` was rewritten in the same
    // batch to assert the containing claim was "NOW TRUE". An unfalsifiable
    // residual underneath an upgraded claim.
    //
    // Under P10-D1 the hole is closed by CONSTRUCTION rather than by a number: no
    // length of bare segment survives, so there is no "shorter than the bound"
    // left for a future credential format to hide in. `QUERY_NAME_MAX` survives
    // with a NARROWER job — it bounds the name half of a `name=value` segment,
    // which is the second assertion below, and that is the only thing it now
    // justifies.
    const longName = "n".repeat(QUERY_NAME_MAX + 40);
    const bare = redactQueryValues(`https://x.test/a.js?${longName}`);
    expect(bare).toBe(`https://x.test/a.js?${QUERY_VALUE_REDACTION}`);

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

describe("a BARE query segment carrying a credential (P10-D1, T-01-53)", () => {
  // The gap the verifier reproduced by EXECUTION, closed here so that it can fail.
  // Independently observed before any of this landed:
  //   `?token=ghp_AAAA…` -> `?token=<redacted>`   (correct, and already shipped)
  //   `?ghp_AAAA…`       -> `?ghp_AAAA…`          (survived byte-for-byte)
  // Eight formats, eight survivals. Every assertion below goes RED if the
  // `eq === -1` branch of `redactQueryValues` is reverted to
  // `segment.slice(0, QUERY_NAME_MAX)`, which was run rather than described.

  it("enumerates a NON-EMPTY table of shapes, every one UNDER the old bound", () => {
    // Non-vacuity, in the shape `error-redaction.spec.ts` uses: a table-driven
    // gate over an empty table reports zero violations and proves nothing. And
    // the "under the old bound" half is what makes the table adversarial — a
    // shape LONGER than 64 was already caught by truncation and would let this
    // block pass without exercising the new branch at all.
    expect(BARE_CREDENTIAL_SHAPES.length).toBeGreaterThanOrEqual(8);
    for (const s of BARE_CREDENTIAL_SHAPES) {
      expect(
        s.literal.length,
        `${s.label} is NOT shorter than QUERY_NAME_MAX — it proves nothing new`,
      ).toBeLessThan(QUERY_NAME_MAX);
    }
  });

  for (const { label, literal } of BARE_CREDENTIAL_SHAPES) {
    const bareIn = `https://cdn.test/a.js?${literal}`;
    const valueIn = `https://cdn.test/a.js?token=${literal}`;

    it(`${label}: does not survive anywhere in the output as a BARE segment`, () => {
      // SUBSTRING SEARCH over the whole returned string, never an equality
      // against a hand-written expected value — an equality passes when both
      // sides are wrong in the same way.
      const out = redactQueryValues(bareIn);
      expect(out.includes(literal), out).toBe(false);
      expect(out).toBe(`https://cdn.test/a.js?${QUERY_VALUE_REDACTION}`);
    });

    it(`${label}: the scheme, host and path are byte-identical to the input's`, () => {
      const out = redactQueryValues(bareIn);
      expect(out.split("?")[0]).toBe(bareIn.split("?")[0]);
    });

    it(`${label}: redaction is idempotent over the bare form`, () => {
      // `<redacted>` contains no `=`, so on a second pass it is ITSELF a bare
      // segment and is re-redacted to the same bytes. Asserted rather than
      // reasoned about, because that is the property that makes rewriting a row
      // through the redactor safe any number of times.
      const once = redactQueryValues(bareIn);
      expect(redactQueryValues(once)).toBe(once);
    });

    it(`${label}: is still absent when used as a VALUE (${"?token="}…)`, () => {
      // The new branch must not have been implemented by weakening the branch
      // that already worked.
      const out = redactQueryValues(valueIn);
      expect(out.includes(literal), out).toBe(false);
      expect(out).toBe(`https://cdn.test/a.js?token=${QUERY_VALUE_REDACTION}`);
    });

    it(`${label}: the parameter COUNT is unchanged`, () => {
      // No option was allowed to silently normalise the query's shape.
      const mixed = `https://cdn.test/a.js?a=1&${literal}&b=2`;
      const out = redactQueryValues(mixed);
      expect(out.slice(out.indexOf("?") + 1).split("&").length).toBe(
        mixed.slice(mixed.indexOf("?") + 1).split("&").length,
      );
      expect(out.includes(literal), out).toBe(false);
    });
  }

  it("an empty segment stays an empty segment — `?a=1&&b=2` keeps its three", () => {
    // The empty branch pushes the EMPTY STRING, not the redaction marker: an
    // empty segment carries nothing to redact, and turning it into `<redacted>`
    // would invent a parameter that was never sent.
    const out = redactQueryValues("https://x.test/a.js?a=1&&b=2");
    expect(out.slice(out.indexOf("?") + 1).split("&").length).toBe(3);
    expect(out).toBe(
      `https://x.test/a.js?a=${QUERY_VALUE_REDACTION}&&b=${QUERY_VALUE_REDACTION}`,
    );
  });

  it("an empty query keeps its trailing `?` and gains no marker", () => {
    // `/a.js` and `/a.js?` are not the same stored identity. The single empty
    // segment must stay empty under the new branch too.
    expect(redactQueryValues("https://x.test/app.js?")).toBe(
      "https://x.test/app.js?",
    );
  });

  it("a real bare FLAG is redacted — this is what policy `redact-bare` MEANS", () => {
    // The case that changes meaning between the three checkpoint options, with
    // the chosen one named in the title. Under `tighten-bound` `?debug` would
    // survive; under `allowlist` it would survive if enumerated. Under
    // `redact-bare` it does not, and that analytic cost was accepted on the
    // record by the operator on 2026-08-21.
    expect(redactQueryValues("https://x.test/app.js?debug")).toBe(
      `https://x.test/app.js?${QUERY_VALUE_REDACTION}`,
    );
    expect(redactQueryValues("https://x.test/app.js?debug&nocache&v=1")).toBe(
      `https://x.test/app.js?${QUERY_VALUE_REDACTION}&${QUERY_VALUE_REDACTION}&v=${QUERY_VALUE_REDACTION}`,
    );
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

  it("a BARE credential does not reach the column either (P10-D1)", async () => {
    // A pure-function case cannot tell whether the redactor is WIRED INTO THE
    // WRITE. This one reads the row back out of the real database file, which is
    // the only assertion that fails when the redactor is correct and nobody
    // called it.
    const { literal } = BARE_CREDENTIAL_SHAPES[0];
    const res = await recordObservation(
      fx.db,
      "project-one",
      "c".repeat(64),
      "r3",
      `https://cdn.test/a.js?${literal}`,
      200,
      null,
      1_700_000_000_002,
    );
    expect(res.ok, JSON.stringify(res)).toBe(true);

    const rows = await listObservations(fx.db, "project-one");
    expect(rows.length).toBe(1);
    expect(rows[0].url.includes(literal), rows[0].url).toBe(false);
    expect(rows[0].url).toBe(`https://cdn.test/a.js?${QUERY_VALUE_REDACTION}`);
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
