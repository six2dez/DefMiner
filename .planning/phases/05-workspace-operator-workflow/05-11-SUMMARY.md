---
phase: 05-workspace-operator-workflow
plan: 11
subsystem: ui
tags:
  [export, csv, json, formula-injection, blob-download, audit, rpc, chunking, vue]

# Dependency graph
requires:
  - phase: 05-workspace-operator-workflow
    provides: "05-03's packages/engine/src/csv.ts (the one field rule) and hostile.fixture.ts; 05-02's measured EXPORT_RPC_CHUNK_ROWS and the byte-identity of chunked serialisation; 05-07's reads.ts literal-statement matrix and countInventory; 05-06's AUDIT_KINDS export_raw/export_redacted; 05-10's scan_state filter columns and DEGRADED_ANALYSIS_FILTER"
  - phase: 01-skeleton-persistence-compatibility
    provides: "observations.ts's write-time QUERY_VALUE_REDACTION, artifacts.ts's StoreWriteResult, telemetry.ts's describeError, index.ts's init() ordering contract"
provides:
  - "packages/backend/src/store/export.ts — both serialisers over the ONE shared field rule, the per-column redaction policy, the embedded UI-09 floor statement, and the chunk reader; contains no SQL and no filesystem call of any kind"
  - "EXPORT_RPC_CHUNK_ROWS moved out of tests/ into production code, with its derivation left where the 50,000-row measurement lives"
  - "EXPORT_FORMATS / EXPORT_REDACTION_MODES in @defminer/engine/contract — one declaration, two importers, redacted first"
  - "The exportInventory RPC endpoint, registered on the success path only, with exactly one audit row per completed export"
  - "packages/frontend/src/components/ExportDialog.vue — redacted pre-selected and focused, raw behind two deliberate acts, and the Blob download"
  - "export-contract.ts (the verbatim D-07 copy) and export-download.ts (decision D-04's mechanism, and the only DOM reach)"
affects: [05-12, 06-deployment, 07-source-viewer]

# Actuals (#2632)
actuals:
  tokens: 81861
  tasks: 3
  commits: 7

tech-stack:
  added: []
  patterns:
    - "A security rule has ONE implementation and every surface CALLS it: export.ts imports csvField/csvRow/csvHeader from the engine rather than escaping fields itself, so the exported bytes and the rule the safety specs assert cannot diverge"
    - "A vocabulary whose ORDER is a safety property lives in the shared contract, never as two copies: the first member is what a positional mistake lands on, so `mode` is initialised from `EXPORT_REDACTION_MODES[0]` and the focused radio's id is built from the same `[0]`"
    - "Assert the ABSENCE of a control by an EQUALITY over the whole control set — a search for a checkbox cannot catch one added under another name"
    - "Assert copy VERBATIM by reading the design contract off disk at test time; comparing against a second in-repo copy passes just as happily when both copies are the old one"
    - "A chunked write's durable record belongs to the chunk that COMPLETES it — not one per call, and not optimistically at the start"
    - "Reach the DOM structurally off `globalThis` in a `.ts` module, never by naming DOM types in a `.vue` file: two TypeScript programs read this package and only one carries the DOM lib"

key-files:
  created:
    - packages/backend/src/store/export.ts
    - packages/backend/src/store/export.spec.ts
    - packages/frontend/src/components/ExportDialog.vue
    - packages/frontend/src/components/ExportDialog.spec.ts
    - packages/frontend/src/components/export-contract.ts
    - packages/frontend/src/components/export-download.ts
  modified:
    - packages/engine/src/contract.ts
    - packages/backend/src/api/spec.ts
    - packages/backend/src/index.ts
    - packages/backend/src/index.spec.ts
    - packages/frontend/src/api/client.ts
    - packages/frontend/src/api/client.spec.ts
    - packages/frontend/src/App.vue
    - packages/frontend/src/App.spec.ts
    - tests/export-payload-budget.spec.ts
    - .planning/REQUIREMENTS.md

