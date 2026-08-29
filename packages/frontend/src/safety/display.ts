// packages/frontend/src/safety/display.ts — the ONE route from a
// target-controlled string to a Vue template.
//
// ===========================================================================
// THIS MODULE REIMPLEMENTS NOTHING
// ===========================================================================
// R2's four ordered steps live in packages/engine/src/sanitise.ts and nowhere
// else. 05-RESEARCH.md's "Architectural Responsibility Map" puts truncation on
// the backend with the frontend RE-ASSERTING it at the DOM sink as defence in
// depth — and re-asserting means calling the same function, not writing a
// second one. Two implementations of a security rule drift, and the one that is
// wrong stays wrong because nobody diffs them. `frontend-safety.spec.ts`
// enforces the rest of R1 and R2; this module is the part that has to be
// CALLED rather than merely not-violated.
//
// ===========================================================================
// TWO WRAPPERS, BECAUSE THE CAP IS BOUND AT THE WRAPPER AND NOT AT THE CALL
// ===========================================================================
// `forDisplay`/`forEvidence` take the cap as a required argument with no
// default (engine decision P5-D13, asserted there by `Function.length === 2`),
// which stops a 2,048-character panel cap leaking into a fixed 32px table row
// by OMISSION. It does not stop one leaking in by MISTYPING — a caller can
// still pass EVIDENCE_PANEL_MAX_GRAPHEMES to a cell. These two wrappers close
// that: the surface is named in the function name, and the cap is not
// something a call site can get wrong because a call site never mentions it.
//
// The panel routes through `forEvidence` and the cell through `forDisplay`,
// which is not a detail: R2 step 1 has exactly one stated exception, and it is
// the panel. A control character is REMOVED from a cell and shown as a visible
// escape in the panel.
//
// ===========================================================================
// WHAT `shown` AND `total` ARE COUNTED IN, AND WHAT THEY ARE NOT
// ===========================================================================
// GRAPHEMES here, because the frontend has `Intl.Segmenter` and the backend
// does not (engine decision P5-D9/P5-D11). R2 asks the panel to state "the byte
// range of what is shown" and this object deliberately does NOT carry a byte
// count: bytes are the BACKEND's space, the highlight offsets arrive in that
// space, and the display text has been grapheme-truncated in this one. Adding a
// byte field here would put both spaces on one object and invite exactly the
// arithmetic that is silently wrong — see `assertHighlightRanges` below, which
// exists to make that mismatch loud. The panel (plan 05-10) states the byte
// range from what the backend supplied alongside the value, not from this.

import {
  EVIDENCE_PANEL_MAX_GRAPHEMES,
  forDisplay,
  forDisplayText,
  forEvidence,
  TABLE_CELL_MAX_GRAPHEMES,
} from "@defminer/engine/sanitise";

/**
 * The fixed row height, in CSS pixels — App.vue's `h-8`, as a number.
 *
 * ONE NUMBER IN ONE PLACE. Plan 05-07's `RecycleScroller` needs a fixed item
 * size to compute scroll geometry and must read it from here rather than
 * restate `32`; `hostile.spec.ts` asserts rendered geometry against the same
 * constant. A second copy is how the scroller and the row come to disagree by
 * four pixels and the virtualised list drifts a row per screen.
 */
export const TABLE_ROW_HEIGHT_PX = 32;

/**
 * The classes EVERY element holding a target-controlled string carries.
 *
 * `font-mono` is a SECURITY control and not a typographic preference: in a
 * proportional face `l`/`I`/`1` and `0`/`O` are indistinguishable, and an
 * operator comparing two near-identical hostnames cannot see a lookalike.
 * `whitespace-pre` and `overflow-hidden` are what stop a value containing a
 * newline from growing the fixed {@link TABLE_ROW_HEIGHT_PX} row (R2 step 4).
 */
export const CELL_TEXT_CLASS = "font-mono whitespace-pre overflow-hidden";

/** The match slice's background. A surface tone, so it survives an operator's
 *  theme change — there is no hex literal anywhere in this package. */
export const HIGHLIGHT_CLASS = "bg-surface-600";

/**
 * A half-open range into the DISPLAY text: `[start, end)`.
 *
 * Into the display text, not into the value the backend holds. See
 * {@link assertHighlightRanges}.
 */
