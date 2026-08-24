---
phase: 01-skeleton-persistence-compatibility
plan: 26
subsystem: testing
tags: [redaction, url-truncation, typescript-ast, gate-disclosure, windows-ledger]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "the segment-boundary truncation and its query-side sweep (01-20), the binding-declaration-order bound (01-23), the whole-file string-key collectors (01-24), the collapsed receiver descent and its precedence fix (01-25)"
provides:
  - "the head-side `;` residual pinned by a SWEEP whose unstable set is found at run time and whose SHAPE is asserted, never a hard-coded band"
  - "zero secret survivals asserted at BOTH passes at every one of 142 swept offsets, beside the stability claim that failed"
  - "the no-separator class stated against its BRANCH CONDITION in all three disclosure sites, and pinned by a swept THREE-parameter case"
  - "the alias bound stated in ONE place and pointed at from three, with the one correct identical sentence kept and marked"
  - "the transitivity assertion at five alias sets and three hops, where it was three sets at two"
  - "both binding-pattern spellings of a declared assembly collected (IN-26), with must-stay-quiet twins and a real-tree zero"
  - "the STORE-07 residual paragraph self-consistent, its enumerated items corrected against execution in both directions"
  - "residual (b2) — a NEW open shape named by measurement rather than by review"
  - "three WINDOWS ledger entries reconciled through the tool; exactly one open entry on the gate file"
affects: [wave-27-residual-derivation, wave-28-requirement-tier-reconciliation, CORE-11, STORE-03, STORE-07]

actuals:
  tokens: 11910
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "a residual pinned by a SWEEP that asserts the instability's SHAPE (non-empty, contiguous, strictly inside the swept range) rather than a literal band"
    - "the failed half and the holding half of a residual asserted in the SAME case, so a reader can tell which half is which"
    - "a bound stated once and POINTED AT from every other site, because a bound restated in four places drifts in three"
    - "a canonical residual authored once and rendered byte-identically into the gate header and the tool-owned ledger"

key-files:
  created: []
  modified:
    - packages/backend/src/store/observations.spec.ts
    - packages/backend/src/store/observations.ts
    - packages/backend/src/store/schema.spec.ts
    - packages/backend/src/outbound-prohibition.spec.ts
    - packages/backend/src/store/error-redaction.spec.ts
    - tests/pins.spec.ts
    - .planning/WINDOWS.md

key-decisions:
  - "The head-side sweep asserts the instability's SHAPE and never the literal band 2019-2029 — hard-coding the band would be the same defect one layer up and would go red for the wrong reason the day URL_MAX or the marker text moves."
  - "`normaliseObservedUrl`'s BEHAVIOUR is deliberately unchanged: the residual is disclosed and pinned, not closed, for the reason the module already records."
  - "IN-23 resolved by DELETING the `export` rather than by deleting the sentence that justified it — the lift-out was the fix and the keyword was never part of it."
  - "WR-31 resolved by NAMING the antecedent (the render-form list) rather than moving the sentence, with the disambiguation inline so a later insertion cannot re-create the ambiguity."
  - "IN-26 closed for the ASSEMBLY spellings only. The `constStrings` sibling it surfaced is DISCLOSED as residual (b2), not silently folded in — widening constStrings through binding patterns is a separate decision needing its own real-tree measurement."

patterns-established:
  - "MEASURED SILENCE / MEASURED NON-EVIDENCE: a fixture that stays green under the mutation it sits beside is titled as non-evidence with the rule that caught it named."
  - "Execute the string a docblock calls silent BEFORE editing the docblock; the measurement is the evidence for the edit."

requirements-completed: [CORE-11, STORE-03, STORE-07]

coverage:
  - id: D1
    description: "The head-side `;` residual is pinned by a sweep over 71 offsets whose unstable set is found at run time; its shape is asserted (non-empty, contiguous, strictly inside range) and zero secret survivals are asserted at both passes across the whole range."
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#THE NO-SEPARATOR BRANCH: with no `&` inside the cut the byte cut STANDS, and the residual that lives there is SWEPT, not pinned at one chosen offset (WR-22/WR-28/WR-29)"
        status: pass
      - kind: other
        ref: "MUTATION MA2 — sweep range narrowed to the single stable offset 2010: RED"
        status: pass
    human_judgment: false
  - id: D2
    description: "The no-separator class is stated against its branch condition in all three disclosure sites and pinned by a swept three-parameter case (17 of 71 offsets unstable, zero leaks)."
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#THE NO-SEPARATOR BRANCH … (WR-22/WR-28/WR-29)"
        status: pass
      - kind: other
        ref: "grep -rn 'a query of a SINGLE segment' packages/backend/src/store/ -> no lines"
        status: pass
    human_judgment: false
  - id: D3
    description: "The alias bound is stated once (residual (a)) and pointed at from three docblocks; the fourth identical sentence, on assembledNames, survives and is marked as the one place the one-hop bound is true."
    requirement: "CORE-11"
    verification:
      - kind: other
        ref: "grep -c 'ONE HOP AND NO MORE' packages/backend/src/outbound-prohibition.spec.ts -> 1, on assembledNames"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through ALL FIVE ALIAS SETS' TRANSITIVITY: an alias CHAIN resolves to ANY depth when each link's DECLARATION follows the declaration it is grown from"
        status: pass
      - kind: other
        ref: "MUTATION MB2 — navigatorAliases/globalAliases grown from the root only: RED"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both binding-pattern spellings of a declared assembly are collected (IN-26); must-stay-quiet twins hold and the real tree is at zero over 23 files."
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through assembledNames' BINDING-PATTERN branches: the two DESTRUCTURE spellings of a declared assembly report — IN-26"
        status: pass
      - kind: integration
        ref: "packages/backend/src/outbound-prohibition.spec.ts#CORE-11 — no outbound surface is reachable from packages/backend/src or packages/engine/src"
        status: pass
      - kind: other
        ref: "MUTATION MB1 — both binding-pattern reads deleted: RED"
        status: pass
    human_judgment: false
  - id: D5
    description: "The STORE-07 residual paragraph names its antecedent and its enumerated items match what the descent executes; both corrected halves are pinned in the firing direction and the four open halves as measured silences."
    requirement: "STORE-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#CORRECTED BY EXECUTION (IN-25): the three METHOD renders residual item 1 called unseen all REPORT"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#RESIDUAL, STILL OPEN AFTER IN-25 — the halves that stay silent"
        status: pass
      - kind: other
        ref: "MUTATION MC1 — derivesFrom's member-call descent removed: RED"
        status: pass
    human_judgment: false
  - id: D6
    description: "The two pins.spec.ts docblocks stop claiming what they do not deliver: the `export` on versionLiterals is gone, and the two-component limit is stated in the header beside the fixture that creates it."
    verification:
      - kind: unit
        ref: "tests/pins.spec.ts#names no THREE-COMPONENT version literal anywhere, COMMENTS INCLUDED — and a two-component spelling is outside the predicate BY CONSTRUCTION, see the header"
        status: pass
      - kind: other
        ref: "MUTATION MC2 — versionLiterals widened past exactly-three components: RED; pnpm knip exit 0"
        status: pass
    human_judgment: false
  - id: D7
    description: "Three WINDOWS ledger entries reconciled through the tool (19, 24, 28 closed; 29, 30, 31 appended), with entry 31 rendered byte-identically into the gate header."
    verification:
      - kind: other
        ref: "gsd-tools windows status — exactly 1 open entry on outbound-prohibition.spec.ts; canon-in-header identity check True"
        status: pass
    human_judgment: false

