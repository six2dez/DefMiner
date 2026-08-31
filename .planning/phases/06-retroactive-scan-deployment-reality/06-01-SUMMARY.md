---
phase: 06-retroactive-scan-deployment-reality
plan: 01
subsystem: scan
tags: [httpql, sqlite, migration, vue, rpc, backfill, caido-sdk]

requires:
  - phase: 01-tracer-and-the-passive-path
    provides: "`hooks/admit.ts`'s five-axis admission gate, `engine/queue.ts`'s BoundedQueue, the ingest consumer, and the forward-only migration ladder the scans table appends to"
  - phase: 05-inventory-evidence-and-the-operator-surface
    provides: "the four-tab workspace, the typed RPC contract with its version handshake, the `*-contract.ts` copy idiom, and the `audit` / `retry` table-module patterns step v5 and `scan/scans.ts` are built from"
provides:
  - "Migration step v5: the `scans` table, two indexes, and SCHEMA_VERSION 5"
  - "`SCAN_LIFECYCLE_STATES` / `SUSPEND_REASONS` / `SCAN_KIND_CLAUSE` / `ScanStatusPayload` in the engine contract"
  - "`composeScanFilter` — the one producer of a scan filter string"
  - "`startScan` / `advanceScan` / `getActiveScan` / `isRequestFinished` over the scans table"
  - "`runScanProducer` — one page of `sdk.requests.query()` through the shipped admit() into the shipped queue"
  - "The `startScan` and `getScanStatus` RPC endpoints, at CONTRACT_VERSION 5"
  - "The fifth tab and `ScanPanel.vue` — the start form and the no-denominator progress readout"
affects: [06-03 backpressure watermark, 06-04 operator clause validator, 06-05 lifecycle transitions, 06-06 retro counters, 06-09 discard, 06-10 restart matrix, 06-11 push-down proof, 06-12 scan history, 06-13 toolbar indicator]

actuals:
  tokens: 50038
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Two adjacent closed vocabularies in one contract module, with the collision named at the point of declaration"
    - "A shared HTTPQL constant in the engine so the frontend can render what the backend will send"
    - "A one-producer rule for composed query strings, enforced by a module header until 06-04's static gate"
    - "A partial UNIQUE index as the atomic form of a one-at-a-time invariant on a driver with no usable transaction"

key-files:
  created:
    - packages/backend/src/scan/filter.ts
    - packages/backend/src/scan/scans.ts
    - packages/backend/src/scan/scans.spec.ts
    - packages/backend/src/scan/producer.ts
    - packages/frontend/src/components/scan-contract.ts
    - packages/frontend/src/components/ScanPanel.vue
  modified:
    - packages/engine/src/contract.ts
    - packages/engine/src/thresholds.ts
    - packages/backend/src/store/migrations.ts
    - packages/backend/src/store/schema.spec.ts
    - packages/backend/src/api/spec.ts
    - packages/backend/src/index.ts
    - packages/frontend/src/api/client.ts
    - packages/frontend/src/App.vue

key-decisions:
  - "Migration step v5 ships the eighteen-column `scans` table approved at this plan's blocking-human checkpoint; only the aggregate `rejected` is durable and O-04 is designed around rather than bet on"
  - "`SCAN_KIND_CLAUSE` lives in the engine contract, not in `scan/filter.ts`, because the start form must render it before any scan row exists"
  - "`ScanStatusPayload.analysed` is `number | null` — absent rather than zero — until plan 06-06 wires the consumer-side number"
  - "A non-empty operator clause is REFUSED with a closed reason code rather than silently dropped, because running a wider scan than the operator asked for is the one outcome D-05 exists to prevent"
  - "The skip-done read is a scalar subquery rather than a JOIN, so both arms carry their own `project_id` predicate under the static SQL gate"

patterns-established:
  - "Vocabulary collision handling: two closed sets sharing a literal are declared adjacently with the collision named, the database column names diverge, and no operator-facing label is a prefix of another"
  - "Clause-order-as-mitigation: DefMiner's narrowing first and the operator's clause last, so a trailing HTTPQL comment unbalances the expression and fails closed at execute()"
  - "Absent-not-zero: a counter the backend cannot attribute crosses the RPC as `null` and renders as an em dash"

