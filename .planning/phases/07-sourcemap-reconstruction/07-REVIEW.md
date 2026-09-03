---
phase: 07-sourcemap-reconstruction
reviewed: 2026-09-03T12:04:54Z
depth: standard
round: 5
files_reviewed: 2
files_reviewed_list:
  - packages/backend/src/store/export.ts
  - packages/engine/src/thresholds.spec.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 7: Code Review Report (round 5 — gap-closure round 4)

**Reviewed:** 2026-09-03T12:04:54Z
**Depth:** standard — full read of `git diff 34dd37e..HEAD -- packages/` plus both
files at HEAD; independent third re-derivation of the `sources_verbatim`
redaction history from the redactor bodies at `d5cd5e0` / `a901b9e` / `0e44102`;
independent re-measurement of both new literals from `git show 59347c3` and
`git show 59347c3^`; independent re-derivation of `observations.url`'s binding
history back to `136b6e3`.
**Files Reviewed:** 2
**Status:** issues_found (0 Critical, 3 Warning, 3 Info)

## Summary

**All four round-4 gaps are genuinely closed, and — for the first time in this
phase — no shipped sentence in the diff is false.** I re-derived every historical
claim the diff makes from git myself before reading the round's own account of
it, and every one checks out. Round 4's WR-01, WR-02, IN-01 and IN-02 are all
gone, and gone in the way the gap contracts specified rather than by restatement.

What survives is narrower and different in kind: the *repair* introduced a
duplicated derivation to satisfy a transient grep tally (WR-01), and the round's
word-shaped tally probe let an older, differently-worded count survive 75 lines
above the sentence that declares the block count-free (WR-02) — a stale cross-file
citation in the same comment (WR-03) is the third thing that same reader-not-a-
machine mechanism was supposed to catch. None of the three can move a byte, widen
disclosure, or change a control-flow decision; the whole diff is comment lines
plus spec-local test text. **There is no Critical finding and, given the shape of
this diff, there could not be one.**

Verified independently, and recorded so round 6 does not re-litigate it:

- **G-07-9 is closed by the right cut.** The three deleted lines are exactly the
  axis-direction claim; the surrounding explanation is intact
  (`export.ts:440-451` still carries "WHAT DOES NOT SURVIVE", both cuts, and the
  closing pointer to `redactSourceLabelForExport`). The only `narrow`-family hits
  left in the file are `:253` ("What changed is narrower than an exemption") and
  `:335` ("the SAME marker, a narrower cut") — **neither is touched by this
  diff**; `git diff 34dd37e..HEAD -- packages/backend/src/store/export.ts | grep
  -i 'narrow\|widen'` returns only the two deleted lines. Both are true of the
  code beside them.
- **G-07-12's qualifier is exactly accurate.** `serialiseRows` (`export.ts:604-607`)
  applies `column.redact` iff `mode === "redacted" && column.redact !== null`;
  `observations.url` (`:418`) has bound `redactUrlForExport` since the column set
  was first written (`136b6e3`, `:251`) and that function's body has been
  `url.search(/[?#]/)` unchanged since the same commit. So "on every REDACTED row
  it has ever written" is true of every row the column has ever written in that
  mode, and — unlike the sentence it replaced — false of none.
- **Both new literals are correct history, measured by me from git.**
  `git show 59347c3:packages/engine/src/thresholds.ts` →
  `ROWS_INSERTED_PER_ARTIFACT_MAX = 3` (line 111), `RETENTION_SWEEP_EVERY_N = 128`
  (line 215), `SOURCE_ROWS_PER_MAP_MAX = 2_048` (line 454),
  `ROWS_INSERTED_PER_ITERATION_MAX = ROWS_INSERTED_PER_ARTIFACT_MAX +
  SOURCE_ROWS_PER_MAP_MAX` with **no** `2 *` factor (line 490) → `128 + (3 +
  2048) = 2179`. Every line number the new comment cites is correct.
  `git show 59347c3^:…` → the same file carries `ROWS_INSERTED_PER_ITERATION_MAX
  = ROWS_INSERTED_PER_ARTIFACT_MAX + 2 * SOURCE_ROWS_PER_MAP_MAX` (line 480-481)
  and `RETENTION_SWEEP_MAX_ROWS = 512` (line 152) → `4227` and
  `4227/512 = 8.2558… → "8.26"`. `thresholds.ts` at HEAD is md5
  `6391d0d50f9741f50909ec9197dd25c9`, diffstat EMPTY.