key-decisions:
  - "P5-D83: the redaction policy is PER COLUMN and covers exactly one column today — observations.url, whose query and fragment the redacted mode withholds"
  - "P5-D84: a raw export of a table with no covered column is byte-identical to a redacted one, and the ceremony is NOT weakened for that table"
  - "P5-D85: every exported value is emitted as a STRING in both formats, so the two formats' field values cannot disagree"
  - "P5-D86: the embedded floor statement is a leading unquoted '# ' comment line (CSV) and an absent-or-present top-level `floor` field (JSON)"
  - "P5-D87: the endpoint takes BOTH a keyset cursor and a chunk index, and they are not redundant"
  - "P5-D88: a chunk is assembled from WHOLE keyset pages, so chunkRows is a ceiling a chunk can fall short of and never exceed"
  - "P5-D89: the audit row is written ONCE, on the chunk that completes the export"
  - "P5-D90: CONTRACT_VERSION 2 -> 3 is a DELIBERATE over-bump, recorded as one"
  - "P5-D91: the two export vocabularies live in @defminer/engine/contract, not in the exporter"
  - "P5-D92: the raw-export copy is asserted verbatim against 05-UI-SPEC.md read off disk at test time"

patterns-established:
  - "The forbidden identifiers a gate greps for are deliberately NOT written out in the file the gate reads — a gate a comment can trip is a gate that gets weakened rather than obeyed"
  - "A constant whose home was a spec MOVES to production code while its DERIVATION stays where the measurement lives, rather than copying the fixture across a package boundary"

requirements-completed: [UI-06, UISEC-02]