requirements-completed: []

coverage:
  - id: D1
    description: "Migration step v5 creates `scans`; the table set is exactly six names in `name ASC` order with `scans` between `observations` and `settings`, and SCHEMA_VERSION is 5"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#the ladder head is step v5 — the version bump IS the appended entry"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts#the table set is EXACTLY the six approved tables"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#step v5 brings `scans` to a database that stopped at v1, losing no seeded row"
        status: pass
    human_judgment: false
  - id: D2
    description: "The `scans` identifier is `scan_id`, `project_id` is at PRIMARY KEY ordinal 1, every column is on COLUMN_ALLOWLIST, and no table has a column named `id`"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts#scans keys on (project_id, scan_id) IN THAT ORDER, by PRAGMA ordinal"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts#every column across every table is on the explicit allowlist"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts#no forbidden column name exists in any table"
        status: pass
    human_judgment: false
  - id: D3
    description: "At most one running scan per project, enforced by a partial UNIQUE index at the driver rather than by a read-then-write"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/store/schema.spec.ts#at most ONE running scan per project, enforced by the driver and not by a prior read"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#a SECOND start on a project that already has a running scan creates no second row"
        status: pass
    human_judgment: false
  - id: D4
    description: "`composeScanFilter` composes (kind) AND (position) AND (operator) with every clause bracketed, DefMiner's first and the operator's last, omitting an absent term rather than emitting `()`"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#composes ONE parenthesised term on a first page, never an empty `()`"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#puts the OPERATOR's clause LAST, and that order is the mitigation"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#parenthesises EVERY clause, so the meaning survives either precedence reading"
        status: pass
    human_judgment: false
  - id: D5
    description: "One producer pass over a three-item page offers exactly one queue entry and moves every counter; the resume boundary is strictly `row.id.lt:` and the walk is `descending(\"req\",\"id\")`"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#walks ONE page: three items in, exactly one queue entry out, every counter moved"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#resumes STRICTLY BELOW the last walked request — no overlap and no gap"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#orders DESCENDING on the request id — a unique integer, so no two items tie"
        status: pass
    human_judgment: false
  - id: D6
    description: "The persisted position timestamp comes from `item.request.getCreatedAt()` and never from the clock"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#takes the position from the ITEM's capture time, never from the clock"
        status: pass
    human_judgment: false
  - id: D7
    description: "Caido's own scope is applied with no override — the shipped `admit()` runs unchanged on every returned item"
    requirement: FIND-03
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#applies Caido's OWN scope with no override (D-07)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/scans.spec.ts#skips only FINISHED work — a partial or failed analysis is re-offered"
        status: pass
    human_judgment: false
  - id: D8
    description: "`startScan` and `getScanStatus` are registered on the success path only; `getScanStatus` answers `null` when no scan exists and a second start is refused with a closed DefMiner code"
    requirement: FIND-04
    verification:
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#startScan inserts ONE running row and getScanStatus then reports it"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#getScanStatus answers `null` when no scan row exists — a real state, not an error"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#registers NOTHING outside the contract on the success path"
        status: pass
    human_judgment: false
  - id: D9
    description: "CONTRACT_VERSION and FRONTEND_CONTRACT_VERSION both move to 5 in the same commit"
    requirement: FIND-04
    verification:
      - kind: other
        ref: "grep -n '^export const CONTRACT_VERSION' packages/backend/src/api/spec.ts && grep -n '^export const FRONTEND_CONTRACT_VERSION' packages/frontend/src/api/client.ts"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/api/client.spec.ts (version handshake suite)"
        status: pass
    human_judgment: false
  - id: D10
    description: "The tab strip renders five tabs on first paint in the order Artifacts · Observations · Scan · Health · Settings, and the Scan arm mounts ScanPanel rather than falling through to the bare v-else"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#renders the five tabs in the declared order, Scan THIRD"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#mounts ScanPanel on the Scan arm, and NOT the bare v-else Health branch"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#keeps the Scan tab routable on a refusing build"
        status: pass
    human_judgment: false
  - id: D11
    description: "The Scan tab shows the start form when there is no scan and the counter strip plus the no-denominator note when there is, with nothing indeterminate anywhere"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#shows the START FORM when the project has no scan, never a strip of zeroes"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#shows the counter strip and the no-denominator note once a scan exists"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#renders NOTHING indeterminate — no progress bar, no spinner, anywhere"
        status: pass
    human_judgment: false
  - id: D12
    description: "An operator can open the Scan tab in a running Caido, press Start scan against real stored traffic, and watch the counters and the position date move"
    verification: []
    human_judgment: true
    rationale: "Every layer is unit- and integration-proven against the sqlite fixture and a literal SDK stub, but the end-to-end claim — that Caido's real `sdk.requests.query()` accepts this HTTPQL under `descending(\"req\",\"id\")` and returns items whose `getCreatedAt()` is the capture time — has never run against a live Caido. The fixture is single-connection and cannot reproduce pool affinity; the SDK stub is a shape, not a runtime. Plan 06-10's restart matrix and 06-11's push-down proof are where this becomes measured."

