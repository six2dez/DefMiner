---
phase: 07-sourcemap-reconstruction
plan: 17
subsystem: ui
tags: [vue, sourcemap, display-normaliser, sanitisation, unicode, tree]

# Dependency graph
requires:
  - phase: 07-sourcemap-reconstruction
    provides: "07-07's O-08 display normaliser (tree.ts), the 23-entry hostile label corpus in map-fixture.ts, and forCellText's 256-grapheme cell cap"
provides:
  - "The display tree merges interior directories on the BYTE-IDENTICAL RAW SEGMENT, not on the post-forCellText label"
  - "Building.mergeKey — an internal identity field carrying the raw segment, deliberately absent from the frozen SourceTreeNode"
  - "The duplicate marker's basis decided and stated: it stays on the DISPLAY label, because it is a claim about the screen and not about identity"
  - "A measured before/after equality over the whole 23-label corpus: 47 nodes over 21 roots, unchanged"
  - "The node-count-versus-row-count relationship measured rather than assumed, correcting the review's stated per-row bound"
affects: [source-tree rendering, sourcemap drill-down, any later change to a merge or a de-duplication in the frontend]

actuals:
  tokens: 18427
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A display value is never an identity: what has been through a sanitiser or a cap answers 'what does the operator see?', never 'is this the same thing?'"
    - "A raw value and its display form travel as ONE object, never as two arrays paired by index"
    - "Corpus expectations are explicit ASCII-escaped lines, never an opaque snapshot file"

key-files:
  created: []
  modified:
    - packages/frontend/src/sourcemap/tree.ts
    - packages/frontend/src/sourcemap/tree.spec.ts

key-decisions:
  - "The interior-directory merge keys on Building.mergeKey — the raw segment as resolveClimbs produced it — and not on the forCellText label. MD-02 was a display value used as an identity."
  - "The duplicate marker STAYS on the display label. Its job is to warn that two rendered rows look identical, which is exactly what MD-02's two directories now do; moving it to the merge key would leave that pair unmarked."
  - "mergeKey is internal to one build and is deliberately NOT a field of the frozen SourceTreeNode, so an unsanitised target-controlled string cannot reach a title or a data-* attribute."
  - "The raw and display values travel as one object rather than as two index-paired arrays — a pair that cannot be indexed apart cannot be indexed apart wrongly, next to a bug about comparing the wrong one of two values."
  - "The review's 'at most one directory node per row' understates the increase. The bound that holds is the fully-unmerged ceiling, a function of the rows, which this change did not move."

patterns-established:
  - "Merge-key discipline: byte identity, nothing weaker (no truncation, no sanitisation) and nothing stronger (no case folding, no Unicode normalisation), pinned from BOTH sides by tests."
  - "Before/after structural equality is MEASURED by loading the pre-fix module beside the post-fix one in a single process, then baking the measured outline into the spec as explicit expectations."
  - "Non-ASCII in test fixtures is always written as an escape sequence, never as a literal byte."

requirements-completed: [UI-05, MAP-04]

