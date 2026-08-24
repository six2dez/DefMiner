---
phase: 01-skeleton-persistence-compatibility
plan: 31
subsystem: testing
tags: [typescript-ast, outbound-gate, static-analysis, core-11, cr-12]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "wave 29's BranchProbe / BRANCH_VOCABULARY / FALSIFIED_HANDOFFS mechanism, and wave 30's operatorLiteralBinding descent"
provides:
  - "ASSIGNING_OPERATORS — a named, frozen module-scope set (`=`, `??=`, `||=`, `&&=`) read by `collect`'s alias-growing branch in place of an inline single-token comparison"
  - "nine CR-12 shapes reporting, each with its own fixture titled for the collector it exercises"
  - "the four `=`/`+=` controls pinned in the same commit as the widening"
  - "eight registry clauses rewritten from their branches with one BranchProbe per operator each names (73 -> 91 probes)"
  - "two FALSIFIED_HANDOFFS entries observed RED and discharged in the same commit as the code (4 -> 2)"
  - "residual (b6): a logical assignment whose TARGET is a MEMBER, opened by measurement while widening"
  - "the inline operator decision named as POPULATION 3 in the coverage guard's own terms"
affects: [wave 32, CORE-11 discharge, outbound-prohibition gate]

actuals:
  tokens: 44700
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "An operator population is a NAMED FROZEN SET read by every branch that asks about it, never an inline token comparison — so two halves of one function cannot disagree about which assignments exist"
    - "A clause naming N operator branches carries N BranchProbes anchored at the SET MEMBERS, so removing ONE operator turns ONE case red BY NAME"
    - "A widening discharges a FALSIFIED_HANDOFFS entry only after the entry has been OBSERVED RED with the widening applied"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/WINDOWS.md

key-decisions:
  - "P31-D1: ASSIGNING_OPERATORS membership settled by MEASUREMENT with both readings implemented and run — the real tree did NOT discriminate (23 files / 0 violations under both); the SHAPES did"
  - "P31-D2: `+=` and the NUMERIC compound assignments are deliberately OUT of the set — `+=` is the assembly spelling with its own branch and numeric guard, the numeric compounds bind a number whatever their right side was"
  - "P31-D3: the three logical-assignment BranchProbes are anchored at the SET MEMBERS rather than at the shared branch opening, so a per-operator mutation is distinguishable BY CASE TITLE from a per-branch one"
  - "P31-D4: wave 29's `isFetchExpression` handoff was RE-HOMED to wave 32 rather than discharged — measured, its probe `(ok && fetch)(url)` is CR-11's shape and it stayed GREEN when the CR-12 widening landed"
  - "P31-D5: the two CR-12 clause corrections landed in TASK 1's commit rather than task 2's, because wave 29's handoff cases go red the instant the widening lands and task 1 must end green"
  - "P31-D6: residual (b6) is DISCLOSED as a measured-silence row rather than folded in — a member target needs a different collector, not a wider operator set"

patterns-established:
  - "Population 3 (an inline branch inside `collect` or `visit`) is named IN THE GUARD'S OWN TERMS beside the branch, with the owner of the exemption-text rewrite named, rather than left as residue"
  - "A hyphenated spelling (`a logical-assignment binding`) in a silence clause is a deliberate, documented choice — the vocabulary phrase names a branch that FIRES and a silence names an ABSENCE"

requirements-completed: [CORE-11]

coverage:
  - id: D1
    description: "A logical-assignment binding grows every collector a plain assignment grows — nine shapes across `??=`, `||=` and `&&=` on a receiver, `globalThis`, `fetch`, `eval`, `navigator`, a string key and an assembled key"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through receiverAliases' LOGICAL-ASSIGNMENT branch: `let r; r ??= sdk.requests; r.send(req)` is the ORDINARY lazy-init spelling of the line above it — CR-12 shape 1 of 9"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#CR-12 shapes 2 of 9 through 9 of 9 (eight further cases, each titled for its collector)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The four `=`/`+=` controls still fire and are pinned in the same commit as the widening"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through receiverAliases' PLAIN-ASSIGNMENT branch: CONTROL 1 of 4 (and CONTROLs 2, 3, 4 of 4)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The widening and narrowing halves of the same statement both read declared operator sets and cannot disagree about which assignments exist"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#branch receiverAliases / a logical assignment / ... ts.SyntaxKind.QuestionQuestionEqualsToken (24 per-operator branch cases across 8 rows)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every clause naming an operator branch carries a probe behind it; a clause naming a branch with no probe is a failing test"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#every BRANCH_VOCABULARY phrase present in a clause has a BRANCH answering it"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#BRANCH_VOCABULARY is NON-EMPTY, every phrase in it occurs in at least one clause, and the hit count is PINNED"
        status: pass
    human_judgment: false
  - id: D5
    description: "Both derived spans are byte-identical to deriveResidual(RESOLVER_REGISTRY) over a 42-row registry"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the block shipped in the gate header equals deriveResidual(RESOLVER_REGISTRY), byte for byte"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte"
        status: pass
    human_judgment: false
  - id: D6
    description: "The real tree is ZERO after the widening, with the four measured-exempt sites quiet by name"
    requirement: "CORE-11"
    verification:
      - kind: integration
        ref: "packages/backend/src/outbound-prohibition.spec.ts#%s reaches no outbound surface (23 files over both SOURCE_ROOTS)"
        status: pass
      - kind: other
        ref: "pnpm build:backend && pnpm check:bundle -> 1 import specifier: crypto"
        status: pass
    human_judgment: false
  - id: D7
    description: "Three mutation directions were watched turning the suite red, separately, the second per-OPERATOR"
    verification: []
    human_judgment: true
    rationale: "Mutation proofs are DESTRUCTIVE and transient by construction — the tree is restored inside the task that plants them, so no assertion can be left behind that proves they ran. The evidence is the pasted RED titles, assertion messages, restore and green re-run in sections 9 and 10 below; a human reading them is the check."

duration: 39 min
completed: 2026-08-24
status: complete
---

# Phase 01 Plan 31: CR-12 — a logical-assignment binding grows every collector a plain assignment grows Summary

**`collect`'s alias-growing branch now reads a named frozen `ASSIGNING_OPERATORS` set instead of an inline `EqualsToken` comparison, so `let r; r ??= sdk.requests; r.send(req)` reports `outbound-send` exactly as its two-character-different twin always did — with all nine CR-12 shapes fixtured per collector, all four controls pinned, eight clauses rewritten from their branches with 24 new per-operator probes, and two falsified handoffs observed RED then discharged in the same commit as the code.**

## Performance

- **Duration:** 39 min
- **Tasks:** 3
- **Files modified:** 4
- **Suite:** 31 files / 1290 tests before → 31 files / **1326 tests** after

## Accomplishments

