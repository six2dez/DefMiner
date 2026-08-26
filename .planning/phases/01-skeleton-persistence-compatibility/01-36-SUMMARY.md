---
phase: 01-skeleton-persistence-compatibility
plan: 36
subsystem: testing
tags: [core-11, outbound-prohibition, vitest, gap-closure, cr-17, construct-anchor]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "wave 33's whole-file quantifier guard, HEADER_QUANTIFIER_EXEMPTIONS, the three EXCLUSIONS with their proof tokens, CORE11_BOX_EXPECTED, deriveResidual(RESOLVER_REGISTRY)"
provides:
  - "The machine-owned span in .planning/REQUIREMENTS.md restored byte-equal to deriveResidual(RESOLVER_REGISTRY), from the generator's own printed output"
  - "CORE11_BOX_EXPECTED brought into agreement with the adjudicated `[ ]` ledger row, repairing the same-commit pairing that 4105fd0 broke"
  - "A dated 2026-08-26 ledger correction naming criterion (3) THE SOLE BOUND as CORE-11's blocking criterion on three legs (CR-17, CR-18, CR-19), with WR-48 beside them"
  - "constructAnchorFor() — a masked CONSTRUCT ANCHOR derived by backward scan, folded into every exemption key"
  - "An independent named case forbidding a fully-masked anchor"
  - "A fifth numbered LIMIT stating the anchoring's same-construct residual as unguarded"
affects: [01-37, 01-38, verification pass 9]

actuals:
  tokens: 8319
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "An exemption key carries the construct its occurrence sits under, mirroring the `proof` token each EXCLUSION one layer up already carries"
    - "A second, independently-failing assertion beside a mechanism, rather than one mechanism wearing two names"

key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
    - packages/backend/src/outbound-prohibition.spec.ts

key-decisions:
  - "Moving CORE11_BOX_EXPECTED to `- [ ] **CORE-11**` is a PIN brought into agreement with an adjudicated row, not a fourth flip of the box; CORE-11's checkbox is byte-unchanged"
  - "The construct anchor is FOLDED INTO the key rather than checked beside it, so all three flat-string discharge checks become construct-sensitive with no change to their logic"
  - "The fully-masked-anchor case checks the anchor AS A WHOLE, not each half — one shipped occurrence (the wrapped ASCII-table cell) legitimately has a line half that masks away, and its construct half is what names it"

patterns-established:
  - "Measure the RED before repairing it: both suites were executed and pasted before the first edit, and reconciled against the planning-time measurement"
  - "Restore a machine-owned span from the failing assertion's own printed output, never by eye"

requirements-completed: []

coverage:
  - id: D1
    description: "The machine-owned span in .planning/REQUIREMENTS.md is byte-equal to deriveResidual(RESOLVER_REGISTRY) again, restored from the generator's printed output"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte"
        status: pass
    human_judgment: false
  - id: D2
    description: "CORE11_BOX_EXPECTED pins `- [ ] **CORE-11**`, agreeing with the adjudicated ledger row; the pin was watched failing in this session"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#CORE-11's entry is present and well-formed, and ITS BOX IS THE STATE `CORE11_BOX_EXPECTED` PINS"
        status: pass
      - kind: other
        ref: "mutation M1 — ledger row moved to [x], observed RED, restored, git diff --exit-code clean"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every exemption key carries the masked construct its occurrence sits under, so an exemption is not discharged by an occurrence under a DIFFERENT construct (CR-17 leg one)"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the gate file's own bytes carry NO declared phrasing outside the three exclusions except by NAMED exemption"
        status: pass
    human_judgment: false
  - id: D4
    description: "A fully-masked anchor fails its own named case, independently of the anchoring"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#no exemption key's ANCHOR reduces to nothing — a fully-masked anchor names no construct and no line"
        status: pass
      - kind: other
        ref: "mutation M2 — one key edited to \"{q2} §§ {q2} :: q2\", observed RED, restored, git diff --exit-code clean"
        status: pass
    human_judgment: false
  - id: D5
    description: "The 2026-08-26 ledger correction names criterion (3) as CORE-11's blocking criterion on three legs, cites the 2026-08-25 decision, and records that `[ ]` is a measured result"
    requirement: "CORE-11"
    verification: []
    human_judgment: true
    rationale: "Whether a prose correction actually tells a cold reader which criterion blocks the box, without re-deriving or softening the operator's bar, is a judgement no assertion in this repository makes. Verification pass 9 is the reader it is written for."
  - id: D6
    description: "The must-NOT did not move: no outbound call in any non-spec source under either SOURCE_ROOT"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#%s reaches no outbound surface (23 files, 0 violations)"
        status: pass
      - kind: integration
        ref: "pnpm build:backend && pnpm check:bundle — 1 import specifier, crypto"
        status: pass
    human_judgment: false

duration: 25 min
completed: 2026-08-26
status: complete
---

# Phase 01 Plan 36: The Floor and CR-17 Summary

