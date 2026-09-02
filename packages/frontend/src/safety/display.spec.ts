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

import { readFileSync } from "node:fs";

import {
  BIDI_OVERRIDES_ISOLATES,
  C0_C1_CONTROLS,
  EVIDENCE_PANEL_MAX_GRAPHEMES,
  SOURCE_LINE_MAX_GRAPHEMES,
  TABLE_CELL_MAX_GRAPHEMES,
} from "@defminer/engine/sanitise";
import {
  SOURCES_LABEL_CASE_IDS,
  SOURCES_LABEL_CASES,
} from "@defminer/engine/sourcemap/map-fixture";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import {
  ROW_HEIGHT_CLASS,
  rowHeightClass,
  SOURCE_LINE_HEIGHT_CLASS,
  SOURCE_LINE_HEIGHT_PX,
} from "../components/table-contract";

import {
  assertHighlightRanges,
  CELL_TEXT_CLASS,
  copyToClipboard,
  forCell,
  forCellText,
  forPanel,
  forSourceLine,
  HIGHLIGHT_CLASS,
  SOURCE_LINE_TAB_SPACES,
  sourceLineTruncated,
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

// ===========================================================================
// THE THIRD TIER — `forSourceLine`, ITS CAP, ITS TAB EXCEPTION AND ITS ROW
// ===========================================================================
// ADDED BY PLAN 07-07. The same three things a WRAPPER can get wrong are what
// is checked here: binding the wrong cap, reaching the cap by a LITERAL rather
// than by name, and reimplementing a step of R2 instead of calling it.
//
// The fourth is new to this wrapper and is the ONE DELIBERATE EXCEPTION: a TAB
// renders as a DefMiner-authored run of two spaces instead of being stripped.
// It is asserted BY CHARACTER CODE rather than by a visual match, because "two
// spaces" and "a tab that happens to render as two spaces" are
// indistinguishable in a diff — and the difference between them is whether
// DefMiner or the hostile file owns the column geometry.
//
// Adversarial characters are written as ESCAPES rather than literals, the rule
// hostile.fixture.ts states and this file already follows: a literal C0 control
// or RIGHT-TO-LEFT OVERRIDE is invisible in every diff and every review tool.

/** This module's own source, for the two assertions that are about what is
 *  WRITTEN rather than about what is computed.
 *
 *  Repo-relative, the spelling `frontend-safety.spec.ts` already uses for its
 *  own walk root: vitest runs from the workspace root and `import.meta.url` is
 *  not a file URL under the transform. */
const DISPLAY_MODULE = "packages/frontend/src/safety/display.ts";

/** An unpaired UTF-16 surrogate — what a cap applied by `slice` rather than by
 *  grapheme leaves behind on a four-byte character. The same predicate
 *  hostile.spec.ts carries, for the same reason. */
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

describe("forSourceLine — the third cap, bound in the name", () => {
  it("reaches the cap BY NAME from the engine, never as a literal", () => {
    // A SOURCE-LEVEL ASSERTION, because the defect it catches is invisible at
    // run time: `forDisplayText(v, 1024)` behaves identically to
    // `forDisplayText(v, SOURCE_LINE_MAX_GRAPHEMES)` today, and stops behaving
    // identically the moment the engine's constant moves. This module's header
    // states the rule — the cap is bound at the WRAPPER, and a call site never
    // mentions it.
    const source = readFileSync(DISPLAY_MODULE, "utf8");
    const imported =
      /import \{([\s\S]*?)\} from "@defminer\/engine\/sanitise";/.exec(source);
    expect(
      imported,
      "display.ts no longer imports from the engine",
    ).not.toBeNull();
    expect(imported?.[1]).toContain("SOURCE_LINE_MAX_GRAPHEMES");

    const body = /export function forSourceLine\([\s\S]*?\n\}/.exec(source);
    expect(body, "forSourceLine is no longer declared here").not.toBeNull();
    expect(body?.[0]).toContain("SOURCE_LINE_MAX_GRAPHEMES");
    // No three-or-more-digit number anywhere in the wrapper: 1024 written out
    // is what this rule exists to forbid.
    expect(body?.[0]).not.toMatch(/[0-9]{3,}/);
  });

  it("renders a line of EXACTLY the cap unchanged", () => {
    const exact = "e".repeat(SOURCE_LINE_MAX_GRAPHEMES);
    expect(forSourceLine(exact)).toBe(exact);
    expect(forSourceLine(exact).length).toBe(SOURCE_LINE_MAX_GRAPHEMES);
    expect(sourceLineTruncated(exact)).toBe(false);
  });

  it("cuts a line ONE past the cap to exactly the cap, and says so", () => {
    // THE OFF-BY-ONE FROM THE OTHER SIDE. A `>=` / `>` slip is either a silent
    // truncation at the boundary or a silent overflow past it, and exercising
    // one side alone passes for whichever one the slip happened to get right.
    const over = "e".repeat(SOURCE_LINE_MAX_GRAPHEMES + 1);
    expect(forSourceLine(over).length).toBe(SOURCE_LINE_MAX_GRAPHEMES);
    expect(sourceLineTruncated(over)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 07-REVIEW.md HI-01 — "WAS THIS LINE CUT?", NOT "WAS THIS STRING CHANGED?"
  // -------------------------------------------------------------------------
  //
  // The predicate compared `forDisplayText(prepared, CAP)` against `prepared`,
  // which is true whenever EITHER STRIP fired. `\r` is a C0 control and lines
  // come from `content.split("\n")`, so every line of a CRLF-authored source
  // answered `true` — the per-row marker rendered on a file where nothing was
  // cut, the one-line O-02 sentence claimed a 13-byte line was truncated at the
  // cap, and the position strip (which gives truncation absolute precedence)
  // never reached `mapped` for the whole file.
  //
  // Every case below is a value the STRIPS change and the TRUNCATION does not.

  it("does NOT call a CRLF line truncated", () => {
    // The reviewer's executed reproduction, verbatim. Before the fix this
    // asserted `true` and the whole file's position readout was unreachable.
    const crlf = "const a = 1;\r";
    expect(sourceLineTruncated(crlf)).toBe(false);
    expect(forSourceLine(crlf)).toBe("const a = 1;");
  });

  it("does NOT call a line truncated for a stripped bidi override", () => {
    expect(sourceLineTruncated("\u202Ex")).toBe(false);
    expect(forSourceLine("\u202Ex")).toBe("x");
  });

  it("does NOT call a line truncated for any other stripped control", () => {
    // ESC in a string literal is legal, ordinary source. So is NUL in a file a
    // hostile map declared. Neither is a CUT.
    for (const control of [
      "\u0000",
      "\u0007",
      "\u001B",
      "\u001F",
      "\u007F",
      "\u009F",
    ]) {
      expect(sourceLineTruncated("a" + control + "b")).toBe(false);
    }
  });

  it("still says TRUE when the strip fires AND the cap is passed", () => {
    // The strips being invisible to the predicate must not make truncation
    // invisible to it: a value that is both stripped and cut is still cut.
    const both = "\r" + "e".repeat(SOURCE_LINE_MAX_GRAPHEMES + 1);
    expect(sourceLineTruncated(both)).toBe(true);
  });

  it("counts the CAP in graphemes, so stripping cannot push a line under it", () => {
    // A line whose graphemes exceed the cap only because the controls are gone
    // is still over the cap: `forDisplayText` truncates AFTER stripping, so the
    // predicate must ask about the stripped length and not the raw one.
    const padded = "e"
      .repeat(SOURCE_LINE_MAX_GRAPHEMES + 1)
      .split("")
      .join("\u0000");
    expect(padded.length).toBeGreaterThan(SOURCE_LINE_MAX_GRAPHEMES * 2);
    expect(sourceLineTruncated(padded)).toBe(true);
    expect(forSourceLine(padded).length).toBe(SOURCE_LINE_MAX_GRAPHEMES);
  });

  it("is a DIFFERENT cap from both shipped wrappers, observably", () => {
    // Not a restatement of the engine's constant assertion: this drives the
    // three WRAPPERS over one value and shows they answer three lengths, which
    // is what makes a mistyped constant a VISIBLY wrong render.
    const long = "e".repeat(EVIDENCE_PANEL_MAX_GRAPHEMES + 1);
    expect(forCellText(long).length).toBe(TABLE_CELL_MAX_GRAPHEMES);
    expect(forSourceLine(long).length).toBe(SOURCE_LINE_MAX_GRAPHEMES);
    expect(forPanel(long).text.length).toBe(EVIDENCE_PANEL_MAX_GRAPHEMES);
  });
});

describe("forSourceLine — the ONE exception: TAB is rendered, not stripped", () => {
  it("turns one TAB into exactly two SPACE characters, by character code", () => {
    const out = forSourceLine("\u0009x");
    expect([...out].map((character) => character.codePointAt(0))).toEqual([
      0x20, 0x20, 0x78,
    ]);
    expect(out.includes("\u0009")).toBe(false);
  });

  it("takes the run from DefMiner's constant, not from the file", () => {
    expect(SOURCE_LINE_TAB_SPACES).toBe("  ");
    expect(SOURCE_LINE_TAB_SPACES.length).toBe(2);
    expect(forSourceLine("\u0009")).toBe(SOURCE_LINE_TAB_SPACES);
    // Two tabs are two runs and not one merged one: the indentation DEPTH the
    // developer wrote is the thing being preserved.
    expect(forSourceLine("\u0009\u0009")).toBe(
      SOURCE_LINE_TAB_SPACES + SOURCE_LINE_TAB_SPACES,
    );
  });

  it("strips every OTHER C0/C1 control, unchanged", () => {
    // The exception is ONE CHARACTER WIDE. NUL, BEL, ESC, US, DEL and the C1
    // range are removed exactly as `forCellText` removes them.
    const out = forSourceLine("a\u0000b\u0007c\u001Bd\u001Fe\u007Ff\u009Fg");
    expect(out).toBe("abcdefg");
    expect(stripsToNothing(out, C0_C1_CONTROLS)).toBe(true);
  });

  it("strips bidi overrides and isolates, unchanged", () => {
    const out = forSourceLine("\u202Emoc.live\u202C");
    expect(stripsToNothing(out, BIDI_OVERRIDES_ISOLATES)).toBe(true);
  });

  it("counts the EXPANDED run against the cap, so a tab run cannot overflow it", () => {
    // The substitution happens BEFORE the engine truncates, which is the only
    // ordering under which a line of tabs cannot exceed the cap after
    // expansion. The opposite order caps at 1,024 tabs and then renders 2,048
    // characters into a row fixed at one line.
    const tabs = "\u0009".repeat(SOURCE_LINE_MAX_GRAPHEMES);
    expect(forSourceLine(tabs).length).toBe(SOURCE_LINE_MAX_GRAPHEMES);
  });
});

describe("forSourceLine — the measured hostile labels, rendered safely", () => {
  const exercisedLabels: string[] = [];

  it.each(
    SOURCES_LABEL_CASES.map(
      (labelCase) => [labelCase.id, labelCase.value] as const,
    ),
  )("%s survives forSourceLine", (id, value) => {
    const out = forSourceLine(value);
    expect(
      stripsToNothing(out, C0_C1_CONTROLS),
      `case ${id} kept a C0/C1 control character`,
    ).toBe(true);
    expect(
      stripsToNothing(out, BIDI_OVERRIDES_ISOLATES),
      `case ${id} kept a bidi override or isolate`,
    ).toBe(true);
    expect(
      hasLoneSurrogate(out),
      `case ${id} left a split character behind`,
    ).toBe(false);
    exercisedLabels.push(id);
  });

  it("exercised EVERY label case in the fixture module", () => {
    // The exhaustiveness assertion map-fixture.ts asks every consumer to make:
    // the difference between iterating the fixture and iterating the part of it
    // somebody happened to write a case for.
    expect([...exercisedLabels].sort()).toEqual(
      [...SOURCES_LABEL_CASE_IDS].sort(),
    );
  });

  it("the 4 KB label is cut at the cap and the RTL label keeps its climb", () => {
    // THE TRACER'S TWO NAMED CASES, stated outside the loop so a reader sees
    // which two the plan called out and what each one proves.
    const fourKilobytes = SOURCES_LABEL_CASES.find(
      (labelCase) => labelCase.id === "four-kilobyte-label",
    );
    expect(
      fourKilobytes,
      "map-fixture.ts no longer exports four-kilobyte-label",
    ).toBeDefined();
    expect(forSourceLine(fourKilobytes?.value ?? "").length).toBe(
      SOURCE_LINE_MAX_GRAPHEMES,
    );
    expect(sourceLineTruncated(fourKilobytes?.value ?? "")).toBe(true);

    const rtl = SOURCES_LABEL_CASES.find(
      (labelCase) => labelCase.id === "unicode-rtl-override",
    );
    expect(
      rtl,
      "map-fixture.ts no longer exports unicode-rtl-override",
    ).toBeDefined();
    const out = forSourceLine(rtl?.value ?? "");
    expect(stripsToNothing(out, BIDI_OVERRIDES_ISOLATES)).toBe(true);
    // AND THE CLIMB IS STILL THERE. Sanitisation removes the invisible
    // characters; it does not rewrite the path. `path.normalize` does the
    // opposite on this exact fixture — it CONSUMES the RTL run and FOLLOWS the
    // climbs to `defminer-escape.txt` — which is the measured reason node:path
    // is banned on the tree path (SPIKE-12 #18).
    expect(out).toContain("..");
  });

  it("never splits a combining sequence or a surrogate pair at the cap", () => {
    // A cap applied by `slice` rather than by grapheme cuts a four-byte
    // character in half and leaves a lone surrogate, which renders as a
    // replacement glyph in a string the operator is reading character by
    // character. Both shapes, driven past the boundary.
    const pairs = "\u{1F44D}\u{1F3FD}".repeat(SOURCE_LINE_MAX_GRAPHEMES);
    expect(hasLoneSurrogate(forSourceLine(pairs))).toBe(false);

    const stacked = "e\u0301\u0302\u0303".repeat(SOURCE_LINE_MAX_GRAPHEMES);
    const out = forSourceLine(stacked);
    expect(hasLoneSurrogate(out)).toBe(false);
    // The LAST kept grapheme kept its whole mark stack rather than half of it.
    expect(out.endsWith("e\u0301\u0302\u0303")).toBe(true);
  });
});

describe("SOURCE_LINE_HEIGHT_PX — the SECOND number, beside the first", () => {
  it("is 24px and is NOT the table row height", () => {
    expect(SOURCE_LINE_HEIGHT_PX).toBe(24);
    expect(SOURCE_LINE_HEIGHT_PX).not.toBe(TABLE_ROW_HEIGHT_PX);
    // `TABLE_ROW_HEIGHT_PX` is byte-unchanged by plan 07-07 — the tree still
    // reads it, and the viewer reads the new one.
    expect(TABLE_ROW_HEIGHT_PX).toBe(32);
  });

  it("resolves to the LITERAL Tailwind utility, keyed by the constant", () => {
    // The literal requirement is not decoration: Tailwind's JIT only emits a
    // utility it can SEE spelled out in the scanned source, so an interpolated
    // height scans as nothing and the built stylesheet carries no rule at all.
    expect(SOURCE_LINE_HEIGHT_CLASS).toBe("h-6");
    expect(ROW_HEIGHT_CLASS).toBe("h-8");
  });

  it("THROWS for a height with no registered class, with the map's own message", () => {
    // THE FAILING PATH, EXECUTED — the same demonstration as deleting the map
    // entry by hand, without leaving the deletion in the tree. A resolver that
    // fell back would render rows at one height while the scroller computed
    // geometry at another, which produces no error and misplaces a row per
    // screen.
    expect(() => rowHeightClass(SOURCE_LINE_HEIGHT_PX + 1)).toThrow(
      /no Tailwind utility is registered for it/,
    );
    expect(() => rowHeightClass(SOURCE_LINE_HEIGHT_PX + 1)).toThrow(
      /as a LITERAL/,
    );
    // And the two heights that ARE registered do not throw.
    expect(() => rowHeightClass(SOURCE_LINE_HEIGHT_PX)).not.toThrow();
    expect(() => rowHeightClass(TABLE_ROW_HEIGHT_PX)).not.toThrow();
  });
});
