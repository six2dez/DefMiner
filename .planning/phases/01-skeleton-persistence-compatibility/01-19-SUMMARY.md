---
phase: 01-skeleton-persistence-compatibility
plan: 19
subsystem: testing
tags: [core-11, outbound-prohibition, typescript-ast, static-gate, gap-closure, wr-23, wr-26, in-20]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "the CORE-11 outbound gate as left by plan 01-18 — assembledNames, the conditional key resolver, the comma arm in unwrap, the mechanism-to-shape table, and WINDOWS.md entry 22 scoped to the wave-18 residual"
provides:
  - "globalAliases: dynamic code and the outbound constructors survive no binding — eval, Function, XMLHttpRequest, WebSocket and EventSource each resolve one hop in all four spellings fetchAliases resolves"
  - "globalNameOf: ONE definition of 'this callee is an outbound global', consulted by both the call rule and the `new` rule, so a spelling added later lands in both"
  - "shadowedGlobals: the one provable narrowing of a fail-closed NAME test — a top-level function/class declaration shadows the global for the module; a nested one does not and still reports"
  - "globalThisAliases: the receiver its own alias sets sit on resolves the hop they already resolve, closing fetch, the unreadable computed member, dynamic code, the constructors and the beacon receiver together"
  - "isProvablyNumeric's docblock made true of isProvablyNumeric — PROVES for literals and arithmetic, ASSUMES BY NAME and fails OPEN for a member or method call, with the measurement that picked that resolution kept inline"
  - "residual (a) split in two: keys stop at one hop, ALIAS CHAINS resolve to arbitrary depth in document order — a disclosure that had understated the walk since the first alias set was written"
  - "CORE-11 marked [x] against an eight-row discharge table, with 'in any spelling' explicitly bound rather than left standing as an absolute"
  - "one residual, derived from the code, written word for word into the gate header, REQUIREMENTS.md, STATE.md and WINDOWS.md"
affects: [01-20, 01-21, 01-22, phase-02, phase-03, phase-05]

actuals:
  tokens: 21000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A fixture that is green for a SECOND reason is titled as such — a row that does not go red under the mutation it sits beside says so in its own title and is named as NOT evidence"
    - "A residual is amended in BOTH directions: a disclosure narrower than the code is the same defect as one wider than it, and both get recorded"
    - "A named absolute in a requirement ('in any spelling') is bound in the SAME SENTENCE as the phrase, never adjacently"
    - "When two resolutions are honest, the real tree picks — apply each, run it, keep the measurement in the docblock so the next reader does not re-derive it"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/WINDOWS.md

key-decisions:
  - "WR-26 resolved by correcting the DOCBLOCK, not the branch — picked by measurement: the review's own proposed narrowing changed nothing at all when run, and removing the branch entirely changed exactly two shapes, both ordinary `+` index compositions of the class that got WR-19 narrowed"
  - "WR-26's motivating shape `sdk[o.length].send(req)` is silent under EVERY variant, including the branch removed entirely, because a bare member is not an ASSEMBLED key either — residual (b) silences it and the numeric exemption never does. No narrowing at that branch can close its own example."
  - "The bare-identifier DYNAMIC_CODE test is narrowed by exactly one PROVABLE fact (a top-level function/class declaration shadows the module) rather than by a scope heuristic — a nested declaration still reports, which is the fail-closed direction"
  - "Residual (a) split: KEYS stop at one hop (constStrings/assembledNames read the initializer's shape); ALIASES chain to arbitrary depth (every alias set consults the LIVE set). What bounds an alias chain is DOCUMENT ORDER, not a hop count."
  - "Two fixture rows are titled as measured NON-evidence — the GLOBAL-MEMBER spellings are caught by the pre-existing member-reference rule and do not go red under the alias mutation"

patterns-established:
  - "Measured non-evidence in the title: a fixture row that survives the mutation it accompanies declares that in its own name, so it can never later be cited as proof of the branch beside it"
  - "Both-directions residual amendment: a gate reaching FURTHER than its disclosure is recorded with the same weight as one reaching less far"

requirements-completed: [CORE-11]

