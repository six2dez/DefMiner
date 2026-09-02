---
phase: 07-sourcemap-reconstruction
plan: 19
subsystem: testing
tags: [telemetry, counters, sourcemap, depth-bound, vitest, consumer]

requires:
  - phase: 07-sourcemap-reconstruction
    provides: "07-15's hoisted D-13 depth gate — the fix whose trigger condition this plan corrects without moving the gate back"
  - phase: 07-sourcemap-reconstruction
    provides: "07-18's repair pattern for this round: read the documented unit as the specification, and change the code rather than the sentence"
provides:
  - "`derivedRejected.depth_exceeded` fires on ADMISSION rather than on recovery — an `admittedForRecursion` local counted where the recursion call site is reached, and the emission moved below the per-source loop"
  - "the refusal log line's number is the admitted count and its noun says `admitted source(s)`, so the number and the word agree"
  - "two pinning cases in `consumer.spec.ts` — the all-empty `sourcesContent` map (`depth_exceeded === 0`) and the mixed map (one refusal, logged number 2 not 3) — both proven RED against the pre-fix tree"
affects: [07-20, 07-21, 07-22, telemetry, sourcemap, ingest]

actuals:
  tokens: 4200
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "counter-trigger pinning in both directions: one case proving the counter STAYS ZERO when nothing was admitted, and one proving the logged number is the admitted count rather than the recovered count — extracted with a noun-independent regex so the pre-fix failure is arithmetic, not a wording miss"
    - "non-vacuity companion on every zero assertion: `depth_exceeded === 0` is paired with `derivedRejected.empty === 3`, which proves the sources genuinely reached `admitDerived` and were genuinely refused there"

key-files:
  created: []
  modified:
    - packages/backend/src/ingest/consumer.ts
    - packages/backend/src/ingest/consumer.spec.ts

key-decisions:
  - "`admittedForRecursion` is incremented immediately BEFORE `if (nextDepth.ok)` at consumer.ts:1420, not immediately after `admitDerived` returns admitted. Both satisfy the review's named fix, but the acceptance criterion says `incremented only on a path that reaches the if (nextDepth.ok) recursion call site` — placing it at the call site makes that literally true rather than argued, and no reader has to reason about the two intervening `return done(null)` re-checks to believe it."
  - "The abandoned-stage consequence is stated in the code beside the emission, not left to be rediscovered: a stage abandoned on project change `return done(null)`s from inside the loop, never reaches the emission, and therefore emits no depth refusal at all — correct, because a stage that was abandoned did not decline to recurse, it stopped."
  - "The mixed case's inadmissible half is EMPTY and not over-size. `DERIVED_SOURCE_MAX_BYTES` is `MAP_MAX_BYTES` and a source's bytes are a strict subset of the JSON document that carried them, which `parseSourceMap` has already refused above that same ceiling — so `too_large` is unreachable through the ingest path and `empty` is the only refusal a map can actually mix in. Recorded in the case's own comment."
  - "`telemetry.ts` was read as the specification and not edited. `git diff --name-only -- packages/backend/src/telemetry.ts` is empty at every commit of this plan."

patterns-established:
  - "Pattern: decide at the top, report at the bottom. A per-stage decision stays where it is taken; the REPORT of that decision is emitted from a counter of what actually happened, so the counter cannot claim a bound fired for work that was never attempted."
  - "Pattern: extract a logged number with a regex that does not depend on the surrounding noun, so a case that is meant to fail on arithmetic fails on arithmetic and not on wording."

requirements-completed: [MAP-06]

