---
phase: 07-sourcemap-reconstruction
verified: 2026-09-03T12:20:01Z
verified_at_commit: eeb9c2c
status: passed
score: 33/33 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 29/30
  previous_commit: d5fb7b1
  round: 5
  gaps_closed:
    - "G-07-9 — CLOSED, and closed by DELETION rather than by a fourth restatement, which I proved rather than accepted. A word-level diff of the `sources_verbatim` column comment across `34dd37e..HEAD` removes exactly 26 words — `reused — and the two axes moved in OPPOSITE directions: the FRAGMENT axis NARROWED, to protocol-shaped labels only, while the QUERY axis WIDENED, to every label.` — and adds exactly ONE token: `reused.` Nothing else in the region changed by a character. The region measured by the plan's own anchors (`awk '/WHAT DOES NOT SURVIVE/,/name: \"sources_verbatim\"/'`) goes 15 -> 13 lines and 1,104 -> 934 bytes, and direction words 2 -> 0. The operator's stated figures reproduce EXACTLY. The two surviving `narrow`-family hits in the file (`:253` 'narrower than an exemption', `:335` 'the SAME marker, a narrower cut') are outside the region, both true of the code beside them, and both absent from the diff. The surviving column comment now says only what the shipped body does — I compared it clause by clause against `redactSourceLabelForExport` at HEAD and it is exact — and it no longer contradicts `:261` ('THE FRAGMENT AXIS, UNMOVED')."
    - "G-07-9's planning-record half — CLOSED. `07-24-PLAN.md`'s `must_haves.truths[4]` no longer asserts a change of scope in either direction, and carries a dated ERRATA block above the objective; the ROADMAP's round-3 07-24 entry is corrected in place with its `(MAP-07, UI-05)` tags and its G-07-6/G-07-7 subject intact. `07-24-SUMMARY.md` diffstat is EMPTY, so the VF-01 evidentiary chain (its lines 97 and 100) survives, exactly as the plan's prohibition required."
    - "G-07-10 — CLOSED. `SHIPPED_INSERT_SIDE_AT_59347C3 = 2_179` is pinned at `thresholds.spec.ts:924` with provenance at `:879-891`, covered by a THIRD `expect` inside the SAME coincidence assertion (`:973-989`), and substituted at all three consumption sites in the non-vacuity guard. I re-measured the literal from git rather than reading the comment: `git show 59347c3:packages/engine/src/thresholds.ts` gives RETENTION_SWEEP_EVERY_N = 128 at line 215, ROWS_INSERTED_PER_ARTIFACT_MAX = 3 at line 111, SOURCE_ROWS_PER_MAP_MAX = 2_048 at line 454, and ROWS_INSERTED_PER_ITERATION_MAX = ARTIFACT_MAX + SOURCE_ROWS_PER_MAP_MAX with no compensating factor at line 490 — so 128 + (3 + 2,048) = 2,179. All FOUR line-number citations in the new comment are correct."
    - "G-07-11 — CLOSED. `SUPERSEDED_SWEEP_MAX_ROWS_BEFORE_59347C3 = 512` is pinned at `:925` and substituted into the `as both stood before 59347c3` clause, which now interpolates no present-day constant. Re-measured: `git show 59347c3^:packages/engine/src/thresholds.ts` line 152 is `RETENTION_SWEEP_MAX_ROWS = 512` — the fifth cross-commit line-number citation this round shipped, and the fifth that is correct. 4,227 / 512 = 8.2559… -> `8.26` to two places, computed by me. No-op at HEAD by construction, as the contract said it must be."
    - "G-07-12 — CLOSED, and the qualifier is EXACTLY accurate rather than approximately so. `export.ts:311-313` now reads `observations.url`'s shipped behaviour on every REDACTED row it has ever written. The governing conditional is `projectRow` (`export.ts:602-605`, reached only from `serialiseRows`): `mode === \"redacted\" && column.redact !== null ? column.redact(text) : text`. `observations.url`'s `redact` is non-null, so the described behaviour holds on precisely the redacted rows and on no others — neither over- nor under-stated. The two in-file precedents the gap cited are intact at `:172` ('What a covered field reads as in the redacted mode') and `:191` ('what the raw mode exposes and the redacted mode withholds')."
  gaps_remaining: []
  regressions: []
