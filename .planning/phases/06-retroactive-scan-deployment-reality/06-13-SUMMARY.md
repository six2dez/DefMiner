---
phase: 06-retroactive-scan-deployment-reality
plan: 13
subsystem: ui
tags: [vue, scan-history, toolbar-indicator, httpql, sanitisation, caido]

requires:
  - phase: 06-retroactive-scan-deployment-reality
    provides: "`listScans` (06-05) — the bounded, suspended-pinned read the list consumes"
  - phase: 06-retroactive-scan-deployment-reality
    provides: "`ScanLifecycleBadge` and `scan-lifecycle-presentation.ts` (06-09) — the lifecycle word and its tone, consumed and never re-implemented"
  - phase: 06-retroactive-scan-deployment-reality
    provides: "`ScanPanel.vue`, `scan-contract.ts` and the shared hostile corpus's third surface (06-12)"
provides:
  - "`ScanHistoryList.vue` — a bounded authored list with an inline per-scan disclosure, deliberately NOT the shipped table contract"
  - "The toolbar scan indicator — a running or suspended scan visible and reachable from every tab"
  - "The last two 🧪 backstop surfaces of the phase, discharged in full with no browser-measured half owed"
  - "Amendment A4 applied upstream to `05-UI-SPEC.md` — the table contract now scopes itself"
affects: [phase-07, scan-history, toolbar, ship-gate]

actuals:
  tokens: 28900
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Authored list, not a contract table: a list with ZERO target-controlled columns cannot satisfy `assertColumnContract` and must not be forced to"
    - "A bound the SURFACE sends rather than mirrors — the frontend names its limit, the backend clamps it down, so there is one declaration"
    - "A stateful toolbar element that HOLDS its last state on a failed read and is absent before the first"

key-files:
  created:
    - packages/frontend/src/components/ScanHistoryList.vue
    - packages/frontend/src/components/ScanHistoryList.spec.ts
  modified:
    - packages/frontend/src/components/scan-contract.ts
    - packages/frontend/src/components/ScanPanel.vue
    - packages/frontend/src/components/ScanPanel.spec.ts
    - packages/frontend/src/api/client.ts
    - packages/frontend/src/api/client.spec.ts
    - packages/frontend/src/App.vue
    - packages/frontend/src/App.spec.ts
    - packages/frontend/src/safety/hostile.spec.ts
    - .planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md

key-decisions:
  - "The scan history is an authored list and never calls `assertColumnContract`, because the assertion binds exactly one target-controlled column and this list has ZERO — forcing one would be lying to a gate and would make the gate's own message false"
  - "The 50-row bound is the number the FRONTEND sends to a backend that clamps it into `[1, SCAN_LIST_DEFAULT_LIMIT]`, so there is one declaration of the bound rather than a frontend mirror of the backend's 200"
  - "The indicator's date is the POSITION's when the scan reached a page and the START's when it did not, under two different authored prefixes — dropping it would leave a bare word and a number, and printing the start date under the position's prefix would be the more comfortable lie"
  - "The indicator opens NO subscription and NO timer; it re-reads on mount and on every tab change, which is when the operator's attention crosses the toolbar"
  - "A history load failure renders ABOVE the rows rather than instead of them, so a failure never takes a suspended scan off the screen"
  - "The detail does NOT render a composed filter, because `scans` stores no composed string and recomposing it would describe this version's DefMiner clause rather than the one that scan ran"

patterns-established:
  - "Mechanical assertion of a design fact: a spec case proves `assertColumnContract` WOULD throw on this column set, then mounts the component anyway — a comment saying 'we do not use the table contract' would go stale in silence"
  - "Two caps, one mount: the hostile loop drives the row's `forCellText` and the disclosure's `forPanel` from the same case, because a component that got one right and the other wrong is the defect two separate mounts would let through"
  - "An assumption recorded IN THE CODE beside the constant, naming the four parts of the shape that are binding while the number is not"

requirements-completed: [FIND-04]