coverage:
  - id: D1
    description: "Both formats serialise through the ONE shared field rule: a dangerous lead is apostrophe-prefixed BEFORE quoting, asserted positionally rather than by presence"
    requirement: "UISEC-02"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#apostrophe-prefixes a dangerous lead BEFORE quoting — the ORDER, positionally"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#emits one header row and one row per input row, every field quote-wrapped"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#emits one object per row with the same field values, control-stripped and NOT formula-neutralised"
        status: pass
    human_judgment: false
  - id: D2
    description: "🧪 backstop `long-text / export-dialog` — every case in the shared hostile fixture through BOTH formats in BOTH modes, with the exercised id set asserted EQUAL to HOSTILE_CASE_IDS"
    requirement: "UISEC-02"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#🧪 backstop `long-text / export-dialog` (20 fixture cases x 2 formats x 2 modes = 80 executed cases)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#exercised EVERY id in HOSTILE_CASE_IDS, not a subset"
        status: pass
    human_judgment: false
  - id: D3
    description: "No mode can recover a value redacted at WRITE time — the fact the amended confirmation copy states (research P-06, decision D-07)"
    requirement: "UI-06"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#cannot recover a value that was redacted at WRITE time — identical in BOTH modes (P-06, D-07)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The exported FILE carries the UI-09 floor statement when a contributing artifact is degraded — a header comment in the delimited format, a top-level field in the structured one — and none when the analysis was complete"
    requirement: "UI-06"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#carries the statement as a leading comment line in the delimited format"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#carries the same statement as a top-level field in the structured format"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#embeds the floor statement in the FILE when a contributing artifact is degraded"
        status: pass
    human_judgment: false
  - id: D5
    description: "Chunk concatenation is byte-identical to a single pass, with the header emitted exactly once — asserted over REAL database rows as well as the synthetic 50,000-row measurement"
    requirement: "UI-06"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#csv/json: two chunks concatenated are byte-identical to one pass, header ONCE"
        status: pass
      - kind: integration
        ref: "packages/backend/src/store/export.spec.ts#concatenates chunk by chunk into the SAME bytes a single pass produces, over REAL rows"
        status: pass
      - kind: unit
        ref: "tests/export-payload-budget.spec.ts#EXPORT_RPC_CHUNK_ROWS is DERIVED from the measurement (4 cases, now importing the constant from production code)"
        status: pass
    human_judgment: false
  - id: D6
    description: "A zero-row export returns the EXPLICIT empty outcome and never a header-only document, and the dialog disables the action with the reason stated on the button (Open Decision D3)"
    requirement: "UI-06"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/export.spec.ts#answers the EXPLICIT empty outcome for zero rows — never a header-only document"
        status: pass
      - kind: unit
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#is DISABLED with the reason on the button itself"
        status: pass
    human_judgment: false
  - id: D7
    description: "Exactly one audit row records each COMPLETED export, its kind naming the mode; none records an intermediate chunk and none records a failure"
    requirement: "UI-06"
    verification:
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#writes EXACTLY ONE audit row for a five-call export, not one per chunk"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#writes NO audit row when the export fails partway"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#names the mode in the audit KIND — raw and redacted are different records"
        status: pass
      - kind: integration
        ref: "packages/backend/src/index.spec.ts#carries the row count and the format in the detail, and NO value and NO URL"
        status: pass
    human_judgment: false
  - id: D8
    description: "Nothing is written on the server: the serialiser contains no filesystem or hosted-delivery call, and the shipped bundle's whole import set is still one specifier"
    requirement: "UI-06"
    verification:
      - kind: other
        ref: "node -e \"…/writeFile|createWriteStream|hostedFile|mkdtemp|tmpdir/.test(export.ts)…\" — exits 0"
        status: pass
      - kind: other
        ref: "pnpm check:bundle — packages/backend/dist/index.js: 1 import specifier(s): crypto"
        status: pass
    human_judgment: false
  - id: D9
    description: "Redacted is pre-selected AND focused; raw requires actively choosing the second option and then confirming the destructive dialog; there is no remember-this-choice affordance"
    requirement: "UI-06"
    verification:
      - kind: automated_ui
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#pre-selects AND focuses the redacted option on open"
        status: pass
      - kind: automated_ui
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#appears for raw, exports NOTHING yet, and focuses the way OUT of it"
        status: pass
      - kind: automated_ui
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#has NO remember-this-choice affordance — the control set EQUALS this list"
        status: pass
      - kind: automated_ui
        ref: "packages/frontend/src/App.spec.ts#OPENS the dialog and issues NO export call — the whole point of the row"
        status: pass
    human_judgment: false
  - id: D10
    description: "The destructive confirmation carries the amended D-07 copy VERBATIM, and the two sentences it was amended to remove are gone"
    requirement: "UI-06"
    verification:
      - kind: automated_ui
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#is VERBATIM — every string is inside 05-UI-SPEC.md's own copy row"
        status: pass
      - kind: automated_ui
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#renders the amended copy, string-equal to the shared constant"
        status: pass
      - kind: automated_ui
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#puts the destructive colour on EXACTLY ONE button, and it is the raw confirm"
        status: pass
    human_judgment: false
  - id: D11
    description: "A failed export keeps the dialog open with the redaction choice exactly as the operator set it, writes no partial file, and says so"
    requirement: "UI-06"
    verification:
      - kind: automated_ui
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#stays open, says so, delivers nothing, and leaves a RAW selection RAW"
        status: pass
      - kind: automated_ui
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#disables with its own label, refuses dismissal, and issues no second call"
        status: pass
    human_judgment: false
  - id: D12
    description: "The chunks are requested and concatenated IN ORDER and delivered as a browser download named by the backend (decision D-04's mechanism)"
    requirement: "UI-06"
    verification:
      - kind: automated_ui
        ref: "packages/frontend/src/components/ExportDialog.spec.ts#requests three chunks IN ORDER and concatenates them IN ORDER before delivering"
        status: pass
    human_judgment: false
  - id: D13
    description: "Whether Caido's RPC actually carries an 8 MiB chunk — the live confirmation 05-02 asked this plan to make"
    requirement: "UI-06"
    verification: []
    human_judgment: true
    rationale: "LIVE-ONLY, and unchanged from 05-02's own disclosure. Nothing in this repository can push bytes through Caido's RPC, so the 8 MiB per-call figure remains a BUDGET this project sets rather than a ceiling it measured. 05-02 asked plan 05-11 to confirm it against a real Caido before the export ships; this plan could not, and says so rather than implying it did. A human must exercise a large export against a running Caido. Recorded in .planning/WINDOWS.md as an unrun-verify."

