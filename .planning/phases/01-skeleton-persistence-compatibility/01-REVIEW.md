---
phase: 01-skeleton-persistence-compatibility
reviewed: 2026-08-26T06:40:00Z
reviews:
  - pass: initial
    reviewed: 2026-08-21T00:30:00Z
    scope: 54 files (plans 01-01 … 01-06)
    findings: CR-01, WR-01…WR-10, IN-01…IN-07
  - pass: gap-closure
    reviewed: 2026-08-21T11:21:31Z
    scope: 13 files changed by plans 01-07, 01-08, 01-09
    findings: CR-02…CR-06, WR-11…WR-16, IN-08…IN-13
  - pass: gap-closure-round-2
    reviewed: 2026-08-21T15:23:01Z
    scope: 9 files changed by plans 01-10 … 01-14
    findings: CR-07, WR-17…WR-21, IN-14…IN-19
    verdict: >-
      CR-02…CR-06 and WR-11…WR-16 all verified CLOSED by execution, not by
      summary. IN-08, IN-10…IN-13 closed; IN-09 half closed. One NEW BLOCKER —
      a bare query/path segment that CONTAINS an `=` (every base64-padded
      credential) is still parsed as `name=value` and survives verbatim into
      `observations.url`.
  - pass: gap-closure-round-3
    reviewed: 2026-08-22T10:20:00Z
    scope: 9 files changed by plans 01-15, 01-16, 01-17
    findings: CR-08, WR-22...WR-26, IN-20...IN-22
    verdict: >-
      CR-07 verified CLOSED by execution on both delimiters. WR-17...WR-21
      verified CLOSED; IN-14...IN-17 and IN-19 closed; IN-18 remains pinned and
      its deferral rationale is now itself defective. One NEW BLOCKER, and it is
      the fourth instance of this phase's signature defect in the same shape: the
      WR-19 assembled-key widening is defeated by ONE `const`, and the fixture
      that asserts the one-hop bound uses a LITERAL key so it cannot fail against
      the concealment the rule exists to catch.
  - pass: gap-closure-round-4
    reviewed: 2026-08-24T10:05:00Z
    scope: 7 files changed by plans 01-18 … 01-22
    findings: CR-09, CR-10, WR-27...WR-31, IN-23...IN-26
    verdict: >-
      CR-08 and WR-22...WR-26 all verified CLOSED by execution; IN-20, IN-21 and
      IN-22 closed. WR-25's own statement of consequence is corrected here: only
      2 of the 5 breaks it enumerated were actually silent. TWO NEW BLOCKERS, and
      both are the phase's signature defect in its fifth and sixth instance. The
      alias residual round 4 wrote to REPLACE the last false one is itself false
      — `collect` completes a full pass before `visit`, so the READ position never
      bounds anything — and the fixture titled for it is green because its
      BINDINGS are inverted, not its read. That sentence is copied verbatim into
      the four artifacts CORE-11's `[x]` was flipped against. Separately, a
      receiver key whose FIRST binding is a harmless literal shadows every later
      rebinding, so `let k = "x"; k = "requests"; sdk[k].send(req)` is silent —
      CR-08 one keyword over.
  - pass: gap-closure-round-5
    reviewed: 2026-08-24T16:30:00Z
    scope: 6 files changed by plans 01-23 … 01-28
    findings: CR-11, CR-12, CR-13, WR-32...WR-37, IN-27...IN-30
    verdict: >-
      CR-09, CR-10, WR-27...WR-31 and IN-23...IN-26 all verified CLOSED by
      execution. The derived-residual mechanism is real: both shipped spans are
      byte-identical (295 lines, sha256 91978e31...), the coverage guard fails on
      an injected resolver in BOTH enumerated shapes, and the URL redaction half
      holds under a 16,160-input sweep with ZERO secret survivals. THREE NEW
      BLOCKERS. The machine-owned text itself carries a false universal — the
      `silence-operator-around-global-receiver` entry says silence "in every
      spelling" and FOUR spellings report — and two fully readable one-hop shapes
      are silent under positive claims that cover them: a logical-assignment
      binding (`r ??= sdk.requests`) is invisible to every collector, and a
      receiver KEY bound to a conditional is silent while the MEMBER and
      SPECIFIER twins of the same conditional both report unanalysable.
  - pass: gap-closure-round-6
    reviewed: 2026-08-24T21:10:00Z
    scope: 5 files changed by plans 01-29 … 01-32
    findings: CR-14, CR-15, CR-16, WR-38...WR-43, IN-31...IN-33
    verdict: >-
      CR-11, CR-12, CR-13, WR-32...WR-37 and IN-27...IN-30 all verified CLOSED by
      execution. The branch mechanism EARNS its central claim: neutering the
      `PlusEqualsToken` assembly branch while leaving its anchor line intact turns
      the DERIVED block red at ROW granularity, naming the row, the phrase and the
      anchor; injecting a resolver turns the coverage guard red; FALSIFIED_HANDOFFS
      is genuinely at zero. THREE NEW BLOCKERS, and all three are the signature
      defect surviving in the ONE surface the new mechanism does not reach. The
      gate file's hand-written HEADER still asserts, present tense, that an
      operator around a global receiver is silent "in every spelling" and names six
      exemplars — all six REPORT — while listing the shape as OPEN AND UNOWNED and
      pointing at a fixture that is now titled CLOSED. A bare global in RECEIVER
      rather than CALLEE position is silent across the whole family — `fetch.call`,
      `fetch.bind`, `Reflect.apply(fetch, …)`, `eval.call`, and a POSITIVELY
      IDENTIFIED alias's `f.call` — while every SDK twin, every `globalThis.`
      twin and `navigator.sendBeacon.call` report. And an unreadable member on a
      positively identified `navigator` receiver is silent while the identical
      shape on `requests`, `net` and `globalThis` reports `outbound-unanalysable`.
  - pass: gap-closure-round-7
    reviewed: 2026-08-26T06:40:00Z
    scope: 5 files changed by plans 01-33 … 01-35
    findings: CR-17, CR-18, CR-19, WR-44...WR-48, IN-34...IN-36
    verdict: >-
      CR-14, CR-15, CR-16, WR-38...WR-43 and IN-31...IN-33 are all CLOSED or
      DISCLOSED-by-row, verified by execution. CORE-11's `[x]` IS earned under
      the operator's re-scoped bar: I re-ran all three criteria as mutations and
      all three held — a one-character divergence in a registry clause turns BOTH
      byte comparisons red at once, each shipped copy drives its OWN comparison
      red ALONE, and a declared phrasing planted outside all three exclusions
      turns the whole-file guard red naming the line. Nothing in the code, the
      generated span or the ledger claims the gate is complete; the narrow bar is
      stated correctly and repeatedly. THREE NEW BLOCKERS, and all three are the
      signature defect in the one place the new mechanism does not look — at the
      IDENTITY of what it excuses, and on the two surfaces it declares unguarded.
      A named exemption whose key is `{q2} :: q2` RELOCATED, under execution, off
      the ASCII-table cell its reason describes and onto a fabricated hand-written
      BOUND planted 9,000 lines away: 432/432 still green. The ledger row whose
      box is `[x]` ends with an unmarked, present-tense `THE BOX IS DELIBERATELY
      STILL [ ], AND THE BLOCKING ROW IS NAMED`. And `STATE.md`'s live Blockers
      section still carries CR-14's exact false paragraph — the row
      `silence-operator-around-global-receiver` and its six now-reporting
      exemplars — one surface over from where wave 33 deleted it.
depth: standard
files_reviewed: 59
files_reviewed_list:
  - packages/engine/src/queue.ts
  - packages/engine/src/chunker.ts
  - packages/engine/src/deadline.ts
  - packages/engine/src/yield.ts
  - packages/engine/src/pipeline.ts
  - packages/engine/src/decode.ts
  - packages/engine/src/digest.ts
  - packages/engine/src/thresholds.ts
  - packages/engine/src/thresholds.generated.ts
  - packages/engine/src/thresholds.spec.ts
  - packages/engine/src/queue.spec.ts
  - packages/engine/src/pipeline.spec.ts
  - packages/engine/src/boundary.spec.ts
  - packages/backend/src/index.ts
  - packages/backend/src/compat.ts
  - packages/backend/src/lifecycle.ts
  - packages/backend/src/lifecycle.spec.ts
  - packages/backend/src/telemetry.ts
  - packages/backend/src/telemetry.spec.ts
  - packages/backend/src/outbound-prohibition.spec.ts
  - packages/backend/src/hooks/passive.ts
  - packages/backend/src/hooks/passive.spec.ts
  - packages/backend/src/hooks/admit.ts
  - packages/backend/src/hooks/admit.spec.ts
  - packages/backend/src/ingest/consumer.ts
  - packages/backend/src/ingest/consumer.spec.ts
  - packages/backend/src/store/db.ts
  - packages/backend/src/store/migrations.ts
  - packages/backend/src/store/migrations.spec.ts
  - packages/backend/src/store/artifacts.ts
  - packages/backend/src/store/observations.ts
  - packages/backend/src/store/observations.spec.ts
  - packages/backend/src/store/error-redaction.spec.ts
  - packages/backend/src/store/analyses.ts
  - packages/backend/src/store/settings.ts
  - packages/backend/src/store/retention.ts
  - packages/backend/src/store/retention.spec.ts
  - packages/backend/src/store/schema.spec.ts
  - packages/backend/src/store/sql-discipline.spec.ts
  - packages/backend/test/fixtures/sqlite-fixture.ts
  - packages/backend/test/fixtures/fake-sdk.ts
  - scripts/ci/check-bundle-imports.mjs
  - scripts/ci/check-bundle-imports.spec.ts
  - scripts/ci/gen-thresholds.mjs
  - scripts/phase1/env.sh
  - scripts/phase1/fetch-caido.sh
  - scripts/phase1/tracer-e2e.sh
  - tests/pins.spec.ts
  - tests/phase1-compat.spec.ts
  - tests/phase1-load.spec.ts
  - vitest.config.ts
  - eslint.config.js
  - knip.json
  - tsconfig.base.json
  - packages/engine/tsconfig.json
  - packages/backend/tsconfig.json
  - packages/caido.config.ts
  - pnpm-workspace.yaml
  - package.json
findings:
  critical: 19
  warning: 48
  info: 36
  total: 103
status: issues_found
fixed_at: 2026-08-21T08:05:00Z
resolution:
  fixed:
    [
      CR-01,
      CR-02,
      CR-03,
      CR-04,
      CR-05,
      CR-06,
      WR-01,
      WR-02,
      WR-03,
      WR-04,
      WR-05,
      WR-06,
      WR-08,
      WR-09,
      WR-10,
      WR-11,
      WR-12,
      WR-13,
      WR-14,
      WR-15,
      WR-16,
      IN-08,
      IN-10,
      IN-11,
      IN-12,
      IN-13,
      CR-07,
      WR-17,
      WR-18,
      WR-19,
      WR-20,
      WR-21,
      IN-14,
      IN-15,
      IN-16,
      IN-17,
      IN-19,
      CR-08,
      WR-22,
      WR-23,
      WR-24,
      WR-25,
      WR-26,
      IN-20,
      IN-21,
      IN-22,
      IN-18,
      CR-09,
      CR-10,
      WR-27,
      WR-28,
      WR-29,
      WR-30,
      WR-31,
      IN-23,
      IN-24,
      IN-25,
      IN-26,
      CR-11,
      CR-12,
      CR-13,
      WR-32,
      WR-33,
      WR-34,
      WR-35,
      WR-36,
      WR-37,
      IN-27,
      IN-28,
      IN-29,
      IN-30,
    ]
  partially_fixed: [IN-09]
  deferred: [WR-07]
  pinned: []
  open:
    [
      IN-01,
      IN-02,
      IN-03,
      IN-04,
      IN-05,
      IN-06,
      IN-07,
      IN-09,
      CR-14,
      CR-15,
      CR-16,
      WR-38,
      WR-39,
      WR-40,
      WR-41,
      WR-42,
      WR-43,
      IN-31,
      IN-32,
      IN-33,
      CR-17,
      CR-18,
      CR-19,
      WR-44,
      WR-45,
      WR-46,
      WR-47,
      WR-48,
      IN-34,
      IN-35,
      IN-36,
    ]
fix_commits:
  CR-01: 910c382
  WR-01: 7a5aa5c
  WR-02: 0c27fbf
  WR-03: 9927a76
  WR-04: c58bad7
  WR-05: e19b73e
  WR-06: 2966662
  WR-08: 49250aa
  WR-09: 15509d4
  WR-10: 992bada
  CR-02: a3a2cc9
  CR-03: a3a2cc9
  CR-04: 51545c0
  CR-05: 4e16c11
  CR-06: 2458713
  WR-11: 2bc42d0
  WR-12: b2512f9
  WR-13: b7e4e2f
  WR-14: a3a2cc9
  WR-15: 59c9c67
  WR-16: 59c9c67
  IN-08: a3a2cc9
  IN-09: a3a2cc9
  IN-10: a3a2cc9
  IN-11: 02ceee5
  IN-12: a3a2cc9
  IN-13: 59c9c67
  CR-07: 0fdac5c
  WR-17: 897598e
  WR-18: 897598e
  WR-19: 0ec1e02
  WR-20: e129f10
  WR-21: ce5f3a5
  IN-14: 6d32e01
  IN-15: 897598e
  IN-16: 897598e
  IN-17: 897598e
  IN-19: 9fffb52
  CR-08: 834b9c5
  WR-22: 693cfd9
  WR-23: 9cf9162
  WR-24: 194287a
  WR-25: d2e1907
  WR-26: 2709f18
  IN-20: 2709f18
  IN-21: 5f2d0bd
  IN-22: 79961ff
  CR-09: 181530f
  CR-10: 482fc26
  WR-27: 278a0d2
  WR-28: ec2ecd3
  WR-29: ec2ecd3
  WR-30: b0b0f92
  WR-31: e5b236e
  IN-23: e5b236e
  IN-24: e5b236e
  IN-25: e5b236e
  IN-26: b0b0f92
tests_before: 27 files / 616 tests
tests_after: 31 files / 1345 tests
---

# Phase 1: Code Review Report

**Reviewed:** 2026-08-21T00:30:00Z (initial, 54 files), 2026-08-21T11:21:31Z (gap closure, 13 files), 2026-08-21T15:23:01Z (gap closure round 2, 9 files), 2026-08-22T10:20:00Z (gap closure round 3, 9 files), 2026-08-24T10:05:00Z (gap closure round 4, 7 files), 2026-08-24T16:30:00Z (gap closure round 5, 6 files) 2026-08-24T21:10:00Z (gap closure round 6, 5 files) and 2026-08-26T06:40:00Z (gap closure round 7, 5 files)
**Depth:** standard
**Files Reviewed:** 59 (union of all eight passes)
**Status:** issues_found — three new BLOCKERs from round 7 (`CR-17`, `CR-18`, `CR-19`), on top of `WR-07` (deferred) and `IN-01…IN-07`/`IN-09` (open). `CR-14`, `CR-15`, `CR-16`, `WR-38…WR-43` and `IN-31…IN-33` are all CLOSED or disclosed-by-row, verified by execution. **CORE-11's `[x]` is EARNED under the operator's re-scoped bar** — all three criteria re-verified by independent mutation in this session

> **Two passes, one file.** Everything above the `--- PASS 2 ---` marker is the
> 2026-08-21T00:30Z review of plans 01-01…01-06 and its resolution ledger, kept
> verbatim because the `fix_commits` map is evidence. Everything below it is the
> 2026-08-21T11:21Z review of the 13 files plans 01-07, 01-08 and 01-09 changed
> afterwards. New findings use a fresh ID series (`CR-02+`, `WR-11+`, `IN-08+`)
> so nothing collides.

## Resolution (2026-08-21)

