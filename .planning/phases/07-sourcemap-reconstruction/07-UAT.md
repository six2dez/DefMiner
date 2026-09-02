---
status: testing
phase: 07-sourcemap-reconstruction
source: [07-VERIFICATION.md]
started: 2026-09-02T07:13:35Z
updated: 2026-09-02T07:13:35Z
---

## Current Test

number: 1
name: Observe the feature produce a readable line of developer source from real proxied traffic, end to end, on a live Caido
expected: |
  A bundle carrying an INLINE map is proxied; the Artifacts row shows a non-zero
  Sources count; the drill-down renders the tree and the viewer shows the original
  file's lines.
awaiting: user response

## Tests

### 1. End-to-end on live traffic with an inline-map bundle
expected: A proxied bundle with an inline map yields a non-zero Sources count, a rendered tree, and readable source lines in the viewer.
result: [pending]

### 2. Decide the owner and eviction ORDER for sweeping `sources` and `source_sightings` (deferred D1)
expected: An assigned phase or plan, and an answer to the design question — does a `sources` row die when its last sighting goes, or age independently?
result: [pending]

### 3. Re-measure the A8 COST half and land the harness in the tree
expected: Run A (no backlog, ceiling 50,000) and Run B (20,000-row aged backlog, ceiling 100) reproduce 07-05-SUMMARY.md's figures — 40 sweeps, <=512 rows/pass, ~+11 ms idle and ~+585 ms working.
result: [pending]

### 4. Accept or reject the three literal NUL bytes in Phase 7 spec files
expected: Either re-spell as `\u0000` escapes (the rule `map-fixture.ts` states and honours), or record the deviation with its reason.
result: [pending]

### 5. Flip MAP-05's ledger row, or state why it stays open
expected: MAP-05 marked `[x]`, or a recorded reason it is not. W-1 finds it substantively met at HEAD.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0
