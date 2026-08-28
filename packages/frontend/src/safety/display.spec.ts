// @vitest-environment jsdom
//
// Per-file, for the reason index.spec.ts states: vitest 4 removed
// `environmentMatchGlobs` and decision P2-D4 forbids a `projects` key.
//
// packages/frontend/src/safety/display.spec.ts — the ONE route from a
// target-controlled string to a template, and the slicing highlighter.
//
// R2's four steps are implemented ONCE, in packages/engine/src/sanitise.ts, and
// this module is a set of thin named wrappers over it. These specs are
// therefore not re-testing the pipeline — sanitise.spec.ts owns that — they
// test the three things a WRAPPER can get wrong: binding the wrong cap, leaking
// the untruncated source out through the returned object, and letting a caller
// reach a template by some route other than this one.
//
// THE STRIP PATTERNS ARE IMPORTED, NOT RESTATED. sanitise.ts exports
// C0_C1_CONTROLS and BIDI_OVERRIDES_ISOLATES with the reason written on the
// declaration: "the frontend's rendering gate and the backend's export
// serialiser can assert they strip the SAME range rather than each declaring
// their own. Two copies of a security rule drift." There is a second, harder
// reason here: `noInlineConfig: true` is set for packages/frontend/**, so a
// `// eslint-disable-next-line no-control-regex` in this package would be inert
// — a control-character regex literal cannot be written in the frontend at all.
//
// Adversarial characters in string literals are written as ESCAPES rather than
// literals, the same rule hostile.fixture.ts states: a literal C0 control or
// RIGHT-TO-LEFT OVERRIDE is invisible in every diff and every review tool.

import {
  BIDI_OVERRIDES_ISOLATES,
  C0_C1_CONTROLS,
  EVIDENCE_PANEL_MAX_GRAPHEMES,
  TABLE_CELL_MAX_GRAPHEMES,
} from "@defminer/engine/sanitise";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import {
  assertHighlightRanges,
  CELL_TEXT_CLASS,
  copyToClipboard,
  forCell,
  forPanel,
  HIGHLIGHT_CLASS,
  TABLE_ROW_HEIGHT_PX,
  truncationNotice,
} from "./display";
import HighlightSlices from "./HighlightSlices.vue";

/** A value that sits BETWEEN the two caps — the only length at which a bound
 *  cap and a defaulted one produce different answers. */
const BETWEEN_CAPS = "x".repeat(TABLE_CELL_MAX_GRAPHEMES + 100);

/**
 * Free of a whole pattern's matches.
 *
 * Written as `replace` rather than `test` on purpose: both imported patterns
 * carry the `g` flag, and a global regex's `test` is STATEFUL through
 * `lastIndex` — it answers differently on the second call. `replace` is not.
 */
const stripsToNothing = (value: string, pattern: RegExp): boolean =>
  value.replace(pattern, "") === value;