Ten findings fixed, one commit each, each with a test that FAILS without the
fix — every mutation run rather than described, and the failing message quoted
in its commit. `WR-07` was deferred by explicit decision at the time (the
query-string retention policy was the operator's to make). **`WR-07` has since
been acted on** — see the disposition note below. `IN-01 … IN-07` remain open.

| Finding | Status | Commit | The assertion that fails without the fix |
|---|---|---|---|
| CR-01 | fixed | `910c382` | `expected true to be false` (armed flag) and `expected 1 to be +0` (hook registered without isolation) |
| WR-01 | fixed | `7a5aa5c` | `expected 1538 to be less than or equal to 512` |
| WR-02 | fixed | `0c27fbf` | `expected 2 to be 1` (a change opened a second pool) |
| WR-03 | fixed (partially — see WR-12) | `9927a76` | a URL crossed the getStatus RPC — `expected [ Array(1) ] to deeply equal []` |
| WR-04 | fixed | `c58bad7` | `1 sweeps after 128 rows were inserted … expected 1 to be 2` |
| WR-05 | fixed | `e19b73e` | a pending claim reported as a cache hit — `expected 1 to be +0` |
| WR-06 | fixed | `2966662` | `expected +0 to be 4` (the rebound queue was never drained) |
| WR-07 | **deferred, then acted on** | `f0fb3c6` | see the disposition note under WR-07 — the policy landed, the finding does not close |
| WR-08 | fixed | `49250aa` | two violations planted in `hooks/passive.ts`, invisible to the old gate |
| WR-09 | fixed | `15509d4` | `expected 0 to be greater than 0`, at the summary and at the counter |
| WR-10 | fixed | `992bada` | `promise rejected … instead of resolving` |

Test count moved from **27 files / 616 tests** to **28 files / 637 tests**;
`pnpm typecheck`, `pnpm lint`, `pnpm knip` clean; the shipped bundle's import
set is still exactly `crypto`; and `scripts/phase1/tracer-e2e.sh` reports
TRACER PASSED against a live Caido 0.57.1 — digest equal, one artifact with
`seen_count` 2, two observations, sqlite 3.46.0, schema v2.

## Summary (pass 1)

The measured runtime constraints are respected where it counts. I tried to break the four rules that Phase 0 says are fatal and could not: every mutation is a single statement (`artifacts.ts:38`, `observations.ts:25`, `analyses.ts:98/163`, `retention.ts:115-195`), every statement is prepared inside its write, no `last_insert_rowid()` or `RETURNING` appears anywhere, no module-level promise or statement exists, the only multi-statement `exec` is `IF NOT EXISTS` DDL, and `onInterceptResponse`'s path (`passive.ts:120-176` → `admit.ts:158-199`) contains no `await`, no `toRaw()`, no `toText()` and no regex. Offsets and digests derive from `toRaw()` bytes only (`consumer.ts:173-183`, `digest.ts:24`). The DIST-05 gate has a real, executed failing path.

The defects are concentrated where the phase's own guarantees meet their failure branches, and they share one shape: **a failure mode is caught, downgraded to a log line nobody will read, and the test that covers it asserts the downgrade rather than the guarantee.**

- CORE-09's entire epoch mechanism is disarmed if one SDK call throws, and the resulting behaviour — writing project A's rows while the operator works in project B — is enshrined by a passing test (`CR-01`).
- The retention pass's documented bound is false. I ran it: one pass deleted **3001 rows against a cap of 512** and reported `examined: 1`. The spec that asserts the cap uses a fixture in which the cap cannot be exceeded (`WR-01`).
- The T-01-26 URL redaction that plan 01-05 added covers one of the two strings `getStatus()` returns; the other still goes through raw `String(e)` (`WR-03`).
- The convergence arithmetic behind `ROWS_INSERTED_PER_ARTIFACT_MAX = 3` is correct for the rows, and wrong about the *interval*: two of the three rows can be inserted on iterations that never advance the sweep counter (`WR-04`).
- `resetDbHandle()` is a no-op in production and the test asserting otherwise never exercises the production path (`WR-02`).

`3` is a true worst case per **fully processed** artifact — I traced every insert reachable from one `handleOne`: `upsertArtifact` (≤1), `recordObservation` (≤1), `claimAnalysis` (≤1); `finishAnalysis` is an `UPDATE` on the same key and `putSetting` is unreachable from the consumer. No fourth insert exists. The convergence problem is the denominator, not the numerator.

Both `BEFORE INSERT` triggers (`migrations.ts:122-129`) do fire on the upsert paths — SQLite evaluates `BEFORE INSERT` before conflict resolution — and `schema.spec.ts:242-277` proves it against a real engine per table.

---

## Critical Issues

### CR-01: A failed `onProjectChange` registration silently converts the plugin into a cross-project writer

**File:** `packages/backend/src/lifecycle.ts:269-279` (with `packages/backend/src/index.ts:232-277`)
**Severity:** BLOCKER

**Issue:** `installLifecycle` catches a throw from `sdk.events.onProjectChange(...)`, logs it, and **resolves normally**. `init()` then proceeds exactly as if isolation were installed: it starts the consumer, sets `setPassiveReady(true)` and registers `onInterceptResponse` (`index.ts:240-277`).

Trace the state that leaves behind. `activeProjectId` is pinned to whatever `getCurrent()` returned at boot, so `admissionAllowed()` (`lifecycle.ts:154`) stays `true` forever. `epoch` (`lifecycle.ts:114`) can never be incremented, so `stillCurrent()` in `consumer.ts:288-289` is a constant `true` and **every one of the six CORE-09 re-checks added at `consumer.ts:331, 347, 381, 408, 478` becomes inert**. The operator switches from client A to client B; the proxy keeps delivering B's responses; the hook admits them; `deps.getProjectId()` returns A; `upsertArtifact` and `recordObservation` write B's bundles and B's URLs keyed on **project A**. `getArtifacts`/`getObservations` (`index.ts:262-271`) then return A's project id filter, so the operator working in B sees A's data and B's traffic is silently filed under A.

That is precisely the failure the phase's own threat table calls Information Disclosure ("Cross-project data leakage through the plugin-global DB") and the one CORE-09 exists to prevent. The trigger is a rare SDK failure rather than attacker input — but the guard's whole purpose is to hold when something unexpected happens, and here the unexpected thing removes the guard while leaving the pipeline running.

The comment at `lifecycle.ts:270-273` argues "a plugin that cannot notice a switch is still useful for the project it resolved" — that is only true if the plugin *stops* when the project it resolved stops being current, which is exactly what it cannot detect. `lifecycle.spec.ts:507-518` locks the current behaviour in as correct, so this will not be found later either.

**Fix:** treat registration failure the same way `checkCompat` treats a missing surface — refuse to ingest, and say so.

```ts
// lifecycle.ts — installLifecycle
let projectChangeArmed = true;
try {
  sdk.events.onProjectChange(/* … */);
} catch (e) {
  projectChangeArmed = false;
  // Isolation is not optional: with no change notification the active id can
  // silently become the WRONG id, and every epoch guard downstream is inert.
  activeProjectId = null;          // admissionAllowed() -> false
  controller.aborted = true;
  log("onProjectChange could not be registered (" + String(e).slice(0, 120) +
      ") — ingestion is DISABLED because project isolation cannot be maintained");
}
return { ...summary, projectChangeArmed };
```

and in `index.ts`, if `projectChangeArmed === false`, do not register `onInterceptResponse`, set `compatReason` to the same sentence, and surface it on `getStatus()` (the refusal path at `index.ts:141-155` already has the shape). Then change `lifecycle.spec.ts:507` to assert the refusal, and add a case proving no row is written under the stale id after a change the plugin never saw.

**RESOLVED** — `910c382`, as suggested. `installLifecycle` returns `LifecycleInstallation` carrying `projectChangeArmed`; the catch sets `activeProjectId = null`, aborts the current token, and reports `next: null` so the summary says where the plugin actually ended up. `init()` gained step 5b, refusing exactly as step 1 does: no consumer, no ready latch, no `onInterceptResponse`, `ISOLATION_UNAVAILABLE_REASON` on `getStatus()`. `lifecycle.spec.ts` now asserts the refusal, and a second case drives the real `init()` end to end — registration fails, a response arrives, and all four row counts under both project ids are zero. Restoring the old catch body fails both (`expected true to be false`, `expected 1 to be +0`).

---

## Warnings

### WR-01: One retention pass can delete 6× its documented cap, and the spec that checks the cap cannot fail

**File:** `packages/backend/src/store/retention.ts:53-58, 280-296` (spec: `packages/backend/src/store/retention.spec.ts:278-315`)

**Issue:** `RetentionSweepSummary`'s contract says `deleted` "is never greater than `RETENTION_SWEEP_MAX_ROWS`". It is not true. The victim loop checks `budget()` once per **artifact** and then issues three deletes, two of which are unbounded row-count statements: `DELETE FROM observations WHERE project_id = ? AND sha256 = ?` removes *every* sighting of that digest. A single artifact re-served 3000 times costs 3001 rows in one pass.

Executed, not argued — a throwaway spec against the real fixture (one artifact, 3000 observations, age bound binding):

```
CAP 512 DELETED 3001 EXAMINED 1 MORE false
AssertionError: expected 3001 to be less than or equal to 512
```

Two consequences beyond the broken doc comment. (1) `examined` counts artifact rows, so the summary reported `examined: 1` for 3001 deletions — `counters.retentionDeleted` and the "deleted N of M examined" log line (`consumer.ts:261-267`) are incoherent. (2) `deleted` overshooting drives `budget()` negative, which skips the orphan sweeps and both child-table trims (`retention.ts:299, 319, 340, 360`) for the rest of that pass, so a project with a few heavily re-served bundles trims its other tables only every `RETENTION_SWEEP_EVERY_N` artifacts.

The existing assertion cannot detect this: `retention.spec.ts:283-287` seeds exactly one observation per artifact, so the maximum possible overshoot in that fixture is one row. `thresholds.spec.ts:204-212` likewise asserts a constant (`RETENTION_SWEEP_MAX_ROWS <= 1024`), not the behaviour.

**Fix:** either bound the cascade or stop claiming it is bounded. Bounding is cheap — delete the children by key, in pages, using the already-written `DELETE_OBSERVATION_SQL` / `DELETE_ANALYSIS_SQL` and the existing candidate selects:

```ts
// count the children first so `examined` is honest and the budget is real
const kids = await listObservationKeys(db, projectId, sha256, budget());
for (const k of kids) { if (budget() <= 0) { moreWork = true; break; } deleted += await deleteOne(db, DELETE_OBSERVATION_SQL, [projectId, sha256, k]); }
// only delete the artifact once it has no children left
```

and add the failing fixture above to `retention.spec.ts` so the assertion can actually fail.

**RESOLVED** — `7a5aa5c`. The cascade enumerates child KEYS oldest-first within the remaining budget (`OBSERVATION_KEYS_FOR_DIGEST_SQL`, `ANALYSIS_KEYS_FOR_DIGEST_SQL`) and removes each with the fully-bound single-row delete the orphan and per-table sweeps already used, so the pass is bounded whatever the data's shape. The artifact row goes last and only when the enumeration proves nothing of its is left — completeness decided by whether the LIMIT was reached, not by the loop's bookkeeping — so a capped cascade defers instead of orphaning. `examined` counts those children, so `deleted N of 1 examined` is no longer expressible. The new spec seeds a 1536-row fan-out on one digest and reports `expected 1538 to be less than or equal to 512` against the old cascade.

### WR-02: `resetDbHandle()` never affects production, and the spec that "proves" it does never runs the production path

**File:** `packages/backend/src/store/db.ts:40-42`, `packages/backend/src/lifecycle.ts:205-209`, `packages/backend/src/index.ts:162` (spec: `packages/backend/src/lifecycle.spec.ts:295-320`)

**Issue:** `index.ts:162` does `db = await getDb(sdk)` **once** and hands that object to `startConsumer({ db })` and to both read RPCs. Nothing calls `getDb()` again for the lifetime of the plugin. So when `applyProjectChange` calls `resetDbHandle()`, it clears a memo no one will ever consult, and the comment above it — "The next write re-resolves the handle" (`lifecycle.ts:206`) — is false.

The test asserts the memo, not the plugin: it calls `getDb()` by hand before and after the change and counts `meta.db()` invocations. Its failure message ("the next write would go through a handle resolved while the previous project was selected") describes a production property that holds neither before nor after the change.

This is benign *today* — `sdk.meta.db()` is one plugin-global database, so reusing the handle is arguably right — which is exactly why it is dangerous: a later phase that adds a genuine per-change reset requirement will read this code, the comment and the green test, and conclude the mechanism works.

**Fix:** pick one and make the test match it. Either (a) delete `resetDbHandle()` and its call, and record in `db.ts` that one pooled handle spans every project by design; or (b) make the consumer and the RPCs resolve through `getDb(sdk)` at each use so the reset means something, and rewrite the spec to drive `handleOne` across a change and count `meta.db()` calls made by production code.

**RESOLVED** — `0c27fbf`, option (a). The production reset and the injected `resetDb` dep are gone; `db.ts` records that one pooled handle spans every project by design and why (the same file is open whichever project is selected, so isolation is `project_id` in the key and cannot be a fresh connection), including what the old claim cost. What remains is a test seam named like the other three, `resetDbHandleForTest`. Both specs now assert the design in force: a change does NOT re-resolve the handle (re-adding a reset gives `expected 2 to be 1`), and a second case drives the real consumer across a change through the handle `init()` resolved, proving both projects' rows land apart through one pool.

### WR-03: The `getStatus` RPC still returns one unredacted `String(e)`

**File:** `packages/backend/src/index.ts:283` (also `:215`), reaching the RPC via `index.ts:99` / `:286`

**Issue:** Plan 01-05 fixed the URL leak by routing error text through `describeError()`, which redacts before truncating (`telemetry.ts:236-259`). `init()`'s outer catch does not use it:

```ts
compatReason = "init failed: " + String(e).slice(0, 160);   // index.ts:283
```

`compatReason` is returned as `reason` by `status()` (`index.ts:99`) on every `getStatus()` call. So the RPC payload carries one string that is redacted and one that is not, and truncation happens on the raw text — the same "truncate first, keep the host" ordering that plan 01-05 explicitly fixed one file away.

`telemetry.spec.ts`'s recursive walk (the thing that found the original leak) only inspects `slimStatus()`, so it structurally cannot see `reason`. Init-stage errors are unlikely to carry a target URL, but they routinely carry the SQLite file path from `sdk.meta.path()` — server-side path disclosure that DEPLOY-02 says must not be presented to the operator as if it were their own machine.

**Fix:**

```ts
import { describeError } from "./telemetry";
compatReason = "init failed: " + describeError(e);
```

Apply the same at `index.ts:215` and at the `log(... String(e) ...)` sites in `consumer.ts:274, 529, 566` and `lifecycle.ts:251, 276` — the host log is also a channel the threat model says must not carry target-controlled content. Then extend the recursive walk in `telemetry.spec.ts` to the object `getStatus()` actually returns, not to `slimStatus()` alone.

**RESOLVED (PARTIALLY — see WR-12)** — `9927a76` (the two `lifecycle.ts` sites came with CR-01 in `910c382`). All seven named call sites now go through `describeError`. `telemetry.spec.ts`'s recursive walk was rooted at `slimStatus()` and therefore structurally blind to `reason`; it now also walks the object the registered `getStatus()` RPC returns, driven through the real `init()` with a `meta.db()` rejection carrying a token-bearing URL. Restoring `String(e).slice(0, 160)` fails it. **The SQLite-path half of this finding's own stated rationale is NOT delivered** — `describeError` redacts only `scheme://…` substrings, so `sdk.meta.path()` still crosses the RPC in full. That residual is now tracked as `WR-12`.

### WR-04: Rows are inserted on iterations that never advance the retention cadence

**File:** `packages/backend/src/ingest/consumer.ts:381-412` vs `:444-445`

**Issue:** `processedForSweep += 1` is the last statement of `handleOne`, reached only on the full-success path. But `handleOne` inserts before that point and can return early after inserting:

- return at `:381-385` (project changed before the observation write) — **1 row already inserted** (`artifacts`).
- return at `:408-412` (project changed before the analysis block) — **2 rows already inserted** (`artifacts`, `observations`).

The convergence inequality asserted in `thresholds.spec.ts:189-202` reads `RETENTION_SWEEP_MAX_ROWS >= ROWS_INSERTED_PER_ARTIFACT_MAX * RETENTION_SWEEP_EVERY_N`, where the right-hand side is "rows inserted per sweep interval". That equality only holds if every row-inserting iteration advances the interval counter. Under sustained project churn (each iteration abandoned mid-way), rows accumulate while `processedForSweep` stays frozen and — because `sweptSinceStart` is already `true` — no sweep is scheduled at all.

The consumer's own tests cannot see it: every cadence case (`consumer.spec.ts:699-739`) feeds fully-processed entries.

**Fix:** count the interval on rows written, not on iterations completed. The minimal version is to move the increment to the point the first row lands:

```ts
const a = await upsertArtifact(/* … */);
processedForSweep += 1;            // the interval counts WRITES, not completions
```

and add a consumer case that abandons every iteration after the artifact write and asserts a sweep still fires at the cadence boundary.

**RESOLVED** — `c58bad7`, as suggested: the increment now sits at the point the first row lands, with the reasoning stated where it is. The new consumer case switches project during EVERY artifact write — a fixture `Database` whose `prepare` wraps the artifact upsert and bumps the epoch the instant it returns — so all 128 iterations insert and then abandon. With the counter back on the completion path it reports `1 sweeps after 128 rows were inserted … expected 1 to be 2`.

### WR-05: A cancelled or failed walk strands the analysis row at `pending`, and the next sighting is counted as a cache hit

**File:** `packages/backend/src/ingest/consumer.ts:423-441`, `packages/backend/src/store/analyses.ts:71-75, 138-158`

**Issue:** `claimAnalysis` inserts `scan_state='pending'`. If anything between the claim and `finishAnalysis` fails — `walk` throwing `Cancelled` because a project change aborted the signal (`pipeline.ts:152-153`), the `stillCurrent()` return at `consumer.ts:478-482`, or a rejected `finishAnalysis` — the row stays `pending`.

On the next sighting of the same bytes: `isAnalysed` returns `false` (`pending` is not terminal), `claimAnalysis` hits `DO NOTHING` and reads back the *old* `started_at`, so `claimed` is `false`, and control lands in the `else` at `consumer.ts:436-441`, which increments **`analysisCacheHit`**. The artifact is therefore never analysed again at this corpus version — not on the next sighting, not after a plugin restart — until the row ages out of retention at 90 days. And the only counter that moves says "cache hit", so the health surface reports the stuck artifact as a *success*.

Reconciliation is legitimately ERR-02/Phase 2. Mislabelling it as a cache hit is not: it makes the Phase 2 work undiscoverable and corrupts the CORE-08 hit-rate number that Phase 1 exists to start measuring.

**Fix:** give the non-terminal conflict its own counter now (`analysisPendingElsewhere` or similar), so `analysisCacheHit` continues to mean "already analysed":

```ts
} else if (claim.state === "pending" || claim.state === "running") {
  c.analysisStale++;      // a claim nobody finished — ERR-02 reconciles this in Phase 2
} else {
  c.analysisCacheHit++;
}
```

**RESOLVED** — `e19b73e`. New counter `analysisStale`, with the branch decided against `TERMINAL_SCAN_STATES` rather than a second hand-written state list — a state added to one list and not the other is exactly how a non-terminal row starts reporting as a completed one — and a log line naming ERR-02 as the owner of the reconciliation. A vanished row (`state === undefined`, which retention can legitimately cause) counts as stale too, not as a hit. Two cases: a walk cancelled mid-flight followed by a re-serve of the same bytes (`expected 1 to be +0` when the branch is neutered), and a non-vacuity case proving CORE-08's real skip still counts as a hit.

### WR-06: A second `startConsumer` silently orphans the queue the hook was just rebound to

**File:** `packages/backend/src/ingest/consumer.ts:212-217` with `packages/backend/src/index.ts:231-258`

**Issue:** `startConsumer` returns the existing handle when `current !== undefined`, discarding the new `deps` entirely — including `queue` and `db`. But `init()` constructs a **fresh** `BoundedQueue` at `index.ts:231` and calls `configurePassive({ queue, … })` at `:241` *before* `startConsumer` at `:242`. So on a second `init()` in the same runtime the hook feeds queue #2 while the surviving consumer drains queue #1, which nothing fills. Observable result: the plugin looks healthy, `admitted` climbs, `queueDepth` climbs to `QUEUE_CAP`, `queueOverflowCount` climbs, and `processed` never moves again. A second `onInterceptResponse` registration is also added, double-counting every response.

The file's own comment names re-init and hot reload as the realistic trigger, so this path is anticipated — only half of it is handled.

**Fix:** make the double-start loud and consistent rather than partially silent.

```ts
if (current !== undefined) {
  log("consumer already running; stopping it and rebinding to the new queue/db");
  current.stop();          // …then fall through and start with the NEW deps
}
```

or, if a second start must be a no-op, have `init()` detect it and skip `configurePassive` and the hook registration too.

**RESOLVED** — `2966662`, the first option: a second start stops the running loop and starts with the new deps, so there is still exactly one loop (the stop precedes the start) and the producer and consumer cannot end up on different queues. The existing "starting twice reloads 10 times, not 20" case keeps its claim and now asserts the rebind; a new case fills a second queue and proves it gets drained — `expected +0 to be 4` against the old behaviour.

### WR-07: `observations.url` persists query strings verbatim, in a database that outlives the project and the install

**File:** `packages/backend/src/store/observations.ts:32-41`, `packages/backend/src/store/migrations.ts:57-66`, exposed by `packages/backend/src/index.ts:267-271`

**Issue:** `normaliseObservedUrl` strips the fragment and keeps the query, deliberately. That means a signed URL or a token-bearing bundle URL — `https://cdn.example/app.js?access_token=…`, `…?X-Amz-Signature=…` — is written to SQLite in full (up to 2048 chars) and returned over the `getObservations` RPC.

This is a documented decision, and the retained query genuinely matters for the cache-hit measurement. But it directly contradicts the mitigation the phase claims elsewhere and never reconciles: `schema.spec.ts:36-40` says "a stolen copy of the plugin database must be a list of URLs, digests and byte counts, **not a credential dump**", and `01-RESEARCH.md`'s threat table says "Phase 1 creates no column that can hold a secret. Enforce by *absence*." A query string is a column that can hold a secret. The asymmetry is stark: `telemetry.ts:236` redacts URLs out of a 240-character error string because they "often carry a session token in the query", while the same value is stored unbounded-in-time one module away — in a file `db.ts:3-6` notes is never GC'd, survives project deletion, and survives force-reinstall.

**Fix:** decide it explicitly rather than by inheritance. The cheapest option that keeps the cache measurement intact is to store the query's *identity* rather than its content — e.g. keep the path and a digest of the sorted query keys+values — and to record the tradeoff in `schema.spec.ts`'s allowlist comment either way. If the raw query is kept, the comment claiming "not a credential dump" must be corrected, and DIST-02's disclosure needs to say the plugin database retains full request URLs for 90 days by default.

**DISPOSITION UPDATED 2026-08-21 (pass 2) — acted on, NOT closed.** The initial disposition was "deferred, the operator's call to make". The operator made it at plan 01-07's UAT checkpoint (redact values, keep names) and `f0fb3c6` implemented `redactQueryValues`. The `?name=value` half of this finding is genuinely fixed and proven end to end by `scripts/phase1/tracer-e2e.sh`. **The finding does not close, because the contradiction it named is still live:** `schema.spec.ts:39-46` now asserts in prose that "THAT CLAIM WAS FALSE UNTIL 2026-08-21 AND IS NOW TRUE", and it is not — a bare query parameter under 64 characters, a matrix parameter after `;`, a path-embedded token and URL userinfo all still reach the column byte-for-byte. See `CR-06` and `WR-11`, which carry the executed counterexamples.

### WR-08: The SQL discipline gate audits one directory, while its header claims it audits every call site

**File:** `packages/backend/src/store/sql-discipline.spec.ts:31-39`

**Issue:** `storeFiles()` reads `packages/backend/src/store` non-recursively and filters to non-spec `.ts`. Every rule in the file — named parameters, array binds, `exec` arity, unscoped multi-row statements, module-scope `prepare`, interpolated SQL — is therefore enforced **only** for files that sit directly in `store/`. SQL written anywhere else in the backend is ungated, and there is already one such statement: `index.ts:210`, `await db.prepare("SELECT 1")`.

The header says the opposite: "reading the SOURCE catches every call site including the ones written next year". A future `hooks/` or `ingest/` query, or a `store/reads/` subdirectory, inherits none of this.

**Fix:** walk the package, not the directory, and keep the explicit non-vacuity list:

```ts
function backendFiles(): string[] {
  return globSync("packages/backend/src/**/*.ts").filter((f) => !f.endsWith(".spec.ts")).sort();
}
```

The existing "enumerates a NON-EMPTY set" test already guards against the glob silently matching nothing; extend its expected-name list to cover `index.ts` so a rename is still visible.

**RESOLVED** — `49250aa`. A recursive walk over the package (`readdirSync` with `withFileTypes`, no new dependency) rather than a glob. The non-vacuity list gains `index.ts`, `lifecycle.ts`, `telemetry.ts`, `consumer.ts`, `passive.ts`, `admit.ts` and `compat.ts`, plus one assertion that the walk really descended and one that `index.ts` contributes SQL — otherwise the widening buys nothing measurable. Verified by planting a named-parameter, unscoped `SELECT` in `hooks/passive.ts`: the widened gate reports both violations, the directory-scoped one saw neither.

### WR-09: Retention failures are discarded with no counter, no log and no error record

**File:** `packages/backend/src/store/retention.ts:386-392, 477-484`

**Issue:** Two swallows on the same path. `deleteOne` returns `0` on any rejection with an empty `catch {}`, and `sweepRetention`'s outer handler does `void e; moreWork = true;` — the error object is explicitly discarded, not recorded. The caller (`consumer.ts:248-276`) only increments `retentionSweeps`/`retentionDeleted` and logs when `moreWork` is set.

So a sweep that fails on every row for a structural reason — a locked database, a schema the migration ladder left partial (`index.ts:168-181` explicitly allows the plugin to run on) — produces: `retentionSweeps` climbing, `retentionDeleted` stuck at 0, no `lastError`, no `storeErrors`, and a log line saying "more remains for the next cadence boundary" forever. Retention is stated three times in this file to be *the only bound* on the database's growth, and its failure is the one thing nothing reports. On a runtime whose own measured behaviour is `HANDLER_ERROR_SURFACED = "neither"`, discarding the error is discarding the only record that will ever exist.

**Fix:** count and record. `deleteOne` should return `{deleted, error}` or take an `onError` callback; `sweepRetention` should carry `errors: number` (or a `lastError` string) on `RetentionSweepSummary`; and `runRetentionPass` should feed both into `counters.storeErrors` and `recordError`. Add a spec case with a delete statement that always rejects, asserting the counter moves.

**RESOLVED** — `15509d4`, as suggested. `deleteOne` returns `{deleted, error}` so "the delete failed" and "there was nothing to delete" stop being the same value; `RetentionSweepSummary` carries `errors` and `lastError`; every delete on the path goes through one recording closure, so none can fail uncounted; the outer handler records instead of `void e`; and `runRetentionPass` feeds both into `counters.storeErrors` and `recordError` with a `RETENTION_DELETE_FAILED` line. Three cases: a fixture where every DELETE rejects (summary), the same through the running consumer (counter and `lastError`), and a working pass asserting `errors` is 0 so the counter is not always-on. Dropping the recording fails two with `expected 0 to be greater than 0`.

### WR-10: `checkCompat` and the refusal-path RPC registrations run outside `init()`'s try/catch

**File:** `packages/backend/src/index.ts:134-155` (guard starts at `:159`)

**Issue:** The comment block at the top of the file says the catch exists because "an init failure that is not caught here is completely invisible". Four statements sit outside it: `checkCompat(sdk)` (`:138`), the version read (`:139-140`), and the two `sdk.api.register` calls on the refusal path (`:149`, `:153`). `checkCompat` walks `sdk` with property access (`compat.ts:129-136`) — a throwing accessor, a revoked proxy, or an `api.register` that rejects a duplicate name on the refusal path, all escape `init()` into a runtime that logs nothing. The plugin then has no hook, no RPC and no log line: the exact "obscure failure" COMPAT-01 forbids.

**Fix:** move `try {` above line 138 and keep the existing catch, which already sets `compatible = false` and re-registers `getStatus` defensively.

**RESOLVED** — `992bada`, as suggested. `caidoVersion` moved above the `try` because the catch reports it. New `packages/backend/src/index.spec.ts` drives the real `init()` against a throwing `sdk.runtime` accessor (`promise rejected … instead of resolving` with the old boundary), an `api.register` that throws on the refusal path, and a plain below-minimum refusal — the last one proving the widened `try` did not turn an ordinary refusal into "init failed".

---

## Info

_All seven left OPEN: informational, out of scope for the review-fix pass. IN-03 is now partly overtaken — `resetDbHandle` was renamed to `resetDbHandleForTest` and its `@public` tag and knip.json note removed by WR-02's fix — but the rest of that entry, and IN-01/02/04/05/06/07, stand as written._

### IN-01: Production-dead exports kept alive only by their own specs

`telemetry.ts:298 measured()` and `telemetry.ts:279 Mark<T>` have no consumer outside `telemetry.spec.ts`; `queue.ts:85 BoundedQueue.drain(n)` likewise (the consumer and lifecycle both use `take()`). knip cannot see either — spec files are declared entries, and it does not analyse class members. Either wire them or delete them before Phase 2 inherits three seams with no owner.

### IN-02: `isScriptish` matches `module` and `text/js` as bare substrings

`admit.ts:80-105` accepts any content type containing `module`, so `multipart/form-data; boundary=module…` is admitted as JS. Harmless today (the cost is one wasted hash), but it inflates the `admitted` counter that Phase 2's ratios are computed against. Anchor on the type/subtype rather than the whole header value.

### IN-03: The `@public` justification on `resetDbHandle` is stale

`db.ts:28-38` and `knip.json`'s comment both describe `resetDbHandle` as "the ONE export left with no consumer… named for plan 01-05 one wave away". Plan 01-05 landed: `lifecycle.ts:55` imports it. The tag and both comments now misdescribe the code (and see WR-02 for what the consumer actually achieves).

### IN-04: `status()` sets `caidoVersion: null` and every caller overwrites it

`index.ts:101` emits the field, and all four call sites spread `{...status(), caidoVersion}` over it (`:149, :224, :260, :286`). Dead assignment; drop it from `status()` and pass the value in.

### IN-05: The retention cadence re-fires when an early-returning iteration follows a boundary

`consumer.ts:540-543` computes `due` from `processedForSweep % RETENTION_SWEEP_EVERY_N === 0`, and `processedForSweep` does not advance on iterations that return early. At exactly 128, any run of `reloadMissing`/`reloadNoResponse` entries triggers one full sweep (≈10 statements) per entry. Guard with a `lastSweptAt` marker instead of a modulo on a value that can stall.

### IN-06: `pnpm test` can shell out to a full plugin build

`scripts/ci/check-bundle-imports.spec.ts:58-72` runs `pnpm exec caido-dev build packages` when the bundle is absent, then asserts `expect(true).toBe(true)`. A test that mutates `dist/` as a side effect will surprise whoever first runs the suite on a clean checkout; make it a `globalSetup` or a documented prerequisite, and drop the tautological assertion.

### IN-07: `claimAnalysis` decides ownership by millisecond-equal `started_at`

`analyses.ts:152` treats `Number(row.started_at) === startedAt` as "I inserted this row". It is safe today only because one sequential drain loop cannot claim the same `(project, sha256, corpus)` twice inside one millisecond. Two consumers, a coarser clock, or a future retry that reuses a captured `now` would each make two callers believe they own the same claim, and both would walk and both would `finishAnalysis`. Worth a comment stating the precondition, since CORE-04 is the only thing holding it up.

---
---

# --- PASS 2 --- Gap-Closure Review (plans 01-07, 01-08, 01-09)

**Reviewed:** 2026-08-21T11:21:31Z
**Depth:** standard
**Files Reviewed:** 13 (the files plans 01-07/01-08/01-09 changed after the pass-1 review)
**Status:** issues_found — 5 BLOCKER, 6 WARNING, 6 INFO

## Summary (pass 2)

Two things were shipped as guarantees, and neither one is as strong as its own
header says. Both hold against the shape the author had in mind and fail against
the neighbouring shape.

**Every finding below was executed, not reasoned about.** I imported
`auditSource` from both new gates and `normaliseObservedUrl` from
`observations.ts` into a throwaway spec and ran twenty-plus candidate bypasses
through them. The outputs are pasted verbatim in each finding. The three new
spec files pass (68 tests), and `pnpm typecheck`, `pnpm lint` and `pnpm knip` are
all clean — none of which can see any of this.

**CORE-01's gate (`outbound-prohibition.spec.ts`) is bypassable by twelve of the
twenty shapes I tried, several of which are the *idiomatic* way to write the
call.** `outbound-fetch` only matches a callee that is the bare identifier
`fetch`, so `globalThis.fetch(url)` — the form this very package already uses for
`globalThis.performance` at `telemetry.ts:287` — reports zero violations.
`outbound-send`/`outbound-net` resolve the receiver only through a
`VariableDeclaration` whose initializer is a `requests`/`net` property access, so
`const { requests } = sdk; requests.send(req)` reports zero, as do `.call`,
`.apply`, `Reflect.apply`, a computed key, and a plain `r = sdk.requests`
assignment. And the walk stops at `packages/backend/src` while
`packages/engine/src` — imported by `index.ts`, `consumer.ts` and `lifecycle.ts`,
and therefore *in the shipped bundle* — is never opened at all.

The header does disclose one boundary ("an alias rebound in an inner scope is
outside its reach"). None of the above is an inner-scope rebind. A gate whose
stated rule is "no non-spec module may reach an outbound network surface" and
whose actual rule is "no module may write four specific spellings" is worse than
no gate, because `COVERAGE.md` rows 9, 27 and 38 now cite it as their enforcement
(commit `7e96db9`).

**`error-redaction.spec.ts` cannot see `e.message`.** Rules 1-3 fire only when
the caught binding appears as a *bare identifier* inside `String(…)`, a template
span, or a `+` operand. `return e.message`, `"failed: " + e.message`,
`` `failed: ${e.message}` ``, `String(e.message)`, `e.toString()`,
`JSON.stringify(e)`, `String(e as Error)` and `const x = e; String(x)` all report
zero. `e.message` is the single most common way to render an error, and under
`useUnknownInCatchVariables` the cast forms are the only ones TypeScript permits
for anything richer than `String(e)` — so the gate is blind to precisely the
shapes a future author will reach for.

**The write-path redaction is scoped to the `?…&…=` grammar and nothing else.**
`redactQueryValues` is correct for what it covers, and the tracer's live proof
against the real database file is good work. But four credential-bearing URL
shapes reach `observations.url` byte-for-byte, confirmed by execution:

```
"https://cdn.test/a.js?ghp_0123456789abcdefghij1234567890abcdefgh"
  -> "https://cdn.test/a.js?ghp_0123456789abcdefghij1234567890abcdefgh"
"https://cdn.test/a.js;jsessionid=SECRETSESSION"
  -> "https://cdn.test/a.js;jsessionid=SECRETSESSION"
"https://user:pa55w0rd@cdn.test/app.js"
  -> "https://user:pa55w0rd@cdn.test/app.js"
"https://cdn.test/download/eyJhbGciOiJIUzI1NiJ9SECRET/app.js"
  -> "https://cdn.test/download/eyJhbGciOiJIUzI1NiJ9SECRET/app.js"
```

`QUERY_NAME_MAX = 64` is named in the source as the thing that "closes the
bare-token hole" (`observations.ts:57-62`). It does not: a GitHub PAT is 40
characters, an AWS access key id is 20, a Stripe secret key is ~32, a session id
is typically 26-32. Every one of them is under the bound and survives whole. The
spec exercises only a name *longer* than 64 (`observations.spec.ts:128-140`), so
it cannot see this.

Meanwhile `schema.spec.ts:39-46` was rewritten in this same batch to assert, in
prose, "THAT CLAIM WAS FALSE UNTIL 2026-08-21 AND IS NOW TRUE". It is still
false. The honest version of that paragraph is what makes this a BLOCKER rather
than a WARNING: the code got better and the claim got stronger than the code.

Three smaller things are right and worth recording so nobody re-litigates them:
the `describeError` conversion introduces **no import cycle** (`telemetry.ts`
imports only `./hooks/admit`, which imports only `@defminer/engine/thresholds` —
verified, not taken on trust); `normaliseObservedUrl` **is** idempotent even when
`URL_MAX` truncation lands inside a `<redacted>` marker (I swept every boundary
from 2020 to 2048); and the `describeError(error)` call in `finishAnalysis`
behaves exactly as its comment says for a `string` input.

---

## Critical Issues (pass 2)

### CR-02: `outbound-fetch` matches only a bare-identifier callee — `globalThis.fetch(url)` reports zero violations

**File:** `packages/backend/src/outbound-prohibition.spec.ts:302-306`
**Severity:** BLOCKER

**Issue:** The rule fires in exactly one place:

```ts
if (ts.isIdentifier(callee)) {
  if (callee.text === FETCH_GLOBAL) { add("outbound-fetch", …); }
}
```

`callee` is an identifier only for `fetch(...)`. Every other spelling of the same
call has a non-identifier callee, or an identifier the walk never learned about.
Executed against `auditSource("f.ts", src)`:

```
globalThis.fetch             []      // await globalThis.fetch(url);
globalThis['fetch']          []      // await globalThis["fetch"](url);
fetch alias                  []      // const f = fetch; await f(url);
destructured fetch           []      // const { fetch: f2 } = globalThis; await f2(url);
```

This is not a theoretical spelling. `packages/backend/src/telemetry.ts:287-290`
already reaches a global through `globalThis` and casts it, because that is what
you do in a runtime where you cannot assume a bare global exists:

```ts
const p = (globalThis as { performance?: { now?: () => number } }).performance;
```

An author adding a fetch in Phase 8 — or accidentally, in a copied snippet —
writes `globalThis.fetch` for exactly the same reason, and the gate says nothing.
There is no backstop either: `scripts/ci/check-bundle-imports.mjs` inspects
import specifiers only, and a global `fetch` needs no import.

The header's `FORBIDDEN_OUTBOUND` entry describes the surface as "the global
`fetch()`" and its `why` as "the global fetch reaches any host". The rule
enforces "the identifier `fetch` in callee position".

**Fix:** treat `fetch` as a *name* wherever it appears in callee position, and
track the identifiers it can be bound to, the same way `sendAliases` already
does for `send`. Both the member form and the alias form are two more branches
in code that already exists:

```ts
// in `collect`, beside sendAliases:
//   const f = fetch;          -> fetchAliases.add("f")
//   const f = globalThis.fetch -> fetchAliases.add("f")
//   const { fetch: f } = globalThis -> fetchAliases.add("f")
const fetchAliases = new Set<string>([FETCH_GLOBAL]);

// in `visit`, replacing the identifier-only branch:
if (ts.isIdentifier(callee) && fetchAliases.has(callee.text)) {
  add("outbound-fetch", `a call to \`${callee.text}(...)\``);
}
const parts = calleeParts(callee);
if (parts !== undefined && parts.method === FETCH_GLOBAL && !isLocalObject(parts.receiver)) {
  // globalThis.fetch(...) / globalThis["fetch"](...) / self.fetch(...)
  add("outbound-fetch", `a \`${FETCH_GLOBAL}\` call on \`${parts.receiver.getText()}\``);
}
```

The existing false-positive case at `:485-489` (`cache.fetch(url)` must stay
quiet) is the one to preserve — restrict the member form to receivers named
`globalThis`, `self`, `global` and `window` rather than to any receiver. Then add
each of the four executed shapes above as a failing-path case beside the ones at
`:479-483`.

---

### CR-03: `outbound-send` and `outbound-net` miss five receiver forms, including the idiomatic destructure

**File:** `packages/backend/src/outbound-prohibition.spec.ts:206-219, 244-269, 316-332`
**Severity:** BLOCKER

**Issue:** `receiverKind` recognises an outbound receiver in three ways: a
property access named `requests`/`net`, an element access with a *string
literal* key, or an identifier previously recorded in `receiverAliases`. And
`receiverAliases` is populated only from a `VariableDeclaration` whose
initializer is itself one of those three. Everything outside that closure is
invisible. Executed:

```
destructured requests        []   // const { requests } = sdk; await requests.send(req);
net destructured             []   // const { net } = sdk; await net.connect(h, p);
assignment alias             []   // let r; r = sdk.requests; await r.send(req);
conditional receiver         []   // const r = flag ? sdk.requests : sdk.requests; await r.send(req);
send .call                   []   // await sdk.requests.send.call(sdk.requests, req);
send .apply                  []   // await sdk.requests.send.apply(sdk.requests, [req]);
Reflect.apply                []   // await Reflect.apply(sdk.requests.send, sdk.requests, [req]);
computed method              []   // const m = "send"; await sdk.requests[m](req);
computed receiver            []   // const r = "requests"; await sdk[r].send(req);
send returned from fn        []   // const g = () => sdk.requests.send; await g()(req);
```

`const { requests } = sdk;` is the shape that matters most. It is ordinary
TypeScript, it is what anyone writes when they touch `sdk.requests` more than
once in a function, and the gate already handles the *inner* destructure
(`const { send } = sdk.requests`) — so the omission reads as an oversight rather
than a boundary. The header's disclosed limitation is "an alias rebound in an
**inner scope**"; none of the ten shapes above is an inner-scope rebind, so a
reader who trusts the header is misled about the gate's actual reach.

Two narrower gaps in the same code:

- **`outbound-send` matches only the method name `send`.** `receiverKind` proves
  the receiver *is* `sdk.requests`; a future `sdk.requests.sendRaw(...)` or
  `sdk.requests.replay(...)` is outbound traffic on a receiver the gate has
  already positively identified, and it passes. `outbound-net` is written the
  other way — any method on a `net` receiver fires — so the two rules disagree
  about what a positively identified outbound receiver licenses.
- **A member access with a non-literal key defeats both rules**, because
  `calleeParts` returns `undefined` and the receiver is never even consulted.
  Returning `undefined` for a computed key means "I could not read this", and the
  gate treats "could not read" as "clean".

**Fix:** three changes, all local.

1. Populate `receiverAliases` from a binding pattern as well as an identifier:
   `const { requests, net } = sdk` should record both, keyed on the *property*
   name, exactly as the `send` destructure at `:251-264` already does.
2. Once a receiver is positively identified as `requests`, flag **any** call on
   it whose method is not on an explicit read-only allowlist
   (`get`, `query`, `inScope`, …) — the same posture `outbound-net` already
   takes. That preserves the load-bearing `sdk.requests.get(id)` case at `:445`
   and makes a new outbound method fail loudly instead of silently.
3. Flag, rather than ignore, a computed member access on a positively identified
   outbound receiver, and `.call`/`.apply`/`Reflect.apply` applied to a
   `requests`/`net` member expression. If flagging a dynamic key is judged too
   noisy, it must at minimum be *reported* as an unanalysable site rather than
   dropped.

Then add every executed shape above as a failing-path case, and rewrite header
boundary 2 to say what the walk actually resolves: a `const` bound directly to a
`requests`/`net` member expression, and nothing else.

---

### CR-04: `packages/engine/src` ships in the bundle and is entirely outside the gate's walk

**File:** `packages/backend/src/outbound-prohibition.spec.ts:77, 145-162`
**Severity:** BLOCKER

**Issue:** `BACKEND_SRC = "packages/backend/src"`, and `backendFiles()` walks that
and only that — 14 modules. But the shipped plugin also contains
`packages/engine/src`, imported by production code:

```
index.ts:41       import { BoundedQueue } from "@defminer/engine/queue";
index.ts:42       import { QUEUE_CAP } from "@defminer/engine/thresholds";
consumer.ts:38    import { sha256Hex } from "@defminer/engine/digest";
consumer.ts:43    from "@defminer/engine/pipeline";
consumer.ts:46    import { yieldToLoop } from "@defminer/engine/yield";
```

Seven engine modules (`pipeline.ts`, `decode.ts`, `chunker.ts`, `deadline.ts`,
`queue.ts`, `digest.ts`, `yield.ts`) are bundled into `packages/backend/dist` and
none is ever opened by this gate. `pipeline.ts` is the detector walk — the module
most likely to grow a "just fetch the sourcemap" line in a later phase, which is
the *literal* wording of CORE-01's "no speculative retrieval of any kind".

The gate's own doc comment argues for exactly the widening it did not do: "The
package, not a directory: `sdk.requests.send` needs no import, so the surface it
could appear on is **every module the plugin ships**". `packages/engine/src` is
every-module-the-plugin-ships too. And there is no compensating gate: a
`globalThis.fetch(url)` in `pipeline.ts` is invisible to
`check-bundle-imports.mjs` (imports only) and to `sql-discipline.spec.ts`
(backend only) as well.

**Fix:** walk both source roots and name an engine module in the non-vacuity
list, so a future package split is a visible failure:

```ts
const SOURCE_ROOTS = ["packages/backend/src", "packages/engine/src"];

function shippedFiles(): string[] {
  return SOURCE_ROOTS.flatMap((root) => walk(root)).sort();
}
```

and extend the by-name list at `:356-366` with `pipeline.ts`, `decode.ts` and
`queue.ts`. The `telemetry.ts` documentation case at `:393-405` stays as is.

---

### CR-05: The redaction gate cannot see `e.message` — the most common way to render an error

**File:** `packages/backend/src/store/error-redaction.spec.ts:86-88, 120-174`
**Severity:** BLOCKER

**Issue:** All three catch rules bottom out in `isRefTo(node, name)`, which is
`ts.isIdentifier(node) && node.text === name`. The binding must therefore appear
as a *bare identifier* — as `String(e)`, as `${e}`, or as an operand of `+`.
Reach through it, cast it, or copy it, and the rule is gone. Executed against
`auditSource("f.ts", src)`:

```
e.message returned           []   // catch(e){ return e.message; }
e.message concat             []   // catch(e){ return "x: " + e.message; }
e.message template           []   // catch(e){ return `x: ${e.message}`; }
String(e.message)            []   // catch(e){ return String(e.message); }
e.toString()                 []   // catch(e){ return e.toString(); }
JSON.stringify(e)            []   // catch(e){ return JSON.stringify(e); }
String(e as Error)           []   // catch(e){ return String(e as Error); }
`${e as any}`                []   // catch(e){ return `${e as any}`; }
reassign then String         []   // catch(e){ const x = e; return String(x); }
array join                   []   // catch(e){ return [e].join(""); }
```

`e.message` is not an exotic spelling — it is *the* spelling. And in this
codebase specifically, TypeScript types a catch binding as `unknown`, so anything
beyond `String(e)` requires a cast: `String(e as Error)` and
`(e as Error).message` are the forms the compiler pushes an author toward. The
gate is blind to both.

Rule 4 has the same shape and the same hole plus one more: it requires
`ts.isIdentifier(param.name)`, so
`function finishAnalysis({ error }: { error: string | null })` — a destructured
parameter — reports zero. Confirmed: `param destructured []`.

Why this is a BLOCKER rather than a WARNING. The gate's header states the rule as
"no module under `packages/backend/src/store/` renders an ERROR-SHAPED BINDING to
a string without passing it through `describeError` first", and `schema.spec.ts`
was rewritten in this same batch (`:62-70`) to justify keeping the
`analyses.error` column in the T-01-21 allowlist **on the strength of this
gate**. The column is durable for 90 days in a file `db.ts` documents as never
garbage-collected. Phase 2's ERR-02/ERR-04 authors — named in the comment as the
people who "will read the gate to learn what is already guaranteed" — will write
`error: (e as Error).message` and ship it green.

**Fix:** make `isRefTo` follow the binding rather than match it literally, and
invert the default for shapes the walk cannot analyse.

```ts
/** Does this expression DERIVE from `name`? Unwraps casts, parenthesisation,
 *  non-null assertions and member access, so `e`, `e as Error`, `(e)`,
 *  `e.message` and `(e as Error).message` are all the binding. */
function derivesFrom(node: ts.Node, name: string): boolean {
  let n: ts.Node = node;
  for (;;) {
    if (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) ||
        ts.isNonNullExpression(n) || ts.isTypeAssertionExpression(n)) { n = n.expression; continue; }
    if (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) { n = n.expression; continue; }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) { n = n.expression.expression; continue; }
    break;
  }
  return ts.isIdentifier(n) && n.text === name;
}
```

Swap `isRefTo` for `derivesFrom` in all three rules; that alone closes
`e.message`, `String(e.message)`, `e.toString()`, and every cast form. Then add a
fourth form to `scanFor` — the binding (or anything derived from it) appearing as
a *return value* or as an object-literal property value without passing through
`describeError` — and extend rule 4 to `ObjectBindingPattern` parameters. Add
every executed shape above as a failing-path case; the negative fixtures at
`:349-361` are what keeps the widened rule from becoming always-on.

---

### CR-06: A bare query parameter under 64 characters reaches `observations.url` verbatim, and `schema.spec.ts` now asserts that it cannot

**File:** `packages/backend/src/store/observations.ts:57-62, 96-101`; claim at `packages/backend/src/store/schema.spec.ts:39-46`
**Severity:** BLOCKER

**Issue:** A query segment with no `=` is treated as a NAME and kept, truncated
to `QUERY_NAME_MAX = 64`. The source names this as the mitigation:

> The bound on a RETAINED parameter name. A segment with no `=` is syntactically
> a name, so without this a token pasted as a bare parameter would survive
> verbatim under a values-only rule (T-01-31). Residual, named rather than left
> to be found: a secret shorter than this used as a bare parameter name still
> survives.

The residual is not a corner — it is most of the space. Executed through
`normaliseObservedUrl`:

```
"https://cdn.test/a.js?ghp_0123456789abcdefghij1234567890abcdefgh"
  -> "https://cdn.test/a.js?ghp_0123456789abcdefghij1234567890abcdefgh"
"https://cdn.test/a.js?sk_live_51H0000000000000000000000"
  -> "https://cdn.test/a.js?sk_live_51H0000000000000000000000"
```

A GitHub personal access token is 40 characters. An AWS access key id is 20. A
Stripe secret key is around 32. A PHP/Java session id is 26-32. A UUID is 36.
Every common credential format on the web is shorter than 64 and is therefore
written to the durable column whole. The bound only catches a JWT, and only its
tail.

The spec cannot see this. `observations.spec.ts:128-140` is the only case for the
bound and it exercises a name of `QUERY_NAME_MAX + 40` characters — a name
*longer* than the bound, which is the one length at which truncation is visible.
No case in the file, and no assertion in `scripts/phase1/tracer-e2e.sh`, uses a
bare parameter shorter than 64.

What makes this a BLOCKER rather than a documented residual is what landed
alongside it. `schema.spec.ts:39-46` was rewritten in the same batch to say:

> THAT CLAIM WAS FALSE UNTIL 2026-08-21 AND IS NOW TRUE, which is worth saying
> here rather than quietly editing. … The code changed (plan 01-07,
> `normaliseObservedUrl` -> `redactQueryValues`), so the claim stands.

and the claim it now backs is that "nothing below can hold a response body, a
cookie or **an authorization token**". A 40-character PAT sitting in
`observations.url` is an authorization token in a column the paragraph says
cannot hold one. The T-01-21 mitigation is documented as working by ABSENCE; the
absence is not there.

**Fix:** a bare segment is a *value with no name*, not a name. Redact it:

```ts
if (eq === -1) {
  // No `=`. Syntactically a name, semantically unknown — and an unknown segment
  // is exactly where a pasted token lands. Keep the SHAPE, drop the bytes.
  out.push(segment === "" ? "" : QUERY_VALUE_REDACTION);
  continue;
}
```

That keeps the parameter count, the order, and the empty-segment behaviour the
existing cases assert, and it costs one analytic signal the operator's decision
never actually asked for (the decision was "keep parameter NAMES"; a bare segment
has no name). If keeping bare segments is genuinely wanted, then
`QUERY_NAME_MAX` must come down to a length no credential fits in — 16 or less —
and `observations.spec.ts` must gain a case for a 40-character bare token
asserting it does not survive.

Either way `schema.spec.ts:39-46` must stop asserting the claim is TRUE until an
executed case proves it, and `observations.spec.ts` needs the case that can fail.

---

## Warnings (pass 2)

### WR-11: The redaction is scoped to the `?…&…=` grammar — `;` parameters, path tokens and userinfo reach the column verbatim

**File:** `packages/backend/src/store/observations.ts:87-112, 141-143`

**Issue:** `redactQueryValues` keys entirely off the first `?`. Anything
credential-bearing that a URL can carry outside that delimiter passes through
untouched. Executed:

```
"https://cdn.test/a.js;jsessionid=SECRETSESSION"
  -> "https://cdn.test/a.js;jsessionid=SECRETSESSION"
