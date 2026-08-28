---
phase: 05-workspace-operator-workflow
plan: 09
subsystem: ui
tags: [vue, vue-virtual-scroller, playwright, tailwind, virtualisation, accessibility, ui-09]

requires:
  - phase: 05-05
    provides: the display path (forCell/forPanel), HighlightSlices, and the static R1/R2 gate that audits every file written here
  - phase: 05-08
    provides: the bounded keyset store, the typed RPC client, and the coalescer
  - phase: 05-03
    provides: the shared hostile fixture and the sanitise pipeline
provides:
  - InventoryTable.vue — the one table shell carrying all five enumerated states
  - StatusBadge.vue — the shipped scan-state vocabulary, exhaustively typed
  - PartialBanner.vue — UI-09's view-level floor statement with FLAG F3 resolved
  - ArtifactsTable.vue / ObservationsTable.vue — the two shipped inventories
  - tests/frontend-load.spec.ts — browser-driven executed evidence for two backstop rows
  - forDisplayText / forCellText — the O(cap) cell path the backstop forced
  - SCAN_STATES relocated to @defminer/engine/contract, with isDegradedScanState
affects: [05-10 evidence panel, 05-11 export, 05-12 settings, phase 06 deploy]

actuals:
  tokens: 50236
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "One shell, many tables: every enumerated state lives once, a concrete table contributes a column list and a store handle"
    - "A constant-keyed class lookup that THROWS on a missing entry, so a number and its Tailwind utility cannot drift"
    - "Per-column named slots with a rendering FALLBACK, so a table that supplies no slot still gets R1/R2 applied"
    - "Browser-driven backstop specs that FAIL with the missing capability named rather than skipping"
    - "A second, cheaper path through a security rule is allowed only with a byte-equality assertion against the first over the whole hostile corpus"

key-files:
  created:
    - packages/frontend/src/components/InventoryTable.vue
    - packages/frontend/src/components/InventoryTable.spec.ts
    - packages/frontend/src/components/table-contract.ts
    - packages/frontend/src/components/StatusBadge.vue
    - packages/frontend/src/components/PartialBanner.vue
    - packages/frontend/src/components/ArtifactsTable.vue
    - packages/frontend/src/components/ObservationsTable.vue
    - packages/frontend/src/components/FindingsTable.spec.ts
    - packages/frontend/src/shims-virtual-scroller.d.ts
    - tests/frontend-load.spec.ts
  modified:
    - packages/frontend/src/App.vue
    - packages/frontend/src/App.spec.ts
    - packages/frontend/src/backend.ts
    - packages/frontend/src/safety/display.ts
    - packages/engine/src/contract.ts
    - packages/engine/src/contract.spec.ts
    - packages/engine/src/sanitise.ts
    - packages/engine/src/sanitise.spec.ts
    - packages/backend/src/store/analyses.ts
    - packages/backend/src/store/schema.spec.ts
    - packages/backend/src/ingest/consumer.ts
    - eslint.config.js
    - knip.json
    - .gitignore

key-decisions:
  - "P5-D63: the scan-state vocabulary moves to @defminer/engine/contract; the frontend cannot import the backend and UI-09 requires the badge bind to shipped values"
  - "P5-D64: the row-height Tailwind class is a lookup KEYED BY TABLE_ROW_HEIGHT_PX that throws on a missing entry, because Tailwind's JIT cannot see an interpolated arbitrary value"
  - "P5-D65: RecycleScroller is stubbed in jsdom specs — measured, it renders ZERO rows there — and row geometry is asserted only in the browser spec"
  - "P5-D66: an unknown analysis state renders NOTHING; neither a fabricated 'Complete' nor a UI-only 'Unknown' is permitted"
  - "P5-D67: FLAG F3 resolved as banner chrome always info, count destructive only when the affected set includes a failure"
  - "P5-D68: the table cell uses forCellText (O(cap)), not forCell (O(n)) — the backstop measured 99 of 396 frames over budget on the counting path"
  - "P5-D69: UI-09 is deliberately left unmarked in REQUIREMENTS.md despite this plan being its only declarer"

