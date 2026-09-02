---
status: complete
phase: 07-sourcemap-reconstruction
source: [07-VERIFICATION.md]
started: 2026-09-02T07:13:35Z
updated: 2026-09-02T08:11:56Z
---

## Current Test

[testing complete]

## Tests

### 1. End-to-end on live traffic with an inline-map bundle
expected: A proxied bundle with an inline map yields a non-zero Sources count, a rendered tree, and readable source lines in the viewer.
result: pass
note: Confirmed on real proxied traffic against a live Caido at commit df5b101. Closes the verifier's central caveat that no test spanned proxy-response to rendered source line and the committed corpus could not produce one.

### 2. Decide the owner and eviction ORDER for sweeping `sources` and `source_sightings` (deferred D1)
expected: An assigned phase or plan, and an answer to the design question — does a `sources` row die when its last sighting goes, or age independently?
result: issue
reported: "Cascade: a source dies with its last sighting"
severity: major
note: The DESIGN QUESTION is now answered; the WIRING is not. Sweep `source_sightings` first by the normal caps, then delete `sources` rows with no surviving sighting (anti-join, not an FK — no schema change, so no fifth EXPECTED_TABLES approval). Content-addressed dedupe survives: a source sighted from two bundles outlives either one alone.

### 3. Re-measure the A8 COST half and land the harness in the tree
expected: Run A (no backlog, ceiling 50,000) and Run B (20,000-row aged backlog, ceiling 100) reproduce 07-05-SUMMARY.md's figures — 40 sweeps, <=512 rows/pass, ~+11 ms idle and ~+585 ms working.
result: issue
reported: "Land the harness as a gap — assert bounds, not timings"
severity: minor
note: Confirmed at HEAD — `a8-measure.spec.ts` does not exist and `git log --diff-filter=A --all` shows it was never committed, so the recorded figures are unreproducible by anyone. The FREQUENCY half is independently wired and green (three `retentionSweeps` assertions in consumer.spec.ts). Pairs with the D1 sweep work: same module, one round.

### 4. Accept or reject the three literal NUL bytes in Phase 7 spec files
expected: A decision: either re-spell them as escapes (the rule map-fixture.ts states in its own header and honours), or record the deviation with its reason.
result: pass
note: FIXED in commit f6cbf07 rather than accepted. Three literal NUL bytes re-spelled as escape sequences in sources-sink-prohibition.spec.ts (543, 1162) and SourceBrowser.spec.ts (634). Test-only, semantically identical; 150 affected tests green, typecheck and lint exit 0. Closes verifier finding W-2.

### 5. Flip MAP-05's ledger row in REQUIREMENTS.md, or state why it stays open
expected: MAP-05 marked [x], or a recorded reason it is not. Verifier finding W-1 reads it substantively MET at HEAD.
result: pass
note: Ticked with a dissolution note recorded inline. Malformed maps met by the reject-reason vocabulary; traversal and cycles by the 39-entry hostile corpus with an inclusive boundary fixture at exactly MAP_MAX_BYTES. Decompression bombs met BY CONSTRUCTION - Caido decodes gzip/brotli upstream so the plugin never decompresses, admit.ts's ceiling is in decompressed bytes, and the base64 path expands 4/3 rather than compressing. Machine-owned DERIVED RESIDUAL span verified byte-identical by sha256 before and after; outbound-prohibition.spec.ts green at 465. Closes verifier finding W-1.

### 6. The 10,000-row frame-budget backstop is load-sensitive
expected: `tests/frontend-load.spec.ts` "drops no more frames than the stated allowance" passes in a full-suite run.
result: issue
reported: "Observed during UAT — fails in full-suite runs under machine load, passes 3/3 in isolation"
severity: minor
note: NOT a regression. Reproduced at unmodified HEAD after reverting the NUL fix, and the spec references neither changed file. Earlier full-suite runs today passed in ~15s; failing runs take ~23s. The allowance (8 of 396 frames over 32 ms) is tight enough that concurrent load alone breaches it — observed 52/396.

