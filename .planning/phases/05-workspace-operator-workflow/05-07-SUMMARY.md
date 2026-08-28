---
phase: 05-workspace-operator-workflow
plan: 07
subsystem: api
tags:
  [
    sqlite,
    keyset-pagination,
    row-value-cursor,
    bounded-candidate-window,
    literal-statement-matrix,
    rpc-contract,
    typescript,
    caido-sdk,
    invalidation-events,
  ]

# Dependency graph
requires:
  - phase: 05-workspace-operator-workflow
    provides: "05-02's widened 15-rule SQL discipline gate and the executed query-plan measurements (bounded candidate window, uniform-direction cursor, null-guard disqualification)"
  - phase: 05-workspace-operator-workflow
    provides: "05-04's engine contract — PageCursor / PageRequest / PageResponse with ONE direction field and at most one filter, VisibleTotal, INVALIDATION_EVENT / INVALIDATION_CATEGORIES / InvalidationSummary"
  - phase: 05-workspace-operator-workflow
    provides: "05-06's migration step v3 — the two direction-explicit keyset indexes the paginated ORDER BY clauses match"
  - phase: 01-skeleton-persistence-compatibility
    provides: "artifacts.ts / observations.ts row types and the two-complete-literals precedent; index.ts's eight-step init ordering contract; the fake SDK and SQLite fixtures"
provides:
  - "packages/backend/src/store/reads.ts — 52 complete SQL literals selected by an object lookup over a deeply frozen record; listArtifactsPage, listObservationsPage, countInventory"
  - "A row-value keyset cursor with uniform direction, correct across a tie block, with page cost independent of scroll depth"
  - "The bounded candidate window plus a companion window read that measures `scanned` and advances the cursor to the window EDGE — the piece that makes a fully-filtered window terminate instead of refetching forever"
  - "migrations.ts step v4 — idx_artifacts_size_keyset and idx_observations_status_keyset, so the SECOND sort key on each pageable table is a seek rather than a whole-partition top-N sort"
  - "packages/backend/src/api/spec.ts — the plugin package specification: manifest id, typed API map, one-entry events map, and CONTRACT_VERSION with its bump condition stated"
  - "Four new RPC endpoints (listArtifactsPage, listObservationsPage, countInventory, getContractVersion), registered on the success path only"
  - "The invalidation summary emit — one per category per drain pass, four scalars, no payload"
  - "PluginSdk — init()'s parameter typed against the contract, with sdk.api as APISDK<Spec['api'], Spec['events']>"
affects: [05-08, 05-09, 05-10, 05-11, 05-12]

# Actuals (#2632)
actuals:
  tokens: 32991
  tasks: 3
  commits: 4

tech-stack:
  added:
    - "@caido/sdk-shared@0.2.2 promoted from a transitive dependency to a direct devDependency of packages/backend (no new package enters the supply chain; the lockfile diff is one importer entry and the policy check passes)"
  patterns:
    - "The literal-statement matrix: sort/filter/direction/cursor SELECT BETWEEN complete literals via a deeply frozen record lookup, never INTO one"
    - "The bounded candidate window paired with a key-columns-only window read, so `scanned` is measured rather than inferred and the cursor advances to the window edge"
    - "Fail closed uniformly: an unrecognised sort key, an unrecognised filter column, an absent project and an absent handle all read nothing, because there is no statement for the request"
    - "The server discards the caller's projectId and substitutes the lifecycle-resolved one — the frontend is not the authority on which project is active"
    - "An event key derived as a mapped type over a constant's literal type, so a rename in the contract is a typecheck failure rather than a silent emitter/subscriber mismatch"
    - "Type the slice of the SDK where a precise type buys something (the RPC), leave the rest structural, matching MetaSdk / LifecycleSdk / PassiveSdk"

key-files:
  created:
    - packages/backend/src/store/reads.ts
    - packages/backend/src/store/reads.spec.ts
    - packages/backend/src/api/spec.ts
    - .planning/phases/05-workspace-operator-workflow/deferred-items.md
  modified:
    - packages/backend/src/index.ts
    - packages/backend/src/index.spec.ts
    - packages/backend/src/ingest/consumer.ts
    - packages/backend/src/store/migrations.ts
    - packages/backend/src/store/migrations.spec.ts
    - packages/backend/test/fixtures/fake-sdk.ts
    - packages/backend/tsconfig.json
    - packages/backend/package.json
    - knip.json