"https://user:pa55w0rd@cdn.test/app.js"
  -> "https://user:pa55w0rd@cdn.test/app.js"
"https://cdn.test/download/eyJhbGciOiJIUzI1NiJ9SECRET/app.js"
  -> "https://cdn.test/download/eyJhbGciOiJIUzI1NiJ9SECRET/app.js"
```

- `;jsessionid=` (and `;sid=`, `;phpsessid=`) is RFC 3986 path-parameter
  syntax and the classic session-token-in-URL shape that Java servlet URL
  rewriting still emits. `head` is kept verbatim, so it is stored whole.
- URL userinfo is HTTP Basic credentials in plaintext.
- Path-embedded tokens are how signed CDN and object-store URLs are commonly
  shaped when the signature is not in the query.

Note the interaction with the semicolon case that *is* covered: `?a=1;token=SECRET`
correctly becomes `?a=<redacted>` because the whole segment after the first `=`
is a value. The hole is only when the `;` appears before any `?`.

Separated from `CR-06` because the fix is different: `CR-06` is a one-line change
inside the existing loop, whereas this needs a decision about how much of the
non-query URL to keep at all.

**Fix:** at minimum, drop userinfo (there is no analytic value in it) and redact
after the first `;` in the path the same way the query is handled:

```ts
// userinfo: everything between "//" and the "@" that precedes the host.
// path parameters: same name/value rule as the query, on ";" instead of "&".
```

and record path-embedded secrets in the source as an accepted residual *with the
reason*, rather than leaving them unnamed. Add one case per shape to
`observations.spec.ts` and one to the tracer's raw-column assertion, so the
residual is a measured statement instead of a silence.

### WR-12: `describeError` redacts only scheme-prefixed URLs — filesystem paths and schemeless host+query strings pass through whole

**File:** `packages/backend/src/telemetry.ts:249-251`, relied on by all six store modules and by `schema.spec.ts:62-70`

**Issue:** `redactUrls` is `text.replace(/[a-z][a-z0-9+.-]*:\/\/\S*/gi, URL_REDACTION)`.
It requires a literal `://`. Executed through the real `describeError`:

```
"Error: SQLITE_CANTOPEN: unable to open database file '/Users/six2dez/Library/Application Support/io.caido.Caido/plugins/1a2b/data.db'"
"Error: failed loading //cdn.victim.example/app.js?token=SECRET"
"Error: failed loading cdn.victim.example/app.js?token=SECRET"
"Error: failed <url-redacted> and /Users/x/secret/path"        <- only the scheme'd one goes
```

Two consequences.

1. **`WR-03`'s own stated rationale is not delivered by `WR-03`'s fix.** That
   finding justified routing `init()`'s catch through `describeError` because
   init errors "routinely carry the SQLite file path from `sdk.meta.path()` —
   server-side path disclosure that DEPLOY-02 says must not be presented". The
   path — including the operator's OS username — still crosses the `getStatus`
   RPC in full. `WR-03` is marked fixed in the ledger above; the URL half is
   genuinely fixed, the path half is not.
2. **The `analyses.error` allowlist justification overstates.**
   `schema.spec.ts:62-70` now reads "rendered through `describeError` (which
   redacts URL-shaped substrings before truncating)". "URL-shaped" is not what
   the regex matches; it matches "absolute URL with an explicit scheme". A
   scheme-relative reference is URL-shaped and survives with its query intact.

The store layer specifically is not currently exposed to (2), because the URL
bound into every store statement is already `normaliseObservedUrl`'d — worth
saying, because it is the reason this is a WARNING and not a BLOCKER.

**Fix:** add a second, equally backtrack-free replacement for absolute
filesystem paths before the truncate, and reword the two claims to say
"scheme-prefixed URLs" rather than "URL-shaped substrings":

```ts
const PATH_REDACTION = "<path-redacted>";
function redactPaths(text: string): string {
  return text.replace(/(?:\/[A-Za-z0-9._-]+){2,}/g, PATH_REDACTION);
}
```

Then extend `telemetry.spec.ts`'s recursive walk with a case that throws an
error carrying `sdk.meta.path()`'s real shape and asserts the username does not
cross the RPC.

### WR-13: The "executes no pattern" gate cannot see `.replace(/…/)`, and `observations.ts` now executes a pattern transitively

**File:** `packages/backend/src/store/observations.spec.ts:167-193`

**Issue:** The gate greps `observations.ts`'s own source for six literal
substrings: `.test(`, `.match(`, `.exec(`, `.matchAll(`, `.search(`, `RegExp(`.
Every one of those is a *method on a pattern or a match call*. The list omits the
two shapes that actually get written when someone reaches for a regex in string
code:

- `s.replace(/…/g, x)` and `s.replaceAll(/…/g, x)` — the single most likely way
  to rewrite this exact function.
- `s.split(/…/)` — a one-character change from the `split("&")` already there.
- A bare regex literal assigned to a `const` and used later.

So the assertion's own claim — "the implementation is string splitting only" —
is not what it enforces. Worse, it is now *false at the module level*: plan
01-07 added `import { describeError } from "../telemetry"` to `observations.ts`
(`:10`), and `describeError` runs `redactUrls`, which is a `String.replace` with
a regex. Every failed observation write in the store now executes a pattern on
the very runtime whose `REDOS_RECOVERY` the comment says is "kill". The pattern
in question backtracks linearly rather than catastrophically, so this is a
WARNING about the guarantee's *wording and reach*, not about a live hang.

**Fix:** add `.replace(`, `.replaceAll(`, `.split(/`, and a check for a regex
literal token to the forbidden list, and either (a) restate the claim as "this
module's own code executes no pattern; `describeError` on the error path does,
and its pattern is asserted backtrack-free in `telemetry.spec.ts`", or (b) walk
the import graph so the claim covers what it says it covers. The comment-stripping
filter at `:177-180` also drops only lines that *begin* with `*` or `//`, so a
trailing `// …` comment can still trip the scan — anchor the scan on the AST the
way the two new gates do, or say that it is textual.

### WR-14: `outbound-import` misses a dynamic `import()` whose specifier is not a literal, and no other gate covers it

**File:** `packages/backend/src/outbound-prohibition.spec.ts:240-242, 288-300`

**Issue:** `specifierOf` returns a value only for `ts.isStringLiteralLike`.
Executed:

```
import via variable specifier  []   // const spec = "caido:http"; const m = await import(spec);
```

Normally this would be caught downstream, but not here:
`scripts/ci/check-bundle-imports.mjs` **allowlists** `caido:http` (deliberately —
it answers "what did QuickJS resolve when measured", per the recorded decision).
So a dynamic import through a variable is invisible to both gates
simultaneously, which is the one combination the two-gate design was supposed to
rule out.

**Fix:** resolve a single-hop `const` initialised to a string literal in the same
`collect` pass that already resolves receiver aliases, and — for anything still
unresolvable — report it as an unanalysable dynamic import rather than dropping
it silently. An `import(x)` in a plugin whose entire shipped import set is one
specifier is worth failing on by itself.

### WR-15: `tracer-e2e.sh`'s header still names Caido 0.57.1 after `P1_EXPECT_VERSION` moved to 0.58.0

**File:** `scripts/phase1/tracer-e2e.sh:5` (with `scripts/phase1/env.sh:47-79`)

**Issue:** `env.sh` was changed carefully: the sentence "The Caido build every
Phase 0 threshold was measured on" was *deleted* rather than left standing,
precisely because it had become false, and the change is recorded in thirty lines
of rationale. The harness that consumes the variable kept its own copy of the
false statement:

```sh
# The question in words: does a JavaScript response proxied through a REAL Caido
# 0.57.1 come out the other end as ...
```

The script's exit line prints `TRACER PASSED` and its output is the phase's
evidence artifact. A reader of that artifact who checks what it was run against
finds "0.57.1" in the header and 0.58.0 in the environment. The pass-1 resolution
note in this very file has the same problem — it says "TRACER PASSED against a
live Caido 0.57.1", which was true when written and is no longer the build the
script will use.

