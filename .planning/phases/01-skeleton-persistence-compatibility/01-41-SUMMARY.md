---
phase: 01-skeleton-persistence-compatibility
plan: 41
subsystem: testing
tags: [outbound-gate, exclusion-width, closingBracketAfter, WR-54, WR-50, WINDOWS-41, vitest]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "wave 39's strictly-above anchor scan and uniqueness census, wave 40's sentinel exclusion by reference and the counter-probe pinned to the live builder's line half, and wave 37's corrected `CLOSES_FROZEN_ARRAY`"
provides:
  - "a named case pinning `closingBracketAfter(registryStart)` and `closingBracketAfter(listStart)` to the lines their constructs actually close on, each locator proved to match exactly ONE line before it is used"
  - "`EXCLUSIONS[1]` and `EXCLUSIONS[2]` `.from` and `.to` pinned too, because the exclusion's realized value — not the helper — is what shapes the scanned surface"
  - "verification pass 9's own revert planted and observed RED at 1 failed / 438 passed, where it stayed GREEN at 434 of 434 before this plan, with the 117-line gap printed in the assertion message"
  - "a closing sentence that names why the `proof` token, the band and the clause-count equality each fail in the over-walk direction, names the new assertion as what holds the resolution, and states that reach and no wider"
  - "IN-38's two unstated recogniser constraints named concretely without widening what the recogniser matches"
  - "the two unmarked present-tense box-state statements swept by wave-33 pointer-not-a-bound deletion, the false owner clause gone from both"
  - "a replacement for the count claim that states NO number and names the two surfaces this file cannot see"
  - "the round's closing baseline executed in this session and reconciled against arrival"
affects: [phase-01 verification pass 10]

actuals:
  tokens: 4027
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a range whose width matters is pinned to a LOCATED LINE, never to a size — a size pin goes green again the day the construct legitimately grows, which is the same silence the width pin exists to break"
    - "a locator that cannot be unique (a bare `]);`) is replaced by one derived from the construct's own LIVE CONTENTS, with the literals rebuilt by `JSON.stringify` at runtime so the measuring pin adds nothing to the surface it measures"
    - "a negative gate is never spelled as the string it forbids — the corrective prose must not re-spell the attribution in order to deny it, or the sweep re-arms the defect it removed"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts

key-decisions:
  - "Both `closingBracketAfter` resolutions are pinned in the verifier's DIRECT form (`toBe(<located line>)`) rather than by pinning the size, because a size pin goes green again the day a construct legitimately grows and the defect being closed is precisely a width that moved with nothing noticing."
  - "The quantifier list cannot be located by its own closing text — a bare `]);` matches 14 lines of this file, measured — so it is located by its own live entries: each of the nine `UNBOUNDED_QUANTIFIERS` entries proved to occupy exactly one line, the close pinned to the line after the last of them."
  - "BRANCH A (wave-33 pointer-not-a-bound deletion) taken for both statements. P38-D1 was read as FORBIDDING alteration of marked bytes, which makes Branch B unavailable for these two — its plain form would leave the false owner clause standing inside the marked span."
  - "The count claim's replacement states NO number at all. Stating the measured number would have required a form that either counts surfaces this file cannot see or reads as a fresh assertion about the box; the pointer-that-asserts-nothing form is the one wave 33 took for this exact class and it is the only form that cannot commit the defect being corrected."
  - "`:801` and `:903`'s ledger-reconciliation clauses are LEFT STANDING and `:944`/`:955` are LEFT STANDING, each by name and with a reason — none of them states a box state and none attributes the change; sweeping them would have been scope this plan was not given."

patterns-established:
  - "Pattern: the census that decides a sweep's completeness is run CASE-INSENSITIVELY as well as case-sensitively, because a capitalised sentence opener is invisible to the case-sensitive floor — that is how `:955` was found."

requirements-completed: []

coverage:
  - id: D1
    description: "Exclusion three's resolved end is pinned to the line RESOLVER_REGISTRY actually closes on, located by its own text and proved unique before use"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#both `closingBracketAfter` resolutions land on their OWN construct's closing line — the WIDTH is pinned, not merely banded"
        status: pass
      - kind: other
        ref: "planted mutation: CLOSES_FROZEN_ARRAY reverted to /^\\]\\);$/ (verification pass 9's own revert, GREEN at 434/434 before this plan) — observed RED, 1 failed | 438 passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "Exclusion two's resolved end is pinned to the line after UNBOUNDED_QUANTIFIERS' last live entry, each entry locator proved unique"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#both `closingBracketAfter` resolutions land on their OWN construct's closing line — the WIDTH is pinned, not merely banded"
        status: pass
    human_judgment: false
  - id: D3
    description: "The closing sentence names why the `proof` token, the band and the clause-count equality each fail in the over-walk direction, and names what holds the resolution with that reach and no wider"
    verification: []
    human_judgment: true
    rationale: "Whether a corrected disclosure overclaims is exactly the judgment ten consecutive verification passes have had to make by reading. No assertion can decide it. Verification pass 10 must read the quoted replacement below against the three measurements pasted beside it, and in particular must decide whether the `THAT REACH AND NO WIDER` paragraph carries its bound INSIDE the claiming clause."
  - id: D4
    description: "The two unmarked present-tense box-state statements are swept and the false owner clause is gone from both"
    verification:
      - kind: other
        ref: "newline-normalised span count over the wave number and the flip clause: 1 at arrival (RED before the work) -> 0 after"
        status: pass
      - kind: other
        ref: "header-region `wave 28` mentions 4 -> 3, strictly below the precondition-captured value re-derived from the tree at the recorded base; body-region 3 -> 3 unchanged"
        status: pass
    human_judgment: false
  - id: D5
    description: "The count claim is replaced by a form true at the reach of a pasted grep, naming the surfaces this file cannot see, and the sweep created no new site"
    verification:
      - kind: other
        ref: "grep -c 'EXACTLY TWO PLACES' -> 0; post-sweep box-state census over this file -> ONE site (CORE11_BOX_EXPECTED)"
        status: pass
    human_judgment: true
    rationale: "Whether the replacement clause states a count wider than the grep that produced it is a reading judgment, not an assertion. The number is absent by construction, which removes the mechanical failure mode; whether the prose around it implies one is for pass 10."
  - id: D6
    description: "CORE-11's must-NOT did not move and nothing leaks, for the whole of round 9"
    requirement: "CORE-11"
    verification:
      - kind: integration
        ref: "pnpm test — 31 files / 1379 tests, exit 0"
        status: pass
      - kind: other
        ref: "git diff --name-only bc0f4c2..HEAD -- packages/ scripts/ filtered of .spec.ts — 0 files, for the WHOLE round"
        status: pass
      - kind: other
        ref: "pnpm build:backend && pnpm check:bundle — 1 import specifier, crypto"
        status: pass
      - kind: other
        ref: "CORE-11's ledger row diffed against the round base bc0f4c2 — byte-identical"
        status: pass
    human_judgment: false

duration: 15 min
completed: 2026-08-26
status: complete
---

# Phase 01 Plan 41: The width pinned, the sentence corrected, and round 8's disclosure repaired Summary

