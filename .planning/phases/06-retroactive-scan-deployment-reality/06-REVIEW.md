---
phase: 06-retroactive-scan-deployment-reality
reviewed: 2026-09-01T09:39:21Z
depth: deep
files_reviewed: 21
files_reviewed_list:
  - packages/backend/src/index.ts
  - packages/backend/src/scan/filter.ts
  - packages/backend/src/scan/producer.ts
  - packages/backend/src/scan/scans.ts
  - packages/backend/src/scan/httpql-discipline.spec.ts
  - packages/backend/src/scan/producer.spec.ts
  - packages/backend/src/filesystem-prohibition.spec.ts
  - packages/backend/src/store/migrations.ts
  - packages/backend/src/store/retention.ts
  - packages/backend/src/store/audit.ts
  - packages/backend/src/ingest/consumer.ts
  - packages/backend/src/telemetry.ts
  - packages/engine/src/thresholds.ts
  - packages/engine/src/contract.ts
  - packages/frontend/src/components/ScanPanel.vue
  - packages/frontend/src/components/ScanHistoryList.vue
  - packages/frontend/src/components/scan-contract.ts
  - packages/frontend/src/components/scan-lifecycle-presentation.ts
  - packages/frontend/src/stores/scan-progress.ts
  - scripts/phase6/matrix-leg.sh
  - scripts/phase6/pushdown-superset.sh
findings:
  critical: 1
  warning: 7
  info: 4
  total: 12
severity_breakdown:
  critical: 1
  high: 2
  medium: 5
  low: 4
status: issues_found
fix_pass:
  at: 2026-09-01T10:01:00Z
  scope: CR-01 and HI-01 only, by instruction
  fixed:
    - id: CR-01
      commit: 08d623c
    - id: HI-01
      commit: 58d48ed
  open: 10
---

# Phase 6: Code Review Report

**Reviewed:** 2026-09-01T09:39:21Z
**Depth:** deep (cross-file: producer → driver → RPC → store → frontend overlay)
**Files Reviewed:** 21 source files (specs read as evidence, not as subjects)
**Status:** issues_found

## Summary

The HTTPQL composition path (`scan/filter.ts`) survived adversarial reading: the DefMiner-first /
operator-last order holds on **every** path into `composeScanFilter`, the re-validation inside the
composer makes the "no unvalidated clause reaches the wire" claim a property of the function rather
than of its callers, and the omit-rather-than-throw choice fails in the narrowing direction. The
frontend rendering-safety contract also holds — I looked specifically for siblings of the caught
`role="alert"` issue and found none: no `title`, no tooltip, no bound `data-*` and no live region
carries the operator's clause on either surface. The SQL is `project_id`-scoped everywhere I traced
it, and the epoch re-base on resume is correct.

The defects are concentrated in three places the design's own prose treats as settled:

1. **The step v6 audit rebuild's atomicity argument cites a threshold whose measurement does not
   cover it.** `MULTISTATEMENT_EXEC_ATOMIC = true` was measured on a batch containing an explicit
   `BEGIN … COMMIT`; step v6 has neither. The partial state the JSDoc calls impossible is reachable,
   and it is unrecoverable.
2. **`ScanProgressPayload.heldAtWatermark` is structurally always `false`**, and the frontend's
   `live` overlay writes that constant over the true value from `getScanStatus`. The watermark hold
   — the field's entire reason for existing, per three separate paragraphs — can therefore never
   reach the operator once a scan has emitted one page, and the stall marker fires on it instead.
3. **The driver has an exit with no re-entry.** `stop === "failed"` logs and returns without arming
   the timer, leaving the row `running` for ever.

Two of these are in code paths no test exercises (`driveScan` has no spec at all beyond a reset
seam), and the third is asserted *as* `false` by `producer.spec.ts:1240` — a test pinning the bug.

---

## Critical

### CR-01: Step v6's `audit` rebuild is not atomic, and its partial state is unrecoverable

