// packages/frontend/src/components/export-contract.ts — the export dialog's
// copy, its two vocabularies' labels, and the numbers behind them.
//
// ===========================================================================
// WHY THE COPY LIVES HERE AND NOT IN THE COMPONENT
// ===========================================================================
// The same argument `panel-contract.ts` makes: a string typed into a template
// is a string a spec has to retype to assert, and two typings of one sentence
// are two sentences. `ExportDialog.spec.ts` asserts the rendered confirmation
// STRING-EQUALS the constant below, and a separate case asserts the constant
// appears VERBATIM inside 05-UI-SPEC.md's own copy row — read out of the design
// contract at test time, not compared against a second copy of it.
//
// ===========================================================================
// THE RAW-EXPORT CONFIRMATION WAS WRONG TWICE. THIS IS THE AMENDED TEXT.
// ===========================================================================
// It is used VERBATIM and is not paraphrased, because paraphrasing it
// reintroduces one of the two errors it was amended to remove:
//
//   1. IT DESCRIBED A FILE WRITTEN ON THE CAIDO SERVER. Decision D-04 says the
//      opposite — the backend returns bytes and the browser downloads them onto
//      the operator's own machine, and no server file is written at any point.
//      "It is written to the Caido server and is your responsibility from that
//      point on" is the sentence that was removed. Do not restore it.
//   2. IT PROMISED "{n} live secret values in cleartext". URL query values
//      cannot honour that: `observations.ts` replaces them at WRITE time, so
//      they are not in the database and a "raw" export cannot un-redact what was
//      never stored (research pitfall P-06). The amended text says so plainly
//      rather than leaving the operator to discover it in the file.
//
// Amended by decision D-07 (operator, 2026-08-28) and already applied to
// 05-UI-SPEC.md § "Copywriting Contract". THE `{n}` PLACEHOLDERS ARE PART OF THE
// CONTRACT TEXT and are substituted here rather than edited out, so the template
// this module ships is byte-comparable to the row the design contract carries.
//
// ===========================================================================
// THE RULE THAT OUTRANKS THE COPY TABLE APPLIES TO EVERY STRING BELOW
// ===========================================================================
// No copy on this page contains an interpolated target-controlled string inside
// a sentence. The only interpolations anywhere in this file are INTEGERS and
// DefMiner-authored format names. Not a host, not a path, not a value, not a
// filename the backend chose from a target byte — because it does not.

import type {
  ExportFormat,
  ExportRedactionMode,
  ExportTable,
} from "@defminer/engine/contract";

// ---------------------------------------------------------------------------
// COPY — 05-UI-SPEC.md § "Copywriting Contract", VERBATIM
// ---------------------------------------------------------------------------

/** The page toolbar's primary CTA. It OPENS THE DIALOG and never exports
 *  directly — the copy row says so in the same breath as the label, and
 *  `App.spec.ts` asserts the click issues no export call. */
export const EXPORT_CTA = "Export inventory";

/**
 * The DRILL-DOWN's own scoped CTA — 07-UI-SPEC.md § "Copywriting Contract",
 * row *Drill-down header — primary CTA*.
 *
 * ===========================================================================
 * WHY A SECOND PLACE TO START ONE EXPORT (UI-SPEC Named Conflict 1)
 * ===========================================================================
 * The Phase 5 rule is *one export CTA, in the toolbar*. The shipped
 * implementation derives {@link EXPORT_CTA}'s table from the ACTIVE TAB
 * (`App.vue`'s `exportTable`), and the source drill-down is a STATE WITHIN the
 * Artifacts tab rather than a tab of its own — `activeTab` is still `artifacts`
 * while the operator is reading recovered source. So the toolbar CTA opened
 * from that screen would export the ARTIFACTS INVENTORY from a page showing
 * sources. Making the toolbar address it would mean deriving the export table
 * from something other than the active tab: a change to shipped, asserted
 * behaviour, on the one control whose entire ceremony is about the operator
 * knowing exactly what leaves the tool.
 *
 * THE DIVERGENCE IS STATED RATHER THAN SMUGGLED. There is ONE export
 * mechanism, ONE redaction ceremony and ONE destructive confirmation; there are
 * now TWO PLACES TO START IT, and each names what it will export. The spirit of
 * the Phase 5 rule — the operator always knows exactly which rows are leaving
 * and in what form — is strengthened by that, not weakened, which is why
 * {@link EXPORT_DIALOG_HEADINGS} exists directly below.
 */
