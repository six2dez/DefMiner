---
phase: 07-sourcemap-reconstruction
verified: 2026-09-02T21:22:48Z
verified_at_commit: e7c2ab5
status: human_needed
score: 26/26 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 20/20
  previous_commit: aaac947
  gaps_closed:
    - "G-07-1 — the `RETENTION_SWEEP_MAX_PASSES` docblock is re-derived from the SHIPPED insert side. `8,192 >= 2,179`, `~3.76x headroom`, `2,179 / 512 = 4.26`, smallest satisfying integer 5, next power of two 8. `4,227` and `8.26` are GONE from the passes region and survive only in `ROWS_INSERTED_PER_ITERATION_MAX`'s commit-ordering paragraph, where they are correct history. `retention.ts:194` reads the same 2,179, so the two files agree. 16 is stated twice as retained headroom that the derivation does NOT produce, with the non-approval of lowering it recorded."
    - "G-07-1's third half — a gate that reads the docblock AS TEXT now exists (`thresholds.spec.ts:843-975`). I proved it non-vacuous by re-applying its own predicates to a mutated copy of the file in memory: restoring the drift makes it fail FOUR ways (two presence figures missing, two retired figures present). The pre-existing convergence spec computes from the constants and is structurally blind to prose; this one is not."
    - "G-07-2 — the operator's option A is delivered as chosen. `deleteDigest` (retention.ts:1260-1283) now enumerates `SIGHTING_KEYS_FOR_DIGEST_SQL` and deletes through the single fully-bound `DELETE_SIGHTING_SQL`, as a THIRD child in the SAME budget and the SAME statement sequence as `observations` and `analyses`. The completeness check gained the `sight.length >= sightLimit` arm, so a capped sightings enumeration leaves the artifact standing rather than orphaning behind it."
    - "G-07-2's pinning half — `retention.spec.ts:1428-1520` drives `sweepRetention` EXACTLY ONCE against a budget-exhausting backlog and asserts its own non-vacuity three ways before the property: budget exactly exhausted (`deleted === RETENTION_SWEEP_MAX_ROWS`), `moreWork` true, and the map-bearing bundle really evicted. Step 3d's `budget() > 0` guard is still at `retention.ts:986`, so a spent budget provably skips orphan collection — which is what makes the zero at the end attributable to the cascade and nothing else."
    - "G-07-3 — the operator's option A is delivered as chosen: the query axis is cut on EVERY label, the fragment axis only on protocol-shaped ones. `redactSourceLabelForExport` delegates URL-shaped labels to the untouched `redactUrlForExport` and cuts any other label at its first `?` by hand. The false premise is gone: the docblock now states plainly that 07-16's premise 'was FALSE for the commonest shape there is'."
    - "G-07-3's corpus half — `SOURCES_LABEL_CASES` is 24, the 24th being `loader-query` = `src/App.vue?vue&type=script&lang.ts`. The addition is purely additive: `git diff` on `map-fixture.ts` has ZERO removed lines, so the first 23 are byte-unchanged. The direction is pinned by id AND by shape across four cases in both modes, and the test landed RED before the fix (`6aef224` precedes `0e44102`)."
    - "G-07-4 — `admittedForRecursion` is incremented at `consumer.ts:1417`, on the single path that reaches the recursion call site, and the refusal at `:1459` is guarded on `!nextDepth.ok && admittedForRecursion > 0`. The counter now fires on ADMISSION rather than on recovery, which is the unit `telemetry.ts:317-322` states. `telemetry.ts` is byte-unchanged, as the plan required."
    - "G-07-4's pinning half — `consumer.spec.ts:2635` asserts `depth_exceeded === 0` for a map whose every `sourcesContent` entry is empty, with a non-vacuity guard (`derivedRejected.empty === 3`) proving the three sources genuinely reached `admitDerived`, plus a separate assertion that no depth refusal was LOGGED. The zero cannot be zero for the wrong reason."
    - "Prior IN-03 (the one-sentence fix) — `ORPHAN_SIGHTINGS_SQL`'s comment now reads 'THREE key columns are selected and the fourth is the BOUND SCOPE', and goes on to state the same distinction for `SIGHTING_KEYS_FOR_DIGEST_SQL`."
    - "Prior coincidental_reliance_item — RESOLVED, and by the harder of the two repairs. The invariant no longer holds because `sweepToConvergence` re-runs; it holds because one pass enforces it."
  gaps_remaining: []
  regressions: []
  still_open_by_operator_decision:
    - "W-4 — `vue-tsc` is wired into no gate that runs. RE-MEASURED at HEAD, not restated: root `typecheck` is `tsc --build` (package.json:9) and never invokes vue-tsc; `packages/frontend/package.json:8` carries `vue-tsc --build` but nothing at the root recurses into it. Running it directly yields the SAME six errors as the prior baseline — `SettingsPanel.vue` at 430, 446, 461, 481 (TS7053) and `SourceBrowser.spec.ts` at 259, 267 (TS2769). Round 2 added none. Accurately recorded as open."
    - "W-6 — `MAP_MAX_BYTES` under-serves recovery ~2x. CONFIRMED untouched: `git diff 11ab9e2..HEAD` on `thresholds.ts` shows no `+`/`-` line for the constant, which still reads `2_621_440`, and all five plans carry the prohibition. Accurately recorded as open."
    - "UAT gap 3 — `tests/frontend-load.spec.ts` frame-budget backstop. `git diff --stat 11ab9e2..HEAD` on that path is EMPTY, so round 2 neither touched nor wired it. It passed inside my full-suite run. Accurately recorded as open."
gates_run_by_verifier:
  - command: "pnpm vitest run"
    result: "90 files / 4,321 tests passed, exit 0, 13.54 s — matches the orchestrator's figure exactly"
  - command: "pnpm typecheck"
    result: "exit 0"
  - command: "pnpm lint"
    result: "exit 0"
  - command: "pnpm knip"
    result: "exit 0"
  - command: "pnpm build"
    result: "exit 0 — plugin package zip created"
  - command: "pnpm vitest run packages/engine/src/thresholds.spec.ts"
    result: "62 tests passed — the new documented-derivation gate is in the suite and green"
  - command: "pnpm vitest run packages/backend/src/store/retention.spec.ts"
    result: "56 tests passed — the new single-pass cascade block is in the suite and green"
  - command: "pnpm --filter @defminer/frontend typecheck (vue-tsc --build)"
    result: "exit 1 — exactly 6 errors, 4 `SettingsPanel.vue` + 2 `SourceBrowser.spec.ts`. Error set identical to the W-4 baseline; no new error from round 2. Not a wired gate."
  - command: "in-memory re-application of `thresholds.spec.ts`'s own region+toContain predicates to a MUTATED copy of `thresholds.ts`"
    result: "gate fails FOUR ways when the 07-14 drift is restored — proof of non-vacuity without mutating the repo"
  - command: "scope-fence scan of `git diff 11ab9e2..HEAD -- packages/ tests/`"
    result: "zero added lines matching FOREIGN KEY / ON DELETE CASCADE / PRAGMA foreign_keys; zero matching fetch( / XMLHttpRequest / axios / node:http / https.request (D-01); one `readFileSync` added, inside `thresholds.spec.ts` (D-17 governs plugin runtime code, and 175 existing spec-file call sites use this idiom); `migrations.ts` diffstat EMPTY and the ladder still ends at `v: 9`"
  - command: "debt-marker scan (TBD/FIXME/XXX, TODO/HACK/PLACEHOLDER) over the 15 files this round modified"
    result: "zero — the single regex hit is `\\uXXXX` inside a tree.spec.ts docblock, not a marker"
