---
phase: 01-skeleton-persistence-compatibility
reviewed: 2026-08-21T00:30:00Z
depth: standard
files_reviewed: 54
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
  critical: 1
  warning: 10
  info: 7
  total: 18
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-08-21T00:30:00Z
**Depth:** standard
**Files Reviewed:** 54 (34 production and gate files, 20 spec and config files read for cross-reference)
**Status:** issues_found

## Summary

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

### WR-02: `resetDbHandle()` never affects production, and the spec that "proves" it does never runs the production path

**File:** `packages/backend/src/store/db.ts:40-42`, `packages/backend/src/lifecycle.ts:205-209`, `packages/backend/src/index.ts:162` (spec: `packages/backend/src/lifecycle.spec.ts:295-320`)

**Issue:** `index.ts:162` does `db = await getDb(sdk)` **once** and hands that object to `startConsumer({ db })` and to both read RPCs. Nothing calls `getDb()` again for the lifetime of the plugin. So when `applyProjectChange` calls `resetDbHandle()`, it clears a memo no one will ever consult, and the comment above it — "The next write re-resolves the handle" (`lifecycle.ts:206`) — is false.

The test asserts the memo, not the plugin: it calls `getDb()` by hand before and after the change and counts `meta.db()` invocations. Its failure message ("the next write would go through a handle resolved while the previous project was selected") describes a production property that holds neither before nor after the change.

This is benign *today* — `sdk.meta.db()` is one plugin-global database, so reusing the handle is arguably right — which is exactly why it is dangerous: a later phase that adds a genuine per-change reset requirement will read this code, the comment and the green test, and conclude the mechanism works.

**Fix:** pick one and make the test match it. Either (a) delete `resetDbHandle()` and its call, and record in `db.ts` that one pooled handle spans every project by design; or (b) make the consumer and the RPCs resolve through `getDb(sdk)` at each use so the reset means something, and rewrite the spec to drive `handleOne` across a change and count `meta.db()` calls made by production code.

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

### WR-07: `observations.url` persists query strings verbatim, in a database that outlives the project and the install

**File:** `packages/backend/src/store/observations.ts:32-41`, `packages/backend/src/store/migrations.ts:57-66`, exposed by `packages/backend/src/index.ts:267-271`

**Issue:** `normaliseObservedUrl` strips the fragment and keeps the query, deliberately. That means a signed URL or a token-bearing bundle URL — `https://cdn.example/app.js?access_token=…`, `…?X-Amz-Signature=…` — is written to SQLite in full (up to 2048 chars) and returned over the `getObservations` RPC.

This is a documented decision, and the retained query genuinely matters for the cache-hit measurement. But it directly contradicts the mitigation the phase claims elsewhere and never reconciles: `schema.spec.ts:36-40` says "a stolen copy of the plugin database must be a list of URLs, digests and byte counts, **not a credential dump**", and `01-RESEARCH.md`'s threat table says "Phase 1 creates no column that can hold a secret. Enforce by *absence*." A query string is a column that can hold a secret. The asymmetry is stark: `telemetry.ts:236` redacts URLs out of a 240-character error string because they "often carry a session token in the query", while the same value is stored unbounded-in-time one module away — in a file `db.ts:3-6` notes is never GC'd, survives project deletion, and survives force-reinstall.

**Fix:** decide it explicitly rather than by inheritance. The cheapest option that keeps the cache measurement intact is to store the query's *identity* rather than its content — e.g. keep the path and a digest of the sorted query keys+values — and to record the tradeoff in `schema.spec.ts`'s allowlist comment either way. If the raw query is kept, the comment claiming "not a credential dump" must be corrected, and DIST-02's disclosure needs to say the plugin database retains full request URLs for 90 days by default.

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

### WR-09: Retention failures are discarded with no counter, no log and no error record

**File:** `packages/backend/src/store/retention.ts:386-392, 477-484`

**Issue:** Two swallows on the same path. `deleteOne` returns `0` on any rejection with an empty `catch {}`, and `sweepRetention`'s outer handler does `void e; moreWork = true;` — the error object is explicitly discarded, not recorded. The caller (`consumer.ts:248-276`) only increments `retentionSweeps`/`retentionDeleted` and logs when `moreWork` is set.

So a sweep that fails on every row for a structural reason — a locked database, a schema the migration ladder left partial (`index.ts:168-181` explicitly allows the plugin to run on) — produces: `retentionSweeps` climbing, `retentionDeleted` stuck at 0, no `lastError`, no `storeErrors`, and a log line saying "more remains for the next cadence boundary" forever. Retention is stated three times in this file to be *the only bound* on the database's growth, and its failure is the one thing nothing reports. On a runtime whose own measured behaviour is `HANDLER_ERROR_SURFACED = "neither"`, discarding the error is discarding the only record that will ever exist.

**Fix:** count and record. `deleteOne` should return `{deleted, error}` or take an `onError` callback; `sweepRetention` should carry `errors: number` (or a `lastError` string) on `RetentionSweepSummary`; and `runRetentionPass` should feed both into `counters.storeErrors` and `recordError`. Add a spec case with a delete statement that always rejects, asserting the counter moves.

### WR-10: `checkCompat` and the refusal-path RPC registrations run outside `init()`'s try/catch

**File:** `packages/backend/src/index.ts:134-155` (guard starts at `:159`)

**Issue:** The comment block at the top of the file says the catch exists because "an init failure that is not caught here is completely invisible". Four statements sit outside it: `checkCompat(sdk)` (`:138`), the version read (`:139-140`), and the two `sdk.api.register` calls on the refusal path (`:149`, `:153`). `checkCompat` walks `sdk` with property access (`compat.ts:129-136`) — a throwing accessor, a revoked proxy, or an `api.register` that rejects a duplicate name on the refusal path, all escape `init()` into a runtime that logs nothing. The plugin then has no hook, no RPC and no log line: the exact "obscure failure" COMPAT-01 forbids.

**Fix:** move `try {` above line 138 and keep the existing catch, which already sets `compatible = false` and re-registers `getStatus` defensively.

---

## Info

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

_Reviewed: 2026-08-21T00:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
