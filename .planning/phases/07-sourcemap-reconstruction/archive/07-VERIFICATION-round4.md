---
phase: 07-sourcemap-reconstruction
verified: 2026-09-03T11:52:00Z
verified_at_commit: d5fb7b1
status: superseded
score: 29/30 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 26/26
  previous_commit: e7c2ab5
  round: 4
  gaps_closed:
    - "G-07-5 — CLOSED, and I re-derived the positive claim from the code rather than accepting it. `admitDerived` has exactly ONE production call site repo-wide (`grep -rn 'admitDerived(' packages --include=*.ts | grep -v spec` returns `derive.ts:219` the definition and `consumer.ts:1292` the caller). Its `byteLen` is `Buffer.from(source.content,'utf8').length` (`consumer.ts:1281`) over a `sourcesContent` entry of the document `decodeInlineMap(announcement.url, MAP_MAX_BYTES)` produced at `:1124`; `parse.ts:227` refuses on `Buffer.byteLength(json,'utf8') > maxBytes`; `derive.ts:142` reads `export const DERIVED_SOURCE_MAX_BYTES = MAP_MAX_BYTES;` and `:233` refuses on `>`. A decoded entry is a strict byte-subset of the JSON string that carried it, so `too_large` cannot fire. I also checked the SECOND production parse site — `index.ts:1395`, the `deriveSource` read path — and it reaches `parsed.recovered.find(...)` and `Buffer.from(...)` but NEVER `admitDerived`, so 'through the ingest path' is correct scoping and not an escape hatch. Both comments now say it (`consumer.ts:1269-1272`, `:1451-1456`) and both cite `consumer.spec.ts`, which is byte-unchanged in this range (`git diff --stat 87cccd8..HEAD -- consumer.spec.ts` is EMPTY). `too_large` survives where it is live: `:276` (prose about `MAP_PARSE_REASONS`) and `:1005` (`if (reason === 'too_large')`). Every `+`/`-` line in the `consumer.ts` diff begins with `//` — the guard is byte-identical."
    - "G-07-7 — CLOSED, and every factual claim in the new exception paragraph checks out against the code. `export.ts:297-302` now opens 'THAT PRINCIPLE IS STATED OF THIS BRANCH, NOT OF THE EXPORT AS A WHOLE'; `:304-313` records the delegated branch's shared marker over `webpack:///./src/app.js#L5` as a KNOWN AND ACCEPTED exception; `:315-321` names the cost as operator trust and reviewability rather than disclosure and records the operator's decision to defer the vocabulary repair. Byte-identity verified by md5 of the extracted definitions against `87cccd8`: `redactUrlForExport`, `EXPORT_QUERY_REDACTION`, `isProtocolShapedLabel` and `redactSourceLabelForExport`'s BODY are all IDENTICAL; `{ name: 'url', redact: redactUrlForExport }` is unchanged; `export.spec.ts` diffstat is EMPTY and still pins `webpack:///./src/app.js#L5` at `:885`."
    - "G-07-8 — CLOSED as its contract was written. `SUPERSEDED_INSERT_SIDE_BEFORE_59347C3 = 4_227` and `SUPERSEDED_QUOTIENT_BEFORE_59347C3 = '8.26'` are named literals at `thresholds.spec.ts:883-884` with an 18-line provenance comment at `:864-882`. `git show 59347c3^:packages/engine/src/thresholds.ts` gives `RETENTION_SWEEP_EVERY_N = 128`, `ROWS_INSERTED_PER_ARTIFACT_MAX = 3`, `SOURCE_ROWS_PER_MAP_MAX = 2_048`, `RETENTION_SWEEP_MAX_ROWS = 512` -> `4227` and `8.26` — both literals are the right history. The coincidence assertion exists at `:895-931` and both its messages direct the remedy at the assertion rather than at the dated paragraph. All six SHIPPED figures at `:856-862` still derive from the `T.*` imports with no literal among them. The non-vacuity trap is intact: `region()` at `:810-823` reads the real file with `readFileSync`, so emptying the history paragraph still turns `:1015`'s `.toContain('4,227')` RED. `thresholds.ts` diffstat is EMPTY. **Residual, outside the contract: see `coincidental_reliance_items` and human item 1.**"
    - "Prior `coincidental_reliance_item` (the 4,227 recomputation) — DISCHARGED. The expression `T.RETENTION_SWEEP_EVERY_N + T.ROWS_INSERTED_PER_ARTIFACT_MAX + 2 * T.SOURCE_ROWS_PER_MAP_MAX` no longer appears in the documented-derivation block's presence or absence halves; both now consume the pinned literal. The undeclared precondition is now a DECLARED and ASSERTED one at `:895-931`."
  gaps_remaining:
    - "G-07-6 — its core clause is satisfied but its third `missing` bullet is violated, and the violation is a NEW false statement. See gap G-07-9 below."
  regressions:
    - "None behavioural. Full suite 90 files / 4,322 tests pass (4,321 baseline + 07-25's one new test); typecheck, lint, knip, build all exit 0. `thresholds.spec.ts` 62 -> 63 tests, green. Every phase-07 prohibition held (verified byte-level, see `gates_run_by_verifier`)."
  still_open_by_operator_decision:
    - "W-4 — `vue-tsc` is wired into no gate that runs. RE-MEASURED at HEAD, not restated: `package.json:9` is `\"typecheck\": \"tsc --build\"` and never invokes vue-tsc; `packages/frontend/package.json:8` carries `\"typecheck\": \"vue-tsc --build\"` but nothing at the root recurses into it. Running it directly yields EXACTLY the prior baseline's six errors — `SettingsPanel.vue` 430, 446, 461, 481 (TS7053) and `SourceBrowser.spec.ts` 259, 267 (TS2769). Round 3 added none. Accurately recorded as open."
    - "W-6 — `MAP_MAX_BYTES` under-serves recovery ~2x. RE-CONFIRMED at HEAD: `thresholds.ts:372` still reads `2_621_440` and the file's diffstat over `87cccd8..HEAD` is EMPTY. All three round-3 plans carry the prohibition. Accurately recorded as open."
    - "UAT gap 3 — `tests/frontend-load.spec.ts` frame-budget backstop. `git diff --stat 87cccd8..HEAD -- tests/frontend-load.spec.ts` is EMPTY, so round 3 neither touched nor wired it. It passed inside my full-suite run (12 tests, 9.1 s). Accurately recorded as open."
    - "IN-04 — the operator decided `derivedRejected.depth_exceeded` needs NO docblock caveat. CONFIRMED LEFT ALONE: `packages/backend/src/ingest/telemetry.ts` diffstat over `87cccd8..HEAD` is EMPTY."
    - "07-22's quoted-by-reference withholding text — the operator ACCEPTED it as discharging its criterion. CONFIRMED LEFT ALONE: `diff` of `export.ts:243-296` at `87cccd8` against HEAD is IDENTICAL, so the docblock head through the operator quotation is byte-unchanged and the first divergence is at `:297`, exactly where G-07-7's repair begins. `grep -cF` on the quoted sentence returns 1 before and 1 after."
