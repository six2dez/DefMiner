// packages/backend/src/scan/filter.spec.ts — the operator-clause validator and
// the one composer (D-05, O-06, FIND-03, T-06-HTTPQL-INJ, T-06-19, T-06-22).
//
// ===========================================================================
// WHAT THIS FILE IS ACTUALLY ASSERTING, AND WHAT IT IS NOT
// ===========================================================================
// The operator's HTTPQL clause is the ONLY untrusted string in this codebase
// that reaches a query builder. Everything below is about the two independent
// defences that stand between it and `execute()`:
//
//   1. THE ORDER, which is the load-bearing one. DefMiner's clauses come first
//      and the operator's comes last, so a trailing `//` or an unterminated
//      `/*` can only reach the TRAILING parenthesis. The result is an
//      unbalanced expression and `execute()` "throws if a query parameter is
//      invalid" — it fails CLOSED. Placed first, the same input would comment
//      DefMiner's narrowing away and the scan would run WIDER than the operator
//      was shown, which is precisely what D-05 forbids.
//
//   2. THE VALIDATOR, which is a better error message and a cost bound, not the
//      thing that makes the order safe. It turns "your scan failed for a reason
//      Caido will not explain to you" into a named DefMiner-authored code the
//      start form can render, and it caps the one unbounded operator-authored
//      string on this path before it becomes a full-history body pull.
//
// Stating which defence is load-bearing matters, because a later reader
// deciding whether some edge in `validateOperatorClause` is a security hole
// needs to know the answer is "no — it is a worse error message". The hole
// would be in the ORDER.
//
// ===========================================================================
// THE HONEST LIMIT
// ===========================================================================
// Nothing here executes HTTPQL. Whether Caido's parser agrees with this file
// about what "balanced" means, whether `cont` is byte-wise or Unicode
// case-folded, and whether `req.path` strips the query the way `isScriptish`
// does are ALL UNMEASURED — 06-RESEARCH.md § O-03 says so and plan 06-11's
// fixture suite over `sdk.requests.matches()` is what settles them. These are
// assertions about DefMiner's own composition and refusal behaviour, and no
// assertion below should be read as if it proved something about Caido's
// parser.

import { SCAN_KIND_CLAUSE } from "@defminer/engine/contract";
import { EVIDENCE_PANEL_MAX_GRAPHEMES } from "@defminer/engine/sanitise";
import { describe, expect, it } from "vitest";

import type { OperatorClauseRejection } from "./filter";
import {
  composeScanFilter,
  OPERATOR_CLAUSE_MAX_CHARS,
  OPERATOR_CLAUSE_REJECTIONS,
  positionClause,
  validateOperatorClause,
} from "./filter";

/**
 * Top-level term count, by parenthesis depth.
 *
 * NOT `split(" AND ")`. `SCAN_KIND_CLAUSE` contains its own ` AND ` — the 2xx
 * bound is joined to the kind alternation — so a flat split reports four terms
 * for a two-term composition. The same helper exists in `scans.spec.ts` for the
 * same reason; it is repeated rather than shared because a test helper imported
 * across spec files is a dependency between tests, and the correction it
 * encodes is worth restating where it is used.
 */
function topLevelTerms(composed: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < composed.length; i += 1) {
    const ch = composed[i];
    if (ch === "(") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === ")") {
      depth -= 1;
      if (depth === 0) out.push(composed.slice(start, i + 1));
    }
  }
  return out;
}

