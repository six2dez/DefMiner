<script setup lang="ts">
// packages/frontend/src/components/ScanLifecycleBadge.vue — the retroactive
// scan's LIFECYCLE vocabulary, rendered.
//
// ===========================================================================
// IT DOES NOT WIDEN StatusBadge.vue's PROP, AND THAT IS A MECHANISM
// ===========================================================================
// The obvious economy is one badge taking `ScanState | ScanLifecycleState`.
// It must not be taken. That prop would give the compiler nothing to check —
// `running` is a member of BOTH vocabularies, so no union arm can be
// distinguished by its value — and it would move the Complete/Finished
// decision out of a type and into a component, which is exactly where 06-UI-SPEC
// § "Two Vocabularies With One Name" mechanism 5 says it must not live.
//
// Two components, two markers, two maps. `StatusBadge.vue` carries
// `data-defminer-status-badge`; this one carries
// `data-defminer-scan-lifecycle`. A surface that renders the wrong badge is
// then a wrong TYPE at the call site rather than a wrong WORD on the screen.
//
// ===========================================================================
// THE LABEL MAP IS DERIVED FROM THE VOCABULARY, NEVER RESTATED BESIDE IT
// ===========================================================================
// `SCAN_LIFECYCLE_STATES` is the closed list the `scans.state` CHECK constraint
// enforces, and `Record<ScanLifecycleState, …>` in
// `./scan-lifecycle-presentation` is the whole mechanism: a fifth state added
// there without a row here is a typecheck error. That file carries the full
// argument, including why the terminal state's word is "Finished".
//
// ===========================================================================
// COLOUR IS NEVER THE SOLE CARRIER OF MEANING
// ===========================================================================
// The badge renders its LABEL as text next to its colour, always. A colour the
// operator cannot distinguish is a state silently presented as another one, the
// `--c-*` variables are theirs to restyle, and red/green colour vision
// deficiency is common in this user population.

import type { ScanLifecycleState } from "@defminer/engine/contract";
import { computed } from "vue";

import type { ScanLifecyclePresentation } from "./scan-lifecycle-presentation";
import { SCAN_LIFECYCLE_PRESENTATION } from "./scan-lifecycle-presentation";

const { state } = defineProps<{ state: ScanLifecycleState }>();

const presentation = computed<ScanLifecyclePresentation>(
  () => SCAN_LIFECYCLE_PRESENTATION[state],
);

// THE TEMPLATE IS ONE ELEMENT, carrying BOTH the tone class and the word. They
// are not separable: an implementation that put the colour on a dot and the
// word somewhere optional would let a later edit drop the word and keep the
// dot. `whitespace-pre` keeps the badge inside the fixed row height.
//
// AND THERE IS NO TOP-LEVEL COMMENT IN THE `<template>`. A comment there is a
// NODE: it makes the component a FRAGMENT, `wrapper.element` then resolves to
// the mount container rather than to the span, and every class assertion reads
// `[]`. The trap StatusBadge.vue and safety/HighlightSlices.vue both record.
</script>

<template>
  <span
    :class="[presentation.toneClass, 'whitespace-pre text-xs font-semibold']"
    data-defminer-scan-lifecycle
    >{{ presentation.label }}</span
  >
</template>