gates_run_by_verifier:
  - command: "pnpm vitest run"
    result: "90 files / 4,322 tests passed, exit 0, 15.61 s — matches the orchestrator's figure exactly"
  - command: "pnpm typecheck"
    result: "exit 0"
  - command: "pnpm lint"
    result: "exit 0"
  - command: "pnpm knip"
    result: "exit 0"
  - command: "pnpm build"
    result: "exit 0"
  - command: "pnpm exec vitest run packages/engine/src/thresholds.spec.ts"
    result: "63 tests passed — 07-25's new coincidence assertion is in the suite and green (62 at the previous verification)"
  - command: "pnpm --filter @defminer/frontend typecheck (vue-tsc --build)"
    result: "6 errors, identical set to the W-4 baseline, none new. Not a wired gate — root typecheck is `tsc --build`."
  - command: "git archaeology of `sources_verbatim`'s `redact` binding at d5cd5e0 / a901b9e / 0e44102 / HEAD, plus md5 of the extracted `redactSourceLabelForExport` body at each"
    result: "d5cd5e0 = `redact: redactUrlForExport` (both axes on every label); a901b9e = `isProtocolShapedLabel(l) ? redactUrlForExport(l) : l` (both axes protocol-only); 0e44102 = protocol delegates, else cut at first `?` (query every label, fragment protocol-only). WR-01's reconstruction reproduced exactly."
  - command: "in-memory drift simulation — the shipped `region()` predicates re-applied to the real `thresholds.ts` history paragraph under hypothetical `SOURCE_ROWS_PER_MAP_MAX` values"
    result: "At 1,024: the coincidence test at :895 goes RED (recomputed 2,179 != pinned 4,227) AND :1022 goes RED demanding `1,155` appear in a paragraph about 2026-09-02. At 4,096: coincidence RED, :1022 GREEN by accident (insertSide becomes 4,227, which IS in the paragraph — as the superseded figure, not the shipped one). Confirms WR-02's substance; FALSIFIES its claim that the coincidence test 'stays green'."
  - command: "byte-identity md5 checks of redactUrlForExport / EXPORT_QUERY_REDACTION / isProtocolShapedLabel / redactSourceLabelForExport body, 87cccd8 vs HEAD"
    result: "all four IDENTICAL"
  - command: "prohibition scan of `git diff 87cccd8..HEAD -- packages/ tests/` added lines"
    result: "zero matches for fetch( / XMLHttpRequest / axios / node:http / https.request / readFile / writeFile / FOREIGN KEY / ON DELETE CASCADE / SCHEMA_VERSION / MAP_MAX_BYTES / RETENTION_SWEEP_MAX_PASSES. The only two `observations.url` hits are prose inside comments; the binding at `export.ts:418` is unchanged. `migrations.ts` diffstat EMPTY."
  - command: "diffstat over every file a round-3 prohibition names untouchable"
    result: "parse.ts, derive.ts, telemetry.ts, thresholds.ts, retention.ts, export.spec.ts, consumer.spec.ts — ALL EMPTY"
  - command: "debt-marker scan (TBD/FIXME/XXX, TODO/HACK/PLACEHOLDER) over the three files round 3 modified"
    result: "zero"
