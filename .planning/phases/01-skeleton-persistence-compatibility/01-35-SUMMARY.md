---
phase: 01-skeleton-persistence-compatibility
plan: 35
subsystem: testing
tags: [core-11, outbound-prohibition, requirements-ledger, mutation-testing, gap-closure]

requires:
  - phase: 01-33
    provides: the whole-file wrap-tolerant quantifier guard, its three anchored exclusions and its 29 named exemptions
  - phase: 01-34
    provides: CR-15 and CR-16 as named measured-silence rows in the derived residual
provides:
  - The operator's 2026-08-25 re-scope of CORE-11's acceptance bar, recorded in .planning/REQUIREMENTS.md as a dated decision by the requirement's owner, with its reason and the STORE-01 -> STORE-08 route named by id
  - The three criteria (DERIVED, DRIFT-DETECTABLE, THE SOLE BOUND) stated in the ledger and in CORE11_BOX_EXPECTED's failure message, replacing rather than standing beside the superseded bar
  - A three-row discharge table, every row's evidence EXECUTED in this session and proved live by a mutation
  - CORE-11's checkbox moved [ ] -> [x] together with CORE11_BOX_EXPECTED in ONE commit
  - Pointer amendments on both append-only histories that restate no bound
affects: [01-verification, core-11, requirements-ledger]

actuals:
  tokens: 34000
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A requirement re-scope is recorded as a dated, attributed decision by the requirement's OWNER, by the STORE-01 -> STORE-08 route"
    - "A criterion verdict is stated with the reach of the mechanism that produced it; a scoped verdict is a pass, an unqualified one that overclaims is not"

key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
    - packages/backend/src/outbound-prohibition.spec.ts
    - .planning/STATE.md
    - .planning/WINDOWS.md

key-decisions:
  - "CORE-11's [x] now means, and may ONLY mean, three things: DERIVED, DRIFT-DETECTABLE, THE SOLE BOUND. The operator decided this on 2026-08-25 because the old bar was UNREACHABLE over an open language, not merely unmet."
  - "Row 3's verdict is SCOPED and the scope is part of the pass: met up to the guard's phrase-list reach under its named normalization, with two classes of unreached surface named."
  - "The box moved with CORE11_BOX_EXPECTED in one commit (f5652a1), after three rows each proved live by a mutation executed in this session."

patterns-established:
  - "Over-breadth is a DIFFERENT property from non-vacuity, and it is measured by enumerating what an exclusion actually swallows and classifying every occurrence."
  - "A mis-targeted mutation is a finding, not a discard: the measurement that disagreed with the prediction is what identified the mis-targeting."

requirements-completed: [CORE-11]

duration: 1h 5m
completed: 2026-08-26
status: complete
---

# Phase 01 Plan 35: CORE-11's Re-Scoped Acceptance Bar, Recorded and Discharged — Summary

**The operator's re-scope of CORE-11's acceptance bar is written into the ledger as a dated owner's decision with its reason and its route, and the requirement is then discharged against the three criteria that re-scope installs — every row proved by a mutation planted, watched red and restored in this session — flipping the box `[ ]` -> `[x]` together with its pin in one commit.**

## Performance

- **Duration:** ~1h 5m across two tasks and three agent contexts
- **Tasks:** 2 (Task 1 committed by a prior context at `e47ffdd`; Task 2 executed here)
- **Files modified:** 4
- **Commits:** 4 production + 1 metadata

## Task Commits

1. **Task 1: the operator decision, end to end** — `e47ffdd` (docs)
2. **Task 2a: the three-row discharge** — `9adb167` (docs)
3. **Task 2b: the box read off the table, with the pin, in ONE commit** — `f5652a1` (docs)
4. **Task 2c: both append-only histories** — `996c077` (docs)

## Accomplishments

- **The re-scope is recorded as its OWNER's decision, not a planner's.** `.planning/REQUIREMENTS.md` carries a correction dated 2026-08-25, attributed to plan 01-35 and wave 35, naming THE OPERATOR as the decider, the unreachability of the old bar over an open language as the reason, six rounds of flat find-rate as the evidence, and the STORE-01 -> STORE-08 precedent by id as the route.
- **The three criteria are stated on both surfaces a mechanism or a future session reads** — the ledger correction and `CORE11_BOX_EXPECTED`'s failure message — with the superseded promise REPLACED, never appended beside.
- **CORE-11's discharge was re-executed against those three criteria**, one row per criterion, every row's evidence produced by running something in this session and proved live by a mutation.
- **The box moved `[ ]` -> `[x]` with its pin in ONE commit** (`f5652a1`, 2 files / 2 lines), after the table said so — not before it.
- **Both append-only histories point at the decision and restate no bound.**

## THE DECISION, QUOTED VERBATIM FROM THE LEDGER

Who decided:

