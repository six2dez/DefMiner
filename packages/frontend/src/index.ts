// packages/frontend/src/index.ts — DefMiner's frontend entry point.
//
// Caido calls `init(sdk)` once, with the frontend SDK as its only argument.
// Everything this plugin puts on screen is reachable from the four calls below.

import { Classic } from "@caido/primevue";
import type { Caido } from "@caido/sdk-frontend";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import { createApp } from "vue";

import App from "./App.vue";
import "./styles/index.css";

/**
 * The id of the element the Vue app mounts on, and the CSS containment root.
 *
 * THIS VALUE AND THE `postcss-prefixwrap` SELECTOR IN postcss.config.cjs ARE
 * ONE FACT WRITTEN IN TWO PLACES. Every rule in the built stylesheet is scoped
 * under `#plugin--defminer`; if this id ever stops matching that selector,
 * nothing throws and nothing warns — the page mounts, renders its markup, and
 * comes out completely unstyled, because every rule is scoped to an element
 * that does not exist.
 *
 * `src/index.spec.ts` closes that gap by READING the selector out of
 * postcss.config.cjs and asserting the mounted element's id equals it with the
 * leading `#` removed. It does not restate the literal.
 */
export const MOUNT_ELEMENT_ID = "plugin--defminer";

/** The path the sidebar item navigates to, and the page registered at it. */
export const PAGE_PATH = "/defminer";

/** The sidebar label. DefMiner-authored; no target-controlled string reaches it. */
export const SIDEBAR_LABEL = "DefMiner";

/**
 * Mount the workspace page and register it with Caido.
 *
 * `addPage` TAKES AN `HTMLElement`, NOT A COMPONENT
 * [verified against @caido/sdk-frontend .../sdks/navigation.d.ts:
 * `addPage: (path, options: { body: HTMLElement; topbar?; onEnter? }) => void`].
 * Passing a component object here is the mistake this signature invites and it
 * fails at runtime inside Caido rather than at build time, which is why
 * `index.spec.ts` asserts `body instanceof HTMLElement` instead of trusting it.
 *
 * The element is created and mounted BEFORE `addPage`, so the page Caido
 * registers is already a live Vue app rather than an empty div that fills in
 * later. `registerItem` is called exactly once for this path: two navigation
 * entries resolving to the same path collide rather than merge.
 *
 * `icon` is deliberately omitted from `registerItem`'s options. 05-UI-SPEC.md
 * fixes the icon library at "none" — adding an icon package is a stack change,
 * and Caido renders a text-labelled item perfectly well without one.
 */
export function init(sdk: Caido): void {
  const body = document.createElement("div");
  body.id = MOUNT_ELEMENT_ID;

  createApp(App)
    .use(createPinia())
    // `unstyled: true` + the vendored `Classic` pass-through object is the whole
    // Caido theme. The `pt` keys are coupled to PrimeVue's internal slot names,
    // which is why primevue is pinned to EXACTLY 4.1.0 in pnpm-workspace.yaml:
    // PrimeVue 5 renames those slots and breaks the theme silently.
    .use(PrimeVue, { unstyled: true, pt: Classic })
    // Injected rather than imported. The SDK is a per-instance object Caido
    // hands to `init` — a module-level singleton would be a second source of
    // truth for it and would make every component untestable without a real
    // Caido.
    .provide("sdk", sdk)
    .mount(body);

  sdk.navigation.addPage(PAGE_PATH, { body });
  sdk.sidebar.registerItem(SIDEBAR_LABEL, PAGE_PATH);
}