**A tree measured RED before it was repaired — the machine-owned span regenerated, the box pin brought into agreement with an adjudicated `[ ]`, the blocking criterion named in the ledger — and then CR-17 closed by folding a masked CONSTRUCT ANCHOR into every exemption key, with a fully-masked anchor forbidden by a second, independently-failing case.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-26T09:53:00Z
- **Completed:** 2026-08-26T10:17:51Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Executed both suites BEFORE the first edit and reconciled them against the planning-time measurement — the handoff's stated green was false and the round's first act was the measurement that said so.
- Restored the machine-owned span from `deriveResidual(RESOLVER_REGISTRY)`'s own printed output, removing the five blank lines commit `4105fd0` inserted inside it.
- Brought `CORE11_BOX_EXPECTED` into agreement with the adjudicated `[ ]` row, repairing the same-commit pairing `4105fd0` broke, and recorded the breach rather than re-satisfying it silently.
- Appended a dated, plan-attributed ledger correction naming criterion (3) THE SOLE BOUND as the blocking criterion on three legs, with WR-48 beside them.
- Closed CR-17: every exemption key now carries the masked construct its occurrence sits under, making all three flat-string discharge checks construct-sensitive with no change to their logic.
- Added an independent named case forbidding a fully-masked anchor, and a fifth numbered LIMIT stating the anchoring's same-construct residual as UNGUARDED.
- Watched both new rules fail in this session, each after its own work was committed, each restored to a clean `git diff --exit-code`.

## Task Commits

1. **Task 1 (tracer): the floor, end to end** — `6c2c5ce` (fix)
2. **Task 2: CR-17 — the exemption key carries its construct** — `3e00eb3` (fix)

**Plan metadata:** see the `docs(01-36)` commit that carries this file.

---

## The pre-repair measurement, executed before the first edit

```
$ git rev-parse HEAD
366071056bf04c2f63c7adc3f7aa71c665386dc5

$ git log --oneline -3
3660710 docs(01): record gap-closure round 8 planning — 38 plans, ready to execute
9fbd896 docs(01): plan revision 1 — verify blocks that assert, targets that were measured
8aa7123 docs(01): gap-closure round 8 — plans 01-36…01-38 for CR-17, CR-18, CR-19 and WR-48

$ git status --porcelain packages/ .planning/REQUIREMENTS.md
(empty)

$ ls .git/hooks | grep -v '\.sample$' ; git config core.hooksPath
(no non-sample hooks; core.hooksPath unset)
```

```
$ pnpm vitest run packages/backend/src/outbound-prohibition.spec.ts
 Test Files  1 failed (1)
      Tests  2 failed | 430 passed (432)
EXIT=1

$ pnpm test
 Test Files  1 failed | 30 passed (31)
      Tests  2 failed | 1370 passed (1372)
[ELIFECYCLE] Test failed. See above for more details.
EXIT=1
```

All four planning-time numbers reconciled exactly: **432 tests / 2 failed / 430 passed** in the outbound suite, and **31 files with 1 failed / 1372 tests with 2 failed** across the tree. No disagreement to record on the counts.

### The two failing titles

```
 FAIL  packages/backend/src/outbound-prohibition.spec.ts > the residual is DERIVED … >
       the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte

 FAIL  packages/backend/src/outbound-prohibition.spec.ts > the residual is DERIVED … >
       CORE-11's entry is present and well-formed, and ITS BOX IS THE STATE `CORE11_BOX_EXPECTED` PINS
```

### Failure [1/2] — the ledger byte comparison, full assertion message (head)

```
AssertionError: the derived residual block in .planning/REQUIREMENTS.md DIVERGED from deriveResidual(RESOLVER_REGISTRY).

The GENERATED text is authoritative and the shipped text is the defect. Replace the span between the sentinels with exactly this:

----- BEGIN EXPECTED -----
THE RESIDUAL OF CORE-11's OUTBOUND WALK - DERIVED, NOT AUTHORED.
This text is the output of deriveResidual(RESOLVER_REGISTRY) in
packages/backend/src/outbound-prohibition.spec.ts. It is machine-owned: a test
reads this file's own bytes, extracts the span between the sentinels, and
compares it to that output. If the two disagree the GENERATED text is
authoritative and the shipped text is the defect.
…
----- END EXPECTED -----
```

The printed block runs 580 lines. The shipped span ran 585.

### Failure [2/2] — the box case, FULL assertion message

```
AssertionError: CORE-11's checkbox in .planning/REQUIREMENTS.md is not the state this suite pins.
  PINNED  : - [x] **CORE-11**
  SHIPPED : - [ ] **CORE-11**: No co

This box has been flipped early and REVERTED TWICE — at `e7cc4b6` after gap-closure round 3 and at `faca607` after round 4 — and until 2026-08-24 the one case named for it could not see it: its regex was the character class `[ x]`, which matches BOTH states, so it stayed green through both flips and both reverts.

THE TERMINAL CONDITION WAS RE-SCOPED BY THE OPERATOR ON 2026-08-25 (plan 01-35, wave 35) AND WHAT FOLLOWS IS THE CURRENT ONE. The superseded condition is NOT restated beside it, because two terminal conditions standing side by side is the exact contradiction the third criterion forbids. `CORE11_BOX_EXPECTED` changes in the SAME COMMIT as the ledger row, and only after a discharge in which EACH of three criteria was verified BY EXECUTION in that session: (1) DERIVED — the residual is generated from `RESOLVER_REGISTRY` rather than authored beside it; (2) DRIFT-DETECTABLE — a divergence between either shipped span and the generated form turns this suite red; (3) THE SOLE BOUND — the disclosure is the only bound stated on every surface a reader touches, contradicted nowhere. Editing this constant on its own is NOT a way out and never was. THIS BAR IS NARROWER THAN THE ONE IT REPLACES: it makes the gate's DESCRIPTION OF ITSELF derived, drift-detectable and singular, and it does NOT claim the walk catches everything — CR-15, CR-16 and the measured silences carried in the generated span are NAMED RESIDUALS under it, and the class stays open because the space of JavaScript spellings is open. If ANY criterion is unmet, the box stays `[ ]`, the blocking criterion is named in the ledger, and this constant says `[ ]`. `[ ]` IS A CORRECT OUTCOME; an unexamined `[x]` is not.: expected false to be true // Object.is equality
```

