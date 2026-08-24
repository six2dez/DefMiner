---
phase: 01-skeleton-persistence-compatibility
plan: 32
subsystem: testing
tags: [typescript, ast, gate, outbound-prohibition, residual, core-11]

requires:
  - phase: 01-skeleton-persistence-compatibility
    provides: "wave 29's clause-to-branch mechanism (BRANCH_VOCABULARY, FALSIFIED_HANDOFFS), wave 30's operatorLiteralBinding, wave 31's ASSIGNING_OPERATORS"
provides:
  - "operatorOperandMatching — ONE shared operator descent reached from SIX global resolvers"
  - "bareFetchCallee — the sixth site, found by measurement after the descent was wired"
  - "reportReceiverMembers — one definition of what a destructure off an identified receiver binds, flat and nested"
  - "five WR-37 sibling MEASURED SILENCE rows plus IN-30's two"
  - "CORE11_BOX_EXPECTED — the first thing in this repository that can see CORE-11's checkbox"
  - "RESOLVER_EXEMPTIONS.collect and .visit rewritten at the two weights the verifier assigned"
  - "both head-side instability mechanisms stated in all three disclosures, exemplar renamed"
  - "the IN-25 correction scoped to a NAMED PROPERTY VALUE with three spread counterexamples pinned"
  - "CORE-11's discharge table re-executed row by row; the box stays [ ] with five blocking rows named"
affects: [outbound-prohibition, core-11-discharge, store-03, store-07, phase-verification]

actuals:
  tokens: 45000
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "a shared descent is a NEW CONSUMER of the existing operatorOperands statement, never a fresh copy of the operand loop"
    - "a non-generic resolver, so the coverage guard's population-2 convention can see it"
    - "a measured silence whose silence stops existing is REMOVED, never reworded into a narrower one"
    - "a checkbox whose state matters is pinned by a named constant the suite asserts"

key-files:
  created: []
  modified:
    - packages/backend/src/outbound-prohibition.spec.ts
    - packages/backend/src/store/observations.ts
    - packages/backend/src/store/observations.spec.ts
    - packages/backend/src/store/schema.spec.ts
    - packages/backend/src/store/error-redaction.spec.ts
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
    - .planning/WINDOWS.md

key-decisions:
  - "P32-D1: the shared descent answers WHICH OPERAND matched rather than the answer, so it needs no generic type parameter — a generic `function f<T>(` matches neither declaration pattern the coverage guard enumerates, and a generic here would have been a resolver the guard could not see"
  - "P32-D2: `bareFetchCallee` is kept NARROWER than `isFetchExpression` deliberately — routing the bare-call rule through `isFetchExpression` would report `globalThis.fetch(url)` TWICE, a behaviour change dressed as a collapse"
  - "P32-D3: `silence-operator-around-global-receiver` REMOVED rather than reworded — re-measurement found no surviving silence, and a measured-silence row that measures no silence is a fiction"
  - "P32-D4: WR-33 honoured at the verifier's SPLIT weights — `collect` materially false, `visit` misleading rather than false; writing the second as flatly false would borrow weight a measurement declined to give it"
  - "P32-D5: CORE-11's box STAYS `[ ]`. All 35 discharge probes report, but WR-37's five siblings are one-hop bindings of `sdk.requests` that stay silent while six other one-hop binding spellings report — the gate cannot go red on spellings clauses 2 and 3 enumerate"
  - "P32-D6: the nested destructure is closed and its five siblings are not, and the distinction is CLASS not effort — a composition of two already-resolved shapes versus five genuine widenings each needing its own real-tree measurement"

patterns-established:
  - "Pattern: measure all spellings BEFORE writing a line of code; where prediction and measurement disagree, the measurement wins and the discrepancy is recorded"
  - "Pattern: commit, then mutate, then restore with `git diff --exit-code`; never mutate an uncommitted tree"
  - "Pattern: a widening's handoff entries are observed RED before they are deleted, in the same commit as the code"

requirements-completed: [STORE-03, STORE-07]  # CORE-11 DELIBERATELY OMITTED — see deviation 5

coverage:
  - id: D1
    description: "An operator around a global receiver resolves in call position AND in initializer position, through ONE shared descent reached from six resolvers"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through operatorOperandMatching: AN OPERATOR AROUND A GLOBAL RECEIVER RESOLVES, IN CALL POSITION"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through operatorOperandMatching: AN OPERATOR AROUND A GLOBAL RECEIVER RESOLVES IN INITIALIZER POSITION TOO"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#registry row operatorOperandMatching — its probe AND its counter-probe are executed against auditSource"
        status: pass
    human_judgment: false
  - id: D2
    description: "The must-stay-quiet twin and the mirror case: an operator over ordinary objects stays silent; the surface as GUARD reports, and that cost is pinned"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through operatorOperandMatching: THE MUST-STAY-QUIET TWIN"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#through operatorOperandMatching: THE MIRROR CASE AND ITS COST, PINNED"
        status: pass
    human_judgment: false
  - id: D3
    description: "A nested destructure of a receiver reports; its five siblings are measured silences with executed probes"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#registry row reportReceiverMembers — its probe AND its counter-probe are executed against auditSource"
        status: pass
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#registry row silence-array-slot-receiver / silence-object-literal-property-receiver / silence-class-field-receiver / silence-parameter-default-receiver / silence-for-of-binding-receiver"
        status: pass
    human_judgment: false
  - id: D4
    description: "CORE-11's checkbox state is pinned by a named constant the suite asserts, with both revert hashes and the same-commit rule in the failure message"
    requirement: "CORE-11"
    verification:
      - kind: unit
        ref: "packages/backend/src/outbound-prohibition.spec.ts#CORE-11's entry is present and well-formed, and ITS BOX IS THE STATE `CORE11_BOX_EXPECTED` PINS"
        status: pass
    human_judgment: false
  - id: D5
    description: "Both head-side instability mechanisms stated in all three disclosures, re-derived from observations.ts's own enumeration, with the exemplar renamed for the branch it takes"
    requirement: "STORE-03"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/observations.spec.ts#THE NO-SEPARATOR BRANCH: with no `&` inside the cut the byte cut STANDS"
        status: pass
    human_judgment: false
  - id: D6
    description: "The IN-25 correction scoped to a NAMED PROPERTY VALUE, with three spread-shaped counterexamples pinned in the same case and on the open residual list"
    requirement: "STORE-07"
    verification:
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#CORRECTED BY EXECUTION (IN-25), THEN SCOPED BY EXECUTION (WR-36)"
        status: pass
      - kind: unit
        ref: "packages/backend/src/store/error-redaction.spec.ts#RESIDUAL, STILL OPEN AFTER IN-25 AND AFTER WR-36's SCOPING"
        status: pass
    human_judgment: false
  - id: D7
    description: "CORE-11's discharge table re-executed row by row, and the box decision read off it"
    requirement: "CORE-11"
    verification: []
    human_judgment: true
    rationale: "The DISCHARGE is executed and pasted below, but the BOX DECISION is a judgment about whether five named blocking rows are bounds or open findings. It has been made wrongly twice (reverted at e7cc4b6 and faca607) and correctly once (wave 28). A verifier must re-execute the table and disagree with the reading if the reading is wrong."

duration: 31 min
completed: 2026-08-24
status: complete
---

# Phase 01 Plan 32: CR-11 in Both Directions, and CORE-11's Discharge Re-Executed Summary

**One shared operator descent reached from six global resolvers closes CR-11's unsafe half — `const g = globalThis ?? self; g.fetch(url)` now reports `outbound-fetch` — its safe half is corrected as a SAFE-direction overreach rather than inflated into a hole, and CORE-11's box stays `[ ]` with five blocking rows named after a re-executed 35-probe discharge table.**

## Performance

- **Duration:** 31 min
- **Started:** 2026-08-24T20:18:00Z (approx.)
- **Completed:** 2026-08-24T20:49:09Z
- **Tasks:** 4 of 4
- **Files modified:** 8

## Accomplishments