deferred:
  - truth: "SC5 second half — the FP corpora are extended to include reconstructed source as an input class, and a false-positive rate is measured"
    addressed_in: "Phase 3, published in Phase 11"
    evidence: "RE-CONFIRMED at HEAD rather than carried on the prior report's word. Both detector seams are still no-ops: `consumer.ts:998` (`derivedVisit`, `/* Phase 3 puts the detector here too. */`) and `:1511` (`visit`, `/* Phase 3 puts the detector here. */`). No detector exists, so no positive — true or false — can be produced over any corpus."
  - truth: "MAP-01's external half — `.map` comment and `SourceMap` response-header announcements are CONSUMED, not merely counted"
    addressed_in: "Phase 8"
    evidence: "RE-CONFIRMED at HEAD, and I correct the prior report's wording. There are TWO production decode sites, not one — `consumer.ts:1124` (ingest) and `index.ts:593` (the `deriveSource` re-read) — and BOTH are `decodeInlineMap(announcement.url, MAP_MAX_BYTES)`, both returning `null`/`done(null)` on `kind !== 'inline'`. So the inline-only property holds on both, D-01 refuses every outbound fetch by design, and `announcedExternal` (`consumer.ts:1131`) is the measurement of what is handed over. REQUIREMENTS.md:838 records the two halves explicitly."
coincidental_reliance_items:
  - truth: "The documented-derivation gate's non-vacuity companion holds — `ROWS_INSERTED_PER_ITERATION_MAX`'s history paragraph names BOTH figures of its ordering argument"
    reason: undeclared-precondition
    harden: "Round 3 discharged this for the SUPERSEDED operand (4,227, now `SUPERSEDED_INSERT_SIDE_BEFORE_59347C3` with an asserted coincidence) and left it standing on the SHIPPED-BY-COINCIDENCE operand. `thresholds.spec.ts:1016-1022` asserts `history.toContain(grouped(insertSide))` where `insertSide = T.RETENTION_SWEEP_EVERY_N + T.ROWS_INSERTED_PER_ITERATION_MAX` is recomputed from today's constants, against `thresholds.ts:504-505` — 'The gate landed first (4,227 on the insert side...) and the factor was retired second (2,179, exact)' — a sentence about 2026-09-02. It equals 2,179 today only because the constants have not moved. Empirically demonstrated: at `SOURCE_ROWS_PER_MAP_MAX = 1_024` this line demands `1,155` appear in that dated paragraph, with a failure message instructing the maintainer that the ordering argument 'can no longer be checked against the constants'. Harden by pinning a third literal (`SHIPPED_INSERT_SIDE_AT_59347C3 = 2_179`) and covering it in the same coincidence assertion, leaving `:933-971`'s presence half and `:973-999`'s absence half on the derived `insertSide` — those genuinely describe today. Advisory: this changes no score and no status."
