---
phase: 01-skeleton-persistence-compatibility
plan: 38
subsystem: testing
tags: [core-11, outbound-prohibition, requirements-ledger, state-md, windows-ledger, gap-closure, criterion-3]

requires:
  - phase: 01-36
    provides: the restored floor, the regenerated machine-owned span, CORE11_BOX_EXPECTED at `- [ ] **CORE-11**`, and CR-17's construct anchoring
  - phase: 01-37
    provides: CR-17's cross-construct relocation fixture, `closingBracketAfter` fixed, exclusion three narrowed to 4135..5767 with the 117 restored lines measured at zero new obligations
provides:
  - "CORE-11's ledger row reduced to the prohibition plus one dated pointer clause, carrying no statement of the box's state and no bound"
  - "a dated 2026-08-26 history block holding all three removed passages byte-identical"
  - "eight scoped supersession markers over the ledger's standing statements, each a pure insertion"
  - "three corrected `### Blockers` lines in .planning/STATE.md, the false one corrected against six probes re-executed in this session"
  - "eleven scoped markers over .planning/STATE.md's measured occurrences plus one new 2026-08-26 pointer amendment for waves 36-38"
  - "criterion (3)(d)'s cross-surface check re-run as a pasted enumeration, WITH A NON-CLEAN RESULT: two surviving unmarked occurrences on the gate file's own header"
  - "WINDOWS.md entry 40 superseded and entry 41 appended, through the tool only"
affects: [verification pass 9, any future wave touching CORE-11's ledger row or STATE.md's blockers]

actuals:
  tokens: 36512
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "the pointer-not-a-bound route applied to a ledger ROW: remove every statement of a fact the row is not the authority for, and point at the two places that are"
    - "history preserved by RELOCATION, proved by a file-wide grep that still finds what a row-scoped grep no longer does"
    - "the two-valued disposition rule applied at LINE granularity rather than BLOCK granularity, on wave 35's own precedent"

key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/WINDOWS.md
    - .planning/ROADMAP.md

key-decisions:
  - "HISTORY requires a date AND a plan attribution in the OCCURRENCE'S OWN BYTES, not in a governing block header — decided on wave 35's own precedent, where the marker at :110 supersedes :112, a paragraph sitting inside a dated 2026-08-24 plan-01-32 block. A block header does not confer HISTORY on its paragraphs."
  - "STATE.md's `:323` (HEAD-4105fd0 `:295`) classified STANDING and superseded in place, not marked as history: it carries no date and no plan attribution of its own, only a reference to wave 28 as a future flip owner."
  - "REQUIREMENTS.md `:108` (the `WHAT IS DIFFERENT FROM BOTH REVERTS` paragraph) classified STANDING and superseded, even though its box-state claim is TRUE: the paragraph is undated and unattributed, and its revert arithmetic is stale at three flips and three reverts."
  - "The two surviving occurrences the (3)(d) re-run found on the gate file were RECORDED and left open rather than repaired: the gate file is closed after plan 01-37 and this plan is prohibited from editing it."
  - "01-PROBE.md read and its equality confirmed in writing; the file is not edited and its EMPTY diff is the designed outcome."

patterns-established:
  - "A cross-surface verdict is stated at the reach of the mechanism that produced it, with both classes of unreached surface named as unguarded limits in the same sentence."
  - "A correction to a live blocker re-executes the blocker's own probes in the correcting session; a correction that cites a report is discharge-by-citation."

requirements-completed: []

coverage:
  - id: D1
    description: "CORE-11's ledger row carries no statement of the box's state and no bound, and points instead"
    requirement: CORE-11
    verification:
      - kind: other
        ref: "row-scoped grep over the row extracted by pattern for all three removed literals"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every passage removed from the row survives byte-identical in a dated 2026-08-26 history block"
    requirement: CORE-11
    verification:
      - kind: other
        ref: "file-wide grep for each of the three removed literals: 1, 1, 2"
        status: pass
    human_judgment: false
  - id: D3
    description: "The live blockers in .planning/STATE.md are true as measured in this session"
    requirement: CORE-11
    verification:
      - kind: other
        ref: "six shapes re-executed through auditSource; registry re-counted at 26 measured-silence rows of 61"
        status: pass
      - kind: other
        ref: "awk '/^### Blockers/,0' | grep -c 'all report NOTHING' == 0 and 'wave 28 owns the CORE-11 checkbox flip' == 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "Criterion (3)(d)'s cross-surface check re-run over four reader surfaces"
    requirement: CORE-11
    verification: []
    human_judgment: true
    rationale: "The re-run's own result is NON-CLEAN — two surviving unmarked occurrences on packages/backend/src/outbound-prohibition.spec.ts, a file this plan is prohibited from editing. Whether that reopens criterion (3), and whether the gate file's header must be corrected in a further wave, is a verifier's determination and not this plan's."
  - id: D5
    description: "The round recorded on both append-only histories through pointers that restate no bound"
    verification:
      - kind: other
        ref: "gsd-tools windows append + gsd-tools windows fixed 40; open 19 / waived 0 / fixed 22 / total 41"
        status: pass
    human_judgment: false

duration: 21 min
completed: 2026-08-26
status: complete
---

# Phase 01 Plan 38: CR-18, CR-19 and criterion (3)(d)'s re-run Summary

**CORE-11's ledger row reduced to the prohibition plus a pointer with its three removed passages relocated byte-identical, `.planning/STATE.md`'s false six-shapes blocker corrected against six probes re-executed through `auditSource` in this session, and criterion (3)(d)'s cross-surface check re-run as a pasted enumeration that came back NON-CLEAN — two surviving unmarked statements of the box's state in the gate file's own header, recorded rather than repaired.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-08-26T10:53:00Z
- **Completed:** 2026-08-26T11:14:16Z
- **Tasks:** 3
- **Files modified:** 4

## Task Commits

1. **Task 1: CR-18 — the row reduced to a pointer, passages relocated** — `a35797e` (docs)
2. **Task 2: CR-19 — the live blockers corrected against six re-executed probes** — `ed5827e` (docs)
3. **Task 3: the closing pass — (3)(d) re-run, WINDOWS, probe ledger, roadmap, floor** — `2cf9e83` (docs)

---

## 0. PRECONDITION, ASSERTED AND PASTED BEFORE THE FIRST EDIT

```
$ git rev-parse HEAD
9c2028178414bbfe0b6772915811da78e404d077

$ ls .planning/phases/01-skeleton-persistence-compatibility/01-3{6,7}-SUMMARY.md
-rw-r--r--@ 1 six2dez  staff  42071 26 Aug 12:21 .../01-36-SUMMARY.md
-rw-r--r--@ 1 six2dez  staff  51114 26 Aug 12:49 .../01-37-SUMMARY.md

$ pnpm test
 Test Files  31 passed (31)
      Tests  1374 passed (1374)
pnpm test exit: 0

$ pnpm exec vitest run -t "byte for byte"
 ✓ .../outbound-prohibition.spec.ts > ... > the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte 2ms
 ✓ .../outbound-prohibition.spec.ts > ... > the block shipped in the gate header equals deriveResidual(RESOLVER_REGISTRY), byte for byte 1ms
 Test Files  1 passed | 30 skipped (31)
      Tests  2 passed | 1372 skipped (1374)
chain exit=0

$ git status --porcelain packages/ .planning/
 M .planning/config.json
?? .planning/milestone.lock
?? .planning/phases/00-runtime-reality-check/00-VERIFICATION.md
?? .planning/phases/00-runtime-reality-check/results/runs/recorder-20260820T180307Z/
?? .planning/phases/01-skeleton-persistence-compatibility/results/runs/20260821T075936Z-12874/
```

**`packages/` is clean.** The one modified path is the PRE-EXISTING two-line `.planning/config.json` harness setting (`use_worktrees: false`, `_auto_chain_active: false`) that predates this round; wave 37 recorded it rather than halting on it and this wave did the same. It is neither committed nor reverted here. The four untracked paths are also pre-existing. Both byte comparisons green → the precondition is MET and no halt was raised.

---

## 1. TASK 1 — THE LEDGER ENUMERATION, EXECUTED OVER `.planning/REQUIREMENTS.md`'s OWN BYTES

### 1.1 The plan's own ledger grep, re-run, output pasted