coverage:
  - id: D1
    description: "Two directory segments differing only past the 256-grapheme display cap produce TWO directory nodes, each with one child — the review's executed reproduction, closed."
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#MD-02 — a directory merges on the VERBATIM segment > keeps two directories differing only PAST the cap as TWO nodes"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#MD-02 — a directory merges on the VERBATIM segment > keeps two directories differing only in a STRIPPED codepoint as TWO nodes"
        status: pass
    human_judgment: false
  - id: D2
    description: "The merge is byte identity and nothing else — it still merges identical segments, and it does not fold case or normalise Unicode, pinned at interior depth from both sides."
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#MD-02 — a directory merges on the VERBATIM segment > STILL merges two byte-identical long segments into ONE node"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#MD-02 — a directory merges on the VERBATIM segment > does not strengthen the merge into a CASE-FOLDING one, at interior depth"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#MD-02 — a directory merges on the VERBATIM segment > does not strengthen the merge into a NORMALISING one, at interior depth"
        status: pass
    human_judgment: false
  - id: D3
    description: "Nothing that reaches the DOM changed: every rendered label is still forCellText's output with its label-truncated note, and no field the frozen node exposes carries a raw segment (T-07-73)."
    requirement: "MAP-04"
    verification:
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#MD-02 — a directory merges on the VERBATIM segment > still renders the SANITISED, TRUNCATED label on both of them"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#the hostile corpus builds the tree it built before the merge changed > puts no RAW segment into any field the node EXPOSES"
        status: pass
      - kind: integration
        ref: "packages/frontend/src/safety/hostile.spec.ts (byte-unchanged; git diff --stat prints nothing)"
        status: pass
    human_judgment: false
  - id: D4
    description: "All 23 hostile corpus labels build the tree they built before the change: 47 nodes over 21 roots, outline equal line for line, with the exhaustiveness gate over both the id set and the index set."
    requirement: "MAP-04"
    verification:
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#the hostile corpus builds the tree it built before the merge changed > produces the recorded structure, node for node"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#the hostile corpus builds the tree it built before the merge changed > covers every corpus case — a dropped case cannot buy the equality"
        status: pass
    human_judgment: false
  - id: D5
    description: "The node-count consequence of the finer merge is measured and bounded: the tree never exceeds the fully-unmerged ceiling the rows already set, and SOURCE_TREE_LOAD_MAX bounds rows rather than nodes (T-07-74, accepted)."
    verification:
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#more nodes for the same rows — the bound is on the ROWS > never exceeds the ceiling the rows already set, and never loses a row"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/sourcemap/tree.spec.ts#more nodes for the same rows — the bound is on the ROWS > adds FOUR to the deep pair — which is why the per-row claim understates"
        status: pass
    human_judgment: false

# Metrics
duration: 14 min
completed: 2026-09-02
status: complete
---

# Phase 07 Plan 17: The Directory Merge Keys on the Verbatim Segment Summary

**`tree.ts`'s interior-directory merge now compares the raw `resolveClimbs` segment instead of the truncated `forCellText` label, so two directory names differing only past character 256 stay two nodes — closing MD-02 without moving one byte of what reaches the DOM.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-02T10:45:54Z
- **Completed:** 2026-09-02T10:59:55Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments

- **MD-02 closed.** `Building` gained `mergeKey` — the raw segment as `resolveClimbs` produced it — and the interior-directory `siblings.find` compares it (`tree.ts:563-565`). The review's executed reproduction now produces two directory nodes where it produced one.
- **The display side is byte-unchanged.** `label` is still `displaySegment`'s sanitised, truncated output with its `truncated` flag. The reproduction's labels are asserted equal to `forCellText`'s output **by calling `forCellText`**, so a change to what reaches the DOM fails in the spec rather than in review.
- **The merge is pinned as byte identity from both sides.** It still merges identical segments (long and short); it does not fold case and does not normalise Unicode, asserted at interior depth as well as at the existing root level.
- **A second spelling of the same leak was found and closed with it.** Truncation is not the only way `forCellText` makes two distinct segments render alike: a stripped C0 control does too. `src/lib\u0000/a.js` beside `src/lib/b.js` merged pre-fix and does not now.
- **The 23-label corpus is proven unmoved by measurement, not by assertion.** The pre-fix module and the post-fix module were loaded side by side in one process and driven over the corpus: 47 nodes over 21 roots both times, outlines equal line for line. That measured outline is now baked into the spec as 47 explicit, ASCII-escaped expectation lines.
- **The node-count consequence is measured, and it corrects the review.** The tree never exceeds the fully-unmerged ceiling the rows already set; `SOURCE_TREE_LOAD_MAX` bounds rows, not nodes; and the "at most one directory node per row" figure understates the real increase.

## Task Commits

