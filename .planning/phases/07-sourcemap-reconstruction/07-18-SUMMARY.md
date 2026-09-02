---
phase: 07-sourcemap-reconstruction
plan: 18
subsystem: testing
tags: [thresholds, retention, convergence, vitest, docblock-drift, tracer]

requires:
  - phase: 07-sourcemap-reconstruction
    provides: "07-14's row-unit map gate and the retired `2 *` MD-01 factor — the edit whose prose half was left behind and is corrected here"
  - phase: 07-sourcemap-reconstruction
    provides: "07-13's `source_sightings` sweep, which is why `retention.ts:178-180` states the correct figure this plan reconciles against"
provides:
  - "`RETENTION_SWEEP_MAX_PASSES`'s docblock re-derived from the shipped insert side 2,179: quotient 4.26, smallest satisfying integer 5, next power of two 8, and 16 named as retained headroom that was deliberately not lowered"
  - "gate 5 of `thresholds.spec.ts` — a documented-prose-versus-shipped-constants pin that reads `thresholds.ts`'s own source text, region-scoped with a non-vacuity companion"
  - "the repair pattern the three expansion plans (07-19, 07-20, 07-21) reuse at their own sites"
affects: [07-19, 07-20, 07-21, 07-22, retention, thresholds]

actuals:
  tokens: 3900
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "documented-prose-versus-shipped-constants pin: read the module's own source text, slice a region between two `export const` declarations, compare against figures computed from imported constants, and pair every absence check with a non-vacuity companion"

key-files:
  created: []
  modified:
    - packages/engine/src/thresholds.ts
    - packages/engine/src/thresholds.spec.ts

key-decisions:
  - "16 stays 16. The derivation now produces 8 and the paragraph says so explicitly, naming the gap as retained headroom and recording that lowering the constant was considered and NOT approved — so a later reader cannot 'tidy' it down on the strength of the corrected arithmetic."
  - "The prose change is committed as `docs`, not `feat`. The task carried `tdd=\"true\"` and ran RED then GREEN, but the GREEN half changes only comment text; typing it `feat` would claim a behaviour change this plan does not make."
  - "The absence check is region-scoped, never file-wide. The retired 4,227 is CORRECT history inside `ROWS_INSERTED_PER_ITERATION_MAX`'s commit-ordering paragraph, so a file-wide check would be both wrong and unsatisfiable."
  - "`packages/backend/src/store/retention.ts` is named as an unguarded second copy rather than guarded by a cross-package `readFileSync`. 07-REVIEW.md IN-04 records what a reach out of `packages/backend` costs in the build graph; naming an unguarded copy is more honest than guarding it badly."

patterns-established:
  - "Pattern: a prose pin computes every expected figure from an imported constant — a hand-written expectation is the same second copy the gate exists to abolish."
  - "Pattern: every absence assertion carries a non-vacuity companion asserting the same figure IS present where it legitimately belongs, so deleting the history cannot turn the absence check green for the wrong reason."

requirements-completed: [MAP-06]

