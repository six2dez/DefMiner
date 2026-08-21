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

import { readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";
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
  redactUrlHead,
} from "./observations";

/** `URL_MAX` is module-private on purpose — the column's bound is not a knob. The
 *  literal is repeated here so the ordering case below can assert against it; if
 *  the two ever disagree the ordering case fails loudly rather than silently
 *  measuring nothing. */
const URL_MAX = 2048;

/** Where the two modules this file's pattern gate reads actually live. Relative
 *  to the repository root, matching `telemetry.spec.ts` and
 *  `outbound-prohibition.spec.ts`. */
const BACKEND_SRC = "packages/backend/src";

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

// ===========================================================================
// THE URL HEAD — userinfo and `;` path parameters (WR-11, T-01-57, T-01-58)
// ===========================================================================

/**
 * The grammars a URL can carry BEFORE the first `?`.
 *
 * `redactQueryValues` keys entirely off the first `?`, so everything
 * credential-bearing that a URL can carry ahead of it passed through untouched.
 * `01-REVIEW.md` WR-11 executed all three and they are reproduced here rather
 * than summarised:
 *
 *   userinfo             `https://user:pa55w0rd@cdn.test/app.js` — stored whole.
 *                        HTTP Basic credentials in plaintext.
 *   `;` path parameters  `https://cdn.test/a.js;jsessionid=SECRETSESSION` — stored
 *                        whole. RFC 3986 path-parameter syntax and the classic
 *                        session-token-in-URL shape Java servlet URL rewriting
 *                        still emits.
 *   path-embedded tokens `https://cdn.test/download/eyJ…SECRET/app.js` — stored
 *                        whole. THE ONE RESIDUAL, pinned at the bottom of this
 *                        table rather than left as a silence.
 *
 * Enumerated adversarially, and the MUST-NOT-TOUCH half is not padding: an
 * `@`-anywhere rule is the obvious wrong implementation and it would silently
 * corrupt every Vite and scoped-package URL the operator browses. Round 1's
 * gates each passed fixtures written by the same reasoning that wrote the rule,
 * so the evasions are enumerated before the rule, not after it.
 */