duration: 25 min
completed: 2026-08-31
status: complete
---

# Phase 6 Plan 01: Retroactive Scan Tracer Summary

**One operator action now walks one page of Caido's stored traffic end to end — RPC to SQLite to `sdk.requests.query()` under a composed HTTPQL filter, through the shipped admission gate into the shipped queue, with a re-derivable position and a progress readout that has no percentage and says why.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-31T17:47Z
- **Completed:** 2026-08-31T18:12Z
- **Tasks:** 2 of 2 (one blocking-human checkpoint, one tracer)
- **Files modified:** 19 (6 created, 13 modified)

## Accomplishments

- **Migration step v5 ships the `scans` table** — eighteen columns, `project_id` first in the PRIMARY KEY, a caller-minted `scan_id`, `idx_scans_state` and the partial UNIQUE `idx_scans_one_running`. `EXPECTED_TABLES` grows to six and `SCHEMA_VERSION` derives to 5 with no second edit. No shipped step was touched.
- **The whole vertical slice exists and is committed** — `composeScanFilter` → `sdk.requests.query()` → the shipped `admit()` → the shipped `BoundedQueue` → `advanceScan` → `getScanStatus` → the Scan tab. There is no second analysis path and no layer that needs to move for a later plan to expand it.
- **The position is re-derivable and the date is honest.** `last_request_id` is a plain integer boundary that survives a restart whatever O-04 turns out to be; `last_cursor` is nullable and opportunistic beside it. `last_created_at` comes from `item.request.getCreatedAt()`, never from the clock — the specific line that keeps the readout from saying "now scanning traffic from today" for an entire multi-hour walk.
- **The fifth tab renders at third position** with the start form, the four-cell fixed-height counter strip, the composed-filter echo and the no-denominator sentence — and no progress bar, spinner, pulse or animation anywhere on the surface.
- **The two-vocabulary collision is handled at the point of declaration.** `SCAN_LIFECYCLE_STATES` sits immediately beside `SCAN_STATES` with a header naming the shared `running` literal, the database column is `state` and never `scan_state`, and `completed` renders as **Finished** so no label is a prefix of a shipped one.
- **Both contract versions moved to 5 in one commit**, and the shipped bundle's import set is unchanged at one specifier.

## Task Commits

1. **Task 1: One-way decision — migration step v5 creates the `scans` table (D-09)** — no commit. A `checkpoint:decision` with `gate="blocking-human"`; surfaced to the operator and approved as specified (approve-as-specified, 2026-08-31) with both named costs accepted explicitly.
2. **Task 2: TRACER — start a scan, walk one page, see it move** — `f9ac911` (test, RED) then `f2f0fe2` (feat, GREEN).

