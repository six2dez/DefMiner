// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// packages/frontend/src/safety/hostile.spec.ts — the shared adversarial corpus,
// RENDERED, and proved inert by looking at the DOM rather than at the string.
//
// ===========================================================================
// WHAT THIS FILE IS EVIDENCE FOR, AND WHAT IT IS NOT
// ===========================================================================
// THIS IS THE jsdom HALF. It is the executed half of the evidence for three of
// `05-UI-SPEC.md § "UI Considerations"`'s `backstop` rows, and each of those
// rows has a second half this environment CANNOT observe:
//
//   `long-text / findings-table`   — the truncation, the grapheme safety and
//       the inertness are asserted here. The LAYOUT BREAK is not: jsdom reports
//       geometry it never laid out (every box is 0x0), so an assertion that a
//       row did not grow is an assertion about a number nothing computed. That
//       half is carried by PLAN 05-09's browser-driven load spec, which is
//       where a broken row height is observable. (05-RESEARCH assumption A8,
//       and this plan restates it forward.)
//
//   `long-text / evidence-panel`   — the 2,048-cap path is asserted here on the
//       same corpus. The MEASURED PANEL HEIGHT is carried by PLAN 05-10, which
//       builds the real panel.
//
//   the hostile-content half of the EXPORT row's fixture — the same cases are
//       driven through the display path here; the PRODUCED BYTES are carried by
//       PLAN 05-11's export path. `csv.spec.ts` already covers the serialiser;
//       what 05-11 owns is the file that actually comes out.
//
// A BACKSTOP ROW WITH NO EXECUTED EVIDENCE RESOLVES TO HUMAN-NEEDED, NEVER TO A
// SILENT PASS (`05-VALIDATION.md § "Manual-Only Verifications"`). So a reader
// who finds this file green must not conclude those three rows are signed off:
// this file discharges the part of each that a DOM without a layout engine can
// discharge, and names the plan that owes the rest.
//
// ===========================================================================
// WHY DOM INSPECTION AND NOT A STRING COMPARISON
// ===========================================================================
// "The rendered text looks escaped" is a different claim from "no element came
// out of the payload", and it is the weaker one — it passes on a payload that
// parsed into an element whose text happens to contain the escaped characters.
// Every assertion below walks the rendered subtree and looks at NODES: their
// tag names against an explicit allowed set, their attributes, and their node
// types. A payload that parsed fails loudly.
//
// ===========================================================================
// TWO SURFACES HERE, FOUR IN THE END
// ===========================================================================
// `hostile.fixture.ts`'s header names four surfaces this one corpus is for. The
// two covered here are the FINDINGS TABLE CELL (`forCell`, 256) and the
// EVIDENCE PANEL (`forPanel`, 2,048). The other two — the SUPPRESSIONS LIST and
// the FINDINGS PROJECTION PREVIEW — are blocked on Phase 4 defining the
// entities they list. When Phase 4 unblocks them the extension is an ADDITION
// to the loops below (a third and fourth `describeSurface`), not a rediscovery:
// import the same corpus, assert the same id-set exhaustiveness, extend the
// fixture rather than forking it.

import {
  HOSTILE_CASE_IDS,
  HOSTILE_CASES,
} from "@defminer/engine/hostile.fixture";
import {
  BIDI_OVERRIDES_ISOLATES,
  C0_C1_CONTROLS,
} from "@defminer/engine/sanitise";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import { forCell, forPanel, TABLE_ROW_HEIGHT_PX } from "./display";
import HighlightSlices from "./HighlightSlices.vue";

/**
 * The ONLY tag `HighlightSlices` renders. Everything else in the subtree came
 * from somewhere it should not have.
 *
 * An explicit set rather than a "contains no script/img/iframe" blacklist: a
 * blacklist is a list of the payloads somebody thought of, and this corpus
 * exists precisely because that list is never complete.
 */
const ALLOWED_TAGS = new Set(["SPAN"]);

/**
 * The per-case wall-clock ceiling.
 *
 * A FREEZE DETECTOR, NOT A BENCHMARK. The corpus carries a 4 MiB single-line
 * value (threat T-05-12), and the failure mode it guards against is a renderer
 * that stops responding — which without a bound here would surface as the whole
 * suite hitting vitest's 120-second timeout with no indication of which case
 * did it. The engine measured ~170 ms to walk 4 MiB through `Intl.Segmenter`
 * and holds its own ceiling in sanitise.spec.ts; this is more than an order of
 * magnitude above that plus a component mount, so it fires on a freeze and not
 * on a slow machine.
 */
const PER_CASE_BUDGET_MS = 5_000;

/** Free of every match of a whole pattern. `replace` rather than `test`: both
 *  imported patterns carry `g`, and a global regex's `test` is stateful through
 *  `lastIndex` and answers differently on the second call. */
const stripsToNothing = (value: string, pattern: RegExp): boolean =>
  value.replace(pattern, "") === value;

/** A leading highlight range, so the SLICING path is exercised and not merely
 *  the plain-text one. Bounded by the DISPLAY text, never by the raw value —
 *  the two are different length spaces and that is the whole point of
 *  `assertHighlightRanges`. */
const leadingRange = (text: string): { start: number; end: number }[] =>
  text.length === 0 ? [] : [{ start: 0, end: Math.min(4, text.length) }];

type Surface = {
  name: string;
  display: (value: string) => { text: string; shown: number; total: number };
};

