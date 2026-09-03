---
phase: 07-sourcemap-reconstruction
plan: 23
subsystem: ingest
tags: [sourcemap, comments, depth-guard, admitDerived, telemetry, vitest, awk-gate]

# Dependency graph
requires:
  - phase: 07-sourcemap-reconstruction
    provides: "plan 07-19's two hoisted depth-refusal justifications in `consumer.ts` and the correct mixed-map statement in `consumer.spec.ts:2690-2695` — the defect and its own specification, committed in one range"
  - phase: 07-sourcemap-reconstruction
    provides: "round 2's 90 files / 4321 tests baseline, and its lesson that a forbidden-construct grep needs comment-stripping — inverted here on purpose"
provides:
  - "`consumer.ts`'s two depth-refusal justifications now name `empty` as the only reachable `admitDerived` refusal and state the size refusal's unreachability positively"
  - "the region-scoped comment gate — non-vacuity companion + negative half + positive half, prefilter deliberately inverted — proven RED→GREEN on both regions, for 07-24 and 07-25 to cite by name"
  - "the adjacent-text preservation gate, proven on two MID-LINE edit boundaries where a surviving sentence shared its line with the end of a deleted run"
  - "a recorded whole-suite floor of 90 files / 4321 tests for plan 07-24 to retarget at"
affects: [07-24, 07-25, phase-07-verification, sourcemap-reconstruction]

# Actuals (#2632)
actuals:
  tokens: 864
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "region-scoped comment gate: `awk '/anchor-a/,/anchor-b/' file | grep`, with a non-vacuity companion proving the range resolved before any negated assertion is trusted"
    - "adjacent-text preservation gate: a positive `grep -cF … || true` pinning a sentence whose opening shares a line with the end of a deleted run"
    - "deliberately INVERTED comment-stripping prefilter: when the comment IS the subject, stripping comments leaves a gate that can never fail"

key-files:
  created: []
  modified:
    - packages/backend/src/ingest/consumer.ts

key-decisions:
  - "Deleted the size-refusal half from both production comments AND stated its unreachability positively — the gap's `truth:` demands the comments *say* the refusal is unreachable, so deletion alone would have left it unsatisfied."
  - "Scoped both gates to `awk` ranges rather than the file: `too_large` is legitimate prose at `consumer.ts:276` and LIVE production code at `:1005`, so a file-wide gate would be unsatisfiable. Both survivors verified intact after the edit."
  - "Inverted round 2's comment-stripping prefilter deliberately. The comment is the subject here; a stripping prefilter would delete the subject and leave a vacuously-green gate."
  - "Carried both mid-line-adjacent sentences forward as re-wrapped text, not bytes. Byte-identity is unachievable when the shared line is itself rewritten; the plan says so and the two preservation gates pin the text instead."
  - "Committed task 1 before running task 2's `git diff --name-only`, per GSD's atomic per-task commit contract, and evaluated that scope gate against `HEAD~1..HEAD` instead of the (now clean) working tree."

patterns-established:
  - "Comment-only repair with a mechanical gate: a claim a code path can fire is held to the same evidence standard as the code, by a gate that reads the claim."
  - "An omission is stated as a decision, never left as a hole: both rewritten passages say WHY the deleted half is absent and name where the argument lives, so the next reader cannot restore it as a helpful completion."

requirements-completed: [MAP-06]

