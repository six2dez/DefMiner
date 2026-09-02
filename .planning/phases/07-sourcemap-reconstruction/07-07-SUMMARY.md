---
phase: 07-sourcemap-reconstruction
plan: 07
subsystem: ui
tags:
  [
    vue,
    tailwind,
    vue-virtual-scroller,
    sanitisation,
    unicode,
    path-normalisation,
    accessibility,
  ]

requires:
  - phase: 07-sourcemap-reconstruction
    provides: "07-03's D-12 sources-sink gate and D-17 codec ban, which the tree's import-set equality has to stay inside"
  - phase: 07-sourcemap-reconstruction
    provides: "07-04's SOURCE_PRODUCIBILITY_STATES — the closed vocabulary the third presentation map is a Record over"
  - phase: 07-sourcemap-reconstruction
    provides: "07-06's RecoveredSourceRow (sourcesVerbatim, sourceIndex, producibility) and the returned/total pair the bound line reads"
  - phase: 07-sourcemap-reconstruction
    provides: "07-01's SOURCES_LABEL_CASES — SPIKE-12's 22 measured labels plus the 4 KB case"
  - phase: 05-workspace-operator-workflow
    provides: "safety/display.ts's R2 wrappers, table-contract.ts's row-height lookup, InventoryTable.vue's scroller invocation, hostile.spec.ts"
provides:
  - "SOURCE_LINE_MAX_GRAPHEMES = 1024 — R2's third truncation tier, in the engine beside the two shipped caps"
  - "forSourceLine() and sourceLineTruncated() — the third named wrapper, cap bound in the name, with the TAB exception"
  - "SOURCE_LINE_HEIGHT_PX = 24, SOURCE_LINE_HEIGHT_CLASS and the h-6 literal in ROW_HEIGHT_CLASSES"
  - "buildSourceTree / flattenSourceTree / expandableKeys — the O-08 display normaliser, pure, with no write path and no node:path"
  - "SOURCE_PRODUCIBILITY_PRESENTATION — the third presentation map, a full Record whose common member renders nothing"
  - "ProducibilityMark.vue and the data-defminer-source-producibility marker"
  - "SourceTree.vue — the drill-down's tree column, virtualised at the fixed 32px row"
  - "A sixth surface on the shipped hostile-render backstop, driven over both corpora"
affects:
  [
    07-08-source-viewer,
    07-09-drill-down,
    07-10-manifest-export,
    phase-verification,
  ]

# Actuals (#2632). Same estimateTokens scale as the plan's `estimate`, which was 68,000.
# Measured as chars/4 over the FULL TEXT of the 13 changed source files at HEAD
# (261,548 chars). The diff-only figure, for anyone reading the other scale, is
# 149,772 added chars => 37,443.
actuals:
  tokens: 65387
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Exact-set import equality as a prohibition proof: parse the module with the TypeScript compiler and assert its module-specifier set and named-import set with toEqual, rather than searching the source for the banned literal"
    - "Structural losslessness: a display normaliser with no write path, whose node carries an INDEX rather than the string, proved by a byte-identical round-trip assertion at both the function and the component boundary"
    - "A full Record whose common member is two nulls — an invisible vocabulary member that is still a compile-time-required row"
    - "A shared throwing resolver (rowHeightClass) behind two constants, exported so its failing path is executed rather than described"

key-files:
  created:
    - packages/frontend/src/sourcemap/tree.ts
    - packages/frontend/src/sourcemap/tree.spec.ts
    - packages/frontend/src/components/source-producibility-presentation.ts
    - packages/frontend/src/components/source-producibility-presentation.spec.ts
    - packages/frontend/src/components/ProducibilityMark.vue
    - packages/frontend/src/components/SourceTree.vue
    - packages/frontend/src/components/SourceTree.spec.ts
  modified:
    - packages/engine/src/sanitise.ts
    - packages/engine/src/sanitise.spec.ts
    - packages/frontend/src/safety/display.ts
    - packages/frontend/src/safety/display.spec.ts
    - packages/frontend/src/components/table-contract.ts
    - packages/frontend/src/components/scan-lifecycle-presentation.spec.ts
    - packages/frontend/src/safety/hostile.spec.ts

