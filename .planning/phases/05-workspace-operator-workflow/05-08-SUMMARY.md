---
phase: 05-workspace-operator-workflow
plan: 08
subsystem: ui
tags: [vue, pinia-free-stores, vueuse, keyset-pagination, coalescing, rpc-client, caido]

requires:
  - phase: 05-04
    provides: PageCursor / PageRequest / PageResponse, INVALIDATION_EVENT / INVALIDATION_CATEGORIES / InvalidationSummary, VisibleTotal — the SDK-free contract both packages import
  - phase: 05-07
    provides: the typed RPC surface (listArtifactsPage, listObservationsPage, countInventory, getContractVersion) and the invalidation emitter this client subscribes to
  - phase: 05-01
    provides: the frontend workspace, its SDK injection key, and the ArtifactRow the frontend already declares
  - phase: 05-05
    provides: the static R1/R2 gate every new module here is audited by, and the single display path rows eventually render through
provides:
  - A typed frontend client over the RPC whose every failure crosses back as a value, never a rejection
  - A contract-version check that is a hard state — a mismatch suppresses reads rather than warning beside them
  - A bounded 2,000-row cursor window that assembles full pages from short ones and never orders rows
  - Two-ended eviction with per-page request and response cursors, so a scroll back refetches rather than serving stale rows
  - An event coalescer holding a 500 ms trailing window and 2 reactions/second, with zero reactions while the operator is mid-triage
  - The TriageGate seam — the three facts the coalescer reads off the inventory store, and nothing more
affects: [05-09 findings table, 05-10 evidence panel, 05-11 export dialog, 05-12 health and settings tabs]

actuals:
  tokens: 21939
  tasks: 3
  commits: 6

tech-stack:
  added: ["@vueuse/core (first import — useDebounceFn + useThrottleFn)"]
  patterns:
    - "Stores are factory composables over explicit dependencies, not pinia singletons"
    - "Every RPC failure is a value with a DefMiner-authored reason code; the rejection is discarded without inspection"
    - "A generation counter drops any response that lands after its question was withdrawn"
    - "A mechanism is proved load-bearing by mutation — remove it, watch the named test go red, restore"

key-files:
  created:
    - packages/frontend/src/api/client.ts
    - packages/frontend/src/api/client.spec.ts
    - packages/frontend/src/stores/inventory.ts
    - packages/frontend/src/stores/inventory.spec.ts
    - packages/frontend/src/stores/coalescer.ts
    - packages/frontend/src/stores/coalescer.spec.ts
  modified:
    - knip.json

