---
status: superseded
phase: 01-skeleton-persistence-compatibility
superseded_by: 01-UAT.md
superseded_at: 2026-08-27
round: 1
source: [01-VERIFICATION.md]
started: 2026-08-21T08:30:00Z
updated: 2026-08-21T10:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Decide the WR-07 persistence policy for `observations.url`
expected: An explicit operator decision — keep verbatim, redact at write, or shorten retention for the url column specifically.
result: issue
reported: "Redact at write — strip or hash query-string values before the row is written, keeping the path and the parameter names."
severity: major

### 2. Resolve STORE-01's scope
expected: Either re-scope STORE-01 to the tables Phase 1 owns and open a new requirement for `entities`/`evidence`/`audit`, or amend the ROADMAP traceability table so those tables have an owner.
result: pass
reported: "Re-scope STORE-01 + open a new requirement."
note: |
  Applied during UAT as a ledger correction, not gap-closure work — documentation, not code.
  - STORE-01 re-scoped to artifacts, occurrences (`observations`), analyses, and settings, with the
    re-scope reason recorded inline. Its `[x]` is now truthful.
  - STORE-08 opened, unchecked, covering `entities`, `evidence` and `audit` "added by forward
    migration steps when their writers land".
  - ROADMAP traceability: STORE-08 (`entities`, `evidence`) → Phase 4; STORE-08 (`audit`) → Phase 5.
  Supersedes 01-PROBE.md row 19, which flagged this destination as UNRESOLVED.

### 3. Review the three judgment-tier prohibitions
expected: Each accepted, or an enforcement mechanism scheduled.
result: issue
reported: "Accept all three, schedule CORE-01 enforcement."
severity: major
note: |
  The three flagged-unverified dispositions are accepted as correct for a descriptor-less
  prohibition. CORE-01's lack of wired enforcement is scheduled as gap-closure work: the DIST-05
  allowlist admits `caido:http` and `sdk.requests.send` needs no import, so neither existing gate
  would catch outbound traffic being introduced.

### 4. Review the 11 `unclassified` edge-probe rows
expected: Each confirmed still-acceptable or promoted to a resolved disposition.
result: pass
reported: "Confirm still-acceptable."
note: Rows 2, 8, 15, 16, 19, 23, 24, 25, 26, 34, 37 remain explicit planner assumptions, all still surfaced across the six plans. Row 19 is superseded by the STORE-01 re-scope in test 2.

### 5. Review the seven open informational findings
expected: Accepted as informational or scheduled.
result: pass
reported: "Accept as informational."
note: IN-01 … IN-07 stay recorded in 01-REVIEW.md for a future cleanup pass. IN-03 is already partly overtaken by the `resetDbHandleForTest` rename.

## Summary

total: 5
passed: 3
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "`observations.url` does not persist query-string values verbatim; the path and parameter names are retained, the values are redacted or hashed before the row is written"
  status: failed
  reason: "User decision at UAT: redact at write. `normaliseObservedUrl` (packages/backend/src/store/observations.ts:39) currently strips only the fragment and keeps the query string verbatim for 90 days, in a database that survives project deletion and force-reinstall — while telemetry.ts:236 redacts that identical value out of error text before it crosses the RPC. The durable store must not be looser than the transient channel."
  severity: major
  test: 1
  root_cause: "By design, not a defect: plan 01-01's must_have truth #2 explicitly requires the query string be preserved. Closing this gap requires that truth to be amended, not just the code changed."
  artifacts:
    - path: "packages/backend/src/store/observations.ts"
      issue: "normaliseObservedUrl strips the fragment only; query-string values are persisted verbatim"
    - path: "packages/backend/src/store/analyses.ts"
      issue: "String(e).slice(0, 200) writes unredacted error text into the analyses.error column — same persistence question, deliberately left by the code-review fixer pending this decision"
    - path: "packages/backend/src/store/artifacts.ts"
      issue: "same unredacted String(e) persistence path"
    - path: "packages/backend/src/store/settings.ts"
      issue: "same unredacted String(e) persistence path"
    - path: "packages/backend/src/store/migrations.ts"
      issue: "same unredacted String(e) persistence path"
    - path: ".planning/phases/01-skeleton-persistence-compatibility/01-01-PLAN.md"
      issue: "must_have truth #2 requires the query string be preserved — must be amended for the new policy to be consistent"
  missing:
    - "Redact or hash query-string VALUES in normaliseObservedUrl before the row is written, retaining path and parameter names"
    - "Apply the same redaction to the store layer's String(e) paths that land in the analyses.error column"
    - "Amend plan 01-01's must_have truth #2 so the plan and the code agree"
    - "A test proving a URL with ?token=secret persists without the secret, and that removing the redaction fails it"
  debug_session: ""

- truth: "No code under packages/backend/src can introduce outbound traffic — a call to sdk.requests.send or an import of caido:http fails a gate"
  status: failed
  reason: "User decision at UAT: accept the three flagged prohibitions, schedule CORE-01 enforcement. The verifier found CORE-01's prohibition has no wired enforcement — the DIST-05 allowlist admits `caido:http` and `sdk.requests.send` requires no import at all, so neither existing gate would catch a regression. In a passive-only security tool this is the prohibition that most needs teeth."
  severity: major
  test: 3
  root_cause: "The prohibition was authored descriptor-less by design (no check_* scalar), which correctly disposes flagged-unverified but wires no actual check. COVERAGE.md row 9 marks sdk.requests.send OPT-OUT as 'Prohibited in this phase' — prose, not a gate."
  artifacts:
    - path: "scripts/ci/check-bundle-imports.mjs"
      issue: "allowlist admits caido:* including caido:http; cannot catch sdk.requests.send, which needs no import"
    - path: ".planning/phases/01-skeleton-persistence-compatibility/01-01-PLAN.md"
      issue: "must_haves.prohibitions CORE-01 entry is descriptor-less, so nothing enforces it"
  missing:
    - "An AST gate over packages/backend/src asserting no call to sdk.requests.send and no import of caido:http"
    - "A violating fixture proving the gate fails, following the same shape as the existing CORE-05 and toText AST gates"
  debug_session: ""
