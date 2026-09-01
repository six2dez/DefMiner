// packages/engine/src/sourcemap/announce.spec.ts — MAP-01's discovery half.
//
// D-02 says the `sourceMappingURL` announcement is found by `lastIndexOf` over a
// bounded tail window and by nothing else. This file asserts that property TWICE
// and the two assertions fail differently on purpose:
//
//   BEHAVIOURALLY — the window boundary is exercised from both sides, the
//   later marker wins, and the monaco shape (an announcement at EOF with no
//   trailing newline) returns its URL to the end of the string.
//
//   STRUCTURALLY — `announce.ts` is read from disk, parsed with the TypeScript
//   compiler and asserted to contain ZERO regular-expression literals and ZERO
//   `new RegExp` constructions, with a non-vacuity assertion on the visited node
//   count. A behavioural test cannot see a pattern that is only reached by an
//   input nobody wrote a case for; SPIKE-01 measured that such a pattern hangs
//   the QuickJS thread with NO interrupt and that SIGKILL — which takes the
//   operator's real project with it — was the only teardown that worked.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { MAP_MAX_BYTES, SOURCEMAP_TAIL_WINDOW_BYTES } from "../thresholds";

import type { Announcement } from "./announce";
import { findAnnouncement, MARKERS } from "./announce";
import { decodeInlineMap } from "./parse";

/** The current spelling, and the legacy one. Read off the module, never retyped. */
const [MARKER_HASH, MARKER_AT] = MARKERS;

/** A short, obviously-inline announcement URL. The payload is not the subject here. */
const INLINE_URL = "data:application/json;base64,e30=";

describe("MARKERS is the shape the scan is built on", () => {
  it("is a FROZEN two-member array — the current spelling and the legacy one", () => {
    expect(Object.isFrozen(MARKERS)).toBe(true);
    expect(MARKERS).toEqual(["//# sourceMappingURL=", "//@ sourceMappingURL="]);
  });

  it("both markers are the SAME LENGTH, which is what lets one slice serve both", () => {
    // findAnnouncement takes the URL from `at + MARKERS[0].length`. If a third
    // spelling of a different length were ever added, that arithmetic would read
    // from the wrong offset for it — silently, and only for the new spelling.
    expect(new Set(MARKERS.map((m) => m.length)).size).toBe(1);
  });

  it("both markers carry the 16-byte common substring at the SAME offset", () => {
    // The A2 prefilter searches for that substring once and derives the marker
    // start by subtracting this offset. Both facts are asserted rather than
    // assumed, because the prefilter is only equivalent to the two full searches
    // while they hold.
    expect(MARKERS.map((m) => m.indexOf("sourceMappingURL"))).toEqual([4, 4]);
    expect("sourceMappingURL".length).toBe(16);
  });
});

describe("the tracer — one announcement, found", () => {
  it("finds an announcement at EOF with NO trailing newline (the monaco shape)", () => {
    const body = `console.log(1);\n//# sourceMappingURL=${INLINE_URL}`;
    const found = findAnnouncement(body, SOURCEMAP_TAIL_WINDOW_BYTES);
    expect(found).not.toBeNull();
    expect(found?.at).toBe(body.indexOf(MARKER_HASH));
    expect(found?.url).toBe(INLINE_URL);
  });

  it("stops at the newline when there is one (the babel and tfjs shape)", () => {
    const body = `console.log(1);\n//# sourceMappingURL=${INLINE_URL}\n`;
    const found = findAnnouncement(body, SOURCEMAP_TAIL_WINDOW_BYTES);
    expect(found?.url).toBe(INLINE_URL);
  });

  it("returns null when the announcement is FURTHER BACK than the window", () => {
    // The failing half of the window property. Without it a window of any width
    // passes, including one wide enough to make the bound meaningless.
    const body = `//# sourceMappingURL=${INLINE_URL}\n${"x".repeat(4096)}`;
    expect(findAnnouncement(body, 512)).toBeNull();
  });

  it("returns null for a body with no marker at all, rather than throwing", () => {
    let result: Announcement | null = null;
    expect(() => {
      result = findAnnouncement("var a = 1;\n", SOURCEMAP_TAIL_WINDOW_BYTES);
    }).not.toThrow();
    expect(result).toBeNull();
  });
});