## The diagnosis, read off the commit rather than trusted

```
$ git show --stat 4105fd0
commit 4105fd02bdb847941d56fb4e5f089d986938407e
Author: six2dez <six2dez@gmail.com>
Date:   Wed Aug 26 09:52:16 2026 +0200

    docs(phase-01): revert CORE-11 a third time — the discharge overclaimed criterion 3

 .planning/REQUIREMENTS.md | 9 ++++++---
 1 file changed, 6 insertions(+), 3 deletions(-)
```

Six insertions: one is the `- [ ] **CORE-11**` row, five are blank lines. Three deletions: one is the old `- [x]` row, two are blank lines. **All five inserted blank lines land inside the machine-owned span `163..747`** (sentinels at `:162` and `:748`). Identified by line number in the pre-repair file:

| Inserted blank line | Sits directly above |
|---|---|
| `:171` | `WHAT THIS TEXT ESTABLISHES, AND WHAT IT DOES NOT.` → `1.` |
| `:182` | `2. It does NOT prove the registry enumerates…` |
| `:193` | `3. Each entry's probes are EXAMPLES.` |
| `:196` | `4. The MEASURED SILENCE entries are NOT proven exhaustive` |
| `:199` | `5. WHAT CLAUSE-TO-BRANCH BINDING CANNOT PROVE` |

The two DELETED blank lines fall outside the span (one above the wave-34 correction, one below the END sentinel) and are irrelevant to the comparison.

## The span, restored from the generator

The span was replaced with exactly the 580 lines the `:9919` assertion printed between its own BEGIN EXPECTED and END EXPECTED markers. **It was not hand-repaired.** Cross-check of the shipped span against that printed text before the replacement showed only the five deletions and nothing else:

```
$ diff shipped-span.txt expected-span.txt
9d8
< 
20d18
< 
31d28
< 
34d30
< 
37d32
< 
```

That case re-run immediately after, GREEN:

```
✓ the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte 1ms
 Test Files  1 failed (1)
      Tests  1 failed | 431 passed (432)
```

## The pin, and which one moved

```diff
-  const CORE11_BOX_EXPECTED = "- [x] **CORE-11**";
+  const CORE11_BOX_EXPECTED = "- [ ] **CORE-11**";
```

That is the entire diff to the spec file in Task 1 — one line. The case's body and its full failure message were captured before and after and byte-compared:

```
$ diff box-case-before.txt box-case-after.txt
BOX CASE BODY: BYTE-IDENTICAL before/after
```

Every clause survives in the AFTER form, counted over the message: `e7cc4b6` ×1, `faca607` ×1, `character class` ×1, `DERIVED` ×2, `DRIFT-DETECTABLE` ×1, `THE SOLE BOUND` ×1, `SAME COMMIT` ×1, `IS A CORRECT OUTCOME` ×1.

**What moved is the PIN, into agreement with a ledger row that verification pass 8 adjudicated correct at `[ ]`, and CORE-11's checkbox did not move — no character of it changed in this plan.**

**Commit `4105fd0` moved the ledger row without moving `CORE11_BOX_EXPECTED`, breaking the same-commit rule that the constant's own failure message states, and this wave repaired that pairing after the fact and records it here rather than performing it as routine housekeeping.**

### The checkbox, asserted EMPTY by diff

```
$ git diff -U0 .planning/REQUIREMENTS.md | grep -E '^[+-]- \[[ x]\] \*\*CORE-11\*\*'
(no output — checkbox byte-unchanged)

$ grep -cE '^- \[[ x]\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
1

$ sed -n '46p' .planning/REQUIREMENTS.md | cut -c1-30
- [ ] **CORE-11**: No code tha
```

That `grep -cE` gate is **STATE-AGNOSTIC on purpose** — WR-34 found that the one case named for CORE-11's box matched it with the character class `[ x]`, which accepts a space OR an `x`, and a verify demanding `[x]` would be pressure on a discharge rather than a check of it; the SUITE's pin stays state-sensitive through `CORE11_BOX_EXPECTED`, which is the constant this wave moved.

Row 46 was also byte-compared whole against pre-plan HEAD `3660710`:

```
$ cmp row46.pre row46.post
ROW 46 (checkbox + first sentence + whole row) BYTE-IDENTICAL to pre-plan HEAD
```

## The 2026-08-26 ledger correction

