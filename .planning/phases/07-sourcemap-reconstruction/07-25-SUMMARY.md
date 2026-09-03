---
phase: 07-sourcemap-reconstruction
plan: 25
subsystem: testing
tags: [vitest, thresholds, retention-convergence, drift-gate, provenance, gap-closure]

requires:
  - phase: 07-sourcemap-reconstruction
    provides: "07-18's documented-derivation gate (absence half + presence half + non-vacuity companion), whose recomputed superseded figures this plan pins"
  - phase: 07-sourcemap-reconstruction
    provides: "07-24's recorded whole-suite floor of 90 files / 4321 tests, which this plan retargets at floor plus one"
provides:
  - "two spec-local named literals, `SUPERSEDED_INSERT_SIDE_BEFORE_59347C3` (4_227) and `SUPERSEDED_QUOTIENT_BEFORE_59347C3` (\"8.26\"), carrying their provenance in the name and in an adjacent comment"
  - "a coincidence assertion that converts a silently-wrong future demand into a test failure whose remedy retires the assertion rather than rewriting a dated paragraph"
  - "a DEMONSTRATED (not asserted) non-vacuity property: emptying the history paragraph in the real thresholds.ts produced a real `toContain` failure, recorded verbatim"
  - "a recorded whole-suite figure of 90 files / 4322 tests — 07-24's floor plus exactly one"
affects: [any plan that next touches the commit-ordering test in thresholds.spec.ts, phase 07 verification, gap-closure round 4 if one is opened]

actuals:
  tokens: 1951
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Historical figures in a spec are PINNED LITERALS with stated provenance; shipped figures stay DERIVED from the imported constants. A guard must never demand that a paragraph describing a past day be rewritten with a present-day figure."
    - "Where a gate silently depends on a coincidence between a pinned figure and a live recomputation, the coincidence is ASSERTED, and the assertion's failure message names ITSELF as the thing that retires."

key-files:
  created: []
  modified:
    - packages/engine/src/thresholds.spec.ts

key-decisions:
  - "The two superseded figures became named literals with stated provenance; every shipped figure stayed derived from the T.* imports."
  - "The new coincidence assertion deliberately does NOT reuse the block-level REMEDY string, which directs the reader at the passes docblock — the wrong repair for this failure."
  - "The commit-ordering test's identically-named recomputation was read, judged a DIFFERENT assertion, and recorded rather than fixed."
  - "The non-vacuity property was demonstrated against the real thresholds.ts rather than asserted, with `git checkout --` as the restore mechanism because `cp` is aliased to `cp -i` here."

patterns-established:
  - "Provenance-pinned literal: a historical constant in a spec carries the commit in its NAME, the date and the arithmetic in an adjacent comment, and a live assertion that its coincidence with today's recomputation still holds."
  - "Arm-check before close: a guard repaired in place is proven still armed by breaking its subject in the real file, observing the RIGHT failure mode, and restoring with `git checkout --`."

requirements-completed: [MAP-06]

