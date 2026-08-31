---
phase: 06-retroactive-scan-deployment-reality
plan: 09
subsystem: ui
tags:
  [
    vue,
    vueuse,
    throttle,
    caido-sdk,
    events,
    discriminated-union,
    backpressure,
    quickjs,
  ]

requires:
  - phase: 06-01
    provides: "runScanProducer, SCAN_LIFECYCLE_STATES, ScanStatusPayload, the ScanProducerDeps injection seam"
  - phase: 06-03
    provides: "SCAN_BACKPRESSURE_WATERMARK, isHeldAtWatermark(), counters.retro, the sustained-backfill contract"
  - phase: 06-05
    provides: "the lifecycle transitions (completeScan, resumeScan, suspendOnEpochChange), D-11's startup sweep, the getScanStatus projection"
  - phase: 06-08
    provides: "the index.ts/api-spec.ts shape the driver and the widened events map were written against"
  - phase: 05-08
    provides: "createCoalescer, MAX_REACTIONS_PER_SECOND, REACTION_MIN_INTERVAL_MS, the triage-lock invariant this plan routes AROUND"
provides:
  - "A retroactive scan that ACTUALLY WALKS in the shipped build — the producer's first production driver (ROADMAP success criterion 1's `runs` half)"
  - "SCAN_PROGRESS_KIND / ScanProgressPayload / InvalidationEventPayload / isScanProgressPayload — one event, two payload variants"
  - "The producer's per-page progress emit, with cumulative row counters and a project-still-current guard"
  - "completeScan's first production caller"
  - "SCAN_LIFECYCLE_PRESENTATION and ScanLifecycleBadge.vue — the second status vocabulary, kept apart from the first by a compiler, a component boundary and a prefix guard"
  - "useScanProgress — a leading-throttled progress store that never reads the triage lock"
  - "The client's single-subscription, two-destination routing"
  - "05-UI-SPEC.md amendments A2 and A3, applied in the same commit as the code"
affects:
  [
    06-10 restart matrix,
    06-12 the Scan tab readout,
    06-13 the scan history list and the toolbar indicator,
  ]

actuals:
  # chars/4 over the sixteen source files actually changed (510,045 chars).
  # The diff alone is 124,653 chars ≈ 31,163 — the smaller number is NOT the
  # comparable one: the plan's 105,000 estimate was taken over files_modified.
  tokens: 127511
  tasks: 3
  commits: 8

tech-stack:
  added: []
  patterns:
    - "A discriminated union on ONE event, with the tag declared on both variants and `?: undefined` on the one that does not emit it — narrowing without widening the shipped payload"
    - "A leading-edge throttle for a progress readout beside a trailing debounce for entity tables: two mechanisms because they answer two different questions"
    - "A scheduled driver armed only at the two places a job can become runnable — never at init, never on a poll"
    - "A prefix-collision guard over the union of two vocabularies' labels AND their computed words, with a negative fixture"

key-files:
  created:
    - packages/frontend/src/components/scan-lifecycle-presentation.ts
    - packages/frontend/src/components/ScanLifecycleBadge.vue
    - packages/frontend/src/components/scan-lifecycle-presentation.spec.ts
    - packages/frontend/src/stores/scan-progress.ts
    - packages/frontend/src/stores/scan-progress.spec.ts
  modified:
    - packages/engine/src/contract.ts
    - packages/engine/src/contract.spec.ts
    - packages/backend/src/api/spec.ts
    - packages/backend/src/index.ts
    - packages/backend/src/index.spec.ts
    - packages/backend/src/scan/producer.ts
    - packages/backend/src/scan/producer.spec.ts
    - packages/backend/test/fixtures/fake-sdk.ts
    - packages/frontend/src/api/client.ts
    - packages/frontend/src/api/client.spec.ts
    - packages/frontend/src/components/scan-contract.ts
    - .planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md