duration: 30 min
completed: 2026-08-24
status: complete
---

# Phase 01 Plan 26: Six Disclosures Brought Level With Their Code Summary

**The head-side `;` residual stops being a property asserted from one chosen offset and becomes what a 71-offset sweep finds; the no-separator class is restated against its branch condition; three docblocks asserting a measured-false alias bound become pointers to the one place it is stated; the last declaration spelling the gate header claimed was covered is collected; and three ledger entries stop describing work already done.**

## Performance

- **Duration:** 30 min
- **Started:** 2026-08-24T12:35:00Z
- **Completed:** 2026-08-24T13:05:00Z
- **Tasks:** 3
- **Files modified:** 7 (6 source + `.planning/WINDOWS.md`)

## Nothing in this plan is a leak, stated per finding

**WR-28** — zero secret survivals across the full range the sweep walks (71 head-side offsets, both passes each), and `recordObservation` applies `normaliseObservedUrl` ONCE per row, so no production path ever takes the second pass. What failed was the STABILITY claim, not the redaction.
**WR-29** — same sweep discipline on a three-parameter query: 71 offsets, zero survivals. A scoping defect in prose, not an exposure.
**WR-30** — runs in the SAFE direction: the gate reaches FURTHER than the three deleted sentences said, so nothing was hidden by them.
**WR-31, IN-23, IN-24, IN-25** — disclosure defects in gates that run green. Nothing changes what any gate reports.
**IN-26** — unreachable in the real tree today: 23 files over both `SOURCE_ROOTS`, ZERO violations, before and after.

All six are prospective gate blindness or disclosure defects. `pnpm check:bundle` reports the shipped bundle's entire import set as one specifier, `crypto`.

## Accomplishments

- Replaced the head-side single-offset pin with a **sweep whose unstable set is found at run time**, asserting its SHAPE — non-empty, contiguous, strictly inside the swept range — rather than the literal band. The band the run found is `2019..2029`; that pair of numbers appears **nowhere in the fixture**.
- Asserted the residual's **holding half beside its failed half**: secret absence at BOTH passes at every swept offset, using the file's own `expectSecretAbsent`.
- Restated the no-separator class **against its branch condition** in all three sites, and pinned it with a swept three-parameter case.
- Executed the three WR-30 docblock strings **before editing a word**; all three report. Replaced each with a pointer to residual (a); kept and marked the fourth, correct, identical sentence.
- Widened the transitivity assertion from three alias sets at two hops to **five at three**.
- Closed IN-26: both binding-pattern spellings of a declared assembly are collected, with four must-stay-quiet twins and a real-tree zero.
- Re-executed all five IN-25 shapes and corrected items 1 and 3 **in both directions**, then pinned both directions.
- Named the WR-31 antecedent; deleted the unjustified `export`; stated the two-component limit.
- Reconciled three ledger entries through the tool.

## Task Commits

1. **Task 1: the head-side sweep, the zero-leak assertion, the two restated disclosures, ledger entry 19** — `ec2ecd3` (test)
2. **Task 2: the three alias bounds, the transitivity width, IN-26** — `b0b0f92` (fix)
3. **Task 2 addendum: the twin case titled as measured non-evidence** — `9a050bd` (docs)
4. **Task 3: the STORE-07 paragraph, the two pins docblocks, ledger entries 24 and 28** — `e5b236e` (docs)

---

## 1. THE HEAD-SIDE SWEEP — every figure below is read off an executed run

The plan's own prohibition is that no count may appear that is not traceable to a run. The following block is the output of the two sweeps executed exactly as the shipped fixtures run them:

```
HEAD  swept n=1975..2045  offsets=71  unstable=11  secret survivals=0
HEAD  unstable offsets: 2019 2020 2021 2022 2023 2024 2025 2026 2027 2028 2029
HEAD  contiguous=true  strictly inside range=true
MULTI swept n=1975..2045  offsets=71  unstable=17  secret survivals=0
MULTI unstable offsets: 2015 2016 2017 2018 2019 2020 2021 2022 2023 2024 2025 2026 2027 2028 2029 2030 2031
MULTI contiguous=true  strictly inside range=true
TOTAL offsets walked=142  TOTAL secret survivals=0
```

**Swept range: n=1975..2045. Offsets covered: 71 per sweep, 142 total. Unstable: 11 head-side, 17 multi-segment. Secret survivals: 0.** No other range or count appears anywhere in this summary, and none is carried in from prose. The plan's earlier draft asserted "200 swept offsets" with no provenance; that figure appears nowhere here because no run produced it.

The mechanism, at the first offset the run found unstable:

```
n=2019 pass1 len 2048 tail "pppppppppppppp;jsessionid="
n=2019 pass2 len 2047 tail "ppppppppppppppp;<redacted>"
```

The cut lands just past the `=`, so the second pass sees a `;` segment with no value half and P10-D1 redacts it whole — one byte shorter.

### What the fixture asserts, and what it deliberately does not

```ts
const HEAD_LO = 1975;
const HEAD_HI = 2045;
const headUnstable: number[] = [];
let headSwept = 0;
for (let n = HEAD_LO; n <= HEAD_HI; n += 1) {
  const once = normaliseObservedUrl(
    `https://cdn.test/${"p".repeat(n)};jsessionid=SECRETSESSION`,
  );
  const twice = normaliseObservedUrl(once);
  headSwept += 1;
  if (twice !== once) headUnstable.push(n);
  expect(once.length).toBeLessThanOrEqual(URL_MAX);
  expectSecretAbsent(once, "SECRETSESSION", `head length ${n}, pass 1`);
  expectSecretAbsent(twice, "SECRETSESSION", `head length ${n}, pass 2`);
}
expect(headSwept).toBe(HEAD_HI - HEAD_LO + 1);
expect(headUnstable.length, "the head-side residual is CLOSED across …").toBeGreaterThan(0);
expect(headUnstable[headUnstable.length - 1] - headUnstable[0] + 1, "…no longer ONE contiguous band…").toBe(headUnstable.length);
expect(headUnstable.every((n) => n > HEAD_LO && n < HEAD_HI), "…reaches an edge of the swept range…").toBe(true);
```

`2019` and `2029` are **not** in the fixture. Writing them there would be the same defect one layer up: a number with no derivation, going RED for the wrong reason the day a constant moves.

The mechanism is in the case comment, not only here:

```
// THE MECHANISM, written down so the band stays re-derivable when `URL_MAX`
// or the marker text moves. A head-side cut landing INSIDE the `<redacted>`
// marker IS a fixed point: the second pass re-expands the marker and
// re-truncates to the same byte. A head-side cut landing inside the
// parameter NAME is NOT: the second pass sees a `;` segment with no `=` at
// all, decision P10-D1 redacts that segment WHOLE, and the stored value can
// SHRINK by a byte on the second pass.
```

### The offset the old fixture chose is kept, as the stable exemplar

```ts
const markerCut = normaliseObservedUrl(
  `https://cdn.test/${"p".repeat(2010)};jsessionid=SECRETSESSION`,
);
expect(markerCut.slice(-26)).toBe("ppppp;jsessionid=<redacted");
expect(normaliseObservedUrl(markerCut)).toBe(markerCut);
```

Measured: `head n=2010 len=2048 tail="ppppp;jsessionid=<redacted" fixed=true`. It is a fixed point — **which is exactly why the single-offset pin passed for a round while the property it was cited for was false.** Keeping it as the exemplar records that, instead of deleting the evidence.

The unstable exemplar reads its offset **out of the run**, never from a literal:

```ts
const nameCut = normaliseObservedUrl(
  `https://cdn.test/${"p".repeat(headUnstable[0])};jsessionid=SECRETSESSION`,
);
expect(nameCut.slice(-12)).toBe(";jsessionid=");
const nameCutTwice = normaliseObservedUrl(nameCut);
expect(nameCutTwice.length).toBe(nameCut.length - 1);
expect(nameCutTwice.slice(-11)).toBe(";<redacted>");
```

## 2. THE THREE STABILITY DISCLOSURES, PASTED CONSECUTIVELY AND SHOWN TO AGREE

**(1) `packages/backend/src/store/observations.spec.ts` — the case comment**

```
// A head-side cut landing INSIDE the `<redacted>` marker IS a fixed point: the
// second pass re-expands the marker and re-truncates to the same byte. A
// head-side cut landing inside the parameter NAME is NOT: the second pass sees
// a `;` segment with no `=` at all, decision P10-D1 redacts that segment WHOLE,
// and the stored value can SHRINK by a byte on the second pass.
```

**(2) `packages/backend/src/store/schema.spec.ts` — the `observations.url` OPEN list**

```
 *  Inside the class there are TWO shapes and exactly one of them is a fixed
 *  point: (1) a cut landing inside a `;` parameter's `<redacted>` MARKER is
 *  stable — a second pass re-expands and re-truncates to the same byte; (2) a
 *  cut landing inside a parameter NAME is NOT stable — the second pass sees a
 *  segment with no `=`, P10-D1 redacts it WHOLE, and the value can SHRINK by a
 *  byte. Shape (2) used to be asserted STABLE from ONE chosen offset (WR-28); a
 *  sweep of the 71 head lengths around that offset finds 11 that are not fixed
 *  points, so the claim here is now what a sweep finds rather than what one
 *  offset showed.
