---
phase: 07-sourcemap-reconstruction
verified: 2026-09-02T14:06:58Z
verified_at_commit: aaac947
status: human_needed
score: 20/20 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 12/13
  previous_commit: 38830b7
  gaps_closed:
    - "W-3 / HI-03 residual — `source_sightings`' PK widened to `(project_id, artifact_sha256, map_sha256, source_index)` at migration `v: 9`; the resolved zero on the `Sources` column can no longer mean 'DefMiner looked, found something, and threw it away'"
    - "W-2 — all three literal NUL bytes re-spelled as escapes; an independent byte scan of every `packages/**/*.{ts,vue}` finds ZERO C0 control bytes"
    - "W-1 — MAP-05 ticked in REQUIREMENTS.md with a dissolution note; the machine-owned span survived (`outbound-prohibition.spec.ts` green)"
    - "W-5 / UAT gap 1 — `retention.ts` now sweeps BOTH new tables in the operator's cascade order; the convergence inequality's insert side finally counts rows the delete side can reach"
    - "UAT gap 2 — `packages/backend/src/a8-measure.spec.ts` is committed, runnable and asserts BOUNDS (Run A and Run B) rather than the deleted scratch harness's wall-clock timings"
    - "UAT test 1 / prior human item 3 — the feature was observed producing readable developer source from real proxied traffic on a live Caido at `df5b101`"
    - "HI-03, HI-04 and all nine open round-1 review findings (MD-01…MD-04, LO-01…LO-05) — each re-checked against the shipped property, not against the commit that claims it"
  gaps_remaining: []
  regressions: []
  still_open_by_operator_decision:
    - "W-4 — `vue-tsc` is wired into no gate. RE-MEASURED at HEAD: exit 2, exactly 6 errors, 4 `SettingsPanel.vue` + 2 `SourceBrowser.spec.ts`. Unchanged across all seven plans. Accurately recorded as open."
    - "W-6 — `MAP_MAX_BYTES` under-serves recovery ~2x. CONFIRMED untouched: `git diff` on the constant is empty and every plan carries the prohibition. Accurately recorded as open."
    - "UAT gap 3 — `tests/frontend-load.spec.ts` frame-budget backstop. Load-sensitive and pre-existing; PASSED in this verifier's run (12 tests, 8.2 s). Accurately recorded as open."
gates_run_by_verifier:
  - command: "pnpm vitest run"
    result: "90 files / 4302 tests passed, exit 0, 14.12 s"
  - command: "pnpm typecheck"
    result: "exit 0"
  - command: "pnpm lint"
    result: "exit 0"
  - command: "pnpm knip"
    result: "exit 0"
  - command: "pnpm build"
    result: "exit 0"
  - command: "pnpm --filter @defminer/frontend exec vue-tsc --noEmit"
    result: "exit 2 — 6 errors (4 pre-existing `SettingsPanel.vue`, 2 `SourceBrowser.spec.ts`). Not a wired gate. Matches the W-4 baseline exactly."
  - command: "byte scan for C0 controls across packages/**/*.{ts,vue}"
    result: "zero — W-2 closed"
  - command: "debt-marker scan (TBD/FIXME/XXX, TODO/HACK/PLACEHOLDER) over the 31 files this round modified"
    result: "zero"
deferred:
  - truth: "SC5 second half — the FP corpora are extended to include reconstructed source as an input class, and a false-positive rate is measured"
    addressed_in: "Phase 3, published in Phase 11"
    evidence: "Re-confirmed at HEAD, not carried forward on the prior report's word: `packages/backend/src/ingest/consumer.ts` still contains `visit: () => {}`. No detector exists, so no positive — true or false — can be produced over any corpus."
  - truth: "MAP-01's external half — `.map` comment and `SourceMap` response-header announcements are CONSUMED, not merely counted"
    addressed_in: "Phase 8"
    evidence: "Phase 8 SC1 owns active `.map` probing. D-01 refuses every outbound fetch by design; `announcedExternal` is surfaced on the health panel as the measurement of what is handed over."
coincidental_reliance_items:
  - truth: "Deleting an artifact takes its sightings with it: after a sweep no `source_sightings` row names an `artifact_sha256` with no surviving `artifacts` row in the same project"
    reason: incidental-ordering
    harden: "The invariant holds because `sweepToConvergence` re-runs, not because a pass enforces it. `deleteDigest` (retention.ts:1112-1193) cascades `observations` and `analyses` only; the sightings are collected in step 3d behind a `budget() > 0` guard, so a pass whose budget is consumed by the artifact loop returns having orphaned every evicted bundle's sightings. `retention.spec.ts:1337` drives `sweepToConvergence`, so the single-pass property is not the one under test. Either add `source_sightings` to the cascade in dependency order, or scope the module header's 'never a child with no parent' claim to the two children it actually covers."