key-decisions:
  - "P5-D36: every FILTERED statement carries an OUTER ORDER BY over the bounded candidate window, which the measured research shape did not. SQLite does not guarantee a subquery's row order without one; the co-routine happens to preserve it today because a LIMIT subquery under an outer WHERE cannot be flattened, but that is a property of the current planner's flattening rules, not of the statement. The price is a sorter over AT MOST CANDIDATE_WINDOW_ROWS (500) rows, which keeps the cost bounded and independent of partition size; the alternative price was a page whose order was correct by accident and whose cursor would corrupt silently when it stopped being."
  - "P5-D37: a filtered read runs TWO statements — the page and a key-columns-only read over the SAME window. Without the second, `scanned` could only be inferred and the cursor could only advance to the last SURVIVING row, so a filter matching nothing would return an empty page whose cursor had not moved and the caller would refetch the same window forever. The bounded window fixes the cost problem and introduces that termination problem; the window read is what closes it. Cursor advance is therefore two cases and no more: a FULL page advances to the last returned row (the outer limit cut it, survivors may remain in this window), a SHORT page advances to the window EDGE (the window was consumed)."
  - "P5-D38: migration step v4 indexes the SECOND sort key on each pageable table (idx_artifacts_size_keyset, idx_observations_status_keyset). Step v3 indexed one sort key per table and reads.ts offers two, so `ORDER BY byte_len DESC, sha256 DESC` had no index behind it: SQLite restricts to the project partition and top-N sorts the whole of it, once per page, reached by clicking a column header. Directions are uniform DESC,DESC and SQLite traverses an index in reverse for the opposite ORDER BY, which is why there are two indexes and not four. Deliberately NOT added: a filter-leading index — the settled design bounds the scanned window instead, and an index cannot buy selectivity independence, only make the good case faster."
  - "P5-D39: an unrecognised sort key, an unrecognised filter column, an empty projectId and an absent database handle are all answered with an EMPTY EXHAUSTED PAGE, one rule, no guessing. Falling back to a default sort answers a question nobody asked; ignoring an unrecognised filter returns MORE rows than the caller narrowed to, which is the opposite of what a filter is for; and throwing hands the frontend a promise that never settles on a runtime that surfaces neither throws nor rejections."
  - "P5-D40: countInventory's counts are EXACT and therefore O(partition) for a filtered count — the one unbounded read in reads.ts. A capped count ('2000+') would make the UI-SPEC's `{total} secrets exist on this target` copy a claim the number does not support. It is called once per filter change, never once per page; if it ever becomes the thing that stalls the thread the fix is a leading index on the filter column, not a silently truncated total."
  - "P5-D41: init()'s parameter is typed as PluginSdk — `sdk.api` precisely as APISDK<Spec['api'], Spec['events']>, the rest of the surface structural — rather than as SDK<Api, Events> wholesale. Phase 0 measured how badly the shipped type packages under-declare this runtime and Phase 1 recorded `sdk: any` at the wide boundary as the honest annotation; every module already takes the slice it uses (MetaSdk, LifecycleSdk, PassiveSdk). This follows that shape instead of breaking it, while still making a typo'd endpoint name or a drifted callback signature a typecheck failure."
  - "P5-D42: `Spec` and `CountRequest` are NOT exported from api/spec.ts. Nothing outside the module can consume them — the frontend is a separate package with its own resolution path, and the registration site infers the request shape from the API map — and knip runs `ignoreExportsUsedInFile: false`, so an export with no cross-module consumer is a gate failure rather than a harmless seam."
  - "P5-D43: the page and count endpoints DISCARD the caller's `projectId` and substitute `currentProjectId()`. PageRequest carries the field because the store layer needs one in every predicate, not because the frontend is the authority on which project is active; a read that trusted it would let anything holding the RPC handle page another project's rows out of the one shared SQLite file (T-05-34, T-01-20)."
  - "P5-D44: invalidation summaries are accumulated per CATEGORY per DRAIN PASS and flushed in the drain loop's `finally`. Per row would hand the frontend the exact storm the coalescer exists to absorb; after the loop would never run at all, because every exit from the drain is a `return` — including the `stopped` exit, which is precisely when no later pass will come. A project change mid-pass DISCARDS what was accumulated under the previous project rather than re-attributing it (the same rule the queue drain follows), because a summary mixing two projects invalidates the wrong table for the wrong operator."
  - "P5-D45: `{total}` — settling CONTEXT.md's outstanding debt — is the number of rows the operator CAN CURRENTLY REACH for the active filter. Suppressed rows are outside it. For `artifacts` and `observations` there is no suppression mechanism at all, so the reachable count IS the whole count, `hiddenBySuppression` and `suppressionRuleCount` are both 0, and the hidden-by-suppression second line does not render. That is a real state of a real table, not a placeholder for a missing feature; the entity tables that do have suppression are the deferred pass's, where the second line becomes real."

