// packages/frontend/src/components/panel-contract.ts — the evidence panel's
// fixed height and its approved copy, in one place a spec can hold it to.
//
// ===========================================================================
// WHY THE HEIGHT IS A CONSTANT PLUS A LOOKUP, NOT A CLASS WRITTEN TWICE
// ===========================================================================
// Exactly the argument `table-contract.ts` makes for the row height, and it is
// load-bearing for the same reason: a Vue template cannot apply a NUMBER, it
// applies a Tailwind utility, and Tailwind's JIT only emits a utility it can
// SEE spelled out in the scanned source. `h-[${EVIDENCE_PANEL_HEIGHT_PX}px]`
// would scan as nothing and the built stylesheet would carry no rule at all —
// which `tailwind.config.ts` already records as a failure that SUCCEEDS: the
// build passes and the region renders at its content's height, which is
// precisely the collapsing panel the design contract forbids.
//
// So the class is a LOOKUP KEYED BY THE CONSTANT and it THROWS on a missing
// entry, while the module is being imported, naming both halves.
//
// ===========================================================================
// WHY THE COPY LIVES HERE AND NOT IN THE COMPONENT
// ===========================================================================
// The spec asserts the panel's sentences BY VALUE, and a spec that restated
// them would be a second copy of an approved string — the failure mode where
// the test passes and the operator reads something the contract never
// approved. Both import from here.
//
// THE RULE THAT OUTRANKS THE COPY TABLE APPLIES TO EVERY STRING BELOW: no copy
// on this page contains an interpolated target-controlled string inside a
// sentence. The only interpolations here are INTEGERS and a DefMiner-authored
// reason code, and the two functions that interpolate take exactly those
// types — so there is no substring of a hostile value they could carry even by
// accident. That is the same device `safety/display.ts`'s `truncationNotice`
// uses, for the same reason.

/**
 * The evidence panel's fixed height, in CSS pixels.
 *
 * FIXED, NOT FLUID, AND THAT IS THE WHOLE DESIGN. 05-UI-SPEC.md's
 * `loading / evidence-panel` row: "the panel is a persistent region, so while a
 * selected row's evidence loads it renders a skeleton at its own fixed height
 * and does not collapse or unmount. A collapsing panel would reflow the split
 * body on every row click — the same defect the table's no-spinner rule exists
 * to prevent." The operator clicks this surface thousands of times.
 *
 * 384px is the design contract's largest spacing step doubled; what matters is
 * that it is ONE number, applied in ONE place, and that the panel's own body
 * scrolls inside it rather than growing the page.
 */
export const EVIDENCE_PANEL_HEIGHT_PX = 384;

/** The Tailwind utilities registered for a panel height. Literals, so the JIT
 *  can see them. */
const PANEL_HEIGHT_CLASSES: Readonly<Record<number, string>> = Object.freeze({
  384: "h-96",
});

/**
 * The panel's height class, resolved from {@link EVIDENCE_PANEL_HEIGHT_PX} at
 * import.
 *
 * THROWS RATHER THAN FALLS BACK. A missing entry means the number and the class
 * have parted company, and a fallback would render a panel that collapses to
 * its content — which is the one property this component exists to guarantee.
 */
export const EVIDENCE_PANEL_HEIGHT_CLASS: string = (() => {
  const found = PANEL_HEIGHT_CLASSES[EVIDENCE_PANEL_HEIGHT_PX];
  if (found === undefined) {
    throw new Error(
      `panel-contract: EVIDENCE_PANEL_HEIGHT_PX is ` +
        `${String(EVIDENCE_PANEL_HEIGHT_PX)} but no Tailwind utility is ` +
        `registered for it. Add the class to PANEL_HEIGHT_CLASSES as a ` +
        `LITERAL — Tailwind's JIT only emits a utility it can see spelled out ` +
        `in the scanned source, so an interpolated arbitrary value would emit ` +
        `nothing and the panel would collapse to its content without failing.`,
    );
  }
  return found;
})();