- The eleven-line disagreement CR-12 named is gone: the widening half and the narrowing half of `collect`'s assignment statement both read declared operator sets.
- Nine silent shapes report; four controls still fire and are now pinned.
- Eight clauses say what their branches do, each with a probe behind every operator they name.
- The inline operator decision is named as POPULATION 3 in the coverage guard's own terms, with WR-33/wave 32 named as owner of the exemption-text rewrite — `RESOLVER_EXEMPTIONS` deliberately untouched.
- One new silence found by measurement while widening, disclosed as residual (b6) rather than folded in.
- One handoff attribution corrected by measurement rather than absorbed.

## Task Commits

1. **Task 1 (tracer): the seam — a named assigning-operator set read by the alias-growing branch** — `ca8ded3` (fix)
2. **Task 2: the remaining eight shapes, four controls pinned, six more clauses corrected** — `2499682` (test)
3. **Task 3: the residual re-measured, both spans, the ledger, and the two pointer histories** — `2dfb9fa` (docs)

---

## 1. PRE-CHANGE MEASUREMENT — all nine silent shapes and all four controls, run BEFORE a line of code was written

Executed through `auditSource` on the tree as wave 30 left it (`cd07fae`):

```
MEASURE|S1 ??=  receiverAliases   |[]
MEASURE|S2 ||=  receiverAliases   |[]
MEASURE|S3 &&=  receiverAliases   |[]
MEASURE|S4 ||=  globalThisAliases |[]
MEASURE|S5 ??=  fetchAliases      |[]
MEASURE|S6 ||=  globalAliases     |[]
MEASURE|S7 ??=  navigatorAliases  |[]
MEASURE|S8 ??=  constStrings      |[]
MEASURE|S9 ??=  assembledNames    |[]
MEASURE|C1 =    receiverAliases   |["outbound-send"]
MEASURE|C2 =    globalThisAliases |["outbound-fetch"]
MEASURE|C3 =    constStrings      |["outbound-send"]
MEASURE|C4 +=   assembledNames    |["outbound-unanalysable"]
REALTREE|23 files|0 violations
REGISTRY_LEN=41 HANDOFFS=4 VOCAB=51
```

Sources, in order: `let r; r ??= sdk.requests; r.send(req)` · the `||=` and `&&=` spellings of the same
· `let g; g ||= globalThis; g.fetch(url)` · `let f; f ??= fetch; f(url)` · `let e; e ||= eval; e(src)` ·
`let n; n ??= navigator; n.sendBeacon(url, data)` · `let k; k ??= "requests"; sdk[k].send(req)` ·
`let k; k ??= "req" + "uests"; sdk[k].send(req)` · then the four controls with `=` / `+=`.

**Agreement with the verifier: complete on all eight shapes it executed and all three controls it
executed.** The ninth shape (the assembled key under `??=`) and the fourth control (`+=`) are this
plan's additions to the verifier's table and both measured as the plan predicted.

## 2. THE SAME THIRTEEN, POST-WIDENING, IN ONE TABLE

| # | Shape | BEFORE | AFTER | Collector |
|---|---|---|---|---|
| S1 | `let r; r ??= sdk.requests; r.send(req)` | `[]` | **`["outbound-send"]`** | receiverAliases |
| S2 | `let r; r \|\|= sdk.requests; r.send(req)` | `[]` | **`["outbound-send"]`** | receiverAliases |
| S3 | `let r; r &&= sdk.requests; r.send(req)` | `[]` | **`["outbound-send"]`** | receiverAliases |
| S4 | `let g; g \|\|= globalThis; g.fetch(url)` | `[]` | **`["outbound-fetch"]`** | globalThisAliases |
| S5 | `let f; f ??= fetch; f(url)` | `[]` | **`["outbound-fetch"]`** | fetchAliases |
| S6 | `let e; e \|\|= eval; e(src)` | `[]` | **`["outbound-dynamic-code"]`** | globalAliases |
| S7 | `let n; n ??= navigator; n.sendBeacon(url, data)` | `[]` | **`["outbound-beacon"]`** | navigatorAliases |
| S8 | `let k; k ??= "requests"; sdk[k].send(req)` | `[]` | **`["outbound-send"]`** | constStrings |
| S9 | `let k; k ??= "req"+"uests"; sdk[k].send(req)` | `[]` | **`["outbound-unanalysable"]`** | assembledNames |
| C1 | `let r; r = sdk.requests; r.send(req)` | `["outbound-send"]` | `["outbound-send"]` | CONTROL — unchanged |
| C2 | `let g; g = globalThis; g.fetch(url)` | `["outbound-fetch"]` | `["outbound-fetch"]` | CONTROL — unchanged |
| C3 | `let k; k = "requests"; sdk[k].send(req)` | `["outbound-send"]` | `["outbound-send"]` | CONTROL — unchanged |
| C4 | `let k = "req"; k += "uests"; sdk[k]` | `["outbound-unanalysable"]` | `["outbound-unanalysable"]` | CONTROL — unchanged |

Every one of the nine now answers what its `=` twin answers, and no control moved.

## 3. THE NAMED OPERATOR SET, AND BOTH READINGS

The declaration as shipped (docblock abridged here to the decision itself; the full text is at
`packages/backend/src/outbound-prohibition.spec.ts`, immediately below `ASSIGNMENT_OPERATORS`):

```ts
const ASSIGNING_OPERATORS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
]);
```

The docblock states, in order: **what it is for** (the population the alias-growing branch reads);
**why it is not `ASSIGNMENT_OPERATORS` itself** (that set is what the NUMERIC arm asks — "did anything
rebind this name" — so it contains `-=`, `*=`, `>>>=`, which bind a NUMBER whatever their right side
was; `+=` is excluded for the opposite reason, being the assembly spelling with its own branch, its own
numeric guard, and the only operator whose result is a function of the OLD value); **what was measured
to settle its membership**, in `RECEIVER_OPERATORS`' docblock shape:

```
READING A, THE THREE LOGICAL ASSIGNMENTS IN
           let r; r ??= sdk.requests; r.send(req)    ["outbound-send"]
           let r; r ||= sdk.requests; r.send(req)    ["outbound-send"]
           let r; r &&= sdk.requests; r.send(req)    ["outbound-send"]
           let g; g ||= globalThis;   g.fetch(url)   ["outbound-fetch"]
           let f; f ??= fetch;        f(url)         ["outbound-fetch"]
           let e; e ||= eval;         e(src)         ["outbound-dynamic-code"]
           let n; n ??= navigator;    n.sendBeacon()  ["outbound-beacon"]
           let k; k ??= "requests";   sdk[k].send()   ["outbound-send"]
           let k; k ??= "req"+"uests"; sdk[k].send()  ["outbound-unanalysable"]
           let i = 0; i ||= 1;        sdk[i].send()   []
           real tree, both roots                      23 files, 0 violations

READING B, THE SINGLE `EqualsToken` TOKEN TEST (what shipped before CR-12)
           every one of the nine shapes above         []
           let i = 0; i ||= 1;        sdk[i].send()   []
           real tree, both roots                      23 files, 0 violations
```

**THE REAL TREE DID NOT DISCRIMINATE.** Both readings are ZERO on it, so nothing about shipped code
chose this and it would be dishonest to claim it did. **THE SHAPES DISCRIMINATED:** `r ??=
sdk.requests` is the ordinary lazy-init spelling of a line this gate already reports on, and reading B
calls it "not a binding". The four `=`/`+=` controls fire under BOTH readings, which is what makes the
nine silences real misses rather than an artefact of the fixture harness.