const HEAD_CASES: ReadonlyArray<{ name: string; in: string; out: string }> = [
  // ---- MUST REDACT ------------------------------------------------------
  {
    name: "userinfo with a password: NEITHER half survives, and the `@` does",
    in: "https://user:pa55w0rd@cdn.test/app.js",
    out: `https://${QUERY_VALUE_REDACTION}@cdn.test/app.js`,
  },
  {
    name: "userinfo with no password half gets exactly the same treatment",
    in: "https://user@cdn.test/app.js",
    out: `https://${QUERY_VALUE_REDACTION}@cdn.test/app.js`,
  },
  {
    name: "a `;jsessionid=` path parameter keeps its NAME and loses its VALUE",
    in: "https://cdn.test/a.js;jsessionid=SECRETSESSION",
    out: `https://cdn.test/a.js;jsessionid=${QUERY_VALUE_REDACTION}`,
  },
  {
    name: "two parameters on ONE segment: both values gone, both names kept, order preserved",
    in: "https://cdn.test/a.js;sid=X;phpsessid=Y",
    out: `https://cdn.test/a.js;sid=${QUERY_VALUE_REDACTION};phpsessid=${QUERY_VALUE_REDACTION}`,
  },
  {
    name: "a `;` parameter on a NON-final path segment, and on more than one segment",
    in: "https://cdn.test/seg;a=1/other;b=2/app.js",
    out: `https://cdn.test/seg;a=${QUERY_VALUE_REDACTION}/other;b=${QUERY_VALUE_REDACTION}/app.js`,
  },
  {
    name: "all three grammars in ONE URL: three values gone, three names kept",
    in: "https://user:pw@cdn.test/a.js;jsessionid=S?token=T",
    out: `https://${QUERY_VALUE_REDACTION}@cdn.test/a.js;jsessionid=${QUERY_VALUE_REDACTION}?token=${QUERY_VALUE_REDACTION}`,
  },
  {
    // The coupling is named in the title on purpose. There is ONE policy for a
    // delimited segment carrying no `=`, and it is decision P10-D1 (operator,
    // 2026-08-21): a segment with no name is a value with no name and is
    // redacted whole. `;` is a second delimiter, never a second policy — both
    // loops call the same internal helper, which is what makes that true rather
    // than asserted.
    name: "a BARE `;` segment follows decision P10-D1 exactly as a bare QUERY segment does — ONE policy, two delimiters",
    in: "https://cdn.test/a.js;SECRETTOKEN",
    out: `https://cdn.test/a.js;${QUERY_VALUE_REDACTION}`,
  },
  {
    name: "an EMPTY `;` parameter stays empty and gains no marker — the shape is not normalised",
    in: "https://cdn.test/a.js;",
    out: "https://cdn.test/a.js;",
  },
  // ---- MUST NOT TOUCH ---------------------------------------------------
  {
    name: "an `@` in the PATH is untouched — a Vite dev server serves exactly this",
    in: "https://cdn.test/@vite/client.js",
    out: "https://cdn.test/@vite/client.js",
  },
  {
    name: "a scoped npm package path is untouched",
    in: "https://cdn.test/@scope/pkg/index.js",
    out: "https://cdn.test/@scope/pkg/index.js",
  },
  {
    name: "a `:` in the authority is a PORT, not userinfo",
    in: "http://127.0.0.1:8081/app.js",
    out: "http://127.0.0.1:8081/app.js",
  },
  {
    name: "a plain URL with no head grammar at all is byte-identical",
    in: "https://cdn.test/app.js",
    out: "https://cdn.test/app.js",
  },
  {
    // Already correct BEFORE this plan, because the whole thing after the first
    // `=` is a value. Asserted to STAY correct, since a new `;` rule is exactly
    // what would double-process it into `a=<redacted>;token=<redacted>`.
    name: "`?a=1;token=SECRET` was ALREADY correct and STAYS correct — the `;` rule does not reach into the query",
    in: "https://cdn.test/a.js?a=1;token=SECRET",
    out: `https://cdn.test/a.js?a=${QUERY_VALUE_REDACTION}`,
  },
  // ---- THE ONE NAMED RESIDUAL, PINNED -----------------------------------
  {
    // Asserted UNCHANGED, deliberately. Telling a signed-URL segment from a
    // legitimate path segment needs entropy scoring — for which Phase 1 has no
    // measured false-positive rate, and which would silently destroy the
    // analytic core of this column — or a pattern, which `REDOS_RECOVERY =
    // "kill"` forbids in this module. Naming a residual is only honest when a
    // test can see it change: if a later phase closes this, this case goes RED
    // and whoever closed it updates it deliberately.
    name: "RESIDUAL, PINNED: a token embedded in a path SEGMENT is NOT redacted, and this case is what makes that a measured statement rather than a silence",
    in: "https://cdn.test/download/eyJhbGciOiJIUzI1NiJ9SECRET/app.js",
    out: "https://cdn.test/download/eyJhbGciOiJIUzI1NiJ9SECRET/app.js",
  },
];

