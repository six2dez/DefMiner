// packages/engine/src/csv.spec.ts — UISEC-02 / R3, with the ORDER asserted
// positionally rather than by presence.
//
// The interesting assertions in this file are not "an apostrophe is present".
// They are "the apostrophe is at index 1 and the dangerous lead is at index 2",
// because an implementation that quoted first and neutralised second would also
// contain an apostrophe — inside the quotes, after the `=`, doing nothing. R3
// names both steps AND their sequence; only a positional assertion can tell the
// two apart.
//
// Adversarial characters are written as escapes, never as literals, for the
// same reason `sanitise.spec.ts` gives.

import { describe, expect, it } from "vitest";

import {
  CSV_LINE_TERMINATOR,
  csvField,
  csvHeader,
  csvRow,
  DANGEROUS_LEADS,
} from "./csv";
import { HOSTILE_CASE_IDS, HOSTILE_CASES } from "./hostile.fixture";
import { C0_C1_CONTROLS } from "./sanitise";

/** LATIN SMALL LETTER E + COMBINING ACUTE ACCENT. One grapheme, two code
 *  points, and its FIRST code unit is an ordinary letter — which is why the
 *  first-code-unit lead test and a first-grapheme lead test agree in practice
 *  (05-03-PLAN.md's unresolved EDGE UISEC-02 / encoding). */
const COMBINED = "e\u0301";

/** The Excel payload shape R3 exists to defuse. */
const FORMULA = "=cmd|' /C calc'!A0";

describe("DANGEROUS_LEADS", () => {
  it("is the frozen list of the six characters R3 names", () => {
    expect(DANGEROUS_LEADS).toEqual(["=", "+", "-", "@", "\t", "\r"]);
    expect(Object.isFrozen(DANGEROUS_LEADS)).toBe(true);
  });
});

describe("csvField — step 1 then step 2, one case per dangerous lead", () => {
  // The four leads that SURVIVE the control strip and therefore reach the lead
  // test as themselves.
  it.each([
    ["=", `${FORMULA}`],
    ["+", "+1+1"],
    ["-", "-1+1"],
    ["@", "@SUM(A1)"],
  ])("neutralises a field led by %s BEFORE quoting", (lead, raw) => {
    const out = csvField(raw);
    expect(out.startsWith(`"'${lead}`)).toBe(true);
    // POSITIONAL, not merely present: quote, apostrophe, lead.
    expect(out[0]).toBe('"');
    expect(out[1]).toBe("'");
    expect(out[2]).toBe(lead);
    expect(out.endsWith('"')).toBe(true);
  });

  // The two leads that are ALSO C0 control characters. R3 lists them because a
  // spreadsheet skips leading whitespace and would execute `<TAB>=cmd`. The
  // control strip runs FIRST, so the outcome here is STRICTLY STRONGER than the
  // apostrophe: the character never reaches the file at all, and whatever it was
  // hiding is what gets neutralised. Asserted rather than assumed, because a
  // reader of DANGEROUS_LEADS will otherwise expect an apostrophe.
  it.each([
    ["\t", "TAB"],
    ["\r", "CR"],
  ])("strips a %s lead (%s) and neutralises what it was hiding", (lead) => {
    const out = csvField(`${lead}${FORMULA}`);
    expect(out).not.toContain(lead);
    expect(out[0]).toBe('"');
    expect(out[1]).toBe("'");
    expect(out[2]).toBe("=");
  });

  it("does not neutralise a field led by a digit or a letter", () => {
    expect(csvField("2026-08-28")).toBe('"2026-08-28"');
    expect(csvField("hostname")).toBe('"hostname"');
    expect(csvField("2026-08-28")).not.toContain("'");
  });

  it("does not neutralise a field led by a combining sequence", () => {
    const out = csvField(`${COMBINED}vil.com`);
    expect(out).toBe(`"${COMBINED}vil.com"`);
    expect(out).not.toContain("'");
  });
});

