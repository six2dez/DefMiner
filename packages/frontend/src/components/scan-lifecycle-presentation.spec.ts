// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// packages/frontend/src/components/scan-lifecycle-presentation.spec.ts — the
// SECOND status vocabulary, its renderer, and the guard that keeps it apart
// from the first.
//
// ===========================================================================
// WHY A PREFIX GUARD AND NOT A SET-DISJOINTNESS CHECK
// ===========================================================================
// `scan_state` is an ARTIFACT'S ANALYSIS state — Queued / Analysing / Complete /
// Partial / Failed. `scans.state` is the LIFECYCLE state of a retroactive
// backfill, and `running` is a literal member of both vocabularies. An operator
// who reads a word and cannot tell which of the two it is describing has been
// told nothing.
//
// A disjointness check over the two label sets would pass **Complete** beside
// **Completed**, which is the exact pair the rule exists to catch: a
// one-character difference on a triage surface where the two states mean
// opposite things ("every byte of this artifact was inspected" vs. "this
// backfill reached the end of history"). So the check is a case-insensitive
// PREFIX relation, in both directions, and it is why the lifecycle's terminal
// label is **Finished**.
//
// AND IT WALKS THE COMPUTED WORDS, NOT ONLY THE MAP MEMBERS. Three of the four
// operator-facing words for lifecycle `running` — the starting word, the
// backpressure sentence and the stall marker — are computed presentation states
// and are NOT members of `SCAN_LIFECYCLE_PRESENTATION`. A guard over map
// members alone covers half the strings an operator actually reads, and the
// half it covers is the half that was easy (06-UI-SPEC.md § "Two Vocabularies
// With One Name", mechanism 4).
//
// NO COLLISION EXISTS TODAY, which is precisely why the guard is widened now
// rather than after one is introduced.
//
// ===========================================================================
// AND IT WALKS THREE VOCABULARIES AS OF PLAN 07-07, NOT TWO
// ===========================================================================
// EXTENDED HERE RATHER THAN FORKED. Phase 7 adds `producibility` — CAN DEFMINER
// STILL SHOW YOU THESE BYTES — beside the analysis state (DID DEFMINER FINISH
// LOOKING AT THEM) and the backfill lifecycle. Its words are **Gone** and
// **Changed**, and *Missing*, *Lost* and *Incomplete* were rejected against the
// analysis vocabulary's **Partial**.
//
// A SECOND GUARD IN A SECOND FILE WOULD HAVE BEEN THE WRONG SHAPE. The relation
// this file checks is over the UNION, and two guards over overlapping unions is
// how one of them comes to cover a word the other one dropped with neither
// owner noticing. So the union grows and the assertion does not move — which is
// also why the non-vacuity case below counts the members per vocabulary rather
// than only the total.

import { SCAN_LIFECYCLE_STATES } from "@defminer/engine/contract";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import {
  SCAN_STATUS_DISCARDED,
  SCAN_STATUS_FINISHED,
  SCAN_STATUS_NOT_ADVANCING,
  SCAN_STATUS_SCANNING,
  SCAN_STATUS_STARTING,
  SCAN_STATUS_SUSPENDED,
  SCAN_STATUS_WAITING_FOR_QUEUE,
} from "./scan-contract";
import { SCAN_LIFECYCLE_PRESENTATION } from "./scan-lifecycle-presentation";
import { SCAN_STATE_PRESENTATION } from "./scan-state-presentation";
import ScanLifecycleBadge from "./ScanLifecycleBadge.vue";
import { SOURCE_PRODUCIBILITY_PRESENTATION } from "./source-producibility-presentation";

// ---------------------------------------------------------------------------
// THE GUARD
// ---------------------------------------------------------------------------

/** One operator-facing word and which vocabulary it belongs to. */
type VocabularyWord = {
  readonly vocabulary: "analysis" | "lifecycle" | "producibility";
  readonly word: string;
};

/**
 * Every pair where a word from ONE vocabulary is a case-insensitive prefix of a
 * word from the OTHER.
 *
 * WITHIN a vocabulary is not a collision: "Scanning" and "Suspended" both being
 * lifecycle words is the point of a vocabulary, and a rule that fired there
 * would be a rule that has to be suppressed on its first real use. Case
 * insensitive because a label rendered in a different case is the same word to
 * the person reading it.
 */
function prefixCollisions(
  words: readonly VocabularyWord[],
): { a: string; b: string }[] {
  const found: { a: string; b: string }[] = [];
  for (const left of words) {
    for (const right of words) {
      if (left.vocabulary === right.vocabulary) continue;
      if (left.word === right.word) {
        found.push({ a: left.word, b: right.word });
        continue;
      }
      if (right.word.toLowerCase().startsWith(left.word.toLowerCase())) {
        found.push({ a: left.word, b: right.word });
      }
    }
  }
  return found;
}

/** The four operator-facing words for the lifecycle `running` state that are
 *  COMPUTED rather than persisted, plus the three that are. */
const LIFECYCLE_COMPUTED_WORDS: readonly string[] = [
  SCAN_STATUS_STARTING,
  SCAN_STATUS_SCANNING,
  SCAN_STATUS_WAITING_FOR_QUEUE,
  SCAN_STATUS_NOT_ADVANCING,
];

