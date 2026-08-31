---
phase: 06-retroactive-scan-deployment-reality
plan: 05
subsystem: scan
tags: [sqlite, state-machine, rpc, caido-sdk, backfill, httpql, err-02]

requires:
  - phase: 06-retroactive-scan-deployment-reality
    provides: "06-01's `scans` table, `startScan` / `advanceScan` / `getActiveScan`, the `SCAN_LIFECYCLE_STATES` / `SUSPEND_REASONS` vocabularies and the `ScanStatusPayload` field set; 06-03's `isHeldAtWatermark()` and the watermark-gated producer; 06-04's `validateOperatorClause` and the closed `OPERATOR_CLAUSE_REJECTIONS`"
  - phase: 05-inventory-evidence-and-the-operator-surface
    provides: "`store/retry.ts`'s guard-inside-the-predicate transition shape, `store/audit.ts`'s bounded-read-with-an-exported-limit idiom, `RetryOutcome`'s closed-code RPC shape, and `index.ts`'s ordering contract"
  - phase: 01-skeleton-persistence-compatibility
    provides: "`lifecycle.ts`'s monotonic `projectEpoch()`, `describeError`'s redact-before-truncate rule, and the `sql-discipline` / `error-redaction` static gates"
provides:
  - "The full scan transition set: `pauseScan`, `resumeScan`, `completeScan`, `discardScan`, `suspendOnEpochChange`, `suspendRunningOnInit`, `getScan`, `listScans`"
  - "`ScanTransition` — a write result carrying the READ-BACK row, because the driver cannot report what it wrote"
  - "`LIST_SCANS_SQL`'s suspended pin — a bounded read that can never cut an operator's unfinished work"
  - "`SCAN_LIST_DEFAULT_LIMIT` as a CLAMP rather than a fallback: the RPC cannot widen the read"
  - "`packages/backend/src/scan/lifecycle.spec.ts` — every route into and out of every lifecycle state"
  - "The `pauseScan` / `resumeScan` / `discardScan` / `listScans` RPCs and the widened `startScan` outcome"
  - "D-11's startup sweep in `init()` — ERR-02's early slice, declared by id at the call site"
  - "`getScanStatus`'s real `heldAtWatermark`, and `reconcileScanEpoch` — D-04 applied at the only calls that can notice"
affects: [06-06 retro counters and the audit rows, 06-09 per-page progress emit, 06-10 restart matrix, 06-12 scan status readout, 06-13 scan history list]

actuals:
  tokens: 27610
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A transition result that carries the read-back ROW rather than a single field, because several surfaces render several of its columns"
    - "A display bound with an in-statement exemption: `ORDER BY (state = 'suspended') DESC` pins a class of row into a bounded window without a second statement or a UNION"
    - "A closed refusal vocabulary whose members are proved reachable — or proved deliberately deferred with a named owning plan — by a mechanical spec assertion over the vocabulary array"
    - "An ordering assertion made by observing the database AT REGISTRATION TIME from inside the fake SDK's `register` callback, which is the only way to prove a step ran BEFORE a surface became reachable rather than merely sometime"
    - "A read RPC that applies a defensive, idempotent, guarded correction — chosen over faithfully reporting a state already known to be wrong"

key-files:
  created:
    - packages/backend/src/scan/lifecycle.spec.ts
  modified:
    - packages/backend/src/scan/scans.ts
    - packages/backend/src/scan/scans.spec.ts
    - packages/backend/src/api/spec.ts
    - packages/backend/src/index.ts
    - packages/backend/src/index.spec.ts

