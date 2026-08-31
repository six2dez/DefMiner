---
phase: 06-retroactive-scan-deployment-reality
plan: 08
subsystem: ui
tags: [settings, deployment, persistence, retention, sqlite, vue, deploy-02]

requires:
  - phase: 06-01
    provides: the scan surface and CONTRACT_VERSION 5, whose no-bump rule this plan applies again
  - phase: 06-05
    provides: init()'s lifecycle RPCs and D-11 startup sweep, the ordering block this plan's boot marker slots into
  - phase: 05-12
    provides: settings-contract.ts, SettingsPanel.vue, KNOWN_SETTINGS and STORAGE_NOTE — the surface this plan subtracts from
provides:
  - "DEPLOY-02 met by DELETION: no filesystem path is rendered, labelled, truncated, copied or bound into any attribute on the Settings surface"
  - "O-02's durable boot marker — an install id, a boot count and an observed-loss flag at the reserved global scope"
  - "getStorageFootprint: three row counts against their retention caps, each with an oldest-row age when knowable, plus the observed-loss flag"
  - "The two-array settings vocabulary — OPERATOR_SETTING_KEYS and INTERNAL_SETTING_KEYS — with the rendered list's key type narrowed to the operator half"
  - "The persistence sentence as an observation of the past, and a spec-held forbidden-claim list that no contract edit can satisfy"
affects: [06-09, 06-10, 06-11, 06-12, 06-13, deployment-matrix, settings-surface]

actuals:
  tokens: 25267
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A closed vocabulary split into an operator half and an internal half, where the rendered list's key TYPE is the enforcement rather than a spec assertion"
    - "Observed-persistence: a durable marker plus process-lifetime memory, so a durability claim is a fact about the past rather than a prediction"
    - "A forbidden-copy list held in the SPEC file rather than beside the copy it polices, so the assertion cannot be satisfied by editing the thing it checks"

key-files:
  created: []
  modified:
    - packages/engine/src/contract.ts
    - packages/backend/src/store/settings.ts
    - packages/backend/src/store/settings.spec.ts
    - packages/backend/src/api/spec.ts
    - packages/backend/src/index.ts
    - packages/backend/src/index.spec.ts
    - packages/frontend/src/api/client.ts
    - packages/frontend/src/api/client.spec.ts
    - packages/frontend/src/components/settings-contract.ts
    - packages/frontend/src/components/SettingsPanel.vue
    - packages/frontend/src/components/SettingsPanel.spec.ts
    - packages/frontend/src/App.vue
    - packages/frontend/src/App.spec.ts

key-decisions:
  - "DEPLOY-02 is met by removing the path renderer rather than labelling it — R5's rule survives its implementation's deletion and 05-VERIFICATION.md's behavior_unverified item is closed by deletion, not by supplying a value"
  - "The persistence sentence is an observation of the past, fed by a boot marker whose loss branch is unreachable on a first install"
  - "SETTING_KEYS becomes the union of two arrays, and KnownSetting.key narrows to OperatorSettingKey so an internal marker on the operator surface is a typecheck failure"
  - "Three internal marker keys shipped, not the two the plan named — the observed-loss flag has to be durable and two keys cannot carry it"
  - "U6-3's oldest-age clause was ADDED rather than deferred: three bounded single-row MIN reads, no PRAGMA, no bytes"
  - "CONTRACT_VERSION stays 5 — adding a name obliges no bump, and the key narrowing excludes only members introduced in the same commit"

patterns-established:
  - "Two-array closed vocabulary: SETTING_KEYS = [...OPERATOR_SETTING_KEYS, ...INTERNAL_SETTING_KEYS], with the difference being which array a key is in and the rendered list typed against the operator half"
  - "Observed rather than introspected deployment facts: write a durable marker, keep process-lifetime memory of having held it, and report a loss only when this process's own marker has disappeared"
  - "Absent-versus-zero discipline on a count surface: an unread count renders as no row, a measured zero renders as a zero, and an unavailable age ends the sentence rather than fabricating one"
  - "Spec-held prohibition lists for copy failures, so the assertion and the copy it polices cannot be edited together"

