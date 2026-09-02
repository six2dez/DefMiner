---
phase: 07-sourcemap-reconstruction
plan: 09
subsystem: ui
tags:
  [
    vue,
    tailwind,
    vue-virtual-scroller,
    drill-down,
    accessibility,
    state-vocabularies,
    content-addressing,
  ]

requires:
  - phase: 07-sourcemap-reconstruction
    provides: "07-08's SourceViewer.vue and SourcePositionStrip.vue, mounted UNCHANGED — their four body states, two bounds and seven strip states arrive complete"
  - phase: 07-sourcemap-reconstruction
    provides: "07-07's SourceTree.vue, buildSourceTree, ProducibilityMark.vue and its data-defminer-source-producibility marker"
  - phase: 07-sourcemap-reconstruction
    provides: "07-06's listRecoveredSources / countRecoveredSources — the resolved-zero-versus-unknown distinction carried across the RPC as a plain object"
  - phase: 05-workspace-operator-workflow
    provides: "InventoryTable.vue's cell slots and column contract, EvidencePanel.vue's w-1/3 region and its subtree-absolute assertion shape, ExportDialog's NOTHING_TO_EXPORT_LABEL rule, the triage lock and the coalescer"
provides:
  - "SourceBrowser.vue — the D-21 drill-down: a STATE inside the artifacts arm, with a header that cannot trap an operator and two scrollers that are siblings"
  - "ArtifactsTable.vue's `Sources` column — the drill-down's only entry point (U7-6), with a resolved zero and an unresolved count as two different renderings"
  - "App.vue's countRecoveredSources wiring, drill-down state and enter/leave handlers — TABS and exportTable byte-unchanged"
  - "O-07 mechanism 5's replacement, requirements 1 and 2, asserted in BOTH directions over the fully rendered split body, DEMONSTRATED RED"
  - "The first build whose frontend bundle actually carries the sourcemap codec — 449.01 kB, up from 412.32 kB"
affects: [07-10-manifest-export, phase-verification]

# Actuals (#2632). PRIMARY figure is the protocol's own scale: chars/4 over the
# REALIZED DIFF: 88,504 added chars across the seven changed files, measured
# against `4c608eb` (07-08's last commit, this plan's true parent) rather than
# against `main` — a `main` baseline would have swept in every earlier phase-7
# edit to these files and inflated the figure to 88,918.
#
# The sibling summaries in this phase (07-07, 07-08) report chars/4 over the
# FULL TEXT of their changed files, which for them was ~the same number because
# every file they touched was new. It is NOT the same number here: three of this
# plan's seven files — App.vue, App.spec.ts, FindingsTable.spec.ts — are large
# shipped files this plan EDITED rather than authored, and full text over them
# measures 07-05's and 05-09's work, not this plan's. The full-text figure is
# 224,821 chars => 56,205, and it is recorded here only so the three summaries
# can still be lined up; it is not the honest cost of this plan.
actuals:
  tokens: 22126
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A drill-down as a STATE inside an existing conditional arm rather than a sixth arm: a `<template v-if>` wrapper adds a level and leaves the shipped chain, the tab list and the tab-derived export computation byte-unchanged"
    - "Two mutually exclusive `v-for`s over lists-of-at-most-one, with NO `v-else`, so the third cell state is the ABSENCE of both and there is nowhere for a later edit to put a `0` or a spinner"
    - "A separation rule asserted by WHERE two node sets MEET rather than by whether one contains the other: the nearest common ancestor of every cross-vocabulary pair must be a strict ancestor of both region roots"
    - "A one-line RED demonstration recorded beside the assertions it validates — a single `<span>Partial</span>` in the wrong region takes seven tests down across two files"

key-files:
  created:
    - packages/frontend/src/components/SourceBrowser.vue
    - packages/frontend/src/components/SourceBrowser.spec.ts
    - packages/frontend/src/components/ArtifactsTable.spec.ts
  modified:
    - packages/frontend/src/components/ArtifactsTable.vue
    - packages/frontend/src/App.vue
    - packages/frontend/src/App.spec.ts
    - packages/frontend/src/components/FindingsTable.spec.ts
    - .planning/phases/07-sourcemap-reconstruction/deferred-items.md

key-decisions:
  - "P7-D09-1 — The `Sources` cell's THIRD state is the absence of two `v-for`s, not a `v-else`. A resolved zero and an unresolved count are rendered by two independent, mutually exclusive lists-of-at-most-one, and a row in neither list produces no text and no child element. A `v-else` would be the one place a later edit could put a `0` or a spinner, which is exactly the collapse the column exists to prevent — and it is asserted on BOTH axes, because empty text alone passes against a `&nbsp;` span and no-child alone passes against a bare interpolated `0`."
  - "P7-D09-2 — Entering the drill-down SELECTS THE ROW AND OPENS THE PANEL from `App.vue`, and the cell button uses `@click.stop`. The alternative was letting the row's own click handler win a bubbling race, which produces the right result today and a different one the moment either handler moves. Doing it deliberately is also what makes the three consequences assertable rather than incidental: the parent's analysis state stays on screen, the triage lock stays engaged, and leaving returns to the same selected row."
  - "P7-D09-3 — `canExport` is a REQUIRED prop with `:can-export=\"false\"` stated at the call site, not a stub. The manifest CTA is present with its own copy in every state and DISABLED WITH ITS REASON, and each of the three reasons names the CTA first so the operator can still tell what the control is for. Plan 07-10 flips one boolean and handles one event; nothing here fabricates data or renders a placeholder."
  - "P7-D09-4 — O-07 requirement 2's non-vacuity finds a PRESENTATION-MAP LABEL rather than a badge marker node in the closest-together arrangement, and that is correct rather than a weakening. `EvidencePanel.vue` deliberately does not use `StatusBadge` — its own R2 absolute forbids any `data-*` attribute in its subtree — so in the one arrangement where both vocabularies are on screen the analysis half is rendered as WORDS. The rule names both forms, the search covers both forms, and the badge-marker half is pinned by a level-1 companion test in `App.spec.ts`."
  - "P7-D09-5 — The count map is re-read on `applyPending()` and on no other event. Refreshing it on every invalidation would change a number under a reader mid-triage — the row shift the coalescer exists to prevent, arriving through a column instead of a row. The Refresh pill is the one moment the operator has asked for new numbers."
  - "P7-D09-6 — The `Sources` cell's accessible name uses `counted`, so at one it reads *Browse 1 recovered source*. The UI-SPEC copy row's literal is `Browse {n} recovered sources`; 05-UI-SPEC.md's own zero-one-many rule, which outranks its copy table, forbids a count that does not agree with its noun. Agreement wins at one and the string is byte-identical to the copy row at every other count."

