---
phase: 01-skeleton-persistence-compatibility
plan: 35
subsystem: testing
tags: [core-11, outbound-prohibition, requirements-ledger, mutation-testing, gap-closure]

requires:
  - phase: 01-33
    provides: the whole-file wrap-tolerant quantifier guard, its three anchored exclusions and its 29 named exemptions
  - phase: 01-34
    provides: CR-15 and CR-16 as named measured-silence rows in the derived residual
provides:
  - The operator's 2026-08-25 re-scope of CORE-11's acceptance bar, recorded in .planning/REQUIREMENTS.md as a dated decision by the requirement's owner, with its reason and the STORE-01 -> STORE-08 route named by id
  - The three criteria (DERIVED, DRIFT-DETECTABLE, THE SOLE BOUND) stated in the ledger and in CORE11_BOX_EXPECTED's failure message, replacing rather than standing beside the superseded bar
  - A three-row discharge table, every row's evidence EXECUTED in this session and proved live by a mutation
  - CORE-11's checkbox moved [ ] -> [x] together with CORE11_BOX_EXPECTED in ONE commit
  - Pointer amendments on both append-only histories that restate no bound
affects: [01-verification, core-11, requirements-ledger]

actuals:
  tokens: 34000
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A requirement re-scope is recorded as a dated, attributed decision by the requirement's OWNER, by the STORE-01 -> STORE-08 route"
    - "A criterion verdict is stated with the reach of the mechanism that produced it; a scoped verdict is a pass, an unqualified one that overclaims is not"

key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
    - packages/backend/src/outbound-prohibition.spec.ts
    - .planning/STATE.md
    - .planning/WINDOWS.md

key-decisions:
  - "CORE-11's [x] now means, and may ONLY mean, three things: DERIVED, DRIFT-DETECTABLE, THE SOLE BOUND. The operator decided this on 2026-08-25 because the old bar was UNREACHABLE over an open language, not merely unmet."
  - "Row 3's verdict is SCOPED and the scope is part of the pass: met up to the guard's phrase-list reach under its named normalization, with two classes of unreached surface named."
  - "The box moved with CORE11_BOX_EXPECTED in one commit (f5652a1), after three rows each proved live by a mutation executed in this session."

patterns-established:
  - "Over-breadth is a DIFFERENT property from non-vacuity, and it is measured by enumerating what an exclusion actually swallows and classifying every occurrence."
  - "A mis-targeted mutation is a finding, not a discard: the measurement that disagreed with the prediction is what identified the mis-targeting."

requirements-completed: [CORE-11]

duration: 1h 5m
completed: 2026-08-26
status: complete
---

# Phase 01 Plan 35: CORE-11's Re-Scoped Acceptance Bar, Recorded and Discharged — Summary

**The operator's re-scope of CORE-11's acceptance bar is written into the ledger as a dated owner's decision with its reason and its route, and the requirement is then discharged against the three criteria that re-scope installs — every row proved by a mutation planted, watched red and restored in this session — flipping the box `[ ]` -> `[x]` together with its pin in one commit.**

## Performance

- **Duration:** ~1h 5m across two tasks and three agent contexts
- **Tasks:** 2 (Task 1 committed by a prior context at `e47ffdd`; Task 2 executed here)
- **Files modified:** 4
- **Commits:** 4 production + 1 metadata

## Task Commits

1. **Task 1: the operator decision, end to end** — `e47ffdd` (docs)
2. **Task 2a: the three-row discharge** — `9adb167` (docs)
3. **Task 2b: the box read off the table, with the pin, in ONE commit** — `f5652a1` (docs)
4. **Task 2c: both append-only histories** — `996c077` (docs)

<!-- gsd:write-continue -->