/** Does every parenthesis in `s` close, counting outside quoted strings? */
function balanced(s: string): boolean {
  let depth = 0;
  let inString = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (inString) {
      if (ch === "\\") i += 1;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

// ---------------------------------------------------------------------------
// THE CASE TABLE — the shape `admit.spec.ts` uses for `REJECT_REASONS`.
// ---------------------------------------------------------------------------
//
// One table, read by the per-case assertions AND by the closed-set gate below,
// so a fifth rejection reason added to `OPERATOR_CLAUSE_REJECTIONS` with no case
// fails immediately. A reason with no test is a code the UI can render and
// nobody has ever seen produced, which is indistinguishable from a reason that
// never fires.

type Case = {
  readonly name: string;
  readonly clause: string;
  /** `null` means the clause is ACCEPTED. */
  readonly reason: OperatorClauseRejection | null;
};

const CASES: readonly Case[] = [
  // --- accepted -----------------------------------------------------------
  {
    name: "an EMPTY clause is a valid, complete input — not an empty one",
    clause: "",
    reason: null,
  },
  {
    name: "an ordinary host clause",
    clause: 'req.host.eq:"a.example"',
    reason: null,
  },
  {
    name: "a clause whose own parentheses balance",
    clause: '(req.host.eq:"a.example" OR req.host.eq:"b.example")',
    reason: null,
  },
  {
    name: "parentheses INSIDE a double-quoted string are text, not structure",
    clause: 'req.path.cont:"(("',
    reason: null,
  },
  {
    name: "an escaped quote does not end the string early",
    clause: 'req.path.cont:"a\\"((b"',
    reason: null,
  },
  {
    name: "a clause of EXACTLY the cap is accepted",
    clause: `req.path.cont:"${"a".repeat(OPERATOR_CLAUSE_MAX_CHARS - 'req.path.cont:""'.length)}"`,
    reason: null,
  },

  // --- comment_construct ---------------------------------------------------
  {
    name: "a trailing line comment",
    clause: 'req.host.eq:"a.example" //',
    reason: "comment_construct",
  },
  {
    name: "an UNTERMINATED block comment",
    clause: 'req.host.eq:"a.example" /* x',
    reason: "comment_construct",
  },
  {
    name: "a stray block-comment TERMINATOR",
    clause: 'req.host.eq:"a.example" */',
    reason: "comment_construct",
  },

  // --- unbalanced_parentheses ---------------------------------------------
  {
    name: "an unclosed opening parenthesis",
    clause: '(req.host.eq:"a.example"',
    reason: "unbalanced_parentheses",
  },
  {
    name: "a closing parenthesis with nothing open — refused at the point it goes negative",
    clause: 'req.host.eq:"a.example")',
    reason: "unbalanced_parentheses",
  },
  {
    name: "the SAME characters outside quotes that are legal inside them",
    clause: "req.path.cont:((",
    reason: "unbalanced_parentheses",
  },

  // --- whitespace_only -----------------------------------------------------
  {
    name: "spaces only — refused rather than normalised to absent",
    clause: "   ",
    reason: "whitespace_only",
  },
  {
    name: "a tab and a newline are whitespace too",
    clause: "\t\n",
    reason: "whitespace_only",
  },

  // --- too_long ------------------------------------------------------------
  {
    name: "one character over the cap",
    clause: "a".repeat(OPERATOR_CLAUSE_MAX_CHARS + 1),
    reason: "too_long",
  },
];

describe("validateOperatorClause — the one place operator input meets a query language", () => {
  it.each(CASES.map((c) => [c.name, c] as const))("%s", (_name, c) => {
    const verdict = validateOperatorClause(c.clause);
    if (c.reason === null) {
      expect(
        verdict,
        `expected ${JSON.stringify(c.clause.slice(0, 60))} to be ACCEPTED`,
      ).toEqual({
        ok: true,
      });
    } else {
      expect(
        verdict,
        `expected ${JSON.stringify(c.clause.slice(0, 60))} to be REFUSED`,
      ).toEqual({
        ok: false,
        reason: c.reason,
      });
    }
  });

  it("accepts a clause of EXACTLY the cap and refuses the next character", () => {
    // The boundary asserted against the CONSTANT rather than against a literal,
    // so retuning the cap does not silently retune this case with it.
    expect(
      validateOperatorClause("a".repeat(OPERATOR_CLAUSE_MAX_CHARS)),
    ).toEqual({ ok: true });
    expect(
      validateOperatorClause("a".repeat(OPERATOR_CLAUSE_MAX_CHARS + 1)),
    ).toEqual({
      ok: false,
      reason: "too_long",
    });
  });

  it("refuses EVERY comment grammar the reference names, anywhere in the clause", () => {
    for (const marker of ["//", "/*", "*/"]) {
      expect(
        validateOperatorClause(`${marker} req.host.eq:"a"`),
        `leading ${marker}`,
      ).toEqual({
        ok: false,
        reason: "comment_construct",
      });
      expect(
        validateOperatorClause(`req.host.eq:"a" ${marker} more`),
        `interior ${marker}`,
      ).toEqual({
        ok: false,
        reason: "comment_construct",
      });
    }
  });
});

describe("every rejection reason has a case", () => {
  it("the table exercises exactly the members of OPERATOR_CLAUSE_REJECTIONS", () => {
    // Mechanical, against the closed array — not a hand count of the cases
    // above. `admit.spec.ts` does this for `REJECT_REASONS` and the argument is
    // identical: a reason with no case is a code the start form can render and
    // that nobody has ever seen produced.
    const exercised = new Set(
      CASES.map((c) => c.reason).filter(
        (r): r is OperatorClauseRejection => r !== null,
      ),
    );
    const declared = new Set<OperatorClauseRejection>(
      OPERATOR_CLAUSE_REJECTIONS,
    );
    const untested = [...declared].filter((r) => !exercised.has(r));
    const stray = [...exercised].filter((r) => !declared.has(r));
    expect(
      untested,
      `these rejection reasons have no case in CASES: ${untested.join(", ")}. ` +
        `A reason with no test is copy the operator can be shown for a refusal ` +
        `nobody has ever reproduced.`,
    ).toEqual([]);
    expect(
      stray,
      `these cases assert a reason that is not declared: ${stray.join(", ")}.`,
    ).toEqual([]);
  });

  it("OPERATOR_CLAUSE_REJECTIONS is a closed, duplicate-free vocabulary", () => {
    expect([...OPERATOR_CLAUSE_REJECTIONS]).toEqual([
      "comment_construct",
      "unbalanced_parentheses",
      "whitespace_only",
      "too_long",
    ]);
    expect(
      new Set(OPERATOR_CLAUSE_REJECTIONS).size,
      "a duplicate rejection reason",
    ).toBe(OPERATOR_CLAUSE_REJECTIONS.length);
    expect(Object.isFrozen(OPERATOR_CLAUSE_REJECTIONS)).toBe(true);
  });
});

describe("the cap is the number the operator's own clause renders within", () => {
  it("OPERATOR_CLAUSE_MAX_CHARS matches the evidence-panel display cap", () => {
    // ASSERTED, NOT IMPORTED. `filter.ts` does not import the sanitiser: the cap
    // is a COST bound (T-06-19) that happens to coincide with a DISPLAY bound,
    // and coupling the backend's query path to the frontend's rendering module
    // would make one a dependency of the other for a relationship that is
    // better stated than enforced by an import. Stated HERE so drift is loud.
    //
    // The units differ and the difference errs in the safe direction:
    // `String.length` counts UTF-16 code units and the display cap counts
    // GRAPHEMES, and a grapheme is never fewer than one code unit — so a clause
    // within this cap is always within the panel's cap, and the operator is
    // never shown a TRUNCATED version of the one string they have to check.
    expect(OPERATOR_CLAUSE_MAX_CHARS).toBe(EVIDENCE_PANEL_MAX_GRAPHEMES);
  });
});

describe("composeScanFilter — the ONE producer of a scan filter string", () => {
  it("omits an absent operator clause rather than emitting an empty parenthesis pair", () => {
    const composed = composeScanFilter("", "");
    expect(composed).toBe(`(${SCAN_KIND_CLAUSE})`);
    expect(composed).not.toContain("()");
    expect(
      balanced(composed),
      "the composition's parentheses do not return to depth zero",
    ).toBe(true);
    expect(topLevelTerms(composed)).toHaveLength(1);
  });

  it("puts the OPERATOR's clause LAST, and that order is the mitigation", () => {
    const composed = composeScanFilter(
      positionClause("9001"),
      'req.host.eq:"a.example"',
    );
    expect(composed).toBe(
      `(${SCAN_KIND_CLAUSE}) AND (row.id.lt:9001) AND (req.host.eq:"a.example")`,
    );
    const terms = topLevelTerms(composed);
    expect(terms).toHaveLength(3);
    expect(terms[0]).toBe(`(${SCAN_KIND_CLAUSE})`);
    expect(terms[terms.length - 1]).toBe('(req.host.eq:"a.example")');
  });

  it("parenthesises EVERY clause, so the meaning survives either precedence reading", () => {
    // Caido's reference says AND and OR have "the same priority" in one box and
    // works two examples in which AND binds tighter two paragraphs below. This
    // assertion is what makes DefMiner independent of which one is true.
    for (const [position, operator] of [
      ["", ""],
      ["row.id.lt:1", ""],
      ["", 'req.host.eq:"a"'],
      ["row.id.lt:1", 'req.host.eq:"a"'],
    ] as const) {
      const composed = composeScanFilter(position, operator);
      for (const term of topLevelTerms(composed)) {
        expect(term.startsWith("("), `${term} is not parenthesised`).toBe(true);
        expect(term.endsWith(")"), `${term} is not parenthesised`).toBe(true);
      }
      expect(composed).not.toContain("()");
      expect(balanced(composed)).toBe(true);
      expect(composed.startsWith(`(${SCAN_KIND_CLAUSE})`)).toBe(true);
    }
  });

  it("REFUSES to emit a clause that would not have passed the validator", () => {
    // DEFENCE IN DEPTH, and the direction it fails in is the whole point. The
    // composer re-runs the validator and OMITS a clause that does not pass, so
    // an unvalidated operator string cannot reach the wire even if a future
    // caller forgets to validate. Omitting NARROWS to DefMiner's own clause; it
    // can never widen. See the composer's own comment for why it omits rather
    // than throws.
    for (const bad of [
      'req.host.eq:"a" //',
      '(req.host.eq:"a"',
      "   ",
      "a".repeat(OPERATOR_CLAUSE_MAX_CHARS + 1),
    ]) {
      const composed = composeScanFilter("row.id.lt:7", bad);
      expect(
        composed,
        `${JSON.stringify(bad.slice(0, 40))} reached the composed filter`,
      ).toBe(`(${SCAN_KIND_CLAUSE}) AND (row.id.lt:7)`);
      expect(composed).not.toContain("//");
      expect(balanced(composed)).toBe(true);
    }
  });
});

describe("the kind clause stays on the case-FOLDING like family", () => {
  it("contains no `req.ext.eq` and no eq operator on a path or extension field", () => {
    // `req.ext.eq` is documented CASE SENSITIVE while `isScriptish` lowercases
    // before its suffix test, so that one term would miss `/APP.JS` — which
    // `admit()` accepts — and break the superset relation the push-down needs.
    expect(SCAN_KIND_CLAUSE).not.toContain("req.ext");
    expect(SCAN_KIND_CLAUSE).not.toContain("req.path.eq");
    expect(SCAN_KIND_CLAUSE).not.toContain(".eq:");
  });

  it("uses no `cont` term — the reference says insensitive, 0.58.2 is not", () => {
    // MEASURED, not read. Plan 06-11 put the `cont` clause in front of Caido's
    // own evaluator through `sdk.requests.matches()` and it returned FALSE for
    // `/F02-UPPER.JS` and for `Content-Type: TEXT/JAVASCRIPT` — two responses
    // `isScriptish` accepts. `.planning/phases/06-retroactive-scan-deployment-
    // reality/results/pushdown-superset.json` is the transcript, and
    // `tests/phase6-pushdown.spec.ts` is the standing gate. This line is the
    // in-package tripwire that stops `cont` returning on the documentation's
    // word.
    expect(SCAN_KIND_CLAUSE).not.toContain(".cont:");
  });

  it("covers BOTH extensions, because `.mjs` does not contain `.js`", () => {
    expect(SCAN_KIND_CLAUSE).toContain('req.path.like:"%.js%"');
    expect(SCAN_KIND_CLAUSE).toContain('req.path.like:"%.mjs%"');
    expect(".mjs".includes(".js"), "the premise of the second term").toBe(
      false,
    );
  });

  it("carries the five media-type substrings that cover all seventeen essences", () => {
    for (const substring of [
      "javascript",
      "ecmascript",
      "jscript",
      "livescript",
      "text/js",
    ]) {
      expect(SCAN_KIND_CLAUSE).toContain(`resp.raw.like:"%${substring}%"`);
    }
  });

  it("needs no LIKE escape clause — no needle contains `%` or `_`", () => {
    // `%` and `_` are LIKE wildcards. Every one that appears in the clause is a
    // wildcard DefMiner put there; a needle containing either would silently
    // widen the term, so the premise is asserted rather than assumed.
    for (const needle of [
      ".js",
      ".mjs",
      "javascript",
      "ecmascript",
      "jscript",
      "livescript",
      "text/js",
    ]) {
      expect(needle.includes("%") || needle.includes("_")).toBe(false);
    }
  });

  it("carries no HTTPQL comment grammar of its own", () => {
    for (const marker of ["//", "/*", "*/"]) {
      expect(SCAN_KIND_CLAUSE).not.toContain(marker);
    }
  });
});

describe("positionClause", () => {
  it("is empty on a first page, so the term is omitted rather than emitted empty", () => {
    expect(positionClause("")).toBe("");
    expect(composeScanFilter(positionClause(""), "")).not.toContain("()");
  });

  it("is `lt` and never `lte`", () => {
    // `lte` would re-walk the boundary request as the first item of every
    // subsequent page, once per page, for the whole backfill.
    expect(positionClause("9001")).toBe("row.id.lt:9001");
    expect(positionClause("9001")).not.toContain("lte");
  });
});