deferred:
  - truth: "SC5 second half — the FP corpora are extended to include reconstructed source as an input class, and a false-positive rate is measured"
    addressed_in: "Phase 3, published in Phase 11"
    evidence: "Re-confirmed at HEAD rather than carried on the prior report's word. Both detector seams are still no-ops: `consumer.ts:995-998` (`derivedVisit`) and `:1502-1503` (`visit`), each carrying the comment 'Phase 3 puts the detector here'. No detector exists, so no positive — true or false — can be produced over any corpus."
  - truth: "MAP-01's external half — `.map` comment and `SourceMap` response-header announcements are CONSUMED, not merely counted"
    addressed_in: "Phase 8"
    evidence: "Re-confirmed at HEAD: `consumer.ts:1124` is the SOLE production decode call and it is `decodeInlineMap` — the inline path only. D-01 refuses every outbound fetch by design; `announcedExternal` is surfaced on the health panel as the measurement of what is handed over. REQUIREMENTS.md:838 records the two halves explicitly."
coincidental_reliance_items:
  - truth: "The new documented-derivation gate's non-vacuity companion holds — `ROWS_INSERTED_PER_ITERATION_MAX`'s history paragraph names the superseded insert side"
    reason: undeclared-precondition
    harden: "The companion at `thresholds.spec.ts:952-971` asserts the history paragraph contains `grouped(supersededInsertSide)`, where `supersededInsertSide` is RECOMPUTED as `RETENTION_SWEEP_EVERY_N + ROWS_INSERTED_PER_ARTIFACT_MAX + 2 * SOURCE_ROWS_PER_MAP_MAX`. It equals the historical 4,227 only because `SOURCE_ROWS_PER_MAP_MAX` has not moved since `59347c3` — a precondition nothing declares and nothing enforces. This is WR-04 stated as a reliance: pin the two superseded figures as named literals with their provenance, and keep a one-line consistency assertion that the literal equals `grouped(128 + 3 + 2 * 2048)` as of today. Advisory only; the gate is correct at HEAD and this changes no score and no status."
human_verification:
  - test: "Decide WR-01 (confirmed, and it is this round's own): delete the `too_large` half of both production comments in `consumer.ts`, or accept a justification that is half fictional."
    expected: "`consumer.ts:1266-1269` and `:1445-1448` say what `consumer.spec.ts:2690-2695` says — that `too_large` is unreachable through the ingest path — or the operator records that the imprecision is accepted."
    why_human: "Traced end to end from the code, not taken from the review. `consumer.ts:1124` is the SOLE production decode site and it is `decodeInlineMap(announcement.url, MAP_MAX_BYTES)`; `parse.ts:227` refuses on `Buffer.byteLength(json, 'utf8') > maxBytes`, so the decoded map document is at most `MAP_MAX_BYTES` bytes. `parseSourceMap(inline.json, ...)` at `:1147` is the only producer of `parsed.recovered`. `derive.ts:142` sets `DERIVED_SOURCE_MAX_BYTES = MAP_MAX_BYTES` and `:233` refuses on `>`. A decoded `sourcesContent` entry is a strict byte-subset of the JSON that carried it — JSON string encoding never shrinks a character below its UTF-8 width, and every escape costs strictly more — so `byteLen > MAP_MAX_BYTES` cannot hold for any source reaching that gate. BOTH sides are `+` lines in `git diff 11ab9e2..HEAD`: the false production claims at diff lines 23 and 69 of `consumer.ts`, the correct spec statement at diff lines 77-78 of `consumer.spec.ts`. One plan, one commit range, two contradictory statements. This is a judgement about a comment, not a behaviour — the guard is correct and the `empty` half of the justification carries it alone."
  - test: "Decide WR-02 (confirmed): `export.ts:424` still says the label column applies 'the SAME redactor'."
    expected: "The column comment says what the function now does — the same MARKER applied per AXIS, with a URL-shaped label delegating and any other label cut at its first `?` — or the operator records that the summary is acceptable as-is."
    why_human: "Read both sides at HEAD. `export.ts:424-427` reads 'Hence {@link redactSourceLabelForExport}: the SAME redactor, the SAME marker, applied where its subject exists. Not an exemption — a narrowed application'. The function at `:309-318` now reads 'Hence the first `?` by hand rather than delegating — the SAME marker, a narrower cut'. Under 07-16 every branch either delegated or returned the label whole, so 'the SAME redactor' was TRUE; 07-22 made it FALSE by adding a second, hand-rolled cut with different semantics (`?` only, not `?`-or-`#`). 'A narrowed application' is also now backwards on the query axis, which 07-22 WIDENED to every label. This is the comment attached to the column declaration — the first thing a reviewer auditing the export's redaction policy reads — and it is a sentence 07-22 edited around. Same defect class as G-07-3, same file."
  - test: "Decide WR-03 (confirmed): `export.ts:297-299` states the never-claim-a-false-redaction principle unqualified, while the shipped URL branch prints `<query-redacted>` over a fragment-only URL."
    expected: "Either the principle is scoped to the branch that honours it, or the marker is made true on both branches (a vocabulary change touching `observations.url`, and a decision rather than a drive-by)."
    why_human: "Reproduced from the code and from the spec, not from the review. `redactUrlForExport` (`export.ts:199-202`, byte-identical in the diff) cuts on `url.search(/[?#]/)` and appends the QUERY marker for either hit. `export.spec.ts:883-889` pins `webpack:///./src/app.js#L5` -> `webpack:///./src/app.js<query-redacted>` as EXPECTED. That value has no query axis. Meanwhile `export.ts:422` calls exactly that output — 'printed a marker claiming a query had been withheld from a value with no query axis' — the wrong thing LO-04's fix removed on the path branch, and `:297-299` states unconditionally that such a marker makes a redaction 'unreliable'. So the file criticises on one branch precisely what it retains and pins on the other. Counterweight, so this is not overread: this is pre-existing `redactUrlForExport` behaviour, it is `observations.url`'s shipped behaviour, and it discloses LESS than the truth — the impact is operator trust and reviewability, not disclosure. Nothing leaks."
  - test: "Decide WR-04 (confirmed): the new gate's non-vacuity companion pins a HISTORICAL figure to a RECOMPUTED expression."
    expected: "The two superseded figures become named literals with their provenance stated, plus a one-line assertion that the literal still equals the recomputed expression as of today; the SHIPPED figures stay derived."
    why_human: "Verified against the code and the arithmetic. `thresholds.spec.ts:868-874` computes `supersededInsertSide = 128 + 3 + 2 * 2048 = 4,227`, which is not a property of today's constants — it is what the insert side READ at `59347c3`. If `SOURCE_ROWS_PER_MAP_MAX` is ever re-measured, the companion at `:952-971` will demand that the recomputed figure be written into a paragraph describing what happened on 2026-09-02, when the figure that day was 4,227; and the absence half at `:926-949` will simultaneously begin asserting the absence of a string that was never in the docblock — the exact 'asserting the absence of an arbitrary string' failure its own comment says it exists to avoid. The gate built to stop prose drift would become the thing forcing it. Latent, not live: it is correct at HEAD and I ran it green. Recorded also as this round's one coincidental-reliance item."
  - test: "Decide IN-04 (confirmed): while `DERIVED_MAX_DEPTH` is 1, is `derivedRejected.depth_exceeded` worth a health surface?"
    expected: "One sentence in `telemetry.ts`'s `derivedRejected` docblock recording that the counter measures corpus shape rather than run behaviour until the bound is raised — or an explicit decision that it needs none. No code change either way."
    why_human: "Confirmed from the code. `reconstruct` has exactly two call sites: `:1519` enters at `depth: 0` and `:1422` is the recursive one, guarded by `nextDepth.ok`. `admitDerivedDepth(0 + 1)` is `1 >= DERIVED_MAX_DEPTH (1)` -> refused (`derive.ts:204`), so `nextDepth.ok` is ALWAYS false on the only reachable path: the recursion block at `:1421-1437` never executes in production and the refusal at `:1459` fires for EVERY stage that admitted at least one source. G-07-4's fix is nonetheless correct and its truth holds — telemetry's stated unit is now honoured, because a stage that admitted a source genuinely did decline to recurse. The residual is that the counter's VALUE is within one of `sourcesRecovered > 0`, which is MD-03's own 'a counter equal by construction to another counter' objection at 1-per-artifact instead of 781-per-artifact. Not a regression, not a reason to reopen anything — but it should be said where the counter is defined so nobody wires it to a health surface expecting signal."
  - test: "Confirm 07-22's task 1 is discharged: the docblock's withholding sentence is option A's own defining text, quoted by reference, not a sentence you composed."
    expected: "Either you accept the quoted-by-reference substitution as discharging the criterion, or you supply the one-sentence statement in your own words and it replaces the quoted text at `export.ts:296-299`."
    why_human: "Not a defect and not a gap — an outstanding item the executor routed here rather than fabricating. `07-22-SUMMARY.md:310-311` records it plainly: task 1's acceptance criteria required 'the operator's one-sentence statement of what a redacted label withholds' recorded verbatim, and you answered with the option letter and a verdict on the premise without composing a separate sentence. Rather than invent a quotation, the executor wrote option A's defining text — 'A non-protocol label is cut at the first `?` only, with the SHIPPED marker appended, and keeps its `#` tail.' — and labelled it in the docblock as 'in the words the decision was made against', with coverage entry D8 carrying `human_judgment: true`. I read the docblock at HEAD and the labelling is accurate; nothing is passed off as yours that is not."
