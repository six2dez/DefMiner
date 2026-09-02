---
status: diagnosed
phase: 07-sourcemap-reconstruction
source: [07-VERIFICATION.md]
started: 2026-09-02T14:10:00Z
updated: 2026-09-02T14:45:00Z
round: 2
supersedes: 07-UAT-round1.md
---

## Current Test

[testing complete]

## Tests

### 1. Decide WR-01 — rewrite `RETENTION_SWEEP_MAX_PASSES`'s derivation, or lower the constant
expected: `thresholds.ts`'s docblock and `retention.ts:178-180` agree on one number, and the choice of 16 is re-derived from the real quotient.
detail: |
  `ROWS_INSERTED_PER_ITERATION_MAX = 3 + 2048 = 2051` (thresholds.ts:490-491), so the
  inequality's right-hand side is `128 + 2051 = 2179`. The `RETENTION_SWEEP_MAX_PASSES`
  docblock (thresholds.ts:166, 177, 191) still computes the pre-07-14 `4,227` in three
  sentences and concludes "Nine is the smallest integer that satisfies the inequality
  (4,227 / 512 = 8.26)". True quotient is 4.26; smallest satisfying integer is 5; next
  power of two is 8, not 16. `retention.ts:178-180` writes the correct figure. Two files
  in one repository disagree.
  The constant 16 OVER-satisfies, so nothing is unsafe at runtime — but its stated
  derivation no longer produces it, and `thresholds.spec.ts:260-281` computes the
  inequality FROM the constants, so it is structurally unable to fail on this.
  Drift is this round's own: correct at `4bd99c1`, left behind by `59347c3`.
severity: warning
introduced_by: this round (07-14, commit 59347c3)
result: issue
reported: "Fix it — operator chose gap-closure round 2 over accepting the drift"
severity: minor


### 2. Decide WR-02 — put `source_sightings` inside `deleteDigest`'s cascade, or scope the module header's invariant to the two children it covers
expected: Either every eviction removes its sightings in the same statement sequence as its observations and analyses, or `retention.ts:42-45` and `:389-390` say plainly that sightings are reaped as orphans by design and that the window closes on the next pass.
detail: |
  `deleteDigest` enumerates `OBSERVATION_KEYS_FOR_DIGEST_SQL` and
  `ANALYSIS_KEYS_FOR_DIGEST_SQL` then runs `DELETE_ARTIFACT_SQL`; it never touches
  `source_sightings`. Step 3d's orphan collection is guarded by `budget() > 0`
  (retention.ts:927) with an `else { sightingsCapped = true; }` arm, so a pass that
  spends its whole budget on 512 childless artifacts returns with every one of those
  bundles' sightings orphaned. `workRemains` re-detects it via `ORPHAN_SIGHTINGS_SQL`
  so it converges ACROSS passes — but the module header states three times that the
  cascade cannot create that state, and this is now the ORDINARY path for every evicted
  map-bearing bundle, not a crash-recovery corner.
  No data loss: `readSightingOrigin` LEFT JOINs `artifacts`, and the anti-join errs
  toward keeping `sources` rows alive.
  The decision turns on whether your UAT cascade choice meant "in the same statement
  sequence" or "in the same pass".
severity: warning
introduced_by: this round (07-13)
result: issue
reported: "Fix it — operator chose gap-closure round 2"
severity: major


### 3. Decide WR-03 — is a vite/webpack loader query analytic content the operator should see, or a residual the redactor should cut?
expected: Either the docblock stops claiming that a non-URL label has no query axis and `SOURCES_LABEL_CASES` gains a relative `?` case, or `redactSourceLabelForExport` cuts wherever a query axis is present rather than wherever the label is protocol-shaped.
detail: |
  `redactSourceLabelForExport` (export.ts:273-275) delegates to `redactUrlForExport`
  only when `isProtocolShapedLabel` is true. The stated premise at export.ts:255-256 —
  "A label that is not a URL has neither axis" — is false for the ordinary vite/webpack
  shape `src/App.vue?vue&type=script&lang.ts`, which `classify()` puts in `relative`.
  Those tails now export VERBATIM in redacted mode where they were previously cut at
  the `?`.
  `SOURCES_LABEL_CASES` holds 23 entries and NOT ONE contains a `?`, so the corpus
  passes identically in both modes and the narrowing is untested in the direction that
  changed.
  Counterweight, so this is not overread: the value still passes `stripForExport` and
  `csvField`, so there is no injection, and a bundler's loader query is not the
  credential class `redactUrlForExport` was written for. This is the SAFE mode
  disclosing more than it did, on a premise that is factually wrong, with no coverage.
