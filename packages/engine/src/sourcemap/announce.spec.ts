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

import {
  ANNOUNCEMENT_PREFIX_MAX,
  MAP_MAX_BYTES,
  SOURCEMAP_TAIL_WINDOW_BYTES,
} from "../thresholds";

import type { Announcement } from "./announce";
import { findAnnouncement, MARKERS } from "./announce";
import { decodeInlineMap, encodedCeiling } from "./parse";

/** The current spelling, and the legacy one. Read off the module, never retyped. */
const [MARKER_HASH, MARKER_AT] = MARKERS;

/** A short, obviously-inline announcement URL. The payload is not the subject here. */
const INLINE_URL = "data:application/json;base64,e30=";

/** This spec's own path, for the literal-control-byte scan below. */
const THIS_FILE = fileURLToPath(import.meta.url);

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
// THE URL IS BOUNDED, NOT MERELY TERMINATED — LO-01
// ===========================================================================
// A body with no line terminator after the marker used to hand back a URL that
// ran to END OF FILE. On an 8 MiB single-line body that is a full-length copy of
// target-controlled bytes on the QuickJS thread, made so that `decodeInlineMap`
// can then refuse it with a comparison — the expensive half done first, for the
// cheap half's benefit (07-REVIEW.md LO-01, T-07-58).
//
// THE BOUND IS NOT A NEW NUMBER. `SOURCEMAP_TAIL_WINDOW_BYTES` is already
// `ceil(MAP_MAX_BYTES * 4/3) + ANNOUNCEMENT_PREFIX_MAX` — the width of the window
// this scan reads — and it is comfortably above the longest URL this build can
// accept: a 43-byte `data:` prefix plus `encodedCeiling(MAP_MAX_BYTES)`. So
// cutting there costs nothing that was reachable.

/** The longest announcement URL that could still decode to a map this build accepts. */
const LONGEST_ACCEPTABLE_URL =
  ANNOUNCEMENT_PREFIX_MAX + encodedCeiling(MAP_MAX_BYTES);

describe("the URL is BOUNDED even when nothing terminates the line", () => {
  it("the bound is above the longest URL that could decode — nothing reachable is cut", () => {
    // Stated first, because a bound BELOW a legal URL would silently lose maps
    // and every case after this would still pass.
    const longestLegal =
      "data:application/json;charset=utf-8;base64,".length +
      encodedCeiling(MAP_MAX_BYTES);
    expect(SOURCEMAP_TAIL_WINDOW_BYTES).toBeGreaterThan(longestLegal);
    expect(SOURCEMAP_TAIL_WINDOW_BYTES).toBeLessThanOrEqual(
      LONGEST_ACCEPTABLE_URL,
    );
  });

  it("a body with NO terminator after the marker does not run to EOF", () => {
    // The window is passed as `body.length` on purpose: the window is what makes
    // an announcement FINDABLE and is not what bounds the URL. Without that
    // distinction this case could pass by the announcement falling out of the
    // window, which proves nothing about the slice.
    const oversizedPayload = "A".repeat(LONGEST_ACCEPTABLE_URL + 4096);
    const body = `${MARKER_HASH}data:application/json;base64,${oversizedPayload}`;
    const found = findAnnouncement(body, body.length);
    expect(found).not.toBeNull();
    expect(
      found?.url.length ?? 0,
      `the announcement URL came back ${found?.url.length ?? 0} characters long ` +
        `against a bound of ${LONGEST_ACCEPTABLE_URL}. A URL longer than that ` +
        `cannot decode to a map this build accepts, so every character past it is ` +
        `a copy of target-controlled bytes made on the proxy thread for a refusal ` +
        `that is arithmetic (07-REVIEW.md LO-01).`,
    ).toBeLessThanOrEqual(LONGEST_ACCEPTABLE_URL);
  });

  it("and what comes back is still REFUSED — the cut loses nothing that decoded", () => {
    const oversizedPayload = "A".repeat(LONGEST_ACCEPTABLE_URL + 4096);
    const body = `${MARKER_HASH}data:application/json;base64,${oversizedPayload}`;
    const found = findAnnouncement(body, body.length);
    const result = decodeInlineMap(found?.url ?? "", MAP_MAX_BYTES);
    expect(result.kind).toBe("refused");
    if (result.kind === "refused") expect(result.reason).toBe("too_large");
  });

  it("a SHORT body is untouched by the bound — byte-identical to the shipped answer", () => {
    // The control. Without it "bounded" could just as well mean "truncated", and
    // every ordinary announcement in the corpus is a few dozen bytes long.
    const body = `console.log(1);\n${MARKER_HASH}${INLINE_URL}`;
    expect(findAnnouncement(body, SOURCEMAP_TAIL_WINDOW_BYTES)?.url).toBe(
      INLINE_URL,
    );
  });
});