**Fix:** replace the literal in the header with `$P1_EXPECT_VERSION` prose ("a
REAL Caido at `$P1_EXPECT_VERSION`, see `scripts/phase1/env.sh`") and echo the
resolved `$ACTUAL_VERSION` into the run directory next to `status.json`, so the
evidence carries the build it was actually produced on rather than a build named
in a comment.

### WR-16: The tracer opens the live plugin database read-write

**File:** `scripts/phase1/tracer-e2e.sh:166, 174`

**Issue:** Both `sqlite3` invocations run against `$PLUGIN_DB` while Caido — and
the plugin — are still running and holding that same file open:

```sh
ARTIFACT_COLUMNS="$(sqlite3 "$PLUGIN_DB" "PRAGMA table_info(artifacts)" | …)"
sqlite3 "$PLUGIN_DB" "SELECT url FROM observations" > "$RUN_DIR/observations-url-raw.txt"
```

`sqlite3` opens read-write by default. Against a live database it can create or
touch `-wal`/`-shm` sidecars, and it can block on or contend for a lock the
plugin holds. Under `set -euo pipefail` a lock timeout aborts the script *after*
the traffic has already been proxied, discarding the run for a reason unrelated
to what was being measured — and in the worst case an evidence-gathering script
mutates the artifact it is measuring.

**Fix:** open read-only, which is both safer and faster:

```sh
sqlite3 -readonly "$PLUGIN_DB" "SELECT url FROM observations" > …
```

(or `sqlite3 "file:$PLUGIN_DB?mode=ro" …` if the local `sqlite3` predates
`-readonly`). Same for the `PRAGMA` at `:166`.

---

## Info (pass 2)

### IN-08: `backendFiles()` is walked twice, producing two lists that can diverge

`outbound-prohibition.spec.ts:346` binds `const files = backendFiles()` and
`:385` calls `backendFiles()` again for `it.each`. Two filesystem walks, and the
non-vacuity assertions at `:348-383` are made against a *different* array object
than the one the per-file cases iterate. Bind once and reuse.

### IN-09: Both new gates mix `path.join` with hard-coded `/` string surgery

`outbound-prohibition.spec.ts` builds paths with `join()` (platform separator)
and then asserts `f.endsWith("/" + expected)` (`:368`), filters on
`r.includes("/")` (`:380`), and derives `base` with `file.split("/").pop()`
(`:173`). `error-redaction.spec.ts` does the same at `:46` vs `:99` and `:251`.
On any non-POSIX host every by-name assertion silently stops matching and
`Violation.file` becomes a full path. Use `path.sep`, or build with `/`
throughout.

### IN-10: Neither gate names `store/db.ts` in its non-vacuity list

`error-redaction.spec.ts:252-259` names five store modules and
`outbound-prohibition.spec.ts:356-366` names nine backend modules; `db.ts` is
scanned by both and named by neither. It is the module that owns the pooled
handle and the one whose rename would be least noticed. Add it to both lists.

### IN-11: `ERROR_MAX` is now provably dead, and its comment says "in practice"

`analyses.ts:100` defines `ERROR_MAX = 300`; `analyses.ts:212` applies it to the
output of `describeError`, which returns at most `ERROR_TEXT_LIMIT = 240`. The
comment at `:209-211` says this makes 300 "unreachable in practice" — it is
unreachable *always*, for every input, by construction. Either state that (and
keep the slice as a column-bound assertion, which is the stated intent), or
replace it with a one-line assertion that `ERROR_TEXT_LIMIT <= ERROR_MAX` so the
relationship fails loudly if either constant moves. `migrations.ts:176-183` made
the opposite choice for the same situation and documented the 300→240 narrowing;
the two files should agree.

### IN-12: `auditSource`'s `no such rule` throw is unreachable

`outbound-prohibition.spec.ts:177-178` looks the rule up in `FORBIDDEN_OUTBOUND`
and throws if it is missing. Every one of the six `add(...)` call sites passes a
string literal that is present in the frozen table, so the branch cannot execute
and has no test. Either derive the rule id from the table (making the lookup
total by construction) or drop the branch.

### IN-13: The tracer's raw-column assertion is weaker than the per-row one

`tracer-e2e.sh:264` asserts only that `access_token=` appears somewhere in the
concatenated raw column text, while the RPC rows at `:230-240` are each checked
for the redaction marker. Assert `REDACTION in raw_urls` too, and assert the raw
row count equals `len(obs)` — otherwise a run where the RPC returned two rows and
the table holds ten would still pass.

---

_Pass 1 reviewed: 2026-08-21T00:30:00Z_
_Pass 2 reviewed: 2026-08-21T11:21:31Z_

---
---

# --- PASS 3 --- Gap-Closure ROUND 2 Review (plans 01-10 … 01-14)

**Reviewed:** 2026-08-21T15:23:01Z
**Depth:** standard
**Files Reviewed:** 9 (the files plans 01-10 … 01-14 changed after the pass-2 review)
**Status:** issues_found — 1 BLOCKER, 5 WARNING, 6 INFO, on top of a clean sweep of pass 2's eleven

New findings use a fresh ID series (`CR-07`, `WR-17+`, `IN-14+`) so nothing
collides with the two ledgers above, both of which are preserved verbatim.

## Resolution of pass 2 (2026-08-21, round 2)

**Every disposition below was decided by EXECUTION.** I imported `auditSource`
from both gates and `normaliseObservedUrl` / `redactUrlHead` /
`redactQueryValues` / `describeError` from the production modules into a
throwaway spec, ran 24 outbound shapes, 17 redaction-gate shapes, 31 URL shapes
and 6 error strings through them, and deleted the probe. Nothing below is
marked fixed because a SUMMARY said so.

| Finding | Status | Commit | The evidence |
|---|---|---|---|
| CR-02 | **fixed** | `a3a2cc9` | `globalThis.fetch(u)` → `["outbound-fetch"]`; `fetchAliases` now tracks `const f = fetch`, `const f = globalThis.fetch` and `const { fetch: f } = globalThis`; the member form is restricted to the four `GLOBAL_RECEIVERS`, and `cache.fetch(u)` still reports `[]` |
| CR-03 | **fixed** | `a3a2cc9` | `const { requests } = sdk; requests.send(req)` → `["outbound-send"]`; so do `let r; r = sdk.requests`, `Reflect.apply(sdk.requests.send, …)`, `sdk.requests.send(...args)`, a `class` method, and `sdk?.requests?.send(req)`. `sdk.requests.get(id)` stays quiet via `REQUESTS_READ_ONLY`, so the rule is now "any member not on the allowlist" rather than the literal name `send`. Residual receiver hole → `WR-19` |
| CR-04 | **fixed** | `51545c0` | `SOURCE_ROOTS` is `["packages/backend/src", "packages/engine/src"]`; the by-name non-vacuity list carries `pipeline.ts`, `decode.ts`, `queue.ts` and `store/db.ts`, so a package split fails loudly |
| CR-05 | **fixed** | `4e16c11` | `derivesFrom` replaces the bare-identifier match. Executed: `e.message` returned, `"x: " + e.message`, `` `${(e as Error).stack}` ``, `e.toString()`, `JSON.stringify(e)`, `String(e as Error)`, `const x = e; String(x)`, `[e].join("")`, `String.raw\`${e}\``, `{ ["error"]: e.message }`, `{ ...{ error: e.message } }`, `{ error }` where `const error = e.message`, a concise-arrow `(e) => e.message`, and a destructured `{ error }` parameter ALL fire. `describeError(e).slice(0, 200)` stays quiet. Residual render forms → `WR-17` |
| CR-06 | **fixed** | `2458713` | `redactDelimitedSegment`'s `eq === -1` branch. All eight `BARE_CREDENTIAL_SHAPES` return `?<redacted>`; the empty segment still returns empty; idempotent. **But the CLASS is not closed — see `CR-07`, which is the same column and the same claim** |
| WR-11 | **fixed (path residual PINNED)** | `2bc42d0` | `https://user:pa55w0rd@cdn.test/app.js` → `https://<redacted>@cdn.test/app.js`; `https://cdn.test/a.js;jsessionid=X` → `;jsessionid=<redacted>`; `https://cdn.test/@vite/client.js` byte-identical. Userinfo is resolved inside the authority, not by an `@`-anywhere search. The path-embedded token is PINNED by an executed case rather than left as prose |
| WR-12 | **fixed (POSIX half)** | `b2512f9` | `describeError` on the real `SQLITE_CANTOPEN` shape returns `<path-redacted> Support/…/data.db` — the OS username is inside the redacted portion. `redactPaths` is a whitespace-token string scan, no second pattern, and `observations.spec.ts`'s `auditPatternUse` enforces the one-literal budget. Two stale/missing disclosures → `WR-18` |
| WR-13 | **fixed** | `b7e4e2f` | The gate is AST-anchored, scans `observations.ts` AND `telemetry.ts`, bans the regex LITERAL (which subsumes `.replace(/…/)` and `.split(/…/)`) plus `RegExp` construction, and permits exactly one literal anchored to `redactUrls`. Closure argument overstated → `WR-20` |
| WR-14 | **fixed** | `a3a2cc9` | `const s = "caido:http"; await import(s)` → `["outbound-import"]`; `import("caido:" + "http")` → `["outbound-unanalysable"]` rather than silence |
| WR-15 | **fixed** | `59c9c67` | No version literal survives in `tracer-e2e.sh`; the resolved `$ACTUAL_VERSION` is written to `$RUN_DIR/caido-version.txt`. The claimed enforcement does not exist → `WR-21` |
| WR-16 | **fixed** | `59c9c67` | Both reads go through `sqlite_ro()`, over decision P8-D2's three-rung ladder, with rung 3 a named FATAL rather than a fallback and a `sqlite_master` object count asserted `> 0` so a mode that opens but sees nothing cannot be selected |
| IN-08 | fixed | `a3a2cc9` | `const files = shippedFiles()` is bound once and every case reads it |
| IN-09 | **half fixed** | `a3a2cc9` | `outbound-prohibition.spec.ts` is POSIX end to end. `error-redaction.spec.ts` was not converted → `IN-15` |
| IN-10 | fixed | `a3a2cc9` | `db.ts` is named in both non-vacuity lists |
| IN-11 | fixed | `02ceee5` | `ERROR_MAX` is exported and `telemetry.spec.ts:425-453` asserts `ERROR_TEXT_LIMIT <= ERROR_MAX` against the constant, not a copy of its value |
| IN-12 | fixed | `a3a2cc9` | `RULES` is a keyed frozen record and `RuleId = keyof typeof RULES`, so the lookup is total by construction and the untestable throw is gone |
| IN-13 | fixed | `59c9c67` | The raw column is now checked PER ROW for the marker, for `v=<redacted>`, for `access_token=<redacted>` and for a trailing `&<redacted>`, and `len(raw_rows) == len(obs)` is asserted |

## Summary (pass 3)

Round 2 did the work. Both gates went from "passes its own fixtures" to
"survives an adversarial probe it did not write": 23 of the 24 outbound shapes
and 15 of the 17 redaction shapes I threw at them now land, including every
shape CR-02, CR-03 and CR-05 named. The engine package is inside the walk. The
tracer reads the live database read-only through a ladder that refuses to
measure rather than measure nothing. The claims in `schema.spec.ts` and
`observations.ts` were rewritten from one sentence into per-grammar statements
with an OPEN list, which is the single most valuable thing in this batch.

**And the headline claim is still stronger than the code, for the third review
in a row, in the same column, by the same mechanism.**

Decision P10-D1's construction is stated in `observations.ts:74-81` as: *"a bare
segment is a VALUE WITH NO NAME and is redacted by construction, so no length of
bare segment survives and there is no 'shorter than the bound' left for a future
credential format to hide in."* The construction is `segment.indexOf("=") === -1`.
That is not a test for "has no name" — it is a test for "contains no `=`
byte", and standard base64 padding is an `=` byte. Executed:

```
"https://cdn.test/a.js?dXNlcjpwYTU1dzByZA=="
  -> "https://cdn.test/a.js?dXNlcjpwYTU1dzByZA=<redacted>"      // base64("user:pa55w0rd")
"https://cdn.test/a.js?QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo="
  -> "https://cdn.test/a.js?QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=<redacted>"
"https://cdn.test/a.js;dXNlcjpwYTU1dzByZA=="
  -> "https://cdn.test/a.js;dXNlcjpwYTU1dzByZA=<redacted>"       // same hole, `;` delimiter
```

The token is not truncated, not hashed and not redacted — it is promoted to a
parameter NAME and written whole to a column `db.ts` documents as never
garbage-collected, surviving project deletion and force-reinstall. `QUERY_NAME_MAX
= 64` does not help: base64 of a 32-byte secret is 44 characters. And the reason
the eight-format fixture table cannot see it is the reason its own header warns
about — *"a fixture list that agrees with the implementation measures the
implementation's opinion of itself"*: not one of the eight `BARE_CREDENTIAL_SHAPES`
contains an `=`, because the shapes were chosen against a rule whose failure mode
is the `=`. That is `CR-07`.

Three smaller things are right and are recorded so nobody re-litigates them.
`redactUrlHead` resolves userinfo inside the authority component and NOT by
searching for an `@`, so `/@vite/client.js` and `/@scope/pkg` survive
byte-identical — I ran both. `redactQueryValues` and `redactUrlHead` compose
without double-processing: `?a=1;token=SECRET` still becomes `?a=<redacted>` and
does not fabricate a second parameter. And `normaliseObservedUrl` is idempotent
across all 31 shapes including the `URL_MAX` boundary, where truncation lands
inside a marker and the second pass reproduces the first byte-for-byte
(re-derived, not taken on trust).

On the two invariants I was asked to hunt hardest for: `observations.ts` holds
no regex literal, no `RegExp`, no `URL` and no pattern-executing method;
`telemetry.ts` holds exactly one literal, at `:269`, inside `redactUrls`, and
`auditPatternUse`'s count-plus-anchor exemption fails on a second one, on a move,
and on a rename. `redactPaths` and `redactPathToken` are two-pointer string scans
with no pattern at all. The single measured-linearity case now runs through
`describeError`, so it covers both redactors even though its title names only one.

---

## Critical Issues (pass 3)

### CR-07: A bare query or path segment CONTAINING an `=` is parsed as `name=value` and survives verbatim — every base64-padded credential is that shape

**File:** `packages/backend/src/store/observations.ts:108-114` (the claim at `:74-81` and `:99-102`; the grammar claim at `packages/backend/src/store/schema.spec.ts:44-52`; the fixture table at `packages/backend/src/store/observations.spec.ts:74-100`)
**Severity:** BLOCKER

**Issue:** `redactDelimitedSegment` decides "bare" by the presence of an `=` byte:

```ts
const eq = segment.indexOf("=");
if (eq === -1) return segment === "" ? "" : QUERY_VALUE_REDACTION;
return segment.slice(0, eq).slice(0, QUERY_NAME_MAX) + "=" + QUERY_VALUE_REDACTION;
```

A segment that is entirely a credential but happens to contain an `=` therefore
takes the second branch, and the credential lands in the position the policy
KEEPS. Executed through `normaliseObservedUrl`:

```
?dXNlcjpwYTU1dzByZA==                       -> ?dXNlcjpwYTU1dzByZA=<redacted>
?QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=       -> ?QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=<redacted>
?ghp_AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIII=  -> ?ghp_AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIII=<redacted>
?s3cr3t=                                    -> ?s3cr3t=<redacted>
;dXNlcjpwYTU1dzByZA==                       -> ;dXNlcjpwYTU1dzByZA=<redacted>
```

`dXNlcjpwYTU1dzByZA==` is `base64("user:pa55w0rd")` — a whole HTTP Basic
credential, recoverable with one `base64 -d`, written byte-for-byte into
`observations.url`.

This is not a corner of the space. Standard base64 pads to a multiple of four
with `=`, so a 16-byte or 32-byte opaque token — the common size for a session
id, an OAuth `state`, an `X-Amz-Security-Token` fragment, a SAML blob — carries
one or two trailing `=` whenever it is not URL-encoded. `QUERY_NAME_MAX = 64`
does not bound it either: base64 of 32 bytes is 44 characters, well inside the
retained name. And because `redactDelimitedSegment` is deliberately THE shared
helper, the identical hole exists on the `;` path-parameter delimiter — one
policy, two delimiters, one defect.

**Why this is a BLOCKER and not a documented residual, on the same grounds as
CR-06.** Three artifacts claim it cannot happen:

- `observations.ts:74-81` — *"no length of bare segment survives and there is no
  'shorter than the bound' left for a future credential format to hide in."*
  A base64-padded token is a bare segment of any length that survives.
- `observations.ts:99-102` — *"With no `=`: … a VALUE WITH NO NAME."* The
  converse is assumed and is false: with an `=` it is not necessarily a name.
- `schema.spec.ts:44-52` lists the QUERY grammar as **ENFORCED**, with an OPEN
  list that names exactly one grammar (path-embedded tokens). This is a second
  open grammar and it is inside the one declared closed.

And the enforcing fixture cannot fail: `BARE_CREDENTIAL_SHAPES`
(`observations.spec.ts:74-100`) is eight formats, none containing an `=`, chosen
— by its own header's account — against the rule whose blind spot is the `=`.

**Fix:** a value half that is empty, or that consists only of `=` padding, means
the segment was never a `name=value` pair. That is one branch inside the helper
that already exists and it costs one analytic signal (`?debug=` with an empty
value) that the operator's decision did not ask for:

```ts
function redactDelimitedSegment(segment: string): string {
  const eq = segment.indexOf("=");
  if (eq === -1) return segment === "" ? "" : QUERY_VALUE_REDACTION;

  // P10-D1, second reading. `indexOf("=") !== -1` is not a test for "has a
  // name" — base64 pads with `=`, so `?dXNlcjpwYTU1dzByZA==` is a whole
  // credential whose "name" half is the credential. A pair whose VALUE half is
  // empty or is only padding was never a pair.
  const value = segment.slice(eq + 1);
  let onlyPadding = true;
  for (let i = 0; i < value.length; i += 1) if (value[i] !== "=") onlyPadding = false;
  if (onlyPadding) return QUERY_VALUE_REDACTION;

  return segment.slice(0, eq).slice(0, QUERY_NAME_MAX) + "=" + QUERY_VALUE_REDACTION;
}
```

Then:

1. Add `base64 with one `=` of padding`, `base64 with two`, and a trailing-`=`
   token to `BARE_CREDENTIAL_SHAPES` so the table can fail, and mirror them into
   `HEAD_CASES` for the `;` delimiter.
2. Add a per-row assertion to `scripts/phase1/tracer-e2e.sh`: give the run a
   sixth dye value shaped as `$(openssl rand -base64 16)` (which pads) carried
   as a bare segment, and assert its absence from the raw column exactly as the
   other five are asserted.
3. Amend `schema.spec.ts:44-52`. Even with the fix above, a credential pasted as
   a genuine parameter NAME (`?ghp_…=1`) is kept by policy and MUST appear in
   the OPEN list — the query grammar is "every VALUE is replaced", which is not
   the same sentence as "no authorization token reaches this column", and the
   entry currently reads as though it were.

---

## Warnings (pass 3)

### WR-17: The STORE-07 gate does not see `+=`, `.concat()`, or push-then-join — three string renders one token away from ones it does see

**File:** `packages/backend/src/store/error-redaction.spec.ts:376-386` (the `+` rule)

**Issue:** The concatenation rule matches `ts.SyntaxKind.PlusToken` only.
`PlusEqualsToken` is a different kind, so the accumulate idiom is invisible, and
because `names` grows only through a `VariableDeclaration` whose *initializer*
derives from the binding, the accumulator never becomes the binding either.
Executed against `auditSource("f.ts", src)`:

```
plus-equals            []   // catch(e){ let m = "failed"; m += e.message; return { ok:false, error: m }; }
string-concat-method   []   // catch(e){ return "x: ".concat(e.message); }
array-push-join        []   // catch(e){ const a:string[]=[]; a.push(e.message); return a.join(""); }
```

The first one is a complete, green, end-to-end path from a caught driver
rejection into `StoreWriteResult.error`. The gate covers `[x].join(…)` — an
array literal the binding is an element of — but not the array that was pushed
into, and covers `+` but not `+=`.

None of the three is the disclosed residual. Boundary 2 discloses a scope-blind
walk and a one-hop copy limit; `m += e.message` is neither — the offending
expression is right there in the AST with the binding as an operand.

**Fix:** accept the compound assignment in the same rule, and add the two
sibling render forms:

```ts
if (
  ts.isBinaryExpression(node) &&
  (node.operatorToken.kind === ts.SyntaxKind.PlusToken ||
   node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken) &&
  (derives(node.left) || derives(node.right))
) { add(ruleFor("unredacted-concat"), …); }
```

plus a `.concat(...)` branch beside the `.join(...)` one (any argument that
`derives`), and treat `a.push(x)` where `x` derives as adding `a` to `names`
so the existing join rule reaches it. Add all three executed shapes as
failing-path fixtures.

### WR-18: `schema.spec.ts`'s `analyses.error` disclosure names a residual that no longer exists and omits the one that does

**File:** `packages/backend/src/store/schema.spec.ts:155-171`, against `packages/backend/src/telemetry.ts:360-379`

**Issue:** The allowlist entry says, of `describeError`:

> NOT REDACTED … a SCHEME-RELATIVE reference — `//cdn/app.js?token=T` — is
> URL-shaped to a reader and not to the pattern, so it survives with its query
> intact … Both residuals are recorded beside `redactPaths` in `telemetry.ts`.

Both halves are wrong as of `b2512f9`, the commit that wrote the paragraph.
Executed through the real `describeError`:

```
"failed loading //cdn.victim.example/app.js?token=SECRET"
  -> "Error: failed loading <path-redacted>"                 // COVERED, not open
"failed loading cdn.victim.example/app.js?token=SECRET"
  -> "Error: failed loading cdn.victim.example/app.js?token=SECRET"   // OPEN, unnamed
```

`redactPathToken` requires a leading separator and two separators total, so
`//cdn/app.js?token=T` satisfies it and is consumed whole — the named residual
is closed. The shape that actually survives is the HOST-RELATIVE one with no
leading slash, which `WR-12`'s own executed evidence listed on its second line
and which appears in neither disclosure. And `telemetry.ts:360-379` names exactly
two residuals — Windows separators, and a path containing a space — so the claim
that "both residuals are recorded beside `redactPaths`" is true of one of them.

This matters more than a comment usually would because this paragraph is the
stated justification for keeping `analyses.error` on the T-01-21 allowlist. A
reader auditing that decision is told the wrong shape is dangerous and is not
told about the right one.

**Fix:** replace the scheme-relative sentence with the schemeless one, and add
the same residual beside `redactPaths` so the cross-reference is true:

```
 *   A SCHEMELESS host reference — `cdn.victim.example/a.js?token=T` — has no
 *   `://` for redactUrls and no leading separator for redactPaths, so it
 *   survives with its query intact. A scheme-RELATIVE `//host/path` does NOT:
 *   it begins with a separator and is consumed by redactPaths (verified).
```

and add both directions to `telemetry.spec.ts`'s "does NOT redact things that
are not absolute paths" block, so the disclosure is executed rather than
asserted.

### WR-19: The CORE-11 gate reports nothing when the RECEIVER key is unreadable — the exact equivalence boundary 2 claims to have removed

**File:** `packages/backend/src/outbound-prohibition.spec.ts:437-440` (`receiverKind`) and `:587-628` (the member rule; the unanalysable branch is `:598-603`)

**Issue:** Boundary 2 states the design rule in as many words:

> Anything it CANNOT read on an identified receiver, and any module specifier it
> cannot reduce to a literal, is REPORTED as `outbound-unanalysable`. "Could not
> read" does not mean "clean"; that equivalence is the specific defect this
> rewrite removes.

It is applied one level too low. A computed MEMBER on an identified receiver is
reported; a computed RECEIVER is not, because `receiverKind` returns `undefined`
for an element access whose key will not reduce, and every caller then treats the
site as an ordinary property access. Executed:

```
sdk["req"+"uests"].send(req)          []
(globalThis as any)["fet"+"ch"](u)    []
const a="requests"; const b=a; sdk[b].send(req)   []
```

Compare `import("caido:" + "http")`, which correctly reports
`["outbound-unanalysable"]` for the same class of unreadable expression. The
third case is the disclosed two-hop residual; the first two are one hop and are
silent.

`globalThis[x]()` is the sharper of the two: `globalThis` IS positively
identified by `isGlobalReceiver`, and the member rule's global branch simply
never runs when `memberName` returns `undefined`.

**Fix:** report rather than drop, in the two places the receiver is identified
enough to know something is being hidden:

```ts
// in receiverKind's ElementAccess branch — signal the caller, do not swallow
if (ts.isElementAccessExpression(inner)) {
  const key = literalOf(inner.argumentExpression);
  if (key !== undefined) return RECEIVERS.has(key) ? key : undefined;
  return UNREADABLE;            // a third state, distinct from "not a receiver"
}
```

and in the member rule, add an `else if (member === undefined &&
isGlobalReceiver(node.expression))` branch emitting `outbound-unanalysable`
("a computed member on a global receiver"). Add both executed shapes as
failing-path fixtures beside the existing computed-member one.

### WR-20: The pattern gate's closure argument is module-local, but a pattern can arrive from outside the module

**File:** `packages/backend/src/store/observations.spec.ts:843-857` (`PATTERN_EXECUTING_METHODS`)

**Issue:** `replace`, `replaceAll` and `split` are deliberately excluded, on this
stated argument:

> With regex literals and `RegExp` construction both banned there is no way to
> hand them a pattern, and banning them outright would ban `split("&")`.

The premise holds only for patterns *written in the scanned module*. A pattern
that arrives as an import, as a function parameter, or off an object defeats it
with none of the three banned constructs present:

```ts
import { HOST_RE } from "./patterns";      // rule 1 sees no literal here
export function f(s: string) { return s.replace(HOST_RE, ""); }   // rule 3 does not fire
```

On a runtime where `REDOS_RECOVERY = "kill"` and the recovery is SIGKILL taking
`caido-cli` down with live project data, "no pattern can reach this module" is
the claim the gate's own header makes, and it is enforced as "no pattern is
written in this module".

The exposure today is zero — neither scanned module imports anything
pattern-shaped — which is why this is a WARNING. The exposure the day someone
factors the redactors into a shared `patterns.ts` is total, and silent.

**Fix:** either (a) flag `.replace`/`.replaceAll`/`.split` when the FIRST
argument is not a string literal — which permits `split("&")` and
`replace("#", "")` and rejects every identifier — or (b) restate the header's
claim as "this module WRITES no pattern; a pattern reaching it through an import
or a parameter is outside the walk", and add the imported-pattern shape as an
executed fixture proving the gate is quiet so the limit is measured rather than
assumed. (a) is a handful of lines and closes it.

### WR-21: `tracer-e2e.sh` says the no-version-literal rule "is enforced" by a `grep -c`; no such gate exists

**File:** `scripts/phase1/tracer-e2e.sh:17-19`

**Issue:**

```sh
# A literal in this file is a bug, and a `grep -c` for the superseded one
# returning zero is how that is enforced.
```

Nothing in the repository performs that grep. `grep -rn "tracer-e2e"` over
`*.ts`, `*.mjs`, `*.sh` and `*.json` outside `.planning/` returns seven hits, and
every one is prose: `runtime-answers.sh:19`, `env.sh:78`, two fixture comments,
`schema.spec.ts:51` and `observations.ts:297`. There is no spec, no CI script and
no shell gate that reads this file's text.

That is the same defect `WR-15` was: a sentence claiming a property that only a
gate can hold. It is worse in one respect — `WR-15` was a stale literal a reader
could see was stale, whereas this is a claim that a check exists, which is the
claim a reader will not re-verify. And it appears in a file whose entire purpose
is producing citeable evidence.

**Fix:** either write the gate or delete the sentence. The gate is four lines in
a spec that already reads files from the repo root:

```ts
it("names no Caido version literal — the resolved build is written per run", () => {
  const src = readFileSync("scripts/phase1/tracer-e2e.sh", "utf8");
  // Non-vacuity first: the file must still cite the variable.
  expect(src).toContain("P1_EXPECT_VERSION");
  expect(src.match(/\b0\.\d+\.\d+\b/g) ?? [], "a version literal is back").toEqual([]);
});
```

Note that `scripts/phase1/env.sh:78` carries `P1_EXPECT_VERSION=0.57.1 bash
scripts/phase1/tracer-e2e.sh` as a usage example, so the gate must be scoped to
the tracer or the example updated — which is itself worth knowing.

---

## Info (pass 3)

### IN-14: `secret_sweep` reports `grep -c` output as "occurrences"; `grep -c` counts LINES

`scripts/phase1/tracer-e2e.sh:131` and `:139`. The header written into
`secret-sweep.txt` says "Occurrences of each per-run value … per file" and the
value comes from `grep -c -F -- "$value" "$f"`, which counts matching lines. Two
occurrences on one line — which is exactly the shape of a proxy log recording a
request line and a response line, or of a single-line JSON dump — report as 1.
The comment at `:127` even cites a measured count ("four occurrences of each wire
value") that this instrument cannot produce. Use `grep -o -F -- "$value" "$f" |
wc -l`, or relabel the column `lines`.

### IN-15: `error-redaction.spec.ts` still mixes `path.join` with `/` string surgery — IN-09 was fixed in one gate only

`outbound-prohibition.spec.ts` was converted to `posix.join` end to end.
`error-redaction.spec.ts:114` builds `STORE_DIR` with `join(...)`, `:135-140`
builds each entry with `join(STORE_DIR, d.name)`, and `:250` / `:543` then do
`.split("/").pop()`. On a non-POSIX host the by-name non-vacuity list fails
and `Violation.file` becomes a full path. It fails loudly rather than silently,
which is why this is INFO — but the two gates now disagree about a convention
one of them documents at length.

### IN-16: `ERROR_BINDING_NAMES` is a closed four-name set, and the two nearest synonyms are unscanned

`error-redaction.spec.ts:118-129`. Executed: a parameter named `reason` holding an
error string and placed straight into an object literal reports `[]`, while the
same body with the parameter named `e` reports `unredacted-persisted-error`. The
comment justifies the set by "zero false-positive surface today", which is a
claim about false positives and not about coverage. `reason`, `message`, `detail`
and `failure` are the names a widened `finishAnalysis` would plausibly use. Add
them, or state the closure as a coverage bound in boundary 2.

### IN-17: `describeError` can itself throw, inside the catch blocks that exist to stop throwing

`telemetry.ts:417-424`. `String(e)` raises `TypeError: Cannot convert object to
primitive value` for a null-prototype object and for any value with a throwing
`toString`, and `e.constructor?.name` can raise on a proxy. `recordError` wraps
its call in a `try`; the six store call sites do not —
`observations.ts:347`, `analyses.ts:168` and `:235`, and their siblings — so a
handled store failure would become an unhandled rejection out of
`recordObservation`. Vanishingly unlikely from a SQLite driver, one line to
close: wrap the two reads in `describeError` itself and fall back to
`"unrenderable error"`, the string `recordError` already uses.

### IN-18: `URL_MAX` truncation can leave a partial `<redacted>` marker in the column

Executed: a 400-parameter URL stores a tail of `…&p133=<re`. It is idempotent
(a second pass regrows the marker and re-truncates to the same bytes) and it
leaks nothing, so this is cosmetic — but any consumer that counts markers or
splits on them sees a fragment, and `tracer-e2e.sh:543` asserts `REDACTION in r`
per row, which a single-parameter URL truncated at the wrong boundary would fail.
Truncating on a `&` boundary, or dropping a trailing partial marker, removes the
class.

### IN-19: `;` parameters inside the AUTHORITY are not redacted

Executed: `https://cdn.test;sid=SECRET/a.js` is byte-identical out.
`redactUrlHead` runs its `;` loop over `s.slice(pathStart)`, and `pathStart` is
the first `/` after the authority, so the authority is returned verbatim.
`;` is a legal `sub-delim` in a reg-name, and no real deployment puts a session
id there, which is why this is INFO — but `schema.spec.ts:63-71` lists the `;`
grammar as ENFORCED without qualifying it to the path, and one clause on that
line would make the statement true.

---
---

# --- PASS 4 --- Gap-Closure ROUND 3 Review (plans 01-15, 01-16, 01-17)

**Reviewed:** 2026-08-22T10:20:00Z
**Depth:** standard
**Files Reviewed:** 9 (the files plans 01-15/01-16/01-17 changed after the pass-3 review)
**Status:** issues_found — 1 BLOCKER, 5 WARNING, 3 INFO, on top of a clean sweep of round 2's twelve

New findings use a fresh ID series (`CR-08`, `WR-22+`, `IN-20+`) so nothing collides
with the three ledgers above, all of which are preserved verbatim.

## Resolution of pass 3 (2026-08-22, round 3)

**Every disposition below was decided by EXECUTION.** I bundled the shipped
`store/observations.ts` with esbuild and drove 30-plus URL shapes through
`normaliseObservedUrl` at both the current HEAD and at `506ee3d` (the commit before
plan 01-15) so "the branch changed this" is a diff and not an argument; I imported
`auditSource` from both gates into a throwaway spec, ran 30 outbound shapes and 16
redaction-gate shapes through them, and deleted the probe. `pnpm test` is
**31 files / 1044 tests, all green**, which is a fact about the fixtures and not
about any of the below.

| Finding | Status | Commit | The evidence |
|---|---|---|---|
| CR-07 | **fixed** | `0fdac5c` / `9fffb52` | `redactDelimitedSegment` now walks the VALUE half. Executed: `?dXNlcjpwYTU1dzByZA==` → `?<redacted>`, `?YWRtaW46aHVudGVyMjI=` → `?<redacted>`, `;dXNlcjpwYTU1dzByZA==` → `;<redacted>`, `?=` and `?==` → `?<redacted>`, `?token=dXNlcjpwYTU1dzByZA==` still → `?token=<redacted>` (the branch that worked was not weakened). `BARE_CREDENTIAL_SHAPES` grew from 8 to 13 and now carries a structural assertion that ≥3 shapes contain an `=` and that BOTH sub-branches (one pad, two pads) are represented — the assertion round 2 did not have. `expectSecretAbsent` searches the padding-stripped CORE as well as the literal and refuses an all-padding literal first, so it cannot pass vacuously. **The claimed `?debug=` cost is NOT the only behaviour change — see `WR-22`.** |
| WR-17 | **fixed** | `897598e` | Executed: `m += e.message` → `["unredacted-concat"]`, `"x: ".concat(e.message)` → `["unredacted-concat"]`, `parts.push(e.message); parts.join(" ")` → `["unredacted-string-call"]`. All three stay QUIET on the `describeError(e)` spelling of the same idiom, so the rule bans the leak and not the idiom. Render-form residual re-derived — incompletely → `WR-24` |
| WR-18 | **fixed** | `897598e` | Both directions executed through the real `describeError`: `//cdn.victim.example/app.js?token=SECRET` → `Error: failed to load <path-redacted>` (the named residual was CLOSED), `cdn.victim.example/app.js?token=SECRET` → verbatim (the unnamed one is OPEN). `telemetry.ts`'s residual list moved from two to three and now names the schemeless shape; `schema.spec.ts`'s `analyses.error` entry names the same two surviving shapes, so the cross-reference the entry makes is true for the first time |
| WR-19 | **fixed (NARROWED — and the narrowing has a hole)** | `0ec1e02` | `UNREADABLE_RECEIVER` is a real third state. Executed: `sdk["req"+"uests"].send(req)` → `["outbound-unanalysable"]`, `globalThis["fet"+"ch"](u)` → same, `const { send } = sdk["req"+"uests"]` → same, `const r = sdk["re"+"quests"]; r.send(req)` → same, and the two real-tree false positives (`cur[key]`, `MIGRATIONS[MIGRATIONS.length - 1]`) stay silent. **But the rule reads the key expression INLINE only** → `CR-08` |
| WR-20 | **fixed** | `e129f10` | Option (a). Rule 4 fires on `.replace`/`.replaceAll`/`.split` whose first argument is not a string literal — `t.replaceAll(cfg.url, "x")` → `["smuggled-pattern"]` — and stays quiet on `s.split("&").join("&").replace("a","b").replaceAll("c","d")`, which IS the implementation. A regex-literal first argument still falls through to rule 1's count-plus-anchor exemption, so `telemetry.ts`'s one permitted literal keeps its call |
| WR-21 | **fixed** | `ce5f3a5` | The gate exists, runs, and is scoped: `tests/pins.spec.ts` reads `scripts/phase1/tracer-e2e.sh` as raw text, comments included, and fails on any dotted-numeric run of exactly three components. Non-vacuous against a moved/emptied script. The tracer's header no longer claims a `grep -c` and names the describe block instead. It has no EXECUTED failing path → `WR-25` |
| IN-14 | fixed | `6d32e01` | `grep -a -o -F -- "$value" "$f" | wc -l` replaces `grep -c`, and the block records the negative result that the two counters happened to agree on run 1 |
| IN-15 | fixed | `897598e` | `error-redaction.spec.ts` builds every path with `posix.join`, so the `.split("/")` at `:311` and `:647` are now consistent with the construction rather than at odds with it |
| IN-16 | fixed | `897598e` | `ERROR_BINDING_NAMES` gained `reason`, `detail`, `failure`, `message`. Executed: a parameter named `reason` rendered with `String()` into `{ error: … }` now reports `unredacted-persisted-error`, and so does `message`. `problem` still does not, and the comment now states that as a COVERAGE bound rather than as a false-positive claim |
| IN-17 | fixed | `897598e` | Both reads in `describeError` are wrapped separately. Executed: a null-prototype object, a throwing `toString` and a `constructor`-trapping Proxy all return rather than throw, and `recordError` and `describeError` produce the SAME fallback string |
| IN-18 | **NOT fixed — PINNED, and the pin's own rationale is defective** | — | The `…&p133=<re` fragment is still stored and is still idempotent. The reason given for deferring — that the obvious repair would break idempotence via plan 01-15's new branch — is stated in the pinned case; the new branch already broke idempotence on a neighbouring cut point → `WR-22` |
| IN-19 | fixed (as a disclosure) | `9fffb52` | `schema.spec.ts`'s `;` row is now QUALIFIED TO THE PATH and the authority case is pinned by "RESIDUAL, PINNED: a `;` parameter inside the AUTHORITY" |

## Summary (pass 4)

Round 3 did the work on the column. The padded-credential class is genuinely closed
on both delimiters, the fixture table was re-derived from the ENCODING FACTS rather
than from the branch, the absence assertions now search the recoverable spelling
instead of the literal, and the live tier carries two padded dyes plus a committed
mutation run whose `observations-url-raw.txt` reads

```
…&9xUbJAATIR5fA3NpO+WUHA=<redacted>&Hf0sCN7lYIrnsKODDtzkUOZDO1/mumKR1nqAH0duYwU=<redacted>
```

— the defect, on a real Caido 0.58.0, in a file anyone can `git show`. That is the
strongest evidence artifact this phase has produced.

**And the signature defect is back, in the gate this time, for the fourth review in
a row.** `WR-19` asked the outbound gate to stop treating "could not read" as
"clean" at the RECEIVER level. It now does — for a key written INLINE at the element
access. Bind that key to a name first and the whole widening evaporates:

```
sdk["req" + "uests"].send(req)                     ["outbound-unanalysable"]
const k = "req" + "uests"; sdk[k].send(req)        []
const k = `req${"uests"}`; sdk[k].send(req)        []
const k = ["req","uests"].join(""); sdk[k].send(req)   []
sdk[b ? "requests" : "net"].send(req)              []
```

All three assembly forms the header enumerates — "concatenated, interpolated, or
returned by a call" — are defeated by one `const`. The last shape is sharper still:
both keys are LITERALS naming outbound receivers, so nothing was hidden and nothing
could not be read; the walk simply never looks at a conditional in key position,
one function away from `initializerReceiver`, which handles conditionals for exactly
this reason. And the fixture that claims to bound the residual —

> The ONE-hop version of the same shape is caught, which is what makes the residual
> a bound rather than a hole

— is asserted with `const r = "requests"`, a LITERAL key resolved by `constStrings`.
It exercises a different mechanism entirely and cannot fail against the concealment
the assembled-key rule exists for. That is `CR-08`.

Three smaller things are right and are recorded so nobody re-litigates them. The
`;`-mirror table really does mirror: every `=`-bearing shape added to
`BARE_CREDENTIAL_SHAPES` has a `HEAD_CASES` twin, including `;=` and `;==`, so "one
policy, two delimiters" stays a measured statement. `describeError` genuinely cannot
throw now — I checked every read on the path, including `body.startsWith(name)`,
`redactUrls`' `String.prototype.replace` and `redactPaths`' two-pointer scan, and
none of them can raise on a string. And the tracer's padded dyes are asserted INTO
SHAPE before the run (padding-byte count and non-empty core, on both sides of the
parameter file), so a dye that arrived unpadded aborts rather than producing a
green run that proves nothing.

---

## Critical Issues (pass 4)

### CR-08: The WR-19 assembled-key rule reads the key INLINE only — one `const` defeats it, and the fixture that bounds the residual uses a literal so it cannot fail

**File:** `packages/backend/src/outbound-prohibition.spec.ts:648-661` (`isAssembledKey`), `:757-765` (`receiverKind`'s element-access branch), claim at `:20-32` and `:48-65`, fixture at `:1730-1744`
**Severity:** BLOCKER

**Issue:** `receiverKind` reaches for the third state only when the argument
expression IS the assembly:

```ts
if (ts.isElementAccessExpression(inner)) {
  const key = literalOf(inner.argumentExpression);
  if (key !== undefined) return RECEIVERS.has(key) ? key : undefined;
  return isAssembledKey(inner.argumentExpression, numericNames, poisonedNumericNames)
    ? UNREADABLE_RECEIVER
    : undefined;
}
```

and `isAssembledKey` inspects that one node: a `+` binary, a template expression, or
a call. A bare identifier is none of those, and `constStrings` only resolves an
identifier bound to a single string LITERAL. So a key assembled and then bound —
one hop, in the same file, in document order, with the assembly right there in the
AST — resolves to neither a literal nor an assembly and the site is dropped.
Executed against `auditSource("probe.ts", src)`:

```
sdk["req" + "uests"].send(req)                          ["outbound-unanalysable"]
const k = "req" + "uests"; await sdk[k].send(req)       []
let   k = "req" + "uests"; await sdk[k].send(req)       []
const k = `req${"uests"}`; await sdk[k].send(req)       []
const k = ["req","uests"].join(""); await sdk[k].send(req)   []
const k = g(); await sdk[k].send(req)                   []      // inline `sdk[g()]` reports
sdk[b ? "requests" : "net"].send(req)                   []
sdk[(0, "requests")].send(req)                          []
```

Compare the same defect one level down, which the gate gets right: `const m = "se" +
"nd"; sdk.requests[m](req)` DOES report `outbound-unanalysable`, because there the
receiver is positively identified and `memberName` returning `undefined` is enough.
The gate therefore reports an unreadable MEMBER however many hops away it was
assembled, and an unreadable RECEIVER only when the assembly is written in place.
That asymmetry is exactly what WR-19 was raised to remove, moved up one level.

**Why this is a BLOCKER and not a documented residual.** Three artifacts say
otherwise, and they contradict each other:

- Header boundary 2 (`:26-30`) — "an element access whose key the walk can see being
  ASSEMBLED — concatenated, interpolated, or returned by a call — is an UNREADABLE
  RECEIVER … and it is reported wherever that value is used as one". All three named
  forms are silent one `const` away.
- Residual (a) (`:50-53`) — "a value that flows through a FUNCTION BOUNDARY, or
  through MORE THAN ONE HOP of indirection, is beyond the walk", with a TWO-hop
  example. `const k = "req" + "uests"` is one hop.
- Residual (b) (`:54-60`) textually covers it ("a bare identifier key … is NOT
  reported"), but its stated justification does not: the bound "was set by
  measurement" against two real-tree hits — `compat.ts`'s dotted-path walk
  (`cur[key]`, `key` a loop variable) and `ctx[root]`. Neither is a name bound to an
  assembled expression, so tracking that one shape would not have re-fired either.
  The measurement justifies exempting a merely dynamic key; it does not justify
  exempting a demonstrably assembled one.

And the fixture at `:1730-1744` closes the loop the wrong way. It asserts the
TWO-hop shape reports `[]` (correct, disclosed) and then asserts

```ts
expect(rulesOf('const r = "requests";\nawait sdk[r].send(req);')).toContain("outbound-send");
```

under the comment "The ONE-hop version of the same shape is caught, which is what
makes the residual a bound rather than a hole." That case passes through
`constStrings`, not through `isAssembledKey`, so it is green whether or not the
assembled-key rule can see one hop. It is a green-because-it-cannot-fail assertion
sitting directly under the rule it appears to bound — the shape this file's own
header says the phase has had to remove four times.

The conditional key is the sharper half. `sdk[b ? "requests" : "net"]` hides nothing
— both keys are literals naming outbound receivers — and `initializerReceiver`
already resolves conditionals when they appear as an INITIALIZER (`const r = b ?
sdk.requests : sdk.requests` correctly reports `outbound-send`). The same handling
is simply absent in key position, so a site the walk can read completely is neither
reported nor disclosed.

**Fix:** resolve one hop for the key the same way the gate already resolves one hop
for the receiver and for `fetch`, and read a conditional key on both branches.

```ts
// beside `constStrings`, in the same collect pass:
/** Names bound to an expression the walk can see being ASSEMBLED. */
const assembledNames = new Set<string>();
// in collect, on VariableDeclaration with an identifier name, and on `x = …`:
if (isAssembledKey(init, numericNames, poisonedNumericNames)) {
  assembledNames.add(node.name.text);
}

// in receiverKind's ElementAccess branch, replacing the single-node test:
const arg = unwrap(inner.argumentExpression);
if (ts.isConditionalExpression(arg)) {
  // Both keys are readable: a receiver that is outbound on one branch is outbound.
  return receiverKind(ts.factory.createElementAccessExpression(inner.expression, arg.whenTrue))
      ?? receiverKind(ts.factory.createElementAccessExpression(inner.expression, arg.whenFalse));
}
if (isAssembledKey(arg, numericNames, poisonedNumericNames)) return UNREADABLE_RECEIVER;
if (ts.isIdentifier(arg) && assembledNames.has(arg.text)) return UNREADABLE_RECEIVER;
return undefined;
```

`assembledNames` fires on neither real-tree false positive — `key` is a `for…of`
binding over `path.split(".")` and `root` is a parameter, and neither is a
`VariableDeclaration` whose initializer is a `+`, a template or a call — so the
measured bound that decided residual (b) is preserved. Then:

1. Add every executed shape above as a failing-path case beside `:1702-1727`.
2. Replace the misleading comment at `:1740-1744` with a case that actually
   exercises one hop of ASSEMBLY (`const k = "req" + "uests"`), and keep the literal
   case under its own title so it is not read as bounding a rule it does not touch.
3. Re-run the gate over the real tree and record the zero-false-positive result in
   the header the way `isAssembledKey`'s own docblock already does.

---

## Warnings (pass 4)

### WR-22: The CR-07 branch cost `normaliseObservedUrl` its idempotence at the `URL_MAX` boundary — a NEW residual, undisclosed, and the pinned IN-18 case defers on the strength of the invariant it broke

**File:** `packages/backend/src/store/observations.ts:179-202` with `:393-398`; the claim at `packages/backend/src/store/observations.spec.ts:755-791`

**Issue:** The new branch removes the NAME half when the value half is empty. That
shortens the segment, so a `URL_MAX` truncation that lands immediately after a `=`
is no longer a fixed point. Executed against the shipped module at HEAD and at
`506ee3d` (the commit before plan 01-15), same input, esbuild-bundled and run:

```
input: "https://cdn.test/a.js?" + 800 × "ppppN=v" joined with "&"

NEW  once  tail "cted>&pppp112="   len 2048
NEW  twice tail "cted>&<redacte"   len 2048   IDEMPOTENT? false
OLD  once  tail "cted>&pppp112="   len 2048
OLD  twice tail "cted>&pppp112="   len 2048   IDEMPOTENT? true
```

and the mechanism, minimally:

```
NEW  "https://x.test/a.js?p133="  ->  "https://x.test/a.js?<redacted>"
OLD  "https://x.test/a.js?p133="  ->  "https://x.test/a.js?p133=<redacted>"
```

Under the old rule the truncated tail `…&p133=` re-expanded to `…&p133=<redacted>`
and the 2048-byte cut fell on the same byte, so the value was its own fixed point.
Under the new rule the name is destroyed, the string shrinks, and the cut moves.

Two things make this a finding rather than a curiosity.

**(1) It is a NEW residual and nothing discloses it.** `redactDelimitedSegment`'s
docblock names exactly one accepted cost — "A parameter with an EMPTY value —
`?debug=` — now loses its NAME as well as its value" — and closes with "Idempotent
for free in all three branches", which is true of the helper and false of the
composed function the column is actually written through. `schema.spec.ts`'s
`observations.url` entry does not mention it either.

**(2) The IN-18 pin now defers on a broken premise.** `observations.spec.ts:755-791`
declines to fix the severed-marker truncation with this reasoning:

> The obvious repair — drop the partial marker so the string ends `…&p133=` —
> INTERACTS with this plan's new branch: a segment whose value half is empty now
> redacts WHOLE, so a second pass over `…&p133=` produces `…&<redacted>` and the
> idempotence invariant asserted across every case in this file breaks.

The invariant is already broken, by that same branch, on an input the repair has
nothing to do with — and the case's own closing assertion
(`normaliseObservedUrl("https://cdn.test/a.js?p133=")` → `?<redacted>`) is one
`URL_MAX` cut away from being the whole problem rather than a hypothetical. The
existing idempotence assertions cannot see it: `CASES` and the
`BARE_CREDENTIAL_SHAPES` loop assert idempotence over `redactQueryValues` on short
URLs, `HEAD_CASES` asserts it over `redactUrlHead`, and the ONLY
`normaliseObservedUrl` idempotence assertion in the file is the 140-parameter
fixture at `:775-785`, whose cut happens to land mid-marker rather than on a `=`.

Not a BLOCKER: nothing leaks (the destroyed half is a parameter NAME, retained by
policy anyway) and no production path applies `normaliseObservedUrl` twice — it runs
once per `recordObservation`. It is a WARNING because a stated invariant is false, a
new residual is undisclosed, and a separate finding is being deferred on the
strength of both.

**Fix:** do the `&`-boundary truncation IN-18 already scopes, which removes the
class rather than the symptom, and correct the two claims either way:

```ts
export function normaliseObservedUrl(url: string): string {
  const redacted = redactQueryValues(redactUrlHead(String(url).split("#")[0]));
  if (redacted.length <= URL_MAX) return redacted;
  const cut = redacted.slice(0, URL_MAX);
  const lastAmp = cut.lastIndexOf("&");
  // Drop the whole partial segment, never half of one: a segment cut after its
  // `=` is a segment the next pass would redact WHOLE, and one cut inside the
  // marker leaves a fragment consumers can miscount.
  return lastAmp === -1 ? cut : cut.slice(0, lastAmp);
}
```

Then add an idempotence case over `normaliseObservedUrl` that SEARCHES for the
adversarial cut instead of hard-coding one fixture — sweep a parameter-name length
until the truncation lands on a `=`, which is what found this — and delete the
"Idempotent for free in all three branches" sentence or scope it to the helper.

### WR-23: `outbound-dynamic-code` has no alias tracking, so `const e = eval; e(s)` reports clean — the rule whose whole argument is "the one shape that makes a passing gate meaningless"

**File:** `packages/backend/src/outbound-prohibition.spec.ts:94-111` (the docblock), `:1124-1131` (the call rule), `:1091-1100` (the `new` rule)

**Issue:** `DYNAMIC_CODE` is matched only when the callee is a bare identifier
`eval`/`Function`, or a member of one of the four `GLOBAL_RECEIVERS`. One binding
removes it. Executed:

```
eval(s)                                            ["outbound-dynamic-code"]
const e = eval; e(s)                               []
const { eval: ev } = globalThis as any; ev(s)      []
new Function("a", s)                               ["outbound-dynamic-code"]
const F = Function; new F("a", s)                  []
```

The gate already knows how to do this: `fetchAliases` is seeded with `FETCH_GLOBAL`
and grown from `const f = fetch`, `const f = globalThis.fetch` and
`const { fetch: f } = globalThis`, and `navigatorAliases` mirrors it exactly. The
dynamic-code rule was written beside both and given neither, and its docblock cites
the receiver rules' alias handling as its model:

> including a bare member REFERENCE with no call, the same way the receiver rules
> already catch `const s = sdk.requests.send`.

A reader is therefore told the rule reaches as far as the ones next to it. It
reaches one spelling less far than any of them, and the residual list names only
function boundaries, >1 hop and multi-hop `navigator` — a one-hop alias is none of
those. `outbound-global-ctor` has the identical gap (`const W = WebSocket; new
W(url)` → `[]`); that half is pre-existing rather than new in this batch, but it is
the same two lines to close.

**Fix:** one alias set, seeded and grown exactly as `fetchAliases` is.

```ts
const dynamicCodeAliases = new Map<string, string>();   // localName -> "eval" | "Function"
// in collect, beside the fetch/navigator branches:
//   const e = eval;                  -> dynamicCodeAliases.set("e", "eval")
//   const F = globalThis.Function;   -> dynamicCodeAliases.set("F", "Function")
//   const { eval: ev } = globalThis; -> dynamicCodeAliases.set("ev", "eval")
// in visit, replacing the bare-identifier tests in the call and `new` rules:
const dyn = ts.isIdentifier(callee)
  ? (DYNAMIC_CODE.has(callee.text) ? callee.text : dynamicCodeAliases.get(callee.text))
  : undefined;
if (dyn !== undefined) add("outbound-dynamic-code", `a call to \`${callee.text}(...)\``);
```

Do the same for `OUTBOUND_CONSTRUCTORS`, and add each executed shape above as a
failing-path case beside `:1815-1830`. Keep an ordinary object defining a method
named `eval` quiet, the way the beacon rule's negative fixture does.

### WR-24: The STORE-07 gate is blind to the OPERATOR class of render — `? :`, `??` and `||` — and the residual it re-derived in the same commit does not name it

**File:** `packages/backend/src/store/error-redaction.spec.ts:262-291` (`derivesFrom`), residual claim at `:29-34`

**Issue:** `derivesFrom` unwraps parentheses, casts, non-null assertions, member
access and member calls, then requires an identifier at the bottom. A
`ConditionalExpression`, a `??` and a `||` are none of those, so the descent stops
and the render is invisible. Executed against `auditSource("store/x.ts", src)`:

```
catch(e){ return { ok:false, error: e.message }; }                            ["unredacted-object-value"]
catch(e){ return { ok:false, error: e instanceof Error ? e.message : "x" }; } []
catch(e){ return { ok:false, error: e.message ?? "x" }; }                     []
catch(e){ return { ok:false, error: e.message || "x" }; }                     []
```

`e instanceof Error ? e.message : String(e)` is not an exotic spelling. Under
`useUnknownInCatchVariables` — which this repo enables, and which the gate's own
header cites as the reason cast forms matter — it is the standard way to narrow a
caught `unknown` before rendering it, and it is likelier in a Phase 2
`finishAnalysis` than either of the two accumulator idioms WR-17 just added.

What makes it a finding rather than a gap is the paragraph shipped in the same
commit. WR-17's fix rewrote the render-form list and added:

> THE RESIDUAL OF THE RENDER-FORM LIST, RE-DERIVED against the widened rules rather
> than carried forward: a render that goes through a method this list does not name
> (`padEnd`, `repeat`, `replace`, a user helper), or through an accumulator that is
> neither a `+=` nor a `.push`, is not seen.

The re-derivation enumerates two classes — methods and accumulators — and the class
that is actually open is a third: an OPERATOR between the binding and the render
position. A residual list that announces it was re-derived is trusted for its
completeness, which is the argument `schema.spec.ts`'s OPEN list already makes about
itself one directory away.

**Fix:** descend through the operator forms, which costs three branches in the
function that already descends through five, and then re-derive the residual again
against the widened rule.

```ts
if (ts.isConditionalExpression(current)) {
  return derivesFrom(current.whenTrue, names) || derivesFrom(current.whenFalse, names);
}
if (
  ts.isBinaryExpression(current) &&
  (current.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
   current.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
   current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
) {
  return derivesFrom(current.left, names) || derivesFrom(current.right, names);
}
```

Add all four executed shapes as failing-path cases, add the `describeError(e)`
spelling of each as a must-stay-quiet case, and amend the residual paragraph to name
the operator class it now covers and whatever is left after it.

### WR-25: The WR-21 gate has no executed failing path, so its DETECTION predicate cannot be shown to work — in the one file arguing hardest against exactly that

**File:** `tests/pins.spec.ts:274-348`

**Issue:** The gate is written inline:

```ts
const hits = (tracerText.match(DOTTED_NUMERIC) ?? []).filter(
  (run) => run.split(".").length === 3,
);
expect(hits, …).toEqual([]);
```

`tracer-e2e.sh` currently contains `0.25` (two components) and five `127.0.0.1`
(four), and no three-component run at all, so the filter's true branch never
executes anywhere in the suite. Break the predicate in any of several plausible
ways — `=== 4`, `>= 4`, dropping the `?? []`, replacing `match` with `search`,
tightening `DOTTED_NUMERIC` to require a leading `v` — and the gate stays green
forever while enforcing nothing. The two non-vacuity assertions guard a different
property: that the right file was read and is non-empty. They cannot detect an inert
predicate.

Every other gate this phase built avoids this by exporting a pure `auditSource` and
running its failing path on a synthetic fixture —
`outbound-prohibition.spec.ts`, `error-redaction.spec.ts` and
`observations.spec.ts`'s `auditPatternUse` all do. The WR-21 gate is the one that
does not, and its subject is a file whose header states, at length, that "a gate
whose failure path has never run is a gate nobody has tested" and that a
green-because-it-cannot-fail gate is "the shape this phase has already had to remove
four times". The tracer's header says the gate "has been OBSERVED failing: a planted
literal drives it red" — that observation is not in the repository.

**Fix:** lift the predicate out, keep the file scan as its only caller, and execute
both directions.

```ts
/** Semver-shaped tokens in raw text. Exported so its FAILING path can run. */
export function versionLiterals(text: string): string[] {
  return (text.match(/\d+(?:\.\d+)+/g) ?? []).filter((r) => r.split(".").length === 3);
}

it("the scan DETECTS a planted literal, and ignores the two shapes that must stay", () => {
  expect(versionLiterals("# expected Caido 0.58.0")).toEqual(["0.58.0"]);
  expect(versionLiterals("sleep 0.25; curl http://127.0.0.1:8080/")).toEqual([]);
  expect(versionLiterals(`${tracerText}\n# expected Caido 0.58.0\n`)).toEqual(["0.58.0"]);
});
```

The third assertion is the load-bearing one: it plants the literal into the REAL
file's text, so the gate is proven to go red on the actual input rather than on a
one-line fixture.

### WR-26: `isProvablyNumeric` says it "PROVES rather than assumes and fails SAFE"; for a property access it assumes, by member NAME, and fails open

**File:** `packages/backend/src/outbound-prohibition.spec.ts:569-624` (docblock at `:573-583`, the branch at `:608-610`)

**Issue:** The docblock states the discipline in as many words:

> It PROVES rather than assumes and it fails SAFE: anything it cannot prove numeric
> is treated as possibly a name.

The property-access branch does the opposite:

```ts
if (ts.isPropertyAccessExpression(inner)) {
  return NUMERIC_MEMBERS.has(inner.name.text);
}
```

Any expression ending in `.length`, `.size`, `.min`, `.max`, `.abs`, `.indexOf`,
`.search`, `.floor` … is declared numeric regardless of what it is a member OF, and
a numeric key short-circuits `isAssembledKey` before any other test runs. Executed:

```
sdk[o.length].send(req)        []
sdk[o.name].send(req)          []      // not numeric, but a bare member is not "assembled" either
```

`o.length` is a string on any ordinary configuration object (`{ max: "requests" }`,
`{ size: "net" }`), so the exemption is an assumption about a name, and the failure
direction is open rather than safe. `NUMERIC_MEMBERS`'s own comment concedes the
mechanism ("Enumerated rather than inferred, because the alternative is a type
checker") without conceding the direction.

The exposure today is nil — neither scanned root indexes an outbound receiver by a
member-named key — which is why this is a WARNING and not part of `CR-08`. The
exposure the day the exemption is relied on is silent, and the docblock is what a
future author will rely on.

**Fix:** cheapest correct version is to require the RECEIVER to be something the
walk can also see is not an outbound object, or simply to restrict the branch to the
shapes that motivated it:

```ts
if (ts.isPropertyAccessExpression(inner)) {
  // `x.length` / `MIGRATIONS.length` only. A member of a call result or of an
  // unresolvable expression is not proven anything.
  return NUMERIC_MEMBERS.has(inner.name.text) && ts.isIdentifier(unwrap(inner.expression));
}
```

Whatever is chosen, correct the docblock: the set is a NAME heuristic exactly as
`ERROR_BINDING_NAMES` is one directory away, and that file states its heuristic as a
coverage bound rather than as a proof.

---

## Info (pass 4)

### IN-20: `globalThis` itself has no one-hop alias, while `navigator` does

`outbound-prohibition.spec.ts:663-667` (`isGlobalReceiver`) matches a bare identifier
in `GLOBAL_RECEIVERS` only. Executed: `const g = globalThis; await g.fetch(u)` → `[]`,
and `const g = globalThis; await g["fet"+"ch"](u)` → `[]`. `navigatorAliases` and
`fetchAliases` both resolve one hop; the receiver they sit on does not. Pre-existing
rather than new in this batch, and it is the same `Set<string>` pattern to close.

### IN-21: `padded_segments_reached` is an `all()` over a filtered generator and is `True` when no row carries a `?`

`scripts/phase1/tracer-e2e.sh:816-819`. `bool(raw_rows)` guards an empty list but not
the case where every row lacks a `?`, so the generator is empty and `all()` returns
`True` — the run would then RECORD that the padded grammar reached the plugin while
having measured nothing. It is unreachable in a passing run because
`check(len(q_seg) == 5, …)` fails first, which is why this is INFO; but the note it
writes into `grammar-reachability.txt` is the committed artifact a reader cites, and
its truth should not depend on another assertion having already failed. Add
`any("?" in r for r in raw_rows)` to the conjunction.

### IN-22: the `push`→`join` rule needs a bare-identifier receiver and depends on document order

`error-redaction.spec.ts:409-421`. `names.add(receiver.text)` runs only when the push
receiver is an identifier, so `o.parts.push(e.message); o.parts.join("")` reports `[]`;
and because `names` grows during the walk, a `join` that appears BEFORE the `push` in
document order is missed (`const out = a.join(""); a.push(e.message)` → `[]`). Both
are inside boundary 2's stated document-order limit, and neither is reachable in the
store tree today. Worth one sentence in the render-form residual alongside the
operator class `WR-24` adds, since the list now enumerates accumulators explicitly.

---
---

# --- PASS 5 --- Gap-Closure ROUND 4 Review (plans 01-18 … 01-22)

**Reviewed:** 2026-08-24T10:05:00Z
**Depth:** standard
**Files Reviewed:** 7 (the files plans 01-18/01-19/01-20/01-21/01-22 changed after the pass-4 review)
**Status:** issues_found — 2 BLOCKER, 5 WARNING, 4 INFO, on top of a clean sweep of round 3's nine

New findings use a fresh ID series (`CR-09`, `WR-27+`, `IN-23+`) so nothing collides
with the four ledgers above, all of which are preserved verbatim.

## Resolution of pass 4 (2026-08-24, round 4)

**Every disposition below was decided by EXECUTION.** I imported `auditSource` from
both AST gates and `normaliseObservedUrl` from the shipped `store/observations.ts`
into throwaway probe specs, ran 90-plus shapes through them, swept the `URL_MAX` cut
across 71 consecutive head lengths on two grammars, and deleted the probes.
`pnpm test` is **31 files / 1105 tests, all green**; `tsc --build`, `eslint .` and
`knip` are all clean. None of those facts can see any of the below.

| Finding | Status | Commit | The evidence |
|---|---|---|---|
| CR-08 | **fixed** | `834b9c5` / `90b4309` / `7b1f5f1` | All eight CR-08 shapes now report. Executed: `const k = "req"+"uests"; sdk[k].send(req)` → `outbound-unanalysable`, and the same through `let`, a bare assignment, a template, `.join("")` and an opaque call; `sdk[b ? "requests" : "net"]` → `outbound-send`; `sdk[(0,"requests")]` → `outbound-send`. The four measured-exempt real-tree sites are still quiet — `cur[key]`, `ctx[root]`, `segments[i]`, `MIGRATIONS[MIGRATIONS.length-1]` — and the whole-tree case runs green over 23 files. The `:1740-1744` `constStrings` fixture is gone from under the assembled-key rule and replaced by an explanation of why it was misplaced; every fixture now names its resolver in its own title and the mechanism→shape table at `:150-170` matches what I measured row for row. **This finding is closed, and its defect is not — see `CR-10`, which is the same shape one keyword over.** |
| WR-22 | **fixed** | `693cfd9` / `ff0f3c1` | The segment-boundary truncation landed and does what it says on the branch it covers. My own sweep, independent of the file's: 0 non-fixed-points over parameter-name lengths 1..40 at 900 parameters crossed with head lengths 10/500/1500/2000, worst-case segments lost **1**, and no output exceeds `URL_MAX` over 287 sampled lengths. The hard-coded 140-parameter fixture was replaced by a 128-cut search, which is the right repair. **The DISCLOSURE of what the fix does not cover is wrong in two directions — `WR-28` and `WR-29`.** |
| WR-23 | **fixed** | `9cf9162` | Executed: `const e = eval; e(s)`, `const { eval: ev } = globalThis as any; ev(s)`, `const F = Function; new F("a", s)`, `const W = WebSocket; new W(url)` all report. `const o = { eval(s){} }; o.eval(src)` stays quiet, so the receiver anchoring survived the widening. `shadowedGlobals` is a genuine AST proof and is correctly restricted to top-level `function`/`class`. |
| WR-24 | **fixed** | `194287a` / `79961ff` | Executed: all four review shapes now report, plus `&&`, plus the operator reached through every render form — `String(c?e:"x")`, `` `${c?e:"y"}` ``, `"x"+(c?e:"y")`, `[c?e:"y"].join("")`, `m += c?e.message:"y"`, `a.push(c?e.message:"y")`+`a.join("")`, and the copy hop `const x = c?e:new Error(); String(x)`. Every `describeError` twin stays quiet, so the descent did not reach past the safe form. **The framing check the reviewer was asked to make holds in the direction it was claimed**: this is a widening of a self-declared-open enumeration and the "does not claim to be closed" sentence is byte-identical (it survives in the diff as an unchanged context line). It now sits two lines below a new sentence that contradicts it — `WR-31`. |
| WR-25 | **fixed, and ITS OWN STATEMENT OF CONSEQUENCE IS CORRECTED HERE** | `d2e1907` | The predicate is lifted out as `versionLiterals`, four fixtures execute both directions, and the load-bearing one plants the literal into the real file's bytes. **The correction WR-25's entry needed, measured rather than argued:** WR-25 wrote "Break the predicate in any of several plausible ways — `=== 4`, `>= 4`, dropping the `?? []`, replacing `match` with `search`, tightening `DOTTED_NUMERIC` to require a leading `v` — and the gate stays green forever." Only **2 of those 5** were actually silent under the old inline gate. `scripts/phase1/tracer-e2e.sh` carries five `127.0.0.1` runs, so `=== 4` and `>= 4` both make the scan return those four-component hits against an `toEqual([])` and go **RED**; `match`→`search` returns a number whose `.filter` throws, also **RED**. The two that were genuinely silent are dropping the `?? []` (the file always carries a dotted-numeric run, so `match` never returned `null`) and the leading-`v` tightening (the file carries no `v`-prefixed run at all — verified: `grep -oE '[0-9]+(\.[0-9]+)+'` yields exactly `0.25` ×1 and `127.0.0.1` ×5, and `grep -nE 'v[0-9]+(\.[0-9]+)+'` yields nothing). **WR-25's core claim stands** — the filter's true branch had never executed anywhere in the suite, and two plausible breaks were undetectable — **and its "any of several plausible ways" was overstated by three.** |
| WR-26 | **fixed by correcting the docblock** | `2709f18` | Both fail-open branches of `isProvablyNumeric` now carry `ASSUMES BY NAME AND FAILS OPEN (WR-26)` in the code, the "PROVES rather than assumes / fails SAFE" sentence is gone, and the FINAL RESIDUAL names the heuristic. The measurement behind choosing the docblock over the branch is checkable: `sdk[o.length].send(req)` is silent under every variant because residual (b) silences it, and `sdk[o.length + 1]` is the `+`-composition class the branch protects. Verified both. |
| IN-20 | **fixed** | `2709f18` | `const g = globalThis; g.fetch(u)` reports, and so do the computed-member, dynamic-code, constructor, beacon and assignment spellings. The must-stay-quiet twin (`const g = { fetch(u){} }`) still reports `[]`. |
| IN-21 | **fixed** | `5f2d0bd` | `any("?" in r for r in raw_rows)` added to the conjunction, exactly as suggested. `padded_segments_reached` can no longer report REACHED off an empty generator. |
| IN-22 | **fixed** | `79961ff` | Both limits are now items 4 and 5 of the re-derived residual AND pinned by executed `RESIDUAL, PINNED (IN-22)` cases that assert `[]` today. Verified both fixtures resolve through the mechanism their titles name. |

**What round 4 did well, recorded so it is not re-litigated.** The CR-08 fix is the
first one in this phase that attacks the *recurrence* rather than the instance: every
fixture titles its resolver, the mechanism→shape table makes substituting one
mechanism for another visible, and the misplaced `constStrings` assertion was moved
out and replaced with a paragraph explaining what was wrong with its placement. The
WR-22 fix replaced a hard-coded fixture with a search, which is the correct general
lesson. Both are real progress. The findings below are what those two habits did not
yet reach.

---

## Critical Issues (pass 5)

### CR-09: The gate has no document-order bound on a READ, the fixture that says it does is green for a different reason, and the false sentence is copied into the four artifacts CORE-11's `[x]` was flipped against

**File:** `packages/backend/src/outbound-prohibition.spec.ts:210-214`, `:216-217`, `:253-258` (the FINAL RESIDUAL), fixture at `:2798-2807`; mechanism at `:1521` and `:1726`
**Severity:** BLOCKER

**Issue:** Round 4's plan 01-19 correctly discovered that alias sets chain to arbitrary
depth, split residual (a), and then wrote a *new* bound in place of the old one:

> What actually bounds an alias chain is DOCUMENT ORDER, not a hop count: a chain
> read before its root is bound is silent, because there is no symbol table and no
> second pass. (`:211-214`)

and, in the block the file says is copied WORD FOR WORD into `REQUIREMENTS.md`,
`STATE.md` and `WINDOWS.md`:

> …while a chain read BEFORE its root is bound is SILENT, because there is no symbol
> table and no second pass. (`:256-258`)

**There is a second pass.** `collect(sf)` at `:1521` walks the entire file to
completion, and only then does `visit(sf)` at `:1726` begin. Every alias set is fully
populated before a single violation is considered, so the position of the READ is
irrelevant to every rule in the file. Executed against `auditSource("probe.ts", src)`:

```
function z() { return g.fetch(u); }
const g = globalThis;                          ["outbound-fetch"]      // read first — REPORTS

function f() { return g2.fetch(u); }
const a2 = globalThis;
const g2 = a2;                                 ["outbound-fetch"]      // 2-hop chain read first — REPORTS

function z() { return sdk[k].send(req); }
const k = "requests";                          ["outbound-send"]       // key read first — REPORTS
```

The real bound is the order of the *bindings within a chain*, not the position of the
read: `const g = a; const a = globalThis;` is silent because `a` is not yet in the set
when `g`'s declaration is collected.

**The fixture cannot fail on the claim its title makes.** `:2798`:

```ts
it("through NOTHING: DOCUMENT ORDER, not a hop count, is what actually bounds an alias chain — a chain READ BEFORE ITS ROOT is silent", () => {
  expect(
    rulesOf("function z() { return g.fetch(u); }\nconst g = a;\nconst a = globalThis;"),
  ).toEqual([]);
});
```

That source is green because `const g = a` precedes `const a = globalThis` — the
BINDINGS are inverted. Delete the function wrapper entirely and it is still `[]`; move
the read to the bottom and it is still `[]`. The assertion is insensitive to the one
variable its title names. This is round 3's exact trap — a fixture resolving through a
different mechanism than the rule it sits under — reproduced inside the paragraph
round 4 wrote to replace the last false residual, which is the fifth consecutive
instance of this phase's signature defect and the second in a row inside the artifact
just rewritten for it.

**Residual (b) carries the same error.** `:216-217` exempts "a name whose binding is
out of document order or in another file"; the third executed line above shows a key
bound *after* its use reports normally. Only "in another file" survives.

**Why BLOCKER and not a documentation warning.** The sentence is not local. The file
states at `:249-252` that this block is copied word for word into three other
artifacts and that "If a reader finds those four disagreeing, the code wins and the
prose is the defect." I checked all three, and the sentence is verbatim in each:
`.planning/REQUIREMENTS.md:46` (inside the CORE-11 correction), `.planning/STATE.md:169`
(P9-D3's second pointer amendment), `.planning/WINDOWS.md:40` and `:315`, plus four
places in `01-19-SUMMARY.md`. `REQUIREMENTS.md:46` is the text CORE-11's `[x]` was
flipped against — the flip is defended by "the box is flipped after the discharge
table, not before it; the table is the evidence" — so the requirement now records a
model of its own gate that the gate does not implement, in the one document a Phase 2
author reads to learn what is already guaranteed.

**Fix:** state the bound the walk actually has, in one place, and make the fixture
sensitive to it.

```
//        What bounds an alias chain is the order of the BINDINGS WITHIN IT, not the
//        position of the read: `collect` completes a full pass before `visit` begins,
//        so a use site anywhere in the file sees every binding the file makes.
//        `const g = a; const a = globalThis; g.fetch(u)` is silent because `a` is not
//        yet in the set when `g` is collected. `const a = globalThis; const g = a;`
//        reports wherever `g.fetch(u)` is written, INCLUDING above both declarations.
```

Then split `:2798` into two cases with mechanism-named titles — one asserting the
inverted-binding silence, one asserting that the *read* position changes nothing
(`function z(){ return g.fetch(u); } const g = globalThis;` → `toContain("outbound-fetch")`),
which is the assertion that would have caught this. Propagate the corrected sentence
to all four artifacts, and correct residual (b) to drop "out of document order".

---

### CR-10: A receiver key whose FIRST binding is a harmless string literal shadows every later rebinding — `let k = "x"; k = "requests"; sdk[k].send(req)` reports nothing

**File:** `packages/backend/src/outbound-prohibition.spec.ts:1172-1195` (`keyReceiver`), `:1396-1400` (the `constStrings` collector), `:1454-1481` (the assignment collector); claim at `:83-85` and `:150-170`
**Severity:** BLOCKER

**Issue:** `constStrings` is written once, from a declaration whose initializer is a
string literal (`:1397-1400`), and the assignment collector at `:1454-1481` never
updates it. `keyReceiver` consults `literalOf` FIRST — deliberately, and the reason
given at `:1181-1184` is sound on its own terms — so a name that is in `constStrings`
resolves to its **first** literal and every branch below it is unreachable for that
name. Executed:

```
const k = "requests";              sdk[k].send(req)   ["outbound-send"]          // the documented row
let   k;  k = "requests";          sdk[k].send(req)   ["outbound-send"]
let   k;  k = "req" + "uests";     sdk[k].send(req)   ["outbound-unanalysable"]  // CR-08's assignment row

let k = "harmless"; k = "requests";      sdk[k].send(req)   []      <-- SILENT
let k = "harmless"; k = "req"+"uests";   sdk[k].send(req)   []      <-- SILENT
let k = "req";      k += "uests";        sdk[k].send(req)   []      <-- SILENT
```

Three things make this the same finding as `CR-08` rather than a new class of one.

1. **It is one keyword away from the shape CR-08 closed.** The gate resolves
   `let k; k = "req" + "uests"` and does not resolve `let k = "harmless"; k = "req" + "uests"`.
   The only difference is whether the declaration carried an initializer, and the
   initializer is the part that has nothing to do with the concealment.
2. **The site is completely readable.** In the first silent line both strings are
   string literals sitting in the AST twelve tokens apart. This is not a value the
   walk cannot follow; it is a value the walk reads and then discards in favour of a
   stale one. That distinction is the exact one residual (b) is built on — "the walk
   reports what it can see being HIDDEN and discloses what it merely cannot FOLLOW"
   (`:222-224`) — and this falls on the reporting side of it.
3. **Boundary 2 states the opposite property explicitly.** `:83-85`:

   > …which over-approximates rather than under-approximates: a name bound to an
   > outbound receiver anywhere in the file is treated as one everywhere in it.

   `k` is bound to `"requests"` in the file and is not treated as one anywhere. The
   sentence is false in the under-approximating direction, which is the direction a
   reader is told cannot happen.

Nothing discloses it. The FINAL RESIDUAL's exhaustive list — "A RECEIVER KEY resolves
exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma
sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the
walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name
bound in ANOTHER FILE" — covers none of the three silent lines. All three are one hop,
in this file, and none is a parameter or a loop binding. The mechanism table at
`:150-170` lists `const r = "requests"; sdk[r]` → `constStrings` → `outbound-send` and
says nothing about `let`; the `assembledNames` collector's own comment at `:1476-1478`
claims the assignment spelling is "covered by construction rather than by a second
edit", and it is covered only when the declaration had no initializer.

The `+=` line is the sharpest of the three, because the sibling gate one directory
away learned this specific lesson already: `WR-17` widened `error-redaction.spec.ts`
to `+=` on the argument that it is "one token away" from a form already covered. Here
the header claims assembly is read "in EVERY spelling — `+`, a template, `.join("")`,
an opaque call — and through EITHER a declaration or an assignment" (`:127-131`), and
`+=` is an assignment producing an assembly.

**Fix:** make the collectors describe the name's *current* binding rather than its
first, and stop letting a stale literal short-circuit the branches below it.

```ts
// in collect, on `x = <string literal>` and on `x += …`:
if (ts.isBinaryExpression(node) && ts.isIdentifier(node.left)) {
  const op = node.operatorToken.kind;
  if (op === ts.SyntaxKind.EqualsToken && ts.isStringLiteralLike(unwrap(node.right))) {
    constStrings.set(node.left.text, unwrap(node.right).text);   // REBIND, do not keep the first
  }
  // `k += "uests"` builds a string out of pieces exactly as `k = k + "uests"` does.
  if (op === ts.SyntaxKind.PlusEqualsToken &&
      !isProvablyNumeric(node.right, numericNames, poisonedNumericNames)) {
    assembledNames.add(node.left.text);
  }
}
```

and, because a name can now be BOTH a literal and an assembly, let `assembledNames`
win over a stale `constStrings` entry rather than the current unconditional
literal-first order — a name the walk watched being reassigned is a name whose single
literal answer is no longer trustworthy. Then add all three executed lines above as
failing-path cases beside the `assembledNames` block at `:2299-2350`, each titled with
its mechanism, and correct `:83-85` to say what the walk does: it over-approximates
for RECEIVER ALIASES and under-approximates for STRING KEYS, because one is grown from
the live set and the other is written once.

---

## Warnings (pass 5)

### WR-27: A conditional RECEIVER in call position reports nothing, while a conditional KEY and a conditional INITIALIZER both report — the third face of the same operator, added in the same round

**File:** `packages/backend/src/outbound-prohibition.spec.ts:1197-1225` (`receiverKind`), `:1289-1297` (`initializerReceiver`), `:1172-1195` (`keyReceiver`)

**Issue:** Round 4 added conditional handling in KEY position (`:1206-1219`) and argued
for it on the grounds that `sdk[b ? "requests" : "net"]` "HIDES NOTHING — both keys are
string literals naming outbound receivers — so it resolves to a NAMED receiver". The
identical argument applies to the receiver expression itself, and that spelling is
silent. Executed:

```
(b ? sdk.requests : sdk.net).send(req)                        []
const r = b ? sdk.requests : sdk.net; r.send(req)             ["outbound-send"]   // initializer position
sdk[b ? "requests" : "net"].send(req)                         ["outbound-send"]   // key position
sdk[b ? (c ? "requests" : "x") : "y"].send(req)               []                  // nested key
```

`initializerReceiver` unwraps a `ConditionalExpression`; `receiverKind` — the function
the property-access rule calls on the callee's receiver — does not, so a conditional
written directly in call position falls through every branch and returns `undefined`,
which every caller reads as "not a receiver". The nested-key line is the same gap
inside `keyReceiver`, whose docblock at `:1160-1170` claims it is the single definition
of "what a readable key is" called from "the direct key and both conditional branches,
so they cannot disagree about what the walk can read" — `keyReceiver` does not itself
handle a conditional, so the two *do* disagree the moment a conditional appears inside
one.

Neither shape is in any residual list: both are one expression, in this file, with
every operand a literal or a `requests`/`net` member.

**Fix:** hoist the conditional handling into `receiverKind`'s and `keyReceiver`'s own
descent instead of leaving one copy in `initializerReceiver` and one copy in the
element-access branch.

```ts
const receiverKind = (node: ts.Expression): ReceiverKind => {
  const inner = unwrap(node);
  if (ts.isConditionalExpression(inner)) {
    const t = receiverKind(inner.whenTrue);
    const f = receiverKind(inner.whenFalse);
    if (typeof t === "string") return t;
    if (typeof f === "string") return f;
    return t === UNREADABLE_RECEIVER || f === UNREADABLE_RECEIVER
      ? UNREADABLE_RECEIVER : undefined;
  }
  …
};
```

and give `keyReceiver` the same recursion so a nested conditional key resolves. Then
`initializerReceiver` becomes a call to `receiverKind` and the three copies collapse to
one, which is what its own docblock says was the goal. Add both executed shapes as
failing-path cases.

### WR-28: The head-side `;` truncation residual is asserted STABLE in three places; it is a fixed point at the one offset the fixture picked and not at 11 of the 71 adjacent ones

**File:** `packages/backend/src/store/observations.spec.ts:986-996`, `packages/backend/src/store/schema.spec.ts:270-274`, `packages/backend/src/store/observations.ts:447-450`

**Issue:** `observations.spec.ts:986-996` pins the head-side residual and states it as a
property:

> (b) RESIDUAL, PINNED: a head-side cut can still land inside a `;` parameter's marker.
> It is SEVERED but STABLE — a second pass re-expands the marker and re-truncates to the
> same byte — so it is a disclosure, not a fixed-point failure.

```ts
const headCut = normaliseObservedUrl(`https://cdn.test/${"p".repeat(2010)};jsessionid=SECRETSESSION`);
expect(normaliseObservedUrl(headCut)).toBe(headCut);
```

`schema.spec.ts:270-274` repeats it as the committed disclosure ("severed but STABLE,
since a second pass re-expands and re-truncates to the same byte") and
`observations.ts:448-450` repeats the same narrow framing ("a head-side cut can still
land inside a `;` parameter's `<redacted>` marker").

Swept, not argued — the same `;jsessionid=SECRETSESSION` input over path lengths
1990..2060:

```
head ';' non-fixed-points: 11 of 71
2019: "pppppppppp;jsessionid=" -> "ppppppppppp;<redacted>"   (2048 -> 2047)   <-- SHRINKS
2020: "ppppppppppp;jsessionid" -> "ppppppppppp;<redacted>"   (2048 -> 2048)
2021: "pppppppppppp;jsessioni" -> "pppppppppppp;<redacted"   (2048 -> 2048)
…
2029: "pppppppppppppppppppp;j" -> "pppppppppppppppppppp;<"   (2048 -> 2048)
```

The mechanism is WR-22's own, unchanged: when the cut lands inside the parameter
**name** rather than inside the marker, the second pass sees a `;` segment with no `=`
and P10-D1 redacts it whole. The fixture chose `"p".repeat(2010)`, which lands inside
`<redacted>` — nine offsets short of the band where the claim is false.

This is WR-22's lesson applied to one branch and not the other in the same commit. The
query-side idempotence fixture was correctly replaced by a 128-cut **search**; the
head-side branch got a **new hard-coded fixture** whose single result is then stated as
a general property in two other files. "The fixture is green on either side of it" is
the sentence `observations.spec.ts:884-886` writes about the defect it was fixing.

**Fix:** sweep the head-side branch the same way the query-side branch is swept, and
state the residual as what the sweep finds.

```ts
const unstable: number[] = [];
for (let n = 1990; n <= 2060; n += 1) {
  const once = normaliseObservedUrl(`https://cdn.test/${"p".repeat(n)};jsessionid=SECRETSESSION`);
  if (normaliseObservedUrl(once) !== once) unstable.push(n);
}
// Assert the SHAPE of the instability, not its absence: it is a disclosed residual.
expect(unstable.length).toBeGreaterThan(0);
expect(unstable.every((n) => n >= 2019 && n <= 2029)).toBe(true);
```

and correct all three prose sites: a head-side cut inside the `<redacted>` marker is
stable; a head-side cut inside the parameter NAME is not, and can shorten the stored
value by one byte on a second pass.

### WR-29: The no-separator residual is disclosed as "a query of a SINGLE segment"; the code's actual class is "any cut that lands before the query's first `&`"

**File:** `packages/backend/src/store/observations.spec.ts:998-1011`, `packages/backend/src/store/schema.spec.ts:274-278`

**Issue:** Both disclosures scope the non-idempotent class to a single-segment query:

> (2) a query of a SINGLE segment cut inside its NAME is NOT a fixed point at all

The code's condition is `q === -1 || amp <= q` (`observations.ts:478`) — there is no
`&` *inside the cut*. Segment count past the cut is irrelevant. Executed on a
**three**-segment query, sweeping the head length so the cut walks across the first
segment:

```
input: https://x.test/<p×n>?nnnnnnnnnnnnnnnn=1&b=2&c=3

n=2015  once "…?nnnnnnnnnnnnnnnn=" (2048)  twice "…ppppppp?<redacted>" (2041)   NOT a fixed point
n=2016  once "…p?nnnnnnnnnnnnnnnn" (2048)  twice "…ppppppp?<redacted>" (2042)   NOT a fixed point
…
17 of the 71 swept head lengths are not fixed points, with an otherwise ordinary
multi-parameter query.
```

A reader of either disclosure concludes that a URL with more than one query parameter
is outside the residual. It is not. The class is defined by where the 2048-byte cut
falls, not by how many parameters the URL has — and a bundle URL with a long path and
a long first parameter is a more ordinary shape than a single-parameter one.

**Fix:** restate both disclosures against the branch condition rather than against the
fixture that found it — "a cut that lands before the query's first `&`, whatever the
query's segment count" — and add one multi-segment case to
`observations.spec.ts:998-1011` so the pin covers the class it names.

### WR-30: Three docblocks still assert the one-hop alias bound that plan 01-19 measured to be false, and one of them is contradicted by a passing test 1,800 lines below it

**File:** `packages/backend/src/outbound-prohibition.spec.ts:969-970`, `:1104-1105`, `:237-238`

**Issue:** Plan 01-19's whole second half is the discovery that every alias set chains
to arbitrary depth. The residual list was corrected. Three statements of the old,
false bound were left in place:

- `:969-970`, on `isGlobalReceiverIn`:
  > ONE HOP AND NO MORE: `const a = globalThis; const g = a; g.fetch(u)` is silent, and
  > that is residual (a).

  `:2782-2785`, in the same file, asserts that **exact source string** reports
  `outbound-fetch`. Both currently pass; they cannot both be true. Executed: it reports.

- `:1104-1105`, on `globalAliases`:
  > ONE HOP AND NO MORE, exactly like every other set in this pass:
  > `const a = eval; const b = a; b(s)` is silent, and that is residual (a).

  Executed: `["outbound-dynamic-code"]` at two hops and at three.

- `:237-238`, residual (c):
  > `navigator` reached through more than one hop, or returned by a helper, is outside
  > the beacon rule for the same reason as (a).

  Executed: `const a = navigator; const b = a; b.sendBeacon("/x", d)` →
  `["outbound-beacon"]`. "The same reason as (a)" now points at a residual whose
  corrected text says the opposite.

`:1046-1047`'s identical sentence on `assembledNames` is the one that is **correct**
(keys read the initializer's shape and genuinely do not chain), which is precisely why
the other three read as true to a skimming reader.

The direction is safe — the gate reaches further than these three sentences say — but a
residual list is trusted for its completeness in both directions, and that is the
argument `01-19-SUMMARY.md:444` itself makes when recording the alias discovery.

**Fix:** delete the three stale sentences and replace each with a pointer to the single
corrected residual (a), rather than restating a bound in four places that can drift
apart again. Then add the two-hop `navigator` and two-hop `eval` shapes to the
transitivity case at `:2772` so all five alias sets are asserted chaining, not just
three.

### WR-31: "everything on it is executed below" now sits two lines under "Items 1-3 are deliberately NOT pinned"

**File:** `packages/backend/src/store/error-redaction.spec.ts:144-151`

**Issue:** The closing sentence of boundary 2's residual paragraph is byte-identical to
what it was before round 4 — the diff carries it as an unchanged context line, and the
plan's claim to that effect is accurate. What changed is what it now terminates:

```
//        …Items 1-3 are
//        deliberately NOT pinned, and that is the other half of the decision:
//        each names an open CLASS rather than one shape…
//        A render taking any of those five shapes is not
//        seen. The list is an ENUMERATION and it does not claim to be closed;
//        what it claims is that everything on it is executed below.
```

Under the nearest-antecedent reading, "the list" is the five-item residual, and
"everything on it is executed below" is false for three of the five by the file's own
statement two lines earlier. Under the intended reading, "the list" is the render-form
enumeration eighty lines up. Round 4 did not introduce the ambiguity; it inserted an
explicit non-execution statement immediately before it, which converts an ambiguity
into a self-contradiction in a paragraph whose entire subject is that residual lists
must be trusted for their completeness.

**Fix:** name the antecedent — "The RENDER-FORM list above is an ENUMERATION…" — or move
the sentence back up to the render-form paragraph it was written about. One word.

---

## Info (pass 5)

### IN-23: `versionLiterals`' `export` buys nothing, and its own docblock names the counterexample

`tests/pins.spec.ts:342`. The docblock says the function is "EXPORTED so its FAILING
path can be executed against a fixture rather than argued about" — but its only caller
and all four of its fixtures are in the same module, where a module-local function is
equally executable. The docblock concedes this two sentences earlier: it records that
`observations.spec.ts` keeps `auditPatternUse` "module-local, not exported" and runs
its failing path in its own file. The lift-out is the fix; the `export` keyword is not
part of it, and stating a testability reason for it makes a reader believe the two are
connected.

### IN-24: A two-component version literal is unenforceable by construction, and the case title says otherwise

`tests/pins.spec.ts:378` is titled "names no Caido version literal anywhere, COMMENTS
INCLUDED", and `versionLiterals` requires exactly three components. `# taken on Caido
0.58` is a version literal in prose and is invisible, and it must stay invisible
because the fixture at `:388` requires `0.25` to pass. The header states the rule ("a
dotted-numeric run of EXACTLY THREE components") but never says that a two-component
spelling of the same claim is therefore permanently outside it. One sentence in the
header, beside the `0.25` justification that creates the gap.

### IN-25: Two of the five re-derived residual items name shapes that DO report

`packages/backend/src/store/error-redaction.spec.ts:118-130`. Item 1 offers `padEnd`,
`repeat`, `replace` as unseen renders and item 3 includes "a value routed through an
object or array LITERAL". Executed in the two positions the gate actually guards:

```
catch(e){ return { ok:false, error: e.message.padEnd(10) }; }        ["unredacted-object-value"]
catch(e){ return { ok:false, error: e.message.replace("a","b") }; }  ["unredacted-object-value"]
catch(e){ const o = { m: e.message }; return { ok:false, error: o.m }; }  ["unredacted-object-value"]
catch(e){ const a = [e.message]; return { ok:false, error: a[0] }; }      []
catch(e){ return { ok:false, error: fmt(e) }; }                          []
```

`derivesFrom` follows a member call, so an unnamed method is transparent rather than
opaque, and an object literal is itself a guarded position. Only the array-literal half
of item 3 and the bare-identifier helper of item 2 are genuinely open. The list was
"read off the BRANCHES of `derivesFrom`", which is the right method, and it enumerated
the descent's limits without crossing them with the position rules that catch some of
them anyway. Harmless direction, but a residual overstated is the same failure mode as
a residual understated in a paragraph that says so itself.

### IN-26: A destructured key binding is not collected into `assembledNames`

`packages/backend/src/outbound-prohibition.spec.ts:1424-1449`. The collector handles a
`VariableDeclaration` with an identifier name and an object-binding pattern for
*receiver* names, but the `assembledNames` branch runs only under
`ts.isIdentifier(node.name)`. Executed: `const { k } = { k: "req" + "uests" }; sdk[k].send(req)`
and `const [k] = ["req" + "uests"]; sdk[k].send(req)` both report `[]`, while the header
at `:127-131` says the assembly is read "through EITHER a declaration or an assignment".
Both are declarations. Unreachable in the real tree today and the same two lines to
close as `CR-10`'s assignment case.

---
---

# --- PASS 6 --- Gap-Closure ROUND 5 Review (plans 01-23 … 01-28)

**Reviewed:** 2026-08-24T16:30:00Z
**Depth:** standard
**Files Reviewed:** 6 (the files plans 01-23 … 01-28 changed after the pass-5 review)
**Status:** issues_found — 3 BLOCKER, 6 WARNING, 4 INFO, on top of a clean sweep of round 4's eleven

New findings use a fresh ID series (`CR-11`, `WR-32+`, `IN-27+`) so nothing collides
with the five ledgers above, all of which are preserved verbatim.

## Resolution of pass 5 (2026-08-24, round 5)

**Every disposition below was decided by EXECUTION.** I imported `auditSource` from
both AST gates, `normaliseObservedUrl` from the shipped `store/observations.ts`, and
`deriveResidual` / `enumerateResolverPopulations` / `extractDerivedBlock` from the
outbound gate into throwaway probe specs; ran ~120 source shapes through the two
gates; swept 16,160 URL inputs (40 parameter-name lengths × 101 head offsets × 4
grammars × 2 passes); mutated one branch of the walk and re-ran the derived block; and
deleted the probes. `pnpm test` is **31 files / 1200 tests, all green**; `tsc --build`,
`eslint .` and `knip` are clean; `git status` shows no source file touched by this
review. None of those facts can see any of the below.

| Finding | Status | Commit | The evidence |
|---|---|---|---|
| CR-09 | **fixed** | `181530f` / `af8dd5b` / `f3d3a06` | The read-position bound is gone and the collect/visit bound replaces it in all five in-file sites plus the three ledgers. Executed: `function z() { return g.fetch(u); }\nconst g = globalThis;` → `["outbound-fetch"]`; the same for `sdk[r]`/`const r = "requests"`, `sdk[k]`/assembled key, `s.send`/`const s = sdk.requests`, `n.sendBeacon`/`const n = navigator`, `e("x")`/`const e = eval`. The inverted-binding twin `const g = a; const a = globalThis;` is `[]`. The `:2798` fixture is split, and the three-case discrimination at `:5638` varies binding order and read order SEPARATELY — which is the pair the single case could not distinguish. Residual (b)'s "out of document order" item is deleted, not softened. |
| CR-10 | **fixed** | `482fc26` / `c151ce3` / `e657cc9` | All three silent shapes report: `let k = "harmless"; k = "requests"` → `outbound-send`; `let k = "harmless"; k = "req"+"uests"` → `outbound-unanalysable`; `let k = "req"; k += "uests"` → `outbound-unanalysable`. `constStrings` is now `Map<string, Set<string>>` written at both branches, `assembledNames` takes precedence over a stale literal, and the ANY-BINDING-WINS mirror is pinned. **Both of 01-24's own reported discrepancies check out:** the CONTROL `let k; k = "requests"` reports today (the review's prediction for the pre-fix state was wrong, as recorded), and the widening's live catch `let s = "harmless"; s = "caido:http"; await import(s)` → `outbound-unanalysable`, against `const s = "caido:http"` → `outbound-import`. Boundary 2 now states the error direction PER COLLECTOR FAMILY rather than once for the gate, which is the right repair. |
| WR-27 | **fixed** | `278a0d2` / `1067f4f` | `(b ? sdk.requests : sdk.net).send(req)`, `(sdk.requests ?? sdk.net)`, `(... \|\| ...)`, `(ok && sdk.requests)` and the nested key `sdk[b ? (c ? "requests" : "x") : "y"]` all report. The must-stay-quiet twins `(b ? cache : client)`, `(cache ?? client)`, `(cache \|\| client)`, `(ready && cache)` are all `[]`. Three copies of the descent collapsed into `operatorReceiver`; the `??` precedence bug is gone. The `(ok && globalThis)` family it opened and disclosed is real — **and its disclosure is wider than the code, which is `CR-11`.** |
| WR-28 | **fixed** | `ec2ecd3` | The chosen offset is replaced by a 71-offset sweep asserting the instability's SHAPE (non-empty, contiguous, strictly interior) rather than a literal band, and the exemplar is read out of the run. My own sweep, independent of the file's: head-side unstable set is exactly `{2019…2029}`, 11 of 71, stable at 1500–2018 and 2030–2200. **The MECHANISM the three disclosures name is wrong for the offset the fixture exhibits — `WR-35`.** |
| WR-29 | **fixed** | `ec2ecd3` / `e5b236e` | Both disclosures now state the class against the branch condition (`q === -1 \|\| amp <= q`) rather than against segment count, and a three-parameter sweep is added. Measured: 17 of 71 multi-segment offsets (`2015…2031`) are not fixed points, with an ordinary three-parameter query. |
| WR-30 | **fixed** | `b0b0f92` | The three stale one-hop sentences are gone; exactly ONE survives, on `assembledNames` (`:2078`), which is the one that is true. Executed: two-hop `globalThis` → `outbound-fetch`, two-hop `eval` → `outbound-dynamic-code`, two-hop `navigator` → `outbound-beacon`; the assembled-key twin `const a = "req"+"uests"; const b = a` is `[]`. The five-set transitivity case at `:5533` covers all five at three hops. |
| WR-31 | **fixed** | `e5b236e` | The antecedent is named ("THE RENDER-FORM LIST eighty lines above — not the five-item residual immediately above"), and the pinned/unpinned split is restated so it matches the items above it. |
| IN-23 | **fixed** | `e5b236e` | `export` removed; `versionLiterals` is module-local and its four fixtures still run. `knip` clean. |
| IN-24 | **fixed** | `e5b236e` | The two-component gap is stated in the header beside the `0.25` justification that creates it, and the case title now says THREE-COMPONENT. |
| IN-25 | **fixed** | `e5b236e` | Item 1 withdrawn by execution and pinned in the FIRING direction; item 3's two overstated halves corrected and pinned; the surviving halves pinned as measured silences. I re-executed all of them and every stated answer is right. **The correction introduced one new overstatement of its own — `WR-36`.** |
| IN-26 | **fixed** | `b0b0f92` | `const { k } = { k: "req"+"uests" }`, `const [k] = ["req"+"uests"]` and the renamed `{ p: k }` spelling all report `outbound-unanalysable`; the four must-stay-quiet twins are `[]`. Residual (b2) — the destructured PLAIN literal — is `[]` and is now a registry row with an executed probe and counter-probe. |

**What round 5 did well, recorded so it is not re-litigated, and it is the most
substantial thing this phase has built.** Three things are genuinely load-bearing and
I verified each independently rather than reading the summaries:

1. **The two shipped spans are byte-identical.** `extractDerivedBlock`'s semantics
   reproduced in Python: gate header lines 798–1092, `.planning/REQUIREMENTS.md` lines
   61–355, **295 lines each, sha256 `91978e313c54…`, equal**. The comparison is real
   and it runs before the box is examined.
2. **The coverage guard is not decorative.** Injecting `function sneakyResolver(` at
   module scope in the resolver region and `const sneakyInner = (` at auditSource's own
   indentation each show up in `enumerateResolverPopulations`' output, so both the
   `unaccounted` assertion and the pinned counts (`11` collectors, `38` functions) go
   red. Non-vacuity is asserted before the rule in both populations, and population 3
   is DECLARED rather than discovered — the shapes I confirmed it misses
   (`const f = function () {}`, `async (n) => n`, `<T,>(n: T) => n`) are all inside
   what the docblock already says it cannot see.
3. **The URL redaction half holds, measured rather than argued.** 16,160 inputs across
   40 parameter-name lengths, 101 head offsets and four grammars (`;` parameter, query
   parameter, multi-`;` segment, userinfo), checked at pass 1 and pass 2: **0 secret
   survivals, 0 partial-prefix survivals at any prefix length ≥ 6, 0 outputs over
   `URL_MAX`, and every input a fixed point by pass 3.** The instability the residual
   discloses destroys parameter NAMES and never exposes a value. That is worth stating
   plainly: the finding class in this file is disclosure accuracy, not exposure.

Replacing a chosen offset with a shape assertion, and refusing to hard-code the band
because "a number with no derivation" would go red for the wrong reason, is the right
general lesson and the second time this phase has drawn it. The findings below are
what those habits did not yet reach — and two of them are in the derived mechanism
itself, which is exactly where they matter most.

---

## Critical Issues (pass 6)

### CR-11: The machine-owned derived text carries a FALSE UNIVERSAL — `silence-operator-around-global-receiver` says silence "in every spelling", and FOUR spellings report

**File:** `packages/backend/src/outbound-prohibition.spec.ts:3446-3457` (the registry row), rendered at `:1083-1090` and shipped byte-identically at `.planning/REQUIREMENTS.md:342-349`
**Severity:** BLOCKER

**Issue:** The registry row's `clause` is the sentence the generated block prints:

> `silence-operator-around-global-receiver` — OPEN AND UNOWNED … so an operator
> wrapping a GLOBAL receiver is **silent in every spelling**. The same operator around
> an SDK receiver reports — the boundary is the RESOLVER, not the operator

Executed against `auditSource("p.ts", src)`:

```
(ok && globalThis).fetch(url)          []                    <- the row's own probe
(g ?? globalThis)["fetch"](url)        []
(b ? globalThis : x).fetch(url)        []
(b ? navigator : x).sendBeacon(u, d)   []
(b ? eval : x)(src)                    []

(0, globalThis).fetch(url)             ["outbound-fetch"]    <-- REPORTS
(globalThis).fetch(url)                ["outbound-fetch"]    <-- REPORTS
(globalThis as any).fetch(url)         ["outbound-fetch"]    <-- REPORTS
globalThis!.fetch(url)                 ["outbound-fetch"]    <-- REPORTS
(0, eval)(src)                         ["outbound-dynamic-code"]
(0, navigator).sendBeacon(u, d)        ["outbound-beacon"]
(0, fetch)(url)                        ["outbound-fetch"]
```

Four wrapper spellings — comma sequence, bare parentheses, `as` assertion, non-null
assertion — resolve through `unwrap` before any receiver resolver is reached, so the
global receiver is found. The row asserts they do not.

Three things make this a BLOCKER rather than a copy-editing note.

1. **Two registry rows contradict each other and both pass.** Four entries above,
   the `unwrap` row states exactly the mechanism that falsifies this one — "strips
   parentheses, `as`/satisfies assertions, non-null assertions and a COMMA SEQUENCE
   down to its rightmost operand, so a wrapped receiver is still that receiver" — with
   the probe `(0, sdk.net).connect(x)`. Each row's probe is chosen to match its own
   clause, so neither can ever see the other. That is the failure mode this whole
   mechanism was built to remove, reproduced inside it: **an assertion that passes
   against the defective output it claims to catch.**
2. **It is in the text the phase has designated as authoritative.** The generated
   preamble says "If the two disagree the GENERATED text is authoritative and the
   shipped text is the defect", and `.planning/REQUIREMENTS.md:52` says this is "the
   text a requirement's COMPLETION is read against". A reader auditing CORE-11's
   blindness list holding `(0, globalThis).fetch(url)` is told by the authoritative
   text that it is silent. It is not.
3. **It is the entry CORE-11's `[ ]` is blocked on.** `.planning/REQUIREMENTS.md:46`
   names `silence-operator-around-global-receiver` as the one row that did not
   discharge. The blocking row's own statement of its scope is wrong.

`01-28` found ONE of these four (`(0, globalThis)`) and recorded it in the ledger's
prose while deliberately not touching the registry — so the ledger now contains a
paragraph saying the machine-owned span two hundred lines below it is wrong about one
spelling, while the span is wrong about four. A disclosure of a defect is not a fix,
and here it also under-reports the defect it discloses.

**Fix:** correct the clause to name the resolver boundary rather than "every spelling",
and add the shapes that report as the counter-probe, so the row's two directions
straddle the real boundary instead of sitting on one side of it.

```ts
clause:
  "OPEN AND UNOWNED: operatorReceiver is reached from receiverKind and keyReceiver " +
  "and from nowhere else, so a RECEIVER_OPERATORS expression (`? :`, `??`, `||`, " +
  "`&&`) wrapping a GLOBAL receiver is silent. It is NOT true of every wrapper: a " +
  "COMMA SEQUENCE, parentheses, an `as` assertion and a non-null assertion are " +
  "removed by unwrap before any resolver runs, so those spellings REPORT - that is " +
  "the counter-probe",
probe: "(ok && globalThis).fetch(url);",
expect: [],
counterProbe: "(0, globalThis).fetch(url);",
counterExpect: ["outbound-fetch"],
```

Then regenerate both spans, and correct `.planning/REQUIREMENTS.md:46`'s paragraph so
it names four spellings rather than one. The SDK-receiver contrast the row currently
uses as its counter-probe belongs in the clause text, where it already is.

---

### CR-12: A LOGICAL-ASSIGNMENT binding is invisible to every collector — `let r; r ??= sdk.requests; r.send(req)` reports nothing, and the file's own comment names the shape eleven lines below

**File:** `packages/backend/src/outbound-prohibition.spec.ts:2643-2687` (the assignment collector) vs `:2725-2735` (the numeric-poisoning arm); claims at `:105-110` and in the `receiverAliases` registry row (`:1029-1035`, rendered at `:857-863`)
**Severity:** BLOCKER

**Issue:** `collect`'s assignment branch is gated on `node.operatorToken.kind === ts.SyntaxKind.EqualsToken`. Every logical assignment therefore grows nothing —
not `receiverAliases`, not `fetchAliases`, not `navigatorAliases`, not `globalAliases`,
not `globalThisAliases`, not `constStrings`, not `assembledNames`. Executed:

```
let r; r ??= sdk.requests;  r.send(req)          []      <-- SILENT
let r; r ||= sdk.requests;  r.send(req)          []      <-- SILENT
let r; r &&= sdk.requests;  r.send(req)          []      <-- SILENT
let g; g ||= globalThis;    g.fetch(u)           []      <-- SILENT
let f; f ??= fetch;         f(u)                 []      <-- SILENT
let e; e ||= eval;          e(s)                 []      <-- SILENT
let n; n ??= navigator;     n.sendBeacon(u, d)   []      <-- SILENT
let k; k ??= "requests";    sdk[k].send(req)     []      <-- SILENT

let r; r  =  sdk.requests;  r.send(req)          ["outbound-send"]        // the CONTROL
let g; g  =  globalThis;    g.fetch(u)           ["outbound-fetch"]
let k; k  =  "requests";    sdk[k].send(req)     ["outbound-send"]
```

`r ??= sdk.requests` is the ordinary lazy-init spelling of the line directly above it.
The difference between the reported form and the silent one is two characters.

**The file already knows the shape exists.** Eleven lines below the branch that misses
it, the numeric-poisoning arm reads:

```ts
} else if (ASSIGNMENT_OPERATORS.has(op) && !NUMERIC_COMPOUND_ASSIGNMENTS.has(op)) {
  // `x ||= sdk.requests` and friends can assign anything at all.
  poisonedNumericNames.add(node.left.text);
}
```

So `ASSIGNMENT_OPERATORS` is already a declared set, the exact expression
`x ||= sdk.requests` is already written down as the motivating example, and the walk
already reacts to it — by removing a numeric exemption, and by doing nothing else.
A gate that watches `x ||= sdk.requests` go past, names it in a comment, and grows no
alias from it is not a gate that "cannot follow" the value; it is one that reads the
value and discards it. That is the reporting side of this file's own
reported-versus-followed distinction (`:222-224`), which is the same argument `CR-10`
was raised on and closed on.

**It is under two positive claims, so the residual's non-exhaustiveness disclaimer does
not cover it.** Header boundary 2 (`:105-110`) enumerates the binding shapes a receiver
resolves through and includes "an assignment (`r = sdk.requests`)"; the derived
`receiverAliases` row says "a name bound to an outbound RECEIVER expression is that
receiver **everywhere in the file**". `r` is bound to `sdk.requests` in the file and is
a receiver nowhere in it. No MEASURED SILENCE entry names a logical assignment: it is
one hop, in this file, not a parameter, not a loop binding, not a destructure, not an
operator in receiver position, and its binding is in dependency order.

**Fix:** the branch already has the set it needs. Widen the guard and let every
collector under it run, exactly as `CR-10` widened the string half of the same branch.

```ts
const ASSIGNING_OPERATORS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
]);

if (
  ts.isBinaryExpression(node) &&
  ASSIGNING_OPERATORS.has(node.operatorToken.kind) &&
  ts.isIdentifier(node.left)
) {
  /* … the existing body, unchanged … */
}
```

The direction is the same over-approximation every alias set already takes — a name
that *may* be bound to `sdk.requests` is treated as one — which is what
`RECEIVER_OPERATORS` already decided for `&&` by measurement. Then add the eight
executed lines above as failing-path cases, each titled with the collector it exercises,
and add a `logical-assignment` row (or widen the `receiverAliases` clause) so the
registry describes the branch rather than one of its operators.

---

### CR-13: A receiver KEY bound to a CONDITIONAL is silent, while the MEMBER and SPECIFIER twins of the identical conditional both report `outbound-unanalysable`

**File:** `packages/backend/src/outbound-prohibition.spec.ts:2272-2325` (`keyReceiver`) with `:2553-2566` (`bindString` / `assembledNames` at the declaration branch); claims at `:126-131`, `:519-533` and the `keyReceiver` registry row (`:1050-1057`)
**Severity:** BLOCKER

**Issue:** `keyReceiver`'s operator descent runs on the expression written **at the key
site**. A name whose *initializer* is a conditional is never read: `bindString` requires
a bare string literal after `unwrap`, and `isAssembledKey` answers false for a
`ConditionalExpression`. So the name lands in neither `constStrings` nor
`assembledNames`, and step 4 returns "not a receiver". Executed:

```
sdk[b ? "requests" : "net"].send(req)                     ["outbound-send"]          // key site
const r = b ? sdk.requests : sdk.net; r.send(req)         ["outbound-send"]          // receiver initializer
const m = b ? "send" : "get"; sdk.requests[m](req)        ["outbound-unanalysable"]  // MEMBER name
const s = b ? "caido:http" : "crypto"; await import(s)    ["outbound-unanalysable"]  // SPECIFIER

const k = b ? "requests" : "net"; sdk[k].send(req)        []      <-- SILENT
let   k; k = b ? "requests" : "net"; sdk[k].send(req)     []      <-- SILENT
```

Both silent lines contain the literal string `"requests"`, in this file, one hop from
the call, on both branches of a two-branch operator the gate resolves at three other
positions.

**This is `WR-19`'s asymmetry at a fifth position, and the file's central promise is the
thing it violates.** Boundary 2 (`:129-134`): "Anything it CANNOT read on an identified
receiver, and any module specifier it cannot reduce to a literal, is REPORTED as
`outbound-unanalysable`. 'Could not read' does not mean 'clean'; that equivalence is
the specific defect this rewrite removes." Here the walk cannot reduce the key to a
literal and answers clean — while the member-name and specifier twins of the *same*
expression, resolved by `literalOf` two functions away, correctly report unanalysable.
The gate is internally inconsistent about one expression shape depending only on which
position it is bound for.

The wave-25 paragraph at `:519-533` states "THE OPERATOR CLASS IS CLOSED IN ALL FOUR
POSITIONS AS OF WAVE 25" and enumerates call-receiver, key, initializer and nested key.
There is a fifth — the initializer of a name later used as a key — and no residual
entry names it. `silence-two-hop-key` is the nearest, and it does not apply: this is one
hop, and the reason it is silent is not chaining but that the collectors read only two
of the three shapes an initializer can take.

**Fix:** the collectors already have the resolver. Read the initializer through the same
descent the key site uses, and record the result in whichever map its answer implies.

```ts
// in collect, on a VariableDeclaration / assignment with an identifier name:
//   const k = b ? "requests" : "net"   -> every literal on every branch
for (const literal of operatorLiterals(init)) bindString(node.name.text, literal);
// where operatorLiterals descends RECEIVER_OPERATORS collecting literalsOf on each
// operand, and marks the name in `assembledNames` if ANY operand is unreadable.
```

`ANY-BINDING-WINS` already gives the right answer once both branch literals are in the
map: `sdk[k]` reports `outbound-send`, matching the key-site spelling exactly. A branch
the walk cannot read makes the name an assembly, matching the member/specifier twins.
Then add the two executed lines above as failing-path cases titled for `constStrings`'
operator reading, add the mixed case `const k = b ? "requests" : someName` asserting
`outbound-unanalysable`, and add a row to the mechanism table at `:150-170` — this is
exactly the spelling a reader arrives holding and there is no row for it.

---

## Warnings (pass 6)

### WR-32: The generated preamble's point 1 — "a branch removed from the walk turns its own entry red" — is false, is contradicted by its own point 3 three lines later, and I proved it by mutation

**File:** `packages/backend/src/outbound-prohibition.spec.ts:3520-3540` (`deriveResidual`'s preamble lines), rendered at `:846-856` and shipped at `.planning/REQUIREMENTS.md:68-78`

**Issue:** The machine-owned text opens with four numbered claims. Point 1:

> 1. Each entry below is verified by EXECUTION: its probe and its counter-probe are run
>    through auditSource and asserted against the rule identifiers recorded here, **so a
>    branch removed from the walk turns its own entry red.**

Point 3, three lines down:

> 3. Each entry's probes are EXAMPLES. They prove the entry true OF ITSELF and do not
>    cover that resolver's whole domain.

Both cannot be true. A mechanism whose probes do not cover its domain cannot turn red
for every branch removed from it. Point 3 is the honest one and point 1 is the
overreach — and the gap is not hypothetical, because several clauses enumerate more
branches than their single probe exercises. `assembledNames`' clause names four:

> a name the walk WATCHED being assembled — **at a declaration, an assignment, a
> compound assignment, or either binding-pattern spelling** — is an UNREADABLE key

and its probe is `const k = "req" + "uests"` — the declaration branch only.

**Executed, not argued.** I deleted the compound-assignment branch outright:

```ts
    // MUTATION: compound-assignment assembly branch REMOVED
```

and ran the derived-residual block:

```
pnpm exec vitest run packages/backend/src/outbound-prohibition.spec.ts -t "the residual is DERIVED"
  ✓ 52 passed | 210 skipped
```

**All 52 assertions of the derived mechanism stayed green with a branch its own text
names deleted from the walk.** (The full file does go red — the hand-written CR-10
fixture at `:4687` catches it with `expected [] to include 'outbound-unanalysable'` —
which is why this is a WARNING and not a BLOCKER. The compensating coverage is the
hand-written fixtures the derivation was built to make secondary.) File restored;
`git status` clean.

**Fix:** state what the mechanism has. One sentence, and it is the same repair CR-11
needs:

```
1. Each entry below is verified by EXECUTION: its probe and its counter-probe are
   run through auditSource and asserted against the rule identifiers recorded here,
   so THE BRANCH EACH PROBE EXERCISES turns its own entry red. A clause naming
   several branches is NOT covered branch by branch - see point 3 - and the
   hand-written fixtures below are what cover the rest.
```

Alternatively give `ResolverRecord` a `probes: readonly {src, expect}[]` array and one
probe per branch a clause names, which would make point 1 true rather than deleted.
Either is fine; leaving a claim that a one-line mutation falsifies is not.

### WR-33: Two `RESOLVER_EXEMPTIONS` reasons are false, and they excuse exactly the population-3 residue the guard declares it cannot see

**File:** `packages/backend/src/outbound-prohibition.spec.ts:3668-3675`

**Issue:** The exemption list's own docblock says "a reviewer can read this list and
DISAGREE with an entry. An unnamed blind spot cannot be disagreed with." Taking it up on
that:

- `collect`: *"the first document-order pass. It invokes the collectors and records
  bindings; **it decides nothing about what an expression IS**."* It does. The
  compound-assignment branch at `:2707-2714` decides that `k += x` makes `k` an
  assembly — a judgement about an expression, written inline, delegated to no registered
  mechanism (`isProvablyNumeric` is consulted as a guard, not as the decision). The
  logical-assignment omission in `CR-12` is a second decision made in that same
  function by the shape of its `if`.
- `visit`: *"the second document-order pass … **every resolution it performs is
  delegated to a registered mechanism**."* It does not. `require("caido:http")` is
  decided entirely inline — `ts.isIdentifier(callee) && callee.text === "require"` — with
  no registered resolver behind it, and the destructure-off-`navigator` rule at
  `:2771-2789` reads binding elements inline.

Both false reasons sit on the two functions that *contain* population 3. The docblock
correctly declares that "an inline branch in `collect` or `visit`" is enumerated by
neither half — and then the exemption text for those two functions asserts that neither
contains one. A reader checking whether the residue is real is told twice that it is
not, by the two entries that hold it.

**Fix:** say what they are, so the declared blind spot and the exemption list agree.

```ts
collect:
  "the first document-order pass. It invokes the collectors and records bindings. " +
  "IT ALSO CARRIES INLINE DECISIONS - the compound-assignment assembly branch, and " +
  "the operator set its assignment branch matches on - which are POPULATION 3: " +
  "enumerated by neither half of this guard and covered only by hand-written fixtures.",
visit:
  "the second document-order pass. Most resolutions are delegated to a registered " +
  "mechanism; the `require(...)` specifier rule and the navigator-destructure rule " +
  "are decided INLINE and are POPULATION 3.",
```

### WR-34: The case titled "its box is what plan 01-27 left it" does not check the box — the regex accepts `[ ]` and `[x]` alike

**File:** `packages/backend/src/outbound-prohibition.spec.ts:6069-6079`

**Issue:**

```ts
it("CORE-11's entry is present and well-formed, and its box is what plan 01-27 left it", () => {
  const rows = text.split("\n").filter((l) => /^- \[[ x]\] \*\*CORE-11\*\*/.test(l));
  expect(rows.length, `… should carry exactly one CORE-11 checkbox row; it carries ${rows.length}.`).toBe(1);
});
```

The character class `[ x]` matches both states and the only assertion is a row COUNT.
Flipping `.planning/REQUIREMENTS.md:46` from `- [ ]` to `- [x]` keeps `rows.length === 1`
and the suite green. The title states an enforcement the body does not perform.

This is not an abstract nit. This phase has flipped CORE-11's box early twice and
reverted it twice — `e7cc4b6` and `faca607` — and `01-28`'s entire product is the
decision to leave it `[ ]` with a named blocking row. This case is the only mechanical
thing standing between that decision and a third premature flip, and it is the one
check in a 52-assertion block that does not check what its title says.

**Fix:** assert the state, with the reason in the message.

```ts
const CORE11_BOX_EXPECTED = "- [ ]"; // wave 28: blocked by silence-operator-around-global-receiver
expect(rows.length, "…").toBe(1);
expect(
  rows[0].startsWith(CORE11_BOX_EXPECTED),
  `CORE-11's box is not \`${CORE11_BOX_EXPECTED}\`. Two earlier flips were reverted (e7cc4b6, faca607) because the box moved ahead of the evidence. If the blocking row in the derived span has genuinely been closed, change this constant IN THE SAME COMMIT as the registry row and the discharge table — not before them.`,
).toBe(true);
```

### WR-35: All three head-side disclosures name the WRONG MECHANISM for the offset their own fixture exhibits, and the same docblock states it correctly sixty lines above

**File:** `packages/backend/src/store/observations.ts:466-475`, `packages/backend/src/store/observations.spec.ts:998-1010` and `:1094-1106`, `packages/backend/src/store/schema.spec.ts:283-290`

**Issue:** All three new WR-28 disclosures give one mechanism for the head-side
instability:

> a cut landing inside a parameter NAME is NOT stable — the second pass sees a segment
> with **no `=`**, decision P10-D1 redacts it WHOLE, and the stored value can SHRINK by
> a byte.

Swept, with the tail of every unstable offset printed:

```
n     pass-1 tail (24)             pass-2 tail (24)             len
2019  "pppppppppppp;jsessionid="   "ppppppppppppp;<redacted>"   2048 -> 2047   <- HAS an `=`
2020  "ppppppppppppp;jsessionid"   "ppppppppppppp;<redacted>"   2048 -> 2048
2021  "pppppppppppppp;jsessioni"   "pppppppppppppp;<redacted"   2048 -> 2048
…
2029  "pppppppppppppppppppppp;j"   "pppppppppppppppppppppp;<"   2048 -> 2048
```

There are **two** mechanisms in the band, not one. At `n = 2019` the cut lands just
past the `=`, so the segment is `jsessionid=` — it HAS an `=` with an empty value half,
and `redactDelimitedSegment`'s CR-07 padding branch redacts it whole. At 2020–2029 the
cut lands inside the name and the segment has no `=`. The disclosure names only the
second — and `n = 2019` is `headUnstable[0]`, the exact offset the fixture reads out of
the run and builds its four exemplar assertions on. **The one offset the three
disclosures exhibit is the one they do not describe.**

The same defect appears in the multi-segment exemplar: at `multiUnstable[0] = 2015` the
tail is `?nnnnnnnnnnnnnnnn=`, and the comment above it says "The cut lands inside the
FIRST parameter's name."

And this is a regression against text in its own file. `observations.ts:414-424` — sixty
lines above the new paragraph, in the same docblock — already lists **both** shapes
correctly ("a cut landing just after a `=` leaves a segment whose value half is EMPTY …
a cut landing inside a parameter NAME leaves a segment with no `=` at all"). The
WR-28/WR-29 paragraph paraphrased that list down to one item and then the paraphrase was
copied into two other files. That is the phase's signature defect in miniature: a
correct enumeration re-authored instead of re-derived.

**Fix:** restore both shapes in all three places, and title the exemplar for the branch
it actually takes.

```
 *   a cut landing inside a `;` parameter's `<redacted>` MARKER is stable;
 *   a cut landing JUST PAST the `=` leaves an EMPTY value half, which the CR-07
 *     padding branch redacts WHOLE — the value SHRINKS by a byte (this is the FIRST
 *     unstable offset in the band);
 *   a cut landing INSIDE the parameter NAME leaves a segment with no `=`, which
 *     P10-D1 redacts whole — the value keeps its length and loses the name.
```

and rename `nameCut` to `emptyValueCut`, since `expect(nameCut.slice(-12)).toBe(";jsessionid=")` is asserting the empty-value shape.

### WR-36: The IN-25 correction states "a value routed through an OBJECT literal REPORTS"; `{ ...e }` is a value routed through an object literal and reports `[]`

**File:** `packages/backend/src/store/error-redaction.spec.ts:131-141`, asserted at `:1424-1445`

**Issue:** Round 5 narrowed residual item 3 by execution and wrote the correction as a
flat statement:

> (i) a value routed through an OBJECT literal REPORTS — the object-literal value is
> itself one of the two guarded POSITIONS, so `const o = { m: e.message }; o.m` and the
> direct `{ error: { m: e.message } }` both fire

Both of those do fire — I re-ran them. But the class the sentence names is wider than
the two shapes it was measured on. Executed:

```
catch (e) { return { ok: false, error: { ...e } }; }              []      <-- SILENT
catch (e) { return { ok: false, error: Object.assign({}, e) }; }  []      <-- SILENT
catch (e) { return { ok: false, error: structuredClone(e) }; }    []      <-- SILENT
```

`{ ...e }` puts the caught binding's own enumerable properties — `message` on any
`Error` subclass that sets it as an own property, and every field of a rejected-value
object — into the returned object literal. It is a value routed through an object
literal and it is not seen, because `derivesFrom` reads a `SpreadAssignment` as neither
a render nor a derivation.

A correction written specifically to remove an overstatement introduced a narrower one
in the same paragraph, and the paragraph three lines above it says why that matters:
"A residual overstated is the same failure mode as one understated, in a paragraph that
says so itself."

**Fix:** scope the correction to what was measured and pin the counterexample beside
the two firing shapes, in the same case:

```
 *  (i) a value routed through an object literal as a NAMED PROPERTY VALUE reports —
 *      `const o = { m: e.message }; o.m` and `{ error: { m: e.message } }` both fire,
 *      because an object-literal value is itself a guarded POSITION. A SPREAD is
 *      NOT: `{ ...e }`, `Object.assign({}, e)` and `structuredClone(e)` all report
 *      `[]` and are open, measured 2026-08-24.
```

and add the three lines to the "RESIDUAL, STILL OPEN AFTER IN-25" case at `:1447`.

### WR-37: A NESTED destructure of an outbound receiver is silent, while each half of it reports on its own

**File:** `packages/backend/src/outbound-prohibition.spec.ts:2584-2622` (the object-binding-pattern branch)

**Issue:** The collector reads a binding pattern one level deep: it takes
`boundPropertyName(el)` and then requires `ts.isIdentifier(el.name)`. When `el.name` is
itself a binding pattern the element is skipped entirely. Executed:

```
const { requests } = sdk;          requests.send(req)   ["outbound-send"]
const { send } = sdk.requests;     send(req)            ["outbound-send"]
const { requests: { send } } = sdk;  send(req)          []      <-- SILENT
```

The combined spelling is ordinary TypeScript and it is the natural way to write the two
lines above as one. Three neighbouring receiver-binding shapes are silent for the same
reason — the collector reads only the two initializer shapes it was written for:

```
const o = { r: sdk.requests };  o.r.send(req)                       []
const a = [sdk.requests];       a[0].send(req)                      []
class C { r = sdk.requests; m() { this.r.send(req); } }             []
function f(r = sdk.requests) { r.send(req); }                       []
for (const r of [sdk.requests]) { r.send(req); }                    []
```

The derived text's point 4 explicitly disclaims exhaustiveness for MEASURED SILENCES
("a shape nobody thought of is still silent and still unlisted here"), which is why this
is a WARNING and not a blocker — the disclaimer is honest and it covers these. But the
nested destructure is a *composition of two shapes the gate already resolves*, which is
a different class from "a shape nobody thought of", and residual (b)'s parameter and
loop-binding items are written about KEYS only, so a reader checking them will not find
the parameter-default and `for…of` RECEIVER twins there.

**Fix:** recurse the binding-pattern branch, which closes the nested case and costs
nothing else:

```ts
const walkPattern = (pattern: ts.ObjectBindingPattern, receiver: ts.Expression): void => {
  for (const el of pattern.elements) {
    const property = boundPropertyName(el);
    if (property === undefined) continue;
    if (ts.isObjectBindingPattern(el.name) && RECEIVERS.has(property)) {
      // `const { requests: { send } } = sdk` — the inner names are members of a
      // POSITIVELY IDENTIFIED receiver, which is the rule the flat case already has.
      for (const inner of el.name.elements) { /* … the existing member rule … */ }
      continue;
    }
    /* … the existing element body … */
  }
};
```

and add a MEASURED SILENCE row for the receiver-position parameter default and loop
binding, so residual (b)'s KEY-only scope stops being read as covering receivers too.

---

## Info (pass 6)

### IN-27: `literalsOf`'s docblock describes `literalOf`, and says `undefined` about a function that cannot return it

`packages/backend/src/outbound-prohibition.spec.ts:2370-2375`. The comment reads "The
string an expression denotes: a literal, or a single-hop `const` bound to one.
`undefined` means THE WALK COULD NOT READ IT — never 'there was nothing there'." It sits
on `literalsOf`, which returns a `ReadonlySet<string>`, never `undefined`, and which
reads `let`/`var`/assignment bindings as well as `const` and holds every literal rather
than one. `literalOf` — the single-valued reader the paragraph actually describes — sits
directly below it with no docblock at all. Stale since CR-10 split the two. The registry
rows for both functions are correct, so the code comment is the only wrong copy.

### IN-28: `schema.spec.ts` hard-codes the band size the test one directory away deliberately refused to hard-code

`packages/backend/src/store/schema.spec.ts:292-295` states "a sweep of the 71 head
lengths around that offset finds 11 that are not fixed points". Nothing checks either
number, and `observations.spec.ts:1015-1020` gives the reason not to write them:
"Writing `2019` and `2029` into this file would be the same defect one layer up: a
number with no derivation, going RED for the wrong reason the day a constant moves."
Both counts are correct today (I measured 11 of 71). Prefer "a sweep of the head lengths
around that offset finds a contiguous band that are not fixed points", which is what the
assertions enforce.

### IN-29: The `unwrap` registry row omits one of the five wrappers it strips

`packages/backend/src/outbound-prohibition.spec.ts:1188` renders "strips parentheses,
`as`/satisfies assertions, non-null assertions and a COMMA SEQUENCE". The function also
strips `ts.isTypeAssertionExpression` — the angle-bracket form `<T>x`. Harmless (the
direction is more stripping, not less) and unreachable in `.ts` files that use JSX-free
syntax, but it is one of the four wrapper kinds that falsify `CR-11`'s clause, so the
row should name it while that clause is being fixed.

### IN-30: Two more contrived spellings, recorded so they are not rediscovered as findings

`String.raw\`requests\`` as a key (`const k = String.raw\`requests\`; sdk[k].send(req)`)
and a doubled global receiver (`globalThis.globalThis.fetch(url)`) both report `[]`.
Neither is reachable in this codebase and neither is worth a branch; they are listed
here so a seventh round does not spend a finding on them. The first is a tagged template
(`literalsOf` reads only `isStringLiteralLike`); the second is a property access whose
receiver is a global receiver but whose *name* is not a surface, so no rule matches.

---
---

# --- PASS 7 --- Gap-Closure ROUND 6 Review (plans 01-29 … 01-32)

**Reviewed:** 2026-08-24T21:10:00Z
**Depth:** standard
**Files Reviewed:** 5 — the files plans 01-29 … 01-32 changed, confirmed against
`git diff --name-only 4d61c73^..HEAD` rather than taken from the summaries
**Status:** issues_found — 3 BLOCKER, 6 WARNING, 3 INFO

## Summary (pass 7)

Everything round 6 claims to have closed is closed, and I checked the two claims
that matter by mutation rather than by reading.

**The branch mechanism earns its central claim.** Round 6's acceptance test was
that deleting the `PlusEqualsToken` assembly branch turns the derived block red at
ROW granularity. I ran the harder version of that mutation — I left the branch's
condition and its anchor line intact and neutered only its effect
(`assembledNames.add(node.left.text)` → `void 0`), so the anchor guard could not
fire — and the suite went red in three places, one of which is the per-branch case
naming the row, the phrase and the anchor:

```
× branch assembledNames / a `+=` compound assignment /
  auditSource > collect > node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken &&
  — its probe is executed against auditSource
Tests  3 failed | 404 passed (407)
```

Injecting a resolver at `auditSource`'s own indentation
(`const sneakyResolver = (n: ts.Expression): boolean => …`) turns the coverage
guard red in both of its cases. `FALSIFIED_HANDOFFS` really is at zero, its pin
really is `toBe(0)`, and `CORE11_BOX_EXPECTED` really does pin `- [ ] **CORE-11**`
by prefix rather than by the two-state character class WR-34 found. The whole
suite is green at **31 files / 1345 tests**. None of that is ceremony: three
separate mutations produced three different red states, each naming what broke.

**And all three new BLOCKERs live in the one surface that mechanism does not
reach.** `BRANCH_VOCABULARY` and `UNBOUNDED_QUANTIFIERS` are scanned over
`RESOLVER_REGISTRY[].clause` and over nothing else. The gate file's own 955-line
hand-written header — the artifact a reader reaches first, and the one every
earlier round wrote its residual into — is never scanned by either. Measured on
the header alone, the declared quantifier phrasings occur **16 times**: `anywhere
in the file` ×5, `any depth` ×5, `ANY-BINDING-WINS` ×4, `every literal` ×2,
`ANY of them` ×2, `everywhere in the file`, `every reachable spelling`, `ANY
string literal` and `every spelling` ×1 each. Not one of them raises a
`QUANTIFIED_CLAUSES` obligation. The mechanism's own disclosure states the
*phrase-list* limit ("declared-phrasing or nothing") and never states the
*surface* limit, and the surface limit is where the round's blockers are.

The header's `every spelling` is the round's own falsified universal, still
standing:

```
["outbound-fetch"]          (ok && globalThis).fetch(url);
["outbound-fetch"]          (g ?? globalThis)["fetch"](url);
["outbound-fetch"]          (b ? globalThis : x).fetch(url);
["outbound-beacon"]         (b ? navigator : x).sendBeacon(u, d);
["outbound-fetch"]          (b ? fetch : x)(url);
["outbound-dynamic-code"]   (b ? eval : x)(src);
```

Six of six. The registry ROW that carried that universal was removed on
2026-08-24 with a guard asserting it never returns; the HEADER copy — same
universal, same six exemplars, plus "Pinned by a fixture titled as a MEASURED
SILENCE" and a listing under "**STILL OPEN** … OPEN AND UNOWNED, no plan in this
phase claims it" — was left standing.

Two further shapes report nothing and are on no residual list. A bare global in
RECEIVER position rather than CALLEE position is silent across the whole family,
while every structural twin of it reports:

```
[]                    fetch.call(null, url);
[]                    fetch.apply(null, [url]);
[]                    const g = fetch.bind(globalThis); g(url);
[]                    Reflect.apply(fetch, null, [url]);
[]                    eval.call(null, src);
[]                    const f = fetch; f.call(null, url);      // f IS in fetchAliases
["outbound-send"]     sdk.requests.send.call(sdk.requests, req);
["outbound-send"]     const g = sdk.requests.send.bind(sdk.requests); g(req);
["outbound-send"]     Reflect.apply(sdk.requests.send, sdk.requests, [req]);
["outbound-fetch"]    globalThis.fetch.call(null, url);
["outbound-fetch"]    const g = globalThis.fetch.bind(globalThis); g(url);
["outbound-beacon"]   navigator.sendBeacon.call(navigator, u, d);
```

And an unreadable member on a positively identified `navigator` receiver is
dropped, while the identical shape on every other identified receiver is
reported:

```
["outbound-unanalysable"]   const m = "se" + "nd";      sdk.requests[m](req);
["outbound-unanalysable"]   const m = "fet" + "ch";     globalThis[m](url);
["outbound-unanalysable"]   const m = "fet" + "ch";     window[m](url);
["outbound-unanalysable"]   const k = "send"+"Beacon"; const { [k]: b } = navigator; b(u,d);
[]                          const m = "send" + "Beacon"; navigator[m](u, d);
[]                          const n = navigator; const m = "send"+"Beacon"; n[m](u, d);
```

On the persistence side, `observations.ts` changed by comment only — the diff is
entirely ` *` lines, so the redaction code is byte-identical and the 16,160-input
sweep round 5 verified still applies. The WR-35 correction it carries is right
about the *mechanism* of both unstable shapes and wrong about the *discriminator*
it appends to them: "shape (2) SHRINKS and shape (3) does not" is an artifact of
`jsessionid` being exactly ten characters, the same length as `<redacted>`. Re-run
with a 29-character parameter name, shape (3) shrinks by up to **19 bytes** at
nineteen consecutive offsets. That is WR-39, and it is the same defect the
correction was written to fix, one layer down, in the same round.

Three things are right and worth recording so nobody re-litigates them. The
mutation seam is real and row-granular, proved above. `FALSIFIED_HANDOFFS`
draining to zero is honest — its pin is an equality at zero rather than a
`toBeGreaterThan`, and the docblock states why an assertion a later wave must
delete is worse than none. And the `CORE11_BOX_EXPECTED` prefix pin genuinely
would catch the flip both reverts undid: I checked it by reading the ledger row,
which is `- [ ]`.

---

## Critical Issues (pass 7)

### CR-14: The gate header still declares six live-reporting spellings silent, "OPEN AND UNOWNED", pinned by a fixture that no longer exists

**File:** `packages/backend/src/outbound-prohibition.spec.ts:756-772` and `:774-781`
**Severity:** BLOCKER

**Issue:** The hand-written header says, in the present tense:

> `isGlobalReceiver`, `isFetchExpression` and `isNavigatorReceiver` resolve their
> own spellings through the alias sets and do not consult it, so AN OPERATOR
> WRAPPING A GLOBAL RECEIVER IS STILL SILENT in every spelling: `(ok &&
> globalThis).fetch(url)`, `(g ?? globalThis)["fetch"](url)`, `(b ? globalThis :
> x).fetch(url)`, `(b ? navigator : x).sendBeacon(u, d)`, `(b ? fetch : x)(url)`
> and `(b ? eval : x)(src)` all report `[]`, MEASURED IDENTICAL BEFORE AND AFTER
> THIS WAVE against commit `278a0d2~1`. … Pinned by a fixture titled as a MEASURED
> SILENCE.

and eight lines later lists the same shape under **STILL OPEN**:

> the OPERATOR AROUND A GLOBAL RECEIVER, above — OPEN AND UNOWNED, no plan in this
> phase claims it

Executed through `auditSource`, **all six report** — the block quoted in the
summary above. Wave 32 closed every one of them with `operatorOperandMatching`
and `bareFetchCallee`, removed the registry row
`silence-operator-around-global-receiver`, and installed a guard at `:8853-8861`
asserting that row never comes back. The header copy of the same universal was not
touched. Nor was the pointer: there is no fixture titled `A MEASURED SILENCE` for
this shape any more — the ten remaining ones are for inverted binding order, the
two-hop key, and the receiver/navigator/global alias negations — and the case this
sentence points at is now titled `… CLOSED (CR-11)` at `:7748`.

Three things make this a BLOCKER rather than a stale comment. (1) It is the
round's own falsified universal, surviving in the round that falsified it. (2) It
tells a reader an unclosed, unowned finding exists on the surface CORE-11's first
sentence enumerates, which is exactly the arithmetic every box-flip decision in
this phase has keyed off — plan 01-28 held the box open over precisely this row.
(3) `every spelling` is a **declared** `UNBOUNDED_QUANTIFIERS` phrasing, so the
guard built to catch this class has the phrase and cannot see the sentence,
because the scan reads `RESOLVER_REGISTRY[].clause` and the header is not a
clause. See WR-43.

**Fix:** correct the header where it is, and say what it used to say, in the shape
the registry rows use:

```ts
//    THE OPERATOR AROUND A GLOBAL RECEIVER — CLOSED 2026-08-24 (CR-11), and the
//    superseded claim is preserved because it was believed for seven waves.
//    FALSIFIED 2026-08-24 (CR-11): "AN OPERATOR WRAPPING A GLOBAL RECEIVER IS
//    STILL SILENT in every spelling". Measured after wave 32, all six exemplars
//    report — `(ok && globalThis).fetch(url)` → ["outbound-fetch"], … ,
//    `(b ? eval : x)(src)` → ["outbound-dynamic-code"]. `operatorOperandMatching`
//    is reached from all five global resolvers and `bareFetchCallee` from the
//    bare-call rule. The residual OF RECORD is the generated span below; this
//    paragraph restates no bound of its own.
```

and delete the STILL-OPEN entry at `:779-781` in the same commit. Then extend the
`no corrected clause names its owning wave in prose` neighbourhood with the guard
WR-43 asks for, so the next header universal fails a test instead of a review.

---

### CR-15: A bare global surface in RECEIVER position is silent across the whole family, including through an alias the walk positively identified

**File:** `packages/backend/src/outbound-prohibition.spec.ts:3703-3782` (the member rule), with `:3193-3215` (`bareFetchCallee`) and `:5698` (`QUANTIFIED_CLAUSES.isFetchExpression`)
**Severity:** BLOCKER

**Issue:** `bareFetchCallee` answers only for a CALL's callee. The member rule one
branch away asks `member === FETCH_GLOBAL && isGlobalReceiver(node.expression)` —
i.e. it recognises the global fetch only when it is *reached through* a global
receiver, never when it *is* the receiver. So the bare spelling in receiver
position matches no rule at all:

```
[]                  fetch.call(null, url);
[]                  fetch.apply(null, [url]);
[]                  const g = fetch.bind(globalThis); g(url);
[]                  Reflect.apply(fetch, null, [url]);
[]                  eval.call(null, src);
[]                  Function.call(null, "a", src);
[]                  const f = fetch; f.call(null, url);
```

Every structural twin reports. `sdk.requests.send.call`, `.bind` and
`Reflect.apply(sdk.requests.send, …)` all give `outbound-send`, because the
receiver rule was widened for exactly these shapes by CR-03 and the header at
`:186-188` says so: *"Once a receiver is positively identified, ANY member of it
outside an explicit read-only allowlist fails — referenced, called, aliased,
returned, or handed to `.call`/`.apply`/`Reflect.apply`."* `globalThis.fetch.call`
and `globalThis.fetch.bind` give `outbound-fetch`. `navigator.sendBeacon.call`
gives `outbound-beacon`. Only the bare global family is dropped.

The last line is the sharpest: `const f = fetch;` puts `f` in `fetchAliases`, so
`f(url)` reports — the walk has *positively identified* `f` as the global fetch —
and `f.call(null, url)` on the very next line reports nothing. That is WR-19's
"could not read does not mean clean" inverted into "positively read, then
dropped".

`fetch.bind(globalThis)` is not a contrivance: binding `fetch` to the global
object is the ordinary portable spelling, because a detached `fetch` throws an
illegal-invocation in several hosts.

And it is not disclosed. It is on none of the 16 MEASURED SILENCE rows, and
`QUANTIFIED_CLAUSES.isFetchExpression` — the entry that exists to state what
measurably bounds `in every reachable spelling` — names only *"a function
boundary … an array-slot binding, a class field and a parameter default"*. A
bound that omits `.call`/`.apply`/`.bind` on the surface CORE-11 spells "no global
`fetch` by ANY RECEIVER or alias" is a bound narrower than the residual it claims
to state.

**Fix:** make the member rule consult the resolver it already has, rather than
only `isGlobalReceiver`. One branch, beside the two that already anchor on a
positively identified receiver:

```ts
} else if (isFetchExpression(node.expression) && member !== undefined) {
  // `fetch.call`, `fetch.bind`, `f.apply` for any `f` in fetchAliases — the
  // bare global in RECEIVER position, which `bareFetchCallee` cannot see
  // because it answers for a CALLEE. `globalThis.fetch.call` already reports
  // through the branch above; this is its bare twin.
  add("outbound-fetch", `a reference to \`${member}\` on the global \`fetch\``);
} else if (globalNameOf(node.expression) !== undefined && member !== undefined) {
  // the same for `eval.call`, `Function.call`, `WebSocket.prototype`.
  add("outbound-dynamic-code" /* or -global-ctor, per globalNameOf */, …);
}
```

Then add the seven executed shapes above as failing-path cases beside the
`.call`/`.apply` receiver cases at `:6763+`, extend
`QUANTIFIED_CLAUSES.isFetchExpression`'s measured bound in the same commit, and
give `Reflect.apply(fetch, …)` its own row — the SDK side already handles it
because the member reference is mentioned, and the global side has no member to
mention.

---

### CR-16: An unreadable member on a positively identified `navigator` receiver is dropped, while every other identified receiver reports it

**File:** `packages/backend/src/outbound-prohibition.spec.ts:3747-3782`
**Severity:** BLOCKER

**Issue:** The member rule's chain ends with a catch-all for an unreadable member
— but the catch-all is guarded by `isGlobalReceiver`, and `navigator` is not one
of the four `GLOBAL_RECEIVERS`:

```ts
} else if (member === BEACON_METHOD && isNavigatorReceiver(node.expression)) { … }
…
} else if (member === undefined && isGlobalReceiver(node.expression)) {
  add("outbound-unanalysable", `a computed member of \`…\` whose name this walk cannot read`);
}
```

So when the member name will not reduce, the beacon branch cannot match (it tests
`member === BEACON_METHOD`, and `member` is `undefined`) and the catch-all cannot
match either. Measured:

```
[]                          const m = "send" + "Beacon"; navigator[m](u, d);
[]                          const m = `send${"Beacon"}`;  navigator[m](u, d);
[]                          const n = navigator; const m = "send"+"Beacon"; n[m](u, d);
[]                          const m = "send"+"Beacon"; window.navigator[m](u, d);
[]                          function f(m) { navigator[m](u, d); }
["outbound-unanalysable"]   const m = "se" + "nd";  sdk.requests[m](req);
["outbound-unanalysable"]   const m = "fet" + "ch"; globalThis[m](url);
["outbound-unanalysable"]   const k = "send"+"Beacon"; const { [k]: b } = navigator; b(u,d);
```

The receiver is positively identified in every silent line —
`isNavigatorReceiver` returns `true` for all four spellings — and the walk
*watched the key being assembled* in three of them. This is the exact WR-19 class
the file was rewritten for, surviving on the one surface its own docblock calls
"the outbound global MOST likely to exist in a host that has none of the three
above".

It falsifies a header universal directly. `:189-192` reads: *"Anything it CANNOT
read on an identified receiver, and any module specifier it cannot reduce to a
literal, is REPORTED as `outbound-unanalysable`. 'Could not read' does not mean
'clean'; that equivalence is the specific defect this rewrite removes."* The
navigator DESTRUCTURE arm at `:3661-3675` gets this right — it has a
`property === undefined` branch that reports — so the two spellings of one shape,
twenty lines apart in the same rule, disagree.

Undisclosed: no MEASURED SILENCE row, no residual entry, and the beacon docblock
at `:1596-1616` says the rule covers "a `sendBeacon` member of `navigator`, of
`navigator` reached through any of the four global receivers, or of a one-hop
alias of either — asserted both ways below", which is stated of the *readable*
member and reads as covering the class.

**Fix:** anchor the unreadable-member catch-all on every positively identified
receiver, not on `isGlobalReceiver` alone:

```ts
} else if (
  member === undefined &&
  (isGlobalReceiver(node.expression) || isNavigatorReceiver(node.expression))
) {
  add(
    "outbound-unanalysable",
    `a computed member of \`${unwrap(node.expression).getText()}\` whose name this walk cannot read`,
  );
}
```

and add the five executed shapes as failing-path cases in the beacon describe at
`:7928+`. While there, note that `const { ["sendBeacon"]: b } = navigator` reports
`outbound-unanalysable` rather than `outbound-beacon` — see IN-32.

---

## Warnings (pass 7)

### WR-38: The gate header states CORE-11 is marked complete; the ledger row and this file's own pin both say it is not

**File:** `packages/backend/src/outbound-prohibition.spec.ts:908-916` (against `:9020`)

**Issue:** The header reads *"CORE-11 IS NOW MARKED COMPLETE IN `REQUIREMENTS.md`,
and the difference from the `[x]` that commit `e7cc4b6` reverted is the reason it
may be…"*. `.planning/REQUIREMENTS.md:46` is `- [ ] **CORE-11**`, and 8,100 lines
below the header this same file pins that state as a constant:

```ts
const CORE11_BOX_EXPECTED = "- [ ] **CORE-11**";
```

The box was set `[x]` by wave 19, reverted at `faca607`, and held `[ ]` by waves
23, 28 and every wave since. The paragraph is wave 19's and survived four rounds.
For a checkbox that has been flipped early and reverted **twice**, a header
asserting completion is the more dangerous of the two stale directions: it is the
first thing a reader or a later planner sees, and the assertion that contradicts
it is 8,000 lines away in a test body.

**Fix:** replace the paragraph with the current state and its owner, or delete it
and let `CORE11_BOX_EXPECTED` and the ledger entry be the only statements of the
box's state — which is the "pointer, not a bound" rule this file already applies
to `STATE.md` and `WINDOWS.md`, applied to itself.

### WR-39: "Shape (2) SHRINKS and shape (3) does not" is an artifact of `jsessionid` being ten characters; measured, shape (3) shrinks by 19

**File:** `packages/backend/src/store/observations.spec.ts:1104-1119`, with `packages/backend/src/store/schema.spec.ts:294-299` and `packages/backend/src/store/observations.ts:465-476`

**Issue:** All three disclosures now carry, as a mechanism-level property, that a
head-side cut landing inside the parameter NAME "does NOT shrink", and
`observations.spec.ts:1116-1118` states it as *"THE DISCRIMINATOR, STATED AS AN
ASSERTION: shape (2) SHRINKS and shape (3) does not. If these two ever agree, one
of the two branches stopped being reachable from this band."*

It is a property of the fixture's parameter name, not of the branch. `jsessionid`
is ten characters and `<redacted>` is ten characters, so `;jsessionid` →
`;<redacted>` is length-preserving by coincidence; at the shorter cuts the
replacement is *longer* than the remaining tail and re-truncation clips it back to
`URL_MAX`. Re-run with a 29-character name (`averylongsessionparametername`), the
band is n=2000..2029 and shape (3) shrinks at nineteen consecutive offsets:

```
2000 SHAPE2(empty-value)  ";averylongsessionparametername="   delta -20
2001 SHAPE3(name)         ";averylongsessionparametername"    delta -19
2002 SHAPE3(name)         ";averylongsessionparameternam"     delta -18
…
2019 SHAPE3(name)         ";averylongse"                      delta  -1
2020 SHAPE3(name)         ";averylongs"                       delta   0
```

Two smaller problems in the same block. The line the "DISCRIMINATOR" comment sits
on is `expect(emptyValueCutTwice.length).toBe(emptyValueCut.length - 1);` — **byte
identical** to the assertion fourteen lines above it, so it re-asserts an existing
fact and cannot detect "these two ever agree". The thing that would detect that is
`expect(nameCutTwice.length).toBe(nameCut.length)` on the line before, and it is
the line whose *claim* is the fixture artifact. And shape (2)'s "one byte shorter"
is fixture-specific too — measured at −20 with the longer name — though that one
is stated about the exemplar rather than about the branch.

**Fix:** state what the branch does and let the delta fall out of it:

```
(3) a cut landing inside the parameter NAME is not stable either: the second pass
    sees a `;` segment with no `=` at all, P10-D1 redacts it WHOLE, and the stored
    value changes by `len(";<redacted>") - len(retained tail)` — which is NEGATIVE,
    ZERO or clipped to URL_MAX depending on how much of the NAME survived the cut.
    With `jsessionid` (ten characters, the same length as `<redacted>`) the band's
    deltas are 0; with a 29-character name they run to -19. THE DELTA IS NOT THE
    DISCRIMINATOR — the presence of an `=` in the final segment is, and that is
    what the assertion below tests.
