// packages/frontend/src/components/source-producibility-presentation.ts — the
// recovered source's PRODUCIBILITY vocabulary, once, as the tree renders it.
//
// ===========================================================================
// THIS IS THE THIRD STATUS VOCABULARY, AND THE TWO BESIDE IT ALREADY COLLIDE
// ===========================================================================
// `scan-state-presentation.ts` holds the ANALYSIS state of one artifact, bound
// to the `analyses.scan_state` CHECK. `scan-lifecycle-presentation.ts` holds the
// LIFECYCLE state of a retroactive backfill, bound to the `scans.state` CHECK,
// and its header is an essay on why those two must not be merged. This one is
// the third, and `contract.ts` declares its vocabulary IMMEDIATELY AFTER the
// second so the collision is visible at the declaration rather than discovered
// at a call site three packages away.
//
// THE TWO AXES, STATED SO THEY CANNOT BE COLLAPSED:
//
//   `analyses.scan_state` answers DID DEFMINER FINISH LOOKING AT THESE BYTES.
//   `producibility`       answers CAN DEFMINER STILL SHOW YOU THESE BYTES.
//
// They are ORTHOGONAL and all four combinations are reachable and meaningful.
// One column cannot carry four states across two axes without inventing product
// names for the combinations, which is the "nothing found versus analysis
// broke" confusion ERR-02/OBS-02 exists to prevent, relocated into a new
// surface.
//
// ===========================================================================
// THE `Record` IS THE WHOLE MECHANISM, NOT THE COMMENT
// ===========================================================================
// `Record<SourceProducibility, …>` and NOT `Partial<Record<…>>`. A fourth
// member added to `SOURCE_PRODUCIBILITY_STATES` without a row here is a
// TYPECHECK ERROR, and a member removed from it leaves an excess key that is
// also an error. The alternative — a switch with a default arm, or a lookup
// with a fallback — turns a vocabulary change into a mark that quietly renders
// nothing, and a source whose state renders as nothing is a source the operator
// believes is fine. The two files beside this one make the same argument about
// the same shape, and this one is deliberately built to their pattern rather
// than to a third.
//
// ===========================================================================
// AND THE COMMON MEMBER RENDERS NOTHING AT ALL — NO WORD, NO TONE, NO ELEMENT
// ===========================================================================
// That is not an omission and it is not the fallback the paragraph above
// forbids: it is a ROW, stated as two nulls, and the compiler still requires it.
//
// It is 07-UI-SPEC.md § "Three Vocabularies Now" mechanism 5's fourth
// replacement requirement, and it does two things at once. A vocabulary whose
// COMMON member is invisible cannot be confused with one whose every member is
// visible — the operator never sees a producibility word beside an analysis
// word in the ordinary case, because in the ordinary case there is no
// producibility word. And it keeps the tree QUIET, which is what makes a
// tombstone legible when one finally appears: a column in which every row says
// something is a column in which nothing says anything.
//
// ===========================================================================
// **Gone** AND **Changed**, AND WHY NOT *Missing*, *Lost* OR *Incomplete*
// ===========================================================================
// Nine operator-facing state words are already in use — Queued, Analysing,
// Complete, Partial, Failed, Scanning, Suspended, Finished, Discarded. Neither
// of these two shares a stem with any of them, neither is a prefix of any of
// them, and none of them is a prefix of these.
//
// *Missing*, *Lost* and *Incomplete* were REJECTED, all three against
// **Partial**: none is clearly distinguishable from it in an operator's
// peripheral vision on a surface where both vocabularies are one region apart.
// `scan-lifecycle-presentation.spec.ts` asserts the relation mechanically over
// the union of all THREE maps' labels plus the computed words, as a
// case-insensitive PREFIX relation rather than set disjointness — because
// disjointness is exactly the check that would pass "Complete" beside
// "Completed".
//
// ===========================================================================
// PRODUCIBILITY CONSUMES NO CHROMATIC ROLE
// ===========================================================================
// The tone is the neutral level-4 surface tone and nothing else. The
// informational and degradation roles are bound to the ANALYSIS vocabulary, and
// painting a producibility state with the analysis vocabulary's degradation
// colour is exactly the cross-vocabulary confusion the two-vocabularies essay
// spends thirty lines refusing. There is no hex literal in this file and there
// cannot be one: `--c-*` is the operator's to restyle.

import type { SourceProducibility } from "@defminer/engine/contract";

/**
 * One producibility outcome's presentation.
 *
 * BOTH FIELDS ARE NULLABLE TOGETHER, and that pairing is the type-level
 * statement of the invisible-common-member rule: a row either renders a word
 * and a tone, or renders nothing. It cannot render a tone with no word — which
 * would be colour as the sole carrier of meaning, the thing 05-UI-SPEC.md §
 * "Color" bans for the three reasons it weighs in order.
 */
export type SourceProducibilityPresentation = {
  /** The operator-facing word, or `null` for the member that renders nothing. */
  readonly label: string | null;
  /** The Caido role, or `null` for the same member. */
  readonly toneClass: string | null;
};

/**
 * The three outcomes, exhaustively.
 *
 * EVERY MEMBER OF THE VOCABULARY APPEARS EXACTLY ONCE IN THIS FILE, as a key of
 * this map and nowhere else — not in a branch, not in a comment. That is why
 * the notes here describe the members rather than naming them.
 */
export const SOURCE_PRODUCIBILITY_PRESENTATION: Readonly<
  Record<SourceProducibility, SourceProducibilityPresentation>
> = Object.freeze({
  // The ordinary case. Nothing at all — see this file's header.
  producible: { label: null, toneClass: null },
  // The tombstone: Caido no longer has the originating request.
  gone: { label: "Gone", toneClass: "text-surface-400" },
  // The redeploy: the response came back and no longer matches the digest.
  changed: { label: "Changed", toneClass: "text-surface-400" },
});
