---
phase: 01-skeleton-persistence-compatibility
plan: 33
subsystem: testing
tags: [outbound-gate, core-11, gap-closure, quantifier-guard, derived-residual, vitest]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "wave 32's closed CR-11, the retitled fixture, the removed silence row and its never-returns guard; wave 27's derived span and the pointer-not-a-bound rule"
provides:
  - "The gate file's hand-written header states NO bound of its own — CR-14's two sites and WR-38's site DELETED and replaced by pointers"
  - "A whole-file, WRAP-TOLERANT quantifier guard with three anchored, non-vacuous exclusions"
  - "HEADER_QUANTIFIER_EXEMPTIONS — 29 named, reasoned entries, count machine-pinned against the occurrence count"
  - "Exclusion three NARROWED: the registry line range pinned against the live clause strings"
  - "Four executed mutation proofs, including the WRAPPED phrasing a line-based guard would miss"
  - "Dated CORE-11 ledger correction plus pointer amendments on both append-only histories"
affects: [wave-34, wave-35, core-11]

actuals:
  tokens: 62000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Delete the surface rather than instrument it — a surface carrying no bound cannot carry a stale one"
    - "Anchor-derived exclusions with non-vacuity asserted BEFORE the rule, in both directions"
    - "Masked exemption keys — a key carrying its phrasing verbatim would raise obligations for its own text"
    - "Commit-then-mutate for every mutation proof"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/WINDOWS.md

key-decisions:
  - "Registry-exclusion disposition: NARROW — the line range is pinned against the live clause strings (12 == 12), so the coarseness stops being able to hide anything"
  - "DELETE and REWRITE preferred over EXEMPT: 13 occurrences removed outright, 29 carried as named exemptions"
  - "The guard scans the JOINED form, not line by line — the review's suggested guard would report 20 where 24 exist"

patterns-established:
  - "Pointer-not-a-bound extended from STATE.md/WINDOWS.md to the gate's own header"
  - "An exemption map's size is reported as a COST, not as a result"

requirements-completed: []

coverage:
  - id: D1
    description: "CR-14's two header sites deleted; the header no longer asserts an operator around a global receiver is silent"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "grep -c 'STILL SILENT' over lines 1..DERIVED_BEGIN → 0"
        status: pass
      - kind: unit
        ref: "grep -c 'OPEN AND UNOWNED' over lines 1..DERIVED_BEGIN → 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "WR-38's header site deleted; the box's state is stated only by the ledger row and CORE11_BOX_EXPECTED"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "grep -c 'IS NOW MARKED COMPLETE' over the header → 0; CORE11_BOX_EXPECTED still present at :9461"
        status: pass
    human_judgment: false
  - id: D3
    description: "Whole-file wrap-tolerant quantifier guard with three anchored, non-vacuous exclusions"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the gate file's own bytes carry NO declared phrasing outside the three exclusions except by NAMED exemption"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the three quantifier-surface exclusions are ANCHOR-DERIVED, NON-EMPTY, WITHIN A PINNED BAND and POSITIVELY IDENTIFIED — asserted BEFORE the rule"
        status: pass
    human_judgment: false
  - id: D4
    description: "Exclusion three NARROWED — registry line range pinned against the live clause strings"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#exclusion three carries ONLY clause strings — the registry line range and the live clauses agree, occurrence for occurrence"
        status: pass
    human_judgment: false
  - id: D5
    description: "Four mutation proofs executed separately — single-line, WRAPPED, emptied exclusion, removed exemption"
    verification:
      - kind: manual_procedural
        ref: "four commit-then-mutate cycles, each RED by title and message, each restored with git diff --exit-code clean — table pasted below"
        status: pass
    human_judgment: false
  - id: D6
    description: "Dated CORE-11 ledger correction plus pointer amendments on STATE.md and WINDOWS.md"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "REQUIREMENTS.md pure append (15 insertions / 0 deletions); STATE.md prior 29,820 bytes an exact prefix; both spans byte-identical at f850802f…"
        status: pass
    human_judgment: false
  - id: D7
    description: "The pointer-not-a-bound rule for STATE.md and WINDOWS.md remains a prohibition with NO mechanical check"
    verification: []
    human_judgment: true
    rationale: "The byte comparison reaches the gate header and REQUIREMENTS.md and no further. Nothing mechanical stops a later author writing a fresh bound into either append-only history. Disclosed, not closed — a human must keep reading these two surfaces."

duration: 24 min
completed: 2026-08-25
status: complete
---

# Phase 01 Plan 33: Delete the Header's Bounds Summary

**The gate file's hand-written header now points at the generated span and asserts nothing — CR-14 and WR-38 died with the paragraphs that carried them, and a whole-file wrap-tolerant guard with three anchored exclusions and 29 named exemptions keeps them deleted.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-08-25T09:37:00Z
- **Completed:** 2026-08-25T10:01:09Z
- **Tasks:** 3
- **Files modified:** 4

## THE ONE SENTENCE THIS SUMMARY IS REQUIRED TO CARRY

**This wave changed the gate's DESCRIPTION OF ITSELF and not its REACH: CR-15 and CR-16 remain open and belong to wave 34, and CORE-11's box is exactly as wave 32 left it and wave 35 owns it.**