requirements-completed: [DEPLOY-02]

coverage:
  - id: D1
    description: "The Settings surface never shows a path — the renderer, its prop, its five copy constants and its left-cut helper are deleted, and the five storagePath spec cases go with them"
    requirement: DEPLOY-02
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#renders NOTHING path-shaped, in its text OR in any attribute"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#carries no title attribute anywhere on the storage section"
        status: pass
      - kind: other
        ref: "pnpm knip — no new finding against the 7ceff93 baseline, proving no export was orphaned by the deletion"
        status: pass
      - kind: other
        ref: "grep over packages/frontend/src and packages/backend/src for storagePath|storage-path|truncatePathLeft|SERVER_STORAGE_PATH|SERVER_PATH_LABEL|COPY_PATH_LABEL — no hit outside one explanatory comment"
        status: pass
    human_judgment: false
  - id: D2
    description: "STORAGE_NOTE stays byte-identical and keeps rendering unconditionally"
    requirement: DEPLOY-02
    verification:
      - kind: other
        ref: "diff of the STORAGE_NOTE declaration against 7ceff93 — identical"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#renders the storage note verbatim under one authored heading"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#renders no footprint block at all when the read FAILED"
        status: pass
    human_judgment: false
  - id: D3
    description: "The boot marker gives the persistence sentence an evidence source that cannot fire on a first install"
    requirement: DEPLOY-02
    verification:
      - kind: unit
        ref: "packages/backend/src/store/settings.spec.ts#records no loss on a FIRST boot against an empty database"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/settings.spec.ts#does NOT report a loss when a boot count is simply absent on a fresh process"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/settings.spec.ts#reports a loss when THIS process's own marker has disappeared"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/settings.spec.ts#KEEPS the loss recorded across subsequent boots of the same database"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#reports NO observed loss on a first install — the one false positive that would make the sentence untrustworthy"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#increments the boot count and keeps the install id on a SECOND init"
        status: pass
    human_judgment: false
  - id: D4
    description: "No string on the storage surface claims that data survives a restart, in either observed-loss state"
    requirement: DEPLOY-02
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#makes no persistence promise with the observed-loss flag clear"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#makes no persistence promise with the observed-loss flag set"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#renders the persistence sentence ONLY once a loss has been observed"
        status: pass
    human_judgment: false
  - id: D5
    description: "The footprint reports three row counts against their retention caps, using the already-shipped count reads — no PRAGMA, no bytes"
    requirement: DEPLOY-02
    verification:
      - kind: unit
        ref: "packages/backend/src/store/settings.spec.ts#returns three count/cap pairs from the already-shipped reads"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#answers three count/cap pairs and the flag, and NOTHING path-shaped"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#renders the three rows in the fixed order artifacts, observations, analyses"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#renders two grouped integers with the noun, in that order"
        status: pass
      - kind: other
        ref: "pnpm vitest run packages/backend/src/store/sql-discipline.spec.ts — the three new MIN statements pass the gate"
        status: pass
    human_judgment: false
  - id: D6
    description: "The count/cap/age edges: equality renders both numbers, adjacency renders distinctly, a measured zero is a zero, an unread count is an absent row, and an unavailable age is omitted rather than fabricated"
    requirement: DEPLOY-02
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#renders BOTH numbers when the count equals its cap"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#renders a count and an adjacent cap DISTINCTLY"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#renders a MEASURED ZERO as a zero"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#renders an UNREADABLE count as an absent row, never as a zero"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SettingsPanel.spec.ts#adds the age clause with agreement, and OMITS it entirely when absent"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/settings.spec.ts#returns a row ABSENT rather than zero when its count cannot be read"
        status: pass
    human_judgment: false
  - id: D7
    description: "The internal marker keys are never rendered as operator-editable settings"
    requirement: DEPLOY-02
    verification:
      - kind: unit
        ref: "packages/backend/src/store/settings.spec.ts#keeps every INTERNAL marker key OUT of the list the Settings panel renders"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/settings.spec.ts#declares SETTING_KEYS as exactly the operator keys followed by the internal ones"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/settings.spec.ts#resolves EVERY key in the closed list — internal markers included"
        status: pass
      - kind: other
        ref: "pnpm typecheck — KnownSetting.key and SettingWriteRequest.key are OperatorSettingKey, so an internal key on the rendered list does not compile"
        status: pass
    human_judgment: false
  - id: D8
    description: "The storage section's layout obligations — prose wrapping inside a section with no fixed height, no unbounded string anywhere on the surface, and footprint rows that are deliberately not a fixed-height strip"
    verification: []
    human_judgment: true
    rationale: "Wrapping behaviour and the deliberate absence of a fixed-height constraint are visual properties of a rendered page; jsdom asserts the markup and the class list but not that the result reads well at a real width. The negative half — that no unbounded string reaches this surface — is structurally true because every string is now a DefMiner-authored constant or a grouped integer, but the layout judgment itself is the operator's."