patterns-established:
  - "Select BETWEEN complete literals, never INTO one — and prove the selection mechanism is visible to the gate rather than exempt from it"
  - "A bound whose value is stated with the measurement that produced it AND with the property that measurement was for (cost independence), so a later reader can tell which part is load-bearing if the number moves"
  - "Separate a correctness claim from a performance claim when the performance claim rests on a query plan measured on a runtime the product does not ship"
  - "A negative security property (four keys and nothing else) is asserted against the object that actually crossed the boundary, not against the code that built it"
  - "When a fix introduces a new failure mode (bounded window -> non-advancing cursor), ship the closing mechanism in the same change and name it in the same comment"

requirements-completed: []

coverage:
  - id: D1
    description: "A page of rows is fetched by a cursor built from the last row's sort key and tie-break value, never by an offset, so page cost does not grow with how deep the operator has scrolled"
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#begins the next page immediately after the last returned row"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#pages the whole partition with nothing repeated and nothing skipped"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#costs a bounded number of scanned rows however deep the page is"
        status: pass
      - kind: other
        ref: "node -e (strip comment lines, assert no /\\bOFFSET\\b/i in packages/backend/src/store/reads.ts) — exits 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "Sorting and filtering are chosen between complete literal statements; no statement is assembled from fragments and no identifier is ever interpolated into SQL"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/sql-discipline.spec.ts (all 15 rules, walking packages/backend/src at any depth, with reads.ts in the tree) — 39 tests"
        status: pass
      - kind: other
        ref: "node -e (count ORDER BY occurrences in reads.ts >= 8) — reports 64"
        status: pass
    human_judgment: false
  - id: D3
    description: "The statement matrix is linear in the number of filterable columns, not exponential in their combinations"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#serves exactly the declared filter column on each table, and no other"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#an unrecognised filter column is not ignored — ignoring it would widen the result"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every filtered read scans a bounded candidate window, so a filter matching nothing costs the same as a filter matching everything"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#reports the SAME scanned count over a partition ten times larger"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#a filter that matches nothing returns an empty page and scans no more than the window bound"
        status: pass
    human_judgment: false
  - id: D5
    description: "A page response reports how many rows were scanned and whether the cursor is exhausted, so the caller can distinguish end-of-data from a window that was entirely filtered out"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#reports exhausted true with no cursor when the partition genuinely ran out"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#reports exhausted false WITH a cursor when the window ran out but the data did not"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#advances the cursor to the window edge so a fully-filtered window is not refetched forever"
        status: pass
    human_judgment: false
  - id: D6
    description: "A cursor that lands inside a block of rows sharing a sort-key value returns the remainder of that block and then continues, with no row returned twice and none skipped"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#three consecutive pages are pairwise disjoint and their union is the expected ordered slice"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#returns the remainder of a block a cursor landed inside before advancing"
        status: pass
    human_judgment: false
  - id: D7
    description: "A read for one project never returns another project's rows, and the caller does not get to name the project"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#never returns another project's rows"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#ignores a caller-supplied project id and uses the resolved one"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sql-discipline.spec.ts (unscoped-multi-row, unscoped-subquery, unscoped-union-arm, cte-unscoped)"
        status: pass
    human_judgment: false
  - id: D8
    description: "The count read returns the number of rows the operator can currently reach for the given filter, with the hidden-by-suppression line rendering nothing on these two tables"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#counts the rows the operator can currently reach, for this project only"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#reports no hidden-by-suppression line, because these tables have no suppression"
        status: pass
    human_judgment: false
  - id: D9
    description: "The RPC surface is a typed contract with an explicit version endpoint, using the plugin package specification helper and neither of the two deprecated definition helpers"
    verification:
      - kind: other
        ref: "pnpm typecheck (tsc --build across all four packages, with api/spec.ts imported by index.ts)"
        status: pass
      - kind: other
        ref: "node -e (assert no DefineAPI/DefineEvents identifier in packages/backend/src/api/spec.ts) — exits 0"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#returns the contract version constant"
        status: pass
    human_judgment: false
  - id: D10
    description: "Every RPC name is registered on exactly one code path, and initialising twice against the same stub does not let a throw escape"
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#registers every contract endpoint on the success path, and each exactly once"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#registers the surface TWICE without a throw escaping init()"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#does not add any page endpoint to a refusal path"
        status: pass
    human_judgment: false
  - id: D11
    description: "Backend-to-frontend events carry an invalidation summary only — project, category, changed count, newest identifier — and never a findings payload and never a response body"
    requirement: "UI-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#carries EXACTLY the four contract fields and nothing else"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#emits exactly one summary per category for a batch of writes"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#emits nothing at all when nothing was written"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts (455 tests, no outbound call introduced)"
        status: pass
    human_judgment: false
  - id: D12
    description: "The second sort key on each pageable table is served by a direction-explicit composite index rather than a whole-partition top-N sort"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#step v4 indexes the SECOND sort key on each pageable table"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/migrations.spec.ts#the ladder head is step v4 — the version bump IS the appended entry"
        status: pass
    human_judgment: true
    rationale: "The index EXISTS and the ladder applies it — that much is asserted structurally. That SQLite actually SEEKS through it rather than sorting is a query-plan claim, and no plan in this plugin has been measured on Caido's shipped SQLite 3.46.0. The residual is disclosed, not closed."
  - id: D13
    description: "The paginated statements plan as index seeks with no temporary sort structure, and the bounded window plans as a co-routine"
    verification:
      - kind: integration
        ref: "tests/sqlite-346-query-plans.spec.ts (pre-existing, measured on SQLite 3.51.0/3.53.4)"
        status: pass
    human_judgment: true
    rationale: "Every performance number behind this plan — the 2,000,025-step null-guard, the 258x bounded-window reduction, the sorter a mixed-direction index costs — was measured on SQLite 3.51.0 and 3.53.4, NOT on Caido's shipped 3.46.0, because no 3.46 binary is reachable from this machine. The operator chose at the Wave 1 boundary to proceed with the residual DISCLOSED. Nothing here is verified on the shipped runtime; it is narrowed to a 3.46 -> 3.51 window. A human must decide whether that remains acceptable before shipping, and the correctness properties above (which do not depend on a query plan) are deliberately listed separately so the two are not confused."