coverage:
  - id: D1
    description: "The `RETENTION_SWEEP_MAX_PASSES` docblock states the delete side 8,192, the insert side 2,179, the quotient `2,179 / 512 = 4.26`, smallest satisfying integer 5, next power of two 8 and 3.76x headroom — every figure agreeing with the shipped constants."
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the passes docblock states the insert side, the quotient and the smallest satisfying integer that the constants actually produce"
        status: pass
    human_judgment: false
  - id: D2
    description: "The retired figures (4,227 and its quotient 8.26) are gone from the passes docblock and survive only in `ROWS_INSERTED_PER_ITERATION_MAX`'s commit-ordering paragraph, where they are correct history."
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the passes docblock carries NONE of the figures the superseded insert side produced"
        status: pass
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the superseded figures survive where they are CORRECT history, so the absence check cannot pass vacuously"
        status: pass
    human_judgment: false
  - id: D3
    description: "No constant moved: `RETENTION_SWEEP_MAX_PASSES` is still 16 and `RETENTION_SWEEP_MAX_ROWS` still 512, and `ROWS_INSERTED_PER_ITERATION_MAX`'s docblock is byte-unchanged."
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the retention sweep CONVERGES against worst-case ingest (unmodified, still green)"
        status: pass
      - kind: other
        ref: "sha256 of the region between `export const SOURCE_ROWS_PER_MAP_MAX` and `export const ROWS_INSERTED_PER_ITERATION_MAX`, HEAD vs worktree: 6477544a1e171880da733a8f95c1ef2a3595eb1f5f364f2404075e5375105e13 on both"
        status: pass
      - kind: other
        ref: "git diff --unified=0 11ab9e2 -- packages/engine/src/thresholds.ts — three hunks, all inside the docblock, no changed `export const` line"
        status: pass
    human_judgment: false
  - id: D4
    description: "`thresholds.ts` and `packages/backend/src/store/retention.ts:178-180` now state ONE number for each of the two quantities."
    requirement: MAP-06
    verification:
      - kind: manual_procedural
        ref: "side-by-side read of thresholds.ts:166 and retention.ts:178-180 — both name 8,192 and 2,179; recorded verbatim below"
        status: pass
    human_judgment: true
    rationale: "The agreement between the two files is checked by a reader, not by a test — deliberately, since an engine spec reaching into packages/backend is the build-graph cost IN-04 records. A human should confirm the two sentences still agree the next time either moves."
  - id: D5
    description: "The repair pattern is written down for plans 07-19, 07-20 and 07-21."
    verification: []
    human_judgment: true
    rationale: "Whether the pattern note is actually usable by the three expansion plans is a judgment those plans' executors make; nothing automated can assert it."

duration: 8 min
completed: 2026-09-02
status: complete
---

# Phase 07 Plan 18: Documented-Derivation Pin (TRACER) Summary

**`RETENTION_SWEEP_MAX_PASSES`'s docblock re-derived from the shipped insert side 2,179 with 16 named as retained headroom over a derived 8, plus gate 5 of `thresholds.spec.ts` — a region-scoped prose pin that reads `thresholds.ts`'s own source text and goes red the next time a factor is retired and a sentence is left behind.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-09-02T19:39:54Z
- **Completed:** 2026-09-02T19:47:25Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- G-07-1 / WR-01 closed: `thresholds.ts` and `packages/backend/src/store/retention.ts` now state one number for each of the two quantities in the convergence inequality.
- The defect class itself is now catchable: gate 5 asserts over the *documented* figures rather than over the constants, which is the assertion the existing convergence tests were structurally unable to make.
- 16 was NOT lowered. The paragraph now derives 8 and explains, in its own words, why the constant is 16 anyway.

## The six constants, confirmed by reading them rather than by trusting the plan

| Quantity | Source | Value |
|---|---|---|
| `ROWS_INSERTED_PER_ARTIFACT_MAX` | `thresholds.ts:111` | 3 |
| `SOURCE_ROWS_PER_MAP_MAX` | `thresholds.ts:454` | 2_048 |
| `ROWS_INSERTED_PER_ITERATION_MAX` | `thresholds.ts:490-491` (`3 + 2048`) | 2051 |
| `RETENTION_SWEEP_EVERY_N` | `thresholds.ts:215` | 128 |
| `RETENTION_SWEEP_MAX_ROWS` | `thresholds.ts:152` | 512 |
| `RETENTION_SWEEP_MAX_PASSES` | `thresholds.ts:197` | 16 |

Derived: insert side `128 + 2051 = 2179`; delete side `512 * 16 = 8192`; quotient `2179 / 512 = 4.26`; smallest satisfying integer `5`; next power of two `8`; headroom `8192 / 2179 = 3.76x`. **Every one of the six values in the plan's arithmetic paragraph agreed with the code.** No disagreement to record.

## The observed RED, verbatim

The spec was written and committed FIRST (`3e32a8a`) and run against the unedited docblock. Two of the three new assertions fired; the third (the non-vacuity companion) passed immediately, which is the correct signal — the history paragraph was already intact.

```
 Test Files  1 failed (1)
      Tests  2 failed | 60 passed (62)
```

**Assertion 1 — the containment half, in "the passes docblock states the insert side, the quotient and the smallest satisfying integer that the constants actually produce":**