human_verification:
  - test: "Decide WR-02 — `thresholds.spec.ts:1016-1022` still pins a HISTORICAL demand to a RECOMPUTED expression, on the adjacent operand of the sentence G-07-8's fix edited. Pin `2_179` the same way, or accept the residual."
    expected: "Either a third named literal (`SHIPPED_INSERT_SIDE_AT_59347C3 = 2_179`) with its provenance, covered by the same coincidence assertion at `:895-931` and substituted at `:1012`, `:1019` and `:1022`; or an override recording that the residual is accepted because the coincidence assertion already fires on the same event."
    why_human: "Independently confirmed and EMPIRICALLY demonstrated rather than reasoned: I re-applied the shipped `region()` predicates to the real history paragraph under hypothetical constants. At `SOURCE_ROWS_PER_MAP_MAX = 1_024`, `:1022` goes RED demanding `1,155` appear in a paragraph describing 2026-09-02, with a message that instructs rewriting that history — verbatim the 'drift detector becomes the drift generator' failure G-07-8 existed to close. **I also FALSIFY one half of the reviewer's claim:** the new coincidence test does NOT stay green. `recomputed` and `insertSide` share all three constants, so any move turns both RED. The residual is therefore narrower than the review states — the maintainer DOES get a signal — but it is still real, because that signal's own remedy text says to retire the coincidence assertion 'leaving the two literals, the absence half and the presence half exactly as they are' and never mentions the third test at `:1001-1023`, which is the one still red and still demanding the rewrite. Judgement call on whether a two-line pin is worth a fourth round; G-07-8's `truth:` and all four of its `missing` bullets are satisfied as written, so this is outside the closed contract."
  - test: "Decide IN-01 — `thresholds.spec.ts:925` interpolates TODAY's `RETENTION_SWEEP_MAX_ROWS` into a clause reading 'as both stood before 59347c3', and `8.26`'s historical denominator is never pinned."
    expected: "Either `SUPERSEDED_SWEEP_MAX_ROWS_BEFORE_59347C3 = 512` pinned and used in the message, with the provenance comment at `:864-882` recording that `8.26` is `4,227 / 512` as both stood at `59347c3^`; or an explicit acceptance that a diagnostic-only string does not warrant it."
    why_human: "Confirmed from the code and from git. `git show 59347c3^:packages/engine/src/thresholds.ts:152` gives `RETENTION_SWEEP_MAX_ROWS = 512`, the same value it holds today, so the sentence is TRUE at HEAD and the defect is latent. It is diagnostic-only text that prints solely inside a failure which already tells the reader to retire the assertion. Same class as WR-02, one severity lower."
  - test: "Decide IN-02 — `export.ts:311-313` says the shared query marker is `observations.url`'s behaviour 'on every row it has ever written'."
    expected: "Add the qualifier the rest of the file already uses — 'on every REDACTED row it has ever written' — or accept the shorthand."
    why_human: "Confirmed from the code. `serialiseRows` applies redaction conditionally at `export.ts:606-609`: `mode === 'redacted' && column.redact !== null ? column.redact(text) : text`. In raw mode `observations.url` writes the URL whole and no marker appears, so there is a large class of rows for which the described behaviour did not happen. The same file qualifies this carefully at `:172` ('What a covered field reads as in the redacted mode') and `:191`. A two-word fix, zero behavioural impact."
  - test: "Decide the ROUND-4 QUESTION the operator posed: keep iterating, or stop. My read is in the report body under 'The multi-round trend'."
    expected: "A decision on whether round 4 runs at all, and if it does, whether G-07-9's repair is a RESTATEMENT (which has now failed three consecutive rounds in this exact sentence) or a DELETION of the directional claim."
    why_human: "This is a judgement about process economics that only the operator can make. The evidence for both readings is assembled in the report body: the defect MECHANISM is real and recurrent, and the defect SEVERITY is genuinely converging. Both are true; they point different directions."
findings:
  - id: WR-01
    severity: warning
    title: "`export.ts:449-452` — the replacement sentence G-07-6 asked for is itself FALSE under every single baseline, and it contradicts `export.ts:261` in the same file 190 lines above"
    introduced_by: "this round (07-24) — and, crucially, AUTHORED IN THE PLAN: `07-24-PLAN.md`'s `must_haves.truths[4]` states the false claim verbatim, as does the round-3 ROADMAP entry"
    status: confirmed_independently
    promoted_to_gap: G-07-9
  - id: WR-02
    severity: warning
    title: "`thresholds.spec.ts:1016-1022` still pins a historical demand to a recomputed expression — G-07-8's exact defect, surviving on the adjacent operand of the same sentence"
    introduced_by: "pre-existing in 07-18, half-repaired by this round (07-25)"
    status: confirmed_independently_with_one_correction
    correction: "The review claims the new coincidence test 'stays green' while this one turns red. It does NOT — `recomputed` and `insertSide` share all three constants, so any move turns both RED. The residual is real but narrower than stated: the signal exists, it just points at the wrong assertion."
  - id: IN-01
    severity: info
    title: "`thresholds.spec.ts:925` interpolates today's `RETENTION_SWEEP_MAX_ROWS` into 'as both stood before 59347c3'; `8.26`'s historical denominator (512) is unpinned"
    status: confirmed_independently
  - id: IN-02
    severity: info
    title: "`export.ts:311-313`'s 'on every row it has ever written' is true only of redacted-mode rows — `:606-609` applies `column.redact` conditionally"
    status: confirmed_independently
  - id: VF-01
    severity: info
    title: "The acceptance evidence for the task that shipped WR-01 was `grep -c 'NARROWED'` -> 1 and `grep -c 'WIDENED'` -> 1 (`07-24-SUMMARY.md:97,100`). A word-presence probe cannot falsify a directional claim, so the RED->GREEN transition proved only that two words were typed."
    status: confirmed_independently
    note: "This is a GATE-DESIGN finding, not an executor finding. The executor implemented its plan's must_have faithfully; the must_have was wrong."