---

## 1. THE MEASUREMENT, BEFORE ANY EDIT

Taken at `4c09cb3`. The plan's precondition forbade asserting hash equality against `e193dfc` and required instead that the measurements REPRODUCE at HEAD. Both required diffs were empty:

```
$ git diff --stat e193dfc..HEAD -- packages/ scripts/ tests/
(empty)
$ git diff --stat e193dfc..HEAD -- packages/backend/src/outbound-prohibition.spec.ts .planning/REQUIREMENTS.md
(empty)
```

Five regions, two scanning conventions. LINE-BASED is the review's suggestion (one scan per line). JOINED strips each line's comment prefix, concatenates with a single space and collapses whitespace runs.

```
########## BEFORE (at 4c09cb3, pre-wave-33) ##########
┌─────────┬─────────────────────────────────────────────────────┬───────┬───────────┬────────┐
│ (index) │ region                                              │ lines │ lineBased │ joined │
├─────────┼─────────────────────────────────────────────────────┼───────┼───────────┼────────┤
│ 0       │ 'header (1..956)'                                   │ 956   │ 12        │ 14     │
│ 1       │ 'machine span (957..1466)'                          │ 510   │ 12        │ 12     │
│ 2       │ 'code above registry (1468..3976)'                  │ 2509  │ 8         │ 10     │
│ 3       │ 'registry range (3977..5589)'                       │ 1613  │ 12        │ 12     │
│ 4       │ 'below registry (5590..9109)'                       │ 3520  │ 26        │ 27     │
│ 5       │ 'HAND-WRITTEN TOTAL (header + code above registry)' │ 3465  │ 20        │ 24     │
└─────────┴─────────────────────────────────────────────────────┴───────┴───────────┴────────┘
```

**EVERY OCCURRENCE COUNT THE PLAN PREDICTED REPRODUCED EXACTLY** — header 12/14, code-above-registry 8/10, hand-written 20/24, registry 12/12, below-registry 26/27, span 12/12. The verifier's independent 20 and this plan's 20 agree, and both are line-based.

**THE HAND-WRITTEN REGION SCORES 20 LINE-BASED AND 24 JOINED, AND THE NARROWER OF THE TWO IS THE REVIEW'S SUGGESTION.** Four occurrences wrap across two comment lines and are invisible to a line-based scan. A guard reporting 20 while 24 exist is a stated reach exceeding an executed reach — the exact defect this round exists to remove, arriving as its own fix. The four wrapped occurrences, named by the offset-mapped scanner:

| line | phrasing | evidence |
|---|---|---|
| 235 | `every spelling` | `…in a paragraph claiming every` / `spelling.` |
| 468 | `every spelling` | `…an assembled binding in every` / `spelling, for a conditional…` |
| 2948 | `anywhere in the file` | `…a name is bound to anywhere in` / `the file and step 1…` |
| 3059 | `every literal` | `…recorded for a name — which is every` / `literal that name is bound to…` |

**AND A REGION NOBODY HAD MEASURED.** The 3,520 lines BELOW the registry carry 26 line-based / 27 joined — MORE than the header. Nine of those are the `UNBOUNDED_QUANTIFIERS` declaration itself, excluded by construction. Had the guard scanned only "the header", the other 18 would have been round 8's pre-written finding.

### Prediction-vs-measurement discrepancies

Recorded rather than absorbed, in the shape `01-27-SUMMARY.md` used. **There were four.**

| # | Predicted | Measured | Disposition |
|---|---|---|---|
| 1 | below-registry region is **3,615 lines** | **3,520 lines** | The plan's LINE count was off by 95. Its OCCURRENCE counts (26/27) were exact. A line count, not a finding. |
| 2 | hand-written region is **3,464 lines** | **3,465 lines** | Off by one — an inclusive-boundary convention, not a drift. |
| 3 | **six** P9-D3 pointer amendments exist in `STATE.md`; write the seventh | **nine** exist; mine is the **tenth** | The plan's count was three stale. Amendment text corrected to say "as the fourth through ninth amendments each did". |
| 4 | registry-range occurrences might include between-rows comments | **zero** do — 12 in range, 12 in clauses | Decided the disposition here rather than handing it to wave 35. See §4. |

---

## 2. CR-14's SIX EXEMPLARS, PRESERVED AS HISTORY IN THE ONE PLACE THAT IS NOT A BOUND

The deleted paragraph claimed all six reported `[]`. Re-executed through `auditSource` in this session:

```
(ok && globalThis).fetch(url);             -> [outbound-fetch]
(g ?? globalThis)["fetch"](url);           -> [outbound-fetch]
(b ? globalThis : x).fetch(url);           -> [outbound-fetch]
(b ? navigator : x).sendBeacon(u, d);      -> [outbound-beacon]
(b ? fetch : x)(url);                      -> [outbound-fetch]
(b ? eval : x)(src);                       -> [outbound-dynamic-code]
```

**All six report.** The universal seven waves believed is falsified in all six of its own named cases. These live HERE and nowhere in the gate file, because a history is a record and a record is not a bound.

Confirmed before writing the replacement pointer, so it names things that exist:
- `:7749` — fixture still titled `… CLOSED (CR-11)`
- `:8856-8861` — the guard asserting `silence-operator-around-global-receiver` never returns