**WHAT READING A COSTS, PINNED RATHER THAN LEFT IMPLICIT.** `r &&= sdk.requests` assigns only when `r`
is already truthy and `r ??= sdk.requests` only when it is nullish, so at the use site the name MAY
hold something else. Reading A treats a name that MAY be bound to `sdk.requests` as one. That is an
over-approximation, it is the direction every alias set in this file errs in, it is the same call
`RECEIVER_OPERATORS` made for `&&` by measurement, and CR-12 shape 3 of 9 exists so a later narrowing
has to delete an assertion rather than quietly stop firing.

## 4. THE BRANCH DIFF — the inline token test replaced, the body otherwise unchanged

```diff
-      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
+      ASSIGNING_OPERATORS.has(node.operatorToken.kind) &&
       ts.isIdentifier(node.left)
     ) {
```

That single line is the whole behavioural change. The `git diff` of the branch shows nothing else
removed inside it — every added line in that region is comment: the CR-12 note explaining the widening,
and the POPULATION 3 statement (section 8). Every collector the branch feeds — `initializerReceiver`
into `receiverAliases`/`unreadableAliases`, `isFetchExpression` into `fetchAliases`,
`isNavigatorReceiver` into `navigatorAliases`, `aliasedGlobalOf` into `globalAliases`,
`isGlobalReceiver` into `globalThisAliases`, `isAssembledKey` into `assembledNames`, `bindString` into
`constStrings`, and `operatorLiteralBinding` into both — runs for the widened population **by
construction**. No collector was special-cased.

## 5. THE NUMERIC INTERACTION — EXECUTED, NOT ASSUMED

After the widening one statement can both grow an alias set and poison a numeric name. Executed on the
shapes the exemption exists to protect:

```
                            BEFORE   AFTER
N1 accumulator              []       []      let i = 0; i += 1;  sdk[i].send(req)
N2 index composition        []       []      const a = 1; const i = a + 2; sdk[i].send(req)
N3 numeric compound         []       []      let i = 4; i *= 2;  sdk[i].send(req)
N4 ||= numeric              []       []      let i = 0; i ||= 1; sdk[i].send(req)
N5 ??= numeric              []       []      let i = 0; i ??= 1; sdk[i].send(req)
N6 &&= numeric              []       []      let i = 0; i &&= 1; sdk[i].send(req)
```