```

and replace the duplicated line with a relative assertion that actually
discriminates, e.g. that `nameCut`'s final segment has no `=` while
`emptyValueCut`'s does — which the block already checks — plus one assertion that
the two second-pass outputs take *different* branches rather than that they have
particular lengths.

### WR-40: WR-36's "three SPREAD shapes" are silent through three different mechanisms, and the one mechanism it names is true of one of them

**File:** `packages/backend/src/store/error-redaction.spec.ts:141-158` (with the pinned lists at `:1474-1478` and `:1523-1527`)

**Issue:** The correction reads: *"A SPREAD IS NOT [one of the two guarded
positions] … `{ ...e }`, `Object.assign({}, e)` and `structuredClone(e)` each
report `[]` and are OPEN … `derivesFrom` reads a `SpreadAssignment` as neither a
render nor a derivation."* All three are silent — I ran them — but only the first
involves a `SpreadAssignment` at all.

Traced through `derivesFrom` (`:407-461`):

- `{ ...e }` — silent because the object-literal position rule iterates property
  assignments and a `SpreadAssignment` is not one. This is the stated mechanism.
- `Object.assign({}, e)` — reaches the call branch, whose callee `Object.assign`
  *is* a member access, so the descent follows `callee.expression` and lands on
  the identifier `Object`. It is silent because **the descent follows the callee's
  RECEIVER and never the ARGUMENTS**. No spread is involved; the shape has no
  spread in it.
- `structuredClone(e)` — a call whose callee is a bare identifier, so the descent
  breaks immediately. That is residual **item 2** of this same list ("A CALL WHOSE
  CALLEE IS A BARE IDENTIFIER"), already open and already named twenty lines
  above. No spread here either.

So a correction written to remove an over-wide class statement files two shapes
under a mechanism they do not exhibit — the same title-versus-mechanism
substitution the paragraph three lines below it names as this phase's recurring
defect.

**Fix:** split the item by mechanism, since the fixtures are already written:

```
(i)  a NAMED PROPERTY VALUE of an object literal reports; a SPREAD ELEMENT does
     not — `{ ...e }` is silent because the position rule iterates property
     assignments and `SpreadAssignment` is not one.