key-decisions:
  - "Every transition is a single `UPDATE … WHERE … AND state = …` with the guard INSIDE the predicate; the guard STATE is written into the statement text the way `START_SQL` already writes `'running'`, and only `DISCARD_SQL`'s two-state guard is bound — because a list has an arity and an arity can drift"
  - "A resume RE-BASES the row's epoch. `projectEpoch()` is a monotonic count of applied changes and never returns to a previous value, so a preserved epoch made D-04's suspension a one-way door and the must-have 'resumes only on explicit operator action' unreachable"
  - "A resume from the wrong project is refused by `project_id` SCOPING, not by a code of its own — the backend substitutes `currentProjectId()` on every call, so UI-SPEC's 'Resume it from that project' is enforced by a predicate rather than by a rule somebody has to remember"
  - "`startScan`'s clause rejection is its OWN outcome arm, not a reason folded in beside the occupancy refusals: the copy differs, the next action differs, and nothing is written on a rejection"
  - "`already-running` and `already-suspended` are distinguished because the operator's next action differs — pause or discard versus resume or discard — and collapsing them tells the operator to press a control that is not on screen"
  - "`CONTRACT_VERSION` stays 5, with the rule written down: bump when a SHIPPED reader could hold the old shape, and within one phase's own surface it cannot. 5 was bumped by 06-01 in this same phase"
  - "D-04's epoch suspension is applied from `startScan` AND from the polled `getScanStatus`, because the producer has no driver in this build and those are the only calls that can notice a project change in time to tell the operator the truth"
  - "The producer DRIVER was declined on scope grounds: it needs `producer.ts` and `test/fixtures/fake-sdk.ts`, neither of which is in this plan's `files_modified`"

patterns-established:
  - "Guard-in-the-predicate transitions, extended from one statement (`retry.ts`) to a whole state machine, with the guard state in the TEXT and only list-valued guards bound"
  - "Vocabulary-coverage-by-collection: a spec accumulates the codes its own cases produced and compares the set against the closed array, with a `DEFERRED_REASONS` map naming the owning plan for each member it deliberately does not reach"
  - "Registration-time database observation as an ordering proof inside an opaque `init()`"
  - "Non-vacuity by MUTATION for every load-bearing term: the ORDER BY pin, the vocabulary map and the sweep's placement were each removed, the exact expected case observed to fail, and the change reverted"

requirements-completed: [FIND-03, FIND-04]

coverage:
  - id: D1
    description: "Cancel means PAUSE: pausing suspends the scan and keeps its position, and resume continues from exactly where it stopped (D-10)"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/lifecycle.spec.ts#THE HAPPY PATH: start → advance → pause → resume → advance → complete, position intact"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#pauses a RUNNING scan and keeps its position — a pause, never a cancel"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#PAUSE keeps the position, RESUME returns it to running, DISCARD destroys the position only"
        status: pass
    human_judgment: false
  - id: D2
    description: "Discarding is a separate, explicit action that removes the scan and its position, and is never reachable by mis-clicking the pause control"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/lifecycle.spec.ts#start → pause → DISCARD: the position is gone and the results are not"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#DISCARD destroys the position and nothing else"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#discards from EITHER active state, and never rewrites a terminal row"
        status: pass
    human_judgment: false
  - id: D3
    description: "A running scan SUSPENDS when the project epoch changes, keeps its position, and resumes only on explicit operator action (D-04)"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/lifecycle.spec.ts#start → EPOCH CHANGE: suspended with `project_changed`, resumable only from the project it belongs to"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#the EPOCH GUARD is a predicate: a matching epoch changes nothing"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#D-04: a project change SUSPENDS the running scan, and `getScanStatus` is where it is noticed"
        status: pass
    human_judgment: false
  - id: D4
    description: "`init()` moves every `running` scan row to `suspended` with a reason, NULLs `last_cursor`, and never auto-resumes — ERR-02's early slice (D-11)"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/lifecycle.spec.ts#ERR-02: after the startup sweep NO row is `running`, in any project, and nothing auto-resumed"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#D-11's STARTUP SWEEP runs BEFORE any scan endpoint is reachable (ERR-02)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#the sweep NEVER auto-resumes — a second call is a no-op, not a restart"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every state transition is a single guarded statement with `project_id` in the predicate; no read-then-write, no RETURNING, no module-scope prepare"
    requirement: FIND-03
    verification:
      - kind: automated_ui
        ref: "pnpm vitest run packages/backend/src/store/sql-discipline.spec.ts"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "One scan per project is an invariant: the partial unique index makes a second start fail at the driver, and the RPC reports which of the two occupied states is holding the slot"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/lifecycle.spec.ts#ONE AT A TIME, both ways: a running occupant is refused by the driver, a suspended one by the read"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#a start beside a SUSPENDED scan is refused with its own code, not the running one"
        status: pass
    human_judgment: false
  - id: D7
    description: "The scan history is BOUNDED AT READ, clamped so no caller can widen it, with every suspended scan pinned into the window regardless of age (U6-1)"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#PINS a suspended scan into the window even when the bound would cut it"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#CLAMPS a caller's limit down to the bound — the RPC cannot widen it"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#breaks a `started_at` tie on `scan_id DESC`, identically across two reads"
        status: pass
    human_judgment: false
  - id: D8
    description: "`startScan` runs the operator clause through `validateOperatorClause`; a comment-bearing clause returns a closed rejection code and writes no row"
    requirement: FIND-03
    verification:
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#startScan REJECTS a comment-bearing clause with a closed code and writes NO row"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#startScan ACCEPTS a valid clause and composes it LAST, exactly as sent"
        status: pass
    human_judgment: false
  - id: D9
    description: "`getScanStatus` carries a required boolean `heldAtWatermark` and a `composedFilter` equal to `composeScanFilter`'s output byte for byte"
    requirement: FIND-04
    verification:
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#getScanStatus's composedFilter is `composeScanFilter`'s output BYTE FOR BYTE"
        status: pass
    human_judgment: false
  - id: D10
    description: "The resume boundary is strictly less-than: the last-walked request is never re-walked and no request between it and the previous boundary is skipped (FIND-03 adjacency edge)"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/lifecycle.spec.ts#the RESUME BOUNDARY is strictly less-than: id N is not re-walked and id N-1 is not skipped"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/lifecycle.spec.ts#a resumed scan continues from its OWN boundary, not from the start of history"
        status: pass
    human_judgment: false
  - id: D11
    description: "The lifecycle is drivable end to end from the frontend against a real Caido: pause, resume and discard behave as the copy promises on a live multi-hour backfill"
    verification: []
    human_judgment: true
    rationale: "Every assertion above runs against `sqlite-fixture.ts`, which is single-connection and cannot reproduce the pool-affinity failure mode, and against a fake SDK that has no `requests.query()`. Nothing here proves the transitions behave under Caido's pooled driver, and the producer that would exercise them across hours of real traffic has no driver in this build (see the Deviations section). Plan 06-10's restart matrix is where this becomes measured."