> THE DECIDER IS THE OPERATOR — the owner of this requirement — and this correction records that decision rather than making it; no planner, no executor and no verifier is entitled to move this bar and none of them did.

Why:

> THE REASON IS THAT THE OLD ACCEPTANCE BAR WAS UNREACHABLE OVER AN OPEN LANGUAGE, NOT MERELY UNMET. That old bar — that the gate can be driven red on every spelling of every clause this entry's first sentence enumerates — asks a static scanner to close a set that does not close: the space of JavaScript spellings for *invoke a function through a value* is open, so no widening ever arrives at it, and a bar no amount of correct work can reach is a defect in the bar rather than in the work.

By what route:

> THE ROUTE IS THE ONE THIS PROJECT HAS ALWAYS USED FOR A REQUIREMENT RE-SCOPE — the STORE-01 → STORE-08 precedent, named here by id: STORE-01 carries the parenthetical recording what was re-scoped, on what date and in what forum, and STORE-08 is where that route ends.

The three criteria, numbered:

> This box's `[x]` may now mean, and may ONLY mean, that this requirement's residual is: (1) DERIVED — the gate's reach is derived from the code, generated from `RESOLVER_REGISTRY` rather than authored beside it, delivered in wave 27; (2) DRIFT-DETECTABLE — drift between text and code is mechanically detectable, so a divergence between either shipped span and the generated form turns this suite red, delivered in waves 27 and 29; and (3) THE SOLE BOUND — the disclosure is the only bound stated on every surface a reader touches, contradicted nowhere, delivered in wave 33 by deleting the gate file's hand-written bounds rather than by guarding them.

The narrowness, in the same passage:

> It does not claim the gate catches everything; it claims the gate's DESCRIPTION OF ITSELF is derived, drift-detectable and singular, which is the only promise a static gate over an open language can actually keep. CR-15 ... CR-16 ... and the twenty-six measured silences that span now carries are NAMED RESIDUALS UNDER THIS NEW BAR: disclosed and unclosed, not defects it waves away and not shapes it has closed. The class stays open because the space of JavaScript spellings is open.

## THE BYTE COMPARISONS, RUN BEFORE THE FIRST CRITERION ROW WAS WRITTEN

Timestamped and executed BEFORE any conclusion was drafted, so no consistency check ran after the conclusions it was supposed to constrain.

```
TS=2026-08-26T01:55:13Z
.planning/REQUIREMENTS.md
  lines=580 entries=61 sha256=15e860382fddc6a291f5fa58cfdb8345ffd4c35cecb97aac5ec56eae38a3bbda
packages/backend/src/outbound-prohibition.spec.ts
  lines=580 entries=61 sha256=15e860382fddc6a291f5fa58cfdb8345ffd4c35cecb97aac5ec56eae38a3bbda
```

And the GENERATED form, measured by importing `deriveResidual` and `RESOLVER_REGISTRY` from the gate file itself:

```
GENERATED deriveResidual(RESOLVER_REGISTRY)
  lines=580 entries=61 sha256=15e860382fddc6a291f5fa58cfdb8345ffd4c35cecb97aac5ec56eae38a3bbda
```

**THE HASHING CONVENTION, NAMED SO NOBODY RE-DERIVES IT.** The digest reproduces only when the extracted span is hashed WITHOUT a trailing newline — that is what `extractDerivedBlock` returns, since it joins the lines strictly between the two sentinel lines. A shell extractor that leaves the trailing newline on hashes to something else and the disagreement looks like drift.

Re-measured at the end of the task, after the box flip and both pointer amendments: unchanged, all three at `15e86038…`, and `pnpm test` green at 31 files / 1372 tests.

## THE THREE-ROW DISCHARGE TABLE

In `01-32-SUMMARY.md`'s column shape — one row per CRITERION, not one per enumerated clause. The superseded eight-row enumerated-surface discharge (the one plan 01-19 flipped this box against and `faca607` reverted) is named here EXACTLY ONCE, as context showing which bar changed; it was not re-run and it is not the acceptance test.

| Criterion | Executed evidence | Artifact measured against | Mutation that proved the evidence live | Verdict |
| --- | --- | --- | --- | --- |
| (1) DERIVED | Both shipped spans extracted from the files' own bytes and hashed: 580 lines / 61 entries / sha256 `15e86038…`, identical to each other AND to the generated form. Both one-entry-per-registry-row cases green. | `deriveResidual(RESOLVER_REGISTRY)`; the gate-header span; the `.planning/REQUIREMENTS.md` span | **M1** — one character changed in `RESOLVER_REGISTRY[0].clause` (line 4140), a field `deriveResidual` emits. BOTH byte comparisons went red at once. | ✓ |
| (2) DRIFT-DETECTABLE | Each shipped copy is guarded by its OWN byte comparison, and each was driven red ALONE while the other stayed green. | The two byte-equality cases, one per copy | **M2** (gate-header copy, line 1010) → only the gate-header comparison red. **M4** (ledger copy, line 150) → only the ledger comparison red. Executed separately, never combined. | ✓ |
| (3) THE SOLE BOUND | Four checks, all executed — see the section below. | Wave 33's whole-file wrap-tolerant quantifier guard, its three anchored exclusions and both pinned counts; the four reader surfaces | **M3** — a declared phrasing re-planted outside all three exclusions; the guard named the line and the phrasing index and went red. | ✓ (scoped — verbatim below) |