export const EXPORT_MANIFEST_CTA = "Export source manifest";

/** The destructive confirmation's heading. */
export const RAW_EXPORT_CONFIRM_HEADING = "Export with raw values?";

/**
 * The destructive confirmation's body, with `{n}` where the count goes.
 *
 * VERBATIM, INCLUDING THE PUNCTUATION. The two em dashes, the semicolon and the
 * straight double quotes around `raw` are all part of the string the design
 * contract carries, and `ExportDialog.spec.ts` reads that row out of
 * 05-UI-SPEC.md and asserts this template is inside it.
 */
export const RAW_EXPORT_CONFIRM_BODY_TEMPLATE =
  'The file will contain {n} unredacted values, downloaded to this machine. It is yours to protect from that point on. Values DefMiner never stored in the clear — URL query values, which are redacted at write time — stay redacted; "raw" cannot recover what was never kept.';

/** The destructive confirm button's label, with `{n}` where the count goes. */
export const RAW_EXPORT_CONFIRM_LABEL_TEMPLATE = "Export {n} raw values";

/** The non-destructive escape, and the confirmation's DEFAULT FOCUS. The
 *  focused default of a destructive dialog is the way OUT of it. */
export const RAW_EXPORT_ESCAPE_LABEL = "Export redacted instead";

/** `{n}` substituted. A function rather than a template literal at the call
 *  site, so the sentence exists in exactly one place. */
export function rawExportConfirmBody(count: number): string {
  return RAW_EXPORT_CONFIRM_BODY_TEMPLATE.replace("{n}", String(count));
}

/** `{n}` substituted. */
export function rawExportConfirmLabel(count: number): string {
  return RAW_EXPORT_CONFIRM_LABEL_TEMPLATE.replace("{n}", String(count));
}

// ---------------------------------------------------------------------------
// COPY — DEFMINER-AUTHORED, FOR THE STATES THE COPY TABLE DOES NOT ROW
// ---------------------------------------------------------------------------

/**
 * The dialog's accessible name and heading, KEYED ON THE EXPORT TABLE (U7-3).
 *
 * ===========================================================================
 * THE HEADING NAMES WHAT THE CTA NAMED
 * ===========================================================================
 * A dialog headed *Export inventory* opened from **Export source manifest** is
 * a small lie about what will leave the tool, on the one control whose entire
 * ceremony is about the operator knowing that. Both entry points render their
 * own heading, and `ExportDialog.spec.ts` asserts each by exact comparison.
 *
 * A `Record` KEYED ON THE TABLE RATHER THAN A PROP, and that choice is the
 * mechanism doing the work: `ExportTable` is the engine contract's closed list,
 * so a FOURTH export table cannot ship without a heading — an incomplete record
 * is a typecheck failure here rather than an `undefined` rendered as a blank
 * `<h2>`. A prop would have put the property in every caller's discipline.
 *
 * THE FIRST TWO ENTRIES ARE THE SHIPPED STRING, BYTE-IDENTICAL. This is a
 * widening and not a rewording: nothing an operator has already read changes.
 * The third is {@link EXPORT_MANIFEST_CTA}, read from the constant rather than
 * retyped, so the heading and the CTA cannot drift into two sentences.
 */
export const EXPORT_DIALOG_HEADINGS: Readonly<Record<ExportTable, string>> =
  Object.freeze({
    artifacts: "Export inventory",
    observations: "Export inventory",
    sources: EXPORT_MANIFEST_CTA,
  });

/** The redaction choice's group label. Named as a QUESTION about values, not as
 *  "mode": the operator is choosing what leaves the tool, not a setting. */
export const REDACTION_GROUP_LABEL = "What should the file contain?";

/**
 * The two redaction options, in the order
 * `EXPORT_REDACTION_MODES` fixes — REDACTED FIRST.
 *
 * RENDERED BY ITERATING THE CONTRACT'S OWN LIST, never by two hand-written
 * radios: the order is the safety property, and two hand-written radios are two
 * places somebody can reorder one of them.
 */
export const REDACTION_OPTION_LABELS: Readonly<
  Record<ExportRedactionMode, string>