human_verification:
  - test: "Decide WR-01: rewrite `RETENTION_SWEEP_MAX_PASSES`'s derivation, or lower the constant."
    expected: "`thresholds.ts`'s docblock and `retention.ts:178-180` agree on one number, and the choice of 16 is re-derived from the real quotient."
    why_human: "Verified independently, not taken from the review. `ROWS_INSERTED_PER_ITERATION_MAX = 3 + 2048 = 2051` (thresholds.ts:490-491), so the inequality's right-hand side is `128 + 2051 = 2179`. The `RETENTION_SWEEP_MAX_PASSES` docblock (thresholds.ts:166, 177, 191) still computes the pre-07-14 `4,227` in three sentences and concludes 'Nine is the smallest integer that satisfies the inequality (4,227 / 512 = 8.26)'. The true quotient is 4.26, the smallest satisfying integer is 5 and the next power of two is 8, not 16. `retention.ts:178-180` writes the correct figure ('512 x 16 = 8,192 against 128 + 2,051 = 2,179'), so two files in one repository disagree. The constant 16 OVER-satisfies, so nothing is unsafe at runtime — but its stated derivation no longer produces it, and `thresholds.spec.ts:260-281` computes the inequality FROM the constants, so it is structurally unable to fail on this. I confirmed the drift is this round's own: at `4bd99c1` (07-14's row-unit gate) the docblock's 4,227 was still correct; `59347c3` retired the factor and left it behind. A judgement about which repair the operator wants, not a mechanical fix."
  - test: "Decide WR-02: put `source_sightings` inside `deleteDigest`'s cascade, or scope the module header's invariant to the two children it covers."
    expected: "Either every eviction removes its sightings in the same statement sequence as its observations and analyses, or `retention.ts:42-45` and `:389-390` say plainly that sightings are reaped as orphans by design and that the window closes on the next pass."
    why_human: "Reproduced from the code, not from the review. `deleteDigest` enumerates `OBSERVATION_KEYS_FOR_DIGEST_SQL` and `ANALYSIS_KEYS_FOR_DIGEST_SQL` and then runs `DELETE_ARTIFACT_SQL`; it never touches `source_sightings`. Step 3d's orphan collection is guarded by `budget() > 0` (retention.ts:927) with an `else { sightingsCapped = true; }` arm, so a pass that spends its whole budget on 512 childless artifacts returns with every one of those bundles' sightings orphaned. `workRemains` re-detects it through `ORPHAN_SIGHTINGS_SQL` (retention.ts:1347) so it converges across passes — but the module header states three times that the cascade cannot create that state, and this is now the ORDINARY path for every evicted map-bearing bundle rather than a crash-recovery corner. No data loss: `readSightingOrigin` LEFT JOINs `artifacts`, and the anti-join errs toward keeping `sources` rows alive. Which of the two repairs is correct depends on whether the operator's UAT cascade choice meant 'in the same statement sequence' or 'in the same pass'."
  - test: "Decide WR-03: is a vite/webpack loader query analytic content the operator should see, or a residual the redactor should cut?"
    expected: "Either the docblock stops claiming that a non-URL label has no query axis and `SOURCES_LABEL_CASES` gains a relative `?` case, or `redactSourceLabelForExport` cuts wherever a query axis is present rather than wherever the label is protocol-shaped."
    why_human: "Confirmed independently. `redactSourceLabelForExport` (export.ts:273-275) delegates to `redactUrlForExport` only when `isProtocolShapedLabel` is true, and that predicate is `'://' at a positive index with the next character a slash, OR one of four known schemes`. The stated premise at export.ts:255-256 — 'A label that is not a URL has neither axis' — is false for the ordinary vite/webpack shape `src/App.vue?vue&type=script&lang.ts`, which `classify()` puts in `relative`. Those tails now export VERBATIM in redacted mode where they were previously cut at the `?`. I re-checked the corpus by id: `SOURCES_LABEL_CASES` holds 23 entries and NOT ONE contains a `?`, so `export.spec.ts`'s corpus passes identically in both modes and the narrowing is untested in the direction that changed. Counterweight, stated so this is not overread: the value still passes `stripForExport` and `csvField`, so there is no injection, and a bundler's loader query is not the credential class `redactUrlForExport` was written for. This is the safe mode disclosing more than it did, on a premise that is factually wrong, with no coverage — a scope judgement, not a bug fix."
  - test: "Accept or repair IN-01: `derivedRejected.depth_exceeded` fires on `parsed.recovered.length > 0` rather than on whether anything was actually admitted for recursion."
    expected: "A decision, plus the pinning case `consumer.spec.ts` lacks — a map whose every `sourcesContent` entry is empty, asserting `depth_exceeded === 0`."
    why_human: "Read at `consumer.ts:1272-1287`. The comment above the gate names ONE inaccuracy (the log message's count over-states). The COUNTER shares the same condition, so if every recovered source is subsequently refused by `admitDerived` — all empty, or all over `DERIVED_SOURCE_MAX_BYTES`, both reachable from one hostile map — no recursion would have been attempted and the counter still increments. `telemetry.ts:317-322` states the unit as 'one reconstruction stage that DECLINED TO RECURSE'. Magnitude is one increment per map-bearing artifact against the 781 that MD-03's fix removed, and no health surface carries the counter, so this is not a reason to reopen MD-03. Whether the residual is worth a second local is a judgement."
findings:
  - id: WR-01
    severity: warning
    title: "`RETENTION_SWEEP_MAX_PASSES`'s derivation still computes the retired 4,227; `thresholds.ts` and `retention.ts` disagree, and the spec is structurally blind to it"
    introduced_by: "this round (07-14, commit 59347c3)"
  - id: WR-02
    severity: warning
    title: "`deleteDigest` cascades two children of three, so an eviction creates orphan sightings by construction — the state the module says three times it cannot create"
    introduced_by: "this round (07-13)"
  - id: WR-03
    severity: warning
    title: "LO-04's narrowing rests on a premise the vite/webpack loader-query shape falsifies, and the 23-label corpus contains no `?` to notice"
    introduced_by: "this round (07-16)"
  - id: IN-01
    severity: info
    title: "The hoisted depth refusal counts a stage in which nothing could have recursed"
  - id: IN-02
    severity: info
    title: "`DERIVED_MAX_DEPTH` is a value import used only inside `{@link}` prose — lint, typecheck and knip all pass over it"
  - id: IN-03
    severity: info
    title: "`ORPHAN_SIGHTINGS_SQL`'s comment says it selects 'the four key columns'; it selects three (`project_id` is bound, not selected)"
---

# Phase 7: Sourcemap Reconstruction — Verification Report (re-verification after gap-closure round 1)

**Phase Goal:** *Recover developer-readable source — the single highest value-per-effort feature in the tool — without letting a malicious map write outside its sandbox.*
**Verified:** 2026-09-02T14:06:58Z at `aaac947`
**Status:** `human_needed` — no must-have FAILED, no gap remains open, four items need an operator decision
**Re-verification:** Yes — after the seven-plan gap-closure round (07-11 … 07-17)

