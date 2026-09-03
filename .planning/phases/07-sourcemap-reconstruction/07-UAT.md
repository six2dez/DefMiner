---
status: diagnosed
phase: 07-sourcemap-reconstruction
source: [07-VERIFICATION.md]
started: 2026-09-03T12:10:00Z
updated: 2026-09-03T12:45:00Z
round: 4
supersedes: 07-UAT-round3.md
verification_score: 29/30
verified_at_commit: d5fb7b1
---

## Current Test

[testing complete]

## Tests

### 1. Decide G-07-9 / WR-01 — the `sources_verbatim` directional claim, which has now shipped false in three consecutive rounds
expected: Either `export.ts:449-452`'s directional sentence is DELETED, or it is RESTATED with its baseline named in the same clause, or the operator records an override accepting it and closing the phase at 30/30.
detail: |
  The one open gap. Round 3's 07-24 replaced G-07-6's false sentence with another false one.
  `export.ts:450-451` reads "the two axes moved in OPPOSITE directions: the FRAGMENT axis
  NARROWED, to protocol-shaped labels only, while the QUERY axis WIDENED, to every label."
  The verifier reconstructed the column's history from git independently of the review:
    d5cd5e0 (07-06): `redact: redactUrlForExport`      -> query EVERY label, fragment EVERY label
    a901b9e (07-16): `isProtocolShapedLabel(l) ? ... `  -> both axes PROTOCOL-ONLY (both narrowed)
    0e44102 (07-22): protocol delegates, else cut at `?` -> query WIDENED, fragment UNMOVED
  There is no baseline under which the two axes moved in opposite directions — each half of the
  sentence borrows a different one. And `export.ts:261` reads "THE FRAGMENT AXIS, UNMOVED", a
  direct contradiction 190 lines above in the same file.
  THE ORIGIN IS THE PLAN, NOT THE EXECUTION. `07-24-PLAN.md`'s `must_haves.truths[4]` states the
  false claim verbatim, and the round-3 ROADMAP entry repeats it. A round-4 plan derived from those
  documents re-ships the same sentence unless they are corrected too.
  Nothing here can move a byte: `redactSourceLabelForExport`, `redactUrlForExport`, the export
  vocabulary and `observations.url` are all md5 byte-verified unchanged and must stay so.
  The verifier's read: "a fourth restatement of that sentence is the move that has failed three
  times. If round 4 runs, the repair that breaks the pattern is DELETION, not restatement."
severity: warning (gap severity minor)
introduced_by: this round (07-24) — authored in the PLAN's must_haves
result: issue
reported: "Fix — DELETE the directional claim, and correct the plan and ROADMAP that authored it"
severity: minor
resolution: "Accepted as written — the expected outcome's leading, verifier-preferred branch: DELETE the directional sentence at `export.ts:449-452`. `:446-449` already describes the shipped behaviour correctly and completely; the baseline-anchored history stays at `:255-275`. `07-24-PLAN.md`'s `must_haves.truths[4]` and the ROADMAP's round-3 07-24 entry are corrected alongside the source so a round-4 plan cannot inherit the falsehood. Comment-only — `redactSourceLabelForExport`, `redactUrlForExport`, the export vocabulary and `observations.url` stay byte-unchanged. Conditional on test 6's go/no-go: if round 4 does not run, this becomes the `overrides:` path instead."