```

**(3) `packages/backend/src/store/observations.ts` — the no-separator paragraph**

```
 * Inside the class there are two shapes and only one of them is a fixed point:
 *
 *   a cut landing inside a `;` parameter's `<redacted>` MARKER is stable — the
 *   second pass re-expands the marker and re-truncates to the same byte;
 *
 *   a cut landing inside a parameter NAME is NOT stable — the second pass sees a
 *   segment with no `=`, decision P10-D1 redacts it WHOLE, and the stored value can
 *   SHRINK by a byte.
```

All three name the same two shapes and the same mechanism. The greps that prove the superseded phrasings are gone:

```
$ grep -rn "severed but STABLE" packages/backend/src/store/
(no lines)
$ grep -rn "a query of a SINGLE segment" packages/backend/src/store/
(no lines)
```

## 3. WR-29 — THE CLASS RESTATED AGAINST THE BRANCH CONDITION

The condition is `q === -1 || amp <= q`: there is **no `&` inside the cut**. That is a statement about WHERE THE CUT LANDS — before the query's first `&` — and not about how many parameters the URL has. Both disclosures now say so; `observations.ts`:

```
 * WHAT THIS BRANCH LEAVES OPEN, stated against the CONDITION rather than against
 * the fixture that found it (WR-28, WR-29). … A three-parameter query with one
 * long first parameter is in this class exactly as a one-parameter query is; the
 * earlier disclosure scoped it to a query of one segment only, and that scoping
 * was too narrow.
```

The multi-segment case sweeps a **three**-parameter query and reads its offsets off the run:

```
n=2015 pass1 len 2048 tail "pppppppp?nnnnnnnnnnnnnnnn="
n=2015 pass2 len 2041 tail "ppppppppppppppp?<redacted>"
```

with `expect(multi.slice(-26)).toBe("pppppppp?nnnnnnnnnnnnnnnn=")` anchored on `multiUnstable[0]`, not on a literal.

## 4. `normaliseObservedUrl`'s BEHAVIOUR IS UNCHANGED

```
$ git diff ec2ecd3~1 ec2ecd3 -- packages/backend/src/store/observations.ts \
    | grep -E "^[+-]" | grep -vE "^[+-]{3}" | grep -cvE "^[+-] \*"
0
```

Zero changed lines that are not docblock comment lines. The residual is disclosed and pinned, **not closed** — closing it means dropping back to the last `/` or to the `?` and truncating an oversized path to its authority, the strictly larger decision `observations.ts` already declined with its reason written down.

## 5. MUTATION PROOFS — SIX, EACH EXECUTED SEPARATELY

Each was applied alone, observed RED by test title and assertion message, restored, and re-run green. Because the task content was committed first, the restore cross-check is a genuine `git diff --exit-code` against a committed tree.

### MA1 — the segment-boundary drop-back reverted to the one-line byte cut

```
MUTATION 1 APPLIED: segment-boundary drop-back reverted to the one-line byte cut
=== RED RUN — MUTATION 1 ===
 FAIL  observations.spec.ts > RESIDUALS this rule deliberately LEAVES … > CLOSED 2026-08-22 (IN-18, by WR-22): the URL_MAX cut no longer lands INSIDE a `<redacted>` marker …
AssertionError: expected 2048 to be 2039 // Object.is equality
 FAIL  observations.spec.ts > normaliseObservedUrl > IDEMPOTENT AT THE `URL_MAX` CUT: swept across parameter-name length, not hard-coded (WR-22)
AssertionError: normaliseObservedUrl is NOT a fixed point at 88 of 128 swept cuts:
 FAIL  observations.spec.ts > normaliseObservedUrl > the truncation drops a WHOLE trailing segment, never half of one, and never more than one (WR-22)
AssertionError: n=1 tail p133=<re: expected false to be true // Object.is equality
 FAIL  observations.spec.ts > normaliseObservedUrl > THE NO-SEPARATOR BRANCH: with no `&` inside the cut the byte cut STANDS, and the residual that lives there is SWEPT, not pinned at one chosen offset (WR-22/WR-28/WR-29)
AssertionError: the multi-segment unstable set is no longer one contiguous band: 1989 1990 2002 2003 2015 2016 2017 2018 2019 2020 2021 2022 2023 2024 2025 2026 2027 2028 2029 2030 2031: expected 43 to be 21 // Object.is equality
 Tests  4 failed | 181 passed (185)
```

Restore and re-run:

```
$ git checkout -- packages/backend/src/store/observations.ts
$ git diff --exit-code packages/ tests/ .planning/WINDOWS.md
GIT_DIFF_EXIT_CODE=0
 Test Files  1 passed (1)      Tests  185 passed (185)
```

The new contiguity assertion fires here on its own terms — the mutation scatters the multi-segment band into four fragments, and the message names them.

### MA2 — the sweep range narrowed to the single stable offset the old fixture chose

**This is the proof that the sweep is a search and not a hard-coded case wearing a loop.**

```
MUTATION 2 APPLIED: head-side sweep range narrowed from 71 offsets to the single stable offset 2010 the old fixture chose
=== RED RUN — MUTATION 2 ===
 FAIL  observations.spec.ts > normaliseObservedUrl > THE NO-SEPARATOR BRANCH: with no `&` inside the cut the byte cut STANDS, and the residual that lives there is SWEPT, not pinned at one chosen offset (WR-22/WR-28/WR-29)
AssertionError: the head-side residual is CLOSED across n=2010..2010. If that is deliberate, this case and the three disclosures naming it (this comment, schema.spec.ts's observations.url entry, observations.ts's no-separator paragraph) all have to change together.: expected 0 to be greater than 0
 Tests  1 failed | 184 passed (185)