/**
 * The producibility words that are ACTUALLY RENDERED.
 *
 * The ordinary member's row is `{ label: null, toneClass: null }` — it renders
 * NOTHING AT ALL — so it contributes no word to the union. Filtering rather than
 * mapping a placeholder in is deliberate: a `null` coerced to a string would put
 * "null" in a collision check as though it were a word an operator reads.
 */
function producibilityWords(): string[] {
  return Object.values(SOURCE_PRODUCIBILITY_PRESENTATION)
    .map((presentation) => presentation.label)
    .filter((label): label is string => label !== null);
}

function everyOperatorWord(
  extraLifecycleWords: readonly string[] = [],
): VocabularyWord[] {
  return [
    ...Object.values(SCAN_STATE_PRESENTATION).map((p) => ({
      vocabulary: "analysis" as const,
      word: p.label,
    })),
    ...Object.values(SCAN_LIFECYCLE_PRESENTATION).map((p) => ({
      vocabulary: "lifecycle" as const,
      word: p.label,
    })),
    ...[...LIFECYCLE_COMPUTED_WORDS, ...extraLifecycleWords].map((word) => ({
      vocabulary: "lifecycle" as const,
      word,
    })),
    ...producibilityWords().map((word) => ({
      vocabulary: "producibility" as const,
      word,
    })),
  ];
}

describe("the THREE status vocabularies cannot be confused (06-UI-SPEC mechanism 4, 07-UI-SPEC mechanism 3)", () => {
  it("no word in either vocabulary is a case-insensitive prefix of one in the other", () => {
    const collisions = prefixCollisions(everyOperatorWord());
    expect(
      collisions,
      "a word an operator reads on one surface is a prefix of a word that means " +
        "something else on another. Complete/Completed is the shape this rule " +
        "exists to catch, and the fix is a different word, never a suppression.",
    ).toEqual([]);
  });

  it("walks at least eleven words — three maps AND the computed ones", () => {
    // NON-VACUITY. A guard whose union quietly shrank to one vocabulary would
    // pass for ever while covering nothing, which is the failure mode a
    // source-level assertion is most prone to. Counted PER VOCABULARY, so a
    // union that lost a whole map fails here rather than passing on the two
    // that remained.
    const words = everyOperatorWord();
    expect(words.length).toBeGreaterThanOrEqual(11);
    expect(words.filter((w) => w.vocabulary === "analysis").length).toBe(5);
    expect(
      words.filter((w) => w.vocabulary === "lifecycle").length,
    ).toBeGreaterThanOrEqual(4);
    expect(words.filter((w) => w.vocabulary === "producibility").length).toBe(
      2,
    );
    // The computed words are IN the union, not merely declared beside it.
    expect(words.map((w) => w.word)).toContain(SCAN_STATUS_WAITING_FOR_QUEUE);
    expect(words.map((w) => w.word)).toContain(SCAN_STATUS_NOT_ADVANCING);
    // And so are the two producibility words.
    expect(words.map((w) => w.word)).toContain("Gone");
    expect(words.map((w) => w.word)).toContain("Changed");
  });

  it("clears all nine shipped words in BOTH directions", () => {
    // Stated as its own case because the claim 07-UI-SPEC.md makes is
    // directional and a reader will want to see it exercised: neither
    // producibility word is a prefix of any of the nine, and none of the nine
    // is a prefix of either.
    const nine = everyOperatorWord()
      .filter((w) => w.vocabulary !== "producibility")
      .map((w) => w.word);
    expect(nine.length).toBeGreaterThanOrEqual(9);
    for (const shipped of nine) {
      for (const word of producibilityWords()) {
        expect(
          word.toLowerCase().startsWith(shipped.toLowerCase()),
          `the producibility word ${word} is prefixed by the shipped word ${shipped}`,
        ).toBe(false);
        expect(
          shipped.toLowerCase().startsWith(word.toLowerCase()),
          `the shipped word ${shipped} is prefixed by the producibility word ${word}`,
        ).toBe(false);
      }
    }
  });

  it("turns red on a scratch word that prefixes a PRODUCIBILITY word", () => {
    // THE THIRD MAP'S NEGATIVE FIXTURE. "Gon" is a prefix of "Gone" and a
    // set-disjointness check would pass it — the same shape as Complete beside
    // Completed, one vocabulary further along. Introduced into the LIFECYCLE
    // vocabulary rather than into producibility's own, because a collision
    // WITHIN a vocabulary is not a collision and the rule must not fire there.
    const collisions = prefixCollisions(everyOperatorWord(["Gon"]));
    expect(collisions.length).toBeGreaterThan(0);
    expect(collisions.some((c) => c.a === "Gon" && c.b === "Gone")).toBe(true);
  });

  it("turns red when a deliberately colliding word is introduced", () => {
    // THE NEGATIVE FIXTURE. No collision exists today, so without this the
    // assertion above proves only that the union is currently clean — not that
    // the check would notice if it stopped being. "Complet" is a prefix of the
    // shipped analysis label "Complete"; a set-disjointness check would pass it.
    const collisions = prefixCollisions(everyOperatorWord(["Complet"]));
    expect(collisions.length).toBeGreaterThan(0);
    expect(
      collisions.some((c) => c.b === "Complete" || c.a === "Complete"),
    ).toBe(true);
  });

  it("the lifecycle terminal label is NOT the analysis vocabulary's near-twin", () => {
    // Stated as its own case because it is the one decision the whole guard was
    // built around, and a future edit "correcting" Finished to Completed would
    // otherwise fail in a case whose name does not explain why.
    expect(SCAN_LIFECYCLE_PRESENTATION.completed.label).toBe("Finished");
    expect(SCAN_LIFECYCLE_PRESENTATION.completed.label).not.toBe("Completed");
    expect(SCAN_STATE_PRESENTATION.done.label).toBe("Complete");
  });
});