coverage:
  - id: D1
    description: "A map whose every `sourcesContent` entry is the empty string produces `derivedRejected.depth_exceeded === 0` — no recursion was attempted at any depth, so the bound did not fire."
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#a map whose every `sourcesContent` entry is EMPTY declines nothing — `depth_exceeded` stays 0"
        status: pass
      - kind: other
        ref: "RED reproduction: same case run against HEAD~1's consumer.ts — 'expected 1 to be +0 // Object.is equality'"
        status: pass
    human_judgment: false
  - id: D2
    description: "A mixed map (3 recovered, 2 admitted) declines exactly once, logs exactly once, and the number in that line is 2 — the admitted count — beside the noun `admitted source(s)`."
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#a MIXED map declines ONCE and the logged number is the ADMITTED count, not the recovered one"
        status: pass
      - kind: other
        ref: "RED reproduction: same case run against HEAD~1's consumer.ts — 'the refusal line says 3 where 2 sources were admitted for recursion … expected 3 to be 2'"
        status: pass
    human_judgment: false
  - id: D3
    description: "MD-03's one-refusal-and-one-log-line-per-stage property is unchanged: 12 sources still give exactly 1 increment and exactly 1 console line, and 2 sources still give exactly 1 increment."
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#emits ONE depth refusal and ONE log line for a map carrying many sources"
        status: pass
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#fires ONCE PER STAGE, so the bound does not scale with what it bounds"
        status: pass
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#does not fire depth_exceeded when nothing was recovered"
        status: pass
    human_judgment: false
  - id: D4
    description: "No new telemetry surface: `SOURCEMAP_COUNTERS` still names six sourcemap fields and `depth_exceeded` is not among them, so no health surface renders the corrected counter."
    verification:
      - kind: other
        ref: "read of packages/frontend/src/components/health-contract.ts:163-200 — announcedInline, announcedExternal, mapRefusedTooLarge, mapMalformed, sourcesRecovered, sightingsRecorded"
        status: pass
    human_judgment: false
  - id: D5
    description: "`packages/backend/src/telemetry.ts` is unmodified and its stated unit is now the unit the counter delivers."
    verification:
      - kind: other
        ref: "git diff --name-only -- packages/backend/src/telemetry.ts — empty output"
        status: pass
    human_judgment: false
  - id: D6
    description: "The round baseline holds: 90 test files / 4307 tests exit 0, and typecheck, lint, knip and build each exit 0."
    verification:
      - kind: other
        ref: "pnpm vitest run --reporter=dot — Test Files 90 passed (90), Tests 4307 passed (4307)"
        status: pass
      - kind: other
        ref: "pnpm typecheck && pnpm lint && pnpm knip && pnpm build — all exit 0"
        status: pass
    human_judgment: false

duration: 7 min
completed: 2026-09-02
status: complete
---

# Phase 07 Plan 19: Count The Depth Refusal From What Was Admitted Summary

**`derivedRejected.depth_exceeded` now fires on ADMISSION rather than on recovery — an `admittedForRecursion` local at `consumer.ts:1274`, incremented at the recursion call site and reported from below the per-source loop — so a map whose every `sourcesContent` entry is empty declines nothing and the counter says so, with two cases that were RED against the shipped tree pinning both directions.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-09-02T19:52:30Z
- **Completed:** 2026-09-02T19:59:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- **G-07-4 / IN-01 closed.** The counter and its log line now share one condition, and that condition reads `admittedForRecursion` rather than `parsed.recovered.length`. Both inaccuracies the review named — the one the shipped comment recorded and the one it did not — are gone in a single edit, because they were always one defect.
- **The corner is now permanently pinned.** 07-15's executor reproduced IN-01 empirically and the reproduction died with the session. Two cases carry it forward, and both were confirmed RED against the pre-fix tree rather than assumed to be.
- **MD-03 was not reopened and was re-measured rather than assumed intact.** Twelve sources still give one increment and one console line; two sources still give one increment.
- **`telemetry.ts` was not edited.** Its paragraph was the specification and it was already right; the code moved to it.

## The RED, recorded verbatim

Both cases were run against the pre-fix `consumer.ts` (`HEAD~1` at the time, restored by file copy — no `git stash`, no `git clean`, no working-tree reset).

**Case 1 — the all-empty map.** Observed value `1`, expected `0`:

```
FAIL … > a map whose every `sourcesContent` entry is EMPTY declines nothing — `depth_exceeded` stays 0
Inner error message: the depth counter fired for a stage in which NOTHING could have recursed:
all three recovered sources were refused by `admitDerived` before the recursion call site was
reachable. `telemetry.ts` states the unit as one reconstruction stage that DECLINED TO RECURSE,
and that a non-zero value always means at least one map-bearing artifact reached the bound.
Count what was ADMITTED for recursion, not what the map RECOVERED (07-REVIEW.md IN-01).
: expected 1 to be +0 // Object.is equality
```

The two assertions ahead of it — `derivedRejected.empty === 3` and `sourcesRecovered === 0` — both PASSED against the pre-fix tree, which is what proves the failure is the counter and not the fixture: the three sources genuinely reached `admitDerived` and were genuinely refused there.

