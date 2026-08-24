---
phase: 01-skeleton-persistence-compatibility
plan: 30
subsystem: testing
tags: [outbound-gate, core-11, cr-13, operator-descent, derived-residual, mutation-testing, typescript-ast]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "the derived residual and clause-to-branch binding — RESOLVER_REGISTRY, deriveResidual, the two byte-compared surfaces, BranchProbe/BRANCH_VOCABULARY/FALSIFIED_HANDOFFS (waves 27, 28, 29)"
provides:
  - "`operatorLiteralBinding` — the literal descent over an operator INITIALIZER, built on `operatorOperands` as its SECOND CONSUMER, wired into BOTH of `collect`'s identifier branches"
  - "CR-13 closed: a receiver KEY bound to a conditional, `??`, `||` or `&&` initializer now reports, in the declaration AND the assignment spelling"
  - "the unreadable-operand rule SETTLED BY MEASUREMENT over two implemented readings, with the rejected reading recorded in the docblock"
  - "`constStrings` and `literalsOf` rewritten FROM THE CODE with a `BranchProbe` each; both wave-30 `FALSIFIED_HANDOFFS` entries discharged, pin 6 -> 4"
  - "two NEW measured-silence rows opened by measurement while widening: `silence-destructured-operator-key` and `silence-cross-file-key`"
  - "the hand-written header brought level with the code — boundary 2's per-family sentence and the receiver-resolution list, plus three mechanism-table rows"
affects: [wave-31-CR-12, wave-32-CR-11-and-CORE-11]

actuals:
  tokens: 71000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A second CONSUMER of a separated definition, never a second copy: `operatorOperands` now serves two descents that differ only in what they do with the operands"
    - "A widening's over-approximation rule read off the TWIN SITE it is meant to match, not off the review's sketch — both readings implemented, run, and the rejected one recorded in the docblock in `RECEIVER_OPERATORS`' shape"
    - "A discharging wave watches the handoff go RED before deleting it — free evidence available only at that exact moment"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/WINDOWS.md

key-decisions:
  - "The unreadable-operand arm is `isAssembledKey(operand) || assembledNames.has(operand)` — `keyReceiver`'s own two UNREADABLE branches — NOT the review's `any operand with no literal`, which was implemented, measured, and rejected on three shapes plus the `??` requirement"
  - "The two falsified clauses were corrected in TASK 1 rather than task 2, because the widening turns wave 29's handoff case RED the instant it lands and task 1's own acceptance criteria require a green suite"
  - "`an operator initializer` (lower case) is the binding-shape phrase for `constStrings`/`literalsOf`; the descent's own clause says `an operator-shaped INITIALIZER` so no phrase binds each row to the other's branch"
  - "A destructured OPERATOR literal was found silent while widening and is DISCLOSED as a row rather than folded in — (b2)'s precedent, because widening `constStrings` through binding patterns needs its own real-tree measurement"
  - "A key bound to a FUNCTION RETURN is NOT silent — measured `outbound-unanalysable` — and the plan's prediction was corrected rather than the measurement smoothed"

patterns-established:
  - "A new resolver's clause names its own branches; a COLLECTOR's clause names the binding SHAPE that feeds it. Two vocabularies, one per level, so neither row's guard answers for the other"
  - "Commit the task BEFORE planting its mutations — `git checkout --` restores to HEAD, so the restore contract only holds on a committed tree (carried forward from wave 29's deviation 1)"

requirements-completed: [CORE-11]

coverage:
  - id: D1
    description: "CR-13 closed at the seam: a receiver KEY bound through a conditional, `??`, `||` or `&&` INITIALIZER reports, in both the declaration and the assignment spelling, matching its inline twin"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through operatorLiteralBinding: a receiver key BOUND to a conditional — `const k = b ? \"requests\" : \"net\"; sdk[k].send(req)` — reports outbound-send, exactly as its INLINE twin does — CR-13"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through operatorLiteralBinding at the ASSIGNMENT branch: `let k; k = b ? \"requests\" : \"net\"; sdk[k].send(req)` reports — closed in the SAME PLAN as the declaration spelling — CR-13"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through operatorLiteralBinding, THE WHOLE OPERATOR CLASS AT THE BINDING SITE: the `??`, `||` and `&&` initializers answer as the conditional does — CR-13"
        status: pass
    human_judgment: false
  - id: D2
    description: "The counter-direction pinned in the same commits as the widenings: a conditional of two harmless literals stays silent, an all-unreadable conditional stays silent at BOTH sites, and a numeric conditional index is still an index"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through operatorLiteralBinding, THE COUNTER-DIRECTION: a conditional of two HARMLESS literals stays silent — `const k = b ? \"harmless\" : \"other\"; sdk[k].send(req)`"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through operatorLiteralBinding, THE MIXED OPERAND: `const k = b ? \"requests\" : someName; sdk[k].send(req)` reports outbound-send off the READABLE branch — CR-13"
        status: pass
    human_judgment: false
  - id: D3
    description: "The four already-reporting twins pinned as controls, each titled for the mechanism that resolves it, so a later narrowing cannot silently take one"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through the FOUR ALREADY-REPORTING TWINS, PINNED AS CONTROLS: the inline key, the member name, the module specifier and the global key all still answer — CR-13's asymmetry, pinned from the other side"
        status: pass
    human_judgment: false
  - id: D4
    description: "`constStrings` and `literalsOf` rewritten from the code with a `BranchProbe` per named branch; both wave-30 handoffs discharged with the pin decremented in the same commit as the widening"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#branch constStrings / an operator initializer / auditSource > collect > for (const literal of operatorBinding.literals) { — its probe is executed against auditSource"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#branch literalsOf / an operator initializer / auditSource > literalsOf > return constStrings.get(node.text) ?? NO_LITERALS; — its probe is executed against auditSource"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#FALSIFIED_HANDOFFS is well-formed and its count is PINNED — expected to FALL to zero"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#every BRANCH_VOCABULARY phrase present in a clause has a BRANCH answering it"
        status: pass
    human_judgment: false
  - id: D5
    description: "Three mutation directions executed SEPARATELY, each RED at ROW granularity by title and message, each restored with `git diff --exit-code` clean and re-run green"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "mutation proof 1 — the descent removed, executed 2026-08-24, 9 tests RED, pasted in section 8"
        status: pass
      - kind: unit
        ref: "mutation proof 2 — the `a nested operator` BranchProbe entry removed, executed 2026-08-24, 4 tests RED, pasted in section 8"
        status: pass
      - kind: unit
        ref: "mutation proof 3 — the ASSEMBLY ARM only removed, executed 2026-08-24, 4 tests RED with the literal arm green, pasted in section 8"
        status: pass
    human_judgment: false
  - id: D6
    description: "The residual written from what THIS SESSION measured: two new measured-silence rows with executed probes, one prediction corrected by measurement, all seven prior silence rows re-executed"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#registry row silence-destructured-operator-key — its probe AND its counter-probe are executed against auditSource"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#registry row silence-cross-file-key — its probe AND its counter-probe are executed against auditSource"
        status: pass
    human_judgment: false
  - id: D7
    description: "Both spans regenerated and byte-identical; 41 entries on both surfaces, sha256 0da3a936…"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the block shipped in the gate header equals deriveResidual(RESOLVER_REGISTRY), byte for byte"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte"
        status: pass
    human_judgment: false
  - id: D8
    description: "The hand-written half of the gate header brought level with the code — boundary 2's per-family sentence (CR-13's other half), the receiver-resolution list, and three mechanism-table rows"
    verification: []
    human_judgment: true
    rationale: "NOTHING MECHANICAL CHECKS THIS. The byte comparison reaches the generated span and `REQUIREMENTS.md` and no further, so whether these hand-written paragraphs now match the code is a READING. Stated here rather than implied, and the derived block is authoritative where the two disagree."
  - id: D9
    description: "STATE.md's seventh P9-D3 pointer amendment and WINDOWS.md entry 35 restate no bound"
    verification: []
    human_judgment: true
    rationale: "The pointer-not-a-bound rule is a PROHIBITION WITH NO MECHANICAL CHECK — the same limit the third amendment named and no wave has closed. Whether these two amendments restate a bound is a reading."

