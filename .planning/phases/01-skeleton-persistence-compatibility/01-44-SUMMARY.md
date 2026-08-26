---
phase: 01-skeleton-persistence-compatibility
plan: 44
subsystem: testing
tags: [vitest, gate-discipline, core-11, cr-28, deletion-only, disclosure-correction]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "The independent CR-23 endpoint pins, their synthetic decoy fixture, and pass 11's reproduced CR-24 through CR-28 findings"
provides:
  - "One describe-scope full-line registry resolution consumed by the uniqueness check, the real pin and the fixture"
  - "A CR-28 fixture watched failing under the exact shared-resolution regression it claims to catch"
  - "CR-24, CR-25, CR-27 and WR-61 removed in one deletion-only commit whose added-token set is empty relative to its removed-token set"
  - "A dated disposition of all seven surviving case-insensitive `enclos` occurrences without adding another live completeness claim"
affects: [01-45, verification-pass-12, core-11]

actuals:
  tokens: 3513
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A synthetic regression fixture consumes the same shared resolver as the production pin, while its independent prefix side remains deliberately separate"
    - "False disclosure is closed by deletion and guarded by added-token-minus-removed-token set difference"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts

key-decisions:
  - "Hoist only the registry full-line locator; LIST_OPEN and EXCLUSIONS' prefix locators remain unchanged because CR-28 names one construct and CR-23 depends on expression independence."
  - "Delete the four false or stale disclosure families without replacement; a deletion removes a false claim and establishes no true one."
  - "Record the seven surviving `enclos` occurrences here, not in the gate file, because this is a dated execution record rather than a new live completeness claim."
  - "Treat 9,277 as the pre-edit surface count: pass 11's 9,285 included its own eight-line instrumentation block; the inherited 104-line amputation delta remains correct."

patterns-established:
  - "Guard shared behavior through a shared resolver, then watch the exact mutation fail before trusting the guard"
  - "For deletion rounds, prove both negative line/byte delta and zero new word tokens, and watch that proof fail against a planted token"

requirements-completed: []

coverage:
  - id: D1
    description: "CR-28's fixture reads the shared full-line registry resolver and turns red when that resolver becomes a prefix matcher"
    requirement: CORE-11
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#a PREFIX locator and a FULL-LINE locator disagree once a longer identifier is declared above the real opener — CR-23's shape, over synthetic lines"
        status: pass
      - kind: other
        ref: "watched mutation: shared resolver changed to startsWith -> fixture RED, expected index 1 not to equal index 1"
        status: pass
    human_judgment: false
  - id: D2
    description: "CR-24, CR-25, CR-27 and WR-61 are absent while their required record, bound, disowning statement and sweep results survive"
    requirement: CORE-11
    verification:
      - kind: other
        ref: "01-44 Task 2 verify: ten removed-text greps at zero; four survivor greps non-zero; case-insensitive enclos population 10 -> 7"
        status: pass
      - kind: other
        ref: "commit 52b9906: removed=34 added=13 newtokens=0 bytes=-2158"
        status: pass
    human_judgment: false
  - id: D3
    description: "The deletion-only token gate rejects a replacement word rather than merely passing an all-deletion diff"
    requirement: CORE-11
    verification:
      - kind: other
        ref: "watched token mutation: PLANTEDWORD -> NEWTOK=1; restored commit -> NEWTOK=0"
        status: pass
    human_judgment: false
  - id: D4
    description: "The round preserves the must-not: no shipped source change, no compiler/containment mechanism, CORE-11 remains unchecked, and the full test/build boundary stays green"
    requirement: CORE-11
    verification:
      - kind: integration
        ref: "pnpm test: 31 files / 1381 tests; tsc, typecheck, lint, knip, build:backend and check:bundle pass; bundle import set is exactly crypto"
        status: pass
    human_judgment: false
  - id: D5
    description: "Whether removing the currently falsified disclosures discharges CORE-11 criterion (3) or the whole overclaim class"
    verification: []
    human_judgment: true
    rationale: "Explicitly not closed: the fixture can still be bypassed by an inline predicate at the pin call site, deletion proves no positive proposition, and pass 12 owns the criterion and threat-status decision."

duration: 15 min
completed: 2026-08-26
status: complete
---

# Phase 01 Plan 44: Shared CR-28 Resolver and Deletion-Only Disclosure Closure Summary

**The decorative CR-28 fixture now consumes the shared registry resolver and fails under its named regression, while four false disclosure families were removed in a mechanically deletion-only commit that was itself watched rejecting a planted word.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-26T23:41:00+02:00
- **Completed:** 2026-08-26T23:56:00+02:00
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Hoisted `REGISTRY_OPEN` and a zero-based `registryOpenIndex(readonly string[])` beside `lineOf`; the hit count, one-based real pin and fixture all consume it. The full-line equality occurs once.
- Watched pass 11's previously silent shared-resolution mutation turn the fixture red, then repeated it with the registry shadow decoy and counted the same 104-line amputation.
- Removed CR-24, CR-25, CR-27 and WR-61 without replacement; every required survivor remains.
- Proved the deletion commit adds no word absent from what it removes, after first watching that proof name and reject `PLANTEDWORD`.