gates_run_by_verifier:

  - command: "pnpm vitest run --reporter=dot"
    result: "90 files / 4,322 tests passed, exit 0, 14.38 s — EXACTLY the round-4 baseline. No test added, none removed, as both plans required."
  - command: "pnpm typecheck"
    result: "exit 0"
  - command: "pnpm lint"
    result: "exit 0"
  - command: "pnpm knip"
    result: "exit 0"
  - command: "pnpm build"
    result: "exit 0"
  - command: "pnpm exec vitest run packages/engine/src/thresholds.spec.ts"
    result: "63 tests passed — the same count as the round-4 baseline, confirming both repairs extended existing assertions rather than adding an `it`."
  - command: "pnpm --filter @defminer/frontend typecheck (vue-tsc --build)"
    result: "6 errors, identical to the W-4 baseline, none new. Still not a wired gate."
  - command: "ARM-CHECK A, run by me against the REAL file — replaced `4,227` with a non-numeric token in `thresholds.ts`'s history paragraph, then ran the spec"
    result: "RED at `thresholds.spec.ts:1075` (`.toContain(grouped(SUPERSEDED_INSERT_SIDE_BEFORE_59347C3))`), 1 failed / 62 passed. Restored via `git checkout --`; md5 back to `6391d0d50f9741f50909ec9197dd25c9`."
  - command: "ARM-CHECK B, run by me against the REAL file — replaced ONLY `2,179` in the same paragraph, then ran the spec"
    result: "RED at `thresholds.spec.ts:1086` (`.toContain(grouped(SHIPPED_INSERT_SIDE_AT_59347C3))`), 1 failed / 62 passed. THIS IS THE ONE THAT MATTERS: it proves the newly-pinned operand is load-bearing rather than decorative, i.e. the substitution did not make the guard vacuous. Restored; md5 identical."
  - command: "WR-01 HAZARD MUTATION, my own, not in any plan — desynced the block-level `insertSide` (`:857-858`) from the test-local `recomputedShipped` (`:939-940`) by adding a term to the former only, then ran the spec"
    result: "Exactly ONE test goes red — `the passes docblock states the insert side…` — and it goes red for the DOCBLOCK reason, telling the maintainer to rewrite the RETENTION_SWEEP_MAX_PASSES prose. The coincidence assertion, whose message calls `recomputedShipped` 'the shipped insert side', stays GREEN while covering a stale formula. This CORRECTS the review: the desync is not silent, but the signal fires at the wrong assertion with the wrong remedy. Restored; md5 `c52e08cfdad932dfdfecc8701a0cf149`."
  - command: "FOURTH independent re-derivation of the axis history — `git show <c>:packages/backend/src/store/export.ts` for d5cd5e0 / a901b9e / 0e44102, reading the `sources_verbatim` binding AND the redactor bodies at each"
    result: "d5cd5e0 = `redact: redactUrlForExport` with `url.search(/[?#]/)` and no shape test in front of it -> BOTH axes on EVERY label. a901b9e = `isProtocolShapedLabel(l) ? redactUrlForExport(l) : l` -> BOTH axes PROTOCOL-ONLY. 0e44102 = protocol delegates, else `label.indexOf(\"?\")` -> QUERY on EVERY label, FRAGMENT PROTOCOL-ONLY. The errata table in `07-24-PLAN.md` reproduces this in EVERY PARTICULAR. The deleted sentence was false against all three baselines and round 4 did NOT replace one false history with another."
  - command: "git archaeology of `thresholds.spec.ts:844-850` — `git blame` plus the block's literal inventory at its authoring commit"
    result: "Authored at 27d9111 (07-18, 2026-09-02 21:47), UNTOUCHED by the round-4 range. At that commit the `describe` block contained ZERO named literal constants (`grep -E 'const [A-Z_]+ = '` over the block returns nothing), so ':846's `pins` cannot ever have meant `pinned literals`. This is what REFUTES review finding WR-02."
  - command: "git archaeology of WR-03's stale citation — retention.ts at 27d9111 vs HEAD"
    result: "`git show 27d9111:packages/backend/src/store/retention.ts` puts the quoted sentence at line 178, so the citation was CORRECT when written. `d3caf4d` (07-20, gap-closure round 2) grew the file by 15 lines and moved it to :193-194. The staleness is a round-2 artefact, not a round-4 one; retention.ts diffstat in this range is EMPTY."
  - command: "byte-identity md5 over the five forbidden constructs, 34dd37e vs HEAD"
    result: "redactUrlForExport bab965d7…, redactSourceLabelForExport 35a5e79f…, isProtocolShapedLabel 0130e429…, EXPORT_QUERY_REDACTION 46b88b99…, serialiseRows b17979f7… — ALL FIVE IDENTICAL. Both redacting column bindings appear exactly once before and after; the `<query-redacted>` literal count is 2 before and 2 after."
  - command: "diffstat over every path the round-4 constraints name untouchable, by repo-relative path"
    result: "thresholds.ts, export.spec.ts, consumer.spec.ts, parse.ts, derive.ts, telemetry.ts, retention.ts, migrations.ts AND 07-24-SUMMARY.md — ALL EMPTY. thresholds.ts md5 is `6391d0d50f9741f50909ec9197dd25c9`, matching the plan's pinned digest."
  - command: "prohibition scan of every ADDED line in `git diff 34dd37e..HEAD -- packages/ tests/` (81 lines)"
    result: "zero matches for fetch( / XMLHttpRequest / axios / node:http / https.request / readFile / writeFile / FOREIGN KEY / ON DELETE CASCADE / SCHEMA_VERSION / MAP_MAX_BYTES / RETENTION_SWEEP_MAX_PASSES. The single `observations.url` hit is prose inside a comment. Every added line in export.ts begins with `*` or `//` — comment-only, confirmed by filtering the diff."
  - command: "debt-marker scan (TBD/FIXME/XXX, TODO/HACK/PLACEHOLDER) over both modified files"
    result: "zero"
  - command: "regression spot-check of the phase's load-bearing seams at HEAD"
    result: "Both production decode sites still `decodeInlineMap(announcement.url, MAP_MAX_BYTES)` (consumer.ts:1124, index.ts:593); `admitDerived` still has exactly one production call site (consumer.ts:1292); DERIVED_MAX_DEPTH still 1 with the refusal at derive.ts:204; both Phase-3 detector seams still no-ops (consumer.ts:998, :1511)."
  - command: "requirement-to-plan cross-reference over all 27 phase plans"
    result: "MAP-01 … MAP-07 and UI-05 each claimed by at least one plan's `requirements:` frontmatter. Zero orphaned IDs. All eight are `[x]` in REQUIREMENTS.md at :838-844 and :884."
deferred:

  - truth: "SC5 second half — the FP corpora are extended to include reconstructed source as an input class, and a false-positive rate is measured"
    addressed_in: "Phase 3, published in Phase 11"
    evidence: "RE-CONFIRMED at HEAD for the third consecutive round rather than carried on the prior report's word. Both detector seams are still literal no-ops: `consumer.ts:998` (`/* Phase 3 puts the detector here too. */`) and `:1511` (`/* Phase 3 puts the detector here. */`). No detector exists, so no positive — true or false — can be produced over any corpus."
  - truth: "MAP-01's external half — `.map` comment and `SourceMap` response-header announcements are CONSUMED, not merely counted"
    addressed_in: "Phase 8"
    evidence: "RE-CONFIRMED at HEAD. Both production decode sites are `decodeInlineMap`, both returning null on a non-inline announcement; D-01 refuses every outbound fetch by design; `announcedExternal` is the measurement of what is handed over. REQUIREMENTS.md:838 records the two halves explicitly."
