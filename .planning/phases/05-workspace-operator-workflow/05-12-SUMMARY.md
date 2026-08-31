---
phase: 05-workspace-operator-workflow
plan: 12
subsystem: ui
tags: [vue, settings, retention, telemetry, compatibility, jsdom, vitest]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "store/settings.ts's three-level resolution and its two retention defaults, both written with a comment naming Phase 5 as the phase owing them an interface; index.ts's three compatibility refusal paths and the getStatus/getCompat pair each registers; telemetry.ts's slimStatus projection"
  - phase: 05-workspace-operator-workflow
    provides: "05-01's tab strip and its Health and Settings placeholders; 05-05's display path and static R1/R2 gate; 05-07's typed RPC surface and frontend client; 05-09's inventory tables and their Open Health error action"
provides:
  - "listKnownSettings / putBoundedSetting / clearSetting — every setting this build has, readable and writable at a project scope and an operator-wide scope, with the three resolution levels as three distinguishable fields"
  - "validateBound — the shipped bound guard's predicate, extracted so the write edge refuses a bad bound instead of silently substituting the default"
  - "the listSettings, writeSetting and getHealth RPC endpoints, registered on the success path only; contract version 3 -> 4 in lockstep on both sides"
  - "SettingsPanel.vue — the retention bounds debt discharged, with provenance shown, both scopes explicit, and a failed save that keeps every edit"
  - "HealthPanel.vue — OBS-01's four counters in a fixed-height strip, one action from the inventory table's error state"
  - "CompatRefusal.vue — COMPAT-01's visible refusal surface, depending on getCompat alone"
affects: [phase-02-analysis-pipeline, phase-03-detection, phase-04-entities, phase-06-distribution]

actuals:
  tokens: 51000
  tasks: 3
  commits: 8

tech-stack:
  added: []
  patterns:
    - "One copy-contract module per surface (settings-contract.ts, health-contract.ts, compat-contract.ts), so a sentence is written once and asserted rather than retyped into a spec"
    - "A closed vocabulary in @defminer/engine/contract with Record maps over it in the frontend, so a key or a rejection reason a later phase adds is a typecheck failure rather than a blank label"
    - "Component state split into stored rows and operator drafts, making no-lost-edits a property of the shape rather than a rule at each write site"
    - "Fixed-height strips asserted through their class attribute, because jsdom performs no layout and offsetHeight would pass unconditionally"

key-files:
  created:
    - packages/frontend/src/components/SettingsPanel.vue
    - packages/frontend/src/components/SettingsPanel.spec.ts
    - packages/frontend/src/components/settings-contract.ts
    - packages/frontend/src/components/HealthPanel.vue
    - packages/frontend/src/components/HealthPanel.spec.ts
    - packages/frontend/src/components/health-contract.ts
    - packages/frontend/src/components/CompatRefusal.vue
    - packages/frontend/src/components/compat-contract.ts
  modified:
    - packages/backend/src/store/settings.ts
    - packages/backend/src/store/settings.spec.ts
    - packages/backend/src/api/spec.ts
    - packages/backend/src/index.ts
    - packages/backend/src/index.spec.ts
    - packages/backend/src/ingest/consumer.ts
    - packages/engine/src/contract.ts
    - packages/frontend/src/api/client.ts
    - packages/frontend/src/api/client.spec.ts
    - packages/frontend/src/App.vue
    - packages/frontend/src/App.spec.ts
    - packages/frontend/src/components/table-contract.ts

key-decisions:
  - "P5-D93: the settings section list is derived from the keys the backend returned, not from a frontend group vocabulary"
  - "P5-D94: a failed save keeps every edit, because drafts are separate from rows and the re-read is on the success path only"
  - "P5-D95: the retention bounds are shown in the units the sweep obeys, with no conversion on this surface"
  - "P5-D96: the health endpoint has two outcomes — four zeroes are not 'no project resolved'"
  - "P5-D97: the health strip reads getHealth and not getStatus; getStatus stays unwrapped"
  - "P5-D98: the refusal surface depends on getCompat alone, and getCompat stays outside the contract-version guard"
  - "P5-D99: the refusal surface renders on `compatible === false`, never on `!compatible`"
  - "P5-D100: the strip's fixed height is asserted as an identical class attribute, not as an offsetHeight comparison"
  - "P5-D101: UI-08 is marked for the settings this build has, and the residual is stated rather than left to the checkbox"
  - "P5-D102: the health surface carries a Refresh action beyond the plan's four behaviours"

