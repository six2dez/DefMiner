---
phase: 01-skeleton-persistence-compatibility
plan: 18
subsystem: testing
tags: [core-11, outbound-prohibition, typescript-ast, static-gate, gap-closure, cr-08]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "the CORE-11 outbound gate as rewritten by plans 01-12 and 01-16 — receiverKind's third state, isAssembledKey's measured bound, the one-document-order collect pass"
provides:
  - "assembledNames: a receiver key survives no `const` — an assembly bound one hop back is reported in every spelling (+, template, .join(\"\"), opaque call) through either a declaration or an assignment"
  - "keyReceiver: one definition of what a readable key is, called by the direct key and by both conditional branches, so the two cannot diverge"
  - "a conditional receiver key resolved on BOTH branches with initializerReceiver's semantics — sdk[b ? \"requests\" : \"net\"] reports outbound-send, not outbound-unanalysable"
  - "a comma sequence resolved to its rightmost operand in unwrap, with its seven-caller blast radius measured and recorded"
  - "a mechanism-to-shape table in the gate header — which resolver reads which spelling, and which rows are resolved by NOTHING"
  - "one bound, stated identically in the gate header, REQUIREMENTS.md, STATE.md and WINDOWS.md, derived from the code"
affects: [01-19, phase-02, phase-03, phase-05]

actuals:
  tokens: 41000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Every gate fixture title names the MECHANISM that resolves it, so a fixture can never again stand in as the bound of a rule it does not touch"
    - "A measured silence is labelled as a silence, not asserted as a bound — rows that no revert can turn red say so in their own title"
    - "A disclosure that narrows or widens a residual is derived FROM the code and copied verbatim into every surface, never paraphrased per surface"
    - "A tool-owned ledger entry scopes itself to the wave it is the residual OF and names its superseder"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/WINDOWS.md

key-decisions:
  - "Comma-sequence resolution lives in `unwrap`, not in the key resolver — its value IS its rightmost operand at every one of the seven call sites, and the narrow placement would have created a NEW asymmetry (sdk[(0,\"requests\")] reported while (0, sdk.requests).send(req) stayed silent) of exactly the kind CR-08 was raised to remove"
  - "A conditional receiver key reports outbound-send, NOT outbound-unanalysable — it hides nothing, and reporting a completely readable site as unreadable is the same overclaim running the other way"
  - "Residual (b)'s exemption is preserved by re-MEASUREMENT (23 files, 0 violations) rather than by argument, and all four measured sites are asserted quiet by name"
  - "CORE-11 stays `[ ]`: WR-23's `const e = eval; e(s)` is still silent while the requirement's own text enumerates dynamic code construction. Plan 01-19 owns the flip."
  - "WINDOWS.md entry 20 was marked fixed alongside entry 13 — its wording invited the same superseded reading that made residual (b)'s justification do double duty"

patterns-established:
  - "Mechanism-named fixture titles: every `it(...)` in the unreadable-receiver block opens with `through <mechanism>:` or `through NOTHING`"
  - "Per-branch mutation proofs: each new resolver branch is reverted SEPARATELY, observed RED by test title, restored, re-run green — a combined revert cannot show each branch is load-bearing on its own"

requirements-completed: []