coverage:
  - id: D1
    description: "The two superseded figures in the documented-derivation block are named literals carrying their provenance (what they read, and at which commit), and the shipped figures remain derived from the imported constants."
    requirement: "MAP-06"
    verification:
      - kind: unit
        ref: "sed -n '/the DOCUMENTED derivation matches the SHIPPED constants/,$p' packages/engine/src/thresholds.spec.ts | grep -c 'const supersededInsertSide =' → 0 (was 1)"
        status: pass
      - kind: unit
        ref: "sed -n '/the DOCUMENTED derivation matches the SHIPPED constants/,$p' packages/engine/src/thresholds.spec.ts | grep -c 'SUPERSEDED_INSERT_SIDE_BEFORE_59347C3' → 10 (was 0, floor 4)"
        status: pass
      - kind: unit
        ref: "grep -nE '^\\s*const (deleteSide|insertSide|quotient|smallestSatisfying|nextPowerOfTwo|headroom) =' packages/engine/src/thresholds.spec.ts → all six are expressions over T.* imports, no literal"
        status: pass
    human_judgment: false
  - id: D2
    description: "A one-line assertion pins each literal to what today's constants recompute, and its failure message directs the repair at the assertion — explicitly forbidding a rewrite of the dated history paragraph."
    requirement: "MAP-06"
    verification:
      - kind: unit
        ref: "packages/engine/src/thresholds.spec.ts#the superseded figures STILL equal what today's constants recompute, and when they stop it is THIS assertion that retires — not the history"
        status: pass
      - kind: unit
        ref: "mutation probe: 4_227 → 4_228 turned the assertion RED with the message quoted verbatim below, then reverted via git checkout --"
        status: pass
    human_judgment: false
  - id: D3
    description: "The non-vacuity property survives the repair: emptying ROWS_INSERTED_PER_ITERATION_MAX's history paragraph in the real thresholds.ts still turns the presence half RED, with a toContain failure rather than a region() anchor throw."
    requirement: "MAP-06"
    verification:
      - kind: unit
        ref: "arm-check — packages/engine/src/thresholds.spec.ts:1015 toContain failure, verbatim output recorded below; restored with git checkout -- and git status --porcelain -- packages/engine/src/thresholds.ts empty"
        status: pass
    human_judgment: false
  - id: D4
    description: "The repository gate holds at 07-24's recorded floor plus exactly one, with exactly one file modified and thresholds.ts / retention.ts byte-unchanged."
    verification:
      - kind: integration
        ref: "pnpm vitest run --reporter=dot — Test Files 90 passed (90), Tests 4322 passed (4322), exit 0"
        status: pass
      - kind: integration
        ref: "pnpm typecheck / pnpm lint / pnpm knip / pnpm build — all exit 0"
        status: pass
      - kind: unit
        ref: "git diff --name-only -- packages/engine packages/backend → empty after commit; git status --porcelain → empty"
        status: pass
    human_judgment: false

duration: 6 min
completed: 2026-09-03
status: complete
---

# Phase 07 Plan 25: Pin the Superseded Figures as Dated Literals Summary

**The two pre-`59347c3` figures are now named literals with measured provenance (`SUPERSEDED_INSERT_SIDE_BEFORE_59347C3 = 4_227`, `SUPERSEDED_QUOTIENT_BEFORE_59347C3 = "8.26"`), a new first `it` asserts the coincidence with today's recomputation and names itself as the thing that retires when it ends, and the non-vacuity trap was proven still armed by emptying the real history paragraph and observing a `toContain` failure at `thresholds.spec.ts:1015` — 62 → 63 tests, whole suite 90 files / 4322 tests.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-03T09:16:40Z
- **Completed:** 2026-09-03T09:22:27Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- **G-07-8 / WR-04 closed at `ed0018e`.** The documented-derivation block no longer recomputes a historical figure from today's constants. The drift detector can no longer become the drift generator.
- **The coincidence is asserted rather than assumed.** A new first `it` recomputes the pre-`59347c3` expression from the imports and pins it to each literal, with a failure message that says the literal STAYS, forbids rewriting the dated paragraph, and names retiring the assertion as the remedy.
- **The non-vacuity property was DEMONSTRATED, not asserted.** The history paragraph's two figures were deleted from the real `thresholds.ts`, the presence half failed with a `toContain` (not a `region()` anchor throw), and the file was restored with `git checkout --` and proven byte-clean.
- **Provenance is MEASURED, not documentary.** `git show 59347c3` resolves, and `git show 59347c3^:packages/engine/src/thresholds.ts` confirms the arithmetic independently.
- **Repository gate green at 07-24's recorded floor plus exactly one:** 90 files / 4322 tests, four static gates at exit 0, exactly one file modified.

## Task Commits