```
$ grep -nE 'THE BOX IS DELIBERATELY|WHY THE BOX IS|THE BOX IS STILL|THE BOX IS READ OFF|WHAT THIS `\[x\]` MEANS|owns the flip|CORE-11.s box' .planning/REQUIREMENTS.md
46:- [ ] **CORE-11**: No code that ships in the plugin issues an outbound network request in this phase — no `caido:http` fetch, no `sdk.requests.send` in any s
52:**WHY THIS ENTRY CARRIES THE TEXT AND NOT A POINTER.** This is the text a requirement's COMPLETION is read against, and it is the copy that drifted through f
60:**THE BOX IS DELIBERATELY STILL `[ ]`.** Plan 01-27 does not flip it and does not argue that it could be flipped; wave 28 owns the flip, and only against the
72:**THE BOX IS STILL `[ ]` AND THIS PLAN DID NOT TOUCH IT.** Wave 32 owns the flip and owns the discharge table it is flipped against. This plan closes two of
84:**THE BOX IS STILL `[ ]` AND THIS PLAN DID NOT TOUCH IT.** Wave 32 owns the flip and owns the discharge table it is flipped against. This plan closes the blo
86:**CORE-11 — CORRECTION 2026-08-24, PLAN 01-32 (gap-closure round 6, wave 32). THE BOX IS STILL `[ ]`, THE DISCHARGE TABLE WAS RE-EXECUTED ROW BY ROW IN THIS
98:**AND THE BOX IS STILL `[ ]`, BECAUSE THE TABLE IS NOT THE WHOLE ARITHMETIC AND FIVE ROWS ARE STILL BLOCKED.** WR-37 named five sibling shapes this plan deli
160:**THE BOX IS READ OFF THAT TABLE AND IT IS NOW `[x]`.** All three rows pass, row 3's carrying its scope. This row and `CORE11_BOX_EXPECTED` in `packages/bac
162:**WHAT THIS `[x]` MEANS AND WHAT IT DOES NOT, STATED HERE BECAUSE THE LEDGER IS WHERE AN OVERCLAIM DOES ITS DAMAGE.** It means the three criteria above, veri

$ grep -cE '<same pattern>' .planning/REQUIREMENTS.md
9
```

### 1.2 The disposition rule, and the decision it forced

Wave 35's rule is two-valued: **dated AND plan-attributed is HISTORY and stays byte-identical; undated, unattributed, written as a bound or as a present-tense fact rather than as a record, is STANDING and is superseded in place.**

The rule does not say at what granularity to read "dated and plan-attributed", and the file makes that decisive: `:60`, `:72`, `:84`, `:98` and `:106` all sit INSIDE dated, plan-attributed correction blocks (headers at `:48` plan 01-27, `:62` plan 01-30, `:74` plan 01-31, `:86` plan 01-32) while carrying no date in their own bytes. Reading the rule at BLOCK granularity would classify all five HISTORY and require no marker at all — the convenient answer, and the one that would let this re-run report clean without doing anything.

**DECIDED AT LINE GRANULARITY, ON WAVE 35's OWN PRECEDENT.** The existing scoped marker at `:110` supersedes `:112` — and `:112` sits inside the dated 2026-08-24 plan-01-32 block headed at `:86`. Wave 35 therefore already treated a paragraph inside a dated block as superseable. A block header does not confer HISTORY on its paragraphs. That is the rule applied throughout this SUMMARY, and it is recorded here rather than left implicit because the convenient reading was available and was rejected.

### 1.3 The enumeration table — one row per occurrence

| Line | Matched phrasing | Classification | Evidence for the classification | Disposition |
|---|---|---|---|---|
| `:46` passage A | `WHY THE BOX IS \`[ ]\` HERE` | STANDING (undated in its own bytes; names plan 01-23 in the body, no date) | no `CORRECTION YYYY-MM-DD, plan 01-NN` prefix | RELOCATED byte-identical to the history block; row-scoped grep now 0 |
| `:46` passage B | `THE BOX IS DELIBERATELY STILL \`[ ]\`, AND THE BLOCKING ROW IS NAMED` | HISTORY (`— CORRECTION 2026-08-24, plan 01-28` immediately precedes it) | date + plan in its own bytes | RELOCATED byte-identical — the pointer route removes it from the ROW; the bytes are not destroyed |
| `:46` passage C | `When this box is eventually \`[x]\`, it will mean …` | STANDING (future-tense bar, undated, unattributed) | no date, no plan | RELOCATED byte-identical |
| `:52` | `CORE-11's box was flipped against it once and reverted twice` | STANDING | no date, no plan; and STALE on its own arithmetic — `4105fd0` makes three reverts | scoped marker inserted above |
| `:60` | `THE BOX IS DELIBERATELY STILL \`[ ]\`.` … `wave 28 owns the flip` | STANDING at line granularity | undated bolded present-tense lead; block header at `:48` is dated but §1.2 rules that insufficient | scoped marker; STALE — wave 28 never flipped it |
| `:72` | `THE BOX IS STILL \`[ ]\` …` `Wave 32 owns the flip` | STANDING | same | scoped marker; STALE — wave 35 flipped it at `f5652a1` |
| `:84` | `THE BOX IS STILL \`[ ]\` …` `Wave 32 owns the flip` | STANDING | same | scoped marker; STALE |
| `:86` | `THE BOX IS STILL \`[ ]\`` inside `CORRECTION 2026-08-24, PLAN 01-32` | **HISTORY** | date AND plan in its own bytes | LEFT BYTE-IDENTICAL, unmarked — correct history |
| `:98` | `AND THE BOX IS STILL \`[ ]\` … FIVE ROWS ARE STILL BLOCKED` | STANDING | undated lead | scoped marker; the FRAMING is stale (the five rows are residuals under the 2026-08-25 bar, not blockers) |
| `:160` | `THE BOX IS READ OFF THAT TABLE AND IT IS NOW \`[x]\`` | STANDING | undated lead inside the dated `:148` block | scoped marker; FALSIFIED by `4105fd0` |
| `:162` | `WHAT THIS \`[x]\` MEANS AND WHAT IT DOES NOT` | STANDING | undated lead | reached by the same marker, which names both paragraphs; presupposes an `[x]` `4105fd0` removed |

**Nine lines, eleven passages** — `:46` carrying three. **RECONCILED EXACTLY against the planning-time target** of `:46 :52 :60 :72 :84 :86 :98 :158 :160` carrying eleven passages, with the two tail line numbers shifted `:158`→`:160` and `:160`→`:162` by wave 37's two-line insertion, exactly as wave 37's SUMMARY reported. **No disagreement on the floor.**

### 1.4 TWO OCCURRENCES BEYOND THE FLOOR — FINDINGS, NOT INHERITED OMISSIONS

The floor is a floor because the phrase set is a phrase set. A wider byte-level sweep over the same region (`grep -nEi 'box|flip|revert|\[x\]|checkbox'` over lines 1..162) found **two standing statements the ledger grep cannot see**:

| Line | The statement | Why the phrase set misses it | Classification | Disposition |
|---|---|---|---|---|
| `:106` | `` `[ ]` here is a MEASURED RESULT with five named blocking rows `` and `any future wave can discharge them by widening five initializer shapes and re-running this table` | spelled with a bare `` `[ ]` `` rather than any of the seven declared leads | STANDING — undated, unattributed, present-tense | scoped marker naming both clauses |
| `:108` | `A READER ARRIVING AFTER TWO REVERTS IS OWED IT EVEN WHEN THE ANSWER IS AGAIN \`[ ]\`` and, in the closing sentence, `it would have stayed green through both flips and both reverts` | opens `WHAT IS DIFFERENT FROM BOTH REVERTS`, matching no declared lead | STANDING — undated, unattributed, present-tense | scoped marker |

**`:108` DISPOSITIONED EXPLICITLY, WITH ITS REASONING.** Its box-state claim — that the answer is again `[ ]` — was TRUE when written and is STILL TRUE as measured on 2026-08-26. It is nonetheless superseded, on two independent grounds: (a) its arithmetic is stale — "TWO REVERTS" and "both flips and both reverts" are now three and three, at `e7cc4b6`, `faca607` and `4105fd0`; and (b) it is an undated, unattributed present-tense statement of the box's state on a surface whose row now carries no such statement, which is precisely the class the enumeration exists to catch. A true statement in the wrong place is still an unmarked standing statement, and marking it costs nothing but the marker.

`:106` is dispositioned on the second ground plus a third: the discharge route it prescribes — widen five initializer shapes, re-run this table — states the acceptance bar the operator re-scoped on 2026-08-25, the same drift `.planning/STATE.md`'s five-row line carried one file over.

**ELEVEN LINES TOTAL, NOT NINE.** The floor was correct as a floor and was exceeded as a total, which is the outcome the plan's own framing predicted and required to be reported as a finding.

