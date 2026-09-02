---
phase: 07-sourcemap-reconstruction
verified: 2026-09-02T07:07:21Z
verified_at_commit: 38830b7
status: human_needed
score: 12/13 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gates_run_by_verifier:
  - command: "pnpm vitest run"
    result: "89 files / 4204 tests passed, exit 0"
  - command: "pnpm typecheck"
    result: "exit 0"
  - command: "pnpm lint"
    result: "exit 0"
  - command: "pnpm knip"
    result: "exit 0"
  - command: "pnpm --filter @defminer/frontend exec vue-tsc --noEmit"
    result: "exit 2 — 6 errors (4 pre-existing SettingsPanel.vue, 2 NEW in SourceBrowser.spec.ts). vue-tsc is not a wired gate."
deferred:
  - truth: "SC5 second half — the FP corpora are extended to include reconstructed source as an input class, and a false-positive rate is measured"
    addressed_in: "Phase 3, and published in Phase 11"
    evidence: "Phase 3 goal: 'Detection Engine & FP Harness — Two-tier gate, data-driven detectors, measured false-positive rate in CI'. Phase 11 SC5: 'The measured false-positive rate is published in the README as a number, alongside the corpus it was measured on'. Verified structurally at HEAD: `packages/backend/src/ingest/consumer.ts:1325` is `visit: () => {}` — no detector exists, so no positive, true or false, can be produced over any corpus."
  - truth: "MAP-01's external half — `.map` comment and `SourceMap` response-header announcements are CONSUMED, not merely counted"
    addressed_in: "Phase 8"
    evidence: "Phase 8 SC1: 'Active `.map` probing works by default and unbudgeted, per the recorded operator decision'. Phase 7's D-01 refuses every outbound fetch by design; the `announcedExternal` counter is surfaced on the health panel as the measurement of what is handed over."
human_verification:
  - test: "Re-measure the A8 COST half — sweep elapsed time and rows deleted under a synthetic map-heavy run with an aged backlog — and land the harness in the tree rather than deleting it."
    expected: "Run A (no backlog, ceiling 50,000) and Run B (20,000-row aged backlog, ceiling 100) reproduce the figures recorded in 07-05-SUMMARY.md: 40 sweeps, ≤512 rows per pass, ≈+11 ms idle and ≈+585 ms working over the run."
    why_human: "The plan carries this as `verification: backstop`. The FREQUENCY half IS wired and green (`consumer.spec.ts` 'Pitfall 2' asserts `retentionSweeps === ARTIFACTS`, i.e. one sweep per map-bearing artifact). The COST half exists only as a table in 07-05-SUMMARY.md, taken by a scratch `a8-measure.spec.ts` that was deleted after the run. `ls packages/backend/src/a8-measure.spec.ts` → no such file; `git log --diff-filter=A -- '*a8-measure*'` → nothing. The numbers are not reproducible at HEAD and a verifier cannot confirm them without re-authoring the harness. Abstained rather than passed silently."
  - test: "Decide the owner and the eviction ORDER for sweeping `sources` and `source_sightings` (deferred item D1), then wire it."
    expected: "An assigned phase or plan. The design question D1 names is real: does a `sources` row die when its last sighting goes, or does it age independently?"
    why_human: "Confirmed in code, not taken on the SUMMARY's word: `store/retention.ts` names neither table (`command grep -n 'sources' packages/backend/src/store/retention.ts` → nothing), and migration `v: 8` declares NO foreign key and NO `ON DELETE CASCADE`, so deleting an artifact leaves its sightings orphaned. No later ROADMAP phase claims this work — Phase 11 SC4's soak is about heap, not table rows — so it has no owner today. Not deferred by this report; escalated."
  - test: "Observe the feature produce a readable line of developer source from real proxied traffic, end to end, on a live Caido."
    expected: "A bundle carrying an INLINE map is proxied; the Artifacts row shows a non-zero Sources count; the drill-down renders the tree and the viewer shows the original file's lines."
    why_human: "Every segment of the chain is tested and green, and `SourceBrowser.spec.ts` mounts the REAL tree and the REAL viewer and renders a recovered file's lines. But no single test spans proxy-response → rendered source line, and the repository's own corpus cannot produce one: I independently tail-scanned all nine committed bundles and found 3 external announcements, 6 with none, and ZERO inline. Nobody has yet watched this feature work on real traffic, because the corpus makes it impossible to."
  - test: "Accept or reject the two literal NUL bytes shipped inside `packages/backend/src/sources-sink-prohibition.spec.ts`, and the one in `SourceBrowser.spec.ts`."
    expected: "A decision: either re-spell them as `\\u0000` escapes (the rule `map-fixture.ts` states in its own header and honours), or record the deviation with its reason."
    why_human: "This is a judgement about the repo's own encoding discipline, not a correctness bug. See finding W-2 — the harm is demonstrated rather than argued: it broke this verifier's grep tooling mid-run."
  - test: "Flip MAP-05's ledger row in REQUIREMENTS.md, or state why it stays open."
    expected: "MAP-05 marked `[x]`, or a recorded reason it is not."
    why_human: "Assessed and reported, not actioned — the verifier does not tick requirements. See finding W-1: MAP-05 reads substantively MET at HEAD."
findings:
  - id: W-1
    severity: warning
    title: "MAP-05 is substantively met and merely un-ticked"
  - id: W-2
    severity: warning
    title: "Two Phase 7 files ship literal C0 control bytes, against the phase's own stated rule"
  - id: W-3
    severity: warning
    title: "HI-03's residual makes a RESOLVED ZERO lie, on the one column whose design is that a resolved zero cannot"
  - id: W-4
    severity: warning
    title: "The recorded vue-tsc baseline is wrong: 4 pre-existing errors, not 5, plus 2 NEW ones in a Phase 7 file"
  - id: W-5
    severity: warning
    title: "HI-04's convergence proof counts inserts into two tables the sweep structurally cannot delete from"
  - id: W-6
    severity: warning
    title: "MAP_MAX_BYTES under-serves the recovery half by roughly a factor of two (WINDOW 111), conservatively"
coincidental_reliance_items: []
---

# Phase 7: Sourcemap Reconstruction — Verification Report