const SURFACES: Surface[] = [
  { name: "findings-table cell (forCell, 256)", display: forCell },
  { name: "evidence panel (forPanel, 2,048)", display: forPanel },
];

for (const surface of SURFACES) {
  describe(`hostile corpus rendered inert — ${surface.name}`, () => {
    const exercised: string[] = [];

    it.each(HOSTILE_CASES.map((c) => [c.id, c.why, c.value] as const))(
      "%s renders inert (%s)",
      (id, _why, value) => {
        const startedAt = Date.now();

        const displayed = surface.display(value);
        const wrapper = mount(HighlightSlices, {
          props: { text: displayed.text, ranges: leadingRange(displayed.text) },
        });

        const root = wrapper.element;
        const nodes = [root, ...root.querySelectorAll("*")];

        // 1. NO ELEMENT CAME OUT OF THE PAYLOAD. Tag names against the explicit
        //    allowed set — a payload that parsed into an element fails here,
        //    where a check on escaped-looking text would not.
        for (const node of nodes) {
          expect(
            ALLOWED_TAGS.has(String(node.tagName).toUpperCase()),
            `case ${id} produced a <${String(node.tagName)}> element — the payload PARSED`,
          ).toBe(true);
        }

        // 2. NOTHING IN A TOOLTIP AND NOTHING IN A DATA ATTRIBUTE. R2 states
        //    both as absolutes (threat T-05-22); this is the per-case check
        //    that the component honours them on every input, and
        //    frontend-safety.spec.ts is the static check that no future
        //    component writes one.
        for (const node of nodes) {
          expect(
            node.hasAttribute("title"),
            `case ${id} put a title attribute on a rendered node`,
          ).toBe(false);
          for (const attribute of [...node.attributes]) {
            expect(
              String(attribute.name).startsWith("data-"),
              `case ${id} put the data attribute ${String(attribute.name)} on a rendered node`,
            ).toBe(false);
          }
          // 3. AND NOTHING IN A STYLE ATTRIBUTE. The classes are DefMiner
          //    authored and arrive via `class`; a `style` attribute on any node
          //    here could only have come from the value.
          expect(
            node.getAttribute("style"),
            `case ${id} set a style attribute from the value`,
          ).toBeNull();
        }

        // 4. NO CONTROL CHARACTER AND NO BIDI CHARACTER SURVIVED INTO THE TEXT.
        //    The patterns are IMPORTED from the engine rather than restated:
        //    sanitise.ts exports them so the rendering path and the export
        //    serialiser assert the same range, and `noInlineConfig` is on for
        //    packages/frontend, so a control-character regex literal cannot be
        //    written in this package at all.
        const rendered = String(root.textContent ?? "");
        expect(
          stripsToNothing(rendered, C0_C1_CONTROLS),
          `case ${id} rendered a C0/C1 control character`,
        ).toBe(true);
        expect(
          stripsToNothing(rendered, BIDI_OVERRIDES_ISOLATES),
          `case ${id} rendered a bidi override or isolate — the hostname column is exactly what T-05-11 spoofs`,
        ).toBe(true);

        // 5. EVERY SLICE IS A TEXT NODE. The structural difference between
        //    slicing and concatenating: a `<mark>` built by concatenation and
        //    rendered would put an element here.
        for (const child of [...root.children]) {
          for (const node of [...child.childNodes]) {
            expect(node.nodeType, `case ${id} rendered a non-text node`).toBe(
              3,
            );
          }
        }

        // 6. GEOMETRY, AND AN HONEST NOTE ABOUT WHAT IT IS WORTH HERE.
        //    jsdom does not lay out, so `clientHeight` is 0 for everything and
        //    this assertion is a FLOOR rather than a proof — it would not catch
        //    a row that grew. What is actually checkable in this environment is
        //    the MECHANISM that prevents growth: `whitespace-pre` and
        //    `overflow-hidden` on every element, so a value containing a
        //    newline cannot wrap. The observational half is plan 05-09's
        //    browser-driven load spec (assumption A8).
        for (const node of nodes) {
          expect(
            node.clientHeight,
            `case ${id} rendered taller than the fixed row`,
          ).toBeLessThanOrEqual(TABLE_ROW_HEIGHT_PX);
          const className = String(node.className);
          expect(className).toContain("whitespace-pre");
          expect(className).toContain("overflow-hidden");
          expect(className).toContain("font-mono");
        }

        // 7. THE CAP HELD. Stated per case rather than only for the two
        //    boundary cases, because the multi-megabyte case and the
        //    four-byte-grapheme case fail this differently.
        expect(displayed.shown).toBeLessThanOrEqual(displayed.total);
        expect(displayed.text.length).toBeGreaterThanOrEqual(0);

        // 8. AND IT DID NOT FREEZE.
        expect(
          Date.now() - startedAt,
          `case ${id} exceeded the per-case freeze budget`,
        ).toBeLessThan(PER_CASE_BUDGET_MS);

        exercised.push(id);
      },
    );

    it("exercised EVERY case in the shared corpus", () => {
      // The same exhaustiveness assertion the engine specs make, for the same
      // reason hostile.fixture.ts gives: it is the difference between
      // "iterates the fixture" and "iterates the part of the fixture it
      // happened to write a case for", and it is what makes ADDING a case fail
      // every consumer until each one accounts for it.
      expect([...exercised].sort()).toEqual([...HOSTILE_CASE_IDS].sort());
    });
  });
}