// ===========================================================================
// FOUR LINE TERMINATORS, NOT ONE — LO-02
// ===========================================================================
// The scan used to look for `\n` and nothing else, so a body delimited by a lone
// CR, a LINE SEPARATOR or a PARAGRAPH SEPARATOR let the `data:` URL absorb the
// rest of the file. ECMASCRIPT TREATS ALL FOUR AS LINE TERMINATORS — a bundler
// can and does emit U+2028 and U+2029, and `String.trim()` removes them only at
// the ENDS of a string, never in the middle — so "runs to end-of-line" meant one
// of four different things depending on how the target spelled its line endings.
//
// CONTAINED BEFORE THE FIX AND SAID SO PLAINLY: `isCanonicalBase64` refused the
// absorbed payload, so this was an UNBOUNDED SLICE rather than an unsound parse.
// It is what made LO-01's copy unbounded, which is why the two land together.
//
// EVERY CONTROL CHARACTER BELOW IS AN ESCAPE SEQUENCE. `map-fixture.ts` states
// that rule in its own header and this phase already had to re-spell three
// literal NUL bytes because of finding W-2 — a literal separator is invisible in
// every diff and every review tool, and these cases are entirely about characters
// that are invisible.

/** The four line terminators ECMAScript recognises, each written as an escape. */
const LINE_TERMINATOR_CASES: readonly (readonly [string, string])[] = [
  ["LINE FEED U+000A", "\n"],
  ["CARRIAGE RETURN U+000D", "\r"],
  ["LINE SEPARATOR U+2028", "\u2028"],
  ["PARAGRAPH SEPARATOR U+2029", "\u2029"],
];

describe.each(LINE_TERMINATOR_CASES)(
  "the URL ends at %s",
  (name, terminator) => {
    it("returns exactly the payload, with nothing after the separator", () => {
      const body =
        `console.log(1);\n${MARKER_HASH}${INLINE_URL}` +
        `${terminator}var next = 2;\n`;
      const found = findAnnouncement(body, SOURCEMAP_TAIL_WINDOW_BYTES);
      expect(found).not.toBeNull();
      expect(
        found?.url,
        `${name} did not end the announcement URL, so the code after it was ` +
          `absorbed into the \`data:\` payload. ECMAScript recognises all four as ` +
          `line terminators and \`String.trim()\` only strips them at the ends — so ` +
          `a body delimited this way hands \`decodeInlineMap\` a URL that runs to ` +
          `the next \\n or to EOF (07-REVIEW.md LO-02).`,
      ).toBe(INLINE_URL);
      expect(found?.url).not.toContain("var next");
    });

    it("and the payload still decodes — the cut is at the separator, not before it", () => {
      // The control for the case above. Without it "ends at the separator" could
      // just as well be "ends one character early", and a payload short by one
      // base64 character is refused rather than decoded.
      const body = `${MARKER_HASH}${INLINE_URL}${terminator}var next = 2;\n`;
      const found = findAnnouncement(body, SOURCEMAP_TAIL_WINDOW_BYTES);
      const result = decodeInlineMap(found?.url ?? "", MAP_MAX_BYTES);
      expect(result.kind).toBe("inline");
      if (result.kind === "inline") expect(result.json).toBe("{}");
    });
  },
);