key-decisions:
  - "D-15's literal wording is diverged from, IN WRITING and in the source: progress rides the same event as a second VARIANT, not a fourth InvalidationCategory. INVALIDATION_CATEGORIES stays at three members and contract.spec.ts's length assertion is untouched."
  - "The discriminator is declared on BOTH variants and `kind?: undefined` on the summary, so the predicate narrows while the emitted invalidation object stays exactly the four scalars UI-07 fixed."
  - "The producer emits through sdk.api.send rather than an injected callback: one backend→frontend mechanism, and the one route a driver cannot forget to wire."
  - "The driver is SCHEDULED, armed only by startScan and resumeScan — never at init, so D-11's `nothing is resumed` is not reversed, and never on a timer."
  - "The driver hands over the SHIPPED queue or nothing: a fallback queue would make D-01's watermark gate on a depth the live hook never raises."
  - "ScanProgressPayload.analysed is `number | null` and emitted as null — declined a second time with the reason and a named owner (WINDOWS 94), never a lying zero."
  - "The lifecycle terminal label is `Finished`, never `Completed`, and the prefix guard walks the computed words as well as the map members."
  - "The progress store receives a project id and a subscribe function and nothing else. Not passing the triage lock in IS the mechanism; coalescer.ts is byte-unchanged."

patterns-established:
  - "Tag-on-both-variants union: `readonly kind?: undefined` on the untagged arm buys narrowing at zero runtime cost"
  - "Scheduled driver + `resetScanDriverForTest()` disarm, called by init() as well as by specs, so a hot reload cannot leave a walk on a stale handle"
  - "Two-destination routing at the single subscription site, with the callback typed against the union so an unrouted variant is a typecheck failure"

requirements-completed: [FIND-04]

