// packages/frontend/src/frontend-safety.spec.ts — rendering safety R1 and R2's
// STATIC half, over TypeScript *and* single-file components.
//
// ===========================================================================
// WHY THIS EXISTS WHEN eslint.config.js ALREADY CARRIES THE SAME FIVE RULES
// ===========================================================================
// A lint rule is a rule about source text that a person editing that text can
// switch off. Plan 05-01 proved that is not a theoretical objection: with
// `vue/no-v-html` at severity 2 AND `linterOptions.noInlineConfig` true, a
// component carrying `v-html` plus `<!-- eslint-disable-next-line
// vue/no-v-html -->` linted CLEAN. `noInlineConfig` governs ESLint's own inline
// mechanism; a `<template>` is parsed by vue-eslint-parser and its HTML
// comments are honoured by eslint-plugin-vue's own `vue/comment-directive`
// rule, which `noInlineConfig` does not reach. The ban was one comment away
// from decorative in exactly the file type it protects. 05-01 closed that by
// turning `vue/comment-directive` off — and the lint block itself is still one
// edit away from deletion.
//
// This file is the control that cannot be commented away. It reads the source
// and reports, and there is no directive, pragma or disable comment it honours,
// because it never looks at comments as anything but text to be discarded.
// Same argument `packages/backend/src/store/sql-discipline.spec.ts` opens with,
// and this file copies that gate's four structural elements deliberately:
// a recursive package walk, a pure exported `auditSource`, a set of rules whose
// FAILING PATH IS EXECUTED both ways, and a block of non-vacuity assertions so
// a gate that scanned nothing cannot pass by measuring an empty set.
//
// ===========================================================================
// HOW A `<template>` BLOCK IS REACHED — the part a TypeScript-only walk misses
// ===========================================================================
// The escape 05-01 measured lives in a `.vue` TEMPLATE, so a gate that walked
// only `.ts` over a Vue package would measure the wrong set and pass. A
// single-file component is not a TypeScript program, so it is split by text
// into its blocks first:
//
//   `<template>` — depth-counted to its matching close (App.vue nests a
//       `<template v-if>` inside the root one, so a first-`</template>` scan
//       would cut the block short and stop auditing everything after it).
//       HTML comments are then DISCARDED, which is both why a `<!-- eslint-
//       disable -->` is inert here and why the prose in App.vue's own comments
//       — which mentions `v-html` by name — is not a finding.
//       Attributes are read as name/value pairs, and the value of every BOUND
//       attribute plus the body of every `{{ }}` interpolation is collected as
//       a template EXPRESSION. The expression rules run over those, not over
//       the raw template text: markup is what a template is made of, so
//       scanning raw template text for `<tag>` would report the component's own
//       markup as a violation.
//
//   `<script>` — every block, handed to the TypeScript compiler's parser and
//       audited as an AST. `packages/engine/src/boundary.spec.ts` records the
//       parser choice and it holds here for the same reason: these sources are
//       TypeScript, and acorn (which `scripts/ci/check-bundle-imports.mjs` uses
//       over the emitted BUNDLE, where the types are gone) rejects type
//       annotations outright.
//
// A regex over lines was not an option for the script half for the reason
// sql-discipline.spec.ts already gives: it misses multi-line strings, calls
// whose receiver spans a line break, and `export … from` — the three shapes
// real code is most likely to use.
//
// ===========================================================================
// NO ALLOWLIST, NO EXEMPTION
// ===========================================================================
// There is none, on purpose. If a legitimate need for one ever appears, the
// honest sequence is the one sql-discipline.spec.ts demonstrates: the exemption
// is scoped to a FILE and a SHAPE, and a test proves the same code in another
// module is not exempt. Nothing in Phase 5 needs one.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const FRONTEND_SRC = "packages/frontend/src";

// ---------------------------------------------------------------------------
// THE WALK
// ---------------------------------------------------------------------------

/**
 * Every auditable file under the frontend package, at any depth, plus the
 * directories the walk actually descended into.
 *
 * `dirs` is returned rather than inferred from `files` because DESCENT and
 * COVERAGE are two different claims. A walk can descend into a directory that
 * holds no auditable file (today `src/styles/` holds only CSS), and the
 * non-vacuity block asserts descent directly rather than waiting for a future
 * plan to drop a `.ts` somewhere and make the assertion accidentally true.
 *
 * `.vue` is in the set for the reason the header gives: the defect this gate
 * exists to close was measured in a template.
 *
 * DIRECTORIES NAMED `__*` ARE SKIPPED, and this is load-bearing rather than
 * tidy. `scripts/ci/lint-r1.spec.ts` writes DELIBERATE R1 violations into
 * `packages/frontend/src/__r1_fixtures__/` for the life of one test — a
 * component carrying `v-html`, another carrying `eval` — and vitest runs spec
 * files concurrently. Without this skip, this gate would intermittently report
 * another spec's fixtures as real violations, which is a flake that looks
 * exactly like a genuine finding. That directory is gitignored, excluded from
 * packages/frontend/tsconfig.json and listed in eslint.config.js's `ignores`
 * for the same reason; this is the fourth place the same fact has to be
 * written, and it is written here where the walk is.
 */
