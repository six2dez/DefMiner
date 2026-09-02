// packages/backend/src/sourcemap/derive.spec.ts — O-05's sibling vocabulary and
// D-14's derived entry point, proven the way the four vocabularies before it are.
//
// THE GATE THAT MATTERS IS THE EVERY-REASON-HAS-A-CASE ONE. It is MECHANICAL,
// against the closed array, and it is not a hand count: a fourth member added to
// `DERIVED_REJECT_REASONS` with no case fails immediately. `scan/filter.spec.ts`
// and `hooks/admit.spec.ts` both run this shape and the argument is identical —
// a reason with no test is a code plan 07-08 can render for a refusal nobody has
// ever reproduced, and a counter that reads zero for ever is indistinguishable
// from a thing that never happened.

import { MAP_MAX_BYTES } from "@defminer/engine/thresholds";
import { describe, expect, it } from "vitest";

import { REJECT_REASONS } from "../hooks/admit";

import {
  admitDerived,
  admitDerivedDepth,
  DERIVED_MAX_DEPTH,
  DERIVED_REJECT_REASONS,
  DERIVED_SOURCE_MAX_BYTES,
  type DerivedAdmitResult,
  type DerivedRejectReason,
} from "./derive";

/** One exercised outcome of the derived path. `reason: null` is an ADMISSION. */
type Case = {
  readonly name: string;
  readonly reason: DerivedRejectReason | null;
  readonly run: () => DerivedAdmitResult;
};

/** A source of exactly `byteLen` ASCII bytes, so `content.length === byteLen`. */
function ascii(byteLen: number): string {
  return "x".repeat(byteLen);
}

const CASES: readonly Case[] = [
  {
    name: "an ordinary recovered module is admitted",
    reason: null,
    run: () => admitDerived({ content: "export const a = 1;\n", byteLen: 20 }),
  },
  {
    name: "the empty string — a map declaring a file it did not ship",
    reason: "empty",
    run: () => admitDerived({ content: "", byteLen: 0 }),
  },
  {
    name: "a source over DERIVED_SOURCE_MAX_BYTES",
    reason: "too_large",
    run: () =>
      admitDerived({
        // The CONTENT is short and the BYTE LENGTH is the axis, deliberately:
        // allocating a 2.5 MiB string to assert a comparison would make the
        // suite slower to prove nothing extra. The units matter and the case
        // states which one the gate reads.
        content: "小",
        byteLen: DERIVED_SOURCE_MAX_BYTES + 1,
      }),
  },
  {
    name: "D-13's re-entry bound refuses a stage at depth 1",
    reason: "depth_exceeded",
    run: () => admitDerivedDepth(DERIVED_MAX_DEPTH),
  },
];

describe("every derived rejection reason has a case", () => {
  it("the table exercises exactly the members of DERIVED_REJECT_REASONS", () => {
    const exercised = new Set(
      CASES.map((c) => c.reason).filter(
        (r): r is DerivedRejectReason => r !== null,
      ),
    );
    const declared = new Set<DerivedRejectReason>(DERIVED_REJECT_REASONS);
    const untested = [...declared].filter((r) => !exercised.has(r));
    const stray = [...exercised].filter((r) => !declared.has(r));
    expect(
      untested,
      `these derived rejection reasons have no case in CASES: ${untested.join(", ")}. ` +
        `A reason with no test is a code plan 07-08 renders for a refusal nobody ` +
        `has ever reproduced.`,
    ).toEqual([]);
    expect(
      stray,
      `these cases assert a reason that is not declared: ${stray.join(", ")}.`,
    ).toEqual([]);
  });

  it("every case's asserted reason is actually produced", () => {
    // Guards the guard: the set comparison above still passes if a case's
    // `reason` field is aspirational and its `run()` returns something else.
    for (const c of CASES) {
      const result = c.run();
      if (c.reason === null) {
        expect(result.ok, c.name).toBe(true);
      } else {
        expect(result.ok, c.name).toBe(false);
        if (!result.ok) expect(result.reason, c.name).toBe(c.reason);
      }
    }
  });

  it("DERIVED_REJECT_REASONS is a closed, duplicate-free, frozen vocabulary", () => {
    expect([...DERIVED_REJECT_REASONS]).toEqual([
      "too_large",
      "empty",
      "depth_exceeded",
    ]);
    expect(
      new Set(DERIVED_REJECT_REASONS).size,
      "a duplicate derived rejection reason",
    ).toBe(DERIVED_REJECT_REASONS.length);
    expect(Object.isFrozen(DERIVED_REJECT_REASONS)).toBe(true);
  });
});

// ===========================================================================
// O-05 — TWO VOCABULARIES, TWO SHARED WORDS, AND WHY THAT IS CORRECT
// ===========================================================================