# Metrics
duration: 40 min (across two sessions — see Issues Encountered)
completed: 2026-08-31
status: complete
---

# Phase 05 Plan 11: Export — CSV/JSON, Formula Neutralisation, Blob Download Summary

**The inventory serialises to both formats through the engine's one field rule, carries its own UI-09 floor statement into the file, crosses the RPC in measured 20,000-row chunks that concatenate byte-identically, leaves exactly one audit row per completed export, and lands as a Blob download on the operator's own machine — redacted unless they twice say otherwise.**

## Performance

- **Duration:** ~40 min of active execution, spread across two sessions
- **Started:** 2026-08-29T03:51:10Z
- **Completed:** 2026-08-31T10:13:59Z
- **Tasks:** 3
- **Files created/modified:** 16 (6 created)

## Accomplishments

- **`export.ts` writes no file anywhere.** Decision D-04 made literal: the module returns bytes, contains no filesystem call, no temporary path and no hosted-delivery mechanism, and an acceptance gate greps the source to keep it that way. The forbidden identifiers are deliberately not written out in the file the gate reads.
- **One field rule, imported not reimplemented.** `csvField`/`csvRow`/`csvHeader` come from `@defminer/engine/csv`, so the exported bytes and the rule 05-03's specs assert are the same code. The engine's rule is deliberately stronger than R3's letter (P5-D10) and this module inherits that strength rather than correcting it.
- **The backstop row has executed evidence.** 20 hostile-fixture cases × 2 formats × 2 modes = 80 executed cases, each asserting no field's first content character is a dangerous lead and that no C0/C1 control and no bidi override survives into the bytes — plus an id-set equality against `HOSTILE_CASE_IDS`, so a case added to the corpus fails here until it is accounted for.
- **The floor statement is in the FILE**, not only in the view: a leading `# ` comment line in the delimited format, a top-level `floor` field in the structured one, absent when the analysis was complete.
- **Exactly one audit row per completed export**, on the chunk that completes it, with the kind naming the mode. A five-call export produces one row; a failure produces none.
- **Two deliberate acts for raw**, with the amended D-07 copy used verbatim — asserted against 05-UI-SPEC.md's own row read off disk at test time, and with the two removed sentences asserted gone.
- **`EXPORT_RPC_CHUNK_ROWS` moved out of `tests/`**, discharging the debt 05-02 recorded, with its derivation left where the 50,000-row measurement lives.

## Task Commits

1. **Task 1 (RED): the serialiser's spec** — `92e2369` (test)
2. **Task 1 (GREEN): `export.ts`, both formats, the shared rule, the embedded floor** — `136b6e3` (feat)
3. **Task 2 (RED): the endpoint and audit specs** — `3feecfc` (test)
4. **Task 2 (GREEN): the endpoint, its chunking and its one audit row** — `7dfe175` (feat)
5. **Task 3: `ExportDialog.vue`, the two gates and the download** — `8715520` (feat)
6. **Repair: the CORE-11 derived-residual span** — `ec07910` (fix)

## Files Created/Modified

- `packages/backend/src/store/export.ts` — both serialisers, the per-column redaction policy, the embedded floor statement, the chunk reader. No SQL, no path.
- `packages/backend/src/store/export.spec.ts` — 100 cases, including the 80-case hostile sweep.
- `packages/engine/src/contract.ts` — `EXPORT_FORMATS`, `EXPORT_REDACTION_MODES` (redacted first).
- `packages/backend/src/api/spec.ts` — the `exportInventory` entry, `ExportRequest`, `CONTRACT_VERSION` 2 → 3.
- `packages/backend/src/index.ts` — the endpoint, registered on the success path only, with the completion audit row.
- `packages/frontend/src/api/client.ts` — the guarded `exportInventory` method and the mirrored chunk types; `FRONTEND_CONTRACT_VERSION` 2 → 3.
- `packages/frontend/src/components/ExportDialog.vue` — the dialog.
- `packages/frontend/src/components/export-contract.ts` — the copy, verbatim, in one place.
- `packages/frontend/src/components/export-download.ts` — the Blob/anchor/revoke mechanism and the only DOM reach.
- `packages/frontend/src/App.vue` — the toolbar action that opens the dialog and never exports.
- `tests/export-payload-budget.spec.ts` — now imports the constant from production code and still derives it.