Placed at `:162`, below wave 35's correction and above the generated-residual begin sentinel (now at `:170`). Neither sentinel marker line is reproduced in its prose — confirmed by the extraction cases running green rather than by inspection.

Quoted VERBATIM, the sentences the plan requires:

> **CRITERIA (1) AND (2) WERE FOUND DISCHARGED, WITH NO EVIDENCE AGAINST EITHER, AND THAT IS RECORDED HERE AS A RESULT RATHER THAN LEFT IMPLIED BY THE ABSENCE OF A COMPLAINT.** Verification pass 8 looked for a quietly-lowered bar wearing a re-scope's clothes and did not find one, and it looked for evidence against criteria (1) DERIVED and (2) DRIFT-DETECTABLE and found none — its words are *"Criteria (1) and (2) are genuinely discharged. I found no evidence against either and I tried."*

> **CRITERION (3) THE SOLE BOUND IS THE BLOCKING CRITERION, AND IT IS UNMET ON THREE LEGS, EACH NAMED BY ITS FINDING ID SO THAT CLOSING THEM IS AUDITABLE ONE AT A TIME.** Leg one is **CR-17**: criterion (3)'s delivered mechanism is bypassable in a DECLARED phrasing. […] Leg two is **CR-18**: criterion (3)'s cross-surface check reported zero unmarked standing statements of the superseded position on the four reader surfaces, and the count is two […] Leg three is **CR-19**: the second of those two, `.planning/STATE.md`'s live `### Blockers` section, is not merely stale but FALSE […] Recorded BESIDE those three, and deliberately not among them, is **WR-48**, a WARNING and not a blocker […] so the ENFORCEMENT ERRS SAFE while the DESCRIPTION of it is wrong.

> **THIS `[ ]` IS A MEASURED RESULT WITH A NAMED BLOCKING CRITERION, IN THE TERMS WAVES 19, 28 AND 32 USED, AND IT IS NOT A DEFERRAL.** The distinction is the one this ledger has drawn each time the box stayed down: a deferral says the work was not attempted, and this says the discharge WAS attempted, WAS re-executed by a verifier who planted his own mutations, and FAILED on criterion (3) […]

**Re-read verdict on the re-scope:** the correction CITES the 2026-08-25 operator decision by date and plan and quotes its three criteria verbatim from it; no sentence in it re-derives, re-scopes or softens the bar, and none implies the gate is complete. Verdict: clean.

## CR-17 — the construct anchor

### The count, re-measured over the file's own bytes

```
$ node probe.mjs      # reimplements surfaceExemptionKeys against the file
OCCURRENCES: 29

$ (map entry count over HEADER_QUANTIFIER_EXEMPTIONS' own bytes)
lines 9007 .. 9072   reason-value lines: 29
```

Planning-time prediction: 29. Measured: 29 occurrences and 29 map entries. No disagreement.

### The recogniser set

Scanning BACKWARD from the occurrence's own line, whichever comes first:

1. **a declaration** — `const`, `let`, `var`, `function`, `class`, `type`, `interface`, `enum`, with or without `export` / `default` / `async`
2. **a fixture title** — `describe(` / `it(` / `test(`, including `.each` / `.skip` / `.only` / `.todo`
3. **a docblock open** — `/**`
4. **the header row above the rule of a ruled ASCII table or banner** — the rule itself names nothing, so the row above it is taken
5. **the opening line of a contiguous `//` comment block**

A header that names nothing on its own line (a bare `/**`, a rule of dashes) is walked FORWARD to the first line of the same construct that does name it. An occurrence resolving to no preceding construct returns the NAMED token `!NO-PRECEDING-CONSTRUCT!` rather than an empty string. **No shipped occurrence hit that path** — recogniser (5) is what resolves the four occurrences in the file's top header block, which the first four recognisers alone left unresolved.

### All 29 occurrences with the construct each resolved to