patterns-established:
  - "Growth by addition: a phase adding a setting adds a key to the backend's frozen KNOWN_SETTINGS and a row to the frontend's Record maps; both halves fail to compile if only one is done"
  - "A plugin-generated string never enters a DefMiner sentence — it gets its own font-mono element with the display path in front of it"
  - "An in-flight action takes its own label, and the double-submit guard sits at the handler as well as on the disabled attribute"

requirements-completed: [UI-08]

coverage:
  - id: D1
    description: "Every setting this build has is readable and writable at a project scope and an operator-wide scope, with the project value, the global value and the documented default as three distinguishable fields"
    requirement: "UI-08"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/settings.spec.ts#listKnownSettings / putBoundedSetting"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#listSettings / writeSetting endpoints"
        status: pass
    human_judgment: false
  - id: D2
    description: "A retention bound that is empty, non-numeric, zero or negative is refused at the write edge with a distinguishable reason, before it can reach the sweep"
    requirement: "UI-08"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/settings.spec.ts#validateBound rejection cases"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#a rejected bound keeps the typed value and renders the reason"
        status: pass
    human_judgment: false
  - id: D3
    description: "A failed save names the cause and retains every edit; no field reverts to its stored value"
    requirement: "UI-08"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#a failed save keeps every edited field"
        status: pass
    human_judgment: false
  - id: D4
    description: "The health surface renders queue depth, dropped count, jobs in flight and the largest observed synchronous slice, with thousands separators, in a strip whose height does not depend on the counter magnitude"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/HealthPanel.spec.ts#the four counters / the fixed-height strip"
        status: pass
      - kind: integration
        ref: "packages/frontend/src/App.spec.ts#the health tab mounts the real strip"
        status: pass
    human_judgment: false
  - id: D5
    description: "The inventory table's error-state health action lands the operator on a rendered strip in one press"
    verification:
      - kind: integration
        ref: "packages/frontend/src/App.spec.ts#routes from the table's error action STRAIGHT to a rendered strip"
        status: pass
    human_judgment: false
  - id: D6
    description: "A build that refuses to run says so visibly, naming the reason, both minimum versions, both detected versions and the surface probe matrix, with only the compatibility endpoint answering"
    verification:
      - kind: integration
        ref: "packages/frontend/src/App.spec.ts#the compatibility refusal surface (COMPAT-01, debt P1-D5)"
        status: pass
    human_judgment: true
    rationale: "Every case is driven against a STUB of a refusing build. No refusing Caido exists to run against — PROJECT.md records that 0.57.1 became unobtainable and the dev machine runs a build that passes every probe — so the surface has never been rendered by an init() that actually returned early. The wiring is asserted; the occasion is not reproducible here."
  - id: D7
    description: "The R5 server-path renderer labels a path as being on the Caido server, cuts it at the left end, carries it in no attribute and exposes the full value through the clipboard alone"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#the server path (R5)"
        status: pass
    human_judgment: true
    rationale: "Exercised through a prop only. No endpoint supplies a server path and none may — telemetry.ts strips sdk.meta.path() out of everything crossing the RPC — so this renderer has no production data source until DEPLOY-02 in Phase 6. See ## Known Stubs."

duration: 45 min
completed: 2026-08-31
status: complete
---

# Phase 05 Plan 12: Settings, Health and the Refusal Surface Summary

**Three shipped debts discharged at the surface: the retention bounds are editable at two scopes with their provenance shown, the four counters that tell a blocked QuickJS thread from a slow renderer are one press from the table's error state, and a build that refuses to run now says so where the operator will see it.**

## Performance

- **Duration:** 45 min (10:28:59Z+02 → 11:13:26Z+02, across two executor sessions)
- **Started:** 2026-08-31T08:28:59Z
- **Completed:** 2026-08-31T09:13:26Z
- **Tasks:** 3
- **Files modified:** 23 (8 created, 15 modified)

**Execution was interrupted.** A first executor completed Tasks 1 and 2 and was stopped by the operator before Task 3 and before any close-out, leaving four commits on a green tree and no SUMMARY — the plan correctly recorded as incomplete. A second executor resumed, read what Tasks 1 and 2 had produced rather than re-running them, executed Task 3, and did the close-out. This record is written from the first two tasks' commits and code and from the third task's own work; it is stated here rather than left invisible, because "one continuous execution" is not what happened and a later reader comparing timestamps would otherwise find a seventeen-minute gap with no explanation.