describe("forCell / forPanel — bound caps, no default", () => {
  it("returns exactly the three named keys and nothing else", () => {
    // R2 says the full value is never placed in the DOM, never in a title
    // attribute and never in a data attribute. The cheapest way to keep that
    // true is for the object the sink RECEIVES to not contain it at all — the
    // same assertion sanitise.spec.ts makes over the engine's own return, made
    // again here because a wrapper is exactly where an extra field gets added.
    for (const displayed of [forCell(BETWEEN_CAPS), forPanel(BETWEEN_CAPS)]) {
      expect(Object.keys(displayed).sort()).toEqual(["shown", "text", "total"]);
      expect(Object.getOwnPropertySymbols(displayed)).toEqual([]);
    }
    expect(JSON.stringify(forCell(BETWEEN_CAPS))).not.toContain(BETWEEN_CAPS);
  });

  it("binds a DIFFERENT cap per surface — a value between the two proves it", () => {
    const cell = forCell(BETWEEN_CAPS);
    const panel = forPanel(BETWEEN_CAPS);

    expect(cell.shown).toBe(TABLE_CELL_MAX_GRAPHEMES);
    expect(panel.shown).toBe(BETWEEN_CAPS.length);
    expect(cell.shown).not.toBe(panel.shown);
    // And neither is the other's cap by accident.
    expect(panel.shown).toBeLessThanOrEqual(EVIDENCE_PANEL_MAX_GRAPHEMES);
  });

  it("re-applies the STRIP step, so a value that arrived unstripped is still safe", () => {
    // Defence in depth, not duplication: the responsibility map puts truncation
    // on the backend and has the frontend re-assert it at the DOM sink. A value
    // that reached here with a bidi override still in it — because a future
    // endpoint forgot, or because the row was written before the rule existed —
    // must not render reversed in the hostname column (threat T-05-23).
    const hostile = "a\u0000b\u202Emoc.live\u202C";

    expect(stripsToNothing(forCell(hostile).text, C0_C1_CONTROLS)).toBe(true);
    expect(
      stripsToNothing(forCell(hostile).text, BIDI_OVERRIDES_ISOLATES),
    ).toBe(true);
    expect(stripsToNothing(forPanel(hostile).text, C0_C1_CONTROLS)).toBe(true);
    expect(
      stripsToNothing(forPanel(hostile).text, BIDI_OVERRIDES_ISOLATES),
    ).toBe(true);

    // The panel shows control characters as VISIBLE escapes rather than
    // removing them — R2 step 1's stated exception, and the whole reason
    // forPanel routes through forEvidence while forCell routes through
    // forDisplay. Two surfaces, two functions, one pipeline.
    expect(forPanel(hostile).text).toContain("\\0");
    expect(forCell(hostile).text).not.toContain("\\0");
  });

  it("at EXACTLY the cap reports shown === total and offers no affordance", () => {
    const exact = "c".repeat(TABLE_CELL_MAX_GRAPHEMES);
    const displayed = forCell(exact);
    expect(displayed.shown).toBe(displayed.total);
    expect(displayed.text).toBe(exact);
    expect(truncationNotice(displayed)).toBeUndefined();
  });

  it("ONE grapheme over the cap reports shown < total and copy carrying only the two numbers", () => {
    const over = "d".repeat(TABLE_CELL_MAX_GRAPHEMES + 1);
    const displayed = forCell(over);
    expect(displayed.shown).toBeLessThan(displayed.total);

    const notice = truncationNotice(displayed);
    expect(notice).toBe("Truncated at 256 of 257 characters.");
    // The rule that outranks the copy table: no sentence on this page ever
    // interpolates a target-controlled string. The notice is built from two
    // integers and DefMiner-authored words. Asserted against a RUN of the value
    // rather than a single character, because a single character of a
    // single-character value is also a letter of "Truncated" — an assertion
    // that fails on the correct implementation is not evidence of anything.
    expect(notice).not.toContain(over.slice(0, 4));
  });

  it("groups the digits without Intl, so the copy reads the same on every runtime", () => {
    expect(truncationNotice({ text: "", shown: 256, total: 4_194_304 })).toBe(
      "Truncated at 256 of 4,194,304 characters.",
    );
  });

  it("survives the degenerate empty value as an empty value, not a missing one", () => {
    // EDGE UISEC-01 / empty: the column keeps its position.
    expect(forCell("")).toEqual({ text: "", shown: 0, total: 0 });
    expect(truncationNotice(forCell(""))).toBeUndefined();
  });
});

describe("copyToClipboard — the affordance's whole mechanism", () => {
  it("writes the FULL value to the clipboard and puts nothing in the DOM", async () => {
    const written: string[] = [];
    const before = document.body.innerHTML;
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (value: string) => {
          written.push(value);
          return Promise.resolve();
        },
      },
    });

    const full = "e".repeat(TABLE_CELL_MAX_GRAPHEMES * 4);
    await copyToClipboard(full);

    expect(written).toEqual([full]);
    // The document is UNCHANGED. The `document.execCommand("copy")` fallback
    // works by putting the value into a textarea and selecting it, which is
    // exactly what R2 forbids — so there is no fallback.
    expect(document.body.innerHTML).toBe(before);
  });
});

describe("assertHighlightRanges — the precondition, not a silent repair", () => {
  it("accepts ascending, non-overlapping, in-bounds ranges", () => {
    expect(() =>
      assertHighlightRanges("abcdef", [
        { start: 0, end: 2 },
        { start: 4, end: 6 },
      ]),
    ).not.toThrow();
  });

  it("accepts two ranges that TOUCH at a boundary", () => {
    // EDGE UISEC-01 / adjacency: touching is legal and stays two ranges.
    expect(() =>
      assertHighlightRanges("abcdef", [
        { start: 0, end: 3 },
        { start: 3, end: 6 },
      ]),
    ).not.toThrow();
  });

  it("throws NAMING THE PAIR on unordered ranges", () => {
    expect(() =>
      assertHighlightRanges("abcdefgh", [
        { start: 5, end: 8 },
        { start: 2, end: 4 },
      ]),
    ).toThrow(/\[5, 8\][\s\S]*\[2, 4\]/);
  });

  it("throws NAMING THE PAIR on overlapping ranges", () => {
    expect(() =>
      assertHighlightRanges("abcdefgh", [
        { start: 0, end: 5 },
        { start: 3, end: 7 },
      ]),
    ).toThrow(/\[0, 5\][\s\S]*\[3, 7\]/);
  });

  it("throws on a range past the end of the DISPLAY text", () => {
    // The offsets arrive in the backend's BYTE space; the display text has been
    // grapheme-truncated. This is the assertion that turns that mismatch into a
    // loud failure instead of an off-by-a-grapheme highlight.
    expect(() => assertHighlightRanges("abc", [{ start: 1, end: 9 }])).toThrow(
      /\[1, 9\]/,
    );
  });
});