**No exemption silently stopped applying, and no new one appeared.** The mechanism is that the widened
branch's collectors each reject a numeric right-hand side on their own terms — `isAssembledKey` excludes
provably-numeric expressions on its first line, `bindString` requires a string literal after `unwrap`,
and `initializerReceiver` / `aliasedGlobalOf` / `isGlobalReceiver` answer nothing for `1`. The numeric
arm's own poisoning is unchanged: `i ||= 1` still poisons `i` through the `ASSIGNMENT_OPERATORS &&
!NUMERIC_COMPOUND_ASSIGNMENTS` test eleven lines below, exactly as before.

The four measured-exempt real-tree sites, re-confirmed quiet BY NAME after the widening:

```
EXEMPT|compat.ts (cur)[key]          |site_present=true|reports=[]
EXEMPT|compat.ts ctx[root]           |site_present=true|reports=[]
EXEMPT|observations.ts segments[i]   |site_present=true|reports=[]
EXEMPT|MIGRATIONS index              |site_present=true|reports=[]
```

`site_present` is read from the file's own bytes, so a site that had been renamed or deleted would show
`false` rather than passing as a vacuous quiet.

## 6. ALL EIGHT CORRECTED CLAUSES, BEFORE AND AFTER

Each was read off its branch. The falsified phrases wave 29 preserved are shown byte-identical.

### receiverAliases — read off `collect > receiverAliases.set(node.left.text, kind);` and the widened operator test

BEFORE:
> a name bound to an outbound RECEIVER expression **at a declaration or an assignment** is that receiver everywhere in the file; grown from the LIVE set during the collect pass, so a chain resolves to any depth in DECLARATION order. FALSIFIED 2026-08-24 (CR-12), the phrase this clause used to carry: "a name bound to an outbound RECEIVER expression" without qualification - measured, a logical-assignment binding **grows** nothing

AFTER:
> a name bound to an outbound RECEIVER expression **at a declaration, an assignment or a logical assignment** is that receiver everywhere in the file; grown from the LIVE set during the collect pass, so a chain resolves to any depth in DECLARATION order. FALSIFIED 2026-08-24 (CR-12), the phrase this clause used to carry: "a name bound to an outbound RECEIVER expression" without qualification - measured, a logical-assignment binding **grew** nothing; **that shape is CLOSED 2026-08-24 by ASSIGNING_OPERATORS and the three branches below are its probes, and the phrase STAYS falsified because a parameter, a loop binding, a name bound in another file, a binding written in inverted order and a MEMBER target (o.r ??= sdk.requests) each still grow nothing**

**The preserved phrase `"a name bound to an outbound RECEIVER expression"` is byte-identical.** What
changed beside it is the `- measured, …` TAIL, which was a statement of what the code did on 2026-08-24
and had become false the moment the widening landed — the same deliberate edit wave 30 called out and
for the same reason: the PHRASE is the record of what was believed and stays frozen; the MEASUREMENT
beside it must track the code or it becomes a second false sentence under a marker saying "falsified".

### assembledNames — read off `collect > isAssembledKey(node.right, ...)` reached through the widened test

BEFORE:
> a name the walk WATCHED being assembled - at a declaration, an assignment, **a `+=` compound assignment,** or either binding-pattern spelling - is an UNREADABLE key … FALSIFIED 2026-08-24 (CR-12), the phrase this clause used to carry: "a compound assignment" - measured, the logical-assignment spellings ||=, &&= and ??= **grow** nothing

AFTER:
> a name the walk WATCHED being assembled - at a declaration, an assignment, **a `+=` compound assignment, a logical assignment,** or either binding-pattern spelling - is an UNREADABLE key … FALSIFIED 2026-08-24 (CR-12), the phrase this clause used to carry: "a compound assignment" - measured, the logical-assignment spellings ||=, &&= and ??= **grew** nothing; **those three are CLOSED 2026-08-24 by ASSIGNING_OPERATORS and the three branches below are their probes, and the phrase STAYS falsified because the NUMERIC compound assignments (-=, \*=, >>>= and the rest of NUMERIC_COMPOUND_ASSIGNMENTS) deliberately assemble nothing**

### The other six, in one table (opening clause fragment, before → after)

| Row | Code site read off | BEFORE | AFTER |
|---|---|---|---|
| `constStrings` | `collect > if (ts.isStringLiteralLike(assignedString))`, now reached through the widened test | "…bound at a string-literal declaration, a string-literal assignment **or an operator initializer**" | "…bound at a string-literal declaration, a string-literal assignment, **a logical assignment** or an operator initializer" |
| `literalsOf` | `literalsOf > return constStrings.get(node.text) ?? NO_LITERALS;` — reach inherited entirely from `constStrings` | "…includes every literal **an operator initializer bound**" | "…includes every literal an operator initializer bound **and every literal a logical assignment bound**" |
| `fetchAliases` | `collect > if (isFetchExpression(node.right)) fetchAliases.add(node.left.text);` | "…**at a declaration or an assignment** is the global fetch" | "…**at a declaration, an assignment or a logical assignment** is the global fetch" |
| `navigatorAliases` | `collect > if (isNavigatorReceiver(node.right)) navigatorAliases.add(node.left.text);` | "…**at a declaration or an assignment** is navigator" | "…**at a declaration, an assignment or a logical assignment** is navigator" |
| `globalAliases` | `collect > globalAliases.set(node.left.text, aliasedRight);` | "…at a declaration, an assignment **or the object binding-pattern spelling**" | "…at a declaration, an assignment, **a logical assignment** or the object binding-pattern spelling" |
| `globalThisAliases` | `collect > if (isGlobalReceiver(node.right)) globalThisAliases.add(node.left.text);` | "…**at a declaration or an assignment** is a global receiver" | "…**at a declaration, an assignment or a logical assignment** is a global receiver" |

`QUANTIFIED_CLAUSES` entries for `receiverAliases`, `constStrings` and `literalsOf` were rewritten to
state the NEW measured bound, each naming the widened branch and quoting a probe that was run.

### The per-operator branch probes — 24 new, one per operator per row

Every one anchored at a SET MEMBER rather than at the shared branch opening, so a mutation removing ONE
operator turns ONE case red **by name**:

```
auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.QuestionQuestionEqualsToken,
auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.BarBarEqualsToken,
auditSource > collect > ASSIGNING_OPERATORS.has(node.operatorToken.kind) && > ts.SyntaxKind.AmpersandAmpersandEqualsToken,
```

| Row | Probe (`??=` shown; `\|\|=` and `&&=` identical but for the operator) | Measured |
|---|---|---|
| `receiverAliases` | `let r; r ??= sdk.requests; r.send(req)` | `["outbound-send"]` |
| `assembledNames` | `let k; k ??= "req" + "uests"; sdk[k].send(req)` | `["outbound-unanalysable"]` |
| `constStrings` | `let k; k ??= "requests"; sdk[k].send(req)` | `["outbound-send"]` |
| `literalsOf` | `let k = "harmless"; k ??= "requests"; sdk[k].send(req)` | `["outbound-send"]` |
| `fetchAliases` | `let f; f ??= fetch; f(url)` | `["outbound-fetch"]` |
| `navigatorAliases` | `let n; n ??= navigator; n.sendBeacon(url)` | `["outbound-beacon"]` |
| `globalAliases` | `let e; e ??= eval; e(src)` | `["outbound-dynamic-code"]` |
| `globalThisAliases` | `let g; g ??= globalThis; g.fetch(url)` | `["outbound-fetch"]` |

**`assembledNames`' branch list distinguishes the numeric-guarded `+=` branch from the
logical-assignment branch**, and both are green in the same run — the `+=` branch keeps its own anchor
(`collect > node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken &&`), its own numeric guard and
wave 29's probe, untouched by this plan. That is the branch the verifier deleted to prove WR-32, and it
did NOT appear among the reds of any of this plan's three mutation proofs.

**One BRANCH_VOCABULARY phrase was added: `"a logical assignment"`,** spelled so it does NOT contain
`"an assignment"` as a substring — a phrase that did would make every clause naming the logical spelling
also claim the plain one, and the coverage guard would be satisfied by the wrong probe. A clause that
means both says both, and then owes a probe for each; all eight do.

## 7. THE HANDOFF WAS OBSERVED DOING ITS JOB

With the widening applied and wave 29's entries **still present**, `pnpm exec vitest run
packages/backend/src/outbound-prohibition.spec.ts` reported:

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  … > handoff assembledNames / CR-12 / wave 31 — the falsified phrase is STILL false, measured against the code as it stands
AssertionError: handoff `assembledNames` (CR-12) records that the phrase "a compound assignment" is FALSE
of this probe, and that the probe answers [] while the handoff is OPEN. It no longer does. If wave 31
widened the code, that is the widening working — now RE-ADD the phrase to row `assembledNames`'s clause
WITH its branch probe, and DELETE this handoff entry and its pin, in this same commit. This case exists
because the vocabulary guard cannot see a widening that never re-adds its phrase.
: expected [ 'outbound-unanalysable' ] to deeply equal []

 FAIL  … > handoff receiverAliases / CR-12 / wave 31 — the falsified phrase is STILL false, measured against the code as it stands
AssertionError: handoff `receiverAliases` (CR-12) records that the phrase "a name bound to an outbound
RECEIVER expression" is FALSE of this probe, and that the probe answers [] while the handoff is OPEN. It
no longer does. …
: expected [ 'outbound-send' ] to deeply equal []

 Test Files  1 failed (1)
      Tests  2 failed | 351 passed (353)
```

Both entries were then deleted **and the pin decremented 4 → 2 in the same commit as the code**
(`ca8ded3`). The still-falsified case is green with the entries gone, and both remaining entries are
wave 32's. Wave 29's vocabulary-coverage guard passes for all eight rows:

```
✓ BRANCH_VOCABULARY is NON-EMPTY, every phrase in it occurs in at least one clause, and the hit count is PINNED
✓ every BRANCH_VOCABULARY phrase present in a clause has a BRANCH answering it
✓ every branch anchor still EXISTS, AT A DECLARATION OR A BRANCH OPENING, in this file
✓ FALSIFIED_HANDOFFS is well-formed and its count is PINNED — expected to FALL to zero
```

Pins moved, each in the same commit as the wording that moved it:

```
BRANCH_VOCABULARY clause-phrase hits   66  ->  68 (task 1)  ->  74 (task 2)
registry branch probes                 67  ->  73 (task 1)  ->  91 (task 2)
rows carrying at least one branch       33  ->  33          ->  33  (unchanged)
FALSIFIED_HANDOFFS                       4  ->   2 (task 1)
RESOLVER_REGISTRY rows                  41  ->  41          ->  42 (task 3)
```

## 8. THE HAND-WRITTEN SURFACES, THE POPULATION-3 STATEMENT, AND WHAT WAS LEFT ALONE

### Boundary 2's binding-shape enumeration, corrected by hand

BEFORE (ALIAS FAMILIES paragraph):
> Grown from the LIVE set **at both the declaration and the assignment branch**, never removed from.

AFTER: the same sentence, followed by a dated correction naming what was wrong with it — that "the
assignment branch" meant ONE OPERATOR because the branch was gated on an inline `EqualsToken`
comparison; that the numeric arm eleven lines below read `ASSIGNMENT_OPERATORS` and named `x ||=
sdk.requests` in its own comment; that the branches are now NAMED rather than quantified over and the
assignment branch reads `ASSIGNING_OPERATORS`; that `+=` and the numeric compounds are deliberately out;
and what was MEASURED still outside the branch in this same session (a parameter, a loop binding, a
function boundary, a cross-file binding, an inverted binding order, and a member target).

