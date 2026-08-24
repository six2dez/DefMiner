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
 *  measuring nothing.
 *
 *  AMENDED 2026-08-22 (WR-22): `URL_MAX` is now an UPPER BOUND on the output, not
 *  the output's length. When the cut severs a query segment the truncation drops
 *  back to the last `&`, so the result is SHORTER than the bound by exactly that
 *  segment. Every assertion in this file that reads `toBe(URL_MAX)` was re-derived
 *  one at a time rather than relaxed in bulk, and each now says at its own site
 *  which of the three things it means: exactly the bound (the no-separator branch,
 *  where the byte cut still stands), at most the bound, or something about the
 *  tail's shape. A blanket `toBeLessThanOrEqual` would have said less than each of
 *  them did. */
const URL_MAX = 2048;

/** Where the two modules this file's pattern gate reads actually live. Relative
 *  to the repository root, matching `telemetry.spec.ts` and
 *  `outbound-prohibition.spec.ts`. */
const BACKEND_SRC = "packages/backend/src";

/** A real-shaped JWT prefix. Used as the thing that must NOT survive. */
const TOKEN = "eyJhbGciOiJIUzI1NiJ9";

/**
 * THE RECOVERABLE SPELLING of a padded token — the literal minus its trailing
 * `=` padding — derived ONCE here and called at EVERY absence assertion in this
 * file. Two populations of absence assertion exist (the
 * `BARE_CREDENTIAL_SHAPES` loop and the HEAD-side `do not survive ANYWHERE`
 * block) and they must not come to disagree about what "recoverable" spells.
 *
 * WHY THIS EXISTS AT ALL, and it is the sharpest lesson of round 3. Against the
 * defect this file's padded cases were written to catch, the column stores the
 * token MINUS ONE BYTE of padding: `?dXNlcjpwYTU1dzByZA==` was written as
 * `?dXNlcjpwYTU1dzByZA=<redacted>`. A substring search for the PADDED LITERAL
 * therefore returns false and the assertion PASSES while a whole HTTP Basic
 * credential is sitting in the row — re-pad the retained half, run `base64 -d`,
 * and it comes back byte-for-byte. Padding carries no information; it is not
 * part of the secret. So the question an absence assertion has to ask is "what
 * bytes make this recoverable?", and the answer is the core, never the literal.
 *
 * A PLAIN CHARACTER SCAN, not a pattern — this file's whole subject is a module
 * under `REDOS_RECOVERY = "kill"`, and a spec that reached for a pattern to
 * check a module forbidden one would be the wrong example to leave behind.
 */
function paddingStrippedCore(literal: string): string {
  let end = literal.length;
  while (end > 0 && literal[end - 1] === "=") end -= 1;
  return literal.slice(0, end);
}

/**
 * ONE absence assertion, BOTH spellings. Never `out.includes(literal)` alone.
 *
 * EVERY absence assertion in this file goes through here, and "every" is the
 * load-bearing word: scoping the rule to the table under test would be the same
 * defect one level down. An unpadded literal is its own core, so the two
 * assertions coincide and the call still reads correctly — which is why there is
 * one helper rather than a padded population and an unpadded one.
 *
 * The core is asserted non-empty first: a literal that is ENTIRELY padding has
 * an empty core, `"x".includes("")` is always true, and the assertion would
 * report a survival that never happened. Degenerate all-`=` shapes get their own
 * titled cases instead of going through here.
 */
function expectSecretAbsent(out: string, literal: string, label: string): void {
  const core = paddingStrippedCore(literal);
  expect(
    core.length,
    `${label}: \`${literal}\` is entirely padding — it has no recoverable core and does not belong in an absence assertion`,
  ).toBeGreaterThan(0);
  expect(
    out.includes(literal),
    `${label}: the LITERAL survived in ${out}`,
  ).toBe(false);
  expect(
    out.includes(core),
    `${label}: the PADDING-STRIPPED CORE \`${core}\` survived in ${out} — padding carries no information, so the core is the recoverable spelling`,
  ).toBe(false);
}

/**
 * Standard base64 of `user:pa55w0rd` — a whole HTTP Basic credential, TWO `=` of
 * padding, 20 characters. Comfortably inside `QUERY_NAME_MAX` = 64, which is why
 * the bound never helped: base64 of a 32-byte secret is 44 characters.
 */
const PADDED_BASIC_TWO_PAD = "dXNlcjpwYTU1dzByZA==";

/**
 * Standard base64 of `admin:hunter22` — ONE `=` of padding, so the value half of
 * this segment is EMPTY rather than a lone `=`. A DIFFERENT PATH through the same
 * predicate, and covering only one of the two is covering half the rule.
 */
const PADDED_BASIC_ONE_PAD = "YWRtaW46aHVudGVyMjI=";

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
 *
 * ---------------------------------------------------------------------------
 * WIDENED 2026-08-22 (CR-07), AND THE ORDER THE WIDENING WAS DERIVED IN MATTERS
 * ---------------------------------------------------------------------------
 * Round 2's eight entries were chosen against THE BRANCH — "what does this rule
 * now catch?" — and not one of them contained an `=`, which is precisely the
 * rule's blind spot. The table's own header warned about this and it came true
 * anyway. So the derivation is written down here, and it runs POLICY FIRST:
 *
 *   THE QUESTION. What is a credential-bearing segment? — never "what does the
 *   implementation do?"
 *
 *   THE ENCODING FACTS, enumerated before any shape is written:
 *     1. Standard base64 (RFC 4648 §4) pads the output to a multiple of four
 *        with `=`. A 3n+1-byte secret gets TWO pads, a 3n+2-byte secret gets ONE.
 *     2. base64url unpadded (RFC 4648 §5, and what JWTs use) has NO `=` at all.
 *     3. A URL-encoder turns `=` into `%3D`, so the same token arrives with its
 *        padding spelled in three bytes that contain no literal `=`.
 *     4. Padding carries no information: strip it, re-pad it, decode it, and the
 *        secret is unchanged. The RECOVERABLE spelling is the core.
 *
 *   THE SHAPES EACH FACT IMPLIES, then checked against the implementation — in
 *   that order, which is the order round 2 reversed:
 *     fact 1 -> a two-pad literal (value half is a lone `=`) and a ONE-pad
 *               literal (value half is EMPTY). Two different paths through one
 *               predicate; covering one of them covers half the rule.
 *     fact 1 -> a token with a single trailing `=` and nothing after it, which is
 *               the same shape arriving from a non-base64 producer.
 *     fact 2 -> an unpadded base64url token, asserted to STAY covered by the
 *               `=`-less branch rather than assumed to be.
 *     fact 3 -> percent-encoded padding, which takes the `=`-less branch and is
 *               redacted whole with its bytes never decoded (T-01-32).
 *     fact 4 -> every absence assertion below searches the padding-stripped core
 *               as well as the literal, through `expectSecretAbsent`.
 *
 * WHAT IS DELIBERATELY NOT IN THIS TABLE. A literal that is ENTIRELY `=` — `=`
 * and `==`. The loop below exercises each literal in VALUE form as
 * `?token=<literal>`, and for an all-`=` literal that segment's own value half is
 * pure padding, so the VALUE-form expectation legitimately differs. They get
 * their own titled cases instead of a special case inside the loop.
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
  // ---- ADDED 2026-08-22 (CR-07) — the `=`-bearing half of the policy --------
  {
    label:
      "HTTP Basic credential, standard base64 with TWO `=` of padding (20) — value half is a lone `=`",
    literal: PADDED_BASIC_TWO_PAD,
  },
  {
    label:
      "HTTP Basic credential, standard base64 with ONE `=` of padding (20) — value half is EMPTY",
    literal: PADDED_BASIC_ONE_PAD,
  },
  {
    label: "session id with a single trailing `=` and nothing after it (26)",
    literal: "sess10n1d0123456789abcdef=",
  },
  {
    label:
      "the two-pad credential with its padding PERCENT-ENCODED (24) — no literal `=`, so the `=`-less branch takes it and the bytes stay opaque (T-01-32)",
    literal: "dXNlcjpwYTU1dzByZA%3D%3D",
  },
  {
    label:
      "unpadded base64url (24) — no `=` at all, asserted to STAY covered rather than assumed to be",
    literal: "c2VjcmV0LXRva2VuLXZhbHVl",
  },
]);

/** How many `=` bytes a literal carries. A plain scan, for the same reason
 *  `paddingStrippedCore` is one: this file guards a module that may execute no
 *  pattern, and it should not set the opposite example. */
