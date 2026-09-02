---
phase: 07-sourcemap-reconstruction
plan: 10
subsystem: ui
tags:
  [
    vue,
    export,
    redaction-ceremony,
    telemetry,
    health-surface,
    design-contract,
    requirements-amendment,
    phase-closeout,
  ]

requires:
  - phase: 07-sourcemap-reconstruction
    provides: "07-09's SourceBrowser.vue drill-down header, its `export-manifest` emit and the declared wiring gap (ledger 117)"
  - phase: 07-sourcemap-reconstruction
    provides: "07-06's third `EXPORT_COLUMNS` entry, `ExportChunkRequest.scopeSha256`, and `EXPORT_TABLES`'s third member"
  - phase: 07-sourcemap-reconstruction
    provides: "07-05's `sourcemap:` telemetry sub-map — D-03's `announcedExternal` counter and its five siblings"
  - phase: 07-sourcemap-reconstruction
    provides: "07-08's R6 content-addressed download name, carried upstream here as amendment A7"
  - phase: 05-workspace-operator-workflow
    provides: "ExportDialog.vue's whole ceremony — redacted pre-selected, raw behind a second deliberate act, no remember-this-choice — and `export-contract.ts`'s copy module"
provides:
  - "`EXPORT_MANIFEST_CTA` and `EXPORT_DIALOG_HEADINGS` — U7-3's heading keyed on the export table, so a fourth table cannot ship headless"
  - "The drill-down's scoped manifest CTA, wired to the SHIPPED dialog with the sources table — Named Conflict 1 resolved with the toolbar CTA and `exportTable` byte-unchanged"
  - "`SourcemapHealth` on `HealthPayload`, and six labelled reconstruction rows on the health surface including D-03's `announcedExternal`"
  - "05-UI-SPEC.md amendments A5, A6 and A7, plus the three items recorded as NOT amendments"
  - "ROADMAP.md's amended Phase 7 entry — the divergence paragraph, SC1 restated, SC3/SC5/SC6 annotated"
  - "REQUIREMENTS.md's amended MAP-02 and MAP-04 parentheticals and MAP-01's two-halves sentence, each dated, each preserving its original"
  - "The four paragraphs owed to `07-VERIFICATION.md`, verbatim under a liftable heading"
affects: [phase-verification, phase-08-external-maps, phase-02-observability]

# Actuals (#2632). chars/4 over the REALIZED DIFF — 75,879 added characters
# across the eighteen changed files, measured against `895c271` (07-09's last
# commit, this plan's true parent) rather than against `main`. A `main` baseline
# would have swept in every earlier phase-7 edit to App.vue, client.ts and
# spec.ts and measured other plans' work as this one's.
actuals:
  tokens: 18969
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A copy `Record` keyed on a CLOSED CONTRACT LIST rather than a prop: an incomplete record is a typecheck failure, so a fourth export table cannot ship without a heading. The property stops depending on every caller's discipline."
    - "One mechanism, two entry points, and the heading is the discriminator — a second CTA that opens the SAME dialog with a different table argument, rather than a second dialog"
    - "A scope carried as the DISCRIMINATOR: `exportScope === null` means the toolbar opened it, so the dialog's table and reachable count are DERIVED rather than set, and two flags for one fact cannot come to disagree"
    - "A non-vacuous repository scan that counts the SENTENCE rather than the constant name, with comment lines excluded — a fork does not have to reuse the identifier, and it is the sentence that would drift"
    - "A recursive leaf walk for a negative shape assertion: `every value is a number` at ONE level passes the day somebody nests a string one level down"
    - "A restatement that PRESERVES the original as dated history rather than deleting it, so a correction is auditable and the record is not falsified"

