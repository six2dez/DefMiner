---
phase: 06-retroactive-scan-deployment-reality
plan: 12
subsystem: ui
tags: [vue, tailwind, httpql, retroactive-scan, progress-readout, jsdom, playwright]

requires:
  - phase: 06-01
    provides: ScanPanel.vue as a thin tracer, scan-contract.ts, getScanStatus/startScan
  - phase: 06-03
    provides: the backpressure watermark and heldAtWatermark
  - phase: 06-05
    provides: pauseScan/resumeScan/discardScan and the widened startScan outcome union
  - phase: 06-09
    provides: the progress channel, useScanProgress, SCAN_LIFECYCLE_PRESENTATION
provides:
  - "The Scan tab's start form: DefMiner's clause read-only, the operator's optional clause in font-mono, and the exact composed string that will be sent"
  - "The progress readout implementing UI-SPEC devices D1–D5: fastest counters lead, a position line marching backwards, three distinct words for 'not moving', the no-denominator sentence, and nothing indeterminate"
  - "The lifecycle controls and the phase's one destructive confirmation, with D-10's asymmetry rendered rather than merely true"
  - "scanStatusWord — a pure, clock-injected precedence in which the watermark hold outranks the stall marker"
  - "A DefMiner-authored date formatter at two precisions over one frozen month table, with the date-only entry point plan 06-13 consumes"
  - "pauseScan/resumeScan/discardScan client wrappers, and a StartScanOutcome mirror corrected against the shipped backend"
  - "A third hostile-corpus surface loop, and the browser-measured layout half of the start-form backstop row"
affects: [06-13, scan history list, toolbar scan indicator, phase verification]

actuals:
  tokens: 45700
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "A copy module's Record over a closed union may hold FUNCTIONS rather than strings when a sentence carries a value — still exhaustive, still a typecheck error to omit a member, and able to omit a clause whose number DefMiner does not have"
    - "A presentation word computed by a pure clock-injected function in the contract module, so a precedence order is testable without mounting anything"
    - "role=\"alert\" on the DefMiner-authored sentence alone, never on the sibling element holding a target-influenced string"
    - "A second harness in tests/frontend-load.spec.ts, in its own directory, for a surface whose layout claim jsdom cannot express"

key-files:
  created:
    - packages/frontend/src/components/scan-contract.spec.ts
    - packages/frontend/src/components/ScanPanel.spec.ts
  modified:
    - packages/frontend/src/components/scan-contract.ts
    - packages/frontend/src/components/ScanPanel.vue
    - packages/frontend/src/api/client.ts
    - packages/frontend/src/api/client.spec.ts
    - packages/frontend/src/App.vue
    - packages/frontend/src/App.spec.ts
    - packages/frontend/src/safety/hostile.spec.ts
    - tests/frontend-load.spec.ts
    - .planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md

key-decisions:
  - "The watermark hold outranks BOTH the stall marker and the starting word. Outranking the stall marker is the field's whole reason for existing; outranking the starting word was added because a scan that meets a full queue immediately would otherwise read 'Starting…' for as long as the hold lasts."
  - "The composed preview does NOT re-validate the operator's clause. A rejected clause starts nothing at all and the surface says so; a preview that silently dropped an invalid term would show a string that was never going to be sent."
  - "role=\"alert\" sits on the rejection sentence and the clause echo is a silent sibling. A live region is read aloud the moment it changes, and that string came off a target's page."
  - "The reject-reason breakdown's not-durable sentence is not an edge case on this surface, it is the state: only the aggregate is on the status payload, so the real total always renders and six zeroes never do."
  - "The retention-eviction sentence omits the {cap} number because the cap is not on the status payload. A fabricated figure about the one mechanism that deletes the operator's history would be worse than the missing clause."
  - "ScanPanel owns the progress store and stops it on unmount, and emits open-health / open-settings rather than routing itself — the tab set keeps exactly one owner."

