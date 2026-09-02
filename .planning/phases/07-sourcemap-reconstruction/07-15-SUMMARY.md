---
phase: 07-sourcemap-reconstruction
plan: 15
subsystem: api
tags: [sourcemap, telemetry, sqlite, unicode, ingest, retention]

requires:
  - phase: 07-sourcemap-reconstruction
    provides: "07-12's migration v9 four-column sighting key, which is the whole basis for max-not-plus"
  - phase: 07-sourcemap-reconstruction
    provides: "07-14's row-unit settlement of SOURCE_ROWS_PER_MAP_MAX, which this plan's comparison is written in"
  - phase: 07-sourcemap-reconstruction
    provides: "07-16's rewrite of snapshotCounters in telemetry.ts, the file-ownership dependency this plan waited on"
provides:
  - "D-13's depth refusal counted and logged ONCE per reconstruction stage instead of once per recovered source (MD-03)"
  - "MAP-06's aggregate bound enforced by a production caller, in rows, on the projected post-write total (MD-04)"
  - "sources_verbatim truncated on a code-POINT boundary, so a stored label can never end in an unpaired surrogate (LO-03)"
  - "countSourcesForMap scoped by artifact, matching the v9 key"
affects: [phase-08, health-surface, source-browser, retention]

actuals:
  tokens: 84720
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "A bound is asked ONCE where the decision is made, and the callee keeps its gate as a backstop"
    - "An aggregate store bound is compared on the PROJECTED POST-WRITE total, never on existing + incoming, when the write is an upsert"
    - "A length cap on target-controlled text is enforced in code points by a bounded walk, never by spreading the input"

key-files:
  created: []
  modified:
    - packages/backend/src/ingest/consumer.ts
    - packages/backend/src/ingest/consumer.spec.ts
    - packages/backend/src/store/sources.ts
    - packages/backend/src/store/sources.spec.ts
    - packages/backend/src/telemetry.ts

key-decisions:
  - "MD-04 was WIRED rather than deleted: MAP-06 is a ticked requirement whose aggregate half was enforced nowhere, so deleting the function would leave the ledger row resting on a bound that does not exist"
  - "The aggregate comparison is max(existing, recovered), not existing + recovered, because the v9 four-column upsert writes zero rows on a repeat"
  - "The hoisted depth refusal is counted only when the stage has at least one recovered source, so the counter keeps describing the bound FIRING rather than the stage RUNNING"
  - "The code-point cut is a bounded WALK rather than the review's [...value].slice().join(), because the label is target-controlled and the spread allocates per code point of the whole input on the proxy thread"
  - "countSourcesForMap is scoped by artifact, not by map, because after v9 a sighting belongs to a bundle"
  - ".planning/REQUIREMENTS.md was NOT touched despite requirements.ready-ids reporting 2/2 ready"

patterns-established:
  - "Backstop-and-hot-path: hoist a bound to the call site for the ordinary path and KEEP it in the callee, saying in the comment which arm is which"
  - "Second-enforcement-point honesty: a defence-in-depth check says it is one rather than claiming to be the sole enforcer"
  - "Negative demonstration RUN, not described: the max-vs-plus guard was proven by flipping the operator and observing the case fail"

requirements-completed: [MAP-06, MAP-05]

