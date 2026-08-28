---
phase: 05-workspace-operator-workflow
plan: 05
subsystem: ui
tags: [vue, vitest, jsdom, static-analysis, typescript-compiler-api, xss, sanitisation, rendering-safety]

# Dependency graph
requires:
  - phase: 05-workspace-operator-workflow
    provides: "05-01's lint half of R1 — vue/no-v-html at error, no-eval, no-new-func, noInlineConfig, and the MEASURED finding that vue/comment-directive routes around noInlineConfig in a .vue template"
  - phase: 05-workspace-operator-workflow
    provides: "05-03's engine primitives — sanitise.ts (forDisplay, forEvidence, the two named caps, the two exported strip patterns) and hostile.fixture.ts (HOSTILE_CASES, HOSTILE_CASE_IDS)"
  - phase: 01-skeleton-persistence-compatibility
    provides: "sql-discipline.spec.ts's four structural elements as the static-gate template, and boundary.spec.ts's TypeScript-compiler-over-acorn parser choice for TypeScript sources"
provides:
  - "packages/frontend/src/frontend-safety.spec.ts — a source-reading R1/R2 gate over TypeScript AND .vue template blocks that no comment can disable"
  - "auditSource(file, source) — a pure exported audit over six named rules, so every rule's failing path is executable against a synthetic fixture"
  - "packages/frontend/src/safety/display.ts — the single frontend route from a target-controlled string to a template: forCell, forPanel, truncationNotice, copyToClipboard, assertHighlightRanges"
  - "TABLE_ROW_HEIGHT_PX, CELL_TEXT_CLASS, HIGHLIGHT_CLASS — the fixed-row geometry and the mandatory classes as single constants, for 05-07's RecycleScroller and 05-09/05-10's surfaces"
  - "packages/frontend/src/safety/HighlightSlices.vue — R1's highlighting rule as 2n+1 sliced plain strings in sibling elements"
  - "packages/frontend/src/safety/hostile.spec.ts — the shared adversarial corpus rendered and proved inert by DOM inspection on two surfaces"
  - "knip.json: the @defminer/engine frontend ignoreDependencies entry removed, discharging its own stated removal condition"
affects: [05-06, 05-07, 05-08, 05-09, 05-10, 05-11, 05-12]

# Actuals (#2632) — same estimateTokens scale as the plan's estimate: chars/4 over the realized diff.
actuals:
  tokens: 22628
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A static spec-file gate as the STRONGER half of a control whose weaker half is lint: a lint rule can be disabled in a comment, a spec-file gate cannot"
    - "A single-file component decomposed by text into blocks, then audited per block — template attributes and expressions textually, script blocks through the TypeScript compiler"
    - "Template EXPRESSIONS extracted and scanned rather than raw template text, because markup is what a template is made of"
    - "Non-vacuity asserted over the DIRECTORIES a walk entered, not only the files it yielded — descent stays provable when a subdirectory holds nothing auditable"
    - "Inertness asserted by walking NODES against an explicit allowed-tag set, never by inspecting escaped-looking text"
    - "A per-case wall-clock budget as a freeze DETECTOR with its rationale stated, so the multi-megabyte case fails naming itself instead of hitting the suite timeout"

key-files:
  created:
    - packages/frontend/src/frontend-safety.spec.ts
    - packages/frontend/src/safety/display.ts
    - packages/frontend/src/safety/display.spec.ts
    - packages/frontend/src/safety/HighlightSlices.vue
    - packages/frontend/src/safety/hostile.spec.ts
  modified:
    - knip.json