key-decisions:
  - "P5-D50: every client method answers with an RpcResult and NEVER rejects. Caido surfaces neither a throw nor a rejection from plugin code (ERR-03, measured in Phase 0), so a method that rejects is a method whose failure nobody sees — including the caller, which carries on rendering a skeleton row. Making the failure a value the caller must read is the only shape that cannot be ignored silently on this runtime."
  - "P5-D51: FRONTEND_CONTRACT_VERSION is a deliberate SECOND copy of the backend's CONTRACT_VERSION, not an import. The two packages cannot import each other, and if they could the check would be vacuous: a number the frontend read out of the backend at build time cannot disagree at run time. The mechanism depends on these being two independently shipped integers. A detected mismatch is a HARD state that suppresses page and count calls; a warning beside a rendered table is worse than no check, because the wrong rows are on screen and they look right."
  - "P5-D52: only FIVE of the backend's eight endpoints are wrapped — the two page reads, the count, the version and the subscription. getStatus, getCompat, getArtifacts and getObservations are not, because wrapping one means restating its payload type in this package (StatusPayload alone is eleven fields over SlimStatus) and a restated type with no consumer is a second copy that drifts before anybody reads it. The Health tab (05-12) is the first real consumer and wraps them against a shape it actually renders."
  - "P5-D53: resident pages are held in shallow refs. Deep reactivity would proxy every field of every one of two thousand rows on the page whose entire budget argument is that the renderer's memory is bounded the way the backend's queue is. Rows are replaced wholesale and never mutated in place, so shallow is both correct and the cheap option."
  - "P5-D54: the stores are FACTORY COMPOSABLES, not pinia defineStore singletons. pinia is installed and stays installed, but a store whose lifetime is a module-level singleton is a store that survives an unmount — which is precisely the shape research P-04's listener leak takes. A factory makes the lifetime explicit at the call site, makes stop() something an owner holds rather than something a global has, and makes every spec isolated for free."
  - "P5-D55: the inventory store is GENERIC over the row and takes readPage / countRows as parameters rather than taking the client and a table name. The two tables return different row shapes with no shared discriminant, so a store holding a union would hand every component a narrowing problem the backend already answered. Binding the endpoint at the call site keeps the store's own specs free of table-specific knowledge."
  - "P5-D56: refresh() requeries from the FIRST page and discards the window, and it is what both an automatic reaction and the operator's Refresh do. A refresh that tried to re-fetch the resident range in place would have to reconcile a cursor range against rows that have shifted underneath it — which is the same class of problem the whole cursor design exists to avoid."
  - "P5-D57: MAX_PAGE_ASSEMBLY_REQUESTS is 8, and reaching it is a DISTINCT reported state (assemblyTruncated), never rounded into complete. A filter that suppresses almost every candidate would otherwise spin the short-page loop against a single-threaded backend for as long as the tab is open; reporting the bound as an ending would render the empty state over a list that is not empty."
  - "P5-D58: each resident page keeps BOTH its request cursor and its response cursor, and eviction happens at both ends. Keeping only one cursor is how a window that can be evicted from either end loses the ability to refill the end it evicted. The head's request cursors are kept on a stack so a scroll back asks for the range it dropped; the tail needs no stack because the forward cursor is recoverable from the new last page."
  - "P5-D59: a generation counter is bumped on every window discard and checked after EVERY await, not once at the end. A page request in flight across a project switch, a filter change or a refresh is answering a question nobody is asking; applying it puts one project's rows under another project's heading (T-05-41)."
  - "P5-D60: the debounce carries maxWait equal to the cap's interval. NOT IN THE DESIGN CONTRACT and added here after measuring what its absence does: a pure trailing debounce never elapses while events keep arriving, so a sustained stream produces ZERO reactions — measured at 0 over three simulated seconds of 20 events/second — and the operator watches a table that has silently stopped updating. With maxWait the same stream produces reactions at the contract's rate instead of none."
  - "P5-D61: the suppression rule is checked TWICE — on arrival, so a mid-triage summary never enters the window at all, and again when the window elapses. The second check is what the plan's own stated reason requires: a reaction that entered while nothing was selected and fires 400 ms later, after the operator has clicked a row, is the identical row-shift-under-cursor defect arriving late. Measured: removing it lets a reaction land on a selected row."
  - "P5-D62: the trailing window is overridable through an option and the CAP is not. The asymmetry is the point — it lets a spec drive the debounce so fast that the debounce cannot be what holds the cap, which is the only way to prove the throttle gate is load-bearing. Measured: with a 20 ms window and the throttle removed, twenty summaries in one simulated second produce twenty reactions."

patterns-established:
  - "TriageGate: the narrow three-fact seam between the window and the event path, so the event path can never reach the rows directly"
  - "Mutation as evidence: every mechanism claimed load-bearing was removed, the named test watched red, and the file restored"
  - "Suppression asserted as EXACTLY ZERO, never as fewer — so a passing rate cap cannot mask a broken suppression"

requirements-completed: [UI-02, UI-07]

