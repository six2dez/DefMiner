---
phase: 07-sourcemap-reconstruction
plan: 20
subsystem: database
tags: [retention, sqlite, cascade, source-sightings, sourcemap, vitest]

requires:
  - phase: 07-sourcemap-reconstruction
    provides: "07-13's `source_sightings` and `sources` sweep — the third child table this plan finally routes through `deleteDigest`"
  - phase: 07-sourcemap-reconstruction
    provides: "07-18's constants documentation, whose values this plan must not move; `RETENTION_SWEEP_MAX_ROWS` is imported and derived from rather than written out"
  - phase: 07-sourcemap-reconstruction
    provides: "07-19's committed test-count floor of 4307, which is this plan's live floor rather than the verifier's 4302"
provides:
  - "`deleteDigest` cascades THREE children — `observations`, `analyses` and `source_sightings` — so an evicted map-bearing bundle leaves no sighting naming it after ONE pass"
  - "`SIGHTING_KEYS_FOR_DIGEST_SQL`: the cascade's enumeration in `OBSERVATION_KEYS_FOR_DIGEST_SQL`'s shape, two columns bound and two selected, with an explicit tie-break and a `LIMIT ?`"
  - "the completeness check's sightings arm, so a capped sightings enumeration leaves the artifact standing exactly as a capped observations enumeration does"
  - "three single-pass spec cases driving `sweepRetention` directly, two of them RED against the pre-repair tree"
  - "the boundary stated as well as the claim: `source_sightings` is a child of `artifacts`, `sources` is not and dies with its LAST sighting by anti-join across passes"
affects: [07-21, 07-22, retention, sourcemap, storage]

actuals:
  tokens: 4769
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "single-pass pinning: a property a convergence loop cannot observe is asserted by calling `sweepRetention` exactly ONCE, with the reason written in the case so the next author does not reach for the convergence helper again"
    - "non-vacuity on every budget-exhaustion case: the case asserts the pass spent its whole budget AND that the parent was really evicted, so a fixture that quietly stopped exhausting the budget fails loudly instead of passing for the wrong reason"
    - "derive the fixture from the shipped constant: the backlog is `RETENTION_SWEEP_MAX_ROWS + 8`, not a hand-written 520, so it keeps exhausting the budget if the constant moves"

key-files:
  created: []
  modified:
    - packages/backend/src/store/retention.ts
    - packages/backend/src/store/retention.spec.ts

key-decisions:
  - "Option A, chosen by the operator on 2026-09-02: put `source_sightings` into `deleteDigest`'s cascade rather than shrink the module header's claim. Recorded in this file before any edit to `retention.ts`."
  - "`SIGHTING_KEYS_FOR_DIGEST_SQL` orders by `map_sha256 ASC, source_index ASC` — the key's own tail, which is unique inside the bound `(project_id, artifact_sha256)` scope, so the ordering is total and a capped enumeration resumes deterministically without a synthetic tie-break column."
  - "The statement is declared beside the other `source_sightings` statements rather than beside `OBSERVATION_KEYS_FOR_DIGEST_SQL`, so a reader auditing the four-column key finds every statement that touches it in one place."
  - "The sightings block is written INLINE in `deleteDigest` and not through `trimChildTable`. That helper's recorded decision not to generalise stands: widening it to a variadic four-column key for one more caller would be paid for by two tables that asked for nothing."
  - "The RED was observed by writing the cases against the unmodified `retention.ts` and running them BEFORE task 2's edit — no file was restored, checked out or stashed, so the `cp -i` hazard recorded in the round context was never reached."

patterns-established:
  - "Pattern: state the boundary of a claim in the same block as the claim. The `sources` case is green in both directions by design; without it the single-pass case reads as a promise about `sources` that no repair makes, and the 'fix' a reader would reach for is the exact failure the anti-join exists to prevent."
  - "Pattern: a comment must never state an invariant the code does not enforce. When they disagree, the acceptance test is that they agree afterwards — not which of the two moved."

requirements-completed: [MAP-06]