function frontendTree(): { files: string[]; dirs: string[] } {
  const files: string[] = [];
  const dirs: string[] = [];
  const walk = (dir: string): void => {
    dirs.push(dir);
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith("__")) continue;
        walk(full);
      } else if (
        (entry.name.endsWith(".ts") && !entry.name.endsWith(".spec.ts")) ||
        entry.name.endsWith(".vue")
      ) {
        files.push(full);
      }
    }
  };
  walk(FRONTEND_SRC);
  return { files: files.sort(), dirs: dirs.sort() };
}

// ---------------------------------------------------------------------------
// THE RULES, NAMED
// ---------------------------------------------------------------------------

/**
 * EVERY rule name this gate can emit.
 *
 * A closed list used as the type of `add`'s first argument, so a rule cannot be
 * introduced without appearing here — which is what lets the block below assert
 * the gate's REACH as a set rather than as a number somebody remembered to
 * bump, and makes DELETING a rule a visible edit rather than a quietly narrower
 * gate.
 */
const RULE_NAMES = [
  "raw-html-directive",
  "dom-html-sink",
  "dynamic-code-construction",
  "unsafe-attribute-binding",
  "title-attribute",
  "markup-string-construction",
] as const;

type RuleName = (typeof RULE_NAMES)[number];

type Violation = { file: string; rule: RuleName; detail: string };

type Add = (rule: RuleName, detail: string) => void;

/** Attributes R2 forbids target-controlled content in, by name. */
const GUARDED_ATTRIBUTES = new Set(["style", "href", "src"]);
/** R2's other absolute: nothing target-controlled in a data attribute. */
const DATA_ATTRIBUTE_PREFIX = "data-";

/**
 * An angle-bracket-delimited tag inside a string.
 *
 * `<b>` and `</b>` match; a bare `<` or a `a < b` comparison does not. R1's
 * highlighting rule is about BUILDING MARKUP, and a comparison operator is not
 * markup.
 */
const TAG_IN_STRING = /<\/?[A-Za-z][^<>]*>/;

// ---------------------------------------------------------------------------
// SINGLE-FILE COMPONENT DECOMPOSITION
// ---------------------------------------------------------------------------

/**
 * The root `<template>` block's body, depth-counted.
 *
 * App.vue nests `<template v-if="activeTab === 'artifacts'">` inside the root
 * block, so the naive "slice to the first `</template>`" would end the block at
 * the inner close and leave the whole artifacts table unaudited — a silent
 * coverage loss in the largest template in the package.
 *
 * The open-tag pattern is `[^>]*`, which is wrong for an attribute value
 * containing a literal `>`. Stated rather than hidden: no such attribute exists
 * in this package, and the alternative is a full HTML parser for a job that has
 * one shape.
 */
function extractTemplate(source: string): string {
  const first = /<template\b[^>]*>/i.exec(source);
  if (first === null) return "";
  const bodyStart = first.index + first[0].length;
  const tag = /<template\b[^>]*>|<\/template\s*>/gi;
  tag.lastIndex = bodyStart;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(source)) !== null) {
    if (m[0].startsWith("</")) {
      depth--;
      if (depth === 0) return source.slice(bodyStart, m.index);
    } else if (!m[0].endsWith("/>")) {
      depth++;
    }
  }
  return source.slice(bodyStart);
}

/** Every `<script>` block's body. A component may carry two (`setup` and a
 *  plain one), and auditing only the first would leave the other ungated. */
function extractScripts(source: string): string[] {
  const out: string[] = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) out.push(m[1] ?? "");
  return out;
}

/** HTML comments, removed. They render as nothing, so they are not a sink — and
 *  removing them is what makes an `<!-- eslint-disable -->` inert here. */
function stripHtmlComments(template: string): string {
  return template.replace(/<!--[\s\S]*?-->/g, "");
}

type Attribute = { name: string; value: string };

/**
 * Every `name="value"` / `name='value'` pair in a template.
 *
 * The value class is `[^"]`/`[^']`, which spans newlines on purpose: App.vue
 * writes a four-line ternary into `:class`, and a line-anchored pattern would
 * read half of it.
 */
function templateAttributes(template: string): Attribute[] {
  const out: Attribute[] = [];
  const re =
    /(?:^|\s)([@:.]?[A-Za-z_][-A-Za-z0-9_:.[\]]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    out.push({ name: m[1] ?? "", value: m[2] ?? m[3] ?? "" });
  }
  return out;
}

/** True when the attribute is BOUND (its value is a JS expression) rather than
 *  a static string. `:x`, `v-bind:x`, `.x` (the prop shorthand), `@x` and any
 *  `v-*` directive all take expressions. */
function isBoundAttribute(name: string): boolean {
  return (
    name.startsWith(":") ||
    name.startsWith("@") ||
    name.startsWith(".") ||
    name.startsWith("v-")
  );
}