duration: 41 min
completed: 2026-08-24
status: complete
---

# Phase 01 Plan 30: CR-13 Closed at the Seam Summary

**`const k = b ? "requests" : "net"; sdk[k].send(req)` answered CLEAN — one hop, the literal written out in full, while all four twins of the identical conditional reported. `operatorLiteralBinding` now reads an operator INITIALIZER at the binding site the way `keyReceiver` has always read the identical expression at the key site, and the two clauses it falsified word for word were rewritten FROM THE CODE in the same commit as the widening.**

## Performance

- **Duration:** 41 min
- **Started:** 2026-08-24T20:52:00Z
- **Completed:** 2026-08-24T21:33:00Z
- **Tasks:** 3
- **Files modified:** 4

## Task Commits

1. **Task 1 (tracer): the seam — an operator initializer read through the descent the key site already uses** — `b9f1edb` (feat)
2. **Task 2: the assignment spelling, the four controls, and the header level with the code** — `a652e37` (feat)
3. **Task 3: the residual stated from measurement, both spans, and the two pointer histories** — `493b972` (docs)

Base for this plan: `383ee18`. Diffstat over the whole plan:

```
 .planning/REQUIREMENTS.md                         |  48 +-
 .planning/STATE.md                                |   2 +-
 .planning/WINDOWS.md                              |  23 +-
 packages/backend/src/outbound-prohibition.spec.ts | 707 ++++++++++++++++++++--
 4 files changed, 727 insertions(+), 53 deletions(-)

$ git diff --diff-filter=D --name-only 383ee18 HEAD
(no output — no file deleted)
```

## Precondition

Asserted before the first edit. Wave 29's `branches` field, `BRANCH_VOCABULARY`, `FALSIFIED_HANDOFFS` and the coverage guard all present; both byte comparisons green; suite at **31 files / 1275 tests, exit 0**; `FALSIFIED_HANDOFFS` at 6 entries with `constStrings` and `literalsOf` naming wave 30 as owner. `git status --porcelain packages/ .planning/` clean apart from pre-existing untracked artifacts and a pre-existing `.planning/config.json` modification, neither of which this plan touches.

## 1. PRE-CHANGE MEASUREMENT — all six CR-13 silent shapes and all four twins, run BEFORE a line of code was written

Executed through `auditSource` on the tree as wave 29 left it:

```
MEASURE|S1 conditional decl (SDK key)       |[]
MEASURE|S2 ?? decl                          |[]
MEASURE|S3 || decl                          |[]
MEASURE|S4 assembled branch decl            |[]
MEASURE|S5 assignment spelling              |[]
MEASURE|S6 mixed operand (unreadable name)  |[]
MEASURE|T1 inline key                       |["outbound-send"]
MEASURE|T2 member name                      |["outbound-unanalysable"]
MEASURE|T3 module specifier                 |["outbound-unanalysable"]
MEASURE|T4 global key                       |["outbound-unanalysable"]
MEASURE|C1 harmless conditional             |[]
MEASURE|X1 unbound identifier operands      |[]
MEASURE|X2 numeric conditional index        |[]
MEASURE|X3 index accumulator via cond       |[]
MEASURE|R1 parameter key                    |[]
MEASURE|R2 loop binding key                 |[]
MEASURE|R3 function return                  |["outbound-unanalysable"]
MEASURE|R4 two hops of key                  |[]
MEASURE|R5 destructured plain literal       |[]
MEASURE|R6 && decl                          |[]
REGISTRY_LEN=38 HANDOFFS=6 VOCAB=47
```

Sources, in order: `const k = b ? "requests" : "net"; sdk[k].send(req)` · `const k = b ?? "requests"; …` · `const k = b || "requests"; …` · `const k = b ? "req" + "uests" : "net"; …` · `let k; k = b ? "requests" : "net"; …` · `const k = b ? "requests" : someName; …` · `sdk[b ? "requests" : "net"].send(req)` · `const m = b ? "send" : "get"; sdk.requests[m](req)` · `const s = b ? "caido:http" : "crypto"; import(s)` · `const k = b ? "fetch" : "x"; globalThis[k](url)`.

**Agreement with the verifier: complete on all six silent shapes and all four twins.** One measurement DISAGREED with this plan's own residual list and is carried as discrepancy 3 below (`R3`, the function return, is NOT silent).

## 2. THE SAME TEN, POST-WIDENING, IN ONE TABLE

| # | Shape | BEFORE | AFTER | INLINE twin (control) |
|---|---|---|---|---|
| S1 | `const k = b ? "requests" : "net"; sdk[k]` | `[]` | **`["outbound-send"]`** | `["outbound-send"]` — matches |
| S2 | `const k = b ?? "requests"; sdk[k]` | `[]` | **`["outbound-send"]`** | — |
| S3 | `const k = b \|\| "requests"; sdk[k]` | `[]` | **`["outbound-send"]`** | — |
| R6 | `const k = b && "requests"; sdk[k]` | `[]` | **`["outbound-send"]`** | — |
| S4 | `const k = b ? "req"+"uests" : "net"; sdk[k]` | `[]` | **`["outbound-unanalysable"]`** | `["outbound-net"]` — **discrepancy 1** |
| S5 | `let k; k = b ? "requests" : "net"; sdk[k]` | `[]` | **`["outbound-send"]`** | `["outbound-send"]` — matches |
| S6 | `const k = b ? "requests" : someName; sdk[k]` | `[]` | **`["outbound-send"]`** | `["outbound-send"]` — matches |
| X5 | `const k = b ? (c ? "requests" : "x") : "y"; sdk[k]` | `[]` | **`["outbound-send"]`** | `["outbound-send"]` — matches |
| T1 | `sdk[b ? "requests" : "net"].send(req)` | `["outbound-send"]` | `["outbound-send"]` | control, unchanged |
| T2 | `const m = b ? "send" : "get"; sdk.requests[m](req)` | `["outbound-unanalysable"]` | `["outbound-unanalysable"]` | control, unchanged |
| T3 | `const s = b ? "caido:http" : "crypto"; import(s)` | `["outbound-unanalysable"]` | `["outbound-unanalysable"]` | control, unchanged |
| T4 | `const k = b ? "fetch" : "x"; globalThis[k](url)` | `["outbound-unanalysable"]` | `["outbound-unanalysable"]` | control, unchanged |
| C1 | `const k = b ? "harmless" : "other"; sdk[k]` | `[]` | `[]` — counter-direction held | `[]` |