coverage:
  - id: D1
    description: "Dynamic code construction survives no binding: `const e = eval; e(s)`, the destructure spelling, the assignment spelling and `const F = Function; new F(\"a\", s)` all report `outbound-dynamic-code` where all four previously reported `[]`"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through globalAliases plus globalNameOf, in the CALL rule: dynamic code survives no binding (4 it.each rows)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through globalAliases plus globalNameOf, in the `new` rule: `const F = Function; new F(...)` is a construction of Function"
        status: pass
    human_judgment: false
  - id: D2
    description: "The constructor half of the same gap is closed in the same commit through the same lookup: `const W = WebSocket; new W(url)` and the destructure spelling report `outbound-global-ctor`"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through globalAliases plus globalNameOf, in the `new` rule: an outbound CONSTRUCTOR survives no binding (3 it.each rows)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every widening has a must-stay-quiet twin in the same commit: an alias taken off an ordinary object grows nothing; a top-level `function Function` provably shadows the global; a nested one does not and still reports"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through the RECEIVER anchoring: an alias taken off an ORDINARY object grows nothing and stays quiet"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through shadowedGlobals: a TOP-LEVEL `function Function(...)` provably is not the global, so the bare call stays quiet"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through shadowedGlobals' TOP-LEVEL bound: a NESTED declaration proves nothing about module scope and still REPORTS"
        status: pass
    human_judgment: false
  - id: D4
    description: "IN-20 closed across all five global surfaces: `const g = globalThis` resolves for fetch, the unreadable computed member, dynamic code, the outbound constructors and the beacon receiver — with an ordinary local `g` asserted quiet"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through globalThisAliases: `const g = globalThis` is a global receiver (6 it.each rows)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through globalThisAliases' one-hop bound: an ordinary local is NOT a global receiver and its members stay quiet"
        status: pass
    human_judgment: false
  - id: D5
    description: "`isProvablyNumeric`'s docblock agrees with `isProvablyNumeric`'s behaviour: it PROVES for literals and arithmetic and ASSUMES BY NAME, failing OPEN, for a member or method call — with the disclosed cost pinned by a fixture and the load-bearing case pinned by a second"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#RESOLUTION 2 — THE DOCBLOCK CHANGED, NOT THE BRANCH: a member-named key is still `[]`, and this pins the DISCLOSED COST of a NAME heuristic"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#RESOLUTION 2's COST, MEASURED: the property-access branch is load-bearing ONLY in `+` composition"
        status: pass
    human_judgment: false
  - id: D6
    description: "Residual (a) corrected in both directions — alias chains resolve to arbitrary depth in document order (measured), keys still stop at one hop, and a chain read before its root is silent"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through globalThisAliases' TRANSITIVITY: an alias CHAIN resolves to ANY depth in document order"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through NOTHING: DOCUMENT ORDER, not a hop count, is what actually bounds an alias chain"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through NOTHING: a receiver KEY still stops at exactly ONE hop"
        status: pass
    human_judgment: false
  - id: D7
    description: "No widening fires on real shipped source: 23 files over both SOURCE_ROOTS, zero violations, re-measured after each task, with observations.ts, compat.ts and migrations.ts confirmed quiet by name"
    requirement: "CORE-11"
    verification:
      - kind: integration
        ref: "packages/backend/src/outbound-prohibition.spec.ts#%s reaches no outbound surface (it.each over shippedFiles(), 23 files)"
        status: pass
    human_judgment: false
  - id: D8
    description: "Every new branch has been observed RED by reverting it SEPARATELY — the call-rule alias lookup, the `new`-rule alias lookup, the globalThis one-hop resolution, and the WR-26 property-access branch — each restored and re-run green"
    verification:
      - kind: manual_procedural
        ref: "four executed mutation runs, RED test titles and assertion messages pasted below in section 4; each restored and re-run green"
        status: pass
    human_judgment: false
  - id: D9
    description: "CORE-11's enumeration discharged item by item as a table of executed results, and the checkbox flipped only after every row was discharged"
    requirement: "CORE-11"
    verification:
      - kind: other
        ref: "grep -c '^- \\[x\\] \\*\\*CORE-11\\*\\*' .planning/REQUIREMENTS.md == 1, against the eight-row discharge table in section 5"
        status: pass
    human_judgment: false
  - id: D10
    description: "One residual, derived from the code, stated in the gate header, REQUIREMENTS.md, STATE.md and WINDOWS.md — and it BINDS the phrase 'in any spelling' rather than sitting beside it"
    verification:
      - kind: manual_procedural
        ref: "all four statements pasted consecutively below under `## 7. THE FOUR DISCLOSURES, SIDE BY SIDE`"
        status: unknown
    human_judgment: true
    rationale: "Agreement between four prose statements, and whether the phrase is genuinely BOUND rather than merely accompanied, is a reading judgment no test can make. The evidence is assembled for one-glance comparison; a human must confirm."

duration: 18 min
completed: 2026-08-24
status: complete
---

# Phase 01 Plan 19: CORE-11 Closed Against an Executed Gate — Summary

**`globalAliases` and one shared `globalNameOf` lookup make dynamic code and the outbound constructors survive no binding, `globalThisAliases` gives the receiver the hop its own alias sets already resolved, `isProvablyNumeric`'s docblock is made true of `isProvablyNumeric` by measurement rather than preference, and CORE-11 flips to `[x]` against an eight-row discharge table with the phrase "in any spelling" bound in the same sentence that names it.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-08-24T10:33:00Z
- **Completed:** 2026-08-24T10:51:20Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- The surface that reaches every other surface through a string no AST gate can read into now survives no binding — on the call path and the constructor path, in all four spellings its neighbouring alias sets already resolved.
- The constructor half of the identical gap, two lines away, closed in the same commit through the same lookup, so a spelling added later lands in both rules by construction.
- `isProvablyNumeric`'s docblock stopped claiming a proof it does not make — and the resolution was picked by running both alternatives, not by argument. The measurement is kept inline because it is the evidence.
- IN-20 closed across all five global surfaces at once, with an ordinary local `g` asserted quiet.
- **A finding nobody was looking for:** every alias set chains to arbitrary depth, and no residual list had ever said so. Residual (a) is corrected in the direction of the gate reaching FURTHER than its disclosure — the same defect this phase has fixed four times, running the other way.
- CORE-11 marked complete against a table of executed results, one row per surface its own sentence names, with the fixture and the plan that watched it fail cited per row.

## Task Commits

1. **Task 1 (tracer): dynamic code and outbound constructors survive no binding (WR-23)** — `9cf9162` (fix)
2. **Task 2: the globalThis hop (IN-20), a docblock true of its function (WR-26), residual (a) split** — `2709f18` (fix)
3. **Task 3: CORE-11 complete against a discharge table, one residual in four places** — `52c5b58` (docs)

---

## 1. EVERY SHAPE WR-23, WR-26 AND IN-20 NAME — BEFORE AND AFTER, EXECUTED

Both tables are `auditSource("probe.ts", src).map(v => v.rule)` run through a transient probe spec, BEFORE any change and AFTER all three tasks. Positive controls were run first in both, which is what makes the empty lists real rather than a fixture artefact.

### BEFORE (reproduces 01-REVIEW.md pass 4 exactly)

```
POSITIVE CONTROL eval(s)                         => ["outbound-dynamic-code"]
WR-23 const e = eval; e(s)                       => []
WR-23 const { eval: ev } = globalThis            => []
WR-23 const e = globalThis.eval; e(s)            => ["outbound-dynamic-code"]
WR-23 let e; e = eval; e(s)                      => []
POSITIVE CONTROL new Function(a,s)               => ["outbound-dynamic-code"]
WR-23 const F = Function; new F(a,s)             => []
WR-23 const F = Function; F(a,s) call            => []
WR-23ctor const W = WebSocket; new W(url)        => []
POSITIVE CONTROL new WebSocket(url)              => ["outbound-global-ctor"]
WR-26 sdk[o.length].send(req)                    => []
WR-26 sdk[o.max].send(req) o={max:'requests'}    => []
IN-20 const g = globalThis; g.fetch(u)           => []
IN-20 const g = globalThis; g['fet'+'ch'](u)     => []
IN-20 const g = globalThis; new g.WebSocket(u)   => []
QUIET obj with eval method                       => []
QUIET local fn named Function                    => ["outbound-dynamic-code"]
QUIET local g not global                         => []
QUIET cache.fetch(url)                           => []
EXEMPT MIGRATIONS[MIGRATIONS.length - 1]         => []
EXEMPT segments[i] via indexOf                   => []
01-18 assembled key const k                      => ["outbound-unanalysable"]
01-18 conditional key                            => ["outbound-send"]
01-18 comma sequence                             => ["outbound-send"]
RESIDUAL two hops (KEY)                          => []
```