```
AssertionError: The RETENTION_SWEEP_MAX_PASSES docblock in packages/engine/src/thresholds.ts
does not state "2,179" — the insert side — RETENTION_SWEEP_EVERY_N (128) +
ROWS_INSERTED_PER_ITERATION_MAX (2051). The shipped constants produce 8,192 >= 2,179,
quotient 4.26, smallest satisfying integer 5, next power of two 8, headroom 3.76x.
The fix is the SENTENCE, not the constant: rewrite the RETENTION_SWEEP_MAX_PASSES
docblock so it computes from the shipped insert side. 16 is retained headroom by
deliberate decision and lowering it was considered and NOT approved
(07-VERIFICATION.md WR-01).: expected 'export const RETENTION_SWEEP_MAX_ROWS…' to contain '2,179'
```

**Assertion 2 — the absence half, in "the passes docblock carries NONE of the figures the superseded insert side produced":**

```
AssertionError: The RETENTION_SWEEP_MAX_PASSES docblock in packages/engine/src/thresholds.ts
still states "4,227" — the pre-59347c3 insert side (RETENTION_SWEEP_EVERY_N +
ROWS_INSERTED_PER_ARTIFACT_MAX + 2 x SOURCE_ROWS_PER_MAP_MAX). The shipped insert side
is 2,179 with quotient 4.26, so this paragraph is computing a value the code retired.
Do NOT keep the retired figure here as a history note: the history lives in
ROWS_INSERTED_PER_ITERATION_MAX's commit-ordering paragraph, which the companion test
below pins. […]: expected 'export const RETENTION_SWEEP_MAX_ROWS…' not to contain '4,227'
```

Note what the first failure reports: the docblock already contained `8,192`, so the assertion that fired on the containment side was the **insert side**, not the delete side. The delete side never drifted — only the right-hand side did, which is exactly the shape 07-14's edit had.

## The three rewritten sentences, before and after

**1. The inequality (`:166`)**

- Before: ` *   8,192 >= 4,227, which is ~1.9x headroom.`
- After: ` *   8,192 >= 2,179, which is ~3.76x headroom.`

**2. The first rejected repair (`:176`, now `:185`)**

- Before: `Raising RETENTION_SWEEP_MAX_ROWS to 4,227 breaks the 1024-row cost cap `thresholds.spec.ts` asserts; a per-map ROW cap tight enough to fix it (~190 sources) would refuse monaco's 781-source map outright, and D-09 rejected a per-map row cap anyway.`
- After: `Raising RETENTION_SWEEP_MAX_ROWS to 2,179 breaks the 1024-row cost cap `thresholds.spec.ts` asserts — and THE REJECTION STILL HOLDS AT THE SMALLER FIGURE, which is worth saying because this sentence carried a larger one until plan 07-14 retired the MD-01 factor: 2,179 is still more than twice the cost cap, so nothing about the argument shrank when the number did. A per-map ROW cap tight enough to fix it instead (~190 sources) would refuse monaco's 781-source map outright, and D-09 rejected a per-map row cap anyway.`

The `~190 sources` figure survives unchanged and was re-derived rather than carried: the alternative repair has to fit `RETENTION_SWEEP_EVERY_N + ROWS_INSERTED_PER_ARTIFACT_MAX + map rows` inside one 512-row pass, so `512 − 128 − 3 = 381` rows, which at D-05's two rows per source is ~190 sources. That derivation never depended on `SOURCE_ROWS_PER_MAP_MAX`, so retiring the factor did not move it.

**3. The SIXTEEN paragraph (`:189-192`, now `:201-215`)**