## Summary

total: 6
passed: 3
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "`sources` and `source_sightings` are swept by retention, in cascade order, so neither table grows unbounded"
  status: failed
  reason: "User decided the eviction order at UAT: cascade — a source dies with its last sighting. `store/retention.ts` names neither table and migration v:8 has no FK and no ON DELETE CASCADE, so both grow without a sweep and deleting an artifact orphans its sightings."
  severity: major
  test: 2
  root_cause: "07-05 fixed the retention CADENCE and explicitly declined the COVERAGE, calling eviction order a design question (deferred item D1). No later ROADMAP phase claims the work — Phase 11's soak covers heap, not table rows."
  artifacts:
    - path: "packages/backend/src/store/retention.ts"
      issue: "sweeps neither `sources` nor `source_sightings`"
    - path: "packages/backend/src/store/migrations.ts"
      issue: "migration v:8 declares no FK and no ON DELETE CASCADE between the two tables"
  missing:
    - "Sweep `source_sightings` by the normal age/row caps"
    - "Then delete `sources` rows with no surviving sighting, via anti-join (NOT an FK — avoids a fifth EXPECTED_TABLES approval)"
    - "Preserve content-addressed dedupe: a source sighted from two bundles must outlive either bundle alone"
    - "Resolves W-5 as a side effect — HI-04's convergence arithmetic currently counts inserts into tables the sweep cannot delete from"
  debug_session: ""

- truth: "The A8 cost half is reproducible at HEAD by a committed harness, not only recorded in a SUMMARY"
  status: failed
  reason: "User chose to land the harness. a8-measure.spec.ts was a scratch file deleted after its run and never committed, so 07-05-SUMMARY.md's figures cannot be re-derived at HEAD."
  severity: minor
  test: 3
  root_cause: "The measurement was taken with a throwaway spec rather than a committed one; the plan carried the cost half as verification:backstop and the verifier correctly abstained rather than passing it on the SUMMARY's word."
  artifacts:
    - path: "packages/backend/src/a8-measure.spec.ts"
      issue: "does not exist; never committed (git log --diff-filter=A --all returns nothing)"
  missing:
    - "Re-author a8-measure.spec.ts as a committed, runnable benchmark"
    - "Assert BOUNDS not timings - sweeps == artifacts, rows/pass <= RETENTION_SWEEP_MAX_ROWS, idle and working deltas bounded - because wall-clock figures are machine-dependent"
    - "Run A: no backlog, ceiling 50,000. Run B: 20,000-row aged backlog, ceiling 100"
    - "Land alongside the D1 sweep work - same module, one test run"
  debug_session: ""

- truth: "The 10,000-row frame-budget backstop gives the same verdict under load as it does idle"
  status: failed
  reason: "Discovered during UAT, not by the phase verifier. Fails in full-suite runs when the machine is loaded (52 of 396 frames over 32 ms against an allowance of 8) and passes 3/3 in isolation. Reproduced at unmodified HEAD, so it is not a Phase 7 regression."
  severity: minor
  test: 6
  root_cause: "A wall-clock frame-budget assertion with a tight absolute allowance, run inside a full suite that competes for the same CPU. Suite duration on this machine varies 15s-23s between runs; the allowance does not adapt."
  artifacts:
    - path: "tests/frontend-load.spec.ts"
      issue: "'drops no more frames than the stated allowance' asserts an absolute frame count that concurrent load alone can breach"
  missing:
    - "Decide whether this backstop should run inside the full suite at all, or be isolated / serialised"
    - "If it stays in-suite, make the verdict load-robust - relative budget, a warm-up discard, or a retry-on-contention - rather than widening the allowance, which would blunt what it measures"
    - "Pre-existing, not introduced by Phase 7 - assign an owner rather than attaching it to this phase's gap round"
  debug_session: ""