duration: 26 min
completed: 2026-08-31
status: complete
---

# Phase 06 Plan 05: The Scan State Machine and its RPCs Summary

**A scan that survives a restart, a project switch and a mis-click: eight guarded single-statement transitions, a startup sweep that discharges ERR-02 early and says so, and six endpoints that drive the whole lifecycle from the frontend with nothing but closed DefMiner-authored codes crossing the boundary.**

## Performance

- **Duration:** 26 min
- **Started:** 2026-08-31T17:30:00Z
- **Completed:** 2026-08-31T17:56:00Z
- **Tasks:** 3 of 3
- **Files modified:** 6 (5 modified, 1 created) — exactly this plan's `files_modified`, no more

## Accomplishments

- **The transition set is complete and every guard is inside its own predicate.** `PAUSE_SQL`, `RESUME_SQL`, `COMPLETE_SQL`, `DISCARD_SQL`, `SUSPEND_ON_EPOCH_SQL`, `SUSPEND_RUNNING_ON_INIT_SQL`, `GET_SCAN_SQL` and `LIST_SCANS_SQL` — each a complete literal, one statement, fully bound with positional `?`, `project_id` in the WHERE, `prepare()` inside the call. There is no read-then-write anywhere on this path, because this driver cannot make two operations atomic and the interleaving that permits is exactly the running walk being reset.
- **D-11's startup sweep runs before any scan endpoint is reachable, and the ordering is asserted rather than asserted-about.** `index.spec.ts` records how many rows still said `running` at the instant each endpoint became callable, from inside the fake SDK's `register` callback. A check after `init()` returns would only prove the sweep ran *sometime* — and "sometime" is exactly the window in which a caller can see a scan the sweep has not moved. Moving the sweep after the registrations fails the case.
- **ERR-02 is discharged early and declared by id at the call site.** The comment in `init()` names ERR-02, quotes its rule, and says Phase 2 inherits the pattern — one statement, a reason, and never an auto-resume — rather than inventing a second one. `lifecycle.spec.ts` carries a case named for it.
- **The three stubs earlier plans deferred here are closed.** The `operator-clause-unsupported` placeholder is gone and `startScan` runs the clause through 06-04's `validateOperatorClause` (WINDOWS 71); `getScanStatus` reports 06-03's real `isHeldAtWatermark()` (WINDOWS 66, 73); `scans.ts`'s new shape after 06-03's deletion of `isRequestFinished` was picked up without incident.
- **A bounded history that cannot hide unfinished work.** `LIST_SCANS_SQL` leads its ORDER BY with `(state = 'suspended') DESC`, so a suspended scan is pinned into the window regardless of age — asserted by a case that fails when the term is removed, not by reading the statement text. The pin costs at most one row of the window, because the one-at-a-time rule refuses a start while a suspended scan holds the slot.
- **A real bug found and fixed on the way through: D-04's suspension was a one-way door.** See Deviations.