key-decisions:
  - "P7-D07-1 — The climb count is recorded on the LEAF, and ANY resolved climb marks the node degraded, not only a climb refused at the root. A directory is shared between rows, so a climb recorded there attributes one row's history to another row's ancestor or is lost entirely when the directory already exists. And the operator's question is the same in both cases: this node's position was COMPUTED from a climb rather than read off the string. `clampedClimbs` is carried separately for the harder half."
  - "P7-D07-2 — Segment truncation is detected by a one-character PROBE (`forCellText(segment + 'x') === forCellText(segment)`) rather than by comparing against the cap, because reaching for the cap would mean a second named import and the named-import set is exactly what proves `forCell` unreachable. A segment of EXACTLY the cap over-reports as truncated; the error direction is safe and is stated at the declaration."
  - "P7-D07-3 — `table-contract.ts`'s throwing IIFE was FACTORED into an exported `rowHeightClass(px)` rather than copied for the second height. Two copies of one error message stop matching the moment either is edited, and exporting it means the failing path is executed by a spec instead of only described."
  - "P7-D07-4 — `SourceTree.vue` is built against `InventoryTable.vue`, not `ArtifactsTable.vue`. D-18 named the wrong file; `ArtifactsTable.vue` declares a column list and mounts the shared shell, and the actual scroller invocation is in `InventoryTable.vue:473-531`."
  - "P7-D07-5 — PrimeVue's `Tree` is AVAILABLE AND NOT USED. A themed tree cannot be made to guarantee the fixed 32px geometry every other list on this page uses, nor that every node label goes through `safety/display.ts` per segment. Both are non-negotiable, so the markup is authored."
  - "P7-D07-6 — The cross-vocabulary prefix guard was EXTENDED to a third map in `scan-lifecycle-presentation.spec.ts` rather than forked into a new file. Two guards over overlapping unions is how one comes to cover a word the other dropped with neither owner noticing."
  - "P7-D07-7 — `tree.ts` declares its input row STRUCTURALLY and imports nothing from `@defminer/engine/contract`. A type-only import is still a module specifier, and the exact-set equality is only unambiguous over a set of one."

patterns-established:
  - "Prohibition by equality, not by search: an exact-set assertion over parsed imports fails on a banned dependency without anyone having to enumerate the spellings it could arrive under"
  - "Losslessness as a structural property: no write path, an index for identity, and a byte-identical round trip asserted in two places that fail for different reasons"
  - "An invisible common vocabulary member: the ordinary case renders no word, no tone and no element, which is what keeps a tombstone legible when one appears"

requirements-completed: [UI-05, MAP-04]