key-decisions:
  - "P5-D21: the gate SKIPS directories named `__*`. scripts/ci/lint-r1.spec.ts writes deliberate R1 violations into packages/frontend/src/__r1_fixtures__ for the life of one test and vitest runs spec files concurrently, so without the skip this gate would intermittently report another spec's fixtures as real findings — a flake indistinguishable from a genuine violation. This is the fourth place the same fact is written (gitignore, tsconfig exclude, eslint ignores, here) and it is written at the walk because that is where it acts."
  - "P5-D22: template rules run over EXTRACTED EXPRESSIONS (bound attribute values and `{{ }}` bodies), not over raw template text. Markup is what a template is made of, so scanning raw text for `<tag>` would report every component's own markup as `markup-string-construction`. HTML comments are discarded first, which is both why an `<!-- eslint-disable -->` is inert here and why App.vue's own comment mentioning `v-html` by name is not a finding."
  - "P5-D23: the `<template>` block is extracted by DEPTH COUNTING, not by slicing to the first `</template>`. App.vue nests a `<template v-if>` inside the root block; a first-close scan would end the block there and leave the entire artifacts table unaudited — a silent coverage loss in the largest template in the package."
  - "P5-D24: descent is asserted over the DIRECTORIES the walk entered rather than only over the files it yielded, plus (from task 2) the stronger file-level form. src/styles/ holds only CSS, so a files-only descent proof would have been unassertable when the gate landed and would have become true later by accident. Both assertions are kept: the first survives a reorganisation that empties src/safety/."
  - "P5-D25: `forPanel` returns the same three keys as `forCell` and carries NO byte count, although R2 asks the panel to state the byte range shown. Bytes are the BACKEND's space and the display text has been grapheme-truncated in the frontend's; putting both spaces on one object is what invites the arithmetic that is silently wrong. The panel (05-10) states the byte range from what the backend supplies alongside the value. `assertHighlightRanges`'s bounds check is where that mismatch is made loud."
  - "P5-D26: `assertHighlightRanges` throws UNCONDITIONALLY rather than only in a development build. packages/frontend's tsconfig carries `types: [\"node\"]` and not vite/client, so `import.meta.env` is not typed here — and the unconditional form is the stronger one anyway: a violated precondition means the offsets and the string disagree, and a confidently WRONG highlight on a triage surface is worse than none."
  - "P5-D27: `copyToClipboard` has NO `document.execCommand` fallback. That path copies by putting the value into a textarea in the document, which is exactly what R2 forbids; a silent downgrade to it would be a security regression that looks like a convenience. On a runtime without the async clipboard API it throws and the caller surfaces the failure."
  - "P5-D28: HighlightSlices renders the EMPTY gap element between two touching ranges, and one element for the whole value when there are no ranges at all. Spans then correspond one-to-one with the offsets the backend reported, which is what makes a wrong highlight auditable rather than merely wrong (EDGE UISEC-01 adjacency and empty)."
  - "P5-D29: the frontend asserts sanitisation using the engine's EXPORTED strip patterns rather than restating them. sanitise.ts exports them for exactly this, and there is a harder reason here: `noInlineConfig: true` is set for packages/frontend/**, so `// eslint-disable-next-line no-control-regex` is inert and a control-character regex literal cannot be written in this package at all."

patterns-established:
  - "The stronger half of a two-part control names the weaker half and says why it is weaker, in the file that carries it"
  - "A gate's own non-vacuity is asserted four ways — a named file set, proven descent, a proven non-empty audit target, and the named rule set — before any rule is trusted"
  - "Every gate rule's failing path is executed BOTH ways: the violating fixture reports it and the corresponding CORRECT form does not"
  - "A spec that is one half of a backstop row's evidence says so in its header, names the plan carrying the other half, and states that a backstop without executed evidence resolves to human-needed"

requirements-completed: [UISEC-01, UISEC-03]