describe("the URL HEAD — userinfo and `;` path parameters (WR-11, T-01-57, T-01-58)", () => {
  it("enumerates a NON-EMPTY table covering all three head grammars", () => {
    // Non-vacuity, in the shape `error-redaction.spec.ts` uses: a table-driven
    // gate over an empty table reports nothing wrong and proves nothing.
    expect(HEAD_CASES.length).toBeGreaterThanOrEqual(13);
    expect(HEAD_CASES.filter((c) => c.in.includes("@")).length).toBeGreaterThan(
      2,
    );
    expect(HEAD_CASES.filter((c) => c.in.includes(";")).length).toBeGreaterThan(
      3,
    );
  });

  for (const c of HEAD_CASES) {
    it(c.name, () => {
      expect(normaliseObservedUrl(c.in)).toBe(c.out);
    });
  }

  it("the credential literals do not survive ANYWHERE in the output", () => {
    // SUBSTRING SEARCH over the whole returned string, never an equality
    // against a hand-written expected value — an equality passes when both
    // sides are wrong in the same way.
    const secrets: ReadonlyArray<readonly [string, string]> = [
      ["https://user:pa55w0rd@cdn.test/app.js", "pa55w0rd"],
      ["https://user:pa55w0rd@cdn.test/app.js", "user"],
      ["https://cdn.test/a.js;jsessionid=SECRETSESSION", "SECRETSESSION"],
      ["https://cdn.test/a.js;SECRETTOKEN", "SECRETTOKEN"],
      ["https://user:pw@cdn.test/a.js;jsessionid=S?token=T", "pw"],
    ];
    for (const [input, secret] of secrets) {
      const out = normaliseObservedUrl(input);
      expect(out.includes(secret), `${secret} survived in ${out}`).toBe(false);
    }
  });

  it("the `@` and the HOST survive — the URL carried userinfo and that fact is kept, the bytes are not", () => {
    // Dropping userinfo entirely was WR-11's own recommendation ("there is no
    // analytic value in it"). Keeping the separator preserves strictly more
    // signal than that asked for, and it is what makes the step idempotent: a
    // second pass finds `<redacted>` as the userinfo and replaces it with
    // itself.
    const out = normaliseObservedUrl("https://user:pa55w0rd@cdn.test/app.js");
    expect(out.includes("@")).toBe(true);
    expect(out.includes("cdn.test")).toBe(true);
    expect(out.startsWith("https://")).toBe(true);
  });

  it("the USERNAME is redacted too, not just the password", () => {
    // Not optional. A username is the same class of disclosure as the OS
    // username `telemetry.ts`'s `redactPaths` removes from the error path one
    // module away.
    expect(normaliseObservedUrl("https://alice@cdn.test/app.js")).toBe(
      `https://${QUERY_VALUE_REDACTION}@cdn.test/app.js`,
    );
  });

  it("is IDEMPOTENT over every head case — a second pass returns the first byte-for-byte", () => {
    for (const c of HEAD_CASES) {
      const once = normaliseObservedUrl(c.in);
      expect(normaliseObservedUrl(once), c.name).toBe(once);
    }
  });

  it("still strips the fragment and still bounds the result at URL_MAX", () => {
    expect(normaliseObservedUrl("https://user:pw@cdn.test/a.js;s=1#frag")).toBe(
      `https://${QUERY_VALUE_REDACTION}@cdn.test/a.js;s=${QUERY_VALUE_REDACTION}`,
    );
    const long = normaliseObservedUrl(
      `https://user:pw@cdn.test/${"p".repeat(4000)};s=1`,
    );
    expect(long.length).toBe(URL_MAX);
  });

  it("percent-encoding in the head stays OPAQUE (T-01-32) — neither decoded nor re-encoded", () => {
    // Same reasoning as the query half: decoding would let an encoded
    // delimiter inside a value split into a fake parameter whose "name" half is
    // a surviving slice of a real value.
    expect(normaliseObservedUrl("https://cdn.test/a%3Bb.js")).toBe(
      "https://cdn.test/a%3Bb.js",
    );
    expect(normaliseObservedUrl("https://cdn.test/a.js;n=%3D%3B1")).toBe(
      `https://cdn.test/a.js;n=${QUERY_VALUE_REDACTION}`,
    );
  });

  it("redactQueryValues in ISOLATION still leaves EVERY head byte-identical", () => {
    // The head redaction is a SEPARATE exported function on purpose, and this
    // is the assertion that makes that separation worth having: the existing
    // head byte-identity case keeps its meaning for the function it was written
    // about. One function rewriting both halves would make it untestable.
    for (const c of HEAD_CASES) {
      const head = c.in.split("?")[0];
      expect(redactQueryValues(c.in).split("?")[0], c.name).toBe(head);
    }
  });
});