The STRING MAPS paragraph gained the parallel note: the branch COUNT is unchanged at three and its
POPULATION grew, because the string-literal ASSIGNMENT branch now reads the same set.

**NOTHING MECHANICAL CHECKS EITHER PARAGRAPH.** The byte comparison reaches the generated span and
`REQUIREMENTS.md` and no further, so both were corrected BY HAND in the same commit as the registry, and
where the two disagree the derived block is authoritative and the paragraph is the defect. That sentence
is in the file, not only here.

### The mechanism table's new rows (its existing three-column shape, indexed by SPELLING)

```
SPELLING (in receiver-key position)      RESOLVED BY          REPORTS
-------------------------------------    -----------------    ---------------------
let r; r ??= sdk.requests; r.send(req)   receiverAliases via  outbound-send
  (and the `||=` and `&&=` spellings)      ASSIGNING_OPERATORS
let g; g ??= globalThis; g.fetch(url)    globalThisAliases    outbound-fetch
  (likewise `f ??= fetch`, `e ??= eval`,   via the same set    (fetch / dynamic-code /
   `n ??= navigator`)                                           beacon respectively)
let k; k ??= "requests"; sdk[k]          constStrings'        outbound-send
                                           ASSIGNMENT WRITE,
                                           now operator-wide
let k; k ??= "req"+"uests"; sdk[k]       assembledNames'      outbound-unanalysable
                                           ASSIGNMENT branch
let i = 0; i ||= 1; sdk[i]               isProvablyNumeric    [] — an index, not a name
```

### POPULATION 3, named in the coverage guard's own terms, beside the branch

Shipped as a comment directly above the widened test:

> THIS OPERATOR TEST IS POPULATION 3 IN THE COVERAGE GUARD'S OWN TERMS — "an inline branch in `collect`
> or `visit`" — and it is named here rather than left to be rediscovered. `enumerateResolverPopulations`
> reads DECLARED resolvers and `RESOLVER_EXEMPTIONS`; it enumerates neither `collect` nor any branch
> inside it, so this decision is UNREGISTERED. What covers it instead is the fixtures below and the
> per-operator `BranchProbe`s on the eight clauses it feeds. Rewriting `RESOLVER_EXEMPTIONS`' `collect`
> entry to say the same thing is WR-33's finding and wave 32 owns it; a plan that silently absorbed
> another plan's finding would make both harder to verify.

### `RESOLVER_EXEMPTIONS` is UNCHANGED by this plan

```
$ git diff cd07fae HEAD -- packages/backend/src/outbound-prohibition.spec.ts | grep -E "^[+-].*RESOLVER_EXEMPTIONS"
+    // resolvers and `RESOLVER_EXEMPTIONS`; it enumerates neither `collect` nor any
+    // clauses it feeds. Rewriting `RESOLVER_EXEMPTIONS`' `collect` entry to say
```

Two added COMMENT lines, both inside the population-3 statement above, both naming WR-33 and wave 32 as
owner. **The declaration itself and every one of its entries are byte-identical.** WR-33's two false
exemption reasons remain wave 32's, deliberately.

## 9. EVERY MEASURED SILENCE ROW, RE-EXECUTED AGAINST THE WIDENED WALK

One line per row, probe and counter-probe both run:

```
SILENCE|silence-two-hop-key                    |probe=[] counter=["outbound-send"]
SILENCE|silence-function-boundary              |probe=[] counter=["outbound-send"]
SILENCE|silence-parameter-key                  |probe=[] counter=["outbound-send"]
SILENCE|silence-loop-binding-key               |probe=[] counter=["outbound-send"]
SILENCE|silence-destructured-plain-literal-key |probe=[] counter=["outbound-unanalysable"]
SILENCE|silence-destructured-operator-key      |probe=[] counter=["outbound-send"]
SILENCE|silence-cross-file-key                 |probe=[] counter=["outbound-send"]
SILENCE|silence-inverted-binding-order         |probe=[] counter=["outbound-fetch"]
SILENCE|silence-operator-around-global-receiver|probe=[] counter=["outbound-send"]
```

**No row converged. No row was removed.** Every one still measures a silence, and the vacuity rule
(probe and counter-probe must differ) holds for all nine.

### ONE NEW ROW, opened by MEASUREMENT while widening — residual (b6)

```
o.r ??= sdk.requests;  o.r.send(req)      ->  []                 <- SILENT
let r; r ??= sdk.requests; r.send(req)    ->  ["outbound-send"]  <- the counter
```

`silence-logical-assignment-member-target`. The widened branch reads `ASSIGNING_OPERATORS` for the
OPERATOR and still requires `ts.isIdentifier(node.left)` for the TARGET. **The plain-assignment spelling
`o.r = sdk.requests` was silent before this plan too and had no row either** — so this is a shape the
widening made VISIBLE, not a cost the widening introduced. Disclosed rather than folded in, on (b2)'s
and (b3)'s precedent: growing an alias keyed on a member path is a different collector, not a wider
operator set, and it needs its own real-tree measurement. Registry 41 → 42.

Its clause spells the shape hyphenated — `a logical-assignment binding` — and that is a documented
choice, not an evasion of the coverage guard: the vocabulary phrase `a logical assignment` names a
branch that FIRES, this clause names an ABSENCE at that branch, and a `BranchProbe` answering the phrase
would have to probe a shape the row is not about. The row is bound to the code by its own probe and
counter-probe, executed like every other measured silence. The reasoning is in the file beside the row.

The remaining shapes were run and are each an existing row or explicitly not claimed:

```
R1 parameter               []   -> silence-parameter-key
R2 loop binding            []   -> silence-loop-binding-key
R3 function boundary       []   -> silence-function-boundary
R4 second hop of key       []   -> silence-two-hop-key
R5 destructure of logical  []   -> NOT CLAIMED as its own row: two hops plus a destructure,
                                   already inside silence-two-hop-key's bound
R6 operator around global  []   -> silence-operator-around-global-receiver (CR-11, wave 32)
R7 operator around fetch   []   -> the isFetchExpression handoff (see discrepancy 1)
R8 inverted binding order  []   -> silence-inverted-binding-order
R9 ??= on member target    []   -> NEW: silence-logical-assignment-member-target, residual (b6)
R10 ??= then +=            ["outbound-unanalysable"]  -> NOT SILENT; the `+=` branch takes it
```

**No sentence in the residual names a bound that was not run in this session.**

## 10. THE THREE MUTATION PROOFS — EXECUTED SEPARATELY, NEVER COMBINED

Run order: **proof 1 (after task 1's commit) → proof 2 (after task 2's commit) → proof 3**. Each
mutation was planted, run, recorded, restored, and the tree confirmed clean with `git diff --exit-code`
before the next was planted. Every task was **committed before its mutation was planted**, so a restore
to HEAD could not destroy uncommitted work.