- Before: `SIXTEEN, AND NOT NINE. Nine is the smallest integer that satisfies the inequality (4,227 / 512 = 8.26). The next power of two buys the property the superseded Form 1 comment claimed and never had: a backlog DRAINS under sustained worst-case ingest rather than merely failing to grow.`
- After: `SIXTEEN IS RETAINED HEADROOM AND IT IS NOT THE DERIVED VALUE. The derivation ends at eight. The smallest integer that satisfies the inequality is 5, because 2,179 / 512 = 4.26, and the next power of two above it is 8. Eight ALREADY buys the property the superseded Form 1 comment claimed and never had: a backlog DRAINS under sustained worst-case ingest rather than merely failing to grow.` — followed by a new paragraph: `SO WHY IS IT STILL SIXTEEN — because lowering it to 8 was considered on 2026-09-02, when this paragraph was corrected, and was NOT approved. The extra doubling costs nothing at runtime: the loop stops the moment a pass reports no work remains, so an ordinary cadence still runs exactly one pass and the further passes are reachable only under a real backlog. What it buys is a wider drain margin under exactly the sustained worst-case ingest the paragraph above claims to survive. DO NOT "tidy" 16 down to 8 on the strength of this derivation: the derivation produces 8, the constant is 16, and the gap between them is the headroom rather than a mistake.`

**4. (added, not rewritten) The sentence naming the new gate**, inserted after the inequality: `AND THE FIGURES IN THIS PARAGRAPH ARE THEMSELVES ASSERTED, which they were not when it last drifted. `thresholds.spec.ts`'s describe block "the DOCUMENTED derivation matches the SHIPPED constants" READS this docblock as TEXT […] Edit a constant without editing these words and a test goes red.`

## The cross-file agreement check

`packages/engine/src/thresholds.ts:166` (after the rewrite):

```
 *   8,192 >= 2,179, which is ~3.76x headroom.
```