describe("redactUrlHead in isolation — the authority is resolved, never searched for", () => {
  it("touches ONLY the head — a query handed to it passes through untouched", () => {
    // The query belongs to `redactQueryValues`. Two functions, one composition,
    // and each one's assertions stay true of the function they were written
    // about.
    expect(redactUrlHead("https://user:pw@cdn.test/a.js?token=T")).toBe(
      `https://${QUERY_VALUE_REDACTION}@cdn.test/a.js?token=T`,
    );
  });

  it("does nothing when there is no `://` — with no authority there is no userinfo", () => {
    expect(redactUrlHead("cdn.test/app.js@x")).toBe("cdn.test/app.js@x");
  });

  it("resolves userinfo inside the AUTHORITY ONLY — an `@` after the first `/` is PATH", () => {
    // An `@`-anywhere rule is the obvious wrong implementation, and it is why
    // this is a separate case from the table above rather than folded into it.
    expect(redactUrlHead("https://cdn.test/@vite/client.js")).toBe(
      "https://cdn.test/@vite/client.js",
    );
    expect(redactUrlHead("https://cdn.test/a/@b/c@d.js")).toBe(
      "https://cdn.test/a/@b/c@d.js",
    );
  });

  it("takes the LAST `@` in the authority, so an `@` inside the userinfo leaves no tail behind", () => {
    expect(redactUrlHead("https://us@er:pw@cdn.test/a.js")).toBe(
      `https://${QUERY_VALUE_REDACTION}@cdn.test/a.js`,
    );
  });

  it("handles an authority with no path at all", () => {
    expect(redactUrlHead("https://user:pw@cdn.test")).toBe(
      `https://${QUERY_VALUE_REDACTION}@cdn.test`,
    );
  });

  it("is IDEMPOTENT — `<redacted>` carries no `@` and no `=`, so a second pass replaces it with itself", () => {
    for (const c of HEAD_CASES) {
      const once = redactUrlHead(c.in);
      expect(redactUrlHead(once), c.name).toBe(once);
    }
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

  it("USERINFO does not reach the column either, nor does a `;` parameter value (WR-11)", async () => {
    // A pure-function case cannot tell whether the head redactor is WIRED INTO
    // THE WRITE. This one reads the row back out of the real database file,
    // which is the only assertion that fails when `redactUrlHead` is correct and
    // nobody composed it into `normaliseObservedUrl`.
    const res = await recordObservation(
      fx.db,
      "project-one",
      "d".repeat(64),
      "r4",
      "https://user:pa55w0rd@cdn.test/app.js;jsessionid=SECRETSESSION",
      200,
      null,
      1_700_000_000_003,
    );
    expect(res.ok, JSON.stringify(res)).toBe(true);

    const rows = await listObservations(fx.db, "project-one");
    expect(rows.length).toBe(1);
    expect(rows[0].url.includes("pa55w0rd"), rows[0].url).toBe(false);
    expect(rows[0].url.includes("SECRETSESSION"), rows[0].url).toBe(false);
    expect(rows[0].url).toBe(
      `https://${QUERY_VALUE_REDACTION}@cdn.test/app.js;jsessionid=${QUERY_VALUE_REDACTION}`,
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

// ===========================================================================
// THE "EXECUTES NO PATTERN" GATE — AST-ANCHORED, OVER TWO MODULES (WR-13)
// ===========================================================================
//
// WHAT THIS GATE CLAIMS, and it is narrower than the sentence it replaced.
//
// `observations.ts`'s OWN CODE executes no pattern. That is what is enforced
// here. The module-level claim — "the implementation is string splitting only" —
// became FALSE the day plan 01-07 added the `describeError` import at
// `observations.ts:10`: `describeError` runs `redactUrls`, which is a
// `String.replace` with a pattern, so this module reaches a pattern
// TRANSITIVELY on its error path. Restating the claim rather than quietly
// keeping the old title is WR-13's option (a) and the honest one; a claim wider
// than its enforcement is an attack surface on the next author, who trusts the
// sentence instead of reading the code.
//
// THE TRANSITIVE PATTERN IS NAMED AND BOUNDED. It is the single regex literal
// inside `redactUrls`, and it is asserted backtrack-free BY MEASUREMENT — not by
// an argument about its shape — in `telemetry.spec.ts`'s case "renders a
// 200,000-character adversarial near-miss input inside 250 ms". The error path
// is reached only after a store write has already failed, which bounds how OFTEN
// it runs but says nothing about whether it is safe, so the measurement is what
// carries the weight.
//
// WHY IT READS `telemetry.ts` TOO, and this is the point of the widening rather
// than a bonus. `telemetry.ts`'s `redactPaths` is a string scan justified
// ENTIRELY by `REDOS_RECOVERY = "kill"`: SPIKE-01 measured that a catastrophic
// pattern hangs the QuickJS thread with no interrupt handler and that SIGKILL is
// the only exit, taking `caido-cli` down with the operator's live project data.
// A gate built one file away for exactly that reason, which cannot SEE the
// function it was built for, has a hole precisely where its own motivation is.
// The measured-linearity case bounds `redactUrls` — it does not bound a future
// author's rewrite of `redactPaths` into WR-12's suggested
// `(?:\/[A-Za-z0-9._-]+){2,}`, which nests a quantifier inside a quantifier and
// is the patch task 2 declined.
//
// THE EXEMPTION IS A COUNT PLUS AN ANCHOR, NEVER A FILE-NAME SKIP, and the
// difference is the whole mechanism. `telemetry.ts` may hold EXACTLY ONE regex
// literal AND it must sit inside the `redactUrls` declaration. A second literal
// anywhere in that module fails. MOVING the existing one, or renaming the
// function around it, also fails — until somebody updates the exemption, which
// is precisely the moment they are forced to add a linearity measurement for
// whatever they moved. A reader who mistook this for a file-name exception would
// copy it, so the mechanism is stated here rather than left to be inferred.
//
// AN AST WALK, NOT A TEXT SCAN. The scan this replaces read its own module's
// text, dropped lines BEGINNING with `*` or `//`, and searched for six literal
// substrings. Both halves failed: a TRAILING comment on a code line survived the
// filter and could TRIP the gate — which teaches an author to delete the
// reasoning — and the six substrings missed the shapes a person actually writes.
// This module's own comments necessarily discuss every forbidden construct by
// name, which is why the documentation fixture below must report zero.

/** One finding. Same shape as `error-redaction.spec.ts`'s `Violation`, so the
 *  three gates in this package read alike. */
type PatternFinding = { file: string; rule: string; detail: string };

/**
 * The five method names that EXECUTE a pattern by definition.
 *
 * `split` and the two replace methods are deliberately ABSENT. With regex
 * literals and `RegExp` construction both banned there is no way to hand them a
 * pattern, and banning them outright would ban `split("&")` — which is the
 * implementation this gate exists to protect.
 */
const PATTERN_EXECUTING_METHODS = new Set([
  "test",
  "match",
  "exec",
  "matchAll",
  "search",
]);

/**
 * The ONE exemption, as a count and an anchor. See the header for why it is not
 * a file-name skip. The literal it permits is cited to the evidence that bounds
 * it: `telemetry.spec.ts`'s measured-linearity case.
 */
const PATTERN_EXEMPTIONS: ReadonlyMap<
  string,
  { readonly literals: number; readonly anchor: string }
> = new Map([["telemetry.ts", { literals: 1, anchor: "redactUrls" }]]);

/**
 * Names that MUST appear in each scanned file. Non-vacuity: a rename or a moved
 * file becomes a visible failure rather than a silently empty scan, which is the
 * failure class (T-01-34) that produced four green-because-they-could-not-fail
 * gates earlier in this phase.
 */
const PATTERN_SCAN_MARKERS: ReadonlyMap<string, readonly string[]> = new Map([
  ["observations.ts", ["redactQueryValues", "redactUrlHead"]],
  ["telemetry.ts", ["redactPaths", "redactUrls"]],
]);

/** The name of the declaration a node sits inside, walking outwards. Used to
 *  ANCHOR the exemption to `redactUrls` rather than to a file name. */
function enclosingDeclarationName(node: ts.Node): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current !== undefined) {
    if (
      (ts.isFunctionDeclaration(current) ||
        ts.isMethodDeclaration(current) ||
        ts.isClassDeclaration(current)) &&
      current.name !== undefined &&
      ts.isIdentifier(current.name)
    ) {
      return current.name.text;
    }
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      return current.name.text;
    }
    current = current.parent;
  }
  return null;
}

/**
 * Audit one source file for pattern use.
 *
 * PURE — takes text, returns findings — for the same reason
 * `error-redaction.spec.ts`'s `auditSource` is: every rule's FAILING path is
 * executed below against an inline fixture. A gate whose failure path has never
 * run is a gate nobody has tested.
 *
 * The fixtures are inline STRINGS and never separate files, because they contain
 * the forbidden constructs as source text — the same reason
 * `outbound-prohibition.spec.ts` and `error-redaction.spec.ts` both keep theirs
 * inline and both skip `.spec.ts` in their walks.
 */
function auditPatternUse(file: string, source: string): PatternFinding[] {
  const base = file.split("/").pop() ?? file;
  const findings: PatternFinding[] = [];
  const add = (rule: string, detail: string): void => {
    findings.push({ file: base, rule, detail });
  };

  // ---- Non-vacuity, BEFORE any walking. -----------------------------------
  if (source.trim() === "") {
    add(
      "vacuous-scan",
      `${base} is empty. A pattern audit over an empty file reports zero violations and proves nothing.`,
    );
    return findings;
  }
  for (const marker of PATTERN_SCAN_MARKERS.get(base) ?? []) {
    if (!source.includes(marker)) {
      add(
        "vacuous-scan",
        `${base} no longer contains \`${marker}\`. Either it was renamed or this gate is pointed at the wrong file; both make the scan meaningless.`,
      );
    }
  }

  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const lineOf = (node: ts.Node): number =>
    sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  const literals: Array<{ line: number; anchor: string | null }> = [];

  const visit = (node: ts.Node): void => {
    // ---- Rule 1: a regex LITERAL anywhere in the module. -------------------
    // This one rule subsumes the two shapes the old substring list missed most
    // dangerously: a pattern handed to a string method has to be WRITTEN as a
    // literal to get there.
    if (ts.isRegularExpressionLiteral(node)) {
      literals.push({
        line: lineOf(node),
        anchor: enclosingDeclarationName(node),
      });
    }

    // ---- Rule 2: a `RegExp` construction, as a call or with `new`. ---------
    // So a pattern ASSEMBLED from a string cannot walk around rule 1.
    if (ts.isNewExpression(node) || ts.isCallExpression(node)) {
      const callee = node.expression;
      const isRegExpCallee =
        (ts.isIdentifier(callee) && callee.text === "RegExp") ||
        (ts.isPropertyAccessExpression(callee) &&
          callee.name.text === "RegExp");
      if (isRegExpCallee) {
        add(
          "regexp-construction",
          `${base}:${String(lineOf(node))} constructs a RegExp. REDOS_RECOVERY is "kill" on this runtime: a catastrophic pattern hangs the QuickJS thread with no interrupt handler and SIGKILL is the only exit, taking caido-cli down with the operator's live project data.`,
        );
      }
    }

    // ---- Rule 3: a call to one of the five pattern-executing methods. ------
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      PATTERN_EXECUTING_METHODS.has(node.expression.name.text)
    ) {
      add(
        "pattern-execution",
        `${base}:${String(lineOf(node))} calls .${node.expression.name.text}(), which executes a pattern by definition.`,
      );
    }

    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);

  // ---- Rule 1's verdict, under the count-plus-anchor exemption. ------------
  const exemption = PATTERN_EXEMPTIONS.get(base);
  if (exemption === undefined) {
    for (const literal of literals) {
      add(
        "regex-literal",
        `${base}:${String(literal.line)} holds a regular-expression literal. This module executes no pattern; string splitting only.`,
      );
    }
  } else {
    if (literals.length > exemption.literals) {
      add(
        "exemption-exceeded",
        `${base} holds ${String(literals.length)} regex literals; the exemption permits exactly ${String(exemption.literals)}, inside \`${exemption.anchor}\`, bounded by telemetry.spec.ts's measured-linearity case. Lines: ${literals.map((l) => String(l.line)).join(", ")}. A second pattern needs its own linearity MEASUREMENT before it can be permitted.`,
      );
    }
    for (const literal of literals) {
      if (literal.anchor !== exemption.anchor) {
        add(
          "exemption-anchor",
          `${base}:${String(literal.line)} holds a regex literal inside \`${String(literal.anchor)}\`, but the exemption is anchored to \`${exemption.anchor}\`. Moving or renaming it requires updating the exemption — which is the moment a linearity measurement is owed for whatever moved.`,
        );
      }
    }
  }

  return findings;
}

describe("neither observations.ts nor telemetry.ts executes an unbounded pattern (T-01-60, T-01-77)", () => {
  const scanned = [
    join(BACKEND_SRC, "store", "observations.ts"),
    join(BACKEND_SRC, "telemetry.ts"),
  ];

  it("reads exactly the two files it claims to, and both are non-empty", () => {
    for (const file of scanned) {
      const source = readFileSync(file, "utf8");
      expect(source.length, `${file} is empty`).toBeGreaterThan(0);
    }
    expect(scanned.length).toBe(2);
  });

  it.each(scanned)(
    "%s executes no pattern beyond its stated exemption",
    (file) => {
      const findings = auditPatternUse(file, readFileSync(file, "utf8"));
      expect(
        findings.map((f) => `${f.rule}: ${f.detail}`),
        `${file} reaches a pattern. REDOS_RECOVERY is "kill" on this runtime and SIGKILL is the only exit.`,
      ).toEqual([]);
    },
  );

  it("still SEES the one literal it permits — the exemption is exercised, not dormant", () => {
    // If `redactUrls` ever stops holding a literal this reports zero for the
    // wrong reason, and the exemption below would be permitting nothing while
    // reading as though it were load-bearing.
    const file = join(BACKEND_SRC, "telemetry.ts");
    const source = readFileSync(file, "utf8");
    // Pointed at a file with NO exemption, the same source must report exactly
    // one `regex-literal` — which is how many the exemption is spending.
    const unexempted = auditPatternUse("nowhere/unexempted.ts", source);
    expect(unexempted.map((f) => f.rule)).toEqual(["regex-literal"]);
  });

  it("this module's own comments name every forbidden construct and it STILL reports clean", () => {
    // The documentation hazard, asserted live on the real file rather than on a
    // fixture: this file has to keep explaining why patterns are banned, and an
    // AST walk is the only way that stays possible.
    const file = join(BACKEND_SRC, "store", "observations.spec.ts");
    const source = readFileSync(file, "utf8");
    expect(source).toContain("RegExp");
    expect(source).toContain("matchAll");
    // Scanned under NO exemption and reported against the module the gate really
    // guards: a text scan over this file would fire on the words above.
    const documentationFixture = [
      "// This comment names RegExp, .test(, .match(, .exec(, .matchAll( and",
      "// .search( — and a pattern that looks like /[a-z]+/gi — on purpose.",
      "/** It also names them in a doc comment: new RegExp('x'), s.match(/y/). */",
      "export function stringsOnly(s: string): string[] {",
      '  return s.split("&");',
      "}",
    ].join("\n");
    expect(auditPatternUse("fixture.ts", documentationFixture)).toEqual([]);
  });
});

describe("the pattern gate's own failure paths, EXECUTED", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditPatternUse(file, src).map((f) => f.rule);

  it("rule 1 — a regex literal in a function body", () => {
    expect(
      rulesOf(
        [
          "export function f(s: string): boolean {",
          "  return /a+/.test(s);",
          "}",
        ].join("\n"),
      ),
    ).toContain("regex-literal");
  });

  it("rule 2 — a RegExp construction, with `new` and as a bare call", () => {
    expect(
      rulesOf(
        ['const r = new RegExp("a" + "+");', "export const x = r;"].join("\n"),
      ),
    ).toContain("regexp-construction");
    expect(
      rulesOf(
        ['const r = RegExp("a" + "+");', "export const x = r;"].join("\n"),
      ),
    ).toContain("regexp-construction");
  });

  it("rule 3 — each of the five pattern-executing method names", () => {
    for (const method of ["test", "match", "exec", "matchAll", "search"]) {
      expect(
        rulesOf(
          [
            "export function f(s: string, p: unknown): unknown {",
            `  return (p as { ${method}: (x: string) => unknown }).${method}(s);`,
            "}",
          ].join("\n"),
        ),
        method,
      ).toContain("pattern-execution");
    }
  });

  it("stays QUIET on `split`, `replace` and `replaceAll` with string arguments", () => {
    // Deliberately not on the banned list: with literals and RegExp both banned
    // there is no way to hand them a pattern, and banning them would ban
    // `split("&")`, which IS the implementation.
    expect(
      rulesOf(
        [
          "export function f(s: string): string {",
          '  return s.split("&").join("&").replace("a", "b").replaceAll("c", "d");',
          "}",
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  it("non-vacuity — an EMPTY source reports `vacuous-scan` and nothing else", () => {
    expect(auditPatternUse("observations.ts", "")).toEqual([
      {
        file: "observations.ts",
        rule: "vacuous-scan",
        detail:
          "observations.ts is empty. A pattern audit over an empty file reports zero violations and proves nothing.",
      },
    ]);
  });

  it("non-vacuity — a RENAMED anchor function reports `vacuous-scan`", () => {
    expect(
      rulesOf('export const x = "no markers here";', "observations.ts"),
    ).toContain("vacuous-scan");
    expect(
      rulesOf('export const x = "no markers here";', "telemetry.ts"),
    ).toContain("vacuous-scan");
  });

  it("the exemption is a COUNT — a SECOND literal in telemetry.ts fails", () => {
    const twoLiterals = [
      "export function redactUrls(t: string): string {",
      '  return t.replace(/[a-z]+:\\/\\//gi, "<url-redacted>");',
      "}",
      "export function redactPaths(t: string): string {",
      '  return t.replace(/(?:\\/[A-Za-z0-9._-]+){2,}/g, "<path-redacted>");',
      "}",
    ].join("\n");
    expect(rulesOf(twoLiterals, "telemetry.ts")).toContain(
      "exemption-exceeded",
    );
  });

  it("the exemption is an ANCHOR — the SAME single literal outside `redactUrls` fails", () => {
    const movedLiteral = [
      "export function redactUrls(t: string): string {",
      "  return applyPattern(t);",
      "}",
      "export function redactPaths(t: string): string {",
      '  return t.replace(/[a-z]+:\\/\\//gi, "<url-redacted>");',
      "}",
    ].join("\n");
    const findings = auditPatternUse("telemetry.ts", movedLiteral);
    expect(findings.map((f) => f.rule)).toContain("exemption-anchor");
    // And NOT the count rule: there is still exactly one literal. The two rules
    // fail for different reasons and say so.
    expect(findings.map((f) => f.rule)).not.toContain("exemption-exceeded");
  });

  it("the exemption does NOT travel — the same one-literal source fails in any other file", () => {
    // The thing a file-name skip would get wrong, asserted directly.
    const oneLiteral = [
      "export function redactQueryValues(t: string): string {",
      '  return redactUrlHead(t).replace(/x/g, "y");',
      "}",
    ].join("\n");
    expect(rulesOf(oneLiteral, "observations.ts")).toContain("regex-literal");
  });
});