patterns-established:
  - "Two precisions, one formatter: positionText is built ON dateOnlyText rather than beside it, so a toolbar and a tab cannot disagree about the same scan"
  - "A source-level gate asserts the CALL (.toLocaleString() ) and not the WORD, so the module may keep the sentence explaining why it does not use one"
  - "A hostile-corpus loop that mounts the real component, not the display function, when the claim under test is about a surface"

requirements-completed: [FIND-03, FIND-04]

coverage:
  - id: D1
    description: "The operator can start a scan with their own HTTPQL clause and read the exact composed string that will be sent, with DefMiner's clause beside it as read-only context"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#composes the typed clause into the preview, DefMiner's first"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/scan-contract.spec.ts#shows DefMiner's clause first and the operator's last"
        status: pass
    human_judgment: false
  - id: D2
    description: "An empty operator clause is a valid, complete input — the scan runs over DefMiner's clause alone and the preview carries no empty parenthesis pair"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#starts on an EMPTY clause and shows a preview with no empty parens"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/scan-contract.spec.ts#emits no empty parenthesis pair for an empty operator clause"
        status: pass
    human_judgment: false
  - id: D3
    description: "The start form is ABSENT rather than disabled while a scan is running or suspended, and a sentence names which of the two states holds the slot"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#renders the readout and REMOVES the start form while a scan runs"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#names WHICH occupied state is holding the slot"
        status: pass
    human_judgment: false
  - id: D4
    description: "A rejected clause states a DefMiner-authored reason in a role=\"alert\" line, echoes the clause in its own sanitised font-mono element outside the sentence, retains every character the input accepted, and starts nothing"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#keeps every character the operator typed when the clause is rejected"
        status: pass
    human_judgment: false
  - id: D5
    description: "Before the first status read resolves the strip is absent and no counter cell renders — four zeroes are never shown"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#renders NO strip and NO counter cell — four zeroes are never shown"
        status: pass
    human_judgment: false
  - id: D6
    description: "The status line resolves to one of seven computed presentation words, with heldAtWatermark read from the payload and never inferred, so a legitimate backpressure hold can never fall through to the stall marker"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/scan-contract.spec.ts#lets the hold OUTRANK the stall marker — the reason the field exists"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#reads the watermark hold OFF THE PAYLOAD rather than inferring it"
        status: pass
    human_judgment: false
  - id: D7
    description: "The stall threshold is ARTIFACT_DEADLINE_MS, imported and never restated, and the marker derives from ANY counter moving rather than from the position date advancing"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/scan-contract.spec.ts#declares the stall threshold nowhere — it imports it"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#resets the stall clock when ANY counter moves, not when the date does"
        status: pass
    human_judgment: false
  - id: D8
    description: "The position line reads from lastCreatedAt and is absent before the first page resolves; dates are formatted by a DefMiner-authored formatter over a frozen twelve-entry month table with no locale call anywhere in the module"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/scan-contract.spec.ts#contains no locale-formatting call anywhere in the module"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/scan-contract.spec.ts#answers ABSENT for a value the backend did not supply"
        status: pass
    human_judgment: false
  - id: D9
    description: "The no-denominator sentence renders once, as prose, directly under the strip — not per counter, not in a tooltip, not behind a disclosure"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#puts the status line, the position line and the note on screen"
        status: pass
    human_judgment: false
  - id: D10
    description: "The strip carries exactly four counters at fixed height with no wrap; the other three plus the reject-reason breakdown sit in a <dl> below it, and the breakdown renders the real aggregate rather than six zeroes"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#keeps the strip's class attribute byte-identical as a counter grows"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#renders the rejected TOTAL rather than six zeroes"
        status: pass
      - kind: e2e
        ref: "tests/frontend-load.spec.ts#renders the strip at exactly the same height under a multi-megabyte clause"
        status: pass
    human_judgment: false
  - id: D11
    description: "A failed status read states the failure in words, MARKS the last numbers stale rather than freezing or clearing them, and offers Retry and Open Health"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#keeps the numbers, marks them stale IN WORDS, and offers both routes"
        status: pass
    human_judgment: false
  - id: D12
    description: "Nothing on the surface is indeterminate: no progress bar, no spinner, no pulse, no animated ellipsis, no shimmer — and their absence is asserted rather than merely true"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#renders nothing indeterminate anywhere on the surface"
        status: pass
    human_judgment: false
  - id: D13
    description: "Pause means pause — surface-toned, its own in-flight label, and the word 'Cancel' never used; Discard is a separate danger-toned control behind a confirmation naming what is destroyed and what is not, with the non-action focused by default"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#takes its own in-flight label and never a spinner"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#puts discard behind a confirmation whose escape holds focus"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ScanPanel.spec.ts#calls NOTHING when the confirmation is dismissed"
        status: pass
    human_judgment: false
  - id: D14
    description: "The operator's clause renders through safety/display.ts in font-mono, with no title and no data-* carrying it, proved over the shared hostile corpus by walking the rendered subtree against an explicit allowed-tag set"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/frontend/src/safety/hostile.spec.ts#hostile corpus rendered inert — scan start form (forCellText, 256)"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/safety/hostile.spec.ts#exercised EVERY case in the shared corpus"
        status: pass
      - kind: e2e
        ref: "tests/frontend-load.spec.ts#never widens the panel — the clause wraps inside its own element"
        status: pass
    human_judgment: false
  - id: D15
    description: "05-UI-SPEC.md amendment A1 applied in the same commit as the discard confirmation it describes — the destructive reservation names five elements"
    verification:
      - kind: other
        ref: "grep -c 'reserved for exactly these five' .planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md"
        status: pass
    human_judgment: false
  - id: D16
    description: "The Scan tab reads correctly as an operator surface: the readout is legible as progress without a fraction, the three 'not moving' words are distinguishable in situ, and the discard confirmation reads as reassuring rather than alarming"
    verification: []
    human_judgment: true
    rationale: "Whether a denominator-free readout READS as progress rather than as a stalled screen is the plan's own success criterion and is a judgment about perception. Every mechanism behind it is asserted (D5–D12), but no test can assert that an operator watching it for an hour concludes the scan is working."