1. **Task 1: Pin the history as named literals, and assert the coincidence that is currently silent** — `ed0018e` (test)
2. **Task 2: Demonstrate the trap is still armed, then run the repository gate** — no commit. Task 2 produces no durable file change by design: it temporarily mutates a file this plan does not own, restores it with `git checkout --`, and runs the repository gate. Its entire output is the evidence recorded below. `git status --porcelain` is empty after it.

**Plan metadata:** see the `docs(07-25)` commit.

## Files Created/Modified

- `packages/engine/src/thresholds.spec.ts` — the documented-derivation block: two recomputed bindings and their comment retired in favour of two provenance-carrying literals, a new coincidence assertion added as the first `it`, and the absence half and presence half rewired to consume the literals. 69 insertions, 20 deletions.

**Unmodified and deliberately so:**

- `packages/engine/src/thresholds.ts` — read as the subject of the gate, temporarily mutated inside the arm-check only, restored with `git checkout --`. `git status --porcelain -- packages/engine/src/thresholds.ts` is **empty**. No constant moved: `RETENTION_SWEEP_MAX_PASSES` is still 16, `SOURCE_ROWS_PER_MAP_MAX` still 2_048, `MAP_MAX_BYTES` untouched, `SCHEMA_VERSION` still 9.
- `packages/backend/src/store/retention.ts` — carries the same figures as unguarded prose and is cited by this block's preamble. `git diff --name-only -- packages/backend/src/store/retention.ts` is **empty**. 07-20 already reconciled it; this plan reads it without touching it.

## The four region probes, before and after

| Probe | Before (HEAD, `6604981`) | After (`ed0018e`) | Required |
|---|---|---|---|
| `sed -n '/the DOCUMENTED derivation matches the SHIPPED constants/,$p' … \| grep -c 'const supersededInsertSide ='` | `1` | `0` | must become 0 |
| `sed -n '1,/the DOCUMENTED derivation matches the SHIPPED constants/p' … \| grep -c 'const supersededInsertSide ='` | `1` | `1` | must STAY 1 — the out-of-scope commit-ordering recomputation survived |
| `sed -n '/the DOCUMENTED derivation matches the SHIPPED constants/,$p' … \| grep -c 'SUPERSEDED_INSERT_SIDE_BEFORE_59347C3'` | `0` | `10` | at least 4 |
| `grep -c '4_227' packages/engine/src/thresholds.spec.ts` | `0` | `1` | at least 1 |
| `grep -c 'SUPERSEDED_QUOTIENT_BEFORE_59347C3' …` | `0` | `4` | at least 2 |
| `pnpm vitest run packages/engine/src/thresholds.spec.ts --reporter=dot` | `Tests  62 passed (62)` | `Tests  63 passed (63)` | 62 + exactly 1 |

The `10` is the declaration plus nine consumers (four in the new assertion, one in the absence half, four in the presence half) — comfortably above the floor of 4, and every one of them a read of a pinned figure rather than of a live expression.

**Region-scoping was load-bearing.** `const supersededInsertSide =` exists at BOTH `:336` (commit-ordering test, out of scope) and `:868` (documented-derivation block, in scope) at HEAD. A file-wide gate would have been unsatisfiable without deleting an assertion this plan is forbidden to touch.

## The replaced comment and bindings, before and after

**Before** (`thresholds.spec.ts:864-874` at HEAD) — the comment argued FOR recomputation, and that argument was the defect:

```ts
  // THE INSERT SIDE AS IT READ BEFORE `59347c3`, recomputed rather than quoted —
  // the same expression gate 3's ordering test builds. Written as a literal it
  // would stop tracking the constants the day one of them moves, and the absence
  // check below would then assert the absence of an arbitrary string.
  const supersededInsertSide =
    T.RETENTION_SWEEP_EVERY_N +
    T.ROWS_INSERTED_PER_ARTIFACT_MAX +
    2 * T.SOURCE_ROWS_PER_MAP_MAX;
  const supersededQuotient = (
    supersededInsertSide / T.RETENTION_SWEEP_MAX_ROWS
  ).toFixed(2);
```