coverage:
  - id: D1
    description: "A static gate parses every non-spec TypeScript file and every single-file component under packages/frontend and reports raw-HTML directives, the four DOM HTML-writing sinks, dynamic code construction, target-controlled strings reaching style/href/src/data bindings, any title attribute, and markup built by concatenation"
    requirement: "UISEC-01"
    verification:
      - kind: unit
        ref: "packages/frontend/src/frontend-safety.spec.ts#rendering safety R1/R2 over packages/frontend/src (UISEC-01, UISEC-03)"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/frontend-safety.spec.ts#the gate's own failure paths"
        status: pass
    human_judgment: false
  - id: D2
    description: "The gate reaches .vue template blocks, not only .ts — proved by a non-zero count of audited non-empty template blocks and by a mutation that injected v-html plus title into the real App.vue and was reported"
    requirement: "UISEC-01"
    verification:
      - kind: unit
        ref: "packages/frontend/src/frontend-safety.spec.ts#audited real `<template>` BLOCKS — not only TypeScript"
        status: pass
      - kind: manual_procedural
        ref: "mutation: v-html + title injected into packages/frontend/src/App.vue, gate reported raw-html-directive and title-attribute, App.vue restored via git checkout"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every gate rule has both halves of its failing path executed against synthetic fixtures in the same file — the violating form reported, the correct form not"
    requirement: "UISEC-01"
    verification:
      - kind: unit
        ref: "packages/frontend/src/frontend-safety.spec.ts#every rule name is REACHABLE from a fixture"
        status: pass
    human_judgment: false
  - id: D4
    description: "One display function is the only frontend route from a target-controlled string to a template, applying the engine's strip-then-truncate pipeline at the caller-named cap with no second implementation"
    requirement: "UISEC-03"
    verification:
      - kind: unit
        ref: "packages/frontend/src/safety/display.spec.ts#forCell / forPanel — bound caps, no default"
        status: pass
    human_judgment: false
  - id: D5
    description: "Match highlighting is three (2n+1) sibling elements holding plain sliced strings, never a markup string built by concatenation; touching and unordered ranges are asserted rather than assumed"
    requirement: "UISEC-01"
    verification:
      - kind: unit
        ref: "packages/frontend/src/safety/display.spec.ts#HighlightSlices — three plain strings, never a markup string"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/safety/display.spec.ts#assertHighlightRanges — the precondition, not a silent repair"
        status: pass
    human_judgment: false
  - id: D6
    description: "No target-controlled content reaches a tooltip, a title attribute or any data attribute on any surface — enforced statically for code not yet written, and asserted per hostile case on rendered DOM"
    requirement: "UISEC-03"
    verification:
      - kind: unit
        ref: "packages/frontend/src/frontend-safety.spec.ts#title-attribute: reports EVERY title, static or bound, and NOT aria-label"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/safety/hostile.spec.ts#hostile corpus rendered inert — findings-table cell (forCell, 256)"
        status: pass
    human_judgment: false
  - id: D7
    description: "The hostile-content fixture renders inert in the table cell path and the evidence panel path: no element node originates from fixture content, nothing renders as markup, no control or bidi character survives — asserted by DOM inspection over the full corpus on both surfaces"
    requirement: "UISEC-03"
    verification:
      - kind: unit
        ref: "packages/frontend/src/safety/hostile.spec.ts#exercised EVERY case in the shared corpus"
        status: pass
      - kind: manual_procedural
        ref: "mutation: identity display function → control/bidi and exhaustiveness assertions failed; empty allowed-tag set → all 42 failed; both restored"
        status: pass
    human_judgment: false
  - id: D8
    description: "A multi-megabyte single-line value, a value with embedded newlines and a four-byte-grapheme value each truncate at the cell cap without splitting a grapheme and without freezing the renderer — asserted here in jsdom"
    requirement: "UISEC-03"
    verification:
      - kind: unit
        ref: "packages/frontend/src/safety/hostile.spec.ts#multi-megabyte-single-line renders inert / four-byte-grapheme renders inert / embedded-newlines-and-tabs renders inert (per-case PER_CASE_BUDGET_MS bound)"
        status: pass
    human_judgment: false
  - id: D9
    description: "The LAYOUT-BREAK half of the two long-text backstop rows — a row that grew, a panel that overflowed — is NOT discharged here. jsdom reports geometry it never laid out."
    verification: []
    human_judgment: true
    rationale: "jsdom performs no layout, so every box measures 0x0 and the geometry assertion in hostile.spec.ts is a floor rather than a proof. UI-SPEC row `long-text / findings-table` carries its `verification: backstop` in plan 05-09's browser-driven load spec; `long-text / evidence-panel` in plan 05-10's real panel. Both are named in hostile.spec.ts's header. A backstop row without executed evidence resolves to human-needed and never to a silent pass (05-VALIDATION.md)."

# Metrics
duration: 24 min
completed: 2026-08-28
status: complete
---

# Phase 05 Plan 05: Rendering Safety — the half a comment cannot disable Summary

**A TypeScript-compiler AST gate over every frontend `.ts` and every `.vue` template block enforcing R1's six mechanisms with each rule's failure executed both ways, one engine-backed display path with caps bound per surface, highlighting by offset slicing into 2n+1 sibling text nodes, and the shared 20-case hostile corpus proved inert by DOM inspection on the cell and panel paths.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-08-28T13:00:12Z
- **Completed:** 2026-08-28T13:23:59Z
- **Tasks:** 3
- **Files created:** 5 (1 modified)

