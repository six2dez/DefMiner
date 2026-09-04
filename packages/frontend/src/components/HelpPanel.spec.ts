// @vitest-environment jsdom
// packages/frontend/src/components/HelpPanel.spec.ts — the Help tab, and the
// numbers inside its prose.
//
// ===========================================================================
// WHAT IS ACTUALLY AT RISK HERE
// ===========================================================================
// Not rendering. A component with no props, no state and no RPC either mounts
// or does not, and one `it` settles that.
//
// The risk is that the PROSE STOPS BEING TRUE. This tab states three thresholds
// as plain English sentences an operator will believe, and the constants behind
// them are tuning knobs that have already moved once in this project's history.
// A test that re-typed "8 MiB" would go green on the day the ceiling changed and
// the sentence went wrong — the exact failure mode this repository has spent
// five verification rounds learning to gate against.
//
// So every numeric assertion below DERIVES its expected value from the same
// import the contract derives it from. Change `PASSIVE_MAX_BYTES` and this file
// keeps passing; change it and let the prose stop mentioning the new value, and
// this file fails.

import {
  MAP_MAX_BYTES,
  PASSIVE_MAX_BYTES,
  SCAN_PAGE_SIZE,
} from "@defminer/engine/thresholds";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import {
  HELP_FOOTER,
  HELP_HEADING,
  HELP_PURPOSE,
  HELP_SECTIONS,
} from "./help-contract";
import HelpPanel from "./HelpPanel.vue";

/** Every paragraph in the tab, as one string. The prose assertions read this. */
function allProse(): string {
  return HELP_SECTIONS.flatMap((s) => [s.heading, ...s.paragraphs]).join("\n");
}

describe("HelpPanel — it renders, and it cannot fail", () => {
  it("renders the heading, the purpose and every section", () => {
    const wrapper = mount(HelpPanel);
    const text = wrapper.text();

    expect(text).toContain(HELP_HEADING);
    expect(text).toContain(HELP_PURPOSE);
    expect(text).toContain(HELP_FOOTER);

    const sections = wrapper.findAll("[data-defminer-help-section]");
    expect(sections).toHaveLength(HELP_SECTIONS.length);
    for (const section of HELP_SECTIONS) {
      expect(text).toContain(section.heading);
      for (const paragraph of section.paragraphs) {
        expect(text).toContain(paragraph);
      }
    }
  });

  it("takes no props and mounts with no SDK, no backend and no provider", () => {
    // THE PROPERTY THAT MAKES THIS TAB WORTH HAVING. The operator most likely to
    // open Help is the one whose backend is not answering, so a Help tab that
    // needed the backend would be absent exactly when it is needed. `mount()`
    // with no `global.provide` is that operator's situation.
    expect(() => mount(HelpPanel)).not.toThrow();
    expect(HelpPanel.props ?? {}).toEqual({});
  });

  it("renders a single root element rather than a fragment", () => {
    // The trap safety/HighlightSlices.vue records: a comment node at the top of
    // a `<template>` makes the component a fragment and empties every
    // root-class assertion.
    const wrapper = mount(HelpPanel);
    expect(wrapper.element.nodeType).toBe(1);
    expect(wrapper.attributes("data-defminer-help")).toBeDefined();
  });
});

describe("HelpPanel — the prose stays true to the constants it describes", () => {
  // THE ROUND TRIP IS THE ASSERTION, not a re-typed figure. Each test reads the
  // MiB string out of the shipped prose, multiplies it back to bytes, and
  // requires the result to BE the constant. Retyping "8 MiB" here would go green
  // on the day the ceiling moved and the sentence went wrong, which is the whole
  // failure mode this block exists to prevent.
  function bytesStatedIn(prose: string, expected: number): number | null {
    const mib = String(expected / 1024 / 1024);
    const hit = prose.includes(`${mib} MiB`);
    return hit ? Number(mib) * 1024 * 1024 : null;
  }

  it("states the passive size ceiling as the value PASSIVE_MAX_BYTES actually holds", () => {
    expect(bytesStatedIn(allProse(), PASSIVE_MAX_BYTES)).toBe(
      PASSIVE_MAX_BYTES,
    );
  });

  it("states the source-map ceiling as the value MAP_MAX_BYTES actually holds", () => {
    // 2.5 MiB today — deliberately NOT asserted to be a whole number of MiB.
    // An integrality claim here was this spec's own first defect: it asserted a
    // property of the value rather than the agreement between value and prose.
    expect(bytesStatedIn(allProse(), MAP_MAX_BYTES)).toBe(MAP_MAX_BYTES);
  });

  it("states the scan page size as the value SCAN_PAGE_SIZE actually holds", () => {
    expect(allProse()).toContain(String(SCAN_PAGE_SIZE));
  });

  it("does not claim DefMiner finds secrets — the detectors are a later phase", () => {
    // A GUARD AGAINST A SPECIFIC, ALREADY-COMMITTED MISTAKE. `api/client.ts`
    // shipped "Could not load secrets" on the inventory error surface while no
    // secret detector existed anywhere in the plugin. This tab is the most
    // detailed description of DefMiner a user will read; it must not repeat it.
    const prose = allProse().toLowerCase();
    expect(prose).toContain("does not scan for secrets");
    expect(prose).not.toMatch(/\bfinds secrets\b|\bsecret scanner\b/);
  });

  it("says the two things that most often mislead a first-time operator", () => {
    const prose = allProse().toLowerCase();
    // A finished scan that admitted nothing, and proxy-only coverage. Both have
    // copy on their own surfaces, but only AFTER the operator is already
    // confused.
    expect(prose).toContain("admit nothing");
    expect(prose).toContain("proxy");
    expect(prose).toContain("scope");
  });
});