### 1.5 Row-scoped counts, re-measured and reconciled

Measured over the row extracted by pattern (`grep '^- \[[ x]\] \*\*CORE-11\*\*'`), before the edit:

| Literal | Measured | Planning-time value | Reconciled |
|---|---|---|---|
| `SUPERSEDED` | 0 | 0 | ✓ |
| `2026-08-25` | 0 | 0 | ✓ |
| `2026-08-26` | 0 | 0 | ✓ |
| `CORRECTION 2026-08-24` | 4 | 4 | ✓ |

### 1.6 THE ROW'S NEW POINTER CLAUSE, QUOTED VERBATIM

> — CORRECTION 2026-08-26, plan 01-38 (gap-closure round 8, wave 38). THIS ROW STATES THE PROHIBITION AND POINTS; IT STATES THE BOX'S STATE NOWHERE, AND A ROW THAT CARRIES NO STATEMENT OF THE BOX'S STATE CANNOT CARRY A STALE ONE — the route verification pass 8 prescribed for CR-18, in its own words. THREE PASSAGES LEFT THIS ROW IN THIS CORRECTION and NONE was deleted: the passage opening `WHY THE BOX IS`, the passage opening `THE BOX IS DELIBERATELY STILL`, and the sentence opening `When this box is eventually` which stated the pre-2026-08-25 acceptance bar as this row's future condition. All three are preserved BYTE-IDENTICAL in the dated 2026-08-26 history block in this entry's narrative below, attributed to plan 01-38 and wave 38, and that block is where this pointer points; a ledger does not erase what it once asserted, and a row does not carry a bound. THE TWO PLACES THIS ROW DEFERS TO FOR THE BOX'S STATE are the CORRECTION 2026-08-26, PLAN 01-36 block below — where the criterion that blocks this box is recorded by number — and `CORE11_BOX_EXPECTED` in `packages/backend/src/outbound-prohibition.spec.ts`, which the suite asserts against this row's opening bytes and which changes only in the same commit as this row. THIS CLAUSE RESTATES NO BOUND: the bound of record is the machine-owned generated span below, byte-compared to `deriveResidual(RESOLVER_REGISTRY)` by the suite. It awards no verdict on the 2026-08-25 criteria, it does not move this checkbox, and both of those belong to a verifier reading the whole round's evidence.

### 1.7 RELOCATION PROVED BY GREP — the bytes moved, they were not lost

```
=== ROW-SCOPED GREPS (row extracted by pattern) ===
row-scoped [THE BOX IS DELIBERATELY STILL `[ ]`, AND THE BLOCKING ROW IS NAMED] = 0
row-scoped [WHY THE BOX IS `[ ]` HERE]                                          = 0
row-scoped [When this box is eventually `[x]`]                                  = 0

=== FILE-WIDE GREPS (relocation proof) ===
file-wide  [THE BOX IS DELIBERATELY STILL `[ ]`, AND THE BLOCKING ROW IS NAMED] = 1
file-wide  [WHY THE BOX IS `[ ]` HERE]                                          = 1
file-wide  [When this box is eventually `[x]`]                                  = 2
```

The third reads 2 because `:112`'s surviving limits paragraph carries the same opening without the comma; the relocated copy is the second. All three row-scoped counts are 0 and all three file-wide counts are ≥ 1 — **the bytes were relocated, not deleted.**

### 1.8 The dated history block, with its introductory sentence

> **CORE-11 — THE ROW'S OWN FORMER STATEMENTS OF THE BOX'S STATE, RELOCATED HERE BYTE-IDENTICAL ON 2026-08-26 BY PLAN 01-38 (GAP-CLOSURE ROUND 8, WAVE 38).** These three passages were removed from CORE-11's ledger row above in this wave's correction and are preserved here CHARACTER FOR CHARACTER, because a ledger does not erase what it once asserted and a row does not carry a bound; the row now points at this entry's narrative and at `CORE11_BOX_EXPECTED` instead of stating the box's state itself. They are a RECORD of what the row said and are not a statement of what is true now.
>
> > PASSAGE ONE, formerly in the row's plan 01-23 correction: WHY THE BOX IS `[ ]` HERE. Commit `faca607` reverted CORE-11 from `[x]` to `[ ]` for exactly this reason — …
> >
> > PASSAGE TWO, formerly the lead of the row's CORRECTION 2026-08-24, plan 01-28: THE BOX IS DELIBERATELY STILL `[ ]`, AND THE BLOCKING ROW IS NAMED.
> >
> > PASSAGE THREE, formerly in the row's plan 01-27 limits sentence: When this box is eventually `[x]`, it will mean the must-NOT holds, …
>
> **WHAT THIS BLOCK DOES NOT DO.** It restates no bound — the bound of record is the machine-owned generated span below, byte-compared to `deriveResidual(RESOLVER_REGISTRY)` by the suite. Passage three's future-tense bar was re-scoped by the operator on 2026-08-25 and is preserved here only as the row's own former text. Nothing in this block states that any criterion is discharged, that this box may move, or that the gate is complete.

### 1.9 EVERY MARKER A PURE INSERTION — proved by diff

```
$ git diff --numstat -- .planning/REQUIREMENTS.md
27	1	.planning/REQUIREMENTS.md

$ git diff -U0 -- .planning/REQUIREMENTS.md | grep '^-' | grep -v '^---'
-- [ ] **CORE-11**: No code that ships in the plugin issues an outbound network request in this
```

**EXACTLY ONE line removed** — the CORE-11 row itself, replaced by its edited self. All eight markers and the history block are pure insertions with the bytes above and below unchanged. Marker adjacency verified line by line: `:52`→`:54`, `:62`→`:64`, `:76`→`:78`, `:90`→`:92`, `:106`→`:108`, `:116`→`:118`, `:120`→`:122`, `:174`→`:176`/`:178`.

**One marker's scoping clause, quoted** (the `:174` marker over the revert-falsified pair):

> **SUPERSEDED IN PART BY COMMIT `4105fd0` OF 2026-08-26 AND MARKED HERE BY PLAN 01-38 (GAP-CLOSURE ROUND 8, WAVE 38) — THE MARKER IS SCOPED TO THE CLAUSE IT NAMES AND REACHES NOTHING ELSE.** What is superseded is TWO PARAGRAPHS BELOW, and only their statements about this box's state. … **THE REST OF BOTH PARAGRAPHS STANDS AND IS NOT TOUCHED BY THIS MARKER:** that a `✗` row would have held the box open with the blocking check named; that waves 19, 28 and 32 each held it open and each was later judged right to; that the 2026-08-25 bar is NARROWER than the old one and ends no class; that CR-15, CR-16 and the twenty-six measured silences remain NAMED RESIDUALS, disclosed and unclosed; that the prohibition in this entry's first sentence is byte-identical and still holds on 23 files across both `SOURCE_ROOTS` with ZERO violations, one import specifier in the shipped bundle, and `observations.ts`'s redaction byte-identical since round 5; and that STORE-03 and STORE-07 remain deferred with their owner. This marker records what a commit did. It awards no verdict on the 2026-08-25 criteria and does not state whether this box may move.

### 1.10 The things that had to NOT move, and their EMPTY diffs

```
$ diff <(git show HEAD~3:.planning/REQUIREMENTS.md | grep '^- \[[ x]\] \*\*CORE-11\*\*' | cut -c1-700) \
       <(grep '^- \[[ x]\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md | cut -c1-700)
EMPTY DIFF — CORE-11's first sentence and checkbox byte-identical

$ diff <(git show HEAD~3:.planning/REQUIREMENTS.md | grep -E '^- \[[ x]\] \*\*STORE-0[37]\*\*|STORE-0[37] — CORRECTION') \
       <(grep -E '^- \[[ x]\] \*\*STORE-0[37]\*\*|STORE-0[37] — CORRECTION' .planning/REQUIREMENTS.md)
EMPTY DIFF — STORE-03 and STORE-07 entries byte-identical

$ git diff --exit-code -- packages/backend/src/outbound-prohibition.spec.ts
GATE-FILE-UNTOUCHED

$ grep -cE '^- \[[ x]\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
1
$ grep -oE '^- \[[ x]\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
- [ ] **CORE-11**
```

The count gate is state-agnostic (`[ x]`), so an honest `[ ]` cannot fail it — and the glyph is `[ ]`, unchanged.

### 1.11 Neither sentinel reproduced

No prose added by this task contains either sentinel marker line. Confirmed by the suite: the extraction cases, the non-vacuity case, the entry-count case and both byte comparisons are all green.

### 1.12 THE VERDICT REVIEW, one line