## Accomplishments

- **The escape 05-01 measured is now closed by a control that has no off switch.** 05-01 found that with `vue/no-v-html` at severity 2 *and* `noInlineConfig: true`, a component carrying `v-html` plus `<!-- eslint-disable-next-line vue/no-v-html -->` linted **clean** — because a `<template>` is parsed by vue-eslint-parser and its HTML comments are honoured by `vue/comment-directive`, which `noInlineConfig` does not reach. `frontend-safety.spec.ts` discards comments entirely rather than honouring them, and a spec-file gate cannot be disabled by a comment in the file it is judging. The exact 05-01 shape is a fixture in the failure-path block and is reported.
- **The gate covers `.vue` template blocks, which is the whole point.** A TypeScript-only walk over a Vue package would report zero violations while auditing none of the file type the defect occurred in. Template blocks are reached by depth-counted extraction — App.vue nests a `<template v-if>` inside the root, and a first-`</template>` scan would have left the entire artifacts table unaudited.
- **Six rules, every one with both halves of its failing path executed**: `raw-html-directive`, `dom-html-sink`, `dynamic-code-construction`, `unsafe-attribute-binding`, `title-attribute`, `markup-string-construction`. `eval` and `new Function` — which 05-RESEARCH P-02 measured as covered by *nothing* installed before 05-01 — are caught by any receiver, under an alias (`const run = eval`), through a bracket access, and in the indirect `setTimeout("…")` form.
- **One display path, no second pipeline.** `display.ts` imports `forDisplay`, `forEvidence` and the two named caps from `@defminer/engine/sanitise` and reimplements nothing. `forCell` and `forPanel` bind the cap in the function *name*, so a call site cannot pass the panel's 2,048 into a 32px row — the failure the engine's no-default rule stops by omission and this stops by mistyping.
- **Highlighting by slicing.** `HighlightSlices.vue` renders `2n+1` sibling elements holding plain `String.prototype.slice` results. No string it builds can contain a tag, and the gate's `markup-string-construction` rule reports anyone who tries the other way.
- **The corpus rendered, and proved inert by looking at nodes.** All 20 cases driven through the real display path into a real mounted component, on both the cell and the panel surface (42 tests), asserting tag names against an explicit allowed set, absent `title`/`data-*`/`style` attributes, no surviving control or bidi character, every slice a text node, and a per-case freeze budget.

## Task Commits

1. **Task 1: frontend-safety.spec.ts — the static gate a comment cannot disable** — `e86bdcc` (test)
2. **Task 2 RED: failing spec for the display path and highlighter** — `f51e1b8` (test)
3. **Task 2 GREEN: display.ts, HighlightSlices.vue, gate extension, knip housekeeping** — `8ef3b96` (feat)
4. **Task 3: hostile.spec.ts — the fixture rendered, and proved inert** — `490a8db` (test)

_No REFACTOR commit: the cleanup pass (props destructuring, structural clipboard typing, import ordering) happened before GREEN landed, so there was nothing left to separate._

## Files Created/Modified

- `packages/frontend/src/frontend-safety.spec.ts` — the R1/R2 static gate. Recursive walk over `.ts` (non-spec) and `.vue`, exported pure `auditSource`, six named rules, four non-vacuity assertions, paired failure fixtures.
- `packages/frontend/src/safety/display.ts` — `forCell`, `forPanel`, `truncationNotice`, `copyToClipboard`, `assertHighlightRanges`, plus `TABLE_ROW_HEIGHT_PX`, `CELL_TEXT_CLASS` and `HIGHLIGHT_CLASS` as the single copies of the geometry and the mandatory classes.
- `packages/frontend/src/safety/display.spec.ts` — 21 jsdom cases over the wrapper contract, the precondition, and the component.
- `packages/frontend/src/safety/HighlightSlices.vue` — `2n+1` sliced sibling elements, empty gaps kept, one root node and no top-level comment.
- `packages/frontend/src/safety/hostile.spec.ts` — 42 jsdom cases: the full corpus × two surfaces, plus two exhaustiveness assertions.
- `knip.json` — the `@defminer/engine` frontend `ignoreDependencies` entry removed.