coverage:
  - id: D1
    description: "One typed route from the view layer to the backend: each endpoint is called with the contract's request type and answers with its response type, and no component reaches the SDK directly"
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/frontend/src/api/client.spec.ts#forwards each endpoint and returns the typed response"
        status: pass
      - kind: other
        ref: "node -e (assert the backend package specifier appears nowhere in packages/frontend/src/api/client.ts) — exits 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "A contract-version mismatch is a hard state carrying both numbers, and it suppresses reads rather than reporting beside them"
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/frontend/src/api/client.spec.ts#records a mismatch carrying BOTH versions, and suppresses reads afterwards"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/api/client.spec.ts#leaves the client usable when the backend's contract version matches"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every failure crosses back as a DefMiner-authored reason code — a rejection's own words never reach the UI, and a call that never settles is distinguishable from one that rejected"
    verification:
      - kind: unit
        ref: "packages/frontend/src/api/client.spec.ts#returns a DefMiner-authored reason and NO token of the rejection"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/api/client.spec.ts#times out a call that never settles, distinguishably from a rejection"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/api/client.spec.ts#states the timeout in the error copy from ONE constant"
        status: pass
    human_judgment: false
  - id: D4
    description: "The subscription's stop handle is returned by the client rather than swallowed, and calling it removes the listener"
    requirement: "UI-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/api/client.spec.ts#stops the listener — an event emitted after stop() invokes NO handler"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/coalescer.spec.ts#stops the subscription, and an event emitted afterwards changes NOTHING"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/coalescer.spec.ts#does not react from a window still in flight when stop() is called"
        status: pass
    human_judgment: false
  - id: D5
    description: "A short page is refetched from its returned cursor until a full page is assembled, and the three ways the loop can end stay distinct — exhausted, no further cursor, and the assembly bound"
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/frontend/src/stores/inventory.spec.ts#refetches from the returned cursor until a FULL page is assembled"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/inventory.spec.ts#ends the loop on an EXHAUSTED short page — one request, list complete"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/inventory.spec.ts#stops at the iteration bound in a DISTINCT state, not a completed list"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/inventory.spec.ts#stops when the backend offers no further cursor"
        status: pass
    human_judgment: false
  - id: D6
    description: "The in-memory window is bounded at 2,000 rows, evicted forward-scroll, and an evicted range is refetched by cursor rather than served from anything still resident"
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/frontend/src/stores/inventory.spec.ts#never holds more than the window bound, across enough pages to evict"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/inventory.spec.ts#REFETCHES an evicted head range by cursor rather than serving stale rows"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/inventory.spec.ts#does nothing when there is nothing before the resident window"
        status: pass
    human_judgment: false
  - id: D7
    description: "Sorting and filtering change the request and discard the window; nothing in the store orders resident rows, and a response that lands after its question was withdrawn is dropped"
    requirement: "UI-02"
    verification:
      - kind: unit
        ref: "packages/frontend/src/stores/inventory.spec.ts#discards the window and refetches the FIRST page when the direction changes"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/inventory.spec.ts#discards the window and recounts when the filter changes"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/inventory.spec.ts#holds the resident rows in ARRIVAL order and never reorders them"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/inventory.spec.ts#DISCARDS a response that lands after the window was discarded"
        status: pass
      - kind: other
        ref: "node -e (strip comment lines, assert no /\\.sort\\(/ in packages/frontend/src/stores/inventory.ts) — exits 0"
        status: pass
    human_judgment: false
  - id: D8
    description: "Twenty or more invalidation events inside one simulated second produce at most two UI reactions, and a sustained stream keeps producing them rather than starving"
    requirement: "UI-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/stores/coalescer.spec.ts#turns twenty summaries in one simulated second into AT MOST two reactions"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/coalescer.spec.ts#holds the cap when the trailing window is too short to hold it — the throttle is load-bearing"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/coalescer.spec.ts#does not STARVE under a sustained stream — reactions keep arriving, capped"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/coalescer.spec.ts#reacts once, AFTER the trailing window and not before"
        status: pass
      - kind: other
        ref: "node -e (strip comment lines, assert no /setTimeout|setInterval/ in packages/frontend/src/stores/coalescer.ts) — exits 0"
        status: pass
    human_judgment: false
  - id: D9
    description: "ZERO reactions occur while a row is selected or the evidence panel is open — asserted independently of the rate cap, and independently of each other"
    requirement: "UI-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/stores/coalescer.spec.ts#reacts ZERO times while a row is selected, and accrues the counts"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/coalescer.spec.ts#reacts ZERO times while the panel is open with NO row selected"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/coalescer.spec.ts#does not let a reaction ALREADY IN THE WINDOW land after a row is selected"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/coalescer.spec.ts#suppresses reactions when a row is selected IN THE STORE"
        status: pass
    human_judgment: false
  - id: D10
    description: "The pending count never auto-applies on inactivity (decision D4); it applies on the refresh action, which resets it to zero"
    requirement: "UI-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/stores/coalescer.spec.ts#NEVER auto-applies the pending count on inactivity — decision D4"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/coalescer.spec.ts#does not react when the selection is merely CLEARED"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/coalescer.spec.ts#applies the pending count on the refresh action, and resets it"
        status: pass
    human_judgment: false
  - id: D11
    description: "A summary carrying a foreign project id is discarded, and the per-category breakdown accumulates separately under one shared cap"
    requirement: "UI-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/stores/coalescer.spec.ts#discards a summary carrying a DIFFERENT project id"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/coalescer.spec.ts#accumulates categories separately while they share ONE cap"
        status: pass
    human_judgment: false
  - id: D12
    description: "The reachable count (P5-D45's `{total}`) is fetched alongside the first page and is what the filtered-empty copy will interpolate"
    verification:
      - kind: unit
        ref: "packages/frontend/src/stores/inventory.spec.ts#fetches the reachable count alongside the first page"
        status: pass
    human_judgment: true
    rationale: "The store holds the number and the specs prove it is fetched and re-fetched with the filter. Whether the sentence it lands in reads correctly to an operator is the table component's (05-09) and cannot be asserted from here — no copy is rendered by this plan."