### AFTER (all three tasks landed)

```
POSITIVE CONTROL eval(s)                         => ["outbound-dynamic-code"]
WR-23 const e = eval; e(s)                       => ["outbound-dynamic-code"]
WR-23 const { eval: ev } = globalThis            => ["outbound-dynamic-code"]
WR-23 const e = globalThis.eval; e(s)            => ["outbound-dynamic-code","outbound-dynamic-code"]
WR-23 let e; e = eval; e(s)                      => ["outbound-dynamic-code"]
POSITIVE CONTROL new Function(a,s)               => ["outbound-dynamic-code"]
WR-23 const F = Function; new F(a,s)             => ["outbound-dynamic-code"]
WR-23 const F = Function; F(a,s) call            => ["outbound-dynamic-code"]
WR-23ctor const W = WebSocket; new W(url)        => ["outbound-global-ctor"]
POSITIVE CONTROL new WebSocket(url)              => ["outbound-global-ctor"]
WR-26 sdk[o.length].send(req)                    => []      <- see section 3
WR-26 sdk[o.max].send(req) o={max:'requests'}    => []      <- see section 3
IN-20 const g = globalThis; g.fetch(u)           => ["outbound-fetch"]
IN-20 const g = globalThis; g['fet'+'ch'](u)     => ["outbound-unanalysable"]
IN-20 const g = globalThis; g.eval(s)            => ["outbound-dynamic-code"]
IN-20 const g = globalThis; new g.WebSocket(u)   => ["outbound-global-ctor"]
IN-20 const g = globalThis; g.navigator.sendBeacon(u) => ["outbound-beacon"]
QUIET obj with eval method                       => []
QUIET local fn named Function                    => []      <- NARROWED, see below
QUIET local g not global                         => []
QUIET cache.fetch(url)                           => []
EXEMPT MIGRATIONS[MIGRATIONS.length - 1]         => []
EXEMPT segments[i] via indexOf                   => []
01-18 assembled key const k                      => ["outbound-unanalysable"]
01-18 conditional key                            => ["outbound-send"]
01-18 comma sequence                             => ["outbound-send"]
RESIDUAL two hops (KEY)                          => []
```

**Seven shapes moved `[] → reported`.** Every positive control is unchanged. Every 01-18 fixture is unchanged. Every measured exempt shape is unchanged. The two-hop KEY residual is unchanged.

**Two rows deserve reading rather than skimming.** `const e = globalThis.eval; e(s)` now reports TWICE — once as a bare member reference on a global receiver (the pre-existing rule) and once as an aliased call (the new one). That is two true facts about the same line, not a false positive, and it is why the two GLOBAL-MEMBER fixture rows are titled as measured non-evidence in section 4. And `QUIET local fn named Function` moved the OTHER way, `["outbound-dynamic-code"] → []`: it reported before this plan, and the plan's own criterion required it quiet. That narrowing is discussed as deviation 1.

## 2. THE REAL-TREE MEASUREMENT — A ZERO, RUN AFTER EACH TASK

```
=== after task 1 (globalAliases, globalNameOf, shadowedGlobals) ===
REAL TREE: roots=packages/backend/src,packages/engine/src
REAL TREE: files scanned = 23
REAL TREE: violations = 0
REAL TREE: packages/backend/src/store/observations.ts => 0 violations
REAL TREE: packages/backend/src/compat.ts            => 0 violations
REAL TREE: packages/backend/src/store/migrations.ts  => 0 violations

=== after task 2 (globalThisAliases + the WR-26 docblock) ===
REAL TREE: files scanned = 23
REAL TREE: violations = 0
REAL TREE: packages/backend/src/store/observations.ts => 0 violations
REAL TREE: packages/backend/src/compat.ts            => 0 violations
REAL TREE: packages/backend/src/store/migrations.ts  => 0 violations
```

No site fired, so no narrowing was required and every exemption stands as measured. `observations.ts` and `compat.ts` are confirmed quiet explicitly because both changes touch what the walk exempts.

## 3. THE WR-26 DECISION, IN ONE PARAGRAPH, WITH THE MEASUREMENT THAT MADE IT

**Chosen: resolution 2 — the DOCBLOCK changed, not the branch.** The plan refused to pick and required the real tree to pick instead, so both alternatives were applied and run. WR-26's own suggested narrowing (`&& ts.isIdentifier(unwrap(inner.expression))`) was applied and changed **nothing at all** — not its own motivating shape, not the exempt shapes, not the real tree, because `o` in `sdk[o.length]` is already an identifier. Removing the property-access branch **entirely** was then applied, and the executed difference was exactly two shapes:

```
SHAPE                          as shipped              branch removed
sdk[o.length].send(req)        []                      []                       <- the MOTIVATING shape
sdk[o.max].send(req)           []                      []
sdk[o.length + 1].send(req)    []                      ["outbound-unanalysable"]
sdk[buf.length + i].send(req)  []                      ["outbound-unanalysable"]
x[a.length + 1] (non-receiver) []                      []
real tree, 23 files            0 violations            0 violations
```

Two things follow and both are why the docblock is what changed. **First, the motivating shape is silent under every variant, including the branch removed entirely** — because a bare member is not an ASSEMBLED key either, so it is residual (b) that silences it and the numeric exemption never does. No narrowing available at that branch can close WR-26's own example. **Second, the only place the branch is load-bearing is `+` composition**, which is precisely the ordinary-indexing false-positive class that got the broad WR-19 rule narrowed by measurement, and `store/observations.ts`'s `segments[i + 1]` is a live instance of it. Narrowing would have bought nothing and cost the gate exactly the kind of false positive that gets a gate deleted rather than fixed.

**The amended docblock, whole:**