- CR-11's UNSAFE half closed at the seam: ONE shared descent (`operatorOperandMatching`), SIX resolvers, not six copies.
- The SIXTH resolver was found BY MEASUREMENT after the descent was wired — the bare-call rule asked its own inline question and had never consulted `isFetchExpression`.
- CR-11's SAFE half corrected as an overreach, with wave 28 credited; the row it lived on was REMOVED because its silence stopped existing.
- `FALSIFIED_HANDOFFS` drained to ZERO, both entries observed RED before deletion, in the same commit as the code.
- WR-37's nested destructure closed as a composition; its five siblings measured and carried as rows.
- WR-33 closed at the verifier's two weights; WR-34's box pin installed and mutation-proved; WR-35, WR-36, IN-27, IN-28, IN-29, IN-30 closed.
- CORE-11's discharge table re-executed: 35 probes, all report — and the box still stays `[ ]`, with five named blocking rows.

## Task Commits

1. **Task 1 (tracer): the seam — one shared operator descent** — `c1fe55c` (feat)
2. **Task 2: the nested destructure, the five siblings, unwrap's fifth wrapper** — `b30bb26` (feat)
3. **Task 3: WR-33 / WR-34 / WR-35 / WR-36 / IN-27 / IN-28** — `179df3f` (fix)
4. **Task 4: CORE-11's discharge and the two pointer histories** — `e9ed35a` (docs)

---

## 1. THE EIGHTEEN CR-11 SPELLINGS — MEASURED BEFORE ANY CODE WAS WRITTEN, AND AFTER

Executed through `auditSource` in this session. The BEFORE column was captured at `e20b80b`, before a line of the widening existed.

```
                                                     BEFORE            AFTER
A1 (b ? globalThis : self).fetch(url)                []                ["outbound-fetch"]
A2 (globalThis ?? self).fetch(url)                   []                ["outbound-fetch"]
A3 (globalThis || self).fetch(url)                   []                ["outbound-fetch"]
A4 (ok && globalThis).fetch(url)                     []                ["outbound-fetch"]
B1 (0, globalThis).fetch(url)                        ["outbound-fetch"]        ["outbound-fetch"]
B2 (globalThis).fetch(url)                           ["outbound-fetch"]        ["outbound-fetch"]
B3 (globalThis as any).fetch(url)                    ["outbound-fetch"]        ["outbound-fetch"]
B4 globalThis!.fetch(url)                            ["outbound-fetch"]        ["outbound-fetch"]
B5 (0, globalThis).eval(src)                         ["outbound-dynamic-code"] ["outbound-dynamic-code"]
B6 (0, fetch)(url)                                   ["outbound-fetch"]        ["outbound-fetch"]
C1 const g = globalThis ?? self; g.fetch(url)        []                ["outbound-fetch"]
C2 const g = b ? globalThis : self; g.fetch(url)     []                ["outbound-fetch"]
C3 const f = fetch ?? x; f(url)                      []                ["outbound-fetch"]
C4 const e = eval ?? x; e(src)                       []                ["outbound-dynamic-code"]
C5 const n = navigator ?? x; n.sendBeacon(u, d)      []                ["outbound-beacon"]
D1 new (ok && WebSocket)()                           []                ["outbound-global-ctor"]
D2 (ok && eval)(src)                                 []                ["outbound-dynamic-code"]
D3 (ok && fetch)(url)                                []                ["outbound-fetch"]
E1 (ok && navigator).sendBeacon(u, d)                []                ["outbound-beacon"]
--- controls, unchanged in both columns ---
CTRL1 (ok && sdk.requests).send(req)                 ["outbound-send"] ["outbound-send"]
CTRL2 (ok && cache).send(req)                        []                []
CTRL3 const r = ok && cache; r.send(req)             []                []
CTRL4 const c = cache ?? client; c.fetch(url)        []                []
```

That is nineteen rows, not eighteen: the plan enumerated eighteen and `E1` — `(ok && navigator).sendBeacon(u, d)` — was probed alongside them because the beacon rule reaches `isNavigatorReceiver` the same way.

**NO DISAGREEMENT WITH THE VERIFIER'S NUMBERS.** Every pre-change answer matches what `01-VERIFICATION.md` recorded, including the two the verifier found itself (`new (ok && WebSocket)()` and `(ok && eval)(src)`).

**PREDICTION-VS-MEASUREMENT DISCREPANCY, RECORDED IN `01-27-SUMMARY.md`'s SHAPE — ONE, AND IT IS THE FINDING OF THIS PLAN.**

| | |
|---|---|
| **Predicted** | Wiring the shared descent into `isFetchExpression` closes `(ok && fetch)(url)`, because `isFetchExpression` already resolves the bare-identifier spelling. |
| **Measured** | `(ok && fetch)(url)` was STILL `[]` after that wiring. |
| **Why** | The bare-call rule in the visit pass never consults `isFetchExpression` at all: it asked `ts.isIdentifier(callee) && fetchAliases.has(callee.text)` INLINE. That is a SIXTH copy of "is this the global fetch", written where nobody had looked for one — WR-27's finding (one idea written N times, therefore existing N−1 times) found a third time in this file, and found by measuring rather than by reading. |
| **Resolution** | `bareFetchCallee` declared at `auditSource`'s own indentation, reaching the same shared descent, with its own registry row and two branch probes. Recorded as a deviation below. |

## 2. THE SHARED DESCENT — ITS SOURCE, ITS SHAPE DECISION, AND ITS SIX CALL SITES

```ts
function operatorOperandMatching(
  node: ts.Expression,
  matches: (operand: ts.Expression) => boolean,
): ts.Expression | undefined {
  const operands = operatorOperands(node);
  if (operands === undefined) return undefined;
  for (const operand of operands) if (matches(operand)) return operand;
  return undefined;
}
```

**THE SHAPE DECISION AND ITS REASON, stated in the docblock** (quoted, not paraphrased):

> `operatorReceiver` is typed for a `ReceiverKind` — a THREE-state answer … and the five global resolvers answer TWO states each: a boolean, or a name. They cannot consume `operatorReceiver` without inventing a third state they have no use for. What they CAN share, and what this function shares, is the `operatorOperands` statement of WHAT COUNTS AS AN OPERATOR: this is a second consumer of that one statement in exactly the sense `operatorLiteralBinding` is, and NOT a fourth copy of it. Five independent inline operand loops would be WR-27's finding … reproduced at scale, in the plan that closes WR-27's last face.

> WHAT IT ANSWERS: THE OPERAND, NOT THE ANSWER. … That is also what keeps it inside the coverage guard's POPULATION 2 convention — a generic `function f<T>(` matches neither declaration pattern the guard enumerates, so a generic here would have been a resolver the guard could not see.

**THE SIX CALL SITES** — the plan named five; measurement produced six:

| # | Resolver | Scope | What it answers |
|---|---|---|---|
| 1 | `isGlobalReceiverIn` | module | one of the four global receivers, or a collected alias |
| 2 | `isFetchExpression` | `auditSource` | the global fetch, four spellings |
| 3 | `bareFetchCallee` | `auditSource` | **NEW** — the local NAME a call's callee spells, bare spelling only |
| 4 | `isNavigatorReceiver` | `auditSource` | `navigator`, three spellings |
| 5 | `globalNameOf` | `auditSource` | which global a spelling names (serves BOTH the call rule and the `new` rule) |
| 6 | `aliasedGlobalOf` | `auditSource` | the global an INITIALIZER denotes |

Five independent inline operand loops would have failed the plan's own criterion. There is one loop, in one function, and the coverage guard sees it: `every member of BOTH populations is a registry row OR a named, reasoned exemption` is green with `operatorOperandMatching` and `bareFetchCallee` as registry rows.

**THE MUST-STAY-QUIET TWIN, EXECUTED:**

```
(ok && cache).fetch(url)                                     []
(cache && client).fetch(url)                                 []
(ok && cache).sendBeacon(u, d)                               []
new (ok && Widget)()                                         []
const r = ok && cache; r.send(req)                           []
const c = cache ?? client; c.fetch(url)                      []
const o = { fetch(u) {} }; const f = o.fetch ?? x; f(url)    []
```

**THE EITHER-SIDE COST, PINNED RATHER THAN LEFT IMPLICIT** — the mirror case where the surface is the GUARD and not the value:

```
(globalThis && ok).fetch(url)                ["outbound-fetch"]
(fetch && ok)(url)                           ["outbound-fetch"]
const g = globalThis && ok; g.fetch(url)     ["outbound-fetch"]
```

Over-approximation, the same direction `RECEIVER_OPERATORS`' docblock records for `(sdk.requests && ok).send(req)`, with its own fixture.

