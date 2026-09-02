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

import {
  HOSTILE_MAP_CASE_IDS,
  HOSTILE_MAP_CASES,
  SIZE_BOUNDARY_CASE_IDS,
  SIZE_BOUNDARY_MIN_BYTES,
  sizeBoundaryCases,
} from "./map-fixture";
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
  reasonForParseError,
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

// ===========================================================================
// THE MAP-05 HOSTILE MATRIX — every legal absence, every structural shape
// ===========================================================================
// ONE ROW PER FIXTURE, THE ID IN THE TITLE, AND THE EXERCISED ID SET ASSERTED
// EQUAL TO `HOSTILE_MAP_CASE_IDS` AT THE END. That closing assertion is the
// difference between "iterates the fixture" and "iterates the part of the
// fixture somebody wrote a case for": adding a case to `map-fixture.ts` fails
// this file until it is accounted for, which is the intended cost.
//
// THE FOUR LEGAL ABSENCE SHAPES ARE FOUR DISTINCT OUTCOMES, not one "no content"
// branch. `sourcesContent` absent entirely is a SUCCESS with nothing in it;
// `sourcesContent[i]` null is one skipped index; a SHORT content array is a
// suffix of skipped indexes; and a null `sources[i]` is a RECOVERED source with
// a null label. Collapsing any two of them loses the distinction UI-09 needs to
// tell an operator "this map carries no sources" apart from "this map failed".

/** Every reason this file has OBSERVED a shipped code path produce. */
const observedReasons = new Set<MapParseReason>();

function noteReason(result: MapParseResult | InlineMapResult): void {
  if ("ok" in result) {
    if (!result.ok) observedReasons.add(result.reason);
    return;
  }
  if (result.kind === "refused") observedReasons.add(result.reason);
}

/** Every fixture id this file has EXERCISED. */
const exercised = new Set<string>();

type CaseAssertion = (value: string) => void;

function refusalOf(result: MapParseResult): MapParseReason {
  if (result.ok) {
    throw new Error(
      "expected a refusal and got a successful parse. A hostile shape that " +
        "succeeds quietly is the defect this fixture exists to catch.",
    );
  }
  return result.reason;
}