| # | line | construct anchor (masked, truncated at 64) |
|---|------|--------------------------------------------|
| 1 | 133 | `packages/backend/src/outbound-prohibition.spec.ts — CORE-11's wi…` |
| 2 | 134 | `packages/backend/src/outbound-prohibition.spec.ts — CORE-11's wi…` |
| 3 | 178 | `packages/backend/src/outbound-prohibition.spec.ts — CORE-11's wi…` |
| 4 | 235 | `packages/backend/src/outbound-prohibition.spec.ts — CORE-11's wi…` |
| 5 | 303 | `SPELLING (in receiver-key position) RESOLVED BY REPORTS` |
| 6 | 305 | `SPELLING (in receiver-key position) RESOLVED BY REPORTS` |
| 7 | 309 | `SPELLING (in receiver-key position) RESOLVED BY REPORTS` |
| 8 | 436 | `SPELLING (operator, by POSITION) RESOLVED BY REPORTS` |
| 9 | 468 | `SPELLING (operator, by POSITION) RESOLVED BY REPORTS` |
| 10 | 523 | `SPELLING (operator, by POSITION) RESOLVED BY REPORTS` |
| 11 | 600 | `SPELLING (operator, by POSITION) RESOLVED BY REPORTS` |
| 12 | 1838 | `Every non-spec module the plugin SHIPS, under either source root…` |
| 13 | 3042 | `WHAT A READABLE KEY IS — DEFINED EXACTLY ONCE, CALLED FROM EVERY…` |
| 14 | 3043 | `WHAT A READABLE KEY IS — DEFINED EXACTLY ONCE, CALLED FROM EVERY…` |
| 15 | 3152 | `EVERY string an expression can denote: the literal itself, or th…` |
| 16 | 5938 | `THE DECLARED QUANTIFIER PHRASINGS.` |
| 17 | 5938 | `THE DECLARED QUANTIFIER PHRASINGS.` |
| 18 | 5939 | `THE DECLARED QUANTIFIER PHRASINGS.` |
| 19 | 5988 | `export const QUANTIFIED_CLAUSES: Readonly<Record<string, string>…` |
| 20 | 5990 | `export const QUANTIFIED_CLAUSES: Readonly<Record<string, string>…` |
| 21 | 5990 | `export const QUANTIFIED_CLAUSES: Readonly<Record<string, string>…` |
| 22 | 7364 | `it.each([` |
| 23 | 7489 | `CR-10, shape 1, and the mechanism named in the title is the whol…` |
| 24 | 7512 | `it('through constStrings\' WHOLE-FILE BINDINGS, {q8} — THE MIRRO…` |
| 25 | 7517 | `THE MIRROR OF THE WIDENING, ASSERTED RATHER THAN LEFT FOR NEXT R…` |
| 26 | 7566 | `CR-10, shape 4, and the sharpest of the five because the lesson …` |
| 27 | 7740 | `it("through {q8} and literalOf together: THE WIDENING CREATED NO…` |
| 28 | 9634 | `THE LIST IS CHECKED AGAINST THE UNIVERSALS THIS ROUND FALSIFIED,…` |
| 29 | 9659 | `const row = RESOLVER_REGISTRY.find((r) => r.id === id);` |

None resolved to nothing; none was silently defaulted.

### Three keys, BEFORE and AFTER

| | BEFORE | AFTER |
|---|---|---|
| **the fully-masked one, `:436`** | `"{q2} :: q2"` | `"SPELLING (operator, by POSITION) RESOLVED BY REPORTS §§ {q2} :: q2"` |
| `:303` | `'k = "requests"; sdk[k] {q8} :: q8'` | `'SPELLING (in receiver-key position) RESOLVED BY REPORTS §§ k = "requests"; sdk[k] {q8} :: q8'` |
| `:5988` | `"\"Bounded by DECLARATION ORDER inside the single collect pass, and by the branches that write the… :: q1"` | `'export const QUANTIFIED_CLAUSES: Readonly<Record<string, string>… §§ "Bounded by DECLARATION ORDER inside the single collect pass, and by the branches that write the… :: q1'` |

The replacement for `"{q2} :: q2"` **names the ASCII table it was written for** — the operator-position spelling table whose header row is `SPELLING (operator, by POSITION)   RESOLVED BY   REPORTS`.

### The checks, all executed and green

```
✓ the gate file's own bytes carry NO declared phrasing outside the three exclusions except by NAMED exemption
✓ no exemption key's ANCHOR reduces to nothing — a fully-masked anchor names no construct and no line
✓ exclusion three carries ONLY clause strings  (clause-count equality, unchanged)
```

- **no-verbatim-phrasing check** (`:9681` pre-edit): GREEN. Zero of the nine declared phrasings appears verbatim in any of the 29 new keys — the construct anchor is masked through `maskQuantifiers` like the line anchor.
- **`missing`**: empty.
- **`stale`**: empty.
- **count equality**: `foundKeys.length === declared.length` holds at the new key format — **29 = 29**.

### The keys-only diff verdict

The 29 reason blocks were extracted from HEAD's version of the file and from the new one and compared as raw source:

```
old reason blocks: 29   new: 29
REASON STRINGS CHANGED: 0
```

**Zero reason strings changed.** All 29 pairings resolved unambiguously by matching each new key's LINE half against the old key byte-for-byte — **no entry needed its pairing resolved by the printed line number**.

### The fifth numbered LIMIT, quoted verbatim

```
 * (5) THE CONSTRUCT ANCHOR REACHES THE NEAREST PRECEDING CONSTRUCT AND NO
 *     FURTHER. Added at wave 36 for CR-17. A key now carries the masked
 *     construct its occurrence sits under, so an exemption written for one
 *     construct is NOT discharged by an occurrence sitting under a DIFFERENT
 *     one. IT DOES NOT FOLLOW THAT AN EXEMPTION CANNOT BE DISCHARGED BY A
 *     DIFFERENT OCCURRENCE: TWO OCCURRENCES UNDER THE SAME CONSTRUCT REMAIN
 *     INTERCHANGEABLE, separated only by the positional `#N` ordinal, which is
 *     assigned by scan order rather than by line. THAT RESIDUAL IS UNGUARDED,
 *     and it is stated as a limit here rather than as a satisfied check. The
 *     anchoring removes ONE relocation shape. It does not close the class, it
 *     does not widen limit (1)'s phrase list, it does not change limit (2)'s
 *     normalization, and it reaches none of the surfaces limit (3) leaves out.