coverage:
  - id: D1
    description: "A single `sweepRetention` pass whose budget is consumed by a childless-artifact backlog leaves NO `source_sightings` row naming the evicted map-bearing bundle."
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#ONE PASS, not a convergence loop: a budget-exhausting backlog leaves NO sighting naming a deleted artifact"
        status: pass
      - kind: other
        ref: "RED reproduction: same case run against the unmodified retention.ts (d3caf4d^) — 'expected 1 to be +0 // Object.is equality'"
        status: pass
    human_judgment: false
  - id: D2
    description: "The evicted bundle's sole `sources` row SURVIVES that same single pass, because `sources` is not a child of `artifacts` and step 3d's anti-join did not run; a following `sweepToConvergence` then drains to zero orphan sightings and zero unsighted sources."
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#`sources` is NOT a child of `artifacts` — the single-pass claim stops at the sighting"
        status: pass
    human_judgment: false
  - id: D3
    description: "`SIGHTING_KEYS_FOR_DIGEST_SQL` binds `project_id` and `artifact_sha256`, selects exactly `map_sha256` and `source_index`, carries an explicit two-column ascending `ORDER BY` and a `LIMIT ?`; and exactly one sighting-delete statement exists in the file."
    requirement: MAP-06
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retention.spec.ts#`SIGHTING_KEYS_FOR_DIGEST_SQL` is scoped, ordered and LIMITed like every other candidate statement"
        status: pass
      - kind: other
        ref: "RED reproduction: same case run against the unmodified retention.ts (d3caf4d^) — 'SIGHTING_KEYS_FOR_DIGEST_SQL is not declared in retention.ts: expected null not to be null'"
        status: pass
    human_judgment: false
  - id: D4
    description: "The new statement complies with the shipped SQL discipline — `project_id`-scoped, single-statement, fully bound, no interpolation and no array bind."
    verification:
      - kind: unit
        ref: "pnpm vitest run packages/backend/src/store/sql-discipline.spec.ts — 2 files / 102 tests passed, retention.ts is in the audited-file list"
        status: pass
    human_judgment: false
  - id: D5
    description: "T-07-86 discharged: no CODE line of retention.ts contains `FOREIGN KEY`, `ON DELETE CASCADE` or `PRAGMA foreign_keys`, and the schema ladder and table inventory are untouched."
    verification:
      - kind: other
        ref: "! grep -vE '^[[:space:]]*(//|\\*|/\\*)' packages/backend/src/store/retention.ts | grep -nE 'FOREIGN KEY|ON DELETE CASCADE|PRAGMA foreign_keys' — exit 0, no output"
        status: pass
      - kind: other
        ref: "non-vacuity companion: grep -vE '^[[:space:]]*(//|\\*|/\\*)' … | grep -c 'DELETE_SIGHTING_SQL' — printed 4 (3 before, 4 under A, exactly as predicted)"
        status: pass
      - kind: other
        ref: "git diff --name-only -- packages/backend/src/store/migrations.ts packages/backend/src/store/schema.spec.ts — empty"
        status: pass
    human_judgment: false
  - id: D6
    description: "T-07-89 discharged: retention.ts still has ZERO `.exec(` call sites on any code line."
    verification:
      - kind: other
        ref: "! grep -vE '^[[:space:]]*(//|\\*|/\\*)' packages/backend/src/store/retention.ts | grep -nE '\\.exec\\(' — exit 0, no output"
        status: pass
    human_judgment: false
  - id: D7
    description: "The module header at `:41-60`, the orphan paragraph and `deleteDigest`'s DEPENDENCY ORDER docblock all now say THREE children, and the code does that thing."
    verification:
      - kind: other
        ref: "the three passages quoted before and after in this SUMMARY's '## The three header passages' section, read against the cascade in deleteDigest"
        status: pass
    human_judgment: true
    rationale: "Prose-and-code agreement is the acceptance test this plan set for itself, and no automated check asserts that a paragraph MEANS what the code does — only that both exist. A reader must confirm the paragraphs and the cascade say the same thing."
  - id: D8
    description: "IN-03 closed: `ORPHAN_SIGHTINGS_SQL`'s comment states three selected columns and one bound scope, where it previously said 'the four key columns are selected'."
    verification:
      - kind: other
        ref: "the sentence quoted before and after in this SUMMARY's '## IN-03' section"
        status: pass
    human_judgment: false
  - id: D9
    description: "The round baseline holds and rose by exactly the three new cases: 90 test files / 4310 tests, exit 0, against 07-19's committed floor of 4307."
    verification:
      - kind: other
        ref: "pnpm vitest run --reporter=dot — Test Files 90 passed (90), Tests 4310 passed (4310)"
        status: pass
      - kind: other
        ref: "pnpm typecheck && pnpm lint && pnpm knip && pnpm build — all exit 0"
        status: pass
    human_judgment: false

duration: 6 min
completed: 2026-09-02
status: complete
---

# Phase 07 Plan 20: The Sightings Cascade Summary