**ROW 3's VERDICT, QUOTED VERBATIM** as it stands in `.planning/REQUIREMENTS.md`:

> ✓ (scoped: met UP TO THE GUARD'S PHRASE-LIST REACH UNDER ITS NAMED NORMALIZATION, on the surfaces and spellings a mechanism can see, with BOTH classes of unreached surface named — CLASS ONE, UNGUARDED FILES: `.planning/STATE.md` and `.planning/WINDOWS.md`, reached by NO mechanical comparison at all, so the pointer-not-a-bound rule remains a prohibition with no check for those two; CLASS TWO, UNDECLARED SPELLINGS INSIDE THE GUARDED FILES: wave 33's guard is a PHRASE LIST over BYTES under one named normalization and says so itself, so a hand-written bound spelled in words it does not declare stands in the gate file and passes all four checks unseen)

The scope is part of the pass, not a footnote to it. An unqualified `✓` on row 3 would have flipped this box on evidence strictly narrower than the criterion it discharges — a stated reach exceeding an executed reach, which is this phase's signature defect arriving inside the fix for exactly that defect.

## ROW 3's FOUR CHECKS, EACH EXECUTED

### (a) Wave 33's guard RUN and observed green

All three of its cases, run by name against the gate file:

```
"the three quantifier-surface exclusions are ANCHOR-DERIVED, NON-EMPTY, WITHIN A PINNED BAND and POSITIVELY IDENTIFIED — asserted BEFORE the rule"
      Tests  1 passed | 431 skipped (432)
"exclusion three carries ONLY clause strings — the registry line range and the live clauses agree, occurrence for occurrence"
      Tests  1 passed | 431 skipped (432)
"the gate file's own bytes carry NO declared phrasing outside the three exclusions except by NAMED exemption"
      Tests  1 passed | 431 skipped (432)
```

### (b) Its counts INDEPENDENTLY re-measured, in both normalizations

Re-measured over the file's own bytes by a probe that **re-implements** `normalizeGateLine`, `joinGateLines` and the anchor resolution from the guard's own named convention rather than importing the guard's code — otherwise the "independent" measurement would be the guard measuring itself. Only `UNBOUNDED_QUANTIFIERS` and `RESOLVER_REGISTRY` were imported, as data.

```
GATE=packages/backend/src/outbound-prohibition.spec.ts totalLines=9976
UNBOUNDED_QUANTIFIERS declared phrases: 9
NORMALIZATION A (line-based, per raw line): 58
NORMALIZATION B (joined, prefix-stripped):  62
registry clause-string occurrences (live data): 12

SURFACE (outside all three exclusions): 7633 lines, 29 declared-phrasing occurrence(s)
```

Reconciled against wave 33's post-triage pinned table (`01-33-SUMMARY.md`), which totals **9+12+3+12+22 = 58 line-based** and **11+12+4+12+23 = 62 joined**, and which records `surface occurrences outside all three exclusions : 29` against `HEADER_QUANTIFIER_EXEMPTIONS entries : 29`.

| Quantity | Wave 33 pinned | Re-measured here | Agrees |
| --- | --- | --- | --- |
| line-based, whole file | 58 | 58 | yes |
| joined, prefix-stripped, whole file | 62 | 62 | yes |
| surface occurrences outside all exclusions | 29 | 29 | yes |
| machine-owned span | 12 / 12 | 12 / 12 | yes |
| registry range | 12 / 12 | 12 / 12 | yes |
| `UNBOUNDED_QUANTIFIERS` declaration | 9 | 9 | yes |

**No disagreement.** Had there been one it would have been a finding and would have blocked the row.

### (c) Each exclusion measured for OVER-BREADTH — a different property from non-vacuity

Wave 33 asserts its exclusions are non-vacuous (they swallow something) and within a pinned band. This wave measured whether they are also **not over-broad**: every declared-phrasing occurrence falling inside each exclusion was enumerated and classified. An exclusion swallowing a single hand-written universal would have converted a guarded surface into an unguarded one while every wave-33 assertion stayed green — and that would have made row 3 `✗`.

```
E1 machine-owned span:            lines 957..1538  (size 582)  -> 12 occurrence(s)
    12 x machine-owned span
E2 UNBOUNDED_QUANTIFIERS decl:    lines 5959..5969 (size 11)   ->  9 occurrence(s)
    9 x the UNBOUNDED_QUANTIFIERS declaration itself
E3 RESOLVER_REGISTRY decl:        lines 4135..5884 (size 1750) -> 12 occurrence(s)
```