coverage:
  - id: D1
    description: "A receiver key bound ONE HOP to an assembly is reported, in every spelling the walk can read: `+`, template interpolation, `.join(\"\")`, an opaque call, through either a declaration or an assignment"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through assembledNames: an assembled KEY survives no const — `const k = \"req\" + \"uests\"; sdk[k].send(req)`"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through assembledNames: every spelling of a bound assembly is unreadable (5 cases)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The WR-19 asymmetry against the member level and the global level is gone — the assembled-key twins now agree"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through assembledNames: an assembled KEY survives no const (twin assertions for sdk.requests[m] and globalThis[k])"
        status: pass
    human_judgment: false
  - id: D3
    description: "A conditional receiver key of two literals reports outbound-send and explicitly NOT outbound-unanalysable; one outbound branch suffices; an assembled branch stays unreadable"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through the CONDITIONAL resolver: `sdk[b ? \"requests\" : \"net\"]` hides nothing, so it reports outbound-send"
        status: pass
    human_judgment: false
  - id: D4
    description: "A comma sequence resolves to its rightmost operand, in key position and at the receiver level"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through the COMMA SEQUENCE rule plus constStrings: `sdk[(0, \"requests\")]` is its rightmost operand"
        status: pass
    human_judgment: false
  - id: D5
    description: "The positive control is undisclosed-downgrade-proof: a key bound one hop to a literal is still a NAMED receiver and reports outbound-send, never outbound-unanalysable"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through constStrings: a key bound ONE HOP to a LITERAL is a NAMED receiver, not an unreadable one"
        status: pass
    human_judgment: false
  - id: D6
    description: "The measured exemption bounding residual (b) is preserved and RE-MEASURED against real shipped source: 23 files over both SOURCE_ROOTS, zero violations, with all four measured sites asserted quiet by name"
    requirement: "CORE-11"
    verification:
      - kind: integration
        ref: "packages/backend/src/outbound-prohibition.spec.ts#%s reaches no outbound surface (it.each over shippedFiles())"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through NOTHING, and that is residual (b): an ordinary DYNAMIC lookup is not an assembled key and stays quiet"
        status: pass
    human_judgment: false
  - id: D7
    description: "Every new branch has been observed RED by reverting it SEPARATELY — assembledNames consultation, conditional resolver, comma resolution — each restored and re-run green"
    verification:
      - kind: manual_procedural
        ref: "three executed mutation runs, RED test titles and assertion messages pasted below; each restored and re-run green"
        status: pass
    human_judgment: false
  - id: D8
    description: "One bound is stated in five artifacts in the same words, and it is what the code does"
    verification:
      - kind: manual_procedural
        ref: "all five statements pasted consecutively below under `## THE FIVE DISCLOSURES, SIDE BY SIDE`"
        status: unknown
    human_judgment: true
    rationale: "Agreement between five prose statements is a reading judgment, not an assertion any test can make. The evidence is assembled for one-glance comparison; a human must confirm they agree."
  - id: D9
    description: "CORE-11 remains unchecked with the reason recorded on the requirement, and plan 01-19 named as the owner of the flip"
    requirement: "CORE-11"
    verification:
      - kind: other
        ref: "grep -c '^- \\[ \\] \\*\\*CORE-11\\*\\*' .planning/REQUIREMENTS.md == 1"
        status: pass
    human_judgment: false

duration: 22 min
completed: 2026-08-24
status: complete
---

# Phase 01 Plan 18: Receiver-Key Resolution and Five Disclosures Reconciled — Summary

**`assembledNames`, a conditional-key resolver and a comma-sequence rule close CR-08's eight silent receiver-key spellings, every fixture is retitled with the mechanism that resolves it, and one bound derived from the code replaces five disclosures that disagreed.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-08-24T08:03:41Z
- **Completed:** 2026-08-24T08:25:12Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- A receiver key survives no `const`: an assembly bound one hop back reports in all five spellings CR-08 executed.
- The RECEIVER-level asymmetry against the member level and the global level is gone; all three now agree.
- The conditional key — CR-08's sharper half, reported by nothing and disclosed by nothing — reports `outbound-send`, and a fixture asserts it is NOT downgraded to `outbound-unanalysable`.
- `:1740-1744`, the fixture that stood in as a bound for a rule it never touched, is rewritten: the false sentence is gone, the case has its own mechanism-named title, and the two-hop row is labelled a MEASURED SILENCE.
- A mechanism-to-shape table in the header, plus every fixture title naming its mechanism — the part meant to stop the defect recurring rather than to fix this instance of it.
- One bound written into five artifacts, derived from the amended code.

## Task Commits

1. **Task 1 (tracer): assembledNames wired end to end** — `834b9c5` (fix)
2. **Task 2: conditional, comma sequence, mechanism-tied fixtures** — `90b4309` (fix)
3. **Task 3: one bound in five places, CORE-11 left open** — `7b1f5f1` (docs)

---

## 1. THE EIGHT SHAPES — BEFORE AND AFTER, EXECUTED

Both tables are `auditSource("probe.ts", src).map(v => v.rule)` run through a transient probe spec, BEFORE any change and AFTER all three tasks. The positive control was run first in both, which is what makes the empty lists real rather than a fixture artefact.

### BEFORE (reproduces 01-VERIFICATION.md gaps[0] exactly)

```
POSITIVE CONTROL const r = "requests"          => ["outbound-send"]
inline assembly sdk["req"+"uests"]             => ["outbound-unanalysable"]
const k = "req"+"uests"                        => []
let k; k = "req"+"uests"                       => []
let k = `req${"uests"}`                        => []
const k = ["req","uests"].join("")             => []
const k = g()                                  => []
conditional sdk[b ? "requests" : "net"]        => []
comma sequence sdk[(0,"requests")]             => []
TWO-HOP residual const a; const b = a          => []
member-level twin const m = "se"+"nd"          => ["outbound-unanalysable"]
global-level twin const k = "fet"+"ch"         => ["outbound-unanalysable"]
EXEMPT compat.ts at() cur[key]                 => []
EXEMPT compat.ts ctx[root]                     => []
EXEMPT observations.ts segments[i]             => []
EXEMPT MIGRATIONS[MIGRATIONS.length - 1]       => []
```

### AFTER (all three tasks landed)