gaps:
  - gap_id: G-07-9
    truth: "`export.ts`'s `sources_verbatim` column comment describes what `redactSourceLabelForExport` now does AND aligns with the function docblock at `:261-275`, which already says it correctly (G-07-6 `missing` bullet 3)"
    status: failed
    reason: "The core restatement landed correctly at `:446-449`, but `:449-452` appends a NEW false claim that contradicts the docblock the gap explicitly told it to align with."
    severity: minor
    root_cause: |
      `export.ts:450-451` reads "the two axes moved in OPPOSITE directions: the FRAGMENT axis
      NARROWED, to protocol-shaped labels only, while the QUERY axis WIDENED, to every label."
      I reconstructed the column's history from git independently of the review:

        d5cd5e0 (07-06): `{ name: "sources_verbatim", redact: redactUrlForExport }`
                         -> query axis EVERY label, fragment axis EVERY label
        a901b9e (07-16): `isProtocolShapedLabel(l) ? redactUrlForExport(l) : l`
                         -> query axis PROTOCOL-ONLY, fragment axis PROTOCOL-ONLY (both NARROWED)
        0e44102 (07-22): protocol delegates; else cut at first `?`
                         -> query axis EVERY label (WIDENED), fragment axis PROTOCOL-ONLY (UNMOVED)

      Against the 07-16 baseline — the one the function docblock uses and the one G-07-6's own
      `missing` bullet used — the query axis widened and the fragment axis is UNMOVED, exactly as
      `:261` says. Against the 07-06 baseline the fragment axis narrowed and the query axis is
      UNCHANGED. Against 07-22's own change only ONE axis moved. There is no baseline under which
      the two axes moved in opposite directions; each half of the sentence borrows a different one.
      `export.ts:261` reads "THE FRAGMENT AXIS, UNMOVED" — a direct contradiction 190 lines away
      in the same file, discoverable by any reader who trusts neither.

      THE ORIGIN IS THE PLAN, NOT THE EXECUTION. `07-24-PLAN.md`'s `must_haves.truths[4]` reads
      "That column comment states the axis directions correctly: the FRAGMENT axis narrowed to
      protocol-shaped labels, the QUERY axis WIDENED to every label", and the round-3 ROADMAP entry
      for 07-24 repeats it. The executor implemented its contract faithfully. The chosen acceptance
      evidence — `grep -c 'NARROWED'` -> 1, `grep -c 'WIDENED'` -> 1 (07-24-SUMMARY.md:97,100) —
      is a word-presence probe structurally incapable of falsifying a directional claim.
    artifacts:
      - path: "packages/backend/src/store/export.ts"
        issue: "lines 449-452 assert a directional symmetry that is false under every baseline and contradicts `:261` in the same file"
      - path: ".planning/phases/07-sourcemap-reconstruction/07-24-PLAN.md"
        issue: "`must_haves.truths[4]` is where the false claim was authored — a plan-level defect, recorded so a round-4 plan does not inherit it"
      - path: ".planning/ROADMAP.md"
        issue: "the round-3 07-24 entry repeats 'both directions stated: fragment NARROWED, query WIDENED' — the same false claim in a third artifact"
    missing:
      - "PREFERRED — DELETE the directional claim rather than restate it. The shortest true sentence makes no historical claim at all: `:446-449` already describes the shipped behaviour correctly and completely, and the full, correct history lives at `:255-275` where `:261` and `:268` state each axis against a named baseline. The column comment needs no third telling of it. This sentence has now carried a false claim in three consecutive rounds (G-07-3, G-07-6, WR-01); restating it a fourth time is the move that keeps failing."
      - "IF a directional claim is kept, it must name its baseline in the same clause: 'ONE AXIS MOVED AT 07-22 AND IT WIDENED: the query cut now reaches every label. The fragment axis is UNMOVED since 07-16.' Never a merged clause that borrows one baseline per half."
      - "Correct `07-24-PLAN.md`'s `must_haves.truths[4]` and the ROADMAP's 07-24 entry, or a round-4 plan derived from them will re-ship the same sentence."
      - "The acceptance gate must falsify the CLAIM, not detect the WORD. A `grep -c` on a directional adverb cannot do this; an assertion that the column comment does NOT contain a direction word, or a review sign-off against `git show` of the three commits, can."
      - "Comment-only. Do NOT change `redactSourceLabelForExport`, `redactUrlForExport`, the export vocabulary or `observations.url` — all four are byte-verified unchanged and must stay so."
    debug_session: ""
---

# Phase 7: Sourcemap Reconstruction — Verification Report (round 4)

**Phase Goal:** Recover developer-readable source — the single highest value-per-effort feature in the tool — without letting a malicious map write outside its sandbox.
**Verified:** 2026-09-03T11:52:00Z at `d5fb7b1`
**Status:** gaps_found — **29/30**
**Re-verification:** Yes — fourth verification, after gap-closure round 3 (`07-23` … `07-25`, source range `87cccd8..HEAD`).

## Verdict

**Three of the four gaps are closed cleanly, and I confirmed each one from the code rather than from its summary. The fourth is not: the sentence written to replace G-07-6's false sentence is itself false, under every baseline, and it contradicts a line 190 lines above it in the same file.** That is one failed must-have bullet — G-07-6's third `missing` was "Align with the function docblock at `:309-318`, which already says it correctly", and the shipped result anti-aligns with it — so the status is `gaps_found` with a single gap, G-07-9.