## Accomplishments

- **The retention bounds debt is discharged at both ends of the chain.** `store/settings.ts` shipped in Phase 1 with two comments saying the defaults were picked conservatively because "there is no UI to change this until Phase 5", and with a resolution written three levels deep "because Phase 5 will want an operator-wide default that a single project can override". Both are now true, and **no call site changed** — which is exactly what writing the resolution three-deep bought. The chain is wired end to end: a write lands a row, `resolveSetting` picks it up, `getRetentionBounds` turns it into bounds, and `consumer.ts`'s `runRetentionPass` hands those to `sweepRetention` on its cadence.
- **A bad bound is refused at the write edge, not silently defaulted.** The shipped read guard's predicate was extracted as `validateBound` and is now run *before* storage, reporting which of six reasons it refused. `zero` is its own reason rather than an "invalid number", because `0` is what somebody types when they mean *no limit*, and that is the single most dangerous thing they can mean about a bound on a database nothing else garbage-collects.
- **OBS-01's four numbers are visible and reachable in one action from the failure.** `getHealth` projects what was already measured — the queue's own depth and overflow count, the consumer's drain flag, and `slimStatus().maxSliceMs`. No new instrumentation: an instrument added in the renderer would measure from a process away from the thread being measured. The table's error copy already ended "open Settings → Health to see queue depth and dropped count"; that sentence now has a second half.
- **COMPAT-01's visible refusal surface exists.** `index.ts` has recorded since Phase 1 that "COMPAT-01's 'clear message' is this log line plus this RPC; the visible surface is owed to Phase 5 (decision P1-D5)". `CompatRefusal.vue` renders the reason, both minimums, both detected versions and the probe matrix, and depends on `getCompat` and on nothing else — which is the whole constraint, because all three refusal paths register only the `getStatus`/`getCompat` pair.
- **The two tab placeholders from the tracer are gone.** Settings and Health mount their real bodies; the two entity tabs are untouched.

## Task Commits

1. **Task 1: the settings and health endpoints over what is already shipped** — `3d11301` (test, RED) → `f8c7fab` (feat, GREEN)
2. **Task 2: SettingsPanel.vue — the surface, and the retention bounds debt** — `5fac80e` (test, RED) → `365b0e2` (feat, GREEN)
3. **Task 3: HealthPanel.vue, the visible refusal surface, and the tab wiring** — `521f343` (test, RED) → `5d212d9` (feat, GREEN) → `2ec6484` (test, two unexercised branches reached)

**Close-out repair:** `de40699` (fix: restore the CORE-11 derived-residual span)

_TDD gate sequence: three RED→GREEN pairs, each `test(...)` commit preceding its `feat(...)`. Verified in `git log`._

## Files Created/Modified

**Backend**

- `packages/backend/src/store/settings.ts` — `validateBound`, `clearSetting`, `KNOWN_SETTINGS`, `listKnownSettings`, `putBoundedSetting`. The frozen key list names three keys and every one has a shipped consumer; there is deliberately **no audit age key**, so decision D-06's exemption is enforced by the vocabulary rather than by a rule someone has to remember.
- `packages/backend/src/api/spec.ts` — `HealthPayload`, `HealthOutcome`, three API entries, `CONTRACT_VERSION` 3 → 4.
- `packages/backend/src/index.ts` — `listSettings`, `writeSetting`, `getHealth`, registered on the success path only, after the consumer and before the ready latch. **The three refusal paths are byte-for-byte unchanged.**
- `packages/backend/src/ingest/consumer.ts` — `jobsInFlight`, a reader over the drain flag the loop already keeps. Zero or one by construction on a single-threaded runtime, and that is the information rather than a limitation: a `1` beside a climbing queue depth is a blocked thread.
- `packages/engine/src/contract.ts` — `SETTINGS_GROUPS`, `SETTING_KEYS`, `SETTING_SCOPES`, `BOUND_REJECTIONS` and the three key constants. Both packages need them as values and cannot import each other; `SETTING_SCOPES`'s order is a safety property, since a positional mistake must land on "this project only".

**Frontend**