**Plan metadata:** see the `docs(06-01)` commit that carries this file.

_The tracer task carried `tdd="true"`, so it is two commits: the failing contract first, the implementation second._

## Files Created/Modified

**Created**

- `packages/backend/src/scan/filter.ts` — `composeScanFilter` and `positionClause`. The ONE producer of a scan filter string; carries the clause-order and full-parenthesisation rules as a header prohibition until plan 06-04's static gate lands.
- `packages/backend/src/scan/scans.ts` — `startScan`, `advanceScan`, `getActiveScan`, `isRequestFinished`, `SCAN_LIST_DEFAULT_LIMIT`, `ScanRow`. Two import-time arity assertions in `retry.ts`'s shape.
- `packages/backend/src/scan/scans.spec.ts` — 29 cases over the filter, the table and the producer.
- `packages/backend/src/scan/producer.ts` — `runScanProducer` plus its injected-deps and structural SDK types.
- `packages/frontend/src/components/scan-contract.ts` — every string, both counter lists, the layout constants, a frozen 12-entry month table and the absent-not-zero renderer.
- `packages/frontend/src/components/ScanPanel.vue` — the start form and the progress readout, two states never on screen together.

**Modified**

- `packages/engine/src/contract.ts` — the lifecycle vocabulary, the suspension codes, `SCAN_KIND_CLAUSE` and `ScanStatusPayload`.
- `packages/engine/src/thresholds.ts` — `SCAN_PAGE_SIZE = 20` with its derivation from the SDK's missing projection control.
- `packages/backend/src/store/migrations.ts` — step v5 and its JSDoc block.
- `packages/backend/src/store/schema.spec.ts` — the deliberate two-place edit plus three new structural assertions.
- `packages/backend/src/api/spec.ts` — the two endpoints, their request/outcome types, `CONTRACT_VERSION = 5`.
- `packages/backend/src/index.ts` — registration on the success path, with the scan id minted at the call site.
- `packages/frontend/src/api/client.ts` — `FRONTEND_CONTRACT_VERSION = 5` and both guarded wrappers.
- `packages/frontend/src/App.vue` — the `TABS` entry, the `v-else-if` arm and the two loaders.
- Four spec files extended to cover the new surface (`contract.spec.ts`, `migrations.spec.ts`, `index.spec.ts`, `App.spec.ts`) and one stub widened (`client.spec.ts`).

## Decisions Made

1. **`SCAN_KIND_CLAUSE` lives in `@defminer/engine/contract`, not in `scan/filter.ts`.** The start form renders DefMiner's own clause read-only *before* any scan exists — that is what makes D-05's "you can narrow, you cannot widen" checkable rather than merely promised. There is no scan row to carry it across the RPC at that moment and the frontend cannot import the backend, so the one module both packages already import is the only place it can live. `filter.ts` remains the sole producer of a *composed* filter string, which is the property the threat register actually depends on.
2. **`ScanStatusPayload.analysed` is `number | null`.** There is no `analysed` column on `scans` — the number belongs to the consumer at the far end of the queue — so until plan 06-06 wires it, the honest value is absent. A `0` would render as "nothing has been analysed" on a scan that is analysing, which is 06-UI-SPEC.md's absent-not-zero rule broken on the one counter that shows the far end of the pipe.
3. **A non-empty operator clause is refused with a closed reason code, not silently dropped.** Plan 06-04 owns the validator. Accepting a clause and ignoring it would run a *wider* scan than the operator asked for while the surface told them it was narrowed — D-05's failure, arrived at from the opposite direction.
4. **The skip-done read is a scalar subquery, not a JOIN.** `sql-discipline.spec.ts` decomposes a statement into arms and asks each one separately about `project_id`; a JOIN whose scoping lived only in the outer WHERE would be a cross-project read one edit away.
5. **`getActiveScan` returns the running scan or the newest suspended one, in one statement.** `ORDER BY state ASC` puts `running` before `suspended` under SQLite's default collation. Two statements would be two round trips on a pooled connection to answer one question, and the answer would still have to choose.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] The `IF NOT EXISTS` migration gate did not accept `CREATE UNIQUE INDEX`**