### 2. Decide WR-02 — the adjacent operand of the sentence G-07-8 just fixed still pins a HISTORICAL demand to a RECOMPUTED expression
expected: Either a third named literal (`SHIPPED_INSERT_SIDE_AT_59347C3 = 2_179`) with its provenance, covered by the same coincidence assertion at `thresholds.spec.ts:895-931` and substituted at `:1012`, `:1019` and `:1022`; or an override recording that the residual is accepted because the coincidence assertion already fires on the same event.
detail: |
  G-07-8's contract closed as written — all four `missing` bullets satisfied. This is the residual
  the verifier found OUTSIDE that contract, on the adjacent operand of the same sentence.
  `thresholds.spec.ts:1016-1022` asserts `history.toContain(grouped(insertSide))` where
  `insertSide = T.RETENTION_SWEEP_EVERY_N + T.ROWS_INSERTED_PER_ITERATION_MAX` is recomputed from
  today's constants, against a `thresholds.ts:504-505` paragraph describing 2026-09-02.
  EMPIRICALLY DEMONSTRATED, not reasoned: the verifier re-applied the shipped `region()` predicates
  to the real history paragraph under hypothetical constants. At `SOURCE_ROWS_PER_MAP_MAX = 1_024`,
  `:1022` goes RED demanding `1,155` appear in a paragraph about 2026-09-02 — verbatim the
  "drift detector becomes the drift generator" failure G-07-8 existed to close.
  THE VERIFIER FALSIFIES HALF THE REVIEW'S CLAIM: the new coincidence test does NOT stay green.
  `recomputed` and `insertSide` share all three constants, so any move turns BOTH red. The residual
  is narrower than the review states — the maintainer DOES get a signal — but it is still real,
  because that signal's own remedy text says to retire the coincidence assertion "leaving the two
  literals, the absence half and the presence half exactly as they are" and never mentions the
  third test at `:1001-1023`, which is the one still red and still demanding the rewrite.
  Latent: correct at HEAD, suite green, fires only on a constant re-measurement nobody has scheduled.
severity: warning
introduced_by: pre-existing in 07-18, half-repaired by this round (07-25)
result: issue
reported: "Fix — pin the third literal and cover it in the same coincidence assertion"
severity: minor
resolution: "Accepted as written — the expected outcome's leading branch: pin a third named literal `SHIPPED_INSERT_SIDE_AT_59347C3 = 2_179` with its provenance (what the insert side read at `59347c3`, and that it equals `RETENTION_SWEEP_EVERY_N + ROWS_INSERTED_PER_ITERATION_MAX` at that commit), cover it in the SAME coincidence assertion at `thresholds.spec.ts:895-931`, and substitute it at `:1012`, `:1019` and `:1022`. Leave `:933-971`'s presence half and `:973-999`'s absence half on the DERIVED `insertSide` — those genuinely describe today. Spec-file only; `thresholds.ts` stays byte-unchanged. Conditional on test 6's go/no-go."


### 3. Decide IN-01 — `thresholds.spec.ts:925` interpolates TODAY's `RETENTION_SWEEP_MAX_ROWS` into a clause reading "as both stood before 59347c3"
expected: Either `SUPERSEDED_SWEEP_MAX_ROWS_BEFORE_59347C3 = 512` is pinned and used in the message, with the provenance comment at `:864-882` recording that `8.26` is `4,227 / 512` as both stood at `59347c3^`; or an explicit acceptance that a diagnostic-only string does not warrant it.
detail: |
  Confirmed from the code and from git. `git show 59347c3^:packages/engine/src/thresholds.ts:152`
  gives `RETENTION_SWEEP_MAX_ROWS = 512`, the same value it holds today — so the sentence is TRUE
  at HEAD and the defect is latent.
  Same class as WR-02, one severity lower: it is diagnostic-only text that prints solely inside a
  failure which already tells the reader to retire the assertion. `8.26`'s historical numerator is
  now pinned (`SUPERSEDED_INSERT_SIDE_BEFORE_59347C3 = 4_227`); its denominator is not.
severity: info
introduced_by: pre-existing (surfaced by round 4)
result: issue
reported: "Fix — pin the historical denominator too"
severity: minor
resolution: "Accepted as written — the expected outcome's leading branch: pin `SUPERSEDED_SWEEP_MAX_ROWS_BEFORE_59347C3 = 512` and use it in the `:925` message instead of today's `T.RETENTION_SWEEP_MAX_ROWS`, and extend the provenance comment at `:864-882` to record that `8.26` is `4,227 / 512` as both stood at `59347c3^`. Verified: `git show 59347c3^:packages/engine/src/thresholds.ts:152` gives 512, the same value it holds today, so this is latent and the change is a no-op at HEAD. Spec-file only. Conditional on test 6's go/no-go."