`packages/backend/src/store/retention.ts:178-180` (untouched by this plan — 07-20's file next wave):

```
 * NO CONSTANT MOVED for this. The delete side already dominated: 512 x 16 =
 * 8,192 against 128 + 2,051 = 2,179. What changed is that the tables the 2,051
 * describes are now reachable.
```

**Both name 8,192 on the delete side and 2,179 on the insert side.** `git diff --name-only 11ab9e2 -- packages/backend/src/store/retention.ts` returns empty — the file was read and cited, never edited.

## `ROWS_INSERTED_PER_ITERATION_MAX`'s paragraph is byte-unchanged

sha256 over the region between `export const SOURCE_ROWS_PER_MAP_MAX` and `export const ROWS_INSERTED_PER_ITERATION_MAX`:

```
HEAD      6477544a1e171880da733a8f95c1ef2a3595eb1f5f364f2404075e5375105e13
WORKTREE  6477544a1e171880da733a8f95c1ef2a3595eb1f5f364f2404075e5375105e13
```

Identical. The paragraph that legitimately names both 4,227 and 2,179 — the record of why 07-14's row-unit gate had to land before the factor was retired — survives exactly as written, and gate 5's third test now pins it there.

## Gate results against the verifier's baseline

| Gate | Baseline (`aaac947`) | This plan (`27d9111`) | Verdict |
|---|---|---|---|
| `pnpm vitest run --reporter=dot` | 90 files / 4302 tests, exit 0, 14.12 s | **90 files / 4305 tests, exit 0, 14.06 s** | +3 tests, no file lost |
| `pnpm vitest run packages/engine/src/thresholds.spec.ts` | 59 tests | **62 tests, exit 0** | +3, none replaced |
| `pnpm typecheck` | exit 0 | **exit 0** | — |
| `pnpm lint` | exit 0 | **exit 0** | — |
| `pnpm knip` | exit 0 | **exit 0**, and no entry names `thresholds.spec.ts` | helpers stayed spec-local |
| `pnpm build` | exit 0 | **exit 0** | — |
| `git diff --name-only -- packages/engine` | — | `thresholds.ts`, `thresholds.spec.ts`, nothing else | — |
| byte scan (C0 / DEL / U+2028 / U+2029) over both touched files | zero | **zero** | W-2 class did not recur |

`prettier --check` clean on both files. No regression against 90 / 4302 / exit 0 in any direction.

## The pattern, for plans 07-19, 07-20 and 07-21

A documented-prose-versus-shipped-behaviour pin in this repository is four moves. **One:** read the module's own source text with `readFileSync` against a repo-relative path constant in `tests/corpus-maps.spec.ts`'s `FIXTURE_MODULE` habit — never import the prose, read it. **Two:** slice a REGION by its bounding `export const` declarations rather than by line number, and assert only inside that slice; region scoping is the part most likely to be got wrong, because a superseded figure is very often correct history somewhere else in the same file, and a file-wide absence check is then both wrong and unsatisfiable. **Three:** compute every expected string from an imported constant — a hand-written figure is the same second copy the gate exists to abolish, and it stops tracking the moment a constant moves. **Four, and this is the one that decides whether the gate survives a year:** pair every absence assertion with a non-vacuity companion that asserts the same figure IS present where it legitimately belongs. Without it, deleting the history paragraph turns the absence check green for precisely the wrong reason, and the gate becomes apparatus that looks complete and verifies nothing.

## Task Commits

1. **Task 1 (TRACER, tdd) — RED:** `3e32a8a` (test) — gate 5 added, committed failing (2 failed / 60 passed / 62 total)
2. **Task 1 (TRACER, tdd) — GREEN:** `d12745b` (docs) — the three sentences rewritten, 62 passed
3. **Task 2:** `27d9111` (docs) — the `retention.ts` cross-reference moved inside the describe block, full gate run recorded

No REFACTOR commit: nothing to clean up that the prettier/eslint pass had not already settled.

## Files Created/Modified

- `packages/engine/src/thresholds.ts` — the `RETENTION_SWEEP_MAX_PASSES` docblock: three sentences rewritten, one paragraph added, one cross-reference sentence added. +32/−9 lines, all inside the docblock; no `export const` line touched.
- `packages/engine/src/thresholds.spec.ts` — gate 5, "the DOCUMENTED derivation matches the SHIPPED constants": `THRESHOLDS_MODULE`, `grouped()`, `region()`, `passesDocblock()`, `iterationDocblock()` and three tests. +209 lines, pure addition — the two pre-existing convergence tests (formerly `:263` and `:290`) are unmodified, as the zero-deletion diff proves.

## Decisions Made

See `key-decisions` in the frontmatter. The load-bearing one: **16 was not lowered.** The corrected derivation produces 8, and a paragraph that produced 8 while the constant read 16 without saying why would be a fresh invitation to the exact tidy-up T-07-78 names. The paragraph now refuses the tidy-up in its own voice and records that the decision was made and not approved.

## Deviations from Plan

None — plan executed exactly as written.

One clarification worth recording rather than filing as a deviation: task 2's acceptance criterion reads "No `readFileSync` or import in `packages/engine/src/thresholds.spec.ts` reaches outside `packages/engine`." Taken literally that was already false before this plan and remains false — the file has read `.planning/phases/00-runtime-reality-check/results/go-no-go.json` and imported `scripts/ci/gen-thresholds.mjs` since Phase 0, which is the whole basis of gates 1 and 2. The criterion's actual subject is the cross-*package* reach it forbids, and that is satisfied exactly: `packages/backend` appears in this file only inside a comment (lines 845 and 849), never in an import and never in a `readFileSync` argument. Everything gate 5 reads is `packages/engine/src/thresholds.ts`.

## Issues Encountered

None. The plan's stated arithmetic matched the code on all six values, so no disagreement had to be recorded, and the non-vacuity companion passed on first run because the history paragraph was already intact.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **G-07-1 / WR-01 is closed** by `d12745b`, with the drift-catching gate at `3e32a8a`.
- **The tracer's real deliverable is the pattern note above.** Plans 07-19, 07-20 and 07-21 close the same defect class at three other sites; the four moves are proven end to end here, including the two failure modes (file-wide scoping, vacuous absence) that would have made the gate worthless.
- **Open and deliberately untouched:** W-6 (`MAP_MAX_BYTES` under-serving recovery ~2x) remains an operator decision; WR-02 is 07-20's, WR-03 is 07-21's, IN-01 is 07-22's.
- **Unguarded copy, named on purpose:** `packages/backend/src/store/retention.ts:178-180` states the same two figures with no test reading them. 07-20 owns that file next wave and may want to close that half.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-02*

## Self-Check: PASSED

- `packages/engine/src/thresholds.ts` — present
- `packages/engine/src/thresholds.spec.ts` — present
- `.planning/phases/07-sourcemap-reconstruction/07-18-SUMMARY.md` — present
- Commits `3e32a8a`, `d12745b`, `27d9111`, `2180f02` — all present in `git log --oneline --all`
