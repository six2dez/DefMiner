---
status: testing
phase: 01-skeleton-persistence-compatibility
source: [01-VERIFICATION.md]
started: 2026-08-21T08:30:00Z
updated: 2026-08-21T08:30:00Z
---

## Current Test

number: 1
name: Decide the WR-07 persistence policy for `observations.url`
expected: |
  An explicit operator decision: keep verbatim (accept a durable record of real
  browsing including tokens in query strings), redact at write, or shorten
  retention for the url column specifically.
awaiting: user response

## Tests

### 1. Decide the WR-07 persistence policy for `observations.url`
expected: An explicit operator decision — keep verbatim, redact at write, or shorten retention for the url column specifically. `normaliseObservedUrl` (`packages/backend/src/store/observations.ts:39`) strips only the fragment and keeps the query string verbatim for 90 days, in a database that survives project deletion and force-reinstall — while `telemetry.ts:236` redacts that identical value out of error text before it crosses the RPC. Adjacent: the store layer's `String(e).slice(0, 200)` in `analyses.ts`, `artifacts.ts`, `observations.ts`, `settings.ts`, `migrations.ts` becomes the `analyses.error` column and was deliberately left unredacted pending this same decision.
result: [pending]

### 2. Resolve STORE-01's scope
expected: Either re-scope STORE-01's wording to the three tables Phase 1 legitimately owns and open a new requirement for `entities`/`evidence`/`audit` against Phase 4/5, or amend the ROADMAP traceability table so those tables have an owner. Currently REQUIREMENTS.md:49 marks STORE-01 `[x]` complete and ROADMAP.md:363 maps it exclusively to Phase 1, while three of its six named table groups do not exist and no later phase claims them.
result: [pending]

### 3. Review the three judgment-tier prohibitions
expected: Each accepted, or an enforcement mechanism scheduled. CORE-01 (outbound traffic), STORE-01 (secret-capable persistence), CORE-10 (completeness claims). Each correctly disposes `{status: unverified, flagged: true}` — expected, never a silent pass. Note CORE-01's has **no wired enforcement**: the allowlist admits `caido:http` and `sdk.requests.send` needs no import, so neither gate would catch a regression.
result: [pending]

### 4. Review the 11 `unclassified` edge-probe rows
expected: Each confirmed still-acceptable or promoted to a resolved disposition. Rows 2, 8, 15, 16, 19, 23, 24, 25, 26, 34, 37 in `01-PROBE.md` — CORE-02, CORE-04, CORE-08, CORE-09, STORE-01, STORE-03, STORE-04, STORE-05, STORE-06, COMPAT-02, DIST-05. Confirmed still surfaced across all six plans, not silently dropped.
result: [pending]

### 5. Review the seven open informational findings
expected: Accepted as informational or scheduled. IN-01 … IN-07 in `01-REVIEW.md`. Note IN-03 is partly overtaken — the `@public` tag and its knip justification were removed when `resetDbHandle` became `resetDbHandleForTest`.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
