// packages/engine/src/contract.spec.ts — a type-only module, held to the
// things that can actually DRIFT.
//
// There is no behaviour here to test: contract.ts declares types, two `as
// const` vocabularies and one derived predicate. Writing a suite that asserts
// a type exists would be a suite that cannot fail. So this file asserts the
// four properties that CAN change silently and would each break a consumer in
// a different package:
//
//   MEMBERSHIP AND ORDER of the two closed vocabularies. A member added,
//   removed or reordered is a wire-format change for Phase 3 and Phase 4.
//
//   CASING. `TRIAGE_STATES` matches the snake_case style of the shipped
//   `SCAN_STATES`. A `falsePositive` slipped in beside `false_positive` would
//   typecheck, render, and produce two grains of the same triage state.
//
//   THE ABSENCE OF SPECULATION. `INVALIDATION_CATEGORIES` must hold the three
//   SHIPPED table categories and nothing entity-shaped. `entities` and
//   `evidence` do not exist; a category named for one of them is the schema
//   invention D-05(2) forbids, arriving through the back door.
//
//   EXHAUSTIVENESS, at COMPILE time. `isOperatorDecided`'s `never` fallthrough
//   and the mandatory-field record below both fail `tsc`, not vitest, when the
//   thing they cover grows a member. They are asserted here anyway so the
//   mechanism is visible to a reader of the suite rather than only to the
//   compiler.
//
// EVERY EXPORTED TYPE IS IMPORTED BELOW AND GIVEN A CONFORMING VALUE. That is
// deliberate on two counts: knip runs with `ignoreExportsUsedInFile: false`
// and `types: error`, so an unconsumed exported type is a gate failure rather
// than dead weight nobody notices; and a literal that conforms is the cheapest
// possible check that the frame is actually constructible by the phases that
// have to construct it.

import { describe, expect, it } from "vitest";

import {
  EVIDENCE_PANEL_MANDATORY_FIELDS,
  INVALIDATION_CATEGORIES,
  INVALIDATION_EVENT,
  isOperatorDecided,
  TRIAGE_STATES,
} from "./contract";
import type {
  EntityLead,
  EntityRowBase,
  EvidencePanelFrame,
  InvalidationCategory,
  InvalidationSummary,
  PageCursor,
  PageRequest,
  PageResponse,
  ScoreExplanation,
  ScoreSignal,
  TriageState,
  VisibleTotal,
} from "./contract";

describe("TRIAGE_STATES — the closed triage vocabulary (OPS-01)", () => {
  it("holds exactly the four states 05-UI-SPEC.md fixes, in that order", () => {
    // ORDER, not membership. The UI-SPEC writes them
    // `new · reviewed · false_positive · accepted`, and the order is the
    // lifecycle: born, looked at, judged. A set comparison would pass on a
    // reordering that changes what a badge column renders left to right.
    expect(TRIAGE_STATES).toEqual([
      "new",
      "reviewed",
      "false_positive",
      "accepted",
    ]);
  });

  it("is snake_case throughout, like the shipped SCAN_STATES", () => {
    // `false_positive` is the one member with a word boundary in it and the
    // one that could plausibly arrive as `falsePositive`. Asserting over the
    // whole list rather than that one member means a fifth member added later
    // inherits the rule without anyone remembering to extend the test.
    for (const state of TRIAGE_STATES) {
      expect(state, `${state} is not snake_case`).not.toMatch(/[A-Z]/);
      expect(state, `${state} is not snake_case`).toMatch(/^[a-z]+(_[a-z]+)*$/);
    }
  });

  it("has no duplicate members", () => {
    expect(new Set(TRIAGE_STATES).size).toBe(TRIAGE_STATES.length);
  });
});

describe("isOperatorDecided — the derived predicate over that vocabulary", () => {
  it("treats `new` as the absence of a decision and the other three as decisions", () => {
    expect(isOperatorDecided("new")).toBe(false);
    expect(isOperatorDecided("reviewed")).toBe(true);
    expect(isOperatorDecided("false_positive")).toBe(true);
    expect(isOperatorDecided("accepted")).toBe(true);
  });

  it("answers for every member of TRIAGE_STATES — no member is unhandled", () => {
    // NON-VACUITY. Iterating the vocabulary rather than four literals means a
    // fifth member reaches this loop, and the `never` fallthrough in
    // contract.ts has already failed the typecheck by then. If someone
    // silences that, this still executes the new member rather than skipping
    // it.
    expect(TRIAGE_STATES.length).toBeGreaterThan(0);
    for (const state of TRIAGE_STATES) {
      expect(typeof isOperatorDecided(state)).toBe("boolean");
    }
  });
});