> Can the walk PROVE this key is a number?
>
> A number cannot spell a property name this gate cares about, so a provably numeric key hides nothing. It PROVES rather than assumes and it fails SAFE: anything it cannot prove numeric is treated as possibly a name. `numeric` holds names seen bound to a provably numeric value; `poisoned` holds names seen bound to anything else ANYWHERE in the file, so `let k = 0; k = "requests"; sdk[k].send(req)` is not exempted by the `0`.
>
> `+` is numeric ONLY when BOTH operands are — `i + 1` is an index and `"req" + "uests"` is an assembled name, and the difference is the whole point.
>
> CORRECTED 2026-08-24 (WR-26). THE PARAGRAPH ABOVE OVERCLAIMS, AND THE FUNCTION DOES NOT DO WHAT ITS OWN SECOND SENTENCE SAYS. Three of the branches below — the numeric literal, the arithmetic operators, the sign prefix — do prove. TWO DO NOT. The PROPERTY-ACCESS branch and the METHOD-CALL branch decide by MEMBER NAME alone, regardless of what the member is a member OF, and they fail OPEN: `{ max: "requests" }.max` is a string and this function calls it a number. `NUMERIC_MEMBERS` already conceded the mechanism ("Enumerated rather than inferred, because the alternative is a type checker") without conceding the direction. The direction is conceded here.
>
> SO READ THIS FUNCTION AS: PROVES for literals and arithmetic; ASSUMES BY NAME, AND FAILS OPEN, for a member or a method call — exactly the way `ERROR_BINDING_NAMES` states itself one directory away, as a coverage bound rather than as a proof.
>
> THE RESOLUTION WAS PICKED BY MEASUREMENT, NOT BY PREFERENCE, AND THE MEASUREMENT IS KEPT HERE BECAUSE IT IS THE EVIDENCE. \[the table above\]
>
> TWO THINGS FOLLOW, AND BOTH ARE WHY THE DOCBLOCK IS WHAT CHANGED. First, the motivating shape `sdk[o.length].send(req)` is silent under EVERY variant, including the branch removed entirely — because a bare member is not an ASSEMBLED key either, so it is residual (b) that silences it and never this exemption. No narrowing available here can close WR-26's own example. Second, the only place the branch is load-bearing is `+` COMPOSITION — `sdk[o.length + 1]`, `sdk[buf.length + i]` — which is precisely the ordinary-indexing false-positive class that got the broad WR-19 rule narrowed by measurement, and `store/observations.ts`'s `segments[i + 1]` is a live instance of it. Narrowing would have bought nothing and cost the gate exactly the kind of false positive that gets a gate deleted rather than fixed.
>
> THE BOUND THAT REMAINS, BY NAME: a member or method call named in `NUMERIC_MEMBERS` is ASSUMED numeric whatever its receiver, so an object that happens to spell a receiver name under one of those keys is not seen. Nothing in either scanned root indexes an outbound receiver by a member-named key — measured, 23 files, zero violations — so the exposure today is nil and the exposure the day the exemption is relied on is silent. Both shapes are pinned by fixtures below, titled to say which resolution they encode.

Both branches also carry an inline `// ASSUMES BY NAME AND FAILS OPEN (WR-26)` marker, so a reader who never scrolls to the docblock still meets the concession at the line that makes it.

## 4. FOUR MUTATION PROOFS — SEPARATE, EXECUTED, RESTORED

Each branch reverted **on its own**. A combined revert cannot show that each branch is load-bearing separately.

### Mutation 1 — `dynamicCodeOf` lookup removed from the CALL rule

```
MUTATION 1 APPLIED: dynamicCodeOf lookup removed from the CALL rule
 × through globalAliases plus globalNameOf, in the CALL rule: dynamic code survives no binding — the DECLARATION spelling — `const e = eval; e(s)`
 × through globalAliases plus globalNameOf, in the CALL rule: dynamic code survives no binding — the DESTRUCTURE spelling — `const { eval: ev } = globalThis`
 × through globalAliases plus globalNameOf, in the CALL rule: dynamic code survives no binding — the ASSIGNMENT spelling — `let e; e = eval;`
 × through globalNameOf: a spelling the walk resolves is NAMED as an alias in the violation detail
 × through shadowedGlobals' TOP-LEVEL bound: a NESTED declaration proves nothing about module scope and still REPORTS
 × outbound-dynamic-code fires on the bare eval call
 × outbound-dynamic-code fires on a bare Function call
AssertionError: expected [] to include 'outbound-dynamic-code'
      Tests  7 failed | 150 passed (157)
```

Restored, re-run green: `Tests 157 passed (157)`. **The `new`-rule cases stayed green**, which is what proves the two branches independent. The two pre-existing inline cases went red too, which is the correct signal that the new lookup is the SINGLE path rather than a parallel one.

### Mutation 2 — `outboundCtorOf` and `dynamicCodeOf` lookups removed from the `new` rule

```
MUTATION 2 APPLIED: outboundCtorOf + dynamicCodeOf lookups removed from the `new` rule
 × through globalAliases plus globalNameOf, in the `new` rule: `const F = Function; new F(...)` is a construction of Function
 × through globalAliases plus globalNameOf, in the `new` rule: an outbound CONSTRUCTOR survives no binding — the DECLARATION spelling — `const W = WebSocket; new W(url)`
 × through globalAliases plus globalNameOf, in the `new` rule: an outbound CONSTRUCTOR survives no binding — the DESTRUCTURE spelling — `const { EventSource: E } = globalThis`
 × outbound-global-ctor fires on new XMLHttpRequest / new WebSocket / new EventSource
 × outbound-dynamic-code fires on new Function
 × previously MISSED — new XMLHttpRequest() ... .send() now reports
 × previously MISSED — new WebSocket("wss://...") now reports
AssertionError: expected [] to include 'outbound-global-ctor'
AssertionError: expected [] to include 'outbound-dynamic-code'
      Tests  9 failed | 148 passed (157)
```

Restored, re-run green: `Tests 157 passed (157)`. **The call-rule cases stayed green.**

**What these two mutations also revealed, and what was done about it.** In BOTH runs, the two `GLOBAL-MEMBER` rows (`const F = globalThis.Function` and `const X = globalThis.XMLHttpRequest`) stayed GREEN — the pre-existing member-reference rule catches them whether or not the alias lookup exists. They were green for a second reason, which is exactly the `:1740-1744` defect plan 01-18 was convened to remove, being written fresh. **Both rows were retitled** to say so in their own names before the commit landed:

```
through globalAliases plus globalNameOf, in the CALL rule: dynamic code survives
no binding — the GLOBAL-MEMBER declaration spelling — `const F = globalThis.Function`
— WHICH THE PRE-EXISTING MEMBER-REFERENCE RULE ALSO CATCHES, MEASURED, so this row
does NOT go red when the alias lookup is reverted and is NOT evidence for it
```