key-files:
  created:
    - .planning/phases/07-sourcemap-reconstruction/07-10-SUMMARY.md
  modified:
    - packages/frontend/src/components/export-contract.ts
    - packages/frontend/src/components/ExportDialog.vue
    - packages/frontend/src/components/ExportDialog.spec.ts
    - packages/frontend/src/components/SourceBrowser.vue
    - packages/frontend/src/components/SourceBrowser.spec.ts
    - packages/frontend/src/components/HealthPanel.vue
    - packages/frontend/src/components/HealthPanel.spec.ts
    - packages/frontend/src/components/health-contract.ts
    - packages/frontend/src/App.vue
    - packages/frontend/src/App.spec.ts
    - packages/frontend/src/api/client.ts
    - packages/frontend/src/api/client.spec.ts
    - packages/backend/src/api/spec.ts
    - packages/backend/src/index.ts
    - packages/backend/src/index.spec.ts
    - .planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "P7-D10-1 — `canExport` is DELETED, not flipped to `true`. Ledger 117 predicted 07-10 would 'flip one boolean'; flipping it would have left a permanently-true prop and an unreachable `false` branch that still needed a label — which is the transitional constant the ledger required deleted, kept alive by a different route. Removing the prop deletes the stub AND the boolean it existed for, and it costs nothing: `SourceBrowser` only renders when `client !== null`, so there was never a second reason the CTA could be unavailable."
  - "P7-D10-2 — The export dialog's table is DERIVED from the scope, not set beside it. `exportDialogTable = exportScope === null ? exportTable : 'sources'` reads the shipped computation rather than replacing it, so `exportTable` stays byte-unchanged AND there is no second flag that could disagree with the scope about which table is leaving. `closeExport` and `openExport` both clear the scope, so a manifest scope cannot survive into a toolbar export."
  - "P7-D10-3 — The row count RIDES THE EVENT (`export-manifest: [rows: number]`) instead of the page re-counting. The drill-down already drew the whole bounded list to answer its own header; a second count is a second claim about one set, and the dialog would then disable against a number the button was not enabled against."
  - "P7-D10-4 — The six reconstruction counters are ROWS BELOW the strip, not six more strip cells. `overflow / health-strip` requires a height that comes from one utility and that no counter ever wraps; six labels this long on one `h-12` line would either wrap the strip — breaking the contract it turns on — or clip them. Asserted by containment (`strip.contains(row)` is false for all six) rather than described."
  - "P7-D10-5 — `HealthPayload` gained a NESTED sub-object of six integers rather than six flat fields. Flat would have been less code and would have quietly widened the type whose docblock says 'four numbers and nothing else'; nested keeps the strip's four separable from Phase 7's six, and keeps the no-string property provable by a recursive leaf walk rather than by a one-level `Object.values`."
  - "P7-D10-6 — CONTRACT_VERSION stays at 6, recorded as a RULE APPLICATION rather than an omission. A response widening with no union and no discriminant cannot be misread by a stale reader — it reads the four fields it knows — and 6 was bumped by 07-06 in this same phase, so no shipped bundle has seen the narrower `HealthPayload`. The reasoning is written into the constant's own docblock beside the five bumps before it."
  - "P7-D10-7 — The false parentheticals are AMENDED WITH THEIR ORIGINALS PRESERVED VERBATIM, not replaced. A gate demanding the old text be gone would have ordered the executor to falsify the record; the value of the correction is that a reader can see what was believed and what replaced it."

patterns-established:
  - "Sentence-level duplication scanning: count the STRING a fork would copy, not the identifier it might not, and exclude prose lines so a comment that quotes a constant is not read as a second copy of it"
  - "Negative shape assertions recurse: `Object.keys(...)` equality at the top level plus a recursive leaf-type walk, so a nested string cannot enter through a sub-object the top-level check approves"
  - "A design-contract amendment is applied to the upstream document IN THE SAME COMMIT as the code that depends on it, so the approved contract never describes a build that no longer exists"

requirements-completed: [MAP-07, UI-05]