describe("INVALIDATION_CATEGORIES — what this phase actually emits (UI-07)", () => {
  it("holds exactly the three SHIPPED table categories", () => {
    expect(INVALIDATION_CATEGORIES).toEqual([
      "artifacts",
      "observations",
      "analyses",
    ]);
    expect(INVALIDATION_CATEGORIES).toHaveLength(3);
  });

  it("names nothing entity-shaped — those tables do not exist", () => {
    // The guard against the failure mode this whole plan exists to prevent: a
    // category invented for a table Phase 4 has not defined. `EXPECTED_TABLES`
    // in schema.spec.ts is the exact set
    // ["analyses", "artifacts", "observations", "settings"], and a category
    // outside it is a claim about a table that is not there.
    const shipped = ["analyses", "artifacts", "observations", "settings"];
    for (const category of INVALIDATION_CATEGORIES) {
      expect(
        shipped,
        `${category} is not a shipped table; entity categories are appended by the phase that adds the table`,
      ).toContain(category);
    }
  });

  it("has no duplicate members", () => {
    expect(new Set(INVALIDATION_CATEGORIES).size).toBe(
      INVALIDATION_CATEGORIES.length,
    );
  });
});

describe("INVALIDATION_EVENT — the one event name, defined once", () => {
  it("is a non-empty, namespaced string", () => {
    expect(typeof INVALIDATION_EVENT).toBe("string");
    expect(INVALIDATION_EVENT.length).toBeGreaterThan(0);
    // Namespaced so it cannot collide with another plugin's event on a shared
    // bus. The emitter (plan 05-07) and the subscriber (plan 05-08) both read
    // this constant; neither restates the string.
    expect(INVALIDATION_EVENT).toMatch(/^defminer:/);
  });
});

describe("EVIDENCE_PANEL_MANDATORY_FIELDS — checker FLAG F1's answer", () => {
  it("names all five mandatory fields and nothing else", () => {
    expect(EVIDENCE_PANEL_MANDATORY_FIELDS).toEqual([
      "sourceRequest",
      "artifactVersion",
      "byteRange",
      "snippet",
      "scoreExplanation",
    ]);
  });

  it("covers every field of EvidencePanelFrame — the list cannot fall behind the type", () => {
    // THE OTHER HALF OF THE `satisfies` IN contract.ts. `satisfies` proves no
    // member of the list is a non-field; this record proves no field is a
    // non-member, because a sixth mandatory field added to the frame makes
    // this object literal a typecheck error until it is listed here AND in the
    // constant. Between the two, the list and the type cannot drift apart.
    const everyField: Record<keyof EvidencePanelFrame, true> = {
      sourceRequest: true,
      artifactVersion: true,
      byteRange: true,
      snippet: true,
      scoreExplanation: true,
    };
    expect(Object.keys(everyField).sort()).toEqual(
      [...EVIDENCE_PANEL_MANDATORY_FIELDS].sort(),
    );
  });
});