---

## Verdict in one paragraph

**The round did what it said it did, and I checked each closure against the shipped property rather than against the commit that claims it.** Every gap the prior report and the UAT left open is closed in code: the sighting key is widened and the resolved zero can no longer lie; both new tables are swept in the operator's cascade order by anti-join and never a foreign key; the A8 harness is committed and asserts bounds; the three literal NUL bytes are gone; MAP-05 is ticked. The two things I was asked to weigh independently both hold up — **WR-01 and WR-02 are real, and WR-02 is the more interesting of the two** because it is not a stale comment but a live gap between what the cascade does and what the module says it does. **WR-03 is real too, and it is the one with a security direction**: the safe export mode now discloses more than it used to, on a bundler shape that is ordinary rather than hostile, justified by a sentence that is factually wrong and covered by nothing. None of the three falsifies a must-have; all three are the kind of defect this repository's own discipline exists to catch, which is why they are named rather than absorbed. **The traceability question has a clean answer: the ledger is NOT stale.**

---

## Goal Achievement

### Observable Truths

Rows 1–9 are the ROADMAP contract, re-checked as a regression. Rows 10–20 are the round's own must-haves, verified in full.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | **SC1** — sources reconstructed from `sourcesContent` via `JSON.parse`, no VLQ on the primary path; a real inline map at `MAP_MAX_BYTES` completes within budget or records the partial state | ✓ VERIFIED | Regression: `results/map-bytes.json` unchanged — `status: pass`, `ladder_complete: true`, four points each `reported_version: "0.58.0"`. `MAP_MAX_BYTES` untouched by every plan's prohibition, confirmed by `git diff`. |
| 2 | **SC2** — VLQ decoding only where position attribution is genuinely needed | ✓ VERIFIED | Regression: `codec-prohibition.spec.ts` green in the 4,302-test run; the codec's sole consumer is still `SourcePositionStrip.vue`. |
| 3 | **SC3** — a malicious-`sources` fixture suite writes nothing outside the output directory | ✓ VERIFIED by dissolution | Regression: `filesystem-prohibition.spec.ts` and `sources-sink-prohibition.spec.ts` both green; migration `v: 9` re-declares `source_sightings` with **no content column, no BLOB, no untyped column** — every column `TEXT` or `INTEGER`. The dissolution survives the schema change. |
| 4 | **SC4** — malformed maps, bombs, absent `sourcesContent`, indexed maps and cycles stay within limits and record partial | ✓ VERIFIED | Regression: `parse.spec.ts` green, and 07-14 **added** to the matrix (the pre-slice arithmetic refusal and the four-terminator scan) without losing a member of `MAP_PARSE_REASONS`. |
| 5 | **SC5a** — reconstructed sources analysed once per content hash | ✓ VERIFIED | Strengthened this round: MAP-06's aggregate half now has the production caller its docblock had claimed since Phase 7 shipped (`consumer.ts:1180` → `countSourcesForMap`). |
| 6 | **SC5b** — the FP corpora extended with a measured rate | — DEFERRED | Re-confirmed at HEAD rather than carried: `consumer.ts` still holds `visit: () => {}`. A rate cannot exist without a detector. |
| 7 | **SC6** — reconstructed source browsable in the UI and retrievable via the Phase 6 path with a manifest | ✓ VERIFIED — **W-3's caveat now removed** | Browsable and exportable as before, and the caveat that qualified this row in the prior report is gone: see rows 10–11. |
| 8 | **Goal, recovery half** — a user actually gets developer-readable source out of this, end to end | ✓ VERIFIED — **the prior report's central caveat is CLOSED** | The prior report abstained because no test spanned proxy-response → rendered source line and the committed corpus (0 inline / 3 external / 6 silent) could not produce one. `07-UAT.md` test 1 records this observed on real proxied traffic against a live Caido at `df5b101`: non-zero Sources count, rendered tree, readable lines. Chain re-checked at HEAD: `SourceBrowser.vue:83-84` imports and `:434`/`:450` mounts the real `SourceTree`/`SourceViewer`; `index.ts:492-493` re-hashes the reloaded body and compares against `origin.artifact_sha256`. |
| 9 | **Goal, sandbox half** — a malicious map cannot write outside its sandbox | ✓ VERIFIED | Row 3, plus R6's content-addressed download name unchanged (`SourceViewer.vue:370` → `sourceDownloadName`). |
| 10 | **W-3, first half (07-11)** — a `SourceRef` names four things and every single-sighting read and write binds all four; `readSightingOrigin` still reads `request_id` and `artifact_sha256` OUT of the database, so D-24 stays a control and not a tautology | ✓ VERIFIED | `spec.ts:401,446` and `client.ts:835,845` both carry required `artifactSha256`; `CONTRACT_VERSION` and `FRONTEND_CONTRACT_VERSION` are **both 7**. Traced the whole hop chain: `SourceBrowser.vue:240,311` → `client.ts` → `index.ts:396-401` `readSightingOrigin`. D-24's non-tautology confirmed at `index.ts:493`: the comparison is `digest !== origin.artifact_sha256` — the STORED row — with `index.ts:385-392` spelling out why comparing against the caller's value would be vacuous. |
| 11 | **W-3, second half (07-12)** — two bundles carrying a byte-identical map each keep their own evidence, and a resolved zero on the `Sources` column can no longer mean "found something and threw it away" | ✓ VERIFIED | Migration `v: 9` read directly (`migrations.ts:963-1002`): `PRIMARY KEY (project_id, artifact_sha256, map_sha256, source_index)`. `RECORD_SIGHTING_SQL`'s conflict target names all four (`sources.ts:175`) and the trailing attribution guard is **gone**. Behaviour is exercised, not inferred: `consumer.spec.ts:2011` "EVERY SIGHTING NAMES ITS OWN BUNDLE, and both bundles are present" with `sightingsRecorded === LABELS.length * 2`; `sources.spec.ts:371` "the SAME content in TWO bundles is ONE sources row and TWO sightings"; `sources.spec.ts:659` "gives BOTH bundles their own row when they carry the same map". All green in my run. |
| 12 | **The fifth approval is honest (07-12)** — `EXPECTED_TABLES` still holds exactly eight members with the word `eight` byte-unchanged, both occurrences of the approval count read FIVE, and the fifth event is dated and attributed | ✓ VERIFIED | Counted the array by hand: 8 members (`schema.spec.ts:95-104`). `FIVE` appears at `:31` and `:77`; `eight` is intact at `:31`, `:80`, `:88`. The fifth event's entry (`:57-75`) records what the operator was shown — both column lists, both keys, the version, the transient table name, the **row-volume cost** (781 → 1,562 rows for a duplicated map) and the irreversible half. A reader five phases from now can reconstruct the decision. `07-12-SUMMARY.md:157` records Option A answered at a `blocking-human` gate on 2026-09-02. |
| 13 | **Migration `v: 9` is re-runnable from every interruption state (07-12)**, and `SCHEMA_VERSION` evaluates to 9 without being restated | ✓ VERIFIED | Read the SQL: `CREATE TABLE IF NOT EXISTS` on both, `INSERT OR IGNORE`, `DROP TABLE IF EXISTS`, `RENAME`, `CREATE INDEX IF NOT EXISTS` — idempotent from any midpoint. `SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].v` (`migrations.ts:1125`), derived not restated. **No foreign key and no `ON DELETE CASCADE`**, as the operator's decision required. |
| 14 | **UAT gap 1 + W-5 (07-13)** — `sweepRetention` deletes from both `source_sightings` and `sources`, in the operator's cascade order, by anti-join and never a foreign key | ✓ VERIFIED *(see coincidental-reliance note and WR-02)* | `SIGHTINGS_OVER_AGE_SQL`, `SIGHTINGS_OLDEST_SQL`, `ORPHAN_SIGHTINGS_SQL`, `UNSIGHTED_SOURCES_SQL`, `DELETE_SIGHTING_SQL`, `DELETE_SOURCE_SQL` all present (`retention.ts:468-585`); step 3d runs sightings then sources with `sightingsCapped` deferring the anti-join. `retentionCounts` reports both tables (`:1371-1392`). Both bounds applied: `retention.spec.ts:1467` (age, strict cutoff), `:1493` (row, per table), `:1511` (eligible under both, deleted once). The `NOT IN` NULL trap is closed on both sides and `:1648` EXECUTES the dangerous half rather than asserting it. |
| 15 | **The eviction order the operator chose (07-13)** — a `sources` row dies with its LAST sighting and not before | ✓ VERIFIED | `retention.spec.ts:1373` "a source sighted from TWO bundles OUTLIVES the eviction of one" — content-addressed dedupe survives the sweep, which is the property the anti-join exists for. `:1573` proves a budget-exhausted sightings pass deletes NO `sources` row. `:1680` proves the anti-join still leaves a source its NULL-bearing neighbour does not name. |
| 16 | **UAT gap 2 (07-13, `verification: backstop`)** — the A8 cost half is reproducible at HEAD by a committed benchmark asserting BOUNDS, not timings | ✓ VERIFIED — **the prior report's abstention is discharged** | `packages/backend/src/a8-measure.spec.ts` exists at HEAD (20,013 bytes), is in the suite, and passed. Run A asserts `retentionDeleted === 0`, exact post-run row counts and `totalRows === ROWS_INSERTED_BY_RUN`; Run B asserts `retentionSweeps >= MAP_BEARING`, a per-pass cap, `retentionDeleted >= BACKLOG_ROWS` and bounded final counts. **No wall-clock assertion anywhere** — the prohibition held. This is the one truth the prior report abstained on; it is now wired and green. |
| 17 | **MD-01 / LO-01 / LO-02 (07-14)** — the aggregate map bound enforced in ROWS, the gate committed strictly BEFORE the `2 *` factor it compensated for, both cheap refusals moved ahead of their allocations, four line terminators, still no regex | ✓ VERIFIED | Row-unit gate at `parse.ts:363-380` with `ROWS_PER_RECOVERED_SOURCE`. `LINE_TERMINATORS` is a frozen four-member array including `\u2028`/`\u2029` (`announce.ts:144-148`); zero `RegExp` in the file. `decodeInlineMap` refuses on offsets at `parse.ts:204` **before** `payload = url.slice(...)` at `:207`. **The commit ordering is checkable and I checked it**: `git show 4bd99c1:thresholds.ts` still carries `2 * SOURCE_ROWS_PER_MAP_MAX`; `59347c3` retires it. The inequality was true at every commit. |
| 18 | **MD-03 / MD-04 / LO-03 (07-15)** — one depth refusal per stage, MAP-06's aggregate bound given a production caller, `sources_verbatim` cut on a code-POINT boundary | ✓ VERIFIED | Depth gate hoisted to the recursion call site (`consumer.ts:1272`); `consumer.spec.ts:2545` "fires ONCE PER STAGE" and `:2574` "emits ONE depth refusal and ONE log line for a map carrying many sources". Aggregate enforcer at `consumer.ts:1180` with the projected post-write total `max(existing, recovered)` — so a re-ingest that adds no rows is accepted, never refused `too_many_sources`. `truncateToCodePoints` at `sources.ts:531`, pinned by `sources.spec.ts:1159` (no unpaired surrogate at the 4,096th code unit) and `:1221` (a cap-length label in code points stored whole). |
| 19 | **LO-04 / LO-05 (07-16)** — a redacted export never reports a query withheld from a value that had none; `snapshotCounters` preserves array shape and is still a copy | ✓ VERIFIED *(premise unsound — WR-03)* | `redactSourceLabelForExport` (`export.ts:273-275`) delegates to the **shipped** `redactUrlForExport` and introduces no new vocabulary; `observations.url` never reaches it, so that column is byte-unchanged. `snapshotCounters` handles `Array.isArray(value)` via `value.map(copy)` (`telemetry.ts:971`) inside a recursive deep copy. The truth as WORDED holds — the cut happens *only* where a query axis exists. Its stated PREMISE does not; see WR-03. |
| 20 | **MD-02 (07-17)** — the display tree merges on the byte-identical verbatim segment, so two long sibling directories stay two nodes | ✓ VERIFIED | `Building.mergeKey` carries the raw segment and `displaySegment` carries the label separately (`tree.ts:386-388, 436, 530`). The import list is still exactly `["forCellText"]` — one import, asserted as an exact set. No Unicode normalisation, no case folding, no `node:path`. |
| 21 | **Every wired gate is green at HEAD** | ✓ VERIFIED | Run by me, not read: `pnpm vitest run` → **90 files / 4,302 tests, exit 0**; `typecheck`, `lint`, `knip`, `build` → all exit 0. This subsumes the 73-file / 3,444-test prior-phase regression scope. |