### Mutation 3 — `globalThisAliases` consultation removed from `isGlobalReceiverIn` (IN-20)

```
MUTATION 3 APPLIED: globalThisAliases consultation removed from isGlobalReceiverIn (IN-20)
 × through globalThisAliases: `const g = globalThis` is a global receiver — the global fetch — outbound-fetch
 × through globalThisAliases: `const g = globalThis` is a global receiver — a COMPUTED member whose name will not reduce — outbound-unanalysable
 × through globalThisAliases: `const g = globalThis` is a global receiver — dynamic code on the aliased receiver — outbound-dynamic-code
 × through globalThisAliases: `const g = globalThis` is a global receiver — an outbound constructor on the aliased receiver — outbound-global-ctor
 × through globalThisAliases: `const g = globalThis` is a global receiver — the beacon receiver reached through the aliased receiver — outbound-beacon
 × through globalThisAliases: `const g = globalThis` is a global receiver — the ASSIGNMENT spelling — `let g; g = globalThis;`
 × through globalThisAliases' TRANSITIVITY: an alias CHAIN resolves to ANY depth in document order
AssertionError: expected [] to include 'outbound-fetch'
AssertionError: expected [] to include 'outbound-unanalysable'
AssertionError: expected [] to include 'outbound-dynamic-code'
AssertionError: expected [] to include 'outbound-global-ctor'
AssertionError: expected [] to include 'outbound-beacon'
      Tests  7 failed | 163 passed (170)
```

Restored, re-run green: `Tests 170 passed (170)`.

### Mutation 4 — the WR-26 change (`isProvablyNumeric`'s property-access branch)

```
MUTATION 4 APPLIED: isProvablyNumeric's property-access branch removed
 × RESOLUTION 2's COST, MEASURED: the property-access branch is load-bearing ONLY in `+`
   composition, which is the ordinary-INDEX class it exists to protect
AssertionError: expected [ 'outbound-unanalysable' ] to deeply equal []
      Tests  1 failed | 169 passed (170)
```

Restored, re-run green: `Tests 170 passed (170)`. **Exactly one fixture went red, and it is the one that pins the disclosed cost — the MOTIVATING-shape fixture stayed green, which is the mutation confirming the docblock's own table** rather than merely agreeing with it.

## 5. CORE-11's ENUMERATION, DISCHARGED ITEM BY ITEM

One row per surface CORE-11's first sentence names. **Executed** column is `auditSource("probe.ts", src).map(v => v.rule)` run in this plan. **Observed failing in** cites the plan whose summary records the mutation run that watched the fixture go red.