**`deleteDigest` now cascades three children instead of two — a new `SIGHTING_KEYS_FOR_DIGEST_SQL` enumeration and a third loop reusing the shipped `DELETE_SIGHTING_SQL`, with the completeness check extended to match — so the module header's thrice-stated "the cascade cannot create an orphan" is true on the ordinary path rather than only after convergence, pinned by a case that calls `sweepRetention` exactly once and was RED with `expected 1 to be +0`.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-02T20:07:01Z
- **Completed:** 2026-09-02T20:13:12Z
- **Tasks:** 3 (1 checkpoint, 2 auto)
- **Files modified:** 2

## Task 1 — the operator's decision

**Option letter: A**
**Date: 2026-09-02**
**Recorded before any edit to `packages/backend/src/store/retention.ts`** — `git diff --name-only -- packages/backend/src/store` printed nothing at the moment this record was written, which is the acceptance criterion's observable.

**A — Put `source_sightings` into `deleteDigest`'s cascade.**

### The operator's foreign-key confirmation, verbatim

> no foreign key, no `ON DELETE CASCADE`, no new migration, no new index, and
> `SCHEMA_VERSION` stays 9

The operator was shown that constraint as part of the question and selected A under it.

**What the letter bound.** Task 2 wrote `SIGHTING_KEYS_FOR_DIGEST_SQL` and the third enumeration block; task 3's single-pass case kept its stated polarity rather than B's inverted one. The B and C branches of task 2's `<action>` were not executed. `grep -c 'SIGHTING_KEYS_FOR_DIGEST_SQL'` prints 2 (the declaration and the `db.prepare` call site) — the B criterion requiring 0 does not apply.

## Accomplishments

- **G-07-2 / WR-02 closed by repair, not by rewording.** `deleteDigest` walks `observations`, `analyses` and now `source_sightings` before `DELETE_ARTIFACT_SQL`. The orphaned-sighting state that was the ORDINARY outcome of evicting a map-bearing bundle on a budget-exhausted pass is now unreachable through the cascade, and step 3d's orphan collection is the crash-recovery path its own paragraph says it is.
- **The completeness check gained its sightings arm** — the half the plan named as most likely to be forgotten. Reaching the sightings `LIMIT` now leaves the artifact standing exactly as reaching the observations `LIMIT` does.
- **The boundary is written down in three places.** `deleteDigest`'s docblock, the module header and a spec case all say that `source_sightings` is a child of `artifacts` and `sources` is not. `deleteDigest` does not delete from `sources` and the docblock says why.
- **The single-pass property is pinned by a single-pass test.** `retention.spec.ts:1337` drives `sweepToConvergence`, which is structurally unable to observe this property; the new cases call `sweepRetention` directly and exactly once, with a comment naming `:1337` so the next author does not reach for the convergence helper again.
- **IN-03 corrected** in the same file, one sentence, no separate work item.

## Task Commits

