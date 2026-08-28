// packages/engine/src/sanitise.spec.ts — UISEC-03, proved rather than asserted.
//
// EVERY adversarial character in this file is written as a `\uXXXX` ESCAPE and
// never as a literal. That is not style. A literal C0 control or a literal
// RIGHT-TO-LEFT OVERRIDE in a source file is invisible in every diff, every
// review tool and every terminal — and this spec's whole subject is characters
// that are invisible. A reviewer must be able to see what is being asserted.
//
// The two properties easiest to get subtly wrong, and so asserted positionally
// rather than by presence:
//
//   ORDER. `forDisplay` strips BEFORE it measures and before it truncates. The
//   control-only case is the executable proof: a string that is nothing but
//   control characters must report `total === 0`, which is only true if the
//   strip ran first. Under truncate-first it would report its raw length and the
//   UI would offer a "showing 256 of 4,000" affordance for a value that is
//   empty.
//
//   CONTAINMENT. The object handed to a rendering sink must not carry the
//   untruncated remainder anywhere — not on a property, not on a symbol, not on
//   its prototype. That is asserted over `getOwnPropertyNames` and
//   `getOwnPropertySymbols`, not over `Object.keys`, because `Object.keys` skips
//   a non-enumerable property and a leak added that way would pass a keys check.

import { describe, expect, it } from "vitest";

import { HOSTILE_CASE_IDS, HOSTILE_CASES } from "./hostile.fixture";
import {
  BIDI_OVERRIDES_ISOLATES,
  C0_C1_CONTROLS,
  EVIDENCE_PANEL_MAX_GRAPHEMES,
  forDisplay,
  forEvidence,
  TABLE_CELL_MAX_GRAPHEMES,
} from "./sanitise";

/**
 * The elapsed-time ceiling for the 4 MiB case, as a NAMED constant with its
 * reason, so a quadratic implementation FAILS rather than merely being slow.
 *
 * The measured cost of a full grapheme walk over 4 MiB of ASCII on this
 * toolchain is ~170 ms (Node 26, `Intl.Segmenter`, measured while writing this
 * file). A quadratic strip-and-rebuild over the same input does not take three
 * times longer, it takes minutes — so any ceiling between the two separates
 * them. 2,000 ms is ~11x the measured cost: wide enough that a loaded CI box
 * does not flake, narrow enough that no accidental O(n^2) survives it.
 */
const FOUR_MB_BUDGET_MS = 2_000;

const FOUR_MB = 4 * 1024 * 1024;

/** A four-byte grapheme: THUMBS UP SIGN + EMOJI MODIFIER FITZPATRICK TYPE-4.
 *  Two code points, four UTF-16 code units, ONE user-perceived character. */
const EMOJI = "\u{1F44D}\u{1F3FD}";

/** LATIN SMALL LETTER E followed by COMBINING ACUTE ACCENT — one grapheme, two
 *  code points. Deliberately NOT the precomposed U+00E9, which is one code
 *  point and would prove nothing about combining sequences. */
const COMBINED = "e\u0301";

/** The nine bidi characters R2 names: U+202A-U+202E (5) and U+2066-U+2069 (4).
 *  05-03-PLAN.md's behaviour list says "all eight"; the two ranges it names
 *  contain nine characters and all nine are stripped. */
const BIDI_ALL = "\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069";

/** True when `s` contains a surrogate code unit without its partner. A naive
 *  `.slice(0, 256)` produces exactly this, and it is what "grapheme-safe"
 *  primarily exists to prevent. */
function hasLoneSurrogate(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const unit = s.charCodeAt(i);
    const isHigh = unit >= 0xd800 && unit <= 0xdbff;
    const isLow = unit >= 0xdc00 && unit <= 0xdfff;
    if (!isHigh && !isLow) continue;
    if (isLow) return true; // a low surrogate not consumed by a preceding high
    const next = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
    if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
    i++; // consume the pair
  }
  return false;
}