duration: 25 min
completed: 2026-08-31
status: complete
---

# Phase 06 Plan 08: The Settings Subtraction and the Storage Footprint Summary

**DEPLOY-02 made true by deleting the path machinery rather than labelling it, plus three row counts against their retention caps and the one persistence sentence the SDK can honestly support — an observation of the past, not a prediction.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-31T21:05:00Z
- **Completed:** 2026-08-31T21:30:00Z
- **Tasks:** 2 of 2
- **Files modified:** 13

## Accomplishments

- **The path renderer is gone, whole.** `SERVER_PATH_LABEL`, `COPY_PATH_LABEL`, `COPIED_LABEL`, `COPY_FAILED_LABEL`, `PATH_DISPLAY_CHARS`, `PATH_ELISION` and `truncatePathLeft` came out of `settings-contract.ts`; the `storagePath` prop, the path value element and the copy control came out of `SettingsPanel.vue`; the hardcoded null `SERVER_STORAGE_PATH` and its `:storage-path` binding came out of `App.vue`; and the five `storagePath` cases came out of `SettingsPanel.spec.ts` — **all in one commit**, because `knip` runs with `ignoreExportsUsedInFile: false` and a stranded export is a build failure rather than dead code.
- **`STORAGE_NOTE` was not touched.** Verified byte-identical against `7ceff93`. It is already D-19's sentence and it already rendered unconditionally; the only change around it is that the composed heading (`"Storage " + SERVER_PATH_LABEL`) became one authored constant.
- **Phase 5's outstanding DEPLOY-02 item is closed in the words a verifier will read.** The paragraph that replaced `SERVER_STORAGE_PATH` in `App.vue` says that the rendering-safety rule about labelling a displayed server path survives its implementation's deletion — vacuously satisfied by displaying none, binding on any later phase that displays one — and that `05-VERIFICATION.md`'s DEPLOY-02 `behavior_unverified` item is **closed by deletion, not by supplying a value**.
- **The persistence sentence has an evidence source that cannot lie on a first install.** `recordBoot` writes an install id and a boot count at the reserved global scope and reports a loss only when *this process's own* marker has disappeared from the database it wrote it to. That branch is unreachable on a first install because the in-process memory of having held a marker is `null` until one is held. A boot count going backwards cannot be the signal — the count lives in the row set that disappears — and the code says so where it decides.
- **Three counts against three caps, from the already-shipped reads.** `getStorageFootprint` composes `countArtifacts` / `countObservations` / `countAnalyses` with `getRetentionBounds`'s caps. No `PRAGMA`, no bytes. A count that throws comes back as an **absent row**, never as a zero, because a zero is what a genuinely empty project reports.
- **U6-3's `oldest {n} days` clause was added rather than deferred.** Three bounded single-row `MIN` statements, `project_id` bound first and alone in the `WHERE`, in `retention.ts`'s style. `MIN` over an empty set is SQL `NULL`, which *is* the absent case — so an empty table ends the sentence at the count instead of claiming "oldest 0 days".
- **The vocabulary now has two halves and the type enforces which is which.** `SETTING_KEYS` became `[...OPERATOR_SETTING_KEYS, ...INTERNAL_SETTING_KEYS]`; `KnownSetting.key` and the write endpoint's `key` narrowed to `OperatorSettingKey`. An internal marker reaching the operator-editable surface is now a typecheck failure rather than a rule somebody has to remember (T-06-41).
- **The copy prohibition is asserted where it cannot be edited away.** The forbidden-claim list ("survives a restart", "data is saved", …) lives in `SettingsPanel.spec.ts`, not in `settings-contract.ts`, so the only way to make it pass is to not write the sentence (T-06-43).

