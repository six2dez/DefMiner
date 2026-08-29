// packages/frontend/src/components/scan-state-presentation.ts — the shipped
// `scan_state` vocabulary, once, as the two surfaces that render it need it.
//
// ===========================================================================
// WHY THIS MOVED OUT OF StatusBadge.vue
// ===========================================================================
// The map used to live in that component, and its header's argument for
// keeping it there is unchanged and still the point: `Record<ScanState, …>` is
// the MECHANISM. A sixth state added to `SCAN_STATES` without a row here is a
// typecheck error, and a state removed leaves an excess key that is also an
// error. The alternative — a switch with a default arm, or a lookup with a
// fallback — turns a vocabulary change into a badge that quietly renders
// nothing, and under UI-09 a degraded analysis rendering as nothing is a
// degraded analysis silently presented as complete.
//
// WHAT CHANGED IS THE NUMBER OF RENDERERS, NOT THE NUMBER OF DECLARATIONS.
// Plan 05-10's evidence panel has to state an analysis state IN WORDS, and it
// cannot reuse `StatusBadge` to do it: that component carries a
// `data-defminer-status-badge` marker, and the panel asserts — per test, over
// its rendered subtree — that no node inside it carries a `title` attribute or
// a `data-`prefixed one (R2's absolute). Copying the five labels into the
// panel would have been the second declaration this file exists to prevent, so
// the map moved here and both components import it.
//
// EVERY MEMBER OF THE VOCABULARY APPEARS EXACTLY ONCE IN THIS FILE, as a key of
// the map below and nowhere else — not in a branch, not in a comment. That is
// why the notes here describe the members rather than naming them.
//
// ===========================================================================
// COLOUR IS NEVER THE SOLE CARRIER OF MEANING
// ===========================================================================
// Every presentation pairs a LABEL with its tone. Three reasons, in the order
// 05-UI-SPEC.md § "Color" weighs them: UI-09 forbids a degraded analysis being
// silently presented as complete, and a colour the operator cannot distinguish
// is exactly that silence; the operator can restyle the `--c-*` variables and
// break any hue-based convention; and red/green colour vision deficiency is
// common in this user population.
//
// THE PALETTE HAS NO `warning` ROLE — verified against `@caido/tailwindcss@0.1.0`
// and stated in the design contract — so the stopped-early state cannot be a
// yellow. It is `info` plus the mandatory label, which is the better answer
// anyway: the word survives a theme change and a monochrome screenshot.

import type { ScanState } from "@defminer/engine/contract";

/** One state's presentation: the operator-facing word and its Caido role. */
export type ScanStatePresentation = {
  readonly label: string;
  readonly toneClass: string;
};

/**
 * The five states, exhaustively.
 *
 * `Record<ScanState, …>` and not `Partial<Record<…>>`: the compiler is the
 * mechanism here, not the comment. Colours are the six Caido roles — there is
 * no hex literal in this file and there cannot be one, because `--c-*` is
 * operator-customisable and a hardcoded colour survives their theme change as
 * the one unreadable element on the page.
 *
 * `surface-400` carries the two not-yet-finished states: they are the design
 * contract's level-4 tone, which is neither good news nor bad (UI-SPEC FLAG F4
 * asked for that step to be enumerated; this is a use of it).
 */
export const SCAN_STATE_PRESENTATION: Readonly<
  Record<ScanState, ScanStatePresentation>
> = Object.freeze({
  pending: { label: "Queued", toneClass: "text-surface-400" },
  running: { label: "Analysing", toneClass: "text-surface-400" },
  done: { label: "Complete", toneClass: "text-success-500" },
  partial: { label: "Partial", toneClass: "text-info-500" },
  failed: { label: "Failed", toneClass: "text-danger-500" },
});