## Task Commits

1. **Task 1: CR-28 fixture consumes the shared resolver** — `1267cf3` (`fix`)
2. **Task 2: deletion-only disclosure closure** — `52b9906` (`test`)

## Files Created/Modified

- `packages/backend/src/outbound-prohibition.spec.ts` — shared full-line registry resolution, executable CR-28 fixture, and deletion-only removal of the four disclosure families.

## Task 1 Evidence — CR-28

### Pre-edit reconciliation

The source identifiers and case titles were re-derived before editing. The relevant anchors still resolved to the plan's lines: registry opener 4161, quantifier-list opener 5985, exclusions `983..1564`, `5985..5995`, and `4161..5793`; widest shadow 574.

The four largest pre-edit shadows were:

| size | raw low | raw high | token |
| ---: | ---: | ---: | --- |
| 574 | 419 | 1574 | `SPELLING (operator, by POSITION) RESOLVED BY REPORTS` |
| 283 | 2 | 284 | gate-file title |
| 202 | 7012 | 8947 | `it.each([` |
| 133 | 8986 | 9118 | `WHY THIS EXISTS, AND WHAT IT IS NOT.` |

One reconciliation disagreement was found and not absorbed: the pre-edit surface is **9,277**, not 9,285. A temporary one-physical-line probe reported 9,278; subtracting that probe gives 9,277, which also follows from `gateLines.length 11,503 - (582 + 11 + 1,633) = 9,277`. Pass 11's stored 9,285 included its own eight-line instrumentation block. Its decoy run likewise included those eight lines, so its **104-line delta is valid** even though both absolute figures were inflated.

### Watched negative behavior

Step 1 changed the shared full-line equality to `startsWith("export const RESOLVER_REGISTRY")`. The gate went red with the intended title:

> `a PREFIX locator and a FULL-LINE locator disagree once a longer identifier is declared above the real opener — CR-23's shape, over synthetic lines`

The full assertion reported that both finders resolved to index 1 and failed with `expected 1 not to be 1`. This is the same mutation that pass 11 observed at 441/441 green.

Step 2 added `RESOLVER_REGISTRY_SHADOW` at raw line 4057 on top of that mutation. The fixture remained red; the uniqueness pin also failed because the mutated resolver matched two lines. In-suite measurement was:

| state | surface | exclusions |
| --- | ---: | --- |
| prefix mutation, no decoy | 9,277 | `983..1564`, `5985..5995`, `4161..5793` |
| prefix mutation plus decoy | 9,173 | `983..1564`, `5986..5996`, `4057..5794` |

The exclusion-three opening slid `4161 -> 4057` and exactly **104 pre-existing lines** left the scanned surface. The probe, decoy and mutation were removed before commit.

### Restored behavior and residue

After restoration: registry hit count 1, list hit count 1, both prefix/full openers resolve to 4161 and 5985 respectively, and the widest shadow remains 574. Task 1's final surface is 9,275; its net two-line reduction is below the named shadow and does not change the pin.

The one new disclosure sentence was checked against the executed reach: changing the **shared** resolver turns the fixture red; leaving that binding alone and inlining a new prefix predicate at the pin's call site still bypasses it. The tautology class is therefore disclosed, not claimed closed.

## Task 2 Evidence — Deletion Only

### Re-derived population

Before editing, case-insensitive `enclos` occurred ten times at lines `9242`, `9382`, `9397`, `9411`, `9465`, `10754`, `10983`, `10997`, `11126`, and `11134`; case-sensitive search found eight. Pass 11 named only five of the ten. This was treated as a finding and is why the population was re-derived rather than cited.

After deleting the three contraposition clauses, the population is seven. Dated disposition at this commit:

- `9242`, `9409`, `9463`, and `10737` describe the backward scan continuing or trying the next enclosing construct when it falls through; they do not assert that a resolved anchor computes containment.
- `9380` names the documented target of the proximity search, not a compiler/frame identity.
- `9395` is the authority that explicitly says the word would overclaim containment.
- `11105` describes the synthetic test setup changing the occurrence's surrounding construct, not the resolver's claimed reach.

No replacement enumeration was written into the gate file.

### Cut boundaries and survivors

| item | removed grep | final | required survivor | final |
| --- | --- | ---: | --- | ---: |
| CR-24 site 1 | `Located by text TODAY` | 0 | `01-39-SUMMARY.md` pointer | 2 |
| CR-24 site 2 | `two identically-headed table headers sit at lines` | 0 | record lines 531 and 931 on disk | present, file unchanged |
| CR-25 | `grow to 573` | 0 | `up to that maximum` | 1 |
| CR-27 messages | three prescribed containment clauses | 0 each | `would claim a containment this scan does not compute` | 1 |
| CR-27 bracket | `claims that a well-formed anchor identifies anything` | 0 | seven dated survivor dispositions above | recorded here only |
| WR-61 | `8,846`, `11,417`, `11,416` | 0 each | `blanking line 1` sweep results | 2 |