patterns-established:
  - "Region separation proved by MEETING POINT: `nearestCommonAncestor(a, b)` must be a strict ancestor of both region roots, so 'the two vocabularies share no component subtree' is a real assertion rather than the trivially-true 'two leaf nodes do not contain each other'"
  - "A spec split so the task-1 commit contains only what the tracer proves, with the task-2-only fixtures, helpers and imports arriving in the same commit as the assertions that need them"
  - "A RED demonstration performed, recorded in a comment beside the describe it validates, and reverted with `git diff` proving the component clean"

requirements-completed: []

coverage:
  - id: D1
    description: "The `Sources` column's three cell states, with a RESOLVED zero and an UNRESOLVED count as two different renderings that are never the same pixel"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ArtifactsTable.spec.ts#renders the grouped integer as a BUTTON naming the count"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ArtifactsTable.spec.ts#renders the digit in the muted tone and is NOT a button"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ArtifactsTable.spec.ts#is a DIFFERENT rendering from an unresolved count, never the same pixel"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ArtifactsTable.spec.ts#renders NOTHING for a digest the map does not carry: no text, no element"
        status: pass
    human_judgment: false
  - id: D2
    description: "UI Considerations / sources-count-column / loading — an unresolved count renders NOTHING: never a zero, never a spinner, never a skeleton"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ArtifactsTable.spec.ts#renders NOTHING while the whole map is still null"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ArtifactsTable.spec.ts#mounts no spinner, no skeleton and no progress element in the column"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#renders NO count at all while the lookup has not answered"
        status: pass
    human_judgment: false
  - id: D3
    description: "UI Considerations / sources-count-column / error — a failed count lookup renders the empty cell, DELIBERATELY indistinguishable from a still-resolving one"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ArtifactsTable.spec.ts#renders the SAME empty cell for a failed lookup as for a pending one"
        status: pass
    human_judgment: false
  - id: D4
    description: "UI Considerations / sources-count-column / overflow — a grouped integer past a million on one pre-formatted, clipped line"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ArtifactsTable.spec.ts#holds a count past a million on one pre-formatted, clipped line"
        status: pass
    human_judgment: false
  - id: D5
    description: "UI Considerations / sources-count-column / long-text — a property of the SHAPE: the cell's whole output space over any count is the grouped integer, and the digest reaches no attribute"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ArtifactsTable.spec.ts#renders a DefMiner-computed integer and nothing else — a property of the SHAPE"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ArtifactsTable.spec.ts#carries the sha256 in no attribute of the Sources cell"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/FindingsTable.spec.ts#carries EXACTLY ONE target-controlled column, rendered in monospace"
        status: pass
    human_judgment: false
  - id: D6
    description: "The tracer: two clicks from the artifacts table to one recovered file rendered through the REAL viewer, with the two scrollers as siblings"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#mounts the REAL tree and the REAL viewer, never a stub or a placeholder"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#renders the recovered file's lines when a tree node is selected"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#mounts the two scrollers as SIBLINGS — neither is a descendant of the other"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#mounts the REAL tree and viewer, reached in two clicks from the table"
        status: pass
    human_judgment: false
  - id: D7
    description: "D-21 — no sixth tab: the tab list and the tab-derived export computation are byte-unchanged and the active tab never moves"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#keeps the five-tab strip byte-identical while the drill-down is open"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#leaves the toolbar's Export CTA exactly where and what it was"
        status: pass
      - kind: other
        ref: "git diff 4c608eb..HEAD -- packages/frontend/src/App.vue — the `TABS` declaration (App.vue:100-115) and `exportTable` (App.vue:544-546) show no changed line"
        status: pass
    human_judgment: false
  - id: D8
    description: "Entering disturbs neither the artifact selection, the evidence panel nor either triage-lock early return; leaving returns to the table with the same row selected"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#does NOT close the evidence panel and does NOT clear the selection"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#returns to the artifacts table with the SAME ROW still selected"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#keeps the evidence panel mounted at its shipped width while the drill-down is open"
        status: pass
      - kind: other
        ref: "git diff --stat 4c608eb..HEAD -- packages/frontend/src/stores/ — EMPTY; neither triageLocked early return, nor any other line of the coalescer or the store, is touched"
        status: pass
    human_judgment: false
  - id: D9
    description: "Leaving: the leave action and Escape from anywhere inside, neither navigating away nor changing the active tab"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#emits leave on Escape from ANYWHERE inside the drill-down"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#leaves on Escape without changing the active tab"
        status: pass
    human_judgment: false
  - id: D10
    description: "UI Considerations / drilldown-header / loading — the header renders on ENTRY before any read, and the export action is disabled with its reason as its own text"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#carries the leave action and the digest synchronously, with no await"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#disables the export action with its reason AS ITS OWN TEXT, not a tooltip"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#mounts no spinner and no skeleton in the header"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#states the SHIPPED nothing-to-export reason once a resolved ZERO is known"
        status: pass
    human_judgment: false
  - id: D11
    description: "UI Considerations / drilldown-header / error — a failed source-list read never removes the leave action, and the failure surfaces in the tree column"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#keeps the leave action, and it still works"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#surfaces the failure in the TREE COLUMN, not in the header"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#re-reads the source list when the tree column's Retry is pressed"
        status: pass
    human_judgment: false
  - id: D12
    description: "UI Considerations / drilldown-header / overflow — h-12, no wrap, no scroll, exactly three elements at the shipped ml-4 separation"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#holds three elements at the shipped separation on one clipped line"
        status: pass
    human_judgment: false
  - id: D13
    description: "UI Considerations / drilldown-header / long-text — NO target-controlled string reaches the strip, asserted as a SET against a hostile `sources` fixture"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#renders only the hex digest and DefMiner-authored copy, asserted as a SET"
        status: pass
    human_judgment: false
  - id: D14
    description: "O-07 mechanism 5's replacement, requirement 1 — NO Phase 7 surface renders an analysis-state word, over both label sets with a non-vacuity check"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#requirement 1 — NO Phase 7 surface renders an analysis-state word"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#searches for LABEL SETS THAT ARE NOT EMPTY — the non-vacuity check"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#renders NO analysis-state word anywhere inside the drill-down"
        status: pass
    human_judgment: false
  - id: D15
    description: "O-07 mechanism 5's replacement, requirement 2 — the no-shared-subtree rule in BOTH directions over the fully rendered drill-down with the evidence panel mounted and a tombstoned source selected"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#requirement 2 — no analysis subtree contains a producibility node"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#requirement 2, THE CONVERSE — no producibility subtree contains an analysis node"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#the closest thing the two share is the PAGE SPLIT, not a component"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#renders BOTH vocabularies at once — the arrangement is real, not hypothetical"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#renders NO producibility mark anywhere at level 1 — the converse"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#puts the two vocabularies in different REGIONS, both on screen at once"
        status: pass
    human_judgment: false
  - id: D16
    description: "Plan 07-08's SourceViewer.vue and SourcePositionStrip.vue are MOUNTED, not modified"
    requirement: "UI-05"
    verification:
      - kind: other
        ref: "git diff --exit-code -- packages/frontend/src/components/SourceViewer.vue packages/frontend/src/components/SourcePositionStrip.vue — exit 0"
        status: pass
    human_judgment: false
  - id: D17
    description: "The first build whose frontend bundle actually carries the sourcemap codec — the dist gates now mean something about it"
    requirement: "MAP-07"
    verification:
      - kind: other
        ref: "pnpm exec caido-dev build packages — index.js 449.01 kB / gzip 91.88 kB, up from 412.32 kB / 82.27 kB"
        status: pass
      - kind: other
        ref: "pnpm check:externals — 1 bare specifier (vue); the codec is INLINED, measured by finding its base64 VLQ alphabet and Uint8Array(128) char table in the built bundle"
        status: pass
      - kind: other
        ref: "pnpm check:bundle — 2 specifiers (crypto, string_decoder), unchanged: D-17 keeps the codec off the backend and this plan does not put it there"
        status: pass
    human_judgment: false
  - id: D18
    description: "The drill-down's visual layout at real pixel sizes — the h-12 strip, the w-1/4 tree column and the two independent scroll geometries"
    verification: []
    human_judgment: true
    rationale: "Every geometric claim above is asserted as a CLASS SIGNATURE, which is all jsdom can carry: it has no layout engine and reports every box as 0x0, so `h-12` is asserted as a utility rather than as 48 rendered pixels. That two scrollers side by side really do scroll independently, and that a hostile `sources` label in the tree column really does not push the viewer column off screen, is a browser-driven claim. Owed by a load spec, exactly as the three Phase 5 rows, 07-07's source-tree row and 07-08's D8 before it."

