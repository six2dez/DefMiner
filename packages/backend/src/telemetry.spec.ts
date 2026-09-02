// packages/backend/src/telemetry.spec.ts — CORE-10's unit half, plus the gate
// that keeps there being exactly ONE counter object in this plugin.
//
// The AST scan at the bottom is the important one. Plans 01-01 and 01-03 built a
// local counters object inside the hook because `telemetry.ts` did not exist
// yet; plan 01-05 REPLACED it. The failure this gate exists to prevent is the
// half-done version of that rewire — one object that is written and never read
// sitting next to another that is read and never written, with `slimStatus()`
// projecting the empty one. Every test in the repo stays green and every number
// on the RPC reads zero.
//
// It is a scan over the AST rather than a grep because the shapes that hide a
// second counters object from a regular expression are the ordinary ones: a
// multi-line object literal, a factory called from another module, a property
// whose key spans a line break.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { MAP_PARSE_REASONS } from "@defminer/engine/sourcemap/parse";
import { MAX_SYNC_SLICE_MS } from "@defminer/engine/thresholds";
import ts from "typescript";
import { beforeEach, describe, expect, it } from "vitest";

import { makeFakeSdk } from "../test/fixtures/fake-sdk";

import { REJECT_REASONS } from "./hooks/admit";
import { DERIVED_REJECT_REASONS } from "./sourcemap/derive";
import { ERROR_MAX } from "./store/analyses";
import { resetDbHandleForTest } from "./store/db";
import {
  counters,
  describeError,
  ERROR_TEXT_LIMIT,
  FORBIDDEN_COMPLETENESS_WORDS,
  PATH_REDACTION,
  recordError,
  recordSlice,
  resetTelemetryForTest,
  slimStatus,
  URL_REDACTION,
  zeroedRejectCounters,
} from "./telemetry";

import { init } from "./index";

const BACKEND_SRC = "packages/backend/src";
const TELEMETRY_FILE = join(BACKEND_SRC, "telemetry.ts");

beforeEach(() => {
  resetTelemetryForTest();
});

// ===========================================================================
// 1. THE MAXIMUM SLICE
// ===========================================================================

describe("recordSlice keeps a running maximum", () => {
  it("starts at 0 — an unmeasured plugin reports nothing, not something", () => {
    expect(slimStatus().maxSliceMs).toBe(0);
  });

  it("records 25 exactly when given 25, and is not lowered by a subsequent 3", () => {
    recordSlice(25);
    expect(slimStatus().maxSliceMs).toBe(25);
    recordSlice(3);
    expect(
      slimStatus().maxSliceMs,
      "a shorter slice lowered the maximum. The number answers 'what is the " +
        "worst this plugin has done to the one thread'.",
    ).toBe(25);
  });

  it("stores the float EXACTLY — no rounding, no truncation, no unit conversion", () => {
    // A real `performance.now()` delta, not a tidy number. Compared with exact
    // equality on purpose: `toBeCloseTo` would pass for an implementation that
    // rounded to three places, and the whole point of CORE-10 is that the
    // recorded value is the value the pipeline computed.
    const exact = 25.0009999871253967;
    recordSlice(exact);
    expect(slimStatus().maxSliceMs).toBe(exact);
    expect(String(slimStatus().maxSliceMs)).toBe(String(exact));
  });

  it("records a slice exactly equal to MAX_SYNC_SLICE_MS as that value", () => {
    recordSlice(MAX_SYNC_SLICE_MS);
    expect(slimStatus().maxSliceMs).toBe(MAX_SYNC_SLICE_MS);
    expect(MAX_SYNC_SLICE_MS).toBe(25);
  });

  it("ignores a non-numeric value rather than poisoning the maximum with NaN", () => {
    recordSlice(12);
    recordSlice(Number.NaN);
    expect(
      slimStatus().maxSliceMs,
      "NaN reached the maximum. Every later comparison against it is false, so " +
        "the number would freeze at NaN for the rest of the plugin's life.",
    ).toBe(12);
  });
});

// ===========================================================================
// 2. THE REJECT COUNTERS ARE DERIVED, NOT LISTED
// ===========================================================================

describe("reject counters", () => {
  it("have exactly the keys of the reject-reason union", () => {
    expect(Object.keys(counters.rejected).sort()).toEqual(
      [...REJECT_REASONS].sort(),
    );
  });

  it("all start at 0", () => {
    for (const r of REJECT_REASONS) {
      expect(counters.rejected[r], "rejected." + r).toBe(0);
    }
  });

  it("acquire a counter for a NEW reason automatically — the failing path, executed", () => {
    // The claim is that the counters are DERIVED from the list rather than
    // hand-maintained beside it. Run the derivation against a synthetic union
    // with one extra member and watch the counter appear.
    const withNew = zeroedRejectCounters([...REJECT_REASONS, "brand_new"]);
    expect(withNew.brand_new).toBe(0);
    expect(Object.keys(withNew).length).toBe(REJECT_REASONS.length + 1);

    // And the shipped object is the derivation over the REAL list, so a reason
    // added to `admit.ts` with no counter is not expressible.
    expect(Object.keys(counters.rejected).sort()).toEqual(
      Object.keys(zeroedRejectCounters(REJECT_REASONS)).sort(),
    );
  });
});

// ===========================================================================
// 3. THE PROJECTION — T-01-26
// ===========================================================================

/** Every (path, value) pair in an object, recursively. */
function walkValues(
  value: unknown,
  path = "$",
  out: Array<{ path: string; value: unknown }> = [],
): Array<{ path: string; value: unknown }> {
  out.push({ path, value });
  if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walkValues(v, path + "." + k, out);
    }
  }
  return out;
}

/** Every KEY in an object, recursively. */
function walkKeys(value: unknown, out: string[] = []): string[] {
  if (value !== null && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out.push(k);
      walkKeys(v, out);
    }
  }
  return out;
}

/** Split an identifier into lowercase words across camelCase and snake_case.
 *
 *  WORDS, not substrings: a substring rule fires on the first innocent
 *  identifier containing "all", and a gate that cries wolf gets deleted. */
function words(identifier: string): string[] {
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+|\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.toLowerCase());
}

// ===========================================================================
// 2b. D-02 — THE RETRO SUB-MAP, INSIDE THE ONE COUNTERS OBJECT
// ===========================================================================
//
// A 40,000-request backfill that folded its rejections into the live counters
// would make OBS-01's shipped drop count and reject reasons stop describing
// live proxying — which is the one thing those numbers are for. The split is
// D-02, and its stated cost is that every counter call site now has to know
// which caller it is serving.
//
// The sub-map lives INSIDE `createCounters()` for two mechanical reasons this
// suite proves rather than asserts in prose: the AST scan at the bottom of this
// file fails on a second counters object anywhere in the package, and
// `resetTelemetryForTest()` mutates the ONE object in place — a sub-map built
// beside it would survive a reset and leak state between specs.