coverage:
  - id: D1
    description: "U7-3 — the export dialog's heading names what the CTA named, at BOTH entry points, through a Record keyed on the closed export-table list"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#keeps the two SHIPPED entries byte-identical to the string that shipped"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#covers EVERY member of the contract's table list — a fourth cannot ship headless"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#renders the INVENTORY heading when the toolbar opened it"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#renders the MANIFEST heading when the drill-down opened it"
        status: pass
    human_judgment: false
  - id: D2
    description: "Named Conflict 1 — the manifest's scoped CTA opens the SHIPPED dialog with the sources table, and the toolbar CTA plus `exportTable` are byte-unchanged"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#opens the SHIPPED dialog from the scoped CTA, headed for the MANIFEST"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#sends the SOURCES table scoped to the browsed artifact, redacted"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#leaves the toolbar's Export CTA exactly where and what it was"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#leaves the toolbar CTA's label exactly as it shipped"
        status: pass
      - kind: other
        ref: "git diff 895c271..HEAD -- packages/frontend/src/App.vue — the `exportTable` computed shows no changed line"
        status: pass
    human_judgment: false
  - id: D3
    description: "T-07-46 — the raw-export ceremony is declared exactly once and its four sentences written in exactly one file, over a non-vacuous scan"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#declares each of the four constants exactly once, over a NON-VACUOUS scan"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#writes each of the four SENTENCES in exactly one file — no second copy to drift"
        status: pass
    human_judgment: false
  - id: D4
    description: "UI Considerations / manifest-export — the five state rows: empty, loading, error, zero-one-many, long-text"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#disables the action with the SHIPPED nothing-to-export label and produces no file"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#renders the SHIPPED exporting label and mounts no progress element"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#renders the SHIPPED failure body, and that body denies a file"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#agrees between the body and the button at ONE and at MANY"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#renders NOTHING outside the union of the authored constants"
        status: pass
    human_judgment: false
  - id: D5
    description: "MAP-07 / concurrency — the dialog is single-instance and its in-flight state names its own table"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#keeps the manifest heading for the whole life of a manifest export"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#keeps the inventory heading for the whole life of an inventory export"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/App.spec.ts#returns the TOOLBAR's CTA to the inventory after a manifest export"
        status: pass
    human_judgment: false
  - id: D6
    description: "Ledger 117 closed — the CTA is wired and enabled, and the transitional copy constant is DELETED rather than repurposed"
    requirement: "UI-05"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#names the CTA and ENABLES it once rows ARE known"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#emits export-manifest WITH THE COUNT, and only once rows are known"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/SourceBrowser.spec.ts#emits NOTHING from a resolved zero — the guard is at the handler too"
        status: pass
      - kind: other
        ref: "grep -c 'not available in this build' packages/frontend/src — 0 matches; the constant and the `canExport` prop are both gone"
        status: pass
    human_judgment: false
  - id: D7
    description: "D-03's counter surfaced — six reconstruction rows, the external row labelled as a measurement and given no degradation tone"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/HealthPanel.spec.ts#renders SIX rows, each with its label, its grouped value and its help"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/HealthPanel.spec.ts#names D-03's row so it reads as a MEASUREMENT, not as a failure"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/HealthPanel.spec.ts#gives D-03's row NO degradation tone — not danger, not info, not a role"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#projects D-03's external-announcement counter onto the health shape"
        status: pass
    human_judgment: false
  - id: D8
    description: "The still-resolving rule reaches the new rows unchanged — an unresolved, failed or unavailable read renders them ABSENT, never as zeroes"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/HealthPanel.spec.ts#renders the rows as ABSENT while the read has not answered — never as zeroes"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/HealthPanel.spec.ts#renders the rows as ABSENT on a FAILED read and on `unavailable`"
        status: pass
    human_judgment: false
  - id: D9
    description: "The health payload still carries no string at any depth, and the reconstruction rows render only DefMiner-authored copy"
    requirement: "MAP-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#answers the counters and NOTHING else — no string reaches this shape"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/HealthPanel.spec.ts#carries NO string from the payload — the rows are integers and copy only"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/HealthPanel.spec.ts#keeps the reconstruction rows OUT of the fixed-height strip"
        status: pass
    human_judgment: false
  - id: D10
    description: "05-UI-SPEC.md amendments A5, A6 and A7 applied with scoped edits, plus the three items recorded as NOT amendments"
    requirement: "UI-05"
    verification:
      - kind: other
        ref: "grep -c 'ANALYSIS-STATE degraded marker' .planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md — 1"
        status: pass
      - kind: other
        ref: "grep -c 'never become filenames' .planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md — 1; the R-series is contiguous R1→R6"
        status: pass
      - kind: other
        ref: "grep -c 'TABLE_ROW_HEIGHT_PX' → 2 and 'SOURCE_LINE_HEIGHT_PX' → 1 in 05-UI-SPEC.md; the 32px and 24px usage entries both name their constant"
        status: pass
      - kind: other
        ref: "git diff --stat 05-UI-SPEC.md — 74 insertions(+), 3 deletions(-), consistent with three scoped edits and no rewrite"
        status: pass
    human_judgment: false
  - id: D11
    description: "The ROADMAP describes what shipped: the divergence paragraph, SC1 restated against the measurement, SC3/SC5/SC6 annotated rather than deleted"
    requirement: "UI-05"
    verification:
      - kind: other
        ref: "git diff --stat .planning/ROADMAP.md — 15 insertions(+), 4 deletions(-); the Phase 7 entry lists nine plans with their waves and both retired titles with their reasons"
        status: pass
      - kind: other
        ref: "The restated SC1 names MAP_MAX_BYTES, MAX_SYNC_SLICE_MS and ARTIFACT_DEADLINE_MS and no longer says 'the Phase 0 budget'"
        status: pass
    human_judgment: false
  - id: D12
    description: "Both false parentheticals amended and both originals preserved as dated history; MAP-01 carries the two-halves sentence"
    requirement: "MAP-07"
    verification:
      - kind: other
        ref: "grep -c 'quickjs-ng' .planning/REQUIREMENTS.md — 2, in MAP-02's amended parenthetical"
        status: pass
      - kind: other
        ref: "grep finds BOTH the old wording ('Measured: 781 sources … 21 ms', 'llrt/fs` has no `realpath` and no `lstat') and the new; each amendment carries its date and this plan's id"
        status: pass
      - kind: other
        ref: "grep -c 'D-03 `announcedExternal` counter' .planning/REQUIREMENTS.md — 1, in MAP-01's two-halves sentence naming Phase 8"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts — 465 passed; the machine-owned DERIVED RESIDUAL span is byte-identical to the generator's output"
        status: pass
    human_judgment: false

duration: 42min
completed: 2026-09-02
status: complete
---

# Phase 7 Plan 10: Phase Close-Out Summary

**The manifest got its own scoped CTA and its own dialog heading without a second export mechanism, D-03's counter went on screen as the number that answers Open Question 2, and three documents stopped describing a build that no longer exists.**

## Performance