1. **Task 1: CHECKPOINT — same statement sequence, or same pass?** — no commit (checkpoint task; the answer is recorded above and was on disk before task 2's first edit)
2. **Task 2: Apply the chosen repair, and correct the column-arity sentence** — `d3caf4d` (fix)
3. **Task 3: The SINGLE-PASS case, RED first, plus the boundary the claim stops at** — `ac2a193` (test)

**Plan metadata:** see the final `docs(07-20)` commit.

## Files Created/Modified

- `packages/backend/src/store/retention.ts` — `SIGHTING_KEYS_FOR_DIGEST_SQL`, the third enumeration block in `deleteDigest`, the completeness check's sightings arm, the three rewritten prose passages, and the IN-03 sentence. +139 / -10.
- `packages/backend/src/store/retention.spec.ts` — a new `describe` block with three cases, plus the `RETENTION_SWEEP_MAX_ROWS` import. **+162 / -0 — a pure insertion**, so the three cascade cases and the budget-exhaustion case are byte-unchanged.

## The new statement

```sql
const SIGHTING_KEYS_FOR_DIGEST_SQL = `
SELECT map_sha256, source_index FROM source_sightings
WHERE project_id = ? AND artifact_sha256 = ?
ORDER BY map_sha256 ASC, source_index ASC
LIMIT ?
`;
```

Two columns bound (`project_id`, `artifact_sha256`), two selected. `DELETE_SIGHTING_SQL` is REUSED and binds all four; no second sighting-delete statement was declared, which the third spec case asserts by counting `DELETE FROM source_sightings` in the file and requiring exactly one.

## The three header passages, before and after

### 1. Module header, the P4-D3 paragraph (was `:42-45`, now `:41-60`)

**Before**

> The cascade is therefore explicit and runs in dependency order — a digest's observations and analyses go BEFORE the artifact itself, so a pass that runs out of budget halfway leaves a parent with fewer children and never a child with no parent.

**After**

> The cascade is therefore explicit and runs in dependency order — a digest's observations, its analyses AND its source sightings all go BEFORE the artifact itself, so a pass that runs out of budget halfway leaves a parent with fewer children and never a child with no parent.
>
> THREE CHILDREN, AND THE THIRD ARRIVED LATE. `source_sightings` was given to the sweep by plan 07-13 but not to `deleteDigest`'s cascade, so until plan 07-20 an evicted bundle's sightings were left to the orphan collection in step 3d — which is guarded on remaining budget and therefore does not run at all in a pass the artifact loop exhausted. The sentence above was consequently FALSE on the ordinary path for every evicted map-bearing bundle, not merely in the crash-recovery corner it describes (07-VERIFICATION.md WR-02, UAT gap G-07-2). It is true now because the cascade walks all three children.
>
> `sources` IS NOT A FOURTH CHILD, and no repair should make it one. It is content-addressed and SHARED between bundles, so it belongs to no single artifact: it dies with its LAST sighting, through the anti-join in step 3d, across passes by design.

### 2. The orphan paragraph (was `:389-394`)

**Before**

> Orphans: a child whose parent is already gone. The cascade below cannot create one — children go first — but a crash mid-pass in some future version, or a row written before this module existed, can. Cleaning them is cheap and makes "no orphans" a property of the database rather than of this code's control flow.

**After**

> Orphans: a child whose parent is already gone. The cascade below cannot create one — children go first, all THREE of them — but a crash mid-pass in some future version, or a row written before this module existed, can. Cleaning them is cheap and makes "no orphans" a property of the database rather than of this code's control flow.
>
> AND STEP 3d'S SIGHTINGS COLLECTION IS A CRASH-RECOVERY PATH AGAIN, WHICH IT WAS NOT BETWEEN PLANS 07-13 AND 07-20. While `deleteDigest` cascaded only two of the three children, that collection was the ORDINARY route by which an evicted bundle's sightings were removed — and on a pass whose budget the artifact loop had spent it did not run at all, so the sightings simply outlived their bundle until the next pass. This is written down rather than left to be rediscovered because 07-VERIFICATION.md WR-02 is precisely the finding that the header and the cascade disagreed about it: the difference between "the cascade covers this" and "an orphan sweep gets to it eventually" is what a reader uses to decide whether a read path must defend against an orphan, and `readSightingOrigin`'s LEFT JOIN is defensive rather than load-bearing only while the first of those is true.

### 3. `deleteDigest`'s DEPENDENCY ORDER docblock

**Before** — one paragraph, naming no children by name, followed directly by the `capped` paragraph.

**After** — the same paragraph plus two:

> THREE CHILDREN: `observations`, `analyses` AND `source_sightings`. The third was added by plan 07-20; before it, an evicted bundle's sightings were left to step 3d's orphan collection, which is guarded on remaining budget and so does not run at all in a pass this loop exhausted — making an orphaned sighting the ORDINARY outcome of evicting a map-bearing bundle rather than the crash-recovery corner the module header describes (07-VERIFICATION.md WR-02). Every one of the three is enumerated as keys and capped the same way, so reaching the sightings LIMIT leaves the artifact standing exactly as reaching the observations LIMIT does.
>
> `source_sightings` IS A CHILD OF `artifacts` AND `sources` IS NOT, WHICH IS WHY ONLY ONE OF THEM IS TOUCHED HERE. A sighting names exactly one bundle, so it belongs to that bundle and dies with it. A `sources` row is keyed on the CONTENT digest (D-05) and is SHARED — two bundles shipping the same module produce one row with two sightings — so it belongs to no bundle at all. A delete driven off the evicted bundle's sightings would take that row out from under a bundle still sighting it, which is exactly the failure `UNSIGHTED_SOURCES_SQL`'s anti-join exists to prevent and the eviction order the operator chose at UAT: a source dies with its LAST sighting, by anti-join, in step 3d, across passes by design. This function must never delete from `sources`.

**The three passages agree with each other and with the code**: the cascade enumerates three children, deletes from none but those three plus `artifacts`, and never names `sources`.

## IN-03

**Before**

> The four key columns are selected because the key IS four columns since migration `v: 9`, and every delete below binds all four.

**After**

> THREE key columns are selected and the fourth is the BOUND SCOPE. The key IS four columns since migration `v: 9` — `(project_id, artifact_sha256, map_sha256, source_index)` — but `project_id` is bound rather than selected here, so the select list is the three NON-SCOPE key columns. Every delete below still binds all four: the three selected plus the bound scope. `SIGHTING_KEYS_FOR_DIGEST_SQL` below draws the same distinction one step further, binding TWO of the four and selecting the other two.

## The RED, verbatim

Both cases were run against the **unmodified** `retention.ts` — the tree as task 2 found it, commit `d3caf4d^` — before any edit. No file was restored, checked out or stashed to produce this, so the aliased-`cp` hazard recorded in the round context was never reached.

```
 × G-07-2 / WR-02 … > ONE PASS, not a convergence loop: a budget-exhausting backlog leaves NO sighting naming a deleted artifact
   → one pass deleted the artifact and left a sighting naming it. `deleteDigest` cascaded
     `observations` and `analyses` but not `source_sightings`, so the sighting was left to
     step 3d — which did not run, because the artifact loop had spent the whole budget. The
     module header states THREE times that the cascade cannot create that state
     (G-07-2 / WR-02).: expected 1 to be +0 // Object.is equality

     - Expected
     + Received
     - 0
     + 1

 × G-07-2 / WR-02 … > `SIGHTING_KEYS_FOR_DIGEST_SQL` is scoped, ordered and LIMITed like every other candidate statement
   → SIGHTING_KEYS_FOR_DIGEST_SQL is not declared in retention.ts: expected null not to be null

 Test Files  1 failed (1)
      Tests  2 failed | 1 passed | 53 skipped (56)
```

**The budget was genuinely exhausted, and the case proves it rather than assuming it.** Both assertions guarding that fact ran BEFORE the failing one and passed on the pre-fix tree:

- `expect(first.deleted).toBe(RETENTION_SWEEP_MAX_ROWS)` — the pass spent all 512 rows, so step 3d's `if (budget() > 0)` took its `else { sightingsCapped = true; }` arm and the orphan collection did not run at all.
- `expect(artifactExists(P1, evicted)).toBe(false)` — the map-bearing bundle really was evicted, so there is a parent-gone state to assert about. It is seeded FIRST so oldest-first ordering reaches it; seeded last the case would pass for the wrong reason.

The backlog is `RETENTION_SWEEP_MAX_ROWS + 8`, imported from `@defminer/engine/thresholds`. **No artifact-count literal appears in the case.**

## The boundary assertion, and the convergence half

`sources` is NOT a child of `artifacts` — the single-pass claim stops at the sighting` is **green in both directions by design**, and was green before task 2's edit as well as after. That is the point: the evicted bundle's sole `sources` row (`SRC_ONLY_C`) survives the single pass under both repairs, because step 3d's anti-join did not run. The assertion message says so in full, so a reader cannot mistake the case above it for a promise about `sources` and "fix" the cascade into the exact failure `UNSIGHTED_SOURCES_SQL` exists to prevent.

**Convergence half:** from the same post-pass state, the existing `sweepToConvergence` helper drains the backlog and

```
expect(danglingSourceRows(P1)).toEqual({ orphanSightings: 0, unsightedSources: 0 });
expect(sourceIds(P1)).toEqual([]);
```

both pass — **zero orphan sightings and zero unsighted sources**. The across-passes property the existing cases own is unweakened.

## The existing cases, unmodified and green

The spec diff is `162 insertions(+), 0 deletions(-)`, so these four are byte-unchanged and all pass:

1. `an artifact evicted by the row cap leaves NO sighting naming it, and its now-unsighted source goes too`
2. `a source sighted from TWO bundles OUTLIVES the eviction of one`
3. `` `retentionCounts` reports both new tables, each equal to a direct COUNT(*) ``
4. `a pass whose sightings work exhausts the budget deletes NO `sources` row`

## Gate outputs

| Gate | Command | Result |
|---|---|---|
| Non-vacuity companion | `grep -vE '^[[:space:]]*(//\|\*\|/\*)' retention.ts \| grep -c 'DELETE_SIGHTING_SQL'` | **printed 4**, exit 0 — 3 before, 4 under A, exactly as the plan predicted |
| Excluded constructs (T-07-86, `high`) | `! grep -vE … \| grep -nE 'FOREIGN KEY\|ON DELETE CASCADE\|PRAGMA foreign_keys'` | **exit 0, no output** |
| — comment-filter control | same pattern, unfiltered, over the whole file | **6 matching lines** — the filter is a precondition, not decoration; without it this gate is a guaranteed false red |
| `.exec(` call sites (T-07-89, `high`) | `! grep -vE … \| grep -nE '\.exec\('` | **exit 0, no output** — still ZERO call sites |
| Schema ladder untouched | `git diff --name-only -- migrations.ts schema.spec.ts` | **empty** |
| Scope | `git diff --name-only -- packages/backend/src/store` | only `retention.ts` and `retention.spec.ts` |
| Targeted | `pnpm vitest run retention.spec.ts sql-discipline.spec.ts` | 2 files / **102 tests**, exit 0 |
| Targeted + ingest | `+ consumer.spec.ts` | 3 files / **182 tests**, exit 0 |
| Whole suite | `pnpm vitest run --reporter=dot` | **90 files / 4310 tests**, exit 0 |
| Static | `pnpm typecheck && pnpm lint && pnpm knip && pnpm build` | all **exit 0** |

**Baseline comparison.** The verifier's recorded baseline is 90 files / 4,302 tests. `07-19-SUMMARY.md` records **4307**, and 07-19 runs immediately before this plan in the serialised chain, so 4307 is the live floor and 4,302 only the floor beneath it. This plan reports **4310** — the floor plus exactly the three cases it added. Files stayed at 90 as required: no new spec file was created.

## Decisions Made

See `key-decisions` in the frontmatter. The two worth restating:

- **The `ORDER BY` is the key's own tail and nothing synthetic.** `(map_sha256, source_index)` is unique inside the bound `(project_id, artifact_sha256)` scope because the PK is all four columns since migration `v: 9`, so the ordering is total without a tie-break column — and it is an index-ordered prefix scan rather than a sort.
- **The block is inline in `deleteDigest`, not routed through `trimChildTable`.** That helper's recorded decision not to generalise stands, and this plan's prohibitions name it explicitly.

## Deviations from Plan

None — plan executed exactly as written, under option A.

One ordering note that is **not** a deviation: task 3's cases were authored and run for their RED *before* task 2's edit, so the RED was observed against the tree task 2 started from, exactly as task 3's `<action>` requires ("Run the case against the state task 2 started from"). The commits are in the plan's task order — `d3caf4d` (task 2, the fix) then `ac2a193` (task 3, the cases). Task 3 is `tdd="true"` and its GREEN comes from task 2's code, so it carries a single `test(...)` commit rather than a RED/GREEN pair; splitting it would have required committing a knowingly-red tree for the code that a *prior* task already fixed.

## Issues Encountered

None. The environment caveats recorded in the round context did not fire:

- **The aliased `cp -i` hazard was never reached** — no file was copied, restored, checked out or stashed at any point. The RED was produced by writing the cases first and running them against the untouched tree.
- **`git stash`, `git clean` and blanket resets were not used.**

## Known Stubs

None.

## Threat Flags

None. No new network endpoint, auth path, file access or trust-boundary schema change. The one new statement is `project_id`-scoped on the audited path and is covered by the plan's own register rows T-07-86, T-07-88 and T-07-89, all discharged above by runnable checks.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **G-07-2 / WR-02 closed** by `d3caf4d` (repair) and `ac2a193` (the pin). The verifier's `coincidental_reliance_items` entry for this phase is discharged: the single-pass property is no longer incidental.
- **IN-03 closed** by `d3caf4d`.
- Ready for **07-21**, the next plan in the serialised chain. It inherits a clean tree at **90 files / 4310 tests**, with typecheck, lint, knip and build all exit 0 — that count is 07-21's live floor.
- No blockers. `SCHEMA_VERSION` is still 9 and `migrations.ts` was not touched, so 07-21 and 07-22 face the same schema they were planned against.

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-02*

## Self-Check: PASSED

- `packages/backend/src/store/retention.ts` — present on disk
- `packages/backend/src/store/retention.spec.ts` — present on disk
- `.planning/phases/07-sourcemap-reconstruction/07-20-SUMMARY.md` — present on disk
- `d3caf4d` (task 2, fix) — found in `git log --oneline --all`
- `ac2a193` (task 3, test) — found in `git log --oneline --all`
- Frontmatter parses; `status: complete`
- Every `<acceptance_criteria>` from tasks 1, 2 and 3 re-run and passing; every
  plan-level `<verification>` command re-run, results in the gate table above