```

```
$ git checkout -- packages/backend/src/store/observations.spec.ts
$ git diff --exit-code packages/ tests/ .planning/WINDOWS.md
GIT_DIFF_EXIT_CODE=0
 Test Files  1 passed (1)      Tests  185 passed (185)
```

### MB1 — both IN-26 binding-pattern reads deleted from the collector

```
MUTATION 3 APPLIED: both IN-26 binding-pattern reads removed from the collector
=== RED RUN — MUTATION 3 ===
 FAIL  outbound-prohibition.spec.ts > a receiver the walk cannot read is REPORTED, not dropped > through assembledNames' BINDING-PATTERN branches: the two DESTRUCTURE spellings of a declared assembly report — `const { k } = { k: "req" + "uests" }` and `const [k] = ["req" + "uests"]` — IN-26
AssertionError: expected [] to include 'outbound-unanalysable'
 Tests  1 failed | 209 passed (210)
```

```
$ git checkout -- packages/backend/src/outbound-prohibition.spec.ts
$ git diff --exit-code packages/ tests/ .planning/WINDOWS.md
GIT_DIFF_EXIT_CODE=0
 Test Files  1 passed (1)      Tests  210 passed (210)
```

### MB2 — the two alias sets behind the new transitivity assertions reverted

```
MUTATION 4 APPLIED: navigatorAliases and globalAliases grown from the ROOT ONLY — the one-hop bound the three deleted docblocks asserted
=== RED RUN — MUTATION 4 ===
 FAIL  … > outbound-beacon fires on a one-hop alias of navigator
AssertionError: expected [] to include 'outbound-beacon'
 FAIL  … > through navigatorAliases: A USE ABOVE ITS OWN BINDING REPORTS … CR-09 shape 6 of 7
AssertionError: expected [] to include 'outbound-beacon'
 FAIL  … > through navigatorAliases' TRANSITIVITY vs its negation: dependency-ordered chain REPORTS, one inverted link is A MEASURED SILENCE
AssertionError: expected [] to include 'outbound-beacon'
 FAIL  … > through globalAliases' TRANSITIVITY vs its negation: dependency-ordered chain REPORTS, one inverted link is A MEASURED SILENCE
AssertionError: expected [] to include 'outbound-dynamic-code'
 FAIL  … > through ALL FIVE ALIAS SETS' TRANSITIVITY: an alias CHAIN resolves to ANY depth when each link's DECLARATION follows the declaration it is grown from — MEASURED, and not what residual (a) used to say
AssertionError: expected [] to include 'outbound-beacon'
 Tests  5 failed | 205 passed (210)
```

```
$ git checkout -- packages/backend/src/outbound-prohibition.spec.ts
$ git diff --exit-code packages/ tests/ .planning/WINDOWS.md
GIT_DIFF_EXIT_CODE=0
 Test Files  1 passed (1)      Tests  210 passed (210)
```

**MEASURED DISCREPANCY, RECORDED (see §9):** the mutation was intended as "one hop" for both sets. It is one hop for `globalAliases` and **root-only** for `navigatorAliases`, because `navigatorAliases` is seeded with the root name (`const navigatorAliases = new Set<string>([NAVIGATOR])`, `:1696`) and the guard therefore blocked the first hop too. That is why `outbound-beacon fires on a one-hop alias of navigator` is in the RED list. The proof stands — the widened five-set case goes RED by title and message — but the mutation is described here as what it was, not as what it was designed to be.

### MC1 — `derivesFrom`'s member-call descent removed

The branch item 1's correction rests on.

```
MUTATION 5 APPLIED: derivesFrom no longer descends through a MEMBER call — the branch item 1's correction rests on
=== RED RUN — MUTATION 5 ===
 FAIL  error-redaction.spec.ts > the 8-shape STORE-07 probe from 01-VERIFICATION.md > previously MISSED — catch(e){ return e.toString(); } now reports
AssertionError: catch(e){ return e.toString(); } still reports clean: expected [] to not deeply equal []
 FAIL  error-redaction.spec.ts > CR-05's 10-shape executed table from 01-REVIEW.md > e.toString() now reports at least one violation
AssertionError: e.toString() still reports clean: expected [] to not deeply equal []
 FAIL  error-redaction.spec.ts > the gate follows the binding … > flags reach — a call ON a member, e.toString()
AssertionError: reach — a call ON a member, e.toString() reports clean: expected [] to not deeply equal []
 FAIL  error-redaction.spec.ts > the OPERATOR class of render … > CORRECTED BY EXECUTION (IN-25): the three METHOD renders residual item 1 called unseen all REPORT — `derivesFrom` follows a MEMBER call, so an unnamed method is TRANSPARENT
AssertionError: e.message.padEnd(10) should still report — if it stopped, narrow item 1 back and say so: expected [] to deeply equal [ 'unredacted-object-value' ]
 Tests  4 failed | 85 passed (89)
```

```
$ git checkout -- packages/backend/src/store/error-redaction.spec.ts
$ git diff --exit-code packages/ tests/ .planning/WINDOWS.md
GIT_DIFF_EXIT_CODE=0
 Test Files  1 passed (1)      Tests  89 passed (89)
```

### MC2 — `versionLiterals` widened past EXACTLY THREE components

This one does double duty: it proves the retitled case, and it demonstrates concretely why the two-component gap the new header sentence names is load-bearing rather than an oversight.

```
MUTATION 6 APPLIED: versionLiterals widened past EXACTLY THREE components — the bound the IN-24 header sentence says is unenforceable by construction
=== RED RUN — MUTATION 6 ===
 FAIL  pins.spec.ts > WR-21 … > names no THREE-COMPONENT version literal anywhere, COMMENTS INCLUDED — and a two-component spelling is outside the predicate BY CONSTRUCTION, see the header
AssertionError: scripts/phase1/tracer-e2e.sh names version literal(s) 127.0.0.1, 127.0.0.1, 0.25, 127.0.0.1, 127.0.0.1, 127.0.0.1. …: expected [ '127.0.0.1', '127.0.0.1', …(4) ] to deeply equal []
 FAIL  pins.spec.ts > WR-21 … > the predicate IGNORES the two shapes this script cannot do without: a four-component loopback address and a two-component interval
AssertionError: versionLiterals flagged a loopback address or a sleep interval as a version literal. …: expected [ '0.25', '127.0.0.1' ] to deeply equal []
 FAIL  pins.spec.ts > WR-21 … > the predicate DETECTS a literal planted into the REAL script's text — the load-bearing one
AssertionError: A 0.58.0 appended to the real text of scripts/phase1/tracer-e2e.sh was NOT returned by versionLiterals. …: expected [ '127.0.0.1', '127.0.0.1', …(5) ] to deeply equal [ '0.58.0' ]
 Tests  3 failed | 35 passed (38)
```

```
$ git checkout -- tests/pins.spec.ts
$ git diff --exit-code packages/ tests/ .planning/WINDOWS.md
GIT_DIFF_EXIT_CODE=0
 Test Files  1 passed (1)      Tests  38 passed (38)
```

## 6. MEASURED NON-EVIDENCE — the one fixture that stayed green under its own mutation

`through assembledNames' BINDING-PATTERN branches: the MUST-STAY-QUIET twins …` stayed **entirely GREEN** under MB1. That is correct and expected — every assertion in it is a silence, and deleting a branch cannot break a silence — but it means the case proves the branch does not OVER-report and proves nothing whatever about whether it reports at all. Rather than leave it looking like coverage, the finding was written into the case itself (commit `9a050bd`):