describe("the published shapes are constructible by the phases that must build them", () => {
  // These are conformance literals, not behaviour tests. Each one is a Phase 3
  // or Phase 4 author writing the smallest value their table has to hand the
  // workspace. If a required field is missing, ambiguous, or typed in a way
  // that cannot be satisfied without inventing a schema, it fails here at
  // authoring time rather than in their phase.

  it("EntityRowBase carries the four columns, with exactly one target-controlled", () => {
    const stateLead: EntityLead = { kind: "state", state: "done" };
    const scoreLead: EntityLead = { kind: "score", score: 87, tier: "high" };

    const row: EntityRowBase = {
      lead: scoreLead,
      // The ONE target-controlled field on this type. R1 and R2 apply to it
      // and to no other field here.
      value: "AKIA…REDACTED",
      lastSeenAt: 1_787_000_000_000,
      triage: "new",
    };

    expect(row.lead).toBe(scoreLead);
    expect(stateLead.kind).toBe("state");
    expect(TRIAGE_STATES).toContain(row.triage);
    expect(typeof row.lastSeenAt).toBe("number");
  });

  it("PageRequest permits at most one column filter, by construction", () => {
    const cursor: PageCursor = { sortValue: 1_787_000_000_000, tieBreak: "a" };

    const firstPage: PageRequest = {
      projectId: "p1",
      sortKey: "lastSeenAt",
      direction: "desc",
      filter: null,
      cursor: null,
      limit: 100,
    };
    const nextPage: PageRequest = {
      ...firstPage,
      filter: { column: "kind", value: "script" },
      cursor,
    };

    expect(firstPage.cursor).toBeNull();
    expect(nextPage.filter?.column).toBe("kind");
    // ONE direction governing both cursor terms. Two directions is what makes
    // a row-value comparison silently wrong, so the type does not offer them.
    expect(nextPage.direction).toBe("desc");
  });

  it("PageResponse distinguishes a short page from the end of the data", () => {
    const shortButNotDone: PageResponse<EntityRowBase> = {
      rows: [],
      nextCursor: { sortValue: 1, tieBreak: "z" },
      scanned: 500,
      exhausted: false,
    };
    const done: PageResponse<EntityRowBase> = {
      rows: [],
      nextCursor: null,
      scanned: 12,
      exhausted: true,
    };

    // The distinction the bounded candidate window forces: zero rows with more
    // to scan is a REFETCH, and only the second one is an empty state.
    expect(shortButNotDone.rows).toHaveLength(0);
    expect(shortButNotDone.exhausted).toBe(false);
    expect(shortButNotDone.scanned).toBeGreaterThan(
      shortButNotDone.rows.length,
    );
    expect(done.exhausted).toBe(true);
    expect(done.nextCursor).toBeNull();
  });

  it("InvalidationSummary is four scalars and carries no payload", () => {
    const category: InvalidationCategory = "artifacts";
    const summary: InvalidationSummary = {
      projectId: "p1",
      category,
      changedCount: 3,
      newestId: "a".repeat(64),
    };

    // T-05-17: the payload is a SUMMARY. Asserting the key set rather than the
    // individual fields is what catches a row array or a body being added to
    // it later — the assertion fails on the extra key without anyone having to
    // predict its name.
    expect(Object.keys(summary).sort()).toEqual([
      "category",
      "changedCount",
      "newestId",
      "projectId",
    ]);
    for (const value of Object.values(summary)) {
      expect(["string", "number"]).toContain(typeof value);
    }
    expect(INVALIDATION_CATEGORIES).toContain(summary.category);
  });

  it("ScoreExplanation is a frame with no vocabulary in it", () => {
    const raised: ScoreSignal = {
      signalId: "provider-format-verified",
      label: "Provider format verified",
      direction: "raised",
    };
    const lowered: ScoreSignal = {
      signalId: "stopword-context",
      label: "Stopword in surrounding context",
      direction: "lowered",
      // TARGET-CONTROLLED when present. Sanitised through forEvidence before
      // it reaches the DOM.
      detail: "example",
    };
    const explanation: ScoreExplanation = {
      score: 87,
      tier: "high",
      signals: [raised, lowered],
    };

    // The ids above are ILLUSTRATIVE, not normative — Phase 3 plan 03-03 owns
    // the vocabulary, and nothing in contract.ts enumerates a signal id. What
    // is asserted is the frame: a numeral, a tier word, and an ordered list.
    expect(explanation.signals).toHaveLength(2);
    expect(explanation.signals[0]).toBe(raised);
    expect(["raised", "lowered"]).toContain(lowered.direction);
    expect(typeof explanation.score).toBe("number");
    expect(typeof explanation.tier).toBe("string");
  });

  it("EvidencePanelFrame is constructible with every mandatory field present", () => {
    const frame: EvidencePanelFrame = {
      sourceRequest: { requestId: "req-1" },
      artifactVersion: {
        sha256: "b".repeat(64),
        detectorSetHash: "c".repeat(64),
      },
      byteRange: { start: 1024, end: 1088 },
      snippet: "const key = …",
      scoreExplanation: { score: 87, tier: "high", signals: [] },
    };

    for (const field of EVIDENCE_PANEL_MANDATORY_FIELDS) {
      expect(
        frame[field],
        `${field} is mandatory and was absent`,
      ).toBeDefined();
    }
    // Half-open byte range over RAW bytes (ENC-01). The values come from
    // Phase 4's evidence table and do not exist yet; the frame does.
    expect(frame.byteRange.end).toBeGreaterThan(frame.byteRange.start);
  });

  it("VisibleTotal keeps suppressed rows OUT of the headline number", () => {
    const counts: VisibleTotal = {
      visible: 12,
      hiddenBySuppression: 5,
      suppressionRuleCount: 2,
    };

    // The semantics the operator asked for explicitly: the headline counts
    // rows they can currently reach, and the hidden ones are a separate second
    // line rather than a silent addend. Asserting the three are separate
    // fields is the mechanical form of that promise — a single `total` field
    // could not express it.
    expect(Object.keys(counts).sort()).toEqual([
      "hiddenBySuppression",
      "suppressionRuleCount",
      "visible",
    ]);
    expect(counts.visible).toBe(12);
  });

  it("triage state literals only come from the vocabulary", () => {
    const state: TriageState = "reviewed";
    expect(TRIAGE_STATES).toContain(state);
  });
});