describe("counters.retro — retro attribution over the SAME closed vocabulary (D-02)", () => {
  it("keys its reject counters on EXACTLY the shipped reason set", () => {
    // KEY-SET EQUALITY, not a count and not a spot check. A retro map keyed on
    // a second vocabulary is invisible: a counter for a reason that does not
    // exist just reads zero for ever, and a reason with no counter is a
    // rejection nobody can see.
    expect(
      Object.keys(counters.retro.rejected).sort(),
      "counters.retro.rejected does not have the same key set as counters.rejected. " +
        "The retro sub-map must call the SHIPPED zeroedRejectCounters(REJECT_REASONS) " +
        "over the SAME closed array — never a second vocabulary (D-02).",
    ).toEqual(Object.keys(counters.rejected).sort());
    // Non-vacuity: two empty objects are also equal.
    expect(Object.keys(counters.retro.rejected).length).toBe(
      REJECT_REASONS.length,
    );
  });

  it("starts every retro member at zero", () => {
    for (const [name, value] of Object.entries(counters.retro)) {
      if (name === "rejected") continue;
      expect(value, `counters.retro.${name} did not start at 0`).toBe(0);
    }
    for (const reason of REJECT_REASONS) {
      expect(counters.retro.rejected[reason]).toBe(0);
    }
  });

  it("moves independently of the live counters, in both directions", () => {
    // THE WHOLE POINT, executed. If these two ever share storage, a backfill
    // rewrites the numbers the Health panel presents as live proxying.
    counters.retro.admitted += 1;
    counters.retro.rejected.too_large += 1;
    expect(counters.admitted).toBe(0);
    expect(counters.rejected.too_large).toBe(0);

    counters.admitted += 1;
    counters.rejected.too_large += 1;
    expect(counters.retro.admitted).toBe(1);
    expect(counters.retro.rejected.too_large).toBe(1);
  });

  it("is zeroed by resetTelemetryForTest() without that function naming a member", () => {
    // The reason the sub-map is built by createCounters(): the reset is
    // `Object.assign(counters, createCounters())` and has no member list to
    // fall behind. A retro counter added tomorrow is reset for free.
    counters.retro.pagesWalked += 3;
    counters.retro.seen += 20;
    counters.retro.skippedDone += 1;
    counters.retro.queued += 7;
    counters.retro.reloadNoResponse += 2;
    counters.retro.rejected.out_of_scope += 5;

    resetTelemetryForTest();

    expect(counters.retro.pagesWalked).toBe(0);
    expect(counters.retro.seen).toBe(0);
    expect(counters.retro.skippedDone).toBe(0);
    expect(counters.retro.queued).toBe(0);
    expect(counters.retro.reloadNoResponse).toBe(0);
    expect(counters.retro.rejected.out_of_scope).toBe(0);
  });

  it("declares reloadOverSize beside byteLenMismatch, at zero", () => {
    // Declared here, incremented by plan 06-06 at the reload — where the byte
    // count is measured good and where the AUTHORITATIVE size gate lives.
    expect(counters.reloadOverSize).toBe(0);
  });
});

// ===========================================================================
// 2c. PHASE 7 — THE SOURCEMAP SUB-MAP, IN THE SAME ONE COUNTERS OBJECT
// ===========================================================================
//
// The SECOND sub-map, and it is a sub-map for exactly the reasons 2b states.
// The claim under test here is narrower and it is the one that goes wrong
// silently: the refusal counters are DERIVED from `MAP_PARSE_REASONS` by the
// SHIPPED helper, so a ninth parse reason added in the engine acquires its
// counter in that one edit. A hand-listed map would leave the new reason
// invisible — a rejection nobody can see — and a typo'd key reads zero for ever.

describe("counters.sourcemap — Phase 7 attribution inside the ONE object", () => {
  it("keys its refusal counters on EXACTLY the shipped parse vocabulary", () => {
    expect(
      Object.keys(counters.sourcemap.mapRefused).sort(),
      "counters.sourcemap.mapRefused is not keyed on MAP_PARSE_REASONS. It must " +
        "call the SHIPPED zeroedRejectCounters over the engine's frozen array, " +
        "or a reason added to packages/engine/src/sourcemap/parse.ts has no " +
        "counter and a refusal nobody can see.",
    ).toEqual([...MAP_PARSE_REASONS].sort());
    expect(Object.keys(counters.sourcemap.mapRefused).length).toBe(
      MAP_PARSE_REASONS.length,
    );
  });

  it("keys the refusal map on a DIFFERENT vocabulary from the admission map", () => {
    // The two vocabularies SHARE the literal members `too_large` and `empty`,
    // and that is correct — different subjects, and the sub-maps are what keep
    // them apart. Asserting they are not the same key set is what would catch a
    // copy-paste that pointed the Phase 7 map at REJECT_REASONS.
    expect(Object.keys(counters.sourcemap.mapRefused).sort()).not.toEqual(
      Object.keys(counters.rejected).sort(),
    );
    expect(counters.sourcemap.mapRefused.too_large).toBe(0);
    expect(counters.rejected.too_large).toBe(0);
  });

  it("no longer carries the retired attribution-discard counter (07-12)", () => {
    // ASSERTED ABSENT, NOT ASSERTED ZERO, and the difference is the point.
    // `sightingsDiscardedOtherArtifact` counted sightings dropped because a
    // `(map, index)` was already attributed to a DIFFERENT bundle — plan 07-05's
    // interim mitigation for 07-REVIEW.md HI-03. Migration v9 put
    // `artifact_sha256` in `source_sightings`' PRIMARY KEY, so a conflicting row
    // necessarily agrees on the bundle and the discard cannot happen. A number
    // that can never again be non-zero, sitting beside numbers that move, is a
    // number carrying no information — the same defect MD-03 records in the
    // other direction — so it was removed rather than pinned at zero.
    //
    // This case exists so the removal is ASSERTED. Nothing in this file pinned
    // the member list, so a re-added member would otherwise be merely tolerated,
    // and re-adding it is what a reader of an old SUMMARY naming the counter is
    // most likely to try.
    expect(Object.keys(counters.sourcemap)).not.toContain(
      "sightingsDiscardedOtherArtifact",
    );
  });

  it("starts every sourcemap member at zero", () => {
    for (const [name, value] of Object.entries(counters.sourcemap)) {
      if (name === "mapRefused" || name === "derivedRejected") continue;
      expect(value, `counters.sourcemap.${name} did not start at 0`).toBe(0);
    }
    for (const reason of MAP_PARSE_REASONS) {
      expect(counters.sourcemap.mapRefused[reason]).toBe(0);
    }
    for (const reason of DERIVED_REJECT_REASONS) {
      expect(counters.sourcemap.derivedRejected[reason]).toBe(0);
    }
  });

  it("keys the DERIVED refusals on their own vocabulary, not on admission's", () => {
    // O-05's fourth mechanism, executed. `too_large` and `empty` are literal
    // members of BOTH `REJECT_REASONS` and `DERIVED_REJECT_REASONS` and they
    // describe different subjects — a response the hook turned away, and a
    // source a map declared. Separate sub-maps are what let an operator tell
    // which one happened.
    expect(Object.keys(counters.sourcemap.derivedRejected).sort()).toEqual(
      [...DERIVED_REJECT_REASONS].sort(),
    );
    counters.sourcemap.derivedRejected.too_large += 1;
    expect(counters.rejected.too_large).toBe(0);
    expect(counters.retro.rejected.too_large).toBe(0);
    expect(counters.sourcemap.mapRefused.too_large).toBe(0);
  });

  it("moves independently of the live and retro counters", () => {
    counters.sourcemap.announcedExternal += 1;
    counters.sourcemap.mapRefused.too_large += 1;
    expect(counters.rejected.too_large).toBe(0);
    expect(counters.retro.rejected.too_large).toBe(0);
    expect(counters.admitted).toBe(0);
  });

  it("is zeroed by resetTelemetryForTest() without that function naming a member", () => {
    counters.sourcemap.announcedInline += 2;
    counters.sourcemap.sourcesRecovered += 9;
    counters.sourcemap.sightingsRecorded += 9;
    counters.sourcemap.mapRefusedTooLarge += 1;
    counters.sourcemap.mapMalformed += 3;
    counters.sourcemap.mapRefused.malformed_json += 3;

    resetTelemetryForTest();

    expect(counters.sourcemap.announcedInline).toBe(0);
    expect(counters.sourcemap.sourcesRecovered).toBe(0);
    expect(counters.sourcemap.sightingsRecorded).toBe(0);
    expect(counters.sourcemap.mapRefusedTooLarge).toBe(0);
    expect(counters.sourcemap.mapMalformed).toBe(0);
    expect(counters.sourcemap.mapRefused.malformed_json).toBe(0);
  });
});