coverage:
  - id: D1
    description: "A retroactive HTTPQL-filtered scan of existing traffic RUNS: startScan arms a driver, the walk covers every page through the shipped admission gate, and completeScan lands"
    requirement: FIND-04
    verification:
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#startScan kicks the driver, the walk covers every page, and completeScan lands"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#hands the producer the SHIPPED queue — the consumer picks the walked work up"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#resumeScan kicks the driver too — the ONLY other way back into the walk"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#D-11 is not undone: init() arms NO driver, so nothing resumes itself"
        status: pass
    human_judgment: false
  - id: D2
    description: "The walk sends DefMiner's own clause first and the operator's last — D-05 made checkable at the one place it becomes a fact"
    requirement: FIND-04
    verification:
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#sends DefMiner's own clause to Caido, with the operator's clause last"
        status: pass
    human_judgment: false
  - id: D3
    description: "One event carries two payload variants; the invalidation category list is unchanged at three members and the predicate narrows both ways"
    verification:
      - kind: unit
        ref: "packages/engine/src/contract.spec.ts#the progress payload is a VARIANT, never a fourth CATEGORY"
        status: pass
      - kind: unit
        ref: "packages/engine/src/contract.spec.ts#holds exactly the three SHIPPED table categories"
        status: pass
    human_judgment: false
  - id: D4
    description: "The producer emits one progress payload per WALKED page — none while held, none after a project change, cumulative counters, no URL/host/header/body"
    requirement: FIND-04
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#the producer reports every page it walked, and only those"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#emits one progress payload per walked page on the SHIPPED event"
        status: pass
    human_judgment: false
  - id: D5
    description: "heldAtWatermark on the RPC reflects the producer's real module state, asserted on the wire and against the source"
    verification:
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#getScanStatus reports the producer's REAL hold, never a hardcoded false"
        status: pass
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#issues NO query at exactly the watermark, and reports the hold"
        status: pass
    human_judgment: false
  - id: D6
    description: "The sustained-backfill contract still holds: a full page plus a full measured live burst drops nothing and `live-0` is still at the head"
    verification:
      - kind: unit
        ref: "packages/backend/src/scan/producer.spec.ts#cannot displace a live entry: a full measured burst still fits on top of a full page"
        status: pass
    human_judgment: false
  - id: D7
    description: "Two status vocabularies that share the word `scan` cannot be confused — a Record over the closed union, a separate component and marker, and a prefix guard over both maps' labels AND the computed words with a negative fixture"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/scan-lifecycle-presentation.spec.ts#the two status vocabularies cannot be confused (06-UI-SPEC mechanism 4)"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/scan-lifecycle-presentation.spec.ts#turns red when a deliberately colliding word is introduced"
        status: pass
      - kind: automated_ui
        ref: "packages/frontend/src/components/scan-lifecycle-presentation.spec.ts#puts the tone class and the label on the SAME element"
        status: pass
    human_judgment: false
  - id: D8
    description: "Progress applies on the LEADING edge at the shipped cap with no trailing debounce, ignores a foreign project, and stop() stops both halves"
    verification:
      - kind: unit
        ref: "packages/frontend/src/stores/scan-progress.spec.ts#the leading edge — the FIRST payload lands immediately"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/scan-progress.spec.ts#turns twenty payloads in one simulated second into AT MOST the cap"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/scan-progress.spec.ts#has NO trailing application — the burst ending fires nothing more"
        status: pass
    human_judgment: false
  - id: D9
    description: "The triage-lock invariant is routed AROUND rather than weakened: coalescer.ts is byte-unchanged, progress applies with a row SELECTED, and the pill's total never moves"
    verification:
      - kind: unit
        ref: "packages/frontend/src/stores/scan-progress.spec.ts#applies WITH A ROW SELECTED, which is the whole point of the routing"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/stores/scan-progress.spec.ts#never increments the pill's total and never refetches"
        status: pass
      - kind: other
        ref: "git diff --exit-code -- packages/frontend/src/stores/coalescer.ts"
        status: pass
    human_judgment: false
  - id: D10
    description: "One subscription, two destinations: a progress payload never reaches the coalescer's summary handler and a summary never reaches the progress one"
    verification:
      - kind: unit
        ref: "packages/frontend/src/api/client.spec.ts#routes a progress payload to the progress handler and NEVER to the summary one"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/api/client.spec.ts#subscribes ONCE for both variants — one channel, as D-15 requires"
        status: pass
    human_judgment: false
  - id: D11
    description: "05-UI-SPEC.md amendments A2 and A3 applied in the same commit as the code, with A1 and A4 deliberately absent"
    verification:
      - kind: manual_procedural
        ref: "grep for the A1/A4 text in 05-UI-SPEC.md returns nothing; A2/A3 text present in § Event coalescing"
        status: pass
    human_judgment: true
    rationale: "Whether the amended prose faithfully states what was built is a reading, not an assertion. The code half is covered by D3, D9 and D10; the wording is the operator's contract and a human should read it once."
  - id: D12
    description: "A REAL Caido runtime actually returns pages through sdk.requests.query() and the driver walks them"
    verification: []
    human_judgment: true
    rationale: "Everything above runs against a fake SDK and a single-connection SQLite fixture. That Caido's own RequestsQuery behaves as the builder shape assumes — and that a multi-hour backfill holds at the watermark on a real instance — is measured by plans 06-10 (the deployment matrix) and 06-11 (the push-down superset proof), never by a unit spec."

duration: 35 min
completed: 2026-08-31
status: complete
---

# Phase 6 Plan 09: Scan Progress on One Channel — and the Producer's First Driver Summary

**A retroactive scan now actually walks in the shipped build, reporting one progress payload per walked page as a second variant on the existing invalidation event — routed to its own leading-throttled store before the coalescer sees anything, with the triage-lock invariant left literally unmodified.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-08-31T21:30:00Z
- **Completed:** 2026-08-31T22:05:00Z
- **Tasks:** 3 (plus the mid-execution driver scope addition)
- **Files modified:** 17 (5 created, 12 modified)

## Accomplishments