coverage:
  - id: D1
    description: "R2's third truncation tier — SOURCE_LINE_MAX_GRAPHEMES = 1024 in the engine, distinct from both shipped caps, exercised from both sides of the boundary"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#R2 constants"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/safety/display.spec.ts#forSourceLine — the third cap, bound in the name"
        status: pass
    human_judgment: false
  - id: D2
    description: "forSourceLine — the third named wrapper, with the one deliberate exception: TAB renders as a fixed run of two DefMiner-authored spaces and every other C0/C1 control is stripped"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/safety/display.spec.ts#forSourceLine — the ONE exception: TAB is rendered, not stripped"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/safety/display.spec.ts#forSourceLine — the measured hostile labels, rendered safely"
        status: pass
    human_judgment: false
  - id: D3
    description: "SOURCE_LINE_HEIGHT_PX = 24 with its h-6 LITERAL in ROW_HEIGHT_CLASSES; the resolver throws rather than falls back, and TABLE_ROW_HEIGHT_PX is unchanged"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/safety/display.spec.ts#SOURCE_LINE_HEIGHT_PX — the SECOND number, beside the first"
        status: pass
      - kind: other
        ref: "scratch edit removing the 24 entry — module throws at import with the map's own message (recorded below)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The O-08 display normaliser — five pure steps over the 23 measured labels, with no node:path in any specifier form"
    requirement: "MAP-04"
    verification:
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#tree.ts imports NOTHING but the shipped text-only display path"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#step 1 — the shape is classified and never repaired"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#step 3 — climbs are resolved, bounded at the root, and MARKED"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#step 5 — duplicates keep their distinction"
        status: pass
    human_judgment: false
  - id: D5
    description: "Structural losslessness — the stored verbatim string is byte-identical after tree construction, for every fixture, at the function boundary and again at the component boundary"
    requirement: "MAP-04"
    verification:
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#the normaliser has no write path — the round trip is byte-identical"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/safety/hostile.spec.ts#source tree — the whole corpus at once, still lossless"
        status: pass
    human_judgment: false
  - id: D6
    description: "The third presentation map, its own renderer and its own marker; the ordinary member renders nothing at all, and the prefix-relation guard covers all three vocabularies"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/source-producibility-presentation.spec.ts#SOURCE_PRODUCIBILITY_PRESENTATION is a Record over the closed vocabulary"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/source-producibility-presentation.spec.ts#ProducibilityMark — its own renderer, its own marker"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/scan-lifecycle-presentation.spec.ts#the THREE status vocabularies cannot be confused"
        status: pass
    human_judgment: false
  - id: D7
    description: "SourceTree.vue's five states — empty, loading, error, populated, partial — with empty and error asserted to render DIFFERENT headings, and item-size bound to TABLE_ROW_HEIGHT_PX by identity"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceTree.spec.ts#source-tree / empty — the inline-only explanation, and NOT the error"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceTree.spec.ts#source-tree / loading — skeleton rows, NEVER a spinner"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceTree.spec.ts#source-tree / error — explicit, with both actions, NEVER an empty list"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceTree.spec.ts#source-tree / populated — the flattened list, virtualised at the fixed height"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceTree.spec.ts#source-tree / partial — a node is NEVER hidden because part of it is missing"
        status: pass
    human_judgment: false
  - id: D8
    description: "UI Considerations / source-tree / long-text — the hostile label set rendered through the real component, with no title, no data attribute carrying the label, and the round trip"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/safety/hostile.spec.ts#hostile labels rendered inert — source tree, sources-label corpus (SPIKE-12, map-fixture.ts)"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/safety/hostile.spec.ts#hostile labels rendered inert — source tree, shared adversarial corpus (hostile.fixture.ts)"
        status: pass
    human_judgment: true
    rationale: "The row is `backstop` in the UI contract and the LAYOUT half is not observable in jsdom — every box is 0x0 because nothing was laid out, so an assertion that a 4 KB label did not grow the fixed 32px row is an assertion about a number nothing computed. Sanitisation, inertness, the absolute prohibitions and the round trip are discharged here; the measured height is owed by a browser-driven load spec, exactly as the three Phase 5 rows before it."
  - id: D9
    description: "UI Considerations / source-tree / overflow — the U7-1 2,000-node bound: the SHAPE is implemented and asserted, the NUMBER is carried as an explicit planner assumption"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceTree.spec.ts#states the bound in WORDS when the read stopped short, and not otherwise"
        status: pass
    human_judgment: true
    rationale: "07-UI-SPEC.md logs this row `⚠ unresolved` by its own probe. The shape — a stated bound, enforced at the read, with the truncation said in words rather than silently — is implemented and asserted by exact string comparison. The NUMBER is a defensible reuse of the shipped in-memory window and NOT a measurement; no requirement bounds the expected source count. A human must decide whether 2,000 survives contact with a real target."

duration: 31 min
completed: 2026-09-02
status: complete
---

# Phase 7 Plan 07: Safety Primitives and the Display Tree Summary

**A third named truncation tier and a third named wrapper in the shipped idiom, a pure five-step `sources` normaliser that is lossless because it has no write path at all, and the tree column that renders every measured hostile label without losing the original.**

## Performance

- **Duration:** 31 min
- **Started:** 2026-09-02T01:13Z
- **Completed:** 2026-09-02T01:44Z
- **Tasks:** 3 of 3
- **Files modified:** 15 (7 created, 8 modified — 13 source, 2 planning)

## Accomplishments