**Verification pass 9's own revert — which re-introduced WR-48's exact 117-line over-walk and stayed GREEN at 434 of 434 — now turns the suite RED with `expected 5884 to be 5767` in its message; the sentence that named three mechanisms holding that width names the measurement refuting each and the assertion that actually holds it; and round 8's two unmarked box-state statements are gone from their own bytes with the false owner clause removed and the count claim above them replaced by a form that states no number.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-26T14:39:00Z
- **Completed:** 2026-08-26T14:53:36Z
- **Tasks:** 2
- **Files modified:** 1

## Task Commits

1. **Task 1: WR-54 + WR-50 — both resolutions pinned, the revert watched RED, the closing sentence replaced** — `f338db1` (test)
2. **Task 2: WINDOWS 41 — the two statements swept, the count claim replaced, the round's baseline re-measured** — `0238fc4` (docs)

---

## Task 1 precondition, pasted before the first edit

```
$ git rev-parse HEAD
43b65c6af412860235301d4202ae880a083f4e19

$ git status --porcelain packages/ scripts/
(empty — count 0)

$ ls 01-39-SUMMARY.md 01-40-SUMMARY.md
-rw-r--r--  75598 26 Aug 15:58  01-39-SUMMARY.md
-rw-r--r--  60529 26 Aug 16:28  01-40-SUMMARY.md      <- both prior plans' SUMMARYs present

$ pnpm exec vitest run packages/backend/src/outbound-prohibition.spec.ts | tail
      Tests  438 passed (438)                          <- plan 01-40's recorded count
GATE-EXIT=0

$ pnpm test
 Test Files  31 passed (31)
      Tests  1378 passed (1378)
TEST-EXIT=0

$ pnpm typecheck   -> tsc --build,  exit 0
$ pnpm lint        -> eslint .,     exit 0
$ pnpm knip        -> knip,         exit 0
$ pnpm build:backend && pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto

$ git status --porcelain .planning/
 M .planning/config.json
?? .planning/milestone.lock
?? .planning/phases/00-runtime-reality-check/00-VERIFICATION.md
?? .planning/phases/00-runtime-reality-check/results/runs/recorder-20260820T180307Z/
?? .planning/phases/01-skeleton-persistence-compatibility/results/runs/20260821T075936Z-12874/
        ^ ALL FIVE PRE-EXISTING AT ARRIVAL, identical to the set plan 01-40
          recorded. Snapshotted to /tmp/gsd-0141-planning-arrival.txt and asserted
          BYTE-IDENTICAL at every boundary — see deviation 1.
```

Nothing red. Nothing halted.

## Task 1 — WR-54 + WR-50

### The resolved ranges, measured BEFORE anything changed

```
file lines: 10914

EXCLUSION 1  the machine-owned span   from   957  to  1538   size   582   band  100..1500
EXCLUSION 2  UNBOUNDED_QUANTIFIERS    from  5959  to  5969   size    11   band     5..40
EXCLUSION 3  RESOLVER_REGISTRY        from  4135  to  5767   size  1633   band  500..3000

registry opens (`export const RESOLVER_REGISTRY`)                       : 4135
registry's REAL closing line (`] as readonly ResolverRecord[]);`)       : 5767
line `closingBracketAfter` lands on TODAY                               : 5767   <- correct
line the PRE-FIX recogniser lands on                                    : 5884   <- 117 late
`export const BRANCH_VOCABULARY` (the construct that close belongs to)  : 5789

list opens (`export const UNBOUNDED_QUANTIFIERS`)                       : 5959
list's REAL closing line (`]);`)                                        : 5969
line `closingBracketAfter` lands on TODAY                               : 5969
line the PRE-FIX recogniser lands on                                    : 5969   <- unmoved
```

**Reconciliation against the plan's anchors: 4135 / 5767 / 1633 and 5959 / 5969 — ALL FIVE AGREE TO THE LINE. No disagreement to record.** The four construct endpoints did not move across waves 39 and 40 because both waves worked below line 9000 and above line 10000; only the *anchors in the plan's frontmatter* moved, and those are re-derived below.

### The locator uniqueness measurement that dictated the two different pin shapes

```
$ grep -c '^\] as readonly ResolverRecord\[\]);$'   ->  1     <- unique, usable as a text locator
$ grep -c '^\]);$'                                  -> 14     <- NOT unique
```

So exclusion three is pinned by the registry's own closing text and **exclusion two cannot be**. It is pinned instead by the list's own **live contents** — each of the nine `UNBOUNDED_QUANTIFIERS` entries measured to occupy exactly one line:

```
"anywhere in the file",     1 [5960]      "every spelling",             1 [5965]
"everywhere in the file",   1 [5961]      "every reachable spelling",   1 [5966]
"any depth",                1 [5962]      "ANY string literal",         1 [5967]
"every literal",            1 [5963]      "ANY-BINDING-WINS",           1 [5968]
"ANY of them",              1 [5964]
```

The literals are rebuilt with `JSON.stringify(phrase)` **at runtime**, so the pin that measures the surface adds nothing to it — no declared phrasing is written into this file by the case that counts them.

### Why the DIRECT form and not a size pin — one sentence, as required

The verifier offered pinning the size as an alternative and this plan did not take it, because **a size pin goes green again the day a construct legitimately grows, and the defect being closed is precisely a width that moved with nothing noticing** — so the endpoint is pinned to a located line, which stays true as the file grows and fails the moment the resolution lands elsewhere.

### Both bands, both `proof` tokens, exclusion one and both pinned counts — diffed EMPTY

```
$ git diff -- <gate file> | grep -cE '^[+-].*CLOSES_FROZEN_ARRAY = '                 0
$ git diff -- <gate file> | grep -cE '^[+-].*band: \['                               0
$ git diff -- <gate file> | grep -cE '^[+-][[:space:]]*proof:'                       0
$ git diff … | grep -cE 'spanStart|spanEnd|machine-owned span between the sentinels' 0
$ git diff … | grep -cE '(collectors\.length\)\.toBe|functions\.length\)\.toBe)'     0

constructAnchorFor : 0   nameableRemainder : 0   NO_PRECEDING_CONSTRUCT : 0
anchorTokenCensus  : 0   CONSTRUCT_TOKEN_WIDTH : 0   CORE11_BOX_EXPECTED : 0
preAnchoringExemptionKeyForFixtureOnly : 0   exemptionKeyFor : 0
BEGIN DERIVED RESIDUAL : 0   END DERIVED RESIDUAL : 0

$ git diff -U0 -- <gate file> | grep '^@@'
@@ -9907,3 +9907,43 @@      <- the closing sentence
@@ -9997,0 +10038,92 @@     <- the new case
        ^ TWO hunks, both far below the header. Lines 803-804 / 901 / 911 untouched
          by Task 1; they are Task 2's.
```

**No disagreement arose between the direct assertion and the resolved range, so nothing was adjusted to accommodate anything.** No band, `proof` token, pinned count or exclusion moved in any direction.

### THE VERIFIER'S OWN REVERT, PLANTED AFTER COMMIT AND WATCHED GOING RED

```
$ git log --oneline -1              (pasted BEFORE the plant, per T-01-240)
f338db1 test(01-41): WR-54 + WR-50 — both closingBracketAfter resolutions pinned …

$ grep -n 'const CLOSES_FROZEN_ARRAY' <gate file>       (before)
9950:  const CLOSES_FROZEN_ARRAY = /^\]( as [^)]*)?\);$/;

$ grep -n 'const CLOSES_FROZEN_ARRAY' <gate file>       (after the plant — pass 9's exact pre-fix form)
9950:  const CLOSES_FROZEN_ARRAY = /^\]\);$/;
```