Every sentence added by Task 1 was re-read against the prohibition on awarding a verdict. **VERDICT: no sentence added to `.planning/REQUIREMENTS.md` states or implies that criterion (3) is discharged, that the box may move, or that the gate is complete.** No rewrite was needed, so there is no before/after to paste.

### 1.13 MUTATION — the guard can still see the page this task wrote on

```
$ git log --oneline -1
a35797e docs(01-38): CR-18 — CORE-11's ledger row points instead of stating, …

=== PLANTING ONE-BYTE DRIFT INSIDE THE MACHINE-OWNED SPAN ===
planted: appended one byte 'X' inside the span's first line

$ pnpm exec vitest run -t "byte for byte"
 × packages/backend/src/outbound-prohibition.spec.ts > the residual is DERIVED — the registry is
   bound to the walk, and the shipped text to the registry > the block shipped in
   .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte 10ms
   → the derived residual block in .planning/REQUIREMENTS.md DIVERGED from
     deriveResidual(RESOLVER_REGISTRY).

     The GENERATED text is authoritative and the shipped text is the defect. Replace the span
     between the sentinels with exactly this:

     ----- BEGIN EXPECTED -----
     THE RESIDUAL OF CORE-11's OUTBOUND WALK - DERIVED, NOT AUTHORED.
     This text is the output of deriveResidual(RESOLVER_REGISTRY) in
     packages/backend/src/outbound-prohibition.spec.ts. It is machine-owned: a test
     reads this file's own bytes, extracts the span between the sentinels, and
     compares it to that output. If the two disagree the GENERATED text is
     authoritative and the shipped text is the defect.
     … [the full generated span follows in the assertion message — RESOLVERS - 35 entries,
        then the measured silences, then the four limits] …
     ----- END EXPECTED -----

$ git checkout -- .planning/REQUIREMENTS.md
$ git diff --exit-code -- .planning/REQUIREMENTS.md
RESTORED — git diff --exit-code over .planning/REQUIREMENTS.md CLEAN
```

The work was committed at `a35797e` BEFORE the mutation was planted, so the mutation could only destroy itself. The whole-tree `git diff --exit-code` was NOT clean — it reported the pre-existing `.planning/config.json` harness setting, so the check was scoped to the mutated file and the config path was recorded rather than reverted.

---

## 2. TASK 2 — CR-19, CORRECTED AGAINST EXECUTION

### 2.1 THE SIX PROBES, RE-EXECUTED THROUGH `auditSource` IN THIS SESSION

Run before a word of the correction was written, through the exported `auditSource` at `packages/backend/src/outbound-prohibition.spec.ts:2798`:

```
=== SIX SHAPES, RE-EXECUTED THROUGH auditSource ON 2026-08-26 ===
SHAPE: (ok && globalThis).fetch(url)
  violations: 1  rules: ["outbound-fetch"]
SHAPE: (globalThis ?? self).fetch(url)
  violations: 1  rules: ["outbound-fetch"]
SHAPE: (globalThis || self).fetch(url)
  violations: 1  rules: ["outbound-fetch"]
SHAPE: (b ? globalThis : self).fetch(url)
  violations: 1  rules: ["outbound-fetch"]
SHAPE: (ok && window).fetch(url)
  violations: 1  rules: ["outbound-fetch"]
SHAPE: (ok && navigator).sendBeacon(u, d)
  violations: 1  rules: ["outbound-beacon"]
```

| Shape | What the blocker line CLAIMED | What EXECUTION returned, 2026-08-26 |
|---|---|---|
| `(ok && globalThis).fetch(url)` | reports NOTHING | `outbound-fetch` |
| `(globalThis ?? self).fetch(url)` | reports NOTHING | `outbound-fetch` |
| `(globalThis || self).fetch(url)` | reports NOTHING | `outbound-fetch` |
| `(b ? globalThis : self).fetch(url)` | reports NOTHING | `outbound-fetch` |
| `(ok && window).fetch(url)` | reports NOTHING | `outbound-fetch` |
| `(ok && navigator).sendBeacon(u, d)` | reports NOTHING | `outbound-beacon` |

**Six of six report.** No shape failed to report, so no first-order finding was raised and the correction's content is what the plan anticipated. The temporary probe spec was deleted after the run and `git status --porcelain tests/` is empty.

### 2.2 THE REGISTRY, RE-MEASURED

```
=== REGISTRY: kind === 'measured-silence' ROWS ===
COUNT: 26
   1. silence-two-hop-key                        14. silence-for-of-binding-receiver
   2. silence-function-boundary                  15. silence-tagged-template-key
   3. silence-parameter-key                      16. silence-doubled-global-receiver
   4. silence-loop-binding-key                   17. silence-global-fetch-receiver-position
   5. silence-destructured-plain-literal-key     18. silence-fetch-alias-receiver-position
   6. silence-destructured-operator-key          19. silence-bare-global-argument-position
   7. silence-cross-file-key                     20. silence-dynamic-code-global-receiver-position
   8. silence-logical-assignment-member-target   21. silence-outbound-ctor-receiver-position
   9. silence-inverted-binding-order             22. silence-aliased-module-loader-specifier
  10. silence-array-slot-receiver                23. silence-tagged-template-fetch-call
  11. silence-object-literal-property-receiver   24. silence-destructure-deeper-than-one
  12. silence-class-field-receiver               25. silence-destructure-array-nested
  13. silence-parameter-default-receiver         26. silence-unreadable-member-of-navigator

TOTAL REGISTRY ROWS: 61

=== PRESENCE CHECK: silence-operator-around-global-receiver ===
  present: false
```

| Check | Planning-time prediction | Measured 2026-08-26 | Reconciled |
|---|---|---|---|
| `kind: "measured-silence"` row count | 26 | 26 | ✓ |
| array element position | present | `silence-array-slot-receiver` (10) | ✓ |
| object-literal property | present | `silence-object-literal-property-receiver` (11) | ✓ |
| class field | present | `silence-class-field-receiver` (12) | ✓ |
| parameter default | present | `silence-parameter-default-receiver` (13) | ✓ |
| for-of binding | present | `silence-for-of-binding-receiver` (14) | ✓ |
| `silence-operator-around-global-receiver` | ABSENT | ABSENT | ✓ |

### 2.3 The `.planning/STATE.md` enumeration — the plan's STATE grep, re-run

```
$ grep -nE "<the fifteen-alternative STATE phrase set from the plan header>" .planning/STATE.md
274 | CORE-11's box stays, owns the flip
293 | CORE-11 stays unchecked, owns the flip, still silent
294 | CORE-11 marked [x]
308 | CORE-11's box stays, owns the flip
318 | still silent
319 | CORE-11's box stays, box stays [
323 | CORE-11's box stays, box stays [, owns the flip
324 | report NOTHING
335 | CORE-11's box is wave
340 | CORE-11's [x] means, The box moved with
400 | owns the CORE-11 checkbox flip, CORE-11's residual class is still open
401 | report NOTHING, CORE-11 blocked by
402 | CORE-11 blocked by
403 | checkbox is untouched and belongs to, still silent
404 | CORE-11's `[x]` IS ALLOWED TO MEAN

COUNT: 15
```

**FIFTEEN LINES — the floor met exactly.** Line numbers shifted +28 to +35 from the plan's HEAD-`4105fd0` figures (`:246`→`:274`, `:265`→`:293`, `:266`→`:294`, `:280`→`:308`, `:290`→`:318`, `:291`→`:319`, `:295`→`:323`, `:296`→`:324`, `:307`→`:335`, `:312`→`:340`, `:365`→`:400`, `:366`→`:401`, `:367`→`:402`, `:368`→`:403`, `:369`→`:404`). Three in `### Blockers`, eleven in `### Decisions`, one the last pointer amendment — as predicted. A wider sweep of the file found no sixteenth occurrence, so unlike the ledger, **no line beyond the STATE floor was found.**