**Controls 2, 3 and 4 are unchanged but NOT unchanged for the same reason, and that is written down because "unchanged" and "unchanged for the same reason" are not the same claim.** Before the widening those three names carried ZERO collected literals, so `literalOf` answered `undefined` on `size 0`. After it they carry TWO, so `literalOf` answers `undefined` on `size 2`. Same rule, different arithmetic.

## 3. THE UNREADABLE-OPERAND RULE — BOTH READINGS IMPLEMENTED AND RUN

The review proposed marking the name an assembly if **ANY operand is unreadable**. It was implemented first, exactly as written, and measured:

|  | READING A (`any operand with no literal`) | READING B (only an operand the walk WATCHES BEING ASSEMBLED) | INLINE twin |
|---|---|---|---|
| `const k = b ? "requests" : someName; sdk[k]` | `["outbound-unanalysable"]` | `["outbound-send"]` | `["outbound-send"]` |
| `const k = b ? someName : otherName; sdk[k]` | `["outbound-unanalysable"]` | `[]` | `[]` |
| `const i = b ? 0 : 1; sdk[i]` | `["outbound-unanalysable"]` | `[]` | — |
| `const k = b ?? "requests"; sdk[k]` | `["outbound-unanalysable"]` | `["outbound-send"]` | — |
| `const k = b ? "req"+"uests" : "net"; sdk[k]` | `["outbound-unanalysable"]` | `["outbound-unanalysable"]` | `["outbound-net"]` |
| `const r = b ? sdk.requests : sdk.net; r.send(req)` | `["outbound-send"]` | `["outbound-send"]` | — |
| real tree, both roots | 23 files, 0 violations | 23 files, 0 violations | — |
| the four measured-exempt sites | all `[]` | all `[]` | — |

**THE REAL TREE DID NOT DISCRIMINATE.** Both readings are ZERO on it, so nothing about shipped code chose this and it would be dishonest to claim it did. **THE SHAPES DISCRIMINATED, IN THREE PLACES, AND ALL THREE ARE READING A OVER-APPROXIMATING FURTHER THAN THE TWINS THIS PLAN EXISTS TO MATCH:**

1. `b ? "requests" : someName` is a site the walk reads COMPLETELY on one branch and the inline twin reports `outbound-send`. Reading A answers `outbound-unanalysable` — the gate saying "I could not read this" about something it read perfectly, which is the second overclaim the round-4 fixtures were written to forbid.
2. `b ? someName : otherName` is SILENT at the inline site. Reading A reports there — **a NEW asymmetry between binding and use, in the opposite direction from CR-13's, created by the commit closing CR-13.**
3. `const i = b ? 0 : 1; sdk[i]` is an ORDINARY INDEX. Reading A calls it an assembled name, which is the first WR-19 implementation's own rejected behaviour — the one that fired on `compat.ts`'s documented path walk.

And separately, reading A fails this plan's own `must_haves` requirement that the `??` and `||` initializers answer as the conditional does, because `b ?? "requests"` has one operand with no literal BY CONSTRUCTION.

**The shipped arm is read off `keyReceiver`, which is the function the twins go through.** It produces UNREADABLE from exactly two branches — a name already in `assembledNames`, and `isAssembledKey` — and the descent tests those two and no others. `isAssembledKey` excludes provably-numeric expressions on its own first line, which is what keeps case 3 an index without a second numeric guard.

The rejected reading is recorded in the docblock in the shape `RECEIVER_OPERATORS`' docblock records the `&&` decision, including what reading B costs:

> WHAT READING B COSTS, STATED RATHER THAN LEFT IMPLICIT: an operand the walk genuinely cannot follow — a parameter, a call result already covered by `isAssembledKey`, a name bound in another file — contributes NO literal and NO unreadability, so `const k = b ? "requests" : mystery; sdk[k]` reports `outbound-send` off the readable branch and says nothing about the other one. That is the same either-side over-approximation `RECEIVER_OPERATORS` chose and for the same reason: a receiver named on one path is named.

## 4. The descent — source shape, and the docblock naming `operatorOperands` and WR-27

```ts
function operatorLiteralBinding(
  node: ts.Expression | undefined,
  read: (operand: ts.Expression) => ReadonlySet<string>,
  assembled: ReadonlySet<string>,
  numeric: ReadonlySet<string>,
  poisoned: ReadonlySet<string>,
): OperatorLiteralBinding | undefined {
  if (node === undefined) return undefined;
  const operands = operatorOperands(unwrap(node));
  if (operands === undefined) return undefined;
  const literals = new Set<string>();
  let watched = false;
  for (const operand of operands) {
    const nested = operatorLiteralBinding(operand, read, assembled, numeric, poisoned);
    if (nested !== undefined) {
      for (const literal of nested.literals) literals.add(literal);
      if (nested.assembled) watched = true;
      continue;
    }
    const inner = unwrap(operand);
    if (
      isAssembledKey(inner, numeric, poisoned) ||
      (ts.isIdentifier(inner) && assembled.has(inner.text))
    ) {
      watched = true;
      continue;
    }
    for (const literal of read(inner)) literals.add(literal);
  }
  return { literals, assembled: watched };
}
```

Docblock, the WR-27 half, pasted:

> **IT IS BUILT ON `operatorOperands` AND MUST STAY BUILT ON IT — WR-27 IS THE REASON, NAMED HERE RATHER THAN LEFT AS STYLE.** WR-27 was ONE idea — the conditional descent — written THREE TIMES and therefore existing only TWICE, and the face nobody had was silent. A literal-reading descent carrying its own inline list of operator kinds would be the FOURTH copy of that list, free to disagree with `operatorReceiver` about which operators exist the day either one grows a fifth. `operatorOperands` is the separated statement of WHAT COUNTS AS AN OPERATOR; this function is its second CONSUMER, and `operatorReceiver` is the first. HOW THE OPERANDS COMBINE differs between the two — one selects a receiver, one collects literals — and that is exactly the half `operatorOperands`' own docblock says is allowed to differ.

And the one place it DEPARTS from `operatorReceiver`, stated rather than slipped in:

> **THE RECURSION IS THIS FUNCTION'S OWN, AND THAT IS A DEPARTURE FROM `operatorReceiver` WORTH STATING.** `operatorReceiver` takes the caller's leaf resolver and lets the caller pass ITSELF, so nesting resolves by construction. That is not available here: the leaf reader is `literalsOf`, which returns a `ReadonlySet<string>` and has no third state to carry an "unreadable" answer back through, and making it operator-aware would put a fifth copy of the descent inside a function whose whole job is reading a map.

`pnpm knip` exits 0 with it — the function is module-scope and non-exported, exactly as `isAssembledKey` and `isProvablyNumeric` are.

## 5. The registry row, with the code site each `BranchProbe` was read off, per branch

Clause, pasted from the shipped block:

```
* operatorLiteralBinding - an operator-shaped INITIALIZER is read on every operand: at a
  declaration or an assignment, a conditional, ?? or || initializer binds a literal operand
  into constStrings, while an operand the walk WATCHES BEING ASSEMBLED makes the bound name
  an UNREADABLE key instead; a nested operator descends through operatorOperands - the SAME
  set operatorReceiver reads - so this is a second CONSUMER of that set and not a fourth
  copy of it
    read off:  module scope > function operatorLiteralBinding(
```