duration: 20 min
completed: 2026-08-28
status: complete
---

# Phase 05 Plan 08: Frontend State — Client, Window, Coalescer Summary

**A typed version-checked RPC client, a 2,000-row cursor window that assembles full pages from short ones and never orders what it holds, and a coalescer that turns twenty events a second into at most two reactions and exactly zero while the operator is mid-triage.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-08-28T16:13:23Z
- **Completed:** 2026-08-28T16:33:34Z
- **Tasks:** 3 (each RED then GREEN — six commits)
- **Files modified:** 7 (6 created, 1 modified)

## Accomplishments

- **One route to the backend, and every failure is a value.** `createBackendClient` wraps the five endpoints this page needs with the engine contract's own request and response types. Nothing rejects: a rejection, a ten-second non-answer and a contract-version mismatch all cross back as `RpcResult` failures carrying a DefMiner-authored reason code. The rejection value is discarded **without inspection**, because reading it to "make a better error" is how the copywriting rule against interpolated target-controlled strings gets broken by somebody being helpful.
- **The version check suppresses reads instead of reporting beside them.** A mismatch is recorded once and every subsequent page and count call answers the mismatch without calling the endpoint. A stale bundle misreading a changed return shape produces wrong rows that look right, which is strictly worse than an error.
- **A bounded window with a short-page loop and two-ended eviction.** Pages are assembled from as many responses as the bounded candidate window forces, capped at eight requests, with the three endings kept distinct so only one of them means "the list ended". Eviction drops the head on forward scroll and keeps its boundary cursor, so a scroll back **refetches** — the spec proves it by giving the second answer different row ids, which a cache would fail.
- **The cap and the suppression are asserted independently, and both were proved load-bearing by mutation.** Removing the throttle turns the twenty-event case into twenty reactions; removing the late suppression check lets a reaction land on a selected row; removing `maxWait` drops a three-second stream to zero reactions. Each mutation was planted, watched red, and restored.

## Task Commits