E3's twelve occurrences sit on six carrier lines — 4140, 4288, 4626, 4666, 4720, 4853 — and every one of those six was verified to sit directly under a `clause:` key:

```
4140: clause: at line 4139     4666: clause: at line 4665
4288: clause: at line 4287     4720: clause: at line 4719
4626: clause: at line 4625     4853: clause: at line 4852
```

Independently, the live `clause` strings carry **12** occurrences — the same number the line range carries. **Zero residue in any of the three exclusions:** every excluded occurrence is machine-owned span, the declaration itself, or a `RESOLVER_REGISTRY[].clause`. None is over-broad.

### (d) A declared phrasing re-planted outside all three exclusions — the keeper watched working

Planted at line 4134, outside the span (957..1538), outside the `UNBOUNDED_QUANTIFIERS` declaration (5959..5969) and outside the registry (4135..5884):

```
 * WAVE-35 ROW 3 CHECK (d): the walk reports every spelling of an outbound call.
```

RED test title:

> the residual is DERIVED — the registry is bound to the walk, and the shipped text to the registry > **the gate file's own bytes carry NO declared phrasing outside the three exclusions except by NAMED exemption**

Assertion message:

```
AssertionError: 1 declared-phrasing occurrence(s) in packages/backend/src/outbound-prohibition.spec.ts
sit outside all three exclusions and carry NO exemption entry:
  line 4134: "WAVE-35 ROW 3 CHECK (d): the walk reports {q5} of an outbound call. :: q5"
YOU HAVE THREE CHOICES AND THE FIRST TWO ARE PREFERRED. (1) DELETE the sentence, if it states a bound
on the walk's reach — the reach OF RECORD is the generated span between the sentinels and nothing
hand-written beside it may restate it. (2) REWRITE it to say what the branch does WITHOUT the
universal, naming the branches; do NOT swap the phrasing for a synonym, which turns this guard green
while keeping the bound. (3) If the occurrence is not a claim about reach at all — a quotation, a test
title, an assertion message complaining about the phrasing, a table label, or a QUANTIFIED_CLAUSES
value stating what bounds a universal — add the key above to HEADER_QUANTIFIER_EXEMPTIONS with one
clause saying WHICH of those it is. An exemption is a sentence a later author must keep true, so it is
a cost; spend it deliberately.: expected [ Array(1) ] to deeply equal []
 ❯ packages/backend/src/outbound-prohibition.spec.ts:9704:7
      Tests  1 failed | 431 skipped (432)
```

Restored; `git diff --exit-code` clean; re-run green (`Tests 1 passed | 431 skipped (432)`).

### Row 3's cross-surface contradiction check

`SOLE` means sole everywhere a reader looks, so Task 1's four-surface enumeration was re-run:

```
== S1 .planning/REQUIREMENTS.md 'When this box is eventually' ==  2   (unchanged; 1 HISTORY, 1 STANDING-and-marked)
== S2 gate file 'probes every surface'                       ==  0   (was 1 pre-wave; REPLACED, not appended to)
== S3 .planning/STATE.md                                     ==  0
== S4 .planning/WINDOWS.md                                   ==  0
== box asserted where ==
  .planning/REQUIREMENTS.md  grep -cE '^- \[[ x]\] \*\*CORE-11\*\*'  ->  1
  packages/backend/src/outbound-prohibition.spec.ts:9887  const CORE11_BOX_EXPECTED = "- [x] **CORE-11**";
```

Zero unmarked STANDING statements of a superseded bar on any of the four surfaces. The box's state is asserted in exactly two places and they agree.

**AND BOTH CLASSES OF UNREACHED SURFACE, NAMED AS UNGUARDED LIMITS RATHER THAN AS SATISFIED CHECKS.** CLASS ONE, unguarded FILES: `.planning/STATE.md` and `.planning/WINDOWS.md` are reached by NO mechanical comparison at all — the two byte comparisons reach the gate header and the ledger and no further — so the pointer-not-a-bound rule remains a prohibition with no check for those two files, and this SUMMARY's own pointer amendments live under exactly that unguarded rule. CLASS TWO, undeclared SPELLINGS inside the guarded files: wave 33's guard is a phrase list over bytes under one named normalization and says so itself, so a hand-written bound spelled in words `UNBOUNDED_QUANTIFIERS` does not declare stands in the gate file and passes all four checks above unseen.

## THE FIVE MUTATION PROOFS, AS ONE TABLE, WITH THE RUN ORDER STATED

**RUN ORDER: M2, M1, M3, M4, M5.** Each was planted against a tree whose real work was already committed, restored immediately after, and separated from the next by a clean `git diff --exit-code`. `git log --oneline -1` was pasted before each; M2, M1, M3 and M4 all ran at `e47ffdd`, M5 at `f5652a1`. None was combined with another.