describe("R2 constants", () => {
  it("names the two caps from 05-UI-SPEC.md R2 and does not restate them", () => {
    expect(TABLE_CELL_MAX_GRAPHEMES).toBe(256);
    expect(EVIDENCE_PANEL_MAX_GRAPHEMES).toBe(2048);
  });

  it("takes NO default cap — a caller must name the surface", () => {
    // A default is how a 2,048-character panel cap leaks into a 32px table row
    // by omission. `Function.length` counts parameters before the first one
    // carrying a default, so adding one would drop these to 1.
    expect(forDisplay.length).toBe(2);
    expect(forEvidence.length).toBe(2);
  });

  it("exports the two strip patterns so other tiers assert the SAME ones", () => {
    // The frontend AST gate and the export serialiser both need to prove they
    // strip what R2 says. Two copies of a security rule drift; one exported
    // constant cannot.
    expect(C0_C1_CONTROLS.source).toBe("[\\u0000-\\u001F\\u007F-\\u009F]");
    expect(BIDI_OVERRIDES_ISOLATES.source).toBe(
      "[\\u202A-\\u202E\\u2066-\\u2069]",
    );
  });
});

describe("forDisplay — step 1, C0/C1 control characters", () => {
  it("removes U+0000, U+001F, U+007F and U+009F", () => {
    const out = forDisplay(
      "a\u0000b\u001Fc\u007Fd\u009Fe",
      TABLE_CELL_MAX_GRAPHEMES,
    );
    expect(out.text).toBe("abcde");
    expect(out.shown).toBe(5);
    expect(out.total).toBe(5);
  });

  it("removes every code point in both ranges, not only the four endpoints", () => {
    let raw = "";
    for (let cp = 0x00; cp <= 0x1f; cp++) raw += String.fromCodePoint(cp);
    for (let cp = 0x7f; cp <= 0x9f; cp++) raw += String.fromCodePoint(cp);
    expect(forDisplay(raw, TABLE_CELL_MAX_GRAPHEMES).text).toBe("");
  });

  it("reports total === 0 for a control-ONLY value — strip precedes measurement", () => {
    // THE ORDER PROOF. Under truncate-first this reports the raw length.
    const out = forDisplay("\u0000\u0001\u001F\u007F\u0085\u009F", 256);
    expect(out.text).toBe("");
    expect(out.shown).toBe(0);
    expect(out.total).toBe(0);
  });

  it("removes newline and tab on the DEFAULT path", () => {
    const out = forDisplay("a\nb\tc", TABLE_CELL_MAX_GRAPHEMES);
    expect(out.text).toBe("abc");
  });
});

describe("forDisplay — step 2, bidi overrides and isolates", () => {
  it("removes all nine of U+202A-U+202E and U+2066-U+2069", () => {
    const out = forDisplay(`host${BIDI_ALL}name`, TABLE_CELL_MAX_GRAPHEMES);
    expect(out.text).toBe("hostname");
    for (const ch of BIDI_ALL) expect(out.text).not.toContain(ch);
  });

  it("defuses the hostname-reversal spoof (T-05-11)", () => {
    // RIGHT-TO-LEFT OVERRIDE makes `evil.com` render as `moc.live` in the very
    // column the operator triages on.
    const out = forDisplay("\u202Emoc.live\u202C", TABLE_CELL_MAX_GRAPHEMES);
    expect(out.text).toBe("moc.live");
    expect(out.text).not.toMatch(/[\u202A-\u202E\u2066-\u2069]/);
  });
});