coverage:
  - id: D1
    description: "D-13's depth refusal is counted and logged ONCE per reconstruction stage, not once per recovered source"
    requirement: "MAP-06"
    verification:
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#emits ONE depth refusal and ONE log line for a map carrying many sources"
        status: pass
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#fires ONCE PER STAGE, so the bound does not scale with what it bounds"
        status: pass
    human_judgment: false
  - id: D2
    description: "derivedRejected.depth_exceeded is no longer equal by construction to sourcesRecovered"
    requirement: "MAP-06"
    verification:
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#emits ONE depth refusal and ONE log line for a map carrying many sources"
        status: pass
    human_judgment: false
  - id: D3
    description: "telemetry.ts's derivedRejected docblock states the per-STAGE meaning, and no comment in the tree still describes the per-source meaning"
    verification:
      - kind: other
        ref: "grep -rn 'derivedRejected' packages --include=*.ts --include=*.vue | grep -v spec (5 lines, all accounted for)"
        status: pass
      - kind: other
        ref: "git diff -U0 packages/backend/src/telemetry.ts shows changed lines only inside a comment block"
        status: pass
    human_judgment: false
  - id: D4
    description: "MAP-06's aggregate bound is enforced by a production caller, in rows, with a NAMED refusal"
    requirement: "MAP-06"
    verification:
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#REFUSES past the bound with a NAMED reason, and the artifact finishes partial"
        status: pass
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#ACCEPTS at exactly the bound"
        status: pass
      - kind: other
        ref: "grep -rn 'countSourcesForMap' packages/backend/src --include=*.ts | grep -v spec (4 lines; 1 before)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Re-ingesting an artifact already fully recorded is ACCEPTED, never refused too_many_sources"
    requirement: "MAP-06"
    verification:
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#ACCEPTS a re-analysis of an unchanged artifact, because the upsert adds no rows"
        status: pass
    human_judgment: false
  - id: D6
    description: "Exactly one COUNT statement runs per map-bearing artifact, not one per source"
    verification:
      - kind: unit
        ref: "packages/backend/src/ingest/consumer.spec.ts#runs the count ONCE per map-bearing artifact, not once per source"
        status: pass
    human_judgment: false
  - id: D7
    description: "The count is bundle-scoped: the same map in a second artifact starts from zero"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#counts by BUNDLE: the same map in a second artifact starts from zero"
        status: pass
    human_judgment: false
  - id: D8
    description: "sources_verbatim is truncated on a code-POINT boundary, so a stored label can never end in an unpaired surrogate"
    requirement: "MAP-05"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#stores no unpaired surrogate when the 4,096th code unit is a high surrogate"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#stores a label of exactly the cap IN CODE POINTS whole"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sources.spec.ts#cuts an ASCII label longer than the cap at exactly the cap, unchanged from before"
        status: pass
    human_judgment: false
  - id: D9
    description: "No docblock in store/sources.ts describes a caller that does not exist, or claims to be the sole enforcer of a bound something else already holds"
    verification: []
    human_judgment: true
    rationale: "Prose accuracy against the shipped control flow. No test can assert that a paragraph is true; a reader has to read it beside the code it describes."

duration: 35 min
completed: 2026-09-02
status: complete
---

# Phase 07 Plan 15: Three Docblocks Made True Summary

**D-13's depth gate hoisted to the recursion call site (one refusal per stage, not per source), MAP-06's aggregate bound given a production caller comparing `2 * max(existing, recovered)` rows, and `sources_verbatim` cut on a code-point boundary.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-09-02T13:00:21Z
- **Completed:** 2026-09-02T13:35:45Z
- **Tasks:** 3 (all TDD: RED then GREEN, 6 commits)
- **Files modified:** 5 — exactly the five in `files_modified`, no more

## Accomplishments

- **MD-03 closed.** `admitDerivedDepth` is evaluated once above the per-source loop on `input.depth + 1`. One artifact carrying monaco's 781-source map now emits ONE `sdk.console.log` line, not 781, and `derivedRejected.depth_exceeded` stops being equal by construction to `sourcesRecovered`.
- **MD-04 closed.** `countSourcesForMap` gained a production caller and an artifact-scoped signature. The refusal is the shipped `too_many_sources` reason through the `map:`-namespaced path, so the artifact records `partial` with a reason an operator can read.
- **LO-03 closed.** `truncateToCodePoints` replaces the code-unit `slice`. The cap keeps its value of 4,096; its justification now names the unit and the at-rest byte range that unit implies.
- **The `max`-not-`+` arithmetic is pinned by a committed case** that fails loudly under the additive form — proven by running the flip, not by describing it.

## Task Commits