- `packages/frontend/src/api/client.ts` — `listSettings`, `writeSetting`, `getHealth` (all guarded) and `getCompat` (deliberately not).
- `packages/frontend/src/components/SettingsPanel.vue` + `settings-contract.ts` — one section per group that has controls, provenance in words, both scopes explicit, the clear action stating its fallback before it is pressed, and the R5 path renderer.
- `packages/frontend/src/components/HealthPanel.vue` + `health-contract.ts` — the four counters, the fixed-height strip, the two states four zeroes would lie about, and the per-counter explanations *below* the strip rather than in it.
- `packages/frontend/src/components/CompatRefusal.vue` + `compat-contract.ts` — the refusal, the versions, the probe matrix.
- `packages/frontend/src/components/table-contract.ts` — `groupThousands` exported rather than copied a third time.
- `packages/frontend/src/App.vue` — the two tab bodies, the refusal surface mounted above the body region so it is on screen from any tab, and `loadCompat` issued on mount ahead of the two page reads that reject on a refusing build.

## Decisions Made

Ten, recorded as P5-D93 … P5-D102 in `STATE.md`. The three that would be most expensive to reverse:

- **P5-D97 — the health strip reads `getHealth`, not `getStatus`, and `getStatus` stays unwrapped in the client.** This resolves the half of P5-D52 that plan 05-12 was the trigger for. `getStatus` carries the whole telemetry projection including `lastError`; a strip built over that wider shape would be one field access away from rendering a plugin-generated string that quotes what the plugin was doing, and the design contract makes the absence of such content a *property* of this surface. Resolution, not discipline.
- **P5-D98 — the refusal surface depends on `getCompat` alone.** A surface needing a third endpoint could not render on the only build it exists for. `getCompat` correspondingly stays outside the contract-version guard: `getContractVersion` does not exist on a refusing build either, so the guard could never have been satisfied there, and gating it would withhold the diagnosis at the moment it is needed.
- **P5-D95 — no unit conversion on the retention age bound.** It is stored and obeyed in milliseconds and is shown in milliseconds. A conversion bug on this particular number does not produce a wrong label; it produces a sweep that deletes ninety times too much.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing Critical] Three copy-contract modules the plan's file list did not name**

- **Found during:** Tasks 2 and 3
- **Issue:** The plan listed only the components. A string typed into a template is a string a spec has to retype to assert, and two typings of one sentence are two sentences that drift.
- **Fix:** `settings-contract.ts` (Task 2), `health-contract.ts` and `compat-contract.ts` (Task 3), following the shipped `panel-contract.ts` / `export-contract.ts` / `table-contract.ts` pattern.
- **Verification:** Every asserted string in the three specs is imported, never retyped. `pnpm knip` exits 0, so none of the added exports is dead.
- **Committed in:** `5fac80e`, `521f343`

**2. [Rule 2 — Missing Critical] `groupThousands` exported from `table-contract.ts` rather than written a third time**

- **Found during:** Task 3
- **Issue:** The same five-character grouping regex already existed twice — privately in `safety/display.ts` and inlined in `table-contract.ts`'s `counted`. The health strip needed the grouping without a noun.
- **Fix:** Extracted and exported from `table-contract.ts`; `counted` now calls it. `display.ts` deliberately keeps its own copy — it is the safety layer, and importing a components-level contract into it would invert the layering.
- **Verification:** `InventoryTable.spec.ts` and `FindingsTable.spec.ts` still pass unchanged.
- **Committed in:** `521f343`

**3. [Rule 1 — Bug] `onlyCompatAnswers` did not do what its own docblock claimed**

- **Found during:** Task 3
- **Issue:** Task 1 added the stub option documented as "every endpoint EXCEPT `getCompat` rejects", and three endpoints honoured it while `getContractVersion` and the paged reads answered normally. A stub that can read a contract version off a refusing build describes a runtime that does not exist, and would have under-tested the refusal surface in exactly the direction that matters.
- **Fix:** The option now rejects every endpoint except `getCompat`.
- **Verification:** The refusal cases now run against a stub whose shape matches `init()`'s actual refusal return.
- **Committed in:** `521f343`

**4. [Rule 2 — Missing Critical] A Refresh action on the health surface, beyond the plan's four behaviours**