- **The drift behaviour the round set out to fix is now correct.** Under a
  re-measurement of `SOURCE_ROWS_PER_MAP_MAX`, the non-vacuity guard
  (`:1060-1089`) reads only pinned literals and stays GREEN; the coincidence
  assertion (`:931-990`) goes red with a remedy pointing at itself; the presence
  half goes red demanding the new figure appear in the docblock that describes
  *today*, which is correct. No assertion any longer demands that a paragraph
  about 2026-09-02 be rewritten.

*(No `<structural_findings>` block was supplied, so there is no fallow-substrate
section.)*

---

## Answers to the four checks requested

### Check 1 — both literals verified from git

Verified independently, above. `2_179`, `512` and `8.26` all reproduce, and every
line-number citation inside the new provenance comment (`111`, `215`, `454`,
`490`, `152`) resolves to the constant it names at the commit it names.

### Check 2 — the axis history, re-derived a third time

I read the three redactor bodies out of git **before** opening the errata table.

| commit | `sources_verbatim` binding | redactor body | QUERY axis | FRAGMENT axis |
|---|---|---|---|---|
| `d5cd5e0` (07-06) | `:301` `redact: redactUrlForExport` | `url.search(/[?#]/)`, no shape test | **every** label | **every** label |
| `a901b9e` (07-16) | `:385` `redact: redactSourceLabelForExport` | `:273-275` `isProtocolShapedLabel(l) ? redactUrlForExport(l) : l` | **protocol-shaped only** | **protocol-shaped only** |
| `0e44102` (07-22) | `:428` `redact: redactSourceLabelForExport` | `:309-318` protocol → delegate; else `label.indexOf("?")`, never `#` | **every** label | **protocol-shaped only** |

**My reading AGREES with the errata table in every particular** — this is the
third independent derivation and it found no disagreement. The consequences,
worked through rather than restated:

- `d5cd5e0` → `a901b9e`: **both** axes narrow, together, under one shape test.
- `a901b9e` → `0e44102`: **one** axis moves (query, widening); the fragment axis
  is unmoved because the by-hand branch reads `indexOf("?")` and never `#`.
- `d5cd5e0` → `0e44102`: the query axis ends exactly where it began; **one** axis
  moved (fragment, narrowing).

There is no baseline under which the two axes moved in mutually opposite
directions, so the deleted sentence was false and the deletion was the right
repair. **Round 4 did not replace one false history with another.**

I also signed off the two historical claims that survive in `export.ts`, against
the same three bodies: `:261` "THE FRAGMENT AXIS, UNMOVED … still cut only on a
label that is actually a URL" is true against the 07-16 baseline it names; `:268`
"THE QUERY AXIS, RESTORED" is exact, because `d5cd5e0` cut every label and
`0e44102` returns the axis to that width. Its example
`src/App.vue?vue&type=script&lang.ts` is genuinely not protocol-shaped under
`isProtocolShapedLabel` (`:236-241`), so it genuinely did export verbatim between
07-16 and WR-03.

### Check 3 — the two items the `07-27` executor flagged

**(a) `thresholds.spec.ts:327-354`'s commit-ordering test — genuinely out of scope,
not next round's WR-01.** Reasoned rather than asserted: that test never demands
that any prose contain any number. Its load-bearing assertion is
`shippedInsertSide < supersededInsertSide` (`:342-351`), which reduces to
`insertSide < insertSide + SOURCE_ROWS_PER_MAP_MAX` — scale-invariant, true for
any positive value of the constant, and therefore incapable of the
"drift detector becomes the drift generator" failure, which requires a *dated
record* on one side of the comparison. G-07-10's class needs a historical demand;
this is a property over today's constants, which is exactly the shape round 4's
own rule says should stay derived. It has a weaker cousin, filed as IN-03 below,
and that cousin is Info-sized. **My verdict: correctly fenced out of round 4, and
it should not become round 5's Warning.**

**(b) The `grep -c 'only these'` probe is word-shaped and it did leak — WR-02 is
the proof.** The substantive property ("this block states no tally") is in fact
TRUE of the region the probe covered: I grepped `:843-1090` for `only these`,
`the two literals`, `two literals`, `three literals`, `only two`, `only three` and
found nothing. But the probe cannot enforce the property, and the demonstration is
sitting in the same comment block: `:845-846` states "the same **two** numbers this
block pins", 75 lines above the sentence at `:911-916` that declares the block
"states the rule and counts nothing". A negative grep on one string cannot see a
count worded differently, and it did not. **Honest assessment: VF-01's defect class
did survive inside the round convened to close it — not as a false claim in the
new text, but as an unenforced rule that a pre-existing sentence in the same block
already breaks.** The falsifiable form is a region-scoped regex over count-words,
or an acceptance that this property is review-only and must be signed off by a
reader each round.