/**
 * The evidence excerpt and the byte range the BACKEND stated for it.
 *
 * THREE INTEGERS AND A STRING, AND THE INTEGERS ARE THE BACKEND'S. R2 requires
 * the panel state "the byte range of what is shown", and `safety/display.ts`'s
 * `Displayed` object deliberately carries NO byte count — bytes are the
 * backend's length space, the display text has been grapheme-truncated in the
 * frontend's, and one object carrying both invites exactly the arithmetic that
 * is silently wrong (decision P5-D26, owed by this plan and paid here). So the
 * range arrives BESIDE the value rather than being derived from it.
 *
 * `value` is TARGET-CONTROLLED and is the only field on this type that is. It
 * reaches the DOM only through `safety/display.ts`'s `forPanel`.
 *
 * THERE IS NO PRODUCER FOR THIS TYPE ON THE RUNNING PAGE YET. Phase 4's
 * `evidence` table (plan 04-03) supplies it; until then the mounting component
 * passes `null` and the panel says what it is waiting on. The type is
 * published now so the deferred pass adds a field rather than restructuring a
 * region — the entity contract's deferral register records exactly that.
 */
export type PanelEvidence = {
  readonly value: string;
  readonly byteRange: { readonly start: number; readonly end: number };
  readonly byteTotal: number;
};

// ---------------------------------------------------------------------------
// COPY — 05-UI-SPEC.md § "Copywriting Contract", VERBATIM
// ---------------------------------------------------------------------------

/** The panel region's accessible name and heading. */
export const EVIDENCE_HEADING = "Evidence";

/** Nothing is selected. Not an error and not an absence of evidence — the
 *  operator has not asked about a row yet. */
export const NO_SELECTION_BODY =
  "No row selected. Choose a row to see its evidence here.";

/** The panel's own loading label. Skeleton lines at the fixed height, never a
 *  spinner — a spinner reflows the region when it resolves. */
export const LOADING_LABEL = "Loading evidence…";

/** A failed LOAD, which is not the same claim as a failed ANALYSIS. Rendering
 *  an empty frame here would tell the operator there is no evidence for this
 *  row, which is a different and false claim. */
export const LOAD_FAILED_BODY =
  "Could not load this row's evidence. The DefMiner backend did not answer — it may be busy analysing a large bundle, which blocks its single thread. Select the row again, or open Health to see queue depth and dropped count.";

/** The artifact exists and has never been analysed. A real state of a real
 *  row: a sighting writes the artifact before any analysis is claimed. */
export const NEVER_ANALYSED_BODY =
  "This artifact has not been analysed yet. DefMiner analyses in the background, on one thread; it appears here once the walk has run.";

/**
 * What a queued analysis actually means here, said rather than left to be
 * inferred from one word.
 *
 * THE LIMIT OF OPS-03, STATED ON THE SURFACE THAT CREATES IT. A retry clears
 * the row and returns it to the queued state; it does NOT re-walk the bytes,
 * because DefMiner does not retain them — the `artifacts` table stores a
 * digest, a length and a kind, and no body. The row is a durable record that
 * work is outstanding (which is exactly what the queued state is for), and the
 * walk happens the next time the target serves those bytes.
 *
 * Leaving this unsaid would be the more comfortable choice and the wrong one:
 * an operator who read "Queued" and waited would be waiting for something that
 * is not going to happen on its own. DefMiner never requests anything from the
 * target, and this is one of the places that costs something.
 */
export const QUEUED_BODY =
  "Queued for re-analysis. DefMiner re-walks these bytes the next time the target serves them — it never requests them itself.";

/** The label of the analysis-state line, so the word beside it is never a bare
 *  noun the operator has to guess the subject of. */
export const ARTIFACT_VERSION_LABEL = "Analysed under rule corpus";

/** The panel's own dismissal. A TEXT LABEL, never an icon — DefMiner ships no
 *  icon package and a 10,000-row triage surface is a keyboard surface.
 *
 *  CLOSING CLEARS THE SELECTION AND THE PANEL FLAG AND DOES NOTHING ELSE. In
 *  particular it does not apply the coalescing pill's pending count: the pill
 *  never auto-applies (UI-SPEC Open Decision D4), and a close that silently
 *  re-ordered the table would be the row shift the flag exists to prevent,
 *  arriving at the moment the operator stopped looking. */