describe("csvField — quoting", () => {
  it("doubles an internal double quote inside the wrapping quotes", () => {
    expect(csvField('he said "hi"')).toBe('"he said ""hi"""');
  });

  it("quote-wraps a field containing a comma and leaves the comma alone", () => {
    expect(csvField("a,b")).toBe('"a,b"');
  });

  it("returns the empty field as an empty quoted PAIR, not as nothing", () => {
    // Column positions survive an empty value only if it still emits its
    // delimiters. 05-03-PLAN.md's unresolved EDGE UISEC-02 / empty, decided
    // here and asserted.
    const out = csvField("");
    expect(out).toBe('""');
    expect(out).toHaveLength(2);
  });

  it("quote-wraps every field, neutralised or not", () => {
    for (const raw of ["", "plain", FORMULA, "a,b", '"']) {
      const out = csvField(raw);
      expect(out.startsWith('"')).toBe(true);
      expect(out.endsWith('"')).toBe(true);
    }
  });
});

describe("csvField — T-05-14, a control cannot hide a dangerous lead", () => {
  it("strips the control first, so the lead test sees the real lead", () => {
    const out = csvField(`\u0000${FORMULA}`);
    expect(out[1]).toBe("'");
    expect(out[2]).toBe("=");
  });

  it("strips a C1 control used the same way", () => {
    const out = csvField(`\u009F${FORMULA}`);
    expect(out[1]).toBe("'");
    expect(out[2]).toBe("=");
  });

  it("strips a RUN of controls, not merely the first", () => {
    const out = csvField(`\u0000\u0001\u001F\u007F${FORMULA}`);
    expect(out[1]).toBe("'");
    expect(out[2]).toBe("=");
  });

  it("strips controls from the middle and the end too", () => {
    expect(csvField("a\u0000b\u001Fc")).toBe('"abc"');
  });
});

describe("csvRow and csvHeader", () => {
  it("joins fields with a comma and terminates with the fixed terminator", () => {
    expect(csvRow(["a", "b"])).toBe(`"a","b"${CSV_LINE_TERMINATOR}`);
    expect(CSV_LINE_TERMINATOR).toBe("\r\n");
  });

  it("emits ONE row for a field containing the terminator", () => {
    // The terminator's own characters are C0 controls, so they are stripped
    // from a field before it is quoted. A value cannot inject a row break.
    const row = csvRow([`a${CSV_LINE_TERMINATOR}b`, "c"]);
    expect(row).toBe(`"ab","c"${CSV_LINE_TERMINATOR}`);
    expect(row.split(CSV_LINE_TERMINATOR).filter((s) => s !== "")).toHaveLength(
      1,
    );
  });

  it("emits an empty row as delimiters, never as nothing", () => {
    expect(csvRow(["", ""])).toBe(`"",""${CSV_LINE_TERMINATOR}`);
  });

  it("applies the SAME field rule to header columns as to body cells", () => {
    // The executable form of "header and body cannot use two different
    // escapes". If csvHeader ever grows its own escaping this fails.
    const columns = ["host", "=value", 'we"ird'];
    expect(csvHeader(columns)).toBe(csvRow(columns));
  });

  it("neutralises a DefMiner-authored column name that looks like a formula", () => {
    const out = csvHeader(["=host"]);
    expect(out[1]).toBe("'");
    expect(out[2]).toBe("=");
  });
});

describe("the hostile-content fixture, iterated EXHAUSTIVELY", () => {
  // Derived from the exported constant, `g` flag dropped — see the same note in
  // sanitise.spec.ts.
  const CONTROL_PATTERN = new RegExp(C0_C1_CONTROLS.source);

  const exercised = new Set<string>();

  it.each([...HOSTILE_CASES])(
    "$id serialises to an inert CSV field",
    (hostileCase) => {
      const out = csvField(hostileCase.value);
      exercised.add(hostileCase.id);

      // Quote-wrapped, always, neutralised or not.
      expect(out.startsWith('"'), hostileCase.why).toBe(true);
      expect(out.endsWith('"'), hostileCase.why).toBe(true);
      expect(out.length, hostileCase.why).toBeGreaterThanOrEqual(2);

      // The FIRST CONTENT CHARACTER — index 1, immediately inside the opening
      // quote — is never a dangerous lead. For a neutralised field it is the
      // apostrophe; for a benign one it is the value's own first character.
      expect(DANGEROUS_LEADS, hostileCase.why).not.toContain(out.slice(1, 2));

      // And no control character survived to reach the file.
      expect(out, hostileCase.why).not.toMatch(CONTROL_PATTERN);
    },
  );

  it("exercised EVERY id in HOSTILE_CASE_IDS, not a subset", () => {
    expect([...exercised].sort()).toEqual([...HOSTILE_CASE_IDS].sort());
    expect(HOSTILE_CASE_IDS.length).toBeGreaterThanOrEqual(17);
  });
});