1. **Task 1 (tracer, TDD RED): failing MD-02 cases** — `f3ae301` (test)
2. **Task 1 (tracer, TDD GREEN): key the merge on the verbatim segment** — `995b0a8` (fix)
3. **Task 2: pin the 23-label corpus structure, measured before and after** — `afc9bfd` (test)
4. **Task 3: measure what the finer merge costs in nodes, and what bounds it** — `e4cff68` (test)

**Plan metadata:** see the `docs(07-17)` commit that carries this file.

_Task 1 is a `tracer` with `tdd="true"`, so it produced two commits. The GREEN commit is spelled `fix` rather than `feat` because MD-02 is a defect, not a feature; `workflow.tdd_mode` is `false`, so no plan-level gate sequence is enforced._

## Files Created/Modified

- `packages/frontend/src/sourcemap/tree.ts` — `Building.mergeKey` added; the interior-directory merge compares it; the raw and display values now travel as one object; the module header and the step-5 header record MD-02 and the shape of the leak; the `duplicate` marker's basis is stated at `freezeNode`.
- `packages/frontend/src/sourcemap/tree.spec.ts` — three new describe blocks (MD-02 reproduction and byte-identity pinning; the corpus equality with its exhaustiveness gate and the raw-segment leak assertion; the node-count bound). Frontend suite 863 → 880 tests.

## Decisions Made

### 1. The merge key is the raw segment; the label is carried beside it

`resolved.segments` already held the raw segments beside the display array, so the fix costs one field and no extra walk. The raw and display values now travel as **one object** (`{ raw, label, truncated }`) rather than as two arrays paired by index — a pair that cannot be indexed apart cannot be indexed apart *wrongly*, which felt like the wrong risk to introduce immediately next to a bug about comparing the wrong one of two values.

### 2. The `duplicate` marker stays on the DISPLAY label

**This was the plan's explicitly-required decision, and the answer is: display label, unchanged.** Stated in the code at `freezeNode` (`tree.ts:459-467`) and asserted by a test.

The marker's job is to warn the operator that **two rendered rows look identical**, so the index shown beside them is the only thing telling them apart. That is precisely the situation MD-02's two directories are now in: two distinct names, both cut at the same cap, rendering as the same 256 characters. Counting `mergeKey` here would leave that pair **unmarked**, and the operator would read two identical rows as the renderer having drawn one directory twice — a worse failure than the one being fixed, and in the same direction.

The plan framed the alternatives exactly right: *"A marker that warns 'these two look the same on screen' is defensible; one that claims 'these two ARE the same' is not."* The existing field doc already says "`true` when a SIBLING carries a byte-identical **label**", so this is a confirmation of the shipped semantics rather than a change to them. The root-level duplicate computation (`buildSourceTree`, over `node.label`) is left on the same basis for the same reason.

### 3. `mergeKey` is internal and never rendered

It is a field of `Building`, not of the frozen `SourceTreeNode`. T-07-73's mitigation is the assertion that no field the frozen node **exposes** equals a raw segment whose display form differs — and the exposed set is *discovered* from the node via `Object.entries` rather than listed, so a field added to `SourceTreeNode` later is checked without anyone remembering to add it here.

### 4. Explicit ASCII-escaped expectations, never a snapshot

A `toMatchSnapshot()` over the corpus would absorb, on its first run after a regression, exactly the change the assertion exists to detect. Every one of the 47 lines is readable and every non-ASCII codepoint is escaped to `\uXXXX`, so a reviewer can see a combining acute and a fullwidth full stop instead of taking them on trust.

## Required Findings

### The root-merge confirmation, with line numbers

**The ROOT merge already keyed on the raw value and never had MD-02.** Confirmed by reading, not assumed:

- `tree.ts:526` — `const existing = rootByLabel.get(rootLabel);` looks up with `classify`'s **raw** `rootLabel`.
- `tree.ts:539` — `rootByLabel.set(rootLabel, created);` stores under the same raw key.
- `tree.ts:531` — `label: forCellText(rootLabel),` is the **only** place `forCellText` touches a root, and it runs when the node is *built*, after the key has been used.