(ii) the ARGUMENTS of a call are never descended — `Object.assign({}, e)` is
     silent because `derivesFrom` follows the callee's RECEIVER (`Object`) and
     never its arguments. This is a mechanism this list did not name before.
(iii) `structuredClone(e)` is item 2 above (bare-identifier callee) and is listed
     there, not here.
```

and re-title the two pinned cases, which currently both say "the three SPREAD
shapes".

### WR-41: The `require(...)` rule tests a bare identifier inline — the exact shape CR-11 closed for `fetch` — and its alias is silent and undisclosed

**File:** `packages/backend/src/outbound-prohibition.spec.ts:3808-3830` (with the `visit` exemption at `:5975`)

**Issue:** The specifier rule matches its callee with an inline identity test:

```ts
callee.kind === ts.SyntaxKind.ImportKeyword ||
(ts.isIdentifier(callee) && callee.text === "require")
```

That is the construction CR-11 spent a whole wave removing one branch away —
`bareFetchCallee`'s own docblock calls the equivalent line *"a SIXTH copy of 'is
this the global fetch', written where nobody was looking for one"*. Measured:

```
["outbound-import"]         require("caido:http");
[]                          const rq = require; rq("caido:http");
[]                          const { require: rq } = globalThis; rq("caido:http");
["outbound-unanalysable"]   function f(s) { require(s); }
[]                          const rq = require; function f(s) { rq(s); }
```

The last line is the one that costs something: the unanalysable-specifier arm —
the whole "could not read does not mean clean" half of this rule — is unreachable
through an alias, so an unreadable specifier through `rq` is clean rather than
reported.

`RESOLVER_EXEMPTIONS.visit` does name this rule as POPULATION 3 residue ("TWO
FURTHER RULES ARE DECIDED INLINE HERE … the `require(...)` specifier rule, and the
navigator-destructure rule"), which is honest about *where* it lives. It records
no silence for it, and the silence is on no MEASURED SILENCE row.

**Fix:** grow `require` the way `eval` was grown by WR-23 — through
`aliasedGlobalOf` and `globalAliases`, which already read the three declaration
shapes — or, if `require` is judged out of scope for a bundled plugin, add a
MEASURED SILENCE row with the two probes above so a reader can see the boundary
rather than infer it from an exemption reason.

### WR-42: The spread residual lists three shapes; four more in the same class are open and unlisted, including the plainest spelling

**File:** `packages/backend/src/store/error-redaction.spec.ts:1488-1534`

**Issue:** The residual case is titled "…and (2026-08-24) the three SPREAD shapes"
and pins exactly three. Measured through the same `auditSource`, four more are
silent and appear on neither the residual list nor the pinned case:

```
[]   return { ok: false, ...e };                       // spread at the TOP level of the returned literal
[]   return { ok: false, error: [...e] };              // ARRAY spread
[]   return { ok: false, error: Object.entries(e) };
[]   return { ok: false, error: Object.values(e).join("") };
```

The first is the ordinary spelling — spreading the caught binding straight into
the returned object, with no `error:` wrapper — and it is what an author writing
`return { ok: false, ...e }` in a `finishAnalysis` catch would actually type. The
last is notable because its twin *is* listed: the residual names "a value routed
through an ARRAY literal (`const a = [e.message]; a[0]`, and its `.join("")`
twin)", and `Object.values(e).join("")` is the same render reached through a call
whose arguments are not descended (see WR-40).

The file's own decision note at `:196-200` says items naming an open CLASS are
deliberately not pinned, "because a fixture would pin one example while READING as
though it pinned the class". That reasoning applies here and argues for the fix
below rather than for four more pins.

**Fix:** state item 3's spread half as a class with its mechanism, per WR-40, and
either pin nothing extra or pin the top-level spread specifically — it is the one
shape most likely to be written, and it is the one a reader will look for and not
find.

### WR-43: `BRANCH_VOCABULARY` and `UNBOUNDED_QUANTIFIERS` are scanned over registry clauses only; the 955-line header they were written for is never scanned

**File:** `packages/backend/src/outbound-prohibition.spec.ts:8620-8648` and `:8809-8842` (declarations at `:5494` and `:5664`)

**Issue:** Both guards range over `RESOLVER_REGISTRY` and read `row.clause`:

```ts
const hits = RESOLVER_REGISTRY.flatMap((row) =>
  UNBOUNDED_QUANTIFIERS.filter((q) => row.clause.includes(q)).map(…));