## 3. THE SILENCE ROW'S DISPOSITION — DECIDED BY MEASUREMENT, AND IT IS REMOVAL

After the widening, every shape the row and its falsified marker named between them reports. Probed for a surviving silence in the row's own class:

```
(ok && globalThis)["fet" + "ch"](url)                        ["outbound-unanalysable"]
(ok && globalThis).eval(src)                                 ["outbound-dynamic-code"]
new (ok && globalThis).WebSocket()                           ["outbound-global-ctor"]
const { fetch: f } = ok && globalThis; f(url)                ["outbound-fetch"]
(ok && globalThis).navigator.sendBeacon(u, d)                ["outbound-beacon"]
(ok && sdk).requests.send(req)                               ["outbound-send"]
sdk[ok && "requests"].send(req)                              ["outbound-send"]
const g = ok && globalThis; const h = g; h.fetch(url)        ["outbound-fetch"]
```

**Nothing in the class is silent.** Two shapes remain `[]` — `function h(g) { g.fetch(url); } h(ok && globalThis)` and `[ok && globalThis][0].fetch(url)` — and neither is this row's subject: the operator resolves in both; what does not resolve is the function boundary (long-disclosed residual (a)) and the array-element position (a new row of its own, §5).

**THE ROW WAS REMOVED, WITH THE REMOVAL RECORDED IN THE FILE** rather than reworded:

> `silence-operator-around-global-receiver` STOOD HERE AND IS REMOVED, 2026-08-24 (CR-11). It is not reworded and it is not narrowed: the silence it measured NO LONGER EXISTS. … A measured-silence row that no longer measures a silence is a fiction, and re-wording it into a narrower silence that also does not exist would be the same defect with a fresher date.

Its `QUANTIFIED_CLAUSES` entry and its `FALSIFIED_HANDOFFS` entry were deleted in the same commit. The guard case that named it was rewritten to assert its ABSENCE with the reason, rather than dropped:

```
"row `silence-operator-around-global-receiver` is BACK in the registry. It was removed on
 2026-08-24 (CR-11) because the silence it measured stopped existing … If an operator around
 a global receiver has gone silent again, that is a REGRESSION in the descent and not a row to
 restore; if a NEW and genuinely different silence was found, give it its own id and its own
 measured probe."
```

## 4. THE SAFE HALF, IN ONE SENTENCE

CR-11's safe half ran in the **SAFE direction** — six spellings (`(0, globalThis).fetch(url)`, `(globalThis)`, `(globalThis as any)`, `globalThis!`, plus the `eval` and bare-`fetch` twins the verifier found) REPORTED while the row said an operator wrapping a global receiver was silent in every spelling, so the gate reached FURTHER than its own text and no reader could have shipped an outbound call believing it would be caught; wave 28 disclosed one instance of this UNPROMPTED, in ledger prose, naming the correct and complete mechanism (`unwrap` strips the wrapper before any receiver resolver is reached), and the review found four spellings of that one mechanism while the verifier found two more — an **overreach to correct**, not a hole, and it borrows none of CR-11's blocker weight, which comes entirely from the undisclosed initializer half.

It is also not understated: it shipped byte-identically into `.planning/REQUIREMENTS.md` on the very row CORE-11's `[ ]` was blocked on.

## 5. WR-37 — THE NESTED DESTRUCTURE CLOSED, ITS FIVE SIBLINGS MEASURED

```
const { requests: { send } } = sdk;   send(req)      ["outbound-send"]     <- CLOSED
const { net: { connect } } = sdk;     connect(h)     ["outbound-net"]      <- CLOSED
--- both halves, pinned as controls beside it ---
const { requests } = sdk;             requests.send(req)   ["outbound-send"]
const { send } = sdk.requests;        send(req)            ["outbound-send"]
--- the two negatives that must survive the widening ---
const { requests: { get } } = sdk;    get(id)              []   (read-only allowlist)
const { cache: { send } } = app;      send(req)            []   (receiver anchoring)
```

**WHY THIS ONE AND NOT ITS SIBLINGS**, stated in the code:

> The nested destructure is a COMPOSITION of two shapes this gate already resolves: the outer element names a receiver the way `const { requests } = sdk` does, and the inner names are members of it the way `const { send } = sdk.requests` are. Nothing new has to be decided. Its five siblings … are each a GENUINE WIDENING: each teaches the walk to read an initializer SHAPE it has never read, each therefore needs its own real-tree measurement, and each is carried as a MEASURED SILENCE row with an executed probe rather than closed here without one.

**THE FIVE SIBLING ROWS, probe and counter-probe both executed:**

```
silence-array-slot-receiver              probe=[] counter=["outbound-send"]
   const [r] = [sdk.requests]; r.send(req)                    []
   const a = [sdk.requests]; a[0].send(req)                   []
silence-object-literal-property-receiver probe=[] counter=["outbound-send"]
   const o = { r: sdk.requests }; o.r.send(req)               []
silence-class-field-receiver             probe=[] counter=["outbound-send"]
   class C { r = sdk.requests; m() { this.r.send(req); } }    []
silence-parameter-default-receiver       probe=[] counter=["outbound-send"]
   function f(r = sdk.requests) { r.send(req); }              []
silence-for-of-binding-receiver          probe=[] counter=["outbound-send"]
   for (const r of [sdk.requests]) { r.send(req); }           []
```

Every one of the five rows carries the sentence **"Residual (b) is written about KEYS ONLY and does not cover this"** (the parameter and loop-binding rows say it in the sharper form: "Residual (b) names a parameter for KEYS ONLY, so a reader checking it there will not find this RECEIVER twin"). That sentence is the whole reason they are rows rather than a line in (b).

**IN-30's TWO CONTRIVED SPELLINGS, carried as measured silences with their mechanisms:**

```
silence-tagged-template-key         const k = String.raw`requests`; sdk[k].send(req)  []
                                    counter: const k = "requests"; sdk[k].send(req)   ["outbound-send"]
silence-doubled-global-receiver     globalThis.globalThis.fetch(url)                  []
                                    counter: globalThis.fetch(url)                    ["outbound-fetch"]
```

**IN-29 — `unwrap`'s FIFTH WRAPPER.** It IS probeable in `.ts` source (fixtures parse as `ts.ScriptKind.TS`, where `<any>x` is a type assertion and not JSX), so a real probe was written rather than a stated limit:

```
const g = <any>globalThis; g.fetch(url)     ["outbound-fetch"]
(<any>globalThis).fetch(url)                ["outbound-fetch"]
cache.fetch(url)                            []                  (control)
```

## 6. THE CLAUSES CORRECTED — BEFORE AND AFTER

**`isFetchExpression`** — before:

> the global fetch in three spellings - bare, on any of the four global receivers, or through an alias - and NOT a fetch method of an ordinary object. FALSIFIED 2026-08-24 (CR-12), the phrase this clause used to carry: "in every reachable spelling" - measured, an operator wrapping the bare global, (ok && fetch)(url), reaches no branch here

after:

> the global fetch in **four** spellings - bare, on any of the four global receivers, through an alias, **or an operator around the bare global** - and NOT a fetch method of an ordinary object. FALSIFIED 2026-08-24 (CR-12), the phrase this clause used to carry: "in every reachable spelling" - measured, an operator wrapping the bare global, (ok && fetch)(url), **reached** no branch here; **that shape is CLOSED 2026-08-24 (CR-11) by operatorOperandMatching and the branch below is its probe, and closing it took a SIXTH site as well - bareFetchCallee - because the bare-call rule asked the same question INLINE and never consulted this function at all; and the phrase STAYS falsified because a receiver crossing a function boundary, a parameter, an array-slot binding and a class field each still reach no branch here**

**`initializerReceiver`** — before:

> a NAME for receiverKind since wave 25, so initializer position and call position give the same answer and the `??` precedence bug … is gone

after (the added half):

> **CORRECTED 2026-08-24 (CR-11): that promise was true of THIS resolver and FALSE of the global ones, which is what actively misled a reader about `const g = globalThis ?? self` - an initializer that aliased a global receiver through an operator grew nothing while the SDK twin resolved; the global resolvers now answer the same in both positions through the shared operator descent, and the branch below is its probe**