# Metrics
duration: 20 min
completed: 2026-08-28
status: complete
---

# Phase 05 Plan 07: Paginated Reads and the Typed RPC Surface Summary

**A 52-literal fixed statement matrix with a uniform-direction row-value keyset cursor and a bounded candidate window, exposed as a typed, versioned RPC that emits four-scalar invalidation summaries.**

## Performance

- **Duration:** 20 min (first task commit 17:30:52+02:00, last 17:51:12+02:00; SUMMARY written on resume after an interruption — see Issues Encountered)
- **Started:** 2026-08-28T15:27:00Z
- **Completed:** 2026-08-28T15:58:00Z
- **Tasks:** 3
- **Files modified:** 14 (4 created, 10 modified)

## Accomplishments

- **The literal-statement matrix exists and the gate can see it.** 52 complete SQL literals in `reads.ts` — 2 tables x 2 sort keys x 2 directions x first/next x page/filtered/window, plus 4 counts — selected by an object lookup over a deeply frozen record. 64 `ORDER BY` clauses, zero fragments, zero interpolated identifiers, zero offsets. `sql-discipline.spec.ts`'s widened 15-rule gate audits the whole tree with `reads.ts` in it and reports nothing.
- **The tie block is asserted, not argued.** Three consecutive pages over a fixture with deliberate ties, with a non-vacuity assertion that at least one page boundary actually lands inside a block, pairwise-empty intersections, and a union equal to the expected ordered slice. Plus a direct case that a cursor built from a row in the MIDDLE of a block returns the rest of that block first — the exact failure a naive `sort_key < ?` cursor produces silently.
- **Selectivity independence is an equality, not a ratio.** A filter matching nothing over a 1,000-row partition and over a 10,000-row partition reports the SAME `scanned` count. That is the bounded candidate window's real claim; the measured 258x reduction is just how it shows up on a clock.
- **The termination bug the bounded window would have introduced is closed in the same change.** A window read measures `scanned` and yields the window's edge, so a fully-filtered window advances the cursor instead of standing still. Asserted as termination: a 1,000-row partition with no matches converges in exactly three calls totalling exactly 1,000 scanned rows.
- **The RPC surface is typed, versioned, and registered exactly once per name.** `api/spec.ts` declares the manifest id, an eight-endpoint API map (the four existing names unchanged and typed for the first time, plus the two page reads, the count, and `getContractVersion`), and a one-entry events map whose key is a mapped type over the engine contract's `INVALIDATION_EVENT` rather than the string written out again.
- **The event carries four scalars and the spec asserts the key set of the object that actually crossed the boundary** — not the code that built it. A payload that quietly grew a `rows` field fails here rather than at a listener that has not sanitised it.
- **`{total}` is settled.** It counts rows the operator can currently reach; suppressed rows are outside it; on `artifacts` and `observations` there is no suppression, so the reachable count is the whole count and the second line does not render.

