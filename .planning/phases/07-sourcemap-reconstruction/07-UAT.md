---
status: complete
phase: 07-sourcemap-reconstruction
source: [07-VERIFICATION.md]
started: 2026-09-03T14:20:00Z
updated: 2026-09-03T14:40:00Z
round: 5
supersedes: 07-UAT-round4.md
verification_score: 33/33
verification_status: human_needed
verified_at_commit: ce81df8
---

## Current Test

[testing complete]

## Tests

### 1. Decide WR-01 — the duplicate derivation at `thresholds.spec.ts:939-940`, and the gate that shaped the code around itself
expected: Either the assertion is rewritten to read the block-level `insertSide` and the local dropped; or the local is kept plus one line `expect(recomputedShipped).toBe(insertSide);`; or an override accepts the duplicate as a maintenance cost.
detail: |
  DEMONSTRATED, not reasoned. The verifier desynced the two bindings in the real file and ran the
  spec. Exactly ONE test goes red — and it is the passes-docblock presence check, whose remedy tells
  the maintainer to rewrite the DOCBLOCK. Meanwhile the coincidence assertion that actually NAMES
  the quantity stays GREEN, covering a stale formula. So the failure is not silent, but it points
  the maintainer at the wrong thing.
  Probability is low: both expressions read the same two `T.*` imports, so a constant move hits
  both. `recomputedShipped` (`:939-940`) is byte-identical to `insertSide` (`:857-858`).
  THE CAUSE DESERVES MORE ATTENTION THAN THE FIX. The duplicate exists only to keep a
  `grep -c 'grouped(insertSide)' == 4` tally that lives in `07-27-PLAN.md` AND NOWHERE ELSE. The
  gate is not in the repo; the duplicate it caused is.
  The verifier's framing, which is the part worth your judgement: "VF-01 was a gate too WEAK to
  falsify a claim; this is a gate strong enough to SHAPE THE CODE around itself. Both are
  gate-design defects, one round apart."
severity: warning
introduced_by: this round (07-27), caused by a plan-local tally gate
result: pass
reported: "pass"
resolution: "Accepted as written — the expected outcome's leading branch: rewrite `expect(recomputedShipped, …).toBe(SHIPPED_INSERT_SIDE_AT_59347C3)` to read the block-level `insertSide` and DROP the local at `:939-940`. This removes the duplication rather than papering over it with an equality assertion, and it dissolves the cause: the local existed only to satisfy a `grep -c 'grouped(insertSide)' == 4` tally that lives in `07-27-PLAN.md` and nowhere in the repo. Spec-file only; `thresholds.spec.ts` must stay 63 tests. NOT EXECUTED — test 4 closed the phase; recorded as an accepted residual and as the pre-decided repair for whichever future plan next owns this file."


### 2. Decide WR-03 — the only live false claim left in either file, and it predates this round by two
expected: Four characters changed — `thresholds.spec.ts:845`'s citation corrected from `retention.ts:178-180` to `retention.ts:193-194` — or an explicit acceptance that a stale line number in a comment is not worth a round.
detail: |
  Confirmed from git in two commands. The citation was CORRECT at its authoring commit `27d9111`;
  `d3caf4d` (plan 07-20, round 2) grew `retention.ts` by fifteen lines and moved the sentence.
  A reader following the pointer today lands on "AND THE INEQUALITY NOW BOUNDS SOMETHING REAL" —
  the wrong sentence entirely.
  This is the phase's SIGNATURE DEFECT CLASS — a natural-language claim the repository
  contradicts — and it is the only live instance left in either file.
  It was in no gap contract, and it survived rounds 2, 3 and 4 including the verifier's own round-4
  pass, which read that paragraph and did not check the pointer. Three reviews and three
  verifications missed it.
  The verifier raises a second, larger question with it: "Consider also whether ANY line-number
  citation across a file boundary should be written in this project, given that this one broke
  within one round of being written." That is a standing-policy decision, not a four-character fix.