| Branch phrase | Code site the probe was read off | Probe | Measured |
|---|---|---|---|
| `a declaration` | `auditSource > collect > const operatorBinding = operatorLiteralBinding(` | `const k = b ? "requests" : "net"; sdk[k].send(req)` | `["outbound-send"]` |
| `an assignment` | `auditSource > collect > const assignedOperator = operatorLiteralBinding(` | `let k; k = b ? "requests" : "net"; sdk[k].send(req)` | `["outbound-send"]` |
| `a literal operand` | `module scope > operatorLiteralBinding > for (const literal of read(inner)) literals.add(literal);` | `const k = b ?? "requests"; sdk[k].send(req)` | `["outbound-send"]` |
| `an operand the walk WATCHES BEING ASSEMBLED` | `module scope > operatorLiteralBinding > isAssembledKey(inner, numeric, poisoned) \|\|` | `const k = b ? "req" + "uests" : "net"; sdk[k].send(req)` | `["outbound-unanalysable"]` |
| `a nested operator` | `module scope > operatorLiteralBinding > const nested = operatorLiteralBinding(` | `const k = b ? (c ? "requests" : "x") : "y"; sdk[k].send(req)` | `["outbound-send"]` |

Row probe `const k = b ? "requests" : "net"` → `["outbound-send"]`; counter-probe `const k = b ? "harmless" : "other"` → `[]`. Non-vacuous in both directions, and every branch differs from the counter-probe.

**Wave 27's coverage guard is satisfied WITHOUT an exemption** — `operatorLiteralBinding` is a registry ROW, not a `RESOLVER_EXEMPTIONS` entry:

```
✓ BOTH resolver populations enumerate a NON-EMPTY set — non-vacuity, asserted BEFORE the rule
✓ every member of BOTH populations is a registry row OR a named, reasoned exemption
collectors.length => 11   functions.length => 39   (was 38)
```

`operatorOperands`' own exemption text was updated in the same commit to say it serves TWO consumers rather than one.

**Three new `BRANCH_VOCABULARY` phrases were added for the descent's own arms**, with the reason recorded in the list:

> The OPERAND rules the LITERAL descent applies. Spelled differently from `operatorReceiver`'s two above ON PURPOSE: the two descents read the same operator set and do DIFFERENT things with the operands, so one phrase matching both rows would bind each row to the other's branch.

A fourth, `an operator initializer`, was added for the BINDING SHAPE `constStrings` and `literalsOf` name — lower case, which is what keeps it distinct from the descent's own `an operator-shaped INITIALIZER`. **`BRANCH_VOCABULARY` 47 → 51 phrases.**

## 6. `constStrings` and `literalsOf`, BEFORE and AFTER, with the falsified universals byte-identical

**`constStrings` BEFORE:**

```
a receiver or global KEY resolves when a string literal bound at a string-literal declaration
or a string-literal assignment names an outbound receiver; bindings are file-wide and
ANY-BINDING-WINS, so this collector OVER-approximates. FALSIFIED 2026-08-24 (CR-13), the
phrase this clause used to carry: "ANY string literal the name is bound to anywhere in the
file" - measured, a conditional, ?? or || initializer binds a literal neither this collector
nor literalsOf reads
```

**`constStrings` AFTER:**

```
a receiver or global KEY resolves when a string literal bound at a string-literal declaration,
a string-literal assignment or an operator initializer names an outbound receiver; bindings
are file-wide and ANY-BINDING-WINS, so this collector OVER-approximates. FALSIFIED 2026-08-24
(CR-13), the phrase this clause used to carry: "ANY string literal the name is bound to
anywhere in the file" - measured, a conditional, ?? or || initializer bound a literal neither
this collector nor literalsOf read; that shape is CLOSED 2026-08-24 by operatorLiteralBinding
and the branch below is its probe, and the phrase STAYS falsified because a parameter, a loop
binding, a name bound in another file and a second hop of key each still bind nothing
```

**`literalsOf` BEFORE:**

```
the MULTI-valued string reader keyReceiver consults: the collected set of literals constStrings
recorded for a name, so ANY of them naming a receiver reports. FALSIFIED 2026-08-24 (CR-13),
the phrase this clause used to carry: "every literal a name carries" - measured, a literal
reached only through a conditional, ?? or || initializer is in no collected set and is not read
```

**`literalsOf` AFTER:**

```
the MULTI-valued string reader keyReceiver consults: the collected set of literals constStrings
recorded for a name - which since 2026-08-24 includes every literal an operator initializer
bound - so ANY of them naming a receiver reports. FALSIFIED 2026-08-24 (CR-13), the phrase this
clause used to carry: "every literal a name carries" - measured, a literal reached only through
a conditional, ?? or || initializer was in no collected set and was not read; that shape is
CLOSED 2026-08-24 by operatorLiteralBinding and the branch below is its probe, and the phrase
STAYS falsified because a literal reached only through a parameter, a loop binding, a name
bound in another file or a second hop of key is still in no collected set
```

**THE PRESERVED FALSIFIED UNIVERSALS ARE BYTE-IDENTICAL.** `"ANY string literal the name is bound to anywhere in the file"` and `"every literal a name carries"` appear verbatim, character for character, in both the before and the after. **What changed beside them is the `- measured, …` TAIL**, which was a statement of what the code did on 2026-08-24 and had become false the moment the widening landed. That is a deliberate edit and it is called out here rather than buried: the PHRASE is the record of what was believed and stays frozen; the MEASUREMENT beside it must track the code or it becomes a second false sentence sitting under a marker that says "falsified".

**The code sites each corrected clause was read off, per branch:**

| Row | Branch it now names | Code site read off | Probe → measured |
|---|---|---|---|
| `constStrings` | `an operator initializer` | `auditSource > collect > for (const literal of operatorBinding.literals) {` — the line that calls `bindString` with an operator-carried literal | `const k = b ? "requests" : "net"; sdk[k].send(req)` → `["outbound-send"]` |
| `literalsOf` | `an operator initializer` | `auditSource > literalsOf > return constStrings.get(node.text) ?? NO_LITERALS;` | `const k = b ? "requests" : "net"; sdk[k].send(req)` → `["outbound-send"]` |

`literalsOf`'s branch anchors the SAME LINE as its `the collected set` branch, and that is the honest anchor rather than a defect — the reader has ONE code branch and its reach is entirely inherited from what `constStrings` collected. The comment in the row says exactly that, and mutation proof 1 proves the pair is not redundant: with the descent deleted the `an operator initializer` probe answers `[]` while `the collected set` stays green.

`QUANTIFIED_CLAUSES` entries for both rows were rewritten to state the NEW measured bound with the four remaining shapes named and their probes quoted. The universals are STILL false and the entries say so.

## 7. THE HANDOFF WAS OBSERVED DOING ITS JOB — the direction the vocabulary guard cannot reach

With the widening in place and the two `FALSIFIED_HANDOFFS` entries still present, the suite was run once. **RED, naming the row, the phrase and the owning wave:**

