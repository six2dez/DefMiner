// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// packages/frontend/src/components/source-producibility-presentation.spec.ts —
// the THIRD status vocabulary, its renderer, and the rule that the common
// member renders nothing at all.
//
// The cross-vocabulary PREFIX guard is NOT here. It lives in
// `scan-lifecycle-presentation.spec.ts`, extended to a third map rather than
// forked into a second guard — two guards over overlapping unions is how one of
// them comes to cover a word the other one dropped, and neither owner notices.
// This file owns what is true of THIS map alone.

import { SOURCE_PRODUCIBILITY_STATES } from "@defminer/engine/contract";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ProducibilityMark from "./ProducibilityMark.vue";
import { SOURCE_PRODUCIBILITY_PRESENTATION } from "./source-producibility-presentation";

describe("SOURCE_PRODUCIBILITY_PRESENTATION is a Record over the closed vocabulary", () => {
  it("has exactly one entry per producibility state and nothing else", () => {
    // THE WHOLE MECHANISM. A fourth member added to the vocabulary without a
    // row here is a typecheck error, and a row here for a member that no longer
    // exists is an excess key — also an error. This assertion is the run-time
    // half, which catches the case the compiler cannot: a key added by a
    // widening cast.
    expect(Object.keys(SOURCE_PRODUCIBILITY_PRESENTATION).sort()).toEqual(
      [...SOURCE_PRODUCIBILITY_STATES].sort(),
    );
  });

  it("is frozen, so a consumer cannot restyle the vocabulary at run time", () => {
    expect(Object.isFrozen(SOURCE_PRODUCIBILITY_PRESENTATION)).toBe(true);
  });

  it("renders NOTHING AT ALL for the ordinary member — no word and no tone", () => {
    // 07-UI-SPEC.md § "Three Vocabularies Now" mechanism 5, replacement
    // requirement 4. A vocabulary whose COMMON member is invisible cannot be
    // confused with one whose every member is visible, and it keeps the tree
    // quiet enough for a tombstone to be legible when one appears.
    expect(SOURCE_PRODUCIBILITY_PRESENTATION.producible.label).toBeNull();
    expect(SOURCE_PRODUCIBILITY_PRESENTATION.producible.toneClass).toBeNull();
  });

  it("uses the two words the contract fixes, and no others", () => {
    expect(SOURCE_PRODUCIBILITY_PRESENTATION.gone.label).toBe("Gone");
    expect(SOURCE_PRODUCIBILITY_PRESENTATION.changed.label).toBe("Changed");
    // The three that were REJECTED against the analysis vocabulary's
    // **Partial**, named so a future edit "improving" the wording fails in a
    // case that explains why.
    const words = Object.values(SOURCE_PRODUCIBILITY_PRESENTATION).map(
      (presentation) => presentation.label,
    );
    expect(words).not.toContain("Missing");
    expect(words).not.toContain("Lost");
    expect(words).not.toContain("Incomplete");
  });

  it("pairs a tone with a word, or neither — colour is never the sole carrier", () => {
    // The nullability is PAIRED in the type, so a tone with no word is not
    // representable. This is the run-time restatement of that, over every row.
    for (const state of SOURCE_PRODUCIBILITY_STATES) {
      const presentation = SOURCE_PRODUCIBILITY_PRESENTATION[state];
      expect(presentation.label === null).toBe(presentation.toneClass === null);
      if (presentation.label !== null) {
        expect(presentation.label.length).toBeGreaterThan(0);
        expect(presentation.toneClass).toMatch(/^text-/);
      }
    }
  });

  it("consumes NO chromatic role and carries no hex literal", () => {
    // The informational and degradation roles belong to the ANALYSIS
    // vocabulary. Painting a producibility state with the analysis vocabulary's
    // degradation colour is the cross-vocabulary confusion the two-vocabularies
    // essay spends thirty lines refusing.
    for (const state of SOURCE_PRODUCIBILITY_STATES) {
      const tone = SOURCE_PRODUCIBILITY_PRESENTATION[state].toneClass;
      if (tone === null) continue;
      expect(tone).not.toContain("#");
      expect(tone).toContain("surface");
      expect(tone).not.toContain("danger");
      expect(tone).not.toContain("info");
      expect(tone).not.toContain("success");
      expect(tone).not.toContain("primary");
    }
  });
});

describe("ProducibilityMark — its own renderer, its own marker", () => {
  it("renders an EMPTY SUBTREE for the ordinary member", () => {
    // Asserted as an empty rendered subtree rather than as an empty string: a
    // span containing "" is still an element, still occupies the row's flex
    // gap, and is still something a later edit can put a word back into.
    const wrapper = mount(ProducibilityMark, {
      props: { producibility: "producible" },
    });
    expect(wrapper.findAll("*").length).toBe(0);
    expect(wrapper.find("[data-defminer-source-producibility]").exists()).toBe(
      false,
    );
    expect(wrapper.text()).toBe("");
  });

  it("carries its OWN marker, not either shipped badge's", () => {
    for (const state of ["gone", "changed"] as const) {
      const wrapper = mount(ProducibilityMark, {
        props: { producibility: state },
      });
      const mark = wrapper.find("[data-defminer-source-producibility]");
      expect(mark.exists()).toBe(true);
      expect(wrapper.find("[data-defminer-status-badge]").exists()).toBe(false);
      expect(wrapper.find("[data-defminer-scan-lifecycle]").exists()).toBe(
        false,
      );
    }
  });

  it("puts the tone class and the word on the SAME element", () => {
    // Not separable: an implementation that put the colour on a dot and the
    // word somewhere optional would let a later edit drop the word and keep the
    // dot, which is the silent-degradation defect with a different shape.
    for (const state of ["gone", "changed"] as const) {
      const wrapper = mount(ProducibilityMark, {
        props: { producibility: state },
      });
      const presentation = SOURCE_PRODUCIBILITY_PRESENTATION[state];
      expect(wrapper.text()).toBe(presentation.label);
      expect(wrapper.classes()).toContain(presentation.toneClass);
      expect(wrapper.classes()).toContain("whitespace-pre");
    }
  });

  it("renders no target-controlled content and takes no such prop", () => {
    // The prop is a member of a closed vocabulary and there is nothing else on
    // this component. R1/R2 have nothing to reach here — a property of the
    // component's SHAPE rather than a discipline.
    const wrapper = mount(ProducibilityMark, {
      props: { producibility: "gone" },
    });
    expect(wrapper.attributes("title")).toBeUndefined();
    expect(wrapper.html()).not.toContain("<img");
    expect(wrapper.html()).not.toContain("href");
  });
});