| # | Order | Mutation | RED test title | Verdict of the run | Restored |
| --- | --- | --- | --- | --- | --- |
| M2 | 1st | Gate-header copy of the span, line 1010: `OVER-approximates` → `OVER-approximatez` | *the block shipped in the gate header equals deriveResidual(RESOLVER_REGISTRY), byte for byte* | `Tests 1 failed \| 431 passed (432)` — the gate-header comparison red, the LEDGER comparison **green** | yes, `git diff --exit-code` clean |
| M1 | 2nd | `RESOLVER_REGISTRY[0].clause`, line 4140: same one character | *…equals deriveResidual(RESOLVER_REGISTRY), byte for byte* — **BOTH** cases, ledger and gate header | `Tests 2 failed \| 430 passed (432)` | yes, clean |
| M3 | 3rd | A declared phrasing planted at line 4134, outside all three exclusions | *the gate file's own bytes carry NO declared phrasing outside the three exclusions except by NAMED exemption* | `Tests 1 failed \| 431 skipped (432)` | yes, clean; re-run green |
| M4 | 4th | Ledger copy of the span, line 150: `OUTBOUND WALK` → `OUTBOUND WALX` | *the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte* | `Tests 1 failed \| 431 passed (432)` — the ledger comparison red, the GATE-HEADER comparison **green** | yes, clean; full spec re-run `432 passed` |
| M5 | 5th | CORE-11's ledger row moved away from what the pin now expects: `- [x]` → `- [ ]` | *CORE-11's entry is present and well-formed, and ITS BOX IS THE STATE `CORE11_BOX_EXPECTED` PINS* | `Tests 1 failed \| 431 skipped (432)` | yes, clean; full spec re-run `432 passed` |

### M1 — the derivation proof, and what makes it one

Expected (the generated form) carried the mutation; Received (both shipped forms) did not:

```
- * constStrings - … so this collector OVER-approximatez. FALSIFIED 2026-08-24 (CR-13) …   ← Expected (generated)
+ * constStrings - … so this collector OVER-approximates. FALSIFIED 2026-08-24 (CR-13) …   ← Received (shipped)
```

Both messages opened identically apart from the file named:

```
AssertionError: the derived residual block in .planning/REQUIREMENTS.md DIVERGED from deriveResidual(RESOLVER_REGISTRY).
AssertionError: the derived residual block in packages/backend/src/outbound-prohibition.spec.ts DIVERGED from deriveResidual(RESOLVER_REGISTRY).

The GENERATED text is authoritative and the shipped text is the defect. Replace the span between the
sentinels with exactly this:
----- BEGIN EXPECTED ----- … ----- END EXPECTED -----
```

**A two-sided failure is what separates DERIVED from consistent.** Byte equality alone would be indistinguishable from a span hand-copied once and never regenerated. Only moving the REGISTRY and watching BOTH shipped spans fall behind shows the spans FOLLOW it.

### M2 and M4 — one copy at a time, which is the whole reason there are two cases

M2's message named the gate file; M4's named the ledger. The complementary result each time — one comparison red, the other green — is what proves each guard **individually**. A single mutation touching both copies would have proved neither.

M4's diff, from the assertion output:

```
- THE RESIDUAL OF CORE-11's OUTBOUND WALK - DERIVED, NOT AUTHORED.   ← Expected (generated)
+ THE RESIDUAL OF CORE-11's OUTBOUND WALX - DERIVED, NOT AUTHORED.   ← Received (shipped ledger)
```

**AN ACCURACY NOTE ABOUT WHAT HAPPENED TO THIS MUTATION.** An earlier agent context planted this same `WALK` → `WALX` drift and stalled before recording it; the orchestrator restored it with `git checkout --` and verified the tree clean. That agent reported having captured the titles and messages, but its context did not survive. Task 1's own ledger-drift proof was therefore **re-executed here (M4) rather than cited**, so this SUMMARY carries titles and messages from a run that actually happened in the session that wrote them. A cited-but-unseen proof is precisely what this phase has rejected seven times, and it would have been rejected here too.

### M5 — the box pin, MANDATORY in either outcome, watched failing

The pin exists because this box was flipped early and reverted twice. Its full assertion message names both reverts:

```
AssertionError: CORE-11's checkbox in .planning/REQUIREMENTS.md is not the state this suite pins.
  PINNED  : - [x] **CORE-11**
  SHIPPED : - [ ] **CORE-11**: No co

This box has been flipped early and REVERTED TWICE — at `e7cc4b6` after gap-closure round 3 and at
`faca607` after round 4 — and until 2026-08-24 the one case named for it could not see it: its regex
was the character class `[ x]`, which matches BOTH states, so it stayed green through both flips and
both reverts.

THE TERMINAL CONDITION WAS RE-SCOPED BY THE OPERATOR ON 2026-08-25 (plan 01-35, wave 35) AND WHAT
FOLLOWS IS THE CURRENT ONE. The superseded condition is NOT restated beside it, because two terminal
conditions standing side by side is the exact contradiction the third criterion forbids.
`CORE11_BOX_EXPECTED` changes in the SAME COMMIT as the ledger row, and only after a discharge in
which EACH of three criteria was verified BY EXECUTION in that session: (1) DERIVED …; (2)
DRIFT-DETECTABLE …; (3) THE SOLE BOUND …. Editing this constant on its own is NOT a way out and never
was. THIS BAR IS NARROWER THAN THE ONE IT REPLACES: it makes the gate's DESCRIPTION OF ITSELF derived,
drift-detectable and singular, and it does NOT claim the walk catches everything — CR-15, CR-16 and
the measured silences carried in the generated span are NAMED RESIDUALS under it, and the class stays
open because the space of JavaScript spellings is open. If ANY criterion is unmet, the box stays `[ ]`,
the blocking criterion is named in the ledger, and this constant says `[ ]`. `[ ]` IS A CORRECT
OUTCOME; an unexamined `[x]` is not.: expected false to be true // Object.is equality
 ❯ packages/backend/src/outbound-prohibition.spec.ts:9963:7
```

Note that the message quoted above is the one Task 1 **rewrote**: the superseded enumerated-surface promise was REPLACED by the three criteria rather than appended beside them, and both revert hashes, the WR-34 explanation, the same-commit rule and the `[ ]`-is-a-correct-outcome sentence all survived that rewrite. A pin nobody watched fail in this session is a pin this session may not rely on; this one was watched.

## WHAT THE BOX'S `[x]` MEANS, AND WHAT IT DOES NOT

**It means the three criteria above, verified by execution, and nothing else.** It does NOT mean the walk catches every spelling of every clause CORE-11's first sentence enumerates. That bar was re-scoped by the operator on 2026-08-25 precisely because it is UNREACHABLE over an open language rather than merely unmet: the space of JavaScript spellings for reaching a function through a value does not close, so no widening ever arrives at it.

**The new bar is NARROWER than the old one and it ends NO class.** CR-15 (a bare global in RECEIVER rather than CALLEE position), CR-16 (an unreadable computed member on a positively identified `navigator` receiver) and the **twenty-six measured silences** carried as rows in the generated span are NAMED RESIDUALS under this bar — disclosed and unclosed, not defects it waves away and not shapes it has closed. The class stays open because the space of spellings is open. A reader who takes this `[x]` for the end of the finding stream has been misled by it.

**What narrowed is the meaning of the CHECKBOX, not the meaning of the PROHIBITION.** CORE-11's first sentence — the must-NOT — is byte-identical through this wave, shown rather than asserted: the sentence was hashed before and after the box flip, since flipping `- [ ]` to `- [x]` edits the same physical line the must-NOT lives on and a naive line diff would look like a change to both.

```
== must-NOT first sentence, BEFORE flip ==
6c7b4b2d0db8d371fc80a76a33a024591c2b075a616eb6e5b06101257db9a04f  -
== must-NOT first sentence, AFTER flip ==
6c7b4b2d0db8d371fc80a76a33a024591c2b075a616eb6e5b06101257db9a04f  -
```

And it still holds on the measurements, unchanged by this wave: **23 files walked across both `SOURCE_ROOTS` with ZERO violations** and the four measured-exempt sites named — `compat.ts`'s `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]`; the shipped bundle's entire import set is **ONE specifier, `crypto`**; and `observations.ts`'s redaction code has been byte-identical since gap-closure round 5 and survived **19,772 swept inputs with zero leaks**. Every finding this wave touched is a prospective blindness in a TEST-ONLY gate or a defect in a DISCLOSURE — never a live exposure. **Nothing leaks.**

## STORE-03 AND STORE-07 — UNTOUCHED, AND THIS DECISION DOES NOT REACH THEM

Both remain **LEDGER COLLISIONS deferred with their owner** — the operator, at the next requirements pass, by the STORE-01 → STORE-08 route, the same route this re-scope travelled. `git diff` over both entries across the whole wave is EMPTY:

```
git diff e47ffdd~1 -- .planning/REQUIREMENTS.md | grep -cE '^[+-].*\*\*STORE-0[37]\*\*'
0
```

The ledger says so in its own words, in the same terms wave 28's correction used:

> **ONE FLIPPED BOX IS NOT A CLEAN LEDGER, AND THIS DECISION DOES NOT REACH STORE-03 OR STORE-07.** Both of their text-versus-usage collisions remain DEFERRED WITH AN OWNER — the operator, at the next requirements pass, by the STORE-01 → STORE-08 route — untouched by this wave and byte-identical through it. Whatever this box's state becomes below, it is CORE-11's disposition alone and no reader may take it for the ledger's.

