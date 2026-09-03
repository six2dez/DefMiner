---
phase: 07-sourcemap-reconstruction
plan: 27
subsystem: testing
tags: [vitest, thresholds, retention-sweep, documented-derivation, gap-closure]

requires:
  - phase: 07-sourcemap-reconstruction
    provides: "07-25's pinned historical literals, the coincidence assertion and the `region()` predicates this plan extends"
  - phase: 07-sourcemap-reconstruction
    provides: "07-26's committed working tree (round-4 wave 1), which set this plan's 90-file / 4,322-test floor"
provides:
  - "`SHIPPED_INSERT_SIDE_AT_59347C3 = 2_179` — the last recomputed historical operand in the documented-derivation block, pinned with measured provenance"
  - "`SUPERSEDED_SWEEP_MAX_ROWS_BEFORE_59347C3 = 512` — `8.26`'s denominator, pinned alongside its already-pinned numerator"
  - "a third `expect` inside the EXISTING coincidence assertion covering the new literal, with a remedy that protects the dated history paragraph"
  - "a non-vacuity guard demonstrated load-bearing on BOTH of its operands by two independent arm-checks"
affects: [any plan that next touches the commit-ordering test in thresholds.spec.ts, phase-07 verification round 4]

actuals:
  tokens: 2313
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Historical figures are PINNED as named literals carrying their commit; SHIPPED figures stay DERIVED from the `T.*` imports"
    - "A guard's substituted operand is proven load-bearing by a SECOND arm-check that removes only that operand"
    - "A comment states the rule, never a tally, so a later pin in the same block cannot falsify it"

key-files:
  created: []
  modified:
    - packages/engine/src/thresholds.spec.ts

key-decisions:
  - "The new `expect` compares a locally recomputed `recomputedShipped` rather than the block's `insertSide` binding, mirroring the test's existing `recomputed`/`recomputedQuotient` locals — required because the block-wide `grouped(insertSide)` gate is exact-4 and any textual `grouped(insertSide)` in the new message would have inflated it past the point where a real overreach into the presence/absence halves could still be detected"
  - "The remedy clauses state 'the pinned historical literals' rather than a count, in both the new `expect` and the pre-existing first `expect` whose 'the two literals' tally this plan's own third pin falsified"

patterns-established:
  - "Two-arm non-vacuity demonstration: arm A empties the whole guarded paragraph, arm B removes only the newly-substituted operand and must fail on the specific `expect` that reads it"

requirements-completed: [MAP-06]

coverage:
  - id: D1
    description: "`SHIPPED_INSERT_SIDE_AT_59347C3 = 2_179` is pinned with measured provenance and the non-vacuity guard's three references consume it, so its demand on a paragraph describing 2026-09-02 can no longer move when a constant does (G-07-10)"
    requirement: "MAP-06"
    verification:
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the superseded figures survive where they are CORRECT history, so the absence check cannot pass vacuously"
        status: pass
      - kind: other
        ref: "sed -n '/the superseded figures survive where they are CORRECT history/,$p' packages/engine/src/thresholds.spec.ts | grep -c 'grouped(insertSide)' → 0 (was 3)"
        status: pass
      - kind: other
        ref: "arm-check B — removing only `(2,179, exact)` from thresholds.ts fails the SECOND expect at :1086 by name"
        status: pass
    human_judgment: false
  - id: D2
    description: "The new literal is covered by the SAME coincidence assertion as the others, with a remedy directing the repair at retiring the assertion rather than rewriting the dated paragraph"
    requirement: "MAP-06"
    verification:
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the superseded figures STILL equal what today's constants recompute, and when they stop it is THIS assertion that retires — not the history"
        status: pass
      - kind: other
        ref: "pnpm exec vitest run packages/engine/src/thresholds.spec.ts --reporter=dot → 63 tests, exit 0 (no new `it`)"
        status: pass
    human_judgment: false
  - id: D3
    description: "`8.26` is pinned end to end — `SUPERSEDED_SWEEP_MAX_ROWS_BEFORE_59347C3 = 512` — and the clause claiming to describe values 'as both stood before 59347c3' reads historical values throughout, while `recomputedQuotient`'s live division still reads today's constant (G-07-11)"
    requirement: "MAP-06"
    verification:
      - kind: other
        ref: "coincidence-test region: grep -c 'T.RETENTION_SWEEP_MAX_ROWS' → 1 (was 2) AND grep -c 'recomputed / T.RETENTION_SWEEP_MAX_ROWS' → 1 (unchanged)"
        status: pass
      - kind: other
        ref: "git show '59347c3^:packages/engine/src/thresholds.ts' line 152 → RETENTION_SWEEP_MAX_ROWS = 512; 4227/512 = 8.26"
        status: pass
    human_judgment: false
  - id: D4
    description: "The provenance comment records `8.26` as `4,227 / 512` at `59347c3^` and counts no literals, so a later pin cannot falsify it"
    verification:
      - kind: other
        ref: "provenance region: grep -c '4,227 / 512' → 2 (was 0); grep -c 'only these' → 0 (was 1)"
        status: pass
    human_judgment: false
  - id: D5
    description: "`thresholds.ts` is byte-identical after both arm-checks and no constant moved; the repository gate is green at exactly 90 files / 4,322 tests"
    verification:
      - kind: other
        ref: "md5 -q packages/engine/src/thresholds.ts → 6391d0d50f9741f50909ec9197dd25c9; git status --porcelain empty"
        status: pass
      - kind: integration
        ref: "pnpm vitest run --reporter=dot → 90 files / 4322 tests, exit 0"
        status: pass
      - kind: other
        ref: "pnpm typecheck && pnpm lint && pnpm knip && pnpm build → exit 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "Whether round 4's acceptance evidence was genuinely able to FALSIFY the prose claims it gated, rather than merely detect words in them (VF-01 / UAT test 5)"
    verification: []
    human_judgment: true
    rationale: "A judgement about the character of this round's evidence, not a property any assertion can check. The executor's read is recorded below under `## VF-01 process note`; the verifier must weigh it."