**Phase Goal:** *Recover developer-readable source — the single highest value-per-effort feature in the tool — without letting a malicious map write outside its sandbox.*
**Verified:** 2026-09-02T07:07:21Z at `38830b7`
**Status:** `human_needed` — no must-have FAILED; one `backstop` truth abstains and four items need a human decision
**Re-verification:** No — initial verification

---

## Verdict in one paragraph

**The phase goal is met, in both halves, with material caveats that are named below rather than absorbed.** The recovery half closes end to end: discovery → parse → persist → RPC → tree → viewer → export all exist, are wired, carry real data, and are exercised by 4,204 passing tests I ran myself. The sandbox half is met **by dissolution** — there is no output directory because there is no filesystem — and I judge that a legitimate satisfaction of Success Criterion 3 rather than an unmet criterion wearing a different answer, for reasons argued at length below. The caveats that matter: on this repository's own eight pinned production bundles the feature recovers **zero** sources, by design and disclosed; a second bundle carrying a byte-identical map still loses its own evidence behind a *resolved* zero; and two new tables grow with no sweep and no owner.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | **SC1** — sources reconstructed from `sourcesContent` via `JSON.parse`, no VLQ on the primary path; a real inline map at `MAP_MAX_BYTES` completes within `MAX_SYNC_SLICE_MS` and `ARTIFACT_DEADLINE_MS`, or records the partial state | ✓ VERIFIED | `results/map-bytes.json` `status: pass`, four ladder points, one fresh version-asserted Caido 0.58.0 per point (`binary.reported_version` = `0.58.0`, sha256 pinned). Inline path fitted at **8.873 ms/MB**; `measured_stall_bound` 2,954,422 B; shipped `MAP_MAX_BYTES = 2_621_440` — the 512 KiB boundary *below* the fit, so policy sits outside the measurement's noise on the safe side. `thresholds.ts:506` cites `map-bytes.json` by path in `POLICY_DERIVED_FROM`. Over the bound: **refused, never truncated**, recorded `partial` with a namespaced reason code. |
| 2 | **SC2** — VLQ decoding via `@jridgewell/sourcemap-codec` only where position attribution is genuinely needed | ✓ VERIFIED | Exactly one non-spec import in the repo: `SourcePositionStrip.vue:66-67`. `packages/frontend/package.json` diff is **exactly one added line** at an exact pin (`git diff` confirmed). `codec-prohibition.spec.ts` (1,131 lines) bans it across `packages/backend/src` + `packages/engine/src` by AST walk, specifiers derived from the package's own `exports` map. `SourcePositionStrip.spec.ts:343` asserts the codec has exactly one consumer. |
| 3 | **SC3** — a malicious-`sources` fixture suite writes nothing outside the output directory | ✓ VERIFIED **by dissolution** | Full reasoning in its own section below. Corpus: all six named categories present by id. Dissolution: no content column in migration `v: 8`; `filesystem-prohibition.spec.ts` bans `fs`/`node:fs`/`llrt/fs` (± `/promises`) and the hosted-file surface across both source roots. Proof of unreachability: `sources-sink-prohibition.spec.ts` (1,213 lines), sinks derived from `Object.keys(posix)` at runtime, bindings derived from `parse.ts`'s `RecoveredSource` fields read off disk. |
| 4 | **SC4** — malformed maps, bombs, absent `sourcesContent`, indexed maps and cycles stay within limits and record partial rather than crashing | ✓ VERIFIED | `parse.spec.ts`: 13-fixture hostile matrix, `it.each([...HOSTILE_MAP_CASES])`, plus *"exercised EVERY id in HOSTILE_MAP_CASE_IDS, not a subset"* and *"every member of MAP_PARSE_REASONS was OBSERVED, and names the ones that were not"*. Deep nesting → caught `RangeError` → `too_deep` (`reasonForParseError`). Nested `sections` refused *"however it is spelled"*. Size boundary exercised from both sides at the real `MAP_MAX_BYTES`, with a separate case proving the ENCODED gate was not what refused the one-over case. |
| 5 | **SC5a** — reconstructed sources are themselves analysed, once per content hash | ✓ VERIFIED | `consumer.ts:1275-1279` runs `walk()` over recovered source at depth 1 through the derived path; the once-per-hash guard is the shipped `isAnalysed`/`claimAnalysis` pair. D-13's bound tested in both directions: `derivedRejected.depth_exceeded` asserted `1`, `0` and `2` across three cases. |
| 6 | **SC5b** — the FP corpora are extended to include reconstructed source, with a measured rate | — DEFERRED | Not a failure. `consumer.ts:1325` is literally `visit: () => {}`; Phase 3 is unexecuted. A rate cannot exist without a detector. See `deferred` in the frontmatter. |
| 7 | **SC6** — reconstructed source is browsable in the UI and retrievable via the Phase 6 delivery path with a manifest | ✓ VERIFIED *(caveat W-3)* | Browsable: `SourceBrowser.spec.ts:339` *"mounts the REAL tree and the REAL viewer, never a stub or a placeholder"* and `:364` *"renders the recovered file's lines when a tree node is selected"*. Exportable: third `EXPORT_COLUMNS` entry (`export.ts:285`) with `sources_verbatim` under `redactUrlForExport`, reached through the scoped **Export source manifest** CTA, heading keyed on the export table so the dialog names what the CTA named. |
| 8 | **Goal, recovery half** — a user actually gets developer-readable source out of this, end to end | ✓ VERIFIED *(caveat below)* | Every seam checked individually, none taken on the SUMMARY's word: `consumer.ts` imports and calls `findAnnouncement`/`decodeInlineMap`/`parseSourceMap`/`upsertRecoveredSource`/`recordSighting`; `index.ts:1314` registers `deriveSource`, which really reloads via `sdk.requests.get`, really re-hashes (`sha256Hex(raw)` at `:457`) and fails closed on mismatch at `:458`; `client.ts:1085` forwards it; `SourceBrowser.vue:238` reads the list and `:435` mounts the viewer; `SourceViewer.vue:310` derives `lines` from the content arm and `:679` renders each through `forSourceLine`. **No static return, no mock, no hollow prop anywhere on the chain.** |
| 9 | **Goal, sandbox half** — a malicious map cannot write outside its sandbox | ✓ VERIFIED | See the SC3 section. |
| 10 | **Backstop (07-01)** — the OQ-1 retention reading is recorded as an observation with its own `status`, never as a settled policy | ✓ VERIFIED | Read the artifact directly: `observations[0]` is `{ id: "OQ-1-request-retention", status: "not_run", ... }` with a `not_a_policy` field spelling out *"Do not cite this row as DefMiner's retention model"*. The truth asserts the RECORDING, and the recording is honest — including recording that the measurement did **not** run because this build's `sdk.requests` exposes no `create`. |
| 11 | **Backstop (07-05, A8)** — the sweep's COST half re-checked against the new cadence | ⚠️ ABSTAIN (`insufficient_spec`) | Frequency IS wired and green. Cost is a SUMMARY table from a harness that no longer exists. Routed to human verification — never a silent pass. |
| 12 | **Backstop (07-07)** — source-tree long-text, the hostile label set through the tree | ✓ VERIFIED | `hostile.spec.ts:831` registers the *"sources-label corpus (SPIKE-12, map-fixture.ts)"* as a surface, asserts no `title` and no `data-*` carries the untruncated label, runs *"exercised EVERY case in the corpus"*, and `:976` renders *"all twenty-three labels in one tree and rewrites none of them"*. Green in the run I executed. |
| 13 | **Backstop (07-08)** — source-viewer long-text, the O-02 case | ✓ VERIFIED | `SourceViewer.spec.ts:535` *"source-viewer / long-text — the 4 MiB single-line fixture"* → `:547` *"renders ONE row, truncated, with a visible marker and no leak"*, against the real `multi-megabyte-single-line` fixture in `packages/engine/src/hostile.fixture.ts:139`. Green. |