- **ROADMAP success criterion 1's `runs` half is met.** `runScanProducer` shipped in 06-01 with no
  caller by design, was given a watermark by 06-03 and a lifecycle by 06-05, and until this plan
  **nothing called it** — so every property its spec proves was true of a function no build ever
  entered. `index.ts` step 6c now constructs `ScanProducerDeps` and drives the loop, and
  `index.spec.ts` asserts the walk from the outside: through the real `init()`, the real RPC
  surface, the real `BoundedQueue` and the real `scans` table.
- **`completeScan` has a production caller.** 06-05 shipped the transition with none; the driver is
  what calls it when the filter's range below the position is exhausted.
- **One event, two payload variants.** `SCAN_PROGRESS_KIND`, `ScanProgressPayload`,
  `InvalidationEventPayload` and `isScanProgressPayload` in the engine contract, with the events map
  in `api/spec.ts` widened over the same mapped type so renaming the event stays a typecheck
  failure. `INVALIDATION_CATEGORIES` is **byte-unchanged at three members**.
- **The triage-lock invariant is routed around, not weakened.** `stores/coalescer.ts` is
  byte-unchanged — asserted by `git diff --exit-code` — because the payload is discriminated at the
  client's single subscription site and a progress payload never reaches `onSummary` at all.
- **The second status vocabulary cannot be confused with the first**, and it is a compiler, a
  component boundary and a mechanical guard rather than a convention: `Record<ScanLifecycleState, …>`,
  a separate `ScanLifecycleBadge.vue` with its own marker, and a prefix guard over the union of both
  maps' labels **and** the four computed running words, with a negative fixture that turns it red.
- **`05-UI-SPEC.md` amendments A2 and A3 shipped in the same commit as the code**, so the approved
  upstream contract never describes a build that no longer exists. A1 and A4 are deliberately absent
  — they belong to 06-12 and 06-13.

## Task Commits

1. **Task 1 (RED): the payload variant and the per-page emit** — `4ca64bf` (test)
2. **Task 1 (GREEN): one event, two payload variants, the producer's emit** — `6f6b34a` (feat)
3. **Scope addition (RED): the producer's driver** — `5297793` (test)
4. **Scope addition (GREEN): the driver — a retroactive scan now WALKS** — `d431c7a` (feat)
5. **Task 2 (RED): the lifecycle vocabulary, its badge, the prefix guard** — `1160ad7` (test)
6. **Task 2 (GREEN): the presentation map, the badge, the two missing words** — `4767d4d` (feat)
7. **Task 3 (RED): the progress store and the client routing** — `89d60b3` (test)
8. **Task 3 (GREEN): the store, the routing, and A2/A3** — `4236d00` (feat)

## Files Created/Modified

**Created**

- `packages/frontend/src/components/scan-lifecycle-presentation.ts` — `SCAN_LIFECYCLE_PRESENTATION`,
  a frozen `Readonly<Record<ScanLifecycleState, …>>`. Labels imported from `scan-contract.ts`, never
  restated; no hex literal.
- `packages/frontend/src/components/ScanLifecycleBadge.vue` — one element carrying both the tone and
  the word, marker `data-defminer-scan-lifecycle`. Does **not** widen `StatusBadge`'s prop.
- `packages/frontend/src/components/scan-lifecycle-presentation.spec.ts` — the prefix-collision guard
  and its negative fixture, plus the map's and the badge's contracts.
- `packages/frontend/src/stores/scan-progress.ts` — `useScanProgress`: the coalescer's throttle half
  and nothing else. Leading edge, imported cap, no trailing debounce, no lock, no refresh.
- `packages/frontend/src/stores/scan-progress.spec.ts` — fake timers throughout, including the
  row-selected negative.

**Modified**

- `packages/engine/src/contract.ts` — the progress variant beside the invalidation block, with the
  argument for why it is a variant and not a category written where the next author will read it.
- `packages/backend/src/api/spec.ts` — the events map widened to the union; `PluginSdk.requests`
  widened **narrowly** with `query(): ScanQuery`, not by adopting `SDK<…>` wholesale.
- `packages/backend/src/scan/producer.ts` — the per-page emit, with a project-still-current re-read
  and a swallow that states why nothing is recorded.