1. **Task 1 (RED): failing spec for the typed client** — `576cc66` (test)
2. **Task 1 (GREEN): the typed, version-checked client** — `9454bb6` (feat)
3. **Task 2 (RED): failing spec for the window and the short-page loop** — `c409c99` (test)
4. **Task 2 (GREEN): the bounded cursor window** — `f344555` (feat)
5. **Task 3 (RED): failing spec for the cap and the suppression rule** — `6dd1d82` (test)
6. **Task 3 (GREEN): the coalescer** — `8fd79a5` (feat)

_Each task carried `tdd="true"`, so each produced a test commit and a feat commit rather than one._

## Files Created/Modified

- `packages/frontend/src/api/client.ts` — the typed client factory, `FRONTEND_CONTRACT_VERSION`, `RPC_TIMEOUT_MS`, the error-state copy built from it, the `RpcResult` vocabulary, and `subscribeInvalidation`
- `packages/frontend/src/api/client.spec.ts` — a stub SDK driven through every behaviour, including the no-shared-token assertion over a rejection message
- `packages/frontend/src/stores/inventory.ts` — the resident pages, the cursor, the short-page loop, two-ended eviction, the generation counter, and the selection state
- `packages/frontend/src/stores/inventory.spec.ts` — seventeen cases over a scripted page reader
- `packages/frontend/src/stores/coalescer.ts` — the trailing window behind the throttle gate, the twice-checked suppression, and `stop()`
- `packages/frontend/src/stores/coalescer.spec.ts` — fifteen cases on fake timers, with the cap and the suppression in separate blocks
- `knip.json` — the `@vueuse/core` ignore removed, as its own note instructed

## Decisions Made

Thirteen, `P5-D50` through `P5-D62`, in the frontmatter. The four that would surprise a reader:

- **`P5-D54` — factory composables, not pinia stores.** pinia stays installed and unused for state here. A singleton store survives an unmount, which is the exact shape research P-04's listener leak takes; a factory makes the lifetime something an owner holds.
- **`P5-D60` — `maxWait` on the debounce, which the design contract does not mention.** Measured rather than reasoned: without it, three simulated seconds of twenty events a second produce **zero** reactions, because a trailing debounce never elapses while events keep arriving. The operator would watch a table that had silently stopped updating — a coalescer that coalesces everything into nothing.
- **`P5-D61` — the suppression is checked twice.** The plan's own stated reason ("a debounced reaction that fires just after the operator selects a row is the same defect arriving late") is only closed by the second check, at window elapse. Checking only on arrival leaves a 500 ms hole directly over the moment the operator clicks.
- **`P5-D62` — the window is overridable and the cap is not.** That asymmetry is what makes the throttle provable: with a window too short to hold the cap, the debounce cannot be what enforces it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The client spec's stub factory returned a spread COPY, so three failure cases passed vacuously**
- **Found during:** Task 1 (GREEN)
- **Issue:** `makeStub()` ended `return { ...stub, sdk }`. The stub's own closure read the ORIGINAL object, so a test setting `stub.behaviour = "reject"` or `stub.backendVersion = …` on the returned copy changed nothing the endpoints could see. All three failure-path tests would have passed against a client that did nothing.
- **Fix:** attach the SDK to the object and return the object itself, with the reason stated on the type's `sdk` field so the next edit does not reinstate the spread.
- **Files modified:** `packages/frontend/src/api/client.spec.ts`
- **Verification:** the three cases failed against the (correct) implementation before the fix and passed after — the bug was found because the implementation was right and the tests were not.
- **Committed in:** `9454bb6`

**2. [Rule 1 - Bug] The inventory spec's race case deadlocked its own staging**
- **Found during:** Task 2 (GREEN)
- **Issue:** the test gated the FIRST reader call and then superseded the first load before it ever reached the reader — the generation check fires after the count, earlier than the test assumed — so the gate was awaited by the SECOND load and nothing released it. It hung for the full 120 s vitest timeout.
- **Fix:** the stub signals when the first read is genuinely in flight and the test awaits that signal before superseding. Without it the assertion would have passed while testing nothing.
- **Files modified:** `packages/frontend/src/stores/inventory.spec.ts`
- **Verification:** the case now supersedes a read that is provably parked inside the reader, and asserts the stale answer is dropped.
- **Committed in:** `f344555`