patterns-established:
  - "Column contract enforced in the shell, not in each table: a check a caller must remember is a check the third table will not call"
  - "Display text precomputed off the scroll path and memoized per row identity, pruned to the live window"

requirements-completed: [UI-02, UISEC-01, UISEC-03]

coverage:
  - id: D1
    description: "Zero analysed artifacts renders the nothing-analysed screen; zero rows under a filter renders the distinct filtered-empty screen with a Clear all filters action. The two are never the same screen."
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/InventoryTable.spec.ts#the empty and filtered-empty screens are disjoint"
        status: pass
    human_judgment: false
  - id: D2
    description: "Loading renders skeleton rows at the fixed row height, one per row of the page size, with the loading label and no spinner role."
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/InventoryTable.spec.ts#loading is skeleton rows, never a spinner"
        status: pass
    human_judgment: false
  - id: D3
    description: "A failed load renders the contract's error copy naming the backend's single thread, with Retry and Open Health, and Retry re-issues the request."
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/InventoryTable.spec.ts#the error screen"
        status: pass
      - kind: integration
        ref: "packages/frontend/src/App.spec.ts#routes to Health when the table's Open Health action is used"
        status: pass
    human_judgment: false
  - id: D4
    description: "A populated table renders a keyset page inside RecycleScroller at the fixed row height, bounded by the in-memory window, with sorting and filtering applied server-side."
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/InventoryTable.spec.ts#sorting is a request, never an arrangement"
        status: pass
      - kind: e2e
        ref: "tests/frontend-load.spec.ts#keeps the resident row count inside the store's declared window bound"
        status: pass
    human_judgment: false
  - id: D5
    description: "The virtualised table exposes row/grid semantics and announces the reachable total rather than the 2,000-row window; every interactive element carries a text label and the accent focus ring; the accent is spent exactly twice."
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/InventoryTable.spec.ts#grid semantics and the announced row count"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/InventoryTable.spec.ts#the accent budget and the keyboard surface"
        status: pass
    human_judgment: false
  - id: D6
    description: "Every status label comes from the shipped scan-state vocabulary, exhaustively, with colour never the sole carrier of meaning."
    requirement: "UI-09"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/FindingsTable.spec.ts#StatusBadge — the SHIPPED vocabulary, exhaustively"
        status: pass
    human_judgment: false
  - id: D7
    description: "A degraded analysis carries a per-row Partial badge independent of the banner, and the view carries the floor statement with a narrowing action; the banner/count colour precedence is stated."
    requirement: "UI-09"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/FindingsTable.spec.ts#ArtifactsTable — UI-09's degradation marking"
        status: pass
    human_judgment: true
    rationale: "The COMPONENTS are proved. The RUNNING PAGE marks nothing, because the shipped paged reads carry no scan_state and no endpoint returns one — App.vue passes :analyses=\"null\". A human must confirm that the deferral is acceptable for this phase and that the requirement stays open until an analysis read exists. UI-09 is deliberately NOT marked complete."
  - id: D8
    description: "Ten thousand rows scroll top to bottom with a bounded resident set and no dropped frames (BACKSTOP)."
    requirement: "UI-02"
    verification:
      - kind: e2e
        ref: "tests/frontend-load.spec.ts#drops no more frames than the stated allowance"
        status: pass
      - kind: e2e
        ref: "tests/frontend-load.spec.ts#completes the whole scroll inside the freeze bound"
        status: pass
    human_judgment: false
  - id: D9
    description: "Adversarial values render truncated at the cell cap with no grapheme split, no layout break and no renderer freeze (BACKSTOP)."
    requirement: "UISEC-03"
    verification:
      - kind: e2e
        ref: "tests/frontend-load.spec.ts#renders EVERY row at exactly the fixed row height, adversarial values included"
        status: pass
      - kind: e2e
        ref: "tests/frontend-load.spec.ts#truncates every rendered cell at the 256-grapheme cap"
        status: pass
      - kind: unit
        ref: "packages/engine/src/sanitise.spec.ts#forDisplayText — the cell path, held to forDisplay's answer"
        status: pass
    human_judgment: false
  - id: D10
    description: "Both shipped tables mount into their tab bodies with the bound four-column shape and exactly one target-controlled column in monospace, never offered as a destination."
    requirement: "UISEC-01"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/FindingsTable.spec.ts#ObservationsTable — the observed URL is the genuine article"
        status: pass
      - kind: integration
        ref: "packages/frontend/src/App.spec.ts#renders no markup from row data — every cell is text"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/frontend-safety.spec.ts#obeys every R1 and R2 rule"
        status: pass
    human_judgment: false