Nothing in this round can move a byte. The entire non-`.planning` diff is three files, +121/−38, and filtering it to non-comment lines leaves only `thresholds.spec.ts`. Every guard, redactor, constant and binding the round was forbidden to touch is byte-verified identical to `87cccd8`. The full suite is 90 files / 4,322 tests green; typecheck, lint, knip and build all exit 0. **There is no Critical finding and there could not have been one from a round this shape** — which is itself part of the trend read below.

One correction to the round-4 review, which I re-derived rather than copied: **WR-02's substance holds but its blast-radius claim does not.** The review says the new coincidence test "stays green" while the un-pinned assertion turns red. It does not. `recomputed` and `insertSide` are built from the same three constants, so any drift turns both red — I demonstrated this against the real file. The residual is real but narrower than stated.

## Per-Gap Assessment

| Gap | Truth (from `07-UAT.md`) | Status | Evidence |
|---|---|---|---|
| G-07-5 | `consumer.ts:1266-1269` and `:1445-1448` say what `consumer.spec.ts:2690-2695` says — `too_large` is unreachable through the ingest path | ✓ VERIFIED | Both comments restated (`:1269-1272`, `:1451-1456`) and both cite the spec. I re-derived the unreachability from the SOLE production call site (`consumer.ts:1292`) through `parse.ts:227` and `derive.ts:142/233`, and separately confirmed the second production parse site (`index.ts:1395`) never reaches `admitDerived`. `too_large` survives where live at `:276` and `:1005`. Guard byte-identical — every diff line is a comment. |
| G-07-6 | `export.ts:424` describes what `redactSourceLabelForExport` now does — the same MARKER per AXIS, URL-shaped delegating, others cut at first `?` | ✗ FAILED (core clause met, `missing` bullet 3 violated) | `:446-449` states the per-axis behaviour correctly and "a narrowed application" is gone. But `:449-452` appends a false directional claim contradicting `:261`. Gap G-07-9. |
| G-07-7 | The never-claim-a-false-redaction principle is scoped to the branch that honours it, and `redactUrlForExport`'s shared marker is recorded as a known exception | ✓ VERIFIED | `:297-302` scopes it; `:304-313` records the exception with `webpack:///./src/app.js#L5` named; `:315-321` names the cost and the operator's deferral. md5 byte-identity on all four forbidden definitions; `export.spec.ts` untouched. One over-reach recorded as IN-02. |
| G-07-8 | The superseded figures are named literals with stated provenance, asserted equal to today's recomputation; SHIPPED figures stay derived | ✓ VERIFIED (contract as written) | Both literals pinned at `:883-884` with provenance at `:864-882`, both confirmed against `git show 59347c3^`. Coincidence assertion at `:895-931`, green. All six shipped figures still derived. Non-vacuity trap intact — `region()` reads the real file. Residual on the adjacent operand recorded as a coincidental-reliance item, not as a failure of this contract. |

**Score: 29/30.** The 26 must-haves verified at `e7c2ab5` are carried forward and re-confirmed at HEAD: round 3 changed no behaviour, every file they cover is either byte-identical or comment-only, and the full suite plus all four gates are green. Plus the four round-3 gap truths, of which three verify.

## Adjudication of Each Round-4 Review Finding

### WR-01 — CONFIRMED, and the origin is one level higher than the review found

I reconstructed `sources_verbatim`'s redaction history from git myself, and it reproduces the review's table exactly (see `gates_run_by_verifier`). The sentence at `:450-451` is false against all three candidate baselines:

- vs **07-06** (`redact: redactUrlForExport`, both axes on every label): fragment NARROWED ✓, query UNCHANGED ✗
- vs **07-16** (both axes protocol-only): fragment UNMOVED ✗, query WIDENED ✓
- vs **07-22's own change** (the sentence's immediate subject): only the query axis moved ✗

Each half is true against a different baseline; against any single one the claim is false. And `export.ts:261` reads "THE FRAGMENT AXIS, UNMOVED" — the file now contradicts itself, discoverable by any reader.

**What the review did not find, and what matters most for round 4:** the falsehood was authored in the PLAN, not the execution. `07-24-PLAN.md`'s `must_haves.truths[4]` states it verbatim, and the round-3 ROADMAP entry for 07-24 repeats it ("with both directions stated: fragment NARROWED, query WIDENED"). The executor implemented its contract faithfully and its acceptance gate — `grep -c 'NARROWED'` → 1, `grep -c 'WIDENED'` → 1 — could not have caught it, because a word-presence probe cannot falsify a directional claim. **A round-4 plan derived from the same source documents will re-ship the same sentence unless those documents are corrected too.** That is why G-07-9's `artifacts` list names the PLAN and the ROADMAP alongside the source file.

### WR-02 — CONFIRMED in substance, CORRECTED in scope

I did not reason about this; I measured it. I re-applied the shipped `region()` predicates to the real `thresholds.ts` history paragraph under hypothetical constants:

| `SOURCE_ROWS_PER_MAP_MAX` | coincidence test (`:895`) | `:1015` (pinned 4,227) | `:1022` (recomputed `insertSide`) |
|---|---|---|---|
| 2,048 (today) | GREEN | GREEN | GREEN |
| 1,024 | **RED** | GREEN | **RED — demands `1,155` in a 2026-09-02 paragraph** |
| 4,096 | **RED** | GREEN | GREEN *by accident* (`insertSide` becomes 4,227, which is in the paragraph as the **superseded** figure) |

So the defect is real: `:1022` asserts a demand about a dated paragraph from an expression recomputed today, and its failure message at `:1018-1021` actively instructs the maintainer that "the ordering argument it makes can no longer be checked against the constants" — i.e. rewrite the history. That is verbatim G-07-8's diagnosis, on the second operand of the same sentence. The 4,096 row is a bonus demonstration of the class: the assertion can go green for entirely the wrong reason.

**But the review overstates it.** It claims the new coincidence test "stays green while this one turns red for the wrong reason." It does not — `recomputed` and `insertSide` share all three constants, so any move turns both red. The maintainer therefore DOES get a signal. The residual is that the signal's own remedy text says to retire the coincidence assertion "leaving the two literals, the absence half and the presence half exactly as they are", and never mentions the third test at `:1001-1023` — which is the one still red and still pointing the wrong way.

**Does this fail G-07-8's truth?** No, and I will not stretch it into one. The gap's `truth:` names "the superseded figures" and its `missing` bullets say "the TWO superseded figures"; the UAT diagnosis enumerated exactly two, 4,227 and 8.26; both are pinned, with provenance, with the coincidence asserted, with the shipped figures left derived and the non-vacuity trap intact. All four bullets are met. `2,179` in its historical role is a third figure the contract did not enumerate. G-07-8 is closed; WR-02 is a newly-identified residual of the same class, routed to the operator as a decidable item and recorded as this round's one coincidental-reliance item — exactly where the previous round's item sat before the operator promoted it.

### IN-01 — CONFIRMED, latent

`git show 59347c3^:packages/engine/src/thresholds.ts:152` gives `RETENTION_SWEEP_MAX_ROWS = 512`, the same value it holds today, so "as both stood before 59347c3" is TRUE at HEAD. It is diagnostic-only text printing inside a failure that already tells the reader to retire the assertion. Same class as WR-02, one severity lower. Routed to the operator.

### IN-02 — CONFIRMED

`serialiseRows` applies redaction conditionally: `export.ts:606-609` is `mode === "redacted" && column.redact !== null ? column.redact(text) : text`. In raw mode `observations.url` writes the URL whole and no marker appears, so "on every row it has ever written" (`:311-313`) is true only of redacted rows. The same file qualifies this carefully at `:172` and `:191`. A two-word fix. Routed to the operator.

### What the review confirmed clean — I re-checked all of it and it holds

G-07-5's positive unreachability claim (re-derived from the sole call site, plus the `index.ts:1395` escape-hatch check); `too_large` surviving at `:276` and `:1005`; the depth guard byte-identical; G-07-7's exception paragraph factually sound; every byte-unchanged claim including the operator quotation (`diff` of `export.ts:243-296` old vs new is IDENTICAL); G-07-8's literals correct per `git show 59347c3^`; leaving `supersededInsertSide` at `:327-353` alone (it asserts a *relational* property over today's constants and demands nothing of any prose — recomputation is exactly right there, and `07-25-PLAN.md` prohibited touching it for that reason); the non-vacuity trap intact.

**Scope fence held completely.** No migration, no FK, no `ON DELETE CASCADE`, no `SCHEMA_VERSION` change, no lowering of `RETENTION_SWEEP_MAX_PASSES` (still 16), no change to `MAP_MAX_BYTES` (still `2_621_440`), no outbound fetch, no filesystem access, no change to `redactUrlForExport` / the export vocabulary / `observations.url`, no change to the depth guard's behaviour. IN-04 and 07-22's withholding text were both left alone, verified by empty diffstat and byte-identical extraction. `07-UI-SPEC.md:851`'s stale row and `thresholds.spec.ts:327-353`'s identically-named local are both correctly untouched.

## The multi-round trend

The operator asked for an honest read rather than a tally. Here it is, with the evidence for both sides, because both are true.