describe("slimStatus carries the sourcemap sub-map across the RPC", () => {
  it("projects every sourcemap integer, deep-copied rather than aliased", () => {
    counters.sourcemap.announcedExternal += 2;
    counters.sourcemap.mapRefused.nested_sections += 4;

    const projected = slimStatus().counters;
    expect(projected.sourcemap.announcedExternal).toBe(2);
    expect(projected.sourcemap.mapRefused.nested_sections).toBe(4);

    counters.sourcemap.announcedExternal += 1;
    counters.sourcemap.mapRefused.nested_sections += 1;
    expect(projected.sourcemap.announcedExternal).toBe(2);
    expect(projected.sourcemap.mapRefused.nested_sections).toBe(4);
  });

  it("deep-copies a sub-map NOBODY re-listed — the derivation, executed", () => {
    // THE CLAIM THE REWRITE WAS FOR. The projection used to name each sub-map
    // in a literal, so a fourth one added tomorrow would be handed to the RPC as
    // an ALIAS into live module state — right numbers at the instant it was
    // taken, then changing under the caller, with nothing failing anywhere.
    //
    // Run it: attach a sub-map this function has never heard of and check the
    // projection copied it rather than aliased it.
    const live = counters as unknown as Record<string, unknown>;
    live.futureSubMap = { somethingNew: 1 };
    try {
      const projected = slimStatus().counters as unknown as Record<
        string,
        Record<string, number>
      >;
      expect(projected.futureSubMap.somethingNew).toBe(1);
      (live.futureSubMap as Record<string, number>).somethingNew = 99;
      expect(
        projected.futureSubMap.somethingNew,
        "the projection aliased a sub-map it was never told about. That is the " +
          "hand-listed-literal defect: the RPC gets a live window into module " +
          "state and nothing fails when it does.",
      ).toBe(1);
    } finally {
      delete live.futureSubMap;
    }
  });

  it("adds no new string field — every sourcemap value is an integer", () => {
    counters.sourcemap.sourcesRecovered += 1;
    const strings = walkValues(slimStatus()).filter(
      (e) => typeof e.value === "string",
    );
    expect(
      strings.map((e) => e.path),
      "slimStatus() grew a string field. The sourcemap sub-map carries counts " +
        "only — no label, no URL and no reason SENTENCE — so WR-03's redaction " +
        "rules still have nothing on this path to run over.",
    ).toEqual([]);
  });
});

describe("slimStatus carries the retro sub-map across the RPC", () => {
  it("projects every retro integer, deep-copied rather than aliased", () => {
    counters.retro.pagesWalked += 2;
    counters.retro.rejected.not_scriptish += 4;

    const projected = slimStatus().counters;
    expect(projected.retro.pagesWalked).toBe(2);
    expect(projected.retro.rejected.not_scriptish).toBe(4);

    // A SNAPSHOT, not a window. `slimStatus()` already deep-copies `rejected`
    // for this reason; the retro map needs the same treatment or the RPC hands
    // the caller a live reference into module state.
    counters.retro.pagesWalked += 1;
    counters.retro.rejected.not_scriptish += 1;
    expect(projected.retro.pagesWalked).toBe(2);
    expect(projected.retro.rejected.not_scriptish).toBe(4);
  });

  it("adds no new string field — the username guard still has nothing to catch", () => {
    counters.retro.seen += 1;
    const strings = walkValues(slimStatus()).filter(
      (e) => typeof e.value === "string",
    );
    // `lastError` is the ONE string this projection is permitted, and it is
    // null here. Every retro value is a DefMiner-authored integer.
    expect(
      strings.map((e) => e.path),
      "slimStatus() grew a string field. Every value the retro sub-map projects " +
        "must be an integer — a string is the shape WR-03's redaction rules exist " +
        "for, and none of them run over a counter.",
    ).toEqual([]);
  });
});

