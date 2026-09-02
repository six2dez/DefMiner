---
status: testing
phase: 07-sourcemap-reconstruction
source: [07-VERIFICATION.md]
started: 2026-09-02T14:10:00Z
updated: 2026-09-02T14:10:00Z
round: 2
supersedes: 07-UAT-round1.md
---

## Current Test

number: 1
name: Decide WR-01 — rewrite `RETENTION_SWEEP_MAX_PASSES`'s derivation, or lower the constant
expected: |
  `thresholds.ts`'s docblock and `retention.ts:178-180` agree on one number, and the
  choice of 16 is re-derived from the real quotient.
awaiting: user response

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
result: [pending]

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
result: [pending]

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
result: [pending]

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
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
