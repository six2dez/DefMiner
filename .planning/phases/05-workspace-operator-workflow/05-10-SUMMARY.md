---
phase: 05-workspace-operator-workflow
plan: 10
subsystem: ui
tags:
  [
    sqlite,
    correlated-subquery,
    literal-statement-matrix,
    keyset-pagination,
    vue,
    evidence-panel,
    scan-state,
    ops-03,
    ui-09,
    err-04,
  ]

# Dependency graph
requires:
  - phase: 05-04
    provides: "EvidencePanelFrame / EVIDENCE_PANEL_MANDATORY_FIELDS, and the deferral register that says which of its five fields are buildable now"
  - phase: 05-05
    provides: "forPanel, truncationNotice and the static R1/R2 gate that audits every frontend file written here; decision P5-D26, which this plan owed"
  - phase: 05-07
    provides: "reads.ts's 52-literal statement matrix, the bounded candidate window, api/spec.ts and CONTRACT_VERSION"
  - phase: 05-08
    provides: "the typed client, the bounded keyset store, and the coalescer this plan finally subscribes"
  - phase: 05-09
    provides: "StatusBadge, PartialBanner and UI-09's marking mechanism — shipped, exercised, and marking nothing until this plan supplied the data"
provides:
  - "packages/backend/src/store/retry.ts — an operator-invoked state transition whose guard is a list constraint INSIDE the update statement"
  - "The artifact page row carries its newest analysis's scan_state, through a correlated scalar subquery on the analyses primary key"
  - "Two scan-state filter columns (scan_state, analysis_degraded) with the matrix still LINEAR — 24 filtered literals, not 64"
  - "getLatestAnalysisForArtifact and the getArtifactAnalysis endpoint — the panel's per-row read, with analyses.error deliberately absent"
  - "EvidencePanel.vue — the persistent split-body region, ERR-04's copy, UI-09's per-artifact line, and the re-analyse action"
  - "The coalescer SUBSCRIBED, with a triage gate spanning both inventory stores, and the coalescing pill"
  - "UI-09 marked on the running page and closed; OPS-03 closed with its limit stated on the surface"
affects: [05-11 export, 05-12 settings, phase 03 scorer, phase 04 evidence table, phase 06 deploy]

# Actuals (#2632)
actuals:
  tokens: 52899
  tasks: 4
  commits: 8

tech-stack:
  added: []
  patterns:
    - "A per-filter-column record of complete literals: adding a filter column adds one literal per slot, never a literal per combination"
    - "A correlated scalar subquery correlated on project_id, so the other project's NEWER row cannot win — asserted, not argued"
    - "A restatement that SQL cannot avoid is permitted only when a source assertion holds it to the single TypeScript declaration"
    - "A negative security property enforced by RESOLUTION rather than discipline: the field that must not be interpolated never crosses the boundary"
    - "Fixed-region assertions by DOM node identity and class equality, because jsdom reports every box as 0x0"
    - "A write's read-back state reaches a sibling surface through an overlay, never a refetch, when a refetch would re-order a list mid-triage"

key-files:
  created:
    - packages/backend/src/store/retry.ts
    - packages/backend/src/store/retry.spec.ts
    - packages/frontend/src/components/EvidencePanel.vue
    - packages/frontend/src/components/EvidencePanel.spec.ts
    - packages/frontend/src/components/panel-contract.ts
    - packages/frontend/src/components/scan-state-presentation.ts
  modified:
    - packages/backend/src/store/reads.ts
    - packages/backend/src/store/reads.spec.ts
    - packages/backend/src/store/analyses.ts
    - packages/backend/src/api/spec.ts
    - packages/backend/src/index.ts
    - packages/backend/src/index.spec.ts
    - packages/engine/src/contract.ts
    - packages/engine/src/contract.spec.ts
    - packages/frontend/src/App.vue
    - packages/frontend/src/App.spec.ts
    - packages/frontend/src/api/client.ts
    - packages/frontend/src/api/client.spec.ts
    - packages/frontend/src/backend.ts
    - packages/frontend/src/safety/display.ts
    - packages/frontend/src/components/StatusBadge.vue
    - packages/frontend/src/components/FindingsTable.spec.ts
    - packages/frontend/src/index.spec.ts
    - .planning/REQUIREMENTS.md