duration: 46 min
completed: 2026-09-01
status: complete
---

# Phase 6 Plan 12: The Scan Tab's Operator Surface Summary

**A denominator-free progress readout that reads as progress: fastest counters leading a fixed 48px strip, a position line marching backwards through history, three distinguishable words for "not moving" with the backpressure hold outranking the stall marker, and a discard confirmation that names what it destroys and what it does not.**

## Performance

- **Duration:** 46 min
- **Tasks:** 3
- **Files modified:** 11 (2 created, 9 modified)
- **Suite:** 2,992 tests across 72 files, green — up from the 2,904 / 70 baseline

## Accomplishments

- **`scan-contract.ts` grown into the surface's whole vocabulary.** Every string 06-UI-SPEC.md's Copywriting Contract specifies for the start form, the progress readout, the four suspension reasons and the discard confirmation, as named constants and `Record`s over the engine's own closed unions.
- **`scanStatusWord` — the precedence that carries the phase.** Pure, clock-injected, and living outside the component so a precedence order is tested in seven lines rather than through seven mounts. The watermark hold outranks the stall marker at four times the threshold, asserted with a case whose header states why it is the only one here that could otherwise fail silently.
- **One date formatter, two precisions.** `positionText` is built ON `dateOnlyText` rather than beside it. No locale call, gated at source level against the CALL rather than the word so the module keeps the sentence explaining the rule.
- **`ScanPanel.vue` completed.** Two mutually exclusive states of one question, the live progress store owned and stopped here, a failed read that keeps its numbers and marks them stale in words, and the phase's one destructive confirmation with the non-action focused.
- **A third hostile-corpus surface loop**, extended rather than forked: the same cases, the same id-set exhaustiveness, driven through the real component.
- **The layout half measured in a real browser.** A 4,194,304-character clause leaves the four-cell strip at exactly 48.00px, the panel's own column scrolls (1255 > 600) and the panel never widens (1280 == 1280).
- **`05-UI-SPEC.md` amendment A1 applied in the same commit as the code it describes.**

## Task Commits