Every added line is a shortened form of removed lines; reading each boundary confirms every word on an added line was present on a removed line. No total was re-derived and written back: removing a stale scope figure does not make either sweep more exhaustive than it was.

### Deletion gate watched

The final commit resolved by its required subject and touched exactly one file:

```text
DELETION-ONLY-OK removed=34 added=13 newtokens=0 bytes=-2158
```

Before trusting that result, `PLANTEDWORD` was appended to one added line and the commit amended. The set difference reported:

```text
PLANTEDWORD
NEWTOK=1 (expected non-zero)
```

The word was removed, the commit amended back, and the same check returned `NEWTOK=0`.

## Verification

All plan verification ran after both commits:

- Gate spec: **441/441**, 1 file, exit 0.
- Full suite: **1,381/1,381**, 31 files, exit 0.
- `tsc --build`: exit 0.
- `pnpm typecheck`: exit 0.
- `pnpm lint`: exit 0.
- `pnpm knip`: exit 0.
- `pnpm build:backend`: exit 0.
- `pnpm check:bundle`: exactly one import specifier, `crypto`.
- Shipped module inventory: **23**, unchanged; shipped source changes: **0**.
- Round-base compiler-API diff hits: **0**; narrowing-token diff hits: **0**. This plan computed no containment by any means.
- Widest-shadow exact pin: **574**, unchanged. All removed lines were far below its raw `419..1574` span; the pin was not moved.
- Final file: `wc -l` 11,479, `gateLines.length` 11,480, derived scanned surface 9,254. These are this summary's dated record, not new live totals in the gate.
- `.planning/REQUIREMENTS.md` diff against `882ff17`: 0 lines; `CORE11_BOX_EXPECTED` remains the unchecked form once; `.planning/` was clean at both task gates.
- `01-PROBE.md` still contains `38 == 27 + 11`; no probe row moved.

## Security Position

The `Threat Register — Open` table was re-read by selecting rows whose severity is `high` and status is `open`. It yields exactly `T-01-289`, `T-01-283`, `T-01-264`, `T-01-280`, `T-01-239`, and `T-01-263`.

This plan closes the disclosure half of `T-01-289`, `T-01-283`, and `T-01-263`. `T-01-264`, `T-01-280`, and `T-01-239` await plan 01-45's mechanism work. `T-01-286` is medium and non-blocking; CR-25's deletion closes its duplicated disclosure, but it is not one of the six. This summary does **not** claim `threats_open: 0`; pass 12 owns that measurement.

## Decisions Made

- Kept `EXCLUSIONS`' two prefix locators and both `.from` assertions unchanged; their independence from the full-line pins is the assertion.
- Kept `LIST_OPEN` local and untouched; widening the hoist would widen the claim without evidence.
- Used deletion, not corrective prose, for all Task 2 closures.
- Kept CORE-11 unchecked and did not run `requirements mark-complete`.

## Deviations from Plan

### Auto-fixed Issues

**1. Evidence instrumentation inflated both stored surface totals by eight**

- **Found during:** Task 1 pre-edit measurement.
- **Issue:** The plan carried pass 11's `9,285 -> 9,181`, while the uninstrumented file computes 9,277 lines.
- **Fix:** Reconciled the probe's own physical lines explicitly and retained the executed 104-line delta; no pin or production byte was adjusted.
- **Files modified:** none beyond the planned spec changes.
- **Verification:** exclusion sizes and `gateLines.length` independently yield 9,277; same-line instrumentation reproduced the 104-line amputation.
- **Committed in:** no separate change; recorded in this summary.

---

**Total deviations:** 1 evidence correction, no scope expansion.
**Impact on plan:** The inherited absolute totals were corrected; the mutation behavior, delta and prescribed fix were unchanged.

## Issues Encountered

- `${TMPDIR}` differed from `/tmp`; the round-11 baseline was reconstructed at the path the plan actually sources, using the already re-measured 441/1,381/31/23 counts and exact body lengths. Both task verification blocks then passed.
- No unresolved implementation issue remains.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 01-45 can proceed from a clean `packages/` and `.planning/` tree. Its mechanism work still owns the named-shadow identity pin and its watched failure; pass 12 still owns the final CORE-11 and security disposition.

The task-wide no-overclaim verdict is narrow: **deletion removed false claims and established no true proposition; the fixture covers the shared-resolution edit that was executed and no wider edit class.**

## Self-Check: PASSED

- Both task commits exist and are separate.
- Every task `<acceptance_criteria>` and both automated verify blocks pass.
- The summary records the inherited measurement disagreement, both watched-red exercises, all survivors, residual risk and security split without declaring CORE-11 complete.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-26*