**3. [Rule 2 - Missing Critical] `maxWait` on the debounce — without it the coalescer starves the table**
- **Found during:** Task 3
- **Issue:** the plan specifies a trailing debounce behind a throttle. A pure trailing debounce never elapses while events keep arriving, so a sustained event stream — an ordinary busy target — produces no reactions at all. Measured by mutation: **0 reactions over three simulated seconds** of twenty events per second.
- **Fix:** `maxWait` set to the cap's own interval, so a sustained stream reacts at the contract's rate rather than not at all. The cap is unchanged and still enforced by the throttle.
- **Files modified:** `packages/frontend/src/stores/coalescer.ts`
- **Verification:** `#does not STARVE under a sustained stream` — red without `maxWait`, green with it, and the cap assertion in the same test still holds.
- **Committed in:** `8fd79a5`

**4. [Rule 2 - Missing Critical] The suppression rule is checked a second time, when the window elapses**
- **Found during:** Task 3
- **Issue:** the plan says to check suppression before the debounce, and gives as its reason that "a debounced reaction that fires just after the operator selects a row is the same defect arriving late". Checking only at arrival does not close that: a summary that entered the window while nothing was selected still fires 500 ms later, onto a row the operator has since clicked.
- **Fix:** `react()` re-checks `triageLocked` and returns without reacting; the counts stay pending for the pill.
- **Files modified:** `packages/frontend/src/stores/coalescer.ts`
- **Verification:** `#does not let a reaction ALREADY IN THE WINDOW land after a row is selected` — measured red with the check removed (1 reaction where 0 is required).
- **Committed in:** `8fd79a5`

**5. [Rule 3 - Blocking] `Array.prototype.at` is banned by the lint config**
- **Found during:** Task 2
- **Issue:** `n/no-unsupported-features/es-syntax` rejects `.at(-1)` against the configured Node range; five uses in the inventory spec failed `pnpm lint`.
- **Fix:** a local `last()` helper using the index expression the store itself uses.
- **Files modified:** `packages/frontend/src/stores/inventory.spec.ts`
- **Verification:** `pnpm lint` exits 0.
- **Committed in:** `f344555`

### Adjustments made without a rule

- **`knip.json`** — the `@vueuse/core` entry in the frontend's `ignoreDependencies` carried the note "Remove when 05-07 and 05-08 import them". This plan landed the import, so the entry went, with the reason recorded in the file. knip had begun reporting the stale entry itself as a configuration hint; leaving it would have cost a line of permanent noise beside a real finding. `vue-virtual-scroller` stays — the virtualised table has not landed yet.
- **The client wraps five of eight endpoints** rather than all eight (`P5-D52`). Documented in the module header at the point where somebody would add the sixth.

---

**Total deviations:** 6 auto-fixed (3 bugs, 2 missing-critical, 1 blocking)
**Impact on plan:** No scope creep. Both bugs were in tests written minutes earlier and both had the same shape — an assertion that would have passed while testing nothing. Both missing-critical additions are inside the design contract's stated intent and each is pinned by a test proved red without it.

## Issues Encountered

- **A hidden `cp -i` alias stalled a mutation run.** The shell's `cp` is aliased interactive, so restoring a backup mid-mutation prompted and a background command sat at the prompt until it was killed. The file was left in its mutated state and restored explicitly with `command cp -f` before the run continued. No commit ever contained a mutated file — the mutations were planted, measured and reverted between commits, and the tree was re-verified green each time.

## Known Stubs

None. Every exported symbol has a real implementation and a consumer, and no value flows to a display that is hardcoded or placeholder — this plan renders nothing.

## Disclosed residuals — carried, not closed