export type HighlightRange = { readonly start: number; readonly end: number };

/**
 * What a rendering sink receives — the engine's shape, restated structurally
 * because `sanitise.ts` keeps the type internal.
 *
 * Three fields and no fourth. The untruncated remainder is not a property, not
 * a symbol and not a closure the caller can reach, because R2 says the full
 * value is never placed in the DOM, never in a `title` attribute and never in a
 * `data-*` attribute — and the cheapest way to keep that true is for the object
 * the sink receives to not contain it at all.
 */
type Displayed = { text: string; shown: number; total: number };

/** R2 for a table cell: strip C0/C1, strip bidi, truncate grapheme-safe at 256. */
export function forCell(value: string): Displayed {
  return forDisplay(value, TABLE_CELL_MAX_GRAPHEMES);
}

/**
 * The same R2 for a table cell, returning ONLY the text.
 *
 * THE CELL PATH, AND THE ONE THE VIRTUALISED TABLE USES. A cell renders 256
 * graphemes and stops; it never renders "Truncated at {shown} of {total}
 * characters" — that affordance is the evidence panel's, and `total` is what
 * forces `forCell` to walk the WHOLE value. On a 4 MiB single-line hostile value
 * that walk is ~170 ms, and `tests/frontend-load.spec.ts` measured what it costs
 * on the real surface. BOTH NUMBERS, because the delta is the argument:
 *
 *   through `forCell`      99 of 396 frames over the 32 ms budget,
 *                          max 442 ms, p95 418 ms, scroll 37,395 ms
 *   through `forCellText`   0 of 396 frames over budget,
 *                          max 23.8 ms, p95 17.1 ms, scroll 4,010 ms
 *
 * Same rows, same corpus, same machine, one call changed.
 *
 * Same cap, same steps, same module — bound in the function name for the reason
 * this file's header gives, so a call site cannot reach for the panel's 2,048 by
 * mistyping. `sanitise.spec.ts` holds the two paths to the same answer over the
 * whole hostile corpus.
 */
export function forCellText(value: string): string {
  return forDisplayText(value, TABLE_CELL_MAX_GRAPHEMES);
}

/** R2 for the evidence panel: the same, at 2,048, with control characters shown
 *  as visible escapes rather than removed — R2 step 1's one exception. */
export function forPanel(value: string): Displayed {
  return forEvidence(value, EVIDENCE_PANEL_MAX_GRAPHEMES);
}

/**
 * Thousands separators without `Intl`.
 *
 * `toLocaleString` would read differently under a different locale, and this
 * string is compared byte-for-byte by a spec. It is also the kind of dependency
 * that is present in the renderer and absent in QuickJS — the difference
 * `sanitise.ts` already had to reason about once.
 */