duration: 25min
completed: 2026-09-02
status: complete
---

# Phase 7 Plan 09: The Artifacts-Tab Drill-Down Summary

**Recovered source is browsable two clicks from the artifacts table — through a drill-down that is a STATE inside the Artifacts tab, with the tab strip, the toolbar's export computation and the evidence panel all byte-unchanged, and with the two closed state vocabularies proven apart in the one arrangement where they are closest together.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-02T02:39Z
- **Completed:** 2026-09-02T03:04Z
- **Tasks:** 2 of 2
- **Files modified:** 8 (3 created, 5 modified)

## Accomplishments

- **The `Sources` column, and the one thing it does not collapse.** A resolved zero renders the digit in the level-4 tone and is not a button; an unresolved count renders nothing at all — no text and no child element — and a *failed* lookup renders the byte-identical empty cell, because both mean NOT KNOWN. The three states are three tests, and the difference between the second and third is asserted directly as an inequality rather than only as two separate positives.
- **The drill-down shell, as a state and not a tab.** `App.vue`'s five-entry `TABS` list and its `exportTable` computation are byte-unchanged; the drill-down joins the artifacts arm as a level, through a `<template v-if>` wrapper that leaves the five-arm chain below it untouched. The active tab never moves, which is what keeps Named Conflict 1's resolution honest without editing a single shipped export assertion.
- **Plan 07-08's two components were MOUNTED, not edited.** `git diff --exit-code` over both is green, and the tracer drives one recovered file's four lines onto the screen through the real viewer rather than a stub.
- **O-07 mechanism 5's replacement stopped being a paragraph.** Requirements 1 and 2 are asserted over the fully rendered split body with the evidence panel mounted and a tombstoned source selected — both directions, non-vacuously, and **demonstrated red**: one `<span>Partial</span>` in the drill-down header took seven tests down across two files.
- **The bundle finally carries the codec.** 07-08 recorded a byte-identical 412.32 kB because nothing reachable from `src/index.ts` imported either new SFC. This plan is what makes them reachable: **449.01 kB / gzip 91.88 kB**, and the codec's VLQ tables are measurably inside it.