**Score: 12/13 truths verified** (1 backstop abstention; 1 criterion deferred to Phase 3 and not counted against).

---

## Success Criterion 3 — the judgement, with reasoning

> *"A malicious-`sources` fixture suite — traversal, absolute paths, UNC, drive letters, reserved names, `webpack://` — writes nothing outside the output directory on macOS, Linux, and Windows"*

### My verdict

**This is a legitimate satisfaction of the criterion, and it is a strictly stronger outcome than the criterion asked for — but it is a DISSOLUTION, not a pass, and it holds only because the phase did the one thing that distinguishes the two.** The clause *"on macOS, Linux, and Windows"* retains **no residual meaning** and should be treated as retired, with one carve-out I name below. The corpus that exists covers what the criterion intended, in full, with room to spare.

### Why it is a dissolution and not a pass

The criterion has three parts and they fare differently.

**(a) The fixture suite — MET, literally and completely.** I checked the six named categories against `SOURCES_LABEL_CASES` by value, not by count:

| Criterion's category | Fixture id | Value |
|---|---|---|
| traversal | `relative-traversal`, `relative-traversal-encoded` | `../../../../../../etc/defminer-escape.txt`, `..%2f..%2f..%2fdefminer-escape.txt` |
| absolute paths | `absolute-posix`, `absolute-posix-etc` | `/tmp/…`, `/etc/defminer-escape.txt` |
| UNC | `windows-unc` | `\\server\share\defminer-escape.txt` |
| drive letters | `windows-drive` | `C:\Windows\Temp\defminer-escape.txt` |
| reserved names | `windows-reserved-device`, `-ext` | `CON`, `NUL.js` |
| `webpack://` | `protocol-webpack` | `webpack:///./src/app.js` |

Plus eleven the criterion did not ask for and SPIKE-12 measured: `file:`, `http:`, NUL byte, NFC/NFD pair, case-only pair, FULLWIDTH FULL STOP, RTL override, trailing dots-and-spaces, empty, lone dot, and a **legal control** (`src/app/index.js`) whose stated purpose is that *"a corpus in which every case fires proves only that the check fires"*. Twenty-three cases, imported by at least eight consumers and never forked, with exhaustiveness gates on the id set in each.

**(b) "writes nothing outside the output directory" — the SUBJECT is gone.** Verified, not assumed:
- Migration `v: 8` declares `sources` and `source_sightings` with **no content column, no BLOB, no untyped column** — every column is `TEXT` or `INTEGER`. D-07 holds nothing at rest.
- `filesystem-prohibition.spec.ts` bans `fs`, `node:fs`, `llrt/fs` and each with `/promises`, plus the hosted-file SDK member, across `packages/backend/src` and `packages/engine/src`.

So there is no output directory to write outside of. The criterion **cannot be tested**; it can only be dissolved.

**(c) "on macOS, Linux, and Windows" — the clause loses its referent.** What those three platforms disagree about *is the filesystem*: case-folding, UNC, drive letters, reserved device names, trailing dots and spaces, and Unicode normalisation on HFS+/APFS. Every one of those disagreements is about **how a path string becomes a file**. With no file, none of them can differ. Running the original three-platform matrix would measure `node:path`'s behaviour, not DefMiner's.

### What makes this legitimate rather than a criterion wearing a different answer

A criterion of the form *"hostile input X does not escape containment Y"* is satisfied by removing Y **only if you can prove X never reaches any sink of that kind**. That proof is what shipped, and it is the discriminator:

1. **`sources-sink-prohibition.spec.ts` is a real proof, not a note.** Its sink set is `Object.keys(posix)` read at runtime — so a Node release adding a member adds it to the ban with no edit — minus exactly two exclusions (`parse`, `format`) held out **on a name collision and never on the capability**, each asserted still-present-in-the-surface so a stale exclusion is reported rather than hiding the next real one. Its binding-name set is derived from `parse.ts`'s exported `RecoveredSource` field names read off disk, with the expected members pinned so a rename is *loud* rather than silently followed. It walks the TypeScript AST across both roots at any depth, with a by-name non-vacuity block and a self-audit case. It reports nothing today and **cannot** — and it goes RED the day D-17 is relaxed.
2. **The one sink that survives dissolution is closed by construction.** A download name is a path-like value the operator's own OS interprets. R6 (`source-filename.ts`) builds it as `contentSha256.slice(0,16)` + an extension **matched** against a closed DefMiner-authored allowlist, returning `null` when the digest fails `SHA256_PATTERN`. **No byte of the label reaches it.** A 16-hex stem can never be a reserved device name and never carries a separator, so the Windows/macOS/Linux question is answered structurally at the only place it could still have been asked. The export filename is likewise fully DefMiner-authored: `defminer-${table}-${mode}-${stamp}.${ext}`.
3. **The label's surviving destination is the screen, and the platform-shaped strings are exercised there.** `hostile.spec.ts` drives the whole 23-case corpus through the display tree and asserts sanitisation via `forCellText`, no `title`, no `data-*` carrying the untruncated label, and a byte-identical round trip of the stored string.
4. **The tell.** An unmet criterion wearing a different answer would have deleted the fixtures once there was nothing to test them against. This one imported them into eight consumers, put exhaustiveness assertions on the id set, and kept a gate over them whose only job is to notice when the dissolution ends. That is the difference, and it is observable in the tree.