## Task Commits

1. **Task 1: The boot marker and the storage-footprint RPC (RED)** — `ba91046` (test)
2. **Task 1: The boot marker and the storage-footprint RPC (GREEN)** — `99dcc67` (feat)
3. **Task 2: The Settings subtraction and the footprint rows** — `1b22535` (feat) — *one commit, deletion and addition together, as the plan requires*

## Files Created/Modified

- `packages/engine/src/contract.ts` — `OPERATOR_SETTING_KEYS` / `INTERNAL_SETTING_KEYS` / `SETTING_KEYS` as their union, the three `storage.*` marker key constants, and the amended JSDoc distinguishing operator-settable keys from internal durable state
- `packages/backend/src/store/settings.ts` — `recordBoot`, `resetBootMarkerForTest`, `readObservedRestartLoss`, `readStorageFootprint`, three `MIN` statements; `KnownSetting.key` and `putBoundedSetting`'s key narrowed to `OperatorSettingKey`
- `packages/backend/src/store/settings.spec.ts` — the two-array partition, the not-in-`KNOWN_SETTINGS` assertion, the widened resolution sweep, six boot-marker cases and five footprint cases
- `packages/backend/src/api/spec.ts` — `getStorageFootprint` on the api map, `SettingWriteRequest.key` narrowed, and the recorded reasoning for *not* bumping `CONTRACT_VERSION`
- `packages/backend/src/index.ts` — step 5d writes the boot marker after migrations and before the RPC surface; `getStorageFootprint` registered on the success path only
- `packages/backend/src/index.spec.ts` — `getStorageFootprint` in `CONTRACT_ENDPOINTS`, six wiring cases, and `settingsRows()` narrowed to the operator half
- `packages/frontend/src/api/client.ts` — `FootprintRow` / `StorageFootprint` mirrors and the guarded `getStorageFootprint` call
- `packages/frontend/src/api/client.spec.ts` — the `FOOTPRINT` fixture on the literal stub surface
- `packages/frontend/src/components/settings-contract.ts` — seven path constants and the left-cut helper **deleted**; `STORAGE_HEADING`, `PERSISTENCE_OBSERVED_LOSS`, `FOOTPRINT_HEADING`, `FOOTPRINT_ROWS`, `footprintRowText`, `footprintRowId` added; `FIELD_COPY` narrowed
- `packages/frontend/src/components/SettingsPanel.vue` — the `storagePath` prop, path element and copy control **deleted**; the `loadFootprint` prop, the persistence sentence and the footprint `<dl>` added
- `packages/frontend/src/components/SettingsPanel.spec.ts` — the five `storagePath` cases **deleted**; the absence cases, the forbidden-claim cases and the footprint edge cases added
- `packages/frontend/src/App.vue` — `SERVER_STORAGE_PATH` and its binding **deleted**; `loadStorageFootprint` and the two-sentence disposition added
- `packages/frontend/src/App.spec.ts` — `getStorageFootprint` on the literal stub surface

## Decisions Made