### Check 4 — scope discipline

- **Every changed line in `export.ts` is a comment line.** `git diff … --
  export.ts | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' | grep -vE '^[+-] *(\*|//)'`
  returns nothing.
- **No SHIPPED figure became a literal.** `:856-862` still derives `deleteSide`,
  `insertSide`, `quotient`, `smallestSatisfying`, `nextPowerOfTwo` and `headroom`
  from the `T.*` imports; the literal probe
  `grep -nE '(deleteSide|insertSide|quotient|smallestSatisfying|nextPowerOfTwo|headroom) = [0-9][0-9_]*;'`
  returns nothing.
- **The presence and absence halves correctly stayed on the DERIVED `insertSide`.**
  All four `grouped(insertSide)` occurrences are at `:1001`, `:1006`, `:1025`
  (presence half, `it` at `:992`) and `:1052` (absence half, `it` at `:1032`). The
  non-vacuity guard (`it` at `:1060`) now contains **zero** derived references —
  exactly the substitution G-07-10 asked for at the three old sites.
- **The Rule 1 deviation was the right call, and the resulting text is accurate.**
  Shipping the plan's prescribed "leaving the **three** literals" would have been
  falsified by task 2's fourth pin inside the same block — the exact defect the
  round existed to remove, and a violation of the plan's own binding `must_haves`.
  "the pinned historical literals" is a rule, not a tally, it is true of all four
  pins, and applying it to the pre-existing "the two literals" clause at `:954`
  as well was correct rather than scope creep, because that clause was falsified
  by task 1's own pin. Deviating in favour of the plan's `must_haves` over the
  plan's prescribed wording is the right resolution of a plan-internal
  contradiction.

---

## Critical Issues

*(None. Every historical claim in the diff was re-derived from git and holds; the
diff cannot change behaviour.)*

---

## Warnings

### WR-01: `thresholds.spec.ts:939-940` duplicates the block-level `insertSide` derivation with nothing asserting the two agree — a drift detector that can silently stop detecting

**Classification:** WARNING
**File:** `packages/engine/src/thresholds.spec.ts:939-940`, against `:857-858`

**Issue.** Two bindings now hold byte-identical initialisers for the same quantity,
80 lines apart, with no link between them:

```ts
// :857-858 — block scope, read by the presence half and the absence half
const insertSide =
  T.RETENTION_SWEEP_EVERY_N + T.ROWS_INSERTED_PER_ITERATION_MAX;

// :939-940 — test-local, read by the new coincidence expect
const recomputedShipped =
  T.RETENTION_SWEEP_EVERY_N + T.ROWS_INSERTED_PER_ITERATION_MAX;
```

The new `expect` (`:973-989`) asserts `recomputedShipped` against
`SHIPPED_INSERT_SIDE_AT_59347C3` and its message calls it "the shipped insert
side". That name is only true while the two expressions agree, and nothing in the
file makes them agree. Change how the shipped insert side is composed — add a
term to `insertSide`, or change which constants it reads — and `recomputedShipped`
keeps the old formula: the coincidence assertion goes on claiming it covers "the
shipped insert side" while covering a stale one, and the guard it protects
(`:1060-1089`) is left reading a pinned literal that nothing checks against
today's arithmetic any more. That is a smaller version of the same failure this
round existed to close, planted by the repair itself.

The stated reason for the duplicate (`07-27-SUMMARY.md`, Decisions Made 1) is that
using `grouped(insertSide)` in the new message would have inflated a plan gate of
"exactly 4 block-wide `grouped(insertSide)`". That gate was a one-round acceptance
probe; it does not exist in the repository. The duplicate it forced does.

**Fix.** Either read the block-level binding directly —

```ts
    expect(
      insertSide,
      `Today's constants derive the shipped insert side as ` +
        `${grouped(insertSide)}, but the pinned historical figure is ` +
        // … unchanged …
    ).toBe(SHIPPED_INSERT_SIDE_AT_59347C3);
```

— and drop `recomputedShipped`; or, if the local must stay for symmetry with
`recomputed` / `recomputedQuotient`, make the desync detectable in one line:

```ts
    // The local mirrors the block's shipped derivation; if they ever part, the
    // sentence below stops describing the shipped insert side.
    expect(recomputedShipped).toBe(insertSide);
```

### WR-02: `thresholds.spec.ts:845-846` states a tally that this round's own fourth pin makes wrong, 75 lines above the sentence declaring the block tally-free

**Classification:** WARNING
**File:** `packages/engine/src/thresholds.spec.ts:844-846`, against `:911-916` and `:925`

**Issue.** The block opens with:

```
  // THE SECOND COPY OF THIS FIGURE IS UNGUARDED … `packages/backend/src/store/
  // retention.ts:178-180` states the same two numbers this block pins —
  // "512 x 16 = 8,192 against 128 + 2,051 = 2,179" — and NO TEST READS THAT
  // SENTENCE.
