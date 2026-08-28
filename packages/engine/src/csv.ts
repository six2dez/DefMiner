// packages/engine/src/csv.ts — CSV fields for a file somebody opens in Excel.
//
// ===========================================================================
// NEUTRALISE FIRST. QUOTE SECOND. THE ORDER IS THE RULE. (UISEC-02, R3)
// ===========================================================================
// A spreadsheet evaluates a cell whose text begins with a formula lead. Quoting
// does not stop it: `"=cmd|' /C calc'!A0"` is a perfectly ordinary quoted CSV
// field and Excel still executes it, because the quotes are CSV syntax that the
// parser removes before the cell ever gets its value. What stops it is a
// leading apostrophe, which the parser keeps and the formula engine reads as
// "this cell is text".
//
// So: apostrophe FIRST, quotes SECOND. Reverse them and the apostrophe lands
// inside the quotes AFTER the `=`, where it changes nothing — and the field
// still contains an apostrophe, so any test that merely asserts one is present
// passes. `csv.spec.ts` asserts the apostrophe's INDEX for that reason.
//
// This is a module and not a `replace` at the call site because R3 applies to
// every exported field on every export path, and a rule that lives at one call
// site is a rule the second call site will not have.
//
// ===========================================================================
// THE CONTROL STRIP IS IMPORTED, NOT RESTATED
// ===========================================================================
// `C0_C1_CONTROLS` comes from `./sanitise`. Declaring a second copy of the same
// range here is how the export and the display path end up disagreeing about
// what a control character is, and a divergence between them is invisible in
// both. One constant, two consumers.
//
// ===========================================================================
// TAB AND CR ARE ON R3's LIST AND CANNOT SURVIVE THE STRIP — WHICH IS STRONGER
// ===========================================================================
// R3 names six dangerous leads: `=`, `+`, `-`, `@`, TAB (U+0009) and CR
// (U+000D). The last two are on the list because a spreadsheet skips leading
// whitespace, so `<TAB>=cmd|…` executes exactly as `=cmd|…` does.
//
// Both are also C0 control characters, and the control strip runs BEFORE the
// lead test. The consequence, stated here because it is not what a reader of
// `DANGEROUS_LEADS` will expect: a TAB or CR lead never reaches the lead test,
// because it never reaches the output at all — and whatever it was hiding
// becomes the first character and IS neutralised. That is threat T-05-14 closed
// by construction rather than by a second rule, and it is strictly stronger
// than emitting an apostrophe in front of a tab would have been.
//
// They stay in `DANGEROUS_LEADS` because R3's list is six characters and this
// constant is that list. A future caller that reaches the lead test by another
// path — a JSON exporter, a serialiser written next year — gets the complete
// rule rather than the four that happened to be reachable from here.

import { C0_C1_CONTROLS } from "./sanitise";

/**
 * The six characters R3 names as dangerous leads, frozen.
 *
 * TAB and CR cannot survive {@link csvField}'s control strip — see the header.
 * They are here because this constant IS R3's list, not the subset one call
 * path happens to exercise.
 */
export const DANGEROUS_LEADS: readonly string[] = Object.freeze([
  "=",
  "+",
  "-",
  "@",
  "\t",
  "\r",
]);

/**
 * CRLF, the terminator RFC 4180 specifies and the one Excel expects.
 *
 * Named and exported so the export serialiser (05-11) uses THIS terminator
 * rather than a `\n` somebody typed at a call site — a mixed-terminator file
 * opens with a trailing blank row in some readers and one merged row in others.
 * Both of its characters are C0 controls, so a field can never contain it.
 */
export const CSV_LINE_TERMINATOR = "\r\n";

/**
 * One CSV field: strip controls, neutralise a dangerous lead, then quote.
 *
 * Step order is R3's and is asserted positionally in `csv.spec.ts`.
 *
 * @param raw target-controlled and assumed hostile.
 * @returns the field INCLUDING its wrapping quotes. The empty input returns
 *   `""` — two characters — so a column keeps its position instead of
 *   collapsing and shifting every field after it one place left.
 */
export function csvField(raw: string): string {
  const stripped = raw.replace(C0_C1_CONTROLS, "");
  // The first CODE UNIT, not the first grapheme. The two agree for every lead
  // on the list: a combining mark cannot be one of the six, so a value opening
  // with a combining sequence has an ordinary letter as its first code unit and
  // is correctly left alone (asserted).
  const lead = stripped.slice(0, 1);
  const neutralised = DANGEROUS_LEADS.includes(lead)
    ? `'${stripped}`
    : stripped;
  return `"${neutralised.replaceAll('"', '""')}"`;
}

/**
 * One CSV row: every field through {@link csvField}, comma-joined, terminated.
 *
 * A field cannot break the row. It cannot contain a bare comma outside quotes
 * (every field is quoted), it cannot contain an unescaped quote (they are
 * doubled), and it cannot contain the terminator (CR and LF are stripped).
 */
export function csvRow(fields: readonly string[]): string {
  return `${fields.map(csvField).join(",")}${CSV_LINE_TERMINATOR}`;
}

/**
 * The header row.
 *
 * DELEGATES to {@link csvRow} rather than formatting column names itself, and
 * the delegation IS the guarantee: DefMiner-authored column names go through
 * the identical field rule as target-controlled cell values, so the file cannot
 * carry two different escapes. `csv.spec.ts` asserts
 * `csvHeader(columns) === csvRow(columns)` so that this stays true if either
 * one is ever edited.
 *
 * It exists as its own name so a call site reads as what it is; a serialiser
 * that wrote its header with a bare `join(",")` is the defect this prevents.
 */
export function csvHeader(columns: readonly string[]): string {
  return csvRow(columns);
}