```
 × both `closingBracketAfter` resolutions land on their OWN construct's closing line — the WIDTH is pinned, not merely banded 13ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  packages/backend/src/outbound-prohibition.spec.ts > the residual is DERIVED …
       > both `closingBracketAfter` resolutions land on their OWN construct's closing
         line — the WIDTH is pinned, not merely banded

AssertionError: `closingBracketAfter(registryStart)` resolved to line 5884, but
RESOLVER_REGISTRY's own closing line is 5767 — a gap of 117 line(s). The scan walked
PAST the construct this exclusion is named for and stopped on a different one, so
exclusion three's `name` and `why` are false of the lines it removes from the scanned
surface. THIS IS WR-48 EXACTLY: before the recogniser was corrected the scan landed
117 lines late, on the close of a different frozen array. Correct CLOSES_FROZEN_ARRAY
so it recognises this construct's closing form. Do NOT widen the band, do NOT change
the `proof` token, and do NOT adjust this pin — a pin moved to fit the number it
exists to catch is decoration that reports green.: expected 5884 to be 5767 // Object.is equality

- Expected
+ Received

- 5767
+ 5884

 ❯ packages/backend/src/outbound-prohibition.spec.ts:10100:7

 Test Files  1 failed (1)
      Tests  1 failed | 438 passed (439)
```

**Both line numbers are in the message and the 117-line gap is printed in the output itself.** `01-VERIFICATION.md:432` records this exact mutation as `434 passed (434)` — **✗ FAIL — the correction is unpinned**. This session's contrast: **1 failed | 438 passed.** The 438 that still pass are the measurement of pass 9's finding: every other mechanism in the file — the `proof` token, both bands, the clause-count equality — is still green under the revert. Only the new pin sees it.

```
$ git checkout -- <gate file>                        (the work was COMMITTED first — wave 29's lesson)
$ grep -n 'const CLOSES_FROZEN_ARRAY' <gate file>
9950:  const CLOSES_FROZEN_ARRAY = /^\]( as [^)]*)?\);$/;      <- restored
$ git diff --exit-code -- <gate file>
TREE-CLEAN
$ pnpm exec vitest run <gate file> | tail
      Tests  439 passed (439)
```

### The replacement closing sentence, QUOTED VERBATIM

```
  // it, exactly as it walked past 5767. This is a narrower recogniser than "the
  // closing line of the construct", and IN-38 named the two constraints that
  // sentence still leaves out: the match is anchored to column 0 of the RAW,
  // un-normalized line, and it requires single spaces around `as`. Concretely
  // unmatched, then: `] as readonly (string | number)[]);` — an `as` type
  // containing a `)` — and any close that is indented, or spelled `]as const);`
  // without the space. Both anchored constructs are top level and
  // prettier-formatted today, so this is a stated reach and not a live defect.
  //
  // WHAT HOLDS THESE TWO RESOLUTIONS, AND WHAT DOES NOT — CORRECTED AT WAVE 41
  // (WR-54, WR-50). THE SENTENCE THAT STOOD HERE NAMED THE `proof` TOKENS AND
  // THE BANDS AS THE PIN. MEASUREMENT REFUTES ALL THREE CANDIDATES:
  //  (1) The `proof` check asks only whether the token occurs somewhere inside
  //      the RESOLVED RANGE. That predicate is MONOTONE IN RANGE WIDTH — a wider
  //      range still contains the token — so it cannot detect an over-walk BY
  //      CONSTRUCTION, not by accident. It was green across all 1750 wrong lines
  //      of WR-48.
  //  (2) The band did not catch WR-48 either. The over-walk resolved 1750 lines
  //      and exclusion three's band is 500..3000, so 1750 sat inside it. This
  //      paragraph says so itself, eleven lines up, and then used to name that
  //      same band as the pin.
  //  (3) The clause-count equality below would NOT have caught this one, which
  //      is the correction to WR-50 rather than a restatement of it.
  //      Verification pass 9 counted all nine declared phrasings across all 117
  //      swallowed lines and got ZERO, so `inRange` and `inClauses` both stayed
  //      at 12 and neither side of the equality moved. It WOULD catch an
  //      over-walk that swallowed declared phrasings — a shape change reaching
  //      the quantifier list, say — and that is the whole of what it holds.
  // Pass 9 established this by reverting this regex to its pre-fix form and
  // watching the suite stay GREEN at 434 of 434.
  //
  // WHAT HOLDS THEM NOW is the case titled "both `closingBracketAfter`
  // resolutions land on their OWN construct's closing line", which asserts each
  // resolution EQUAL to the line its construct actually closes on — the registry
  // located by its own closing text, the quantifier list by its own live
  // entries, each locator proved to match exactly ONE line before it is used.
  // THAT REACH AND NO WIDER. It pins WHERE THE SCAN LANDS FOR THESE TWO
  // CONSTRUCTS and says nothing about any other. It does not widen what this
  // recogniser matches: a frozen array closed in some third form is STILL
  // unrecognised and the scan would STILL walk past it. What changed is that
  // for these two constructs a walk-past now turns this suite RED instead of
  // passing silently. It does not make exclusion three exact either — that
  // exclusion is still a LINE RANGE wider than the clause strings it stands
  // for, narrowed only by the equality below.
```

**All four required elements present:** (a) the `proof` check's monotonicity in range width; (b) the band's measured failure at 1750 inside 500..3000; (c) the clause-count equality's measured blindness because the swallowed lines carried zero clauses; (d) the new direct assertion named as what holds the resolution, with its reach stated and the third-form close named as still unrecognised.

### The non-vacuity assertion and its failure message, quoted

```ts
expect(
  registryCloseHits,
  `the locator ${JSON.stringify(REGISTRY_CLOSE)} matches ${registryCloseHits} line(s) of ${GATE_FILE}, not exactly one. At ZERO the pin below would compare -1 against -1 and pass having compared nothing; ABOVE ONE it would pin to whichever line came first. Re-point the locator at the registry's real closing line — do not delete the pin.`,
).toBe(1);
```

---

## Task 2 precondition, pasted

```
$ git rev-parse HEAD
f338db173694d0fac6e2e1ba150a16bdbb8ffab4

$ git status --porcelain packages/ scripts/        -> count 0
$ git status --porcelain .planning/                -> PLANNING-BYTE-IDENTICAL-TO-ARRIVAL
$ pnpm exec vitest run <gate file> | tail          ->  Tests  439 passed (439)
$ pnpm test                                        ->  31 files / 1379 tests, TEST-EXIT=0
```

Task 1's case present and green. Nothing red.

## THE WAVE-28 ATTRIBUTION CENSUS — its own enumeration, run before the box-state one

### A. The whole-file grep

```
$ grep -n 'wave 28' packages/backend/src/outbound-prohibition.spec.ts
801://    replacement and wave 28 reconciles both requirement-tier ledgers to
803://    place the next drift can start. CORE-11's box stays `[ ]`; wave 28
903://    wave 28 reconciles both requirement-tier ledgers to it in ONE move.
944:CORE-11's COMPLETION, wave 28, recorded here because this is where a reader
3345:    // each silent, and the verifier found both while re-executing wave 28's
8225:    // THE TWO THE VERIFIER FOUND ITSELF while re-executing wave 28's discharge
8226:    // table, on rows wave 28 had recorded as discharged. Both were the same
count: 7
```

### B. THE SINGLE-LINE PHRASE-GREP, RUN TO SHOW IT VACUOUS

```
$ grep -c '<wave-number> <flip-clause>' packages/backend/src/outbound-prohibition.spec.ts
0
```

**ZERO, at arrival, with the defect fully present** — because the attribution WRAPS A LINE BREAK, `:803` ending on the wave number and `:804` opening on the flip clause. This is named explicitly as the reason **no gate in this plan is spelled that way**.

### C. The newline-normalised span

```
$ tr '\n' ' ' < <gate file> | grep -o 'wave 28[^.]*flip'
wave 28 //    owns the flip
count: 1
```

**ONE at arrival.** The gate that asserts this at zero was therefore RED before the work and green after it.

### D. Sentinel-bounded region counts, captured at this task's own precondition

```
$ grep -n '^BEGIN DERIVED RESIDUAL\|^END DERIVED RESIDUAL'
957:BEGIN DERIVED RESIDUAL - generated by deriveResidual(RESOLVER_REGISTRY) …
1538:END DERIVED RESIDUAL