- **The trailing window is overridable through `CoalescerOptions.trailingWindowMs`.** The cap is not, so no caller can raise the reaction rate above the contract's two per second — but a caller passing a very large window could coalesce for longer than 500 ms and delay a legitimate update. The seam exists to make the throttle provable (`P5-D62`) and is disclosed rather than hidden; the mounting component (05-09) should not pass it. Logged in the windows ledger.
- **The SQLite query plans behind the backend's cursor were measured on 3.51.0 and 3.53.4, not on Caido's shipped 3.46.0.** Not this plan's to close and restated only so nothing here is read as verifying it — the operator chose to proceed with that residual disclosed.

## Threat Flags

None. This plan adds no endpoint, no new network surface and no new trust boundary; it consumes the surface 05-07 registered. The four mitigations the plan's threat register assigns to it are all pinned by tests: T-05-38 (listener leak) by the two `stop()` cases, T-05-39 (event flood) by the cap cases, T-05-40 (row shift mid-triage) by four exactly-zero cases, T-05-41 (two projects resident) by the foreign-project case and the discarded-response case, T-05-42 (stale bundle) by the mismatch-suppresses-reads case, and T-05-43 (raw rejection string) by the no-shared-token case.

## Requirements

- **UI-07** — complete. This plan and 05-07 are the two declaring it and both have shipped.
- **UI-02** — still open: 05-09 also declares it and has not run. `requirements.ready-ids` blocks it for that reason, which is the shared-ID gate working as intended.

## User Setup Required

None — no external service configuration.

## Next Phase Readiness

The three pieces 05-09's virtualised table sits on are in place and typed: `createBackendClient` for the reads, `createInventoryStore` for the window and the selection state, and `createCoalescer` for the pill. What 05-09 owes them:

1. **Call `stop()` on unmount.** The coalescer returns it and asserts it works; nothing enforces that a component calls it.
2. **Call `checkContractVersion()` once on mount** and render the mismatch state — the client records it, but only a component can show it.
3. **Bind `readPage` to the right endpoint per table** and supply the row-key function the table needs for selection.
4. **Do not pass `trailingWindowMs`.**

---
*Phase: 05-workspace-operator-workflow*
*Completed: 2026-08-28*

**6. [Rule 1 - Bug] `requirements.mark-complete` reformatted a machine-owned generated span in REQUIREMENTS.md**
- **Found during:** close-out, by the final full-suite run
- **Issue:** flipping UI-07's checkbox also inserted seven blank lines into the CORE-11 derived-residual block, which `packages/backend/src/outbound-prohibition.spec.ts` byte-compares against `deriveResidual(RESOLVER_REGISTRY, BYTE_COMPARED_SURFACES)`. The suite went red on a span this plan has no business touching. The gate did exactly what it was built for.
- **Fix:** the file was restored to its pre-close-out bytes and the single checkbox flipped by hand, so the only change to REQUIREMENTS.md is one character.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** `pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts` — 455 pass; full suite 49 files / 1828 tests pass.
- **Committed in:** `ba16d57` (repaired in the follow-up close-out commit)

**Note for later close-outs:** `requirements.mark-complete` prettifies the whole markdown file. Any phase touching REQUIREMENTS.md while that generated span ships must re-run the backend suite afterwards, not only its own package's.

## Self-Check: PASSED

All seven files named in `key-files` exist on disk, and all seven commits (`576cc66`, `9454bb6`,
`c409c99`, `f344555`, `6dd1d82`, `8fd79a5`, `03b5c43`) are reachable in the log. Plan-level
verification re-run at close: `pnpm test` 49 files / 1828 tests pass, `pnpm typecheck`,
`pnpm -C packages/frontend typecheck` (vue-tsc), `pnpm lint` and `pnpm knip` all exit 0, and all
three static acceptance gates (no backend specifier in client.ts, no `.sort(` in inventory.ts, no
hand-rolled timer in coalescer.ts) exit 0.