```

### The second mechanism, and why it checks the anchor as a whole

The fully-masked-anchor rule is its OWN named `it(...)`, separate from the discharge case. **This is the verifier's option (2) taken IN ADDITION to option (1), not instead of it** — two independent mechanisms fail independently; one mechanism wearing two names fails once.

It checks the anchor AS A WHOLE rather than each half, and that is narrower than checking both. One shipped occurrence — the wrapped ASCII-table cell at `:436`, whose entire normalized content IS a declared phrasing — has a line half that legitimately reduces to nothing, and its construct half is what names it. A key whose WHOLE anchor reduces to nothing names neither.

Its full failure message, as observed RED under mutation M2:

```
AssertionError: exemption key "{q2} §§ {q2} :: q2" carries an ANCHOR that reduces to NOTHING once its `{qN}` tokens, whitespace and punctuation are removed. An anchor made only of mask tokens names no construct and no line, so the entry is discharged by ANY occurrence whose normalized form masks to the same shape — wherever in this file that occurrence sits. That is how a fabricated hand-written bound was planted 9,001 lines from the cell its exemption was written for, with the suite reporting 432 of 432 green (CR-17, verification pass 8). Rebuild the entry with `exemptionKeyFor` rather than hand-writing a key; it derives the construct anchor for you. If the occurrence's own line genuinely normalizes to a bare declared phrasing, that is fine — the construct half is what names it — but if BOTH halves mask away, the line is the defect: REWRITE the sentence so it says what it is about, or DELETE it.: expected 0 to be greater than 0
```

### Synthetic phrasings

**No new code in this wave spells a declared phrasing as a literal.** The new case needs none — it inspects declared keys only, and the shipped keys are already masked. Measured over every added line of the diff, each of the nine phrasings occurs **0** times. The whole-file guard's green run is the evidence.

## The two mutation proofs — ONE TABLE, run order stated

Run order: **M1 first, at the Task 1 boundary, after `6c2c5ce`. M2 second, at the Task 2 boundary, after `3e00eb3`.** Each was planted only after its own work was committed, and `git diff --exit-code` was shown clean between them.

| | M1 — the box pin | M2 — a fully-masked anchor |
|---|---|---|
| `git log --oneline -1` before | `6c2c5ce fix(01-36): restore the floor — span regenerated, pin brought into agreement, blocking criterion named` | `3e00eb3 fix(01-36): CR-17 — an exemption key carries the construct it was written for` |
| mutation | `.planning/REQUIREMENTS.md:46` moved to `- [x] **CORE-11**`, away from what the constant now pins | one exemption key rewritten from `"SPELLING (operator, by POSITION) RESOLVED BY REPORTS §§ {q2} :: q2"` to `"{q2} §§ {q2} :: q2"` |
| suite | `Tests  1 failed \| 431 passed (432)` — exit 1 | `Tests  2 failed \| 431 passed (433)` — exit 1 |
| RED title | `CORE-11's entry is present and well-formed, and ITS BOX IS THE STATE \`CORE11_BOX_EXPECTED\` PINS` | `no exemption key's ANCHOR reduces to nothing — a fully-masked anchor names no construct and no line` |
| assertion message | pasted in full below | pasted in full above |
| restore | `git checkout -- .planning/REQUIREMENTS.md` | `git checkout -- packages/backend/src/outbound-prohibition.spec.ts` |
| `git diff --exit-code` | `DIFF EXIT=0 (0 = clean)` | `DIFF EXIT=0 (0 = clean)` |
| re-run green | `Tests  432 passed (432)` — exit 0 | `Tests  433 passed (433)` — exit 0 |

**M1's FULL assertion message, with both revert hashes:**

```
AssertionError: CORE-11's checkbox in .planning/REQUIREMENTS.md is not the state this suite pins.
  PINNED  : - [ ] **CORE-11**
  SHIPPED : - [x] **CORE-11**: No co

This box has been flipped early and REVERTED TWICE — at `e7cc4b6` after gap-closure round 3 and at `faca607` after round 4 — and until 2026-08-24 the one case named for it could not see it: its regex was the character class `[ x]`, which matches BOTH states, so it stayed green through both flips and both reverts.