- **Found during:** Task 3
- **Issue:** The diagnosis this surface exists for is *does the number move*. A climbing queue depth beside a jobs-in-flight of `1` is a blocked thread; the same two numbers held still are an idle backend. A surface that read once on mount could not tell the two apart, which is the question it was built to answer.
- **Fix:** A text-labelled Refresh with its own in-flight label and a double-submit guard at the handler, mirroring the settings save.
- **Verification:** Four cases in `HealthPanel.spec.ts` covering the re-read, the in-flight label, the refused second call and the return to rest.
- **Committed in:** `5d212d9`

**5. [Rule 1 — Bug] Two branches of the new refusal surface reached by no test**

- **Found during:** Task 3, reading the component back against its own cases
- **Issue:** The probe-error element and the truncation notice both shipped unexercised. The probe fixture carried `error: null` on every row, and no shipped refusal reason approaches the 2,048-grapheme panel cap.
- **Fix:** The fixture now carries a caught `TypeError`, and a case asserts an over-long reason says it truncated.
- **Verification:** Both branches now execute; `pnpm test` 2,268 passed.
- **Committed in:** `2ec6484`

**6. [Rule 3 — Blocking] `requirements.mark-complete` broke the CORE-11 byte comparison, for the seventh time this phase**

- **Found during:** Close-out
- **Issue:** The verb prettifies `REQUIREMENTS.md`, inserting three blank lines into the machine-owned derived-residual span that `outbound-prohibition.spec.ts` byte-compares.
- **Fix:** The pre-call bytes were restored and the one checkbox flip re-applied to them — 05-11's approach. The span itself is never touched, which is what its sentinel requires.
- **Verification:** `pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts` — 457 passed.
- **Committed in:** `de40699`

**7. [Documented divergence] "Measured height" is asserted as an identical class attribute**

- **Found during:** Task 3
- **Issue:** The plan's acceptance criterion asks for a test that "the strip's measured height is equal for a single-digit counter and for a counter above one million". jsdom performs **no layout** — `offsetHeight` is `0` for every element, for a strip that wraps and for one that does not — so that assertion would pass unconditionally while looking like the strongest test in the file.
- **Fix:** The height is decided by three classes, none conditional on any value; the test asserts the strip's rendered `class` attribute is byte-identical across the two magnitudes, that it carries the fixed-height utility, that it has no `flex-wrap` or `overflow-x-*`, and that every cell carries `whitespace-pre overflow-hidden`. The reasoning is in the spec's header, not only here.
- **Verification:** `HealthPanel.spec.ts` — the fixed-height-strip describe block, 4 cases.
- **Committed in:** `521f343` / `5d212d9`

---

**Total deviations:** 7 (4 missing-critical, 2 bugs, 1 blocking; one of them a documented divergence from an acceptance criterion rather than an addition)
**Impact on plan:** No scope creep. Four of the seven make an existing rule mechanical rather than remembered; two close coverage gaps in code this plan wrote; one is the recurring `mark-complete` collision. The single divergence is stated as a divergence rather than quietly satisfied by a vacuous assertion.

## Issues Encountered

- **Execution was stopped mid-plan after Task 2** and resumed by a second executor. No work was redone and no commit was rewritten; the resumption cost a re-read of what Tasks 1 and 2 produced, which is recorded above under Performance.
- **`state.add-decision` silently no-ops on a path outside the repository.** Writing the decision text to the session scratchpad produced ten `{"added": false, "reason": "Path escapes allowed directory"}` responses at exit code 0. Re-run from `.planning/.tmp-05-12/`; all ten landed. Checking the `added` field rather than the exit code is what caught it.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `SERVER_STORAGE_PATH = null` — the R5 path renderer ships with no production data source | `packages/frontend/src/App.vue:~550`, rendered by `SettingsPanel.vue`'s `data-defminer-server-path` section | **Deliberate, and it may not be filled in this phase.** No endpoint supplies a server filesystem path and none may: `telemetry.ts` strips `sdk.meta.path()` out of everything crossing the RPC because on every real deployment it carries the operator's OS username, and `telemetry.spec.ts` gates that closure at the RPC level. R5 is honoured as a *rule* — the renderer labels, left-truncates, keeps the value out of every attribute and routes the full string through the clipboard alone — so **DEPLOY-02 (Phase 6)** inherits the rule instead of retrofitting it. The renderer is exercised by spec through a prop, never by production data. |