```
POSITIVE CONTROL const r = "requests"          => ["outbound-send"]
inline assembly sdk["req"+"uests"]             => ["outbound-unanalysable"]
const k = "req"+"uests"                        => ["outbound-unanalysable"]
let k; k = "req"+"uests"                       => ["outbound-unanalysable"]
let k = `req${"uests"}`                        => ["outbound-unanalysable"]
const k = ["req","uests"].join("")             => ["outbound-unanalysable"]
const k = g()                                  => ["outbound-unanalysable"]
conditional sdk[b ? "requests" : "net"]        => ["outbound-send"]
comma sequence sdk[(0,"requests")]             => ["outbound-send"]
TWO-HOP residual const a; const b = a          => []
member-level twin const m = "se"+"nd"          => ["outbound-unanalysable"]
global-level twin const k = "fet"+"ch"         => ["outbound-unanalysable"]
EXEMPT compat.ts at() cur[key]                 => []
EXEMPT compat.ts ctx[root]                     => []
EXEMPT observations.ts segments[i]             => []
EXEMPT MIGRATIONS[MIGRATIONS.length - 1]       => []
conditional of ONE receiver + one non-receiver => ["outbound-send"]
conditional of two NON-receivers               => []
conditional with an ASSEMBLED branch           => ["outbound-unanalysable"]
```

Five shapes moved `[] → outbound-unanalysable`. Two moved `[] → outbound-send`. **The positive control is unchanged** (`outbound-send`, never downgraded). **The two-hop residual is unchanged** (`[]`, still the disclosed bound). **All four measured exempt shapes are unchanged** (`[]`).

## 2. THE REAL-TREE MEASUREMENT — A ZERO, RUN, NOT ARGUED

Run after task 1's collect-pass change and again after task 2's resolver changes:

```
REAL TREE: roots=packages/backend/src,packages/engine/src
REAL TREE: files scanned = 23
REAL TREE: violations = 0
```

No site fired, so no narrowing was required and residual (b)'s exemption stands as measured. The four real call sites that set that bound were read in source first — `compat.ts:131-133` (`cur[key]`, `key` a `for…of` binding), `compat.ts:141` (`ctx[root]`, `root` a parameter), `observations.ts:296` (`segments[i]`), `migrations.ts:253` (`MIGRATIONS[MIGRATIONS.length - 1]`) — and all four are now asserted quiet BY NAME as inline fixtures. `ctx[root]` was the one of the four that had been measured in 01-16 but never asserted; it was added.

## 3. THREE MUTATION PROOFS — SEPARATE, EXECUTED, RESTORED

Each branch reverted **on its own**. A combined revert cannot show that each branch is load-bearing separately.

### Mutation 1 — `assembledNames` consultation removed from `receiverKind`

```
MUTATION APPLIED: assembledNames consultation removed from receiverKind
     × through assembledNames: an assembled KEY survives no const — `const k = "req" + "uests"; sdk[k].send(req)` 2ms
 FAIL  packages/backend/src/outbound-prohibition.spec.ts > a receiver the walk cannot read is REPORTED, not dropped > through assembledNames: an assembled KEY survives no const — `const k = "req" + "uests"; sdk[k].send(req)`
AssertionError: const k = "req" + "uests"; sdk[k].send(req) still reports clean: expected [] to include 'outbound-unanalysable'
 Test Files  1 failed (1)
      Tests  1 failed | 135 passed (136)
```

Restored, re-run green: `Tests  136 passed (136)`.

### Mutation 2 — conditional resolver removed from `receiverKind`

```
MUTATION 2 APPLIED: conditional resolver removed from receiverKind
     × through the CONDITIONAL resolver: `sdk[b ? "requests" : "net"]` hides nothing, so it reports outbound-send 2ms
 FAIL  packages/backend/src/outbound-prohibition.spec.ts > a receiver the walk cannot read is REPORTED, not dropped > through the CONDITIONAL resolver: `sdk[b ? "requests" : "net"]` hides nothing, so it reports outbound-send
AssertionError: sdk[b ? "requests" : "net"].send(req) still reports clean: expected [] to include 'outbound-send'
 Test Files  1 failed (1)
      Tests  1 failed | 143 passed (144)
```

Restored, re-run green: `Tests  144 passed (144)`. Note that only the CONDITIONAL fixture went red — the comma fixture stayed green, which is what proves the two branches are independent.

### Mutation 3 — `CommaToken` arm removed from `unwrap`

```
MUTATION 3 APPLIED: CommaToken arm removed from unwrap
     × through the COMMA SEQUENCE rule plus constStrings: `sdk[(0, "requests")]` is its rightmost operand 2ms
 FAIL  packages/backend/src/outbound-prohibition.spec.ts > a receiver the walk cannot read is REPORTED, not dropped > through the COMMA SEQUENCE rule plus constStrings: `sdk[(0, "requests")]` is its rightmost operand
AssertionError: sdk[(0, "requests")].send(req) still reports clean: expected [] to include 'outbound-send'
 Test Files  1 failed (1)
      Tests  1 failed | 143 passed (144)
```