coverage:
  - id: D1
    description: "Region 1 (`COUNTED AND LOGGED FROM WHAT WAS ADMITTED`) names `empty` as the only reachable `admitDerived` refusal and states the size refusal is structurally unreachable through the ingest path."
    requirement: MAP-06
    verification:
      - kind: other
        ref: "awk '/COUNTED AND LOGGED FROM WHAT WAS ADMITTED/,/const nextDepth = admitDerivedDepth/' packages/backend/src/ingest/consumer.ts | grep -c 'too_large' — 1 before, 0 after"
        status: pass
      - kind: other
        ref: "same range | grep -c 'structurally unreachable' — 0 before, 1 after"
        status: pass
      - kind: other
        ref: "same range | grep -c 'RECOVERY IS NOT' — non-vacuity companion, 1 before and after"
        status: pass
    human_judgment: false
  - id: D2
    description: "Region 2 (`DECIDED AT THE TOP, REPORTED AT THE BOTTOM`) describes exactly one hostile-map shape — the all-empty-`sourcesContent` map — and states the size refusal's unreachability with the byte-subset argument."
    requirement: MAP-06
    verification:
      - kind: other
        ref: "awk '/DECIDED AT THE TOP, REPORTED AT THE BOTTOM/,/if \\(!nextDepth.ok/' packages/backend/src/ingest/consumer.ts | grep -c 'both reachable' — 1 before, 0 after"
        status: pass
      - kind: other
        ref: "same range | grep -c 'structurally unreachable' — 0 before, 1 after"
        status: pass
      - kind: other
        ref: "same range | grep -c 'stillCurrent' — non-vacuity companion and abandoned-stage-paragraph survival, 1 before and after"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both mid-line-adjacent sentences survived the re-flow verbatim as text — the two adjacent-text preservation gates read 1 in BOTH columns."
    requirement: MAP-06
    verification:
      - kind: other
        ref: "region 1 | grep -cF 'Guarding the emission' || true — 1 before, 1 after"
        status: pass
      - kind: other
        ref: "region 2 | grep -cF 'The number beside the reason' || true — 1 before, 1 after"
        status: pass
    human_judgment: false
  - id: D4
    description: "Zero behavioural change: every changed diff line is a `    // ` comment line, no `admitDerivedDepth` / `admittedForRecursion` / `derivedRejected` / brace appears in the diff, and the depth guard's 80 `consumer.spec.ts` tests pass unchanged."
    requirement: MAP-06
    verification:
      - kind: integration
        ref: "pnpm vitest run packages/backend/src/ingest/consumer.spec.ts --reporter=dot — Tests 80 passed (80), exit 0"
        status: pass
      - kind: other
        ref: "git diff --unified=0 -- packages/backend/src/ingest/consumer.ts | grep -vE '^[+-]    // ' — no non-comment changed line"
        status: pass
    human_judgment: false
  - id: D5
    description: "The repository gate holds at the round-2 baseline with no test added: 90 files / 4321 tests, and typecheck / lint / knip / build all exit 0."
    verification:
      - kind: integration
        ref: "pnpm vitest run --reporter=dot — Test Files 90 passed (90), Tests 4321 passed (4321)"
        status: pass
      - kind: other
        ref: "pnpm typecheck && pnpm lint && pnpm knip && pnpm build — all exit 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "The cited-but-unedited files are provably untouched: `consumer.spec.ts` (the specification), `telemetry.ts` (IN-04, closed by operator decision), `derive.ts` and `parse.ts` (the evidence chain)."
    verification:
      - kind: other
        ref: "git diff --name-only HEAD~1 HEAD -- packages/backend/src/telemetry.ts packages/backend/src/sourcemap packages/engine/src/sourcemap — empty"
        status: pass
      - kind: other
        ref: "git diff --name-only HEAD~1 HEAD — exactly packages/backend/src/ingest/consumer.ts"
        status: pass
    human_judgment: false

# Metrics
duration: 11 min
completed: 2026-09-03
status: complete
---

# Phase 07 Plan 23: G-07-5 — the unreachable size refusal deleted from both depth justifications Summary

**Both `consumer.ts` depth-refusal comments now name `empty` as the only reachable `admitDerived` refusal and state the size refusal's structural unreachability positively, held by a region-scoped `awk`-bracketed comment gate that flipped RED→GREEN on exactly the edit — zero executable lines moved, 4321 tests unchanged.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-09-03T10:56Z
- **Completed:** 2026-09-03T11:07Z
- **Tasks:** 2 (1 tracer, 1 verification-only)
- **Files modified:** 1

## Accomplishments

- Both production comments corrected in one commit: the size refusal is no longer named as a reachable `admitDerived` reason at either site, and each site now states *why* it is absent and where the argument is made.
- The **region-scoped comment gate** proven end to end — RED before, GREEN after, in both directions, for both regions — including the non-vacuity companion that is the only thing standing between a moved anchor and a vacuously-passing `! grep`.
- The **adjacent-text preservation gate** proven on two MID-LINE edit boundaries, the failure mode nothing else in the plan would have caught.
- Repository gate green at the recorded round-2 baseline with no test added: **90 files / 4321 tests**, four static gates at exit 0.

## Task Commits

1. **Task 1: TRACER — the two comments corrected, held by a gate that reads the comment** — `94b2e6a` (docs)
2. **Task 2: Prove nothing executable moved, then run the repository gate** — verification-only, writes no source; its evidence is this SUMMARY and it carries no source commit of its own.