coverage:
  - id: D1
    description: "The scan history list renders newest-first as an authored list, with an inline per-scan disclosure, and does not reuse the shipped table contract"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ScanHistoryList.spec.ts#does NOT run the shipped column assertion over its own shape"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ScanHistoryList.spec.ts#renders NO virtual scroller and NO sort control"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ScanHistoryList.spec.ts#asks for the declared bound and renders in the order it was given"
        status: pass
    human_judgment: false
  - id: D2
    description: "An empty history and a failed load are different screens, distinguishable by their text alone"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ScanHistoryList.spec.ts#renders the EMPTY screen for zero scans, and NOT the error copy"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ScanHistoryList.spec.ts#renders the ERROR screen for a failed load, and NOT the empty copy"
        status: pass
    human_judgment: false
  - id: D3
    description: "A row is never hidden because part of it is missing — absent position, discarded position, suspended reason"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ScanHistoryList.spec.ts#renders NO position element for a scan that resolved no page"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ScanHistoryList.spec.ts#states that a DISCARDED row's position is gone"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ScanHistoryList.spec.ts#states a SUSPENDED row's reason and what resuming continues from"
        status: pass
    human_judgment: false
  - id: D4
    description: "The truncation is stated in words when the returned count reaches the declared bound, and not below it"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ScanHistoryList.spec.ts#renders the truncation sentence when the count REACHES the bound"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ScanHistoryList.spec.ts#does NOT render it below the bound"
        status: pass
    human_judgment: false
  - id: D5
    description: "The toolbar indicator renders for running and suspended, is absent for no scan, before the first read and for a terminal scan"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#renders NO indicator before the first status read resolves"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#renders the indicator for a SUSPENDED scan, in the suspended tone"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#renders NO indicator for a completed scan"
        status: pass
    human_judgment: false
  - id: D6
    description: "The indicator holds its last known state on a failed status read and is never removed"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#HOLDS the indicator when a status read fails after a success"
        status: pass
    human_judgment: false
  - id: D7
    description: "Activating the indicator switches the active tab to Scan — the body arm follows, not only the strip"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#switches the active tab to Scan when the indicator is activated"
        status: pass
    human_judgment: false
  - id: D8
    description: "The toolbar gains no unbounded and no target-controlled string — a rendering-safety invariant, not a layout preference"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#puts no unbounded and no target-controlled string in the toolbar"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/frontend-safety.spec.ts#packages/frontend/src/App.vue obeys every R1 and R2 rule"
        status: pass
    human_judgment: false
  - id: D9
    description: "🧪 long-text · scan-history-list — the operator's clause renders inert in every row at the table-cell cap over the shared hostile corpus, with no title and no data-* carrying it"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/safety/hostile.spec.ts#renders inert in the history row and its detail (20 cases)"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/safety/hostile.spec.ts#exercised EVERY case in the shared corpus"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/frontend-safety.spec.ts#packages/frontend/src/components/ScanHistoryList.vue obeys every R1 and R2 rule"
        status: pass
    human_judgment: false
  - id: D10
    description: "🧪 long-text · scan-detail — the same clause at the evidence-panel cap in the inline disclosure, grapheme-safe at the cap"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/safety/hostile.spec.ts#renders inert in the history row and its detail (20 cases, panel-cap half)"
        status: pass
    human_judgment: false
  - id: D11
    description: "Amendment A4 applied to 05-UI-SPEC.md in the same commit as the list it describes"
    verification:
      - kind: other
        ref: "grep -n 'amendment A4' .planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md (commit b0aaa49)"
        status: pass
    human_judgment: false
  - id: D12
    description: "The five-tab strip and the toolbar indicator render as specified against Caido's own renderer and its real theme variables"
    verification: []
    human_judgment: true
    rationale: "Every automated check in this phase runs against build output, jsdom, or headless Chromium over a generated entry; none is Caido's renderer. Carried from Phase 5's standing human-verification item, per this plan's <human-check>."

duration: 32 min
completed: 2026-09-01
status: complete
---

# Phase 06 Plan 13: The Scan History List and the Toolbar Indicator Summary

**D-13 finished: a suspended scan is now visible from every tab through a bounded toolbar indicator that holds its state on a failed read, and its row — which is its resumable cursor — is findable in an authored history list that obeys the shipped table contract by not applying it.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-09-01T08:53:05Z
- **Completed:** 2026-09-01T09:25:20Z
- **Tasks:** 3 of 3
- **Files modified:** 10 (2 created, 8 modified)

## Accomplishments

