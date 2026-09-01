// packages/engine/src/sourcemap/parse.spec.ts — MAP-02's reconstruction, MAP-05's matrix.
//
// The engine is SDK-FREE by construction, which is the whole reason this file can
// exist: every fixture below runs under plain vitest on Node, in CI, on every
// commit, with no Caido present. Putting the parser in the backend would make
// each one of them need a fake SDK, and a hostile-input suite nobody can afford
// to run is a suite that stops being run.

import { describe, expect, it } from "vitest";

import { sha256Hex } from "../digest";
import { MAP_MAX_BYTES, SOURCE_ROWS_PER_MAP_MAX } from "../thresholds";

import { HOSTILE_MAP_CASES } from "./map-fixture";
import type {
  InlineMapResult,
  MapParseReason,
  MapParseResult,
  ParseLimits,
  RecoveredSource,
  SkippedSource,
} from "./parse";
import {
  B64_PREFIXES,
  decodeInlineMap,
  encodedCeiling,
  MAP_PARSE_REASONS,
  parseSourceMap,
} from "./parse";

// ANNOTATED, NOT INFERRED. Naming the published types here is what makes a
// change to any of them a compile error in this file rather than a silently
// re-inferred shape — and it is what keeps `pnpm knip` honest about which of
// this module's exports are actually spoken for.
const LIMITS: ParseLimits = { maxSourceRows: SOURCE_ROWS_PER_MAP_MAX };

/** The decode, with the published result type named at the call site. */
function decode(url: string, maxBytes = MAP_MAX_BYTES): InlineMapResult {
  return decodeInlineMap(url, maxBytes);
}

/** The parse, likewise. */
function parse(json: string, limits: ParseLimits = LIMITS): MapParseResult {
  return parseSourceMap(json, limits);
}

/** The recovered rows of a result that must have succeeded, or a THROW. */
function recoveredOf(result: MapParseResult): readonly RecoveredSource[] {
  if (!result.ok) {
    throw new Error(
      `expected a successful parse, got refusal "${result.reason}". A refusal ` +
        "where a success was expected is the UI-09 failure this suite exists to " +
        "catch: an operator told a map is broken when it merely carries nothing.",
    );
  }
  return result.recovered;
}

/** The skipped rows of a result that must have succeeded, or a THROW. */
function skippedOf(result: MapParseResult): readonly SkippedSource[] {
  if (!result.ok) {
    throw new Error(
      `expected a successful parse, got refusal "${result.reason}".`,
    );
  }
  return result.skipped;
}

/** One fixture, by id, or a THROW naming the id — never `undefined` flowing on. */
function fixture(id: string): string {
  const found = HOSTILE_MAP_CASES.find((c) => c.id === id);
  if (found === undefined) {
    throw new Error(
      `map-fixture.ts no longer exports a case with id "${id}". This spec asserts ` +
        `HOSTILE_MAP_CASE_IDS in full, so a rename must be made here deliberately.`,
    );
  }
  return found.value;
}

/**
 * The fixture AS A TARGET WOULD DELIVER IT — raw UTF-8, not `\uXXXX` escapes.
 *
 * `map-fixture.ts`'s header states why its adversarial characters are written as
 * escapes: a literal control or bidi character is invisible in every diff and
 * every review tool. The consequence is that the fixture's own bytes are pure
 * ASCII, and a base64 round trip over pure ASCII cannot show Pitfall 4 at all —
 * `atob` and `Buffer` agree on ASCII. Re-serialising through `JSON.parse` +
 * `JSON.stringify` produces the shape a bundler actually emits (raw UTF-8 inside
 * the string values) without forking the corpus.
 */
function asDelivered(id: string): string {
  return JSON.stringify(JSON.parse(fixture(id)));
}

function inlineUrl(json: string, prefix = B64_PREFIXES[0]): string {
  return prefix + Buffer.from(json, "utf8").toString("base64");
}

describe("the reason vocabulary is CLOSED and DefMiner-authored", () => {
  it("is frozen, and its members are the eight this module publishes", () => {
    expect(Object.isFrozen(MAP_PARSE_REASONS)).toBe(true);
    expect([...MAP_PARSE_REASONS].sort()).toEqual([
      "empty",
      "malformed_base64",
      "malformed_json",
      "nested_sections",
      "not_a_map",
      "too_deep",
      "too_large",
      "too_many_sources",
    ]);
  });

  it("B64_PREFIXES is the frozen pair of D-04 forms and nothing else", () => {
    expect(Object.isFrozen(B64_PREFIXES)).toBe(true);
    expect(B64_PREFIXES).toEqual([
      "data:application/json;base64,",
      "data:application/json;charset=utf-8;base64,",
    ]);
  });
});