The plan's goal is achieved with this stub in place: R5 is a forward constraint the UI-SPEC explicitly marks as *not* a Phase 5 requirement.

## Gaps a later plan would otherwise have to find — stated here because there is no later plan

Two gaps this phase (UI-07's unsubscribed coalescer, UI-09's `scan_state` that never reached the page) were well-tested modules that were simply not connected, and both were caught only by a subsequent plan. Everything this plan built is connected — the settings write reaches `sweepRetention` through `getRetentionBounds` on the consumer cadence, the health counters read the queue and drain flag the loop already keeps, the error action moves the tab, both components mount. What follows is the set of claims that are **weaker than they look**, named so phase verification is not the first to ask.

1. **The refusal surface has never rendered from an actual refusal.** Every case drives a stub. There is no refusing Caido to run against: `PROJECT.md` records that 0.57.1 became unobtainable and the dev build passes every probe, so `init()` has never returned early with this component mounted. What is proven is that the surface renders from the report shape the refusal path produces and depends on no endpoint that path does not register. What is not proven is that a real refusal produces that shape — that is `scripts/phase1/compat-smoke.sh` leg C's territory, and it has not been re-run against this frontend.
2. **UI-08 is marked, and this build has three settings.** The requirement reads "a settings surface for every toggle, threshold, and budget". Every setting that exists is on the surface at both scopes with its provenance; the thresholds and budgets are Phases 2–4's and have shipped no controls to expose. What is complete is the **surface and its growth mechanism** — a phase adding a setting adds a key to `KNOWN_SETTINGS` and a row to the frontend `Record` maps, and omitting either half fails to compile. What is not complete is the *set of settings*, and the checkbox cannot say that. Recorded as P5-D101.
3. **`## UI Considerations` `partial / settings-form` stays `⚠ unresolved`,** as the plan's own assumptions block states. Some-present-some-absent cannot be specified without inventing the Phase 2–4 field set. This surface renders the honest subset — the sections that exist — and the row stays open for the phase that adds the rest.
4. **`jobsInFlight` is 0 or 1 and can never be more.** That is correct on a single-threaded runtime and is documented at the declaration, but a reader of the health strip may take a fixed `1` as an instrument that is stuck rather than as a thread that is busy. The per-counter help text says so; nothing enforces that it keeps saying so.
5. **The health strip's fixed height is asserted at the class level and never at the pixel level.** `tests/frontend-load.spec.ts` measures real rendered geometry for the table (`distinct rendered heights [32]`); the health strip has no equivalent measured backstop. A Tailwind config change that stopped emitting `h-12` would leave every one of these tests green.
6. **Nothing asserts that the three refusal paths still register only `getStatus` and `getCompat`.** The plan's acceptance criterion for Task 1 was a `git diff` check, which is a review step and not a gate — a fourth `api.register` added to a refusal path tomorrow would break `CompatRefusal`'s only guarantee with no test failing. Worth a structural gate in the phase that next touches `init()`.

## User Setup Required

None — no external service configuration.

## Next Phase Readiness

- **Phase 5's plan set is complete: 12 of 12.** `pnpm test` (59 files, 2,268 tests), `pnpm typecheck`, `pnpm lint`, `pnpm knip`, `pnpm check:bundle`, `pnpm check:css` and `pnpm check:externals` all exit 0.
- Ready for `/gsd-verify-work 05`. The six items above are the honest agenda for it.
- **Deferred by D-05 and unchanged by this plan:** 05-03 in full, the triage/suppression halves of 05-04 (OPS-01/02/04) and the projection half of 05-05 (FIND-01/02). They key on an entity identity Phase 4's plan 04-03 defines.

## Self-Check: PASSED

- All 8 created files verified present on disk with `[ -f ]`.
- All 8 commit hashes verified present with `git log --oneline --all`.
- Plan-level `<verification>` re-run at close: `pnpm test` 2,268 passed / 59 files; `pnpm typecheck` 0; `pnpm lint` 0; `pnpm knip` 0; `pnpm check:bundle` 0 (bundle import set: one specifier, `crypto`); `pnpm check:css` 0 (118 rules under `#plugin--defminer`); `pnpm check:externals` 0 (one bare specifier, `vue`).
- Every Task 3 acceptance criterion executed, with the one documented divergence recorded above as deviation 7.

---
*Phase: 05-workspace-operator-workflow*
*Completed: 2026-08-31*
