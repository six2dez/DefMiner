<script setup lang="ts">
// packages/frontend/src/safety/HighlightSlices.vue — R1's highlighting rule.
//
// "Match highlighting inside an evidence snippet is done by SLICING, not by
// markup. The snippet is split at the offsets into three plain strings rendered
// into three sibling elements (before / match / after), the middle one carrying
// a background class. Building a `<mark>` string by concatenation and rendering
// it is precisely the defect this rule exists to prevent."
//
// Generalised from three elements to `2n+1` for `n` ranges, which is the same
// rule counted properly: one lead-in, then a match and a gap per range, then a
// tail. Every one of those strings comes out of `String.prototype.slice`, so no
// string this component builds can contain a tag — and `frontend-safety.spec.ts`
// reports `markup-string-construction` on anyone who tries the other way.
//
// The gaps are rendered even when EMPTY. Two ranges that touch produce a
// zero-length gap element between them, and it stays: the rendered spans then
// correspond one-to-one with the offsets the backend reported, which is what
// makes a wrong highlight auditable instead of merely wrong (EDGE UISEC-01 /
// adjacency). Same reason the whole value renders as one element rather than
// none when there are no ranges at all (EDGE UISEC-01 / empty) — an omitted
// element moves the column.

// EVERY ELEMENT CARRIES `CELL_TEXT_CLASS` — `font-mono` so a lookalike
// character is visible, `whitespace-pre` and `overflow-hidden` so a value
// containing a newline cannot grow the fixed row and break the recycling
// scroller's geometry (R2 step 4). There is no `title` attribute and no
// `data-*` attribute anywhere in this component; R2 forbids both absolutely and
// `frontend-safety.spec.ts` enforces the absolute.
//
// THE TEMPLATE HAS EXACTLY ONE ROOT NODE AND NO TOP-LEVEL COMMENT. A comment at
// the top level of a `<template>` is a NODE: it makes the component a fragment,
// `wrapper.element` then resolves to the mount container rather than to the
// outer span, and every class assertion in display.spec.ts reads `''`. Measured
// this session — it is why this note lives here and not there.

import { computed } from "vue";

import type { HighlightRange } from "./display";
import {
  assertHighlightRanges,
  CELL_TEXT_CLASS,
  HIGHLIGHT_CLASS,
} from "./display";

// Destructured directly, with the default in the pattern. Vue 3.5 compiles a
// destructured prop back into a property access at every use site, so
// reactivity is preserved — which is why `vue/define-props-destructuring`
// prefers this over `withDefaults` and why the reads inside the computed below
// still track.
const { text, ranges = [] } = defineProps<{
  /** The DISPLAY text — already through `forCell` or `forPanel`. */
  text: string;
  /** Ascending, non-overlapping ranges into `text`. */
  ranges?: readonly HighlightRange[];
}>();

type Slice = { key: string; text: string; match: boolean };

const slices = computed<Slice[]>(() => {
  // THROWS rather than repairs, and throws unconditionally rather than only in
  // a development build. There is no build-time environment flag reachable from
  // this package (its tsconfig carries `types: ["node"]` and not vite/client),
  // and an unconditional check is the stronger of the two anyway: a violated
  // precondition means the offsets and the string disagree, and rendering a
  // confidently WRONG highlight on a triage surface is worse than rendering
  // nothing at all.
  assertHighlightRanges(text, ranges);

  const out: Slice[] = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    out.push({
      key: `gap-${String(index)}`,
      text: text.slice(cursor, range.start),
      match: false,
    });
    out.push({
      key: `match-${String(index)}`,
      text: text.slice(range.start, range.end),
      match: true,
    });
    cursor = range.end;
  });
  out.push({ key: "tail", text: text.slice(cursor), match: false });
  return out;
});
</script>

<template>
  <span :class="CELL_TEXT_CLASS">
    <span
      v-for="slice in slices"
      :key="slice.key"
      :class="[CELL_TEXT_CLASS, slice.match ? HIGHLIGHT_CLASS : '']"
      >{{ slice.text }}</span
    >
  </span>
</template>