## Task Commits

1. **Task 1: The transition set** — `8298150` (feat)
2. **Task 2: The lifecycle spec** — `0311027` (test)
3. **Deviation fix (found during Task 3):** the epoch re-base — `2e6e9a6` (fix)
4. **Task 3: The scan RPCs and the startup sweep** — `7852cb6` (feat)

## Files Created/Modified

- `packages/backend/src/scan/scans.ts` — the eight statements, their transition functions, `ScanTransition`, `getScan`, `listScans`; the module header gains a section stating the one-scan-per-project invariant and where it lives; `SCAN_LIST_DEFAULT_LIMIT` becomes a clamp and its JSDoc admits the number is an assumption
- `packages/backend/src/scan/scans.spec.ts` — sixteen statement-level cases across two new describe blocks
- `packages/backend/src/scan/lifecycle.spec.ts` — **new.** Eight route-level cases, including the ERR-02 case and the mechanical suspension-vocabulary assertion
- `packages/backend/src/api/spec.ts` — `ScanRef`, `ScanListRequest`, `ScanHistoryRow`, `ScanCommandOutcome`, the widened `StartScanOutcome`, the four new `api` entries, and the paragraph recording why `CONTRACT_VERSION` stays 5
- `packages/backend/src/index.ts` — the sweep at step 5c, `reconcileScanEpoch`, `scanCommandRefused`, `toHistoryRow`, the rewritten `startScan`, the real `heldAtWatermark`, and the four registrations behind one `runScanCommand` helper
- `packages/backend/src/index.spec.ts` — nine new cases and the extended `CONTRACT_ENDPOINTS` gate

## Decisions Made

Recorded in the frontmatter's `key-decisions`. The two worth reading in full are the epoch re-base (below, under Deviations) and the `CONTRACT_VERSION` non-bump, which is written into `spec.ts` as a rule the next author can apply rather than as an exemption this plan claimed: bump when a *shipped* reader could hold the old shape, and within one phase's own surface it cannot.

## Where this brief and the plan disagreed about scope

The executor brief said WINDOWS 74 assigns the **producer driver** — the caller that actually runs `runScanProducer` — to this plan, on the grounds that `index.ts` is in its `files_modified`. **The plan won, and the driver was not built.** The test the brief itself supplied is what settled it:

`runScanProducer(deps)` requires `sdk.requests.query()`. `PluginSdk` in `api/spec.ts` does not declare it, and `test/fixtures/fake-sdk.ts` does not implement it — so wiring the driver means editing `packages/backend/src/scan/producer.ts` (to give the epoch suspend a per-page hook) **and** `packages/backend/test/fixtures/fake-sdk.ts` (to make every existing `init()` case still typecheck). Neither file is in `06-05-PLAN.md`'s `files_modified`, neither appears in Task 3's `<read_first>`, and none of Task 3's acceptance criteria mention driving the producer. Building it would have been the same half-owned edit 06-04 correctly declined for the refusal placeholder.