1. **Task 1 (tracer): MD-03, one map-bearing artifact, one depth refusal**
   - `e674a55` (test) — failing cases: one increment, one log line, and the inequality
   - `01a3f30` (fix) — the hoist, the backstop comment, and the `telemetry.ts` docblock
2. **Task 2: MD-04, MAP-06's aggregate bound gets its caller**
   - `2815745` (test) — over-bound, at-bound, re-analysis, and one-count-per-artifact
   - `ad2c08b` (feat) — the widened count, the wired refusal, the rewritten docblock
3. **Task 3: LO-03, cut the stored label on a code-point boundary**
   - `c404f24` (test) — the surrogate-boundary case and both boundary cases
   - `6b3a3bf` (fix) — `truncateToCodePoints`, the constant's unit, the write-path comment

## Files Created/Modified

- `packages/backend/src/ingest/consumer.ts` — the hoisted depth gate; the aggregate count, its epoch re-check and its named refusal
- `packages/backend/src/ingest/consumer.spec.ts` — 5 new cases; 3 pre-existing D-13 cases re-argued
- `packages/backend/src/store/sources.ts` — `countSourcesForMap` widened and its docblock rewritten; `truncateToCodePoints`; `SOURCES_LABEL_MAX`'s unit and byte range
- `packages/backend/src/store/sources.spec.ts` — 4 new cases; 5 pre-existing `countSourcesForMap` call sites widened
- `packages/backend/src/telemetry.ts` — the `derivedRejected` docblock only, comment-only diff

## Decisions Made

### 1. MD-04 was WIRED, not deleted — and the alternative is in the review file

MD-04 offers two exits: wire `countSourcesForMap`, or delete it and rewrite the paragraph to say where the bound actually lives. **Wired.** MAP-06 is a TICKED requirement whose aggregate half was enforced nowhere, so deleting the function would have left the ledger row resting on a bound that does not exist — the same defect one layer down, and precisely the thing MD-04's closing sentence calls "worse than no docblock, because it is the thing a verifier will cite."

The cost is one bounded, indexed `COUNT(*)` per map-bearing artifact. `WHERE project_id = ? AND artifact_sha256 = ? AND map_sha256 = ?` is a three-column prefix of `idx_source_sightings_artifact`'s leading columns, so it is an index probe rather than a scan — the same order as the no-op retention sweep 07-13's A8 measurement put at roughly 0.28 ms per artifact. This is recorded because a later reader will find the alternative in `07-REVIEW.md` and should not have to guess which way it went.

### 2. The comparison is `max(existing, recovered)`, and the additive form is a real availability bug