- **`ScanHistoryList.vue`, an authored list rather than a contract table, and the reason is mechanical.** `assertColumnContract` throws unless exactly one column is target-controlled; every column of a scan history — lifecycle state, counters, position date, the operator's own clause — is DefMiner- or operator-authored, so ZERO are. The component header quotes the assertion's own thrown message as the reason, and a spec case proves the gate really would reject this column set before mounting the component anyway. Marking a column `targetControlled: true` to get past it would have been lying to a gate *and* would have made the gate's message false for the next person who read it.
- **The bound is the number the surface SENDS, not a number it mirrors.** `SCAN_HISTORY_LIMIT = 50` travels down to `listScans`, which clamps into `[1, SCAN_LIST_DEFAULT_LIMIT]` — a ceiling a caller may only lower. There is therefore no frontend copy of the backend's 200, the surface knows exactly which bound was applied, and it says so in words whenever the returned count reaches it. The number is recorded in `scan-contract.ts` as an explicit assumption beside the four parts of the shape that ARE binding.
- **The toolbar indicator, the 48px row's first stateful element.** Fourth of four, with the export CTA's shipped slot untouched. Always three things — a closed-set state word, one grouped integer, one fixed-format date. It renders for `running` and `suspended` only, is absent before the first status read, HOLDS its last known state on a failed one, and switches the active tab to Scan when activated.
- **Both remaining 🧪 backstop rows discharged in full.** A fourth and fifth `describeSurface` drive the operator's clause through the real `ScanHistoryList` at two caps in one mount, over the same shared corpus with the same id-set exhaustiveness. `hostile.spec.ts`'s header now enumerates six backstop rows and states plainly that these two make no layout claim and owe no browser-measured half.
- **Amendment A4 landed upstream in the same commit as the list it describes**, so the approved contract no longer describes a build that does not exist.

## Task Commits

1. **Task 1: `ScanHistoryList.vue` — a bounded list that states its bound, and its inline detail** — `b0aaa49` (feat)
2. **Task 2: The toolbar scan indicator** — `b8ef181` (feat)
3. **Task 3: `ScanHistoryList.spec.ts`, and the clause through the last two surfaces** — `ef1e722` (test)

**Plan metadata:** see the `docs(06-13)` commit that follows this file.

## Files Created/Modified

- `packages/frontend/src/components/ScanHistoryList.vue` — the bounded authored list, its four screens and its inline disclosure
- `packages/frontend/src/components/ScanHistoryList.spec.ts` — 22 cases: every state the contract names, plus the two design facts asserted mechanically
- `packages/frontend/src/components/scan-contract.ts` — the history copy, the indicator copy and composition, the row-id helpers, `SCAN_HISTORY_COUNTERS`, and the bound's assumption note; `dateOnlyText`'s `@internal` tag came off as its own comment promised
- `packages/frontend/src/components/ScanPanel.vue` — the list mounted as the tab's last block, rendering whether or not there is an active scan
- `packages/frontend/src/components/ScanPanel.spec.ts` — the mount cases and the `historyLimits` harness hook
- `packages/frontend/src/api/client.ts` — `ScanHistoryRow`, `ScanHistoryRequest`, and the guarded `listScans` wrapper
- `packages/frontend/src/api/client.spec.ts` — the literal stub gains `listScans`, never a cast
- `packages/frontend/src/App.vue` — the indicator, `loadScanHistory`, `selectTab`, and the toolbar invariant written into the header block
- `packages/frontend/src/App.spec.ts` — 11 indicator cases, absence cases first
- `packages/frontend/src/safety/hostile.spec.ts` — the fourth and fifth surfaces and the amended header
- `.planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md` — amendment A4

## Decisions Made

1. **The list does not call the shipped column assertion.** Mechanical, not aesthetic — recorded in the component header, quoted from the assertion itself, and asserted by a spec case rather than left as a comment that could go stale.
2. **`SCAN_HISTORY_LIMIT = 50` is sent, not mirrored.** The plan explicitly preferred the backend returning the bound it applied; the backend does not return it and adding that would have changed `api/spec.ts`, `index.ts` and `index.spec.ts` — none of them in `files_modified`. Sending the limit achieves the same non-drift property inside scope: one declaration, and the surface knows what it asked for.
3. **The indicator's date carries two prefixes.** `from {date}` when the scan reached a page, `started {date}` when it has not. The content rule forbids dropping the element; printing `startedAt` under the position's prefix would have been a fabrication. Both dates are DefMiner's own facts and the prefix says which is on screen.
4. **No subscription and no timer behind the indicator.** A second `onEvent` subscription owned by the shell is research P-04's leak shape opened again, for an element that renders no motion. It re-reads on mount and on every tab change, which is exactly when the operator's attention crosses the toolbar.
5. **A history load failure renders above the rows, not instead of them.** A failure that replaced the rows would take a suspended scan off the screen at the moment the operator went looking for it.
6. **The detail renders no composed filter.** `scans` has no `composed_filter` column; recomposing it would describe this version's DefMiner clause rather than the one that scan ran. Stated in words on the surface and recorded in WINDOWS with a named owner.

## Deviations from Plan

### Auto-fixed / scope adjustments