What *was* delivered instead, because it is reachable inside this plan's file set: `suspendOnEpochChange` is wired at `startScan` and at the polled `getScanStatus` through `reconcileScanEpoch`, so D-04's suspension actually fires in the shipped build. `completeScan` ships with a full spec and **no production caller** — its only honest call site is the producer's `completed` stop. Recorded as an open window, with the note that **no remaining plan in this phase names `index.ts` together with `producer.ts` or `fake-sdk.ts`, so the driver currently has no owner.** That is a phase-level gap for the verifier, not a 06-05 omission.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] D-04's suspension was a one-way door: a resume could never stick**

- **Found during:** Task 3, while wiring the `resumeScan` endpoint
- **Issue:** `projectEpoch()` is a *monotonic count of applied project changes* (`lifecycle.ts`: "Bumped by every applied change"). It never returns to a previous value — switching away from a project and back gives a *higher* number, not the old one. `RESUME_SQL` as first written preserved the row's epoch, and `runScanProducer` re-checks `scan.epoch !== projectEpoch()` every page. A scan suspended by D-04 would therefore have suspended itself again on its very first page, for ever. The must-have "a running scan … resumes only on explicit operator action" was **unreachable**, not merely awkward.
- **Fix:** `RESUME_SQL` sets `epoch = ?` to the epoch in force at the moment the operator resumes, and `resumeScan` takes `currentEpoch`. The reasoning is written at the statement: the epoch is an in-process **freshness token** for catching a change that lands mid-flight, not a project identity — the identity is `project_id`, which is in every predicate and comes from `currentProjectId()`, never from the caller. A resume from the wrong project is refused *before* the statement is reached, by the scoping: the row is not in that partition, so `getScan` does not find it and the RPC answers `no-scan`. That is 06-UI-SPEC.md's "Resume it from that project" enforced by a predicate.
- **Relation to the plan text:** Task 2's behaviour line reads "a resume under the NEW epoch is refused, and a resume under the ORIGINAL epoch continues". Under a monotonic counter the original *number* is unreachable, so that line only has a satisfiable reading if the discriminator is the **project** rather than the number — which is the reading shipped, and which matches the UI-SPEC copy. Stated here rather than quietly reinterpreted.
- **Files modified:** `packages/backend/src/scan/scans.ts`, `scans.spec.ts`, `lifecycle.spec.ts`
- **Verification:** `lifecycle.spec.ts`'s epoch case now walks the whole round trip — suspended keeps the old epoch, a resume from the other project cannot reach the row, a resume from its own project re-bases and then *advances a page*, and D-04 re-arms on the next change. `index.spec.ts`'s D-04 case asserts the same end to end through the RPCs, with the failure message naming the one-way door.
- **Committed in:** `2e6e9a6`

**2. [Rule 3 — Blocking] A task-1 acceptance criterion is unsatisfiable by this plan's own invariant**

- **Found during:** Task 1
- **Issue:** The criterion reads "`suspendRunningOnInit` over a project holding **two `running` rows** moves both in one statement and returns 2". Two running rows in one project cannot exist: `idx_scans_one_running` is a partial UNIQUE index on `(project_id) WHERE state = 'running'`, created in migration step v5, and it refuses the second insert — including a raw one. That index *is* this plan's own one-at-a-time must-have.
- **Fix:** the set-based property is asserted over **two projects** instead: each sweep returns 1, each is scoped to its own project, and the other project's row is proved untouched. The ERR-02 case in `lifecycle.spec.ts` carries the stronger claim the criterion was reaching for — that *no row anywhere* is left `running`. The reason the criterion is unsatisfiable is written into the spec case itself, so the next reader does not re-derive it.
- **Files modified:** `packages/backend/src/scan/scans.spec.ts`
- **Committed in:** `8298150`

**3. [Rule 3 — Blocking] `SCAN_LIST_DEFAULT_LIMIT` stays at 200, not the plan's 50**

- **Found during:** Task 1
- **Issue:** the plan's action text specifies `SCAN_LIST_DEFAULT_LIMIT = 50`; 06-01 had already shipped it as `200`, exported, with a spec case asserting against the constant.
- **Fix:** kept at 200. The plan itself says the number is "an ASSUMPTION, not a measurement" and that "the number may move", and makes the **shape** binding — a stated bound, enforced at read, suspended rows exempt, the truncation said in words. All four ship. Changing an already-exported, already-asserted constant to a different unmeasured number would have been churn with no evidence behind it. The constant's JSDoc now says out loud that it is an assumption and names plan 06-13, which owns the surface that renders the truncation sentence, as the carrier of that assumption.
- **Files modified:** `packages/backend/src/scan/scans.ts`
- **Committed in:** `8298150`