duration: 42 min
completed: 2026-08-28
status: complete
---

# Phase 05 Plan 09: The Table Surface Summary

**One virtualised table shell carrying all five enumerated states over `RecycleScroller` at a fixed 32px item size, the shipped scan-state badge and UI-09's floor banner, both entity tables wired into the page — and a Chromium-driven 10,000-row backstop that found a 418 ms p95 stutter and drove it to 17.1 ms.**

## Performance

- **Duration:** 42 min
- **Started:** 2026-08-28T16:45:00Z (approx — first task commit 16:58:33Z)
- **Completed:** 2026-08-28T17:27:00Z
- **Tasks:** 3
- **Files modified:** 25 (10 created, 15 modified)

## Accomplishments

- **`InventoryTable.vue` — one shell, five states, none of them optional.** Empty, filtered-empty, loading, error and populated are selected by a SINGLE computed rather than a `v-else-if` chain, so "the empty and filtered-empty screens are never the same screen" is a property of the type rather than a rule someone has to hold to. Every copy string is the approved wording; the error body is *imported* from `api/client.ts` so its ten-second figure cannot drift from the client's own timeout, and the loading label reads its `100` from `KEYSET_PAGE_ROWS`.
- **The row-height coupling made unbreakable.** `TABLE_ROW_HEIGHT_PX` reaches the scroller's `item-size`, the skeleton row and every cell. Its Tailwind class is a **lookup keyed by the constant that throws at import** if no entry exists — because Tailwind's JIT cannot see an interpolated arbitrary value and would silently emit nothing, which is the documented "page renders unstyled and nothing fails" mode.
- **The column contract enforced by the shell, not by each table.** `assertColumnContract` runs in `InventoryTable`'s setup. "Exactly one target-controlled column" is a rule the third table would forget to call; here a successful mount *is* the assertion.
- **`StatusBadge.vue` bound to the shipped vocabulary by the compiler.** `Record<ScanState, Presentation>` makes a sixth state a typecheck error rather than a badge that renders nothing — which under UI-09 is a degraded analysis silently presented as complete. Every member appears exactly once in the file, gate-verified.
- **`PartialBanner.vue` resolves UI-SPEC FLAG F3 in the markup.** Banner chrome is *always* informational; the count takes the destructive colour only when the affected set includes a failure, because `failed` means nothing was inspected. Two elements, two rules, precedence stated rather than left to be rediscovered from two contract rows that both name the same banner.
- **Both shipped tables wired into the page**, replacing the tracer's inline rendering, with the observed URL — the genuine free-form host-controlled value — routed through the display path in monospace and never offered as a destination.
- **`tests/frontend-load.spec.ts`: executed evidence, and it earned its classification on its first run.** It builds the real component through the real Tailwind/PostCSS pipeline, drives Chromium, and **found a real defect**: 99 of 396 frames over the 32 ms budget, p95 418 ms, whole scroll 37.4 s. Root-caused and fixed, it now reports 0 over budget, p95 17.1 ms, whole scroll 4.0 s.

## Task Commits

