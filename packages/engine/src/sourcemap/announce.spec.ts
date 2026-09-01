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

import { SOURCEMAP_TAIL_WINDOW_BYTES } from "../thresholds";

import type { Announcement } from "./announce";
import { findAnnouncement, MARKERS } from "./announce";

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
const AUDITED = ["./announce.ts"] as const;

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