```
// MEASURED NON-EVIDENCE, RECORDED SO NOBODY CITES THIS CASE FOR THE BRANCH.
// Deleting both binding-pattern reads from the collector (mutation MB1,
// 2026-08-24) drives the POSITIVE case above RED and leaves this entire case
// GREEN. That is correct and expected — every assertion here is a silence,
// and removing a branch cannot break a silence — but it means this case
// proves the branch does not OVER-report and proves nothing whatever about
// whether it reports at all. The rule that caught it is plan 01-18's: a
// fixture that stays green under the mutation it sits beside is titled as
// non-evidence rather than left looking like coverage.
```

No other new case in this wave stayed green under the mutation it sits beside.

## 7. WR-30 — THE THREE DOCBLOCK STRINGS, EXECUTED BEFORE ANY EDIT

**These three ARE overclaims, and this summary says so plainly.** Each named a specific source string as silent; each reports:

```
isGlobalReceiverIn docblock  : const a = globalThis; const g = a; g.fetch(u)        -> ["outbound-fetch"]
globalAliases docblock       : const a = eval; const b = a; b(s)                    -> ["outbound-dynamic-code"]
residual (c)                 : const a = navigator; const n = a; n.sendBeacon(u,d)  -> ["outbound-beacon"]
```

The sharpest: `isGlobalReceiverIn`'s exact string is asserted to **report** by a passing test 1,800 lines below it in the same file. Both passed. They cannot both be true. That is not a widening of a self-declared-open enumeration — it is a residual list asserting something false, which is the heavier finding, and this wave does not understate it.

**The direction is safe** (the gate reaches further than those sentences said, so nothing was hidden), and that is the only mitigation claimed. A residual list is trusted for its completeness in **both** directions.

### The three replacements are POINTERS, not a fourth restatement

**(1) `isGlobalReceiverIn`**

```
 * HOW FAR AN ALIAS CHAIN REACHES IS STATED IN EXACTLY ONE PLACE — residual (a),
 * under `ALIASES DO NOT`. It is not restated here (WR-30). The sentence that
 * stood here bounded this function at one hop and named
 * `const a = globalThis; const g = a; g.fetch(u)` as silent; executed, that
 * string reports `outbound-fetch`, and a passing case further down this same
 * file asserts that it does. A bound restated in four docblocks is a bound that
 * drifts in three of them, which is what happened.
 *
 * The local fact, which IS about this function: the set it consults is grown
 * from the LIVE set during collect, so what this function answers depends on
 * what has been declared, never on where the answer is read.
```

**(2) `globalAliases`**

```
   * HOW FAR THIS MAP CHAINS IS STATED IN EXACTLY ONE PLACE — residual (a),
   * under `ALIASES DO NOT`. Not restated here (WR-30): the sentence that stood
   * here bounded this map at one hop and named `const a = eval; const b = a;
   * b(s)` as silent. Executed, it reports `outbound-dynamic-code`, at two hops
   * and at three.
   *
   * The local fact: this map is grown by consulting itself during the collect
   * pass, which is why it chains at all and why the ordering of the
   * DECLARATIONS — not of the uses — is what bounds it.
```

**(3) residual (c)**

```
//      (c) `navigator` RETURNED BY A HELPER is outside the beacon rule, for the
//          same reason as (a)'s function-boundary half.
//          CORRECTED 2026-08-24 (WR-30). This item used to also exempt
//          `navigator` reached through MORE THAN ONE HOP, and pointed at (a) for
//          the reason — but (a) was split in two on 2026-08-24 and its ALIAS half
//          says the opposite: `navigatorAliases` is grown from the live set and
//          chains to any depth. Executed: `const a = navigator; const b = a;
//          b.sendBeacon(u, d)` reports `outbound-beacon`, and so does the
//          three-hop spelling. The hop clause is DELETED, not softened, and the
//          depth question is answered in (a) and nowhere else.
```

### The FOURTH identical sentence survives, and why

```
$ grep -c "ONE HOP AND NO MORE" packages/backend/src/outbound-prohibition.spec.ts
1
$ grep -n "ONE HOP AND NO MORE" packages/backend/src/outbound-prohibition.spec.ts
1732:   * ONE HOP AND NO MORE, exactly like `constStrings`: `const a = "req" + "uests";
```

Line 1732 is inside the **`assembledNames`** docblock. It is **correct**: keys read the INITIALIZER'S SHAPE and never the live set, so they cannot chain. Executed:

```
assembledNames docblock (the CORRECT one): const a = "req"+"uests"; const b = a; sdk[b].send(req) -> []
```

**That it is true there is precisely why the other three read as true to a skimming reader.** The surviving sentence is now explicitly marked as the one place the one-hop bound is stated, so a later author cleaning up "the stale ones" does not delete the correct one with them:

```
   * THIS SENTENCE IS THE ONE PLACE THAT ONE-HOP BOUND IS STILL STATED, and it
   * is stated here because it is TRUE HERE and nowhere else: this collector
   * reads the INITIALIZER'S SHAPE and never the live set, so it cannot chain.
   * Three sibling docblocks carried the identical sentence about ALIAS sets,
   * which are grown from the live set and do chain to any depth; all three were
   * deleted on 2026-08-24 (WR-30) after being executed and found to report.
   * That they read as true to a skimmer is precisely because THIS one is.
```

### The contradiction, resolved with both locations named

`isGlobalReceiverIn`'s docblock (`~:1476` before the edit) asserted `const a = globalThis; const g = a; g.fetch(u)` **silent**. The passing case at `~:2782` asserts that exact string **reports** `outbound-fetch`. The docblock no longer makes the claim; the test is unchanged and still passes. The two no longer disagree.

### The transitivity case at full width

Added to the consolidated case, with the two shapes whose stale docblocks this wave deleted:

```ts
expect(
  rulesOf("const a = navigator;\nconst b = a;\nb.sendBeacon(u, d);"),
).toContain("outbound-beacon");
expect(
  rulesOf("const a = navigator;\nconst b = a;\nconst c = b;\nc.sendBeacon(u, d);"),
).toContain("outbound-beacon");
expect(rulesOf('const a = eval;\nconst b = a;\nb("x");')).toContain(
  "outbound-dynamic-code",
);
expect(
  rulesOf('const a = eval;\nconst b = a;\nconst c = b;\nc("x");'),
).toContain("outbound-dynamic-code");
```

Title retitled from `through globalThisAliases' TRANSITIVITY` to `through ALL FIVE ALIAS SETS' TRANSITIVITY`.

**MEASURED DISCREPANCY, RECORDED (see §9):** the review said these two sets were the ones the case "does not cover". Measured, they were **not uncovered** — `through navigatorAliases' TRANSITIVITY vs its negation` and `through globalAliases' TRANSITIVITY vs its negation` already assert both chaining at two hops, in their own describes. What this wave adds is (i) all five in ONE place, which is where residual (a) sends a reader, and (ii) THREE hops, where those two siblings stop at two. So this is a **consolidation and a depth widening, not the closure of a hole** — and that sentence is written into the case body, not only here.

## 8. IN-26 — THE LAST UNCOLLECTED DECLARATION SPELLING

### Before

```
object pattern : const { k } = { k: "req"+"uests" }; sdk[k].send(req) -> []
array pattern  : const [k] = ["req"+"uests"]; sdk[k].send(req)        -> []
```

### After

```
object pattern  : const { k } = { k: "req"+"uests" }; sdk[k].send(req)   -> ["outbound-unanalysable"]
renamed key     : const { p: k } = { p: "req"+"uests" }; sdk[k].send(req) -> ["outbound-unanalysable"]
array pattern   : const [k] = ["req"+"uests"]; sdk[k].send(req)          -> ["outbound-unanalysable"]
array 2nd slot  : const [x, k] = ["a", "req"+"uests"]; sdk[k].send(req)  -> ["outbound-unanalysable"]
```