1. **DEPLOY-02 by subtraction.** The operator cannot reach a server path — on a remote or containerised Caido there is no such file on the disk they are reading this on — and `sdk.meta.path()` carries an OS username, which is the string `telemetry.spec.ts`'s guard exists to keep off the RPC. A path here would be useless at best and identifying at worst. R5's *rule* is kept in force in the contract module's prose and binds any later phase that does display one.
2. **Observed persistence, never predicted.** Research O-02 read the complete SDK member list and found no durability signal at all, so the surface says nothing in the clear case rather than reassuring. The only sentence that renders is about something that already happened.
3. **Three internal marker keys, not two.** See deviation 1.
4. **The oldest-age read was added.** D-25 bars a *SQL-discipline exception*, not a statement that passes the gate on its own terms. Three bounded single-row `MIN` reads earn their place and the gate agrees.
5. **`CONTRACT_VERSION` stays 5.** Adding a name obliges no bump; the `key` narrowing removes only members introduced in the same commit, so no shipped reader can be holding the wider shape. The reasoning is recorded in `spec.ts` beside 06-01's and 06-05's.
6. **`<dl>` terms are genuine terms, not repeated nouns.** The first draft used an `sr-only` `<dt>` carrying the row's plural noun, which made the accessible text read "artifact rows0 of 50,000 artifact rows". The rows now carry a real term ("Scripts DefMiner has seen") against a definition (the count sentence), which is what a definition list is for and what `HealthPanel.vue` already does.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] Three internal marker keys, not the two the plan names**

- **Found during:** Task 1
- **Issue:** The plan says to add "an install-identifier key and a boot-count key". But its own behaviour contract requires that an observed loss "stays recorded across subsequent boots" — and two keys cannot carry a durable third fact. The database that lost the marker is the same database the flag would have to live in, so the flag needs its own row.
- **Fix:** Shipped `STORAGE_OBSERVED_LOSS_KEY` as a third member of `INTERNAL_SETTING_KEYS`. The acceptance criterion is satisfied as a **superset**: `SETTING_KEYS` contains the two named marker keys, and `KNOWN_SETTINGS` contains none of the three.
- **Files modified:** `packages/engine/src/contract.ts`, `packages/backend/src/store/settings.ts`
- **Verification:** `settings.spec.ts` asserts the partition in both directions and that the flag survives a later boot of the same database.
- **Committed in:** `99dcc67`

**2. [Rule 3 - Blocking] `FIELD_COPY`'s `Record` narrowed inside Task 1's commit**

- **Found during:** Task 1
- **Issue:** `FIELD_COPY: Record<SettingKey, FieldCopy>` is exhaustive over the closed key list. Adding members to `SETTING_KEYS` broke `pnpm typecheck`, which is Task 1's own `<verify>` gate. The alternative was authoring operator-facing copy for three internal marker keys — the exact failure the key split exists to prevent.
- **Fix:** Narrowed to `Record<OperatorSettingKey, FieldCopy>` and amended the two doc paragraphs that describe the growth mechanism. `settings-contract.ts` is a Task 2 file, so this is a deviation — but **only the type and its prose moved in Task 1**. The five path constants and `truncatePathLeft` stayed whole and came out in Task 2's single commit, so the deletion set was **not** split.
- **Files modified:** `packages/frontend/src/components/settings-contract.ts`, `packages/frontend/src/components/SettingsPanel.spec.ts`
- **Verification:** `pnpm typecheck` clean at `99dcc67`; `git show 99dcc67 -- packages/frontend/src/components/settings-contract.ts` contains no deletion of a path constant.
- **Committed in:** `99dcc67`

**3. [Rule 1 - Bug] `settingsRows()` counted the boot marker and broke three shipped scoping assertions**

- **Found during:** Task 1
- **Issue:** Three `index.spec.ts` cases counted **every** row on the `settings` table to prove a claim about what a settings *write* did — "the caller's `projectId` was discarded", "a project-scoped write with no project stored nothing". `init()` now writes the boot marker at the reserved global scope on every boot, so an unrelated feature decided whether a scoping assertion passed.
- **Fix:** `settingsRows()` filters over `INTERNAL_SETTING_KEYS`, so a marker key added later is excluded by the closed vocabulary rather than by a remembered string. The scoping claims are unchanged and still red if the scoping breaks.
- **Files modified:** `packages/backend/src/index.spec.ts`
- **Verification:** the three cases pass; removing the filter reproduces the failure.
- **Committed in:** `99dcc67`