Restored, re-run green: `Tests  144 passed (144)`. Again only the COMMA fixture went red.

## 4. THE AMENDED `describe` BLOCK'S TITLES — EVERY ONE NAMES ITS MECHANISM

`describe("a receiver the walk cannot read is REPORTED, not dropped")`, verbatim from `--reporter=verbose`:

```
 1  through isAssembledKey: an INLINE assembled receiver key is unreadable
 2  through unreadableAliases: an unreadable RECEIVER EXPRESSION bound to a name reports where the name is USED
 3  through assembledNames: an assembled KEY survives no const — `const k = "req" + "uests"; sdk[k].send(req)`
 4  through assembledNames: every spelling of a bound assembly is unreadable — a `+` concatenation
 5  through assembledNames: every spelling of a bound assembly is unreadable — the ASSIGNMENT spelling
 6  through assembledNames: every spelling of a bound assembly is unreadable — a TEMPLATE interpolation
 7  through assembledNames: every spelling of a bound assembly is unreadable — an ARRAY join
 8  through assembledNames: every spelling of a bound assembly is unreadable — an opaque CALL result
 9  through the global-member path: an assembled MEMBER of an identified global receiver is unreadable
10  through isAssembledKey plus the destructure collector: a DESTRUCTURE off an assembled key is unreadable
11  through nothing: the TWO-HOP shape is still the DISCLOSED residual, and this asserts what it ACTUALLY reports
12  through constStrings: a key bound ONE HOP to a LITERAL is a NAMED receiver, not an unreadable one
13  through the CONDITIONAL resolver: `sdk[b ? "requests" : "net"]` hides nothing, so it reports outbound-send
14  through the COMMA SEQUENCE rule plus constStrings: `sdk[(0, "requests")]` is its rightmost operand
15  through NOTHING, and that is residual (b): an ordinary DYNAMIC lookup is not an assembled key and stays quiet
16  through isProvablyNumeric's poisoning: a numeric name POISONED by a string binding stops exempting the key
```

Titles 12, 13 and 14 are new. Titles 1, 2, 9, 10, 15 and 16 are pre-existing cases **retitled** so no title in this block can be misread as bounding a rule it does not exercise. Titles 11 and 15 open with `through nothing` / `through NOTHING` — those rows are measured silences that no revert can turn red, and saying so in the title is what stops either being cited as a bound.

## 5. THE HEADER'S MECHANISM-TO-SHAPE TABLE

```
      SPELLING (in receiver-key position)      RESOLVED BY          REPORTS
      -------------------------------------    -----------------    ---------------------
      sdk["requests"]                          literalOf            outbound-send
      const r = "requests"; sdk[r]             constStrings         outbound-send
      sdk["req" + "uests"]                     isAssembledKey       outbound-unanalysable
      const k = "req"+"uests"; sdk[k]          assembledNames       outbound-unanalysable
        (and the let/assignment, template, .join("") and opaque-call spellings
         of that same one-hop binding — all `assembledNames`)
      sdk[b ? "requests" : "net"]              conditional branch   outbound-send
                                               of receiverKind
      sdk[(0, "requests")]                     unwrap's CommaToken  outbound-send
                                               arm, then literalOf
      const a="requests"; const b=a; sdk[b]    NOTHING              [] — residual (a)
      ctx[root] where root is a PARAMETER      NOTHING              [] — residual (b)
      cur[key] where key is a LOOP BINDING     NOTHING              [] — residual (b)
      x[i + 1] / MIGRATIONS[len - 1]           isProvablyNumeric    [] — an index, not a name
```

## 6. THE COMMA-SEQUENCE PLACEMENT DECISION AND ITS BLAST RADIUS

**Chosen: `unwrap`, not the key resolver.** A comma expression's value IS its rightmost operand at every one of `unwrap`'s seven call sites (`isProvablyNumeric`, `isAssembledKey`, `receiverKind`, `literalOf`, `isFetchExpression`, `isNavigatorReceiver`, `isGlobalReceiver`), which is the same claim the five existing wrappers make. The narrow alternative would have left `sdk[(0, "requests")]` reported while `(0, sdk.requests).send(req)` stayed silent — a NEW asymmetry of exactly the kind CR-08 was raised to remove.

**Blast radius, measured with the arm removed and restored rather than predicted.** Three shapes moved from `[]` to reported:

```
comma (0, sdk.requests).send(req)          []  ->  ["outbound-send"]
comma alias const r = (0, sdk.requests)    []  ->  ["outbound-send"]
comma (0, eval)(s)                         []  ->  ["outbound-dynamic-code"]
```

`(0, globalThis.fetch)(url)` already reported via another path both before and after, and is named in the docblock so nobody credits it to this change. Real-tree cost after the widening: none — 23 files, 0 violations.