- `packages/backend/src/index.ts` — step 6c, the driver; `resetScanDriverForTest()` called by
  `init()` as well as by specs.
- `packages/backend/test/fixtures/fake-sdk.ts` — `requests.query()`, a page sequence, and every
  composed filter recorded.
- `packages/frontend/src/api/client.ts` — the single-subscription discriminator and dual dispatch.
- `packages/frontend/src/components/scan-contract.ts` — the backpressure sentence and the stall
  marker, the two computed running words the readout and the guard both need.
- `.planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md` — amendments A2 and A3.

## Decisions Made

- **The divergence from D-15's word "category" is stated, not smuggled.** A `scans` category added
  literally would be counted into `pending` and never applied while a row is selected — the exact
  opposite of D-15's stated intent, because both `triageLocked` early returns are checked *before*
  the debounce window. The argument is written in `contract.ts`, in `scan-progress.ts`'s header, in
  `api/spec.ts`'s events paragraph and in the amended `05-UI-SPEC.md`. The decision itself was not
  re-opened.
- **The discriminator is declared on both variants, `kind?: undefined` on the summary.** The plan's
  behaviour text asks for "a literal field present on both variants". A real tag on the summary
  would have widened the four-scalar payload UI-07 fixed, broken `index.spec.ts`'s key-set assertion
  and required editing `ingest/consumer.ts` — a file outside this plan's scope. The optional-undefined
  form gives the predicate everything it needs to narrow and changes no emitted object.
- **The producer emits through `sdk.api.send`, not an injected callback.** D-15's actual reason is
  one backend→frontend mechanism, `ingest/consumer.ts` already reaches it this way, and the SDK is
  the one route a driver cannot forget to wire. It also cost **zero churn** in `producer.spec.ts`'s
  twenty-eight existing dependency literals, because `makeFakeSdk` already records every
  `api.send`.
- **The driver is scheduled, and armed at exactly two places.** `startScan` must answer before a
  page is transferred — on this runtime a page moves every matching response body — so a walk
  started inline would hold the RPC open for the length of a backfill. It is **not** armed at
  `init()`: D-11's sweep suspends what a previous process left running and resumes nothing, and a
  boot kick would silently reverse that. It is **not** on a poll either.
- **The driver hands over the shipped queue or returns.** A fallback `new BoundedQueue(QUEUE_CAP)`
  would make D-01's watermark gate on a depth the live hook never raises — the drop-oldest defect
  back with every producer test still green. `index.spec.ts` proves the real queue is the one handed
  over by asserting the **consumer** re-reads exactly the ids the walk offered.
- **`ScanProgressPayload.analysed` is declared and emitted as `null`.** See below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Two spec files added beyond `files_modified`**

- **Found during:** Tasks 2 and 3
- **Issue:** Task 2's `<files>` named no spec file at all, yet its acceptance criteria require "the
  prefix guard's union has at least nine members and its negative fixture turns it red" — a claim
  with nowhere to live. Task 3's `<files>` named `api/client.ts` but not `api/client.spec.ts`, yet
  its behaviour list requires "a progress payload is routed to the progress store and NEVER reaches
  the coalescer's summary handler", which is a claim about `client.ts` only its spec can make.
- **Fix:** Created `packages/frontend/src/components/scan-lifecycle-presentation.spec.ts` and
  appended four routing cases to `packages/frontend/src/api/client.spec.ts`. **No production file
  outside `files_modified` was touched.**
- **Verification:** `pnpm test` green at 2830; `pnpm knip` exits 0.
- **Committed in:** `1160ad7`, `89d60b3` (WINDOWS 97)

**2. [Rule 2 - Missing critical] `ScanProgressOptions` had no cross-module consumer**

- **Found during:** Task 3 close-out
- **Issue:** `pnpm knip` exited **1** — "Unused exported types (1): ScanProgressOptions". Under
  `ignoreExportsUsedInFile: false` an export referenced only inside its own module is a gate
  failure, and WINDOWS 93's correction says to treat a non-zero knip exit as real.