So no fix was needed there. It is now **pinned** by `leaves the ROOT merge alone — it already keyed on the raw label`, so a later edit cannot quietly introduce here what this plan removed from the interior merge. `created.mergeKey` is set to the raw `rootLabel` for consistency of the type.

### The pre-fix reproduction output, as executed

Driven over the shipped module before any change, with `"A".repeat(300) + "bank/secret.js"` and `"A".repeat(300) + "evil/x.js"`:

```
MD02_ROOTS=1
MD02_SHAPE=[{"kind":"directory","labelLen":256,"notes":["label-truncated"],
             "duplicate":false,
             "kids":[{"kind":"source","label":"secret.js","duplicate":false},
                     {"kind":"source","label":"x.js","duplicate":false}]}]
```

Byte-for-byte the structure the review reported: **one** root directory of label length 256, with `secret.js` and `x.js` as its two children — the tree telling the operator they are siblings in one directory. The RED test run confirmed it: **4 failed | 57 passed**, with `expected 1 to be 2` on the root count.

Post-fix the same input produces two directory nodes, each with one child, each still labelled with 256 characters and still carrying `label-truncated`, and **both now marked `duplicate`** — which is decision 2 doing its job.

### The corpus node counts, before and after

Measured in a single process with the pre-fix module (`git show f3ae301:…/tree.ts`) loaded beside the post-fix one:

| | Nodes | Roots |
|---|---|---|
| Before | 47 | 21 |
| After | **47** | **21** |

The two outlines were compared line for line and were equal. No corpus case moved. That is expected and is worth saying why: no two corpus segments differ *only* past the cap or *only* in a stripped codepoint, so the finer merge has nothing to un-merge there. The permission to grow and the absence of growth are two separate facts, and the spec asserts both.

### Node count versus row count — and a correction to the review

**`SOURCE_TREE_LOAD_MAX` bounds ROWS, not nodes.** Read at `packages/engine/src/contract.ts:317`, with the subject stated in its own docblock at `:295-316`: *"the backend enforces it — `listRecoveredSources` stops filling at this number"*, and *"the read answers with the TOTAL beside the returned count."* Nothing in it constrains the node count.

**The scroller is node-count-agnostic.** `SourceTree.vue:236-238` builds `scrollerItems` as a plain map over `visibleRows`, and `:405-412` hands `RecycleScroller` a **fixed** `:item-size="TABLE_ROW_HEIGHT_PX"` with `key-field="key"`. Geometry is therefore item count times a constant; a longer list costs a longer scrollbar, not a different layout. This is the two-line answer that stops the next reader re-deriving it.

**The review's stated bound is wrong, and understates.** `07-REVIEW.md` / this plan's threat row T-07-74 say un-merging can add *"at most one directory node per row"*. Measured:

| Rows | Pre-fix nodes | Post-fix nodes | Added | Added per row |
|---|---|---|---|---|
| The reproduction (2 rows, 1 interior segment) | 3 | 4 | 1 | 0.5 |
| The same pair with 3 shared segments below the divergence | 6 | 10 | 4 | **2.0** |

**Every** interior directory of a row can newly fail to merge, not only the first, so the per-row increase is bounded by the row's own interior-segment count and not by 1. The bound that *does* hold — and which is now asserted — is the **fully-unmerged ceiling**: at most one synthetic root, one directory per interior segment and one leaf, per row. It is a function of the ROWS, and this change did not move it; the coarsest possible merge and the finest possible merge both sit under it. T-07-74's `accept` disposition survives the correction intact: the increase is still bounded by the same constant that bounds the rows, and the scroller is virtualised.

### The `source-tree` / `overflow` UI row is unaffected