**A hazard found and recorded while writing these fixtures:** `await (X).send(req)` does NOT parse as an await of a parenthesised expression. TypeScript reads `await(X)` as a CALL and `.send` as a member of its result, so a comma fixture written with `await` is green for a parsing reason and proves nothing. The comma fixtures omit `await` and the docblock says why.

## 7. THE FIVE DISCLOSURES, SIDE BY SIDE

One bound, derived from the amended code, then copied. Compare them in one glance — the verifier's finding was not that any single one was wrong, but that they disagreed.

### (i) Gate header, boundary 2 — the CR-08 correction paragraph

> **CORRECTED AND WIDENED 2026-08-24 (CR-08), AND THE CORRECTION MATTERS AS MUCH AS THE WIDENING.** The clause immediately above — "reported wherever that value is used as one, including through a one-hop binding" — was FALSE WHEN IT WAS WRITTEN. It described the assembled RECEIVER EXPRESSION (`const r = sdk["re"+"quests"]; r.send(req)`), which was indeed caught, and a reader took it for the assembled KEY (`const k = "req"+"uests"; sdk[k].send(req)`), which was not: one `const` disproved it, while the MEMBER-level twin (`const m = "se"+"nd"; sdk.requests[m](req)`) and the GLOBAL-level twin (`const k = "fet"+"ch"; globalThis[k](url)`) both reported. That is the WR-19 asymmetry standing one level up, inside the paragraph WR-19 rewrote. The paragraph also described ONLY inline assembly and said nothing whatever about a conditional key or a comma sequence, both of which the walk could read completely and reported nothing on. What the walk resolves in RECEIVER-KEY position, as the code now behaves and as the table below enumerates mechanism by mechanism:
> - a key bound ONE HOP to an assembly, in EVERY spelling — `+`, a template, `.join("")`, an opaque call — and through EITHER a declaration or an assignment (`assembledNames`);
> - a CONDITIONAL key, resolved on BOTH branches with `initializerReceiver`'s semantics, so `sdk[b ? "requests" : "net"]` reports `outbound-send` and NOT `outbound-unanalysable` — it hides nothing, and calling a completely readable site unreadable would be the same overclaim running the other way;
> - a COMMA SEQUENCE, resolved to its rightmost operand in `unwrap`, so `sdk[(0, "requests")]` and `(0, sdk.requests).send(req)` both report.
>
> ONE HOP REMAINS THE LIMIT IN EVERY DIRECTION. Two hops is residual (a).

### (ii) Gate header, residual (a)

> (a) MORE THAN ONE HOP of indirection, or a value crossing a FUNCTION BOUNDARY, is beyond the walk. `const a = "requests"; const b = a; sdk[b].send(req)` reports nothing, and that is asserted below as a MEASURED SILENCE rather than left to be discovered.
> RESTATED, because the old wording bounded the walk at "more than one hop" and thereby affirmatively implied one hop was inside — which was FALSE for an assembled key until 2026-08-24 and is TRUE now. One hop is inside for a literal binding, for an assembled binding in every spelling, for a conditional and for a comma sequence. Two hops is out.

### (iii) Gate header, residual (b)

> (b) A KEY THE WALK NEVER SAW BOUND — a parameter, a `for…of` or `for(;;)` loop binding, a name whose binding is out of document order or in another file — is NOT reported. That bound was set by MEASUREMENT and the measurement is kept here because it is the evidence: reporting every key that would not reduce fired twice on the real tree, on `compat.ts`'s documented `at()` dotted-path walk (`cur[key]`, `key` a `for…of` binding) and on `compat.ts:141`'s `ctx[root]` (`root` a parameter); `store/observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` are held quiet by `isProvablyNumeric` instead. A gate that calls those four an outbound network surface gets deleted rather than fixed. All four are asserted quiet below, BY NAME.
> RESTATED, because the old wording said "a merely DYNAMIC key — a bare identifier or a parameter" and that JUSTIFICATION was doing double duty: the measurement exempted a key the walk never watched being bound, and it was being read as ALSO exempting one it had watched being assembled. It does not. The walk reports what it can see being HIDDEN and discloses what it merely cannot FOLLOW, and a name it watched being assembled is the first, not the second.
> RE-MEASURED 2026-08-24 after the CR-08 widening landed: the full gate over both `SOURCE_ROOTS`, 23 files, ZERO violations. The exemption is preserved by measurement, not by argument.

### (iv) `.planning/REQUIREMENTS.md` — CORE-11's third dated correction (residual clause)