```

Nothing scans the file's own hand-written header, which is where every residual
this phase has falsified was written and where CR-14 and the falsified universal
in it still live. Measured over `head -1493` of the gate file — the span above the
derived block — the **declared** phrasings occur 16 times: `anywhere in the file`
×5, `any depth` ×5, `ANY-BINDING-WINS` ×4, `every literal` ×2, `ANY of them` ×2,
and `everywhere in the file`, `every reachable spelling`, `ANY string literal` and
`every spelling` once each. None raises a `QUANTIFIED_CLAUSES` obligation, and one
of them is the round's own falsified universal.

`UNBOUNDED_QUANTIFIERS`' docblock is careful about the *phrase-list* limit — "ITS
REACH IS THE DECLARED PHRASINGS AND NO FURTHER … NO SENTENCE IN THIS FILE MAY
CLAIM THIS GUARD CATCHES EVERY UNIVERSAL" — and says nothing about the *surface*
limit, which is the one that produced this round's blocker. A reader who takes the
docblock at its word concludes that a declared phrasing anywhere in this file
raises an obligation. It does not.

**Fix:** cheapest version, one case, using the sentinels already exported:

```ts
it("no DECLARED quantifier phrasing appears in the hand-written header", () => {
  const header = gateLines.slice(0, gateLines.findIndex((l) => l.includes(DERIVED_BEGIN)));
  const hits = header.flatMap((line, i) =>
    UNBOUNDED_QUANTIFIERS.filter((q) => line.includes(q)).map((q) => `${i + 1}: ${q}`));
  expect(hits, `the header asserts ${hits.length} universal(s) that NOTHING bounds: ${hits.join(" | ")}. The residual OF RECORD is the derived span; a universal in the header is an authored bound standing beside a derived one, which is how five consecutive rounds went wrong.`).toEqual([]);
});
```

That will fail today on 16 lines, which is the correct first result. Either rewrite
those sentences to point at the derived span instead of restating a bound, or add a
`HEADER_QUANTIFIER_EXEMPTIONS` map in `RESOLVER_EXEMPTIONS`' shape — named, reasoned,
one entry per surviving sentence. And amend the `UNBOUNDED_QUANTIFIERS` docblock to
state the surface limit beside the phrase limit.

---

## Info (pass 7)

### IN-31: `fetch` as a tagged template is not a `CallExpression` and is silent

`packages/backend/src/outbound-prohibition.spec.ts:3819`. ``fetch`x` `` parses as a
`TaggedTemplateExpression`, so neither the bare-call rule nor `bareFetchCallee` is
reached and it reports `[]`. Nonsensical as real code (`fetch` would receive a
`TemplateStringsArray`), but it is a *call* of the global fetch that the rule's own
words cover, and it costs one `ts.isTaggedTemplateExpression` branch if CR-15 is
being fixed anyway.

### IN-32: A computed-but-readable destructure key off `navigator` reports `outbound-unanalysable` rather than `outbound-beacon`

`packages/backend/src/outbound-prohibition.spec.ts:2643-2650`. `boundPropertyName`
returns `undefined` whenever `el.propertyName` is a `ComputedPropertyName`, even when
the key inside it is a plain string literal — so `const { ["sendBeacon"]: b } =
navigator` takes the "property name this walk cannot read" arm. It errs in the safe
direction, so nothing is hidden; but the beacon docblock's "asserted both ways below"
is not true of this spelling, and a reader debugging a real violation gets the wrong
rule id. `ts.isStringLiteralLike(property.expression)` inside the computed branch is
two lines.

### IN-33: WR-37 closed one level of nesting and the docblock does not say it is one level

`packages/backend/src/outbound-prohibition.spec.ts:3322-3343` and `:3686-3700`.
`const { requests: { send } } = sdk` reports `outbound-send` and the renamed twin
`const { requests: { send: s } } = sdk` reports too — both correct. Two neighbours do
not: `const { a: { requests: { send } } } = sdk` and `const { requests: [x] } = sdk`
both report `[]`, because the composition arm looks exactly one element deep and only
at an `ObjectBindingPattern`. The docblock explains at length why the five *sibling*
shapes stay open and says nothing about the depth or the pattern-kind bound of the
composition it did close, so a reader learns "nested destructures resolve" from a
paragraph that means "one level of object nesting resolves". Recording it here rather
than as a warning: three-deep is `sdk.a.requests`, a genuinely different shape, and
the array-nested form is contrived.

---

_Pass 1 reviewed: 2026-08-21T00:30:00Z_
_Pass 2 reviewed: 2026-08-21T11:21:31Z_
_Pass 3 reviewed: 2026-08-21T15:23:01Z_
_Pass 4 reviewed: 2026-08-22T10:20:00Z_
_Pass 5 reviewed: 2026-08-24T10:05:00Z_
_Pass 6 reviewed: 2026-08-24T16:30:00Z_
_Pass 7 reviewed: 2026-08-24T21:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---
---

# --- PASS 8 --- Gap-Closure ROUND 7 Review (plans 01-33, 01-34, 01-35)

**Reviewed:** 2026-08-26T06:40:00Z
**Depth:** standard
**Files Reviewed:** 5 — the files plans 01-33 … 01-35 changed, confirmed against
`git diff --name-only 516ce1d^..HEAD -- packages/` rather than taken from the summaries
**Status:** issues_found — 3 BLOCKER, 5 WARNING, 3 INFO

## Summary (pass 8)

**CORE-11's `[x]` is earned under the bar the operator actually adopted, and I
checked that by mutation rather than by reading the discharge table.** All three
criteria were re-executed independently in this session, each mutation planted,
watched, and reverted:

```
M1  RESOLVER_REGISTRY unwrap.clause  "strips parentheses, " -> "strips parenthesesXX, "
    × the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(...), byte for byte
    × the block shipped in the gate header equals deriveResidual(...), byte for byte
    Tests  2 failed | 430 passed (432)

