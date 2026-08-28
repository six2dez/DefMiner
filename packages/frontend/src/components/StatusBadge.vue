<script setup lang="ts">
// packages/frontend/src/components/StatusBadge.vue — the shipped `scan_state`
// vocabulary, rendered.
//
// ===========================================================================
// THE LABEL MAP IS DERIVED FROM THE VOCABULARY, NEVER RESTATED BESIDE IT
// ===========================================================================
// `SCAN_STATES` is the closed list the database's own CHECK constraint
// enforces. `Record<ScanState, …>` is the whole mechanism: a sixth state added
// to that list without a row here is a TYPECHECK ERROR, and a state removed
// from it leaves an excess key that is also an error. The alternative — a
// switch with a default arm, or a lookup with a fallback — turns a vocabulary
// change into a badge that quietly renders nothing, and under UI-09 a degraded
// analysis rendering as nothing is a degraded analysis silently presented as
// complete.
//
// EVERY MEMBER OF THE VOCABULARY APPEARS EXACTLY ONCE IN THIS FILE, as a key of
// the map below and nowhere else — not in a branch, not in a comment. 05-09's
// acceptance gate greps for exactly that, which is why the notes here describe
// the members rather than naming them: a second occurrence anywhere is the
// beginning of a restated vocabulary, and the gate would rather fail on a
// comment than let one start.
//
// ===========================================================================
// COLOUR IS NEVER THE SOLE CARRIER OF MEANING
// ===========================================================================
// Every badge renders its LABEL as text next to its colour. Three reasons, in
// the order 05-UI-SPEC.md § "Color" weighs them: UI-09 forbids a degraded
// analysis being silently presented as complete, and a colour the operator
// cannot distinguish is exactly that silence; the operator can restyle the
// `--c-*` variables and break any hue-based convention; and red/green colour
// vision deficiency is common in this user population.
//
// THE PALETTE HAS NO `warning` ROLE — verified against @caido/tailwindcss@0.1.0
// this session, and stated in the design contract. So the stopped-early state
// cannot be a yellow. It is `info` plus the mandatory label, which is the
// better answer anyway: the word survives a theme change and a monochrome
// screenshot, and the colour is reinforcement.

import type { ScanState } from "@defminer/engine/contract";
import { computed } from "vue";

/** One badge's presentation: the operator-facing word and its Caido role. */
type Presentation = { readonly label: string; readonly toneClass: string };

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
const PRESENTATION: Readonly<Record<ScanState, Presentation>> = Object.freeze({
  pending: { label: "Queued", toneClass: "text-surface-400" },
  running: { label: "Analysing", toneClass: "text-surface-400" },
  done: { label: "Complete", toneClass: "text-success-500" },
  partial: { label: "Partial", toneClass: "text-info-500" },
  failed: { label: "Failed", toneClass: "text-danger-500" },
});

const { state } = defineProps<{ state: ScanState }>();

const presentation = computed<Presentation>(() => PRESENTATION[state]);

// THE TEMPLATE IS ONE ELEMENT, carrying BOTH the tone class and the word. They
// are not separable: an implementation that put the colour on a dot and the
// word somewhere optional would let a later edit drop the word and keep the
// dot. `whitespace-pre` keeps the badge inside the fixed 32px row.
//
// AND THERE IS NO TOP-LEVEL COMMENT IN THE `<template>`. A comment there is a
// NODE: it makes the component a FRAGMENT, `wrapper.element` then resolves to
// the mount container rather than to the span, and every class assertion in
// FindingsTable.spec.ts reads `[]`. Measured this session — the same trap
// safety/HighlightSlices.vue already records.
</script>

<template>
  <span
    :class="[presentation.toneClass, 'whitespace-pre text-xs font-semibold']"
    data-defminer-status-badge
    >{{ presentation.label }}</span
  >
</template>