```

and closes, in the sentence this diff wrote, with:

```
  // The distinction this block keeps is the rule, not a tally … which is why
  // this sentence states the rule and counts nothing, a count here being exactly
  // the kind of claim the next pin beneath it would falsify.
```

The count at `:845` is the kind of claim the *previous* pin already falsified.
Of the numerals in the quoted `retention.ts` sentence, the block now pins **two**
of them as literals — `2_179` (`:924`, added by this diff) and `512` (`:925`,
added by this diff) — and derives a third, `8,192`, as `deleteSide` (`:856`).
Before this round the block pinned *neither* of the two numbers the sentence
names, so "the same two numbers this block pins" was already loose; after it, the
plainest reading is simply wrong, and the sentence sits in the same comment block
as the rule it breaks.

This is also the concrete evidence for check 3(b): the round's acceptance probe
was `grep -c 'only these'` / `grep -c 'only these two'`, a negative on two exact
strings, and a differently-worded count in the same block passed straight through
it.

**Fix.** State the relationship as a rule, not a count, the same way `:911-916`
now does:

```ts
  // THE SECOND COPY OF THESE FIGURES IS UNGUARDED, AND SAYING SO IS THE HONEST
  // OPTION. `packages/backend/src/store/retention.ts` restates the same
  // inequality this block derives — "512 x 16 = 8,192 against 128 + 2,051 =
  // 2,179" — and NO TEST READS THAT SENTENCE.
```

### WR-03: `thresholds.spec.ts:845`'s cross-file citation is stale — the quoted sentence is at `retention.ts:193-194`, not `:178-180`

**Classification:** WARNING (pre-existing; not introduced by this diff)
**File:** `packages/engine/src/thresholds.spec.ts:845`, against
`packages/backend/src/store/retention.ts:193-194`

**Issue.** The comment sends the reader to `retention.ts:178-180`. Those lines are
a different paragraph entirely ("AND THE INEQUALITY NOW BOUNDS SOMETHING REAL
(07-VERIFICATION.md W-5) …"). The quoted sentence — "512 x 16 = 8,192 against
128 + 2,051 = 2,179" — is at `:193-194`:

```
193: * NO CONSTANT MOVED for this. The delete side already dominated: 512 x 16 =
194: * 8,192 against 128 + 2,051 = 2,179. What changed is that the tables the 2,051
```

`git blame` puts the citation at `27d9111b` (2026-09-02); `retention.ts` was
edited afterwards by `d3caf4d` (07-20), which is when it went stale. Reported
because the comment's own thesis is that these two paragraphs "are kept in
agreement by a READER, not by a machine" — a reader sent to the wrong lines is
precisely the failure mode the comment names, and the pointer has now survived
four review rounds unread.

**Fix.** Correct the citation to `retention.ts:193-194`, or drop the line numbers
and cite the file plus the quoted sentence, which is what the reader actually
greps for and which cannot go stale.

---

## Info

### IN-01: the coincidence test's first and third messages both say "describes 2026-09-02, when the figure was …" and give different figures

**Classification:** INFO
**File:** `packages/engine/src/thresholds.spec.ts:948` and `:981`

**Issue.** `:948` reads "`ROWS_INSERTED_PER_ITERATION_MAX`'s docblock in … describes
2026-09-02, when the figure was 4,227"; `:981` reads "… describes 2026-09-02, when
the figure was 2,179". Both are true — the two figures are the insert side either
side of `59347c3`, which landed that day — but neither trailing clause says which
side it means, and read together in one test they assert the figure was two
different values on the same date. Each message does disambiguate itself earlier
("READ at 59347c3's parent" / "READ at 59347c3"), and the text is diagnostic-only,
which is why this is Info rather than Warning. Given this phase's history with
prose that reads false at a glance, it is worth the four words.

**Fix.** `… describes 2026-09-02, when the figure was ${…} (before 59347c3)` and
`… (after 59347c3)`.

### IN-02: "presence half" names two different tests inside one comment block

**Classification:** INFO
**File:** `packages/engine/src/thresholds.spec.ts:872` against `:887-888` and `:992`

**Issue.** At `:872` the comment says "the presence half below would demand the NEW
number be written into a paragraph describing a day when the number was 4,227".
The only test that demands a figure appear in a *dated* paragraph is the
non-vacuity guard at `:1060` — which the sentence this diff added at `:887-888`
calls "the non-vacuity half", and which G-07-10's contract distinguishes from "the
presence half" (the passes-docblock test at `:992`). So the block now has three
tests referred to as "halves", one of which has two names, and "presence half"
resolves differently depending on which paragraph the reader is in. Nothing is
false; it just costs the next reader a re-derivation of which assertion is meant.

**Fix.** Adopt one vocabulary — refer to the three tests by the distinctive words
of their `it` titles ("the coincidence assertion", "the passes-docblock presence
check", "the absence check", "the non-vacuity guard") and use it in all four
paragraphs.

### IN-03: `thresholds.spec.ts:352` bounds today's delete budget against a formula the code retired

**Classification:** INFO
**File:** `packages/engine/src/thresholds.spec.ts:336-354`

**Issue.** Recorded as the reasoned answer to check 3(a), and as the weaker cousin
I said the commit-ordering test carries. `supersededInsertSide` (`:336-340`)
recomputes the retired `128 + 3 + 2 * SOURCE_ROWS_PER_MAP_MAX` form from *today's*
constants. The load-bearing assertion at `:342-351` is safe — it is scale-invariant
and demands nothing of any prose. But `:352`,
`expect(deletedPerInterval).toBeGreaterThanOrEqual(supersededInsertSide)`, asserts
that today's delete budget still dominates a counterfactual bound: at
`SOURCE_ROWS_PER_MAP_MAX = 4_096` it computes `128 + 3 + 8192 = 8,323` against
`512 * 16 = 8,192` and goes RED for a formula no shipped constant uses. Its
message also labels a recomputed number "the superseded" figure, which will not be
the superseded figure once a constant moves. Low-impact — a legitimate
re-measurement would fail an assertion about a retired form, which is noise rather
than a wrong demand on a dated record — but it is the only residual of this class
left in the file.

**Fix (for whichever plan next touches this test, not for this round).** Either
pin the counterfactual the same way the documented-derivation block now pins its
history (`const SUPERSEDED_INSERT_SIDE_FORM = 4_227;`) with a note that it records
the pre-`59347c3` bound, or drop `:352` and keep only the relational assertion,
which is the property the test's title actually claims.

---

## What I checked and did NOT find a problem with

Recorded so round 6 does not churn ground that has now been verified against git:

- **`export.ts:313-315`'s "on every REDACTED row it has ever written" is correct
  and should not be restated again.** A stricter reading — that the *output*
  described (a query marker over a fragment-only URL) does not occur on every
  redacted row, only on rows carrying a `#` — is available, but the sentence's
  subject is the redactor's behaviour, in parallel with "It is PRE-EXISTING
  `redactUrlForExport` behaviour" in the same clause, and that behaviour has
  governed every redacted row `observations.url` has written since `136b6e3`.
  Restating this sentence a fourth time would be more likely to introduce a defect
  than to remove one.