## Task Commits

1. **Task 1 (TRACER): Sources column to drill-down to the real viewer on screen** — `b2c52e8` (feat)
2. **Task 2: The drill-down header's four states, and O-07's testable no-shared-subtree rule** — `b15b363` (test)
3. **Deviation 2 (Rule 2): `ArtifactsTable` reads the shared `formatTimestamp`** — `3104746` (refactor)

## Files Created/Modified

- `packages/frontend/src/components/SourceBrowser.vue` — **created.** The drill-down shell: a fixed `h-12` header (leave action, artifact digest in mono, manifest CTA), then the tree column at `w-1/4` and the viewer column at `flex-1 min-w-0` in a `gap-4` row. It owns the eager bounded read with a generation guard, the selection wiring, and Escape-to-leave. It adds no rendering rule.
- `packages/frontend/src/components/SourceBrowser.spec.ts` — **created.** 23 tests: the tracer, leaving, the header's four states, and the O-07 replacement over a split-body harness carrying the real drill-down and the real evidence panel.
- `packages/frontend/src/components/ArtifactsTable.spec.ts` — **created.** 12 tests over the `Sources` column, the file that exists because `FindingsTable.spec.ts` owns the table's *shape* and every mount there says `sourceCounts: null`.
- `packages/frontend/src/components/ArtifactsTable.vue` — the `Sources` column, the `sourceCounts` prop, the `browse-sources` emit; and the private `formatTimestamp` copy replaced by the shared export.
- `packages/frontend/src/App.vue` — `countRecoveredSources` wiring, `browsingSources` state, enter/leave handlers, and the `<template v-if>` level inside the artifacts arm. `TABS` and `exportTable` untouched.
- `packages/frontend/src/App.spec.ts` — 12 new tests, plus the Phase 7 reads driven through the literal SDK stub for the first time.
- `packages/frontend/src/components/FindingsTable.spec.ts` — the shipped column-shape assertion updated for the appended column; every mount now states `sourceCounts: null`.
- `.planning/phases/07-sourcemap-reconstruction/deferred-items.md` — the `formatTimestamp` entry updated to name what is left rather than closed wholesale.

## The three `Sources` cell states, as shipped

| Count | Rendering | Is it a button? | Asserted by |
|---|---|---|---|
| known, ≥ 1 | The grouped integer, `whitespace-pre overflow-hidden`, `aria-label` **Browse {n} recovered source(s)** | **Yes** — the only entry point into the drill-down | `#renders the grouped integer as a BUTTON naming the count`, `#emits browse-sources with the row's DIGEST, and nothing else` |
| known, 0 | The literal `0` in `text-surface-400` | **No** | `#renders the digit in the muted tone and is NOT a button` |
| NOT known | **Nothing.** `textContent === ""` **and** `childElementCount === 0` | n/a | `#renders NOTHING for a digest the map does not carry`, `#renders NOTHING while the whole map is still null` |

The third row is asserted on **both axes on purpose**: empty text alone would pass against a `<span>&nbsp;</span>`, and no-child alone would pass against a bare `0` interpolated straight into the cell. And the second and third are additionally asserted to be **different strings**, so no future edit can satisfy both positives by rendering one thing twice.

**A failed lookup is deliberately the third row and not a fourth.** `App.vue` models it as `null` — the same value as "has not answered yet" — and the spec asserts the two produce byte-identical markup with the slot's placeholder comment stripped. Both mean NOT KNOWN; the count cell is not where a read failure is reported, and that surfaces at the artifact level in the evidence panel where the analysis vocabulary lives.

## The four drill-down header states, with their copy

| State | Leave action | Digest | Export CTA text | Disabled? |
|---|---|---|---|---|
| **loading** (count not known) | **Back to artifacts** | present, mono, synchronously | **Export source manifest — counting the recovered sources** | yes |
| **known, 0 rows** | present | present | **Nothing to export — no rows match** (the shipped constant, reused not forked) | yes |
| **known, ≥ 1 row** | present | present | **Export source manifest — not available in this build** | yes (until 07-10) |
| **error** (read failed) | present **and still fires** | present | as above for the count state | — |

Three properties hold across all four, and each is its own assertion:

- **Overflow:** `h-12`, `whitespace-pre`, `overflow-hidden`, no `flex-wrap`, no `overflow-auto`/`overflow-y`, and **exactly three direct children** at `ml-4` separation.
- **Long-text:** the strip's entire text, collected as a **set of text nodes** against a fixture carrying a hostile `sources` label (`../../` × 40, an RTL override, a `<script>` tag), equals `{the 64-hex digest, "Back to artifacts", the export label}`. It is closed by construction, not by discipline — there is no field on this strip a later edit could interpolate a target-controlled string into.
- **Error:** the header is never partially removed. The failure surfaces in the **tree column** (`Could not load the recovered sources for this bundle.` with **Retry** and **Open Health**), and the header's own text is asserted *not* to contain it. An operator who cannot leave a failed drill-down is trapped in it.

## O-07 mechanism 5's replacement — the assertion output, both directions

**The arrangement:** the real `SourceBrowser` in the left region and the real `EvidencePanel` at `w-1/3 shrink-0` in the right one, with the parent artifact's analysis at `partial` and a **tombstoned** (`gone`) source selected in the tree. This is the state that would fail if the separation were only editorial.

**Non-vacuity, three ways, all green:**

| Check | Result |
|---|---|
| `ANALYSIS_LABELS.length > 0` (both shipped presentation maps) | 9 labels — Queued · Analysing · Complete · Partial · Failed · Scanning · Suspended · Finished · Discarded |
| `PRODUCIBILITY_LABELS.length > 0` | 2 labels — Gone · Changed (the common member's is `null`, which is requirement 4) |
| the two sets are disjoint (mechanism 3) | no producibility word appears in the analysis set |
| `analysisNodes(root).length > 0` in the arrangement | > 0 — the analysis vocabulary is genuinely on screen |
| `producibilityNodes(root).length > 0` in the arrangement | > 0 — the producibility vocabulary is genuinely on screen |

**Direction A — no analysis subtree contains a producibility node:** `offenders` = `[]`. And at region level, `#defminer-evidence-panel` carries **≥ 1 analysis node and 0 producibility marks**.

**Direction B, the converse — no producibility subtree contains an analysis node:** `offenders` = `[]`. And at region level, `[data-defminer-source-browser]` carries **≥ 1 producibility mark and 0 analysis nodes**, with every one of the 9 analysis labels asserted absent from its rendered text.

**The sharper form, because two disjoint leaf nodes trivially do not contain each other:** for **every** (analysis node, producibility node) pair, `nearestCommonAncestor` is a **strict ancestor of both region roots** — never the drill-down, never the panel. The closest thing the two vocabularies share is the page split, not a component.

**Demonstrated RED before asserted green.** One `<span class="ml-4">Partial</span>` added to the drill-down header — a single analysis-state word in the region that must carry none — produced:

```
FAIL App.spec.ts > renders NO analysis-state word anywhere inside the drill-down
FAIL App.spec.ts > puts the two vocabularies in different REGIONS, both on screen at once
FAIL SourceBrowser.spec.ts > holds three elements at the shipped separation on one clipped line
FAIL SourceBrowser.spec.ts > renders only the hex digest and DefMiner-authored copy, asserted as a SET
FAIL SourceBrowser.spec.ts > requirement 1 — NO Phase 7 surface renders an analysis-state word
FAIL SourceBrowser.spec.ts > requirement 2, THE CONVERSE — no producibility subtree contains an analysis node
FAIL SourceBrowser.spec.ts > the closest thing the two share is the PAGE SPLIT, not a component
Tests  7 failed | 84 passed (91)
```

The edit was reverted and `git diff` over the component is clean. The demonstration is recorded in a comment above the describe it validates.

**Requirement 3 is NOT restated here** — the sentence-rather-than-badge rule is a property of the viewer body and is asserted in 07-08. **Requirement 4** follows from 07-07's presentation map, which renders no element for the producible state. No requirement is asserted twice and none is unowned.

## Named Conflict 1, stated in this plan's own words

**The toolbar's `Export inventory` CTA cannot address the drill-down, and this plan diverges from "one export CTA, in the toolbar" deliberately rather than smuggling it.**

`exportTable` is computed from `activeTab` (`App.vue:544-546`), and the drill-down is a **state**, not a tab — `activeTab` is still `artifacts` for its whole life. So the toolbar CTA would export the **artifacts inventory** from a screen showing recovered sources. Making it address the manifest would mean deriving the export table from something other than the active tab: a change to shipped, asserted behaviour, on the one control whose entire ceremony exists so the operator knows exactly what leaves the tool.

**The resolution taken:** the manifest gets its **own scoped CTA — `Export source manifest` — in the drill-down header**, and the toolbar CTA, `exportTable` and every shipped export assertion are byte-unchanged. There is still one export **mechanism**, one redaction ceremony and one `danger` confirmation; there are now two places to start it, and each names what it will export. The spirit of the Phase 5 rule — the operator always knows exactly which rows are leaving and in what form — is strengthened by this, not weakened.

**Asserted, not merely argued.** `App.spec.ts#leaves the toolbar's Export CTA exactly where and what it was` captures the whole toolbar's text before entering the drill-down and asserts it byte-identical after, and asserts it still contains `EXPORT_CTA`. The `TABS` declaration (`App.vue:100-115`) and the `exportTable` computation (`App.vue:544-546`) show no changed line in `git diff 4c608eb..HEAD`; the only diff hunks mentioning either name are new *comments* that cite them.

## The bundle, and the gates that now mean something

07-08 reported `412.32 kB / gzip 82.27 kB` **byte-identical to 07-07's figure**, because nothing reachable from `src/index.ts` imported `SourceViewer.vue`, so Rollup tree-shook both SFCs and the codec out entirely. It named this plan as the one whose build would first carry them. It does:

| | Before (07-08) | After (07-09) | Δ |
|---|---|---|---|
| `dist/index.js` | 412.32 kB | **449.01 kB** | **+36.69 kB** |
| gzip | 82.27 kB | **91.88 kB** | **+9.61 kB** |
| `dist/index.css` | 12.81 kB | 12.90 kB | +0.09 kB |
| modules transformed | — | 95 | — |

**`check:externals` and `check:bundle` are satisfied deliberately, and here is what each one measures.**

- **`check:externals`** targets the **frontend** dist and reports **1 bare specifier: `vue`** — unchanged. That is the *correct* answer rather than a stale one: the gate's rule is that every bare specifier the bundle *does* import must be declared external, and `@jridgewell/sourcemap-codec` is **not** on the permitted-external list, so it must be **inlined** — and an inlined dependency emits no specifier at all. To keep that from being an assumption, the codec's presence was **measured** in the built artifact rather than inferred from the size delta: the bundle at offset ≈ 293 kB contains the codec's base64 VLQ alphabet and its `new Uint8Array(64)` / `new Uint8Array(128)` char tables, minified, immediately after the `sourceDownloadName` region. The codec is genuinely in the shipped bytes.
- **`check:bundle`** targets the **backend** dist and reports **2 specifiers: `crypto`, `string_decoder`** — both on the DIST-05 allowlist, unchanged. That is also correct rather than accidental: D-17 bans the codec on the backend package, and this plan does not put it there. The allowlist was **not edited**, which is what that script's own remedy line demands.
- **`check:css`** reports 144 rules checked against `#plugin--defminer`, up from 142 — the drill-down's new utilities, all prefixed.

## Decisions Made

See the six `key-decisions` in the frontmatter. The two most load-bearing:

**P7-D09-1 — the third cell state is an ABSENCE, not a branch.** The `Sources` cell has two mutually exclusive `v-for`s over lists-of-at-most-one and **no `v-else`**. A row whose count is unknown is in neither list, so it produces no text and no element. A `v-else` would have been the one place a later edit could put a `0` or a spinner — which is exactly the collapse the column exists to prevent, and which the UI contract's `zero-one-many` row predicts a single renderer will perform.

**P7-D09-4 — requirement 2's non-vacuity finds a label string rather than a badge marker in the closest-together arrangement, and that is right.** The plan's acceptance criterion asks for "at least one status-badge marker node". In the drill-down, level 1's `ArtifactsTable` is not mounted, and `EvidencePanel.vue` **deliberately does not use `StatusBadge`** — its own R2 absolute forbids any `data-*` attribute in its subtree, which is precisely why `scan-state-presentation.ts` was extracted in plan 05-10. So in the one arrangement where both vocabularies are on screen, the analysis half is rendered as **words**. The rule as written in 07-UI-SPEC.md names both forms ("a `data-defminer-status-badge` node, **or any string from** `SCAN_STATE_PRESENTATION` / `SCAN_LIFECYCLE_PRESENTATION`"), the search implemented here covers **both** forms in **both** directions, and the badge-marker half is pinned by a level-1 companion test in `App.spec.ts` (`#renders NO producibility mark anywhere at level 1 — the converse`) which asserts the badges present before asserting the marks absent. The assertion is therefore strictly stronger than the badge-node-only reading, not weaker — but the divergence from the criterion's literal wording is recorded here rather than left for a verifier to discover.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — blocking] `FindingsTable.spec.ts`'s shipped column-shape assertion had to move**