describe("the sibling vocabulary overlaps REJECT_REASONS and stays separate", () => {
  it("shares `too_large` and `empty` with admission — the collision, stated", () => {
    // ASSERTED RATHER THAN AVOIDED. This is the same situation
    // `packages/engine/src/contract.ts:88-120` documents for `running`, which is
    // a literal member of both SCAN_STATES and SCAN_LIFECYCLE_STATES. Two closed
    // vocabularies about DIFFERENT subjects may share a word; the four
    // mechanisms that file names are what keep them apart. Writing the overlap
    // down here is the first of them — adjacent declaration — made executable.
    const shared = DERIVED_REJECT_REASONS.filter((r) =>
      (REJECT_REASONS as readonly string[]).includes(r),
    );
    expect(shared).toEqual(["too_large", "empty"]);
  });

  it("is NOT a superset or a subset of REJECT_REASONS — they are siblings", () => {
    // The check that would catch a `DERIVED_REJECT_REASONS = REJECT_REASONS`
    // copy-paste, or the extension this file's header refuses.
    expect([...DERIVED_REJECT_REASONS].sort()).not.toEqual(
      [...REJECT_REASONS].sort(),
    );
    expect(
      (REJECT_REASONS as readonly string[]).includes("depth_exceeded"),
      "`depth_exceeded` reached REJECT_REASONS. Extending admission's union puts " +
        "a derived reason in the ADMISSION counters, forces a lying case in " +
        "admit.spec.ts's every-reason gate, and lands a member inside 06-11's " +
        "push-down superset proof that the proof says nothing about.",
    ).toBe(false);
  });
});

// ===========================================================================
// THE BOUNDS
// ===========================================================================

describe("DERIVED_SOURCE_MAX_BYTES states a relation, not a literal", () => {
  it("equals MAP_MAX_BYTES — a source cannot exceed the map that carried it", () => {
    // THE RELATION, NOT THE NUMBER. `MAP_MAX_BYTES` comes from the D-10 probe
    // and a re-run ladder moves it; a spec that restated 2,621,440 would keep
    // passing while the bound it describes drifted.
    expect(DERIVED_SOURCE_MAX_BYTES).toBe(MAP_MAX_BYTES);
  });

  it("admits at EXACTLY the ceiling and refuses one byte above", () => {
    // Both sides from one boundary, in `admit.spec.ts`'s idiom, so a `>=` / `>`
    // slip cannot pass by exercising only the side it gets right. The ceiling is
    // the largest source this path admits, not the smallest it refuses.
    expect(
      admitDerived({ content: "x", byteLen: DERIVED_SOURCE_MAX_BYTES }).ok,
    ).toBe(true);
    const over = admitDerived({
      content: "x",
      byteLen: DERIVED_SOURCE_MAX_BYTES + 1,
    });
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.reason).toBe("too_large");
  });

  it("reads BYTES and not UTF-16 code units", () => {
    // A source of characters outside the Basic Latin block is longer in bytes
    // than in code units. A gate reading `content.length` would admit a source
    // well over the ceiling in the units the ceiling was measured in — the same
    // trap `sourcemap/parse.ts` names at its own decoded-size gate.
    const cjk = "小".repeat(16);
    expect(cjk.length).toBe(16);
    expect(Buffer.byteLength(cjk, "utf8")).toBe(48);
    const refused = admitDerived({
      content: cjk,
      byteLen: DERIVED_SOURCE_MAX_BYTES + 1,
    });
    expect(
      refused.ok,
      "the gate read content.length rather than the byte length it was handed.",
    ).toBe(false);
  });

  it("names an empty source `empty` and never `too_large`", () => {
    // Emptiness is checked FIRST, and it is not a size decision: a map declaring
    // a file it did not ship is the commonest legal shape in the corpus, and
    // reporting it as the complement of a size bound would tell the operator the
    // wrong thing about the commonest case.
    const result = admitDerived({ content: "", byteLen: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("empty");
    expect(admitDerived({ content: ascii(1), byteLen: 0 }).ok).toBe(false);
  });
});

describe("DERIVED_MAX_DEPTH is one level with no re-entry (D-13)", () => {
  it("admits depth 0 and refuses depth 1", () => {
    expect(admitDerivedDepth(0).ok).toBe(true);
    const refused = admitDerivedDepth(1);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.reason).toBe("depth_exceeded");
  });

  it("refuses every depth at or above the bound, not just the boundary", () => {
    // `>=` rather than `===`. An equality would let a depth-2 stage through if
    // anything ever incremented by two, which is exactly the shape a bound must
    // not have: T-07-31 is unbounded work, and a bound with a gap is no bound.
    for (const depth of [DERIVED_MAX_DEPTH, DERIVED_MAX_DEPTH + 1, 99]) {
      expect(admitDerivedDepth(depth).ok, `depth ${depth}`).toBe(false);
    }
  });

  it("the bound is ONE, stated as the constant the stage reads", () => {
    expect(DERIVED_MAX_DEPTH).toBe(1);
  });
});