## Task Commits

1. **Task 1: reads.ts — the literal-statement matrix, the row-value cursor, the bounded window** — `2252e71` (feat)
2. **Task 2: api/spec.ts — a typed, versioned RPC contract** — `b8ef40a` (feat)
3. **Task 3: index.ts — register the page reads, emit invalidation summaries, keep the ordering contract** — `97e3460` (feat)

**Plan metadata:** see the `docs(05-07)` commit that carries this file.

## Files Created/Modified

- `packages/backend/src/store/reads.ts` (new, 1,148 lines) — the statement matrix, the frozen lookup, `listArtifactsPage`, `listObservationsPage`, `countInventory`, `KEYSET_PAGE_ROWS`, `CANDIDATE_WINDOW_ROWS`, and the four closed vocabularies
- `packages/backend/src/store/reads.spec.ts` (new, 831 lines, 33 tests) — order, cursor advance, both directions, the tie block, the bounded window, the short page, fail-closed, the counts, and a non-vacuity block driving every declared vocabulary member
- `packages/backend/src/api/spec.ts` (new, 232 lines) — the plugin package specification, `CONTRACT_VERSION`, `StatusPayload`, `CompatPayload`, `PluginSdk`
- `packages/backend/src/index.ts` — step 6b added to the header's ordering contract; four success-path registrations; `emptyPage`, `NO_ROWS_VISIBLE`, `scopedTo`; `status()` and `compatReport()` typed against the contract; `init(sdk: PluginSdk)`
- `packages/backend/src/index.spec.ts` (+12 tests) — the RPC surface and the invalidation event, driven through the real `init()` against a real fixture database
- `packages/backend/src/ingest/consumer.ts` — per-drain-pass invalidation aggregation, the flush in the drain's `finally`, the narrowed `api.send` slice on the sdk parameter, and `drainConsumerForTest`
- `packages/backend/src/store/migrations.ts` — ladder step v4 (the two secondary-sort keyset indexes)
- `packages/backend/src/store/migrations.spec.ts` — head assertion moved to v4, one new structural case for step v4, one literal-3 assertion replaced by `SCHEMA_VERSION`
- `packages/backend/test/fixtures/fake-sdk.ts` — `api.send` with per-call argument recording, `meta.db()` typed as the SDK types it
- `packages/backend/tsconfig.json` — `@caido/sdk-backend` added to `types` (ambient `caido:plugin` declarations; types only, nothing emitted)
- `packages/backend/package.json`, `pnpm-lock.yaml` — `@caido/sdk-shared@0.2.2` promoted from transitive to direct devDependency
- `knip.json` — `@caido/sdk-backend` removed from `ignoreDependencies` (it now has a real consumer), `caido` added alongside `sqlite` as runtime-provided
- `.planning/phases/05-workspace-operator-workflow/deferred-items.md` (new) — one out-of-scope item