**Plan metadata:** see the `docs(07-23)` commit that carries this file.

## Files Created/Modified

- `packages/backend/src/ingest/consumer.ts` — two comment regions rewritten (19 insertions, 11 deletions, all `    // ` lines). Region 1 now spans **1263–1275**; region 2's header moved to **1446** and its closing `if (!nextDepth.ok …)` to **1467** (both +3 from the region-1 net line gain).

## The eight region probes, before and after

| # | Probe | Role | Before | After | Intended |
|---|---|---|---|---|---|
| P1 | region 1 \| `grep -c 'RECOVERY IS NOT'` | non-vacuity companion, region 1 | **1** | **1** | hold at 1 |
| P2 | region 1 \| `grep -c 'too_large'` | negative half, region 1 | **1** | **0** | 1 → 0 |
| P3 | region 2 \| `grep -c 'stillCurrent'` | non-vacuity companion, region 2 (also: abandoned-stage paragraph survived) | **1** | **1** | hold at 1 |
| P4 | region 2 \| `grep -c 'both reachable'` | negative half, region 2 | **1** | **0** | 1 → 0 |
| P5 | region 1 \| `grep -cF 'Guarding the emission' \|\| true` | **adjacent-text preservation, region 1** | **1** | **1** | hold at 1 |
| P6 | region 2 \| `grep -cF 'The number beside the reason' \|\| true` | **adjacent-text preservation, region 2** | **1** | **1** | hold at 1 |
| P7 | region 1 \| `grep -c 'structurally unreachable'` | positive half, region 1 | **0** | **1** | 0 → ≥1 |
| P8 | region 2 \| `grep -c 'structurally unreachable'` | positive half, region 2 | **0** | **1** | 0 → ≥1 |

Region 1 is `awk '/COUNTED AND LOGGED FROM WHAT WAS ADMITTED/,/const nextDepth = admitDerivedDepth/'`; region 2 is `awk '/DECIDED AT THE TOP, REPORTED AT THE BOTTOM/,/if \(!nextDepth.ok/'`. Both negated forms (`! … | grep -q`) exited **0** after the edit.

Six probes flipped or held in the direction the fix required; the two preservation counts read **1 in both columns**, which is the whole point of them — they pin sentences whose openings shared a line with the end of a deleted run, and neither region's non-vacuity companion sits between the edit and the survivor.

## The two rewritten passages, before and after

### Region 1 — before

```
    // sources that actually reached the recursion call site. RECOVERY IS NOT
    // ADMISSION: a map can recover sources that `admitDerived` refuses as
    // `empty` or `too_large` before they could recurse, and a stage that
    // admitted none of them declined nothing at any depth. Guarding the emission
    // on `parsed.recovered.length` claimed the bound had fired when it had not,
    // and put the recovered count beside a noun that meant recursions — two
    // inaccuracies sharing one condition, both closed here (07-REVIEW.md IN-01).
```

### Region 1 — after

```
    // sources that actually reached the recursion call site. RECOVERY IS NOT
    // ADMISSION: a map can recover sources that `admitDerived` refuses as
    // `empty` before they could recurse, and a stage that admitted none of them
    // declined nothing at any depth. The size refusal is NOT the other half of
    // that sentence and never was: it is structurally unreachable through the
    // ingest path, argued at the mixed-map case in `consumer.spec.ts`, so
    // `empty` carries this justification alone. Guarding the emission on
    // `parsed.recovered.length` claimed the bound had fired when it had not,
    // and put the recovered count beside a noun that meant recursions — two
    // inaccuracies sharing one condition, both closed here (07-REVIEW.md IN-01).
```

### Region 2 — before

```
    // fires on ADMISSION rather than on recovery. A map whose every
    // `sourcesContent` entry is the empty string — or whose every source is over
    // `DERIVED_SOURCE_MAX_BYTES`, both reachable from one hostile map — recovers
    // sources and admits none of them, attempts no recursion at any depth, and
    // therefore declines nothing. The number beside the reason is the ADMITTED
    // count and the noun beside it says so, which is the unit `telemetry.ts`
    // already states: one reconstruction stage that DECLINED TO RECURSE, and a
    // non-zero value always meaning at least one map-bearing artifact reached the
    // bound (07-REVIEW.md IN-01).
```