**STATUS: FIXED — commit `08d623c`.** The rebuild is now two steps (v6 creates and
copies, v7 swaps) with a durable `user_version` between them; `SCHEMA_VERSION` is 7.
The split taken is the one recommended below, with one correction to it: the sketch's
v7 still copies `FROM audit`, which is exactly the table the interrupted state is
missing, so the shipped v7 re-creates BOTH names under `IF NOT EXISTS` before copying
and converges from all three reachable states — including the post-rename re-entry,
where a DROP + RENAME-only v7 would drop the renamed ledger itself. The JSDoc's
atomicity claim was corrected rather than deleted. Three cases added to
`migrations.spec.ts`, one of them red against the pre-fix ladder.

**File:** `packages/backend/src/store/migrations.ts:568-585` (argument at `:488-495`)
**Severity:** Critical — permanent data loss plus a permanently blocked migration ladder.

**Defect.** The five-statement blob relies on `MULTISTATEMENT_EXEC_ATOMIC` for the claim that
"`audit` dropped, `audit_v6` still holding the rows, nothing to copy from on the next boot" cannot
exist. That threshold does not say what the step needs it to say. SPIKE-09's measurement
(`00-GO-NO-GO.md:362`) is explicit about the batch it ran:

> A single exec containing **BEGIN**, three good inserts, a UNIQUE-violating insert and **COMMIT**
> left ZERO rows when counted from a FRESH CONNECTION POOL after a plugin restart.

What was measured is that an **explicit transaction inside one `exec` is honoured**. Step v6's SQL
contains no `BEGIN` and no `COMMIT`, so each of its five statements runs in its own implicit
transaction, and SQLite's journal spans one statement, not the batch. The blob is a sequence, not a
unit.

**Failure scenario (concrete).**

1. Operator upgrades to the Phase 6 build; `init()` reaches `migrate()` with `user_version = 5`.
2. `CREATE TABLE audit_v6` commits. `INSERT OR IGNORE … SELECT … FROM audit` commits.
   `DROP TABLE IF EXISTS audit` commits.
3. Caido is quit, the container is stopped, or the machine loses power **before**
   `ALTER TABLE audit_v6 RENAME TO audit` commits. Window is small; the trigger is ordinary.
4. On disk: no `audit`, an `audit_v6` holding every row, `user_version` still 5.
5. Next boot re-runs step v6. Statement 1 is a no-op. Statement 2 is
   `INSERT … SELECT … FROM audit` → **`no such table: audit`** → `safe()` catches, `ddl_v6` records
   `ok:false`, the loop `break`s, `user_version` is never advanced. **Every subsequent boot repeats
   this, for ever.**