duration: 12 min
completed: 2026-09-03
status: complete
---

# Phase 07 Plan 27: Pin the Last Recomputed Historical Operand Summary

**The documented-derivation block's final recomputed historical demand is now a pinned literal — `SHIPPED_INSERT_SIDE_AT_59347C3 = 2_179` measured from `git show 59347c3:` — with `8.26` pinned end to end at `4,227 / 512`, and the non-vacuity guard demonstrated load-bearing on BOTH operands by two independent arm-checks.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-03T11:26:30Z
- **Completed:** 2026-09-03T11:38:29Z
- **Tasks:** 3
- **Files modified:** 1 (`packages/engine/src/thresholds.spec.ts`)

## Accomplishments

- **G-07-10 closed.** The non-vacuity guard's three references to the derived `grouped(insertSide)` now read a pinned literal, so at `SOURCE_ROWS_PER_MAP_MAX = 1_024` it can no longer demand that `1,155` appear in a paragraph describing 2026-09-02.
- **G-07-11 closed.** `8.26`'s denominator is pinned at `512`, so the clause reading "as both stood before 59347c3" names two historical values and interpolates no present-day constant — while the live recomputation that makes the assertion able to fire still divides by today's constant.
- **The non-vacuity property demonstrated TWICE**, arm B being the one round 3 did not have: removing only the newly-pinned figure fails the *second* `expect` by name, proving the substitution did not disarm the guard it repaired.
- **No tally survives anywhere in the block.** The provenance comment states the DERIVED-vs-PINNED rule and counts nothing; the pre-existing "leaving the two literals" remedy clause, which this plan's own third pin falsified, was rephrased with it.

## Task Commits

1. **Task 1: Pin what the insert side read AT 59347c3, and cover it in the existing coincidence assertion** — `04d1c00` (test)
2. **Task 2: Pin 8.26's denominator, so the historical clause reads historical values throughout** — `e29a5cc` (test)
3. **Task 3: Demonstrate the guard is still armed on BOTH operands, then run the repository gate** — no commit by design. Both arm-checks temporarily mutate `packages/engine/src/thresholds.ts` and are reverted with `git checkout --`; nothing this task wrote survives it. Its output is the evidence recorded below.

**Plan metadata:** see the `docs(07-27)` commit.

## Files Created/Modified

- `packages/engine/src/thresholds.spec.ts` — two new spec-local historical literals, a third `expect` inside the existing coincidence assertion, three substitutions in the non-vacuity guard, and an extended provenance comment. +76 / −12 across the two task commits.

---

## Task 1 — the five region probes and the non-vacuity companion

Measured at HEAD (`f2a7728`) before any edit, and again after task 1. Every before-value matched the plan's stated figure on first measurement; none was re-measured or adjusted.

