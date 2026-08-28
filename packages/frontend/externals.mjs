// The rollup external set for the DefMiner frontend bundle, in ONE place.
//
// This file exists because of a key link that a copied literal cannot hold:
// `vite.config.ts` decides what stays external, and
// `scripts/ci/frontend-externals.mjs` is the only thing that notices when that
// decision silently stops holding. If the two carried their own copies of the
// list, an entry added to the build and forgotten in the gate would leave the
// gate green while the property it names is false — which is the failure mode
// the gate exists to prevent, reproduced inside the gate itself.
//
// Plain .mjs, not .ts, so the CI gate can `import` it without a TypeScript
// loader. Both consumers import THIS; neither restates it.

/**
 * Modules Caido's renderer already provides. Bundling any of them ships a
 * second copy into the host page — for `vue` that means a second reactivity
 * runtime inside Caido's own Vue app (threat T-05-03).
 */
export const EXTERNAL_NAMES = Object.freeze(["vue", "@caido/frontend-sdk"]);

/**
 * Scoped families provided by Caido. Matched by PREFIX because the member
 * modules (`@codemirror/view`, `@lezer/highlight`, …) are pulled in
 * transitively and enumerating them would go stale on the first SDK bump.
 */
export const EXTERNAL_PREFIXES = Object.freeze(["@codemirror/", "@lezer/"]);

/**
 * `vue` and nothing else.
 *
 * WHY THIS SET IS SMALLER THAN THE ONE ABOVE, and why that is not a weakening.
 * "Absent from the built import set" means one of two things: the module was
 * inlined, or it was never imported. Those are opposite verdicts and the import
 * set alone cannot tell them apart. `vue` is the case where it can: every Vue
 * application imports `createApp` unconditionally, so if `vue` is missing from
 * the bundle's imports the only remaining explanation is that it was inlined.
 * `@caido/frontend-sdk` is a types-only package here (the SDK arrives as an
 * `init()` argument, never as a runtime import) and no CodeMirror or Lezer
 * module is referenced yet — requiring those to be PRESENT would fail every
 * build for a defect that has not occurred.
 *
 * The rest of the set is still enforced, by the complementary rule the gate
 * applies: every bare specifier the bundle DOES import must be declared here.
 */
export const REQUIRED_IMPORTS = Object.freeze(["vue"]);

/**
 * True when `specifier` is declared external by name or by scoped prefix.
 *
 * JSDoc-annotated because this file is `.mjs` under `allowJs` — without the
 * annotation `specifier` is an implicit `any` and the repo's typed lint rules
 * (correctly) refuse to reason about it.
 *
 * @param {string} specifier
 * @returns {boolean}
 */
export function isExternal(specifier) {
  return (
    EXTERNAL_NAMES.includes(specifier) ||
    EXTERNAL_PREFIXES.some((prefix) => specifier.startsWith(prefix))
  );
}

/** The rollup `external` value: exact names plus a regexp per scoped family. */
export const ROLLUP_EXTERNAL = Object.freeze([
  ...EXTERNAL_NAMES,
  ...EXTERNAL_PREFIXES.map(
    (prefix) => new RegExp(`^${prefix.replace("/", "\\/")}`),
  ),
]);