**`unwrap`** — gains `an angle-bracket type assertion` in its enumeration plus the IN-29 note. **`destructuredInitializer`** — gains the WR-37 correction: what it reads is the ASSEMBLY a KEY is built from and nothing else.

**Wave 29's vocabulary-coverage guard passes**, and it is what forced each of these to carry a probe:

```
✓ BRANCH_VOCABULARY is NON-EMPTY, every phrase in it occurs in at least one clause, and the hit count is PINNED
✓ every BRANCH_VOCABULARY phrase present in a clause has a BRANCH answering it
✓ every branch anchor still EXISTS, AT A DECLARATION OR A BRANCH OPENING, in this file
✓ every RESOLVER row carries at least one branch
✓ every clause carrying a DECLARED quantifier phrasing names a MEASURED bound
✓ the quantifier scan catches the universals this round falsified — and records the ROW that stopped existing
✓ every member of BOTH populations is a registry row OR a named, reasoned exemption
```

Pins moved in the same commits as the wording: vocabulary hits 74 → 80 → 83; branch probes 91 → 97 → 100; rows carrying branches 33 → 35 → 36; population-2 functions 39 → 41 → 42; quantifier hits 11 → 10; registry rows 43 → 51.

## 7. THE HANDOFFS — OBSERVED DOING THEIR JOB, THEN DRAINED TO ZERO

With the widening applied and both entries still present, wave 29's mechanism went RED and named the row, the phrase and the owning wave:

```
FAIL … handoff isFetchExpression / CR-12 / wave 32 — the falsified phrase is STILL false, measured
AssertionError: handoff `isFetchExpression` (CR-12) records that the phrase "in every reachable
spelling" is FALSE of this probe, and that the probe answers [] while the handoff is OPEN. It no
longer does. If wave 32 widened the code, that is the widening working — now RE-ADD the phrase to
row `isFetchExpression`'s clause WITH its branch probe, and DELETE this handoff entry and its pin,
in this same commit. …: expected [ 'outbound-fetch' ] to deeply equal []

FAIL … handoff silence-operator-around-global-receiver / CR-11 / wave 32 …
AssertionError: handoff `silence-operator-around-global-receiver` (CR-11) records that the phrase
"silent in every spelling" is FALSE of this probe … It no longer does.
…: expected [ 'outbound-fetch' ] to deeply equal []
```

Both were then deleted **in the same commit as the code** (`c1fe55c`), and the pin decremented 2 → 0.

```
FALSIFIED_HANDOFFS.length === 0        6 (wave 29) -> 4 (wave 30, CR-13)
                                         -> 2 (wave 31, CR-12) -> 0 (wave 32, CR-11)
✓ FALSIFIED_HANDOFFS is well-formed and its count is PINNED — expected to FALL to zero
```

The pin's message now records ZERO as the designed end state and says what a non-zero count would mean afterwards, so no later wave has to delete an assertion.

## 8. WR-33 — THE TWO EXEMPTION REASONS, AT TWO WEIGHTS

**`collect`** — before: *"the first document-order pass. It invokes the collectors and records bindings; **it decides nothing about what an expression IS**."*

after (full weight):

> the first document-order pass: it invokes the collectors and records bindings. **IT ALSO DECIDES TWO THINGS INLINE, and both are POPULATION 3 in this guard's own terms** - residue enumerated by neither half. (1) Its ASSIGNING_OPERATORS test decides which right-hand expressions ever reach a resolver at all, which is the entirety of CR-12. (2) Its `+=` compound-assembly branch decides that a string accumulation makes a name an UNREADABLE key. Neither decision is a registered mechanism; what covers them instead is the fixtures and the per-operator BranchProbes on the clauses they feed.

**`visit`** — before: *"… **every resolution it performs is delegated to a registered mechanism**."*