---

## 3. WHAT WAS DELETED, AND WHAT REPLACED IT

Three paragraphs deleted; two sentences rewritten. Diff rather than description:

```
$ git diff 4c09cb3 -- packages/backend/src/outbound-prohibition.spec.ts | grep '^-' | grep -c 'STILL SILENT\|OPEN AND UNOWNED\|IS NOW MARKED COMPLETE'
3
```

| site | what it asserted | disposition |
|---|---|---|
| `:756-772` | an operator wrapping a global receiver is STILL SILENT in six named spellings, "Pinned by a fixture titled as a MEASURED SILENCE" | **DELETED** |
| `:774-781` | that same shape listed as **OPEN AND UNOWNED**, "no plan in this phase claims it" | **DELETED** |
| `:908-916` | "CORE-11 IS NOW MARKED COMPLETE IN `REQUIREMENTS.md`" | **DELETED** |
| `:99` | "a name bound to an outbound receiver **anywhere in the file** is treated as one **everywhere in it**" | **REWRITTEN** → "AT EITHER COLLECTING BRANCH … at every later read" |
| `:661` | "nesting resolves at **any depth**" | **REWRITTEN** → "a NESTED operator resolves through the same four `RECEIVER_OPERATORS` at each level" |

**The replacement pointers, quoted.** Both written in the shape `:943-955` (wave 28's note) already uses:

> WHAT STOOD HERE, AND WHY IT IS GONE RATHER THAN CORRECTED. […] THEY ARE DELETED RATHER THAN RE-DATED, and that choice is the whole of wave 33. A corrected sentence is still an AUTHORED bound standing beside a DERIVED one, which is how seven consecutive waves each fixed a stale claim here and each acquired the next. THE RESIDUAL OF RECORD IS THE GENERATED SPAN BELOW, between the two sentinel lines, byte-compared to deriveResidual(RESOLVER_REGISTRY) by this suite. THIS PARAGRAPH RESTATES NO BOUND OF ITS OWN, deliberately, for the same reason `.planning/STATE.md` and `.planning/WINDOWS.md` do not.

> CORE-11's BOX IS NOT STATED HERE, AS OF 2026-08-25 (wave 33, WR-38). […] THE BOX'S STATE IS NOW STATED IN EXACTLY TWO PLACES: the CORE-11 row in `.planning/REQUIREMENTS.md`, and `CORE11_BOX_EXPECTED` below, which pins that row by bytes. This paragraph POINTS at both and asserts neither, so the contradiction cannot recur — one side of it no longer exists.

**Executed acceptance greps:**

```
header ends at line 957
--- (1) STILL SILENT in header: expect 0 ---            0
--- (2) unowned-shape sentence in header: expect 0 ---  0
--- (2b) fixture still titled CLOSED ---
7749:  it("through operatorOperandMatching: AN OPERATOR AROUND A GLOBAL RECEIVER RESOLVES, IN CALL POSITION — … CLOSED (CR-11)", …
--- (3) 'CORE-11 IS NOW MARKED COMPLETE' in header: expect 0 ---  0
--- (3b) CORE11_BOX_EXPECTED still present ---
9461:  const CORE11_BOX_EXPECTED = "- [ ] **CORE-11**";
--- (3c) exactly one CORE-11 ledger row ---             1
46:- [ ] **CORE-11**: …
```

---

## 4. THE REGISTRY-EXCLUSION DISPOSITION: **NARROW**

**Measured, not estimated.** The registry's line range and the live `clause` strings were counted separately:

```
registry LINE RANGE (3978..5590) occurrences : 12
live RESOLVER_REGISTRY[].clause occurrences  : 12
  → occurrences in a between-rows docblock or comment: 0
```

All 12 sit on `clause:` values at `:3983`, `:4131`, `:4469`, `:4509`, `:4563` (×4), `:4696`.

**DISPOSITION: NARROW, and the reason is that narrowing costs nothing today and removes a latent wave-35 `✗` permanently.** Because the two counts are already equal, tightening is provably behaviour-preserving right now. Rather than textually stripping the clause strings out of the scanned bytes — fragile, because source escapes (`\'`) do not survive to the runtime string, and a fragile exclusion is a silently-vacuous one, the exact failure mode being guarded against — exclusion three keeps its line range and is **pinned by an equality assertion** in its own case:

> `it("exclusion three carries ONLY clause strings — the registry line range and the live clauses agree, occurrence for occurrence")`

A phrasing written into a between-rows docblock makes `inRange` 13 while `inClauses` stays 12, and the suite goes red naming the difference. **The coarseness therefore cannot hide anything, which is what NARROW was asked to achieve.**

**This wave hands wave 35 NO known criterion-3 blocker on exclusion three.** Its check (c) requires every occurrence inside each exclusion to be a machine-owned span, the declaration itself, or a `RESOLVER_REGISTRY[].clause`. Measured: all 12 are clauses, all of exclusion one is the machine-owned span, all of exclusion two is the declaration. Check (c) is satisfiable today and is machine-enforced against future drift.

---

## 5. THE GUARD, ITS EXCLUSIONS AND ITS STATED LIMITS

**The exclusions each anchor resolved to** (never line numbers — an exclusion pinned to a literal slides the first time anything above it grows):

| # | exclusion | anchors | resolved | pinned band | positive containment |
|---|---|---|---|---|---|
| 1 | machine-owned span | `BEGIN DERIVED RESIDUAL` → `END DERIVED RESIDUAL` | **957..1468, 512 lines** | 100..1500 | `THE RESIDUAL OF CORE-11's OUTBOUND WALK - DERIVED, NOT AUTHORED.` |
| 2 | `UNBOUNDED_QUANTIFIERS` declaration | `export const UNBOUNDED_QUANTIFIERS` → next `]);` | **5665..5675, 11 lines** | 5..40 | `export const UNBOUNDED_QUANTIFIERS` |
| 3 | `RESOLVER_REGISTRY` range | `export const RESOLVER_REGISTRY` → next `]);` | **3978..5590, 1613 lines** | 500..3000 | `id: "constStrings"` |

Each asserts, BEFORE the rule runs: non-empty, closing anchor found after the opening one, line count inside the band, and positive containment of a token only that construct carries. **Both directions fail loudly** — an exclusion matching nothing turns the guard green by excluding zero; one matching everything turns it green by excluding the file.

**The guard's stated limits, from its own docblock:**

> **(1) IT IS A PHRASE LIST.** Its reach is exactly the strings in `UNBOUNDED_QUANTIFIERS` and no further. A universal spelled in words that are not on that list passes it untouched […] Rewriting a matched sentence into a synonym would turn this guard green while preserving the bound, and that would be gaming it rather than satisfying it.
>
> **(2) IT IS NORMALIZATION-DEPENDENT, AND THE CONVENTION IS NAMED IN CODE RATHER THAN LEFT IN A REGULAR EXPRESSION.** […] 20 line by line and 24 under the convention below. FOUR occurrences wrap across two comment lines.
>
> **(3) IT REACHES BYTES, NOT MEANING.** A sentence that asserts a universal without using a declared phrasing is invisible to it. It cannot read a claim; it can only find a string.
>
> **(4) EXCLUSION THREE IS COARSER THAN ITS NAME.** […] NARROWED rather than merely disclosed […] Measured at wave 33: 12 and 12.

And, in the same docblock, the ordering the plan required stated plainly:

> **THE DELETION IS WHAT MAKES THE HEADER CORRECT. THIS GUARD ONLY KEEPS IT DELETED** — it is the cheap, bounded thing that stops the surface being re-populated, and no sentence anywhere may claim more of it than that.

**A design point found during implementation and worth recording.** The exemption map's keys are the normalized source line with each phrasing MASKED to a `{qN}` token. An unmasked key would carry a declared phrasing verbatim, the whole-file scan would find it *inside the map itself*, and the map would generate the obligations it exists to discharge — an infinite regress. The guard asserts the masking holds:

> `exemption key … carries a declared phrasing verbatim. Keys are MASKED to \`{qN}\` tokens for exactly this reason: an unmasked key is itself scanned, so the map would raise an obligation for its own text and no amount of entries could ever discharge it.`

---

## 6. THE TRIAGE TABLE — ONE ROW PER SURVIVING OCCURRENCE

Every occurrence outside the three exclusions, with its disposition and reason. **DELETE and REWRITE were preferred over EXEMPT wherever the sentence stated a bound rather than quoting, labelling or bounding one.**

### Header (Task 1's region) — 14 occurrences → 1 deleted, 2 rewritten, 11 exempt

| line | phrasing | disposition | reason |
|---|---|---|---|
| 99 | `anywhere in the file` | **REWRITE** | asserted alias reach; now names the two collecting branches instead |
| 133 | `every literal` | EXEMPT | bounded in the same sentence by the clause naming the collecting branches |
| 134 | `ANY of them` | EXEMPT | predicate half of the sentence above, same bound |
| 178 | `anywhere in the file` | EXEMPT | a QUOTATION of a phrase recorded as REMOVED (CR-13) |
| 235 (WRAP) | `every spelling` | EXEMPT | quotes a superseded paragraph's FALSE claim in order to record it as false |
| 303 | `ANY-BINDING-WINS` | EXEMPT | ASCII table cell naming a rule label |
| 305 | `ANY-BINDING-WINS` | EXEMPT | same table, `var` row |
| 309 | `ANY-BINDING-WINS` | EXEMPT | same table, MIRROR row |
| 436 | `any depth` | EXEMPT | table cell; bounded by `QUANTIFIED_CLAUSES.keyReceiver`'s four operators |
| 468 (WRAP) | `every spelling` | EXEMPT | bounded in-sentence by four enumerated positions + "Two hops is out" |
| 523 | `anywhere in the file` | EXEMPT | records WHY a former exemption was DELETED |
| 600 | `any depth` | EXEMPT | records a DELETED hop clause and its executed probe |
| 661 | `any depth` | **REWRITE** | now names the four `RECEIVER_OPERATORS` instead of asserting unbounded depth |
| 763 | `every spelling` | **DELETE** | inside CR-14's deleted paragraph |

### Code above the registry — 10 occurrences → 6 rewritten out, 4 exempt

| line | phrasing | disposition | reason |
|---|---|---|---|
| 1756 | `any depth` | EXEMPT | describes the FILE WALK's directory recursion, not the outbound walk's reach; pinned by the 23-file assertion |
| 2771 | `any depth` | **REWRITE** | alias chaining → "DO chain, link after link" |
| 2789 | `anywhere in the file` | **REWRITE** | → "a binding is seen from EVERY use site the module has" |
| 2789 | `anywhere in the file` (2nd) | **REWRITE** | same edit removes both |
| 2796 | `any depth` | **REWRITE** | → "chains link after link" |
| 2949 (WRAP) | `anywhere in the file` | **REWRITE** | → "at ANY OF ITS COLLECTING BRANCHES" |
| 2950 | `ANY of them` | EXEMPT | bounded by the collecting-branches clause on the line above |
| 2951 | `ANY-BINDING-WINS` | EXEMPT | one-line rule LABEL; the sentence it labels states the direction |
| 3060 (WRAP) | `every literal` | EXEMPT | bounded in-sentence by the four branches enumerated right after it |
| 3061 | `anywhere in the file` | **REWRITE** | redundant with that enumeration; dropped |

### Below the registry — 27 occurrences → 9 excluded by construction, 4 rewritten out, 14 exempt

| line | phrasing | disposition | reason |
|---|---|---|---|
| 5644 | `ANY string literal` | EXEMPT | one of three occurrences forming a single QUOTATION of the universals round 6 disproved — the evidence for why the list exists |
| 5644 (WRAP) | `anywhere in the file` | EXEMPT | same quotation |
| 5645 | `every spelling` | EXEMPT | same quotation, second falsified universal |
| 5665-5673 | all nine | **EXCLUDED** | the `UNBOUNDED_QUANTIFIERS` declaration — it IS the list, excluded by construction, no entry written (a second mechanism for the same fact) |
| 5694 | `everywhere in the file` | EXEMPT (NAMED CLASS) | `QUANTIFIED_CLAUSES` value: stating what BOUNDS a universal necessarily quotes it. Class bounded by that map's own key set |
| 5696 | `any depth` ×2 | EXEMPT (NAMED CLASS) | same class |
| 6536 | `every reachable spelling` | **REWRITE** | a `describe` title repeating a phrase the registry records as FALSIFIED → "in the four spellings isFetchExpression branches on" |
| 6919 | `every spelling` | EXEMPT | parameterised test title; the spellings are its own parameter table |
| 7014 | `any depth` | **REWRITE** | → "link after link" |
| 7043 | `anywhere in the file` | **REWRITE** | → "at ANY OF ITS COLLECTING BRANCHES" |
| 7044 | `ANY of them` | EXEMPT | bounded by that clause |
| 7067 | `ANY-BINDING-WINS` | EXEMPT | test title naming the rule label under test |
| 7072 | `ANY-BINDING-WINS` | EXEMPT | names the label and its direction in the same breath |
| 7121 | `every spelling` | EXEMPT | a QUOTATION, in quotation marks, of a claim recorded as false |
| 7295 | `ANY-BINDING-WINS` | EXEMPT | test title naming the rule label |
| 7727 | `any depth` | **REWRITE** | → "through the same four RECEIVER_OPERATORS at each level" |
| 9079 | `every spelling` | EXEMPT | quotation of the REMOVED row's universal |
| 9104 | `every spelling` | EXEMPT | assertion message; bounded by "it named" — the row's own set |

### The exemption count, stated as a COST

**29 entries.** That is 29 sentences a later author must keep true — and specifically: **whenever any of those 29 source lines is reworded, its exemption key changes, the entry goes stale, and the suite goes red until a human re-reads the sentence and decides again whether it quotes a bound or states one.** That is the cost, and it is deliberate: a stale exemption is caught, not inherited. The alternative — an exemption map growing toward forty — would have meant instrumenting the surface rather than removing it, which is what the verifier told this round to avoid. **13 occurrences were removed outright rather than exempted** (1 deleted with CR-14's paragraph, 12 rewritten out), which is why the map is 29 and not 42.

### After-triage measurement, and the machine-pinned equality

```
########## AFTER (post-triage) ##########
┌─────────┬─────────────────────────────────────────────────────┬───────┬───────────┬────────┐
│ (index) │ region                                              │ lines │ lineBased │ joined │
├─────────┼─────────────────────────────────────────────────────┼───────┼───────────┼────────┤
│ 0       │ 'header (1..957)'                                   │ 957   │ 9         │ 11     │
│ 1       │ 'machine span (958..1467)'                          │ 510   │ 12        │ 12     │
│ 2       │ 'code above registry (1469..3977)'                  │ 2509  │ 3         │ 4      │
│ 3       │ 'registry range (3978..5590)'                       │ 1613  │ 12        │ 12     │
│ 4       │ 'below registry (5591..9531)'                       │ 3941  │ 22        │ 23     │
│ 5       │ 'HAND-WRITTEN TOTAL (header + code above registry)' │ 3466  │ 12        │ 15     │
└─────────┴─────────────────────────────────────────────────────┴───────┴───────────┴────────┘

surface occurrences outside all three exclusions : 29
HEADER_QUANTIFIER_EXEMPTIONS entries             : 29
```

The equality is **enforced by the guard**, not hand-checked:

> `expect(foundKeys.length, "…One entry excuses one occurrence; these two numbers are the same number or something is being counted twice.").toBe(declared.length);`

Both directions are pinned: an unmatched occurrence fails, and a **stale entry matching nothing** fails too.

---

## 7. FOUR MUTATION PROOFS — EXECUTED SEPARATELY, NEVER COMBINED

**RUN ORDER: 1 → 2 → 3 → 4.** Each planted after its task's real work was committed, each restored and cross-checked with `git diff --exit-code` before the next.

| # | mutation | commit before mutating | test that went RED | assertion message | restore |
|---|---|---|---|---|---|
| 1 | one declared phrasing re-planted on a SINGLE header line (`:101`) | `516ce1d` | `the gate file's own bytes carry NO declared phrasing outside the three exclusions except by NAMED exemption` | `1 declared-phrasing occurrence(s) … carry NO exemption entry:` / `line 101: "MUTATION 1: a receiver bound {q0} is seen. :: q0"` | `git diff --exit-code` clean |
| 2 | one phrasing re-planted **WRAPPED across two comment lines** (`:101-102`) | `516ce1d` | same case | `line 101 (wraps to 102): "MUTATION 2: the alias sets resolve a chain to any :: q2"` | `git diff --exit-code` clean |
| 3 | exclusion three EMPTIED (`to: registryStart`) | `bb2ac11` | **THREE cases** — `the three quantifier-surface exclusions are ANCHOR-DERIVED, NON-EMPTY, WITHIN A PINNED BAND and POSITIVELY IDENTIFIED`, `exclusion three carries ONLY clause strings`, and the guard case | `exclusion \`the RESOLVER_REGISTRY declaration\` found its opening anchor at line 3978 but no closing anchor after it…` / `the registry's line range (3978..3978) carries 0 declared-phrasing occurrences while its live \`clause\` strings carry 12…` / `12 declared-phrasing occurrence(s) … carry NO exemption entry` | `git diff --exit-code` clean |
| 4 | one `HEADER_QUANTIFIER_EXEMPTIONS` entry removed while its sentence stands | `bb2ac11` | the guard case | `1 declared-phrasing occurrence(s) … line 2951: "WHICH DIRECTION THAT ERRS IN, SAID PLAINLY: {q8} :: q8"` | `git diff --exit-code` clean |

**HAD THE GUARD BEEN LINE-BASED, MUTATION 2 WOULD HAVE PASSED** — and this is proven rather than asserted, because a line-based scan of the two planted lines was executed and found nothing:

```
$ sed -n "101,102p" packages/backend/src/outbound-prohibition.spec.ts
//          MUTATION 2: the alias sets resolve a chain to any
//          depth, which no single line of this comment states.
$ awk 'NR==101||NR==102' packages/backend/src/outbound-prohibition.spec.ts | grep -c "any depth"
0
```

The guard nonetheless named the line AND the wrap: `line 101 (wraps to 102)`.

**COMMIT-BEFORE-MUTATE, PROVEN.** Wave 29 destroyed its own Task 1 by running `git checkout --` against uncommitted work. `git log --oneline -1` immediately before each mutation:

```
516ce1d feat(01-33): delete the header's bounds and guard the whole file against their return   ← before mutations 1 and 2
bb2ac11 refactor(01-33): triage the code and below-registry regions — …                          ← before mutations 3 and 4
```

Mutation 3 is the direction that matters most for a silently-vacuous exclusion: **both** the guard case (naming the 12 occurrences the exclusion had been carrying) and the exclusion's **own non-vacuity case** went red, plus the NARROW equality pin — three cases, not one.

---

## 8. NO RULE WIDENED, NO SHAPE CLOSED — SHOWN, NOT ASSERTED

```
$ git diff --stat 4c09cb3..HEAD
 .planning/REQUIREMENTS.md                         |  15 +
 .planning/STATE.md                                |   2 +-
 .planning/WINDOWS.md                              |  23 +-
 packages/backend/src/outbound-prohibition.spec.ts | 526 +++++++++++++++++++---
 4 files changed, 508 insertions(+), 58 deletions(-)
```

And the decisive one — the registry compared range-to-range:

```
RESOLVER_REGISTRY byte-identical: true | lines: 1613
```

**Not one registry row, clause, probe or branch moved.** The gate-file diff is comment deletions, two comment rewrites, the guard, the exemption map and their helpers.

CORE-11's checkbox, untouched:

```
$ git diff 4c09cb3 -- .planning/REQUIREMENTS.md | grep -c "^-.*CORE-11\*\*"
0
$ grep -c '^- \[[ x]\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
1
```

---

## 9. THE LEDGER AND BOTH POINTER SURFACES

**Both derived spans, side by side, with the hashing convention stated:**

```
┌─────────┬────────────────────────────────────────────────┬───────────┬─────────┬───────┬─────────┐
│ (index) │ file                                           │ beginLine │ endLine │ lines │ entries │
├─────────┼────────────────────────────────────────────────┼───────────┼─────────┼───────┼─────────┤
│ 0       │ packages/backend/src/outbound-prohibition.spec.ts │ 957    │ 1468    │ 510   │ 51      │
│ 1       │ .planning/REQUIREMENTS.md                      │ 116       │ 627     │ 510   │ 51      │
└─────────┴────────────────────────────────────────────────┴───────────┴─────────┴───────┴─────────┘

sha256, span hashed WITHOUT a trailing newline (what extractDerivedBlock returns):
  gate file        f850802f402eabb23e6b044f3b65ae819ebdc75d57aecc89de444e7c433157fe
  REQUIREMENTS.md  f850802f402eabb23e6b044f3b65ae819ebdc75d57aecc89de444e7c433157fe
  IDENTICAL: true      reproduces the verifier's quoted digest: true

sha256, span hashed WITH a trailing newline (what a naive `sed | shasum` gives):
  both             d61b55354b3971083d4c0512939f6d3e0f2e70df9c5a4d1fa2379455e734c785
```

**That is a hashing CONVENTION, not a divergence.** Both digests are shown so a future session does not mistake one for the other. The span was NOT regenerated — no registry row moved, so byte-identity was asserted instead.

**Append-never-rewrite, proven on both surfaces:**

```
$ git diff --stat .planning/REQUIREMENTS.md
 .planning/REQUIREMENTS.md | 15 +++++++++++++++
 1 file changed, 15 insertions(+)          ← 0 deletions; every prior correction byte-identical

STATE.md line 243 (P9-D3):
  old length: 29820   new length: 32030
  APPEND-ONLY (old is an exact prefix of new): true
  amendments before: 9   after: 10
```

**The sentence the plan required the correction to carry, quoted verbatim from `.planning/REQUIREMENTS.md`:**

> **WHAT THIS WAVE DOES NOT DO, STATED IN THIS PARAGRAPH RATHER THAN A LATER ONE, BECAUSE THE LEDGER IS WHERE AN OVERCLAIM DOES ITS DAMAGE.** IT CLOSES NO CODE BLINDNESS AND WIDENS THE GATE'S REACH BY NOT ONE SHAPE. It changes the gate's DESCRIPTION OF ITSELF, making it singular; it does not change what the walk resolves. CR-15 and CR-16 remain OPEN — two unclosed code blindnesses on clauses CORE-11's own first sentence enumerates — and WAVE 34 OWNS THEM. This wave does not touch CORE-11's checkbox, which is exactly as wave 32 left it and which WAVE 35 owns. A reader who takes this correction for progress on the gate's REACH has been misled by it, and it is written so they cannot be.

**`gsd-tools windows`, every command with its raw output** (never hand-edited):

```
$ gsd-tools windows append --kind deviation --phase 01 --file packages/backend/src/outbound-prohibition.spec.ts --description "POINTER, NOT A BOUND (plan 01-33, …)"
{ "ok": true, "ledger": { "open_count": 20, "waived_count": 0, "fixed_count": 18, "total_count": 38, … } }

$ gsd-tools windows fixed 37
{"ok":true,"open":19,"fixed":19,"total":38}
#37 status=fixed resolved_at=2026-08-25T09:58:45.681Z file=packages/backend/src/outbound-prohibition.spec.ts
#38 status=open  resolved_at=null                    file=packages/backend/src/outbound-prohibition.spec.ts
```

**Open-entry count for this gate file: 1** (entry 38). Entries 13, 20, 22, 23, 25–28, 31–37 are all `fixed`.

---

## 10. THE FULL GATE SET, RUN BY HAND

This repo has **NO active git hooks** — verified: `.git/hooks` holds only `*.sample`, and `git config --get core.hooksPath` exits 1. Nothing runs these at a commit boundary, so every one was run by hand.

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  1348 passed (1348)        ← baseline entering the wave: 31 files / 1345 tests; +3 new cases

$ pnpm typecheck   → exit 0
$ pnpm lint        → exit 0
$ pnpm knip        → exit 0

$ pnpm build:backend && pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto

$ find packages/backend/src packages/engine/src -name '*.ts' ! -name '*.spec.ts' -type f | wc -l
      23
real-tree suite: 29 passed, 0 failures — ZERO violations
```

The gate file alone: **407 tests before → 410 after** (3 new cases: exclusion non-vacuity, exclusion-three narrowing, the rule).

**The four measured-exempt real call sites, still asserted quiet by name** at `:7905-7913`: `compat.ts`'s `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]`.

**Plan/verification/review/UAT files untouched:**

```
$ git diff --exit-code -- 01-01..01-32-PLAN.md 01-VERIFICATION.md 01-REVIEW.md 01-UAT.md
CLEAN — git diff --exit-code exit 0
```

---

## 11. ASSUMPTION-DELTA DISPOSITION

`gsd-tools assumption-delta scan 01 --json` returns `detected: true` with a single `pluralization` signal on the term `another`:

```json
{ "detected": true,
  "signals": [ { "kind": "pluralization", "term": "another",
    "snippet": "… own code and CI-checked — rather than correcting another instance of it, plus 4 further gap-closure plans …" } ] }
```

That is ROADMAP narrative prose about gap-closure rounds, not a pluralization decision in this phase's scope. **Round 6 examined the identical line and dismissed it on the same grounds, recorded in `01-29`'s objective. Dismissed again by citation, not re-litigated.**

---

## Task Commits

1. **Task 1 (tracer): measure, build the guard, delete CR-14 and WR-38, watch both mutations red** — `516ce1d` (feat)
2. **Task 2: triage the code and below-registry regions** — `bb2ac11` (refactor)
3. **Task 3: ledger correction, both pointer surfaces, full gate set** — `b97c850` (docs)

## Files Created/Modified

- `packages/backend/src/outbound-prohibition.spec.ts` — three paragraphs deleted and replaced by pointers; two sentences rewritten; 12 more rewritten out in triage; `HEADER_QUANTIFIER_EXEMPTIONS` (29 entries), the whole-file wrap-tolerant guard, its three anchored exclusions, its narrowing pin and its helpers added
- `.planning/REQUIREMENTS.md` — dated wave-33 CORE-11 correction, appended above the BEGIN sentinel; span byte-identical; checkbox untouched
- `.planning/STATE.md` — tenth P9-D3 pointer amendment, restating no bound
- `.planning/WINDOWS.md` — entry 37 superseded, entry 38 appended, both through the tool

## Decisions Made

- **NARROW over KEEP for exclusion three**, via an equality pin rather than textual stripping — stripping would have had to reconstruct runtime clause strings from escaped source, and a fragile exclusion is a silently-vacuous one.
- **Exemption keys are MASKED.** Discovered while implementing: an unmasked key carries its phrasing verbatim, the whole-file scan finds it inside the map, and the map generates obligations for its own text. Asserted, not just avoided.
- **`REWRITE` means naming the branches, never swapping in a synonym.** A synonym turns the guard green while keeping the bound — recorded in the guard's docblock as the way to game it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `Object.hasOwn` exceeds the repo's configured Node floor**
- **Found during:** Task 1 (running `pnpm lint` after inserting the guard)
- **Issue:** `eslint` failed with `n/no-unsupported-features/es-builtins` and `es-syntax` — `Object.hasOwn` is not supported until Node 16.9.0 and the configured range is `>=16.0.0`.
- **Fix:** Replaced the membership test with a `Set` built from the map's keys (`declaredSet.has(f.key)`), which is also safer for arbitrary string keys than `in` would have been.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** `pnpm lint` exit 0; guard case still green and still goes red under mutations 1, 2 and 4.
- **Committed in:** `516ce1d`

**2. [Rule 3 - Blocking] Prettier reflow after insertion**
- **Found during:** Task 1 and Task 2
- **Issue:** 84 `prettier/prettier` errors from the inserted block; reflow changes line content, which changes the anchor-derived exemption keys.
- **Fix:** `pnpm exec eslint <file> --fix`, then re-ran the suite to confirm the keys still resolved. They did — the keys are anchored to normalized line text, and prettier does not reflow comments.
- **Verification:** `pnpm lint` exit 0, 410 tests green after formatting.
- **Committed in:** `516ce1d`, `bb2ac11`

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking).
**Impact on plan:** Neither changed the design. No scope creep; no rule, resolver or registry row touched.

## Issues Encountered

**The plan's STATE.md prediction was three amendments stale** (said six existed, nine did). Handled by measuring rather than trusting: the new amendment is the tenth and its own text says "as the fourth through ninth amendments each did", so the internal cross-reference is correct rather than inherited. Recorded as discrepancy #3 in §1.

**The plan's line counts for two regions were slightly off** (3,615 vs 3,520; 3,464 vs 3,465) while every occurrence count reproduced exactly. Recorded rather than absorbed; neither changed a design decision.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for wave 34.** What it inherits, stated precisely:

- **CR-15 and CR-16 are OPEN and are wave 34's.** They are CODE blindnesses on two clauses CORE-11's own first sentence enumerates. This wave did not touch them and did not widen the gate's reach by one shape.
- **CORE-11's box is exactly as wave 32 left it** — `[ ]`, byte-unchanged — and **wave 35 owns it.**
- **Criterion 3 (THE SOLE BOUND) is delivered.** The gate file's hand-written prose states no bound outside the generated span; a guard keeps it that way; and exclusion three is narrowed so wave 35's check (c) is satisfiable and machine-enforced. **This wave hands wave 35 no known criterion-3 blocker.**
- **One limit wave 35 must inherit from this wave's docblock rather than re-derive:** the guard is a PHRASE LIST over BYTES under one named whitespace convention. A universal spelled in undeclared words passes it. Criterion 3's verdict must carry that reach.
- **Still unguarded, and named rather than left implicit:** the pointer-not-a-bound rule for `.planning/STATE.md` and `.planning/WINDOWS.md` has NO mechanical check. The byte comparison reaches the gate header and `REQUIREMENTS.md` and no further.

**Nothing leaks.** The must-NOT holds: zero outbound-shaped tokens in any shipped non-spec source across both roots, the shipped bundle's entire import set is one specifier (`crypto`), and the real tree runs 23 files / 0 violations. CR-14 and WR-38 were STALE TEXT in a test-only gate — a falsified disclosure and a contradicted status line — not unenforced behaviour.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-25*

## Self-Check: PASSED

All 4 modified files present on disk. All 4 commits (`516ce1d`, `bb2ac11`, `b97c850`, `306094d`) found in `git log`. `HEADER_QUANTIFIER_EXEMPTIONS` present in the gate file (7 references). Final suite: 31 files / 1348 tests, exit 0.