describe("slimStatus is a PROJECTION, not a window onto internal state", () => {
  it("carries no string that parses as a URL", () => {
    recordError(
      new Error(
        "failed loading https://victim.example/private/app.js?token=secret",
      ),
    );
    recordSlice(4);

    // The error text is the ONE string this projection carries, and the case
    // above deliberately put a URL inside it — so this assertion is about what
    // the projection does with hostile input, not about a happy path.
    const urls = walkValues(slimStatus())
      .filter((e) => typeof e.value === "string")
      .filter((e) => /https?:\/\//i.test(e.value as string));
    expect(
      urls,
      "a URL survived into the getStatus projection. This RPC is the only " +
        "channel by which internal state leaves the plugin in Phase 1 " +
        "(T-01-26), and a URL is target data — often with a session token in " +
        "the query, as the fixture above has.",
    ).toEqual([]);
    // Non-vacuity: the redaction happened rather than the message vanishing.
    expect(slimStatus().lastError).toContain(URL_REDACTION);
    expect(slimStatus().lastError).not.toContain("victim.example");
    expect(slimStatus().lastError).not.toContain("token=secret");
  });

  it("redacts the URL before truncating, so no host survives in the front half", () => {
    // Truncating first would leave `https://victim.example/very/long/...` intact
    // up to the limit — and the front half is the half carrying the host.
    recordError(
      new Error(
        "write failed for https://victim.example/a.js " + "z".repeat(9_000),
      ),
    );
    expect(slimStatus().lastError).not.toContain("victim.example");
    expect(slimStatus().lastError).toContain(URL_REDACTION);
  });

  it("covers the object getStatus() ACTUALLY returns, not slimStatus() alone", async () => {
    // THE WALK ABOVE COULD NOT SEE THIS. `getStatus()` returns
    // `{ ...status(), caidoVersion }`, and `status()` carries `reason` —
    // init()'s own failure text — alongside the projection. That field was built
    // from a raw `String(e).slice(0, 160)`: redacted nowhere, and TRUNCATED
    // FIRST, which keeps the front half of a URL and the front half is the half
    // carrying the host. A walk rooted at slimStatus() is structurally blind to
    // it, which is why the leak survived the plan that fixed the other one.
    const registered: Record<string, (...a: unknown[]) => unknown> = {};
    const sdk = makeFakeSdk({
      db: () =>
        Promise.reject(
          new Error(
            "could not open https://victim.example/private/app.js?token=secret",
          ),
        ),
      register: (name: string, fn: unknown) => {
        registered[name] = fn as (...a: unknown[]) => unknown;
      },
    });

    await init(sdk);
    // The memo now holds a rejected promise; leaving it would poison any later
    // case in this file that resolved a handle.
    resetDbHandleForTest();

    const status = registered.getStatus();
    const urls = walkValues(status)
      .filter((e) => typeof e.value === "string")
      .filter((e) => /https?:\/\//i.test(e.value as string));
    expect(
      urls.map((e) => e.path + " = " + String(e.value)),
      "a URL crossed the getStatus RPC. Redaction that covers one of the two " +
        "strings this payload carries is not redaction (T-01-26).",
    ).toEqual([]);

    // Non-vacuity: the reason is present and says what happened.
    const reason = String((status as Record<string, unknown>).reason);
    expect(reason).toContain("init failed");
    expect(reason).toContain(URL_REDACTION);
    expect(reason).not.toContain("victim.example");
    expect(reason).not.toContain("token=secret");
  });

  it("carries no value longer than the documented truncation limit", () => {
    recordError(new Error("x".repeat(5_000)));
    const long = walkValues(slimStatus())
      .filter((e) => typeof e.value === "string")
      .filter((e) => (e.value as string).length > ERROR_TEXT_LIMIT);
    expect(
      long.map((e) => e.path + " (" + String((e.value as string).length) + ")"),
      "a string longer than ERROR_TEXT_LIMIT crossed the RPC boundary. An " +
        "untruncated String(e) can carry a response-body fragment with it.",
    ).toEqual([]);
  });

  it("carries only numbers besides the one error string", () => {
    recordSlice(9);
    recordError(new TypeError("boom"));
    // CONTAINERS ARE FILTERED BY SHAPE, not by a hand-listed set of paths.
    // This used to name `$`, `$.counters` and `$.counters.rejected` one at a
    // time, so the first nested sub-map anyone added — `counters.retro`, which
    // D-02 requires — failed a gate about PAYLOADS for the crime of being an
    // object. The rule was always about the LEAVES: every leaf is a count,
    // except the one truncated error string.
    const leaves = walkValues(slimStatus()).filter(
      (e) => !(e.value !== null && typeof e.value === "object"),
    );
    const bad = leaves
      .filter((e) => typeof e.value !== "number")
      .filter((e) => e.path !== "$.lastError");
    expect(
      bad.map((e) => e.path),
      "the projection carries a value that is neither a count nor the error " +
        "string. Anything else is a payload.",
    ).toEqual([]);
    // Non-vacuity: filtering by shape must not have filtered the subject away.
    expect(
      leaves.length,
      "the leaf walk found almost nothing — the shape filter above is eating " +
        "the values it is supposed to judge.",
    ).toBeGreaterThan(20);
  });

  it("is a COPY — mutating what getStatus returned cannot reach the counters", () => {
    const projected = slimStatus();
    projected.counters.processed = 9_999;
    projected.counters.rejected.status = 9_999;
    expect(counters.processed).toBe(0);
    expect(counters.rejected.status).toBe(0);
  });

  it("carries every counter, because it spreads rather than hand-listing", () => {
    // A hand-listed projection silently stops carrying a counter somebody adds
    // later, and a counter nobody can see is the same as no counter.
    expect(Object.keys(slimStatus().counters).sort()).toEqual(
      Object.keys(counters).sort(),
    );
  });
});

// ===========================================================================
// 4. NO NAME MAY ASSERT COMPLETENESS — decision P5-D1
// ===========================================================================

describe("no identifier in the projection claims completeness", () => {
  it("has a non-empty forbidden-word list", () => {
    // Asserted because a gate over an empty list passes vacuously and reads
    // exactly like one that works.
    expect(FORBIDDEN_COMPLETENESS_WORDS.length).toBeGreaterThan(0);
    expect([...FORBIDDEN_COMPLETENESS_WORDS]).toContain("all");
    expect([...FORBIDDEN_COMPLETENESS_WORDS]).toContain("complete");
  });

  it("uses no forbidden word in any key", () => {
    recordSlice(1);
    recordError(new Error("nope"));
    const offenders: string[] = [];
    for (const key of walkKeys(slimStatus())) {
      for (const w of words(key)) {
        if ((FORBIDDEN_COMPLETENESS_WORDS as readonly string[]).includes(w)) {
          offenders.push(key + " contains the word '" + w + "'");
        }
      }
    }
    expect(
      offenders,
      "a counter or RPC field is named in a way that implies DefMiner has seen " +
        "everything on a target. It has not and structurally cannot: only " +
        "proxied traffic reaches the hook (SURFACES_FIRING_INTERCEPT = 'proxy') " +
        "and a browser-cache hit never enters Caido at all " +
        "(CACHED_RESPONSES_REACH_HOOK = false). Counters are named for PROXIED " +
        "RESPONSES OBSERVED (decision P5-D1).",
    ).toEqual([]);
  });

  it("splits identifiers into WORDS, so an innocent substring is not a false positive", () => {
    // The rule's own failing and passing paths, both executed.
    expect(words("proxiedResponsesObserved")).toEqual([
      "proxied",
      "responses",
      "observed",
    ]);
    expect(words("out_of_scope")).toEqual(["out", "of", "scope"]);
    expect(words("totalResponses")).toContain("total");
    expect(words("smallBodies")).not.toContain("all");
  });

  it("names the primary counter for what the hook was HANDED", () => {
    expect(Object.keys(counters)).toContain("proxiedResponsesObserved");
  });
});

describe("describeError", () => {
  it("does not double the class name when String(e) already carries it", () => {
    expect(describeError(new TypeError("nope"))).toBe("TypeError: nope");
  });

  it("handles null and undefined without throwing", () => {
    expect(describeError(null)).toBe("null");
    expect(describeError(undefined)).toBe("undefined");
  });

  it("caps at ERROR_TEXT_LIMIT, and ERROR_TEXT_LIMIT <= ERROR_MAX (IN-11)", () => {
    // THE RELATIONSHIP, ASSERTED RATHER THAN COMMENTED.
    //
    // `analyses.ts` writes `describeError(error).slice(0, ERROR_MAX)` and its
    // comment called `ERROR_MAX` (300) unreachable "in practice". It is
    // unreachable ALWAYS, for every input, by CONSTRUCTION: `describeError`
    // returns at most `ERROR_TEXT_LIMIT` characters, so the outer slice can
    // never remove a character. "In practice" is a claim about what usually
    // happens; this is a claim about what CAN happen, and the two are not the
    // same kind of statement. A bound whose comment overstates why it holds is
    // the same family of defect as a claim wider than its enforcement, which is
    // what this whole plan is about.
    //
    // `migrations.ts:176-183` reached the OPPOSITE conclusion from the same
    // situation and DELETED its outer slice, calling it a deliberate 300 -> 240
    // narrowing. Either choice is defensible; what was missing from both is the
    // assertion. With this in place the two files agree on the RELATIONSHIP even
    // where they differ on the slice, and moving either constant the wrong way
    // fails loudly at the moment the relationship stops holding.
    //
    // BOTH CONSTANTS ARE REFERENCED BY NAME. No numeric literal appears here on
    // purpose: a literal makes the test keep passing while the code that matters
    // drifts, which is precisely the failure mode being closed.
    expect(ERROR_TEXT_LIMIT).toBeLessThanOrEqual(ERROR_MAX);

    const rendered = describeError(new Error("q".repeat(5_000)));
    expect(rendered.length).toBe(ERROR_TEXT_LIMIT);
    expect(rendered.length).toBeLessThanOrEqual(ERROR_MAX);
    expect(rendered.slice(0, ERROR_MAX)).toBe(rendered);
  });
});

// ===========================================================================
// 5b. THE FILESYSTEM PATH — WR-03's OTHER HALF (STORE-07, T-01-59, DEPLOY-02)
// ===========================================================================

/**
 * The operator's OS username, as it appears inside `sdk.meta.path()`.
 *
 * Distinctive on purpose. Every assertion below is a SUBSTRING SEARCH for THIS
 * literal over the whole rendered string — never an equality against a
 * hand-written expected value, which passes when both sides are wrong in the
 * same way.
 */
const FIXTURE_OS_USERNAME = "defminer-fixture-operator";

/**
 * `sdk.meta.path()`'s REAL shape on macOS, carrying the username.
 *
 * The space inside "Application Support" is the point rather than an accident:
 * a naive whitespace-delimited rule gets exactly this case wrong, so it is the
 * PRIMARY fixture and not a tidied-up one.
 */
const PLUGIN_DB_PATH =
  "/Users/" +
  FIXTURE_OS_USERNAME +
  "/Library/Application Support/io.caido.Caido/plugins/" +
  "5f2a1c9e-0b44-4d18-9c31-7d6e2a8b41ff/data.db";

describe("describeError redacts an absolute filesystem path (WR-03's other half)", () => {
  it("removes the OS username from a plugin-database path — the macOS shape, spaces and all", () => {
    const out = describeError(new Error("could not open " + PLUGIN_DB_PATH));
    expect(
      out.includes(FIXTURE_OS_USERNAME),
      "the operator's OS username survived into an error string bound for the " +
        "getStatus RPC. DEPLOY-02 says the backend filesystem is SERVER-SIDE; " +
        "presenting it as if it were the operator's own machine is the " +
        "disclosure WR-03 named and did not close. Rendered: " +
        out,
    ).toBe(false);
    expect(out).toContain(PATH_REDACTION);
  });

  it("removes it from the single-quoted shape SQLITE_CANTOPEN actually emits", () => {
    // `unable to open database file: '/Users/…/data.db'` — the quotes are part
    // of the message, so a rule that only handles bare tokens misses the one
    // shape the driver really produces.
    const out = describeError(
      new Error(
        "SQLITE_CANTOPEN: unable to open database file: '" +
          PLUGIN_DB_PATH +
          "'",
      ),
    );
    expect(out.includes(FIXTURE_OS_USERNAME), out).toBe(false);
    expect(out).toContain(PATH_REDACTION);
    // The punctuation is re-attached rather than eaten: the message stays
    // readable, which is the half of the trade that keeps this from being a
    // blunt instrument.
    expect(out).toContain("'" + PATH_REDACTION);
  });

  it("redacts a short quoted path whole, punctuation restored on BOTH ends", () => {
    const out = describeError(new Error("open failed '/var/db/caido/data.db'"));
    expect(out).toBe("Error: open failed '" + PATH_REDACTION + "'");
  });

  it("redacts a quoted POSIX path containing spaces as one value", () => {
    const out = describeError(
      new Error("open failed '" + PLUGIN_DB_PATH + "'"),
    );
    expect(out).toBe("Error: open failed '" + PATH_REDACTION + "'");
    expect(out).not.toContain("Application Support");
  });

  it("redacts a quoted path containing spaces after an assignment prefix", () => {
    const out = describeError(
      new Error("open failed path='" + PLUGIN_DB_PATH + "'"),
    );
    expect(out).toBe("Error: open failed path='" + PATH_REDACTION + "'");
    expect(out).not.toContain(FIXTURE_OS_USERNAME);
    expect(out).not.toContain("Application Support");
  });

  it("redacts Windows drive and UNC paths without a regular expression", () => {
    const drive = "C:\\Users\\private-user\\AppData\\Roaming\\Caido\\data.db";
    const unc = "\\\\private-server\\share\\Caido\\data.db";
    expect(describeError(new Error("open " + drive))).toBe(
      "Error: open " + PATH_REDACTION,
    );
    expect(describeError(new Error("open " + unc))).toBe(
      "Error: open " + PATH_REDACTION,
    );
  });

  it("redacts a URL and a path in the SAME message, and the URL still goes first", () => {
    // Order matters: URL first, so a `file:///…` or `https://host/a/b` is
    // consumed as a URL rather than shredded into a path marker.
    const out = describeError(
      new Error(
        "copy https://victim.example/private/app.js?token=secret to " +
          PLUGIN_DB_PATH,
      ),
    );
    expect(out).toContain(URL_REDACTION);
    expect(out).toContain(PATH_REDACTION);
    expect(out.includes("victim.example"), out).toBe(false);
    expect(out.includes("token=secret"), out).toBe(false);
    expect(out.includes(FIXTURE_OS_USERNAME), out).toBe(false);
  });

  it("consumes a file:// URL as a URL, not as a path", () => {
    const out = describeError(new Error("read file://" + PLUGIN_DB_PATH));
    expect(out).toContain(URL_REDACTION);
    expect(out.includes(FIXTURE_OS_USERNAME), out).toBe(false);
  });

  it("still redacts the path when the message is far longer than the truncation limit", () => {
    // REDACT FIRST, TRUNCATE SECOND (decision P5-D8). Truncating first leaves
    // the FRONT half of a path, and the front half is the half carrying the
    // username.
    // The path goes FIRST, deliberately: with the message truncated before the
    // redaction ran, the username sits comfortably inside the surviving 240
    // characters and this case fails. That is what makes it a test of the
    // ORDERING rather than of the truncation.
    const out = describeError(
      new Error(PLUGIN_DB_PATH + " " + "y".repeat(5_000)),
    );
    expect(out.length).toBe(ERROR_TEXT_LIMIT);
    expect(out.includes(FIXTURE_OS_USERNAME), out).toBe(false);
  });
});

describe("describeError keeps diagnostic controls and redacts ambiguous URL carriers", () => {
  // The diagnosability half. A rule that turned every error into markers would
  // be a blunt instrument, and a gate that destroys diagnosis gets deleted.

  it("leaves a driver error with no separators completely alone", () => {
    expect(
      describeError(new Error("SQLITE_ERROR: no such table: artifacts")),
    ).toBe("Error: SQLITE_ERROR: no such table: artifacts");
  });

  it("leaves a RELATIVE source reference alone — it does not begin with a separator", () => {
    expect(describeError(new Error("failed in store/observations.ts"))).toBe(
      "Error: failed in store/observations.ts",
    );
  });

  it("leaves a relative reference with TWO separators alone for the same reason", () => {
    expect(
      describeError(new Error("failed in packages/backend/src/telemetry.ts")),
    ).toBe("Error: failed in packages/backend/src/telemetry.ts");
  });

  it("leaves a date rendered 2026/08/21 alone — the rule requires an ABSOLUTE path", () => {
    expect(describeError(new Error("expired on 2026/08/21"))).toBe(
      "Error: expired on 2026/08/21",
    );
  });

  it("leaves a lone root-relative segment alone — one separator is not a path", () => {
    expect(describeError(new Error("mounted at /data"))).toBe(
      "Error: mounted at /data",
    );
  });

  // -------------------------------------------------------------------------
  // WR-18 — BOTH DIRECTIONS OF THE `analyses.error` DISCLOSURE, EXECUTED
  // -------------------------------------------------------------------------
  // `store/schema.spec.ts`'s allowlist entry for `analyses.error` is the stated
  // justification for keeping that column on the T-01-21 allowlist, and until
  // 2026-08-22 it named the WRONG shape as the open residual. A reader auditing
  // that decision was told a closed grammar was dangerous and was not told about
  // the open one. AF-07 closed the latter; both directions still run here so
  // that closure is a measurement rather than a rewording, and so re-opening
  // either is a red test.

  it("REDACTS a SCHEME-RELATIVE reference — it begins with a separator and has three", () => {
    // The shape the allowlist entry used to name as surviving. It does NOT: it
    // satisfies the absolute-path conditions and is consumed whole,
    // query string included.
    expect(
      describeError(
        new Error("failed to load //cdn.victim.example/app.js?token=SECRET"),
      ),
    ).toBe(`Error: failed to load ${PATH_REDACTION}`);
  });

  it("redacts a SCHEMELESS host reference with its query", () => {
    expect(
      describeError(
        new Error("failed to load cdn.victim.example/app.js?token=SECRET"),
      ),
    ).toBe(`Error: failed to load ${URL_REDACTION}`);
  });

  it("redacts a SCHEMELESS host query even when the URL has no path", () => {
    expect(
      describeError(
        new Error("failed to load cdn.victim.example?token=SECRET"),
      ),
    ).toBe(`Error: failed to load ${URL_REDACTION}`);
  });

  it("redacts a SCHEMELESS host after an assignment prefix", () => {
    expect(
      describeError(
        new Error("failed to load url=cdn.victim.example/app.js?token=SECRET"),
      ),
    ).toBe(`Error: failed to load url=${URL_REDACTION}`);
  });

  // -------------------------------------------------------------------------
  // IN-17 — THE RENDERER THAT EXISTS TO STOP THE ERROR PATH THROWING
  // -------------------------------------------------------------------------
  // All three of these THREW before 2026-08-22, out of a function six store call
  // sites invoke WITHOUT a wrapper — so a handled store failure became an
  // unhandled rejection out of `recordObservation`.

  it("returns the fallback for a NULL-PROTOTYPE object instead of throwing", () => {
    // `String(x)` raises `TypeError: Cannot convert object to primitive value`.
    const hostile = Object.assign(Object.create(null), { message: "x" });
    expect(() => describeError(hostile)).not.toThrow();
    expect(describeError(hostile)).toContain("unrenderable error");
  });

  it("returns the fallback for a THROWING toString instead of propagating", () => {
    const hostile = {
      toString() {
        throw new Error("boom");
      },
    };
    expect(() => describeError(hostile)).not.toThrow();
    expect(describeError(hostile)).toContain("unrenderable error");
  });

  it("survives a PROXY whose constructor read raises", () => {
    const hostile = new Proxy(
      {},
      {
        get(_target, property) {
          if (property === "constructor") throw new Error("nope");
          return undefined;
        },
      },
    );
    expect(() => describeError(hostile)).not.toThrow();
  });

  it("the fallback is the SAME literal recordError uses, so the operator sees one word", () => {
    // Referenced from one place in `telemetry.ts`; asserted here from the
    // outside, through both functions, because that is where drift would show.
    const hostile = {
      toString() {
        throw new Error("boom");
      },
    };
    recordError(hostile);
    expect(slimStatus().lastError).toBe(describeError(hostile));
  });

  it("is IDEMPOTENT — applying it to its own output returns that output", () => {
    // The two redactions must not fight or accumulate markers.
    for (const message of [
      "could not open " + PLUGIN_DB_PATH,
      "copy https://victim.example/a.js to " + PLUGIN_DB_PATH,
      "SQLITE_ERROR: no such table: artifacts",
      "expired on 2026/08/21",
    ]) {
      const once = describeError(new Error(message));
      expect(describeError(once), message).toBe(once);
    }
  });
});

describe("the plugin-database path does not cross the getStatus RPC (STORE-07)", () => {
  it("is absent from EVERY string in the object the registered RPC returns", async () => {
    // The same recursive walk WR-03 extended from slimStatus() to the object
    // getStatus() ACTUALLY returns. A search over `reason` alone is what missed
    // the URL half; a search over `reason` alone would miss this one too.
    const registered: Record<string, (...a: unknown[]) => unknown> = {};
    const sdk = makeFakeSdk({
      db: () =>
        Promise.reject(
          new Error(
            "SQLITE_CANTOPEN: unable to open database file: '" +
              PLUGIN_DB_PATH +
              "'",
          ),
        ),
      register: (name: string, fn: unknown) => {
        registered[name] = fn as (...a: unknown[]) => unknown;
      },
    });

    await init(sdk);
    // The memo now holds a rejected promise; leaving it would poison any later
    // case in this file that resolved a handle.
    resetDbHandleForTest();

    const status = registered.getStatus();
    const leaked = walkValues(status)
      .filter((e) => typeof e.value === "string")
      .filter((e) => (e.value as string).includes(FIXTURE_OS_USERNAME));
    expect(
      leaked.map((e) => e.path + " = " + String(e.value)),
      "the operator's OS username crossed the getStatus RPC inside a " +
        "server-side filesystem path. DEPLOY-02: the backend filesystem is " +
        "not the operator's machine, and `sdk.meta.path()` carries the " +
        "username in every real deployment.",
    ).toEqual([]);

    // Non-vacuity: the reason is present, says what happened, and shows the
    // redaction ran rather than the message having vanished.
    const reason = String((status as Record<string, unknown>).reason);
    expect(reason).toContain("init failed");
    expect(reason).toContain(PATH_REDACTION);
  });
});

describe("redactUrls is backtrack-free BY MEASUREMENT, not by an argument about its shape", () => {
  it("renders a 200,000-character adversarial near-miss input inside 250 ms", () => {
    // REDOS_RECOVERY is "kill" on this runtime: SPIKE-01 measured that a
    // catastrophic pattern hangs the QuickJS thread with NO interrupt handler
    // and that SIGKILL is the only exit, taking `caido-cli` down with the
    // operator's live project data. `telemetry.ts`'s header used to ARGUE this
    // pattern was safe from its shape — one quantifier before a literal `://`
    // and one after. An argued-linear pattern is exactly what nobody re-checks,
    // so this measures it instead.
    //
    // The input is built from runs that repeatedly ALMOST satisfy `://`: a long
    // `[a-z0-9+.-]*` run, then a `:`, then a single `/` — the character that
    // would complete the match is never the one that arrives.
    //
    // THE CEILING IS DELIBERATELY LOOSE. The observed time is on the order of a
    // millisecond, so 250 ms is roughly three orders of magnitude above it and
    // can only be tripped by catastrophic backtracking, not by a busy CI box. A
    // bound that fails on a loaded machine is a bound somebody deletes.
    const chunk = "a".repeat(50) + ":/";
    const adversarial = chunk.repeat(Math.ceil(200_000 / chunk.length));
    expect(adversarial.length).toBeGreaterThanOrEqual(200_000);

    const t0 = Date.now();
    const rendered = describeError(new Error(adversarial));
    const elapsedMs = Date.now() - t0;

    expect(
      elapsedMs,
      "redactUrls took " +
        String(elapsedMs) +
        ' ms on a 200k adversarial input. On a REDOS_RECOVERY="kill" runtime ' +
        "there is no interrupt handler and SIGKILL is the only exit.",
    ).toBeLessThan(250);
    // Non-vacuity: the render actually happened and is still bounded.
    expect(rendered.length).toBe(ERROR_TEXT_LIMIT);
  });
});

// ===========================================================================
// 6. THE PHASE 2 SEAM IS LEFT OPEN, NOT FILLED
// ===========================================================================

describe("telemetry.ts stops where Phase 2 begins", () => {
  const src = readFileSync(TELEMETRY_FILE, "utf8");

  it("exposes no health surface, no vocabulary and no export function", () => {
    const exported = [
      ...src.matchAll(/^export (?:function|const|type) (\w+)/gm),
    ]
      .map((m) => m[1])
      .sort();
    const forbidden = exported.filter((name) =>
      /^(health|getHealth|degrad|exportDiagnostics|toDiagnostics|diagnostics|vocabulary)/i.test(
        name,
      ),
    );
    expect(
      forbidden,
      "OBS-01 (health surface), OBS-02 (degradation vocabulary) and OBS-03 " +
        "(diagnostics export) are Phase 2's. Phase 1's obligation is only that " +
        "the counters EXIST and are REACHABLE.",
    ).toEqual([]);
    // Non-vacuity: the scan found something to look at.
    expect(exported).toContain("recordSlice");
    expect(exported).toContain("slimStatus");
  });
});

// ===========================================================================
// 7. EXACTLY ONE COUNTERS OBJECT — the AST scan
// ===========================================================================

/** Every non-generated `.ts` file under `packages/backend/src`, specs included.
 *
 *  Specs are IN SCOPE deliberately: a spec that builds its own counters object
 *  is the easiest place for the second one to reappear, and it would be just as
 *  misleading — the spec would assert against an object production never
 *  touches. */
function backendTsFiles(dir = BACKEND_SRC, out: string[] = []): string[] {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) backendTsFiles(full, out);
    else if (name.endsWith(".ts")) out.push(full);
  }
  return out;
}