function equalsSignCount(literal: string): number {
  let n = 0;
  for (const ch of literal) if (ch === "=") n += 1;
  return n;
}

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
    expectSecretAbsent(out, TOKEN, "the JWT prefix");
    // PRESENCE, and the only reason a `.includes(` here is not an absence
    // assertion: the parameter NAME is what the policy deliberately keeps.
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
    // STRUCTURAL BYTE, not a credential — see the fragment case in the
    // `normaliseObservedUrl` block for why that exempts it from the
    // two-spelling rule rather than excusing it from one.
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
    expect(BARE_CREDENTIAL_SHAPES.length).toBeGreaterThanOrEqual(13);
    for (const s of BARE_CREDENTIAL_SHAPES) {
      expect(
        s.literal.length,
        `${s.label} is NOT shorter than QUERY_NAME_MAX — it proves nothing new`,
      ).toBeLessThan(QUERY_NAME_MAX);
    }
  });

  it("the table is STRUCTURALLY CAPABLE of failing on a PADDED credential (CR-07)", () => {
    // The assertion round 2 did not have, and its absence is the whole reason
    // this round exists. The count assertion above protects the eight original
    // shapes; this one protects the `=`-bearing ones the same way, so a table
    // that silently loses them fails LOUDLY instead of quietly measuring nothing.
    const withEquals = BARE_CREDENTIAL_SHAPES.filter((s) =>
      s.literal.includes("="),
    );
    expect(
      withEquals.length,
      "the table has fewer than three `=`-bearing shapes — it is blind in exactly the rule's blind spot again",
    ).toBeGreaterThanOrEqual(3);

    // BOTH sub-branches of the padding predicate, not just one: one `=` leaves an
    // EMPTY value half and two leave a value half that is only `=`. They are
    // different paths through the same rule.
    expect(
      withEquals.filter((s) => equalsSignCount(s.literal) === 1).length,
      "no shape carries exactly ONE `=` — the empty-value-half path is unexercised",
    ).toBeGreaterThanOrEqual(1);
    expect(
      withEquals.filter((s) => equalsSignCount(s.literal) === 2).length,
      "no shape carries exactly TWO `=` — the padding-only-value-half path is unexercised",
    ).toBeGreaterThanOrEqual(1);

    // And every `=`-bearing shape has a core that is worth searching for: a
    // non-empty one, and one that actually DIFFERS from the literal — otherwise
    // the two-spelling rule below would be searching for the same string twice.
    for (const s of withEquals) {
      const core = paddingStrippedCore(s.literal);
      expect(core.length, `${s.label}: empty core`).toBeGreaterThan(0);
      expect(
        core,
        `${s.label}: core does not differ from the literal`,
      ).not.toBe(s.literal);
    }
  });

  for (const { label, literal } of BARE_CREDENTIAL_SHAPES) {
    const bareIn = `https://cdn.test/a.js?${literal}`;
    const valueIn = `https://cdn.test/a.js?token=${literal}`;

    it(`${label}: does not survive anywhere in the output as a BARE segment`, () => {
      // SUBSTRING SEARCH over the whole returned string, never an equality
      // against a hand-written expected value — an equality passes when both
      // sides are wrong in the same way. BOTH SPELLINGS, through the one shared
      // helper: against the round-2 defect the output held the literal minus one
      // byte of padding, so a search for the literal alone PASSED on a live
      // credential.
      const out = redactQueryValues(bareIn);
      expectSecretAbsent(out, literal, `${label}: bare form`);
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
      expectSecretAbsent(out, literal, `${label}: VALUE form`);
      expect(out).toBe(`https://cdn.test/a.js?token=${QUERY_VALUE_REDACTION}`);
    });

    it(`${label}: the parameter COUNT is unchanged`, () => {
      // No option was allowed to silently normalise the query's shape.
      const mixed = `https://cdn.test/a.js?a=1&${literal}&b=2`;
      const out = redactQueryValues(mixed);
      expect(out.slice(out.indexOf("?") + 1).split("&").length).toBe(
        mixed.slice(mixed.indexOf("?") + 1).split("&").length,
      );
      expectSecretAbsent(out, literal, `${label}: parameter-count form`);
    });

    it(`${label}: the ";" delimiter gets the SAME policy — one policy, two delimiters`, () => {
      // `redactDelimitedSegment` is THE one shared helper. Mirroring every shape
      // here is what keeps that a measured statement rather than an assertion
      // about a shared function nobody re-tested on the second delimiter.
      const out = normaliseObservedUrl(`https://cdn.test/a.js;${literal}`);
      expectSecretAbsent(out, literal, `${label}: ";" bare parameter`);
      expect(out).toBe(`https://cdn.test/a.js;${QUERY_VALUE_REDACTION}`);
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

describe("a PADDED credential segment — the `=` was padding, not a separator (CR-07, T-01-78)", () => {
  // The rule under test, stated once: a pair whose VALUE half is empty, or whose
  // value half is nothing but `=`, was never a pair. Standard base64 pads with
  // `=`, so the most common shape of an opaque credential on the wire is exactly
  // that shape, and `QUERY_NAME_MAX` = 64 never bounded it — base64 of a 32-byte
  // secret is 44 characters, comfortably inside the retained name half.

  it("BOTH sub-branches: a value half of only `=` (two-pad) and an EMPTY value half (one-pad) redact WHOLE", () => {
    // Two pads: the value half is the single character `=`.
    const twoPad = redactQueryValues(
      `https://cdn.test/a.js?${PADDED_BASIC_TWO_PAD}`,
    );
    expectSecretAbsent(twoPad, PADDED_BASIC_TWO_PAD, "two-pad bare segment");
    expect(twoPad).toBe(`https://cdn.test/a.js?${QUERY_VALUE_REDACTION}`);

    // One pad: the value half is EMPTY. A different path through the same
    // predicate — the character loop never runs a single iteration.
    const onePad = redactQueryValues(
      `https://cdn.test/a.js?${PADDED_BASIC_ONE_PAD}`,
    );
    expectSecretAbsent(onePad, PADDED_BASIC_ONE_PAD, "one-pad bare segment");
    expect(onePad).toBe(`https://cdn.test/a.js?${QUERY_VALUE_REDACTION}`);
  });

  it("the SAME rule on the SAME helper covers the `;` delimiter — one policy, two delimiters", () => {
    // `redactDelimitedSegment` is deliberately THE one shared helper, so this is
    // not a second implementation being checked; it is the claim "one policy, two
    // delimiters" being kept true by execution rather than by a sentence about a
    // shared function nobody re-tested.
    for (const literal of [PADDED_BASIC_TWO_PAD, PADDED_BASIC_ONE_PAD]) {
      const out = normaliseObservedUrl(`https://cdn.test/a.js;${literal}`);
      expectSecretAbsent(out, literal, "`;` path parameter");
      expect(out).toBe(`https://cdn.test/a.js;${QUERY_VALUE_REDACTION}`);
    }
  });

  it("a GENUINE pair is untouched by the new branch — the name half is kept and only the value goes", () => {
    // The new branch must not have been implemented by weakening the branch that
    // already worked.
    expect(redactQueryValues("https://x.test/a.js?v=8c1f")).toBe(
      `https://x.test/a.js?v=${QUERY_VALUE_REDACTION}`,
    );
    expect(redactQueryValues("https://x.test/a.js?sig=a=b=c")).toBe(
      `https://x.test/a.js?sig=${QUERY_VALUE_REDACTION}`,
    );
  });

  it("a PADDED token in VALUE position still keeps its name and loses its value", () => {
    for (const literal of [PADDED_BASIC_TWO_PAD, PADDED_BASIC_ONE_PAD]) {
      const out = redactQueryValues(`https://cdn.test/a.js?token=${literal}`);
      expectSecretAbsent(out, literal, `?token=${literal}`);
      expect(out).toBe(`https://cdn.test/a.js?token=${QUERY_VALUE_REDACTION}`);
    }
  });

  it("ACCEPTED COST (CR-07): `?debug=` loses its NAME as well as its value", () => {
    // Stated in the title rather than left to be discovered. This is the faithful
    // reading of decision P10-D1, not an extension of it: `?debug` with NO `=` at
    // all is ALREADY redacted whole under that decision, and treating `?debug=`
    // differently would make the policy turn on a byte that carries nothing.
    expect(redactQueryValues("https://x.test/app.js?debug=")).toBe(
      `https://x.test/app.js?${QUERY_VALUE_REDACTION}`,
    );
    expect(normaliseObservedUrl("https://x.test/app.js;debug=")).toBe(
      `https://x.test/app.js;${QUERY_VALUE_REDACTION}`,
    );
  });

  it("redaction stays IDEMPOTENT over every padded shape, on both delimiters", () => {
    // `<redacted>` carries no `=`, so on a second pass it arrives as a bare
    // segment and is replaced with the same bytes. Asserted, because it is the
    // property that makes rewriting a row through the redactor safe any number of
    // times — and the new branch is the one that could have broken it.
    for (const literal of [PADDED_BASIC_TWO_PAD, PADDED_BASIC_ONE_PAD]) {
      for (const input of [
        `https://cdn.test/a.js?${literal}`,
        `https://cdn.test/a.js;${literal}`,
        `https://cdn.test/a.js?token=${literal}`,
        "https://x.test/app.js?debug=",
      ]) {
        const once = normaliseObservedUrl(input);
        expect(normaliseObservedUrl(once), input).toBe(once);
      }
    }
  });

  it("the scheme, the host and the path stay byte-identical across every padded shape", () => {
    for (const literal of [PADDED_BASIC_TWO_PAD, PADDED_BASIC_ONE_PAD]) {
      const input = `https://cdn.test/a.js?${literal}`;
      expect(normaliseObservedUrl(input).split("?")[0]).toBe(
        input.split("?")[0],
      );
    }
  });

  it("THE DEGENERATE SHAPES: a segment that is exactly `=`, and one that is exactly `==`", () => {
    // Kept OUT of `BARE_CREDENTIAL_SHAPES` on purpose and given their own case
    // instead: that table's loop also exercises every literal in VALUE form as
    // `?token=<literal>`, and for an all-`=` literal that segment's own value
    // half is pure padding, so the VALUE-form expectation legitimately differs.
    // A special case inside the loop would have been the wrong repair.
    expect(redactQueryValues("https://x.test/a.js?=")).toBe(
      `https://x.test/a.js?${QUERY_VALUE_REDACTION}`,
    );
    expect(redactQueryValues("https://x.test/a.js?==")).toBe(
      `https://x.test/a.js?${QUERY_VALUE_REDACTION}`,
    );
    expect(normaliseObservedUrl("https://x.test/a.js;=")).toBe(
      `https://x.test/a.js;${QUERY_VALUE_REDACTION}`,
    );
    expect(normaliseObservedUrl("https://x.test/a.js;==")).toBe(
      `https://x.test/a.js;${QUERY_VALUE_REDACTION}`,
    );
    // And the VALUE form, which is why they are here rather than in the table:
    // `?token==` has a value half of one `=`, so the WHOLE segment goes and the
    // name `token` does not survive.
    expect(redactQueryValues("https://x.test/a.js?token==")).toBe(
      `https://x.test/a.js?${QUERY_VALUE_REDACTION}`,
    );
  });
});

describe("RESIDUALS this rule deliberately LEAVES — pinned by execution, not named in prose (CR-07)", () => {
  // Every case below asserts the CURRENT behaviour, so the day somebody closes
  // one it goes RED and they update it deliberately. That is the same form as
  // "RESIDUAL, PINNED: a token embedded in a path SEGMENT is NOT redacted", and
  // it is what makes a residual a measured statement rather than a silence.
  //
  // Each was EXECUTED to determine the bytes below. None was predicted.

  it("RESIDUAL, PINNED: the retained NAME half of a GENUINE pair is kept whatever it contains — a credential pasted in NAME position survives", () => {
    // KEPT BY POLICY, and this case is the reason the sentence "every VALUE is
    // replaced" is NOT the sentence "no authorization token reaches this
    // column". The operator's UAT decision keeps parameter names because an
    // endpoint that takes an `access_token` parameter is worth being able to
    // see; a credential pasted where a name goes is the cost of that.
    //
    // Bounded by `QUERY_NAME_MAX` = 64 and by nothing else. Listed as an OPEN
    // grammar in `schema.spec.ts`.
    const pat = "ghp_AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIII";
    expect(redactQueryValues(`https://cdn.test/a.js?${pat}=1`)).toBe(
      `https://cdn.test/a.js?${pat}=${QUERY_VALUE_REDACTION}`,
    );
  });

  it("RESIDUAL, PINNED: the retained NAME half, second face — a token with an INTERIOR `=` keeps its prefix", () => {
    // The other way the same residual is reached: the `=` is neither padding nor
    // a real separator, it is a byte inside one opaque token. The split is on the
    // FIRST `=`, so the prefix is retained as a "name".
    expect(redactQueryValues("https://cdn.test/a.js?dXNlcjpw=YTU1dzByZA")).toBe(
      `https://cdn.test/a.js?dXNlcjpw=${QUERY_VALUE_REDACTION}`,
    );
  });

  it("RESIDUAL, PINNED: a SCHEME-RELATIVE reference keeps its userinfo verbatim — there is no `://`, so there is no authority to resolve", () => {
    // `redactUrlHead` resolves the authority AFTER the first `://` and does
    // nothing at all without one. Closing this means resolving an authority with
    // no scheme, which changes what `/@vite/client.js` means — the obvious wrong
    // implementation this module is built to avoid.
    //
    // UNREACHABLE TODAY, and the precondition is on the CALLER rather than on the
    // redactor: the only caller that reaches `recordObservation` with a
    // target-controlled URL is `consumer.ts`'s `rr.request.getUrl()`, which is
    // absolute. That is a fact about the caller and it is why this is ACCEPTED
    // (T-01-82) rather than open.
    expect(normaliseObservedUrl("//user:pa55w0rd@cdn.test/a.js")).toBe(
      "//user:pa55w0rd@cdn.test/a.js",
    );
    expect(redactUrlHead("//user:pa55w0rd@cdn.test/a.js")).toBe(
      "//user:pa55w0rd@cdn.test/a.js",
    );
  });

  it("RESIDUAL, PINNED: a `;` parameter inside the AUTHORITY is returned byte-identical — the `;` loop runs over the PATH only", () => {
    // Measured, not predicted: the authority is `s.slice(authStart, end)` where
    // `end` is the first `/`, `?` or `#`, and the `;` loop runs over
    // `s.slice(pathStart)`. A `;` in the reg-name never reaches the loop.
    //
    // Same acceptance and the same precondition as the case above: not reachable
    // through `rr.request.getUrl()`. The `;` ENFORCED row in `schema.spec.ts` is
    // qualified to the PATH because of this case.
    expect(
      normaliseObservedUrl("https://cdn.test;jsessionid=SECRETSESSION/app.js"),
    ).toBe("https://cdn.test;jsessionid=SECRETSESSION/app.js");
  });

  it("CLOSED 2026-08-22 (IN-18, by WR-22): the URL_MAX cut no longer lands INSIDE a `<redacted>` marker — it drops the WHOLE trailing segment, and this case now pins that", () => {
    // The bytes below were read off an execution, not reasoned to — both the ones
    // that used to be here and the ones that replaced them.
    //
    // WHAT THIS CASE USED TO BE, and why the record is kept rather than the
    // history quietly rewritten. It was a RESIDUAL pin: the `URL_MAX` byte cut
    // could land mid-marker, leaving a tail of `"p133=<re"`, and the case declined
    // the obvious repair with this reasoning —
    //
    //   "The obvious repair — drop the partial marker so the string ends `…&p133=`
    //    — INTERACTS with this plan's new branch: a segment whose value half is
    //    empty now redacts WHOLE, so a second pass over `…&p133=` produces
    //    `…&<redacted>` and the idempotence invariant asserted across every case in
    //    this file breaks."
    //
    // WHY THAT RATIONALE IS GONE, and it is gone under either outcome rather than
    // superseded by a better one. It defers on the strength of an invariant THE
    // SAME BRANCH HAD ALREADY BROKEN, on an input the repair has nothing to do
    // with: swept at 900 parameters, `normaliseObservedUrl` was not a fixed point
    // at 25 of 40 parameter-name lengths, the first at n=4. There was no invariant
    // left to protect. A finding cannot be deferred to protect something already
    // broken, and this comment is the record that it was.
    //
    // THE JOB IT SCOPED — "truncate on a `&` boundary rather than mid-marker,
    // which drops the whole trailing segment instead of half a marker" — WAS DONE,
    // by plan 01-20, in `normaliseObservedUrl`. It named "a later phase" as owner;
    // that ownership is discharged here and the sentence does not survive.
    //
    // WHAT THIS CASE PINS NOW: the amended behaviour, on the same fixture, read
    // off an execution —
    //
    //   len 2039 (BELOW `URL_MAX`, by exactly the dropped segment)
    //   last segment "p132=<redacted>"   — whole, not severed
    //   second pass === first pass
    //
    // so a future change to the truncation strategy goes RED here rather than
    // silently reintroducing a severed marker.
    const parts: string[] = [];
    for (let i = 0; i < 140; i += 1) parts.push(`p${String(i)}=v`);
    const out = normaliseObservedUrl(
      `https://cdn.test/a.js?${parts.join("&")}`,
    );

    // RE-DERIVED 2026-08-22 (WR-22). This read `toBe(URL_MAX)` and meant
    // "the byte cut landed here". It now means "at most the bound, and short of
    // it by exactly the segment the byte cut would have severed" — so it is
    // written as both halves rather than relaxed to the weaker one.
    expect(out.length).toBeLessThanOrEqual(URL_MAX);
    expect(out.length).toBe(2039);
    // The measured tail: a WHOLE segment. It read `"p133=<re"` — a name, its `=`
    // and a severed marker — and that shape no longer exists on this input.
    expect(out.slice(out.lastIndexOf("&") + 1)).toBe("p132=<redacted>");
    // Still a fixed point, now because the cut fell on a boundary rather than
    // because a severed marker happened to re-truncate to the same byte.
    expect(normaliseObservedUrl(out)).toBe(out);

    // The empty-value-half behaviour that the deleted rationale treated as an
    // obstacle. It is unchanged — CR-07's branch is untouched by plan 01-20 — and
    // it is kept here because it is worth pinning on its own account, not because
    // it still blocks anything.
    expect(normaliseObservedUrl("https://cdn.test/a.js?p133=")).toBe(
      `https://cdn.test/a.js?${QUERY_VALUE_REDACTION}`,
    );
  });
});

describe("normaliseObservedUrl", () => {
  it("routes through the redaction and still strips the fragment", () => {
    const out = normaliseObservedUrl("https://x.test/a.js?t=secret#f");
    expectSecretAbsent(out, "secret", "the query value");
    // STRUCTURAL BYTE, not a credential: `#` carries no padding, so its core is
    // itself and the two-spelling rule is satisfied by identity. Named here
    // rather than left to be classified by a later reader.
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

    // RE-DERIVED 2026-08-22 (WR-22) and LEFT ALONE: this one always meant "at
    // most the bound". The redacted form of this input is far shorter than
    // `URL_MAX`, so no truncation happens at all and the assertion is measuring
    // that the ordering did not leave a 3000-character value behind — not the
    // truncation strategy.
    expect(out.length).toBeLessThanOrEqual(URL_MAX);
    expectSecretAbsent(out, long.slice(0, 200), "the oversized value");
    expect(out).toBe(
      `https://x.test/a.js?t=${QUERY_VALUE_REDACTION}&marker=${QUERY_VALUE_REDACTION}`,
    );
  });

  it("IDEMPOTENT AT THE `URL_MAX` CUT: swept across parameter-name length, not hard-coded (WR-22)", () => {
    // THE POINT OF THIS CASE IS THE SEARCH, and it is the whole lesson of WR-22.
    //
    // The property "a second pass returns the first byte-for-byte" was already
    // asserted three times in this file — over `redactQueryValues` in `CASES` and
    // in the `BARE_CREDENTIAL_SHAPES` loop, and over `redactUrlHead` in
    // `HEAD_CASES`. All three assert it over a HELPER on a SHORT url, where the
    // truncation never runs. The only assertion over the COMPOSED function was one
    // 140-parameter fixture whose cut happened to land mid-marker, and the defect
    // lives one cut point away: the fixture is green on either side of it.
    //
    // So this case does not choose a cut. It moves the cut across every offset
    // inside a segment by sweeping the parameter-name length, and reports the
    // counterexample it finds by length and by both tails — a future regression
    // names itself instead of leaving the next reader to bisect.
    //
    // MEASURED BEFORE THE FIX, over n = 1..40 at 900 parameters: 25 of the 40
    // lengths were not fixed points, the first at n=4 —
    //   pass1  "…p111=<redacted>&pppp112="   len 2048
    //   pass2  "…p111=<redacted>&<redacte"   len 2048
    // Two mechanisms, both of them the truncation severing a segment: a cut just
    // after a `=` leaves an EMPTY value half, which CR-07's branch redacts whole,
    // and a cut inside a NAME leaves a segment with no `=`, which P10-D1 redacts
    // whole. Either way the retained name is destroyed on the second pass.
    const failures: string[] = [];
    let swept = 0;
    for (const count of [300, 900]) {
      for (let n = 1; n <= 64; n += 1) {
        const parts: string[] = [];
        for (let i = 0; i < count; i += 1) {
          parts.push(`${"p".repeat(n)}${String(i)}=v`);
        }
        const once = normaliseObservedUrl(
          `https://cdn.test/a.js?${parts.join("&")}`,
        );
        const twice = normaliseObservedUrl(once);
        swept += 1;
        if (twice !== once) {
          failures.push(
            `${count} params, name length ${n}: ` +
              `pass1 len ${once.length} tail ${JSON.stringify(once.slice(-24))}; ` +
              `pass2 len ${twice.length} tail ${JSON.stringify(twice.slice(-24))}`,
          );
        }
      }
    }
    expect(swept).toBe(128);
    expect(
      failures,
      `normaliseObservedUrl is NOT a fixed point at ${failures.length} of ${swept} swept cuts:\n${failures.join("\n")}`,
    ).toEqual([]);
  });

  it("the truncation drops a WHOLE trailing segment, never half of one, and never more than one (WR-22)", () => {
    // THE ACCEPTED COST, MEASURED rather than asserted. Past `URL_MAX` the cut
    // drops back to the last `&`, which costs exactly the segment the byte cut
    // would have severed — a parameter NAME the operator's UAT decision of
    // 2026-08-21 chose to keep. Never two segments: more than one would mean the
    // boundary logic is not doing what it says.
    let worstSegmentsLost = 0;
    for (let n = 1; n <= 40; n += 1) {
      const parts: string[] = [];
      for (let i = 0; i < 900; i += 1)
        parts.push(`${"p".repeat(n)}${String(i)}=v`);
      const out = normaliseObservedUrl(
        `https://cdn.test/a.js?${parts.join("&")}`,
      );

      // The result never ends inside a segment or inside a redaction marker.
      const tail = out.slice(out.lastIndexOf("&") + 1);
      expect(tail.endsWith(QUERY_VALUE_REDACTION), `n=${n} tail ${tail}`).toBe(
        true,
      );

      // What the OLD one-line rule would have produced, for the delta. Built from
      // the same parts rather than from the function, so it survives the function
      // changing again.
      const byteCut = `https://cdn.test/a.js?${parts
        .map((x) => `${x.split("=")[0]}=${QUERY_VALUE_REDACTION}`)
        .join("&")}`.slice(0, URL_MAX);
      const lost =
        byteCut.slice(byteCut.indexOf("?") + 1).split("&").length -
        out.slice(out.indexOf("?") + 1).split("&").length;
      if (lost > worstSegmentsLost) worstSegmentsLost = lost;
    }
    expect(worstSegmentsLost).toBe(1);
  });

  it("THE NO-SEPARATOR BRANCH: with no `&` inside the cut the byte cut STANDS, and the residual that lives there is SWEPT, not pinned at one chosen offset (WR-22/WR-28/WR-29)", () => {
    // THE DECISION, stated where it is asserted. When the cut lands in the HEAD,
    // or inside a query that has no `&` inside the cut, there is no segment
    // boundary to drop back to. The byte cut is KEPT — identical to what the old
    // one-line rule produced, so this branch retains exactly what it retained
    // before and discards nothing extra.
    //
    // WHY NOT drop back to the last `/` or to the `?`. On an oversized path the
    // last `/` can be at index 14, so dropping back to it would truncate a 2048
    // byte result to its authority — discarding roughly two kilobytes that a
    // segment-boundary cut would have kept. That is a different and much larger
    // decision than "retain strictly less, bounded at one trailing segment", which
    // is the bound the rest of this change is held to, so it is not taken here.

    // (a) An oversized path, no query at all: the byte cut stands, exactly.
    const path = normaliseObservedUrl(`https://x.test/${"p".repeat(4000)}`);
    expect(path.length).toBe(URL_MAX);

    // (b) RESIDUAL, PINNED BY A SWEEP AND NOT BY A CHOSEN OFFSET (WR-28).
    //
    // This block used to be one hard-coded path length — `"p".repeat(2010)` —
    // and the result was described as severed-but-stable. At 2010 that is true.
    // Nine offsets later it is false, and the single-offset claim was then
    // restated as a general property in `schema.spec.ts`'s `observations.url`
    // entry and in `observations.ts`'s own docblock. That is WR-22's lesson —
    // do not take the reviewer's cut point, sweep for the adversarial one —
    // applied to the query-side branch and NOT to the head-side branch in the
    // same commit. So the head-side branch is swept here the way the query-side
    // branch is swept above, and the residual is stated as what the sweep finds.
    //
    // THE MECHANISM, written down so the band stays re-derivable when `URL_MAX`
    // or the marker text moves. A head-side cut landing INSIDE the `<redacted>`
    // marker IS a fixed point: the second pass re-expands the marker and
    // re-truncates to the same byte. A head-side cut landing inside the
    // parameter NAME is NOT: the second pass sees a `;` segment with no `=` at
    // all, decision P10-D1 redacts that segment WHOLE, and the stored value can
    // SHRINK by a byte on the second pass.
    //
    // WHAT IS ASSERTED IS THE INSTABILITY'S SHAPE, NOT A LITERAL BAND. Writing
    // `2019` and `2029` into this file would be the same defect one layer up: a
    // number with no derivation, going RED for the wrong reason the day a
    // constant moves. What is pinned instead is that the unstable set is
    // NON-EMPTY (the residual is real and still open), CONTIGUOUS (one band, one
    // mechanism) and STRICTLY INSIDE the swept range (the sweep is wide enough to
    // have found its own edges). Any of those three changing is a real change.
    const HEAD_LO = 1975;
    const HEAD_HI = 2045;
    const headUnstable: number[] = [];
    let headSwept = 0;
    for (let n = HEAD_LO; n <= HEAD_HI; n += 1) {
      const once = normaliseObservedUrl(
        `https://cdn.test/${"p".repeat(n)};jsessionid=SECRETSESSION`,
      );
      const twice = normaliseObservedUrl(once);
      headSwept += 1;
      if (twice !== once) headUnstable.push(n);

      // THE OTHER HALF OF THE RESIDUAL, ASSERTED BESIDE IT AND NOT ELSEWHERE.
      // What failed was the STABILITY claim; what holds is the REDACTION. A
      // reader who finds only one of the two asserted cannot tell which half the
      // disclosure is about — so both passes are checked at EVERY swept offset,
      // with this file's own secret-absence helper, including across the whole
      // unstable band.
      expect(once.length).toBeLessThanOrEqual(URL_MAX);
      expectSecretAbsent(once, "SECRETSESSION", `head length ${n}, pass 1`);
      expectSecretAbsent(twice, "SECRETSESSION", `head length ${n}, pass 2`);
    }
    expect(headSwept).toBe(HEAD_HI - HEAD_LO + 1);
    expect(
      headUnstable.length,
      `the head-side residual is CLOSED across n=${HEAD_LO}..${HEAD_HI}. If that is deliberate, this case and the three disclosures naming it (this comment, schema.spec.ts's observations.url entry, observations.ts's no-separator paragraph) all have to change together.`,
    ).toBeGreaterThan(0);
    expect(
      headUnstable[headUnstable.length - 1] - headUnstable[0] + 1,
      `the head-side unstable set is no longer ONE contiguous band, so it is no longer one mechanism: ${headUnstable.join(" ")}`,
    ).toBe(headUnstable.length);
    expect(
      headUnstable.every((n) => n > HEAD_LO && n < HEAD_HI),
      `the unstable band reaches an edge of the swept range (${headUnstable.join(" ")}) — widen HEAD_LO/HEAD_HI before trusting this result`,
    ).toBe(true);

    // The two shapes named above, with executed bytes rather than prose. The
    // first is the offset the old fixture chose: the cut lands inside the marker,
    // and it IS a fixed point — which is exactly why the single-offset pin passed
    // for a round while the property it was cited for was false.
    const markerCut = normaliseObservedUrl(
      `https://cdn.test/${"p".repeat(2010)};jsessionid=SECRETSESSION`,
    );
    expect(markerCut.length).toBe(URL_MAX);
    expect(markerCut.slice(-26)).toBe("ppppp;jsessionid=<redacted");
    expect(normaliseObservedUrl(markerCut)).toBe(markerCut);

    // The first offset the sweep FOUND unstable — read out of the run, never
    // hard-coded. The cut lands just past the `=`, so the second pass has a `;`
    // segment with an empty value half and redacts it whole: one byte shorter.
    const nameCut = normaliseObservedUrl(
      `https://cdn.test/${"p".repeat(headUnstable[0])};jsessionid=SECRETSESSION`,
    );
    expect(nameCut.length).toBe(URL_MAX);
    expect(nameCut.slice(-12)).toBe(";jsessionid=");
    const nameCutTwice = normaliseObservedUrl(nameCut);
    expect(nameCutTwice).not.toBe(nameCut);
    expect(nameCutTwice.length).toBe(nameCut.length - 1);
    expect(nameCutTwice.slice(-11)).toBe(";<redacted>");

    // (c) RESIDUAL, PINNED — the class the sweep above cannot reach, stated
    // against the BRANCH CONDITION and not against the fixture that found it
    // (WR-29).
    //
    // The branch is `q === -1 || amp <= q`: what puts a URL in this class is that
    // there is NO `&` INSIDE THE CUT — i.e. the cut lands before the query's
    // first `&`. How many parameters the query has PAST the cut is irrelevant.
    // This case used to be scoped to a query of one segment only, and both
    // disclosures repeated that scoping, which tells a reader that a URL with
    // more than one query parameter is outside the residual. It is not: a long
    // path with a long FIRST parameter is the ordinary shape, and the sweep below
    // uses a three-parameter query for exactly that reason.
    const MULTI_LO = 1975;
    const MULTI_HI = 2045;
    const multiUnstable: number[] = [];
    let multiSwept = 0;
    for (let n = MULTI_LO; n <= MULTI_HI; n += 1) {
      const once = normaliseObservedUrl(
        `https://x.test/${"p".repeat(n)}?nnnnnnnnnnnnnnnn=SECRETALPHA&b=2&c=3`,
      );
      const twice = normaliseObservedUrl(once);
      multiSwept += 1;
      if (twice !== once) multiUnstable.push(n);
      expect(once.length).toBeLessThanOrEqual(URL_MAX);
      expectSecretAbsent(once, "SECRETALPHA", `multi head length ${n}, pass 1`);
      expectSecretAbsent(
        twice,
        "SECRETALPHA",
        `multi head length ${n}, pass 2`,
      );
    }
    expect(multiSwept).toBe(MULTI_HI - MULTI_LO + 1);
    expect(
      multiUnstable.length,
      `a MULTI-segment query is now a fixed point across n=${MULTI_LO}..${MULTI_HI}. The residual's scope changed; restate it in schema.spec.ts and observations.ts before deleting this.`,
    ).toBeGreaterThan(0);
    expect(
      multiUnstable[multiUnstable.length - 1] - multiUnstable[0] + 1,
      `the multi-segment unstable set is no longer one contiguous band: ${multiUnstable.join(" ")}`,
    ).toBe(multiUnstable.length);
    expect(
      multiUnstable.every((n) => n > MULTI_LO && n < MULTI_HI),
      `the multi-segment unstable band reaches an edge of the swept range (${multiUnstable.join(" ")}) — widen MULTI_LO/MULTI_HI`,
    ).toBe(true);

    // The first offset the multi-segment sweep FOUND — again read out of the run.
    // The cut lands inside the FIRST parameter's name, before that query's first
    // `&`, so there is no boundary to drop back to and the byte cut stands; the
    // second pass then redacts the partial segment whole. Two more parameters sit
    // past the cut and change nothing, which is the whole point of the case.
    const multi = normaliseObservedUrl(
      `https://x.test/${"p".repeat(multiUnstable[0])}?nnnnnnnnnnnnnnnn=SECRETALPHA&b=2&c=3`,
    );
    expect(multi.length).toBe(URL_MAX);
    expect(multi.slice(-26)).toBe("pppppppp?nnnnnnnnnnnnnnnn=");
    const multiTwice = normaliseObservedUrl(multi);
    expect(multiTwice).not.toBe(multi);
    expect(multiTwice.slice(-26)).toBe("ppppppppppppppp?<redacted>");
  });

  it("still bounds the result at URL_MAX when the PATH alone is oversized", () => {
    const out = normaliseObservedUrl(`https://x.test/${"p".repeat(4000)}`);
    // RE-DERIVED 2026-08-22 (WR-22) and KEPT AS EQUALITY, deliberately. This
    // input carries no `?` at all, so the cut takes the NO-SEPARATOR branch and
    // the byte cut stands untouched — `URL_MAX` is still the exact output length
    // HERE. Relaxing this to `toBeLessThanOrEqual` because a sibling assertion
    // needed it would have stopped measuring the thing this case is about.
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
  // ---- ADDED 2026-08-22 (CR-07) — the `;` MIRROR of every padded shape -----
  // "One policy, two delimiters" is the claim; two tables exercising different
  // shapes is how that claim quietly stops being true. Every shape added to
  // `BARE_CREDENTIAL_SHAPES` has its mirror here.
  {
    name: "a PADDED bare `;` segment with TWO `=` of padding is redacted WHOLE — the `=` was padding, not a separator",
    in: `https://cdn.test/a.js;${PADDED_BASIC_TWO_PAD}`,
    out: `https://cdn.test/a.js;${QUERY_VALUE_REDACTION}`,
  },
  {
    name: "a PADDED bare `;` segment with ONE `=` of padding — the EMPTY value half, the other sub-branch",
    in: `https://cdn.test/a.js;${PADDED_BASIC_ONE_PAD}`,
    out: `https://cdn.test/a.js;${QUERY_VALUE_REDACTION}`,
  },
  {
    name: "a `;` segment that is a token with a single trailing `=` and nothing after it",
    in: "https://cdn.test/a.js;sess10n1d0123456789abcdef=",
    out: `https://cdn.test/a.js;${QUERY_VALUE_REDACTION}`,
  },
  {
    name: "a `;` segment carrying PERCENT-ENCODED padding takes the `=`-less branch and stays opaque (T-01-32)",
    in: "https://cdn.test/a.js;dXNlcjpwYTU1dzByZA%3D%3D",
    out: `https://cdn.test/a.js;${QUERY_VALUE_REDACTION}`,
  },
  {
    name: "an UNPADDED base64url `;` segment stays covered by the `=`-less branch",
    in: "https://cdn.test/a.js;c2VjcmV0LXRva2VuLXZhbHVl",
    out: `https://cdn.test/a.js;${QUERY_VALUE_REDACTION}`,
  },
  {
    name: "ACCEPTED COST (CR-07) on the `;` delimiter too: `;debug=` loses its NAME as well as its value",
    in: "https://cdn.test/a.js;debug=",
    out: `https://cdn.test/a.js;${QUERY_VALUE_REDACTION}`,
  },
  {
    name: "a `;` segment that is exactly `=` was never a pair",
    in: "https://cdn.test/a.js;=",
    out: `https://cdn.test/a.js;${QUERY_VALUE_REDACTION}`,
  },
  {
    name: "a `;` segment that is exactly `==` was never a pair either",
    in: "https://cdn.test/a.js;==",
    out: `https://cdn.test/a.js;${QUERY_VALUE_REDACTION}`,
  },
  {
    // The branch that already worked, asserted not to have been weakened to make
    // the new one pass — on this delimiter as well as on `&`.
    name: "a PADDED token in `;` VALUE position still keeps its name and loses its value",
    in: `https://cdn.test/a.js;sid=${PADDED_BASIC_TWO_PAD}`,
    out: `https://cdn.test/a.js;sid=${QUERY_VALUE_REDACTION}`,
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
  {
    // ADDED 2026-08-22 (CR-07), and stated as a PRECONDITION ON THE CALLER
    // rather than as a property of the redactor: the authority is resolved after
    // the first `://` and a scheme-relative reference has none. Not reachable
    // through `consumer.ts`'s `rr.request.getUrl()`, which is absolute.
    name: "RESIDUAL, PINNED: a SCHEME-RELATIVE reference keeps its userinfo — with no `://` there is no authority to resolve",
    in: "//user:pa55w0rd@cdn.test/a.js",
    out: "//user:pa55w0rd@cdn.test/a.js",
  },
  {
    // ADDED 2026-08-22 (CR-07). Measured before it was pinned: the `;` loop runs
    // over `s.slice(pathStart)`, so a `;` in the reg-name never reaches it. This
    // case is why the `;` ENFORCED row in `schema.spec.ts` is qualified to the
    // PATH.
    name: "RESIDUAL, PINNED: a `;` parameter inside the AUTHORITY is byte-identical — the `;` rule is a PATH rule",
    in: "https://cdn.test;jsessionid=SECRETSESSION/app.js",
    out: "https://cdn.test;jsessionid=SECRETSESSION/app.js",
  },
];

describe("the URL HEAD — userinfo and `;` path parameters (WR-11, T-01-57, T-01-58)", () => {
  it("enumerates a NON-EMPTY table covering all three head grammars", () => {
    // Non-vacuity, in the shape `error-redaction.spec.ts` uses: a table-driven
    // gate over an empty table reports nothing wrong and proves nothing.
    expect(HEAD_CASES.length).toBeGreaterThanOrEqual(24);
    expect(HEAD_CASES.filter((c) => c.in.includes("@")).length).toBeGreaterThan(
      2,
    );
    // RAISED 2026-08-22 (CR-07) from 3 to 14 along with the `;` mirror of every
    // padded shape. A floor that stays where it was while the table grows stops
    // protecting anything: the point of the number is that DELETING the mirrors
    // fails loudly.
    expect(HEAD_CASES.filter((c) => c.in.includes(";")).length).toBeGreaterThan(
      14,
    );
    // And the `;` half must carry `=`-bearing shapes, for the same reason the
    // query table must: the whole defect lived in the `=` branch.
    expect(
      HEAD_CASES.filter((c) => c.in.includes(";") && c.in.includes("=")).length,
      "the `;` half of the table has fewer than six `=`-bearing shapes — it is blind where the rule is",
    ).toBeGreaterThanOrEqual(6);
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
    //
    // AND THE SEARCH RUNS ON BOTH SPELLINGS, through the SAME helper the
    // `BARE_CREDENTIAL_SHAPES` loop calls (widened 2026-08-22, CR-07). This block
    // is the SECOND population of absence assertion in this file — a hand-written
    // list sitting BESIDE the table loop rather than inside it — and it was
    // vulnerable to the identical blindness: against the defect the output held a
    // padded literal minus one byte, so a search for the literal PASSED. The
    // comment above warns that an equality "passes when both sides are wrong in
    // the same way", and a literal-only substring search is exactly that failure
    // wearing a different shape. Fixing only the table would have been the same
    // defect one level down.
    const secrets: ReadonlyArray<readonly [string, string]> = [
      ["https://user:pa55w0rd@cdn.test/app.js", "pa55w0rd"],
      ["https://user:pa55w0rd@cdn.test/app.js", "user"],
      ["https://cdn.test/a.js;jsessionid=SECRETSESSION", "SECRETSESSION"],
      ["https://cdn.test/a.js;SECRETTOKEN", "SECRETTOKEN"],
      ["https://user:pw@cdn.test/a.js;jsessionid=S?token=T", "pw"],
      // The padded shapes, on BOTH delimiters. Each goes in ONCE and is searched
      // under both spellings by the helper — never hand-written twice, because
      // two hand-written spellings are two chances to disagree.
      [`https://cdn.test/a.js?${PADDED_BASIC_TWO_PAD}`, PADDED_BASIC_TWO_PAD],
      [`https://cdn.test/a.js;${PADDED_BASIC_TWO_PAD}`, PADDED_BASIC_TWO_PAD],
      [`https://cdn.test/a.js?${PADDED_BASIC_ONE_PAD}`, PADDED_BASIC_ONE_PAD],
      [`https://cdn.test/a.js;${PADDED_BASIC_ONE_PAD}`, PADDED_BASIC_ONE_PAD],
      [
        "https://cdn.test/a.js;sess10n1d0123456789abcdef=",
        "sess10n1d0123456789abcdef=",
      ],
    ];
    for (const [input, secret] of secrets) {
      expectSecretAbsent(normaliseObservedUrl(input), secret, input);
    }
  });

  it("the `@` and the HOST survive — the URL carried userinfo and that fact is kept, the bytes are not", () => {
    // Dropping userinfo entirely was WR-11's own recommendation ("there is no
    // analytic value in it"). Keeping the separator preserves strictly more
    // signal than that asked for, and it is what makes the step idempotent: a
    // second pass finds `<redacted>` as the userinfo and replaces it with
    // itself.
    const out = normaliseObservedUrl("https://user:pa55w0rd@cdn.test/app.js");
    // PRESENCE assertions, both of them — the `@` and the host are what the
    // policy deliberately KEEPS. Exempt from the two-spelling rule by kind.
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
    // RE-DERIVED 2026-08-22 (WR-22), KEPT AS EQUALITY for the same reason as the
    // oversized-path case: the cut lands in the HEAD, there is no `?` inside it,
    // the no-separator branch returns the byte cut, and the exact length is still
    // the fact worth asserting.
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
    // PRESENCE: the parameter name is kept on purpose.
    expect(rows[0].url.includes("token=")).toBe(true);
    expectSecretAbsent(rows[0].url, "hunter2", "the stored row");
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
    expectSecretAbsent(rows[0].url, literal, "the stored row");
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
    expectSecretAbsent(rows[0].url, "pa55w0rd", "the stored row");
    expectSecretAbsent(rows[0].url, "SECRETSESSION", "the stored row");
    expect(rows[0].url).toBe(
      `https://${QUERY_VALUE_REDACTION}@cdn.test/app.js;jsessionid=${QUERY_VALUE_REDACTION}`,
    );
  });

  it("a PADDED credential does not reach the column on EITHER delimiter (CR-07, T-01-78, T-01-79)", async () => {
    // THE TRACER SLICE. One padded credential in at `normaliseObservedUrl`,
    // through `redactDelimitedSegment` on BOTH delimiters, through
    // `recordObservation`'s INSERT, into a real SQLite file, and back out
    // through `listObservations` — asserted on the bytes that were STORED, not
    // on the value the function returned. A pure-function case cannot tell
    // whether the redactor is wired into the write.
    //
    // BOTH DELIMITERS IN ONE CASE, deliberately. `redactDelimitedSegment` is THE
    // one shared helper — the `&` query loop and the `;` path loop both call it —
    // so a fix proven on `&` alone is a claim wider than its evidence, and the
    // code review executed the `;` form and reproduced the defect there.
    //
    // WHAT THIS LOOKED LIKE BEFORE THE FIX, reproduced by execution rather than
    // described: the column held
    //   https://cdn.test/a.js?dXNlcjpwYTU1dzByZA=<redacted>
    //   https://cdn.test/a.js;dXNlcjpwYTU1dzByZA=<redacted>
    // The `=` was PADDING and was read as a separator, so the credential was
    // promoted into the half the policy KEEPS.
    const query = await recordObservation(
      fx.db,
      "project-one",
      "e".repeat(64),
      "r5",
      `https://cdn.test/a.js?${PADDED_BASIC_TWO_PAD}`,
      200,
      null,
      1_700_000_000_004,
    );
    expect(query.ok, JSON.stringify(query)).toBe(true);

    const path = await recordObservation(
      fx.db,
      "project-one",
      "f".repeat(64),
      "r6",
      `https://cdn.test/a.js;${PADDED_BASIC_TWO_PAD}`,
      200,
      null,
      1_700_000_000_005,
    );
    expect(path.ok, JSON.stringify(path)).toBe(true);

    const rows = await listObservations(fx.db, "project-one");
    expect(rows.length).toBe(2);
    for (const row of rows) {
      expectSecretAbsent(
        row.url,
        PADDED_BASIC_TWO_PAD,
        `stored row ${row.request_id}`,
      );
    }

    const byId = new Map(rows.map((r) => [r.request_id, r.url]));
    expect(byId.get("r5")).toBe(
      `https://cdn.test/a.js?${QUERY_VALUE_REDACTION}`,
    );
    expect(byId.get("r6")).toBe(
      `https://cdn.test/a.js;${QUERY_VALUE_REDACTION}`,
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
    expectSecretAbsent(rows[0].url, TOKEN, "the stored row");
    // PRESENCE: the parameter name is kept on purpose.
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
// here.
//
// WIDENED 2026-08-22 (WR-20) SO THAT THE CLAIM AND THE ENFORCEMENT SAY THE SAME
// THING. Until that date the claim was about CODE and the enforcement was about
// TEXT: the rules banned a pattern being WRITTEN in the module — a regex literal,
// a `RegExp` construction — and excluded `.replace`/`.replaceAll`/`.split`
// outright, on the argument that with the first two banned there was no way to
// hand them a pattern. That argument is sound for a pattern written HERE and says
// nothing about one that ARRIVES: imported from a sibling module, passed in as a
// parameter, or read off an object defeats it with none of the banned constructs
// present anywhere in the file.
//
// OPTION (a) WAS TAKEN — the rule, not the restated bound. Rule 4 flags a call to
// `replace`, `replaceAll` or `split` whose FIRST argument is not a string
// literal. That permits every existing call site (`split("&")`, `split("/")`,
// `split(";")`, `split("#")` — all four asserted quiet against the REAL file) and
// rejects every identifier, property access, call and interpolating template,
// which is the shape a smuggled pattern takes. What rule 4 does NOT catch is
// stated below as a bound rather than left as a silence.
//
// AND THE ONE PERMITTED LITERAL IS STILL PERMITTED THROUGH THE SAME COUNT PLUS
// ANCHOR. `telemetry.ts:269` calls `.replace` with a REGEX LITERAL as its first
// argument, so the naive form of rule 4 fires on the one call the exemption
// exists to allow, and the obvious repair — a file-name skip — is the thing this
// header says at length a reader would copy. The actual mechanism: rule 4 passes
// a regex-literal argument through WITHOUT a verdict, because rule 1 already
// counts every regex literal in the module and judges it under the
// count-plus-anchor exemption. So the call is covered BY ITS LITERAL BEING
// COVERED. Add a second literal, or move that one out of `redactUrls`, and the
// call goes red with it; put the identical call in `observations.ts` and it goes
// red there. All three are executed below.
//
// WHAT RULE 4 DOES NOT CATCH, stated with the precision
// `outbound-prohibition.spec.ts`'s boundary 2 uses:
//   - A pattern reaching a scanned module through a method this gate does not
//     name — a user helper, `String.raw`, a `for` loop doing its own matching.
//     The set is `PATTERN_ARGUMENT_METHODS` plus `PATTERN_EXECUTING_METHODS` and
//     it is an ENUMERATION, not a proof.
//   - WHETHER the non-literal argument is actually a pattern. Rule 4 cannot know:
//     `t.split(d)` with `d` a one-character string is flagged exactly like
//     `t.replace(IMPORTED_PATTERN, x)`. That is deliberate — it fails toward the
//     report — and the escape is a string literal, which every call site in both
//     scanned modules already uses. It is also the reason this rule would be
//     wrong for a general-purpose codebase and is right for these two files.
//   - The scan is still TWO FILES. A pattern executing in a module neither of
//     them names is outside this gate entirely; `PATTERN_SCAN_MARKERS` is what
//     makes adding a third file a deliberate act. The module-level claim — "the implementation is string splitting only" —
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
// difference is the whole mechanism — including under rule 4, which is where the
// temptation to add one first appeared. `telemetry.ts` may hold EXACTLY ONE regex
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
 * `split` and the two replace methods are ABSENT FROM THIS SET and are covered by
 * {@link PATTERN_ARGUMENT_METHODS} instead — see the note there for why the
 * original reasoning for excluding them entirely did not hold.
 */
const PATTERN_EXECUTING_METHODS = new Set([
  "test",
  "match",
  "exec",
  "matchAll",
  "search",
]);

/**
 * The three method names that execute a pattern ONLY IF ONE IS HANDED TO THEM.
 *
 * ADDED 2026-08-22 (WR-20), AND THIS IS THE CLAIM-VERSUS-ENFORCEMENT GAP IT
 * CLOSES. These three used to be excluded outright, on the argument that "with
 * regex literals and `RegExp` construction both banned there is no way to hand
 * them a pattern". That premise holds for a pattern WRITTEN IN THE SCANNED
 * MODULE. It says nothing about a pattern that ARRIVES — imported from a sibling
 * module, passed in as a parameter, or read off an object — which defeats it with
 * none of the three banned constructs present anywhere in the file.
 *
 * Exposure today is ZERO: every call site in the scanned modules passes a string
 * literal, and the four in `observations.ts` (`"/"`, `";"`, `"&"`, `"#"`) are
 * asserted quiet below. Exposure the day somebody factors the redactors into a
 * shared `patterns.ts` is TOTAL, and — this is the part that matters — SILENT,
 * on a runtime where `REDOS_RECOVERY` is kill and the recovery is SIGKILL taking
 * `caido-cli` down with the operator's live project data.
 *
 * THE RULE: the FIRST argument must be a string literal (or a
 * no-substitution template, which is the same thing written differently). An
 * identifier, a property access, a call, or an interpolating template is the
 * shape a smuggled pattern takes, and is reported as `smuggled-pattern`.
 *
 * A REGEX LITERAL first argument is deliberately NOT reported by this rule — not
 * because it is permitted, but because rule 1 already counts every regex literal
 * in the module and judges it under the count-plus-anchor exemption. That is how
 * `telemetry.ts:269`'s permitted `.replace(/…/gi, URL_REDACTION)` survives: NOT
 * through a file-name skip, NOT through a line-number special case, but because
 * the literal it passes is the one literal the exemption spends, anchored inside
 * `redactUrls`. Add a second literal, or move that one out of `redactUrls`, and
 * the call goes red with it — both executed below.
 */
const PATTERN_ARGUMENT_METHODS = new Set(["replace", "replaceAll", "split"]);

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

    // ---- Rule 4: replace / replaceAll / split with a NON-LITERAL first arg. -
    // WR-20. A regex literal argument falls through to rule 1's count-plus-anchor
    // verdict rather than being judged here, which is what extends the ONE
    // permitted literal's exemption to cover its call without a file-name skip.
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      PATTERN_ARGUMENT_METHODS.has(node.expression.name.text)
    ) {
      const first = node.arguments[0];
      if (
        first !== undefined &&
        !ts.isStringLiteralLike(first) &&
        !ts.isRegularExpressionLiteral(first)
      ) {
        add(
          "smuggled-pattern",
          `${base}:${String(lineOf(node))} calls .${node.expression.name.text}() with a first argument this gate cannot read as a string literal. A pattern that ARRIVES — imported, passed in, or read off an object — needs none of the constructs rules 1 and 2 ban, and REDOS_RECOVERY is "kill" on this runtime: SIGKILL is the only exit and it takes caido-cli down with the operator's live project data. Pass a string literal, or measure the pattern's linearity and spend an exemption on it.`,
        );
      }
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

// ===========================================================================
// WR-20 — A PATTERN THAT ARRIVES RATHER THAN BEING WRITTEN
// ===========================================================================
// THE THREAT, AND THE FIXTURES ARE DERIVED FROM IT RATHER THAN FROM THE RULE.
// The gate's claim was "this module's OWN CODE executes no pattern"; its
// enforcement was "no pattern is WRITTEN in this module". The gap between those
// two sentences is every way a pattern can reach a scanned module without
// appearing in it, so those are the shapes below: an import, a parameter, an
// object property, and a module-level const initialised from an import. None of
// them needs a regex literal or a `RegExp` construction anywhere in the file.
describe("a pattern that ARRIVES defeats none of the banned constructs (WR-20)", () => {
  const rulesOf = (src: string, file = "fixture.ts"): string[] =>
    auditPatternUse(file, src).map((f) => f.rule);

  it("an IMPORTED pattern used in .replace is flagged", () => {
    expect(
      rulesOf(
        [
          'import { URL_PATTERN } from "./patterns";',
          "export function f(t: string): string {",
          '  return t.replace(URL_PATTERN, "<redacted>");',
          "}",
        ].join("\n"),
      ),
    ).toContain("smuggled-pattern");
  });

  it("a RegExp arriving as a PARAMETER and used in .split is flagged", () => {
    expect(
      rulesOf(
        [
          "export function f(t: string, p: RegExp): string[] {",
          "  return t.split(p);",
          "}",
        ].join("\n"),
      ),
    ).toContain("smuggled-pattern");
  });

  it("a pattern read off an OBJECT PROPERTY is flagged", () => {
    expect(
      rulesOf(
        [
          "export function f(t: string, cfg: { url: RegExp }): string {",
          '  return t.replaceAll(cfg.url, "x");',
          "}",
        ].join("\n"),
      ),
    ).toContain("smuggled-pattern");
  });

  it("a module-level const INITIALISED FROM AN IMPORT is flagged at the call", () => {
    expect(
      rulesOf(
        [
          'import { patterns } from "./patterns";',
          "const URL_PATTERN = patterns.url;",
          "export function f(t: string): string {",
          '  return t.replace(URL_PATTERN, "<redacted>");',
          "}",
        ].join("\n"),
      ),
    ).toContain("smuggled-pattern");
  });

  it("an INTERPOLATING template argument is flagged; a no-substitution one is not", () => {
    // A template with substitutions is assembled at runtime and the gate cannot
    // read it; a bare backtick string is a string literal written differently.
    expect(
      rulesOf(
        "export function f(t: string, d: string): string[] { return t.split(`${d}`); }",
      ),
    ).toContain("smuggled-pattern");
    expect(
      rulesOf(
        "export function f(t: string): string[] { return t.split(`&`); }",
      ),
    ).toEqual([]);
  });

  // ---- THE MUST-STAY-QUIET SET -------------------------------------------
  // A widening that breaks the implementation it protects is reverted within the
  // hour. These are the real call sites, asserted against the REAL FILES rather
  // than only against inline sources.

  it("the FOUR literal .split calls in the real observations.ts stay quiet", () => {
    const file = join(BACKEND_SRC, "store", "observations.ts");
    const source = readFileSync(file, "utf8");
    // Non-vacuity for this very assertion: if the implementation stops splitting
    // on literals this case would pass by measuring nothing.
    for (const literal of [
      'split("/")',
      'split(";")',
      'split("&")',
      'split("#")',
    ]) {
      expect(
        source,
        `${literal} is no longer in observations.ts, so this quiet-set case is vacuous`,
      ).toContain(literal);
    }
    expect(auditPatternUse(file, source)).toEqual([]);
  });

  it("the ONE permitted .replace in the real telemetry.ts stays quiet — through the exemption, not a skip", () => {
    const file = join(BACKEND_SRC, "telemetry.ts");
    const source = readFileSync(file, "utf8");
    expect(
      source,
      "telemetry.ts no longer calls .replace with the permitted literal, so this case is vacuous",
    ).toContain(".replace(/");
    expect(auditPatternUse(file, source)).toEqual([]);
  });

  it("EXEMPTION INTEGRITY under the widened rule — a SECOND literal still fails", () => {
    // The mutation that would have been silently permitted by a file-name skip.
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

  it("EXEMPTION INTEGRITY under the widened rule — the literal MOVED OUT of redactUrls still fails", () => {
    const movedLiteral = [
      "export function redactUrls(t: string): string {",
      "  return applyPattern(t);",
      "}",
      "export function redactPaths(t: string): string {",
      '  return t.replace(/[a-z]+:\\/\\//gi, "<url-redacted>");',
      "}",
    ].join("\n");
    expect(rulesOf(movedLiteral, "telemetry.ts")).toContain("exemption-anchor");
  });

  it("the exempted CALL does not travel either — the same call in observations.ts fails", () => {
    // What proves the exemption covers the call BY COVERING ITS LITERAL rather
    // than by naming the file: identical source, different module, red.
    const sameCall = [
      "export function redactQueryValues(t: string): string {",
      '  return redactUrlHead(t).replace(/[a-z]+:\\/\\//gi, "<url-redacted>");',
      "}",
    ].join("\n");
    expect(rulesOf(sameCall, "observations.ts")).toContain("regex-literal");
  });

  it("the documentation fixture STILL reports zero after the widening", () => {
    // This module's comments name `.replace(`, `.split(` and every other
    // forbidden construct by necessity. An AST walk is what keeps that possible.
    const documentationFixture = [
      "// This comment names RegExp, .test(, .match(, .replace(p, x), .split(p)",
      "// and a pattern that looks like /[a-z]+/gi — on purpose.",
      '/** Also in a doc comment: t.replace(SOME_IMPORTED_PATTERN, "x"). */',
      "export function stringsOnly(s: string): string[] {",
      '  return s.split("&");',
      "}",
    ].join("\n");
    expect(auditPatternUse("fixture.ts", documentationFixture)).toEqual([]);
  });
});