| Line | Section | The claim it makes | Classification | Evidence | Disposition |
|---|---|---|---|---|---|
| `:274` | Decisions, P9-D3 | box-state and flip-ownership statements, all inside `POINTER AMENDMENT 2026-08-24 …, plan 01-NN task N` blocks | **HISTORY** | date AND plan attribution in its own bytes, nine times over | left byte-identical, unmarked |
| `:293` | Decisions | `plan 01-19 owns the flip` | STANDING | plan-attributed, NO date | scoped marker |
| `:294` | Decisions | `CORE-11 marked [x] against an eight-row discharge table` | STANDING | no date, no authoring plan id | scoped marker; FALSIFIED |
| `:308` | Decisions, P23-D3 | `wave 28 owns the flip` | STANDING | decision id but no date | scoped marker; STALE |
| `:318` | Decisions, P25-D4 | `found six spellings still silent` | STANDING | decision id but no date | scoped marker; **FALSIFIED BY THIS SESSION'S SIX PROBES** |
| `:319` | Decisions, P25-D5 | `CORE-11's box stays [ ]`, `wave 28 reconciles` | STANDING | decision id but no date | scoped marker; STALE in attribution |
| `:323` | Decisions | `CORE-11's box stays [ ]`, `wave 28 owns the flip` | **STANDING** | **NO date AND NO plan attribution** — the plan named this one and left the call to execution | superseded in place, and the marker says so in those words |
| `:324` | Decisions, P28-D1 | `` `(ok && globalThis).fetch(url)` and four twins report NOTHING `` | STANDING | decision id but no date | scoped marker; **FALSIFIED BY THIS SESSION'S SIX PROBES** |
| `:335` | Decisions, wave 33 | `CORE-11's box is wave 35's` | STANDING | wave-attributed, no date | scoped marker; STALE |
| `:340` | Decisions | `The box moved with CORE11_BOX_EXPECTED in ONE commit (f5652a1)` | STANDING | no entry date, no plan id | scoped marker; FALSIFIED by `4105fd0` |
| `:400` | Blockers | `wave 28 owns the CORE-11 checkbox flip` | STANDING, LIVE | undated live blocker | **CORRECTED** (rewritten) |
| `:401` | Blockers | six shapes `all report NOTHING`, blocked by a removed row | STANDING, LIVE, **FALSE** | undated live blocker | **CORRECTED** against execution |
| `:402` | Blockers | five rows as BLOCKERS with the old-bar route | STANDING, LIVE | undated live blocker | **RE-FRAMED** as disclosed residuals |
| `:403` | pointer amendment | `CORE-11's checkbox is untouched and belongs to wave 35` | **HISTORY** | `POINTER AMENDMENT 2026-08-25 …, plan 01-34, wave 34` | scoped marker over the stale clause; bytes intact |
| `:404` | pointer amendment | `CORE-11's box is now [x], moved with CORE11_BOX_EXPECTED in ONE commit` | **HISTORY** | `POINTER AMENDMENT 2026-08-26 …, plan 01-35, wave 35` | scoped marker over the falsified clause; bytes intact |

**`:274`'s CHARACTERISATION CONFIRMED, THE PLAN'S OWN CORRECTION HELD.** It carries the literal `report NOTHING` **zero** times; its single mention of `silence-operator-around-global-receiver` sits inside a dated pointer amendment recording the row as REMOVED because re-measurement found no surviving silence. It is nearer the correction than the claim, exactly as the plan's header said after correcting its own earlier draft. Whole-file `report NOTHING` = 2 before the edit, at `:324` and `:401` — neither on `:274`.

### 2.4 The three corrected lines, quoted verbatim

**The corrected false blocker:**

> - [Phase 01] CORE-11 IS NOT BLOCKED BY `silence-operator-around-global-receiver`, AND THIS LINE PREVIOUSLY SAID IT WAS — CORRECTED 2026-08-26 BY PLAN 01-38 AGAINST SIX PROBES RE-EXECUTED IN THAT SESSION, NOT AGAINST A REPORT. The line as it stood named six shapes and asserted that all six "report NOTHING". All six were run through `auditSource` on 2026-08-26 and ALL SIX REPORT: `(ok && globalThis).fetch(url)` -> `outbound-fetch`; `(globalThis ?? self).fetch(url)` -> `outbound-fetch`; `(globalThis || self).fetch(url)` -> `outbound-fetch`; `(b ? globalThis : self).fetch(url)` -> `outbound-fetch`; `(ok && window).fetch(url)` -> `outbound-fetch`; `(ok && navigator).sendBeacon(u, d)` -> `outbound-beacon`. One violation each, six of six. The row this line named as the blocker was REMOVED from `RESOLVER_REGISTRY` on 2026-08-24 (CR-11, wave 32) because the silence it measured stopped existing — every spelling it named now reports through `operatorOperandMatching` — and its `QUANTIFIED_CLAUSES` and `FALSIFIED_HANDOFFS` entries went with it. THE ROW MUST STAY GONE AND THIS CORRECTION IS NOT AN INSTRUCTION TO RE-ADD IT: the suite positively asserts its absence, and its failure message reads that if an operator around a global receiver has gone silent again "that is a REGRESSION in the descent and not a row to restore; if a NEW and genuinely different silence was found, give it its own id and its own measured probe". Re-measured 2026-08-26: absent from a 61-row registry. Deleting a false blocker is not restoring the row it named.

**The corrected flip-ownership line:**

> - CORE-11's checkbox is `[ ]`, MEASURED 2026-08-26 at plan 01-38 (gap-closure round 8, wave 38). CORRECTED HERE: this line previously named WAVE 28 as the owner of this checkbox's flip, and said the flip could be made only against the derived text; that was stale twice over — wave 28 never flipped it, and the box has since been flipped by plan 01-35 at `f5652a1` and reverted at `4105fd0` on 2026-08-26, the third revert after `e7cc4b6` and `faca607`. THE POSITION AS MEASURED: the operator re-scoped the terminal condition on 2026-08-25 (plan 01-35, wave 35) to three criteria — DERIVED, DRIFT-DETECTABLE, THE SOLE BOUND — recorded in full in `.planning/REQUIREMENTS.md`'s CORE-11 entry; verification pass 8 (`01-VERIFICATION.md`, 2026-08-26) found criteria (1) and (2) discharged and criterion (3) UNMET, and named the legs. Whether criterion (3) is now discharged and whether this box may move are a verifier's determinations on the whole round's evidence, not this line's. THIS LINE STATES NO BOUND: the bound of record is the machine-owned generated span in `.planning/REQUIREMENTS.md` and in the gate file, byte-compared to `deriveResidual(RESOLVER_REGISTRY)` by the suite, and this file is reached by no mechanical comparison at all.

**The re-framed five-row line:**

> - CORE-11's FIVE NAMED ROWS FROM PLAN 01-32 ARE DISCLOSED RESIDUALS, NOT BLOCKERS — RE-FRAMED 2026-08-26 BY PLAN 01-38, AND THE ROWS THEMSELVES RE-MEASURED PRESENT RATHER THAN ASSUMED. The rows are real: re-counted on 2026-08-26 the registry carries 26 rows of `kind: "measured-silence"` out of 61 total, and all five are among them — `silence-array-slot-receiver` (an array element position), `silence-object-literal-property-receiver` (an object-literal property), `silence-class-field-receiver` (a class field), `silence-parameter-default-receiver` (a parameter default) and `silence-for-of-binding-receiver` (a for-of binding). WHAT DRIFTED IS THE FRAMING, NOT THE ROWS. This line previously called them blockers and prescribed a route — widen five initializer shapes, re-run the discharge table, move `CORE11_BOX_EXPECTED` and the ledger row together — which states the acceptance bar the operator RE-SCOPED on 2026-08-25. Under the bar now of record a disclosed named row is a RESIDUAL: it is carried in the machine-owned generated span, with an executed probe and counter-probe, and it is disclosed and unclosed rather than outstanding work this box waits on. THIS LINE IS A POINTER AND RESTATES NO BOUND: read the five rows and their probes in the generated span in `.planning/REQUIREMENTS.md` and in the gate file, byte-compared to `deriveResidual(RESOLVER_REGISTRY)` by the suite. It awards no verdict and does not say whether the box may move.

### 2.5 The Blockers-scoped greps, and the whole-file occurrences accounted for

```
$ awk '/^### Blockers/,0' .planning/STATE.md | grep -c 'all report NOTHING'
0
$ awk '/^### Blockers/,0' .planning/STATE.md | grep -c 'wave 28 owns the CORE-11 checkbox flip'
0

$ grep -c 'all report NOTHING' .planning/STATE.md                        # whole file
0
$ grep -c 'wave 28 owns the CORE-11 checkbox flip' .planning/STATE.md    # whole file
0
$ grep -n 'report NOTHING' .planning/STATE.md                            # whole file
330:- [Phase 01]: [Phase 01] P28-D1: an OPEN AND UNOWNED silence …
331:  - **SCOPED MARKER 2026-08-26, PLAN 01-38 … REACHING ONLY THE CLAUSE NAMED HERE …
410:- [Phase 01] CORE-11 IS NOT BLOCKED BY `silence-operator-around-global-receiver` …
```

