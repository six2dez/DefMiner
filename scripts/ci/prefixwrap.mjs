// scripts/ci/prefixwrap.mjs — CSS containment, asserted on the BUILD OUTPUT.
//
//   node scripts/ci/prefixwrap.mjs [bundle.css]...
//
// Exits 0 when every rule in every given stylesheet is scoped under the
// prefixwrap root, 1 when any rule is not, and 2 when an input cannot be read,
// cannot be parsed, or contains no rules at all. With no arguments it checks the
// frontend plugin's built stylesheet.
//
// ---------------------------------------------------------------------------
// WHY THIS READS THE BUILT CSS AND NOT postcss.config.cjs
// ---------------------------------------------------------------------------
// The property under test is "no rule DefMiner ships can restyle Caido or
// another installed plugin" (threat T-05-02). The PostCSS config is evidence
// ABOUT that property; the emitted stylesheet IS that property. Those two come
// apart in at least three ordinary ways, none of which announces itself:
//
//   1. Plugin order. prefixwrap has to run LAST. Put it before tailwind and the
//      authored rules get scoped while every generated utility stays global —
//      a config that reads correctly and ships a stylesheet that is not.
//   2. A second stylesheet entering the build through a path the config's
//      `plugins` list never sees (an imported component's `<style>` block, a
//      dependency's CSS).
//   3. The config being right and the BUILD not running it at all — vite
//      resolves the PostCSS config from the plugin root, and a root that moves
//      silently disables the whole pipeline.
//
// Reading the config would pass in all three cases. This is the same reason
// scripts/ci/check-bundle-imports.mjs parses the shipped bundle rather than the
// tsup config.
//
// Parsing is a real PostCSS parse, not a regex. A regex over `{` boundaries
// misses nested at-rules, `@supports`, comma-separated selector lists split
// across lines, and selectors containing braces inside `[attr="{"]` — and a
// containment gate that misses a shape is a containment gate that reports a
// containment it did not check.

import { readFileSync } from "node:fs";

import postcss from "postcss";

/**
 * The containment root. Must equal the `postcss-prefixwrap` option in
 * packages/frontend/postcss.config.cjs and the mount element's id in
 * packages/frontend/src/index.ts — a three-way agreement that
 * packages/frontend/src/index.spec.ts pins from the other end.
 */
const ROOT_SELECTOR = "#plugin--defminer";

const DEFAULT_TARGET =
  "packages/dist/plugin_package/defminer-frontend/index.css";

const REMEDY =
  "remedy: postcss-prefixwrap must run LAST in packages/frontend/postcss.config.cjs, " +
  `wrapping every rule in ${ROOT_SELECTOR} — an unwrapped rule escapes the ` +
  "plugin and restyles the operator's tool";

/**
 * At-rules whose children are NOT selectors and must not be judged as such.
 *
 * A `@keyframes` block's "selectors" are `from`, `to` and percentages; a
 * `@font-face` has none. Judging those as unscoped selectors would make the
 * gate fail on correct output — and a gate that cries wolf gets switched off,
 * which is a worse outcome than the defect it was guarding.
 */
const NON_SELECTOR_AT_RULES = new Set([
  "keyframes",
  "-webkit-keyframes",
  "-moz-keyframes",
  "-o-keyframes",
  "font-face",
  "counter-style",
  "property",
  "page",
  "viewport",
]);

/** True when `node` sits inside an at-rule whose children are not selectors. */
function insideNonSelectorAtRule(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (
      p.type === "atrule" &&
      NON_SELECTOR_AT_RULES.has(p.name.toLowerCase())
    ) {
      return true;
    }
  }
  return false;
}

/**
 * True when one selector is scoped under the containment root.
 *
 * Accepts the root itself (`#plugin--defminer`), anything descending from or
 * compounded with it (`#plugin--defminer .foo`, `#plugin--defminer>*`,
 * `#plugin--defminer:hover`), and rejects everything else — including
 * `.foo #plugin--defminer`, where the root is present but is NOT the anchor and
 * the rule can still match outside the plugin.
 */
function isScoped(selector) {
  const trimmed = selector.trim();
  if (!trimmed.startsWith(ROOT_SELECTOR)) return false;
  const next = trimmed.charAt(ROOT_SELECTOR.length);
  // End of selector, or a combinator/pseudo/attribute boundary. A bare
  // identifier character would mean a DIFFERENT id that merely shares our
  // prefix (`#plugin--defminerX`), which is not our root.
  return next === "" || !/[A-Za-z0-9_-]/.test(next);
}

const inputs = process.argv.slice(2);
const targets = inputs.length > 0 ? inputs : [DEFAULT_TARGET];

let failed = 0;

for (const path of targets) {
  let src;
  try {
    src = readFileSync(path, "utf8");
  } catch (err) {
    // A gate that cannot find its target must NEVER report success. This is the
    // failure mode that turns a green pipeline into no pipeline at all: rename
    // the output directory and every containment check starts passing vacuously.
    console.error(`${path}: cannot read stylesheet: ${err.message}`);
    console.error(
      `${path}: build it first (\`pnpm build\`) — a gate that cannot find its ` +
        `target must never report success`,
    );
    process.exit(2);
  }

  let root;
  try {
    root = postcss.parse(src, { from: path });
  } catch (err) {
    console.error(`${path}: cannot parse as CSS: ${err.message}`);
    process.exit(2);
  }

  const offenders = [];
  let ruleCount = 0;

  root.walkRules((rule) => {
    if (insideNonSelectorAtRule(rule)) return;
    ruleCount++;
    for (const selector of rule.selectors) {
      if (!isScoped(selector)) offenders.push(selector.trim());
    }
  });

  if (ruleCount === 0) {
    // Zero rules is not "clean", it is "nothing was checked". An empty or
    // wrong-path stylesheet would otherwise be the easiest way to make this
    // gate green.
    console.error(
      `${path}: contains no CSS rules — nothing was checked, which is not the ` +
        `same as nothing being wrong (${REMEDY})`,
    );
    process.exit(2);
  }

  console.log(`${path}: ${ruleCount} rule(s) checked against ${ROOT_SELECTOR}`);

  if (offenders.length > 0) {
    const unique = [...new Set(offenders)];
    for (const selector of unique) {
      console.error(
        `${path}: selector is not scoped under ${ROOT_SELECTOR}: ${selector}`,
      );
    }
    console.error(
      `${path}: ${unique.length} unscoped selector(s) of ${ruleCount} rule(s) (${REMEDY})`,
    );
    failed++;
  }
}

process.exit(failed === 0 ? 0 : 1);