/** The canonical counter key set, taken from the live object rather than
 *  re-typed — so a counter added tomorrow strengthens this gate for free. */
const COUNTER_KEYS = new Set(Object.keys(counters));
/** How many canonical keys an object literal needs before it IS a counter set.
 *  Three, not one: `{ processed: 0 }` alone is an ordinary object. */
const COUNTER_LITERAL_THRESHOLD = 3;

type Finding = {
  file: string;
  line: number;
  what: string;
  /** For a counter-shaped literal: is it lexically inside `createCounters()`?
   *  The whole point of the rule, once nested sub-maps exist — see the
   *  `inside createCounters` case below. */
  inFactory: boolean;
};

function scanFile(file: string): Finding[] {
  return scanSource(file, readFileSync(file, "utf8"));
}

/** The gate's core, as a PURE function over (filename, source) — the shape
 *  `sql-discipline.spec.ts` established, and for its stated reason: a gate whose
 *  failing path has never run is a gate nobody has tested. Every rule below has
 *  a synthetic fixture at the bottom of this section. */
function scanSource(file: string, src: string): Finding[] {
  const sf = ts.createSourceFile(
    file,
    src,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const found: Finding[] = [];
  const at = (node: ts.Node): number =>
    sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  /** The ONE factory that is allowed to build a counter-shaped literal. Named
   *  rather than matched loosely: the rule below is "inside this function", and
   *  a function is the smallest scope that statement can be true of. */
  const FACTORY = "createCounters";
  let factoryDepth = 0;

  const visit = (node: ts.Node): void => {
    const entersFactory =
      ts.isFunctionDeclaration(node) &&
      node.name !== undefined &&
      node.name.text === FACTORY;
    if (entersFactory) factoryDepth += 1;
    // RULE A — a binding literally called `counters`. After the rewire the only
    // one is telemetry.ts's export; `import { counters }` is an ImportSpecifier,
    // not a VariableDeclaration, so re-using the name by importing it is fine.
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "counters"
    ) {
      found.push({
        file,
        line: at(node),
        what: "declares a `counters` binding",
        inFactory: factoryDepth > 0,
      });
    }

    // RULE B — an object literal SHAPED like a counter set, whatever it is
    // called. This is what catches a second object introduced under another
    // name, which is the realistic way the rewire goes half-done.
    if (ts.isObjectLiteralExpression(node)) {
      let hits = 0;
      for (const prop of node.properties) {
        const name = prop.name;
        if (name === undefined) continue;
        const text = ts.isIdentifier(name)
          ? name.text
          : ts.isStringLiteral(name)
            ? name.text
            : "";
        if (COUNTER_KEYS.has(text)) hits += 1;
      }
      if (hits >= COUNTER_LITERAL_THRESHOLD) {
        found.push({
          file,
          line: at(node),
          what:
            "an object literal with " +
            String(hits) +
            " canonical counter keys",
          inFactory: factoryDepth > 0,
        });
      }
    }

    ts.forEachChild(node, visit);
    if (entersFactory) factoryDepth -= 1;
  };
  visit(sf);
  return found;
}