**Each remaining occurrence accounted for:** `:330` is P28-D1's dated-by-section historical decision and carries the scoped marker at `:331` directly beneath it; `:331` is that marker, which necessarily quotes the claim it falsifies; `:410` is the corrected blocker itself, quoting its own former claim immediately before pasting the six executed results. Both of the two literals the acceptance criterion names are at **zero file-wide**.

### 2.6 A DEFECT THIS TASK INTRODUCED AND CAUGHT ITSELF

The first draft of the corrected flip-ownership line quoted the stale clause verbatim — `this line previously read "wave 28 owns the CORE-11 checkbox flip, and only against the derived text"`. That re-introduced the exact literal the region-scoped gate forbids, and the gate caught it: `blockers-scoped 'wave 28 owns the CORE-11 checkbox flip': 1`. The line was rewritten to DESCRIBE the stale attribution rather than reproduce it, and the gate then read 0. This is recorded because the gate being region-scoped rather than file-wide is exactly what made it catchable, and because a plan whose discipline is "measured, not claimed" should say when its own measurement caught it.

### 2.7 The markers, and the new pointer amendment

```
$ git diff --numstat -- .planning/STATE.md
16	3	.planning/STATE.md

$ git diff -U0 -- .planning/STATE.md | grep '^-' | grep -v '^---'
-- CORE-11's residual class is still open: six consecutive rounds of bounds authored rather tha…
-- [Phase 01] CORE-11 blocked by silence-operator-around-global-receiver: `(ok && globalThis).f…
-- CORE-11 blocked by FIVE named rows (plan 01-32): an array element position, an object-litera…
```

**Exactly three lines removed — the three live blockers being corrected.** All eleven markers and the new pointer amendment are pure insertions.

**`:323`'s marker, quoted — the undated, unattributed one:**

> **SCOPED MARKER 2026-08-26, PLAN 01-38 … REACHING ONLY THE CLAUSE NAMED HERE, WITH THE DECISION ABOVE LEFT BYTE-IDENTICAL.** This entry carries NO date and NO plan attribution of its own, so wave 35's two-valued rule classifies it STANDING rather than HISTORY, and it is superseded in place as such rather than merely marked. SUPERSEDED: "wave 28 owns the flip, against the generated block" … Also superseded as a placement rather than as a falsehood: "CORE-11's box stays [ ]" states this box's state on a surface that does not carry one; it reads `[ ]` as measured on 2026-08-26, so the statement is true and still does not belong here. STILL TRUE AND UNTOUCHED: that `requirements-completed` was deliberately EMPTY.

**`:404`'s marker — WHAT REMAINS TRUE IN WAVE 35's POINTER AMENDMENT, NAMED EXPLICITLY:** the 2026-08-25 operator re-scope and its route; the diagnosis that the old bar is unreachable over an open language; the three criteria (1) DERIVED, (2) DRIFT-DETECTABLE, (3) THE SOLE BOUND; that all three were re-verified BY EXECUTION with a mutation planted, watched red and restored; **the SCOPED criterion-3 verdict** and that the scope is part of it; **the narrowness sentence** and the named residuals (CR-15, CR-16, the twenty-six measured silences); the two classes of unreached surface; that the amendment restates no bound and is a pointer; that CORE-11's first sentence is byte-identical; and that STORE-03 and STORE-07 remain deferred with their owner. Only the clause `and CORE-11's box is now `[x]`, moved with `CORE11_BOX_EXPECTED` in ONE commit` is reached.

**The new 2026-08-26 pointer amendment for waves 36-38** is appended at the end of `### Blockers` and records: the RED-at-open with its two causes; CR-17's anchoring with a failing-path fixture; WR-48's narrowing and its measured zero; CR-18's row now pointing; this section's own correction against six re-executed probes; the removed row not restored; **both classes of unreached surface as unguarded limits**; that CORE-11's box is `[ ]` and belongs to a verifier; that it **IS A POINTER and restates no bound**; and the closing floor.

### 2.8 The things Task 2 had to not touch

```
$ git diff --exit-code -- .planning/REQUIREMENTS.md
EMPTY DIFF — Task 1 owns that file
$ git diff --exit-code -- packages/backend/src/outbound-prohibition.spec.ts
GATE-FILE-UNTOUCHED
```

`silence-operator-around-global-receiver` is not restored anywhere.

### 2.9 THE VERDICT REVIEW, one line

**VERDICT: no sentence added to `.planning/STATE.md` states or implies that criterion (3) is discharged, that the box may move, or that the gate is complete.** Three of the added passages state the opposite explicitly, naming a verifier as the owner of both determinations.

---

## 3. TASK 3 — CRITERION (3)(d)'s CROSS-SURFACE CHECK, RE-RUN AS A MEASUREMENT

### 3.1 The four-surface enumeration

**SURFACE 1 — `.planning/REQUIREMENTS.md`.** Eleven occurrences (the nine-line floor plus `:106` and `:108`). One is HISTORY by its own bytes (`:86`) and correctly unmarked. Three left the row and are relocated into the dated history block. The remaining eight each carry an adjacent scoped marker inserted by this wave. **UNMARKED STANDING SURVIVORS: 0.**

**SURFACE 2 — `packages/backend/src/outbound-prohibition.spec.ts`.**

```
$ grep -nE 'CORE11_BOX_EXPECTED *=|owns the flip|THE BOX IS|box stays|CORE-11.s box' \
    packages/backend/src/outbound-prohibition.spec.ts
 803://    place the next drift can start. CORE-11's box stays `[ ]`; wave 28
 804://    owns the flip and only against the derived text. NOTHING LEAKED:
 901://    deliberately untouched and CORE-11's box stays `[ ]`, for the reason
10295:   * CLOSEST TO THE WOUND. The one case in this repository named for CORE-11's box
10311:  const CORE11_BOX_EXPECTED = "- [ ] **CORE-11**";
```

| Line | The occurrence | Enclosing block | Dated in its own bytes? | Classification | MARKED? |
|---|---|---|---|---|---|
| `:803-804` | `` CORE-11's box stays `[ ]`; wave 28 owns the flip and only against the derived text `` | `================= THE FINAL RESIDUAL, AFTER PLAN 01-25 =================` (header `:612`) | **NO** — plan-attributed, undated | **STANDING** | **NO** |
| `:901` | `` `REQUIREMENTS.md` and `STATE.md` stay deliberately untouched and CORE-11's box stays `[ ]`, for the reason waves 24 and 25 recorded: … wave 28 reconciles both requirement-tier ledgers to it in ONE move `` | `============= THE NARROWING, AFTER PLAN 01-26 =============` (header `:811`) | **NO** — plan-attributed, undated | **STANDING** | **NO** |
| `:10311` | `const CORE11_BOX_EXPECTED = "- [ ] **CORE-11**";` | the pin | n/a — this is one of the two authorised places | authoritative | n/a |

**UNMARKED STANDING SURVIVORS ON SURFACE 2: TWO.**

**SURFACE 3 — `.planning/STATE.md`.** Fifteen occurrences. Two are HISTORY by their own bytes and one of those (`:274`) is correctly unmarked; twelve carry markers or corrections written by this wave. **UNMARKED STANDING SURVIVORS: 0.**

**SURFACE 4 — `.planning/WINDOWS.md`.** 41 rows after this wave, **every one carrying a `recorded_at`**, so the two-valued rule classifies them all HISTORY by construction. Fourteen carry a box-state or flip-ownership statement; thirteen were already `fixed`. The one `open` row that stated `CORE-11's box is now [x]` — entry 40 — was superseded through the tool in this task. **UNMARKED STANDING SURVIVORS: 0.**

### 3.2 THE TWO ASSERTIONS, WITH THEIR MEASURED RESULTS

**ASSERTION ONE — no STANDING occurrence survives UNMARKED. MEASURED RESULT: TWO SURVIVE, both on surface 2, at `packages/backend/src/outbound-prohibition.spec.ts:803-804` and `:901`.** The surface and both occurrences are NAMED above. They were **not silently repaired**: the gate file is closed after plan 01-37 and this plan is prohibited from editing it, so the finding is recorded and left open.

**AND IT IS SHARPER THAN A BARE COUNT.** The occurrence at `:901` sits **four lines above** wave 33's WR-38 disposition note at `:905-917`, which reads:

> `CORE-11's BOX IS NOT STATED HERE, AS OF 2026-08-25 (wave 33, WR-38). A paragraph asserting the box was NOW MARKED COMPLETE stood at this spot and is DELETED. … THE BOX'S STATE IS NOW STATED IN EXACTLY TWO PLACES: the CORE-11 row in `.planning/REQUIREMENTS.md`, and `CORE11_BOX_EXPECTED` below, which pins that row by bytes.`