key-decisions:
  - "P5-D70: the retry vocabulary lives in the engine contract and retry.ts never spells a scan state; the retryable list's ARITY is asserted at import"
  - "P5-D71: a correlated scalar subquery, never a JOIN — a join multiplies rows per corpus version and makes the window's LIMIT count joined rows"
  - "P5-D72: two scan-state filter columns rather than one conditional predicate; the matrix stays linear and no null-guard shape is used"
  - "P5-D73: the degraded set is spelled in SQL because SQL cannot import TypeScript, and every IN clause is held to the derived set by a source assertion"
  - "P5-D74: the scan-state counts use the page's own predicate, accepting a correlated seek per row rather than answering a different question cheaply"
  - "P5-D75: analyses.error never crosses the RPC boundary — resolution, not discipline, for T-05-51"
  - "P5-D76: P5-D26 paid — the byte range is three backend integers, in its own sentence beside the grapheme truncation notice"
  - "P5-D77: the panel's fixed height is asserted by DOM node identity, never by a getBoundingClientRect jsdom reports as 0"
  - "P5-D78: the scan-state presentation map moved out of StatusBadge and gained a second renderer; the panel cannot embed a component carrying a data-* marker"
  - "P5-D79: a retry's read-back state reaches the table through an overlay, never a refetch, because the panel is open by construction"
  - "P5-D80: the coalescer is subscribed, and its triage gate spans BOTH inventory stores"
  - "P5-D81: UI-03 is deliberately NOT marked complete — the artifact version ships, the source request and byte offsets do not exist to link to"
  - "P5-D82: OPS-03 is marked complete and its limit — a retry queues, it does not re-walk — is stated on the surface that creates it"

patterns-established:
  - "One complete literal per filter COLUMN, keyed by that column's identifier, so the lookup IS the validation"
  - "A restated security-relevant constant is allowed only beside an assertion that compares it to the single declaration"
  - "A frame's deferred slot renders a line naming what it waits on, because an empty region is a different and false claim"

requirements-completed: [OPS-03, UI-09]