after (the verifier's weight, with the distinction stated and NOT flattened to "false"):

> the second document-order pass: it applies the rules to the bindings collect() produced, and **each INDIVIDUAL resolution it performs IS delegated** to a registered mechanism - unwrap, receiverKind, literalOf and the global resolvers are all registry rows. **WHAT IS NOT REGISTERED IS THE DISPATCH**: which resolver is consulted where. visit chooses unwrap for a call callee and never operatorReceiver, and that choice is the seam CR-11 lived in. TWO FURTHER RULES ARE DECIDED INLINE HERE …: the require(...) specifier rule, and the navigator-destructure rule.

The comment above each rewrite states why the two are at different weights. `✓ the exemption list is NON-EMPTY and every entry carries a reason` passes.

## 9. WR-34 — THE BOX PIN, AND ITS FULL FAILURE MESSAGE

```ts
const CORE11_BOX_EXPECTED = "- [ ] **CORE-11**";
```

Installed in task 3 at the box's **CURRENT** state; task 4 decided whether it moves, and it did not. The assertion keeps the existing row-count check beside it (a state check against zero rows would pass having measured the wrong thing). Executed failure message, from mutation proof 6:

```
CORE-11's checkbox in .planning/REQUIREMENTS.md is not the state this suite pins.
  PINNED  : - [x] **CORE-11**
  SHIPPED : - [ ] **CORE-11**: No co

This box has been flipped early and REVERTED TWICE — at `e7cc4b6` after gap-closure round 3 and at
`faca607` after round 4 — and until 2026-08-24 the one case named for it could not see it: its regex
was the character class `[ x]`, which matches BOTH states, so it stayed green through both flips and
both reverts.

THERE IS EXACTLY ONE LEGITIMATE WAY OUT AND EDITING THIS CONSTANT ON ITS OWN IS NOT IT.
`CORE11_BOX_EXPECTED` changes in the SAME COMMIT as the ledger row AND as a re-executed discharge
table that probes every surface CORE-11's own first sentence enumerates — with, per row, the rule
identifier the probe produced, the fixture that asserts it and the plan that watched that fixture
fail. If ANY enumerated surface still carries a named blocking shape, the box stays `[ ]`, that row
is named in the ledger, and this constant says `[ ]`. `[ ]` IS A CORRECT OUTCOME; an unexamined `[x]`
is not.: expected false to be true
```

The plan-level automated `<verify>` grep stays STATE-AGNOSTIC (`grep -cE '^- \[[ x]\] \*\*CORE-11\*\*'` → `1`), by design and unchanged. The grep asserts the entry is present and well-formed; the constant asserts which state it is in.

## 10. WR-35 — THE HEAD-SIDE SWEEP, RE-RUN, WITH TAILS

Re-executed in this session (not read off the review's table):

```
head unstable band: 2019 2020 2021 2022 2023 2024 2025 2026 2027 2028 2029
n=2019 len1=2048 len2=2047 tail1="pppp;jsessionid=" tail2="ppppp;<redacted>" lastSeg=HAS `=` valueHalfLen=0
n=2020 len1=2048 len2=2048 tail1="ppppp;jsessionid" tail2="ppppp;<redacted>" lastSeg=NO `=`
n=2021 len1=2048 len2=2048 tail1="pppppp;jsessioni" tail2="pppppp;<redacted" lastSeg=NO `=`
n=2022 len1=2048 len2=2048 tail1="ppppppp;jsession" tail2="ppppppp;<redacte" lastSeg=NO `=`
n=2023 len1=2048 len2=2048 tail1="pppppppp;jsessio" tail2="pppppppp;<redact" lastSeg=NO `=`
n=2024 len1=2048 len2=2048 tail1="ppppppppp;jsessi" tail2="ppppppppp;<redac" lastSeg=NO `=`
n=2025 len1=2048 len2=2048 tail1="pppppppppp;jsess" tail2="pppppppppp;<reda" lastSeg=NO `=`
n=2026 len1=2048 len2=2048 tail1="ppppppppppp;jses" tail2="ppppppppppp;<red" lastSeg=NO `=`
n=2027 len1=2048 len2=2048 tail1="pppppppppppp;jse" tail2="pppppppppppp;<re" lastSeg=NO `=`
n=2028 len1=2048 len2=2048 tail1="ppppppppppppp;js" tail2="ppppppppppppp;<r" lastSeg=NO `=`
n=2029 len1=2048 len2=2048 tail1="pppppppppppppp;j" tail2="pppppppppppppp;<" lastSeg=NO `=`
markerCut n=2010 len=2048 tail="ppppp;jsessionid=<redacted" stable=true
```

**Read off that output, not off the review:**

- **n=2019 is the FIRST unstable offset** and its final `;` segment **HAS an `=` with an EMPTY value half** — CR-07's padding branch, which redacts the segment whole and **SHRINKS by one byte** (2048 → 2047). The fixture builds its exemplar on `headUnstable[0]`, so this is the branch the exemplar exhibits.
- **n=2020..2029 have no `=` at all** — P10-D1's whole-segment branch, and the length does **not** shrink.

All three disclosures named the second mechanism alone. Corrected in all three files, **re-derived from `observations.ts`'s own WR-22 paragraph** sixty lines above the one that had paraphrased it down to one, rather than re-authored from the review.

**THE RENAME DIFF** (the exemplar named for the branch it takes):

```diff
-    const nameCut = normaliseObservedUrl(
+    const emptyValueCut = normaliseObservedUrl(
       `https://cdn.test/${"p".repeat(headUnstable[0])};jsessionid=SECRETSESSION`,
     );
-    expect(nameCut.length).toBe(URL_MAX);
-    expect(nameCut.slice(-12)).toBe(";jsessionid=");
-    const nameCutTwice = normaliseObservedUrl(nameCut);
+    expect(emptyValueCut.length).toBe(URL_MAX);
+    expect(emptyValueCut.slice(-12)).toBe(";jsessionid=");
+    const emptyValueCutTwice = normaliseObservedUrl(emptyValueCut);
```

and a REAL `nameCut` was added beside it, taken from the LAST member of the band, with the discriminator asserted rather than described: its final `;` segment carries no `=`, it is unstable, and it does **not** shrink — plus `expect(emptyValueCutTwice.length).toBe(emptyValueCut.length - 1)` as the pair's discriminator.

**IN-28** — `schema.spec.ts`'s two bare numbers ("a sweep of the **71** head lengths … finds **11** that are not fixed points") replaced by what the assertions enforce:

> WHAT THE SWEEP ASSERTS IS THE INSTABILITY'S SHAPE, NOT A COUNT (IN-28, 2026-08-24): that the unstable set is NON-EMPTY, CONTIGUOUS and STRICTLY INTERIOR to the swept range. Two bare numbers stood here — a range width and a band size — with no derivation behind either, which is the defect the sibling fixture states in its own words: a number with no derivation goes RED for the wrong reason the day a constant moves.

## 11. WR-36 — THE IN-25 CORRECTION, SCOPED, WITH ALL FIVE SHAPES MEASURED

```
named property value (o.m)        ["unredacted-object-value"]
named property value (direct)     ["unredacted-object-value"]
spread { ...e }                   []
Object.assign({}, e)              []
structuredClone(e)                []
plain + accumulator               ["unredacted-concat"]      (the other corrected half)
```

The correction now reads *"a value routed through an object literal **AS A NAMED PROPERTY VALUE** reports … **A SPREAD IS NOT, and that is the SCOPE OF THE CORRECTION rather than a footnote to it**"*, and the three spread shapes are pinned in the **SAME case** as the two firing ones — so a reader meets the boundary where it is rather than two hundred lines away — and added to the open residual case, whose title now names them.

**IN-27** — the multi-valued reader and the single-valued one each carry the docblock that describes them; the paragraph that said `undefined` about a function returning `ReadonlySet<string>` was moved to `literalOf`, which does return it, with the stale-since-CR-10 provenance recorded.

## 12. CORE-11's DISCHARGE — RE-EXECUTED ROW BY ROW IN THIS SESSION

**THE ORDERING FIRST.** Both byte comparisons ran GREEN at `2026-08-24T20:43:50Z`, **before the first discharge probe**, and again at `2026-08-24T20:46:00Z` after the ledger edit:

```
✓ the shipped block carries exactly ONE entry per registry row — a truncated block FAILS
✓ the block shipped in .planning/REQUIREMENTS.md equals deriveResidual(RESOLVER_REGISTRY), byte for byte
✓ the ledger's block carries exactly ONE entry per registry row — a truncated ledger block FAILS
✓ the block shipped in the gate header equals deriveResidual(RESOLVER_REGISTRY), byte for byte

generated                                          sha256=f850802f402eabb2 lines=510 entries=51
packages/backend/src/outbound-prohibition.spec.ts  sha256=f850802f402eabb2 lines=510 entries=51 equalsGenerated=true
.planning/REQUIREMENTS.md                          sha256=f850802f402eabb2 lines=510 entries=51 equalsGenerated=true
RESOLVER_REGISTRY.length=51
```

**THE TABLE, in wave 28's column shape.** Every probe executed through `auditSource` in this session.

| Enumerated surface | Probe executed here | Reports | Fixture that asserts it | Plan that watched it fail | Verdict |
|---|---|---|---|---|---|
| no `caido:http` fetch | `import { request } from "caido:http"` | `outbound-import` | `control — import ... from "caido:http" is still caught` | 01-12 | ✓ |
| | `const s = b ? "caido:http" : "crypto"; import(s)` | `outbound-unanalysable` | `registry row operatorLiteralBinding` | 01-30 | ✓ |
| | `require("caido:http")` | `outbound-import` | `outbound-import fires on all four specifier forms` | 01-12 | ✓ |
| no `sdk.requests.send` in any spelling | `sdk.requests.send(req)` | `outbound-send` | `outbound-send fires on the direct call` | 01-12 | ✓ |
| | `const k = b ? "requests" : "net"; sdk[k].send(req)` | `outbound-send` | `branch constStrings / an operator initializer` | 01-30 | ✓ |
| | `let r; r ??= sdk.requests; r.send(req)` | `outbound-send` | `through receiverAliases' LOGICAL-ASSIGNMENT branch … CR-12 shape 1 of 9` | 01-31 | ✓ |
| | `(ok && sdk.requests).send(req)` | `outbound-send` | `registry row operatorReceiver` | 01-25 | ✓ |
| | `const s = sdk.requests.send; s(req)` | `outbound-send` | `previously MISSED — const s = sdk.requests.send; s(q) now reports` | 01-12 | ✓ |
| | **`const [r] = [sdk.requests]; r.send(req)`** | **`[]`** | `registry row silence-array-slot-receiver` | 01-32 | ✗ **BLOCKED** |
| | **`const o = { r: sdk.requests }; o.r.send(req)`** | **`[]`** | `registry row silence-object-literal-property-receiver` | 01-32 | ✗ **BLOCKED** |
| no method of an identified `requests`/`net` receiver | `sdk.requests.sendRaw(req)` | `outbound-send` | `previously MISSED — sdk.requests.sendRaw(q) now reports` | 01-12 | ✓ |
| | `sdk[b ? "requests" : "net"].connect(h)` | `outbound-send` | `branch keyReceiver / any literal binding` | 01-18 | ✓ |
| | `const { requests: { send } } = sdk; send(req)` | `outbound-send` | `registry row reportReceiverMembers` | 01-32 | ✓ |
| | `sdk.net.connect(h, p)` | `outbound-net` | `outbound-net fires on sdk.net.connect …` | 01-12 | ✓ |
| | **`class C { r = sdk.requests; m() { this.r.send(req); } }`** | **`[]`** | `registry row silence-class-field-receiver` | 01-32 | ✗ **BLOCKED** |
| | **`function f(r = sdk.requests) { r.send(req); }`** | **`[]`** | `registry row silence-parameter-default-receiver` | 01-32 | ✗ **BLOCKED** |
| | **`for (const r of [sdk.requests]) { r.send(req); }`** | **`[]`** | `registry row silence-for-of-binding-receiver` | 01-32 | ✗ **BLOCKED** |
| no global `fetch` by any receiver or alias | `fetch(url)` | `outbound-fetch` | `outbound-fetch fires on a call to the bare global` | 01-12 | ✓ |
| | `(ok && globalThis).fetch(url)` | `outbound-fetch` | `through operatorOperandMatching: … IN CALL POSITION` | 01-32 | ✓ |
| | `const g = globalThis ?? self; g.fetch(url)` | `outbound-fetch` | `through operatorOperandMatching: … IN INITIALIZER POSITION TOO` | 01-32 | ✓ |
| | `(ok && fetch)(url)` | `outbound-fetch` | `branch bareFetchCallee / an operator around the bare global` | 01-32 | ✓ |
| | `let g; g ??= globalThis; g.fetch(url)` | `outbound-fetch` | `branch globalThisAliases / a logical assignment` | 01-31 | ✓ |
| no `XMLHttpRequest`/`WebSocket`/`EventSource` | `new WebSocket(u)` | `outbound-global-ctor` | `previously MISSED — new WebSocket("wss://...") now reports` | 01-12 | ✓ |
| | `new (ok && WebSocket)()` | `outbound-global-ctor` | `through operatorOperandMatching: … IN CALL POSITION` | 01-32 | ✓ |
| | `const W = WebSocket; new W(u)` | `outbound-global-ctor` | `branch outboundCtorOf / through an alias` | 01-19 | ✓ |
| | `new XMLHttpRequest()` / `new EventSource(u)` | `outbound-global-ctor` | `registry row outboundCtorOf` | 01-12 | ✓ |
| no `navigator.sendBeacon` | `navigator.sendBeacon(u, d)` | `outbound-beacon` | `registry row isNavigatorReceiver` | 01-16 | ✓ |
| | `(ok && navigator).sendBeacon(u, d)` | `outbound-beacon` | `through operatorOperandMatching: … IN CALL POSITION` | 01-32 | ✓ |
| | `const n = navigator ?? x; n.sendBeacon(u, d)` | `outbound-beacon` | `through operatorOperandMatching: … IN INITIALIZER POSITION TOO` | 01-32 | ✓ |
| | `let n; n ??= navigator; n.sendBeacon(u, d)` | `outbound-beacon` | `branch navigatorAliases / a logical assignment` | 01-31 | ✓ |
| no dynamic code construction | `eval(src)` | `outbound-dynamic-code` | `registry row dynamicCodeOf` | 01-16 | ✓ |
| | `(ok && eval)(src)` | `outbound-dynamic-code` | `through operatorOperandMatching: … IN CALL POSITION` | 01-32 | ✓ |
| | `const e = eval ?? x; e(src)` | `outbound-dynamic-code` | `through operatorOperandMatching: … IN INITIALIZER POSITION TOO` | 01-32 | ✓ |
| | `new Function("a", src)` / `const F = Function; new F("a", src)` | `outbound-dynamic-code` | `branch globalAliases / a declaration` | 01-19 | ✓ |
| no speculative retrieval of any kind | `const k = "req" + "uests"; sdk[k].send(req)` | `outbound-unanalysable` | `registry row assembledNames` | 01-18 | ✓ |
| | `let m = "send"; m = "get"; sdk.requests[m](req)` | `outbound-unanalysable` | `branch literalOf / two or more answer undefined` | 01-24 | ✓ |
| | `import(spec)` | `outbound-unanalysable` | `registry row literalOf` | 01-12 | ✓ |
| | `globalThis["fet" + "ch"](url)` | `outbound-unanalysable` | `previously MISSED — globalThis["fet"+"ch"] now reports` | 01-16 | ✓ |

**ONE ROW PER SHAPE THIS ROUND CLOSED:**

| Shape | Probe | Reports | Plan |
|---|---|---|---|
| CR-13, the conditional key | `const k = b ? "requests" : "net"; sdk[k].send(req)` | `outbound-send` | 01-30 |
| CR-12, the logical assignment | `let r; r ??= sdk.requests; r.send(req)` | `outbound-send` | 01-31 |
| CR-11, the initializer and wrapper spellings | `const g = globalThis ?? self; g.fetch(url)` | `outbound-fetch` | 01-32 |
| WR-37, the nested destructure | `const { requests: { send } } = sdk; send(req)` | `outbound-send` | 01-32 |

**ALL SIX ROWS THE VERIFIER FOUND BLOCKED, RE-PROBED BY NAME WITH ITS OWN SHAPES — every one now discharges on the shape the verifier used:**

```
row 2  conditional key      const k = b ? "requests" : "net"; sdk[k].send(req)   ["outbound-send"]
row 2  logical assignment   let r; r ??= sdk.requests; r.send(req)               ["outbound-send"]
row 3  conditional key      sdk[b ? "requests" : "net"].connect(h)               ["outbound-send"]
row 3  nested destructure   const { requests: { send } } = sdk; send(req)        ["outbound-send"]
row 4  operator, call pos   (ok && globalThis).fetch(url)                        ["outbound-fetch"]
row 4  operator, init pos   const g = globalThis ?? self; g.fetch(url)           ["outbound-fetch"]
row 4  logical assignment   let g; g ??= globalThis; g.fetch(url)                ["outbound-fetch"]
row 5  operator ctor        new (ok && WebSocket)()                              ["outbound-global-ctor"]
row 6  operator receiver    (ok && navigator).sendBeacon(u, d)                   ["outbound-beacon"]
row 6  logical assignment   let n; n ??= navigator; n.sendBeacon(u, d)           ["outbound-beacon"]
row 7  operator around eval (ok && eval)(src)                                    ["outbound-dynamic-code"]
row 7  initializer alias    const e = eval ?? x; e(src)                          ["outbound-dynamic-code"]
```

## 13. THE BOX DECISION — `[ ]`, WITH FIVE BLOCKING ROWS NAMED

**All 35 discharge probes report. The box still does not move.**

WR-37's five siblings are each a **ONE-HOP binding of `sdk.requests`** that stays silent, while a one-hop binding of `sdk.requests` REPORTS through six other binding spellings — a declaration, an assignment, a logical assignment, an object destructure, a nested destructure and an operator initializer. They are therefore spellings of `sdk.requests.send` on which the gate **cannot go red**, and they block enumerated clauses 2 (`no sdk.requests.send in any spelling`) and 3 (`no method of an identified requests or net receiver`).

The phase's own recorded prohibition decides it: *a `verification: gate` requirement MUST NOT be marked complete while its gate stays green on a shape the prohibition's own statement enumerates.* That exact arithmetic held this box open at plan 01-18 over `const e = eval; e(s)` and again at wave 28 over `(ok && globalThis).fetch(url)`; both holds were later judged correct.

`CORE11_BOX_EXPECTED` is therefore unchanged at `"- [ ] **CORE-11**"` — set in task 3 at the current state and NOT moved in task 4. The pin and the ledger row agree, and the suite asserts it.

**THE THREE-WAY DIFFERENCE, OWED TO A READER ARRIVING AFTER TWO REVERTS EVEN WHEN THE ANSWER IS AGAIN `[ ]`:**

| | What it rested on |
|---|---|
| First `[x]`, reverted `e7cc4b6` | A gate that could not go red on an enumerated shape, and nobody had executed the shape. |
| Second `[x]`, reverted `faca607` | An AUTHORED eight-row residual, three of whose sentences the next verifier falsified by execution — text that had been copied verbatim into the ledger. |
| Wave 28's hold | A generated span byte-compared BEFORE the box was read, and a discharge table naming ONE blocking row — which the verifier then executed and found SIX of eight rows blocked, finding two itself. |
| **This examination** | All of wave 28's discipline, PLUS three mechanisms that did not exist then: every clause bound to its branches by wave 29's coverage guard (a clause naming a branch with no probe is a failing test); every declared universal owing a MEASURED bound; and `FALSIFIED_HANDOFFS` — now empty — making each of this round's three widenings provable at BRANCH granularity. AND, new here, **something can finally see the box**: `CORE11_BOX_EXPECTED`, mutation-proved by flipping it. |

**THE LIMITS, RESTATED.** When this box is eventually `[x]` it will mean the must-NOT holds, the enforcement covers every surface the sentence enumerates with a fixture watched failing, and the residual is disclosed in a form that cannot silently drift and whose named branches carry probes. It will **NOT** mean no shape is missed: the registry is not proven complete, the coverage guard reaches two enumerated populations and names its exemptions, wave 29's vocabulary reaches only the phrasings it declares, and each row's probes are examples. **And one flipped box would not mean a clean ledger:** STORE-03's and STORE-07's text-versus-usage collisions remain deferred with an owner — the operator, at the next requirements pass, by the STORE-01 → STORE-08 route.

## 14. SIX MUTATION PROOFS — EACH EXECUTED SEPARATELY, NEVER COMBINED

Order: 1 (after `c1fe55c`), 2 and 3 (after `b30bb26`), 4 and 5 (after `179df3f`), 6 (after `e9ed35a`). `git diff --exit-code` over `packages/` and `.planning/REQUIREMENTS.md` returned **0** after every restore, and the suite was re-run GREEN between each.

| # | Mutation | Tests that went RED | Assertion message it carried | Restore | Re-run |
|---|---|---|---|---|---|
| 1 | The shared descent removed (`operatorOperandMatching` body) | **10** — `registry row operatorOperandMatching`; the branch cases `initializerReceiver / the shared operator descent`, `isFetchExpression / an operator around the bare global`, `bareFetchCallee / an operator around the bare global`, `operatorOperandMatching / which operand …`, `operatorOperandMatching / a nested operator`; `every branch anchor still EXISTS`; and the three `through operatorOperandMatching` fixtures | ``registry row `initializerReceiver`'s clause names "the shared operator descent" and says the branch at `auditSource > collect > if (isGlobalReceiver(init)) globalThisAliases.add(node.name.text);` reports [outbound-fetch]. It does not. … The row's own probe can stay green through this: that is precisely why this case exists.: expected [] to deeply equal [ 'outbound-fetch' ]`` | `git diff --exit-code` clean | 396 passed |
| 2 | **ONE** resolver's use removed — `isFetchExpression`'s, alone | **3** — `branch isFetchExpression / an operator around the bare global`, `every branch anchor still EXISTS`, and the initializer fixture. The OTHER FIVE resolvers' branch cases stayed **GREEN** (`bareFetchCallee / an operator around the bare global` ✓, `operatorOperandMatching / …` ✓ ×2, `initializerReceiver / the shared operator descent` ✓) — which is what makes the proof per-RESOLVER rather than per-descent | ``registry row `isFetchExpression`'s clause names "an operator around the bare global" and says the branch at `auditSource > isFetchExpression > if (operatorOperandMatching(inner, isFetchExpression) !== undefined) {` reports [outbound-fetch]. It does not. …: expected [] to deeply equal [ 'outbound-fetch' ]`` | `git diff --exit-code` clean | 407 passed |
| 3 | The nested binding-pattern recursion removed | **3** — `registry row reportReceiverMembers`, `branch reportReceiverMembers / a nested pattern of an identified receiver`, `every branch anchor still EXISTS` | ``registry row `reportReceiverMembers` says its probe reports [outbound-send]. It does not. The row was read off `auditSource > const reportReceiverMembers = (` …: expected [] to deeply equal [ 'outbound-send' ]`` — and, separately, ``no line in packages/backend/src/outbound-prohibition.spec.ts begins with `reportReceiverMembers(el.name, property);`. Either the branch moved … or the branch is GONE and the clause is now naming something the code does not have.`` | `git diff --exit-code` clean | 407 passed |
| 4 | The WR-35 exemplar moved to the OTHER branch's offset, assertions untouched | **1** — `THE NO-SEPARATOR BRANCH: … the residual that lives there is SWEPT, not pinned at one chosen offset (WR-22/WR-28/WR-29)` | `AssertionError: expected 'pppppppppp;j' to be ';jsessionid=' // Object.is equality` — the exemplar is bound to the mechanism it now names | `git diff --exit-code` clean | 185 passed |
| 5 | One spread counterexample's guard removed (its measured answer no longer asserted) | **1** — `RESIDUAL, STILL OPEN AFTER IN-25 AND AFTER WR-36's SCOPING …` | ``` `{ ...e }` is on the OPEN residual list and was measured silent on 2026-08-24.: expected [] to deeply equal [ 'unredacted-object-value' ]``` | `git diff --exit-code` clean | 89 passed |
| 6 | `CORE11_BOX_EXPECTED` flipped to `[x]`, ledger untouched | **1** — ``CORE-11's entry is present and well-formed, and ITS BOX IS THE STATE `CORE11_BOX_EXPECTED` PINS`` | The full message in §9, including both revert hashes `e7cc4b6` and `faca607` and the same-commit rule | `git diff --exit-code` clean | 407 passed |

## 15. THE REAL TREE, THE LEDGERS, AND THE GATE SET

**Real-tree run after EACH widening (task 1 and task 2), with the four measured-exempt sites confirmed quiet individually:**

```
files scanned: 23
violations:    0
--- measured-exempt sites, each confirmed quiet individually ---
compat.ts cur[key]             packages/backend/src/compat.ts               -> []
compat.ts ctx[root]            packages/backend/src/compat.ts               -> []
observations.ts segments[i]    packages/backend/src/store/observations.ts   -> []
MIGRATIONS index               packages/backend/src/store/migrations.ts     -> []
```

**APPEND-NEVER-REWRITE, VERIFIED POSITIVELY:**

```
$ git diff -- .planning/REQUIREMENTS.md | grep "^-"
--- a/.planning/REQUIREMENTS.md          (the diff header — no content deletions)

$ for a in "CORRECTION 2026-08-22, plan 01-16" "…01-18" "…01-19" "…01-23" "…01-28"; do grep -c "$a"; done
1 1 1 1 1

$ grep -o "POINTER AMENDMENT 2026-08-24 ([^)]*)" .planning/STATE.md | sort | uniq -c
   1 POINTER AMENDMENT 2026-08-24 (gap-closure round 4, plan 01-18 task 3)
   1 POINTER AMENDMENT 2026-08-24 (gap-closure round 4, plan 01-19 task 3)
   1 POINTER AMENDMENT 2026-08-24 (gap-closure round 5, plan 01-23 task 3)
   1 POINTER AMENDMENT 2026-08-24 (gap-closure round 5, plan 01-27 task 3)
   1 POINTER AMENDMENT 2026-08-24 (gap-closure round 5, plan 01-28 task 2)
   1 POINTER AMENDMENT 2026-08-24 (gap-closure round 6, plan 01-29 task 3)
   1 POINTER AMENDMENT 2026-08-24 (gap-closure round 6, plan 01-30 task 3)
   1 POINTER AMENDMENT 2026-08-24 (gap-closure round 6, plan 01-31 task 3)
   1 POINTER AMENDMENT 2026-08-24 (gap-closure round 6, plan 01-32 task 4)

prior text preserved BYTE-IDENTICAL as a prefix: True
appended chars: 3443
```

The ninth amendment states no bound and restates that the pointer-not-a-bound rule is **a prohibition with no mechanical check**. Neither sentinel marker's text is quoted in the new `REQUIREMENTS.md` prose — confirmed by the suite staying green.

**`WINDOWS.md`, THROUGH THE TOOL, RAW OUTPUT:**

```
$ node gsd-tools.cjs windows fixed 36
  … "id": 36, "status": "fixed", "resolved_at": "2026-08-24T20:47:28.548Z"

$ node gsd-tools.cjs windows append --kind deviation --phase 01 \
    --file packages/backend/src/outbound-prohibition.spec.ts --description "POINTER, NOT A BOUND (plan 01-32 …)"
  … "id": 37, "status": "open", "recorded_at": "2026-08-24T20:47:51.285Z"

$ node gsd-tools.cjs windows status   (parsed)
gate-file entries: 15
  id=13..36  status=fixed
  id=37      status=open
OPEN on this gate file: 1
```

`.planning/WINDOWS.md` was **not hand-edited**: its diff is 18 insertions / 5 deletions, and every deletion is a tool-owned header field (`fixed_count`, `total_count`, `last_updated`) or the rewritten status of entry 36.

**THE GATE SET:**

```
pnpm test          31 files, 1345 tests, 0 failures   (baseline entering: 31 / 1326)
pnpm typecheck     exit 0
pnpm lint          exit 0
pnpm knip          exit 0
pnpm build:backend ESM packages/backend/dist/index.js 61.74 KB — Build success
pnpm check:bundle  packages/backend/dist/index.js: 1 import specifier(s): crypto
grep -cE '^- \[[ x]\] \*\*CORE-11\*\*' .planning/REQUIREMENTS.md   ->  1
git diff --exit-code 01-01..01-31-PLAN.md 01-VERIFICATION.md 01-REVIEW.md 01-UAT.md   ->  0
```

## Files Created/Modified

- `packages/backend/src/outbound-prohibition.spec.ts` — the shared descent, the sixth resolver, the nested-destructure reporter, five sibling silence rows plus IN-30's two, four corrected clauses, the box pin, two rewritten exemption reasons, both IN-27 docblocks, both regenerated spans
- `packages/backend/src/store/observations.ts` — the head-side docblock naming BOTH instability mechanisms, re-derived from its own WR-22 enumeration
- `packages/backend/src/store/observations.spec.ts` — both mechanisms at the disclosure site, the exemplar renamed `emptyValueCut`, a real `nameCut` pinned beside it with the discriminator asserted
- `packages/backend/src/store/schema.spec.ts` — the `observations.url` entry naming all three shapes; the hard-coded band size replaced by what the assertions enforce
- `packages/backend/src/store/error-redaction.spec.ts` — the IN-25 correction scoped to a named property value, three spread counterexamples pinned in the same case and on the residual list
- `.planning/REQUIREMENTS.md` — the regenerated 51-row span and a dated CORE-11 correction above the BEGIN sentinel; box unchanged at `[ ]`
- `.planning/STATE.md` — the ninth P9-D3 pointer amendment
- `.planning/WINDOWS.md` — entry 36 closed, entry 37 appended, both through the tool

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A SIXTH inline copy of "is this the global fetch", in the bare-call rule**

- **Found during:** Task 1, by measurement after the shared descent was wired into the five resolvers the plan named
- **Issue:** `(ok && fetch)(url)` — the probe `isFetchExpression`'s own `FALSIFIED_HANDOFFS` entry carried — was STILL `[]`. The bare-call rule in the visit pass never consulted `isFetchExpression`: it asked `ts.isIdentifier(callee) && fetchAliases.has(callee.text)` inline. Without this, task 2's acceptance criterion (`FALSIFIED_HANDOFFS` drained to zero) was unreachable.
- **Fix:** `bareFetchCallee` declared at `auditSource`'s own indentation, consulting `fetchAliases` and reaching the SAME shared descent, with the call rule routed through it. Kept deliberately NARROWER than `isFetchExpression` — that function also answers for `globalThis.fetch`, which the member rule already reports from the node the walk visits in its own right, so routing this rule through it would report `globalThis.fetch(url)` TWICE. Registered with a row and two branch probes so the coverage guard sees it.
- **Files modified:** `packages/backend/src/outbound-prohibition.spec.ts`
- **Verification:** `(ok && fetch)(url)` → `["outbound-fetch"]`; `globalThis.fetch(url)` still reports exactly once; mutation proof 2 turns its branch case red by name
- **Committed in:** `c1fe55c`

**2. [Rule 3 - Blocker] The plan named FIVE call sites; the honest count is SIX**

- **Found during:** Task 1, as a consequence of deviation 1
- **Issue:** The plan's acceptance criterion says "All five call sites reach the same definition … the SUMMARY names the five sites."
- **Fix:** Six sites reach one definition, and all six are named in §2. Six reaching one definition satisfies the criterion's intent strictly more than five would; the discrepancy is recorded rather than smoothed.
- **Committed in:** `c1fe55c`

**3. [Rule 2 - Missing critical] The guard case naming the removed row would have gone silently weaker**

- **Found during:** Task 1
- **Issue:** `the quantifier scan catches ALL THREE universals this round falsified` named `silence-operator-around-global-receiver` by id. Removing that row would have made the case fail; dropping the id from the list would have made the guard one row weaker with nothing recording why.
- **Fix:** The case now asserts the row's ABSENCE explicitly, with the reason and with instructions for both possible futures (a regression in the descent vs. a genuinely new silence), and adds `isFetchExpression` — the round's fourth universal — in the removed row's place.
- **Committed in:** `c1fe55c`

**4. [Rule 1 - Bug] A `*/` inside a docblock terminated the comment early**

- **Found during:** Task 3, at the first run after writing `CORE11_BOX_EXPECTED`'s docblock
- **Issue:** The docblock quoted the old regex `\*\*CORE-11\*\*/`, whose trailing `*/` closed the block comment; esbuild failed the whole file with `Expected ";" but found "x"`.
- **Fix:** The regex is described in prose (`the CHARACTER CLASS [<space>x]`) rather than quoted.
- **Committed in:** `179df3f`

**5. [Deliberate, plan-mandated] `requirements-completed` omits CORE-11 and `requirements mark-complete` was NOT run for it**

- **Found during:** Task 4, at the state-update step
- **Issue:** The plan declares `requirements: [CORE-11, STORE-03, STORE-07]`, and the SUMMARY template says to copy that array verbatim. `requirements.ready-ids` reported all three ready. Marking CORE-11 complete flips its checkbox — which this plan's own discharge decided must stay `[ ]`, and which `CORE11_BOX_EXPECTED` would immediately catch (that is the pin doing exactly the job WR-34 was raised for).
- **Fix:** `requirements-completed: [STORE-03, STORE-07]`. Both were already `[x]`, so marking them is a no-op on disk. CORE-11 is left out and `mark-complete` was not invoked for it — the same act wave 28 recorded for the same reason. Verified after: `grep -c '^- \[ \] \*\*CORE-11\*\*'` returns `1`, and the suite stays at 407 passed.
- **Files modified:** none
- **Committed in:** the metadata commit

---

**Total deviations:** 4 auto-fixed (2 × Rule 1, 1 × Rule 2, 1 × Rule 3) plus 1 deliberate, plan-mandated omission.
**Impact on plan:** All four were necessary to reach the plan's own acceptance criteria. Deviation 1 is the largest and is itself a finding of the same class the plan exists to close — one idea written N times and therefore existing N−1 times — found by measuring rather than by reading. No scope creep: no package was installed, no plan file, review or verification document was touched, and `tests/pins.spec.ts` and `scripts/phase1/tracer-e2e.sh` are untouched.

## Issues Encountered

None beyond the deviations above. Two operational facts inherited from wave 31 held: this repo has no active git hooks, so the gate set was run by hand at every task boundary; and the handed git status was verified against `git rev-parse HEAD` (`e20b80b`) before the first read.

## Known Stubs

None. Every mechanism this plan added is wired, executed and mutation-proved.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change at a trust boundary. Every change is in test-only gate files, disclosure text or planning ledgers.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Nothing leaked and nothing leaks now.** Every finding this round closed is PROSPECTIVE blindness in a test-only gate, and WR-35 and WR-36 are warnings on DISCLOSURE TEXT rather than failures of a prohibition. The must-NOT holds: no outbound call exists in any non-spec source under either root (23 files, ZERO violations, re-measured after every widening), `pnpm check:bundle` reports one import specifier (`crypto`), and the redaction half survived 16,160 swept inputs with zero secret survivals.

**What a next wave inherits, stated as work rather than as a bound:**

1. **CORE-11's box is `[ ]` with five named blocking rows** — `silence-array-slot-receiver`, `silence-object-literal-property-receiver`, `silence-class-field-receiver`, `silence-parameter-default-receiver`, `silence-for-of-binding-receiver`. Each has an executed probe and counter-probe. Discharging them means widening five initializer shapes, re-measuring the real tree after each, and re-running the discharge table — then moving `CORE11_BOX_EXPECTED` and the ledger row **in the same commit**.
2. **`FALSIFIED_HANDOFFS` is empty and its pin is zero.** That is the designed end state, not an absence; a later wave that corrects a clause opens a new entry and changes the pin with it.
3. **STORE-03 and STORE-07's text-versus-usage collisions remain deferred with an owner** — the operator, at the next requirements pass, by the STORE-01 → STORE-08 route. Untouched by this wave.
4. **Residual (b6)** (`o.r ??= sdk.requests`, disclosed by wave 31) and the long-standing residual (a)/(b) bounds are unchanged.

Phase 01 has no further plans. The green baseline is restored and recorded: 31 files / 1345 tests, typecheck / lint / knip clean, bundle at one specifier.

---
*Phase: 01-skeleton-persistence-compatibility*
*Completed: 2026-08-24*

## Self-Check: PASSED

All eight modified files exist on disk. All five commits (`c1fe55c`, `b30bb26`, `179df3f`, `e9ed35a`, `078e445`) exist in `git log --oneline --all`. Every `must_haves.artifacts` `contains:` string was verified present: `CORE11_BOX_EXPECTED`, `EMPTY` (×3), `NAMED PROPERTY`, `BEGIN DERIVED RESIDUAL`, `deriveResidual` (×2). Suite green at 31 files / 1345 tests; typecheck, lint, knip exit 0; bundle at one specifier (`crypto`).