describe("HighlightSlices — three plain strings, never a markup string", () => {
  const children = (root: Element): Element[] => [...root.children];

  it("renders 2n+1 sibling elements for n ranges", () => {
    const wrapper = mount(HighlightSlices, {
      props: {
        text: "alpha bravo charlie delta",
        ranges: [
          { start: 0, end: 5 },
          { start: 12, end: 19 },
        ],
      },
    });
    expect(children(wrapper.element)).toHaveLength(5);
    expect(wrapper.text()).toContain("alpha");
    expect(wrapper.text()).toContain("charlie");
  });

  it("renders exactly one element for zero ranges, holding the whole value", () => {
    const wrapper = mount(HighlightSlices, {
      props: { text: "alpha bravo", ranges: [] },
    });
    expect(children(wrapper.element)).toHaveLength(1);
    expect(wrapper.text()).toBe("alpha bravo");
  });

  it("keeps two TOUCHING ranges as two separate match elements", () => {
    // EDGE UISEC-01 / adjacency: merging them would make the offsets
    // unauditable against what the backend supplied.
    const wrapper = mount(HighlightSlices, {
      props: {
        text: "abcdef",
        ranges: [
          { start: 0, end: 3 },
          { start: 3, end: 6 },
        ],
      },
    });
    const highlighted = children(wrapper.element).filter((child): boolean =>
      String(child.className).includes(HIGHLIGHT_CLASS),
    );
    expect(highlighted).toHaveLength(2);
    expect(highlighted[0]?.textContent).toBe("abc");
    expect(highlighted[1]?.textContent).toBe("def");
  });

  it("marks ONLY the match elements", () => {
    const wrapper = mount(HighlightSlices, {
      props: { text: "abcdef", ranges: [{ start: 2, end: 4 }] },
    });
    const kids = children(wrapper.element);
    expect(kids.map((k) => k.textContent)).toEqual(["ab", "cd", "ef"]);
    expect(kids.map((k) => k.className.includes(HIGHLIGHT_CLASS))).toEqual([
      false,
      true,
      false,
    ]);
  });

  it("gives every rendered element the monospace and fixed-row rules", () => {
    const wrapper = mount(HighlightSlices, {
      props: { text: "a\nb", ranges: [{ start: 0, end: 1 }] },
    });
    for (const element of [wrapper.element, ...children(wrapper.element)]) {
      for (const required of CELL_TEXT_CLASS.split(" ")) {
        expect(
          element.className,
          `a rendered element is missing \`${required}\`; a value containing a newline would grow the fixed ${String(TABLE_ROW_HEIGHT_PX)}px row and break the recycling scroller's geometry`,
        ).toContain(required);
      }
    }
  });

  it("renders slices as TEXT NODES — no element comes from the value", () => {
    // The assertion that distinguishes slicing from concatenation. A `<mark>`
    // built by concatenation and rendered would produce an element here.
    const wrapper = mount(HighlightSlices, {
      props: {
        text: "<img src=x onerror=alert(1)>",
        ranges: [{ start: 0, end: 4 }],
      },
    });
    expect(wrapper.element.querySelectorAll("img")).toHaveLength(0);
    expect(wrapper.text()).toContain("<img src=x onerror=alert(1)>");
    for (const child of children(wrapper.element)) {
      for (const node of child.childNodes) {
        expect(node.nodeType).toBe(3); // Node.TEXT_NODE
      }
    }
  });

  it("fails loudly on unordered ranges rather than silently reordering", () => {
    expect(() =>
      mount(HighlightSlices, {
        props: {
          text: "abcdefgh",
          ranges: [
            { start: 5, end: 8 },
            { start: 2, end: 4 },
          ],
        },
      }),
    ).toThrow(/\[5, 8\][\s\S]*\[2, 4\]/);
  });
});

describe("TABLE_ROW_HEIGHT_PX — one number, one place", () => {
  it("is the 32px `h-8` App.vue's rows are already fixed at", () => {
    // 05-07's RecycleScroller needs a FIXED item size to compute scroll
    // geometry. It reads this constant rather than restating 32, and
    // hostile.spec.ts asserts against the same one — a second copy is how the
    // scroller and the row come to disagree by four pixels.
    expect(TABLE_ROW_HEIGHT_PX).toBe(32);
  });
});