1. **Task 1: InventoryTable shell and every enumerated state** — `73803e7` (feat)
2. **Prerequisite for Task 2: scan-state vocabulary relocation** — `eae6018` (refactor)
3. **Task 2: the two tables, the badge, and UI-09's marking** — `153d0f4` (feat)
4. **Task 3: the ten-thousand-row browser backstop and the stutter it found** — `384098b` (test)
5. **REQUIREMENTS.md machine-owned span restored** — `61fd868` (fix)

**Plan metadata:** see the `docs(05-09)` commit that carries this file.

## The measurements this plan is required to record

The backstop rows are marked 🧪 precisely because a pass is not the deliverable — the numbers are.

| Measurement | Through `forCell` (as first written) | Through `forCellText` (shipped) |
|---|---|---|
| Rows paged through | 10,000 | 10,000 |
| Peak resident rendered rows | 58 | 58 |
| Store window bound | 2,000 | 2,000 |
| Frames sampled | 396 | 396 |
| **Max frame** | **442.20 ms** | **23.80 ms** |
| **p95 frame** | **418.00 ms** | **17.10 ms** |
| Frames over the 32 ms budget | 99 | **0** |
| Whole-scroll elapsed | 37,395 ms | **4,010 ms** |
| Distinct rendered row heights | `[32]` | `[32]` |
| Max rendered cell graphemes | 256 (cap 256) | 256 (cap 256) |
| Hostile rows actually rendered | 12 | 12 |

Same rows, same corpus, same machine. One call changed.

## Files Created/Modified

- `packages/frontend/src/components/InventoryTable.vue` — the shell: five states, the scroller, grid semantics, the two accent uses
- `packages/frontend/src/components/table-contract.ts` — the column definition, the constant-keyed row-height class, `assertColumnContract`, `counted`
- `packages/frontend/src/components/StatusBadge.vue` — the shipped vocabulary, exhaustively typed
- `packages/frontend/src/components/PartialBanner.vue` — UI-09's floor statement, FLAG F3 resolved
- `packages/frontend/src/components/ArtifactsTable.vue` / `ObservationsTable.vue` — column lists over the shell
- `packages/frontend/src/components/{InventoryTable,FindingsTable}.spec.ts` — 29 + 28 cases
- `packages/frontend/src/shims-virtual-scroller.d.ts` — narrow types for a package that ships none
- `tests/frontend-load.spec.ts` — the Chromium-driven backstop
- `packages/frontend/src/App.vue` / `App.spec.ts` — the tables mounted over the keyset stores; the tracer's inline rendering removed
- `packages/frontend/src/backend.ts` — `DefMinerEndpoints`/`DefMinerSDK` deleted, as that file's own header asked once 05-07 landed the real contract
- `packages/frontend/src/safety/display.ts` — `forCellText`
- `packages/engine/src/{contract,sanitise}.ts` + specs — `SCAN_STATES`/`isDegradedScanState` relocated; `forDisplayText` added with byte-equality assertions
- `packages/backend/src/store/analyses.ts`, `schema.spec.ts`, `ingest/consumer.ts` — consume the relocated vocabulary
- `eslint.config.js`, `knip.json`, `.gitignore` — three narrow, documented scope changes

## Decisions Made