Tracking the constants is precisely what a historical figure must NOT do. The old comment's own stated fear — "the absence check below would then assert the absence of an arbitrary string" — is what the RECOMPUTED form would have caused, not the literal form.

**After** (`thresholds.spec.ts:864-884`):

```ts
  // THE INSERT SIDE AS IT READ BEFORE `59347c3`, PINNED AS THE HISTORICAL FIGURE
  // IT IS. 4,227 is what `RETENTION_SWEEP_EVERY_N + ROWS_INSERTED_PER_ARTIFACT_MAX
  // + 2 * SOURCE_ROWS_PER_MAP_MAX` evaluated to at that commit's parent, and it is
  // the figure `ROWS_INSERTED_PER_ITERATION_MAX`'s history paragraph records for
  // 2026-09-02.
  //
  // RECOMPUTING IT WAS THE PREVIOUS SHAPE HERE, AND IT WAS WRONG IN A WAY THAT
  // ONLY SHOWS THE DAY A CONSTANT MOVES. Re-measure `SOURCE_ROWS_PER_MAP_MAX` and
  // the presence half below would demand the NEW number be written into a
  // paragraph describing a day when the number was 4,227, while the absence half
  // would begin asserting the absence of a string that had never been in the
  // docblock — the exact "absence of an arbitrary string" failure the old comment
  // here said this gate existed to avoid. The drift detector would have become
  // the drift generator (07-UAT.md G-07-8).
  //
  // THE COINCIDENCE IS ASSERTED RATHER THAN ASSUMED, immediately below, so the
  // day it ends is a test failure carrying its own remedy instead of a silently
  // wrong demand. The SHIPPED figures above stay derived; only these two are
  // pinned.
  const SUPERSEDED_INSERT_SIDE_BEFORE_59347C3 = 4_227;
  const SUPERSEDED_QUOTIENT_BEFORE_59347C3 = "8.26";
```

**The absence half's per-figure description**, before and after — it no longer spells the retired figure as a live expression:

```ts
// before
grouped(supersededInsertSide),
`the pre-59347c3 insert side (RETENTION_SWEEP_EVERY_N + ` +
  `ROWS_INSERTED_PER_ARTIFACT_MAX + 2 x SOURCE_ROWS_PER_MAP_MAX)`,

// after
grouped(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3),
"the pre-59347c3 insert side, pinned as the historical figure it is rather " +
  "than recomputed from today's constants",
```

## The new test's exact name

> **the superseded figures STILL equal what today's constants recompute, and when they stop it is THIS assertion that retires — not the history**

It does **not** reuse the block-level `REMEDY` string. `REMEDY` directs the reader at the `RETENTION_SWEEP_MAX_PASSES` docblock's prose, which is the correct repair for the absence half's failure and the WRONG repair for this one.

**Proof the assertion is not decorative** — `4_227` mutated to `4_228`, then reverted with `git checkout --`:

```
 FAIL  packages/engine/src/thresholds.spec.ts > the DOCUMENTED derivation matches the SHIPPED constants > the superseded figures STILL equal what today's constants recompute, and when they stop it is THIS assertion that retires — not the history
AssertionError: Today's constants recompute the pre-59347c3 insert side as 4,227, but the pinned historical figure is 4,228. THE LITERAL IS STILL CORRECT AND IT STAYS — it records what the insert side READ at 59347c3's parent, and ROWS_INSERTED_PER_ITERATION_MAX's docblock in packages/engine/src/thresholds.ts describes 2026-09-02, when the figure was 4,228. Do NOT rewrite that history paragraph to 4,227: a paragraph describing a past day does not change because a constant moved today. What ended is the COINCIDENCE that today's constants happen to reproduce the historical figure. THE REMEDY IS TO RETIRE THIS ASSERTION, with a one-line note of the date and the new recomputed value, leaving the two literals, the absence half and the presence half exactly as they are.: expected 4227 to be 4228 // Object.is equality
      Tests  2 failed | 61 passed (63)