HEADER (above the BEGIN sentinel): 4
BODY   (at/below the END sentinel): 3

$ cat /tmp/gsd-0141-t2-arrival.txt
f338db173694d0fac6e2e1ba150a16bdbb8ffab4 4 3
```

**Neither number is typed into a gate.** The verify block re-derives both from the tree at the recorded commit with `git show "$BB:$F" | awk …`, cross-checks them against the scratch line, and only then compares the live counts — so a stale or hand-edited scratch line fails the gate rather than passing it.

### FINDING 1 — THE FLOOR WAS SHORT AGAIN, FOR A THIRD TIME, AND HERE IS THE HIT IT MISSED

The plan's floor names four header hits (`:801`, `:803`, `:903`, `:944`) and three body hits. The **case-insensitive** grep returns **EIGHT, not seven**:

```
$ grep -in 'wave 28' packages/backend/src/outbound-prohibition.spec.ts
801: … 803: … 903: … 944: …
955:Wave 28 changed no rule, no fixture, no resolver and no registry row; its entire
3345: … 8225: … 8226: …
count: 8
```

**`:955` is invisible to every case-sensitive grep in the plan, in the review and in the verification report, because the sentence opens with a capital `W`.** It sits in the same `/* */` block as `:944` and **two lines above** the machine-owned `BEGIN DERIVED RESIDUAL` sentinel. Recorded here as a finding rather than absorbed: the enumeration that decides a sweep's completeness must be run case-insensitively, and this is the third round in which this particular floor came up short.

### Per-hit dispositions — every header-region hit, `:903` and `:944` each answered BY NAME

| Line | Text (subject) | Region | Disposition |
| --- | --- | --- | --- |
| `:801` | "wave 28 reconciles both requirement-tier ledgers to it in ONE move" | header | **LEFT STANDING.** Its subject is LEDGER RECONCILIATION, not the box. It states no box state, attributes no change to the box, and it sits inside wave 27's own dated record of intent — and wave 28 did reconcile the ledgers (`01-28-SUMMARY.md`'s discharge table). Nothing false to sweep. |
| `:803-804` | "CORE-11's box stays … ; wave 28 owns the flip" | header | **SWEPT HERE**, Branch A. Both the box-state clause and the owner clause deleted; a dated marker points at the authoritative surfaces and asserts nothing. |
| `:903` | "wave 28 reconciles both requirement-tier ledgers to it in ONE move" | header | **LEFT STANDING, by name.** This is the tail of `:901`'s sentence, and it is the *same* clause as `:801` word for word. Once `:901`'s box-state clause is struck, what remains is a pure ledger-reconciliation record with the same subject and the same truth value as `:801` — so sweeping one while leaving the other would be inconsistent, and sweeping both is scope this plan was not given. The clause's continued presence is what keeps the header count at 3 rather than 2, and it is recorded in the bytes with its reason. Its wording matches no fixed pattern, which is exactly why it gets a named disposition instead of a grep. |
| `:944` | "CORE-11's COMPLETION, wave 28, recorded here …" | header | **LEFT STANDING, by name.** It attributes the DISCHARGE TABLE — a real wave-28 artifact cited by name as `01-28-SUMMARY.md` — and not the box change. It states no box state and says of itself *"this note restates NO bound of its own"* and *"the table is the evidence - the checkbox is not"*. It also sits **thirteen lines above the machine-owned sentinel**, whose line number is pasted below; **no edit was made anywhere near it.** |
| `:955` | "Wave 28 changed no rule, no fixture, no resolver and no registry row" | header | **LEFT STANDING (FINDING 1).** True statement of historical fact, states no box state, attributes no change to the box, and sits **two lines above the machine-owned sentinel**. |
| `:3345`, `:8225`, `:8226` | re-executing wave 28's DISCHARGE TABLE | body | **OUT OF SCOPE, DIFFERENT SUBJECT, ASSERTED UNCHANGED.** Body count 3 → 3 by the verify block. |

**The machine-owned sentinel's line number, pasted before any edit near it was contemplated:**

```
957:BEGIN DERIVED RESIDUAL - generated by deriveResidual(RESOLVER_REGISTRY) in packages/backend/src/outbound-prohibition.spec.ts - MACHINE-OWNED, DO NOT HAND-EDIT
```

`:944` is 13 lines above it and `:955` is 2 lines above it. **Neither was edited.** The whole span is proved byte-identical against the round base below.

## THE BOX-STATE SITE CENSUS — a second and different enumeration

### BEFORE the sweep, with the grep that produced it

```
$ grep -nE "box stays|BOX IS THE STATE|BOX'S STATE|- \[ \] \*\*CORE-11|- \[x\] \*\*CORE-11" <gate file>
803://    place the next drift can start. CORE-11's box stays `[ ]`; wave 28
901://    deliberately untouched and CORE-11's box stays `[ ]`, for the reason
905://    CORE-11's BOX IS NOT STATED HERE, AS OF 2026-08-25 (wave 33, WR-38). A
911://    and `faca607`. THE BOX'S STATE IS NOW STATED IN EXACTLY TWO PLACES:
10957:  const CORE11_BOX_EXPECTED = "- [ ] **CORE-11**";