/** The attribute a binding actually sets — `:style` and `v-bind:style` and
 *  `.style` are all the `style` attribute. */
function bareAttributeName(name: string): string {
  return name
    .replace(/^v-bind:/, "")
    .replace(/^[@:.]/, "")
    .split(".")[0]
    .toLowerCase();
}

/**
 * Every JS expression a template contains: the value of each bound attribute,
 * and the body of each `{{ }}` interpolation.
 *
 * The expression rules run over THESE and never over raw template text. Markup
 * is what a template is made of, so scanning the raw text for `<tag>` would
 * report a component's own markup as `markup-string-construction`.
 */
function templateExpressions(template: string): string[] {
  const out: string[] = [];
  for (const attribute of templateAttributes(template)) {
    if (isBoundAttribute(attribute.name)) out.push(attribute.value);
  }
  const mustache = /\{\{([\s\S]*?)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = mustache.exec(template)) !== null) out.push(m[1] ?? "");
  return out;
}

/**
 * A bound expression that is a plain literal and therefore cannot carry a
 * target-controlled byte.
 *
 * Conservative by design: anything this does not recognise is treated as
 * non-literal and reported. A false positive costs a comment; a false negative
 * costs an unaudited attribute.
 */
function isLiteralExpression(expression: string): boolean {
  return /^\s*(?:'[^']*'|"[^"]*"|`[^`${}]*`|-?\d+(?:\.\d+)?|true|false|null)\s*$/.test(
    expression,
  );
}

// ---------------------------------------------------------------------------
// TEMPLATE RULES
// ---------------------------------------------------------------------------

/**
 * The raw-HTML directive, in every spelling.
 *
 * `v-html` is the obvious one. The DOM-property bindings (`:innerHTML`,
 * `.innerHTML`) reach the same sink through a different spelling. The DYNAMIC
 * ARGUMENT forms — `:[name]="value"` and `v-bind="object"` — are reported
 * because the attribute they set is not decidable until runtime, and one of the
 * attributes they could set is `innerHTML`. R2 states its prohibitions as
 * absolutes for the same reason: a static taint decision cannot be made here,
 * and getting it wrong once puts markup in the DOM.
 */