coverage:
  - id: D1
    description: "An analysis in a failed or partial state is moved back out of it on demand, by one statement whose key is fully bound; an analysis in any other shipped state is not moved, and the guard is in the statement rather than in a caller-side check."
    requirement: "OPS-03"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retry.spec.ts#covers every member of the shipped vocabulary and no other"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retry.spec.ts#leaves an analysis in the running state"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retry.spec.ts#moves an analysis in the failed state"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retry.spec.ts#moves an analysis in the partial state"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/sql-discipline.spec.ts (15 rules over packages/backend/src, with retry.ts in the tree)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The retry write reports what the row's state ACTUALLY became, read back after the write, and a wrong-project or wrong-corpus retry changes nothing."
    requirement: "OPS-03"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retry.spec.ts#changes nothing when the project does not own the row (T-05-53)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/retry.spec.ts#changes nothing when the corpus version does not match"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#moves a failed analysis and reports the state it READ BACK"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#ignores a caller-supplied project id on the retry path too"
        status: pass
    human_judgment: false
  - id: D3
    description: "A driver rejection returns a redacted description, never a bare stringification, and the endpoint fails closed with an explicit outcome when no project is resolved."
    requirement: "OPS-03"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/retry.spec.ts#returns a REDACTED description when the driver rejects"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#fails CLOSED when no project is resolved — never ok with no change"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts (4 rules, retry.ts in the tree)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The evidence panel is a persistent region of the split body: while a selected row's evidence loads it renders a skeleton and does not collapse or unmount, and selecting a second row while the first is loading does not collapse it between the two."
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#keeps the SAME element and the SAME classes while a row's evidence loads"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#does not collapse when a second row is selected while the first is loading"
        status: pass
      - kind: integration
        ref: "packages/frontend/src/App.spec.ts#keeps the panel region across a selection change and a tab change"
        status: pass
    human_judgment: false
  - id: D5
    description: "A failed analysis renders copy stating in words that this is not an absence of findings but an absence of inspection, with the re-analyse action beside it, and the interpolated reason is a DefMiner-authored code."
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#renders the failure sentence verbatim, with the re-analyse action beside it"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#interpolates a DefMiner-authored reason code, never a message"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#serves the panel's analysis WITHOUT the stored error column"
        status: pass
    human_judgment: false
  - id: D6
    description: "The re-analyse action calls the retry with the selected row's key, is disabled in flight with its own label, cannot be double-submitted, and a failure leaves the prior state visibly in place."
    requirement: "OPS-03"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#cannot be double-submitted: disabled in flight, with its own label"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#leaves the PRIOR state visibly in place when the retry fails"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#also leaves the prior state in place when the backend declined to move the row"
        status: pass
      - kind: integration
        ref: "packages/frontend/src/App.spec.ts#updates the panel on a successful retry WITHOUT re-ordering the table"
        status: pass
    human_judgment: false
  - id: D7
    description: "The panel states the artifact version from the analysis row's detector corpus identifier, in monospace, and scrolls internally within a fixed height without growing the page."
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#renders the artifact version in monospace"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#scrolls INSIDE its own body rather than growing the page"
        status: pass
    human_judgment: false
  - id: D8
    description: "🧪 BACKSTOP long-text / evidence-panel — the hostile fixture's three long-text cases (a multi-megabyte single line, a value with embedded newlines, a four-byte grapheme) render in the REAL mounted panel truncated at EVIDENCE_PANEL_MAX_GRAPHEMES read by import, with no split grapheme, a stated byte range, the fixed-height class unchanged, and completion inside a named bound."
    requirement: "UISEC-03"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#renders `multi-megabyte-single-line` truncated at the panel cap, unsplit, with its byte range stated"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#renders `embedded-newlines-and-tabs` truncated at the panel cap, unsplit, with its byte range stated"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#renders `four-byte-grapheme` truncated at the panel cap, unsplit, with its byte range stated"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#covers exactly the three long-text cases the backstop row names"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#routes the evidence value through the panel display path, not raw"
        status: pass
    human_judgment: false
  - id: D9
    description: "No node in the panel subtree carries a title attribute or an attribute whose name begins with the data prefix."
    requirement: "UISEC-03"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#carries no title attribute and no data-prefixed attribute anywhere in its subtree"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/frontend-safety.spec.ts#obeys every R1 and R2 rule"
        status: pass
    human_judgment: false
  - id: D10
    description: "The artifact page carries the newest analysis's scan_state per row, null for an artifact never analysed, on both the unfiltered and the filtered path, and never another project's analysis."
    requirement: "UI-09"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#reports the shipped state per row, and null for an artifact never analysed"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#picks the NEWEST analysis when an artifact has been read under two corpus versions"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#never reports another project's analysis (T-01-20)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/index.spec.ts#carries the analysis state onto the paged artifact rows"
        status: pass
    human_judgment: false
  - id: D11
    description: "Two scan-state filter columns narrow the inventory — one state, and the degraded set that one equality cannot express — with the statement matrix linear in filter columns rather than exponential in their combinations, and the counts agreeing with the pages."
    requirement: "UI-09"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#serves each shipped state as its own single-column filter"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#narrows to exactly the degraded set, which one equality cannot express"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#keeps the matrix LINEAR: one filtered literal per column, never per combination"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#holds the degraded SQL to the vocabulary's own predicate"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/reads.spec.ts#counts the SAME rows the page returns, for both new filter columns"
        status: pass
    human_judgment: false
  - id: D12
    description: "UI-09's marking happens on the RUNNING PAGE: the per-row Partial/Failed badge and the partial-view banner render from the state the paged rows carry, and Show only affected artifacts narrows through the new filter column."
    requirement: "UI-09"
    verification:
      - kind: integration
        ref: "packages/frontend/src/App.spec.ts#marks UI-09's degradation on the running page, from the paged rows"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/FindingsTable.spec.ts#ArtifactsTable — UI-09's degradation marking"
        status: pass
    human_judgment: false
  - id: D13
    description: "The split body renders the table and the panel side by side at the spacing-scale gap; a row click opens the panel and does not navigate; with the panel open an invalidation summary produces no reaction and accrues into the pending count; closing the panel clears both flags and applies nothing by itself."
    requirement: "UI-09"
    verification:
      - kind: integration
        ref: "packages/frontend/src/App.spec.ts#renders the table and the panel side by side, at the spacing-scale gap"
        status: pass
      - kind: integration
        ref: "packages/frontend/src/App.spec.ts#opens the panel on a row click without navigating away"
        status: pass
      - kind: integration
        ref: "packages/frontend/src/App.spec.ts#accrues an invalidation summary into the pill instead of reacting, while the panel is open"
        status: pass
      - kind: integration
        ref: "packages/frontend/src/App.spec.ts#closing the panel clears both flags and applies nothing by itself"
        status: pass
    human_judgment: false
  - id: D14
    description: "The frame's deferred slots — source request, byte offsets, evidence snippet, score explanation — each render an explicit line naming what they are waiting on and which phase supplies it, rather than an empty region."
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#names what each deferred slot is waiting on rather than rendering nothing"
        status: pass
    human_judgment: true
    rationale: "The LINES are proved present and their wording is asserted. Whether the deferral itself is acceptable for this phase — a panel that states an artifact version and says the offsets, the snippet and the score are Phase 3's and Phase 4's — is an operator judgment, and it is the same judgment the entity contract's deferral register records rather than settles. UI-03 and UI-04 stay open."
  - id: D15
    description: "OPS-03's limit: a retry returns the row to the queued state and does NOT re-walk the bytes, because no body is retained; the panel states this in words."
    requirement: "OPS-03"
    verification:
      - kind: unit
        ref: "packages/frontend/src/components/EvidencePanel.spec.ts#says what a queued analysis is waiting for, rather than leaving one word to carry it"
        status: pass
    human_judgment: true
    rationale: "The SENTENCE is proved. Whether 'retried on demand' is satisfied by a durable re-queue that re-walks on the next sighting — rather than by an immediate re-analysis, which is not buildable without retaining bodies — is an operator call on the requirement's intent. OPS-03 is marked complete on the reading that the retry itself is on demand and its outcome is persisted; the alternative reading is stated here rather than hidden."

# Metrics
duration: 43 min
completed: 2026-08-29
status: complete
---

# Phase 05 Plan 10: Retry and the Evidence Panel Summary

**An operator-invoked state transition whose guard is a list constraint inside the update statement, an evidence panel that is a persistent region rather than an overlay — and the backend read that finally lets UI-09 mark something on the running page.**

## Performance

- **Duration:** 43 min
- **Started:** 2026-08-29T00:52:00Z
- **Completed:** 2026-08-29T01:35:00Z
- **Tasks:** 4 (3 planned + 1 operator-authorized scope addition)
- **Files modified:** 24 (6 created, 18 modified)

## Accomplishments