describe("the tracer — one inline map, announcement to recovered sources", () => {
  const delivered = asDelivered("non-ascii-round-trip");

  it("decodes the data URI to the SAME JSON that went in", () => {
    const result = decodeInlineMap(inlineUrl(delivered), MAP_MAX_BYTES);
    expect(result.kind).toBe("inline");
    if (result.kind !== "inline") return;
    expect(result.json).toBe(delivered);
  });

  it("reports an https URL as EXTERNAL and decodes nothing (D-01, D-03)", () => {
    const result = decodeInlineMap(
      "https://example.test/app.js.map",
      MAP_MAX_BYTES,
    );
    expect(result.kind).toBe("external");
    expect(result.json).toBeNull();
  });

  it("yields one entry per `sources` index that has content, VERBATIM", () => {
    const parsed = parseSourceMap(delivered, LIMITS);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const own = JSON.parse(delivered) as {
      sources: string[];
      sourcesContent: string[];
    };
    expect(parsed.recovered).toHaveLength(1);
    expect(parsed.declaredSources).toBe(own.sources.length);
    const [first]: RecoveredSource[] = [...parsed.recovered];
    expect(first.sourcesIndex).toBe(0);
    expect(first.sourcesVerbatim).toBe(own.sources[0]);
    expect(first.content).toBe(own.sourcesContent[0]);
  });

  it("round-trips the non-ASCII source to a BYTE-IDENTICAL sha256", () => {
    // Pitfall 4's positive control. The pound sign, the em dash and the CJK
    // characters survive base64 -> utf8 -> JSON.parse with the same digest they
    // went in with. The NEGATIVE control — that the other primitive corrupts
    // them — lives in decode.spec.ts, where both results are computed.
    const own = JSON.parse(delivered) as { sourcesContent: string[] };
    const decoded = decodeInlineMap(inlineUrl(delivered), MAP_MAX_BYTES);
    expect(decoded.kind).toBe("inline");
    if (decoded.kind !== "inline") return;
    const parsed = parseSourceMap(decoded.json, LIMITS);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const recovered = parsed.recovered[0].content;
    expect(sha256Hex(new Uint8Array(Buffer.from(recovered, "utf8")))).toBe(
      sha256Hex(new Uint8Array(Buffer.from(own.sourcesContent[0], "utf8"))),
    );
    expect(recovered).toContain("£100");
    expect(recovered).toContain("—");
    expect(recovered).toContain("説明");
  });
});

describe("the ENCODED-length gate fires BEFORE the decoded buffer is allocated", () => {
  const ceiling = encodedCeiling(MAP_MAX_BYTES);

  it("the ceiling is the derived expression, not a copied number", () => {
    expect(ceiling).toBe(Math.ceil((MAP_MAX_BYTES * 4) / 3) + 4);
  });

  it("accepts at exactly the ceiling and refuses `too_large` one byte above", () => {
    // AT the ceiling the size gate does NOT fire, and the refusal that follows is
    // the ALPHABET gate — which is the proof of ORDER this case exists for: a
    // payload of that length is not a multiple of four, so reaching
    // `malformed_base64` means the size check ran first and let it through.
    const at = decodeInlineMap(
      B64_PREFIXES[0] + "A".repeat(ceiling),
      MAP_MAX_BYTES,
    );
    const above = decodeInlineMap(
      B64_PREFIXES[0] + "A".repeat(ceiling + 1),
      MAP_MAX_BYTES,
    );
    expect(at.kind).toBe("refused");
    if (at.kind === "refused") expect(at.reason).toBe("malformed_base64");
    expect(above.kind).toBe("refused");
    if (above.kind === "refused") expect(above.reason).toBe("too_large");
  });

  it("a refusal carries a NULL payload field — nothing was decoded", () => {
    const above = decodeInlineMap(
      B64_PREFIXES[0] + "A".repeat(ceiling + 1),
      MAP_MAX_BYTES,
    );
    expect(above.json).toBeNull();
  });

  it("every refusal reason it can return is a member of the closed vocabulary", () => {
    const reasons: MapParseReason[] = [];
    for (const url of [
      B64_PREFIXES[0],
      B64_PREFIXES[0] + "!!!!",
      B64_PREFIXES[0] + "A".repeat(ceiling + 1),
    ]) {
      const result = decodeInlineMap(url, MAP_MAX_BYTES);
      if (result.kind === "refused") reasons.push(result.reason);
    }
    expect(reasons).toHaveLength(3);
    for (const reason of reasons) expect(MAP_PARSE_REASONS).toContain(reason);
  });
});