| # | Mutation | Tests that went RED | Assertion message carried | Restore | Re-run |
|---|---|---|---|---|---|
| 1 | The branch narrowed back to `node.operatorToken.kind === ts.SyntaxKind.EqualsToken` | **7** — `through receiverAliases' LOGICAL-ASSIGNMENT branch … CR-12 shape 1 of 9`, plus **all six** `branch receiverAliases / a logical assignment / …` and `branch assembledNames / a logical assignment / …` per-operator cases | "registry row \`receiverAliases\`'s clause names \"a logical assignment\" and says the branch at \`… QuestionQuestionEqualsToken,\` reports [outbound-send]. It does not. Either that branch was DELETED … The row's own probe can stay green through this: that is precisely why this case exists.: expected [] to deeply equal [ 'outbound-send' ]" | `git diff --exit-code` clean | 357 passed |
| 2 | ONE operator removed — `BarBarEqualsToken` only, `??=` and `&&=` left in | **11**, and **every one of them `||=`**: three fixtures (`CR-12 shape 2 of 9`, `shape 4 of 9`, `shape 6 of 9`) and **all eight** `branch <row> / a logical assignment / … BarBarEqualsToken,` cases across `receiverAliases`, `assembledNames`, `constStrings`, `literalsOf`, `fetchAliases`, `navigatorAliases`, `globalAliases`, `globalThisAliases`. The sixteen `??=` and `&&=` branch cases and their six fixtures **stayed green** | "registry row \`receiverAliases\`'s clause names \"a logical assignment\" and says the branch at \`… BarBarEqualsToken,\` reports [outbound-send]. It does not…: expected [] to deeply equal [ 'outbound-send' ]" — and, on the fixtures, "expected [] to include 'outbound-send'" / "'outbound-fetch'" / "'outbound-dynamic-code'" | `git diff --exit-code` clean | 387 passed |
| 3 | ONE clause's `BranchProbe` entries removed — `navigatorAliases`' three, clause left naming the branch | **4** — the vocabulary-coverage guard, the branch-count pin, and both byte comparisons | "clause(s) name a branch that NO branch probe answers: **navigatorAliases names \"a logical assignment\"**. There are exactly two ways out and softening the clause silently is neither. EITHER write the BranchProbe — read it off the branch, run it, record what it measured — OR stop the clause naming the branch, which means correcting it to its MEASURED reach, preserving the falsified phrase with a dated marker and its finding id, and handing the widening on as a FALSIFIED_HANDOFFS entry.: expected [ Array(1) ] to deeply equal []" — plus "the registry carries 88 branch probes. A SHRINKING enumeration is the failure this pin exists to catch.: expected 88 to be 91" | `git diff --exit-code` clean | 387 passed |

**Proof 2 is what makes the widening provable per-OPERATOR rather than per-SET.** A set-level proof
would pass with two of three operators broken; this one names the broken operator in eleven case titles
and leaves the other two green in twenty-two.

**Proof 1 is at ROW granularity, not fixture granularity** — six of its seven reds are registry branch
cases naming `receiverAliases` and `assembledNames` by row id. The hand-written fixture is the seventh.

**The `PlusEqualsToken` branch probe wave 29 attached is undisturbed** and green in every one of the
three runs: it appears in none of the red lists above, and `pnpm test` finished at 1326 passed after
each restore.

## 11. TWO REAL-TREE ZEROS

```
after task 1's widening   REALTREE|23 files|0 violations
after task 2's fixtures   REALTREE|23 files|0 violations
```

with the four measured-exempt sites named and confirmed quiet individually in section 5 both times.
A widening measured only against fixtures is a widening whose cost on shipped code is unknown; this one
costs nothing on the shipped tree, and that is a MEASUREMENT rather than an expectation.

## 12. BOTH SPANS, SIDE BY SIDE

```
packages/backend/src/outbound-prohibition.spec.ts  sha256=ae8f7f8f66204aa2a58df892a27d66da3963788577815a8a2f6bcd651e0f1c05  lines=438  entries=42
.planning/REQUIREMENTS.md                          sha256=ae8f7f8f66204aa2a58df892a27d66da3963788577815a8a2f6bcd651e0f1c05  lines=438  entries=42
```

Identical hash, identical line count, entry count equal to `RESOLVER_REGISTRY.length` (42). Both byte
comparisons green:

```
✓ the block shipped in the gate header equals deriveResidual(RESOLVER_REGISTRY), byte for byte
✓ the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte
✓ the shipped block carries exactly ONE entry per registry row — a truncated block FAILS
✓ the ledger's block carries exactly ONE entry per registry row — a truncated ledger block FAILS
```

Wave 29's corrected preamble and its clause-to-branch limits point are **unchanged** — no diff line in
this plan touches either.

## 13. `REQUIREMENTS.md`, `STATE.md`, `WINDOWS.md`

### The dated CORE-11 correction, above the BEGIN sentinel

Added in the convention plans 01-19, 01-23, 01-28 and 01-30 established, with four headed paragraphs —
**WHAT WAS FOUND**, **WHAT WAS CLOSED**, **WHAT REMAINS** (written from what this session measured), and:

> **NOTHING LEAKED AND NOTHING LEAKS NOW, STATED PLAINLY AND NOT INFLATED.** CR-12 is PROSPECTIVE
> blindness in a TEST-ONLY gate. No outbound call exists in any non-spec source under either root; the
> gate runs green over the real tree — 23 files, ZERO violations, re-measured after the widening — and
> `pnpm check:bundle` reports the shipped bundle's entire import set as one specifier, `crypto`. What
> CR-12 was is a lazy-init line somebody writes next year that this gate would have stayed green on.

**Neither sentinel marker's text is quoted in that prose** — confirmed by the suite staying green (the
guard reads the file's own bytes for those lines, and quoting one turns the extraction red).

**CORE-11's box is exactly as wave 28 left it, and wave 32 owns it:**

```
$ git diff cd07fae HEAD -- .planning/REQUIREMENTS.md | grep -E "^[+-]- \[[ x]\] \*\*CORE-11\*\*"
(no output — the line is untouched)

$ grep -nE '^- \[[ x]\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
46:- [ ] **CORE-11**: …
```

### Append-never-rewrite, verified POSITIVELY

```
$ for a in <each prior anchor>; do printf "%3s  %s\n" "$(grep -cF "$a" .planning/REQUIREMENTS.md)" "$a"; done
  1  INSTALLED 2026-08-24 BY PLAN 01-27
  1  CLOSED AT THE SEAM, 2026-08-24 BY PLAN 01-30
  1  CLOSED AT THE SEAM, 2026-08-24 BY PLAN 01-31
  1  WHICH HALF OF THIS ENTRY EACH RULE APPLIES TO
  1  THE LIMITS OF CLAUSE-TO-BRANCH BINDING, IN ONE SENTENCE, ADDED 2026-08-24 (wave 29, WR-32)
  1  WHY THIS ENTRY CARRIES THE TEXT AND NOT A POINTER

$ for a in <each P9-D3 amendment opening>; do printf "%3s  %s\n" "$(grep -oF "$a" .planning/STATE.md | wc -l)" "$a"; done
  1  POINTER AMENDMENT 2026-08-24 (gap-closure round 4, plan 01-18 task 3)
  1  SECOND POINTER AMENDMENT 2026-08-24 (gap-closure round 4, plan 01-19 task 3)
  1  THIRD POINTER AMENDMENT 2026-08-24 (gap-closure round 5, plan 01-23 task 3)
  1  FOURTH POINTER AMENDMENT 2026-08-24 (gap-closure round 5, plan 01-27 task 3)
  1  FIFTH POINTER AMENDMENT 2026-08-24 (gap-closure round 5, plan 01-28 task 2)
  1  SIXTH POINTER AMENDMENT 2026-08-24 (gap-closure round 6, plan 01-29 task 3)
  1  SEVENTH POINTER AMENDMENT 2026-08-24 (gap-closure round 6, plan 01-30 task 3)
  1  EIGHTH POINTER AMENDMENT 2026-08-24 (gap-closure round 6, plan 01-31 task 3)
```