1. **Task 1 RED: the contract module's spec** — `09ecae8` (test)
2. **Task 1 GREEN: the vocabulary, the formatter, the status word, the client wrappers** — `2e60077` (feat)
3. **Task 2 RED: the component's behavioural spec** — `91c4f25` (test)
4. **Task 2 GREEN: `ScanPanel.vue`, App wiring, and amendment A1** — `e6280bf` (feat)
5. **Task 3: the hostile clause through two environments, both headers amended** — `236b4a7` (test)

## Files Created/Modified

- `packages/frontend/src/components/scan-contract.ts` — the whole surface vocabulary, the two-precision formatter, `scanStatusWord`, `counterFingerprint`, `composedPreview`
- `packages/frontend/src/components/scan-contract.spec.ts` — **created**; the pure half, in the node environment, mounting nothing
- `packages/frontend/src/components/ScanPanel.vue` — the start form, the readout, the controls, the discard confirmation
- `packages/frontend/src/components/ScanPanel.spec.ts` — **created**; the jsdom half
- `packages/frontend/src/api/client.ts` — the three lifecycle wrappers, `ScanCommandOutcome`, `ScanRef`, and a corrected `StartScanOutcome`
- `packages/frontend/src/api/client.spec.ts`, `packages/frontend/src/App.spec.ts` — both SDK stubs extended on their literal surfaces
- `packages/frontend/src/App.vue` — the three command closures, the progress subscription, and the panel's new props and emits
- `packages/frontend/src/safety/hostile.spec.ts` — a third `describeSurface` loop and an amended header
- `tests/frontend-load.spec.ts` — a second harness, the scan-surface layout leg, and an amended header
- `.planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md` — amendment A1

## Decisions Made

- **The hold outranks the starting word too, not only the stall marker.** The plan's behaviours list the starting word first, and taken literally that would leave a scan meeting a full queue immediately reading "Starting…" for as long as the hold lasts — saying nothing about the one thing actually happening. The ordering satisfies every stated behaviour (the starting-word case carries `heldAtWatermark: false`) and closes that case; the argument is written where the function is.
- **The composed preview does not re-validate the clause.** A second copy of `validateOperatorClause` on the frontend would be a second answer to a question with one authority, and a preview that silently dropped an invalid term would show a string that was never going to be sent — the one thing that element must never do. A rejected clause starts nothing and the surface says so instead.
- **`role="alert"` on the DefMiner sentence, not on the clause echo.** A live region is read aloud the moment it changes; putting a target-influenced string inside one would announce whatever a hostile page left in the operator's clipboard. The echo is a sanitised, silent sibling.
- **The reject-reason breakdown's "not stored" sentence is the state, not an edge case.** `ScanStatusPayload` carries only the aggregate `rejected` — the per-reason map lives in the backend's in-memory telemetry and never crosses the boundary — so the real total always renders and six zeroes never do.
- **The retention-eviction sentence omits `{cap}`.** The cap is not on the status payload. Naming a figure DefMiner cannot read would be a fabricated number about the one mechanism that deletes the operator's history, and the action the sentence asks for does not depend on it. `SuspendContext.rowCap` is declared so a later caller can supply one.
- **`dateOnlyText` ships `@internal` for one wave.** It has no cross-module consumer until plan 06-13's toolbar indicator and history rows, and `ignoreExportsUsedInFile: false` would report it. Exporting it now is what makes 06-13 consume this formatter instead of writing a second one; the tag comes off in that plan.
- **`ScanPanel` emits `open-health` / `open-settings` rather than routing.** The tab set keeps exactly one owner, and the panel stays a function of its props.
- **`now` ticks on a one-second interval.** Without it the stall marker could never appear on the build where it matters — a backend that has stopped answering produces no new payload. A ticking number is not an indeterminate indicator: nothing pulses or spins, and the only thing that changes is a word that means something.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `StartScanOutcome`'s frontend mirror had gone stale at plan 06-05**

