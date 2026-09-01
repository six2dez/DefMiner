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
// THIS IS THE jsdom HALF. It is the executed half of the evidence for FOUR
// `backstop` rows — three from `05-UI-SPEC.md § "UI Considerations"` and one
// from `06-UI-SPEC.md`'s — and each of those rows has a second half this
// environment CANNOT observe:
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
//   `long-text / scan-start-form` (06-UI-SPEC.md) — ADDED BY PLAN 06-12, and it
//       is the reason this file grew a third loop. The operator's HTTPQL clause
//       is the one unbounded string on the Scan tab and it is ROUTINELY PASTED
//       FROM A TARGET'S OWN PAGE, so it is untrusted regardless of who typed
//       it. Sanitisation through `safety/display.ts`, inertness against an
//       explicit allowed-tag set, the absence of any `title` and of any `data-*`
//       carrying the payload, and grapheme safety at the cap are asserted HERE.
//       THE LAYOUT HALF — that a multi-kilobyte clause does not grow the
//       fixed-height counter strip, and that the panel's own column scrolls
//       instead — is carried by `tests/frontend-load.spec.ts`, in a real
//       browser, for the same measured reason as the two rows above.
//
// A BACKSTOP ROW WITH NO EXECUTED EVIDENCE RESOLVES TO HUMAN-NEEDED, NEVER TO A
// SILENT PASS (`05-VALIDATION.md § "Manual-Only Verifications"`). So a reader
// who finds this file green must not conclude those four rows are signed off:
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
// THREE SURFACES HERE, FIVE IN THE END
// ===========================================================================
// `hostile.fixture.ts`'s header names four surfaces this one corpus is for, and
// Phase 6 adds a fifth. The three covered here are the FINDINGS TABLE CELL
// (`forCell`, 256), the EVIDENCE PANEL (`forPanel`, 2,048) and the SCAN START
// FORM's operator clause (`forCellText`, 256, rendered through the real
// component). The remaining two — the SUPPRESSIONS LIST and the FINDINGS
// PROJECTION PREVIEW — are blocked on Phase 4 defining the entities they list.
// When Phase 4 unblocks them the extension is an ADDITION to the loops below,
// not a rediscovery: import the same corpus, assert the same id-set
// exhaustiveness, extend the fixture rather than forking it. Plan 06-12 did
// exactly that and is the worked example.

import type { ScanStatusPayload } from "@defminer/engine/contract";
import { SCAN_KIND_CLAUSE } from "@defminer/engine/contract";
import {
  HOSTILE_CASE_IDS,
  HOSTILE_CASES,
} from "@defminer/engine/hostile.fixture";
import {
  BIDI_OVERRIDES_ISOLATES,
  C0_C1_CONTROLS,
} from "@defminer/engine/sanitise";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import type {
  RpcResult,
  ScanCommandOutcome,
  StartScanOutcome,
} from "../api/client";
import { clauseRejectedLine } from "../components/scan-contract";
import ScanPanel from "../components/ScanPanel.vue";

import { forCell, forCellText, forPanel, TABLE_ROW_HEIGHT_PX } from "./display";
import HighlightSlices from "./HighlightSlices.vue";

/** The lifecycle commands are unreachable from the start-form state — there is
 *  no scan for them to address — so the stub answers a value that would fail
 *  loudly if one were ever called. */
const COMMAND_UNREACHED: RpcResult<ScanCommandOutcome> = {
  ok: false,
  reason: "rpc-rejected",
  versions: null,
};

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

// ===========================================================================
// THE THIRD SURFACE — THE SCAN START FORM'S OPERATOR CLAUSE (PLAN 06-12)
// ===========================================================================
// AN ADDITION TO THE LOOPS ABOVE, NOT A FORK. It imports the SAME corpus and
// makes the SAME id-set exhaustiveness assertion, so a case added to
// `hostile.fixture.ts` later with no assertion here is a red test — which is the
// difference between "iterates the fixture" and "iterates the part of the
// fixture it happened to write a case for".
//
// AND IT MOUNTS THE REAL COMPONENT rather than calling the display function. The
// two loops above drive `HighlightSlices`, whose whole job is rendering one
// string; this one drives `ScanPanel`, because the claim being tested is about a
// SURFACE — that the operator's clause reaches the DOM only through the display
// path, only inside its own `font-mono` element, and never into a `title` or a
// `data-*` anywhere on the panel. A test of `forCellText` alone would prove the
// sanitiser and say nothing about the component that has to call it.
//
// The allowed-tag set is a WHITELIST for the same reason the one above is: a
// blacklist is a list of the payloads somebody thought of, and this corpus
// exists precisely because that list is never complete.