| # | Surface CORE-11 names | Rule that fires | Executed | Fixture that asserts it | Observed failing in |
|---|---|---|---|---|---|
| 1 | `caido:http` fetch — static, dynamic, `export … from`, assembled specifier | `outbound-import`, `outbound-unanalysable` | `["outbound-import"]` / `["outbound-unanalysable"]` | `outbound-import fires on all four specifier forms`; `outbound-unanalysable fires on an ASSEMBLED specifier` | **01-12** (mutation B: a static `caido:http` import planted in `hooks/passive.ts` produced `outbound-import`) |
| 2 | `sdk.requests.send` **in any spelling** — direct, receiver alias, destructured method, computed member, assembled receiver key, conditional key, comma sequence, `.call`/`.apply`/`Reflect.apply` | `outbound-send`, `outbound-unanalysable` | `["outbound-send"]` (direct, alias, destructure, conditional, Reflect.apply) / `["outbound-unanalysable"]` (computed member, assembled key) | `outbound-send fires through a RECEIVER ALIAS`; `through assembledNames: an assembled KEY survives no const`; `through the CONDITIONAL resolver`; `through the COMMA SEQUENCE rule plus constStrings` | **01-12** (mutation A: a send planted in `hooks/passive.ts` produced `outbound-send`); **01-18** (mutations 1–3: `assembledNames`, the conditional resolver and the comma arm each reverted separately and observed RED) |
| 3 | any method of an identified `requests`/`net` receiver outside the read-only allowlist | `outbound-send`, `outbound-net` | `["outbound-send"]` (`sendRaw`), `["outbound-net"]` (`net.connect`), `[]` for `get`/`query`/`inScope`/`matches` | `outbound-send fires on sendRaw`; `outbound-net fires on sdk.net.connect and on any other method of that receiver`; the four allowlist must-stay-quiet fixtures | **01-12** |
| 4 | global `fetch` by any receiver or alias | `outbound-fetch` | `["outbound-fetch"]` for bare, `globalThis.`, `window.`, one-hop alias, **and aliased receiver** | `outbound-fetch fires on const f = fetch` (nine spellings); **`through globalThisAliases: … the global fetch`** | **01-12** (the `globalThis.fetch` blindness); **01-19 mutation 3** (the aliased receiver) |
| 5 | `XMLHttpRequest`, `WebSocket`, `EventSource` | `outbound-global-ctor` | `["outbound-global-ctor"]` for all three bare **and through a one-hop alias** | `outbound-global-ctor fires on new WebSocket`; **`through globalAliases plus globalNameOf, in the new rule: an outbound CONSTRUCTOR survives no binding`** | **01-19 mutation 2** |
| 6 | `navigator.sendBeacon` | `outbound-beacon` | `["outbound-beacon"]` bare, through a `navigator` alias, **and through an aliased global receiver** | `outbound-beacon fires on a one-hop alias of navigator`; **`through globalThisAliases: … the beacon receiver`** | **01-16** (the beacon rule's own per-widening mutation); **01-19 mutation 3** |
| 7 | dynamic code construction (`eval`, `new Function`) | `outbound-dynamic-code` | `["outbound-dynamic-code"]` bare, **one-hop alias, destructure, assignment, constructor, and through an aliased receiver** | **`through globalAliases plus globalNameOf, in the CALL rule` (4 rows)**; **`… in the new rule`**; **`through globalThisAliases: … dynamic code`** | **01-16** (the bare rule); **01-19 mutations 1, 2 and 3** (every alias spelling) |
| 8 | no speculative retrieval of any kind — the "cannot read ≠ clean" third state | `outbound-unanalysable` | `["outbound-unanalysable"]` for an unreadable receiver, an unreadable global member, an unreadable specifier | `outbound-unanalysable fires on a computed member of an identified receiver`; `through unreadableAliases`; `through isAssembledKey` | **01-16** (computed receivers); **01-18** (the bound-assembly spellings) |

**Every row is discharged.** No row is blocked, so the checkbox flips — and it flips *after* this table, not before it.

```
$ grep -c '^- \[x\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
1
```

## 6. THE ONE THING THAT OPENED WIDER THAN ANY DISCLOSURE HAD SAID

This was not in the plan and was not being looked for. While writing what was expected to be a routine MEASURED SILENCE fixture — "two hops of receiver is still residual (a)" — the assertion **failed**:

```
AssertionError: expected [ 'outbound-fetch' ] to deeply equal []
```

Probed properly, across every alias set in the file:

```
globalThis 2 hops (doc order)            => ["outbound-fetch"]
globalThis 3 hops (doc order)            => ["outbound-fetch"]
globalThis 2 hops REVERSE order          => []
fetch 2 hops (doc order)                 => ["outbound-fetch"]
fetch 3 hops (doc order)                 => ["outbound-fetch"]
navigator 2 hops (doc order)             => ["outbound-beacon"]
eval alias 2 hops (doc order)            => ["outbound-dynamic-code"]
receiverAlias 2 hops sdk                 => ["outbound-send"]
constStrings 2 hops (residual a)         => []
assembledNames 2 hops (residual a)       => []
```

Every alias set is grown by consulting the **live** set, so each new binding can resolve from the previous one and the chain resolves to **arbitrary depth**. That has been true of `fetchAliases` and `navigatorAliases` since the day they were written, and **no residual list had ever said so** — every one of them, back to the first, bounded the walk at "more than ONE HOP of indirection". That statement is exactly right for a receiver KEY (`constStrings` and `assembledNames` read the initializer's shape, never the live set, so they do not chain) and it **understated** the walk for aliases. What actually bounds an alias chain is **document order**, not a hop count: a chain read before its root is bound is silent, because there is no symbol table and no second pass.

This is the phase's signature defect — a disclosure and an execution disagreeing — running for once in the direction of the gate reaching FURTHER than its own prose. It is recorded with the same weight as the four running the other way, because a residual list is trusted for its completeness in **both** directions. Residual (a) is now split in two, and all four shapes (alias chain depth, the document-order silence, the one-hop key bound in both key spellings) are asserted.

## 7. THE FOUR DISCLOSURES, SIDE BY SIDE

One bound, derived from the amended code, then copied. Compare them in one glance.

### (i) Gate header — `THE FINAL RESIDUAL, AFTER PLAN 01-19`

> CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, but only in DOCUMENT ORDER: `const a = globalThis; const b = a; const g = b; g.fetch(u)` reports and so does the `sdk.requests` twin, while a chain read BEFORE its root is bound is SILENT, because there is no symbol table and no second pass. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in `NUMERIC_MEMBERS` is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary `+` indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19: 23 files over both `SOURCE_ROOTS`, ZERO violations, with `compat.ts`'s `at()` `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name.

### (ii) `.planning/REQUIREMENTS.md` — CORE-11's fourth dated correction (residual clause)

> THE RESIDUAL THAT REMAINS, in the same words as that gate's `THE FINAL RESIDUAL, AFTER PLAN 01-19` block, `.planning/STATE.md`'s P9-D3 amendment and `.planning/WINDOWS.md`: CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, but only in DOCUMENT ORDER: `const a = globalThis; const b = a; const g = b; g.fetch(u)` reports and so does the `sdk.requests` twin, while a chain read BEFORE its root is bound is SILENT, because there is no symbol table and no second pass. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in `NUMERIC_MEMBERS` is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary `+` indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19: 23 files over both `SOURCE_ROOTS`, ZERO violations, with `compat.ts`'s `at()` `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name.

### (iii) `.planning/STATE.md` — P9-D3's SECOND pointer amendment (residual clause)

> THE ACCEPTED RESIDUAL AFTER THIS PLAN, in the same words as the gate's `THE FINAL RESIDUAL, AFTER PLAN 01-19` block, `REQUIREMENTS.md`'s CORE-11 correction and `WINDOWS.md`: CORE-11's clause `no sdk.requests.send IN ANY SPELLING` IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, but only in DOCUMENT ORDER: `const a = globalThis; const b = a; const g = b; g.fetch(u)` reports and so does the `sdk.requests` twin, while a chain read BEFORE its root is bound is SILENT, because there is no symbol table and no second pass. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in `NUMERIC_MEMBERS` is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary `+` indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19: 23 files over both `SOURCE_ROOTS`, ZERO violations, with `compat.ts`'s `at()` `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name.

### (iv) `.planning/WINDOWS.md` entry 23 (residual clause)

> THE RESIDUAL THAT REMAINS, in the same words as that gate's THE FINAL RESIDUAL, AFTER PLAN 01-19 block, REQUIREMENTS.md's CORE-11 correction and STATE.md's P9-D3 amendment: CORE-11's clause 'no sdk.requests.send IN ANY SPELLING' IS BOUND, AND THIS IS WHAT BOUNDS IT — the phrase is not an absolute and must not be read as one. A RECEIVER OR GLOBAL ALIAS CHAIN resolves to ANY DEPTH, but only in DOCUMENT ORDER: const a = globalThis; const b = a; const g = b; g.fetch(u) reports and so does the sdk.requests twin, while a chain read BEFORE its root is bound is SILENT, because there is no symbol table and no second pass. A RECEIVER KEY resolves exactly ONE HOP — a literal, an assembly in every spelling, a conditional, a comma sequence — and TWO HOPS OF KEY is silent. Outside those, four things are beyond the walk: a value crossing a FUNCTION BOUNDARY, a PARAMETER, a LOOP BINDING, and a name bound in ANOTHER FILE. And one thing is ASSUMED rather than proven: a member or method call named in NUMERIC_MEMBERS is taken to be numeric WHATEVER ITS RECEIVER, a NAME heuristic that fails OPEN (WR-26), disclosed rather than narrowed because narrowing it was MEASURED to change nothing except to re-poison ordinary + indexing. Every exemption here is preserved BY MEASUREMENT, re-run after each widening in plan 01-19: 23 files over both SOURCE_ROOTS, ZERO violations, with compat.ts's at() cur[key] and ctx[root], observations.ts's segments[i] and MIGRATIONS[MIGRATIONS.length - 1] all asserted quiet by name.

**The phrase is BOUND, not accompanied.** All four open by naming `no sdk.requests.send IN ANY SPELLING` and then saying what bounds it, in the same sentence. A reader who reaches "in any spelling" reaches the bound in the same breath — which is the point, because that exact phrase is the one whose gap disqualified this requirement at `e7cc4b6`.

## 8. THE WINDOWS LEDGER — THROUGH THE TOOL, NEVER BY HAND

```
=== COMMAND: gsd-tools windows fixed 22 ===
ok: True   → entry 22 status: fixed, resolved_at 2026-08-24T08:49:12.490Z
            open_count 18 → 17, fixed_count 4 → 5

=== COMMAND: gsd-tools windows append --kind deviation --phase 01 \
      --file packages/backend/src/outbound-prohibition.spec.ts --description "…" ===
ok: True   → entry 23 created, status open, recorded_at 2026-08-24T08:49:36.488Z
            open_count 17 → 18, total_count 22 → 23

=== gsd-tools windows status (after) ===
open: 18  fixed: 5  total: 23
 entry 13 -> fixed  resolved_at 2026-08-24T08:20:46.154Z
 entry 20 -> fixed  resolved_at 2026-08-24T08:21:10.428Z
 entry 22 -> fixed  resolved_at 2026-08-24T08:49:12.490Z
 entry 23 -> open
OPEN entries on outbound-prohibition.spec.ts: [23]
```

**Exactly one open entry on the gate file, and it carries the post-wave-19 bound.** Entry 22 said in its own description that it was the receiver-key residual *as of wave 18* and named this plan as its superseder; this plan's widenings are what supersede it, so leaving it open for even one wave would have left a tool-owned ledger row stating a residual **wider than the code**, created by this round and left standing by it.

`.planning/WINDOWS.md` was not hand-edited. Its diff is tool-shaped — the frontmatter counters and the JSON block moved together:

```
-fixed_count: 4        +fixed_count: 5
-total_count: 22       +total_count: 23
-last_updated: 2026-08-24T08:21:34.840Z
+last_updated: 2026-08-24T08:49:36.488Z
```

## 9. APPEND-ONLY, VERIFIED PROGRAMMATICALLY RATHER THAN ASSERTED

```
$ REQUIREMENTS.md
line count old/new: 273 273
differing line indices: [45]
checkbox change only at head: - [ ] **CORE-11** -> - [x] **CORE-11**
PRIOR TEXT BYTE-IDENTICAL (old body is a prefix of new body): True
APPENDED CHARS: 4661

$ STATE.md
line counts: 230 230   differing: [160]
PRIOR TEXT BYTE-IDENTICAL (old line is a strict prefix of new): True
APPENDED CHARS: 3526
```

One line changed in each file. In `REQUIREMENTS.md` the only in-place edit is the single checkbox character; everything else is appended. Plan 01-18's corrections and its P9-D3 amendment are byte-identical.

## 10. THE LEDGER IS NOT CLEAN, AND CORE-11's FLIP MUST NOT BE READ AS SAYING IT IS

STORE-03's and STORE-07's text-versus-usage collisions remain **DEFERRED WITH AN OWNER** — the operator, at the next requirements pass, by the STORE-01 → STORE-08 route — and this plan neither closed them nor re-litigated them.

`COVERAGE.md` was checked and is **unchanged**: this round changed no external-API capability surface, since it hardens a static gate over source that was already scanned.

## 11. THE GREEN BASELINE, RESTORED AND RECORDED

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  1079 passed (1079)

$ pnpm typecheck   → exit 0
$ pnpm lint        → exit 0
$ pnpm knip        → exit 0

$ pnpm build:backend   → exit 0
$ pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto
```

31 files / 1079 tests, up from 1053 — 26 new cases across the three tasks. Bundle at exactly one specifier.

**Scope checks:**

```
$ git diff --exit-code packages/backend/src/store packages/engine/src tests/ scripts/
SCOPED CLEAN: yes

$ git diff --exit-code 01-01..01-18-PLAN.md 01-VERIFICATION.md 01-REVIEW.md 01-UAT.md
PLAN/VERIFICATION/REVIEW/UAT CLEAN: yes

$ git diff --exit-code COVERAGE.md
COVERAGE.md UNCHANGED: yes
```

## Files Created/Modified

- `packages/backend/src/outbound-prohibition.spec.ts` — `globalAliases` + `shadowedGlobals` + `globalThisAliases` collectors; the shared `globalNameOf` / `dynamicCodeOf` / `outboundCtorOf` lookups; `aliasedGlobalOf`'s three grow-spellings; `isGlobalReceiverIn`'s one-hop resolution; `callDetail` / `constructionDetail` alias-naming helpers; the corrected `DYNAMIC_CODE` and `isProvablyNumeric` docblocks; residual (a) split in two; the `THE FINAL RESIDUAL, AFTER PLAN 01-19` header block; 26 new fixtures, two of them titled as measured non-evidence
- `.planning/REQUIREMENTS.md` — CORE-11 flipped to `[x]` and its fourth dated correction appended (append-only; prior text verified byte-identical programmatically)
- `.planning/STATE.md` — P9-D3's SECOND dated pointer amendment (append-only; prior text verified byte-identical programmatically)
- `.planning/WINDOWS.md` — entry 22 marked fixed, entry 23 appended (tool-owned, never hand-edited)

## Decisions Made

1. **WR-26 resolved by correcting the docblock, not the branch — and the real tree picked.** The plan deliberately refused to choose. Both alternatives were applied and run; the review's own suggestion changed nothing, and the maximal narrowing changed only `+` index compositions. The measurement is kept in the docblock so nobody re-derives it.
2. **The bare-identifier `DYNAMIC_CODE` test is narrowed by one provable fact, not a heuristic.** A top-level `function Function(…)` binds the name for the whole module by ordinary JS scoping — that is a proof from the AST. A nested declaration proves nothing in a scope-blind walk and still reports, which is fail-closed, and a fixture asserts that direction so the narrowing cannot later be widened into a bypass without going red.
3. **One `globalNameOf` lookup, not two parallel paths.** The call rule and the `new` rule share it, so a spelling added later lands in both. Closing one half and leaving the other, two lines apart, is precisely how this file acquired the asymmetry CR-08 was.
4. **The two GLOBAL-MEMBER fixture rows are titled as measured non-evidence.** They stayed green under the mutations they accompany because a pre-existing rule also catches them. Left untitled they would have been the `:1740-1744` defect written fresh into the file convened to remove it.
5. **Residual (a) amended in the direction of the gate reaching FURTHER than its prose.** A disclosure narrower than the code is the same class of defect as one wider than it, and a residual list is trusted for completeness in both directions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] The `function Function` must-stay-quiet criterion required NARROWING an existing fail-closed rule, and the narrowing had to be made provable rather than heuristic**

- **Found during:** Task 1 (baseline probe)
- **Issue:** The plan's acceptance criterion required `function Function(a) { return a; } Function("x")` to report `[]`. Measured, it reported `["outbound-dynamic-code"]` **before** this plan — the bare-identifier `DYNAMIC_CODE` test is a NAME test and deliberately fail-closed ("the same two-identifier posture `OUTBOUND_CONSTRUCTORS` takes"). Satisfying the criterion naively — excluding any locally-declared name — would have opened a fail-OPEN bypass on the surface this plan itself calls the one that reaches every other surface, in a walk that is scope-blind by accepted design (T-01-51).
- **Fix:** Narrowed by exactly one **provable** fact instead: a **top-level** `function`/`class` declaration binds the name for the whole module by ordinary JS scoping, so the bare call in that module provably is not the global. Nested declarations are not collected and still report. A fixture asserts each direction.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** `through shadowedGlobals: a TOP-LEVEL function Function(...) …` and `through shadowedGlobals' TOP-LEVEL bound: a NESTED declaration … still REPORTS` both pass; real tree 23 files / 0 violations
- **Committed in:** `9cf9162`

**2. [Rule 2 - Missing Critical] Two new fixture rows were green for a second reason and would have stood as false evidence**

- **Found during:** Task 1 (mutations 1 and 2)
- **Issue:** The `GLOBAL-MEMBER` rows (`const F = globalThis.Function`, `const X = globalThis.XMLHttpRequest`) stayed green under the very mutations they sat beside — the pre-existing member-reference rule catches them regardless. Left as written they would have been read as proof of the alias lookup. That is exactly the `:1740-1744` defect plan 01-18 was convened to remove, being authored fresh into the same file.
- **Fix:** Both rows retitled to name themselves as measured non-evidence, in the row title where a reader meets them.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** measured under both mutations, restored and re-run green
- **Committed in:** `9cf9162`

**3. [Rule 2 - Missing Critical] Residual (a) had understated the walk's reach for alias chains since the first alias set was written**

- **Found during:** Task 2 (writing an expected MEASURED SILENCE fixture, which failed)
- **Issue:** Every residual list in this file bounded the walk at "more than ONE HOP of indirection". Measured, every alias set chains to arbitrary depth in document order — `fetchAliases`, `navigatorAliases`, `receiverAliases` included, from the day they were written. The plan did not anticipate this; it was found because the fixture was written to be executed rather than assumed.
- **Fix:** Residual (a) split in two — keys stop at one hop, aliases chain in document order — with four fixtures asserting both halves and the document-order silence. Carried into all four disclosure surfaces.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/WINDOWS.md`
- **Verification:** three new fixtures pass; the transitivity probe across all six alias sets is pasted in section 6
- **Committed in:** `2709f18`, `52c5b58`

**4. [Rule 3 - Blocking] Prettier quote-style violations on the new `it(...)` titles**

- **Found during:** Tasks 1 and 2 (`pnpm lint` gate, a plan-level acceptance criterion)
- **Issue:** Titles containing escaped double quotes failed `prettier/prettier`. Same cause as plan 01-18's deviation 1.
- **Fix:** `pnpm exec eslint --fix` on the file.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** `pnpm lint` exit 0
- **Committed in:** `9cf9162`, `2709f18`

---

**Total deviations:** 4 auto-fixed (3 missing-critical, 1 blocking).
**Impact on plan:** No scope creep. Deviations 1 and 2 prevented shipping fail-open behaviour and false evidence respectively; deviation 3 found and corrected a disclosure defect the plan did not know existed, on the requirement being marked complete in the same round.

## Issues Encountered

**A plan acceptance criterion that, taken literally, would have weakened the gate.** The `function Function` must-stay-quiet criterion is discussed as deviation 1. It is recorded as an issue as well as a deviation because the resolution was not "do what the plan said" or "skip it" but a third thing: find the version of the requirement that is provable from the AST, implement that, and assert the fail-closed complement so the narrowing cannot later be loosened silently. The naive reading of the criterion and the safe implementation of it differ, and a reader auditing this plan against its own criteria should know which one shipped.

## Known Stubs

None introduced. The residual disclosed here is a measured bound with fixtures asserting each item's current behaviour — including the two that are *silences* and are labelled as such in their own titles — not a stub. It is recorded in `.planning/WINDOWS.md` entry 23.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **CORE-11 is complete**, marked against an eight-row discharge table with every enumerated surface backed by a fixture that has been observed failing. `WINDOWS.md` carries exactly one open entry for this gate, and it states the post-wave-19 bound.
- **Ready for plans 01-20, 01-21 and 01-22**, which own WR-22, WR-24 (`packages/backend/src/store/*`), WR-25 and IN-21 (`tests/pins.spec.ts`, `scripts/phase1/tracer-e2e.sh`). None of those files was touched here.
- **Carried forward for whoever revisits this gate:** the alias-chain transitivity found in section 6 is now disclosed but not narrowed. If a future round wants a genuine one-hop bound on aliases, that is a design change with a measurable cost, and the fixtures in this plan are what would tell them what it costs.
- **Not closed, with an owner:** STORE-03's and STORE-07's ledger collisions remain deferred to the operator at the next requirements pass.
- **No blockers.** Green baseline: 31 files / 1079 tests, typecheck / lint / knip clean, bundle at exactly one specifier (`crypto`).

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-24*

## Self-Check: PASSED

- `packages/backend/src/outbound-prohibition.spec.ts` — FOUND
- `.planning/REQUIREMENTS.md` — FOUND
- `.planning/STATE.md` — FOUND
- `.planning/WINDOWS.md` — FOUND
- `.planning/phases/01-skeleton-persistence-compatibility/01-19-SUMMARY.md` — FOUND
- Commit `9cf9162` — FOUND
- Commit `2709f18` — FOUND
- Commit `52c5b58` — FOUND
- `grep -c '^- \[x\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md` → 1
- `pnpm test` re-run at close-out → 31 files / 1079 tests, zero failures