findings:
  - id: WR-01
    severity: warning
    title: "07-19 replaced a false comment with a false comment — `consumer.ts:1266-1269` and `:1445-1448` assert `derivedRejected.too_large` is reachable, contradicting `consumer.spec.ts:2690-2695` in the same commit range"
    introduced_by: "this round (07-19)"
    status: confirmed_independently
  - id: WR-02
    severity: warning
    title: "`export.ts:424` still says the label column uses 'the SAME redactor' — after 07-22 the non-protocol branch does not delegate at all"
    introduced_by: "this round (07-22, which made a previously true sentence false)"
    status: confirmed_independently
  - id: WR-03
    severity: warning
    title: "`export.ts:297-299` states the never-claim-a-false-redaction principle unqualified, while `redactUrlForExport` prints `<query-redacted>` over a fragment-only URL — pinned as expected at `export.spec.ts:886-889`"
    introduced_by: "pre-existing in `redactUrlForExport`; re-emphasised and left unreconciled by 07-22"
    status: confirmed_independently
  - id: WR-04
    severity: warning
    title: "The new gate's non-vacuity companion pins the historical 4,227 to a recomputed expression, so a future constant change would demand the commit-ordering paragraph state a number never true on the day it describes"
    introduced_by: "this round (07-18)"
    status: confirmed_independently
  - id: IN-01
    severity: info
    title: "`export.spec.ts:1067-1069`'s '4,112' does not name its unit; the three candidate units disagree by up to 4x"
    status: confirmed_independently
  - id: IN-02
    severity: info
    title: "`export.spec.ts:1104-1108`'s 'never twice' comment is attached to the lower-bound assertion, which cannot detect a doubled marker (the upper bound above it can)"
    status: pre_existing_untouched
  - id: IN-03
    severity: info
    title: "07-21's 'no assertion was loosened' audit used a grep blind to expectations held in named constants; the SUBSTANTIVE claim holds and I re-verified it"
    status: verification_method_defect_only
  - id: IN-04
    severity: info
    title: "`DERIVED_MAX_DEPTH === 1` makes the recursion call site unreachable, so `depth_exceeded` measures corpus shape rather than run behaviour"
    status: confirmed_independently
  - id: F-1
    severity: info
    title: "`derivedRejected.too_large` is structurally unreachable through the ingest path — recorded by 07-19's executor, correctly not actioned, now UPGRADED by WR-01"
    disposition: "Executor's non-action was correct: every route to making the counter meaningful runs through `MAP_MAX_BYTES` (W-6, open by operator decision) or an admission threshold, both prohibited in every plan. What changed is that the round then documented the unreachable branch as reachable, which is WR-01 and is actionable without touching any constant."
  - id: DEFERRED-SWEEP
    severity: info
    title: "07-22's deferred sweep for other hardcoded restatements of `EXPORT_QUERY_REDACTION`'s length"
    disposition: "COMPLETE, verified independently rather than taken from the review. `EXPORT_QUERY_REDACTION` is spelt in exactly one source location (`export.ts:178`) and is 16 characters. A repo-wide sweep for `4112`/`4,112` and for `sixteen`/`seventeen` finds no other restatement of the marker's length — every `sixteen`/`seventeen` hit belongs to the retention pass count, the hex alphabet, the registration count or the seventeen media essences. Nothing left in it."
---

# Phase 7: Sourcemap Reconstruction — Verification Report (re-verification after gap-closure round 2)

**Phase Goal:** *Recover developer-readable source — the single highest value-per-effort feature in the tool — without letting a malicious map write outside its sandbox.*
**Verified:** 2026-09-02T21:22:48Z at `e7c2ab5`
**Status:** `human_needed` — all four gaps closed, no must-have FAILED, five items need an operator decision
**Re-verification:** Yes — after the five-plan gap-closure round (07-18 … 07-22), third verification of this phase

---

## Verdict in one paragraph