## Decisions Made

Nine decisions, P5-D21 through P5-D29, are in the frontmatter with their reasoning. The three that will matter most to later plans:

- **P5-D25** — `forPanel` carries **no byte count**, although R2 asks the panel to state the byte range shown. Bytes are the backend's length space; the display text has been grapheme-truncated in the frontend's. Putting both on one object is what invites the arithmetic that is silently wrong. Plan 05-10 states the byte range from what the backend supplies alongside the value, and `assertHighlightRanges`'s bounds check is where the mismatch is made loud.
- **P5-D21** — the walk skips `__*` directories, because `scripts/ci/lint-r1.spec.ts` writes deliberate R1 violations into `packages/frontend/src/__r1_fixtures__` while vitest runs spec files concurrently. Without it this gate would intermittently report another spec's fixtures as real findings.
- **P5-D27** — `copyToClipboard` has no `document.execCommand` fallback, because that path copies by putting the full value into the document.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The gate's named-module list and descent proof were seeded in task 1 and tightened in task 2**

- **Found during:** Task 1
- **Issue:** The plan asks the named-module list to be seeded with `index.ts`, `App.vue` and `safety/display.ts`, and asks for a proof the walk descended at least one directory level. Neither `safety/display.ts` nor any subdirectory containing an auditable file exists at the moment task 1's gate lands — `src/styles/` holds only CSS. Both requested assertions would therefore have made task 1's own acceptance criterion (`pnpm vitest run …frontend-safety.spec.ts` exits 0) fail, for a reason unrelated to anything task 1 is about.
- **Fix:** Task 1 seeds `AUDITED_MODULES` with `index.ts`, `backend.ts` and `App.vue`, and proves descent over the **directories the walk entered** rather than over the files it yielded — a claim that is true when the gate lands and stays true afterwards. Task 2's commit, which creates the two files, extends the list to include `display.ts` and `HighlightSlices.vue` and adds the stronger file-level descent assertion. Both are kept: the directory-level one survives a future reorganisation that empties `src/safety/`. The ordering and its reason are recorded in a comment on `AUDITED_MODULES` itself.
- **Files modified:** `packages/frontend/src/frontend-safety.spec.ts`
- **Verification:** Both commits green in isolation; the final state matches the plan's request exactly.
- **Committed in:** `e86bdcc` (seed) and `8ef3b96` (tighten)

**2. [Rule 2 - Missing Critical] The walk excludes `__*` directories**

- **Found during:** Task 1
- **Issue:** `scripts/ci/lint-r1.spec.ts` (plan 05-01) writes deliberately violating components — one carrying `v-html`, one carrying `eval` — into `packages/frontend/src/__r1_fixtures__/` for the life of one test. Vitest runs spec files concurrently. A gate walking `packages/frontend/src` would intermittently pick them up and report another spec's fixtures as real violations: a flake that is indistinguishable, from its output, from a genuine finding.
- **Fix:** the walk skips any directory whose name starts with `__`, with the reason and the three other places the same fact is already written (gitignore, tsconfig `exclude`, eslint `ignores`) recorded at the walk.
- **Files modified:** `packages/frontend/src/frontend-safety.spec.ts`
- **Verification:** the full suite (`pnpm test`, 44 files / 1704 tests) is green with `lint-r1.spec.ts` running alongside.
- **Committed in:** `e86bdcc`

**3. [Rule 1 - Bug] A top-level HTML comment in `HighlightSlices.vue` made the component a fragment**

- **Found during:** Task 2 GREEN
- **Issue:** the component's template opened with an explanatory `<!-- … -->` comment above its single root `<span>`. In Vue 3 a top-level comment is a **node**, so the component became multi-root; `wrapper.element` then resolved to the mount container rather than to the outer span, every class assertion read `''`, and the sibling-count assertions saw one child instead of five. Six of the RED spec's cases failed for this reason and none of them for the reason they were written.
- **Fix:** the comment moved into the `<script setup>` header, where it cannot create a node. The template now has exactly one root and no top-level comment, and the measured reason is recorded there.
- **Files modified:** `packages/frontend/src/safety/HighlightSlices.vue`
- **Verification:** all 21 display cases pass; the mechanism is stated in the file so the next author does not re-add the comment.
- **Committed in:** `8ef3b96`