The collector's assembled-name write ran only under `ts.isIdentifier(node.name)` while the **receiver** branch directly beside it already read an object binding pattern. Both are declarations, and the header two hundred lines up says an assembly is read "through EITHER a declaration or an assignment". The fix reuses the existing `boundPropertyName` helper through a new narrow `destructuredInitializer`, which resolves only against an object or array **literal** written in the initializer position — the only place the assembly's shape still exists.

### The must-stay-quiet twins, measured in the same commit

```
ORDINARY twin A : const { a, b } = { a: "x", b: "y" }; sdk[a][b](req)  -> []
ORDINARY twin B : const [a, b] = ["x", "y"]; o[a][b]                   -> []
numeric guard   : const [k] = [1 + 1]; segments[k]                     -> []
rest element    : const [...k] = ["req"+"uests"]; sdk[k].send(req)     -> []
crossing bound  : const { k } = someObject; sdk[k].send(req)           -> []
```

### A NEW open shape, named by measurement rather than by review — residual (b2)

```
constStrings sib: const { k } = { k: "requests" }; sdk[k].send(req)    -> []
```

A destructured **plain literal** is `constStrings`' territory, and `constStrings` reads only the identifier spelling of the same declaration that `assembledNames` now reads three ways. This was **not** predicted by IN-26 or by the plan — it was found by measuring the result of the fix. It is disclosed as residual (b2) in the gate header and pinned as a MEASURED SILENCE, **not silently folded in**: widening `constStrings` through binding patterns is a separate decision that needs its own real-tree measurement, and a wave that closes a shape while quietly opening its sibling is exactly the omission the wave-25 paragraph exists to stop.

### Real-tree run, zero, with the exempt sites confirmed quiet by name

```
REAL TREE: roots=packages/backend/src + packages/engine/src files=23 violations=0
REAL TREE detail: []
EXEMPT-SITE HOST packages/backend/src/compat.ts: 0 violations
EXEMPT-SITE HOST packages/backend/src/store/observations.ts: 0 violations
compat.ts cur[key] present=false  ctx[root] present=true
observations.ts segments[i] present=true
MIGRATIONS[MIGRATIONS.length - 1] present in 1 file(s)
```

**MEASURED DISCREPANCY, RECORDED (see §9):** the plan named `compat.ts`'s `cur[key]` as one of four exempt sites. The literal string is not in the file. The site is real and is the same site — `at()`'s `for…of` key at `compat.ts:133`, written `(cur as Record<string, unknown>)[key]`. All four sites are present and quiet; the plan's prose carried a pre-cast spelling.

## 9. WHERE THE PLAN'S PREDICTIONS DID NOT SURVIVE MEASUREMENT

| Prediction | What was measured | Recorded in |
|---|---|---|
| The transitivity case leaves `navigatorAliases` and `globalAliases` uncovered | Both are already covered at two hops by sibling cases. The addition is a consolidation plus a depth widening. | §7, and the case body itself |
| MB2 reverts both sets "to a single hop" | One hop for `globalAliases`; **root-only** for `navigatorAliases`, because it is seeded with the root name at `:1696`. | §5 (MB2) |
| `compat.ts`'s exempt site is spelled `cur[key]` | Spelled `(cur as Record<string, unknown>)[key]` at `:133`. Same site, present, quiet. | §8 |
| IN-25 narrows item 3 in one place (the object literal) | It narrows in **two**: the object-literal route AND the plain-`+` accumulator both report. | §10 |
| IN-26 is one shape | Three shapes with three different answers: two closed, one is residual (a) unchanged, one is newly-named residual (b2). | §8, ledger entry 31 |

None of these was absorbed into the prose as if it had been expected.

## 10. IN-25 — ALL FIVE SHAPES RE-EXECUTED, NOT CITED

Run through this file's own `auditSource`:

```
ITEM 1 padEnd  : ["unredacted-object-value"]
ITEM 1 repeat  : ["unredacted-object-value"]
ITEM 1 replace : ["unredacted-object-value"]
ITEM 2 fmt(e)  : []
ITEM 3 objlit  : ["unredacted-object-value"]
ITEM 3 arrlit  : []
ITEM 3 comma   : []
ITEM 4 push    : []
ITEM 5 order   : []
CONTROL direct : ["unredacted-object-value"]
CONTROL safe   : []
```

and, run separately for item 3's remaining halves:

```
await          : []
accumulator +  : ["unredacted-concat"]
accumulator += : ["unredacted-concat"]
array join     : []
object direct  : ["unredacted-object-value"]
method chain   : ["unredacted-object-value"]
```

**Two report and two stay silent, identified by shape.** Item 1's three method renders report (and so does a two-method chain); item 3's object-literal route and plain-`+` accumulator report. Item 2's bare-identifier callee, and item 3's comma expression, `await` and array literal (both `a[0]` and `a.join("")`), stay silent.

### The corrected items

```
//          1. WITHDRAWN 2026-08-24 (IN-25), BY EXECUTION. This item said a
//             render through a method the list does not name — `padEnd`,
//             `repeat`, `replace` — is unseen. Executed through this file's own
//             `auditSource`, all three REPORT `unredacted-object-value`, and so
//             does a chain of two of them. The mechanism: `derivesFrom` follows
//             a call whose callee is a MEMBER, so an unnamed method is
//             TRANSPARENT rather than opaque, and the render-form list is not
//             the bound this item took it to be. Nothing is open here. Asserted
//             in the FIRING direction below rather than deleted, so the day the
//             member-call descent is narrowed, a test says so.
```

