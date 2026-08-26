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

## Accomplishments

- **The re-scope is recorded as its OWNER's decision, not a planner's.** `.planning/REQUIREMENTS.md` carries a correction dated 2026-08-25, attributed to plan 01-35 and wave 35, naming THE OPERATOR as the decider, the unreachability of the old bar over an open language as the reason, six rounds of flat find-rate as the evidence, and the STORE-01 -> STORE-08 precedent by id as the route.
- **The three criteria are stated on both surfaces a mechanism or a future session reads** — the ledger correction and `CORE11_BOX_EXPECTED`'s failure message — with the superseded promise REPLACED, never appended beside.
- **CORE-11's discharge was re-executed against those three criteria**, one row per criterion, every row's evidence produced by running something in this session and proved live by a mutation.
- **The box moved `[ ]` -> `[x]` with its pin in ONE commit** (`f5652a1`, 2 files / 2 lines), after the table said so — not before it.
- **Both append-only histories point at the decision and restate no bound.**

## THE DECISION, QUOTED VERBATIM FROM THE LEDGER

Who decided:

> THE DECIDER IS THE OPERATOR — the owner of this requirement — and this correction records that decision rather than making it; no planner, no executor and no verifier is entitled to move this bar and none of them did.

Why:

> THE REASON IS THAT THE OLD ACCEPTANCE BAR WAS UNREACHABLE OVER AN OPEN LANGUAGE, NOT MERELY UNMET. That old bar — that the gate can be driven red on every spelling of every clause this entry's first sentence enumerates — asks a static scanner to close a set that does not close: the space of JavaScript spellings for *invoke a function through a value* is open, so no widening ever arrives at it, and a bar no amount of correct work can reach is a defect in the bar rather than in the work.

By what route:

> THE ROUTE IS THE ONE THIS PROJECT HAS ALWAYS USED FOR A REQUIREMENT RE-SCOPE — the STORE-01 → STORE-08 precedent, named here by id: STORE-01 carries the parenthetical recording what was re-scoped, on what date and in what forum, and STORE-08 is where that route ends.

The three criteria, numbered:

> This box's `[x]` may now mean, and may ONLY mean, that this requirement's residual is: (1) DERIVED — the gate's reach is derived from the code, generated from `RESOLVER_REGISTRY` rather than authored beside it, delivered in wave 27; (2) DRIFT-DETECTABLE — drift between text and code is mechanically detectable, so a divergence between either shipped span and the generated form turns this suite red, delivered in waves 27 and 29; and (3) THE SOLE BOUND — the disclosure is the only bound stated on every surface a reader touches, contradicted nowhere, delivered in wave 33 by deleting the gate file's hand-written bounds rather than by guarding them.

The narrowness, in the same passage:

> It does not claim the gate catches everything; it claims the gate's DESCRIPTION OF ITSELF is derived, drift-detectable and singular, which is the only promise a static gate over an open language can actually keep. CR-15 ... CR-16 ... and the twenty-six measured silences that span now carries are NAMED RESIDUALS UNDER THIS NEW BAR: disclosed and unclosed, not defects it waves away and not shapes it has closed. The class stays open because the space of JavaScript spellings is open.

<!-- gsd:write-continue -->