**All four gaps are genuinely closed, and I checked each against the shipped property rather than against the commit that claims it.** G-07-1's docblock now computes from the shipped 2,179 and agrees with `retention.ts`, with 16 named twice as retained headroom the derivation does not produce — and the new gate that reads that prose as text is *provably* non-vacuous: I re-applied its own predicates to a mutated copy of the file and restoring the 07-14 drift fails it four ways. G-07-2 delivered the operator's option A as chosen — `source_sightings` is now a third child inside `deleteDigest`'s own statement sequence and budget, with the completeness check extended to match, pinned by a test that calls `sweepRetention` exactly once and proves its own non-vacuity three ways. G-07-3 delivered option A as chosen — the query axis cut on every label, the fragment axis only on protocol-shaped ones — with the false premise replaced by an accurate one, a 24th corpus case added purely additively, and the direction pinned RED-first by id and by shape in both modes. G-07-4 counts what was admitted rather than what was recovered, pinned by an empty-map case with a real non-vacuity guard. Every prohibition in the scope fence held: no migration, no foreign key, no `ON DELETE CASCADE`, `SCHEMA_VERSION` still 9, `RETENTION_SWEEP_MAX_PASSES` still 16, `MAP_MAX_BYTES` untouched, no outbound fetch, no filesystem access from plugin code. All gates green in my own run. **And the round did open a new instance of the class it was closing — the review is right about that, and it is right in more than one place.** WR-01 is real, is this round's own, and is the sharpest of the four: `consumer.ts` asserts twice that `admitDerived` can refuse a source as `too_large` while the spec committed by the *same plan* correctly states that refusal is unreachable through the ingest path — a production comment and its own test contradicting each other inside one commit range. WR-02 is also this round's own, in a subtler way: `export.ts:424`'s "the SAME redactor" was *true* under 07-16 and 07-22 made it false. WR-04 is a genuine mechanism defect in the new gate. WR-03 is pre-existing and was re-emphasised without being reconciled. **Stated plainly, then: the round traded two behavioural defects and two accuracy defects for three accuracy defects and one surfaced tension — net progress, and not a clean round.** None of the four falsifies a must-have; none is behavioural; all four are the kind of defect this repository's discipline exists to catch, which is why they are named rather than absorbed.

---

## Goal Achievement

### Observable Truths