---

**Total deviations:** 3 auto-fixed (1 × Rule 1 bug, 2 × Rule 3 blocking).
**Impact on plan:** No scope creep — the six files touched are exactly this plan's `files_modified`. Deviation 1 was necessary for a must-have truth to be reachable at all; deviations 2 and 3 are the plan's own text meeting the code it had already shipped, and both are resolved in the direction the plan's own reasoning points.

## TDD Gate Compliance

Tasks 1 and 2 carry `tdd="true"`, but `workflow.tdd_mode` is `false` in `config.json`. Task 1's statements and its spec landed in **one `feat()` commit** rather than a separate RED then GREEN pair; task 2's spec is its own `test()` commit. Rather than claim a RED phase that was not executed, non-vacuity was established by **mutation**, and each mutation was run and reverted:

| Load-bearing term removed | Expected failure | Observed |
|---|---|---|
| `LIST_SCANS_SQL`'s leading `(state = 'suspended') DESC` | the suspended-pin case only | 1 failed, 30 passed |
| `DEFERRED_REASONS`' single entry | the vocabulary case only | 1 failed, 7 passed |
| The startup sweep moved after the RPC registrations | the sweep-ordering case only | 1 failed, 57 passed |

Recorded as an open window so the phase verifier sees it rather than inferring it from commit shapes.

## Issues Encountered

None beyond the deviations above. `pnpm exec eslint` (not `npx`) is required in this repo — `npx` trips the `devEngines.packageManager` guard.

## User Setup Required

None — no external service configuration required.

## Verification

| Gate | Result |
|---|---|
| `pnpm test` | **2491 passed / 65 files** (baseline 2460; +31 from this plan) |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm knip` | exit 0 — tag hints only, no unused export in `scan/scans.ts` |
| `pnpm build` (via `pretest`) | exit 0 |
| `pnpm check:bundle` / `check:css` / `check:externals` | exit 0 / exit 0 / exit 0 |
| `sql-discipline.spec.ts` | zero violations over all three `scan/` modules |
| `error-redaction.spec.ts` | zero violations over the new modules |

## Known Stubs

| Stub | File | Why |
|---|---|---|
| `completeScan` has no production caller | `packages/backend/src/scan/scans.ts` | Its only honest call site is the producer's `completed` stop, and the producer has no driver in this build. Specced in full; recorded as an open window with the note that no remaining plan owns the driver. |
| `ScanStatusPayload.analysed` is still `null` | `packages/backend/src/index.ts` | Unchanged from 06-01: there is no `analysed` column on `scans`, the number belongs to the consumer at the far end of the queue, and plan 06-06 owns wiring it. Absent, never zero (WINDOWS 65, still open and still 06-06's). |

## Next Phase Readiness

**Ready for 06-06** (retro counters, the audit rows, and the retention-eviction suspension — `scans.ts` is in its `files_modified` and it will find the transition set in place, plus `DEFERRED_REASONS` in `lifecycle.spec.ts` naming it as `retention_eviction`'s owner, which its arrival must clear).

**Ready for 06-09 / 06-12 / 06-13**, which read `ScanCommandOutcome`, `ScanHistoryRow` and the widened `StartScanOutcome` across the RPC. `06-13` should note the `SCAN_LIST_DEFAULT_LIMIT = 200` assumption it now carries.

**One concern for the phase verifier:** the producer driver has no owning plan. `runScanProducer` is fully built and fully specced and nothing calls it, so no retroactive scan actually walks in the shipped build — `startScan` inserts the row and returns. The lifecycle around it is complete and drivable; the walk is not driven.

---
*Phase: 06-retroactive-scan-deployment-reality*
*Completed: 2026-08-31*

## Self-Check: PASSED

All key files exist on disk; all four task commits resolve in `git log --all`.