const CASES: Readonly<Record<string, CaseAssertion>> = {
  "sources-content-absent": (value) => {
    // Pitfall 3, and the one that must NOT read as an error.
    const result = parse(value);
    expect(result.ok).toBe(true);
    expect("reason" in result).toBe(false);
    expect(recoveredOf(result)).toEqual([]);
    expect(skippedOf(result).map((s) => s.sourcesIndex)).toEqual([0, 1]);
    if (result.ok) expect(result.declaredSources).toBe(2);
  },

  "sources-content-shorter-than-sources": (value) => {
    const result = parse(value);
    expect(recoveredOf(result).map((r) => r.sourcesIndex)).toEqual([0]);
    expect(recoveredOf(result)[0].content).toBe("const a=1;");
    // Iterate `sources` and GUARD on the content length — never iterate
    // `sourcesContent` and index into `sources`.
    expect(skippedOf(result).map((s) => s.sourcesIndex)).toEqual([1, 2]);
    if (result.ok) expect(result.declaredSources).toBe(3);
  },

  "sources-content-null-entry": (value) => {
    const result = parse(value);
    expect(recoveredOf(result).map((r) => r.sourcesIndex)).toEqual([0]);
    expect(skippedOf(result)).toEqual([{ sourcesIndex: 1, reason: "empty" }]);
  },

  "sources-null-entry": (value) => {
    const result = parse(value);
    const rows = recoveredOf(result);
    expect(rows).toHaveLength(2);
    // A NULL, never the string "null". The distinction is the whole case: a row
    // labelled "null" is a source named null, and SQL cannot tell it from a
    // source whose name is unknown.
    expect(rows[0].sourcesVerbatim).toBeNull();
    expect(rows[0].sourcesVerbatim).not.toBe("null");
    expect(rows[0].content).toBe("const anon=1;");
    expect(rows[1].sourcesVerbatim).toBe("src/b.ts");
  },

  "sections-index-map": (value) => {
    // Pitfall 5. `sections` is read BEFORE `sources`, or a map with hundreds of
    // sources reports zero because the top level has no `sources` at all.
    const result = parse(value);
    const rows = recoveredOf(result);
    expect(rows.map((r) => r.sourcesVerbatim)).toEqual([
      "src/a.ts",
      "src/b.ts",
    ]);
    expect(rows.map((r) => r.sourcesIndex)).toEqual([0, 1]);
    if (result.ok) {
      expect(result.sectioned).toBe(true);
      expect(result.declaredSources).toBe(2);
    }
  },

  "sections-nested": (value) => {
    const result = parse(value);
    noteReason(result);
    expect(refusalOf(result)).toBe("nested_sections");
  },

  "sections-unsorted-overlapping": (value) => {
    // "shall be sorted ... shall not overlap" is what a hostile map violates. The
    // ordering is INPUT, not an invariant: document order is preserved and
    // nothing is sorted, so the outcome is defined rather than merely non-fatal.
    const rows = recoveredOf(parse(value));
    expect(rows.map((r) => r.content)).toEqual([
      "const b=2;",
      "const a=1;",
      "const c=3;",
    ]);
    expect(rows.map((r) => r.sourcesIndex)).toEqual([0, 1, 2]);
  },

  "sections-map-null": (value) => {
    // `section.map.sources` throws on a document that is otherwise well-formed
    // JSON, so the guard belongs on the MEMBER and not on the parse.
    const rows = recoveredOf(parse(value));
    expect(rows).toHaveLength(1);
    expect(rows[0].content).toBe("const b=2;");
  },

  "xssi-prefix": (value) => {
    // Pitfall 6. Stripped by startsWith + indexOf(newline), never a pattern.
    expect(value.startsWith(")]}'")).toBe(true);
    const rows = recoveredOf(parse(value));
    expect(rows).toHaveLength(1);
    expect(rows[0].sourcesVerbatim).toBe("src/a.ts");
  },

  "deep-nested-past-stack-limit": (value) => {
    // T-07-03. THE REQUIREMENT IS CATCH-AND-RECORD, NEVER CRASH — so the
    // assertion that carries the requirement is that the call RETURNS.
    //
    // WHAT THIS RUNTIME ACTUALLY DOES, stated rather than assumed: V8's
    // `JSON.parse` is iterative and parses 800 levels — and two million — without
    // complaint. SPIKE-06 bisected 710 brackets on Caido's QuickJS, against its
    // JS parser. So the `too_deep` branch is UNREACHABLE ON NODE and this case
    // cannot execute it; the mapping itself is executed directly against a real
    // RangeError below, which is the only honest way to prove a branch whose
    // trigger this runtime does not produce.
    // Called through a thunk rather than assigned inside the `expect` callback:
    // TypeScript's control-flow analysis cannot see an assignment made inside a
    // closure, and narrows the binding to `never` afterwards.
    const attempt = (): MapParseResult => parse(value);
    expect(attempt).not.toThrow();
    const settled = attempt();
    if (settled.ok) {
      expect(recoveredOf(settled)).toHaveLength(1);
    } else {
      noteReason(settled);
      expect(settled.reason).toBe("too_deep");
    }
  },

  "million-tiny-sources": (value) => {
    // MAP-06 / D-09. The hazard is the AGGREGATE, not the shape: a derived-source
    // row and a sighting row per source. Refused on the DECLARED count, before
    // any of the million entries is visited.
    const result = parse(value);
    noteReason(result);
    expect(refusalOf(result)).toBe("too_many_sources");
  },

  "single-giant-sources-content": (value) => {
    // The opposite hazard: one row, unbounded per-row cost. The parser stores the
    // string the JSON parser already produced and does not walk it a second time.
    const rows = recoveredOf(parse(value));
    expect(rows).toHaveLength(1);
    expect(rows[0].content.length).toBe(4 * 1024 * 1024);
    expect(rows[0].sourcesVerbatim).toBe("src/huge.ts");
  },

  "non-ascii-round-trip": (value) => {
    const rows = recoveredOf(parse(value));
    expect(rows).toHaveLength(1);
    expect(rows[0].content).toContain("£100");
    expect(rows[0].content).toContain("—");
    expect(rows[0].content).toContain("説明");
  },
};