Rows 1–9 are the ROADMAP contract, re-checked as a regression. Rows 10–13 are the four UAT gap predicates. Rows 14–27 are round 2's own must-haves from the five plans.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | **SC1** — sources reconstructed from `sourcesContent` via `JSON.parse`, no VLQ on the primary path; a real inline map at `MAP_MAX_BYTES` completes within budget or records the partial state | ✓ VERIFIED | Regression. `MAP_MAX_BYTES` still `2_621_440` at `thresholds.ts:372` with no `+`/`-` line in the round-2 diff; `results/map-bytes.json` untouched. `consumer.ts:1124` is the sole decode site. |
| 2 | **SC2** — VLQ decoding only where position attribution is genuinely needed | ✓ VERIFIED | Regression: `codec-prohibition.spec.ts` green in my 4,321-test run; round 2 touched no codec file. |
| 3 | **SC3** — a malicious-`sources` fixture suite writes nothing outside the output directory | ✓ VERIFIED by dissolution | Regression: `filesystem-prohibition.spec.ts` and `sources-sink-prohibition.spec.ts` both green. The latter absorbed the 24th label (`toBe(23)`→`toBe(24)`) without loosening: the assertion is still an exact count. |
| 4 | **SC4** — malformed maps, bombs, absent `sourcesContent`, indexed maps and cycles stay within limits and record partial | ✓ VERIFIED | Regression: `parse.spec.ts` green; `MAP_PARSE_REASONS` unchanged; round 2 added a corpus case and removed none. |
| 5 | **SC5a** — reconstructed sources analysed once per content hash | ✓ VERIFIED | Regression: the aggregate enforcer at `consumer.ts:1180` is untouched by this round's diff. |
| 6 | **SC5b** — the FP corpora extended with a measured rate | — DEFERRED | Re-confirmed at HEAD, not carried: BOTH detector seams are still no-ops (`consumer.ts:995-998` and `:1502-1503`, each reading "Phase 3 puts the detector here"). A rate cannot exist without a detector. |
| 7 | **SC6** — reconstructed source browsable in the UI and retrievable via the Phase 6 path with a manifest | ✓ VERIFIED | Regression, and the chain is provably untouched: the only production frontend change in the whole round is a one-word comment edit in `source-filename.ts` (`23-label` → `24-label`). `SourceBrowser.vue`, `SourceViewer.vue`, `SourceTree.vue` and backend `index.ts` are absent from the diffstat entirely. |
| 8 | **Goal, recovery half** — a user actually gets developer-readable source out of this, end to end | ✓ VERIFIED | Carried from round 1's UAT observation on real proxied traffic against a live Caido at `df5b101`, and legitimate to carry BECAUSE row 7 shows round 2 changed nothing on that path. `pnpm build` exits 0 and produces the plugin package. |
| 9 | **Goal, sandbox half** — a malicious map cannot write outside its sandbox | ✓ VERIFIED | Row 3, plus the scope-fence scan: zero added `node:fs`/path-sink lines in plugin code across the whole round-2 diff. |
| 10 | **G-07-1** — `thresholds.ts`'s `RETENTION_SWEEP_MAX_PASSES` docblock and `retention.ts:178-180` agree on one number, and the choice of 16 is re-derived from the real quotient | ✓ VERIFIED | Read both. `thresholds.ts:166` `8,192 >= 2,179, which is ~3.76x headroom`; `:203` `2,179 / 512 = 4.26, and the next power of two above it is 8`; `:202` `The smallest integer that satisfies the inequality is 5`. `retention.ts:194` `512 x 16 = 8,192 against 128 + 2,051 = 2,179`. Arithmetic re-derived from the constants by me: `3 + 2048 = 2051`, `128 + 2051 = 2179`, `512 * 16 = 8192`, `8192/2179 = 3.759…`, `2179/512 = 4.2558…`. `4,227` and `8.26` are ABSENT from the passes region (verified by slicing it programmatically) and `4,227` survives at `:504` where it is correct history. |
| 11 | **G-07-2** — every eviction removes its sightings in the same statement sequence as its observations and analyses | ✓ VERIFIED — **the prior report's coincidental-reliance item is CLOSED** | `deleteDigest` (retention.ts:1260-1283) enumerates `SIGHTING_KEYS_FOR_DIGEST_SQL` and deletes via the single fully-bound `DELETE_SIGHTING_SQL`, binding all four key columns (`source_index` as a NUMBER, not a string). The completeness check at `:1289-1296` gained `sight.length >= sightLimit`, so `0 >= 0` on a spent budget returns `capped: true` and leaves the artifact standing. `DELETE_ARTIFACT_SQL` has one call site; `deleteDigest` contains no `sources` statement. |
| 12 | **G-07-3** — `redactSourceLabelForExport` cuts wherever a query axis is present rather than wherever the label is protocol-shaped | ✓ VERIFIED | `export.ts:309-318`: protocol-shaped → `redactUrlForExport` (untouched, byte-identical in the diff); otherwise cut at `label.indexOf("?")` with the shipped marker. The docblock's premise is now TRUE and says so explicitly: "07-16's premise — that a label which is not a URL has neither axis — was FALSE for the commonest shape there is." |
| 13 | **G-07-4** — `derivedRejected.depth_exceeded` fires only when something was actually admitted for recursion, matching `telemetry.ts:317-322`'s stated unit | ✓ VERIFIED | `admittedForRecursion` incremented at `consumer.ts:1417` on the one path reaching the call site (`admitDerived`'s refusal has `continue`d at `:1302`; both `stillCurrent()` re-checks `return done(null)`). Guard at `:1459` is `!nextDepth.ok && admittedForRecursion > 0`; the log interpolates `admittedForRecursion`. `git diff --stat` on `telemetry.ts` is EMPTY, as the plan required. |
| 14 | **07-18** — a spec pins the DOCUMENTED quotient against the shipped constants, so prose drift fails a test instead of surviving a verification round | ✓ VERIFIED — **and proved non-vacuous, not assumed** | `thresholds.spec.ts:843-975`. I re-applied its own `region()` + `toContain`/`not.toContain` predicates to an in-memory mutated copy of `thresholds.ts`: restoring the 07-14 drift makes it fail FOUR ways (`2,179 / 512 = 4.26` missing, `3.76x headroom` missing, `4,227` present, `8.26` present). Both anchors are unique (one occurrence each); the region spans 4,222 bytes and throws with a remedy if a declaration moves. 62 tests green in my run. |
| 15 | **07-18** — no constant moved, and the retired figure survives only where it is correct history | ✓ VERIFIED | `RETENTION_SWEEP_MAX_PASSES = 16` at `:220`, `RETENTION_SWEEP_MAX_ROWS = 512` at `:152`; the round-2 diff of `thresholds.ts` contains no `+`/`-` line for any `export const`. `4,227` appears exactly once in the file, at `:504`, inside `ROWS_INSERTED_PER_ITERATION_MAX`'s commit-ordering paragraph, which the diff shows byte-unchanged. |
| 16 | **07-19** — MD-03's property is unchanged: one map-bearing artifact with N admitted sources still contributes exactly ONE increment and ONE log line | ✓ VERIFIED | `sm.derivedRejected[nextDepth.reason]++` appears exactly once (`:1460`), below the loop. The other two `derivedRejected` increments are the in-callee depth backstop (`:1087`) and `admitDerived`'s own reason (`:1294`), both unchanged. `consumer.spec.ts`'s "fires ONCE PER STAGE" cases still green. |
| 17 | **07-19** — the number in the refusal log line is the ADMITTED count, and a map whose every entry is empty declines nothing | ✓ VERIFIED | `consumer.spec.ts:2635` and `:2696`. The empty-map case asserts `derivedRejected.empty === 3` FIRST (so the three sources provably reached `admitDerived`), then `depth_exceeded === 0`, then that zero lines containing `depth_exceeded` were logged. The mixed-map case asserts the logged number is the admitted count, not the recovered one. |
| 18 | **07-20** — a SINGLE `sweepRetention` call, not a convergence loop, pins the chosen property, in the scenario the gap describes | ✓ VERIFIED | `retention.spec.ts:1428-1520`. Calls `sweepRetention` once. Asserts `first.deleted === RETENTION_SWEEP_MAX_ROWS` (budget exactly exhausted, so step 3d's `budget() > 0` guard at `retention.ts:986` provably skipped orphan collection), `first.moreWork === true`, and `artifactExists(evicted) === false` — only then `sightingsNaming(evicted) === 0`. The backlog size is DERIVED from `RETENTION_SWEEP_MAX_ROWS`, not hardcoded. |
| 19 | **07-20** — the boundary is stated as well as the claim: `sources` is NOT a child of `artifacts`, and the across-passes properties are unweakened | ✓ VERIFIED | `retention.spec.ts:1521` asserts the evicted bundle's `sources` row SURVIVES the single pass (`toEqual([SRC_ONLY_C])`) with a comment naming why widening the cascade would be wrong, then drives `sweepToConvergence` from the same state and asserts `{orphanSightings: 0, unsightedSources: 0}` and an empty `sources`. All 56 retention tests green. |
| 20 | **07-21** — the corpus is 24, the 24th is a relative label carrying a query axis, and no assertion was loosened to accommodate it | ✓ VERIFIED | 24 `id:` entries between `SOURCES_LABEL_CASES`' bounds. The 24th is `loader-query` = `src/App.vue?vue&type=script&lang.ts`. `git diff` on `map-fixture.ts` has **zero** removed lines, so the first 23 are byte-unchanged. `tests/corpus-maps.spec.ts:52-55` derives the count as `22 + 2` with the new class named in the failure message; every count consumer reads 24 including the one production comment (`source-filename.ts:37`). |
| 21 | **07-21** — `classify()` puts the new label in `relative` and `isProtocolShapedLabel` returns false for it, so it genuinely probes the narrowed branch | ✓ VERIFIED | The two-classifier drift gate at `export.spec.ts:983` runs every corpus label plus six extras through both implementations. Green. The label has no `://` at a positive index and no known scheme prefix. |
| 22 | **07-22** — the loader-query label is asserted BY ID in redacted and in raw mode, and the four shapes pin both axes | ✓ VERIFIED | `export.spec.ts:926` asserts by id with its own non-vacuity check (`cut > -1`), both modes separately "so 'redacted leaked' and 'raw withheld' cannot mask one another". The four-shape `it.each` at `:942-981` pins relative-with-query (cut), relative-with-fragment (whole), relative-containing-`://` (whole), protocol-with-query (cut). Test landed RED first: `6aef224` precedes `0e44102`. |
| 23 | **07-22** — LO-04's original fix stands, and `observations.url` is byte-identical in both modes | ✓ VERIFIED | `src/components/Button#new.tsx` is asserted unchanged in redacted mode (case 2 of the four-shape block). `redactUrlForExport` is byte-identical in the diff and `export.spec.ts:1110`'s `observations.url` regression pin is intact. `EXPORT_QUERY_REDACTION` is still spelt in exactly one place — no new vocabulary. |
| 24 | **07-22** — the per-field ceiling does not rise: a redacted manifest field is still bounded by the stored label cap plus one marker | ✓ VERIFIED | The byte-budget block asserts `redacted <= raw + EXPORT_QUERY_REDACTION.length`. Marker is 16 characters, so `4,096 + 16 = 4,112` in the unit `SOURCES_LABEL_MAX` is enforced in. (The unit is not NAMED — that is IN-01, an accuracy nit, not a ceiling change.) |
| 25 | **Prior IN-03** — the one-sentence fix `ORPHAN_SIGHTINGS_SQL`'s comment needed | ✓ VERIFIED | `retention.ts:518-524`: "THREE key columns are selected and the fourth is the BOUND SCOPE", and it extends the distinction to `SIGHTING_KEYS_FOR_DIGEST_SQL` ("binding TWO of the four and selecting the other two"). |
| 26 | **Every prohibition in the scope fence held** | ✓ VERIFIED | Scanned the whole round-2 diff for `+` lines: zero `FOREIGN KEY`, zero `ON DELETE CASCADE`, zero `PRAGMA foreign_keys`, zero outbound-fetch primitives. `migrations.ts` diffstat EMPTY; ladder still ends at `v: 9`; `SCHEMA_VERSION` still derived, not restated. `RETENTION_SWEEP_MAX_PASSES` and `MAP_MAX_BYTES` untouched. One `readFileSync` added, inside a spec, in an idiom 175 existing spec call sites use. |
| 27 | **Every wired gate is green at HEAD** | ✓ VERIFIED | Run by me, not read: `pnpm vitest run` → **90 files / 4,321 tests, exit 0, 13.54 s**; `typecheck`, `lint`, `knip`, `build` → all exit 0. Matches the orchestrator's figures exactly. |

**Score: 26/26 truths verified** (row 6 deferred to Phase 3 and not counted against; 0 behavior-unverified — every state-transition and cleanup invariant in this round has a named passing test that I ran, and the one prose-gate has a non-vacuity proof I constructed myself).

---

## Per-gap assessment

### G-07-1 — CLOSED, and the gate behind it is real

The docblock is fully re-derived. What matters more than the numbers being right is that they are now *held* right. The prior round's failure mode was structural: `thresholds.spec.ts:260-281` computes the inequality **from** the constants, so it passes regardless of what the prose says, and the drift survived a whole verification round underneath it. The new block at `:843-975` reads the module's own source text and slices the passes docblock **between two declarations** rather than by line number — so adding a paragraph above it does not rot it, and a renamed declaration throws with a remedy instead of silently matching nothing.

I did not take its non-vacuity on faith. Repo mutation is unavailable to me, so I re-applied the gate's own predicates to an in-memory mutated copy: restoring exactly the 07-14 drift (`3.76x` → `9.99x`, `2,179 / 512 = 4.26` → `4,227 / 512 = 8.26`) fails the presence half twice and the absence half twice. The anchors are unique. The companion at `:952-971` keeps the absence half from rotting by requiring the superseded figures to survive where they are correct history.

Both remaining halves of the gap contract are delivered: 16 is stated twice as retained headroom (`SIXTEEN IS RETAINED HEADROOM AND IT IS NOT THE DERIVED VALUE` and `SO WHY IS IT STILL SIXTEEN`), with the non-approval recorded and an explicit instruction not to "tidy" it down on the strength of the derivation. And `retention.ts:194` states the same 2,179, so the two files agree.

The one residual is WR-04, which is about *which value* the companion pins, not about whether it pins one — see the adjudication below.

### G-07-2 — CLOSED, by the harder of the two repairs, and it discharges the prior coincidental-reliance item

The operator chose option A and option A is what shipped. `source_sightings` is a third child inside `deleteDigest`, in the same budget, in the same statement sequence, enumerated as keys and deleted through the single fully-bound `DELETE_SIGHTING_SQL` — the same shape as the two children that were already there. The completeness check gained the arm that is easiest to forget: without `sight.length >= sightLimit`, a capped sightings enumeration would delete the parent anyway, which is the precise failure the check exists to prevent. With a spent budget, `sightLimit` is 0 and `0 >= 0` returns `capped: true`, matching the `obs`/`ana` arms exactly.

The operator's explicit confirmation is honoured to the letter: no foreign key, no `ON DELETE CASCADE`, no migration, no `SCHEMA_VERSION` change. I scanned the diff for all four independently.

The pinning test is the part I want to praise specifically, because the gap was *created* by testing the wrong thing. The block opens by explaining why it is not a fourth case in the existing describe — a convergence loop cannot see this property, because it keeps running passes until step 3d finally gets one with budget left, by which time the orphan is gone regardless. So the new cases call `sweepRetention` exactly once, and they prove their own non-vacuity three ways before asserting anything: budget exactly exhausted (which is what makes step 3d provably skipped, since `retention.ts:986`'s `budget() > 0` guard is still there), `moreWork` true, and the map-bearing bundle really evicted. The backlog size is derived from `RETENTION_SWEEP_MAX_ROWS` so it cannot rot. And the boundary case pins that `sources` is *not* cascaded, with a comment telling the next reader why widening it would be the bug.

**The prior report's `coincidental_reliance_items` entry is therefore closed.** It said the invariant held because `sweepToConvergence` re-runs, not because a pass enforces it. A pass now enforces it.

### G-07-3 — CLOSED, and the disclosure direction is now covered in the direction it changed

Option A, split the two axes, is what shipped. The query axis is cut on every label; the fragment axis only on protocol-shaped ones, because `#` is a legal filename character and LO-04's fix for that stands. The false premise is gone and replaced by an accurate account of why it was false, naming the exact shape that falsified it.

The docblock is also honest about the *kind* of claim it makes, which was 07-22's explicit prohibition. It says `?` is an RFC 3986 gen-delim and Win32-reserved — a claim about the population of labels a bundler emits — and then disclaims the stronger form in so many words: *"It is deliberately NOT the stronger claim that a `?` cannot be part of a name — that stronger claim is untrue, and this comment does not make it."* That is exactly the line the operator's scoping commit (`4d61a77`) drew, and the round did not cross it.

The corpus half is clean: 24 cases, additive only (zero removed lines), the count derived rather than literal at every consumer, and the direction pinned RED-first by id and by four shapes in both modes. `src/gen/what?.ts` moved out of the "left whole" list into the cut list — a **tightening**, not a loosening, and the only `it.each` row that moved anywhere.

### G-07-4 — CLOSED, with the residual correctly scoped as Info

The guard now reads what was admitted. The increment sits on the one path that reaches the recursion call site, and the comment above it says exactly why counting earlier would be wrong. The empty-map pinning case is a good test rather than a box-ticking one: `depth_exceeded === 0` asserted alone would pass identically against a map the parser rejected outright, a bundle with no announcement, or a build where reconstruction stopped running — so the case asserts `derivedRejected.empty === 3` first, and checks the log line separately from the counter because they share one condition and both had to move.

`telemetry.ts` is byte-unchanged, which was the point: the plan read it as the specification rather than rewriting the specification to match the code.

IN-04 is the honest residual and it does not falsify this. Because `DERIVED_MAX_DEPTH` is 1, the recursion call site is unreachable and the refusal fires for every stage that admitted a source — so the counter measures corpus shape, not run behaviour. But telemetry's stated unit *is* now honoured: a stage that admitted a source genuinely did decline to recurse. The gap's truth holds; what remains is a note about the counter's informational ceiling, which belongs where the counter is defined.

---

## Adjudication of the round-3 review findings

I treated `07-REVIEW.md` as evidence to verify, not as a verdict to copy. All four Warnings are **confirmed independently**, and so are three of the four Infos.

### WR-01 — CONFIRMED. This is the round's own, and the review's framing is correct

I traced the reachability chain end to end rather than accepting the review's summary:

- `consumer.ts:1124` is the **sole** production decode site, and it is `decodeInlineMap(announcement.url, MAP_MAX_BYTES)`.
- `parse.ts:227` refuses on `Buffer.byteLength(json, "utf8") > maxBytes`, so the decoded map document is at most `MAP_MAX_BYTES` bytes — and the comment there is explicit that the bound is in bytes, not UTF-16 code units.
- `parseSourceMap(inline.json, …)` at `:1147` is the only producer of `parsed.recovered`.
- `derive.ts:142` sets `DERIVED_SOURCE_MAX_BYTES = MAP_MAX_BYTES` and `:233` refuses on `>`.
- A decoded `sourcesContent` entry is a strict byte-subset of the JSON that carried it: JSON string encoding never shrinks a character below its UTF-8 width, and every escape form costs strictly more (`\n` 2 bytes for 1, `\uXXXX` 6 for at most 3, a surrogate pair 12 for 4).

So `byteLen > MAP_MAX_BYTES` cannot hold for any source that reaches that gate. `too_large` is unreachable through the ingest path.

And both sides are in this round's diff. `git diff 11ab9e2..HEAD` shows the two false production claims as added lines in `consumer.ts` (`"empty" or "too_large" before they could recurse"` and `"…DERIVED_SOURCE_MAX_BYTES, both reachable from one hostile map"`) and the correct statement as an added line in `consumer.spec.ts` (`"too_large is therefore unreachable through the ingest path"`). One plan, one commit range, two contradictory statements about the same branch.

**Why I am not softening this.** The round's entire purpose was closing four instances of "a sentence disagreeing with the code beside it". This is a fifth, written by the plan that closed the fourth, and the review is right that it is worse than the one it replaced: the old comment over-stated a count, this one asserts a refusal path no traffic can reach. It is also load-bearing — it is the *justification* offered for guarding on `admittedForRecursion`, so a reader who checks it finds the justification half fictional.

**Why it is nonetheless a Warning and not a gap.** No behaviour is wrong. The guard is correct, the `empty` half of the justification carries it alone, and G-07-4's truth is delivered. The correct statement already exists in the repo, in the same commit range. This needs an operator decision, not a fifth closure round on its own.

The review's out-of-scope note is also right and I record it as F-1's disposition: `DERIVED_REJECT_REASONS` ships a `too_large` member that can only ever read zero, which is MD-03's own "a counter that carries no information" objection. 07-19's executor recorded F-1 and correctly did not action it — every route to making the counter meaningful runs through `MAP_MAX_BYTES` (W-6, open by operator decision) or an admission threshold, both prohibited in every plan of this phase. What changed is that the round then *documented* the unreachable branch as reachable, and fixing that requires touching no constant at all.

### WR-02 — CONFIRMED, and it too is this round's own

`export.ts:424-427` reads *"the SAME redactor, the SAME marker, applied where its subject exists. Not an exemption — a narrowed application."* The function it points at now reads *"Hence the first `?` by hand rather than delegating — the SAME marker, a narrower cut."*

The review's provenance analysis is exactly right, and it is the part worth stating: **this sentence was TRUE under 07-16**, where every branch either delegated to `redactUrlForExport` or returned the label whole. 07-22 made it false by introducing a second, hand-rolled cut with different semantics (`?` only, not `?`-or-`#`). The marker is still shared; the redactor is not. "A narrowed application" is also now backwards on the query axis, which 07-22 *widened* to every label.

This matters for the reason the review gives: `:424` is attached to the column declaration, so it is the first thing a reviewer auditing the export's redaction policy reads, and it now says there is one cut rule where there are two. Same defect class as G-07-3, same file, in a paragraph 07-22 edited around.

### WR-03 — CONFIRMED, with a scoping note the review already supplies

`redactUrlForExport` cuts on `url.search(/[?#]/)` and appends the **query** marker for either hit. `export.spec.ts:883-889` pins `webpack:///./src/app.js#L5` → `webpack:///./src/app.js<query-redacted>` as the expected output. That value has no query axis.

The contradiction is internal and sharp: `export.ts:422` calls exactly that output *"a marker claiming a query had been withheld from a value with no query axis"* — describing it as one of the two wrong things LO-04's fix removed on the path branch — while `:297-299` states unconditionally that such a marker makes a redaction unreliable. So the file criticises on one branch precisely what it retains and pins on the other. Two entries below the pin, a comment states *"The marker is a statement about this value, not about this column"* — which it is not, for this value.

**Where I part company with a maximalist reading, stated so this is not overread:** this is pre-existing `redactUrlForExport` behaviour, byte-identical in the diff, and it is `observations.url`'s shipped behaviour. It discloses *less* than the truth, so the impact is operator trust and reviewability, not disclosure — the opposite direction from G-07-3, which was the safe mode revealing *more*. 07-22 was explicitly prohibited from touching `redactUrlForExport`, so the round could not have fixed the behaviour even if it had wanted to. What it could have done, and did not, is reconcile the principle it chose to re-emphasise with the branch that violates it. The review's cheap option — scope the principle — is the right shape.

### WR-04 — CONFIRMED, and I have also recorded it as this round's one coincidental-reliance item

`thresholds.spec.ts:868-874` computes `supersededInsertSide = RETENTION_SWEEP_EVERY_N + ROWS_INSERTED_PER_ARTIFACT_MAX + 2 * SOURCE_ROWS_PER_MAP_MAX`, which today is `128 + 3 + 4096 = 4,227`. The comment justifies recomputation on the grounds that a literal *"would stop tracking the constants the day one of them moves"*.

That reasoning is right for the shipped figures and wrong for this one. `4,227` is not a property of today's constants — it is what the insert side **read at commit `59347c3`**, and `ROWS_INSERTED_PER_ITERATION_MAX`'s paragraph records it as exactly that. Move `SOURCE_ROWS_PER_MAP_MAX` and the companion at `:952-971` will demand the recomputed figure be written into a paragraph describing what happened on 2026-09-02, when the figure that day was 4,227; the absence half at `:926-949` will simultaneously begin asserting the absence of a string that was never in the docblock — the precise "asserting the absence of an arbitrary string" failure its own comment says it exists to avoid. The gate built to stop prose drift would become the thing forcing it.

This is latent, not live. I ran the gate and it is green, and its logic is correct at HEAD. But the correctness rests on a precondition — *`SOURCE_ROWS_PER_MAP_MAX` has not moved since `59347c3`* — that nothing in the code declares and nothing enforces, which is why I have also recorded it under `coincidental_reliance_items` as an `undeclared-precondition`. Advisory only: it changes no score and no status.

### Info findings

- **IN-01 — CONFIRMED.** `4,112` is right in code points and in no other unit. The assertion eleven lines below measures `.length` (UTF-16 code units, where an all-astral 4,096-code-point label is 8,192), and "per-field" is a payload-budget noun measured in bytes. `store/sources.ts:70-90` already flags this exact unit hazard for `SOURCES_LABEL_MAX`, so it is a known one here. An accuracy nit, not a ceiling change — truth 24 is unaffected.
- **IN-02 — CONFIRMED, pre-existing, untouched.** The "never twice" comment sits above the lower-bound assertion, which cannot detect a doubled marker; the upper bound on the line above does enforce it. Comment placement, not coverage.
- **IN-03 — CONFIRMED as a verification-method defect, and the substantive claim independently re-verified.** 07-21's D4 grep for `expect|toBe|…` cannot see expectations held in named constants (`CORPUS_NODE_COUNT`, `CORPUS_OUTLINE`, `SOURCES_LABEL_EXPECTED_COUNT`), so "exactly TWO assertion lines changed" is false as stated and the promoted pattern is blind to a common idiom in this codebase. **But the property it claimed holds, and I checked it myself rather than accepting the reviewer's word:** `git diff` on `map-fixture.ts` has zero removed lines (first 23 byte-unchanged), `corpus-maps.spec.ts` derives the count as `22 + 2` with the new class named, every count consumer reads 24, and the single moved `it.each` row is a tightening. All 4,321 tests green.
- **IN-04 — CONFIRMED, and it bears on G-07-4 exactly as the task framing anticipated.** `reconstruct` has two call sites; `:1519` enters at depth 0 and `:1422` is guarded by `nextDepth.ok`, which `admitDerivedDepth(0 + 1)` = `1 >= DERIVED_MAX_DEPTH (1)` makes always false. The recursion block never executes in production and the refusal fires for every stage that admitted a source. **This does not falsify G-07-4's truth** — telemetry's stated unit is now honoured, because such a stage genuinely did decline to recurse — but it does mean the counter's *value* is determined by corpus shape rather than run behaviour, within one of `sourcesRecovered > 0`. That is MD-03's own objection at 1-per-artifact instead of 781-per-artifact. It belongs in `telemetry.ts`'s docblock as one sentence so nobody wires it to a health surface expecting signal. No code change.

---

## Carried forward, re-confirmed at HEAD

Each of these was re-measured or re-checked in this run rather than copied from the prior report.

**Deferred (out of scope by roadmap, not defects):**

- **SC5's second half** → Phase 3, published in Phase 11. Both detector seams are still no-ops at HEAD.
- **MAP-01's external half** → Phase 8. `consumer.ts:1124` is the sole decode site and it is inline-only; D-01 refuses every outbound fetch by design.

**Still open by operator decision (inside the scope fence, correctly not actioned):**

- **W-4** — `vue-tsc` is wired into no gate that runs. I established the mechanism as well as the measurement: root `typecheck` is `tsc --build` and never invokes vue-tsc; `packages/frontend/package.json:8` has its own `vue-tsc --build` script but nothing at the root recurses into it. Running it directly reproduces the baseline exactly — six errors, four in `SettingsPanel.vue` (430, 446, 461, 481; TS7053) and two in `SourceBrowser.spec.ts` (259, 267; TS2769). Round 2 touched four frontend files and added no new error.
- **W-6** — `MAP_MAX_BYTES` under-serves recovery ~2x. Untouched; every plan carries the prohibition.
- **UAT gap 3** — the `tests/frontend-load.spec.ts` frame-budget backstop. Diffstat empty; passed inside my full-suite run.

**Known-open items the executors recorded and did not action:**

- **F-1** — `derivedRejected.too_large` structurally unreachable. Non-action was correct (all remedies run through prohibited constants). Now upgraded by WR-01, which *is* actionable without touching any constant.
- **The `EXPORT_QUERY_REDACTION` length sweep** — **complete**, verified by me rather than taken from the review. The marker is spelt in exactly one source location and is 16 characters; a repo-wide sweep for `4112`/`4,112` and for `sixteen`/`seventeen` finds no other restatement of its length.

---

## Human Verification Required

Five items. Four are operator decisions on confirmed findings; one is an outstanding question the executor deliberately routed here rather than answering on your behalf.

### 1. WR-01 — the two `too_large` comments in `consumer.ts`

**Test:** Delete the `too_large` half of the claims at `consumer.ts:1266-1269` and `:1445-1448`, or accept a justification that is half fictional.
**Expected:** The production comments say what `consumer.spec.ts:2690-2695` says.
**Why human:** The behaviour is correct and no must-have is at risk. What is at stake is whether a round that existed to close four false-comment gaps ships with a fifth of its own making. That is a judgement about this repository's standard, not a mechanical fix.

### 2. WR-02 — "the SAME redactor" at `export.ts:424`

**Test:** Rewrite the column comment to describe a per-axis application, or record that the summary is acceptable.
**Expected:** The first comment a policy auditor reads matches the two cut rules the code now has.
**Why human:** A sentence that was true before this round and is false after it. Which wording you want is a style and emphasis call.

### 3. WR-03 — the unqualified never-claim-a-false-redaction principle

**Test:** Scope the principle to the branch that honours it, or make the marker true on both branches.
**Expected:** `export.ts:297-299` and `redactUrlForExport`'s pinned behaviour stop contradicting each other.
**Why human:** The stronger repair — a second `<fragment-redacted>` marker — is a vocabulary change touching `observations.url`, which 07-22 was explicitly prohibited from moving. That is a policy decision, not a drive-by.

### 4. WR-04 — the recomputed historical figure in the new gate

**Test:** Pin `4,227` and `8.26` as named literals with their provenance, keeping a one-line assertion that the literal still equals the recomputed expression today.
**Expected:** The gate's shipped figures stay derived; its historical figures stop tracking constants they are not a function of.
**Why human:** Latent, not live — the gate is correct and green at HEAD. Whether to harden now or when a constant next moves is a maintenance-cost judgement.

### 5. IN-04 — what `depth_exceeded` measures while `DERIVED_MAX_DEPTH` is 1

**Test:** Add one sentence to `telemetry.ts`'s `derivedRejected` docblock, or decide it needs none.
**Expected:** Nobody wires this counter to a health surface expecting signal about the run.
**Why human:** No code change either way; it is a call about how much documentation a bounded-by-construction counter warrants.

### 6. 07-22 task 1 — your one-sentence statement of what a redacted label withholds

**Test:** Accept the quoted-by-reference substitution, or supply the sentence in your own words so it replaces the quoted text.
**Expected:** The docblock either keeps option A's defining text (labelled as such, which it is) or carries your own wording.
**Why human:** **Not a defect and not a gap.** The plan asked for your sentence; you answered with the option letter and a verdict on the premise. The executor declined to fabricate a quotation and instead wrote option A's own defining text, labelled in the docblock as *"in the words the decision was made against"*, with `07-22-SUMMARY.md:310-311` recording the substitution and coverage entry D8 carrying `human_judgment: true`. I read the docblock at HEAD and the labelling is accurate — nothing is presented as yours that is not.

---

## Gaps Summary

**There are no gaps.** All four diagnosed gaps (G-07-1 … G-07-4) are closed against the shipped property, not against the commits that claim them. Every prohibition in the scope fence held, including the two operator decisions the round was told to deliver rather than re-litigate: G-07-2's cascade landed as option A with no foreign key, no `ON DELETE CASCADE`, no migration and no `SCHEMA_VERSION` change; G-07-3's split landed as option A with the query axis cut on every label and the fragment axis only on protocol-shaped ones. Both are pinned by tests that assert their own non-vacuity, and G-07-3's landed RED before the change.

What the round also did was open new work of the class it was closing. WR-01 and WR-04 are its own; WR-02 is its own in the specific sense that it turned a true sentence false; WR-03 is pre-existing and was re-emphasised without being reconciled. None is behavioural, none falsifies a must-have, and none blocks the phase goal — which is why the status is `human_needed` rather than `gaps_found`. But the honest summary is not "clean round": **it closed two behavioural defects and two accuracy defects, and produced three accuracy defects plus one surfaced tension.** That is real progress with a real cost, and the cost belongs on the record beside the progress.

The phase goal itself is achieved and was achieved before this round: developer-readable source is recovered end to end, observed on real proxied traffic against a live Caido, and a malicious map still reaches no path-like sink — D-17 bans the filesystem outright and round 2 added no path access to plugin code.

---

_Verified: 2026-09-02T21:22:48Z at `e7c2ab5`_
_Verifier: Claude (gsd-verifier)_
_Gates run by this verifier, not read: `vitest run` (4,321 tests), `typecheck`, `lint`, `knip`, `build`, `vue-tsc`, two targeted spec runs, an in-memory non-vacuity proof of the new prose gate, and a scope-fence scan of the full round-2 diff._