- **Fix:** Annotated the spec's two options literals with `ScanProgressOptions`, which is the
  stronger form anyway: TypeScript's excess-property check now rejects an options object that grew a
  `triageLocked` or a `refresh` before the key-set assertion ever runs.
- **Verification:** `pnpm knip` exits 0 with 23 tag hints and no findings.
- **Committed in:** `4236d00`

**3. [Rule 3 - Blocking] No counter for a progress emit that throws**

- **Found during:** Task 1
- **Issue:** The first draft incremented `counters.retro.emitErrors`, which does not exist —
  `telemetry.ts` is the AST-enforced single owner of every counter in the package and is not in this
  plan's `files_modified`.
- **Fix:** The catch swallows with no counter and states why on the catch itself: the event is not
  the authoritative reader (`getScanStatus` reads the `scans` row directly and does not depend on
  the channel), so a lost payload costs at most one tick of a readout the operator can refresh, and
  the next page emits again.
- **Verification:** `producer.spec.ts#an emit that throws does not stop the walk`.
- **Committed in:** `6f6b34a` (WINDOWS 98)

---

**Total deviations:** 3 auto-fixed (1 missing-critical, 2 blocking)
**Impact on plan:** No scope creep. Two spec files and one type annotation; every production file
touched is in `files_modified` (as extended by the operator's mid-execution addition).

## Known Stubs

| Stub | File | Reason | Owner |
| --- | --- | --- | --- |
| `ScanStatusPayload.analysed` and `ScanProgressPayload.analysed` are always `null` | `packages/backend/src/index.ts`, `packages/backend/src/scan/producer.ts` | **Declined a second time, with the reason.** `analyses` rows carry no scan attribution — the key is `(project_id, sha256, detector_set_hash)` and nothing on the row says which scan offered the work. An honest count needs either a new `scans.analysed` column (another permanent step in a one-way migration) or provenance on the queue `Entry`. Neither `store/migrations.ts`, `scan/scans.ts`, `engine/queue.ts`, `ingest/consumer.ts` nor `telemetry.ts` is in this plan's `files_modified`, so wiring it would have been a Rule 4 change taken without asking. `0` would lie. | **No plan in 06-10..06-13 names any of those five files** — measured against their `files_modified`. Needs a Phase 6 gap-closure plan. WINDOWS 86 stays open; WINDOWS 94 records this re-assessment. |
| `subscribeInvalidation`'s `onScanProgress` is optional; absent, progress is dropped at the client | `packages/frontend/src/api/client.ts` | `App.vue` passes `client.subscribeInvalidation` straight to `createCoalescer`, and `App.vue` belongs to 06-13. The alternative was a store created inside the client, owned and stopped by nobody — research P-04's exact leak. The safety half does not depend on the argument. | **06-12**, which renders the readout and names `api/client.ts`. WINDOWS 95. |
| `ScanLifecycleBadge.vue` has no production renderer | `packages/frontend/src/components/ScanLifecycleBadge.vue` | The plan scoped this to the vocabulary, its map and its badge — not the surfaces that mount them. | **06-13** (toolbar indicator, D-13) and **06-12** (Scan tab body). WINDOWS 96. |

## Threat Flags

None. Every threat in the plan's register was mitigated as written:

| Threat | Disposition |
| --- | --- |
| T-06-44 (tampering, the event payload) | The progress variant is integers, one boolean, two identifiers this plugin owns and one DefMiner timestamp; asserted over the **serialised** payload so a field added later is covered without being predicted. |
| T-06-45 (tampering, durable triage state) | `coalescer.ts` byte-unchanged (`git diff --exit-code`); the payload is discriminated before `onSummary`. |
| T-06-46 (DoS, the renderer) | Leading throttle at the imported cap; twenty payloads in one simulated second produce at most the cap. |
| T-06-47 (spoofing, another project's payload) | The project-race guard on both the emit side and the store side, asserted on both. |
| T-06-48 (information disclosure, a widened contract) | A2 and A3 applied in the code's own commit. |
| T-06-49 (repudiation, two vocabularies) | The prefix guard with its negative fixture. |
| T-06-SC (package installs) | No package installed; no `package.json` dependency changed. |

## Issues Encountered

- **WINDOWS 71's brief was stale in one respect, and the correction is worth recording.** The
  executor brief said `index.ts` "still projects an unconditional `false`" for `heldAtWatermark`.
  It does not — plan 06-05 wired `isHeldAtWatermark()` and WINDOWS 66 and 73 are both `fixed`. This
  plan verified it rather than assuming either way, and added a gate: `index.spec.ts` asserts the
  value on the **wire** equals `isHeldAtWatermark()` *and* that the source contains
  `heldAtWatermark: isHeldAtWatermark()` and no `heldAtWatermark: false` literal — because an
  equality check alone passes whenever the producer happens not to be holding, which is almost
  always.
- **WINDOWS 85 did not recur and did not need fixing.** `outbound-prohibition.spec.ts` passes on the
  tree this plan started from and on the tree it ends with; `requirements.mark-complete` was not
  reached (see below), so the reflow that causes it never ran.
- **`pnpm knip` exited 1 once, mid-plan, and was treated as a real failure** per WINDOWS 93's
  correction rather than waved through as tag-hint noise. It was one genuine finding and it is
  fixed; the gate is back to exit 0 with 23 tag hints.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **06-12** (the Scan tab readout) inherits: `SCAN_LIFECYCLE_PRESENTATION` and
  `ScanLifecycleBadge.vue` to render, `useScanProgress` to mount and `stop()` on unmount, the two
  new computed words `SCAN_STATUS_WAITING_FOR_QUEUE` and `SCAN_STATUS_NOT_ADVANCING`, and the second
  argument to `subscribeInvalidation` to pass. It should also import `ARTIFACT_DEADLINE_MS` for the
  stall threshold rather than restating it — `scan-contract.ts` states the derivation on
  `SCAN_STATUS_NOT_ADVANCING` and deliberately does not declare the number.
- **06-13** inherits the badge for the toolbar indicator and owns `App.vue`, which is where
  `subscribeInvalidation`'s progress handler is finally wired end to end.
- **06-10** (the deployment matrix) can now exercise a scan that actually walks on a real instance —
  which is what turns every claim in this SUMMARY from "true of a fake SDK" into a measurement.
- **One thing to carry forward:** the driver's re-entry gap is `SCAN_DRIVER_REENTRY_MS = 250`, a
  chosen number and not a measured one. If a real backfill on 06-10's matrix shows the consumer
  starving or the driver spinning, that constant is the one to move.

---

_Phase: 06-retroactive-scan-deployment-reality_
_Completed: 2026-08-31_

## Self-Check: PASSED

Every file this SUMMARY claims was created exists on disk, and every commit hash it names is
reachable from `HEAD`:

- FOUND `packages/frontend/src/components/scan-lifecycle-presentation.ts`
- FOUND `packages/frontend/src/components/ScanLifecycleBadge.vue`
- FOUND `packages/frontend/src/components/scan-lifecycle-presentation.spec.ts`
- FOUND `packages/frontend/src/stores/scan-progress.ts`
- FOUND `packages/frontend/src/stores/scan-progress.spec.ts`
- FOUND `4ca64bf`, `6f6b34a`, `5297793`, `d431c7a`, `1160ad7`, `4767d4d`, `89d60b3`, `4236d00`

Gates at close-out: `pnpm test` **2830 passed / 68 files**, `pnpm typecheck` clean, `pnpm lint`
clean, `pnpm knip` **exit 0**, `pnpm check:bundle` (backend imports `crypto` only),
`pnpm check:css`, `pnpm check:externals` all green. `git diff --exit-code -- packages/frontend/src/stores/coalescer.ts`
reports **no diff**.