- **`SOURCE_LINE_MAX_GRAPHEMES = 1024` in `packages/engine/src/sanitise.ts`**, declared beside the two shipped caps in their own one-line-justification style. The number is defended by its RELATIONS and those relations are asserted, not just its value: exactly four times the cell cap and exactly half the panel cap, so a mistyped constant renders a visibly wrong length rather than a subtly wrong one.
- **`forSourceLine()` and `sourceLineTruncated()` in `packages/frontend/src/safety/display.ts`**, with the cap bound in the NAME and never mentioned at a call site — a rule the spec now enforces by parsing this module's own source and asserting the wrapper body contains no three-digit number at all.
- **The TAB exception, argued where a reader will ask.** A TAB renders as a fixed run of two DefMiner-authored spaces; every other C0/C1 control is stripped unchanged, and bidi overrides and isolates are stripped unchanged. The substitution happens BEFORE the engine call, so R2 is still re-asserted by CALLING the engine rather than by restating it.
- **`SOURCE_LINE_HEIGHT_PX = 24` and the `h-6` LITERAL** in `ROW_HEIGHT_CLASSES`, with the throwing resolver factored into one exported function so both heights share one message. `TABLE_ROW_HEIGHT_PX` is unchanged and the tree still reads it.
- **The O-08 display normaliser** — five pure steps over the 23 measured labels, with the general-purpose path library excluded by an EXACT-SET equality on the module-specifier and named-import sets rather than by a search for a literal.
- **Losslessness proved structurally, twice.** The normaliser has no write path; the node carries `sourcesIndex` and the label is never the identity. The round trip is asserted at the function boundary over every fixture, singly and as one tree, and again at the component boundary after a real mount.
- **The third status vocabulary, separated by four transferring mechanisms plus the fifth's replacement** — its own map, its own renderer, its own marker, non-prefix labels asserted case-insensitively across all three maps in both directions, and NOTHING rendered for the common member.
- **`SourceTree.vue`** — the tree column, built against the correct precedent, with five jsdom state tests, a text-codepoint disclosure that is never the sole carrier, and the count line agreeing at 0, 1 and many by exact string comparison.
- **A sixth surface on the shipped hostile-render backstop**, driven over BOTH corpora with both exhaustiveness assertions, extended rather than forked.

## The three RED demonstrations, with their messages

The plan's `<verification>` asks for these to be recorded. All three were executed against the real tree and then reverted; the tree is clean.

### 1. The missing class-map literal — `table-contract.ts` throws AT IMPORT

Scratch edit: delete `24: "h-6",` from `ROW_HEIGHT_CLASSES`. `pnpm vitest run packages/frontend/src/safety/display.spec.ts` then fails before collecting a single test:

```
Error: table-contract: a fixed row height of 24px is in use but no Tailwind utility is
registered for it. Add the class to ROW_HEIGHT_CLASSES as a LITERAL — Tailwind's JIT only
emits a utility it can see spelled out in the scanned source, so an interpolated h-[24px]
would emit nothing and the table would render unstyled without failing.
 ❯ rowHeightClass packages/frontend/src/components/table-contract.ts:101:11
 ❯ packages/frontend/src/components/table-contract.ts:120:49
 Test Files  1 failed (1)
      Tests  no tests
```

`Tests  no tests` is the part worth reading: the module throws while it is being imported, before a row is laid out. That is the behaviour the shipped IIFE had and the refactor preserved.

### 2. The missing presentation row — a TYPECHECK error

Scratch edit: delete the `gone` row from `SOURCE_PRODUCIBILITY_PRESENTATION`. `pnpm typecheck`:

```
packages/frontend/src/components/source-producibility-presentation.ts(106,14): error TS2741:
Property 'gone' is missing in type 'Readonly<{ producible: { label: null; toneClass: null; };
changed: { label: string; toneClass: string; }; }>' but required in type
'Readonly<Record<"producible" | "gone" | "changed", SourceProducibilityPresentation>>'.
```

A member added to the vocabulary without a row here fails the same way, which is the whole mechanism — not the comment above it.

### 3. The prefix-relation collision — a scratch `Gon` beside the shipped `Gone`