export const CLOSE_LABEL = "Close evidence";

/** 05-UI-SPEC.md § "Copywriting Contract", Retry CTA. */
export const RE_ANALYSE_LABEL = "Re-analyse this artifact";

/** The in-flight label. Its own words, so the disabled state is legible
 *  without colour — the same rule the settings form's "Saving…" follows. */
export const RE_ANALYSING_LABEL = "Re-analysing…";

/** A retry that did not land. The prior state stays visibly in place beside
 *  this; the panel never shows a state that was not persisted. */
export const RETRY_FAILED_BODY =
  "The re-analysis was not recorded and nothing changed. The state above is still what DefMiner has stored. Try again, or open Health to see whether the backend is busy.";

/** UI-03's source-request line, deferred. Names the phase that supplies it. */
export const SOURCE_REQUEST_PENDING =
  "Source request: not linked yet — the evidence table that ties a finding to the request it came from is Phase 4 (plan 04-03).";

/** UI-03's byte-offset line, deferred, when no evidence record is present. */
export const BYTE_RANGE_PENDING =
  "Byte offsets: none yet — there are no evidence records to slice, and Phase 4 (plan 04-03) is what creates them.";

/** The snippet slot, deferred. An EMPTY REGION HERE READS AS "no evidence for
 *  this row", which is a different and false claim from "the table that holds
 *  it does not exist yet". */
export const SNIPPET_PENDING =
  "Evidence snippet: not available yet — Phase 4 (plan 04-03) stores the excerpt and the offsets it is sliced at.";

/** UI-04's score explanation, deferred. Same argument as the snippet: the slot
 *  is reserved and says what it is waiting on rather than rendering nothing. */
export const SCORE_PENDING =
  "Score explanation: not available yet — the signal vocabulary and the scorer are Phase 3 (plan 03-03). No score is shown because none has been computed.";

/** Thousands separators without `Intl`, for the reason `safety/display.ts`'s
 *  own `grouped` gives: `toLocaleString` reads differently under a different
 *  locale and these strings are compared byte-for-byte by a spec. */
function grouped(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * ERR-04's failure detail, verbatim.
 *
 * `05-UI-SPEC.md § "Copywriting Contract"`: **Analysis failed: {reason}. This
 * is not "no findings" — nothing was inspected.**
 *
 * `reason` IS A DefMiner-AUTHORED REASON CODE, never a message quoting the
 * artifact — the rule that outranks the whole copy table, and the reason this
 * function takes the code rather than a string the caller assembled. The
 * backend's analysis projection carries no `error` field at all, so there is no
 * target-adjacent string in this package that could be passed here.
 */
export function failureDetail(reason: string): string {
  return `Analysis failed: ${reason}. This is not "no findings" — nothing was inspected.`;
}

/**
 * UI-09's degraded marker, verbatim.
 *
 * `05-UI-SPEC.md § "Copywriting Contract"`: **Analysis stopped at
 * {bytes_walked} of {byte_len} bytes ({reason}). Findings below are a floor,
 * not a total.**
 *
 * Both counts are INTEGERS THE BACKEND MEASURED — `analyses.bytes_walked` and
 * `artifacts.byte_len` — and neither is derived from the other or from any
 * display text. A `null` on either side renders as `unknown` rather than as a
 * zero: a zero is a measurement, and claiming one that was never taken is the
 * kind of quietly wrong number this surface exists to avoid.
 */
export function degradedMarker(
  bytesWalked: number | null,
  byteLen: number | null,
  reason: string,
): string {
  const walked =
    bytesWalked === null ? "an unknown number of" : grouped(bytesWalked);
  const total = byteLen === null ? "an unknown number of" : grouped(byteLen);
  return `Analysis stopped at ${walked} of ${total} bytes (${reason}). Findings below are a floor, not a total.`;
}