- **P5-D63 — the scan-state vocabulary moves to `@defminer/engine/contract`.** The plan asked the badge to "import the vocabulary from the analyses store module". That is not reachable: the frontend package cannot import the backend package at all, and the backend's own `api/client.ts` header records that a gate greps for the specifier so the boundary is resolution rather than discipline. The vocabulary now lives in the one module both packages already import. Still exactly one declaration; only the holder changed. Two things improved in passing — `EntityLead.state` stopped being a bare `string` with a paragraph explaining it was "really" a vocabulary member, and `schema.spec.ts` stopped iterating a literal copy of the five values.
- **P5-D64 — the row-height class is a lookup keyed by the constant, and it throws.** `h-[${TABLE_ROW_HEIGHT_PX}px]` would scan as nothing under Tailwind's JIT and emit no rule, which `tailwind.config.ts` already records as a failure that *succeeds*: the build passes and the page renders unstyled. A missing entry now throws while the module is being imported, naming both halves.
- **P5-D65 — `RecycleScroller` is stubbed in jsdom, and row geometry is the browser spec's alone.** Measured, not assumed: mounted with fifty items in a 320px container, the real scroller renders an **empty item wrapper**, because it sizes from `getBoundingClientRect` and jsdom reports every box as 0×0. Every cell assertion written against that would pass by measuring an empty set — 05-08's own recorded failure. `item-size` is still asserted on the stub's props.
- **P5-D66 — an unknown analysis state renders nothing.** Rendering "Complete" for an artifact whose state nobody knows is precisely the silence UI-09 forbids; rendering "Unknown" introduces the UI-only synonym § "Status vocabulary" bans. The column keeps its position so the plan that supplies the data does not move the operator's columns.
- **P5-D67 — FLAG F3's precedence.** Banner chrome always `info` (its subject is degradation); the count `danger` only when the affected set includes a `failed` artifact, because `failed` means nothing was inspected and is categorically different from "stopped early".
- **P5-D68 — the cell uses `forCellText`, not `forCell`.** See "The measurements" above. `forCell` walks the whole value to report `total` for the "Truncated at {shown} of {total}" affordance — which is the *evidence panel's*. The cell renders 256 graphemes and never asks. The saving is only legitimate because `sanitise.spec.ts` asserts `forDisplayText(v, cap) === forDisplay(v, cap).text` over the whole hostile corpus at both caps; two implementations of a security rule that nobody diffs is the failure this codebase names repeatedly.
- **P5-D69 — UI-09 is left unmarked**, though this plan is its only declarer. See "Known Stubs".

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The scan-state vocabulary was unreachable from the frontend**
- **Found during:** Task 2
- **Issue:** The plan directs `StatusBadge.vue` to import the vocabulary from `packages/backend/src/store/analyses.ts`. The frontend package has no dependency on the backend package and cannot acquire one — the backend imports `caido:*` specifiers that resolve only inside Caido's QuickJS.
- **Fix:** Moved `SCAN_STATES` / `ScanState` / `TERMINAL_SCAN_STATES` to `@defminer/engine/contract`, the module both packages already import, and added `isDegradedScanState` beside them with a `never` fallthrough. One declaration throughout.
- **Files modified:** `packages/engine/src/contract.ts`, `contract.spec.ts`, `packages/backend/src/store/analyses.ts`, `schema.spec.ts`, `packages/backend/src/ingest/consumer.ts`
- **Verification:** `pnpm typecheck`, full suite, and six new `contract.spec.ts` cases
- **Committed in:** `eae6018`

**2. [Rule 1 - Bug] A 418 ms p95 stutter on the table surface, found by the backstop it was written for**
- **Found during:** Task 3
- **Issue:** `forCell` is O(n) in the raw value because `total` requires the whole string walked. At ten thousand rows with the hostile corpus seeded through them the load spec measured 99 of 396 frames over the 32 ms budget, max 442 ms, whole scroll 37.4 s — one visible stutter per page load, on the surface Phase 5's success criterion 2 is about, and exactly threat T-05-47.
- **Fix:** Added `forDisplayText` (engine) / `forCellText` (frontend): the same three R2 steps with the grapheme walk stopped at the cap, O(cap) instead of O(n). Held to `forCell`'s answer by byte-equality over the whole hostile corpus at both caps. `InventoryTable` additionally precomputes the target-controlled text off the scroll path and memoizes it per row identity, pruned to the live window — the window moves by one page and keeps 1,900 of its 2,000 rows.
- **Files modified:** `packages/engine/src/sanitise.ts`, `sanitise.spec.ts`, `packages/frontend/src/safety/display.ts`, `packages/frontend/src/components/InventoryTable.vue`
- **Verification:** re-measured — 0 frames over budget, p95 17.1 ms, whole scroll 4.0 s
- **Committed in:** `384098b`