Scratch edit: `prefixCollisions(everyOperatorWord(["Gon"]))` in the positive assertion.

```
AssertionError: a word an operator reads on one surface is a prefix of a word that means
something else on another. Complete/Completed is the shape this rule exists to catch, and
the fix is a different word, never a suppression.: expected [ { a: 'Gon', b: 'Gone' } ] to
deeply equal []
```

A set-disjointness check would have passed `Gon` beside `Gone` without comment. The same negative fixture is also shipped as a permanent test case, so the guard's failing path runs on every suite run rather than only in this summary.

**A fourth, unasked-for RED demonstration** was run on the import-set equality, because an equality that has never been seen to fail is an equality nobody has tested. Adding `import { normalize } from "node:path"` and widening the display import to `{ forCell, forCellText }`:

```
AssertionError: expected [ 'node:path', '../safety/display' ] to deeply equal [ '../safety/display' ]
AssertionError: expected [ 'normalize', 'forCell', …(1) ] to deeply equal [ 'forCellText' ]
```

Two failures, from two separate assertions, naming both prohibitions.

## The exact-set import assertions, as shipped

`packages/frontend/src/sourcemap/tree.spec.ts` parses `tree.ts` with the TypeScript compiler and collects module specifiers from four forms — `import`, `export … from`, dynamic `import()` and `require()` — so an equality over a set that counted only static imports would not be an equality over a hole. It then asserts:

```ts
expect(facts.specifiers).toEqual(["../safety/display"]);
expect(facts.namesFromDisplay).toEqual(["forCellText"]);
expect(facts.visited).toBeGreaterThan(200);   // non-vacuity
```

The second equality is simultaneously the T-07-12 proof: `forCell` walks the whole value to compute a `total` no tree node renders, and `display.ts` measures what that costs — 99 of 396 frames over the 32 ms budget and a 37,395 ms scroll, against 0 of 396 and 4,010 ms.

`packages/frontend/src/components/SourceTree.spec.ts` makes the same shape of assertion over the component's `<script setup>` block:

```ts
expect(specifiersOf()).toEqual([
  "../safety/display",
  "../sourcemap/tree",
  "./ProducibilityMark.vue",
  "./table-contract",
  "@defminer/engine/contract",
  "vue",
  "vue-virtual-scroller",
]);
```

Neither shipped presentation map is in that set, which is the half of O-07's no-shared-subtree rule that is testable before plan 07-09 puts both regions on screen at once.

## The hostile-render observations, over the full label set

Both corpora were driven through the REAL `SourceTree` component — 23 `SOURCES_LABEL_CASES` and 20 `HOSTILE_CASES`, each with its own id-set exhaustiveness assertion, so a case added to either fixture later fails here until it is accounted for.

| Observation | Result |
| --- | --- |
| Tag names against an explicit allowed set (`DIV`, `H2`, `P`, `BUTTON`, `SPAN`) | No payload parsed into an element, on any case |
| `title` attribute anywhere in the subtree | Absent, on every case and on the whole corpus mounted at once |
| `data-*` carrying the label | No data attribute exceeds `TABLE_CELL_MAX_GRAPHEMES`, and none contains a 32-character run of the payload |
| `style` attribute from the value | Never set |
| C0/C1 controls in a rendered label | None survive; the NUL-byte fixture's label is clean and its stored string still carries the byte |
| Bidi overrides and isolates in a rendered label | None survive; the RTL fixture renders with its climb marked and its stored string intact |
| Lone surrogates | None — the four-byte-grapheme and combining-mark cases keep whole clusters |
| Per-segment cap | Every label is `≤ 256` graphemes; the 4 KB label is cut and carries **label truncated** |
| Label is the sanitiser's own output | `forCellText(rendered) === rendered` on every label, asserted by CALLING it rather than by reimplementing it |
| Growth mechanism | Every label element carries `whitespace-pre overflow-hidden font-mono` |
| Row still renders | Every case produced at least one `treeitem`; nothing is hidden because part of it is hostile |
| Byte-identical round trip after mount | Holds on every case, and on all 23 mounted together |
| Freeze budget | Every case under 5,000 ms, including the 4 MiB single-line value |