## Decisions Made

Ten, recorded in STATE.md as **P5-D83 … P5-D92**. The three worth reading here:

- **P5-D83 — the redacted mode withholds a URL's query and fragment, not the whole URL.** Withholding the whole URL would leave the safe default useless and every operator would pick raw, defeating the design. What the query actually carries is the residual `observations.ts` *discloses* rather than closes: values were replaced at write time, but the **name half of a genuine pair is retained whatever it contains**, including a credential pasted where a parameter name goes. That residual is precisely what raw exposes and redacted withholds, which is what makes the two modes a real choice rather than a ceremony.
- **P5-D89 — the audit row belongs to the chunk that completes the export.** Per call, a five-chunk export leaves five records of one disclosure and the log becomes unreadable at exactly the moment somebody is reading it. Written at the start, a failed export would be recorded as a disclosure that never happened.
- **P5-D90 — the contract bump is a deliberate over-bump, recorded as one.** Adding an endpoint name obliges no bump under the shape rule. It is bumped anyway because the export is the first result the frontend assembles across several calls into a *file on the operator's disk*, which outlives the session with nothing on its face saying which version wrote it.

## Deviations from Plan

### Auto-fixed / structural

**1. [Rule 2 — Missing Critical] `EXPORT_FORMATS` and `EXPORT_REDACTION_MODES` moved to `packages/engine/src/contract.ts`**
- **Found during:** Task 2 (the frontend client)
- **Issue:** The dialog must render the two radios in the order the design contract fixes, so it needs the redaction list as a **value**. The two packages cannot import each other, so the alternative was a second copy in the frontend — of a list whose *order* is the safety property.
- **Fix:** Both vocabularies declared once in the shared engine contract, beside `SCAN_STATES` and `TRIAGE_STATES`; `export.ts` imports rather than declares them.
- **Files modified:** `packages/engine/src/contract.ts`, `packages/backend/src/store/export.ts`, `packages/backend/src/store/export.spec.ts`
- **Committed in:** `7dfe175`

**2. [Rule 3 — Blocking] `export-contract.ts` and `export-download.ts` added beyond the plan's file list**
- **Found during:** Task 3
- **Issue:** The acceptance criterion requires the confirmation copy be "read as a fixture constant rather than retyped", and `panel-contract.ts` is this package's established home for exactly that. Separately, naming `Blob`, `URL` or `HTMLAnchorElement` inside a `.vue` file fails the lint program, which carries no DOM lib — the same wall `safety/display.ts`'s `copyToClipboard` documents.
- **Fix:** Copy into `export-contract.ts`; the DOM reach into `export-download.ts`, structurally off `globalThis`. The second also makes the dialog's assembly loop testable without a DOM that can download.
- **Files modified:** two new frontend modules
- **Committed in:** `8715520`

**3. [Rule 2 — Missing Critical] the export request carries a keyset cursor as well as a chunk index**
- **Found during:** Task 2
- **Issue:** The plan's return shape named a chunk index and no cursor. 05-UI-SPEC.md's table contract **bans `OFFSET`** and `reads.ts` has no offset statement to answer one with, so an index alone cannot find chunk *N*'s rows.
- **Fix:** The response carries `nextCursor`; the frontend hands it back. The index survives and is not redundant — it is what decides the header, the floor comment and the audit row (P5-D87).
- **Committed in:** `7dfe175`

**4. [Rule 3 — Blocking] `readContributingArtifactCounts` placed in `export.ts` rather than `index.ts`**
- **Found during:** Task 2
- **Issue:** The endpoint needs the two UI-09 counts to embed the floor statement; `index.ts` is the ordering-contract file and should stay thin.
- **Fix:** A helper in `export.ts` over `reads.ts`'s already-audited `countInventory` — no new statement.
- **Committed in:** `7dfe175`