> THE RESIDUAL THAT REMAINS, in the same words as that gate's boundary 2 and as `.planning/STATE.md`'s P9-D3 amendment: more than ONE HOP of indirection, a value crossing a FUNCTION BOUNDARY, and a key the walk NEVER SAW BOUND — a parameter, a loop binding, a name bound out of document order or in another file. That exemption was set by real-tree measurement (`compat.ts`'s `at()` `cur[key]` and `ctx[root]`; `observations.ts`'s `segments[i]`; `MIGRATIONS[MIGRATIONS.length - 1]`) and RE-MEASURED after the widening: 23 files over both roots, ZERO violations. All four are asserted quiet by name.

### (v) `.planning/STATE.md` — P9-D3's pointer amendment (residual clause)

> THE ACCEPTED RESIDUAL AFTER THIS PLAN, in the same words as the gate's boundary 2 and as `REQUIREMENTS.md`'s CORE-11 correction: more than ONE HOP of indirection, a value crossing a FUNCTION BOUNDARY, and a key the walk NEVER SAW BOUND — a parameter, a loop binding, a name bound out of document order or in another file. That last exemption is preserved BY MEASUREMENT, re-run after the widening: 23 files over both source roots, ZERO violations, with `compat.ts`'s `at()` `cur[key]` and `ctx[root]`, `observations.ts`'s `segments[i]` and `MIGRATIONS[MIGRATIONS.length - 1]` all asserted quiet by name.

**The residual set, identical in all five:** more than one hop of indirection · a value crossing a function boundary · a key the walk never saw bound (a parameter, a loop binding, a name bound out of document order or in another file). Each item has a fixture asserting it currently reports `[]`: two hops at title 11, the parameter and loop binding at title 15. A provably numeric key is called out in all five as an EXCLUSION rather than a residual — it is an index, not a hidden name.

## 8. THE `:1740-1744` REWRITE — THE THIRD DEFECTIVE ARTIFACT

The deleted sentence was:

> The ONE-hop version of the same shape is caught, which is what makes the residual a bound rather than a hole: `constStrings` resolves one hop.

The paragraph that replaces it, whole:

> WHAT USED TO SIT HERE, AND WHY IT DOES NOT ANY MORE (CR-08). A `constStrings` assertion — `const r = "requests"; sdk[r].send(req)` — stood at this spot under the sentence "The ONE-hop version of the same shape is caught, which is what makes the residual a bound rather than a hole". That sentence was FALSE and the placement was worse than the sentence: the case resolves through `constStrings`, so it was green whether or not the assembled-key rule could see a hop at all — a green-because-it-cannot-fail assertion wearing the costume of a bound, read by the next reader as proof that the bound held. It has moved to its own mechanism-named case below, and the case that ACTUALLY exercises one hop of assembly is the `assembledNames` case above.

The literal-key assertion itself was kept — it is a good assertion in the wrong place — and now lives at title 12 under `through constStrings`, with an added negative assertion that it is NOT downgraded to `outbound-unanalysable`.

## 9. THE WINDOWS LEDGER — THROUGH THE TOOL, NEVER BY HAND

```
=== COMMAND: gsd-tools windows fixed 13 ===
ok: True   → entry 13 status: fixed, resolved_at 2026-08-24T08:20:46.154Z
            open_count 19 → 18, fixed_count 2 → 3

=== COMMAND: gsd-tools windows fixed 20 ===
ok: True   → entry 20 status: fixed, resolved_at 2026-08-24T08:21:10.428Z
            open_count 18 → 17, fixed_count 3 → 4

=== COMMAND: gsd-tools windows append --kind deviation --phase 01 \
      --file packages/backend/src/outbound-prohibition.spec.ts --description "…" ===
ok: True   → entry 22 created, status open, recorded_at 2026-08-24T08:21:34.840Z
            open_count 17 → 18, total_count 21 → 22

=== gsd-tools windows status (after) ===
open: 18  fixed: 4  total: 22
 entry 13 -> fixed
 entry 20 -> fixed
 entry 22 -> open
```

`.planning/WINDOWS.md` was not hand-edited. Its diff is tool-shaped — the frontmatter counters and the JSON block moved together:

```
-open_count: 19        +open_count: 18
-fixed_count: 2        +fixed_count: 4
-total_count: 21       +total_count: 22
-last_updated: 2026-08-22T09:56:52.151Z
+last_updated: 2026-08-24T08:21:34.840Z
```

**Entry 22's description, verbatim, showing it scopes itself to wave 18 and names its superseder:**

