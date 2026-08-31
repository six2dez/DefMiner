// packages/frontend/src/components/scan-lifecycle-presentation.ts — the
// retroactive scan's LIFECYCLE vocabulary, once, as the surfaces that render it
// need it.
//
// ===========================================================================
// THIS IS THE SECOND STATUS VOCABULARY AND THAT IS THE HARDEST DETAIL IN THE
// PHASE
// ===========================================================================
// `scan-state-presentation.ts` beside this file holds the SHIPPED one: the
// ANALYSIS state of one artifact, bound to the `analyses.scan_state` CHECK.
// This one is the LIFECYCLE state of a retroactive backfill, bound to the
// `scans.state` CHECK. Two closed vocabularies, one word "scan", and `running`
// is a literal member of both. An operator who reads a word and cannot tell
// whether *this artifact's analysis* or *a backfill of months of traffic* is
// being described has been told nothing.
//
// Five mechanisms keep them apart (06-UI-SPEC.md § "Two Vocabularies With One
// Name"). Three of them are in this file: the vocabulary is its own type in the
// engine contract, no label here is shared with — or a PREFIX of — one there,
// and the renderer is its own component with its own marker rather than a
// widened prop on the shipped badge.
//
// ===========================================================================
// THE `Record` IS THE WHOLE MECHANISM, NOT THE COMMENT
// ===========================================================================
// `Record<ScanLifecycleState, …>` and NOT `Partial<Record<…>>`. A fifth state
// added to `SCAN_LIFECYCLE_STATES` without a row here is a TYPECHECK ERROR, and
// a state removed from it leaves an excess key that is also an error. The
// alternative — a switch with a default arm, or a lookup with a fallback —
// turns a vocabulary change into a badge that quietly renders nothing, and a
// scan whose state renders as nothing is a scan the operator believes is not
// there. `scan-state-presentation.ts` makes the same argument about the same
// shape, and this file is deliberately built to its pattern rather than to a
// second one.
//
// EVERY MEMBER OF THE VOCABULARY APPEARS EXACTLY ONCE IN THIS FILE, as a key of
// the map below and nowhere else — not in a branch, not in a comment. That is
// why the notes here describe the members rather than naming them.
//
// ===========================================================================
// **Finished**, NOT "Completed" — AND THIS IS THE DECISION THE WHOLE GUARD WAS
// BUILT AROUND
// ===========================================================================
// The obvious label for the terminal state is "Completed". It must not be used.
// The analysis vocabulary already ships **Complete**, and *Complete* /
// *Completed* is a one-character difference between two states that mean
// OPPOSITE things: "every byte of this artifact was inspected" and "this
// backfill reached the end of the filter's range". On a triage surface a
// one-character difference is not a difference — the operator reads the word
// they expected. "Finished" shares no prefix with any shipped label and reads
// correctly for a job.
//
// `scan-lifecycle-presentation.spec.ts` asserts that mechanically, over the
// union of BOTH maps' labels AND the computed words in `scan-contract.ts`, as a
// case-insensitive prefix relation rather than set disjointness — because
// disjointness is exactly the check that would pass Complete beside Completed.
//
// ===========================================================================
// COLOUR IS NEVER THE SOLE CARRIER OF MEANING
// ===========================================================================
// Every presentation pairs a LABEL with its tone, for the three reasons
// 05-UI-SPEC.md § "Color" weighs in order: a colour the operator cannot
// distinguish is a state silently presented as another one; the operator can
// restyle the `--c-*` variables and break any hue-based convention; and
// red/green colour vision deficiency is common in this user population. There
// is no hex literal in this file and there cannot be one.
//
// THE PALETTE HAS NO `warning` ROLE — verified against `@caido/tailwindcss@0.1.0`
// and stated in the design contract — so the stopped-early state is `info` plus
// its mandatory label, which is the better answer anyway: the word survives a
// theme change and a monochrome screenshot.

import type { ScanLifecycleState } from "@defminer/engine/contract";

import {
  SCAN_STATUS_DISCARDED,
  SCAN_STATUS_FINISHED,
  SCAN_STATUS_SCANNING,
  SCAN_STATUS_SUSPENDED,
} from "./scan-contract";

/** One lifecycle state's presentation: the operator-facing word and its Caido
 *  role. */
export type ScanLifecyclePresentation = {
  readonly label: string;
  readonly toneClass: string;
};

/**
 * The four states, exhaustively.
 *
 * THE LABELS ARE IMPORTED FROM `scan-contract.ts`, NEVER RESTATED HERE. The
 * progress readout renders a COMPUTED word for the same states and the toolbar
 * badge renders this map; two spellings of one word is how a toolbar and a tab
 * come to disagree about the same scan. The copy module is the one place a
 * string is typed, exactly as `panel-contract.ts` and `health-contract.ts`
 * already establish for their own surfaces.
 *
 * `surface-400` carries the two states that are neither good news nor bad — a
 * walk in flight and a scan whose position is gone. `info` carries the
 * stopped-early state, `success` the one that reached the end of its range.
 */
export const SCAN_LIFECYCLE_PRESENTATION: Readonly<
  Record<ScanLifecycleState, ScanLifecyclePresentation>
> = Object.freeze({
  running: { label: SCAN_STATUS_SCANNING, toneClass: "text-surface-400" },
  suspended: { label: SCAN_STATUS_SUSPENDED, toneClass: "text-info-500" },
  completed: { label: SCAN_STATUS_FINISHED, toneClass: "text-success-500" },
  discarded: { label: SCAN_STATUS_DISCARDED, toneClass: "text-surface-400" },
});