**3. [Rule 3 - Blocking] `no-restricted-types` scoped to `.ts` and not `.vue`**
- **Found during:** Task 2
- **Issue:** The repo's documented `null`-is-first-class exception covered `packages/**/*.ts` only. The tables need a *required nullable* prop, because in a Vue prop `undefined` means ABSENT AND DEFAULTED while `null` means PRESENT AND EMPTY — two different claims, and the difference is the whole reason these props are required rather than optional.
- **Fix:** Widened the existing exception's `files` to `packages/**/*.{ts,vue}` with the reasoning recorded at the block.
- **Files modified:** `eslint.config.js`
- **Verification:** `pnpm lint` clean
- **Committed in:** `153d0f4`

**4. [Rule 3 - Blocking] Two component templates were fragments because of a leading comment**
- **Found during:** Task 2
- **Issue:** A comment at the top level of a `<template>` is a NODE. `StatusBadge.vue` and `PartialBanner.vue` each opened with one, which made them fragments — `wrapper.classes()` then read `[]` and every colour assertion failed. `HighlightSlices.vue` records the same trap from a previous session.
- **Fix:** Moved both comments into the `<script>` blocks, with the trap restated where it would bite next.
- **Files modified:** `packages/frontend/src/components/StatusBadge.vue`, `PartialBanner.vue`
- **Verification:** `FindingsTable.spec.ts` 28/28
- **Committed in:** `153d0f4`

**5. [Rule 3 - Blocking] The harness bundle threw `process is not defined`**
- **Found during:** Task 3
- **Issue:** The standalone harness page loaded and stayed blank. Vue's modules read `process.env.NODE_ENV` and three build-time feature flags; the shipped plugin build externalises Vue because Caido's renderer provides one that already has them baked in, and a standalone page has no such host.
- **Fix:** The generated vite config defines all four.
- **Files modified:** `tests/frontend-load.spec.ts`
- **Verification:** the harness page mounts and the scroller appears
- **Committed in:** `384098b`

**6. [Rule 2 - Missing Critical] `App.spec.ts` had to be rewritten against the new wiring**
- **Found during:** Task 2
- **Issue:** Five of its cases drove the tracer's single `getArtifacts` endpoint, which this plan removes. Left as-is they were red; deleted they would have taken real claims with them.
- **Fix:** Rewritten against the client's declared SDK surface, as a literal stub rather than a cast. Every claim it was making is preserved, and two were added: Open Health routes the tab strip, and a page mounted without an SDK renders the ERROR state rather than the empty one — an empty state there tells the operator the target is clean when nothing was asked.
- **Files modified:** `packages/frontend/src/App.spec.ts`
- **Verification:** 12/12
- **Committed in:** `153d0f4`

**7. [Rule 1 - Bug, predicted] `requirements.mark-complete` prettified REQUIREMENTS.md again**
- **Found during:** close-out
- **Issue:** The fourth confirmed occurrence. Marking any requirement complete rewrites the file through a markdown prettifier, which inserts blank lines into the machine-owned CORE-11 derived-residual span that `outbound-prohibition.spec.ts` byte-compares. Seven lines drifted; the gate went red.
- **Fix:** Diffed against a pre-call snapshot and kept only the three checkbox flips, dropping every blank-line-only insertion.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** `outbound-prohibition.spec.ts` 455/455
- **Committed in:** `61fd868`

---

**Total deviations:** 7 auto-fixed (2 bugs, 1 missing critical, 4 blocking)
**Impact on plan:** All seven were necessary. Two — the vocabulary relocation and the O(cap) cell path — improved the architecture beyond what the plan asked for, and the second was found by the very instrument the plan required. No scope creep: nothing was built that the plan did not call for.

## Known Stubs

These are recorded in `.planning/WINDOWS.md` (entries 56–58) and are the reason **UI-09 is not marked complete**.