$ grep -n '^- \[ \] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
46:- [ ] **CORE-11**: No code that ships in the plugin issues an outbound network request …
```

| # | Site | Reach of this plan |
| --- | --- | --- |
| 1 | `:803` — "CORE-11's box stays `[ ]`" | **EDITABLE HERE** |
| 2 | `:901` — "CORE-11's box stays `[ ]`" | **EDITABLE HERE** |
| 3 | `CORE11_BOX_EXPECTED` at `:10957` | **READ-ONLY HERE** — in this file, but out of this plan's scope and asserted byte-unchanged |
| 4 | `.planning/REQUIREMENTS.md:46` | **OUTSIDE `files_modified` ENTIRELY** — read-only, and no mechanism in the gate file enumerates it |

**FOUR — reconciles exactly with verification pass 9's count.** `:905` and `:911` are matched by the grep but are *statements about where the state is stated*, not statements of it; they are the wave-33 note's own header and the count claim being replaced.

Examined and **excluded** from the count, with reasons, so the census states its own reach: `:6237` (*"CORE-11's `[x]` was flipped"* — a record of two past flips, not the current state), `:10977-10978` (a docblock arguing why `[ ]` is a legitimate *outcome*, not an assertion of the current one), and `:11058` (site 3's own failure message, whose `[ ]` appears inside a conditional rule).

### AFTER the sweep, re-counted in this session, INCLUDING the replacement prose

```
$ grep -nE "box stays|BOX IS THE STATE|BOX'S STATE|- \[ \] \*\*CORE-11|- \[x\] \*\*CORE-11" <gate file>
10983:  const CORE11_BOX_EXPECTED = "- [ ] **CORE-11**";
11043:  it("CORE-11's entry is present and well-formed, and ITS BOX IS THE STATE …
11058:      `CORE-11's checkbox in ${LEDGER} is not the state this suite pins. …

$ grep -nE '\[ \]|\[x\]' <gate file>        (the wider net)
6237, 10977, 10978, 10983, 11058
```

**ONE site in this file states the box's state after the sweep: `CORE11_BOX_EXPECTED` at `:10983`.** `:11043` is that constant's own case title and `:11058` its failure message.

**DID THE SWEEP CREATE A NEW SITE? NO.** Both replacement markers and the replaced count clause were written specifically to name the box without stating its state — none of them contains `[ ]`, `[x]`, "box stays", or any equivalent. They are matched by neither grep.

## The two dispositions — BRANCH A, and the reading of P38-D1 that made Branch B unavailable

**BRANCH A (wave-33 pointer-not-a-bound deletion) was taken for both statements.**

**The reading of P38-D1 applied, stated as required:** P38-D1's line-granularity history-marking was read as **forbidding alteration of the marked bytes** — that is what makes it *history* rather than a rewrite. Under that reading its plain form would leave the false owner clause standing inside the marked span, which the plan does not permit; and its amended form (striking the clause inside marked bytes) would contradict the reading. **So Branch B is unavailable for these two statements and Branch A is taken**, exactly as the plan's paragraph provides for.

```diff
@@ -800,8 +800,15 @@
 //    it in ONE move, and another hand-authored copy would be another
-//    place the next drift can start. CORE-11's box stays `[ ]`; wave 28
-//    owns the flip and only against the derived text. NOTHING LEAKED:
+//    place the next drift can start. [A SENTENCE STOOD HERE STATING
+//    CORE-11's BOX STATE AND NAMING A LATER WAVE AS THE OWNER OF THE
+//    CHANGE. DELETED 2026-08-26 (wave 41, WINDOWS 41), under the same
+//    pointer-not-a-bound disposition wave 33 applied to the paragraph a
+//    hundred lines below: it was unmarked, present-tense, and its owner
+//    clause was false on its own terms — no wave ever owned that change.
+//    The authoritative surfaces are `CORE11_BOX_EXPECTED` below and the
+//    CORE-11 row in `.planning/REQUIREMENTS.md`; this block now POINTS at
+//    them and asserts nothing.] NOTHING LEAKED:
```

```diff
@@ -898,9 +905,16 @@
 //    one specifier, `crypto`. `REQUIREMENTS.md` and `STATE.md` stay
-//    deliberately untouched and CORE-11's box stays `[ ]`, for the reason
-//    waves 24 and 25 recorded: wave 27 derives the replacement text and
-//    wave 28 reconciles both requirement-tier ledgers to it in ONE move.
+//    deliberately untouched, for the reason waves 24 and 25 recorded:
+//    wave 27 derives the replacement text and wave 28 reconciles both
+//    requirement-tier ledgers to it in ONE move. [A CLAUSE STATING
+//    CORE-11's BOX STATE STOOD INSIDE THIS SENTENCE AND IS DELETED,
+//    2026-08-26 (wave 41, WINDOWS 41), for the same reason as the deletion
+//    in the wave-27 block above. The ledger-reconciliation clause is LEFT
+//    STANDING: it is the same dated record of intent the wave-27 block
+//    already carries, it names no box state, and reconciling the two
+//    ledgers is a thing that wave did. The authoritative surfaces are
+//    named in the note directly below.]
```

**NO REPLACEMENT RE-SPELLS THE ATTRIBUTION IN ORDER TO DENY IT.** The prohibition was live: the natural denial ("no wave 28 ever owned the flip") is itself a fresh occurrence of the forbidden span and would have turned the gate red. Both markers avoid it — *"NAMING A LATER WAVE AS THE OWNER OF THE CHANGE"*, *"no wave ever owned that change"* — the wave number and the flip word never co-occur.

### The attribution asserted GONE, numerically and by human read

```
$ tr '\n' ' ' < <gate file> | grep -o 'wave 28[^.]*flip' | grep -c .
0                                      <- ONE at arrival, ZERO now: red before the work, green after

$ grep -ic 'owns the flip' <gate file>
0

$ wave28 header 4->3 body 3->3 span 0  <- the verify block, with both region counts
                                          re-derived from the tree at f338db1
```

**Human read for surviving paraphrases:**

```
$ awk '/^BEGIN DERIVED RESIDUAL/{exit} /flip/{print NR"|"$0}' <gate file>
924|//    that has already been flipped early and reverted twice, at `e7cc4b6`
```

The single surviving `flip` in the whole header region is the wave-33 note's record of **two past flips at named commits** — not an attribution to any wave, and not a statement of the current state.

```
$ tr '\n' ' ' < <gate file> | grep -oE 'wave [0-9]+.{0,120}flip'
(no output — no wave number co-locates with the flip word anywhere in the file)
```

## The replaced count clause, QUOTED VERBATIM

```
//    and `faca607`. THE SITE COUNT THIS PARAGRAPH USED TO STATE HERE WAS
//    FALSE, AND IS REPLACED 2026-08-26 (wave 41, WINDOWS 41). It claimed a
//    two-site total. Verification pass 9 measured FOUR sites stating the
//    box's state and found all four in agreement — so there was no
//    contradiction of FACT, and this was never what held the box where it
//    is — but a false count standing on a reader surface is exactly the
//    class the third criterion is about. NO COUNT REPLACES IT. The
//    AUTHORITATIVE surfaces are the CORE-11 row in
//    `.planning/REQUIREMENTS.md` and `CORE11_BOX_EXPECTED` below, which
//    pins that row BY BYTES. WHAT THIS FILE CANNOT SEE IS NAMED RATHER
//    THAN SILENTLY COUNTED: the ledger row lives in a different file, and
//    no mechanism in this file enumerates the places IT states the box's
//    state; `.planning/STATE.md` is governed by the pointer-not-a-bound
//    rule below with no mechanical check at all. A count stated wider than
//    the grep that produced it is the defect being corrected here. This
//    paragraph POINTS at both authoritative surfaces and asserts nothing
//    about the box's state itself, so the contradiction cannot recur. The
//    item-by-item discharge table is in `01-28-SUMMARY.md`; the table is
//    the evidence and the checkbox is not.
```

**IT STATES NO NUMBER.** The form was chosen over stating the measured number because either available number is a trap: the four-site figure counts two surfaces this file cannot see, and the one-site figure is a claim about *this file's* reach that a reader would naturally generalise. **NO NUMBER CANNOT BE STATED WIDER THAN ITS GREP.**

**IT NAMES BOTH UNREACHABLE SURFACES WITH THE REASON EACH IS UNREACHABLE:** `.planning/REQUIREMENTS.md`'s row *"lives in a different file, and no mechanism in this file enumerates the places IT states the box's state"*; `.planning/STATE.md` *"is governed by the pointer-not-a-bound rule below with no mechanical check at all"*.

```
$ grep -c 'EXACTLY TWO PLACES' <gate file>
0
```

**The rest of the wave-33 note is intact** — its opening (`CORE-11's BOX IS NOT STATED HERE, AS OF 2026-08-25 (wave 33, WR-38)`), its deletion record, its two-flips history and its closing pointer at the discharge table are all unchanged, as the diff hunk shows. Its pointer-not-a-bound reasoning is correct and is not what was being corrected.

## The finding's weight, stated exactly as verification pass 9 stated it

**Verification pass 9 counted FOUR sites stating the box's state — `:803`, `:901`, `CORE11_BOX_EXPECTED` and `REQUIREMENTS.md:46` — found ALL FOUR AGREEING ON `[ ]`, found NO CONTRADICTION OF FACT, and said plainly that this is NOT what keeps the box at `[ ]`.**

Nothing written by this plan implies otherwise in either direction. What was wrong is narrower and is stated as such: two statements were **unmarked, present-tense, and carried an owner attribution false on its own terms**, and a third **stated a count that measured four**. A false standing statement on a reader surface is the class criterion (3) is about — and that is the whole of the claim being made for this repair.

## CORE11_BOX_EXPECTED — byte-unchanged and still reading `[ ]`

```
$ grep -cE '^  const CORE11_BOX_EXPECTED = "- \[ \] \*\*CORE-11\*\*";$' <gate file>
1
BOX-PIN-BYTE-IDENTICAL B=1

$ git diff -- <gate file> | grep -cE '^[+-].*const CORE11_BOX_EXPECTED'
0        <- the declaration line appears on NEITHER side of the diff
```

The three `CORE11_BOX_EXPECTED` strings that DO appear in the Task 2 diff are all **prose pointers** in the replacement markers, pointing readers at the constant:

```
+//    The authoritative surfaces are `CORE11_BOX_EXPECTED` below and the
-//    `CORE11_BOX_EXPECTED` below, which pins that row by bytes. This
+//    `.planning/REQUIREMENTS.md` and `CORE11_BOX_EXPECTED` below, which
```

## The machine-owned span, byte-identical across the whole round

```
round base bc0f4c2 span lines 957..1538  |  now 983..1564
MACHINE-OWNED-SPAN-BYTE-IDENTICAL
```

The span **moved** (26 lines down, from this plan's header edits above it) and its **bytes did not**. That is the correct outcome: the sentinels are anchors, never line numbers.

## THE ROUND'S CLOSING BASELINE — executed in this session, not carried

| Figure | Round-9 arrival | This session | Difference, attributed |
| --- | --- | --- | --- |
| `pnpm test` files | 31 | **31** | none |
| `pnpm test` tests | 1374 | **1379** | **+5, all attributed.** 01-39 +2 (uniqueness census; both relocation fixtures), 01-40 +2 (the sentinel surface case; the prefix case), **01-41 +1** (the width pin). Cross-checked against each plan's own recorded count: 01-39 ended at 437, 01-40 at 438, this plan at 439. |
| `pnpm test` exit | 0 | **0** | none |
| `pnpm typecheck` (`tsc --build`) | 0 | **0** | none |
| `pnpm lint` (`eslint .`) | 0 | **0** | none |
| `pnpm knip` | 0 | **0** | none |
| `check:bundle` specifiers | 1 — `crypto` | **1 — `crypto`** | none |
| gate suite | 434 (before 01-39) | **439** | +5, same attribution as above |
| real-tree walk modules | 23 | **23** | none |
| real-tree walk violations | 0 | **0 (29 passed / 410 skipped)** | none |

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  1379 passed (1379)
TEST-EXIT=0

$ pnpm typecheck   -> $ tsc --build                      exit 0
$ pnpm lint        -> $ eslint .                         exit 0
$ pnpm knip        -> $ knip                             exit 0
$ pnpm build:backend && pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto

$ pnpm exec vitest run <gate file> | tail
      Tests  439 passed (439)

$ real-tree walk over both SOURCE_ROOTS ("packages/backend/src", "packages/engine/src")
shipped non-spec modules across both SOURCE_ROOTS: 23
$ pnpm exec vitest run <gate file> -t "no outbound surface is reachable" | tail
      Tests  29 passed | 410 skipped (439)
```

**No unattributed difference. No finding.**

## Nothing leaked, for the WHOLE of round 9

```
$ git diff --name-only bc0f4c2..HEAD -- packages/ scripts/
packages/backend/src/outbound-prohibition.spec.ts

$ git diff --name-only bc0f4c2..HEAD -- packages/ scripts/ | grep -v '\.spec\.ts$' | grep -c .
0                            <- the ENTIRE code delta of round 9 is ONE TEST FILE

$ git diff bc0f4c2..HEAD -- .planning/REQUIREMENTS.md | grep -c .
0                            <- REQUIREMENTS.md untouched by the entire round

$ diff <(git show bc0f4c2:.planning/REQUIREMENTS.md | sed -n '46p') <(sed -n '46p' .planning/REQUIREMENTS.md)
CORE-11-ROW-BYTE-IDENTICAL

$ grep -n '^- \[ \] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
46:- [ ] **CORE-11**: No code that ships in the plugin issues an outbound network request in this
      phase — no `caido:http` fetch, no `sdk.requests.send` in any spelling, no method of an
      identified `req…
```

## Nothing under `.planning/` was opened

```
$ git status --porcelain .planning/    (diffed byte-for-byte against the arrival snapshot)
PLANNING-BYTE-IDENTICAL-TO-ARRIVAL     <- at both task boundaries and at close-out

$ git status --porcelain -- '*COVERAGE.md' '*PROBE.md'      -> 0
$ git diff --name-only bc0f4c2..HEAD -- '*COVERAGE.md' '*PROBE.md'  -> 0
```

`requirements mark-complete` appears in **no command run in this session**. **`01-PROBE.md`'s equality `38 == 27 + 11` stands unchanged** — this plan resolves no flagged assumption and surfaces no new one, so no row moves and the equality is re-stated rather than recomputed. **`COVERAGE.md` is unedited and its declaration stands**, because this round integrates no external API.

**Assumption-delta detector: DID NOT FIRE.** Run over every line added across the round (`git diff bc0f4c2..HEAD | grep '^+'`) for a singular-to-plural transition into any of the nine declared phrasings — **zero hits**. A guard-anchoring round is unlikely to fire one, and it did not; no row is invented.

## Per-sentence no-overclaim verdict

Task 1 — the replacement closing sentence:

| Sentence | Verdict |
| --- | --- |
| "IN-38 named the two constraints that sentence still leaves out: … column 0 of the RAW, un-normalized line, and … single spaces around `as`." | **OK.** Both constraints executed against the live regex by IN-38 and re-read here. Adds disclosure; changes no matched form. |
| "Concretely unmatched, then: `] as readonly (string \| number)[]);` … `]as const);` …" | **OK.** IN-38's own executed table, quoted at its reach. |
| "Both anchored constructs are top level and prettier-formatted today, so this is a stated reach and not a live defect." | **OK.** "today" carries the temporal bound inside the clause. |
| "(1) … MONOTONE IN RANGE WIDTH … cannot detect an over-walk BY CONSTRUCTION" | **OK.** True of `some()` over a widening slice, by construction, not by measurement — and stated as such. |
| "It was green across all 1750 wrong lines of WR-48." | **OK.** WR-50's measurement, cited at its reach. |
| "(2) The band did not catch WR-48 either. … 1750 sat inside it." | **OK.** Measured; 500..3000 pasted beside it. |
| "(3) The clause-count equality below would NOT have caught this one … got ZERO … neither side of the equality moved." | **OK.** Pass 9's nine-phrasing count over the 117 lines, cited with the number. |
| "It WOULD catch an over-walk that swallowed declared phrasings … and that is the whole of what it holds." | **OK, and load-bearing.** Prevents the opposite overclaim — the equality is not useless, it is bounded, and the bound is inside the clause. |
| "WHAT HOLDS THEM NOW is the case titled … which asserts each resolution EQUAL to the line its construct actually closes on …" | **OK.** Names the executing case by title; both assertions are in it. |
| "THAT REACH AND NO WIDER. It pins WHERE THE SCAN LANDS FOR THESE TWO CONSTRUCTS and says nothing about any other." | **OK.** The bound is inside the claiming clause. |
| "a frozen array closed in some third form is STILL unrecognised and the scan would STILL walk past it. What changed is that for these two constructs a walk-past now turns this suite RED …" | **OK.** The residual is restated, and the improvement is scoped to the two constructs inside the same sentence. |
| "It does not make exclusion three exact either — that exclusion is still a LINE RANGE wider than the clause strings it stands for, narrowed only by the equality below." | **OK.** The disclosed coarseness survives the fix and says so. |

Task 1 — the new case's comment and messages:

| Sentence | Verdict |
| --- | --- |
| "Everything above this point checks that each exclusion resolves to SOMETHING … Verification pass 9 showed that set is not enough" | **OK.** Cites the executed revert. |
| "NOT A SIZE PIN, DELIBERATELY. … a size pin goes green again the day a construct legitimately grows" | **OK.** A statement about the alternative, not about coverage. |
| "The bands are left exactly as they are: coarse sanity checks, not the pin." | **OK.** Diffed empty. |
| "At ZERO the pin below would compare -1 against -1 and pass having compared nothing" | **OK.** True of `lineOf`'s `-1` return; the assertion that prevents it is directly above. |
| "The literals are rebuilt with JSON.stringify AT RUNTIME so that no declared phrasing is written into this file's scanned surface by the pin that measures it." | **OK.** Verified: the gate's own surface rule is green with the case present. |
| "THIS IS WR-48 EXACTLY: before the recogniser was corrected the scan landed 117 lines late" | **OK.** Reproduced this session; the message printed 5884 vs 5767. |
| "This resolution did NOT move across WR-48's correction — measured then and re-measured here" | **OK.** Re-measured: pre-fix and post-fix both land on 5969. |

Task 2 — every sentence written:

| Sentence | Verdict |
| --- | --- |
| "[A SENTENCE STOOD HERE STATING CORE-11's BOX STATE AND NAMING A LATER WAVE AS THE OWNER OF THE CHANGE. DELETED …]" | **OK.** Describes what was removed without restating it or stating the state. |
| "under the same pointer-not-a-bound disposition wave 33 applied to the paragraph a hundred lines below" | **OK.** Measured: the wave-33 note begins 116 lines below at `:919`; "a hundred lines below" is a deliberate approximation and reads as one. |
| "its owner clause was false on its own terms — no wave ever owned that change" | **OK.** Denies without re-spelling; the gate is green. |
| "this block now POINTS at them and asserts nothing" | **OK.** Verified by the post-sweep census: neither marker is matched by either box-state grep. |
| "[A CLAUSE STATING CORE-11's BOX STATE STOOD INSIDE THIS SENTENCE AND IS DELETED …]" | **OK.** Same shape, same reach. |
| "The ledger-reconciliation clause is LEFT STANDING: … it names no box state, and reconciling the two ledgers is a thing that wave did." | **OK.** Records a deliberate non-action with its reason, in the bytes. |
| "THE SITE COUNT THIS PARAGRAPH USED TO STATE HERE WAS FALSE … It claimed a two-site total." | **OK.** Describes the removed claim without re-spelling the forbidden string; `grep -c` is 0. |
| "Verification pass 9 measured FOUR sites stating the box's state and found all four in agreement" | **OK.** Pass 9's own number and finding; **deliberately does not name the state**, so it is not a new site. |
| "so there was no contradiction of FACT, and this was never what held the box where it is" | **OK.** Pass 9's own weighing, at pass 9's reach, in the safe direction. |
| "NO COUNT REPLACES IT." | **OK.** True — none does. |
| "WHAT THIS FILE CANNOT SEE IS NAMED RATHER THAN SILENTLY COUNTED: the ledger row lives in a different file … `.planning/STATE.md` is governed by the pointer-not-a-bound rule below with no mechanical check at all." | **OK, and the point of the clause.** Both surfaces named with the reason each is unreachable. |
| "This paragraph POINTS at both authoritative surfaces and asserts nothing about the box's state itself" | **OK.** Verified by the post-sweep census. |

## Prediction-versus-measurement discrepancies, recorded rather than absorbed

| Predicted | Measured | Resolution |
| --- | --- | --- |
| Closing sentence `:9758-9761`; `CLOSES_FROZEN_ARRAY` `:9762`; `EXCLUSIONS` `:9766-9805`; `proof` assertion `:9840` | `:9906-9909`; `:9950`; `:9954-9993`; `:9988` | **Explained.** Waves 39 and 40 inserted ~144 lines above 9700. Every identifier re-derived by content, never by number, exactly as the plan required. |
| `CORE11_BOX_EXPECTED` at `:10311` | `:10825` before this plan, `:10957` after Task 1, `:10983` after Task 2 | **Explained.** 10311 → 10825 is waves 39+40; +132 is this plan's Task 1 (92-line case + 40-line sentence); +26 is Task 2's header edits. |
| Exclusion three resolves **4135..5767 = 1633** | 4135..5767 = **1633** | **Exact.** |
| Exclusion two resolves **5959..5969** | **5959..5969** | **Exact.** |
| Pre-fix recogniser lands at `:5884`, `BRANCH_VOCABULARY` declared `:5789` | `:5884`, `:5789` | **Exact.** |
| Box-state sites before the sweep number **FOUR** | **FOUR** | **Exact.** |
| Wave-28 census: **4 header / 3 body**, normalised span **1**, single-line phrase-grep **0** | **4 / 3 / 1 / 0** | **Exact**, case-sensitively — see FINDING 1 for the fifth header hit the case-sensitive form cannot see. |
| Arrival suite **31 files / 1374 tests**, gate suite **434** | 31 / **1378** at arrival, gate **438** | **Explained.** The plan's 1374/434 are the figures from *before plan 01-39*; waves 39 and 40 added 4 tests between them. Both prior plans recorded the increments. |
| Gate file **10,399 lines** at planning HEAD `b8c3d81` | **10,913** at arrival | **Explained.** Waves 39 and 40. |
| Arrival tree clean including `.planning/` | `.planning/` carried five pre-existing entries | **Deviation 1.** |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `.planning/` was not clean at arrival, so the emptiness assertion was replaced by a strictly stronger byte-identity assertion**

- **Found during:** Task 1 precondition, and again at every subsequent boundary.
- **Issue:** The precondition requires `git status --porcelain packages/ scripts/ .planning/` clean and both verify blocks assert `.planning/` porcelain output empty. `packages/` and `scripts/` were clean; `.planning/` carried **five** entries at arrival — `config.json` modified before this executor was spawned, plus four untracked entries predating the session, all five identical to the set plan 01-40 recorded and all five visible in the orchestrator's opening snapshot. No action available to this plan could clear them, and clearing them is not this plan's business.
- **Fix:** The arrival output was pinned to `/tmp/gsd-0141-planning-arrival.txt` and `git status --porcelain .planning/` asserted **byte-identical to that snapshot** at both task boundaries and at close-out. This is strictly stronger than an emptiness check, which would pass on a tree where a planning file had been both added and removed. Both prior waves in this round made the same substitution.
- **Verification:** `PLANNING-BYTE-IDENTICAL-TO-ARRIVAL` at every boundary; `git diff bc0f4c2..HEAD -- .planning/REQUIREMENTS.md` is 0 lines for the whole round.
- **Committed in:** no code change; a precondition substitution, recorded here.

**2. [Rule 2 — Missing critical] The wave-28 census was run CASE-INSENSITIVELY as well, and found a hit no case-sensitive grep in the plan, the review or the verification report can see**

- **Found during:** Task 2, the census pass.
- **Issue:** The plan's floor, the review's citations and the verifier's report all enumerate `wave 28` case-sensitively, returning seven hits. `:955` opens a sentence with `Wave 28` and is invisible to all of them. The plan states the floor "has come up short three times across two rounds" — this is the fourth, and it is a *class* the plan's own instrument could not have caught.
- **Fix:** Both forms run and both pasted; `:955` dispositioned by name (LEFT STANDING — true historical fact, states no box state, two lines above the machine-owned sentinel). Recorded as FINDING 1 rather than absorbed. The verify block's counts are left case-sensitive **deliberately**, because they must re-derive against the precondition-captured value at the recorded commit and changing the instrument mid-gate would break that cross-check; the case-insensitive form is carried as a finding for pass 10 instead.
- **Verification:** `grep -ic 'wave 28'` = 8 before, 7 after (the sweep removed one).
- **Committed in:** `0238fc4`.

---

**Total deviations:** 2 auto-fixed (1 blocking-precondition substitution, 1 missing-critical census widening).
**Impact on plan:** Neither weakens any assertion. Deviation 1 replaces one gate clause with a strictly stronger one; deviation 2 adds a measurement and a finding and removes none.

## Issues Encountered

**One transcription artifact, not a gate failure.** Task 2's verify block, pasted as a single shell line mixing `&&` and `;`, short-circuited at its first `X=$(...); [ "$X" … ]` boundary and printed three `[: : integer expected` errors instead of its counts. Every clause was then re-run standalone and passed, and the block was re-run **as a script file** end to end with **exit 0**, printing `wave28 header 4->3 body 3->3 span 0`, `BOX-PIN-BYTE-IDENTICAL B=1`, `PLANNING-BYTE-IDENTICAL-TO-ARRIVAL` and `TREE-CLEAN`. Task 1's block was run the same way, also exit 0. No assertion was weakened, removed or adjusted; only the shell quoting changed.

## What this plan DID NOT do

- **CORE-11's checkbox did not move in either direction.** It reads `[ ]`, `CORE11_BOX_EXPECTED` agrees and is byte-unchanged, and `REQUIREMENTS.md:46` is byte-identical to the round base.
- **`requirements mark-complete` was not run**, preserving plan 01-38's P38-D3 pattern.
- **No file under `.planning/` was opened by this plan, or by any plan in round 9.**
- **The 2026-08-25 re-scope was not re-opened.**
- **No band, `proof` token, pinned count or exclusion was widened**, and `CLOSES_FROZEN_ARRAY`'s recognised forms are unchanged.
- **Waves 39's and 40's work was not touched** — `constructAnchorFor`, `nameableRemainder`, the sentinel and its docblock, the census, the prefix case, limit (5), the cross-construct fixture, the counter-probe pin and every exemption key all diff empty.

## The five one-sentence statements the plan requires

**1. What holds exclusion three's width now, and why none of the three previously named mechanisms could:** a direct `toBe` asserting `closingBracketAfter(registryStart)` equal to the line located by the registry's own closing text `] as readonly ResolverRecord[]);` — proved to match exactly one line before use — holds it, and none of the three previous candidates could, because the `proof` token is monotone in range width and cannot detect an over-walk by construction, the `[500, 3000]` band already failed on WR-48's 1750, and the clause-count equality measured blind because the 117 swallowed lines carried zero declared phrasings so neither side of the equality moved.

**2. The disposition of each standing statement, and whether the sweep created a new site:** both `:803-804` and `:901`'s box-state clauses were **deleted** under Branch A — wave 33's pointer-not-a-bound disposition — because P38-D1 was read as forbidding alteration of marked bytes, which makes Branch B's amended form unavailable and its plain form impermissible (it would leave the false owner clause standing); and **the sweep created no new site**, because both replacement markers and the replaced count clause name the box without stating its state and are matched by neither box-state grep.

**3. The finding's weight, exactly as verification pass 9 stated it:** four sites stated the box's state, all four agreed on `[ ]`, there was no contradiction of fact, and this was **not** what keeps the box at `[ ]`.

**4. Round 9's whole delta:** the entire code delta of round 9 is **one test file**, `packages/backend/src/outbound-prohibition.spec.ts`, CORE-11's first sentence is **byte-identical** to the round base `bc0f4c2`, and **nothing leaks** — the shipped bundle imports one specifier, `crypto`, across 23 shipped modules at zero violations.

**5. What this does NOT discharge:** pinning one width and sweeping two statements **does not make the exclusions exact and does not discharge criterion (3)** — exclusion three is still a LINE RANGE wider than the clause strings it stands for, a frozen array closed in some third form is still unrecognised and would still be walked past, and `.planning/STATE.md` and `.planning/WINDOWS.md` remain governed by prose with no mechanical check.

**6. The box:** CORE-11's box was **not moved in either direction**, `requirements mark-complete` was **not run**, **no file under `.planning/` was opened by any plan in this round**, and **whether the box may move is verification pass 10's determination, not this plan's**.

## Next Phase Readiness

Round 9's four review findings and both verifier findings are closed: CR-20 and WR-52 (wave 39), CR-21 and WR-51 (wave 40), WR-54 + WR-50 and WINDOWS 41 (this wave). **Verification pass 10 decides whether criterion (3) is discharged.**

Carried forward for pass 10, unclosed and named:
- **IN-38 remains open as a finding** — its two constraints are now *stated* in the recogniser's reach paragraph, but the recogniser still does not match them. Disclosure improved; behaviour unchanged, deliberately.
- **FINDING 1** — the `wave 28` enumeration instrument is case-sensitive across the plan, the review and the verification report, and `:955` is invisible to all three.
- **The two reader surfaces no mechanism reaches** — `.planning/STATE.md` and `.planning/WINDOWS.md`, T-01-212, accepted and carried.
- **Exclusion three's residual coarseness** — a line range wider than the clauses it stands for, narrowed only by the equality.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-26*

## Self-Check: PASSED

```
SUMMARY on disk                                          FOUND
commit f338db1 (Task 1)                                  FOUND
commit 0238fc4 (Task 2)                                  FOUND
commit 4a3d4d6 (SUMMARY)                                 FOUND
packages/backend/src/outbound-prohibition.spec.ts        FOUND
gate suite re-run at close-out                           439 passed (439)
```