```

The message directs the repair at ITSELF and explicitly forbids rewriting the dated paragraph. It never names moving a constant as an option.

## The arm-check: the trap is still armed

**What was mutated.** The one sentence in `ROWS_INSERTED_PER_ITERATION_MAX`'s history paragraph carrying both figures was deleted from the real `packages/engine/src/thresholds.ts`:

```
 * commits mattered. The gate landed first (4,227 on the insert side, over-stated
 * and therefore safe) and the factor was retired second (2,179, exact). Taken the
 * other way round the insert side would have UNDER-stated for the length of one
 * commit, which is verbatim the failure HI-04 records.
```

Both `export const SOURCE_ROWS_PER_MAP_MAX` and `export const ROWS_INSERTED_PER_ITERATION_MAX` were left standing (`grep -c` of each: `1` and `1`), so `region()`'s anchors still resolved and the failure that follows is necessarily the non-vacuity property firing — not the anchor throw.

**RED, verbatim:**

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  packages/engine/src/thresholds.spec.ts > the DOCUMENTED derivation matches the SHIPPED constants > the superseded figures survive where they are CORRECT history, so the absence check cannot pass vacuously
AssertionError: ROWS_INSERTED_PER_ITERATION_MAX's docblock in packages/engine/src/thresholds.ts no longer names 4,227. That paragraph is the record of why 07-14's row-unit gate had to land BEFORE the `2 *` factor was retired — the gate first at 4,227 (over-stated and therefore safe), the factor second at 2,179 (exact). It is ALSO the reason the absence check above is scoped to a region rather than to the file. Restore the paragraph rather than relaxing the scope.: expected 'export const SOURCE_ROWS_PER_MAP_MAX …' to contain '4,227'

 ❯ packages/engine/src/thresholds.spec.ts:1015:7
    1013|         `It is ALSO the reason the absence check above is scoped to a …
    1014|         `than to the file. Restore the paragraph rather than relaxing …
    1015|     ).toContain(grouped(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3));
       |       ^
    1016|     expect(
    1017|       history,

 Test Files  1 failed (1)
      Tests  1 failed | 62 passed (63)
```

**This is the RIGHT failure mode.** The assertion truncation `expected 'export const SOURCE_ROWS_PER_MAP_MAX …' to contain '4,227'` proves `region()` returned a real slice starting at its `from` anchor — it did not throw. The failure is the presence half's `toContain` at `:1015`, exactly as the plan's stop condition required. It did not pass, so the non-vacuity property was not lost in task 1.

**Restore, and proof it took:**

```
$ git checkout -- packages/engine/src/thresholds.ts
$ git status --porcelain -- packages/engine/src/thresholds.ts
(empty)
$ grep -c "The gate landed first (4,227 on the insert side" packages/engine/src/thresholds.ts
1
$ git status --porcelain
(empty)
```

`git checkout --` was the restore mechanism throughout. **`cp` was not used anywhere in this plan** — it is aliased to `cp -i` in this environment and silently no-ops an overwrite, which is how 07-19 lost a file. `git stash`, `git clean` and blanket resets were not used.

**GREEN after restore, verbatim:**

```
 Test Files  1 passed (1)
      Tests  63 passed (63)
   Duration  205ms
```

## Provenance: MEASURED, not documentary

The plan flagged one new planner assumption — that `4_227` is what the insert side read at `59347c3`'s parent — and required the outcome to be stated either way. **It resolves, and it is confirmed by measurement rather than by the repository's own prose.**