- **Found during:** Task 1
- **Issue:** The backend answers three variants — `started`, `clause-rejected` with four `OPERATOR_CLAUSE_REJECTIONS` codes, and `refused` with `no-project` / `already-running` / `already-suspended` / `write-failed`. The frontend mirror carried only two variants, was missing `already-suspended` entirely, and still carried `operator-clause-unsupported`, a code the backend no longer answers. The rejection path the plan requires was unreachable, and a real `already-suspended` refusal would have rendered nothing.
- **Fix:** Mirror rewritten against the shipped backend, with the two occupied states distinguished and the `clause-rejected` variant added. `SCAN_REFUSAL_COPY` became a `Record` over the corrected union, so the drift is now a typecheck failure.
- **Files modified:** `packages/frontend/src/api/client.ts`, `packages/frontend/src/components/scan-contract.ts`
- **Verification:** `pnpm typecheck`; `scan-contract.spec.ts#gives every start refusal its own sentence, and names which state holds the slot`
- **Committed in:** `2e60077`

**2. [Rule 3 - Blocking] `App.vue` gained the wiring site the new props require**

- **Found during:** Task 2
- **Issue:** `App.vue` is not in `files_modified`, but `ScanPanel` grew five required props (`projectId`, `pause`, `resume`, `discard`, `subscribe`) and two emits. Without a wiring site the component would not typecheck, and the controls the plan's `<done>` describes would not reach a backend.
- **Fix:** Three command closures over the new client wrappers, a `subscribeScanProgress` closure returning the handle the panel owns, and the props and emit handlers on the mount site.
- **Files modified:** `packages/frontend/src/App.vue`
- **Verification:** `pnpm typecheck`; `pnpm vitest run packages/frontend/src` (452 passing)
- **Committed in:** `e6280bf`

**3. [Rule 3 - Blocking] Both SDK stubs extended on their literal surfaces**

- **Found during:** Task 1
- **Issue:** `client.spec.ts` and `App.spec.ts` declare the SDK surface as a literal rather than a cast — deliberately, so that a stub stops compiling when the real surface changes. Adding the three endpoints broke both, which is the mechanism working.
- **Fix:** Both stubs extended with the three commands, answering the moved form. The declining-guard form is asserted where it is rendered instead.
- **Files modified:** `packages/frontend/src/api/client.spec.ts`, `packages/frontend/src/App.spec.ts`
- **Verification:** `pnpm typecheck`
- **Committed in:** `2e60077`

**4. [Rule 3 - Blocking] `scan-contract.spec.ts` created, though not in `files_modified`**

- **Found during:** Task 1
- **Issue:** Task 1 is `tdd="true"` and its `<behavior>` block is entirely about pure functions, but the plan lists only `ScanPanel.spec.ts` as an artifact. A RED step against a component that does not yet render those functions would have tested the wrong thing.
- **Fix:** The pure half tested in its own file, in the default node environment — which is also a standing proof that the contract module has no DOM dependency and can be consumed by the toolbar indicator plan 06-13 builds.
- **Files modified:** `packages/frontend/src/components/scan-contract.spec.ts`
- **Verification:** 32 cases, green
- **Committed in:** `09ecae8`, `2e60077`

**5. [Rule 2 - Missing Critical] `role="alert"` moved off the element holding the operator's clause**

- **Found during:** Task 2
- **Issue:** The first draft wrapped the rejection sentence and the clause echo in one `role="alert"` container. A live region is read aloud the moment it changes, so a hostile clause — the string this surface treats as untrusted for exactly this reason — would have been announced verbatim to a screen-reader user, and the aggregate text also violated the "outside any sentence" rule when read as one node.
- **Fix:** `role="alert"` narrowed to the DefMiner-authored sentence; the echo is a sanitised, silent sibling. Asserted in both spec files.
- **Files modified:** `packages/frontend/src/components/ScanPanel.vue`
- **Verification:** `ScanPanel.spec.ts#keeps every character the operator typed when the clause is rejected`; the hostile loop's assertion that the echo carries no `role`
- **Committed in:** `e6280bf`, `236b4a7`

**6. [Rule 1 - Bug] The source-level locale gate asserted a WORD rather than a CALL**