**Case 2 — the mixed map.** Observed value `3`, expected `2`:

```
FAIL … > a MIXED map declines ONCE and the logged number is the ADMITTED count, not the recovered one
Inner error message: the refusal line says 3 where 2 sources were admitted for recursion. The line
is interpolating the count the map RECOVERED (3), which over-states by every source `admitDerived`
refused before it could recurse (07-REVIEW.md IN-01).
: expected 3 to be 2 // Object.is equality
```

`Tests  2 failed | 78 passed (80)` against the pre-fix tree; `Tests  80 passed (80)` after.

## The emission, before and after, with line numbers

| | Before (commit `42dafaf`) | After (commit `afb30cb`) |
|---|---|---|
| Decision | `consumer.ts:1272` — `const nextDepth = admitDerivedDepth(input.depth + 1);` | `consumer.ts:1273` — unmoved |
| Counter of what happened | none | `consumer.ts:1274` — `let admittedForRecursion = 0;` |
| Increment | none | `consumer.ts:1420` — `admittedForRecursion += 1;`, immediately above `if (nextDepth.ok) {` |
| Guard | `consumer.ts:1273` — `if (!nextDepth.ok && parsed.recovered.length > 0)`, ABOVE the loop | `consumer.ts:1459` — `if (!nextDepth.ok && admittedForRecursion > 0)`, BELOW the loop |
| Increment site | `consumer.ts:1274` | `consumer.ts:1460` |
| Logged number | `String(parsed.recovered.length)` | `String(admittedForRecursion)` |
| Logged noun | `" source(s) recovered from "` | `" admitted source(s) from "` |

`sm.derivedRejected[nextDepth.reason]++` appears **exactly once** in the file, at `consumer.ts:1460`, after the per-source loop's closing brace at `:1441`.

## The abandoned-stage sentence, as written into the code

At `consumer.ts:1455-1458`, beside the emission:

> A STAGE ABANDONED ON PROJECT CHANGE EMITS NO REFUSAL AT ALL, because the two `stillCurrent()` re-checks inside the loop `return done(null)` and never reach here — a stage that was abandoned did not decline to recurse, it stopped.

This is a behaviour change a reader will notice, and it is correct: an abandoned stage did not decline anything. It falls out for free from moving the emission below the loop, which is why the plan asked for it to be decided deliberately rather than inherited.

## The mixed case's numbers

Fixture: `mapDocument(["a.ts", "b.ts", "c.ts"], ["const a = 1;\n", "", "const c = 3;\n"])`.

| Quantity | Value |
|---|---|
| `parsed.recovered.length` (what the map recovered) | 3 |
| `derivedRejected.empty` | 1 |
| `admittedForRecursion` / `sourcesRecovered` | 2 |
| `derivedRejected.depth_exceeded` | 1 |
| console lines containing `depth_exceeded` | 1 |
| number extracted from that line, after the fix | **2** |
| number extracted from that line, before the fix | **3** |

The extraction regex is `/reconstruction of the (\d+) /` — deliberately noun-independent, so the pre-fix failure is the arithmetic and not a wording miss. A separate assertion then checks the noun: the line contains `2 admitted source(s)`.

## The two MD-03 cases, re-measured

| Case | Asserted values | Result |
|---|---|---|
| `emits ONE depth refusal and ONE log line for a map carrying many sources` | `sourcesRecovered === 12`, `depth_exceeded === 1`, console lines containing `depth_exceeded` === 1, and `depth_exceeded !== sourcesRecovered` | pass |
| `fires ONCE PER STAGE, so the bound does not scale with what it bounds` | `depth_exceeded === 1` for a 2-source map | pass |
| `does not fire depth_exceeded when nothing was recovered` (the zero case) | `depth_exceeded === 0` for a bundle with no map | pass |

All three are byte-unmodified — `git diff --stat` on the spec reports insertions only (`+55` then `+86`, `0` deletions across both commits). The one-refusal-per-stage property is intact and the counter is still not equal by construction to `sourcesRecovered`.

## `SOURCEMAP_COUNTERS` — the magnitude claim, re-checked rather than carried forward

`packages/frontend/src/components/health-contract.ts:163` freezes **six** members:

1. `announcedInline`
2. `announcedExternal`
3. `mapRefusedTooLarge`
4. `mapMalformed`
5. `sourcesRecovered`
6. `sightingsRecorded`