**Two observations worth stating rather than burying.** The `data-*` assertion could not be the shipped loops' "no data attribute exists at all" — the tree legitimately uses `data-*` markers for its own regions. It is the stronger honest form instead: no data attribute may carry more than the cell cap, and none may contain a run of the payload. And the assertion `[...text].length <= TABLE_CELL_MAX_GRAPHEMES` is strictly stronger than the acceptance criterion's `SOURCE_LINE_MAX_GRAPHEMES`, because the tree renders through the CELL path and the cell cap is a quarter of the source-line cap.

## The U7-1 bound, restated AS AN ASSUMPTION

**The 2,000-node tree bound is a planner assumption, not a measurement, and nothing in this plan promoted it.**

The SHAPE is binding and is implemented: the bound is enforced at the read (plan 07-06's `SOURCE_TREE_LOAD_MAX`), `returned` and `total` arrive as two separate fields and neither is derived from the other, and the truncation is said in words:

```
Showing the first 2,000 of 9,999 recovered sources, in the order this map declares them.
```

asserted by exact string comparison, and asserted ABSENT when the read did not stop short.

The NUMBER is a defensible reuse of the shipped in-memory window that the frontend already holds for the inventory tables. No requirement bounds the expected source count, and 07-UI-SPEC.md logs the row `⚠ unresolved` by its own probe. **If a real target produces a tree this bound truncates meaningfully, the number is what changes — not the shape, and not the words.** This mirrors the disposition Phase 6's U6-1 and Phase 5's P5-D20 took, and it is carried into the coverage block as `human_judgment: true` rather than signed off here.

**U7-4 (`SOURCE_LINE_MAX_GRAPHEMES` = 1024) and U7-5 (a two-space tab stop)** ship under their stated defaults on the same terms: the shapes are binding — a third named cap in the engine, a third named wrapper with the surface bound in the function name, and TAB rendered rather than stripped — and the numbers are proposals.

## Deviations from Plan

### 1. [Rule 2 — missing critical] The RTL-override fixture does not clamp past the root, so the climb accounting was widened

- **Found during:** Task 2
- **Issue:** The plan's acceptance criterion reads *"The RTL-override fixture produces a node … with `degraded` true and a climb count greater than zero."* Under clamp-only accounting that criterion is unsatisfiable: `sub/<RLO>resrc<PDF>/../../defminer-escape.txt` pushes two segments and pops two, so it lands exactly AT the root and no climb is ever refused. A clamp-only counter reports zero and `degraded` false, and the fixture the plan singled out would have been the one case the marking missed.
- **Fix:** The leaf carries TWO numbers. `climbs` counts every `..` the path declared; `clampedClimbs` counts the subset refused at the root. `degraded` and the **path clamped** note are driven by `climbs > 0`, because both cases are the same fact from the operator's side — the node's rendered position was COMPUTED from a climb rather than read off the string, and comparing it against the developer's real layout needs the verbatim entry the viewer header shows. The traversal fixture still reports `clampedClimbs: 6`, so the harder half is not lost.
- **Files modified:** `packages/frontend/src/sourcemap/tree.ts`, `packages/frontend/src/sourcemap/tree.spec.ts`
- **Verification:** `tree.spec.ts` asserts `climbs: 6` / `clampedClimbs: 6` on the traversal fixture, `climbs > 0` with `degraded` true on the RTL fixture, and `climbs: 0` with no note on the benign control.
- **Commit:** `362a4ba`

### 2. [Rule 3 — blocking] Segment truncation had to be detected without a second import

- **Found during:** Task 2
- **Issue:** Step 4 needs to know whether a segment was CUT, so the node can carry **label truncated**. The exact test is "does the stripped segment exceed the cap", and the cap is bound inside `forCellText` — reaching for it means importing a second name, which breaks the very named-import equality that proves `forCell` unreachable.
- **Fix:** A one-character probe: `forCellText(segment + "x") === forCellText(segment)`. Exact below and above the cap; a segment of EXACTLY the cap over-reports as truncated. The over-report errs in the safe direction — the note tells the operator to check the verbatim string, which the viewer header always shows, whereas a false "this is complete" is the error that costs something. Stated at the declaration rather than hidden.
- **Files modified:** `packages/frontend/src/sourcemap/tree.ts`
- **Verification:** `tree.spec.ts` asserts the 4 KB label carries the note and the benign control does not.
- **Commit:** `362a4ba`

### 3. [Rule 2 — missing critical] The row-height resolver was FACTORED rather than copied

- **Found during:** Task 1
- **Issue:** The plan says to "copy that behaviour for the new entry". A literal copy would have produced two throwing IIFEs carrying two copies of the same eight-line message — and the message is the part that matters, because it is what tells the next author that the class must be a LITERAL. Two copies stop matching the moment either is edited.
- **Fix:** One exported `rowHeightClass(heightPx)` behind both constants. It is exported (tagged `@internal`) specifically so its failing path can be EXECUTED by a spec rather than only described — the rule `frontend-safety.spec.ts` states for itself and builds its whole fixture block around. The import-time throw is unchanged and was demonstrated on the real module (RED demo 1).
- **Files modified:** `packages/frontend/src/components/table-contract.ts`, `packages/frontend/src/safety/display.spec.ts`
- **Note on the acceptance criterion:** *"`git diff -- table-contract.ts` shows `TABLE_ROW_HEIGHT_PX`'s own line unchanged."* The constant's DECLARATION lives in `safety/display.ts` and is byte-unchanged there (`git diff` over that file shows no line touching `TABLE_ROW_HEIGHT_PX = 32`). In `table-contract.ts` the import line is likewise untouched; the lines that moved are the IIFE that CONSUMED it, and the resolution `rowHeightClass(TABLE_ROW_HEIGHT_PX)` preserves the semantics exactly. The criterion's intent — the 32px number is not changed by this plan — holds.
- **Commit:** `2c27850`

### 4. [Rule 2 — missing critical] `SourceTree.vue` needed a `SOURCE_LINE_HEIGHT_CLASS` sibling

- **Found during:** Task 1
- **Issue:** The plan's artifact list names `SOURCE_LINE_HEIGHT_PX` and the map entry but no resolved class. Without a module-scope resolution the acceptance criterion "a scratch edit removing that entry makes the module THROW at import" is unreachable — nothing would look the entry up until a component rendered.
- **Fix:** `SOURCE_LINE_HEIGHT_CLASS`, resolved at import through the same function. It is what plan 07-08's viewer scroller binds against.
- **Files modified:** `packages/frontend/src/components/table-contract.ts`
- **Commit:** `2c27850`

**Total deviations:** 4 auto-fixed (2 × Rule 2 missing-critical, 1 × Rule 3 blocking, 1 × Rule 2 missing-critical). **Impact:** none on the plan's prohibitions or must-haves; all four are refinements at the point where the plan's prose met a measured fact. No architectural change and no Rule 4 escalation.

## Authentication Gates

None.

## Known Stubs

None. Every node the plan describes renders from real data, every state has a real path into it, and no copy constant is a placeholder.

## Threat Flags

None. Every trust boundary this plan crosses was already in the plan's `<threat_model>`, and each disposition is discharged:

| Threat | Discharge |
| --- | --- |
| T-07-06 (bidi in a label) | Stripped via the engine's own constant; asserted over every label of both corpora, and the stored string still carries the override |
| T-07-36 (NUL truncating a label) | Stripped via the engine's own constant; asserted per case |
| T-07-37 (NFD/NFC and case-only duplicates) | Disambiguated BY INDEX; two nodes, never one, with no normalisation and no case folding |
| T-07-01 (the path library as the hazard) | Module-specifier set pinned as an equality; the failing path was demonstrated |
| T-07-12 (the wrong wrapper on a 4 MiB value) | Named-import set pinned to `forCellText`; the 4 MiB case runs inside the freeze budget |
| T-07-38 (untruncated label in a `title` or `data-*`) | Asserted over the whole rendered subtree, on both corpora, in the stronger cap-and-run form |
| T-07-39 (producibility confused with an analysis state) | Own map, own renderer, own marker, three-way prefix relation, nothing rendered for the common member; no analysis word appears on this surface |
| T-07-40 (an unbounded flattened list) | Bound enforced at the read and stated in words; indent capped at eight levels; a collapsed node's children are ABSENT from the list rather than hidden |
| T-07-SC (package installs) | Nothing installed. No icon package, no tree component, no highlighter. `pnpm knip` exits 0 |

## Issues Encountered

**`pnpm --filter @defminer/frontend typecheck` (vue-tsc) reports 5 PRE-EXISTING errors** in `ExportDialog.vue:232` and `SettingsPanel.vue:430,446,461,481`, both files last touched by plan 06-08. Neither is reachable from any 07-07 module. The repo gate is `pnpm typecheck` (`tsc --build`), which is green, and `vue-tsc` is not wired into any script. Recorded in `deferred-items.md` rather than fixed, under the executor's scope boundary.

## Verification

| Gate | Result |
| --- | --- |
| `pnpm exec caido-dev build packages` | Built; 81 modules, `index.js` 412.32 kB / gzip 82.27 kB |
| `pnpm test` | **84 files, 4,008 tests, all passing** (3,827 at the start of the plan) |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm knip` | exit 0 |
| Exact-set import assertions, non-vacuous | Both pass; both demonstrated failing |
| Byte-identical round trip over 23 fixtures | Passes at the function boundary and at the component boundary |
| Three RED demonstrations recorded | All three, with their messages, above |

## Requirements

**Neither `UI-05` nor `MAP-04` was ticked in `REQUIREMENTS.md`, deliberately.** Both are shared with sibling plans that have not shipped: `MAP-04` is also declared by 07-08, and `UI-05` by 07-06, 07-08, 07-09 and 07-10. `gsd-tools requirements ready-ids` returns an empty ready set for this plan, which is the correct answer — and it is the same premature-tick that had to be reverted twice earlier in this phase. `REQUIREMENTS.md` is untouched by this plan, so its machine-owned `DERIVED RESIDUAL` span is byte-unchanged.

## Next Phase Readiness

**Ready for 07-08 (the source viewer).** It inherits, already shipped and asserted:

- `forSourceLine()` and `sourceLineTruncated()` — the line the viewer renders, and the per-row truncation marker's predicate, both at the third cap.
- `SOURCE_LINE_HEIGHT_PX` and `SOURCE_LINE_HEIGHT_CLASS` — what its scroller binds `item-size` to, and the `h-6` literal the JIT can see.
- `SourceTreeNode.sourcesIndex` — what the viewer resolves content by. **Never the label.**
- `SOURCE_LINE_TAB_SPACES` — so the viewer's spec asserts the tab width by name rather than by counting spaces in a literal it wrote itself.

One thing 07-08 owes and this plan could not: `knip.json`'s `ignoreDependencies: ["@jridgewell/sourcemap-codec"]` still carries its "REMOVE THIS ENTRY WHEN 07-08's VIEWER IMPORTS THE CODEC, in the same edit" contract. It is still correct today and is still owed.

## Self-Check: PASSED

All seven created files exist on disk:

```
FOUND: packages/frontend/src/sourcemap/tree.ts
FOUND: packages/frontend/src/sourcemap/tree.spec.ts
FOUND: packages/frontend/src/components/source-producibility-presentation.ts
FOUND: packages/frontend/src/components/source-producibility-presentation.spec.ts
FOUND: packages/frontend/src/components/ProducibilityMark.vue
FOUND: packages/frontend/src/components/SourceTree.vue
FOUND: packages/frontend/src/components/SourceTree.spec.ts
```

All three task commits exist in `git log`:

```
FOUND: 2c27850  feat(07-07): add the third truncation tier and the source-line row height
FOUND: 362a4ba  feat(07-07): add the O-08 display normaliser — five pure steps, no write path
FOUND: c579f76  feat(07-07): the third presentation map, its mark, and the source tree
```

Every task's `<acceptance_criteria>` was re-run and passes. The plan-level `<verification>` was re-run at the end of the plan and is recorded in the table above.