> THE RECEIVER-KEY RESIDUAL AS OF WAVE 18 (plan 01-18, CR-08) — SUPERSEDED IN WAVE 19 BY PLAN 01-19, which narrows it further and rewrites this bound in the gate header, REQUIREMENTS.md, STATE.md and this ledger. Supersedes entries 13 and 20, whose descriptions stated a bound the code no longer has. NOW REPORTED in receiver-key position: a literal key; a key bound ONE HOP to a literal (constStrings); a key assembled inline (isAssembledKey); a key bound ONE HOP to an assembly in EVERY spelling — +, a template, .join(""), an opaque call — through either a declaration or an assignment (assembledNames); a CONDITIONAL key resolved on both branches; a COMMA SEQUENCE resolved to its rightmost operand. THE RESIDUAL THAT REMAINS, in the same words as that gate's boundary 2, REQUIREMENTS.md's CORE-11 correction and STATE.md's P9-D3 amendment: more than ONE HOP of indirection, a value crossing a FUNCTION BOUNDARY, and a key the walk NEVER SAW BOUND — a parameter, a loop binding, a name bound out of document order or in another file. That last exemption is preserved BY MEASUREMENT, re-run after the widening: 23 files over both source roots, ZERO violations, with compat.ts's at() cur[key] and ctx[root], observations.ts's segments[i] and MIGRATIONS[MIGRATIONS.length - 1] all asserted quiet by name. CORE-11 stays unchecked: const e = eval; e(s) (WR-23) and const g = globalThis (IN-20) are still silent and plan 01-19 owns both plus the checkbox flip.

## 10. CORE-11 IS STILL UNCHECKED, AND THIS IS WHY

```
$ grep -c '^- \[ \] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
1
```

The box stays `[ ]` deliberately. CORE-11's own text enumerates "no dynamic code construction (`eval`, `new Function`)", and `const e = eval; e(s)` — a one-hop binding of `eval` — is **still silent** (WR-23), as is `const g = globalThis` (IN-20). While any shape the requirement's own text enumerates is unenforced, its stated reach exceeds its executed reach — which is precisely the defect this plan closed one level down. CORE-11 was reverted from `[x]` to `[ ]` at commit `e7cc4b6` for exactly this reason; re-checking it one blindness early would repeat the act that revert undid.

**Plan 01-19 owns closing WR-23 and IN-20 and owns flipping the box, against a discharge table.** The reason is recorded ON the requirement in `REQUIREMENTS.md`, in the gate header, and in `WINDOWS.md` entry 22 — not only here — so a reader who checks the ledger finds the open box explained rather than finding an unexplained regression.

## 11. THE GREEN BASELINE, RESTORED AND RECORDED

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  1053 passed (1053)

$ pnpm typecheck   → exit 0
$ pnpm lint        → exit 0
$ pnpm knip        → exit 0

$ pnpm build:backend   → exit 0
$ pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto
```

31 files / 1053 tests (up from 1044 — nine new cases: one grouped `assembledNames` case, five `it.each` spellings, the retitled `constStrings` case, the conditional case and the comma case). Bundle at exactly one specifier.

**Scope checks:**

```
$ git diff --exit-code packages/backend/src/store packages/engine/src tests/ scripts/
SCOPED CLEAN: yes