That claim is **falsified by the same file's own bytes, four lines above it** — and it was the WR-38 disposition verification pass 8's check (3)(d) was reading when it reported zero. The re-run found it rather than the round preventing it, and this SUMMARY says so in those words.

**ASSERTION TWO — the box's state is asserted in exactly two places, which AGREE. MEASURED RESULT: FOUR places, not two.** They are the ledger row's checkbox glyph (`- [ ] **CORE-11**`), `CORE11_BOX_EXPECTED` at `:10311` (`"- [ ] **CORE-11**"`), and the two gate-header occurrences at `:803` and `:901`. **All four AGREE on `[ ]`.** The two extra additionally carry a flip ownership — wave 28's — that no wave ever exercised. So the *state* is consistent everywhere and the *count* assertion is false; the disagreement is in attribution, not in the box.

### 3.3 THE CROSS-SURFACE VERDICT, STATED AT THE REACH OF THE MECHANISM THAT PRODUCED IT — QUOTED VERBATIM

> This enumeration is a ONE-TIME GREP over four named files under one named phrase set and it is not a standing gate, so its verdict reaches exactly that far and no further: CLASS ONE, UNGUARDED FILES — `.planning/STATE.md` and `.planning/WINDOWS.md` are reached by NO mechanical comparison, the byte comparisons reaching the gate header and the ledger and no further, so the pointer-not-a-bound rule remains a prohibition with no check for those two files; and CLASS TWO, UNDECLARED PHRASINGS — a standing statement spelled outside this enumeration's phrase set is invisible to it, exactly as an undeclared spelling is invisible to the whole-file guard, and this round proved that limit on itself by finding two such statements in `.planning/REQUIREMENTS.md` (`:106` and `:108`) that the declared ledger phrase set could not see.

### 3.4 The verdict review, one line per surface

- **`.planning/REQUIREMENTS.md`** — nothing added by this round states or implies that criterion (3) is discharged, that the box may move, or that the gate is complete.
- **`packages/backend/src/outbound-prohibition.spec.ts`** — untouched by this round; nothing added, so nothing to review.
- **`.planning/STATE.md`** — nothing added states or implies any of the three; three added passages state the opposite and name a verifier as owner.
- **`.planning/WINDOWS.md`** — the appended entry states CORE-11's box is `[ ]`, that whether it may move belongs to a verifier, and that the entry awards no verdict.

### 3.5 `gsd-tools windows` — every command with its raw output

```
$ node …/gsd-tools.cjs windows status          # BEFORE ANY CHANGE
{ "ok": true, "ledger": { "schema_version": 1, "open_count": 19, "waived_count": 0,
  "fixed_count": 21, "total_count": 40, "last_updated": "2026-08-26T03:33:46.522Z", … } }

  entry 40: { "id": 40, "kind": "deviation", "phase": "01",
              "file": "packages/backend/src/outbound-prohibition.spec.ts",
              "status": "open", "recorded_at": "2026-08-26T03:33:46.522Z", … }

$ node …/gsd-tools.cjs windows append --kind deviation --phase 01 \
    --file packages/backend/src/outbound-prohibition.spec.ts --description "<the pointer entry>"
{ "ok": true, "ledger": { "open_count": 20, "waived_count": 0, "fixed_count": 21,
  "total_count": 41, "last_updated": "2026-08-26T11:10:50.592Z", … } }

$ node …/gsd-tools.cjs windows fixed 40
ok: True
{ "schema_version": 1, "open_count": 19, "waived_count": 0, "fixed_count": 22,
  "total_count": 41, "last_updated": "2026-08-26T11:11:00.277Z" }
  id 40: status=fixed  resolved_at=2026-08-26T11:11:00.277Z  recorded_at=2026-08-26T03:33:46.522Z
  id 41: status=open   resolved_at=None                      recorded_at=2026-08-26T11:10:50.592Z
```

**RESULTING OPEN-ENTRY COUNT: 19** (unchanged — one appended, one closed). Waived 0, fixed 22, total 41.

```
$ git diff --numstat -- .planning/WINDOWS.md
18	5	.planning/WINDOWS.md
$ git diff -U0 -- .planning/WINDOWS.md | grep -E '^[+-](open_count|fixed_count|total_count|last_updated)'
-fixed_count: 21      +fixed_count: 22
-total_count: 40      +total_count: 41
-last_updated: 2026-08-26T03:33:46.522Z    +last_updated: 2026-08-26T11:11:00.277Z
```

Only tool-produced rows and front-matter counts changed. Nothing was hand-edited.

**THE NEW WINDOWS ENTRY (id 41), quoted:** it supersedes entry 40 and names the falsifying commit; records CR-17, WR-48, CR-18 and CR-19 with their dispositions; records the surface-2 finding as **NEW AND OPEN, found by this round's own re-run and not repaired here** because the gate file is closed after plan 01-37; states that the entry **RESTATES NO BOUND AND IS A POINTER**, the bound of record being the machine-owned generated span; and states that **CORE-11's box is `[ ]` as measured and whether it may move belongs to a verifier on the whole round's evidence; this entry awards no verdict.**

### 3.6 `01-PROBE.md` — the equality RE-STATED, not assumed

Sections B and C and the tally line were read. The tally line reads:

> **Tally.** explicit 27 · unresolved-and-flagged 11 · dismissed 0 · **total 38**.

**Checked against this round:** plans 01-36, 01-37 and 01-38 restored a floor, anchored a guard's exemption keys, narrowed an exclusion's line range, and corrected two planning documents. **None of that resolved a flagged assumption or surfaced a new one, so no row moved.** The equality is therefore **UNCHANGED at 38 == 27 + 11 with 0 dismissed, and that is stated here in writing rather than left assumed.**

```
$ git diff --exit-code -- .planning/phases/01-skeleton-persistence-compatibility/01-PROBE.md
EMPTY DIFF — 01-PROBE.md untouched
```

The empty diff is the **designed outcome**, not an omission. No row was dropped silently.

### 3.7 `COVERAGE.md` — confirmed, not extended

The existing declaration was read: the matrix was produced 2026-08-20 at planning time from the pinned type packages, the root SDK's fourteen members are enumerated, and `INTEGRATE` is the default with every `OPT-OUT` carrying a reason. **This round integrates no external API surface — it touched a test-only gate's description of itself and four planning documents — so the existing declaration still stands and NO matrix rows were added.** Stated explicitly rather than left as an absence.

```
$ git diff --exit-code -- .../COVERAGE.md
EMPTY DIFF — read only
```

### 3.8 The assumption-delta detector

```
$ node …/gsd-tools.cjs query assumption-delta.scan .../01-38-PLAN.md
{ "detected": false, "signals": [], … }
```

**It did not fire, and no checkpoint was raised.**

### 3.9 `ROADMAP.md` — reconciled by a SCOPED edit

Read against their SUMMARYs, waves 36 and 37's entries were accurate. **Two of the three checkboxes were ALREADY `[x]`**, marked by their own executions — the plan anticipated marking three and only one needed marking, which is recorded here rather than reported as three.

Two lines were corrected:

**Wave 37 — before → after (appended clause):**
- before: `… Narrowing it returns those lines to the guarded surface; what that raises is MEASURED and no expected count is named anywhere in the plan — *wave 37*`
- after: `… Narrowing it returns those lines to the guarded surface; what that raises is MEASURED and no expected count is named anywhere in the plan MEASURED, 2026-08-26: exclusion three narrowed to \`4135..5767\` and the 117 restored lines raised ZERO new obligations, so the entry's unnamed count is recorded rather than left open — *wave 37*`

**Wave 38 — checkbox `[ ]`→`[x]` and an appended reconciliation clause** recording that the measurement exceeded the planner's description: twenty-four lines matching the floor exactly plus two the ledger phrase set cannot see, six of six probes reporting, and the (3)(d) re-run coming back **non-clean** with two surviving unmarked occurrences on the gate file's header — recorded and left open for a verifier rather than repaired.

```
$ git diff --numstat -- .planning/ROADMAP.md
2	2	.planning/ROADMAP.md
$ diff <ROADMAP.before> .planning/ROADMAP.md | grep -cE '^[0-9]'
2                       # exactly two changed hunks

$ grep -oE '^- \[[ x]\] 01-3[678]-PLAN.md' .planning/ROADMAP.md
- [x] 01-36-PLAN.md
- [x] 01-37-PLAN.md
- [x] 01-38-PLAN.md

$ sed -n '70p' .planning/ROADMAP.md | grep -o '(38 plans total)'
(38 plans total)

$ grep -c '01-38-PLAN.md' .planning/ROADMAP.md
1
```