- **Found during:** Task 2, Layer 3.
- **Issue:** `migrations.spec.ts`'s "EVERY statement in EVERY step is create-if-not-exists" gate matched `/^CREATE\s+(TABLE|INDEX|TRIGGER)\s+IF\s+NOT\s+EXISTS\b/i`. `CREATE UNIQUE INDEX IF NOT EXISTS` — the shape the approved one-scan-per-project invariant requires — does not match, so the approved DDL failed a gate whose actual rule it satisfies. The pattern was narrower than the invariant it enforces.
- **Fix:** Widened the pattern to `/^CREATE\s+(UNIQUE\s+)?(TABLE|INDEX|TRIGGER)\s+IF\s+NOT\s+EXISTS\b/i`, with a comment recording that the guard this rule is about is the `IF NOT EXISTS` and not the uniqueness. The step was *not* written around the gate.
- **Files modified:** `packages/backend/src/store/migrations.spec.ts`
- **Verification:** `pnpm vitest run packages/backend/src/store/migrations.spec.ts` — 27 passed, including the widened gate over the whole ladder.
- **Committed in:** `f2f0fe2`

**2. [Rule 2 — Missing critical] `SCAN_KIND_CLAUSE` was unreachable from the surface that must render it**

- **Found during:** Task 2, Layers 5 and 10.
- **Issue:** Layer 5 places the clause in `scan/filter.ts`. Layer 10 requires the start form to carry the "DefMiner always scans for" label, and 06-UI-SPEC.md § "The start form" makes the read-only clause binding because "showing the composition is the whole point" of D-05. But `getScanStatus` returns `null` when no scan exists, the frontend cannot import the backend, and the frontend must not compose HTTPQL itself (T-06-01). The label had no value to render, and a label with no value is the stub the tracer is forbidden to ship.
- **Fix:** The constant is declared in `packages/engine/src/contract.ts` — the module both packages already import, for exactly the reason `SCAN_STATES` moved there in plan 05-09 — and `filter.ts` imports it. `filter.ts` remains the only producer of a *composed* string, which is the invariant the threat register and plan 06-04's gate are about.
- **Files modified:** `packages/engine/src/contract.ts`, `packages/backend/src/scan/filter.ts`, `packages/frontend/src/App.vue`
- **Verification:** `pnpm knip` clean (no dead export, and the re-export from `filter.ts` was removed rather than left as one); `packages/engine/src/contract.spec.ts` asserts the clause's seven terms, its 2xx bound, the absence of `req.ext.eq` and of both HTTPQL comment grammars.
- **Committed in:** `f2f0fe2`

**3. [Rule 2 — Missing critical] `analysed` had no honest value on this build**

- **Found during:** Task 2, Layer 1.
- **Issue:** The payload field list gives `analysed` as a counter, but `scans` deliberately has no such column and the number is the consumer's. Reporting `0` would have violated 06-UI-SPEC.md D2's absent-not-zero rule on the counter whose whole job is to show the far end of the pipe.
- **Fix:** Typed `number | null`, reported `null`, rendered as an em dash. Plan 06-06 fills it with no shape change.
- **Files modified:** `packages/engine/src/contract.ts`, `packages/backend/src/index.ts`, `packages/frontend/src/components/scan-contract.ts`
- **Verification:** `contract.spec.ts` asserts absent and zero are distinguishable; `index.spec.ts` asserts the RPC reports `null`.
- **Committed in:** `f2f0fe2`

**4. [Rule 1 — Bug] A spec's term-counting assertion was wrong, not the code**

- **Found during:** Task 2, Layer 5 (first GREEN run).
- **Issue:** Two filter cases counted composed terms with `split(" AND ")`. `SCAN_KIND_CLAUSE` contains its own ` AND ` (the 2xx bound is joined to the kind alternation), so a flat split reported four terms for a two-term composition and both cases failed against correct code.
- **Fix:** Added a depth-counting `topLevelTerms` helper to the spec, with a comment recording why a flat split is the wrong question.
- **Files modified:** `packages/backend/src/scan/scans.spec.ts`
- **Verification:** `pnpm vitest run packages/backend/src/scan` — 29 passed.
- **Committed in:** `f2f0fe2`