severity: warning
introduced_by: pre-existing (07-20, round 2) — surfaced by round 5
result: pass
reported: "pass"
resolution: "Accepted as written — the expected outcome's leading branch: correct `thresholds.spec.ts:845`'s citation from `retention.ts:178-180` to `retention.ts:193-194`. Four characters, comment-only, verified from git (`27d9111` authored it correctly; `d3caf4d` moved the sentence). NOT EXECUTED — test 4 closed the phase; recorded as an accepted residual and as the pre-decided repair for whichever future plan next owns this file."
open_question: "NOT decided by this pass — the verifier's larger question rides alongside and is outside this test's `expected`: should ANY cross-file line-number citation be written in this project, given this one broke within one round of being authored and then survived three reviews and three verifications? That is a standing-policy call, not a four-character fix. Carried forward as an explicit open item rather than folded into this decision."


### 3. Decide IN-01, IN-02 and IN-03 together — three confirmed nits, none false, none able to move a byte
expected: Either a single tidy-up pass (four words on the two 2026-09-02 clauses; one vocabulary for the four tests; and, for whichever plan next owns the file, pin or drop `:352`), or an explicit acceptance that diagnostic text inside a failure message does not warrant a round.
detail: |
  All three confirmed by the verifier, none false, none behavioural.
  IN-01 / IN-02 are diagnostic and terminology: two dated clauses needing four words, and a
  vocabulary collision — round 4's new term-of-art `PINNED` at `:913-916` collides with `:846`'s
  older, gate-sense use of "pins". (That collision is the downgraded residue of the code review's
  WR-02, which the verifier REFUTED on its central claim: `git blame` puts `:844-850` at `27d9111`
  when the block held ZERO named literals, so "the two numbers this block pins" never meant pinned
  literals. Round 4's pins actually improve that overlap from zero to two.)
  IN-03 carries the one thing worth flagging: it CORRECTS THE VERIFIER'S OWN ROUND-4 REPORT, which
  cleared `thresholds.spec.ts:327-353` wholesale. The load-bearing assertion at `:342-351` genuinely
  IS scale-invariant — re-derived algebraically, it reduces to `S > 0` — but `:352` is NOT, and goes
  red at `SOURCE_ROWS_PER_MAP_MAX = 4,096` (8,323 vs 8,192) for a formula no shipped constant uses.
  The prior clearance was over-broad; the verifier recorded that rather than repeating it.
severity: info
introduced_by: mixed — IN-03 pre-existing, IN-01/IN-02 partly this round
result: pass
reported: "pass"
resolution: "Accepted as written — the expected outcome's leading branch: a single tidy-up pass. (a) IN-01: four words on the two 2026-09-02 clauses so each reads historical values throughout. (b) IN-02: one vocabulary across the four tests — round 4's term-of-art `PINNED` at `:913-916` and `:846`'s older gate-sense 'pins' must not both stand; pick one and use it consistently. (c) IN-03: pin or drop `thresholds.spec.ts:352`, whose `deletedPerInterval >= supersededInsertSide` goes red at `SOURCE_ROWS_PER_MAP_MAX = 4,096` (8,323 vs 8,192) for a formula no shipped constant uses. All comment/spec text; none can move a byte. NOT EXECUTED — test 4 closed the phase; recorded as an accepted residual and as the pre-decided repair for whichever future plan next owns this file."


### 4. Decide STOP-OR-CONTINUE — close phase 07 at 33/33, or authorise a round 5 of roughly four lines
expected: A decision to close phase 07 at 33/33 with the residuals above accepted, or to authorise a round 5 scoped to WR-01 and WR-03 (roughly four lines of change between them).
detail: |
  33/33 must-haves verified — THE FIRST ROUND IN THIS PHASE WITH ZERO FAILING MUST-HAVES.
  DID THE GATE-DESIGN CHANGE WORK? The verifier's read, with evidence for both sides:
  YES, on what it targeted. Round 4 shipped ZERO false sentences. Every historical claim in its
  diff was verified from git independently, including five cross-commit line-number citations that
  are all correct. The axis history has now been re-derived FOUR times — planner, executor,
  reviewer, verifier — the last two reading the redactor bodies BEFORE opening the errata table,
  all in agreement. The deletion was genuinely a deletion: 26 words removed, one token added
  (`reused` -> `reused.`). The byte-count gate did exactly the work it was designed for, and a
  restatement could not have satisfied it.
  THE DEFECT CLASS DID NOT REAPPEAR IN ROUND 4'S OWN ADDITIONS. The code review's candidate for
  that (WR-02) was refuted by the verifier on git evidence.
  NO, not completely. Round 4 produced defects of a DIFFERENT AND MILDER KIND: one duplicated
  `const` and one terminology collision. And the single live falsehood left (WR-03) predates the
  round by two rounds — it is not round 4's work, but it is still there.
  THE HONEST SUMMARY, in the verifier's words: "it worked on what it targeted and did not make the
  round defect-free; both are true."
  WHAT CLOSING MEANS: closing at 33/33 accepts WR-03 KNOWINGLY rather than by omission. The
  verification report states this plainly so it cannot be absorbed silently. A round 5 would be
  roughly four lines — the smallest round this phase has seen by an order of magnitude.
severity: n/a — process decision
introduced_by: n/a
result: pass
reported: "pass — close phase 07 at 33/33 (clarified: the expected held two opposite branches)"
resolution: |
  CLOSE. Phase 07 closes at 33/33 with WR-01, WR-03 and IN-01/IN-02/IN-03 accepted as documented,
  non-behavioural residuals. No round 5.
  Tests 1-3's repair resolutions above are therefore NOT executed — they are recorded as the repair
  that WOULD have been made, and become accepted residuals instead. They are kept in this file
  rather than deleted so that whichever future plan next owns `thresholds.spec.ts` inherits a
  written, already-decided repair rather than re-deriving one.
  THIS ACCEPTS WR-03 KNOWINGLY. `thresholds.spec.ts:845` cites `retention.ts:178-180` for a sentence
  that lives at `:193-194`. It is a live false claim of the phase's own signature defect class, it
  is four characters from correct, and it is being left in the repository as a deliberate decision
  rather than by omission. The verification report states this plainly for the same reason.
  Grounds for stopping, from the round-5 verification: 33/33 must-haves with zero failing — the
  first such round in this phase; the gate-design change worked on what it targeted (round 4 shipped
  zero false sentences, and the defect class did not recur in its own additions); and the residuals
  cannot leak, corrupt, crash, mis-count or change a single exported byte.


## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none — all four decisions resolved without a gap. Tests 1-3 elected repairs; test 4 closed the
phase, so those repairs are recorded as ACCEPTED RESIDUALS rather than gaps. No fix plans are
generated and no round 5 runs.]

