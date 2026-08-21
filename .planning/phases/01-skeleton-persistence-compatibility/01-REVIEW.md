---
phase: 01-skeleton-persistence-compatibility
reviewed: 2026-08-21T15:23:01Z
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
depth: standard
files_reviewed: 58
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
  critical: 7
  warning: 21
  info: 19
  total: 47
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
    ]
  partially_fixed: [IN-09]
  deferred: [WR-07]
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
      IN-18,
      IN-19,
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
tests_before: 27 files / 616 tests
tests_after: 28 files / 637 tests
---

# Phase 1: Code Review Report

**Reviewed:** 2026-08-21T00:30:00Z (initial, 54 files), 2026-08-21T11:21:31Z (gap closure, 13 files) and 2026-08-21T15:23:01Z (gap closure round 2, 9 files)
**Depth:** standard
**Files Reviewed:** 58 (union of all three passes)
**Status:** issues_found — five new BLOCKERs from the gap-closure pass, on top of `WR-07` (deferred) and `IN-01…IN-07` (open)

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

_Pass 1 reviewed: 2026-08-21T00:30:00Z_
_Pass 2 reviewed: 2026-08-21T11:21:31Z_
_Pass 3 reviewed: 2026-08-21T15:23:01Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