describe("MAP-05 — the hostile matrix", () => {
  it("every fixture id has a case in this file, by name", () => {
    // Declared FIRST so a fixture added upstream fails here — with the id — rather
    // than in the it.each below with an "undefined is not a function".
    expect([...HOSTILE_MAP_CASE_IDS].sort()).toEqual(Object.keys(CASES).sort());
  });

  it.each([...HOSTILE_MAP_CASES])("$id — $why", (mapCase) => {
    const assertion = CASES[mapCase.id];
    expect(assertion, `no case for fixture id "${mapCase.id}"`).toBeDefined();
    assertion(mapCase.value);
    exercised.add(mapCase.id);
  });

  it("exercised EVERY id in HOSTILE_MAP_CASE_IDS, not a subset", () => {
    // Declared last in this describe, so it runs after the it.each above.
    // Deleting one row above turns this red rather than quietly shrinking the
    // matrix.
    expect([...exercised].sort()).toEqual([...HOSTILE_MAP_CASE_IDS].sort());
    expect(HOSTILE_MAP_CASE_IDS.length).toBeGreaterThanOrEqual(13);
  });
});

describe("the shapes that are not maps at all", () => {
  it.each([
    ["a truncated document", '{"version":3,"sources":["a.ts"'],
    ["not JSON at all", "<!doctype html>"],
    ["the empty string", ""],
  ])("%s is refused `malformed_json`", (_name, document) => {
    const result = parse(document);
    noteReason(result);
    expect(refusalOf(result)).toBe("malformed_json");
  });

  it.each([
    ["a bare number", "3"],
    ["an array", "[]"],
    ["null", "null"],
    ["an object with neither sources nor sections", '{"version":3}'],
    ["a `sources` that is not an array", '{"version":3,"sources":"a.ts"}'],
  ])("%s is refused `not_a_map`", (_name, document) => {
    const result = parse(document);
    noteReason(result);
    expect(refusalOf(result)).toBe("not_a_map");
  });

  it("`ignoreList` and its legacy spelling are neither used nor failed on", () => {
    // Named explicitly because "ignored" and "unimplemented" look identical from
    // the outside, and ECMA-426 added the field after most of this corpus was
    // written.
    const rows = recoveredOf(
      parse(
        '{"version":3,"sources":["a.ts"],"sourcesContent":["const a=1;"],' +
          '"ignoreList":[0],"x_google_ignoreList":[0],"names":[],"mappings":"AAAA"}',
      ),
    );
    expect(rows).toHaveLength(1);
  });

  it("a `sections` member on a NESTED map is refused however it is spelled", () => {
    // Fail-closed on PRESENCE rather than on shape: `"sections": null` inside a
    // section's map is not an index map by the spec's own definition, but it is
    // also not something a legitimate emitter writes, and the recursion bound is
    // 1 BY SPECIFICATION rather than by budget.
    const result = parse(
      '{"version":3,"sections":[{"offset":{"line":0,"column":0},"map":' +
        '{"version":3,"sections":null,"sources":["a.ts"],"sourcesContent":["x"]}}]}',
    );
    noteReason(result);
    expect(refusalOf(result)).toBe("nested_sections");
  });
});