// ===========================================================================
// THE NO-PATTERN PROPERTY, PROVEN STRUCTURALLY (D-02, T-07-04)
// ===========================================================================
// AN AST WALK AND NOT A SUBSTRING SCAN, for the reason
// `filesystem-prohibition.spec.ts` gives at length: a gate a comment can trip is
// a gate that gets WEAKENED rather than obeyed. Both modules under audit talk
// about patterns in their headers — at length, because the reasoning is worth
// more than the characters it costs — so a text scan would fail on its own
// documentation and the only way to make it pass would be deleting the
// reasoning. Precisely backwards.
//
// AND A NON-VACUITY ASSERTION, because a gate that quietly scans nothing is the
// same defect as a gate that quietly matches nothing. This one has been WATCHED
// FAILING: a scratch edit planting a pattern literal in `announce.ts` turned it
// red, and it went green again on revert. Both observations are recorded in
// 07-02-SUMMARY.md.

type PatternAudit = {
  regexLiterals: number;
  regExpConstructions: number;
  nodes: number;
  calls: number;
};

/** The audited modules, by the same relative resolution `decode.spec.ts` uses. */
const AUDITED = ["./announce.ts", "./parse.ts"] as const;

function auditPatterns(relative: string): PatternAudit {
  const path = fileURLToPath(new URL(relative, import.meta.url));
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const audit: PatternAudit = {
    regexLiterals: 0,
    regExpConstructions: 0,
    nodes: 0,
    calls: 0,
  };
  const visit = (node: ts.Node): void => {
    audit.nodes += 1;
    if (node.kind === ts.SyntaxKind.RegularExpressionLiteral) {
      audit.regexLiterals += 1;
    }
    if (ts.isCallExpression(node)) audit.calls += 1;
    // `new RegExp(...)` in every receiver-free spelling. A `new` whose callee is
    // an identifier naming the built-in pattern constructor, however it was
    // imported or aliased at the point of construction.
    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "RegExp"
    ) {
      audit.regExpConstructions += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return audit;
}

describe.each(AUDITED)("%s contains no pattern, structurally", (relative) => {
  const audit = auditPatterns(relative);

  it("has ZERO regular-expression literals", () => {
    expect(
      audit.regexLiterals,
      `${relative} now contains ${audit.regexLiterals} pattern literal(s). ` +
        "REDOS_INTERRUPTIBLE is false and REDOS_RECOVERY is `kill`: SPIKE-01 measured " +
        "that a catastrophic pattern hangs the QuickJS thread with NO interrupt and " +
        "that SIGKILL — which takes caido-cli down with the operator's real project " +
        "data — was the only teardown that worked. The input here is a multi-megabyte " +
        "body a target chose. Use lastIndexOf / indexOf / startsWith.",
    ).toBe(0);
  });

  it("has ZERO `new RegExp` constructions", () => {
    expect(
      audit.regExpConstructions,
      `${relative} now constructs a pattern at runtime. A pattern assembled from ` +
        "target-influenced pieces is the same hazard as a literal one and is harder " +
        "to see.",
    ).toBe(0);
  });

  it("the walk actually VISITED the file — the two counts above are not vacuous", () => {
    // Without this, a resolution slip that read an empty string would report zero
    // patterns and zero constructions and pass, forever.
    expect(
      audit.nodes,
      `the walk over ${relative} visited ${audit.nodes} nodes, which is too few for ` +
        "a real module — the file was probably not read.",
    ).toBeGreaterThan(50);
    expect(
      audit.calls,
      `the walk over ${relative} found no call expression at all, so it is not ` +
        "looking at the module it claims to audit.",
    ).toBeGreaterThan(0);
  });
});

// ===========================================================================
// THE WINDOW BOUNDARY, FROM BOTH SIDES
// ===========================================================================
// `admit.spec.ts`'s idiom: accept at exactly the boundary and refuse one byte
// past it. A gate exercised from one side only passes by getting the side it was
// tested on right, and `>` versus `>=` is the whole content of a boundary.

/** A marker at `lead`, an inline URL after it, and nothing else. */
function bodyWithMarkerAt(lead: number, url: string, marker = MARKER_HASH) {
  return "x".repeat(lead) + marker + url;
}

describe("the tail window is a boundary, stated", () => {
  const LEAD = 4096;
  const tail = MARKER_HASH.length + INLINE_URL.length;
  const body = bodyWithMarkerAt(LEAD, INLINE_URL);

  it("FINDS a marker that starts at exactly the window start", () => {
    // windowBytes === tail puts the window start exactly on the marker.
    const found = findAnnouncement(body, tail);
    expect(found?.at).toBe(LEAD);
    expect(found?.url).toBe(INLINE_URL);
  });

  it("does NOT find it when the window starts one byte later", () => {
    // The same body, one byte of window removed. The marker is now one byte
    // BEFORE the window start and is no longer an announcement.
    expect(findAnnouncement(body, tail - 1)).toBeNull();
  });

  it("clamps the window start to 0 for a body SHORTER than the window", () => {
    const short = bodyWithMarkerAt(2, INLINE_URL);
    expect(short.length).toBeLessThan(SOURCEMAP_TAIL_WINDOW_BYTES);
    expect(findAnnouncement(short, SOURCEMAP_TAIL_WINDOW_BYTES)?.at).toBe(2);
  });

  it("a ZERO-LENGTH body returns null", () => {
    expect(findAnnouncement("", SOURCEMAP_TAIL_WINDOW_BYTES)).toBeNull();
    expect(findAnnouncement("", 0)).toBeNull();
  });

  it("a window of zero finds nothing, and does not throw doing it", () => {
    expect(findAnnouncement(body, 0)).toBeNull();
  });
});

describe("which announcement is THE announcement", () => {
  it("both spellings present: the LATER offset wins", () => {
    const body =
      `${MARKER_AT}first.map\n` +
      `console.log(1);\n` +
      `${MARKER_HASH}last.map`;
    const found = findAnnouncement(body, SOURCEMAP_TAIL_WINDOW_BYTES);
    expect(found?.at).toBe(body.lastIndexOf(MARKER_HASH));
    expect(found?.url).toBe("last.map");
  });

  it("both spellings present, LEGACY later: the legacy one wins", () => {
    // The mirror. Without it "the later wins" could just as well be "the current
    // spelling wins", and every fixture in this repo uses the current spelling.
    const body =
      `${MARKER_HASH}first.map\n` +
      `console.log(1);\n` +
      `${MARKER_AT}last.map`;
    const found = findAnnouncement(body, SOURCEMAP_TAIL_WINDOW_BYTES);
    expect(found?.at).toBe(body.lastIndexOf(MARKER_AT));
    expect(found?.url).toBe("last.map");
  });

  it("THE TWO OFFSETS CAN NEVER BE EQUAL, so there is no tie to break", () => {
    // Stated instead of branched on. The two marker strings differ at index 2
    // (`#` versus `@`), so no single offset can be the start of both — the
    // equality case is unreachable BY CONSTRUCTION and a tie-break branch would
    // be dead code nobody could ever write a fixture for.
    expect(MARKER_HASH[2]).not.toBe(MARKER_AT[2]);
    expect(MARKER_HASH.slice(0, 2)).toBe(MARKER_AT.slice(0, 2));
    expect(MARKER_HASH.slice(3)).toBe(MARKER_AT.slice(3));
  });

  it("an announcement that is NOT the last one is NOT the announcement", () => {
    // Three announcements over seven lines. Only the last is the map this body
    // announces — the rule every bundler relies on — and the earlier two are
    // decoys as far as this scanner is concerned.
    const body = [
      `${MARKER_HASH}one.map`,
      "const a = 1;",
      `${MARKER_HASH}two.map`,
      "const b = 2;",
      `${MARKER_HASH}three.map`,
      "const c = 3;",
      "",
    ].join("\n");
    const found = findAnnouncement(body, SOURCEMAP_TAIL_WINDOW_BYTES);
    expect(found?.url).toBe("three.map");
    expect(found?.at).toBe(body.lastIndexOf(MARKER_HASH));
  });
});

describe("the URL runs to end-of-line, and to EOF when there is none", () => {
  it("an announcement whose URL is the EMPTY STRING is still an announcement", () => {
    // The scanner reports what it found; the CALLER decides it is unusable. A
    // scanner that returned null here would make "no announcement" and "an
    // announcement of nothing" the same outcome, and they are different facts
    // about the target.
    const body = `console.log(1);\n${MARKER_HASH}`;
    const found = findAnnouncement(body, SOURCEMAP_TAIL_WINDOW_BYTES);
    expect(found).not.toBeNull();
    expect(found?.url).toBe("");
    expect(decodeInlineMap(found?.url ?? "x", MAP_MAX_BYTES).kind).toBe(
      "external",
    );
  });

  it("trims a CRLF line ending out of the URL", () => {
    const body = `${MARKER_HASH}app.js.map\r\nconsole.log(1);\n`;
    expect(findAnnouncement(body, SOURCEMAP_TAIL_WINDOW_BYTES)?.url).toBe(
      "app.js.map",
    );
  });

  it("THE CONCATENATION DEFECT — the next file is swallowed into the line", () => {
    // The same shape that makes a corpus fixture built by concatenation invalid
    // JavaScript: monaco ends with an announcement and NO trailing newline, so
    // whatever is appended lands INSIDE that line comment. The scanner must be
    // robust to it rather than surprised by it.
    //
    // AND THIS IS WHERE THE ALPHABET CHECK EARNS ITS COST. The swallowed text is
    // now part of the base64 payload, so the payload is not base64 — and
    // `parse.ts` refuses it by NAME. The lenient primitive would have SKIPPED the
    // stray characters and decoded the leading `e30=` to a perfectly valid empty
    // map, which is asserted below: the concatenation defect would have produced
    // a map that parses, from bytes that are two files.
    const swallowed = `${MARKER_HASH}data:application/json;base64,e30=/* next file */var b=2;`;
    const found = findAnnouncement(swallowed, SOURCEMAP_TAIL_WINDOW_BYTES);
    expect(found?.url).toContain("/* next file */");
    const result = decodeInlineMap(found?.url ?? "", MAP_MAX_BYTES);
    expect(result.kind).toBe("refused");
    if (result.kind === "refused")
      expect(result.reason).toBe("malformed_base64");
    expect(result.json).toBeNull();
    // The counterexample, executed.
    expect(
      Buffer.from("e30=/* next file */var b=2;", "base64").toString("utf8"),
    ).toBe("{}");
  });

  it("a NON-concatenated announcement at EOF decodes — so the case is the input", () => {
    // The control for the case above. Without it, "the concatenated shape is
    // refused" could just as well mean the EOF shape is refused.
    const clean = `${MARKER_HASH}data:application/json;base64,e30=`;
    const found = findAnnouncement(clean, SOURCEMAP_TAIL_WINDOW_BYTES);
    const result = decodeInlineMap(found?.url ?? "", MAP_MAX_BYTES);
    expect(result.kind).toBe("inline");
    if (result.kind === "inline") expect(result.json).toBe("{}");
  });
});

// ===========================================================================
// THE A2 PREFILTER IS EQUIVALENT TO THE TWO FULL SEARCHES — PROVEN, NOT ASSUMED
// ===========================================================================
// `announce.ts` runs one `lastIndexOf` for the 16-byte substring both markers
// share and, when the last occurrence turns out to BE a marker, returns without
// running either full marker search. That fast path is an optimisation with a
// measured reason (announce_scan was 3.80 ms/MB, the most expensive of the D-10
// probe's five operations) and an obvious way to be subtly wrong.
//
// So it is checked DIFFERENTIALLY against a naive reference that does exactly
// what the probe did — two full `lastIndexOf` calls, later offset wins — over
// every body in this file. An optimisation asserted only by the cases somebody
// thought to write is an optimisation nobody has checked.

/** The two-full-scan reference. Deliberately the slow, obvious implementation. */
function naiveFindAnnouncement(
  body: string,
  windowBytes: number,
): Announcement | null {
  const windowStart = body.length > windowBytes ? body.length - windowBytes : 0;
  let at = -1;
  for (const marker of MARKERS) {
    const found = body.lastIndexOf(marker);
    if (found > at) at = found;
  }
  if (at < 0 || at < windowStart) return null;
  const urlStart = at + MARKERS[0].length;
  const newline = body.indexOf("\n", urlStart);
  const raw =
    newline < 0 ? body.slice(urlStart) : body.slice(urlStart, newline);
  return { at, url: raw.trim() };
}

/** The decoy: `sourceMappingURL` as an identifier, AFTER a real announcement. */
const DECOY_AFTER_REAL =
  `${MARKER_HASH}${INLINE_URL}\n` + 'var sourceMappingURL = "decoy";\n';

const DIFFERENTIAL_BODIES: readonly [string, string][] = [
  ["empty", ""],
  ["no marker", "var a = 1;\n"],
  ["marker at EOF, no newline", `var a=1;\n${MARKER_HASH}${INLINE_URL}`],
  ["marker with trailing newline", `${MARKER_HASH}${INLINE_URL}\n`],
  ["legacy spelling only", `${MARKER_AT}${INLINE_URL}\n`],
  ["both spellings, current later", `${MARKER_AT}a.map\n${MARKER_HASH}b.map`],
  ["both spellings, legacy later", `${MARKER_HASH}a.map\n${MARKER_AT}b.map`],
  [
    "three announcements",
    `${MARKER_HASH}a\n${MARKER_HASH}b\n${MARKER_HASH}c\n`,
  ],
  ["empty URL", `${MARKER_HASH}`],
  ["DECOY AFTER A REAL ANNOUNCEMENT — the fallback path", DECOY_AFTER_REAL],
  ["decoy only", 'var sourceMappingURL = "decoy";\n'],
  ["the substring with no marker at all", "sourceMappingURL"],
  ["the substring at offset 0", "sourceMappingURL=x"],
  ["a truncated marker", `//# sourceMappingURL${INLINE_URL}`],
  ["marker inside a string literal", `var s = "${MARKER_HASH}x";\n`],
];

describe("the prefilter fast path equals the two-full-scan reference", () => {
  it.each(DIFFERENTIAL_BODIES)("%s", (_name, body) => {
    for (const windowBytes of [0, 1, 21, 64, SOURCEMAP_TAIL_WINDOW_BYTES]) {
      expect(
        findAnnouncement(body, windowBytes),
        `the prefilter and the naive two-scan reference disagree at windowBytes=${windowBytes}. ` +
          "The fast path returns without running either full marker search, so a " +
          "divergence here is a missed or misplaced announcement in production and " +
          "nothing anywhere would say so.",
      ).toEqual(naiveFindAnnouncement(body, windowBytes));
    }
  });

  it("the FALLBACK path is actually taken by that fixture, not merely present", () => {
    // Without this, every row above could be passing through the fast path and
    // the two full marker searches would be unexecuted code the differential
    // silently agrees with.
    const last = DECOY_AFTER_REAL.lastIndexOf("sourceMappingURL");
    const candidate = last - 4;
    expect(MARKERS.some((m) => DECOY_AFTER_REAL.startsWith(m, candidate))).toBe(
      false,
    );
    // And it still finds the real announcement, at offset 0.
    expect(
      findAnnouncement(DECOY_AFTER_REAL, SOURCEMAP_TAIL_WINDOW_BYTES)?.at,
    ).toBe(0);
  });

  it("a decoy with NO real announcement returns null through the fallback", () => {
    expect(
      findAnnouncement(
        'var sourceMappingURL = "decoy";\n',
        SOURCEMAP_TAIL_WINDOW_BYTES,
      ),
    ).toBeNull();
  });
});