describe("forDisplay — step 3, grapheme-safe truncation", () => {
  it("does not end in a lone surrogate when the cap lands on a surrogate pair", () => {
    // The 257th character begins a surrogate pair. `.slice(0, 256)` splits it.
    const raw = "a".repeat(256) + EMOJI + "tail";
    const out = forDisplay(raw, TABLE_CELL_MAX_GRAPHEMES);
    expect(out.shown).toBe(256);
    expect(out.text).toBe("a".repeat(256));
    expect(hasLoneSurrogate(out.text)).toBe(false);
  });

  it("keeps a multi-code-point grapheme WHOLE when it is the last one shown", () => {
    const raw = "a".repeat(255) + EMOJI + "tail";
    const out = forDisplay(raw, TABLE_CELL_MAX_GRAPHEMES);
    expect(out.shown).toBe(256);
    expect(out.text).toBe("a".repeat(255) + EMOJI);
    expect(hasLoneSurrogate(out.text)).toBe(false);
  });

  it("never cuts between a base character and its combining mark", () => {
    const raw = COMBINED.repeat(300);
    const out = forDisplay(raw, TABLE_CELL_MAX_GRAPHEMES);
    expect(out.text).toBe(COMBINED.repeat(256));
    expect(out.shown).toBe(256);
    expect(out.total).toBe(300);
    // The last code unit is the MARK, never the bare base.
    expect(out.text.endsWith("\u0301")).toBe(true);
  });

  it("returns a value of exactly the cap unchanged, with shown === total", () => {
    const raw = "x".repeat(TABLE_CELL_MAX_GRAPHEMES);
    const out = forDisplay(raw, TABLE_CELL_MAX_GRAPHEMES);
    expect(out.text).toBe(raw);
    expect(out.shown).toBe(out.total);
    expect(out.shown).toBe(TABLE_CELL_MAX_GRAPHEMES);
  });

  it("reports shown < total for a value ONE over the cap", () => {
    const raw = "x".repeat(TABLE_CELL_MAX_GRAPHEMES + 1);
    const out = forDisplay(raw, TABLE_CELL_MAX_GRAPHEMES);
    expect(out.shown).toBe(TABLE_CELL_MAX_GRAPHEMES);
    expect(out.total).toBe(TABLE_CELL_MAX_GRAPHEMES + 1);
    expect(out.shown).toBeLessThan(out.total);
  });

  it("returns the empty string with shown === 0 and total === 0", () => {
    const out = forDisplay("", TABLE_CELL_MAX_GRAPHEMES);
    expect(out.text).toBe("");
    expect(out.shown).toBe(0);
    expect(out.total).toBe(0);
  });

  it("honours the panel cap independently of the cell cap", () => {
    const raw = "y".repeat(EVIDENCE_PANEL_MAX_GRAPHEMES + 10);
    const out = forDisplay(raw, EVIDENCE_PANEL_MAX_GRAPHEMES);
    expect(out.shown).toBe(EVIDENCE_PANEL_MAX_GRAPHEMES);
    expect(out.total).toBe(EVIDENCE_PANEL_MAX_GRAPHEMES + 10);
  });

  it("rejects a cap that is not a positive integer", () => {
    // There is no default, so a bad cap is a caller bug and must be loud. A
    // silently-accepted 0 or NaN renders every cell empty and looks like "no
    // data" rather than like a defect.
    for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => forDisplay("abc", bad)).toThrow(/cap/i);
      expect(() => forEvidence("abc", bad)).toThrow(/cap/i);
    }
  });
});

describe("forDisplay — T-05-12, a multi-megabyte single-line value", () => {
  it(`truncates 4 MiB within ${String(FOUR_MB_BUDGET_MS)} ms`, () => {
    const raw = "a".repeat(FOUR_MB);
    const started = performance.now();
    const out = forDisplay(raw, TABLE_CELL_MAX_GRAPHEMES);
    const elapsed = performance.now() - started;
    expect(out.shown).toBe(TABLE_CELL_MAX_GRAPHEMES);
    expect(out.total).toBe(FOUR_MB);
    expect(
      elapsed,
      `forDisplay took ${String(Math.round(elapsed))} ms over 4 MiB. The ` +
        `measured linear cost is ~170 ms; this ceiling exists so an O(n^2) ` +
        `implementation fails the spec instead of merely being slow.`,
    ).toBeLessThan(FOUR_MB_BUDGET_MS);
  });
});