## Decisions Made

Ten decisions, `P5-D36` through `P5-D45`, recorded in full in the frontmatter. The four that a later reader is most likely to need:

- **P5-D36** — filtered statements carry an outer `ORDER BY` the measured research shape did not, buying a guaranteed order for a sorter bounded at 500 rows.
- **P5-D37** — a filtered read is two statements, because the bounded window fixes a cost problem and creates a cursor-termination problem, and the window read is what closes it.
- **P5-D38** — migration step v4, because a sort key without an index is a column header click that top-N sorts the whole partition on the single thread.
- **P5-D45** — `{total}` counts reachable rows, suppressed rows are outside it, and on these two tables the hidden-by-suppression line renders nothing because there is nothing to hide.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Indexed the second sort key on each pageable table (migration step v4)**

- **Found during:** Task 1
- **Issue:** The plan names two sort keys per table — `last_seen` and `byte_len` on `artifacts`, `observed_at` and `status` on `observations` — but 05-06's step v3 shipped only ONE keyset index per table. `ORDER BY byte_len DESC, sha256 DESC` therefore had nothing behind it: SQLite restricts to the project partition and top-N sorts the whole of it, once per page. On a 200,000-row partition that is a scan of the same order as the `LIMIT ... OFFSET` form `05-UI-SPEC.md` bans outright, reached by clicking a column header, on the single QuickJS thread, inside one synchronous driver call with no yield point. Shipping the sort key without the index would have been shipping that click. "Missing DB indexes on frequently queried columns" is Rule 2 by name.
- **Fix:** Appended ladder step v4 with `idx_artifacts_size_keyset (project_id, byte_len DESC, sha256 DESC)` and `idx_observations_status_keyset (project_id, status DESC, request_id DESC)`. Additive, forward-only, `IF NOT EXISTS`, no table added, `EXPECTED_TABLES` and `COLUMN_ALLOWLIST` untouched. A filter-leading index was deliberately NOT added — the settled design bounds the scanned window instead.
- **Files modified:** `packages/backend/src/store/migrations.ts`, `packages/backend/src/store/migrations.spec.ts`
- **Verification:** New structural case reads the index names back out of `sqlite_master` and asserts step v3's pair survived; the ladder-head case moved from `toBe(3)` to `toBe(4)` and now asserts both steps are present; one incidental `report.version).toBe(3)` in the "step v3 brings audit" case became `SCHEMA_VERSION`, since that case is about `audit` arriving, not about the head. 12 tests pass.
- **Committed in:** `2252e71`

**2. [Rule 3 - Blocking] The fake SDK had no `api.send`, and typed `meta.db()` as `Promise<unknown>`**

- **Found during:** Tasks 2 and 3
- **Issue:** Typing `init()`'s parameter against the contract made `FakeSdk` non-assignable on two counts, and there was no way at all to assert what the invalidation emit actually handed over.
- **Fix:** Added `api.send` to the fake with per-call `{ event, args }` recording — the invalidation payload's security property is negative, and a negative property can only be asserted against the object that crossed the boundary. Typed `meta.db()` as the SDK types it, with the one unavoidable cast in a single documented place in the fixture rather than at every `init(sdk)` call site across four spec files.
- **Files modified:** `packages/backend/test/fixtures/fake-sdk.ts`
- **Verification:** `pnpm typecheck` clean; the four pre-existing `init(sdk)` call sites in `lifecycle.spec.ts` and `telemetry.spec.ts` compile unchanged.
- **Committed in:** `b8ef40a`