THE TERMINAL CONDITION WAS RE-SCOPED BY THE OPERATOR ON 2026-08-25 (plan 01-35, wave 35) AND WHAT FOLLOWS IS THE CURRENT ONE. […] `CORE11_BOX_EXPECTED` changes in the SAME COMMIT as the ledger row, and only after a discharge in which EACH of three criteria was verified BY EXECUTION in that session: (1) DERIVED […]; (2) DRIFT-DETECTABLE […]; (3) THE SOLE BOUND […]. Editing this constant on its own is NOT a way out and never was. […] If ANY criterion is unmet, the box stays `[ ]`, the blocking criterion is named in the ledger, and this constant says `[ ]`. `[ ]` IS A CORRECT OUTCOME; an unexamined `[x]` is not.: expected false to be true // Object.is equality
```

Note the direction: the pin now reads `[ ]` and the mutation is an `[x]` on the row. That is the pin doing its job in the direction that matters for a fourth unearned flip.

## What did NOT move — asserted by byte comparison against HEAD

| Region | Result |
|---|---|
| `closingBracketAfter` | **EMPTY DIFF** (2 lines) |
| the `EXCLUSIONS` array, with all three `band` pairs and all three `proof` tokens | **EMPTY DIFF** (38 lines) |
| the exclusion-three clause-count equality case | **EMPTY DIFF** (26 lines) |
| `Measured at wave 33: 12 and 12` | count 1 → 1, UNCHANGED |
| `band: [100, 1500]` / `band: [5, 40]` / `band: [500, 3000]` | each count 1 → 1, UNCHANGED |
| `proof: 'id: "constStrings"'` / `proof: "export const UNBOUNDED_QUANTIFIERS"` | each count 1 → 1, UNCHANGED |
| CORE-11's checkbox and its whole row 46 (first sentence included) | **BYTE-IDENTICAL** to pre-plan HEAD `3660710` |
| `.planning/STATE.md` | **EMPTY DIFF** across `3660710..HEAD`; also unchanged in the working tree since task start |

`closingBracketAfter` and exclusion three's real end remain an open MEASUREMENT owned by plan 01-37 (WR-48). No exclusion was widened, no band moved, and no exemption entry was minted for this wave's own prose.

## The full gate set, run by hand at both task boundaries

No git hooks exist in this repo (`.git/hooks` holds only samples; `core.hooksPath` unset), so nothing ran the set at a commit boundary.

| Gate | Task 1 boundary | Task 2 boundary (final) |
|---|---|---|
| `pnpm vitest run …/outbound-prohibition.spec.ts` | `432 passed (432)` exit 0 | `433 passed (433)` exit 0 |
| `pnpm test` | `31 files / 1372 tests` exit 0 | `31 files / 1373 tests` exit 0 |
| `pnpm typecheck` | exit 0 | exit 0 |
| `pnpm lint` | exit 0 | exit 0 |
| `pnpm knip` | exit 0 | exit 0 |
| `pnpm build:backend && pnpm check:bundle` | `packages/backend/dist/index.js: 1 import specifier(s): crypto` | `packages/backend/dist/index.js: 1 import specifier(s): crypto` |
| real-tree walk over both `SOURCE_ROOTS` | 23 files walked, 0 violations | 23 files walked, 0 violations |

The outbound suite's new count is **433**, one above the 432 floor, and the floor is stated as **no fewer than** rather than as an equality.

## Files Created/Modified

- `.planning/REQUIREMENTS.md` — machine-owned span at `163..747` restored from `deriveResidual(RESOLVER_REGISTRY)`; the 2026-08-26 correction appended at `:162`. CORE-11's checkbox and row-46 prose byte-unchanged.
- `packages/backend/src/outbound-prohibition.spec.ts` — `CORE11_BOX_EXPECTED` moved to `- [ ] **CORE-11**`; `nameableRemainder`, `NO_PRECEDING_CONSTRUCT`, `EXEMPTION_ANCHOR_SEP` and `constructAnchorFor` added beside `exemptionKeyFor`; `exemptionKeyFor` now takes `(lines, lineNumber, quantifierIndex)` and folds the construct anchor into the key; the fully-masked-anchor case added; the fifth numbered LIMIT added; all 29 exemption keys regenerated with reasons byte-identical.

## Decisions Made

1. **The pin moved and the box did not.** `CORE11_BOX_EXPECTED` was brought into agreement with an already-`[ ]` row that verification pass 8 adjudicated correct. Bringing a pin into agreement with an adjudicated state is not a fourth flip of the box, and the SUMMARY says so in one sentence so a later reader cannot take it for one.
2. **The construct anchor is folded INTO the key, not checked beside it.** The three discharge checks match keys as flat strings, so a key carrying its construct makes all three construct-sensitive with no change to their logic, and the count equality still balances at exactly one entry per occurrence. No fourth check consulting `f.line` was added — that would be a second mechanism for the same fact.
3. **The fully-masked-anchor case checks the anchor as a whole.** The `:436` ASCII-table cell legitimately masks its line half away, and its construct half is what names it. Checking each half independently would fail a shipped, correct entry.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] An inadvertent `git stash push` removed the Task 2 working-tree edits mid-task**

- **Found during:** Task 2 (while probing whether HEAD's version of the spec file was Prettier-clean)
- **Issue:** A `git stash push -- packages/backend/src/outbound-prohibition.spec.ts` was issued as part of a compound probe command. It succeeded, silently moving the in-progress construct-anchor edits off the working tree. `grep -c constructAnchorFor` immediately returned `0`.
- **Fix:** Verified `git stash list` held exactly ONE entry, created seconds earlier and self-identified by its message (`WIP on main: 6c2c5ce …`, my own Task 1 commit). Popped it and re-verified all three edits by content: `constructAnchorFor` ×2, the new case ×1, limit (5) ×1. `.planning/STATE.md` and `.planning/config.json` were also restored and byte-compared against the task-start snapshot — unchanged.
- **Files modified:** none beyond recovery — the tree was returned to its exact pre-stash state.
- **Verification:** `git stash list` empty afterwards; `diff STATE.at-task-start.md .planning/STATE.md` empty; all subsequent gates green.
- **Committed in:** no separate commit — the recovered edits landed in `3e00eb3`.

**2. [Rule 2 - Missing Critical] One added sentence could be over-read as claiming no key can carry an empty anchor**

- **Found during:** Task 2, during the mandatory no-overclaim re-read of every added sentence
- **Issue:** The `constructAnchorFor` docblock read *"so a resolved anchor is never empty by construction"*. That is true of the BUILDER's output, but a reader could take it as "no key can be empty", which is wider than what is executed — a hand-written key still can be. That gap is this phase's signature defect.
- **Fix:** Rewritten. BEFORE: `* it, so a resolved anchor is never empty by construction.` AFTER: `* it, so an anchor THIS BUILDER resolves is never empty. A key WRITTEN BY HAND` / `* still can be, and that shape is forbidden outright by a separate case rather` / `* than left to this derivation.`
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** suite re-run 433/433; typecheck, lint exit 0; Prettier clean.
- **Committed in:** `3e00eb3`

**No-overclaim re-read verdict:** every sentence added by this wave — the fifth LIMIT, the four new docblocks, the new case's comment block and its failure message — was re-read against the prohibition *"MUST NOT state or imply that construct anchoring closes the relocation class."* One sentence required the rewrite above. All others state the reach and the residual in the same breath. **Verdict: clean after one rewrite, and that rewrite is itself recorded as a finding.**

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** No scope change. The first was a recovery with the tree verifiably returned to its exact prior state; the second is exactly the discipline the plan's `DISCLOSED, NOT CLOSED` prohibition exists to enforce, caught by the re-read the plan mandated.

## Prediction vs measurement

Recorded in the shape `01-27-SUMMARY.md` uses. **Every numeric prediction in the plan held. One environmental fact differed and it is recorded rather than absorbed.**

| Prediction | Measured | Verdict |
|---|---|---|
| HEAD is `4105fd0` | HEAD is `3660710` | **DIFFERENT — recorded.** `4105fd0` is an ancestor; the three commits since (`8aa7123`, `9fbd896`, `3660710`) are planning docs only and touch neither `.planning/REQUIREMENTS.md` nor `packages/`, verified by `git diff --stat 4105fd0..HEAD`. The diagnosis written against `4105fd0` therefore holds unchanged. Cross-checked before being trusted, per the wave-31 lesson. |
| outbound suite: 432 tests, 2 failed, 430 passed | 432 / 2 failed / 430 passed | exact |
| `pnpm test`: 31 files with 1 failed, 1372 tests with 2 failed | 31 files, 1 failed; 1372 tests, 2 failed | exact |
| the two RED cases are `:9919` (ledger bytes) and `:9947` (box) | exactly those two | exact |
| `4105fd0` inserted 5 blank lines inside `163..747` | 5, at `:171`, `:182`, `:193`, `:196`, `:199` | exact |
| exemption entry count is 29 | 29 occurrences and 29 map entries | exact |
| no exclusion needs to move | none moved; all three regions EMPTY DIFF | exact |
| the key-format change invalidates all 29 keys | `missing` 29, `stale` 29 on the first post-change run | exact |
| the outbound suite rises above 432 | 433 | exact (+1, the new case) |

One further measured fact worth recording because it shaped an implementation choice, though the plan made no prediction about it: **the first four recognisers left four occurrences (`:133`, `:134`, `:178`, `:235`) resolving to NO preceding construct**, because they sit in the file's top `//` header block above any declaration. A fifth recogniser — the opening line of a contiguous `//` comment block — resolves them to the file header. The `!NO-PRECEDING-CONSTRUCT!` path exists and is named, but no shipped occurrence reaches it.