```
FAIL  handoff constStrings / CR-13 / wave 30 — the falsified phrase is STILL false, measured
      against the code as it stands
AssertionError: handoff `constStrings` (CR-13) records that the phrase "ANY string literal the
name is bound to anywhere in the file" is FALSE of this probe, and that the probe answers []
while the handoff is OPEN. It no longer does. If wave 30 widened the code, that is the widening
working — now RE-ADD the phrase to row `constStrings`'s clause WITH its branch probe, and DELETE
this handoff entry and its pin, in this same commit. This case exists because the vocabulary
guard cannot see a widening that never re-adds its phrase.
: expected [ 'outbound-send' ] to deeply equal []

FAIL  handoff literalsOf / CR-13 / wave 30 — the falsified phrase is STILL false, measured
      against the code as it stands
AssertionError: handoff `literalsOf` (CR-13) records that the phrase "every literal a name
carries" is FALSE of this probe … : expected [ 'outbound-send' ] to deeply equal []
```

Both entries were then deleted and the pin decremented **in the same commit as the code** (`b9f1edb`):

```
✓ FALSIFIED_HANDOFFS is well-formed and its count is PINNED — expected to FALL to zero
FALSIFIED_HANDOFFS.length => 4     (was 6)
```

Pin message updated to record the discharge rather than merely the number:

> … A count that moved without a widening beside it is the failure. **WAVE 30 DISCHARGED ITS TWO ON 2026-08-24 (CR-13): 6 became 4, in the same commit as `operatorLiteralBinding`.**

Remaining handoffs, all belonging to later waves:

```
HANDOFF-LEFT|assembledNames                          |CR-12|wave 31
HANDOFF-LEFT|receiverAliases                         |CR-12|wave 31
HANDOFF-LEFT|isFetchExpression                       |CR-12|wave 31
HANDOFF-LEFT|silence-operator-around-global-receiver |CR-11|wave 32
```

## 8. THREE MUTATION PROOFS — each executed SEPARATELY, never combined

**Run order: 1 → 2 → 3.** Proof 1 was run against the tree committed as `b9f1edb`; proofs 2 and 3 against `a652e37`. `git diff --exit-code -- packages/backend/src/outbound-prohibition.spec.ts .planning/REQUIREMENTS.md` returned **clean (exit 0)** after every restore, and the suite was re-run green after each.

| # | Mutation | Tests that went RED | Assertion message it carried | Restore | Re-run |
|---|---|---|---|---|---|
| **1** | **The descent removed** from `collect`'s declaration branch | **9**, listed in full below | `registry row \`operatorLiteralBinding\` says its probe reports [outbound-send]. It does not. The row was read off \`module scope > function operatorLiteralBinding(\`; either that branch changed and the row is now stale, or the row was transcribed from prose instead of from the branch.` | `git diff --exit-code` clean | 344/344 green |
| **2** | The `a nested operator` **`BranchProbe` entry removed** from a clause that still names the branch | 4 | `clause(s) name a branch that NO branch probe answers: operatorLiteralBinding names "a nested operator". There are exactly two ways out and softening the clause silently is neither. EITHER write the BranchProbe … OR stop the clause naming the branch …` (+ the pin: `expected 66 to be 67`) | clean | 350/350 green |
| **3** | The **ASSEMBLY ARM only**, literal arm left intact | 4 | `registry row \`operatorLiteralBinding\`'s clause names "an operand the walk WATCHES BEING ASSEMBLED" and says the branch at \`… isAssembledKey(inner, numeric, poisoned) \|\|\` reports [outbound-unanalysable]. It does not.` — `expected [ 'outbound-net' ] to deeply equal [ 'outbound-unanalysable' ]` | clean | 350/350 green |

### Proof 1 is at ROW granularity, not fixture granularity — every test that moved