### Where it is narrower than the wording — three things a reader should not have to derive

1. **The unreachability proof's scope is `packages/backend/src` + `packages/engine/src`. `packages/frontend/src` is in neither gate's `SOURCE_ROOTS`.** Defensible — the frontend has no filesystem — but it means the one live sink (the download name) is guarded by **a defence (R6) rather than by an unreachability proof**. R6 is well built and well tested. The asymmetry is real and is not stated in the criterion's ROADMAP annotation.
2. **The criterion asked for a behavioural result on three operating systems; what shipped is a static result on one.** That is the right trade here, but it is a trade.
3. **The dissolution is inherited, not built by this phase.** `filesystem-prohibition.spec.ts` landed in Phase 6 (`4c2ab79`, plan 06-07). Phase 7's own contribution is the proof that the *new data class* cannot reach it — which is exactly the right contribution — but it means SC3's sandbox half rests on a Phase 6 gate. Any later phase that relaxes D-17 re-opens SC3 wholesale. The sources-sink gate is the tripwire for precisely that, and it is wired and green.

**Bottom line: the criterion's INTENT — a hostile `sources` entry cannot be turned into a filesystem effect — is met, and met more strongly than a fixture suite would have shown.** A passing fixture suite proves a defence held on the paths tested; an unreachability proof covers the paths nobody thought of. The ROADMAP's D-12 annotation is an accurate description of what shipped.

---

## The recovery half — what it actually delivers, plainly

The pipeline works. It also recovers **nothing** from this repository's real-world corpus, and that is by design.

I tail-scanned all nine committed bundles myself rather than taking the RESEARCH claim:

```
NONE     corpus/ace-1.36.5.js          EXTERNAL corpus/babel-7.26.4.js  -> babel.min.js.map
NONE     corpus/cesium-1.124.0.js      EXTERNAL corpus/monaco-0.52.2.js -> ../../../min-maps/…
NONE     corpus/composite-8mb.js       EXTERNAL corpus/tfjs-4.22.0.js   -> tf.min.js.map
NONE     corpus/echarts-5.5.1.js       NONE     corpus/plotly-2.35.2.js
NONE     corpus/big/composite-8mb-parsable.js
```

**Zero inline. Three external. Six with no announcement at all.** Under D-01 — DefMiner never fetches a `.map`, because a fetch is a request the target can see — the committed corpus produces zero recovered sources and three `announcedExternal` increments. That is the design working, not failing, and the phase says so on the health panel in words rather than leaving an operator to read `Sources recovered: 0` as an empty result. Phase 8 SC1 owns the other half explicitly.