coincidental_reliance_items:

  - truth: "G-07-10 — the documented-derivation block pins the shipped-by-coincidence historical operand, so no historical demand is recomputed from today's constants"
    reason: undeclared-precondition
    harden: "The truth itself holds unconditionally — I verified every `toContain`/`not.toContain` argument in the block is now either a pinned literal or a figure that genuinely describes today. What relies on an undeclared precondition is the new assertion's SELF-DESCRIPTION: `:939-940`'s `recomputedShipped` is a byte-identical duplicate of `:857-858`'s `insertSide`, and the message at `:975` calls it 'the shipped insert side'. That name is true only while the two expressions agree, and nothing in the file makes them agree. I mutated the real file to demonstrate the consequence: on a desync, exactly one test goes red and it is the passes-docblock presence check, whose remedy points at the docblock — the coincidence assertion goes on claiming coverage of a quantity it has stopped tracking. Harden with the reviewer's one-liner, `expect(recomputedShipped).toBe(insertSide)`, or by reading the block binding directly. Advisory: this changes no score and no status."
findings:

  - id: WR-01
    severity: warning
    title: "`thresholds.spec.ts:939-940` duplicates the block-level `insertSide` derivation (`:857-858`) byte-for-byte with nothing asserting the two agree"
    introduced_by: "this round (07-27), to preserve a plan-transient `grep -c 'grouped(insertSide)' == 4` gate that exists in `07-27-PLAN.md:244-245` and not in the repository"
    status: confirmed_independently_with_one_correction
    correction: "The review calls it 'a drift detector that can silently stop detecting'. It does NOT stop silently — I mutated `insertSide` in the real file and the passes-docblock presence check goes RED. The defect is that the signal fires at the WRONG assertion with the WRONG remedy (rewrite the docblock), while the assertion that names the quantity stays green covering a stale formula. Real, narrower than stated, and a one-line fix."
    in_contract: false
    note: "Out of G-07-10's contract, which specified the literal, the coincidence coverage, the three substitutions, the two halves to leave alone, non-vacuity and spec-file-only. All six were met. This is a NEW residual of a DIFFERENT class from rounds 1-3: a duplication, not a false claim."
  - id: WR-02
    severity: info
    title: "`thresholds.spec.ts:845-846`'s 'the same two numbers this block pins' — the review says this round's own pins made it wrong"
    status: REFUTED_ON_ITS_CENTRAL_CLAIM
    correction: |
      I traced the sentence rather than reading it. `git blame` puts `:844-850` at 27d9111 (07-18),
      untouched by this round. At that commit the `describe` block contained ZERO named literal
      constants — `grep -E 'const [A-Z_]+ = '` over the block returns nothing — so "the two numbers
      this block PINS" cannot ever have meant "pinned literals". The file's own vocabulary for
      "pin" is the gate sense, and its authoring commit says so: 3e32a8a, "pin the DOCUMENTED
      derivation against the SHIPPED constants". Under that reading the two numbers are the two
      sides of the inequality — 8,192 (`deleteSide`) and 2,179 (`insertSide`) — which are exactly
      the two the quoted `retention.ts` sentence states, and which the presence half holds the
      passes docblock to. The sentence was TRUE at authoring and it is TRUE at HEAD.
      The review's own reasoning concedes the point without following it: it notes that "before this
      round the block pinned NEITHER of the two numbers the sentence names", which under the
      literal-count reading makes the sentence false BEFORE round 4 and — since round 4's two new
      pins are 2,179 and 512, both of which ARE in the quoted sentence — brings the overlap to
      exactly two. The literal-count reading is the one reading under which this round IMPROVED the
      sentence. Neither reading supports "made wrong by round 4".
      WHAT SURVIVES, one severity lower: round 4 introduced a term-of-art use of PINNED at
      `:913-916` ("the SHIPPED figures above are DERIVED … while the HISTORICAL figures below are
      PINNED as the literals they are"), which collides with `:846`'s gate-sense "pins" 70 lines
      above. Two readings are now available to a reader and one of them is false. That is a
      vocabulary cost this round created — worth a word, not a round.
  - id: WR-03
    severity: warning
    title: "`thresholds.spec.ts:845`'s cross-file citation is stale — the quoted sentence is at `retention.ts:193-194`, not `:178-180`"
    status: confirmed_independently
    introduced_by: "NOT this round. Correct when written at 27d9111; broken by d3caf4d (07-20, gap-closure round 2), which grew retention.ts by 15 lines."
    note: "This IS the phase's recurring defect class — a claim in the repository the code contradicts, verifiable in one command — and it is the only live instance left. `retention.ts:178` reads 'AND THE INEQUALITY NOW BOUNDS SOMETHING REAL'; a reader following the pointer lands 15 lines short. It survived rounds 2, 3 and 4 unnoticed by every review and every verification, including mine. A four-character fix, in nobody's contract."
  - id: IN-01
    severity: info
    title: "The coincidence test's first and third messages both read 'describes 2026-09-02, when the figure was …' with different figures (`:948` = 4,227, `:981` = 2,179)"
    status: confirmed_independently
    note: "Both are true — the two figures are the insert side either side of 59347c3, which landed that day — and each message disambiguates itself earlier ('READ at 59347c3's parent' / 'READ at 59347c3'). Diagnostic-only text that prints solely inside a failure. Four words would settle it."
  - id: IN-02
    severity: info
    title: "'presence half' names two different tests inside one comment block"
    status: confirmed_independently
    note: "`:872` (pre-existing, 07-25) calls the dated-paragraph guard 'the presence half'; `:889` and `:893` (added THIS round) call the same test 'the non-vacuity half'; `:955` and `:988` use 'the presence half' for the passes-docblock check. Round 4 introduced the competing name. Nothing false; it costs the next reader a re-derivation."
  - id: IN-03
    severity: info
    title: "`thresholds.spec.ts:352` bounds today's delete budget against a formula the code retired"
    status: confirmed_independently_and_it_SHARPENS_my_own_round_4_report
    note: |
      Arithmetic re-derived by me. `:352` is `expect(deletedPerInterval).toBeGreaterThanOrEqual(supersededInsertSide)`
      where `deletedPerInterval` = 512 x 16 = 8,192 (independent of SOURCE_ROWS_PER_MAP_MAX) and
      `supersededInsertSide` = 128 + 3 + 2S. It goes RED for S > 4,030; at S = 4,096 it is 8,323
      against 8,192, exactly as the review states.
      THE SCALE-INVARIANCE ARGUMENT FOR `:342-351` IS CORRECT AND I CONFIRM IT ALGEBRAICALLY:
      supersededInsertSide = shippedInsertSide + S, so the assertion reduces to S > 0 and demands
      nothing of any prose. So the review's split judgment is right — and it is SHARPER than my own
      round-4 report, which cleared the whole test at `:327-353` on the strength of the relational
      assertion alone. `:352` is a genuine residual of the class and my prior blanket clearance was
      over-broad. Recorded as a self-correction. `07-27-PLAN.md` prohibited touching this test, so
      it is correctly untouched; it belongs to whichever plan next owns the file.
  - id: VF-01-followup
    severity: info
    title: "The VF-01 constraint was honoured in substance, and the ONE gate that stayed word-shaped is the one the executor itself flagged"
    status: confirmed_independently
    note: |
      Round 4's prose gates are absence assertions (`awk '/WHAT DOES NOT SURVIVE/,/name: \"sources_verbatim\"/'
      | grep -ciE 'narrow|widen'` -> 0), a strictly decreasing byte count (1,104 -> 934), and
      `git show` measurements against five named line numbers. Each is falsifiable BY THE SHIPPED
      TEXT, which is what test 5 demanded and what a `grep -c '<word>' == 1` could never be.
      `07-27-SUMMARY.md:402` names its own exception unprompted: "The one gate that remains
      word-shaped is the `grep -c 'only these'` tally probe … a future author could satisfy it by
      rewording rather than by understanding. That residual is worth a verifier's eye." That is the
      exact seam the review's WR-02 tried to walk through, and it was self-reported before any
      reviewer saw it. Recorded because it is the first time in this phase a round predicted its own
      residual.
gaps: []
behavior_unverified_items: []
human_verification:

  - test: "Decide WR-01 — remove the duplicate derivation at `thresholds.spec.ts:939-940`, or link it."
    expected: "Either `expect(recomputedShipped, …).toBe(SHIPPED_INSERT_SIDE_AT_59347C3)` rewritten to read the block-level `insertSide` and the local dropped; or the local kept for symmetry with `recomputed`/`recomputedQuotient` plus one line — `expect(recomputedShipped).toBe(insertSide);` — so a desync is detectable where it matters. Or an override recording that a duplicate of a two-term sum is an acceptable maintenance cost."
    why_human: "Demonstrated, not reasoned: I desynced the two bindings in the real file and ran the spec. Exactly one test goes red, and it is the passes-docblock presence check, whose remedy tells the maintainer to rewrite the docblock — while the coincidence assertion that NAMES the quantity stays green covering a stale formula. The hazard is real; its probability is low (both expressions read the same two `T.*` imports, so a constant move hits both). The cause is worth the operator's attention beyond the fix: the duplicate exists to keep a `grep -c 'grouped(insertSide)' == 4` tally that lives in `07-27-PLAN.md` and nowhere else. VF-01 was a gate too WEAK to falsify a claim; this is a gate strong enough to shape the code around itself. Both are gate-design defects, one round apart."
  - test: "Decide WR-03 — correct `thresholds.spec.ts:845`'s citation from `retention.ts:178-180` to `retention.ts:193-194`."
    expected: "Four characters changed, or an explicit acceptance that a stale line number in a comment is not worth a round."
    why_human: "This is the only LIVE false claim left in either file, and it is the phase's signature defect class. Confirmed from git in two commands: the citation was CORRECT at its authoring commit 27d9111, and `d3caf4d` (07-20) grew retention.ts by fifteen lines and moved the sentence. A reader following the pointer today lands on 'AND THE INEQUALITY NOW BOUNDS SOMETHING REAL'. It is pre-existing, it was in no gap contract, and it survived rounds 2, 3 and 4 — including my own round-4 verification, which read that paragraph and did not check the pointer. Consider also whether ANY line-number citation across a file boundary should be written in this project, given that this one broke within one round of being written."
  - test: "Decide IN-01, IN-02 and IN-03 together — three diagnostic/terminology nits in `thresholds.spec.ts`, all confirmed, none false."
    expected: "Either a single tidy-up pass (four words on the two 2026-09-02 clauses; one vocabulary for the four tests; and, for whichever plan next owns the file, pin or drop `:352`), or an explicit acceptance that diagnostic text inside a failure message does not warrant a round."
    why_human: "All three are confirmed and none can move a byte. IN-03 carries the one thing worth flagging: it CORRECTS my own round-4 report, which cleared `thresholds.spec.ts:327-353` wholesale. The load-bearing assertion at `:342-351` genuinely is scale-invariant — I re-derived it, it reduces to `S > 0` — but `:352` is not, and goes red at `SOURCE_ROWS_PER_MAP_MAX = 4,096` for a formula no shipped constant uses. My prior clearance was over-broad and I am recording that rather than repeating it."
  - test: "Decide the STOP-OR-CONTINUE question the operator posed. My read is in the report body under 'Did changing the gate design change the outcome?'"
    expected: "A decision to close phase 07 at 33/33 with the residuals above accepted, or to authorise a round 5 scoped to WR-01 and WR-03 (roughly four lines of change between them)."
    why_human: "Process economics only the operator can price. My read, with the evidence for both sides in the body: the gate change WORKED on the thing it targeted — round 4 shipped zero false sentences, and I verified every historical claim in its diff from git independently, including five cross-commit line-number citations that are all correct. The defect class did NOT reappear in round 4's own additions; the review's candidate for that (WR-02) is refuted above. What round 4 did produce is milder and different in kind: one duplication and one terminology collision. The single live falsehood left (WR-03) predates the round by two rounds."
still_open_by_operator_decision:

  - "W-4 — `vue-tsc` wired into no gate that runs. Re-measured at HEAD: 6 errors, identical to the baseline, none added by round 4. Root `typecheck` is `tsc --build` and exits 0."
  - "W-6 — `MAP_MAX_BYTES` under-serves recovery ~2x. Still `2_621_440`; zero occurrences in the round's added lines."
  - "Round-1 UAT gap 3 — `tests/frontend-load.spec.ts` frame-budget backstop not wired. Untouched."
  - "IN-04 — `derivedRejected.depth_exceeded` needs no docblock caveat. Decided round 3; `telemetry.ts` diffstat EMPTY."
  - "SC5's second half -> Phase 3 / Phase 11. Re-confirmed at HEAD, see `deferred`."
  - "MAP-01's external half -> Phase 8. Re-confirmed at HEAD, see `deferred`."

---

# Phase 7: Sourcemap Reconstruction — Verification Report (round 5)

**Phase Goal:** Recover developer-readable source — the single highest value-per-effort feature in the tool — without letting a malicious map write outside its sandbox.
**Verified:** 2026-09-03T12:20:01Z at `eeb9c2c`
**Status:** human_needed — **33/33**
**Re-verification:** Yes — fifth verification, after gap-closure round 4 (`07-26`, `07-27`; source range `34dd37e..HEAD`).

## Verdict

**All four round-4 gaps are closed, and for the first time in this phase no must-have fails.** More
importantly for the question the operator actually asked: **round 4 shipped no false sentence.** I
re-derived every historical claim its diff makes — the axis history from three commits, both new
literals from `59347c3` and `59347c3^`, and each of the five cross-commit line-number citations — from
git, before reading the round's own account of any of them. All of it checks out. The deletion is a
deletion: a word-level diff removes 26 words and adds one token, `reused.`, and the surviving
explanation is otherwise byte-identical. No replacement claim was smuggled in.

The status is `human_needed` rather than `passed` because five decidable items remain, not because
anything is broken. Three are confirmed review findings, one is a self-correction of my own prior
report, and one is the stop-or-continue judgement.

**I refute the review's WR-02, which is the finding that would have made this "the recurring defect
class recurring inside the round convened to close it."** It is not that. `thresholds.spec.ts:845-846`
was authored at `27d9111` (07-18) and this round did not touch it; at that commit the block contained
zero named literal constants, so its "the same two numbers this block **pins**" cannot ever have meant
"pinned literals" — the file's own vocabulary for *pin* is the gate sense, spelled out in its
authoring commit message, "pin the DOCUMENTED derivation against the SHIPPED constants". The two
numbers are the two sides of the inequality, 8,192 and 2,179, which is exactly what the quoted
`retention.ts` sentence states. True then, true now. The review's own text concedes the ground without
following it, noting the sentence "was already loose" before this round — and under the reading that
makes it loose, round 4's two new pins bring the overlap from zero to exactly two, which *improves*
it. Downgraded to Info, for a real but smaller cost: round 4 introduced a term-of-art "PINNED" at
`:913-916` that collides with `:846`'s gate-sense "pins".

**What I do confirm as a live falsehood is WR-03**, which the review found and which nobody — three
reviews, three verifications, mine included — had found before: `:845` cites `retention.ts:178-180`
for a sentence that lives at `:193-194`. Confirmed from git that the citation was correct when
written and was broken by `d3caf4d` in gap-closure round 2. Pre-existing, in no contract, four
characters to fix.

Nothing in this round can move a byte. The entire non-`.planning` diff is two files, +81/−19;
`export.ts` is comment-only (every added line begins with `*` or `//`) and `thresholds.spec.ts` is
spec-local text plus two literals. Every construct and file the round was forbidden to touch is
byte-verified identical, `thresholds.ts` at md5 `6391d0d50f9741f50909ec9197dd25c9`. Full suite 90
files / 4,322 tests green — exactly the round-4 baseline, no test added — with typecheck, lint, knip
and build all exit 0.

## Per-Gap Assessment

| Gap | Truth (from `07-UAT.md`) | Status | Evidence I produced myself |
|---|---|---|---|
| G-07-9 | `export.ts`'s `sources_verbatim` column comment describes what `redactSourceLabelForExport` now does AND aligns with the docblock at `:261-275` | ✓ VERIFIED | Word-level diff: 26 words out, one token in (`reused` → `reused.`). Region 15→13 lines, 1,104→934 bytes, direction words 2→0, reproducing the operator's figures exactly. Column comment compared clause-by-clause against the shipped body — exact. No contradiction with `:261` remains. The two surviving `narrow`-family hits (`:253`, `:335`) are outside the region, true, and absent from the diff. |
| G-07-9 (record) | The plan and ROADMAP that authored the claim are corrected | ✓ VERIFIED | `07-24-PLAN.md` `truths[4]` rewritten + dated ERRATA table above the objective, which I verified against `git show` of all three commits — correct in every particular. ROADMAP round-3 entry corrected in place, `(MAP-07, UI-05)` and the G-07-6/G-07-7 subject intact. `07-24-SUMMARY.md` diffstat EMPTY, so the VF-01 chain survives. |
| G-07-10 | The block pins the shipped-by-coincidence historical operand, so no historical demand is recomputed | ✓ VERIFIED | `SHIPPED_INSERT_SIDE_AT_59347C3 = 2_179` re-measured from `git show 59347c3` — 128 + (3 + 2,048), all four cited line numbers correct. Covered by a third `expect` in the SAME coincidence assertion; substituted at all three guard sites. Presence half and absence half confirmed still on the DERIVED `insertSide`; the six shipped figures confirmed literal-free. Both arm-checks run by me against the real file. Residual recorded as a coincidental-reliance item, not a failure. |
| G-07-11 | `:925`'s "as both stood before 59347c3" reads historical values throughout | ✓ VERIFIED | `SUPERSEDED_SWEEP_MAX_ROWS_BEFORE_59347C3 = 512` re-measured from `git show 59347c3^` line 152; 4,227 / 512 = 8.2559… → `8.26` computed by me. Clause now interpolates no present-day constant. No-op at HEAD by construction, as required, and the suite count is unchanged at 63. |
| G-07-12 | `export.ts:311-313` carries the mode qualifier the file uses at `:172` and `:191` | ✓ VERIFIED | Traced to `projectRow` (`export.ts:602-605`): `mode === "redacted" && column.redact !== null`. `observations.url`'s `redact` is non-null, so the described behaviour holds on precisely the redacted rows — neither over- nor under-stated. Both cited precedents intact. |

**Score: 33/33.** The 26 must-haves verified at `7c54815` are carried and re-confirmed at HEAD (round 4
changed no behaviour; every file they cover is byte-identical or comment-only; all wired gates green
and the load-bearing seams spot-checked directly). Plus the four round-3 gap truths, all four now
verified — G-07-9 was the failure of G-07-6's truth and is closed rather than being a separate
denominator entry. Plus the three new round-4 gap truths, all three verified. Zero failures, zero
behaviour-unverified truths.

## Adjudication of Each Round-5 Review Finding

### The load-bearing claim first: the axis history — CONFIRMED, on a fourth independent pass

I read the `sources_verbatim` binding **and both redactor bodies** at each of the three commits before
reading the errata table:

| Commit | Binding / body | Query axis | Fragment axis |
|---|---|---|---|
| `d5cd5e0` (07-06) | `redact: redactUrlForExport`, whose body is `url.search(/[?#]/)` with no shape test in front of it | EVERY label | EVERY label |
| `a901b9e` (07-16) | `isProtocolShapedLabel(l) ? redactUrlForExport(l) : l` | PROTOCOL-ONLY | PROTOCOL-ONLY |
| `0e44102` (07-22) | protocol delegates; else `label.indexOf("?")` | EVERY label | PROTOCOL-ONLY |

07-06→07-16: both axes narrowed **together**, under one shape test. 07-16→07-22: only the query axis
moved. 07-06→07-22: the query axis ends where it started and only the fragment axis moved. **There is
no baseline under which the two axes moved in opposite directions**, and the errata table in
`07-24-PLAN.md` says exactly this and nothing more. Its supporting sentences check out individually —
including "From 07-06 to 07-22 the query axis ends where it started", which I verified rather than
skimmed. **Round 4 did not replace one false history with another.** That is now the fourth
independent derivation (round-4 verifier, round-5 reviewer, the errata author, me) and all four agree.

### WR-01 — CONFIRMED, and CORRECTED in one particular

The duplicate is real: `:939-940` and `:857-858` hold byte-identical initialisers for the same
quantity, 80 lines apart, and nothing in the file asserts they agree — I checked the one gate that
reads this file's own text (`the convergence check names every quantity…`, `:356-383`) and it slices
only the `retention sweep CONVERGES` case body, so it does not cover this. The causal account is right
too: `07-27-PLAN.md:244-245` sets a `grep -c 'grouped(insertSide)' == 4` block tally, the count is 4
at HEAD, and `07-27-SUMMARY.md`'s Decisions Made 1 states plainly that using `grouped(insertSide)` in
the new message "would have inflated that count". **A gate that lives in a plan shaped code that lives
in the repository.**

**But the review overstates the failure mode**, and I measured it rather than reasoning about it. It
calls this "a drift detector that can silently stop detecting". It does not stop silently. I desynced
`insertSide` from `recomputedShipped` in the real file and ran the spec: exactly one test goes red —
the passes-docblock presence check — and its remedy tells the maintainer to rewrite the docblock,
while the coincidence assertion that *names* the quantity stays green covering a stale formula. So the
signal fires at the wrong assertion with the wrong remedy. That is the same shape as the WR-02 residual
my round-4 report described, one severity lower, and it is a one-line fix.

**Is it in round 4's contract?** No. G-07-10's five substantive `missing` bullets — pin the literal,
cover it in the same coincidence assertion, substitute at three sites, leave both halves on the derived
`insertSide`, preserve non-vacuity — are all met, and spec-file-only holds. A new local binding was
neither required nor forbidden. This is a residual, not a gap.

### WR-02 — REFUTED on its central claim, downgraded to Info

See the frontmatter finding for the full argument. In short: `git blame` puts `:844-850` at 27d9111,
outside this round; at that commit the block held **zero** named literals, so "pins" is the gate sense,
not the literal sense; under the gate sense the two numbers are 8,192 and 2,179 and the sentence is
true at HEAD; under the literal sense the sentence was false *before* round 4 and round 4's two new
pins bring the overlap to exactly two.

**Round 4 did not ship this sentence, and it did not make it wrong.** On the operator's question of
whether that distinction matters under the phase's own standard: it matters decisively for the
*process* question and not at all for the *repository* question. The repository standard is "no false
claim stands, whoever wrote it" — under which WR-03, not WR-02, is the live instance. The process
question was "did the new gate design stop this round from authoring a falsehood", and the answer is
yes, which a pre-existing sentence cannot change.

What round 4 *did* introduce is a vocabulary collision: `:913-916` defines DERIVED-vs-PINNED as terms
of art, 70 lines below a sentence using "pins" in the older sense. One of the two readings a reader can
now take is false. Worth a word; not worth a round.

### WR-03 — CONFIRMED, and it is the only live falsehood left

`retention.ts:178` reads "AND THE INEQUALITY NOW BOUNDS SOMETHING REAL"; the quoted sentence is at
`:193-194`. Confirmed from git that `git show 27d9111:packages/backend/src/store/retention.ts` puts it
at line 178 — the citation was **correct when written** — and that `d3caf4d` (07-20, gap-closure round
2) grew the file by fifteen lines. Pre-existing by two rounds, in no contract, and unnoticed by every
review and verification including my own round-4 one, which quoted that very paragraph.

### IN-03 — CONFIRMED, and it corrects my own round-4 report

The review judged `thresholds.spec.ts:336-355`'s commit-ordering test out of scope on a
scale-invariance argument, and raised `:352` separately. **Both halves are right, and the second one
sharpens what I wrote last round.**

I confirmed the scale-invariance algebraically rather than accepting it: `supersededInsertSide =
128 + 3 + 2S` and `shippedInsertSide = 128 + (3 + S)`, so `supersededInsertSide = shippedInsertSide +
S` and the load-bearing assertion at `:342-351` reduces to `S > 0`. Scale-invariant, and it demands
nothing of any prose — the review's characterisation is exact.

But `:352`, `expect(deletedPerInterval).toBeGreaterThanOrEqual(supersededInsertSide)`, is **not**
scale-invariant: `deletedPerInterval` is 8,192 regardless of `S`, so the assertion holds only for
`S ≤ 4,030`, and at `S = 4,096` it is 8,323 against 8,192 — red for a formula no shipped constant
uses. My round-4 report cleared `:327-353` **wholesale** on the strength of the relational assertion.
That clearance was over-broad. Recording it here rather than repeating it. `07-27-PLAN.md` prohibited
touching this test, so it is correctly untouched; it belongs to whichever plan next owns the file.

### IN-01 and IN-02 — CONFIRMED, both Info

IN-01: both "describes 2026-09-02, when the figure was …" clauses are true (the two figures are the
insert side either side of `59347c3`, which landed that day) and each disambiguates itself earlier.
Diagnostic-only. IN-02: `:872` (pre-existing) calls the dated-paragraph guard "the presence half";
`:889` and `:893` (added this round) call the same test "the non-vacuity half"; `:955` and `:988` use
"the presence half" for the passes-docblock check. Round 4 introduced the competing name.

### What the review cleared, and I re-checked

The deletion's cut lines and the intactness of the surrounding explanation (word-level diff);
G-07-12's qualifier against `projectRow`; both literals against `git show`; the two remaining
`narrow`-family hits being outside the diff and true; the scope fence in every direction — no
migration, no FK, no `ON DELETE CASCADE`, `SCHEMA_VERSION` still derived, `RETENTION_SWEEP_MAX_PASSES`
still 16, `MAP_MAX_BYTES` still `2_621_440`, no outbound fetch, no filesystem access, the export
vocabulary count still 2, `observations.url`'s binding unchanged, all five forbidden constructs md5-
identical, and nine forbidden paths with EMPTY diffstats including `07-24-SUMMARY.md`.

## Did changing the gate design change the outcome?

The operator convened round 4 partly to test whether the multi-round loop could be broken, and ran it
differently: **deletion instead of restatement, falsifiable gates instead of word counts.** Here is the
honest read, with the evidence for both sides.

### The case that it worked

1. **Round 4 shipped zero false sentences, and I checked rather than assumed.** Every historical claim
   in the diff was re-derived from git before I read the round's account of it: the three-commit axis
   history, `2,179` from `59347c3`, `512` from `59347c3^`, `8.26` computed. The round also shipped
   **five new cross-commit line-number citations** — `128` at line 215, `3` at 111, `2_048` at 454, the
   `ROWS_INSERTED_PER_ITERATION_MAX` expression at 490, `512` at 152 — and **all five are correct**.
   That is a direct, quantified counter-datum to the WR-03 class, produced by the round under test.
2. **The repair really was subtraction.** 26 words out, one token in. Not a fourth telling of a
   sentence that had failed three times — no telling at all. A sentence that makes no historical claim
   cannot make a false one, and the mechanism that produced G-07-3, G-07-6 and WR-01 no longer has a
   host.
3. **The gates were structurally different in the way test 5 demanded.** An absence assertion over a
   named region, a strictly decreasing byte count, and `git show` comparisons. Each is falsifiable by
   the shipped text. Run against round 3's output, the absence gate would have gone red on the very
   sentence that shipped; the `grep -c 'NARROWED' == 1` it replaced went green *because* the sentence
   shipped.
4. **A new evidence class appeared: mutation of the real file.** The two arm-checks — remove `4,227`,
   remove only `2,179` — are the first gates in this phase that prove an assertion is *load-bearing*
   rather than merely present. I reproduced both independently (red at `:1075` and `:1086`
   respectively) and restored `thresholds.ts` to its pinned md5. Arm-check B is the one that matters:
   without it, "we pinned a literal" and "we made the guard vacuous" are indistinguishable.
5. **The round predicted its own residual.** `07-27-SUMMARY.md:402` flags the one surviving word-shaped
   gate unprompted — "a future author could satisfy it by rewording rather than by understanding …
   worth a verifier's eye" — and that is precisely the seam the review's WR-02 tried to walk through.
   No previous round in this phase reported a weakness in its own acceptance evidence.
6. **The authoring chain was cut, not just the symptom.** The plan's `truths[4]` and the ROADMAP entry
   both carried the falsehood; both are corrected, with an errata table I verified is right in every
   particular. A round-5 plan derived from those documents cannot re-inherit it.

### The case that it did not

1. **The class did not vanish from the repository.** WR-03 is a claim in the file this round modified
   that the code contradicts, verifiable in one command. It is exactly the signature defect. That it is
   pre-existing by two rounds is the mitigation and also the indictment: it means three reviews and
   three verifications — mine last round included, reading that very paragraph — missed a
   one-command-checkable falsehood. **Detection improved this round; it was not good before it.**
2. **The repair introduced two new maintenance items.** WR-01's duplicate and IN-02's terminology
   collision are both round-4 artefacts. Neither is false, neither can move a byte, but "the round
   produced new findings" remains true in the fourth consecutive round.
3. **WR-01's cause is a gate-design defect, one round after a gate-design defect.** VF-01 was a gate too
   weak to falsify a claim; WR-01 is a gate strong enough to distort the code written to satisfy it,
   and the gate in question does not exist outside the plan. The lesson generalises less cleanly than
   "use falsifiable gates": a numeric tally over an identifier is falsifiable *and* it made the code
   worse.

### My read

**The gate change worked on the thing it targeted, and it did not make the round defect-free — those
are both true and they are not in tension.** The specific failure that had recurred three times — a
false historical claim, authored in a plan, waved through by a word-presence probe — did not recur.
The review's candidate for "the same class in a new location" is WR-02, and I refute it: that sentence
predates the round by six plans and this round did not make it wrong. What round 4 produced instead is
a duplicated `const` and an inconsistent noun. That is a genuine change in kind, not a consolation.

**The severity trajectory, extended:**

| Round | Plans | Worst severity | Behavioural change | Non-`.planning` diff |
|---|---|---|---|---|
| 1 | 7 | major | yes — migration `v: 9`, key widening, a retention sweep | large |
| 2 | 5 | major | yes — a real orphaning bug in `deleteDigest` | large |
| 3 | 3 | warning (a false comment) | none | 3 files, +121/−38 |
| 4 | 2 | warning (a duplicate binding; a two-round-old stale line number) | none | **2 files, +81/−19, one of them comment-only** |

**Is phase 07 in a defensible place to stop? Yes, and I would say so plainly.** The defensible stopping
criterion for this phase was never "zero findings" — no round reached it, and each attempt to reach it
generated the next round's finding. The criterion that is actually meetable is: *no finding can affect
behaviour, and no finding is a false claim the round itself shipped.* **Round 4 is the first round that
meets it.** 33/33 must-haves, zero failures, and the residue is one duplicate `const`, one stale line
number older than the round, and three wording nits.

**Does round 5 have a case? A narrow one, and it is the smallest of any round so far.** WR-01 is one
line and WR-03 is four characters — under five lines between them, with no test to add and no
behaviour to touch. If the operator's standard is that the repository should contain zero known-false
statements, WR-03 alone justifies it and the fix is trivial. Against that: every round in this phase
has generated a defect while repairing one, and round 4 — the smallest and best-gated of them — still
produced two. A five-line round has a smaller blast radius than any predecessor, but it is not zero,
and the two items are already documented here, which is most of the value a fix would add.

**If a round 5 runs, the thing to carry from round 4 is the arm-check, not the tally.** Mutating the
real file to prove an assertion fires is the only gate this phase has invented that cannot be satisfied
by typing the right word. The `grep -c` tallies — even the negative ones — are what produced WR-01, and
what the review walked through in its (refuted) WR-02.

**Closing at 33/33 means:** the phase goal is met and verified — source is recovered through the inline
path and nothing a malicious map contains can reach a filesystem sink — with two deferred halves owned
by named later phases (SC5's second half → Phase 3/11, MAP-01's external half → Phase 8, both
re-confirmed at HEAD rather than carried), six items open by standing operator decision, and five
comment-level residuals recorded above. It does **not** mean the two files contain no false statement;
WR-03 is one, and closing at 33/33 accepts it knowingly rather than by omission. That is the honest
price of stopping here, and it is a low one.

## Requirements Coverage

| Requirement | Source plans (round 4) | Status | Evidence at HEAD |
|---|---|---|---|
| MAP-01 | — (regression scope) | ✓ SATISFIED (inline half) / deferred (external half → Phase 8) | Both production decode sites (`consumer.ts:1124`, `index.ts:593`) are `decodeInlineMap(announcement.url, MAP_MAX_BYTES)`; `announcedExternal` counts the handover. Untouched by round 4. REQUIREMENTS.md:838 records both halves. |
| MAP-02 | — | ✓ SATISFIED | Untouched; regression scope, green in the full suite. |
| MAP-03 | — | ✓ SATISFIED | Untouched. |
| MAP-04 | — | ✓ SATISFIED | Untouched; the `sources`-as-path sink prohibition specs are green. |
| MAP-05 | — | ✓ SATISFIED | Untouched; the hostile corpus and `MAP_PARSE_REASONS` unchanged. |
| MAP-06 | `07-27-PLAN.md` | ✓ SATISFIED | Carried by 07-27 (spec-only). `thresholds.ts` byte-identical at md5 `6391d0d5…`; `DERIVED_MAX_DEPTH` still 1 with the refusal at `derive.ts:204`; thresholds spec 63 green; both arm-checks fire. |
| MAP-07 | `07-26-PLAN.md` | ✓ SATISFIED | Carried by 07-26 (comment-only). `redactSourceLabelForExport`'s body, `redactUrlForExport`, `isProtocolShapedLabel`, `EXPORT_QUERY_REDACTION` and `serialiseRows` all md5-identical; `export.spec.ts` diffstat EMPTY. **The column comment documenting it is now accurate** — round 4's deletion closed G-07-9. |
| UI-05 | `07-26-PLAN.md` | ✓ SATISFIED | No target-controlled string reaches a label, dialog or download name; the manifest-export path is unchanged and the frontend is absent from the diffstat entirely. |
| SC5 second half | — | deferred → Phase 3 / Phase 11 | Both detector seams still no-ops (`consumer.ts:998`, `:1511`), re-confirmed at HEAD. |

Every requirement ID declared in any phase-07 plan's `requirements:` frontmatter is accounted for
against `REQUIREMENTS.md`, and every phase-07 ID in `REQUIREMENTS.md` is claimed by at least one plan.
**Zero orphaned requirements.**

---

_Verified: 2026-09-03T12:20:01Z at `eeb9c2c`_
_Verifier: Claude (gsd-verifier) — round 5_
_Gates run by the verifier, not carried from the summaries: full suite, typecheck, lint, knip, build, thresholds spec, vue-tsc baseline, two arm-checks and one hazard mutation against the real files (all restored, md5-verified), a fourth independent derivation of the axis history from three commits, git archaeology of two comment provenances, md5 byte-identity on five constructs, diffstat over nine forbidden paths, a prohibition scan of all 81 added lines, and a requirement-to-plan cross-reference over all 27 plans._