`depth_exceeded` is **not** among them, and no member of `derivedRejected` is. The review's magnitude statement holds: no health surface renders this counter, so the defect was one wrong increment per map-bearing artifact in the telemetry sub-map, against the 781 lines MD-03's fix removed from the proxy thread. This plan adds **no** telemetry field and **no** counter — `admittedForRecursion` is a function-scoped local.

## The full gate, against the round baseline

| Gate | 07-VERIFICATION baseline | 07-18 recorded | This plan | Verdict |
|---|---|---|---|---|
| `pnpm vitest run` files | 90 | 90 | **90** | at floor |
| `pnpm vitest run` tests | 4,302 | 4,305 | **4,307** | +2, the two new cases |
| `pnpm vitest run` exit | 0 | 0 | **0** | ok |
| `pnpm typecheck` | 0 | 0 | **0** | ok |
| `pnpm lint` | 0 | 0 | **0** | ok |
| `pnpm knip` | 0 | 0 | **0** | ok |
| `pnpm build` | 0 | 0 | **0** | ok |

The floor used is 07-18's recorded 4,305 and not the verifier's 4,302, exactly as the plan requires — 07-18 precedes this plan in the serialised chain and its two cases are committed, so comparing against 4,302 would have tolerated them silently disappearing. 4,307 = 4,305 + 2.

`consumer.spec.ts` alone: 78 before → 79 after task 1 → **80** after task 2. A lower count would have meant a depth case was replaced rather than added; the count only rose.

Scope checks:

- `git diff --name-only -- packages/backend/src/ingest` → `consumer.spec.ts` only at the point of the check (`consumer.ts` already committed); across the plan the two paths are the only ones touched.
- `git diff --name-only -- packages/backend/src/telemetry.ts` → **empty**, at every commit.

## Task Commits

1. **Task 1 (RED): the pinning case for the all-empty map** — `c8a5932` (test)
2. **Task 1 (GREEN): count the depth refusal from what was admitted** — `afb30cb` (fix)
3. **Task 2: pin the mixed map** — `3c9527f` (test)

## Files Created/Modified

- `packages/backend/src/ingest/consumer.ts` — `admittedForRecursion` declared at `:1274`, incremented at `:1420`, and the depth refusal's increment plus log line moved from above the per-source loop to `:1444-1471` below it; the comment above the gate rewritten to state what is now true; the MD-03 781-line history paragraph at `:1249-1261` left byte-unchanged.
- `packages/backend/src/ingest/consumer.spec.ts` — two cases added to the `D-13` describe block at `:2635` and `:2696`; no existing line changed.

## Decisions Made

See `key-decisions` in the frontmatter. The one worth repeating here: the increment sits at the recursion call site rather than at the admission arm. Both placements produce identical counts — the two `stillCurrent()` re-checks between them `return done(null)` and skip the emission entirely — but only one of them makes the acceptance criterion (`incremented only on a path that reaches the if (nextDepth.ok) recursion call site`) true by inspection instead of by argument.

## Deviations from Plan

### 1. [Rule 1 — plan-text defect] One acceptance criterion of task 2 is unsatisfiable as literally written, and was satisfied in its evident intent