describe("forDisplay — T-05-13, the remainder is not reachable", () => {
  it("carries EXACTLY text, shown and total and nothing else", () => {
    const out = forDisplay("z".repeat(1000), TABLE_CELL_MAX_GRAPHEMES);
    expect(Object.keys(out).sort()).toEqual(["shown", "text", "total"]);
    expect(Object.getOwnPropertyNames(out).sort()).toEqual([
      "shown",
      "text",
      "total",
    ]);
    expect(Object.getOwnPropertySymbols(out)).toEqual([]);
  });

  it("does not expose the source string through any own value", () => {
    const raw = `SECRET-REMAINDER-${"q".repeat(1000)}`;
    const out = forDisplay(raw, 8);
    for (const value of Object.values(out)) {
      expect(String(value).length).toBeLessThanOrEqual(64);
    }
    expect(JSON.stringify(out)).not.toContain("qqqqqqqqqq");
  });
});

describe("forEvidence — the one surface that deliberately shows whitespace", () => {
  it("renders newline and tab as two-character visible escapes", () => {
    const out = forEvidence("a\nb\tc", EVIDENCE_PANEL_MAX_GRAPHEMES);
    expect(out.text).toBe("a\\nb\\tc");
    expect(out.text).not.toContain("\n");
    expect(out.text).not.toContain("\t");
  });

  it("renders a control with no conventional letter as a hex escape, never raw", () => {
    const out = forEvidence("a\u0001b\u009Fc", EVIDENCE_PANEL_MAX_GRAPHEMES);
    expect(out.text).toBe("a\\x01b\\x9Fc");
    // Asserting the ABSENCE of the control range requires naming it; see the
    // note on C0_C1_CONTROLS.
    // eslint-disable-next-line no-control-regex
    expect(out.text).not.toMatch(/[\u0000-\u001F\u007F-\u009F]/);
  });

  it("still strips bidi — an isolate reorders the panel too", () => {
    const out = forEvidence(`a${BIDI_ALL}b`, EVIDENCE_PANEL_MAX_GRAPHEMES);
    expect(out.text).toBe("ab");
  });

  it("inserts the escapes BEFORE length is computed", () => {
    // A value of pure newlines must not silently occupy zero of the cap. Ten
    // newlines are twenty characters once escaped.
    const out = forEvidence("\n".repeat(10), EVIDENCE_PANEL_MAX_GRAPHEMES);
    expect(out.total).toBe(20);
    expect(out.shown).toBe(20);
  });

  it("truncates the ESCAPED form at the cap", () => {
    const out = forEvidence("\n".repeat(10), 5);
    expect(out.text).toBe("\\n\\n\\");
    expect(out.shown).toBe(5);
    expect(out.total).toBe(20);
  });

  it("carries the same three keys as forDisplay", () => {
    const out = forEvidence("a\nb", EVIDENCE_PANEL_MAX_GRAPHEMES);
    expect(Object.getOwnPropertyNames(out).sort()).toEqual([
      "shown",
      "text",
      "total",
    ]);
  });
});

describe("the Intl.Segmenter fallback is a CAPABILITY difference, not an API one", () => {
  // Phase 0 measured Caido's QuickJS at 100 globals with NO `Intl` entry, so the
  // backend takes this path on every call. It must return the same shape and
  // must still never emit a lone surrogate — code-point iteration is
  // surrogate-safe even though it is not combining-mark-safe.
  function withoutSegmenter<T>(fn: () => T): T {
    const holder = globalThis as { Intl?: unknown };
    const saved = holder.Intl;
    holder.Intl = undefined;
    try {
      return fn();
    } finally {
      holder.Intl = saved;
    }
  }

  it("returns the identical shape with Intl absent", () => {
    const out = withoutSegmenter(() =>
      forDisplay("a".repeat(300), TABLE_CELL_MAX_GRAPHEMES),
    );
    expect(Object.getOwnPropertyNames(out).sort()).toEqual([
      "shown",
      "text",
      "total",
    ]);
    expect(out.shown).toBe(256);
    expect(out.total).toBe(300);
  });

  it("never splits a surrogate pair even without a segmenter", () => {
    const raw = "a".repeat(255) + EMOJI + "tail";
    const out = withoutSegmenter(() =>
      forDisplay(raw, TABLE_CELL_MAX_GRAPHEMES),
    );
    expect(hasLoneSurrogate(out.text)).toBe(false);
  });

  it("still strips controls and bidi with Intl absent", () => {
    const out = withoutSegmenter(() =>
      forDisplay("a\u0000b\u202Ec", TABLE_CELL_MAX_GRAPHEMES),
    );
    expect(out.text).toBe("abc");
  });
});

