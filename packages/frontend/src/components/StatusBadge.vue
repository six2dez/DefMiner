<script setup lang="ts">
// packages/frontend/src/components/StatusBadge.vue — the shipped `scan_state`
// vocabulary, rendered.
//
// ===========================================================================
// THE LABEL MAP MOVED TO ./scan-state-presentation.ts (PLAN 05-10)
// ===========================================================================
// It is imported below and is still the same single declaration; what changed
// is that it now has TWO renderers. The evidence panel has to state an
// analysis state in words and cannot reuse this component to do it — this one
// carries a `data-defminer-status-badge` marker and the panel asserts, over
// its rendered subtree, that no node inside it carries a `title` or a
// `data-`prefixed attribute (R2's absolute). Copying the five labels into the
// panel would have been the second declaration the map exists to prevent.
//
// The argument for the map's SHAPE is unchanged and now lives beside it:
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

import type { ScanStatePresentation } from "./scan-state-presentation";
import { SCAN_STATE_PRESENTATION } from "./scan-state-presentation";

const { state } = defineProps<{ state: ScanState }>();

const presentation = computed<ScanStatePresentation>(
  () => SCAN_STATE_PRESENTATION[state],
);

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