> = Object.freeze({
  redacted: "Redacted (recommended) — URL query strings withheld",
  raw: "Raw — include the query strings as stored",
});

/** The format choice's group label. */
export const FORMAT_GROUP_LABEL = "File format";

/** The two format options. DefMiner-authored names, never a MIME type: an
 *  operator picks a file they can open, not a media type. */
export const FORMAT_OPTION_LABELS: Readonly<Record<ExportFormat, string>> =
  Object.freeze({
    csv: "CSV (spreadsheet)",
    json: "JSON",
  });

/** The confirm action, when the choice is redacted and no second gate applies. */
export const EXPORT_LABEL = "Export";

/** The in-flight label. ITS OWN WORDS, so the disabled state is legible without
 *  colour — the same rule the panel's "Re-analysing…" follows, and the design
 *  contract's `loading / export-dialog` row names this exact string. */
export const EXPORTING_LABEL = "Exporting…";

/** The dialog's dismissal. A TEXT LABEL, never an icon. */
export const CANCEL_LABEL = "Cancel";

/**
 * The zero-row reason, STATED ON THE BUTTON ITSELF.
 *
 * 05-UI-SPEC.md Open Decision D3 settles that a zero-row export is DISABLED
 * rather than producing a header-only file, and the reason belongs on the
 * control: a disabled button with the explanation somewhere else is a control
 * the operator concludes is broken.
 */
export const NOTHING_TO_EXPORT_LABEL = "Nothing to export — no rows match";

/**
 * A failed export, said without claiming a file was written.
 *
 * THE DIALOG STAYS OPEN AND THE REDACTION CHOICE STAYS EXACTLY AS THE OPERATOR
 * SET IT. It never falls back to raw and never silently re-defaults a raw
 * selection to redacted — a dialog that quietly moved the choice would be a
 * dialog whose next confirmation means something different from what the
 * operator read.
 */
export const EXPORT_FAILED_BODY =
  "The export did not finish and no file was written. Your choices above are unchanged. Try again, or open Health to see whether the backend is busy.";

/** The refusal outcome, which is not the same claim as a failure: the backend
 *  answered, and what it answered is that it could not scope the request. */
export const EXPORT_REFUSED_BODY =
  "DefMiner could not resolve which project to export. Nothing was written. Select a project in Caido and try again.";

/** The empty outcome arriving at a dialog that should have disabled the button.
 *  A real state worth its own sentence rather than a silent no-op: it means the
 *  count the button was disabled against and the rows the backend found have
 *  disagreed, which is a thing to notice rather than to smooth over. */
export const EXPORT_EMPTY_BODY =
  "There was nothing to export by the time DefMiner looked. No file was written.";

// ---------------------------------------------------------------------------
// THE FLOOR LINE THE DIALOG SHOWS BEFORE THE CONFIRMATION (UI-09)
// ---------------------------------------------------------------------------

/**
 * The same claim the exported FILE will carry, shown before the operator
 * confirms.
 *
 * TWO PLACES ON PURPOSE, AND THEY ARE NOT REDUNDANT. The dialog line is for the
 * decision; the embedded one is for the file, which is read a week later with no
 * banner above it. The wording matches 05-UI-SPEC.md's partial-view banner row,
 * because the operator has already read that sentence on the page behind this
 * dialog and a second phrasing would read as a second fact.
 */
export function exportFloorLine(affected: number, total: number): string {
  const noun = total === 1 ? "artifact" : "artifacts";
  return (
    `Partial view — ${String(affected)} of ${String(total)} ${noun} on this ` +
    `target are Partial or Failed. The counts below are a floor, not a total.`
  );
}

// ---------------------------------------------------------------------------
// CLASSES
// ---------------------------------------------------------------------------

/**
 * The destructive class, and the ONE element in this dialog permitted to carry
 * it.
 *
 * 05-UI-SPEC.md § "Color" reserves `danger` to four elements and the raw-export
 * confirm button is the second of them. `ExportDialog.spec.ts` asserts exactly
 * one button in the whole dialog carries it and that it is that one — an
 * assertion over a COUNT rather than over the button, because the failure this
 * prevents is a second button acquiring the colour, not this one losing it.
 */
export const DESTRUCTIVE_BUTTON_CLASS = "border-danger-500 text-danger-500";