severity: warning
introduced_by: this round (07-16)
result: issue
reported: "Fix it — operator chose gap-closure round 2"
severity: major


### 4. Accept or repair IN-01 — `derivedRejected.depth_exceeded` fires on `parsed.recovered.length > 0` rather than on whether anything was actually admitted for recursion
expected: A decision, plus the pinning case `consumer.spec.ts` lacks — a map whose every `sourcesContent` entry is empty, asserting `depth_exceeded === 0`.
detail: |
  At `consumer.ts:1272-1287` the comment above the gate names ONE inaccuracy (the log
  message's count over-states). The COUNTER shares the same condition, so if every
  recovered source is subsequently refused by `admitDerived` — all empty, or all over
  `DERIVED_SOURCE_MAX_BYTES`, both reachable from one hostile map — no recursion would
  have been attempted and the counter still increments.
  `telemetry.ts:317-322` states the unit as "one reconstruction stage that DECLINED TO
  RECURSE".
  Magnitude is one increment per map-bearing artifact against the 781 that MD-03's fix
  removed, and no health surface carries the counter — so this is not a reason to
  reopen MD-03. Whether the residual is worth a second local is a judgement.
severity: info
result: issue
reported: "Fix it — operator chose gap-closure round 2"
severity: minor


## Summary

total: 4
passed: 0
issues: 4
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-07-1
  truth: "`thresholds.ts`'s `RETENTION_SWEEP_MAX_PASSES` docblock and `retention.ts:178-180` agree on one number, and the choice of 16 is re-derived from the real quotient"
  status: failed
  reason: "User reported: Fix it — operator chose gap-closure round 2 over accepting the drift"
  severity: minor
  test: 1
  root_cause: "07-14 commit `59347c3` retired the `2 *` compensating factor from `ROWS_INSERTED_PER_ITERATION_MAX` and updated ONE thresholds.ts docblock, leaving the neighbouring `RETENTION_SWEEP_MAX_PASSES` derivation still computing the pre-fix 4,227 in three sentences. Correct at `4bd99c1`. `thresholds.spec.ts:260-281` computes the inequality FROM the constants, so it is structurally unable to fail on this."
  artifacts:
    - path: "packages/engine/src/thresholds.ts"
      issue: "lines 166, 177, 190-191 — derivation states 4,227 / 512 = 8.26 and concludes 9; real values are 2,179 / 512 = 4.26 concluding 5, next power of two 8"
  missing:
    - "Rewrite the RETENTION_SWEEP_MAX_PASSES derivation to compute from the shipped 2,179"
    - "State explicitly that 16 is retained as deliberate headroom rather than as the derived value (operator did NOT approve lowering the constant)"
    - "Add a spec that pins the DOCUMENTED quotient against the constants, since the existing spec computes from them and cannot catch prose drift"
  debug_session: ""

- gap_id: G-07-2
  truth: "Either every eviction removes its sightings in the same statement sequence as its observations and analyses, or `retention.ts:42-45` and `:389-390` say plainly that sightings are reaped as orphans by design and the window closes on the next pass"
  status: failed
  reason: "User reported: Fix it — operator chose gap-closure round 2"
  severity: major
  test: 2
  root_cause: "07-13 added `source_sightings` as a third child table but did not extend `deleteDigest` (retention.ts:1112-1193), which still enumerates only OBSERVATION_KEYS_FOR_DIGEST_SQL and ANALYSIS_KEYS_FOR_DIGEST_SQL before DELETE_ARTIFACT_SQL. Step 3d's orphan collection is guarded by `budget() > 0` (retention.ts:927) with an `else { sightingsCapped = true; }` arm, so a pass whose budget is consumed by 512 childless artifacts returns having orphaned every evicted bundle's sightings. Converges across passes via `workRemains` / ORPHAN_SIGHTINGS_SQL, so no data loss — but the module header states three times that the cascade cannot create that state."
  artifacts:
    - path: "packages/backend/src/store/retention.ts"
      issue: "lines 42-45 and 389-390 state an invariant one pass does not honour; `deleteDigest` at 1112-1193 cascades two children of three"
    - path: "packages/backend/src/store/retention.spec.ts"
      issue: "line 1337 drives sweepToConvergence, so the single-pass property is not under test"
  missing:
    - "Pick ONE of the two repairs: add source_sightings to deleteDigest's cascade in dependency order, OR scope the module header's claim to the two children it actually covers"
    - "NOTE: adding to the cascade must NOT introduce a foreign key or ON DELETE CASCADE — operator approved exactly one schema change this round (07-12's PK widening) and explicitly excluded both"
    - "Add a SINGLE-PASS test, not a sweepToConvergence one, so whichever property is chosen is actually pinned"
  debug_session: ""

- gap_id: G-07-3
  truth: "Either the docblock stops claiming that a non-URL label has no query axis and `SOURCES_LABEL_CASES` gains a relative `?` case, or `redactSourceLabelForExport` cuts wherever a query axis is present rather than wherever the label is protocol-shaped"
  status: failed
  reason: "User reported: Fix it — operator chose gap-closure round 2"
  severity: major
  test: 3
  root_cause: "07-16 narrowed LO-04's fix to protocol-shaped labels only, justified by the premise at export.ts:255-256 that 'a label that is not a URL has neither axis'. That premise is false for the ordinary vite/webpack loader-query shape `src/App.vue?vue&type=script&lang.ts`, which classify() puts in `relative`. Those tails now export VERBATIM in redacted mode where they were previously cut at the `?`. SOURCES_LABEL_CASES holds 23 entries and NOT ONE contains a `?`, so the corpus passes identically in both modes and the narrowing is untested in the direction that changed."
  artifacts:
    - path: "packages/backend/src/store/export.ts"
      issue: "lines 255-256 premise is falsified by an ordinary bundler shape; 273-275 gates on isProtocolShapedLabel"
    - path: "packages/backend/src/store/export.spec.ts"
      issue: "SOURCES_LABEL_CASES has no `?` in any of its 23 entries, so the changed behaviour is pinned by nothing"
  missing:
    - "Add a relative `?` corpus case FIRST — it pins whichever direction is chosen and is worth doing regardless"
    - "Then decide: correct the docblock premise and accept loader-query disclosure, or cut wherever a query axis is present"
    - "This is the only one of the four with a disclosure direction: the SAFE export mode currently reveals more than it did"
  debug_session: ""

- gap_id: G-07-4
  truth: "`derivedRejected.depth_exceeded` fires only when something was actually admitted for recursion, matching `telemetry.ts:317-322`'s stated unit"
  status: failed
  reason: "User reported: Fix it — operator chose gap-closure round 2"
  severity: minor
  test: 4
  root_cause: "07-15 hoisted D-13's depth gate to the recursion call site and guarded it on `parsed.recovered.length > 0`, but recursion only happens for sources `admitDerived` admits. 07-15's own executor reproduced it empirically: a map whose every sourcesContent entry is empty gives recovered.length 3, admitted-for-recursion 0, guard fires true — so depth_exceeded increments for a stage where zero recursions were attempted. Contradicts telemetry.ts's claim that a non-zero value always means at least one map-bearing artifact reached the bound. The executor documented the weaker half (the log message over-states) and missed the counter itself."
  artifacts:
    - path: "packages/backend/src/ingest/consumer.ts"
      issue: "lines 1272-1287 — counter and log both fire on parsed.recovered.length rather than on what was admitted"
    - path: "packages/backend/src/telemetry.ts"
      issue: "lines 317-322 state a unit the counter does not deliver"
  missing:
    - "Count admittedForRecursion inside the loop and emit after it, per the reviewer's named fix"
    - "Add the pinning case consumer.spec.ts lacks: a map whose every sourcesContent entry is empty, asserting depth_exceeded === 0"
    - "Magnitude is one increment per map-bearing artifact against the 781 MD-03 removed, and no health surface carries the counter — this does NOT reopen MD-03"
  debug_session: ""