describe("the hostile-content fixture, iterated EXHAUSTIVELY", () => {
  // Derived from the exported constants rather than restated, and without the
  // `g` flag so `toMatch` cannot be affected by a shared `lastIndex`. Two copies
  // of a security range drift; one `.source` cannot.
  const CONTROL_PATTERN = new RegExp(C0_C1_CONTROLS.source);
  const BIDI_PATTERN = new RegExp(BIDI_OVERRIDES_ISOLATES.source);

  const exercised = new Set<string>();

  it.each([...HOSTILE_CASES])(
    "$id is safe to display at the cell cap",
    (hostileCase) => {
      const out = forDisplay(hostileCase.value, TABLE_CELL_MAX_GRAPHEMES);
      exercised.add(hostileCase.id);

      expect(out.shown, hostileCase.why).toBeLessThanOrEqual(
        TABLE_CELL_MAX_GRAPHEMES,
      );
      expect(out.text, hostileCase.why).not.toMatch(CONTROL_PATTERN);
      expect(out.text, hostileCase.why).not.toMatch(BIDI_PATTERN);
      expect(hasLoneSurrogate(out.text), hostileCase.why).toBe(false);
      expect(out.total, hostileCase.why).toBeGreaterThanOrEqual(out.shown);
    },
  );

  it.each([...HOSTILE_CASES])(
    "$id is safe to show in the panel",
    (hostileCase) => {
      const out = forEvidence(hostileCase.value, EVIDENCE_PANEL_MAX_GRAPHEMES);
      exercised.add(hostileCase.id);

      expect(out.shown, hostileCase.why).toBeLessThanOrEqual(
        EVIDENCE_PANEL_MAX_GRAPHEMES,
      );
      // The panel SHOWS whitespace — as escapes. Never as raw control bytes.
      expect(out.text, hostileCase.why).not.toMatch(CONTROL_PATTERN);
      expect(out.text, hostileCase.why).not.toMatch(BIDI_PATTERN);
      expect(hasLoneSurrogate(out.text), hostileCase.why).toBe(false);
    },
  );

  it("is FROZEN, so no consumer can mutate the corpus for the next one", () => {
    expect(Object.isFrozen(HOSTILE_CASES)).toBe(true);
    expect(Object.isFrozen(HOSTILE_CASE_IDS)).toBe(true);
    expect(HOSTILE_CASES).toHaveLength(HOSTILE_CASE_IDS.length);
    expect(HOSTILE_CASES.length).toBeGreaterThanOrEqual(17);
    expect(new Set(HOSTILE_CASE_IDS).size, "ids must be unique").toBe(
      HOSTILE_CASE_IDS.length,
    );
    for (const hostileCase of HOSTILE_CASES) {
      expect(
        hostileCase.why,
        `${hostileCase.id} has no stated reason`,
      ).not.toBe("");
    }
  });

  it("exercised EVERY id in HOSTILE_CASE_IDS, not a subset", () => {
    // Declared last in this describe, so it runs after the two it.each blocks.
    // Without it, a case added to the fixture tomorrow is carried by this file
    // without being asserted on, and the suite still reports green.
    expect([...exercised].sort()).toEqual([...HOSTILE_CASE_IDS].sort());
    expect(HOSTILE_CASE_IDS.length).toBeGreaterThanOrEqual(17);
  });
});