$ git diff --exit-code 01-01..01-17-PLAN.md 01-VERIFICATION.md 01-REVIEW.md 01-UAT.md
PLAN/VERIFICATION/REVIEW/UAT CLEAN: yes
```

## Files Created/Modified

- `packages/backend/src/outbound-prohibition.spec.ts` — `assembledNames` collector, `keyReceiver` helper, conditional-key branch, comma arm in `unwrap`, mechanism-to-shape table, corrected boundary 2 / residual (a) / residual (b), nine new fixtures, ten retitled fixtures
- `.planning/REQUIREMENTS.md` — CORE-11's third dated correction (append-only; prior text verified byte-identical)
- `.planning/STATE.md` — P9-D3's dated POINTER amendment (append-only; prior text verified byte-identical)
- `.planning/WINDOWS.md` — entries 13 and 20 marked fixed, entry 22 appended (tool-owned, never hand-edited)

## Decisions Made

1. **Comma resolution in `unwrap`, not the key resolver.** Correct at all seven call sites; the narrow placement would have created a new asymmetry. Blast radius measured, not assumed.
2. **A conditional key reports `outbound-send`, not `outbound-unanalysable`.** It hides nothing; calling a fully readable site unreadable is the same overclaim running the other way, and a fixture asserts the distinction explicitly.
3. **`keyReceiver` factored out before the conditional branch was written.** Two copies of "what a readable key is" is how boundary 2 and the code came apart; the conditional needs the same resolution twice, so it had to be one definition.
4. **Residual (b) preserved by re-measurement, not by argument.** The plan forbade reasoning about why the four sites would not fire, and they were not reasoned about — the gate was run and the zero recorded.
5. **All six pre-existing fixture titles in the block were retitled with their mechanisms** (beyond the plan's letter, which required it only of new fixtures). A block where some titles name mechanisms and some do not still permits the substitution that made `:1740-1744` a blocker.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prettier quote-style violations on the new `it(...)` titles**
- **Found during:** Tasks 1 and 2 (`pnpm lint` gate)
- **Issue:** Titles containing escaped double quotes failed `prettier/prettier`, which wants single-quoted strings there. Four occurrences across the two tasks; `pnpm lint` is a plan-level acceptance criterion so this blocked both commits.
- **Fix:** `pnpm exec eslint --fix` on the file. (`npx prettier --write` was tried first and did not resolve them — the repo's prettier runs through the eslint config, and bare `npx` also fails this repo's `devEngines` pnpm pin.)
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** `pnpm lint` exit 0; `pnpm test` 1053 passed
- **Committed in:** `834b9c5`, `90b4309`

**2. [Rule 2 - Missing Critical] WINDOWS.md entry 20 also stated a superseded bound**
- **Found during:** Task 3 (reading the ledger before touching entry 13)
- **Issue:** The plan named entry 13 only. Entry 20 ("WR-19 narrowed from every-non-reducing-key to ASSEMBLED-KEY; a merely dynamic key (`sdk[k]`) is a disclosed residual, not reported") is literally still true but carries exactly the wording that made residual (b)'s justification do double duty — a reader takes "a merely dynamic key" to cover `const k = "req"+"uests"; sdk[k]`, which now reports. Leaving it open would have left a tool-owned ledger row inviting the precise misreading this plan exists to end, in the round convened to make the disclosure surface state ONE bound.
- **Fix:** `gsd-tools windows fixed 20`, with entry 22's description explicitly stating it supersedes entries 13 **and** 20.
- **Files modified:** `.planning/WINDOWS.md` (through the tool)
- **Verification:** `gsd-tools windows status` shows 13 and 20 `fixed`, 22 `open`
- **Committed in:** `7b1f5f1`

**3. [Rule 2 - Missing Critical] A false claim written into the `unwrap` docblock, caught and corrected before commit**
- **Found during:** Task 2 (probing the comma change)
- **Issue:** The first draft of the comma docblock claimed the placement catches `(0, sdk.requests).send(req)` **and** `(0, globalThis.fetch)(url)`. Probing showed `(0, globalThis.fetch)(url)` already reported through another path both before and after — so half the claim credited this change with a catch it did not make. That is CR-08's own defect (a claim reaching further than an execution) being written fresh into the file convened to remove it.
- **Fix:** The docblock now states the three shapes measured with the arm removed and restored, and explicitly names `(0, globalThis.fetch)(url)` as **not** a gain of this change.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** measured with the `CommaToken` arm removed, then restored
- **Committed in:** `90b4309`

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 missing-critical). **Impact on plan:** No scope creep. Deviation 2 widens task 3's ledger reconciliation by one entry for the plan's own stated reason; deviation 3 prevented shipping the exact defect under repair.

## Issues Encountered

**A fixture-parsing hazard that would have silently produced a green-for-the-wrong-reason assertion.** While probing the comma change, `await (0, sdk.requests).send(req)` reported `[]` — apparently a hole in the new rule. It is not: TypeScript parses `await (X)` as a **call** to something named `await`, so `.send` is a member of that call's result and no rule can see a receiver. The unparenthesised `(0, sdk.requests).send(req)` reports correctly. Had this been written into a fixture with `await`, it would have been green for a parsing reason and proved nothing — the same class of defect as `:1740-1744`. Resolved by omitting `await` from the comma fixtures and recording the hazard in `unwrap`'s docblock.

## Known Stubs

None introduced. The residual disclosed here — two hops, a function boundary, a key the walk never saw bound — is a measured bound with fixtures asserting its current `[]`, not a stub, and it is recorded in `.planning/WINDOWS.md` entry 22 scoped to wave 18.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Ready for plan 01-19**, which shares `packages/backend/src/outbound-prohibition.spec.ts` and owns WR-23 (`const e = eval; e(s)`), WR-26 (`isProvablyNumeric`'s docblock) and IN-20 (`const g = globalThis`), plus the CORE-11 checkbox flip against a discharge table.
- **01-19 also owns closing `WINDOWS.md` entry 22** and narrowing this residual in all four disclosure surfaces. Entry 22's own description names 01-19 as its superseder, so the ledger is honest after wave 18 as well as after wave 19.
- **No blockers.** Green baseline restored: 31 files / 1053 tests, typecheck / lint / knip clean, bundle at exactly one specifier (`crypto`).
- **Not touched by this plan, as scoped:** `packages/backend/src/store/*` (plans 01-20, 01-21 own WR-22 and WR-24), `tests/pins.spec.ts` and `scripts/phase1/tracer-e2e.sh` (plan 01-22 owns WR-25 and IN-21).

## Self-Check: PASSED

- `packages/backend/src/outbound-prohibition.spec.ts` — FOUND
- `.planning/REQUIREMENTS.md` — FOUND
- `.planning/STATE.md` — FOUND
- `.planning/WINDOWS.md` — FOUND
- Commit `834b9c5` — FOUND
- Commit `90b4309` — FOUND
- Commit `7b1f5f1` — FOUND

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-24*
