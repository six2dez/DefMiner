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

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  assertNoOtherDeriveOutcome,
  assertNoOtherProducibility,
  DEGRADED_ANALYSIS_FILTER,
  EVIDENCE_PANEL_MANDATORY_FIELDS,
  INVALIDATION_CATEGORIES,
  INVALIDATION_EVENT,
  isDegradedScanState,
  isOperatorDecided,
  isScanProgressPayload,
  RETRY_TARGET_SCAN_STATE,
  RETRYABLE_SCAN_STATES,
  SCAN_KIND_CLAUSE,
  SCAN_LIFECYCLE_STATES,
  SCAN_PROGRESS_KIND,
  SCAN_STATES,
  SOURCE_GONE_CAUSES,
  SOURCE_PRODUCIBILITY_STATES,
  SUSPEND_REASONS,
  TERMINAL_SCAN_STATES,
  TRIAGE_STATES,
  UNCLASSIFIED_ANALYSIS_FAILURE_REASON,
} from "./contract";
import type {
  DeriveSourceResult,
  EntityLead,
  EntityRowBase,
  EvidencePanelFrame,
  InvalidationCategory,
  InvalidationEventPayload,
  InvalidationSummary,
  PageCursor,
  PageRequest,
  PageResponse,
  RecoveredSourceRow,
  ScanLifecycleState,
  ScanProgressPayload,
  ScanState,
  ScanStatusPayload,
  ScoreExplanation,
  ScoreSignal,
  SourceDerivationFailure,
  SourceMappingsResult,
  SourceProducibility,
  SuspendReason,
  TriageState,
  VisibleTotal,
} from "./contract";

describe("SCAN_STATES — the SHIPPED analysis vocabulary (OBS-02, UI-09)", () => {
  it("holds exactly the five values the migration's CHECK constraint enforces", () => {
    // ORDER, not membership. 05-UI-SPEC.md § "Status vocabulary" renders them
    // in this order and the order is the lifecycle: queued, in flight, and the
    // three ways it can end. It is also the order migration step v2 writes into
    // `CHECK (scan_state IN (...))`, so a reordering here is a diff a reviewer
    // can put beside the DDL.
    expect(SCAN_STATES).toEqual([
      "pending",
      "running",
      "done",
      "partial",
      "failed",
    ]);
  });

  it("is snake_case throughout, like TRIAGE_STATES", () => {
    for (const state of SCAN_STATES) {
      expect(state, `${state} is not snake_case`).toMatch(/^[a-z]+(_[a-z]+)*$/);
    }
  });

  it("marks the three ENDING states terminal and neither in-flight one", () => {
    // `failed` is terminal DELIBERATELY: Phase 1 has no retry policy, so
    // treating it as re-analysable would re-walk the same bytes on every
    // sighting for ever with nothing to break the loop.
    expect([...TERMINAL_SCAN_STATES]).toEqual(["done", "partial", "failed"]);
    expect(TERMINAL_SCAN_STATES).not.toContain("pending");
    expect(TERMINAL_SCAN_STATES).not.toContain("running");
  });

  it("calls exactly `partial` and `failed` degraded — the floor predicate", () => {
    // UI-09's floor statement is derived from THIS and nowhere else. `pending`
    // and `running` are not degraded: they are unfinished, which is a different
    // claim and one the badge already carries in words.
    const degraded = SCAN_STATES.filter((state) => isDegradedScanState(state));
    expect(degraded).toEqual(["partial", "failed"]);
  });

  it("answers for EVERY member — the exhaustiveness the never-fallthrough enforces", () => {
    // The `never` fallthrough fails `tsc`, not vitest, when a sixth state is
    // added without a case. Asserted here so the mechanism is visible to a
    // reader of the suite rather than only to the compiler.
    for (const state of SCAN_STATES) {
      expect(typeof isDegradedScanState(state)).toBe("boolean");
    }
  });

  it("types the lead column's state — no longer a bare string", () => {
    // The field was `string` while the vocabulary lived in the backend, which
    // the engine may not import. Plan 05-09 moved it here, so a lead state
    // outside the shipped five is a typecheck error rather than a badge that
    // renders as nothing — which under UI-09 is a degraded analysis silently
    // presented as complete.
    const state: ScanState = "partial";
    const lead: EntityLead = { kind: "state", state };
    expect(lead).toEqual({ kind: "state", state: "partial" });
  });
});