- **Found during:** Task 1
- **Issue:** `ArtifactsTable`'s spec lives in `FindingsTable.spec.ts`, which asserts `headers.slice(4)).toEqual(["Bytes", "Kind"])`. Appending the `Sources` column turned that red immediately — a correct failure of a correct assertion, and the reason the assertion exists.
- **Fix:** The expectation was widened to `["Bytes", "Kind", "Sources"]` with a note that the column is **appended**, so no shipped column moved under the operator; and `mountArtifacts` now states `sourceCounts: null` at the call site, exactly as it already states `analyses`. The file is outside this plan's `files_modified`, but a plan that adds a column and leaves the column-shape gate red has not added the column.
- **Files modified:** `packages/frontend/src/components/FindingsTable.spec.ts`
- **Commit:** `b2c52e8`

**2. [Rule 2 — missing critical] `ArtifactsTable` now reads the shared `formatTimestamp`**

- **Found during:** Task 2 (plan-end ledger review)
- **Issue:** Plan 07-08 exported `formatTimestamp` from `components/table-contract.ts` rather than write a third private copy, and recorded the two pre-existing ones in `deferred-items.md` with a **suggested owner: any plan that already touches either table**. This plan touches `ArtifactsTable.vue`. Three copies of a date format is how one of them comes to disagree with the other two about a timezone, and a timezone is a thing a reader would never notice had drifted.
- **Fix:** The private copy was deleted and the exported one imported. The two implementations were **byte-identical**, so this is a deletion and an import rather than a behaviour change, and `FindingsTable.spec.ts`'s `Last seen` assertions cover the result. `ObservationsTable.vue`'s copy **remains** — that file is outside this plan's scope and is not reachable from any 07-09 module — and the ledger entry was updated to name what is left rather than being closed wholesale. Two copies, down from three.
- **Files modified:** `packages/frontend/src/components/ArtifactsTable.vue`, `.planning/phases/07-sourcemap-reconstruction/deferred-items.md`
- **Commit:** `3104746`

**3. [Rule 2 — missing critical] The cell's accessible name agrees with its noun at one**