### 4. Decide IN-02 — `export.ts:311-313` says the shared query marker is `observations.url`'s behaviour "on every row it has ever written"
expected: Either the qualifier the rest of the file already uses is added — "on every REDACTED row it has ever written" — or the shorthand is accepted.
detail: |
  An over-reach inside G-07-7's otherwise-clean repair. Confirmed from the code: `serialiseRows`
  applies redaction CONDITIONALLY at `export.ts:606-609` —
  `mode === 'redacted' && column.redact !== null ? column.redact(text) : text`.
  In raw mode `observations.url` writes the URL whole and no marker appears, so there is a large
  class of rows for which the described behaviour did not happen.
  The same file qualifies this carefully at `:172` ("What a covered field reads as in the redacted
  mode") and at `:191`. A two-word fix, zero behavioural impact.
severity: info
introduced_by: this round (07-24)
result: issue
reported: "Fix — add the REDACTED qualifier"
severity: minor
resolution: "Accepted as written — the expected outcome's leading branch: add the qualifier the file already uses elsewhere (`:172`, `:191`), so `export.ts:311-313` reads 'on every REDACTED row it has ever written'. Justified by `serialiseRows` at `:606-609`, which applies `column.redact` only when `mode === 'redacted'`. Two-word, comment-only, zero behavioural impact. Conditional on test 6's go/no-go."


### 5. Decide VF-01 — the acceptance gate for prose repairs is a word-presence `grep -c`, which by construction cannot falsify a semantic claim
expected: Either round 4's plans are required to gate prose repairs on something that can falsify the CLAIM (an assertion that the column comment contains NO direction word, or a review sign-off against `git show` of the three commits), or the operator accepts that prose repairs stay gated as they are.
detail: |
  A GATE-DESIGN finding, not an executor finding — recorded as such by the verifier. The evidence
  that shipped WR-01 was `grep -c 'NARROWED'` -> 1 and `grep -c 'WIDENED'` -> 1
  (`07-24-SUMMARY.md:97,100`). The RED->GREEN transition proved only that two words were typed.
  Round 3's plans were unusually self-aware about this — they wrote "because three of the four
  change no behaviour, a passing suite proves nothing about them" and built region-scoped comment
  gates in response — and the gate they built still only checks that a word is present.
  The verifier's blunt summary: "Nothing in the current process can detect a false sentence."
  This is the lever that decides whether a round 4 has better odds than rounds 1-3, so it is worth
  deciding BEFORE the go/no-go in test 6.
severity: info
introduced_by: process (all rounds)
result: pass
reported: "pass"
resolution: "Accepted as written — the expected outcome's leading branch: round 4's plans MUST gate prose repairs on something that can falsify the CLAIM, not detect the WORD. Concretely, for test 1's deletion: an assertion that the `sources_verbatim` column comment contains NO direction word (`NARROWED`/`WIDENED`/`narrowed`/`widened`), which is falsifiable by the shipped text; plus a review sign-off against `git show` of d5cd5e0 / a901b9e / 0e44102 for any surviving historical claim. No `grep -c '<word>' == 1` may stand as the sole acceptance evidence for a prose must-have. This is the lever that gives round 4 different odds than rounds 1-3."


### 6. Decide the ROUND-4 QUESTION you posed — keep iterating, or stop
expected: A decision on whether round 4 runs at all. If it does not, an `overrides:` block goes into `07-VERIFICATION.md` frontmatter for G-07-9's must-have and the phase closes at 30/30 with two documented, non-behavioural residuals.
detail: |
  The verifier gave an honest read rather than a tally, and says both sides are true.
  THE MECHANISM IS REAL AND UNINTERRUPTED. Three consecutive rounds produced the same defect class:
  a natural-language claim the code beside it contradicts. Sharper — ONE sentence, the
  `sources_verbatim` column comment, has carried a false claim in three consecutive rounds:
  G-07-3 (07-16), G-07-6 (07-22), WR-01 (07-24). Each repair was a restatement; each restatement
  was the next round's defect. On this evidence a fourth round run the same way has an above-even
  chance of producing a fifth.
  THE SEVERITY IS GENUINELY CONVERGING, and the verifier says this is not a consolation prize:
    Round 1 | 7 plans | G-07-1..4    | worst: major   | behavioural change: yes (migration v:9, key widening, retention sweep)
    Round 2 | 5 plans | G-07-5..8    | worst: major   | behavioural change: yes (a real orphaning bug in `deleteDigest`)
    Round 3 | 3 plans | WR-01/02, IN-01/02 | worst: warning | behavioural change: NONE — 3 files, +121/-38, comments plus one new test
  Round 2 found a data-integrity bug that orphaned every evicted bundle's sightings. Round 3 found
  a comment naming the wrong baseline and a test recomputing a number it should pin. Nothing in
  round 3's residue can leak, corrupt, crash, mis-count or change a single exported byte.
  Full suite 90 files / 4,322 tests green; typecheck, lint, knip, build all exit 0.
  The verifier's own position: "The loop is real; the stakes are now very small. What I would NOT
  do is run round 4 the same way." And: stopping here "is a defensible place to stop."
severity: n/a — process decision
introduced_by: n/a
result: pass
reported: "pass — run round 4, fix all four (clarified: the expected held two opposite branches)"
resolution: "ROUND 4 RUNS, repairing all four items. The verifier's counsel is adopted rather than overridden: do NOT run round 4 the same way. Test 5's gate change (VF-01) is a precondition on every plan in the round — the acceptance evidence for a prose must-have must be able to FALSIFY the claim, not detect a word. The one behaviour-shaped risk is that a comment-only round touches code: every plan carries the byte-identity prohibition on `redactSourceLabelForExport`, `redactUrlForExport`, `EXPORT_QUERY_REDACTION`, `isProtocolShapedLabel`, the export vocabulary, `observations.url` and `thresholds.ts`."


## Summary

total: 6
passed: 2
issues: 4
pending: 0
skipped: 0
blocked: 0

## Gaps

<!-- Root causes are NOT re-derived here. 07-VERIFICATION.md (round 4) diagnosed all four
     independently from the code — git archaeology across three commits, md5 byte-identity on four
     definitions, and an in-memory drift simulation against the real file. Those diagnoses are
     carried forward verbatim in substance. -->

- gap_id: G-07-9
  truth: "`export.ts`'s `sources_verbatim` column comment describes what `redactSourceLabelForExport` now does AND aligns with the function docblock at `:261-275`, which already says it correctly"
  status: failed
  reason: "User reported: Fix — DELETE the directional claim, and correct the plan and ROADMAP that authored it"
  severity: minor
  test: 1
  root_cause: |
    `export.ts:450-451` reads "the two axes moved in OPPOSITE directions: the FRAGMENT axis
    NARROWED, to protocol-shaped labels only, while the QUERY axis WIDENED, to every label."
    The verifier reconstructed the column's history from git independently of the review:
      d5cd5e0 (07-06): `{ name: "sources_verbatim", redact: redactUrlForExport }`
                       -> query axis EVERY label, fragment axis EVERY label
      a901b9e (07-16): `isProtocolShapedLabel(l) ? redactUrlForExport(l) : l`
                       -> query axis PROTOCOL-ONLY, fragment axis PROTOCOL-ONLY (both NARROWED)
      0e44102 (07-22): protocol delegates; else cut at first `?`
                       -> query axis EVERY label (WIDENED), fragment axis PROTOCOL-ONLY (UNMOVED)
    vs 07-16 (the baseline the function docblock and G-07-6's own `missing` bullet use): query
    WIDENED, fragment UNMOVED. vs 07-06: fragment NARROWED, query UNCHANGED. vs 07-22's own change:
    only ONE axis moved. There is no baseline under which the two axes moved in opposite
    directions — each half of the sentence borrows a different one. `export.ts:261` reads "THE
    FRAGMENT AXIS, UNMOVED", a direct contradiction 190 lines away in the same file.
    THE ORIGIN IS THE PLAN, NOT THE EXECUTION. `07-24-PLAN.md`'s `must_haves.truths[4]` states the
    false claim verbatim, and the round-3 ROADMAP entry for 07-24 repeats it. The executor
    implemented its contract faithfully; the acceptance evidence it chose — `grep -c 'NARROWED'`
    -> 1, `grep -c 'WIDENED'` -> 1 (`07-24-SUMMARY.md:97,100`) — is a word-presence probe
    structurally incapable of falsifying a directional claim (finding VF-01, test 5).
    This sentence has now carried a false claim in THREE consecutive rounds: G-07-3 (07-16),
    G-07-6 (07-22), WR-01 (07-24). Each repair was a restatement; each restatement was the next
    round's defect.
  artifacts:
    - path: "packages/backend/src/store/export.ts"
      issue: "lines 449-452 assert a directional symmetry false under every baseline, contradicting `:261` in the same file"
    - path: ".planning/phases/07-sourcemap-reconstruction/07-24-PLAN.md"
      issue: "`must_haves.truths[4]` is where the false claim was authored — correct it or a round-4 plan re-inherits it"
    - path: ".planning/ROADMAP.md"
      issue: "the round-3 07-24 entry repeats 'both directions stated: fragment NARROWED, query WIDENED' — the same false claim in a third artifact"
  missing:
    - "DELETE the directional claim at `export.ts:449-452` — the operator chose the verifier's preferred repair over a fourth restatement. `:446-449` already describes the shipped behaviour correctly and completely; the full baseline-anchored history lives at `:255-275`, where `:261` and `:268` state each axis against a named baseline. The column comment needs no third telling of it, and a sentence that makes no historical claim cannot make a false one."
    - "Correct `07-24-PLAN.md`'s `must_haves.truths[4]` and the ROADMAP's round-3 07-24 entry, so the falsehood does not survive in the planning record."
    - "GATE (per test 5 / VF-01): acceptance evidence must FALSIFY the claim, not detect a word. Assert that the `sources_verbatim` column comment contains NO direction word (`NARROWED`/`WIDENED`/`narrowed`/`widened`). A `grep -c '<word>' == 1` may NOT stand as the sole acceptance evidence."
    - "Comment-only. Do NOT change `redactSourceLabelForExport`, `redactUrlForExport`, `EXPORT_QUERY_REDACTION`, `isProtocolShapedLabel`, the export vocabulary or `observations.url` — all byte-verified unchanged at HEAD and must stay so. `export.spec.ts` diffstat must stay EMPTY."
  debug_session: ""

- gap_id: G-07-10
  truth: "`thresholds.spec.ts`'s documented-derivation block pins the SHIPPED-BY-COINCIDENCE historical operand as a named literal too, so no historical demand is recomputed from today's constants"
  status: failed
  reason: "User reported: Fix — pin the third literal and cover it in the same coincidence assertion"
  severity: minor
  test: 2
  root_cause: |
    G-07-8's contract closed as written — all four `missing` bullets satisfied, both superseded
    figures pinned at `:883-884` with provenance at `:864-882`. This is the residual OUTSIDE that
    contract, on the adjacent operand of the same sentence.
    `thresholds.spec.ts:1016-1022` asserts `history.toContain(grouped(insertSide))` where
    `insertSide = T.RETENTION_SWEEP_EVERY_N + T.ROWS_INSERTED_PER_ITERATION_MAX` is recomputed from
    today's constants, against `thresholds.ts:504-505` — "The gate landed first (4,227 on the
    insert side...) and the factor was retired second (2,179, exact)" — a sentence about
    2026-09-02. It equals 2,179 today only because the constants have not moved.
    EMPIRICALLY DEMONSTRATED by the verifier, not reasoned: the shipped `region()` predicates
    re-applied to the real history paragraph under hypothetical constants. At
    `SOURCE_ROWS_PER_MAP_MAX = 1_024`, `:1022` goes RED demanding `1,155` appear in a paragraph
    describing 2026-09-02, with a message instructing the maintainer that the ordering argument
    "can no longer be checked against the constants" — verbatim the "drift detector becomes the
    drift generator" failure G-07-8 existed to close.
    ONE HALF OF THE REVIEW'S CLAIM IS FALSIFIED: the new coincidence test does NOT stay green.
    `recomputed` and `insertSide` share all three constants, so any move turns BOTH red. The
    residual is narrower than the review states — a signal DOES fire — but it is still real,
    because that signal's own remedy text says to retire the coincidence assertion "leaving the two
    literals, the absence half and the presence half exactly as they are", and never mentions the
    third test at `:1001-1023`, which is the one still red and still demanding the rewrite.
  artifacts:
    - path: "packages/engine/src/thresholds.spec.ts"
      issue: "lines 1012, 1019 and 1022 consume a recomputed `insertSide` inside a demand about a dated paragraph"
  missing:
    - "Pin a third named literal `SHIPPED_INSERT_SIDE_AT_59347C3 = 2_179` with its provenance stated the way `:864-882` states the other two — what the insert side read, and at which commit."
    - "Cover it in the SAME coincidence assertion at `:895-931`, so its divergence surfaces as a test failure whose message directs the fix at the assertion rather than at the history."
    - "Substitute it at `:1012`, `:1019` and `:1022`."
    - "Leave `:933-971`'s presence half and `:973-999`'s absence half on the DERIVED `insertSide` — those genuinely describe today, and the SHIPPED figures at `:856-862` must stay derived with no literal among them."
    - "Preserve the non-vacuity property: emptying `ROWS_INSERTED_PER_ITERATION_MAX`'s history paragraph must still turn the presence half RED, demonstrated against the real file."
    - "Spec-file only. `thresholds.ts` diffstat must stay EMPTY."
  debug_session: ""

- gap_id: G-07-11
  truth: "`thresholds.spec.ts:925`'s 'as both stood before 59347c3' clause reads historical values throughout, and `8.26`'s denominator is pinned alongside its numerator"
  status: failed
  reason: "User reported: Fix — pin the historical denominator too"
  severity: minor
  test: 3
  root_cause: |
    `thresholds.spec.ts:925` interpolates TODAY's `T.RETENTION_SWEEP_MAX_ROWS` into a clause that
    claims to describe values "as both stood before 59347c3". Confirmed from git:
    `git show 59347c3^:packages/engine/src/thresholds.ts:152` gives `RETENTION_SWEEP_MAX_ROWS = 512`,
    the same value it holds today — so the sentence is TRUE at HEAD and the defect is LATENT.
    `8.26`'s historical numerator is now pinned (`SUPERSEDED_INSERT_SIDE_BEFORE_59347C3 = 4_227`);
    its denominator is not. Same class as G-07-10, one severity lower: diagnostic-only text that
    prints solely inside a failure which already tells the reader to retire the assertion.
  artifacts:
    - path: "packages/engine/src/thresholds.spec.ts"
      issue: "line 925 reads a current constant inside a historical clause; the provenance comment at :864-882 does not record 8.26's denominator"
  missing:
    - "Pin `SUPERSEDED_SWEEP_MAX_ROWS_BEFORE_59347C3 = 512` and use it in the `:925` message in place of `T.RETENTION_SWEEP_MAX_ROWS`."
    - "Extend the provenance comment at `:864-882` to record that `8.26` is `4,227 / 512` as both stood at `59347c3^`."
    - "No-op at HEAD by construction (512 today == 512 then) — the change must not alter any passing assertion's outcome."
    - "Spec-file only. `thresholds.ts` diffstat must stay EMPTY."
  debug_session: ""

- gap_id: G-07-12
  truth: "`export.ts:311-313` describes the shared query marker with the same mode qualifier the rest of the file uses at `:172` and `:191`"
  status: failed
  reason: "User reported: Fix — add the REDACTED qualifier"
  severity: minor
  test: 4
  root_cause: |
    An over-reach inside G-07-7's otherwise-clean repair. `export.ts:311-313` says the shared query
    marker is `observations.url`'s behaviour "on every row it has ever written". Confirmed from the
    code: `serialiseRows` applies redaction CONDITIONALLY at `export.ts:606-609` —
    `mode === 'redacted' && column.redact !== null ? column.redact(text) : text`. In raw mode
    `observations.url` writes the URL whole and no marker appears, so there is a large class of rows
    for which the described behaviour did not happen. The same file qualifies this carefully at
    `:172` ("What a covered field reads as in the redacted mode") and at `:191`.
  artifacts:
    - path: "packages/backend/src/store/export.ts"
      issue: "lines 311-313 state a redacted-mode-only behaviour of every row unconditionally"
  missing:
    - "Add the qualifier the file already uses: 'on every REDACTED row it has ever written'."
    - "Two words, comment-only, zero behavioural impact. Do NOT touch `serialiseRows`, the redactors or the column bindings."
  debug_session: ""

## Round-4 Planning Constraints

<!-- Test 5 (VF-01) and test 6 are decisions that constrain every plan in this round rather than
     gaps of their own. Restated here so a planner cannot miss them. -->

- **Acceptance evidence must falsify the CLAIM, not detect the WORD.** No prose must-have in this
  round may be accepted on a `grep -c '<word>' == 1` probe. For G-07-9 the falsifiable form is an
  assertion that the column comment contains NO direction word; for any surviving historical claim,
  a review sign-off against `git show` of d5cd5e0 / a901b9e / 0e44102. This is the lever that gives
  round 4 different odds than rounds 1-3 — the verifier's finding was "nothing in the current
  process can detect a false sentence".
- **Do not run round 4 the way rounds 1-3 were run.** The repair for G-07-9 is DELETION, not a
  fourth restatement of a sentence that has failed three times.
- **Correct the planning record, not just the source.** `07-24-PLAN.md`'s `must_haves.truths[4]`
  and the ROADMAP's round-3 07-24 entry carry the same falsehood; a plan derived from them
  re-ships it.
- **Byte-identity prohibitions carried from round 3, all verified at HEAD:**
  `redactSourceLabelForExport`, `redactUrlForExport`, `EXPORT_QUERY_REDACTION`,
  `isProtocolShapedLabel`, the export vocabulary, `observations.url`, `thresholds.ts`,
  `export.spec.ts`, `consumer.spec.ts`, `parse.ts`, `derive.ts`, `telemetry.ts`, `retention.ts`,
  `migrations.ts`. This round changes comments and one spec file. Nothing else.

## Still Open By Operator Decision (carried, not re-litigated)

- W-4 — `vue-tsc` wired into no gate that runs; six pre-existing errors, none added by round 3.
- W-6 — `MAP_MAX_BYTES` under-serves recovery ~2x (`thresholds.ts:372` = `2_621_440`).
- Round-1 UAT gap 3 — `tests/frontend-load.spec.ts` frame-budget backstop not wired.
- IN-04 — `derivedRejected.depth_exceeded` needs no docblock caveat (decided round 3).
- SC5 second half -> Phase 3 / Phase 11; MAP-01's external half -> Phase 8.