## WHY THIS PLAN'S OWN VERIFY IS STATE-AGNOSTIC WHILE THE SUITE'S PIN IS NOT

The task-level automated verify is `grep -cE '^- \[[ x]\] \*\*CORE-11\*\*'`, which matches BOTH states and returned exactly **1**. That is deliberate: `[ ]` had to remain a reachable honest outcome, and an acceptance criterion that punished an open box would have converted this wave's honest result into a failure it must engineer around. **This is NOT a repeat of WR-34.** WR-34 was a state-agnostic character class in the SUITE's own pin — the very defect that let the box stay green through two early flips and two reverts — and `CORE11_BOX_EXPECTED` exists because of it. The suite's pin stays state-sensitive; only this plan's task-level verify is agnostic, and M5 above is the proof the sensitive one still bites.

## PREDICTION VERSUS MEASUREMENT

Recorded in the shape `01-27-SUMMARY.md` uses: the prediction, the measurement, and — where they differ — the difference stated as the finding rather than absorbed into the conclusion.

| # | Prediction | Measurement | Outcome |
| --- | --- | --- | --- |
| P1 | Criteria 1 and 2 re-verify green | Both spans and the generated form all at `15e86038…`; M1 turned both comparisons red, M2 and M4 turned one each | **Confirmed** |
| P2 | Criterion 3 turns on wave 33's exclusions being non-vacuous AND not over-broad | All three non-vacuous (12 / 9 / 12) and all three with **zero residue** — every excluded occurrence is machine-owned span, the declaration itself, or a live `clause` | **Confirmed** |
| P3 | Wave 33's counts reproduce | 58 line-based, 62 joined, surface 29 against 29 exemptions, span 12/12, registry 12/12, declaration 9 — every figure reproduced exactly | **Confirmed** |
| P4 | The first registry mutation would turn **both** byte comparisons red | It turned **one** red — the gate header's — and left the ledger's green | **DISAGREED. The difference was the finding.** |

**P4, WRITTEN OUT, BECAUSE IT IS THE ONE THAT DISAGREED.** The first mutation was intended to change `RESOLVER_REGISTRY[0].clause`. It was applied with a slurping substitution that replaced the FIRST occurrence in the file — and the first occurrence of that clause text is not the registry at line 4140 but the **shipped span** at line 1010, which the registry's text is generated into and which appears three thousand lines earlier. The measurement disclosed it immediately: a registry change must move the generated form and leave BOTH shipped copies behind, so exactly one red comparison was arithmetically impossible for the mutation that was believed to be planted. Chasing the number rather than accepting it located the mis-target on the first `git diff`.

Two things follow, and both are better than the plan predicted. First, **the mis-targeted mutation was not discarded** — a one-character change inside the gate header's span is exactly ROW 2's header-copy drift proof, so it was relabelled M2 and kept, and the deliberate registry mutation was re-planted with a line-scoped substitution as M1. Second, **the pair discriminates more sharply than either alone**: M2 (span-only) → one comparison red; M1 (registry) → both red. That contrast is the evidence for DERIVED. Had the first attempt landed where it was aimed, this SUMMARY would have carried the two-sided failure without the one-sided control beside it.

**No discrepancy was absorbed.** Wave 33 found its exemption map would generate obligations for its own text, and wave 34 found a third mechanism by re-measuring after its own widening — both by measuring first and believing the measurement. This wave did the same and got a mis-targeted mutation converted into a second proof.

## THE FULL GATE SET

This repo has **no active git hooks** — `.git/hooks` holds only samples and `core.hooksPath` is unset — so nothing runs the set at a commit boundary and it was run by hand at the task boundary.

```
pnpm test        exit 0     Test Files  31 passed (31)     Tests  1372 passed (1372)
pnpm typecheck   exit 0
pnpm lint        exit 0
pnpm knip        exit 0
pnpm build:backend  exit 0
pnpm check:bundle   exit 0
    packages/backend/dist/index.js: 1 import specifier(s): crypto
```

Neither figure is below the pre-wave baseline of 31 files / 1345 tests. The **final** confirming run of the set — after the box flip and both pointer amendments landed, at HEAD `996c077` — was executed **by the orchestrator rather than by this agent**, and is recorded here as its result rather than as this agent's: 31 files / 1372 tests, exit 0, working tree clean, both derived spans byte-identical. The runs listed above were executed by this agent at the same HEAD and agree with it.

Wave 33's guard was run after every edit and after every commit in this task, green each time, and `git diff` over its three exclusions, its `HEADER_QUANTIFIER_EXEMPTIONS` map and both its pinned counts is EMPTY. **The guard was never widened to obtain green** — no exclusion was moved, no exemption entry was added, and the one sentence that tripped it (M3, planted deliberately) was deleted rather than exempted.

`.planning/WINDOWS.md` was amended **through `gsd-tools windows`**, never by hand-editing the table: entry 39 marked fixed, entry 40 appended. Resulting ledger state: `open_count 19 / fixed_count 21 / total_count 40`.