**Score: 20/20 truths verified** (row 6 deferred to Phase 3 and not counted against; 0 behavior-unverified — every state-transition and cleanup invariant in this round has a named passing test).

---

## What I checked independently, and what it changed

### WR-01 — confirmed, and it is this round's own drift

I did the arithmetic from the constants rather than from the review. `ROWS_INSERTED_PER_ARTIFACT_MAX = 3`, `SOURCE_ROWS_PER_MAP_MAX = 2_048`, and after 07-14 `ROWS_INSERTED_PER_ITERATION_MAX = 3 + 2048 = 2051`. The inequality's right-hand side is `RETENTION_SWEEP_EVERY_N + ROWS_INSERTED_PER_ITERATION_MAX = 128 + 2051 = 2179`.

`thresholds.ts:166` still reads `8,192 >= 4,227, which is ~1.9x headroom`; `:177` still argues against `Raising RETENTION_SWEEP_MAX_ROWS to 4,227`; `:190-191` still concludes `Nine is the smallest integer that satisfies the inequality (4,227 / 512 = 8.26)`. The true figures are `8,192 >= 2,179` (**3.76x**), quotient **4.26**, smallest satisfying integer **5**, next power of two **8**. Meanwhile `retention.ts:178-180` writes `512 x 16 = 8,192 against 128 + 2,051 = 2,179` — correct, and contradicting its own dependency.