- **Found during:** Task 2, writing the mixed case.
- **Issue:** The criterion reads *"a mixed case asserting `depth_exceeded === 1`, exactly one filtered console line, and a number in that line that differs from `sourcesRecovered`"*, and the action text adds *"compare it against `sourcesRecovered`, asserting they DIFFER — an equality assertion here would pass on the shipped code and prove nothing."* But `sm.sourcesRecovered` increments on exactly the sources `admitDerived` admits and the store then writes, so after the fix `admittedForRecursion === sourcesRecovered` identically. Asserting the logged number DIFFERS from `sourcesRecovered` would fail against the correct implementation. The discriminating comparison the plan actually wants is against the count the MAP recovered (`parsed.recovered.length`) — which is the number the shipped code interpolated and the noun the shipped message used ("N source(s) recovered from …"). The plan's `<behavior>` block states it correctly: *"the number in the log line equals the admitted count rather than the recovered count."*
- **Fix:** The case asserts **both** directions rather than picking one — `logged === 2` (the admitted count, and equal to `sourcesRecovered`, asserted separately) **and** `logged !== 3` (the map's recovered-source count). Against the pre-fix tree this fails at `expected 3 to be 2`, so it is fully discriminating; against the fixed tree it passes. Nothing was weakened: the plan's stated purpose — that the line cannot silently go back to interpolating the recovered count — is asserted directly.
- **Files modified:** `packages/backend/src/ingest/consumer.spec.ts`
- **Verification:** RED confirmed against `HEAD~1`'s `consumer.ts` (2 failed / 78 passed); GREEN after (80 passed).
- **Committed in:** `3c9527f`

### 2. [Rule 2 — missing critical] The over-size half of the mixed case is structurally unreachable and is recorded rather than faked

- **Found during:** Task 2, reading `derive.ts` for `DERIVED_SOURCE_MAX_BYTES` as the plan's `<read_first>` directs.
- **Issue:** The plan's `<read_first>` anticipates an over-size source in the mixed fixture ("so the over-size half of the mixed case refuses for the reason it is supposed to refuse for"). `DERIVED_SOURCE_MAX_BYTES = MAP_MAX_BYTES` (`derive.ts:142`), and a source's bytes are a strict subset of the JSON document that carried it — which `parseSourceMap` has already refused above that same ceiling. So no map reaching the consumer can contain a source that `admitDerived` refuses as `too_large`: the reason is reachable only by calling `admitDerived` directly, which `derive.spec.ts` already does.
- **Fix:** The mixed fixture uses `empty` for its inadmissible half — which the plan's own action text permits ("at least one carries real content and at least one is empty") — and the reason the other half was not used is written into the case's comment so the next reader does not try to add it.
- **Files modified:** `packages/backend/src/ingest/consumer.spec.ts`
- **Verification:** `derive.ts:142` and `:233` read directly; `pnpm vitest run packages/backend/src/sourcemap/derive.spec.ts` green (part of the 90/90 run).
- **Committed in:** `3c9527f`

---

**Total deviations:** 2 (1 plan-text defect corrected in the plan's evident intent, 1 unreachable-path finding recorded in code).
**Impact on plan:** None on scope or outcome. Both new cases are RED-proven against the pre-fix tree, which is the property the plan asked for. No prohibition was approached: no migration, no foreign key, no `ON DELETE CASCADE`, no change to `RETENTION_SWEEP_MAX_PASSES`, `MAP_MAX_BYTES`, `DERIVED_MAX_DEPTH` or `DERIVED_SOURCE_MAX_BYTES`, no outbound fetch, no filesystem access, no new counter, no new telemetry field, and no edit to `telemetry.ts`.

## Issues Encountered

- **A `cp` that silently did not overwrite.** Restoring the fixed `consumer.ts` after the RED reproduction used `cp`, which is aliased to `cp -i` in this environment; it prompted, defaulted to "not overwritten", and left the working tree holding the PRE-FIX file. Caught immediately by `git diff --name-only`, which reported `consumer.ts` modified when it should have been clean, and corrected with `cat … > …`. The tree was then confirmed byte-identical to `HEAD` before any further work. Worth recording because the failure mode is silent: the run that follows an unnoticed non-overwrite measures the wrong tree.
- No `git stash`, `git clean`, `git reset --hard` or blanket working-tree restore was used at any point; the RED reproduction swapped one file by copy and swapped it back.

## Findings for the next round

- **F-1 (informational, not a defect):** `derivedRejected.too_large` is unreachable through the ingest path for the reason recorded in deviation 2 — `DERIVED_SOURCE_MAX_BYTES` equals `MAP_MAX_BYTES`, and a source cannot exceed the document that contains it. The counter is not wrong, but it can only ever read 0 in production, which is a different claim from the one an operator reading a refusal list would make. `packages/backend/src/sourcemap/derive.ts:142`. Not actioned here: the plan's prohibitions forbid touching `MAP_MAX_BYTES` (open by operator decision, W-6) and any admission threshold, and every route to making the counter meaningful runs through one of them.
- No second counter whose trigger condition disagrees with its documented unit was surfaced by this work.

## Known Stubs

None. No placeholder, no `TODO`, no skipped test, and no `<verify>` command went unrun.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-07-4 / IN-01 is closed at `afb30cb` (fix) with its pins at `c8a5932` and `3c9527f`.
- The tree is green at 90 files / 4,307 tests with all four static gates at 0, which is the baseline `07-20` inherits as the head of its own link in the serialised chain.
- 19 of 22 plans complete. `07-20` is next.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-02*