describe("the retry vocabulary (OPS-03)", () => {
  it("returns a stopped analysis to a SHIPPED, NON-TERMINAL state", () => {
    // Two claims, and both matter. A target outside the vocabulary would be
    // rejected by the migration's CHECK constraint at run time, on a driver
    // that reports a rejection nobody sees. A target that was TERMINAL would
    // put the row straight back where the retry found it, so the operator
    // would press the button and watch nothing change.
    expect(SCAN_STATES).toContain(RETRY_TARGET_SCAN_STATE);
    expect(TERMINAL_SCAN_STATES).not.toContain(RETRY_TARGET_SCAN_STATE);
  });

  it("moves out of exactly the two terminal states that did not inspect every byte", () => {
    // DERIVED FROM THE TWO PREDICATES, ASSERTED AS A SET. The retry statement
    // binds this list into a fixed-arity `IN (?, ?)`, so its LENGTH is part of
    // the statement's shape: a sixth degraded state would need a new literal,
    // and retry.ts throws at import rather than binding a short list.
    expect([...RETRYABLE_SCAN_STATES].sort()).toEqual(["failed", "partial"]);
    for (const state of RETRYABLE_SCAN_STATES) {
      expect(TERMINAL_SCAN_STATES).toContain(state);
      expect(isDegradedScanState(state)).toBe(true);
    }
    // `done` is terminal and COMPLETE. Retrying it discards a finished result
    // to redo work whose answer is already known.
    expect(RETRYABLE_SCAN_STATES).not.toContain("done");
  });

  it("carries a DefMiner-authored failure reason code, not a message", () => {
    // ERR-04's `{reason}` is an identifier the UI maps to its own copy. The
    // assertion is that it holds no punctuation a sentence would carry — a
    // code that had grown into a message is a message that can quote an
    // artifact (T-05-51).
    expect(UNCLASSIFIED_ANALYSIS_FAILURE_REASON).toMatch(/^[a-z][a-z-]*[a-z]$/);
  });
});