`git show --stat 59347c3` resolves to commit `59347c3e07038945de5d869c5c1036356b2f9524`, "fix(07-14): retire the MD-01 compensating factor from the insert bound" (Wed Sep 2 12:30:35 2026). Its own message states: *"Insert side 4,099 -> 2,051; the convergence inequality's right-hand side 4,227 -> 2,179 against an unchanged 8,192 delete budget."*

Confirmed independently against the parent's source rather than its message:

```
$ git show 59347c3^:packages/engine/src/thresholds.ts | grep -A1 "^export const ROWS_INSERTED_PER_ITERATION_MAX"
export const ROWS_INSERTED_PER_ITERATION_MAX =
  ROWS_INSERTED_PER_ARTIFACT_MAX + 2 * SOURCE_ROWS_PER_MAP_MAX;

$ git show 59347c3^:packages/engine/src/thresholds.ts | grep "export const \(RETENTION_SWEEP_EVERY_N\|ROWS_INSERTED_PER_ARTIFACT_MAX\|SOURCE_ROWS_PER_MAP_MAX\|RETENTION_SWEEP_MAX_ROWS\) ="
export const ROWS_INSERTED_PER_ARTIFACT_MAX = 3;
export const RETENTION_SWEEP_MAX_ROWS = 512;
export const RETENTION_SWEEP_EVERY_N = 128;
export const SOURCE_ROWS_PER_MAP_MAX = 2_048;
```

At `59347c3^`: `3 + 2 * 2048 = 4,099`, and the insert side `128 + 4,099 = 4,227`. The quotient `4227 / 512 = 8.255859375`, which `.toFixed(2)` renders `"8.26"`. **Both literals are measured against the parent commit's actual source.** The provenance is not merely documentary.

Today's constants (confirmed against `thresholds.ts` before the literals were written): `RETENTION_SWEEP_EVERY_N = 128` (`:238`), `ROWS_INSERTED_PER_ARTIFACT_MAX = 3` (`:111`), `SOURCE_ROWS_PER_MAP_MAX = 2_048` (`:477`), `RETENTION_SWEEP_MAX_ROWS = 512` (`:152`), `RETENTION_SWEEP_MAX_PASSES = 16` (`:220`). The coincidence holds today, which is why the new assertion is green — and why it was worth asserting.

## The out-of-scope observation, with a suggested owner

**`packages/engine/src/thresholds.spec.ts:328-355` — the commit-ordering test — still recomputes the superseded insert side from today's constants, and that is CORRECT there.**

It was read in full. It declares `const supersededInsertSide = T.RETENTION_SWEEP_EVERY_N + T.ROWS_INSERTED_PER_ARTIFACT_MAX + 2 * T.SOURCE_ROWS_PER_MAP_MAX` and then asserts `shippedInsertSide < supersededInsertSide` plus `deletedPerInterval >= both`. **That is a relational property over today's constants** — "retiring the compensating factor must LOOSEN the inequality" — not a record of what a past day read. It never compares against prose, never touches a docblock, and never demands that a paragraph be rewritten. Move `SOURCE_ROWS_PER_MAP_MAX` and every one of its assertions stays meaningful, because it re-derives both sides of the comparison from the same constant set.

**This is NOT G-07-8's trap wearing different line numbers.** G-07-8's defect was a recomputed figure being fed into a demand on PROSE describing a specific date. This test feeds its recomputation into a comparison against another recomputation. The identical binding name is a coincidence of vocabulary, not of shape.

G-07-8's `artifacts` list scopes this round to the documented-derivation block, so it is **recorded, not fixed** — and the plan's prohibition block forbade touching it. The probe that guards this is the head-region count, which stayed at `1` before and after.

**Suggested owner:** any plan that next touches the commit-ordering test. If that plan wants the two blocks to share vocabulary, the right move is to rename the LOCAL binding there (e.g. `supersededInsertSideRecomputed`) to mark the distinction in the source, not to pin it.

## The numeric floor, and where it was read