**5. [Rule 3 — Blocking] Two literal SDK stubs stopped compiling when the contract grew**

- **Found during:** Task 2, Layer 9.
- **Issue:** `client.spec.ts` and `App.spec.ts` build `DefMinerBackendSdk` as literals rather than casts, by design — so adding `startScan` and `getScanStatus` to the surface broke `pnpm typecheck`. That is the literal-stub pattern working, not failing.
- **Fix:** Added both methods to each stub.
- **Files modified:** `packages/frontend/src/api/client.spec.ts`, `packages/frontend/src/App.spec.ts`
- **Verification:** `pnpm typecheck` exit 0.
- **Committed in:** `f2f0fe2`

---

**Total deviations:** 5 auto-fixed (1 × Rule 1, 2 × Rule 2, 2 × Rule 3).
**Impact on plan:** No scope creep. Deviation 2 is the only one that moved a symbol the plan named a home for, and it moved it to satisfy a binding UI-SPEC requirement the plan's own layer list could not otherwise meet; the invariant Layer 5 protects — one producer of a composed filter string — is intact. The other four are a gate too narrow for the DDL it governs, a wrong assertion, and two stubs behaving as designed.

## Known Stubs

Each is a thin layer with a named owner, not an architectural gap. All three are recorded in `.planning/WINDOWS.md`.

| Stub | File | Reason and owner |
|---|---|---|
| `analysed: null` | `packages/backend/src/index.ts` | No `analysed` column exists; the number is the consumer's. **Plan 06-06.** Rendering `0` would be the misleading alternative. |
| `heldAtWatermark: false` unconditionally | `packages/backend/src/index.ts` | `false` is the *true* answer for a build that walks one page per call and never holds. **Plan 06-03** ships the watermark that can make it true. The field is present now precisely because its later absence would collapse a healthy hold into the stall marker. |
| `runScanProducer` has no caller in the shipped build | `packages/backend/src/scan/producer.ts` | Start scan inserts the row; the walk is driven by **plan 06-03**'s watermark-gated loop. A loop today would be a bug, not a half-built feature: `BoundedQueue` drops the *oldest* entry at cap, and the oldest entries during a backfill are the operator's live browsing. |

## Threat Flags

None. Every file created or modified sits inside a trust boundary the plan's `<threat_model>` already names, and every `mitigate` disposition in that register has an implementation and a test:

| Threat | Where it landed |
|---|---|
| T-06-01 (tampering, filter composition) | `composeScanFilter` — every clause bracketed, operator's clause last, empty term omitted. Three spec cases. |
| T-06-02 (EoP, producer) | The shipped `admit()` called unchanged, including its `inScope` axis. One spec case drives `inScope: () => false`. |
| T-06-03 (disclosure, `scans` rows) | `project_id` in the PK and in every predicate; `sql-discipline.spec.ts` enumerates all three new modules and passes. |
| T-06-04 (disclosure, payload) | Every field an integer, a closed-vocabulary word or the operator's own clause; `describeError(...).slice(0, 200)` on every catch. |
| T-06-05 (DoS, queue) | Exactly one page per call and no loop, by construction. |
| T-06-06 (tampering, migration) | Every statement `IF NOT EXISTS`, the DDL a complete literal, no new interpolation. |
| T-06-07 (repudiation, version drift) | Both constants moved to 5 in one commit. |
| T-06-SC (supply chain) | No package installed; `pnpm-lock.yaml` untouched. |

## Issues Encountered

None beyond the five documented deviations. The RED run failed exactly as intended (module-not-found plus the four vocabulary assertions), and the GREEN run needed one correction to a spec assertion and one widening of a pre-existing gate.

## User Setup Required

None — no external service configuration required. No package was installed and no environment variable was added.