`SOURCE_ROWS_PER_MAP_MAX` is 2,048 rows. Under `existing + recovered` any `(artifact, map)` already holding more than 1,024 sightings — well inside what the parse gate admits — computes over 2,048 on its next pass and is refused `too_many_sources`, writing `scan_state = 'partial'` on an artifact that was previously accepted whole and that adds not one row. Re-analysis is reachable at every `detectorSetHash` change (`isAnalysed`'s short-circuit is keyed on it), which Phase 3 landing is, so that is the ordinary path rather than a corner.

**Negative demonstration RUN, not described.** Flipping `Math.max(existing, recovered)` to `existing + recovered` fails two committed cases:

```
Inner error message: expected 'partial' to be 'done'
Inner error message: the re-analysis finished `partial`. The aggregate comparison is
still ADDITIVE ... expected 'partial' to be 'done'
```

The operator was restored to `max` immediately and `grep -c 'Math.max('` re-measured at 2.

### 3. The hoisted refusal is counted only when there is something to recurse over

The plan says to increment and log "ONCE, there", above the loop. Taken literally that would also fire for a map that parsed and recovered nothing — a stage that declined nothing. The existing D-13 case's own comment states the rule this would break ("the counter must describe the bound firing, not the stage running"), so the emission is guarded on `parsed.recovered.length > 0`.

**The honest edge, stated rather than left to be discovered:** the count in the message is `parsed.recovered.length` — sources that reach the loop — which OVER-STATES by the sources `admitDerived` refuses before they could recurse. In the corner where every recovered source is refused by `admitDerived`, this increments 1 where the old per-source code incremented 0. No test pinned that, the refusal is one per stage either way, and the comment in `consumer.ts` says so in those words.

### 4. The code-point cut is a bounded walk, not the review's spread

LO-03's fix sketch is `[...sourcesVerbatim].slice(0, SOURCES_LABEL_MAX).join("")`. That allocates one array entry per code point of the WHOLE label before discarding all but the first few thousand — and the label is target-controlled, bounded only by `MAP_MAX_BYTES`, on the proxy thread. `truncateToCodePoints` walks code units advancing by 1 or 2 and stops after at most `maxCodePoints`, so the work is bounded by the CAP rather than by the input and it allocates nothing but the result. Same semantics, same prefix, no per-input allocation.

**A lone surrogate ALREADY in the input is preserved, not repaired.** LO-03 is about the cut CREATING an unpaired surrogate out of a valid pair. A map that declared a broken label declared a broken label, and rewriting it here would be exactly the write-time sanitisation D-06 refuses.

### 5. `.planning/REQUIREMENTS.md` was NOT touched, and this time the gate and the prohibition DISAGREE

`requirements.ready-ids` reports **2/2 ready** — `{"ready":["MAP-06","MAP-05"],"blocked":[],"total":2}`. 07-13 recorded MAP-06 as blocked specifically by this plan, and this plan is the last declaring one, so the shared-ID gate now clears. `requirements.mark-complete` was **not** run anyway, and the call is made explicitly rather than skipped quietly:

1. **This plan's own prohibitions say "No change to `.planning/REQUIREMENTS.md`."** That is a hard constraint from the plan, not an inference from a sibling's behaviour.
2. **Both IDs are already `[x]` on disk.** MAP-05 was ticked at UAT on 2026-09-02 with a long justification; MAP-06 was already ticked. The mutation's target state IS the state on disk, so it can only be a no-op or damage.
3. **`outbound-prohibition.spec.ts` byte-compares this file.** It pins the CORE-11 row's box as the literal `- [ ] **CORE-11**` and byte-compares a machine-generated residual span between two sentinel lines in the same file, regenerated from `deriveResidual(RESOLVER_REGISTRY, BYTE_COMPARED_SURFACES)`. A generic checkbox/traceability rewriter that reflowed either would turn a green gate red for a change that changes nothing.

sha256 of `.planning/REQUIREMENTS.md` is unchanged at `c09e8dfc64d1cc3b242c274e854a9ec1744e96f2e3289cd3c6e4b8a24672467d`, the same value 07-13 recorded. `requirements-completed: [MAP-06, MAP-05]` in this SUMMARY's frontmatter is the record that the work discharging them landed; the checkbox was already in that state.

## Measurements Taken, Recorded Because The Criteria Are Deltas

| Measurement | Before | After |
|---|---|---|
| `grep -rn 'countSourcesForMap' packages/backend/src --include=*.ts \| grep -v spec` | 1 line (the declaration) | 4 lines (declaration, import, call, one comment reference) |
| `grep -v -E '^\s*(//\|\*\|/\*)' consumer.ts \| grep -c 'Math.max('` | 1 | 2 |
| `SOURCES_LABEL_MAX = 4096` (non-comment) | 1 | 1 |
| whole suite | 4,293 passing / 90 files | 4,302 passing / 90 files |
| `vue-tsc` (W-4 baseline) | 6 errors (4 `SettingsPanel.vue`, 2 `SourceBrowser.spec.ts`) | 6 errors, identical |

### The two `derivedRejected` scope greps, run before editing

`grep -rn 'derivedRejected' packages --include=*.ts --include=*.vue | grep -v spec` returns **exactly the five lines the plan enumerates** (the plan's prose says "four lines" while enumerating five items; the enumerated set matched exactly, so nothing was out of scope):

```
packages/backend/src/sourcemap/derive.ts:71    (separate-presentation-maps clause)
packages/backend/src/telemetry.ts:317          (the declaration)
packages/backend/src/telemetry.ts:459          (the initialiser)
packages/backend/src/ingest/consumer.ts:1073   (the depth increment)
packages/backend/src/ingest/consumer.ts:1172   (the admitDerived increment)
```

`grep -rn 'derivedRejected\|depth_exceeded' packages/frontend/src` returns **NOTHING** (exit 1). **There is no health-surface copy to rewrite**, and no `.vue` file was opened for that clause. `git diff --name-only -- packages/frontend` prints nothing across the whole plan.

**`derive.ts`'s clause was READ and CONFIRMED to need no edit.** Line 71 sits inside the four-mechanisms argument for keeping two vocabularies apart and says `counters.sourcemap.derivedRejected` "is its own sub-map, not a widening of `counters.rejected`". That is a claim about which SUB-MAP the reasons live in, not about what `depth_exceeded` counts. It is unaffected by the unit change and is byte-unchanged.

**`schema.spec.ts`'s `sources_verbatim` allowlist justification was READ and CONFIRMED to need no edit.** It says the column is bounded "by `SOURCES_LABEL_MAX` in `store/sources.ts`, which truncates at write exactly as `URL_MAX` does" and names no unit, so it stays true. `git diff --stat packages/backend/src/store/schema.spec.ts` prints nothing.

## The Three RED Observations

**Task 1 — MD-03.** Against the shipped gate, the many-source case reported the source count where one stage was expected:

```
the depth gate is still being re-taken per recovered source: this reports the
source count where one reconstruction stage was expected.: expected 12 to be 1
```

and the two-source case: `expected 2 to be 1`.

**Task 2 — MD-04.** Two distinct signals, and the second is MD-04 stated as a number:

```
the artifact finished `done`. A map whose projected post-write row cost exceeds
SOURCE_ROWS_PER_MAP_MAX must be refused BEFORE the per-source loop ...
: expected 'done' to be 'partial'

the aggregate count was prepared 0 times for one map-bearing artifact carrying
four sources.: expected +0 to be 1
```

**Task 3 — LO-03, and the observed shape is stronger than the review's.** The review says the unpaired surrogate "round-trips through the driver and the RPC boundary unpredictably". Measured against `node:sqlite`, it does not round-trip at all — it is silently rewritten:

```
bound last code unit: U+D83D  len 4096
stored len 4096  last code unit: U+FFFD
identical to what was bound: false
is prefix of the declared label: false
```

So `hasUnpairedSurrogate` came back FALSE on the broken value and the damage surfaced as the two assertions beside it: `expected 65533 not to be 65533` and a failing `label.startsWith(stored)`. **The defect is therefore not only an invalid byte sequence at rest — it is a silent TRANSFORMATION of evidence, which contradicts the write path's one rule.** The second case reported `expected [...] to have a length of 4096 but got 2048`: an all-astral label at the cap was cut in half by the code-unit reading.

## The Three Edited D-13 Cases

All three now carry an assertion message naming their old expected value and the reason. Only one of the three changed value, and saying which is the point:

| Case | Old | New | Why |
|---|---|---|---|
| "recovers the outer sources, refuses the inner announcement, and is SEEN doing it" | 1 | **1** | Unchanged NUMBER, changed MEANING. It was 1 because there was one recovered source; it is 1 because there is one stage. The two readings agree only at N=1. |
| "does not fire depth_exceeded when nothing was recovered" | 0 | **0** | Unchanged. It was 0 because no recursion was attempted; it is 0 because the hoisted gate is counted only when the loop has something to recurse over. |
| "fires ONCE PER RECOVERED SOURCE…" → "fires ONCE PER STAGE…" | 2 | **1** | The only real change, and the title changed with it. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The over-bound and at-bound cases are unreachable from a single parse, so they seed divergence instead**

- **Found during:** Task 2
- **Issue:** The plan asks for "the over-bound refusal reaching `partial` with the named reason" from an ingest. It cannot be reached that way. `parseSourceMap` already refuses `declared * 2 > 2048`, so no map that reaches the consumer can exceed the bound on its own recovered count — the aggregate check is unreachable unless rows already on disk exceed it.
- **Fix:** The cases ingest normally, then seed extra sightings for that `(artifact, map)` at indices no map declares — which is exactly the divergence the rewritten docblock names ("rows written by an earlier build under a different gate"). The boundary pair is 1,024 sightings (2,048 rows, accepted) and 1,025 (2,050 rows, refused).
- **Files modified:** `packages/backend/src/ingest/consumer.spec.ts`
- **Verification:** both cases green; the refusal case asserts `partial`, `map:too_many_sources`, and that no new row was written
- **Committed in:** `2815745` / `ad2c08b`

**2. [Rule 3 - Blocking] "well over 1,024 recovered sources" is not constructible; the re-analysis case uses exactly 1,024**

- **Found during:** Task 2
- **Issue:** The plan's re-analysis case says to ingest "a map with well over 1,024 recovered sources". `parseSourceMap`'s row gate caps declared sources at 1,024 (2,048 rows), so such a map is refused before this code runs.
- **Fix:** The case uses exactly `SOURCE_ROWS_PER_MAP_MAX / 2` = 1,024 sources — the parse gate's own ceiling and the strongest constructible fixture. It is more than sufficient: `+` needs only `existing + recovered > 1,024` to refuse, and at 1,024 it computes 4,096 rows against a 2,048 bound.
- **Files modified:** `packages/backend/src/ingest/consumer.spec.ts`
- **Verification:** the negative demonstration in Decision 2 above
- **Committed in:** `2815745`

**3. [Rule 1 - Bug] Seeded sightings stamped at a low sentinel were swept mid-case by 07-13's retention age bound**

- **Found during:** Task 2
- **Issue:** The seed helper first wrote `recovered_at = 1`. 07-13 gave `source_sightings` BOTH ordinary retention bounds, so `SIGHTINGS_OVER_AGE_SQL` deleted the entire seed on the next sweep. The case failed at its final row-count assertion (`expected 4 to be 1025`) — for retention's reasons rather than this case's.
- **Fix:** the seed stamps `Date.now()`, with a comment naming 07-13's bound as the reason so the next author does not "tidy" it back to a sentinel.
- **Files modified:** `packages/backend/src/ingest/consumer.spec.ts`
- **Verification:** case green; the assertion now measures what it names
- **Committed in:** `2815745`

**4. [Rule 3 - Blocking] The one-count-per-artifact filter had to exclude retention's project-wide count**

- **Found during:** Task 2
- **Issue:** The instrumented filter `COUNT(*) ... FROM source_sightings` matched TWO statements — the new aggregate count and `retention.ts`'s `COUNT_SIGHTINGS_SQL`. The case would have passed or failed for the retention cadence's reasons.
- **Fix:** the filter additionally requires `map_sha256` in the predicate, with a comment naming the statement it excludes and why.
- **Files modified:** `packages/backend/src/ingest/consumer.spec.ts`
- **Verification:** RED then read `prepared 0 times`, which is MD-04 exactly
- **Committed in:** `2815745`

**5. [Rule 3 - Blocking] Three further `countSourcesForMap` call sites in `sources.spec.ts` needed widening**

- **Found during:** Task 2
- **Issue:** The plan named the one case at `sources.spec.ts:196`. Five call sites exist; the other four are in the nullability and bound-boundary describes and failed with "Provided value cannot be bound to SQLite parameter 3".
- **Fix:** all widened to pass `ARTIFACT_A`, which is the artifact every one of them already wrote under.
- **Files modified:** `packages/backend/src/store/sources.spec.ts`
- **Verification:** `pnpm vitest run packages/backend/src/store/sources.spec.ts` green
- **Committed in:** `2815745` / `ad2c08b`

---

**Total deviations:** 5 auto-fixed (1 bug, 4 blocking). **Impact on plan:** all five are the plan's test sketches meeting facts the planner did not have — the parse gate's ceiling, 07-13's retention bound, and the real call-site count. No scope creep: every change is inside the five declared files, the aggregate arithmetic and the refusal reason are exactly as specified, and no vocabulary member, threshold, migration or frontend file was touched.

## What Does NOT Change, Recorded So It Is Not Misattributed

- **A legacy database holding a map recorded under the pre-07-14 source-unit gate is refused at `parseSourceMap`, by plan 07-14's decision, before this check ever runs.** This plan adds no refusal 07-14 did not already make.
- **Rows already stored under the code-unit cut are NOT rewritten.** And per the measurement above they do not contain a lone surrogate — they contain **U+FFFD** where the cut fell, because the driver replaced it at write time. Rewriting them is not proposed and would be the wrong move: `sources_verbatim` is evidence under D-06, and a migration that edited stored evidence to look like what a later build would have written is the write-time transformation the column exists to refuse. No `WINDOWS.md` entry was opened for this: it is an accepted property of pre-fix rows, not an open defect in the shipped code.
- **`derivedRejected`'s other members are still PER SOURCE.** `too_large` and `empty` come from `admitDerived` inside the loop and count individual recovered sources, which is the right unit for them. Two units in one map, named in the docblock because that is the only place either is written down.

## The W-2 Byte Hazard: SCANNED, AND CLEAN THIS TIME

The prior-wave context flagged this class as recurred four times and expected rather than unlikely. A scanner (`bytescan.py`) was run over every touched file before every commit, checking for NUL, U+2028, U+2029, lone CR and any C0 byte other than tab and newline. **All five files were clean at every commit.** Every surrogate in the LO-03 fixture is written as an escape sequence (`"\ud83d"`, `"\ude00"`) and never as a literal, in `map-fixture.ts`'s discipline — and `grep -c "LO-03" sources.spec.ts` returns 6, so grep still reads the file as text rather than binary.

## Verification

| Check | Result |
|---|---|
| `pnpm vitest run` | **4,302 passed / 90 files**, 0 failed |
| `pnpm typecheck && pnpm lint && pnpm knip` | exit 0 |
| `pnpm build` | exit 0 |
| `git diff --stat knip.json migrations.ts schema.spec.ts REQUIREMENTS.md packages/frontend` | prints nothing |
| `grep -rn 'countSourcesForMap' packages/backend/src --include=*.ts \| grep -v spec` | 4 lines (was 1) |
| `git diff -U0 packages/backend/src/telemetry.ts` | every changed line inside a comment block; `Counters` shape byte-unchanged |
| `pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts` | 465 passed |
| `vue-tsc` | 6 errors, the W-4 baseline exactly, not grown |

## Issues Encountered

**Vitest prints `Failed to fully serialize error: Invalid character` above every failing assertion in this repo's backend specs.** It is a reporter-side serialisation artifact, not a defect in the assertion: the inner message and the diff both print immediately below it, so every RED observation above was fully readable. It appeared on assertions whose messages were pure ASCII as well as on ones containing em dashes, so it is not caused by anything this plan wrote. Recorded rather than fixed — it is out of this plan's scope and affects no result.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **MD-03, MD-04 and LO-03 are closed.** MAP-06's aggregate half is enforced by executable code for the first time, in the unit 07-14 settled, on the total the v9 upsert actually produces.
- **This is the last plan of the phase's gap-closure round.** 17 plans, 17 summaries.
- **Open for the operator, not for this plan:** 07-13's index on `source_sightings (project_id, source_sha256)` remains an open item — it is a migration, and exactly one schema change (07-12's key widening) was approved this round. The aggregate count added here does NOT need it: it leads on `(project_id, artifact_sha256, map_sha256)`, which is a prefix of `idx_source_sightings_artifact`.
- **Still open and untouched by design:** W-4 (the 6 `vue-tsc` errors), W-6, and UAT gap 3.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-02*