I traced when it broke: at `4bd99c1` (07-14's row-unit gate) the docblock's `4,227` was still exactly right, because the `2 *` factor was still there. `59347c3` retired the factor and updated `ROWS_INSERTED_PER_ITERATION_MAX`'s own paragraph — which now correctly says *"the factor was retired second (2,179, exact)"* — and left the neighbouring derivation behind. `thresholds.spec.ts:260-281` asserts the inequality **computed from the constants**, so it passes and always will.

**Nothing is unsafe.** 16 over-satisfies a bound that got slacker. What is broken is that a load-bearing constant's stated derivation no longer evaluates to the constant, in a file whose entire discipline is that every threshold is derivable. **Reported, not repaired — a verifier does not move a threshold or rewrite its justification.**

### WR-02 — confirmed, and it is the sharper of the two

I read `deleteDigest` end to end (`retention.ts:1112-1193`). It enumerates observations, then analyses, then runs `DELETE_ARTIFACT_SQL`. `source_sightings` appears nowhere in it. Plan 07-13 added a third child table and put its collection in step 3d instead, behind `if (budget() > 0)` with an `else { sightingsCapped = true; }` arm (`retention.ts:927, 948-950`).

The failure is not contrived. A pass whose budget is consumed by 512 childless evictable artifacts ends with `budget() === 0`; step 3d is skipped; the pass returns having orphaned every one of those bundles' sightings. `workRemains` re-detects it (`:1347`) so the next pass repairs it — **it converges across passes, which is not what the module says.** The header (`:43-45`) claims a pass "never [leaves] a child with no parent", and `ORPHAN_OBSERVATIONS_SQL`'s comment (`:389-390`) says "The cascade below cannot create one — children go first." Those sentences were true when there were two children. And the orphan-sightings comment (`:483-486`) asserts the rows "are collected here **in the same pass**", which is exactly the claim the budget guard does not honour.

`retention.spec.ts:1337` drives `sweepToConvergence`, so the single-pass property is not under test. Impact is consistency and documentation, not loss — `readSightingOrigin` LEFT JOINs `artifacts`, and the anti-join errs toward keeping `sources` alive. **This is recorded as a coincidental-reliance item, `incidental-ordering`: the invariant holds because the loop re-runs, not because the pass enforces it.** Advisory, so it costs no score — but a reader who trusts the module's most emphatic paragraph will reason wrongly, and this is now the ordinary eviction path for every map-bearing bundle.

### WR-03 — confirmed, and it is the one with a direction

`isProtocolShapedLabel` (`export.ts:236-241`) is true only for `'://'` at a positive index with the next character a slash, or one of `webpack: file: https: http:`. `redactSourceLabelForExport` returns everything else **whole**.

The docblock's premise (`export.ts:255-256`) — *"A label that is not a URL has neither axis, so there is no query to withhold"* — is false. `src/App.vue?vue&type=script&setup=true&lang.ts` is what vite emits, routinely, into `sources`. It is relative, it is real, and it has a query axis. It now exports verbatim in redacted mode where it was previously cut at the `?`.

I checked the corpus by id rather than by count: `SOURCES_LABEL_CASES` holds 23 entries — traversal, absolute, UNC, drive letter, reserved device, `webpack://`, `file:`, `http:`, NUL, NFC/NFD, case pair, fullwidth, RTL override, trailing dots, empty, dot-only, benign control, 4 KiB — and **not one contains a `?`**. So the change is invisible to every corpus-driven assertion in `export.spec.ts`.

Two counterweights so this is not overread: the value still passes `stripForExport` and `csvField`'s formula neutralisation, so there is no injection; and a bundler's loader query is not the credential class `redactUrlForExport` was written for. **It is still the safe mode disclosing strictly more than it did, on an ordinary rather than hostile shape, justified by a sentence that is wrong, with no test.**

### Traceability — the ledger is NOT stale

Three executors (07-12, 07-15, 07-16) declined a `mark-complete` mutation their plans prohibited. I checked the file rather than the reasoning. **All eight of this phase's requirement rows are `[x]` on disk:**

| Row | REQUIREMENTS.md | State |
|---|---|---|
| MAP-01 | `:838` | `[x]` |
| MAP-02 | `:839` | `[x]` |
| MAP-03 | `:840` | `[x]` |
| MAP-04 | `:841` | `[x]` |
| MAP-05 | `:842` | `[x]` — ticked at UAT with the dissolution note (closes W-1) |
| MAP-06 | `:843` | `[x]` |
| MAP-07 | `:844` | `[x]` |
| UI-05 | `:884` | `[x]` |

The skips were correct: the boxes were already ticked, the plans prohibited touching the file, and `outbound-prohibition.spec.ts` — which byte-compares the machine-owned `DERIVED RESIDUAL` span — passed in my run, so that span is byte-identical too. **No ledger repair is owed.**

### The three operator-deferred items — confirmed still open, and accurately recorded

| Item | Recorded as | Re-measured at HEAD |
|---|---|---|
| **W-4** — `vue-tsc` is wired into no gate | open, out of scope | exit 2, **exactly 6** errors: 4 `SettingsPanel.vue` (430, 446, 461, 481) + 2 `SourceBrowser.spec.ts` (259, 267). Unchanged across all seven plans, as claimed. |
| **W-6** — `MAP_MAX_BYTES` under-serves recovery ~2x | open, needs four fresh Caido instances | `MAP_MAX_BYTES` and every D-10-derived constant untouched; the prohibition is present in all seven plans. |
| **UAT gap 3** — `frontend-load.spec.ts` frame budget | open, pre-existing, load-sensitive | Passed in my run (12 tests, 8,195 ms). Its load-sensitivity is unaddressed, correctly, and it has no owner yet. |

None of these is reported as a new gap.

---

## Required Artifacts (this round)

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/backend/src/api/spec.ts` | `SourceRef` with `artifactSha256`, `CONTRACT_VERSION` 7 | ✓ VERIFIED | `:401`, `:446`, `:203` |
| `packages/frontend/src/api/client.ts` | mirrored `SourceRef`, `FRONTEND_CONTRACT_VERSION` 7 | ✓ VERIFIED | `:835`, `:845`, `:159` — the two copies agree |
| `packages/backend/src/store/migrations.ts` | migration `v: 9`, PK widening, no FK, no cascade | ✓ VERIFIED | `:963-1002`, read as SQL not as a claim |
| `packages/backend/src/store/schema.spec.ts` | eight members, five approvals, fifth event dated | ✓ VERIFIED | `:31`, `:57-95` |
| `packages/backend/src/store/sources.ts` | four-column conflict target, no guard, code-point cut, `countSourcesForMap` with a real caller | ✓ VERIFIED | `:175`, `:531`, `:638` |
| `packages/backend/src/store/retention.ts` | sightings trim, orphan cascade, `sources` anti-join, `retentionCounts` | ✓ VERIFIED *(WR-02)* | `:468-585`, `:905-1050`, `:1362-1392` |
| `packages/backend/src/a8-measure.spec.ts` | committed A8 benchmark, bounds not timings | ✓ VERIFIED — **NEW** | 20,013 bytes; Run A `:343`, Run B `:391`; zero wall-clock assertions |
| `packages/engine/src/thresholds.ts` | `ROWS_INSERTED_PER_ITERATION_MAX` with the factor retired | ⚠️ VERIFIED WITH DEFECT | `:490-491` correct; the `RETENTION_SWEEP_MAX_PASSES` docblock at `:154-197` is stale — **WR-01** |
| `packages/engine/src/sourcemap/parse.ts` | row-unit gate, pre-slice refusal | ✓ VERIFIED | `:363-380`, `:204-207` |
| `packages/engine/src/sourcemap/announce.ts` | four terminators, bounded slice, zero regex | ✓ VERIFIED | `:144-148`, `:238`; no `RegExp` node in the file |
| `packages/backend/src/ingest/consumer.ts` | depth gate at the call site, aggregate enforcer | ✓ VERIFIED *(IN-01, IN-02)* | `:1272`, `:1180` |
| `packages/backend/src/telemetry.ts` | `derivedRejected` docblock in the per-stage unit, `snapshotCounters` array-safe, counter removed | ✓ VERIFIED | `:280` (removal recorded), `:310-345`, `:971` |
| `packages/backend/src/store/export.ts` | manifest redactor applied where its subject exists | ⚠️ VERIFIED WITH DEFECT | `:236-275`, `:385` — the premise is unsound, **WR-03** |
| `packages/frontend/src/sourcemap/tree.ts` | merge on the verbatim segment | ✓ VERIFIED | `:386-388`, `:436`, `:530`; import list still exactly `["forCellText"]` |

---

## Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `SourceBrowser.vue` | `client.ts` | `sourceRef` carrying `artifactSha256` (`:240`, `:311`) | ✓ WIRED |
| `client.ts` | `spec.ts` | `SourceRef` shape, both `CONTRACT_VERSION`s at 7 | ✓ WIRED |
| `spec.ts` | `index.ts` `reloadVerifiedBundle` | bundle digest survives the hop (`:361`, `:396-401`) | ✓ WIRED |
| `index.ts` | `sources.ts` `readSightingOrigin` | four-column bind; digest read OUT of the row (`:493`) | ✓ WIRED |
| `index.ts` | `sources.ts` `markProducibility` | tombstone names one bundle's sighting (`:534`) | ✓ WIRED |
| `migrations.ts` `v: 9` | `schema.spec.ts` `EXPECTED_TABLES` | the shipped table set is still the approved eight | ✓ WIRED |
| `consumer.ts` drain loop | `retention.ts` `sweepRetention` | cadence and coverage now describe the same tables | ✓ WIRED |
| `retention.ts` | `source_sightings` / `sources` | cascade then anti-join, `sightingsCapped` deferral | ⚠️ WIRED — cascade omits `deleteDigest` (**WR-02**) |
| `thresholds.ts` constants | `retention.ts` `RETENTION_PASS_LIMITS` → `a8-measure.spec.ts` | benchmark asserts against the same constants the sweep uses | ✓ WIRED |
| `consumer.ts` | `sources.ts` `countSourcesForMap` | MAP-06's aggregate half finally has an enforcer | ✓ WIRED |
| `export.ts` `EXPORT_COLUMNS.sources` | manifest redactor | applied only to protocol-shaped labels (**WR-03**) | ⚠️ WIRED — narrower than its own premise |
| `telemetry.ts` `counters` | `snapshotCounters` → `slimStatus` → `HealthPanel` | array shape preserved, still a copy | ✓ WIRED |

---

## Behavioural Spot-Checks

| Behaviour | Command | Result | Status |
|---|---|---|---|
| Whole suite | `pnpm vitest run` | 90 files / **4,302 tests**, exit 0, 14.12 s | ✓ PASS |
| Types | `pnpm typecheck` | exit 0 | ✓ PASS |
| Lint | `pnpm lint` | exit 0 | ✓ PASS |
| Dead code | `pnpm knip` | exit 0 | ✓ PASS |
| Build | `pnpm build` | exit 0 | ✓ PASS |
| SFC types (not a gate) | `vue-tsc --noEmit` | exit 2 — 6 errors, matching the W-4 baseline exactly | ⚠ W-4, out of scope |
| C0 control bytes in shipped source | byte scan across `packages/**/*.{ts,vue}` | **zero** | ✓ PASS — W-2 closed |
| Debt markers in the 31 files this round modified | `TBD/FIXME/XXX` then `TODO/HACK/PLACEHOLDER` | **zero** for both | ✓ PASS |
| Commit ordering claim (07-14) | `git show 4bd99c1:.../thresholds.ts` vs `59347c3` | gate first with the factor intact, factor retired second — **as claimed** | ✓ PASS |
| Frame-budget backstop (UAT gap 3) | in-suite | passed, 12 tests / 8,195 ms | ✓ PASS (still load-sensitive) |
| Probe artifact | `results/map-bytes.json` | `status: pass`, `ladder_complete: true`, four points at `0.58.0` | ✓ PASS |

---

## Probe Execution

| Probe | Command | Result | Status |
|---|---|---|---|
| — | `find scripts -path '*/tests/probe-*.sh'` | no matches | N/A |

**Step 7c: no runnable probes exist.** `scripts/phase7/` holds `map-bytes.sh`, `fetch-maps.sh`, `assemble.py`, `record-point.py`, `build-observations.py` — the out-of-band D-10 measurement, which requires four fresh Caido 0.58.0 instances and is not re-runnable inside a verification pass. Its artifact was validated instead (row above). This round modified no probe and produced no new one; its equivalent — the A8 harness — landed as a committed spec inside the suite, which is what UAT gap 2 asked for.

---

## Requirements Coverage

| Requirement | Ledger | Status | Evidence |
|---|---|---|---|
| MAP-01 | `[x]` | ✓ SATISFIED in two halves, stated | Inline discovered and consumed; external discovered only under D-01, counted and surfaced. Phase 8 owns the rest. |
| MAP-02 | `[x]` | ✓ SATISFIED | `JSON.parse` primary path; 07-14 strengthened the pre-slice refusal without touching `MAP_MAX_BYTES`. |
| MAP-03 | `[x]` | ✓ SATISFIED | Codec confined by a wired package-level AST ban, green. |
| MAP-04 | `[x]` | ✓ SATISFIED | Clause 1 dissolved; clause 2 met by D-12's proof plus R6. 07-17 hardened the display tree without touching a sanitiser. |
| MAP-05 | `[x]` | ✓ SATISFIED — **W-1 closed** | Ticked at UAT with the dissolution note recorded inline; the machine-owned span survived byte-identical. |
| MAP-06 | `[x]` | ✓ SATISFIED — **strengthened** | The aggregate half now has the production caller its docblock claimed (07-15), enforced in the row unit 07-14 settled, and both new tables are finally swept (07-13). |
| MAP-07 | `[x]` | ✓ SATISFIED — **W-3 caveat removed** | Browsable and exportable; both bundles of a duplicated map now keep their own evidence. |
| UI-05 | `[x]` | ✓ SATISFIED — **W-3 caveat removed** | Viewer, tree, position strip, drill-down all mounted and asserted; the drill-down now names its bundle at every hop. |

**No orphaned requirements.** `REQUIREMENTS.md` maps MAP-01…MAP-07 and UI-05 to Phase 7; every one is claimed by at least one plan, and every one is ticked on disk.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `packages/engine/src/thresholds.ts` | 166, 177, 190-191 | a constant's stated derivation computes a retired value | ⚠️ Warning | WR-01 — `thresholds.ts` contradicts `retention.ts`; the spec computes from the constants and cannot catch it |
| `packages/backend/src/store/retention.ts` | 42-45, 389-390, 483-486 | a stated invariant the shipped control flow does not honour in one pass | ⚠️ Warning | WR-02 — orphan sightings on the ordinary eviction path; converges across passes |
| `packages/backend/src/store/export.ts` | 255-256 | a docblock premise falsified by an ordinary bundler shape | ⚠️ Warning | WR-03 — redacted mode discloses loader-query tails; corpus has no `?` to notice |
| `packages/backend/src/ingest/consumer.ts` | 1272-1287 | counter fires on a condition broader than the event it names | ℹ️ Info | IN-01 — one increment per map-bearing artifact; no health surface carries it |
| `packages/backend/src/ingest/consumer.ts` | 87 | value import used only inside `{@link}` prose | ℹ️ Info | IN-02 — passes lint, typecheck and knip together |
| `packages/backend/src/store/retention.ts` | 496-497 | comment says "the four key columns"; the statement selects three | ℹ️ Info | IN-03 — `project_id` is bound, not selected |
| The 31 files this round modified | — | `TBD` / `FIXME` / `XXX` / `TODO` / `HACK` / `PLACEHOLDER` | — | **zero occurrences** |
| All `packages/**/*.{ts,vue}` | — | literal C0 control bytes | — | **zero** — W-2 closed |

---

## Human Verification Required

### 1. WR-01 — rewrite `RETENTION_SWEEP_MAX_PASSES`'s derivation, or lower the constant

**Test:** reconcile `thresholds.ts:154-197` with `thresholds.ts:490-491` and `retention.ts:178-180`.
**Expected:** one number across both files, and 16 re-derived from the real quotient (4.26 → next power of two 8, plus a doubling of margin **stated as margin**) or lowered.
**Why human:** the constant over-satisfies, so nothing is unsafe — but its justification no longer evaluates, and `thresholds.spec.ts` computes the inequality from the constants and so is structurally unable to fail on this. Moving a threshold or rewriting its justification is not a verifier's call. Making the headroom itself executable, as the reviewer sketched, would stop a third drift.

### 2. WR-02 — decide whether sightings belong in `deleteDigest`'s cascade or in step 3d by design

**Test:** run one `sweepRetention` pass whose budget is consumed by the artifact loop over evictable map-bearing bundles; inspect `source_sightings` before the next pass.
**Expected:** either no orphan exists (sightings cascaded in dependency order), or the module's header and `ORPHAN_OBSERVATIONS_SQL`'s paragraph say plainly that sightings are reaped as orphans by design and that the window closes on the next pass.
**Why human:** whether the operator's UAT cascade choice meant "in the same statement sequence" or "in the same pass" is a design question the code cannot answer. No data loss either way — this is about a stated invariant matching shipped behaviour.

### 3. WR-03 — decide whether a loader query is analytic content or a residual

**Test:** export the manifest in redacted mode with a `sources` label of `src/App.vue?vue&type=script&setup=true&lang.ts`.
**Expected:** a decision, and a corpus entry that carries it either way, so `export.spec.ts`'s "none of them has a query axis" becomes a statement somebody re-checked.
**Why human:** the safe export mode now discloses more than it did, on an ordinary shape, justified by a false premise, with no coverage. Whether that is acceptable is a scope judgement about what a redacted manifest promises.

### 4. IN-01 — accept or repair the depth counter's firing condition

**Test:** ingest an artifact whose map recovers sources that `admitDerived` then refuses in full (every `sourcesContent` entry empty), and read `counters.sourcemap.derivedRejected.depth_exceeded`.
**Expected:** a decision, plus the pinning case `consumer.spec.ts` lacks.
**Why human:** the residual is one increment per map-bearing artifact against the 781 the fix removed, and no health surface carries the counter. Whether it is worth a second local is a judgement, not a defect.

---

## Gaps Summary

**No gaps. Every gap the prior verification and the UAT left open is closed in the codebase, and I confirmed each against the shipped property rather than against the SUMMARY that claims it.**

- **W-3** is closed in both halves — the key is widened at `v: 9`, the interim guard and its counter are retired, and two bundles carrying a byte-identical map now each keep their own N rows, exercised by three named tests I watched pass.
- **W-5 and UAT gap 1** are closed — both new tables are swept, in the operator's cascade order, by anti-join and never a foreign key, and the convergence inequality's insert side finally counts rows the delete side can reach.
- **UAT gap 2** is closed — the A8 harness is committed, runnable and asserts bounds; the prior report's one abstention is discharged.
- **W-1 and W-2** are closed — MAP-05 is ticked with its reasoning, and the byte scan finds zero control bytes.
- **The prior report's central caveat is closed** — the feature has now been observed producing readable developer source from real proxied traffic, which no committed corpus could have shown.
- **All nine round-1 review findings** are genuinely closed, including the two the executors asked to have adjudicated and the `NOT IN` NULL hazard, whose dangerous half is *executed* by `retention.spec.ts:1648` rather than asserted.

What stands between this and an unqualified pass is four operator decisions, three of which this round introduced and none of which falsifies a must-have:

1. **WR-01** — a load-bearing constant's derivation stopped evaluating, in a file whose entire discipline is that thresholds are derivable, and the gate that should catch it computes from the constants instead.
2. **WR-02** — the cascade gained a third child table and the cascade function did not; the module still states an invariant that one pass no longer honours.
3. **WR-03** — the safe export mode narrowed on a premise that an ordinary bundler shape falsifies, and the corpus that would have caught it contains no `?`.
4. **IN-01** — a counter that fires slightly wider than the event it names.

Plus three items the operator already scoped out and which I re-measured rather than assumed: **W-4** (6 vue-tsc errors, unchanged), **W-6** (`MAP_MAX_BYTES` untouched) and **UAT gap 3** (passed here, still load-sensitive). All three remain accurately recorded as open.

---

_Verified: 2026-09-02T14:06:58Z at `aaac947`_
_Verifier: Claude (gsd-verifier) — re-verification after gap-closure round 1_