## Next Phase Readiness

**Ready.** Every later Phase 6 plan expands a layer this plan proved, and none needs to move one:

- **06-03** adds `SCAN_BACKPRESSURE_WATERMARK` beside `SCAN_PAGE_SIZE`, the yield-per-page loop around `runScanProducer`, and turns `heldAtWatermark` true. `ScanProducerDeps` takes the watermark as one more injected function.
- **06-04** adds `validateOperatorClause`, `OPERATOR_CLAUSE_MAX_CHARS` and the `httpql-discipline.spec.ts` static gate to `scan/filter.ts`, and replaces the `operator-clause-unsupported` refusal with the validated input. The header prohibition that gate mechanises is already written.
- **06-05** adds the lifecycle transitions (`suspendScan`, `resumeScan`, `completeScan`, `suspendRunningOnInit`) as further single statements with guards inside their predicates; all four target states are already in the CHECK constraint, so none needs a migration.
- **06-06** wires the retro counters and the `analysed` number; the field and its `null` are already on the contract.
- **06-12 / 06-13** add the scan history list and the toolbar indicator over `getActiveScan`'s shape and the lifecycle vocabulary.

**Carried obligations, restated so they are not lost:**

1. **O-01 is not settled and D-17 rests on it.** Owned by Phase 7's first plan: measure whether reconstructed source can live in SQLite within QuickJS's memory, by the SPIKE-06 method with external RSS sampling. A negative probe re-opens D-17 deliberately.
2. **O-04 is unmeasured and costs one assertion, not a plan.** Plan 06-10's restart leg already restarts the instance for D-22's fourth assertion; the cursor-stability check rides along. Either outcome is already accommodated.
3. **The end-to-end claim is not yet measured against a live Caido** — see coverage entry D12. The fixture is single-connection and the SDK stub is a shape. Plans 06-10 and 06-11 are where this becomes evidence.

**Concerns:** none blocking. The one thing a reviewer should look at first is the `SCAN_KIND_CLAUSE` placement (deviation 2), because it is the only symbol that does not live where the plan's layer list put it.

## Self-Check: PASSED

**Files claimed created — all present on disk:**

- FOUND: `packages/backend/src/scan/filter.ts`
- FOUND: `packages/backend/src/scan/scans.ts`
- FOUND: `packages/backend/src/scan/scans.spec.ts`
- FOUND: `packages/backend/src/scan/producer.ts`
- FOUND: `packages/frontend/src/components/scan-contract.ts`
- FOUND: `packages/frontend/src/components/ScanPanel.vue`

**Commits claimed — both in `git log`:**

- FOUND: `f9ac911` — `test(06-01): add the failing tracer contract for the retroactive scan`
- FOUND: `f2f0fe2` — `feat(06-01): walk one page of stored traffic end to end`

**Plan `<verification>` re-run at close-out:**

- `pnpm test` — 60 files, **2341 passed**, 0 failed
- `pnpm typecheck` — exit 0
- `pnpm lint` — exit 0
- `pnpm knip` — exit 0
- `pnpm check:bundle` — exit 0, `packages/backend/dist/index.js: 1 import specifier(s): crypto` — **unchanged**; the scan path adds no module specifier
- `pnpm check:css` — exit 0, 118 rules prefixed
- `pnpm check:externals` — exit 0, one bare specifier (`vue`)

**Plan task `<verify>` blocks, all three:**

1. `pnpm vitest run …migrations.spec.ts …schema.spec.ts …sql-discipline.spec.ts …src/scan …index.spec.ts …contract.spec.ts` — 6 files, **195 passed**
2. `pnpm exec caido-dev build packages && pnpm vitest run …App.spec.ts && pnpm typecheck` — build success, **44 passed**, typecheck clean
3. `pnpm lint && pnpm knip` — both exit 0

**Post-commit deletion check:** no tracked file was deleted by either commit. No untracked file left behind.

---
*Phase: 06-retroactive-scan-deployment-reality*
*Completed: 2026-08-31*