**1. [Rule 2 — missing critical] The composed filter is not stored per scan, so the detail states its absence instead of fabricating it**
- **Found during:** Task 1
- **Issue:** The task action asks the disclosure to render "the composed filter the scan actually ran". `ScanHistoryRow` does not carry one and neither does the `scans` table — `ScanStatusPayload.composedFilter` is computed for the LIVE readout from today's `SCAN_KIND_CLAUSE`. Recomposing it for a historical scan would go wrong silently at the first plugin upgrade.
- **Fix:** The detail renders the operator's own clause at the panel cap and states the absence in an authored sentence (`SCAN_HISTORY_COMPOSED_ABSENT_BODY`), which is this page's own rule for a fact DefMiner does not have. Recorded in `.planning/WINDOWS.md` (entry 104) with a named owner: a plan owning `store/migrations.ts` + `scan/scans.ts`, pairable with WINDOW 86's `analysed` so the one-way migration ladder is paid once.
- **Files modified:** `scan-contract.ts`, `ScanHistoryList.vue`
- **Verification:** `ScanHistoryList.spec.ts` asserts the clause label, the no-clause body and the absence of a detail-clause element on an empty clause.
- **Committed in:** `b0aaa49`

**2. [Rule 1 — bug] `SCAN_HISTORY_COUNTERS` cannot be `SCAN_STRIP_COUNTERS + SCAN_DETAIL_COUNTERS`**
- **Found during:** Task 1
- **Issue:** The shipped counter lists are typed over `ScanStatusPayload`'s numeric fields and include `analysed`, which the history projection does not carry at all. Reusing them directly would have rendered a blank or a fabricated cell.
- **Fix:** `ScanHistoryCounterField` is a mapped type over `ScanHistoryRow` intersected with the six real counters, so a field renamed on the projection drops out of the union and the list stops compiling. The LABELS are looked up in the shipped lists and never retyped; a missing one throws at import with a message naming both halves, the `ROW_HEIGHT_CLASS` idiom.
- **Files modified:** `scan-contract.ts`
- **Verification:** `pnpm typecheck`; `ScanHistoryList.spec.ts#renders the full counter set in the detail`.
- **Committed in:** `b0aaa49`

**3. [Rule 3 — blocker] A second progress subscription in `App.vue` broke two shipped coalescer cases**
- **Found during:** Task 2
- **Issue:** The first cut of the indicator opened its own `subscribeInvalidation` for liveness. `App.spec.ts`'s `captureHandler` captures the last-registered summary handler, so the pill's two shipped cases began driving the indicator's no-op instead of the coalescer.
- **Fix:** The subscription was removed rather than worked around in the stub. The indicator renders no motion, so a live feed bought a number that changes where no eye is; it re-reads on mount and on every tab change instead. The reason is written into `App.vue` beside the mount hook.
- **Files modified:** `App.vue`
- **Verification:** All 56 `App.spec.ts` cases green, including the two coalescer cases and the five-tab order case.
- **Committed in:** `b8ef181`

**4. [Rule 1 — bug] A history load failure replaced the rows instead of sitting above them**
- **Found during:** Task 3
- **Issue:** The `v-else-if` chain made the error screen exclusive with the rows, so a failure arriving after a successful read would have taken a suspended scan off the screen — the exact harm the failure copy is written about.
- **Fix:** `showRows` no longer consults `failed`; the error renders above the rows. Only the EMPTY screen stays exclusive, because that is the pair that must never be confused.
- **Files modified:** `ScanHistoryList.vue`
- **Verification:** `ScanHistoryList.spec.ts` — the empty/error pair, and the retry-succeeds transition. The rows-then-failure sequence is unreachable from the surface; see Known Gaps.
- **Committed in:** `ef1e722`

**5. [Housekeeping] `dateOnlyText`'s `@internal` tag removed**
- **Found during:** Task 1
- **Issue:** The tag's own comment said it was "`@internal` for exactly one wave" and named plan 06-13 as the consumer that lets it come off.
- **Fix:** Removed, and the comment rewritten to record that both consumers now exist and neither wrote a second formatter.
- **Committed in:** `b0aaa49`

---

**Total deviations:** 5 (1 × Rule 1 correctness pair, 1 × Rule 2, 1 × Rule 3, 1 × Rule 1 rendering, 1 × housekeeping).
**Impact on plan:** No scope creep. Two of the five (1 and 3) are cases where the plan's stated approach met a fact on disk that contradicted it, and both are recorded rather than silently absorbed — one in WINDOWS with a named owner, one in the source beside the code it explains.