**The MECHANISM is real and it has not been interrupted.** Three consecutive rounds have produced the same defect class: *a natural-language claim in the repository that the code beside it contradicts.* Sharper than that — one specific sentence, the `sources_verbatim` column comment in `export.ts`, has carried a false claim in **three consecutive rounds**: G-07-3 (07-16's "a non-URL label has neither axis"), G-07-6 (07-22 leaving "the SAME redactor" standing), and now WR-01 (07-24's invented directional symmetry). Each round's repair was a restatement, and each restatement was the next round's defect. The reason it keeps recurring is visible in the artifacts and is not an execution failure: the false claim is authored in the PLAN's `must_haves` and copied into the ROADMAP, and the acceptance gate chosen for prose repairs is a word-presence `grep -c`, which by construction cannot falsify a semantic claim. Round 3's plans were unusually self-aware about this — they wrote "**because three of the four change no behaviour, a passing suite proves nothing about them**" and built region-scoped comment gates in response — and the gate they built still only checks that a word is present. **Nothing in the current process can detect a false sentence.** A fourth round run the same way has, on this evidence, an above-even chance of producing a fifth.

**The SEVERITY is genuinely converging, and this is not a consolation prize.** The trajectory is monotone and steep:

| Round | Plans | What came out of it | Worst severity | Behavioural change |
|---|---|---|---|---|
| 1 | 7 | G-07-1 … G-07-4 | major | yes — migration `v: 9`, key widening, a retention sweep |
| 2 | 5 | G-07-5 … G-07-8 | major (G-07-8) | yes — a real orphaning bug in `deleteDigest`, an under-counted telemetry unit |
| 3 | 3 | WR-01, WR-02, IN-01, IN-02 | warning | **none** — 3 files, +121/−38, comments plus one new test |

Round 2 found a cascade that orphaned every evicted bundle's sightings — a data-integrity bug. Round 3 found a comment that names the wrong baseline and a test that recomputes a number it should pin. Nothing in round 3's residue can leak, corrupt, crash, mis-count or change a single exported byte. The two Warnings are a documentation-accuracy tail, and the one that is structural (WR-02) is latent, fires only on a constant re-measurement nobody has scheduled, and — as I measured — does raise an alarm when it fires, just the wrong one.

**So both readings are correct and they point different directions.** The loop is real; the stakes are now very small. What I would *not* do is run round 4 the same way — a fourth restatement of that sentence, gated by a fourth word-presence grep, is the move that has failed three times. If round 4 runs, the repair that breaks the pattern is **deletion, not restatement**: `:446-449` already describes the shipped behaviour correctly and completely, and the full, correct, baseline-anchored history is 190 lines above at `:255-275`. The column comment does not need a third telling of it, and a sentence that makes no historical claim cannot make a false one. Correct the PLAN and the ROADMAP alongside the source, or the next plan inherits the same falsehood. If instead the operator accepts WR-01, the override path is below, and phase 07 closes at 29/30 with two documented, non-behavioural residuals — which is a defensible place to stop.

## Accepting the deviation instead

If the operator judges G-07-9 not worth a fourth round, add to this file's frontmatter:

```yaml
overrides:
  - must_have: "`export.ts`'s `sources_verbatim` column comment describes what `redactSourceLabelForExport` now does AND aligns with the function docblock at `:261-275`"
    reason: "Comment-only, zero behavioural impact, and the authoritative baseline-anchored history at :255-275 is correct. Accepted rather than restated a fourth time."
    accepted_by: "six2dez"
    accepted_at: "2026-09-03T__:__:__Z"
```

That flips the status to `human_needed` on the remaining four items and closes the phase at 30/30.

## Requirements Coverage

| Requirement | Status | Evidence at HEAD |
|---|---|---|
| MAP-01 | ✓ SATISFIED (inline half) / deferred (external half → Phase 8) | Both production decode sites (`consumer.ts:1124`, `index.ts:593`) are `decodeInlineMap`; `announcedExternal` counts the handover. Untouched by round 3. |
| MAP-02 | ✓ SATISFIED | Untouched by round 3; regression scope only, green in the full suite. |
| MAP-03 | ✓ SATISFIED | Untouched by round 3. |
| MAP-04 | ✓ SATISFIED | Untouched by round 3. |
| MAP-05 | ✓ SATISFIED | Untouched by round 3. |
| MAP-06 | ✓ SATISFIED | Carried by `07-23` (comment-only) and `07-25` (spec-only). Guard behaviour byte-identical; `thresholds.spec.ts` 63 green. |
| MAP-07 | ✓ SATISFIED | Carried by `07-24` (comment-only). `redactSourceLabelForExport`'s body and `export.spec.ts` byte-unchanged. **The column comment documenting it is inaccurate — G-07-9 — but the shipped redaction behaviour is correct and pinned.** |
| UI-05 | ✓ SATISFIED | Untouched by round 3. |
| SC5 second half | deferred → Phase 3 / Phase 11 | Both detector seams still no-ops (`consumer.ts:998`, `:1511`). |

---

_Verified: 2026-09-03T11:52:00Z at `d5fb7b1`_
_Verifier: Claude (gsd-verifier) — round 4_
_Gates run by the verifier, not carried from the summaries: full suite, typecheck, lint, knip, build, thresholds spec, vue-tsc baseline, git archaeology of three commits, an in-memory drift simulation, md5 byte-identity on four definitions, and a prohibition scan of every added line._