**Floor: 90 files / 4321 tests, read from `.planning/phases/07-sourcemap-reconstruction/07-24-SUMMARY.md`** — its "The floor used, and where it was read" section states verbatim *"Floor for 07-25: 90 files / 4321 tests, a recorded measurement"* and reproduces the vitest summary lines. A measurement carried forward, not prose copied.

**This plan adds exactly one test**, so the target is floor plus one: **90 files / 4322 tests**. Result, verbatim:

```
 Test Files  90 passed (90)
      Tests  4322 passed (4322)
   Duration  15.29s
```

`4322 = 4321 + 1`, and the one is attributable: the coincidence assertion, which the single-file run also reports (63 = 62 + 1). No file count moved.

## Verification Results

| Gate | Command | Result |
|---|---|---|
| Owning spec | `pnpm vitest run packages/engine/src/thresholds.spec.ts --reporter=dot` | **`Test Files 1 passed (1)` / `Tests 63 passed (63)`**, exit 0, 0.21s |
| Whole suite | `pnpm vitest run --reporter=dot` | **`Test Files 90 passed (90)` / `Tests 4322 passed (4322)`**, exit 0, 15.29s |
| Types | `pnpm typecheck` | exit **0** |
| Lint | `pnpm lint` | exit **0** — no unused binding, so no consumer was left reading a retired recomputation |
| Knip | `pnpm knip` | exit **0**, and `pnpm knip \| grep -c "thresholds.spec"` prints `0` — the two literals stayed spec-local and were not exported |
| Build | `pnpm build` | exit **0** — plugin package zip created |
| Tree, engine + backend | `git diff --name-only -- packages/engine packages/backend` | **empty** after commit; before commit it listed only `packages/engine/src/thresholds.spec.ts` |
| `thresholds.ts` clean | `git status --porcelain -- packages/engine/src/thresholds.ts` | **empty** — the arm-check's deletion did not survive |
| `retention.ts` clean | `git diff --name-only -- packages/backend/src/store/retention.ts` | **empty** |
| Whole tree | `git status --porcelain` | **empty** |

All pathspec-scoped, as the plan required: this phase runs without worktrees and round 3's three plans share one working tree.

## Decisions Made

- **Historical figures are pinned; shipped figures stay derived.** The distinction the old comment collapsed is now explicit in the source. All six shipped figures (`deleteSide`, `insertSide`, `quotient`, `smallestSatisfying`, `nextPowerOfTwo`, `headroom`) remain expressions over `T.*` imports — verified by grep, no literal among them.
- **The coincidence assertion carries its own remedy and does not reuse `REMEDY`.** Reusing it would have pointed a future engineer at the passes docblock for a failure that has nothing to do with the passes docblock.
- **The non-vacuity property was demonstrated against the real file, not asserted.** This is the single most likely thing to be lost while repairing a guard, and the plan made it a task rather than a claim. It cost one temporary mutation and one `git checkout --`.
- **The commit-ordering test was left alone.** Read, distinguished, recorded, owner named.

## Deviations from Plan

None — plan executed exactly as written. No deviation rule fired; no auto-fix was needed; no architectural question arose.

Two things worth noting as executed-as-specified rather than as deviations:

- **Task 1's steps 3–5 were applied as one atomic edit, in the observation order the plan's action specified.** The plan directs writing the coincidence assertion first and observing it GREEN. That was done literally: the literals and the new `it` were added while the old recomputed bindings were still in place, `pnpm vitest run` reported **63 passed** — confirming the coincidence is currently true and was currently silent — and only then were the old comment and bindings retired and the two consumers rewired. Splitting these into separate COMMITS was not possible: deleting the bindings without rewiring the consumers leaves the file non-compiling, so an intermediate commit would have been a knowingly broken tree. One commit, two observed states.
- **Task 2 produced no commit** because it produces no durable file change by design — it is a demonstration plus the repository gate. Its output is the evidence in this SUMMARY.