## PRESERVED AS HISTORY — THE SUPERSEDED BAR, IN ITS ORIGINAL WORDING

This SUMMARY is the one place that is not itself a bound, so the superseded claim is preserved here in full rather than erased, and the six rounds that worked toward it are not written out of the record. The bar CORE-11's `[x]` was held to before 2026-08-25, as `.planning/REQUIREMENTS.md` still states it verbatim under its scoped supersession marker:

> **THE LIMITS, RESTATED, BECAUSE THE LEDGER IS WHERE AN OVERCLAIM DOES ITS DAMAGE.** When this box is eventually `[x]` it will mean the must-NOT holds, the enforcement covers every surface this entry's first sentence enumerates with a fixture that has been watched failing, and the residual is disclosed in a form that cannot silently drift and whose named branches carry probes.

That sentence is superseded, not deleted. Its bytes stand where they always stood, with a marker above them naming exactly which sentence it reaches:

> **SUPERSEDED IN PART BY THE OPERATOR DECISION OF 2026-08-25 (PLAN 01-35, WAVE 35) — AND THE MARKER IS SCOPED TO ONE SENTENCE ON PURPOSE.** … THE REST OF THE PARAGRAPH BELOW STANDS AND IS NOT TOUCHED BY THIS MARKER: its limits list remains true in every clause, and its closing sentence recording that STORE-03's and STORE-07's collisions remain DEFERRED WITH AN OWNER remains true and remains the current state of those two entries.

The scoping is load-bearing. That single paragraph carries **three** things: a statement of the old bar, a limits list that remains true, and the STORE-03 / STORE-07 deferral that remains true. A marker falsifying the whole paragraph would have deleted a true deferral record in the very act of correcting a superseded bar.

The two-valued disposition rule was applied across four reader surfaces and the counts are unchanged where they should be: `grep -c 'When this box is eventually' .planning/REQUIREMENTS.md` still returns **2** — one occurrence dated and plan-attributed (HISTORY, byte-identical), one standing (SUPERSEDED IN PLACE, marker above, bytes intact). `grep -c 'probes every surface' packages/backend/src/outbound-prohibition.spec.ts` returns **0**, down from 1: the constant's superseded promise was REPLACED, and the replacement prose was written not to contain the superseded literal in any form, because `grep -c` cannot tell a quotation from an assertion.

## Deviations from Plan

### [Rule 1 — measurement corrected] The first registry mutation landed in the shipped span, not the registry

- **Found during:** Task 2, ROW 1
- **Issue:** A slurping substitution replaced the first occurrence of the clause text in the file, which is the generated span at line 1010, not `RESOLVER_REGISTRY[0].clause` at line 4140.
- **Detection:** The measurement, not inspection — one red comparison where a registry mutation requires two.
- **Fix:** Re-planted with a line-scoped substitution (M1). The mis-targeted mutation was **kept and relabelled M2**, because a one-character change inside the gate header's span is exactly ROW 2's header-copy proof.
- **Verification:** M1 → both comparisons red; M2 → gate header red, ledger green.
- **Recorded as:** prediction P4 above, as the finding rather than as an absorbed correction.

### [Rule 3 — blocker] Task 1's ledger-drift proof text did not survive its agent's context

- **Found during:** Task 2, ROW 2
- **Issue:** The plan directs Task 2 to CITE Task 1's ledger-copy drift proof by its pasted title and message. An earlier agent context planted that mutation, stalled before recording it, and the orchestrator restored it with `git checkout --`; the titles and messages were lost with that context.
- **Fix:** Re-executed the mutation here as **M4** rather than citing evidence nobody in this session watched.
- **Verification:** M4's title, message and complementary green recorded above.

---

**Total deviations:** 2 (1 measurement correction, 1 blocker).
**Impact on plan:** Both increased the evidence rather than reducing it. No scope creep, no widening of any guard, no criterion discharged by citation.

## Issues Encountered

The executing machine slept repeatedly mid-response, which the orchestrator diagnosed after several watchdog trips. It cost no work: every unit was committed the moment it was done, so each interruption lost at most one step. No mutation was ever left planted — the orchestrator verified a clean tree after each stall, and each restore was re-confirmed here by `git diff --exit-code` before the next mutation.

## Next Phase Readiness

CORE-11 is `[x]` against a bar that is stated, reachable and discharged by execution, and its two statements — the ledger row and `CORE11_BOX_EXPECTED` — agree and move together by construction. The residuals that remain are named and open, not silent: CR-15, CR-16 and the twenty-six measured silences in the generated span, plus the two unguarded reader surfaces (`.planning/STATE.md`, `.planning/WINDOWS.md`) and the undeclared-spelling class inside the guarded files. STORE-03 and STORE-07 are still queued on the operator's next requirements pass. One flipped box is not a clean ledger.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-26*