Two lines changed of 460+. **Every phase entry outside the changed region is byte-unchanged**, proved by the two-hunk diff.

---

## 4. THE FLOOR, MEASURED AT THE CLOSE

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  1374 passed (1374)
EXIT=0

$ pnpm typecheck
$ tsc --build
EXIT=0

$ pnpm lint
$ eslint .
EXIT=0

$ pnpm knip
$ knip
EXIT=0

$ pnpm build:backend && pnpm check:bundle
[*] Backend built successfully
[*] Plugin package built successfully
$ node scripts/ci/check-bundle-imports.mjs
packages/backend/dist/index.js: 1 import specifier(s): crypto
EXIT=0

$ REAL-TREE RUN over both SOURCE_ROOTS
SOURCE_ROOTS: ["packages/backend/src","packages/engine/src"]
REAL-TREE RESULT: 23 files, 0 violations
```

**Exactly one import specifier, `crypto`. Twenty-three files, zero violations.** 31 files / 1374 tests exceeds the floor of 31 / 1372.

---

## 5. THE SENTENCES THIS PLAN'S OUTPUT SPEC REQUIRES

**NO PASSAGE WAS ERASED.** Every byte removed from CORE-11's row is in the dated 2026-08-26 history block, proved by a file-wide grep that still finds all three literals (1, 1 and 2) while a row-scoped grep no longer finds any of them (0, 0 and 0).

**THE SIX PROBES WERE RE-EXECUTED IN THIS SESSION** through `auditSource`, not cited from verification pass 8, and all six report — five `outbound-fetch` and one `outbound-beacon`.

**`silence-operator-around-global-receiver` WAS NOT RESTORED** in any form, and the suite requires it to stay gone: it asserts the row's absence with a failure message calling its return "a REGRESSION in the descent and not a row to restore", and `git diff --exit-code` over the gate file is clean at every task boundary.

**THIS PLAN AWARDS NO VERDICT ON CRITERION (3) AND DOES NOT MOVE CORE-11's BOX** — the checkbox is `[ ]`, byte-unchanged, and both determinations belong to verification pass 9 on the whole round's evidence.

**THE ROUND OPENED WITH A MEASURED RED THAT THE HANDOFF DESCRIBED AS GREEN** — 2 failed of 1372, caused by commit `4105fd0` reverting the checkbox while `CORE11_BOX_EXPECTED` still pinned `[x]` and blank lines sat inside the machine-owned span — **AND IT CLOSES WITH A MEASURED GREEN RATHER THAN A CLAIMED ONE**, 31 files / 1374 tests exit 0 run at every task boundary.

**THE MUST-NOT DID NOT MOVE:** CORE-11's first sentence is byte-identical, shown by an empty diff; 23 files over both `SOURCE_ROOTS` at zero violations; one import specifier in the shipped bundle; and every finding this round touched is a defect in a test-only gate's description of itself or in two planning documents. Nothing leaks.

---

## 6. PREDICTION VS MEASUREMENT

| # | Prediction | Measured | Verdict |
|---|---|---|---|
| 1 | `.planning/REQUIREMENTS.md`: nine lines, eleven passages, at `:46 :52 :60 :72 :84 :86 :98 :158 :160` | nine lines, eleven passages, at `:46 :52 :60 :72 :84 :86 :98 :160 :162` (tail shifted +2 by wave 37, as wave 37 reported) | **MATCHED** |
| 2 | The floor is a FLOOR — statements outside the phrase set are invisible | **TWO found beyond it: `:106` and `:108`** | **EXCEEDED — the difference is the finding** |
| 3 | Row-scoped counts 0 / 0 / 0 / 4 | 0 / 0 / 0 / 4 | **MATCHED** |
| 4 | `.planning/STATE.md`: fifteen lines | fifteen, at `:274 :293 :294 :308 :318 :319 :323 :324 :335 :340 :400 :401 :402 :403 :404` | **MATCHED** |
| 5 | `report NOTHING` twice whole-file, at the P28-D1 entry and the blocker, zero on P9-D3 | exactly that: `:324` and `:401`, zero on `:274` | **MATCHED — the plan's own self-correction held** |
| 6 | Six of six probes report | six of six | **MATCHED** |
| 7 | 26 `measured-silence` rows | 26 (of 61 total) | **MATCHED** |
| 8 | All five of plan 01-32's names present | all five present | **MATCHED** |
| 9 | `silence-operator-around-global-receiver` absent | absent | **MATCHED** |
| 10 | `:295`/`:323` may well be STANDING | **it is** — no date, no plan attribution; superseded in place | **MATCHED** |
| 11 | 01-PROBE.md equality unchanged at 38 == 27 + 11 | unchanged, empty diff | **MATCHED** |
| 12 | WINDOWS front matter open 19 / waived 0 / fixed 21 / total 40 | exactly that before the change; 19 / 0 / 22 / 41 after | **MATCHED** |
| 13 | Three ROADMAP checkboxes to mark | **two were already `[x]`; only wave 38 needed marking** | **DIFFERED — recorded, not absorbed** |
| 14 | Criterion (3)(d)'s re-run is a measurement whose result is whatever it is | **NON-CLEAN: two surviving unmarked occurrences on surface 2, and four places asserting the box's state rather than two** | **THE ROUND'S LARGEST DISCREPANCY — see §3.2** |

---

## Decisions Made

1. **The two-valued rule is applied at LINE granularity, not BLOCK granularity**, on wave 35's own precedent (the marker at `:110` supersedes `:112`, a paragraph inside a dated block). Recorded because the block-granularity reading was available, would have made this re-run report clean without doing anything, and was rejected for that reason.
2. **`REQUIREMENTS.md:108` is superseded although its box-state claim is true** — a true statement in the wrong place is still an unmarked standing statement, and its revert arithmetic is stale at three and three.
3. **`STATE.md:323` is STANDING, not HISTORY** — it carries no date and no plan attribution of its own, only a reference to wave 28 as a future flip owner.
4. **The surface-2 finding is recorded, not repaired.** The gate file is closed after plan 01-37 and this plan is prohibited from editing it. Silently repairing it would also have made the re-run indistinguishable from one that quietly overlooked it, which is the defect the re-run exists to correct.
5. **`01-PROBE.md` is read and confirmed, not edited.** The empty diff is the designed outcome.

## Deviations from Plan

**None requiring a deviation rule.** Three things are worth recording as departures from the plan's expectations, all handled within the plan's own instructions:

1. **The enumeration exceeded the floor by two lines** (`:106`, `:108`). The plan required this to be reported as a finding rather than absorbed, and §1.4 does that.
2. **The plan expected three ROADMAP checkboxes to mark; two were already marked** by waves 36 and 37's own executions. Recorded in §3.9.
3. **Task 2's first draft re-introduced a literal its own region-scoped gate forbids**, and the gate caught it. Recorded in §2.6 rather than fixed silently.

## Issues Encountered

**The pre-existing `.planning/config.json` modification** (`use_worktrees: false`, `_auto_chain_active: false`) makes a bare whole-tree `git diff --exit-code` non-clean. Every such check in this plan was therefore scoped to the paths under test, and the config path was recorded rather than committed or reverted — the same handling wave 37 applied.

## Known Stubs

None. This plan wrote no code.

## Next Phase Readiness

**Open for verification pass 9, stated as evidence and not as a verdict:**

- Criterion (3)'s two document legs — CR-18 and CR-19 — have been addressed, with the evidence in §1 and §2.
- **A NEW AND OPEN FINDING:** `packages/backend/src/outbound-prohibition.spec.ts:803-804` and `:901` carry unmarked standing statements of CORE-11's box state and a flip ownership wave 28 never had, inside the undated wave-25 and wave-26 narrative blocks. One sits four lines above wave 33's WR-38 note asserting the box is stated in exactly two places, which those occurrences falsify. **Recorded as WINDOWS entry 41 (open).** This plan was prohibited from editing that file.
- CORE-11's checkbox is `[ ]`. Whether criterion (3) is discharged and whether the box may move are verification pass 9's determinations.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-26*

## Self-Check: PASSED

All four modified files present on disk. All three task commits present in `git log --oneline --all`:
`a35797e`, `ed5827e`, `2cf9e83`. Every plan-level `<verification>` item 1–31 executed and pasted above,
including the two that returned a NON-CLEAN result (items 17 and 18, §3.2 and §3.3).