The `STATE.md` diff for this plan is **one line changed** — the P9-D3 entry, appended to. Not one word of
the seven prior amendments was rewritten.

The eighth amendment names the widening, the named operator set, the eight corrected clauses and the
enforcing tests **by test title**, states no bound of its own, points at the derived block for the
residual, and restates:

> THAT THE POINTER-NOT-A-BOUND RULE HAS NO MECHANICAL CHECK IS RESTATED HERE … the byte comparison
> reaches the gate header and `REQUIREMENTS.md` and NO FURTHER, so nothing fails if a future amendment
> copies a bound into this line.

### `WINDOWS.md` — through the tool, never hand-edited

```
$ gsd-tools windows status
open_count=19 fixed_count=16 total_count=35    (before)

$ gsd-tools windows fixed 35
{ "ok": true, … "open_count": 18, "fixed_count": 17, "total_count": 35 … }

$ gsd-tools windows append --kind deviation --phase 01 \
    --file packages/backend/src/outbound-prohibition.spec.ts --description "<pointer>"
{ "ok": true, … "open_count": 19, "fixed_count": 17, "total_count": 36 … }

$ gsd-tools windows status
open_count=19 fixed_count=17 total_count=36
gate-file entries: 14, open: 1
  OPEN id=36 kind=deviation : POINTER, NOT A BOUND (plan 01-31, gap-closure round 6, CR-12). SUPERSEDES ENTRY 35…
```

**Exactly one open entry on this gate file.** The tool did not refuse; no discrepancy to record. The
diff is consistent with tool output — frontmatter counters (`fixed_count 16→17`, `total_count 35→36`,
`last_updated`) and the JSON block updated together, 18 insertions / 5 deletions, no hand edit.

## 14. THE FINAL GATE SET

```
$ pnpm test
 Test Files  31 passed (31)
      Tests  1326 passed (1326)

$ pnpm typecheck   -> exit 0
$ pnpm lint        -> exit 0
$ pnpm knip        -> exit 0

$ pnpm build:backend
ESM packages/backend/dist/index.js 61.74 KB
ESM ⚡️ Build success in 16ms
[*] Plugin package built successfully   -> exit 0

$ pnpm check:bundle
packages/backend/dist/index.js: 1 import specifier(s): crypto   -> exit 0
```

Baseline entering this plan was 31 files / **1290** tests. **1326** after — 36 new cases and no file
count change, which is what a plan that adds fixtures to an existing gate should produce.

```
$ git diff --exit-code -- 01-01-PLAN.md … 01-30-PLAN.md 01-VERIFICATION.md 01-REVIEW.md 01-UAT.md
PLANS_UNTOUCHED_EXIT=0
```

## 15. PREDICTION-VS-MEASUREMENT DISCREPANCIES

Three, in the shape `01-27-SUMMARY.md` used. In every case the measurement won.

| # | The plan (or a prior wave) predicted | What was MEASURED | What was done |
|---|---|---|---|
| 1 | Wave 29 recorded THREE `FALSIFIED_HANDOFFS` entries as wave 31's — `assembledNames`, `receiverAliases` and **`isFetchExpression`** — and predicted the pin would fall from 4 to **1** | **Only TWO went red when the CR-12 widening landed.** `isFetchExpression`'s probe is `(ok && fetch)(url)` — an OPERATOR WRAPPING the bare global, which is **CR-11's** shape one function over, not a logical-assignment binding. It stayed GREEN, exactly as it must, because this plan does not touch `operatorReceiver` | The entry was **RE-HOMED, not discharged**: `wave: "31"` → `wave: "32"`, with the reason recorded in a comment beside it and the pin landing at **2**, not 1. `finding` was left at `CR-12` deliberately — that is what the row's own dated FALSIFIED marker carries, the well-formedness guard reads the two against each other, and rewriting a shipped falsification marker would erase the record of what was believed on the day it was written. Wave 32 now owns both remaining entries |
| 2 | The plan assigns `receiverAliases`' correction to task 1 and the other **seven** clauses (including `assembledNames`) to task 2 | Wave 29's `handoff … — the falsified phrase is STILL false` case for **`assembledNames`** goes RED the instant the widening lands, and task 1's own acceptance criteria require `pnpm test` to pass with zero failures. The two requirements are incompatible as written — the same contradiction wave 30 recorded as its deviation 1 | `assembledNames`' correction, its three branch probes and its handoff deletion landed in **task 1's** commit, satisfying the plan's STRONGER requirement that they land in the same commit as the code. Task 2 owns the other **six**. The handoff was RUN and observed RED **before** anything was deleted (section 7) |
| 3 | The plan's `<action>` lists the residual shapes to re-measure and does not name a member target | `o.r ??= sdk.requests; o.r.send(req)` is **SILENT**, found by running shapes rather than reading lists. The widened branch still requires `ts.isIdentifier(node.left)`. The plain-assignment spelling `o.r = sdk.requests` was silent before this plan too and had no row either | A new `measured-silence` row, `silence-logical-assignment-member-target`, with an executed probe and counter-probe, plus residual paragraph **(b6)** in the hand-written header. Registry 41 → 42. Disclosed rather than folded in, on (b2)'s and (b3)'s precedent |

## Decisions Made

- **P31-D1** — `ASSIGNING_OPERATORS`' membership settled by MEASUREMENT, both readings implemented and run. The real tree did not discriminate; the shapes did, and the docblock says so rather than claiming the tree chose it.
- **P31-D2** — `+=` and the NUMERIC compound assignments are deliberately OUT, and the docblock states why for each: `+=` is the assembly spelling with its own branch and its own numeric guard and is the one operator whose result is a function of the OLD value; the numeric compounds bind a number whatever their right side was, so growing an alias from them would be growing it from an expression the assignment does not store.
- **P31-D3** — the three logical-assignment `BranchProbe`s are anchored at the SET MEMBERS rather than at the shared branch opening. Three probes sharing one anchor render three cases with the SAME title, and a mutation removing ONE operator could not then be told apart from one removing the branch.
- **P31-D4** — wave 29's `isFetchExpression` handoff was RE-HOMED to wave 32 by measurement rather than discharged or silently left. See discrepancy 1.
- **P31-D5** — the two CR-12 clause corrections landed in task 1's commit. See discrepancy 2.
- **P31-D6** — residual (b6) is a DISCLOSED measured-silence row, not a fold-in: growing an alias keyed on a member path is a different collector, not a wider operator set, and it needs its own real-tree measurement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `assembledNames`' correction had to land in Task 1, not Task 2**