## Issues Encountered

The `git stash` incident above, resolved and documented as deviation 1. Nothing else.

## Scope statements the plan requires, stated once each

**What moved is the PIN, into agreement with a ledger row verification pass 8 adjudicated correct, and CORE-11's checkbox did not move — it is `[ ]` and byte-identical to its pre-plan form.**

**Commit `4105fd0` broke the same-commit rule that `CORE11_BOX_EXPECTED`'s own failure message states — it moved the ledger row without the constant — and this wave repaired that pairing after the fact and records the breach with its hash rather than performing the repair as routine housekeeping.**

**Construct anchoring removes the CROSS-CONSTRUCT relocation shape and NOT the SAME-CONSTRUCT one: two occurrences under the same construct remain interchangeable behind a positional `#N` ordinal assigned by scan order, and the guard's phrase-list reach, its normalization convention and the surfaces it does not reach are all unchanged by this wave.**

**The must-NOT did not move — CORE-11's first sentence is byte-identical, 23 files over both `SOURCE_ROOTS` report ZERO violations, and the shipped bundle's entire import set is one specifier, `crypto` — and every finding this wave touched is a defect in a test-only gate's description of itself or in one planning document.**

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Ready for 01-37 (WR-48):** `closingBracketAfter` and exclusion three's real end are untouched and remain an open measurement. The failing-path fixture for the relocation mutation is 01-37 Task 1's and was deliberately not run here.
- **Ready for 01-38 (CR-18, CR-19):** `.planning/REQUIREMENTS.md:46`'s residue and `.planning/STATE.md`'s three stale blocker lines are both byte-unchanged by this wave.
- **CORE-11 remains `[ ]`.** Two of criterion (3)'s three legs are still open. Whether the box may move is verification pass 9's call after all three are closed and re-measured; nothing in this plan flips it.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-26*