- **`retry.ts` — the guard is in the statement, and that is the whole design.** One fully-bound update on the analysis natural key with `RETRYABLE_SCAN_STATES` bound into an `IN` list in the predicate. A caller-side "read the state, then update if it is retryable" is two operations this driver cannot make atomic — there is no transaction primitive, `BEGIN` does not span `exec` calls and fails silently — and the interleaving it permits is a running walk reset underneath itself (T-05-50). All five shipped states are driven through it and asserted **by reading the row back**, because this driver has no `RETURNING` and no usable `last_insert_rowid()`.
- **The retryable list's ARITY is asserted at module import.** `IN (?, ?)` is literal text, because every statement in the package is a complete literal and an arity computed from a list length would be interpolated SQL. A sixth degraded state throws while the module loads, naming both halves, rather than binding a short list and silently retrying one state fewer.
- **UI-09 closed — the gap plan 05-09 measured, refused to paper over, and handed forward.** The paged artifact statements now carry the newest analysis's `scan_state` through a correlated scalar subquery on the `analyses` primary key, correlated on `project_id`. The badge, the banner and the floor statement mark the running page; `Show only affected artifacts` narrows through a filter column that now exists.
- **The statement matrix stayed linear, and the number is asserted rather than argued.** Three filter columns over eight (sort key × direction × cursor) slots is **24 filtered literals**, read out of the source by a spec. An exponential matrix over combinations would have been 64. No null-guard predicate and no query builder was used: both were disqualified by execution in `05-RESEARCH § O-01`, and the second was disqualified for the worse reason — the gate's own `auditSource` reports zero violations against builder shapes, so a builder can only create an ungated SQL surface that reports green for ever.
- **`analyses.error` never crosses the RPC boundary.** ERR-04's copy interpolates a `{reason}` into a sentence and the rule that outranks the copy table requires a DefMiner-authored code. The panel's analysis projection omits the column entirely, asserted as a **key set on the object that actually crossed** — so the class of bytes T-05-51 names cannot arrive at the panel to be interpolated by a later edit. That is resolution, not discipline.
- **The panel is persistent by construction.** Its root element is rendered unconditionally and carries the one fixed-height class in every state; the five states are chosen inside its own scroll container. The spec asserts that by **DOM node identity** across a loading/loaded transition — jsdom has no layout and reports every box as `0×0`, so a `getBoundingClientRect` comparison would have passed in the collapsed state too (P5-D65's lesson, applied).
- **P5-D26 paid.** `forPanel`'s object still carries no byte count, deliberately. The byte range is stated from **three integers the backend supplied beside the value**, as its own sentence next to the grapheme truncation notice, so neither length space is presented as a conversion of the other.
- **The coalescer is subscribed at last.** Plan 05-08 built it and nothing subscribed it, so UI-07's mid-triage guarantee was a property of a module rather than of the page. Its gate now spans both inventory stores, and a summary arriving with the panel open accrues into the pill instead of re-ordering the table.
- **The backstop earned its classification.** The shared hostile fixture's three long-text cases are driven through the **real mounted panel** — not through `forPanel` in isolation — with the cap read by import, an unsplit grapheme at the boundary, a stated byte range, the fixed-height class unchanged, and completion inside a named bound.

## Task Commits

1. **Task 1 (RED): the retry state-transition table** — `9692125` (test)
2. **Task 1 (GREEN): `retryAnalysis`** — `6caac92` (feat)
3. **Scope addition: the paged read carries the state, and two filter columns** — `404eb55` (feat)
4. **Task 2 (RED): the panel's behaviours and the long-text backstop** — `ea0878f` (test)
5. **Task 2 (GREEN): `EvidencePanel.vue`** — `d33658d` (feat)
6. **Task 3: the panel in the split body, UI-09 marked** — `2da4c07` (feat)
7. **What a queued analysis is waiting for** — `f20ebd8` (fix)
8. **REQUIREMENTS.md machine-owned span restored** — `5f0697c` (fix)

**Plan metadata:** see the `docs(05-10)` commit that carries this file.

## The operator-authorized scope addition

**Taken as a Rule 2 deviation on an explicit operator decision, recorded here the way plan 05-07 recorded its migration step v4.**

Plan 05-09 shipped UI-09's Partial badge, partial-view banner and floor statement, fully exercised against fixtures — and marked nothing, because `reads.ts`'s paged statements carried no `scan_state` and no endpoint returned one. `App.vue` passed `:analyses="null"`. 05-09 correctly refused to mark UI-09 complete rather than present an incomplete thing as complete. UI-09 is ROADMAP success criterion 8, and this plan was its only remaining declarer.

**What was built, and what it cost:**

| Piece | Shape |
|---|---|
| The state on the row | A correlated scalar subquery `(SELECT an.scan_state FROM analyses an WHERE an.project_id = artifacts.project_id AND an.sha256 = artifacts.sha256 ORDER BY an.started_at DESC, an.detector_set_hash DESC LIMIT 1)`, added to all 16 artifact row-returning literals |
| Why not a `JOIN` | An artifact carries one analysis per corpus version, so a join multiplies rows — and inside the bounded candidate window the **inner** `LIMIT` would then count joined rows rather than artifacts, silently shrinking the window |
| The filter columns | `scan_state` (one state) and `analysis_degraded` (the two degraded states, which one bound equality cannot express) |
| Matrix size | 8 unfiltered + 8 window + **24 filtered** + 4 counts on artifacts, up from 8 + 8 + 8. **Linear in filter columns**, asserted against the source |
| Migrations | **None.** The filters are applied on the outer arm of the same bounded window every other filter uses, so they cost what the others cost. Step v4's stated decision not to add filter-leading indexes still holds |
| The panel's per-row read | `getLatestAnalysisForArtifact` — one statement joining the artifact's `byte_len` beside the walk's `bytes_walked`, because a numerator and a denominator fetched separately can be fetched either side of a retention sweep |
| Endpoints | `getArtifactAnalysis`, `retryAnalysis`. `CONTRACT_VERSION` 1 → 2 by the **row-shape** rule, with `FRONTEND_CONTRACT_VERSION` bumped in the same change |

**Every constraint held.** The 15-rule gate reports nothing against the new statements (every correlated subquery scopes on `project_id` in its own `WHERE`, which the gate checks per-piece). Uniform cursor direction is untouched; the new statements reuse the shipped v3/v4 indexes and needed none of their own. Positional `?` only, no `RETURNING`, no `last_insert_rowid()`, one statement per write on a natural key, every multi-row statement `project_id`-scoped.

## The measurements and the numbers this plan is required to record

| Measurement | Value |
|---|---|
| Filtered literals on `artifacts` | **24** (3 filter columns × 8 slots) |
| The exponential alternative | 64 (2³ combinations × 8 slots) |
| `ORDER BY` clauses in `reads.ts` | 130, up from 64 |
| `OFFSET` occurrences (comments stripped) | 0 |
| `IN` clauses in `reads.ts`, all held to the derived degraded set | 9 |
| Correlated seeks per unfiltered page | ≤ 100 (one per returned row) |
| Correlated seeks per filtered page | ≤ 500 (one per candidate-window row) |
| Backend suite | 18 files / 1,145 tests |
| Whole suite | 54 files / **2,027 tests** |
| Frontend bundle | 335.29 kB (63.08 kB gzip), 1 bare import specifier (`vue`) |
| Backend bundle | 1 import specifier (`crypto`) |
| Prefixwrap | 102 rules, all scoped to `#plugin--defminer` |
| 10,000-row browser backstop, re-run | 0 frames over the 32 ms budget, p95 25.0 ms, scroll 4,565 ms |

**Correctness and performance are stated apart, as the phase requires.** Every query-plan number this plan inherits — the 2,000,025-step null-guard, the 258× bounded-window reduction — was measured on SQLite **3.51.0 / 3.53.4, not on Caido's shipped 3.46.0**, and is narrowed to a 3.46 → 3.51 window rather than verified on the shipped runtime. **This plan adds no new query-plan measurement and makes no new performance claim.** The correlated-subquery cost above is stated as a *bound on seek count*, which is a property of the statement and the primary key rather than of a plan. Every correctness property below — the state per row, the project correlation, the newest-analysis tie-break, the filter sets, the count agreement — is asserted directly against a real SQLite and does not depend on a query plan.

## Files Created/Modified

- `packages/backend/src/store/retry.ts` (new) — one statement, the in-statement guard, the write-then-read, the arity assertion
- `packages/backend/src/store/retry.spec.ts` (new, 11 tests) — one case per shipped state, wrong project, wrong corpus, absent key, redaction
- `packages/backend/src/store/reads.ts` — 40 artifact statements (was 24), the per-column `filtered` record, `ARTIFACT_SCAN_STATE_FILTER_COLUMN`, `ARTIFACT_FILTER_COLUMNS`, `ArtifactPageRow`, two new counts
- `packages/backend/src/store/reads.spec.ts` (+15 tests) — the state per row, the two filters, the linearity count, the SQL-to-vocabulary binding, the panel read
- `packages/backend/src/store/analyses.ts` — `getLatestAnalysisForArtifact`, with `error` deliberately unselected
- `packages/backend/src/api/spec.ts` — two endpoints, `PanelAnalysis`, `RetryOutcome`, `CONTRACT_VERSION` 2
- `packages/backend/src/index.ts` — two success-path registrations, `NO_RETRY`, the field-by-field projection mapping
- `packages/backend/src/index.spec.ts` (+8 tests) — both endpoints through the real `init()` against a real fixture database
- `packages/engine/src/contract.ts` / `contract.spec.ts` — `RETRY_TARGET_SCAN_STATE`, `RETRYABLE_SCAN_STATES`, `DEGRADED_ANALYSIS_FILTER`, `UNCLASSIFIED_ANALYSIS_FAILURE_REASON`, and three describe blocks holding them
- `packages/frontend/src/components/EvidencePanel.vue` (new) — the persistent region, five body states, the frame, ERR-04, UI-09's line, the action
- `packages/frontend/src/components/EvidencePanel.spec.ts` (new, 26 tests) — every behaviour plus the long-text backstop
- `packages/frontend/src/components/panel-contract.ts` (new) — the height constant + throwing class lookup, `PanelEvidence`, and every approved string
- `packages/frontend/src/components/scan-state-presentation.ts` (new) — the vocabulary's presentation, one declaration, two renderers
- `packages/frontend/src/components/StatusBadge.vue` — imports the map it used to hold
- `packages/frontend/src/App.vue` / `App.spec.ts` (+7 tests) — the panel mounted, the analyses map, the degraded filter, the coalescer subscribed, the pill, the retry overlay
- `packages/frontend/src/api/client.ts` — two methods, `PanelAnalysis`, `AnalysisKey`, `RetryOutcome`, `FRONTEND_CONTRACT_VERSION` 2
- `packages/frontend/src/backend.ts` — `ArtifactRow` gains `scan_state`
- `packages/frontend/src/safety/display.ts` — `byteRangeNotice`
- `.planning/REQUIREMENTS.md` — OPS-03 and UI-09 checked off

## Decisions Made

Thirteen, `P5-D70` through `P5-D82`, recorded in full in the frontmatter and in STATE.md. The four a later reader is most likely to need:

- **P5-D71** — a correlated scalar subquery and not a `JOIN`, because a join multiplies rows per corpus version and makes the bounded window's `LIMIT` count the wrong thing.
- **P5-D72** — two filter columns rather than one conditional predicate, because a predicate branching on a bound value is the null-guard shape the research disqualified by measurement, and because the matrix has to stay linear.
- **P5-D75** — `analyses.error` never crosses the boundary. The negative property is enforced by resolution rather than by discipline, and asserted on the object that crossed.
- **P5-D81 / P5-D82** — UI-03 stays open and OPS-03 closes. Both are stated with their reasons rather than left to be inferred from a checkbox.

## Deviations from Plan

### Operator-authorized scope addition

**0. [Rule 2 — Missing Critical, operator-authorized] The backend read UI-09 needs, and the scan-state filter column**

- **Found during:** Before Task 2, on an explicit operator decision taken 2026-08-29
- **Issue:** Plan 05-09 shipped UI-09's marking mechanism and could mark nothing on the running page — the paged statements carried no `scan_state`, no endpoint returned one, and `App.vue` passed `:analyses="null"`. `Show only affected artifacts` was suppressed for the same reason: there was no filter column any single-column filter could bind to. Recorded in `.planning/WINDOWS.md` entries 56 and 58.
- **Fix:** As tabulated above — the state carried through the literal-statement matrix, two filter columns, the panel's per-row read, two endpoints, and the frontend wiring.
- **Files modified:** `reads.ts`, `reads.spec.ts`, `analyses.ts`, `api/spec.ts`, `index.ts`, `index.spec.ts`, `contract.ts`, `App.vue`, `App.spec.ts`, `client.ts`, `backend.ts`
- **Verification:** 15 new `reads.spec.ts` cases, 8 new `index.spec.ts` cases, the linearity count read out of the source, and the whole suite green
- **Committed in:** `404eb55`, `2da4c07`

### Auto-fixed Issues

**1. [Rule 2 — Missing Critical] The coalescer existed and nothing subscribed it**

- **Found during:** Task 3
- **Issue:** Plan 05-08 built `createCoalescer` as a factory composable and no component ever called it. UI-07's mid-triage guarantee — "the table does not re-order while a row is selected or the panel is open" — was therefore a property of a module rather than of the page, and the counts on screen simply went stale. This is the same class of gap 05-09 documented for UI-09, on a different requirement.
- **Fix:** `App.vue` creates the coalescer over a triage gate spanning **both** inventory stores, owns the stop handle in `onUnmounted` (research P-04), and renders the coalescing pill with its approved copy. The pill renders only when something is pending and never auto-applies (UI-SPEC Open Decision D4).
- **Files modified:** `packages/frontend/src/App.vue`, `App.spec.ts`, `index.spec.ts`
- **Verification:** a case clicks a row, emits an invalidation summary the way the backend would, and asserts a non-zero pill and an unmoved table
- **Committed in:** `2da4c07`

**2. [Rule 1 — Bug] "Queued" would have been a word an operator waited on**

- **Found during:** close-out, while deciding whether OPS-03 could be marked
- **Issue:** A retry returns the row to the queued state, and the walk happens the next time the target serves those bytes — DefMiner retains a digest, a length and a kind, and no body. Left unsaid, an operator who retried and never re-browsed would be waiting for something that was not going to happen, on a tool whose premise is that it never asks the target for anything.
- **Fix:** A DefMiner-authored sentence on the queued state, asserted by value.
- **Files modified:** `panel-contract.ts`, `EvidencePanel.vue`, `EvidencePanel.spec.ts`
- **Verification:** `EvidencePanel.spec.ts` — "says what a queued analysis is waiting for"
- **Committed in:** `f20ebd8`

**3. [Rule 3 — Blocking] The SQL-discipline gate read a THROWN ERROR MESSAGE as SQL**

- **Found during:** Task 1
- **Issue:** `retry.ts`'s arity-assertion message ended "…update this bound together". `looksLikeSql` matches `/\bUPDATE\b/i`, so the gate classified the message as a multi-row statement over an unnamed table and reported both `concatenated-sql` and `unscoped-multi-row`.
- **Fix:** The message was reworded to say the same thing without a SQL keyword, which is the same handling plan 05-07 recorded for its own comment-versus-gate collision.
- **Files modified:** `packages/backend/src/store/retry.ts`
- **Verification:** `sql-discipline.spec.ts` 40/40
- **Committed in:** `6caac92`

**4. [Rule 3 — Blocking] `StatusBadge` could not be reused inside the panel**

- **Found during:** Task 2
- **Issue:** The panel asserts, over its rendered subtree, that no node carries a `title` or a `data-`prefixed attribute (R2's absolute). `StatusBadge` carries `data-defminer-status-badge`, which 05-09's own specs select on, so embedding it would have failed the panel's assertion — and copying the five labels into the panel would have been the second declaration the `Record<ScanState, …>` mechanism exists to prevent.
- **Fix:** The presentation map moved to `scan-state-presentation.ts`; both components import it. One declaration, two renderers, the exhaustive `Record` preserved.
- **Files modified:** `scan-state-presentation.ts` (new), `StatusBadge.vue`, `EvidencePanel.vue`
- **Verification:** `FindingsTable.spec.ts` 28/28 unchanged, `EvidencePanel.spec.ts` 26/26
- **Committed in:** `d33658d`

**5. [Rule 3 — Blocking] Three exports had no cross-module consumer**

- **Found during:** close-out
- **Issue:** `pnpm knip` runs `ignoreExportsUsedInFile: false`, so `OBSERVATION_FILTER_COLUMNS`, `EVIDENCE_PANEL_HEIGHT_PX` and `PanelAnalysis` were gate failures rather than harmless seams.
- **Fix:** `PanelAnalysis` un-exported, matching `CountRequest`'s stated reason in the same file. The other two acquired **real** consumers rather than cosmetic ones: a case holding the observations filter list to what the statements actually serve, and a case holding the panel's height class to the constant that produces it (P5-D64's mechanism, applied to the panel).
- **Files modified:** `api/spec.ts`, `reads.spec.ts`, `EvidencePanel.spec.ts`
- **Verification:** `pnpm knip` exit 0
- **Committed in:** `2da4c07`

**6. [Rule 1 — Bug, predicted] `requirements.mark-complete` prettified REQUIREMENTS.md again**

- **Found during:** close-out
- **Issue:** The **fifth** confirmed occurrence (05-01, 05-08, 05-09; repaired by 05-02). Marking any requirement complete rewrites the file through a markdown prettifier, which inserts blank lines into the machine-owned CORE-11 derived-residual span that `outbound-prohibition.spec.ts` byte-compares. Seven lines drifted; the gate went red.
- **Fix:** Reconstructed from a pre-call snapshot with only the two checkbox flips applied, dropping every blank-line-only insertion.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** `outbound-prohibition.spec.ts` 456/456
- **Committed in:** `5f0697c`

### Adjustments made without a rule

**7. Two spec assertions were corrected during authoring, not the code.**

- The double-submit case originally resolved the retry to `pending` and then asserted the button had re-enabled. It had not — it had been **unmounted**, correctly: the action is offered only for the states the backend's guard will move, so a successful retry removes it. The case was rewritten to resolve to a state that is still degraded, and a second case was added asserting the removal, which is the stronger claim.
- The retry-does-not-re-order case originally compared whole row texts. The row text is *expected* to change — the badge updates in place, which is the point — so it now compares row order **by digest identity** and asserts the badge moved separately.

---

**Total deviations:** 1 operator-authorized scope addition + 6 auto-fixed (2 bugs, 1 missing critical, 3 blocking), plus 2 authoring adjustments.
**Impact on plan:** No scope creep. The scope addition was an explicit operator decision and closes a ROADMAP success criterion the previous plan could not. The coalescer subscription is the same class of gap on a different requirement and was one line of wiring away from being lost again.

## Known Stubs

Recorded in `.planning/WINDOWS.md` as entries **59, 60, 61** (stubs) and **62** (a deviation). Entries **56** and **58**, which 05-09 opened, are now marked `fixed`; entry **57** (the empty triage column) stays open and is Phase 4's.

| Stub | File | Why it exists |
|---|---|---|
| `:evidence="null"` — the byte-range and snippet slots render a not-yet-available line | `App.vue` / `EvidencePanel.vue` | Phase 4's `evidence` table (plan 04-03) does not exist, so there are no offsets to slice and no excerpt to show. The rendering path is fully exercised by the panel spec against the shared hostile fixture — only the producer is absent. |
| `:source-request-id="null"` | `App.vue` | Nothing links an artifact to the observation whose request still resolves; D-02's newest-that-resolves walk is the deferred pass's. **This and the byte offsets are why UI-03 is NOT marked complete.** |
| The score-explanation slot renders a not-yet-available line | `EvidencePanel.vue` | Phase 3's signal vocabulary and scorer (plan 03-03) do not exist. UI-04 stays open. |
| A retry queues but does not re-walk | `retry.ts` | No body is retained. The queued state is a durable record that work is outstanding, which is what it is for; Phase 2's ERR-02 recovery is what drains such a row without a fresh sighting. **Stated on the panel in words**, not left to be inferred. |

**Why UI-09 CAN now be marked, where 05-09 could not.** Its text is "degraded and partial analyses are visibly marked, never silently presented as complete". The mechanism shipped in 05-09; the data reaches it here; a spec drives the real page and asserts the badge and the banner render from the paged rows. Nothing about it is stubbed.

## Threat Flags

None. The threat register's six entries (T-05-50 … T-05-55) are all addressed by the tasks that own them:

| Threat | Where it is closed |
|---|---|
| T-05-50 — a running analysis reset underneath itself | The state list is a constraint inside the update; the running case is asserted to change nothing |
| T-05-51 — a target-controlled error echoed into panel copy | `analyses.error` is not selected and not on the contract type; asserted as a key set on the object that crossed |
| T-05-52 — evidence leaking into a tooltip or an attribute | Asserted over the panel's rendered subtree, which is why `StatusBadge` is not embedded |
| T-05-53 — a retry against another project's row | `project_id` in the update predicate, plus a behavioural wrong-project test that reads the row back under its true project |
| T-05-54 — the panel opening without setting the flag the coalescer reads | The wiring test emits an invalidation summary with the panel open and asserts a non-zero pill and an unmoved table |
| T-05-55 — a retry reported as succeeded that did not persist | Write-then-read on the backend; the panel sets its shown state only from the read-back, and two failure shapes both leave the prior state in place |

**One new surface was introduced and is modelled:** `getArtifactAnalysis` is a read of a table the frontend could not previously reach. It is project-scoped by the resolved id (the caller's is discarded), returns a projection rather than the row, and is registered on the success path only — asserted by the refusal-path case that pins the registered set to exactly `getStatus` and `getCompat`.

## Issues Encountered

- **The plan's Task 1 instruction to bump `CONTRACT_VERSION` and the constant's own bump rule disagree.** The constant says adding an endpoint does *not* oblige a bump; the plan said it did. The bump happened anyway and for a stronger reason — `listArtifactsPage`'s **row shape** changed, which the constant's own rule does oblige — and the doc comment now records both halves so a later reader is not left with a contradiction.
- **`state.add-decision --summary-file` silently discarded five writes** before it was caught: it rejects an absolute path outside the repo while exiting 0 (`"added": false, "reason": "Path escapes allowed directory"`). Plan 05-08's STATE.md note recorded exactly this and it still cost a round. Repo-relative paths work.
- **`state.update-progress` withheld the project-wide bar again** — `progress percent withheld by buildStateFrontmatter` — the seventh consecutive occurrence in this phase.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Ready for `05-11` (export).** Nothing here blocks it, and two things help it:

1. **The artifact page row now carries `scan_state`**, which is what the export's UI-09 floor header needs: `05-UI-SPEC.md`'s `partial / export-dialog` row requires the exported file itself to carry the floor statement as a CSV header comment or a JSON top-level field, and the rows it exports now know whether they are degraded.
2. **`DEGRADED_ANALYSIS_FILTER` is the one declared narrowing**, imported by both packages. An export scoped to affected artifacts binds the same object rather than a second spelling.

**What a later plan must pick up:**

- **UI-03 and UI-04 stay open**, with their blockers named in the entity contract's deferral register and their frame slots rendering explicit lines rather than empty regions. The panel adds fields when Phase 4's `evidence` table and Phase 3's scorer land; it does not restructure a region.
- **OPS-03's re-walk.** The retry queues; Phase 2's ERR-02 recovery is what drains a `pending` row that no fresh sighting will reach. Until then a retried artifact re-analyses on its next sighting, and the panel says so.
- **The query-plan residual is unchanged and unspent.** This plan measured nothing new on a SQLite it does not ship; the correlated-seek bound above is a property of the statement and the primary key, not of a plan.

**No blockers.** `pnpm test` (54 files / 2,027 tests), `pnpm typecheck`, `pnpm lint`, `pnpm knip`, `pnpm build`, `pnpm check:bundle`, `pnpm check:css` and `pnpm check:externals` all exit 0.

---

_Phase: 05-workspace-operator-workflow_
_Completed: 2026-08-29_

## Self-Check: PASSED

- All six created files verified present on disk: `retry.ts`, `retry.spec.ts`, `EvidencePanel.vue`, `EvidencePanel.spec.ts`, `panel-contract.ts`, `scan-state-presentation.ts`
- All eight task commits verified reachable in `git log --all`: `9692125`, `6caac92`, `404eb55`, `ea0878f`, `d33658d`, `2da4c07`, `f20ebd8`, `5f0697c`
- Every plan-level `<verification>` command re-run green, including the browser backstop (`tests/frontend-load.spec.ts`, 0 frames over budget)
- No file deletions in any commit; working tree clean before this file was written
- `.planning/WINDOWS.md`: entries 56 and 58 marked `fixed`, entries 59–62 appended