```
1  through operatorLiteralBinding: a receiver key BOUND to a conditional … — CR-13
     "const k = b ? "requests" : "net"; sdk[k].send(req) is silent again — the BINDING site
      has stopped descending the operator the KEY site descends: expected [] to include
      'outbound-send'"
2  registry row operatorLiteralBinding — its probe AND its counter-probe are executed
3  branch operatorLiteralBinding / a declaration / …
4  branch operatorLiteralBinding / a literal operand / …
5  branch operatorLiteralBinding / an operand the walk WATCHES BEING ASSEMBLED / …
6  branch operatorLiteralBinding / a nested operator / …
7  branch constStrings / an operator initializer / …          <- the CORRECTED clause's own branch
8  branch literalsOf   / an operator initializer / …          <- the CORRECTED clause's own branch
9  every branch anchor still EXISTS, AT A DECLARATION OR A BRANCH OPENING, in this file
     "row `constStrings`'s branch for "an operator initializer" records its site as
      `auditSource > collect > for (const literal of operatorBinding.literals) {`, and no line
      in packages/backend/src/outbound-prohibition.spec.ts begins with that."
```

Seven of the nine are inside the derived block and six of those name a ROW. Only ONE is a hand-written fixture. **That is the WR-32 seam holding: the two corrected clauses go red by name when the branch they name is deleted**, which is exactly what the pre-wave-29 registry could not do.

### Proof 3 shows the two arms are independently bound

RED: the assembled-variant fixture, the assignment-branch fixture, `branch … / an operand the walk WATCHES BEING ASSEMBLED`, and the anchor case. **GREEN throughout:** the row's own probe, `branch … / a literal operand`, `branch … / a declaration`, `branch … / an assignment`, `branch … / a nested operator`, `branch constStrings / an operator initializer`, `branch literalsOf / an operator initializer`, and the conditional fixture. One arm removed, one arm's cases red, the other arm's cases untouched.

## 9. TWO REAL-TREE ZEROS, one after each widening, with the four exempt sites named individually

**After widening 1 (declaration branch, commit `b9f1edb`):**

```
TREE|roots=packages/backend/src + packages/engine/src|files=23|violations=0
EXEMPT|compat.ts cur[key]          |packages/backend/src/compat.ts            |[]
EXEMPT|compat.ts ctx[root]         |packages/backend/src/compat.ts            |[]
EXEMPT|observations.ts segments[i] |packages/backend/src/store/observations.ts|[]
EXEMPT|MIGRATIONS index            |packages/backend/src/store/migrations.ts  |[]
```

**After widening 2 (assignment branch, commit `a652e37`):**

```
TREE|roots=packages/backend/src + packages/engine/src|files=23|violations=0
EXEMPT|compat.ts cur[key]          |packages/backend/src/compat.ts            |[]
EXEMPT|compat.ts ctx[root]         |packages/backend/src/compat.ts            |[]
EXEMPT|observations.ts segments[i] |packages/backend/src/store/observations.ts|[]
EXEMPT|MIGRATIONS index            |packages/backend/src/store/migrations.ts  |[]
```

**These zeros are MEASUREMENTS, not regression checks** — this plan widened the walk twice, and a non-zero here would have been a finding about the widening rather than a reason to narrow the fixture.

## 10. EVERY MEASURED SILENCE ROW RE-EXECUTED AGAINST THE WIDENED WALK — one line per row

```
SILENCE|silence-two-hop-key                    |probe=[] |counter=["outbound-send"]        |UNCHANGED
SILENCE|silence-function-boundary              |probe=[] |counter=["outbound-send"]        |UNCHANGED
SILENCE|silence-parameter-key                  |probe=[] |counter=["outbound-send"]        |UNCHANGED
SILENCE|silence-loop-binding-key               |probe=[] |counter=["outbound-send"]        |UNCHANGED
SILENCE|silence-destructured-plain-literal-key |probe=[] |counter=["outbound-unanalysable"]|UNCHANGED
SILENCE|silence-inverted-binding-order         |probe=[] |counter=["outbound-fetch"]       |UNCHANGED
SILENCE|silence-operator-around-global-receiver|probe=[] |counter=["outbound-send"]        |UNCHANGED
```

**No row converged. No row was removed.** Every one still measures a silence, and the vacuity rule (probe and counter-probe must differ) still holds for all seven.

## 11. The residual, written from what THIS SESSION measured

Every remaining silent shape was RUN and the row written from the answer:

| Shape | Probe | Measured | Disposition |
|---|---|---|---|
| parameter key | `function f(k) { return sdk[k].send(req); } f("requests")` | `[]` | existing row `silence-parameter-key` |
| loop binding key | `for (const k of ["requests"]) { sdk[k].send(req); }` | `[]` | existing row `silence-loop-binding-key` |
| receiver across a function boundary | `function pick() { return sdk.requests; } pick().send(req)` | `[]` | existing row `silence-function-boundary` |
| two hops of key | `const a = b ? "requests" : "net"; const k = a; sdk[k].send(req)` | `[]` | existing row `silence-two-hop-key` |
| destructured PLAIN literal | `const { k } = { k: "requests" }; sdk[k].send(req)` | `[]` | existing row |
| **destructured OPERATOR literal** | `const { k } = { k: b ? "requests" : "net" }; sdk[k].send(req)` | `[]` | **NEW row `silence-destructured-operator-key`, residual (b3)** |
| **key bound in ANOTHER FILE** | `import { k } from "./other"; sdk[k].send(req)` | `[]` | **NEW row `silence-cross-file-key`, residual (b4)** |
| **key bound to a FUNCTION RETURN** | `function g() { return "requests"; } const k = g(); sdk[k].send(req)` | **`["outbound-unanalysable"]`** | **NOT SILENT — discrepancy 3, residual (b5)** |
| logical-assignment binding | `let k; k \|\|= b ? "requests" : "net"; sdk[k].send(req)` | `[]` | CR-12, wave 31's — measured and explicitly NOT claimed here |
| operator around a GLOBAL receiver | `(ok && globalThis).fetch(url)` | `[]` | CR-11, wave 32's — existing row, unchanged |

Both new rows carry an executed probe AND counter-probe. `silence-destructured-operator-key`'s counter-probe is the IDENTIFIER spelling of the same operator initializer (`["outbound-send"]`); `silence-cross-file-key`'s is the same name bound in THIS file (`["outbound-send"]`).

**`silence-cross-file-key` is a sentence that existed in prose since CR-09 and was executed nowhere.** Nothing about the behaviour changed in this plan; what changed is that a bound nobody had ever run became a row with a probe. That is the artifact this whole round replaces, found in this plan's own residual list.

**NO SENTENCE IN THE RESIDUAL NAMES A BOUND THAT WAS NOT RUN IN THIS SESSION.**

## 12. The hand-written header, brought level with the code — and the limit stated

**Boundary 2's per-family sentence, BEFORE:**

```
//          CR-10 `constStrings` holds EVERY literal a name is bound to anywhere
//          in the file and reports if ANY of them names a receiver, …
```

**AFTER:**

```
//          CR-10 `constStrings` holds every literal a name is bound to at ANY OF
//          ITS COLLECTING BRANCHES and reports if ANY of them names a receiver, …
//          CORRECTED 2026-08-24 (CR-13, wave 30), AND WHAT WAS WRONG WITH IT.
//          This paragraph said `EVERY literal a name is bound to ANYWHERE IN THE
//          FILE`, in the hand-written half of this header, and that sentence was
//          FALSE for the same reason and on the same day the `constStrings`
//          REGISTRY ROW's universal was … THE BRANCHES ARE NAMED RATHER THAN
//          QUANTIFIED OVER, and there are now THREE …
//          NOTHING MECHANICAL CHECKS THIS PARAGRAPH. The byte comparison reaches
//          the generated span and `REQUIREMENTS.md` and no further, so this
//          sentence was corrected BY HAND in the same commit as the registry, and
//          where the two ever disagree the derived block is authoritative and
//          this paragraph is the defect.
```

**The receiver-resolution list, BEFORE:** `… or a name REBOUND to one anywhere in the file …`
**AFTER:** `… a name REBOUND to one at any of the three collecting branches …, or a name bound through an OPERATOR INITIALIZER at a declaration or an assignment …`, with the note that the clause was added and `anywhere in the file` REMOVED in the same commit, for the same reason.

**In one sentence, because it is the limit rather than an aside: NOTHING MECHANICAL CHECKS EITHER OF THESE PARAGRAPHS.** They were corrected by hand in the same commit as the registry, and the derived block remains authoritative where the two disagree.

**Mechanism-table rows added** (the table is indexed by SPELLING — what a reader arrives holding — and had NO row for a key bound to an operator):

```
//      const k = b ? "requests" : "net";        operatorLiteral-     outbound-send
//        sdk[k]                                   Binding, then      — ROW ADDED 2026-08-24
//      let k; k = b ?? "requests"; sdk[k]         constStrings         (CR-13). …
//      const k = b ? "req" + "uests" : "net";   operatorLiteral-     outbound-unanalysable
//        sdk[k]                                   Binding's assembly …
//      const k = b ? someName : otherName;      NOTHING              [] — and the INLINE twin
//        sdk[k]                                                          is silent too. …
```

## 13. Both spans — sha256, line count, entry count, side by side

```
gate header   sha256=0da3a93643ca7c491adfa5ebed330212994ab466d6c8f7d6c7fc26ed86260dad  lines=407  entries=41  branch-lines=67
REQUIREMENTS  sha256=0da3a93643ca7c491adfa5ebed330212994ab466d6c8f7d6c7fc26ed86260dad  lines=407  entries=41  branch-lines=67
IDENTICAL: True
```

Entry count equals `RESOLVER_REGISTRY.length` on both surfaces, asserted by executing both cases rather than by reading them:

```
✓ the shipped block carries exactly ONE entry per registry row — a truncated block FAILS
✓ the ledger's block carries exactly ONE entry per registry row — a truncated ledger block FAILS
```

**Final enumeration counts, all pinned by equality:**

```
BRANCH_VOCABULARY  51 phrases (was 47)   clause-phrase hits  66 (was 59)
branch probes      67        (was 60)    rows with branches  33 (was 32)
registry rows      41        (was 38)    resolvers 32 · measured-silences 9
FALSIFIED_HANDOFFS  4        (was 6)     enumerated functions 39 (was 38) · collectors 11
UNBOUNDED_QUANTIFIERS 9 (unchanged)      QUANTIFIED_CLAUSES 7 (unchanged, two rewritten)
```

## 14. Wave 29's corrected preamble and its clause-to-branch limits point — UNCHANGED

```
$ git diff 383ee18 -- packages/backend/src/outbound-prohibition.spec.ts | grep -E "(Each entry below is verified by EXECUTION|WHAT CLAUSE-TO-BRANCH BINDING CANNOT PROVE|does NOT prove …)"
PREAMBLE point 1 and the FOUR limits of point 5: NO DIFF vs 383ee18 — unchanged and unweakened
```

Neither was weakened, truncated, or reworded.

## 15. `REQUIREMENTS.md` — the dated CR-13 correction, above the BEGIN sentinel

Added above the sentinel, following the convention plans 01-19, 01-23 and 01-28 established, headed:

> **CORE-11 — CR-13 CLOSED AT THE SEAM, 2026-08-24 BY PLAN 01-30 (gap-closure round 6, wave 30).**

with four paragraphs — WHAT WAS FOUND, WHAT WAS CLOSED, WHAT REMAINS (written from what this session measured), and:

> **NOTHING LEAKED AND NOTHING LEAKS NOW, STATED PLAINLY AND NOT INFLATED.** CR-13 is PROSPECTIVE blindness in a TEST-ONLY gate. No outbound call exists in any non-spec source under either root; the gate runs green over the real tree — 23 files, ZERO violations, re-measured after each of the two widenings with the four measured-exempt sites confirmed quiet by name — and `pnpm check:bundle` reports the shipped bundle's entire import set as one specifier, `crypto`. What CR-13 was is a call site somebody writes next year that this gate would have stayed green on.

**NEITHER SENTINEL MARKER'S TEXT IS QUOTED IN THAT PROSE** — confirmed by the suite staying green, which is the check `01-28-SUMMARY.md` records as the guard catching its own reader.

## 16. CORE-11's box is exactly as wave 28 left it

```
$ grep -cE '^- \[[ x]\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
1
$ grep -oE '^- \[[ x]\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md
- [ ] **CORE-11**
$ git diff 383ee18 -- .planning/REQUIREMENTS.md | grep -E "^[+-]- \[[ x]\] \*\*CORE-11\*\*"
CORE-11 row: NO DIFF vs 383ee18 (exactly as wave 28 left it)
```

**Wave 32 owns the flip and owns the discharge table it is flipped against.** This plan closes two of the eight enumerated rows' blocking shapes without discharging the requirement, and does not argue that it could be flipped.

## 17. Append-never-rewrite, verified POSITIVELY

`.planning/REQUIREMENTS.md` — each prior correction anchor still matches exactly once:

```
THE DERIVED RESIDUAL, INSTALLED 2026-08-24 BY PLAN 01-27       => 1
WHICH HALF OF THIS ENTRY EACH RULE APPLIES TO                  => 1
WHY THIS ENTRY CARRIES THE TEXT AND NOT A POINTER              => 1
THE SURFACE DECISION, wave 27                                  => 1
THE LIMITS, IN ONE SENTENCE, BECAUSE THE LEDGER IS WHERE …     => 1
THE LIMITS OF CLAUSE-TO-BRANCH BINDING, IN ONE SENTENCE        => 1
THE BOX IS DELIBERATELY STILL                                  => 2   (2 at base too — pre-existing)
CR-13 CLOSED AT THE SEAM, 2026-08-24 BY PLAN 01-30             => 1   (new, this plan)
```

`.planning/STATE.md` — each prior P9-D3 amendment opening matches exactly once:

```
POINTER AMENDMENT … plan 01-18 task 3      => 1
SECOND POINTER AMENDMENT … plan 01-19      => 1
THIRD POINTER AMENDMENT … plan 01-23       => 1
FOURTH POINTER AMENDMENT … plan 01-27      => 1
FIFTH POINTER AMENDMENT … plan 01-28       => 1
SIXTH POINTER AMENDMENT … plan 01-29       => 1
SEVENTH POINTER AMENDMENT … plan 01-30     => 1   (new, this plan)

STATE.md diff: 1 line changed, 1 insertion — appended chars: 2752
```

The seventh amendment restates no bound, names the enforcing tests rather than copying them, and restates that **the pointer-not-a-bound rule is a PROHIBITION WITH NO MECHANICAL CHECK** — extending that statement, this wave, to the gate header's own hand-written half.

## 18. `WINDOWS.md` — through the tool, raw output

```
$ gsd-tools windows status          (before)   open_count: 19  fixed_count: 15  total_count: 34
                                               OPEN entries on this gate file: [34]

$ gsd-tools windows fixed 34
{ "ok": true, "ledger": { "open_count": 18, "fixed_count": 16, "total_count": 34, … } }

$ gsd-tools windows append --kind deviation --phase 01 \
    --file packages/backend/src/outbound-prohibition.spec.ts --description "<pointer>"
{ "ok": true, "entry": { "id": 35, "kind": "deviation", "phase": "01", "status": "open" } }

$ gsd-tools windows status          (after)    open_count: 19  fixed_count: 16  total_count: 35
                                               last_updated: 2026-08-24T19:29:34.645Z

entries on this gate file: 13 20 22 23 25 26 27 28 31 32 33 34 (all fixed) · 35 (open)
OPEN entries on this gate file: [35]        <- exactly one
```

**The tool refused nothing.** **NOT HAND-EDITED** — the frontmatter counters and the JSON block moved together in one diff:

```
-fixed_count: 15        +fixed_count: 16
-total_count: 34        +total_count: 35
-last_updated: 2026-08-24T19:03:12.830Z   +last_updated: 2026-08-24T19:29:34.645Z
 .planning/WINDOWS.md | 23 ++++++++++++++++++-----
```

## 19. PREDICTION-VS-MEASUREMENT DISCREPANCIES

Five, in the shape `01-27-SUMMARY.md` used. In every case the measurement won.

| # | Predicted | Measured | What it means |
|---|---|---|---|
| 1 | The assembled variant `const k = b ? "req"+"uests" : "net"` would match its INLINE twin, both `outbound-unanalysable` | **The INLINE twin reports `["outbound-net"]`**, not unanalysable | `operatorReceiver` prefers a NAMED operand over an unreadable one; `keyReceiver` gives a WATCHED ASSEMBLY precedence over a literal binding of the same name. Both spellings REPORT — they name DIFFERENT rules. Pinned in the fixture and in the mechanism table, so nobody reading "the twins agree" out of this SUMMARY misses the exact sense in which they do not. |
| 2 | The review's sketch — mark the name an assembly if ANY operand is unreadable — would match the twins | **It over-approximates further than the twins in THREE measured places** and fails the `??` requirement outright | Implemented, run, REJECTED. The shipped arm is read off `keyReceiver`'s own two UNREADABLE branches. Full table in section 3. This is what "decide by measurement, not by the fix sketch" bought. |
| 3 | A key bound to a FUNCTION RETURN would still be silent (this plan listed it among the residual shapes) | **`["outbound-unanalysable"]`** — `isAssembledKey`'s `returned by a call` branch already catches it | The RECEIVER half of the function boundary IS silent (`silence-function-boundary`); the KEY half is not the same fact and had been folded into it. Corrected in the residual as (b5) rather than left as a claim nobody ran. |
| 4 | The six silent shapes named by the verifier were the complete set the widening would meet | **A SEVENTH was found by measurement while widening**: a DESTRUCTURED OPERATOR literal, `const { k } = { k: b ? "requests" : "net" }`, is silent | The descent is wired at the two IDENTIFIER branches, not at either binding-pattern branch. Disclosed as residual (b3) with an executed probe, on (b2)'s precedent, rather than folded in — widening `constStrings` through binding patterns needs its own real-tree measurement. |
| 5 | The two clause corrections were TASK 2 work per the plan | **They had to land in TASK 1**, because the widening turns wave 29's handoff case RED the instant it lands and task 1's own acceptance criteria demand a green suite | Recorded as deviation 1 below. The plan's own evidence requirement — observe the handoff RED before deleting it — was still satisfied, and is pasted in section 7. |

## 20. Final gate results

```
$ pnpm exec vitest run packages/backend/src/outbound-prohibition.spec.ts   →  352 passed (352)
$ pnpm test                                                                →  31 files, 1290 passed (1290)
$ pnpm typecheck                                                           →  exit 0
$ pnpm lint                                                                →  exit 0
$ pnpm knip                                                                →  exit 0
$ pnpm build:backend                                                       →  exit 0
$ pnpm check:bundle
  packages/backend/dist/index.js: 1 import specifier(s): crypto            →  exit 0
$ git diff --exit-code 383ee18 -- 01-01..01-29 PLANs, 01-VERIFICATION.md,
                                   01-REVIEW.md, 01-UAT.md
  CLEAN (exit 0)
```

Baseline entering the wave was 31 files / 1275 tests; the wave added 15 assertions and removed none.

## What this makes detectable, and what it does not

**In one sentence:** a receiver KEY bound through an operator INITIALIZER is now read the way the identical expression has always been read at the key site, in both binding spellings, with the two clauses that overstated their reach rewritten from the code and probed at branch granularity — and this does **not** close the class: a destructured operator literal, a parameter, a loop binding, a cross-file binding and a second hop of key are each still outside the walk, each now as a row with an executed probe rather than as a sentence.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The two clause corrections had to land in Task 1, not Task 2**
- **Found during:** Task 1, immediately after the widening
- **Issue:** The plan assigns the `constStrings` / `literalsOf` corrections and the handoff discharge to Task 2. But wave 29's `handoff … — the falsified phrase is STILL false` cases go RED the instant the widening lands, and Task 1's own acceptance criteria require `pnpm test` to pass with zero failures. The two requirements are incompatible as written.
- **Fix:** The corrections, the two branch probes, the handoff deletion and the pin decrement landed in Task 1's commit (`b9f1edb`) — which still satisfies the plan's stronger requirement that they land **in the same commit as the code**. The plan's evidence requirement was preserved: the handoff was RUN and observed RED **before** the entries were deleted, and both assertion messages are pasted in section 7.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`, `.planning/REQUIREMENTS.md`
- **Verification:** section 7's RED output; `FALSIFIED_HANDOFFS` pinned at 4; `pnpm test` green at every task boundary
- **Committed in:** `b9f1edb`

**2. [Rule 1 - Bug] The review's proposed unreadable-operand rule was wrong when measured**
- **Found during:** Task 1
- **Issue:** Implementing `mark the name an assembly if ANY operand is unreadable` verbatim produced `outbound-unanalysable` for `b ? "requests" : someName` (inline twin: `outbound-send`), reported for `b ? someName : otherName` (inline twin: silent), called `const i = b ? 0 : 1` an assembled name, and made `const k = b ?? "requests"` unanalysable — failing this plan's own truth that the `??` initializer answers as the conditional does.
- **Fix:** The arm was read off `keyReceiver`'s two UNREADABLE branches instead — `isAssembledKey(operand)` or an operand already in `assembledNames`. Both readings' full measurements are in the docblock in `RECEIVER_OPERATORS`' shape and in section 3.
- **Verification:** every twin matches; real tree ZERO under both readings; the four exempt sites quiet under both
- **Committed in:** `b9f1edb`

**3. [Rule 2 - Missing Critical] Two silent shapes found by measurement that no artifact named**
- **Found during:** Tasks 2 and 3, by running shapes rather than reading lists
- **Issue:** A DESTRUCTURED OPERATOR literal is silent (the descent is wired at the identifier branches only), and a CROSS-FILE key had been named in residual prose since CR-09 and executed nowhere.
- **Fix:** Two new `measured-silence` rows, `silence-destructured-operator-key` and `silence-cross-file-key`, each with an executed probe and counter-probe, plus residual paragraphs (b3) and (b4). Registry 39 → 41.
- **Committed in:** `493b972`

**4. [Rule 1 - Bug] Two clause drafts named their owning wave in prose**
- **Found during:** Task 3, by wave 29's own `no corrected clause names its owning wave in prose` guard
- **Issue:** Both new silence clauses read `NAMED BY MEASUREMENT in wave 30`, which the guard forbids — the owner belongs in `FALSIFIED_HANDOFFS`, where discharging and deleting are one act.
- **Fix:** Reworded to `NAMED BY MEASUREMENT on 2026-08-24 (CR-13)`. **Fixed at the clause, never at the guard.**
- **Committed in:** `493b972`

---

**Total deviations:** 4 auto-fixed (1 blocking, 2 bugs, 1 missing critical)
**Impact on plan:** No scope creep. Deviation 1 resolves a contradiction inside the plan's own task split while preserving both of its substantive requirements. Deviations 2, 3 and 4 are the measurement discipline and wave 29's guards working exactly as designed.

## Issues Encountered

None beyond the deviations above. Three prettier round-trips were needed after scripted code insertion (`pnpm exec prettier --write`), none changing behaviour or the generated span. Wave 29's deviation-1 lesson was applied throughout: **every task was committed before any mutation was planted**, so `git checkout --` restored to a meaningful state on all three proofs.

## Known Stubs

None.

## Threat Flags

None. This plan adds no network, auth, file-access or schema surface — it widens a TEST-ONLY AST walk. `T-01-SC` is **NOT APPLICABLE**: no package was installed and no manifest was modified.

## User Setup Required

None.

## Next Phase Readiness

- **Wave 31 (CR-12)** owns `assembledNames`, `receiverAliases` and `isFetchExpression`; the `FALSIFIED_HANDOFFS` pin falls from 4 to 1. Its logical-assignment shape was MEASURED in this session and is still silent: `let k; k ||= b ? "requests" : "net"; sdk[k].send(req)` → `[]`. The widening this plan landed does **not** reach it, and this plan claims nothing about it.
- **Wave 32 (CR-11)** owns `silence-operator-around-global-receiver` — pin falls to 0 — **and owns CORE-11's checkbox**, against a discharge table whose every row is discharged. Two of the eight enumerated rows' blocking shapes are closed here.
- **Opened by this plan and belonging to nobody's wave yet:** `silence-destructured-operator-key`. The descent is wired at `collect`'s two IDENTIFIER branches; the two binding-pattern branches read `destructuredInitializer` through `isAssembledKey` alone. Closing it is IN-26's shape one operator over and needs its own real-tree measurement.
- **Also carried forward from wave 29 and still nobody's:** `globalNameOf`'s clause names `member of a global receiver` and `outboundCtorOf`'s names `on a global receiver`, and NEITHER function has that branch. Both phrasings remain deliberately outside `BRANCH_VOCABULARY` — a live instance of limit (b), unbound and disclosed.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-24*

## Self-Check: PASSED

All four modified files exist on disk; all four commits (`b9f1edb`, `a652e37`, `493b972`, `679d5ff`) exist in git history; `git diff --diff-filter=D --name-only 383ee18 HEAD` reports no deleted files.