| Probe | Before | Plan predicted | After | Required |
|---|---|---|---|---|
| block-wide `grep -c 'SHIPPED_INSERT_SIDE_AT_59347C3'` | `0` | 0 | `7` | ≥ 5 |
| guard-scoped `grep -c 'grouped(insertSide)'` | `3` | 3 | `0` | 0 |
| block-wide `grep -c 'grouped(insertSide)'` | `7` | 7 | `4` | exactly 4 |
| provenance-region `grep -c 'only these two'` | `1` | 1 | `0` | 0 |
| `pnpm exec vitest run …thresholds.spec.ts` | `63 passed (63)` | 63 | `63 passed (63)` | exactly 63 |
| **non-vacuity companion** — block-wide `grep -c 'SUPERSEDED_INSERT_SIDE_BEFORE_59347C3'` | `10` | 10 | `10` | ≥ 10 |
| shipped-figure-literal probe `grep -cE '(deleteSide\|insertSide\|quotient\|smallestSatisfying\|nextPowerOfTwo\|headroom) = [0-9][0-9_]*;'` | `0` | 0 | `0` | 0 |

The block-wide count falling `7 → 4` and the guard-scoped count falling `3 → 0` together prove the substitution hit the guard and stopped there: the four surviving references are the presence half's and absence half's, which genuinely describe today and are fenced out of this plan.

## Task 2 — the three region probes

| Probe | Before (post-task-1) | Plan predicted | After | Required |
|---|---|---|---|---|
| coincidence-test `grep -c 'T.RETENTION_SWEEP_MAX_ROWS'` | `2` | 2 | `1` | exactly 1 |
| coincidence-test `grep -c 'recomputed / T.RETENTION_SWEEP_MAX_ROWS'` | `1` | 1 | `1` | exactly 1 (unchanged) |
| provenance-region `grep -c '4,227 / 512'` | `0` | 0 | `2` | ≥ 1 |
| provenance-region `grep -c 'only these'` | `0` | 0 | `0` | 0 |
| `grep -c 'const SUPERSEDED_SWEEP_MAX_ROWS_BEFORE_59347C3 = 512;'` | `0` | — | `1` | exactly 1 |

The pairing is what matters: the total occurrence count fell to 1 **while** the `recomputed / …` shape held at 1. That is the direct proof the *historical clause* lost today's constant and the *live recomputation* kept it — so the coincidence assertion still compares a recomputation against a pinned value rather than three constants agreeing with themselves.

## The three provenance measurements, together

All measured by the executor from git, not copied from the plan.

**Commit identity:**
```
$ git log -1 --format='%h %ad %s' --date=short 59347c3
59347c3 2026-09-02 fix(07-14): retire the MD-01 compensating factor from the insert bound
```

**1. `SHIPPED_INSERT_SIDE_AT_59347C3` — verbatim from `git show 59347c3:packages/engine/src/thresholds.ts`:**
```
215:export const RETENTION_SWEEP_EVERY_N = 128;
111:export const ROWS_INSERTED_PER_ARTIFACT_MAX = 3;
454:export const SOURCE_ROWS_PER_MAP_MAX = 2_048;
490:export const ROWS_INSERTED_PER_ITERATION_MAX =
491-  ROWS_INSERTED_PER_ARTIFACT_MAX + SOURCE_ROWS_PER_MAP_MAX;
```
Note line 490–491 carries **no compensating factor** at that commit — that is the edit `59347c3` is. Arithmetic:
```
ROWS_INSERTED_PER_ITERATION_MAX at 59347c3 = 3 + 2048 = 2051
insertSide at 59347c3 = 128 + 2051 = 2179
```

**2. `SUPERSEDED_SWEEP_MAX_ROWS_BEFORE_59347C3` — verbatim from `git show '59347c3^:packages/engine/src/thresholds.ts'`:**
```
152:export const RETENTION_SWEEP_MAX_ROWS = 512;
```
and at HEAD, the same line, the same value:
```
152:export const RETENTION_SWEEP_MAX_ROWS = 512;
```

**3. The quotient:**
```
4227/512 to 2dp = 8.26
```
which reproduces `SUPERSEDED_QUOTIENT_BEFORE_59347C3` exactly.

**All three measurements confirmed the planner's figures — `2,179`, `512` and `8.26` — on first measurement.** Nothing was adjusted to fit and no stop-and-report condition was reached.

---

## Arm-check A — emptying the whole gate-order sentence

Removed from `thresholds.ts`'s history paragraph: `The gate landed first (4,227 on the insert side, over-stated and therefore safe) and the factor was retired second (2,179, exact). ` Both `export const` declarations left in place so `region()`'s anchors still resolve.