**4. [Rule 3 - Blocking] `BootMarker` un-exported**

- **Found during:** Task 1
- **Issue:** `pnpm knip` reported one **new** finding: `BootMarker` exported but consumed only inside its own file, which `ignoreExportsUsedInFile: false` rejects.
- **Fix:** Dropped the `export`; `recordBoot`'s return type is inferred at the one call site. Knip returned to its exact baseline output.
- **Files modified:** `packages/backend/src/store/settings.ts`
- **Verification:** `diff` of `pnpm knip` output against a `git stash` baseline — identical.
- **Committed in:** `99dcc67`

**5. [Rule 2 - Missing critical] `readObservedRestartLoss` added so the no-project path answers without a cache**

- **Found during:** Task 1
- **Issue:** With no project resolved, the footprint has no counts to report — but the loss flag is a fact about the *database*, stored at the global scope, and is knowable exactly then. The first draft cached it in an `index.ts` module variable, which is a second reader of one fact and would report what was true at boot rather than what is true now (and `index.ts` has no test-reset seam, so it would also have contaminated cases across the file).
- **Fix:** A separate exported read, called on the no-project branch. No module state added to `index.ts`.
- **Files modified:** `packages/backend/src/store/settings.ts`, `packages/backend/src/index.ts`
- **Verification:** `index.spec.ts#fails closed with an EXPLICIT absence when no project is resolved`.
- **Committed in:** `99dcc67`

**6. [Rule 3 - Blocking] Two stub surfaces outside `files_modified`**

- **Found during:** Task 2
- **Issue:** `App.spec.ts` and `api/client.spec.ts` build their fake backend on the **literal** `DefMinerBackendSdk` surface rather than through a cast — deliberately, per `client.spec.ts`'s own header: "a stub that has to be cast is a stub that stops failing when the real surface changes". Adding `getStorageFootprint` to the contract therefore broke both by design.
- **Fix:** Added the endpoint to both stubs with a three-readable-zero-rows fixture and a clear flag. Also added `FootprintRow` / `StorageFootprint` to `api/client.ts`, which `files_modified` does not name but which the panel cannot be typed against otherwise.
- **Files modified:** `packages/frontend/src/App.spec.ts`, `packages/frontend/src/api/client.spec.ts`, `packages/frontend/src/api/client.ts`
- **Verification:** `pnpm typecheck` clean; both suites pass.
- **Committed in:** `1b22535`

**7. [Rule 1 - Bug] The `<dl>` term duplicated the row's noun**

- **Found during:** Task 2
- **Issue:** An `sr-only` `<dt>` carrying the plural noun made the row's accessible text read "artifact rows0 of 50,000 artifact rows" — one string said twice, and the same defect a sighted reader would never see.
- **Fix:** `FootprintRowCopy` gained a `term`, so each row is a genuine term/definition pair in `HealthPanel.vue`'s idiom. Assertions target the `<dd>`.
- **Files modified:** `packages/frontend/src/components/settings-contract.ts`, `packages/frontend/src/components/SettingsPanel.vue`, `packages/frontend/src/components/SettingsPanel.spec.ts`
- **Verification:** the seven footprint cases assert exact `<dd>` strings.
- **Committed in:** `1b22535`

**8. [Rule 1 - Bug] `requirements.mark-complete` re-broke the derived residual block (WINDOWS 85, recurrence)**

- **Found during:** close-out
- **Issue:** Exactly as the carry-forward brief predicted. Marking DEPLOY-02 complete reflowed `.planning/REQUIREMENTS.md` and re-inserted the **same three blank lines** — after "DECLARATION THE TWO READERS RESOLVE THEIR OWN PATHS FROM:", around the two-file list, and before "1. Each entry below is verified by EXECUTION". `outbound-prohibition.spec.ts`'s byte-compare went red.
- **Fix:** Deleted the three blank lines. **The generated text is authoritative and the comparison was never touched.** The final `REQUIREMENTS.md` diff for this plan is one character: DEPLOY-02's checkbox.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** `pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts` — 460 passed; `git diff` shows only the checkbox line.
- **Committed in:** the plan metadata commit