```
//          3. NARROWED 2026-08-24 (IN-25), BY EXECUTION, and it was narrowed in
//             two places rather than the one the review named. What remains
//             open, each measured `[]`: a COMMA EXPRESSION (`(0, e.message)`),
//             an `await` (`await p(e.message)`), and a value routed through an
//             ARRAY literal (`const a = [e.message]; a[0]`, and its `.join("")`
//             twin).
//             WHAT WAS WRONG, both halves stated because both were overstated:
//             (i) a value routed through an OBJECT literal REPORTS — the
//             object-literal value is itself one of the two guarded POSITIONS,
//             so `const o = { m: e.message }; o.m` and the direct
//             `{ error: { m: e.message } }` both fire; (ii) "an accumulator
//             that is neither a `+=` nor a `.push`" REPORTS — `let s = "";
//             s = s + e.message` fires `unredacted-concat` through the plain
//             `+`. Both are asserted in the firing direction below.
```

**The genuinely open halves are kept and named:** item 2's bare-identifier helper callee, and item 3's array literal (plus the comma expression and the `await` the same clause carried).

### The method finding, in one sentence

The enumeration was read off the **BRANCHES** of `derivesFrom` — the right method, and why items 2, 4 and 5 are right — and the missing step was **crossing that enumeration with the POSITION rules and the OPERATOR rules**, which catch some of the branches' blind spots anyway. A residual overstated is the same failure mode as one understated, in a paragraph whose subject is exactly that.

### The PINNED decision paragraph, now level with the items beneath it

```
//        PINNED, AND THE DECISION IS RECORDED RATHER THAN LEFT IMPLICIT.
//        RE-DECIDED 2026-08-24 (IN-25, WR-31) so the split described here
//        matches the items above it.
//          Items 4 and 5 are pinned by executed cases titled "RESIDUAL, PINNED
//          (IN-22)" below, which assert those two shapes report `[]` TODAY and
//          therefore go RED the day somebody closes one. …
//          Item 1 and the two overstated halves of item 3 are pinned in the
//          FIRING direction by "CORRECTED BY EXECUTION (IN-25)" below. They
//          became pinnable by being measured: a shape that REPORTS is one
//          assertion, not an open class, and asserting it is what stops the
//          correction drifting back.
//          Item 2 and the three surviving halves of item 3 are still NOT
//          pinned, and that is the other half of the decision: each names an
//          open CLASS rather than one shape …
```

There is no longer a three-two split described where the items do not have one.

## 11. WR-31 — THE ANTECEDENT NAMED

```
$ grep -rn "everything on it is executed below" packages/backend/src/store/
(no lines)
```

**The fix chosen was to NAME the antecedent, not to move the sentence** — and the choice is stated because both were available:

```
//        THE RENDER-FORM LIST eighty lines above — not the five-item residual
//        immediately above, which is three-fifths unpinned by the decision just
//        stated — is an ENUMERATION and it does not claim to be closed; what it
//        claims is that every render form ON THAT LIST is executed below.
//        ANTECEDENT NAMED 2026-08-24 (WR-31). This sentence is byte-identical
//        to what it was before round 4 and it was written about the render-form
//        list; what changed is what it terminates. Round 4 inserted the
//        explicit "deliberately NOT pinned" statement two lines above it, which
//        turned a nearest-antecedent ambiguity into a self-contradiction — in a
//        paragraph whose entire subject is that residual lists must be trusted
//        for their completeness. Naming the antecedent was the whole fix.
```

Naming it in place is the stronger of the two options because a later insertion cannot re-create the ambiguity the way moving the sentence would leave open.

## 12. THE TWO PINS RESOLUTIONS

### IN-23 — the `export` is GONE, not merely unjustified

**Chosen resolution: drop the `export`.** The lift-out is the fix and it is a real one; the keyword was never part of it, and the docblock conceded the counterexample two sentences earlier by recording that the sibling gate keeps its predicate module-local and runs its failing path in its own file. Confirmed no external importer before removing it.

```
 * NOT EXPORTED — CORRECTED 2026-08-24 (IN-23). Until this date the docblock said the
 * function was "EXPORTED so its FAILING path can be executed", and that was two
 * unconnected things stated as one. The only caller and all four fixtures are in THIS
 * module, where a module-local function is equally executable; the paragraph conceded
 * the counterexample itself two sentences up … The LIFT-OUT is the fix and it is a real
 * one. The `export` keyword was never part of it, so it is gone rather than merely
 * unjustified.
```

`pnpm knip` exits **0**.

### IN-24 — the two-component limit stated in the header, beside the fixture that creates it

```
// WHAT THAT RULE THEREFORE CANNOT SEE, AND MUST NOT (IN-24, stated 2026-08-24 beside
// the justification that creates it). A TWO-COMPONENT spelling of the same claim —
// `# taken on Caido 0.58` — is a version literal in prose and is PERMANENTLY invisible
// to this predicate, because the fixture below requires `0.25` to pass and `0.25` is
// the sleep interval the tracer cannot do without. The gap is not an oversight to be
// closed later; it is the price of the exemption, and it is paid deliberately. The
// header stated the three-component rule and left a reader to derive this consequence,
// which is how a limit becomes the thing everybody assumes away.
```

Case title, brought level with what the predicate can see:

```
it("names no THREE-COMPONENT version literal anywhere, COMMENTS INCLUDED — and a two-component spelling is outside the predicate BY CONSTRUCTION, see the header", …)
```

MC2 above demonstrates the price concretely: widening the predicate to catch `0.58` also catches `0.25` and every `127.0.0.1`.

## 13. `WINDOWS.md` — THREE ENTRIES RECONCILED THROUGH THE TOOL, NEVER HAND-EDITED

### Entry 19 → 29

```
$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows fixed 19
ok=true   (open_count 19 -> 18, fixed_count 9 -> 10)
$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows append --kind deviation --phase 01 \
    --file packages/backend/src/store/observations.ts --description "RESIDUAL, PINNED BY SWEEPS (supersedes entry 19, whose stated job — truncate on an & boundary — plan 01-20 did). …"
ok=true   entry 29 appended
```

Entry 19's description named its job as "truncate on an `&` boundary" — a job plan 01-20 already did. Entry 29 carries the measured residual: the two shapes, the mechanism, `head-side n=1975..2045, 71 offsets, 11 unstable (2019-2029)`, `three-parameter query, same range, 71 offsets, 17 unstable (2015-2031)`, `ZERO secret survivals at either pass at every one of those 142 offsets`, and the reason the repair is declined.

### Entry 24 → 30

```
$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows fixed 24
exit=0    entry 24 -> fixed | resolved_at 2026-08-24T12:59:19.549Z
$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows append --kind deviation --phase 01 \
    --file packages/backend/src/store/error-redaction.spec.ts --description "SUPERSEDES ENTRY 24, whose description … is false about two of the three after IN-25 was re-executed …"
ok=true   open 19  fixed 11  total 30   appended id: 30
```

Entry 24 said items 1-3 are "disclosed and deliberately UNPINNED — no assertion goes red if one is closed". After this wave that is false about at least one: item 1 and two halves of item 3 are pinned in the firing direction, and the four open halves are pinned as measured silences, so a closure **or** a regression on any of them now moves a test.

### Entry 28 → 31, authored once and rendered into both surfaces

```
$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows fixed 28
exit=0
$ node ~/.claude/gsd-core/bin/gsd-tools.cjs windows append --kind deviation --phase 01 \
    --file packages/backend/src/outbound-prohibition.spec.ts --description "$(cat canon26.txt)"
exit ok; open 19  fixed 12  total 31   appended id: 31
```

Identity check, the same discipline plan 01-25 used:

```
canonical text length: 5808
canon in WINDOWS entry 31 : True
canon in GATE HEADER      : True
```

The first render disagreed by exactly one space, and it is recorded rather than quietly fixed: `textwrap` broke `must-stay-quiet` at a hyphen, so unwrapping reinserted a space. Re-rendered with `break_on_hyphens=False`; the diff is now empty.

### `windows status` afterwards — exactly one open entry on the gate file

```
open 19  waived 0  fixed 12  total 31
OPEN entries on outbound-prohibition.spec.ts: 1 [31]
packages/backend/src/store/error-redaction.spec.ts -> open ids [14, 30]
packages/backend/src/store/observations.ts -> open ids [11, 29]
```

`.planning/WINDOWS.md` was not hand-edited at any point: every mutation went through `gsd-tools windows fixed` / `append`, and its diff carries the frontmatter counters and the JSON block updated together.

## 14. WHY `REQUIREMENTS.md` AND `STATE.md` ARE DELIBERATELY UNTOUCHED

Both carry an authored residual; wave 27 derives the replacement text and wave 28 reconciles both requirement-tier ledgers to it in ONE move, so another hand-authored copy here would only be another place the next drift can start. CORE-11's box stays `[ ]`.

```
$ git diff --exit-code .planning/REQUIREMENTS.md .planning/STATE.md
REQ/STATE_DIFF_EXIT=0
```

## 15. FINAL GATE RESULTS

```
$ pnpm test --reporter=dot
 Test Files  31 passed (31)
      Tests  1148 passed (1148)

$ pnpm typecheck   -> exit 0
$ pnpm lint        -> exit 0
$ pnpm knip        -> exit 0

$ pnpm build:backend && pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto

$ git status --porcelain packages/ tests/
(empty)
```

Baseline entering this wave was 31 files / 1143 tests; leaving it, 31 files / **1148** tests. Five net new cases, no file count change.

### Untouched artifacts, verified

```
$ git diff --exit-code .planning/phases/…/01-VERIFICATION.md …/01-REVIEW.md …/01-UAT.md
ARTIFACTS_DIFF_EXIT=0
$ for i in 01..25: git diff --quiet 01-$i-PLAN.md
(no MODIFIED lines — all 25 plans clean)
```

## Files Created/Modified

- `packages/backend/src/store/observations.spec.ts` — head-side pin replaced by a sweep; multi-segment sweep added; zero-leak asserted at both passes at every offset
- `packages/backend/src/store/observations.ts` — no-separator paragraph restated against the branch condition (**comment-only diff, 0 non-comment lines**)
- `packages/backend/src/store/schema.spec.ts` — the `observations.url` OPEN list restated against the branch condition
- `packages/backend/src/outbound-prohibition.spec.ts` — three stale bounds → pointers; transitivity at five sets / three hops; IN-26 collector branches + `destructuredInitializer`; IN-26 fixtures and twins; residual (b2); the wave-26 narrowing block
- `packages/backend/src/store/error-redaction.spec.ts` — WR-31 antecedent; items 1 and 3 corrected; PINNED paragraph rewritten; firing-direction and still-open cases added
- `tests/pins.spec.ts` — `export` removed from `versionLiterals`; two-component limit stated; case title corrected
- `.planning/WINDOWS.md` — entries 19, 24, 28 closed; 29, 30, 31 appended (tool-owned)

## Decisions Made

1. **Assert the instability's SHAPE, never the band.** A fixture carrying `2019` and `2029` would reproduce WR-28 one layer up.
2. **Keep n=2010 as the stable exemplar** rather than deleting it — it records why the single-offset pin passed.
3. **Behaviour unchanged.** The residual is disclosed and pinned, not closed; closing it is a strictly larger retention decision this round has no mandate for.
4. **Pointers, not a fourth restatement.** A pointer cannot drift because there is nothing in it to drift from.
5. **Delete the `export`, not the sentence** (IN-23).
6. **Name the antecedent in place** (WR-31).
7. **Disclose residual (b2) rather than fold it in.** Widening `constStrings` through binding patterns needs its own real-tree measurement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Two banned phrases reintroduced by my own corrected prose**

- **Found during:** Task 1
- **Issue:** My replacement comments quoted the superseded wordings (`"severed but STABLE"`, `"a query of a SINGLE segment"`) while explaining what they used to say — which would have failed the plan's own greps.
- **Fix:** Rephrased both to describe the superseded claim without spelling it (`severed-but-stable`, `scoped to a query of one segment only`).
- **Verification:** both greps return no lines.
- **Committed in:** `ec2ecd3`

**2. [Rule 3 - Blocker] `npx` is unusable in this repo**

- **Found during:** Task 1
- **Issue:** `npx prettier` / `npx eslint` fail with `EBADDEVENGINES` (the repo pins pnpm ^11.22.0), so a formatting pass appeared to succeed while doing nothing.
- **Fix:** Used `pnpm exec` throughout.
- **Verification:** `pnpm lint` exits 0.
- **Committed in:** `ec2ecd3`

**3. [Rule 1 - Bug] `git checkout --` on an uncommitted file destroyed prior task work**

- **Found during:** Task 1, restoring mutation MA1
- **Issue:** The docblock edits to `observations.ts` had not been committed when the mutation was restored, so `git checkout --` reverted them too.
- **Fix:** Re-applied the docblock, then changed the working order: **commit the task's real content first, mutate second.** Every subsequent mutation proof therefore has a genuine `git diff --exit-code` restore check.
- **Verification:** MA2, MB1, MB2, MC1, MC2 all show `GIT_DIFF_EXIT_CODE=0` after restore.
- **Committed in:** `ec2ecd3`

**4. [Rule 2 - Missing disclosure] Residual (b2) added**

- **Found during:** Task 2, measuring the result of closing IN-26
- **Issue:** Closing IN-26 for the assembly spellings surfaced that `constStrings` reads only the identifier spelling of the same declaration — an open shape no review named.
- **Fix:** Disclosed as residual (b2) in the gate header, pinned as a MEASURED SILENCE, and carried into ledger entry 31. Deliberately **not** closed.
- **Committed in:** `b0b0f92`

**5. [Rule 2 - Missing disclosure] The IN-26 twin case titled as measured non-evidence**

- **Found during:** Task 2, mutation MB1
- **Issue:** The must-stay-quiet twin case stayed entirely green under the mutation it sits beside, so it read as coverage for a branch it says nothing about.
- **Fix:** Recorded in the case body per plan 01-18's rule.
- **Committed in:** `9a050bd`

---

**Total deviations:** 5 auto-fixed (3× Rule 3/1 blockers and bugs, 2× Rule 2 missing disclosure).
**Impact on plan:** No scope creep. Deviations 4 and 5 add disclosure, not behaviour; deviations 1-3 were process corrections that made the evidence honest rather than changing what was built.

## Issues Encountered

**One acceptance criterion is satisfied differently from its literal wording, and it is named rather than absorbed.** The plan's `git diff --exit-code` restore check is written as a bare command. `.planning/config.json` carries a pre-existing uncommitted modification that predates this plan (present in the starting `git status`), so a bare `git diff --exit-code` returns 1 for a reason unrelated to any mutation. Every restore check in §5 is therefore scoped: `git diff --exit-code packages/ tests/ .planning/WINDOWS.md`. That is the set this plan touches, and it returned 0 after every one of the six restores.

Nothing else. No task was left incomplete, no acceptance criterion was skipped, and no `<verify>` block went unrun.

## User Setup Required

None — no external service configuration.

## Next Phase Readiness

**Ready for 01-27.** That wave owns the derivation that replaces the authored residual text — now named as the owner in the gate header, in ledger entry 31, and here. This wave closed six disclosure defects and one collector gap; it did **not** close the class that produces them, which is an authored bound nobody re-derives, and that is now the eighth consecutive round.

Carried forward, each with an owner or with the explicit fact that nothing owns it:

- **Wave 27** — the derivation replacing the authored residual.
- **Wave 28** — reconciling `REQUIREMENTS.md` and `STATE.md` to the derived text and flipping CORE-11's box, and only against that text.
- **OPEN AND UNOWNED** — the operator around a global receiver (`(ok && globalThis).fetch(url)` and five twins), unchanged by this wave, disclosed by 01-25 and carried in ledger entry 31.
- **OPEN, newly named** — residual (b2), the destructured plain literal.
- **OPEN, disclosed not closed** — the head-side and multi-segment no-separator instabilities, ledger entry 29.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-24*

## Self-Check: PASSED

All seven modified files exist on disk. All six commits are present in
`git log --all`. `pnpm test` re-run after the metadata close-out: 31 files /
1148 tests, zero failures. `git status --porcelain packages/ tests/ .planning/`
shows only `.planning/config.json`, a pre-existing modification that predates
this plan and is not mine — no uncommitted work from this wave remains.

`REQUIREMENTS.md` is byte-clean, which the plan requires: `STORE-03` and
`STORE-07` were already `[x]` from earlier waves, and `CORE-11` is correctly
BLOCKED by the shared-ID gate (`requirements.ready-ids` → `blocked: [CORE-11]`,
because a sibling plan declares it and has no SUMMARY yet). That gate's answer
and this plan's own instruction — CORE-11's box stays `[ ]`, wave 28 owns the
flip and only against the derived text — agree.