6. `index.ts:594-607` only *logs* `MIGRATION INCOMPLETE`; hooks are still registered. The plugin now
   runs against a database with no `audit` table: `recordAudit` fails on every irreversible action
   (D-16's whole subject), `listAudit` fails, and `sweepRetention`'s `COUNT_AUDIT_SQL` throws into
   the outer catch at `retention.ts:713`, so section **3c never runs** and the `scans` table loses
   both of its bounds as collateral.

The audit ledger — "the one table whose whole value is that nothing is ever removed from it" — is
gone, and no forward step can rebuild it because the ladder is stuck below the step that would.

**Fix.** Either wrap the blob in the shape SPIKE-09 actually measured, or split it so that no
re-run depends on a table a previous run may have dropped. The split is the safer of the two,
because it does not put a poisonable write transaction on the boot path:

```ts
// step v6 — create and copy. Re-runnable: `audit` still exists on every re-entry.
{ v: 6, sql: `
CREATE TABLE IF NOT EXISTS audit_v6 (...);
INSERT OR IGNORE INTO audit_v6 (project_id, event_id, at, kind, subject, detail)
  SELECT project_id, event_id, at, kind, subject, detail FROM audit;
` },
// step v7 — swap. Re-runnable: statement 1 recreates audit_v6 if v7 half-applied,
// and the copy source is whichever of the two tables survived.
{ v: 7, sql: `
CREATE TABLE IF NOT EXISTS audit_v6 (...);
INSERT OR IGNORE INTO audit_v6 (...) SELECT ... FROM audit;   -- no-op after the drop
DROP TABLE IF EXISTS audit;
ALTER TABLE audit_v6 RENAME TO audit;
CREATE INDEX IF NOT EXISTS idx_audit_at ON audit (project_id, at);
` },
```

If the batch-with-`BEGIN` route is taken instead, the `user_version` bump must stay in its own
`exec` (it already does) and the file header's connection-poisoning caveat at `:43` must be
re-argued for the boot path.

**Also update:** `migrations.ts:491` states MULTISTATEMENT_EXEC_ATOMIC covers a `BEGIN`-less blob.
It does not, and `01-RESEARCH.md:450`'s own phrasing ("migration DDL may be batched … it is
`IF NOT EXISTS`-idempotent and **essentially cannot fail**") is the narrower claim step v6 broke by
adding three statements with no such guard.

---

## High

### HI-01: `ScanProgressPayload.heldAtWatermark` is always `false`, and the frontend overlay pins it there

**STATUS: FIXED — commit `58d48ed`.** The watermark gate now emits one payload carrying
the row's counters unchanged and `heldAtWatermark: true`, on every held re-entry.
`ScanPanel.vue:485` was deliberately NOT changed to `row.heldAtWatermark`: once the
channel carries the hold, layering `progress` over `row` is correct, and reading the
row would make a hold that begins after mount invisible until Refresh. The assertion
that pinned the defect was `producer.spec.ts`'s `toHaveLength(0)` on the held path, not
the `toBe(false)` at `:1240` — `false` is the correct answer for a walk that does not
hold, and it is only now falsifiable. `ScanPanel.spec.ts` gains the operator-facing
case: a hold arriving as a progress event holds the waiting word past
`ARTIFACT_DEADLINE_MS`.

**Files:** `packages/backend/src/scan/producer.ts:572-592, 733-753` and
`packages/frontend/src/components/ScanPanel.vue:485`
**Severity:** High — the one signal the design says cannot be derived is never delivered, and the
marker it was built to suppress fires in its place.

**Defect.** `heldAtWatermark` (module state, `producer.ts:411`) can only be `true` between line 573
and either the `return outcome("held")` at 585 or the reset at 589. The per-page emit at 733-753
is reached **only after** line 592 has unconditionally set it `false`. So the value serialised onto
every progress payload (`producer.ts:752`) is a compile-time constant `false`.

The frontend then makes this actively harmful rather than merely dead. `ScanPanel.vue:471-486`
layers the progress payload over the status read, including `heldAtWatermark: progress.heldAtWatermark`
— so the moment **one** progress event lands for the current scan, the true value that
`getScanStatus` read out of `isHeldAtWatermark()` (`index.ts:1197`) is overwritten with `false` and
stays overwritten, because a held producer emits nothing that could correct it.

**Failure scenario (concrete).** A backfill on a project with live browsing in progress:

1. Operator presses **Start scan**. Page 1 walks, emits progress `{heldAtWatermark: false, …}`.
   Panel renders **Scanning**. Correct.
2. The consumer falls behind (a few large bundles at `TOKENIZER_MS_PER_MB` — the exact case
   WINDOWS 75 describes). Queue depth crosses `SCAN_BACKPRESSURE_WATERMARK`.
3. `runScanProducer` sets `heldAtWatermark = true` and returns `held`. **No progress event is
   emitted on this path.** `driveScan` re-arms every 250 ms; each re-entry holds again.
4. The panel's `live.heldAtWatermark` is still the `false` from step 1. Counters are frozen because
   no page walks. `scanStatusWord` skips the `SCAN_STATUS_WAITING_FOR_QUEUE` arm
   (`scan-contract.ts:980`) and falls through.
5. `ARTIFACT_DEADLINE_MS` after the last counter change, the panel renders
   **"Not advancing"** + `SCAN_NOT_ADVANCING_LINE` ("No counter has moved for over …").

The operator is told a healthy, self-recovering backpressure hold is a stalled backend — which is
verbatim the outcome three separate comment blocks (`producer.ts:397-410`, `index.ts:1187-1196`,
`scan-contract.ts:944-951`) declare the field exists to prevent. The next control the copy invites
is **Discard**, which destroys the cursor.

Nothing catches this: `producer.spec.ts:1240` asserts `payload.heldAtWatermark` is `false` as an
expectation, and `ScanPanel.spec.ts:478` only drives `true` through the *status read* fixture, never
through a progress event.

**Fix.** Emit the hold, and stop letting the overlay clobber a field the event does not know:

```ts
// producer.ts — emit on the hold path too, before returning "held".
if (deps.queue.depth >= SCAN_BACKPRESSURE_WATERMARK) {
  heldAtWatermark = true;
  await emitProgress(deps, projectId, { ...progressFrom(scan, totals), heldAtWatermark: true });
  return outcome("held", totals);
}
```

```ts
// ScanPanel.vue:485 — until the hold is on the wire, do NOT layer it.
// The status read is the only source that has isHeldAtWatermark() in hand.
-    heldAtWatermark: progress.heldAtWatermark,
+    heldAtWatermark: row.heldAtWatermark,
```

and assert the pairing in `producer.spec.ts`: a walk that holds must emit exactly one payload
carrying `heldAtWatermark: true`.

### HI-02: `driveScan` never re-arms after a failed walk — the scan is stuck `running` for ever

**File:** `packages/backend/src/index.ts:439-441` (arm sites: `:406`, `:1137`, `:1267`)
**Severity:** High — a transient SDK error permanently ends a backfill while the surface keeps
claiming it is scanning.

**Defect.** `armScanDriver` has exactly three call sites: the `held`/`busy` arm at `:406`, the
`startScan` RPC at `:1137`, and the `resumeScan` RPC at `:1267`. The `failed` arm at `:439` logs and
returns. `runScanProducer` reports `failed` from two places — `execute()` throwing
(`producer.ts:615`) and `advanceScan` returning `!ok` (`producer.ts:708`) — and **neither writes any
lifecycle state**. The row stays `state = 'running'`.

**Failure scenario (concrete).** A 40,000-request backfill, four hours in:

1. One `execute()` rejects — a transient SDK/IPC hiccup, a query the engine declines under load,
   anything at all.
2. `runScanProducer` returns `{stop: "failed", …}`. `driveScan` logs `scan walk failed: …` to the
   Caido console and returns.
3. No timer is armed. `walking` is back to `false`. Nothing anywhere will call the producer again.
4. `scans.state` is still `running`, so `startScan` refuses with `already-running` and the start
   form is not offered. `getScanStatus` returns state `running`; the panel shows **Scanning**, then
   **Not advancing** 30 s later, and the *only* recovery is for the operator to guess that Pause →
   Resume re-arms the driver. The suspension reason vocabulary has no member for this, so nothing
   on screen names what happened.
5. Ninety days later, `SCANS_OVER_AGE_SQL` (`retention.ts:335-341`, `state <> 'suspended'`) deletes
   the row and its cursor outright — a stuck `running` scan is *not* exempt from the age bound.

**Fix.** A failed walk is a retryable pacing event or a genuine stop; treat it as the former with a
bounded count, and as a suspension when the count is exhausted:

```ts
case "failed":
  log(sdk, "scan walk failed: " + outcome.error);
  // A walk that failed still has a valid cursor. Re-arm so a transient refusal
  // does not end a four-hour backfill, and suspend with a reason once a bounded
  // number of consecutive failures says it is not transient.
  if (++consecutiveScanFailures <= SCAN_DRIVER_MAX_CONSECUTIVE_FAILURES) {
    armScanDriver(sdk, database);
  } else {
    consecutiveScanFailures = 0;
    await pauseScan(database, pid, /* the active scan id */, Date.now());
  }
  return;
```

(Every non-failed arm must reset `consecutiveScanFailures`.) If re-arming is judged wrong, the
minimum acceptable alternative is to move the row to `suspended` with a named reason, so the surface
stops claiming the scan is running and Resume becomes the obvious control.

---

## Medium

### ME-01: A scan that finishes, is discarded or is suspended never tells the panel — it keeps rendering as running

**Files:** `packages/backend/src/scan/producer.ts:626, 763` and
`packages/backend/src/index.ts:408-431`
**Defect.** Progress is emitted only from inside the page loop, always with `state: "running"`
(`producer.ts:739`). The three exits that change lifecycle state — `completed` (both returns),
`epoch-changed` → `reconcileScanEpoch`, and `suspendForRetentionEviction` from the consumer
(`consumer.ts:464`) — write the new state to `scans` and emit nothing. `ScanPanel` re-reads
`getScanStatus` only on mount, on the Refresh button, and after its own lifecycle commands.

**Failure scenario.** A backfill finishes at 02:14. `driveScan` writes `state = 'completed'`. The
panel still holds the last progress payload, whose `state` is `"running"`; `live` layers it over the
status read, so `scanStatusWord` takes the `running` branch. Counters are frozen, so 30 s later the
operator's screen reads **"Not advancing — No counter has moved for over …"** about a scan that
completed successfully. Same shape for a retention-eviction suspension: the D-08 copy block
(`ScanPanel.vue:739-760`) that names the cause and the two remedies is gated on
`live.state === 'suspended'`, so it never appears until the operator happens to press Refresh.

**Fix.** Emit one terminal progress payload from each transition (`completeScan`,
`suspendOnEpochChange`, `suspendForRetentionEviction`, `discardScan`) carrying the row's new state,
or — cheaper — have `ScanPanel` re-read `getScanStatus` whenever an applied progress payload's
`scanId` matches but its counters have not moved for one throttle window.

### ME-02: `advanceScan` returning `changes === 0` is treated as success

**Files:** `packages/backend/src/scan/producer.ts:689-708`, `packages/backend/src/scan/scans.ts:340-365`
**Defect.** `ADVANCE_SQL` guards on `state = 'running'`. When the guard declines, `advanceScan`
returns `{ ok: true, changes: 0 }` and `producer.ts:708` only checks `advanced.ok`. The walk then
adds the page to `totals`, bumps the shipped `counters.retro.*`, and emits a progress payload built
from `scan.pages_walked + 1`, `scan.seen + items.length` … for a row that was never advanced.
`index.ts`'s own `runScanCommand` (`:1230`) treats the identical condition as `guard-declined`, so
this file is the odd one out.

**Failure scenario.** The operator presses **Pause** while a page is between its `readFinishedRequestIds`
await and its `advanceScan` await. `PAUSE_SQL` commits `state = 'suspended'`. `ADVANCE_SQL` matches
zero rows. The panel receives a progress event announcing 41 pages / 820 seen and `state: "running"`;
the persisted row says 40 / 800 and `suspended`. The operator presses Refresh and **the counters go
backwards**, on the one surface built to answer "is it moving". The page's 20 full-body transfers
are also silently redone on resume, because the cursor never moved.

**Fix.**

```ts
if (!advanced.ok) return outcome("failed", totals, advanced.error);
// A DECLINED advance is not a failure and is not a success: the row moved out of
// `running` under us — paused, discarded, or suspended by retention. Nothing on
// this page may be counted, because nothing was persisted.
if (advanced.changes === 0) return outcome("no-scan", totals);
```

### ME-03: `filesystem-prohibition.spec.ts` has no unanalysable-specifier rule, so an assembled module specifier passes silently

**File:** `packages/backend/src/filesystem-prohibition.spec.ts:590-621`
**Defect.** This is the "gate that asserts less than it claims" shape. `reportSpecifier` resolves a
specifier through `literalOf`, which returns `undefined` for a template/concatenation and for an
identifier bound to more than one literal — and there is **no `else`**. The hosted-file half of the
same gate has exactly the rule this half is missing (`hosted-file-unanalysable`, `:270-284`, whose
own text says "a key assembled from pieces is the one shape that defeats an AST gate SILENTLY — the
walk returns nothing and the file reports clean, which is INDISTINGUISHABLE FROM A PASS"). The
argument was made and then applied to only one of the two surfaces.

**Failure scenario.** Both of these are shipped, non-spec backend modules today and both audit clean:

```ts
const M = "llrt/" + "fs";      // isAssembledString → tracked as assembled, never reported
const fsmod = await import(M);  // literalOf() → undefined → no violation, no unanalysable report

let spec = "node:fs";
if (cond) spec = "node:path";   // constStrings.get("spec").size === 2
const alt = require(spec);      // literalOf() → undefined → clean
```

The rule's own stated purpose — "it bans the CAPABILITY, not the usage, so there is no
is-this-a-read-or-a-write judgement to get wrong" — is defeated by a string concatenation, and
D-17/D-18's whole guarantee rests on this walk.

**Fix.** Mirror the hosted-file arm: when a specifier position is present but unresolvable **and**
the walk watched its parts being assembled (or saw the identifier take more than one literal),
report a new `fs-specifier-unanalysable` rule with the same "resolve the value, or delete the
indirection" text. Narrow it to watched-assembly the same way, so it cannot fire on an ordinary
variable it simply never saw bound.

### ME-04: `composedPreview` is a second HTTPQL composer, outside the gate that exists to forbid one

**Files:** `packages/frontend/src/components/scan-contract.ts:834-841`,
`packages/backend/src/scan/httpql-discipline.spec.ts:95-98`,
`packages/backend/src/scan/filter.ts:8-13`
**Defect.** `filter.ts`'s header states the invariant as "Every HTTPQL string that reaches
`sdk.requests.query().filter(...)` is produced HERE, by `composeScanFilter`, **and by no other
function in DefMiner**", and the gate's own prose says "A second COMPOSER is the hazard, and a
second composer is what the gate reports." `composedPreview` **is** a second composer — it rebuilds
the parenthesisation and the DefMiner-first ordering by hand — and it lives in
`packages/frontend/src`, which `httpql-discipline.spec.ts` does not walk (`BACKEND_SRC` only, on the
stated grounds that "packages/engine holds no SDK"; the frontend was not considered).

**Failure scenario.** It agrees with the backend today, which is why nothing is broken *yet*. The
exposure is the drift the gate was built to make impossible: a future edit that puts the operator's
clause first in the preview, or drops a pair of parentheses, changes what the operator is shown the
scan will run **without changing what it runs**. That breaks D-05's checkability property — the
whole reason the composed string is rendered at all — and nothing red goes off.

**Fix.** Either extend the gate's `SOURCE_ROOTS` to `packages/frontend/src` and add
`composedPreview` as the one declared frontend composer with a paired equivalence test
(`composedPreview(SCAN_KIND_CLAUSE, c) === composeScanFilter("", c)` over a fixture set including
the rejection cases), or move the preview composition into `@defminer/engine/contract` beside
`SCAN_KIND_CLAUSE` so both packages call one function. At minimum, correct the "no other function in
DefMiner" sentence, which is currently false.

### ME-05: The `heldAtWatermark` module flag is never cleared on the `no-scan`, `epoch-changed` or `busy` exits

**File:** `packages/backend/src/scan/producer.ts:549, 555-565, 592`
**Defect.** The flag is reset only at `:589`/`:592`, both *after* the project, scan-row and epoch
guards. Every early return above them leaves the previous walk's value in place, and
`isHeldAtWatermark()` is read by an unrelated RPC (`index.ts:1197`).

**Failure scenario.** A scan holds (flag `true`); the operator discards it and starts a new one.
`startScan` arms the driver for 250 ms. A `getScanStatus` inside that window returns
`heldAtWatermark: true` for a scan with `pagesWalked === 0`; `scanStatusWord`'s precedence puts the
hold **above** the starting word (`scan-contract.ts:978-981`), so the panel renders "Waiting for the
analysis queue" for a scan whose first query has not even been issued. Transient, but it is the
readout's first frame and it is wrong.

**Fix.** Reset at the top of the loop body, before the guards, so the flag can never outlive the
walk that set it:

```ts
for (;;) {
  heldAtWatermark = false;          // the hold is set below, per iteration
  const projectId = await deps.getProjectId();
  ...
```

and clear it in the `finally` at `:769` alongside `walking = false`, except on the `held` return.

---

## Low

### LO-01: `retention.ts` credits the suspended-row bound to an index that does not provide it

**File:** `packages/backend/src/store/retention.ts:322-325`
**Defect.** "`idx_scans_one_running` already bounds suspended rows to one per project at a time" is
false. The partial UNIQUE index is `ON scans (project_id) WHERE state = 'running'`
(`migrations.ts:417-418`) — it bounds **running** rows and says nothing about suspended ones. What
actually keeps the age-exempt population at one is the `startScan` RPC's pre-read
(`index.ts:1103-1112`), which refuses a start while *any* active scan exists. That is an
application-level check across two operations on a pooled driver, not a database constraint —
weaker than what the paragraph claims, and it is the load-bearing half of D-26's
"the exempted population is small by construction" survivability argument.

**Fix.** Restate the sentence to name the real mechanism, and make it durable if the exemption is to
keep resting on it — e.g. a second partial unique index `ON scans (project_id) WHERE state = 'suspended'`,
which would also convert the RPC's TOCTOU window into a fail-closed insert exactly as the running
index already does.

### LO-02: The `scans` row cap silently reuses the artifact cap

**File:** `packages/backend/src/store/retention.ts:688`
**Defect.** `bounds.maxRows` is the artifacts/observations/analyses cap
(`DEFAULT_RETENTION_MAX_ROWS`, `settings.ts:313`). Applying it unchanged to `scans` means the "row
cap still bounds growth" half of D-26 does not engage until a project holds tens of thousands of
scan rows. `audit` got its own `auditMaxRows` for precisely this reason. Not currently reachable
(one scan at a time, and non-suspended rows age out), but the stated bound is not the bound in force.

**Fix.** Add `scansMaxRows` beside `auditMaxRows`, or state in the comment that the artifact cap is
deliberately reused and why the resulting ceiling is acceptable.

### LO-03: `readFinishedRequestIds` silently truncates if a page ever exceeds `SCAN_PAGE_SIZE`

**File:** `packages/backend/src/scan/producer.ts:362-380` (loop bound at `:368`)
**Defect.** The bind loop runs `i < SCAN_PAGE_SIZE` over `requestIds`, while the caller passes
`items.map(...)` for whatever `execute()` returned. `first(20)` should bound it, but if the SDK ever
over-delivers, the tail of the page is checked against nothing, D-03's skip is silently lost for
those items, and they are re-offered and re-analysed. The module already fails loudly on the
symmetric mistake (`:345-352`, statement placeholders vs page size); this direction has no guard.

**Fix.** `const ids = requestIds.slice(0, SCAN_PAGE_SIZE);` plus an explicit
`if (requestIds.length > SCAN_PAGE_SIZE) counters.storeErrors++ /* or throw */`, so an over-delivering
SDK is observable rather than silently narrowing the skip set.

### LO-04: `jq_get` evaluates its second argument with Python `eval`

**File:** `scripts/phase6/matrix-leg.sh:598-604`
**Defect.** `v=eval(sys.argv[2])` over an expression string. Every call site in the file passes a
DefMiner-authored literal, and `LEG` is validated against a closed set at `:71-77`, so there is no
reachable injection today. It is still an `eval` in a harness that also shells out to `docker` and
`curl`, and it costs nothing to avoid.

**Fix.** Replace the expression protocol with a dotted key path resolved by a loop
(`for k in sys.argv[2].split("."): d = d[k]`), which covers every current call site.

---

## Confirming, not new

- **WINDOWS 84** (leading-keyword blind spot in `sql-discipline.spec.ts`) is real and I found no
  fourth instance beyond the two it names — but note CR-01: the JSDoc block that documents the blind
  spot is also the block whose atomicity argument does not hold, so the "argument is made rather
  than delegated" compensation is itself defective.
- **WINDOWS 75** (the watermark is a drop bound and says nothing about latency) is the exact
  operating condition under which HI-01 misfires. The two compound: the state WINDOWS 75 predicts
  will be common is the state HI-01 renders as a fault.
- **WINDOWS 94** (`analysed` is still `null`) is visible on both payloads and correctly rendered as
  an em dash rather than a lying zero.

## Verified clean (looked for defects, found none)

- `composeScanFilter` ordering and re-validation across every input path, including `""`,
  whitespace-only, balanced-but-adversarial, unterminated-string and quoted-parenthesis clauses;
  the fail-closed property holds because the operator's term is last and unconditionally wrapped.
- `positionClause` uses `lt` on a descending walk — no gap, no re-walk.
- Every multi-row read added this phase (`SKIP_DONE_SQL`, `GET_ACTIVE_SCAN_SQL`, `LIST_SCANS_SQL`,
  `SCANS_OVER_AGE_SQL`, `SCANS_OLDEST_SQL`) is `project_id`-scoped and fully bound; the v6 rebuild's
  absent scope is correct and deliberate.
- The epoch re-base is correct on **every** transition, not just resume: `RESUME_SQL` writes the
  current epoch, `START_SQL` writes `projectEpoch()` at insert, and no other statement preserves a
  stale one.
- Rendering safety on both new surfaces: the operator's clause reaches only `forCellText` /
  `forPanel`, always in `font-mono`, never in a `title`, tooltip, bound `data-*`, `aria-label`, or
  live region. `role="alert"` is on DefMiner-authored sentences only; the clause echo at
  `ScanPanel.vue:962` is a silent sibling.
- Vocabulary separation: `completed` renders **Finished** everywhere, no label in either map is a
  prefix of a label in the other, and nothing crosses `analyses.scan_state` with `scans.state`.

---

## Fix pass, 2026-09-01

CR-01 (`08d623c`) and HI-01 (`58d48ed`) are fixed. **The other ten findings remain
OPEN, and this document is their record** — HI-02, ME-01 through ME-05, and LO-01
through LO-04 were out of scope for that pass by instruction, not by judgement.
Recorded in `.planning/WINDOWS.md` as entry 107.

One severity note from the fix pass, on a finding NOT fixed: ME-05 and HI-01 interact.
HI-01's fix puts the hold on the progress channel but does not touch the module flag,
so the stale-`true` early-return paths ME-05 names still reach the panel through
`getScanStatus` exactly as before. ME-05 was neither closed nor made worse.

One finding NOT in this review, surfaced while fixing CR-01: `migrations.spec.ts`
defined `applyThroughV5`, `seedAudit`, `readAudit` and `indexNames` and **called none
of them**. The row-preservation assertion step v6's JSDoc calls "the only thing
standing between a silent skip and a green run" was described in prose and never
written, so the rebuild shipped with no row-preservation coverage at all. Written as
part of `08d623c`.

---

_Reviewed: 2026-09-01T09:39:21Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