describe("the terminators that were already right stay right", () => {
  it("CRLF still behaves exactly as it does today — the \\r never enters the URL", () => {
    // Pinned rather than assumed. The shipped code got this right by TRIMMING a
    // carriage return that had already been sliced into the URL; the scan now
    // stops at the CR itself. Both spellings produce the same string, and this
    // case exists so a future edit cannot change which one is true silently.
    const body = `${MARKER_HASH}app.js.map\r\nconsole.log(1);\n`;
    const found = findAnnouncement(body, SOURCEMAP_TAIL_WINDOW_BYTES);
    expect(found?.url).toBe("app.js.map");
    expect(found?.url).not.toContain("\r");
  });

  it("a body whose ONLY terminator is \\n gives the byte-identical shipped answer", () => {
    const body = `console.log(1);\n${MARKER_HASH}${INLINE_URL}\nvar next = 2;\n`;
    expect(findAnnouncement(body, SOURCEMAP_TAIL_WINDOW_BYTES)?.url).toBe(
      INLINE_URL,
    );
  });

  it("the FIRST terminator wins when several follow the marker", () => {
    // The minimum across the four `indexOf` calls is the whole algorithm, and
    // this is the case that distinguishes "smallest offset" from "whichever one
    // the loop happened to check last".
    const body = `${MARKER_HASH}${INLINE_URL}\u2028x\ry\nz`;
    expect(findAnnouncement(body, SOURCEMAP_TAIL_WINDOW_BYTES)?.url).toBe(
      INLINE_URL,
    );
  });
});

describe("this file writes every adversarial character as an ESCAPE", () => {
  it("contains no literal C0 or C1 control byte and no literal U+2028 / U+2029", () => {
    // Finding W-2's class, asserted rather than remembered: three literal NUL
    // bytes shipped into this phase's fixtures and were re-spelled in f6cbf07.
    // A literal separator in a source file is invisible in every diff, every
    // review tool and every terminal — and it would ALSO break the file into two
    // lines for any tool that honours ECMAScript's own line-terminator set,
    // which is precisely the defect the cases above are about.
    const source = readFileSync(THIS_FILE, "utf8");
    const offenders: string[] = [];
    for (let i = 0; i < source.length; i += 1) {
      const code = source.charCodeAt(i);
      const permitted = code === 0x0a || code === 0x09;
      const isControl =
        (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) && !permitted;
      const isSeparator = code === 0x2028 || code === 0x2029;
      if (isControl || isSeparator) {
        offenders.push(
          `U+${code.toString(16).toUpperCase().padStart(4, "0")} at offset ${i}`,
        );
      }
    }
    expect(
      offenders,
      `these characters are written as LITERAL BYTES rather than as escape ` +
        `sequences: ${offenders.join(", ")}. Write them as \\r, \\u2028 and ` +
        `\\u2029 — a literal one is invisible in every diff and every review tool, ` +
        `and this suite is entirely about characters that are invisible ` +
        `(map-fixture.ts's header rule, 07-VERIFICATION.md W-2).`,
    ).toEqual([]);
    // Non-vacuity: the file really was read.
    expect(source.length).toBeGreaterThan(1000);
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

/**
 * The two-full-scan reference. Deliberately the slow, obvious implementation.
 *
 * ITS SUBJECT IS THE MARKER SEARCH, NOT THE URL SLICE, and its slice is
 * deliberately the pre-07-14 one: a single `indexOf("\n")` and no bound. Every
 * body in `DIFFERENTIAL_BODIES` is a few dozen characters long and terminated by
 * `\n` or by nothing, so the two slices agree on all of them by construction —
 * which is what keeps this an honest differential over the FAST PATH rather than
 * a second copy of the shipped implementation comparing itself to itself. A body
 * added below that carries a lone CR, a U+2028 or a U+2029, or one longer than
 * `URL_MAX`, is testing the SLICE and belongs in the terminator or bound cases
 * above instead.
 */
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