`07-UI-SPEC.md:828` records `overflow` / `source-tree` as the phase's one self-declared **unresolved** row. Its content is entirely about **the number 2,000** — that it is a defensible reuse of `IN_MEMORY_WINDOW_ROWS` rather than a measurement, and that no requirement bounds the expected source count. It is not about node identity or about merging. **This plan does not touch it and does not resolve it.** Saying so here is what stops a later reader folding it into this change.

## Deviations from Plan

None — plan executed exactly as written.

Two things are worth flagging as *findings* rather than deviations, because the plan explicitly asked for both answers and did not prejudge them:

1. **The plan's own T-07-74 wording is corrected by its own task-3 measurement** (see above). The plan said "work out whether it can and record the answer"; the answer differs from the figure the review carried, and is recorded in the code, in the spec and here.
2. **A second spelling of MD-02 was found while writing the reproduction** — sanitisation-induced collision rather than truncation-induced. It is the same defect at the same line and is closed by the same one-line change, so it is in scope rather than a Rule 1 auto-fix.

**Total deviations:** 0.
**Impact on plan:** none. Scope held to the two files in `files_modified`.

## Issues Encountered

- The first attempt to write the new spec block emitted a **literal NUL byte** and literal `é` / combining-acute characters into the file. This is exactly the W-2 class that commit `f6cbf07` already repaired once in this phase, and the prior-wave briefing warned about it. Caught before it reached disk; every non-ASCII codepoint in the new tests is written as a `\uXXXX` escape, and the spec block was verified ASCII-only (modulo the em dash already used throughout this repo's prose) by an explicit scan before being spliced in. The corpus expectation lines go further and escape **every** non-ASCII codepoint in every label, so no invisible byte can live in an expectation.
- One `import/order` warning (`There should be at least one empty line between import groups`) from adding `../safety/display` to the spec's import list. Fixed in the same task; `pnpm lint` exits 0 with zero warnings.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change. The one new value — `Building.mergeKey` — is internal to a single build, is never rendered, and is asserted absent from every field the frozen node exposes.

## Verification

| Check | Result |
|---|---|
| `pnpm vitest run packages/frontend/src/sourcemap/tree.spec.ts` | 69 passed (was 57 at plan start) |
| `pnpm vitest run packages/frontend/src` | **880 passed** across 27 files (baseline **863** across 27 — no test lost) |
| `pnpm vitest run` (whole suite) | **4,250 passed** across 89 files (baseline **4,233** across 89) |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0, zero warnings |
| `pnpm knip` | exit 0 |
| `git diff --name-only -- packages/frontend/src/sourcemap` | only `tree.ts` and `tree.spec.ts` |
| `git diff --stat packages/frontend/src/safety/hostile.spec.ts` | prints nothing |
| `vue-tsc --build` (finding W-4 baseline) | **6 errors — unchanged.** 4 in `SettingsPanel.vue`, 2 in `SourceBrowser.spec.ts`. None in either file this plan touched; the baseline did not grow. |

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **MD-02 is closed**, at commit `995b0a8`, with the review's executed reproduction as a RED-then-GREEN case in the shipped spec.
- Nothing is left open by this plan. The `source-tree` / `overflow` UI row remains the phase's one unresolved UI row and is untouched here, exactly as the plan required.
- The wave overlap held: 07-11 and 07-14 share this working tree and neither touched `packages/frontend/src/sourcemap/`. The scoped pathspec confirmed it at every gate.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-02*

## Self-Check: PASSED

- Both modified files exist on disk: `packages/frontend/src/sourcemap/tree.ts`, `packages/frontend/src/sourcemap/tree.spec.ts`.
- All four task commits exist in `git log`: `f3ae301`, `995b0a8`, `afc9bfd`, `e4cff68`.
- Whole suite re-run after the last task commit: 4,250 passed across 89 files.
- `pnpm typecheck && pnpm lint && pnpm knip` exit 0.
- `git diff --name-only -- packages/frontend/src/sourcemap` lists only the two files in `files_modified`.