const RAW_HTML_PATTERNS: { re: RegExp; what: string }[] = [
  { re: /(?:^|[\s"'])v-html\b/i, what: "the v-html directive" },
  {
    re: /(?:^|\s)(?::|v-bind:|\.)(?:innerHTML|outerHTML)\b/i,
    what: "a binding to an HTML-writing DOM property (innerHTML/outerHTML)",
  },
  {
    re: /(?:^|\s)(?:v-bind)?:\[/,
    what: "a v-bind with a DYNAMIC ARGUMENT, whose target attribute is not decidable statically",
  },
  {
    re: /(?:^|\s)v-bind\s*=/,
    what: "an object-spread v-bind, whose target attributes are not decidable statically",
  },
];

/** The four DOM HTML-writing sinks R1 names, as expression-level patterns. */
const DOM_SINK_PATTERNS: { re: RegExp; sink: string }[] = [
  { re: /\binnerHTML\b/, sink: "innerHTML" },
  { re: /\bouterHTML\b/, sink: "outerHTML" },
  { re: /\binsertAdjacentHTML\b/, sink: "insertAdjacentHTML" },
  { re: /\bdocument\s*\.\s*write(?:ln)?\s*\(/, sink: "document.write" },
];

/** Dynamic code construction, as expression-level patterns. Research P-02
 *  measured that NOTHING currently installed covered the first two forms before
 *  plan 05-01 added the lint half. */
const DYNAMIC_CODE_PATTERNS: { re: RegExp; form: string }[] = [
  { re: /\beval\s*\(/, form: "eval(...)" },
  { re: /\bnew\s+Function\b/, form: "new Function(...)" },
  { re: /(?<![.\w$])Function\s*\(/, form: "Function(...) called without new" },
  {
    re: /\bset(?:Timeout|Interval)\s*\(\s*["'`]/,
    form: "setTimeout/setInterval given a STRING first argument — the indirect eval",
  },
];

/**
 * R1's highlighting rule, expressed statically: a string literal carrying a tag
 * that is COMBINED with something that is not a literal.
 *
 * Building a `<mark>` element by concatenation and rendering it is precisely
 * the defect the slicing rule exists to prevent, so the gate makes that shape
 * unrepresentable rather than merely discouraged. Slicing at offsets into three
 * plain strings — what `safety/HighlightSlices.vue` does — never produces a
 * string containing a tag, so it is not reachable by this rule.
 */
function markupConcatenation(expression: string): string | undefined {
  if (/(['"])[^'"\n]*<\/?[A-Za-z][^'"\n]*\1\s*\+/.test(expression)) {
    return "a string literal containing a tag is concatenated with the value to its right";
  }
  if (/\+\s*(['"])[^'"\n]*<\/?[A-Za-z][^'"\n]*\1/.test(expression)) {
    return "a string literal containing a tag is concatenated with the value to its left";
  }
  const templates = /`[^`]*`/g;
  let m: RegExpExecArray | null;
  while ((m = templates.exec(expression)) !== null) {
    if (TAG_IN_STRING.test(m[0]) && m[0].includes("${")) {
      return "a template literal containing a tag carries an interpolation";
    }
  }
  return undefined;
}

function auditTemplate(where: string, template: string, add: Add): void {
  for (const pattern of RAW_HTML_PATTERNS) {
    if (pattern.re.test(template)) {
      add(
        "raw-html-directive",
        `${where}: the template contains ${pattern.what}. R1 bans raw HTML in the DefMiner frontend absolutely — a target-controlled string is rendered as TEXT, always. Interpolate it ({{ value }}) or render it through safety/display.ts.`,
      );
    }
  }

  for (const attribute of templateAttributes(template)) {
    const bare = bareAttributeName(attribute.name);

    if (bare === "title") {
      add(
        "title-attribute",
        `${where}: a \`title\` attribute (${attribute.name}). R2 forbids target-controlled content in a tooltip ABSOLUTELY, and the gate enforces the absolute rather than attempting a static taint decision — that decision cannot be made from source, and getting it wrong once leaks a secret into a hover that is unbounded, unscrollable and escapes its container. Detail belongs in the evidence panel.`,
      );
    }

    const guarded =
      GUARDED_ATTRIBUTES.has(bare) || bare.startsWith(DATA_ATTRIBUTE_PREFIX);
    if (
      guarded &&
      isBoundAttribute(attribute.name) &&
      !isLiteralExpression(attribute.value)
    ) {
      add(
        "unsafe-attribute-binding",
        `${where}: \`${attribute.name}\` is bound to the non-literal expression \`${attribute.value.trim()}\`. An attribute escapes every text-node protection R2 buys, and a \`href\`/\`src\` built from an extracted URL offers it as a DESTINATION — an extracted URL is data to be displayed, never somewhere to send the operator (R1). Route the detail to the evidence panel; if a copy affordance is wanted it writes to the clipboard, not to the DOM.`,
      );
    }
  }

  for (const expression of templateExpressions(template)) {
    auditExpressionText(`${where} (template expression)`, expression, add);
  }
}

/** The expression-level rules, shared by template expressions. Script blocks
 *  get the AST form of the same rules instead, which is strictly more precise;
 *  a template expression is not a program and cannot be parsed as one (`v-for`
 *  alone is not a JS expression), so it is matched textually. */
function auditExpressionText(where: string, text: string, add: Add): void {
  for (const pattern of DOM_SINK_PATTERNS) {
    if (pattern.re.test(text)) {
      add(
        "dom-html-sink",
        `${where}: reaches the HTML-writing sink \`${pattern.sink}\`. R1 bans all four (innerHTML, outerHTML, insertAdjacentHTML, document.write). Assign to textContent, or render through safety/display.ts.`,
      );
    }
  }
  for (const pattern of DYNAMIC_CODE_PATTERNS) {
    if (pattern.re.test(text)) {
      add(
        "dynamic-code-construction",
        `${where}: constructs code dynamically via ${pattern.form}. R1 names eval and new Function by name, and 05-RESEARCH § "Common Pitfalls" P-02 measured that NOTHING in the shipped lint preset covered either form before plan 05-01 added them.`,
      );
    }
  }
  const markup = markupConcatenation(text);
  if (markup !== undefined) {
    add(
      "markup-string-construction",
      `${where}: ${markup}. R1 requires match highlighting be done by SLICING at offsets into plain strings rendered into sibling elements — building a <mark> string by concatenation and rendering it is precisely the defect that rule exists to prevent. Use safety/HighlightSlices.vue.`,
    );
  }
}

// ---------------------------------------------------------------------------
// SCRIPT RULES — the AST half
// ---------------------------------------------------------------------------

function isLiteralNode(node: ts.Node): boolean {
  return (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isNumericLiteral(node) ||
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword
  );
}

function stringLiteralText(node: ts.Node): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return undefined;
}

/** The property a member expression writes, whether it is written as `.name` or
 *  as `["name"]`. The bracket form is the obvious way around a rule that only
 *  looks at property access, so it is covered by the same branch. */
function writtenMemberName(node: ts.Expression): string | undefined {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node)) {
    return stringLiteralText(node.argumentExpression);
  }
  return undefined;
}

/** The name a call invokes, whether bare or through a receiver. */
function calleeName(node: ts.CallExpression): string | undefined {
  if (ts.isIdentifier(node.expression)) return node.expression.text;
  return writtenMemberName(node.expression);
}

function auditScript(where: string, source: string, add: Add): void {
  const sf = ts.createSourceFile(
    where,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const visit = (node: ts.Node): void => {
    // --- assignments into a sink -------------------------------------------
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      const member = writtenMemberName(node.left);
      if (member === "innerHTML" || member === "outerHTML") {
        add(
          "dom-html-sink",
          `${where}: assignment to \`.${member}\`. R1 bans all four HTML-writing sinks (innerHTML, outerHTML, insertAdjacentHTML, document.write) — stored markup executing inside Caido's renderer is threat T-05-20. Assign to \`textContent\`.`,
        );
      }
      if (member === "title") {
        add(
          "title-attribute",
          `${where}: assignment to \`.title\`. R2 forbids target-controlled content in a tooltip absolutely, and the gate enforces the absolute because the taint decision cannot be made statically (threat T-05-22).`,
        );
      }
      if (member === "cssText") {
        add(
          "unsafe-attribute-binding",
          `${where}: assignment to \`.style.cssText\` is the script-side spelling of a \`:style\` binding, and an attribute escapes every text-node protection R2 buys.`,
        );
      }
    }

    // --- calls --------------------------------------------------------------
    if (ts.isCallExpression(node)) {
      const name = calleeName(node);

      if (name === "insertAdjacentHTML") {
        add(
          "dom-html-sink",
          `${where}: a call to \`insertAdjacentHTML\`. One of R1's four banned HTML-writing sinks.`,
        );
      }

      if (
        (name === "write" || name === "writeln") &&
        ts.isPropertyAccessExpression(node.expression) &&
        /(?:^|\.)document$/.test(node.expression.expression.getText(sf))
      ) {
        add(
          "dom-html-sink",
          `${where}: a call to \`document.${name}\`. One of R1's four banned HTML-writing sinks.`,
        );
      }

      if (name === "Function") {
        add(
          "dynamic-code-construction",
          `${where}: \`Function(...)\` called without \`new\` builds a function from a string exactly as \`new Function\` does. R1 names it; 05-RESEARCH P-02 measured that nothing in the shipped preset covered it.`,
        );
      }

      if (
        (name === "setTimeout" || name === "setInterval") &&
        node.arguments.length > 0 &&
        (ts.isStringLiteral(node.arguments[0]) ||
          ts.isNoSubstitutionTemplateLiteral(node.arguments[0]) ||
          ts.isTemplateExpression(node.arguments[0]))
      ) {
        add(
          "dynamic-code-construction",
          `${where}: \`${name}\` given a STRING first argument is an indirect eval — the string is compiled and run. Pass a function.`,
        );
      }

      if (name === "setAttribute" && node.arguments.length >= 2) {
        const attributeName = stringLiteralText(node.arguments[0]);
        const value = node.arguments[1];
        if (attributeName === undefined) {
          add(
            "unsafe-attribute-binding",
            `${where}: \`setAttribute\` with a NON-LITERAL attribute name. Which attribute is written is not decidable statically, and one of the attributes it could write is \`style\`, \`href\`, \`src\` or \`title\`.`,
          );
        } else if (
          attributeName.toLowerCase() === "title" &&
          !isLiteralNode(value)
        ) {
          add(
            "title-attribute",
            `${where}: \`setAttribute("title", …)\`. R2 forbids target-controlled content in a tooltip absolutely.`,
          );
        } else if (
          (GUARDED_ATTRIBUTES.has(attributeName.toLowerCase()) ||
            attributeName.toLowerCase().startsWith(DATA_ATTRIBUTE_PREFIX)) &&
          !isLiteralNode(value)
        ) {
          add(
            "unsafe-attribute-binding",
            `${where}: \`setAttribute("${attributeName}", …)\` with a non-literal value. An attribute escapes every text-node protection R2 buys, and an extracted URL in \`href\`/\`src\` is offered as a destination rather than displayed as data (R1, threat T-05-25).`,
          );
        }
      }
    }

    // --- `new Function` -----------------------------------------------------
    if (
      ts.isNewExpression(node) &&
      /(?:^|\.)Function$/.test(node.expression.getText(sf))
    ) {
      add(
        "dynamic-code-construction",
        `${where}: \`new Function(...)\` builds a function from a string. R1 names it explicitly (threat T-05-21).`,
      );
    }

    // --- `eval`, by ANY receiver or alias ------------------------------------
    //
    // Every occurrence of the identifier, not only a call. `const run = eval;`
    // followed by `run(payload)` is the alias form, and a rule that only looked
    // at call sites would miss it — while `eval` is never a legitimate
    // identifier anywhere in this package, so there is no false positive to
    // trade against. The bracket spelling `globalThis["eval"]` is covered too.
    if (ts.isIdentifier(node) && node.text === "eval") {
      add(
        "dynamic-code-construction",
        `${where}: the identifier \`eval\` appears. R1 bans it outright, by any receiver and under any alias (threat T-05-21).`,
      );
    }
    if (
      ts.isElementAccessExpression(node) &&
      stringLiteralText(node.argumentExpression) === "eval"
    ) {
      add(
        "dynamic-code-construction",
        `${where}: \`eval\` reached through a bracket access. Spelling it differently does not make it a different sink.`,
      );
    }

    // --- markup built by concatenation ---------------------------------------
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      const left = stringLiteralText(node.left);
      const right = stringLiteralText(node.right);
      const leftIsMarkup = left !== undefined && TAG_IN_STRING.test(left);
      const rightIsMarkup = right !== undefined && TAG_IN_STRING.test(right);
      if (
        (leftIsMarkup && !isLiteralNode(node.right)) ||
        (rightIsMarkup && !isLiteralNode(node.left))
      ) {
        add(
          "markup-string-construction",
          `${where}: a string literal containing a tag is concatenated with a non-literal. R1 requires match highlighting be done by SLICING at offsets into plain strings rendered into sibling elements; building a <mark> string by concatenation and rendering it is precisely the defect that rule exists to prevent. Use safety/HighlightSlices.vue.`,
        );
      }
    }
    if (ts.isTemplateExpression(node)) {
      const staticText =
        node.head.text +
        node.templateSpans.map((span) => span.literal.text).join("");
      if (TAG_IN_STRING.test(staticText)) {
        add(
          "markup-string-construction",
          `${where}: a template literal containing a tag carries an interpolation, which is markup built by concatenation wearing a different syntax. Slice at offsets instead — safety/HighlightSlices.vue.`,
        );
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);
}

// ---------------------------------------------------------------------------
// THE GATE
// ---------------------------------------------------------------------------

/**
 * Audit one frontend source file. PURE — takes text, returns findings — so the
 * failing path of every rule can be executed against a synthetic fixture below.
 * A gate whose failure path has never run is a gate nobody has tested.
 *
 * `templateText` comes back so the non-vacuity block can prove the gate found
 * TEMPLATES to audit and not merely files.
 */
export function auditSource(
  file: string,
  source: string,
): { violations: Violation[]; templateText: string } {
  const base = file.split("/").pop() ?? file;
  const violations: Violation[] = [];
  const add: Add = (rule, detail) => {
    violations.push({ file: base, rule, detail });
  };

  if (!file.endsWith(".vue")) {
    auditScript(base, source, add);
    return { violations, templateText: "" };
  }

  const templateText = extractTemplate(source);
  auditTemplate(`${base} <template>`, stripHtmlComments(templateText), add);
  extractScripts(source).forEach((script, index) => {
    auditScript(`${base} <script #${index + 1}>`, script, add);
  });
  return { violations, templateText };
}

// ---------------------------------------------------------------------------
// NON-VACUITY — four assertions, because a gate that scanned nothing passes
// ---------------------------------------------------------------------------

/**
 * The modules this gate must have audited.
 *
 * A RENAME is then a visible change rather than a silently shrunk gate — the
 * same reason sql-discipline.spec.ts names its fourteen. Seeded by plan 05-05
 * with the three modules that exist at the moment the gate lands; `display.ts`
 * and `HighlightSlices.vue` join it in the same commit that creates them, which
 * is the only order in which both commits are green.
 */
const AUDITED_MODULES = ["index.ts", "backend.ts", "App.vue"];

describe("rendering safety R1/R2 over packages/frontend/src (UISEC-01, UISEC-03)", () => {
  const { files, dirs } = frontendTree();

  it("enumerates a NON-EMPTY set of frontend modules, by name", () => {
    expect(
      files.length,
      `no .ts or .vue modules found under ${FRONTEND_SRC} — the gate would pass by measuring nothing`,
    ).toBeGreaterThan(0);

    const names = files.map((f) => f.split("/").pop());
    for (const expected of AUDITED_MODULES) {
      expect(names, `${expected} is not being audited`).toContain(expected);
    }
    expect(
      files.length,
      "fewer files than the named-module list requires",
    ).toBeGreaterThanOrEqual(AUDITED_MODULES.length);
  });

  it("DESCENDED into subdirectories — the reason the walk is recursive", () => {
    // Descent is asserted over the directories the walk ENTERED, not over the
    // files it yielded. A subdirectory holding no auditable file (src/styles/
    // holds only CSS today) still proves the recursion runs, and this assertion
    // does not quietly become true later when some future plan happens to drop
    // a .ts somewhere.
    expect(
      dirs.filter((d) => d !== FRONTEND_SRC),
      "the walk never left packages/frontend/src, so anything in a subdirectory is ungated",
    ).not.toEqual([]);
  });

  it("audited real `<template>` BLOCKS — not only TypeScript", () => {
    // THE assertion this gate exists for. The escape plan 05-01 measured lives
    // in a .vue template; a gate that walked only .ts over a Vue package would
    // report zero violations while auditing none of the file type at risk.
    const withTemplates = files.filter(
      (f) =>
        f.endsWith(".vue") &&
        auditSource(f, readFileSync(f, "utf8")).templateText.trim() !== "",
    );
    expect(
      withTemplates.length,
      "no .vue file contributed a non-empty template block — the template rules audited nothing",
    ).toBeGreaterThan(0);
  });

  it("emits exactly the rules it claims to — the gate's REACH, named", () => {
    expect([...RULE_NAMES]).toEqual([
      "raw-html-directive",
      "dom-html-sink",
      "dynamic-code-construction",
      "unsafe-attribute-binding",
      "title-attribute",
      "markup-string-construction",
    ]);
    expect(new Set(RULE_NAMES).size, "a duplicate rule name").toBe(
      RULE_NAMES.length,
    );
  });

  it.each(files)("%s obeys every R1 and R2 rule", (file) => {
    const { violations } = auditSource(file, readFileSync(file, "utf8"));
    expect(
      violations.map((v) => `${v.rule}: ${v.detail}`),
      `${file} violates rendering safety`,
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// EVERY RULE'S FAILING PATH, EXECUTED — BOTH WAYS.
//
// Paired positive and negative per rule. Without the negative half a rule could
// be a constant `true` and the whole-package assertion above would be the only
// thing standing between this file and a gate that reports everything.
// ---------------------------------------------------------------------------

const rulesOf = (source: string, file = "fixture.ts"): RuleName[] =>
  auditSource(file, source).violations.map((v) => v.rule);

const vue = (template: string, script = ""): string =>
  `<script setup lang="ts">\n${script}\n</script>\n\n<template>\n${template}\n</template>\n`;

const rulesOfVue = (template: string, script = ""): RuleName[] =>
  rulesOf(vue(template, script), "Fixture.vue");

describe("the gate's own failure paths", () => {
  it("raw-html-directive: reports v-html, and NOT a text interpolation", () => {
    expect(rulesOfVue(`  <div v-html="value"></div>`)).toContain(
      "raw-html-directive",
    );
    expect(rulesOfVue(`  <div>{{ value }}</div>`)).not.toContain(
      "raw-html-directive",
    );
  });

  it("raw-html-directive: reports the property-binding and dynamic-argument spellings", () => {
    expect(rulesOfVue(`  <div :innerHTML="value"></div>`)).toContain(
      "raw-html-directive",
    );
    expect(rulesOfVue(`  <div .innerHTML="value"></div>`)).toContain(
      "raw-html-directive",
    );
    expect(rulesOfVue(`  <div :[attributeName]="value"></div>`)).toContain(
      "raw-html-directive",
    );
    expect(rulesOfVue(`  <div v-bind="attributes"></div>`)).toContain(
      "raw-html-directive",
    );
    expect(rulesOfVue(`  <div :class="tone">{{ value }}</div>`)).not.toContain(
      "raw-html-directive",
    );
  });

  it("raw-html-directive: an HTML comment does NOT disable it — 05-01's measured escape", () => {
    // The exact shape that linted CLEAN with vue/no-v-html at error and
    // noInlineConfig true. This gate discards comments rather than honouring
    // them, so the directive is still reported.
    expect(
      rulesOfVue(
        `  <!-- eslint-disable-next-line vue/no-v-html -->\n  <div v-html="value"></div>`,
      ),
    ).toContain("raw-html-directive");
    // And the converse: prose that merely MENTIONS the directive is not a
    // finding, which is what keeps App.vue's own comment from being one.
    expect(
      rulesOfVue(
        `  <!-- there is no v-html in this codebase -->\n  <div>{{ value }}</div>`,
      ),
    ).not.toContain("raw-html-directive");
  });

  it("dom-html-sink: reports all four sinks, and NOT a textContent assignment", () => {
    expect(rulesOf("element.innerHTML = value;")).toContain("dom-html-sink");
    expect(rulesOf("element.outerHTML = value;")).toContain("dom-html-sink");
    expect(
      rulesOf('element.insertAdjacentHTML("beforeend", value);'),
    ).toContain("dom-html-sink");
    expect(rulesOf("document.write(value);")).toContain("dom-html-sink");
    expect(rulesOf('element["innerHTML"] = value;')).toContain("dom-html-sink");
    expect(rulesOf("element.textContent = value;")).not.toContain(
      "dom-html-sink",
    );
  });

  it("dom-html-sink: reaches a template EXPRESSION, not only a script block", () => {
    expect(
      rulesOfVue(`  <div @click="element.innerHTML = value"></div>`),
    ).toContain("dom-html-sink");
    expect(
      rulesOfVue(`  <div @click="element.textContent = value"></div>`),
    ).not.toContain("dom-html-sink");
  });

  it("dynamic-code-construction: reports eval by any receiver and under an alias", () => {
    expect(rulesOf("eval(payload);")).toContain("dynamic-code-construction");
    expect(rulesOf("globalThis.eval(payload);")).toContain(
      "dynamic-code-construction",
    );
    expect(rulesOf('globalThis["eval"](payload);')).toContain(
      "dynamic-code-construction",
    );
    expect(rulesOf("const run = eval;\nrun(payload);")).toContain(
      "dynamic-code-construction",
    );
    expect(rulesOf("const run = evaluateScore;\nrun(payload);")).not.toContain(
      "dynamic-code-construction",
    );
  });

  it("dynamic-code-construction: reports both Function forms and the indirect eval", () => {
    expect(rulesOf('const f = new Function("return 1");')).toContain(
      "dynamic-code-construction",
    );
    expect(rulesOf('const f = Function("return 1");')).toContain(
      "dynamic-code-construction",
    );
    expect(rulesOf('setTimeout("run()", 0);')).toContain(
      "dynamic-code-construction",
    );
    expect(rulesOf("setInterval(`run()`, 0);")).toContain(
      "dynamic-code-construction",
    );
    expect(rulesOf("setTimeout(() => run(), 0);")).not.toContain(
      "dynamic-code-construction",
    );
    expect(rulesOf("const f = createFunction(spec);")).not.toContain(
      "dynamic-code-construction",
    );
  });

  it("unsafe-attribute-binding: reports non-literal style/href/src/data bindings, and NOT literal ones", () => {
    expect(rulesOfVue(`  <div :style="styleFromTarget"></div>`)).toContain(
      "unsafe-attribute-binding",
    );
    expect(rulesOfVue(`  <a :href="extractedUrl">link</a>`)).toContain(
      "unsafe-attribute-binding",
    );
    expect(rulesOfVue(`  <img :src="extractedUrl" />`)).toContain(
      "unsafe-attribute-binding",
    );
    expect(rulesOfVue(`  <div :data-value="rawValue"></div>`)).toContain(
      "unsafe-attribute-binding",
    );

    expect(rulesOfVue(`  <div :style="'color:red'"></div>`)).not.toContain(
      "unsafe-attribute-binding",
    );
    expect(rulesOfVue(`  <a href="/settings">Settings</a>`)).not.toContain(
      "unsafe-attribute-binding",
    );
    expect(
      rulesOfVue(`  <div class="font-mono">{{ value }}</div>`),
    ).not.toContain("unsafe-attribute-binding");
  });

  it("unsafe-attribute-binding: reports the script-side spellings", () => {
    expect(rulesOf('element.setAttribute("href", extractedUrl);')).toContain(
      "unsafe-attribute-binding",
    );
    expect(rulesOf("element.setAttribute(name, value);")).toContain(
      "unsafe-attribute-binding",
    );
    expect(rulesOf("element.style.cssText = styleFromTarget;")).toContain(
      "unsafe-attribute-binding",
    );
    expect(rulesOf('element.setAttribute("href", "/settings");')).not.toContain(
      "unsafe-attribute-binding",
    );
    expect(
      rulesOf('element.setAttribute("class", "font-mono");'),
    ).not.toContain("unsafe-attribute-binding");
  });

  it("title-attribute: reports EVERY title, static or bound, and NOT aria-label", () => {
    expect(rulesOfVue(`  <div title="the full value"></div>`)).toContain(
      "title-attribute",
    );
    expect(rulesOfVue(`  <div :title="value"></div>`)).toContain(
      "title-attribute",
    );
    expect(rulesOfVue(`  <div v-bind:title="value"></div>`)).toContain(
      "title-attribute",
    );
    expect(rulesOf("element.title = value;")).toContain("title-attribute");
    expect(rulesOf('element.setAttribute("title", value);')).toContain(
      "title-attribute",
    );

    expect(rulesOfVue(`  <div aria-label="Evidence"></div>`)).not.toContain(
      "title-attribute",
    );
    expect(rulesOfVue(`  <div :data-title-id="rowId"></div>`)).not.toContain(
      "title-attribute",
    );
  });

  it("markup-string-construction: reports a <mark> built by concatenation, and NOT a slice", () => {
    expect(rulesOf('const html = "<mark>" + match + "</mark>";')).toContain(
      "markup-string-construction",
    );
    expect(rulesOf("const html = `<mark>${match}</mark>`;")).toContain(
      "markup-string-construction",
    );
    expect(
      rulesOfVue(`  <div @click="render('<mark>' + match)"></div>`),
    ).toContain("markup-string-construction");

    // The correct form: three plain strings, sliced at offsets, no markup in
    // any of them. This is what safety/HighlightSlices.vue does.
    expect(
      rulesOf(
        "const before = text.slice(0, start);\nconst match = text.slice(start, end);\nconst after = text.slice(end);",
      ),
    ).not.toContain("markup-string-construction");
    expect(rulesOf('const label = prefix + " of " + total;')).not.toContain(
      "markup-string-construction",
    );
    expect(rulesOf('const tag = "<mark>";')).not.toContain(
      "markup-string-construction",
    );
  });

  it("every rule name is REACHABLE from a fixture", () => {
    // The closed list above says what the gate CAN emit; this says every one of
    // those names has actually been emitted by a fixture in this file. A rule
    // that is declared but unreachable is a gate that reports nothing.
    const reached = new Set<RuleName>([
      ...rulesOfVue(`  <div v-html="value" title="t" :style="s"></div>`),
      ...rulesOf(
        'element.innerHTML = value;\neval(payload);\nconst html = "<mark>" + match;',
      ),
    ]);
    expect([...RULE_NAMES].filter((r) => !reached.has(r))).toEqual([]);
  });
});