---

**Total deviations:** 8 auto-fixed (3 × Rule 1 bug, 2 × Rule 2 missing critical, 3 × Rule 3 blocking)
**Impact on plan:** No scope creep. Deviations 2 and 6 touch files the plan's `files_modified` does not name, and both are named above with the gate that forced them. The one constraint the plan states most emphatically — that the deletion set lands in a single commit — was held: `1b22535` carries every deleted symbol and every added one, and `pnpm knip` is green against its baseline after it.

## Issues Encountered

- **`pnpm knip` exits 1 at baseline and still does.** On a clean tree at `7ceff93` it reports 22 "Tag hints" — `@internal` JSDoc tags across ten backend modules. `06-CONTEXT.md`'s deferred list already names removing them as out of scope. The acceptance criterion "`pnpm knip` is clean" was therefore read as "**no new** knip finding", and verified by diffing the output against a `git stash` baseline. One new finding did appear mid-plan and was fixed (deviation 4). Recorded in the ledger.
- Everything else in the plan's `<verification>` block ran and passed: full suite, typecheck, lint, `check:bundle`, `check:css`, `check:externals`, and `caido-dev build packages`.

## Known Stubs

None. No hardcoded empty value, placeholder string, TODO or unwired data source was introduced. The one deliberately-absent thing on this surface — the persistence sentence when no loss has been observed — is a specified state (U6-2), asserted as its own case, and its absence is the honest reading of "no evidence" rather than an unfinished branch.

## Threat Flags

None. The plan's `<threat_model>` covers every surface this plan touched, and no new network endpoint, auth path, file access pattern or trust-boundary schema change was introduced. `T-06-PATH-LEAK` is mitigated by removing the leak's only renderer; `T-06-41` is now structural (a type) rather than assertion-only, which is stronger than the register asked for.

## Verification Results

| Gate | Result |
|---|---|
| `pnpm test` | 66 files, **2780 passed** (baseline 2751 + 29 new) |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0, no warnings |
| `pnpm knip` | identical to the `7ceff93` baseline — no new finding |
| `pnpm exec caido-dev build packages` | built, packaged |
| `pnpm check:bundle` | exit 0 — 1 specifier (`crypto`), unchanged |
| `pnpm check:externals` | exit 0 — 1 bare specifier (`vue`), unchanged |
| `pnpm check:css` | exit 0 — 118 rules against `#plugin--defminer` |
| `packages/frontend/package.json` dependencies | byte-unchanged (`git diff --stat` empty) |
| `STORAGE_NOTE` | byte-identical to `7ceff93` |
| `telemetry.spec.ts` username-in-path guard | 62 passed |
| `outbound-prohibition.spec.ts` | 460 passed (after deviation 8's fix) |

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

DEPLOY-02 is checked off in `REQUIREMENTS.md`. Plan 06-09 is next and inherits two named obligations from earlier plans, **neither touched here**: the producer driver's missing caller, and `ScanStatusPayload.analysed` still returning `null` (WINDOWS 65 / 86).

Two things this plan leaves for the DEPLOY-01 matrix (06-10/06-11) to exercise rather than assume:

- The Docker-without-a-volume leg is the one deployment shape where the boot marker's loss branch can fire against a real wipe. In this repository it is proven against a deleted row set, which is the same condition by construction — but the leg is where it becomes an observed fact about a real container.
- `recordBoot`'s honest horizon is the database's own lifetime. On a deployment that keeps nothing, the loss flag goes with the next wipe and the surface falls silent again rather than repeating a claim it can no longer support. That is intended, and the matrix is where it will be visible.

## Self-Check: PASSED

All 13 modified source files and the SUMMARY exist on disk. All four commits
(`ba91046`, `99dcc67`, `1b22535`, `59e026d`) are reachable in `git log --all`.
The working tree is clean. `pnpm test` is GREEN at close-out (66 files, 2780
passed), including `outbound-prohibition.spec.ts` after deviation 8's fix.