**Verbatim RED output (elided only where vitest echoes the whole docblock back as the received value):**
```
 RUN  v4.1.11 /Users/six2dez/Tools/DefMiner

······························································x

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  packages/engine/src/thresholds.spec.ts > the DOCUMENTED derivation matches the SHIPPED constants > the superseded figures survive where they are CORRECT history, so the absence check cannot pass vacuously
AssertionError: ROWS_INSERTED_PER_ITERATION_MAX's docblock in packages/engine/src/thresholds.ts no longer names 4,227. That paragraph is the record of why 07-14's row-unit gate had to land BEFORE the `2 *` factor was retired — the gate first at 4,227 (over-stated and therefore safe), the factor second at 2,179 (exact). It is ALSO the reason the absence check above is scoped to a region rather than to the file. Restore the paragraph rather than relaxing the scope.: expected 'export const SOURCE_ROWS_PER_MAP_MAX …' to contain '4,227'

- Expected
+ Received

- 4,227
+ export const SOURCE_ROWS_PER_MAP_MAX = 2_048;
    [… vitest echoes the full restored-minus-sentence docblock …]

 ❯ packages/engine/src/thresholds.spec.ts:1075:7
    1073|         `It is ALSO the reason the absence check above is scoped to a …
    1074|         `than to the file. Restore the paragraph rather than relaxing …
    1075|     ).toContain(grouped(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3));
       |       ^

 Test Files  1 failed (1)
      Tests  1 failed | 62 passed (63)
```

**Which `expect` fired:** the **FIRST** — `:1075`, `.toContain(grouped(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3))`, on `4,227`. This is a real `toContain` failure, **not** `region()`'s anchor throw: the received value is the resolved docblock text, which only exists if both anchors were found. Exactly the shape the plan required.

## Arm-check B — removing ONLY the newly-pinned figure

This is the arm round 3 did not have, and the one that decides whether task 1 repaired the guard or disarmed it. Removed only the parenthetical ` (2,179, exact)`, leaving `4,227` on the gate-landed-first clause:

```
 * commits mattered. The gate landed first (4,227 on the insert side, over-stated
 * and therefore safe) and the factor was retired second. Taken the
```
```
4,227 still present in the region: 1
2,179 in the region:               0
```

**Verbatim RED output:**
```
 RUN  v4.1.11 /Users/six2dez/Tools/DefMiner

······························································x

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  packages/engine/src/thresholds.spec.ts > the DOCUMENTED derivation matches the SHIPPED constants > the superseded figures survive where they are CORRECT history, so the absence check cannot pass vacuously
AssertionError: ROWS_INSERTED_PER_ITERATION_MAX's docblock no longer names 2,179 — the insert side as the retirement of the `2 *` factor SHIPPED it at 59347c3 — alongside the superseded 4,227, so the ordering argument it makes can no longer be checked against the record. That figure is PINNED here rather than recomputed from today's constants: this paragraph describes 2026-09-02, and what a gate demands of a dated record must not move when a constant moves.: expected 'export const SOURCE_ROWS_PER_MAP_MAX …' to contain '2,179'

- Expected
+ Received

- 2,179
+ export const SOURCE_ROWS_PER_MAP_MAX = 2_048;
    [… vitest echoes the full docblock minus the parenthetical …]

 ❯ packages/engine/src/thresholds.spec.ts:1086:7
    1084|         `constants: this paragraph describes 2026-09-02, and what a ga…
    1085|         `of a dated record must not move when a constant moves.`,
    1086|     ).toContain(grouped(SHIPPED_INSERT_SIDE_AT_59347C3));
       |       ^

 Test Files  1 failed (1)
      Tests  1 failed | 62 passed (63)
```

**Which `expect` fired:** the **SECOND** — `:1086`, `.toContain(grouped(SHIPPED_INSERT_SIDE_AT_59347C3))`, on `2,179`. The first `expect` **passed**, because `4,227` was deliberately left in place. That is the whole point of this arm: the guard failed *specifically on the operand task 1 substituted*, so the substitution left it load-bearing rather than vacuous. Had it passed, the plan would have removed a drift generator by removing the detector — the stop-and-report condition, which was not reached.

## Restore confirmations

After each arm-check, `git checkout -- packages/engine/src/thresholds.ts` (never `cp`, which is aliased to `cp -i` here and silently no-ops an overwrite):

```
md5: 6391d0d50f9741f50909ec9197dd25c9
porcelain: []
```

Identical after arm A and after arm B — the digest the plan pinned. Direct greps of the restored paragraph, one per arm-check so a failed restore is attributable:

```
2,179 in region: 1      (the bytes arm-check B removed — restored)
4,227 in region: 1      (the bytes arm-check A removed — restored)
```

`packages/engine/src/thresholds.ts` and `packages/backend/src/store/retention.ts` are both **unmodified**. Final `git status --short` is clean.

## Fence gates

```
$ git ls-files --error-unmatch packages/backend/src/store/retention.ts \
    packages/backend/src/store/export.spec.ts \
    packages/backend/src/ingest/consumer.spec.ts \
    packages/engine/src/sourcemap/parse.ts | wc -l
       4