## Known Gaps

| Gap | Where | Owner |
|---|---|---|
| The composed filter the scan actually ran is not stored per scan, so the detail states its absence | `packages/backend/src/scan/scans.ts` — no `composed_filter` column | WINDOWS 104: a plan owning `store/migrations.ts` + `scan/scans.ts`, pairable with WINDOW 86 |
| `showRows`'s failure-beside-rows branch is unreachable from the surface and therefore untested | `ScanHistoryList.vue` — the only re-read is Retry, which only exists while the error is on screen | WINDOWS 105: whichever plan adds a Refresh control or a periodic re-read |

No stubs. No skipped tests. No `TODO`/`FIXME` introduced.

## Assumptions Carried

**`overflow · scan-history-list` (⚠ unresolved in `06-UI-SPEC.md`) is surfaced, not adopted.** `SCAN_HISTORY_LIMIT = 50` is a defensible proposal, not a measurement: no requirement bounds the expected scan count and nothing in this phase measured one. What is BINDING is the shape of the answer, and it is written into `scan-contract.ts` in four numbered parts — a stated bound; enforced at read in `LIST_SCANS_SQL` rather than at render; every `suspended` scan pinned into the window regardless of age; and the truncation said in words on the surface. The number may move without re-opening any decision; the shape may not. This mirrors P5-D20 for the suppressions list exactly.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change. The one new trust boundary crossing — the operator's clause into two render surfaces — is the plan's own `T-06-67`/`T-06-68` and is mitigated as specified: two caps, two call sites bound in the helper names, and an explicit allowed-tag walk over the shared corpus.

## Issues Encountered

**The `spinner` assertion failed on the template's own comment.** `wrapper.html()` includes template comments, and the comment beside the skeleton block says "NEVER A SPINNER" while explaining why there is not one. Resolved by asserting over the rendered NODES — roles and class names — rather than over the markup string, which is the stronger check anyway. Recorded in the spec so the next author does not reintroduce the string search.

## Verification Results

| Gate | Result |
|---|---|
| `pnpm test` | **73 files / 3,052 tests passed**, 0 skipped (baseline 72 / 2,992) |
| `pnpm typecheck` | pass |
| `pnpm lint` | pass |
| `pnpm knip` | **exit 0**; 23 tag hints, every one naming `packages/backend` — no hint names a file this plan touched |
| `pnpm check:bundle` | pass — `crypto` only, import set unchanged |
| `pnpm check:css` | pass — 121 rules against `#plugin--defminer` |
| `pnpm check:externals` | pass — `vue` only |
| `pnpm exec caido-dev build packages` | pass |
| `packages/frontend/package.json` | byte-unchanged (`git diff --exit-code`) |
| `packages/frontend/src/stores/coalescer.ts` | byte-unchanged (`git diff --exit-code`) |
| `05-UI-SPEC.md` carries A4 | pass, in `b0aaa49` |

**Outstanding human check:** install the plugin, open DefMiner in Caido's own renderer, start a scan, and confirm against the real theme variables that the five-tab strip and the toolbar indicator render as specified — the indicator in the fourth slot, not wrapping the 48px row, and the tab strip wrapping to a second row rather than scrolling at a narrow panel width. Then pause the scan and confirm the indicator stays present and changes tone. Carried from Phase 5's standing item; no automated check in this phase runs in Caido's renderer.

## User Setup Required

None.

## Next Phase Readiness

**Phase 06 is code-complete: 13 of 13 plans have summaries.** FIND-04's operator-visible surface is whole — the start form, the live readout, the lifecycle controls, the history list and the toolbar indicator. Phase verification runs next and should read the two WINDOWS entries above, both of which name an owner rather than leaving a gap unwritten.

---
*Phase: 06-retroactive-scan-deployment-reality*
*Completed: 2026-09-01*

## Self-Check: PASSED

- `packages/frontend/src/components/ScanHistoryList.vue` — present on disk
- `packages/frontend/src/components/ScanHistoryList.spec.ts` — present on disk
- `.planning/phases/06-retroactive-scan-deployment-reality/06-13-SUMMARY.md` — present on disk
- Commits `b0aaa49`, `b8ef181`, `ef1e722` — all reachable in `git log --all`
- Every `coverage.verification.ref` above was re-run and resolves to a named, passing case (`renders NO indicator for a completed scan` and `… for a discarded scan` are generated by the `for (const state of ["completed", "discarded"])` loop and appear under those exact names in the verbose reporter)
- Plan-level `<verification>` re-run in full: see the Verification Results table