- **Found during:** Task 1
- **Issue:** The UI-SPEC copy row is `Browse {n} recovered sources`, which at n = 1 reads *"Browse 1 recovered sources"*. 05-UI-SPEC.md § "Copywriting Contract"'s own `zero-one-many` rule — which outranks its copy table — forbids a count that does not agree with its noun and bans the parenthesised suffix outright. The accessible name is the only place this count is spelled out in words, so it is the only place it can be got wrong.
- **Fix:** `counted(count, "recovered source", "recovered sources")`, the shipped helper. At one it reads *Browse 1 recovered source*; at every other count the string is byte-identical to the copy row. Asserted directly, including a negative assertion that the plural does not appear at n = 1.
- **Files modified:** `packages/frontend/src/components/ArtifactsTable.vue`, `packages/frontend/src/components/ArtifactsTable.spec.ts`
- **Commit:** `b2c52e8`

**4. [Rule 2 — missing critical] A generation guard on the eager read**

- **Found during:** Task 1
- **Issue:** The plan specifies an eager paged read to the bound. It does not say what happens when the operator leaves a slow drill-down and re-enters against a different artifact: the first read's pages resolve afterwards and are written into the second one's list, showing one bundle's sources under another bundle's digest.
- **Fix:** The shipped generation-guard shape — a counter bumped on every (re)load and checked after each await. A stale page returns without writing. `watch(..., { immediate: true })` on `[projectId, artifactSha256]` makes a new artifact a new read with a cleared selection.
- **Files modified:** `packages/frontend/src/components/SourceBrowser.vue`
- **Commit:** `b2c52e8`

**Total deviations:** 4 auto-fixed (3 × Rule 2 missing-critical, 1 × Rule 3 blocking). **Impact:** none on the plan's prohibitions or must-haves. No architectural change and no Rule 4 escalation.

## Planner assumptions carried forward