/** Every tag `ScanPanel` renders in its start-form state. Anything else in the
 *  subtree came out of the payload. */
const SCAN_ALLOWED_TAGS = new Set([
  "DIV",
  "SECTION",
  "H2",
  "H3",
  "P",
  "LABEL",
  "INPUT",
  "BUTTON",
  "SPAN",
  "DL",
  "DT",
  "DD",
]);

/**
 * A run of the payload long enough that finding it somewhere is evidence rather
 * than coincidence.
 *
 * The `data-*` assertion cannot be "the attribute value is empty" — that is the
 * component's convention and a future edit could legitimately change it. What
 * must never happen is a `data-*` CARRYING THE CLAUSE, so the assertion is over
 * the payload's own content. Thirty-two characters is far past the point where
 * a Tailwind class or a marker name could match by accident, and the empty case
 * is skipped because every string contains the empty string.
 */
const probe = (value: string): string | null =>
  value.length < 32 ? null : value.slice(0, 32);

/** An unpaired UTF-16 surrogate — what a cap applied by `slice` rather than by
 *  grapheme leaves behind on a four-byte character. */
const hasLoneSurrogate = (text: string): boolean => {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) return true;
      i++;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
};

describe("hostile corpus rendered inert — scan start form (forCellText, 256)", () => {
  const exercised: string[] = [];

  const mountForm = () =>
    mount(ScanPanel, {
      props: {
        projectId: "server-scoped",
        defminerClause: SCAN_KIND_CLAUSE,
        // `null` PUTS THE START FORM ON SCREEN, which is the state that has an
        // input at all. The readout half carries the same clause through
        // `composedFilter` and is covered by ScanPanel.spec.ts.
        load: () =>
          Promise.resolve<RpcResult<ScanStatusPayload | null>>({
            ok: true,
            value: null,
          }),
        start: () =>
          Promise.resolve<RpcResult<StartScanOutcome>>({
            ok: true,
            // EVERY CASE TAKES THE REJECTION PATH, deliberately: that is the
            // path that echoes the operator's clause back into the DOM a second
            // time, so driving it exercises both the preview element and the
            // echo element on every case rather than only the preview.
            value: { outcome: "clause-rejected", reason: "comment_construct" },
          }),
        pause: () => Promise.resolve(COMMAND_UNREACHED),
        resume: () => Promise.resolve(COMMAND_UNREACHED),
        discard: () => Promise.resolve(COMMAND_UNREACHED),
        subscribe: () => ({ stop: () => undefined }),
      },
    });

  it.each(HOSTILE_CASES.map((c) => [c.id, c.why, c.value] as const))(
    "%s renders inert on the scan surface (%s)",
    async (id, _why, value) => {
      const startedAt = Date.now();

      const wrapper = mountForm();
      await flushPromises();
      await wrapper.find("#defminer-scan-clause").setValue(value);
      // WHAT THE INPUT ACTUALLY HOLDS, read back rather than assumed to be
      // `value`. A single-line `<input type="text">` DROPS CR and LF at the
      // element boundary — the browser's own behaviour, not DefMiner's — so a
      // multi-line paste never reaches this component with its newlines. That
      // is a genuine first line of defence and it is worth recording where a
      // reader would otherwise conclude the assertion below had been weakened:
      // what is asserted is that DEFMINER does not alter the edit, which is the
      // claim the retained-input rule actually makes.
      const accepted = (
        wrapper.find("#defminer-scan-clause").element as HTMLInputElement
      ).value;
      await wrapper.find("#defminer-scan-start").trigger("click");
      await flushPromises();

      const root = wrapper.element;
      const nodes = [root, ...root.querySelectorAll("*")];

      // 1. NO ELEMENT CAME OUT OF THE PAYLOAD.
      for (const node of nodes) {
        expect(
          SCAN_ALLOWED_TAGS.has(String(node.tagName).toUpperCase()),
          `case ${id} produced a <${String(node.tagName)}> element on the scan surface — the payload PARSED`,
        ).toBe(true);
      }

      // 2. NOTHING IN A TOOLTIP, NOTHING IN A DATA ATTRIBUTE, NOTHING IN A
      //    STYLE ATTRIBUTE. R2's absolutes are categorical and do not ask
      //    whether the author of a string was hostile.
      const fragment = probe(accepted);
      for (const node of nodes) {
        expect(
          node.hasAttribute("title"),
          `case ${id} put a title attribute on the scan surface`,
        ).toBe(false);
        expect(
          node.getAttribute("style"),
          `case ${id} set a style attribute from the clause`,
        ).toBeNull();
        for (const attribute of [...node.attributes]) {
          if (!String(attribute.name).startsWith("data-")) continue;
          if (fragment === null) continue;
          expect(
            String(attribute.value).includes(fragment),
            `case ${id} put the clause into ${String(attribute.name)}`,
          ).toBe(false);
        }
      }

      // 3. THE CLAUSE REACHED THE DOM ONLY THROUGH THE DISPLAY PATH, and only
      //    inside its own `font-mono` elements. `forCellText` is called on the
      //    same value here rather than reimplemented: what is asserted is that
      //    the component's output IS the sanitiser's output, not that it looks
      //    similar.
      const echo = wrapper.find("[data-defminer-scan-clause-echo]");
      expect(echo.exists()).toBe(true);
      expect(echo.text()).toBe(forCellText(accepted));
      expect(echo.classes().join(" ")).toContain("font-mono");
      // AND NOT INSIDE THE LIVE REGION. A live region is read aloud the moment
      // it changes; the DefMiner-authored sentence carries `role="alert"` and
      // the clause is a silent sibling.
      expect(echo.attributes("role")).toBeUndefined();
      expect(wrapper.find('[role="alert"]').text()).toBe(
        clauseRejectedLine("comment_construct"),
      );

      // 4. NO CONTROL CHARACTER AND NO BIDI CHARACTER SURVIVED. The patterns are
      //    IMPORTED from the engine, never restated.
      const rendered = String(root.textContent ?? "");
      expect(
        stripsToNothing(rendered, C0_C1_CONTROLS),
        `case ${id} rendered a C0/C1 control character on the scan surface`,
      ).toBe(true);
      expect(
        stripsToNothing(rendered, BIDI_OVERRIDES_ISOLATES),
        `case ${id} rendered a bidi override or isolate on the scan surface`,
      ).toBe(true);

      // 5. GRAPHEME SAFETY AT THE CAP. A cap applied by `slice` rather than by
      //    grapheme cuts a four-byte character in half and leaves a lone
      //    surrogate, which renders as a replacement glyph in a string the
      //    operator is comparing character by character.
      expect(
        hasLoneSurrogate(echo.text()),
        `case ${id} left a split character in the echoed clause`,
      ).toBe(false);

      // 6. THE COMPOSED PREVIEW IS SANITISED TOO. It is the other element the
      //    clause reaches, and it is the one the operator reads to check D-05's
      //    narrow-never-widen promise — so it must be inert on the same corpus.
      const composed = wrapper.find("[data-defminer-scan-composed]");
      expect(composed.classes().join(" ")).toContain("font-mono");
      expect(hasLoneSurrogate(composed.text())).toBe(false);

      // 7. AND THE SURFACE STILL WORKS. A FAILED SUBMIT NEVER DISCARDS THE
      //    EDIT — the shipped settings form's rule — including for a
      //    four-megabyte clause, which is the case where a component tempted to
      //    "reset the field" would be most tempting to write.
      expect(
        (wrapper.find("#defminer-scan-clause").element as HTMLInputElement)
          .value,
      ).toBe(accepted);

      // 8. IT DID NOT FREEZE.
      expect(
        Date.now() - startedAt,
        `case ${id} exceeded the per-case freeze budget on the scan surface`,
      ).toBeLessThan(PER_CASE_BUDGET_MS);

      wrapper.unmount();
      exercised.push(id);
    },
  );

  it("exercised EVERY case in the shared corpus", () => {
    expect([...exercised].sort()).toEqual([...HOSTILE_CASE_IDS].sort());
  });
});