- **`export.ts:266` "the fragment axis is still cut only on a label that is
  actually a URL" survives an edge case.** A non-protocol label such as
  `src/a?x#y` does lose its `#y` tail — but as collateral of the query cut at
  `indexOf("?")`, not because a fragment cut ran. The claim is about which
  operation is applied to which population and it holds.
- **`export.ts:253` and `:335` ("narrower than an exemption", "a narrower cut")**
  are pre-existing, untouched by this diff, and true of the code beside them. They
  are not direction-of-change claims about the two axes.
- **The docblock's cross-reference to the column comment survived the deletion.**
  `:312-313` says "the column comment on `sources_verbatim` names the same output
  as the wrong thing LO-04's fix removed on the path branch" — `:440-444` still
  names it ("Cutting a bare path at its first `#` discarded a legal filename tail
  AND printed a marker claiming a query had been withheld…"). The deletion cut the
  false claim and nothing load-bearing.
- **`8.26` correctly appears nowhere in `thresholds.ts`** (`grep -n '8\.26'` →
  nothing), so the absence half is asserting the absence of a string that is
  genuinely retired rather than one that was never there.
- **`region()`'s anchors still resolve** and both docblock slices are bounded by
  `export const` declarations rather than line numbers, so this round's edits
  cannot have shifted them.
- Per the round's fence I did not report W-4, W-6, the frontend frame-budget
  backstop, IN-04's declined docblock caveat, SC5's second half or MAP-01's
  external half — all open by explicit operator decision — and I did not widen
  scope to plans 07-01…07-25, which rounds 1-4 already reviewed.

---

_Reviewed: 2026-09-03T12:04:54Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Round: 5 — gap-closure round 4 (`34dd37e..HEAD`, plans 07-26 and 07-27)_