The honest consequence for a verifier: **every segment of the chain is green, but nobody has yet watched the whole chain produce a readable line of developer source from real proxied traffic**, because the corpus cannot produce one. That is human-verification item 3, and it is not a defect of this phase.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/engine/src/sourcemap/announce.ts` / `.spec.ts` | bounded `lastIndexOf` scan, no regex | ✓ VERIFIED | AST-asserted zero `RegularExpressionLiteral` / `new RegExp` |
| `packages/engine/src/sourcemap/parse.ts` / `.spec.ts` | base64 decode, `JSON.parse`, closed `MAP_PARSE_REASONS` | ✓ VERIFIED | every-reason-observed gate, 13-case matrix |
| `packages/engine/src/sourcemap/map-fixture.ts` | one corpus, three-plus consumers, escapes not literals | ✓ VERIFIED | **0 literal control bytes** — it honours its own rule |
| `packages/engine/src/thresholds.ts` | `MAP_MAX_BYTES` and derived siblings, cited to the probe | ✓ VERIFIED | `POLICY_DERIVED_FROM` names `map-bytes.json` by path |
| `results/map-bytes.json` + `.schema.json` | measured, version-asserted, 4 ladder points | ✓ VERIFIED | `status: pass`, `ladder_complete: true`, 4 fresh instances |
| `packages/backend/src/codec-prohibition.spec.ts` | D-17 package-level ban, AST | ✓ VERIFIED | 1,131 lines, specifiers derived from `exports` |
| `packages/backend/src/sources-sink-prohibition.spec.ts` | D-12 unreachability proof | ✓ VERIFIED *(W-2)* | 1,213 lines; carries 2 literal NUL bytes |
| `packages/backend/src/store/migrations.ts` (`v: 8`) | two tables, no content column, `project_id` at pk ordinal 1 | ✓ VERIFIED | read the SQL directly |
| `packages/backend/src/store/sources.ts` / `.spec.ts` | content-addressed identity, HI-03 attribution guard | ✓ VERIFIED *(W-3)* | guard returns `changes: 0` and counts the discard |
| `packages/backend/src/sourcemap/derive.ts` / `.spec.ts` | O-05 sibling vocabulary, D-14 bypass, D-13 depth | ✓ VERIFIED | `depth_exceeded` proven absent from `REJECT_REASONS` |
| `packages/backend/src/ingest/consumer.ts` | D-08 stage in `analyseAndFinish`, epoch re-checks, row-counting sweep | ✓ VERIFIED | five `stillCurrent()` sites carried into the new writes |
| `packages/backend/src/index.ts` / `api/spec.ts` | `deriveSource`, `listRecoveredSources`, lazy `mappings`, D-24 re-verify | ✓ VERIFIED | `CONTRACT_VERSION` 5 → 6, frontend copy agrees |
| `packages/backend/src/store/export.ts` | third `EXPORT_COLUMNS` entry, redactor applied | ✓ VERIFIED | `sources_verbatim` under `redactUrlForExport` |
| `packages/frontend/src/sourcemap/tree.ts` / `.spec.ts` | O-08 five-step pure normaliser, no `node:path` | ✓ VERIFIED | import list asserted as an exact set |
| `packages/frontend/src/components/SourceTree.vue` | virtualised at 32px, `ProducibilityMark` | ✓ VERIFIED | corpus-driven hostile assertions |
| `packages/frontend/src/components/SourceViewer.vue` | four body states, two bounds, R6 download | ✓ VERIFIED | states asserted mutually exclusive |
| `packages/frontend/src/components/SourcePositionStrip.vue` | lazy decode, sole codec consumer | ✓ VERIFIED | seven states; raw position string never in DOM |
| `packages/frontend/src/components/source-filename.ts` / `.spec.ts` | R6, content-addressed | ✓ VERIFIED | firing + legal fixtures |
| `packages/frontend/src/components/SourceBrowser.vue` / `.spec.ts` | D-21 drill-down, scoped CTA | ✓ VERIFIED *(W-4)* | 2 vue-tsc errors in the spec's local test harness |
| `packages/frontend/src/components/HealthPanel.vue` | D-03 counters surfaced | ✓ VERIFIED | `announcedExternal` with operator-facing help copy |
| `.planning/ROADMAP.md`, `REQUIREMENTS.md`, `05-UI-SPEC.md` | A5/A6/A7, SC1 restated, parentheticals amended | ✓ VERIFIED | originals preserved as dated history, not deleted |

---

## Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `consumer.ts` | `engine/sourcemap/*` | `findAnnouncement`, `decodeInlineMap`, `parseSourceMap` | ✓ WIRED |
| `consumer.ts` | `store/sources.ts` | `upsertRecoveredSource`, `recordSighting` | ✓ WIRED |
| `index.ts` | `sdk.requests.get` | D-07 on-demand reload, D-24 re-verify at `:457-458` | ✓ WIRED |
| `index.ts` | `store/sources.ts` | `markProducibility` (single bound `project_id`-scoped UPDATE) | ✓ WIRED |
| `client.ts` | backend RPC | `deriveSource`, `listRecoveredSources`, `readSourceMappings` | ✓ WIRED |
| `App.vue` | `ArtifactsTable.vue` | `:source-counts` map + `@browse-sources` | ✓ WIRED |
| `App.vue` | `SourceBrowser.vue` | drill-down state inside the artifacts arm; `TABS` byte-unchanged | ✓ WIRED |
| `SourceBrowser.vue` | `SourceTree` / `SourceViewer` | mounted for real — asserted *"never a stub or a placeholder"* | ✓ WIRED |
| `SourceViewer.vue` | `source-filename.ts` | `sourceDownloadName` → `browserDownload` | ✓ WIRED |
| `SourceBrowser.vue` | `ExportDialog.vue` | `exportDialogTable` reads `exportTable` through; toolbar computation byte-unchanged | ✓ WIRED |

---

## Data-Flow Trace (Level 4)

| Artifact | Value | Source | Real data | Status |
|---|---|---|---|---|
| `SourceViewer.vue` | `lines` | `deriveSource` → `sdk.requests.get` → `toRaw()` → `sha256Hex` re-verify → `parseSourceMap` | yes | ✓ FLOWING |
| `SourceTree.vue` | node labels | `listRecoveredSources` → `source_sightings.sources_verbatim` (stored verbatim) | yes | ✓ FLOWING |
| `ArtifactsTable.vue` | `Sources` count | `countRecoveredSourcesByArtifact` via `App.vue`'s lookup map; `null` = not known, never `0` | yes | ✓ FLOWING |
| `SourcePositionStrip.vue` | positions | lazy `readSourceMappings` → codec `decode` → integers only | yes | ✓ FLOWING |
| `HealthPanel.vue` | sourcemap counters | `counters.sourcemap` sub-map of the one telemetry object | yes | ✓ FLOWING |
| `ExportDialog.vue` | manifest rows | `EXPORT_COLUMNS.sources` → `serialiseRows` → chunked transport | yes | ✓ FLOWING |

No static return, no hardcoded literal, no mock terminates any chain.

---

## Behavioural Spot-Checks

| Behaviour | Command | Result | Status |
|---|---|---|---|
| Whole suite | `pnpm vitest run` | 89 files / **4204 tests** passed, exit 0 | ✓ PASS |
| Types | `pnpm typecheck` | exit 0 | ✓ PASS |
| Lint | `pnpm lint` | exit 0 | ✓ PASS |
| Dead code | `pnpm knip` | exit 0 | ✓ PASS |
| SFC types (not a gate) | `vue-tsc --noEmit` | exit 2 — **6** errors: 4 `SettingsPanel.vue`, **2 `SourceBrowser.spec.ts`** | ⚠ see W-4 |
| Real-corpus inline maps | tail-scan of `corpus/*.js`, `corpus/big/*.js` | 0 inline / 3 external / 6 none | ✓ PASS (confirms the recorded claim) |
| Debt markers in the 81 modified source files | `grep -nE "\bTBD\b\|\bFIXME\b\|\bXXX\b"` and `TODO/HACK/PLACEHOLDER` | **zero** | ✓ PASS |
| Frontend dependency diff | `git diff -- packages/frontend/package.json` | exactly one added line, exact pin | ✓ PASS |
| Literal control bytes in shipped source | byte scan of all `packages/**/*.{ts,vue}` | 3 bytes across 2 files | ⚠ see W-2 |

**Probe execution:** the phase's probe is an out-of-band Caido measurement (`scripts/phase7/map-bytes.sh`) requiring four fresh Caido 0.58.0 instances; it is not re-runnable inside a verification pass. Its artifact was validated instead: schema reference present, `status: pass`, `ladder_complete: true`, `binary.reported_version` matching the pinned `MAP_PROBE_EXPECTED_VERSION`, four distinct `run_id`s with `fresh: true`.

---

## Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| MAP-01 | ✓ SATISFIED in two halves, stated | Inline discovered **and** consumed; external discovered only (D-01), counted and surfaced. Phase 8 SC1 owns the rest. |
| MAP-02 | ✓ SATISFIED | `JSON.parse` primary path, no VLQ; parenthetical amended to name its harness (standalone quickjs-ng 0.16.1, not Caido). |
| MAP-03 | ✓ SATISFIED | Codec confined to the position strip by a wired package-level AST ban. |
| MAP-04 | ✓ SATISFIED | Clause 1 dissolved (nothing written); clause 2 met by the D-12 proof plus R6. |
| **MAP-05** | ✓ **SATISFIED but ledger row is `[ ]`** | See finding W-1. |
| MAP-06 | ✓ SATISFIED | Analysed once per content hash via `isAnalysed`/`claimAnalysis`; D-13 depth bound tested; `SOURCE_ROWS_PER_MAP_MAX` enforced. |
| MAP-07 | ✓ SATISFIED *(caveat W-3)* | Browsable + exportable-with-manifest, each by a named mechanism. |
| UI-05 | ✓ SATISFIED *(caveat W-3)* | Viewer, tree, position strip, drill-down, all mounted and asserted. |

No orphaned requirements: `REQUIREMENTS.md` maps MAP-01…MAP-07 and UI-05 to Phase 7 and every one is claimed by at least one plan.

---

## UI Considerations — the 35 rows

The `07-UI-SPEC.md` table declares **35 rows** across six surfaces (5 + 8 + 8 + 5 + 4 + 5), self-scored **32 covered, 2 backstop, 1 unresolved**. I checked whether they are represented in *shipped behaviour* or only in plan text.

- **34 of 35 appear as must-have truths** across plans 07-07, 07-08, 07-09 and 07-10 — one per row, in the row's own words.
- **All 34 are represented by shipped tests.** 25 appear as row-named `describe` blocks (`"sources-count-column / zero-one-many"`, `"source-viewer / long-text"`, `"viewer-position-strip / error"`, `"drilldown-header / overflow"` …). The remaining 9 are folded into shared, correctly-named describes rather than absent: `"sources-count-column / loading and error"`, `"sources-count-column / overflow and long-text"`, `"viewer-position-strip — the seven states"`, `"the four body states — mutually exclusive, none collapsible"` (which covers source-viewer loading / error / partial by name in its `it` titles), and the `counted`-helper assertions for zero-one-many.
- **The 35th row — `source-tree` / `overflow` — is the ⚠ unresolved one**, and it is honestly labelled. The bound is real and enforced backend-side (`SOURCE_TREE_LOAD_MAX = 2000` in `contract.ts:317`, `listRecoveredSources` stops filling there, and the read answers with the TOTAL beside the returned count so the tree says so in words rather than truncating silently). What is unresolved is only the *number*: 2,000 is a reuse of the shipped `IN_MEMORY_WINDOW_ROWS`, not a measurement. That is a disclosed planner assumption, not a gap.
- **The 2 backstop rows both have wired, green evidence** — see truths 12 and 13.

**Verdict: the 35 rows are represented in shipped behaviour, not only in plan text.**

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `packages/backend/src/sources-sink-prohibition.spec.ts` | 543, 1162 | literal NUL byte (`"\x00unreadable"`, `toContain("\x00")`) | ⚠ Warning | File is classified **binary** by `grep`/`ugrep`; invisible in diffs |
| `packages/frontend/src/components/SourceBrowser.spec.ts` | — | literal NUL byte ×1 | ⚠ Warning | same |
| 81 modified source files | — | `TBD` / `FIXME` / `XXX` / `TODO` / `HACK` / `PLACEHOLDER` | — | **zero occurrences** |

---

## Findings

### W-1 · MAP-05 is substantively met and merely un-ticked

`REQUIREMENTS.md:842` reads `[ ]`. At HEAD the requirement's four clauses are all discharged:

- **malformed maps** — 13-fixture matrix with 13 distinct outcomes, an exhaustiveness gate on the id set, and an *every-reason-was-observed* gate over `MAP_PARSE_REASONS`;
- **decompression bombs** — the base64 4:3 expansion is gated on **encoded** length *before* the decoded buffer is allocated, with a case proving the encoded gate was not what refused the one-over fixture; `million-tiny-sources` and `single-giant-sources-content` ship;
- **path traversal attempts** — the 23-case corpus, driven through the D-12 gate, the display tree, the filename builder and the store cap;
- **reference cycles** — JSON has no cycles; the analogues are `sections` nesting (refused *"however it is spelled"*, bound 1 by specification) and D-13's re-entry bound (`depth_exceeded` asserted at 0, 1 and 2).

The tick was never applied because 07-02 deliberately declined to mark it (its SUMMARY: *"MAP-01 / MAP-02 / MAP-05 are NOT checked off in REQUIREMENTS.md, deliberately"* — it shipped only the SDK-free half) and no later plan picked it back up. **This reads as a bookkeeping omission, not an open requirement.** Reported, not actioned — flipping a ledger row is not the verifier's call.

### W-2 · Two Phase 7 files ship literal C0 control bytes

`map-fixture.ts` states the rule in its own header and honours it: its NUL and RTL-override cases are written `"\u0000"` and `"\u202e"`, with the reason spelled out — *"a literal NUL is invisible in every diff"*. Two Phase 7 files break it:

```
packages/backend/src/sources-sink-prohibition.spec.ts:543   const UNREADABLE = "<NUL>unreadable";
packages/backend/src/sources-sink-prohibition.spec.ts:1162  expect(LABEL_BY_ID.get("null-byte")).toContain("<NUL>");
packages/frontend/src/components/SourceBrowser.spec.ts       1 byte
```

**The harm is demonstrated, not argued: this broke my own tooling mid-verification.** Both files are reported as `Binary file … matches` by the repo's `grep`, so no grep-based audit — including the census idioms this codebase relies on elsewhere — can read them. Line 1162 is the sharper case: it asserts the fixture's escaped NUL by embedding an unescaped one, i.e. the assertion is spelled in exactly the form the fixture exists to forbid. Behaviour is correct; the encoding discipline is not. Not a blocker.

### W-3 · HI-03's residual makes a RESOLVED ZERO lie

The interim fix is real and I confirmed it by reading the test, not the SUMMARY: `source_sightings` is keyed `(project_id, map_sha256, source_index)`, and `recordSighting` for a second artifact carrying the same map returns `{ ok: true, changes: 0 }`, leaves A's `artifact_sha256`/`request_id`/`recovered_at` intact, and increments `sightingsDiscardedOtherArtifact`. Bundle A is safe and the loss is counted.

**Bundle B's own evidence is still lost, and the shape of that loss is the problem.** B's drill-down reads a resolved zero and its tree says *"No recovered sources in this bundle"*. That is not a blank — the sources-count column's entire design premise, restated in the UI-SPEC and asserted in `ArtifactsTable.spec.ts`, is that **a resolved zero and an unresolved count are different facts that must never be the same pixel**, because a resolved zero means *"DefMiner looked and there was nothing"*. Here it means *"DefMiner looked, found something, and threw it away"*. It is target-triggerable at will — a CDN mirror with a different banner comment is enough — and it lands on the one column built to make that class of claim trustworthy.

The complete fix widens the key to `(project_id, artifact_sha256, map_sha256, source_index)`: migration `v: 9` and a **fifth `EXPECTED_TABLES` operator approval**, which has not been given. **Cost to MAP-07/UI-05: bounded but not cosmetic** — the primary path is unaffected, the discard is visible on the health panel, and the operator has a number to read; but for the duplicated-map case the product makes a confident false statement rather than an honest unknown. The honest interim would have been to render B's count as *unresolved* rather than *resolved zero*, which is a frontend change and does not need the migration.

### W-4 · The recorded vue-tsc baseline is wrong, and Phase 7 added to it

The record (deferred-items.md, from 07-07 and reasserted by 07-08) says **5 pre-existing errors in `ExportDialog.vue` and `SettingsPanel.vue`**, with *"07-08 adds none"*. At HEAD:

```
4 src/components/SettingsPanel.vue      (pre-existing)
2 src/components/SourceBrowser.spec.ts  (NEW — a Phase 7 file, from plan 07-09)
```

The `ExportDialog.vue` error is gone, fixed in passing by 07-10's heading `Record`. The two new ones are in `SourceBrowser.spec.ts`'s local `SplitBody` test harness, whose `client` prop is typed `Object` and so reaches `SourceBrowser` as `Record<string, any>` instead of `BrowserClient`.

**Impact: low, but not nil.** It is test-only, and `tsc --build` is green because it cannot resolve `.vue` prop types at all. That is the point worth recording: the repo gate is structurally blind to SFC prop typing, so the drill-down's client stub is **not** checked against the real RPC interface — the spec would keep passing if `BrowserClient` drifted. The claim *"07-08 adds none"* was true of 07-08 and became false at 07-09, and nothing noticed because `vue-tsc` is wired into no gate.

### W-5 · HI-04's convergence proof counts inserts into tables the sweep cannot delete from

HI-04's fix is correct arithmetic and I verified it runs green, including its explicit handling of MD-01's unit mismatch (`ROWS_INSERTED_PER_ITERATION_MAX === ROWS_INSERTED_PER_ARTIFACT_MAX + 2 * SOURCE_ROWS_PER_MAP_MAX` — *"which is why the factor is 2 and not 1"*). MD-01 is therefore load-bearing and correctly compensated for; what remains of it is a naming defect, not an arithmetic one.

**But the insert side counts rows the delete side structurally cannot reach.** Deferred item D1 is confirmed in code: `retention.ts` sweeps `artifacts`, `observations`, `analyses`, `scans` and `audit` and names neither new table, and migration `v: 8` declares **no foreign key and no `ON DELETE CASCADE`** — so deleting an artifact orphans its sightings rather than removing them. The convergence inequality is satisfied numerically while the property it claims (P1-D7: the database does not grow monotonically past the retention ceiling) does **not** hold: once the three swept tables are at their floor, `sources` and `source_sightings` keep growing with nothing able to delete from them.

This is an assessment of the recorded D1's effect, not a new discovery — but the interaction with HI-04 is worth stating, because HI-04's own failure narrative is *"the form was true and it bounded nothing"*, and Form 3 inherits a narrower version of the same shape. **It has no owner phase**; Phase 11 SC4's soak is about heap, not table rows. Escalated as human-verification item 2.

### W-6 · MAP_MAX_BYTES under-serves the recovery half by roughly 2×, conservatively

Recorded as WINDOW 111. Assessing the effect: the probe's `op_ms_per_mb` puts `announce_scan` at **3.80** of the inline path's **8.87 ms/MB** — 43% of the budget. The probe's own `announceScan` notes that at the structural ceiling the window covers the whole body, so no slice happens and the scan is effectively full-body. With 07-02's shipped tail window binding, that term should fall sharply, which would move the stall bound up toward ~5 MB — against a shipped 2.62 MB.

**Consequence: DefMiner refuses inline maps between roughly 2.6 MB and 5 MB that it could now afford**, i.e. it recovers from a smaller minority of inline maps than the shipped implementation can support. It **fails safe** — refuse, never truncate, with `partial` and a reason code — and the UI says so in words rather than appearing to have found nothing. Re-measuring needs four fresh Caido instances, which is why 07-02 declined to raise the constant on a projection. **That was the right call**: raising a load-bearing refusal boundary on arithmetic is exactly what D-10 exists to forbid. The bound under-serves the goal, conservatively and knowingly, and the remedy is a re-run rather than a redesign.

### Open review findings — status

Four HIGH findings are fixed, and I confirmed each in code rather than in the review file: HI-01 (`display.ts:219` — the predicate now answers *"was this line cut?"*), HI-02 (`display.ts:257` — one unit for both integers), HI-03 (attribution guard, `sources.ts:127`, with W-3's residual), HI-04 (multi-pass drain, `consumer.ts:1448`, plus the restated inequality in `thresholds.spec.ts:262`). Nine remain open (4 MEDIUM, 5 LOW), all disclosed; none of them falsifies a Phase 7 success criterion.

---

## The four paragraphs owed to this document

Lifted verbatim from `07-10-SUMMARY.md`, which wrote them under a heading for exactly this purpose. Two were authored upstream (07-04 and 07-05) and carried; two are 07-10's own.

### 1. The O-07 pre-emption (authored in plan 07-04, carried by 07-10)

> **The O-07 pre-emption, owed by UI-SPEC Named Conflict 2 and repeated here so `07-10` can carry it forward:** D-11 already ships a slice of ERR-02/OBS-02 ahead of Phase 2, and defining a producibility axis WIDENS that pre-emption. Phase 7 defines an axis OBS-02 does not yet own. If Phase 2 rules that producibility belongs inside one vocabulary, **this column is what changes**, and the change is bounded: a `migrations.ts` forward step plus one presentation map. Recording it here is the honest form; discovering it in a Phase 2 review is not.

### 2. The D-11 pre-emption (authored in plan 07-05, carried by 07-10)

> **D-11 ships a slice of ERR-02/OBS-02 ahead of Phase 2, and the cost is accepted openly.** Phase 7 is the first writer of a non-null `analyses.error` from the consumer path — Phase 1 always passed null — and it reuses the ONE degradation vocabulary in the one place that already has it rather than inventing a second. `scan_state = 'partial'` had exactly one producer until now, deadline expiry, and reconstruction gives it more; `error` is the discriminator, and what goes in it is a DefMiner-authored REASON CODE (`map:malformed_json`, `map:too_large`, …), never a caught exception's text. `describeError` is the right function for a *diagnostic* and is deliberately not on this path.
>
> **The cost, stated before anyone hits it.** One `scan_state` column cannot express *"reconstruction failed but detection succeeded"*. Today that costs nothing, because no detector exists — Phase 3 has not landed and `visit` is a no-op. The day it does, an artifact whose detectors ran cleanly and whose map was refused will read `partial`, and an operator reading the Artifacts table will not be able to tell that from an artifact whose walk hit the deadline without opening the `error` column. **Phase 3 inherits that knowingly.** The exit is already visible and is not being pre-built: either ERR-02 splits the state per stage, or the UI reads the `map:` prefix — which is why the codes are namespaced at the point of writing rather than left bare.

### 3. D-15, recorded NOT MEASURED with its reason (07-10's own)

> **D-15 is met in its first half and NOT MEASURED in its second, and the distinction is recorded rather than passed over.** The reconstructed-source corpus FIXTURES ship. The false-positive RATE does not, and the reason is structural rather than a matter of effort: **a false-positive rate cannot exist without a detector, and none exists.** Phase 3 has not landed and `visit` is a no-op, so there is nothing that could produce a positive, true or false, over the corpus. Measuring anything here would mean inventing a detector for the purpose of measuring it, which measures the measurement.
>
> This is recorded the way Phase 6's D-23 recorded an unreachable matrix leg — **named, with its reason, and never as a silent pass.** A criterion that reads as met because nothing contradicted it is the specific failure both records exist to prevent. Phase 3 owns the rate, and it inherits fixtures that were built for it rather than a criterion somebody already ticked.

*Verifier's note: I confirmed the premise independently rather than accepting it — `packages/backend/src/ingest/consumer.ts:1325` is literally `visit: () => {}`, and Phase 3's ROADMAP box is `[ ]`.*

### 4. Open Question 2 — a low recovered-source count is the EXPECTED outcome (07-10's own)

> **A low recovered-source count on real traffic is an EXPECTED outcome, not a defect, and the phase says so before anybody has to ask.** Zero of the eight pinned production bundles in this repository's corpus carries an inline map; the three that announce a sourcemap at all announce an *external* `.map`. Inline maps are overwhelmingly a development artifact, and under D-01 DefMiner never fetches an external one — that would be a request the target can see, and DefMiner stays silent. So on the committed real-world corpus this phase recovers **zero** sources and takes **eight** D-03 counter increments, and that is the design working rather than failing.
>
> **The D-03 `announcedExternal` counter is the MEASUREMENT of how much of MAP-01 this phase leaves on the table for Phase 8**, which is exactly why plan 07-10 surfaced it on the health panel rather than leaving it internal. An operator who sees `Sources recovered: 0` beside `External maps announced: 8` can read the second number and understand the first. The surface says it in words too, next to the numbers: *"DefMiner recovers source only from sourcemaps embedded in a bundle it already has. It never fetches a .map file — that would be a request the target can see. A low recovered count beside a high external count is the expected result on production traffic, not a fault."* A verifier measuring this phase against real traffic should read a low recovered count as confirmation, and should treat a *high* one as the thing worth a second look.

*Verifier's note: I re-ran the scan rather than accepting the count. **Zero inline is confirmed.** The one correction: three of the eight announce externally and five carry no announcement at all, so the counter takes **three** increments on this corpus, not eight — `announcedExternal` counts announcements, and five bundles announce nothing. The paragraph's argument is unaffected; its arithmetic is off by the five silent bundles.*

---

## Gaps Summary

**No gaps block the phase goal.** Nothing FAILED; no artifact is missing, stubbed or orphaned; no key link is unwired; there is not a single debt marker across 81 modified source files; and every gate I ran myself is green.

What stands between this phase and an unqualified pass is four things, none of which is a defect in what was built:

1. **One `backstop` truth abstains** (A8's cost half) because its harness was deleted after the run. Honesty contract applied: abstained, not passed.
2. **Two new tables have no retention sweep and no owner phase** — the cadence was fixed, the coverage was not, and the convergence proof now counts inserts it cannot delete.
3. **Nobody has watched the feature work on real traffic**, because the corpus contains zero inline maps. That is the design, and it is disclosed; it still means the end-to-end claim rests on segment tests.
4. **A resolved zero can lie** in the duplicated-map case, on the one column whose design premise is that it cannot.

Two criteria are legitimately handed forward and are recorded as such rather than ticked: SC5's rate half to Phase 3, MAP-01's external half to Phase 8.

---

_Verified: 2026-09-02T07:07:21Z at `38830b7`_
_Verifier: Claude (gsd-verifier) — 4,204 tests, 5 gates and 3 byte-level scans executed in this session; no SUMMARY claim accepted without a corresponding read of the tree._