| Stub | File | Why it exists |
|---|---|---|
| `:analyses="null"` and `:affected-filter="null"` on both tables | `packages/frontend/src/App.vue` | **Measured against the shipped reads, not assumed:** the paged statements in `packages/backend/src/store/reads.ts` select `project_id, sha256, byte_len, kind, first_seen_at, last_seen_at, seen_count` (and the observation equivalents) and NOTHING ELSE. There is no `scan_state` on either row and no endpoint returns one — `analyses` is an invalidation category, not a pageable table. Joining one in is an edit to that literal statement matrix, which is a backend change this plan does not make. So no per-row badge and no banner render on the running page today. The components are fully exercised against fixtures that carry the data. |
| Empty triage column | `ArtifactsTable.vue`, `ObservationsTable.vue` | The triage table does not exist; its key waits on Phase 4's stable entity identity (D-05(4)). The column holds its position so it does not shift every column right of it when the data lands. |
| `Show only affected artifacts` suppressed | `PartialBanner.vue` | `PageRequest["filter"]` is a SINGLE column filter by type, because the backend statement matrix is enumerated literally. There is no scan-state filter column, so no single-column filter can express "only the affected artifacts". The action renders only when a narrowing filter is supplied; offering a button that cannot change the list teaches the operator that the affordance does nothing. |

**Why UI-09 stays open.** Its text is "Degraded and partial analyses are visibly marked, never silently presented as complete". The marking mechanism ships and is proved; the marking does not happen, because the data does not reach the page. Checking it off would be presenting an incomplete thing as complete — which is the requirement's own subject.

## Threat Flags

None. Every file written here is inside the surface `frontend-safety.spec.ts` walks, and the two new engine exports (`forDisplayText`, `isDegradedScanState`) introduce no network, auth, filesystem or schema surface. `forDisplayText` is a *narrowing* of an existing sanitisation path, held to the existing one by byte equality over the hostile corpus.

## Issues Encountered

- **The plan's `import the vocabulary from the analyses store module` was not reachable.** Resolved as deviation 1 rather than by weakening the boundary. Worth flagging to the planner: an instruction that crosses the backend/frontend package boundary cannot be followed literally in this repo.
- **`vue-virtual-scroller@2.0.0-beta.8` ships no types.** A narrow hand-written declaration was added covering only the four props DefMiner passes — a wider one would be unverified guesswork that typechecks.

## User Setup Required

None — no external service configuration required. The load spec needs a Chromium binary; `playwright@1.62.1` is already a devDependency and the binary was present. If it is not, the spec fails with `pnpm exec playwright install chromium` in the message rather than skipping.

## Next Phase Readiness

**Ready for 05-10 (evidence panel).** The panel has everything it needs: `forPanel`/`truncationNotice` are untouched and now unambiguously the *panel's* path; the store's `selectedRowKey`/`panelOpen` are driven by the table's row click and its `Open evidence` action; `EvidencePanelFrame` and `EVIDENCE_PANEL_MANDATORY_FIELDS` are in the contract. The panel owns UI-09's per-artifact line ("Analysis stopped at {bytes_walked} of {byte_len} bytes ({reason})…") — it will hit the same missing `scan_state` data, and should decide with this summary in hand rather than rediscovering it.

**Two things a later plan must pick up:**
1. **An analysis-state read.** Until one exists, UI-09 cannot close and the badge/banner wiring stays dark. It is a change to `reads.ts`'s literal statement matrix plus a registered endpoint — a backend plan, not a frontend one.
2. **A scan-state filter column**, if `Show only affected artifacts` is to work. One filter column at a time, by type.

**No blockers.** `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm knip`, `pnpm build`, `pnpm check:css`, `pnpm check:externals` and `vue-tsc --build` all pass; 52 files / 1,949 tests.

## Self-Check: PASSED

All ten created files verified present on disk; all five task commits verified in `git log`; every plan-level `<verification>` command re-run green (`pnpm test` 1,949 passed, `pnpm typecheck`, `pnpm lint`, `pnpm knip`, `pnpm check:css` 90 rules scoped, `pnpm check:externals` 1 bare import honoured); no file deletions in any commit; working tree clean and the generated harness directory removed.

---
*Phase: 05-workspace-operator-workflow*
*Completed: 2026-08-28*