**3. [Rule 3 - Blocking] `@caido/sdk-shared` was not resolvable from `packages/backend`**

- **Found during:** Task 2
- **Issue:** The plugin package specification helper is a top-level export of `@caido/sdk-shared`, which was present only as a transitive dependency of `@caido/sdk-backend` and therefore outside `packages/backend`'s resolution path.
- **Fix:** Promoted it to a direct devDependency at the same pinned version. **No new package enters the supply chain** — the lockfile diff is exactly one importer entry for a version already in the tree, and `pnpm install`'s supply-chain policy check passed (793 entries verified). Also added `@caido/sdk-backend` to the backend tsconfig's `types` so the ambient `caido:plugin` module (where `APISDK` lives) is in the program; types only, nothing emitted, and `pnpm check:bundle` confirms the shipped bundle's import set is still exactly `crypto`.
- **Files modified:** `packages/backend/package.json`, `pnpm-lock.yaml`, `packages/backend/tsconfig.json`, `knip.json`
- **Verification:** `pnpm typecheck`, `pnpm lint`, `pnpm knip` and `pnpm check:bundle` all exit 0.
- **Committed in:** `b8ef40a`

### Adjustments made without a rule

**4. A comment was reworded to avoid tripping its own acceptance gate.** Task 2's acceptance criterion greps `api/spec.ts` for the two deprecated helper identifiers and does not filter comment lines, so the header's original "use X, not `DefineAPI` / `DefineEvents`" tripped it. The comment now describes them without writing the identifiers, and says so, with the reason: a gate that a comment can trip is a gate that gets weakened rather than obeyed. Task 1's equivalent `OFFSET` gate filters comments and needed no such handling.

**5. One `reads.spec.ts` assertion was corrected during authoring, not the code.** The first draft of the window-edge case asserted the SECOND window reports `exhausted: true` over a 1,000-row partition. It does not, and should not: a window that exactly fills its bound is indistinguishable from one with more behind it, so exhaustion is correctly reported on the third (empty) call. The case was rewritten to assert the property it was actually for — TERMINATION — which is stronger: the loop converges in exactly three calls totalling exactly 1,000 scanned rows.

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 blocking), plus 2 authoring adjustments.
**Impact on plan:** No scope creep. The one structural addition (migration step v4) is additive, forward-only, and closes a performance hole the plan's own sort-key list would otherwise have opened. The three shipped list statements in `artifacts.ts` and `observations.ts` are byte-for-byte untouched, as the plan required and as `git diff` confirms.

## Issues Encountered

- **This plan's close-out was interrupted by an API transport error.** The failure landed immediately after the plan-level verification began, with all three task commits already made and the working tree clean. Nothing was lost and nothing was left half-written: `reads.ts`, `reads.spec.ts` and `api/spec.ts` were on disk and committed, and the full suite was green. On resume, every plan-level gate was re-run rather than assumed, and this SUMMARY was written from measured results. It is recorded here because a summary that silently appeared twenty minutes after the last commit is a gap in the record, and the reason for the gap is more useful than the appearance of continuity.

## Known Stubs

None. Every exported symbol has a real implementation and a behavioural test; no placeholder text, no hardcoded empty return that reaches a UI, no `TODO` or `FIXME` introduced.

## Deferred Issues

One item, recorded in `.planning/phases/05-workspace-operator-workflow/deferred-items.md`:

- **D-05-07-01** — eight `@internal` JSDoc tags became redundant when this plan gave those types cross-module consumers. `pnpm knip` reports them as hints and still exits 0. Two of the eight live in `artifacts.ts` / `observations.ts`, which this plan's acceptance criterion requires to have an empty diff, so the set is deferred whole rather than split across two commits.

## Threat Flags