```
All four pathspecs resolve, so the diffstat gate below has four live arms rather than arms that pass by matching nothing. `git diff --stat HEAD` over those four: **empty**. The same over `thresholds.ts`, `export.ts`, `derive.ts`, `telemetry.ts`, `migrations.ts` and `07-24-SUMMARY.md`: **empty**. `git diff --name-only -- packages/` after the final commit: **empty** (all work committed; the only path touched across the plan is `packages/engine/src/thresholds.spec.ts`).

## Repository gate

```
 Test Files  90 passed (90)
      Tests  4322 passed (4322)
   Duration  14.20s
```

**Exactly 90 files and exactly 4,322 tests, exit 0.** `packages/engine/src/thresholds.spec.ts` holds at **63 tests** — the HEAD count — because both repairs extended existing assertions and neither added an `it`.

**The numeric floor used was 90 files / 4,322 tests, read from two files:** `07-VERIFICATION.md` line 31 (round-4 baseline, "90 files / 4,322 tests passed, exit 0, 15.61 s") and `07-26-SUMMARY.md` line 347 (wave 1's recorded close, which restates the same floor and explicitly retargets 07-27 at it).

```
$ pnpm typecheck && pnpm lint && pnpm knip && pnpm build
… exit 0
```
All four exit 0. Knip's 30 pre-existing "Tag hints" are unchanged and **none names `thresholds.spec.ts`** (`pnpm knip | grep -c 'thresholds.spec.ts'` → `0`), so the new literals stayed spec-local and no binding was orphaned.

---

## Decisions Made

1. **The new `expect` compares a locally recomputed `recomputedShipped`, not the block's `insertSide` binding.** The block-wide gate on `grouped(insertSide)` is *exactly* 4, and its stated purpose is to prove the substitution hit the guard and stopped before the presence and absence halves. Any textual `grouped(insertSide)` in the new message would have inflated that count and destroyed its ability to detect a real overreach. A local `const recomputedShipped = T.RETENTION_SWEEP_EVERY_N + T.ROWS_INSERTED_PER_ITERATION_MAX;` is the same derived quantity, and it mirrors the two locals (`recomputed`, `recomputedQuotient`) this same `it` already computes — every operand in that test is now a local recomputation from `T.*` compared against a pinned literal, which reads as one symmetric account rather than a patch.

2. **Remedy clauses state "the pinned historical literals", not a count.** See the deviation below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's prescribed wording for the new `expect` carried a tally its own next task falsifies**

- **Found during:** Task 1 (step 4)
- **Issue:** The plan's step 4 specifies the new `expect`'s remedy clause should read "leaving the **three** literals, the presence half and the absence half exactly as they are". Task 2 then adds a fourth literal to the same block, so that count would have been wrong the moment task 2 landed — the exact defect class round 4 was convened to remove, and directly contrary to this plan's own `must_haves` ("a comment must never state a count that a later pin in the same block falsifies") and its truth that the block "counts no literals". Separately, the *pre-existing* first `expect` at `:916` already read "leaving the **two** literals", which task 1's own third pin falsified.
- **Fix:** Both clauses now read "leaving the pinned historical literals, …" — the same enumerated meaning, stated as a rule rather than a tally, so no later pin can falsify either. The substance the plan required (the literal stays; the remedy is to retire the assertion; do not rewrite the dated paragraph) is unchanged and is what the acceptance criterion actually gates.
- **Files modified:** `packages/engine/src/thresholds.spec.ts`
- **Verification:** All Task 1 and Task 2 gates pass unchanged; the provenance-region `only these` / `only these two` probes read `0`; 63 tests green.
- **Committed in:** `04d1c00` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — a plan-internal contradiction resolved in favour of the plan's own binding `must_haves`).
**Impact on plan:** None on scope or gates. Resolving it the other way would have shipped a falsified comment while removing another, which the plan itself names as "a null round".

**No GSD tooling friction was hit on the state-update path this run** — `state.advance-plan`, `roadmap.update-plan-progress` and `state.add-decision` behaviours are recorded in the Issues section below.

## Issues Encountered

None during the planned work. Every gate literal the plan stated matched HEAD exactly on first measurement — all ten RED-state probe values, the `6391d0d50f9741f50909ec9197dd25c9` digest, the `2_179` and `512` derivations, the `4227/512 → 8.26` quotient, and the 90-file / 4,322-test floor. **No gate was re-measured, relaxed or adjusted, and no acceptance criterion was weakened.** Neither stop-and-report condition (an arithmetic disagreement in task 1 or 2; an arm-check passing in task 3) was reached.

## Out-of-scope observation, recorded again rather than fixed

The **commit-ordering test earlier in this same file** (`thresholds.spec.ts:336-355`) still declares a local `supersededInsertSide` recomputed from today's constants. It is untouched by this plan and by 07-25 before it. It is a **different assertion**: a property over today's constants (retiring the compensating factor must LOOSEN the bound) rather than a record of a past day, so the drift this round closes does not apply to it in the same way. Round 4's gap fences scope both 07-26 and 07-27 out of it.

**Suggested owner: any plan that next touches the commit-ordering test.** This is the same owner 07-25 recorded; the observation has now been carried forward twice without being actioned, which is itself worth the verifier's attention.

## Round 4 closing position

This is the last plan of gap-closure round 4.

- **G-07-9** — closed by plan **07-26** (`95a2a73`, `e5460d5`, `f2a7728`).
- **G-07-12** — closed by plan **07-26** (same commits).
- **G-07-10** — closed by this plan, **`04d1c00`**.
- **G-07-11** — closed by this plan, **`e29a5cc`**.

**All four round-4 gaps are closed.**

Still **open by operator decision and untouched** by either plan: **W-4** (`vue-tsc` wired into no running gate), **W-6** (`MAP_MAX_BYTES` re-measurement, which needs four fresh Caido instances), **round-1 UAT gap 3** (frame-budget backstop in `tests/frontend-load.spec.ts`), **IN-04** (docblock caveat on `derivedRejected.depth_exceeded`), **SC5's second half**, and **MAP-01's external half**. Each was named in this plan's prohibitions rather than silently omitted.

## VF-01 process note

**Yes — this plan's acceptance evidence was able to falsify the claims it gated, and in two places it was the only thing that could have.**

The round-3 defect (VF-01) was that a `grep -c '<word>'` word-presence probe was accepted as sole evidence for a prose claim: such a probe cannot go red for the reason the claim is wrong, so it reports green regardless. Three things in this plan were different in kind:

1. **Arm-check B is a real falsification attempt, not a detection.** It constructs the world in which the claim "the guard is still armed on the substituted operand" would be false, and requires the failure to name that operand at a specific line. A word-count could not have distinguished a load-bearing `expect` from a disarmed one — both contain the same words.
2. **The `recomputed / T.RETENTION_SWEEP_MAX_ROWS` shape probe held at 1 while the total fell to 2 → 1.** A single count would have passed for the catastrophic wrong turn (substituting the *live* division and leaving three constants agreeing with themselves). The paired probe refuses it.
3. **Every historical claim written into the file was checked against `git show`, not against a grep.** The `2_179` derivation required reading four constants and observing the *absence* of the compensating factor at line 490 — an absence no word-presence probe expresses.

The honest caveat: the two literals are a **no-op and a latent-only repair at HEAD** (`512` today equals `512` then; today's constants still reproduce `2,179`). A green suite therefore proves very little here on its own, which is precisely why the arm-checks and the `git show` measurements — not the suite — are this plan's evidence. The one gate that remains word-shaped is the `grep -c 'only these'` tally probe; it is a genuine negative on a string this plan deliberately removed, but a future author could satisfy it by rewording rather than by understanding. That residual is worth a verifier's eye.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **All 27 plans of phase 07 are executed.** Round 4 is complete and the working tree is clean.
- **Ready for `/gsd-verify-work 07`.** The verifier's floor is 90 files / 4,322 tests, `thresholds.spec.ts` at 63, `thresholds.ts` at md5 `6391d0d50f9741f50909ec9197dd25c9`.
- **No blockers.** The six items listed under "Round 4 closing position" remain open by operator decision, not by omission.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-03*