describe("the base64 refusals are named, and never a shorter buffer", () => {
  it.each([
    ["a stray character outside the alphabet", "e3*0fQ=="],
    ["wrong padding", "e30===="],
    ["a truncated final quantum", "e30"],
    ["only padding", "===="],
  ])("%s is refused `malformed_base64`", (_name, payload) => {
    const result = decode(B64_PREFIXES[0] + payload);
    noteReason(result);
    expect(result.kind).toBe("refused");
    if (result.kind === "refused")
      expect(result.reason).toBe("malformed_base64");
    expect(result.json).toBeNull();
  });

  it("Buffer.from would have SILENTLY produced a shorter buffer for each", () => {
    // The counterexample the alphabet check exists for, executed rather than
    // described: the lenient primitive returns bytes for every one of these and
    // never throws, so without the check a stray byte becomes a truncated map and
    // the operator reads a syntax error about somewhere unrelated.
    for (const payload of ["e3*0fQ==", "e30====", "e30"]) {
      expect(() => Buffer.from(payload, "base64")).not.toThrow();
    }
    expect(Buffer.from("e3*0fQ==", "base64").length).toBeLessThan(
      Buffer.from("e30ifQ==", "base64").length + 1,
    );
  });

  it("an empty payload is refused `empty`, not decoded to an empty map", () => {
    const result = decode(B64_PREFIXES[0]);
    noteReason(result);
    expect(result.kind).toBe("refused");
    if (result.kind === "refused") expect(result.reason).toBe("empty");
  });

  it("both D-04 prefixes decode, and the charset one is case-insensitive", () => {
    const json = '{"version":3,"sources":["a.ts"],"sourcesContent":["x"]}';
    for (const prefix of [
      B64_PREFIXES[0],
      B64_PREFIXES[1],
      "data:application/json;charset=UTF-8;base64,",
    ]) {
      const result = decode(inlineUrl(json, prefix));
      expect(result.kind, prefix).toBe("inline");
    }
  });

  it.each([
    "data:application/json;charset=iso-8859-1;base64,e30=",
    "data:application/json,%7B%7D",
    "data:text/plain;base64,e30=",
    "https://example.test/app.js.map",
    "./app.js.map",
    "",
  ])("%s is EXTERNAL — not decoded, not fetched", (url) => {
    const result = decode(url);
    expect(result.kind).toBe("external");
    expect(result.json).toBeNull();
  });
});

// ===========================================================================
// THE SIZE BOUNDARY, AT THE REAL CEILING — closing plan 07-01's open WINDOW
// ===========================================================================
// 07-01 shipped `sizeBoundaryCases(ceiling)` as a BUILDER rather than a frozen
// pair at `MAP_MAX_BYTES`, because the fixture module lands before the constant
// does. It recorded the consequence as an open defect: the MAP-05 boundary truth
// is met by apparatus and not by an exercised bound until somebody calls the
// builder AT the real ceiling. This is that call.

describe("MAP-05 — the decoded ceiling, from both sides, at MAP_MAX_BYTES", () => {
  const exercisedBoundaryIds = new Set<string>();

  it.each([...sizeBoundaryCases(MAP_MAX_BYTES)])("$id", (boundaryCase) => {
    exercisedBoundaryIds.add(boundaryCase.id);
    const result = decode(inlineUrl(boundaryCase.value));
    if (boundaryCase.id === "exactly-map-max-bytes") {
      // The ceiling is INCLUSIVE, as PASSIVE_MAX_BYTES is in admit.spec.ts.
      expect(result.kind).toBe("inline");
      if (result.kind === "inline") {
        expect(Buffer.byteLength(result.json, "utf8")).toBe(MAP_MAX_BYTES);
      }
      return;
    }
    // ONE byte over. REFUSED, never truncated: a truncated map decodes to WRONG
    // POSITIONS rather than to an error.
    noteReason(result);
    expect(result.kind).toBe("refused");
    if (result.kind === "refused") expect(result.reason).toBe("too_large");
    expect(result.json).toBeNull();
  });

  it("the ENCODED gate cannot have been what refused the one-over case", () => {
    // Both documents encode to the SAME base64 length — base64 quantises to
    // three-byte groups — so the encoded gate lets both through and the DECODED
    // byte check is what separates them. Without this assertion the pair would
    // look like it proved the encoded gate and prove nothing about the decoded
    // one.
    const [at, above] = sizeBoundaryCases(MAP_MAX_BYTES);
    const encodedAt = Buffer.from(at.value, "utf8").toString("base64").length;
    const encodedAbove = Buffer.from(above.value, "utf8").toString(
      "base64",
    ).length;
    expect(encodedAbove).toBe(encodedAt);
    expect(encodedAt).toBeLessThanOrEqual(encodedCeiling(MAP_MAX_BYTES));
  });

  it("the SAME property holds at a test size — the builder's second reason", () => {
    const small = SIZE_BOUNDARY_MIN_BYTES + 1024;
    const [at, above] = sizeBoundaryCases(small);
    expect(decode(inlineUrl(at.value), small).kind).toBe("inline");
    const refusedAbove = decode(inlineUrl(above.value), small);
    expect(refusedAbove.kind).toBe("refused");
    if (refusedAbove.kind === "refused") {
      expect(refusedAbove.reason).toBe("too_large");
    }
  });

  it("exercised EVERY id in SIZE_BOUNDARY_CASE_IDS, not a subset", () => {
    expect([...exercisedBoundaryIds].sort()).toEqual(
      [...SIZE_BOUNDARY_CASE_IDS].sort(),
    );
  });
});