### Region 2 — after

```
    // fires on ADMISSION rather than on recovery. A map whose every
    // `sourcesContent` entry is the empty string recovers sources and admits
    // none of them, attempts no recursion at any depth, and therefore declines
    // nothing. An empty entry is the ONLY refusal a hostile map can mix in here.
    // The size refusal is structurally unreachable through the ingest path: the
    // whole document has already been refused above the same ceiling the
    // per-source gate applies, and a decoded entry is a byte-subset of the JSON
    // that carried it. That is argued at the mixed-map case in
    // `consumer.spec.ts`, and it is the statement these comments agree with.
    // The number beside the reason is the ADMITTED count and the noun beside it
    // says so, which is the unit `telemetry.ts` already states: one
    // reconstruction stage that DECLINED TO RECURSE, and a non-zero value
    // always meaning at least one map-bearing artifact reached the bound
    // (07-REVIEW.md IN-01).
```

**Both carried sentences are preserved verbatim as text, re-wrapped.** Word for word: *"Guarding the emission on \`parsed.recovered.length\` claimed the bound had fired when it had not, and put the recovered count beside a noun that meant recursions — two inaccuracies sharing one condition, both closed here (07-REVIEW.md IN-01)."* and *"The number beside the reason is the ADMITTED count and the noun beside it says so, which is the unit \`telemetry.ts\` already states: one reconstruction stage that DECLINED TO RECURSE, and a non-zero value always meaning at least one map-bearing artifact reached the bound (07-REVIEW.md IN-01)."* Line breaks moved in both — they had to, because the line each shared was itself rewritten — and not one word changed. Byte-identity was never the requirement and could not have been met.

## The unreachability chain, verified against the code rather than trusted

All four references check out, with **one path correction**:

| Claim | Stated in plan | Verified at | Content |
|---|---|---|---|
| sole production decode site passes `MAP_MAX_BYTES` | `consumer.ts:1124` | ✅ `consumer.ts:1124` | `const inline = decodeInlineMap(announcement.url, MAP_MAX_BYTES);` |
| whole-document byte refusal | `parse.ts:227` | ✅ `packages/engine/src/sourcemap/parse.ts:227` | `if (Buffer.byteLength(json, "utf8") > maxBytes) return refused("too_large");` |
| the two ceilings are the same constant | `derive.ts:142` | ✅ line 142, **but at `packages/backend/src/sourcemap/derive.ts`** — not `packages/engine/...` as the plan's `<read_first>` and prohibition prose say | `export const DERIVED_SOURCE_MAX_BYTES = MAP_MAX_BYTES;` |
| per-source refusal is strictly above | `derive.ts:233` | ✅ line 233, same corrected path | `if (source.byteLen > DERIVED_SOURCE_MAX_BYTES) return refused("too_large");` |

The **path drift is in the plan's prose only** — its task-2 `<verify>` pathspec already reads `packages/backend/src/sourcemap`, so the untouched-files gate covered the real file. No line number moved; the argument stands as written. `derive.ts:233` uses `>` and not `>=`, which the file's own comment explains — that direction only *widens* the admitted set, so it cannot make the refusal reachable.

**The argument, restated:** the decoded map document is at most `MAP_MAX_BYTES` bytes because `parse.ts:227` refused anything larger; `DERIVED_SOURCE_MAX_BYTES` *is* `MAP_MAX_BYTES`; and a decoded `sourcesContent` entry is a strict byte-subset of the JSON string that carried it, because JSON string encoding never shrinks a character below its UTF-8 width and every escape costs strictly more. So `source.byteLen > DERIVED_SOURCE_MAX_BYTES` cannot hold for anything that reached that gate through ingest.

## Cited-but-unedited files — provably untouched

`git diff --name-only HEAD~1 HEAD -- packages/backend/src/telemetry.ts packages/backend/src/sourcemap packages/engine/src/sourcemap` printed **nothing**, and `git status --short` is empty.