describe("DEGRADED_ANALYSIS_FILTER — the narrowing action's one filter", () => {
  it("is a single column filter with a bound value, frozen", () => {
    // ONE COLUMN AND ONE VALUE, which is what `PageRequest["filter"]` permits
    // and what keeps the backend's statement matrix linear rather than
    // exponential. Frozen because both packages read the same object and a
    // mutated column name would silently read an empty exhausted page.
    expect(Object.keys(DEGRADED_ANALYSIS_FILTER).sort()).toEqual([
      "column",
      "value",
    ]);
    expect(Object.isFrozen(DEGRADED_ANALYSIS_FILTER)).toBe(true);
    expect(DEGRADED_ANALYSIS_FILTER.column).not.toBe("");
    expect(DEGRADED_ANALYSIS_FILTER.value).not.toBe("");
  });
});

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
  it("holds exactly the SHIPPED table categories, in append order", () => {
    // WAS THREE. Plan 07-04 appended `sources` and `source_sightings` in the
    // same edit that added migration step v8, which is this list's own rule —
    // entity categories are appended by the phase that adds the table — rather
    // than a widening done ahead of the schema.
    expect(INVALIDATION_CATEGORIES).toEqual([
      "artifacts",
      "observations",
      "analyses",
      "sources",
      "source_sightings",
    ]);
    expect(INVALIDATION_CATEGORIES).toHaveLength(5);
  });

  it("names nothing entity-shaped — those tables do not exist", () => {
    // The guard against the failure mode this whole plan exists to prevent: a
    // category invented for a table no phase has defined. The list below is
    // `EXPECTED_TABLES` from schema.spec.ts minus the two tables that carry no
    // renderable rows (`audit`, `settings` are here; `scans` is deliberately
    // NOT a category — see 06-UI-SPEC.md § "Named Conflicts"), and a category
    // outside it is a claim about a table that is not there.
    const shipped = [
      "analyses",
      "artifacts",
      "audit",
      "observations",
      "scans",
      "settings",
      "source_sightings",
      "sources",
    ];
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

// ===========================================================================
// PHASE 6 — THE RETROACTIVE SCAN'S LIFECYCLE VOCABULARY
// ===========================================================================
// These assertions exist for ONE reason and it is stated in
// 06-UI-SPEC.md § "Two Vocabularies With One Name": `running` is a literal
// member of BOTH `SCAN_STATES` (an artifact's analysis state) and
// `SCAN_LIFECYCLE_STATES` (a retroactive scan's lifecycle state). Two closed
// vocabularies, one word "scan", and one shared member. The declarations sit
// adjacent in `contract.ts` so the collision is visible at the point of
// declaration; these are the mechanical half of the same guard.

describe("SCAN_LIFECYCLE_STATES — the RETROACTIVE SCAN vocabulary (FIND-03, D-09)", () => {
  it("holds exactly the four states migration step v5's CHECK enforces, in order", () => {
    // ORDER, not membership, for the reason the SCAN_STATES assertion above
    // gives: this is also the order step v5 writes into
    // `CHECK (state IN (...))`, so a reordering here is a diff a reviewer can
    // put beside the DDL.
    expect(SCAN_LIFECYCLE_STATES).toEqual([
      "running",
      "suspended",
      "completed",
      "discarded",
    ]);
  });

  it("is snake_case throughout, like the shipped SCAN_STATES", () => {
    for (const state of SCAN_LIFECYCLE_STATES) {
      expect(state, `${state} is not snake_case`).toMatch(/^[a-z]+(_[a-z]+)*$/);
    }
  });

  it("shares exactly ONE member with the analysis vocabulary, and it is `running`", () => {
    // THE COLLISION, ASSERTED RATHER THAN REMEMBERED. If a later edit made a
    // second member overlap — `failed`, say, or `pending` — the naming
    // discipline 06-UI-SPEC.md builds around one shared word would silently
    // stop being sufficient, and nothing else in the build would say so.
    const shared = SCAN_LIFECYCLE_STATES.filter((state) =>
      (SCAN_STATES as readonly string[]).includes(state),
    );
    expect(shared).toEqual(["running"]);
  });

  it("does NOT contain `completed`'s analysis-side lookalike", () => {
    // `SCAN_STATES` ships `done`, and the lifecycle vocabulary ships
    // `completed`. Neither list may grow the other's word: `done` here, or
    // `completed` there, would put two meanings under one literal in the one
    // place the type system could no longer tell them apart.
    expect(SCAN_LIFECYCLE_STATES).not.toContain("done");
    expect(SCAN_STATES).not.toContain("completed");
  });

  it("types a lifecycle state — no bare string anywhere on the scan path", () => {
    const state: ScanLifecycleState = "suspended";
    expect(SCAN_LIFECYCLE_STATES).toContain(state);
  });
});

// ===========================================================================
// PHASE 7 — THE THIRD CLOSED VOCABULARY, AND ITS ADJACENCY
// ===========================================================================
// `SOURCE_PRODUCIBILITY_STATES` answers a DIFFERENT QUESTION from either scan
// vocabulary — can DefMiner still show you these bytes, rather than did it
// finish looking at them — and the argument for keeping it separate is in
// contract.ts at the declaration. These are the mechanical half: the collision
// note is only load-bearing if the two declarations actually stay adjacent, so
// the adjacency is asserted against the FILE'S OWN TEXT rather than trusted.

/** The distance the collision note is worth reading across. A declaration that
 *  drifts further than this is one a reader meets without the note. */
const ADJACENCY_MAX_LINES = 40;

describe("SOURCE_PRODUCIBILITY_STATES — the RECOVERED SOURCE vocabulary (D-22, O-07)", () => {
  it("holds exactly the three states migration step v8's CHECK enforces, in order", () => {
    // ORDER, not membership, for the reason the two assertions above give: this
    // is also the order step v8 writes into `CHECK (producibility IN (...))`,
    // and `sources.spec.ts` reads that constraint back out of the schema and
    // compares it member by member rather than trusting the two to stay in step.
    expect(SOURCE_PRODUCIBILITY_STATES).toEqual([
      "producible",
      "gone",
      "changed",
    ]);
  });

  it("is declared IMMEDIATELY AFTER SCAN_LIFECYCLE_STATES, asserted against the file", () => {
    // THE COLLISION NOTE IS ONLY WORTH ANYTHING IF IT IS STILL BESIDE BOTH
    // LISTS. Read from contract.ts's own text so a later edit that pushes the
    // two declarations apart fails HERE, at the guard, rather than being
    // discovered by somebody who read one list and not the other.
    const source = readFileSync(
      fileURLToPath(new URL("./contract.ts", import.meta.url)),
      "utf8",
    ).split("\n");
    const lineOf = (declaration: string): number => {
      const at = source.findIndex((line) => line.startsWith(declaration));
      expect(at, `${declaration} not found in contract.ts`).toBeGreaterThan(-1);
      return at;
    };
    const second = lineOf("export const SCAN_LIFECYCLE_STATES");
    const third = lineOf("export const SOURCE_PRODUCIBILITY_STATES");
    expect(third).toBeGreaterThan(second);
    expect(
      third - second,
      "the third vocabulary has drifted away from the collision note",
    ).toBeLessThanOrEqual(ADJACENCY_MAX_LINES);
  });

  it("names the THIRD collision at the point of declaration", () => {
    // The note itself, asserted to exist in the file somebody would edit — the
    // `decode.spec.ts` idiom. A rule that lives only in a plan document is a
    // rule the next person does not read.
    const source = readFileSync(
      fileURLToPath(new URL("./contract.ts", import.meta.url)),
      "utf8",
    );
    expect(source).toContain("THE THIRD COLLISION IN THIS REGISTER");
    expect(source).toContain("PRODUCIBILITY IS NOT A SCAN STATE");
    // The mechanism that makes the column name load-bearing, in the file.
    expect(source).toContain("never `state`");
    expect(source).toContain("never `scan_state`");
  });

  it("shares NO member with either scan vocabulary", () => {
    // `running` already sits in both scan lists. A third list that also
    // overlapped would put three meanings under one literal in the one place
    // the type system could no longer tell them apart.
    const scanWords = new Set<string>([
      ...(SCAN_STATES as readonly string[]),
      ...(SCAN_LIFECYCLE_STATES as readonly string[]),
    ]);
    const shared = SOURCE_PRODUCIBILITY_STATES.filter((state) =>
      scanWords.has(state),
    );
    expect(shared).toEqual([]);
  });

  it("its operator-facing words are safe against the nine already in use", () => {
    // MECHANISM 3, MEASURED RATHER THAN ASSERTED. `Missing`, `Lost` and
    // `Incomplete` were rejected as not clearly safe against **Partial** in an
    // operator's peripheral vision; these two are checked the strict way, in
    // BOTH directions — neither new word may be a prefix of an existing one,
    // and no existing one may be a prefix of a new one.
    const inUse = [
      "Queued",
      "Analysing",
      "Complete",
      "Partial",
      "Failed",
      "Scanning",
      "Suspended",
      "Finished",
      "Discarded",
    ];
    const added = ["Gone", "Changed"];
    for (const word of added) {
      for (const existing of inUse) {
        expect(word, `${word} collides with ${existing}`).not.toBe(existing);
        expect(
          word.toLowerCase().startsWith(existing.toLowerCase()),
          `${word} starts with the shipped ${existing}`,
        ).toBe(false);
        expect(
          existing.toLowerCase().startsWith(word.toLowerCase()),
          `the shipped ${existing} starts with ${word}`,
        ).toBe(false);
      }
    }
    // NON-VACUITY. The check has to be able to fail: one of the rejected words
    // is run through the same predicate and DOES collide.
    const rejected = "Part";
    expect(
      inUse.some((w) => w.toLowerCase().startsWith(rejected.toLowerCase())),
    ).toBe(true);
  });

  it("is snake_case-safe — single lowercase words, like the two lists above", () => {
    for (const state of SOURCE_PRODUCIBILITY_STATES) {
      expect(state, `${state} is not snake_case`).toMatch(/^[a-z]+(_[a-z]+)*$/);
    }
  });

  it("`assertNoOtherProducibility` has a CALL SITE, so its compile-time claim is load-bearing", () => {
    // The `audit.spec.ts` idiom. A `never` helper nothing calls proves nothing:
    // the compiler only refuses the widening at a switch that actually hands it
    // the unhandled arm.
    const describeOutcome = (value: SourceProducibility): string => {
      switch (value) {
        case "producible":
          return "reloadable";
        case "gone":
          return "tombstone";
        case "changed":
          return "tombstone";
        default:
          return assertNoOtherProducibility(value);
      }
    };
    expect(SOURCE_PRODUCIBILITY_STATES.map(describeOutcome)).toEqual([
      "reloadable",
      "tombstone",
      "tombstone",
    ]);
  });

  it("types a producibility outcome — no bare string on the recovered-source path", () => {
    const value: SourceProducibility = "gone";
    expect(SOURCE_PRODUCIBILITY_STATES).toContain(value);
  });
});

// ---------------------------------------------------------------------------
// D-07's DERIVATION RESULT — FOUR ARMS THAT CANNOT BE COLLAPSED
// ---------------------------------------------------------------------------
//
// 07-UI-SPEC.md fixes four mutually exclusive body states and says no two may be
// collapsed, then states the rule that outranks its own table: a failed call is
// NEVER rendered as a tombstone, and the frontend never infers producibility.
// These cases are the mechanical half of that — the shape has to make the
// collapse impossible rather than merely discouraged, so they assert the
// STRUCTURE (a `changed` arm with no content field at all) rather than a value.

describe("DeriveSourceResult — the four arms, and what each one may carry", () => {
  it("the `changed` arm has NO content field, asserted structurally", () => {
    // NOT "content is empty". An empty string is a value a viewer can render;
    // the absence of the key is what makes withholding a property of the type.
    // D-24 fails closed, and the shape is the mechanism.
    const changed: DeriveSourceResult = {
      outcome: "changed",
      recoveredAt: 1_756_000_000_000,
      recordedByteLen: 4096,
      reloadedByteLen: 4102,
    };
    expect(Object.keys(changed).sort()).toEqual([
      "outcome",
      "recordedByteLen",
      "recoveredAt",
      "reloadedByteLen",
    ]);
    expect("content" in changed).toBe(false);
  });

  it("the `unavailable` arm carries NOTHING but its tag", () => {
    // The sentinel is the one arm with no durable effect and no payload. A
    // reason field here would be a sentence somebody eventually interpolates,
    // and a `producibility` field would be the frontend inferring one.
    const sentinel: DeriveSourceResult = { outcome: "unavailable" };
    expect(Object.keys(sentinel)).toEqual(["outcome"]);
  });

  it("the two `gone` causes are DISTINCT tags over a closed vocabulary", () => {
    // The SDK types them as two different optionality points and the consumer
    // counts them apart; a single "not there" member would be this contract
    // choosing to know less than the runtime does.
    expect(SOURCE_GONE_CAUSES).toEqual(["no_request", "no_response"]);
    expect(new Set(SOURCE_GONE_CAUSES).size).toBe(SOURCE_GONE_CAUSES.length);
    for (const cause of SOURCE_GONE_CAUSES) {
      expect(cause, `${cause} is not snake_case`).toMatch(/^[a-z]+(_[a-z]+)*$/);
    }
  });

  it("`assertNoOtherDeriveOutcome` has a CALL SITE, so its compile-time claim is load-bearing", () => {
    // The `assertNoOtherProducibility` idiom. A `never` helper nothing calls
    // proves nothing: the compiler only refuses the widening at a switch that
    // actually hands it the unhandled arm. THIS is the switch a fifth arm
    // breaks — the failure recorded in the plan's SUMMARY was produced by
    // adding one here and running `pnpm typecheck`.
    const bodyState = (result: DeriveSourceResult): string => {
      switch (result.outcome) {
        case "content":
          return "Content";
        case "gone":
          return "Gone";
        case "changed":
          return "Changed";
        case "unavailable":
          return "Could not ask";
        default:
          return assertNoOtherDeriveOutcome(result);
      }
    };
    expect(
      [
        bodyState({
          outcome: "content",
          content: "x",
          byteLen: 1,
          lineCount: 1,
          sha256: "d",
        }),
        bodyState({
          outcome: "gone",
          cause: "no_request",
          recoveredAt: 1,
        }),
        bodyState({
          outcome: "changed",
          recoveredAt: 1,
          recordedByteLen: null,
          reloadedByteLen: 2,
        }),
        bodyState({ outcome: "unavailable" }),
      ],
      "the four body states must map one-to-one onto the four arms",
    ).toEqual(["Content", "Gone", "Changed", "Could not ask"]);
  });

  it("the position read shares the SAME three failure arms — one vocabulary, not two", () => {
    // The content read and the position read perform the same reload and the
    // same D-24 re-verify. Two failure vocabularies would let one of them
    // acquire a fourth failure the other does not have, and the viewer's four
    // body states would then mean different things depending on which call
    // produced them. Assignability in BOTH directions is the assertion.
    const failure: SourceDerivationFailure = {
      outcome: "gone",
      cause: "no_response",
      recoveredAt: 7,
    };
    const asDerive: DeriveSourceResult = failure;
    const asMappings: SourceMappingsResult = failure;
    expect(asDerive).toEqual(asMappings);
    // And the mappings arm carries the raw string and nothing else — it is
    // decoded to integers in the browser under D-16 and never enters the DOM.
    const positions: SourceMappingsResult = {
      outcome: "mappings",
      mappings: "AAAA;",
    };
    expect(Object.keys(positions).sort()).toEqual(["mappings", "outcome"]);
  });
});

describe("RecoveredSourceRow — the row shape four later plans are written against", () => {
  it("carries NO content field, which is what makes the eager load affordable", () => {
    // Under D-07 the bytes are never stored, so a row is a label, two digests,
    // three integers and a vocabulary word. A `content` field here would make
    // the tree's eager-to-the-bound policy an unbounded amount of source code.
    const row: RecoveredSourceRow = {
      artifactSha256: "a".repeat(64),
      mapSha256: "b".repeat(64),
      sourceIndex: 0,
      sourcesVerbatim: "webpack://app/src/index.ts",
      sourceSha256: "c".repeat(64),
      byteLen: 128,
      lineCount: 9,
      producibility: "producible",
      recoveredAt: 1_756_000_000_000,
    };
    expect(Object.keys(row).sort()).toEqual([
      "artifactSha256",
      "byteLen",
      "lineCount",
      "mapSha256",
      "producibility",
      "recoveredAt",
      "sourceIndex",
      "sourceSha256",
      "sourcesVerbatim",
    ]);
    expect("content" in row).toBe(false);
  });

  it("keeps the two Pitfall-3 nulls expressible and distinct", () => {
    // `sourceSha256` null: the map declared an index it shipped no content for,
    // so there is no `sources` row and the two size columns are null with it.
    // `sourcesVerbatim` null: the map declared the label as literal null, which
    // ECMA-426 permits. Neither is the string "null" and neither is zero.
    const noContent: RecoveredSourceRow = {
      artifactSha256: "a".repeat(64),
      mapSha256: "b".repeat(64),
      sourceIndex: 3,
      sourcesVerbatim: "webpack://app/src/absent.ts",
      sourceSha256: null,
      byteLen: null,
      lineCount: null,
      producibility: "producible",
      recoveredAt: 1,
    };
    const noLabel: RecoveredSourceRow = { ...noContent, sourcesVerbatim: null };
    expect(noContent.byteLen).toBeNull();
    expect(noContent.byteLen).not.toBe(0);
    expect(noLabel.sourcesVerbatim).toBeNull();
    expect(noLabel.sourcesVerbatim).not.toBe("null");
  });

  it("types `producibility` against the vocabulary — no bare string on the row", () => {
    for (const state of SOURCE_PRODUCIBILITY_STATES) {
      const row: RecoveredSourceRow = {
        artifactSha256: "a".repeat(64),
        mapSha256: "b".repeat(64),
        sourceIndex: 0,
        sourcesVerbatim: null,
        sourceSha256: null,
        byteLen: null,
        lineCount: null,
        producibility: state,
        recoveredAt: 1,
      };
      expect(SOURCE_PRODUCIBILITY_STATES).toContain(row.producibility);
    }
  });
});

describe("SUSPEND_REASONS — why a scan stopped, as a closed code set", () => {
  it("holds exactly the four reasons the phase can produce", () => {
    // Each is a DefMiner-authored CODE and never rendered error text: the
    // frontend maps it to its own sentence (06-UI-SPEC.md § "Suspension
    // reasons"). A fifth reason needs a copy row before it can be rendered,
    // which is what makes the set closed rather than merely short.
    expect(SUSPEND_REASONS).toEqual([
      "operator_paused",
      "project_changed",
      "process_restarted",
      "retention_eviction",
    ]);
  });

  it("is snake_case throughout", () => {
    for (const reason of SUSPEND_REASONS) {
      expect(reason, `${reason} is not snake_case`).toMatch(
        /^[a-z]+(_[a-z]+)*$/,
      );
    }
  });

  it("types a reason — the column is nullable, the vocabulary is not open", () => {
    const reason: SuspendReason = "process_restarted";
    expect(SUSPEND_REASONS).toContain(reason);
  });
});

describe("SCAN_KIND_CLAUSE — DefMiner's own narrowing, readable by both packages", () => {
  it("names both script extensions and all five media-type substrings", () => {
    // The seven kind terms 06-RESEARCH.md § "Composing the scan filter" fixes.
    // Asserted as SUBSTRINGS of the clause rather than by rebuilding it: a
    // second construction here would be a second producer of HTTPQL, which is
    // exactly what `scan/filter.ts`'s header prohibits.
    for (const term of [
      'req.path.like:"%.js%"',
      'req.path.like:"%.mjs%"',
      'resp.raw.like:"%javascript%"',
      'resp.raw.like:"%ecmascript%"',
      'resp.raw.like:"%jscript%"',
      'resp.raw.like:"%livescript%"',
      'resp.raw.like:"%text/js%"',
    ]) {
      expect(SCAN_KIND_CLAUSE, `${term} is missing`).toContain(term);
    }
  });

  it("bounds the status to 2xx, so a 304 never reaches the transfer at all", () => {
    expect(SCAN_KIND_CLAUSE).toContain("resp.code.gte:200");
    expect(SCAN_KIND_CLAUSE).toContain("resp.code.lt:300");
  });

  it("never uses `req.ext.eq`, which is case SENSITIVE where `admit()` is not", () => {
    // `isScriptish` lowercases before comparing a suffix, so it accepts
    // `/APP.JS`. `req.ext.eq` is documented case sensitive and would not match
    // it — the push-down would then be a strict SUBSET of the admission gate,
    // and the retroactive scan would silently never see that artifact.
    expect(SCAN_KIND_CLAUSE).not.toContain("req.ext.eq");
  });

  it("uses NO `cont` term at all — measured case SENSITIVE on 0.58.2", () => {
    // The HTTPQL reference states `cont` is case insensitive. Plan 06-11 asked
    // Caido instead of believing it: with a `cont` clause,
    // `sdk.requests.matches()` returned FALSE for `/F02-UPPER.JS` and for
    // `Content-Type: TEXT/JAVASCRIPT`, both of which `isScriptish` accepts.
    // The evidence is results/pushdown-superset.json, and
    // `tests/phase6-pushdown.spec.ts` is what keeps this honest going forward.
    // This assertion is the cheap tripwire that stops `cont` coming back on the
    // strength of the documentation.
    expect(SCAN_KIND_CLAUSE).not.toContain(".cont:");
  });

  it("carries no HTTPQL comment token, in either grammar", () => {
    // The clause is DefMiner-authored and a comment in it would be a comment
    // in front of the operator's, which is the widening O-06 forbids.
    expect(SCAN_KIND_CLAUSE).not.toContain("//");
    expect(SCAN_KIND_CLAUSE).not.toContain("/*");
  });

  it("is balanced — every parenthesis it opens, it closes", () => {
    let depth = 0;
    for (const ch of SCAN_KIND_CLAUSE) {
      if (ch === "(") depth += 1;
      if (ch === ")") depth -= 1;
      expect(
        depth,
        "the clause closes a parenthesis it never opened",
      ).toBeGreaterThanOrEqual(0);
    }
    expect(depth).toBe(0);
  });
});

describe("ScanStatusPayload — what the Scan tab reads", () => {
  it("carries the held-at-watermark signal as a REQUIRED field", () => {
    // 06-UI-SPEC.md § "The scan status payload — required fields" is binding
    // and this is the field it binds. Without it a healthy backpressure hold
    // and a blocked QuickJS thread are indistinguishable from outside the
    // backend, `Waiting for the analysis queue` can never render, and the
    // stall marker fires on the most common healthy state of a long backfill.
    const payload: ScanStatusPayload = {
      scanId: "s1",
      state: "running",
      suspendReason: null,
      operatorFilter: "",
      composedFilter: `(${SCAN_KIND_CLAUSE})`,
      pagesWalked: 1,
      seen: 20,
      admitted: 3,
      skippedDone: 1,
      rejected: 16,
      queued: 3,
      analysed: null,
      lastCreatedAt: 1_755_000_000_000,
      startedAt: 1_755_000_100_000,
      updatedAt: 1_755_000_200_000,
      finishedAt: null,
      heldAtWatermark: false,
    };

    expect(Object.keys(payload)).toContain("heldAtWatermark");
    expect(payload.heldAtWatermark).toBe(false);
  });

  it("distinguishes a counter DefMiner does not have from a counter that is zero", () => {
    // `analysed` is `number | null` and not `number`. The scan table has no
    // `analysed` column — the number belongs to the consumer, not to the
    // producer — so until plan 06-06 wires it, the honest value is ABSENT.
    // 06-UI-SPEC.md D2's rule, applied to a counter: "a number DefMiner does
    // not have is absent, never zero". A zero here would read as "nothing has
    // been analysed" on a scan that is analysing.
    const absent: ScanStatusPayload["analysed"] = null;
    const none: ScanStatusPayload["analysed"] = 0;
    expect(absent).toBeNull();
    expect(none).toBe(0);
    expect(absent).not.toBe(none);
  });
});

// ===========================================================================
// THE SECOND PAYLOAD VARIANT (FIND-04, D-15)
// ===========================================================================
//
// THE DIVERGENCE FROM D-15's WORD "CATEGORY" IS ASSERTED HERE, NOT ONLY
// ARGUED IN A COMMENT. D-15 asks for progress "as a new coalescer category",
// and 06-UI-SPEC.md § "Named Conflicts" records why the literal reading
// delivers the OPPOSITE of D-15's stated intent: both of the coalescer's
// triage-lock early returns are checked BEFORE the debounce window, so a
// `scans` category would accrue into the pill and never land while a row is
// selected. Progress therefore rides the SAME event as a second VARIANT and is
// NOT a fourth category — and the cases below assert the gate that stops a
// speculative category is still exactly where it was.

describe("the progress payload is a VARIANT, never a fourth CATEGORY", () => {
  it("leaves INVALIDATION_CATEGORIES with nothing scan-shaped in it", () => {
    // The same assertion the shipped case above makes, restated here against
    // the CHANGE this file is now recording — so an edit that widened the list
    // to carry progress fails in the block that introduced progress rather than
    // only in the block that predates it.
    //
    // THE COUNT WAS THE WRONG THING TO ASSERT AND IS GONE. This case pinned
    // `toHaveLength(3)`, which made it fail the day plan 07-04 appended two
    // ENTITY categories for tables it had just created — a change this case has
    // no opinion about — while a `scans` member added in that same edit would
    // have kept the length at three and passed. The property is that NOTHING
    // SCAN-SHAPED is a category, and it is now asserted as that property. The
    // membership-and-order pin lives in the block above, which is where a
    // reviewer looking for the list's contents goes.
    expect(INVALIDATION_CATEGORIES).not.toContain("scans");
    expect(INVALIDATION_CATEGORIES).not.toContain("scan");
    expect(INVALIDATION_CATEGORIES).not.toContain(SCAN_PROGRESS_KIND);
  });

  it("SCAN_PROGRESS_KIND is a non-empty literal that is not an event name", () => {
    expect(typeof SCAN_PROGRESS_KIND).toBe("string");
    expect(SCAN_PROGRESS_KIND.length).toBeGreaterThan(0);
    // NOT namespaced like the event. It is a discriminator INSIDE a payload on
    // one already-namespaced event, and giving it a `defminer:` prefix would
    // invite a reader to mistake it for a second event name.
    expect(SCAN_PROGRESS_KIND).not.toBe(INVALIDATION_EVENT);
  });

  it("isScanProgressPayload narrows BOTH ways over the union", () => {
    const summary: InvalidationEventPayload = {
      projectId: "p1",
      category: "artifacts",
      changedCount: 3,
      newestId: "a".repeat(64),
    };
    const progress: InvalidationEventPayload = makeProgress();

    expect(isScanProgressPayload(summary)).toBe(false);
    expect(isScanProgressPayload(progress)).toBe(true);

    // THE NARROWING IS THE POINT, not the boolean. Reading a progress-only
    // field off the union without the guard is a typecheck error; reading it
    // inside the guard is not.
    if (isScanProgressPayload(progress)) {
      expect(progress.scanId).toBe("s1");
    } else {
      throw new Error("the predicate did not narrow the progress variant");
    }
  });

  it("returns false for a payload that simply has no discriminator", () => {
    // The summary variant carries no `kind` at run time at all — the emitted
    // object is still the four scalars UI-07 fixed — so "missing" and "not
    // progress" are the same object, and this is that object.
    const bare = {
      projectId: "p1",
      category: "observations",
      changedCount: 1,
      newestId: "r-1",
    } satisfies InvalidationSummary;
    expect(Object.keys(bare)).not.toContain("kind");
    expect(isScanProgressPayload(bare)).toBe(false);
  });

  it("carries the seven counters, the position, the state and the hold — and no target-controlled string", () => {
    const progress = makeProgress();

    // THE KEY SET, not the individual fields. A findings array or a body added
    // to this variant later fails here without anyone having to predict its
    // name — the same reason the summary case above asserts its own key set.
    expect(Object.keys(progress).sort()).toEqual([
      "admitted",
      "analysed",
      "heldAtWatermark",
      "kind",
      "lastCreatedAt",
      "pagesWalked",
      "projectId",
      "queued",
      "rejected",
      "scanId",
      "seen",
      "skippedDone",
      "state",
    ]);

    // THE SEVEN COUNTERS 06-UI-SPEC.md names: four in the strip and three in
    // the detail list. Every one of them is a number or an explicit absence.
    for (const counter of [
      progress.seen,
      progress.admitted,
      progress.queued,
      progress.analysed,
      progress.pagesWalked,
      progress.skippedDone,
      progress.rejected,
    ]) {
      expect(counter === null || typeof counter === "number").toBe(true);
    }

    expect(SCAN_LIFECYCLE_STATES).toContain(progress.state);
    expect(typeof progress.heldAtWatermark).toBe("boolean");
    expect(
      progress.lastCreatedAt === null ||
        Number.isInteger(progress.lastCreatedAt),
    ).toBe(true);
  });

  it("has exactly two string fields and both are identifiers this plugin owns", () => {
    // T-06-44. `projectId` is Caido's own project identifier and `scanId` is a
    // UUID DefMiner minted; `kind` and `state` are closed-vocabulary members.
    // Nothing else on this shape is a string, which is what makes the readout
    // renderable with no display-path call — a property of the SHAPE rather
    // than a discipline somebody has to keep.
    const progress = makeProgress();
    const strings = Object.entries(progress).filter(
      ([, value]) => typeof value === "string",
    );
    expect(strings.map(([key]) => key).sort()).toEqual([
      "kind",
      "projectId",
      "scanId",
      "state",
    ]);
  });

  it("`analysed` is ABSENT and never a lying zero", () => {
    // The same rule `ScanStatusPayload.analysed` carries, and the same reason:
    // `analyses` rows hold no scan attribution, so DefMiner cannot attribute a
    // finished analysis to THIS scan. 06-UI-SPEC.md D2 — "a number DefMiner
    // does not have is absent, never zero".
    expect(makeProgress().analysed).toBeNull();
  });
});

/** One progress payload, as `scan/producer.ts` emits it. */
function makeProgress(
  overrides: Partial<ScanProgressPayload> = {},
): ScanProgressPayload {
  return {
    kind: SCAN_PROGRESS_KIND,
    projectId: "p1",
    scanId: "s1",
    state: "running",
    pagesWalked: 2,
    seen: 40,
    admitted: 9,
    skippedDone: 4,
    rejected: 27,
    queued: 9,
    analysed: null,
    lastCreatedAt: 1_723_600_000_000,
    heldAtWatermark: false,
    ...overrides,
  };
}