// ===========================================================================
// THE AGGREGATE BOUND IS A ROW BOUND — MD-01, FROM BOTH SIDES
// ===========================================================================
// `SOURCE_ROWS_PER_MAP_MAX` is DERIVED in rows — `thresholds.ts` computes it
// from the probe's source density as "471 sources and 942 rows" and rounds to
// the next power of two — and until 07-14 it was ENFORCED against the declared
// SOURCE count. The two units differ by exactly the D-05 factor of two, so the
// reachable ceiling was 4,096 rows against a documented 2,048 (07-REVIEW.md
// MD-01). A gate whose unit does not match its derivation is not a weaker gate;
// it is a gate that says one number and does another, and the retention
// convergence inequality carried a compensating `2 *` because of it.
//
// EXERCISED FROM BOTH SIDES, in `admit.spec.ts`'s idiom: exactly at the row
// ceiling is ACCEPTED and one source past it is REFUSED. One side alone passes
// by getting the side it was tested on right.

/** D-05: one `sources` row per new content hash, one `source_sightings` row per `(map, index)`. */
const ROWS_PER_DECLARED_SOURCE = 2;

/** The most sources a map may declare before it would write more than the row bound. */
const SOURCES_AT_ROW_CEILING =
  SOURCE_ROWS_PER_MAP_MAX / ROWS_PER_DECLARED_SOURCE;

/** A legal map declaring `count` distinct labels and no content. The COUNT is the subject. */
function mapDeclaring(count: number): string {
  const labels: string[] = [];
  for (let i = 0; i < count; i += 1) labels.push(`"src/s${i}.ts"`);
  return (
    '{"version":3,"file":"app.js","sources":[' +
    labels.join(",") +
    '],"names":[],"mappings":"AAAA"}'
  );
}

/** The same `count` labels, split across two sections, to defeat a per-section gate. */
function sectionedMapDeclaring(count: number): string {
  const half = Math.floor(count / 2);
  const section = (from: number, to: number, line: number): string =>
    '{"offset":{"line":' +
    String(line) +
    ',"column":0},"map":{"version":3,"sources":[' +
    Array.from({ length: to - from }, (_, i) => `"src/s${from + i}.ts"`).join(
      ",",
    ) +
    '],"names":[],"mappings":"AAAA"}}';
  return (
    '{"version":3,"file":"app.js","sections":[' +
    section(0, half, 0) +
    "," +
    section(half, count, 1) +
    "]}"
  );
}