- **Duration:** 42 min
- **Started:** 2026-09-02T05:20Z
- **Completed:** 2026-09-02T06:02Z
- **Tasks:** 3 of 3
- **Files modified:** 18 (17 modified, 1 created)

## Accomplishments

- **UI-SPEC Named Conflict 1 is resolved and the divergence is stated in its own terms.** The toolbar's `Export inventory` CTA cannot address the drill-down, because `exportTable` is computed from `activeTab` and the drill-down is a STATE within the Artifacts tab — so the toolbar CTA opened from that screen would export the artifacts inventory from a page showing sources. The manifest got its own scoped `Export source manifest` CTA in the drill-down header, opening the **same** dialog with the sources table. One export mechanism, one redaction ceremony, one destructive confirmation, two places to start it, and each names what it will export.
- **U7-3 is satisfied at both entry points.** `EXPORT_DIALOG_HEADINGS` is a `Record` keyed on the engine contract's `ExportTable`, so a fourth export table is a typecheck failure rather than a blank `<h2>`. The two shipped entries are byte-identical to the string that shipped — this is a widening, not a rewording.
- **Ledger entry 117 is closed and its transitional constant is deleted.** `canExport` went with it: flipping it to `true` would have left an unreachable branch that still needed the label the ledger required removed.
- **D-03's `announcedExternal` counter is on screen**, with five siblings, labelled as a measurement rather than a fault and given no degradation tone at all — asserted by class equality against a sibling row, not by inspection.
- **Three documents were brought level with the build:** `05-UI-SPEC.md` (A5, A6, A7 plus three recorded not-amendments), `ROADMAP.md` (the divergence, SC1 restated, SC3/SC5/SC6 annotated), and `REQUIREMENTS.md` (two false parentheticals amended with their originals preserved, MAP-01's two halves recorded).
- **MAP-07 and UI-05 are ticked**, after `requirements ready-ids` confirmed every declaring plan had shipped. MAP-05 was left open — it is not this plan's.

## Task Commits

1. **Task 1 (TRACER): the scoped CTA, one dialog, one ceremony, and a heading that names its table** — `91d648f` (feat)
2. **Task 2: surface the D-03 counter, and apply the three upstream contract amendments** — `ae93c24` (feat)
3. **Task 3: amend the roadmap and the two false parentheticals** — `b4f6159` (docs)

**Plan metadata:** see the final `docs(07-10)` commit.

## The tracer feedback gate

Task 1 is a `type="tracer"` task, and its gate ran before any expansion task began. Auto mode was active (`workflow.auto_advance: true`, `human_verify_mode: end-of-phase`, both `<verify>` clauses fully automated), so the gate re-ran the tracer's verification end-to-end rather than stopping for a human:

- `pnpm vitest run ExportDialog.spec.ts SourceBrowser.spec.ts store/export.spec.ts` — **3 files, 179 tests, all passed**
- `pnpm exec caido-dev build packages && pnpm typecheck && pnpm lint && pnpm check:externals` — **exit 0**, one bare specifier (`vue`), correct

Both passed, so the tracer was verified end-to-end and Tasks 2 and 3 proceeded. Nothing was expanded onto an unproven slice.

## Files Created/Modified

- `packages/frontend/src/components/export-contract.ts` — `EXPORT_MANIFEST_CTA` and `EXPORT_DIALOG_HEADINGS`; the single heading constant is replaced by a table-keyed record
- `packages/frontend/src/components/ExportDialog.vue` — `table` widened to `ExportTable`, `scopeSha256` forwarded, heading read through the record. The ceremony is untouched
- `packages/frontend/src/components/SourceBrowser.vue` — the CTA wired; `canExport` and the transitional label deleted; the emit carries the row count
- `packages/frontend/src/App.vue` — `exportScope` / `exportScopeRows` and two derived computeds. `exportTable` and the toolbar CTA are byte-unchanged
- `packages/frontend/src/components/health-contract.ts` — `SOURCEMAP_COUNTERS`, `SOURCEMAP_HEADING`, `SOURCEMAP_PURPOSE`, and the `StripCounterId` split
- `packages/frontend/src/components/HealthPanel.vue` — the reconstruction block, under the same `v-if` the strip is
- `packages/frontend/src/api/client.ts` — `SourcemapHealthCounters`, mirrored from the backend contract
- `packages/backend/src/api/spec.ts` — `SourcemapHealth`, the `HealthPayload` field, and the not-bumped `CONTRACT_VERSION` reasoning
- `packages/backend/src/index.ts` — `getHealth` projects the sub-map field by field, annotated `satisfies SourcemapHealth`
- `.planning/phases/05-workspace-operator-workflow/05-UI-SPEC.md` — A5, A6, A7, and the three not-amendments
- `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` — the amendments described above

## The two diff stat lines for the planning documents

Recorded here because the plan's acceptance criteria ask for them exactly, as evidence that the edits were scoped and no file was rewritten:

```
 .../05-workspace-operator-workflow/05-UI-SPEC.md   | 77 +++++++++++++++++++++-
 1 file changed, 74 insertions(+), 3 deletions(-)

 .planning/REQUIREMENTS.md | 10 +++++-----
 .planning/ROADMAP.md      | 19 +++++++++++++++----
 2 files changed, 20 insertions(+), 9 deletions(-)
```

Three deletions in a 600-line design contract and three in a 1,017-line requirements ledger is what three scoped replacements look like. `REQUIREMENTS.md`'s five-line churn is three amended requirement lines plus the two checkbox ticks.

## The non-vacuity report from the raw-constant scan

The scan walks `packages/frontend/src` recursively for `.ts` and `.vue` files and asserts each of the four raw-confirmation constants is declared exactly once and its sentence written in exactly one file. The report, printed by the assertions themselves:

- **Files scanned: 69** (asserted `> 40`, and asserted to contain `packages/frontend/src/components/export-contract.ts` by name — a scan that walked nothing would otherwise report "declared once" for a constant that does not exist)
- `RAW_EXPORT_CONFIRM_HEADING` — 1 declaration, 1 file carries the sentence
- `RAW_EXPORT_CONFIRM_BODY_TEMPLATE` — 1 declaration, 1 file carries the sentence
- `RAW_EXPORT_CONFIRM_LABEL_TEMPLATE` — 1 declaration, 1 file carries the sentence
- `RAW_EXPORT_ESCAPE_LABEL` — 1 declaration, 1 file carries the sentence

All four resolve to `packages/frontend/src/components/export-contract.ts` and nothing else.

**One refinement the scan needed, recorded because it is the kind of thing that gets quietly loosened.** The sentence-level half fired on `ExportDialog.vue`, whose shipped header comment QUOTES `"Export redacted instead"` while explaining what may write `mode`. Prose that quotes a sentence is not a second copy of it — a copy is what a template renders — so the scan excludes lines whose first non-space characters are `//`, `*` or `/*`. The exclusion is that narrow deliberately: a comment-stripping parser would have been a second thing to get wrong, and a rule that asked whether an occurrence "looked like" a fork would be a rule somebody argues with.

## The four paragraphs owed to `07-VERIFICATION.md`

**Written here verbatim, under a heading `07-VERIFICATION.md` can lift without re-deriving them.** Two are carried forward from upstream plans that wrote them and named this plan as the carrier; two are this plan's own.

### 1. The O-07 pre-emption (written in plan 07-04, carried here)

> **The O-07 pre-emption, owed by UI-SPEC Named Conflict 2 and repeated here so `07-10` can carry it forward:** D-11 already ships a slice of ERR-02/OBS-02 ahead of Phase 2, and defining a producibility axis WIDENS that pre-emption. Phase 7 defines an axis OBS-02 does not yet own. If Phase 2 rules that producibility belongs inside one vocabulary, **this column is what changes**, and the change is bounded: a `migrations.ts` forward step plus one presentation map. Recording it here is the honest form; discovering it in a Phase 2 review is not.

### 2. The D-11 pre-emption (written in plan 07-05, carried here)

> **D-11 ships a slice of ERR-02/OBS-02 ahead of Phase 2, and the cost is accepted openly.** Phase 7 is the first writer of a non-null `analyses.error` from the consumer path — Phase 1 always passed null — and it reuses the ONE degradation vocabulary in the one place that already has it rather than inventing a second. `scan_state = 'partial'` had exactly one producer until now, deadline expiry, and reconstruction gives it more; `error` is the discriminator, and what goes in it is a DefMiner-authored REASON CODE (`map:malformed_json`, `map:too_large`, …), never a caught exception's text. `describeError` is the right function for a *diagnostic* and is deliberately not on this path.
>
> **The cost, stated before anyone hits it.** One `scan_state` column cannot express *"reconstruction failed but detection succeeded"*. Today that costs nothing, because no detector exists — Phase 3 has not landed and `visit` is a no-op. The day it does, an artifact whose detectors ran cleanly and whose map was refused will read `partial`, and an operator reading the Artifacts table will not be able to tell that from an artifact whose walk hit the deadline without opening the `error` column. **Phase 3 inherits that knowingly.** The exit is already visible and is not being pre-built: either ERR-02 splits the state per stage, or the UI reads the `map:` prefix — which is why the codes are namespaced at the point of writing rather than left bare.

### 3. D-15, recorded NOT MEASURED with its reason

> **D-15 is met in its first half and NOT MEASURED in its second, and the distinction is recorded rather than passed over.** The reconstructed-source corpus FIXTURES ship. The false-positive RATE does not, and the reason is structural rather than a matter of effort: **a false-positive rate cannot exist without a detector, and none exists.** Phase 3 has not landed and `visit` is a no-op, so there is nothing that could produce a positive, true or false, over the corpus. Measuring anything here would mean inventing a detector for the purpose of measuring it, which measures the measurement.
>
> This is recorded the way Phase 6's D-23 recorded an unreachable matrix leg — **named, with its reason, and never as a silent pass.** A criterion that reads as met because nothing contradicted it is the specific failure both records exist to prevent. Phase 3 owns the rate, and it inherits fixtures that were built for it rather than a criterion somebody already ticked.

### 4. Open Question 2 — a low recovered-source count is the EXPECTED outcome

> **A low recovered-source count on real traffic is an EXPECTED outcome, not a defect, and the phase says so before anybody has to ask.** Zero of the eight pinned production bundles in this repository's corpus carries an inline map; the three that announce a sourcemap at all announce an *external* `.map`. Inline maps are overwhelmingly a development artifact, and under D-01 DefMiner never fetches an external one — that would be a request the target can see, and DefMiner stays silent. So on the committed real-world corpus this phase recovers **zero** sources and takes **eight** D-03 counter increments, and that is the design working rather than failing.
>
> **The D-03 `announcedExternal` counter is the MEASUREMENT of how much of MAP-01 this phase leaves on the table for Phase 8**, which is exactly why plan 07-10 surfaced it on the health panel rather than leaving it internal. An operator who sees `Sources recovered: 0` beside `External maps announced: 8` can read the second number and understand the first. The surface says it in words too, next to the numbers: *"DefMiner recovers source only from sourcemaps embedded in a bundle it already has. It never fetches a .map file — that would be a request the target can see. A low recovered count beside a high external count is the expected result on production traffic, not a fault."* A verifier measuring this phase against real traffic should read a low recovered count as confirmation, and should treat a *high* one as the thing worth a second look.

## The three carried-forward Phase 6 conditions, named as untouched

The plan's prohibitions forbid opportunistically fixing these. Each is named here as **not this phase's**, and left alone:

1. **The byte-compare failure recorded as a blocker** (`.planning/STATE.md`, WINDOWS ledger entry 85, status `open`). Not fixed here. See the deviation below — its *stated risk* fired during this plan and was paid, but the underlying tool defect is untouched and the entry stays open.
2. **The SQL gate's leading-keyword blind spot** (`.planning/STATE.md` line 662: `sql-discipline.spec.ts`'s insert-select rule does not see migration step v6's copy, because `statementKind()` classifies by leading keyword). Not this phase's; `packages/backend/src/sql-discipline.spec.ts` and `packages/backend/src/store/migrations.ts` are unmodified.
3. **The stale recorder entry naming a dead process** (WINDOWS ledger entry 99, status `open`: STATE.md records the SPIKE-10 recorder as running at pid 79273 on 127.0.0.1:8998, and that pid does not exist). Not this phase's; `scripts/spike/recorder-session.sh` is unmodified.

**Proof, as the plan's acceptance criterion asks for it:**

```
$ git diff --exit-code -- packages/backend/src/sql-discipline.spec.ts \
    packages/backend/src/store/migrations.ts \
    scripts/spike/recorder-session.sh \
    .planning/WINDOWS.md
CLEAN: the three carried-forward Phase 6 conditions' files are unmodified
```

(`.planning/STATE.md` is deliberately excluded from that command: this plan's own close-out writes to it through `state.advance-plan` and `state.record-metric`, so a clean-diff assertion over it would be a claim this plan cannot make. The substantive files each condition lives in are the ones proven untouched, and both ledger entries remain `open` with their text byte-unchanged.)

## Decisions Made

Beyond the `key-decisions` frontmatter:

- **The `sources` label gets no per-column exemption, and that is the whole point of reusing the ceremony.** The manifest's one target-controlled column is registered as redactable, so `redactUrlForExport` governs it in redacted mode — which is the pre-selected default. The evidence D-06 preserves is retrievable through the raw option, behind the same two deliberate acts and the same `danger` confirmation as any other raw export. Inventing an exemption would have made the operator learn which tables are "safe", and that knowledge stops being true the moment a table with a covered column is added — which is exactly what the manifest just did.
- **The floor line (UI-09) is passed through unchanged to the manifest dialog rather than suppressed.** It reports how many contributing artifacts stopped short, and for a manifest scoped to one artifact whose analysis stopped early it is *more* relevant, not less — the manifest genuinely is a floor. Suppressing it per table would have been the per-table forking the prohibitions rule out, arriving through a different door.
- **`filter`, `sortKey` and `direction` are still forwarded on the manifest request and the backend ignores them.** The manifest has none of those axes (`EXPORT_TABLES`'s docblock says so, and `readOnePage`'s sources branch reads only the scope), so sending them costs nothing and inventing a narrower request shape would have meant a second request type for one table.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] The six counters were not reachable from the frontend at all**

- **Found during:** Task 2
- **Issue:** The plan's `files_modified` for Task 2 named only `HealthPanel.vue`, `HealthPanel.spec.ts` and `05-UI-SPEC.md`, and its read-first list pointed at `telemetry.ts` for "the status shape it is exposed through". The `sourcemap:` sub-map is exposed through **`getStatus`**, which `api/client.ts` deliberately does not wrap — the health surface reads `getHealth`, precisely so it cannot reach `lastError`. So there was no path from the counters to the panel: rendering them would have required either building the strip over `getStatus` (breaking the shipped no-string property) or fabricating numbers.
- **Fix:** Widened `HealthPayload` with a `SourcemapHealth` sub-object of six integers, projected it in `getHealth` field by field, and mirrored it as `SourcemapHealthCounters` on the frontend client. The no-string property is preserved and is now asserted by a **recursive leaf walk** rather than a one-level `Object.values` — the old assertion would have passed the day somebody nested a string under the new object.
- **Files modified:** `packages/backend/src/api/spec.ts`, `packages/backend/src/index.ts`, `packages/backend/src/index.spec.ts`, `packages/frontend/src/api/client.ts`, `packages/frontend/src/api/client.spec.ts`, `packages/frontend/src/components/health-contract.ts`
- **Commit:** `ae93c24`

**2. [Rule 2 — Missing critical coverage] The plan's own key link had no page-level test**

- **Found during:** Task 1
- **Issue:** The plan's key_links state that "the scoped CTA opens the SAME dialog with a different table argument". Every assertion the plan specified lives in `ExportDialog.spec.ts` or `SourceBrowser.spec.ts`, both of which mount components in isolation — so `App.vue`'s wiring (`openManifestExport`, `exportDialogTable`, the scope reset on close) would have shipped with the component halves proven and the join between them unproven. That join is where Named Conflict 1 is actually resolved or broken.
- **Fix:** Added three page-level cases to `App.spec.ts`: the scoped CTA opens one dialog headed for the manifest and issues no export; the confirmed export sends `table: "sources"` scoped to the browsed artifact in redacted mode; and the toolbar CTA returns to the inventory heading afterwards, which is the assertion that the two entry points cannot cross.
- **Files modified:** `packages/frontend/src/App.spec.ts`
- **Commit:** `91d648f`

**3. [Rule 3 — Blocking] `pnpm knip` failed on the new exported type**

- **Found during:** Task 3's verify gate
- **Issue:** `SourcemapHealth` was exported from `api/spec.ts` and referenced only by `HealthPayload` in the same file, which `knip` reports as an unused export. The gate is in the plan's own verify clause, so this blocked the task.
- **Fix:** Gave it a real consumer rather than silencing the gate — `index.ts` now imports it and annotates the projection `satisfies SourcemapHealth`, so the field-by-field mapping is checked against the contract where it is built rather than only structurally at the return position. Better code than the version that failed.
- **Files modified:** `packages/backend/src/index.ts`
- **Commit:** `b4f6159`

**4. [Rule 1 — Bug] `requirements.mark-complete` reformatted the machine-owned DERIVED RESIDUAL span, for the third time this phase**

- **Found during:** Task 3
- **Issue:** WINDOWS ledger entry 85 states the risk in as many words: *"every close-out that runs `requirements.mark-complete` can re-introduce it."* It did. Running the verb to tick MAP-07 and UI-05 inserted **three blank lines** into the span between `BEGIN DERIVED RESIDUAL` and `END DERIVED RESIDUAL` — at lines 11, 14 and 23 of the span — which `outbound-prohibition.spec.ts` byte-compares against `deriveResidual(RESOLVER_REGISTRY, BYTE_COMPARED_SURFACES)`. The span's own header says `MACHINE-OWNED, DO NOT HAND-EDIT`.
- **Fix:** The span was captured to a scratch file and its sha256 recorded **before** the verb ran, restored byte-for-byte afterwards, and re-verified by `diff` and by re-running the gate — 465 tests green — all before the commit. The checkbox ticks themselves are correct and were kept.
- **What was NOT done, deliberately:** the underlying defect is in `gsd-tools`' markdown handling, not in this repository, and fixing it is outside this plan's scope boundary. **WINDOWS entry 85 stays `open`** and is named above as a carried-forward condition. The remedy it records is the one that was applied.
- **Files modified:** `.planning/REQUIREMENTS.md` (restored, net zero change to the span)
- **Commit:** `b4f6159`

### Deferred Issues

**Pre-existing and explicitly not this plan's**, carried unchanged from the plan's `<upstream_state>`:

- `pnpm --filter @defminer/frontend typecheck` (`vue-tsc`) reports errors that no gate runs. The baseline at this plan's parent was **7**; it is now **6**. One was *fixed* as a side effect: `ExportDialog.vue`'s `runExport` call was missing `scopeSha256`, which this plan supplied. The remaining six — four in `SettingsPanel.vue` from plan 06-08, two in `SourceBrowser.spec.ts` from 07-09 — are untouched, and **no new one was introduced**.
- `store/retention.ts` sweeps neither `sources` nor `source_sightings` (07-05 deferred item D1). This plan touched no retention code, so there is no interaction to report beyond the obvious one: the six counters now make the growth of both tables visible on the health surface, which is a reason to close D1 rather than a substitute for closing it.
- WINDOWS entry 116 — one byte-identical private copy of `formatTimestamp` remains in `ObservationsTable.vue`. This plan does not touch that file.

## Requirement closure

`requirements ready-ids` was run against this plan before ticking anything:

```json
{ "ready": ["MAP-07", "UI-05"], "blocked": [], "total": 2 }
```

Both requirements' declaring plans are all shipped — MAP-07 by 07-06, 07-09 and this plan; UI-05 by 07-06, 07-07, 07-08, 07-09 and this plan. **MAP-07's sentence names two halves and this plan closed the second:** 07-09 made recovered source *browsable*, and this plan made it *exportable with a manifest* through the scoped CTA. Both boxes are now `[x]`.

**MAP-05 was NOT ticked.** It is not this plan's, it is not in this plan's `requirements`, and it stays `[ ]`.

## Notes for Next Phase

- **Phase 8 inherits a number, not a guess.** `announcedExternal` is on the health surface from this commit forward, so when Phase 8 turns on the active path it starts from a measured count of what Phase 7 declined to fetch rather than from an estimate.
- **The bundle grew.** `449.01 kB / gzip 91.88 kB` → **`452.97 kB / gzip 93.29 kB`** (+3.96 kB raw, +1.41 kB gzip), from the six counter rows' copy, the heading record and the drill-down wiring. `check:externals` still reports the single correct bare specifier (`vue`) and `check:bundle` still reports the two backend specifiers (`crypto`, `string_decoder`). The allowlist was not edited.
- **The heading record is the extension point.** A fourth export table cannot ship without a heading, by construction. Whoever adds one will find the typecheck failure in `export-contract.ts` before they find a blank dialog.
- **`07-VERIFICATION.md` can lift the four paragraphs above verbatim.** They are under one heading for exactly that purpose, and two of them are carried from plans that wrote them and named this one as the carrier.

## Verification Results

All gates green at plan end, on the full suite:

- `pnpm test` — **89 files, 4,139 tests, all passed** (up from 4,109 at this plan's parent: +30 cases)
- `pnpm typecheck` — exit 0
- `pnpm lint` — exit 0
- `pnpm knip` — exit 0
- `pnpm check:bundle` — 2 backend specifiers (`crypto`, `string_decoder`), unchanged
- `pnpm check:externals` — 1 bare specifier (`vue`), correct
- `pnpm check:css` — 144 rules checked against `#plugin--defminer`
- `pnpm exec caido-dev build packages` — succeeded; `dist/index.js 452.97 kB │ gzip: 93.29 kB`

Plan-specific gates:

- `grep -c 'quickjs-ng' .planning/REQUIREMENTS.md` → **2**
- `grep -c 'never become filenames' .../05-UI-SPEC.md` → **1**
- `grep -c 'ANALYSIS-STATE degraded marker' .../05-UI-SPEC.md` → **1**
- The R-series in `05-UI-SPEC.md` is contiguous **R1 → R6**
- `packages/backend/src/outbound-prohibition.spec.ts` — 465 passed, the machine-owned span byte-identical

---
*Phase: 07-sourcemap-reconstruction*
*Completed: 2026-09-02*

## Self-Check: PASSED

Ran after the SUMMARY was written, against the files and commits it claims.

**Files claimed — all present:** `07-10-SUMMARY.md`, `export-contract.ts`, `ExportDialog.vue`, `SourceBrowser.vue`, `HealthPanel.vue`, `health-contract.ts`, `ROADMAP.md`, `REQUIREMENTS.md`, `05-UI-SPEC.md`.

**Commits claimed — all present in `git log`:** `91d648f`, `ae93c24`, `b4f6159`, `39fc7ac`.

**Two claims were WRONG when first written and are corrected rather than left standing.** Both were caught by executing the claim instead of re-reading it, which is the only reason this section is worth having:

1. **The scan's file count.** The non-vacuity report first said *97 files scanned*. The real number, taken by running the walk, is **69**. 97 was a number I had not measured; the figure above now is. The assertion's own threshold (`> 40`) was never in doubt, but a report that states a count has to state the right one.
2. **The transitional constant was not fully gone.** `grep -rn "not available in this build" packages/frontend/src` returned one hit — my own explanatory comment in `SourceBrowser.vue`, quoting the deleted string while explaining that it was deleted. The constant itself was gone, so the ledger's requirement was met in substance; but a duplication scan of exactly the kind this plan just wrote for the raw-export ceremony would have hit it, and the SUMMARY's D6 coverage row claimed zero matches. The comment is reworded to describe the deletion without quoting it, and the grep now returns nothing. `SourceBrowser.spec.ts` and `ExportDialog.spec.ts` re-run green (60 tests), `pnpm lint` and `pnpm typecheck` exit 0 after the reword.
