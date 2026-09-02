<script setup lang="ts">
// packages/frontend/src/components/ProducibilityMark.vue — the recovered
// source's PRODUCIBILITY vocabulary, rendered.
//
// ===========================================================================
// IT IS NOT A BADGE, AND IT DOES NOT WIDEN StatusBadge.vue's PROP
// ===========================================================================
// The obvious economy is one badge taking `ScanState | ScanLifecycleState |
// SourceProducibility`. It must not be taken, for the reason
// `ScanLifecycleBadge.vue` already refused the two-way version of the same
// bargain: a union prop gives the compiler nothing to check at exactly the
// sites where a wrong state is invisible, and it moves a vocabulary decision
// out of a type and into a component.
//
// Three components, three markers, three maps. `StatusBadge.vue` carries
// `data-defminer-status-badge`, `ScanLifecycleBadge.vue` carries
// `data-defminer-scan-lifecycle`, and this one carries
// `data-defminer-source-producibility`. A surface that renders the wrong one is
// then a wrong TYPE at the call site rather than a wrong WORD on the screen.
//
// IT IS ALSO NOT SHAPED LIKE A BADGE. A badge is a persistent chip on a row
// that always says something; this is a MARK that appears only when a source
// has stopped being producible. 07-UI-SPEC.md § "Three Vocabularies Now"
// mechanism 4 asks for its own renderer, and a renderer that borrowed the
// badge's silhouette would put the two vocabularies one glance apart again.
//
// ===========================================================================
// THE COMMON MEMBER RENDERS NOTHING — NO WORD, NO TONE, NO ELEMENT
// ===========================================================================
// Not an empty string in a span: NO ELEMENT. `source-producibility-presentation.ts`
// carries the full argument. What matters here is that the `v-if` is on the
// only element this component has, so the rendered subtree for the ordinary
// case is empty and a spec can assert that rather than asserting a blank.
//
// ===========================================================================
// COLOUR IS NEVER THE SOLE CARRIER OF MEANING
// ===========================================================================
// The mark renders its WORD as text next to its tone, always, and the map's
// type makes the two nullable together so a tone without a word is not
// representable.

import type { SourceProducibility } from "@defminer/engine/contract";
import { computed } from "vue";

import type { SourceProducibilityPresentation } from "./source-producibility-presentation";
import { SOURCE_PRODUCIBILITY_PRESENTATION } from "./source-producibility-presentation";

const { producibility } = defineProps<{ producibility: SourceProducibility }>();

const presentation = computed<SourceProducibilityPresentation>(
  () => SOURCE_PRODUCIBILITY_PRESENTATION[producibility],
);

// THERE IS NO TOP-LEVEL COMMENT IN THE `<template>`. A comment there is a NODE:
// it makes the component a FRAGMENT, `wrapper.element` then resolves to the
// mount container rather than to the span, and every class assertion reads `[]`.
// The trap StatusBadge.vue, ScanLifecycleBadge.vue and safety/HighlightSlices.vue
// all record.
</script>

<template>
  <span
    v-if="presentation.label !== null"
    :class="[presentation.toneClass, 'whitespace-pre text-xs font-semibold']"
    data-defminer-source-producibility
    >{{ presentation.label }}</span
  >
</template>