None. The threat register's six entries (T-05-32 … T-05-37) are all addressed by the tasks that own them, and no file created or modified here introduces network surface, an auth path, a new file-access pattern, or a schema change at a trust boundary that the plan did not already model. Migration step v4 adds two indexes and no columns, no tables, and no new data at rest.

## Standing Residual — carried forward, disclosed rather than closed

**Every query plan behind this plan was measured on SQLite 3.51.0 and 3.53.4, not on Caido's shipped 3.46.0.** No 3.46 binary is reachable from this machine, and the operator chose at the Wave 1 boundary to proceed with the residual disclosed. That governs how the numbers in this file may be used:

- The **2,000,025-VM-step null-guard**, the **258x bounded-window reduction**, the **500-versus-200,000 scanned-row contrast**, and the claim that a **mixed-direction index costs a sorter** are all results narrowed to a 3.46 -> 3.51 window. None is verified on the shipped runtime.
- The **correctness** properties — the tie block, the cursor advance, the project scoping, the fail-closed reads, the event's key set — do NOT depend on a query plan. They are asserted directly against a real SQLite in `reads.spec.ts` and `index.spec.ts` and stand on their own.

The two categories are kept apart deliberately, as plan 05-06 did, so a later reader cannot borrow the confidence of the first for the second.

## Requirements

`requirements-completed: []` — **deliberately empty.**

This plan declares `UI-02` and `UI-07`. Both are also declared by sibling plans that have not run yet:

- **UI-02** — declared by `05-02` (complete), this plan, `05-08` and `05-09`
- **UI-07** — declared by this plan and `05-08`

`requirements.ready-ids` blocks an ID until every plan declaring it has produced a SUMMARY, which is correct: the backend half of keyset pagination and of event coalescing shipped here, but the frontend half — the table that consumes the pages and the coalescer that absorbs the summaries — is `05-08`'s and `05-09`'s. Marking either requirement complete now would report a half-built capability as done and give phase verification nothing to catch. They will mark themselves when the last declaring plan finishes.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready for `05-08`.** It has everything it needs and nothing it has to guess:

- `listArtifactsPage` / `listObservationsPage` / `countInventory` / `getContractVersion` are registered and typed. The page contract is `PageResponse<TRow>`: **a short page is not always the end of the data** — check `exhausted` before rendering an empty state, and refetch while `exhausted` is false and a `nextCursor` is present.
- The invalidation event is emitted under `INVALIDATION_EVENT`, one summary per category per drain pass, four scalars. **The reaction-rate cap is the frontend's** — the backend holds no timer, by design, because a timer here runs on the thread that serves the proxy. The trailing debounce, the two-reactions-per-second ceiling and the never-while-a-row-is-selected rule are `05-08`'s to implement and assert.
- `CONTRACT_VERSION` is `1`. The frontend check that compares against it is `05-08`'s half of the seam.
- The frontend does NOT need to send a correct `projectId` — the backend discards it and substitutes the resolved one. It must still send a valid `sortKey` and, if filtering, the one declared filter column for that table: `kind` for artifacts, `content_type` for observations. Anything else reads nothing, silently and by design.

**One concern to carry forward:** the query-plan residual above. Nothing blocks on it, but a plan that wants to trust a performance number from this file on the shipped runtime must re-measure it on 3.46 first.

---

_Phase: 05-workspace-operator-workflow_
_Completed: 2026-08-28_

## Self-Check: PASSED

- `packages/backend/src/store/reads.ts` — present on disk
- `packages/backend/src/store/reads.spec.ts` — present on disk
- `packages/backend/src/api/spec.ts` — present on disk
- `.planning/phases/05-workspace-operator-workflow/deferred-items.md` — present on disk
- `2252e71`, `b8ef40a`, `97e3460` — all three reachable in `git log --all`
- Plan-level verification re-run on resume: `pnpm test` 46 files / 1,783 tests pass, `pnpm typecheck` exit 0, `pnpm lint` exit 0, `pnpm knip` exit 0, `pnpm check:bundle` exit 0 (one import specifier, `crypto`, unchanged)
- `git diff` on `packages/backend/src/store/artifacts.ts` and `observations.ts` across all three commits: empty