- **Found during:** Task 1, immediately after the widening
- **Issue:** Wave 29's handoff case for `assembledNames` goes RED the instant the widening lands, and Task 1's acceptance criteria require `pnpm test` green with zero failures. Incompatible as written.
- **Fix:** The clause correction, its three branch probes, the handoff deletion and the pin decrement landed in Task 1's commit — which satisfies the plan's stronger requirement that they land in the same commit as the code. The handoff was RUN and observed RED before the entries were deleted, and both assertion messages are pasted in section 7.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`, `.planning/REQUIREMENTS.md`
- **Verification:** section 7's RED output; `FALSIFIED_HANDOFFS` pinned at 2; `pnpm test` green at every task boundary
- **Committed in:** `ca8ded3`

**2. [Rule 1 - Bug] Wave 29 handed `isFetchExpression` to the wrong wave**

- **Found during:** Task 1, by running the handoff cases with the widening applied
- **Issue:** `FALSIFIED_HANDOFFS` recorded `isFetchExpression` as CR-12 / wave 31. Its probe `(ok && fetch)(url)` is CR-11's operator-around-a-global shape, which the CR-12 widening does not and cannot reach. Discharging it here would have required either a widening outside this plan's scope or a false claim.
- **Fix:** `wave` corrected `"31"` → `"32"`, with the measurement and the reasoning recorded beside the entry. `finding` deliberately left at `CR-12`, because the row's own dated FALSIFIED marker carries that id and the well-formedness guard reads the two against each other.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** exactly TWO of four handoff cases went red under the widening; `isFetchExpression`'s stayed green; the pin lands at 2 and the well-formedness guard passes
- **Committed in:** `ca8ded3`

**3. [Rule 2 - Missing Critical] One silent shape found by measurement that no artifact named**

- **Found during:** Task 3, by running shapes rather than reading lists
- **Issue:** A logical assignment whose TARGET is a MEMBER (`o.r ??= sdk.requests`) is silent — the branch still requires an IDENTIFIER on the left. No residual row named it, and the plain-assignment spelling had been silent since the branch was written.
- **Fix:** A new `measured-silence` row with an executed probe and counter-probe, plus residual paragraph (b6) in the hand-written header. Registry 41 → 42, both spans regenerated.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`, `.planning/REQUIREMENTS.md`
- **Verification:** probe `[]`, counter `["outbound-send"]`, both executed; entry count 42 in both spans
- **Committed in:** `2dfb9fa`

**4. [Rule 3 - Blocking] Ten prettier/eslint violations in the generated branch-probe literals**

- **Found during:** Task 2, by `pnpm lint`
- **Issue:** The probe strings were emitted with double quotes containing escaped double quotes where prettier requires single-quoted literals, and one `no-useless-escape` in a `QUANTIFIED_CLAUSES` bound.
- **Fix:** `eslint --fix` for the eight formatting errors; the escape corrected by hand. No behaviour change — the byte comparisons and all 387 gate cases stayed green through both.
- **Committed in:** `2499682`

---

**Total deviations:** 4 auto-fixed (2 blocking, 1 bug, 1 missing critical)
**Impact on plan:** No scope creep. Deviation 1 resolves a contradiction inside the plan's own task
split while preserving both of its substantive requirements. Deviations 2 and 3 are the measurement
discipline working exactly as this round demands — a prior wave's prediction and this plan's own
residual list were each corrected by execution rather than absorbed. Deviation 4 is mechanical.

## Issues Encountered

- **The `git status` snapshot supplied at session start named a stale HEAD (`401ead1`, seven commits back).** Two verification greps were run against it before the discrepancy was caught, producing a false "CORE-11's box was flipped" reading. Re-run against the true pre-plan HEAD (`cd07fae`), the box is untouched — `[ ]` before and `[ ]` after. Recorded rather than quietly fixed, because a comparison against the wrong baseline is exactly the class of error this round is held to catching by execution.
- **The repository has no active git hooks** (`.git/hooks` contains only samples and `core.hooksPath` is unset), so nothing was bypassed and nothing ran. The full gate set was executed by hand at every task boundary instead.
- `.planning/config.json` carries an unrelated pre-existing modification from before this plan started. Left untouched — out of scope.

## Known Stubs

None. No hardcoded empty value, placeholder string, `TODO`, `FIXME` or skipped test was introduced by
this plan. Every fixture added is executed and every clause added carries a probe that was run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for 01-32 (wave 32).** What wave 32 inherits, stated precisely:

- **`FALSIFIED_HANDOFFS` carries exactly 2 entries and BOTH are wave 32's:** `silence-operator-around-global-receiver` (CR-11, as wave 29 recorded) and `isFetchExpression` (re-homed here by measurement — same CR-11 shape, one function over). Discharging both takes the pin to zero, which is its designed final value.
- **CR-11 (the operator around a GLOBAL receiver), WR-37 (the nested destructure) and WR-33 (the two false `RESOLVER_EXEMPTIONS` reasons) are all untouched by this plan.** `RESOLVER_EXEMPTIONS`' declaration is byte-identical and the population-3 statement names WR-33 and wave 32 as the owner of its rewrite.
- **CORE-11's box is `[ ]`**, exactly as wave 28 left it. Wave 32 owns the flip and owns the discharge table it is flipped against; four of that table's eight rows now read off this widening.
- **Opened by this plan and belonging to nobody's wave yet:** residual (b6), `silence-logical-assignment-member-target`. Closing it means growing an alias keyed on a member path — a different collector, not a wider operator set — and needs its own real-tree measurement, exactly as IN-26 did for the plain-literal twin.

## Self-Check: PASSED

Files claimed modified, verified present on disk:

```
FOUND: packages/backend/src/outbound-prohibition.spec.ts
FOUND: .planning/REQUIREMENTS.md
FOUND: .planning/STATE.md
FOUND: .planning/WINDOWS.md
```

Commits claimed, verified in `git log`:

```
FOUND: ca8ded3  fix(01-31): the alias-growing branch reads a named assigning-operator set
FOUND: 2499682  test(01-31): the remaining eight CR-12 shapes, the four controls pinned, six clauses corrected
FOUND: 2dfb9fa  docs(01-31): the residual re-measured, both spans, the ledger, and the two pointer histories
```

Plan-level verification items re-run at close: `pnpm test` 31 files / 1326 tests, zero failures;
`pnpm typecheck`, `pnpm lint`, `pnpm knip` all exit 0; `pnpm build:backend && pnpm check:bundle` reports
exactly one import specifier, `crypto`; both derived spans byte-identical at 42 entries; prior plans and
`01-VERIFICATION.md` / `01-REVIEW.md` / `01-UAT.md` clean under `git diff --exit-code`.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-24*