**5. [Rule 1 — Bug] the chunk-count assertion in the serialiser spec was wrong, and the code was right**
- **Found during:** Task 1
- **Issue:** Six rows at a ceiling of two took **four** calls, not three. A keyset page that *fills* cannot know whether the partition ended at its last row.
- **Fix:** The expectation corrected to 4, with the reasoning written beside it: the call returning zero rows is the call that learns the export is over, and in the structured format it is also the call that closes the document. Asserting three would have been asserting a lookahead this module deliberately does not do.
- **Committed in:** `136b6e3`

---

**Total deviations:** 5 (2 missing-critical, 2 blocking, 1 bug). **Impact:** no scope creep. Four are structural placements the plan's file list did not anticipate; the fifth corrected a test expectation rather than the code.

## Issues Encountered

- **Execution was interrupted by a stream stall after the task-2 RED commit (`3feecfc`) and completed on resume.** HEAD was left red — 15 failing tests, all of the expected "spec exists, implementation does not" shape — for the duration of the gap. No work was lost and no committed spec was weakened, deleted or rewritten to make the GREEN half pass. Recorded here because it belongs in the record rather than being invisible; the duration figure above spans two sessions and is not 40 minutes of wall clock.
- **The known `requirements.mark-complete` defect fired for the sixth time.** Marking UI-06 and UISEC-02 prettified `.planning/REQUIREMENTS.md` and inserted seven blank lines into the machine-owned CORE-11 derived-residual span that `outbound-prohibition.spec.ts` byte-compares. The **backend** suite went red (1 of 457). Repaired in `ec07910` by re-applying only the two checkbox flips to the pre-call bytes, so the span is byte-identical rather than reformatted to look right; the gate is green again at 457/457.
- **Lint and typecheck disagree about `globalThis`.** The package typecheck carries the DOM lib and `tsconfig.eslint.json` does not, so a direct `globalThis as DownloadDom` is required by one and reported as an unnecessary assertion by the other. Resolved by widening through `unknown` first, which is true under both, with the reason written where a reader will hit it.

## Known Stubs

None. Every surface this plan added is wired end to end and asserted.

## Threat Flags

None. The register's seven entries (T-05-56 … T-05-62) are each mitigated by a named executed case; no new security-relevant surface was introduced beyond what the register anticipated.

## User Setup Required

None — no external service configuration.

## Next Phase Readiness

- **05-12 (the Health tab) is unblocked** and is the last plan of this phase. It is the first consumer of the `getStatus`/`getCompat` pair, still deliberately unwrapped in the frontend client (P5-D52).
- **One disclosed residual carries forward, unchanged from 05-02:** the 8 MiB per-RPC-call figure is a **budget this project sets, not a ceiling measured from Caido**. Nothing in this repository can push bytes through Caido's RPC. 05-02 asked this plan to confirm it against a real Caido before the export ships; it could not, and coverage entry **D13** routes that to a human rather than claiming it. A large export against a running Caido is the check.
- **A second, smaller residual, disclosed rather than closed:** a *retried* last chunk mints a new export id and records a second audit row. That is the safe direction for an audit log — over-recording a disclosure beats under-recording it — but it means the audit count is an upper bound on completed exports, not an exact one.
- The standing project residual is unchanged: SQLite query plans were measured on 3.51.0/3.53.4, not Caido's shipped 3.46.0. That is a **performance** disclosure and touches none of this plan's correctness claims.

---
*Phase: 05-workspace-operator-workflow*
*Completed: 2026-08-31*

## Self-Check: PASSED

All six created source files exist on disk; all seven commits (`92e2369`, `136b6e3`,
`3feecfc`, `7dfe175`, `8715520`, `ec07910`, `524a09b`) resolve in `git log`. The
plan-level verification was re-run in full after the last source commit:
`pnpm test` 2,172 passed / 56 files, `pnpm typecheck`, `pnpm lint`, `pnpm knip`,
`pnpm check:bundle` (one specifier: `crypto`), `pnpm check:css` (109 rules
prefixed), `pnpm check:externals` (one bare import: `vue`) all exit 0. The
CORE-11 byte-compared span was re-verified green (457/457) after the
`requirements.mark-complete` repair.