**4. [Rule 1 - Bug] A test assertion that fails on the correct implementation**

- **Found during:** Task 2 GREEN
- **Issue:** the truncation-affordance case asserted `expect(notice).not.toContain("d")` over a value made of the letter `d`. "Truncated" contains a `d`. The assertion was checking the wrong thing and would have failed against any correct implementation.
- **Fix:** asserted against a **run** of the value (`over.slice(0, 4)`) instead of a single character, with the reason written next to it — an assertion that fails on the correct implementation is not evidence of anything.
- **Files modified:** `packages/frontend/src/safety/display.spec.ts`
- **Verification:** the exact-string `toBe` assertion on the notice is the load-bearing one and is unchanged.
- **Committed in:** `8ef3b96`

**5. [Rule 3 - Blocking] The strip assertions could not be written as regex literals in this package**

- **Found during:** Task 2 RED
- **Issue:** the natural way to assert "no control character survived" is a `/[ -…]/` literal, which `no-control-regex` reports. `sanitise.ts` suppresses it with an inline disable — but `noInlineConfig: true` is set for `packages/frontend/**`, so an inline disable is **inert** there and a control-character regex literal cannot be written in the frontend at all.
- **Fix:** import `C0_C1_CONTROLS` and `BIDI_OVERRIDES_ISOLATES` from `@defminer/engine/sanitise` and assert with `replace` rather than `test` (both carry `g`, and a global regex's `test` is stateful through `lastIndex`). This is what those exports exist for — sanitise.ts's own declaration says so — so the constraint pushed the code onto the intended path.
- **Files modified:** `packages/frontend/src/safety/display.spec.ts`, `packages/frontend/src/safety/hostile.spec.ts`
- **Verification:** `pnpm lint --max-warnings=0` clean; the assertions were mutation-checked (see below).
- **Committed in:** `f51e1b8`, `490a8db`

**6. [Rule 3 - Blocking] `Array.from` over `NamedNodeMap`/`HTMLCollection` typed as `unknown[]`**

- **Found during:** Task 3
- **Issue:** `pnpm typecheck` and `vue-tsc` both reported `TS18046: 'attribute' is of type 'unknown'` for `Array.from(node.attributes)`, `Array.from(root.children)` and `Array.from(child.childNodes)`, while the spread form resolves correctly under this repo's `lib` configuration.
- **Fix:** spread (`[...node.attributes]`) instead of `Array.from`. No cast, no `any`.
- **Files modified:** `packages/frontend/src/safety/hostile.spec.ts`
- **Verification:** `pnpm typecheck` and `packages/frontend`'s `vue-tsc --build` both clean.
- **Committed in:** `490a8db`

**7. [Rule 2 - Missing Critical] `knip.json` housekeeping this plan owns**

- **Found during:** Task 2
- **Issue:** `knip.json` listed `@defminer/engine` under `packages/frontend`'s `ignoreDependencies` with the note "Remove this entry when the first import lands." `display.ts` lands it.
- **Fix:** entry removed, with the discharge recorded in place — an ignore that has stopped being needed is an ignore that starts hiding the next real one. The two remaining entries (`vue-virtual-scroller`, `@vueuse/core`) keep their own notes intact and are still owed by plans 05-07 and 05-08.
- **Files modified:** `knip.json`
- **Verification:** `pnpm knip` exits 0.
- **Committed in:** `8ef3b96`

---

**Total deviations:** 7 auto-fixed (2 × Rule 1 bug, 2 × Rule 2 missing critical, 3 × Rule 3 blocking)
**Impact on plan:** All seven were necessary for correctness or for a task to be green at its own commit. Deviation 1 is the only one that changes *when* something the plan asked for lands; the final state is exactly what the plan specified. No scope creep — nothing was added beyond the plan's four artifacts and the housekeeping it explicitly assigned.

## Non-vacuity: what was watched failing

A gate that has never gone red is a gate nobody has tested. Three mutations were run and reverted:

| Mutation | Result |
|---|---|
| `v-html="rows" title="x"` injected into the real `App.vue` `<h1>` | the whole-package assertion reported `raw-html-directive` **and** `title-attribute` with their full details; `App.vue` restored via `git checkout` |
| `hostile.spec.ts`'s cell surface swapped for an identity function (no sanitisation) | 8 failures — `c0-control-run`, `c1-control-run`, `bidi-override-hostname-reversal` and `bidi-isolate-sequence` failed the control/bidi assertions, **and the exhaustiveness assertion failed too**, which proves that check is not tautological: a case that fails never reaches the exercised set |
| `ALLOWED_TAGS` emptied | all 42 cases failed with `produced a <SPAN> element — the payload PARSED`, proving the node walk finds real nodes rather than an empty set |

## Issues Encountered

None beyond the deviations above. Every one was found by running something rather than by reading it.

## Verification

| Check | Result |
|---|---|
| `pnpm vitest run packages/frontend/src/frontend-safety.spec.ts` | 20 passed |
| `pnpm vitest run packages/frontend/src/safety/display.spec.ts` | 21 passed |
| `pnpm vitest run packages/frontend/src/safety/hostile.spec.ts` | 42 passed |
| `pnpm vitest run packages/frontend/src` | 5 files / 99 passed |
| `pnpm test` (whole repo) | 44 files / 1704 passed |
| `pnpm lint --max-warnings=0` | clean |
| `pnpm exec eslint packages/frontend/src/safety --max-warnings=0` | clean |
| `pnpm typecheck` (`tsc --build`) | clean |
| `packages/frontend` `vue-tsc --build` | clean |
| `pnpm knip` | clean |

## Known Stubs

None. Every file this plan created is complete and exercised; nothing is placeholder, and no `TODO`/`FIXME` was left behind.

## Threat Flags

None. The files created introduce no network endpoint, no auth path, no file access and no schema change. They *close* surface rather than open it: T-05-20 through T-05-25 each gained a mechanism named in the plan's threat register — `raw-html-directive`/`dom-html-sink`/`markup-string-construction` for T-05-20, the aliased and indirect `dynamic-code-construction` forms for T-05-21, `title-attribute` and `unsafe-attribute-binding` for T-05-22, the re-applied strip pipeline plus the per-case bidi assertion for T-05-23, the bound caps and per-case freeze budget for T-05-24, and the non-literal `href`/`src` rule for T-05-25.

## Housekeeping: the CORE-11 `DERIVED RESIDUAL` span

`.planning/REQUIREMENTS.md`'s machine-owned span (lines 198–790) was hashed before this plan's close-out and again after:

- before: `0233ac828596b11146b54ea33eee42c213c094c3aa2ac14806270cb9c9a1b843`
- after: recorded in the close-out commit; the span was **not** edited by this plan.

`requirements.mark-complete` was run through `requirements.ready-ids`, which is read-only against the span.

## User Setup Required

None — no external service configuration.

## Next Phase Readiness

**Ready for 05-06.** What later plans in this phase now inherit:

- **05-07** (virtualised keyset table) must read `TABLE_ROW_HEIGHT_PX` from `safety/display.ts` for `RecycleScroller`'s `:item-size` rather than restating `32`.
- **05-09** (findings table) owes the `verification: backstop` lift for `long-text / findings-table` — the browser-driven load spec where a broken row height is observable. It also owns removing `vue-virtual-scroller` from `knip.json`'s frontend `ignoreDependencies` if 05-07 has not.
- **05-10** (evidence panel) owes the `long-text / evidence-panel` backstop, and is the plan that states the panel's **byte range** from what the backend supplies (P5-D25).
- **05-11** (export) owes the hostile-content half of the export row's backstop — the produced bytes.
- **All frontend plans** are now under the gate: it is a static walk, so it covers files that do not exist yet. Any component written by 05-06 through 05-12 that reaches for `v-html`, an HTML sink, `eval`, a non-literal `style`/`href`/`src`/`data-*` binding, a `title` attribute, or markup built by concatenation fails `pnpm test` at the commit that introduces it.
- **When Phase 4 unblocks the suppressions list and the projection preview**, `hostile.spec.ts` extends by adding a third and fourth surface to its loop — the corpus is imported, not forked.

---
*Phase: 05-workspace-operator-workflow*
*Completed: 2026-08-28*

## Self-Check: PASSED

All five created files exist on disk; all four task commits (`e86bdcc`, `f51e1b8`, `8ef3b96`, `490a8db`) are present in `git log`.