describe("SCAN_LIFECYCLE_PRESENTATION is a Record over the closed vocabulary", () => {
  it("has exactly one entry per lifecycle state and nothing else", () => {
    expect(Object.keys(SCAN_LIFECYCLE_PRESENTATION).sort()).toEqual(
      [...SCAN_LIFECYCLE_STATES].sort(),
    );
  });

  it("is frozen, so a consumer cannot restyle the vocabulary at run time", () => {
    expect(Object.isFrozen(SCAN_LIFECYCLE_PRESENTATION)).toBe(true);
  });

  it("pairs every tone with a label — colour is never the sole carrier of meaning", () => {
    for (const state of SCAN_LIFECYCLE_STATES) {
      const presentation = SCAN_LIFECYCLE_PRESENTATION[state];
      expect(presentation.label.length).toBeGreaterThan(0);
      expect(presentation.toneClass).toMatch(/^text-/);
    }
  });

  it("uses the Caido colour roles and no hex literal", () => {
    // `--c-*` is operator-customisable, and a hardcoded colour survives their
    // theme change as the one unreadable element on the page.
    for (const state of SCAN_LIFECYCLE_STATES) {
      expect(SCAN_LIFECYCLE_PRESENTATION[state].toneClass).not.toContain("#");
    }
    expect(SCAN_LIFECYCLE_PRESENTATION.suspended.toneClass).toContain("info");
    expect(SCAN_LIFECYCLE_PRESENTATION.completed.toneClass).toContain(
      "success",
    );
    expect(SCAN_LIFECYCLE_PRESENTATION.running.toneClass).toContain("surface");
    expect(SCAN_LIFECYCLE_PRESENTATION.discarded.toneClass).toContain(
      "surface",
    );
  });

  it("its labels are the words scan-contract.ts renders for the same states", () => {
    // ONE DECISION, TWO READERS. The badge renders the map; the progress readout
    // renders the computed word. They must agree for the three states that have
    // both, or the toolbar and the Scan tab would disagree about the same scan.
    expect(SCAN_LIFECYCLE_PRESENTATION.running.label).toBe(
      SCAN_STATUS_SCANNING,
    );
    expect(SCAN_LIFECYCLE_PRESENTATION.suspended.label).toBe(
      SCAN_STATUS_SUSPENDED,
    );
    expect(SCAN_LIFECYCLE_PRESENTATION.completed.label).toBe(
      SCAN_STATUS_FINISHED,
    );
    expect(SCAN_LIFECYCLE_PRESENTATION.discarded.label).toBe(
      SCAN_STATUS_DISCARDED,
    );
  });
});

describe("ScanLifecycleBadge renders the tone and the word on ONE element", () => {
  it("carries its own marker, not the shipped status badge's", () => {
    const wrapper = mount(ScanLifecycleBadge, { props: { state: "running" } });
    expect(wrapper.attributes("data-defminer-scan-lifecycle")).toBeDefined();
    expect(wrapper.attributes("data-defminer-status-badge")).toBeUndefined();
  });

  it("puts the tone class and the label on the SAME element", () => {
    // They are not separable: an implementation that put the colour on a dot and
    // the word somewhere optional would let a later edit drop the word and keep
    // the dot — which is UI-09's silent-degradation defect with a different
    // shape.
    for (const state of SCAN_LIFECYCLE_STATES) {
      const wrapper = mount(ScanLifecycleBadge, { props: { state } });
      const presentation = SCAN_LIFECYCLE_PRESENTATION[state];
      expect(wrapper.text()).toBe(presentation.label);
      expect(wrapper.classes()).toContain(presentation.toneClass);
      expect(wrapper.classes()).toContain("font-semibold");
      expect(wrapper.classes()).toContain("whitespace-pre");
    }
  });

  it("renders no target-controlled content and takes no such prop", () => {
    // The prop is a member of a closed vocabulary and there is nothing else on
    // this component. R1/R2 have nothing to reach here — which is a property of
    // the component's SHAPE rather than a discipline.
    const wrapper = mount(ScanLifecycleBadge, {
      props: { state: "completed" },
    });
    expect(wrapper.attributes("title")).toBeUndefined();
    expect(wrapper.html()).not.toContain("<img");
    expect(wrapper.html()).not.toContain("href");
  });
});