- **Found during:** Task 1
- **Issue:** The first RED assertion greped the module for `toLocaleString`, which the module legitimately NAMES in its own argument for why it does not use one. The usual repair for such a gate is deleting the explanation.
- **Fix:** The assertion is over `.toLocaleString(` — a member call, which cannot appear in prose.
- **Files modified:** `packages/frontend/src/components/scan-contract.spec.ts`
- **Verification:** the case passes with the explanatory comment intact
- **Committed in:** `09ecae8`, `2e60077`

---

**Total deviations:** 6 auto-fixed (2 bugs, 1 missing critical, 3 blocking)
**Impact on plan:** No scope creep. Deviation 1 is a genuine defect the plan's own requirements exposed; deviations 2–4 are the wiring and test sites the plan's artifacts imply; deviations 5–6 tightened two assertions that would otherwise have shipped a weaker guarantee than they claimed.

## Issues Encountered

- **A single-line `<input type="text">` drops CR and LF at the element boundary.** Two corpus cases (`csv-lead-cr`, `embedded-newlines-and-tabs`) initially failed the "every character retained" assertion for that reason — the browser's behaviour, not DefMiner's. The assertion now reads back what the input actually accepted and asserts DefMiner does not alter it, which is the claim the retained-input rule actually makes. Recorded in the spec where a later reader would otherwise conclude the assertion had been weakened, and it is a genuine first line of defence worth knowing about.
- **In-flight labels are not observable against a command that resolves in the same microtask batch as the click.** The harness grew a `hangCommands` option; a case that had passed by accident would have passed on a component with no in-flight label at all.
- **The browser harness cannot change the panel's state by toggling a ref.** The panel holds the payload it last received — the point of its three-state model — so the run drives it through its own Refresh and Start controls, which is how the real surface moves between those states.

## Threat Flags

None. Every mitigation in the plan's threat register (T-06-61 through T-06-66) is implemented and asserted; no new network endpoint, auth path, file access pattern or trust-boundary schema change was introduced. `T-06-SC` holds: `packages/frontend/package.json` is byte-unchanged and no package was installed.

## Gate Results

| Gate | Result |
|---|---|
| `pnpm test` | 2,992 passed / 72 files, 0 skipped |
| `pnpm typecheck` | clean |
| `pnpm lint` | clean |
| `pnpm knip` | exit 0 |
| `pnpm check:bundle` | 1 specifier (`crypto`), unchanged |
| `pnpm check:css` | 119 rules against `#plugin--defminer` |
| `pnpm check:externals` | 1 bare specifier (`vue`), permitted |
| `git diff packages/frontend/package.json` | empty |
| `git diff packages/frontend/src/stores/coalescer.ts` | empty |
| `05-UI-SPEC.md` destructive list | five elements |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **Plan 06-13 is unblocked and has what it needs.** `dateOnlyText` is exported for the toolbar's bounded slot and the history rows' "reached {D MMM YYYY}"; consuming it is what lets its `@internal` tag come off. `SCAN_LIFECYCLE_PRESENTATION`, `ScanLifecycleBadge` and the corrected `StartScanOutcome` are all in place.
- **`ScanStatusPayload.analysed` remains `null` with no owner in the phase** (WINDOWS 94, declined with reason by 06-06 and 06-09). It renders as an em dash — absent, never a lying zero — and was deliberately not wired.
- **One open assumption inherited, not resolved here:** `overflow / scan-history-list`'s bound of 50 is the planner's assumption and belongs to plan 06-13.

---
*Phase: 06-retroactive-scan-deployment-reality*
*Completed: 2026-09-01*

## Self-Check: PASSED

- All created files exist on disk: `scan-contract.spec.ts`, `ScanPanel.spec.ts`.
- All five task commits resolve in `git log`: `09ecae8`, `2e60077`, `91c4f25`, `e6280bf`, `236b4a7`.
- `05-UI-SPEC.md`'s destructive reservation names five elements (both the table row and the list heading).
- Every plan-level `<verification>` command re-run at close-out and green; results in the Gate Results table above.