- **U7-6 (the `Sources` column as the drill-down's only entry point)** ships binding and is **structurally** true, not merely observed: `browsingSources` is written by exactly one function, `enterSourceBrowser`, which has exactly one caller — the `browse-sources` handler on `ArtifactsTable`. There is no keyboard shortcut, no route and no second control that opens the drill-down.
- **U7-3 (the export dialog's heading naming what the CTA named)** is owed by plan 07-10. Here the CTA is present and disabled with its reason in every state.
- **U7-1's 2,000-row bound** is echoed by the backend on the answer and read from there by the tree's sentence; this plan holds no copy of the number.

## Known Stubs

**One declared wiring gap, and it is a prop rather than a placeholder.**

| Item | File | Why it is not a stub | Owner |
|---|---|---|---|
| The manifest export CTA is present but cannot run | `SourceBrowser.vue` — the `canExport` prop, `false` at `App.vue`'s call site | The control renders a **real, correct disabled state with a real reason** in all three count states, and each reason names the CTA first so the operator can still tell what the control is for. No data is fabricated and nothing renders a placeholder. Plan 07-10 flips one boolean and handles the `export-manifest` event this component already emits. | **07-10** |

The transitional copy constant `Export source manifest — not available in this build` exists only for the window between this plan and 07-10 and should be **deleted, not repurposed**, when that plan lands.

**No other stubs.** Every cell state, every header state and every drill-down state renders from real data through real props against real result arms, and the tracer mounts plan 07-08's components for real rather than against a stub.

## Threat Flags

None. Every trust boundary this plan crosses was already in its `<threat_model>`, and each disposition is discharged:

| Threat | Discharge |
| --- | --- |
| T-07-39 (producibility read as an analysis state) | O-07 mechanism 5's replacement, requirements 1 and 2, asserted in **both** directions over the fully rendered drill-down in the closest-together arrangement, with three non-vacuity checks and a RED demonstration |
| T-07-43 (a resolved zero and an unknown count rendered identically) | Three cell states asserted separately **and as an inequality**; the unresolved cell asserted on both axes (no text AND no child element); the failed lookup deliberately byte-identical to the pending one, with the read failure surfacing at the artifact level instead |
| T-07-50 (an operator trapped in a failed drill-down) | The leave action and the whole header asserted to survive a failed source-list read and asserted to still fire; Escape asserted from a **deep descendant** rather than the root; the failure asserted to render in the tree column and asserted absent from the header |
| T-07-51 (the drill-down disturbing the parent's analysis state) | Entering asserted not to clear the selection, not to unmount the panel; `git diff --stat 4c608eb..HEAD -- src/stores/` is **empty**, so neither `triageLocked` early return is touched; the tab-list declaration and the export computation asserted byte-unchanged both by test and by `git diff` |
| T-07-SC (package installs) | **Nothing installed.** `pnpm knip`, `pnpm check:bundle` and `pnpm check:externals` all exit 0 |

## Issues Encountered

**`Element` is an error type in the lint program, and it changes how a spec may be written.** `tsconfig.eslint.json` extends `tsconfig.base.json`, which carries no `dom` lib — only `packages/frontend/tsconfig.json` adds it. So under typed lint every DOM type degrades to `any`, and two rules fire on shapes that are perfectly ordinary under `tsc`: `no-redundant-type-constituents` on `Element | null`, and `strict-boolean-expressions` on `!element.hasAttribute(...)`. Both were resolved without weakening anything — the ancestor walk keeps its annotation off the loop variable, and the two conditionals became explicit comparisons. Worth recording because the next spec to reach for a DOM ancestor walk will hit it too. `pnpm typecheck` was green throughout; this is a lint-program artefact, not a type error.

**`grep` treats `SourceBrowser.spec.ts` as binary.** The header's long-text fixture carries a real RTL override (U+202E), so plain `grep` silently prints nothing over that file. `grep -a` is required. This is the fixture doing its job in a place nobody expected.

**`pnpm --filter @defminer/frontend typecheck` (vue-tsc) still reports the 5 PRE-EXISTING errors** in `ExportDialog.vue` and `SettingsPanel.vue` that 07-07 and 07-08 both recorded. This plan adds none — its three new modules are clean — and the repo gate is `pnpm typecheck` (`tsc --build`), which is green. Unchanged in `deferred-items.md`.

## Verification

| Gate | Result |
| --- | --- |
| `pnpm exec caido-dev build packages` | Built; `index.js` **449.01 kB / gzip 91.88 kB**, `index.css` 12.90 kB, 95 modules |
| `pnpm test` | **89 files, 4,109 tests, all passing** (87 files / 4,061 at the start of the plan) |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm knip` | exit 0 |
| `pnpm check:bundle` | 2 specifiers — `crypto`, `string_decoder` — both on the DIST-05 allowlist, unchanged; allowlist NOT edited |
| `pnpm check:externals` | 1 bare specifier, `vue`; the codec is inlined and measured present in the artifact |
| `pnpm check:css` | 144 rules checked against `#plugin--defminer` (142 before) |
| `git diff --exit-code -- SourceViewer.vue SourcePositionStrip.vue` | **exit 0** — plan 07-08's components were mounted, not edited |
| `TABS` and `exportTable` byte-unchanged | Yes — no changed line in `git diff 4c608eb..HEAD -- App.vue` at either site, and asserted by test |
| All 9 of this plan's `## UI Considerations` rows have an assertion | Yes — coverage block D1–D5 (`sources-count-column`) and D10–D13 (`drilldown-header`) |
| O-07 requirement 2, both directions, non-vacuous | Yes, and demonstrated RED — 7 failures across 2 files from one misplaced word |

**+48 tests** (4,061 → 4,109): 23 in `SourceBrowser.spec.ts`, 12 in `ArtifactsTable.spec.ts`, 12 in `App.spec.ts`, and 1 arriving without being written — `frontend-safety.spec.ts`'s `it.each(files)` enumerates the frontend source tree, so `SourceBrowser.vue` was picked up by the shipped per-file R1/R2 gate automatically and passes it.

## Requirements

**Neither `UI-05` nor `MAP-07` is ticked, and that is the correct answer on both counts.**

`gsd-tools requirements ready-ids` returns `{ ready: [], blocked: [UI-05, MAP-07] }` for this plan:

- **UI-05** is declared by 07-06, 07-07, 07-08, 07-09 and **07-10**. The reading surface (07-08) and the navigation surface (this plan) have shipped; the manifest CTA has not.
- **MAP-07** — *"Reconstructed source is browsable in the plugin UI and exportable with a manifest"* — is declared by 07-04, 07-06, 07-09 and **07-10**. This plan closes the **browsable** half outright. The **exportable-with-a-manifest** half is 07-10's, and a requirement whose own sentence names two halves must not be ticked on one of them.

`.planning/REQUIREMENTS.md` is **not edited by this plan**, so its machine-owned `BEGIN DERIVED RESIDUAL` / `END DERIVED RESIDUAL` span is byte-unchanged by construction — the failure mode that bit this phase three times cannot occur here. This is the same restraint 07-06, 07-07 and 07-08 showed, and exactly what the two premature ticks earlier in this phase had to be reverted for.

## Next Phase Readiness

**Ready for 07-10 (the manifest export).** It inherits, shipped and asserted:

- `SourceBrowser.vue` with a `canExport: boolean` prop and an `export-manifest` event already emitted from a real, already-tested button. **Flipping `:can-export="false"` to a real capability at `App.vue`'s call site and handling the event is the whole wiring.**
- The transitional label `Export source manifest — not available in this build`, which should be **deleted** rather than repurposed. The other two disabled reasons — the counting one and the shipped `NOTHING_TO_EXPORT_LABEL` — are permanent and their tests stay.
- `rowCount`, already computed and already the thing the button's disabled state is derived from, so the dialog's `reachableCount` has a source that agrees with the CTA that opened it.
- **U7-3 is 07-10's to close:** the dialog's heading must name what the CTA named. A dialog headed *Export inventory* opened from *Export source manifest* is a small lie about what will leave the tool, and `EXPORT_DIALOG_HEADING` is currently a single shipped constant.

Two things this plan could not do:

1. **The browser-driven layout claims.** Every geometric assertion here is a class signature, which is all jsdom can carry. That two scrollers side by side scroll independently, and that a 4 KB `sources` label in the `w-1/4` tree column does not push the viewer column off screen, is owed by a load spec — the same debt the three Phase 5 rows, 07-07's source-tree row and 07-08's D8 already carry. Recorded as D18 with `human_judgment: true`.
2. **Ticking either requirement.** Both wait on 07-10.

## Self-Check: PASSED

All three created files exist on disk:

```
FOUND: packages/frontend/src/components/SourceBrowser.vue
FOUND: packages/frontend/src/components/SourceBrowser.spec.ts
FOUND: packages/frontend/src/components/ArtifactsTable.spec.ts
```

All three commits exist in `git log`:

```
FOUND: b2c52e8  feat(07-09): the Sources column, the drill-down shell, and one file on screen
FOUND: b15b363  test(07-09): the drill-down header's four states, and O-07's rule in both directions
FOUND: 3104746  refactor(07-09): ArtifactsTable reads the shared formatTimestamp
```