function grouped(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * The truncation affordance's sentence, or `undefined` when nothing was cut.
 *
 * `05-UI-SPEC.md § Copywriting Contract` fixes the wording. The rule that
 * outranks that whole table is stated there too: no copy on this page ever
 * contains an interpolated target-controlled string. This function is how that
 * is guaranteed rather than remembered — it takes the {@link Displayed} object
 * and reads only its two INTEGERS, so there is no substring of the value it
 * could carry even by accident.
 */
export function truncationNotice(displayed: Displayed): string | undefined {
  if (displayed.shown >= displayed.total) return undefined;
  return `Truncated at ${grouped(displayed.shown)} of ${grouped(displayed.total)} characters.`;
}

/**
 * The byte range of what the panel is showing, as R2 step 3 requires it stated.
 *
 * THREE INTEGERS, ALL THREE FROM THE BACKEND, AND THAT IS THE WHOLE POINT.
 * {@link forPanel}'s object deliberately carries no byte count — this module's
 * header says why — so this sentence is built from what the backend supplied
 * BESIDE the value rather than from the display text. Deriving a byte count
 * from a grapheme-truncated string is the silently-wrong arithmetic
 * {@link assertHighlightRanges} exists to make loud, and doing it inside a copy
 * string would put it somewhere nothing checks.
 *
 * It is a SEPARATE SENTENCE from {@link truncationNotice}, not a merged one:
 * that counts GRAPHEMES in the frontend's space and this counts BYTES in the
 * backend's, and a single sentence carrying both invites a reader to treat one
 * as a conversion of the other. Decision P5-D26, owed by plan 05-10.
 */
export function byteRangeNotice(
  byteRange: { readonly start: number; readonly end: number },
  byteTotal: number,
): string {
  return `Showing bytes ${grouped(byteRange.start)}–${grouped(byteRange.end)} of ${grouped(byteTotal)} bytes.`;
}

/**
 * "Copy full value" — clipboard only.
 *
 * THE FULL VALUE NEVER ENTERS THE DOM, and that is this function's entire
 * reason to exist. The classic `document.execCommand("copy")` fallback works by
 * creating a textarea, putting the value in it, selecting it and copying —
 * which places the untruncated value in the document, exactly what R2 forbids.
 * So there is no fallback: on a runtime without the async clipboard API this
 * throws and the caller surfaces a failure, because a silent downgrade to the
 * textarea trick would be a security regression that looks like a convenience.
 */
export async function copyToClipboard(value: string): Promise<void> {
  // Typed STRUCTURALLY rather than as the DOM's `Navigator`, the same way
  // sanitise.ts declares its `GraphemeSegmenter`: the lint program
  // (tsconfig.eslint.json) carries no DOM lib, and naming the global there
  // reports it as an unsupported Node builtin. The shape is the contract; the
  // optional `navigator` is what makes the absence path reachable.
  const clipboard = (
    globalThis as {
      navigator?: { clipboard?: { writeText(text: string): Promise<void> } };
    }
  ).navigator?.clipboard;
  if (clipboard === undefined) {
    throw new Error(
      "Clipboard unavailable. DefMiner deliberately has NO document.execCommand " +
        "fallback: that path copies by putting the full value into the document, " +
        "and R2 forbids the untruncated value ever entering the DOM.",
    );
  }
  await clipboard.writeText(value);
}

/**
 * The highlight precondition, asserted rather than repaired.
 *
 * Ranges must be ascending, non-overlapping and inside the DISPLAY text.
 * Silently sorting or merging them would hide a backend defect on the one
 * surface whose correctness the operator triages on — and a highlight in the
 * wrong place is worse than no highlight, because it is an assertion about
 * where the match was.
 *
 * TWO LENGTH SPACES, AND THEY ARE NOT INTERCHANGEABLE. The backend supplies
 * offsets in BYTES. The text reaching this component has been truncated in
 * GRAPHEMES by {@link forCell}/{@link forPanel}. A byte offset applied to a
 * grapheme-truncated string is wrong, and it is wrong QUIETLY — it highlights a
 * plausible-looking wrong substring. The caller is responsible for supplying
 * offsets into the displayed string; this bounds check is the last place that
 * mistake can be made loud, and it is where a future off-by-a-grapheme defect
 * will land. (Recorded as this plan's unresolved EDGE UISEC-01 / encoding.)
 *
 * Touching ranges — `end === start` of the next — are LEGAL and stay two
 * ranges (EDGE UISEC-01 / adjacency): merging them would make the rendered
 * spans no longer correspond one-to-one with what the backend reported.
 */
export function assertHighlightRanges(
  text: string,
  ranges: readonly HighlightRange[],
): void {
  const show = (range: HighlightRange): string =>
    `[${String(range.start)}, ${String(range.end)}]`;

  let previous: HighlightRange | undefined;
  for (const range of ranges) {
    if (
      !Number.isInteger(range.start) ||
      !Number.isInteger(range.end) ||
      range.start < 0 ||
      range.end < range.start
    ) {
      throw new RangeError(
        `HighlightSlices: ${show(range)} is not a valid half-open range. ` +
          `Offsets must be non-negative integers with start <= end.`,
      );
    }
    if (range.end > text.length) {
      throw new RangeError(
        `HighlightSlices: ${show(range)} runs past the end of the display text ` +
          `(length ${String(text.length)}). The backend's offsets are in BYTES and ` +
          `this text has been grapheme-truncated — the two spaces are not ` +
          `interchangeable. Supply offsets into the DISPLAYED string.`,
      );
    }
    if (previous !== undefined && range.start < previous.end) {
      throw new RangeError(
        `HighlightSlices: ranges must be ascending and non-overlapping, but ` +
          `${show(previous)} is followed by ${show(range)}. Sorting or merging ` +
          `them here would hide a backend defect on a surface the operator ` +
          `triages on.`,
      );
    }
    previous = range;
  }
}