describe("there is exactly ONE counters object in packages/backend", () => {
  const files = backendTsFiles();
  const findings = files.flatMap(scanFile);

  it("scans a non-empty set of files, telemetry.ts among them", () => {
    expect(files.length).toBeGreaterThan(5);
    expect(files).toContain(TELEMETRY_FILE);
  });

  it("finds the counters binding only in telemetry.ts", () => {
    const bindings = findings.filter((f) => f.what.includes("binding"));
    expect(
      bindings.map((f) => f.file + ":" + String(f.line)),
      "the local counters object plans 01-01 and 01-03 created must be GONE, " +
        "not shadowed. Two objects means one is written and never read while " +
        "the other is read and never written, and slimStatus() projects the " +
        "empty one — green everywhere, zero on the RPC.",
    ).toEqual([TELEMETRY_FILE + ":" + String(bindings[0]?.line ?? 0)]);
    expect(bindings.length).toBe(1);
  });

  it("finds a counter-shaped object literal only in telemetry.ts, and only inside createCounters()", () => {
    // WHY THIS IS NOT `literals.length === 1` ANY MORE. It was, and the count
    // was the whole rule — which made the gate narrower than the invariant it
    // enforces. D-02 requires a SECOND, NESTED sub-map (`counters.retro`), and
    // that literal carries three canonical keys of its own (`admitted`,
    // `reloadNoResponse`, `rejected`), so a count of one refused the shape the
    // decision mandates while still permitting a genuine second object built
    // anywhere else in this file.
    //
    // The rule the count was standing in for is stated directly instead, and it
    // is STRICTLY STRONGER: every counter-shaped literal in this package lives
    // in telemetry.ts AND lives inside `createCounters()`. That is what makes
    // `resetTelemetryForTest()` — `Object.assign(counters, createCounters())` —
    // total over every counter that exists, which is the property the original
    // count was protecting by proxy.
    const literals = findings.filter((f) => f.what.includes("literal"));
    expect(
      literals.filter((f) => f.file !== TELEMETRY_FILE).map((f) => f.file),
      "a counter-shaped object literal exists outside telemetry.ts. Two objects " +
        "means one is written and never read while the other is read and never " +
        "written, and slimStatus() projects the empty one.",
    ).toEqual([]);
    expect(
      literals
        .filter((f) => !f.inFactory)
        .map((f) => f.file + ":" + String(f.line)),
      "a counter-shaped object literal in telemetry.ts sits OUTSIDE " +
        "createCounters(). Anything built outside the factory survives " +
        "resetTelemetryForTest(), which mutates the one object in place — so it " +
        "would carry one spec's counts into the next and would never be zeroed " +
        "in production either.",
    ).toEqual([]);
    // Non-vacuity: the filters above are satisfied by an empty finding set.
    expect(
      literals.length,
      "the AST scan found NO counter-shaped literal at all — the gate is " +
        "asserting nothing.",
    ).toBeGreaterThanOrEqual(1);
  });

  /** Three canonical keys — exactly the threshold — spelled as an object body. */
  const counterShapedBody = (): string =>
    [...COUNTER_KEYS]
      .slice(0, COUNTER_LITERAL_THRESHOLD)
      .map((k) => "  " + k + ": 0,")
      .join("\n");

  it("would flag a second object — the failing path, executed", () => {
    // The gate's own failure mode, run through THE GATE rather than through a
    // re-implementation of it. A gate whose failing path has never run is a
    // gate nobody has tested — and a failing path exercised by a copy of the
    // walk tests the copy.
    const findings = scanSource(
      "synthetic.ts",
      "const shadow = {\n" +
        counterShapedBody() +
        "\n};\nconst counters = shadow;\n",
    );
    expect(findings.filter((f) => f.what.includes("literal")).length).toBe(1);
    expect(findings.filter((f) => f.what.includes("binding")).length).toBe(1);
  });

  it("would flag a counter-shaped literal built OUTSIDE createCounters()", () => {
    // The new rule's failing path. This is the shape the count-based assertion
    // used to catch by accident and now catches on purpose: a second sub-map
    // built beside the factory instead of inside it, which would survive every
    // resetTelemetryForTest() and never be zeroed in production either.
    const outside = scanSource(
      "synthetic.ts",
      "const stray = {\n" + counterShapedBody() + "\n};\n",
    );
    const strayLiterals = outside.filter((f) => f.what.includes("literal"));
    expect(strayLiterals.length).toBe(1);
    expect(strayLiterals[0].inFactory).toBe(false);
  });

  it("stays quiet on the same literal built INSIDE createCounters()", () => {
    // The legal fixture beside the firing one. Without it the rule above passes
    // for a gate that reports `inFactory: false` unconditionally.
    const inside = scanSource(
      "synthetic.ts",
      "function createCounters() {\n  return {\n" +
        counterShapedBody() +
        "\n  };\n}\n",
    );
    const factoryLiterals = inside.filter((f) => f.what.includes("literal"));
    expect(factoryLiterals.length).toBe(1);
    expect(factoryLiterals[0].inFactory).toBe(true);
  });

  it("proves recordSlice has a call site OUTSIDE telemetry.ts", () => {
    const callers = backendTsFiles()
      .filter((f) => f !== TELEMETRY_FILE && !f.endsWith(".spec.ts"))
      .filter((f) => /\brecordSlice\s*\(/.test(readFileSync(f, "utf8")));
    expect(
      callers,
      "recordSlice is called by nothing in production. getStatus().maxSliceMs " +
        "would stay 0 for ever, and tests/phase1-load.spec.ts treats a 0 as an " +
        "instrument failure — discovered after a live Caido run and a " +
        "200-chunk load, the most expensive moment in the phase.",
    ).toContain(join(BACKEND_SRC, "ingest", "consumer.ts"));
  });
});