describe("MAP-06 — the aggregate bound refuses at the ROWS it documents", () => {
  it("the bound is EVEN, so the row ceiling converts to a whole number of sources", () => {
    // Without this the two cases below would straddle a rounding decision rather
    // than a boundary, and "exactly at the ceiling" would be a fiction.
    expect(SOURCE_ROWS_PER_MAP_MAX % ROWS_PER_DECLARED_SOURCE).toBe(0);
    expect(SOURCES_AT_ROW_CEILING).toBe(SOURCE_ROWS_PER_MAP_MAX / 2);
  });

  it(`ACCEPTS ${SOURCES_AT_ROW_CEILING} sources — exactly ${SOURCE_ROWS_PER_MAP_MAX} rows, the boundary from below`, () => {
    const result = parse(mapDeclaring(SOURCES_AT_ROW_CEILING));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.declaredSources).toBe(SOURCES_AT_ROW_CEILING);
    expect(result.declaredSources * ROWS_PER_DECLARED_SOURCE).toBe(
      SOURCE_ROWS_PER_MAP_MAX,
    );
  });

  it(`REFUSES ${SOURCES_AT_ROW_CEILING + 1} sources — ${SOURCE_ROWS_PER_MAP_MAX + ROWS_PER_DECLARED_SOURCE} rows, the boundary from above`, () => {
    const result = parse(mapDeclaring(SOURCES_AT_ROW_CEILING + 1));
    noteReason(result);
    expect(
      refusalOf(result),
      `a map declaring ${SOURCES_AT_ROW_CEILING + 1} sources writes ` +
        `${(SOURCES_AT_ROW_CEILING + 1) * ROWS_PER_DECLARED_SOURCE} rows under D-05, ` +
        `past SOURCE_ROWS_PER_MAP_MAX (${SOURCE_ROWS_PER_MAP_MAX}). Accepting it is ` +
        `MD-01: the gate compares the DECLARED SOURCE count against a bound derived ` +
        `in ROWS, so the real ceiling is twice the documented one and the retention ` +
        `convergence inequality has to carry a factor to compensate.`,
    ).toBe("too_many_sources");
  });

  it("a SECTIONED map is refused at the same AGGREGATE, not per section", () => {
    // An index map cannot get under the bound by splitting: `absorb` sums
    // `declared` across sections and the gate reads the sum.
    const result = parse(sectionedMapDeclaring(SOURCES_AT_ROW_CEILING + 1));
    noteReason(result);
    expect(refusalOf(result)).toBe("too_many_sources");
    // The control: the same split, one source fewer, is ACCEPTED — so the refusal
    // above is the aggregate and not the sectioning.
    const under = parse(sectionedMapDeclaring(SOURCES_AT_ROW_CEILING));
    expect(under.ok).toBe(true);
  });
});

describe("EVERY reason in the closed vocabulary has a case", () => {
  it("`too_deep` is produced by the shipped classifier from a REAL RangeError", () => {
    // THE ONLY BRANCH THIS RUNTIME CANNOT TRIGGER THROUGH THE FRONT DOOR, and it
    // is said plainly rather than papered over. V8's JSON parser is iterative:
    // two million nested levels parse without complaint, so no document can make
    // `JSON.parse` throw a RangeError on Node. SPIKE-06 measured Caido's QuickJS
    // failing at 710 brackets with `catchable-stack-throw` at every failing depth
    // and the host surviving all 18 probes — which is why catch-and-degrade is
    // the design and a pre-parse depth gate is not required.
    //
    // So the MAPPING is executed here against a genuine RangeError, and the CATCH
    // that consults it is executed by the malformed-JSON cases above. A branch
    // whose trigger the test runtime cannot produce is still a branch that must
    // be run by something.
    observedReasons.add(reasonForParseError(new RangeError("stack overflow")));
    expect(reasonForParseError(new RangeError("x"))).toBe("too_deep");
    expect(reasonForParseError(new SyntaxError("x"))).toBe("malformed_json");
    expect(reasonForParseError("not an error at all")).toBe("malformed_json");
  });

  it("every member of MAP_PARSE_REASONS was OBSERVED, and names the ones that were not", () => {
    // Declared last. A ninth reason added to `parse.ts` with no case turns this
    // red immediately, which is the whole reason the vocabulary is a runtime
    // array with the type derived from it rather than a hand-written union.
    const missing = MAP_PARSE_REASONS.filter((r) => !observedReasons.has(r));
    expect(
      missing,
      `these reasons are declared and never produced by any case in this file: ` +
        `${missing.join(", ")}. A reason nothing can produce is a copy string ` +
        `plan 07-08 will write for an outcome that never happens.`,
    ).toEqual([]);
  });
});