## Issues Encountered

None.

## Known Stubs

None. No stub, TODO, FIXME, skipped test or unrun `<verify>` was introduced. Every `<automated>` command in both tasks was run and its output is recorded above.

## Threat Flags

None. The change is confined to one vitest spec file. No network surface, no filesystem access from plugin code, no schema change, no auth path, no trust boundary moved. `readFileSync` over a repository-relative path inside the spec is pre-existing (T-07-116, disposition `accept`) and unchanged by this plan.

Threat register dispositions, all `mitigate`, all discharged:

- **T-07-111** (the gate demanding a false rewrite of a dated paragraph) — the two figures are pinned; the demand can no longer move when a constant moves.
- **T-07-112** (the non-vacuity guard removed while being repaired) — arm-check RED at `:1015`, verbatim above; positive gate at 10 references against a floor of 4.
- **T-07-113** (a constant moved to make an assertion pass) — `git status --porcelain -- packages/engine/src/thresholds.ts` empty; `git diff --name-only -- packages/engine` listed only the spec.
- **T-07-114** (the arm-check's deletion surviving into a commit) — restored with `git checkout --`, porcelain empty, 63 green after restore, `cp` never used.
- **T-07-115** (a literal presented as history without provenance) — provenance measured against `59347c3^`'s source, recorded above.

## User Setup Required

None — no external service configuration required.

## Round 3 closing position

This is the last plan of gap-closure round 3 (`07-23` → `07-24` → `07-25`).

**Closed this round:**

| Gap | Plan | Commit |
|---|---|---|
| G-07-5 | 07-23 | closed |
| G-07-6 | 07-24 | closed |
| G-07-7 | 07-24 | closed |
| **G-07-8 / WR-04** | **07-25** | **`ed0018e`** |

G-07-8 was also this round's one recorded `coincidental_reliance_item` (`undeclared-precondition`) — the gate silently depended on `SOURCE_ROWS_PER_MAP_MAX` not having moved and never said so. It says so now, in an assertion.

**Still open by operator decision, and untouched by this round:** W-4, W-6 (`MAP_MAX_BYTES`), UAT gap 3, SC5's second half (the FP corpora), MAP-01's external half, and IN-04 (the operator answered explicitly: no caveat wanted while `DERIVED_MAX_DEPTH` is 1). Also untouched and previously deferred with owners recorded: 07-22's accepted withholding text, the retired marker sweep, and `07-UI-SPEC.md:851`'s stale `redactUrlForExport` row (deferred by 07-24).

**Standing prohibitions all held:** no new migration, `SCHEMA_VERSION` still 9, no FK or `ON DELETE CASCADE`, `RETENTION_SWEEP_MAX_PASSES` still 16 (not lowered — never approved), `MAP_MAX_BYTES` unchanged, no outbound fetch (D-01), no filesystem access from plugin code (D-17), no change to `redactUrlForExport` / the export vocabulary / `observations.url`, no change to the depth guard.

## Next Phase Readiness

- **Round 3 is complete: 25 of 25 plans executed, 25 SUMMARYs on disk.** Phase 07 is ready for verification.
- **The verifier reads these numbers:** 90 files / 4322 tests, `pnpm typecheck && pnpm lint && pnpm knip && pnpm build` all exit 0, working tree clean.
- **MAP-06** is declared by both 07-23 and 07-25; with this SUMMARY on disk the shared-ID gate (#2388) should release it.
- No blockers. One recorded observation carried forward: the commit-ordering test's own recomputation, with its owner named above.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-03*

## Self-Check: PASSED

- `packages/engine/src/thresholds.spec.ts` — FOUND on disk.
- `.planning/phases/07-sourcemap-reconstruction/07-25-SUMMARY.md` — FOUND on disk.
- Commit `ed0018e` — FOUND in `git log --oneline --all`.
- Every `<automated>` command from both tasks was run; all pass. Working tree clean.