## Accepted Residuals (carried into phase closure)

- **WR-03 — the one live falsehood, accepted knowingly.** `thresholds.spec.ts:845` cites
  `retention.ts:178-180`; the sentence lives at `:193-194`. Correct at its authoring commit
  `27d9111`, broken by `d3caf4d` (07-20, round 2). Four characters from correct. Pre-decided repair
  is recorded at test 2.
- **WR-01 — duplicate derivation.** `recomputedShipped` (`thresholds.spec.ts:939-940`) duplicates
  `insertSide` (`:857-858`) with nothing asserting they agree. On desync exactly one test goes red,
  and it points the maintainer at the docblock rather than the stale formula. Pre-decided repair at
  test 1: drop the local, read the block-level binding.
- **IN-01 / IN-02 / IN-03 — three confirmed nits.** Two dated clauses needing four words; a
  `PINNED` vs "pins" vocabulary collision between `:913-916` and `:846`; and `:352`'s
  non-scale-invariant `deletedPerInterval >= supersededInsertSide` (red at
  `SOURCE_ROWS_PER_MAP_MAX = 4,096`). Pre-decided repair at test 3.

## Open Question Carried Forward (not decided by this round)

- **Cross-file line-number citations as a project practice.** Raised by the round-5 verifier
  alongside WR-03 and explicitly outside test 2's `expected`, so it was not folded into that
  decision. The evidence: this citation broke within ONE round of being authored, then survived
  three reviews and three verifications — including the verifier's own round-4 pass, which read the
  paragraph and did not check the pointer. The question is whether any `file.ts:NNN-NNN` pointer
  across a file boundary should be written in this project at all, given that a line number is a
  claim that goes stale silently on any edit above it. Not a phase-07 item; a standing convention
  the next phase to write such a citation should settle.

## Still Open By Operator Decision (carried, unchanged)

- W-4 — `vue-tsc` wired into no gate that runs; 6 pre-existing errors, none added by round 4.
- W-6 — `MAP_MAX_BYTES` under-serves recovery ~2x; still `2_621_440`.
- Round-1 UAT gap 3 — `tests/frontend-load.spec.ts` frame-budget backstop not wired.
- IN-04 — `derivedRejected.depth_exceeded` needs no docblock caveat (decided round 3).
- SC5's second half -> Phase 3 / Phase 11. MAP-01's external half -> Phase 8.
