<script setup lang="ts">
// packages/frontend/src/components/HelpPanel.vue — the Help tab.
//
// ===========================================================================
// THE SIMPLEST COMPONENT IN THE PLUGIN, ON PURPOSE
// ===========================================================================
// It takes NO PROPS, makes NO RPC CALL and holds NO STATE. Every string it
// renders is a frozen constant in `help-contract.ts`, reached through `{{ }}`,
// which Vue escapes. There is therefore no path by which a target-controlled
// string — a URL, a source label, an error message — can reach this surface,
// and no way for it to fail: a Help tab that could show an error state would be
// a Help tab that cannot help when the backend is the thing that is broken.
//
// That last property is the point. The operator most likely to open Help is the
// one staring at four tabs of "the backend did not answer", and this tab
// renders identically whether the backend is healthy, busy or gone.
//
// NO COMMENT AT THE TOP OF THE `<template>`: a comment there is a node, which
// makes the component a fragment and leaves every root-class assertion reading
// `[]` (the trap safety/HighlightSlices.vue records).

import {
  HELP_FOOTER,
  HELP_HEADING,
  HELP_PURPOSE,
  HELP_SECTIONS,
} from "./help-contract";
</script>

<template>
  <div class="flex flex-col gap-6 overflow-y-auto" data-defminer-help>
    <div class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold leading-snug">{{ HELP_HEADING }}</h2>
      <p class="text-surface-400">{{ HELP_PURPOSE }}</p>
    </div>

    <section
      v-for="section in HELP_SECTIONS"
      :key="section.id"
      class="flex flex-col gap-2"
      data-defminer-help-section
    >
      <h3 class="text-sm font-semibold">{{ section.heading }}</h3>
      <p
        v-for="(paragraph, index) in section.paragraphs"
        :key="index"
        class="text-surface-400"
      >
        {{ paragraph }}
      </p>
    </section>

    <p class="text-surface-400" data-defminer-help-footer>{{ HELP_FOOTER }}</p>
  </div>
</template>