M2  one character inside the GATE HEADER's copy of the span
    × the block shipped in the gate header equals deriveResidual(...), byte for byte
    Tests  1 failed | 431 passed        (the ledger comparison stayed GREEN)

M3  one character inside .planning/REQUIREMENTS.md's copy of the span
    × the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(...), byte for byte
    Tests  1 failed | 431 passed        (the gate-header comparison stayed GREEN)

M4  a declared phrasing planted at line 9797, outside all three exclusions
    × the gate file's own bytes carry NO declared phrasing outside the three
      exclusions except by NAMED exemption
    Tests  1 failed | 431 passed (432)
```

That is (1) DERIVED — a divergence in the generator's *input* moves both shipped
copies at once, which is what separates derived from merely-consistent; (2)
DRIFT-DETECTABLE — each copy carries its own guard and each was driven red alone;
(3) THE SOLE BOUND — a hand-written bound in a declared phrasing cannot re-enter
the gate file unnoticed. The suite is green at 4 files / 717 tests over the
reviewed set (`outbound-prohibition` 432, `observations` 185, `error-redaction`
91, `schema` 9).

**And nothing claims the gate is complete.** I went looking for that specifically,
because it is the shape this phase's signature defect would take here. It is not
there. `CORE11_BOX_EXPECTED`'s failure message states the narrow bar and states
what it is *not* ("it does NOT claim the walk catches everything"); the ledger's
`WHAT THIS [x] MEANS AND WHAT IT DOES NOT` paragraph says the same and names
CR-15, CR-16 and the twenty-six measured silences as *named residuals* under it;
the wave-34 correction says `THIS WAVE ENDED NO CLASS` in the same paragraph as
its widenings so the two cannot be read apart. Row 3 of the discharge table is
`✓ (scoped:` with both unreached classes named. Wave 33's deletion is real: the
first 956 lines of the gate file now contain zero occurrences of `OPEN AND
UNOWNED`, `STILL SILENT`, `every spelling` or a completion claim. **The mechanism
genuinely reduces the class, and it should be said plainly: this is the first
round in eight where the bound a reader meets first is not authored.**

**All three new BLOCKERs are the signature defect in the one place the new
mechanism does not look — at the IDENTITY of what it excuses, and on the two
surfaces it declares unguarded.**

The whole-file guard protects its three *exclusions* against silently relocating
onto a different construct — each carries a `proof` token and the failure message
says why: *"This is the direction where an exclusion silently relocates onto a
different construct and keeps passing."* The `HEADER_QUANTIFIER_EXEMPTIONS` map
one layer down has no such protection, and one of its keys is the bare string
`"{q2} :: q2"`. Executed: I deleted the ASCII-table cell that key was written for
and planted a fabricated hand-written **bound** — `A receiver alias chain in this
walk resolves at / any depth` — nine thousand lines away, outside all three
exclusions. **432/432 passed.** The exemption whose reason reads *"HEADER. A
wrapped cell in the same ASCII table, labelling what the keyReceiver row already
carries"* now excuses a standing claim about the walk's reach, and every count
the guard pins still balances. That is prose laundered into machine-looking text,
which is the one thing this round was asked not to do (`CR-17`).

And the two surfaces the discharge itself names as unguarded are not merely
unguarded — they are **wrong right now**, and check (d) of row 3 says they were
checked and found clean. `.planning/REQUIREMENTS.md`'s CORE-11 row is a single
line beginning `- [x] **CORE-11**` and ending, unmarked and in the present tense,
`THE BOX IS DELIBERATELY STILL [ ], AND THE BLOCKING ROW IS NAMED` — while (d)
claims *"this box's state asserted in exactly two places — this ledger row and
`CORE11_BOX_EXPECTED` — which agree"* (`CR-18`). And `.planning/STATE.md`'s live
`### Blockers` section still carries **CR-14's paragraph, verbatim in substance**:
`CORE-11 blocked by silence-operator-around-global-receiver:` with the same six
exemplars, a registry row this suite now positively asserts must not exist
(`CR-19`). Wave 33 deleted that claim from the gate header. It is still standing
one surface over, in a section whose heading says it is current.

**On the persistence side the WR-39 correction is right about the mechanism and
missed its own fourth surface.** The ledger says *"All three disclosure sites
moved in one commit."* There were four. The one that did not move is in
`observations.spec.ts` itself, twenty-five lines above the sweep that disproves
it: *"the CR-07 padding branch redacts it whole: **one byte shorter**"*
(`WR-44`) — the exact sentence, attributing the delta to the branch, that the
same commit rewrote out of `observations.ts` and `schema.spec.ts`. The equality
that encodes the coincidence, `expect(emptyValueCutTwice.length).toBe(emptyValueCut.length - 1)`,
survives at `:1114` (`WR-45`). And the replacement for the assertion removed *for
being a duplicate* is itself three assertions, one of which duplicates an
assertion twenty-one lines above it and one of which is a tautology of the other
two (`WR-46`).

Three things are right and worth recording so nobody re-litigates them. The
wrap-tolerant normalization is not ceremony — the four wrapped occurrences a
line-based scan misses are real, and `joinGateLines`' char-to-line index still
names a line in the failure message. The `inRange == inClauses` equality on
exclusion three is the correct narrowing and errs in the safe direction: a
phrasing written into a `branches[]`, `probe` or `why` field inside the registry's
line range counts in `inRange` and not in `inClauses`, so it breaks the equality
rather than vanishing. And the varied-length sweep in `observations.spec.ts`
really does read every band and every delta out of its own run — I checked the
four profiles are not hard-coded and that `deltaSignatures.size > 1` is the
finding stated as an assertion rather than as a sentence.

---

## Critical Issues (pass 8)

### CR-17: A named exemption RELOCATES onto a different sentence — the `{q2}` key excuses a fabricated hand-written BOUND nine thousand lines from the table cell its reason describes

**File:** `packages/backend/src/outbound-prohibition.spec.ts:9024` (the entry), `:9159-9174` (`surfaceExemptionKeys`), `:9126-9131` (`exemptionKeyFor`), `:9667-9727` (the rule)
**Severity:** BLOCKER

**Issue:** The whole-file guard's rule is: *every declared-phrasing occurrence
outside the three exclusions is GONE or carries a named, reasoned entry a
reviewer can execute and disagree with.* The entry is looked up by a key derived
from the occurrence's line:

```ts
const exemptionKeyFor = (line: string, quantifierIndex: number): string => {
  const masked = maskQuantifiers(normalizeGateLine(line));
  const anchor = masked.length > 96 ? `${masked.slice(0, 96)}…` : masked;
  return `${anchor} :: q${quantifierIndex}`;
};
```

For a comment line that contains *only* a declared phrasing, `masked` is the
token alone and the key degenerates to `"{q2} :: q2"` — ten bytes, carrying no
identifying content whatsoever. That is a real, shipped key. It was written for
line 436, a wrapped cell of the ASCII table in the header:

```
//                                                 recursing on itself   ITSELF as the resolver,
//                                                                       so nesting resolves at
//                                                                       any depth
```

and its reason says so: *"HEADER. A wrapped cell in the same ASCII table,
labelling what the keyReceiver row already carries. What bounds it is
QUANTIFIED_CLAUSES.keyReceiver — the four RECEIVER_OPERATORS — and not this
cell."*

**Executed, not argued.** I deleted line 436 and planted, at line 9797 — outside
all three exclusions, in the middle of the guard's own describe block — a
fabricated hand-written **bound**, split so the phrasing starts on a line of its
own exactly as the table cell does:

```ts
  // A receiver alias chain in this walk resolves at
  // any depth
```

```
$ pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts
 Test Files  1 passed (1)
      Tests  432 passed (432)
```

Green. Not one of the guard's five checks moved: `missing` is empty because the
new occurrence produces the same key; `stale` is empty because the key still
matches something; `foundKeys.length === declared.length` still balances because
one occurrence left and one arrived; the exclusion bands are untouched; the
`reason.trim().length > 40` check passes on a reason that is now false of the
sentence it excuses.

This is exactly the failure mode the guard defends against **one layer up** and
not here. Each of the three exclusions carries a `proof` token and a failure
message that names the direction:

> `exclusion \`${e.name}\` resolved to lines ${e.from}..${e.to}, but that range
> does NOT contain ${JSON.stringify(e.proof)} — a token only that construct
> carries. The anchors matched something else. **This is the direction where an
> exclusion silently relocates onto a different construct and keeps passing.**

The exemption map has 29 entries and no equivalent. `"{q2} :: q2"` is the extreme
case, but the mechanism is general: any two lines whose first 96 masked,
normalized bytes agree are interchangeable to this guard, and the reason string —
the thing a reviewer is supposed to execute and disagree with — is bound to
neither.

The guard's four stated limits do not disclose this. (1) is the phrase list, (2)
is normalization, (3) is bytes-not-meaning, (4) is exclusion three's coarseness.
None of them says an exemption can move. And criterion (3) of the discharge —
*THE SOLE BOUND on every surface a reader touches* — is what this defeats: a
hand-written bound re-entered the gate file, in a **declared** phrasing, inside a
**guarded** file, and the guard passed.

**Fix:** bind each exemption to its occurrence the same way an exclusion is bound
to its construct — with a `proof` token the guard checks. Make the map's values
structured rather than bare strings:

```ts
const HEADER_QUANTIFIER_EXEMPTIONS: Readonly<
  Record<string, { readonly proof: string; readonly why: string }>
> = Object.freeze({
  "{q2} :: q2": {
    // A token only THAT construct carries, checked against the lines the
    // occurrence actually spans. An exclusion is pinned this way; an exemption
    // is the same act one layer down and must be pinned the same way.
    proof: "recursing on itself",
    why: "HEADER. A wrapped cell in the same ASCII table, labelling …",
  },
  // …
});
```

and in the rule, for every found occurrence, assert that the `proof` of its
matched entry occurs within a small window around `o.line`/`o.endLine` — say the
occurrence's own lines plus three above:

```ts
for (const f of found) {
  const entry = HEADER_QUANTIFIER_EXEMPTIONS[f.key];
  const window = gateLines.slice(Math.max(0, f.line - 4), f.endLine).join("\n");
  expect(
    window.includes(entry.proof),
    `exemption ${JSON.stringify(f.key)} matched an occurrence at line ${f.line}, but that occurrence does NOT carry ${JSON.stringify(entry.proof)} — the token its reason was written about. The entry has RELOCATED onto a different sentence and is now excusing something nobody read. This is the same direction the three exclusions are pinned against by their own \`proof\` tokens.`,
  ).toBe(true);
}
```

Then re-run the mutation above and watch it go red. Separately, refuse a
degenerate key outright — an anchor shorter than, say, twenty bytes after masking
identifies nothing and should fail with "widen the anchor" rather than ship.

---

### CR-18: The ledger row whose box is `[x]` ends, unmarked and in the present tense, with `THE BOX IS DELIBERATELY STILL [ ]` — and criterion (3)(d) cites that row as one of two places that AGREE

**File:** `.planning/REQUIREMENTS.md:46` (the row), `:149-160` (the discharge table), with `packages/backend/src/outbound-prohibition.spec.ts:9887, 9947-9962`
**Severity:** BLOCKER

**Issue:** CORE-11's requirement row is one physical line. It begins:

```
- [x] **CORE-11**: No code that ships in the plugin issues an outbound network request …
```

and it carries, inside its own parenthetical history, **three** present-tense
statements of the box's state:

```
… THE BOX STAYS `[ ]` DELIBERATELY, AND THIS IS THE REASON …          (plan 01-18)
… CORRECTION 2026-08-24, plan 01-19: THIS BOX IS NOW `[x]` …          (plan 01-19)
… CORRECTION 2026-08-24, plan 01-28: THE BOX IS DELIBERATELY STILL `[ ]`,
  AND THE BLOCKING ROW IS NAMED …                                      (plan 01-28)
```

The last of the three is the chronologically latest correction inside the line,
it is in the present tense, and it is **unmarked**. There is no `SUPERSEDED`
marker, no `2026-08-25` and no `2026-08-26` anywhere in line 46 — verified by
`grep`. The re-scope and the discharge live in separate paragraphs 90+ lines
below, and a reader who reads the requirement row itself — which is what a
requirement row is *for* — reads `[x]` at its start and "the box is deliberately
still `[ ]`, and the blocking row is named" at its end.

The file's own convention makes this a defect rather than a judgement call. Line
110 carries `**SUPERSEDED IN PART BY THE OPERATOR DECISION OF 2026-08-25 … AND
THE MARKER IS SCOPED TO ONE SENTENCE ON PURPOSE.**` — exactly the treatment this
sentence needs and did not get. And line 118 records that wave 33 deleted, as
`WR-38`, *"a paragraph asserting CORE-11 was marked complete in this file,
contradicting the row roughly 8,100 lines below it."* This is the same defect
inverted — a paragraph asserting CORE-11 is **not** complete, contradicting the
box at the head of its own line — surviving on the surface WR-38 was found on.

What makes it a BLOCKER rather than a documentation nit is that the discharge
this `[x]` was flipped against **asserts the opposite as executed evidence**.
Criterion (3)'s check (d) reads:

> (d) The cross-surface check: zero unmarked STANDING statements of a superseded
> bar on any of the four reader surfaces, and **this box's state asserted in
> exactly two places — this ledger row and `CORE11_BOX_EXPECTED` — which agree.**

The box's state is asserted in **four** places on that row alone, and they do not
agree. A discharge row whose stated reach exceeds its executed reach is this
phase's signature defect, and here it is inside the evidence that flipped the box.

**Fix:** two edits, one commit.

1. Mark the plan 01-28 correction in line 46 the way line 110 marks its
   predecessor, scoped to the sentence:

   ```
   … — CORRECTION 2026-08-24, plan 01-28 (gap-closure round 5, wave 28):
   **SUPERSEDED 2026-08-26 BY THE DISCHARGE OF THE RE-SCOPED BAR — the box is now
   `[x]`; the bytes below are preserved as the record of what was believed and
   the blocking row they name was REMOVED from the registry on 2026-08-24 (CR-11).**
   THE BOX IS DELIBERATELY STILL `[ ]` …
   ```

   Do the same for the plan 01-18 sentence, or state once at the head of the
   parenthetical that every box-state sentence inside it is historical and the
   authoritative state is the checkbox.

2. Correct check (d) in the discharge table to what was measured, or re-run it.
   If it stays as "exactly two places which agree", it needs a mechanism: the
   `CORE11_BOX_EXPECTED` case already reads the row — extend it to assert that
   the row's own body contains no *unmarked* `` `[ ]` ``/`` `[x]` `` box-state
   sentence, so a future correction that contradicts the checkbox goes red.

---

### CR-19: `STATE.md`'s live `### Blockers` section still carries CR-14's paragraph — the removed row and its six now-reporting exemplars — one surface over from where wave 33 deleted it

**File:** `.planning/STATE.md:365, 366, 367` (with `packages/backend/src/outbound-prohibition.spec.ts:9520-9530`)
**Severity:** BLOCKER

**Issue:** `STATE.md`'s `### Blockers` heading declares the section current. Under
it, unmarked and in the present tense:

```
- CORE-11's residual class is still open: six consecutive rounds of bounds authored
  rather than derived. Wave 27 owns the derivation; wave 28 owns the CORE-11
  checkbox flip, and only against the derived text.                        (:365)

- [Phase 01] CORE-11 blocked by silence-operator-around-global-receiver:
  `(ok && globalThis).fetch(url)`, `(globalThis ?? self)`, `(globalThis || self)`,
  `(b ? globalThis : self)`, `(ok && window)` and `(ok && navigator).sendBeacon(u,d)`
  all report NOTHING. Blocks TWO enumerated CORE-11 clauses. Scoped fix: reach
  operatorReceiver from the GLOBAL receiver path …                         (:366)

- CORE-11 blocked by FIVE named rows (plan 01-32): an array element position, an
  object-literal property, a class field, a parameter default and a for-of
  binding …                                                                (:367)
```

Line 366 is **CR-14's content, on a different surface**. CR-14 was round 7's
BLOCKER for exactly this paragraph in the gate header: a claim that an operator
around a global receiver is silent, naming six exemplars, all six of which
report. Wave 33 deleted the gate-header copy. The row it names,
`silence-operator-around-global-receiver`, was removed from the registry on
2026-08-24, and this suite now asserts its **absence** positively, with a message
that says the six spellings report:

```ts
expect(
  RESOLVER_REGISTRY.some((r) => r.id === "silence-operator-around-global-receiver"),
  "row `silence-operator-around-global-receiver` is BACK in the registry. It was
   removed on 2026-08-24 (CR-11) because the silence it measured stopped existing
   — every spelling it named now reports through `operatorOperandMatching` …",
).toBe(false);
```

So the project's live blocker list names, as a current blocker on a requirement
that is now `[x]`, a mechanism the suite proves does not exist. Line 365 states
the *superseded* bar's routing ("wave 28 owns the CORE-11 checkbox flip, and only
against the derived text") as current. Line 367 names five rows as blocking a box
that is checked.

Discharge check (3)(d) claims *"zero unmarked STANDING statements of a superseded
bar on any of the four reader surfaces."* There are three on this surface, in the
section that most reads as current. The row's own scope note says `STATE.md` is
`CLASS ONE, UNGUARDED FILES: … reached by NO mechanical comparison at all` — that
correctly discloses there is no *mechanism*, and (d) separately claims the manual
check was performed and came back clean. It did not.

**Fix:** these three entries are resolved, not open. Move them out of `### Blockers`
into the phase's decision/history log the way the wave-34 and wave-35 pointer
amendments were appended (`:368`, `:369`), each with a dated resolution line:

```
- RESOLVED 2026-08-26 (wave 32 closed the mechanism, wave 35 discharged the bar):
  CORE-11 was blocked by `silence-operator-around-global-receiver`. That row was
  REMOVED from RESOLVER_REGISTRY on 2026-08-24 and its absence is now asserted by
  `outbound-prohibition.spec.ts`; all six exemplars report through
  `operatorOperandMatching`. Preserved here because the six probes are evidence.
```

And give (d) something mechanical to stand on, since it is now the only criterion
whose evidence is a person reading four files: the cheapest version is to extend
the existing `readPlanningLedger` seam to `STATE.md` and `WINDOWS.md` and assert
that no line under a `### Blockers` heading contains `CORE-11 blocked by` while
`CORE11_BOX_EXPECTED` is `- [x]`. That is one string comparison and it makes the
`[x]` and the blocker list move together.

---

## Warnings (pass 8)

### WR-44: WR-39's correction moved three disclosure sites and there were four — the fourth is in the file the correction edited, twenty-five lines above the sweep that disproves it

**File:** `packages/backend/src/store/observations.spec.ts:1103-1106` (claim: `.planning/REQUIREMENTS.md:135`)

**Issue:** WR-39 found that "shape (2) SHRINKS by a byte and shape (3) does not"
is an artifact of `jsessionid` being ten characters — the same length as
`<redacted>` — and not a property of the CR-07 padding branch. The correction
rewrote that sentence out of `observations.ts` and out of `schema.spec.ts`, and
the ledger records the result as:

> All three disclosure sites moved in one commit.

`grep` over the three files finds exactly one surviving instance of the falsified
sentence, and it is in `observations.spec.ts` itself:

```
packages/backend/src/store/observations.ts        0
packages/backend/src/store/schema.spec.ts         0
packages/backend/src/store/observations.spec.ts   1
```

```ts
// past the `=`, the second pass sees a `;` segment with an empty value half,
// and the CR-07 padding branch redacts it whole: one byte shorter. A variable
// named for a mechanism its own assertions do not exhibit is how a reader
// learns the wrong mechanism from a green test.
```

"the CR-07 padding branch redacts it whole: **one byte shorter**" attributes the
delta to the branch, which is precisely the attribution WR-39 falsified. It sits
twenty-five lines above the varied-length sweep whose whole purpose is to show
that a one-character name moves by zero, a 29-character name by up to twenty and
a 44-character name by up to thirty-five. And the paragraph it closes is itself
about a variable named for a mechanism its assertions do not exhibit — the same
class, one comment down.

The count in the ledger ("three sites") is also the number a future reader will
audit against, so the miscount is load-bearing.

**Fix:** delete the four words and point at the sweep, exactly as the other three
sites now do:

```ts
// past the `=`, the second pass sees a `;` segment with an empty value half,
// and the CR-07 padding branch redacts it whole — replacing the retained tail
// with the marker. THE LENGTH CHANGE IS NAME-LENGTH DEPENDENT and is measured
// by the four-length sweep below, never stated here (WR-39).
```

and correct `.planning/REQUIREMENTS.md:135` to say four sites, in the same commit.

### WR-45: The hard-coded `-1` equality WR-39 was written about survives at `:1114`, as an equality, with no statement that it is fixture-specific

**File:** `packages/backend/src/store/observations.spec.ts:1114`

**Issue:**

```ts
const emptyValueCutTwice = normaliseObservedUrl(emptyValueCut);
expect(emptyValueCutTwice).not.toBe(emptyValueCut);
expect(emptyValueCutTwice.length).toBe(emptyValueCut.length - 1);   // :1114
expect(emptyValueCutTwice.slice(-11)).toBe(";<redacted>");
```

The assertion WR-39 *removed* was, by its own replacement comment, "BYTE-IDENTICAL
to the assertion fourteen lines above it". The assertion fourteen lines above it
is this one, and it is the encoding of the coincidence: `-1` is
`"<redacted>".length + 1 - "jsessionid".length - 1`, true only because the fixture
uses a ten-character parameter name. It is not wrong — it is true of this
fixture — but it is a magic number with no derivation, in the file whose own
correction three lines of comment away says no delta may be authored here, and it
will go red for a reason unrelated to the property the day somebody renames the
parameter.

**Fix:** derive it, so it cannot be a coincidence:

```ts
const JSESSIONID = "jsessionid";
expect(
  emptyValueCutTwice.length - emptyValueCut.length,
  "the second pass swaps the retained tail for the marker; the delta is the difference between the two lengths and NOTHING here may be authored.",
).toBe(QUERY_VALUE_REDACTION.length - (JSESSIONID.length + 1));
```

or drop the length assertion entirely and keep `slice(-11)`, which already pins
the observable fact without pinning an arithmetic accident.

### WR-46: The replacement for the assertion removed *for being a duplicate* contains a duplicate and a tautology

**File:** `packages/backend/src/store/observations.spec.ts:1126-1130` vs `:1142-1155`

**Issue:** WR-39's stated grievance was that the old discriminator "re-asserted a
fact already asserted and could not detect the disagreement its own comment
claimed to watch for". The replacement is three assertions, and two of them have
the same problem:

```ts
// :1127 — inline, on nameCut
expect(
  /;[^;]*=/.test(nameCut.slice(nameCut.lastIndexOf(";"))),
  "the LAST offset … leaving a final `;` segment with no `=`. It has one, so …",
).toBe(false);

// :1148 — the same fact, twenty-one lines later, through the new helper
expect(
  finalSegmentHasEquals(nameCut),
  "the LAST offset of the head-side band was expected to leave a final `;` segment with NO `=` …",
).toBe(false);

// :1152 — a tautology of the two assertions above it
expect(
  finalSegmentHasEquals(emptyValueCut) === finalSegmentHasEquals(nameCut),
  "both ends of the head-side band now take the SAME branch, so the band is one mechanism rather than two …",
).toBe(false);
```

`:1148` is `:1127` with the predicate factored into a lambda; if either can fail
the other already has. `:1152` compares two values the two preceding assertions
have just pinned to `true` and `false`, so it can only fail in a run where one of
them has already failed — its message describes a condition it can never uniquely
detect, which is the definition of the defect the finding was raised about.

**Fix:** keep the helper, delete the inline copy at `:1127`, and replace `:1152`
with the assertion it was reaching for — a check that the band's two *ends* are
the only thing being claimed, e.g. that the branch selector actually flips
somewhere inside the band rather than that its endpoints differ:

```ts
const selectors = headUnstable.map((n) =>
  finalSegmentHasEquals(
    normaliseObservedUrl(`https://cdn.test/${"p".repeat(n)};jsessionid=SECRETSESSION`),
  ),
);
expect(
  new Set(selectors).size,
  `every offset in the head-side band takes the SAME branch (${selectors.join(",")}), so the band is one mechanism rather than two and the disclosures naming both shapes are stale.`,
).toBe(2);
```

That version fails for the reason its message states, and it reads the whole band
rather than its endpoints.

### WR-47: `finalSegmentHasEquals` answers `false` for a string containing no `;` — `slice(lastIndexOf(";"))` becomes `slice(-1)`

**File:** `packages/backend/src/store/observations.spec.ts:1142-1143`

**Issue:**

```ts
const finalSegmentHasEquals = (u: string): boolean =>
  /;[^;]*=/.test(u.slice(u.lastIndexOf(";")));
```

With no `;` present, `lastIndexOf` returns `-1` and `String.prototype.slice(-1)`
returns the **last character**, not the whole string. The predicate then tests one
byte and answers `false` — "this took P10-D1's whole-segment branch" — for an
input it never examined. Every current caller passes a head-side string that does
contain a `;`, so nothing is wrong today. But this helper is now the file's
*stated* discriminator between the two truncation branches, the query-side band a
few dozen lines away is delimited by `&` and not `;`, and a later author reusing
it there gets a confident wrong answer with no assertion able to notice.

**Fix:** make the no-delimiter case explicit and fail loudly rather than answer:

```ts
const finalSegmentHasEquals = (u: string, delimiter = ";"): boolean => {
  const at = u.lastIndexOf(delimiter);
  if (at === -1) {
    throw new Error(
      `finalSegmentHasEquals was handed a string with no \`${delimiter}\` — there is no final delimited segment to read, and answering false would report P10-D1's branch for an input never examined: ${JSON.stringify(u.slice(-40))}`,
    );
  }
  return new RegExp(`\\${delimiter}[^\\${delimiter}]*=`).test(u.slice(at));
};
```

### WR-48: Exclusion three resolves 117 lines past the construct it names — `closingBracketAfter` skips the registry's real closer and lands on `BRANCH_VOCABULARY`'s

**File:** `packages/backend/src/outbound-prohibition.spec.ts:9545-9546, 9573-9580` (with `:5767`, `:5884`)

**Issue:** The exclusion is resolved by anchor:

```ts
const closingBracketAfter = (start: number): number =>
  lineOf((l) => l === "]);", start);
// …
{ name: "the RESOLVER_REGISTRY declaration",
  from: registryStart, to: closingBracketAfter(registryStart), band: [500, 3000] }
```

`RESOLVER_REGISTRY` does not close with `]);`. It closes at line 5767 with

```ts
] as readonly ResolverRecord[]);
```

so the scan runs past it and stops at the next bare `]);` in the file — line
5884, which is **`BRANCH_VOCABULARY`'s** closer. Measured:

```
span   957..1538   582 lines   (band 100..1500)
list  5959..5969    11 lines   (band 5..40)
reg   4135..5884  1750 lines   (band 500..3000)   <-- registry really ends at 5767
excluded 2343 / 9976 ; surface 7633
```

117 lines — the `BRANCH_VOCABULARY` docblock and the entire `BRANCH_VOCABULARY`
declaration — are excluded from the whole-file guard by an exclusion named "the
RESOLVER_REGISTRY declaration", and every check the guard runs on it passes: the
`proof` token `id: "constStrings"` is inside the range, and 1750 is inside the
band.

This is currently caught in the safe direction by `exclusionThreeCarriesOnlyClauses`
— a declared phrasing written into those 117 lines makes `inRange` exceed
`inClauses` and turns that case red — which is exactly why limit (4) exists and
is the right design. Two things are still wrong. First, the discharge's check (c)
states the result as *"exclusion three's line range swallows 12 and the live
`clause` strings carry 12 … **zero residue in any exclusion**"*: the residue is
117 lines, they merely carry no phrasing today, and "zero residue" is the
stronger claim. Second, the anchor is fragile in a way the band cannot see — a
band of 500..3000 around a construct that is really 1633 lines would not notice
the exclusion growing by another thousand, and a nested `Object.freeze([…])`
closing with `]);` anywhere inside a registry row would silently *shrink* it.

**Fix:** anchor the close on the construct rather than on a generic bracket, and
tighten the band to what was measured:

```ts
const closingOf = (start: number, closer: string): number =>
  lineOf((l) => l === closer, start);
// …
{ name: "the RESOLVER_REGISTRY declaration",
  from: registryStart,
  to: closingOf(registryStart, "] as readonly ResolverRecord[]);"),
  band: [1500, 2000] as const,
  proof: 'id: "constStrings"', … }
```

and correct check (c) in `.planning/REQUIREMENTS.md` to say what it measured —
"zero *declared-phrasing* residue", not "zero residue".

---

## Info (pass 8)

### IN-34: The synonym evasion is real, is correctly disclosed, and is worth pinning as a measured residual rather than only as prose

Executed. Planted at line 9796, outside all three exclusions:

```ts
  // An operator wrapping a global receiver is still silent in all spellings, at any nesting level whatsoever.
```

```
Tests  432 passed (432)
```

A false universal — the same claim CR-14 was raised about — re-enters the gate
file untouched when it is spelled `in all spellings` instead of `in every
spelling`. This is exactly what limits (1) and (3) of the guard's docblock say,
and what the discharge's row-3 scope note calls `CLASS TWO, UNDECLARED SPELLINGS
INSIDE THE GUARDED FILES`. So the disclosure is accurate and this is not a
finding against it. It is recorded because the disclosure is currently prose in
three places and no executed artifact: a case that plants a synonym, asserts the
guard stays green and says *that is the limit* would make the limit measurable
the way `FALSIFIED_HANDOFFS` made a falsified phrase measurable — and it would go
red the day somebody widens the list, which is the only event that would make the
sentence stale.

### IN-35: The residual-list title counts `bare-callee` as a mechanism added on 2026-08-24 when it is already item 1 of the same list

**File:** `packages/backend/src/store/error-redaction.spec.ts:1495`

```
"RESIDUAL, STILL OPEN AFTER IN-25 AND AFTER WR-36's SCOPING — a bare-identifier
 callee, a comma expression, an `await`, an ARRAY literal, and (2026-08-24) the
 object-literal, unwalked-argument and bare-callee mechanisms"
```

`a bare-identifier callee` opens the list and `bare-callee` closes it, so the
title names the same mechanism twice and reads as though three mechanisms were
added on 2026-08-24 when two were. The body gets this right — mechanism (iii)
says *"which is ALREADY the first item of this very list, twenty lines above, so
a shape whose silence comes from it is CROSS-REFERENCED there rather than
restated"* — and the loop below it carries shapes for (i) and (ii) only. Drop
`and bare-callee` from the title; the body's cross-reference is the correct
treatment and the title contradicts it.

### IN-36: `enumerateResolverPopulations` bounds `auditSource` by scanning for a bare `}` and reads `importAt`/`describeAt` without checking for `-1`

**File:** `packages/backend/src/outbound-prohibition.spec.ts:6359-6392`

```ts
let close = open + 1;
while (close < lines.length && lines[close] !== "}") close += 1;

const importAt = lines.findIndex((l) => l.startsWith("import "));
const describeAt = lines.findIndex((l) => l.startsWith("describe("));
```

The opening anchor throws a named `SentinelMissingError` when it is not found —
good, and the reason is stated. The three anchors beside it do not. `close` falls
through to `lines.length` if the closing brace is ever emitted as anything but a
bare `}` at column zero, silently widening population 1 over the rest of the
file; `importAt` or `describeAt` returning `-1` makes the second loop either scan
from index `-1` or not run at all, silently emptying population 2. Both failures
land on the non-vacuity assertions rather than on a message that says what moved,
which is a worse failure than the one the file already refuses to ship for the
opening anchor. Give the other three the same treatment — a `SentinelMissingError`
naming the anchor it looked for. (Same class as WR-48: the guard's anchors are
its weakest surface, and this is the one place the file's own convention of
failing loudly on a lost anchor is applied to one anchor out of four.)

---

_Reviewed: 2026-08-26T06:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