- **`packages/backend/src/ingest/consumer.spec.ts` — unmodified.** Its `WHY THE INADMISSIBLE HALF IS EMPTY AND NOT OVER-SIZE` comment at **2690–2695** is the specification these comments were aligned to, and it was read, not edited. The one failure mode this gap's scope fence names — editing the spec to meet the comments — did not occur.
- **`packages/backend/src/telemetry.ts` — unmodified, and deliberately so.** Its `derivedRejected` docblock was read in full (the `THE OTHER MEMBERS ARE STILL PER SOURCE` paragraph names `too_large` and `empty` as per-source counters, which is accurate for `admitDerived`'s vocabulary and is a different claim from "reachable through ingest"). The operator answered **IN-04** explicitly — no caveat wanted while `DERIVED_MAX_DEPTH` is 1 — so none was added. Recorded here so round 4 does not re-litigate a settled question.
- **`derive.ts` and `parse.ts` — unmodified.** Read as evidence, cited, never touched. `MAP_MAX_BYTES`, `DERIVED_SOURCE_MAX_BYTES`, `DERIVED_MAX_DEPTH` and `DERIVED_REJECT_REASONS` are all unchanged.

## Region scoping was load-bearing, and both survivors are intact

`too_large` still occurs twice in `consumer.ts`, exactly as the plan required:

- `consumer.ts:276` — prose in a docblock (`` `too_large` and `empty` are literal members of BOTH `MAP_PARSE_REASONS` and… ``).
- `consumer.ts:1005` — **live production code**: `if (reason === "too_large") counters.sourcemap.mapRefusedTooLarge++;`

A file-wide `! grep 'too_large'` gate would have been unsatisfiable without breaking a counter. The `awk` ranges are what make the gate both meaningful and achievable.

## The gate shape, written down for 07-24 and 07-25 to cite by name

**The region-scoped comment gate.** An `awk '/anchor-a/,/anchor-b/'` range over two unique literals bracketing the comment, piped to `grep`, with **three** parts, all mandatory:

1. **non-vacuity companion** — `grep -c` over a literal that MUST be present, printing a positive number. This proves the range resolved. Without it, an anchor that moved collapses the range to empty and `! … | grep -q` exits 0 against an empty stream — a gate that passes because it read nothing.
2. **negative half** — `! … | grep -q '<retired claim>'`.
3. **positive half** — `grep -c '<corrected claim>'`, non-zero. Deletion alone leaves an omission that reads as an oversight a later reader will helpfully restore; the positive half is what makes the omission a decision.

**The adjacent-text preservation gate.** A positive `grep -cF '<survivor>' || true` for every sentence whose opening shares a line with the end of a deleted run. Both of this plan's edit boundaries were MID-LINE (`consumer.ts:1269` and `:1449` at HEAD), and in each case the region's non-vacuity companion sat on the wrong side of the edit to notice the survivor being eaten — region 1's `RECOVERY IS NOT` is *above* the edit, region 2's `stillCurrent` is *below* it. `|| true` is deliberate and not defensive noise: `grep -c` **exits 1 on a zero count**, so without it the exit status inverts the verdict on exactly the failure the gate exists to catch. The observable is the printed number.

**The comment-stripping prefilter is INVERTED here, on purpose.** Round 2 established that a forbidden-**code**-construct grep must strip comments first (prose about the construct matched six times in `retention.ts`). In this plan the **comment is the subject**, so a stripping prefilter would delete the entire subject and leave a gate that can never fail. 07-24 and 07-25 should keep the inversion for their comment-subject gates and keep the stripping for any code-subject gate. Whichever way it points, the test is the same: *can this gate fail if the fix is not made?*

## Repository gate

| Gate | Command | Result |
|---|---|---|
| Owning spec | `pnpm vitest run packages/backend/src/ingest/consumer.spec.ts --reporter=dot` | **Test Files 1 passed (1) / Tests 80 passed (80)**, exit 0, 1.33s |
| Whole suite | `pnpm vitest run --reporter=dot` | **`Test Files  90 passed (90)` / `Tests  4321 passed (4321)`**, exit 0, 14.36s |
| typecheck | `pnpm typecheck` | exit 0 |
| lint | `pnpm lint` | exit 0 |
| knip | `pnpm knip` | exit 0 |
| build | `pnpm build` | exit 0 |
| scope | `git diff --name-only HEAD~1 HEAD` | exactly `packages/backend/src/ingest/consumer.ts` |
| diffstat | `git diff --stat HEAD~1 HEAD` | `1 file changed, 19 insertions(+), 11 deletions(-)` |

**07-24's floor is 90 files / 4321 tests, recorded not copied.** This plan adds **no test**, so the floor is the round-2 baseline **exactly** — 4321, not more. The vitest summary lines above are verbatim. 07-24 should retarget at *this recorded measurement*, and any count above 4321 in 07-24 must be attributed to cases 07-24 itself authorises.

## Decisions Made

- **Both the deletion and the positive statement, not just the deletion.** G-07-5's `truth:` is that the comments *say* the size refusal is unreachable. Removing the false half alone would have left the truth unsatisfied and the omission open to a helpful restoration. Recorded because the plan-checker adjudicated this explicitly and it is not over-delivery.
- **Region 2's phrasing needed its own gate.** The false claim reads `or whose every source is over … both reachable from one hostile map` — nothing like region 1's `\`empty\` or \`too_large\``. A find-and-replace tuned to region 1 would have reported success over an uncorrected second site. This is why the plan specified two negative halves with different literals.
- **The hard fence held: comment text only.** `admitDerivedDepth(input.depth + 1)`, `admittedForRecursion`, the loop's increment site and `sm.derivedRejected[nextDepth.reason]++` are byte-unchanged. Every `+`/`-` line in the diff begins `    // `, and the diff contains none of the four blocklisted identifiers and no brace. G-07-4, which round 2 closed, stays closed.

## Deviations from Plan

### 1. [Rule 3 — Blocking] Task 2's `git diff --name-only` evaluated against `HEAD~1..HEAD` instead of the working tree

- **Found during:** Task 2 (repository gate)
- **Issue:** The plan's task-2 verify runs `git diff --name-only` against the **working tree** and its `<fails_when>` treats empty output as a failure. GSD's atomic per-task commit contract requires task 1's edit to be committed before task 2 begins, so by the time task 2 runs the working tree is necessarily clean and that gate reads empty for a structurally correct reason. The two requirements are in direct tension.
- **Fix:** Ran the working-tree form *inside task 1, before the commit* — where it printed exactly `packages/backend/src/ingest/consumer.ts` and satisfied both the plan's task-1 `<verify>` and its `<acceptance_criteria>` — and then evaluated task 2's scope gates against `HEAD~1..HEAD`, which is the same assertion over the same change. Both forms of the untouched-files gate (working tree and commit range) were run and both printed nothing.
- **Files modified:** none (verification only).
- **Verification:** `git diff --name-only HEAD~1 HEAD` → exactly `packages/backend/src/ingest/consumer.ts`; `git status --short` → empty.
- **Committed in:** n/a — no source change. **Note for 07-24 and 07-25:** they inherit the same tension and should resolve it the same way, running any working-tree-scoped gate *before* the task commit that clears the tree.

### 2. [Rule 3 — Blocking] `derive.ts` path drift in the plan's prose

- **Found during:** Task 1 (`<read_first>`)
- **Issue:** The plan's `<read_first>` and its prohibition block both name `packages/engine/src/sourcemap/derive.ts`. That file does not exist; `derive.ts` lives at `packages/backend/src/sourcemap/derive.ts`. A literal read would have failed to establish the load-bearing fact of the whole unreachability argument.
- **Fix:** Located the real file, verified both cited line numbers are correct at the corrected path (`:142` and `:233`), and recorded the corrected path. The plan's own task-2 `<verify>` pathspec already reads `packages/backend/src/sourcemap`, so the untouched-files gate was unaffected and needed no adjustment.
- **Files modified:** none — `derive.ts` was read as evidence and is unmodified either way.
- **Verification:** `git diff --name-only HEAD~1 HEAD -- packages/backend/src/sourcemap packages/engine/src/sourcemap` → empty.
- **Committed in:** n/a.

---

**Total deviations:** 2 auto-fixed (2 blocking — 1 workflow-contract tension, 1 stale path reference in plan prose).
**Impact on plan:** None on scope or output. Neither deviation changed a byte of what shipped; both are recorded so 07-24 and 07-25 do not rediscover them. No scope creep — one file changed, comment text only.

## Issues Encountered

None. The RED baseline was recorded before any edit — deliberately, because `cp` is aliased to `cp -i` in this environment and silently no-ops an overwrite, so a "restore and re-observe" recovery is not available here. No restore was needed and `git stash` / `git clean` / blanket reset were not used.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **G-07-5 / WR-01 is CLOSED at `94b2e6a`.** Both production comments agree with `consumer.spec.ts:2690-2695`; the one-commit-range contradiction 07-19 shipped is resolved in favour of the traced statement.
- **Ready for 07-24.** The named gate shapes above — the region-scoped comment gate (with its deliberately inverted prefilter) and the adjacent-text preservation gate — are proven RED→GREEN and should be cited by name in 07-24's and 07-25's SUMMARYs.
- **Floor for 07-24: 90 files / 4321 tests**, a recorded measurement.
- **Still open and deliberately untouched:** W-4, W-6 (`MAP_MAX_BYTES` under-serves recovery ~2x, open by operator decision), UAT gap 3, SC5's FP corpora, MAP-01's external half, IN-04 (`telemetry.ts` docblock — answered "no note needed"), 07-22's accepted withholding text, and the retired `EXPORT_QUERY_REDACTION` marker sweep.
- **No blockers.** `SCHEMA_VERSION` is 9, no migration, no FK, no `ON DELETE CASCADE`, `RETENTION_SWEEP_MAX_PASSES` unchanged, `MAP_MAX_BYTES` unchanged, no outbound fetch, no filesystem access, `redactUrlForExport` / the export vocabulary / `observations.url` all unchanged.

## State handler results, recorded rather than assumed

| Handler | Result |
|---|---|
| `state.advance-plan` | **Double-advanced 22 → 23 → 24 because the executor invoked it TWICE.** Corrected by hand to `23 of 25 executed`. See below. |
| `state.update-progress` | `updated: false` — `progress percent withheld by buildStateFrontmatter — STATE.md left unchanged`. **Sixth consecutive run to withhold.** Known, not this phase's bug; the `Progress:` line still describes phase 01 and is deliberately untouched. |
| `state.record-metric` | `recorded: true` (07-23, 11 min, 2 tasks, 1 file) |
| `state.record-session` | `recorded: true` — `Last session`, `Stopped At` |
| `state.add-decision` ×2 | `added: true` ×2. **Note:** `--summary-file` REJECTS `$TMPDIR` paths (`Path escapes allowed directory`). Files must live inside the repo — used `.planning/.tmp-07-23/`, removed after. 07-24 and 07-25 should skip the `mktemp` round-trip. |
| `roadmap.update-plan-progress 07` | `updated: true`, `plan_count: 25`, `summary_count: 23`, `status: "In Progress"` |
| `requirements.ready-ids 07-23-PLAN.md MAP-06` | **`0/1 ready` — MAP-06 NOT marked complete, and that is correct.** Plan 07-25 also declares MAP-06 and has no SUMMARY yet, so the shared-ID gate (#2388) holds it. It will mark when 07-25 finishes. |

### The `advance-plan` double-advance, diagnosed

**This is NOT the 07-18 stale-prose-counter drift, and not a handler bug.** The executor piped the first `state.advance-plan` call through a `tail -5` that swallowed the JSON, then repeated the call to read it — and the handler advanced a second time. The second run returned `{"advanced": true, "previous_plan": 23, "current_plan": 24, "total_plans": 25}`, which is the fingerprint: `previous_plan: 23` proves a first advance had already landed.

`progress.completed_plans` moved only **94 → 95** (a single increment), so the frontmatter was right while the prose line was one ahead at `24 of 25`.

**Corrected by hand to `Plan: 23 of 25 executed — 07-24 next`**, independently confirmed by the file-counting `roadmap.update-plan-progress 07`, which reports `summary_count: 23` against `plan_count: 25`. Also hand-edited, as on 07-20 and 07-22 because no handler owns them: the `Phase:` line (`READY TO EXECUTE` → `EXECUTING`), the `Status:` line (round 3 `PLANNED` → `EXECUTING`, 07-23 done), the `Last activity:` line, and the frontmatter `status:` (`planned` → `executing`).

**Lesson for 07-24 and 07-25: call `state.advance-plan` exactly ONCE, and do not pipe it through a truncating `tail`/`head`. It is not idempotent on the prose counter.** This is recorded in STATE.md's annotation block too, so the next executor sees it without reading this SUMMARY.

## Self-Check

- `packages/backend/src/ingest/consumer.ts` — FOUND on disk, modified as claimed (19+/11-).
- Commit `94b2e6a` — FOUND in `git log --oneline --all`.
- All eight region probes re-run at HEAD and matching the "After" column above.
- `consumer.spec.ts` 80 tests re-run: pass. Whole suite re-run: 90 files / 4321 tests, exit 0.
- Plan-level `<verification>` block re-run in full; every item green.

## Self-Check: PASSED

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-03*
